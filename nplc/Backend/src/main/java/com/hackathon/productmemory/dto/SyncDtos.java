package com.hackathon.productmemory.dto;

import com.hackathon.productmemory.dto.ExtractionDtos.ExtractResult;

import java.util.List;

/** Results of importing from, or syncing, an initiative's Jira/GitHub connections. */
public final class SyncDtos {

    private SyncDtos() {
    }

    /** One ticket/commit imported as a source, plus what extracting it produced. */
    public record ImportResult(
            String sourceId,
            boolean created,      // false if this externalRef was already ingested (deduped)
            String message,
            ExtractResult extraction) {
    }

    /** A full sync: how many new sources came from each provider, and the extraction run. */
    public record SyncResult(
            int connectionsSynced,
            int jiraSourcesAdded,
            int githubSourcesAdded,
            List<String> warnings,
            ExtractResult extraction) {
    }
}
