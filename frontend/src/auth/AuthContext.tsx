// Code written by Kone & Claude | The code does the following: " Provides app-wide authentication
// state. It holds the signed-in user, restores the session from a stored token on load, and exposes
// login() and logout(). Any component can read the current user via the useAuth() hook. "

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, tokenStore } from '../api/client';
import type { SessionUser } from '../config/roles';

interface AuthState {
  user: SessionUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Code written by Kone & Claude | The code does the following: " On first load, if a token exists,
  // restore the session by asking the API who the current user is. "
  useEffect(() => {
    const token = tokenStore.get();
    if (!token) {
      setLoading(false);
      return;
    }
    api<{ user: SessionUser }>('/api/auth/me')
      .then((res) => setUser(res.user))
      .catch(() => {
        tokenStore.clear();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  // Code written by Kone & Claude | The code does the following: " Authenticates against the API,
  // stores the returned JWT, and sets the active user. "
  async function login(email: string, password: string) {
    const res = await api<{ token: string; user: SessionUser }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    tokenStore.set(res.token);
    setUser(res.user);
  }

  // Code written by Kone & Claude | The code does the following: " Clears the stored token and signs
  // the user out. "
  function logout() {
    tokenStore.clear();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// Code written by Kone & Claude | The code does the following: " Hook that exposes the auth state to
// any component; throws if used outside the provider. "
export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
