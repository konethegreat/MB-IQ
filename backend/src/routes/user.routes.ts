// Code written by Kone & Claude | The code does the following: " Defines the user-directory endpoint.
// Roles that can view tasks (Tier 1-4) may list colleagues - used to populate assignment dropdowns
// (assign a task to an engineer) and the workload widgets on the leader/captain dashboards. Only safe
// fields are returned (never the password hash). The read-only General Firm tier lacks task:view and
// therefore cannot enumerate staff, preserving privacy. "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

export const userRouter = Router();
userRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Lists users (optionally filtered by
// team) with only non-sensitive fields, ordered by name, for assignment and workload views. "
userRouter.get('/', requirePermission('task:view'), async (req, res) => {
  const { team } = req.query;
  const users = await prisma.user.findMany({
    where: { ...(team ? { team: String(team) } : {}) },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, email: true, role: true, team: true, avatar: true },
  });
  res.json(users);
});
