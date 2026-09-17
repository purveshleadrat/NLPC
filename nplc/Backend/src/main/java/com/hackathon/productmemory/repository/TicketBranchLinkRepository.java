package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.TicketBranchLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketBranchLinkRepository extends JpaRepository<TicketBranchLink, String> {
    // Exact match only, by design - never add a "Containing"/"Like" finder here, so a lookup
    // for "CJ-01" can never resolve to "CJ-011".
    //
    // Keyed by connection as well as repo: one tenant can hold the same repo name under two
    // GitHub accounts, and those are separate pairings rather than one row overwriting another.
    Optional<TicketBranchLink> findByGithubConnectionIdAndRepoFullNameAndTicketKey(
            String githubConnectionId, String repoFullName, String ticketKey);

    List<TicketBranchLink> findByTicketKey(String ticketKey);
}
