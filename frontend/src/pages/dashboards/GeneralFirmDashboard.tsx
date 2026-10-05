// Code written by Kone & Claude | The code does the following: " Tier 5 (General Firm) dashboard —
// plain project progress with team/priority filters, AI-organised note submission, live status bar,
// and a history of the user's own notes formatted by the Anthropic API. "

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import { AiStatusBar } from '../../components/AiStatusBar';
import { DashboardFilters, DEFAULT_FILTERS, type FilterState, matchesPriority, matchesTeam } from '../../components/DashboardFilters';
import { type Project, healthClass, stageProgress, Spinner, Empty } from './shared';

interface Classification { category: string; tags: string[]; severity: string }
interface MyNote {
  id: string; subject?: string | null; body: string; summary?: string | null;
  status: string; createdAt: string; classification?: Classification | null;
}

function sevClass(s: string): string {
  return s === 'Critical' || s === 'High' ? 'red' : s === 'Medium' ? 'amber' : 'blue';
}

export function GeneralFirmDashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [myNotes, setMyNotes] = useState<MyNote[]>([]);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState('');
  const [note, setNote] = useState('');
  const [lastSubmitted, setLastSubmitted] = useState<MyNote | null>(null);
  const [error, setError] = useState('');

  function loadNotes() {
    api<MyNote[]>('/api/notes/mine').then(setMyNotes).catch(() => undefined);
  }

  useEffect(() => {
    Promise.all([
      api<Project[]>('/api/projects').then(setProjects),
      api<MyNote[]>('/api/notes/mine').then(setMyNotes).catch(() => undefined),
    ]).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      const created = await api<MyNote>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ body: note, subject: subject.trim() || undefined }),
      });
      setNote(''); setSubject(''); setLastSubmitted(created); loadNotes();
    } catch (err) { setError((err as Error).message); }
  }

  const filteredProjects = projects.filter((p) => matchesTeam(p.team, filters.team, user?.team) && matchesPriority(p.priority, filters.priority));
  const onTrack = filteredProjects.filter((p) => p.health === 'Green').length;
  const friendly: Record<string, string> = { Idea: 'Getting started', 'On Hold': 'Paused for now', Development: 'In progress', Testing: 'Nearly there', Deployed: 'Live' };

  return (
    <div>
      <AiStatusBar />
      <div className="topbar">
        <div><h1>Project Progress</h1><p className="muted">Welcome, {user?.name}. A plain-language view of what the IT division is building.</p></div>
        <span className="badge">General Firm · Tier 5</span>
      </div>
      <DashboardFilters value={filters} onChange={setFilters} options={{ showTeam: true }} userTeam={user?.team} />
      {error && <div className="error-banner">{error}</div>}
      {loading ? <Spinner label="Loading progress…" /> : (
        <>
          <div className="notice section">
            The IT division is currently working on <b>{filteredProjects.length}</b> project(s) in this view; <b>{onTrack}</b> are on track and healthy.
          </div>

          <div className="grid two section">
            {filteredProjects.length === 0 ? <Empty title="No projects match your filters" hint="Try changing the team or priority filter." icon="folder" /> : filteredProjects.map((p) => (
              <div className="card lift" key={p.id}>
                <div className="list-row" style={{ borderBottom: 'none', paddingTop: 0 }}>
                  <div className="grow"><b>{p.name}</b><br /><span className="muted small">{friendly[p.status] ?? p.status}{p.team ? ` · ${p.team}` : ''}</span></div>
                  <span className="chip"><span className={`health-dot ${healthClass(p.health)}`} />{p.health === 'Green' ? 'On track' : p.health === 'Red' ? 'Needs attention' : 'Watch'}</span>
                </div>
                <p className="muted small">{p.description}</p>
                <div className="progress"><span style={{ width: `${stageProgress(p.status)}%` }} /></div>
                <div className="small muted" style={{ marginTop: 6 }}>{stageProgress(p.status)}% through its journey</div>
              </div>
            ))}
          </div>

          <form className="card section" onSubmit={submit}>
            <h3>Leave a note for the IT division</h3>
            <p className="muted small">Your note is saved for IT. Summaries and categories use local fallback rules when AI is not configured.</p>
            <div className="field">
              <label>Subject (optional)</label>
              <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief title for your note…" />
            </div>
            <div className="field">
              <label>Your message</label>
              <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Type your question, request or feedback…" required />
            </div>
            <button className="btn green" disabled={!note.trim()}>Send note</button>

            {lastSubmitted && (
              <div className="note-organised">
                <p className="muted small" style={{ marginBottom: 8 }}>Note received:</p>
                <div className="row">
                  <span className="note-summary">{lastSubmitted.summary ?? lastSubmitted.subject ?? 'Note received'}</span>
                  {lastSubmitted.classification && (
                    <>
                      <span className="chip">{lastSubmitted.classification.category}</span>
                      <span className={`status ${sevClass(lastSubmitted.classification.severity)}`}>{lastSubmitted.classification.severity}</span>
                    </>
                  )}
                </div>
                {lastSubmitted.classification?.tags.map((t) => <span key={t} className="pill blue">#{t}</span>)}
                <p className="muted small" style={{ marginTop: 8 }}>The IT division will follow up. You can also use the <Link to="/notes">Notes page</Link> to see your history.</p>
              </div>
            )}
          </form>

          {myNotes.length > 0 && (
            <div className="card section">
              <h3>Your Notes ({myNotes.length})</h3>
              <p className="muted small">Previously submitted notes and saved summaries.</p>
              {myNotes.map((n) => (
                <div className="note-card" key={n.id}>
                  <div className="note-head">
                    <span className="note-summary">{n.summary ?? n.subject ?? 'Note'}</span>
                    <span className="muted small">{new Date(n.createdAt).toLocaleString()}</span>
                    {n.classification && (
                      <>
                        <span className="chip">{n.classification.category}</span>
                        <span className={`status ${sevClass(n.classification.severity)}`}>{n.classification.severity}</span>
                      </>
                    )}
                  </div>
                  <p className="muted small">{n.body}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
