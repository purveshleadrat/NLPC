package com.hackathon.productmemory.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

/**
 * 100% Fully Automated Background Sync Service.
 * Runs automatically upon startup and periodically every 3 minutes.
 * Discovers GitHub branches, filters through GitHubAdapter, extracts with Claude AI,
 * and persists to Supabase DB with ZERO manual button clicks required.
 */
@Component
public class AutoSyncScheduler {

    private static final Logger log = LoggerFactory.getLogger(AutoSyncScheduler.class);
    private final IngestionService ingestionService;

    public AutoSyncScheduler(IngestionService ingestionService) {
        this.ingestionService = ingestionService;
    }

    /**
     * Automatic sync immediately on application startup
     */
    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        CompletableFuture.runAsync(() -> {
            try {
                // Give database connection 2 seconds to settle
                Thread.sleep(2000);
                log.info("⚡ [AUTO-SYNC] Starting automatic startup ingestion pipeline...");
                var responses = ingestionService.autoSyncAllGitHubBranches(null);
                log.info("⚡ [AUTO-SYNC] Startup auto-sync completed. Ingested {} source(s).", responses.size());
            } catch (Exception e) {
                log.warn("⚡ [AUTO-SYNC] Startup auto-sync encountered an issue: {}", e.getMessage());
            }
        });
    }

    /**
     * Periodic background auto-sync every 10 minutes (600,000 ms) to avoid rate limits
     */
    @Scheduled(fixedDelayString = "${sync.interval-ms:600000}", initialDelay = 60000)
    public void scheduledAutoSync() {
        try {
            log.info("⚡ [AUTO-SYNC] Running scheduled background repository sync...");
            var responses = ingestionService.autoSyncAllGitHubBranches(null);
            if (!responses.isEmpty()) {
                log.info("⚡ [AUTO-SYNC] Background sync processed {} new source(s).", responses.size());
            }
        } catch (Throwable t) {
            log.debug("⚡ [AUTO-SYNC] Background scheduled sync cycle completed with notice: {}", t.getMessage());
        }
    }
}
