// Code written by Kone & Claude | The code does the following: " Tier 3 (Team Lead) dashboard — defaults
// to the lead's own squad (assign work, clear blockers, move the sprint) and offers a READ-ONLY peek at
// the other squad via TeamScopeTabs, so a lead can see what the other team is doing and offer help
// without being able to change another team's work (the backend enforces the same rule on writes). "

import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AiStatusBar } from '../../components/AiStatusBar';
import { DashboardFilters, TeamScopeTabs, type FilterState, type TeamScope, matchesPriority } from '../../components/DashboardFilters';
import { type Project, type Task, type DirUser, BOARD_STATUSES, isOpen, pct, relativeDue, tasksForTeam, squadMembers, otherTeam, isLead, statusClass, StatTile, ProgressRow, PriorityPill, Spinner, Empty, Avatar } from './shared';

export function TeamCaptainDashboard() {
  const { user } = useAuth();
  const myTeam = user?.team ?? '';
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<DirUser[]>([]);
  const [scope, setScope] = useState<TeamScope>('mine');
  const [filters, setFilters] = useState<FilterState>({ team: 'mine', priority: 'all' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(first = false) {
    if (first) setLoading(true);
    Promise.all([
      api<Project[]>('/api/projects').then(setProjects),
      api<Task[]>('/api/tasks').then(setTasks),
      api<DirUser[]>('/api/users').then(setUsers).catch(() => undefined),
    ]).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }
  useEffect(() => load(true), []);

  async function patch(taskId: string, body: Record<string, string>) {
    try { await api(`/api/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(body) }); load(); }
    catch (e) { setError((e as Error).message); }
  }

  // 'mine' = lead's own squad (full control); 'other' = the other squad (read-only awareness + help).
  const viewedTeam = scope === 'mine' ? myTeam : (otherTeam(myTeam) ?? myTeam);
  const readOnly = scope === 'other';
  const teamTasks = tasksForTeam(tasks, projects, viewedTeam).filter((t) => matchesPriority(t.priority, filters.priority));
  const teamMembers = squadMembers(users, viewedTeam); // includes the tier-3 lead + the engineers
  const done = teamTasks.filter((t) => t.status === 'Done').length;
  const completion = pct(done, teamTasks.length);
  const blocked = teamTasks.filter((t) => t.status === 'Blocked');
  const inReview = teamTasks.filter((t) => t.status === 'In Review').length;
  const maxLoad = Math.max(1, ...teamMembers.map((m) => teamTasks.filter((t) => t.ownerId === m.id && isOpen(t)).length));

  return (
    <div>
      <AiStatusBar />
      <div className="topbar">
        <div>
          <h1>Team Command — {viewedTeam}</h1>
          <p className="muted">Welcome, {user?.name}. {readOnly
            ? `Viewing ${viewedTeam} (read-only) — see their progress and offer help where you can.`
            : `Lead ${myTeam}: assign work, clear blockers, keep the sprint moving.`}</p>
        </div>
        <span className="badge">Team Lead · Tier 3</span>
      </div>
      <TeamScopeTabs userTeam={myTeam} scope={scope} onChange={setScope} />
      <DashboardFilters value={filters} onChange={setFilters} options={{ showTeam: false }} userTeam={user?.team} />
      {error && <div className="error-banner">{error}</div>}
      {loading ? <Spinner label={`Loading ${viewedTeam}…`} /> : (
        <>
          {readOnly && <div className="notice blue section">You&apos;re viewing <b>{viewedTeam}</b> in read-only mode. Switch back to <b>My team</b> to assign or update work.</div>}

          <div className="grid cards">
            <StatTile label="Team Open Tasks" value={teamTasks.filter(isOpen).length} accent="blue" icon="check" foot={viewedTeam} />
            <StatTile label="Blocked" value={blocked.length} accent="red" icon="alert" foot={readOnly ? 'on the other team' : 'unblock or escalate'} />
            <StatTile label="In Review" value={inReview} accent="amber" icon="clock" foot="awaiting review" />
            <StatTile label="Team Completion" value={`${completion}%`} accent="green" icon="bar" foot={`${done} of ${teamTasks.length} done`} />
          </div>

          <div className="grid main-sidebar section">
            <div className="card">
              <h3>{readOnly ? `${viewedTeam}’s Work` : 'My Team’s Work'}</h3>
              {teamTasks.length === 0 ? <Empty title={`No tasks for ${viewedTeam} in this view`} hint="Try changing the priority filter." icon="check" /> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Task</th><th>Owner</th><th>Status</th></tr></thead>
                    <tbody>
                      {teamTasks.map((t) => {
                        const rd = relativeDue(t.dueDate);
                        return (
                          <tr key={t.id}>
                            <td><b>{t.title}</b><br /><span className="muted small"><PriorityPill priority={t.priority} /> · <span className={`due ${rd.overdue ? 'over' : ''}`}>{rd.text}</span></span></td>
                            <td>
                              <div className="av-row">
                                <Avatar name={t.owner?.name ?? 'Unassigned'} sm />
                                {readOnly
                                  ? <span className="muted small">{t.owner?.name ?? 'Unassigned'}</span>
                                  : (
                                    <select value={t.ownerId ?? ''} onChange={(e) => patch(t.id, { ownerId: e.target.value })} style={{ width: 140 }}>
                                      <option value="" disabled>Assign…</option>
                                      {teamMembers.map((m) => <option key={m.id} value={m.id}>{m.name}{isLead(m.role) ? ' (Lead)' : ''}</option>)}
                                    </select>
                                  )}
                              </div>
                            </td>
                            <td>
                              {readOnly
                                ? <span className={`status ${statusClass(t.status)}`}>{t.status}</span>
                                : (
                                  <select value={t.status} onChange={(e) => patch(t.id, { status: e.target.value })}>
                                    {BOARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                                  </select>
                                )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <div className="card">
                <h3>{readOnly ? `${viewedTeam} Roster` : 'Team Roster'}</h3>
                <p className="muted small">Open tasks per member (Lead included).</p>
                {teamMembers.length === 0 ? <Empty title={`No members on ${viewedTeam}`} icon="users" /> : teamMembers.map((m) => {
                  const load = teamTasks.filter((t) => t.ownerId === m.id && isOpen(t)).length;
                  return (
                    <div className="av-row" key={m.id} style={{ marginBottom: 4 }}>
                      <Avatar name={m.name} sm />
                      <div style={{ flex: 1 }}><ProgressRow name={`${m.name}${isLead(m.role) ? ' (Lead)' : ''} · ${load}`} value={pct(load, maxLoad)} suffix="" /></div>
                    </div>
                  );
                })}
              </div>

              <div className="card section">
                <h3>Blockers{readOnly ? '' : ' to Escalate'} ({blocked.length})</h3>
                {blocked.length === 0 ? <Empty title="No blockers" hint="Sprint is flowing." icon="check" /> : blocked.map((t) => (
                  <div className="list-row" key={t.id}>
                    <Avatar name={t.owner?.name ?? 'Unassigned'} sm />
                    <div className="grow"><b>{t.title}</b><br /><span className="muted small">{t.owner?.name ?? 'Unassigned'}</span></div>
                    <span className="status red">Blocked</span>
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
