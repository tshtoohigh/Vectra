import React, { useState, useEffect } from 'react';
import { Icon, Button, Modal, Badge } from '../ui/index.js';
import TaskFields, { defaultTaskDraft, validateTaskDraft } from './TaskFields.jsx';
import { useApp } from '../../context/AppContext.jsx';

/**
 * Create or edit a task.
 * `task` is either an existing task (edit), a partial preset (create with
 * prefilled fields, e.g. from the calendar or a module card), or null.
 */
export default function TaskFormModal({ open, task, onClose }) {
  const { modules, createTask, updateTask, pushToast } = useApp();

  // A real task has an id; anything else is a preset for a new task.
  const isEdit = Boolean(task?.id);

  const [draft, setDraft] = useState(() => defaultTaskDraft(task || {}));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Reset whenever the modal is opened with a different task/preset
  useEffect(() => {
    if (!open) return;
    setDraft(isEdit ? { ...defaultTaskDraft(), ...task } : defaultTaskDraft(task || {}));
    setErrors({});
  }, [open, task, isEdit]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const found = validateTaskDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);

    if (isEdit) {
      updateTask(task.id, {
        title: draft.title.trim(),
        moduleCode: draft.moduleCode.trim().toUpperCase(),
        moduleName: draft.moduleName?.trim() || '',
        taskType: draft.taskType,
        deadline: draft.deadline,
        hours: Number(draft.hours) || 1,
        weightage: Number(draft.weightage) || 0,
        isGroup: Boolean(draft.isGroup),
        notes: draft.notes?.trim() || '',
      });
      pushToast({ tone: 'success', title: 'Task updated', message: draft.title.trim() });
    } else {
      createTask(draft);
      pushToast({ tone: 'success', title: 'Task added', message: draft.title.trim() });
    }

    setSaving(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit task' : 'New task'}
      subtitle={
        isEdit
          ? 'Changes recalculate the priority immediately.'
          : 'Weighting and effort are what make prioritisation useful — rough numbers are fine.'
      }
      icon={isEdit ? <Icon.Pencil className="h-4 w-4" /> : <Icon.Plus className="h-4 w-4" />}
      titleAccessory={
        isEdit && task?.status === 'Completed' ? (
          <Badge tone="success" size="xs">
            Completed
          </Badge>
        ) : null
      }
      size="lg"
      footer={
        <div className="flex items-center gap-2">
          <Button type="submit" form="task-form" loading={saving}>
            {isEdit ? 'Save changes' : 'Add task'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {isEdit && (
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {task.progress || 0}% complete
            </span>
          )}
        </div>
      }
    >
      <form id="task-form" onSubmit={handleSubmit}>
        <TaskFields draft={draft} errors={errors} modules={modules} onChange={setDraft} />
      </form>
    </Modal>
  );
}
