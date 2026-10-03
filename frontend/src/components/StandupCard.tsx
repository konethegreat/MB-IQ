// Code written by Kone & Claude | The code does the following: " Auto Standup widget. Generates a
// deterministic per-team (or all-teams) standup/RAG digest from live tasks, renders it via <RichContent>,
// and lets the user post it straight to a communication channel. Used on the leader dashboards. "

import { useState } from 'react';
import { api } from '../api/client';
import { RichContent } from './RichContent';
import { SQUAD_TEAMS, isSquadTeam } from '../pages/dashboards/shared';

export function StandupCard({ defaultTeam }: { defaultTeam?: string | null }) {
  const [team, setTeam] = useState<string>(isSquadTeam(defaultTeam) ? defaultTeam : '');
  const [markdown, setMarkdown] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  async function generate() {
    setBusy(true); setError('');
    try {
      const r = await api<{ markdown: string }>(`/api/insights/standup${team ? `?team=${encodeURIComponent(team)}` : ''}`);
      setMarkdown(r.markdown);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function post() {
    if (!markdown) return;
    setError('');
    try {
      await api('/api/messages', { method: 'POST', body: JSON.stringify({ channel: team || 'General Department Updates', body: markdown }) });
      setToast('Posted to the channel.'); setTimeout(() => setToast(''), 3000);
    } catch (e) { setError((e as Error).message); }
  }

  return (
    <div className="card">
      <h3>Auto Standup</h3>
      <div className="av-row" style={{ gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <select value={team} onChange={(e) => setTeam(e.target.value)}>
          <option value="">All teams</option>
          {SQUAD_TEAMS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <button className="btn navy" onClick={generate} disabled={busy}>{busy ? 'Building…' : 'Generate'}</button>
        {markdown && <button className="btn ghost" onClick={post}>Post to channel</button>}
      </div>
      {error && <div className="error-banner">{error}</div>}
      {toast && <div className="notice">{toast}</div>}
      {markdown && <RichContent markdown={markdown} />}
    </div>
  );
}
