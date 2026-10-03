// Code written by Kone & Claude | The code does the following: " Settings & Cost Management panel for
// Tier 1–2 admins: dual USD/ZAR currency, selectable Anthropic model (not locked to Sonnet), Max/Saver
// mode, budget controls, and real-time token/cost analytics. "

import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { AiStatusBar } from '../components/AiStatusBar';
import { type AiMode } from './dashboards/shared';
import { StatTile, ProgressRow, Spinner, Empty } from './dashboards/shared';

type Currency = 'USD' | 'ZAR';
interface ModelOption { id: string; label: string; blurb: string }
interface Settings {
  mode: AiMode; aiModel: string; currency: Currency;
  monthlyBudgetUsd: number; monthlyBudgetZar: number;
  updatedBy?: string | null; availableModels?: ModelOption[];
}
interface Usage {
  currency: Currency; usdZarRate: number;
  totalCalls: number; totalInputTokens: number; totalOutputTokens: number;
  totalCostUsd: number; totalCostDisplay: number;
  monthToDateCostUsd: number; monthToDateCostDisplay: number;
  byFeature: { feature: string; calls: number; tokens: number; costUsd: number; costDisplay: number }[];
  byDay: { day: string; costUsd: number; costDisplay: number }[];
  recent: { feature: string; model: string; mode: string; tokens: number; costUsd: number; costDisplay: number; createdAt: string }[];
}

const MODES: { key: AiMode; title: string; blurb: string }[] = [
  { key: 'MAX', title: 'Max Mode', blurb: 'Uses your chosen model below with full context and tool-chaining.' },
  { key: 'SAVER', title: 'Saver Mode', blurb: 'Lightweight Haiku model, compressed prompts, capped output — minimises token burn.' },
];

function money(amount: number, currency: Currency): string {
  return currency === 'ZAR' ? `R ${amount.toFixed(2)}` : `$${amount.toFixed(2)}`;
}

export function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [budget, setBudget] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const currency = settings?.currency ?? 'USD';
  const budgetAmount = currency === 'ZAR' ? settings?.monthlyBudgetZar : settings?.monthlyBudgetUsd;

  function loadUsage() { api<Usage>('/api/settings/usage').then(setUsage).catch(() => undefined); }
  useEffect(() => {
    Promise.all([
      api<Settings>('/api/settings').then((s) => {
        setSettings(s);
        setBudget(String(s.currency === 'ZAR' ? s.monthlyBudgetZar : s.monthlyBudgetUsd));
      }),
      api<Usage>('/api/settings/usage').then(setUsage),
    ]).catch((e) => setError((e as Error).message)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (settings) setBudget(String(currency === 'ZAR' ? settings.monthlyBudgetZar : settings.monthlyBudgetUsd));
  }, [settings?.currency]);

  async function save(patch: Partial<Settings> & { monthlyBudgetUsd?: number; monthlyBudgetZar?: number }) {
    setSaving(true); setError('');
    try {
      const updated = await api<Settings>('/api/settings', { method: 'PUT', body: JSON.stringify(patch) });
      setSettings(updated);
      setBudget(String(updated.currency === 'ZAR' ? updated.monthlyBudgetZar : updated.monthlyBudgetUsd));
      loadUsage();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }

  async function saveBudget() {
    await save(currency === 'ZAR' ? { monthlyBudgetZar: Number(budget) } : { monthlyBudgetUsd: Number(budget) });
  }

  const budgetPct = budgetAmount && budgetAmount > 0 && usage
    ? Math.round((usage.monthToDateCostDisplay / budgetAmount) * 100) : 0;
  const maxFeatureCost = Math.max(0.000001, ...(usage?.byFeature.map((f) => f.costDisplay) ?? [0]));
  const maxDayCost = Math.max(0.000001, ...(usage?.byDay.map((d) => d.costDisplay) ?? [0]));
  const models = settings?.availableModels ?? [];
  const activeModel = settings?.aiModel || '(env default)';

  return (
    <div>
      <AiStatusBar />
      <div className="topbar">
        <div><h1>Settings &amp; Cost Management</h1><p className="muted">AI model selection, execution mode, dual-currency budget and token analytics.</p></div>
        <span className="badge">Admin · Tier 1–2</span>
      </div>
      {error && <div className="error-banner">{error}</div>}

      {loading ? <Spinner label="Loading settings…" /> : (
        <>
          {/* Model selection */}
          <div className="card section">
            <h3>AI Model (Max Mode)</h3>
            <p className="muted small">Choose which Anthropic model runs in Max Mode across all AI features and the agent. Saver Mode always uses Haiku. Empty selection uses <code>ANTHROPIC_MODEL</code> from <code>.env</code>.</p>
            <div className="grid two" style={{ marginTop: 12 }}>
              <button type="button" className={`model-card ${!settings?.aiModel ? 'on' : ''}`} onClick={() => !saving && save({ aiModel: '' })} disabled={saving}>
                <b>Env default</b>
                <p className="muted small">Uses ANTHROPIC_MODEL from backend/.env</p>
              </button>
              {models.map((m) => {
                const on = settings?.aiModel === m.id;
                return (
                  <button key={m.id} type="button" className={`model-card ${on ? 'on' : ''}`} onClick={() => !on && save({ aiModel: m.id })} disabled={saving}>
                    <div className="mode-head"><b>{m.label}</b>{on && <span className="badge green">Active</span>}</div>
                    <p className="muted small">{m.blurb}</p>
                    <code className="small">{m.id}</code>
                  </button>
                );
              })}
            </div>
            <p className="muted small" style={{ marginTop: 10 }}>Currently resolved: <b>{activeModel}</b></p>
          </div>

          {/* Execution mode */}
          <div className="card section">
            <h3>Operational Mode</h3>
            <div className="grid two" style={{ marginTop: 12 }}>
              {MODES.map((m) => {
                const on = settings?.mode === m.key;
                return (
                  <button key={m.key} type="button" className={`mode-card ${on ? 'on' : ''}`} onClick={() => !on && save({ mode: m.key })} disabled={saving}>
                    <div className="mode-head"><b>{m.title}</b>{on && <span className="badge green">Active</span>}</div>
                    <p className="muted small">{m.blurb}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Currency toggle + Cost KPIs */}
          <div className="av-row section" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <h3 style={{ margin: 0 }}>Cost Analytics</h3>
            <div className="currency-toggle">
              <button type="button" className={currency === 'USD' ? 'on' : ''} onClick={() => save({ currency: 'USD' })} disabled={saving}>USD ($)</button>
              <button type="button" className={currency === 'ZAR' ? 'on' : ''} onClick={() => save({ currency: 'ZAR' })} disabled={saving}>ZAR (R)</button>
            </div>
          </div>
          {currency === 'ZAR' && usage && (
            <p className="muted small section">Converted at R {usage.usdZarRate.toFixed(2)} / USD (set <code>USD_ZAR_RATE</code> in backend/.env).</p>
          )}

          <div className="grid cards section">
            <StatTile label="Month-to-date spend" value={money(usage?.monthToDateCostDisplay ?? 0, currency)} accent={budgetPct >= 100 ? 'red' : budgetPct >= 80 ? 'amber' : 'green'} icon="bar" foot={`of ${money(budgetAmount ?? 0, currency)} budget`} />
            <StatTile label="Total spend (all time)" value={money(usage?.totalCostDisplay ?? 0, currency)} accent="blue" icon="cpu" />
            <StatTile label="AI calls" value={usage?.totalCalls ?? 0} accent="green" icon="cpu" />
            <StatTile label="Tokens used" value={((usage?.totalInputTokens ?? 0) + (usage?.totalOutputTokens ?? 0)).toLocaleString()} accent="amber" icon="zap" foot={`${(usage?.totalInputTokens ?? 0).toLocaleString()} in · ${(usage?.totalOutputTokens ?? 0).toLocaleString()} out`} />
          </div>

          <div className="grid main-sidebar section">
            <div>
              <div className="card">
                <h3>Monthly Budget ({currency})</h3>
                <div className="progress-row">
                  <span className="name">MTD vs budget</span>
                  <div className={`progress ${budgetPct >= 100 ? 'red' : budgetPct >= 80 ? 'amber' : ''}`} style={{ flex: 1 }}><span style={{ width: `${Math.min(100, budgetPct)}%` }} /></div>
                  <span className="val">{budgetPct}%</span>
                </div>
                <div className="av-row" style={{ marginTop: 12, gap: 10 }}>
                  <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <label>Budget ({currency === 'ZAR' ? 'R / month' : 'USD / month'})</label>
                    <input type="number" min={0} value={budget} onChange={(e) => setBudget(e.target.value)} />
                  </div>
                  <button className="btn green" style={{ alignSelf: 'flex-end' }} disabled={saving} onClick={saveBudget}>Save budget</button>
                </div>
              </div>

              <div className="card section">
                <h3>Spend by Feature</h3>
                {!usage || usage.byFeature.length === 0 ? <Empty title="No AI usage yet" hint="Run an AI feature to see cost here." icon="bar" />
                  : usage.byFeature.map((f) => (
                    <ProgressRow key={f.feature} name={`${f.feature} · ${money(f.costDisplay, currency)}`} value={Math.round((f.costDisplay / maxFeatureCost) * 100)} suffix="" />
                  ))}
              </div>
            </div>

            <div>
              <div className="card">
                <h3>Daily Spend (last 14)</h3>
                {!usage || usage.byDay.length === 0 ? <Empty title="No data yet" icon="clock" /> : (
                  <div className="barchart">
                    {usage.byDay.map((d) => (
                      <div className="bar" key={d.day}>
                        <div className="cap">{money(d.costDisplay, currency)}</div>
                        <div className="fill" style={{ height: `${Math.max(3, Math.round((d.costDisplay / maxDayCost) * 100))}%` }} />
                        <div className="lbl">{d.day.slice(5)}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="card section">
                <h3>Recent AI Calls</h3>
                {!usage || usage.recent.length === 0 ? <Empty title="No recent calls" icon="cpu" /> : usage.recent.map((r, i) => (
                  <div className="list-row" key={i}>
                    <div className="grow"><b>{r.feature}</b> <span className="chip">{r.mode}</span><br /><span className="muted small">{r.model} · {r.tokens.toLocaleString()} tokens</span></div>
                    <span className="due">{money(r.costDisplay, currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
