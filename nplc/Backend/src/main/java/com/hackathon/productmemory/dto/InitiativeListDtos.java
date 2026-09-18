package com.hackathon.productmemory.dto;

import java.time.Instant;
import java.util.List;

/** Request/response shapes for the paginated, pre-aggregated Initiatives list view. */
public final class InitiativeListDtos {

    private InitiativeListDtos() {
    }

    public record InitiativeListItem(
            String id,
            String name,
            String description,
            String priority,
            Instant createdAt,
            String scopeLabel,
            long ticketCount,
            long commitCount,
            long openCount,
            Instant lastUpdated) {
    }

    public record InitiativeListPage(
            List<InitiativeListItem> content,
            long totalElements,
            int totalPages,
            int page,
            int size) {
    }
}
