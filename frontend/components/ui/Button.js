// frontend/components/ui/Button.js
// One button component for the whole product, so every action looks and
// behaves the same. Variants map to intent, not to decoration.

import { forwardRef } from 'react';
import { cn } from '../../utils/cn';

const BASE =
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium ' +
  'transition-[background-color,border-color,color,box-shadow] duration-150 ease-snap ' +
  'disabled:cursor-not-allowed disabled:opacity-55';

const VARIANTS = {
  // Primary action on a screen. There should usually be exactly one.
  primary:
    'bg-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] ' +
    'hover:bg-accent-hover active:bg-accent-ink',
  // Default action: sits on paper or surface.
  secondary:
    'border border-line bg-surface text-ink hover:border-line-strong hover:bg-inset active:bg-line/40',
  // Low-emphasis action inside dense UI (table rows, toolbars).
  ghost:
    'text-ink-soft hover:bg-ink/[0.05] hover:text-ink active:bg-ink/[0.08]',
  // Destructive.
  danger:
    'border border-danger-line bg-danger-soft text-danger hover:bg-danger hover:text-white hover:border-danger',
  // Looks like a link but behaves like a button.
  link:
    'text-accent underline decoration-accent/30 underline-offset-2 hover:decoration-accent',
};

const SIZES = {
  sm: 'h-8 px-2.5 text-xs',
  md: 'h-9 px-3.5 text-sm',
  lg: 'h-11 px-5 text-sm',
};

const Button = forwardRef(function Button(
  {
    variant = 'secondary',
    size = 'md',
    className,
    type = 'button',
    loading = false,
    disabled,
    children,
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BASE,
        VARIANTS[variant] || VARIANTS.secondary,
        variant === 'link' ? 'h-auto p-0' : SIZES[size],
        className
      )}
      {...rest}
    >
      {loading && (
        <span
          aria-hidden
          className="h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-[1.5px] border-current/30 border-t-current"
        />
      )}
      {children}
    </button>
  );
});

export default Button;
