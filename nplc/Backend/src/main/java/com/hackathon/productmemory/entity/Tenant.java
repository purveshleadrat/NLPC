package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;

import java.time.Instant;

/**
 * The outermost layer of ownership: integration connections and every initiative belong to
 * exactly one tenant, and the tenant is also the unit of login.
 *
 * <p>Deliberately not a {@code @TenantId} entity. Login resolves a tenant from the slug
 * before any tenant context exists, so filtering this table by the very thing it is being
 * queried to establish would make authentication impossible.
 */
@Entity
@Table(name = "tenants")
@Data
public class Tenant {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    /**
     * Supplied at login next to the email, because emails are only unique within a tenant.
     * Effectively immutable once issued - it appears in login forms and bookmarks.
     */
    @Column(nullable = false, unique = true)
    private String slug;

    /**
     * BCrypt hash of the tenant's shared login password.
     *
     * <p>Authentication is tenant-level: there are no user rows, so everyone working on a
     * tenant signs in with the same credential. That means actions cannot be attributed to
     * a person and access cannot be withdrawn from one person without changing it for all.
     */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
