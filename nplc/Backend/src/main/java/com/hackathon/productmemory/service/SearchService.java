package com.hackathon.productmemory.service;

import com.hackathon.productmemory.dto.SearchDtos;
import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.repository.EventRepository;
import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.repository.InitiativeRepository;
import com.hackathon.productmemory.repository.SourceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SearchService {

    private static final int MAX_RESULTS = 20;
    private static final int SNIPPET_LEN = 160;

    private final EventRepository eventRepository;
    private final SourceRepository sourceRepository;
    private final InitiativeRepository initiativeRepository;

    public SearchDtos.SearchResponse search(String q) {
        if (q == null || q.isBlank()) {
            return new SearchDtos.SearchResponse(List.of(), List.of(), 0, 0);
        }

        // Build initiative name lookup once
        Map<String, String> nameMap = initiativeRepository.findAll().stream()
            .collect(Collectors.toMap(Initiative::getId, Initiative::getName));

        // Search events
        List<Event> allEvents = eventRepository.searchAcrossTenant(q.trim());
        int totalEvents = allEvents.size();
        List<SearchDtos.SearchResult> eventResults = allEvents.stream()
            .limit(MAX_RESULTS)
            .map(e -> new SearchDtos.SearchResult(
                e.getId(),
                "event",
                e.getEventType(),
                e.getInitiativeId(),
                nameMap.getOrDefault(e.getInitiativeId(), "Unknown"),
                e.getSummary().length() > 100 ? e.getSummary().substring(0, 100) + "…" : e.getSummary(),
                snippet(e.getEvidence()),
                e.getEventDate()
            ))
            .toList();

        // Search sources
        List<Source> allSources = sourceRepository.searchAcrossTenant(q.trim());
        int totalSources = allSources.size();
        List<SearchDtos.SearchResult> sourceResults = allSources.stream()
            .limit(MAX_RESULTS)
            .map(s -> new SearchDtos.SearchResult(
                s.getId(),
                "source",
                s.getType(),
                s.getInitiativeId(),
                nameMap.getOrDefault(s.getInitiativeId(), "Unknown"),
                s.getTitle(),
                snippet(s.getRawText()),
                s.getDocDate()
            ))
            .toList();

        return new SearchDtos.SearchResponse(eventResults, sourceResults, totalEvents, totalSources);
    }

    private String snippet(String text) {
        if (text == null || text.isBlank()) return null;
        String clean = text.replaceAll("\\s+", " ").trim();
        return clean.length() > SNIPPET_LEN ? clean.substring(0, SNIPPET_LEN) + "…" : clean;
    }
}
