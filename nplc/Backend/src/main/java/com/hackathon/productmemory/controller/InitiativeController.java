package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.entity.InitiativeConnection;
import com.hackathon.productmemory.service.InitiativeService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// An initiative is the scope every other table hangs off. Create one here first,
// then pass its id as initiativeId on every source/event/constraint/contradiction call.
//
// The tenant is never a parameter here: it comes from the caller's token, and an
// initiative belonging to another tenant answers 404 rather than 403.
@RestController
@RequestMapping("/initiatives")
public class InitiativeController {

    private final InitiativeService initiativeService;

    public InitiativeController(InitiativeService initiativeService) {
        this.initiativeService = initiativeService;
    }

    // POST /initiatives  body: { "name": "..." }
    // jiraKey and repo are gone: an initiative spans several Jiras and repos, which are
    // attached through POST /initiatives/{id}/connections instead.
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

    // PUT /initiatives/{id}  body: { "name": "..." } — rename
    @PutMapping("/{id}")
    public Initiative rename(@PathVariable String id, @RequestBody Initiative body) {
        return initiativeService.rename(id, body.getName());
    }

    // DELETE /initiatives/{id} — removes the initiative and everything scoped to it
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        initiativeService.delete(id);
    }

    // GET /initiatives/{id}/connections
    @GetMapping("/{id}/connections")
    public List<InitiativeConnection> connections(@PathVariable String id) {
        return initiativeService.connectionsFor(id);
    }

    // POST /initiatives/{id}/connections?connectionId=...[&scopeKey=CJ]
    // scopeKey narrows the initiative within the connection: a Jira project key, or a
    // GitHub branch prefix.
    @PostMapping("/{id}/connections")
    @ResponseStatus(HttpStatus.CREATED)
    public InitiativeConnection bind(@PathVariable String id,
                                     @RequestParam String connectionId,
                                     @RequestParam(required = false) String scopeKey) {
        return initiativeService.bindConnection(id, connectionId, scopeKey);
    }

    // DELETE /initiatives/{id}/connections/{connectionId}
    @DeleteMapping("/{id}/connections/{connectionId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unbind(@PathVariable String id, @PathVariable String connectionId) {
        initiativeService.unbindConnection(id, connectionId);
    }
}
