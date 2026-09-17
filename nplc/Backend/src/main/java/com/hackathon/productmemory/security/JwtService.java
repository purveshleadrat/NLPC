package com.hackathon.productmemory.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

/**
 * Issues and verifies tenant session tokens.
 *
 * <p>The token exists to make the tenant unforgeable. That requirement has nothing to do
 * with users - it is what stops a caller naming someone else's tenant and reading their
 * data, or having this server call Jira and GitHub with their stored credentials.
 *
 * <p>A JWT is signed, not encrypted: anyone holding one can read its claims. Only the
 * tenant id goes in.
 *
 * <p>There is no refresh token. Refresh exists to keep access tokens short-lived and to
 * revoke one person's session; with tenant-level login there are no separate sessions to
 * revoke, so the token is simply long-lived. The consequence is that an issued token
 * remains valid until it expires, even if the tenant password changes.
 */
@Service
public class JwtService {

    private static final String CLAIM_TENANT = "tid";

    private final SecretKey key;
    private final JwtProperties properties;

    public JwtService(JwtProperties properties) {
        if (properties.secret() == null || properties.secret().isBlank()) {
            throw new IllegalStateException(
                    "JWT_SECRET is not set. Without it tokens cannot be signed, and an empty "
                            + "signing key would let anyone mint a token for any tenant.");
        }
        byte[] keyBytes = properties.secret().getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException(
                    "JWT_SECRET must be at least 32 bytes for HS256; got " + keyBytes.length
                            + ". Generate one with: openssl rand -base64 48");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.properties = properties;
    }

    public String issueAccessToken(String tenantId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .id(UUID.randomUUID().toString())
                .subject(tenantId)
                .claim(CLAIM_TENANT, tenantId)
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(properties.accessTokenTtl())))
                .signWith(key)
                .compact();
    }

    /**
     * Verifies the signature and expiry, returning the tenant it describes.
     *
     * @return null when the token is absent, malformed, expired or signed with another key
     */
    public AuthPrincipal parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            String tenantId = claims.get(CLAIM_TENANT, String.class);
            if (tenantId == null || tenantId.isBlank()) {
                return null;
            }
            return new AuthPrincipal(tenantId);
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }

    public Duration accessTokenTtl() {
        return properties.accessTokenTtl();
    }
}
