package com.hackathon.productmemory.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hackathon.productmemory.dto.ExtractionDtos.ExtractResult;
import com.hackathon.productmemory.dto.NormalizedSource;
import com.hackathon.productmemory.dto.SyncDtos.ImportResult;
import com.hackathon.productmemory.dto.SyncDtos.SyncResult;
import com.hackathon.productmemory.entity.IntegrationConnection;
import com.hackathon.productmemory.entity.InitiativeConnection;
import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.integration.GitHubClient;
import com.hackathon.productmemory.integration.JiraClient;
import com.hackathon.productmemory.repository.SourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Turns a tenant's live Jira and GitHub data into Sources, then extracts them.
 *
 * <p>This is the read-only connector side: it pulls issues and commits and normalizes each
 * into the one {@link NormalizedSource} shape, never writing anything back to Jira or
 * GitHub. Import is idempotent - a source already ingested (matched by externalRef) is
 * skipped - so syncing repeatedly only ever adds what is new.
 *
 * <p>Everything is bounded (issues per project, commits per branch, patch size) so one sync
 * cannot fetch an unbounded amount of data or blow up the extraction prompt.
 */
@Service
public class SyncService {

    private static final int MAX_SUBTASKS = 25;
    private static final int MAX_COMMITS_PER_BRANCH = 8;
    private static final int MAX_FILES_PER_COMMIT = 20;
    private static final int MAX_PATCH_CHARS_PER_FILE = 1500;
    private static final int MAX_RAWTEXT_CHARS = 12000;

    private final InitiativeService initiativeService;
    private final IntegrationConnectionService connectionService;
    private final ExtractionService extractionService;
    private final JiraClient jiraClient;
    private final GitHubClient gitHubClient;
    private final SourceRepository sourceRepository;
    private final ObjectMapper mapper = new ObjectMapper();

    public SyncService(InitiativeService initiativeService,
                       IntegrationConnectionService connectionService,
                       ExtractionService extractionService,
                       JiraClient jiraClient,
                       GitHubClient gitHubClient,
                       SourceRepository sourceRepository) {
        this.initiativeService = initiativeService;
        this.connectionService = connectionService;
        this.extractionService = extractionService;
        this.jiraClient = jiraClient;
        this.gitHubClient = gitHubClient;
        this.sourceRepository = sourceRepository;
    }

    // --- Full sync --------------------------------------------------------------

    /**
     * Refreshes what is already attached, rather than discovering new items.
     *
     * <p>Sync re-fetches each ticket and commit the initiative already holds and updates it in
     * place to its latest state (status, comments, description). It deliberately does NOT run a
     * project-wide JQL search or a branch scan: those pulled in every ticket in the project,
     * which is not what "sync the things I selected" should mean. New items are added
     * explicitly through the Add-source flow, not by Sync.
     */
    @Transactional
    public SyncResult sync(String initiativeId) {
        initiativeService.requireInitiative(initiativeId);

        List<IntegrationConnection> jiraConns = candidateConnections(initiativeId, IntegrationConnection.PROVIDER_JIRA);
        List<IntegrationConnection> gitConns = candidateConnections(initiativeId, IntegrationConnection.PROVIDER_GITHUB);

        int jira = 0, github = 0;
        List<String> warnings = new ArrayList<>();
        for (Source s : sourceRepository.findByInitiativeId(initiativeId)) {
            String ref = s.getExternalRef();
            if (ref == null || ref.isBlank()) continue; // manual notes have nothing to refresh
            try {
                if ("ticket".equals(s.getType())) {
                    if (refreshJiraSource(s, jiraConns)) jira++;
                } else if ("commit".equals(s.getType())) {
                    if (refreshCommitSource(s, gitConns)) github++;
                }
            } catch (Exception e) {
                warnings.add(ref + ": " + rootMessage(e));
            }
        }

        // Re-extract anything still pending (e.g. items attached without extraction yet).
        ExtractResult extraction = extractionService.extractInitiative(initiativeId);
        return new SyncResult(jira + github, jira, github, warnings, extraction);
    }

    /** The connections to try for a provider: those bound to the initiative, else all of that provider. */
    private List<IntegrationConnection> candidateConnections(String initiativeId, String provider) {
        List<IntegrationConnection> bound = new ArrayList<>();
        for (InitiativeConnection b : initiativeService.connectionsFor(initiativeId)) {
            IntegrationConnection c = connectionService.require(b.getConnectionId());
            if (provider.equals(c.getProvider())) bound.add(c);
        }
        return bound.isEmpty() ? connectionService.byProvider(provider) : bound;
    }

    /** Re-fetches an attached ticket by key across candidate connections and updates it in place. */
    private boolean refreshJiraSource(Source s, List<IntegrationConnection> conns) {
        for (IntegrationConnection conn : conns) {
            Optional<Object> found = jiraClient.findIssue(conn, s.getExternalRef());
            if (found.isPresent()) {
                return applyRefresh(s, normalizeJiraIssue(mapper.valueToTree(found.get())));
            }
        }
        return false;
    }

    /** Re-fetches an attached commit by sha. Commits are immutable, so this is mostly a no-op. */
    private boolean refreshCommitSource(Source s, List<IntegrationConnection> conns) {
        for (IntegrationConnection conn : conns) {
            try {
                JsonNode commit = gitHubClient.getCommit(conn, s.getExternalRef());
                if (commit != null && !commit.path("sha").asText("").isBlank()) {
                    return applyRefresh(s, normalizeCommit(commit));
                }
            } catch (Exception ignore) {
                // try the next candidate connection
            }
        }
        return false;
    }

    /** Copies refreshed content onto an existing source; returns true if anything changed. */
    private boolean applyRefresh(Source s, NormalizedSource ns) {
        boolean changed = false;
        if (ns.getTitle() != null && !ns.getTitle().isBlank() && !ns.getTitle().equals(s.getTitle())) {
            s.setTitle(ns.getTitle()); changed = true;
        }
        if (ns.getRawText() != null && !ns.getRawText().equals(s.getRawText())) {
            s.setRawText(ns.getRawText()); changed = true;
        }
        if (ns.getDocDate() != null && !ns.getDocDate().isBlank() && !ns.getDocDate().equals(s.getDocDate())) {
            s.setDocDate(ns.getDocDate()); changed = true;
        }
        if (!java.util.Objects.equals(ns.getAuthor(), s.getAuthor())) {
            s.setAuthor(ns.getAuthor()); changed = true;
        }
        if (!java.util.Objects.equals(ns.getParentRef(), s.getParentRef())) {
            s.setParentRef(ns.getParentRef()); changed = true;
        }
        if (changed) sourceRepository.save(s);
        return changed;
    }

    // --- Single-item imports (for the pick-and-import UI) ------------------------

    @Transactional
    public ImportResult importJiraTicket(String initiativeId, String connectionId, String key) {
        initiativeService.requireInitiative(initiativeId);
        IntegrationConnection connection = connectionService.require(connectionId);
        JsonNode issue = mapper.valueToTree(
                jiraClient.findIssue(connection, key)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "no ticket " + key)));

        // The parent ticket first, then each of its subtasks as their own child sources.
        Source created = createIfNew(initiativeId, normalizeJiraIssue(issue));
        int subtasks = importSubtasks(initiativeId, connection, issue);

        if (created == null && subtasks == 0) {
            return new ImportResult(null, false, key + " was already imported", null);
        }
        ExtractResult extraction = extractionService.extractInitiative(initiativeId);
        String message = "Imported " + key
                + (subtasks > 0 ? " + " + subtasks + " subtask(s)" : "");
        return new ImportResult(created == null ? null : created.getId(), true, message, extraction);
    }

    /**
     * Pulls a parent issue's subtasks in as their own sources, each fetched fully (subtasks
     * embedded in the parent are only stubs) and linked back via parentRef. Bounded by
     * {@link #MAX_SUBTASKS}, deduped by key, and never fetches one already imported.
     */
    private int importSubtasks(String initiativeId, IntegrationConnection connection, JsonNode parentIssue) {
        JsonNode subtasks = parentIssue.path("fields").path("subtasks");
        if (!subtasks.isArray() || subtasks.isEmpty()) return 0;

        int added = 0, seen = 0;
        for (JsonNode sub : subtasks) {
            if (seen++ >= MAX_SUBTASKS) break;
            String subKey = sub.path("key").asText("");
            if (subKey.isBlank()) continue;
            // Skip the extra fetch if we already hold this subtask.
            if (!sourceRepository.findByInitiativeIdAndExternalRef(initiativeId, subKey).isEmpty()) continue;

            Optional<Object> full = jiraClient.findIssue(connection, subKey);
            if (full.isEmpty()) continue;
            if (createIfNew(initiativeId, normalizeJiraIssue(mapper.valueToTree(full.get()))) != null) added++;
        }
        return added;
    }

    @Transactional
    public ImportResult importGitHubCommit(String initiativeId, String connectionId, String sha) {
        initiativeService.requireInitiative(initiativeId);
        IntegrationConnection connection = connectionService.require(connectionId);
        JsonNode commit = gitHubClient.getCommit(connection, sha);

        Source created = createIfNew(initiativeId, normalizeCommit(commit));
        return finishImport(initiativeId, created, sha);
    }

    @Transactional
    public ImportResult importGitHubBranch(String initiativeId, String connectionId, String branch) {
        initiativeService.requireInitiative(initiativeId);
        IntegrationConnection connection = connectionService.require(connectionId);
        int added = importCommitsOnBranch(initiativeId, connection, branch);
        ExtractResult extraction = extractionService.extractInitiative(initiativeId);
        return new ImportResult(null, added > 0,
                "Imported " + added + " new commit(s) from " + branch, extraction);
    }

    private ImportResult finishImport(String initiativeId, Source created, String ref) {
        if (created == null) {
            return new ImportResult(null, false, ref + " was already imported", null);
        }
        ExtractResult extraction = extractionService.extractInitiative(initiativeId);
        return new ImportResult(created.getId(), true, "Imported " + ref, extraction);
    }

    // --- Jira normalisation -----------------------------------------------------

    private NormalizedSource normalizeJiraIssue(JsonNode issue) {
        String key = issue.path("key").asText("");
        JsonNode f = issue.path("fields");
        String summary = f.path("summary").asText("");
        String status = f.path("status").path("name").asText("");
        String type = f.path("issuetype").path("name").asText("");
        String priority = f.path("priority").path("name").asText("");
        String reporter = f.path("reporter").path("displayName").asText(
                f.path("assignee").path("displayName").asText(null));
        String updated = f.path("updated").asText(f.path("created").asText(""));
        String parentKey = f.path("parent").path("key").asText("");

        StringBuilder body = new StringBuilder();
        body.append("Jira ").append(key).append(" — ").append(summary).append('\n');
        if (!type.isBlank()) body.append("Type: ").append(type).append('\n');
        if (!status.isBlank()) body.append("Status: ").append(status).append('\n');
        if (!priority.isBlank()) body.append("Priority: ").append(priority).append('\n');
        String description = adfToText(f.path("description"));
        if (!description.isBlank()) body.append("\nDescription:\n").append(description).append('\n');

        JsonNode comments = f.path("comment").path("comments");
        if (comments.isArray() && !comments.isEmpty()) {
            body.append("\nComments:\n");
            for (JsonNode c : comments) {
                String author = c.path("author").path("displayName").asText("");
                body.append("- ").append(author).append(": ").append(adfToText(c.path("body"))).append('\n');
            }
        }

        NormalizedSource ns = new NormalizedSource();
        ns.setType("ticket");
        ns.setTitle(key.isBlank() ? summary : key + " · " + summary);
        ns.setRawText(cap(body.toString()));
        ns.setDocDate(datePart(updated));
        ns.setAuthor(reporter);
        ns.setExternalRef(key.isBlank() ? null : key);
        ns.setParentRef(parentKey.isBlank() ? null : parentKey);
        return ns;
    }

    // --- GitHub import ----------------------------------------------------------

    private int importCommitsOnBranch(String initiativeId, IntegrationConnection connection, String branch) {
        JsonNode commits = gitHubClient.listCommits(connection, branch, MAX_COMMITS_PER_BRANCH);
        int added = 0;
        for (JsonNode listed : commits) {
            String sha = listed.path("sha").asText("");
            if (sha.isBlank()) continue;
            // Skip early if we already have this commit, to avoid the extra per-commit call.
            if (!sourceRepository.findByInitiativeIdAndExternalRef(initiativeId, shortSha(sha)).isEmpty()) {
                continue;
            }
            JsonNode full = gitHubClient.getCommit(connection, sha);
            if (createIfNew(initiativeId, normalizeCommit(full)) != null) added++;
        }
        return added;
    }

    private NormalizedSource normalizeCommit(JsonNode commit) {
        String sha = commit.path("sha").asText("");
        JsonNode c = commit.path("commit");
        String message = c.path("message").asText("");
        String firstLine = message.lines().findFirst().orElse(message);
        String authorName = c.path("author").path("name").asText(
                commit.path("author").path("login").asText(""));
        String date = c.path("author").path("date").asText("");

        StringBuilder body = new StringBuilder();
        body.append("Git commit ").append(shortSha(sha)).append('\n');
        body.append("Message: ").append(message).append('\n');

        JsonNode files = commit.path("files");
        if (files.isArray() && !files.isEmpty()) {
            body.append("\nFiles changed:\n");
            int fileCount = 0;
            for (JsonNode file : files) {
                if (fileCount++ >= MAX_FILES_PER_COMMIT) {
                    body.append("… (more files omitted)\n");
                    break;
                }
                String filename = file.path("filename").asText("");
                String fstatus = file.path("status").asText("");
                int adds = file.path("additions").asInt(0);
                int dels = file.path("deletions").asInt(0);
                body.append("• ").append(filename).append(" (").append(fstatus)
                        .append(", +").append(adds).append("/-").append(dels).append(")\n");
                String patch = file.path("patch").asText("");
                if (!patch.isBlank()) {
                    body.append(truncate(patch, MAX_PATCH_CHARS_PER_FILE)).append('\n');
                }
            }
        }

        NormalizedSource ns = new NormalizedSource();
        ns.setType("commit");
        ns.setTitle("commit " + shortSha(sha) + ": " + truncate(firstLine, 80));
        ns.setRawText(cap(body.toString()));
        ns.setDocDate(datePart(date));
        ns.setAuthor(authorName);
        ns.setExternalRef(shortSha(sha));
        return ns;
    }

    // --- persistence + helpers --------------------------------------------------

    /** Creates a Source unless its externalRef is already ingested for this initiative. */
    private Source createIfNew(String initiativeId, NormalizedSource ns) {
        if (ns.getExternalRef() != null && !ns.getExternalRef().isBlank()
                && !sourceRepository.findByInitiativeIdAndExternalRef(initiativeId, ns.getExternalRef()).isEmpty()) {
            return null;
        }
        Source s = new Source();
        s.setId(UUID.randomUUID().toString());
        s.setInitiativeId(initiativeId);
        s.setType(ns.getType());
        s.setTitle(ns.getTitle() == null || ns.getTitle().isBlank() ? "(untitled)" : ns.getTitle());
        s.setRawText(ns.getRawText() == null ? "" : ns.getRawText());
        s.setDocDate(ns.getDocDate() == null || ns.getDocDate().isBlank()
                ? Instant.now().toString().substring(0, 10) : ns.getDocDate());
        s.setAuthor(ns.getAuthor());
        s.setExternalRef(ns.getExternalRef());
        s.setParentRef(ns.getParentRef());
        s.setCreatedAt(Instant.now());
        return sourceRepository.save(s);
    }

    /** Best-effort plain text out of Atlassian Document Format (or a plain string). */
    private static String adfToText(JsonNode node) {
        if (node == null || node.isMissingNode() || node.isNull()) return "";
        if (node.isTextual()) return node.asText();
        StringBuilder sb = new StringBuilder();
        collectText(node, sb);
        return sb.toString().trim();
    }

    private static void collectText(JsonNode node, StringBuilder sb) {
        if (node == null) return;
        if (node.isTextual()) {
            sb.append(node.asText());
            return;
        }
        if (node.has("text") && node.get("text").isTextual()) {
            sb.append(node.get("text").asText());
        }
        String type = node.path("type").asText("");
        JsonNode content = node.path("content");
        if (content.isArray()) {
            for (JsonNode child : content) {
                collectText(child, sb);
            }
            // Paragraphs and list items read better with a break after them.
            if (type.equals("paragraph") || type.equals("listItem") || type.equals("heading")) {
                sb.append('\n');
            }
        }
    }

    private static String datePart(String iso) {
        if (iso == null || iso.length() < 10) return iso == null ? "" : iso;
        return iso.substring(0, 10);
    }

    private static String shortSha(String sha) {
        return sha.length() > 8 ? sha.substring(0, 8) : sha;
    }

    private static String truncate(String s, int max) {
        if (s == null) return "";
        return s.length() <= max ? s : s.substring(0, max) + "…";
    }

    private static String cap(String s) {
        return truncate(s, MAX_RAWTEXT_CHARS);
    }

    private static String rootMessage(Throwable e) {
        Throwable c = e;
        while (c.getCause() != null && c.getCause() != c) c = c.getCause();
        return c.getClass().getSimpleName() + ": " + c.getMessage();
    }
}
