package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

@Entity
@Table(name = "contradictions")
@Data
public class Contradiction {
    @Id
    private String id;

    @Column(nullable = false)
    private String eventIdA;

    @Column(nullable = false)
    private String eventIdB;

    @Lob
    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private boolean resolved = false;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
