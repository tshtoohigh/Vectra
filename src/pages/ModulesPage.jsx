import React, { useState, useMemo } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import {
  Icon,
  Button,
  Badge,
  Modal,
  Field,
  Input,
  Progress,
  EmptyState,
} from '../components/ui/index.js';
import { useApp } from '../context/AppContext.jsx';
import { relativeDay } from '../utils/format.js';

const EMPTY_FORM = { code: '', name: '', lecturer: '' };

export default function ModulesPage() {
  const { tasks, modules, priorityOf, upsertModule, deleteModule, pushToast } = useApp();
  const { openNewTask } = useOutletContext();
  const navigate = useNavigate();

  const [editor, setEditor] = useState({ open: false, original: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Per-module rollup
  const summaries = useMemo(
    () =>
      modules.map((m) => {
        const all = tasks.filter((t) => t.moduleCode === m.code);
        const done = all.filter((t) => t.status === 'Completed');
        const open = all.filter((t) => t.status !== 'Completed');
        const gradeTracked = all.reduce((s, t) => s + (t.weightage || 0), 0);
        const gradeSecured = done.reduce((s, t) => s + (t.weightage || 0), 0);
        const hoursLeft =
          Math.round(
            open.reduce((s, t) => s + (t.hours || 0) * (1 - (t.progress || 0) / 100), 0) * 10,
          ) / 10;
        const next =
          [...open].sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0] || null;
        return { module: m, all, done, open, gradeTracked, gradeSecured, hoursLeft, next };
      }),
    [modules, tasks],
  );

  const unassigned = useMemo(
    () => tasks.filter((t) => !t.moduleCode || !modules.some((m) => m.code === t.moduleCode)),
    [tasks, modules],
  );

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError('');
    setEditor({ open: true, original: null });
  };

  const openEdit = (m) => {
    setForm({ code: m.code, name: m.name || '', lecturer: m.lecturer || '' });
    setError('');
    setEditor({ open: true, original: m });
  };

  const closeEditor = () => {
    setEditor({ open: false, original: null });
    setForm(EMPTY_FORM);
    setError('');
  };

  const save = (e) => {
    e.preventDefault();
    const code = form.code.trim().toUpperCase();

    if (!code) {
      setError('A module code is required.');
      return;
    }
    const isDuplicate =
      modules.some((m) => m.code === code) && (!editor.original || editor.original.code !== code);
    if (isDuplicate) {
      setError(`${code} already exists.`);
      return;
    }

    // Renaming a code: remove the old entry first
    if (editor.original && editor.original.code !== code) {
      deleteModule(editor.original.code);
    }

    upsertModule({
      code,
      name: form.name.trim(),
      lecturer: form.lecturer.trim(),
      color: editor.original?.color || 'brand',
    });

    pushToast({
      tone: 'success',
      title: editor.original ? 'Module updated' : 'Module added',
      message: code,
    });
    closeEditor();
  };

  const remove = (m) => {
    deleteModule(m.code);
    setConfirmDelete(null);
    pushToast({
      tone: 'info',
      title: 'Module removed',
      message: 'Its tasks are kept and shown as unassigned.',
    });
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Modules
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            {modules.length} {modules.length === 1 ? 'module' : 'modules'} this semester
          </p>
        </div>
        <Button size="md" onClick={openCreate}>
          <Icon.Plus className="h-4 w-4" strokeWidth={2.25} />
          Add module
        </Button>
      </div>

      {/* Modules */}
      {modules.length === 0 ? (
        <div className="surface">
          <EmptyState
            icon={<Icon.BookOpen className="h-5 w-5" />}
            title="No modules yet"
            description="Add the subjects you're taking so deadlines can be grouped and weighted by module."
            action={
              <Button size="sm" onClick={openCreate}>
                <Icon.Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
                Add your first module
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {summaries.map(
            ({ module: m, all, done, open, gradeTracked, gradeSecured, hoursLeft, next }) => (
              <div key={m.code} className="surface flex flex-col p-5">
                {/* Card header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-extrabold tracking-tight text-slate-900 dark:text-white">
                        {m.code}
                      </h2>
                      {open.length === 0 ? (
                        <Badge tone="success" size="xs">
                          All clear
                        </Badge>
                      ) : (
                        <Badge tone="neutral" size="xs">
                          {open.length} open
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs font-medium text-slate-600 dark:text-slate-400">
                      {m.name || 'Untitled module'}
                    </p>
                    {m.lecturer && (
                      <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-500">
                        {m.lecturer}
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEdit(m)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      title="Edit module"
                    >
                      <Icon.Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(m)}
                      className="flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      title="Remove module"
                    >
                      <Icon.Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                {/* Grade progress */}
                <div className="mt-4">
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      Assessment completed
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300">
                      {gradeSecured}% of {gradeTracked}% tracked
                    </span>
                  </div>
                  <Progress
                    value={gradeTracked ? (gradeSecured / gradeTracked) * 100 : 0}
                    color="success"
                    size="sm"
                  />
                </div>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: 'Tasks', value: all.length },
                    { label: 'Done', value: done.length },
                    { label: 'Hours left', value: `${hoursLeft}h` },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className="rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-800/50"
                    >
                      <p className="text-sm font-bold text-slate-900 dark:text-white">{s.value}</p>
                      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                        {s.label}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Next deadline */}
                <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                  {next ? (
                    <div className="flex items-center gap-2.5">
                      <Badge tone={priorityOf(next).rank} size="xs" dot>
                        {priorityOf(next).label}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                          {next.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Due {relativeDay(next.deadline)} · {next.weightage}%
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Nothing outstanding for this module.
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-2">
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => navigate('/app/tasks', { state: { moduleFilter: m.code } })}
                  >
                    View tasks
                  </Button>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => openNewTask({ moduleCode: m.code, moduleName: m.name })}
                  >
                    <Icon.Plus className="h-3 w-3" />
                    Add task
                  </Button>
                </div>
              </div>
            ),
          )}
        </div>
      )}

      {/* Unassigned tasks */}
      {unassigned.length > 0 && (
        <div className="surface overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <Icon.Info className="h-4 w-4 text-slate-400" />
            <div>
              <h3 className="heading-card">Not linked to a module</h3>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {unassigned.length} {unassigned.length === 1 ? 'task has' : 'tasks have'} no
                matching module code
              </p>
            </div>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {unassigned.slice(0, 6).map((t) => (
              <li key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-slate-900 dark:text-white">
                    {t.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.moduleCode ? `Code "${t.moduleCode}" not found` : 'No module set'} · Due{' '}
                    {relativeDay(t.deadline)}
                  </p>
                </div>
                {t.moduleCode && (
                  <Button
                    size="xs"
                    variant="secondary"
                    onClick={() => {
                      upsertModule({
                        code: t.moduleCode,
                        name: t.moduleName || '',
                        color: 'brand',
                      });
                      pushToast({ tone: 'success', title: `${t.moduleCode} added` });
                    }}
                  >
                    Create module
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Editor modal */}
      <Modal
        open={editor.open}
        onClose={closeEditor}
        title={editor.original ? 'Edit module' : 'Add module'}
        subtitle="Modules group your deadlines and track how much of your grade is settled."
        icon={<Icon.BookOpen className="h-4 w-4" />}
        size="md"
      >
        <form onSubmit={save} className="space-y-4">
          <Field
            label="Module code"
            htmlFor="mod-code"
            required
            error={error}
            hint="As it appears on your timetable, e.g. ET0421"
          >
            <Input
              id="mod-code"
              value={form.code}
              onChange={(e) => {
                setForm((f) => ({ ...f, code: e.target.value }));
                setError('');
              }}
              placeholder="ET0421"
              autoFocus
            />
          </Field>

          <Field label="Module name" htmlFor="mod-name">
            <Input
              id="mod-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Embedded Systems Design"
            />
          </Field>

          <Field label="Lecturer" htmlFor="mod-lecturer">
            <Input
              id="mod-lecturer"
              value={form.lecturer}
              onChange={(e) => setForm((f) => ({ ...f, lecturer: e.target.value }))}
              placeholder="Dr. Lim Wei Ming"
            />
          </Field>

          <div className="flex gap-2 pt-1">
            <Button type="submit" fullWidth>
              {editor.original ? 'Save changes' : 'Add module'}
            </Button>
            <Button type="button" variant="secondary" onClick={closeEditor}>
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal
        open={Boolean(confirmDelete)}
        onClose={() => setConfirmDelete(null)}
        title={`Remove ${confirmDelete?.code}?`}
        icon={<Icon.AlertTriangle className="h-4 w-4" />}
        size="sm"
      >
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          The module will be removed from your list. Any tasks using it are kept and will show as
          unassigned, so nothing is lost.
        </p>
        <div className="mt-5 flex gap-2">
          <Button variant="danger" fullWidth onClick={() => remove(confirmDelete)}>
            Remove module
          </Button>
          <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
            Cancel
          </Button>
        </div>
      </Modal>
    </div>
  );
}
