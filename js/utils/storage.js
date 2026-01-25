/**
 * localStorage utilities for persisting user preferences
 */

const STORAGE_PREFIX = "scattergories_";

const KEYS = {
  USERNAME: "username",
  THEME: "theme",
  SOUND_ENABLED: "soundEnabled",
};

/**
 * Get a value from localStorage
 * @param {string} key - Storage key (without prefix)
 * @param {*} defaultValue - Default if not found
 */
export function get(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (e) {
    console.warn("Error reading from localStorage:", e);
    return defaultValue;
  }
}

/**
 * Set a value in localStorage
 * @param {string} key - Storage key (without prefix)
 * @param {*} value - Value to store (will be JSON stringified)
 */
export function set(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn("Error writing to localStorage:", e);
    return false;
  }
}

/**
 * Remove a value from localStorage
 * @param {string} key - Storage key (without prefix)
 */
export function remove(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
    return true;
  } catch (e) {
    console.warn("Error removing from localStorage:", e);
    return false;
  }
}

/**
 * Get stored username
 */
export function getUsername() {
  return get(KEYS.USERNAME, "");
}

/**
 * Set stored username
 */
export function setUsername(username) {
  return set(KEYS.USERNAME, username);
}

/**
 * Get stored theme preference
 */
export function getTheme() {
  return get(KEYS.THEME, "green");
}

/**
 * Set theme preference
 */
export function setTheme(theme) {
  return set(KEYS.THEME, theme);
}

/**
 * Check if localStorage is available
 */
export function isAvailable() {
  try {
    const test = "__storage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

export default {
  get,
  set,
  remove,
  getUsername,
  setUsername,
  getTheme,
  setTheme,
  isAvailable,
  KEYS,
};
