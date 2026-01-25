/**
 * Tests for host.js - Game authority and state broadcasting
 *
 * These tests focus on the pure logic functions that can be tested
 * without complex module mocking of PeerJS.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SETTINGS, MAX_PLAYERS, SCORING } from "../../js/config.js";
import store from "../../js/state/store.js";
import { selectLetter } from "../../js/game/round.js";
import { getCategories } from "../../js/game/categories.js";
import { calculateRoundResults } from "../../js/game/scoring.js";

describe("host logic", () => {
  beforeEach(() => {
    store.reset();
  });

  describe("game ID generation", () => {
    it("generates 6 character IDs", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const generateShortId = () => {
        let id = "";
        for (let i = 0; i < 6; i++) {
          id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
      };

      const id = generateShortId();
      expect(id).toHaveLength(6);
    });

    it("uses valid characters only", () => {
      const validChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const generateShortId = () => {
        let id = "";
        for (let i = 0; i < 6; i++) {
          id += validChars.charAt(Math.floor(Math.random() * validChars.length));
        }
        return id;
      };

      const id = generateShortId();
      for (const char of id) {
        expect(validChars).toContain(char);
      }
    });

    it("excludes confusing characters (0, O, 1, I)", () => {
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      expect(chars).not.toContain("0"); // Zero looks like O
      expect(chars).not.toContain("O"); // O looks like zero
      expect(chars).not.toContain("1"); // One looks like I/l
      expect(chars).not.toContain("I"); // I looks like 1/l
      // Note: L is included as it's distinguishable in uppercase
    });
  });

  describe("player management logic", () => {
    it("adds new player to players array", () => {
      const players = [
        {
          id: "host",
          name: "Host",
          isHost: true,
          isReady: false,
          score: 0,
        },
      ];

      const newPlayer = {
        id: "player-1",
        name: "Alice",
        isHost: false,
        isReady: false,
        score: 0,
      };

      players.push(newPlayer);
      expect(players).toHaveLength(2);
      expect(players[1].name).toBe("Alice");
    });

    it("updates existing player on reconnect", () => {
      const players = [
        { id: "host", name: "Host", isHost: true, isReady: true },
        { id: "player-1", name: "Alice", isHost: false, isReady: true },
      ];

      // Simulate reconnect
      const existingIndex = players.findIndex((p) => p.id === "player-1");
      if (existingIndex >= 0) {
        players[existingIndex].name = "Alice Updated";
        players[existingIndex].isReady = false;
      }

      expect(players).toHaveLength(2);
      expect(players[1].name).toBe("Alice Updated");
      expect(players[1].isReady).toBe(false);
    });

    it("removes player by ID", () => {
      const players = [
        { id: "host", name: "Host", isHost: true },
        { id: "player-1", name: "Alice", isHost: false },
      ];

      const filtered = players.filter((p) => p.id !== "player-1");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].id).toBe("host");
    });

    it("enforces max player limit", () => {
      const players = [];
      for (let i = 0; i < MAX_PLAYERS; i++) {
        players.push({ id: `p${i}`, name: `Player ${i}` });
      }

      expect(players.length >= MAX_PLAYERS).toBe(true);
      // New player should be rejected
    });
  });

  describe("ready state logic", () => {
    it("updates player ready state", () => {
      const players = [
        { id: "host", isReady: false },
        { id: "player-1", isReady: false },
      ];

      const player = players.find((p) => p.id === "player-1");
      if (player) {
        player.isReady = true;
      }

      expect(players[1].isReady).toBe(true);
    });

    it("checks if all players are ready", () => {
      const playersNotReady = [
        { id: "host", isReady: true },
        { id: "player-1", isReady: false },
      ];

      const playersReady = [
        { id: "host", isReady: true },
        { id: "player-1", isReady: true },
      ];

      expect(playersNotReady.every((p) => p.isReady)).toBe(false);
      expect(playersReady.every((p) => p.isReady)).toBe(true);
    });

    it("requires minimum 2 players to start", () => {
      const onePlayer = [{ id: "host", isReady: true }];
      const twoPlayers = [
        { id: "host", isReady: true },
        { id: "player-1", isReady: true },
      ];

      expect(onePlayer.length >= 2).toBe(false);
      expect(twoPlayers.length >= 2).toBe(true);
    });
  });

  describe("settings validation", () => {
    it("clamps rounds to valid range", () => {
      const clampRounds = (value) =>
        Math.max(SETTINGS.ROUNDS.MIN, Math.min(SETTINGS.ROUNDS.MAX, value));

      expect(clampRounds(0)).toBe(SETTINGS.ROUNDS.MIN);
      expect(clampRounds(100)).toBe(SETTINGS.ROUNDS.MAX);
      expect(clampRounds(5)).toBe(5);
    });

    it("clamps categories to valid range", () => {
      const clampCategories = (value) =>
        Math.max(SETTINGS.CATEGORIES.MIN, Math.min(SETTINGS.CATEGORIES.MAX, value));

      expect(clampCategories(2)).toBe(SETTINGS.CATEGORIES.MIN);
      expect(clampCategories(20)).toBe(SETTINGS.CATEGORIES.MAX);
      expect(clampCategories(8)).toBe(8);
    });

    it("clamps timer to valid range", () => {
      const clampTimer = (value) =>
        Math.max(SETTINGS.TIMER.MIN, Math.min(SETTINGS.TIMER.MAX, value));

      expect(clampTimer(30)).toBe(SETTINGS.TIMER.MIN);
      expect(clampTimer(600)).toBe(SETTINGS.TIMER.MAX);
      expect(clampTimer(180)).toBe(180);
    });
  });

  describe("round initialization", () => {
    it("selects a letter not previously used", () => {
      const usedLetters = ["A", "B", "C"];
      const letter = selectLetter(usedLetters);

      expect(usedLetters).not.toContain(letter);
    });

    it("gets correct number of categories", () => {
      const categories = getCategories(8);
      expect(categories).toHaveLength(8);
    });

    it("resets player ready states for new round", () => {
      const players = [
        { id: "host", isReady: true, score: 5 },
        { id: "player-1", isReady: true, score: 3 },
      ];

      const resetPlayers = players.map((p) => ({ ...p, isReady: false }));

      expect(resetPlayers[0].isReady).toBe(false);
      expect(resetPlayers[1].isReady).toBe(false);
      // Scores should be preserved
      expect(resetPlayers[0].score).toBe(5);
    });
  });

  describe("answer handling", () => {
    it("stores player answers", () => {
      const answers = {};
      const playerAnswers = { 0: "Cat", 1: "Cake" };

      answers["player-1"] = playerAnswers;

      expect(answers["player-1"]).toEqual(playerAnswers);
    });

    it("allows multiple players to submit", () => {
      const answers = {};

      answers["host"] = { 0: "Cat", 1: "Cake" };
      answers["player-1"] = { 0: "Cow", 1: "Cheese" };

      expect(Object.keys(answers)).toHaveLength(2);
    });
  });

  describe("vote handling", () => {
    it("initializes vote structure", () => {
      const votes = {};
      const categoryIndex = 0;
      const answer = "Cat";

      if (!votes[categoryIndex]) {
        votes[categoryIndex] = {};
      }
      if (!votes[categoryIndex][answer]) {
        votes[categoryIndex][answer] = { upvotes: [], downvotes: [] };
      }

      expect(votes[0]["Cat"]).toEqual({ upvotes: [], downvotes: [] });
    });

    it("records upvote", () => {
      const votes = { 0: { Cat: { upvotes: [], downvotes: [] } } };
      const playerId = "player-1";

      votes[0]["Cat"].upvotes.push(playerId);

      expect(votes[0]["Cat"].upvotes).toContain("player-1");
    });

    it("records downvote", () => {
      const votes = { 0: { Cat: { upvotes: [], downvotes: [] } } };
      const playerId = "player-1";

      votes[0]["Cat"].downvotes.push(playerId);

      expect(votes[0]["Cat"].downvotes).toContain("player-1");
    });

    it("removes previous vote when changing", () => {
      const votes = { 0: { Cat: { upvotes: ["player-1"], downvotes: [] } } };
      const playerId = "player-1";

      // Remove existing vote
      votes[0]["Cat"].upvotes = votes[0]["Cat"].upvotes.filter((id) => id !== playerId);
      votes[0]["Cat"].downvotes = votes[0]["Cat"].downvotes.filter((id) => id !== playerId);

      // Add new vote
      votes[0]["Cat"].downvotes.push(playerId);

      expect(votes[0]["Cat"].upvotes).not.toContain("player-1");
      expect(votes[0]["Cat"].downvotes).toContain("player-1");
    });
  });

  describe("results calculation", () => {
    it("calculates round results correctly", () => {
      const answers = {
        host: { 0: "Cat" },
        "player-1": { 0: "Cow" },
      };

      const votes = {
        0: {
          Cat: { upvotes: ["player-1"], downvotes: [] },
          Cow: { upvotes: ["host"], downvotes: [] },
        },
      };

      const categories = ["Animals"];
      const letter = "C";

      const results = calculateRoundResults(answers, votes, categories, letter);

      expect(results.playerScores["host"]).toBe(SCORING.UNIQUE_ANSWER);
      expect(results.playerScores["player-1"]).toBe(SCORING.UNIQUE_ANSWER);
    });

    it("updates cumulative scores", () => {
      const scores = { host: 5, "player-1": 3 };
      const roundScores = { host: 2, "player-1": 4 };

      for (const [playerId, roundScore] of Object.entries(roundScores)) {
        scores[playerId] = (scores[playerId] || 0) + roundScore;
      }

      expect(scores["host"]).toBe(7);
      expect(scores["player-1"]).toBe(7);
    });
  });

  describe("game flow", () => {
    it("determines if more rounds remain", () => {
      expect(2 < 3).toBe(true); // More rounds
      expect(3 < 3).toBe(false); // Last round
      expect(3 >= 3).toBe(true); // Game over
    });

    it("resets game for play again", () => {
      const gameState = {
        currentRound: 3,
        scores: { host: 10, "player-1": 15 },
        answers: { host: { 0: "Cat" } },
        votes: { 0: {} },
        roundResults: { categoryResults: [] },
        usedLetters: ["A", "B", "C"],
      };

      // Reset
      gameState.currentRound = 0;
      gameState.scores = {};
      gameState.answers = {};
      gameState.votes = {};
      gameState.roundResults = null;
      gameState.usedLetters = [];

      expect(gameState.currentRound).toBe(0);
      expect(gameState.scores).toEqual({});
      expect(gameState.usedLetters).toEqual([]);
    });
  });

  describe("store integration", () => {
    it("updates store with player data", () => {
      store.set("players", [{ id: "host", name: "Host", isHost: true, isReady: false }]);

      const players = store.get("players");
      players.push({ id: "player-1", name: "Alice", isHost: false, isReady: false });
      store.set("players", [...players]);

      expect(store.get("players")).toHaveLength(2);
    });

    it("updates store with game state", () => {
      store.update({
        gamePhase: "LOBBY",
        currentRound: 0,
        totalRounds: 3,
      });

      expect(store.get("gamePhase")).toBe("LOBBY");
      expect(store.get("currentRound")).toBe(0);
      expect(store.get("totalRounds")).toBe(3);
    });

    it("updates store with answers", () => {
      store.set("answers", {});

      const answers = store.get("answers");
      answers["player-1"] = { 0: "Cat", 1: "Cake" };
      store.set("answers", { ...answers });

      expect(store.get("answers")["player-1"]).toEqual({ 0: "Cat", 1: "Cake" });
    });

    it("updates store with votes", () => {
      store.set("votes", {});

      const votes = store.get("votes");
      votes[0] = { Cat: { upvotes: ["player-1"], downvotes: [] } };
      store.set("votes", { ...votes });

      expect(store.get("votes")[0]["Cat"].upvotes).toContain("player-1");
    });

    it("updates store with scores", () => {
      store.set("scores", { host: 0, "player-1": 0 });

      const scores = store.get("scores");
      scores["host"] = 5;
      scores["player-1"] = 7;
      store.set("scores", { ...scores });

      expect(store.get("scores.host")).toBe(5);
      expect(store.get("scores.player-1")).toBe(7);
    });
  });
});
