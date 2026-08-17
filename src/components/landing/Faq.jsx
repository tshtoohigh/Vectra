import React, { useState } from 'react';
import { Icon } from '../ui/index.js';

const ITEMS = [
  {
    q: 'Do I need an account to try it?',
    a: 'No. The demo opens straight into a dashboard filled with realistic sample deadlines so you can click around everything — adding tasks, AI breakdown, the workload view — before deciding to sign up.',
  },
  {
    q: 'How is the priority score calculated?',
    a: 'It combines four things: how much the task is worth toward your grade, how many hours remain until the deadline, how much effort is still outstanding, and your current progress. The exact reasoning is shown on every task, so it is never a black box.',
  },
  {
    q: 'What if the AI reads my deadline wrongly?',
    a: 'Every extracted field is shown for review before the task is created, and each one is editable. Nothing is saved until you confirm it, and you can edit any task afterwards.',
  },
  {
    q: 'Will it spam me with notifications?',
    a: 'Alerts only trigger when a task is genuinely at risk — heavily weighted, close to due, and low on progress. You can also set quiet hours and choose between push alerts and a single morning digest.',
  },
  {
    q: 'What happens when my availability changes?',
    a: 'Change your daily study hours in settings and the whole workload view recalculates. Days that are now over capacity get flagged, and you can ask for a rebalanced plan.',
  },
  {
    q: 'Is my data private?',
    a: 'Accounts are handled by Amazon Cognito and every record is partitioned per student in DynamoDB, so queries can only ever return your own tasks. Uploaded briefs are processed for extraction and are not shared.',
  },
];

export default function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-narrow">
        <div className="text-center">
          <p className="eyebrow">FAQ</p>
          <h2 className="heading-section mt-2">Questions students ask</h2>
        </div>

        <div className="mt-10 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {ITEMS.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-slate-900 dark:text-white">
                    {item.q}
                  </span>
                  <Icon.ChevronDown
                    className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="animate-fade-in px-5 pb-4 pr-12">
                    <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
                      {item.a}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
