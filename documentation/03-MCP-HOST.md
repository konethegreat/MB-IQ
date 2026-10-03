# MB IQ — v0.3: MCP Host, Human-in-the-Loop & AI Activation

> Milestone doc maintained by **Kone & Claude**. Companion to `00-PROJECT-PLAN.md`, `01-ARCHITECTURE.md`,
> `02-V0.2-PROGRESS.md`. Date: 2026-06-20.

## What v0.3 adds

v0.3 turns the command centre into an **MCP Host** with an embedded agent, activates the AI key beyond
text generation, and adds a strict **Human-in-the-Loop (HITL)** safety boundary.

### Core — MCP Host + HITL agent (`backend/src/services/agent/`)
- `toolProvider.ts` — the provider seam (mirrors the SSO `AuthProvider` pattern). Tools are flagged
  read-only vs **destructive**.
- `internalProvider.ts` — always-on tools over our own DB: read-only (`list_projects`, `list_open_tasks`,
  `search_documents`) run autonomously; state-changing (`create_task`, `update_task_status`) are
  destructive and must be approved.
- `githubMcpProvider.ts` — makes the backend an **MCP client** of the org's GitHub MCP server. Env-gated
  (`GITHUB_MCP_URL` + `GITHUB_MCP_TOKEN`); contributes repo/issue/PR tools when configured, nothing when
  not. The MCP SDK is lazily imported so the core build never depends on it.
- `registry.ts` — aggregates configured providers, qualifies tool names (`provider__tool`), routes calls.
- `agentLoop.ts` — Claude tool-use loop: read-only tools execute and feed results back; **destructive
  tools are never executed during planning** — a `PendingAction` is persisted and the model is told it is
  queued. Honors Max/Saver mode; records usage under the `agent` feature.
- API (`routes/agent.routes.ts`): `POST /api/agent/ask`, `GET /api/agent/tools`, `GET /api/agent/pending`,
  `POST /api/agent/actions/:id/approve|reject`. **Approve/Reject require `task:manage`** and approval is
  the ONLY path that executes a destructive tool. UI: `frontend/src/pages/AgentPage.tsx` with approval cards.

### Phase 2 — AI auto-classification
`aiService.classify()` + `Classification` model. Incoming notes are auto-categorised/tagged/triaged on
creation (`POST /api/notes`), shown in the IT inbox, with reclassify (`POST /api/notes/:id/reclassify`)
and a utility `POST /api/ai/classify`.

### Phase 3 — Documentation engine (Tiers 1-4)
`POST /api/documents/ingest` (text/markdown/code + PDF via lazy `pdf-parse`), `POST /api/documents/generate`
(AI specs/post-mortems/guides/schemas from live system state + source material), `GET /api/documents/search`
(retrieval index for the agent). UI: Write / Import / AI-Generate modes + search.

### Phase 4 — Tier-2 Settings, Cost & Max/Saver (`settings:manage`, Tiers 1-2)
`AppSettings` + `AiUsage` models; usage + cost recorded on every AI call; `GET/PUT /api/settings` and
`GET /api/settings/usage`. UI: `SettingsPage.tsx` — Max/Saver toggle, monthly budget, live token/cost
analytics. **Max** uses the high-context model + full budget; **Saver** switches to a lightweight model,
compresses prompts and caps output.

### Phase 1 — UI
Carries the v0.2 fluid design system (navy + `#ADD135`), spacious grids, `table-wrap` overflow handling,
chips/tooltips and animated KPI/progress widgets so telemetry stays readable.

## Safety model (important)
- Destructive agent actions **never auto-execute**. They are persisted as `PendingAction(PENDING)` and only
  run when a manager approves, via the dedicated approve route. Rejection executes nothing.
- RBAC is enforced server-side on every route. The GitHub MCP token lives only in the untracked `.env`.

## The Prisma "repo bridge" (`backend/src/db/repos.ts`)
New models are accessed through an explicitly-typed bridge so the project compiles BEFORE `prisma generate`
runs. After migration the real generated delegates satisfy the same shapes — no call-site changes.

## REQUIRED to run v0.3 on your machine
```
cd backend
npm install                 # installs @modelcontextprotocol/sdk + pdf-parse (new deps)
npm run db:setup            # prisma generate + db push (creates AppSettings/AiUsage/Classification/PendingAction) + seed
npm run dev                 # API on :4000

cd ../frontend
npm install
npm run dev                 # app on :5173
```
To enable live GitHub tools, add to `backend/.env` (never commit):
```
GITHUB_MCP_URL=<your org GitHub MCP server URL>
GITHUB_MCP_TOKEN=<token>
```
Without them the agent still works with internal tools; with them, GitHub repo/issue/PR tools appear
automatically behind the same HITL approval gate.

## Verification status
- `tsc --noEmit` passes clean for both `frontend/` and `backend/` (the lazy SDK/PDF imports + repo bridge
  keep the build green pre-install/pre-migrate).
- Runtime is verified on the developer machine after `npm install` + `npm run db:setup` (the sandbox can't
  run platform-native binaries).
