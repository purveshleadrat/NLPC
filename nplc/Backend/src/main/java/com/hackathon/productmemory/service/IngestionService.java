package com.hackathon.productmemory.service;

import com.hackathon.productmemory.adapter.GitHubAdapter;
import com.hackathon.productmemory.dto.NormalizedSource;
import com.hackathon.productmemory.entity.*;
import com.hackathon.productmemory.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
public class IngestionService {

    private static final Logger log = LoggerFactory.getLogger(IngestionService.class);

    private final GitHubAdapter gitHubAdapter;
    private final GeminiService geminiService;
    private final SourceRepository sourceRepository;
    private final EventRepository eventRepository;
    private final ConstraintRepository constraintRepository;
    private final ContradictionRepository contradictionRepository;
    private final InitiativeRepository initiativeRepository;

    public IngestionService(
            GitHubAdapter gitHubAdapter,
            GeminiService geminiService,
            SourceRepository sourceRepository,
            EventRepository eventRepository,
            ConstraintRepository constraintRepository,
            ContradictionRepository contradictionRepository,
            InitiativeRepository initiativeRepository
    ) {
        this.gitHubAdapter = gitHubAdapter;
        this.geminiService = geminiService;
        this.sourceRepository = sourceRepository;
        this.eventRepository = eventRepository;
        this.constraintRepository = constraintRepository;
        this.contradictionRepository = contradictionRepository;
        this.initiativeRepository = initiativeRepository;
    }

    public static class IngestionResponse {
        private Source source;
        private String summary;
        private List<Event> extractedEvents = new ArrayList<>();
        private List<Constraint> extractedConstraints = new ArrayList<>();
        private List<Contradiction> extractedContradictions = new ArrayList<>();

        public Source getSource() { return source; }
        public void setSource(Source source) { this.source = source; }

        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }

        public List<Event> getExtractedEvents() { return extractedEvents; }
        public void setExtractedEvents(List<Event> extractedEvents) { this.extractedEvents = extractedEvents; }

        public List<Constraint> getExtractedConstraints() { return extractedConstraints; }
        public void setExtractedConstraints(List<Constraint> extractedConstraints) { this.extractedConstraints = extractedConstraints; }

        public List<Contradiction> getExtractedContradictions() { return extractedContradictions; }
        public void setExtractedContradictions(List<Contradiction> extractedContradictions) { this.extractedContradictions = extractedContradictions; }
    }

    /**
     * Ingests a GitHub branch by filtering data via GitHubAdapter, sending clean context
     * to Claude AI, persisting the source and extracted events/constraints to Supabase DB,
     * and returning the result for UI display.
     */
    @Transactional
    public IngestionResponse ingestGitHubBranch(String initiativeId, String branchName) {
        String effectiveInitId = resolveInitiativeId(initiativeId);

        // 1. Filter and normalize branch/commit JSON data using GitHubAdapter
        NormalizedSource normalized = gitHubAdapter.fetchAndNormalizeBranch(branchName);

        // 2. Process and persist via Claude pipeline
        return processAndPersist(effectiveInitId, normalized);
    }

    /**
     * Automatically discovers all branches in the connected GitHub repo,
     * filters them through GitHubAdapter, extracts context via Claude AI,
     * and saves all entities directly to the database.
     */
    @Transactional
    public List<IngestionResponse> autoSyncAllGitHubBranches(String initiativeId) {
        String effectiveInitId = resolveInitiativeId(initiativeId);
        List<String> branches = gitHubAdapter.listAllBranchNames();
        List<IngestionResponse> responses = new ArrayList<>();

        log.info("Auto-syncing {} branches from GitHub: {}", branches.size(), branches);

        for (String branch : branches) {
            try {
                NormalizedSource normalized = gitHubAdapter.fetchAndNormalizeBranch(branch);
                // Check if this branch is already ingested to prevent duplicate AI calls
                boolean exists = sourceRepository.findByInitiativeId(effectiveInitId).stream()
                        .anyMatch(s -> branch.equals(s.getExternalRef()) || (s.getTitle() != null && s.getTitle().contains(branch)));
                
                if (!exists) {
                    IngestionResponse response = processAndPersist(effectiveInitId, normalized);
                    responses.add(response);
                } else {
                    log.info("Branch {} already ingested, skipping duplicate AI processing.", branch);
                }
            } catch (Exception e) {
                log.error("Error auto-syncing branch {}: {}", branch, e.getMessage());
            }
        }
        return responses;
    }

    /**
     * Ingests any NormalizedSource (e.g. from manual input or Jira), runs Claude extraction,
     * persists all records to DB, and returns structured result.
     */
    @Transactional
    public IngestionResponse ingestNormalizedSource(String initiativeId, NormalizedSource normalized) {
        String effectiveInitId = resolveInitiativeId(initiativeId);
        return processAndPersist(effectiveInitId, normalized);
    }

    private IngestionResponse processAndPersist(String initiativeId, NormalizedSource normalized) {
        // 1. Save filtered Source to DB
        Source source = new Source();
        source.setId(UUID.randomUUID().toString());
        source.setInitiativeId(initiativeId);
        source.setType(normalized.getType() != null ? normalized.getType() : "commit");
        source.setTitle(normalized.getTitle() != null ? normalized.getTitle() : "Source Ingestion");
        source.setDocDate(normalized.getDocDate() != null ? normalized.getDocDate() : Instant.now().toString().substring(0, 10));
        source.setAuthor(normalized.getAuthor() != null ? normalized.getAuthor() : "Unknown");
        source.setExternalRef(normalized.getExternalRef());
        source.setRawText(normalized.getRawText());
        source.setCreatedAt(Instant.now());

        Source savedSource = sourceRepository.save(source);
        log.info("Saved filtered Source ID: {} ({})", savedSource.getId(), savedSource.getTitle());

        // 2. Send clean filtered context to Gemini for extraction
        GeminiService.ExtractionResult extraction = geminiService.extractFromText(
                normalized.getRawText(),
                normalized.getAuthor(),
                normalized.getDocDate()
        );

        IngestionResponse response = new IngestionResponse();
        response.setSource(savedSource);
        response.setSummary(extraction.getSummary());

        String primaryEventId = null;

        // 3. Persist extracted Events to DB
        if (extraction.getEvents() != null && !extraction.getEvents().isEmpty()) {
            for (Event ev : extraction.getEvents()) {
                if (ev.getId() == null || ev.getId().isBlank()) {
                    ev.setId(UUID.randomUUID().toString());
                }
                ev.setInitiativeId(initiativeId);
                ev.setSourceId(savedSource.getId());
                ev.setCreatedAt(Instant.now());
                if (ev.getEventDate() == null || ev.getEventDate().isBlank()) {
                    ev.setEventDate(savedSource.getDocDate());
                }
                Event savedEvent = eventRepository.save(ev);
                response.getExtractedEvents().add(savedEvent);
                if (primaryEventId == null) {
                    primaryEventId = savedEvent.getId();
                }
            }
        }

        // 4. Persist extracted Constraints to DB
        if (extraction.getConstraints() != null && !extraction.getConstraints().isEmpty()) {
            for (Constraint cn : extraction.getConstraints()) {
                if (cn.getId() == null || cn.getId().isBlank()) {
                    cn.setId(UUID.randomUUID().toString());
                }
                cn.setInitiativeId(initiativeId);
                cn.setSourceEventId(primaryEventId != null ? primaryEventId : savedSource.getId());
                cn.setCreatedAt(Instant.now());
                Constraint savedConstraint = constraintRepository.save(cn);
                response.getExtractedConstraints().add(savedConstraint);
            }
        }

        // 5. Persist extracted Contradictions to DB
        if (extraction.getContradictions() != null && !extraction.getContradictions().isEmpty()) {
            for (Contradiction ct : extraction.getContradictions()) {
                if (ct.getId() == null || ct.getId().isBlank()) {
                    ct.setId(UUID.randomUUID().toString());
                }
                ct.setInitiativeId(initiativeId);
                if (ct.getEventIdA() == null) ct.setEventIdA(primaryEventId != null ? primaryEventId : savedSource.getId());
                if (ct.getEventIdB() == null) ct.setEventIdB(savedSource.getId());
                ct.setCreatedAt(Instant.now());
                Contradiction savedContra = contradictionRepository.save(ct);
                response.getExtractedContradictions().add(savedContra);
            }
        }

        log.info("Completed Ingestion pipeline for Source: {}. Extracted {} events, {} constraints.",
                savedSource.getTitle(), response.getExtractedEvents().size(), response.getExtractedConstraints().size());

        return response;
    }

    private String resolveInitiativeId(String initiativeId) {
        if (initiativeId != null && !initiativeId.isBlank() && initiativeRepository.existsById(initiativeId)) {
            return initiativeId;
        }
        // Fallback: pick the first initiative or create a default one
        List<Initiative> list = initiativeRepository.findAllByOrderByCreatedAtDesc();
        if (!list.isEmpty()) {
            return list.get(0).getId();
        }
        Initiative defaultInit = new Initiative();
        defaultInit.setId(UUID.randomUUID().toString());
        defaultInit.setName("Product Memory Initiative");
        defaultInit.setCreatedAt(Instant.now());
        return initiativeRepository.save(defaultInit).getId();
    }
}
