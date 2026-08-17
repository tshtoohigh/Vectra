import React, { useState, useEffect } from 'react';
import { Icon, Button } from './ui/index.js';

const TOUR_KEY = 'jarvis.hasCompletedTour';

const STEPS = [
  {
    target: 'tour-add-task',
    title: 'Add your first task',
    body: 'Click here to add assignments manually or using natural language. Just describe what is due and when.',
    position: 'bottom',
  },
  {
    target: 'tour-upload-brief',
    title: 'Upload a brief',
    body: 'Got a PDF or photo of your assignment sheet? Upload it and deadlines are extracted automatically.',
    position: 'bottom',
  },
  {
    target: 'tour-workload',
    title: 'Your workload at a glance',
    body: 'This heatmap shows scheduled hours per day. Red means you have more work than time — start earlier.',
    position: 'left',
  },
  {
    target: 'tour-focus',
    title: 'Your top priority',
    body: 'This card always shows what matters most right now, with a clear explanation of why. Lock in and get it done.',
    position: 'bottom',
  },
];

export default function OnboardingTour_F1({ taskCount = 0, isNewUser = false }) {
  const [active, setActive] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    // Only show for new users or zero tasks, and only if not previously completed
    const completed = localStorage.getItem(TOUR_KEY) === 'true';
    if (!completed && (isNewUser || taskCount === 0)) {
      const timer = setTimeout(() => setActive(true), 800);
      return () => clearTimeout(timer);
    }
  }, [isNewUser, taskCount]);

  const dismiss = () => {
    setActive(false);
    localStorage.setItem(TOUR_KEY, 'true');
  };

  const next = () => {
    if (step < STEPS.length - 1) setStep(step + 1);
    else dismiss();
  };

  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  if (!active) return null;

  const current = STEPS[step];

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[70] bg-slate-900/40 backdrop-blur-sm" />

      {/* Tooltip */}
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="w-full max-w-sm animate-scale-in rounded-xl border border-slate-200 bg-white p-5 shadow-lift dark:border-slate-700 dark:bg-slate-900">
          {/* Progress */}
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-bold text-brand-600 dark:text-brand-400">
              {step + 1} of {STEPS.length}
            </span>
            <button
              type="button"
              onClick={dismiss}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
            >
              Skip tour
              <Icon.X className="h-3 w-3" />
            </button>
          </div>

          {/* Step indicator dots */}
          <div className="mb-4 flex gap-1.5">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all duration-300',
                  i === step ? 'w-6 bg-brand-500' : 'w-1.5 bg-slate-200 dark:bg-slate-700',
                ].join(' ')}
              />
            ))}
          </div>

          {/* Content */}
          <div className="mb-5">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">{current.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
              {current.body}
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={back}>
                <Icon.ChevronLeft className="h-3.5 w-3.5" />
                Back
              </Button>
            )}
            <Button variant="primary" size="sm" onClick={next} className="ml-auto">
              {step < STEPS.length - 1 ? (
                <>
                  Next
                  <Icon.ChevronRight className="h-3.5 w-3.5" />
                </>
              ) : (
                <>
                  Get started
                  <Icon.Check className="h-3.5 w-3.5" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Utility to check if tour should show */
export function shouldShowTour() {
  return localStorage.getItem(TOUR_KEY) !== 'true';
}

/** Utility to reset tour (for testing) */
export function resetTour() {
  localStorage.removeItem(TOUR_KEY);
}
