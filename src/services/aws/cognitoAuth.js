/**
 * Amazon Cognito Authentication Service
 *
 * In production, uses @aws-sdk/client-cognito-identity-provider
 * for user pool sign-up, sign-in, JWT token management.
 *
 * For demo/hackathon: localStorage-based auth with Cognito-compatible structure.
 * Switch USE_REAL_COGNITO=true + configure USER_POOL_ID to enable real Cognito.
 */

import { shortId } from '../../utils/id.js';

const USE_REAL_COGNITO = false;
const USER_POOL_ID = import.meta.env?.VITE_COGNITO_USER_POOL_ID || '';
const CLIENT_ID = import.meta.env?.VITE_COGNITO_CLIENT_ID || '';

// --- Session State ---
let currentSession = null;

export const CognitoAuth = {
  /**
   * Initialize: check for existing session
   */
  init() {
    const stored = localStorage.getItem('pt_session');
    if (stored) {
      currentSession = JSON.parse(stored);
      return currentSession;
    }
    return null;
  },

  /**
   * Sign up a new user
   */
  async signUp({ email, password, name, institution, course, dailyHours }) {
    if (USE_REAL_COGNITO) {
      // Production: CognitoIdentityProviderClient → SignUpCommand
      // const client = new CognitoIdentityProviderClient({ region: 'us-east-1' });
      // await client.send(new SignUpCommand({ ClientId, Username: email, Password: password, UserAttributes: [...] }));
    }

    const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
    if (users[email]) throw new Error('Account already exists');

    const user = {
      userId: shortId('user_'),
      email,
      password, // In production: never store plaintext — Cognito handles hashing
      name: name || 'Student',
      institution: institution || '',
      course: course || '',
      dailyHours: dailyHours || 4,
      createdAt: new Date().toISOString(),
    };

    users[email] = user;
    localStorage.setItem('pt_users', JSON.stringify(users));

    currentSession = { user, token: _generateMockJWT(user), expiresAt: Date.now() + 3600000 };
    localStorage.setItem('pt_session', JSON.stringify(currentSession));
    return currentSession;
  },

  /**
   * Sign in existing user
   */
  async signIn({ email, password }) {
    if (USE_REAL_COGNITO) {
      // Production: InitiateAuthCommand with AUTH_FLOW: USER_PASSWORD_AUTH
    }

    const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
    const user = users[email];
    if (!user || user.password !== password) throw new Error('Invalid credentials');

    currentSession = { user, token: _generateMockJWT(user), expiresAt: Date.now() + 3600000 };
    localStorage.setItem('pt_session', JSON.stringify(currentSession));
    return currentSession;
  },

  /**
   * Sign out
   */
  signOut() {
    currentSession = null;
    localStorage.removeItem('pt_session');
  },

  /**
   * Get current session (or null)
   */
  getSession() {
    return currentSession;
  },

  /**
   * Get current user profile
   */
  getUser() {
    return currentSession?.user || null;
  },

  /**
   * Update user profile attributes
   */
  async updateProfile(updates) {
    if (!currentSession) throw new Error('Not authenticated');
    const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
    const email = currentSession.user.email;
    users[email] = { ...users[email], ...updates };
    currentSession.user = users[email];
    localStorage.setItem('pt_users', JSON.stringify(users));
    localStorage.setItem('pt_session', JSON.stringify(currentSession));
    return currentSession.user;
  },

  /**
   * Check if user is authenticated
   */
  isAuthenticated() {
    return !!currentSession && currentSession.expiresAt > Date.now();
  },
};

function _generateMockJWT(user) {
  // Simulates Cognito ID token structure
  return btoa(
    JSON.stringify({ sub: user.userId, email: user.email, name: user.name, iat: Date.now() }),
  );
}

export default CognitoAuth;
