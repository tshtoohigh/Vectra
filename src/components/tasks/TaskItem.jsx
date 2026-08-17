import React, { useState } from 'react';
import { Icon, Badge, Progress, Button } from '../ui/index.js';
import { formatCountdown, getHoursRemaining } from '../../utils/priorityMath.js';
import { relativeDay, formatTime } from '../../utils/format.js';

const TYPE_GLYPHS = {
  Assignment: Icon.FileText,
  Test: Icon.BookOpen,
  Project: Icon.Layers,
  Presentation: Icon.Users,
  Practical: Icon.Target,
};

export default function TaskItem({
  task,
  priority,
  highlighted = false,
  onComplete,
  onReopen,
  onEdit,
  onDelete,
  onDecompose,
  onToggleSubtask,
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const Glyph = TYPE_GLYPHS[task.taskType] || Icon.CheckSquare;
  const hoursLeft = getHoursRemaining(task.deadline);
  const isDone = task.status === 'Completed';
  const isOverdue = !isDone && hoursLeft <= 0;
  const subs = task.subtasks || [];
  const subsDone = subs.filter((s) => s.done).length;

  return (
    <div
      id={`task-${task.id}`}
      className={[
        'group border-b border-slate-100 transition-colors last:border-b-0 dark:border-slate-800',
        highlighted
          ? 'bg-brand-50/70 ring-1 ring-inset ring-brand-300 dark:bg-brand-500/10 dark:ring-brand-500/40'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
      ].join(' ')}
    >
      <div className="flex items-start gap-3 px-4 py-3.5 sm:px-5">
        {/* Complete toggle */}
        <button
          type="button"
          onClick={() => (isDone ? onReopen?.(task.id) : onComplete?.(task.id))}
          className={[
            'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-all',
            isDone
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-slate-600',
          ].join(' ')}
          aria-label={isDone ? `Reopen "${task.title}"` : `Mark "${task.title}" complete`}
        >
          <Icon.Check className="h-3 w-3" strokeWidth={3} />
        </button>

        {/* Main */}
        <div className="min-w-0 flex-1">
          {/* Meta row */}
          <div className="flex flex-wrap items-center gap-1.5">
            {isDone ? (
              <Badge tone="success" size="xs">
                Done
              </Badge>
            ) : (
              <Badge tone={priority.rank} size="xs" dot>
                {priority.label}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              <Glyph className="h-3 w-3" />
              {task.taskType}
            </span>
            {task.moduleCode && (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {task.moduleCode}
              </span>
            )}
            {task.isGroup && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                <Icon.Users className="h-3 w-3" />
                Group
              </span>
            )}
          </div>

          {/* Title */}
          <button
            type="button"
            onClick={() => onEdit?.(task)}
            className={[
              'mt-1 block max-w-full text-left text-sm font-semibold hover:underline',
              isDone
                ? 'text-slate-400 line-through dark:text-slate-500'
                : 'text-slate-900 dark:text-white',
            ].join(' ')}
          >
            {task.title}
          </button>

          {/* Sub-meta */}
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {task.weightage}% of grade · {task.hours}h estimated
            {task.moduleName ? ` · ${task.moduleName}` : ''}
          </p>

          {/* Progress */}
          {!isDone && (task.progress > 0 || subs.length > 0) && (
            <div className="mt-2 flex items-center gap-2">
              <Progress
                value={task.progress || 0}
                color={priority.rank}
                size="xs"
                className="max-w-[200px]"
              />
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {task.progress || 0}%
              </span>
            </div>
          )}

          {/* Milestones toggle */}
          {subs.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
            >
              <Icon.ChevronRight
                className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
              />
              {subsDone} of {subs.length} milestones
            </button>
          )}

          {/* Milestones */}
          {expanded && subs.length > 0 && (
            <ul className="mt-2 space-y-1.5 border-l-2 border-slate-200 pl-3 dark:border-slate-700">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={s.done}
                    onChange={(e) => onToggleSubtask?.(task.id, s.id, e.target.checked)}
                    className="checkbox"
                    id={`sub-${s.id}`}
                  />
                  <label
                    htmlFor={`sub-${s.id}`}
                    className={[
                      'flex-1 cursor-pointer text-xs',
                      s.done
                        ? 'text-slate-400 line-through dark:text-slate-600'
                        : 'text-slate-700 dark:text-slate-300',
                    ].join(' ')}
                  >
                    {s.title}
                  </label>
                  <span className="shrink-0 text-xs text-slate-400">{s.hours}h</span>
                </li>
              ))}
            </ul>
          )}

          {/* Notes */}
          {task.notes && expanded && (
            <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/60 dark:text-slate-400">
              {task.notes}
            </p>
          )}
        </div>

        {/* Right: due + actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="text-right">
            <p
              className={[
                'text-xs font-bold',
                isDone
                  ? 'text-slate-400 dark:text-slate-500'
                  : isOverdue
                    ? 'text-red-600 dark:text-red-400'
                    : hoursLeft < 48
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-700 dark:text-slate-300',
              ].join(' ')}
            >
              {relativeDay(task.deadline)}
            </p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">
              {formatTime(task.deadline)}
            </p>
            {!isDone && (
              <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                {formatCountdown(task.deadline)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {!isDone && subs.length === 0 && (
              <button
                type="button"
                onClick={() => onDecompose?.(task)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-500/10 dark:hover:text-violet-400"
                title="Break into milestones"
              >
                <Icon.Layers className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onEdit?.(task)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              title="Edit"
            >
              <Icon.Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              title="Delete"
            >
              <Icon.Trash className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="flex flex-wrap items-center gap-3 border-t border-red-200 bg-red-50 px-4 py-2.5 sm:px-5 dark:border-red-500/25 dark:bg-red-500/5">
          <p className="text-xs font-medium text-red-800 dark:text-red-300">
            Delete this task permanently?
          </p>
          <div className="ml-auto flex gap-2">
            <Button size="xs" variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              size="xs"
              variant="danger"
              onClick={() => {
                setConfirmDelete(false);
                onDelete?.(task.id);
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
