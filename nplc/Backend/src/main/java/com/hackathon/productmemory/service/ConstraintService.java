package com.hackathon.productmemory.service;

import com.hackathon.productmemory.entity.Constraint;
import com.hackathon.productmemory.repository.ConstraintRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class ConstraintService {

    private final ConstraintRepository constraintRepository;
    private final InitiativeService initiativeService;

    public ConstraintService(ConstraintRepository constraintRepository,
                             InitiativeService initiativeService) {
        this.constraintRepository = constraintRepository;
        this.initiativeService = initiativeService;
    }

    public Constraint create(String initiativeId, Constraint constraint) {
        constraint.setInitiativeId(initiativeService.requireInitiative(initiativeId));
        if (constraint.getId() == null || constraint.getId().isBlank()) {
            constraint.setId(UUID.randomUUID().toString());
        }
        constraint.setCreatedAt(Instant.now());
        return constraintRepository.save(constraint);
    }

    public List<Constraint> findByInitiative(String initiativeId) {
        if (initiativeId == null || initiativeId.isBlank()) {
            return constraintRepository.findAll();
        }
        return constraintRepository.findByInitiativeId(
                initiativeService.requireInitiative(initiativeId));
    }

    public List<Constraint> findByInitiativeAndStatus(String initiativeId, String status) {
        if (initiativeId == null || initiativeId.isBlank()) {
            return constraintRepository.findAll().stream().filter(c -> status.equalsIgnoreCase(c.getStatus())).toList();
        }
        return constraintRepository.findByInitiativeIdAndStatus(
                initiativeService.requireInitiative(initiativeId), status);
    }
}
