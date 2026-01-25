/**
 * Voting and Scoring Logic
 */

import { SCORING } from "../config.js";
import { normalizeAnswer, startsWithLetter, groupDuplicateAnswers } from "./round.js";

/**
 * Calculate net votes for an answer
 * @param {Object} answerVotes - { upvotes: [ids], downvotes: [ids] }
 * @returns {number} Net votes (upvotes - downvotes)
 */
export function calculateNetVotes(answerVotes) {
  if (!answerVotes) {
    return 0;
  }
  const upvotes = answerVotes.upvotes?.length || 0;
  const downvotes = answerVotes.downvotes?.length || 0;
  return upvotes - downvotes;
}

/**
 * Check if an answer is valid
 * @param {string} answer - The answer text
 * @param {string} letter - Required starting letter
 * @param {number} netVotes - Net votes for the answer
 * @param {number} minNetVotes - Minimum net votes required (default: SCORING.MIN_NET_VOTES)
 * @returns {boolean}
 */
export function isAnswerValid(answer, letter, netVotes, minNetVotes = SCORING.MIN_NET_VOTES) {
  // Empty or whitespace-only answers are invalid
  if (!answer || !answer.trim()) {
    return false;
  }

  // Must start with the correct letter
  if (!startsWithLetter(answer, letter)) {
    return false;
  }

  // Must have minimum net votes
  return netVotes >= minNetVotes;
}

/**
 * Calculate points for an answer
 * @param {boolean} isUnique - Whether this answer is unique (no one else has it)
 * @param {boolean} isValid - Whether the answer is valid (correct letter + positive votes)
 * @returns {number} Points awarded (0 if invalid)
 */
export function calculatePoints(isUnique, isValid = true) {
  if (!isValid) {
    return 0;
  }
  return isUnique ? SCORING.UNIQUE_ANSWER : SCORING.VALID_ANSWER;
}

/**
 * Calculate full round results
 * @param {Object} answers - { playerId: { categoryIndex: answer } }
 * @param {Object} votes - { categoryIndex: { answer: { upvotes, downvotes } } }
 * @param {string[]} categories - List of category names
 * @param {string} letter - Current round's letter
 * @returns {Object} Round results with scores
 */
export function calculateRoundResults(answers, votes, categories, letter) {
  const playerScores = {};
  const categoryResults = [];

  // Process each category
  categories.forEach((category, categoryIndex) => {
    const categoryAnswers = [];

    // Collect all answers for this category
    const answersByPlayer = {};
    for (const [playerId, playerAnswers] of Object.entries(answers)) {
      const answer = playerAnswers?.[categoryIndex];
      if (answer && answer.trim()) {
        answersByPlayer[playerId] = answer.trim();
      }
    }

    // Group duplicate answers
    const duplicateGroups = groupDuplicateAnswers(answersByPlayer);

    // Process each player's answer
    for (const [playerId, answer] of Object.entries(answersByPlayer)) {
      const normalized = normalizeAnswer(answer);

      // Get votes for this answer
      const categoryVotes = votes[categoryIndex] || {};
      const answerVotes = categoryVotes[answer] || { upvotes: [], downvotes: [] };
      const netVotes = calculateNetVotes(answerVotes);

      // Check validity using the proper validation function
      const startsCorrect = startsWithLetter(answer, letter);
      const isValid = isAnswerValid(answer, letter, netVotes);

      // Check if unique
      const duplicateCount = duplicateGroups[normalized]?.length || 1;
      const isUnique = duplicateCount === 1;

      // Calculate points (pass validity to ensure 0 for invalid)
      const points = calculatePoints(isUnique, isValid);

      // Add to player score
      if (points > 0) {
        if (!playerScores[playerId]) {
          playerScores[playerId] = 0;
        }
        playerScores[playerId] += points;
      }

      categoryAnswers.push({
        playerId,
        answer,
        normalized,
        netVotes,
        isValid,
        isUnique,
        points,
        startsCorrect,
      });
    }

    // Sort by points (valid first), then by votes
    categoryAnswers.sort((a, b) => {
      if (a.isValid !== b.isValid) {
        return b.isValid - a.isValid;
      }
      return b.netVotes - a.netVotes;
    });

    categoryResults.push({
      category,
      answers: categoryAnswers,
    });
  });

  return {
    categoryResults,
    playerScores,
  };
}

/**
 * Get leaderboard sorted by score
 * @param {Object} scores - { playerId: totalScore }
 * @param {Array} players - Player objects with id and name
 * @returns {Array} Sorted leaderboard entries
 */
export function getLeaderboard(scores, players) {
  return players
    .map((p) => ({
      id: p.id,
      name: p.name,
      score: scores[p.id] || 0,
    }))
    .sort((a, b) => b.score - a.score);
}

/**
 * Determine winner(s)
 * @param {Object} scores - { playerId: totalScore }
 * @param {Array} players - Optional player objects (if omitted, returns player IDs)
 * @returns {Array} Winner(s) - player IDs if no players array, or player objects if provided
 */
export function getWinners(scores, players = null) {
  if (!scores || Object.keys(scores).length === 0) {
    return [];
  }

  // If players array provided, use leaderboard
  if (players) {
    const leaderboard = getLeaderboard(scores, players);
    if (leaderboard.length === 0) {
      return [];
    }
    const topScore = leaderboard[0].score;
    return leaderboard.filter((p) => p.score === topScore);
  }

  // Otherwise, just return player IDs with top score
  const topScore = Math.max(...Object.values(scores));
  return Object.entries(scores)
    .filter(([, score]) => score === topScore)
    .map(([playerId]) => playerId);
}

export default {
  calculateNetVotes,
  isAnswerValid,
  calculatePoints,
  calculateRoundResults,
  getLeaderboard,
  getWinners,
};
