# Product memory — Hackathon 2K26

Backend for "Never Lose Product Context" — a source-backed decision timeline for one product
initiative. Spring Boot + Maven, multi-tenant.

## Setup

Requires Java 17+ and Maven (or Docker, see below). Database is Postgres, hosted on Supabase.

```bash
git clone <this-repo-url>
cd nplc/Backend
cp .env.example .env     # then fill it in
```

`.env` is gitignored and must never be committed. See `.env.example` for the full list; the
four that matter are:

```bash
SUPABASE_DB_URL=jdbc:postgresql://<host>.pooler.supabase.com:6543/postgres?prepareThreshold=0
SUPABASE_DB_USERNAME=postgres.<project-ref>
SUPABASE_DB_PASSWORD=your_db_password

JWT_SECRET=          # openssl rand -base64 48 — signs access tokens
APP_SECRET_KEY=      # openssl rand -base64 32 — encrypts stored Jira/GitHub tokens
```

The app will not start without `JWT_SECRET` and `APP_SECRET_KEY`, by design: an empty signing
key would let anyone mint a token for any tenant, and an empty encryption key would mean
storing other organisations' API tokens in the clear.

Note that Spring Boot does not read `.env` itself — only Docker does, via `--env-file`. To run
with `mvn`, export the variables into your shell first.

Run it:

```bash
mvn spring-boot:run
```

Server starts on `http://localhost:4000`. Swagger UI is at `/swagger-ui/index.html`.

> On JDK 23 and newer, add `-Dmaven.compiler.proc=full` if you build with a JDK whose
> annotation processing is disabled by default — though `pom.xml` now declares Lombok as an
> explicit processor path, so this should no longer be necessary.

### Running with Docker instead

```bash
make infra-up      # builds the image and starts the container (reads ./.env)
make infra-logs    # tail logs
make infra-down    # stop and remove the container
make infra-restart # down + up
```

### Database (Supabase)

Hosted Postgres — no local DB needed. The schema is owned by **Flyway**
(`src/main/resources/db/migration`), not by Hibernate: `ddl-auto` is set to `validate`, so the
app refuses to start if the entities and the migrated schema disagree. Add a new
`V<n>__description.sql` for every schema change rather than editing an applied migration.

## Multi-tenancy

Every table carries `tenant_id`, and a tenant is the outermost unit of ownership: login,
integration connections and initiatives all belong to exactly one.

**How the tenant is resolved.** It comes from a claim inside the signed access token, and from
nowhere else — never a header, query parameter or body field. `JwtAuthenticationFilter` puts it
in `TenantContext`, Hibernate's `@TenantId` then filters every query and stamps every insert.
If a request also carries `X-Tenant-Id`, it is verified against the token and a mismatch is
rejected with 403; it is an assertion to check, not a source to trust.

**One thing `@TenantId` does not cover:** a lookup by primary key. Hibernate applies the tenant
discriminator to derived queries and `findAll()`, but `findById()` returns the row whatever
tenant owns it. Every service that loads an entity by id therefore checks the tenant explicitly
— see `InitiativeService.requireInitiative` and `IntegrationConnectionService.require`. This is
verified by test, not assumed. Cross-tenant access answers **404, not 403**, so a response never
confirms that an identifier exists.

Run the isolation suite against a running server:

```powershell
./scripts/tenant-isolation-test.ps1
```

It covers cross-tenant reads and writes, header spoofing, token forgery, secret leakage, the
SSRF allowlist, and the fact that one shared login serves any number of simultaneous callers.

## Authentication

**Tenant-level. There are no user accounts.** A tenant has one password, shared by everyone
working on it, and the token identifies the tenant rather than a person.

```bash
POST /auth/signup   { "tenantName": "Acme", "tenantSlug": "acme", "password": "..." }
POST /auth/login    { "tenantSlug": "acme", "password": "..." }
POST /auth/renew    (no body; send the current token)   # fresh token, keeps a session alive
```

All three return `{ accessToken, expiresInSeconds, tenantId, tenantSlug }`. Every other
endpoint needs `Authorization: Bearer <accessToken>`. Any number of people can log in with the
same credentials at once.

The token is valid for **12 hours**. There is no refresh token, deliberately: a refresh token
exists so access tokens can be short-lived while one person's session stays revocable, and
neither half applies when there are no separate people to distinguish. It would be a table and
an endpoint to reach the same place a longer expiry already reaches.

`POST /auth/renew` covers the gap instead. Send a token that has **not yet expired** and get a
fresh one, so a session in active use never times out. It is not a public endpoint — an expired
token cannot renew itself, so an abandoned session still dies on its own.

**What the frontend needs to do:** store the token, call `/auth/renew` on app load and every
few hours, and intercept `401` to send the user back to login. Without that interceptor an
expired token shows up as empty screens rather than a login prompt. Do not store the password
in the browser to re-login automatically — `/auth/renew` exists so you don't have to.

Two consequences, stated here because nothing in the code will remind you:

- **No attribution.** Nothing records who created an initiative, added a connection or deleted
  one. For a product about decision provenance that is a real gap, and closing it later means
  every row written before then has no actor attached.
- **No individual revocation.** Removing one person's access means changing the password for
  everybody, and a token already issued stays valid until it expires regardless.

This was a deliberate trade for hackathon scope. Reintroducing users means a `users` table, a
`user_id` on the audit-worthy rows, and putting `sub` back in the token — the tenant plumbing
itself does not change, because the token already carries the tenant separately.

## Integration connections

A tenant owns any number of Jira sites and GitHub repos. These are shared service accounts in
the SMTP sense: the organisation configures them once, anyone signed into the tenant may use
them, and the Jira account email is a credential component — it identifies an Atlassian
account, not a person using this app.

```bash
POST   /connections          { "provider": "JIRA", "label": "Prod Jira",
                               "baseUrl": "https://you.atlassian.net",
                               "accountId": "you@example.com", "secret": "<api token>" }
POST   /connections          { "provider": "GITHUB", "label": "Backend repo",
                               "baseUrl": "https://api.github.com",
                               "accountId": "<owner>", "repo": "<repo>", "secret": "<PAT>" }
GET    /connections
POST   /connections/{id}/secret   { "secret": "<new token>" }   # rotate
DELETE /connections/{id}
```

**Secrets are write-only.** No endpoint returns a stored token, in any form including masked —
anyone with the tenant password could otherwise read out the organisation's tokens. They are
encrypted at rest with AES-GCM under `APP_SECRET_KEY`.

`baseUrl` is tenant-supplied and becomes an outbound request from this server, so it is checked
against an allowlist (`integrations.*.allowed-host-suffixes`): HTTPS only, and only known Jira
and GitHub hosts. Without that, a connection could point at internal addresses or a cloud
metadata endpoint and have this service fetch them.

## Endpoints

All of these are tenant-scoped through the caller's token.

- `GET /jira/projects[?connectionId=]` — fans out across the tenant's Jira connections
- `GET /jira/tickets?jql=...&fields=*all[&connectionId=]`
- `GET /jira/tickets/{key}[?connectionId=]` — exact key; `CJ-01` never matches `CJ-011`
- `GET /github/branches[?connectionId=]`
- `GET /github/branches/{name}[?connectionId=]` — exact name
- `GET /tickets/{key}[?initiativeId=]` — pairs a ticket with the branch named after it

Responses from the fan-out endpoints are **one entry per connection**, and a connection that
failed appears as an entry carrying an `error` rather than failing the whole request — one
tenant's expired token must not look like an outage. `/tickets/{key}` returns a `matches` array
for the same reason: a key can exist in two of a tenant's Jira sites, and a branch of that name
in several repos. Pass `initiativeId` to narrow the search to that initiative's connections.

Initiative-scoped CRUD, unchanged apart from tenancy:

- `POST /initiatives` — body `{ "name": "..." }`
- `GET /initiatives` / `GET /initiatives/{id}`
- `GET|POST /initiatives/{id}/connections`, `DELETE /initiatives/{id}/connections/{connectionId}`
- `POST|GET /sources?initiativeId=...[&type=meeting_note]`
- `POST|GET /events?initiativeId=...[&status=CURRENT][&eventType=DECISION]`
- `POST|GET /constraints?initiativeId=...[&status=ACTIVE]`
- `POST|GET /contradictions?initiativeId=...[&unresolved=true]`

`Initiative` no longer has `jiraKey` and `repo` fields — each held a single value, and an
initiative routinely spans several repos and more than one Jira project. Attach them through
`/initiatives/{id}/connections` instead.

## Working on this as a team

```bash
git checkout -b your-name/feature-you-are-building
git push -u origin your-name/feature-you-are-building
```

Open a PR into `main` when ready — don't push directly to `main`.

## Project structure

```
src/main/java/com/hackathon/productmemory/
  controller/   REST endpoints. Thin: no repository access, no HTTP to upstreams.
  service/      Tenant and initiative scoping, auth, connection management, ticket pairing
  entity/       JPA entities. Everything in the decision model carries @TenantId;
                Tenant deliberately does not - it is read at login, before a
                tenant is known.
  repository/   Spring Data repositories
  security/     JWT issuing and verification, the auth filter, the filter chain
  tenant/       TenantContext and the Hibernate resolver that reads it
  integration/  Per-connection HTTP clients, credential encryption, host allowlist
  dto/          Request/response shapes
src/main/resources/db/migration/   Flyway migrations - the schema's source of truth
scripts/tenant-isolation-test.ps1  Cross-tenant leakage suite
```

## Deployment

Deployed as a Docker container (see `Dockerfile`) on [Render](https://render.com):

- Root Directory: `nplc/Backend`
- Language: `Docker`
- Env vars, set in the Render dashboard and never committed: `SUPABASE_DB_URL`,
  `SUPABASE_DB_USERNAME`, `SUPABASE_DB_PASSWORD`, `JWT_SECRET`, `APP_SECRET_KEY`, and
  optionally `ANTHROPIC_API_KEY`.

Jira and GitHub credentials are no longer server configuration — they are created per tenant
at runtime through `POST /connections`.

## Rules compliance (per Hackathon 2K26 rules doc)

- No company Jira/GitHub credentials or real tickets/commits anywhere in this repo — Jira and
  GitHub integrations must point at personal sandboxes, not `leadrat-team.atlassian.net`,
  a company GitHub org, or any other company system.
- No secrets committed — all credentials are environment variables or encrypted database
  rows, and `.gitignore` excludes `.env`.
- Sample/demo data used elsewhere in this project (fixtures, if added) is entirely synthetic.
