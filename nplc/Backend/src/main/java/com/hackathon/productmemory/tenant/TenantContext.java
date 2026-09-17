package com.hackathon.productmemory.tenant;

/**
 * The tenant owning the current request.
 *
 * <p>Populated by {@code JwtAuthenticationFilter} from a claim inside the signed token,
 * never from a header, query parameter or body field. A client-supplied tenant id would
 * let any authenticated user read another tenant's data - and, because integration
 * credentials are resolved from the same id, drive this server's outbound calls with
 * another tenant's Jira and GitHub tokens.
 *
 * <p>The value lives in a ThreadLocal, so {@link #clear()} in a finally block is not
 * optional: Tomcat reuses worker threads, and a leaked value means the next request on
 * that thread runs as the previous request's tenant.
 */
public final class TenantContext {

    /**
     * Returned when no tenant has been resolved. Hibernate rejects a null tenant
     * identifier, and a sentinel that matches no row is the safe failure mode - an
     * unresolved request sees nothing rather than seeing everything.
     */
    public static final String UNRESOLVED = "__unresolved__";

    private static final ThreadLocal<String> CURRENT = new ThreadLocal<>();

    private TenantContext() {
    }

    public static void set(String tenantId) {
        CURRENT.set(tenantId);
    }

    /** The current tenant id, or {@link #UNRESOLVED} outside an authenticated request. */
    public static String getTenantId() {
        String tenantId = CURRENT.get();
        return tenantId == null ? UNRESOLVED : tenantId;
    }

    public static boolean isResolved() {
        return CURRENT.get() != null;
    }

    /**
     * The tenant id, or a failure if none was resolved. Call this from anything that
     * writes data, so a missing tenant fails loudly instead of being stamped with the
     * sentinel and becoming an orphan row.
     */
    public static String require() {
        String tenantId = CURRENT.get();
        if (tenantId == null) {
            throw new IllegalStateException("no tenant in context - request reached tenant-scoped code unauthenticated");
        }
        return tenantId;
    }

    public static void clear() {
        CURRENT.remove();
    }
}
