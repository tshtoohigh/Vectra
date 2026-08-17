/**
 * Amazon API Gateway REST Client
 *
 * Centralizes all HTTP requests to the API Gateway endpoint.
 * In production: points to https://<api-id>.execute-api.<region>.amazonaws.com/prod
 * For demo: routes to local mock handlers.
 */

const API_BASE = import.meta.env?.VITE_API_URL || '';

export const APIGateway = {
  /**
   * Generic request handler with JWT auth header
   */
  async request(method, path, body = null) {
    const session = JSON.parse(localStorage.getItem('pt_session') || 'null');
    const headers = {
      'Content-Type': 'application/json',
      ...(session?.token && { Authorization: `Bearer ${session.token}` }),
    };

    // If no real API configured, return null (caller uses local mock)
    if (!API_BASE) return null;

    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      ...(body && { body: JSON.stringify(body) }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(err.error || `HTTP ${response.status}`);
    }

    return response.json();
  },

  // --- Task Endpoints ---
  getTasks: () => APIGateway.request('GET', '/tasks'),
  createTask: (task) => APIGateway.request('POST', '/tasks', task),
  updateTask: (id, data) => APIGateway.request('PUT', `/tasks/${id}`, data),
  deleteTask: (id) => APIGateway.request('DELETE', `/tasks/${id}`),

  // --- AI Endpoints (Bedrock) ---
  aiParse: (input) => APIGateway.request('POST', '/ai/parse', { input }),
  aiDecompose: (taskId) => APIGateway.request('POST', `/ai/decompose/${taskId}`),
  aiRebalance: (tasks) => APIGateway.request('POST', '/ai/rebalance', { tasks }),

  // --- Textract ---
  textractUpload: (fileBase64, filename) =>
    APIGateway.request('POST', '/upload/textract', { file: fileBase64, filename }),

  // --- User ---
  getProfile: () => APIGateway.request('GET', '/user'),
  updateProfile: (data) => APIGateway.request('PUT', '/user', data),
};

export default APIGateway;
