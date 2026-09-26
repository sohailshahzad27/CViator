// frontend/pages/index.js
// ---------------------------------------------------------------
// The CV builder. Auth-gated:
//   'loading'         → verifying the session token
//   'unauthenticated' → redirect to /login
//   'authenticated'   → three-zone workspace (sections · form · preview)
//
// Auto-save: a debounced PUT /api/cv 1.5s after the last change, skipped
// when nothing actually changed since the last successful save.
// ---------------------------------------------------------------

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';

import { useAuth } from '../hooks/useAuth';
import { loadCV, saveCV } from '../services/cv';
import { API_URL, getToken } from '../services/api';
import { uid, isEffectivelyEmpty, sectionStatus } from '../utils/resume';
import { cn } from '../utils/cn';
import AppShell from '../components/AppShell';
import SectionNav from '../components/SectionNav';
import {
  Alert,
  Badge,
  Button,
  Modal,
  Panel,
  Segmented,
  Skeleton,
  useToast,
} from '../components/ui';

const ResumeForm = dynamic(() => import('../components/ResumeForm'), {
  ssr: false,
  loading: () => <FormSkeleton />,
});
const LivePreview = dynamic(() => import('../components/LivePreview'), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
});

const AUTOSAVE_DELAY_MS = 1500;

const TEMPLATE_OPTIONS = [
  { value: 'classic', label: 'Classic' },
  { value: 'modern', label: 'Modern' },
];

const EMPTY_RESUME = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
  others: '',
  photo: '',
  summary: '',
  markerStyle: 'number',
  education: [],
  experience: [],
  projects: [],
  skillsTitle: 'Skills',
  skills: [],
  customSections: [],
};

export default function Home() {
  const router = useRouter();
  const { status, user, logout } = useAuth();
  const { toast } = useToast();

  const [resume, setResume] = useState(EMPTY_RESUME);
  const [template, setTemplate] = useState('classic');
  const [downloading, setDownloading] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [loadingCV, setLoadingCV] = useState(true);
  const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
  const [mobileView, setMobileView] = useState('form'); // form | preview

  // Students build CVs; admins are sent to the dashboard.
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/login');
    else if (status === 'authenticated' && user?.isAdmin) router.replace('/admin');
  }, [status, user, router]);

  // ── Load ────────────────────────────────────────────────────
  const lastSavedRef = useRef(null);

  useEffect(() => {
    if (status !== 'authenticated') return undefined;
    let cancelled = false;
    (async () => {
      setLoadingCV(true);
      try {
        const { data } = await loadCV();
        if (cancelled) return;
        const merged = { ...EMPTY_RESUME, ...data };
        // Older saves may predate stable ids; backfill so React keys and
        // reordering stay correct.
        merged.experience = (merged.experience || []).map((e) => (e.id ? e : { ...e, id: uid() }));
        merged.education = (merged.education || []).map((e) => (e.id ? e : { ...e, id: uid() }));
        merged.projects = (merged.projects || []).map((p) => (p.id ? p : { ...p, id: uid() }));
        merged.customSections = (merged.customSections || []).map((s) => ({
          ...s,
          id: s.id || uid(),
          items: (s.items || []).map((it) => (it.id ? it : { ...it, id: uid() })),
        }));
        lastSavedRef.current = JSON.stringify(merged);
        setResume(merged);
      } catch (err) {
        console.error('Could not load CV:', err);
        if (!cancelled) {
          toast({
            tone: 'danger',
            title: 'Could not load your CV',
            description: 'Check your connection — your saved data is still safe.',
          });
        }
      } finally {
        if (!cancelled) setLoadingCV(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  // ── Debounced auto-save ─────────────────────────────────────
  const saveTimer = useRef(null);
  const inflight = useRef(null);

  useEffect(() => {
    if (loadingCV || status !== 'authenticated') return undefined;

    const serialized = JSON.stringify(resume);
    // Nothing changed since the last successful save (this also stops the
    // initial load from writing identical data straight back).
    if (serialized === lastSavedRef.current) return undefined;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const ticket = Symbol('save');
      inflight.current = ticket;
      setSaveState('saving');
      try {
        await saveCV(resume);
        lastSavedRef.current = serialized;
        if (inflight.current === ticket) setSaveState('saved');
      } catch (err) {
        console.error('Auto-save failed:', err);
        if (inflight.current === ticket) setSaveState('error');
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(saveTimer.current);
  }, [resume, loadingCV, status]);

  // Best-effort flush if the tab closes mid-edit.
  useEffect(() => {
    const handler = () => {
      if (JSON.stringify(resume) === lastSavedRef.current) return;
      const token = getToken();
      if (!token) return;
      try {
        fetch(`${API_URL}/api/cv`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ data: resume }),
          keepalive: true,
        });
      } catch {
        /* nothing useful to do while unloading */
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [resume]);

  const retrySave = useCallback(() => {
    // Touch the object so the auto-save effect runs again.
    setResume((prev) => ({ ...prev }));
  }, []);

  const deferredResume = useDeferredValue(resume);
  const isEmptyCv = isEffectivelyEmpty(resume);
  const sections = useMemo(() => sectionStatus(resume), [resume]);

  const jumpToSection = useCallback((key) => {
    setMobileView('form');
    requestAnimationFrame(() => {
      document.getElementById(`section-${key}`)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
  }, []);

  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true);
      const token = getToken();
      const res = await fetch(`${API_URL}/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ resumeData: resume, template }),
      });
      if (!res.ok) throw new Error(`PDF request failed (${res.status})`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(resume.name || 'resume').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ tone: 'success', title: 'PDF downloaded' });
    } catch (err) {
      console.error(err);
      toast({
        tone: 'danger',
        title: 'Could not generate the PDF',
        description: 'Please try again in a moment.',
      });
    } finally {
      setDownloading(false);
    }
  }, [resume, template, toast]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace('/login');
  }, [logout, router]);

  // ── Render gates ────────────────────────────────────────────
  if (status === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center bg-paper px-6">
        <p className="text-sm text-ink-muted">Verifying your session…</p>
      </div>
    );
  }
  if (status !== 'authenticated') return null; // redirect in flight

  const previewPanel = (
    <Panel className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-ink">Preview</h2>
          <span className="hidden text-2xs text-ink-muted sm:inline">A4 · what prints</span>
        </div>
        <div className="flex items-center gap-2">
          <Segmented
            size="sm"
            value={template}
            onChange={setTemplate}
            options={TEMPLATE_OPTIONS}
            ariaLabel="CV template"
          />
          <Button size="sm" variant="ghost" onClick={() => setPreviewExpanded(true)}>
            Enlarge
          </Button>
        </div>
      </div>
      <div className="max-h-[calc(100vh-11.5rem)] overflow-y-auto bg-inset p-4 scroll-thin">
        <LivePreview resume={deferredResume} template={template} />
      </div>
    </Panel>
  );

  return (
    <AppShell
      title="Your CV"
      context="Builder"
      user={user}
      onLogout={handleLogout}
      width="wide"
      toolbar={
        <>
          <SaveIndicator state={saveState} onRetry={retrySave} />
          <Button
            variant="primary"
            onClick={handleDownload}
            loading={downloading}
            disabled={isEmptyCv}
            title={isEmptyCv ? 'Add your details first' : 'Download your CV as a PDF'}
          >
            {downloading ? 'Generating…' : 'Download PDF'}
          </Button>
        </>
      }
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow">Official GIKI format</p>
          <h1 className="mt-1.5 font-display text-[1.75rem] leading-none tracking-tight text-ink sm:text-[2rem]">
            Build your CV
          </h1>
          <p className="mt-2 text-sm text-ink-muted">
            Changes save automatically. The preview is exactly what the PDF will contain.
          </p>
        </div>
        <Segmented
          className="lg:hidden"
          value={mobileView}
          onChange={setMobileView}
          options={[
            { value: 'form', label: 'Edit' },
            { value: 'preview', label: 'Preview' },
          ]}
          ariaLabel="Switch between editing and preview"
        />
      </div>

      {isEmptyCv && !loadingCV && (
        <Alert tone="warning" title="You’re looking at a sample CV" className="mb-6">
          The preview shows example content so you can see the format. Start with your personal
          details and it becomes yours — nothing sample-related is ever saved or exported.
        </Alert>
      )}

      <div className="grid gap-6 xl:grid-cols-[15rem_minmax(0,1fr)] xl:gap-7">
        <SectionNav
          sections={sections}
          onJump={jumpToSection}
          className="hidden xl:sticky xl:top-[4.75rem] xl:block xl:self-start"
        />

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-7">
          <div className={cn('min-w-0', mobileView === 'form' ? 'block' : 'hidden', 'lg:block')}>
            {loadingCV ? <FormSkeleton /> : <ResumeForm resume={resume} setResume={setResume} />}
          </div>

          <div
            className={cn(
              'min-w-0',
              mobileView === 'preview' ? 'block' : 'hidden',
              'lg:sticky lg:top-[4.75rem] lg:block lg:self-start'
            )}
          >
            {loadingCV ? <PreviewSkeleton /> : previewPanel}
          </div>
        </div>
      </div>

      <Modal
        open={previewExpanded}
        onClose={() => setPreviewExpanded(false)}
        size="lg"
        title="Expanded preview"
        description="Same document, larger. Close to keep editing."
        footer={
          <Button size="sm" variant="secondary" onClick={() => setPreviewExpanded(false)}>
            Close
          </Button>
        }
      >
        <div className="max-h-[70vh] overflow-y-auto bg-inset p-4 scroll-thin">
          <LivePreview resume={deferredResume} template={template} />
        </div>
      </Modal>
    </AppShell>
  );
}

/* ── helpers ──────────────────────────────────────────────────── */

function SaveIndicator({ state, onRetry }) {
  if (state === 'idle') return null;

  if (state === 'error') {
    return (
      <span className="flex items-center gap-2">
        <Badge tone="danger">Not saved</Badge>
        <Button size="sm" variant="ghost" onClick={onRetry}>
          Retry
        </Button>
      </span>
    );
  }

  const saving = state === 'saving';
  return (
    <span
      className="hidden items-center gap-1.5 text-xs text-ink-muted sm:inline-flex"
      aria-live="polite"
    >
      <span
        aria-hidden
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          saving ? 'animate-pulse bg-ochre' : 'bg-accent'
        )}
      />
      {saving ? 'Saving…' : 'Saved'}
    </span>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-lg border border-line bg-surface p-5">
          <Skeleton className="h-2.5 w-28" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
            <Skeleton className="h-9" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="rounded-lg border border-line bg-surface p-4">
      <Skeleton className="h-2.5 w-20" />
      <div className="mt-4 aspect-[210/297] w-full animate-pulse rounded bg-line/50" />
    </div>
  );
}
