// frontend/components/AppShell.js
// The signed-in frame: one sticky top bar, one content column. Both the
// builder and the admin dashboard use it so they read as the same product.

import { useEffect, useRef, useState } from 'react';
import Head from 'next/head';
import { cn } from '../utils/cn';
import { getInitials } from '../utils/resume';
import Wordmark from './Wordmark';
import { Badge } from './ui';

/** Avatar + dropdown. Closes on outside click, Escape, or route action. */
function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!user) return null;

  const label = user.fullName || user.email || 'Account';

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${label}`}
        className={cn(
          'flex h-8 items-center gap-2 rounded-md border border-line bg-surface pl-1 pr-2 transition-colors',
          'hover:border-line-strong hover:bg-inset',
          open && 'border-line-strong bg-inset'
        )}
      >
        <span
          aria-hidden
          className="grid h-6 w-6 shrink-0 place-items-center rounded bg-accent-soft text-2xs font-semibold text-accent-ink"
        >
          {getInitials(label)}
        </span>
        <svg viewBox="0 0 16 16" aria-hidden className="h-3 w-3 text-ink-muted">
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-40 mt-1.5 w-60 animate-fade-up overflow-hidden rounded-lg border border-line bg-surface shadow-pop"
        >
          <div className="border-b border-line px-3.5 py-3">
            {user.fullName && (
              <p className="truncate text-sm font-medium text-ink">{user.fullName}</p>
            )}
            <p className="mt-0.5 truncate text-xs text-ink-muted">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {user.isRootAdmin ? (
                <Badge tone="ochre">Root admin</Badge>
              ) : user.isAdmin ? (
                <Badge tone="accent">Admin</Badge>
              ) : (
                <Badge tone="neutral">Student</Badge>
              )}
              {user.regNo && <span className="ident text-2xs text-ink-muted">{user.regNo}</span>}
            </div>
          </div>
          <button
            type="button"
            role="menuitem"
            onMouseDown={(e) => {
              e.preventDefault();
              setOpen(false);
              onLogout?.();
            }}
            className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-sm text-ink-soft transition-colors hover:bg-inset hover:text-ink"
          >
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M15 17l5-5-5-5M20 12H9M12 20H6a2 2 0 01-2-2V6a2 2 0 012-2h6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export default function AppShell({
  title,
  context,
  user,
  onLogout,
  toolbar,
  children,
  width = 'default',
  bare = false,
}) {
  return (
    <>
      {title && (
        <Head>
          <title>{`${title} — Cviator`}</title>
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        </Head>
      )}

      <div className="flex min-h-full flex-col bg-paper">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/85 backdrop-blur-md">
          <div
            className={cn(
              'mx-auto flex h-14 items-center gap-3 px-4 sm:px-6',
              width === 'wide' ? 'max-w-[1500px]' : 'max-w-[1200px]'
            )}
          >
            <Wordmark context={context} />
            {toolbar && (
              <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">{toolbar}</div>
            )}
            <div className={cn(toolbar ? '' : 'ml-auto')}>
              <UserMenu user={user} onLogout={onLogout} />
            </div>
          </div>
        </header>

        {bare ? (
          children
        ) : (
          <main
            className={cn(
              'mx-auto w-full flex-1 px-4 py-7 sm:px-6 sm:py-9',
              width === 'wide' ? 'max-w-[1500px]' : 'max-w-[1200px]'
            )}
          >
            {children}
          </main>
        )}
      </div>
    </>
  );
}
