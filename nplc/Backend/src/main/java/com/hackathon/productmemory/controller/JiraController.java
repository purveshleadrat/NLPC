package com.hackathon.productmemory.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.util.Base64;

// Thin passthrough to the Jira Cloud REST API v3, using Basic Auth (email + API token) -
// same auth style you tested in Postman. Point jira.site-url/jira.email/jira.api-token
// (see application.properties) at your PERSONAL Jira sandbox, never a company site.
@RestController
@RequestMapping("/jira")
public class JiraController {

    private final RestClient restClient;
    private final String basicAuthHeader;

    public JiraController(
            @Value("${jira.site-url}") String siteUrl,
            @Value("${jira.email}") String email,
            @Value("${jira.api-token}") String apiToken
    ) {
        this.restClient = RestClient.builder().baseUrl(siteUrl).build();
        String creds = email + ":" + apiToken;
        this.basicAuthHeader = "Basic " + Base64.getEncoder().encodeToString(creds.getBytes());
    }

    // GET /jira/projects
    // -> https://{site}/rest/api/3/project/search
    @GetMapping("/projects")
    public Object listProjects() {
        return restClient.get()
                .uri("/rest/api/3/project/search")
                .header(HttpHeaders.AUTHORIZATION, basicAuthHeader)
                .retrieve()
                .body(Object.class);
    }

    // GET /jira/tickets?jql=project = "HAC" ORDER BY created DESC&fields=*all
    // -> https://{site}/rest/api/3/search/jql?jql=...&fields=...
    @GetMapping("/tickets")
    public Object searchTickets(
            @RequestParam String jql,
            @RequestParam(defaultValue = "*all") String fields
    ) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/rest/api/3/search/jql")
                        .queryParam("jql", jql)
                        .queryParam("fields", fields)
                        .build())
                .header(HttpHeaders.AUTHORIZATION, basicAuthHeader)
                .retrieve()
                .body(Object.class);
    }

    // GET /jira/tickets/{key} - exact-key lookup only. Jira looks issues up by their exact key,
    // so a request for "CJ-01" can never return "CJ-011".
    // -> https://{site}/rest/api/3/issue/{key}
    @GetMapping("/tickets/{key}")
    public ResponseEntity<Object> getTicket(@PathVariable String key) {
        try {
            Object body = restClient.get()
                    .uri("/rest/api/3/issue/{key}", key)
                    .header(HttpHeaders.AUTHORIZATION, basicAuthHeader)
                    .retrieve()
                    .body(Object.class);
            return ResponseEntity.ok(body);
        } catch (HttpClientErrorException.NotFound e) {
            return ResponseEntity.notFound().build();
        }
    }
}
