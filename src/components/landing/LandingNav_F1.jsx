import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Icon, Button } from '../ui/index.js';
import { useTheme } from '../../context/ThemeContext.jsx';

const LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'How it works', href: '#how-it-works' },
  { label: 'FAQ', href: '#faq' },
];

export default function LandingNav_F1() {
  const { isDark, toggleTheme } = useTheme();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={[
        'sticky top-0 z-40 transition-all duration-200',
        scrolled
          ? 'border-b border-slate-200 bg-white/85 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/85'
          : 'border-b border-transparent bg-transparent',
      ].join(' ')}
    >
      <div className="container-page">
        <div className="flex h-16 items-center justify-between gap-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white">
              <Icon.Logo className="h-5 w-5" strokeWidth={2} />
            </span>
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white">
              Vectra
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {isDark ? (
                <Icon.Sun className="h-4.5 w-4.5" />
              ) : (
                <Icon.Moon className="h-4.5 w-4.5" />
              )}
            </button>
            <Button to="/login" variant="ghost" size="md" className="hidden sm:inline-flex">
              Log in
            </Button>
            <Button to="/signup" variant="primary" size="md">
              Sign Up
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
