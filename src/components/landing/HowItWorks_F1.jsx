import React from 'react';
import { Icon } from '../ui/index.js';

const STEPS = [
  {
    n: '01',
    Glyph: Icon.Plus,
    title: 'Capture',
    body: 'Drop in assignments via quick text entry or upload your syllabus PDF. Vectra reads it for you.',
  },
  {
    n: '02',
    Glyph: Icon.BarChart,
    title: 'Balance',
    body: 'Vectra maps every task against your daily study hours and flags overloaded days automatically.',
  },
  {
    n: '03',
    Glyph: Icon.Target,
    title: 'Execute',
    body: 'Use Focus Mode to tackle the single highest priority item with zero distractions until it is done.',
  },
];

export default function HowItWorks_F1() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-24 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-section">Three steps to a stress-free semester</h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            No complicated boards or tagging systems. Just add, balance, and execute.
          </p>
        </div>

        <div className="mt-14 grid gap-8 lg:grid-cols-3 lg:gap-6">
          {STEPS.map(({ n, Glyph, title, body }) => (
            <div key={n}>
              <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-brand-400">
                  <Glyph className="h-5 w-5" />
                </span>
                <span className="text-xs font-extrabold tracking-widest text-slate-300 lg:mt-4 dark:text-slate-600">
                  STEP {n}
                </span>
              </div>
              <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
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
