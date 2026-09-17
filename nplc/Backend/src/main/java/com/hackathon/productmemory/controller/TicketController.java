package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.entity.TicketBranchLink;
import com.hackathon.productmemory.repository.TicketBranchLinkRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

// Combines a Jira ticket (by exact key) with its matching GitHub branch (same exact name),
// since ticket key and branch name are expected to be identical by convention. Every lookup
// is persisted to Supabase via TicketBranchLinkRepository so the pairing has history.
@RestController
@RequestMapping("/tickets")
public class TicketController {

    private final JiraController jiraController;
    private final GitHubController gitHubController;
    private final TicketBranchLinkRepository linkRepository;
    private final String repoFullName;

    public TicketController(
            JiraController jiraController,
            GitHubController gitHubController,
            TicketBranchLinkRepository linkRepository,
            @Value("${github.owner}") String owner,
            @Value("${github.repo}") String repo
    ) {
        this.jiraController = jiraController;
        this.gitHubController = gitHubController;
        this.linkRepository = linkRepository;
        this.repoFullName = owner + "/" + repo;
    }

    // GET /tickets/{key} - exact-key lookup across both systems, with fallback to feature/, bugfix/, fix/ prefixes
    @GetMapping("/{key}")
    public ResponseEntity<Map<String, Object>> lookup(@PathVariable String key) {
        ResponseEntity<Object> jiraResponse = jiraController.getTicket(key);

        String matchedBranchName = key;
        ResponseEntity<Object> branchResponse = gitHubController.getBranch(key);
        if (!branchResponse.getStatusCode().is2xxSuccessful()) {
            String[] prefixes = {"feature/", "bugfix/", "fix/"};
            for (String prefix : prefixes) {
                ResponseEntity<Object> candidate = gitHubController.getBranch(prefix + key);
                if (candidate.getStatusCode().is2xxSuccessful()) {
                    branchResponse = candidate;
                    matchedBranchName = prefix + key;
                    break;
                }
            }
        }

        boolean jiraFound = jiraResponse.getStatusCode().is2xxSuccessful();
        boolean branchFound = branchResponse.getStatusCode().is2xxSuccessful();

        String status = jiraFound && branchFound ? "LINKED"
                : jiraFound ? "MISSING_BRANCH"
                : branchFound ? "MISSING_TICKET"
                : "NOT_FOUND";

        TicketBranchLink link = linkRepository
                .findByRepoFullNameAndTicketKey(repoFullName, key)
                .orElseGet(TicketBranchLink::new);
        if (link.getId() == null) {
            link.setId(UUID.randomUUID().toString());
        }
        link.setTicketKey(key);
        link.setRepoFullName(repoFullName);
        link.setBranchName(branchFound ? matchedBranchName : key);
        link.setStatus(status);
        link.setLastCheckedAt(Instant.now());
        linkRepository.save(link);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("ticketKey", key);
        result.put("repo", repoFullName);
        result.put("branchName", matchedBranchName);
        result.put("status", status);
        result.put("jiraTicket", jiraFound ? jiraResponse.getBody() : null);
        result.put("githubBranch", branchFound ? branchResponse.getBody() : null);
        return ResponseEntity.ok(result);
    }
}
