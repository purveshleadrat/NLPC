package com.hackathon.productmemory.service;

import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.repository.InitiativeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class InitiativeService {

    private final InitiativeRepository initiativeRepository;

    public InitiativeService(InitiativeRepository initiativeRepository) {
        this.initiativeRepository = initiativeRepository;
    }

    public Initiative create(Initiative initiative) {
        if (initiative.getName() == null || initiative.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        if (initiative.getId() == null || initiative.getId().isBlank()) {
            initiative.setId(UUID.randomUUID().toString());
        }
        initiative.setCreatedAt(Instant.now());
        return initiativeRepository.save(initiative);
    }

    public List<Initiative> findAll() {
        return initiativeRepository.findAllByOrderByCreatedAtDesc();
    }

    public Initiative getById(String id) {
        return initiativeRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "no initiative with id " + id));
    }

    // Every scoped read and write goes through here first, so a missing or unknown
    // initiativeId fails fast instead of creating or reading orphan rows.
    public String requireInitiative(String initiativeId) {
        if (initiativeId == null || initiativeId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "initiativeId is required");
        }
        if (!initiativeRepository.existsById(initiativeId)) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "no initiative with id " + initiativeId);
        }
        return initiativeId;
    }
}
