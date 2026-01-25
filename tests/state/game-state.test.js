/**
 * Tests for game-state.js - Game phase state machine
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { gameState, PHASES } from "../../js/state/game-state.js";
import store from "../../js/state/store.js";

describe("game-state", () => {
  beforeEach(() => {
    store.reset();
    // Clear any registered callbacks
    gameState.transitionCallbacks.clear();
  });

  describe("PHASES", () => {
    it("defines all game phases", () => {
      expect(PHASES.HOME).toBe("HOME");
      expect(PHASES.LOBBY).toBe("LOBBY");
      expect(PHASES.ANSWERING).toBe("ANSWERING");
      expect(PHASES.VOTING).toBe("VOTING");
      expect(PHASES.RESULTS).toBe("RESULTS");
      expect(PHASES.GAME_OVER).toBe("GAME_OVER");
    });
  });

  describe("currentPhase", () => {
    it("returns current phase from store", () => {
      expect(gameState.currentPhase).toBe("HOME");

      store.set("gamePhase", "LOBBY");
      expect(gameState.currentPhase).toBe("LOBBY");
    });
  });

  describe("canTransition", () => {
    it("allows valid transitions from HOME", () => {
      expect(gameState.canTransition(PHASES.LOBBY)).toBe(true);
      expect(gameState.canTransition(PHASES.ANSWERING)).toBe(false);
    });

    it("allows valid transitions from LOBBY", () => {
      store.set("gamePhase", "LOBBY");

      expect(gameState.canTransition(PHASES.ANSWERING)).toBe(true);
      expect(gameState.canTransition(PHASES.HOME)).toBe(true);
      expect(gameState.canTransition(PHASES.VOTING)).toBe(false);
    });

    it("allows valid transitions from ANSWERING", () => {
      store.set("gamePhase", "ANSWERING");

      expect(gameState.canTransition(PHASES.VOTING)).toBe(true);
      expect(gameState.canTransition(PHASES.HOME)).toBe(false);
    });

    it("allows valid transitions from VOTING", () => {
      store.set("gamePhase", "VOTING");

      expect(gameState.canTransition(PHASES.RESULTS)).toBe(true);
      expect(gameState.canTransition(PHASES.ANSWERING)).toBe(false);
    });

    it("allows valid transitions from RESULTS", () => {
      store.set("gamePhase", "RESULTS");

      expect(gameState.canTransition(PHASES.ANSWERING)).toBe(true);
      expect(gameState.canTransition(PHASES.GAME_OVER)).toBe(true);
      expect(gameState.canTransition(PHASES.LOBBY)).toBe(false);
    });

    it("allows valid transitions from GAME_OVER", () => {
      store.set("gamePhase", "GAME_OVER");

      expect(gameState.canTransition(PHASES.LOBBY)).toBe(true);
      expect(gameState.canTransition(PHASES.HOME)).toBe(true);
      expect(gameState.canTransition(PHASES.ANSWERING)).toBe(false);
    });
  });

  describe("transition", () => {
    it("updates phase on valid transition", () => {
      const result = gameState.transition(PHASES.LOBBY);

      expect(result).toBe(true);
      expect(store.get("gamePhase")).toBe("LOBBY");
    });

    it("returns false on invalid transition", () => {
      const result = gameState.transition(PHASES.VOTING);

      expect(result).toBe(false);
      expect(store.get("gamePhase")).toBe("HOME");
    });

    it("fires transition callbacks", () => {
      const callback = vi.fn();
      gameState.onTransition(PHASES.HOME, PHASES.LOBBY, callback);

      gameState.transition(PHASES.LOBBY, { foo: "bar" });

      expect(callback).toHaveBeenCalledWith({ foo: "bar" });
    });

    it("fires enter callbacks", () => {
      const callback = vi.fn();
      gameState.onEnter(PHASES.LOBBY, callback);

      gameState.transition(PHASES.LOBBY, { foo: "bar" });

      expect(callback).toHaveBeenCalledWith(PHASES.HOME, { foo: "bar" });
    });

    it("fires exit callbacks", () => {
      const callback = vi.fn();
      gameState.onExit(PHASES.HOME, callback);

      gameState.transition(PHASES.LOBBY, { foo: "bar" });

      expect(callback).toHaveBeenCalledWith(PHASES.LOBBY, { foo: "bar" });
    });
  });

  describe("forcePhase", () => {
    it("sets phase without validation", () => {
      gameState.forcePhase(PHASES.GAME_OVER);

      expect(store.get("gamePhase")).toBe("GAME_OVER");
    });
  });

  describe("isPhase", () => {
    it("returns true for current phase", () => {
      expect(gameState.isPhase(PHASES.HOME)).toBe(true);
      expect(gameState.isPhase(PHASES.LOBBY)).toBe(false);
    });
  });

  describe("isPlaying", () => {
    it("returns false for HOME and LOBBY", () => {
      expect(gameState.isPlaying()).toBe(false);

      store.set("gamePhase", "LOBBY");
      expect(gameState.isPlaying()).toBe(false);
    });

    it("returns true for ANSWERING, VOTING, RESULTS", () => {
      store.set("gamePhase", "ANSWERING");
      expect(gameState.isPlaying()).toBe(true);

      store.set("gamePhase", "VOTING");
      expect(gameState.isPlaying()).toBe(true);

      store.set("gamePhase", "RESULTS");
      expect(gameState.isPlaying()).toBe(true);
    });

    it("returns false for GAME_OVER", () => {
      store.set("gamePhase", "GAME_OVER");
      expect(gameState.isPlaying()).toBe(false);
    });
  });
});
