package com.hackathon.productmemory.dto;

import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public final class MailDtos {

    private MailDtos() {
    }

    /** Recipients for a progress / release-note email. */
    public record SendMailRequest(@NotEmpty List<String> to) {
    }

    /**
     * What was sent. {@code mode} is "release" when the parent ticket is released, otherwise
     * "progress". The generated subject is returned so the UI can confirm what went out.
     */
    public record SendMailResult(String mode, String subject, int recipients, String preview) {
    }
}
