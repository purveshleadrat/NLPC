package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.dto.InitiativeListDtos.InitiativeListPage;
import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.entity.InitiativeConnection;
import com.hackathon.productmemory.service.InitiativeListService;
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
    private final InitiativeListService initiativeListService;

    public InitiativeController(InitiativeService initiativeService, InitiativeListService initiativeListService) {
        this.initiativeService = initiativeService;
        this.initiativeListService = initiativeListService;
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

    // GET /initiatives/list?page=0&size=20&sort=updated_desc|name_asc|most_tickets
    //                       &search=...&filter=open|changed[&ids=a,b,c]
    // One aggregate query for the list page's cards (ticket/commit/open counts, scope
    // label, last-updated) instead of the 1 + 3N per-initiative calls the frontend used to
    // make. Deliberately a separate endpoint from GET /initiatives above: that one stays a
    // plain, unfiltered list because other parts of the app (initiative selection, the
    // sidebar, the workspace header) resolve initiatives by id and don't need any of this.
    //
    // ids, when present, ignores page/size/search/filter and returns exactly those ids
    // (still tenant-checked) - it's how the frontend's client-only "Pinned" tab asks for a
    // specific set of initiatives that may span several pages of the default ordering.
    @GetMapping("/list")
    public InitiativeListPage listPaged(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(defaultValue = "updated_desc") String sort,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String filter,
            @RequestParam(required = false) List<String> ids) {
        return initiativeListService.list(page, size, sort, search, filter, ids);
    }

    // GET /initiatives/{id}
    @GetMapping("/{id}")
    public Initiative get(@PathVariable String id) {
        return initiativeService.getById(id);
    }

    // PUT /initiatives/{id}  body: { "name": "...", "description": "...", "priority": "LOW"|"MEDIUM"|"HIGH" }
    @PutMapping("/{id}")
    public Initiative update(@PathVariable String id, @RequestBody Initiative body) {
        return initiativeService.update(id, body);
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
