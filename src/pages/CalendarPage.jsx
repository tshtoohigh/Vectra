import React, { useState, useMemo } from 'react';
import { useOutletContext } from 'react-router-dom';
import { Icon, Button, Badge, SegmentedControl, EmptyState } from '../components/ui/index.js';
import { useApp } from '../context/AppContext.jsx';
import { formatDate, formatTime, relativeDay } from '../utils/format.js';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const DOT_TONES = {
  critical: 'bg-red-500',
  high: 'bg-amber-500',
  medium: 'bg-blue-500',
  low: 'bg-emerald-500',
};

/** Monday-first grid of 6 weeks covering the given month. */
function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7; // convert Sun=0 to Mon=0
  const start = new Date(year, month, 1 - offset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
    return {
      date: d,
      key: d.toISOString().split('T')[0],
      inMonth: d.getMonth() === month,
      isToday: d.toDateString() === new Date().toDateString(),
    };
  });
}

export default function CalendarPage() {
  const { tasks, dailyHours, priorityOf, completeTask } = useApp();
  const { openNewTask, openEditTask } = useOutletContext();

  const today = new Date();
  const [cursor, setCursor] = useState({ year: today.getFullYear(), month: today.getMonth() });
  const [selected, setSelected] = useState(today.toISOString().split('T')[0]);
  const [view, setView] = useState('month');

  // Index tasks by due date
  const byDate = useMemo(() => {
    const map = {};
    tasks.forEach((t) => {
      if (!t.deadline) return;
      const key = t.deadline.split('T')[0];
      (map[key] = map[key] || []).push(t);
    });
    Object.values(map).forEach((list) =>
      list.sort((a, b) => new Date(a.deadline) - new Date(b.deadline)),
    );
    return map;
  }, [tasks]);

  const grid = useMemo(() => buildMonthGrid(cursor.year, cursor.month), [cursor]);

  const monthLabel = new Date(cursor.year, cursor.month).toLocaleDateString('en-SG', {
    month: 'long',
    year: 'numeric',
  });

  const selectedTasks = byDate[selected] || [];

  const hoursFor = (key) =>
    Math.round(
      (byDate[key] || [])
        .filter((t) => t.status !== 'Completed')
        .reduce((s, t) => s + (t.hours || 0) * (1 - (t.progress || 0) / 100), 0) * 10,
    ) / 10;

  const goMonth = (delta) => {
    setCursor((c) => {
      const d = new Date(c.year, c.month + delta, 1);
      return { year: d.getFullYear(), month: d.getMonth() };
    });
  };

  const goToday = () => {
    setCursor({ year: today.getFullYear(), month: today.getMonth() });
    setSelected(today.toISOString().split('T')[0]);
  };

  // Agenda: upcoming active tasks grouped by date
  const agenda = useMemo(() => {
    const upcoming = tasks
      .filter((t) => t.status !== 'Completed')
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    const groups = [];
    upcoming.forEach((t) => {
      const key = t.deadline.split('T')[0];
      const last = groups[groups.length - 1];
      if (last && last.key === key) last.items.push(t);
      else groups.push({ key, items: [t] });
    });
    return groups;
  }, [tasks]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Calendar
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Every deadline plotted against your {dailyHours}h daily capacity
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'month', label: 'Month', icon: <Icon.Calendar className="h-3.5 w-3.5" /> },
              { value: 'agenda', label: 'Agenda', icon: <Icon.List className="h-3.5 w-3.5" /> },
            ]}
          />
          <Button size="md" onClick={() => openNewTask()}>
            <Icon.Plus className="h-4 w-4" strokeWidth={2.25} />
            <span className="hidden sm:inline">New task</span>
          </Button>
        </div>
      </div>

      {view === 'month' ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {/* Month grid */}
          <div className="surface overflow-hidden lg:col-span-2">
            {/* Month nav */}
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">{monthLabel}</h2>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="xs" onClick={goToday}>
                  Today
                </Button>
                <button
                  type="button"
                  onClick={() => goMonth(-1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Previous month"
                >
                  <Icon.ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => goMonth(1)}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Next month"
                >
                  <Icon.ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Weekday header */}
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
              {WEEKDAYS.map((d) => (
                <div
                  key={d}
                  className="px-1 py-2 text-center text-xs font-bold uppercase tracking-wider text-slate-400"
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Days */}
            <div className="grid grid-cols-7">
              {grid.map((cell) => {
                const dayTasks = byDate[cell.key] || [];
                const active = dayTasks.filter((t) => t.status !== 'Completed');
                const hours = hoursFor(cell.key);
                const over = hours > dailyHours;
                const isSelected = cell.key === selected;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    onClick={() => setSelected(cell.key)}
                    className={[
                      'relative min-h-[72px] border-b border-r border-slate-100 p-1.5 text-left transition-colors dark:border-slate-800',
                      cell.inMonth ? '' : 'bg-slate-50/60 dark:bg-slate-900/40',
                      isSelected
                        ? 'ring-2 ring-inset ring-brand-500'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40',
                    ].join(' ')}
                  >
                    {/* Date number */}
                    <div className="flex items-center justify-between">
                      <span
                        className={[
                          'flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold',
                          cell.isToday
                            ? 'bg-brand-600 text-white'
                            : cell.inMonth
                              ? 'text-slate-700 dark:text-slate-300'
                              : 'text-slate-400 dark:text-slate-600',
                        ].join(' ')}
                      >
                        {cell.date.getDate()}
                      </span>
                      {over && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-red-500"
                          title={`${hours}h scheduled — over your ${dailyHours}h capacity`}
                        />
                      )}
                    </div>

                    {/* Task pills */}
                    <div className="mt-1 space-y-0.5">
                      {active.slice(0, 2).map((t) => {
                        const p = priorityOf(t);
                        return (
                          <div key={t.id} className="flex items-center gap-1">
                            <span
                              className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT_TONES[p.rank] || DOT_TONES.medium}`}
                            />
                            <span className="truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                              {t.moduleCode || t.title}
                            </span>
                          </div>
                        );
                      })}
                      {active.length > 2 && (
                        <p className="text-xs font-semibold text-slate-400">
                          +{active.length - 2} more
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 px-4 py-2.5 dark:border-slate-800">
              {[
                ['bg-red-500', 'Critical'],
                ['bg-amber-500', 'High'],
                ['bg-blue-500', 'Medium'],
                ['bg-emerald-500', 'Low'],
              ].map(([tone, label]) => (
                <span key={label} className="inline-flex items-center gap-1.5">
                  <span className={`h-1.5 w-1.5 rounded-full ${tone}`} />
                  <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
                </span>
              ))}
              <span className="ml-auto inline-flex items-center gap-1.5">
                <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Corner dot = over capacity
                </span>
              </span>
            </div>
          </div>

          {/* Selected day panel */}
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                {formatDate(selected, { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {(() => {
                  const h = hoursFor(selected);
                  if (!h) return 'Nothing due';
                  return `${h}h of work due${h > dailyHours ? ` — ${Math.round((h - dailyHours) * 10) / 10}h over capacity` : ''}`;
                })()}
              </p>
            </div>

            {selectedTasks.length === 0 ? (
              <EmptyState
                icon={<Icon.Calendar className="h-5 w-5" />}
                title="Nothing due"
                description="No deadlines fall on this day."
                action={
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() =>
                      openNewTask({ deadline: new Date(`${selected}T23:59`).toISOString() })
                    }
                  >
                    <Icon.Plus className="h-3 w-3" />
                    Add for this day
                  </Button>
                }
                className="!py-10"
              />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedTasks.map((t) => {
                  const p = priorityOf(t);
                  const done = t.status === 'Completed';
                  return (
                    <li key={t.id} className="flex items-start gap-2.5 px-4 py-3">
                      <button
                        type="button"
                        onClick={() => !done && completeTask(t.id)}
                        className={[
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors',
                          done
                            ? 'border-emerald-500 bg-emerald-500 text-white'
                            : 'border-slate-300 text-transparent hover:border-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-slate-600',
                        ].join(' ')}
                        aria-label={done ? 'Completed' : `Complete ${t.title}`}
                      >
                        <Icon.Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          {done ? (
                            <Badge tone="success" size="xs">
                              Done
                            </Badge>
                          ) : (
                            <Badge tone={p.rank} size="xs" dot>
                              {p.label}
                            </Badge>
                          )}
                          <span className="text-xs text-slate-400">{formatTime(t.deadline)}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditTask(t)}
                          className={[
                            'mt-1 block max-w-full truncate text-left text-xs font-semibold hover:underline',
                            done
                              ? 'text-slate-400 line-through dark:text-slate-500'
                              : 'text-slate-900 dark:text-white',
                          ].join(' ')}
                        >
                          {t.title}
                        </button>
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {t.moduleCode || 'No module'} · {t.weightage}% · {t.hours}h
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : (
        /* ---------- Agenda view ---------- */
        <div className="space-y-4">
          {agenda.length === 0 ? (
            <div className="surface">
              <EmptyState
                icon={<Icon.CircleCheck className="h-5 w-5" />}
                title="Nothing scheduled"
                description="You have no outstanding deadlines. Add one when it comes in."
                action={
                  <Button size="sm" onClick={() => openNewTask()}>
                    <Icon.Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                    New task
                  </Button>
                }
              />
            </div>
          ) : (
            agenda.map((group) => {
              const hours = hoursFor(group.key);
              const over = hours > dailyHours;
              return (
                <section key={group.key} className="surface overflow-hidden">
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-bold text-slate-900 dark:text-white">
                        {relativeDay(group.key)}
                      </h2>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {formatDate(group.key, {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}
                      </span>
                    </div>
                    <Badge tone={over ? 'critical' : 'neutral'} size="xs" dot={over}>
                      {hours}h{over ? ' over capacity' : ''}
                    </Badge>
                  </div>

                  <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                    {group.items.map((t) => {
                      const p = priorityOf(t);
                      return (
                        <li key={t.id} className="flex items-center gap-3 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => completeTask(t.id)}
                            className="flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 border-slate-300 text-transparent transition-colors hover:border-emerald-500 hover:bg-emerald-500 hover:text-white dark:border-slate-600"
                            aria-label={`Complete ${t.title}`}
                          >
                            <Icon.Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                          </button>

                          <div className="min-w-0 flex-1">
                            <button
                              type="button"
                              onClick={() => openEditTask(t)}
                              className="block max-w-full truncate text-left text-xs font-semibold text-slate-900 hover:underline dark:text-white"
                            >
                              {t.title}
                            </button>
                            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                              {t.moduleCode || 'No module'} · {t.taskType} · {t.weightage}%
                            </p>
                          </div>

                          <Badge tone={p.rank} size="xs" dot>
                            {p.label}
                          </Badge>
                          <span className="w-12 shrink-0 text-right text-xs text-slate-400">
                            {formatTime(t.deadline)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
