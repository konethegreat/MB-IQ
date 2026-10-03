# MB IQ — v0.6: Diagram Studio, Structured AI Output & Agent Intelligence

> Design + milestone doc maintained by **Kone & Claude**. Companion to `00-PROJECT-PLAN.md`,
> `01-ARCHITECTURE.md`, `02-V0.2-PROGRESS.md`, `03-MCP-HOST.md`. Date: 2026-06-21.
> **Status: IMPLEMENTED (v0.6). Both apps type-check clean; deterministic generators smoke-tested (`npm run smoke:insights`).**
> **Scope note: this is the FINAL planned feature set for MB IQ. No further features are planned after v0.6.**

## 1. Goal

Make **everything the AI produces structured and visibly rendered**, and extend the Command Centre Agent
with **diagram** and **insight** capabilities. Grounded in current practice (June 2026):

- **Diagrams-as-code with AI:** Mermaid is the pragmatic choice for LLM-generated diagrams rendered inline
  in a web app (best model familiarity, no build step). D2 looks nicer but is less "LLM-known."
- **Structured output over markdown blobs:** emit a defined artifact and render it; structured/rendered
  output is strongly preferred over raw model text.
- **AI in PM/dev tools:** the headline features are risk/delay prediction, automated standups (RAG status),
  and status aggregation — all of which map directly onto MB IQ's projects/tasks/sprints data.

Four capability groups ship together (built in dependency order **B → A → C → D**):

| Group | Capability | Where it is visible |
|-------|-----------|---------------------|
| **B** | Structured AI output + on-brand PDF | Agent, Meetings, Docs, Reports, every PDF |
| **A** | Diagram Studio (Mermaid) | New **Diagrams** page; embedded in Docs/Reports/Agent replies |
| **C** | Agent intelligence (risk radar, auto standup, more read tools) | Dashboards, Agent, Communication, reports |
| **D** | Persist AI artifacts | Documentation centre |

## 2. Backbone decision — the Markdown + Mermaid artifact format

The single cross-cutting decision: **every AI artifact is Markdown (GitHub-flavoured) with fenced
` ```mermaid ` diagram blocks.** This is the de-facto AI-artifact format, it renders identically on screen
and in PDF, and the agent/docgen already emit markdown-ish text. Two shared primitives render it:

- **`frontend/src/components/Mermaid.tsx`** — renders Mermaid source → SVG, themed to navy/lime, and
  **catches syntax errors** (shows the source + a friendly message) so one bad diagram never breaks a page.
- **`frontend/src/components/RichContent.tsx`** — renders Markdown + GFM tables + ` ```mermaid ` fences
  (delegating fenced blocks to `<Mermaid>`). **Replaces every `<pre>` AI dump** (Agent reply, meeting
  pack, documentation view, report preview).

## 3. Group B — Structured output + PDF (foundation, built first)

- Wire `<RichContent>` into `AgentPage`, `MeetingIntelligencePage`, `DocumentationPage`, `ReportsPage`.
- **Rebuild `backend/src/services/report.service.ts`:** on-brand **navy `#071B33` + lime `#ADD135`**, real
  headings / bullets / numbered lists / **tables** / code (parsed from markdown via the `marked` lexer),
  **page numbers**, a KPI strip, and **embedded diagram images**.
- **Diagram-in-PDF flow (no puppeteer):**
  - `POST /api/ai/report` now returns the **markdown artifact** (`{ artifact }`) instead of streaming a PDF.
  - New `POST /api/ai/report/pdf { title, markdown, images[] }` streams the PDF. The **client renders each
    mermaid block to PNG** and posts them; the backend embeds them at the block positions.
  - The Final Leader "Board Report" button chains generate → pdf.
- AI prompts updated to emit clean Markdown; the existing no-API-key fallbacks are preserved (wrapped into a
  single-section artifact).

## 4. Group A — Diagram Studio (Mermaid)

- **New page `frontend/src/pages/DiagramsPage.tsx`** (nav item; gated `doc:view`, AI generation needs
  `ai:use`): diagram-type picker, live `<Mermaid>` preview, **Edit source** textarea (live re-render),
  **Regenerate**, **Export PNG**, **Export PDF**, **Save to Docs**.
- **`backend/src/services/diagram/` generators:**
  - **ER / database** — parse `prisma/schema.prisma` models/fields/relations → Mermaid `erDiagram`
    (deterministic, accurate, works offline).
  - **Org / RBAC chart** — from the users table → tiers + squads (deterministic).
  - **Sprint Gantt** — from sprints + task due dates → `gantt` (deterministic).
  - **Architecture / flow / sequence / custom** — **AI-generated** Mermaid from context/prompt, **validated**
    (must parse as a known Mermaid type) with a deterministic fallback.
- **Route** `backend/src/routes/diagrams.routes.ts`: `GET /api/diagrams/:kind` (deterministic),
  `POST /api/diagrams/generate` (AI/custom).
- **Agent tools** `generate_er_diagram`, `generate_org_chart`, `generate_gantt`,
  `generate_architecture_diagram` (read-only) — so **diagrams also appear inside agent replies**.

## 5. Group C — Agent intelligence

- **More read tools** in `internalProvider.ts`: `list_sprints`, `team_workload`, `overdue_tasks`,
  `project_health` (raises the visible capability count; richer answers).
- **Risk & delay radar** — `backend/src/services/insights/risk.ts` computes per-project RAG from
  overdue / blocked / velocity / due-proximity (deterministic core; optional AI narrative). Route
  `GET /api/insights/risk`; agent tool `assess_risk`; **visible as a "Risk Radar" widget on the Final
  Leader + Squad Leader dashboards** and as a report section.
- **Auto standup / RAG digest** — `backend/src/services/insights/standup.ts` builds a per-team digest
  (in progress / blocked / due soon / asks). Route `GET /api/insights/standup`; agent tool
  `generate_standup`; **visible as a "Generate standup" button** → `<RichContent>` → **"Post to channel"**
  (reuses the messages API).

## 6. Group D — Persist AI artifacts

- **Reuse the existing `Document` model — no Prisma migration.** Save diagrams/reports as Documents with
  `type` = `Diagram` / `AI Report` and `content` = markdown + mermaid. The Documentation centre renders them
  via `<RichContent>`, so a saved diagram displays live.
- **"Save to Docs"** on the Diagrams page, Reports, and agent replies (`POST /api/documents`, `doc:manage`).

## 7. RBAC & visibility matrix

| Capability | Visible at | Permission |
|-----------|-----------|------------|
| Diagrams page (view deterministic diagrams) | Diagrams nav | `doc:view` (Tiers 1–4) |
| AI-generated diagrams / agent / reports | Diagrams, Agent, Reports | `ai:use` |
| Risk Radar widget | Final Leader + Squad Leader dashboards | `report:view` |
| Generate standup + post | Team dashboards / Communication | `ai:use` + `comm:participate` |
| Save artifact to Docs | Diagrams / Reports / Agent | `doc:manage` |
| Report PDF | Reports / dashboards | `report:generate` |

## 8. Error handling & offline behaviour

- `<Mermaid>` catches syntax errors and shows the source + message.
- AI-diagram output is validated; invalid output falls back to a deterministic diagram or a minimal valid one.
- The PDF tolerates missing images (renders a placeholder note).
- **All deterministic generators (ER, org, gantt, risk, standup) work with no `ANTHROPIC_API_KEY`**, keeping
  the project's offline-fallback guarantee. AI features degrade to labelled fallbacks as today.

## 9. DRY & boundaries

- `<Mermaid>` and `<RichContent>` are the only renderers, reused everywhere.
- `services/diagram/` and `services/insights/` are the single home for generation logic; **agent tools are
  thin wrappers** over those services (no duplicated logic).

## 10. New dependencies

- Frontend: `mermaid`, `react-markdown`, `remark-gfm`.
- Backend: `marked` (markdown lexer for the PDF renderer).

## 11. File inventory (new / changed)

**Frontend (new):** `components/Mermaid.tsx`, `components/RichContent.tsx`, `pages/DiagramsPage.tsx`.
**Frontend (changed):** `AgentPage.tsx`, `MeetingIntelligencePage.tsx`, `DocumentationPage.tsx`,
`ReportsPage.tsx`, `FinalLeaderDashboard.tsx` + `SquadLeaderDashboard.tsx` (Risk Radar / standup),
`App.tsx` + `config/roles.ts` + `Sidebar` (Diagrams nav), `api/client.ts` (PNG-post helper if needed),
`styles.css`.
**Backend (new):** `services/diagram/*`, `services/insights/*`, `routes/diagrams.routes.ts`,
`routes/insights.routes.ts`.
**Backend (changed):** `report.service.ts` (rebuild), `routes/ai.routes.ts` (report split),
`services/agent/internalProvider.ts` (+diagram/insight tools), `server.ts` (mount routes).
**Docs:** this file (finalised post-build), root + frontend + backend `claude.md` (v0.6 entries).

## 12. Verification plan

- `tsc --noEmit` clean on both apps; `npm run db:verify` still green.
- A small backend smoke script exercises the deterministic generators (ER / org / gantt) with no API key.
- Manual pass: generate each diagram type; a report PDF with an embedded diagram; an agent reply that
  returns a diagram; save an artifact to Docs and re-open it; Risk Radar widget; standup → post to channel.

## 13. Run notes

```
cd backend && npm install        # adds: marked
npm run dev
cd ../frontend && npm install     # adds: mermaid, react-markdown, remark-gfm
npm run dev
```
No database migration is required (Group D reuses the existing `Document` model).

## 14. Final-scope note

v0.6 is the **last planned feature set**. After it ships, work shifts to hardening/deployment only
(connect the live GitHub MCP server, swap SQLite → org DB, local auth → org SSO, deploy to the firm server)
— **no new features**.
