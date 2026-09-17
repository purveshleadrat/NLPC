package com.hackathon.productmemory.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

// Thin passthrough to the GitHub REST API, using a personal access token (PAT).
// Point github.owner/github.repo (see application.properties) at your PERSONAL sandbox repo,
// never a company repo.
@RestController
@RequestMapping("/github")
public class GitHubController {

    private final RestClient restClient;
    private final String owner;
    private final String repo;

    public GitHubController(
            @Value("${github.api-url}") String apiUrl,
            @Value("${github.token}") String token,
            @Value("${github.owner}") String owner,
            @Value("${github.repo}") String repo
    ) {
        this.restClient = RestClient.builder()
                .baseUrl(apiUrl)
                .defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                .defaultHeader("X-GitHub-Api-Version", "2022-11-28")
                .build();
        this.owner = owner;
        this.repo = repo;
    }

    // GET /github/branches
    // -> https://api.github.com/repos/{owner}/{repo}/branches
    @GetMapping("/branches")
    public Object listBranches() {
        return restClient.get()
                .uri("/repos/{owner}/{repo}/branches?per_page=100", owner, repo)
                .retrieve()
                .body(Object.class);
    }

    // GET /github/branches/{name} - exact-name lookup only. GitHub's per-branch endpoint looks
    // branches up by their exact name, so a request for "CJ-01" can never return "CJ-011".
    // -> https://api.github.com/repos/{owner}/{repo}/branches/{name}
    @GetMapping("/branches/{name}")
    public ResponseEntity<Object> getBranch(@PathVariable String name) {
        try {
            Object body = restClient.get()
                    .uri("/repos/{owner}/{repo}/branches/{name}", owner, repo, name)
                    .retrieve()
                    .body(Object.class);
            return ResponseEntity.ok(body);
        } catch (HttpClientErrorException.NotFound e) {
            return ResponseEntity.notFound().build();
        }
    }
}
