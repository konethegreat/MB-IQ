# claude.md — BACKEND context (MB IQ API)

> Maintained by **Kone & Claude**. Companion to the root and frontend `claude.md` files.

## Purpose

Node.js + Express + TypeScript REST API for the Demo Engineering Command Centre. Owns authentication,
RBAC, data access (Prisma), and the Anthropic AI service.

## Folder map (`backend/src/`)

| Path | Responsibility |
|------|----------------|
| `server.ts` | App entry: middleware, route mounting, start-up. |
| `config/env.ts` | Loads and validates environment variables (incl. `ANTHROPIC_API_KEY`). |
| `config/rbac.ts` | **Single source of truth** for the 5 tiers, permissions, and tier→permission map. |
| `auth/auth.provider.ts` | `AuthProvider` interface — the seam for SSO later. |
| `auth/local.provider.ts` | Local JWT provider used today. |
| `middleware/auth.middleware.ts` | Verifies the Bearer JWT, attaches `req.user`. |
| `middleware/rbac.middleware.ts` | `requireTier` / `requirePermission` guards. |
| `services/anthropic.service.ts` | AI: summaries, task handling, PDF report content, AI Coach. |
| `services/report.service.ts` | Renders a Markdown artifact (`marked`) → on-brand PDFKit PDF: headings/tables/page-numbers + embedded diagram images. |
| `routes/*.routes.ts` | auth, projects, sprints, tasks, users, documents, messages, meetings, notes, ai, **settings**, **agent**, **system**, **diagrams**, **insights**. Thin handlers → Prisma + services. |
| `services/agent/*` | MCP Host: tool-provider seam, internal provider, env-ready GitHub MCP provider, registry, agent tool-use loop (Human-in-the-Loop). |
| `services/diagram/*` | Diagram engine: deterministic ER (parses `schema.prisma`), org/RBAC chart, sprint Gantt + AI architecture/custom Mermaid. |
| `services/insights/*` | Deterministic delivery risk radar + standup/RAG digest (no AI; agent + dashboards consume them). |
| `services/settings.service.ts` / `usage.service.ts` | AI execution mode (Max/Saver) + token/cost accounting. |
| `services/classification.service.ts` / `ingest.service.ts` | AI auto-triage + document ingestion (PDF via lazy pdf-parse). |
| `db/repos.ts` | Typed bridge for v0.3 models so the app compiles before `prisma generate`. |
| `db/prisma.ts` | Prisma client singleton. |
| `db/seed.ts` | Seeds the 5-tier demo users + a deterministic demo dataset (projects across both teams, sprints, a spread of tasks incl. blocked/overdue/unassigned, documents, channel messages, a meeting). |
| `prisma/schema.prisma` | Data model. SQLite now; swap provider for org DB later. |

## Conventions

- Use Node 22.12 or newer. CI verifies the synthetic seeded users, deterministic
  generators, compilation and the dependency audit.

- Mandatory attribution comment on every functional block:
  `// Code written by Kone & Claude | The code does the following: " [Explanation] "`
- All handlers are guarded by `authMiddleware` + an RBAC guard unless explicitly public.
- Never read secrets except through `config/env.ts`.

## Scripts (`package.json`)

- `npm run dev` — start API with hot reload (tsx).
- `npm run db:setup` — `prisma generate` + `prisma db push` + seed.
- `npm run build` / `npm start` — compile and run.

## Database plug-and-go

Demo uses `provider = "sqlite"` + `DATABASE_URL="file:./prisma/dev.db"`. To adopt the organisation's
DB later: change the provider to `postgresql`/`mysql`, set `DATABASE_URL`, run `prisma db pull` (or
map to the existing user table), and `prisma generate`. No route/service code changes required.

## SSO-ready auth

`LocalAuthProvider` implements `AuthProvider` today. Add `SsoAuthProvider` implementing the same
interface; switch the provider wired in `server.ts`. JWT shape (id + role tier) stays identical, so
middleware and routes are untouched.

## Status log

Public snapshot maintenance (5 October 2026): `npm run test:workflow` uses a
fresh temporary SQLite database and the real HTTP API. It runs `db:verify` and
`smoke:insights` before the delivery/role assertions. Shared write scope lives in
`middleware/team-scope.ts`; sprint creation and every existing task context are
checked. Task creation now persists `sprintId`. CI checks Windows/Linux and Node
22/24. Use the current synthetic walkthrough for safe local setup.

| Date | Note |
|------|------|
| 2026-06-19 | Backend foundation scaffolded by Kone & Claude: server, RBAC, SSO-ready auth, Prisma schema, AI service, core routes, seed. |
| 2026-06-19 | Security hardening pass (Kone & Claude): removed hardcoded JWT secret fallback (prod hard-fails, dev uses an ephemeral random secret); pinned JWT verify to HS256; team-scoped the AI Coach + task create/update so a captain can't reach another team's data; project detail returns a progress-only summary (no document contents) to the read-only General Firm tier; login no longer leaks internal error messages. |
| 2026-06-20 | v0.3 MCP Host (Kone & Claude): added the agent tool-provider framework + internal/GitHub-MCP providers + agent loop with a server-enforced Human-in-the-Loop approval layer (destructive tools persist as PendingAction and execute only on manager approval); AI auto-classification; documentation engine (ingest/generate/search); Tier-2 settings with cost analytics + Max/Saver. New Prisma models accessed via a typed repo bridge until `prisma generate`. New env: GITHUB_MCP_URL, GITHUB_MCP_TOKEN. |
| 2026-06-20 | v0.4 (Kone & Claude): dashboard filters (team/priority), dual USD/ZAR settings, selectable AI model, `/api/system/status`, enhanced MCP health probe, Tier-5 AI-organised notes (`/api/notes/mine`), Squad Leader assignment to captains + engineers. New env: USD_ZAR_RATE. Schema: AppSettings (aiModel, currency, monthlyBudgetZar), Note (subject, summary). |
| 2026-06-21 | v0.5 (Kone & Claude): **SECURITY** — `/api/health` & `/api/system/status` no longer return the API key hint; removed the dead `maskApiKey` helper. Seed rewritten: **six engineers, two as Tier-3 Team Leads** (`engineer1`=Alpha, `engineer4`=Apex), 3 per squad; Demo Manager A/Demo Manager B `team="Management"` (joint admins over both squads); seed prunes stale accounts but never one holding notes; `db:verify` roster updated to match. `ROLE_LABEL.TEAM_CAPTAIN` → "Team Lead" (key unchanged). Cross-team **reads** stay open (to power the read-only other-team view); **writes** remain team-scoped. Run `npm run db:seed` after pull. |
| 2026-06-21 | v0.6 (Kone & Claude): **Diagram engine** (`services/diagram/*`) — deterministic ER (parses `schema.prisma`) / org / Gantt + AI architecture/custom Mermaid; `GET /api/diagrams/:kind`, `POST /api/diagrams/generate`. **Insights** (`services/insights/*`) — deterministic risk radar + standup; `GET /api/insights/risk|standup`. The embedded agent gained diagram + insight read-tools. **PDF rebuilt:** `report.service.ts` renders Markdown via `marked` → on-brand PDFKit with page numbers + embedded diagram PNGs; `/api/ai/report` now returns a Markdown artifact and `/api/ai/report/pdf` streams the PDF. New dep: `marked`. Smoke test: `npm run smoke:insights`. No DB migration (Save-to-Docs reuses `Document`). |
| 2026-06-20 | v0.2 (Kone & Claude): added RBAC-guarded routes — GET /api/users (task:view, safe fields only), documents (doc:view/doc:manage), messages (comm:participate), meetings list (ai:use), sprints (sprint:view/sprint:manage); added doc:view/doc:manage/comm:participate to the RBAC table; expanded the seed into a deterministic demo dataset. |
