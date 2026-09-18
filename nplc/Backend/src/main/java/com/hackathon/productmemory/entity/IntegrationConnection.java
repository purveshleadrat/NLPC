package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.TenantId;

import java.time.Instant;

/**
 * One Jira site or one GitHub repo that a tenant has connected.
 *
 * <p>A tenant may hold any number of these - several Jira sandboxes, several repos - so
 * there is no one-row-per-provider constraint. They are shared service accounts in the
 * SMTP sense: the organisation configures them once, every user in the tenant may use
 * them, and {@code accountId} is a credential component rather than a link to a
 * {@link User}.
 *
 * <p>{@code secretCiphertext} is write-only. It is never returned by any endpoint, not
 * even masked, because every user has the same permissions - so a readable token would be
 * a token every member of the tenant could exfiltrate.
 */
@Entity
@Table(
        name = "integration_connections",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_connection_identity",
                columnNames = {"tenant_id", "provider", "base_url", "account_id", "repo"})
)
@Data
public class IntegrationConnection {

    public static final String PROVIDER_JIRA = "JIRA";
    public static final String PROVIDER_GITHUB = "GITHUB";
    public static final String PROVIDER_SMTP = "SMTP";

    public static final String STATUS_UNVERIFIED = "UNVERIFIED";
    public static final String STATUS_OK = "OK";
    public static final String STATUS_UNAUTHORIZED = "UNAUTHORIZED";
    public static final String STATUS_ERROR = "ERROR";

    @Id
    private String id;

    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @Column(nullable = false, updatable = false)
    private String provider;

    /** Human label, so a tenant with four repos can tell them apart in the UI. */
    @Column(nullable = false)
    private String label;

    @Column(name = "base_url", nullable = false)
    private String baseUrl;

    /** Jira: the login email. GitHub: the owner/org. Not a user of this application. */
    @Column(name = "account_id", nullable = false)
    private String accountId;

    /** GitHub only. Empty string for Jira - not null, so the unique constraint still applies. */
    @Column(nullable = false)
    private String repo = "";

    @Column(name = "secret_ciphertext", columnDefinition = "text", nullable = false)
    private String secretCiphertext;

    /** Lets the encryption key be rotated later without having to guess which key encrypted what. */
    @Column(name = "key_version", nullable = false)
    private int keyVersion = 1;

    @Column(nullable = false)
    private String status = STATUS_UNVERIFIED;

    /** Last upstream failure, so an expired token surfaces as a bad connection, not a broken app. */
    @Column(name = "last_error", columnDefinition = "text")
    private String lastError;

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Transient
    public boolean isJira() {
        return PROVIDER_JIRA.equals(provider);
    }

    @Transient
    public boolean isGithub() {
        return PROVIDER_GITHUB.equals(provider);
    }

    @Transient
    public boolean isSmtp() {
        return PROVIDER_SMTP.equals(provider);
    }

    /** SMTP stores its port in the otherwise-unused repo column; default 587 (STARTTLS). */
    @Transient
    public int smtpPort() {
        try {
            return Integer.parseInt(repo.trim());
        } catch (NumberFormatException e) {
            return 587;
        }
    }

    /** "owner/repo", the form GitHub's REST paths and ticket_branch_links both use. */
    @Transient
    public String repoFullName() {
        return accountId + "/" + repo;
    }
}
