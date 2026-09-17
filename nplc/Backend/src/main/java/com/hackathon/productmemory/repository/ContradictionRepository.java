package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.Contradiction;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ContradictionRepository extends JpaRepository<Contradiction, String> {
    List<Contradiction> findByInitiativeId(String initiativeId);
    List<Contradiction> findByInitiativeIdAndResolvedFalse(String initiativeId);
}
