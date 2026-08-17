import React from 'react';
import { Icon } from '../ui/index.js';

export default function ProblemSolution_F1() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-16 sm:py-24 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="heading-section">Why a calendar is not enough</h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Traditional tools show you when things are due. Vectra tells you what actually deserves
            your time right now.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Problem */}
          <div className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                <Icon.Calendar className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Traditional Calendars
              </h3>
            </div>
            <ul className="space-y-3">
              {[
                'Treat a 5% tutorial worksheet the same as a 30% project',
                'Show due dates but not how many hours of work are left',
                'Cannot detect when 3 deadlines land in the same 48 hours',
                'No concept of your actual daily study capacity',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Icon.X className="mt-0.5 h-4 w-4 shrink-0 text-red-400" strokeWidth={2.5} />
                  <span className="text-sm text-slate-600 dark:text-slate-400">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Solution */}
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-6 dark:border-brand-500/25 dark:bg-brand-500/5">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                <Icon.Target className="h-4 w-4" />
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vectra</h3>
            </div>
            <ul className="space-y-3">
              {[
                'Weighs every task by grade impact, effort, and time remaining',
                'Shows exactly how many hours are outstanding per deadline',
                'Detects clash weeks and flags overloaded days before they hit',
                'Maps your workload against real daily availability',
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <Icon.Check
                    className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                    strokeWidth={2.5}
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
