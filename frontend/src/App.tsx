// Code written by Kone & Claude | The code does the following: " Defines the application's route table.
// Public route: login. Every other route is wrapped in the auth guard, framed by the shared app shell
// (role-aware sidebar + main area), and gated by the permission that the corresponding nav item
// requires - so deep-linking to a page a tier cannot use redirects to their dashboard. "

import { Routes, Route, Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Sidebar } from './components/Sidebar';
import { useAuth } from './auth/AuthContext';
import { can, type Permission } from './config/roles';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { SprintBoardPage } from './pages/SprintBoardPage';
import { TasksPage } from './pages/TasksPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { DiagramsPage } from './pages/DiagramsPage';
import { MeetingIntelligencePage } from './pages/MeetingIntelligencePage';
import { CommunicationPage } from './pages/CommunicationPage';
import { InnovationPage } from './pages/InnovationPage';
import { ReportsPage } from './pages/ReportsPage';
import { AiAssistantPage } from './pages/AiAssistantPage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';
import { AgentPage } from './pages/AgentPage';

// Code written by Kone & Claude | The code does the following: " The shared app shell that frames every
// authenticated page with the role-aware sidebar. "
function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <Sidebar />
      <main className="main">{children}</main>
    </div>
  );
}

// Code written by Kone & Claude | The code does the following: " Permission gate: if the signed-in user
// lacks the required permission for a page, redirect them to their own dashboard instead of showing a
// view full of forbidden-data errors. "
function Guard({ perm, children }: { perm?: Permission; children: ReactNode }) {
  const { user } = useAuth();
  if (perm && !can(user, perm)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

// Code written by Kone & Claude | The code does the following: " Helper that composes auth guard + shell
// + permission gate around a page element, keeping the route table below readable. "
function protect(node: ReactNode, perm?: Permission) {
  return <ProtectedRoute><Shell><Guard perm={perm}>{node}</Guard></Shell></ProtectedRoute>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={protect(<DashboardPage />, 'project:view')} />
      <Route path="/projects" element={protect(<ProjectsPage />, 'task:view')} />
      <Route path="/board" element={protect(<SprintBoardPage />, 'sprint:view')} />
      <Route path="/tasks" element={protect(<TasksPage />, 'task:view')} />
      <Route path="/docs" element={protect(<DocumentationPage />, 'doc:view')} />
      <Route path="/diagrams" element={protect(<DiagramsPage />, 'doc:view')} />
      <Route path="/meetings" element={protect(<MeetingIntelligencePage />, 'ai:use')} />
      <Route path="/comms" element={protect(<CommunicationPage />, 'comm:participate')} />
      <Route path="/innovation" element={protect(<InnovationPage />, 'report:view')} />
      <Route path="/reports" element={protect(<ReportsPage />, 'report:view')} />
      <Route path="/agent" element={protect(<AgentPage />, 'ai:use')} />
      <Route path="/assistant" element={protect(<AiAssistantPage />, 'ai:use')} />
      <Route path="/notes" element={protect(<NotesPage />, 'note:create')} />
      <Route path="/settings" element={protect(<SettingsPage />, 'settings:manage')} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
