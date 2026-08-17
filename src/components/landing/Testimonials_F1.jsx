import React from 'react';
import { Avatar } from '../ui/index.js';

const QUOTES = [
  {
    quote:
      'I used to keep deadlines in three different places and still missed my lab report. Now I open one dashboard and know exactly what to start tonight.',
    name: 'Nurul H.',
    detail: 'Year 2, Engineering with Business',
  },
  {
    quote:
      'The breakdown feature is what I use daily. A 20-hour group project turns into five things I can actually finish instead of one thing I keep avoiding.',
    name: 'Marcus L.',
    detail: 'Year 3, Information Technology',
  },
  {
    quote:
      'Seeing "30% of your grade, 6 hours left, 2 days" in plain language made me finally start assignments early. My grades went up one tier.',
    name: 'Wei Jie T.',
    detail: 'Year 1, Electronic Systems',
  },
];

export default function Testimonials_F1() {
  return (
    <section className="py-16 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="heading-section">What students say</h2>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {QUOTES.map((q) => (
            <figure
              key={q.name}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900"
            >
              <blockquote className="flex-1">
                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  "{q.quote}"
                </p>
              </blockquote>
              <figcaption className="mt-5 flex items-center gap-3 border-t border-slate-100 pt-4 dark:border-slate-800">
                <Avatar name={q.name} size="sm" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">{q.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{q.detail}</p>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
