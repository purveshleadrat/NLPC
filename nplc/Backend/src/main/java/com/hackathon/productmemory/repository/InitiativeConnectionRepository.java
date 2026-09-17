package com.hackathon.productmemory.repository;

import com.hackathon.productmemory.entity.InitiativeConnection;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InitiativeConnectionRepository extends JpaRepository<InitiativeConnection, String> {
    List<InitiativeConnection> findByInitiativeId(String initiativeId);

    void deleteByInitiativeIdAndConnectionId(String initiativeId, String connectionId);
}
