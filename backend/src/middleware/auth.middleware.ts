// Code written by Kone & Claude | The code does the following: " Express middleware that reads the
// Authorization Bearer token from each request, verifies the JWT, and attaches the decoded user to
// req.user. Requests without a valid token are rejected with 401. "

import type { Request, Response, NextFunction } from 'express';
import { verifyToken, type JwtPayload } from '../auth/jwt';

// Augment Express's Request type so req.user is strongly typed everywhere downstream.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized: a valid session token is required.' });
    return;
  }

  req.user = payload;
  next();
}
