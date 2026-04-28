// frontend/services/auth.js
// ---------------------------------------------------------------
// Thin wrappers over /api/auth/* endpoints.
// ---------------------------------------------------------------

import { apiFetch, setToken } from './api';

export async function signup(payload) {
  // payload: { email, password, role, firstName, lastName,
  //            regNo?, faculty?, batch?, department?, designation?, adminCode? }
  const data = await apiFetch('/api/auth/signup', {
    method: 'POST',
    body: payload,
  });
  setToken(data.token);
  return data.user;
}

export async function login({ email, password }) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: { email, password },
  });
  setToken(data.token);
  return data.user;
}

export async function verify() {
  const data = await apiFetch('/api/auth/verify', { method: 'POST', auth: true });
  return data.user;
}

export async function logout() {
  try {
    await apiFetch('/api/auth/logout', { method: 'POST', auth: true });
  } catch {
    // Ignore — local token is dropped regardless.
  }
  setToken(null);
}
