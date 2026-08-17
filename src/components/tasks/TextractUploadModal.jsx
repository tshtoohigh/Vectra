import React, { useState, useEffect, useRef } from 'react';
import { Icon, Button, Modal, Badge, AwsChip } from '../ui/index.js';
import TaskFields, { defaultTaskDraft, validateTaskDraft } from './TaskFields.jsx';
import { useApp } from '../../context/AppContext.jsx';
import { TextractClient } from '../../services/aws/textractClient.js';

const ACCEPTED = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_BYTES = 10 * 1024 * 1024;

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function TextractUploadModal({ open, onClose }) {
  const { modules, createTask, pushToast } = useApp();

  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [draft, setDraft] = useState(null);
  const [errors, setErrors] = useState({});
  const [dragging, setDragging] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (open) return;
    setFile(null);
    setFileError('');
    setProcessing(false);
    setResult(null);
    setDraft(null);
    setErrors({});
    setDragging(false);
  }, [open]);

  const acceptFile = (candidate) => {
    if (!candidate) return;
    if (!ACCEPTED.includes(candidate.type)) {
      setFileError('That file type is not supported. Upload a PDF, PNG or JPG.');
      return;
    }
    if (candidate.size > MAX_BYTES) {
      setFileError('That file is over the 10 MB limit.');
      return;
    }
    setFileError('');
    setFile(candidate);
    setResult(null);
    setDraft(null);
  };

  const extract = async () => {
    if (!file) return;
    setProcessing(true);

    try {
      const extracted = await TextractClient.processDocument(file);
      setResult(extracted);

      const preset = {};
      if (extracted.title) preset.title = extracted.title;
      if (extracted.moduleCode) {
        preset.moduleCode = extracted.moduleCode;
        preset.moduleName = modules.find((m) => m.code === extracted.moduleCode)?.name || '';
      }
      if (extracted.taskType) preset.taskType = extracted.taskType;
      if (extracted.weightage != null) preset.weightage = extracted.weightage;

      // Textract gives us no reliable due date — default a week out and flag it.
      const inAWeek = new Date();
      inAWeek.setDate(inAWeek.getDate() + 7);
      inAWeek.setHours(23, 59, 0, 0);
      preset.deadline = inAWeek.toISOString();
      preset.notes = `Extracted from ${file.name}`;

      setDraft(defaultTaskDraft(preset));
    } catch {
      pushToast({
        tone: 'error',
        title: 'Could not read that document',
        message: 'Try a clearer scan, or add the task manually.',
      });
    } finally {
      setProcessing(false);
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upload assignment brief"
      subtitle="We'll pull out the module, type and weighting so you don't have to retype them."
      icon={<Icon.FileText className="h-4 w-4" />}
      titleAccessory={<AwsChip service="Textract" />}
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
                setFile(null);
              }}
            >
              Try another file
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button onClick={extract} loading={processing} disabled={!file}>
              <Icon.Sparkles className="h-4 w-4" />
              {processing ? 'Reading document' : 'Extract details'}
            </Button>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
          </div>
        )
      }
    >
      {!draft ? (
        /* ---------- Step 1: pick a file ---------- */
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            className={[
              'flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 transition-colors',
              dragging
                ? 'border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/5'
                : file
                  ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-500/5'
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:hover:border-slate-600 dark:hover:bg-slate-800/40',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg"
              className="hidden"
              onChange={(e) => acceptFile(e.target.files?.[0])}
            />

            <span
              className={[
                'mb-3 flex h-11 w-11 items-center justify-center rounded-xl',
                file
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400'
                  : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500',
              ].join(' ')}
            >
              {file ? (
                <Icon.CircleCheck className="h-5 w-5" />
              ) : (
                <Icon.Upload className="h-5 w-5" />
              )}
            </span>

            {file ? (
              <>
                <span className="max-w-full truncate text-sm font-semibold text-slate-900 dark:text-white">
                  {file.name}
                </span>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {formatSize(file.size)} · click to choose a different file
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-semibold text-slate-900 dark:text-white">
                  Drop your brief here, or click to browse
                </span>
                <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  PDF, PNG or JPG · up to 10 MB
                </span>
              </>
            )}
          </button>

          {fileError && (
            <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-500/25 dark:bg-red-500/10">
              <Icon.AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-red-600 dark:text-red-400" />
              <p className="text-xs font-medium text-red-700 dark:text-red-300">{fileError}</p>
            </div>
          )}

          <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
            <Icon.Info className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
            <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              Everything extracted is shown for you to confirm before the task is created — nothing
              is saved automatically. Due dates in particular are worth double-checking.
            </p>
          </div>
        </div>
      ) : (
        /* ---------- Step 2: review ---------- */
        <div className="space-y-4">
          {/* Extraction summary */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Icon.FileText className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="truncate text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {file?.name}
                </span>
                {result?.documentType && (
                  <Badge tone="neutral" size="xs">
                    {result.documentType}
                  </Badge>
                )}
              </div>
              {result?.confidence != null && (
                <Badge tone="brand" size="xs">
                  {Math.round(result.confidence * 100)}% confident
                </Badge>
              )}
            </div>

            {result?.fields?.length > 0 && (
              <dl className="divide-y divide-slate-200 dark:divide-slate-700">
                {result.fields.map((f) => (
                  <div key={f.key} className="flex items-center justify-between gap-3 py-1.5">
                    <dt className="text-xs text-slate-500 dark:text-slate-400">{f.key}</dt>
                    <dd className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {f.value}
                      </span>
                      <span
                        className={[
                          'text-xs font-medium',
                          f.confidence >= 0.85
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : f.confidence >= 0.7
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-red-600 dark:text-red-400',
                        ].join(' ')}
                      >
                        {Math.round(f.confidence * 100)}%
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Deadline warning — Textract can't reliably read due dates */}
          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-500/25 dark:bg-amber-500/5">
            <Icon.AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-xs leading-relaxed text-amber-800 dark:text-amber-300">
              <strong>Set the due date yourself.</strong> We've defaulted it to a week from now —
              document dates are easy to misread, so confirm it against your brief.
            </p>
          </div>

          <div className="divider" />

          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Confirm the details
          </p>

          <TaskFields
            draft={draft}
            errors={errors}
            modules={modules}
            onChange={setDraft}
            idPrefix="tx"
            compact
          />
        </div>
      )}
    </Modal>
  );
}
