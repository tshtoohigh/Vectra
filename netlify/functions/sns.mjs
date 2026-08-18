/**
 * Netlify Serverless Function — SNS Operations (Per-User Notifications)
 *
 * Each user gets their OWN SNS topic. When their task is critical,
 * the alert goes ONLY to their email — not to everyone.
 *
 * Flow:
 *   1. User signs up → createUserTopic → creates topic + subscribes their email
 *   2. Task becomes critical → publish → sends alert ONLY to that user's topic
 *
 * SNS Operations used:
 *   - CreateTopicCommand: creates a per-user topic
 *   - SubscribeCommand: subscribes user's email to their topic
 *   - PublishCommand: sends alert to that specific user's topic
 */

import { SNSClient, CreateTopicCommand, SubscribeCommand, PublishCommand, ListSubscriptionsByTopicCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({
  region: process.env.MY_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.MY_AWS_SESSION_TOKEN,
  },
});

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

/**
 * Convert email to a valid SNS topic name (alphanumeric + hyphens only)
 */
function emailToTopicName(email) {
  return 'Vectra-' + email.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 200);
}

export async function handler(event) {
  try {
    const { action, data } = JSON.parse(event.body || '{}');

    switch (action) {
      /**
       * Create a personal SNS topic for a user and subscribe their email
       * Called when a user signs up
       */
      case 'createUserTopic': {
        const { email } = data;
        if (!email) return respond(400, { error: 'email required' });

        const topicName = emailToTopicName(email);

        // Create a unique topic for this user
        const createResult = await snsClient.send(new CreateTopicCommand({
          Name: topicName,
        }));
        const topicArn = createResult.TopicArn;
        console.log(`[SNS] CreateTopicCommand: ${topicName} → ${topicArn}`);

        // Subscribe their email to their personal topic
        const subResult = await snsClient.send(new SubscribeCommand({
          TopicArn: topicArn,
          Protocol: 'email',
          Endpoint: email,
        }));
        console.log(`[SNS] SubscribeCommand: ${email} → ${topicArn}`);

        return respond(200, {
          topicArn,
          topicName,
          subscriptionArn: subResult.SubscriptionArn,
          message: `Topic created for ${email}. Check inbox to confirm subscription.`,
        });
      }

      /**
       * Publish an alert to a specific user's topic
       * Only THAT user receives the email
       */
      case 'publish': {
        const { email, subject, message } = data;
        if (!email) return respond(400, { error: 'email required' });

        const topicName = emailToTopicName(email);

        // Get the topic ARN (create if doesn't exist)
        const createResult = await snsClient.send(new CreateTopicCommand({
          Name: topicName,
        }));
        const topicArn = createResult.TopicArn;

        // Publish to that user's personal topic
        const pubResult = await snsClient.send(new PublishCommand({
          TopicArn: topicArn,
          Subject: (subject || 'Vectra Alert').substring(0, 100),
          Message: message || 'Notification from Vectra',
        }));
        console.log(`[SNS] PublishCommand: sent to ${email}'s topic. MessageId: ${pubResult.MessageId}`);

        return respond(200, { messageId: pubResult.MessageId, sent: true, topicArn });
      }

      /**
       * Subscribe an email (manual, e.g. from settings page)
       */
      case 'subscribe': {
        const { email } = data;
        if (!email) return respond(400, { error: 'email required' });

        const topicName = emailToTopicName(email);
        const createResult = await snsClient.send(new CreateTopicCommand({ Name: topicName }));
        const topicArn = createResult.TopicArn;

        const subResult = await snsClient.send(new SubscribeCommand({
          TopicArn: topicArn,
          Protocol: 'email',
          Endpoint: email,
        }));
        console.log(`[SNS] SubscribeCommand: ${email}`);
        return respond(200, { subscriptionArn: subResult.SubscriptionArn, message: `Check ${email} inbox to confirm.` });
      }

      default:
        return respond(400, { error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[SNS Error]', err.message);
    return respond(500, { error: err.message });
  }
}
