/**
 * URL utilities for game ID handling
 * Uses query params (?game=ABC123) for game ID to coexist with hash-based routing
 */

/**
 * Get game ID from URL query params
 * @returns {string|null} Game ID or null if not present
 */
export function getGameIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("game");
}

/**
 * Set game ID in URL without page reload
 * @param {string} gameId - Game ID to set
 */
export function setGameIdInUrl(gameId) {
  const url = new URL(window.location.href);
  url.searchParams.set("game", gameId);
  window.history.replaceState({}, "", url.toString());
}

/**
 * Remove game ID from URL
 */
export function removeGameIdFromUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("game");
  window.history.replaceState({}, "", url.toString());
}

/**
 * Generate a shareable URL for a game
 * @param {string} gameId - Game ID
 * @returns {string} Full URL with game ID
 */
export function generateGameUrl(gameId) {
  const url = new URL(window.location.href);
  // Clear any existing hash
  url.hash = "";
  url.searchParams.set("game", gameId);
  return url.toString();
}

/**
 * Copy game URL to clipboard
 * @param {string} gameId - Game ID
 * @returns {Promise<boolean>} Whether copy succeeded
 */
export async function copyGameUrlToClipboard(gameId) {
  const url = generateGameUrl(gameId);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    // Fallback for older browsers
    try {
      const textArea = document.createElement("textarea");
      textArea.value = url;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      return true;
    } catch (e2) {
      console.warn("Failed to copy to clipboard:", e2);
      return false;
    }
  }
}

/**
 * Get current hash (for routing)
 * @returns {string} Current hash without the # symbol
 */
export function getHash() {
  return window.location.hash.slice(1) || "";
}

/**
 * Set hash (for routing)
 * @param {string} hash - Hash to set (without # symbol)
 */
export function setHash(hash) {
  window.location.hash = hash;
}

/**
 * Generate a random game ID
 * @returns {string} 6-character alphanumeric ID
 */
export function generateGameId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Excluding similar-looking chars
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default {
  getGameIdFromUrl,
  setGameIdInUrl,
  removeGameIdFromUrl,
  generateGameUrl,
  copyGameUrlToClipboard,
  getHash,
  setHash,
  generateGameId,
};
