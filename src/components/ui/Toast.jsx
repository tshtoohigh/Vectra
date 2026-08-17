import React from 'react';
import Icon from './Icons.jsx';

const TONES = {
  success: {
    wrap: 'border-emerald-200 bg-white dark:border-emerald-500/25 dark:bg-slate-900',
    iconWrap: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    Glyph: Icon.CircleCheck,
  },
  error: {
    wrap: 'border-red-200 bg-white dark:border-red-500/25 dark:bg-slate-900',
    iconWrap: 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400',
    Glyph: Icon.AlertTriangle,
  },
  warning: {
    wrap: 'border-amber-200 bg-white dark:border-amber-500/25 dark:bg-slate-900',
    iconWrap: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    Glyph: Icon.AlertTriangle,
  },
  info: {
    wrap: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900',
    iconWrap: 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400',
    Glyph: Icon.Info,
  },
  ai: {
    wrap: 'border-violet-200 bg-white dark:border-violet-500/25 dark:bg-slate-900',
    iconWrap: 'bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400',
    Glyph: Icon.Sparkles,
  },
};

export function ToastViewport({ toasts, onDismiss }) {
  if (!toasts?.length) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2 px-4 sm:px-0">
      {toasts.map((t) => {
        const tone = TONES[t.tone] || TONES.info;
        const Glyph = tone.Glyph;
        return (
          <div
            key={t.id}
            className={[
              'pointer-events-auto flex animate-slide-up items-start gap-3 rounded-xl border p-3.5 shadow-lift',
              tone.wrap,
            ].join(' ')}
            role="status"
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${tone.iconWrap}`}
            >
              <Glyph className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              {t.title && (
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{t.title}</p>
              )}
              {t.message && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                  {t.message}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              className="-mr-1 -mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
              aria-label="Dismiss"
            >
              <Icon.X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastViewport;
