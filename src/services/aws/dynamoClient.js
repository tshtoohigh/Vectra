/**
 * Amazon DynamoDB Data Layer
 *
 * When API Gateway is configured (VITE_API_URL is set):
 *   All operations go through API Gateway → Lambda → DynamoDB
 *   This module calls the real API endpoints.
 *
 * When API Gateway is NOT configured:
 *   Falls back to localStorage (demo mode).
 *
 * Table: Vectra
 * Key Schema: PK (USER#<userId>) + SK (TASK#<taskId>)
 */

import { APIGateway } from './apiGateway.js';

const TABLE_NAME = 'Vectra';

export const DynamoClient = {
  /**
   * Get all tasks for a user — calls real DynamoDB via Lambda
   */
  async getTasks(userId) {
    if (APIGateway.isConfigured()) {
      const result = await APIGateway.getTasks();
      return result?.tasks || [];
    }
    // Fallback: localStorage
    const key = `dynamo_tasks_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  /**
   * Put a task (create or overwrite) — writes to real DynamoDB
   */
  async putTask(userId, task) {
    if (APIGateway.isConfigured()) {
      const result = await APIGateway.createTask(task);
      return result?.task || task;
    }
    // Fallback: localStorage
    const key = `dynamo_tasks_${userId}`;
    const tasks = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) tasks[idx] = task;
    else tasks.push(task);
    localStorage.setItem(key, JSON.stringify(tasks));
    return task;
  },

  /**
   * Update a task — updates real DynamoDB record
   */
  async updateTask(userId, taskId, updates) {
    if (APIGateway.isConfigured()) {
      const result = await APIGateway.updateTask(taskId, updates);
      return result?.task || updates;
    }
    // Fallback: localStorage
    const key = `dynamo_tasks_${userId}`;
    const tasks = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = tasks.findIndex((t) => t.id === taskId);
    if (idx >= 0) tasks[idx] = { ...tasks[idx], ...updates };
    localStorage.setItem(key, JSON.stringify(tasks));
    return tasks[idx];
  },

  /**
   * Delete a task — removes from real DynamoDB
   */
  async deleteTask(userId, taskId) {
    if (APIGateway.isConfigured()) {
      await APIGateway.deleteTask(taskId);
      return;
    }
    // Fallback: localStorage
    const key = `dynamo_tasks_${userId}`;
    const tasks = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = tasks.filter((t) => t.id !== taskId);
    localStorage.setItem(key, JSON.stringify(filtered));
  },

  /**
   * Get user profile
   */
  async getProfile(userId) {
    if (APIGateway.isConfigured()) {
      // Profile stored locally for now (Cognito handles this in production)
      const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
      return Object.values(users).find((u) => u.userId === userId) || null;
    }
    const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
    return Object.values(users).find((u) => u.userId === userId) || null;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
    const user = Object.values(users).find((u) => u.userId === userId);
    if (user) {
      Object.assign(user, updates);
      users[user.email] = user;
      localStorage.setItem('pt_users', JSON.stringify(users));
    }
    return user;
  },

  /**
   * Batch write (for seeding)
   */
  async batchWrite(userId, tasks) {
    if (APIGateway.isConfigured()) {
      // Create each task via API
      const results = await Promise.all(tasks.map((t) => APIGateway.createTask(t)));
      return results;
    }
    const key = `dynamo_tasks_${userId}`;
    localStorage.setItem(key, JSON.stringify(tasks));
  },

  // --- DynamoDB Key Helpers ---
  keys: {
    userPK: (userId) => `USER#${userId}`,
    taskSK: (taskId) => `TASK#${taskId}`,
    deadlineSK: (iso) => `DEADLINE#${iso}`,
    modulePK: (code) => `MODULE#${code}`,
  },
};

export default DynamoClient;
