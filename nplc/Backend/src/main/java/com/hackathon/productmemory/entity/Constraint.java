package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.TenantId;
import java.time.Instant;

// Table name is quoted because CONSTRAINTS is a SQL keyword - unquoted it can
// blow up at schema-generation time on Postgres.
@Entity
@Table(name = "\"constraints\"")
@Data
public class Constraint {
    @Id
    private String id;

    // Stamped on insert and appended to every query by Hibernate - see TenantIdentifierResolver.
    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @Column(nullable = false)
    private String initiativeId;

    @Column(nullable = false)
    private String sourceEventId;

    @Column(columnDefinition = "text", nullable = false)
    private String statement;

    @Column(columnDefinition = "text")
    private String reason;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE | LIFTED

    private String liftedByEventId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
