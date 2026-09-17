package com.hackathon.productmemory.integration.llm;

/**
 * The one seam between this application and whichever LLM provider is configured.
 *
 * <p>Everything above this interface - extraction, ask, brief - deals only in prompts and
 * text. Swapping Gemini for Claude or OpenAI is a new implementation of this interface and a
 * config change, nothing more. Keep provider-specific request/response shapes below here.
 */
public interface LlmClient {

    /**
     * Sends a system prompt and a user prompt and returns the model's text reply.
     *
     * @param systemPrompt the instruction/role text (rules, output contract)
     * @param userPrompt   the actual content to act on
     * @param jsonMode     when true, ask the provider to return strict JSON (used by
     *                     extraction and brief, which are parsed rather than displayed)
     * @return the model's reply as plain text (a JSON document when {@code jsonMode})
     */
    String generate(String systemPrompt, String userPrompt, boolean jsonMode);
}
