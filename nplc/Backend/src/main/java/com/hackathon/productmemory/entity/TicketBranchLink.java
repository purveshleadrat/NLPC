package com.hackathon.productmemory.entity;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

// Links a Jira ticket key to its matching GitHub branch (same name by convention), persisted
// in Supabase so a lookup has history even when Jira/GitHub are briefly unreachable.
@Entity
@Table(
        name = "ticket_branch_links",
        uniqueConstraints = @UniqueConstraint(columnNames = {"repo_full_name", "ticket_key"})
)
@Data
public class TicketBranchLink {
    @Id
    private String id;

    // Exact Jira ticket key, e.g. "CJ-01" - looked up and stored verbatim, never as a substring
    @Column(name = "ticket_key", nullable = false, updatable = false)
    private String ticketKey;

    // "owner/repo"
    @Column(name = "repo_full_name", nullable = false, updatable = false)
    private String repoFullName;

    // GitHub branch name - kept identical to ticketKey by convention
    @Column(name = "branch_name", nullable = false)
    private String branchName;

    private String branchSha;

    @Column(nullable = false)
    private String status = "PENDING"; // LINKED | MISSING_BRANCH | MISSING_TICKET | NOT_FOUND

    @Column(nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    private Instant lastCheckedAt;
}
