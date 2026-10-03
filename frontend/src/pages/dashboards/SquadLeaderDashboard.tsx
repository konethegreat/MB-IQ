// Code written by Kone & Claude | The code does the following: " Tier 2 (Squad Leader / admin)
// dashboard — department-wide control with team/priority filters, assignment to any of the six engineers
// (two of them Team Leads), workload panels, and live API/AI status. "

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AiStatusBar } from '../../components/AiStatusBar';
import { DashboardFilters, DEFAULT_FILTERS, type FilterState, filterProjectsAndTasks, matchesTeam } from '../../components/DashboardFilters';
import { RiskRadar } from '../../components/RiskRadar';
import { StandupCard } from '../../components/StandupCard';
import { type Project, type Task, type DirUser, type Sprint, isOverdue, isOpen, pct, fmtDate, relativeDue, squadMembers, isLead, SQUAD_TEAMS, StatTile, ProgressRow, PriorityPill, Spinner, Empty, Avatar } from './shared';

export function SquadLeaderDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<DirUser[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(first = false) {
    if (first) setLoading(true);
    Promise.all([
      api<Project[]>('/api/projects').then(setProjects),
      api<Task[]>('/api/tasks').then(setTasks),
      api<DirUser[]>('/api/users').then(setUsers).catch(() => undefined),
      api<Sprint[]>('/api/sprints').then(setSprints).catch(() => undefined),
    ]).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }
  useEffect(() => load(true), []);

  async function assign(taskId: string, ownerId: string) {
    if (!ownerId) return;
    try { await api(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ ownerId }) }); load(); }
    catch (e) { setError((e as Error).message); }
  }

  const { filteredProjects, filteredTasks } = filterProjectsAndTasks(projects, tasks, filters, user?.team);

  const open = filteredTasks.filter(isOpen).length;
  const blocked = filteredTasks.filter((t) => t.status === 'Blocked');
  const overdue = filteredTasks.filter(isOverdue);
  const unassigned = filteredTasks.filter((t) => !t.ownerId && isOpen(t));
  const subordinates = users.filter((u) => u.role === 'TEAM_CAPTAIN' || u.role === 'SOFTWARE_ENGINEER');
  const maxLoad = Math.max(1, ...subordinates.map((e) => filteredTasks.filter((t) => t.ownerId === e.id && isOpen(t)).length));
  const attention = [...blocked, ...overdue.filter((t) => t.status !== 'Blocked')];
  const filteredSprints = sprints.filter((s) => matchesTeam(s.team, filters.team, user?.team));

  return (
    <div>
      <AiStatusBar />
      <div className="topbar">
        <div><h1>Delivery Control</h1><p className="muted">Welcome, {user?.name}. Department-wide control of work and delivery.</p></div>
        <span className="badge">Squad Leader · Tier 2</span>
      </div>
      <DashboardFilters value={filters} onChange={setFilters} userTeam={user?.team} />
      {error && <div className="error-banner">{error}</div>}
      {loading ? <Spinner label="Loading delivery data…" /> : (
        <>
          <div className="grid cards">
            <StatTile label="Open Tasks" value={open} accent="blue" icon="check" foot={`${filteredProjects.length} projects in view`} />
            <StatTile label="Blocked" value={blocked.length} accent="red" icon="alert" foot="need escalation" />
            <StatTile label="Overdue" value={overdue.length} accent="amber" icon="clock" foot="past due date" />
            <StatTile label="Unassigned" value={unassigned.length} accent="green" icon="inbox" foot="awaiting an owner" />
          </div>

          <div className="actions row section">
            <button className="btn navy" onClick={() => navigate('/projects')}>+ New / Manage Projects</button>
            <button className="btn" onClick={() => navigate('/tasks')}>+ New / Manage Tasks</button>
            <button className="btn" onClick={() => navigate('/board')}>Open Sprint Board</button>
          </div>

          <div className="grid main-sidebar section">
            <div>
              <div className="card">
                <h3>Assign Unassigned Work</h3>
                <p className="muted small">Assign to any of the six engineers — including the two Team Leads.</p>
                {unassigned.length === 0 ? <Empty title="Everything has an owner" hint="No open task is unassigned in this filter view." icon="check" /> : unassigned.map((t) => {
                  const rd = relativeDue(t.dueDate);
                  return (
                    <div className="list-row" key={t.id}>
                      <div className="grow"><b>{t.title}</b><br /><span className="muted small">{t.project?.name ?? '—'} · <PriorityPill priority={t.priority} /> · <span className={`due ${rd.overdue ? 'over' : ''}`}>{rd.text}</span></span></div>
                      <select defaultValue="" onChange={(e) => assign(t.id, e.target.value)} style={{ width: 220 }}>
                        <option value="" disabled>Assign to…</option>
                        {SQUAD_TEAMS.map((team) => (
                          <optgroup key={team} label={team}>
                            {squadMembers(users, team).map((m) => (
                              <option key={m.id} value={m.id}>{m.name}{isLead(m.role) ? ' (Lead)' : ''}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>

              <div className="card section">
                <h3>Needs Attention ({attention.length})</h3>
                {attention.length === 0 ? <Empty title="All clear" hint="No blockers or overdue work in this filter view." icon="check" /> : attention.map((t) => {
                  const rd = relativeDue(t.dueDate);
                  return (
                    <div className="list-row" key={t.id}>
                      <Avatar name={t.owner?.name ?? 'Unassigned'} sm />
                      <div className="grow"><b>{t.title}</b><br /><span className="muted small">{t.project?.name ?? '—'} · {t.owner?.name ?? 'Unassigned'}</span></div>
                      <span className={`status ${t.status === 'Blocked' ? 'red' : 'amber'}`}>{t.status === 'Blocked' ? 'Blocked' : 'Overdue'}</span>
                      <span className={`due ${rd.overdue ? 'over' : ''}`} style={{ minWidth: 86, textAlign: 'right' }}>{rd.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="card">
                <h3>Workload by Person</h3>
                <p className="muted small">Open tasks per engineer (Team Leads included).</p>
                {subordinates.length === 0 ? <Empty title="No team members found" icon="users" /> : subordinates.map((person) => {
                  const load = filteredTasks.filter((t) => t.ownerId === person.id && isOpen(t)).length;
                  const roleLabel = isLead(person.role) ? 'Lead' : 'Engineer';
                  return (
                    <div className="av-row" key={person.id} style={{ marginBottom: 4 }}>
                      <Avatar name={person.name} sm />
                      <div style={{ flex: 1 }}><ProgressRow name={`${person.name} (${roleLabel}) · ${load}`} value={pct(load, maxLoad)} suffix="" /></div>
                    </div>
                  );
                })}
              </div>

              <div className="card section">
                <h3>Active Sprints</h3>
                {filteredSprints.length === 0 ? <Empty title="No sprints in view" icon="columns" /> : filteredSprints.map((s) => (
                  <div className="list-row" key={s.id}>
                    <div className="grow"><b>{s.name}</b><br /><span className="muted small">{s.team ?? '—'} · {s._count?.tasks ?? 0} tasks</span></div>
                    <span className="chip">{fmtDate(s.endDate)}</span>
                  </div>
                ))}
              </div>

              <div className="section"><RiskRadar /></div>
              <div className="section"><StandupCard defaultTeam={user?.team} /></div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
