# Product memory — Hackathon 2K26

Backend for "Never Lose Product Context" — a source-backed decision timeline for one product
initiative. Spring Boot + Maven.

## Setup

Requires Java 17+ and Maven.

```bash
git clone <this-repo-url>
cd product-memory
```

Set these environment variables before running (never point Jira vars at a company Jira site —
use your own free personal Jira Cloud sandbox):

```bash
export JIRA_SITE_URL=https://yoursandbox.atlassian.net
export JIRA_EMAIL=you@example.com
export JIRA_API_TOKEN=your_personal_api_token
export ANTHROPIC_API_KEY=your_key   # not required yet, reserved for the extraction pipeline

# Supabase Postgres - use the SESSION pooler / direct connection host (port 5432),
# NOT the transaction pooler on 6543, which breaks Hibernate prepared statements.
export SUPABASE_DB_HOST=db.yourproject.supabase.co
export SUPABASE_DB_USER=postgres
export SUPABASE_DB_PASSWORD=your_db_password
```

Run it:

```bash
mvn spring-boot:run
```

Server starts on `http://localhost:4000`.

## Endpoints (current)

- `GET /jira/projects` — list all projects on the connected Jira site
- `GET /jira/tickets?jql=...&fields=*all` — search tickets by JQL

Everything below is scoped to one initiative. Create an initiative first, then pass its id
as `initiativeId` on every other call.

- `POST /initiatives` — body `{ "name": "...", "jiraKey": "...", "repo": "..." }`
- `GET /initiatives` — newest first
- `GET /initiatives/{id}`
- `POST /sources?initiativeId=...` — body is a source
- `GET /sources?initiativeId=...[&type=meeting_note]`
- `POST /events?initiativeId=...` — body is an event
- `GET /events?initiativeId=...[&status=CURRENT][&eventType=DECISION]`
- `POST /constraints?initiativeId=...` / `GET /constraints?initiativeId=...[&status=ACTIVE]`
- `POST /contradictions?initiativeId=...` / `GET /contradictions?initiativeId=...[&unresolved=true]`

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
  controller/   REST endpoints (Jira passthrough + initiative-scoped CRUD)
  service/      Initiative scoping - assigns ids, stamps initiativeId, filters reads
  entity/       JPA entities for the decision model (Initiative, Source, Event, Constraint,
                Contradiction) - everything but Initiative carries an initiativeId
  repository/   Spring Data repositories for the entities above
  dto/          Shared data shapes (NormalizedSource — the common shape every source adapter
                will produce)
```

## Rules compliance (per Hackathon 2K26 rules doc)

- No company Jira/GitHub credentials or real tickets/commits anywhere in this repo — Jira
  integration must point at a personal sandbox, not `leadrat-team.atlassian.net` or any other
  company system.
- No secrets committed — all credentials are environment variables, `.gitignore` excludes `.env`.
- Sample/demo data used elsewhere in this project (fixtures, if added) is entirely synthetic.
