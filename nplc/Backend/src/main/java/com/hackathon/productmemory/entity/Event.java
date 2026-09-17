package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Data
public class Event {
    @Id
    private String id;

    @Column(nullable = false)
    private String sourceId;

    @Column(nullable = false)
    private String eventType; // DECISION | PROPOSAL | CHANGE | ASSUMPTION | DEPENDENCY | OPEN_QUESTION

    @Lob
    @Column(nullable = false)
    private String summary;

    private String decidedBy;

    @Column(nullable = false)
    private String eventDate;

    @Column(nullable = false)
    private String status = "CURRENT"; // CURRENT | SUPERSEDED | UNRESOLVED

    private String supersedesEventId;

    @Column(nullable = false)
    private String confidence = "HIGH"; // HIGH | LOW

    @ElementCollection
    @CollectionTable(name = "affected_items", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "item_name")
    private List<String> affectedItems = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
