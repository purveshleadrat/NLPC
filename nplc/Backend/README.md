# Product memory — Hackathon 2K26

Backend for "Never Lose Product Context" — a source-backed decision timeline for one product
initiative. Spring Boot + Maven.

## Setup

Requires Java 17+ and Maven (or Docker, see below). Database is Postgres, hosted on Supabase.

```bash
git clone <this-repo-url>
cd product-memory
```

Set these environment variables before running (never point Jira/GitHub vars at a company
site or repo — use your own free personal Jira Cloud sandbox and a personal GitHub repo):

```bash
# Supabase (Project Settings > Database > Connection string > JDBC). Use the SESSION
# pooler / direct connection on port 5432 - the transaction pooler on 6543 breaks
# Hibernate prepared statements.
export SUPABASE_DB_URL=jdbc:postgresql://db.yourproject.supabase.co:5432/postgres?sslmode=require
export SUPABASE_DB_USERNAME=postgres
export SUPABASE_DB_PASSWORD=your_db_password

export JIRA_SITE_URL=https://yoursandbox.atlassian.net
export JIRA_EMAIL=you@example.com
export JIRA_API_TOKEN=your_personal_api_token

export GITHUB_TOKEN=your_personal_access_token
export GITHUB_OWNER=your_github_username
export GITHUB_REPO=your_sandbox_repo

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
- `GET /jira/tickets/{key}` — fetch one ticket by its exact key (e.g. `CJ-01` never matches `CJ-011`)
- `GET /github/branches` — list branches on the connected repo
- `GET /github/branches/{name}` — fetch one branch by its exact name (e.g. `CJ-01` never matches `CJ-011`)
- `GET /tickets/{key}` — combined lookup: the Jira ticket and the GitHub branch of the same
  exact name, since a branch is expected to be named identically to its ticket key. Each
  lookup is upserted into the `ticket_branch_links` table in Supabase.

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
  controller/   REST endpoints - JiraController, GitHubController and TicketController
                (combines the two by exact ticket key), plus initiative-scoped CRUD
  service/      Initiative scoping - assigns ids, stamps initiativeId, filters reads
  entity/       JPA entities for the decision model (Initiative, Source, Event, Constraint,
                Contradiction) - everything but Initiative carries an initiativeId.
                TicketBranchLink is wired up via TicketController.
  repository/   Spring Data repositories for the entities above
  dto/          Shared data shapes (NormalizedSource — the common shape every source adapter
                will produce)
```

Database is Supabase (hosted Postgres) — see `SUPABASE_DB_URL`/`SUPABASE_DB_USERNAME`/
`SUPABASE_DB_PASSWORD` above. `spring.jpa.hibernate.ddl-auto=update` creates/updates tables
(including `ticket_branch_links`) automatically on startup.
## Deployment

Deployed as a Docker container (see `Dockerfile`) on [Render](https://render.com):

- Root Directory: `nplc/Backend`
- Language: `Docker`
- Env vars: same as local setup above (`SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`,
  `SPRING_DATASOURCE_PASSWORD`, `ANTHROPIC_API_KEY`, `JIRA_SITE_URL`, `JIRA_EMAIL`,
  `JIRA_API_TOKEN`) added in the Render dashboard, not committed

## Rules compliance (per Hackathon 2K26 rules doc)

- No company Jira/GitHub credentials or real tickets/commits anywhere in this repo — Jira and
  GitHub integrations must point at personal sandboxes, not `leadrat-team.atlassian.net`,
  a company GitHub org, or any other company system.
- No secrets committed — all credentials are environment variables, `.gitignore` excludes `.env`.
- Sample/demo data used elsewhere in this project (fixtures, if added) is entirely synthetic.
