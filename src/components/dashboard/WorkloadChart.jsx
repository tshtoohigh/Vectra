import React, { useState } from 'react';
import { Icon, Button, Badge, AwsChip } from '../ui/index.js';
import { BedrockClient } from '../../services/aws/bedrockClient.js';

export default function WorkloadChart({ workload, dailyHours, tasks, days = 14 }) {
  const [plan, setPlan] = useState('');
  const [planning, setPlanning] = useState(false);

  const visible = workload.slice(0, days);
  const overloaded = visible.filter((d) => d.isOverloaded);
  const peak = Math.max(dailyHours + 2, ...visible.map((d) => d.totalHours));
  const worst = overloaded.reduce(
    (acc, d) => (d.overloadAmount > (acc?.overloadAmount || 0) ? d : acc),
    null,
  );

  const barTone = (day) => {
    if (day.isOverloaded) return 'bg-red-500';
    if (day.totalHours >= dailyHours * 0.75) return 'bg-amber-500';
    if (day.totalHours > 0) return 'bg-emerald-500';
    return 'bg-transparent';
  };

  const requestPlan = async () => {
    setPlanning(true);
    try {
      const result = await BedrockClient.rebalanceWorkload(tasks, dailyHours);
      setPlan(result.suggestion);
    } catch {
      setPlan('Could not generate a plan right now. Try again in a moment.');
    } finally {
      setPlanning(false);
    }
  };

  return (
    <div className="surface p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="heading-card">Workload</h3>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            Hours of work left, grouped by due date
          </p>
        </div>
        {overloaded.length > 0 ? (
          <Badge tone="critical" size="sm" dot>
            {overloaded.length} heavy {overloaded.length === 1 ? 'day' : 'days'}
          </Badge>
        ) : (
          <Badge tone="low" size="sm" dot>
            Looking good
          </Badge>
        )}
      </div>

      {/* Overload callout */}
      {worst && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3.5 dark:border-red-500/25 dark:bg-red-500/5">
          <div className="flex items-start gap-2.5">
            <Icon.AlertTriangle className="mt-px h-4 w-4 shrink-0 text-red-600 dark:text-red-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-red-800 dark:text-red-300">
                {worst.dayName} {worst.dateLabel} looks heavy
              </p>
              <p className="mt-1 text-xs leading-relaxed text-red-700/90 dark:text-red-400/80">
                {worst.totalHours}h scheduled against your {dailyHours}h daily limit. Try spreading
                a few sub-tasks to earlier, lighter days to keep your week manageable.
              </p>

              {!plan && (
                <Button
                  size="xs"
                  variant="ai-soft"
                  className="mt-2.5"
                  loading={planning}
                  onClick={requestPlan}
                >
                  <Icon.Sparkles className="h-3 w-3" />
                  Suggest a plan
                </Button>
              )}
            </div>
          </div>

          {plan && (
            <div className="mt-3 rounded-lg border border-violet-200 bg-white p-3 dark:border-violet-500/25 dark:bg-slate-900">
              <div className="mb-1.5 flex items-center gap-2">
                <Icon.Bot className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
                <span className="text-xs font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400">
                  Suggested plan
                </span>
                <AwsChip service="Bedrock" />
              </div>
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">{plan}</p>
            </div>
          )}
        </div>
      )}

      {/* Bars */}
      <div className="mt-4 space-y-1.5">
        {visible.map((day) => {
          const isToday = day.date === new Date().toISOString().split('T')[0];
          return (
            <div key={day.date} className="group flex items-center gap-2.5">
              <span
                className={[
                  'w-9 shrink-0 text-xs font-semibold',
                  isToday
                    ? 'text-brand-600 dark:text-brand-400'
                    : 'text-slate-500 dark:text-slate-300',
                ].join(' ')}
              >
                {isToday ? 'Today' : day.dayName}
              </span>
              <span className="w-14 shrink-0 text-xs text-slate-500 dark:text-slate-400">
                {day.dateLabel}
              </span>

              <div className="relative h-5 min-w-0 flex-1 overflow-hidden rounded bg-slate-100 dark:bg-slate-800">
                <div
                  className={`h-full rounded transition-all duration-500 ${barTone(day)}`}
                  style={{
                    width: `${day.totalHours ? Math.min(100, (day.totalHours / peak) * 100) : 0}%`,
                  }}
                />
                {/* Capacity marker */}
                <span
                  className="absolute top-0 h-full w-px bg-slate-400/60 dark:bg-slate-500/60"
                  style={{ left: `${(dailyHours / peak) * 100}%` }}
                  aria-hidden="true"
                />
              </div>

              <span
                className={[
                  'w-10 shrink-0 text-right text-xs font-bold',
                  day.isOverloaded
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-slate-500 dark:text-slate-300',
                ].join(' ')}
              >
                {day.totalHours ? `${day.totalHours}h` : '—'}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
        {[
          ['bg-emerald-500', 'Comfortable'],
          ['bg-amber-500', 'Getting full'],
          ['bg-red-500', 'Over capacity'],
        ].map(([tone, label]) => (
          <span key={label} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-sm ${tone}`} />
            <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
          </span>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-slate-400/60" />
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {dailyHours}h daily limit
          </span>
        </span>
      </div>
    </div>
  );
}
