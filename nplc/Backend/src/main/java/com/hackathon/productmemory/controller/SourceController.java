package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.dto.NormalizedSource;
import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.service.IngestionService;
import com.hackathon.productmemory.service.SourceService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sources")
public class SourceController {

    private final SourceService sourceService;
    private final IngestionService ingestionService;

    public SourceController(SourceService sourceService, IngestionService ingestionService) {
        this.sourceService = sourceService;
        this.ingestionService = ingestionService;
    }

    // POST /sources?initiativeId=...
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Source create(@RequestParam(required = false) String initiativeId, @RequestBody Source source) {
        return sourceService.create(initiativeId != null ? initiativeId : "", source);
    }

    // POST /sources/ingest?initiativeId=...
    // Ingests any NormalizedSource, extracts decisions/constraints via Claude AI, and stores all in DB
    @PostMapping("/ingest")
    @ResponseStatus(HttpStatus.CREATED)
    public IngestionService.IngestionResponse ingest(
            @RequestParam(required = false) String initiativeId,
            @RequestBody NormalizedSource normalizedSource
    ) {
        return ingestionService.ingestNormalizedSource(initiativeId, normalizedSource);
    }

    // POST /sources/ingest/github?branchName=feature/CJ-01[&initiativeId=...]
    // Uses GitHubAdapter to filter bloated GitHub JSON, sends filtered context to Claude AI, and stores in DB
    @PostMapping("/ingest/github")
    @ResponseStatus(HttpStatus.CREATED)
    public IngestionService.IngestionResponse ingestGitHub(
            @RequestParam(required = false) String initiativeId,
            @RequestParam String branchName
    ) {
        return ingestionService.ingestGitHubBranch(initiativeId, branchName);
    }

    // POST /sources/sync/all[&initiativeId=...]
    // Automatically scans all GitHub branches, filters through adapter, extracts via Claude, and stores in DB
    @PostMapping("/sync/all")
    public List<IngestionService.IngestionResponse> autoSyncAll(
            @RequestParam(required = false) String initiativeId
    ) {
        return ingestionService.autoSyncAllGitHubBranches(initiativeId);
    }

    // GET /sources?initiativeId=...&type=meeting_note
    @GetMapping
    public List<Source> list(@RequestParam(required = false) String initiativeId,
                             @RequestParam(required = false) String type) {
        if (initiativeId == null || initiativeId.isBlank()) {
            return type == null ? sourceService.findByInitiative("") : sourceService.findByInitiativeAndType("", type);
        }
        return type == null
                ? sourceService.findByInitiative(initiativeId)
                : sourceService.findByInitiativeAndType(initiativeId, type);
    }
}
