/**
 * AWS SDK Configuration
 *
 * Reads AWS credentials from Vite environment variables.
 * These come from your Learner Lab "AWS Details" page.
 *
 * Required env vars (set in .env or Netlify):
 *   VITE_AWS_ACCESS_KEY_ID
 *   VITE_AWS_SECRET_ACCESS_KEY
 *   VITE_AWS_SESSION_TOKEN
 *   VITE_AWS_REGION (optional, defaults to us-east-1)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { SNSClient } from '@aws-sdk/client-sns';

const REGION = import.meta.env.VITE_AWS_REGION || 'us-east-1';

const credentials = {
  accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID || '',
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY || '',
  sessionToken: import.meta.env.VITE_AWS_SESSION_TOKEN || '',
};

/**
 * Check if real AWS credentials are configured
 */
export function isAWSConfigured() {
  return !!(credentials.accessKeyId && credentials.secretAccessKey);
}

/**
 * Raw DynamoDB client
 */
const dynamoRaw = new DynamoDBClient({
  region: REGION,
  credentials: isAWSConfigured() ? credentials : undefined,
});

/**
 * DynamoDB Document Client (handles marshalling/unmarshalling automatically)
 * This is what you use for Put, Get, Query, Update, Delete, Scan
 */
export const dynamoDB = DynamoDBDocumentClient.from(dynamoRaw, {
  marshallOptions: { removeUndefinedValues: true, convertEmptyValues: false },
  unmarshallOptions: { wrapNumbers: false },
});

/**
 * SNS Client for sending real notifications
 */
export const snsClient = new SNSClient({
  region: REGION,
  credentials: isAWSConfigured() ? credentials : undefined,
});

/**
 * Table name used across all operations
 */
export const TABLE_NAME = 'Vectra';

/**
 * SNS Topic ARN for deadline alerts
 */
export const SNS_TOPIC_ARN = import.meta.env.VITE_SNS_TOPIC_ARN || 'arn:aws:sns:us-east-1:037389780625:PolyTrackAlerts';

export default { dynamoDB, snsClient, TABLE_NAME, SNS_TOPIC_ARN, isAWSConfigured };
