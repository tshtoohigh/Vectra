/**
 * Amazon SNS / SES Notification Service
 *
 * Delivers urgent push notifications (SNS) and daily digest emails (SES)
 * when tasks enter critical risk states.
 *
 * Trigger conditions:
 * - Time Remaining < 48 hours AND Progress < 40% AND Weightage > 20%
 * - Task overdue (any)
 * - Workload exceeds daily capacity
 *
 * Production: @aws-sdk/client-sns PublishCommand, @aws-sdk/client-ses SendEmailCommand
 * Demo: Browser toast notifications + notification queue
 */

let notificationQueue = [];
let notificationCallbacks = [];

export const SNSNotifier = {
  /**
   * Register a callback for when notifications are triggered
   */
  onNotification(callback) {
    notificationCallbacks.push(callback);
    return () => {
      notificationCallbacks = notificationCallbacks.filter((cb) => cb !== callback);
    };
  },

  /**
   * Check all tasks and generate notifications for critical ones
   */
  checkAndNotify(tasks) {
    const now = Date.now();
    const newNotifs = [];

    tasks.forEach((task) => {
      if (task.status === 'Completed') return;

      const hoursRemaining = (new Date(task.deadline).getTime() - now) / 3600000;
      const progress = task.progress || 0;
      const weightage = task.weightage || 10;

      // CRITICAL: Due in < 48h AND progress < 40% AND weightage > 20%
      if (hoursRemaining > 0 && hoursRemaining < 48 && progress < 40 && weightage > 20) {
        newNotifs.push({
          id: `notif_${task.id}_critical`,
          type: 'critical',
          service: 'SNS',
          title: 'At risk of being late',
          message: `${task.moduleCode ? task.moduleCode + ' — ' : ''}"${task.title}" is due in ${Math.round(hoursRemaining)}h but only ${progress}% done. It carries ${weightage}% of your grade.`,
          task,
          timestamp: new Date().toISOString(),
        });
      }

      // URGENT: Due in < 24h
      if (hoursRemaining > 0 && hoursRemaining < 24 && progress < 80) {
        newNotifs.push({
          id: `notif_${task.id}_urgent`,
          type: 'urgent',
          service: 'SNS',
          title: 'Due within 24 hours',
          message: `${task.moduleCode ? task.moduleCode + ' — ' : ''}"${task.title}" is due in ${Math.round(hoursRemaining)} hours.`,
          task,
          timestamp: new Date().toISOString(),
        });
      }

      // OVERDUE
      if (hoursRemaining <= 0) {
        newNotifs.push({
          id: `notif_${task.id}_overdue`,
          type: 'overdue',
          service: 'SES',
          title: 'Overdue',
          message: `${task.moduleCode ? task.moduleCode + ' — ' : ''}"${task.title}" was due ${Math.abs(Math.round(hoursRemaining))}h ago.`,
          task,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Deduplicate
    const existing = new Set(notificationQueue.map((n) => n.id));
    const fresh = newNotifs.filter((n) => !existing.has(n.id));

    if (fresh.length > 0) {
      notificationQueue = [...fresh, ...notificationQueue].slice(0, 20);
      notificationCallbacks.forEach((cb) => cb(fresh));
    }

    return fresh;
  },

  /**
   * Get all pending notifications
   */
  getNotifications() {
    return notificationQueue;
  },

  /**
   * Dismiss a notification
   */
  dismiss(notifId) {
    notificationQueue = notificationQueue.filter((n) => n.id !== notifId);
  },

  /**
   * Clear all notifications
   */
  clearAll() {
    notificationQueue = [];
  },

  /**
   * Simulate sending email digest (SES)
   */
  async sendDailyDigest(tasks, userEmail) {
    // Production: SES SendEmailCommand
    console.log(`[SES] Daily digest would be sent to ${userEmail} with ${tasks.length} tasks`);
    return { messageId: 'ses_' + Date.now(), sent: true };
  },
};

export default SNSNotifier;
