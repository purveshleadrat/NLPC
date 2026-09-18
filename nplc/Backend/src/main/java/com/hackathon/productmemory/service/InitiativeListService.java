package com.hackathon.productmemory.service;

import com.hackathon.productmemory.dto.InitiativeListDtos.InitiativeListItem;
import com.hackathon.productmemory.dto.InitiativeListDtos.InitiativeListPage;
import com.hackathon.productmemory.tenant.TenantContext;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Query;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * Backs the Initiatives list page with one aggregate query instead of the 1 + 3N
 * per-initiative calls the frontend used to make (connections, sources and events fetched
 * separately for every card). At hackathon scale that difference is invisible; the whole
 * point of this endpoint is that it stays a handful of queries whether the tenant has three
 * initiatives or three hundred, which per-initiative fan-out never would.
 *
 * <p>Native SQL, not JPQL: the counts and the scope label are aggregates across sources,
 * events and connections that have no JPA entity of their own to query through, and ordering
 * by an aggregate ("most tickets") isn't something Hibernate's query derivation reaches.
 *
 * <p>Hibernate's {@code @TenantId} filter only rewrites JPQL/Criteria queries - a native
 * query bypasses it entirely, so {@code tenant_id = :tenantId} below is this query's ONLY
 * tenant boundary. Getting that wrong here means one tenant's initiative list leaking
 * another tenant's rows, not a 404.
 */
@Service
public class InitiativeListService {

    private static final Set<String> VALID_SORTS = Set.of("updated_desc", "name_asc", "most_tickets");
    private static final Set<String> VALID_FILTERS = Set.of("open", "changed");
    private static final int CHANGED_WINDOW_DAYS = 14;
    private static final int MAX_PAGE_SIZE = 100;

    @PersistenceContext
    private EntityManager entityManager;

    private static final String BASE_FROM = """
            FROM initiatives i
            LEFT JOIN (
                SELECT initiative_id, COUNT(*) AS cnt FROM sources WHERE type = 'ticket' GROUP BY initiative_id
            ) tc ON tc.initiative_id = i.id
            LEFT JOIN (
                SELECT initiative_id, COUNT(*) AS cnt FROM sources WHERE type = 'commit' GROUP BY initiative_id
            ) cc ON cc.initiative_id = i.id
            LEFT JOIN (
                SELECT initiative_id, COUNT(*) AS cnt FROM events
                WHERE event_type = 'OPEN_QUESTION' AND status = 'UNRESOLVED' GROUP BY initiative_id
            ) oc ON oc.initiative_id = i.id
            LEFT JOIN (
                SELECT initiative_id, MAX(created_at) AS max_date FROM sources GROUP BY initiative_id
            ) ls ON ls.initiative_id = i.id
            LEFT JOIN (
                SELECT initiative_id, MAX(created_at) AS max_date FROM events GROUP BY initiative_id
            ) le ON le.initiative_id = i.id
            LEFT JOIN (
                SELECT ic.initiative_id,
                       string_agg(
                           CASE WHEN c.provider = 'JIRA'
                                THEN COALESCE(NULLIF(ic.scope_key, ''), c.label)
                                ELSE c.account_id || '/' || c.repo
                           END, ' · ') AS label
                FROM initiative_connections ic
                JOIN integration_connections c ON c.id = ic.connection_id
                GROUP BY ic.initiative_id
            ) sc ON sc.initiative_id = i.id
            WHERE i.tenant_id = :tenantId
            """;

    public InitiativeListPage list(int page, int size, String sort, String search, String filter, List<String> ids) {
        String safeSort = VALID_SORTS.contains(sort) ? sort : "updated_desc";
        if (filter != null && !filter.isBlank() && !VALID_FILTERS.contains(filter)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "filter must be one of " + VALID_FILTERS);
        }
        boolean byIds = ids != null && !ids.isEmpty();

        StringBuilder where = new StringBuilder();
        boolean hasSearch = !byIds && search != null && !search.isBlank();
        if (byIds) {
            where.append(" AND i.id IN (:ids)");
        } else if (hasSearch) {
            where.append(" AND i.name ILIKE :search");
        }
        if (!byIds && "open".equals(filter)) {
            where.append(" AND COALESCE(oc.cnt, 0) > 0");
        } else if (!byIds && "changed".equals(filter)) {
            where.append(" AND GREATEST(i.created_at, COALESCE(ls.max_date, i.created_at), COALESCE(le.max_date, i.created_at)) >= :since");
        }

        String orderBy = switch (safeSort) {
            case "name_asc" -> "i.name ASC";
            case "most_tickets" -> "COALESCE(tc.cnt, 0) DESC";
            default -> "last_updated DESC";
        };

        // The Pinned tab asks for a specific, user-picked (client-side, localStorage) set of
        // ids rather than a page - those ids can span several pages of the default sort, so
        // paginating around them would just drop pinned initiatives that aren't on page 1.
        // The set is small by construction (someone pinned them by hand), so returning all of
        // it unpaginated is both correct and cheap.
        int safeSize = byIds ? Math.max(1, ids.size()) : Math.max(1, Math.min(size, MAX_PAGE_SIZE));
        int safePage = byIds ? 0 : Math.max(0, page);

        String dataSql = """
                SELECT i.id, i.name, i.description, i.priority, i.created_at,
                       sc.label AS scope_label,
                       COALESCE(tc.cnt, 0) AS ticket_count,
                       COALESCE(cc.cnt, 0) AS commit_count,
                       COALESCE(oc.cnt, 0) AS open_count,
                       GREATEST(i.created_at, COALESCE(ls.max_date, i.created_at), COALESCE(le.max_date, i.created_at)) AS last_updated
                """ + BASE_FROM + where + "\nORDER BY " + orderBy
                + (byIds ? "" : "\nLIMIT :size OFFSET :offset");

        Query dataQuery = entityManager.createNativeQuery(dataSql);
        bindCommonParams(dataQuery, hasSearch, byIds ? null : filter, search, ids);
        if (!byIds) {
            dataQuery.setParameter("size", safeSize);
            dataQuery.setParameter("offset", safePage * safeSize);
        }

        @SuppressWarnings("unchecked")
        List<Object[]> rows = dataQuery.getResultList();

        long totalElements;
        if (byIds) {
            totalElements = rows.size();
        } else {
            String countSql = "SELECT COUNT(*)\n" + BASE_FROM + where;
            Query countQuery = entityManager.createNativeQuery(countSql);
            bindCommonParams(countQuery, hasSearch, filter, search, null);
            totalElements = ((Number) countQuery.getSingleResult()).longValue();
        }

        List<InitiativeListItem> items = new ArrayList<>(rows.size());
        for (Object[] r : rows) {
            items.add(new InitiativeListItem(
                    (String) r[0],
                    (String) r[1],
                    (String) r[2],
                    (String) r[3],
                    toInstant(r[4]),
                    (String) r[5],
                    ((Number) r[6]).longValue(),
                    ((Number) r[7]).longValue(),
                    ((Number) r[8]).longValue(),
                    toInstant(r[9])));
        }

        int totalPages = byIds ? 1 : (int) Math.ceil((double) totalElements / safeSize);
        return new InitiativeListPage(items, totalElements, totalPages, safePage, safeSize);
    }

    private void bindCommonParams(Query query, boolean hasSearch, String filter, String search, List<String> ids) {
        query.setParameter("tenantId", TenantContext.require());
        if (ids != null && !ids.isEmpty()) {
            query.setParameter("ids", ids);
        }
        if (hasSearch) {
            query.setParameter("search", "%" + search.trim() + "%");
        }
        if ("changed".equals(filter)) {
            query.setParameter("since", Timestamp.from(Instant.now().minus(CHANGED_WINDOW_DAYS, ChronoUnit.DAYS)));
        }
    }

    // Hibernate 6's native-query result mapping for timestamptz varies by driver/version -
    // this project's setup returns java.time.Instant directly, but java.sql.Timestamp is
    // handled too rather than assuming one and breaking on the next Hibernate bump.
    private static Instant toInstant(Object value) {
        if (value == null) return null;
        if (value instanceof Instant instant) return instant;
        if (value instanceof Timestamp timestamp) return timestamp.toInstant();
        throw new IllegalStateException("unexpected timestamp type: " + value.getClass());
    }
}
