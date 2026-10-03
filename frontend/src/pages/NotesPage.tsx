// Code written by Kone & Claude | The code does the following: " The Notes page. Every signed-in user
// can leave a note for IT with optional subject; AI organises each note (summary, category, severity).
// Tier 5 sees their own history via /api/notes/mine; IT tiers see the full triaged inbox. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { can } from '../config/roles';
import { AiStatusBar } from '../components/AiStatusBar';
import { Spinner, Empty, Avatar } from './dashboards/shared';

interface Classification { category: string; tags: string[]; severity: 'Low' | 'Medium' | 'High' | 'Critical' }
interface Note {
  id: string; subject?: string | null; body: string; summary?: string | null;
  status: string; createdAt: string;
  author?: { name: string; role: string } | null;
  classification?: Classification | null;
}

function sevClass(s: string): string {
  return s === 'Critical' || s === 'High' ? 'red' : s === 'Medium' ? 'amber' : 'blue';
}

function NoteOrganised({ n }: { n: Note }) {
  return (
    <div className="note-organised" style={{ marginTop: 8 }}>
      <div className="row">
        <span className="note-summary">{n.summary ?? n.subject ?? 'Note'}</span>
        {n.classification && (
          <>
            <span className="chip">{n.classification.category}</span>
            <span className={`status ${sevClass(n.classification.severity)}`}>{n.classification.severity}</span>
          </>
        )}
      </div>
      {n.classification?.tags.map((t) => <span key={t} className="pill blue">#{t}</span>)}
    </div>
  );
}

export function NotesPage() {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[]>([]);
  const [myNotes, setMyNotes] = useState<Note[]>([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [lastSubmitted, setLastSubmitted] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const viewer = can(user, 'note:view');

  function load(first = false) {
    if (first) setLoading(true);
    const loads: Promise<void>[] = [];
    if (viewer) loads.push(api<Note[]>('/api/notes').then(setNotes).then(() => undefined));
    loads.push(api<Note[]>('/api/notes/mine').then(setMyNotes).then(() => undefined));
    Promise.all(loads).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => load(true), [user]);

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try {
      const created = await api<Note>('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ body, subject: subject.trim() || undefined }),
      });
      setBody(''); setSubject(''); setLastSubmitted(created); load();
    } catch (err) { setError((err as Error).message); }
  }
  async function reclassify(id: string) {
    try {
      const r = await api<{ classification: Classification | null }>(`/api/notes/${id}/reclassify`, { method: 'POST', body: '{}' });
      setNotes((ns) => ns.map((n) => (n.id === id ? { ...n, classification: r.classification } : n)));
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <AiStatusBar />
      <div className="topbar">
        <div><h1>Notes for the IT Division</h1><p className="muted">Leave a note — AI organises it with a subject, category and priority using the active Anthropic API key.</p></div>
        <span className="badge">{user?.roleLabel}</span>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <form className="card section" onSubmit={submit}>
        <h3>Leave a note</h3>
        <div className="field">
          <label>Subject (optional)</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief title…" />
        </div>
        <div className="field">
          <label>Message</label>
          <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Type your note for the IT division…" required />
        </div>
        <button className="btn green" disabled={!body.trim()}>Send note</button>
        {lastSubmitted && (
          <div className="notice section">
            Thank you — your note has been sent. AI organisation:
            <NoteOrganised n={lastSubmitted} />
          </div>
        )}
      </form>

      {!viewer && myNotes.length > 0 && (
        <div className="card section">
          <h3>Your Notes ({myNotes.length})</h3>
          {myNotes.map((n) => (
            <div className="note-card" key={n.id}>
              <NoteOrganised n={n} />
              <p className="muted small" style={{ marginTop: 6 }}>{n.body}</p>
              <span className="muted small">{new Date(n.createdAt).toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}

      {viewer && (
        <div className="card section">
          <h3>Incoming Notes ({notes.length})</h3>
          {loading ? <Spinner /> : notes.length === 0 ? <Empty title="No notes yet" hint="Notes left by the firm will appear here, auto-sorted by category and severity." icon="inbox" /> : notes.map((n) => (
            <div className="msg" key={n.id}>
              <div className="av-row" style={{ marginBottom: 4 }}>
                <Avatar name={n.author?.name ?? 'Anonymous'} sm />
                <b>{n.author?.name ?? 'Anonymous'}</b>
                <span className="muted small">{new Date(n.createdAt).toLocaleString()}</span>
                {n.classification && (
                  <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className="chip">{n.classification.category}</span>
                    <span className={`status ${sevClass(n.classification.severity)}`}>{n.classification.severity}</span>
                  </span>
                )}
              </div>
              {n.summary && <p className="note-summary">{n.summary}</p>}
              <p>{n.body}</p>
              <div className="av-row" style={{ gap: 6, flexWrap: 'wrap' }}>
                {n.classification?.tags.map((t) => <span key={t} className="pill blue">#{t}</span>)}
                <button className="btn sm ghost" style={{ marginLeft: 'auto' }} onClick={() => reclassify(n.id)}>Reclassify</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
