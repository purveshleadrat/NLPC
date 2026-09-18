package com.hackathon.productmemory.service;

import com.hackathon.productmemory.entity.Constraint;
import com.hackathon.productmemory.entity.Contradiction;
import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.repository.ConstraintRepository;
import com.hackathon.productmemory.repository.ContradictionRepository;
import com.hackathon.productmemory.repository.EventRepository;
import com.hackathon.productmemory.repository.SourceRepository;
import com.hackathon.productmemory.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class SourceService {

    private final SourceRepository sourceRepository;
    private final EventRepository eventRepository;
    private final ConstraintRepository constraintRepository;
    private final ContradictionRepository contradictionRepository;
    private final InitiativeService initiativeService;

    public SourceService(SourceRepository sourceRepository,
                         EventRepository eventRepository,
                         ConstraintRepository constraintRepository,
                         ContradictionRepository contradictionRepository,
                         InitiativeService initiativeService) {
        this.sourceRepository = sourceRepository;
        this.eventRepository = eventRepository;
        this.constraintRepository = constraintRepository;
        this.contradictionRepository = contradictionRepository;
        this.initiativeService = initiativeService;
    }

    public Source create(String initiativeId, Source source) {
        source.setInitiativeId(initiativeService.requireInitiative(initiativeId));
        if (source.getId() == null || source.getId().isBlank()) {
            source.setId(UUID.randomUUID().toString());
        }
        source.setCreatedAt(Instant.now());
        return sourceRepository.save(source);
    }

    public List<Source> findByInitiative(String initiativeId) {
        return sourceRepository.findByInitiativeId(
                initiativeService.requireInitiative(initiativeId));
    }

    public List<Source> findByInitiativeAndType(String initiativeId, String type) {
        return sourceRepository.findByInitiativeIdAndType(
                initiativeService.requireInitiative(initiativeId), type);
    }

    /**
     * Removes one source and everything the extractor derived from it, then repairs the
     * links the removal would otherwise leave dangling. This is a real deletion (the
     * append-only rule guards the timeline against silent rewrites, not against an operator
     * removing a source they imported by mistake), so it is explicit about the fallout:
     *
     * <ul>
     *   <li>events extracted from this source are deleted (with their affected_items);</li>
     *   <li>a decision one of those events had <b>superseded</b> is restored to CURRENT;</li>
     *   <li>a surviving event that pointed at a deleted one via supersedesEventId is un-linked;</li>
     *   <li>constraints created by a deleted event are removed; a constraint <b>lifted</b> by one
     *       becomes ACTIVE again;</li>
     *   <li>contradictions naming a deleted event on either side are removed.</li>
     * </ul>
     */
    @Transactional
    public void delete(String sourceId) {
        Source source = sourceRepository.findById(sourceId)
                .orElseThrow(() -> notFound(sourceId));
        // @TenantId is not applied to a lookup by primary key, so check ownership explicitly -
        // the same guard the connection and initiative services use. 404, not 403, so the
        // response never confirms that a foreign id exists.
        if (!TenantContext.getTenantId().equals(source.getTenantId())) {
            throw notFound(sourceId);
        }

        String initiativeId = source.getInitiativeId();
        List<Event> derived = eventRepository.findByInitiativeIdAndSourceId(initiativeId, sourceId);

        if (!derived.isEmpty()) {
            Set<String> deletedIds = derived.stream().map(Event::getId).collect(Collectors.toSet());
            List<Event> all = eventRepository.findByInitiativeId(initiativeId);

            // Restore decisions the deleted events had superseded.
            for (Event e : derived) {
                String supId = e.getSupersedesEventId();
                if (supId == null || deletedIds.contains(supId)) continue;
                all.stream()
                        .filter(x -> x.getId().equals(supId) && "SUPERSEDED".equals(x.getStatus()))
                        .findFirst()
                        .ifPresent(x -> { x.setStatus("CURRENT"); eventRepository.save(x); });
            }
            // Un-link surviving events that pointed at a now-deleted event.
            for (Event y : all) {
                if (!deletedIds.contains(y.getId())
                        && y.getSupersedesEventId() != null
                        && deletedIds.contains(y.getSupersedesEventId())) {
                    y.setSupersedesEventId(null);
                    eventRepository.save(y);
                }
            }
            // Constraints: drop those a deleted event created; reactivate those it lifted.
            for (Constraint c : constraintRepository.findByInitiativeId(initiativeId)) {
                if (deletedIds.contains(c.getSourceEventId())) {
                    constraintRepository.delete(c);
                } else if (c.getLiftedByEventId() != null && deletedIds.contains(c.getLiftedByEventId())) {
                    c.setLiftedByEventId(null);
                    c.setStatus("ACTIVE");
                    constraintRepository.save(c);
                }
            }
            // Contradictions: drop any that reference a deleted event on either side.
            for (Contradiction ct : contradictionRepository.findByInitiativeId(initiativeId)) {
                if (deletedIds.contains(ct.getEventIdA()) || deletedIds.contains(ct.getEventIdB())) {
                    contradictionRepository.delete(ct);
                }
            }
            // Entity delete (not a bulk query) so Hibernate also clears each event's
            // affected_items element collection.
            eventRepository.deleteAll(derived);
        }

        sourceRepository.delete(source);
    }

    private static ResponseStatusException notFound(String sourceId) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "no source " + sourceId);
    }
}
