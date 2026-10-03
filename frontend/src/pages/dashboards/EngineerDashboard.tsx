// Code written by Kone & Claude | The code does the following: " Tier 4 (Software Engineer) dashboard.
// 'My Tasks' stays the focus (personal work + self-service status moves), and a 'My Team' panel gives
// squad context — what the engineer's team is working on — with a READ-ONLY peek at the other squad via
// TeamScopeTabs so they can see what the other team is doing and offer help. "

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AiStatusBar } from '../../components/AiStatusBar';
import { DashboardFilters, TeamScopeTabs, type FilterState, type TeamScope, matchesPriority } from '../../components/DashboardFilters';
import { type Project, type Task, type DirUser, type Sprint, BOARD_STATUSES, isOverdue, isOpen, fmtDate, relativeDue, tasksForTeam, squadMembers, otherTeam, isLead, statusClass, StatTile, PriorityPill, Spinner, Empty, Avatar } from './shared';

export function EngineerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<DirUser[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [filters, setFilters] = useState<FilterState>({ team: 'mine', priority: 'all' });
  const [scope, setScope] = useState<TeamScope>('mine');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(first = false) {
    if (first) setLoading(true);
    Promise.all([
      api<Task[]>('/api/tasks').then(setTasks),
      api<Project[]>('/api/projects').then(setProjects).catch(() => undefined),
      api<DirUser[]>('/api/users').then(setUsers).catch(() => undefined),
      api<Sprint[]>('/api/sprints').then(setSprints).catch(() => undefined),
    ]).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }
  useEffect(() => load(true), []);

  async function setStatus(taskId: string, status: string) {
    try { await api(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load(); }
    catch (e) { setError((e as Error).message); }
  }

  // --- Personal work (the engineer's own assigned tasks) ---
  const mine = tasks.filter((t) => t.ownerId === user?.id && matchesPriority(t.priority, filters.priority));
  const open = mine.filter(isOpen);
  const inProgress = mine.filter((t) => t.status === 'In Progress').length;
  const blocked = mine.filter((t) => t.status === 'Blocked').length;
  const weekAhead = Date.now() + 7 * 86400000;
  const dueSoon = open.filter((t) => t.dueDate && new Date(t.dueDate).getTime() <= weekAhead).length;
  const mySprint = sprints.find((s) => s.team === user?.team) ?? sprints[0];
  const ordered = [...open].sort((a, b) => Number(b.status === 'Blocked') - Number(a.status === 'Blocked') || Number(isOverdue(b)) - Number(isOverdue(a)));

  // --- Team context (own squad by default; read-only peek at the other squad) ---
  const viewedTeam = scope === 'mine' ? (user?.team ?? '') : (otherTeam(user?.team) ?? '');
  const teamOpen = tasksForTeam(tasks, projects, viewedTeam).filter(isOpen)
    .sort((a, b) => Number(b.status === 'Blocked') - Number(a.status === 'Blocked'));
  const teamMembers = squadMembers(users, viewedTeam);

  return (
    <div>
      <AiStatusBar />
      <div className="topbar">
        <div><h1>My Workspace</h1><p className="muted">Welcome, {user?.name}. Everything assigned to you.</p></div>
        <span className="badge">Software Engineer · Tier 4</span>
      </div>
      <DashboardFilters value={filters} onChange={setFilters} options={{ showTeam: false }} userTeam={user?.team} />
      {error && <div className="error-banner">{error}</div>}
      {loading ? <Spinner label="Loading your tasks…" /> : (
        <>
          <div className="grid cards">
            <StatTile label="My Open Tasks" value={open.length} accent="blue" icon="check" />
            <StatTile label="In Progress" value={inProgress} accent="green" icon="bar" />
            <StatTile label="Blocked" value={blocked} accent="red" icon="alert" foot={blocked ? 'raise with your team lead' : 'all clear'} />
            <StatTile label="Due This Week" value={dueSoon} accent="amber" icon="clock" />
          </div>

          <div className="grid main-sidebar section">
            <div className="card">
              <h3>My Tasks</h3>
              {ordered.length === 0 ? <Empty title="No open tasks in this view" hint="Try changing the priority filter or enjoy the calm!" icon="check" /> : ordered.map((t) => {
                const rd = relativeDue(t.dueDate);
                return (
                  <div className="list-row" key={t.id}>
                    <div className="grow">
                      <b>{t.title}</b> <PriorityPill priority={t.priority} />
                      <br /><span className="muted small">{t.project?.name ?? '—'} · {t.branch ?? 'no branch'} · <span className={`due ${rd.overdue ? 'over' : ''}`}>{rd.text}</span></span>
                    </div>
                    <select value={t.status} onChange={(e) => setStatus(t.id, e.target.value)} style={{ width: 140 }}>
                      {BOARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                );
              })}
            </div>

            <div>
              <div className="card">
                <h3>My Current Sprint</h3>
                {mySprint ? (
                  <>
                    <b>{mySprint.name}</b>
                    <p className="muted small">{mySprint.goal}</p>
                    <div className="list-row"><div className="grow muted small">Window</div><span className="chip">{fmtDate(mySprint.startDate)} → {fmtDate(mySprint.endDate)}</span></div>
                    <div className="list-row"><div className="grow muted small">Tasks in sprint</div><span className="chip">{mySprint._count?.tasks ?? 0}</span></div>
                  </>
                ) : <Empty title="No active sprint" hint="Your team has no active sprint." icon="columns" />}
              </div>

              <div className="card section">
                <h3>Focus</h3>
                <div className="notice">
                  {blocked > 0 ? `You have ${blocked} blocked task(s) — flag them to your team lead. ` : ''}
                  {dueSoon > 0 ? `${dueSoon} task(s) are due within a week — line them up next. ` : ''}
                  {blocked === 0 && dueSoon === 0 ? 'Nothing urgent. Pick the highest-priority open task and make progress. ' : ''}
                </div>
                <button className="btn full section" onClick={() => navigate('/assistant')}>Ask the AI Assistant to prioritise</button>
              </div>
            </div>
          </div>

          {/* My Team — squad context, with a read-only peek at the other squad. */}
          <div className="card section">
            <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
              <h3 style={{ margin: 0 }}>{scope === 'mine' ? 'My Team' : `${viewedTeam} · view only`}</h3>
              <TeamScopeTabs userTeam={user?.team} scope={scope} onChange={setScope} />
            </div>
            <p className="muted small">
              {scope === 'mine'
                ? `What ${viewedTeam || 'your team'} is working on right now.`
                : `See what ${viewedTeam} is doing — offer help if you can. You can’t change their tasks.`}
            </p>
            <div className="grid main-sidebar">
              <div>
                {teamOpen.length === 0 ? <Empty title={`No open tasks for ${viewedTeam || 'this team'}`} icon="check" /> : (
                  <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Task</th><th>Owner</th><th>Status</th></tr></thead>
                      <tbody>
                        {teamOpen.map((t) => {
                          const rd = relativeDue(t.dueDate);
                          const isMine = t.ownerId === user?.id;
                          return (
                            <tr key={t.id}>
                              <td><b>{t.title}</b>{isMine ? <span className="chip sm" style={{ marginLeft: 6 }}>You</span> : ''}<br /><span className="muted small"><PriorityPill priority={t.priority} /> · <span className={`due ${rd.overdue ? 'over' : ''}`}>{rd.text}</span></span></td>
                              <td><div className="av-row"><Avatar name={t.owner?.name ?? 'Unassigned'} sm /><span className="muted small">{t.owner?.name ?? 'Unassigned'}</span></div></td>
                              <td><span className={`status ${statusClass(t.status)}`}>{t.status}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="card">
                <h3>{viewedTeam || 'Team'} Roster</h3>
                {teamMembers.length === 0 ? <Empty title="No members" icon="users" /> : teamMembers.map((m) => (
                  <div className="av-row" key={m.id} style={{ marginBottom: 8 }}>
                    <Avatar name={m.name} sm />
                    <div className="grow"><b>{m.id === user?.id ? `${m.name} (you)` : m.name}</b></div>
                    {isLead(m.role) && <span className="chip sm">Team Lead</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
