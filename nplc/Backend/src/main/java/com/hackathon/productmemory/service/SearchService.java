package com.hackathon.productmemory.service;

import com.hackathon.productmemory.dto.SearchDtos.SearchResponse;
import com.hackathon.productmemory.dto.SearchDtos.SearchResult;
import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.repository.EventRepository;
import com.hackathon.productmemory.repository.InitiativeRepository;
import com.hackathon.productmemory.repository.SourceRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class SearchService {

    private final EventRepository      eventRepository;
    private final SourceRepository     sourceRepository;
    private final InitiativeRepository initiativeRepository;

    public SearchService(EventRepository eventRepository,
                         SourceRepository sourceRepository,
                         InitiativeRepository initiativeRepository) {
        this.eventRepository      = eventRepository;
        this.sourceRepository     = sourceRepository;
        this.initiativeRepository = initiativeRepository;
    }

    public SearchResponse search(String query) {
        String q = query == null ? "" : query.trim();

        // Build initiative name lookup (tenant-scoped by Hibernate automatically)
        Map<String, String> initiativeNames = initiativeRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .collect(Collectors.toMap(Initiative::getId, Initiative::getName));

        List<SearchResult> results = new ArrayList<>();

        // Search events
        List<Event> events = eventRepository.searchAcrossTenant(q);
        for (Event e : events) {
            results.add(new SearchResult(
                    e.getId(),
                    "event",
                    e.getEventType(),
                    e.getSummary(),
                    snippet(e.getEvidence(), q),
                    e.getInitiativeId(),
                    initiativeNames.getOrDefault(e.getInitiativeId(), e.getInitiativeId()),
                    e.getDecidedBy(),
                    null,
                    e.getEventDate(),
                    e.getCreatedAt(),
                    e.getAffectedItems()
            ));
        }

        // Search sources
        List<Source> sources = sourceRepository.searchAcrossTenant(q);
        for (Source s : sources) {
            results.add(new SearchResult(
                    s.getId(),
                    "source",
                    s.getType(),
                    s.getTitle(),
                    snippet(s.getRawText(), q),
                    s.getInitiativeId(),
                    initiativeNames.getOrDefault(s.getInitiativeId(), s.getInitiativeId()),
                    s.getAuthor(),
                    s.getExternalRef(),
                    s.getDocDate(),
                    s.getCreatedAt(),
                    List.of()
            ));
        }

        // Sort: events first, then by createdAt desc
        results.sort((a, b) -> {
            if (!a.kind().equals(b.kind())) return a.kind().equals("event") ? -1 : 1;
            if (a.createdAt() != null && b.createdAt() != null) return b.createdAt().compareTo(a.createdAt());
            return 0;
        });

        return new SearchResponse(q, results.size(), results);
    }

    /** Extract a ~160-char snippet around the first match of q in text. */
    private String snippet(String text, String q) {
        if (text == null || text.isBlank()) return null;
        if (q.isBlank()) return text.length() > 160 ? text.substring(0, 160) + "…" : text;
        int idx = text.toLowerCase().indexOf(q.toLowerCase());
        if (idx == -1) return text.length() > 160 ? text.substring(0, 160) + "…" : text;
        int start = Math.max(0, idx - 60);
        int end   = Math.min(text.length(), idx + q.length() + 100);
        String s = (start > 0 ? "…" : "") + text.substring(start, end) + (end < text.length() ? "…" : "");
        return s;
    }
}
