package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.Source;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SourceRepository extends JpaRepository<Source, String> {
    List<Source> findByInitiativeId(String initiativeId);
    List<Source> findByInitiativeIdAndType(String initiativeId, String type);
}
