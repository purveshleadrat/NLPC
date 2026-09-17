package com.hackathon.productmemory;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hackathon.productmemory.adapter.GitHubAdapter;
import com.hackathon.productmemory.dto.NormalizedSource;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

public class GitHubAdapterTest {

    @Test
    public void testFallbackNormalizationRemovesJsonNoise() {
        GitHubAdapter adapter = new GitHubAdapter(
                "https://api.github.com",
                "",
                "test-owner",
                "test-repo",
                new ObjectMapper()
        );

        NormalizedSource source = adapter.fetchAndNormalizeBranch("feature/CJ-01");
        assertNotNull(source);
        assertEquals("commit", source.getType());
        assertEquals("CJ-01", source.getExternalRef());
        assertTrue(source.getRawText().contains("Branch: feature/CJ-01"));
        assertFalse(source.getRawText().contains("node_id"));
        assertFalse(source.getRawText().contains("avatar_url"));
    }
}
