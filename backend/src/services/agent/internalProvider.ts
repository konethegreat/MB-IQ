// Code written by Kone & Claude | The code does the following: " The always-on internal tool provider.
// It exposes safe read-only tools (list projects, list open tasks, search documentation) that the agent
// may run autonomously, plus state-changing tools (create task, update task status) that are flagged
// destructive and therefore routed through Human-in-the-Loop approval. This makes the full agent + HITL
// flow demonstrable with zero external configuration. "

import { prisma } from '../../db/prisma';
import { generateDiagram } from '../diagram';
import { assessRisk } from '../insights/risk';
import { buildStandup } from '../insights/standup';
import type { AgentTool, AgentToolProvider, ToolResult } from './toolProvider';

const TOOLS: AgentTool[] = [
  { name: 'list_projects', description: 'List all projects with status, health and team.', destructive: false, inputSchema: { type: 'object', properties: {} } },
  { name: 'list_open_tasks', description: 'List open (not Done) tasks with owner and project.', destructive: false, inputSchema: { type: 'object', properties: {} } },
  { name: 'search_documents', description: 'Search the documentation centre by keyword.', destructive: false, inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'create_task', description: 'Create a new task/ticket.', destructive: true, inputSchema: { type: 'object', properties: { title: { type: 'string' }, projectId: { type: 'string' }, priority: { type: 'string' } }, required: ['title'] } },
  { name: 'update_task_status', description: 'Change a task\'s status (e.g. to Blocked or Done).', destructive: true, inputSchema: { type: 'object', properties: { taskId: { type: 'string' }, status: { type: 'string' } }, required: ['taskId', 'status'] } },
  // Diagram tools (read-only) — return Mermaid the agent includes verbatim so the user sees a diagram.
  { name: 'generate_er_diagram', description: 'Generate a Mermaid ER (database) diagram of the system schema.', destructive: false, inputSchema: { type: 'object', properties: {} } },
  { name: 'generate_org_chart', description: 'Generate a Mermaid org/RBAC chart of the team structure.', destructive: false, inputSchema: { type: 'object', properties: {} } },
  { name: 'generate_gantt', description: 'Generate a Mermaid Gantt chart of sprints and task due dates.', destructive: false, inputSchema: { type: 'object', properties: {} } },
  { name: 'generate_architecture_diagram', description: 'Generate a Mermaid system architecture diagram (optional focus via a prompt).', destructive: false, inputSchema: { type: 'object', properties: { prompt: { type: 'string' } } } },
  // Read-only insight tools.
  { name: 'list_sprints', description: 'List sprints with their team and task counts.', destructive: false, inputSchema: { type: 'object', properties: {} } },
  { name: 'team_workload', description: 'Open task counts per team member (optional team filter).', destructive: false, inputSchema: { type: 'object', properties: { team: { type: 'string' } } } },
  { name: 'overdue_tasks', description: 'List overdue, not-done tasks with owner and due date.', destructive: false, inputSchema: { type: 'object', properties: {} } },
  { name: 'project_health', description: 'Per-project health summary (status, health, open & blocked counts).', destructive: false, inputSchema: { type: 'object', properties: {} } },
  { name: 'assess_risk', description: 'Assess delivery risk per project (RAG rating with reasons).', destructive: false, inputSchema: { type: 'object', properties: {} } },
  { name: 'generate_standup', description: 'Generate a standup / RAG status digest (optional team filter).', destructive: false, inputSchema: { type: 'object', properties: { team: { type: 'string' } } } },
];

export class InternalToolProvider implements AgentToolProvider {
  public readonly id = 'internal';
  isConfigured(): boolean { return true; }
  async listTools(): Promise<AgentTool[]> { return TOOLS; }

  async callTool(tool: string, args: Record<string, unknown>): Promise<ToolResult> {
    switch (tool) {
      case 'list_projects': {
        const ps = await prisma.project.findMany({ select: { name: true, status: true, health: true, team: true } });
        return { ok: true, content: ps.map((p) => `${p.name} — ${p.status}/${p.health} (${p.team ?? 'no team'})`).join('\n') || 'No projects.', data: ps };
      }
      case 'list_open_tasks': {
        const ts = await prisma.task.findMany({ where: { NOT: { status: 'Done' } }, include: { owner: { select: { name: true } }, project: { select: { name: true } } } });
        return { ok: true, content: ts.map((t) => `[${t.status}] ${t.title} — ${t.owner?.name ?? 'Unassigned'} (${t.project?.name ?? 'no project'})`).join('\n') || 'No open tasks.', data: ts };
      }
      case 'search_documents': {
        const q = String(args.query ?? '').toLowerCase();
        const docs = await prisma.document.findMany({ orderBy: { updatedAt: 'desc' } });
        const hits = docs.filter((d) => d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q)).slice(0, 8);
        return { ok: true, content: hits.map((d) => `${d.title} (${d.type}): ${d.content.slice(0, 140)}`).join('\n\n') || 'No matching documents.', data: hits };
      }
      case 'create_task': {
        const task = await prisma.task.create({ data: { title: String(args.title), projectId: (args.projectId as string) || null, priority: (args.priority as string) || 'Medium' } });
        return { ok: true, content: `Created task "${task.title}" (id ${task.id}).`, data: task };
      }
      case 'update_task_status': {
        const task = await prisma.task.update({ where: { id: String(args.taskId) }, data: { status: String(args.status) } });
        return { ok: true, content: `Task ${task.id} is now "${task.status}".`, data: task };
      }
      case 'generate_er_diagram':
      case 'generate_org_chart':
      case 'generate_gantt': {
        const kind = tool === 'generate_er_diagram' ? 'er' : tool === 'generate_org_chart' ? 'org' : 'gantt';
        const d = await generateDiagram(kind, {});
        return { ok: true, content: `${d.title}:\n\n\`\`\`mermaid\n${d.mermaid}\n\`\`\``, data: d };
      }
      case 'generate_architecture_diagram': {
        const d = await generateDiagram('architecture', { prompt: args.prompt as string });
        return { ok: true, content: `${d.title}:\n\n\`\`\`mermaid\n${d.mermaid}\n\`\`\``, data: d };
      }
      case 'list_sprints': {
        const ss = await prisma.sprint.findMany({ include: { _count: { select: { tasks: true } } } });
        return { ok: true, content: ss.map((s) => `${s.name} — ${s.team ?? 'no team'} (${s._count.tasks} tasks)`).join('\n') || 'No sprints.', data: ss };
      }
      case 'overdue_tasks': {
        const ts = await prisma.task.findMany({ where: { NOT: { status: 'Done' }, dueDate: { lt: new Date() } }, include: { owner: { select: { name: true } }, project: { select: { name: true } } } });
        return { ok: true, content: ts.map((t) => `[${t.status}] ${t.title} — ${t.owner?.name ?? 'Unassigned'} (due ${t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : '—'})`).join('\n') || 'Nothing overdue.', data: ts };
      }
      case 'team_workload': {
        const team = args.team ? String(args.team) : undefined;
        const [people, tasks] = await Promise.all([
          prisma.user.findMany({ where: { ...(team ? { team } : {}), role: { in: ['TEAM_CAPTAIN', 'SOFTWARE_ENGINEER'] } } }),
          prisma.task.findMany({ where: { NOT: { status: 'Done' } } }),
        ]);
        const rows = people.map((u) => `${u.name} (${u.team ?? '—'}): ${tasks.filter((t) => t.ownerId === u.id).length} open`);
        return { ok: true, content: rows.join('\n') || 'No team members.', data: rows };
      }
      case 'project_health': {
        const ps = await prisma.project.findMany({ include: { tasks: { select: { status: true } } } });
        const rows = ps.map((p) => {
          const open = p.tasks.filter((t) => t.status !== 'Done').length;
          const blocked = p.tasks.filter((t) => t.status === 'Blocked').length;
          return `${p.name}: ${p.status}/${p.health} — ${open} open, ${blocked} blocked`;
        });
        return { ok: true, content: rows.join('\n') || 'No projects.', data: rows };
      }
      case 'assess_risk': {
        const r = await assessRisk();
        return { ok: true, content: `${r.summary}\n\n${r.items.map((i) => `${i.rag} — ${i.project}: ${i.reasons.join('; ')}`).join('\n')}`, data: r };
      }
      case 'generate_standup': {
        const s = await buildStandup(args.team ? String(args.team) : undefined);
        return { ok: true, content: s.markdown, data: s };
      }
      default:
        return { ok: false, content: `Unknown internal tool: ${tool}` };
    }
  }
}
