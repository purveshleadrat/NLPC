package com.hackathon.productmemory.integration;

import com.hackathon.productmemory.entity.IntegrationConnection;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URISyntaxException;
import java.util.List;
import java.util.Locale;

/**
 * Decides whether a tenant-supplied base URL may be called.
 *
 * <p>Before multi-tenancy these URLs came from this application's own environment. Now a
 * tenant types them in and this server makes the request, which turns an unchecked value
 * into server-side request forgery: a URL pointing at localhost, a private range, or a
 * cloud metadata endpoint would have this service fetch it and hand back the response.
 *
 * <p>An allowlist is used rather than a blocklist of bad addresses, because the blocklist
 * approach loses to DNS names that resolve inward and to redirects.
 */
@Component
public class IntegrationHostPolicy {

    private final List<String> jiraSuffixes;
    private final List<String> githubSuffixes;

    public IntegrationHostPolicy(
            @Value("${integrations.jira.allowed-host-suffixes}") List<String> jiraSuffixes,
            @Value("${integrations.github.allowed-host-suffixes}") List<String> githubSuffixes) {
        this.jiraSuffixes = jiraSuffixes;
        this.githubSuffixes = githubSuffixes;
    }

    /** @return the normalised base URL, or a 400 if it is not one this server may call */
    public String validate(String provider, String baseUrl) {
        URI uri;
        try {
            uri = new URI(baseUrl.trim());
        } catch (URISyntaxException e) {
            throw badUrl("not a valid URL");
        }

        if (!"https".equalsIgnoreCase(uri.getScheme())) {
            throw badUrl("must use https");
        }
        if (uri.getHost() == null) {
            throw badUrl("missing host");
        }
        final String host = uri.getHost().toLowerCase(Locale.ROOT);

        List<String> allowed = IntegrationConnection.PROVIDER_JIRA.equals(provider)
                ? jiraSuffixes
                : githubSuffixes;

        boolean permitted = allowed.stream()
                .map(suffix -> suffix.trim().toLowerCase(Locale.ROOT))
                .anyMatch(suffix -> host.equals(suffix) || host.endsWith(suffix));

        if (!permitted) {
            throw badUrl("host " + host + " is not an allowed " + provider + " host (allowed: " + allowed + ")");
        }

        // Strip any path, query or fragment: only the origin is ever used as a base.
        return uri.getScheme() + "://" + host + (uri.getPort() == -1 ? "" : ":" + uri.getPort());
    }

    private static ResponseStatusException badUrl(String reason) {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "invalid base URL: " + reason);
    }
}
