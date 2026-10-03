// Code written by Kone & Claude | The code does the following: " The Jira-style sprint board. Tasks are
// grouped into Kanban columns by status; each card shows a priority pill, owner avatar and a relative/
// overdue due date. Users who can manage tasks (or who own a task) get a status dropdown to move it. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { can } from '../config/roles';
import { type Task, BOARD_STATUSES, priorityClass, relativeDue, Spinner, Avatar } from './dashboards/shared';

export function SprintBoardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(first = false) {
    if (first) setLoading(true);
    api<Task[]>('/api/tasks').then(setTasks).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => load(true), []);

  async function changeStatus(task: Task, status: string) {
    try { await api(`/api/tasks/${task.id}`, { method: 'PATCH', body: JSON.stringify({ status }) }); load(); }
    catch (e) { setError((e as Error).message); }
  }
  function editable(t: Task): boolean {
    return can(user, 'task:manage') || (can(user, 'task:own') && t.ownerId === user?.id);
  }

  return (
    <div>
      <div className="topbar">
        <div><h1>Sprint Board</h1><p className="muted">Move tasks across statuses. Changes are saved to the server.</p></div>
        <span className="badge">{user?.roleLabel}</span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {loading ? <Spinner label="Loading the board…" /> : (
        <div className="kanban">
          {BOARD_STATUSES.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col);
            return (
              <div className="col" key={col}>
                <h4>{col} <span className="count">{colTasks.length}</span></h4>
                {colTasks.map((t) => {
                  const rd = relativeDue(t.dueDate);
                  return (
                    <div className="task" key={t.id}>
                      <b>{t.title}</b>
                      <span className={`pill ${priorityClass(t.priority)}`}>{t.priority}</span>
                      <div className="av-row"><Avatar name={t.owner?.name ?? 'Unassigned'} sm /><span className="muted small">{t.owner?.name ?? 'Unassigned'}</span></div>
                      <small>{t.project?.name ?? 'No project'} · <span className={`due ${rd.overdue ? 'over' : ''}`}>{rd.text}</span></small>
                      {editable(t) && (
                        <select value={t.status} onChange={(e) => changeStatus(t, e.target.value)}>
                          {BOARD_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      )}
                    </div>
                  );
                })}
                {colTasks.length === 0 && <p className="muted small" style={{ padding: 8 }}>No tasks</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
