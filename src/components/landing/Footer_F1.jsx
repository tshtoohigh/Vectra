import React from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../ui/index.js';

export default function Footer_F1() {
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="container-page py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.Logo className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">
              Vectra
            </span>
          </div>

          <div className="flex items-center gap-5 text-xs text-slate-500 dark:text-slate-400">
            <a
              href="#features"
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Features
            </a>
            <a
              href="#faq"
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              FAQ
            </a>
            <Link
              to="/login"
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Log in
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <a
              href="#"
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Privacy
            </a>
            <a
              href="#"
              className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Terms
            </a>
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-600">
            &copy; {new Date().getFullYear()} Vectra. Built for students.
          </p>
        </div>
      </div>
    </footer>
  );
}
