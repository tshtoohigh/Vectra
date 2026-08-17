import React, { useState, useEffect } from 'react';
import { Icon, Button, Modal, Badge, AwsChip, Textarea, Field } from '../ui/index.js';
import TaskFields, { defaultTaskDraft, validateTaskDraft } from './TaskFields.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { BedrockClient } from '../../services/aws/bedrockClient.js';

const EXAMPLES = [
  'Web dev assignment worth 30% due next Wednesday 11:59pm, about 8 hours',
  'ET0421 lab report due tomorrow, 20% of grade, 6h',
  'Data structures test in 5 days worth 25%',
  'Group presentation IT2154 next Monday, 3 hours, 15%',
];

export default function AiParseModal({ open, onClose }) {
  const { modules, createTask, pushToast } = useApp();

  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState(null); // raw Bedrock output
  const [draft, setDraft] = useState(null); // editable review state
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) return;
    // Reset after close so the next open starts fresh
    setText('');
    setParsing(false);
    setResult(null);
    setDraft(null);
    setErrors({});
  }, [open]);

  const parse = async () => {
    if (!text.trim()) return;
    setParsing(true);
    setErrors({});

    try {
      const parsed = await BedrockClient.parseNaturalLanguage(text.trim());
      setResult(parsed);

      // Only override defaults with fields the model actually resolved
      const preset = {};
      if (parsed.title) preset.title = parsed.title;
      if (parsed.moduleCode) {
        preset.moduleCode = parsed.moduleCode;
        preset.moduleName = modules.find((m) => m.code === parsed.moduleCode)?.name || '';
      }
      if (parsed.taskType) preset.taskType = parsed.taskType;
      if (parsed.deadline) preset.deadline = parsed.deadline;
      if (parsed.weightage != null) preset.weightage = parsed.weightage;
      if (parsed.hours != null) preset.hours = parsed.hours;

      setDraft(defaultTaskDraft(preset));
    } catch {
      pushToast({
        tone: 'error',
        title: 'Could not read that',
        message: 'Try rephrasing, or add the task manually.',
      });
    } finally {
      setParsing(false);
    }
  };

  const confirm = () => {
    const found = validateTaskDraft(draft);
    setErrors(found);
    if (Object.keys(found).length) return;

    createTask(draft);
    pushToast({ tone: 'success', title: 'Task added', message: draft.title });
    onClose();
  };

  // Which fields did the model fail to resolve? Surface that honestly.
  const missing = result
    ? [
        !result.deadline && 'due date',
        result.weightage == null && 'weighting',
        result.hours == null && 'effort estimate',
      ].filter(Boolean)
    : [];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Quick add"
      subtitle="Describe the deadline in your own words and we'll turn it into a task."
      icon={<Icon.Sparkles className="h-4 w-4" />}
      titleAccessory={<AwsChip service="Bedrock" />}
      size="lg"
      footer={
        draft ? (
          <div className="flex items-center gap-2">
            <Button onClick={confirm}>
              <Icon.Check className="h-4 w-4" strokeWidth={2.5} />
              Add task
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setDraft(null);
                setResult(null);
              }}
            >
              Start over
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={parse} loading={parsing} disabled={!text.trim()}>
              <Icon.Sparkles className="h-4 w-4" />
              Read it
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )
      }
    >
      {!draft ? (
        /* ---------- Step 1: input ---------- */
        <div className="space-y-4">
          <Field
            label="What's due?"
            htmlFor="ai-input"
            hint="Include the weighting and rough hours if you know them — that's what drives prioritisation."
          >
            <Textarea
              id="ai-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) parse();
              }}
              rows={3}
              autoFocus
              placeholder="Database assignment worth 30% due next Friday 11:59pm, probably 6 hours of work"
            />
          </Field>

          <div>
            <p className="label mb-2">Or start from an example</p>
            <div className="space-y-1.5">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="flex w-full items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-left transition-colors hover:border-brand-300 hover:bg-brand-50/50 dark:border-slate-700 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/5"
                >
                  <Icon.ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1 truncate text-xs text-slate-600 dark:text-slate-400">
                    {ex}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ---------- Step 2: review ---------- */
        <div className="space-y-4">
          {/* What was read */}
          <div className="rounded-lg border border-violet-200 bg-violet-50/60 p-3.5 dark:border-violet-500/25 dark:bg-violet-500/5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Icon.Bot className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">
                  What we read
                </span>
              </div>
              {result?.confidence != null && (
                <Badge tone="violet" size="xs">
                  {Math.round(result.confidence * 100)}% confident
                </Badge>
              )}
            </div>
            <p className="text-xs italic leading-relaxed text-slate-600 dark:text-slate-400">
              “{result?._rawInput || text}”
            </p>
          </div>

          {/* Honest gaps */}
          {missing.length > 0 && (
            <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/25 dark:bg-amber-500/5">
              <Icon.AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
                We couldn't work out the <strong>{missing.join(', ')}</strong> — we've filled in a
                sensible default. Please check it below before adding.
              </p>
            </div>
          )}

          <div className="divider" />

          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Confirm the details
          </p>

          <TaskFields
            draft={draft}
            errors={errors}
            modules={modules}
            onChange={setDraft}
            idPrefix="ai"
            compact
          />
        </div>
      )}
    </Modal>
  );
}
