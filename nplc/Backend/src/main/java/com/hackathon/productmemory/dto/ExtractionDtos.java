package com.hackathon.productmemory.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

/**
 * Shapes for the extraction step: what the LLM is asked to return, and what the endpoint
 * reports back after persisting it.
 *
 * <p>The {@code Llm*} records are deserialized straight from the model's JSON, so they are
 * lenient by design ({@link JsonIgnoreProperties}) - a model that adds a stray field must
 * not fail the whole extraction.
 */
public final class ExtractionDtos {

    private ExtractionDtos() {
    }

    /** The full JSON document the extractor returns for one source. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LlmExtraction(
            List<LlmEvent> events,
            List<LlmConstraint> constraints,
            List<LlmContradiction> contradictions) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LlmEvent(
            Integer sourceIndex,       // which of the batch's SOURCES (0-based) this came from
            String eventType,          // DECISION|PROPOSAL|CHANGE|ASSUMPTION|DEPENDENCY|OPEN_QUESTION
            String summary,
            String decidedBy,          // null unless an owner is explicitly evidenced
            String eventDate,          // ISO date; falls back to the source's docDate
            String confidence,         // HIGH|LOW
            List<String> affectedItems,
            String evidence,           // the exact source snippet this came from
            String supersedesEventId,  // id of an EXISTING event this replaces, or null
            String resolvesEventId) {  // id of an EXISTING OPEN_QUESTION this answers, or null
    }

    /** A rule/limit. {@code eventIndex} points at an event in the same extraction's list. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LlmConstraint(
            String statement,
            String reason,
            Integer eventIndex) {
    }

    /**
     * A conflict between a newly extracted event ({@code eventIndex}, in this same
     * extraction) and an already-stored one ({@code existingEventId}).
     */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LlmContradiction(
            Integer eventIndex,
            String existingEventId,
            String description) {
    }

    /** Summary of what a run of extraction actually wrote. Returned by the endpoint. */
    public record ExtractResult(
            int sourcesProcessed,
            int eventsCreated,
            int constraintsCreated,
            int contradictionsCreated,
            int eventsSuperseded) {
    }
}
