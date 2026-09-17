package com.hackathon.productmemory.service;

import com.hackathon.productmemory.entity.Contradiction;
import com.hackathon.productmemory.repository.ContradictionRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ContradictionService {

    private final ContradictionRepository contradictionRepository;
    private final InitiativeService initiativeService;

    public ContradictionService(ContradictionRepository contradictionRepository,
                                InitiativeService initiativeService) {
        this.contradictionRepository = contradictionRepository;
        this.initiativeService = initiativeService;
    }

    public Contradiction create(String initiativeId, Contradiction contradiction) {
        contradiction.setInitiativeId(initiativeService.requireInitiative(initiativeId));
        if (contradiction.getId() == null || contradiction.getId().isBlank()) {
            contradiction.setId(UUID.randomUUID().toString());
        }
        contradiction.setCreatedAt(Instant.now());
        return contradictionRepository.save(contradiction);
    }

    public List<Contradiction> findByInitiative(String initiativeId) {
        return contradictionRepository.findByInitiativeId(
                initiativeService.requireInitiative(initiativeId));
    }

    public List<Contradiction> findUnresolvedByInitiative(String initiativeId) {
        return contradictionRepository.findByInitiativeIdAndResolvedFalse(
                initiativeService.requireInitiative(initiativeId));
    }
}
