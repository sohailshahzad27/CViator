// frontend/components/Wordmark.js
// Product lockup. A serif "C" seal plus the name in the display face —
// the one place the brand is stated, reused by every shell.

import { cn } from '../utils/cn';

export default function Wordmark({ context, size = 'md', inverted = false, className }) {
  const seal = size === 'sm' ? 'h-6 w-6 text-[13px]' : 'h-7 w-7 text-[15px]';
  const name = size === 'sm' ? 'text-[15px]' : 'text-[17px]';

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5', className)}>
      <span
        aria-hidden
        className={cn(
          'grid shrink-0 place-items-center rounded font-display leading-none',
          seal,
          inverted ? 'bg-paper text-ink' : 'bg-ink text-paper'
        )}
      >
        C
      </span>
      <span className="flex min-w-0 items-baseline gap-2">
        <span
          className={cn(
            'font-display leading-none tracking-tight',
            name,
            inverted ? 'text-paper' : 'text-ink'
          )}
        >
          Cviator
        </span>
        {context && (
          // Hidden on phones — it would truncate to noise next to the actions.
          <>
            <span
              aria-hidden
              className={cn('hidden h-3 w-px shrink-0 sm:block', inverted ? 'bg-paper/30' : 'bg-line-strong')}
            />
            <span
              className={cn(
                'hidden truncate text-2xs font-semibold uppercase tracking-[0.14em] sm:block',
                inverted ? 'text-paper/70' : 'text-ink-muted'
              )}
            >
              {context}
            </span>
          </>
        )}
      </span>
    </div>
  );
}
