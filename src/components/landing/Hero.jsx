import React from 'react';
import { Icon, Button } from '../ui/index.js';
import ProductMockup from './ProductMockup.jsx';

export default function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 grid-pattern mask-fade-b" />
        <div className="absolute -top-32 left-1/2 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-brand-100/50 blur-3xl dark:bg-brand-500/10" />
      </div>

      <div className="container-page pb-12 pt-14 sm:pb-16 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          {/* Announcement pill */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-500/15">
              <Icon.Sparkles className="h-2.5 w-2.5 text-violet-600 dark:text-violet-400" />
            </span>
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              AI study planning, built on Amazon Bedrock
            </span>
          </div>

          <h1 className="heading-hero">
            Know exactly what to
            <br className="hidden sm:block" /> work on{' '}
            <span className="relative whitespace-nowrap">
              <span className="relative z-10 text-brand-600 dark:text-brand-400">next</span>
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

          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg dark:text-slate-400">
            PolyTrack keeps every assignment, test and project deadline in one place — then works
            out what actually deserves your attention tonight, based on grade weight, effort left
            and how packed your week already is.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button to="/app" variant="primary" size="xl" className="w-full sm:w-auto">
              Try the live demo
              <Icon.ArrowRight className="h-4 w-4" />
            </Button>
            <Button to="/login" variant="secondary" size="xl" className="w-full sm:w-auto">
              Create free account
            </Button>
          </div>

          <p className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-slate-500 dark:text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <Icon.Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
              No credit card
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon.Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
              Demo loads with sample data
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Icon.Check className="h-3.5 w-3.5 text-emerald-500" strokeWidth={2.5} />
              Free for students
            </span>
          </p>
        </div>

        {/* Product shot */}
        <div className="relative mx-auto mt-12 max-w-5xl sm:mt-16">
          <ProductMockup />
        </div>
      </div>
    </section>
  );
}
