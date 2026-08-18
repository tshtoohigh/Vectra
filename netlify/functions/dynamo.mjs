/**
 * Netlify Serverless Function — DynamoDB Operations
 *
 * This keeps AWS credentials SERVER-SIDE (never exposed to the browser).
 * The React frontend calls this function via /.netlify/functions/dynamo
 *
 * Supports: getTasks, createTask, updateTask, deleteTask, getProfile, putProfile, getModules, putModule, deleteModule
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  },
});

const dynamoDB = DynamoDBDocumentClient.from(client, {
  marshallOptions: { removeUndefinedValues: true },
  unmarshallOptions: { wrapNumbers: false },
});

const TABLE = 'Vectra';

function respond(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body),
  };
}

export async function handler(event) {
  try {
    const { action, userId, data } = JSON.parse(event.body || '{}');

    if (!userId) return respond(400, { error: 'userId required' });

    switch (action) {
      // ══════════ TASKS ══════════
      case 'getTasks': {
        const result = await dynamoDB.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'TASK#' },
        }));
        const tasks = (result.Items || []).map(stripKeys);
        console.log(`[DynamoDB] QueryCommand: ${tasks.length} tasks for USER#${userId}`);
        return respond(200, { tasks });
      }

      case 'createTask': {
        const item = { PK: `USER#${userId}`, SK: `TASK#${data.id}`, ...data };
        await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: item }));
        console.log(`[DynamoDB] PutCommand: TASK#${data.id}`);
        return respond(201, { task: data, message: 'Task created in DynamoDB' });
      }

      case 'updateTask': {
        const { taskId, updates } = data;
        const parts = [], names = {}, values = {};
        Object.entries(updates).forEach(([key, val]) => {
          if (key === 'id' || key === 'PK' || key === 'SK') return;
          parts.push(`#${key} = :${key}`);
          names[`#${key}`] = key;
          values[`:${key}`] = val;
        });
        parts.push('#updatedAt = :updatedAt');
        names['#updatedAt'] = 'updatedAt';
        values[':updatedAt'] = new Date().toISOString();

        const result = await dynamoDB.send(new UpdateCommand({
          TableName: TABLE,
          Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
          UpdateExpression: 'SET ' + parts.join(', '),
          ExpressionAttributeNames: names,
          ExpressionAttributeValues: values,
          ReturnValues: 'ALL_NEW',
        }));
        console.log(`[DynamoDB] UpdateCommand: TASK#${taskId}`);
        return respond(200, { task: stripKeys(result.Attributes || {}) });
      }

      case 'deleteTask': {
        await dynamoDB.send(new DeleteCommand({
          TableName: TABLE,
          Key: { PK: `USER#${userId}`, SK: `TASK#${data.taskId}` },
        }));
        console.log(`[DynamoDB] DeleteCommand: TASK#${data.taskId}`);
        return respond(200, { message: 'Deleted' });
      }

      case 'getTask': {
        const result = await dynamoDB.send(new GetCommand({
          TableName: TABLE,
          Key: { PK: `USER#${userId}`, SK: `TASK#${data.taskId}` },
        }));
        return respond(200, { task: result.Item ? stripKeys(result.Item) : null });
      }

      // ══════════ PROFILE ══════════
      case 'getProfile': {
        const result = await dynamoDB.send(new GetCommand({
          TableName: TABLE,
          Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
        }));
        console.log(`[DynamoDB] GetCommand: PROFILE for USER#${userId}`);
        return respond(200, { profile: result.Item ? stripKeys(result.Item) : null });
      }

      case 'putProfile': {
        const item = { PK: `USER#${userId}`, SK: 'PROFILE', ...data, updatedAt: new Date().toISOString() };
        await dynamoDB.send(new PutCommand({ TableName: TABLE, Item: item }));
        console.log(`[DynamoDB] PutCommand: PROFILE for USER#${userId}`);
        return respond(200, { profile: data });
      }

      // ══════════ MODULES ══════════
      case 'getModules': {
        const result = await dynamoDB.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'MODULE#' },
        }));
        console.log(`[DynamoDB] QueryCommand: ${result.Items?.length || 0} modules`);
        return respond(200, { modules: (result.Items || []).map(stripKeys) });
      }

      case 'putModule': {
        await dynamoDB.send(new PutCommand({
          TableName: TABLE,
          Item: { PK: `USER#${userId}`, SK: `MODULE#${data.code}`, ...data },
        }));
        console.log(`[DynamoDB] PutCommand: MODULE#${data.code}`);
        return respond(200, { module: data });
      }

      case 'deleteModule': {
        await dynamoDB.send(new DeleteCommand({
          TableName: TABLE,
          Key: { PK: `USER#${userId}`, SK: `MODULE#${data.code}` },
        }));
        console.log(`[DynamoDB] DeleteCommand: MODULE#${data.code}`);
        return respond(200, { message: 'Deleted' });
      }

      // ══════════ SCAN (for notifications) ══════════
      case 'scanTasks': {
        const result = await dynamoDB.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
          ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':sk': 'TASK#' },
        }));
        return respond(200, { tasks: (result.Items || []).map(stripKeys) });
      }

      default:
        return respond(400, { error: `Unknown action: ${action}` });
    }
  } catch (err) {
    console.error('[DynamoDB Error]', err.message);
    return respond(500, { error: err.message });
  }
}

function stripKeys(item) {
  const { PK, SK, ...rest } = item;
  return rest;
}
