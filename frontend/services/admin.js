// frontend/services/admin.js
// Thin wrappers over /api/admin/* endpoints.

import { apiFetch, API_URL, getToken } from './api';

export async function fetchUsers({ page = 1, role, faculty, batch, department, q } = {}) {
  const params = new URLSearchParams();
  params.set('page', String(page));
  if (role)       params.set('role',       role);
  if (faculty)    params.set('faculty',    faculty);
  if (batch)      params.set('batch',      batch);
  if (department) params.set('department', department);
  if (q)          params.set('q',          q);
  return apiFetch(`/api/admin/users?${params.toString()}`, { auth: true });
}

export async function fetchUser(id) {
  return apiFetch(`/api/admin/users/${id}`, { auth: true });
}

export async function fetchFilters() {
  return apiFetch('/api/admin/filters', { auth: true });
}

// Streams a ZIP of every CV matching the current filters. Same query
// shape as fetchUsers (minus pagination — the zip ignores page size).
export async function downloadAllCvs({ role, faculty, batch, department, q, template = 'classic' } = {}) {
  const params = new URLSearchParams();
  if (role)       params.set('role',       role);
  if (faculty)    params.set('faculty',    faculty);
  if (batch)      params.set('batch',      batch);
  if (department) params.set('department', department);
  if (q)          params.set('q',          q);
  if (template)   params.set('template',   template);

  const token = getToken();
  const res = await fetch(`${API_URL}/api/admin/download-all?${params.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = `Download failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* not JSON, keep default */ }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  const blob = await res.blob();
  const dispo = res.headers.get('Content-Disposition') || '';
  const match = dispo.match(/filename="?([^";]+)"?/i);
  const filename = match ? match[1] : `cvs_${new Date().toISOString().slice(0, 10)}.zip`;

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Streams the PDF blob for a given user; triggers a browser download.
export async function downloadUserPdf(id, { template = 'classic', filename } = {}) {
  const token = getToken();
  const res = await fetch(
    `${API_URL}/api/admin/users/${id}/pdf?template=${encodeURIComponent(template)}`,
    { headers: token ? { Authorization: `Bearer ${token}` } : {} }
  );
  if (!res.ok) throw new Error(`PDF download failed (${res.status})`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = (filename || 'resume').replace(/\s+/g, '_') + '.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
