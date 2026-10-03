// Code written by Kone & Claude | The code does the following: " The MCP-host agent API with the
// Human-in-the-Loop boundary. 'ai:use' holders can ask the agent (which auto-runs read-only tools) and
// see what is pending; but APPROVING or REJECTING a destructive action requires 'task:manage' (a
// manager). A destructive action executes ONLY through the approve route — never during planning. "

import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { runAgent } from '../services/agent/agentLoop';
import { listAllTools, callQualifiedTool, providerStatusDetailed } from '../services/agent/registry';
import { pendingActionRepo } from '../db/repos';

export const agentRouter = Router();
agentRouter.use(authMiddleware);

function safeParse(s: string): Record<string, unknown> { try { return JSON.parse(s) as Record<string, unknown>; } catch { return {}; } }

// Code written by Kone & Claude | The code does the following: " Reports the available tools and which
// providers (internal / GitHub MCP) are configured. "
agentRouter.get('/tools', requirePermission('ai:use'), async (_req, res) => {
  const tools = await listAllTools();
  res.json({
    providers: await providerStatusDetailed(),
    tools: tools.map((t) => ({ name: t.qualifiedName, description: t.description, destructive: t.destructive, provider: t.provider })),
  });
});

// Code written by Kone & Claude | The code does the following: " Asks the agent. Read-only tools run
// automatically; destructive tools come back as pending actions for the approval UI. "
agentRouter.post('/ask', requirePermission('ai:use'), async (req, res) => {
  const prompt = String(req.body?.prompt ?? '').trim();
  if (!prompt) { res.status(400).json({ error: 'A prompt is required.' }); return; }
  res.json(await runAgent(prompt, req.user!.sub));
});

// Code written by Kone & Claude | The code does the following: " Lists actions awaiting human approval. "
agentRouter.get('/pending', requirePermission('ai:use'), async (_req, res) => {
  const rows = await pendingActionRepo.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'desc' } });
  res.json(rows.map((r) => ({ id: r.id, provider: r.provider, tool: r.tool, summary: r.summary, args: safeParse(r.args), status: r.status, createdAt: r.createdAt })));
});

// Code written by Kone & Claude | The code does the following: " Approves a pending action and EXECUTES
// it via its provider — the only path that runs a destructive tool. Manager-only (task:manage). "
agentRouter.post('/actions/:id/approve', requirePermission('task:manage'), async (req, res) => {
  const row = await pendingActionRepo.findUnique({ where: { id: req.params.id } });
  if (!row) { res.status(404).json({ error: 'Action not found.' }); return; }
  if (row.status !== 'PENDING') { res.status(409).json({ error: `Action already ${row.status}.` }); return; }
  const result = await callQualifiedTool(row.tool, safeParse(row.args));
  const updated = await pendingActionRepo.update({
    where: { id: row.id },
    data: { status: result.ok ? 'EXECUTED' : 'FAILED', result: result.content.slice(0, 4000), decidedBy: req.user!.sub, decidedAt: new Date() },
  });
  res.json({ id: updated.id, status: updated.status, result: updated.result });
});

// Code written by Kone & Claude | The code does the following: " Rejects a pending action without
// executing it. Manager-only (task:manage). "
agentRouter.post('/actions/:id/reject', requirePermission('task:manage'), async (req, res) => {
  const row = await pendingActionRepo.findUnique({ where: { id: req.params.id } });
  if (!row) { res.status(404).json({ error: 'Action not found.' }); return; }
  if (row.status !== 'PENDING') { res.status(409).json({ error: `Action already ${row.status}.` }); return; }
  const updated = await pendingActionRepo.update({ where: { id: row.id }, data: { status: 'REJECTED', decidedBy: req.user!.sub, decidedAt: new Date() } });
  res.json({ id: updated.id, status: updated.status });
});
