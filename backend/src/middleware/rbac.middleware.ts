// Code written by Kone & Claude | The code does the following: " Provides the RBAC guards used on
// protected routes: requirePermission(...) checks the signed-in user's role against the central
// permission table, and requireTier(...) gates a route to a minimum authority tier. "

import type { Request, Response, NextFunction } from 'express';
import { roleHasPermission, ROLE_TIER, type Permission, type RoleKey } from '../config/rbac';

// Code written by Kone & Claude | The code does the following: " Returns middleware that allows the
// request through only if the user's role holds the required permission; otherwise responds 403. "
export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role as RoleKey | undefined;
    if (!role) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    if (!roleHasPermission(role, permission)) {
      res.status(403).json({ error: `Forbidden: your role lacks the '${permission}' permission.` });
      return;
    }
    next();
  };
}

// Code written by Kone & Claude | The code does the following: " Returns middleware that allows the
// request through only if the user's tier is at least as senior as the required tier (lower number =
// more authority), e.g. requireTier(2) admits Final Leaders and Squad Leaders. "
export function requireTier(minimumTier: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const role = req.user?.role as RoleKey | undefined;
    if (!role) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }
    if (ROLE_TIER[role] > minimumTier) {
      res.status(403).json({ error: 'Forbidden: insufficient authority for this action.' });
      return;
    }
    next();
  };
}
