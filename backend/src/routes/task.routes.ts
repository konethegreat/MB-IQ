// Code written by Kone & Claude | The code does the following: " Defines task/ticket endpoints. Roles
// with 'task:manage' create and edit tasks — Squad/Final Leaders department-wide, Team Leads only
// within their own team; engineers with 'task:own' may update the status of tasks assigned to them
// (so they can move their own cards on the sprint board). "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';
import { roleHasPermission, type RoleKey } from '../config/rbac';
import { teamScope, withinTeam } from '../middleware/team-scope';

export const taskRouter = Router();
taskRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Lists tasks (optionally filtered by
// project or sprint) with owner and project names for the board and task views. "
taskRouter.get('/', requirePermission('task:view'), async (req, res) => {
  const { projectId, sprintId } = req.query;
  const tasks = await prisma.task.findMany({
    where: {
      ...(projectId ? { projectId: String(projectId) } : {}),
      ...(sprintId ? { sprintId: String(sprintId) } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { owner: { select: { name: true, team: true } }, project: { select: { name: true, team: true } }, sprint: { select: { team: true } } },
  });
  res.json(tasks);
});

// Code written by Kone & Claude | The code does the following: " Creates a task; restricted to roles
// holding 'task:manage'. Validates that any supplied projectId/ownerId actually exist (clean 400
// instead of a DB constraint 500). The sprint/project must agree and every supplied resource must
// belong to a Team Lead's own team — preventing cross-team assignment via crafted fields. "
taskRouter.post('/', requirePermission('task:manage'), async (req, res) => {
  const { title, description, projectId, sprintId, ownerId, priority, dueDate, branch, acceptance } = req.body ?? {};
  if (!title) {
    res.status(400).json({ error: 'A task title is required.' });
    return;
  }

  const scope = await teamScope(req.user!.role as RoleKey, req.user!.sub);
  const sprint = sprintId ? await prisma.sprint.findUnique({ where: { id: String(sprintId) } }) : null;
  const resolvedProjectId = projectId ?? sprint?.projectId ?? null;
  const project = resolvedProjectId ? await prisma.project.findUnique({ where: { id: String(resolvedProjectId) } }) : null;
  const owner = ownerId ? await prisma.user.findUnique({ where: { id: String(ownerId) } }) : null;
  if ((sprintId && !sprint) || (resolvedProjectId && !project) || (ownerId && !owner)) {
    res.status(400).json({ error: 'Unknown projectId, sprintId or ownerId.' });
    return;
  }
  const teams = [project, sprint, owner].filter((row): row is NonNullable<typeof row> => !!row).map(row => row.team);
  if (!withinTeam(scope, teams)) {
    res.status(403).json({ error: 'Forbidden: task project, sprint and owner must belong to your team.' });
    return;
  }
  if (sprint?.projectId && sprint.projectId !== resolvedProjectId) {
    res.status(400).json({ error: 'The sprint must belong to the selected project.' });
    return;
  }

  const task = await prisma.task.create({
    data: {
      title,
      description: description ?? null,
      projectId: resolvedProjectId,
      sprintId: sprintId ?? null,
      ownerId: ownerId ?? null,
      priority: priority ?? 'Medium',
      branch: branch ?? null,
      acceptance: acceptance ?? null,
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  res.status(201).json(task);
});

// Code written by Kone & Claude | The code does the following: " Updates a task. Managers may edit any
// field; an engineer with 'task:own' may update only a task assigned to them (status moves), enabling
// self-service on the sprint board while preserving RBAC. "
taskRouter.patch('/:id', requirePermission('task:view'), async (req, res) => {
  const role = req.user!.role as RoleKey;
  const existing = await prisma.task.findUnique({
    where: { id: req.params.id },
    include: { project: { select: { team: true } }, sprint: { select: { team: true } }, owner: { select: { team: true } } },
  });
  if (!existing) {
    res.status(404).json({ error: 'Task not found.' });
    return;
  }

  const canManage = roleHasPermission(role, 'task:manage');
  const ownsTask = roleHasPermission(role, 'task:own') && existing.ownerId === req.user!.sub;
  if (!canManage && !ownsTask) {
    res.status(403).json({ error: 'Forbidden: you may only update tasks assigned to you.' });
    return;
  }

  const { status, priority, title, description, dueDate, branch, acceptance, ownerId } = req.body ?? {};
  if (status !== undefined && !['To Do', 'In Progress', 'In Review', 'Testing', 'Blocked', 'Done'].includes(status)) {
    res.status(400).json({ error: 'Unknown task status.' });
    return;
  }

  // Managers acting under team scope (Team Leads) may only manage their own team's tasks, and may
  // only reassign ownership within their team. Squad/Final Leaders are department-wide; an engineer
  // editing their own task (ownsTask) is unaffected by team scope.
  if (canManage) {
    const scope = await teamScope(role, req.user!.sub);
    const teams = [existing.project, existing.sprint, existing.owner].filter((row): row is NonNullable<typeof row> => !!row).map(row => row.team);
    if (!withinTeam(scope, teams)) {
      res.status(403).json({ error: 'Forbidden: that task belongs to another team.' });
      return;
    }
    if (ownerId) {
      const owner = await prisma.user.findUnique({ where: { id: String(ownerId) } });
      if (!owner) {
        res.status(400).json({ error: 'Unknown ownerId.' });
        return;
      }
      if (!withinTeam(scope, [owner.team])) {
        res.status(403).json({ error: 'Forbidden: you may only assign tasks to your own team.' });
        return;
      }
    }
  }

  // Engineers (own-only) are limited to status changes; managers may change everything.
  const data = canManage
    ? { status, priority, title, description, branch, acceptance, ownerId, dueDate: dueDate ? new Date(dueDate) : undefined }
    : { status };

  const updated = await prisma.task.update({ where: { id: req.params.id }, data });
  res.json(updated);
});
