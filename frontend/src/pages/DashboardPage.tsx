// Code written by Kone & Claude | The code does the following: " The dashboard router. Instead of one
// shared dashboard for everyone, it renders a DIFFERENT dashboard per RBAC tier - because a Tier 1
// managing director and a Tier 5 general-firm reader need completely different things from the command
// centre. Each tier component lives in ./dashboards. "

import { useAuth } from '../auth/AuthContext';
import { FinalLeaderDashboard } from './dashboards/FinalLeaderDashboard';
import { SquadLeaderDashboard } from './dashboards/SquadLeaderDashboard';
import { TeamCaptainDashboard } from './dashboards/TeamCaptainDashboard';
import { EngineerDashboard } from './dashboards/EngineerDashboard';
import { GeneralFirmDashboard } from './dashboards/GeneralFirmDashboard';

export function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case 'FINAL_LEADER': return <FinalLeaderDashboard />;
    case 'SQUAD_LEADER': return <SquadLeaderDashboard />;
    case 'TEAM_CAPTAIN': return <TeamCaptainDashboard />;
    case 'SOFTWARE_ENGINEER': return <EngineerDashboard />;
    default: return <GeneralFirmDashboard />;
  }
}
