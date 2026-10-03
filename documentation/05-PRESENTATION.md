# MB IQ Presentation

## 1. What MB IQ is

Demo Engineering Command Centre (MB IQ) is the internal IT division operating system. It brings together project management, sprint tracking, team communication, meeting intelligence, documentation, and AI assistance into one polished browser-based app.

This is not a prototype or an experiment. It is a fully designed internal command centre built for the firm’s domain, with the look and feel of a modern high-end enterprise tool and the power of embedded AI.

## 2. Why the system is compelling

- Built as a single SPA that works on Windows, macOS, and any modern browser.
- Designed for the firm’s own servers and internal network.
- Safer than generic SaaS because it can run behind the company firewall and use corporate SSO later.
- Does more than track tickets: it gives leaders actionable intelligence, supports every role with tailored dashboards, and makes AI feel like a trusted team member.

## 3. The five-tier role model

MB IQ is built around a clear internal hierarchy with tailored access for each role:

- **Final Leader** — full oversight, executive reporting, cross-team visibility.
- **Squad Leaders** — management of both squads, assignment power across the group.
- **Team Leads** — lead and deliver in their own squad, with read-only view into the other squad.
- **Software Engineers** — focused contributors with squad-level visibility and task ownership.
- **General Firm** — read-only progress visibility plus the ability to leave notes for IT.

That means everyone sees the data they need. Managers see the bigger picture. engineers see their team. the rest of the firm sees progress without being overwhelmed.

## 4. Dashboard and core pages

### Dashboard

Every user lands into a dashboard designed for their role. This is the heart of MB IQ — the place where the story of the work is visible at a glance.

- Role-specific dashboards for Tier 1–5.
- Leader dashboards include risk, delay and progress insights.
- Squad leaders and captains get squad-first views with a read-only peek at the other team.
- General Firm users get a clean status view plus a direct note channel to IT.

### Projects, Tasks, Sprints

Projects and tasks are treated like real work, not just data.

- Project lists and work breakdowns.
- Task boards and sprint tracking in Jira-inspired form.
- Sprint statuses, due dates, priorities and ownership all visible.
- Team-level scopes and sprint summaries keep focus on the right work.

### Notes and Communication

MB IQ gives the firm structured ways to capture what matters.

- Notes can be created, tagged and auto-classified.
- Communication channels keep team messages organized.
- Everything is connected to the workstream rather than buried in email.

### Meeting Intelligence

Meetings are not just logged; they are turned into value.

- Meeting transcripts and summaries.
- Action items surfaced automatically.
- Intelligence that turns conversation into work without manual re-entry.

### Documentation and Reports

The system is built to keep knowledge alive rather than lost.

- Documentation centre stores guides, decisions and saved AI artifacts.
- Reports are generated with a polished on-brand output style.
- Saved artifacts reuse the same document store, so diagrams, agent responses and reports are persistent.

### Innovation page

Innovation is supported with a clean space for ideas, proposals, and tracked improvements.

- Provides structure for new proposals.
- Keeps strategic thinking connected to execution.

## 5. Agent and AI capabilities

This is the part that truly flexes: MB IQ is not just a dashboard, it is an AI-enhanced command centre.

### Embedded agent with tools

The backend hosts an embedded agent that can read system state, answer questions, and make suggestions. It is not a blind chatbot.

- The agent has internal tools to inspect projects, tasks, documents, and team workload.
- Tools are separated into read-only and action-producing capabilities.
- Any destructive action is blocked behind a human approval workflow.

### Human-in-the-loop safety

Safety is built in from day one.

- The agent can propose actions but never executes destructive changes on its own.
- Proposed actions are persisted as pending and require manager approval.
- This gives the team confidence to let AI assist without losing control.

### AI classification and note intelligence

Notes are no longer raw text.

- Incoming notes are auto-classified and tagged.
- The system helps triage, categorise and route incoming work.
- This removes friction and keeps the IT inbox from becoming a dump.

### Structured AI output

All AI artifacts are rendered as clean, structured content rather than raw model dumps.

- Markdown-first rendering with tables, bullet lists and code blocks.
- Mermaid diagrams render inline instead of appearing as unreadable text.
- AI responses feel like polished deliverables.

### Report generation

MB IQ generates professional reports with an on-brand layout.

- Reports are produced as markdown artifacts.
- The PDF generator renders charts, tables and embedded diagrams.
- This makes it easy for leaders to get shareable status/insight deliverables.

### Insight tools: Risk Radar and Auto Standup

The system goes beyond static lists.

- Risk Radar gives leaders an early warning on overdue work and shifting priorities.
- Auto Standup produces concise team summaries of progress, blockers, and next steps.
- These insights are generated from the actual work data in the system.

## 6. Diagram Studio

MB IQ includes a dedicated diagrams workspace.

- Create ER diagrams, org charts, sprint Gantt views, and architecture diagrams.
- Diagrams are produced as Mermaid source and rendered live.
- Users can export them as PNG/PDF and save them into the documentation library.

That means architecture, org structure and delivery timelines are not just static slides — they are generated from the actual system state.

## 7. Deployment and architecture maturity

MB IQ is built with deployment in mind, not as a temporary demo.

- Frontend is a production-ready React SPA that can be hosted as static assets.
- Backend is an Express API with Prisma ORM and role-based security.
- The architecture is designed so the demo SQLite database is a temporary stand-in.
- Switching to the firm’s real database is a configuration change, not a rewrite.

## 8. Why this is a strong internal tool

- It scales with the firm’s structure using the five-tier RBAC model.
- It supports leaders, teams, and the broader firm with the right view for each.
- It gives the team an AI assistant that is powerful, safe, and grounded in actual work state.
- It turns meetings, notes and documents into reusable intelligence.
- It does all of this without relying on an external SaaS experience.

## 9. What to highlight in a presentation

When you explain MB IQ to stakeholders, emphasise:

- The command centre concept: everything the IT division needs in one place.
- The role-based dashboards that match the firm’s actual hierarchy.
- The embedded AI agent with human-in-the-loop approval.
- The polished documentation and report generation.
- The fact that diagrams, risk insights and standups are generated from live data.
- The internal-first architecture: company server, company domain, company SSO ready.

## 10. Summary

MB IQ is a modern internal command centre built for the firm’s IT organisation. It is more than a task tracker — it is a workplace intelligence system that combines work planning, team communication, meeting intelligence, document persistence, and safe AI assistance.

This system is ready to be shown off as a cool, capable internal product. It is designed to impress with both polished UI and the way AI works as a trusted output engine for reports, diagrams, and insight.