// Code written by Kone & Claude | The code does the following: " Reusable dashboard filter bar —
// team scope (all / Team Alpha / Team Apex / my team) and priority (all / high / low). Each tier
// dashboard passes which filter options apply to that role. "

import { otherTeam, isSquadTeam, type Project, type Task } from '../pages/dashboards/shared';

export type TeamFilter = 'all' | 'Team Alpha' | 'Team Apex' | 'mine';
export type PriorityFilter = 'all' | 'high' | 'low';

export interface FilterState {
  team: TeamFilter;
  priority: PriorityFilter;
}

export const DEFAULT_FILTERS: FilterState = { team: 'all', priority: 'all' };

export interface FilterOptions {
  showTeam?: boolean;
  showPriority?: boolean;
  defaultTeam?: TeamFilter;
}

const HIGH = new Set(['Critical', 'High']);
const LOW = new Set(['Low']);

// Code written by Kone & Claude | The code does the following: " Returns true when a priority string
// passes the active priority filter. "
export function matchesPriority(priority: string | undefined, filter: PriorityFilter): boolean {
  const p = priority ?? 'Medium';
  if (filter === 'all') return true;
  if (filter === 'high') return HIGH.has(p);
  return LOW.has(p);
}

// Code written by Kone & Claude | The code does the following: " Returns true when a project's team
// passes the active team filter, optionally scoped to the signed-in user's team for 'mine'. "
export function matchesTeam(team: string | null | undefined, filter: TeamFilter, userTeam?: string | null): boolean {
  if (filter === 'all') return true;
  if (filter === 'mine') return !!userTeam && team === userTeam;
  return team === filter;
}

interface Props {
  value: FilterState;
  onChange: (next: FilterState) => void;
  options?: FilterOptions;
  userTeam?: string | null;
}

export function DashboardFilters({ value, onChange, options, userTeam }: Props) {
  const showTeam = options?.showTeam !== false;
  const showPriority = options?.showPriority !== false;
  if (!showTeam && !showPriority) return null;

  return (
    <div className="filter-bar card">
      <span className="filter-label">Filters</span>
      {showTeam && (
        <div className="filter-group">
          <label>Team</label>
          <select value={value.team} onChange={(e) => onChange({ ...value, team: e.target.value as TeamFilter })}>
            <option value="all">All teams</option>
            {isSquadTeam(userTeam) && <option value="mine">My team ({userTeam})</option>}
            <option value="Team Alpha">Team Alpha</option>
            <option value="Team Apex">Team Apex</option>
          </select>
        </div>
      )}
      {showPriority && (
        <div className="filter-group">
          <label>Priority</label>
          <select value={value.priority} onChange={(e) => onChange({ ...value, priority: e.target.value as PriorityFilter })}>
            <option value="all">All priorities</option>
            <option value="high">High / Critical</option>
            <option value="low">Low priority</option>
          </select>
        </div>
      )}
    </div>
  );
}

// Code written by Kone & Claude | The code does the following: " A 'My team / Other team' switch for the
// tier-3 & tier-4 dashboards. The other-team choice is a READ-ONLY peek (callers render it without edit
// controls), so a member can see and help the other squad without being able to change its work. Renders
// nothing for users who aren't on a squad (e.g. Tier 1/2 'Management'). "
export type TeamScope = 'mine' | 'other';
export function TeamScopeTabs({ userTeam, scope, onChange }: { userTeam?: string | null; scope: TeamScope; onChange: (s: TeamScope) => void }) {
  const other = otherTeam(userTeam);
  if (!isSquadTeam(userTeam) || !other) return null;
  return (
    <div className="team-scope-tabs">
      <button type="button" className={`scope-tab ${scope === 'mine' ? 'active' : ''}`} onClick={() => onChange('mine')}>
        My team · {userTeam}
      </button>
      <button type="button" className={`scope-tab ${scope === 'other' ? 'active' : ''}`} onClick={() => onChange('other')}>
        {other} · view only
      </button>
    </div>
  );
}

// Code written by Kone & Claude | The code does the following: " Applies the team + priority filter to a
// project list and the tasks under those projects in ONE place, so every leader dashboard derives its
// filtered view identically instead of copy-pasting the same projects→ids→tasks logic. "
export function filterProjectsAndTasks(
  projects: Project[], tasks: Task[], filters: FilterState, userTeam?: string | null,
): { filteredProjects: Project[]; filteredTasks: Task[] } {
  const filteredProjects = projects.filter(
    (p) => matchesTeam(p.team, filters.team, userTeam) && matchesPriority(p.priority, filters.priority),
  );
  const ids = new Set(filteredProjects.map((p) => p.id));
  const filteredTasks = tasks.filter((t) => {
    if (!matchesPriority(t.priority, filters.priority)) return false;
    if (filters.team === 'all') return true;
    if (!t.projectId) return false;
    return ids.has(t.projectId);
  });
  return { filteredProjects, filteredTasks };
}
