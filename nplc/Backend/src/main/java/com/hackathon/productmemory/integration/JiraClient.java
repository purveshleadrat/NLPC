package com.hackathon.productmemory.integration;

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
