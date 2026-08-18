/**
 * AWS Configuration — Netlify Functions Backend
 *
 * Instead of calling AWS directly from the browser (which exposes credentials),
 * all AWS operations go through Netlify serverless functions:
 *   /.netlify/functions/dynamo  → DynamoDB operations
 *   /.netlify/functions/sns     → SNS operations
 *
 * Credentials are stored as server-side env vars in Netlify (not VITE_ prefixed),
 * so they NEVER appear in the browser bundle.
 */

const DYNAMO_ENDPOINT = '/.netlify/functions/dynamo';
const SNS_ENDPOINT = '/.netlify/functions/sns';

/**
 * Check if we're running on Netlify (functions available)
 */
export function isAWSConfigured() {
  // If we're on localhost without functions, return false
  // On Netlify, the functions are always available
  return true;
}

/**
 * Call the DynamoDB Netlify function
 */
export async function callDynamo(action, userId, data = {}) {
  const response = await fetch(DYNAMO_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, userId, data }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * Call the SNS Netlify function
 */
export async function callSNS(action, data = {}) {
  const response = await fetch(SNS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, data }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export const TABLE_NAME = 'Vectra';
export const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:037389780625:PolyTrackAlerts';

export default { isAWSConfigured, callDynamo, callSNS, TABLE_NAME, SNS_TOPIC_ARN };
