package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.service.InitiativeService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// An initiative is the scope every other table hangs off. Create one here first,
// then pass its id as initiativeId on every source/event/constraint/contradiction call.
@RestController
@RequestMapping("/initiatives")
public class InitiativeController {

    private final InitiativeService initiativeService;

    public InitiativeController(InitiativeService initiativeService) {
        this.initiativeService = initiativeService;
    }

    // POST /initiatives  body: { "name": "...", "jiraKey": "...", "repo": "..." }
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Initiative create(@RequestBody Initiative initiative) {
        return initiativeService.create(initiative);
    }

    // GET /initiatives
    @GetMapping
    public List<Initiative> list() {
        return initiativeService.findAll();
    }

    // GET /initiatives/{id}
    @GetMapping("/{id}")
    public Initiative get(@PathVariable String id) {
        return initiativeService.getById(id);
    }
}
