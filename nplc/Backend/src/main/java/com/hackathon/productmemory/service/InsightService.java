package com.hackathon.productmemory.service;

import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hackathon.productmemory.dto.InsightDtos.*;
import com.hackathon.productmemory.entity.Constraint;
import com.hackathon.productmemory.entity.Contradiction;
import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.integration.llm.LlmClient;
import com.hackathon.productmemory.repository.ConstraintRepository;
import com.hackathon.productmemory.repository.ContradictionRepository;
import com.hackathon.productmemory.repository.EventRepository;
import com.hackathon.productmemory.repository.SourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Answers the five questions and writes the resume brief - the read side of the graph.
 *
 * <p>Neither method lets the model invent: it is handed only the initiative's own stored
 * events, constraints and contradictions as context, told to answer strictly from them, and
 * its citations are re-grounded here against real source labels before they reach the client.
 */
@Service
public class InsightService {

    private static final String ASK_SYSTEM = """
            You answer questions about ONE product initiative using ONLY the structured context
            provided (events, constraints, contradictions). Rules:
            - Never state anything not supported by the context. If the context does not answer
              the question, say so plainly and set confidence "LOW".
            - NEVER present a SUPERSEDED event as the current decision. The current state is the
              CURRENT (non-superseded) events. You may mention that something was superseded.
            - If two events conflict (a contradiction, or an unresolved disagreement), show both
              sides and set hasContradiction true. Do not pick a winner.
            - Cite the event ids you used in citedEventIds.
            Output ONLY this JSON object, no prose, no fences:
            {
              "answer": "the answer, plainly worded",
              "citedEventIds": ["event-id", ...],
              "hasContradiction": false,
              "uncertainty": "a short note if you are unsure, else null",
              "confidence": "HIGH|LOW"
            }
            """;

    private static final String BRIEF_SYSTEM = """
            You write a resume brief for someone rejoining ONE product initiative, using ONLY
            the structured context provided. Every line must be supported by the context; never
            invent. Superseded decisions go under supersededDecisions and must NOT appear as
            current. Keep each bullet to one sentence and, where possible, reference the source
            or decision it comes from.
            Output ONLY this JSON object, no prose, no fences:
            {
              "overview": "2-3 sentence summary of where the initiative stands",
              "currentScope": "the current approved scope as a short paragraph",
              "recentChanges": ["what changed recently and why", ...],
              "supersededDecisions": ["old decision no longer in effect", ...],
              "openQuestions": ["unresolved question", ...],
              "risks": ["risk or dependency", ...],
              "recommendedNextStep": "one concrete next step"
            }
            Use empty arrays where nothing applies.
            """;

    private final LlmClient llm;
    private final InitiativeService initiativeService;
    private final EventRepository eventRepository;
    private final ConstraintRepository constraintRepository;
    private final ContradictionRepository contradictionRepository;
    private final SourceRepository sourceRepository;
    private final ObjectMapper mapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

    public InsightService(LlmClient llm,
                          InitiativeService initiativeService,
                          EventRepository eventRepository,
                          ConstraintRepository constraintRepository,
                          ContradictionRepository contradictionRepository,
                          SourceRepository sourceRepository) {
        this.llm = llm;
        this.initiativeService = initiativeService;
        this.eventRepository = eventRepository;
        this.constraintRepository = constraintRepository;
        this.contradictionRepository = contradictionRepository;
        this.sourceRepository = sourceRepository;
    }

    // --- Ask --------------------------------------------------------------------

    public AskResponse ask(String initiativeId, String question) {
        initiativeService.requireInitiative(initiativeId);
        if (question == null || question.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "question is required");
        }

        List<Event> events = eventRepository.findByInitiativeIdOrderByEventDateAsc(initiativeId);
        Map<String, String> eventToLabel = eventLabelMap(initiativeId, events);

        String context = graphContext(events,
                constraintRepository.findByInitiativeId(initiativeId),
                contradictionRepository.findByInitiativeId(initiativeId));

        String user = context + "\n\nQUESTION: " + question;
        LlmAnswer parsed = parse(llm.generate(ASK_SYSTEM, user, true), LlmAnswer.class);

        // Ground citations: only ids that really belong to this initiative become chips.
        Set<String> labels = new LinkedHashSet<>();
        if (parsed.citedEventIds() != null) {
            for (String id : parsed.citedEventIds()) {
                String label = eventToLabel.get(id);
                if (label != null) {
                    labels.add(label);
                }
            }
        }

        return new AskResponse(
                orEmpty(parsed.answer()).isBlank() ? "I couldn't find an answer in the sources." : parsed.answer(),
                new ArrayList<>(labels),
                Boolean.TRUE.equals(parsed.hasContradiction()),
                blankToNull(parsed.uncertainty()),
                "HIGH".equalsIgnoreCase(orEmpty(parsed.confidence())) ? "HIGH" : "LOW");
    }

    // --- Brief ------------------------------------------------------------------

    public BriefResponse brief(String initiativeId) {
        initiativeService.requireInitiative(initiativeId);
        Initiative initiative = initiativeService.getById(initiativeId);

        List<Event> events = eventRepository.findByInitiativeIdOrderByEventDateAsc(initiativeId);
        String context = graphContext(events,
                constraintRepository.findByInitiativeId(initiativeId),
                contradictionRepository.findByInitiativeId(initiativeId));

        LlmBrief b = parse(llm.generate(BRIEF_SYSTEM, context, true), LlmBrief.class);

        String overview = orEmpty(b.overview());
        if (b.recommendedNextStep() != null && !b.recommendedNextStep().isBlank()) {
            overview = (overview.isBlank() ? "" : overview + " ")
                    + "Recommended next step: " + b.recommendedNextStep().trim();
        }

        return new BriefResponse(
                initiative.getName(),
                overview,
                orEmpty(b.currentScope()),
                nonNull(b.recentChanges()),
                nonNull(b.supersededDecisions()),
                nonNull(b.openQuestions()),
                nonNull(b.risks()));
    }

    // --- Scope (no LLM) ---------------------------------------------------------

    public ScopeResponse scope(String initiativeId) {
        initiativeService.requireInitiative(initiativeId);
        List<Event> events = eventRepository.findByInitiativeIdOrderByEventDateAsc(initiativeId);

        List<Event> current = new ArrayList<>();
        List<Event> superseded = new ArrayList<>();
        List<Event> open = new ArrayList<>();
        for (Event e : events) {
            switch (orEmpty(e.getStatus())) {
                case "SUPERSEDED" -> superseded.add(e);
                case "UNRESOLVED" -> open.add(e);
                case "CURRENT" -> current.add(e);
                default -> { /* RESOLVED and any others are not part of current scope */ }
            }
        }
        return new ScopeResponse(current, superseded, open,
                constraintRepository.findByInitiativeIdAndStatus(initiativeId, "ACTIVE"));
    }

    // --- helpers ----------------------------------------------------------------

    private Map<String, String> eventLabelMap(String initiativeId, List<Event> events) {
        Map<String, String> sourceLabel = new LinkedHashMap<>();
        for (Source s : sourceRepository.findByInitiativeId(initiativeId)) {
            sourceLabel.put(s.getId(),
                    blankToNull(s.getExternalRef()) != null ? s.getExternalRef() : s.getTitle());
        }
        Map<String, String> out = new LinkedHashMap<>();
        for (Event e : events) {
            String label = sourceLabel.getOrDefault(e.getSourceId(), "source");
            out.put(e.getId(), label);
        }
        return out;
    }

    private static String graphContext(List<Event> events,
                                       List<Constraint> constraints,
                                       List<Contradiction> contradictions) {
        StringBuilder sb = new StringBuilder("EVENTS (the decision timeline):\n");
        if (events.isEmpty()) {
            sb.append("(none - nothing has been extracted yet)\n");
        }
        for (Event e : events) {
            sb.append("- id=").append(e.getId())
                    .append(" | ").append(e.getEventType())
                    .append(" | status=").append(e.getStatus())
                    .append(" | date=").append(e.getEventDate())
                    .append(" | confidence=").append(e.getConfidence())
                    .append(e.getDecidedBy() != null ? " | decidedBy=" + e.getDecidedBy() : "")
                    .append(" | ").append(e.getSummary());
            if (e.getAffectedItems() != null && !e.getAffectedItems().isEmpty()) {
                sb.append(" | affects=").append(String.join(",", e.getAffectedItems()));
            }
            if (e.getSupersedesEventId() != null) {
                sb.append(" | supersedes=").append(e.getSupersedesEventId());
            }
            if (e.getEvidence() != null) {
                sb.append(" | evidence=\"").append(e.getEvidence()).append('"');
            }
            sb.append('\n');
        }

        sb.append("\nCONSTRAINTS:\n");
        if (constraints.isEmpty()) {
            sb.append("(none)\n");
        }
        for (Constraint c : constraints) {
            sb.append("- [").append(c.getStatus()).append("] ").append(c.getStatement());
            if (c.getReason() != null) {
                sb.append(" (reason: ").append(c.getReason()).append(')');
            }
            sb.append('\n');
        }

        sb.append("\nCONTRADICTIONS (unresolved conflicts, show both sides):\n");
        if (contradictions.isEmpty()) {
            sb.append("(none)\n");
        }
        for (Contradiction c : contradictions) {
            sb.append("- eventA=").append(c.getEventIdA())
                    .append(" vs eventB=").append(c.getEventIdB())
                    .append(" | resolved=").append(c.isResolved())
                    .append(" | ").append(c.getDescription()).append('\n');
        }
        return sb.toString();
    }

    private <T> T parse(String json, Class<T> type) {
        try {
            return mapper.readValue(stripFences(json), type);
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                    "could not parse LLM response: " + e.getMessage());
        }
    }

    private static String stripFences(String raw) {
        String s = raw == null ? "" : raw.trim();
        if (s.startsWith("```")) {
            int nl = s.indexOf('\n');
            if (nl >= 0) {
                s = s.substring(nl + 1);
            }
            if (s.endsWith("```")) {
                s = s.substring(0, s.length() - 3);
            }
        }
        return s.trim();
    }

    private static <T> List<T> nonNull(List<T> list) {
        return list == null ? List.of() : list;
    }

    private static String orEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() || "null".equalsIgnoreCase(s.trim()) ? null : s.trim();
    }
}
