// Code written by Kone & Claude | The code does the following: " The diagram engine. Produces Mermaid
// source for the Diagram Studio and the agent. Deterministic generators read live data and never need the
// AI: ER (from the Prisma schema), the org/RBAC chart (from the users table) and the sprint Gantt (from
// sprints + task due dates). AI generators draw the system architecture or a free-form custom diagram. "

import { prisma } from '../../db/prisma';
import { ROLE_LABEL, type RoleKey } from '../../config/rbac';
import { aiService } from '../anthropic.service';
import { erDiagramFromSchema } from './erDiagram';

export type DiagramKind = 'er' | 'org' | 'gantt' | 'architecture' | 'custom';
export const DETERMINISTIC_KINDS: DiagramKind[] = ['er', 'org', 'gantt'];
export const AI_KINDS: DiagramKind[] = ['architecture', 'custom'];

// Strips characters that would break Mermaid node labels / gantt+section syntax.
function safe(s: string): string { return (s || '').replace(/["\n:;,]/g, ' ').replace(/\s+/g, ' ').trim(); }

// Code written by Kone & Claude | The code does the following: " Builds a Mermaid org/RBAC chart from the
// users table: Tier 1 → the joint Tier-2 admins → each squad's Team Lead → that squad's engineers. "
export async function orgChartMermaid(): Promise<string> {
  const users = await prisma.user.findMany();
  const finals = users.filter((u) => u.role === 'FINAL_LEADER');
  const squads = users.filter((u) => u.role === 'SQUAD_LEADER');
  const teams = ['Team Alpha', 'Team Apex'];

  const lines: string[] = ['graph TD'];
  const idOf = new Map<string, string>();
  let i = 0;
  const node = (u: { id: string; name: string; role: string }): string => {
    const id = `n${i++}`;
    idOf.set(u.id, id);
    lines.push(`  ${id}["${safe(u.name)} (${ROLE_LABEL[u.role as RoleKey] ?? u.role})"]`);
    return id;
  };

  finals.forEach(node);
  if (squads.length) {
    lines.push('  subgraph mgmt["Management"]');
    squads.forEach(node);
    lines.push('  end');
  }
  for (const f of finals) for (const s of squads) lines.push(`  ${idOf.get(f.id)} --> ${idOf.get(s.id)}`);

  for (const team of teams) {
    const lead = users.find((u) => u.team === team && u.role === 'TEAM_CAPTAIN');
    const engineers = users.filter((u) => u.team === team && u.role === 'SOFTWARE_ENGINEER');
    if (!lead && engineers.length === 0) continue;
    lines.push(`  subgraph ${team.replace(/\s+/g, '_')}["${team}"]`);
    const leadId = lead ? node(lead) : '';
    const engIds = engineers.map(node);
    lines.push('  end');
    if (lead) for (const s of squads) lines.push(`  ${idOf.get(s.id)} --> ${leadId}`);
    for (const e of engIds) lines.push(`  ${leadId || idOf.get(finals[0]?.id ?? '')} --> ${e}`);
  }
  return lines.join('\n');
}

// Code written by Kone & Claude | The code does the following: " Builds a Mermaid Gantt of each sprint's
// window with its tasks shown as due-date milestones. "
export async function ganttMermaid(): Promise<string> {
  const [sprints, tasks] = await Promise.all([
    prisma.sprint.findMany({ orderBy: { startDate: 'asc' } }),
    prisma.task.findMany(),
  ]);
  const fmt = (d?: Date | null): string => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const lines: string[] = ['gantt', '  title MB IQ — Sprint Timeline', '  dateFormat YYYY-MM-DD', '  axisFormat %d %b'];
  if (sprints.length === 0) { lines.push('  section Sprints', '  No active sprints :done, 2026-06-01, 1d'); return lines.join('\n'); }
  for (const s of sprints) {
    lines.push(`  section ${safe(s.name)}`);
    const start = fmt(s.startDate);
    const end = fmt(s.endDate);
    if (start && end) lines.push(`  ${safe(s.name)} :active, ${start}, ${end}`);
    for (const t of tasks.filter((t) => t.sprintId === s.id && t.dueDate)) {
      lines.push(`  ${safe(t.title)} :milestone, ${fmt(t.dueDate)}, 0d`);
    }
  }
  return lines.join('\n');
}

const ARCHITECTURE_CONTEXT =
  'MB IQ Command Centre architecture. Frontend: React + TypeScript SPA (Vite) with role-based dashboards. '
  + 'Backend: Node + Express + TypeScript REST API with RBAC middleware and JWT auth behind an AuthProvider '
  + 'interface (SSO-ready). Data: Prisma ORM over SQLite now (organisation Postgres/MySQL later). The backend '
  + 'is an MCP Host with an embedded agent: an internal tool provider (database tools) and an env-ready GitHub '
  + 'MCP provider, behind a Human-in-the-Loop approval layer. Anthropic Claude powers summaries, meeting packs, '
  + 'reports, classification, documentation and diagrams. Show the main components and the request/data flow.';

// Code written by Kone & Claude | The code does the following: " Single entry point used by the diagram
// routes and the agent tools: returns a titled Mermaid diagram for any supported kind. "
export async function generateDiagram(kind: DiagramKind, opts: { prompt?: string; userId?: string } = {}): Promise<{ title: string; mermaid: string; aiGenerated: boolean }> {
  switch (kind) {
    case 'er': return { title: 'Database (ER) Diagram', mermaid: erDiagramFromSchema(), aiGenerated: false };
    case 'org': return { title: 'Organisation & RBAC Chart', mermaid: await orgChartMermaid(), aiGenerated: false };
    case 'gantt': return { title: 'Sprint Timeline (Gantt)', mermaid: await ganttMermaid(), aiGenerated: false };
    case 'architecture':
      return { title: 'System Architecture', mermaid: await aiService.generateMermaid('architecture flowchart', opts.prompt?.trim() || ARCHITECTURE_CONTEXT, opts.userId), aiGenerated: true };
    case 'custom':
    default:
      return { title: 'Custom Diagram', mermaid: await aiService.generateMermaid('diagram', opts.prompt?.trim() || 'A simple flowchart of a software delivery process.', opts.userId), aiGenerated: true };
  }
}
