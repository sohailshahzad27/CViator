// frontend/pages/admin/index.js
// Admin dashboard — visible only to users with is_admin = true.
//
// Features:
//   • Paginated user table with role / faculty / batch / department / search filters
//   • Click "View CV" to expand a panel with that user's CV summary
//   • Click "Download PDF" to fetch the user's CV as PDF (Classic / Modern)
//   • Non-admin users are bounced back to / (the builder)

import { useCallback, useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchUsers, fetchFilters, downloadUserPdf, downloadAllCvs,
} from '../../services/admin';

// ── helpers ───────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ── page ──────────────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { status, user, logout } = useAuth();

  const [state,    setState]    = useState('loading');  // loading | forbidden | error | ready
  const [users,    setUsers]    = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  // Filters
  const [filterOptions, setFilterOptions] = useState({ faculties: [], batches: [] });
  const [filters, setFilters] = useState({ role: '', faculty: '', batch: '', q: '' });

  // Auth gates: bounce non-admins to /, anonymous to /login
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated' && !user?.isAdmin) router.replace('/');
  }, [status, user, router]);

  const loadPage = useCallback(async (page = 1, override = filters) => {
    setState('loading');
    try {
      const data = await fetchUsers({ page, ...override });
      setUsers(data.users);
      setPagination(data.pagination);
      setState('ready');
    } catch (err) {
      if (err.status === 403) setState('forbidden');
      else {
        console.error('[admin] fetch users failed:', err);
        setState('error');
      }
    }
  }, [filters]);

  // Initial load + filter changes.
  useEffect(() => {
    if (status !== 'authenticated' || !user?.isAdmin) return;
    loadPage(1);
    fetchFilters().then(setFilterOptions).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, user]);

  // Re-fetch when filters change (debounced for the search input).
  useEffect(() => {
    if (status !== 'authenticated' || !user?.isAdmin) return;
    const t = setTimeout(() => loadPage(1, filters), 300);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleDownload = useCallback(async (u) => {
    setDownloadingId(u.id);
    try {
      const filename = [u.firstName, u.lastName].filter(Boolean).join('_')
        || u.fullName || u.email || 'resume';
      await downloadUserPdf(u.id, { template: 'classic', filename });
    } catch (err) {
      console.error('[admin] download failed:', err);
      alert('Could not download PDF.');
    } finally {
      setDownloadingId(null);
    }
  }, []);

  const handleDownloadAll = useCallback(async () => {
    setDownloadingAll(true);
    try {
      await downloadAllCvs({ role: filters.role, faculty: filters.faculty, batch: filters.batch, q: filters.q, template: 'classic' });
    } catch (err) {
      console.error('[admin] download-all failed:', err);
      alert(err.message || 'Could not download CVs.');
    } finally {
      setDownloadingAll(false);
    }
  }, [filters]);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const activeFilterCount = useMemo(() => Object.values(filters).filter(Boolean).length, [filters]);

  if (status === 'loading') return <Shell user={user} onLogout={() => logout().then(() => router.replace('/login'))}><Spinner /></Shell>;

  if (state === 'forbidden') {
    return (
      <Shell user={user} onLogout={() => logout().then(() => router.replace('/login'))}>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <p className="text-sm font-semibold text-red-700">Access denied</p>
          <p className="mt-1 text-xs text-red-500">Your account does not have admin privileges.</p>
        </div>
      </Shell>
    );
  }

  return (
    <Shell user={user} onLogout={() => logout().then(() => router.replace('/login'))}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Users</h1>
          {state === 'ready' && (
            <p className="mt-0.5 text-sm text-slate-500">
              {pagination.total} matching user{pagination.total === 1 ? '' : 's'}
              {activeFilterCount > 0 && ' (filtered)'}
              {' · '}page {pagination.page} of {pagination.pages}
            </p>
          )}
        </div>
        {state === 'ready' && pagination.total > 0 && (
          <button
            type="button"
            onClick={handleDownloadAll}
            disabled={downloadingAll}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {downloadingAll
              ? 'Bundling…'
              : `Download all ${activeFilterCount > 0 ? 'filtered ' : ''}(${pagination.total}) as ZIP`}
          </button>
        )}
      </div>

      {/* ── Filter bar ─────────────────────────────────────── */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-4">
        <FilterInput
          placeholder="Search email / name / reg no"
          value={filters.q}
          onChange={(v) => setFilter('q', v)}
        />
        <FilterSelect
          value={filters.role}
          onChange={(v) => setFilter('role', v)}
          placeholder="All roles"
          options={[
            { value: 'student', label: 'Students' },
            { value: 'admin',   label: 'Admins'   },
          ]}
        />
        <FilterSelect
          value={filters.faculty}
          onChange={(v) => setFilter('faculty', v)}
          placeholder="All faculties"
          options={filterOptions.faculties.map((f) => ({ value: f, label: f }))}
        />
        <FilterSelect
          value={filters.batch}
          onChange={(v) => setFilter('batch', v)}
          placeholder="All batches"
          options={filterOptions.batches.map((b) => ({ value: b, label: b }))}
        />
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => setFilters({ role: '', faculty: '', batch: '', q: '' })}
            className="col-span-full text-left text-xs text-slate-500 underline hover:text-slate-900 sm:col-auto"
          >
            Clear filters
          </button>
        )}
      </div>

      {state === 'loading' ? (
        <Spinner />
      ) : state === 'error' ? (
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
      ) : users.length === 0 ? (
        <Empty text="No users match those filters." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <Th>Name / Email</Th>
                  <Th>Role</Th>
                  <Th>Faculty</Th>
                  <Th>Batch / Reg</Th>
                  <Th>Joined</Th>
                  <Th><span className="sr-only">Actions</span></Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="transition-colors hover:bg-slate-50">
                    <Td>
                      <div className="font-medium text-slate-900">{u.fullName || '—'}</div>
                      <div className="text-xs text-slate-500">{u.email}</div>
                    </Td>
                    <Td>
                      <RoleBadge role={u.role} isAdmin={u.isAdmin} />
                    </Td>
                    <Td className="text-xs">
                      {u.faculty || <span className="text-slate-400">—</span>}
                    </Td>
                    <Td className="text-xs">
                      {u.batch ? `Batch ${u.batch}` : null}
                      {u.regNo  ? <div className="text-slate-500">{u.regNo}</div> : null}
                      {!u.batch && !u.regNo && <span className="text-slate-400">—</span>}
                    </Td>
                    <Td className="text-xs text-slate-600">{fmtDate(u.createdAt)}</Td>
                    <Td>
                      <div className="flex justify-end whitespace-nowrap">
                        {!u.isAdmin ? (
                          <button
                            type="button"
                            onClick={() => handleDownload(u)}
                            disabled={downloadingId === u.id}
                            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900 disabled:opacity-60"
                          >
                            {downloadingId === u.id ? 'Generating…' : 'Download PDF'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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

        </>
      )}
    </Shell>
  );
}

// ── Presentational helpers ────────────────────────────────────────

function Shell({ children, user, onLogout }) {
  return (
    <>
      <Head><title>Admin — Cviator Pro</title></Head>
      <div className="min-h-screen bg-slate-50">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-slate-900 text-xs font-bold text-white">C</div>
            <span className="text-sm font-semibold text-slate-900">
              Cviator <span className="font-normal text-slate-500">Admin</span>
            </span>
            <div className="ml-auto flex items-center gap-3">
              {user && <span className="hidden text-xs text-slate-500 sm:inline">{user.email}</span>}
              {onLogout && (
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Sign out
                </button>
              )}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
      </div>
    </>
  );
}

function FilterInput({ placeholder, value, onChange }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-slate-500"
    />
  );
}

function FilterSelect({ value, onChange, placeholder, options }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-slate-500"
    >
      <option value="">{placeholder}</option>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

function RoleBadge({ role, isAdmin }) {
  if (isAdmin || role === 'admin') {
    return <span className="inline-block rounded bg-slate-900 px-1.5 py-0.5 text-[11px] font-semibold text-white">Admin</span>;
  }
  return <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-700">Student</span>;
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left">{children}</th>;
}

function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 text-sm text-slate-700 ${className}`}>{children}</td>;
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

function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-slate-700" />
    </div>
  );
}

function Empty({ text }) {
  return <p className="py-8 text-center text-sm text-slate-400">{text}</p>;
}
