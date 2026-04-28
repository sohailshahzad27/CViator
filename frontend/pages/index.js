// frontend/pages/index.js
// DEV MODE — auth gate removed for local testing.
// Restore auth gate when done testing.

import {
  useCallback, useDeferredValue, useMemo, useState,
} from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Link from 'next/link';
import { API_URL } from '../services/api';

const ResumeForm = dynamic(() => import('../components/ResumeForm'), {
  ssr: false,
  loading: () => <FormSkeleton />,
});
const LivePreview = dynamic(() => import('../components/LivePreview'), {
  ssr: false,
  loading: () => <PreviewSkeleton />,
});

const EMPTY_RESUME = {
  name: '',
  email: '',
  phone: '',
  location: '',
  linkedin: '',
  github: '',
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
  const [resume, setResume] = useState(EMPTY_RESUME);
  const [template, setTemplate] = useState('classic');
  const [downloading, setDownloading] = useState(false);
  const [previewExpanded, setPreviewExpanded] = useState(false);

  const deferredResume = useDeferredValue(resume);

  const handleDownload = useCallback(async () => {
    try {
      setDownloading(true);
      const res = await fetch(`${API_URL}/generate-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
    } catch (err) {
      console.error(err);
      alert('Could not generate PDF. Make sure the backend is running on port 5000.');
    } finally {
      setDownloading(false);
    }
  }, [resume, template]);

  const templateOptions = useMemo(() => ([
    { value: 'classic', label: 'Classic' },
    { value: 'modern',  label: 'Modern'  },
  ]), []);

  return (
    <>
      <Head>
        <title>Cviator Pro — Resume Builder</title>
        <meta name="description" content="Build and download beautiful resumes in seconds." />
      </Head>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-xs font-bold text-white">C</div>
            <span className="text-base font-semibold text-slate-900">
              Cviator <span className="font-normal text-slate-500">Pro</span>
            </span>
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3">
            {/* DEV NAV */}
            <Link
              href="/admin"
              className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-400 hover:text-slate-900"
            >
              Admin →
            </Link>

            <SegmentedControl
              label="Template"
              value={template}
              onChange={setTemplate}
              options={templateOptions}
            />
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {downloading ? 'Generating…' : 'Download PDF'}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section>
            <div className="mb-5">
              <h1 className="text-xl font-semibold text-slate-900">Build your resume</h1>
              <p className="mt-1 text-sm text-slate-500">Fill in your details and see the preview update live.</p>
            </div>
            <ResumeForm resume={resume} setResume={setResume} />
          </section>

          <section className="lg:sticky lg:top-20 lg:self-start">
            <div className="mb-5 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Preview</h2>
                <p className="mt-1 text-sm text-slate-500">What you see is what the PDF will look like.</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPreviewExpanded(true)}
                  className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Enlarge
                </button>
                <span className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 capitalize">
                  {template}
                </span>
              </div>
            </div>

            <div className="max-h-[calc(100vh-11rem)] overflow-y-auto scroll-thin rounded-lg border border-slate-200 bg-slate-100 p-4">
              <LivePreview resume={deferredResume} template={template} />
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center text-xs text-slate-500 sm:px-6 lg:px-8">
          Built with Next.js, Tailwind, Express, Postgres, and Puppeteer.
        </div>
      </footer>

      {previewExpanded && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm sm:px-6">
          <div className="flex max-h-[calc(100vh-3rem)] w-full max-w-[1120px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Expanded Preview</h3>
                <p className="mt-0.5 text-xs text-slate-500">Review the resume at a larger size.</p>
              </div>
              <button
                type="button"
                onClick={() => setPreviewExpanded(false)}
                className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
              >
                Close
              </button>
            </div>
            <div className="overflow-auto p-5">
              <LivePreview resume={deferredResume} template={template} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── helpers ───────────────────────────────────────────────────────

function SegmentedControl({ label, value, onChange, options }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium uppercase tracking-wider text-slate-500 sm:inline">{label}</span>
      <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={`rounded px-3 py-1.5 text-xs font-medium transition ${
                active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FormSkeleton() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-white" />
      ))}
    </div>
  );
}

function PreviewSkeleton() {
  return (
    <div className="mx-auto h-[600px] w-full max-w-[820px] animate-pulse rounded-md border border-slate-200 bg-white" />
  );
}
