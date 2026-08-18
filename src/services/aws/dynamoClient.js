/**
 * DynamoDB Client — Calls Netlify Functions (server-side)
 *
 * All DynamoDB operations go through /.netlify/functions/dynamo
 * This keeps AWS credentials on the server, never in the browser.
 *
 * The Netlify function uses these DynamoDB operations:
 *   QueryCommand, PutCommand, UpdateCommand, DeleteCommand, GetCommand
 */

import { callDynamo, isAWSConfigured } from './awsConfig.js';

export const DynamoClient = {
  /**
   * Get all tasks for a user
   * Server: DynamoDB QueryCommand
   */
  async getTasks(userId) {
    if (!isAWSConfigured()) return _local('getTasks', userId);
    try {
      const result = await callDynamo('getTasks', userId);
      console.log(`[DynamoDB] QueryCommand: ${result.tasks?.length || 0} tasks`);
      return result.tasks || [];
    } catch (err) {
      console.warn('[DynamoDB] getTasks failed:', err.message);
      return _local('getTasks', userId);
    }
  },

  /**
   * Create a task
   * Server: DynamoDB PutCommand
   */
  async putTask(userId, task) {
    if (!isAWSConfigured()) return _local('putTask', userId, task);
    try {
      const result = await callDynamo('createTask', userId, task);
      console.log(`[DynamoDB] PutCommand: TASK#${task.id}`);
      return result.task || task;
    } catch (err) {
      console.warn('[DynamoDB] putTask failed:', err.message);
      return _local('putTask', userId, task);
    }
  },

  /**
   * Update a task
   * Server: DynamoDB UpdateCommand
   */
  async updateTask(userId, taskId, updates) {
    if (!isAWSConfigured()) return _local('updateTask', userId, { taskId, updates });
    try {
      const result = await callDynamo('updateTask', userId, { taskId, updates });
      console.log(`[DynamoDB] UpdateCommand: TASK#${taskId}`);
      return result.task || updates;
    } catch (err) {
      console.warn('[DynamoDB] updateTask failed:', err.message);
      return _local('updateTask', userId, { taskId, updates });
    }
  },

  /**
   * Delete a task
   * Server: DynamoDB DeleteCommand
   */
  async deleteTask(userId, taskId) {
    if (!isAWSConfigured()) return _local('deleteTask', userId, { taskId });
    try {
      await callDynamo('deleteTask', userId, { taskId });
      console.log(`[DynamoDB] DeleteCommand: TASK#${taskId}`);
    } catch (err) {
      console.warn('[DynamoDB] deleteTask failed:', err.message);
      _local('deleteTask', userId, { taskId });
    }
  },

  /**
   * Get a single task
   * Server: DynamoDB GetCommand
   */
  async getTask(userId, taskId) {
    if (!isAWSConfigured()) return null;
    try {
      const result = await callDynamo('getTask', userId, { taskId });
      return result.task || null;
    } catch (err) {
      console.warn('[DynamoDB] getTask failed:', err.message);
      return null;
    }
  },

  /**
   * Get user profile
   * Server: DynamoDB GetCommand
   */
  async getProfile(userId) {
    if (!isAWSConfigured()) return _localProfile('get', userId);
    try {
      const result = await callDynamo('getProfile', userId);
      console.log(`[DynamoDB] GetCommand: PROFILE`);
      return result.profile || null;
    } catch (err) {
      console.warn('[DynamoDB] getProfile failed:', err.message);
      return _localProfile('get', userId);
    }
  },

  async getProfileByEmail(email) {
    return this.getProfile(email);
  },

  /**
   * Save user profile
   * Server: DynamoDB PutCommand
   */
  async putProfile(userId, profile) {
    if (!isAWSConfigured()) return _localProfile('put', userId, profile);
    try {
      await callDynamo('putProfile', userId, profile);
      console.log(`[DynamoDB] PutCommand: PROFILE`);
      return profile;
    } catch (err) {
      console.warn('[DynamoDB] putProfile failed:', err.message);
      return _localProfile('put', userId, profile);
    }
  },

  /**
   * Get all modules
   * Server: DynamoDB QueryCommand
   */
  async getModules(userId) {
    if (!isAWSConfigured()) return _localMods('get', userId);
    try {
      const result = await callDynamo('getModules', userId);
      console.log(`[DynamoDB] QueryCommand: ${result.modules?.length || 0} modules`);
      return result.modules || [];
    } catch (err) {
      console.warn('[DynamoDB] getModules failed:', err.message);
      return _localMods('get', userId);
    }
  },

  /**
   * Save a module
   * Server: DynamoDB PutCommand
   */
  async putModule(userId, mod) {
    if (!isAWSConfigured()) return _localMods('put', userId, mod);
    try {
      await callDynamo('putModule', userId, mod);
      console.log(`[DynamoDB] PutCommand: MODULE#${mod.code}`);
      return mod;
    } catch (err) {
      console.warn('[DynamoDB] putModule failed:', err.message);
      return _localMods('put', userId, mod);
    }
  },

  /**
   * Delete a module
   * Server: DynamoDB DeleteCommand
   */
  async deleteModule(userId, code) {
    if (!isAWSConfigured()) return _localMods('delete', userId, { code });
    try {
      await callDynamo('deleteModule', userId, { code });
      console.log(`[DynamoDB] DeleteCommand: MODULE#${code}`);
    } catch (err) {
      console.warn('[DynamoDB] deleteModule failed:', err.message);
    }
  },
};

// ═══ localStorage fallbacks ═══
function _local(op, userId, data) {
  const key = `vectra.tasks.${userId}`;
  const tasks = JSON.parse(localStorage.getItem(key) || '[]');
  if (op === 'getTasks') return tasks;
  if (op === 'putTask') { tasks.push(data); localStorage.setItem(key, JSON.stringify(tasks)); return data; }
  if (op === 'updateTask') { const i = tasks.findIndex(t => t.id === data.taskId); if (i >= 0) tasks[i] = { ...tasks[i], ...data.updates }; localStorage.setItem(key, JSON.stringify(tasks)); return tasks[i]; }
  if (op === 'deleteTask') { localStorage.setItem(key, JSON.stringify(tasks.filter(t => t.id !== data.taskId))); }
}
function _localProfile(op, userId, data) {
  const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
  if (op === 'get') return users[userId] || null;
  if (op === 'put') { users[userId] = data; localStorage.setItem('pt_users', JSON.stringify(users)); return data; }
}
function _localMods(op, userId, data) {
  const key = `vectra.modules.${userId}`;
  const mods = JSON.parse(localStorage.getItem(key) || '[]');
  if (op === 'get') return mods;
  if (op === 'put') { const i = mods.findIndex(m => m.code === data.code); if (i >= 0) mods[i] = data; else mods.push(data); localStorage.setItem(key, JSON.stringify(mods)); return data; }
  if (op === 'delete') { localStorage.setItem(key, JSON.stringify(mods.filter(m => m.code !== data.code))); }
}

export default DynamoClient;
