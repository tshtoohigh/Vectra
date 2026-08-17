import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ui/index.js';

export default function StatCards({ stats }) {
  const cards = [
    {
      label: 'Active tasks',
      value: stats.active,
      Glyph: Icon.CheckSquare,
      tone: 'text-slate-600 bg-slate-100 dark:text-slate-300 dark:bg-slate-800',
      to: '/app/tasks',
      caption: stats.active === 0 ? 'All clear' : 'Still to do',
    },
    {
      label: 'Due soon',
      value: stats.overdue + stats.dueSoon,
      Glyph: Icon.Clock,
      tone:
        stats.overdue > 0
          ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10'
          : 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10',
      to: '/app/tasks',
      caption: stats.overdue > 0 ? `${stats.overdue} overdue` : 'Next 3 days',
      emphasis: stats.overdue > 0,
    },
    {
      label: 'Hours this week',
      value: `${stats.hoursThisWeek}h`,
      Glyph: Icon.Timer,
      tone: 'text-brand-600 bg-brand-50 dark:text-brand-400 dark:bg-brand-500/10',
      to: '/app/calendar',
      caption: 'Work remaining',
    },
    {
      label: 'Completed',
      value: stats.completed,
      Glyph: Icon.CircleCheck,
      tone: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10',
      to: '/app/tasks',
      caption: 'This semester',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ label, value, Glyph, tone, to, caption, emphasis }) => (
        <Link
          key={label}
          to={to}
          className={[
            'group rounded-xl border bg-white p-4 transition-all duration-200 hover:shadow-card-hover',
            emphasis
              ? 'border-red-200 dark:border-red-500/25'
              : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700',
            'dark:bg-slate-900',
          ].join(' ')}
        >
          <div className="flex items-start justify-between">
            <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}>
              <Glyph className="h-4 w-4" />
            </span>
            <Icon.ArrowUpRight className="h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600" />
          </div>

          <p className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {value}
          </p>
          <p className="mt-0.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-500">{caption}</p>
        </Link>
      ))}
    </div>
  );
}
