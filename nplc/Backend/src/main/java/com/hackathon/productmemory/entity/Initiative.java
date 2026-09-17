package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.TenantId;

import java.time.Instant;

// One product feature under investigation. Every source, event, constraint and
// contradiction belongs to exactly one initiative, and every initiative belongs to
// exactly one tenant.
//
// The old jiraKey and repo fields are gone: each could hold a single value, and an
// initiative routinely spans several repos and several Jira projects. Those bindings
// now live in InitiativeConnection.
@Entity
@Table(name = "initiatives")
@Data
public class Initiative {
    @Id
    private String id;

    // Stamped on insert and appended to every query by Hibernate - see TenantIdentifierResolver.
    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
