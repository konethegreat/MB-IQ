// Code written by Kone & Claude | The code does the following: " Route guard component. It renders its
// children only when a user is signed in; otherwise it redirects to the login page. While the session
// is being restored it shows a lightweight loading state. "

import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}
