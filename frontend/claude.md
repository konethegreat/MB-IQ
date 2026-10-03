# claude.md — FRONTEND context (MB IQ web app)

> Maintained by **Kone & Claude**. Companion to the root and backend `claude.md` files.

## Purpose

React + TypeScript + Vite single-page app for the Demo Engineering Command Centre. Responsive, so it
runs on Windows, macOS, and any modern browser/tablet from one codebase.

## Folder map (`frontend/src/`)

| Path | Responsibility |
|------|----------------|
| `main.tsx` | App bootstrap + router. |
| `App.tsx` | Route table; wraps protected routes in the auth guard. |
| `api/client.ts` | Tiny fetch wrapper that attaches the JWT and talks to the API. |
| `auth/AuthContext.tsx` | Holds the signed-in user + token; login/logout. |
| `config/roles.ts` | Frontend mirror of the 5 RBAC tiers + which nav items each sees. |
| `components/Sidebar.tsx` | Role-aware navigation. |
| `components/ProtectedRoute.tsx` | Redirects unauthenticated users to login. |
| `pages/LoginPage.tsx` | Sign-in (org SSO button placeholder + demo credentials). |
| `pages/DashboardPage.tsx` | Dashboard ROUTER — renders a different dashboard per tier. |
| `pages/dashboards/*` | The five DISTINCT tier dashboards + `shared.tsx` (types, helpers, KPI/progress widgets). |
| `components/DashboardFilters.tsx` | Reusable team + priority filter bar for dashboards. |
| `components/AiStatusBar.tsx` | Live API/AI/model/MCP status strip on every dashboard (shows AI Connected / Not configured — never the key). |
| `components/Mermaid.tsx` | Shared Mermaid renderer (SVG, error fallback) + PNG rasteriser for PDF export. |
| `components/RichContent.tsx` | Renders AI Markdown + GFM tables + ```mermaid blocks — replaces the old `<pre>` dumps. |
| `components/pdfExport.ts` | Client PDF export: rasterise mermaid blocks → POST markdown + PNGs to the PDF endpoint. |
| `components/RiskRadar.tsx` / `components/StandupCard.tsx` | Risk & Delay radar + Auto Standup widgets (leader dashboards). |
| `pages/ProjectsPage.tsx` | Portfolio table + create (project:manage). |
| `pages/SprintBoardPage.tsx` | Kanban sprint board. |
| `pages/TasksPage.tsx` | Task table + create/status (task:manage / task:own). |
| `pages/DocumentationPage.tsx` | Documentation centre + add (doc:manage); renders saved docs/diagrams via `RichContent`. |
| `pages/DiagramsPage.tsx` | Diagram Studio — generate/edit/export ER, org, Gantt, architecture & custom Mermaid diagrams. |
| `pages/MeetingIntelligencePage.tsx` | Transcript (live speech / paste) → AI meeting pack + saved meetings. |
| `pages/CommunicationPage.tsx` | Channel feed + post (comm:participate). |
| `pages/InnovationPage.tsx` | Innovation/impact pipeline (report:view). |
| `pages/ReportsPage.tsx` | Department metrics + auto draft + PDF (report:generate). |
| `pages/AiAssistantPage.tsx` | Summaries, AI Coach, report generation. |
| `pages/NotesPage.tsx` | Leave-a-note + IT triage inbox. |
| `vite-env.d.ts` | Vite client types (import.meta.env). |
| `styles.css` | Fluid, reactive design system — navy `#071B33` + signature lime `#ADD135`. |

## Conventions

- Tooling: Vite 7 and React Router 7; use Node 22.12 or newer. CI builds the app
  and rejects moderate or higher dependency audit findings.

- Mandatory attribution comment on every functional block:
  `// Code written by Kone & Claude | The code does the following: " [Explanation] "`
- The frontend never decides permissions on its own authority — it mirrors `config/roles.ts` for UX,
  but the backend RBAC is the real gate.
- API base URL comes from `VITE_API_URL` (defaults to `http://localhost:4000`).

## Status log

| Date | Note |
|------|------|
| 2026-06-19 | Frontend foundation scaffolded by Kone & Claude: auth context, login, role-based dashboard, sprint board, AI assistant, notes view. |
| 2026-06-20 | v0.2 (Kone & Claude): restored all nine feature pages; built five DISTINCT tier dashboards under `pages/dashboards/`; rewrote `styles.css` as a fluid, reactive navy + `#ADD135` design system; re-aligned the login; per-route permission guards in `App.tsx`. |
| 2026-06-20 | v0.3 (Kone & Claude): added the Agent console (`AgentPage.tsx`) with Human-in-the-Loop approval cards, the Tier-2 Settings & cost panel (`SettingsPage.tsx`, Max/Saver), AI auto-triage chips on the Notes inbox, and Write/Import/AI-Generate modes on the Documentation engine. |
| 2026-06-20 | v0.4 (Kone & Claude): `DashboardFilters` + `AiStatusBar` on all tier dashboards; Settings USD/ZAR toggle + model picker; Tier-5 structured notes with AI feedback; Squad Leader assigns to captains + engineers. |
| 2026-06-21 | v0.5 (Kone & Claude): removed the API-key display from `AiStatusBar` (now AI Connected / Not configured only). Team identity: new `TeamScopeTabs` (My team / Other team — view only) on the Tier-3 Team Lead and Tier-4 Engineer dashboards; the Engineer dashboard gains a "My Team" panel; the Team Lead roster now includes the lead; Squad Leader assignment grouped by squad; "Team Captain" → "Team Lead" labels. DRY: shared `tasksForTeam`/`squadMembers`/`otherTeam`/`isSquadTeam`/`isLead`/`PriorityPill` in `dashboards/shared.tsx`, plus `filterProjectsAndTasks` + `TeamScopeTabs` in `DashboardFilters.tsx`, removing copy-pasted filter logic from the leader dashboards. |
| 2026-06-21 | v0.6 (Kone & Claude): **Diagram Studio** (`DiagramsPage` + shared `<Mermaid>`) — ER/org/Gantt (live data) + AI architecture/custom; export PNG/PDF, Save to Docs. **Structured AI output** — `<RichContent>` (Markdown + GFM + ```mermaid) replaces the `<pre>` dumps on Agent/Meetings/Docs/Reports; Reports rebuilt (generate artifact → live preview → on-brand PDF via `pdfExport` → Save to Docs). **Agent intelligence UI** — `RiskRadar` + `StandupCard` widgets on the Final Leader & Squad Leader dashboards (standup posts to a channel). New deps: `mermaid`, `react-markdown`, `remark-gfm` — run `npm install`. |
