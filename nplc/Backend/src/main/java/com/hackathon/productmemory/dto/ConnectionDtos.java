package com.hackathon.productmemory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;

public final class ConnectionDtos {

    private ConnectionDtos() {
    }

    /**
     * The secret travels in on create and on rotate, and never travels back out.
     * For Jira it is the API token; for GitHub the personal access token.
     */
    public record CreateConnectionRequest(
            @NotBlank @Pattern(regexp = "JIRA|GITHUB", message = "provider must be JIRA or GITHUB")
            String provider,
            @NotBlank String label,
            @NotBlank String baseUrl,
            @NotBlank String accountId,
            String repo,
            @NotBlank String secret) {
    }

    public record RotateSecretRequest(@NotBlank String secret) {
    }

    /**
     * Note the absence of the secret, in any form.
     *
     * <p>Every user in a tenant has the same permissions, so a readable token - even a
     * masked one that leaks its length - would be a token any member could take. Use of a
     * connection and sight of its credentials are separate things.
     */
    public record ConnectionResponse(
            String id,
            String provider,
            String label,
            String baseUrl,
            String accountId,
            String repo,
            String status,
            String lastError,
            Instant createdAt) {
    }
}
