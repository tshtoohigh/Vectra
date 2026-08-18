/**
 * Amazon Bedrock AI Service (via Lambda)
 *
 * When API Gateway is configured:
 *   All AI operations go through API Gateway → Lambda → DynamoDB
 *   The Lambda function processes tasks server-side (real AWS compute).
 *
 * When API Gateway is NOT configured:
 *   Falls back to client-side mock logic (demo mode).
 *
 * Note: Bedrock itself is blocked in Learner Lab, so the Lambda uses
 * rule-based intelligence. The important thing is the processing happens
 * on REAL AWS infrastructure (Lambda reading/writing DynamoDB), not
 * in the browser.
 */

import { APIGateway } from './apiGateway.js';
import { shortId } from '../../utils/id.js';

export const BedrockClient = {
  /**
   * Parse natural language input into structured task JSON
   * → Calls Lambda via API Gateway (real server-side processing)
   */
  async parseNaturalLanguage(input) {
    if (APIGateway.isConfigured()) {
      try {
        const result = await APIGateway.aiParse(input);
        console.log('[Bedrock/Lambda] Server-side parse result:', result);
        return result;
      } catch (err) {
        console.warn('[Bedrock/Lambda] Parse failed, using local fallback:', err.message);
      }
    }
    // Fallback: local mock parsing
    return _mockParse(input);
  },

  /**
   * Decompose a task into 3-5 actionable sub-milestones
   * → Calls Lambda which reads from DynamoDB, generates milestones,
   *   writes them back to DynamoDB, and returns the result.
   */
  async decomposeTask(task) {
    if (APIGateway.isConfigured()) {
      try {
        const result = await APIGateway.aiDecompose(task.id);
        console.log('[Bedrock/Lambda] Server-side decompose result:', result);
        return result;
      } catch (err) {
        console.warn('[Bedrock/Lambda] Decompose failed, using local fallback:', err.message);
      }
    }
    // Fallback: local mock
    return _mockDecompose(task);
  },

  /**
   * Generate AI study plan / rebalance overloaded days
   * → Calls Lambda which queries ALL tasks from DynamoDB and analyzes workload
   */
  async rebalanceWorkload(tasks, dailyHours = 4) {
    if (APIGateway.isConfigured()) {
      try {
        const result = await APIGateway.aiRebalance();
        console.log('[Bedrock/Lambda] Server-side rebalance result:', result);
        return result;
      } catch (err) {
        console.warn('[Bedrock/Lambda] Rebalance failed, using local fallback:', err.message);
      }
    }
    // Fallback: local mock
    return _mockRebalance(tasks, dailyHours);
  },

  /**
   * Generate priority explanation for a task
   */
  async explainPriority(task, allTasks) {
    return _mockExplain(task, allTasks);
  },
};

// === LOCAL FALLBACK IMPLEMENTATIONS (used when API is not configured) ===

function _mockParse(input) {
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
  }

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
    source: 'local (API not configured)',
    _rawInput: input,
  };
}

function _mockDecompose(task) {
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
    reasoning: `Breaking "${task.title}" into ${numSteps} manageable milestones over ${daysAvailable} days. Each step takes ~${hoursPerStep}h. (Local fallback — connect API for server-side processing.)`,
  };
}

function _mockRebalance(tasks, dailyHours) {
  const activeTasks = tasks.filter((t) => t.status !== 'Completed');
  return {
    suggestion: `You have ${activeTasks.length} active tasks. Connect the API Gateway for real server-side workload analysis from DynamoDB.`,
    redistributed: activeTasks.map((t) => ({ ...t, _aiNote: 'Consider starting earlier' })),
  };
}

function _mockExplain(task, allTasks) {
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
