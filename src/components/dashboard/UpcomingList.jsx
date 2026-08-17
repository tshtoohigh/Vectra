import React from 'react';
import { Link } from 'react-router-dom';
import { Icon, Badge, Button, Progress, EmptyState } from '../ui/index.js';
import { formatCountdown, getHoursRemaining } from '../../utils/priorityMath.js';
import { relativeDay, formatTime } from '../../utils/format.js';

const TYPE_GLYPHS = {
  Assignment: Icon.FileText,
  Test: Icon.BookOpen,
  Project: Icon.Layers,
  Presentation: Icon.Users,
  Practical: Icon.Target,
};

export default function UpcomingList({ tasks, priorityOf, onComplete, onOpenTask, onNewTask }) {
  if (!tasks.length) {
    return (
      <div className="surface">
        <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <h3 className="heading-card">Coming up</h3>
        </div>
        <EmptyState
          icon={<Icon.Calendar className="h-5 w-5" />}
          title="No upcoming deadlines"
          description="Add your assignments and tests so they show up here in priority order."
          action={
            <Button size="sm" onClick={onNewTask}>
              <Icon.Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              Add a task
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div>
          <h3 className="heading-card">Coming up</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Ordered by what matters most
          </p>
        </div>
        <Link
          to="/app/tasks"
          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
        >
          All tasks
          <Icon.ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {tasks.map((task) => {
          const priority = priorityOf(task);
          const Glyph = TYPE_GLYPHS[task.taskType] || Icon.CheckSquare;
          const hoursLeft = getHoursRemaining(task.deadline);
          const isOverdue = hoursLeft <= 0;
          const subsTotal = (task.subtasks || []).length;
          const subsDone = (task.subtasks || []).filter((s) => s.done).length;

          return (
            <li
              key={task.id}
              className="group transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div className="flex items-start gap-3 px-5 py-3.5">
                {/* Complete toggle */}
                <button
                  type="button"
                  onClick={() => onComplete?.(task.id)}
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 border-slate-300 text-transparent transition-all hover:border-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-slate-600"
                  aria-label={`Mark "${task.title}" complete`}
                >
                  <Icon.Check className="h-3 w-3" strokeWidth={3} />
                </button>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={priority.rank} size="xs" dot>
                      {priority.label}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <Glyph className="h-3 w-3" />
                      {task.taskType}
                    </span>
                    {task.isGroup && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-violet-600 dark:text-violet-400">
                        <Icon.Users className="h-3 w-3" />
                        Group
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenTask?.(task)}
                    className="mt-1 block max-w-full truncate text-left text-sm font-semibold text-slate-900 hover:underline dark:text-white"
                  >
                    {task.title}
                  </button>

                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    {task.moduleCode || 'No module'} · {task.weightage}% · {task.hours}h estimated
                  </p>

                  {/* Progress */}
                  {(task.progress > 0 || subsTotal > 0) && (
                    <div className="mt-2 flex items-center gap-2">
                      <Progress
                        value={task.progress || 0}
                        color={priority.rank}
                        size="xs"
                        className="max-w-[180px]"
                      />
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {subsTotal > 0 ? `${subsDone}/${subsTotal} steps` : `${task.progress}%`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Due */}
                <div className="shrink-0 text-right">
                  <p
                    className={[
                      'text-xs font-bold',
                      isOverdue
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
                  <p className="mt-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                    {formatCountdown(task.deadline)}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
