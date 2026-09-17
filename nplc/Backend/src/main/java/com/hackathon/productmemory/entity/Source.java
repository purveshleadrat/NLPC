package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

@Entity
@Table(name = "sources")
@Data
public class Source {
    @Id
    private String id;

    @Column(nullable = false)
    private String type; // meeting_note | transcript | requirement_doc | ticket | commit | design_ref | release_note

    @Column(nullable = false)
    private String title;

    @Lob
    @Column(nullable = false)
    private String rawText;

    @Column(nullable = false)
    private String docDate;

    private String author;
    private String externalRef;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();
}
