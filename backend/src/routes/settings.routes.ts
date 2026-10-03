// Code written by Kone & Claude | The code does the following: " Tier-2 Settings & Cost Management API.
// All routes require the 'settings:manage' permission (granted to Tier 1 oversight + Tier 2 admins), so
// captains, engineers and the general firm cannot view or change AI execution mode, budgets or spend.
// Exposes the current settings, an update endpoint (Max/Saver mode + monthly budget), and real-time
// token/cost usage analytics. "

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { AI_MODEL_OPTIONS } from '../config/models';
import { getSettings, updateSettings } from '../services/settings.service';
import { usageSummary } from '../services/usage.service';
import type { AiMode } from '../db/repos';

export const settingsRouter = Router();
settingsRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Returns the current AI settings
// (execution mode, model, currency + monthly budgets) and the list of selectable models. "
settingsRouter.get('/', requirePermission('settings:manage'), async (_req, res) => {
  const settings = await getSettings();
  res.json({ ...settings, availableModels: AI_MODEL_OPTIONS });
});

// Code written by Kone & Claude | The code does the following: " Updates execution mode, model,
// currency and/or monthly budgets; records who changed it. "
settingsRouter.put('/', requirePermission('settings:manage'), async (req, res) => {
  const mode = req.body?.mode as AiMode | undefined;
  const aiModel = req.body?.aiModel as string | undefined;
  const currency = req.body?.currency as 'USD' | 'ZAR' | undefined;
  const budgetUsd = req.body?.monthlyBudgetUsd;
  const budgetZar = req.body?.monthlyBudgetZar;
  if (mode && mode !== 'MAX' && mode !== 'SAVER') {
    res.status(400).json({ error: "mode must be 'MAX' or 'SAVER'." });
    return;
  }
  if (currency && currency !== 'USD' && currency !== 'ZAR') {
    res.status(400).json({ error: "currency must be 'USD' or 'ZAR'." });
    return;
  }
  const updated = await updateSettings({
    mode,
    aiModel,
    currency,
    monthlyBudgetUsd: typeof budgetUsd === 'number' ? budgetUsd : undefined,
    monthlyBudgetZar: typeof budgetZar === 'number' ? budgetZar : undefined,
  }, req.user!.sub);
  res.json({ ...updated, availableModels: AI_MODEL_OPTIONS });
});

// Code written by Kone & Claude | The code does the following: " Returns real-time AI usage analytics:
// totals, month-to-date spend, breakdown by feature and by day, and the most recent calls. "
settingsRouter.get('/usage', requirePermission('settings:manage'), async (_req, res) => {
  const settings = await getSettings();
  res.json(await usageSummary(settings.currency));
});
