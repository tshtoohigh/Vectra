import React, { useState, useMemo } from 'react';
import { useOutletContext, Link } from 'react-router-dom';
import { Icon, Button, Badge } from '../components/ui/index.js';
import FocusCard from '../components/dashboard/FocusCard.jsx';
import StatCards from '../components/dashboard/StatCards.jsx';
import WorkloadChart from '../components/dashboard/WorkloadChart.jsx';
import UpcomingList from '../components/dashboard/UpcomingList.jsx';
import GettingStarted, {
  isOnboardingDismissed,
  dismissOnboarding,
} from '../components/dashboard/GettingStarted.jsx';
import { useApp } from '../context/AppContext.jsx';
import { greeting, formatDate } from '../utils/format.js';

export default function DashboardPage() {
  const {
    user,
    isDemo,
    tasks,
    modules,
    dailyHours,
    stats,
    focusTask,
    rankedTasks,
    completedTasks,
    workload,
    priorityOf,
    completeTask,
    toggleSubtask,
    resetDemoData,
  } = useApp();

  const { openNewTask, openEditTask, openAiParse, openTextract, openDecompose } =
    useOutletContext();

  const [onboardingHidden, setOnboardingHidden] = useState(() => isOnboardingDismissed());

  const focusPriority = useMemo(
    () => (focusTask ? priorityOf(focusTask) : null),
    [focusTask, priorityOf],
  );

  // Everything except the focus task, capped for a readable dashboard
  const upcoming = useMemo(
    () => rankedTasks.filter((t) => t.id !== focusTask?.id).slice(0, 6),
    [rankedTasks, focusTask],
  );

  const recentlyDone = useMemo(
    () =>
      [...completedTasks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 4),
    [completedTasks],
  );

  const handleDismissOnboarding = () => {
    dismissOnboarding();
    setOnboardingHidden(true);
  };

  const hasMilestones = tasks.some((t) => (t.subtasks || []).length > 0);

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              {greeting()}, {user?.name?.split(' ')[0] || 'there'}
            </h1>
          </div>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {stats.overdue > 0 ? (
              <>
                You have{' '}
                <span className="font-semibold text-red-600 dark:text-red-400">
                  {stats.overdue} overdue
                </span>{' '}
                and {stats.dueSoon} due in the next three days.
              </>
            ) : stats.dueSoon > 0 ? (
              <>
                {stats.dueSoon} {stats.dueSoon === 1 ? 'deadline' : 'deadlines'} in the next three
                days · {stats.hoursThisWeek}h of work this week.
              </>
            ) : stats.active > 0 ? (
              <>Nothing urgent. {stats.active} tasks on your plate overall.</>
            ) : (
              <>All caught up. Nice work.</>
            )}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Button variant="secondary" size="md" onClick={openTextract}>
            <Icon.Upload className="h-4 w-4" />
            <span className="hidden sm:inline">Upload brief</span>
          </Button>
          <Button variant="ai-soft" size="md" onClick={openAiParse}>
            <Icon.Sparkles className="h-4 w-4" />
            Quick add
          </Button>
          <Button size="md" onClick={() => openNewTask()}>
            <Icon.Plus className="h-4 w-4" strokeWidth={2.25} />
            New task
          </Button>
        </div>
      </div>

      {/* ---------- Stats ---------- */}
      <StatCards stats={stats} />

      {/* ---------- Onboarding ---------- */}
      {!onboardingHidden && (
        <GettingStarted
          isDemo={isDemo}
          hasTasks={tasks.length > 0}
          hasModules={modules.length > 0}
          hasMilestones={hasMilestones}
          capacitySet={Boolean(user?.dailyHours)}
          onDismiss={handleDismissOnboarding}
          onNewTask={() => openNewTask()}
          onOpenAiParse={openAiParse}
          onOpenTextract={openTextract}
        />
      )}

      {/* ---------- Main grid ---------- */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left: focus + upcoming */}
        <div className="space-y-6 lg:col-span-3">
          <FocusCard
            task={focusTask}
            allTasks={tasks}
            priority={focusPriority}
            onComplete={completeTask}
            onDecompose={openDecompose}
            onOpenTask={openEditTask}
            onToggleSubtask={toggleSubtask}
          />

          <UpcomingList
            tasks={upcoming}
            priorityOf={priorityOf}
            onComplete={completeTask}
            onOpenTask={openEditTask}
            onNewTask={() => openNewTask()}
          />
        </div>

        {/* Right: workload + extras */}
        <div className="space-y-6 lg:col-span-2">
          <WorkloadChart workload={workload} dailyHours={dailyHours} tasks={tasks} days={10} />

          {/* Recently completed */}
          {recentlyDone.length > 0 && (
            <div className="surface overflow-hidden">
              <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h3 className="heading-card">Recently finished</h3>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentlyDone.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                      <Icon.Check className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-semibold text-slate-600 line-through dark:text-slate-400">
                        {t.title}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {t.moduleCode || 'No module'} · {t.weightage}%
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-slate-400">
                      {formatDate(t.updatedAt, { day: 'numeric', month: 'short' })}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Module snapshot */}
          {modules.length > 0 && (
            <div className="surface overflow-hidden">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                <h3 className="heading-card">Your modules</h3>
                <Link
                  to="/app/modules"
                  className="text-xs font-semibold text-brand-600 hover:underline dark:text-brand-400"
                >
                  Manage
                </Link>
              </div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {modules.slice(0, 5).map((m) => {
                  const moduleTasks = tasks.filter((t) => t.moduleCode === m.code);
                  const open = moduleTasks.filter((t) => t.status !== 'Completed').length;
                  return (
                    <li key={m.code} className="flex items-center gap-3 px-5 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-slate-900 dark:text-white">
                          {m.code}
                        </p>
                        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                          {m.name}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {open === 0 ? 'Clear' : `${open} open`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Demo reset */}
          {isDemo && (
            <div className="rounded-xl border border-dashed border-slate-300 p-4 dark:border-slate-700">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Exploring with sample data
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Change anything you like — it only saves to this browser. Reset it whenever you want
                a clean slate.
              </p>
              <Button variant="secondary" size="xs" className="mt-2.5" onClick={resetDemoData}>
                Reset sample data
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
