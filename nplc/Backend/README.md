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
```

Run it:

```bash
mvn spring-boot:run
```

Server starts on `http://localhost:4000`.

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

## Rules compliance (per Hackathon 2K26 rules doc)

- No company Jira/GitHub credentials or real tickets/commits anywhere in this repo — Jira
  integration must point at a personal sandbox, not `leadrat-team.atlassian.net` or any other
  company system.
- No secrets committed — all credentials are environment variables, `.gitignore` excludes `.env`.
- Sample/demo data used elsewhere in this project (fixtures, if added) is entirely synthetic.
