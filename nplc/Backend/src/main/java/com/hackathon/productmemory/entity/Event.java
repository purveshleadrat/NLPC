package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.TenantId;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Data
public class Event {
    @Id
    private String id;

    // Stamped on insert and appended to every query by Hibernate - see TenantIdentifierResolver.
    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @Column(nullable = false)
    private String initiativeId;

    @Column(nullable = false)
    private String sourceId;

    @Column(nullable = false)
    private String eventType; // DECISION | PROPOSAL | CHANGE | ASSUMPTION | DEPENDENCY | OPEN_QUESTION

    @Column(columnDefinition = "text", nullable = false)
    private String summary;

    private String decidedBy;

    @Column(nullable = false)
    private String eventDate;

    @Column(nullable = false)
    private String status = "CURRENT"; // CURRENT | SUPERSEDED | UNRESOLVED

    private String supersedesEventId;

    @Column(nullable = false)
    private String confidence = "HIGH"; // HIGH | LOW

    // Fetched eagerly because open-in-view is off: the session is closed by the time
    // Jackson serialises the response, so a lazy collection fails with
    // "could not initialize proxy - no Session" on every read that has affected items.
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "affected_items", joinColumns = @JoinColumn(name = "event_id"))
    @Column(name = "item_name")
    private List<String> affectedItems = new ArrayList<>();

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
