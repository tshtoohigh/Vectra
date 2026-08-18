/**
 * Amazon DynamoDB Data Layer — REAL AWS SDK Implementation
 *
 * This module makes REAL calls to DynamoDB using the AWS SDK.
 * No mocks, no localStorage (except as fallback when credentials aren't set).
 *
 * Table: Vectra
 * Key Schema:
 *   PK (String, HASH)  — e.g. USER#john@email.com or USER#demo_user
 *   SK (String, RANGE) — e.g. TASK#task_abc123 or PROFILE
 *
 * Operations:
 *   - QueryCommand:  get all tasks for a user
 *   - PutCommand:    create/overwrite a task
 *   - UpdateCommand: update specific fields
 *   - DeleteCommand: remove a task
 *   - GetCommand:    get a single item
 *   - ScanCommand:   scan all items (for deadline checking)
 */

import {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';
import { dynamoDB, TABLE_NAME, isAWSConfigured } from './awsConfig.js';

export const DynamoClient = {
  // ═══════════════════════════════════════════════════════════════════
  // TASK OPERATIONS (real DynamoDB calls)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all tasks for a user
   * DynamoDB Operation: Query with KeyConditionExpression
   */
  async getTasks(userId) {
    if (!isAWSConfigured()) return _localGetTasks(userId);

    const result = await dynamoDB.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'TASK#',
      },
    }));

    console.log(`[DynamoDB] Query: ${result.Items?.length || 0} tasks for USER#${userId}`);
    return (result.Items || []).map(stripKeys);
  },

  /**
   * Create a new task
   * DynamoDB Operation: PutCommand
   */
  async putTask(userId, task) {
    if (!isAWSConfigured()) return _localPutTask(userId, task);

    const item = {
      PK: `USER#${userId}`,
      SK: `TASK#${task.id}`,
      ...task,
    };

    await dynamoDB.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    console.log(`[DynamoDB] Put: TASK#${task.id} for USER#${userId}`);
    return task;
  },

  /**
   * Update a task's fields
   * DynamoDB Operation: UpdateCommand with dynamic expressions
   */
  async updateTask(userId, taskId, updates) {
    if (!isAWSConfigured()) return _localUpdateTask(userId, taskId, updates);

    const parts = [];
    const names = {};
    const values = {};

    Object.entries(updates).forEach(([key, val]) => {
      if (key === 'id' || key === 'PK' || key === 'SK') return;
      const attr = `#${key}`;
      const valKey = `:${key}`;
      parts.push(`${attr} = ${valKey}`);
      names[attr] = key;
      values[valKey] = val;
    });

    // Always update timestamp
    parts.push('#updatedAt = :updatedAt');
    names['#updatedAt'] = 'updatedAt';
    values[':updatedAt'] = new Date().toISOString();

    if (parts.length === 0) return updates;

    const result = await dynamoDB.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
      UpdateExpression: 'SET ' + parts.join(', '),
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    }));

    console.log(`[DynamoDB] Update: TASK#${taskId}`);
    return stripKeys(result.Attributes || {});
  },

  /**
   * Delete a task
   * DynamoDB Operation: DeleteCommand
   */
  async deleteTask(userId, taskId) {
    if (!isAWSConfigured()) return _localDeleteTask(userId, taskId);

    await dynamoDB.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
    }));

    console.log(`[DynamoDB] Delete: TASK#${taskId}`);
  },

  /**
   * Get a single task
   * DynamoDB Operation: GetCommand
   */
  async getTask(userId, taskId) {
    if (!isAWSConfigured()) return null;

    const result = await dynamoDB.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `TASK#${taskId}` },
    }));

    return result.Item ? stripKeys(result.Item) : null;
  },

  // ═══════════════════════════════════════════════════════════════════
  // USER PROFILE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get user profile from DynamoDB
   * DynamoDB Operation: GetCommand with SK = PROFILE
   */
  async getProfile(userId) {
    if (!isAWSConfigured()) return _localGetProfile(userId);

    const result = await dynamoDB.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: 'PROFILE' },
    }));

    console.log(`[DynamoDB] GetProfile: USER#${userId} → ${result.Item ? 'found' : 'not found'}`);
    return result.Item ? stripKeys(result.Item) : null;
  },

  /**
   * Save/update user profile in DynamoDB
   * DynamoDB Operation: PutCommand with SK = PROFILE
   */
  async putProfile(userId, profile) {
    if (!isAWSConfigured()) return _localPutProfile(userId, profile);

    const item = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      ...profile,
      updatedAt: new Date().toISOString(),
    };

    await dynamoDB.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    }));

    console.log(`[DynamoDB] PutProfile: USER#${userId}`);
    return profile;
  },

  /**
   * Find a user profile by email (for login)
   * DynamoDB Operation: Query with begins_with on SK = PROFILE
   * Since email IS the userId in our system, we query directly
   */
  async getProfileByEmail(email) {
    if (!isAWSConfigured()) return _localGetProfileByEmail(email);

    const result = await dynamoDB.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${email}`, SK: 'PROFILE' },
    }));

    return result.Item ? stripKeys(result.Item) : null;
  },

  // ═══════════════════════════════════════════════════════════════════
  // MODULE OPERATIONS
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Get all modules for a user
   * DynamoDB Operation: Query with SK prefix MODULE#
   */
  async getModules(userId) {
    if (!isAWSConfigured()) return _localGetModules(userId);

    const result = await dynamoDB.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'MODULE#',
      },
    }));

    console.log(`[DynamoDB] Query: ${result.Items?.length || 0} modules for USER#${userId}`);
    return (result.Items || []).map(stripKeys);
  },

  /**
   * Save a module
   * DynamoDB Operation: PutCommand
   */
  async putModule(userId, mod) {
    if (!isAWSConfigured()) return _localPutModule(userId, mod);

    await dynamoDB.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `MODULE#${mod.code}`,
        ...mod,
      },
    }));

    console.log(`[DynamoDB] Put: MODULE#${mod.code}`);
    return mod;
  },

  /**
   * Delete a module
   * DynamoDB Operation: DeleteCommand
   */
  async deleteModule(userId, moduleCode) {
    if (!isAWSConfigured()) return _localDeleteModule(userId, moduleCode);

    await dynamoDB.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { PK: `USER#${userId}`, SK: `MODULE#${moduleCode}` },
    }));

    console.log(`[DynamoDB] Delete: MODULE#${moduleCode}`);
  },

  // ═══════════════════════════════════════════════════════════════════
  // SCAN (for deadline checking across all users)
  // ═══════════════════════════════════════════════════════════════════

  /**
   * Scan all tasks in the table
   * DynamoDB Operation: ScanCommand with filter
   */
  async scanAllTasks() {
    if (!isAWSConfigured()) return [];

    const result = await dynamoDB.send(new ScanCommand({
      TableName: TABLE_NAME,
      FilterExpression: 'begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':sk': 'TASK#' },
    }));

    console.log(`[DynamoDB] Scan: ${result.Items?.length || 0} total tasks`);
    return (result.Items || []).map(stripKeys);
  },
};

// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

/** Remove PK/SK from returned items (internal DynamoDB keys) */
function stripKeys(item) {
  const { PK, SK, ...rest } = item;
  return rest;
}

// ═══════════════════════════════════════════════════════════════════
// LOCAL STORAGE FALLBACKS (when AWS not configured)
// ═══════════════════════════════════════════════════════════════════

function _localGetTasks(userId) {
  return JSON.parse(localStorage.getItem(`vectra.tasks.${userId}`) || '[]');
}

function _localPutTask(userId, task) {
  const tasks = _localGetTasks(userId);
  const idx = tasks.findIndex((t) => t.id === task.id);
  if (idx >= 0) tasks[idx] = task;
  else tasks.push(task);
  localStorage.setItem(`vectra.tasks.${userId}`, JSON.stringify(tasks));
  return task;
}

function _localUpdateTask(userId, taskId, updates) {
  const tasks = _localGetTasks(userId);
  const idx = tasks.findIndex((t) => t.id === taskId);
  if (idx >= 0) tasks[idx] = { ...tasks[idx], ...updates };
  localStorage.setItem(`vectra.tasks.${userId}`, JSON.stringify(tasks));
  return tasks[idx];
}

function _localDeleteTask(userId, taskId) {
  const tasks = _localGetTasks(userId).filter((t) => t.id !== taskId);
  localStorage.setItem(`vectra.tasks.${userId}`, JSON.stringify(tasks));
}

function _localGetProfile(userId) {
  const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
  return users[userId] || null;
}

function _localPutProfile(userId, profile) {
  const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
  users[userId] = profile;
  localStorage.setItem('pt_users', JSON.stringify(users));
  return profile;
}

function _localGetProfileByEmail(email) {
  const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
  return users[email] || null;
}

function _localGetModules(userId) {
  return JSON.parse(localStorage.getItem(`vectra.modules.${userId}`) || '[]');
}

function _localPutModule(userId, mod) {
  const mods = _localGetModules(userId);
  const idx = mods.findIndex((m) => m.code === mod.code);
  if (idx >= 0) mods[idx] = mod;
  else mods.push(mod);
  localStorage.setItem(`vectra.modules.${userId}`, JSON.stringify(mods));
  return mod;
}

function _localDeleteModule(userId, code) {
  const mods = _localGetModules(userId).filter((m) => m.code !== code);
  localStorage.setItem(`vectra.modules.${userId}`, JSON.stringify(mods));
}

export default DynamoClient;
