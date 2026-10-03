# System Architecture — Demo Engineering Command Centre (MB IQ)

**Author:** Kone (with Claude) · **Date:** 2026-06-19 · **Branch:** `Kone's-branch`

---

## 1. High-level shape

```
                         Firm domain (HTTPS)
                                │
                ┌───────────────┴───────────────┐
                │      Frontend (React SPA)      │   static assets, served by the firm's web server
                │  React + TS + Vite + Router    │
                └───────────────┬───────────────┘
                                │  REST/JSON + Bearer JWT
                ┌───────────────┴───────────────┐
                │     Backend (Express API)      │
                │  TypeScript · RBAC middleware  │
                │  AuthProvider (SSO-ready)      │
                │  Anthropic AI service          │
                └───────┬───────────────┬────────┘
                        │               │
            ┌───────────┴───┐     ┌─────┴───────────────┐
            │  Prisma ORM   │     │  Anthropic API      │
            │  SQLite now → │     │  (ANTHROPIC_API_KEY)│
            │  org DB later │     └─────────────────────┘
            └───────────────┘
```

## 2. Layers and responsibilities

**Frontend (`frontend/`).** Single-page React app. Holds the JWT in memory/session, calls the REST
API, and renders a different dashboard per role using the shared role config. Responsive layout works
on desktop and tablet, Windows and Apple.

**Backend (`backend/`).** Express REST API in TypeScript. Responsibilities split by folder:
- `config/` — environment loading and the **single source of truth for RBAC** (`rbac.ts`).
- `auth/` — `AuthProvider` interface + `LocalAuthProvider` (JWT). An `SsoAuthProvider` will implement
  the same interface for the organisation's identity provider with no controller changes.
- `middleware/` — `authMiddleware` (verify JWT) and `requirePermission`/`requireTier` (RBAC guards).
- `services/` — `anthropic.service.ts` (AI) and `report.service.ts` (PDF reports).
- `routes/` — auth, projects, tasks, notes, AI. Thin handlers that call Prisma + services.
- `db/` — Prisma client singleton and the seed script.

**Data (`backend/prisma/`).** Prisma schema models Users, Projects, Sprints, Tasks, Documents,
Meetings, Messages, and Notes. SQLite is the demo datasource; the organisation's database is adopted
later by changing the `datasource` provider and `DATABASE_URL` only.

## 3. Authentication & authorisation flow

1. User signs in. Today: `LocalAuthProvider` checks credentials and issues a JWT containing the user
   id and **role tier**. Later: `SsoAuthProvider` validates the org SSO assertion and issues the same
   shaped JWT.
2. Every API request carries `Authorization: Bearer <jwt>`. `authMiddleware` verifies it and attaches
   the user to the request.
3. RBAC guards check the user's tier/permissions (from `rbac.ts`) before the handler runs. The
   General-Firm tier is limited to read-only progress endpoints plus posting notes.

## 4. AI architecture (Anthropic)

`anthropic.service.ts` wraps the Anthropic SDK and exposes four capabilities required by the brief:
- **Thread summarization** — condense message threads/meeting transcripts.
- **Automated task handling** — turn discussion/notes into structured, assignable tasks.
- **PDF reports** — generate high-quality, downloadable report content (rendered to PDF by
  `report.service.ts`).
- **AI Coach** — analyse workload across users/tasks and advise on prioritisation.

If `ANTHROPIC_API_KEY` is absent (e.g. before the key is supplied), the service returns clearly
labelled deterministic fallback output so the app remains demonstrable.

## 5. Deployment intent

- Build the frontend to static assets; serve behind the firm's domain.
- Run the Express API as a service on the internal server.
- Point Prisma at the organisation's database; switch auth to the organisation's SSO.
- Secrets (Anthropic key, DB URL, JWT secret, SSO config) supplied via server environment, never
  committed.

## 6. Why these choices satisfy the brief

- **Cross-platform / various devices:** a browser-based SPA needs no per-OS install.
- **Org credentials only / hosted on firm server:** SSO-ready auth + static+API deployment model.
- **Plug-and-go database:** Prisma's provider abstraction makes the DB swap a configuration change.
- **Neat structure & audit trail:** responsibility-based folders, mandatory attribution comments,
  and disciplined commits on `Kone's-branch`.
