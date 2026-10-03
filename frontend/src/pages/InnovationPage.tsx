// Code written by Kone & Claude | The code does the following: " The Innovation Pipeline page. Filters
// the portfolio down to impact/innovation/experimental/social projects and presents them as a forward
// pipeline (gated by 'report:view'). Spinner while loading; empty state when the pipeline is empty. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { type Project, statusClass, Spinner, Empty } from './dashboards/shared';

export function InnovationPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => { api<Project[]>('/api/projects').then(setProjects).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, []);

  const pipeline = projects.filter((p) => /impact|innovation|experimental|social/i.test(p.type));

  return (
    <div>
      <div className="topbar">
        <div><h1>Innovation Pipeline</h1><p className="muted">Ideas for internal, client, public-good, urban, rural and global technologies.</p></div>
        <span className="badge">Planning</span>
      </div>
      {error && <div className="error-banner">{error}</div>}
      <div className="notice section">This pipeline tracks future ideas. A later version will add concept-note scoring across rural relevance, urban relevance, social impact and SaaS opportunity.</div>

      {loading ? <Spinner /> : (
        <div className="card section">
          {pipeline.length === 0 ? <Empty title="No innovation or impact projects yet" hint="Tag a project as Innovation, Experimental or Social Impact to see it here." icon="zap" /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Idea / Project</th><th>Type</th><th>Status</th><th>Human Impact</th><th>Team</th></tr></thead>
                <tbody>
                  {pipeline.map((p) => (
                    <tr key={p.id}>
                      <td><b>{p.name}</b><br /><span className="muted small">{p.description}</span></td>
                      <td>{p.type}</td>
                      <td><span className={`status ${statusClass(p.status)}`}>{p.status}</span></td>
                      <td className="muted small">Urban &amp; rural relevance to be scored next.</td>
                      <td>{p.team ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
