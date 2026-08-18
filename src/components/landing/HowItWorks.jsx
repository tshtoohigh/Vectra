import React from 'react';
import { Icon } from '../ui/index.js';

const STEPS = [
  {
    n: '01',
    Glyph: Icon.Plus,
    title: 'Add your deadlines',
    body: 'Type them in, paste a sentence in plain English, or upload the assignment brief and let Vectra read it.',
    detail: 'Module, type, due date, weighting and rough effort — that is all it needs.',
  },
  {
    n: '02',
    Glyph: Icon.BarChart,
    title: 'See the real picture',
    body: 'Your week gets mapped out hour by hour, so clashes and crunch periods show up early instead of the night before.',
    detail: 'Set your daily study capacity and overloaded days get flagged automatically.',
  },
  {
    n: '03',
    Glyph: Icon.Target,
    title: 'Work the top of the list',
    body: 'One task sits at the top with a clear explanation. Finish a milestone, progress updates, priorities shift.',
    detail: 'Reminders only interrupt you when something is genuinely at risk.',
  },
];

export default function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-16 sm:py-24 dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">How it works</p>
          <h2 className="heading-section mt-2">Set up in under five minutes</h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            No complicated project boards or tagging systems to maintain.
          </p>
        </div>

        <div className="relative mt-14">
          {/* Connector line */}
          <div
            className="absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent lg:block dark:via-slate-700"
            aria-hidden="true"
          />

          <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
            {STEPS.map(({ n, Glyph, title, body, detail }) => (
              <div key={n} className="relative">
                <div className="flex items-center gap-3 lg:flex-col lg:items-start">
                  <span className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-brand-600 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-brand-400">
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
                <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-slate-500 dark:text-slate-500">
                  <Icon.Check
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500"
                    strokeWidth={2.5}
                  />
                  {detail}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
