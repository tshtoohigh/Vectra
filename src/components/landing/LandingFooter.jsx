import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ui/index.js';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '#features' },
      { label: 'How it works', href: '#how-it-works' },
      { label: 'AI planning', href: '#ai' },
      { label: 'Live demo', to: '/app' },
    ],
  },
  {
    title: 'Technical',
    links: [
      { label: 'Architecture', href: '#architecture' },
      { label: 'Priority algorithm', href: '#features' },
      { label: 'FAQ', href: '#faq' },
    ],
  },
  {
    title: 'Account',
    links: [
      { label: 'Log in', to: '/login' },
      { label: 'Create account', to: '/login' },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-page py-12">
        <div className="grid gap-10 lg:grid-cols-5">
          {/* Brand */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
                <Icon.Logo className="h-5 w-5" strokeWidth={2} />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
                PolyTrack
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              Academic deadline tracking and workload prioritisation for polytechnic and university
              students.
            </p>
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
              <Icon.Cloud className="h-3.5 w-3.5 text-slate-400" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Running on AWS serverless
              </span>
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                {col.title}
              </h3>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.to ? (
                      <Link
                        to={l.to}
                        className="text-sm text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                      >
                        {l.label}
                      </Link>
                    ) : (
                      <a
                        href={l.href}
                        className="text-sm text-slate-600 transition-colors hover:text-brand-600 dark:text-slate-400 dark:hover:text-brand-400"
                      >
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-6 sm:flex-row dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-500">
            © {new Date().getFullYear()} PolyTrack. Built for students.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-600">
            Cognito · API Gateway · Lambda · DynamoDB · Bedrock · Textract · EventBridge · SNS
          </p>
        </div>
      </div>
    </footer>
  );
}
