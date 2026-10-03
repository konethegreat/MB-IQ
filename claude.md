# claude.md — ROOT context (Demo Engineering Command Centre)

> Living context file. Maintained continuously by **Kone & Claude** so project context is never lost.
> There are three of these files: root (this one), `frontend/claude.md`, and `backend/claude.md`.

---

## 1. What this project is

The **Demo Engineering Command Centre** ("MB IQ") is an internal web application for the organisation's
IT division. It is the daily operating system for the software engineering department: projects,
sprints/tickets (Jira-inspired), documentation, meeting intelligence, team communication, and an
embedded AI assistant.

It will be **hosted on the firm's own server under the firm's domain**, authenticate via
**organisation credentials (SSO)**, and **plug into the organisation's existing user database**.

## 2. Chosen technology stack (decided 2026-06-19)

Maintenance update (3 October 2026): the public snapshot uses Vite 7 and React
Router 7 with Node 22.12 or newer. Both dependency audits are checked in CI.

| Layer | Choice | Why |
|-------|--------|-----|
| Frontend | React 18 + TypeScript + Vite + React Router | Browser-based ⇒ cross-platform (Windows, macOS, Linux, tablets) with one codebase. Fast, well-supported, easy to host as static assets behind the firm's domain. |
| Backend | Node.js + Express + TypeScript | Same language across the stack; simple to deploy on an internal server; pairs cleanly with the Anthropic Node SDK. |
| ORM / DB | Prisma ORM, SQLite for the demo | **Plug-and-go:** the demo runs on a zero-config SQLite file to prove the system works. Switching to the organisation's Postgres/MySQL later is a `datasource` provider + `DATABASE_URL` change — no application code rewrite. |
| Auth | JWT local auth now, behind an `AuthProvider` interface | Org wants **SSO later**. We ship working local auth today; an `SsoAuthProvider` (SAML/OIDC) drops into the same interface with no controller changes. |
| AI | `@anthropic-ai/sdk` against `ANTHROPIC_API_KEY` env placeholder | Key is supplied later via untracked `.env`; never committed. |

## 3. RBAC — the 5 tiers (single source of truth: `backend/src/config/rbac.ts`)

| Tier | Role key | People | Access summary |
|------|----------|--------|----------------|
| 1 | `FINAL_LEADER` | Demo Final Leader | Full oversight; all dashboards & reports. Everyone reports up to Tier 1. |
| 2 | `SQUAD_LEADER` | Demo Manager A, Demo Manager B (team = "Management") | **Joint admins over both squads**; assign/manage work for anyone — including the Team Leads. |
| 3 | `TEAM_CAPTAIN` *(displayed as "Team Lead")* | 2 of the 6 engineers (one per squad) | Lead **and deliver** within their squad; manage their squad's tasks/sprints; **read-only** view of the other squad. |
| 4 | `SOFTWARE_ENGINEER` | the other 4 of the 6 engineers | Work their own tasks; see their squad + a **read-only** peek at the other squad to help. |
| 5 | `GENERAL_FIRM` | rest of firm (group) | **Read-only** project progress + leave brief notes for IT. |

**Engineering structure:** six software engineers total (`engineer1`–`engineer6`), **two of them Team Leads** — `engineer1` leads **Team Alpha**, `engineer4` leads **Team Apex** — so each squad = **1 lead + 2 engineers = 3 members**. The Tier-3 role *key* stays `TEAM_CAPTAIN` (to avoid churn) but is **labelled "Team Lead"** everywhere via the single-source `ROLE_LABEL`. Team visibility: Tiers 3 & 4 default to their own squad and can switch to a read-only view of the other squad; Tiers 1 & 2 see everything. Backend already enforces this — cross-team **writes** are blocked, **reads** are open so the other-team peek works.

## 4. Coding conventions (MANDATORY)

Every functional block of code MUST begin with this exact attribution comment so reviewers have a
clear trail of Kone's work:

```
// Code written by Kone & Claude | The code does the following: " [Explanation] "
```

- Neat, predictable file structure (feature/responsibility folders).
- TypeScript everywhere; explicit types on public functions.
- No secrets in code — only in untracked `.env`.

## 5. Version control workflow

- Active branch: **`Kone's-branch`** (the valid git form of "Kone's branch" — git forbids spaces).
- Commit **regularly** with detailed, accurate messages. Claude will remind Kone at each milestone.
- Push regularly for a clean audit trail.

## 6. Documentation rules

- Keep all three `claude.md` files updated as the system evolves.
- `documentation/` holds the project plan + architecture, and **PDF documentation generated at
  milestones** (system architecture + progress).

## 7. Status log

| Date | Milestone | Notes |
|------|-----------|-------|
| 2026-06-19 | Project kickoff & scaffold | Branch created, stack chosen, structure + docs + backend/frontend foundation laid by Kone & Claude. v0.1 prototype preserved in `prototype-v0.1/`. |
| 2026-06-20 | v0.2 — feature parity + tier dashboards + fluid UI | Kone & Claude: restored all nine original features as React pages; built five DISTINCT role dashboards (Tier 1–5); added backend routes (users, sprints, documents, messages, meetings); restored the navy + `#ADD135` identity as a fluid, reactive design system; re-aligned the login page. Both apps type-check clean (`tsc --noEmit`). |
| 2026-06-20 | v0.3 — MCP Host + HITL + AI activation | Kone & Claude: backend is now an MCP Host with an embedded agent (internal tools + env-ready GitHub MCP provider) behind a server-enforced Human-in-the-Loop approval layer; added AI auto-classification of incoming notes; an intelligent documentation engine (ingest/PDF + AI-generate + search index, Tiers 1-4); and a Tier-2 Settings panel with token/cost analytics + Max/Saver execution modes. New deps (@modelcontextprotocol/sdk, pdf-parse) and new Prisma models — run `npm install` + `npm run db:setup`. See `documentation/03-MCP-HOST.md`. |
| 2026-06-20 | v0.4 — filters, dual currency, model picker, connectivity | Kone & Claude: dashboard team/priority filters (Tiers 1–5); Tier-2 assignment to all six subordinates (captains + engineers); Settings dual USD/ZAR with model picker (not locked to Sonnet); `AiStatusBar` on every dashboard showing masked API key + active model + MCP health; Tier-5 AI-organised notes with `/api/notes/mine`; GitHub MCP env-ready with live connectivity probe. Run `npx prisma db push` after pull. |
| 2026-06-21 | v0.5 — security fix + correct org structure + team identity | Kone & Claude: **SECURITY** — removed the masked Anthropic API key from `/api/health`, `/api/system/status` and the `AiStatusBar` (it now shows only AI Connected / Not configured); deleted the dead `maskApiKey` helper. **Org model corrected (data-deep, not cosmetic):** seed now has **six software engineers, two of them Tier-3 Team Leads** (`engineer1`=Alpha, `engineer4`=Apex), 3 per squad; Demo Manager A & Demo Manager B are joint Tier-2 admins (team "Management"); the seed prunes stale accounts (old `captain1/2`) but never one holding notes; `db:verify` roster updated. `TEAM_CAPTAIN` is now **labelled "Team Lead"** via `ROLE_LABEL`. **Team identity:** Tiers 3 & 4 default to their own squad with a read-only `TeamScopeTabs` peek at the other squad (writes already team-scoped server-side). **DRY:** new shared helpers in `dashboards/shared.tsx` (`otherTeam`, `isSquadTeam`, `isLead`, `tasksForTeam`, `squadMembers`, `PriorityPill`) + `filterProjectsAndTasks`/`TeamScopeTabs` in `DashboardFilters.tsx`, removing copy-pasted filter logic. Run `npm run db:seed` after pull. |
| 2026-06-21 | v0.6 — Diagram Studio, structured AI output & agent intelligence (**FINAL feature set**) | Kone & Claude: **A) Diagram Studio** (`/diagrams`) — Mermaid diagrams via shared `<Mermaid>`: ER (parsed from the Prisma schema), org/RBAC chart and sprint Gantt are deterministic (no AI, offline-safe), plus AI architecture/custom diagrams; export PNG/PDF, save to Docs. **B) Structured AI output** — shared `<RichContent>` (Markdown + GFM + ```mermaid) replaces every `<pre>` dump (Agent/Meetings/Docs/Reports); the PDF was rebuilt on-brand (navy/lime) via `marked`→PDFKit with headings/tables/page-numbers and **embedded diagrams**; `/api/ai/report` now returns a Markdown artifact + new `/api/ai/report/pdf`. **C) Agent intelligence** — deterministic **Risk & Delay Radar** + **Auto Standup** (`/api/insights/*`, widgets on the leader dashboards) and new agent read tools (sprints, workload, overdue, project health) + diagram/insight tools. **D) Persist artifacts** — Save-to-Docs reuses the `Document` model (no migration). New deps: frontend `mermaid`/`react-markdown`/`remark-gfm`, backend `marked` — run `npm install` in both. See `documentation/04-AGENT-CAPABILITIES.md`. |

## 8. Roadmap (high level)

1. ✅ Foundation: structure, docs, RBAC config, SSO-ready auth, Prisma schema, AI service, frontend shell.
2. ✅ All REST endpoints wired to Prisma + five DISTINCT role-based dashboards (v0.2).
3. ✅ Jira-style delivery: sprint board, tasks, projects, statuses, ownership, sprints (v0.2).
4. ✅ Anthropic AI wired: meeting intelligence, AI Coach, PDF reports (live when `ANTHROPIC_API_KEY` is set; safe fallback otherwise).
5. ✅ MCP Host era (v0.3): embedded agent + Human-in-the-Loop, GitHub MCP provider (env-ready), AI auto-classification, documentation engine, Tier-2 cost/Max-Saver settings.
6. ✅ v0.4 polish (filters, ZAR currency, model picker, dashboard connectivity bar, Tier-5 note organisation).
7. ✅ v0.5 (security: API key no longer exposed on dashboards; org structure corrected to 6 engineers / 2 Team Leads / 3-per-squad; my-team-first visibility with read-only other-team peek; DRY dashboard helpers).
8. ✅ v0.6 — **FINAL feature set**: Mermaid Diagram Studio (ER/org/Gantt + AI), structured AI output (`<RichContent>`) + on-brand PDF with embedded diagrams, agent intelligence (Risk Radar, Auto Standup, more tools), persisted AI artifacts.
9. ⏳ **Hardening & deployment only — no new features**: connect the live GitHub MCP server (URL + token), swap SQLite → org DB, local auth → org SSO, deploy to the firm server.
