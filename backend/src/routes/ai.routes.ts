// Code written by Kone & Claude | The code does the following: " Exposes the AI assistant endpoints
// backed by anthropic.service: status, thread summarization, meeting structuring, automated task
// extraction, the AI Coach, and downloadable PDF report generation. Each route is RBAC-guarded. "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { aiService } from '../services/anthropic.service';
import { streamReportPdf } from '../services/report.service';
import { type RoleKey } from '../config/rbac';

export const aiRouter = Router();
aiRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Reports whether live Anthropic AI is
// configured, so the UI can honestly show 'live' vs 'fallback' mode. "
aiRouter.get('/status', requirePermission('ai:use'), (_req, res) => {
  res.json({ live: aiService.isLive() });
});

// Code written by Kone & Claude | The code does the following: " Summarises a supplied thread of
// messages into a digest with decisions and open questions. "
aiRouter.post('/summarize', requirePermission('ai:use'), async (req, res) => {
  const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
  res.json({ summary: await aiService.summarizeThread(messages, req.user!.sub) });
});

// Code written by Kone & Claude | The code does the following: " Structures a meeting transcript into
// a full meeting pack and persists the meeting record. "
aiRouter.post('/meeting', requirePermission('ai:use'), async (req, res) => {
  const { title, type, transcript } = req.body ?? {};
  if (!transcript) {
    res.status(400).json({ error: 'A transcript is required.' });
    return;
  }
  const summary = await aiService.structureMeeting(title ?? 'Meeting', type ?? 'General', transcript, req.user!.sub);
  const meeting = await prisma.meeting.create({
    data: { title: title ?? 'Meeting', type: type ?? 'General', transcript, summary, createdBy: req.user!.sub },
  });
  res.json({ summary, meeting });
});

// Code written by Kone & Claude | The code does the following: " Extracts structured, assignable tasks
// from free-form notes (automated task handling). "
aiRouter.post('/extract-tasks', requirePermission('ai:use'), async (req, res) => {
  const text = String(req.body?.text ?? '');
  res.json({ tasks: await aiService.extractTasks(text, req.user!.sub) });
});

// Code written by Kone & Claude | The code does the following: " Classifies arbitrary text (an alert,
// log line or issue) into category, tags and severity, without persisting - a utility for clients and
// future MCP-driven triage. "
aiRouter.post('/classify', requirePermission('ai:use'), async (req, res) => {
  const text = String(req.body?.text ?? '');
  if (!text.trim()) { res.status(400).json({ error: 'text is required.' }); return; }
  res.json({ classification: await aiService.classify(text, req.user!.sub) });
});

// Code written by Kone & Claude | The code does the following: " AI Coach: returns prioritisation
// advice over a user's open tasks. A caller may always coach themselves; coaching ANOTHER user is
// scoped so the body-supplied userId cannot be abused to read an unrelated colleague's workload
// (IDOR guard): Final/Squad Leaders span the whole department, a Team Lead only their own team. "
aiRouter.post('/coach', requirePermission('ai:coach'), async (req, res) => {
  const callerId = req.user!.sub;
  const targetId = String(req.body?.userId ?? callerId);

  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) {
    res.status(404).json({ error: 'User not found.' });
    return;
  }

  // Cross-user coaching is restricted to managers acting within their remit; self-coaching is always allowed.
  if (targetId !== callerId) {
    const role = req.user!.role as RoleKey;
    const firmWide = role === 'FINAL_LEADER' || role === 'SQUAD_LEADER';
    const caller = await prisma.user.findUnique({ where: { id: callerId } });
    const sameTeamCaptain = role === 'TEAM_CAPTAIN' && !!caller?.team && caller.team === target.team;
    if (!firmWide && !sameTeamCaptain) {
      res.status(403).json({ error: 'Forbidden: you may only coach yourself or a member of your team.' });
      return;
    }
  }

  const tasks = await prisma.task.findMany({ where: { ownerId: targetId, NOT: { status: 'Done' } } });
  const advice = await aiService.coachWorkload({
    user: target.name ?? 'Team member',
    tasks: tasks.map((t) => ({ title: t.title, status: t.status, priority: t.priority, dueDate: t.dueDate?.toISOString() ?? null })),
  }, req.user!.sub);
  res.json({ advice });
});

// Code written by Kone & Claude | The code does the following: " Generates the status report as a
// structured Markdown ARTIFACT (rendered on screen via <RichContent>). The PDF is a separate step so the
// client can rasterise any embedded diagrams first. Requires 'report:generate'. "
aiRouter.post('/report', requirePermission('report:generate'), async (req, res) => {
  const [projects, tasks] = await Promise.all([prisma.project.count(), prisma.task.findMany()]);
  const blocked = tasks.filter((t) => t.status === 'Blocked').length;
  const open = tasks.filter((t) => t.status !== 'Done').length;
  const context = req.body?.context ??
    `Active projects: ${projects}. Open tasks: ${open}. Blocked tasks: ${blocked}. Total tasks: ${tasks.length}.`;

  const artifact = await aiService.draftReport(context, req.user!.sub);
  res.json({ title: req.body?.title ?? 'MB IQ Department Status Report', artifact });
});

// Code written by Kone & Claude | The code does the following: " Renders a Markdown artifact (plus any
// client-rasterised diagram PNGs) into a downloadable, on-brand PDF. The client posts the markdown with
// each ```mermaid block replaced by an image placeholder and the matching PNG in `images`. "
aiRouter.post('/report/pdf', requirePermission('report:generate'), (req, res) => {
  const { title, subtitle, markdown, images } = req.body ?? {};
  if (!markdown || typeof markdown !== 'string') { res.status(400).json({ error: 'markdown is required.' }); return; }
  streamReportPdf(res, {
    title: title ?? 'MB IQ Department Status Report',
    subtitle: subtitle ?? 'Demo Engineering Command Centre',
    markdown,
    author: req.user!.name,
    images: Array.isArray(images) ? images : [],
  });
});
