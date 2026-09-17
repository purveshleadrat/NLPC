package com.hackathon.productmemory.service;

import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.repository.EventRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class EventService {

    private final EventRepository eventRepository;
    private final InitiativeService initiativeService;

    public EventService(EventRepository eventRepository, InitiativeService initiativeService) {
        this.eventRepository = eventRepository;
        this.initiativeService = initiativeService;
    }

    public Event create(String initiativeId, Event event) {
        event.setInitiativeId(initiativeService.requireInitiative(initiativeId));
        if (event.getId() == null || event.getId().isBlank()) {
            event.setId(UUID.randomUUID().toString());
        }
        event.setCreatedAt(Instant.now());
        return eventRepository.save(event);
    }

    public List<Event> findByInitiative(String initiativeId) {
        if (initiativeId == null || initiativeId.isBlank()) {
            return eventRepository.findAll();
        }
        return eventRepository.findByInitiativeIdOrderByEventDateAsc(
                initiativeService.requireInitiative(initiativeId));
    }

    public List<Event> findByInitiativeAndStatus(String initiativeId, String status) {
        if (initiativeId == null || initiativeId.isBlank()) {
            return eventRepository.findAll().stream().filter(e -> status.equalsIgnoreCase(e.getStatus())).toList();
        }
        return eventRepository.findByInitiativeIdAndStatusOrderByEventDateAsc(
                initiativeService.requireInitiative(initiativeId), status);
    }

    public List<Event> findByInitiativeAndType(String initiativeId, String eventType) {
        if (initiativeId == null || initiativeId.isBlank()) {
            return eventRepository.findAll().stream().filter(e -> eventType.equalsIgnoreCase(e.getEventType())).toList();
        }
        return eventRepository.findByInitiativeIdAndEventType(
                initiativeService.requireInitiative(initiativeId), eventType);
    }
}
