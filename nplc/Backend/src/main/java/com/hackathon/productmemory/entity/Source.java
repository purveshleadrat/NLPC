package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.TenantId;
import java.time.Instant;

@Entity
@Table(name = "sources")
@Data
public class Source {
    @Id
    private String id;

    // Stamped on insert and appended to every query by Hibernate - see TenantIdentifierResolver.
    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @Column(nullable = false)
    private String initiativeId;

    @Column(nullable = false)
    private String type; // meeting_note | transcript | requirement_doc | ticket | commit | design_ref | release_note

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "text", nullable = false)
    private String rawText;

    @Column(nullable = false)
    private String docDate;

    private String author;
    private String externalRef;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
