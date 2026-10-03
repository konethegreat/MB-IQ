// Code written by Kone & Claude | The code does the following: " AI cost accounting. It knows the
// per-million-token price of each model, records one AiUsage row per API call, and produces the usage
// analytics (totals, by-feature, by-day, month-to-date spend vs budget) shown in the Tier-2 Settings
// panel. Recording never throws into the caller - cost tracking must not break a working AI feature. "

import { aiUsageRepo, type AiUsageRow } from '../db/repos';
import { env } from '../config/env';
import { usdToZar, type DisplayCurrency } from '../config/currency';

// Approximate list prices in USD per 1,000,000 tokens. Adjust to your contracted rates.
const PRICING: Record<string, { in: number; out: number }> = {
  'claude-opus-4-8': { in: 15, out: 75 },
  'claude-sonnet-4-6': { in: 3, out: 15 },
  'claude-haiku-4-5-20251001': { in: 0.8, out: 4 },
  default: { in: 3, out: 15 },
};

export function costFor(model: string, inTokens: number, outTokens: number): number {
  const p = PRICING[model] ?? PRICING.default;
  return Number((((inTokens / 1e6) * p.in) + ((outTokens / 1e6) * p.out)).toFixed(6));
}

export async function recordUsage(x: { feature: string; model: string; mode: string; inputTokens: number; outputTokens: number; userId?: string | null }): Promise<number> {
  const costUsd = costFor(x.model, x.inputTokens, x.outputTokens);
  try {
    await aiUsageRepo.create({ data: { feature: x.feature, model: x.model, mode: x.mode, inputTokens: x.inputTokens, outputTokens: x.outputTokens, costUsd, userId: x.userId ?? null } });
  } catch {
    // Cost tracking is best-effort; never surface a logging failure to the user.
  }
  return costUsd;
}

export interface UsageSummary {
  currency: DisplayCurrency;
  usdZarRate: number;
  totalCalls: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  totalCostDisplay: number;
  monthToDateCostUsd: number;
  monthToDateCostDisplay: number;
  byFeature: { feature: string; calls: number; tokens: number; costUsd: number; costDisplay: number }[];
  byDay: { day: string; costUsd: number; costDisplay: number }[];
  recent: { feature: string; model: string; mode: string; tokens: number; costUsd: number; costDisplay: number; createdAt: string }[];
}

function toDisplay(usd: number, currency: DisplayCurrency): number {
  return currency === 'ZAR' ? usdToZar(usd, env.usdZarRate) : Number(usd.toFixed(4));
}

// Code written by Kone & Claude | The code does the following: " Aggregates recent AiUsage rows in JS
// (portable across SQLite/Postgres) into the analytics shape the Settings panel renders. "
export async function usageSummary(currency: DisplayCurrency = 'USD'): Promise<UsageSummary> {
  const rows: AiUsageRow[] = await aiUsageRepo.findMany({ orderBy: { createdAt: 'desc' }, take: 2000 });
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const byFeature = new Map<string, { calls: number; tokens: number; costUsd: number }>();
  const byDay = new Map<string, number>();
  let totalInputTokens = 0, totalOutputTokens = 0, totalCostUsd = 0, monthToDateCostUsd = 0;

  for (const r of rows) {
    totalInputTokens += r.inputTokens; totalOutputTokens += r.outputTokens; totalCostUsd += r.costUsd;
    const created = new Date(r.createdAt);
    if (created >= monthStart) monthToDateCostUsd += r.costUsd;
    const f = byFeature.get(r.feature) ?? { calls: 0, tokens: 0, costUsd: 0 };
    f.calls += 1; f.tokens += r.inputTokens + r.outputTokens; f.costUsd += r.costUsd;
    byFeature.set(r.feature, f);
    const day = created.toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + r.costUsd);
  }

  return {
    currency,
    usdZarRate: env.usdZarRate,
    totalCalls: rows.length,
    totalInputTokens, totalOutputTokens,
    totalCostUsd: Number(totalCostUsd.toFixed(4)),
    totalCostDisplay: toDisplay(totalCostUsd, currency),
    monthToDateCostUsd: Number(monthToDateCostUsd.toFixed(4)),
    monthToDateCostDisplay: toDisplay(monthToDateCostUsd, currency),
    byFeature: [...byFeature.entries()].map(([feature, v]) => ({
      feature, ...v,
      costUsd: Number(v.costUsd.toFixed(4)),
      costDisplay: toDisplay(v.costUsd, currency),
    })).sort((a, b) => b.costUsd - a.costUsd),
    byDay: [...byDay.entries()].map(([day, costUsd]) => ({
      day,
      costUsd: Number(costUsd.toFixed(4)),
      costDisplay: toDisplay(costUsd, currency),
    })).sort((a, b) => a.day.localeCompare(b.day)).slice(-14),
    recent: rows.slice(0, 12).map((r) => ({
      feature: r.feature, model: r.model, mode: r.mode,
      tokens: r.inputTokens + r.outputTokens,
      costUsd: r.costUsd,
      costDisplay: toDisplay(r.costUsd, currency),
      createdAt: new Date(r.createdAt).toISOString(),
    })),
  };
}
