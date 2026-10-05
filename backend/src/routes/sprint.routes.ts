// Code written by Kone & Claude | The code does the following: " Defines sprint endpoints. Anyone with
// 'sprint:view' (Tier 1-4) can list sprints (optionally scoped by team or project) for the board and
// dashboards; only 'sprint:manage' (Final Leader, Squad Leader, Team Lead) can open a new sprint. "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { teamScope, withinTeam } from '../middleware/team-scope';

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
// holding 'sprint:manage'. Team Leads may write only their squad; project/team pairs must agree. "
sprintRouter.post('/', requirePermission('sprint:manage'), async (req, res) => {
  const { name, team, goal, projectId, startDate, endDate } = req.body ?? {};
  if (!name) {
    res.status(400).json({ error: 'A sprint name is required.' });
    return;
  }
  const scope = await teamScope(req.user!.role, req.user!.sub);
  const project = projectId ? await prisma.project.findUnique({ where: { id: String(projectId) } }) : null;
  if (projectId && !project) {
    res.status(400).json({ error: 'Unknown projectId.' });
    return;
  }
  const resolvedTeam = team ?? project?.team ?? scope.team;
  if (!withinTeam(scope, [resolvedTeam, ...(project ? [project.team] : [])])) {
    res.status(403).json({ error: 'Forbidden: sprint and project must belong to your team.' });
    return;
  }
  if (project?.team && resolvedTeam !== project.team) {
    res.status(400).json({ error: 'The sprint team must match its project team.' });
    return;
  }
  const sprint = await prisma.sprint.create({
    data: {
      name,
      team: resolvedTeam,
      goal: goal ?? null,
      projectId: projectId ?? null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  });
  res.status(201).json(sprint);
});
