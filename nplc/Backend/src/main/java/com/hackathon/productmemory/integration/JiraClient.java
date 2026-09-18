package com.hackathon.productmemory.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.hackathon.productmemory.entity.IntegrationConnection;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;

import java.util.Optional;

/** Jira Cloud REST v3 calls, made with one tenant connection's credentials. */
@Component
public class JiraClient {

    private final ConnectionClients clients;

    public JiraClient(ConnectionClients clients) {
        this.clients = clients;
    }

    public Object listProjects(IntegrationConnection connection) {
        return clients.forConnection(connection).get()
                .uri("/rest/api/3/project/search")
                .retrieve()
                .body(Object.class);
    }

    public Object search(IntegrationConnection connection, String jql, String fields) {
        return clients.forConnection(connection).get()
                .uri(builder -> builder
                        .path("/rest/api/3/search/jql")
                        .queryParam("jql", jql)
                        .queryParam("fields", fields)
                        .build())
                .retrieve()
                .body(Object.class);
    }

    /**
     * Exact-key lookup. Jira resolves issues by their exact key, so "CJ-01" can never come
     * back as "CJ-011".
     */
    /**
     * Resolves a Jira Cloud site's canonical {@code *.atlassian.net} base URL from any host
     * that fronts it (e.g. an org's custom domain), by reading the public serverInfo.
     *
     * <p>A custom domain like {@code jira.atlassian.example.com} serves the browser UI, but
     * REST calls made against it authenticate yet resolve to no data. serverInfo reports the
     * real address in its {@code baseUrl} field, which is the host the API must be called on.
     *
     * <p>Unauthenticated (serverInfo is public) and best-effort: any failure returns empty,
     * so the caller keeps the URL as entered.
     */
    public Optional<String> resolveCanonicalBaseUrl(String baseUrl) {
        try {
            JsonNode info = clients.anonymous(baseUrl).get()
                    .uri("/rest/api/3/serverInfo")
                    .retrieve()
                    .body(JsonNode.class);
            String canonical = info == null ? null : info.path("baseUrl").asText(null);
            return canonical == null || canonical.isBlank() ? Optional.empty() : Optional.of(canonical);
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<Object> findIssue(IntegrationConnection connection, String key) {
        try {
            return Optional.ofNullable(clients.forConnection(connection).get()
                    .uri("/rest/api/3/issue/{key}", key)
                    .retrieve()
                    .body(Object.class));
        } catch (HttpClientErrorException.NotFound e) {
            return Optional.empty();
        }
    }
}
