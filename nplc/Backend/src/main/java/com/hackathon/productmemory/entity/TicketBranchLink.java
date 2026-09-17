package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.TenantId;

import java.time.Instant;

// Links a Jira ticket key to its matching GitHub branch (same name by convention),
// persisted so a lookup has history even when Jira/GitHub are briefly unreachable.
//
// The pairing is now recorded against the specific connections it was resolved through:
// a tenant can have the same ticket key in two Jira sites, or a repo of the same name
// under two GitHub accounts, and those are different facts.
@Entity
@Table(
        name = "ticket_branch_links",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_ticket_branch_link",
                columnNames = {"tenant_id", "github_connection_id", "repo_full_name", "ticket_key"})
)
@Data
public class TicketBranchLink {
    @Id
    private String id;

    // Stamped on insert and appended to every query by Hibernate - see TenantIdentifierResolver.
    @TenantId
    @Column(name = "tenant_id", nullable = false, updatable = false)
    private String tenantId;

    @Column(name = "jira_connection_id", nullable = false)
    private String jiraConnectionId;

    @Column(name = "github_connection_id", nullable = false)
    private String githubConnectionId;

    // Exact Jira ticket key, e.g. "CJ-01" - looked up and stored verbatim, never as a substring
    @Column(name = "ticket_key", nullable = false, updatable = false)
    private String ticketKey;

    // "owner/repo"
    @Column(name = "repo_full_name", nullable = false, updatable = false)
    private String repoFullName;

    // GitHub branch name - the ticket key itself, or a prefixed form such as "feature/CJ-01"
    @Column(name = "branch_name", nullable = false)
    private String branchName;

    @Column(name = "branch_sha")
    private String branchSha;

    @Column(nullable = false)
    private String status = "PENDING"; // LINKED | MISSING_BRANCH | MISSING_TICKET | NOT_FOUND

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "last_checked_at")
    private Instant lastCheckedAt;
}
