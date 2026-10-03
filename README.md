# MB IQ — Engineering Workspace

A development demonstration of an engineering team's command centre: projects,
sprints and tasks, five role-based dashboards, documentation, meeting notes,
diagrams, and an optional AI assistant with an approval layer for destructive tools.

Published by **Kone Tshivhinda** from his privately maintained source.
The original history is preserved privately. Demo users and organization labels
have been replaced with fictional examples; no operational database is included.

## Implemented scope

- Local JWT authentication and five role tiers, including team-scoped writes.
- Project and sprint tracking, tasks, documents, messages, and meeting records.
- Deterministic risk/standup views and Mermaid diagrams.
- Optional Anthropic-backed assistance and an environment-configured GitHub MCP provider.
- Human approval for the embedded agent's destructive tools.

Organization SSO and deployment to a production firm environment remain separate
integration work. The demo uses SQLite. Changing databases requires schema and
migration work; a build alone does not verify that migration.

## Stack

React 18, TypeScript, Vite 7, React Router 7, Express, Prisma 5, SQLite, Mermaid,
and optional Anthropic/MCP integrations. Use Node.js 22.12 or newer with the
committed package locks.

## Local demonstration

Use a new checkout and a disposable database:

```bash
git clone https://github.com/konethegreat/MB-IQ.git
cd MB-IQ/backend
npm ci
cp .env.example .env
# PowerShell: Copy-Item .env.example .env
```

In `backend/.env`, configure a newly generated `JWT_SECRET`, set
`ALLOW_DEMO_SEED=true`, and set `SEED_PASSWORD` to a separate random value
of at least 12 characters. Generate random values locally with:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Then:

```bash
npm run db:setup
npm run db:verify
npm run dev
# In a second terminal, from the repository root:
cd frontend
npm ci
npm run dev
```

The API defaults to http://localhost:4000; Vite prints the frontend URL.
Sign in with `leader@example.test`, `manager-a@example.test`, or a seeded
engineer such as `engineer1@example.test`, using your configured seed password.

Seeding resets the sample work tables. It refuses to run in production and
requires explicit opt-in. Keep it confined to a local disposable database.

## Optional providers

Leave `ANTHROPIC_API_KEY`, `GITHUB_MCP_URL`, and `GITHUB_MCP_TOKEN` empty
for a provider-free demo. Configuration belongs in the ignored `.env`.
AI actions and document processing can transmit supplied content to the configured
provider; use synthetic content while testing.

## Verification

```bash
# backend/
npm run build
npm run db:verify
npm run smoke:insights
# frontend/
npm run build
```

The login verification checks all ten seeded role accounts and wrong-password
rejection against the local database. The insights smoke test checks deterministic
demo behavior. These checks do not establish live provider behavior, organization
SSO, or production readiness.

See [PUBLICATION.md](PUBLICATION.md) for the snapshot record and
[documentation](documentation/) for architecture and implementation notes.
Existing Kone/Claude source attribution is retained.
