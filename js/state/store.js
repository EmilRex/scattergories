/**
 * Centralized Pub/Sub State Store
 * All game state flows through this store for reactive UI updates
 */

const initialState = {
  // Connection state
  isHost: false,
  isConnected: false,
  peerId: null,
  gameId: null,

  // Player state
  localPlayer: {
    id: null,
    name: "Player",
    isReady: false,
  },
  players: [], // { id, name, isReady, isHost, score }

  // Game settings (host configurable)
  settings: {
    rounds: 3,
    categoriesPerRound: 12,
    timerSeconds: 180,
  },

  // Game state
  gamePhase: "HOME", // HOME, LOBBY, ANSWERING, VOTING, RESULTS, GAME_OVER
  currentRound: 0,
  totalRounds: 3,
  currentLetter: "",
  categories: [],

  // Timer state
  timerRemaining: 0,
  timerRunning: false,

  // Answers: { playerId: { categoryIndex: answer } }
  answers: {},

  // Votes: { categoryIndex: { answer: { upvotes: [playerIds], downvotes: [playerIds] } } }
  votes: {},

  // Scores: { playerId: totalScore }
  scores: {},

  // Round results for display
  roundResults: [],
};

class Store {
  constructor() {
    this.state = JSON.parse(JSON.stringify(initialState));
    this.listeners = new Map();
    this.globalListeners = new Set();
  }

  /**
   * Get current state or a specific path
   * @param {string} path - Optional dot-notation path (e.g., 'localPlayer.name')
   */
  get(path) {
    if (!path) {
      return this.state;
    }

    return path.split(".").reduce((obj, key) => {
      return obj && obj[key] !== undefined ? obj[key] : undefined;
    }, this.state);
  }

  /**
   * Set state at a specific path
   * @param {string} path - Dot-notation path
   * @param {*} value - Value to set
   */
  set(path, value) {
    const keys = path.split(".");
    const lastKey = keys.pop();

    let obj = this.state;
    for (const key of keys) {
      if (obj[key] === undefined) {
        obj[key] = {};
      }
      obj = obj[key];
    }

    const oldValue = obj[lastKey];
    obj[lastKey] = value;

    this.notify(path, value, oldValue);
  }

  /**
   * Update multiple state values at once
   * @param {Object} updates - Object with path:value pairs
   */
  update(updates) {
    for (const [path, value] of Object.entries(updates)) {
      this.set(path, value);
    }
  }

  /**
   * Merge an object into state at a path
   * @param {string} path - Dot-notation path
   * @param {Object} partial - Partial object to merge
   */
  merge(path, partial) {
    const current = this.get(path) || {};
    this.set(path, { ...current, ...partial });
  }

  /**
   * Subscribe to changes at a specific path
   * @param {string} path - Path to watch
   * @param {Function} callback - Called with (newValue, oldValue, path)
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, new Set());
    }
    this.listeners.get(path).add(callback);

    // Call immediately with current value
    callback(this.get(path), undefined, path);

    return () => {
      this.listeners.get(path).delete(callback);
    };
  }

  /**
   * Subscribe to all state changes
   * @param {Function} callback - Called with (path, newValue, oldValue)
   * @returns {Function} Unsubscribe function
   */
  subscribeAll(callback) {
    this.globalListeners.add(callback);
    return () => {
      this.globalListeners.delete(callback);
    };
  }

  /**
   * Notify listeners of a state change
   */
  notify(path, newValue, oldValue) {
    // Notify specific path listeners
    if (this.listeners.has(path)) {
      for (const callback of this.listeners.get(path)) {
        callback(newValue, oldValue, path);
      }
    }

    // Notify parent path listeners (e.g., 'localPlayer' when 'localPlayer.name' changes)
    const parts = path.split(".");
    for (let i = parts.length - 1; i > 0; i--) {
      const parentPath = parts.slice(0, i).join(".");
      if (this.listeners.has(parentPath)) {
        const parentValue = this.get(parentPath);
        for (const callback of this.listeners.get(parentPath)) {
          callback(parentValue, undefined, parentPath);
        }
      }
    }

    // Notify global listeners
    for (const callback of this.globalListeners) {
      callback(path, newValue, oldValue);
    }
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.state = JSON.parse(JSON.stringify(initialState));
    // Notify all listeners
    for (const [path, listeners] of this.listeners) {
      const value = this.get(path);
      for (const callback of listeners) {
        callback(value, undefined, path);
      }
    }
  }

  /**
   * Get serializable game state for network sync
   */
  getGameState() {
    return {
      players: this.state.players,
      settings: this.state.settings,
      gamePhase: this.state.gamePhase,
      currentRound: this.state.currentRound,
      totalRounds: this.state.totalRounds,
      currentLetter: this.state.currentLetter,
      categories: this.state.categories,
      timerRemaining: this.state.timerRemaining,
      timerRunning: this.state.timerRunning,
      answers: this.state.answers,
      votes: this.state.votes,
      scores: this.state.scores,
      roundResults: this.state.roundResults,
    };
  }

  /**
   * Apply game state from host
   */
  applyGameState(gameState) {
    for (const [key, value] of Object.entries(gameState)) {
      this.set(key, value);
    }
  }
}

// Singleton instance
export const store = new Store();
export default store;
