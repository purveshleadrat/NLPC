package com.hackathon.productmemory.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Encrypts the Jira and GitHub credentials held against a connection.
 *
 * <p>These are other organisations' API tokens. Held in the clear, one database dump would
 * hand over every tenant's Jira and GitHub access, so they are sealed with AES-GCM - which
 * also authenticates, meaning tampered ciphertext fails to decrypt rather than decrypting
 * into something unexpected.
 */
@Component
public class SecretCipher {

    private static final String TRANSFORMATION = "AES/GCM/NoPadding";
    private static final int IV_LENGTH = 12;
    private static final int TAG_LENGTH_BITS = 128;

    private static final SecureRandom RANDOM = new SecureRandom();

    private final SecretKeySpec key;
    private final int keyVersion;

    public SecretCipher(@Value("${app.crypto.secret-key:}") String base64Key,
                        @Value("${app.crypto.key-version:1}") int keyVersion) {
        if (base64Key == null || base64Key.isBlank()) {
            throw new IllegalStateException(
                    "APP_SECRET_KEY is not set. Integration tokens cannot be stored without it. "
                            + "Generate one with: openssl rand -base64 32");
        }
        byte[] keyBytes = Base64.getDecoder().decode(base64Key.trim());
        if (keyBytes.length != 32) {
            throw new IllegalStateException(
                    "APP_SECRET_KEY must decode to exactly 32 bytes for AES-256; got " + keyBytes.length);
        }
        this.key = new SecretKeySpec(keyBytes, "AES");
        this.keyVersion = keyVersion;
    }

    public int keyVersion() {
        return keyVersion;
    }

    /** Returns base64(iv || ciphertext+tag). A fresh IV per call - never reuse one with GCM. */
    public String encrypt(String plaintext) {
        try {
            byte[] iv = new byte[IV_LENGTH];
            RANDOM.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] ciphertext = cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + ciphertext.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(ciphertext, 0, combined, iv.length, ciphertext.length);
            return Base64.getEncoder().encodeToString(combined);
        } catch (GeneralSecurityException e) {
            throw new IllegalStateException("failed to encrypt integration secret", e);
        }
    }

    public String decrypt(String stored) {
        try {
            byte[] combined = Base64.getDecoder().decode(stored);
            byte[] iv = new byte[IV_LENGTH];
            System.arraycopy(combined, 0, iv, 0, IV_LENGTH);

            Cipher cipher = Cipher.getInstance(TRANSFORMATION);
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(TAG_LENGTH_BITS, iv));
            byte[] plaintext = cipher.doFinal(combined, IV_LENGTH, combined.length - IV_LENGTH);
            return new String(plaintext, StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException | ArrayIndexOutOfBoundsException e) {
            // Usually means the key was rotated without re-encrypting the stored secrets.
            throw new IllegalStateException(
                    "failed to decrypt integration secret - was APP_SECRET_KEY rotated?", e);
        }
    }
}
