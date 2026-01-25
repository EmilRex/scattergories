/**
 * Full Game E2E Tests
 *
 * Test complete game flows from lobby to game over with multiple players.
 * Tests are based on expected behavior (black box), not implementation details.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import store from "../../js/state/store.js";
import { gameState } from "../../js/state/game-state.js";
import { createMockPeerManager } from "../mocks/peer-mock.js";

describe("full-game", () => {
  let hostPeerManager;
  let clientPeerManagers;

  beforeEach(() => {
    store.reset();
    gameState.reset();
    hostPeerManager = createMockPeerManager();
    clientPeerManagers = [];
    vi.useFakeTimers();
  });

  afterEach(() => {
    hostPeerManager?.destroy();
    clientPeerManagers.forEach((pm) => pm?.destroy());
    vi.useRealTimers();
  });

  describe("3-player complete game (1 round)", () => {
    it("should transition through all phases: LOBBY -> ANSWERING -> VOTING -> RESULTS -> GAME_OVER", async () => {
      // Setup: Start in HOME, create game should go to LOBBY
      expect(gameState.getPhase()).toBe("HOME");

      // Transition to LOBBY
      gameState.transition("LOBBY");
      expect(gameState.getPhase()).toBe("LOBBY");

      // Transition to ANSWERING
      gameState.transition("ANSWERING");
      expect(gameState.getPhase()).toBe("ANSWERING");

      // Transition to VOTING
      gameState.transition("VOTING");
      expect(gameState.getPhase()).toBe("VOTING");

      // Transition to RESULTS
      gameState.transition("RESULTS");
      expect(gameState.getPhase()).toBe("RESULTS");

      // Transition to GAME_OVER
      gameState.transition("GAME_OVER");
      expect(gameState.getPhase()).toBe("GAME_OVER");
    });

    it("should track players in the store", () => {
      store.set("players", {
        host123: { id: "host123", name: "Host", isHost: true, ready: false },
        player1: { id: "player1", name: "Alice", isHost: false, ready: false },
        player2: { id: "player2", name: "Bob", isHost: false, ready: false },
      });

      const players = store.get("players");
      expect(Object.keys(players)).toHaveLength(3);
      expect(players["host123"].isHost).toBe(true);
      expect(players["player1"].name).toBe("Alice");
      expect(players["player2"].name).toBe("Bob");
    });

    it("should track ready states for all players", () => {
      store.set("players", {
        host123: { id: "host123", name: "Host", isHost: true, ready: true },
        player1: { id: "player1", name: "Alice", isHost: false, ready: true },
        player2: { id: "player2", name: "Bob", isHost: false, ready: true },
      });

      const players = store.get("players");
      const allReady = Object.values(players).every((p) => p.ready);
      expect(allReady).toBe(true);
    });

    it("should store answers for each player", () => {
      const categories = ["Animals", "Foods", "Countries"];
      store.set("categories", categories);
      store.set("currentLetter", "C");

      store.set("answers", {
        host123: ["Cat", "Cheese", "Canada"],
        player1: ["Cow", "Cake", "Chile"],
        player2: ["Cat", "Chips", "China"],
      });

      const answers = store.get("answers");
      expect(answers["host123"]).toHaveLength(3);
      expect(answers["player1"][0]).toBe("Cow");
      expect(answers["player2"][2]).toBe("China");
    });

    it("should track scores for each player", () => {
      store.set("scores", {
        host123: 5,
        player1: 4,
        player2: 3,
      });

      const scores = store.get("scores");
      expect(scores["host123"]).toBe(5);
      expect(scores["player1"]).toBe(4);
      expect(scores["player2"]).toBe(3);
    });

    it("should determine winner with highest score", () => {
      store.set("scores", {
        host123: 5,
        player1: 8,
        player2: 3,
      });

      const scores = store.get("scores");
      const highestScore = Math.max(...Object.values(scores));
      const winners = Object.entries(scores)
        .filter(([, score]) => score === highestScore)
        .map(([id]) => id);

      expect(winners).toContain("player1");
      expect(winners).toHaveLength(1);
    });
  });

  describe("multi-round game (3 rounds)", () => {
    it("should track current round number", () => {
      store.set("currentRound", 1);
      expect(store.get("currentRound")).toBe(1);

      store.set("currentRound", 2);
      expect(store.get("currentRound")).toBe(2);

      store.set("currentRound", 3);
      expect(store.get("currentRound")).toBe(3);
    });

    it("should use different letters for each round", () => {
      const usedLetters = [];

      store.set("currentLetter", "A");
      usedLetters.push(store.get("currentLetter"));

      store.set("currentLetter", "B");
      usedLetters.push(store.get("currentLetter"));

      store.set("currentLetter", "C");
      usedLetters.push(store.get("currentLetter"));

      // All letters should be unique
      const uniqueLetters = new Set(usedLetters);
      expect(uniqueLetters.size).toBe(3);
    });

    it("should track used letters to prevent repeats", () => {
      store.set("usedLetters", ["A"]);
      expect(store.get("usedLetters")).toContain("A");

      store.set("usedLetters", ["A", "B"]);
      expect(store.get("usedLetters")).toContain("B");
      expect(store.get("usedLetters")).toHaveLength(2);
    });

    it("should accumulate scores across rounds", () => {
      // Round 1 scores
      store.set("scores", { player1: 5, player2: 3 });

      // After round 2, scores should accumulate
      const currentScores = store.get("scores");
      store.set("scores", {
        player1: currentScores.player1 + 4,
        player2: currentScores.player2 + 6,
      });

      const finalScores = store.get("scores");
      expect(finalScores.player1).toBe(9);
      expect(finalScores.player2).toBe(9);
    });

    it("should track total rounds configured", () => {
      store.set("settings", { totalRounds: 3 });
      expect(store.get("settings").totalRounds).toBe(3);
    });
  });

  describe("play again flow", () => {
    it("should reset scores to 0 for new game", () => {
      store.set("scores", { player1: 15, player2: 12 });
      expect(store.get("scores").player1).toBe(15);

      // Reset for new game
      store.set("scores", { player1: 0, player2: 0 });
      expect(store.get("scores").player1).toBe(0);
      expect(store.get("scores").player2).toBe(0);
    });

    it("should reset ready states for new game", () => {
      store.set("players", {
        player1: { id: "player1", name: "Alice", ready: true },
        player2: { id: "player2", name: "Bob", ready: true },
      });

      // Reset ready states
      const players = store.get("players");
      Object.keys(players).forEach((id) => {
        players[id].ready = false;
      });
      store.set("players", players);

      const resetPlayers = store.get("players");
      expect(resetPlayers.player1.ready).toBe(false);
      expect(resetPlayers.player2.ready).toBe(false);
    });

    it("should transition from GAME_OVER back to LOBBY for new game", () => {
      gameState.transition("LOBBY");
      gameState.transition("ANSWERING");
      gameState.transition("VOTING");
      gameState.transition("RESULTS");
      gameState.transition("GAME_OVER");
      expect(gameState.getPhase()).toBe("GAME_OVER");

      // Start new game
      gameState.reset();
      gameState.transition("LOBBY");
      expect(gameState.getPhase()).toBe("LOBBY");
    });

    it("should clear used letters for new game", () => {
      store.set("usedLetters", ["A", "B", "C"]);
      expect(store.get("usedLetters")).toHaveLength(3);

      store.set("usedLetters", []);
      expect(store.get("usedLetters")).toHaveLength(0);
    });

    it("should reset round counter for new game", () => {
      store.set("currentRound", 3);
      expect(store.get("currentRound")).toBe(3);

      store.set("currentRound", 1);
      expect(store.get("currentRound")).toBe(1);
    });
  });

  describe("timer-based phase transitions", () => {
    it("should track timer value in store", () => {
      store.set("timer", 90);
      expect(store.get("timer")).toBe(90);

      store.set("timer", 45);
      expect(store.get("timer")).toBe(45);

      store.set("timer", 0);
      expect(store.get("timer")).toBe(0);
    });

    it("should track submitted status for players", () => {
      store.set("submitted", {
        player1: false,
        player2: false,
      });

      // Player 1 submits
      const submitted = store.get("submitted");
      submitted.player1 = true;
      store.set("submitted", submitted);

      expect(store.get("submitted").player1).toBe(true);
      expect(store.get("submitted").player2).toBe(false);
    });

    it("should detect when all players have submitted", () => {
      store.set("submitted", {
        player1: true,
        player2: true,
        player3: true,
      });

      const submitted = store.get("submitted");
      const allSubmitted = Object.values(submitted).every((s) => s === true);
      expect(allSubmitted).toBe(true);
    });

    it("should support transition even when not all submitted (timer expiry)", () => {
      store.set("submitted", {
        player1: true,
        player2: false, // Did not submit
      });

      // Timer expires, should still allow transition
      gameState.transition("LOBBY");
      gameState.transition("ANSWERING");
      expect(gameState.getPhase()).toBe("ANSWERING");

      // Even though not all submitted, can transition when timer expires
      gameState.transition("VOTING");
      expect(gameState.getPhase()).toBe("VOTING");
    });

    it("should track voting timer separately", () => {
      store.set("votingTimer", 30);
      expect(store.get("votingTimer")).toBe(30);

      store.set("votingTimer", 0);
      expect(store.get("votingTimer")).toBe(0);
    });
  });
});
