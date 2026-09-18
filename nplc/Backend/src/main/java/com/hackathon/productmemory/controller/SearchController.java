package com.hackathon.productmemory.controller;

import com.hackathon.productmemory.dto.SearchDtos.SearchResponse;
import com.hackathon.productmemory.service.SearchService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    // GET /search?q=bulk+update
    @GetMapping
    public SearchResponse search(@RequestParam(defaultValue = "") String q) {
        return searchService.search(q);
    }
}
