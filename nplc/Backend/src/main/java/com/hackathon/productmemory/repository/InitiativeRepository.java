package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.Initiative;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InitiativeRepository extends JpaRepository<Initiative, String> {
    List<Initiative> findAllByOrderByCreatedAtDesc();
}
