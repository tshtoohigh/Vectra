/**
 * SNS Notification Service — Per-User Alerts
 *
 * Each user has their OWN SNS topic. Alerts go ONLY to the user
 * whose task is at risk — not to everyone.
 *
 * Flow:
 *   User signs up → creates personal SNS topic → subscribes their email
 *   Task becomes critical → publishes ONLY to that user's topic
 *   Only THAT user gets the email
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
   * Create a personal SNS topic for a user (called on sign-up)
   * SNS Operations: CreateTopicCommand + SubscribeCommand
   */
  async subscribe(email) {
    if (!isAWSConfigured()) return { message: 'AWS not configured' };
    try {
      const result = await callSNS('createUserTopic', { email });
      console.log(`[SNS] Created personal topic for ${email}`);
      return result;
    } catch (err) {
      console.error('[SNS] Subscribe failed:', err.message);
      throw err;
    }
  },

  /**
   * Check tasks and send SNS notifications for critical deadlines
   * Publishes ONLY to the specific user's topic (their email)
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

      // Publish to the USER'S PERSONAL SNS topic (only they get the email)
      if (isAWSConfigured() && userId) {
        try {
          const subject = `Vectra Alert: ${fresh.length} deadline(s) need attention`;
          const message = fresh.map(a => `[${a.type.toUpperCase()}] ${a.message}`).join('\n\n');
          // userId IS the user's email — publish to their personal topic
          await callSNS('publish', { email: userId, subject, message });
          console.log(`[SNS] PublishCommand: alert sent to ${userId}'s personal topic`);
        } catch (err) {
          console.warn('[SNS] Publish failed:', err.message);
        }
      }
    }

    return fresh;
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
      const result = await callSNS('publish', { email: userEmail, subject: 'Vectra Daily Digest', message });
      return { messageId: result.messageId, sent: true };
    } catch (err) {
      return { sent: false };
    }
  },
};

export default SNSNotifier;
