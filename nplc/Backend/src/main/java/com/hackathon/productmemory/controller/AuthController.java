package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.dto.AuthDtos.*;
import com.hackathon.productmemory.security.AuthPrincipal;
import com.hackathon.productmemory.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Tenant login. There are no user accounts: a tenant has one password, shared by everyone
 * working on it, and the token returned here identifies the tenant rather than a person.
 */
@RestController
@RequestMapping("/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public TokenResponse signup(@Valid @RequestBody SignupRequest request) {
        return authService.signup(request);
    }

    @PostMapping("/login")
    public TokenResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    /**
     * Returns a fresh token to a caller who already holds a valid one.
     *
     * <p>Lets a frontend keep an in-use session alive without storing the password: call it
     * on app load and periodically thereafter. Note this endpoint is NOT public - an expired
     * token cannot renew itself, which is what stops a session living forever unattended.
     */
    @PostMapping("/renew")
    public TokenResponse renew(@AuthenticationPrincipal AuthPrincipal principal) {
        return authService.renew(principal.tenantId());
    }
}
