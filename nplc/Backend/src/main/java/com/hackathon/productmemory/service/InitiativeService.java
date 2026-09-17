package com.hackathon.productmemory.service;

import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.entity.InitiativeConnection;
import com.hackathon.productmemory.repository.ConstraintRepository;
import com.hackathon.productmemory.repository.ContradictionRepository;
import com.hackathon.productmemory.repository.EventRepository;
import com.hackathon.productmemory.repository.InitiativeConnectionRepository;
import com.hackathon.productmemory.repository.InitiativeRepository;
import com.hackathon.productmemory.repository.SourceRepository;
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
    private final SourceRepository sourceRepository;
    private final EventRepository eventRepository;
    private final ConstraintRepository constraintRepository;
    private final ContradictionRepository contradictionRepository;

    public InitiativeService(InitiativeRepository initiativeRepository,
                             InitiativeConnectionRepository initiativeConnectionRepository,
                             IntegrationConnectionService connectionService,
                             SourceRepository sourceRepository,
                             EventRepository eventRepository,
                             ConstraintRepository constraintRepository,
                             ContradictionRepository contradictionRepository) {
        this.initiativeRepository = initiativeRepository;
        this.initiativeConnectionRepository = initiativeConnectionRepository;
        this.connectionService = connectionService;
        this.sourceRepository = sourceRepository;
        this.eventRepository = eventRepository;
        this.constraintRepository = constraintRepository;
        this.contradictionRepository = contradictionRepository;
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

    @Transactional
    public Initiative rename(String id, String name) {
        if (name == null || name.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "name is required");
        }
        Initiative initiative = getById(id); // tenant-checked
        initiative.setName(name.trim());
        return initiativeRepository.save(initiative);
    }

    /**
     * Deletes an initiative and everything scoped to it. This is the one place history is
     * genuinely removed - the append-only rule protects the timeline within an initiative,
     * not the initiative itself - so it is deliberately explicit and cascades in child-first
     * order. affected_items rows go with their events via the DB's ON DELETE CASCADE.
     */
    @Transactional
    public void delete(String id) {
        Initiative initiative = getById(id); // tenant-checked; 404s for a foreign id
        eventRepository.deleteByInitiativeId(id);
        constraintRepository.deleteByInitiativeId(id);
        contradictionRepository.deleteByInitiativeId(id);
        sourceRepository.deleteByInitiativeId(id);
        initiativeConnectionRepository.deleteByInitiativeId(id);
        initiativeRepository.delete(initiative);
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
