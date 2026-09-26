// frontend/pages/404.js
// A 404 that belongs to the product rather than Next.js's default.

import Head from 'next/head';
import Link from 'next/link';
import Wordmark from '../components/Wordmark';
import { Button } from '../components/ui';

export default function NotFoundPage() {
  return (
    <>
      <Head>
        <title>Page not found — Cviator</title>
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
      </Head>

      <div className="flex min-h-full flex-col bg-paper">
        <header className="flex h-14 shrink-0 items-center border-b border-line px-5 sm:px-6">
          <Link href="/" className="rounded-sm">
            <Wordmark size="sm" />
          </Link>
        </header>

        <main className="flex flex-1 items-center justify-center px-5 py-16">
          <div className="max-w-md text-center">
            <p className="eyebrow">Error 404</p>
            <h1 className="mt-2 font-display text-[2.25rem] leading-none tracking-tight text-ink">
              This page doesn’t exist
            </h1>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-ink-muted">
              The link may be out of date, or the page may have moved. Your CV and its data are
              unaffected.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              <Link href="/">
                <Button variant="primary">Go to your CV</Button>
              </Link>
              <Link href="/login">
                <Button variant="ghost">Sign in</Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
