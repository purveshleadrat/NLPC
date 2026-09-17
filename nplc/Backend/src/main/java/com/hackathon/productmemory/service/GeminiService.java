package com.hackathon.productmemory.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hackathon.productmemory.entity.Constraint;
import com.hackathon.productmemory.entity.Contradiction;
import com.hackathon.productmemory.entity.Event;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.*;

@Service
public class GeminiService {

    private static final Logger log = LoggerFactory.getLogger(GeminiService.class);

    private final RestClient restClient;
    private final String apiKey;
    private final String model;
    private final ObjectMapper objectMapper;

    public GeminiService(
            @Value("${gemini.api-key:}") String apiKey,
            @Value("${gemini.model:gemini-2.0-flash}") String model,
            ObjectMapper objectMapper
    ) {
        this.apiKey = apiKey;
        this.model = model;
        this.objectMapper = objectMapper;
        this.restClient = RestClient.builder()
                .baseUrl("https://generativelanguage.googleapis.com")
                .build();
    }

    public static class ExtractionResult {
        private String summary;
        private List<Event> events = new ArrayList<>();
        private List<Constraint> constraints = new ArrayList<>();
        private List<Contradiction> contradictions = new ArrayList<>();

        public String getSummary() { return summary; }
        public void setSummary(String summary) { this.summary = summary; }

        public List<Event> getEvents() { return events; }
        public void setEvents(List<Event> events) { this.events = events; }

        public List<Constraint> getConstraints() { return constraints; }
        public void setConstraints(List<Constraint> constraints) { this.constraints = constraints; }

        public List<Contradiction> getContradictions() { return contradictions; }
        public void setContradictions(List<Contradiction> contradictions) { this.contradictions = contradictions; }
    }

    /**
     * Extracts structured events, decisions, constraints, and contradictions from filtered text using Gemini.
     */
    public ExtractionResult extractFromText(String filteredContext, String defaultAuthor, String defaultDate) {
        if (apiKey == null || apiKey.isBlank() || apiKey.startsWith("your_")) {
            log.info("GEMINI_API_KEY not set or placeholder. Using intelligent local fallback extraction.");
            return fallbackExtraction(filteredContext, defaultAuthor, defaultDate);
        }

        try {
            String systemPrompt = "You are a product memory AI assistant. Analyze the provided filtered product/technical source context. "
                    + "Extract structured decisions, changes, proposals, dependencies, and constraints. "
                    + "Respond ONLY with a valid JSON object strictly matching this schema with no markdown backticks:\n"
                    + "{\n"
                    + "  \"summary\": \"Brief 1-line high level summary\",\n"
                    + "  \"events\": [\n"
                    + "    {\n"
                    + "      \"eventType\": \"DECISION | CHANGE | PROPOSAL | DEPENDENCY | OPEN_QUESTION\",\n"
                    + "      \"summary\": \"Clear description of decision or change\",\n"
                    + "      \"decidedBy\": \"Author or owner name\",\n"
                    + "      \"eventDate\": \"YYYY-MM-DD\",\n"
                    + "      \"status\": \"CURRENT | UNRESOLVED | SUPERSEDED\",\n"
                    + "      \"confidence\": \"HIGH | LOW\",\n"
                    + "      \"affectedItems\": [\"item or component 1\", \"item 2\"]\n"
                    + "    }\n"
                    + "  ],\n"
                    + "  \"constraints\": [\n"
                    + "    {\n"
                    + "      \"statement\": \"Rule, compliance requirement or constraint\",\n"
                    + "      \"reason\": \"Rationale for constraint\",\n"
                    + "      \"status\": \"ACTIVE\"\n"
                    + "    }\n"
                    + "  ],\n"
                    + "  \"contradictions\": [\n"
                    + "    {\n"
                    + "      \"description\": \"Description of any detected contradiction or scope conflict\"\n"
                    + "    }\n"
                    + "  ]\n"
                    + "}";

            Map<String, Object> requestPayload = new LinkedHashMap<>();

            Map<String, Object> systemInstruction = new LinkedHashMap<>();
            systemInstruction.put("parts", List.of(Map.of("text", systemPrompt)));
            requestPayload.put("systemInstruction", systemInstruction);

            Map<String, Object> userContent = new LinkedHashMap<>();
            userContent.put("role", "user");
            userContent.put("parts", List.of(Map.of("text",
                    "Extract product intelligence from this filtered context:\n\n" + filteredContext)));
            requestPayload.put("contents", List.of(userContent));

            requestPayload.put("generationConfig", Map.of(
                    "responseMimeType", "application/json",
                    "maxOutputTokens", 1500
            ));

            String requestBody = objectMapper.writeValueAsString(requestPayload);

            String responseJson = restClient.post()
                    .uri("/v1beta/models/{model}:generateContent", model)
                    .header("x-goog-api-key", apiKey)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                String textContent = candidates.get(0).path("content").path("parts").path(0).path("text").asText();
                return parseExtractionJson(textContent, defaultAuthor, defaultDate);
            }

            return fallbackExtraction(filteredContext, defaultAuthor, defaultDate);

        } catch (Exception e) {
            log.error("Gemini extraction failed: {}. Falling back to rule-based extraction.", e.getMessage());
            return fallbackExtraction(filteredContext, defaultAuthor, defaultDate);
        }
    }

    private ExtractionResult parseExtractionJson(String rawAiText, String defaultAuthor, String defaultDate) {
        try {
            String cleaned = rawAiText.trim();
            if (cleaned.startsWith("```json")) {
                cleaned = cleaned.substring(7);
            } else if (cleaned.startsWith("```")) {
                cleaned = cleaned.substring(3);
            }
            if (cleaned.endsWith("```")) {
                cleaned = cleaned.substring(0, cleaned.length() - 3);
            }
            cleaned = cleaned.trim();

            JsonNode root = objectMapper.readTree(cleaned);
            ExtractionResult result = new ExtractionResult();
            result.setSummary(root.path("summary").asText("Extracted from source"));

            JsonNode eventsNode = root.path("events");
            if (eventsNode.isArray()) {
                for (JsonNode e : eventsNode) {
                    Event ev = new Event();
                    ev.setEventType(e.path("eventType").asText("DECISION"));
                    ev.setSummary(e.path("summary").asText(""));
                    ev.setDecidedBy(e.path("decidedBy").asText(defaultAuthor));
                    ev.setEventDate(e.path("eventDate").asText(defaultDate));
                    ev.setStatus(e.path("status").asText("CURRENT"));
                    ev.setConfidence(e.path("confidence").asText("HIGH"));

                    List<String> items = new ArrayList<>();
                    JsonNode aff = e.path("affectedItems");
                    if (aff.isArray()) {
                        for (JsonNode item : aff) items.add(item.asText());
                    }
                    ev.setAffectedItems(items);
                    result.getEvents().add(ev);
                }
            }

            JsonNode constraintsNode = root.path("constraints");
            if (constraintsNode.isArray()) {
                for (JsonNode c : constraintsNode) {
                    Constraint cn = new Constraint();
                    cn.setStatement(c.path("statement").asText(""));
                    cn.setReason(c.path("reason").asText(""));
                    cn.setStatus(c.path("status").asText("ACTIVE"));
                    result.getConstraints().add(cn);
                }
            }

            JsonNode contraNode = root.path("contradictions");
            if (contraNode.isArray()) {
                for (JsonNode ct : contraNode) {
                    Contradiction ctd = new Contradiction();
                    ctd.setDescription(ct.path("description").asText(""));
                    result.getContradictions().add(ctd);
                }
            }

            return result;
        } catch (Exception e) {
            log.warn("Failed to parse Gemini output JSON: {}", e.getMessage());
            return fallbackExtraction(rawAiText, defaultAuthor, defaultDate);
        }
    }

    private ExtractionResult fallbackExtraction(String text, String author, String date) {
        ExtractionResult result = new ExtractionResult();
        String effectiveDate = (date != null && !date.isBlank()) ? date : Instant.now().toString().substring(0, 10);
        String effectiveAuthor = (author != null && !author.isBlank()) ? author : "Engineering";

        result.setSummary("Extracted context from source");

        // Simple heuristic extraction for fallback
        Event ev = new Event();
        ev.setEventType(text.toUpperCase().contains("DECISION") ? "DECISION" : "CHANGE");
        String firstMeaningfulLine = text.lines()
                .filter(l -> !l.startsWith("Source:") && !l.startsWith("Repository:") && !l.startsWith("Branch:") && !l.startsWith("Date:") && !l.isBlank())
                .findFirst()
                .orElse("Code change & implementation updates");
        ev.setSummary(firstMeaningfulLine.replace("Commit Message / Description:", "").trim());
        ev.setDecidedBy(effectiveAuthor);
        ev.setEventDate(effectiveDate);
        ev.setStatus("CURRENT");
        ev.setConfidence("HIGH");
        ev.setAffectedItems(List.of("Source Implementation", "Product Context"));
        result.getEvents().add(ev);

        if (text.toLowerCase().contains("compliance") || text.toLowerCase().contains("audit") || text.toLowerCase().contains("policy") || text.toLowerCase().contains("security")) {
            Constraint c = new Constraint();
            c.setStatement("Audit & compliance validation required for modifications");
            c.setReason("Triggered by security/audit requirement in source context");
            c.setStatus("ACTIVE");
            result.getConstraints().add(c);
        }

        return result;
    }
}
