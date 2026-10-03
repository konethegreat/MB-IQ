// Code written by Kone & Claude | The code does the following: " Defines project endpoints: everyone
// authenticated with 'project:view' can read the portfolio (including the General Firm read-only
// tier); only roles with 'project:manage' can create or update projects. "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { roleHasPermission, type RoleKey } from '../config/rbac';

export const projectRouter = Router();
projectRouter.use(authMiddleware); // every project route requires a valid session.

// Code written by Kone & Claude | The code does the following: " Lists all projects with owner name
// and task counts for the dashboard and read-only progress views. "
projectRouter.get('/', requirePermission('project:view'), async (_req, res) => {
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    include: { owner: { select: { name: true } }, _count: { select: { tasks: true } } },
  });
  res.json(projects);
});

// Code written by Kone & Claude | The code does the following: " Returns a single project. Callers who
// can see task detail (task:view — Software Engineers and up) receive the full tasks/documents/sprints.
// The read-only General Firm tier, which lacks task:view, receives a progress-only summary (status,
// health, priority, owner, task count) with NO document contents — so internal docs and task internals
// are never disclosed firm-wide, matching the brief's 'read-only project progress' for that tier. "
projectRouter.get('/:id', requirePermission('project:view'), async (req, res) => {
  const canSeeDetail = roleHasPermission(req.user!.role as RoleKey, 'task:view');

  // Two concrete queries keep Prisma's result types precise: full detail for task:view holders,
  // a progress-only summary (owner + task count, no document contents) for the General Firm tier.
  const project = canSeeDetail
    ? await prisma.project.findUnique({
        where: { id: req.params.id },
        include: { tasks: true, documents: true, sprints: true, owner: { select: { name: true } } },
      })
    : await prisma.project.findUnique({
        where: { id: req.params.id },
        include: { owner: { select: { name: true } }, _count: { select: { tasks: true } } },
      });
  if (!project) {
    res.status(404).json({ error: 'Project not found.' });
    return;
  }
  res.json(project);
});

// Code written by Kone & Claude | The code does the following: " Creates a new project; restricted to
// roles holding 'project:manage' (Final Leader and Squad Leaders). "
projectRouter.post('/', requirePermission('project:manage'), async (req, res) => {
  const { name, type, description, team, priority, status } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: 'A project name is required.' });
    return;
  }
  const project = await prisma.project.create({
    data: {
      name,
      type: type ?? 'Internal Operations Project',
      description: description ?? '',
      team: team ?? null,
      priority: priority ?? 'Medium',
      status: status ?? 'Idea',
      ownerId: req.user!.sub,
    },
  });
  res.status(201).json(project);
});
