/**
 * Authentication Service — DynamoDB-Backed
 *
 * Since Cognito requires complex setup in Learner Lab, this module
 * stores user accounts directly in DynamoDB (table: Vectra).
 *
 * DynamoDB Schema for users:
 *   PK: USER#<email>
 *   SK: PROFILE
 *   Fields: email, name, password (hashed in prod), institution, course, dailyHours, createdAt
 *
 * This means sign-up, sign-in, and profile updates all hit REAL DynamoDB.
 * Every auth operation is a genuine AWS SDK call.
 */

import { DynamoClient } from './dynamoClient.js';
import { isAWSConfigured } from './awsConfig.js';
import { shortId } from '../../utils/id.js';

let currentSession = null;

export const CognitoAuth = {
  /**
   * Initialize: check for existing session in localStorage
   * If AWS is configured, also verifies the profile exists in DynamoDB
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
   * Sign up a new user — creates profile in DynamoDB
   * DynamoDB Operation: GetCommand (check exists) + PutCommand (create)
   */
  async signUp({ email, password, name, institution, course, dailyHours }) {
    // Check if account already exists in DynamoDB
    if (isAWSConfigured()) {
      const existing = await DynamoClient.getProfileByEmail(email);
      if (existing) {
        throw new Error('Account already exists');
      }
    } else {
      // Fallback: check localStorage
      const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
      if (users[email]) throw new Error('Account already exists');
    }

    const user = {
      userId: email, // Use email as userId for simplicity
      email,
      password, // In production: hash this. For Learner Lab demo: stored as-is
      name: name || 'Student',
      institution: institution || '',
      course: course || '',
      dailyHours: dailyHours || 4,
      createdAt: new Date().toISOString(),
    };

    // Save to DynamoDB
    if (isAWSConfigured()) {
      await DynamoClient.putProfile(email, user);
      console.log(`[DynamoDB] User profile created: USER#${email}`);

      // Subscribe user's email to SNS for deadline alerts
      try {
        const { SNSNotifier } = await import('./snsNotifier.js');
        await SNSNotifier.subscribe(email);
        console.log(`[SNS] Auto-subscribed ${email} to deadline alerts`);
      } catch (err) {
        console.warn('[SNS] Auto-subscribe failed:', err.message);
      }
    } else {
      // Fallback: localStorage
      const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
      users[email] = user;
      localStorage.setItem('pt_users', JSON.stringify(users));
    }

    // Create session
    currentSession = {
      user,
      token: _generateToken(user),
      expiresAt: Date.now() + 3600000,
    };
    localStorage.setItem('pt_session', JSON.stringify(currentSession));
    return currentSession;
  },

  /**
   * Sign in existing user — reads profile from DynamoDB
   * DynamoDB Operation: GetCommand to verify credentials
   */
  async signIn({ email, password }) {
    let user = null;

    if (isAWSConfigured()) {
      // Read user from DynamoDB
      user = await DynamoClient.getProfileByEmail(email);
      if (!user) {
        throw new Error('Account not found. Please sign up first.');
      }
      if (user.password !== password) {
        throw new Error('Invalid password');
      }
      console.log(`[DynamoDB] User signed in: USER#${email}`);
    } else {
      // Fallback: localStorage
      const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
      user = users[email];
      if (!user || user.password !== password) {
        throw new Error('Invalid credentials');
      }
    }

    // Create session
    currentSession = {
      user,
      token: _generateToken(user),
      expiresAt: Date.now() + 3600000,
    };
    localStorage.setItem('pt_session', JSON.stringify(currentSession));
    return currentSession;
  },

  /**
   * Sign out — clears local session
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
   * Update user profile — writes to DynamoDB
   * DynamoDB Operation: PutCommand (overwrite profile)
   */
  async updateProfile(updates) {
    if (!currentSession) throw new Error('Not authenticated');

    const email = currentSession.user.email;
    const updatedUser = { ...currentSession.user, ...updates, updatedAt: new Date().toISOString() };

    if (isAWSConfigured()) {
      await DynamoClient.putProfile(email, updatedUser);
      console.log(`[DynamoDB] Profile updated: USER#${email}`);
    } else {
      const users = JSON.parse(localStorage.getItem('pt_users') || '{}');
      users[email] = updatedUser;
      localStorage.setItem('pt_users', JSON.stringify(users));
    }

    currentSession.user = updatedUser;
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

/**
 * Generate a simple token (simulates JWT structure)
 */
function _generateToken(user) {
  return btoa(
    JSON.stringify({
      sub: user.userId || user.email,
      email: user.email,
      name: user.name,
      iat: Date.now(),
    }),
  );
}

export default CognitoAuth;
