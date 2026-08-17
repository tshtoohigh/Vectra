import React, { useState, useEffect } from 'react';
import { Icon, Button, Badge, Progress, AwsChip } from '../ui/index.js';
import { formatCountdown, getHoursRemaining } from '../../utils/priorityMath.js';
import { formatDateTime } from '../../utils/format.js';
import { BedrockClient } from '../../services/aws/bedrockClient.js';

const RANK_STYLES = {
  critical: {
    wrap: 'border-red-200 bg-red-50/60 dark:border-red-500/25 dark:bg-red-500/5',
    accent: 'text-red-700 dark:text-red-400',
    dot: 'bg-red-500',
    bar: 'critical',
  },
  high: {
    wrap: 'border-amber-200 bg-amber-50/60 dark:border-amber-500/25 dark:bg-amber-500/5',
    accent: 'text-amber-800 dark:text-amber-400',
    dot: 'bg-amber-500',
    bar: 'high',
  },
  medium: {
    wrap: 'border-blue-200 bg-blue-50/60 dark:border-blue-500/25 dark:bg-blue-500/5',
    accent: 'text-blue-700 dark:text-blue-400',
    dot: 'bg-blue-500',
    bar: 'medium',
  },
  low: {
    wrap: 'border-emerald-200 bg-emerald-50/60 dark:border-emerald-500/25 dark:bg-emerald-500/5',
    accent: 'text-emerald-700 dark:text-emerald-400',
    dot: 'bg-emerald-500',
    bar: 'low',
  },
};

export default function FocusCard({
  task,
  allTasks,
  priority,
  onComplete,
  onDecompose,
  onOpenTask,
  onToggleSubtask,
}) {
  const [reasoning, setReasoning] = useState('');
  const [loadingReason, setLoadingReason] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!task) return undefined;

    setLoadingReason(true);
    BedrockClient.explainPriority(task, allTasks)
      .then((text) => {
        if (!cancelled) {
          setReasoning(text);
          setLoadingReason(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoadingReason(false);
      });

    return () => {
      cancelled = true;
    };
  }, [task, allTasks]);

  if (!task) {
    return (
      <div className="surface flex flex-col items-center justify-center px-6 py-12 text-center">
        <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
          <Icon.CircleCheck className="h-5 w-5" />
        </span>
        <p className="text-sm font-bold text-slate-900 dark:text-white">Nothing outstanding</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Every deadline is done. Add your next assignment whenever it comes in.
        </p>
      </div>
    );
  }

  const style = RANK_STYLES[priority.rank] || RANK_STYLES.medium;
  const hoursLeft = getHoursRemaining(task.deadline);
  const isOverdue = hoursLeft <= 0;
  const remainingEffort =
    Math.round((task.hours || 0) * (1 - (task.progress || 0) / 100) * 10) / 10;
  const nextMilestone = (task.subtasks || []).find((s) => !s.done);
  const subsDone = (task.subtasks || []).filter((s) => s.done).length;

  return (
    <div className={`rounded-xl border p-5 shadow-card ${style.wrap}`}>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <span className={`flex h-2 w-2 rounded-full ${style.dot}`} />
        <span className={`text-xs font-bold uppercase tracking-widest ${style.accent}`}>
          {isOverdue ? 'Overdue — do this first' : 'Work on this next'}
        </span>
        <Badge tone={priority.rank} size="xs">
          {priority.label}
        </Badge>
        <span className="ml-auto text-xs font-medium text-slate-500 dark:text-slate-400">
          Score {priority.score.toFixed(1)}
        </span>
      </div>

      {/* Title + meta */}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpenTask?.(task)}
            className="text-left text-lg font-bold leading-snug text-slate-900 hover:underline dark:text-white"
          >
            {task.title}
          </button>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            {task.moduleCode || 'No module'}
            {task.moduleName ? ` · ${task.moduleName}` : ''} · {task.taskType} · {task.weightage}%
            of grade
            {task.isGroup ? ' · Group work' : ''}
          </p>
        </div>

        {/* Countdown */}
        <div className="flex shrink-0 items-center gap-4 rounded-lg border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900">
          <div>
            <p
              className={`text-lg font-extrabold leading-none ${isOverdue ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}
            >
              {formatCountdown(task.deadline)}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-400">
              {isOverdue ? 'past due' : 'remaining'}
            </p>
          </div>
          <div className="border-l border-slate-200 pl-4 dark:border-slate-700">
            <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
              {remainingEffort}h
            </p>
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
              of work left
            </p>
          </div>
        </div>
      </div>

      {/* AI reasoning */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-white/80 p-3.5 dark:border-slate-700 dark:bg-slate-900/70">
        <div className="mb-1.5 flex items-center gap-2">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-violet-100 dark:bg-violet-500/15">
            <Icon.Sparkles className="h-3 w-3 text-violet-600 dark:text-violet-400" />
          </span>
          <span className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">
            Why this one
          </span>
          <AwsChip service="Bedrock" />
        </div>
        {loadingReason ? (
          <div className="space-y-1.5 py-0.5">
            <div className="h-2.5 w-full animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
            <div className="h-2.5 w-4/5 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
          </div>
        ) : (
          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{reasoning}</p>
        )}
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-400">
            {task.progress || 0}% complete
          </span>
          {(task.subtasks || []).length > 0 && (
            <span className="text-slate-500 dark:text-slate-500">
              {subsDone} of {task.subtasks.length} milestones
            </span>
          )}
        </div>
        <Progress value={task.progress || 0} color={style.bar} />
      </div>

      {/* Next milestone */}
      {nextMilestone && (
        <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => onToggleSubtask?.(task.id, nextMilestone.id, true)}
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-slate-300 text-transparent transition-colors hover:border-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-slate-600"
            aria-label={`Mark "${nextMilestone.title}" as done`}
          >
            <Icon.Check className="h-3 w-3" strokeWidth={3} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Start here</p>
            <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
              {nextMilestone.title}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
            {nextMilestone.hours}h
          </span>
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/70 pt-4 dark:border-slate-700/60">
        <Button size="sm" variant="success" onClick={() => onComplete?.(task.id)}>
          <Icon.Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          Mark done
        </Button>

        {(task.subtasks || []).length === 0 && (
          <Button size="sm" variant="ai-soft" onClick={() => onDecompose?.(task)}>
            <Icon.Layers className="h-3.5 w-3.5" />
            Break it down
          </Button>
        )}

        <Button size="sm" variant="secondary" onClick={() => onOpenTask?.(task)}>
          <Icon.Pencil className="h-3.5 w-3.5" />
          Edit
        </Button>

        <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
          Due {formatDateTime(task.deadline)}
        </span>
      </div>
    </div>
  );
}
