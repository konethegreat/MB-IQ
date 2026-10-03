// Code written by Kone & Claude | The code does the following: " Single source of truth for the
// Anthropic models the command centre may run. Admins pick from this list in Settings; MAX mode uses
// the chosen model, SAVER mode always uses Haiku regardless. "

export interface AiModelOption {
  id: string;
  label: string;
  blurb: string;
}

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  { id: 'claude-opus-4-8', label: 'Claude Opus 4.8', blurb: 'Maximum reasoning depth — best for complex analysis and reports.' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6', blurb: 'Balanced speed and quality — the recommended default for daily work.' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', blurb: 'Fast and economical — used automatically in Saver mode.' },
];

export const SAVER_MODEL_ID = 'claude-haiku-4-5-20251001';

export function isValidAiModel(id: string): boolean {
  return AI_MODEL_OPTIONS.some((m) => m.id === id);
}
