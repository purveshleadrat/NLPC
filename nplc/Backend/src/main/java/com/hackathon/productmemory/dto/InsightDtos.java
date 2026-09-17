package com.hackathon.productmemory.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.hackathon.productmemory.entity.Constraint;
import com.hackathon.productmemory.entity.Event;

import java.util.List;

/** Request/response shapes for ask, brief and scope. */
public final class InsightDtos {

    private InsightDtos() {
    }

    // --- Ask --------------------------------------------------------------------

    public record AskRequest(String question) {
    }

    /**
     * Answer shape the Ask page consumes directly: {@code sources} is a list of short
     * human labels (a source's external ref or title), rendered as citation chips.
     */
    public record AskResponse(
            String answer,
            List<String> sources,
            boolean hasContradiction,
            String uncertainty,
            String confidence) {
    }

    /** Internal: what the model returns before we ground the citations against real data. */
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LlmAnswer(
            String answer,
            List<String> citedEventIds,
            Boolean hasContradiction,
            String uncertainty,
            String confidence) {
    }

    // --- Brief ------------------------------------------------------------------

    /** Matches the fixed sections the Resume Brief page renders. */
    public record BriefResponse(
            String initiativeTitle,
            String overview,
            String currentScope,
            List<String> recentChanges,
            List<String> supersededDecisions,
            List<String> openQuestions,
            List<String> risks) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record LlmBrief(
            String overview,
            String currentScope,
            List<String> recentChanges,
            List<String> supersededDecisions,
            List<String> openQuestions,
            List<String> risks,
            String recommendedNextStep) {
    }

    // --- Scope (pure query, no LLM) ---------------------------------------------

    public record ScopeResponse(
            List<Event> current,
            List<Event> superseded,
            List<Event> openQuestions,
            List<Constraint> activeConstraints) {
    }
}
