/**
 * Amazon EventBridge Scheduler
 *
 * Simulates EventBridge scheduled rules that trigger Lambda functions
 * for recurring deadline checks and notification dispatch.
 *
 * Production Rule: rate(3 hours) → Lambda → SNS/SES
 * Demo: setInterval polling every 60 seconds (accelerated for demo)
 *
 * Scheduled Jobs:
 * 1. Deadline proximity check → triggers SNS alerts
 * 2. Daily digest email → triggers SES at 8 AM
 * 3. Priority recalculation → updates all task scores
 */

let schedulerInterval = null;
let jobCallbacks = {};

export const EventBridgeScheduler = {
  /**
   * Start the background scheduler (simulates EventBridge cron)
   */
  start(options = {}) {
    const intervalMs = options.intervalMs || 60000; // Default: check every 60s (prod: 3 hours)

    if (schedulerInterval) clearInterval(schedulerInterval);

    schedulerInterval = setInterval(() => {
      console.log('[EventBridge] Scheduled check triggered at', new Date().toISOString());

      // Fire all registered job callbacks
      Object.entries(jobCallbacks).forEach(([name, cb]) => {
        try {
          cb();
        } catch (err) {
          console.error(`[EventBridge] Job "${name}" failed:`, err);
        }
      });
    }, intervalMs);

    console.log(`[EventBridge] Scheduler started (interval: ${intervalMs}ms)`);
    return schedulerInterval;
  },

  /**
   * Stop the scheduler
   */
  stop() {
    if (schedulerInterval) {
      clearInterval(schedulerInterval);
      schedulerInterval = null;
      console.log('[EventBridge] Scheduler stopped');
    }
  },

  /**
   * Register a job to run on each schedule tick
   * @param {string} name - Unique job identifier
   * @param {function} callback - Function to execute
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
   * Manually trigger all jobs (for testing)
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
    return {
      running: !!schedulerInterval,
      jobs: Object.keys(jobCallbacks),
      nextTick: schedulerInterval ? 'Within 60 seconds' : 'Stopped',
    };
  },
};

export default EventBridgeScheduler;
