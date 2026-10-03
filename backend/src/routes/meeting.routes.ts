// Code written by Kone & Claude | The code does the following: " Defines the read endpoint for saved
// meetings. Meeting packs are CREATED by the AI route (POST /api/ai/meeting, which structures a
// transcript and persists it); this lists them, newest first, for the Meeting Intelligence page.
// Guarded by 'ai:use' so it matches who can run meeting intelligence. "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

export const meetingRouter = Router();
meetingRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Lists saved meeting packs, newest first. "
meetingRouter.get('/', requirePermission('ai:use'), async (_req, res) => {
  const meetings = await prisma.meeting.findMany({ orderBy: { createdAt: 'desc' } });
  res.json(meetings);
});
