/**
 * PolyTrack Priority Scoring Engine
 *
 * Dynamic priority scoring algorithm:
 * P = (Weightage / (TimeRemaining + 1)) × (1 + (Effort × (1 - Progress)) / 10)
 *
 * Factors:
 * - Weightage (W): Grade contribution percentage (0-100)
 * - TimeRemaining (T): Hours until deadline
 * - Effort (E): Estimated hours of work remaining
 * - Progress (C): Completion percentage (0-1)
 *
 * Score ranges map to priority ranks (see getRank below):
 * - >= 8.0  Critical  (red)
 * - >= 4.0  High      (amber)
 * - >= 2.0  Medium    (blue)
 * -  < 2.0  Low       (emerald)
 *
 * Overdue tasks are always Critical regardless of score.
 */

/**
 * Calculate priority score for a single task
 * @param {object} task - Task object with deadline, weightage, hours, progress
 * @returns {object} { score, rank, color, label }
 */
export function calculatePriority(task) {
  const W = task.weightage || 10; // Grade weightage %
  const T = getHoursRemaining(task.deadline); // Hours until due
  const E = task.hours || task.estimatedHours || 4; // Estimated effort (hours)
  const C = (task.progress || 0) / 100; // Progress as decimal (0-1)

  // Core formula: P = (W / (T + 1)) × (1 + (E × (1 - C)) / 10)
  const timeComponent = W / (Math.max(T, 0) + 1);
  const effortComponent = 1 + (E * (1 - C)) / 10;
  const rawScore = timeComponent * effortComponent;

  // Normalize to 0-10 scale for display
  const score = Math.min(10, Math.round(rawScore * 100) / 100);

  // Determine rank
  const { rank, color, label } = getRank(score, T);

  return { score, rank, color, label };
}

/**
 * Get hours remaining until deadline
 */
export function getHoursRemaining(deadline) {
  if (!deadline) return 999;
  return Math.max(0, (new Date(deadline).getTime() - Date.now()) / 3600000);
}

/**
 * Map score to priority rank with override for overdue tasks
 */
function getRank(score, hoursRemaining) {
  // Overdue tasks are always critical
  if (hoursRemaining <= 0) {
    return { rank: 'critical', color: 'red', label: 'Critical' };
  }

  if (score >= 8.0) return { rank: 'critical', color: 'red', label: 'Critical' };
  if (score >= 4.0) return { rank: 'high', color: 'amber', label: 'High' };
  if (score >= 2.0) return { rank: 'medium', color: 'blue', label: 'Medium' };
  return { rank: 'low', color: 'emerald', label: 'Low' };
}

/**
 * Sort tasks by priority (highest first)
 */
export function sortByPriority(tasks) {
  return [...tasks].sort((a, b) => {
    const pa = calculatePriority(a);
    const pb = calculatePriority(b);
    return pb.score - pa.score;
  });
}

/**
 * Get priority badge CSS class
 */
export function getPriorityBadgeClass(rank) {
  const classes = {
    critical: 'badge-critical',
    high: 'badge-high',
    medium: 'badge-medium',
    low: 'badge-low',
  };
  return classes[rank] || 'badge-medium';
}

/**
 * Format time remaining as human-readable countdown
 */
export function formatCountdown(deadline) {
  const hrs = getHoursRemaining(deadline);
  if (hrs <= 0) return 'OVERDUE';
  if (hrs < 1) return `${Math.round(hrs * 60)}m`;
  if (hrs < 24) return `${Math.round(hrs)}h`;
  const days = Math.floor(hrs / 24);
  const remainHrs = Math.round(hrs % 24);
  if (days < 7) return `${days}d ${remainHrs}h`;
  return `${days}d`;
}

/**
 * Determine if a task should trigger an urgency alert
 * Condition: TimeRemaining < 48h AND Progress < 40% AND Weightage > 20%
 */
export function isHighRisk(task) {
  const hrs = getHoursRemaining(task.deadline);
  const progress = task.progress || 0;
  const weightage = task.weightage || 10;
  return hrs > 0 && hrs < 48 && progress < 40 && weightage > 20;
}

/**
 * Calculate daily workload from tasks
 * @param {Array} tasks - All active tasks
 * @param {number} daysAhead - Number of days to calculate
 * @returns {Array} Daily workload breakdown
 */
export function calculateDailyWorkload(tasks, daysAhead = 14) {
  const days = [];
  const activeTasks = tasks.filter((t) => t.status !== 'Completed');

  for (let i = 0; i < daysAhead; i++) {
    const dayDate = new Date(Date.now() + i * 86400000);
    const dateStr = dayDate.toISOString().split('T')[0];

    // Tasks due on this day
    const dueTasks = activeTasks.filter((t) => {
      return t.deadline && t.deadline.split('T')[0] === dateStr;
    });

    // Calculate remaining effort for tasks due this day
    const taskDetails = dueTasks.map((t) => ({
      id: t.id,
      title: t.title,
      hours: Math.round((t.hours || 4) * (1 - (t.progress || 0) / 100) * 10) / 10,
      moduleCode: t.moduleCode,
      priority: calculatePriority(t),
    }));

    const totalHours = taskDetails.reduce((sum, t) => sum + t.hours, 0);

    days.push({
      date: dateStr,
      dayName: dayDate.toLocaleDateString('en', { weekday: 'short' }),
      dateLabel: dayDate.toLocaleDateString('en', { day: 'numeric', month: 'short' }),
      tasks: taskDetails,
      totalHours: Math.round(totalHours * 10) / 10,
      isOverloaded: false, // Will be set by the consumer based on dailyHours
    });
  }

  return days;
}

/**
 * Detect overloaded days given a daily capacity
 */
export function detectOverloads(workload, dailyCapacity = 4) {
  return workload.map((day) => ({
    ...day,
    isOverloaded: day.totalHours > dailyCapacity,
    overloadAmount: Math.max(0, day.totalHours - dailyCapacity),
  }));
}

export default {
  calculatePriority,
  getHoursRemaining,
  sortByPriority,
  getPriorityBadgeClass,
  formatCountdown,
  isHighRisk,
  calculateDailyWorkload,
  detectOverloads,
};
