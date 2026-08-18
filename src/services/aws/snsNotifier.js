/**
 * Amazon SNS / SES Notification Service
 *
 * When API Gateway is configured:
 *   - checkAndNotify() calls the real Lambda which scans DynamoDB and
 *     publishes to the SNS topic (sends real emails to subscribers)
 *   - subscribe() adds an email to the SNS topic
 *
 * When API Gateway is NOT configured:
 *   - Falls back to browser-side notification queue (demo mode)
 *
 * Real flow: Frontend → API Gateway → Lambda → DynamoDB scan → SNS Publish → Email
 */

import { APIGateway } from './apiGateway.js';

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
   * Check all tasks and generate notifications for critical ones.
   * When API is configured: calls Lambda which reads DynamoDB and publishes to SNS.
   */
  async checkAndNotify(tasks) {
    // If real API is configured, use the Lambda-based checker
    if (APIGateway.isConfigured()) {
      try {
        const result = await APIGateway.checkNotifications();
        console.log('[SNS/Lambda] Real deadline check result:', result);

        if (result?.alerts?.length) {
          const newNotifs = result.alerts.map((alert) => ({
            id: alert.id,
            type: alert.severity,
            service: alert.severity === 'overdue' ? 'SES' : 'SNS',
            title: alert.title,
            message: alert.message,
            task: { id: alert.taskId },
            timestamp: alert.timestamp,
            _source: 'Lambda + DynamoDB + SNS (real AWS)',
          }));

          // Deduplicate
          const existing = new Set(notificationQueue.map((n) => n.id));
          const fresh = newNotifs.filter((n) => !existing.has(n.id));

          if (fresh.length > 0) {
            notificationQueue = [...fresh, ...notificationQueue].slice(0, 20);
            notificationCallbacks.forEach((cb) => cb(fresh));
          }
          return fresh;
        }
        return [];
      } catch (err) {
        console.warn('[SNS/Lambda] Check failed, using local fallback:', err.message);
      }
    }

    // Fallback: local notification logic
    return this._localCheck(tasks);
  },

  /**
   * Subscribe an email to real SNS notifications
   */
  async subscribe(email) {
    if (APIGateway.isConfigured()) {
      try {
        const result = await APIGateway.subscribeEmail(email);
        console.log('[SNS] Subscription result:', result);
        return result;
      } catch (err) {
        console.error('[SNS] Subscribe failed:', err.message);
        throw err;
      }
    }
    return { message: 'API not configured. Set VITE_API_URL to enable real SNS emails.' };
  },

  /**
   * Local fallback notification check (when API not configured)
   */
  _localCheck(tasks) {
    const now = Date.now();
    const newNotifs = [];

    tasks.forEach((task) => {
      if (task.status === 'Completed') return;

      const hoursRemaining = (new Date(task.deadline).getTime() - now) / 3600000;
      const progress = task.progress || 0;
      const weightage = task.weightage || 10;

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
   * Send daily digest (via Lambda + SNS when configured)
   */
  async sendDailyDigest(tasks, userEmail) {
    if (APIGateway.isConfigured()) {
      // The EventBridge scheduled rule handles this automatically
      console.log('[SNS] Daily digest handled by EventBridge → Lambda → SNS');
      return { messageId: 'handled_by_eventbridge', sent: true };
    }
    console.log(`[SES] Daily digest would be sent to ${userEmail} with ${tasks.length} tasks`);
    return { messageId: 'ses_' + Date.now(), sent: true };
  },
};

export default SNSNotifier;
