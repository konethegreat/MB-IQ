// Code written by Kone & Claude | The code does the following: " The Reports page. Department health
// metrics, plus an AI status report rendered as a structured artifact (<RichContent>): generate it,
// preview it on screen (headings/tables/diagrams), download it as an on-brand PDF, or save it to the
// Documentation centre. 'report:generate' holders can generate/download; 'doc:manage' can save. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { can } from '../config/roles';
import { RichContent } from '../components/RichContent';
import { downloadArtifactPdf } from '../components/pdfExport';
import { type Project, type Task, pct, StatTile, Spinner } from './dashboards/shared';

const REPORT_TITLE = 'MB IQ Department Status Report';

export function ReportsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [meetings, setMeetings] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [artifact, setArtifact] = useState('');
  const [busy, setBusy] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api<Project[]>('/api/projects').then(setProjects),
      api<Task[]>('/api/tasks').then(setTasks).catch(() => undefined),
      api<unknown[]>('/api/meetings').then((m) => setMeetings(m.length)).catch(() => undefined),
    ]).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }, []);

  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 3500); }

  const done = tasks.filter((t) => t.status === 'Done').length;
  const completion = pct(done, tasks.length);
  const blocked = tasks.filter((t) => t.status === 'Blocked').length;
  const inReview = tasks.filter((t) => t.status === 'In Review').length;
  const openTasks = tasks.filter((t) => t.status !== 'Done').length;

  const canGenerate = can(user, 'report:generate');
  const canSave = can(user, 'doc:manage');

  async function generate() {
    setBusy(true); setError('');
    try {
      const r = await api<{ artifact: string }>('/api/ai/report', { method: 'POST', body: JSON.stringify({ title: REPORT_TITLE }) });
      setArtifact(r.artifact);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function downloadPdf() {
    if (!artifact) return;
    setPdfBusy(true); setError('');
    try { await downloadArtifactPdf({ title: REPORT_TITLE, subtitle: 'Demo Engineering Command Centre', markdown: artifact, filename: 'mb-iq-status-report.pdf' }); }
    catch (e) { setError((e as Error).message); } finally { setPdfBusy(false); }
  }

  async function saveToDocs() {
    if (!artifact) return;
    setSaveBusy(true); setError('');
    try {
      await api('/api/documents', { method: 'POST', body: JSON.stringify({ title: `Status Report — ${new Date().toLocaleDateString()}`, type: 'AI Report', content: artifact }) });
      flash('Saved to the Documentation centre.');
    } catch (e) { setError((e as Error).message); } finally { setSaveBusy(false); }
  }

  // A non-AI snapshot shown before (or instead of) an AI report — also valid Markdown for <RichContent>.
  const snapshot = `## Weekly Department Snapshot\n\n`
    + `- **Projects active:** ${projects.length}\n`
    + `- **Open tasks:** ${openTasks}\n`
    + `- **Blocked tasks:** ${blocked}\n`
    + `- **Sprint completion:** ${completion}%\n`
    + `- **Meetings captured:** ${meetings}\n\n`
    + `### Recommended management actions\n\n`
    + `1. Review blocked tasks and assign escalation owners.\n`
    + `2. Confirm sprint demo output for each team.\n`
    + `3. Ensure every completed task has matching documentation.\n`
    + `4. Plan the next sprint's priorities with the Squad Leaders.`;

  return (
    <div>
      <div className="topbar">
        <div><h1>Reports</h1><p className="muted">Department health, sprint progress, blocker analysis and management reporting.</p></div>
        {canGenerate && <button className="btn navy" onClick={generate} disabled={busy}>{busy ? 'Generating…' : artifact ? 'Regenerate AI report' : 'Generate AI report'}</button>}
      </div>
      {error && <div className="error-banner">{error}</div>}
      {toast && <div className="notice section">{toast}</div>}
      {loading ? <Spinner label="Compiling report…" /> : (
        <>
          <div className="grid cards">
            <StatTile label="Sprint Completion" value={`${completion}%`} accent="green" icon="bar" />
            <StatTile label="Blocked" value={blocked} accent="red" icon="alert" />
            <StatTile label="In Review" value={inReview} accent="amber" icon="clock" />
            <StatTile label="Meetings Captured" value={meetings} accent="blue" icon="mic" />
          </div>

          <div className="card section">
            <div className="av-row" style={{ marginBottom: 8 }}>
              <h3 style={{ flex: 1, margin: 0 }}>{artifact ? 'AI Status Report' : 'Report Snapshot'}</h3>
              {artifact && canGenerate && <button className="btn ghost" onClick={downloadPdf} disabled={pdfBusy}>{pdfBusy ? 'Preparing…' : 'Download PDF'}</button>}
              {artifact && canSave && <button className="btn ghost" onClick={saveToDocs} disabled={saveBusy}>{saveBusy ? 'Saving…' : 'Save to Docs'}</button>}
            </div>
            {!artifact && canGenerate && <p className="muted small">This is a live snapshot. Click <b>Generate AI report</b> for a written executive report you can download as a PDF or save to the Documentation centre.</p>}
            <RichContent markdown={artifact || snapshot} />
          </div>
        </>
      )}
    </div>
  );
}
