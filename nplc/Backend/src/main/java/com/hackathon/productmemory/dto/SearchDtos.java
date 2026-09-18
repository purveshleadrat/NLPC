package com.hackathon.productmemory.dto;

import java.time.Instant;
import java.util.List;

public class SearchDtos {

    public record SearchResult(
            String id,
            String kind,          // "event" | "source"
            String subtype,       // eventType or source type
            String title,
            String snippet,       // short excerpt with match context
            String initiativeId,
            String initiativeName,
            String author,
            String externalRef,
            String eventDate,
            Instant createdAt,
            List<String> affectedItems
    ) {}

    public record SearchResponse(
            String query,
            int total,
            List<SearchResult> results
    ) {}
}
