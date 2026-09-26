// frontend/pages/admin/index.js
// Placement-office dashboard: the student register, who has finished a CV,
// and bulk export. Root admins additionally review staff access requests.
//
// Fetching: filters are debounced into `appliedFilters`, and exactly one
// request runs per applied change (the first load is not debounced). Rows
// stay on screen while a refresh is in flight so typing in the search box
// doesn't tear the table down.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../../hooks/useAuth';
import {
  fetchUsers,
  fetchFilters,
  downloadUserPdf,
  downloadAllCvs,
  fetchAdminRequests,
  approveAdminRequest,
  rejectAdminRequest,
} from '../../services/admin';
import { cn } from '../../utils/cn';
import { DEMO_ADMIN } from '../../utils/demoData';
import AppShell from '../../components/AppShell';
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  Panel,
  PanelHeader,
  PageHeader,
  SelectField,
  StatStrip,
  StatTile,
  StatusDot,
  TableSkeleton,
  TextField,
  useToast,
} from '../../components/ui';

const EMPTY_FILTERS = {
  role: '',
  status: '',
  facultyId: '',
  departmentId: '',
  batch: '',
  q: '',
};

const FILTER_LABELS = {
  role: 'Role',
  status: 'Status',
  facultyId: 'Faculty',
  departmentId: 'Department',
  batch: 'Batch',
  q: 'Search',
};

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function fmtRelative(iso) {
  if (!iso) return null;
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (Number.isNaN(days)) return null;
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return months < 12 ? `${months}mo ago` : `${Math.floor(days / 365)}y ago`;
}

export default function AdminPage() {
  const router = useRouter();
  const { status, user, logout } = useAuth();
  const { toast } = useToast();

  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0, withCv: 0 });
  const [filterOptions, setFilterOptions] = useState({ faculties: [], batches: [] });
  const [adminRequests, setAdminRequests] = useState([]);

  const [view, setView] = useState('loading'); // loading | ready | error | forbidden
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [reqBusyId, setReqBusyId] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);

  const isAdmin = status === 'authenticated' && !!user?.isAdmin;

  // ── Auth gates ──────────────────────────────────────────────
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated' && !user?.isAdmin) router.replace('/');
  }, [status, user, router]);

  // ── Debounce filter edits into appliedFilters ───────────────
  const firstFilterRun = useRef(true);
  useEffect(() => {
    if (firstFilterRun.current) {
      firstFilterRun.current = false;
      return undefined; // initial fetch is driven by appliedFilters' initial value
    }
    const t = setTimeout(() => {
      setAppliedFilters(filters);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  // ── Single fetch per applied change ─────────────────────────
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;

    (async () => {
      if (loadedOnce.current) setRefreshing(true);
      try {
        const data = await fetchUsers({ page, ...appliedFilters });
        if (cancelled) return;
        setUsers(data.users || []);
        setPagination(data.pagination || { page: 1, pages: 1, total: 0, withCv: 0 });
        setView('ready');
        loadedOnce.current = true;
      } catch (err) {
        if (cancelled) return;
        if (err.status === 403) setView('forbidden');
        else {
          console.error('[admin] load failed:', err);
          setView('error');
        }
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAdmin, page, appliedFilters]);

  // ── Filter options + pending requests (once) ────────────────
  useEffect(() => {
    if (!isAdmin) return undefined;
    let cancelled = false;

    fetchFilters()
      .then((d) => {
        if (!cancelled) setFilterOptions(d || { faculties: [], batches: [] });
      })
      .catch(() => {});

    if (user?.isRootAdmin) {
      fetchAdminRequests()
        .then((r) => {
          if (!cancelled) setAdminRequests(r.requests || []);
        })
        .catch(() => {});
    }

    return () => {
      cancelled = true;
    };
  }, [isAdmin, user?.isRootAdmin]);

  const reloadRequests = useCallback(async () => {
    try {
      const r = await fetchAdminRequests();
      setAdminRequests(r.requests || []);
    } catch (err) {
      console.error('[admin] reload requests failed:', err);
    }
  }, []);

  // ── Derived ─────────────────────────────────────────────────
  const activeFilters = useMemo(
    () => Object.entries(appliedFilters).filter(([, v]) => v),
    [appliedFilters]
  );
  const hasFilters = activeFilters.length > 0;

  const selectedFaculty = useMemo(
    () => filterOptions.faculties.find((f) => String(f.id) === String(filters.facultyId)),
    [filterOptions, filters.facultyId]
  );
  const showDepartmentFilter = !!selectedFaculty && selectedFaculty.departments.length > 1;

  // Demo fallback. A fresh deployment is never literally empty here — the
  // admin reading this page is themselves a record — so "nothing to show"
  // means no student has signed up yet. Guarded by total <= users.length so
  // a later page of a large register can't be mistaken for an empty one.
  const noStudentsYet =
    users.length > 0 &&
    pagination.total <= users.length &&
    users.every((u) => u.isAdmin);
  const showDemo =
    view === 'ready' && !hasFilters && (users.length === 0 || noStudentsYet);
  const rows = showDemo ? DEMO_ADMIN.users : users;
  const stats = showDemo ? DEMO_ADMIN.pagination : pagination;
  const requests = showDemo && user?.isRootAdmin ? DEMO_ADMIN.adminRequests : adminRequests;
  const options = showDemo ? DEMO_ADMIN.filterOptions : filterOptions;

  const setFilter = useCallback((key, value) => {
    setFilters((f) => {
      const next = { ...f, [key]: value };
      if (key === 'facultyId') next.departmentId = '';
      return next;
    });
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const clearOne = useCallback((key) => {
    setFilters((f) => ({ ...f, [key]: '', ...(key === 'facultyId' ? { departmentId: '' } : {}) }));
  }, []);

  const filterChipLabel = useCallback(
    (key, value) => {
      if (key === 'facultyId') {
        const f = options.faculties.find((x) => String(x.id) === String(value));
        return f ? f.code || f.name : value;
      }
      if (key === 'departmentId') {
        const d = options.faculties
          .flatMap((x) => x.departments || [])
          .find((x) => String(x.id) === String(value));
        return d ? d.name : value;
      }
      if (key === 'role') return value === 'admin' ? 'Staff' : 'Students';
      return value;
    },
    [options]
  );

  // ── Actions ─────────────────────────────────────────────────
  const handleDownload = useCallback(
    async (u) => {
      setDownloadingId(u.id);
      try {
        const filename =
          [u.firstName, u.lastName].filter(Boolean).join('_') || u.fullName || u.email || 'resume';
        await downloadUserPdf(u.id, { template: 'classic', filename });
      } catch (err) {
        toast({
          tone: 'danger',
          title: 'Could not download that CV',
          description: err.message || 'Please try again.',
        });
      } finally {
        setDownloadingId(null);
      }
    },
    [toast]
  );

  const handleDownloadAll = useCallback(async () => {
    setDownloadingAll(true);
    try {
      await downloadAllCvs({
        facultyId: appliedFilters.facultyId,
        departmentId: appliedFilters.departmentId,
        batch: appliedFilters.batch,
        q: appliedFilters.q,
        template: 'classic',
      });
      toast({ tone: 'success', title: 'ZIP downloaded' });
    } catch (err) {
      toast({
        tone: 'danger',
        title: 'Bulk export failed',
        description: err.message || 'Please try again.',
      });
    } finally {
      setDownloadingAll(false);
    }
  }, [appliedFilters, toast]);

  const handleApprove = useCallback(
    async (req) => {
      setReqBusyId(req.id);
      try {
        await approveAdminRequest(req.id);
        await reloadRequests();
        toast({ tone: 'success', title: 'Access approved', description: req.email });
      } catch (err) {
        toast({ tone: 'danger', title: 'Approval failed', description: err.message });
      } finally {
        setReqBusyId(null);
      }
    },
    [reloadRequests, toast]
  );

  const confirmReject = useCallback(async () => {
    if (!rejectTarget) return;
    setReqBusyId(rejectTarget.id);
    try {
      await rejectAdminRequest(rejectTarget.id);
      await reloadRequests();
      toast({ tone: 'success', title: 'Request rejected', description: rejectTarget.email });
      setRejectTarget(null);
    } catch (err) {
      toast({ tone: 'danger', title: 'Could not reject', description: err.message });
    } finally {
      setReqBusyId(null);
    }
  }, [rejectTarget, reloadRequests, toast]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
  }, [logout, router]);

  // ── Render ──────────────────────────────────────────────────
  if (status === 'loading' || (status === 'authenticated' && !user)) {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper px-6">
        <p className="text-sm text-ink-muted">Checking your access…</p>
      </div>
    );
  }
  if (status !== 'authenticated') return null;

  const completion = stats.total > 0 ? Math.round((stats.withCv / stats.total) * 100) : 0;

  return (
    <AppShell
      title="Student records"
      context="Admin"
      user={user}
      onLogout={handleLogout}
      width="wide"
    >
      <PageHeader
        eyebrow="Placement office"
        title="Student records"
        description="Every account on the CV portal, who has finished their CV, and bulk export for the batches you need."
        actions={
          <Button
            variant="primary"
            onClick={handleDownloadAll}
            loading={downloadingAll}
            disabled={showDemo || stats.total === 0}
            title={showDemo ? 'No real records to export yet' : undefined}
          >
            {downloadingAll
              ? 'Bundling…'
              : `Export ${hasFilters ? 'filtered ' : ''}CVs as ZIP`}
          </Button>
        }
      />

      {view === 'forbidden' ? (
        <Panel className="mt-7">
          <EmptyState
            title="Access denied"
            description="This account doesn't have admin privileges. If that's unexpected, ask the root administrator to review your access."
            icon={
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="5" y="10.5" width="14" height="9" rx="2" />
                <path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" strokeLinecap="round" />
              </svg>
            }
          />
        </Panel>
      ) : (
        <>
          {showDemo && (
            <Alert tone="warning" title="Showing sample data" className="mt-7">
              No accounts have been created yet, so the dashboard is filled with example records to
              show the layout. They disappear as soon as the first real student signs up, and none
              of the row actions are live.
            </Alert>
          )}

          {/* ── Figures ──────────────────────────────────────── */}
          <StatStrip className="mt-7">
            <StatTile
              label="Records"
              value={stats.total.toLocaleString('en-GB')}
              sub={hasFilters ? 'matching your filters' : 'students and staff'}
            />
            <StatTile
              label="CVs complete"
              value={stats.withCv?.toLocaleString('en-GB') ?? '—'}
              meter={completion}
              sub={`${completion}% of records`}
            />
            {user?.isRootAdmin ? (
              <StatTile
                label="Pending approvals"
                value={requests.length}
                tone={requests.length > 0 ? 'attention' : 'default'}
                sub={requests.length > 0 ? 'staff awaiting review' : 'nothing to review'}
              />
            ) : (
              <StatTile
                label="Faculties"
                value={options.faculties.length}
                sub="represented in the register"
              />
            )}
            <StatTile
              label="Batches"
              value={options.batches.length}
              sub="with at least one account"
            />
          </StatStrip>

          {/* ── Root admin: pending access requests ──────────── */}
          {user?.isRootAdmin && requests.length > 0 && (
            <Panel className="mt-6 border-ochre-line bg-ochre-soft/40">
              <PanelHeader
                title={`Staff access requests (${requests.length})`}
                description="Approve only people you recognise — admins can read and export every student CV."
              />
              <ul className="divide-y divide-ochre-line/60">
                {requests.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-ink">
                        {r.full_name ||
                          `${r.first_name || ''} ${r.last_name || ''}`.trim() ||
                          '(no name given)'}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-ink-muted">
                        {r.email} · requested {fmtDate(r.created_at)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleApprove(r)}
                        loading={reqBusyId === r.id}
                        disabled={showDemo}
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setRejectTarget(r)}
                        disabled={showDemo || reqBusyId === r.id}
                      >
                        Reject
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* ── Register ─────────────────────────────────────── */}
          <Panel className="mt-6 overflow-hidden">
            <div className="border-b border-line px-4 py-3 sm:px-5">
              <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
                <TextField
                  value={filters.q}
                  onChange={(v) => setFilter('q', v)}
                  placeholder="Search name, email or reg no"
                  aria-label="Search records"
                  className="lg:col-span-2"
                  leading={
                    <svg viewBox="0 0 16 16" aria-hidden className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                      <circle cx="7" cy="7" r="4.25" />
                      <path d="M10.5 10.5L14 14" strokeLinecap="round" />
                    </svg>
                  }
                />
                <SelectField
                  value={filters.role}
                  onChange={(v) => setFilter('role', v)}
                  placeholder="All roles"
                  aria-label="Filter by role"
                  options={[
                    { value: 'student', label: 'Students' },
                    { value: 'admin', label: 'Staff' },
                  ]}
                />
                <SelectField
                  value={filters.facultyId}
                  onChange={(v) => setFilter('facultyId', v)}
                  placeholder="All faculties"
                  aria-label="Filter by faculty"
                  options={options.faculties.map((f) => ({
                    value: String(f.id),
                    label: f.code || f.name,
                  }))}
                />
                {showDepartmentFilter && (
                  <SelectField
                    value={filters.departmentId}
                    onChange={(v) => setFilter('departmentId', v)}
                    placeholder="All departments"
                    aria-label="Filter by department"
                    options={selectedFaculty.departments.map((d) => ({
                      value: String(d.id),
                      label: d.name,
                    }))}
                  />
                )}
                <SelectField
                  value={filters.batch}
                  onChange={(v) => setFilter('batch', v)}
                  placeholder="All batches"
                  aria-label="Filter by batch"
                  options={options.batches.map((b) => ({ value: b, label: b }))}
                />
              </div>

              {hasFilters && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-2xs uppercase tracking-wide text-ink-muted">Filtered by</span>
                  {activeFilters.map(([key, value]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => clearOne(key)}
                      className="group inline-flex items-center gap-1.5 rounded border border-line bg-inset px-1.5 py-0.5 text-2xs font-medium text-ink-soft transition-colors hover:border-line-strong hover:text-ink"
                    >
                      <span className="text-ink-muted">{FILTER_LABELS[key]}:</span>
                      {filterChipLabel(key, value)}
                      <svg viewBox="0 0 16 16" aria-hidden className="h-2.5 w-2.5 text-ink-muted group-hover:text-danger" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                      </svg>
                      <span className="sr-only">Remove filter</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="ml-1 text-2xs font-medium text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {view === 'loading' ? (
              <TableSkeleton rows={8} />
            ) : view === 'error' ? (
              <EmptyState
                title="Couldn't load the register"
                description="The request to the server failed. Check that the API is reachable and try again."
                action={
                  <Button variant="secondary" onClick={() => setAppliedFilters({ ...appliedFilters })}>
                    Retry
                  </Button>
                }
              />
            ) : rows.length === 0 ? (
              <EmptyState
                title={hasFilters ? 'No records match those filters' : 'No accounts yet'}
                description={
                  hasFilters
                    ? 'Try widening the search, or clear the filters to see the whole register.'
                    : 'Once students sign up with their GIKI email they appear here automatically.'
                }
                action={
                  hasFilters ? (
                    <Button variant="secondary" onClick={clearFilters}>
                      Clear filters
                    </Button>
                  ) : null
                }
              />
            ) : (
              <>
                <div
                  className={cn(
                    'overflow-x-auto transition-opacity duration-200',
                    refreshing && 'opacity-60'
                  )}
                  aria-busy={refreshing}
                >
                  <table className="w-full min-w-[46rem] text-sm">
                    <thead>
                      <tr className="border-b border-line bg-inset text-left">
                        <Th>Name</Th>
                        <Th>Role</Th>
                        <Th className="hidden md:table-cell">Faculty</Th>
                        <Th className="hidden lg:table-cell">Batch / Reg</Th>
                        <Th>CV</Th>
                        <Th className="hidden xl:table-cell">Joined</Th>
                        <Th className="text-right">
                          <span className="sr-only">Actions</span>
                        </Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map((u) => (
                        <tr key={u.id} className="group transition-colors hover:bg-inset/70">
                          <Td>
                            <div className="font-medium text-ink">{u.fullName || '—'}</div>
                            <div className="mt-0.5 truncate text-xs text-ink-muted">{u.email}</div>
                          </Td>
                          <Td>
                            {u.isRootAdmin ? (
                              <Badge tone="ochre">Root</Badge>
                            ) : u.isAdmin ? (
                              <Badge tone="accent">Staff</Badge>
                            ) : (
                              <Badge tone="neutral">Student</Badge>
                            )}
                          </Td>
                          <Td className="hidden md:table-cell">
                            {u.facultyName ? (
                              <>
                                <div className="text-xs text-ink-soft">{u.facultyName}</div>
                                {u.departmentName && u.departmentName !== u.facultyName && (
                                  <div className="mt-0.5 text-xs text-ink-muted">
                                    {u.departmentName}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-ink-muted">—</span>
                            )}
                          </Td>
                          <Td className="hidden lg:table-cell">
                            {u.batch || u.regNo ? (
                              <>
                                {u.batch && <div className="ident text-xs text-ink-soft">{u.batch}</div>}
                                {u.regNo && (
                                  <div className="ident mt-0.5 text-xs text-ink-muted">{u.regNo}</div>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-ink-muted">—</span>
                            )}
                          </Td>
                          <Td>
                            {u.isAdmin ? (
                              <span className="text-xs text-ink-muted">n/a</span>
                            ) : u.hasCv ? (
                              <StatusDot tone="done">
                                {fmtRelative(u.cvUpdatedAt) || 'complete'}
                              </StatusDot>
                            ) : (
                              <StatusDot tone="empty">Empty</StatusDot>
                            )}
                          </Td>
                          <Td className="hidden xl:table-cell">
                            <span className="tnum text-xs text-ink-muted">{fmtDate(u.createdAt)}</span>
                          </Td>
                          <Td className="text-right">
                            {!u.isAdmin ? (
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => handleDownload(u)}
                                loading={downloadingId === u.id}
                                disabled={showDemo || !u.hasCv}
                                title={
                                  showDemo
                                    ? 'Sample row — not a real account'
                                    : !u.hasCv
                                    ? 'This student has not filled in a CV yet'
                                    : 'Download this CV as a PDF'
                                }
                              >
                                {downloadingId === u.id ? 'Preparing…' : 'PDF'}
                              </Button>
                            ) : (
                              <span className="text-xs text-ink-muted">—</span>
                            )}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3 sm:px-5">
                  <p className="tnum text-xs text-ink-muted">
                    {(() => {
                      const from = (stats.page - 1) * (stats.limit || 20) + 1;
                      const to = Math.min(stats.total, from + rows.length - 1);
                      return `Showing ${from}–${to} of ${stats.total.toLocaleString('en-GB')}`;
                    })()}
                  </p>
                  {stats.pages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={showDemo || stats.page <= 1 || refreshing}
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                      >
                        Previous
                      </Button>
                      <span className="tnum px-1.5 text-xs text-ink-muted">
                        {stats.page} / {stats.pages}
                      </span>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={showDemo || stats.page >= stats.pages || refreshing}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </Panel>
        </>
      )}

      <ConfirmDialog
        open={!!rejectTarget}
        title="Reject this access request?"
        description={
          rejectTarget
            ? `${rejectTarget.email} will be deleted and will need to sign up again.`
            : undefined
        }
        confirmLabel="Reject request"
        tone="danger"
        busy={!!reqBusyId && reqBusyId === rejectTarget?.id}
        onConfirm={confirmReject}
        onCancel={() => setRejectTarget(null)}
      />
    </AppShell>
  );
}

/* ── table primitives ─────────────────────────────────────────── */

function Th({ children, className }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap px-4 py-2.5 text-2xs font-semibold uppercase tracking-[0.1em] text-ink-muted sm:px-5',
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({ children, className }) {
  return (
    <td className={cn('px-4 py-3 align-top text-sm text-ink-soft sm:px-5', className)}>
      {children}
    </td>
  );
}
