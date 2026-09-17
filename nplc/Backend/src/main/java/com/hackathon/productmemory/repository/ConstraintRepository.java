package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.Constraint;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ConstraintRepository extends JpaRepository<Constraint, String> {
    List<Constraint> findByStatus(String status);
}
