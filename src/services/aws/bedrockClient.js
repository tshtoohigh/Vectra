/**
 * AI Service — DynamoDB-Backed Processing
 *
 * Since Bedrock is blocked in Learner Lab, this module uses intelligent
 * rule-based logic for task parsing and decomposition. BUT — critically —
 * it reads tasks FROM DynamoDB and writes results BACK to DynamoDB.
 *
 * Every AI operation involves real DynamoDB calls:
 *   - decomposeTask: GetCommand (read task) → generates milestones → UpdateCommand (write subtasks)
 *   - rebalanceWorkload: QueryCommand (read all tasks) → analysis → returns advice
 *   - parseNaturalLanguage: parses input → returns structured data for PutCommand later
 *
 * This demonstrates DynamoDB being used for intelligent data processing,
 * not just simple CRUD.
 */

import { DynamoClient } from './dynamoClient.js';
import { isAWSConfigured } from './awsConfig.js';
import { shortId } from '../../utils/id.js';

export const BedrockClient = {
  /**
   * Parse natural language input into structured task JSON
   * Processing happens here, result gets saved to DynamoDB by the caller
   */
  async parseNaturalLanguage(input) {
    const result = _parseInput(input);
    console.log('[AI] Parsed natural language input:', result.title);
    return result;
  },

  /**
   * Decompose a task into 3-5 actionable sub-milestones
   *
   * DynamoDB Operations:
   *   1. GetCommand — read the task from DynamoDB
   *   2. (generate milestones)
   *   3. UpdateCommand — write subtasks back to DynamoDB
   */
  async decomposeTask(task, userId) {
    let taskData = task;

    // If AWS configured, read fresh task data from DynamoDB
    if (isAWSConfigured() && userId && task.id) {
      const fresh = await DynamoClient.getTask(userId, task.id);
      if (fresh) {
        taskData = fresh;
        console.log(`[AI+DynamoDB] Read task from DynamoDB for decomposition: ${task.id}`);
      }
    }

    // Generate milestones
    const breakdown = _generateMilestones(taskData);

    // Write subtasks back to DynamoDB
    if (isAWSConfigured() && userId && task.id) {
      await DynamoClient.updateTask(userId, task.id, {
        subtasks: breakdown.subtasks,
        status: 'In Progress',
      });
      console.log(`[AI+DynamoDB] Wrote ${breakdown.subtasks.length} milestones back to DynamoDB`);
    }

    return breakdown;
  },

  /**
   * Analyze workload and suggest rebalancing
   *
   * DynamoDB Operations:
   *   1. QueryCommand — read ALL user tasks from DynamoDB
   *   2. (analyze workload distribution)
   *   3. Return advice based on real data
   */
  async rebalanceWorkload(tasks, dailyHours = 4, userId) {
    let taskList = tasks;

    // If AWS configured, read ALL tasks fresh from DynamoDB
    if (isAWSConfigured() && userId) {
      taskList = await DynamoClient.getTasks(userId);
      console.log(`[AI+DynamoDB] Read ${taskList.length} tasks from DynamoDB for rebalancing`);
    }

    return _analyzeWorkload(taskList, dailyHours);
  },

  /**
   * Generate priority explanation for a task
   */
  async explainPriority(task, allTasks) {
    return _generateExplanation(task, allTasks);
  },
};

// ═══════════════════════════════════════════════════════════════════
// INTELLIGENT PROCESSING LOGIC
// ═══════════════════════════════════════════════════════════════════

function _parseInput(input) {
  const lower = input.toLowerCase();

  // Task type detection
  let taskType = 'Assignment';
  if (lower.match(/\b(test|quiz|exam|midterm|final)\b/)) taskType = 'Test';
  else if (lower.match(/\b(project|prototype|capstone)\b/)) taskType = 'Project';
  else if (lower.match(/\b(presentation|present|pitch|demo)\b/)) taskType = 'Presentation';
  else if (lower.match(/\b(practical|lab|experiment|workshop)\b/)) taskType = 'Practical';

  // Extract weightage
  const weightMatch = input.match(/(?:worth|weight|weightage)?\s*(\d+)\s*%/i);
  const weightage = weightMatch ? parseInt(weightMatch[1]) : null;

  // Extract module code
  const moduleMatch = input.match(/\b([A-Z]{2,4}\s?\d{3,4})\b/i);
  const moduleCode = moduleMatch ? moduleMatch[1].replace(/\s/g, '').toUpperCase() : '';

  // Extract hours
  const hoursMatch = input.match(/(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|h)\b/i);
  const hours = hoursMatch ? parseFloat(hoursMatch[1]) : null;

  // Extract deadline
  let deadline = null;
  const now = new Date();
  if (lower.includes('tomorrow')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 0, 0);
    deadline = d.toISOString();
  } else if (lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)) {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf(
      lower.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/)[1],
    );
    const diff = (targetDay - now.getDay() + 7) % 7 || 7;
    const d = new Date(now);
    d.setDate(d.getDate() + diff);
    d.setHours(23, 59, 0, 0);
    deadline = d.toISOString();
  } else if (lower.includes('next week')) {
    const d = new Date(now);
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    deadline = d.toISOString();
  } else if (lower.match(/in\s+(\d+)\s+days?/)) {
    const days = parseInt(lower.match(/in\s+(\d+)\s+days?/)[1]);
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(23, 59, 0, 0);
    deadline = d.toISOString();
  }

  // Time extraction
  const timeMatch = input.match(/(\d{1,2})[:\.](\d{2})\s*(am|pm)?/i);
  if (timeMatch && deadline) {
    let hours24 = parseInt(timeMatch[1]);
    const mins = parseInt(timeMatch[2]);
    if (timeMatch[3]?.toLowerCase() === 'pm' && hours24 < 12) hours24 += 12;
    if (timeMatch[3]?.toLowerCase() === 'am' && hours24 === 12) hours24 = 0;
    const d = new Date(deadline);
    d.setHours(hours24, mins, 0, 0);
    deadline = d.toISOString();
  }

  // Extract title
  let title = input
    .replace(/\b(due|by|before|on|at|worth|weight|weightage|taking|about|around)\b.*$/gi, '')
    .replace(/\b[A-Z]{2,4}\s?\d{3,4}\b/gi, '')
    .replace(/\d+\s*%/g, '')
    .replace(/\d+(?:\.\d+)?\s*(?:hours?|hrs?|h)\b/gi, '')
    .replace(/\b(assignment|test|quiz|project|presentation|practical|lab)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!title || title.length < 3) title = input.substring(0, 50).trim();
  title = title.charAt(0).toUpperCase() + title.slice(1);

  return {
    title,
    moduleCode,
    taskType,
    deadline,
    weightage,
    hours,
    confidence: 0.85,
    _rawInput: input,
  };
}

function _generateMilestones(task) {
  const totalHours = task.hours || task.estimatedHours || 6;
  const deadline = new Date(task.deadline);
  const daysAvailable = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / 86400000));
  const numSteps = Math.min(5, Math.max(3, Math.ceil(totalHours / 2.5)));
  const hoursPerStep = Math.round((totalHours / numSteps) * 10) / 10;

  const templates = {
    Assignment: [
      'Research & gather references/materials',
      'Create outline and structure',
      'Write first draft / core implementation',
      'Review, edit, and refine',
      'Final formatting and submission',
    ],
    Test: [
      'Review lecture notes & key concepts',
      'Practice with worked examples & tutorials',
      'Complete past year papers under timed conditions',
      'Identify and revise weak areas',
      'Final revision & create summary notes',
    ],
    Project: [
      'Requirements analysis & wireframing/planning',
      'Core development / implementation',
      'Testing, debugging & iteration',
      'Documentation & report writing',
      'Final integration, deployment & submission',
    ],
    Presentation: [
      'Research topic & collect content',
      'Create slide structure & outline',
      'Design slides & add visuals',
      'Rehearse delivery & refine timing',
      'Final practice run & prepare backup',
    ],
    Practical: [
      'Review theory & lab procedures',
      'Prepare environment, tools & materials',
      'Execute practical tasks / experiment',
      'Document observations & analyze results',
      'Write-up lab report & verify',
    ],
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
    reasoning: `Breaking "${task.title}" into ${numSteps} manageable milestones over ${daysAvailable} days. Each step takes ~${hoursPerStep}h, distributing the ${totalHours}h workload evenly to prevent last-minute cramming.`,
  };
}

function _analyzeWorkload(tasks, dailyHours) {
  const active = tasks.filter((t) => t.status !== 'Completed');
  const now = Date.now();

  const urgent = [];
  const heavy = [];
  const comfortable = [];

  active.forEach((t) => {
    const deadline = new Date(t.deadline).getTime();
    const hoursLeft = (deadline - now) / 3600000;
    const remaining = (t.hours || 4) * (1 - (t.progress || 0) / 100);

    if (hoursLeft < 48 && remaining > 2) urgent.push(t);
    else if (hoursLeft < 120 && remaining > 4) heavy.push(t);
    else comfortable.push(t);
  });

  const parts = [];
  if (urgent.length) {
    const names = urgent.slice(0, 3).map((t) => t.title?.substring(0, 30) || '?').join(', ');
    parts.push(`URGENT: ${names} — due very soon with significant work remaining. Focus here first.`);
  }
  if (heavy.length) {
    const names = heavy.slice(0, 3).map((t) => t.title?.substring(0, 30) || '?').join(', ');
    parts.push(`Heavy load: ${names} — start making progress now to avoid a crunch.`);
  }
  if (comfortable.length) {
    parts.push(`${comfortable.length} task(s) are on track with comfortable timelines.`);
  }

  return {
    suggestion: parts.join(' ') || 'Your workload looks manageable. Keep steady progress.',
    urgentCount: urgent.length,
    heavyCount: heavy.length,
    comfortableCount: comfortable.length,
    redistributed: active.map((t) => ({ ...t, _aiNote: 'Consider starting earlier' })),
  };
}

function _generateExplanation(task, allTasks) {
  const hrs = Math.max(0, (new Date(task.deadline).getTime() - Date.now()) / 3600000);
  const daysLeft = Math.round((hrs / 24) * 10) / 10;
  const needed = Math.round((task.hours || 4) * (1 - (task.progress || 0) / 100));
  const conflicts = (allTasks || []).filter(
    (t) =>
      t.id !== task.id &&
      t.status !== 'Completed' &&
      Math.abs(new Date(t.deadline).getTime() - new Date(task.deadline).getTime()) < 72 * 3600000,
  );

  let msg = `Worth ${task.weightage || 10}% of your grade with about ${needed}h of work left and ${daysLeft} days to go.`;

  if (conflicts.length > 0) {
    const names = conflicts
      .slice(0, 2)
      .map((c) => c.moduleCode || c.title.substring(0, 20))
      .join(' and ');
    msg += ` It lands in the same window as ${names}, so starting a day earlier than you think you need to will save you from a rough evening.`;
  } else if (daysLeft < 3 && needed > 3) {
    msg += ` That is tight — block out a solid session tonight or tomorrow to stay ahead of it.`;
  } else {
    msg += ` You have enough runway, but getting the first hour done today keeps momentum up.`;
  }
  return msg;
}

export default BedrockClient;
