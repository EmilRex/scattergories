/**
 * Voting and Scoring Logic
 */

import { SCORING } from '../config.js';
import { normalizeAnswer, startsWithLetter, groupDuplicateAnswers } from './round.js';

/**
 * Calculate net votes for an answer
 * @param {Object} answerVotes - { upvotes: [ids], downvotes: [ids] }
 * @returns {number} Net votes (upvotes - downvotes)
 */
export function calculateNetVotes(answerVotes) {
    if (!answerVotes) return 0;
    const upvotes = answerVotes.upvotes?.length || 0;
    const downvotes = answerVotes.downvotes?.length || 0;
    return upvotes - downvotes;
}

/**
 * Check if an answer is valid (has positive net votes)
 * @param {Object} answerVotes - Vote data for an answer
 * @returns {boolean}
 */
export function isAnswerValid(answerVotes) {
    return calculateNetVotes(answerVotes) >= SCORING.MIN_NET_VOTES;
}

/**
 * Calculate points for a valid answer
 * @param {boolean} isUnique - Whether this answer is unique (no one else has it)
 * @returns {number} Points awarded
 */
export function calculatePoints(isUnique) {
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

            // Check validity
            const startsCorrect = startsWithLetter(answer, letter);
            const hasPositiveVotes = netVotes >= SCORING.MIN_NET_VOTES;
            const isValid = startsCorrect && hasPositiveVotes;

            // Check if unique
            const duplicateCount = duplicateGroups[normalized]?.length || 1;
            const isUnique = duplicateCount === 1;

            // Calculate points
            let points = 0;
            if (isValid) {
                points = calculatePoints(isUnique);

                // Add to player score
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
                startsCorrect
            });
        }

        // Sort by points (valid first), then by votes
        categoryAnswers.sort((a, b) => {
            if (a.isValid !== b.isValid) return b.isValid - a.isValid;
            return b.netVotes - a.netVotes;
        });

        categoryResults.push({
            category,
            answers: categoryAnswers
        });
    });

    return {
        categoryResults,
        playerScores
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
        .map(p => ({
            id: p.id,
            name: p.name,
            score: scores[p.id] || 0
        }))
        .sort((a, b) => b.score - a.score);
}

/**
 * Determine winner(s)
 * @param {Object} scores - { playerId: totalScore }
 * @param {Array} players - Player objects
 * @returns {Array} Winner(s) (could be multiple if tied)
 */
export function getWinners(scores, players) {
    const leaderboard = getLeaderboard(scores, players);
    if (leaderboard.length === 0) return [];

    const topScore = leaderboard[0].score;
    return leaderboard.filter(p => p.score === topScore);
}

export default {
    calculateNetVotes,
    isAnswerValid,
    calculatePoints,
    calculateRoundResults,
    getLeaderboard,
    getWinners
};
