package com.hackathon.productmemory.service;

import com.hackathon.productmemory.dto.TicketDtos.*;
import com.hackathon.productmemory.entity.IntegrationConnection;
import com.hackathon.productmemory.entity.TicketBranchLink;
import com.hackathon.productmemory.integration.ConnectionCall;
import com.hackathon.productmemory.integration.GitHubClient;
import com.hackathon.productmemory.integration.JiraClient;
import com.hackathon.productmemory.repository.TicketBranchLinkRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Pairs a Jira ticket with the GitHub branch named after it, across every connection a
 * tenant has.
 *
 * <p>The single-tenant version asked one Jira and one repo and produced one verdict. A
 * tenant now has several of each, so the question "does this ticket have a branch" has as
 * many answers as it has repos, and the result is a list.
 *
 * <p>Logic moved out of the controller because the controller was writing to the
 * repository directly - the one place in the codebase that bypassed the service layer,
 * and therefore the one place where tenant scoping could be forgotten.
 */
@Service
public class TicketLookupService {

    public static final String LINKED = "LINKED";
    public static final String MISSING_BRANCH = "MISSING_BRANCH";
    public static final String MISSING_TICKET = "MISSING_TICKET";
    public static final String NOT_FOUND = "NOT_FOUND";

    private final IntegrationConnectionService connectionService;
    private final JiraClient jiraClient;
    private final GitHubClient gitHubClient;
    private final TicketBranchLinkRepository linkRepository;

    public TicketLookupService(IntegrationConnectionService connectionService,
                               JiraClient jiraClient,
                               GitHubClient gitHubClient,
                               TicketBranchLinkRepository linkRepository) {
        this.connectionService = connectionService;
        this.jiraClient = jiraClient;
        this.gitHubClient = gitHubClient;
        this.linkRepository = linkRepository;
    }

    /**
     * @param initiativeId optional - narrows the search to the connections bound to one
     *                     initiative instead of every connection the tenant owns
     */
    @Transactional
    public TicketLookupResponse lookup(String ticketKey, String initiativeId) {
        List<IntegrationConnection> jiraConnections = resolve(initiativeId, IntegrationConnection.PROVIDER_JIRA);
        List<IntegrationConnection> githubConnections = resolve(initiativeId, IntegrationConnection.PROVIDER_GITHUB);

        List<ConnectionCall<Object>> jiraResults = connectionService.fanOut(
                jiraConnections, connection -> jiraClient.findIssue(connection, ticketKey).orElse(null));

        List<ConnectionCall<GitHubClient.MatchedBranch>> branchResults = connectionService.fanOut(
                githubConnections, connection -> gitHubClient.findBranchByConvention(connection, ticketKey).orElse(null));

        List<ConnectionError> errors = new ArrayList<>();
        collectErrors(jiraResults, errors);
        collectErrors(branchResults, errors);

        List<ConnectionCall<Object>> ticketHits = jiraResults.stream()
                .filter(result -> result.succeeded() && result.data() != null)
                .toList();

        List<TicketMatch> matches = new ArrayList<>();

        for (ConnectionCall<GitHubClient.MatchedBranch> branchResult : branchResults) {
            if (!branchResult.succeeded()) {
                continue; // already reported in errors; no verdict can be drawn from it
            }
            IntegrationConnection github = connectionService.require(branchResult.connectionId());
            GitHubClient.MatchedBranch branch = branchResult.data();

            if (ticketHits.isEmpty()) {
                // No Jira holds this key. A branch without a ticket is still worth reporting.
                matches.add(record(null, github, branch, ticketKey, branch == null ? NOT_FOUND : MISSING_TICKET, null));
            } else {
                for (ConnectionCall<Object> ticketHit : ticketHits) {
                    String status = branch == null ? MISSING_BRANCH : LINKED;
                    matches.add(record(ticketHit, github, branch, ticketKey, status, ticketHit.data()));
                }
            }
        }

        // A tenant with Jira connected but no repos yet still gets a useful answer.
        if (githubConnections.isEmpty()) {
            for (ConnectionCall<Object> ticketHit : ticketHits) {
                matches.add(new TicketMatch(
                        ticketHit.connectionId(), ticketHit.label(),
                        null, null, null, null,
                        MISSING_BRANCH, ticketHit.data(), null));
            }
        }

        return new TicketLookupResponse(ticketKey, matches, errors);
    }

    /** Builds one match and persists it, so the pairing has history when an upstream is down. */
    private TicketMatch record(ConnectionCall<Object> ticketHit,
                               IntegrationConnection github,
                               GitHubClient.MatchedBranch branch,
                               String ticketKey,
                               String status,
                               Object ticketPayload) {
        String jiraConnectionId = ticketHit == null ? "" : ticketHit.connectionId();
        String repoFullName = github.repoFullName();
        String branchName = branch == null ? ticketKey : branch.name();

        TicketBranchLink link = linkRepository
                .findByGithubConnectionIdAndRepoFullNameAndTicketKey(github.getId(), repoFullName, ticketKey)
                .orElseGet(TicketBranchLink::new);
        if (link.getId() == null) {
            link.setId(UUID.randomUUID().toString());
            link.setTicketKey(ticketKey);
            link.setRepoFullName(repoFullName);
            link.setCreatedAt(Instant.now());
        }
        link.setJiraConnectionId(jiraConnectionId);
        link.setGithubConnectionId(github.getId());
        link.setBranchName(branchName);
        link.setStatus(status);
        link.setLastCheckedAt(Instant.now());
        linkRepository.save(link);

        return new TicketMatch(
                jiraConnectionId,
                ticketHit == null ? null : ticketHit.label(),
                github.getId(),
                github.getLabel(),
                repoFullName,
                branch == null ? null : branch.name(),
                status,
                ticketPayload,
                branch == null ? null : branch.payload());
    }

    private List<IntegrationConnection> resolve(String initiativeId, String provider) {
        return initiativeId == null
                ? connectionService.byProvider(provider)
                : connectionService.forInitiative(initiativeId, provider);
    }

    private static void collectErrors(List<? extends ConnectionCall<?>> results, List<ConnectionError> errors) {
        results.stream()
                .filter(result -> !result.succeeded())
                .map(result -> new ConnectionError(
                        result.connectionId(), result.label(), result.provider(), result.error()))
                .forEach(errors::add);
    }
}
