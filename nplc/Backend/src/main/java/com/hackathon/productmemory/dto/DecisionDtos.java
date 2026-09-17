package com.hackathon.productmemory.dto;

import java.util.List;

/** Request shape for appending a decision or human correction to an initiative. */
public final class DecisionDtos {

    private DecisionDtos() {
    }

    /**
     * Adding a decision is always an append. {@code supersedesEventId} flips an older event
     * to SUPERSEDED (never deletes it); {@code resolvesEventId} marks an OPEN_QUESTION
     * RESOLVED. {@code sourceId} is optional - without one, a manual-entry source is created
     * to preserve provenance, because every event must trace back to a source.
     */
    public record DecisionRequest(
            String eventType,          // defaults to DECISION
            String summary,
            String decidedBy,
            String eventDate,
            String confidence,         // defaults to HIGH
            List<String> affectedItems,
            String supersedesEventId,
            String resolvesEventId,
            String sourceId) {
    }
}
