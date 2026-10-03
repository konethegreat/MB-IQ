// Code written by Kone & Claude | The code does the following: " Deterministic delivery-risk radar. For
// each project it weighs blocked tasks, overdue tasks, whether delivery is behind the expected pace (time
// elapsed vs work done) and the project's health flag into a score → a RAG rating with human reasons. Pure
// data (no AI, works offline); the agent can narrate it and the dashboards render it. "

import { prisma } from '../../db/prisma';

export type Rag = 'Green' | 'Amber' | 'Red';
export interface ProjectRisk {
  project: string;
  team: string | null;
  rag: Rag;
  score: number;
  open: number;
  blocked: number;
  overdue: number;
  reasons: string[];
}

export async function assessRisk(): Promise<{ items: ProjectRisk[]; summary: string }> {
  const projects = await prisma.project.findMany({ include: { tasks: true } });
  const now = Date.now();

  const items: ProjectRisk[] = projects.map((p) => {
    const tasks = p.tasks;
    const open = tasks.filter((t) => t.status !== 'Done').length;
    const blocked = tasks.filter((t) => t.status === 'Blocked').length;
    const overdue = tasks.filter((t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate).getTime() < now).length;
    const doneRatio = tasks.length ? tasks.filter((t) => t.status === 'Done').length / tasks.length : 1;

    let behind = false;
    if (p.startDate && p.dueDate) {
      const span = new Date(p.dueDate).getTime() - new Date(p.startDate).getTime();
      if (span > 0) {
        const elapsed = Math.min(1, Math.max(0, (now - new Date(p.startDate).getTime()) / span));
        behind = elapsed - doneRatio > 0.25; // more than 25% behind the expected pace
      }
    }

    const reasons: string[] = [];
    if (blocked) reasons.push(`${blocked} blocked task${blocked > 1 ? 's' : ''}`);
    if (overdue) reasons.push(`${overdue} overdue task${overdue > 1 ? 's' : ''}`);
    if (behind) reasons.push('behind expected pace');
    if (p.health === 'Red') reasons.push('health Red');
    else if (p.health === 'Amber') reasons.push('health Amber');

    const score = blocked * 2 + overdue * 1.5 + (behind ? 3 : 0) + (p.health === 'Red' ? 3 : p.health === 'Amber' ? 1.5 : 0);
    const rag: Rag = score >= 5 ? 'Red' : score >= 2 ? 'Amber' : 'Green';
    if (reasons.length === 0) reasons.push('on track');

    return { project: p.name, team: p.team, rag, score: Math.round(score * 10) / 10, open, blocked, overdue, reasons };
  }).sort((a, b) => b.score - a.score);

  const red = items.filter((i) => i.rag === 'Red').length;
  const amber = items.filter((i) => i.rag === 'Amber').length;
  const summary = red || amber
    ? `${red} project${red === 1 ? '' : 's'} at risk (Red) · ${amber} to watch (Amber).`
    : 'All projects are on track.';

  return { items, summary };
}
