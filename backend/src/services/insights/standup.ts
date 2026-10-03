// Code written by Kone & Claude | The code does the following: " Builds a deterministic standup / RAG
// status digest for a team (or all teams) from the live tasks: what's In Progress, In Review, Blocked,
// Due soon, plus an Asks section. Returns Markdown so it renders via <RichContent> and can be posted to a
// communication channel verbatim. No AI required. "

import { prisma } from '../../db/prisma';

interface TaskRow { title: string; owner?: { name: string } | null; dueDate?: Date | null }

function line(t: TaskRow): string {
  const due = t.dueDate ? ` _(due ${new Date(t.dueDate).toISOString().slice(0, 10)})_` : '';
  return `- ${t.title} — ${t.owner?.name ?? 'Unassigned'}${due}`;
}

export async function buildStandup(team?: string): Promise<{ team: string; markdown: string }> {
  const projects = await prisma.project.findMany({ select: { id: true, team: true } });
  const ids = new Set(projects.filter((p) => !team || p.team === team).map((p) => p.id));
  const tasks = await prisma.task.findMany({ include: { owner: { select: { name: true } } } });
  const scoped = tasks.filter((t) => t.projectId && ids.has(t.projectId));

  const soon = Date.now() + 3 * 86400000;
  const inProgress = scoped.filter((t) => t.status === 'In Progress');
  const inReview = scoped.filter((t) => t.status === 'In Review');
  const blocked = scoped.filter((t) => t.status === 'Blocked');
  const dueSoon = scoped.filter((t) => t.status !== 'Done' && t.dueDate && new Date(t.dueDate).getTime() <= soon);

  const label = team ?? 'All teams';
  const section = (heading: string, list: TaskRow[], empty: string): string =>
    `### ${heading}\n\n${list.length ? list.map(line).join('\n') : `_${empty}_`}\n`;

  const markdown = [
    `## Standup — ${label} · ${new Date().toLocaleDateString()}`,
    '',
    section('In Progress', inProgress, 'Nothing in progress.'),
    section('In Review', inReview, 'Nothing awaiting review.'),
    section('Blocked — needs attention', blocked, 'No blockers.'),
    section('Due in the next 3 days', dueSoon, 'Nothing due soon.'),
    '### Asks',
    '',
    blocked.length ? `- Unblock ${blocked.length} task(s) above.` : '- No asks at this time.',
  ].join('\n');

  return { team: label, markdown };
}
