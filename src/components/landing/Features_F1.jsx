import React from 'react';
import { Icon } from '../ui/index.js';

const FEATURES = [
  {
    Glyph: Icon.Target,
    title: 'Dynamic Priority Engine',
    body: 'Surfaces high-risk deadlines automatically based on grade impact, time remaining, and how much work is still outstanding.',
    accent: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10',
  },
  {
    Glyph: Icon.Layers,
    title: 'Task Breakdown Engine',
    body: 'Breaks multi-week assignments into bite-sized daily milestones with their own mini-deadlines you can tick off as you go.',
    accent: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10',
  },
  {
    Glyph: Icon.BarChart,
    title: 'Workload Capacity Heatmap',
    body: 'Highlights heavy 10+ hour overload days before they cause burnout. See scheduled hours mapped against your real availability.',
    accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
  },
  {
    Glyph: Icon.FileText,
    title: 'Assignment Brief Parser',
    body: 'Upload PDF or image rubrics and Vectra extracts deadlines, module codes, and grade weightages automatically.',
    accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  },
];

export default function Features_F1() {
  return (
    <section id="features" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-section">Four engines working for you</h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Each one tackles a different part of academic overload so you never have to figure it
            out alone.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ Glyph, title, body, accent }) => (
            <div
              key={title}
              className="rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div
                className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}
              >
                <Glyph className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                {body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
