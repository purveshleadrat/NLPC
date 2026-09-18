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
            @NotBlank @Pattern(regexp = "JIRA|GITHUB|SMTP", message = "provider must be JIRA, GITHUB or SMTP")
            String provider,
            @NotBlank String label,
            // Jira/GitHub: the API base URL. SMTP: the mail server host (e.g. smtp.gmail.com).
            @NotBlank String baseUrl,
            // Jira: login email. GitHub: owner/org. SMTP: the From address / login.
            @NotBlank String accountId,
            String repo,
            // SMTP only: the server port (587 STARTTLS by default, 465 for SSL).
            Integer port,
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
