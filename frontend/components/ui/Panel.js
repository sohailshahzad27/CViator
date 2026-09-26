// frontend/components/ui/Panel.js
// Containers and page structure. Panels are defined by hairlines and
// whitespace rather than shadows, so a screen full of them still reads as
// one document instead of a pile of floating cards.

import { cn } from '../../utils/cn';

export function Panel({ as: Tag = 'section', className, children, ...rest }) {
  return (
    <Tag
      className={cn('rounded-lg border border-line bg-surface', className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/** Header row inside a Panel: title on the left, actions on the right. */
export function PanelHeader({ title, description, actions, className, id }) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3 sm:px-5',
        className
      )}
    >
      <div className="min-w-0">
        <h2 id={id} className="text-sm font-semibold tracking-tight text-ink">
          {title}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Page title block. `eyebrow` names the context (which part of the product
 * you are in), the serif title carries the weight.
 */
export function PageHeader({ eyebrow, title, description, actions, className }) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1 className="mt-1.5 font-display text-[1.75rem] leading-none tracking-tight text-ink sm:text-[2rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-muted">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * A single figure in the stat strip. Rendered as a cell in a bordered grid
 * (see StatStrip) rather than its own floating card.
 */
export function StatTile({ label, value, sub, meter, tone = 'default' }) {
  return (
    <div className="px-4 py-3.5 sm:px-5">
      <p className="text-2xs font-medium uppercase tracking-[0.12em] text-ink-muted">{label}</p>
      <p
        className={cn(
          'tnum mt-1.5 font-display text-[1.6rem] leading-none',
          tone === 'attention' ? 'text-ochre' : 'text-ink'
        )}
      >
        {value}
      </p>
      {meter !== undefined && meter !== null && <Meter value={meter} className="mt-2.5" />}
      {sub && <p className="mt-1.5 text-xs text-ink-muted">{sub}</p>}
    </div>
  );
}

/** Horizontal strip of figures, separated by hairlines. */
export function StatStrip({ children, className }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 divide-line overflow-hidden rounded-lg border border-line bg-surface',
        'sm:grid-cols-4 sm:divide-x [&>*:nth-child(-n+2)]:border-b [&>*:nth-child(-n+2)]:border-line',
        'sm:[&>*]:border-b-0',
        '[&>*:nth-child(odd)]:border-r [&>*:nth-child(odd)]:border-line sm:[&>*:nth-child(odd)]:border-r-0',
        className
      )}
    >
      {children}
    </div>
  );
}

/** Thin progress bar. `value` is 0–100. */
export function Meter({ value = 0, className, tone = 'accent' }) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div
      className={cn('h-1 w-full overflow-hidden rounded-full bg-line/70', className)}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-snap',
          tone === 'ochre' ? 'bg-ochre' : 'bg-accent'
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
