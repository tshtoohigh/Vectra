import React from 'react';

const INSTITUTIONS = [
  'Nanyang Polytechnic',
  'Singapore Polytechnic',
  'Temasek Polytechnic',
  'Ngee Ann Polytechnic',
  'Republic Polytechnic',
];

const STATS = [
  { value: '1,200+', label: 'deadlines tracked' },
  { value: '38%', label: 'fewer late submissions' },
  { value: '4.8/5', label: 'average student rating' },
];

export default function SocialProof() {
  return (
    <section className="border-y border-slate-200 bg-slate-50 py-10 dark:border-slate-800 dark:bg-slate-900/40">
      <div className="container-page">
        <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Built for students across
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
          {INSTITUTIONS.map((name) => (
            <span
              key={name}
              className="text-sm font-bold text-slate-400 transition-colors hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-400"
            >
              {name}
            </span>
          ))}
        </div>

        <div className="mx-auto mt-10 grid max-w-2xl grid-cols-1 gap-6 border-t border-slate-200 pt-8 sm:grid-cols-3 dark:border-slate-800">
          {STATS.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                {s.value}
              </p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
