package com.hackathon.productmemory.integration;

import com.hackathon.productmemory.entity.IntegrationConnection;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Builds the HTTP client for one connection.
 *
 * <p>The controllers used to hold a single RestClient built at startup from this
 * application's own environment variables. That cannot express per-tenant credentials at
 * all, so clients are now built per connection and cached by connection id.
 *
 * <p>Timeouts are not optional here. A tenant with several Jira sites and repos produces
 * one outbound call per connection on a single request; without a deadline, one
 * unreachable host holds a worker thread until the socket gives up and takes the service
 * down with it.
 */
@Component
public class ConnectionClients {

    private final Map<String, CachedClient> cache = new ConcurrentHashMap<>();
    private final SecretCipher cipher;
    private final Duration connectTimeout;
    private final Duration readTimeout;

    public ConnectionClients(SecretCipher cipher,
                             @Value("${integrations.connect-timeout}") Duration connectTimeout,
                             @Value("${integrations.read-timeout}") Duration readTimeout) {
        this.cipher = cipher;
        this.connectTimeout = connectTimeout;
        this.readTimeout = readTimeout;
    }

    public RestClient forConnection(IntegrationConnection connection) {
        CachedClient cached = cache.compute(connection.getId(), (id, existing) ->
                existing != null && existing.matches(connection)
                        ? existing
                        : new CachedClient(fingerprint(connection), build(connection)));
        return cached.client();
    }

    /** Drops a cached client so a rotated token is not kept in use after an update. */
    public void invalidate(String connectionId) {
        cache.remove(connectionId);
    }

    /**
     * An unauthenticated client against a base URL, with the same timeouts as the rest.
     * Used for public probes made before a connection exists - e.g. reading a Jira site's
     * serverInfo to learn its canonical {@code *.atlassian.net} address. Not cached: these
     * calls are one-shot and carry no credential worth keeping.
     */
    public RestClient anonymous(String baseUrl) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) connectTimeout.toMillis());
        requestFactory.setReadTimeout((int) readTimeout.toMillis());
        return RestClient.builder()
                .requestFactory(requestFactory)
                .baseUrl(baseUrl)
                .build();
    }

    private RestClient build(IntegrationConnection connection) {
        String secret = cipher.decrypt(connection.getSecretCiphertext());

        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) connectTimeout.toMillis());
        requestFactory.setReadTimeout((int) readTimeout.toMillis());

        RestClient.Builder builder = RestClient.builder()
                .requestFactory(requestFactory)
                .baseUrl(connection.getBaseUrl());

        if (connection.isJira()) {
            // Jira Cloud: Basic auth over the account email and an API token. The email is
            // a credential component belonging to the tenant, not a user of this app.
            String credentials = connection.getAccountId() + ":" + secret;
            String encoded = Base64.getEncoder()
                    .encodeToString(credentials.getBytes(StandardCharsets.UTF_8));
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Basic " + encoded);
        } else {
            builder.defaultHeader(HttpHeaders.AUTHORIZATION, "Bearer " + secret)
                    .defaultHeader(HttpHeaders.ACCEPT, "application/vnd.github+json")
                    .defaultHeader("X-GitHub-Api-Version", "2022-11-28");
        }

        return builder.build();
    }

    /** Changes to any of these mean the cached client is stale and must be rebuilt. */
    private static String fingerprint(IntegrationConnection connection) {
        return connection.getBaseUrl() + "|" + connection.getAccountId()
                + "|" + connection.getSecretCiphertext();
    }

    private record CachedClient(String fingerprint, RestClient client) {
        boolean matches(IntegrationConnection connection) {
            return fingerprint.equals(ConnectionClients.fingerprint(connection));
        }
    }
}
