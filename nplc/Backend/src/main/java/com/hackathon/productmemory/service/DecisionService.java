package com.hackathon.productmemory.service;

import com.hackathon.productmemory.dto.DecisionDtos.DecisionRequest;
import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.repository.EventRepository;
import com.hackathon.productmemory.repository.SourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Set;
import java.util.UUID;

/**
 * Appends a human-entered decision (or correction) to an initiative.
 *
 * <p>Never overwrites: a supersede flips the old event's status and links the new one, a
 * resolve marks an open question RESOLVED. Both are appends plus a status change, in one
 * transaction, so the timeline stays intact and consistent.
 */
@Service
public class DecisionService {

    private static final Set<String> EVENT_TYPES = Set.of(
            "DECISION", "PROPOSAL", "CHANGE", "ASSUMPTION", "DEPENDENCY", "OPEN_QUESTION");

    private final EventRepository eventRepository;
    private final SourceRepository sourceRepository;
    private final InitiativeService initiativeService;

    public DecisionService(EventRepository eventRepository,
                           SourceRepository sourceRepository,
                           InitiativeService initiativeService) {
        this.eventRepository = eventRepository;
        this.sourceRepository = sourceRepository;
        this.initiativeService = initiativeService;
    }

    @Transactional
    public Event addDecision(String initiativeId, DecisionRequest req) {
        initiativeService.requireInitiative(initiativeId);
        if (req.summary() == null || req.summary().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "summary is required");
        }

        String eventDate = req.eventDate() == null || req.eventDate().isBlank()
                ? LocalDate.now().toString()
                : req.eventDate();
        String sourceId = resolveSource(initiativeId, req, eventDate);

        String type = EVENT_TYPES.contains(orEmpty(req.eventType())) ? req.eventType() : "DECISION";

        Event e = new Event();
        e.setId(UUID.randomUUID().toString());
        e.setInitiativeId(initiativeId);
        e.setSourceId(sourceId);
        e.setEventType(type);
        e.setSummary(req.summary());
        e.setDecidedBy(blankToNull(req.decidedBy()));
        e.setEventDate(eventDate);
        e.setConfidence("LOW".equalsIgnoreCase(orEmpty(req.confidence())) ? "LOW" : "HIGH");
        e.setAffectedItems(req.affectedItems() == null ? new ArrayList<>() : new ArrayList<>(req.affectedItems()));
        e.setStatus("OPEN_QUESTION".equals(type) ? "UNRESOLVED" : "CURRENT");
        e.setCreatedAt(Instant.now());

        if (blankToNull(req.supersedesEventId()) != null) {
            Event old = requireEvent(initiativeId, req.supersedesEventId());
            if (!"SUPERSEDED".equals(old.getStatus())) {
                old.setStatus("SUPERSEDED");
                eventRepository.save(old);
            }
            e.setSupersedesEventId(old.getId());
        }

        if (blankToNull(req.resolvesEventId()) != null) {
            Event q = requireEvent(initiativeId, req.resolvesEventId());
            if ("UNRESOLVED".equals(q.getStatus())) {
                q.setStatus("RESOLVED");
                eventRepository.save(q);
            }
        }

        return eventRepository.save(e);
    }

    /** Uses a supplied source if it belongs to the initiative, else records a manual source. */
    private String resolveSource(String initiativeId, DecisionRequest req, String eventDate) {
        String supplied = blankToNull(req.sourceId());
        if (supplied != null) {
            Source s = sourceRepository.findById(supplied)
                    .filter(x -> initiativeId.equals(x.getInitiativeId()))
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "no source with id " + supplied));
            return s.getId();
        }

        Source manual = new Source();
        manual.setId(UUID.randomUUID().toString());
        manual.setInitiativeId(initiativeId);
        manual.setType("manual_entry");
        manual.setTitle("Manual decision — " + eventDate);
        manual.setRawText(req.summary());
        manual.setDocDate(eventDate);
        manual.setAuthor(blankToNull(req.decidedBy()));
        manual.setCreatedAt(Instant.now());
        return sourceRepository.save(manual).getId();
    }

    private Event requireEvent(String initiativeId, String eventId) {
        return eventRepository.findById(eventId)
                .filter(e -> initiativeId.equals(e.getInitiativeId()))
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "no event with id " + eventId));
    }

    private static String orEmpty(String s) {
        return s == null ? "" : s;
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }
}
