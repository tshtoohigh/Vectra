import React, { useState, useEffect, useCallback } from 'react';
import { Icon, Button, Modal, Badge, AwsChip, Input } from '../ui/index.js';
import { useApp } from '../../context/AppContext.jsx';
import { BedrockClient } from '../../services/aws/bedrockClient.js';
import { toInputValue, relativeDay } from '../../utils/format.js';
import { shortId } from '../../utils/id.js';

const newMilestoneId = () => shortId('sub_');

export default function DecomposeDrawer({ task, onClose }) {
  const { setSubtasks, pushToast } = useApp();

  const [loading, setLoading] = useState(false);
  const [reasoning, setReasoning] = useState('');
  const [milestones, setMilestones] = useState([]);
  const [failed, setFailed] = useState(false);

  const open = Boolean(task);

  const run = useCallback(async () => {
    if (!task) return;
    setLoading(true);
    setFailed(false);

    try {
      const result = await BedrockClient.decomposeTask(task);
      setMilestones(result.subtasks || []);
      setReasoning(result.reasoning || '');
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [task]);

  useEffect(() => {
    if (!open) {
      setMilestones([]);
      setReasoning('');
      setFailed(false);
      return;
    }
    run();
  }, [open, run]);

  const updateMilestone = (id, patch) => {
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, ...patch } : m)));
  };

  const removeMilestone = (id) => {
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  };

  const addMilestone = () => {
    const last = milestones[milestones.length - 1];
    const base = last?.dueDate ? new Date(last.dueDate) : new Date();
    base.setDate(base.getDate() + 1);
    base.setHours(23, 59, 0, 0);

    setMilestones((prev) => [
      ...prev,
      {
        id: newMilestoneId(),
        title: '',
        hours: 1,
        done: false,
        dueDate: (task?.deadline && new Date(task.deadline) < base
          ? new Date(task.deadline)
          : base
        ).toISOString(),
      },
    ]);
  };

  const save = () => {
    const cleaned = milestones
      .filter((m) => m.title.trim())
      .map((m) => ({
        id: m.id,
        title: m.title.trim(),
        hours: Number(m.hours) || 0.5,
        done: Boolean(m.done),
        dueDate: m.dueDate,
      }));

    if (!cleaned.length) {
      pushToast({ tone: 'warning', title: 'Add at least one milestone with a title' });
      return;
    }

    setSubtasks(task.id, cleaned);
    pushToast({
      tone: 'success',
      title: 'Milestones saved',
      message: `${cleaned.length} steps added to "${task.title}".`,
    });
    onClose();
  };

  const totalHours = milestones.reduce((s, m) => s + (Number(m.hours) || 0), 0);
  const estimateGap = task ? Math.round((totalHours - (task.hours || 0)) * 10) / 10 : 0;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Break this into milestones"
      subtitle={task?.title}
      icon={<Icon.Layers className="h-4 w-4" />}
      titleAccessory={<AwsChip service="Bedrock" />}
      size="xl"
      footer={
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={save} disabled={loading || !milestones.length}>
            <Icon.Check className="h-4 w-4" strokeWidth={2.5} />
            Save {milestones.length || ''} milestone{milestones.length === 1 ? '' : 's'}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {!loading && milestones.length > 0 && (
            <span className="ml-auto text-xs text-slate-500 dark:text-slate-400">
              {Math.round(totalHours * 10) / 10}h planned
              {estimateGap !== 0 && (
                <>
                  {' · '}
                  <span
                    className={
                      estimateGap > 0
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    {estimateGap > 0 ? `${estimateGap}h over` : `${Math.abs(estimateGap)}h under`}{' '}
                    your {task.hours}h estimate
                  </span>
                </>
              )}
            </span>
          )}
        </div>
      }
    >
      {loading ? (
        /* ---------- Loading ---------- */
        <div className="py-8">
          <div className="mb-5 flex items-center justify-center gap-2.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-500/15">
              <Icon.Sparkles className="h-4 w-4 animate-pulse text-violet-600 dark:text-violet-400" />
            </span>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
              Working out a sensible order…
            </p>
          </div>
          <div className="space-y-2.5">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-lg border border-slate-200 p-3 dark:border-slate-800"
              >
                <div className="h-6 w-6 shrink-0 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-2.5 w-2/3 animate-pulse rounded bg-slate-200 dark:bg-slate-800" />
                  <div className="h-2 w-1/3 animate-pulse rounded bg-slate-100 dark:bg-slate-800/60" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : failed ? (
        /* ---------- Failure ---------- */
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <Icon.AlertTriangle className="h-5 w-5" />
          </span>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            Couldn't generate a breakdown
          </p>
          <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">
            Something went wrong reaching the planner. You can retry, or add milestones yourself.
          </p>
          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={run}>
              Try again
            </Button>
            <Button size="sm" variant="secondary" onClick={addMilestone}>
              <Icon.Plus className="h-3.5 w-3.5" />
              Add manually
            </Button>
          </div>
        </div>
      ) : (
        /* ---------- Review & edit ---------- */
        <div className="space-y-4">
          {/* Reasoning */}
          {reasoning && (
            <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3.5 dark:border-violet-500/25 dark:bg-violet-500/5">
              <div className="mb-1.5 flex items-center gap-2">
                <Icon.Bot className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">
                  How this was split
                </span>
              </div>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                {reasoning}
              </p>
            </div>
          )}

          {/* Task context */}
          {task && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg bg-slate-50 px-3.5 py-2.5 dark:bg-slate-800/50">
              {[
                ['Module', task.moduleCode || '—'],
                ['Weighting', `${task.weightage}%`],
                ['Estimate', `${task.hours}h`],
                ['Due', relativeDay(task.deadline)],
              ].map(([k, v]) => (
                <span key={k} className="text-xs">
                  <span className="text-slate-500 dark:text-slate-400">{k}: </span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{v}</span>
                </span>
              ))}
            </div>
          )}

          <div className="divider" />

          {/* Editable milestones */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Milestones — edit anything before saving
              </p>
              <Badge tone="neutral" size="xs">
                {milestones.length} steps
              </Badge>
            </div>

            <div className="space-y-2">
              {milestones.map((m, index) => (
                <div
                  key={m.id}
                  className="rounded-lg border border-slate-200 p-3 transition-colors hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600"
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={m.title}
                        onChange={(e) => updateMilestone(m.id, { title: e.target.value })}
                        placeholder="What needs doing in this step?"
                        className="h-8 text-xs"
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <label className="inline-flex items-center gap-1.5">
                          <Icon.Timer className="h-3 w-3 text-slate-400" />
                          <Input
                            type="number"
                            min="0.5"
                            step="0.5"
                            value={m.hours}
                            onChange={(e) =>
                              updateMilestone(m.id, {
                                hours: e.target.value === '' ? '' : Number(e.target.value),
                              })
                            }
                            className="h-7 w-16 text-xs"
                            aria-label={`Hours for step ${index + 1}`}
                          />
                          <span className="text-xs text-slate-500 dark:text-slate-400">h</span>
                        </label>

                        <label className="inline-flex items-center gap-1.5">
                          <Icon.Calendar className="h-3 w-3 text-slate-400" />
                          <Input
                            type="datetime-local"
                            value={toInputValue(m.dueDate)}
                            onChange={(e) =>
                              updateMilestone(m.id, {
                                dueDate: e.target.value
                                  ? new Date(e.target.value).toISOString()
                                  : m.dueDate,
                              })
                            }
                            className="h-7 w-auto text-xs"
                            aria-label={`Due date for step ${index + 1}`}
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeMilestone(m.id)}
                      className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                      aria-label={`Remove step ${index + 1}`}
                    >
                      <Icon.X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <Button variant="secondary" size="sm" className="mt-2.5" onClick={addMilestone}>
              <Icon.Plus className="h-3.5 w-3.5" strokeWidth={2.25} />
              Add a step
            </Button>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <Icon.Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Ticking milestones off updates the task's progress automatically, which feeds back
              into its priority.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
}
