// Code written by Kone & Claude | The code does the following: " Documentation engine endpoints (Tiers
// 1-4). 'doc:view' reads/searches the documentation centre; 'doc:manage' can write, IMPORT external
// documents (text/markdown/code/PDF), and AI-GENERATE specs/post-mortems/guides/schemas from the live
// system state plus any source material. All documents land in the Document table so the command-centre
// agent can reference them via the search endpoint. "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { aiService } from '../services/anthropic.service';
import { extractText } from '../services/ingest.service';

export const documentRouter = Router();
documentRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Lists documentation records (optionally
// by project), newest first, with the owning project's name. "
documentRouter.get('/', requirePermission('doc:view'), async (req, res) => {
  const { projectId } = req.query;
  const documents = await prisma.document.findMany({
    where: { ...(projectId ? { projectId: String(projectId) } : {}) },
    orderBy: { updatedAt: 'desc' },
    include: { project: { select: { name: true } } },
  });
  res.json(documents);
});

// Code written by Kone & Claude | The code does the following: " Full-text-ish search over the
// documentation centre (title + content). This is the retrieval index the agent uses to ground answers
// in the division's own documents. "
documentRouter.get('/search', requirePermission('doc:view'), async (req, res) => {
  const q = String(req.query.q ?? '').toLowerCase().trim();
  const docs = await prisma.document.findMany({ orderBy: { updatedAt: 'desc' } });
  const hits = docs
    .filter((d) => !q || d.title.toLowerCase().includes(q) || d.content.toLowerCase().includes(q))
    .slice(0, 20)
    .map((d) => ({ id: d.id, title: d.title, type: d.type, snippet: d.content.slice(0, 200) }));
  res.json(hits);
});

// Code written by Kone & Claude | The code does the following: " Creates a documentation record manually. "
documentRouter.post('/', requirePermission('doc:manage'), async (req, res) => {
  const { title, type, content, projectId, status } = req.body ?? {};
  if (!title) { res.status(400).json({ error: 'A document title is required.' }); return; }
  const document = await prisma.document.create({
    data: { title, type: type ?? 'Project Brief', content: content ?? '', status: status ?? 'Draft', projectId: projectId ?? null },
  });
  res.status(201).json(document);
});

// Code written by Kone & Claude | The code does the following: " Imports an external document. Accepts
// pasted text or an uploaded file as base64 (text/markdown/code/PDF), extracts the text, and stores it
// as an indexed 'Imported' document. "
documentRouter.post('/ingest', requirePermission('doc:manage'), async (req, res) => {
  const { title, projectId, text, contentBase64, mimeType, filename } = req.body ?? {};
  if (!title) { res.status(400).json({ error: 'A title is required.' }); return; }
  const { text: extracted } = await extractText({ text, contentBase64, mimeType, filename });
  if (!extracted.trim()) { res.status(400).json({ error: 'No readable content found to import.' }); return; }
  const document = await prisma.document.create({
    data: { title, type: 'Imported', status: 'Active', content: extracted.slice(0, 20000), projectId: projectId ?? null },
  });
  res.status(201).json(document);
});

// Code written by Kone & Claude | The code does the following: " AI-generates a documentation artifact
// (Technical Specification, System Post-mortem, User Guide or API Schema) from the live system state plus
// optional source material, then stores it as a Draft so it is immediately indexed for agent recall. "
documentRouter.post('/generate', requirePermission('doc:manage'), async (req, res) => {
  const { kind, title, projectId, sourceText } = req.body ?? {};
  if (!kind || !title) { res.status(400).json({ error: 'kind and title are required.' }); return; }

  const [projects, taskCount, blocked] = await Promise.all([
    prisma.project.findMany({ select: { name: true, status: true, health: true, team: true } }),
    prisma.task.count(),
    prisma.task.count({ where: { status: 'Blocked' } }),
  ]);
  const snapshot = `Current system state: ${projects.length} projects -> ${projects.map((p) => `${p.name} [${p.status}/${p.health}, ${p.team ?? 'no team'}]`).join('; ')}. Tasks: ${taskCount} total, ${blocked} blocked.`;
  const context = [sourceText ? `Source material:\n${String(sourceText).slice(0, 8000)}` : '', snapshot].filter(Boolean).join('\n\n');

  const content = await aiService.generateDocument(String(kind), String(title), context, req.user!.sub);
  const document = await prisma.document.create({
    data: { title, type: String(kind), status: 'Draft', content, projectId: projectId ?? null },
  });
  res.status(201).json(document);
});
