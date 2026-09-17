package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.dto.SyncDtos.ImportResult;
import com.hackathon.productmemory.dto.SyncDtos.SyncResult;
import com.hackathon.productmemory.service.SyncService;
import org.springframework.web.bind.annotation.*;

/**
 * Read-only ingestion from an initiative's Jira and GitHub connections.
 *
 * <p>{@code /sync} pulls everything bound to the initiative at once; the {@code /import/*}
 * endpoints back the "pick a ticket / branch and import it" UI. All are tenant-scoped
 * through the initiative check inside the service.
 */
@RestController
@RequestMapping("/initiatives/{id}")
public class SyncController {

    private final SyncService syncService;

    public SyncController(SyncService syncService) {
        this.syncService = syncService;
    }

    // POST /initiatives/{id}/sync — pull latest Jira + GitHub for this initiative, then extract
    @PostMapping("/sync")
    public SyncResult sync(@PathVariable String id) {
        return syncService.sync(id);
    }

    // POST /initiatives/{id}/import/jira?connectionId=...&key=CJ-12
    @PostMapping("/import/jira")
    public ImportResult importJira(@PathVariable String id,
                                   @RequestParam String connectionId,
                                   @RequestParam String key) {
        return syncService.importJiraTicket(id, connectionId, key);
    }

    // POST /initiatives/{id}/import/github/commit?connectionId=...&sha=...
    @PostMapping("/import/github/commit")
    public ImportResult importCommit(@PathVariable String id,
                                     @RequestParam String connectionId,
                                     @RequestParam String sha) {
        return syncService.importGitHubCommit(id, connectionId, sha);
    }

    // POST /initiatives/{id}/import/github/branch?connectionId=...&branch=...
    @PostMapping("/import/github/branch")
    public ImportResult importBranch(@PathVariable String id,
                                     @RequestParam String connectionId,
                                     @RequestParam String branch) {
        return syncService.importGitHubBranch(id, connectionId, branch);
    }
}
