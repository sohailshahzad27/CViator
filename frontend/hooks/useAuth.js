// frontend/hooks/useAuth.js
// ---------------------------------------------------------------
// React Context that exposes the current user + auth actions to
// the entire app.
//
//   const { user, status, login, signup, logout } = useAuth();
//
// status is one of:
//   'loading'           — verifying token on first render
//   'authenticated'     — user is known and logged in
//   'unauthenticated'   — no valid session
// ---------------------------------------------------------------

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  login    as loginRequest,
  signup   as signupRequest,
  logout   as logoutRequest,
  verify   as verifyRequest,
} from '../services/auth';
import { getToken, setToken } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,   setUser]   = useState(null);
  const [status, setStatus] = useState('loading');

  // On first mount, if a token exists, try to verify it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getToken();
      if (!token) {
        if (!cancelled) setStatus('unauthenticated');
        return;
      }
      try {
        const u = await verifyRequest();
        if (cancelled) return;
        setUser(u);
        setStatus('authenticated');
      } catch {
        if (cancelled) return;
        setToken(null);
        setUser(null);
        setStatus('unauthenticated');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const login = useCallback(async (creds) => {
    const u = await loginRequest(creds);
    setUser(u);
    setStatus('authenticated');
    return u;
  }, []);

  const signup = useCallback(async (creds) => {
    const u = await signupRequest(creds);
    setUser(u);
    setStatus('authenticated');
    return u;
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setStatus('unauthenticated');
  }, []);

  return (
    <AuthContext.Provider value={{ user, status, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
