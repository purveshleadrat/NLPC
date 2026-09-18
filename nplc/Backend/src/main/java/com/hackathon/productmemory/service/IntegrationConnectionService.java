package com.hackathon.productmemory.service;

import com.hackathon.productmemory.dto.ConnectionDtos.*;
import com.hackathon.productmemory.entity.IntegrationConnection;
import com.hackathon.productmemory.entity.InitiativeConnection;
import com.hackathon.productmemory.integration.ConnectionCall;
import com.hackathon.productmemory.integration.ConnectionClients;
import com.hackathon.productmemory.integration.IntegrationHostPolicy;
import com.hackathon.productmemory.integration.JiraClient;
import com.hackathon.productmemory.integration.SecretCipher;
import com.hackathon.productmemory.repository.InitiativeConnectionRepository;
import com.hackathon.productmemory.repository.IntegrationConnectionRepository;
import com.hackathon.productmemory.tenant.TenantContext;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.Function;

/**
 * Manages a tenant's Jira and GitHub connections, and calls them.
 *
 * <p>Every read here is tenant-filtered by Hibernate through {@code @TenantId}, so
 * {@code findAll()} means this tenant's connections and nothing else.
 */
@Service
public class IntegrationConnectionService {

    /**
     * Shared, bounded pool for fan-out. Every task is capped by the HTTP client's connect
     * and read timeouts, so a dead upstream releases its thread instead of holding it for
     * the life of the request.
     */
    private final ExecutorService fanOutExecutor = Executors.newFixedThreadPool(16, runnable -> {
        Thread thread = new Thread(runnable, "integration-fanout");
        thread.setDaemon(true);
        return thread;
    });

    private final IntegrationConnectionRepository connectionRepository;
    private final InitiativeConnectionRepository initiativeConnectionRepository;
    private final SecretCipher cipher;
    private final IntegrationHostPolicy hostPolicy;
    private final ConnectionClients clients;
    private final JiraClient jiraClient;

    public IntegrationConnectionService(IntegrationConnectionRepository connectionRepository,
                                        InitiativeConnectionRepository initiativeConnectionRepository,
                                        SecretCipher cipher,
                                        IntegrationHostPolicy hostPolicy,
                                        ConnectionClients clients,
                                        JiraClient jiraClient) {
        this.connectionRepository = connectionRepository;
        this.initiativeConnectionRepository = initiativeConnectionRepository;
        this.cipher = cipher;
        this.hostPolicy = hostPolicy;
        this.clients = clients;
        this.jiraClient = jiraClient;
    }

    @Transactional
    public ConnectionResponse create(CreateConnectionRequest request) {
        IntegrationConnection connection = new IntegrationConnection();
        connection.setId(UUID.randomUUID().toString());
        connection.setProvider(request.provider());
        connection.setLabel(request.label());
        if (IntegrationConnection.PROVIDER_SMTP.equals(request.provider())) {
            // SMTP is a mail server host, not an HTTP API - it never goes through the SSRF
            // allowlist or canonicalisation. The port lives in the otherwise-unused repo column.
            connection.setBaseUrl(request.baseUrl().trim());
            connection.setRepo(request.port() == null ? "587" : String.valueOf(request.port()));
        } else {
            // Tenant-supplied, so it is checked before this server will ever call it, then
            // normalised to the canonical API host (see canonicalBaseUrl).
            connection.setBaseUrl(canonicalBaseUrl(request.provider(), request.baseUrl()));
            // Empty string rather than null, so the uniqueness constraint still applies:
            // in Postgres NULLs never conflict with each other.
            connection.setRepo(request.repo() == null ? "" : request.repo().trim());
        }
        connection.setAccountId(request.accountId().trim());
        connection.setSecretCiphertext(cipher.encrypt(request.secret()));
        connection.setKeyVersion(cipher.keyVersion());
        connection.setStatus(IntegrationConnection.STATUS_UNVERIFIED);
        connection.setCreatedAt(Instant.now());

        if (connection.isGithub() && connection.getRepo().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "repo is required for a GITHUB connection");
        }

        return toResponse(connectionRepository.save(connection));
    }

    /**
     * Validates a tenant-supplied base URL against the allowlist, then - for Jira - swaps in
     * the site's canonical {@code *.atlassian.net} address if it differs.
     *
     * <p>An org may enter a custom domain that only serves the Jira UI; the REST API must be
     * called on the canonical host or it returns no data. The canonical URL is re-validated
     * through the same allowlist (a serverInfo response is untrusted input, so it cannot be
     * used to point this server at an internal address). Resolution is best-effort: if the
     * probe fails or the returned URL is not allowed, the validated entry is kept as-is.
     */
    private String canonicalBaseUrl(String provider, String rawBaseUrl) {
        String validated = hostPolicy.validate(provider, rawBaseUrl);
        if (!IntegrationConnection.PROVIDER_JIRA.equals(provider)) {
            return validated;
        }
        return jiraClient.resolveCanonicalBaseUrl(validated)
                .flatMap(canonical -> {
                    try {
                        return java.util.Optional.of(hostPolicy.validate(provider, canonical));
                    } catch (RuntimeException notAllowed) {
                        return java.util.Optional.<String>empty();
                    }
                })
                .orElse(validated);
    }

    public List<ConnectionResponse> list() {
        return connectionRepository.findAll().stream()
                .sorted(Comparator.comparing(IntegrationConnection::getCreatedAt))
                .map(IntegrationConnectionService::toResponse)
                .toList();
    }

    @Transactional
    public ConnectionResponse rotateSecret(String connectionId, RotateSecretRequest request) {
        IntegrationConnection connection = require(connectionId);
        connection.setSecretCiphertext(cipher.encrypt(request.secret()));
        connection.setKeyVersion(cipher.keyVersion());
        connection.setStatus(IntegrationConnection.STATUS_UNVERIFIED);
        connection.setLastError(null);
        IntegrationConnection saved = connectionRepository.save(connection);
        // Otherwise the cached client would keep presenting the token that was just replaced.
        clients.invalidate(connectionId);
        return toResponse(saved);
    }

    @Transactional
    public void delete(String connectionId) {
        IntegrationConnection connection = require(connectionId);
        connectionRepository.delete(connection);
        clients.invalidate(connectionId);
    }

    /**
     * Loads one of this tenant's connections, or 404s.
     *
     * <p>The tenant check here is explicit and load-bearing. Hibernate's {@code @TenantId}
     * restricts derived queries and findAll, but NOT a lookup by primary key: findById
     * goes through the persistence context and returns the row whatever tenant owns it.
     * Verified by test, not assumed - without this check, quoting another tenant's
     * connection id was enough to rotate or delete their Jira and GitHub credentials.
     *
     * <p>404 rather than 403, so the response does not confirm that the id exists.
     */
    public IntegrationConnection require(String connectionId) {
        IntegrationConnection connection = connectionRepository.findById(connectionId)
                .orElseThrow(() -> connectionNotFound(connectionId));

        if (!TenantContext.getTenantId().equals(connection.getTenantId())) {
            throw connectionNotFound(connectionId);
        }
        return connection;
    }

    private static ResponseStatusException connectionNotFound(String connectionId) {
        return new ResponseStatusException(HttpStatus.NOT_FOUND, "no connection with id " + connectionId);
    }

    public List<IntegrationConnection> byProvider(String provider) {
        return connectionRepository.findByProvider(provider);
    }

    /**
     * The connections bound to one initiative, narrowed to a provider.
     *
     * <p>Falls back to every connection the tenant owns when the initiative has no explicit
     * bindings, so an initiative created before connections were attached still resolves.
     */
    public List<IntegrationConnection> forInitiative(String initiativeId, String provider) {
        List<String> boundIds = initiativeConnectionRepository.findByInitiativeId(initiativeId).stream()
                .map(InitiativeConnection::getConnectionId)
                .toList();

        if (boundIds.isEmpty()) {
            return byProvider(provider);
        }

        return connectionRepository.findByIdIn(boundIds).stream()
                .filter(connection -> provider.equals(connection.getProvider()))
                .toList();
    }

    /**
     * Calls every given connection in parallel and collects the outcomes.
     *
     * <p>Failures are captured per connection rather than thrown, so one unreachable Jira
     * site does not discard the answers the others returned.
     *
     * <p>Run in parallel rather than in sequence because the timeouts add up otherwise: a
     * tenant with four connections would wait four read-timeouts for an answer instead of
     * one. The pool is bounded, and every task is bounded by the client's own timeouts, so
     * a slow upstream cannot accumulate threads indefinitely.
     */
    public <T> List<ConnectionCall<T>> fanOut(List<IntegrationConnection> connections,
                                              Function<IntegrationConnection, T> call) {
        if (connections.isEmpty()) {
            return List.of();
        }

        Map<IntegrationConnection, Future<T>> futures = new LinkedHashMap<>();
        for (IntegrationConnection connection : connections) {
            futures.put(connection, fanOutExecutor.submit(() -> call.apply(connection)));
        }

        return futures.entrySet().stream()
                .map(entry -> {
                    IntegrationConnection connection = entry.getKey();
                    try {
                        return ConnectionCall.ok(connection, entry.getValue().get());
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        return ConnectionCall.<T>failed(connection, "INTERRUPTED");
                    } catch (Exception e) {
                        return ConnectionCall.<T>failed(connection, describe(e));
                    }
                })
                .toList();
    }

    /** Turns an upstream failure into something a tenant can act on. */
    private static String describe(Exception e) {
        Throwable cause = e.getCause() == null ? e : e.getCause();
        if (cause instanceof HttpClientErrorException.Unauthorized) {
            return "UNAUTHORIZED - the stored credential was rejected; rotate it";
        }
        if (cause instanceof HttpClientErrorException.Forbidden) {
            return "FORBIDDEN - the credential lacks access, or the rate limit is exhausted";
        }
        if (cause instanceof ResourceAccessException) {
            return "UNREACHABLE - timed out or could not connect";
        }
        return cause.getClass().getSimpleName() + ": " + cause.getMessage();
    }

    /** Deliberately omits the secret in every form - see ConnectionResponse. */
    private static ConnectionResponse toResponse(IntegrationConnection connection) {
        return new ConnectionResponse(
                connection.getId(),
                connection.getProvider(),
                connection.getLabel(),
                connection.getBaseUrl(),
                connection.getAccountId(),
                connection.getRepo(),
                connection.getStatus(),
                connection.getLastError(),
                connection.getCreatedAt());
    }
}
