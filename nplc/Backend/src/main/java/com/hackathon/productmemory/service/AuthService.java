package com.hackathon.productmemory.service;

import com.hackathon.productmemory.dto.AuthDtos.*;
import com.hackathon.productmemory.entity.Tenant;
import com.hackathon.productmemory.repository.TenantRepository;
import com.hackathon.productmemory.security.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.UUID;

/**
 * Tenant-level authentication.
 *
 * <p>There are no user accounts. A tenant has one password, shared by everyone working on
 * it, and the token issued here names the tenant. Two consequences are worth stating
 * plainly, because nothing else in the codebase will remind you of them: an action can
 * never be attributed to a person, and access cannot be withdrawn from one person without
 * changing the password for everybody.
 */
@Service
public class AuthService {

    private final TenantRepository tenantRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(TenantRepository tenantRepository,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService) {
        this.tenantRepository = tenantRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public TokenResponse signup(SignupRequest request) {
        String slug = normaliseSlug(request.tenantSlug());
        if (tenantRepository.findBySlug(slug).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "tenant slug already taken");
        }

        Tenant tenant = new Tenant();
        tenant.setId(UUID.randomUUID().toString());
        tenant.setName(request.tenantName());
        tenant.setSlug(slug);
        tenant.setPasswordHash(passwordEncoder.encode(request.password()));
        tenant.setCreatedAt(Instant.now());

        return issueToken(tenantRepository.save(tenant));
    }

    public TokenResponse login(LoginRequest request) {
        // One message for both failures. Saying "no such tenant" separately from "wrong
        // password" would let anyone enumerate which tenants exist.
        Tenant tenant = tenantRepository.findBySlug(normaliseSlug(request.tenantSlug()))
                .orElseThrow(AuthService::invalidCredentials);

        if (!passwordEncoder.matches(request.password(), tenant.getPasswordHash())) {
            throw invalidCredentials();
        }

        return issueToken(tenant);
    }

    /**
     * Exchanges a still-valid token for a fresh one, so an active session never expires.
     *
     * <p>This is not a refresh token, and deliberately so: a refresh token exists to let one
     * person's session be revoked while access tokens stay short-lived, and with a single
     * shared tenant credential there are no separate sessions to revoke. It would be a table
     * and an endpoint to arrive at the same place a longer expiry already reaches.
     *
     * <p>What it does buy: the caller must present a token that has not yet expired, so an
     * abandoned session still dies on its own rather than being renewable forever.
     */
    public TokenResponse renew(String tenantId) {
        // Re-read rather than trusting the claim: a tenant deleted since the token was
        // issued should not be able to keep minting new ones.
        Tenant tenant = tenantRepository.findById(tenantId)
                .orElseThrow(AuthService::invalidCredentials);
        return issueToken(tenant);
    }

    private TokenResponse issueToken(Tenant tenant) {
        return new TokenResponse(
                jwtService.issueAccessToken(tenant.getId()),
                jwtService.accessTokenTtl().toSeconds(),
                tenant.getId(),
                tenant.getSlug());
    }

    private static String normaliseSlug(String slug) {
        return slug.trim().toLowerCase();
    }

    private static ResponseStatusException invalidCredentials() {
        return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "invalid credentials");
    }
}
