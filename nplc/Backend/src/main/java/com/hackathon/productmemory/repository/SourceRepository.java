package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.Source;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SourceRepository extends JpaRepository<Source, String> {
}
