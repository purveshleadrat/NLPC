package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.entity.Contradiction;
import com.hackathon.productmemory.service.ContradictionService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/contradictions")
public class ContradictionController {

    private final ContradictionService contradictionService;

    public ContradictionController(ContradictionService contradictionService) {
        this.contradictionService = contradictionService;
    }

    // POST /contradictions?initiativeId=...
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Contradiction create(@RequestParam String initiativeId,
                                @RequestBody Contradiction contradiction) {
        return contradictionService.create(initiativeId, contradiction);
    }

    // GET /contradictions?initiativeId=...&unresolved=true
    @GetMapping
    public List<Contradiction> list(@RequestParam String initiativeId,
                                    @RequestParam(defaultValue = "false") boolean unresolved) {
        return unresolved
                ? contradictionService.findUnresolvedByInitiative(initiativeId)
                : contradictionService.findByInitiative(initiativeId);
    }
}
