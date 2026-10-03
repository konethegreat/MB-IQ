// Code written by Kone & Claude | The code does the following: " The MCP-host Agent console with the
// Human-in-the-Loop approval UI. Anyone with 'ai:use' can ask the agent (read-only tools run
// automatically) and watch the pending queue; destructive proposals render as approval cards that only a
// manager ('task:manage') can Approve or Reject. Approving is the ONLY path that executes the action. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { can } from '../config/roles';
import { RichContent } from '../components/RichContent';
import { Spinner, Empty } from './dashboards/shared';

interface Pending { id: string; provider: string; tool: string; summary: string; args: Record<string, unknown>; status?: string; createdAt?: string }
interface AskRes { reply: string; pendingActions: Pending[]; toolsUsed: string[] }
interface ToolsRes { providers: { id: string; configured: boolean; connected: boolean; toolCount: number; label: string }[]; tools: { name: string; description: string; destructive: boolean; provider: string }[] }

function shortTool(t: string): string { return t.replace(/^.*__/, ''); }

// Code written by Kone & Claude | The code does the following: " Renders one queued destructive action
// with its arguments and Approve/Reject controls (controls are manager-only). "
function ApprovalCard({ a, canApprove, onDecide, busy }: { a: Pending; canApprove: boolean; onDecide: (id: string, action: 'approve' | 'reject') => void; busy: boolean }) {
  return (
    <div className="card approval section">
      <div className="av-row" style={{ marginBottom: 6 }}>
        <span className="chip">{a.provider}</span>
        <b style={{ flex: 1 }}>{shortTool(a.tool)}</b>
        <span className="status amber">Awaiting approval</span>
      </div>
      <p className="muted small" style={{ margin: '4px 0 8px' }}>{a.summary}</p>
      {Object.keys(a.args ?? {}).length > 0 && (
        <div className="args-grid">
          {Object.entries(a.args).map(([k, v]) => (
            <div key={k} className="arg"><span className="muted small">{k}</span><span>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span></div>
          ))}
        </div>
      )}
      <div className="actions row" style={{ marginTop: 12 }}>
        <button className="btn green" disabled={!canApprove || busy} onClick={() => onDecide(a.id, 'approve')}>Approve &amp; run</button>
        <button className="btn danger" disabled={!canApprove || busy} onClick={() => onDecide(a.id, 'reject')}>Reject</button>
        {!canApprove && <span className="muted small" style={{ alignSelf: 'center' }}>A manager must approve this action.</span>}
      </div>
    </div>
  );
}

export function AgentPage() {
  const { user } = useAuth();
  const canApprove = can(user, 'task:manage');
  const [prompt, setPrompt] = useState('');
  const [reply, setReply] = useState('');
  const [toolsUsed, setToolsUsed] = useState<string[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [providers, setProviders] = useState<{ id: string; configured: boolean; connected: boolean; toolCount: number; label: string }[]>([]);
  const [toolCount, setToolCount] = useState(0);
  const [asking, setAsking] = useState(false);
  const [deciding, setDeciding] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  function loadPending() { api<Pending[]>('/api/agent/pending').then(setPending).catch(() => undefined); }
  useEffect(() => {
    Promise.all([
      api<ToolsRes>('/api/agent/tools').then((r) => { setProviders(r.providers); setToolCount(r.tools.length); }),
      api<Pending[]>('/api/agent/pending').then(setPending),
    ]).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }, []);

  async function ask() {
    if (!prompt.trim()) return;
    setAsking(true); setError(''); setReply(''); setToolsUsed([]);
    try {
      const r = await api<AskRes>('/api/agent/ask', { method: 'POST', body: JSON.stringify({ prompt }) });
      setReply(r.reply); setToolsUsed(r.toolsUsed); if (r.pendingActions.length) loadPending();
    } catch (e) { setError((e as Error).message); } finally { setAsking(false); }
  }

  async function decide(id: string, action: 'approve' | 'reject') {
    setDeciding(true); setError('');
    try { await api(`/api/agent/actions/${id}/${action}`, { method: 'POST', body: '{}' }); setPending((p) => p.filter((x) => x.id !== id)); }
    catch (e) { setError((e as Error).message); } finally { setDeciding(false); }
  }

  const github = providers.find((p) => p.id === 'github');
  const githubLabel = github?.connected ? `Connected (${github.toolCount} tools)` : github?.configured ? 'Configured — awaiting MCP server' : 'Env-ready (add GITHUB_MCP_URL)';

  return (
    <div>
      <div className="topbar">
        <div><h1>Command Centre Agent</h1><p className="muted">An MCP-host agent with a Human-in-the-Loop safety boundary. Destructive actions need your approval.</p></div>
        <div className="av-row" style={{ gap: 6, flexWrap: 'wrap' }}>
          <span className="badge green">Internal tools · Active</span>
          <span className={`badge ${github?.connected ? 'green' : 'amber'}`}>GitHub MCP · {githubLabel}</span>
        </div>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="grid main-sidebar section">
        <div>
          <div className="card">
            <h3>Ask the agent</h3>
            <p className="muted small">e.g. “List blocked tasks and create a task to investigate the worst one.” Read-only steps run automatically; anything that changes state is queued below for approval.</p>
            <textarea rows={3} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ask the command centre…" />
            <button className="btn navy full" onClick={ask} disabled={asking || !prompt.trim()}>{asking ? 'Thinking…' : 'Ask'}</button>
            {reply && (
              <div className="section">
                <h3>Reply</h3>
                <RichContent markdown={reply} />
                {toolsUsed.length > 0 && <p className="muted small">Tools used: {toolsUsed.map(shortTool).join(', ')}</p>}
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="card">
            <h3>Pending Approvals {pending.length > 0 && <span className="badge amber">{pending.length}</span>}</h3>
            {loading ? <Spinner /> : pending.length === 0
              ? <Empty title="Nothing awaiting approval" hint="When the agent proposes a destructive action it appears here for review." icon="check" />
              : pending.map((a) => <ApprovalCard key={a.id} a={a} canApprove={canApprove} onDecide={decide} busy={deciding} />)}
          </div>
          <div className="card section">
            <h3>Capability</h3>
            <div className="list-row"><div className="grow">Tools available to the agent</div><b>{toolCount}</b></div>
            <p className="muted small">GitHub repository, issue and PR tools appear here automatically once your organisation’s GitHub MCP server URL + token are set in <code>backend/.env</code>.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
