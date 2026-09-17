package com.hackathon.productmemory.service;

import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.entity.InitiativeConnection;
import com.hackathon.productmemory.repository.InitiativeConnectionRepository;
import com.hackathon.productmemory.repository.InitiativeRepository;
import com.hackathon.productmemory.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class InitiativeService {

    private final InitiativeRepository initiativeRepository;
    private final InitiativeConnectionRepository initiativeConnectionRepository;
    private final IntegrationConnectionService connectionService;

    public InitiativeService(InitiativeRepository initiativeRepository,
                             InitiativeConnectionRepository initiativeConnectionRepository,
                             IntegrationConnectionService connectionService) {
        this.initiativeRepository = initiativeRepository;
        this.initiativeConnectionRepository = initiativeConnectionRepository;
        this.connectionService = connectionService;
    }

    @Transactional
    public Initiative create(Initiative initiative) {
        if (initiative.getName() == null || initiative.getName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        if (initiative.getId() == null || initiative.getId().isBlank()) {
            initiative.setId(UUID.randomUUID().toString());
        }
        initiative.setCreatedAt(Instant.now());
        // tenantId is stamped by Hibernate from the tenant in context - deliberately not
        // taken from the request body, which the caller controls.
        return initiativeRepository.save(initiative);
    }

    public List<Initiative> findAll() {
        return initiativeRepository.findAllByOrderByCreatedAtDesc();
    }

    public Initiative getById(String id) {
        Initiative initiative = initiativeRepository.findById(id)
                .orElseThrow(() -> notFound(id));
        // Same explicit tenant check as requireInitiative: a direct fetch by id is exactly
        // the shape an attacker would use to test another tenant's identifiers.
        if (!TenantContext.getTenantId().equals(initiative.getTenantId())) {
            throw notFound(id);
        }
        return initiative;
    }

    /**
     * Every scoped read and write goes through here first.
     *
     * <p>This is the tenant boundary for the whole decision model. {@code initiativeId}
     * arrives as a query parameter on nearly every endpoint, so without a tenant check one
     * tenant could read another's entire timeline simply by quoting its id.
     *
     * <p>The lookup is tenant-filtered twice over: Hibernate restricts the query by the
     * entity's {@code @TenantId}, and the result is checked against the tenant in context.
     * Belt and braces, because the cost of this one being wrong is every other tenant's data.
     *
     * <p>Missing and forbidden both answer 404. A 403 would confirm that an id exists,
     * which is itself worth knowing to someone probing for other tenants' initiatives.
     */
    public String requireInitiative(String initiativeId) {
        if (initiativeId == null || initiativeId.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "initiativeId is required");
        }
        Initiative initiative = initiativeRepository.findById(initiativeId)
                .orElseThrow(() -> notFound(initiativeId));

        if (!TenantContext.getTenantId().equals(initiative.getTenantId())) {
            throw notFound(initiativeId);
        }
        return initiativeId;
    }

    // --- connection bindings ----------------------------------------------------

    /**
     * Binds one of the tenant's connections to an initiative.
     *
     * <p>An initiative routinely spans several repos and more than one Jira project, so
     * these are many-to-many rather than the single jiraKey/repo strings this entity used
     * to carry.
     */
    @Transactional
    public InitiativeConnection bindConnection(String initiativeId, String connectionId, String scopeKey) {
        requireInitiative(initiativeId);
        // Resolves against this tenant's connections only, so a foreign id 404s here.
        connectionService.require(connectionId);

        InitiativeConnection binding = new InitiativeConnection();
        binding.setId(UUID.randomUUID().toString());
        binding.setInitiativeId(initiativeId);
        binding.setConnectionId(connectionId);
        binding.setScopeKey(scopeKey == null ? "" : scopeKey.trim());
        binding.setCreatedAt(Instant.now());
        return initiativeConnectionRepository.save(binding);
    }

    public List<InitiativeConnection> connectionsFor(String initiativeId) {
        return initiativeConnectionRepository.findByInitiativeId(requireInitiative(initiativeId));
    }

    @Transactional
    public void unbindConnection(String initiativeId, String connectionId) {
        requireInitiative(initiativeId);
        initiativeConnectionRepository.deleteByInitiativeIdAndConnectionId(initiativeId, connectionId);
    }

    private static ResponseStatusException notFound(String initiativeId) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "no initiative with id " + initiativeId);
    }
}
