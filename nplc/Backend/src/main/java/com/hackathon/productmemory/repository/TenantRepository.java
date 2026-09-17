package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.Tenant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TenantRepository extends JpaRepository<Tenant, String> {
    // The login lookup: slug identifies the tenant before any tenant context exists.
    Optional<Tenant> findBySlug(String slug);
}
