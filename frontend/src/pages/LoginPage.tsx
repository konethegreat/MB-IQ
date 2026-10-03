// Code written by Kone & Claude | The code does the following: " The sign-in page. It authenticates
// the user via the auth context, shows errors cleanly, lists demo accounts for each RBAC tier, and
// includes a disabled 'Sign in with organisation SSO' button marking where org SSO will plug in.
// Layout is a fluid two-pane shell: a brand hero (left) and a centred sign-in card (right). "

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('leader@example.test');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Code written by Kone & Claude | The code does the following: " Handles the login submission and
  // redirects to the role-aware dashboard on success. "
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email.trim(), password);
      navigate('/dashboard');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="hero">
        <div>
          <div className="brand-pill"><div className="logo">MB</div><b>MB IQ Engineering Command Centre</b></div>
          <h1>The operating system for the IT division.</h1>
          <p>Projects, sprints, documentation, meeting intelligence and an embedded AI assistant - all
            secured by role-based access, in one fluid web application. Nothing to install.</p>
          <div className="hero-grid">
            <div className="hero-card"><b>Role-Based Dashboards</b>A distinct command view for every tier, from the MD to the wider firm.</div>
            <div className="hero-card"><b>Sprint Control</b>Jira-style boards, tickets, statuses and ownership.</div>
            <div className="hero-card"><b>Meeting Intelligence</b>Turn conversations into structured action plans.</div>
            <div className="hero-card"><b>AI Assistant</b>Summaries, coaching and downloadable PDF reports.</div>
          </div>
        </div>
        <p className="hero-tagline"><b>Internal Transformation. External Innovation. Human Impact.</b></p>
      </div>

      <div className="login-panel">
        <form className="login-card" onSubmit={onSubmit}>
          <h2>Sign in</h2>
          <p className="muted">Welcome back. Sign in to enter your command centre.</p>

          <button type="button" className="btn ghost full" disabled title="Available once organisation SSO is connected">
            Sign in with organisation SSO (coming soon)
          </button>
          <div className="divider">or use a demo account</div>

          {error && <div className="error-banner">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          <button className="btn green full" disabled={busy}>{busy ? 'Signing in...' : 'Enter Command Centre'}</button>

          <div className="demo-creds">
            <b>Demo accounts (each tier sees a different dashboard)</b><br />
            Tier 1 - Final Leader: leader@example.test / configured seed password<br />
            Tier 2 - Squad Leaders (admins): manager-a@example.test - manager-b@example.test / configured seed password<br />
            Tier 3 - Team Leads: engineer1@example.test (Alpha) - engineer4@example.test (Apex) / configured seed password<br />
            Tier 4 - Engineers: engineer2,3,5,6@example.test / configured seed password<br />
            Tier 5 - General Firm: staff@example.test / configured seed password
          </div>
        </form>
      </div>
    </div>
  );
}
