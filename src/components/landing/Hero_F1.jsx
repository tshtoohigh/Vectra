import React from 'react';
import { Icon, Button } from '../ui/index.js';

export default function Hero_F1() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-pattern mask-fade-b" />
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-500/10" />
      </div>

      <div className="container-page pb-16 pt-20 sm:pb-24 sm:pt-28">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="heading-hero">
            Know exactly what to
            <br className="hidden sm:block" /> work on{' '}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-brand-600 dark:text-brand-400">tonight</span>
              <svg
                className="absolute -bottom-1 left-0 z-0 h-3 w-full text-brand-200 dark:text-brand-500/30"
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M0 8 Q 25 2, 50 7 T 100 5"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
              </svg>
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
            Vectra unifies your assignments, tests, and group projects into one clear, prioritized
            focus list — so you never waste an evening on the wrong task.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to="/signup" variant="primary" size="xl" className="w-full sm:w-auto">
              Sign Up Free
              <Icon.ArrowRight className="h-4 w-4" />
            </Button>
            <Button to="/login" variant="secondary" size="xl" className="w-full sm:w-auto">
              Log In
            </Button>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="mx-auto mt-14 max-w-4xl">
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lift dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/80">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              <span className="ml-3 flex-1 rounded-md border border-slate-200 bg-white px-3 py-0.5 text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-500">
                app.vectra.study/dashboard
              </span>
            </div>
            <div className="p-5 sm:p-6">
              {/* Focus card */}
              <div className="mb-5 rounded-lg border border-red-200 bg-red-50/60 p-4 dark:border-red-500/20 dark:bg-red-500/5">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="inline-flex items-center rounded-md border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
                        Critical
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        Due in 2 days
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      Web Development — Final Project Submission
                    </p>
                    <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                      IT2154 · 30% of grade · 8h remaining work
                    </p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-white">2d</p>
                    <p className="text-xs text-slate-500">4h left</p>
                  </div>
                </div>
                <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-red-100 dark:bg-red-500/20">
                  <div className="h-full w-[35%] rounded-full bg-red-500 transition-all" />
                </div>
              </div>

              {/* Stats row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { l: 'Active', v: '6', c: 'text-slate-900 dark:text-white' },
                  { l: 'Due soon', v: '3', c: 'text-red-600 dark:text-red-400' },
                  { l: 'This week', v: '24h', c: 'text-amber-600 dark:text-amber-400' },
                  { l: 'Completed', v: '9', c: 'text-emerald-600 dark:text-emerald-400' },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-center dark:border-slate-800 dark:bg-slate-900"
                  >
                    <p className={`text-lg font-extrabold ${s.c}`}>{s.v}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{s.l}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
