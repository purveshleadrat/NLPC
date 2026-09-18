package com.hackathon.productmemory.dto;

import java.util.List;

public class SearchDtos {

    public record SearchResult(
        String id,
        String kind,        // "event" | "source"
        String subType,     // eventType or source type
        String initiativeId,
        String initiativeName,
        String title,
        String snippet,
        String date
    ) {}

    public record SearchResponse(
        List<SearchResult> events,
        List<SearchResult> sources,
        int totalEvents,
        int totalSources
    ) {}
}
