package com.hackathon.productmemory.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Request and response shapes for /auth. Authentication is tenant-level: there are no users. */
public final class AuthDtos {

    private AuthDtos() {
    }

    /** Creates a tenant and the shared password everyone working on it will use. */
    public record SignupRequest(
            @NotBlank String tenantName,
            @NotBlank @Size(min = 2, max = 60) String tenantSlug,
            @NotBlank @Size(min = 8, max = 200) String password) {
    }

    public record LoginRequest(
            @NotBlank String tenantSlug,
            @NotBlank String password) {
    }

    /**
     * No refresh token: with nothing to distinguish one session from another there is
     * nothing to rotate or revoke, so the access token is simply long-lived.
     */
    public record TokenResponse(
            String accessToken,
            long expiresInSeconds,
            String tenantId,
            String tenantSlug) {
    }
}
