/**
 * Amazon SNS Notification Service — REAL AWS SDK Implementation
 *
 * When AWS is configured, this module:
 *   1. Reads tasks from DynamoDB (via DynamoClient)
 *   2. Analyzes which deadlines are at risk
 *   3. Publishes REAL notifications to SNS using PublishCommand
 *   4. Subscribes emails using SubscribeCommand
 *
 * SNS Operations used:
 *   - PublishCommand: sends alert message to topic → delivers email to subscribers
 *   - SubscribeCommand: adds an email endpoint to the topic
 *   - ListSubscriptionsByTopicCommand: checks who is subscribed
 *
 * This sends REAL emails to anyone subscribed to the PolyTrackAlerts topic.
 */

import { PublishCommand, SubscribeCommand, ListSubscriptionsByTopicCommand } from '@aws-sdk/client-sns';
import { snsClient, SNS_TOPIC_ARN, isAWSConfigured } from './awsConfig.js';
import { DynamoClient } from './dynamoClient.js';

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
   * Check tasks and send SNS notifications for critical deadlines
   *
   * DynamoDB: reads tasks (via DynamoClient.getTasks or passed array)
   * SNS: PublishCommand to send real email alerts
   */
  async checkAndNotify(tasks, userId) {
    const now = Date.now();
    const newNotifs = [];

    // If AWS configured and userId provided, read fresh from DynamoDB
    let taskList = tasks;
    if (isAWSConfigured() && userId) {
      try {
        taskList = await DynamoClient.getTasks(userId);
        console.log(`[SNS] Read ${taskList.length} tasks from DynamoDB for notification check`);
      } catch (err) {
        console.warn('[SNS] Failed to read from DynamoDB, using local tasks:', err.message);
      }
    }

    // Analyze each task for risk
    taskList.forEach((task) => {
      if (task.status === 'Completed') return;

      const hoursRemaining = (new Date(task.deadline).getTime() - now) / 3600000;
      const progress = task.progress || 0;
      const weightage = task.weightage || 10;
      const prefix = task.moduleCode ? `${task.moduleCode} — ` : '';

      // CRITICAL: Due in < 48h AND progress < 40% AND weightage > 20%
      if (hoursRemaining > 0 && hoursRemaining < 48 && progress < 40 && weightage > 20) {
        newNotifs.push({
          id: `notif_${task.id}_critical`,
          type: 'critical',
          service: 'SNS',
          title: 'At risk of being late',
          message: `${prefix}"${task.title}" is due in ${Math.round(hoursRemaining)}h but only ${progress}% done. It carries ${weightage}% of your grade.`,
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
          message: `${prefix}"${task.title}" is due in ${Math.round(hoursRemaining)} hours.`,
          task,
          timestamp: new Date().toISOString(),
        });
      }

      // OVERDUE
      if (hoursRemaining <= 0) {
        newNotifs.push({
          id: `notif_${task.id}_overdue`,
          type: 'overdue',
          service: 'SNS',
          title: 'Overdue',
          message: `${prefix}"${task.title}" was due ${Math.abs(Math.round(hoursRemaining))}h ago.`,
          task,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Deduplicate against existing queue
    const existing = new Set(notificationQueue.map((n) => n.id));
    const fresh = newNotifs.filter((n) => !existing.has(n.id));

    if (fresh.length > 0) {
      notificationQueue = [...fresh, ...notificationQueue].slice(0, 20);
      notificationCallbacks.forEach((cb) => cb(fresh));

      // PUBLISH TO REAL SNS — sends actual email to subscribers
      if (isAWSConfigured() && fresh.length > 0) {
        await this._publishToSNS(fresh);
      }
    }

    return fresh;
  },

  /**
   * Publish alert notifications to the real SNS topic
   * SNS Operation: PublishCommand
   * This sends REAL emails to anyone subscribed to the topic
   */
  async _publishToSNS(alerts) {
    const subject = `PolyTrack Alert: ${alerts.length} deadline(s) need attention`;

    const lines = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '  PolyTrack Deadline Alert',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
    ];

    alerts.slice(0, 5).forEach((alert) => {
      const icon = { overdue: '[OVERDUE]', critical: '[CRITICAL]', urgent: '[URGENT]' }[alert.type] || '[INFO]';
      lines.push(`${icon} ${alert.title}`);
      lines.push(`   ${alert.message}`);
      lines.push('');
    });

    lines.push('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Checked at: ${new Date().toISOString()}`);
    lines.push('Open PolyTrack to manage your deadlines.');

    try {
      const result = await snsClient.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: subject.substring(0, 100),
        Message: lines.join('\n'),
      }));
      console.log(`[SNS] ✓ Published alert to topic. MessageId: ${result.MessageId}`);
      return result;
    } catch (err) {
      console.error('[SNS] Failed to publish:', err.message);
      return null;
    }
  },

  /**
   * Subscribe an email address to the PolyTrackAlerts SNS topic
   * SNS Operation: SubscribeCommand
   * The user will get a confirmation email from AWS they must click
   */
  async subscribe(email) {
    if (!isAWSConfigured()) {
      console.log('[SNS] AWS not configured — cannot subscribe');
      return { message: 'AWS not configured. Set credentials to enable real email alerts.' };
    }

    try {
      const result = await snsClient.send(new SubscribeCommand({
        TopicArn: SNS_TOPIC_ARN,
        Protocol: 'email',
        Endpoint: email,
      }));
      console.log(`[SNS] ✓ Subscription request sent to ${email}`);
      return {
        message: `Subscription request sent to ${email}. Check your inbox and click "Confirm subscription".`,
        subscriptionArn: result.SubscriptionArn,
      };
    } catch (err) {
      console.error('[SNS] Subscribe failed:', err.message);
      throw new Error(`Failed to subscribe: ${err.message}`);
    }
  },

  /**
   * List current subscriptions to the topic
   * SNS Operation: ListSubscriptionsByTopicCommand
   */
  async listSubscriptions() {
    if (!isAWSConfigured()) return [];

    try {
      const result = await snsClient.send(new ListSubscriptionsByTopicCommand({
        TopicArn: SNS_TOPIC_ARN,
      }));
      console.log(`[SNS] ${result.Subscriptions?.length || 0} subscriptions found`);
      return result.Subscriptions || [];
    } catch (err) {
      console.error('[SNS] List subscriptions failed:', err.message);
      return [];
    }
  },

  /**
   * Get all pending notifications (local queue)
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
   * Send daily digest — publishes summary to SNS
   * SNS Operation: PublishCommand
   */
  async sendDailyDigest(tasks, userEmail) {
    if (!isAWSConfigured()) {
      console.log(`[SNS] Would send digest to ${userEmail} (AWS not configured)`);
      return { messageId: 'local_' + Date.now(), sent: false };
    }

    const active = tasks.filter((t) => t.status !== 'Completed');
    const dueSoon = active.filter((t) => {
      const h = (new Date(t.deadline).getTime() - Date.now()) / 3600000;
      return h > 0 && h <= 72;
    });

    const message = [
      'Good morning! Here is your PolyTrack daily digest:',
      '',
      `Active tasks: ${active.length}`,
      `Due within 72 hours: ${dueSoon.length}`,
      '',
      ...dueSoon.map((t) => `• ${t.moduleCode || ''} ${t.title} (${t.progress || 0}% done)`),
      '',
      'Open PolyTrack to manage your priorities.',
    ].join('\n');

    try {
      const result = await snsClient.send(new PublishCommand({
        TopicArn: SNS_TOPIC_ARN,
        Subject: `PolyTrack Daily Digest — ${dueSoon.length} tasks due soon`,
        Message: message,
      }));
      console.log(`[SNS] ✓ Daily digest published. MessageId: ${result.MessageId}`);
      return { messageId: result.MessageId, sent: true };
    } catch (err) {
      console.error('[SNS] Digest failed:', err.message);
      return { messageId: null, sent: false };
    }
  },
};

export default SNSNotifier;
