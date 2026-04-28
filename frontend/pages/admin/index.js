// frontend/pages/admin/index.js
// Admin dashboard — visible only to users with is_admin = true.
//
// The page itself doesn't know the admin status up front; it tries
// the /api/admin/users endpoint and handles 403 gracefully.
//
// Features:
//   • Paginated user table (email, name, joined, last login, admin flag)
//   • Click a row to expand a panel with that user's CV summary
//   • Loading / empty / error fallback states throughout

import { useCallback, useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import { fetchUsers, fetchUser } from '../../services/admin';

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

// ── page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { status } = useAuth();

  const [state,    setState]    = useState('loading');  // loading | forbidden | error | ready
  const [users,    setUsers]    = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [selected, setSelected] = useState(null);   // { user, cv } | null
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Redirect if not authenticated.
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
  }, [status, router]);

  const loadPage = useCallback(async (page = 1) => {
    setState('loading');
    setSelected(null);
    try {
      const data = await fetchUsers(page);
      setUsers(data.users);
      setPagination(data.pagination);
      setState('ready');
    } catch (err) {
      if (err.status === 403) {
        setState('forbidden');
      } else {
        console.error('[admin] fetch users failed:', err);
        setState('error');
      }
    }
  }, []);

  useEffect(() => {
    if (status === 'authenticated') loadPage(1);
  }, [status, loadPage]);

  const handleSelectUser = useCallback(async (userId) => {
    if (selected?.user?.id === userId) {
      setSelected(null);
      return;
    }
    setLoadingDetail(true);
    try {
      const data = await fetchUser(userId);
      setSelected(data);
    } catch (err) {
      console.error('[admin] fetch user detail failed:', err);
    } finally {
      setLoadingDetail(false);
    }
  }, [selected]);

  if (status === 'loading') return <Shell><Spinner /></Shell>;

  if (state === 'forbidden') {
    return (
      <Shell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-700">Access denied</p>
          <p className="mt-1 text-xs text-red-500">Your account does not have admin privileges.</p>
        </div>
      </Shell>
    );
  }

  if (state === 'error') {
    return (
      <Shell>
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-center">
          <p className="text-sm text-slate-700">Failed to load data.</p>
          <button
            type="button"
            onClick={() => loadPage(pagination.page)}
            className="mt-3 text-xs text-slate-500 underline hover:text-slate-900"
          >
            Retry
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Users</h1>
          {state === 'ready' && (
            <p className="mt-0.5 text-sm text-slate-500">
              {pagination.total} total · page {pagination.page} of {pagination.pages}
            </p>
          )}
        </div>
      </div>

      {state === 'loading' ? (
        <Spinner />
      ) : users.length === 0 ? (
        <Empty text="No users yet." />
      ) : (
        <>
          {/* ── User table ── */}
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <Th>Email</Th>
                  <Th>Name</Th>
                  <Th>Joined</Th>
                  <Th>Last login</Th>
                  <Th>Admin</Th>
                  <Th><span className="sr-only">Detail</span></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isActive = selected?.user?.id === u.id;
                  return (
                    <tr
                      key={u.id}
                      className={`transition-colors ${isActive ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
                    >
                      <Td>
                        <span className="font-medium text-slate-900">{u.email}</span>
                      </Td>
                      <Td>{u.fullName || <span className="text-slate-400">—</span>}</Td>
                      <Td>{fmtDate(u.createdAt)}</Td>
                      <Td>{fmtDateTime(u.lastLoginAt)}</Td>
                      <Td>
                        {u.isAdmin ? (
                          <span className="inline-block rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">
                            Admin
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </Td>
                      <Td>
                        <button
                          type="button"
                          onClick={() => handleSelectUser(u.id)}
                          className="text-xs text-slate-500 hover:text-slate-900"
                        >
                          {isActive ? 'Close' : 'View CV'}
                        </button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <PaginationBtn
                disabled={pagination.page <= 1}
                onClick={() => loadPage(pagination.page - 1)}
              >
                ← Prev
              </PaginationBtn>
              <span className="text-xs text-slate-500">
                {pagination.page} / {pagination.pages}
              </span>
              <PaginationBtn
                disabled={pagination.page >= pagination.pages}
                onClick={() => loadPage(pagination.page + 1)}
              >
                Next →
              </PaginationBtn>
            </div>
          )}

          {/* ── CV Detail Panel ── */}
          {(loadingDetail || selected) && (
            <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6">
              {loadingDetail ? (
                <Spinner />
              ) : (
                <CVDetail user={selected.user} cv={selected.cv} />
              )}
            </div>
          )}
        </>
      )}
    </Shell>
  );
}

// ── CV detail panel ───────────────────────────────────────────────

function CVDetail({ user, cv }) {
  const d = cv?.data || {};

  const sectionCount = (arr) => (arr || []).length;

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{user.email}</p>
          {user.fullName && <p className="mt-0.5 text-xs text-slate-500">{user.fullName}</p>}
        </div>
        {cv?.updatedAt && (
          <p className="text-xs text-slate-400">CV last saved {fmtDateTime(cv.updatedAt)}</p>
        )}
      </div>

      {!cv || !Object.keys(d).length ? (
        <Empty text="This user has not saved any CV data yet." />
      ) : (
        <div className="space-y-5">
          {/* Summary row */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="Experience entries" value={sectionCount(d.experience)} />
            <StatCard label="Education entries"  value={sectionCount(d.education)}  />
            <StatCard label="Projects"           value={sectionCount(d.projects)}   />
            <StatCard label="Skills"             value={sectionCount(d.skills)}     />
          </div>

          {/* Personal info */}
          {(d.name || d.email || d.phone || d.location) && (
            <InfoSection title="Personal">
              <InfoGrid>
                {d.name     && <InfoItem label="Name"     value={d.name} />}
                {d.email    && <InfoItem label="Email"    value={d.email} />}
                {d.phone    && <InfoItem label="Phone"    value={d.phone} />}
                {d.location && <InfoItem label="Location" value={d.location} />}
              </InfoGrid>
            </InfoSection>
          )}

          {/* Experience */}
          {(d.experience || []).length > 0 && (
            <InfoSection title="Experience">
              {d.experience.map((ex, i) => (
                <div key={i} className="text-xs text-slate-700">
                  <span className="font-medium">{ex.company || '—'}</span>
                  {ex.role && <span className="text-slate-500"> · {ex.role}</span>}
                </div>
              ))}
            </InfoSection>
          )}

          {/* Education */}
          {(d.education || []).length > 0 && (
            <InfoSection title="Education">
              {d.education.map((ed, i) => (
                <div key={i} className="text-xs text-slate-700">
                  <span className="font-medium">{ed.school || '—'}</span>
                  {ed.degree && <span className="text-slate-500"> · {ed.degree}</span>}
                </div>
              ))}
            </InfoSection>
          )}

          {/* Skills */}
          {(d.skills || []).length > 0 && (
            <InfoSection title="Skills">
              <div className="flex flex-wrap gap-1.5">
                {d.skills.map((s, i) => (
                  <span
                    key={i}
                    className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                  >
                    {typeof s === 'string' ? s : s.name}
                  </span>
                ))}
              </div>
            </InfoSection>
          )}
        </div>
      )}
    </div>
  );
}

// ── Presentational helpers ────────────────────────────────────────

function Shell({ children }) {
  return (
    <>
      <Head>
        <title>Admin — Cviator Pro</title>
      </Head>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">
              C
            </div>
            <span className="text-sm font-semibold text-slate-900">
              Cviator <span className="font-normal text-slate-500">Admin</span>
            </span>
            <a href="/" className="ml-auto text-xs text-slate-500 hover:text-slate-900">
              ← Back to builder
            </a>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}

function Td({ children }) {
  return <td className="px-4 py-3 text-sm text-slate-700">{children}</td>;
}

function PaginationBtn({ children, onClick, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-center">
      <div className="text-xl font-bold text-slate-900">{value}</div>
      <div className="mt-0.5 text-[11px] text-slate-500">{label}</div>
    </div>
  );
}

function InfoSection({ title, children }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function InfoGrid({ children }) {
  return <div className="grid grid-cols-2 gap-x-6 gap-y-1 sm:grid-cols-4">{children}</div>;
}

function InfoItem({ label, value }) {
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

function Empty({ text }) {
  return (
    <p className="py-8 text-center text-sm text-slate-400">{text}</p>
  );
}
