package com.hackathon.productmemory.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Declares the bearer scheme so Swagger UI shows an Authorize button.
 *
 * <p>Without it every endpoint below /auth answers 401 from the UI, because springdoc has
 * no way to know it should attach the token.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Product memory",
                version = "0.1.0",
                description = """
                        Multi-tenant decision memory.

                        Call POST /auth/signup or POST /auth/login first, then paste the
                        accessToken into Authorize. The token carries the tenant, and every
                        other endpoint is scoped to it - no tenant id is ever passed by hand."""),
        security = @SecurityRequirement(name = "bearer-jwt"))
@SecurityScheme(
        name = "bearer-jwt",
        type = SecuritySchemeType.HTTP,
        scheme = "bearer",
        bearerFormat = "JWT",
        in = SecuritySchemeIn.HEADER)
public class OpenApiConfig {
}
