// Code written by Kone & Claude | The code does the following: " Risk & Delay Radar widget. Fetches the
// deterministic per-project risk assessment and renders it as a RAG-rated list with reasons, so leaders
// see what is likely to slip at a glance. Shared by the Final Leader and Squad Leader dashboards. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface ProjectRisk { project: string; team: string | null; rag: 'Green' | 'Amber' | 'Red'; reasons: string[] }

export function RiskRadar() {
  const [items, setItems] = useState<ProjectRisk[]>([]);
  const [summary, setSummary] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api<{ items: ProjectRisk[]; summary: string }>('/api/insights/risk')
      .then((r) => { setItems(r.items); setSummary(r.summary); })
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, []);

  const tone = (rag: string) => (rag === 'Red' ? 'red' : rag === 'Amber' ? 'amber' : 'green');

  return (
    <div className="card">
      <h3>Risk &amp; Delay Radar</h3>
      <p className="muted small">{loaded ? summary : 'Assessing delivery risk…'}</p>
      {items.map((i) => (
        <div className="list-row" key={i.project}>
          <span className={`status ${tone(i.rag)}`} style={{ minWidth: 56, textAlign: 'center' }}>{i.rag}</span>
          <div className="grow"><b>{i.project}</b><br /><span className="muted small">{i.team ?? '—'} · {i.reasons.join(' · ')}</span></div>
        </div>
      ))}
    </div>
  );
}
