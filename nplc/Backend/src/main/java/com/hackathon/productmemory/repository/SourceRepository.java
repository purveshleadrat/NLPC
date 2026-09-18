package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.Source;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SourceRepository extends JpaRepository<Source, String> {
    List<Source> findByInitiativeId(String initiativeId);

    @Query("SELECT s FROM Source s WHERE " +
           "LOWER(s.title) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(s.rawText) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(s.author) LIKE LOWER(CONCAT('%', :q, '%')) OR " +
           "LOWER(s.externalRef) LIKE LOWER(CONCAT('%', :q, '%'))")
    List<Source> searchAcrossTenant(@Param("q") String q);
    List<Source> findByInitiativeIdAndType(String initiativeId, String type);
    List<Source> findByInitiativeIdAndExternalRef(String initiativeId, String externalRef);
    void deleteByInitiativeId(String initiativeId);
}
