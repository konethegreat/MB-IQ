// Code written by Kone & Claude | The code does the following: " Notes endpoints with AI auto-triage.
// The General Firm tier uses 'note:create' to leave brief notes for IT; on creation each note is
// automatically classified (category, tags, severity) and formatted with an AI summary so the author
// sees organised feedback. Roles with 'note:view' read the triaged inbox and can re-run classification. "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { aiService } from '../services/anthropic.service';
import { classifyItem, classificationsFor } from '../services/classification.service';

export const noteRouter = Router();
noteRouter.use(authMiddleware);

function attachClassification<T extends { id: string }>(notes: T[], map: Awaited<ReturnType<typeof classificationsFor>>) {
  return notes.map((n) => {
    const c = map[n.id];
    return {
      ...n,
      classification: c ? { category: c.category, tags: c.tags ? c.tags.split(',').filter(Boolean) : [], severity: c.severity } : null,
    };
  });
}

// Code written by Kone & Claude | The code does the following: " Lists notes newest-first with author
// name and the AI triage (category/tags/severity) attached to each. Restricted to 'note:view'. "
noteRouter.get('/', requirePermission('note:view'), async (_req, res) => {
  const notes = await prisma.note.findMany({
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { name: true, role: true } } },
  });
  const map = await classificationsFor('note', notes.map((n) => n.id));
  res.json(attachClassification(notes, map));
});

// Code written by Kone & Claude | The code does the following: " Returns the signed-in user's own notes
// with AI organisation — for Tier 5 who can create notes but cannot see the IT inbox. "
noteRouter.get('/mine', requirePermission('note:create'), async (req, res) => {
  const notes = await prisma.note.findMany({
    where: { authorId: req.user!.sub },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const map = await classificationsFor('note', notes.map((n) => n.id));
  res.json(attachClassification(notes, map));
});

// Code written by Kone & Claude | The code does the following: " Creates a note (incl. the General Firm
// tier) and auto-formats + classifies it for triage before returning. Classification failure never
// blocks the note from being saved. "
noteRouter.post('/', requirePermission('note:create'), async (req, res) => {
  const body = String(req.body?.body ?? '').trim();
  const subject = String(req.body?.subject ?? '').trim() || null;
  if (!body) {
    res.status(400).json({ error: 'Note text is required.' });
    return;
  }
  const summary = await aiService.formatNote(body, req.user!.sub);
  const note = await prisma.note.create({
    data: { body, subject, summary, authorId: req.user!.sub },
  });
  const c = await classifyItem('note', note.id, body, req.user!.sub);
  res.status(201).json({
    ...note,
    classification: c ? { category: c.category, tags: c.tags ? c.tags.split(',').filter(Boolean) : [], severity: c.severity } : null,
  });
});

// Code written by Kone & Claude | The code does the following: " Re-runs AI classification for one note
// (e.g. after the text is understood better or the model improves). Restricted to 'note:view'. "
noteRouter.post('/:id/reclassify', requirePermission('note:view'), async (req, res) => {
  const note = await prisma.note.findUnique({ where: { id: req.params.id } });
  if (!note) { res.status(404).json({ error: 'Note not found.' }); return; }
  const c = await classifyItem('note', note.id, note.body, req.user!.sub);
  res.json({ classification: c ? { category: c.category, tags: c.tags ? c.tags.split(',').filter(Boolean) : [], severity: c.severity } : null });
});
