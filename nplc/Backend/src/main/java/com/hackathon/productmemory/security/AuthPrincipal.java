package com.hackathon.productmemory.security;

/**
 * The authenticated caller: a tenant, taken from a verified token claim.
 *
 * <p>There is no user here. Authentication is tenant-level, so "who is calling" and "which
 * tenant's data is in scope" are the same question.
 *
 * <p>This value is the only trusted source of tenancy for a request. It came out of a
 * signature this server produced, which is what makes it unforgeable - unlike a header or
 * query parameter, which the caller can set to anything.
 */
public record AuthPrincipal(String tenantId) {
}
