/**
 * Hash-based Router for screen navigation
 * Syncs with game phase state
 */

import store from "../state/store.js";
import { PHASES } from "../state/game-state.js";

// Map game phases to screen IDs
const PHASE_TO_SCREEN = {
  [PHASES.HOME]: "screen-home",
  [PHASES.LOBBY]: "screen-lobby",
  [PHASES.ANSWERING]: "screen-answer",
  [PHASES.VOTING]: "screen-voting",
  [PHASES.RESULTS]: "screen-results",
  [PHASES.GAME_OVER]: "screen-final",
};

class Router {
  constructor() {
    this.currentScreen = null;
    this.screenElements = {};
  }

  /**
   * Initialize router
   */
  init() {
    // Cache screen elements
    for (const screenId of Object.values(PHASE_TO_SCREEN)) {
      this.screenElements[screenId] = document.getElementById(screenId);
    }

    // Subscribe to game phase changes
    store.subscribe("gamePhase", (phase) => {
      this.showScreen(PHASE_TO_SCREEN[phase]);
    });

    // Show initial screen
    const initialPhase = store.get("gamePhase");
    this.showScreen(PHASE_TO_SCREEN[initialPhase]);
  }

  /**
   * Show a specific screen
   * @param {string} screenId - ID of the screen element to show
   */
  showScreen(screenId) {
    if (!screenId || this.currentScreen === screenId) {
      return;
    }

    const newScreen = this.screenElements[screenId];
    if (!newScreen) {
      console.warn("Screen not found:", screenId);
      return;
    }

    // Hide current screen
    if (this.currentScreen && this.screenElements[this.currentScreen]) {
      const oldScreen = this.screenElements[this.currentScreen];
      oldScreen.classList.remove("active");
      oldScreen.classList.add("screen-transition-exit");

      setTimeout(() => {
        oldScreen.classList.remove("screen-transition-exit");
      }, 300);
    }

    // Show new screen
    newScreen.classList.add("active", "entering");
    setTimeout(() => {
      newScreen.classList.remove("entering");
    }, 300);

    this.currentScreen = screenId;

    // Update URL hash (optional, for bookmarking)
    const phase = Object.entries(PHASE_TO_SCREEN).find(([, id]) => id === screenId)?.[0];
    if (phase && phase !== PHASES.HOME) {
      window.history.replaceState({}, "", `#${phase.toLowerCase()}`);
    }
  }

  /**
   * Get current screen ID
   */
  getCurrentScreen() {
    return this.currentScreen;
  }
}

export const router = new Router();
export default router;
