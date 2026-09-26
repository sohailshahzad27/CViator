// frontend/components/SectionNav.js
// Left rail for the builder: how complete the CV is, which sections still
// need attention, and a way to jump straight to one. Long forms are the
// hardest part of this product to navigate — this is the fix.

import { cn } from '../utils/cn';
import { Meter } from './ui';

export default function SectionNav({ sections, onJump, className }) {
  const done = sections.filter((s) => s.done).length;
  const pct = sections.length ? (done / sections.length) * 100 : 0;

  return (
    <nav aria-label="CV sections" className={cn('min-w-0', className)}>
      <div className="rounded-lg border border-line bg-surface px-4 py-4">
        <div className="flex items-baseline justify-between gap-2">
          <p className="eyebrow">Completeness</p>
          <p className="tnum text-xs font-medium text-ink-soft">
            {done}<span className="text-ink-muted">/{sections.length}</span>
          </p>
        </div>
        <Meter value={pct} className="mt-2.5" tone={pct === 100 ? 'accent' : 'ochre'} />
        <p className="mt-2.5 text-xs leading-relaxed text-ink-muted">
          {done === sections.length
            ? 'Every section has content. Review the preview, then export.'
            : `${sections.length - done} section${sections.length - done === 1 ? '' : 's'} still empty.`}
        </p>

        <ul className="mt-4 space-y-0.5 border-t border-line pt-3">
          {sections.map((s) => (
            <li key={s.key}>
              <button
                type="button"
                onClick={() => onJump?.(s.key)}
                className={cn(
                  'group flex w-full items-center gap-2.5 rounded px-1.5 py-1.5 text-left text-[0.8125rem] transition-colors',
                  'hover:bg-inset',
                  s.done ? 'text-ink-soft' : 'text-ink'
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors',
                    s.done
                      ? 'border-accent bg-accent text-white'
                      : 'border-line-strong bg-surface group-hover:border-ink-muted'
                  )}
                >
                  {s.done && (
                    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M2.5 6.2l2.2 2.2 4.8-4.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className="min-w-0 flex-1 truncate">{s.label}</span>
                {!s.done && (
                  <span className="shrink-0 text-2xs font-medium uppercase tracking-wide text-ink-muted/70">
                    empty
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
