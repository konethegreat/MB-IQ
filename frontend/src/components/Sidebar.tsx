// Code written by Kone & Claude | The code does the following: " Renders the role-aware sidebar
// navigation with an icon per item. It shows only the nav items the signed-in user's role permits, plus
// their identity (coloured avatar) and a logout button. "

import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { NAV_ITEMS, can } from '../config/roles';
import { Icon, NAV_ICON, Avatar } from '../pages/dashboards/shared';

export function Sidebar() {
  const { user, logout } = useAuth();
  if (!user) return null;

  return (
    <aside className="sidebar">
      <div className="logo-row">
        <div className="logo">MB</div>
        <div><h3>MB IQ</h3><small>Command Centre</small></div>
      </div>

      <nav className="nav">
        {NAV_ITEMS.filter((item) => can(user, item.permission)).map((item) => (
          <NavLink key={item.path} to={item.path} className={({ isActive }) => (isActive ? 'active' : '')}>
            <Icon name={NAV_ICON[item.path] ?? 'grid'} size={18} />{item.label}
          </NavLink>
        ))}
      </nav>

      <div className="user-box">
        <div className="user-line">
          <Avatar name={user.name} />
          <div><b>{user.name}</b><br /><small>{user.roleLabel} · Tier {user.tier}</small></div>
        </div>
        <button className="btn ghost" onClick={logout}>Logout</button>
      </div>
    </aside>
  );
}
