/**
 * Amazon EventBridge Scheduler
 *
 * When the real AWS backend is deployed:
 *   EventBridge runs a REAL scheduled rule (every 3 hours) that triggers
 *   the DeadlineChecker Lambda. This happens entirely server-side —
 *   no browser involvement needed.
 *
 * This client-side module:
 *   - Provides a local polling fallback for demo mode
 *   - When API is configured, still runs a lighter local sweep for
 *     immediate UI updates (the heavy lifting is done server-side)
 *
 * Real architecture:
 *   EventBridge rule (rate: 3 hours)
 *     → Lambda (PolyTrack_DeadlineChecker)
 *       → DynamoDB scan (find at-risk tasks)
 *         → SNS publish (send email alerts)
 */

import { APIGateway } from './apiGateway.js';

let schedulerInterval = null;
let jobCallbacks = {};

export const EventBridgeScheduler = {
  /**
   * Start the client-side scheduler.
   * This complements the real EventBridge rule (which runs server-side).
   * The local version provides immediate UI feedback between the 3-hour
   * server-side sweeps.
   */
  start(options = {}) {
    const intervalMs = options.intervalMs || 90000; // 90s for UI updates

    if (schedulerInterval) clearInterval(schedulerInterval);

    schedulerInterval = setInterval(() => {
      const isRealBackend = APIGateway.isConfigured();
      console.log(
        `[EventBridge] Local tick at ${new Date().toISOString()}` +
          (isRealBackend ? ' (real EventBridge also runs every 3h server-side)' : ' (demo mode)')
      );

      // Fire all registered job callbacks
      Object.entries(jobCallbacks).forEach(([name, cb]) => {
        try {
          cb();
        } catch (err) {
          console.error(`[EventBridge] Job "${name}" failed:`, err);
        }
      });
    }, intervalMs);

    const mode = APIGateway.isConfigured() ? 'hybrid (local UI + real EventBridge)' : 'local only';
    console.log(`[EventBridge] Scheduler started — mode: ${mode}, interval: ${intervalMs}ms`);
    return schedulerInterval;
  },

  /**
   * Stop the local scheduler
   */
  stop() {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log('[EventBridge] Local scheduler stopped');
    }
  },

  /**
   * Register a job to run on each schedule tick
   */
  registerJob(name, callback) {
    jobCallbacks[name] = callback;
    console.log(`[EventBridge] Job registered: "${name}"`);
  },

  /**
   * Unregister a job
   */
  unregisterJob(name) {
    delete jobCallbacks[name];
  },

  /**
   * Manually trigger all jobs (for testing / immediate check)
   */
  triggerNow() {
    Object.entries(jobCallbacks).forEach(([name, cb]) => {
      try {
        cb();
      } catch (err) {
        console.error(`[EventBridge] Manual trigger "${name}" failed:`, err);
      }
    });
  },

  /**
   * Get scheduler status
   */
  getStatus() {
    const isReal = APIGateway.isConfigured();
    return {
      running: !!schedulerInterval,
      jobs: Object.keys(jobCallbacks),
      mode: isReal ? 'hybrid' : 'local-only',
      serverSide: isReal
        ? 'EventBridge rule running every 3 hours (Lambda → DynamoDB → SNS)'
        : 'Not configured — set VITE_API_URL to enable',
      nextLocalTick: schedulerInterval ? 'Within 90 seconds' : 'Stopped',
    };
  },
};

export default EventBridgeScheduler;
