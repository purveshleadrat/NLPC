package com.hackathon.productmemory.tenant;

import org.hibernate.cfg.AvailableSettings;
import org.hibernate.context.spi.CurrentTenantIdentifierResolver;
import org.springframework.boot.autoconfigure.orm.jpa.HibernatePropertiesCustomizer;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Bridges {@link TenantContext} into Hibernate.
 *
 * <p>With this registered, any entity carrying a {@code @TenantId} field is filtered on
 * every select and stamped on every insert automatically. That matters more than the
 * hand-written alternative ({@code findByTenantIdAnd...} on each repository) because a
 * repository method added later is scoped whether or not its author remembered to be.
 *
 * <p>This is discriminator-based multi-tenancy: one database, one connection pool, a
 * tenant column on each table. No {@code MultiTenantConnectionProvider} and no
 * schema-per-tenant, so the single Supabase datasource is unchanged.
 */
@Component
public class TenantIdentifierResolver
        implements CurrentTenantIdentifierResolver<String>, HibernatePropertiesCustomizer {

    @Override
    public String resolveCurrentTenantIdentifier() {
        // Never null: Hibernate throws on a null identifier. TenantContext returns a
        // sentinel that matches no rows when nothing has been resolved.
        return TenantContext.getTenantId();
    }

    @Override
    public boolean validateExistingCurrentSessions() {
        return false;
    }

    @Override
    public void customize(Map<String, Object> hibernateProperties) {
        hibernateProperties.put(AvailableSettings.MULTI_TENANT_IDENTIFIER_RESOLVER, this);
    }
}
