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
