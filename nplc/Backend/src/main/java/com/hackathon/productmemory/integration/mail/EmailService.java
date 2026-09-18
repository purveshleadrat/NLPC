package com.hackathon.productmemory.integration.mail;

import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.MessagingException;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Properties;

/**
 * Sends one email over SMTP using Jakarta Mail directly.
 *
 * <p>Deliberately not spring-boot-starter-mail: that artifact is not in the local Maven
 * repo for this Boot line, whereas the Angus implementation this depends on is. The API is
 * the same shape either way - build a {@link Session}, then a {@link MimeMessage}.
 *
 * <p>Port 465 is treated as implicit SSL; anything else (587, 25, 2525) uses STARTTLS.
 * Timeouts are set so a dead mail host fails the request instead of hanging a worker.
 */
@Component
public class EmailService {

    public void send(String host, int port, String username, String password,
                     String from, List<String> to, String subject, String body) {
        Properties props = new Properties();
        props.put("mail.smtp.auth", "true");
        props.put("mail.smtp.host", host);
        props.put("mail.smtp.port", String.valueOf(port));
        props.put("mail.smtp.connectiontimeout", "10000");
        props.put("mail.smtp.timeout", "20000");
        props.put("mail.smtp.writetimeout", "20000");
        if (port == 465) {
            props.put("mail.smtp.ssl.enable", "true");
        } else {
            props.put("mail.smtp.starttls.enable", "true");
        }

        Session session = Session.getInstance(props, new Authenticator() {
            @Override
            protected PasswordAuthentication getPasswordAuthentication() {
                return new PasswordAuthentication(username, password);
            }
        });

        try {
            MimeMessage message = new MimeMessage(session);
            message.setFrom(new InternetAddress(from));
            for (String recipient : to) {
                if (recipient != null && !recipient.isBlank()) {
                    message.addRecipient(Message.RecipientType.TO, new InternetAddress(recipient.trim()));
                }
            }
            if (message.getAllRecipients() == null || message.getAllRecipients().length == 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "no valid recipient addresses");
            }
            message.setSubject(subject, "UTF-8");
            message.setText(body, "UTF-8");
            Transport.send(message);
        } catch (MessagingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "SMTP send failed: " + e.getMessage());
        }
    }
}
