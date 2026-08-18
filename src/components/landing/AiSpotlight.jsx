import React from 'react';
import { Icon, AwsChip } from '../ui/index.js';

const CAPABILITIES = [
  {
    title: 'Parses how you actually talk',
    body: 'Paste a sentence from a lecture slide or group chat. Bedrock extracts the module, type, deadline, weighting and effort — you just confirm.',
  },
  {
    title: 'Breaks work into milestones',
    body: 'Large projects are split into 3–5 sequenced steps with their own deadlines, so starting never feels like staring at a wall.',
  },
  {
    title: 'Rebalances a packed week',
    body: 'When a day goes over capacity, you get a concrete plan for shifting prep work earlier — not just a warning that you are busy.',
  },
];

export default function AiSpotlight() {
  return (
    <section
      id="ai"
      className="scroll-mt-20 border-y border-slate-200 bg-slate-50 py-16 sm:py-24 dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="container-page">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div>
            <div className="mb-4 inline-flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-violet-100 dark:bg-violet-500/15">
                <Icon.Sparkles className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </span>
              <p className="eyebrow !text-violet-600 dark:!text-violet-400">AI planning</p>
              <AwsChip service="Bedrock" />
            </div>

            <h2 className="heading-section">
              Recommendations you can argue with — because you can see the reasoning
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 dark:text-slate-400">
              Vectra never just says “do this next”. Every suggestion cites the numbers behind
              it: how much the task is worth, how many hours are left, and what else is competing
              for the same evening.
            </p>

            <div className="mt-8 space-y-5">
              {CAPABILITIES.map((c) => (
                <div key={c.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-white text-violet-600 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:text-violet-400 dark:ring-slate-700">
                    <Icon.Check className="h-3.5 w-3.5" strokeWidth={2.75} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {c.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Demo panel */}
          <div className="space-y-3">
            {/* Input */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <p className="label mb-2">You type</p>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-950/60">
                <p className="font-mono text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                  web dev assignment worth 30% due next wednesday 11:59pm, probably 8 hours of work
                </p>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex items-center justify-center gap-2 py-0.5">
              <span className="h-px w-10 bg-slate-300 dark:bg-slate-700" />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300">
                <Icon.Sparkles className="h-3 w-3" />
                Bedrock
              </span>
              <span className="h-px w-10 bg-slate-300 dark:bg-slate-700" />
            </div>

            {/* Output */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card dark:border-slate-800 dark:bg-slate-900">
              <div className="mb-3 flex items-center justify-between">
                <p className="label">Vectra creates</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                  <Icon.CircleCheck className="h-3.5 w-3.5" />
                  92% confidence
                </span>
              </div>

              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  ['Title', 'Web Development Assignment'],
                  ['Module', 'IT2154'],
                  ['Type', 'Assignment'],
                  ['Due', 'Wed, 11:59 PM'],
                  ['Weighting', '30%'],
                  ['Effort', '8 hours'],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between py-2">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{k}</dt>
                    <dd className="text-xs font-semibold text-slate-900 dark:text-white">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 flex items-start gap-2 rounded-lg border border-violet-200 bg-violet-50/60 p-2.5 dark:border-violet-500/20 dark:bg-violet-500/5">
                <Icon.Bot className="mt-px h-3.5 w-3.5 shrink-0 text-violet-600 dark:text-violet-400" />
                <p className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                  Ranked <strong>Critical</strong> — 30% weighting with 8 hours of work and only 3
                  evenings free before it clashes with your ET0421 lab report.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
