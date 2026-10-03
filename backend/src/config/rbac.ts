// Code written by Kone & Claude | The code does the following: " Defines the single source of truth
// for the 5-tier Role-Based Access Control model: the role keys, their numeric tier, the full set of
// permissions, and the map of which permissions each role is granted. "

// The five roles from the project brief, keyed and ordered by tier (1 = highest authority).
export type RoleKey =
  | 'FINAL_LEADER' // Tier 1 - Demo Final Leader
  | 'SQUAD_LEADER' // Tier 2 - Demo Manager A, Demo Manager B
  | 'TEAM_CAPTAIN' // Tier 3 - Team Lead (a senior engineer who also leads a squad)
  | 'SOFTWARE_ENGINEER' // Tier 4 - developers
  | 'GENERAL_FIRM'; // Tier 5 - rest of the firm (read-only + notes)

// Numeric tier for each role. Lower number = more authority.
export const ROLE_TIER: Record<RoleKey, number> = {
  FINAL_LEADER: 1,
  SQUAD_LEADER: 2,
  TEAM_CAPTAIN: 3,
  SOFTWARE_ENGINEER: 4,
  GENERAL_FIRM: 5,
};

// Human-friendly labels for display.
export const ROLE_LABEL: Record<RoleKey, string> = {
  FINAL_LEADER: 'Final Leader',
  SQUAD_LEADER: 'Squad Leader',
  TEAM_CAPTAIN: 'Team Lead', // tier-3 squad lead — a senior engineer who also leads; key stays TEAM_CAPTAIN to avoid churn
  SOFTWARE_ENGINEER: 'Software Engineer',
  GENERAL_FIRM: 'General Firm',
};

// Every discrete capability the API can guard.
export type Permission =
  | 'project:view'
  | 'project:manage'
  | 'task:view'
  | 'task:manage'
  | 'task:own'
  | 'sprint:view'
  | 'sprint:manage'
  | 'report:view'
  | 'report:generate'
  | 'ai:use'
  | 'ai:coach'
  | 'doc:view'
  | 'doc:manage'
  | 'comm:participate'
  | 'note:view'
  | 'note:create'
  | 'user:manage'
  | 'settings:manage';

// Code written by Kone & Claude | The code does the following: " Maps each role to the exact set of
// permissions it is granted. This is the authoritative RBAC table the backend middleware enforces. "
export const ROLE_PERMISSIONS: Record<RoleKey, Permission[]> = {
  // Tier 1: full oversight of everything.
  FINAL_LEADER: [
    'project:view', 'project:manage',
    'task:view', 'task:manage', 'task:own',
    'sprint:view', 'sprint:manage',
    'report:view', 'report:generate',
    'ai:use', 'ai:coach',
    'doc:view', 'doc:manage',
    'comm:participate',
    'note:view', 'note:create',
    'user:manage', 'settings:manage',
  ],
  // Tier 2: lead both dev teams; manage delivery; use full AI incl. coach.
  SQUAD_LEADER: [
    'project:view', 'project:manage',
    'task:view', 'task:manage', 'task:own',
    'sprint:view', 'sprint:manage',
    'report:view', 'report:generate',
    'ai:use', 'ai:coach',
    'doc:view', 'doc:manage',
    'comm:participate',
    'note:view', 'note:create',
    'settings:manage',
  ],
  // Tier 3: lead a sub-team; manage that team's tasks/sprints.
  TEAM_CAPTAIN: [
    'project:view',
    'task:view', 'task:manage', 'task:own',
    'sprint:view', 'sprint:manage',
    'report:view',
    'ai:use', 'ai:coach',
    'doc:view', 'doc:manage',
    'comm:participate',
    'note:view', 'note:create',
  ],
  // Tier 4: work own tasks; view boards; use AI assistant; contribute to docs/comms.
  SOFTWARE_ENGINEER: [
    'project:view',
    'task:view', 'task:own',
    'sprint:view',
    'ai:use',
    'doc:view', 'doc:manage',
    'comm:participate',
    'note:view', 'note:create',
  ],
  // Tier 5: read-only project progress + leave brief notes for IT.
  GENERAL_FIRM: [
    'project:view',
    'note:create',
  ],
};

// Code written by Kone & Claude | The code does the following: " Helper that returns true when a
// given role holds a given permission, used by the RBAC middleware and (mirrored) by the frontend. "
export function roleHasPermission(role: RoleKey, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
