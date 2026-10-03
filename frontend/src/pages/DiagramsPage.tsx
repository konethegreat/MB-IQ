// Code written by Kone & Claude | The code does the following: " The Diagram Studio. Generates Mermaid
// diagrams — Database (ER) from the schema, Org/RBAC from the team, Sprint Gantt from sprints (all live
// data, no AI), plus AI-drawn Architecture and free-form Custom diagrams. Renders them with <Mermaid>,
// lets you edit the source live, and export to PNG/PDF or save into the Documentation centre. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { can } from '../config/roles';
import { Mermaid, mermaidToPngDataUrl } from '../components/Mermaid';
import { downloadArtifactPdf } from '../components/pdfExport';
import { Spinner } from './dashboards/shared';

type Kind = 'er' | 'org' | 'gantt' | 'architecture' | 'custom';
interface DiagramRes { title: string; mermaid: string; aiGenerated: boolean }

const KINDS: { key: Kind; label: string; ai: boolean; hint: string }[] = [
  { key: 'er', label: 'Database (ER)', ai: false, hint: 'Entities & relationships, read from the Prisma schema.' },
  { key: 'org', label: 'Org / RBAC', ai: false, hint: 'Tiers, squads, Team Leads & engineers from the live roster.' },
  { key: 'gantt', label: 'Sprint Gantt', ai: false, hint: 'Each sprint window with its tasks as due-date milestones.' },
  { key: 'architecture', label: 'Architecture', ai: true, hint: 'AI-drawn system architecture.' },
  { key: 'custom', label: 'Custom (AI)', ai: true, hint: 'Describe any diagram you want.' },
];

export function DiagramsPage() {
  const { user } = useAuth();
  const canAi = can(user, 'ai:use');
  const canSave = can(user, 'doc:manage');
  const [kind, setKind] = useState<Kind>('er');
  const [prompt, setPrompt] = useState('');
  const [title, setTitle] = useState('Database (ER) Diagram');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const meta = KINDS.find((k) => k.key === kind)!;
  function flash(m: string) { setToast(m); setTimeout(() => setToast(''), 3000); }

  async function generate(k: Kind, p = prompt) {
    setBusy(true); setError('');
    try {
      const d = (k === 'architecture' || k === 'custom')
        ? await api<DiagramRes>('/api/diagrams/generate', { method: 'POST', body: JSON.stringify({ kind: k, prompt: p }) })
        : await api<DiagramRes>(`/api/diagrams/${k}`);
      setTitle(d.title); setCode(d.mermaid);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  // Load the ER diagram on first open.
  useEffect(() => { void generate('er'); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function pick(k: Kind) {
    setKind(k);
    if (k !== 'architecture' && k !== 'custom') void generate(k);
  }

  const fileBase = (title.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'diagram');

  async function exportPng() {
    setError('');
    try { const { dataUrl } = await mermaidToPngDataUrl(code); const a = document.createElement('a'); a.href = dataUrl; a.download = `${fileBase}.png`; a.click(); }
    catch (e) { setError((e as Error).message); }
  }
  async function exportPdf() {
    setError('');
    try { await downloadArtifactPdf({ title, subtitle: 'MB IQ Diagram', markdown: `# ${title}\n\n\`\`\`mermaid\n${code}\n\`\`\``, filename: `${fileBase}.pdf` }); }
    catch (e) { setError((e as Error).message); }
  }
  async function saveToDocs() {
    setError('');
    try { await api('/api/documents', { method: 'POST', body: JSON.stringify({ title, type: 'Diagram', content: `\`\`\`mermaid\n${code}\n\`\`\`` }) }); flash('Saved to the Documentation centre.'); }
    catch (e) { setError((e as Error).message); }
  }

  return (
    <div>
      <div className="topbar">
        <div><h1>Diagram Studio</h1><p className="muted">Generate database, architecture, org and sprint diagrams — render, edit, export and save.</p></div>
        <span className={`badge ${meta.ai ? 'amber' : 'green'}`}>{meta.ai ? 'AI-generated' : 'Live data'}</span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      {toast && <div className="notice section">{toast}</div>}

      <div className="seg-tabs section">
        {KINDS.map((k) => (
          <button key={k.key} type="button" className={kind === k.key ? 'on' : ''} disabled={k.ai && !canAi} onClick={() => pick(k.key)}>{k.label}</button>
        ))}
      </div>

      {meta.ai && (
        <div className="card section">
          <div className="field">
            <label>{kind === 'architecture' ? 'Focus (optional)' : 'Describe the diagram'}</label>
            <textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder={kind === 'architecture' ? 'e.g. focus on the AI request flow through the agent' : 'e.g. a sequence diagram of login then loading the dashboard'} />
          </div>
          <button className="btn navy" onClick={() => void generate(kind)} disabled={busy || !canAi}>{busy ? 'Drawing…' : 'Generate with AI'}</button>
        </div>
      )}

      <div className="grid main-sidebar section">
        <div className="card">
          <div className="av-row" style={{ marginBottom: 8 }}>
            <h3 style={{ flex: 1, margin: 0 }}>{title}</h3>
            <button className="btn ghost" onClick={() => void generate(kind)} disabled={busy}>Regenerate</button>
          </div>
          <p className="muted small">{meta.hint}</p>
          {busy ? <Spinner label="Generating diagram…" /> : <Mermaid code={code} />}
        </div>

        <div>
          <div className="card">
            <h3>Export</h3>
            <button className="btn full" onClick={() => void exportPng()} disabled={!code}>Download PNG</button>
            <button className="btn full section" onClick={() => void exportPdf()} disabled={!code}>Download PDF</button>
            {canSave && <button className="btn green full section" onClick={() => void saveToDocs()} disabled={!code}>Save to Documentation</button>}
          </div>
          <div className="card section">
            <h3>Edit source</h3>
            <p className="muted small">Tweak the Mermaid source — the preview updates live.</p>
            <textarea rows={12} value={code} onChange={(e) => setCode(e.target.value)} style={{ fontFamily: 'monospace', fontSize: 12 }} />
          </div>
        </div>
      </div>
    </div>
  );
}
