// Code written by Kone & Claude | The code does the following: " Implements the local username/
// password authentication strategy against the Prisma database, verifying the bcrypt password hash
// and returning a safe AuthUser. This is the provider used for the demo before organisation SSO. "

import bcrypt from 'bcryptjs';
import { prisma } from '../db/prisma';
import type { AuthProvider, AuthUser, Credentials } from './auth.provider';
import type { RoleKey } from '../config/rbac';

export class LocalAuthProvider implements AuthProvider {
  public readonly name = 'local';

  // Code written by Kone & Claude | The code does the following: " Looks up the user by email, checks
  // the supplied password against the stored bcrypt hash, and returns the safe user or null. "
  async authenticate(credentials: Credentials): Promise<AuthUser | null> {
    const email = (credentials.email ?? '').trim().toLowerCase();
    const password = credentials.password ?? '';
    if (!email || !password) return null;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) return null;

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role as RoleKey,
      team: user.team,
      avatar: user.avatar,
    };
  }
}
