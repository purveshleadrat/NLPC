package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.dto.DecisionDtos.DecisionRequest;
import com.hackathon.productmemory.dto.ExtractionDtos.ExtractResult;
import com.hackathon.productmemory.dto.InsightDtos.*;
import com.hackathon.productmemory.dto.MailDtos.SendMailRequest;
import com.hackathon.productmemory.dto.MailDtos.SendMailResult;
import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.service.DecisionService;
import com.hackathon.productmemory.service.ExtractionService;
import com.hackathon.productmemory.service.InsightService;
import com.hackathon.productmemory.service.MailReportService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * The AI/graph operations for one initiative: extract facts, answer the five questions,
 * write the resume brief, report current scope, and append a decision.
 *
 * <p>All paths are tenant-scoped through the caller's token and the initiative's tenant
 * check inside each service - a foreign initiative id answers 404.
 */
@RestController
@RequestMapping("/initiatives/{id}")
public class InitiativeInsightController {

    private final ExtractionService extractionService;
    private final InsightService insightService;
    private final DecisionService decisionService;
    private final MailReportService mailReportService;

    public InitiativeInsightController(ExtractionService extractionService,
                                       InsightService insightService,
                                       DecisionService decisionService,
                                       MailReportService mailReportService) {
        this.extractionService = extractionService;
        this.insightService = insightService;
        this.decisionService = decisionService;
        this.mailReportService = mailReportService;
    }

    // POST /initiatives/{id}/extract — run extraction on every not-yet-extracted source
    @PostMapping("/extract")
    public ExtractResult extract(@PathVariable String id) {
        return extractionService.extractInitiative(id);
    }

    // POST /initiatives/{id}/ask  body: { "question": "..." }
    @PostMapping("/ask")
    public AskResponse ask(@PathVariable String id, @RequestBody AskRequest request) {
        return insightService.ask(id, request.question());
    }

    // GET /initiatives/{id}/brief — resume brief generated from the graph
    @GetMapping("/brief")
    public BriefResponse brief(@PathVariable String id) {
        return insightService.brief(id);
    }

    // GET /initiatives/{id}/scope — current scope + superseded + open questions (no LLM)
    @GetMapping("/scope")
    public ScopeResponse scope(@PathVariable String id) {
        return insightService.scope(id);
    }

    // POST /initiatives/{id}/decisions — append a decision (+ optional supersede/resolve)
    @PostMapping("/decisions")
    @ResponseStatus(HttpStatus.CREATED)
    public Event addDecision(@PathVariable String id, @RequestBody DecisionRequest request) {
        return decisionService.addDecision(id, request);
    }

    // POST /initiatives/{id}/send-mail  body: { "to": ["a@b.com", ...] }
    // Emails an AI-written progress update (or release note, if the parent ticket is
    // released) over the tenant's SMTP connection.
    @PostMapping("/send-mail")
    public SendMailResult sendMail(@PathVariable String id, @Valid @RequestBody SendMailRequest request) {
        return mailReportService.send(id, request.to());
    }
}
