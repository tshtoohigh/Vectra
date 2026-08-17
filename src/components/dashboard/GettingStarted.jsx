import React from 'react';
import { Icon, Button, AwsChip } from '../ui/index.js';

const DISMISS_KEY = 'vectra.onboardingDismissed';

export function isOnboardingDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissOnboarding() {
  try {
    localStorage.setItem(DISMISS_KEY, '1');
  } catch {
    /* ignore */
  }
}

export default function GettingStarted({
  isDemo,
  hasTasks,
  hasModules,
  hasMilestones,
  capacitySet,
  onDismiss,
  onNewTask,
  onOpenAiParse,
  onOpenTextract,
}) {
  const steps = [
    {
      id: 'account',
      title: 'Create your account',
      body: isDemo
        ? 'Sign up so your tasks sync and reminders can reach you.'
        : 'Your account is set up and syncing.',
      done: !isDemo,
      action: isDemo ? (
        <Button size="xs" to="/login" state={{ mode: 'signup' }}>
          Sign up free
        </Button>
      ) : null,
    },
    {
      id: 'modules',
      title: 'Add your modules',
      body: 'Group deadlines by subject so you can see where your grade is going.',
      done: hasModules,
      action: !hasModules ? (
        <Button size="xs" variant="secondary" to="/app/modules">
          Add modules
        </Button>
      ) : null,
    },
    {
      id: 'tasks',
      title: 'Add your first deadline',
      body: 'Type it in, paste it in plain English, or upload the brief.',
      done: hasTasks,
      action: !hasTasks ? (
        <div className="flex flex-wrap gap-1.5">
          <Button size="xs" onClick={onNewTask}>
            Add manually
          </Button>
          <Button size="xs" variant="ai-soft" onClick={onOpenAiParse}>
            <Icon.Sparkles className="h-3 w-3" />
            Paste text
          </Button>
          <Button size="xs" variant="secondary" onClick={onOpenTextract}>
            <Icon.Upload className="h-3 w-3" />
            Upload brief
          </Button>
        </div>
      ) : null,
    },
    {
      id: 'capacity',
      title: 'Set your study capacity',
      body: 'Tell Vectra how many hours a day you realistically have, so it can spot overloaded days.',
      done: capacitySet,
      action: !capacitySet ? (
        <Button size="xs" variant="secondary" to="/app/settings">
          Set hours
        </Button>
      ) : null,
    },
    {
      id: 'milestones',
      title: 'Break down a big task',
      body: 'Let the AI split a large project into milestones you can actually start.',
      done: hasMilestones,
      action: null,
    },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const allDone = doneCount === steps.length;

  if (allDone) return null;

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <h3 className="heading-card">Finish setting up</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {doneCount} of {steps.length} done — takes about two minutes
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="-mr-1 -mt-1 flex h-7 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
        >
          <Icon.X className="h-3 w-3" />
          Dismiss
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 w-full bg-slate-100 dark:bg-slate-800">
        <div
          className="h-full bg-brand-500 transition-all duration-500"
          style={{ width: `${(doneCount / steps.length) * 100}%` }}
        />
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-start gap-3 px-5 py-3.5">
            <span
              className={[
                'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                step.done
                  ? 'bg-emerald-500 text-white'
                  : 'border-2 border-slate-300 text-slate-400 dark:border-slate-600 dark:text-slate-500',
              ].join(' ')}
            >
              {step.done ? <Icon.Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
            </span>

            <div className="min-w-0 flex-1">
              <p
                className={[
                  'text-sm font-semibold',
                  step.done
                    ? 'text-slate-400 line-through dark:text-slate-600'
                    : 'text-slate-900 dark:text-white',
                ].join(' ')}
              >
                {step.title}
              </p>
              {!step.done && (
                <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {step.body}
                </p>
              )}
              {step.action && <div className="mt-2">{step.action}</div>}
            </div>
          </li>
        ))}
      </ul>

      <div className="flex items-center gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-900/50">
        <Icon.Info className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Reminders are delivered through Amazon SNS once your account is set up.
        </p>
        <AwsChip service="SNS" className="ml-auto shrink-0" />
      </div>
    </div>
  );
}
