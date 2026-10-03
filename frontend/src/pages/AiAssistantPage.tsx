// Code written by Kone & Claude | The code does the following: " The AI Assistant page, backed by the
// Anthropic service. It structures meeting notes into an action pack, runs the AI Coach on the user's
// workload (when permitted), and generates a downloadable PDF status report (when permitted). A live/
// fallback badge tells the user whether a real Anthropic key is configured. "

import { useEffect, useState } from 'react';
import { api, downloadPdf } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { can } from '../config/roles';

export function AiAssistantPage() {
  const { user } = useAuth();
  const [live, setLive] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState('');
  const [output, setOutput] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<{ live: boolean }>('/api/ai/status').then((r) => setLive(r.live)).catch(() => setLive(false));
  }, []);

  // Code written by Kone & Claude | The code does the following: " Sends the transcript to the AI to
  // produce a structured meeting pack. "
  async function structureMeeting() {
    setBusy('meeting'); setError('');
    try {
      const r = await api<{ summary: string }>('/api/ai/meeting', {
        method: 'POST',
        body: JSON.stringify({ title: 'Team Meeting', type: 'Sprint Planning', transcript }),
      });
      setOutput(r.summary);
    } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }

  // Code written by Kone & Claude | The code does the following: " Runs the AI Coach on the current
  // user's open tasks and shows the prioritisation advice. "
  async function runCoach() {
    setBusy('coach'); setError('');
    try {
      const r = await api<{ advice: string }>('/api/ai/coach', { method: 'POST', body: JSON.stringify({ userId: user?.id }) });
      setOutput(r.advice);
    } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }

  // Code written by Kone & Claude | The code does the following: " Requests a generated PDF status
  // report and downloads it in the browser. "
  async function generateReport() {
    setBusy('report'); setError('');
    try {
      await downloadPdf('/api/ai/report', { title: 'MB IQ Department Status Report' }, 'mb-iq-status-report.pdf');
    } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }

  return (
    <div>
      <div className="topbar">
        <div><h1>AI Assistant</h1><p className="muted">Summaries, coaching and reports powered by Anthropic.</p></div>
        {live !== null && <span className={`badge ${live ? 'green' : 'amber'}`}>{live ? 'Live AI' : 'Fallback mode (no key)'}</span>}
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <h3>Meeting Intelligence</h3>
          <p className="muted small">Paste notes; the AI returns a structured action pack.</p>
          <textarea rows={8} value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Paste meeting notes here…" />
          <button className="btn green" disabled={busy === 'meeting' || !transcript} onClick={structureMeeting}>
            {busy === 'meeting' ? 'Working…' : 'Generate Meeting Pack'}
          </button>

          <div className="actions section">
            {can(user, 'ai:coach') && (
              <button className="btn" disabled={busy === 'coach'} onClick={runCoach}>
                {busy === 'coach' ? 'Coaching…' : 'AI Coach: prioritise my workload'}
              </button>
            )}
            {can(user, 'report:generate') && (
              <button className="btn" disabled={busy === 'report'} onClick={generateReport}>
                {busy === 'report' ? 'Generating…' : 'Download PDF status report'}
              </button>
            )}
          </div>
        </div>

        <div className="card">
          <h3>AI Output</h3>
          <pre className="summary-box">{output || 'Run a tool on the left to see AI output here.'}</pre>
        </div>
      </div>
    </div>
  );
}
