// Code written by Kone & Claude | The code does the following: " Defines sprint endpoints. Anyone with
// 'sprint:view' (Tier 1-4) can list sprints (optionally scoped by team or project) for the board and
// dashboards; only 'sprint:manage' (Final Leader, Squad Leader, Team Lead) can open a new sprint. "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

export const sprintRouter = Router();
sprintRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Lists sprints with the owning project's
// name and a live task count, ordered by start date (newest first). "
sprintRouter.get('/', requirePermission('sprint:view'), async (req, res) => {
  const { team, projectId } = req.query;
  const sprints = await prisma.sprint.findMany({
    where: {
      ...(team ? { team: String(team) } : {}),
      ...(projectId ? { projectId: String(projectId) } : {}),
    },
    orderBy: { startDate: 'desc' },
    include: { project: { select: { name: true } }, _count: { select: { tasks: true } } },
  });
  res.json(sprints);
});

// Code written by Kone & Claude | The code does the following: " Opens a new sprint; restricted to roles
// holding 'sprint:manage'. "
sprintRouter.post('/', requirePermission('sprint:manage'), async (req, res) => {
  const { name, team, goal, projectId, startDate, endDate } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: 'A sprint name is required.' });
    return;
  }
  const sprint = await prisma.sprint.create({
    data: {
      name,
      team: team ?? null,
      goal: goal ?? null,
      projectId: projectId ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });
  res.status(201).json(sprint);
});
