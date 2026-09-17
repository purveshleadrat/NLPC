package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

@Entity
@Table(name = "constraints")
@Data
public class Constraint {
    @Id
    private String id;

    @Column(nullable = false)
    private String sourceEventId;

    @Lob
    @Column(nullable = false)
    private String statement;

    @Lob
    private String reason;

    @Column(nullable = false)
    private String status = "ACTIVE"; // ACTIVE | LIFTED

    private String liftedByEventId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
