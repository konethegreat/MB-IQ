// Code written by Kone & Claude | The code does the following: " Resolves write scope from the
// current user record. Managers oversee both squads; Team Leads need a concrete matching team. "
import { prisma } from '../db/prisma';
import type { RoleKey } from '../config/rbac';

export async function teamScope(role: RoleKey, callerId: string): Promise<{ scoped: boolean; team: string | null }> {
  if (role === 'FINAL_LEADER' || role === 'SQUAD_LEADER') return { scoped: false, team: null };
  const caller = await prisma.user.findUnique({ where: { id: callerId }, select: { team: true } });
  return { scoped: true, team: caller?.team ?? null };
}

// Code written by Kone & Claude | The code does the following: " Requires every existing resource
// context to belong to a scoped caller's team, including owner-only tasks and unscoped resources. "
export function withinTeam(scope: { scoped: boolean; team: string | null }, teams: (string | null)[]): boolean {
  return !scope.scoped || (!!scope.team && teams.length > 0 && teams.every(team => team === scope.team));
}
