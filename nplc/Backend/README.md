# Product memory — Hackathon 2K26

Backend for "Never Lose Product Context" — a source-backed decision timeline for one product
initiative. Spring Boot + Maven.

## Setup

Requires Java 17+ and Maven (or Docker, see below). Database is Postgres, hosted on Supabase.

```bash
git clone <this-repo-url>
cd product-memory
```

Copy `.env` (ask a teammate for the values, or create your own Supabase project — see
"Database (Supabase)" below) and set these environment variables before running (never point
Jira vars at a company Jira site — use your own free personal Jira Cloud sandbox):

```bash
export SPRING_DATASOURCE_URL=jdbc:postgresql://<host>:<port>/postgres
export SPRING_DATASOURCE_USERNAME=<user>
export SPRING_DATASOURCE_PASSWORD=<password>

export JIRA_SITE_URL=https://yoursandbox.atlassian.net
export JIRA_EMAIL=you@example.com
export JIRA_API_TOKEN=your_personal_api_token
export ANTHROPIC_API_KEY=your_key   # not required yet, reserved for the extraction pipeline
```

Run it:

```bash
mvn spring-boot:run
```

Server starts on `http://localhost:4000`.

### Running with Docker instead

```bash
make infra-up      # builds the image and starts the container (reads ./.env)
make infra-logs    # tail logs
make infra-down    # stop and remove the container
make infra-restart # down + up
```

### Database (Supabase)

This app connects to a Postgres database hosted on [Supabase](https://supabase.com) — no local
DB needed. Tables are created/updated automatically on startup via Hibernate
(`spring.jpa.hibernate.ddl-auto=update`), so there are no manual migrations to run.

To get your own connection string: Supabase dashboard → **Connect** → **Direct connection** tab
→ **Session pooler** (IPv4-compatible, required for most hosts/networks) → copy the host/port/user,
and use the DB password you set when creating the project.

## Endpoints (current)

- `GET /jira/projects` — list all projects on the connected Jira site
- `GET /jira/tickets?jql=...&fields=*all` — search tickets by JQL

## Working on this as a team

```bash
git checkout -b your-name/feature-you-are-building
# ... make changes ...
git push -u origin your-name/feature-you-are-building
```
Open a PR into `main` when ready — don't push directly to `main`.

## Project structure

```
src/main/java/com/hackathon/productmemory/
  controller/   REST endpoints (JiraController is the only wired-up one so far)
  entity/       JPA entities for the decision model (Source, Event, Constraint, Contradiction) —
                scaffolded, not yet wired to any endpoint
  repository/   Spring Data repositories for the entities above
  dto/          Shared data shapes (NormalizedSource — the common shape every source adapter
                will produce)
```

## Deployment

Deployed as a Docker container (see `Dockerfile`) on [Render](https://render.com):

- Root Directory: `nplc/Backend`
- Language: `Docker`
- Env vars: same as local setup above (`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`,
  `SPRING_DATASOURCE_PASSWORD`, `ANTHROPIC_API_KEY`, `JIRA_SITE_URL`, `JIRA_EMAIL`,
  `JIRA_API_TOKEN`) added in the Render dashboard, not committed

## Rules compliance (per Hackathon 2K26 rules doc)

- No company Jira/GitHub credentials or real tickets/commits anywhere in this repo — Jira
  integration must point at a personal sandbox, not `leadrat-team.atlassian.net` or any other
  company system.
- No secrets committed — all credentials are environment variables, `.gitignore` excludes `.env`.
- Sample/demo data used elsewhere in this project (fixtures, if added) is entirely synthetic.
