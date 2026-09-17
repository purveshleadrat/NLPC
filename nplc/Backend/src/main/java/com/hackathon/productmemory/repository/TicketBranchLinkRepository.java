package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.TicketBranchLink;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TicketBranchLinkRepository extends JpaRepository<TicketBranchLink, String> {
    // Exact match only, by design - never add a "Containing"/"Like" finder here, so a lookup
    // for "CJ-01" can never resolve to "CJ-011".
    Optional<TicketBranchLink> findByRepoFullNameAndTicketKey(String repoFullName, String ticketKey);
}
