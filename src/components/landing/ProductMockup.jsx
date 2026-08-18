import React from 'react';
import { Icon } from '../ui/index.js';

/**
 * Static, non-interactive representation of the Vectra dashboard.
 * Used inside the hero so visitors see the real product shape immediately.
 */

const NAV = [
  { label: 'Dashboard', Glyph: Icon.Dashboard, active: true },
  { label: 'Calendar', Glyph: Icon.Calendar },
  { label: 'Tasks', Glyph: Icon.CheckSquare },
  { label: 'Modules', Glyph: Icon.BookOpen },
];

const TASKS = [
  {
    title: 'Lab 4 Report — PWM Motor Control',
    module: 'ET0421',
    due: 'In 2 days',
    weight: '20%',
    progress: 25,
    tone: 'critical',
    label: 'Critical',
  },
  {
    title: 'Mid-Semester Practical Test',
    module: 'IT2154',
    due: 'In 3 days',
    weight: '30%',
    progress: 40,
    tone: 'high',
    label: 'High',
  },
  {
    title: 'Assignment 3 — Graph Traversal',
    module: 'CS2043',
    due: 'In 4 days',
    weight: '15%',
    progress: 0,
    tone: 'medium',
    label: 'Medium',
  },
];

const TONE_STYLES = {
  critical: {
    pill: 'bg-red-50 text-red-700 border-red-200',
    bar: 'bg-red-500',
    dot: 'bg-red-500',
  },
  high: {
    pill: 'bg-amber-50 text-amber-800 border-amber-200',
    bar: 'bg-amber-500',
    dot: 'bg-amber-500',
  },
  medium: {
    pill: 'bg-blue-50 text-blue-700 border-blue-200',
    bar: 'bg-blue-500',
    dot: 'bg-blue-500',
  },
};

const WORKLOAD = [
  { day: 'Mon', hours: 2.5, over: false },
  { day: 'Tue', hours: 3, over: false },
  { day: 'Wed', hours: 9.5, over: true },
  { day: 'Thu', hours: 4, over: false },
  { day: 'Fri', hours: 6.5, over: true },
  { day: 'Sat', hours: 1.5, over: false },
  { day: 'Sun', hours: 0, over: false },
];

export default function ProductMockup() {
  const maxHours = 10;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift dark:border-slate-800 dark:bg-slate-900">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3.5 py-2.5 dark:border-slate-800 dark:bg-slate-900/80">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="ml-2 flex-1">
          <div className="mx-auto w-fit rounded-md border border-slate-200 bg-white px-2.5 py-0.5 text-[10px] font-medium text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
            app.vectra.io/dashboard
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-40 shrink-0 border-r border-slate-200 bg-slate-50/60 p-2.5 sm:block dark:border-slate-800 dark:bg-slate-900/40">
          <div className="mb-3 flex items-center gap-2 px-1.5 py-1">
            <span className="flex h-5 w-5 items-center justify-center rounded bg-brand-600 text-white">
              <Icon.Logo className="h-3.5 w-3.5" strokeWidth={2.25} />
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-white">Vectra</span>
          </div>
          <div className="space-y-0.5">
            {NAV.map(({ label, Glyph, active }) => (
              <div
                key={label}
                className={[
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium',
                  active
                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300'
                    : 'text-slate-500 dark:text-slate-400',
                ].join(' ')}
              >
                <Glyph className="h-3.5 w-3.5" />
                {label}
              </div>
            ))}
          </div>
        </aside>

        {/* Main panel */}
        <div className="min-w-0 flex-1 space-y-3 bg-white p-3.5 dark:bg-slate-950/40">
          {/* Focus card */}
          <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 dark:border-red-500/25 dark:bg-red-500/5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Icon.Target className="h-3 w-3 text-red-600 dark:text-red-400" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-red-700 dark:text-red-400">
                Work on this next
              </span>
            </div>
            <p className="text-[13px] font-bold leading-snug text-slate-900 dark:text-white">
              Lab 4 Report — PWM Motor Control
            </p>
            <div className="mt-2 flex items-start gap-1.5 rounded-md border border-slate-200 bg-white/70 p-2 dark:border-slate-700 dark:bg-slate-900/60">
              <Icon.Sparkles className="mt-px h-3 w-3 shrink-0 text-violet-500" />
              <p className="text-[10px] leading-relaxed text-slate-600 dark:text-slate-400">
                20% of your grade, due in 2 days, and 6 hours of work left — start with the
                methodology section tonight.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Active', value: '6' },
              { label: 'Due soon', value: '3' },
              { label: 'This week', value: '27h' },
              { label: 'Done', value: '2' },
            ].map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-800 dark:bg-slate-900"
              >
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-400">
                  {s.label}
                </p>
                <p className="mt-0.5 text-sm font-extrabold text-slate-900 dark:text-white">
                  {s.value}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-3 lg:grid-cols-5">
            {/* Task list */}
            <div className="space-y-2 lg:col-span-3">
              {TASKS.map((t) => {
                const tone = TONE_STYLES[t.tone];
                return (
                  <div
                    key={t.title}
                    className="rounded-lg border border-slate-200 bg-white p-2.5 dark:border-slate-800 dark:bg-slate-900"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-1.5">
                          <span
                            className={`rounded border px-1 py-px text-[8px] font-bold uppercase dark:bg-transparent ${tone.pill}`}
                          >
                            {t.label}
                          </span>
                          <span className="text-[9px] font-medium text-slate-400">{t.module}</span>
                        </div>
                        <p className="truncate text-[11px] font-semibold text-slate-900 dark:text-white">
                          {t.title}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300">
                          {t.due}
                        </p>
                        <p className="text-[9px] text-slate-400">{t.weight} weight</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                        <div
                          className={`h-full rounded-full ${tone.bar}`}
                          style={{ width: `${t.progress}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-semibold text-slate-400">{t.progress}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Workload */}
            <div className="rounded-lg border border-slate-200 bg-white p-2.5 lg:col-span-2 dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[10px] font-bold text-slate-900 dark:text-white">This week</p>
                <span className="rounded border border-amber-200 bg-amber-50 px-1 py-px text-[8px] font-bold text-amber-700 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-400">
                  2 heavy days
                </span>
              </div>
              <div className="space-y-1.5">
                {WORKLOAD.map((d) => (
                  <div key={d.day} className="flex items-center gap-1.5">
                    <span className="w-6 text-[8px] font-medium text-slate-400">{d.day}</span>
                    <div className="relative h-2 flex-1 overflow-hidden rounded-sm bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-sm ${d.over ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{ width: `${(d.hours / maxHours) * 100}%` }}
                      />
                      <span
                        className="absolute top-0 h-full w-px bg-slate-400/50"
                        style={{ left: '40%' }}
                      />
                    </div>
                    <span
                      className={`w-5 text-right text-[8px] font-semibold ${d.over ? 'text-red-500' : 'text-slate-400'}`}
                    >
                      {d.hours ? `${d.hours}h` : '—'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-2 border-t border-slate-100 pt-2 text-[8px] text-slate-400 dark:border-slate-800">
                Line marks your 4h/day limit
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
