package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.TenantId;
import java.time.Instant;

@Entity
@Table(name = "contradictions")
@Data
public class Contradiction {
    @Id
    private String id;

    // Stamped on insert and appended to every query by Hibernate - see TenantIdentifierResolver.
    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @Column(nullable = false)
    private String initiativeId;

    @Column(nullable = false)
    private String eventIdA;

    @Column(nullable = false)
    private String eventIdB;

    @Column(columnDefinition = "text", nullable = false)
    private String description;

    @Column(nullable = false)
    private boolean resolved = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
