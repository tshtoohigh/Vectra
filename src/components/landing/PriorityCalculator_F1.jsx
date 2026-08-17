import React, { useState, useMemo } from 'react';

export default function PriorityCalculator_F1() {
  const [weightage, setWeightage] = useState(25);
  const [daysLeft, setDaysLeft] = useState(5);

  const { score, label, color, bg } = useMemo(() => {
    const hoursLeft = daysLeft * 24;
    const raw = (weightage / (hoursLeft + 1)) * (1 + (6 * 0.7) / 10);
    const s = Math.min(10, Math.round(raw * 100) / 100);
    if (s >= 8)
      return {
        score: s,
        label: 'Critical — start tonight',
        color: 'text-red-600 dark:text-red-400',
        bg: 'bg-red-50 border-red-200 dark:bg-red-500/5 dark:border-red-500/25',
      };
    if (s >= 4)
      return {
        score: s,
        label: 'High — plan this week',
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-50 border-amber-200 dark:bg-amber-500/5 dark:border-amber-500/25',
      };
    if (s >= 2)
      return {
        score: s,
        label: 'On your radar',
        color: 'text-blue-600 dark:text-blue-400',
        bg: 'bg-blue-50 border-blue-200 dark:bg-blue-500/5 dark:border-blue-500/25',
      };
    return {
      score: s,
      label: 'Low — plenty of time',
      color: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-500/5 dark:border-emerald-500/25',
    };
  }, [weightage, daysLeft]);

  return (
    <section className="py-16 sm:py-24">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <h2 className="heading-section">See prioritization in action</h2>
          <p className="mt-4 text-base text-slate-600 dark:text-slate-400">
            Drag the sliders to see how grade weight and deadline proximity affect urgency.
          </p>
        </div>

        <div className="mx-auto max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-card dark:border-slate-800 dark:bg-slate-900">
          {/* Weightage slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Grade Weightage
              </label>
              <span className="text-sm font-bold text-slate-900 dark:text-white">{weightage}%</span>
            </div>
            <input
              type="range"
              min="5"
              max="50"
              step="5"
              value={weightage}
              onChange={(e) => setWeightage(Number(e.target.value))}
              className="w-full cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>5%</span>
              <span>25%</span>
              <span>50%</span>
            </div>
          </div>

          {/* Days slider */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Days Until Due
              </label>
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="14"
              step="1"
              value={daysLeft}
              onChange={(e) => setDaysLeft(Number(e.target.value))}
              className="w-full cursor-pointer accent-brand-600"
            />
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>1 day</span>
              <span>7 days</span>
              <span>14 days</span>
            </div>
          </div>

          {/* Result */}
          <div className={`rounded-lg border p-4 text-center transition-all duration-300 ${bg}`}>
            <p className={`text-2xl font-extrabold ${color}`}>{score.toFixed(1)}</p>
            <p className={`mt-1 text-sm font-semibold ${color}`}>{label}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
