/**
 * Amazon DynamoDB Single-Table Data Layer
 *
 * Table: PolyTrack
 * Design: Single-table with composite keys
 *
 * Access Patterns:
 * | Pattern                | PK              | SK                    | Index     |
 * |------------------------|-----------------|----------------------|-----------|
 * | Get user profile       | USER#<userId>   | PROFILE              | Table     |
 * | Get all user tasks     | USER#<userId>   | TASK#<taskId>        | Table     |
 * | Tasks by deadline      | USER#<userId>   | DEADLINE#<iso>       | GSI1      |
 * | Tasks by module        | MODULE#<code>   | TASK#<taskId>        | GSI2      |
 *
 * Production: @aws-sdk/lib-dynamodb DynamoDBDocumentClient
 * Demo: localStorage with DynamoDB-compatible key structure
 */

const TABLE_NAME = 'PolyTrack';

export const DynamoClient = {
  /**
   * Get all tasks for a user
   */
  async getTasks(userId) {
    // Production: QueryCommand with PK = USER#<userId>, SK begins_with TASK#
    const key = `dynamo_tasks_${userId}`;
    return JSON.parse(localStorage.getItem(key) || '[]');
  },

  /**
   * Put a task (create or overwrite)
   */
  async putTask(userId, task) {
    // Production: PutCommand with Item = { PK: USER#<userId>, SK: TASK#<taskId>, ... }
    const key = `dynamo_tasks_${userId}`;
    const tasks = JSON.parse(localStorage.getItem(key) || '[]');
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx >= 0) tasks[idx] = task;
    else tasks.push(task);
    localStorage.setItem(key, JSON.stringify(tasks));
    return task;
  },

  /**
   * Delete a task
   */
  async deleteTask(userId, taskId) {
    // Production: DeleteCommand with Key = { PK: USER#<userId>, SK: TASK#<taskId> }
    const key = `dynamo_tasks_${userId}`;
    const tasks = JSON.parse(localStorage.getItem(key) || '[]');
    const filtered = tasks.filter((t) => t.id !== taskId);
    localStorage.setItem(key, JSON.stringify(filtered));
  },

  /**
   * Get user profile
   */
  async getProfile(userId) {
    // Production: GetCommand with Key = { PK: USER#<userId>, SK: PROFILE }
    const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
    return Object.values(users).find((u) => u.userId === userId) || null;
  },

  /**
   * Update user profile
   */
  async updateProfile(userId, updates) {
    // Production: UpdateCommand
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
