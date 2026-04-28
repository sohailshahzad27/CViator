// frontend/services/api.js
// ---------------------------------------------------------------
// Tiny fetch wrapper:
//   - prefixes the API base URL
//   - attaches Authorization: Bearer <token> from localStorage
//   - throws an Error with .status and a parsed body on non-2xx
// ---------------------------------------------------------------

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const TOKEN_KEY = 'cviator.token';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else       window.localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch(path, { method = 'GET', body, auth = false, signal } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  let payload = null;
  const text = await res.text();
  if (text) {
    try { payload = JSON.parse(text); } catch { payload = text; }
  }

  if (!res.ok) {
    const message = (payload && payload.error) || `Request failed (${res.status})`;
    const err = new Error(message);
    err.status = res.status;
    err.payload = payload;
    throw err;
  }
  return payload;
}
