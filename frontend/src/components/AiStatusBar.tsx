// Code written by Kone & Claude | The code does the following: " Live system status strip shown on every
// dashboard — proves the UI is connected to the backend API, shows which Anthropic key/model is active,
// and reports MCP provider health (internal + GitHub). "

import { useEffect, useState } from 'react';
import { api } from '../api/client';

interface McpProvider { id: string; configured: boolean; connected: boolean; toolCount: number; label: string }
export interface SystemStatus {
  apiConnected: boolean;
  aiConfigured: boolean;
  mode: string;
  activeModel: string;
  mcpProviders: McpProvider[];
  githubMcpReady: boolean;
}

export function AiStatusBar() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api<SystemStatus>('/api/system/status')
      .then(setStatus)
      .catch(() => setError(true));
  }, []);

  if (error) {
    return (
      <div className="status-bar error">
        <span className="dot red" />
        <span>API disconnected — dashboards may not reflect live data. Check that the backend is running.</span>
      </div>
    );
  }
  if (!status) {
    return <div className="status-bar loading"><span className="spinner sm" /> Connecting to command centre…</div>;
  }

  const github = status.mcpProviders.find((p) => p.id === 'github');
  const internal = status.mcpProviders.find((p) => p.id === 'internal');

  return (
    <div className="status-bar">
      <span className={`dot ${status.apiConnected ? 'green' : 'red'}`} title="API connection" />
      <span className="status-item"><b>API</b> Live</span>
      <span className="status-sep">·</span>
      <span className="status-item">
        <b>AI</b> {status.aiConfigured ? 'Connected' : 'Not configured'}
      </span>
      <span className="status-sep">·</span>
      <span className="status-item">
        <b>Model</b> {status.activeModel} <span className="chip sm">{status.mode}</span>
      </span>
      <span className="status-sep">·</span>
      <span className="status-item">
        <b>MCP</b> Internal {internal?.connected ? '✓' : '—'}
        {' · '}
        GitHub {github?.connected ? '✓ connected' : github?.configured ? 'configured (awaiting server)' : 'env-ready'}
        {github?.connected && github.toolCount > 0 ? ` (${github.toolCount} tools)` : ''}
      </span>
    </div>
  );
}
