package com.hackathon.productmemory.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hackathon.productmemory.dto.ExtractionDtos.*;
import com.hackathon.productmemory.entity.Constraint;
import com.hackathon.productmemory.entity.Contradiction;
import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.integration.llm.LlmClient;
import com.hackathon.productmemory.repository.ConstraintRepository;
import com.hackathon.productmemory.repository.ContradictionRepository;
import com.hackathon.productmemory.repository.EventRepository;
import com.hackathon.productmemory.repository.SourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Turns raw sources into the decision graph: the one place the LLM writes facts.
 *
 * <p>Runs on a source only if it has no events yet, so calling extract twice is safe and
 * never duplicates. Everything the model produces is clamped to the rules in
 * {@link #SYSTEM_PROMPT}: no unevidenced owners, decisions only when a decision is actually
 * stated, and every event carries the snippet it came from. History is only ever appended -
 * a supersede flips the old event's status, it never deletes it.
 */
@Service
public class ExtractionService {

    private static final Set<String> EVENT_TYPES = Set.of(
            "DECISION", "PROPOSAL", "CHANGE", "ASSUMPTION", "DEPENDENCY", "OPEN_QUESTION");

    private static final String SYSTEM_PROMPT = """
            You extract structured product-decision facts from a single source artifact.
            You are building an append-only memory, so accuracy and provenance matter more
            than completeness. Follow these rules without exception:

            1. Output ONLY a JSON object, no prose, no markdown fences.
            2. Mark an event as "DECISION" ONLY when the text explicitly states a decision was
               made (an approval, a sign-off, a resolved choice with an owner). If it is only
               a suggestion, an idea or a discussion, use "PROPOSAL". If a decision is implied
               but not clearly owned or approved, keep it a PROPOSAL or set confidence "LOW".
            3. NEVER invent a decidedBy owner. If no owner is explicitly named, set it to null.
            4. Every event MUST include an "evidence" field: the exact sentence(s) from the
               source that justify it, copied verbatim. No evidence -> do not emit the event.
            5. An unresolved question in the text is an "OPEN_QUESTION" event. Do NOT answer it
               or resolve it yourself.
            6. Use "eventType" values only from: DECISION, PROPOSAL, CHANGE, ASSUMPTION,
               DEPENDENCY, OPEN_QUESTION.
            7. "confidence" is "HIGH" only when the text is explicit and unambiguous; otherwise
               "LOW".
            8. affectedItems: identifiers/artifacts the event touches (e.g. REQ-204, ticket
               keys, feature names), as a list of short strings. Empty list if none.
            9. eventDate: an ISO date (YYYY-MM-DD) if the text gives one, otherwise use the
               source's docDate provided below.

            You are also given the EXISTING events already stored for this initiative, each
            with an id. Use them ONLY to link, never to duplicate:
            - If a new event clearly replaces/updates an existing one, set the new event's
              "supersedesEventId" to that existing event's id.
            - If a new event answers an existing OPEN_QUESTION, set "resolvesEventId" to it.
            - If a new event conflicts with an existing one and neither clearly supersedes the
              other, add a contradictions entry ({eventIndex, existingEventId, description}).
              Do not pick a winner.

            JSON schema to return exactly:
            {
              "events": [
                {
                  "eventType": "DECISION|PROPOSAL|CHANGE|ASSUMPTION|DEPENDENCY|OPEN_QUESTION",
                  "summary": "one sentence",
                  "decidedBy": "name or null",
                  "eventDate": "YYYY-MM-DD",
                  "confidence": "HIGH|LOW",
                  "affectedItems": ["..."],
                  "evidence": "verbatim snippet from the source",
                  "supersedesEventId": "existing-event-id or null",
                  "resolvesEventId": "existing-event-id or null"
                }
              ],
              "constraints": [
                { "statement": "the rule/limit", "reason": "why", "eventIndex": 0 }
              ],
              "contradictions": [
                { "eventIndex": 0, "existingEventId": "existing-event-id", "description": "..." }
              ]
            }
            Return empty arrays where nothing applies. eventIndex refers to the events array
            above (0-based).
            """;

    private final LlmClient llm;
    private final InitiativeService initiativeService;
    private final SourceRepository sourceRepository;
    private final EventRepository eventRepository;
    private final ConstraintRepository constraintRepository;
    private final ContradictionRepository contradictionRepository;
    private final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public ExtractionService(LlmClient llm,
                             InitiativeService initiativeService,
                             SourceRepository sourceRepository,
                             EventRepository eventRepository,
                             ConstraintRepository constraintRepository,
                             ContradictionRepository contradictionRepository) {
        this.llm = llm;
        this.initiativeService = initiativeService;
        this.sourceRepository = sourceRepository;
        this.eventRepository = eventRepository;
        this.constraintRepository = constraintRepository;
        this.contradictionRepository = contradictionRepository;
    }

    /**
     * Extracts every not-yet-extracted source in the initiative, in document-date order so
     * earlier decisions exist as supersede targets before later ones are processed.
     */
    @Transactional
    public ExtractResult extractInitiative(String initiativeId) {
        initiativeService.requireInitiative(initiativeId);

        List<Source> pending = sourceRepository.findByInitiativeId(initiativeId).stream()
                .filter(s -> eventRepository
                        .findByInitiativeIdAndSourceId(initiativeId, s.getId()).isEmpty())
                .sorted((a, b) -> safeDate(a.getDocDate()).compareTo(safeDate(b.getDocDate())))
                .toList();

        // id -> short label, given to the model so it can reference prior events.
        Map<String, Event> known = new LinkedHashMap<>();
        for (Event e : eventRepository.findByInitiativeIdOrderByEventDateAsc(initiativeId)) {
            known.put(e.getId(), e);
        }

        int events = 0, constraints = 0, contradictions = 0, superseded = 0;
        for (Source source : pending) {
            Counters c = extractSource(source, known);
            events += c.events;
            constraints += c.constraints;
            contradictions += c.contradictions;
            superseded += c.superseded;
        }
        return new ExtractResult(pending.size(), events, constraints, contradictions, superseded);
    }

    private Counters extractSource(Source source, Map<String, Event> known) {
        String userPrompt = buildUserPrompt(source, known.values());
        String json = llm.generate(SYSTEM_PROMPT, userPrompt, true);

        LlmExtraction extraction;
        try {
            extraction = mapper.readValue(stripFences(json), LlmExtraction.class);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "could not parse extraction for source " + source.getId() + ": " + e.getMessage());
        }

        Counters c = new Counters();
        List<Event> createdThisSource = new ArrayList<>();

        if (extraction.events() != null) {
            for (LlmEvent le : extraction.events()) {
                Event saved = persistEvent(source, le, known, c);
                createdThisSource.add(saved);
            }
        }

        if (extraction.constraints() != null) {
            for (LlmConstraint lc : extraction.constraints()) {
                Event owner = eventAt(createdThisSource, lc.eventIndex());
                if (owner == null || lc.statement() == null || lc.statement().isBlank()) {
                    continue;
                }
                Constraint con = new Constraint();
                con.setId(UUID.randomUUID().toString());
                con.setInitiativeId(source.getInitiativeId());
                con.setSourceEventId(owner.getId());
                con.setStatement(lc.statement());
                con.setReason(lc.reason());
                con.setStatus("ACTIVE");
                con.setCreatedAt(Instant.now());
                constraintRepository.save(con);
                c.constraints++;
            }
        }

        if (extraction.contradictions() != null) {
            for (LlmContradiction lc : extraction.contradictions()) {
                Event a = eventAt(createdThisSource, lc.eventIndex());
                Event b = lc.existingEventId() == null ? null : known.get(lc.existingEventId());
                if (a == null || b == null) {
                    continue;
                }
                Contradiction con = new Contradiction();
                con.setId(UUID.randomUUID().toString());
                con.setInitiativeId(source.getInitiativeId());
                con.setEventIdA(a.getId());
                con.setEventIdB(b.getId());
                con.setDescription(lc.description() == null ? "conflict" : lc.description());
                con.setResolved(false);
                con.setCreatedAt(Instant.now());
                contradictionRepository.save(con);
                c.contradictions++;
            }
        }

        // Newly created events become supersede/contradiction targets for later sources.
        for (Event e : createdThisSource) {
            known.put(e.getId(), e);
        }
        return c;
    }

    private Event persistEvent(Source source, LlmEvent le, Map<String, Event> known, Counters c) {
        Event e = new Event();
        e.setId(UUID.randomUUID().toString());
        e.setInitiativeId(source.getInitiativeId());
        e.setSourceId(source.getId());
        e.setEventType(EVENT_TYPES.contains(orEmpty(le.eventType())) ? le.eventType() : "PROPOSAL");
        e.setSummary(orEmpty(le.summary()).isBlank() ? "(no summary)" : le.summary());
        e.setDecidedBy(blankToNull(le.decidedBy()));
        e.setEventDate(orEmpty(le.eventDate()).isBlank() ? source.getDocDate() : le.eventDate());
        e.setConfidence("HIGH".equalsIgnoreCase(orEmpty(le.confidence())) ? "HIGH" : "LOW");
        e.setEvidence(blankToNull(le.evidence()));
        e.setAffectedItems(le.affectedItems() == null ? new ArrayList<>() : new ArrayList<>(le.affectedItems()));
        e.setStatus("OPEN_QUESTION".equals(e.getEventType()) ? "UNRESOLVED" : "CURRENT");

        // Link to an existing event this one replaces, and flip that one to SUPERSEDED.
        Event target = le.supersedesEventId() == null ? null : known.get(le.supersedesEventId());
        if (target != null && !"SUPERSEDED".equals(target.getStatus())) {
            e.setSupersedesEventId(target.getId());
            target.setStatus("SUPERSEDED");
            eventRepository.save(target);
            c.superseded++;
        }

        // Resolve an existing open question this event answers (append-only status change).
        Event resolved = le.resolvesEventId() == null ? null : known.get(le.resolvesEventId());
        if (resolved != null && "UNRESOLVED".equals(resolved.getStatus())) {
            resolved.setStatus("RESOLVED");
            eventRepository.save(resolved);
        }

        e.setCreatedAt(Instant.now());
        Event saved = eventRepository.save(e);
        c.events++;
        return saved;
    }

    private static String buildUserPrompt(Source source, Iterable<Event> known) {
        StringBuilder existing = new StringBuilder();
        for (Event e : known) {
            existing.append("- id=").append(e.getId())
                    .append(" [").append(e.getEventType()).append('/').append(e.getStatus()).append("] ")
                    .append(e.getSummary()).append('\n');
        }
        if (existing.length() == 0) {
            existing.append("(none yet)\n");
        }
        return """
                EXISTING events for this initiative:
                %s
                SOURCE to extract:
                type: %s
                title: %s
                author: %s
                docDate: %s
                externalRef: %s
                --- raw text ---
                %s
                --- end raw text ---
                """.formatted(
                existing, orEmpty(source.getType()), orEmpty(source.getTitle()),
                orEmpty(source.getAuthor()), orEmpty(source.getDocDate()),
                orEmpty(source.getExternalRef()), orEmpty(source.getRawText()));
    }

    private static Event eventAt(List<Event> events, Integer index) {
        if (index == null || index < 0 || index >= events.size()) {
            return null;
        }
        return events.get(index);
    }

    /** Some models wrap JSON in ```json fences despite the instruction; tolerate it. */
    private static String stripFences(String raw) {
        String s = raw == null ? "" : raw.trim();
        if (s.startsWith("```")) {
            int firstNewline = s.indexOf('\n');
            if (firstNewline >= 0) {
                s = s.substring(firstNewline + 1);
            }
            if (s.endsWith("```")) {
                s = s.substring(0, s.length() - 3);
            }
        }
        return s.trim();
    }

    private static String safeDate(String d) {
        return d == null ? "" : d;
    }

    private static String orEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() || "null".equalsIgnoreCase(s.trim()) ? null : s.trim();
    }

    private static final class Counters {
        int events, constraints, contradictions, superseded;
    }
}
