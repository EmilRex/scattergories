/**
 * Round and Letter Management
 */

import { AVAILABLE_LETTERS } from '../config.js';

/**
 * Select a random letter, avoiding already used letters
 * @param {string[]} usedLetters - Letters already used in this game
 * @returns {string} Selected letter
 */
export function selectLetter(usedLetters = []) {
    // Filter out used letters
    const available = AVAILABLE_LETTERS.filter(l => !usedLetters.includes(l));

    if (available.length === 0) {
        // All letters used, reset (shouldn't happen in normal play)
        return AVAILABLE_LETTERS[Math.floor(Math.random() * AVAILABLE_LETTERS.length)];
    }

    // Pick random letter
    return available[Math.floor(Math.random() * available.length)];
}

/**
 * Normalize an answer for comparison
 * - Lowercase
 * - Trim whitespace
 * - Remove common prefixes (a, an, the)
 * @param {string} answer - Raw answer string
 * @returns {string} Normalized answer
 */
export function normalizeAnswer(answer) {
    if (!answer) return '';

    let normalized = answer.toLowerCase().trim();

    // Remove common prefixes
    const prefixes = ['a ', 'an ', 'the '];
    for (const prefix of prefixes) {
        if (normalized.startsWith(prefix)) {
            normalized = normalized.slice(prefix.length);
            break;
        }
    }

    return normalized.trim();
}

/**
 * Check if an answer starts with the required letter
 * @param {string} answer - Answer to check
 * @param {string} letter - Required starting letter
 * @returns {boolean}
 */
export function startsWithLetter(answer, letter) {
    const normalized = normalizeAnswer(answer);
    return normalized.length > 0 && normalized[0].toUpperCase() === letter.toUpperCase();
}

/**
 * Check if two answers are duplicates (after normalization)
 * @param {string} answer1 - First answer
 * @param {string} answer2 - Second answer
 * @returns {boolean}
 */
export function areAnswersDuplicate(answer1, answer2) {
    return normalizeAnswer(answer1) === normalizeAnswer(answer2);
}

/**
 * Group answers by their normalized form to find duplicates
 * @param {Object} answers - { playerId: answer } map
 * @returns {Object} { normalizedAnswer: [playerIds] }
 */
export function groupDuplicateAnswers(answers) {
    const groups = {};

    for (const [playerId, answer] of Object.entries(answers)) {
        if (!answer || !answer.trim()) continue;

        const normalized = normalizeAnswer(answer);
        if (!groups[normalized]) {
            groups[normalized] = [];
        }
        groups[normalized].push(playerId);
    }

    return groups;
}

export default {
    selectLetter,
    normalizeAnswer,
    startsWithLetter,
    areAnswersDuplicate,
    groupDuplicateAnswers
};
