/**
 * AI Service — OpenRouter + DynamoDB Integration
 *
 * This module provides AI-powered features using REAL AI models via OpenRouter:
 *   - Natural language task parsing (AI understands "assignment due Friday worth 30%")
 *   - Task decomposition into milestones (AI generates study plan)
 *   - Workload rebalancing advice (AI analyzes your schedule)
 *   - Priority explanations (AI explains why a task is urgent)
 *
 * All AI results are read from / written back to DynamoDB.
 * When AI is unavailable, falls back to rule-based logic.
 *
 * AI Provider: OpenRouter (free models, no credit card required)
 * Database: AWS DynamoDB (table: Vectra)
 */

import { DynamoClient } from './dynamoClient.js';
import { isAWSConfigured } from './awsConfig.js';
import { isAIConfigured, aiParseTask, aiDecomposeTask, aiRebalanceWorkload, aiExplainPriority } from './aiClient.js';
import { shortId } from '../../utils/id.js';

export const BedrockClient = {
  /**
   * Parse natural language input into structured task JSON
   * Uses REAL AI (OpenRouter) when configured, falls back to regex
   */
  async parseNaturalLanguage(input) {
    // Try real AI first
    if (isAIConfigured()) {
      try {
        const result = await aiParseTask(input);
        if (result) {
          console.log('[AI+DynamoDB] Real AI parsed task successfully');
          return result;
        }
      } catch (err) {
        console.warn('[AI] Parse failed, falling back to local:', err.message);
      }
    }

    // Fallback: local regex parsing
    return _localParse(input);
  },

  /**
   * Decompose a task into 3-5 actionable sub-milestones
   * Uses REAL AI (OpenRouter) + reads/writes DynamoDB
   *
   * Flow:
   *   1. Read task from DynamoDB (GetCommand)
   *   2. Send to AI model for decomposition
   *   3. Write milestones back to DynamoDB (UpdateCommand)
   */
  async decomposeTask(task, userId) {
    let taskData = task;

    // Read fresh task data from DynamoDB
    if (isAWSConfigured() && userId && task.id) {
      const fresh = await DynamoClient.getTask(userId, task.id);
      if (fresh) {
        taskData = fresh;
        console.log(`[DynamoDB] GetCommand: read task for AI decomposition`);
      }
    }

    // Try real AI decomposition
    if (isAIConfigured()) {
      try {
        const result = await aiDecomposeTask(taskData);
        if (result && result.subtasks?.length) {
          // Write AI-generated milestones back to DynamoDB
          if (isAWSConfigured() && userId && task.id) {
            await DynamoClient.updateTask(userId, task.id, {
              subtasks: result.subtasks,
              status: 'In Progress',
            });
            console.log(`[DynamoDB] UpdateCommand: wrote ${result.subtasks.length} AI milestones`);
          }
          return result;
        }
      } catch (err) {
        console.warn('[AI] Decompose failed, falling back:', err.message);
      }
    }

    // Fallback: rule-based decomposition
    const breakdown = _localDecompose(taskData);

    // Still write to DynamoDB even with fallback
    if (isAWSConfigured() && userId && task.id) {
      await DynamoClient.updateTask(userId, task.id, {
        subtasks: breakdown.subtasks,
        status: 'In Progress',
      });
      console.log(`[DynamoDB] UpdateCommand: wrote ${breakdown.subtasks.length} milestones (fallback)`);
    }

    return breakdown;
  },

  /**
   * Analyze workload and suggest rebalancing
   * Uses REAL AI + reads from DynamoDB
   *
   * Flow:
   *   1. QueryCommand: read ALL tasks from DynamoDB
   *   2. Send to AI for analysis
   *   3. Return personalized advice
   */
  async rebalanceWorkload(tasks, dailyHours = 4, userId) {
    let taskList = tasks;

    // Read ALL tasks from DynamoDB
    if (isAWSConfigured() && userId) {
      taskList = await DynamoClient.getTasks(userId);
      console.log(`[DynamoDB] QueryCommand: read ${taskList.length} tasks for AI rebalancing`);
    }

    // Try real AI rebalancing
    if (isAIConfigured()) {
      try {
        const result = await aiRebalanceWorkload(taskList, dailyHours);
        if (result) {
          return result;
        }
      } catch (err) {
        console.warn('[AI] Rebalance failed, falling back:', err.message);
      }
    }

    // Fallback: rule-based analysis
    return _localRebalance(taskList, dailyHours);
  },

  /**
   * Generate priority explanation for a task
   * Uses REAL AI when available
   */
  async explainPriority(task, allTasks) {
    if (isAIConfigured()) {
      try {
        const result = await aiExplainPriority(task, allTasks);
        if (result) return result;
      } catch (err) {
        console.warn('[AI] Explain failed, falling back:', err.message);
      }
    }
    return _localExplain(task, allTasks);
  },
};

// ═══════════════════════════════════════════════════════════════════
// LOCAL FALLBACK LOGIC (when AI is unavailable)
// ═══════════════════════════════════════════════════════════════════

function _localParse(input) {
  const lower = input.toLowerCase();

  let taskType = 'Assignment';
  if (lower.match(/\b(test|quiz|exam|midterm|final)\b/)) taskType = 'Test';
  else if (lower.match(/\b(project|prototype|capstone)\b/)) taskType = 'Project';
  else if (lower.match(/\b(presentation|present|pitch|demo)\b/)) taskType = 'Presentation';
  else if (lower.match(/\b(practical|lab|experiment|workshop)\b/)) taskType = 'Practical';

  const weightMatch = input.match(/(?:worth|weight|weightage)?\s*(\d+)\s*%/i);
  const weightage = weightMatch ? parseInt(weightMatch[1]) : null;

  const moduleMatch = input.match(/\b([A-Z]{2,4}\s?\d{3,4})\b/i);
  const moduleCode = moduleMatch ? moduleMatch[1].replace(/\s/g, '').toUpperCase() : '';

  const hoursMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const hours = hoursMatch ? parseFloat(hoursMatch[1]) : null;

  let deadline = null;
  const now = new Date();
  if (lower.includes('tomorrow')) {
    const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(23, 59, 0, 0);
    deadline = d.toISOString();
  } else if (lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    const dayNames = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const targetDay = dayNames.indexOf(lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)[1]);
    const diff = (targetDay - now.getDay() + 7) % 7 || 7;
    const d = new Date(now); d.setDate(d.getDate() + diff); d.setHours(23, 59, 0, 0);
    deadline = d.toISOString();
  } else if (lower.includes('next week')) {
    const d = new Date(now); d.setDate(d.getDate() + 7); d.setHours(23, 59, 0, 0);
    deadline = d.toISOString();
  }

  let title = input
    .replace(/\b(due|by|before|on|at|worth|weight|weightage|taking|about|around)\b.*$/gi, '')
    .replace(/\b[A-Z]{2,4}\s?\d{3,4}\b/gi, '')
    .replace(/\d+\s*%/g, '')
    .replace(/\d+(?:\.\d+)?\s*(?:hours?|hrs?|h)\b/gi, '')
    .replace(/\s+/g, ' ').trim();
  if (!title || title.length < 3) title = input.substring(0, 50).trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return { title, moduleCode, taskType, deadline, weightage, hours, confidence: 0.7, _source: 'local fallback', _rawInput: input };
}

function _localDecompose(task) {
  const totalHours = task.hours || 6;
  const deadline = new Date(task.deadline);
  const daysAvailable = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
  const numSteps = Math.min(5, Math.max(3, Math.ceil(totalHours / 2.5)));
  const hoursPerStep = Math.round((totalHours / numSteps) * 10) / 10;

  const templates = {
    Assignment: ['Research & gather references', 'Create outline and structure', 'Write first draft', 'Review and refine', 'Final formatting and submit'],
    Test: ['Review lecture notes', 'Practice with examples', 'Past papers timed', 'Revise weak areas', 'Final summary notes'],
    Project: ['Plan and wireframe', 'Core implementation', 'Testing and debugging', 'Documentation', 'Final submission'],
    Presentation: ['Research content', 'Create slide outline', 'Design slides', 'Rehearse delivery', 'Final practice'],
    Practical: ['Review procedures', 'Prepare tools', 'Execute tasks', 'Document results', 'Write report'],
  };

  const steps = (templates[task.taskType] || templates.Assignment).slice(0, numSteps);
  return {
    subtasks: steps.map((title, i) => ({
      id: shortId('sub_'),
      title,
      hours: hoursPerStep,
      done: false,
      dueDate: new Date(Date.now() + (i + 1) * (daysAvailable / numSteps) * 86400000).toISOString(),
    })),
    reasoning: `Breaking "${task.title}" into ${numSteps} milestones over ${daysAvailable} days (~${hoursPerStep}h each).`,
    _source: 'local fallback',
  };
}

function _localRebalance(tasks, dailyHours) {
  const active = tasks.filter(t => t.status !== 'Completed');
  const urgent = active.filter(t => (new Date(t.deadline).getTime() - Date.now()) / 3600000 < 48);
  return {
    suggestion: urgent.length > 0
      ? `You have ${urgent.length} urgent task(s). Focus on those first, then spread remaining work across available days.`
      : `Your workload looks manageable with ${active.length} active tasks. Keep steady progress.`,
    _source: 'local fallback',
  };
}

function _localExplain(task, allTasks) {
  const hrs = Math.max(0, (new Date(task.deadline).getTime() - Date.now()) / 3600000);
  const daysLeft = Math.round((hrs / 24) * 10) / 10;
  const needed = Math.round((task.hours || 4) * (1 - (task.progress || 0) / 100));
  let msg = `Worth ${task.weightage || 10}% with ${needed}h of work left and ${daysLeft} days to go.`;
  if (daysLeft < 3 && needed > 3) msg += ` That's tight — start now.`;
  else msg += ` You have time, but starting early helps.`;
  return msg;
}

export default BedrockClient;
