// Code written by Kone & Claude | The code does the following: " System status API — any signed-in user
// can read connectivity, AI model/key summary, and MCP provider health. Dashboards use this to prove
// the frontend is talking to the live backend, not showing isolated mock data. "

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { env, isAiConfigured } from '../config/env';
import { AI_MODEL_OPTIONS } from '../config/models';
import { getMode, getResolvedModel, getSettings } from '../services/settings.service';
import { providerStatusDetailed } from '../services/agent/registry';

export const systemRouter = Router();
systemRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Returns live system status for all
// tiers: API connectivity, AI configuration, active model/mode, masked key hint, and MCP providers. "
systemRouter.get('/status', async (_req, res) => {
  const [mode, activeModel, settings, mcpProviders] = await Promise.all([
    getMode(),
    getResolvedModel(),
    getSettings().catch(() => null),
    providerStatusDetailed(),
  ]);

  res.json({
    apiConnected: true,
    aiConfigured: isAiConfigured(),
    mode,
    activeModel,
    saverModel: 'claude-haiku-4-5-20251001',
    envDefaultModel: env.anthropicModel,
    settingsModel: settings?.aiModel || null,
    currency: settings?.currency ?? 'USD',
    availableModels: AI_MODEL_OPTIONS,
    mcpProviders,
    githubMcpReady: env.githubMcpUrl.trim().length > 0,
    time: new Date().toISOString(),
  });
});
