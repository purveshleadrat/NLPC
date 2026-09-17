package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.entity.IntegrationConnection;
import com.hackathon.productmemory.integration.ConnectionCall;
import com.hackathon.productmemory.integration.GitHubClient;
import com.hackathon.productmemory.service.IntegrationConnectionService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * GitHub passthrough, scoped to the calling tenant.
 *
 * <p>A tenant owns any number of repos, each with its own token, so there is no single
 * owner/repo baked in at startup any more. Each call runs against the tenant's GitHub
 * connections, or one named by {@code connectionId}.
 */
@RestController
@RequestMapping("/github")
public class GitHubController {

    private final IntegrationConnectionService connectionService;
    private final GitHubClient gitHubClient;

    public GitHubController(IntegrationConnectionService connectionService, GitHubClient gitHubClient) {
        this.connectionService = connectionService;
        this.gitHubClient = gitHubClient;
    }

    // GET /github/branches[?connectionId=...]
    @GetMapping("/branches")
    public List<ConnectionCall<Object>> listBranches(
            @RequestParam(required = false) String connectionId) {
        return connectionService.fanOut(resolve(connectionId), gitHubClient::listBranches);
    }

    // GET /github/branches/{name}[?connectionId=...] - exact-name lookup, so "CJ-01" never
    // resolves to "CJ-011". Returns one entry per repo, since a branch of the same name can
    // exist in several of a tenant's repos.
    @GetMapping("/branches/{name}")
    public List<ConnectionCall<Object>> getBranch(@PathVariable String name,
                                                  @RequestParam(required = false) String connectionId) {
        return connectionService.fanOut(resolve(connectionId),
                connection -> gitHubClient.findBranch(connection, name).orElse(null));
    }

    private List<IntegrationConnection> resolve(String connectionId) {
        return connectionId == null
                ? connectionService.byProvider(IntegrationConnection.PROVIDER_GITHUB)
                : List.of(connectionService.require(connectionId));
    }
}
