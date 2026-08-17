import React from 'react';

const TONES = {
  neutral:
    'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  brand:
    'bg-brand-50 text-brand-700 border-brand-200 dark:bg-brand-500/10 dark:text-brand-300 dark:border-brand-500/25',
  critical:
    'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/25',
  high: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/25',
  medium:
    'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/25',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25',
  violet:
    'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/25',
  success:
    'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/25',
};

const SIZES = {
  xs: 'px-1.5 py-0.5 text-[10px] gap-1',
  sm: 'px-2 py-0.5 text-xs gap-1',
  md: 'px-2.5 py-1 text-xs gap-1.5',
};

export default function Badge({
  tone = 'neutral',
  size = 'sm',
  className = '',
  dot = false,
  children,
  ...rest
}) {
  const DOT_COLORS = {
    critical: 'bg-red-500',
    high: 'bg-amber-500',
    medium: 'bg-blue-500',
    low: 'bg-emerald-500',
    brand: 'bg-brand-500',
    violet: 'bg-violet-500',
    success: 'bg-emerald-500',
    neutral: 'bg-slate-400',
  };

  return (
    <span
      className={[
        'inline-flex items-center rounded-md border font-semibold',
        TONES[tone] || TONES.neutral,
        SIZES[size] || SIZES.sm,
        className,
      ].join(' ')}
      {...rest}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_COLORS[tone] || DOT_COLORS.neutral}`}
        />
      )}
      {children}
    </span>
  );
}

/** Small "powered by AWS <service>" attribution chip used beside AI features. */
export function AwsChip({ service, className = '' }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5',
        'text-[10px] font-semibold uppercase tracking-wide text-slate-500',
        'dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400',
        className,
      ].join(' ')}
      title={`Powered by Amazon ${service}`}
    >
      {service}
    </span>
  );
}
