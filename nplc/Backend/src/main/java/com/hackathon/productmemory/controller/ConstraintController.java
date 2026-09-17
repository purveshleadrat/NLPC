package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.entity.Constraint;
import com.hackathon.productmemory.service.ConstraintService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/constraints")
public class ConstraintController {

    private final ConstraintService constraintService;

    public ConstraintController(ConstraintService constraintService) {
        this.constraintService = constraintService;
    }

    // POST /constraints?initiativeId=...
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Constraint create(@RequestParam String initiativeId, @RequestBody Constraint constraint) {
        return constraintService.create(initiativeId, constraint);
    }

    // GET /constraints?initiativeId=...&status=ACTIVE
    @GetMapping
    public List<Constraint> list(@RequestParam String initiativeId,
                                 @RequestParam(required = false) String status) {
        return status == null
                ? constraintService.findByInitiative(initiativeId)
                : constraintService.findByInitiativeAndStatus(initiativeId, status);
    }
}
