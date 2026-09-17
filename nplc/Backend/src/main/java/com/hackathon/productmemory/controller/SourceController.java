package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.service.SourceService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/sources")
public class SourceController {

    private final SourceService sourceService;

    public SourceController(SourceService sourceService) {
        this.sourceService = sourceService;
    }

    // POST /sources?initiativeId=...
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Source create(@RequestParam String initiativeId, @RequestBody Source source) {
        return sourceService.create(initiativeId, source);
    }

    // GET /sources?initiativeId=...&type=meeting_note
    @GetMapping
    public List<Source> list(@RequestParam String initiativeId,
                             @RequestParam(required = false) String type) {
        return type == null
                ? sourceService.findByInitiative(initiativeId)
                : sourceService.findByInitiativeAndType(initiativeId, type);
    }
}
