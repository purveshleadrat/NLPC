package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, String> {
    List<Event> findByStatusOrderByEventDateAsc(String status);
    List<Event> findByStatusOrderByEventDateDesc(String status);
    List<Event> findAllByOrderByEventDateAsc();
    List<Event> findByEventType(String eventType);
}
