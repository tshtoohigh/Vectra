import React from 'react';

const COLORS = {
  brand: 'bg-brand-500',
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-emerald-500',
  success: 'bg-emerald-500',
  slate: 'bg-slate-400',
};

export default function Progress({ value = 0, color = 'brand', size = 'md', className = '' }) {
  const heights = { xs: 'h-1', sm: 'h-1.5', md: 'h-2', lg: 'h-2.5' };
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div
      className={[
        'w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800',
        heights[size] || heights.md,
        className,
      ].join(' ')}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ease-out ${COLORS[color] || COLORS.brand}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export function Ring({ value = 0, size = 44, stroke = 4, color = 'brand', label }) {
  const RING_COLORS = {
    brand: 'stroke-brand-500',
    critical: 'stroke-red-500',
    high: 'stroke-amber-500',
    medium: 'stroke-blue-500',
    low: 'stroke-emerald-500',
    success: 'stroke-emerald-500',
  };
  const pct = Math.max(0, Math.min(100, value));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-slate-200 dark:stroke-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${RING_COLORS[color] || RING_COLORS.brand} transition-all duration-500`}
        />
      </svg>
      <span className="absolute text-[10px] font-bold text-slate-700 dark:text-slate-200">
        {label ?? `${Math.round(pct)}%`}
      </span>
    </div>
  );
}
