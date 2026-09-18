package com.hackathon.productmemory.integration.llm;

import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Google Gemini implementation of {@link LlmClient}, talking to the Generative Language API.
 *
 * <p>Built with the same {@link RestClient} + timeout pattern as the Jira/GitHub connection
 * clients: an LLM call is another outbound HTTP request that must not hold a worker thread
 * open indefinitely when the upstream is slow.
 *
 * <p>The API key is sent as the {@code x-goog-api-key} header rather than a {@code ?key=}
 * query parameter, so it never lands in a request log or an error URL.
 */
@Component
public class GeminiClient implements LlmClient {

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

    private final RestClient http;
    private final String apiKey;
    private final String model;

    public GeminiClient(@Value("${gemini.api-key:}") String apiKey,
                        @Value("${gemini.model:gemini-2.0-flash}") String model,
                        @Value("${gemini.connect-timeout:5s}") Duration connectTimeout,
                        @Value("${gemini.read-timeout:60s}") Duration readTimeout) {
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.model = model;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout((int) connectTimeout.toMillis());
        factory.setReadTimeout((int) readTimeout.toMillis());

        this.http = RestClient.builder()
                .requestFactory(factory)
                .baseUrl(BASE_URL)
                .build();
    }

    @Override
    public String generate(String systemPrompt, String userPrompt, boolean jsonMode) {
        if (apiKey.isBlank()) {
            // Fail loud and clear rather than sending an unauthenticated call: an empty key
            // means the operator has not configured GEMINI_API_KEY.
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,
                    "LLM is not configured: set GEMINI_API_KEY");
        }

        Map<String, Object> generationConfig = jsonMode
                ? Map.of("temperature", 0.2, "responseMimeType", "application/json")
                : Map.of("temperature", 0.3);

        Map<String, Object> body = Map.of(
                "system_instruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", List.of(Map.of(
                        "role", "user",
                        "parts", List.of(Map.of("text", userPrompt)))),
                "generationConfig", generationConfig);

        return extractText(postWithRetry(body));
    }

    // The free tier is rate-limited (per-minute and per-day). A 429/503 is often transient -
    // a short spike or a per-minute window - so retry a few times with backoff, honouring the
    // server's own retryDelay when it is short. A 429 that persists is surfaced as 429 (not
    // 502) so callers like extraction can stop cleanly and resume on the next run rather than
    // failing the whole operation.
    private JsonNode postWithRetry(Map<String, Object> body) {
        int maxAttempts = 3;
        long cappedWaitMillis = 12_000; // never hold a request longer than this per retry
        for (int attempt = 1; ; attempt++) {
            try {
                return http.post()
                        .uri("/models/{model}:generateContent", model)
                        .header("x-goog-api-key", apiKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(body)
                        .retrieve()
                        .body(JsonNode.class);
            } catch (RestClientResponseException e) {
                int status = e.getStatusCode().value();
                if ((status == 429 || status == 503) && attempt < maxAttempts) {
                    long delay = serverRetryDelayMillis(e);
                    if (delay < 0 && status == 503) {
                        delay = 1000L * (1L << (attempt - 1)); // 1s, 2s: transient overload
                    }
                    // Only wait if the delay is short. A long per-minute/day window (typical
                    // of a real quota wall) is not worth holding the request for - fail fast
                    // so the caller can stop and resume later.
                    if (delay >= 0 && delay <= cappedWaitMillis) {
                        sleep(delay);
                        continue;
                    }
                }
                if (status == 429) {
                    throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,
                            "LLM rate limit reached (free tier). Try again shortly.");
                }
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "LLM request failed: " + e.getStatusText());
            } catch (Exception e) {
                throw new ResponseStatusException(HttpStatus.BAD_GATEWAY,
                        "LLM request failed: " + e.getMessage());
            }
        }
    }

    /** Google's RetryInfo ("Please retry in 34.5s") in millis, or -1 when not present. */
    private static long serverRetryDelayMillis(RestClientResponseException e) {
        try {
            var m = java.util.regex.Pattern.compile("retry in ([0-9.]+)s")
                    .matcher(e.getResponseBodyAsString());
            if (m.find()) {
                return (long) (Double.parseDouble(m.group(1)) * 1000);
            }
        } catch (Exception ignored) {
            // no parseable delay
        }
        return -1;
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "LLM call interrupted");
        }
    }

    /** Pulls candidates[0].content.parts[*].text out of a Gemini generateContent response. */
    private static String extractText(JsonNode response) {
        if (response == null) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "empty LLM response");
        }
        JsonNode parts = response.path("candidates").path(0).path("content").path("parts");
        if (!parts.isArray() || parts.isEmpty()) {
            // Most often a safety block or a finishReason other than STOP; surface it.
            String reason = response.path("candidates").path(0).path("finishReason").asText("");
            String promptBlock = response.path("promptFeedback").path("blockReason").asText("");
            String detail = !promptBlock.isBlank() ? "blocked: " + promptBlock
                    : !reason.isBlank() ? "finishReason: " + reason
                    : "no content in LLM response";
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, detail);
        }
        StringBuilder text = new StringBuilder();
        for (JsonNode part : parts) {
            text.append(part.path("text").asText(""));
        }
        return text.toString();
    }
}
