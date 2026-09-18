package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.dto.SearchDtos;
import com.hackathon.productmemory.service.SearchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/search")
@RequiredArgsConstructor
public class SearchController {

    private final SearchService searchService;

    @GetMapping
    public ResponseEntity<SearchDtos.SearchResponse> search(
        @RequestParam(defaultValue = "") String q
    ) {
        return ResponseEntity.ok(searchService.search(q));
    }
}
