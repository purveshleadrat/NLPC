package com.hackathon.productmemory.service;

import com.hackathon.productmemory.dto.MailDtos.SendMailResult;
import com.hackathon.productmemory.entity.Event;
import com.hackathon.productmemory.entity.Initiative;
import com.hackathon.productmemory.entity.IntegrationConnection;
import com.hackathon.productmemory.entity.Source;
import com.hackathon.productmemory.integration.SecretCipher;
import com.hackathon.productmemory.integration.llm.LlmClient;
import com.hackathon.productmemory.integration.mail.EmailService;
import com.hackathon.productmemory.repository.EventRepository;
import com.hackathon.productmemory.repository.SourceRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

/**
 * Composes and sends an initiative status email over the tenant's SMTP connection.
 *
 * <p>The body is written by the LLM from the current timeline (events) and sources, so it
 * reflects progress in both the code (commits) and the tickets. If the initiative's parent
 * ticket is released, a release-note email is sent instead of a progress update.
 */
@Service
public class MailReportService {

    private static final int MAX_EVENTS = 60;
    private static final int MAX_SOURCES = 60;

    private static final String PROGRESS_SYSTEM = """
            You write a concise, professional progress-update email about a software product
            initiative, for stakeholders. Use ONLY the timeline and sources given below - never
            invent facts. Cover, in this spirit:
            - what has progressed in the CODE (commits: what changed and where),
            - what has progressed in the TICKETS (status, decisions made, scope),
            - current decisions and any open questions,
            - a short "next steps" if the material supports it.
            Keep it tight and readable (a few short paragraphs or bullet groups), plain text.
            Output EXACTLY: a first line "Subject: <subject>", then a blank line, then the body.
            """;

    private static final String RELEASE_SYSTEM = """
            You write a release-note email announcing that a software product initiative has
            been RELEASED, for stakeholders. Use ONLY the timeline and sources given below -
            never invent facts. Summarise what shipped: the features, changes and fixes drawn
            from the code (commits) and the tickets, plus the key decisions behind them. Keep
            it celebratory but factual and readable, plain text.
            Output EXACTLY: a first line "Subject: <subject>", then a blank line, then the body.
            """;

    private final InitiativeService initiativeService;
    private final IntegrationConnectionService connectionService;
    private final EventRepository eventRepository;
    private final SourceRepository sourceRepository;
    private final LlmClient llm;
    private final EmailService emailService;
    private final SecretCipher cipher;

    public MailReportService(InitiativeService initiativeService,
                             IntegrationConnectionService connectionService,
                             EventRepository eventRepository,
                             SourceRepository sourceRepository,
                             LlmClient llm,
                             EmailService emailService,
                             SecretCipher cipher) {
        this.initiativeService = initiativeService;
        this.connectionService = connectionService;
        this.eventRepository = eventRepository;
        this.sourceRepository = sourceRepository;
        this.llm = llm;
        this.emailService = emailService;
        this.cipher = cipher;
    }

    @Transactional(readOnly = true)
    public SendMailResult send(String initiativeId, List<String> to) {
        initiativeService.requireInitiative(initiativeId);
        Initiative initiative = initiativeService.getById(initiativeId);

        if (to == null || to.stream().noneMatch(t -> t != null && !t.isBlank())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "at least one recipient is required");
        }

        List<IntegrationConnection> smtp = connectionService.byProvider(IntegrationConnection.PROVIDER_SMTP);
        if (smtp.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "no SMTP connection configured — add one in Settings");
        }
        IntegrationConnection conn = smtp.get(0);

        List<Event> events = eventRepository.findByInitiativeIdOrderByEventDateAsc(initiativeId);
        List<Source> sources = sourceRepository.findByInitiativeId(initiativeId);
        boolean released = parentTicketReleased(sources);

        String context = buildContext(initiative, events, sources);
        String raw = llm.generate(released ? RELEASE_SYSTEM : PROGRESS_SYSTEM, context, false);

        String fallbackSubject = (released ? "Release note: " : "Progress update: ") + initiative.getName();
        String[] subjectBody = splitSubject(raw, fallbackSubject);

        String password = cipher.decrypt(conn.getSecretCiphertext());
        emailService.send(conn.getBaseUrl(), conn.smtpPort(), conn.getAccountId(), password,
                conn.getAccountId(), to, subjectBody[0], subjectBody[1]);

        int count = (int) to.stream().filter(t -> t != null && !t.isBlank()).count();
        String preview = subjectBody[1].length() > 400 ? subjectBody[1].substring(0, 400) + "…" : subjectBody[1];
        return new SendMailResult(released ? "release" : "progress", subjectBody[0], count, preview);
    }

    /**
     * True when a parent ticket (an imported ticket with no parent of its own) is released.
     * Status is read from the normalised source text, which carries a "Status: X" line.
     */
    private boolean parentTicketReleased(List<Source> sources) {
        return sources.stream()
                .filter(s -> "ticket".equals(s.getType()))
                .filter(s -> s.getParentRef() == null || s.getParentRef().isBlank())
                .anyMatch(s -> "released".equalsIgnoreCase(statusOf(s)));
    }

    private static String statusOf(Source s) {
        if (s.getRawText() == null) return "";
        for (String line : s.getRawText().split("\n")) {
            String t = line.trim();
            if (t.regionMatches(true, 0, "Status:", 0, "Status:".length())) {
                return t.substring("Status:".length()).trim();
            }
        }
        return "";
    }

    private static String buildContext(Initiative initiative, List<Event> events, List<Source> sources) {
        long tickets = sources.stream().filter(s -> "ticket".equals(s.getType())).count();
        long commits = sources.stream().filter(s -> "commit".equals(s.getType())).count();

        StringBuilder sb = new StringBuilder();
        sb.append("Initiative: ").append(initiative.getName()).append('\n');
        sb.append("Sources: ").append(tickets).append(" tickets, ").append(commits).append(" commits, ")
                .append(sources.size()).append(" total.\n\n");

        sb.append("TIMELINE (chronological):\n");
        if (events.isEmpty()) {
            sb.append("(no extracted events yet)\n");
        } else {
            int shown = 0;
            for (Event e : events) {
                if (shown++ >= MAX_EVENTS) { sb.append("… (more events omitted)\n"); break; }
                sb.append("- [").append(e.getEventDate()).append("] ")
                        .append(e.getEventType()).append(" (").append(e.getStatus()).append("): ")
                        .append(e.getSummary());
                if (e.getDecidedBy() != null && !e.getDecidedBy().isBlank()) {
                    sb.append(" — by ").append(e.getDecidedBy());
                }
                if (e.getAffectedItems() != null && !e.getAffectedItems().isEmpty()) {
                    sb.append(" [").append(String.join(", ", e.getAffectedItems())).append("]");
                }
                sb.append('\n');
            }
        }

        sb.append("\nSOURCES:\n");
        int shown = 0;
        for (Source s : sources) {
            if (shown++ >= MAX_SOURCES) { sb.append("… (more sources omitted)\n"); break; }
            sb.append("- ").append(s.getType()).append(": ").append(s.getTitle());
            String status = statusOf(s);
            if (!status.isBlank()) sb.append(" (status: ").append(status).append(")");
            sb.append('\n');
        }
        return sb.toString();
    }

    /** Splits "Subject: X\n\n<body>" into [subject, body]; falls back if the model deviated. */
    private static String[] splitSubject(String raw, String fallbackSubject) {
        String text = raw == null ? "" : raw.strip();
        if (text.regionMatches(true, 0, "Subject:", 0, "Subject:".length())) {
            int nl = text.indexOf('\n');
            if (nl > 0) {
                String subject = text.substring("Subject:".length(), nl).trim();
                String body = text.substring(nl + 1).strip();
                if (!subject.isEmpty()) return new String[]{subject, body};
            }
        }
        return new String[]{fallbackSubject, text.isEmpty() ? "(no content generated)" : text};
    }
}
