/**
 * Main Entry Point - Scattergories Web Game
 */

import store from "./state/store.js";
import gameState, { PHASES } from "./state/game-state.js";
import router from "./ui/router.js";
import host from "./network/host.js";
import client from "./network/client.js";
import { clientTimer } from "./game/timer.js";
import { MSG_TYPES } from "./config.js";
import peerManager from "./network/peer-manager.js";
import storage from "./utils/storage.js";
import { getGameIdFromUrl } from "./utils/url.js";
import { showToast, showError } from "./ui/components/toast.js";

// Import screens
import lobbyScreen from "./ui/screens/lobby.js";
import answerScreen from "./ui/screens/answer.js";
import votingScreen from "./ui/screens/voting.js";
import resultsScreen from "./ui/screens/results.js";
import finalScreen from "./ui/screens/final.js";

/**
 * Initialize the application
 */
function init() {
  console.log("Initializing Scattergories...");

  // Initialize UI components
  router.init();
  lobbyScreen.init();
  answerScreen.init();
  votingScreen.init();
  resultsScreen.init();
  finalScreen.init();

  // Set up home screen
  initHomeScreen();

  // Set up connection status indicator
  initConnectionStatus();

  // Set up client timer sync
  initTimerSync();

  // Check for game ID in URL (joining via link)
  checkUrlForGame();

  // Load saved username
  loadSavedUsername();

  console.log("Scattergories initialized!");
}

/**
 * Initialize home screen functionality
 */
function initHomeScreen() {
  const usernameInput = document.getElementById("username-input");
  const createGameBtn = document.getElementById("btn-create-game");
  const joinGameBtn = document.getElementById("btn-join-game");
  const joinCodeSection = document.getElementById("join-code-section");
  const joinCodeInput = document.getElementById("join-code-input");
  const connectBtn = document.getElementById("btn-connect");

  // Username input - save on change
  usernameInput?.addEventListener("input", (e) => {
    const name = e.target.value.trim();
    store.set("localPlayer.name", name);
    storage.setUsername(name);
  });

  // Create game button
  createGameBtn?.addEventListener("click", async () => {
    const name = usernameInput?.value.trim() || "Host";
    createGameBtn.disabled = true;
    createGameBtn.textContent = "CREATING...";

    try {
      const gameId = await host.createGame(name);
      showToast(`Game created: ${gameId}`, "success");
    } catch (err) {
      showError(`Failed to create game: ${err.message}`);
      createGameBtn.disabled = false;
      createGameBtn.textContent = "CREATE GAME";
    }
  });

  // Join game button - show code input
  joinGameBtn?.addEventListener("click", () => {
    joinCodeSection?.classList.toggle("hidden");
    joinCodeInput?.focus();
  });

  // Connect button
  connectBtn?.addEventListener("click", async () => {
    const gameId = joinCodeInput?.value.trim().toUpperCase();
    const name = usernameInput?.value.trim() || "Player";

    if (!gameId) {
      showError("Please enter a game code");
      return;
    }

    await joinGame(gameId, name);
  });

  // Enter key on code input
  joinCodeInput?.addEventListener("keypress", async (e) => {
    if (e.key === "Enter") {
      connectBtn?.click();
    }
  });
}

/**
 * Join a game by ID
 */
async function joinGame(gameId, name) {
  const connectBtn = document.getElementById("btn-connect");

  if (connectBtn) {
    connectBtn.disabled = true;
    connectBtn.textContent = "CONNECTING...";
  }

  try {
    await client.joinGame(gameId, name);
    showToast("Connected!", "success");
  } catch (err) {
    showError(`Failed to join: ${err.message}`);
    if (connectBtn) {
      connectBtn.disabled = false;
      connectBtn.textContent = "CONNECT";
    }
  }
}

/**
 * Initialize connection status indicator
 */
function initConnectionStatus() {
  const statusEl = document.getElementById("connection-status");
  const nameDisplay = document.getElementById("player-name-display");

  store.subscribe("isConnected", (connected) => {
    if (statusEl) {
      statusEl.classList.toggle("connected", connected);
      statusEl.classList.toggle("disconnected", !connected);
    }
  });

  store.subscribe("localPlayer.name", (name) => {
    if (nameDisplay) {
      nameDisplay.textContent = name || "";
    }
  });
}

/**
 * Initialize client-side timer sync
 */
function initTimerSync() {
  // Start client timer when entering answer phase
  store.subscribe("gamePhase", (phase) => {
    if (phase === PHASES.ANSWERING) {
      clientTimer.start();
    } else {
      clientTimer.stop();
    }
  });

  // Handle timer sync messages from host
  peerManager.on(MSG_TYPES.TIMER_SYNC, (data) => {
    clientTimer.sync(data.remaining);
  });
}

/**
 * Check URL for game ID to auto-join
 */
function checkUrlForGame() {
  const gameId = getGameIdFromUrl();

  if (gameId && store.get("gamePhase") === PHASES.HOME) {
    // Show join code section pre-filled
    const joinCodeSection = document.getElementById("join-code-section");
    const joinCodeInput = document.getElementById("join-code-input");

    if (joinCodeSection && joinCodeInput) {
      joinCodeSection.classList.remove("hidden");
      joinCodeInput.value = gameId;

      // Focus username input so they can enter name then connect
      const usernameInput = document.getElementById("username-input");
      if (usernameInput && !usernameInput.value) {
        usernameInput.focus();
      } else {
        joinCodeInput.focus();
      }

      showToast(`Game code detected: ${gameId}`, "info");
    }
  }
}

/**
 * Load saved username from localStorage
 */
function loadSavedUsername() {
  const savedName = storage.getUsername();
  if (savedName) {
    const usernameInput = document.getElementById("username-input");
    if (usernameInput) {
      usernameInput.value = savedName;
      store.set("localPlayer.name", savedName);
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Handle page unload
window.addEventListener("beforeunload", () => {
  peerManager.destroy();
});

// Export for debugging
window.scattergories = {
  store,
  gameState,
  host,
  client,
  peerManager,
};
