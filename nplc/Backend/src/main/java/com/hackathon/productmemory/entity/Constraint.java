package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

// Table name is quoted because CONSTRAINTS is a SQL keyword - unquoted it can
// blow up at schema-generation time on Postgres.
@Entity
@Table(name = "\"constraints\"")
@Data
public class Constraint {
    @Id
    private String id;

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
