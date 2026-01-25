/**
 * Integration tests - Full multiplayer game flow simulation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MSG_TYPES, SCORING } from '../../js/config.js';
import {
  calculateNetVotes,
  isAnswerValid,
  calculatePoints,
  calculateRoundResults,
  getLeaderboard,
  getWinners
} from '../../js/game/scoring.js';
import {
  selectLetter,
  normalizeAnswer,
  startsWithLetter,
  areAnswersDuplicate,
  groupDuplicateAnswers
} from '../../js/game/round.js';
import { getCategories } from '../../js/game/categories.js';
import { formatTime, getTimerUrgency } from '../../js/game/timer.js';

/**
 * Simulated game state management for integration tests
 */
class GameSimulator {
  constructor() {
    this.reset();
  }

  reset() {
    this.gamePhase = 'HOME';
    this.players = [];
    this.currentRound = 0;
    this.totalRounds = 3;
    this.currentLetter = '';
    this.categories = [];
    this.answers = {};
    this.votes = {};
    this.scores = {};
    this.usedLetters = [];
    this.roundResults = null;
  }

  addPlayer(id, name, isHost = false) {
    this.players.push({
      id,
      name,
      isHost,
      isReady: false,
      score: 0
    });
    this.scores[id] = 0;
  }

  setPlayerReady(playerId, isReady) {
    const player = this.players.find(p => p.id === playerId);
    if (player) {
      player.isReady = isReady;
    }
  }

  allPlayersReady() {
    return this.players.length >= 2 && this.players.every(p => p.isReady);
  }

  startGame() {
    if (!this.allPlayersReady()) return false;
    this.gamePhase = 'LOBBY';
    this.currentRound = 0;
    return true;
  }

  startRound() {
    this.currentRound++;
    this.currentLetter = selectLetter(this.usedLetters);
    this.usedLetters.push(this.currentLetter);
    this.categories = getCategories(6);
    this.answers = {};
    this.votes = {};
    this.players.forEach(p => p.isReady = false);
    this.gamePhase = 'ANSWERING';
  }

  submitAnswers(playerId, playerAnswers) {
    this.answers[playerId] = playerAnswers;
    this.setPlayerReady(playerId, true);
  }

  transitionToVoting() {
    this.gamePhase = 'VOTING';
    this.players.forEach(p => p.isReady = false);
  }

  vote(playerId, categoryIndex, answer, voteType) {
    if (!this.votes[categoryIndex]) {
      this.votes[categoryIndex] = {};
    }
    if (!this.votes[categoryIndex][answer]) {
      this.votes[categoryIndex][answer] = { upvotes: [], downvotes: [] };
    }

    const answerVotes = this.votes[categoryIndex][answer];

    // Remove existing vote
    answerVotes.upvotes = answerVotes.upvotes.filter(id => id !== playerId);
    answerVotes.downvotes = answerVotes.downvotes.filter(id => id !== playerId);

    // Add new vote
    if (voteType === 'up') {
      answerVotes.upvotes.push(playerId);
    } else if (voteType === 'down') {
      answerVotes.downvotes.push(playerId);
    }
  }

  calculateResults() {
    this.roundResults = calculateRoundResults(
      this.answers,
      this.votes,
      this.categories,
      this.currentLetter
    );

    // Update scores
    for (const [playerId, roundScore] of Object.entries(this.roundResults.playerScores)) {
      this.scores[playerId] = (this.scores[playerId] || 0) + roundScore;
    }

    // Update player scores in list
    this.players.forEach(p => {
      p.score = this.scores[p.id] || 0;
      p.isReady = false;
    });

    this.gamePhase = 'RESULTS';
  }

  isGameOver() {
    return this.currentRound >= this.totalRounds;
  }

  proceedFromResults() {
    if (this.isGameOver()) {
      this.gamePhase = 'GAME_OVER';
    }
    // Note: startRound() must be called explicitly if game continues
  }

  getWinners() {
    return getWinners(this.scores, this.players);
  }

  getLeaderboard() {
    return getLeaderboard(this.scores, this.players);
  }
}

describe('multiplayer integration', () => {
  let game;

  beforeEach(() => {
    game = new GameSimulator();
  });

  describe('full game flow', () => {
    it('simulates a complete 2-player game', () => {
      // Setup
      game.addPlayer('host', 'Alice', true);
      game.addPlayer('p1', 'Bob');
      game.totalRounds = 1;

      // Players ready
      game.setPlayerReady('host', true);
      game.setPlayerReady('p1', true);
      expect(game.allPlayersReady()).toBe(true);

      // Start game
      game.startGame();
      game.startRound();
      expect(game.gamePhase).toBe('ANSWERING');
      expect(game.currentRound).toBe(1);
      expect(game.currentLetter).toBeTruthy();
      expect(game.categories).toHaveLength(6);

      // Submit answers - using current letter
      const letter = game.currentLetter;
      const hostAnswers = {};
      const p1Answers = {};

      // Create answers starting with the correct letter
      for (let i = 0; i < 6; i++) {
        hostAnswers[i] = `${letter}answer${i}`;
        p1Answers[i] = `${letter}reply${i}`;
      }

      game.submitAnswers('host', hostAnswers);
      game.submitAnswers('p1', p1Answers);

      // Transition to voting
      game.transitionToVoting();
      expect(game.gamePhase).toBe('VOTING');

      // Vote on each other's answers (upvote all)
      for (let i = 0; i < 6; i++) {
        game.vote('host', i, p1Answers[i], 'up');
        game.vote('p1', i, hostAnswers[i], 'up');
      }

      // Calculate results
      game.calculateResults();
      expect(game.gamePhase).toBe('RESULTS');
      expect(game.roundResults).toBeDefined();

      // Both should have equal scores (all unique, valid answers)
      expect(game.scores['host']).toBe(game.scores['p1']);
      expect(game.scores['host']).toBeGreaterThan(0);

      // Proceed to game over
      game.proceedFromResults();
      expect(game.gamePhase).toBe('GAME_OVER');

      // Check winners (should be tie)
      const winners = game.getWinners();
      expect(winners).toHaveLength(2);
    });

    it('handles duplicate answers correctly', () => {
      game.addPlayer('host', 'Alice', true);
      game.addPlayer('p1', 'Bob');
      game.addPlayer('p2', 'Charlie');
      game.totalRounds = 1;

      game.players.forEach(p => p.isReady = true);
      game.startGame();
      game.startRound();

      const letter = game.currentLetter;

      // Host and P1 have same answer, P2 has unique
      game.submitAnswers('host', { 0: `${letter}same` });
      game.submitAnswers('p1', { 0: `${letter}same` });  // Duplicate
      game.submitAnswers('p2', { 0: `${letter}unique` });

      game.transitionToVoting();

      // Everyone upvotes everyone else
      game.vote('host', 0, `${letter}same`, 'up');    // Host votes for same
      game.vote('p1', 0, `${letter}same`, 'up');      // P1 votes for same
      game.vote('p2', 0, `${letter}same`, 'up');      // P2 votes for same
      game.vote('host', 0, `${letter}unique`, 'up');
      game.vote('p1', 0, `${letter}unique`, 'up');

      game.calculateResults();

      // Host and P1 should have 1 point each (shared answer)
      // P2 should have 2 points (unique answer)
      expect(game.scores['p2']).toBe(2);
      expect(game.scores['host']).toBe(1);
      expect(game.scores['p1']).toBe(1);
    });

    it('handles invalid answers (wrong letter)', () => {
      game.addPlayer('host', 'Alice', true);
      game.addPlayer('p1', 'Bob');
      game.totalRounds = 1;

      game.players.forEach(p => p.isReady = true);
      game.startGame();
      game.startRound();

      const letter = game.currentLetter;
      const wrongLetter = letter === 'A' ? 'B' : 'A';

      // Host has correct letter, P1 has wrong letter
      game.submitAnswers('host', { 0: `${letter}correct` });
      game.submitAnswers('p1', { 0: `${wrongLetter}wrong` });

      game.transitionToVoting();

      // Upvote both
      game.vote('p1', 0, `${letter}correct`, 'up');
      game.vote('host', 0, `${wrongLetter}wrong`, 'up');

      game.calculateResults();

      // Only host should get points
      expect(game.scores['host']).toBe(2);  // Unique valid answer
      expect(game.scores['p1']).toBe(0);    // Wrong letter = 0 points
    });

    it('handles downvoted answers', () => {
      game.addPlayer('host', 'Alice', true);
      game.addPlayer('p1', 'Bob');
      game.addPlayer('p2', 'Charlie');
      game.totalRounds = 1;

      game.players.forEach(p => p.isReady = true);
      game.startGame();
      game.startRound();

      const letter = game.currentLetter;

      game.submitAnswers('host', { 0: `${letter}answer` });
      game.submitAnswers('p1', { 0: `${letter}bad` });
      game.submitAnswers('p2', { 0: `${letter}ok` });

      game.transitionToVoting();

      // Host answer gets upvoted
      game.vote('p1', 0, `${letter}answer`, 'up');
      game.vote('p2', 0, `${letter}answer`, 'up');

      // P1 answer gets downvoted
      game.vote('host', 0, `${letter}bad`, 'down');
      game.vote('p2', 0, `${letter}bad`, 'down');

      // P2 answer gets one upvote
      game.vote('host', 0, `${letter}ok`, 'up');

      game.calculateResults();

      expect(game.scores['host']).toBe(2);  // Upvoted unique
      expect(game.scores['p1']).toBe(0);    // Downvoted = invalid
      expect(game.scores['p2']).toBe(2);    // Upvoted unique
    });

    it('tracks multiple rounds correctly', () => {
      game.addPlayer('host', 'Alice', true);
      game.addPlayer('p1', 'Bob');
      game.totalRounds = 3;

      game.players.forEach(p => p.isReady = true);
      game.startGame();

      // Play 3 rounds
      for (let round = 1; round <= 3; round++) {
        game.startRound();
        expect(game.currentRound).toBe(round);

        const letter = game.currentLetter;

        // Simple answers
        game.submitAnswers('host', { 0: `${letter}h${round}` });
        game.submitAnswers('p1', { 0: `${letter}p${round}` });

        game.transitionToVoting();

        // Upvote each other
        game.vote('host', 0, `${letter}p${round}`, 'up');
        game.vote('p1', 0, `${letter}h${round}`, 'up');

        game.calculateResults();
        game.players.forEach(p => p.isReady = true);
        game.proceedFromResults();

        // After last round, should be game over
        if (round === 3) {
          expect(game.gamePhase).toBe('GAME_OVER');
        }
      }

      expect(game.currentRound).toBe(3);

      // Each round gives 2 points for unique valid answer
      expect(game.scores['host']).toBe(6);
      expect(game.scores['p1']).toBe(6);
    });

    it('uses different letters each round', () => {
      game.addPlayer('host', 'Alice', true);
      game.addPlayer('p1', 'Bob');
      game.totalRounds = 5;

      game.players.forEach(p => p.isReady = true);
      game.startGame();

      const usedLetters = new Set();

      for (let round = 1; round <= 5; round++) {
        game.startRound();
        usedLetters.add(game.currentLetter);

        const letter = game.currentLetter;
        game.submitAnswers('host', { 0: `${letter}x` });
        game.submitAnswers('p1', { 0: `${letter}y` });
        game.transitionToVoting();
        game.vote('host', 0, `${letter}y`, 'up');
        game.vote('p1', 0, `${letter}x`, 'up');
        game.calculateResults();
        game.players.forEach(p => p.isReady = true);
        game.proceedFromResults();
      }

      // All letters should be different
      expect(usedLetters.size).toBe(5);
    });
  });

  describe('scoring edge cases', () => {
    it('handles article normalization in duplicates', () => {
      game.addPlayer('host', 'Alice', true);
      game.addPlayer('p1', 'Bob');
      game.totalRounds = 1;

      game.players.forEach(p => p.isReady = true);
      game.startGame();
      game.startRound();

      // Force a specific setup for testing
      game.currentLetter = 'C';
      game.categories = ['Animals'];

      // "A cat" and "The cat" should be duplicates
      game.submitAnswers('host', { 0: 'A cat' });
      game.submitAnswers('p1', { 0: 'The Cat' });

      // Verify they are considered duplicates
      expect(areAnswersDuplicate('A cat', 'The Cat')).toBe(true);

      game.transitionToVoting();
      game.vote('host', 0, 'The Cat', 'up');
      game.vote('p1', 0, 'A cat', 'up');

      game.calculateResults();

      // Both should get 1 point (shared answer)
      expect(game.scores['host']).toBe(1);
      expect(game.scores['p1']).toBe(1);
    });

    it('correctly identifies unique vs shared answers', () => {
      const answers = {
        'p1': 'cat',
        'p2': 'Cat',
        'p3': 'dog'
      };

      const groups = groupDuplicateAnswers(answers);

      expect(groups['cat']).toContain('p1');
      expect(groups['cat']).toContain('p2');
      expect(groups['cat']).toHaveLength(2);
      expect(groups['dog']).toHaveLength(1);
    });
  });

  describe('timer utilities', () => {
    it('formats time correctly during game', () => {
      expect(formatTime(180)).toBe('3:00');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(45)).toBe('0:45');
      expect(formatTime(5)).toBe('0:05');
    });

    it('returns correct urgency levels', () => {
      expect(getTimerUrgency(180)).toBe('normal');
      expect(getTimerUrgency(30)).toBe('warning');
      expect(getTimerUrgency(10)).toBe('critical');
    });
  });

  describe('leaderboard and winners', () => {
    it('determines winner correctly', () => {
      game.addPlayer('host', 'Alice', true);
      game.addPlayer('p1', 'Bob');
      game.addPlayer('p2', 'Charlie');

      game.scores = { 'host': 10, 'p1': 25, 'p2': 15 };
      game.players.forEach(p => p.score = game.scores[p.id]);

      const leaderboard = game.getLeaderboard();
      expect(leaderboard[0].id).toBe('p1');
      expect(leaderboard[0].score).toBe(25);

      const winners = game.getWinners();
      expect(winners).toHaveLength(1);
      expect(winners[0].name).toBe('Bob');
    });

    it('handles ties correctly', () => {
      game.addPlayer('host', 'Alice', true);
      game.addPlayer('p1', 'Bob');
      game.addPlayer('p2', 'Charlie');

      game.scores = { 'host': 20, 'p1': 20, 'p2': 15 };
      game.players.forEach(p => p.score = game.scores[p.id]);

      const winners = game.getWinners();
      expect(winners).toHaveLength(2);
      expect(winners.map(w => w.name)).toContain('Alice');
      expect(winners.map(w => w.name)).toContain('Bob');
    });
  });
});
