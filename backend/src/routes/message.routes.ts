// Code written by Kone & Claude | The code does the following: " Defines team-communication endpoints.
// Any member of the IT division ('comm:participate', Tier 1-4) can read the channel feed and post an
// update. Channels mirror the original prototype (General Updates, team channels, Blockers, Deployments,
// Innovation Ideas). The General Firm tier does not participate in internal comms. "

import { Router } from 'express';
import { prisma } from '../db/prisma';
import { authMiddleware } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/rbac.middleware';

export const messageRouter = Router();
messageRouter.use(authMiddleware);

// Code written by Kone & Claude | The code does the following: " Lists channel messages (optionally
// filtered to one channel), newest first, with the author's name and role. "
messageRouter.get('/', requirePermission('comm:participate'), async (req, res) => {
  const { channel } = req.query;
  const messages = await prisma.message.findMany({
    where: { ...(channel ? { channel: String(channel) } : {}) },
    orderBy: { createdAt: 'desc' },
    include: { author: { select: { name: true, role: true } } },
  });
  res.json(messages);
});

// Code written by Kone & Claude | The code does the following: " Posts a message to a channel as the
// signed-in user. "
messageRouter.post('/', requirePermission('comm:participate'), async (req, res) => {
  const channel = String(req.body?.channel ?? '').trim();
  const body = String(req.body?.body ?? '').trim();
  if (!channel || !body) {
    res.status(400).json({ error: 'A channel and a message body are required.' });
    return;
  }
  const message = await prisma.message.create({ data: { channel, body, authorId: req.user!.sub } });
  res.status(201).json(message);
});
