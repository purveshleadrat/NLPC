package com.hackathon.productmemory.dto;

import java.util.List;

public final class TicketDtos {

    private TicketDtos() {
    }

    /**
     * One ticket/branch pairing, resolved through a specific pair of connections.
     *
     * <p>Always reported as a list, even when there is a single hit. A tenant can hold the
     * same ticket key in two Jira sites and a branch of that name in several repos, so a
     * single object could only ever report one of them - and widening an object into a
     * list later would break every caller written against it.
     */
    public record TicketMatch(
            String jiraConnectionId,
            String jiraLabel,
            String githubConnectionId,
            String githubLabel,
            String repoFullName,
            String branchName,
            String status,          // LINKED | MISSING_BRANCH | MISSING_TICKET | NOT_FOUND
            Object jiraTicket,
            Object githubBranch) {
    }

    /** A connection that could not be reached or refused its credential. */
    public record ConnectionError(String connectionId, String label, String provider, String error) {
    }

    public record TicketLookupResponse(
            String ticketKey,
            List<TicketMatch> matches,
            List<ConnectionError> errors) {
    }
}
