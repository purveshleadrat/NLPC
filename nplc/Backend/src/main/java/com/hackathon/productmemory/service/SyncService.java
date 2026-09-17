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

    private static final int MAX_TICKETS = 25;
    private static final int MAX_BRANCHES = 10;
    private static final int MAX_COMMITS_PER_BRANCH = 8;
    private static final int MAX_FILES_PER_COMMIT = 20;
    private static final int MAX_PATCH_CHARS_PER_FILE = 1500;
    private static final int MAX_RAWTEXT_CHARS = 12000;
    private static final String JIRA_FIELDS =
            "summary,description,status,updated,created,reporter,assignee,issuetype,priority,comment";

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

    @Transactional
    public SyncResult sync(String initiativeId) {
        initiativeService.requireInitiative(initiativeId);

        List<InitiativeConnection> bindings = initiativeService.connectionsFor(initiativeId);
        List<Scope> scopes = new ArrayList<>();
        if (bindings.isEmpty()) {
            // No explicit bindings: fall back to every connection the tenant owns, whole scope.
            for (IntegrationConnection c : connectionService.byProvider(IntegrationConnection.PROVIDER_JIRA)) {
                scopes.add(new Scope(c, ""));
            }
            for (IntegrationConnection c : connectionService.byProvider(IntegrationConnection.PROVIDER_GITHUB)) {
                scopes.add(new Scope(c, ""));
            }
        } else {
            for (InitiativeConnection b : bindings) {
                scopes.add(new Scope(connectionService.require(b.getConnectionId()), b.getScopeKey()));
            }
        }

        int jira = 0, github = 0, synced = 0;
        List<String> warnings = new ArrayList<>();
        for (Scope s : scopes) {
            try {
                if (s.connection.isJira()) {
                    jira += importJira(initiativeId, s.connection, s.scopeKey);
                } else if (s.connection.isGithub()) {
                    github += importGithub(initiativeId, s.connection, s.scopeKey);
                }
                synced++;
            } catch (Exception e) {
                warnings.add(s.connection.getLabel() + ": " + rootMessage(e));
            }
        }

        // Extract everything newly imported (and anything still pending) in one pass.
        ExtractResult extraction = extractionService.extractInitiative(initiativeId);
        return new SyncResult(synced, jira, github, warnings, extraction);
    }

    // --- Single-item imports (for the pick-and-import UI) ------------------------

    @Transactional
    public ImportResult importJiraTicket(String initiativeId, String connectionId, String key) {
        initiativeService.requireInitiative(initiativeId);
        IntegrationConnection connection = connectionService.require(connectionId);
        JsonNode issue = mapper.valueToTree(
                jiraClient.findIssue(connection, key)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "no ticket " + key)));

        Source created = createIfNew(initiativeId, normalizeJiraIssue(issue));
        return finishImport(initiativeId, created, key);
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

    // --- Jira import ------------------------------------------------------------

    private int importJira(String initiativeId, IntegrationConnection connection, String scopeKey) {
        String jql = scopeKey == null || scopeKey.isBlank()
                ? "ORDER BY updated DESC"
                : "project = \"" + scopeKey + "\" ORDER BY updated DESC";
        JsonNode result = mapper.valueToTree(jiraClient.search(connection, jql, JIRA_FIELDS));

        JsonNode issues = result.path("issues");
        int added = 0, seen = 0;
        for (JsonNode issue : issues) {
            if (seen++ >= MAX_TICKETS) break;
            if (createIfNew(initiativeId, normalizeJiraIssue(issue)) != null) added++;
        }
        return added;
    }

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
        return ns;
    }

    // --- GitHub import ----------------------------------------------------------

    private int importGithub(String initiativeId, IntegrationConnection connection, String scopeKey) {
        JsonNode branches = mapper.valueToTree(gitHubClient.listBranches(connection));
        int added = 0, seen = 0;
        for (JsonNode b : branches) {
            String name = b.path("name").asText("");
            if (name.isBlank()) continue;
            // scopeKey (when set) is a branch prefix/substring narrowing the repo.
            if (scopeKey != null && !scopeKey.isBlank()
                    && !name.toLowerCase().contains(scopeKey.toLowerCase())) {
                continue;
            }
            if (seen++ >= MAX_BRANCHES) break;
            added += importCommitsOnBranch(initiativeId, connection, name);
        }
        return added;
    }

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

    private record Scope(IntegrationConnection connection, String scopeKey) {
    }
}
