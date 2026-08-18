/**
 * Amazon API Gateway REST Client
 *
 * Centralizes all HTTP requests to the REAL API Gateway endpoint.
 * When VITE_API_URL is set, all requests go to the live AWS backend:
 *   API Gateway → Lambda → DynamoDB / SNS
 *
 * When VITE_API_URL is blank, returns null so the app falls back to local state.
 */

const API_BASE = import.meta.env?.VITE_API_URL || '';

/**
 * Get the current user ID for API requests.
 * Uses the session from localStorage (set by cognitoAuth).
 */
function getUserId() {
  try {
    const session = JSON.parse(localStorage.getItem('pt_session') || 'null');
    return session?.user?.userId || session?.user?.email || 'demo_user';
  } catch {
    return 'demo_user';
  }
}

export const APIGateway = {
  /**
   * Check if the real API is configured
   */
  isConfigured() {
    return !!API_BASE;
  },

  /**
   * Generic request handler — sends real HTTPS requests to API Gateway
   */
  async request(method, path, body = null) {
    // If no real API configured, return null (caller uses local mock)
    if (!API_BASE) return null;

    const userId = getUserId();
    const headers = {
      'Content-Type': 'application/json',
      'x-user-id': userId,
    };

    // Add JWT token if available
    const session = JSON.parse(localStorage.getItem('pt_session') || 'null');
    if (session?.token) {
      headers['Authorization'] = `Bearer ${session.token}`;
    }

    const url = `${API_BASE}${path}${path.includes('?') ? '&' : '?'}userId=${userId}`;

    const response = await fetch(url, {
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

  // --- Task Endpoints (→ Lambda → DynamoDB) ---
  getTasks: () => APIGateway.request('GET', '/tasks'),
  createTask: (task) => APIGateway.request('POST', '/tasks', task),
  updateTask: (id, data) => APIGateway.request('PUT', `/tasks/${id}`, data),
  deleteTask: (id) => APIGateway.request('DELETE', `/tasks/${id}`),
  getTask: (id) => APIGateway.request('GET', `/tasks/${id}`),

  // --- AI Endpoints (→ Lambda → DynamoDB) ---
  aiParse: (input) => APIGateway.request('POST', '/ai/parse', { input }),
  aiDecompose: (taskId) => APIGateway.request('POST', `/ai/decompose/${taskId}`),
  aiRebalance: () => APIGateway.request('POST', '/ai/rebalance'),

  // --- Notification Endpoints (→ Lambda → DynamoDB + SNS) ---
  checkNotifications: () => APIGateway.request('POST', '/notifications/check'),
  subscribeEmail: (email) => APIGateway.request('POST', '/notifications/subscribe', { email }),
};

export default APIGateway;
