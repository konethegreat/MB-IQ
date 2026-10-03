// Code written by Kone & Claude | The code does the following: " Reads and updates the singleton
// AppSettings row (AI execution mode, chosen model, currency + monthly budgets). getSettings() lazily
// creates the row on first access so the system is zero-config; getMode() and getResolvedModel() are
// fast helpers used by the AI service and agent loop to choose their execution strategy. "

import { env } from '../config/env';
import { isValidAiModel, SAVER_MODEL_ID } from '../config/models';
import { appSettingsRepo, type AiMode, type AppSettingsRow } from '../db/repos';

const SINGLETON = 'singleton';
const DEFAULTS = {
  mode: 'MAX' as AiMode,
  aiModel: '',
  currency: 'USD' as const,
  monthlyBudgetUsd: 50,
  monthlyBudgetZar: 900,
};

export async function getSettings(): Promise<AppSettingsRow> {
  const existing = await appSettingsRepo.findUnique({ where: { id: SINGLETON } });
  if (existing) return existing;
  return appSettingsRepo.create({
    data: { id: SINGLETON, mode: DEFAULTS.mode, aiModel: DEFAULTS.aiModel, currency: DEFAULTS.currency, monthlyBudgetUsd: DEFAULTS.monthlyBudgetUsd, monthlyBudgetZar: DEFAULTS.monthlyBudgetZar },
  });
}

export interface SettingsPatch {
  mode?: AiMode;
  aiModel?: string;
  currency?: 'USD' | 'ZAR';
  monthlyBudgetUsd?: number;
  monthlyBudgetZar?: number;
}

export async function updateSettings(patch: SettingsPatch, userId: string): Promise<AppSettingsRow> {
  const clean: Record<string, unknown> = { updatedBy: userId };
  if (patch.mode === 'MAX' || patch.mode === 'SAVER') clean.mode = patch.mode;
  if (patch.aiModel !== undefined) clean.aiModel = patch.aiModel === '' || isValidAiModel(patch.aiModel) ? patch.aiModel : '';
  if (patch.currency === 'USD' || patch.currency === 'ZAR') clean.currency = patch.currency;
  if (typeof patch.monthlyBudgetUsd === 'number' && patch.monthlyBudgetUsd >= 0) clean.monthlyBudgetUsd = patch.monthlyBudgetUsd;
  if (typeof patch.monthlyBudgetZar === 'number' && patch.monthlyBudgetZar >= 0) clean.monthlyBudgetZar = patch.monthlyBudgetZar;
  return appSettingsRepo.upsert({
    where: { id: SINGLETON },
    create: { id: SINGLETON, ...DEFAULTS, ...clean },
    update: clean,
  });
}

// Code written by Kone & Claude | The code does the following: " Returns the current AI execution mode,
// defaulting to MAX if settings cannot be read yet (e.g. before the first migration). "
export async function getMode(): Promise<AiMode> {
  try { return (await getSettings()).mode; } catch { return 'MAX'; }
}

// Code written by Kone & Claude | The code does the following: " Resolves which Anthropic model to use
// in MAX mode: the admin's Settings pick wins, then ANTHROPIC_MODEL env, then Sonnet 4.6. SAVER mode
// always returns Haiku regardless of this helper. "
export async function getResolvedModel(): Promise<string> {
  try {
    const s = await getSettings();
    if (s.aiModel && isValidAiModel(s.aiModel)) return s.aiModel;
  } catch { /* fall through */ }
  return env.anthropicModel;
}

export function saverModel(): string { return SAVER_MODEL_ID; }
