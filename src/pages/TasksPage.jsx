import React, { useState, useMemo, useEffect } from 'react';
import { useOutletContext, useLocation } from 'react-router-dom';
import {
  Icon,
  Button,
  Badge,
  Input,
  Select,
  SegmentedControl,
  EmptyState,
} from '../components/ui/index.js';
import TaskItem from '../components/tasks/TaskItem.jsx';
import { useApp } from '../context/AppContext.jsx';
import { getHoursRemaining } from '../utils/priorityMath.js';

const TASK_TYPES = ['Assignment', 'Test', 'Project', 'Presentation', 'Practical'];

const GROUPS = [
  { id: 'overdue', label: 'Overdue', tone: 'critical' },
  { id: 'today', label: 'Due today', tone: 'critical' },
  { id: 'week', label: 'This week', tone: 'high' },
  { id: 'later', label: 'Later', tone: 'medium' },
  { id: 'done', label: 'Completed', tone: 'success' },
];

function groupFor(task) {
  if (task.status === 'Completed') return 'done';
  const h = getHoursRemaining(task.deadline);
  if (h <= 0) return 'overdue';
  const today = new Date().toDateString();
  if (new Date(task.deadline).toDateString() === today) return 'today';
  if (h <= 168) return 'week';
  return 'later';
}

export default function TasksPage() {
  const {
    tasks,
    modules,
    rankedTasks,
    priorityOf,
    completeTask,
    reopenTask,
    deleteTask,
    toggleSubtask,
    pushToast,
  } = useApp();

  const { openNewTask, openEditTask, openAiParse, openTextract, openDecompose } =
    useOutletContext();

  const location = useLocation();
  const highlightId = location.state?.highlight || null;
  const incomingModule = location.state?.moduleFilter || '';

  const [view, setView] = useState('list');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({
    module: incomingModule,
    type: '',
    status: '',
    priority: '',
  });
  const [showCompleted, setShowCompleted] = useState(true);

  // Apply a module filter arriving from another page (e.g. Modules → View tasks)
  useEffect(() => {
    if (incomingModule) setFilters((f) => ({ ...f, module: incomingModule }));
  }, [incomingModule]);

  // Scroll the searched-for task into view
  useEffect(() => {
    if (!highlightId) return;
    const el = document.getElementById(`task-${highlightId}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId, tasks]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rankedTasks.concat(tasks.filter((t) => t.status === 'Completed')).filter((t) => {
      if (!showCompleted && t.status === 'Completed') return false;
      if (filters.module && t.moduleCode !== filters.module) return false;
      if (filters.type && t.taskType !== filters.type) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.priority && priorityOf(t).rank !== filters.priority) return false;
      if (q) {
        const haystack =
          `${t.title} ${t.moduleCode} ${t.moduleName} ${t.notes || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rankedTasks, tasks, query, filters, showCompleted, priorityOf]);

  const grouped = useMemo(() => {
    const map = {};
    GROUPS.forEach((g) => {
      map[g.id] = [];
    });
    filtered.forEach((t) => {
      map[groupFor(t)].push(t);
    });
    return map;
  }, [filtered]);

  const boardColumns = useMemo(
    () => [
      {
        id: 'Pending',
        label: 'Not started',
        items: filtered.filter((t) => t.status === 'Pending'),
      },
      {
        id: 'In Progress',
        label: 'In progress',
        items: filtered.filter((t) => t.status === 'In Progress'),
      },
      {
        id: 'Completed',
        label: 'Completed',
        items: filtered.filter((t) => t.status === 'Completed'),
      },
    ],
    [filtered],
  );

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const clearFilters = () => setFilters({ module: '', type: '', status: '', priority: '' });

  const itemHandlers = {
    onComplete: (id) => {
      completeTask(id);
      pushToast({ tone: 'success', title: 'Task completed' });
    },
    onReopen: reopenTask,
    onEdit: openEditTask,
    onDelete: (id) => {
      deleteTask(id);
      pushToast({ tone: 'info', title: 'Task deleted' });
    },
    onDecompose: openDecompose,
    onToggleSubtask: toggleSubtask,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Tasks
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {filtered.length} {filtered.length === 1 ? 'task' : 'tasks'}
            {activeFilterCount > 0 && ' matching your filters'}
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

      {/* Toolbar */}
      <div className="surface p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title, module or notes"
              leftIcon={<Icon.Search className="h-4 w-4" />}
              rightSlot={
                query ? (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    aria-label="Clear search"
                  >
                    <Icon.X className="h-3.5 w-3.5" />
                  </button>
                ) : null
              }
            />
          </div>

          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: 'list', label: 'List', icon: <Icon.List className="h-3.5 w-3.5" /> },
              { value: 'board', label: 'Board', icon: <Icon.Columns className="h-3.5 w-3.5" /> },
            ]}
          />
        </div>

        {/* Filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <Icon.Filter className="h-3.5 w-3.5" />
            Filter
          </span>

          <Select
            value={filters.module}
            onChange={(e) => setFilters((f) => ({ ...f, module: e.target.value }))}
            className="h-8 w-auto text-xs"
          >
            <option value="">All modules</option>
            {modules.map((m) => (
              <option key={m.code} value={m.code}>
                {m.code}
              </option>
            ))}
          </Select>

          <Select
            value={filters.type}
            onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
            className="h-8 w-auto text-xs"
          >
            <option value="">All types</option>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>

          <Select
            value={filters.priority}
            onChange={(e) => setFilters((f) => ({ ...f, priority: e.target.value }))}
            className="h-8 w-auto text-xs"
          >
            <option value="">Any priority</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>

          <Select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
            className="h-8 w-auto text-xs"
          >
            <option value="">Any status</option>
            <option value="Pending">Not started</option>
            <option value="In Progress">In progress</option>
            <option value="Completed">Completed</option>
          </Select>

          {activeFilterCount > 0 && (
            <Button variant="ghost" size="xs" onClick={clearFilters}>
              <Icon.X className="h-3 w-3" />
              Clear
            </Button>
          )}

          <label className="ml-auto inline-flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={showCompleted}
              onChange={(e) => setShowCompleted(e.target.checked)}
              className="checkbox"
            />
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Show completed
            </span>
          </label>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<Icon.CheckSquare className="h-5 w-5" />}
            title={tasks.length === 0 ? 'No tasks yet' : 'Nothing matches those filters'}
            description={
              tasks.length === 0
                ? 'Add your first deadline and Vectra will start working out what to prioritise.'
                : 'Try clearing a filter or widening your search.'
            }
            action={
              tasks.length === 0 ? (
                <Button size="sm" onClick={() => openNewTask()}>
                  <Icon.Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                  Add a task
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              )
            }
          />
        </div>
      ) : view === 'list' ? (
        <div className="space-y-5">
          {GROUPS.map((group) => {
            const items = grouped[group.id];
            if (!items.length) return null;
            return (
              <section key={group.id}>
                <div className="mb-2 flex items-center gap-2 px-1">
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {group.label}
                  </h2>
                  <Badge tone={group.tone} size="xs">
                    {items.length}
                  </Badge>
                </div>
                <div className="surface overflow-hidden">
                  {items.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      priority={priorityOf(task)}
                      highlighted={task.id === highlightId}
                      {...itemHandlers}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {boardColumns.map((col) => (
            <section key={col.id} className="flex min-w-0 flex-col">
              <div className="mb-2 flex items-center gap-2 px-1">
                <span
                  className={[
                    'h-2 w-2 rounded-full',
                    col.id === 'Completed'
                      ? 'bg-emerald-500'
                      : col.id === 'In Progress'
                        ? 'bg-blue-500'
                        : 'bg-slate-400',
                  ].join(' ')}
                />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {col.label}
                </h2>
                <Badge tone="neutral" size="xs">
                  {col.items.length}
                </Badge>
              </div>

              {col.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 px-4 py-10 text-center dark:border-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500">Nothing here</p>
                </div>
              ) : (
                <div className="surface overflow-hidden">
                  {col.items.map((task) => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      priority={priorityOf(task)}
                      highlighted={task.id === highlightId}
                      {...itemHandlers}
                    />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
