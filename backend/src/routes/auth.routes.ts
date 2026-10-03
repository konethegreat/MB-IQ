// Code written by Kone & Claude | The code does the following: " Defines the authentication routes:
// POST /login authenticates via the active provider and returns a JWT + safe user; GET /me returns
// the currently signed-in user from their token. "

import { Router } from 'express';
import { getAuthProvider } from '../auth';
import { signToken } from '../auth/jwt';
import { authMiddleware } from '../middleware/auth.middleware';
import { ROLE_LABEL, ROLE_TIER, ROLE_PERMISSIONS, type RoleKey } from '../config/rbac';

export const authRouter = Router();

// Code written by Kone & Claude | The code does the following: " Logs a user in: delegates to the
// active auth provider, and on success issues a signed JWT alongside the user's role metadata. "
authRouter.post('/login', async (req, res) => {
  try {
    const provider = getAuthProvider();
    const user = await provider.authenticate(req.body ?? {});
    if (!user) {
      res.status(401).json({ error: 'Invalid login details.' });
      return;
    }
    const token = signToken(user);
    const role = user.role as RoleKey;
    res.json({
      token,
      user: {
        ...user,
        roleLabel: ROLE_LABEL[role],
        tier: ROLE_TIER[role],
        permissions: ROLE_PERMISSIONS[role],
      },
    });
  } catch (err) {
    // Log the real cause server-side; never leak provider/internal error details to the client.
    console.error('[auth] login failed:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Code written by Kone & Claude | The code does the following: " Returns the signed-in user's profile
// and role data, derived from their verified JWT. "
authRouter.get('/me', authMiddleware, (req, res) => {
  const role = req.user!.role;
  res.json({
    user: {
      id: req.user!.sub,
      name: req.user!.name,
      email: req.user!.email,
      role,
      roleLabel: ROLE_LABEL[role],
      tier: ROLE_TIER[role],
      permissions: ROLE_PERMISSIONS[role],
      team: req.user!.team ?? null,
    },
  });
});
