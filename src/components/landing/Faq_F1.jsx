import React, { useState } from 'react';
import { Icon } from '../ui/index.js';

const ITEMS = [
  {
    q: 'Is this free for students?',
    a: 'Yes. J.A.R.V.I.S. Academic is completely free to use. Sign up with your student email and start adding deadlines immediately.',
  },
  {
    q: 'How does it handle group projects?',
    a: 'You can flag any task as group work. It is tracked separately so you know which deadlines depend on teammates and can plan around them.',
  },
  {
    q: 'What if I enter a deadline wrong?',
    a: 'Every task is fully editable at any time. Change the due date, weighting, or effort estimate and priorities recalculate instantly.',
  },
  {
    q: 'Will it send me too many notifications?',
    a: 'Reminders only trigger when something is genuinely at risk — heavily weighted, close to due, and behind on progress. You can also set quiet hours.',
  },
];

export default function Faq_F1() {
  const [open, setOpen] = useState(0);

  return (
    <section
      id="faq"
      className="scroll-mt-20 border-t border-slate-200 py-16 sm:py-24 dark:border-slate-800"
    >
      <div className="container-narrow">
        <div className="text-center">
          <h2 className="heading-section">Frequently asked questions</h2>
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
