package com.hackathon.productmemory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

// UserDetailsServiceAutoConfiguration is excluded because authentication is entirely
// JWT-based. Left in, it builds an in-memory user with a password printed to the log at
// every startup - noise at best, and a credential path nobody intended at worst.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
@EnableScheduling
public class ProductMemoryApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProductMemoryApplication.class, args);
    }
}
