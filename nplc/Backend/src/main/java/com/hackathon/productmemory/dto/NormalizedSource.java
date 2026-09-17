package com.hackathon.productmemory.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

// The one shape every adapter produces, regardless of which platform the data came from.
// This is the seam that lets a fixture-fed adapter become a live API call later with a
// one-line change inside the adapter, and nothing else in the app touched.
@Data
@AllArgsConstructor
@NoArgsConstructor
public class NormalizedSource {
    private String type;
    private String title;
    private String rawText;
    private String docDate;
    private String author;
    private String externalRef;
}
