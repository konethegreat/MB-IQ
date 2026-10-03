# Project Plan — Demo Engineering Command Centre (MB IQ)

**Author:** Kone (with Claude)
**Date:** 2026-06-19
**Branch:** `Kone's-branch`
**Status:** Foundation milestone in progress

---

## Purpose of this document

This is the "what I want to do now" record requested by Kone. It captures the plan for the current
build phase so context is never lost and reviewers can follow Kone's trail of work.

## What we are building

An internal web application for the IT division — the daily operating system for the software
engineering department. It will be hosted on the firm's server under the firm's domain, sign users in
with organisation credentials (SSO), and read from the organisation's existing user database.

## Decisions locked in (2026-06-19)

- **Stack:** React + TypeScript + Vite (frontend), Node + Express + TypeScript (backend). Web-based,
  so it runs on Windows, macOS, and any modern browser/device from a single codebase.
- **Database:** Prisma ORM with SQLite for the demo — chosen specifically so the organisation's real
  database can be plugged in later by changing one connection string ("plug-and-go").
- **Authentication:** Local JWT auth now, written behind a provider interface so organisation **SSO**
  can be added later without rewriting the app.
- **Anthropic API key:** referenced via an `ANTHROPIC_API_KEY` environment placeholder; the real key
  is added later to an untracked `.env` file and never committed.

## What I am doing in THIS phase (Foundation)

1. **Branch & structure** — create `Kone's-branch`; lay out `frontend/`, `backend/`,
   `documentation/`; preserve the original prototype in `prototype-v0.1/`. ✅
2. **Documentation** — write the three `claude.md` files (root/frontend/backend), this plan, and the
   architecture doc. ✅ (in progress)
3. **Backend foundation** — Express + TypeScript server, the 5-tier RBAC config, SSO-ready auth
   provider + JWT, Prisma schema (Users, Projects, Tasks, Sprints, Documents, Notes, Meetings,
   Messages), and the Anthropic AI service (summaries, task handling, PDF reports, AI Coach).
4. **Frontend foundation** — responsive React shell: login, auth context, role-based dashboards for
   all five tiers, sprint board, AI assistant page, and the General-Firm read-only + notes view.
5. **Seed data** — demo users matching the exact RBAC tiers (Demo Final Leader; Demo Manager A & Demo Manager B; two
   captains; four engineers; one general-firm user).
6. **Verify & remind to commit** — check structure, the mandatory comment format, and that all docs
   exist; then remind Kone to commit on `Kone's-branch` with a detailed message.

## Features carried forward from the v0.1 prototype

Projects, tasks, sprint board (Kanban), documentation centre, meeting intelligence (transcript →
structured summary + action items), communication channels, innovation pipeline, and reports — all
re-implemented on the real backend with proper RBAC and the Anthropic AI service replacing the
prototype's rule-based stubs.

## Out of scope for this phase (next milestones)

- Live connection to the organisation's production database and SSO provider.
- Full Jira-replication parity (ticket detail, workflow transitions) mirrored from Kone's Jira board.
- Production deployment to the firm's server/domain.

## How Kone's authorship is recorded

- Mandatory attribution comment on every functional block:
  `// Code written by Kone & Claude | The code does the following: " [Explanation] "`
- Kone named as author in all documentation and `claude.md` files.
- All work committed on `Kone's-branch` with detailed messages for a clean audit trail.
