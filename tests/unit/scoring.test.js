/**
 * Tests for scoring.js - Voting and scoring logic
 */

import { describe, it, expect } from "vitest";
import {
  calculateNetVotes,
  isAnswerValid,
  calculatePoints,
  calculateRoundResults,
  getLeaderboard,
  getWinners,
} from "../../js/game/scoring.js";

describe("scoring", () => {
  describe("calculateNetVotes", () => {
    it("returns 0 for null/undefined input", () => {
      expect(calculateNetVotes(null)).toBe(0);
      expect(calculateNetVotes(undefined)).toBe(0);
    });

    it("calculates positive net votes correctly", () => {
      expect(
        calculateNetVotes({
          upvotes: ["p1", "p2", "p3"],
          downvotes: ["p4"],
        })
      ).toBe(2);
    });

    it("calculates negative net votes correctly", () => {
      expect(
        calculateNetVotes({
          upvotes: ["p1"],
          downvotes: ["p2", "p3", "p4"],
        })
      ).toBe(-2);
    });

    it("calculates zero net votes correctly", () => {
      expect(
        calculateNetVotes({
          upvotes: ["p1", "p2"],
          downvotes: ["p3", "p4"],
        })
      ).toBe(0);
    });

    it("handles missing upvotes/downvotes arrays", () => {
      expect(calculateNetVotes({ upvotes: ["p1"] })).toBe(1);
      expect(calculateNetVotes({ downvotes: ["p1"] })).toBe(-1);
      expect(calculateNetVotes({})).toBe(0);
    });
  });

  describe("isAnswerValid", () => {
    it("returns true for valid answer with positive net votes (>= 1)", () => {
      // Answer "Cat" starts with "C", net votes = 1
      expect(isAnswerValid("Cat", "C", 1)).toBe(true);
      // Answer with higher net votes
      expect(isAnswerValid("Cat", "C", 5)).toBe(true);
    });

    it("returns false for zero net votes", () => {
      expect(isAnswerValid("Cat", "C", 0)).toBe(false);
    });

    it("returns false for negative net votes", () => {
      expect(isAnswerValid("Cat", "C", -2)).toBe(false);
    });

    it("returns false for null/empty answer", () => {
      expect(isAnswerValid(null, "C", 5)).toBe(false);
      expect(isAnswerValid("", "C", 5)).toBe(false);
      expect(isAnswerValid("  ", "C", 5)).toBe(false);
    });

    it("returns false for wrong starting letter", () => {
      expect(isAnswerValid("Dog", "C", 5)).toBe(false);
    });

    it("handles case-insensitive letter matching", () => {
      expect(isAnswerValid("cat", "C", 1)).toBe(true);
      expect(isAnswerValid("Cat", "c", 1)).toBe(true);
    });
  });

  describe("calculatePoints", () => {
    it("returns 2 points for unique valid answers", () => {
      expect(calculatePoints(true, true)).toBe(2);
    });

    it("returns 1 point for non-unique (shared) valid answers", () => {
      expect(calculatePoints(false, true)).toBe(1);
    });

    it("returns 0 points for invalid answers regardless of uniqueness", () => {
      expect(calculatePoints(true, false)).toBe(0);
      expect(calculatePoints(false, false)).toBe(0);
    });

    it("defaults to valid=true for backwards compatibility", () => {
      expect(calculatePoints(true)).toBe(2);
      expect(calculatePoints(false)).toBe(1);
    });
  });

  describe("calculateRoundResults", () => {
    const categories = ["Animals", "Foods"];
    const letter = "C";

    it("calculates correct scores for valid unique answers", () => {
      const answers = {
        player1: { 0: "Cat", 1: "Cake" },
        player2: { 0: "Cow", 1: "Cheese" },
      };

      const votes = {
        0: {
          Cat: { upvotes: ["player2"], downvotes: [] },
          Cow: { upvotes: ["player1"], downvotes: [] },
        },
        1: {
          Cake: { upvotes: ["player2"], downvotes: [] },
          Cheese: { upvotes: ["player1"], downvotes: [] },
        },
      };

      const results = calculateRoundResults(answers, votes, categories, letter);

      // Each player has 2 unique valid answers = 2 * 2 = 4 points each
      expect(results.playerScores.player1).toBe(4);
      expect(results.playerScores.player2).toBe(4);
    });

    it("calculates correct scores for duplicate answers (1 point each)", () => {
      const answers = {
        player1: { 0: "Cat" },
        player2: { 0: "cat" }, // Same answer, different case
      };

      const votes = {
        0: {
          Cat: { upvotes: ["player2"], downvotes: [] },
          cat: { upvotes: ["player1"], downvotes: [] },
        },
      };

      const results = calculateRoundResults(answers, votes, categories, letter);

      // Each player has same answer = 1 point each
      expect(results.playerScores.player1).toBe(1);
      expect(results.playerScores.player2).toBe(1);
    });

    it("gives 0 points for invalid answers (wrong starting letter)", () => {
      const answers = {
        player1: { 0: "Dog" }, // Wrong letter for 'C'
      };

      const votes = {
        0: {
          Dog: { upvotes: ["player2"], downvotes: [] },
        },
      };

      const results = calculateRoundResults(answers, votes, categories, letter);

      expect(results.playerScores.player1 || 0).toBe(0);
    });

    it("gives 0 points for answers with negative votes", () => {
      const answers = {
        player1: { 0: "Cat" },
      };

      const votes = {
        0: {
          Cat: { upvotes: [], downvotes: ["player2", "player3"] },
        },
      };

      const results = calculateRoundResults(answers, votes, categories, letter);

      expect(results.playerScores.player1 || 0).toBe(0);
    });

    it("handles empty answers", () => {
      const answers = {
        player1: { 0: "", 1: "  " },
      };

      const votes = {};

      const results = calculateRoundResults(answers, votes, categories, letter);

      expect(results.playerScores.player1 || 0).toBe(0);
    });

    it("returns category results with answer details", () => {
      const answers = {
        player1: { 0: "Cat" },
      };

      const votes = {
        0: {
          Cat: { upvotes: ["player2"], downvotes: [] },
        },
      };

      const results = calculateRoundResults(answers, votes, categories, letter);

      expect(results.categoryResults).toHaveLength(2);
      expect(results.categoryResults[0].category).toBe("Animals");
      expect(results.categoryResults[0].answers).toHaveLength(1);
      expect(results.categoryResults[0].answers[0].answer).toBe("Cat");
      expect(results.categoryResults[0].answers[0].isValid).toBe(true);
      expect(results.categoryResults[0].answers[0].isUnique).toBe(true);
    });
  });

  describe("getLeaderboard", () => {
    it("sorts players by score descending", () => {
      const scores = { p1: 10, p2: 25, p3: 15 };
      const players = [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
        { id: "p3", name: "Charlie" },
      ];

      const leaderboard = getLeaderboard(scores, players);

      expect(leaderboard[0].id).toBe("p2");
      expect(leaderboard[0].score).toBe(25);
      expect(leaderboard[1].id).toBe("p3");
      expect(leaderboard[2].id).toBe("p1");
    });

    it("includes player names in results", () => {
      const scores = { p1: 10 };
      const players = [{ id: "p1", name: "Alice" }];

      const leaderboard = getLeaderboard(scores, players);

      expect(leaderboard[0].name).toBe("Alice");
    });

    it("defaults missing scores to 0", () => {
      const scores = {};
      const players = [{ id: "p1", name: "Alice" }];

      const leaderboard = getLeaderboard(scores, players);

      expect(leaderboard[0].score).toBe(0);
    });
  });

  describe("getWinners", () => {
    it("returns single winner when no tie", () => {
      const scores = { p1: 10, p2: 25, p3: 15 };
      const players = [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
        { id: "p3", name: "Charlie" },
      ];

      const winners = getWinners(scores, players);

      expect(winners).toHaveLength(1);
      expect(winners[0].id).toBe("p2");
    });

    it("returns multiple winners when tied", () => {
      const scores = { p1: 25, p2: 25, p3: 15 };
      const players = [
        { id: "p1", name: "Alice" },
        { id: "p2", name: "Bob" },
        { id: "p3", name: "Charlie" },
      ];

      const winners = getWinners(scores, players);

      expect(winners).toHaveLength(2);
      expect(winners.map((w) => w.id)).toContain("p1");
      expect(winners.map((w) => w.id)).toContain("p2");
    });

    it("returns empty array for empty player list", () => {
      const winners = getWinners({}, []);

      expect(winners).toHaveLength(0);
    });
  });
});
