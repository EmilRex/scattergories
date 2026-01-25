/**
 * Game Phase State Machine
 * Manages transitions between game phases
 */

import store from "./store.js";

// Valid game phases
export const PHASES = {
  HOME: "HOME",
  LOBBY: "LOBBY",
  ANSWERING: "ANSWERING",
  VOTING: "VOTING",
  RESULTS: "RESULTS",
  GAME_OVER: "GAME_OVER",
};

// Valid phase transitions
const TRANSITIONS = {
  [PHASES.HOME]: [PHASES.LOBBY],
  [PHASES.LOBBY]: [PHASES.ANSWERING, PHASES.HOME],
  [PHASES.ANSWERING]: [PHASES.VOTING],
  [PHASES.VOTING]: [PHASES.RESULTS],
  [PHASES.RESULTS]: [PHASES.ANSWERING, PHASES.GAME_OVER],
  [PHASES.GAME_OVER]: [PHASES.LOBBY, PHASES.HOME],
};

class GameStateMachine {
  constructor() {
    this.transitionCallbacks = new Map();
  }

  /**
   * Get current phase
   */
  get currentPhase() {
    return store.get("gamePhase");
  }

  /**
   * Check if a transition is valid
   */
  canTransition(toPhase) {
    const validTargets = TRANSITIONS[this.currentPhase] || [];
    return validTargets.includes(toPhase);
  }

  /**
   * Transition to a new phase
   * @param {string} toPhase - Target phase
   * @param {Object} data - Optional data to pass to callbacks
   * @returns {boolean} Whether transition succeeded
   */
  transition(toPhase, data = {}) {
    if (!this.canTransition(toPhase)) {
      console.warn(`Invalid transition from ${this.currentPhase} to ${toPhase}`);
      return false;
    }

    const fromPhase = this.currentPhase;
    console.log(`Phase transition: ${fromPhase} -> ${toPhase}`);

    // Update state
    store.set("gamePhase", toPhase);

    // Fire transition callbacks
    const key = `${fromPhase}->${toPhase}`;
    if (this.transitionCallbacks.has(key)) {
      for (const callback of this.transitionCallbacks.get(key)) {
        callback(data);
      }
    }

    // Fire general "enter" callbacks
    const enterKey = `enter:${toPhase}`;
    if (this.transitionCallbacks.has(enterKey)) {
      for (const callback of this.transitionCallbacks.get(enterKey)) {
        callback(fromPhase, data);
      }
    }

    // Fire general "exit" callbacks
    const exitKey = `exit:${fromPhase}`;
    if (this.transitionCallbacks.has(exitKey)) {
      for (const callback of this.transitionCallbacks.get(exitKey)) {
        callback(toPhase, data);
      }
    }

    return true;
  }

  /**
   * Register callback for a specific transition
   * @param {string} from - Source phase
   * @param {string} to - Target phase
   * @param {Function} callback - Called with transition data
   */
  onTransition(from, to, callback) {
    const key = `${from}->${to}`;
    if (!this.transitionCallbacks.has(key)) {
      this.transitionCallbacks.set(key, new Set());
    }
    this.transitionCallbacks.get(key).add(callback);
  }

  /**
   * Register callback for entering a phase (from any source)
   * @param {string} phase - Phase to watch
   * @param {Function} callback - Called with (fromPhase, data)
   */
  onEnter(phase, callback) {
    const key = `enter:${phase}`;
    if (!this.transitionCallbacks.has(key)) {
      this.transitionCallbacks.set(key, new Set());
    }
    this.transitionCallbacks.get(key).add(callback);
  }

  /**
   * Register callback for exiting a phase (to any target)
   * @param {string} phase - Phase to watch
   * @param {Function} callback - Called with (toPhase, data)
   */
  onExit(phase, callback) {
    const key = `exit:${phase}`;
    if (!this.transitionCallbacks.has(key)) {
      this.transitionCallbacks.set(key, new Set());
    }
    this.transitionCallbacks.get(key).add(callback);
  }

  /**
   * Force set phase (use sparingly, mainly for initialization)
   */
  forcePhase(phase) {
    store.set("gamePhase", phase);
  }

  /**
   * Check if we're in a specific phase
   */
  isPhase(phase) {
    return this.currentPhase === phase;
  }

  /**
   * Check if game is in an active playing state
   */
  isPlaying() {
    return [PHASES.ANSWERING, PHASES.VOTING, PHASES.RESULTS].includes(this.currentPhase);
  }
}

export const gameState = new GameStateMachine();
export default gameState;
