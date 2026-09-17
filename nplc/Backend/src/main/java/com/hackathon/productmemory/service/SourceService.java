package com.hackathon.productmemory.service;

import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.repository.SourceRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SourceService {

    private final SourceRepository sourceRepository;
    private final InitiativeService initiativeService;

    public SourceService(SourceRepository sourceRepository, InitiativeService initiativeService) {
        this.sourceRepository = sourceRepository;
        this.initiativeService = initiativeService;
    }

    public Source create(String initiativeId, Source source) {
        source.setInitiativeId(initiativeService.requireInitiative(initiativeId));
        if (source.getId() == null || source.getId().isBlank()) {
            source.setId(UUID.randomUUID().toString());
        }
        source.setCreatedAt(Instant.now());
        return sourceRepository.save(source);
    }

    public List<Source> findByInitiative(String initiativeId) {
        return sourceRepository.findByInitiativeId(
                initiativeService.requireInitiative(initiativeId));
    }

    public List<Source> findByInitiativeAndType(String initiativeId, String type) {
        return sourceRepository.findByInitiativeIdAndType(
                initiativeService.requireInitiative(initiativeId), type);
    }
}
