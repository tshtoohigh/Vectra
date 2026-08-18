/**
 * Netlify Serverless Function — SNS Operations
 *
 * Handles real SNS publish and subscribe operations server-side.
 * Credentials never exposed to the browser.
 */

import { SNSClient, PublishCommand, SubscribeCommand, ListSubscriptionsByTopicCommand } from '@aws-sdk/client-sns';

const snsClient = new SNSClient({
  region: process.env.MY_AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MY_AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.MY_AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.MY_AWS_SESSION_TOKEN,
  },
});

const TOPIC_ARN = process.env.MY_SNS_TOPIC_ARN || 'arn:aws:sns:us-east-1:037389780625:PolyTrackAlerts';

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  try {
    const { action, data } = JSON.parse(event.body || '{}');

    switch (action) {
      case 'publish': {
        const result = await snsClient.send(new PublishCommand({
          TopicArn: TOPIC_ARN,
          Subject: (data.subject || 'Vectra Alert').substring(0, 100),
          Message: data.message || 'Notification from Vectra',
        }));
        console.log(`[SNS] PublishCommand: MessageId=${result.MessageId}`);
        return respond(200, { messageId: result.MessageId, sent: true });
      }

      case 'subscribe': {
        const result = await snsClient.send(new SubscribeCommand({
          TopicArn: TOPIC_ARN,
          Protocol: 'email',
          Endpoint: data.email,
        }));
        console.log(`[SNS] SubscribeCommand: ${data.email}`);
        return respond(200, { subscriptionArn: result.SubscriptionArn, message: `Check ${data.email} inbox to confirm.` });
      }

      case 'listSubscriptions': {
        const result = await snsClient.send(new ListSubscriptionsByTopicCommand({ TopicArn: TOPIC_ARN }));
        return respond(200, { subscriptions: result.Subscriptions || [] });
      }

      default:
        return respond(400, { error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[SNS Error]', err.message);
    return respond(500, { error: err.message });
  }
}
