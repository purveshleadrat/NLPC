package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.entity.IntegrationConnection;
import com.hackathon.productmemory.integration.ConnectionCall;
import com.hackathon.productmemory.integration.JiraClient;
import com.hackathon.productmemory.service.IntegrationConnectionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Jira Cloud passthrough, scoped to the calling tenant.
 *
 * <p>This used to hold one RestClient built at startup from this application's own
 * environment. A tenant now owns any number of Jira sites, so each call resolves the
 * tenant's connections and runs against them - optionally narrowed to one with
 * {@code connectionId}.
 *
 * <p>Responses are per connection, including failures: a site that rejected its
 * credential appears as an entry carrying an error, next to the ones that answered.
 */
@RestController
@RequestMapping("/jira")
public class JiraController {

    private final IntegrationConnectionService connectionService;
    private final JiraClient jiraClient;

    public JiraController(IntegrationConnectionService connectionService, JiraClient jiraClient) {
        this.connectionService = connectionService;
        this.jiraClient = jiraClient;
    }

    // GET /jira/projects[?connectionId=...]
    @GetMapping("/projects")
    public List<ConnectionCall<Object>> listProjects(
            @RequestParam(required = false) String connectionId) {
        return connectionService.fanOut(resolve(connectionId), jiraClient::listProjects);
    }

    // GET /jira/tickets?jql=...&fields=*all[&connectionId=...]
    @GetMapping("/tickets")
    public List<ConnectionCall<Object>> searchTickets(
            @RequestParam String jql,
            @RequestParam(defaultValue = "*all") String fields,
            @RequestParam(required = false) String connectionId) {
        return connectionService.fanOut(resolve(connectionId),
                connection -> jiraClient.search(connection, jql, fields));
    }

    // GET /jira/tickets/{key}[?connectionId=...] - exact-key lookup, so "CJ-01" never
    // resolves to "CJ-011". The same key can legitimately exist in two of a tenant's
    // sites, which is why this returns every match rather than one.
    @GetMapping("/tickets/{key}")
    public List<ConnectionCall<Object>> getTicket(@PathVariable String key,
                                                  @RequestParam(required = false) String connectionId) {
        return connectionService.fanOut(resolve(connectionId),
                connection -> jiraClient.findIssue(connection, key).orElse(null));
    }

    private List<IntegrationConnection> resolve(String connectionId) {
        return connectionId == null
                ? connectionService.byProvider(IntegrationConnection.PROVIDER_JIRA)
                : List.of(connectionService.require(connectionId));
    }
}
