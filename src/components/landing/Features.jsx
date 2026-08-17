import React from 'react';
import { Icon } from '../ui/index.js';

const FEATURES = [
  {
    Glyph: Icon.Target,
    title: 'Explainable prioritisation',
    body: 'Every task gets a priority score from grade weight, time left, effort remaining and your progress — and we always show you the reasoning behind it.',
    accent: 'text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10',
  },
  {
    Glyph: Icon.BarChart,
    title: 'Workload heatmap',
    body: 'See scheduled hours per day against how much study time you actually have. Overloaded days are flagged before they wreck your week.',
    accent: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10',
  },
  {
    Glyph: Icon.Sparkles,
    title: 'Natural language entry',
    body: '"Web dev assignment worth 30% due next Wednesday 11:59pm, about 8 hours" becomes a fully structured task with one paste.',
    accent: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10',
  },
  {
    Glyph: Icon.Layers,
    title: 'Automatic breakdown',
    body: 'Turn an intimidating 18-hour project into 5 concrete milestones with their own mini-deadlines, then tick them off as you go.',
    accent: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10',
  },
  {
    Glyph: Icon.Bell,
    title: 'Reminders that adapt',
    body: 'Alerts fire when something is genuinely at risk — heavy weighting, close deadline, low progress — instead of pinging you constantly.',
    accent: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-500/10',
  },
  {
    Glyph: Icon.FileText,
    title: 'Read the brief for you',
    body: 'Upload an assignment brief as PDF or a photo. Module code, due date and weighting are pulled out automatically for you to confirm.',
    accent: 'text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800',
  },
];

export default function Features() {
  return (
    <section id="features" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Features</p>
          <h2 className="heading-section mt-2">Deadline tracking that actually helps you decide</h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            A calendar tells you when things are due. PolyTrack tells you what to do about it.
          </p>
        </div>

        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ Glyph, title, body, accent }) => (
            <div
              key={title}
              className="group rounded-xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
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
