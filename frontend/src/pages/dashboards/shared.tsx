// Code written by Kone & Claude | The code does the following: " Shared building blocks for the tier
// dashboards and feature pages: API data shapes, formatting helpers (status/priority colour, overdue
// test, relative due dates, percentages), and reusable UI atoms - KPI stat tile, progress row, spinner,
// empty state, coloured avatar, inline SVG icon set and a donut chart. Centralising these keeps each
// page focused on WHAT it shows. "

import type { ReactNode } from 'react';
import { can, type SessionUser } from '../../config/roles';

export interface Project {
  id: string; name: string; type: string; status: string; health: string; description: string;
  priority?: string; team?: string | null; dueDate?: string | null;
  owner?: { name: string } | null; _count?: { tasks: number };
}
export interface Task {
  id: string; title: string; status: string; priority: string; dueDate?: string | null;
  projectId?: string | null; ownerId?: string | null;
  owner?: { name: string; team?: string | null } | null; project?: { name: string; team?: string | null } | null;
  sprint?: { team?: string | null } | null; branch?: string | null;
}
export interface DirUser { id: string; name: string; email: string; role: string; team?: string | null; avatar?: string | null }
export interface Sprint {
  id: string; name: string; team?: string | null; goal?: string | null;
  startDate?: string | null; endDate?: string | null; projectId?: string | null; project?: { name: string } | null; _count?: { tasks: number };
}

// Code written by Kone & Claude | The code does the following: " Mirrors task write scope for
// controls only. The server still checks every request, including crafted requests and stale views. "
export function canEditTask(user: SessionUser | null, task: Task): boolean {
  if (can(user, 'task:manage')) {
    if (user?.role !== 'TEAM_CAPTAIN') return true;
    const teams = [task.project, task.sprint, task.owner].filter(row => !!row).map(row => row!.team);
    return !!user.team && teams.length > 0 && teams.every(team => team === user.team);
  }
  return can(user, 'task:own') && task.ownerId === user?.id;
}

export type AiMode = 'MAX' | 'SAVER';

export const OPEN_STATUSES = ['To Do', 'In Progress', 'In Review', 'Testing', 'Blocked'];
export const BOARD_STATUSES = ['To Do', 'In Progress', 'In Review', 'Testing', 'Blocked', 'Done'];

export function statusClass(v: string): string {
  if (['Done', 'Completed', 'Green', 'Deployed', 'Active', 'Healthy'].includes(v)) return 'green';
  if (['Blocked', 'Critical', 'Red', 'On Hold'].includes(v)) return 'red';
  if (['In Progress', 'Development', 'In Review', 'Testing'].includes(v)) return 'blue';
  return 'amber';
}
export function priorityClass(p: string): 'red' | 'amber' | 'blue' {
  if (p === 'Critical' || p === 'High') return 'red';
  if (p === 'Medium') return 'amber';
  return 'blue';
}
export function healthClass(h: string): 'green' | 'amber' | 'red' {
  return h === 'Green' ? 'green' : h === 'Red' ? 'red' : 'amber';
}
export function isOverdue(t: Task): boolean {
  return !!t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'Done';
}
export function isOpen(t: Task): boolean { return t.status !== 'Done'; }
export function pct(part: number, total: number): number { return total > 0 ? Math.round((part / total) * 100) : 0; }
export function fmtDate(d?: string | null): string {
  return d ? new Date(d).toLocaleDateString(undefined, { day: '2-digit', month: 'short' }) : '—';
}
// Code written by Kone & Claude | The code does the following: " Turns a due date into a friendly
// relative phrase ('due in 3d', 'due today', '2d overdue') plus an overdue flag for styling. "
export function relativeDue(d?: string | null): { text: string; overdue: boolean } {
  if (!d) return { text: 'no due date', overdue: false };
  const startOfDay = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((startOfDay(new Date(d)) - startOfDay(new Date())) / 86400000);
  if (diff < 0) return { text: `${Math.abs(diff)}d overdue`, overdue: true };
  if (diff === 0) return { text: 'due today', overdue: false };
  if (diff === 1) return { text: 'due tomorrow', overdue: false };
  return { text: `due in ${diff}d`, overdue: false };
}
export function stageProgress(status: string): number {
  const map: Record<string, number> = { Idea: 10, 'On Hold': 25, Development: 55, Testing: 80, Deployed: 100 };
  return map[status] ?? 40;
}

// ---- Team / squad helpers (shared so dashboards don't re-implement squad logic) -----------------
export const SQUAD_TEAMS = ['Team Alpha', 'Team Apex'] as const;
export type SquadTeam = (typeof SQUAD_TEAMS)[number];
// True for an actual delivery squad (not "Management"/null) — decides whether a "my team" scope is meaningful.
export function isSquadTeam(team?: string | null): team is SquadTeam {
  return team === 'Team Alpha' || team === 'Team Apex';
}
// The opposite squad for the "view the other team" peek; null when the user isn't on a squad.
export function otherTeam(team?: string | null): SquadTeam | null {
  if (team === 'Team Alpha') return 'Team Apex';
  if (team === 'Team Apex') return 'Team Alpha';
  return null;
}
// A Team Lead is a tier-3 squad lead (role key kept as TEAM_CAPTAIN; see backend rbac.ts).
export function isLead(role?: string | null): boolean { return role === 'TEAM_CAPTAIN'; }
// Tasks belonging to a squad = tasks whose project belongs to that squad.
export function tasksForTeam(tasks: Task[], projects: Project[], team?: string | null): Task[] {
  const ids = new Set(projects.filter((p) => p.team === team).map((p) => p.id));
  return tasks.filter((t) => !!t.projectId && ids.has(t.projectId));
}
// Everyone in a squad (the tier-3 lead + the tier-4 engineers), lead listed first.
export function squadMembers(users: DirUser[], team?: string | null): DirUser[] {
  return users
    .filter((u) => u.team === team && (u.role === 'SOFTWARE_ENGINEER' || u.role === 'TEAM_CAPTAIN'))
    .sort((a, b) => Number(isLead(b.role)) - Number(isLead(a.role)) || a.name.localeCompare(b.name));
}

// Code written by Kone & Claude | The code does the following: " Small coloured priority pill, shared so
// dashboards stop repeating the same inline span + colour ternary in several places. "
export function PriorityPill({ priority }: { priority?: string }) {
  const p = priority ?? 'Medium';
  return <span className={`pill ${priorityClass(p)}`}>{p}</span>;
}

// ---- Avatars ---------------------------------------------------------------
const AV_COLORS = ['#1f6fb2', '#7a4cc0', '#d6754d', '#2fa37a', '#c0497e', '#0c2b4f', '#b9770e'];
export function avatarColor(name: string): string {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AV_COLORS[h % AV_COLORS.length];
}
export function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return (((p[0]?.[0]) ?? '') + ((p[1]?.[0]) ?? '')).toUpperCase() || '?';
}
// Code written by Kone & Claude | The code does the following: " A round avatar with deterministic
// colour + initials from a person's name. "
export function Avatar({ name, sm }: { name: string; sm?: boolean }) {
  return <div className={`avatar ${sm ? 'sm' : ''}`} style={{ background: avatarColor(name), color: '#fff' }} title={name}>{initials(name)}</div>;
}

// ---- Inline SVG icon set ---------------------------------------------------
type IconName = 'grid' | 'folder' | 'columns' | 'check' | 'file' | 'mic' | 'message' | 'zap' | 'bar' | 'cpu' | 'edit' | 'alert' | 'clock' | 'users' | 'inbox';
const ICONS: Record<IconName, ReactNode> = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /></>,
  folder: <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />,
  columns: <><rect x="3" y="4" width="5" height="16" rx="1" /><rect x="10" y="4" width="5" height="16" rx="1" /><rect x="17" y="4" width="4" height="16" rx="1" /></>,
  check: <><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M8 12l3 3 5-6" /></>,
  file: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  message: <path d="M21 12a8 8 0 0 1-11.5 7.2L4 20l1-4.5A8 8 0 1 1 21 12z" />,
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  bar: <><path d="M4 20V10M10 20V4M16 20v-7M20 20H3" /></>,
  cpu: <><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M1 15h3M20 9h3M20 15h3" /></>,
  edit: <><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></>,
  alert: <><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2 18a2 2 0 0 0 1.7 3h16.6a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  users: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M21 20a6 6 0 0 0-4-5.6" /></>,
  inbox: <><path d="M3 12h5l2 3h4l2-3h5" /><path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /></>,
};
export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ flex: 'none' }}>
      {ICONS[name]}
    </svg>
  );
}
export const NAV_ICON: Record<string, IconName> = {
  '/dashboard': 'grid', '/projects': 'folder', '/board': 'columns', '/tasks': 'check', '/docs': 'file',
  '/diagrams': 'bar', '/meetings': 'mic', '/comms': 'message', '/innovation': 'zap', '/reports': 'bar', '/agent': 'cpu', '/assistant': 'cpu', '/notes': 'edit', '/settings': 'columns',
};

// ---- Charts & states -------------------------------------------------------
// Code written by Kone & Claude | The code does the following: " A lightweight SVG donut chart used for
// portfolio health; renders coloured arcs proportional to each segment with the total in the centre. "
export function Donut({ data, size = 132 }: { data: { label: string; value: number; color: string }[]; size?: number }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 12; const c = 2 * Math.PI * r; let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef2f6" strokeWidth="12" />
        {data.filter((d) => d.value > 0).map((d, i) => {
          const len = (d.value / total) * c;
          const el = <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={d.color} strokeWidth="12" strokeLinecap="round" strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset} />;
          offset += len; return el;
        })}
      </g>
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="24" fontWeight="800" fill="#071B33">{total}</text>
    </svg>
  );
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return <div className="loading"><span className="spinner" />{label}</div>;
}
export function Empty({ title, hint, icon }: { title: string; hint?: string; icon?: IconName }) {
  return <div className="empty">{icon && <span className="empty-icon"><Icon name={icon} size={26} /></span>}<b>{title}</b>{hint && <p className="muted small">{hint}</p>}</div>;
}

// ---- KPI + progress --------------------------------------------------------
export function StatTile({ label, value, accent, foot, icon }: { label: string; value: ReactNode; accent?: 'green' | 'amber' | 'red' | 'blue'; foot?: ReactNode; icon?: IconName }) {
  return (
    <div className={`card stat ${accent ?? 'green'}`}>
      <span className="accent" />
      <div className="stat-head"><span className="label">{label}</span>{icon && <span className={`stat-icon ${accent ?? 'green'}`}><Icon name={icon} size={18} /></span>}</div>
      <div className="metric">{value}</div>
      {foot != null && <div className="small muted">{foot}</div>}
    </div>
  );
}
export function ProgressRow({ name, value, suffix }: { name: string; value: number; suffix?: string }) {
  const tone = value >= 67 ? '' : value >= 34 ? 'amber' : 'red';
  return (
    <div className="progress-row">
      <span className="name">{name}</span>
      <div className={`progress ${tone}`} style={{ flex: 1 }}>
        <span style={{ width: `${Math.max(3, Math.min(100, value))}%` }} />
      </div>
      <span className="val">{value}{suffix ?? '%'}</span>
    </div>
  );
}
