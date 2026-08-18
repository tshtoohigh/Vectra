/**
 * SNS Notification Service — Calls Netlify Functions (server-side)
 *
 * All SNS operations go through /.netlify/functions/sns
 * This keeps AWS credentials on the server.
 *
 * The Netlify function uses:
 *   PublishCommand — sends real email alerts
 *   SubscribeCommand — adds email to topic
 */

import { callSNS, isAWSConfigured } from './awsConfig.js';
import { DynamoClient } from './dynamoClient.js';

let notificationQueue = [];
let notificationCallbacks = [];

export const SNSNotifier = {
  onNotification(callback) {
    notificationCallbacks.push(callback);
    return () => { notificationCallbacks = notificationCallbacks.filter(cb => cb !== callback); };
  },

  /**
   * Check tasks and send SNS notifications for critical deadlines
   * Reads from DynamoDB (via Netlify function), analyzes, publishes to SNS
   */
  async checkAndNotify(tasks, userId) {
    const now = Date.now();
    const newNotifs = [];

    // Read fresh tasks from DynamoDB
    let taskList = tasks;
    if (isAWSConfigured() && userId) {
      try {
        taskList = await DynamoClient.getTasks(userId);
      } catch (err) {
        console.warn('[SNS] Failed to read tasks:', err.message);
      }
    }

    // Analyze each task
    taskList.forEach(task => {
      if (task.status === 'Completed') return;
      const hoursRemaining = (new Date(task.deadline).getTime() - now) / 3600000;
      const progress = task.progress || 0;
      const weightage = task.weightage || 10;
      const prefix = task.moduleCode ? `${task.moduleCode} — ` : '';

      if (hoursRemaining > 0 && hoursRemaining < 48 && progress < 40 && weightage > 20) {
        newNotifs.push({ id: `notif_${task.id}_critical`, type: 'critical', service: 'SNS', title: 'At risk of being late', message: `${prefix}"${task.title}" is due in ${Math.round(hoursRemaining)}h but only ${progress}% done.`, task, timestamp: new Date().toISOString() });
      }
      if (hoursRemaining > 0 && hoursRemaining < 24 && progress < 80) {
        newNotifs.push({ id: `notif_${task.id}_urgent`, type: 'urgent', service: 'SNS', title: 'Due within 24 hours', message: `${prefix}"${task.title}" is due in ${Math.round(hoursRemaining)} hours.`, task, timestamp: new Date().toISOString() });
      }
      if (hoursRemaining <= 0) {
        newNotifs.push({ id: `notif_${task.id}_overdue`, type: 'overdue', service: 'SNS', title: 'Overdue', message: `${prefix}"${task.title}" was due ${Math.abs(Math.round(hoursRemaining))}h ago.`, task, timestamp: new Date().toISOString() });
      }
    });

    // Deduplicate
    const existing = new Set(notificationQueue.map(n => n.id));
    const fresh = newNotifs.filter(n => !existing.has(n.id));

    if (fresh.length > 0) {
      notificationQueue = [...fresh, ...notificationQueue].slice(0, 20);
      notificationCallbacks.forEach(cb => cb(fresh));

      // Publish to real SNS (server-side)
      if (isAWSConfigured()) {
        try {
          const subject = `Vectra Alert: ${fresh.length} deadline(s) need attention`;
          const message = fresh.map(a => `[${a.type.toUpperCase()}] ${a.message}`).join('\n\n');
          await callSNS('publish', { subject, message });
          console.log('[SNS] PublishCommand: alert sent');
        } catch (err) {
          console.warn('[SNS] Publish failed:', err.message);
        }
      }
    }

    return fresh;
  },

  /**
   * Subscribe email to SNS topic
   * Server: SNS SubscribeCommand
   */
  async subscribe(email) {
    if (!isAWSConfigured()) return { message: 'AWS not configured' };
    try {
      const result = await callSNS('subscribe', { email });
      console.log(`[SNS] SubscribeCommand: ${email}`);
      return result;
    } catch (err) {
      console.error('[SNS] Subscribe failed:', err.message);
      throw err;
    }
  },

  getNotifications() { return notificationQueue; },
  dismiss(id) { notificationQueue = notificationQueue.filter(n => n.id !== id); },
  clearAll() { notificationQueue = []; },

  async sendDailyDigest(tasks, userEmail) {
    if (!isAWSConfigured()) return { sent: false };
    const active = tasks.filter(t => t.status !== 'Completed');
    const message = `Vectra Daily Digest\n\nActive tasks: ${active.length}\n\n` +
      active.slice(0, 5).map(t => `• ${t.title} (${t.progress || 0}% done)`).join('\n');
    try {
      const result = await callSNS('publish', { subject: 'Vectra Daily Digest', message });
      return { messageId: result.messageId, sent: true };
    } catch (err) {
      return { sent: false };
    }
  },
};

export default SNSNotifier;
