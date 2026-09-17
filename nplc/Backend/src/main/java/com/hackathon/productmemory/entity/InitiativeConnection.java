package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.TenantId;

import java.time.Instant;

/**
 * Binds an initiative to one of its tenant's connections.
 *
 * <p>An initiative routinely spans more than one repo and more than one Jira - this
 * project alone is split across a Frontend and a Backend - so this is a many-to-many
 * join rather than the single {@code jiraKey} and {@code repo} strings the Initiative
 * entity used to carry.
 */
@Entity
@Table(
        name = "initiative_connections",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_initiative_connection",
                columnNames = {"initiative_id", "connection_id", "scope_key"})
)
@Data
public class InitiativeConnection {

    @Id
    private String id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @Column(name = "initiative_id", nullable = false, updatable = false)
    private String initiativeId;

    @Column(name = "connection_id", nullable = false, updatable = false)
    private String connectionId;

    /**
     * Narrows the initiative within the connection: a Jira project key, or a GitHub
     * branch prefix. Empty string means the whole connection is in scope.
     */
    @Column(name = "scope_key", nullable = false)
    private String scopeKey = "";

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
