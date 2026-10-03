// Code written by Kone & Claude | The code does the following: " Frontend mirror of the backend RBAC
// model. It drives navigation and UX (which menu items and actions a role sees). The backend remains
// the real authority - this only shapes the interface so users are not shown what they cannot use. "

export type RoleKey =
  | 'FINAL_LEADER'
  | 'SQUAD_LEADER'
  | 'TEAM_CAPTAIN'
  | 'SOFTWARE_ENGINEER'
  | 'GENERAL_FIRM';

export type Permission =
  | 'project:view' | 'project:manage'
  | 'task:view' | 'task:manage' | 'task:own'
  | 'sprint:view' | 'sprint:manage'
  | 'report:view' | 'report:generate'
  | 'ai:use' | 'ai:coach'
  | 'doc:view' | 'doc:manage'
  | 'comm:participate'
  | 'note:view' | 'note:create'
  | 'user:manage'
  | 'settings:manage';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: RoleKey;
  roleLabel: string;
  tier: number;
  team?: string | null;
  permissions: Permission[];
}

// Code written by Kone & Claude | The code does the following: " The full feature navigation. Each item
// is gated by a permission, so the sidebar renders only what the signed-in tier may actually use. "
export const NAV_ITEMS: { path: string; label: string; permission: Permission }[] = [
  { path: '/dashboard', label: 'Dashboard', permission: 'project:view' },
  { path: '/projects', label: 'Projects', permission: 'task:view' },
  { path: '/board', label: 'Sprint Board', permission: 'sprint:view' },
  { path: '/tasks', label: 'Tasks', permission: 'task:view' },
  { path: '/docs', label: 'Documentation', permission: 'doc:view' },
  { path: '/diagrams', label: 'Diagram Studio', permission: 'doc:view' },
  { path: '/meetings', label: 'Meeting Intelligence', permission: 'ai:use' },
  { path: '/comms', label: 'Communication', permission: 'comm:participate' },
  { path: '/innovation', label: 'Innovation Pipeline', permission: 'report:view' },
  { path: '/reports', label: 'Reports', permission: 'report:view' },
  { path: '/agent', label: 'Agent', permission: 'ai:use' },
  { path: '/assistant', label: 'AI Assistant', permission: 'ai:use' },
  { path: '/notes', label: 'Notes', permission: 'note:create' },
  { path: '/settings', label: 'Settings', permission: 'settings:manage' },
];

// Code written by Kone & Claude | The code does the following: " Convenience check used across the UI
// to test whether the current session user holds a given permission. "
export function can(user: SessionUser | null, permission: Permission): boolean {
  return !!user && user.permissions.includes(permission);
}
