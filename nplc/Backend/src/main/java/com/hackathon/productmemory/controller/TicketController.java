package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.dto.TicketDtos.TicketLookupResponse;
import com.hackathon.productmemory.service.TicketLookupService;
import org.springframework.web.bind.annotation.*;

/**
 * Combines a Jira ticket with the GitHub branch named after it.
 *
 * <p>Scoped to the calling tenant, and resolved across every Jira and repo that tenant has
 * connected. All the work lives in {@link TicketLookupService}; this class used to write
 * to the repository itself, which made it the only controller that could sidestep tenant
 * scoping.
 */
@RestController
@RequestMapping("/tickets")
public class TicketController {

    private final TicketLookupService ticketLookupService;

    public TicketController(TicketLookupService ticketLookupService) {
        this.ticketLookupService = ticketLookupService;
    }

    /**
     * GET /tickets/{key}[?initiativeId=...]
     *
     * <p>Exact-key lookup in both systems, so "CJ-01" never resolves to "CJ-011". Supply
     * {@code initiativeId} to search only the connections bound to that initiative rather
     * than every connection the tenant owns.
     */
    @GetMapping("/{key}")
    public TicketLookupResponse lookup(@PathVariable String key,
                                       @RequestParam(required = false) String initiativeId) {
        return ticketLookupService.lookup(key, initiativeId);
    }
}
