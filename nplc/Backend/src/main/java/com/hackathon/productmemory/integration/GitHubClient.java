package com.hackathon.productmemory.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.hackathon.productmemory.entity.IntegrationConnection;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;

import java.util.Optional;

/** GitHub REST calls, made with one tenant connection's token. */
@Component
public class GitHubClient {

    /**
     * Branch naming conventions tried in order when the branch is not named exactly after
     * the ticket. Kept from the single-tenant implementation.
     */
    public static final String[] BRANCH_PREFIXES = {"", "feature/", "bugfix/", "fix/"};

    private final ConnectionClients clients;

    public GitHubClient(ConnectionClients clients) {
        this.clients = clients;
    }

    public Object listBranches(IntegrationConnection connection) {
        return clients.forConnection(connection).get()
                .uri("/repos/{owner}/{repo}/branches?per_page=100",
                        connection.getAccountId(), connection.getRepo())
                .retrieve()
                .body(Object.class);
    }

    /** Exact-name lookup, so "CJ-01" can never resolve to "CJ-011". */
    public Optional<Object> findBranch(IntegrationConnection connection, String name) {
        try {
            return Optional.ofNullable(clients.forConnection(connection).get()
                    .uri("/repos/{owner}/{repo}/branches/{name}",
                            connection.getAccountId(), connection.getRepo(), name)
                    .retrieve()
                    .body(Object.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }

    /**
     * Commits on a branch, newest first. Metadata only (sha, message, author, date) - the
     * per-commit file diffs come from {@link #getCommit}, which is a separate call each.
     */
    public JsonNode listCommits(IntegrationConnection connection, String branch, int perPage) {
        return clients.forConnection(connection).get()
                .uri("/repos/{owner}/{repo}/commits?sha={branch}&per_page={perPage}",
                        connection.getAccountId(), connection.getRepo(), branch, perPage)
                .retrieve()
                .body(JsonNode.class);
    }

    /**
     * One commit with its file list and patches (diffs). GitHub returns the unified diff of
     * each changed file under {@code files[].patch}.
     */
    public JsonNode getCommit(IntegrationConnection connection, String sha) {
        return clients.forConnection(connection).get()
                .uri("/repos/{owner}/{repo}/commits/{sha}",
                        connection.getAccountId(), connection.getRepo(), sha)
                .retrieve()
                .body(JsonNode.class);
    }

    /** Tries the ticket key itself first, then each known branch prefix. */
    public Optional<MatchedBranch> findBranchByConvention(IntegrationConnection connection, String ticketKey) {
        for (String prefix : BRANCH_PREFIXES) {
            String candidate = prefix + ticketKey;
            Optional<Object> branch = findBranch(connection, candidate);
            if (branch.isPresent()) {
                return Optional.of(new MatchedBranch(candidate, branch.get()));
            }
        }
        return Optional.empty();
    }

    public record MatchedBranch(String name, Object payload) {
    }
}
