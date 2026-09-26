// frontend/components/AuthLayout.js
// Shared frame for every unauthenticated screen (sign in, sign up, email
// verification, password reset).
//
// Replaces the old centred card: a two-column split states what the product
// is on the left and keeps the form uncluttered on the right. On small
// screens the left panel collapses to a compact header so the form stays
// above the fold.

import Head from 'next/head';
import Wordmark from './Wordmark';

/** Faint A4 page motif — signals "this produces a printed document". */
function PageMotif() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 210 297"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect x="18" y="14" width="174" height="269" rx="2" fill="none" stroke="currentColor" strokeWidth="0.6" />
      <line x1="34" y1="52" x2="118" y2="52" stroke="currentColor" strokeWidth="2.4" />
      <line x1="34" y1="64" x2="92" y2="64" stroke="currentColor" strokeWidth="0.7" />
      <line x1="34" y1="72" x2="104" y2="72" stroke="currentColor" strokeWidth="0.7" />
      <rect x="150" y="44" width="26" height="32" fill="none" stroke="currentColor" strokeWidth="0.7" />
      <line x1="34" y1="92" x2="176" y2="92" stroke="currentColor" strokeWidth="0.7" />
      {[112, 132, 152, 172, 192, 212, 232].map((y) => (
        <g key={y}>
          <line x1="34" y1={y} x2="66" y2={y} stroke="currentColor" strokeWidth="1.6" />
          <line x1="78" y1={y} x2="176" y2={y} stroke="currentColor" strokeWidth="0.6" />
          <line x1="78" y1={y + 7} x2="158" y2={y + 7} stroke="currentColor" strokeWidth="0.6" />
        </g>
      ))}
      <line x1="72" y1="104" x2="72" y2="248" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  );
}

const FACTS = [
  'The official institute CV format, enforced automatically.',
  'Live A4 preview — what you see is exactly what prints.',
  'Export a single-page PDF whenever you need it.',
];

export default function AuthLayout({ title, pageTitle, subtitle, children, footer }) {
  return (
    <>
      <Head>
        <title>{`${pageTitle || title} — Cviator`}</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <div className="flex min-h-full flex-col lg:grid lg:min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        {/* ── Left: product framing ─────────────────────────────── */}
        <aside className="relative hidden overflow-hidden bg-ink px-10 py-12 lg:flex lg:flex-col xl:px-14">
          <div className="pointer-events-none absolute -right-24 top-1/2 h-[125%] w-[85%] -translate-y-1/2 text-paper/[0.07]">
            <PageMotif />
          </div>

          <Wordmark inverted />

          <div className="relative mt-auto max-w-md">
            <p className="text-2xs font-semibold uppercase tracking-[0.16em] text-paper/45">
              GIKI · Career Services
            </p>
            <h2 className="mt-4 font-display text-[2.4rem] leading-[1.08] tracking-tight text-paper">
              One CV format,
              <br />
              every student,
              <br />
              print-ready.
            </h2>
            <ul className="mt-8 space-y-3">
              {FACTS.map((fact) => (
                <li key={fact} className="flex items-start gap-3 text-sm leading-relaxed text-paper/65">
                  <span aria-hidden className="mt-2 h-px w-4 shrink-0 bg-paper/30" />
                  {fact}
                </li>
              ))}
            </ul>
          </div>

          <p className="relative mt-12 text-2xs text-paper/35">
            Ghulam Ishaq Khan Institute of Engineering Sciences and Technology
          </p>
        </aside>

        {/* ── Right: the form ───────────────────────────────────── */}
        <div className="flex flex-1 flex-col bg-paper">
          <header className="flex h-14 shrink-0 items-center border-b border-line px-5 lg:hidden">
            <Wordmark size="sm" />
          </header>

          <main className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8">
            <div className="w-full max-w-[26rem]">
              <h1 className="font-display text-[2rem] leading-none tracking-tight text-ink">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">{subtitle}</p>
              )}
              <div className="mt-7">{children}</div>
              {footer && <div className="mt-7 border-t border-line pt-5">{footer}</div>}
            </div>
          </main>
        </div>
      </div>
    </>
  );
}
