package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EventRepository extends JpaRepository<Event, String> {
    List<Event> findByInitiativeId(String initiativeId);

    @Query("SELECT e FROM Event e WHERE " +
           "LOWER(e.summary) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(e.evidence) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(e.decidedBy) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(e.eventType) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Event> searchAcrossTenant(@Param("q") String q);
    List<Event> findByInitiativeIdOrderByEventDateAsc(String initiativeId);
    List<Event> findByInitiativeIdAndStatusOrderByEventDateAsc(String initiativeId, String status);
    List<Event> findByInitiativeIdAndStatusOrderByEventDateDesc(String initiativeId, String status);
    List<Event> findByInitiativeIdAndEventType(String initiativeId, String eventType);
    List<Event> findByInitiativeIdAndSourceId(String initiativeId, String sourceId);
    void deleteByInitiativeId(String initiativeId);
}
