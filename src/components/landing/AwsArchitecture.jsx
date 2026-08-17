import React from 'react';
import { Icon } from '../ui/index.js';

const SERVICES = [
  {
    name: 'Cognito',
    role: 'Accounts & sessions',
    Glyph: Icon.Shield,
    detail:
      'Sign-up, sign-in and JWT-backed sessions so each student only ever sees their own data.',
  },
  {
    name: 'API Gateway',
    role: 'REST entry point',
    Glyph: Icon.Cloud,
    detail:
      'Single HTTPS surface for every client call, routed straight through to Lambda handlers.',
  },
  {
    name: 'Lambda',
    role: 'Application logic',
    Glyph: Icon.Zap,
    detail: 'Task CRUD, priority scoring and scheduled deadline sweeps — no servers to keep alive.',
  },
  {
    name: 'DynamoDB',
    role: 'Data store',
    Glyph: Icon.Database,
    detail: 'Single-table design keyed by USER#<id> / TASK#<id> for fast per-student queries.',
  },
  {
    name: 'Bedrock',
    role: 'AI reasoning',
    Glyph: Icon.Sparkles,
    detail:
      'Claude models parse plain-English input, split projects into milestones and explain priority.',
  },
  {
    name: 'Textract',
    role: 'Document parsing',
    Glyph: Icon.FileText,
    detail: 'Pulls module codes, dates and weightings out of uploaded briefs and rubrics.',
  },
  {
    name: 'EventBridge',
    role: 'Scheduling',
    Glyph: Icon.Clock,
    detail: 'Cron rule wakes a Lambda on a fixed interval to re-check what is now at risk.',
  },
  {
    name: 'SNS & SES',
    role: 'Notifications',
    Glyph: Icon.Bell,
    detail: 'Push alerts for urgent tasks, plus an optional morning email digest.',
  },
];

const FLOW = [
  { label: 'Student adds a task', sub: 'Typed, pasted or uploaded' },
  { label: 'API Gateway → Lambda', sub: 'Validated and scored' },
  { label: 'Bedrock enriches it', sub: 'Parsing, milestones, reasoning' },
  { label: 'Saved to DynamoDB', sub: 'Per-student partition' },
  { label: 'EventBridge re-checks', sub: 'On a schedule' },
  { label: 'SNS / SES notifies', sub: 'Only when at risk' },
];

export default function AwsArchitecture() {
  return (
    <section id="architecture" className="scroll-mt-20 py-16 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <Icon.Cloud className="h-4 w-4 text-slate-400" />
            <p className="eyebrow !text-slate-500 dark:!text-slate-400">Architecture</p>
          </div>
          <h2 className="heading-section">Serverless from end to end</h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Eight AWS services, each doing one job. Scales to a whole cohort and costs almost
            nothing when nobody is studying.
          </p>
        </div>

        {/* Request flow */}
        <div className="mt-12 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/50">
          <p className="mb-4 text-center text-xs font-bold uppercase tracking-widest text-slate-400">
            Lifecycle of one deadline
          </p>
          <ol className="flex flex-col gap-2 lg:flex-row lg:items-stretch">
            {FLOW.map((step, i) => (
              <React.Fragment key={step.label}>
                <li className="flex flex-1 items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 lg:flex-col lg:items-start lg:text-left dark:border-slate-800 dark:bg-slate-900">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-brand-600 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold leading-tight text-slate-900 dark:text-white">
                      {step.label}
                    </p>
                    <p className="mt-0.5 text-[11px] leading-tight text-slate-500 dark:text-slate-400">
                      {step.sub}
                    </p>
                  </div>
                </li>
                {i < FLOW.length - 1 && (
                  <li
                    className="flex items-center justify-center text-slate-300 lg:px-0.5 dark:text-slate-700"
                    aria-hidden="true"
                  >
                    <Icon.ChevronDown className="h-4 w-4 lg:hidden" />
                    <Icon.ChevronRight className="hidden h-4 w-4 lg:block" />
                  </li>
                )}
              </React.Fragment>
            ))}
          </ol>
        </div>

        {/* Service grid */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ name, role, Glyph, detail }) => (
            <div
              key={name}
              className="rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  <Glyph className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-900 dark:text-white">
                    {name}
                  </p>
                  <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">{role}</p>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                {detail}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
