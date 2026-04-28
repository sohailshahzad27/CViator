// frontend/services/admin.js
// Thin wrappers over /api/admin/* endpoints.

import { apiFetch } from './api';

export async function fetchUsers(page = 1) {
  return apiFetch(`/api/admin/users?page=${page}`, { auth: true });
}

export async function fetchUser(id) {
  return apiFetch(`/api/admin/users/${id}`, { auth: true });
}
