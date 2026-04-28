// frontend/pages/admin/index.js
// DEV MODE — auth gate removed for local testing.
// Shows user table if backend is running, empty state if not.

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';

// ── helpers ───────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function apiFetch(path) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('cviator.token') : null;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { headers });
  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

// ── page ─────────────────────────────────────────────────────────

export default function AdminPage() {
  const [state,      setState]      = useState('loading'); // loading | ready | error | forbidden
  const [users,      setUsers]      = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, limit: 20 });
  const [selected,   setSelected]   = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadPage = useCallback(async (page = 1) => {
    setState('loading');
    setSelected(null);
    try {
      const data = await apiFetch(`/api/admin/users?page=${page}`);
      setUsers(data.users);
      setPagination(data.pagination);
      setState('ready');
    } catch (err) {
      setState(err.status === 403 ? 'forbidden' : 'error');
    }
  }, []);

  useEffect(() => { loadPage(1); }, [loadPage]);

  const handleSelectUser = useCallback(async (userId) => {
    if (selected?.user?.id === userId) { setSelected(null); return; }
    setLoadingDetail(true);
    try {
      const data = await apiFetch(`/api/admin/users/${userId}`);
      setSelected(data);
    } catch (err) {
      console.error('Could not load user detail:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [selected]);

  return (
    <>
      <Head><title>Admin — Cviator Pro</title></Head>
      <div className="min-h-screen bg-slate-50">

        {/* Header */}
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">C</div>
            <span className="text-sm font-semibold text-slate-900">
              Cviator <span className="font-normal text-slate-500">Admin</span>
            </span>
            <Link
              href="/"
              className="ml-auto rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              ← Builder
            </Link>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">

          {/* States */}
          {state === 'loading' && <Spinner />}

          {state === 'forbidden' && (
            <Notice color="red" title="Access denied">
              Your account does not have admin privileges. Set <code>is_admin = TRUE</code> in the database for your user.
            </Notice>
          )}

          {state === 'error' && (
            <Notice color="slate" title="Could not load users">
              Make sure the backend is running on port 5000.{' '}
              <button onClick={() => loadPage(1)} className="underline hover:no-underline">Retry</button>
            </Notice>
          )}

          {state === 'ready' && (
            <>
              <div className="mb-6">
                <h1 className="text-xl font-semibold text-slate-900">Users</h1>
                <p className="mt-0.5 text-sm text-slate-500">
                  {pagination.total} total · page {pagination.page} of {pagination.pages}
                </p>
              </div>

              {users.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-400">No users yet.</p>
              ) : (
                <>
                  {/* Table */}
                  <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                          <Th>Email</Th>
                          <Th>Name</Th>
                          <Th>Joined</Th>
                          <Th>Last login</Th>
                          <Th>Admin</Th>
                          <Th></Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {users.map((u) => {
                          const active = selected?.user?.id === u.id;
                          return (
                            <tr key={u.id} className={active ? 'bg-slate-50' : 'hover:bg-slate-50'}>
                              <Td><span className="font-medium text-slate-900">{u.email}</span></Td>
                              <Td>{u.fullName || <span className="text-slate-400">—</span>}</Td>
                              <Td>{fmtDate(u.createdAt)}</Td>
                              <Td>{fmtDateTime(u.lastLoginAt)}</Td>
                              <Td>
                                {u.isAdmin
                                  ? <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">Admin</span>
                                  : <span className="text-slate-400">—</span>}
                              </Td>
                              <Td>
                                <button
                                  type="button"
                                  onClick={() => handleSelectUser(u.id)}
                                  className="text-xs text-slate-500 hover:text-slate-900"
                                >
                                  {active ? 'Close' : 'View CV'}
                                </button>
                              </Td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="mt-4 flex items-center justify-center gap-3">
                      <PageBtn disabled={pagination.page <= 1} onClick={() => loadPage(pagination.page - 1)}>← Prev</PageBtn>
                      <span className="text-xs text-slate-500">{pagination.page} / {pagination.pages}</span>
                      <PageBtn disabled={pagination.page >= pagination.pages} onClick={() => loadPage(pagination.page + 1)}>Next →</PageBtn>
                    </div>
                  )}

                  {/* CV Detail */}
                  {(loadingDetail || selected) && (
                    <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
                      {loadingDetail ? <Spinner /> : <CVDetail user={selected.user} cv={selected.cv} />}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

// ── CV detail ─────────────────────────────────────────────────────

function CVDetail({ user, cv }) {
  const d = cv?.data || {};
  const count = (arr) => (arr || []).length;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="font-semibold text-slate-900">{user.email}</p>
          {user.fullName && <p className="mt-0.5 text-xs text-slate-500">{user.fullName}</p>}
        </div>
        {cv?.updatedAt && (
          <p className="text-xs text-slate-400">CV last saved {fmtDateTime(cv.updatedAt)}</p>
        )}
      </div>

      {!cv || !Object.keys(d).length ? (
        <p className="py-6 text-center text-sm text-slate-400">No CV data saved yet.</p>
      ) : (
        <div className="space-y-5">
          {/* Stat cards */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Experience" value={count(d.experience)} />
            <Stat label="Education"  value={count(d.education)}  />
            <Stat label="Projects"   value={count(d.projects)}   />
            <Stat label="Skills"     value={count(d.skills)}     />
          </div>

          {/* Personal */}
          {(d.name || d.email || d.phone || d.location) && (
            <CVSection title="Personal">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">
                {d.name     && <Field label="Name"     value={d.name} />}
                {d.email    && <Field label="Email"    value={d.email} />}
                {d.phone    && <Field label="Phone"    value={d.phone} />}
                {d.location && <Field label="Location" value={d.location} />}
              </div>
            </CVSection>
          )}

          {/* Experience */}
          {count(d.experience) > 0 && (
            <CVSection title="Experience">
              {d.experience.map((ex, i) => (
                <p key={i} className="text-xs text-slate-700">
                  <span className="font-medium">{ex.company || '—'}</span>
                  {ex.role && <span className="text-slate-500"> · {ex.role}</span>}
                </p>
              ))}
            </CVSection>
          )}

          {/* Education */}
          {count(d.education) > 0 && (
            <CVSection title="Education">
              {d.education.map((ed, i) => (
                <p key={i} className="text-xs text-slate-700">
                  <span className="font-medium">{ed.school || '—'}</span>
                  {ed.degree && <span className="text-slate-500"> · {ed.degree}</span>}
                </p>
              ))}
            </CVSection>
          )}

          {/* Skills */}
          {count(d.skills) > 0 && (
            <CVSection title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {d.skills.map((s, i) => (
                  <span key={i} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {typeof s === 'string' ? s : s.name}
                  </span>
                ))}
              </div>
            </CVSection>
          )}
        </div>
      )}
    </div>
  );
}

// ── small components ──────────────────────────────────────────────

function Th({ children }) {
  return <th className="px-4 py-3">{children}</th>;
}
function Td({ children }) {
  return <td className="px-4 py-3 text-sm text-slate-700">{children}</td>;
}
function PageBtn({ children, onClick, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50">
      {children}
    </button>
  );
}
function Stat({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center">
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}
function CVSection({ title, children }) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}
function Field({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-slate-400">{label}</div>
      <div className="text-xs font-medium text-slate-700 break-all">{value}</div>
    </div>
  );
}
function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
    </div>
  );
}
function Notice({ color, title, children }) {
  const colors = {
    red:   'border-red-200 bg-red-50 text-red-700',
    slate: 'border-slate-200 bg-slate-50 text-slate-700',
  };
  return (
    <div className={`rounded-lg border p-6 ${colors[color]}`}>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm">{children}</p>
    </div>
  );
}
