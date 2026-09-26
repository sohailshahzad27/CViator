// frontend/components/ui/Field.js
// Form controls. Every input in the product goes through these so labels,
// focus rings, error states, hints and counters stay identical everywhere.

import { forwardRef, useId } from 'react';
import { cn } from '../../utils/cn';

const CONTROL =
  'w-full rounded-md border bg-surface text-sm text-ink transition-[border-color,box-shadow] duration-150 ' +
  'placeholder:text-ink-muted/60 ' +
  'focus:outline-none focus:ring-[3px] focus:ring-accent/15 ' +
  'disabled:cursor-not-allowed disabled:bg-inset disabled:text-ink-muted';

function controlTone(invalid) {
  return invalid
    ? 'border-danger-line focus:border-danger focus:ring-danger/15'
    : 'border-line hover:border-line-strong focus:border-accent';
}

/** Label row with an optional right-hand slot (counter, optional marker). */
export function FieldLabel({ htmlFor, children, aside, className }) {
  if (!children && !aside) return null;
  return (
    <div className={cn('mb-1.5 flex items-baseline justify-between gap-3', className)}>
      {children ? (
        <label htmlFor={htmlFor} className="text-xs font-medium text-ink-soft">
          {children}
        </label>
      ) : (
        <span />
      )}
      {aside}
    </div>
  );
}

function Counter({ value, max }) {
  if (!max) return null;
  const len = (value || '').length;
  const nearLimit = len >= max * 0.9;
  return (
    <span
      className={cn(
        'tnum text-2xs transition-colors',
        len >= max ? 'text-danger' : nearLimit ? 'text-ochre' : 'text-ink-muted/70'
      )}
    >
      {len}/{max}
    </span>
  );
}

function Hint({ id, error, hint }) {
  if (!error && !hint) return null;
  return (
    <p id={id} className={cn('mt-1.5 text-xs', error ? 'text-danger' : 'text-ink-muted')}>
      {error || hint}
    </p>
  );
}

export const TextField = forwardRef(function TextField(
  {
    label,
    value,
    onChange,
    error,
    hint,
    maxLength,
    showCounter = false,
    className,
    inputClassName,
    leading,
    id: idProp,
    ...rest
  },
  ref
) {
  const autoId = useId();
  const id = idProp || autoId;
  const describedBy = error || hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <FieldLabel
        htmlFor={id}
        aside={showCounter ? <Counter value={value} max={maxLength} /> : null}
      >
        {label}
      </FieldLabel>
      <div className="relative">
        {leading && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted"
          >
            {leading}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          value={value ?? ''}
          maxLength={maxLength}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) =>
            onChange?.(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)
          }
          className={cn(
            CONTROL,
            controlTone(error),
            'h-9 px-3',
            leading && 'pl-9',
            inputClassName
          )}
          {...rest}
        />
      </div>
      <Hint id={describedBy} error={error} hint={hint} />
    </div>
  );
});

export const TextArea = forwardRef(function TextArea(
  {
    label,
    value,
    onChange,
    error,
    hint,
    maxLength,
    showCounter = true,
    rows = 3,
    className,
    id: idProp,
    ...rest
  },
  ref
) {
  const autoId = useId();
  const id = idProp || autoId;
  const describedBy = error || hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <FieldLabel
        htmlFor={id}
        aside={showCounter ? <Counter value={value} max={maxLength} /> : null}
      >
        {label}
      </FieldLabel>
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        value={value ?? ''}
        maxLength={maxLength}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(e) =>
          onChange?.(maxLength ? e.target.value.slice(0, maxLength) : e.target.value)
        }
        className={cn(CONTROL, controlTone(error), 'resize-y px-3 py-2 leading-relaxed')}
        {...rest}
      />
      <Hint id={describedBy} error={error} hint={hint} />
    </div>
  );
});

export const SelectField = forwardRef(function SelectField(
  { label, value, onChange, error, hint, placeholder, options = [], className, id: idProp, ...rest },
  ref
) {
  const autoId = useId();
  const id = idProp || autoId;
  const describedBy = error || hint ? `${id}-hint` : undefined;

  return (
    <div className={className}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <select
          ref={ref}
          id={id}
          value={value ?? ''}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          onChange={(e) => onChange?.(e.target.value)}
          className={cn(
            CONTROL,
            controlTone(error),
            'h-9 cursor-pointer appearance-none pl-3 pr-8'
          )}
          {...rest}
        >
          {placeholder !== undefined && <option value="">{placeholder}</option>}
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-muted"
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <Hint id={describedBy} error={error} hint={hint} />
    </div>
  );
});

/** Segmented control — for 2–3 mutually exclusive options. */
export function Segmented({ value, onChange, options = [], size = 'md', className, ariaLabel }) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex shrink-0 items-center gap-0.5 rounded-md border border-line bg-inset p-0.5',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(opt.value)}
            className={cn(
              'rounded font-medium transition-colors duration-150',
              size === 'sm' ? 'px-2 py-1 text-2xs' : 'px-3 py-1.5 text-xs',
              active
                ? 'bg-surface text-ink shadow-[0_1px_2px_rgba(25,24,21,0.08)] ring-1 ring-line'
                : 'text-ink-muted hover:text-ink'
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
