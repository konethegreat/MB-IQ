// Code written by Kone & Claude | The code does the following: " The Communication page. Members of the
// IT division ('comm:participate') post updates to channels and read the live feed. Spinner while
// loading; empty state when a channel feed has no messages yet. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Spinner, Empty, Avatar } from './dashboards/shared';

interface Message { id: string; channel: string; body: string; createdAt: string; author?: { name: string; role: string } | null }
const CHANNELS = ['General Department Updates', 'Team Alpha', 'Team Apex', 'Blockers', 'Deployments', 'Innovation Ideas'];

export function CommunicationPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [channel, setChannel] = useState(CHANNELS[0]);
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function load(first = false) {
    if (first) setLoading(true);
    api<Message[]>('/api/messages').then(setMessages).catch((e) => setError(e.message)).finally(() => setLoading(false));
  }
  useEffect(() => load(true), []);

  async function send(e: React.FormEvent) {
    e.preventDefault(); setError('');
    try { await api('/api/messages', { method: 'POST', body: JSON.stringify({ channel, body }) }); setBody(''); load(); }
    catch (err) { setError((err as Error).message); }
  }

  return (
    <div>
      <div className="topbar">
        <div><h1>Communication</h1><p className="muted">Team updates, management notices, blockers, deployment notes and innovation ideas.</p></div>
        <span className="badge">{user?.roleLabel}</span>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="grid main-sidebar section">
        <div className="card">
          <h3>Communication Centre</h3>
          {loading ? <Spinner /> : messages.length === 0 ? <Empty title="No messages yet" hint="Post the first update on the right." icon="message" /> : messages.map((m) => (
            <div className="msg" key={m.id}>
              <div className="av-row"><Avatar name={m.author?.name ?? 'Unknown'} sm /><b>{m.channel}</b> <span className="muted small">· {m.author?.name ?? 'Unknown'} · {new Date(m.createdAt).toLocaleString()}</span></div>
              <p>{m.body}</p>
            </div>
          ))}
        </div>

        <form className="card" onSubmit={send}>
          <h3>Post Update</h3>
          <div className="field"><label>Channel</label>
            <select value={channel} onChange={(e) => setChannel(e.target.value)}>{CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}</select>
          </div>
          <div className="field"><label>Message</label><textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Share an update…" required /></div>
          <button className="btn green" disabled={!body.trim()}>Send Update</button>
        </form>
      </div>
    </div>
  );
}
