package com.hackathon.productmemory.security;

import com.hackathon.productmemory.tenant.TenantContext;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Establishes both the authenticated user and the tenant for a request.
 *
 * <p>The tenant comes from a claim inside the verified token and from nowhere else. If a
 * caller also sends an X-Tenant-Id header it is treated as an assertion to check, not as
 * a source: a mismatch is rejected outright rather than quietly preferring one of them.
 */
@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** Optional, and only ever verified against the token - never trusted on its own. */
    public static final String TENANT_HEADER = "X-Tenant-Id";

    private final JwtService jwtService;

    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        try {
            AuthPrincipal principal = authenticate(request);
            if (principal != null) {
                String asserted = request.getHeader(TENANT_HEADER);
                if (asserted != null && !asserted.equals(principal.tenantId())) {
                    // Someone is presenting one tenant's token while asking for another's data.
                    response.sendError(HttpStatus.FORBIDDEN.value(), "tenant mismatch");
                    return;
                }

                TenantContext.set(principal.tenantId());
                // One authority for everyone: authentication is tenant-level and there are
                // no roles, so this only marks the request as authenticated.
                var authentication = new UsernamePasswordAuthenticationToken(
                        principal, null, List.of(new SimpleGrantedAuthority("ROLE_TENANT")));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            }

            chain.doFilter(request, response);
        } finally {
            // Tomcat reuses worker threads. Without this, the next request handled by this
            // thread would inherit the previous request's tenant.
            TenantContext.clear();
            SecurityContextHolder.clearContext();
        }
    }

    private AuthPrincipal authenticate(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            return null;
        }
        return jwtService.parse(header.substring("Bearer ".length()).trim());
    }
}
