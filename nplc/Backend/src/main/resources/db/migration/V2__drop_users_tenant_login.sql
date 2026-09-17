-- Collapse authentication onto the tenant.
--
-- There are no per-user permissions and no plan for any, so a user row carried no
-- authorisation information - and without distinct people to tell apart, refresh tokens
-- had nothing left to do either (they exist to keep access tokens short-lived and to let
-- one person's session be revoked). Login is now tenant plus password, and the access
-- token is long-lived.
--
-- What this gives up, deliberately: an issued token stays valid until it expires, so
-- changing the password does not invalidate one already handed out, and there is no way
-- to tell which person performed an action.

ALTER TABLE tenants ADD COLUMN password_hash varchar(255);

-- Carry across the first user's password for any tenant that already has one, so existing
-- logins keep working rather than silently becoming unusable.
UPDATE tenants t
SET password_hash = (
    SELECT u.password_hash
    FROM users u
    WHERE u.tenant_id = t.id
    ORDER BY u.created_at
    LIMIT 1
)
WHERE password_hash IS NULL;

-- Any tenant with no user at all (the seeded root tenant) gets an unusable hash rather
-- than a null: the column is about to become NOT NULL, and a placeholder that no password
-- can ever match is safer than a blank one that might.
UPDATE tenants
SET password_hash = '!'
WHERE password_hash IS NULL;

ALTER TABLE tenants ALTER COLUMN password_hash SET NOT NULL;

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
