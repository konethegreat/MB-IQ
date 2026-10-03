// Code written by Kone & Claude | The code does the following: " The Projects page. Everyone with
// 'project:view' sees the full portfolio table; 'project:manage' holders get an inline create form.
// Spinner while loading; empty state when there are no projects. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { can } from '../config/roles';
import { type Project, statusClass, fmtDate, Spinner, Empty } from './dashboards/shared';

export function ProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Internal Operations Project', team: 'Team Alpha', priority: 'Medium', description: '' });

  function load(first = false) {
    if (first) setLoading(true);
    api<Project[]>('/api/projects').then(setProjects).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => load(true), []);

  async function create(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api('/api/projects', { method: 'POST', body: JSON.stringify(form) });
      setForm({ name: '', type: 'Internal Operations Project', team: 'Team Alpha', priority: 'Medium', description: '' });
      setOpen(false); load();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <div>
      <div className="topbar">
        <div><h1>Projects</h1><p className="muted">Internal systems, client tools, innovation ideas and social-impact technologies.</p></div>
        {can(user, 'project:manage') && <button className="btn green" onClick={() => setOpen((v) => !v)}>{open ? 'Close' : '+ New Project'}</button>}
      </div>
      {error && <div className="error-banner">{error}</div>}

      {open && can(user, 'project:manage') && (
        <form className="card section" onSubmit={create}>
          <h3>New Project</h3>
          <div className="grid two">
            <div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="field"><label>Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                <option>Internal Operations Project</option><option>Client Delivery Project</option>
                <option>Social Impact Technology Project</option><option>Experimental / Innovation Project</option>
              </select>
            </div>
            <div className="field"><label>Team</label>
              <select value={form.team} onChange={(e) => setForm({ ...form, team: e.target.value })}>
                <option>Team Alpha</option><option>Team Apex</option><option>Management</option>
              </select>
            </div>
            <div className="field"><label>Priority</label>
              <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
          </div>
          <div className="field"><label>Description</label><textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <button className="btn green" disabled={!form.name.trim()}>Create Project</button>
        </form>
      )}

      {loading ? <Spinner label="Loading projects…" /> : (
        <div className="card section">
          {projects.length === 0 ? <Empty title="No projects yet" icon="folder" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Type</th><th>Team</th><th>Status</th><th>Priority</th><th>Health</th><th>Owner</th><th>Due</th></tr></thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.name}</b><br /><span className="muted small">{p.description}</span></td>
                      <td>{p.type}</td><td>{p.team ?? '—'}</td>
                      <td><span className={`status ${statusClass(p.status)}`}>{p.status}</span></td>
                      <td>{p.priority ?? '—'}</td>
                      <td><span className={`status ${statusClass(p.health)}`}>{p.health}</span></td>
                      <td>{p.owner?.name ?? '—'}</td><td>{fmtDate(p.dueDate)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
