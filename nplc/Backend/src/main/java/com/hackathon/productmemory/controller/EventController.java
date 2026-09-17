package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.service.EventService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/events")
public class EventController {

    private final EventService eventService;

    public EventController(EventService eventService) {
        this.eventService = eventService;
    }

    // POST /events?initiativeId=...
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Event create(@RequestParam(required = false) String initiativeId, @RequestBody Event event) {
        return eventService.create(initiativeId != null ? initiativeId : "", event);
    }

    // GET /events?initiativeId=...&status=CURRENT&eventType=DECISION
    @GetMapping
    public List<Event> list(@RequestParam(required = false) String initiativeId,
                            @RequestParam(required = false) String status,
                            @RequestParam(required = false) String eventType) {
        if (status != null) {
            return eventService.findByInitiativeAndStatus(initiativeId, status);
        }
        if (eventType != null) {
            return eventService.findByInitiativeAndType(initiativeId, eventType);
        }
        return eventService.findByInitiative(initiativeId);
    }
}
