// Code written by Kone & Claude | The code does the following: " Signs and verifies the JSON Web
// Tokens used for stateless API sessions. The token payload carries the user id and RBAC role, so
// middleware can authorise requests without a database lookup on every call. "

import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthUser } from './auth.provider';
import type { RoleKey } from '../config/rbac';

export interface JwtPayload {
  sub: string; // user id
  name: string;
  email: string;
  role: RoleKey;
  team?: string | null;
}

// Code written by Kone & Claude | The code does the following: " Creates a signed JWT for an
// authenticated user. The same token shape is produced regardless of auth provider (local or SSO). "
export function signToken(user: AuthUser): string {
  const payload: JwtPayload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    team: user.team ?? null,
  };
  // Cast keeps us compatible with @types/jsonwebtoken's strict expiresIn union while reading the
  // value from configuration as a simple string (e.g. "8h").
  const options = { expiresIn: env.jwtExpiresIn, algorithm: 'HS256' } as jwt.SignOptions;
  return jwt.sign(payload, env.jwtSecret, options);
}

// Code written by Kone & Claude | The code does the following: " Verifies an incoming JWT and returns
// its decoded payload, or null if the token is missing, expired or tampered with. "
export function verifyToken(token: string): JwtPayload | null {
  try {
    // Pin the algorithm so a token forged with a different `alg` header (e.g. 'none' or RS256
    // key-confusion) cannot be accepted; only our HS256-signed tokens verify.
    return jwt.verify(token, env.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
  } catch {
    return null;
  }
}
