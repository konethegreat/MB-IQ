// Code written by Kone & Claude | The code does the following: " Insights API: the delivery Risk & Delay
// radar (RAG per project, needs 'report:view' — leadership) and the auto standup digest (needs
// 'task:view' so any squad member can generate one for their team). Both are deterministic and stream JSON
// the dashboards render. "

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { assessRisk } from '../services/insights/risk';
import { buildStandup } from '../services/insights/standup';

export const insightsRouter = Router();
insightsRouter.use(authMiddleware);

insightsRouter.get('/risk', requirePermission('report:view'), async (_req, res) => {
  res.json(await assessRisk());
});

insightsRouter.get('/standup', requirePermission('task:view'), async (req, res) => {
  res.json(await buildStandup(req.query.team ? String(req.query.team) : undefined));
});
