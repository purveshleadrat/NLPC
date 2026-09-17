package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

// One product feature under investigation. Every source, event, constraint and
// contradiction belongs to exactly one initiative, so several features can live
// side by side in the same database instead of sharing one global pool.
@Entity
@Table(name = "initiatives")
@Data
public class Initiative {
    @Id
    private String id;

    @Column(nullable = false)
    private String name;

    private String jiraKey;

    private String repo;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
