package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.dto.ConnectionDtos.*;
import com.hackathon.productmemory.service.IntegrationConnectionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * A tenant's Jira and GitHub connections.
 *
 * <p>There is no endpoint that returns a stored secret, and there deliberately never will
 * be: with flat permissions, any member could otherwise read out the organisation's Jira
 * and GitHub tokens. Replacing one is possible (rotate); reading one is not.
 *
 * <p>The tenant is taken from the caller's token, so none of these methods accepts one.
 */
@RestController
@RequestMapping("/connections")
public class ConnectionController {

    private final IntegrationConnectionService connectionService;

    public ConnectionController(IntegrationConnectionService connectionService) {
        this.connectionService = connectionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ConnectionResponse create(@Valid @RequestBody CreateConnectionRequest request) {
        return connectionService.create(request);
    }

    @GetMapping
    public List<ConnectionResponse> list() {
        return connectionService.list();
    }

    @PostMapping("/{id}/secret")
    public ConnectionResponse rotateSecret(@PathVariable String id,
                                           @Valid @RequestBody RotateSecretRequest request) {
        return connectionService.rotateSecret(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        connectionService.delete(id);
    }
}
