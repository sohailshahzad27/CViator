// frontend/components/ui/Feedback.js
// Badges, inline messages, empty states and loading placeholders — the
// states a screen spends most of its life in, so they get real designs.

import { cn } from '../../utils/cn';

const BADGE_TONES = {
  neutral:   'border-line bg-inset text-ink-soft',
  accent:    'border-accent/20 bg-accent-soft text-accent-ink',
  solid:     'border-transparent bg-accent text-white',
  ochre:     'border-ochre-line bg-ochre-soft text-ochre',
  danger:    'border-danger-line bg-danger-soft text-danger',
  outline:   'border-line-strong bg-transparent text-ink-muted',
};

export function Badge({ tone = 'neutral', className, children, ...rest }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-2xs font-semibold tracking-wide',
        BADGE_TONES[tone] || BADGE_TONES.neutral,
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
}

const DOT_TONES = {
  done:    'bg-accent',
  pending: 'bg-ochre',
  empty:   'bg-line-strong',
  danger:  'bg-danger',
};

/** Small status dot + label. Used in tables where a badge would be noisy. */
export function StatusDot({ tone = 'empty', children, className }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-ink-soft', className)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 shrink-0 rounded-full', DOT_TONES[tone])} />
      {children}
    </span>
  );
}

const ALERT_TONES = {
  info:    'border-line bg-inset text-ink-soft',
  success: 'border-accent/25 bg-accent-soft text-accent-ink',
  warning: 'border-ochre-line bg-ochre-soft text-ochre',
  danger:  'border-danger-line bg-danger-soft text-danger',
};

export function Alert({ tone = 'info', title, children, actions, className }) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('rounded-md border px-3.5 py-3 text-sm', ALERT_TONES[tone], className)}
    >
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={cn('text-[0.8125rem] leading-relaxed', title && 'mt-1')}>{children}</div>}
      {actions && <div className="mt-2.5 flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Empty state. The rule-and-mark composition keeps it feeling like part of
 * the product rather than a stock illustration.
 */
export function EmptyState({ title, description, action, icon, className }) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-14 text-center', className)}>
      <div
        aria-hidden
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-inset text-ink-muted"
      >
        {icon || (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M6 3.5h8.5L18 7v13.5H6z" strokeLinejoin="round" />
            <path d="M14 3.5V7h4M9 12h6M9 15.5h4" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-ink-muted">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Spinner({ className, label = 'Loading' }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-line border-t-accent',
        className || 'h-5 w-5'
      )}
    />
  );
}

export function Skeleton({ className }) {
  return (
    <span
      aria-hidden
      className={cn('block animate-pulse rounded bg-line/70', className || 'h-3 w-full')}
    />
  );
}

/** Table-shaped loading placeholder, sized to the real table's rhythm. */
export function TableSkeleton({ rows = 8, className }) {
  const widths = ['w-44', 'w-28', 'w-36', 'w-24', 'w-20'];
  return (
    <div className={cn('divide-y divide-line', className)} aria-hidden>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-4 py-[13px] sm:px-5">
          {widths.map((w, c) => (
            <Skeleton
              key={c}
              className={cn('h-2.5', w, c === 0 ? '' : 'hidden sm:block')}
            />
          ))}
          <Skeleton className="ml-auto hidden h-2.5 w-16 sm:block" />
        </div>
      ))}
    </div>
  );
}
