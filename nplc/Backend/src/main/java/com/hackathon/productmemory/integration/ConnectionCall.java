package com.hackathon.productmemory.integration;

import com.hackathon.productmemory.entity.IntegrationConnection;

/**
 * The outcome of calling one connection.
 *
 * <p>Fan-out means several upstreams answer one request, and they fail independently. One
 * tenant's expired GitHub token must show up as a failed entry beside the results that
 * did work, rather than turning the whole lookup into a 500 that looks like an outage.
 */
public record ConnectionCall<T>(
        String connectionId,
        String label,
        String provider,
        T data,
        String error
) {
    public static <T> ConnectionCall<T> ok(IntegrationConnection connection, T data) {
        return new ConnectionCall<>(connection.getId(), connection.getLabel(),
                connection.getProvider(), data, null);
    }

    public static <T> ConnectionCall<T> failed(IntegrationConnection connection, String error) {
        return new ConnectionCall<>(connection.getId(), connection.getLabel(),
                connection.getProvider(), null, error);
    }

    public boolean succeeded() {
        return error == null;
    }
}
