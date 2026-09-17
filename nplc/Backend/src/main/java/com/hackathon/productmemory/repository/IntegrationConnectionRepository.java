package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.IntegrationConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

// Every method here is tenant-filtered by Hibernate via the entity's @TenantId field,
// so findAll() means "all of this tenant's connections", never all connections.
public interface IntegrationConnectionRepository extends JpaRepository<IntegrationConnection, String> {
    List<IntegrationConnection> findByProvider(String provider);

    List<IntegrationConnection> findByIdIn(List<String> ids);
}
