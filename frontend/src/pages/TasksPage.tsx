// Code written by Kone & Claude | The code does the following: " The Tasks page. Lists every task with
// owner avatar, project, status, priority pill, relative due date and branch. Roles with 'task:manage'
// get an inline create form and can change status; an engineer (task:own) can change the status of their
// own tasks. Spinner while loading; empty state when there are no tasks. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { can } from '../config/roles';
import { type Task, type Project, type Sprint, type DirUser, canEditTask, BOARD_STATUSES, statusClass, priorityClass, relativeDue, Spinner, Empty, Avatar } from './dashboards/shared';

export function TasksPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [users, setUsers] = useState<DirUser[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);
  const emptyForm = { title: '', projectId: '', sprintId: '', ownerId: '', priority: 'Medium', dueDate: '', branch: '', description: '' };
  const [form, setForm] = useState(emptyForm);
  const scoped = user?.role === 'TEAM_CAPTAIN';
  const availableProjects = projects.filter(p => !scoped || p.team === user?.team);
  const availableOwners = users.filter(u => !scoped || u.team === user?.team);
  const availableSprints = sprints.filter(s => (!scoped || s.team === user?.team) && (!form.projectId || !s.projectId || s.projectId === form.projectId));

  function load(first = false) {
    if (first) setLoading(true);
    api<Task[]>('/api/tasks').then(setTasks).catch((e) => setError(e.message)).finally(() => setLoading(false));
    api<Project[]>('/api/projects').then(setProjects).catch(() => undefined);
    api<DirUser[]>('/api/users').then(setUsers).catch(() => undefined);
    api<Sprint[]>('/api/sprints').then(setSprints).catch(() => undefined);
  }
  useEffect(() => load(true), []);

  function editable(t: Task): boolean { return canEditTask(user, t); }
  async function setStatus(id: string, status: string) {
    try { await api(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load(); }
    catch (e) { setError((e as Error).message); }
  }
  async function create(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      await api('/api/tasks', { method: 'POST', body: JSON.stringify({ ...form, projectId: form.projectId || undefined, sprintId: form.sprintId || undefined, ownerId: form.ownerId || undefined, dueDate: form.dueDate || undefined }) });
      setForm(emptyForm);
      setOpen(false); load();
    } catch (err) { setError((err as Error).message); }
  }

  return (
    <div>
      <div className="topbar">
        <div><h1>Tasks</h1><p className="muted">Owners, deadlines, priorities, blockers, branches and acceptance criteria.</p></div>
        {can(user, 'task:manage') && <button className="btn green" onClick={() => setOpen((v) => !v)}>{open ? 'Close' : '+ New Task'}</button>}
      </div>
      {error && <div className="error-banner">{error}</div>}

      {open && can(user, 'task:manage') && (
        <form className="card section" onSubmit={create}>
          <h3>New Task</h3>
          <div className="grid two">
            <div className="field"><label htmlFor="task-title">Title</label><input id="task-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></div>
            <div className="field"><label htmlFor="task-project">Project</label>
              <select id="task-project" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value, sprintId: '' })}>
                <option value="">— Select —</option>
                {availableProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="task-sprint">Sprint</label>
              <select id="task-sprint" value={form.sprintId} onChange={(e) => setForm({ ...form, sprintId: e.target.value })}>
                <option value="">No sprint</option>
                {availableSprints.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="task-owner">Owner</label>
              <select id="task-owner" value={form.ownerId} onChange={(e) => setForm({ ...form, ownerId: e.target.value })}>
                <option value="">Unassigned</option>
                {availableOwners.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.team ?? '—'})</option>)}
              </select>
            </div>
            <div className="field"><label htmlFor="task-priority">Priority</label>
              <select id="task-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>Low</option><option>Medium</option><option>High</option><option>Critical</option>
              </select>
            </div>
            <div className="field"><label htmlFor="task-due">Due date</label><input id="task-due" type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></div>
            <div className="field"><label htmlFor="task-branch">Branch</label><input id="task-branch" value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="feature/…" /></div>
          </div>
          <div className="field"><label htmlFor="task-description">Description</label><textarea id="task-description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <button className="btn green" disabled={!form.title.trim()}>Create Task</button>
        </form>
      )}

      {loading ? <Spinner label="Loading tasks…" /> : (
        <div className="card section">
          {tasks.length === 0 ? <Empty title="No tasks yet" hint={can(user, 'task:manage') ? 'Use “+ New Task” to create one.' : 'Nothing assigned across the department yet.'} icon="check" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Task</th><th>Project</th><th>Owner</th><th>Status</th><th>Priority</th><th>Due</th><th>Branch</th></tr></thead>
                <tbody>
                  {tasks.map((t) => {
                    const rd = relativeDue(t.dueDate);
                    return (
                      <tr key={t.id}>
                        <td><b>{t.title}</b></td>
                        <td>{t.project?.name ?? '—'}</td>
                        <td><div className="av-row"><Avatar name={t.owner?.name ?? 'Unassigned'} sm /><span className="small">{t.owner?.name ?? 'Unassigned'}</span></div></td>
                        <td>{editable(t)
                          ? <select aria-label={`Status for ${t.title}`} value={t.status} onChange={(e) => setStatus(t.id, e.target.value)}>{BOARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}</select>
                          : <span className={`status ${statusClass(t.status)}`}>{t.status}</span>}</td>
                        <td><span className={`pill ${priorityClass(t.priority)}`}>{t.priority}</span></td>
                        <td><span className={`due ${rd.overdue ? 'over' : ''}`}>{rd.text}</span></td>
                        <td>{t.branch ?? '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
