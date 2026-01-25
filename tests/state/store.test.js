/**
 * Tests for store.js - Centralized pub/sub state store
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { store } from '../../js/state/store.js';

describe('store', () => {
  beforeEach(() => {
    store.reset();
  });

  describe('get', () => {
    it('returns entire state when no path provided', () => {
      const state = store.get();
      expect(state).toBeDefined();
      expect(state.gamePhase).toBe('HOME');
    });

    it('returns value at simple path', () => {
      expect(store.get('gamePhase')).toBe('HOME');
      expect(store.get('isHost')).toBe(false);
    });

    it('returns value at nested path', () => {
      expect(store.get('localPlayer.name')).toBe('Player');
      expect(store.get('settings.rounds')).toBe(3);
    });

    it('returns undefined for non-existent paths', () => {
      expect(store.get('nonexistent')).toBeUndefined();
      expect(store.get('localPlayer.nonexistent')).toBeUndefined();
    });
  });

  describe('set', () => {
    it('sets value at simple path', () => {
      store.set('gamePhase', 'LOBBY');
      expect(store.get('gamePhase')).toBe('LOBBY');
    });

    it('sets value at nested path', () => {
      store.set('localPlayer.name', 'Alice');
      expect(store.get('localPlayer.name')).toBe('Alice');
    });

    it('creates nested objects if needed', () => {
      store.set('custom.nested.value', 123);
      expect(store.get('custom.nested.value')).toBe(123);
    });

    it('overwrites existing values', () => {
      store.set('settings.rounds', 5);
      expect(store.get('settings.rounds')).toBe(5);
    });
  });

  describe('update', () => {
    it('updates multiple paths at once', () => {
      store.update({
        'gamePhase': 'LOBBY',
        'isHost': true,
        'localPlayer.name': 'Host'
      });

      expect(store.get('gamePhase')).toBe('LOBBY');
      expect(store.get('isHost')).toBe(true);
      expect(store.get('localPlayer.name')).toBe('Host');
    });
  });

  describe('merge', () => {
    it('merges object into existing state at path', () => {
      store.merge('localPlayer', { name: 'Alice', isReady: true });

      expect(store.get('localPlayer.name')).toBe('Alice');
      expect(store.get('localPlayer.isReady')).toBe(true);
      expect(store.get('localPlayer.id')).toBeNull(); // Original value preserved
    });

    it('creates object if path does not exist', () => {
      store.merge('newObject', { foo: 'bar' });
      expect(store.get('newObject.foo')).toBe('bar');
    });
  });

  describe('subscribe', () => {
    it('calls callback immediately with current value', () => {
      const callback = vi.fn();
      store.subscribe('gamePhase', callback);

      expect(callback).toHaveBeenCalledWith('HOME', undefined, 'gamePhase');
    });

    it('calls callback when value changes', () => {
      const callback = vi.fn();
      store.subscribe('gamePhase', callback);
      callback.mockClear();

      store.set('gamePhase', 'LOBBY');

      expect(callback).toHaveBeenCalledWith('LOBBY', 'HOME', 'gamePhase');
    });

    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = store.subscribe('gamePhase', callback);
      callback.mockClear();

      unsubscribe();
      store.set('gamePhase', 'LOBBY');

      expect(callback).not.toHaveBeenCalled();
    });

    it('notifies parent path listeners on nested changes', () => {
      const callback = vi.fn();
      store.subscribe('localPlayer', callback);
      callback.mockClear();

      store.set('localPlayer.name', 'Alice');

      expect(callback).toHaveBeenCalled();
    });
  });

  describe('subscribeAll', () => {
    it('calls callback on any state change', () => {
      const callback = vi.fn();
      store.subscribeAll(callback);

      store.set('gamePhase', 'LOBBY');

      expect(callback).toHaveBeenCalledWith('gamePhase', 'LOBBY', 'HOME');
    });

    it('returns unsubscribe function', () => {
      const callback = vi.fn();
      const unsubscribe = store.subscribeAll(callback);

      unsubscribe();
      store.set('gamePhase', 'LOBBY');

      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('reset', () => {
    it('resets state to initial values', () => {
      store.set('gamePhase', 'LOBBY');
      store.set('isHost', true);
      store.set('localPlayer.name', 'Alice');

      store.reset();

      expect(store.get('gamePhase')).toBe('HOME');
      expect(store.get('isHost')).toBe(false);
      expect(store.get('localPlayer.name')).toBe('Player');
    });

    it('notifies subscribers after reset', () => {
      const callback = vi.fn();
      store.subscribe('gamePhase', callback);

      store.set('gamePhase', 'LOBBY');
      callback.mockClear();

      store.reset();

      expect(callback).toHaveBeenCalledWith('HOME', undefined, 'gamePhase');
    });
  });

  describe('getGameState', () => {
    it('returns serializable game state', () => {
      store.set('players', [{ id: 'p1', name: 'Alice' }]);
      store.set('currentRound', 2);

      const gameState = store.getGameState();

      expect(gameState.players).toEqual([{ id: 'p1', name: 'Alice' }]);
      expect(gameState.currentRound).toBe(2);
      expect(gameState.gamePhase).toBe('HOME');
    });

    it('does not include connection-specific state', () => {
      store.set('isHost', true);
      store.set('peerId', 'test-peer');

      const gameState = store.getGameState();

      expect(gameState.isHost).toBeUndefined();
      expect(gameState.peerId).toBeUndefined();
    });
  });

  describe('applyGameState', () => {
    it('applies game state from host', () => {
      const gameState = {
        players: [{ id: 'p1', name: 'Alice' }],
        gamePhase: 'LOBBY',
        currentRound: 1
      };

      store.applyGameState(gameState);

      expect(store.get('players')).toEqual([{ id: 'p1', name: 'Alice' }]);
      expect(store.get('gamePhase')).toBe('LOBBY');
      expect(store.get('currentRound')).toBe(1);
    });
  });
});
