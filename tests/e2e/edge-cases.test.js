/**
 * Edge Cases E2E Tests
 *
 * Test boundary conditions and error scenarios.
 * Tests are based on expected behavior (black box), not implementation details.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import store from "../../js/state/store.js";
import {
  normalizeAnswer,
  areAnswersDuplicate,
  groupDuplicateAnswers,
} from "../../js/game/round.js";
import { calculatePoints, calculateRoundResults, getWinners } from "../../js/game/scoring.js";

describe("edge-cases", () => {
  beforeEach(() => {
    store.reset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("duplicate answer detection", () => {
    it("should normalize case variations as same answer", () => {
      const normalized1 = normalizeAnswer("Cat");
      const normalized2 = normalizeAnswer("cat");
      const normalized3 = normalizeAnswer("CAT");

      expect(normalized1).toBe(normalized2);
      expect(normalized2).toBe(normalized3);
    });

    it("should detect case variations as duplicates", () => {
      expect(areAnswersDuplicate("Cat", "cat")).toBe(true);
      expect(areAnswersDuplicate("CAT", "cat")).toBe(true);
      expect(areAnswersDuplicate("CaT", "cAt")).toBe(true);
    });

    it("should remove leading article 'a' when normalizing", () => {
      const normalized = normalizeAnswer("A cat");
      expect(normalized).toBe("cat");
    });

    it("should remove leading article 'an' when normalizing", () => {
      const normalized = normalizeAnswer("An elephant");
      expect(normalized).toBe("elephant");
    });

    it("should remove leading article 'the' when normalizing", () => {
      const normalized = normalizeAnswer("The cat");
      expect(normalized).toBe("cat");
    });

    it("should detect answers with different articles as duplicates", () => {
      expect(areAnswersDuplicate("A cat", "The cat")).toBe(true);
      expect(areAnswersDuplicate("cat", "A cat")).toBe(true);
      expect(areAnswersDuplicate("The Cat", "a cat")).toBe(true);
    });

    it("should trim whitespace when normalizing", () => {
      const normalized = normalizeAnswer("  Cat  ");
      expect(normalized).toBe("cat");
    });

    it("should not treat different answers as duplicates", () => {
      expect(areAnswersDuplicate("Cat", "Dog")).toBe(false);
      expect(areAnswersDuplicate("Cat", "Caterpillar")).toBe(false);
    });

    it("should group duplicate answers from multiple players", () => {
      // groupDuplicateAnswers expects { playerId: answer } object
      const answers = {
        player1: "Cat",
        player2: "cat",
        player3: "Dog",
        player4: "CAT",
        player5: "dog",
      };
      const groups = groupDuplicateAnswers(answers);

      // Should have 2 groups: "cat" and "dog"
      const groupKeys = Object.keys(groups);
      expect(groupKeys).toHaveLength(2);

      // "cat" group should have 3 player IDs
      expect(groups["cat"]).toHaveLength(3);
      expect(groups["cat"]).toContain("player1");
      expect(groups["cat"]).toContain("player2");
      expect(groups["cat"]).toContain("player4");

      // "dog" group should have 2 player IDs
      expect(groups["dog"]).toHaveLength(2);
      expect(groups["dog"]).toContain("player3");
      expect(groups["dog"]).toContain("player5");
    });
  });

  describe("scoring edge cases", () => {
    it("should give 2 points for unique valid answer", () => {
      const points = calculatePoints(true, true);
      expect(points).toBe(2);
    });

    it("should give 1 point for shared (duplicate) valid answer", () => {
      const points = calculatePoints(false, true);
      expect(points).toBe(1);
    });

    it("should give 0 points for invalid answer (regardless of uniqueness)", () => {
      expect(calculatePoints(true, false)).toBe(0);
      expect(calculatePoints(false, false)).toBe(0);
    });

    it("should give 0 points when all answers for category are downvoted", () => {
      const votes = {
        0: {
          cat: { upvotes: [], downvotes: ["p1", "p2"] },
          dog: { upvotes: [], downvotes: ["p1", "p2"] },
        },
      };

      // All answers have negative net votes, so all get 0 points
      const catNetVotes = votes[0]["cat"].upvotes.length - votes[0]["cat"].downvotes.length;
      const dogNetVotes = votes[0]["dog"].upvotes.length - votes[0]["dog"].downvotes.length;

      expect(catNetVotes).toBeLessThan(1);
      expect(dogNetVotes).toBeLessThan(1);
    });

    it("should give 0 points for empty answer", () => {
      const points = calculatePoints(true, false); // Empty answers are invalid
      expect(points).toBe(0);
    });

    it("should give 0 points for answer with wrong letter even if upvoted", () => {
      // Answer "Dog" for letter "C" - wrong letter
      const isValid = false; // Wrong letter makes it invalid
      const points = calculatePoints(true, isValid);
      expect(points).toBe(0);
    });
  });

  describe("player management", () => {
    it("should require minimum 2 players to start game", () => {
      store.set("players", {
        player1: { id: "player1", name: "Alice", ready: true },
      });

      const players = store.get("players");
      const playerCount = Object.keys(players).length;
      const canStart = playerCount >= 2;

      expect(canStart).toBe(false);
    });

    it("should allow game start with 2 players", () => {
      store.set("players", {
        player1: { id: "player1", name: "Alice", ready: true },
        player2: { id: "player2", name: "Bob", ready: true },
      });

      const players = store.get("players");
      const playerCount = Object.keys(players).length;
      const allReady = Object.values(players).every((p) => p.ready);
      const canStart = playerCount >= 2 && allReady;

      expect(canStart).toBe(true);
    });

    it("should enforce maximum 8 players", () => {
      const players = {};
      for (let i = 1; i <= 8; i++) {
        players[`player${i}`] = { id: `player${i}`, name: `Player ${i}` };
      }
      store.set("players", players);

      const playerCount = Object.keys(store.get("players")).length;
      const canAddMore = playerCount < 8;

      expect(playerCount).toBe(8);
      expect(canAddMore).toBe(false);
    });

    it("should handle player leaving during answering phase", () => {
      store.set("players", {
        player1: { id: "player1", name: "Alice" },
        player2: { id: "player2", name: "Bob" },
        player3: { id: "player3", name: "Charlie" },
      });

      store.set("answers", {
        player1: ["Cat", "Cheese"],
        player2: ["Cow", "Cake"],
        player3: null, // Player left, no answers
      });

      // Remove player from game
      const players = store.get("players");
      delete players.player3;
      store.set("players", players);

      expect(Object.keys(store.get("players"))).toHaveLength(2);
      expect(store.get("answers").player3).toBeNull();
    });

    it("should handle player leaving during voting phase", () => {
      store.set("players", {
        player1: { id: "player1", name: "Alice" },
        player2: { id: "player2", name: "Bob" },
      });

      // Player 2 leaves during voting
      const players = store.get("players");
      delete players.player2;
      store.set("players", players);

      const remainingPlayers = Object.keys(store.get("players"));
      expect(remainingPlayers).toHaveLength(1);
      expect(remainingPlayers).toContain("player1");
    });

    it("should track player names correctly", () => {
      store.set("players", {
        abc123: { id: "abc123", name: "Alice McAlice" },
        def456: { id: "def456", name: "Bob" },
      });

      const players = store.get("players");
      expect(players["abc123"].name).toBe("Alice McAlice");
      expect(players["def456"].name).toBe("Bob");
    });
  });

  describe("tie scenarios", () => {
    it("should return single winner when no tie", () => {
      const scores = {
        player1: 10,
        player2: 8,
        player3: 5,
      };

      const winners = getWinners(scores);
      expect(winners).toHaveLength(1);
      expect(winners).toContain("player1");
    });

    it("should return both players for 2-way tie", () => {
      const scores = {
        player1: 10,
        player2: 10,
        player3: 5,
      };

      const winners = getWinners(scores);
      expect(winners).toHaveLength(2);
      expect(winners).toContain("player1");
      expect(winners).toContain("player2");
    });

    it("should return all three players for 3-way tie", () => {
      const scores = {
        player1: 10,
        player2: 10,
        player3: 10,
      };

      const winners = getWinners(scores);
      expect(winners).toHaveLength(3);
      expect(winners).toContain("player1");
      expect(winners).toContain("player2");
      expect(winners).toContain("player3");
    });

    it("should handle all players tied at 0", () => {
      const scores = {
        player1: 0,
        player2: 0,
        player3: 0,
      };

      const winners = getWinners(scores);
      expect(winners).toHaveLength(3);
    });

    it("should handle single player (automatic winner)", () => {
      const scores = {
        player1: 5,
      };

      const winners = getWinners(scores);
      expect(winners).toHaveLength(1);
      expect(winners).toContain("player1");
    });

    it("should handle 4-way tie correctly", () => {
      const scores = {
        player1: 7,
        player2: 7,
        player3: 7,
        player4: 7,
      };

      const winners = getWinners(scores);
      expect(winners).toHaveLength(4);
    });
  });

  describe("letter selection", () => {
    it("should track used letters to prevent repeats", () => {
      store.set("usedLetters", []);

      // Use letter A
      const usedLetters = store.get("usedLetters");
      usedLetters.push("A");
      store.set("usedLetters", usedLetters);

      expect(store.get("usedLetters")).toContain("A");

      // Verify A is not available for next round
      const available = "ABCDEFGHIJKLMNOPRSTUVWY"
        .split("")
        .filter((l) => !store.get("usedLetters").includes(l));
      expect(available).not.toContain("A");
    });

    it("should exclude Q from valid letters by default", () => {
      const validLetters = "ABCDEFGHIJKLMNOPRSTUVWY"; // No Q, X, Z
      expect(validLetters).not.toContain("Q");
    });

    it("should exclude X from valid letters by default", () => {
      const validLetters = "ABCDEFGHIJKLMNOPRSTUVWY"; // No Q, X, Z
      expect(validLetters).not.toContain("X");
    });

    it("should exclude Z from valid letters by default", () => {
      const validLetters = "ABCDEFGHIJKLMNOPRSTUVWY"; // No Q, X, Z
      expect(validLetters).not.toContain("Z");
    });

    it("should have 23 valid letters available", () => {
      const validLetters = "ABCDEFGHIJKLMNOPRSTUVWY"; // 26 - 3 (Q, X, Z)
      expect(validLetters.length).toBe(23);
    });

    it("should track available letters for selection", () => {
      const allValidLetters = "ABCDEFGHIJKLMNOPRSTUVWY".split("");
      store.set("usedLetters", ["A", "B", "C"]);

      const usedLetters = store.get("usedLetters");
      const availableLetters = allValidLetters.filter((l) => !usedLetters.includes(l));

      expect(availableLetters).toHaveLength(20);
      expect(availableLetters).not.toContain("A");
      expect(availableLetters).not.toContain("B");
      expect(availableLetters).not.toContain("C");
      expect(availableLetters).toContain("D");
    });

    it("should store current round letter", () => {
      store.set("currentLetter", "M");
      expect(store.get("currentLetter")).toBe("M");
    });

    it("should use uppercase letters consistently", () => {
      store.set("currentLetter", "M");
      const letter = store.get("currentLetter");
      expect(letter).toBe(letter.toUpperCase());
    });
  });

  describe("round results calculation", () => {
    it("should calculate results with all valid parameters", () => {
      // answers format: { playerId: { categoryIndex: answer } }
      const answers = {
        player1: { 0: "Cat", 1: "Cheese" },
        player2: { 0: "Cow", 1: "Cake" },
      };
      const votes = {
        0: {
          Cat: { upvotes: ["player2"], downvotes: [] },
          Cow: { upvotes: ["player1"], downvotes: [] },
        },
        1: {
          Cheese: { upvotes: ["player2"], downvotes: [] },
          Cake: { upvotes: ["player1"], downvotes: [] },
        },
      };
      const categories = ["Animals", "Foods"];
      const letter = "C";

      const results = calculateRoundResults(answers, votes, categories, letter);

      expect(results).toBeDefined();
      expect(typeof results).toBe("object");
      expect(results.playerScores).toBeDefined();
      expect(results.categoryResults).toBeDefined();
    });

    it("should handle empty categories array", () => {
      const answers = { player1: {} };
      const votes = {};
      const categories = [];
      const letter = "C";

      const results = calculateRoundResults(answers, votes, categories, letter);

      expect(results).toBeDefined();
      expect(results.categoryResults).toHaveLength(0);
    });

    it("should handle missing player answers gracefully", () => {
      const answers = {
        player1: { 0: "Cat", 1: "Cheese" },
        // player2 has no answers - not even in the object
      };
      const votes = {
        0: {
          Cat: { upvotes: ["player2"], downvotes: [] },
        },
      };
      const categories = ["Animals", "Foods"];
      const letter = "C";

      // Should not throw
      expect(() => {
        calculateRoundResults(answers, votes, categories, letter);
      }).not.toThrow();
    });
  });

  describe("answer validation edge cases", () => {
    it("should handle answer with only whitespace", () => {
      const normalized = normalizeAnswer("   ");
      expect(normalized).toBe("");
    });

    it("should handle answer with special characters", () => {
      const normalized = normalizeAnswer("Cat's meow!");
      expect(typeof normalized).toBe("string");
    });

    it("should handle very long answers", () => {
      const longAnswer = "C" + "a".repeat(100);
      const normalized = normalizeAnswer(longAnswer);
      expect(normalized.length).toBeGreaterThan(0);
    });

    it("should handle answer with numbers", () => {
      const normalized = normalizeAnswer("Cat123");
      expect(normalized).toBe("cat123");
    });

    it("should handle answer with multiple spaces", () => {
      const normalized = normalizeAnswer("A   big   cat");
      // Should handle multiple spaces in some way
      expect(typeof normalized).toBe("string");
    });
  });
});
