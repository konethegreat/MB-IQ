// Code written by Kone & Claude | The code does the following: " Tier 1 (Final Leader) dashboard with
// team/priority filters, live API/AI status bar, and portfolio views wired to the backend. "

import { useEffect, useState } from 'react';
import { api } from '../../api/client';
import { downloadArtifactPdf } from '../../components/pdfExport';
import { RiskRadar } from '../../components/RiskRadar';
import { useAuth } from '../../auth/AuthContext';
import { AiStatusBar } from '../../components/AiStatusBar';
import { DashboardFilters, DEFAULT_FILTERS, type FilterState, filterProjectsAndTasks } from '../../components/DashboardFilters';
import { type Project, type Task, SQUAD_TEAMS, statusClass, healthClass, isOverdue, pct, fmtDate, relativeDue, StatTile, Donut, Spinner, Empty, Avatar } from './shared';

export function FinalLeaderDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api<Project[]>('/api/projects').then(setProjects),
      api<Task[]>('/api/tasks').then(setTasks).catch(() => undefined),
    ]).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }, []);

  const { filteredProjects, filteredTasks } = filterProjectsAndTasks(projects, tasks, filters, user?.team);

  const done = filteredTasks.filter((t) => t.status === 'Done').length;
  const delivery = pct(done, filteredTasks.length);
  const green = filteredProjects.filter((p) => p.health === 'Green').length;
  const amber = filteredProjects.filter((p) => p.health === 'Amber').length;
  const red = filteredProjects.filter((p) => p.health === 'Red').length;
  const atRisk = amber + red;
  const blocked = filteredTasks.filter((t) => t.status === 'Blocked').length;
  const overdue = filteredTasks.filter(isOverdue).length;

  const teamOf = new Map(filteredProjects.map((p) => [p.id, p.team ?? 'Unassigned']));
  const teamStats = SQUAD_TEAMS.map((team) => {
    const tt = filteredTasks.filter((t) => t.projectId && teamOf.get(t.projectId) === team);
    const d = tt.filter((t) => t.status === 'Done').length;
    return { team, total: tt.length, done: d, pct: pct(d, tt.length) };
  });
  const attention = filteredTasks.filter((t) => t.status === 'Blocked' || isOverdue(t));

  async function downloadBoardReport() {
    setBusy(true); setError('');
    try {
      const r = await api<{ artifact: string }>('/api/ai/report', { method: 'POST', body: JSON.stringify({ title: 'MB IQ Board & Leadership Report' }) });
      await downloadArtifactPdf({ title: 'MB IQ Board & Leadership Report', subtitle: 'Demo Engineering Command Centre', markdown: r.artifact, filename: 'mb-iq-board-report.pdf' });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const briefing = `${atRisk === 0 ? 'All projects in view are currently rated healthy.' : `${atRisk} project(s) are off "Green" and need attention.`} `
    + `${blocked === 0 ? 'No critical blockers are open.' : `${blocked} task(s) are blocked and require escalation.`} `
    + `${overdue === 0 ? 'Nothing is overdue.' : `${overdue} task(s) are past their due date.`} `
    + `Overall delivery in this view stands at ${delivery}%.`;

  return (
    <div>
      <AiStatusBar />
      <div className="topbar">
        <div><h1>Executive Overview</h1><p className="muted">Welcome, {user?.name}. The whole portfolio at a glance.</p></div>
        <span className="badge">Final Leader · Tier 1</span>
      </div>
      <DashboardFilters value={filters} onChange={setFilters} userTeam={user?.team} />
      {error && <div className="error-banner">{error}</div>}
      {loading ? <Spinner label="Loading the portfolio…" /> : (
        <>
          <div className="grid cards">
            <StatTile label="Active Projects" value={filteredProjects.length} accent="green" icon="folder" foot="in current filter" />
            <StatTile label="Overall Delivery" value={`${delivery}%`} accent="blue" icon="bar" foot={`${done} of ${filteredTasks.length} tasks done`} />
            <StatTile label="At-Risk Projects" value={atRisk} accent="amber" icon="alert" foot="Amber or Red health" />
            <StatTile label="Critical Escalations" value={blocked} accent="red" icon="clock" foot="blocked in view" />
          </div>

          <div className="grid main-sidebar section">
            <div className="card">
              <h3>Portfolio Health</h3>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Project</th><th>Team</th><th>Status</th><th>Health</th><th>Delivery</th><th>Due</th></tr></thead>
                  <tbody>
                    {filteredProjects.map((p) => {
                      const ptk = filteredTasks.filter((t) => t.projectId === p.id);
                      const pd = ptk.filter((t) => t.status === 'Done').length;
                      return (
                        <tr key={p.id}>
                          <td><b>{p.name}</b><br /><span className="muted small">{p.type}</span></td>
                          <td>{p.team ?? '—'}</td>
                          <td><span className={`status ${statusClass(p.status)}`}>{p.status}</span></td>
                          <td><span className={`health-dot ${healthClass(p.health)}`} />{p.health}</td>
                          <td><b>{pct(pd, ptk.length)}%</b><br /><span className="muted small">{pd}/{ptk.length} tasks</span></td>
                          <td>{fmtDate(p.dueDate)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div>
              <div className="card">
                <h3>Health Mix</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                  <Donut data={[{ label: 'Green', value: green, color: '#6f9a00' }, { label: 'Amber', value: amber, color: '#b9770e' }, { label: 'Red', value: red, color: '#d64545' }]} />
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div className="list-row"><span className="health-dot green" /><div className="grow">On track</div><b>{green}</b></div>
                    <div className="list-row"><span className="health-dot amber" /><div className="grow">Watch</div><b>{amber}</b></div>
                    <div className="list-row"><span className="health-dot red" /><div className="grow">Needs attention</div><b>{red}</b></div>
                  </div>
                </div>
              </div>
              <div className="card section">
                <h3>Team Performance</h3>
                <p className="muted small">Task completion by squad (filtered view).</p>
                <div className="barchart">
                  {teamStats.map((s) => (
                    <div className="bar" key={s.team}>
                      <div className="cap">{s.pct}%</div>
                      <div className={`fill ${s.team === 'Team Apex' ? 'navy' : ''}`} style={{ height: `${Math.max(3, s.pct)}%` }} />
                      <div className="lbl">{s.team}<br /><span className="muted">{s.done}/{s.total}</span></div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="section"><RiskRadar /></div>
              <div className="card section"><h3>AI Executive Briefing</h3><div className="notice">{briefing}</div></div>
              <button className="btn navy full section" onClick={downloadBoardReport} disabled={busy}>{busy ? 'Preparing…' : 'Download Board Report (PDF)'}</button>
            </div>
          </div>

          <div className="card section">
            <h3>Open Items Needing Leadership Attention</h3>
            {attention.length === 0 ? <Empty title="Nothing flagged" hint="No blockers or overdue work in this filter view." icon="check" />
              : attention.map((t) => {
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
        </>
      )}
    </div>
  );
}
