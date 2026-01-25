/**
 * Tests for client.js - Client message handling logic
 *
 * These tests focus on the state management logic that happens
 * when the client receives various message types from the host.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MSG_TYPES } from '../../js/config.js';
import store from '../../js/state/store.js';
import { PHASES } from '../../js/state/game-state.js';

describe('client logic', () => {
  beforeEach(() => {
    store.reset();
  });

  describe('game state application', () => {
    it('applies game state from host', () => {
      const gameState = {
        players: [
          { id: 'host', name: 'Host', isHost: true },
          { id: 'client-1', name: 'Alice', isHost: false }
        ],
        gamePhase: 'LOBBY',
        currentRound: 0,
        settings: { rounds: 5, categoriesPerRound: 10, timerSeconds: 120 }
      };

      store.applyGameState(gameState);

      expect(store.get('players')).toHaveLength(2);
      expect(store.get('gamePhase')).toBe('LOBBY');
      expect(store.get('settings.rounds')).toBe(5);
    });

    it('preserves local-only state when applying game state', () => {
      store.set('isHost', false);
      store.set('localPlayer.id', 'client-1');

      store.applyGameState({
        players: [{ id: 'host', name: 'Host' }],
        gamePhase: 'LOBBY'
      });

      // Local state should be preserved
      expect(store.get('isHost')).toBe(false);
      expect(store.get('localPlayer.id')).toBe('client-1');
    });
  });

  describe('settings update handling', () => {
    it('updates all settings', () => {
      store.set('settings', { rounds: 3, categoriesPerRound: 12, timerSeconds: 180 });

      const newSettings = { rounds: 7, categoriesPerRound: 8, timerSeconds: 120 };
      store.set('settings', newSettings);

      expect(store.get('settings.rounds')).toBe(7);
      expect(store.get('settings.categoriesPerRound')).toBe(8);
      expect(store.get('settings.timerSeconds')).toBe(120);
    });
  });

  describe('player leave handling', () => {
    it('removes player from list', () => {
      store.set('players', [
        { id: 'host', name: 'Host' },
        { id: 'player-2', name: 'Bob' }
      ]);

      const players = store.get('players').filter(p => p.id !== 'player-2');
      store.set('players', players);

      expect(store.get('players')).toHaveLength(1);
      expect(store.get('players')[0].id).toBe('host');
    });
  });

  describe('round start handling', () => {
    it('updates all round state', () => {
      store.update({
        currentRound: 1,
        currentLetter: 'C',
        categories: ['Animals', 'Foods'],
        timerRemaining: 180,
        timerRunning: true,
        answers: {},
        votes: {}
      });

      expect(store.get('currentRound')).toBe(1);
      expect(store.get('currentLetter')).toBe('C');
      expect(store.get('categories')).toEqual(['Animals', 'Foods']);
      expect(store.get('timerRemaining')).toBe(180);
      expect(store.get('timerRunning')).toBe(true);
    });

    it('clears previous round data', () => {
      store.set('answers', { 'player-1': { 0: 'old' } });
      store.set('votes', { 0: { 'old': { upvotes: ['x'] } } });

      // On new round, clear
      store.set('answers', {});
      store.set('votes', {});

      expect(store.get('answers')).toEqual({});
      expect(store.get('votes')).toEqual({});
    });

    it('resets local player ready state', () => {
      store.set('localPlayer.isReady', true);
      store.merge('localPlayer', { isReady: false });

      expect(store.get('localPlayer.isReady')).toBe(false);
    });
  });

  describe('timer sync handling', () => {
    it('syncs timer remaining from host', () => {
      store.set('timerRemaining', 180);
      store.set('timerRemaining', 150);

      expect(store.get('timerRemaining')).toBe(150);
    });
  });

  describe('answers reveal handling', () => {
    it('stores all answers', () => {
      const allAnswers = {
        'host': { 0: 'Cat', 1: 'Cake' },
        'client-1': { 0: 'Cow', 1: 'Cheese' }
      };

      store.set('answers', allAnswers);

      expect(store.get('answers.host')).toEqual({ 0: 'Cat', 1: 'Cake' });
      expect(store.get('answers.client-1')).toEqual({ 0: 'Cow', 1: 'Cheese' });
    });

    it('stops timer when answers revealed', () => {
      store.set('timerRunning', true);
      store.set('timerRunning', false);

      expect(store.get('timerRunning')).toBe(false);
    });
  });

  describe('vote update handling', () => {
    it('updates votes from host', () => {
      const votes = {
        0: { 'Cat': { upvotes: ['client-1'], downvotes: [] } }
      };

      store.set('votes', votes);

      expect(store.get('votes')[0]['Cat'].upvotes).toContain('client-1');
    });
  });

  describe('round results handling', () => {
    it('stores round results', () => {
      const results = {
        categoryResults: [
          { category: 'Animals', answers: [{ answer: 'Cat', points: 2 }] }
        ],
        playerScores: { 'host': 2, 'client-1': 4 }
      };

      store.set('roundResults', results);

      expect(store.get('roundResults.categoryResults')).toHaveLength(1);
      expect(store.get('roundResults.playerScores.client-1')).toBe(4);
    });

    it('updates cumulative scores', () => {
      const scores = { 'host': 10, 'client-1': 15 };
      store.set('scores', scores);

      expect(store.get('scores.host')).toBe(10);
      expect(store.get('scores.client-1')).toBe(15);
    });

    it('updates player scores in player list', () => {
      const players = [
        { id: 'host', name: 'Host', score: 0 },
        { id: 'client-1', name: 'Alice', score: 0 }
      ];
      const scores = { 'host': 10, 'client-1': 15 };

      const updatedPlayers = players.map(p => ({
        ...p,
        score: scores[p.id] || 0,
        isReady: false
      }));

      store.set('players', updatedPlayers);

      expect(store.get('players')[1].score).toBe(15);
      expect(store.get('players')[1].isReady).toBe(false);
    });
  });

  describe('game over handling', () => {
    it('stores final scores', () => {
      const finalScores = { 'host': 25, 'client-1': 30 };
      store.set('scores', finalScores);

      expect(store.get('scores.host')).toBe(25);
      expect(store.get('scores.client-1')).toBe(30);
    });

    it('stores final player list', () => {
      const finalPlayers = [
        { id: 'host', name: 'Host', score: 25 },
        { id: 'client-1', name: 'Alice', score: 30 }
      ];

      store.set('players', finalPlayers);

      expect(store.get('players')[1].score).toBe(30);
    });
  });

  describe('client actions', () => {
    beforeEach(() => {
      store.update({
        isHost: false,
        localPlayer: { id: 'client-1', name: 'Alice', isReady: false }
      });
    });

    it('updates local player name', () => {
      store.set('localPlayer.name', 'AliceNew');
      expect(store.get('localPlayer.name')).toBe('AliceNew');
    });

    it('toggles ready state', () => {
      const isReady = store.get('localPlayer.isReady');
      store.set('localPlayer.isReady', !isReady);

      expect(store.get('localPlayer.isReady')).toBe(true);

      store.set('localPlayer.isReady', !store.get('localPlayer.isReady'));
      expect(store.get('localPlayer.isReady')).toBe(false);
    });

    it('marks ready after submitting answers', () => {
      store.merge('localPlayer', { isReady: true });
      expect(store.get('localPlayer.isReady')).toBe(true);
    });

    it('marks ready after finishing voting', () => {
      store.merge('localPlayer', { isReady: true });
      expect(store.get('localPlayer.isReady')).toBe(true);
    });

    it('marks ready for next round', () => {
      store.merge('localPlayer', { isReady: true });
      expect(store.get('localPlayer.isReady')).toBe(true);
    });
  });

  describe('leave game handling', () => {
    it('resets store to initial state', () => {
      store.update({
        isHost: false,
        gameId: 'TEST01',
        gamePhase: 'LOBBY',
        players: [{ id: 'host' }]
      });

      store.reset();

      expect(store.get('gameId')).toBeNull();
      expect(store.get('gamePhase')).toBe('HOME');
      expect(store.get('players')).toEqual([]);
    });
  });

  describe('host disconnect handling', () => {
    it('resets to home state', () => {
      store.update({
        isHost: false,
        gameId: 'TEST01',
        gamePhase: 'ANSWERING'
      });

      store.reset();

      expect(store.get('gamePhase')).toBe('HOME');
      expect(store.get('isHost')).toBe(false);
    });
  });
});
