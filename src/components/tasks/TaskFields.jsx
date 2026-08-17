import React from 'react';
import { Field, Input, Select, Textarea, Icon } from '../ui/index.js';
import { toInputValue } from '../../utils/format.js';

export const TASK_TYPES = ['Assignment', 'Test', 'Project', 'Presentation', 'Practical'];

/** Sensible default for a brand new task: tomorrow, end of day. */
export function defaultTaskDraft(preset = {}) {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(23, 59, 0, 0);

  return {
    title: '',
    moduleCode: '',
    moduleName: '',
    taskType: 'Assignment',
    deadline: tomorrow.toISOString(),
    hours: 4,
    weightage: 10,
    isGroup: false,
    notes: '',
    ...preset,
  };
}

export function validateTaskDraft(draft) {
  const errors = {};
  if (!draft.title?.trim()) errors.title = 'Give the task a title.';
  if (!draft.deadline) errors.deadline = 'A due date is required.';
  else if (Number.isNaN(new Date(draft.deadline).getTime())) {
    errors.deadline = 'That date is not valid.';
  }
  if (draft.weightage < 0 || draft.weightage > 100) {
    errors.weightage = 'Weighting must be between 0 and 100.';
  }
  if (draft.hours <= 0) errors.hours = 'Estimate must be more than zero.';
  return errors;
}

/**
 * The canonical set of task inputs.
 * Shared by the manual form and by the AI / Textract review steps so a task
 * created any of those ways ends up with exactly the same shape.
 */
export default function TaskFields({
  draft,
  errors = {},
  modules = [],
  onChange,
  idPrefix = 'task',
  compact = false,
}) {
  const set = (key) => (e) => {
    const raw = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    onChange({ ...draft, [key]: raw });
  };

  const setNumber = (key) => (e) => {
    onChange({ ...draft, [key]: e.target.value === '' ? '' : Number(e.target.value) });
  };

  const setDeadline = (e) => {
    const v = e.target.value;
    onChange({ ...draft, deadline: v ? new Date(v).toISOString() : '' });
  };

  const setModule = (e) => {
    const code = e.target.value.toUpperCase();
    const match = modules.find((m) => m.code === code);
    onChange({ ...draft, moduleCode: code, moduleName: match?.name || draft.moduleName || '' });
  };

  const listId = `${idPrefix}-module-codes`;

  return (
    <div className="space-y-4">
      <Field label="Title" htmlFor={`${idPrefix}-title`} required error={errors.title}>
        <Input
          id={`${idPrefix}-title`}
          value={draft.title}
          onChange={set('title')}
          placeholder="Lab 4 Report — PWM Motor Control"
          autoFocus={!compact}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Module"
          htmlFor={`${idPrefix}-module`}
          hint={modules.length ? 'Pick one or type a new code' : undefined}
        >
          <Input
            id={`${idPrefix}-module`}
            value={draft.moduleCode}
            onChange={setModule}
            placeholder="ET0421"
            list={listId}
          />
          <datalist id={listId}>
            {modules.map((m) => (
              <option key={m.code} value={m.code}>
                {m.name}
              </option>
            ))}
          </datalist>
        </Field>

        <Field label="Type" htmlFor={`${idPrefix}-type`}>
          <Select id={`${idPrefix}-type`} value={draft.taskType} onChange={set('taskType')}>
            {TASK_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Due" htmlFor={`${idPrefix}-deadline`} required error={errors.deadline}>
        <Input
          id={`${idPrefix}-deadline`}
          type="datetime-local"
          value={toInputValue(draft.deadline)}
          onChange={setDeadline}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Effort estimate"
          htmlFor={`${idPrefix}-hours`}
          error={errors.hours}
          hint="Hours of work in total"
        >
          <Input
            id={`${idPrefix}-hours`}
            type="number"
            min="0.5"
            step="0.5"
            value={draft.hours}
            onChange={setNumber('hours')}
          />
        </Field>

        <Field
          label="Grade weighting"
          htmlFor={`${idPrefix}-weightage`}
          error={errors.weightage}
          hint="Percent of the module grade"
        >
          <Input
            id={`${idPrefix}-weightage`}
            type="number"
            min="0"
            max="100"
            step="1"
            value={draft.weightage}
            onChange={setNumber('weightage')}
          />
        </Field>
      </div>

      <label
        htmlFor={`${idPrefix}-group`}
        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/50"
      >
        <input
          id={`${idPrefix}-group`}
          type="checkbox"
          checked={Boolean(draft.isGroup)}
          onChange={set('isGroup')}
          className="checkbox mt-0.5"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-900 dark:text-white">
            <Icon.Users className="h-3.5 w-3.5 text-slate-400" />
            Group work
          </span>
          <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">
            Flagged separately so you can plan around your teammates.
          </span>
        </span>
      </label>

      {!compact && (
        <Field
          label="Notes"
          htmlFor={`${idPrefix}-notes`}
          hint="Requirements, rubric details, anything useful"
        >
          <Textarea
            id={`${idPrefix}-notes`}
            value={draft.notes}
            onChange={set('notes')}
            rows={3}
            placeholder="Include oscilloscope screenshots and duty-cycle calculations."
          />
        </Field>
      )}
    </div>
  );
}
