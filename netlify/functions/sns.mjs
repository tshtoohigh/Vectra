/**
 * Netlify Serverless Function — SNS Operations (Per-User Notifications)
 *
 * Each user gets their OWN SNS topic. Alerts go ONLY to that user.
 * Topic is created + subscription is sent on EVERY login (idempotent).
 */

import { SNSClient, CreateTopicCommand, SubscribeCommand, PublishCommand } from '@aws-sdk/client-sns';

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

function emailToTopicName(email) {
  return 'Vectra-' + email.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 200);
}

export async function handler(event) {
  // Log for debugging
  console.log('[SNS Function] Called with body:', event.body?.substring(0, 200));

  // Check credentials exist
  if (!process.env.MY_AWS_ACCESS_KEY_ID) {
    console.error('[SNS] MY_AWS_ACCESS_KEY_ID is not set!');
    return respond(500, { error: 'AWS credentials not configured on server' });
  }

  try {
    const { action, data } = JSON.parse(event.body || '{}');
    console.log(`[SNS] Action: ${action}, Data keys: ${Object.keys(data || {}).join(',')}`);

    switch (action) {
      case 'createUserTopic': {
        const { email } = data;
        if (!email) return respond(400, { error: 'email required' });

        const topicName = emailToTopicName(email);
        console.log(`[SNS] Creating topic: ${topicName} for ${email}`);

        // Create topic (idempotent — returns existing if already exists)
        const createResult = await snsClient.send(new CreateTopicCommand({ Name: topicName }));
        const topicArn = createResult.TopicArn;
        console.log(`[SNS] Topic ARN: ${topicArn}`);

        // Subscribe email (idempotent — re-sends confirmation if pending)
        const subResult = await snsClient.send(new SubscribeCommand({
          TopicArn: topicArn,
          Protocol: 'email',
          Endpoint: email,
        }));
        console.log(`[SNS] Subscribe result: ${subResult.SubscriptionArn}`);

        return respond(200, {
          topicArn,
          subscriptionArn: subResult.SubscriptionArn,
          message: `Subscribed ${email}. Check inbox for confirmation.`,
        });
      }

      case 'publish': {
        const { email, subject, message } = data;
        if (!email) return respond(400, { error: 'email required' });

        const topicName = emailToTopicName(email);

        // Get/create the topic
        const createResult = await snsClient.send(new CreateTopicCommand({ Name: topicName }));
        const topicArn = createResult.TopicArn;

        // Publish
        const pubResult = await snsClient.send(new PublishCommand({
          TopicArn: topicArn,
          Subject: (subject || 'Vectra Alert').substring(0, 100),
          Message: message || 'Notification from Vectra',
        }));
        console.log(`[SNS] Published to ${topicName}. MessageId: ${pubResult.MessageId}`);

        return respond(200, { messageId: pubResult.MessageId, sent: true });
      }

      case 'subscribe': {
        const { email } = data;
        if (!email) return respond(400, { error: 'email required' });

        const topicName = emailToTopicName(email);
        const createResult = await snsClient.send(new CreateTopicCommand({ Name: topicName }));
        const subResult = await snsClient.send(new SubscribeCommand({
          TopicArn: createResult.TopicArn,
          Protocol: 'email',
          Endpoint: email,
        }));
        console.log(`[SNS] Manual subscribe: ${email} → ${subResult.SubscriptionArn}`);
        return respond(200, { subscriptionArn: subResult.SubscriptionArn, message: `Check ${email} inbox to confirm.` });
      }

      default:
        return respond(400, { error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[SNS Error]', err.name, err.message);
    return respond(500, { error: `${err.name}: ${err.message}` });
  }
}
