/**
 * Timer utilities (client-side display only, host is authoritative)
 */

import store from "../state/store.js";

/**
 * Format seconds as MM:SS
 * @param {number} seconds - Seconds to format
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Get timer urgency level
 * @param {number} seconds - Remaining seconds
 * @returns {string} 'normal', 'warning', or 'critical'
 */
export function getTimerUrgency(seconds) {
  if (seconds <= 10) {
    return "critical";
  }
  if (seconds <= 30) {
    return "warning";
  }
  return "normal";
}

/**
 * Client-side timer for display purposes
 * Syncs with host via TIMER_SYNC messages
 */
class ClientTimer {
  constructor() {
    this.interval = null;
    this.lastSyncTime = 0;
    this.lastSyncValue = 0;
  }

  /**
   * Start local timer interpolation
   * Called when entering answering phase
   */
  start() {
    this.stop();

    this.lastSyncTime = Date.now();
    this.lastSyncValue = store.get("timerRemaining");

    this.interval = setInterval(() => {
      if (!store.get("timerRunning")) {
        this.stop();
        return;
      }

      // Interpolate time based on last sync
      const elapsed = Math.floor((Date.now() - this.lastSyncTime) / 1000);
      const estimated = Math.max(0, this.lastSyncValue - elapsed);

      // Only update if not recently synced (to avoid jitter)
      const currentValue = store.get("timerRemaining");
      if (Math.abs(currentValue - estimated) <= 2) {
        store.set("timerRemaining", estimated);
      }
    }, 250);
  }

  /**
   * Sync with authoritative timer from host
   * @param {number} remaining - Remaining seconds from host
   */
  sync(remaining) {
    this.lastSyncTime = Date.now();
    this.lastSyncValue = remaining;
    store.set("timerRemaining", remaining);
  }

  /**
   * Stop local timer
   */
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

export const clientTimer = new ClientTimer();

export default {
  formatTime,
  getTimerUrgency,
  clientTimer,
};
