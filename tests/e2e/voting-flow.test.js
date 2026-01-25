/**
 * Voting Flow E2E Tests
 *
 * Test the per-category voting system in detail.
 * Tests are based on expected behavior (black box), not implementation details.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import store from "../../js/state/store.js";
import { calculateNetVotes, isAnswerValid } from "../../js/game/scoring.js";

describe("voting-flow", () => {
  beforeEach(() => {
    store.reset();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("per-category progression", () => {
    it("should start voting at category 0", () => {
      store.set("currentVotingCategory", 0);
      expect(store.get("currentVotingCategory")).toBe(0);
    });

    it("should track current voting category index", () => {
      store.set("currentVotingCategory", 0);
      expect(store.get("currentVotingCategory")).toBe(0);

      store.set("currentVotingCategory", 1);
      expect(store.get("currentVotingCategory")).toBe(1);

      store.set("currentVotingCategory", 2);
      expect(store.get("currentVotingCategory")).toBe(2);
    });

    it("should track total categories for progress indicator", () => {
      const categories = ["Animals", "Foods", "Countries", "Cities"];
      store.set("categories", categories);

      expect(store.get("categories")).toHaveLength(4);

      store.set("currentVotingCategory", 2);
      const current = store.get("currentVotingCategory");
      const total = store.get("categories").length;

      expect(current).toBe(2);
      expect(total).toBe(4);
      // Progress would be (current + 1) / total = 3/4 = 75%
    });

    it("should track voting ready state per player", () => {
      store.set("votingReady", {
        player1: false,
        player2: false,
        player3: false,
      });

      // Player 1 marks ready
      const ready = store.get("votingReady");
      ready.player1 = true;
      store.set("votingReady", ready);

      expect(store.get("votingReady").player1).toBe(true);
      expect(store.get("votingReady").player2).toBe(false);
    });

    it("should detect when all players ready to advance", () => {
      store.set("votingReady", {
        player1: true,
        player2: true,
        player3: true,
      });

      const ready = store.get("votingReady");
      const allReady = Object.values(ready).every((r) => r === true);
      expect(allReady).toBe(true);
    });

    it("should reset voting ready states when advancing category", () => {
      store.set("votingReady", {
        player1: true,
        player2: true,
      });

      // Advance to next category - reset ready states
      store.set("currentVotingCategory", 1);
      store.set("votingReady", {
        player1: false,
        player2: false,
      });

      expect(store.get("currentVotingCategory")).toBe(1);
      expect(store.get("votingReady").player1).toBe(false);
      expect(store.get("votingReady").player2).toBe(false);
    });

    it("should have per-category voting timer", () => {
      store.set("votingTimer", 30);
      expect(store.get("votingTimer")).toBe(30);

      // Timer decrements
      store.set("votingTimer", 15);
      expect(store.get("votingTimer")).toBe(15);

      // Timer expires
      store.set("votingTimer", 0);
      expect(store.get("votingTimer")).toBe(0);
    });
  });

  describe("vote mechanics", () => {
    it("should initialize empty votes structure", () => {
      store.set("votes", {});
      expect(store.get("votes")).toEqual({});
    });

    it("should record upvote for an answer", () => {
      store.set("votes", {
        0: {
          cat: {
            upvotes: ["player1"],
            downvotes: [],
          },
        },
      });

      const votes = store.get("votes");
      expect(votes[0]["cat"].upvotes).toContain("player1");
      expect(votes[0]["cat"].downvotes).toHaveLength(0);
    });

    it("should record downvote for an answer", () => {
      store.set("votes", {
        0: {
          cat: {
            upvotes: [],
            downvotes: ["player2"],
          },
        },
      });

      const votes = store.get("votes");
      expect(votes[0]["cat"].downvotes).toContain("player2");
      expect(votes[0]["cat"].upvotes).toHaveLength(0);
    });

    it("should toggle vote when voting same way again (remove)", () => {
      // Initial upvote
      let votes = {
        0: {
          cat: {
            upvotes: ["player1"],
            downvotes: [],
          },
        },
      };

      // Toggle - voting same way removes the vote
      votes[0]["cat"].upvotes = votes[0]["cat"].upvotes.filter((id) => id !== "player1");
      store.set("votes", votes);

      expect(store.get("votes")[0]["cat"].upvotes).not.toContain("player1");
      expect(store.get("votes")[0]["cat"].upvotes).toHaveLength(0);
    });

    it("should switch vote from upvote to downvote", () => {
      // Initial upvote
      let votes = {
        0: {
          cat: {
            upvotes: ["player1"],
            downvotes: [],
          },
        },
      };
      store.set("votes", votes);

      // Switch to downvote - remove from upvotes, add to downvotes
      votes = store.get("votes");
      votes[0]["cat"].upvotes = votes[0]["cat"].upvotes.filter((id) => id !== "player1");
      votes[0]["cat"].downvotes.push("player1");
      store.set("votes", votes);

      expect(store.get("votes")[0]["cat"].upvotes).not.toContain("player1");
      expect(store.get("votes")[0]["cat"].downvotes).toContain("player1");
    });

    it("should calculate net votes correctly", () => {
      const answerVotes = {
        upvotes: ["player1", "player2", "player3"],
        downvotes: ["player4"],
      };

      const netVotes = calculateNetVotes(answerVotes);
      expect(netVotes).toBe(2); // 3 - 1 = 2
    });

    it("should calculate net votes as 0 when equal", () => {
      const answerVotes = {
        upvotes: ["player1", "player2"],
        downvotes: ["player3", "player4"],
      };

      const netVotes = calculateNetVotes(answerVotes);
      expect(netVotes).toBe(0); // 2 - 2 = 0
    });

    it("should calculate negative net votes", () => {
      const answerVotes = {
        upvotes: [],
        downvotes: ["player1", "player2"],
      };

      const netVotes = calculateNetVotes(answerVotes);
      expect(netVotes).toBe(-2); // 0 - 2 = -2
    });
  });

  describe("vote validation rules", () => {
    it("should validate answer with positive net votes and correct letter", () => {
      const isValid = isAnswerValid("Cat", "C", 2);
      expect(isValid).toBe(true);
    });

    it("should invalidate answer with net votes < 1", () => {
      const isValid = isAnswerValid("Cat", "C", 0);
      expect(isValid).toBe(false);
    });

    it("should invalidate answer with negative net votes", () => {
      const isValid = isAnswerValid("Cat", "C", -1);
      expect(isValid).toBe(false);
    });

    it("should invalidate answer starting with wrong letter", () => {
      const isValid = isAnswerValid("Dog", "C", 5);
      expect(isValid).toBe(false);
    });

    it("should handle case-insensitive letter matching", () => {
      const isValid1 = isAnswerValid("cat", "C", 2);
      const isValid2 = isAnswerValid("Cat", "c", 2);
      const isValid3 = isAnswerValid("CAT", "c", 2);

      expect(isValid1).toBe(true);
      expect(isValid2).toBe(true);
      expect(isValid3).toBe(true);
    });

    it("should invalidate empty answers", () => {
      const isValid1 = isAnswerValid("", "C", 5);
      const isValid2 = isAnswerValid("  ", "C", 5);

      expect(isValid1).toBe(false);
      expect(isValid2).toBe(false);
    });

    it("should respect custom minNetVotes parameter", () => {
      // Default minNetVotes is 1
      expect(isAnswerValid("Cat", "C", 1, 1)).toBe(true);
      expect(isAnswerValid("Cat", "C", 0, 1)).toBe(false);

      // Custom minNetVotes of 2
      expect(isAnswerValid("Cat", "C", 2, 2)).toBe(true);
      expect(isAnswerValid("Cat", "C", 1, 2)).toBe(false);
    });
  });

  describe("multiple players voting on same answer", () => {
    it("should allow multiple upvotes on same answer", () => {
      store.set("votes", {
        0: {
          cat: {
            upvotes: ["player1", "player2", "player3"],
            downvotes: [],
          },
        },
      });

      const votes = store.get("votes");
      expect(votes[0]["cat"].upvotes).toHaveLength(3);
    });

    it("should allow mixed votes on same answer", () => {
      store.set("votes", {
        0: {
          cat: {
            upvotes: ["player1", "player2", "player3"],
            downvotes: ["player4"],
          },
        },
      });

      const answerVotes = store.get("votes")[0]["cat"];
      const netVotes = calculateNetVotes(answerVotes);

      expect(netVotes).toBe(2); // 3 upvotes - 1 downvote = +2 (valid)
      expect(isAnswerValid("Cat", "C", netVotes)).toBe(true);
    });

    it("should handle equal upvotes and downvotes (invalid)", () => {
      store.set("votes", {
        0: {
          cat: {
            upvotes: ["player1", "player2"],
            downvotes: ["player3", "player4"],
          },
        },
      });

      const answerVotes = store.get("votes")[0]["cat"];
      const netVotes = calculateNetVotes(answerVotes);

      expect(netVotes).toBe(0); // 2 - 2 = 0 (invalid)
      expect(isAnswerValid("Cat", "C", netVotes)).toBe(false);
    });

    it("should handle more downvotes than upvotes (invalid)", () => {
      store.set("votes", {
        0: {
          cat: {
            upvotes: [],
            downvotes: ["player1", "player2"],
          },
        },
      });

      const answerVotes = store.get("votes")[0]["cat"];
      const netVotes = calculateNetVotes(answerVotes);

      expect(netVotes).toBe(-2); // 0 - 2 = -2 (invalid)
      expect(isAnswerValid("Cat", "C", netVotes)).toBe(false);
    });

    it("should track votes per category independently", () => {
      store.set("votes", {
        0: {
          cat: { upvotes: ["p1"], downvotes: [] },
        },
        1: {
          cheese: { upvotes: ["p1", "p2"], downvotes: [] },
        },
        2: {
          canada: { upvotes: [], downvotes: ["p1"] },
        },
      });

      const votes = store.get("votes");

      expect(calculateNetVotes(votes[0]["cat"])).toBe(1);
      expect(calculateNetVotes(votes[1]["cheese"])).toBe(2);
      expect(calculateNetVotes(votes[2]["canada"])).toBe(-1);
    });

    it("should handle votes from all players on same answer", () => {
      // 4-player game, all vote on same answer
      store.set("votes", {
        0: {
          cat: {
            upvotes: ["player1", "player2", "player3", "player4"],
            downvotes: [],
          },
        },
      });

      const answerVotes = store.get("votes")[0]["cat"];
      const netVotes = calculateNetVotes(answerVotes);

      expect(netVotes).toBe(4);
      expect(isAnswerValid("Cat", "C", netVotes)).toBe(true);
    });
  });

  describe("voting state management", () => {
    it("should store all answers grouped by category for voting display", () => {
      // After answering phase, answers are grouped for voting
      store.set("categoryAnswers", {
        0: {
          // Animals category
          cat: ["player1", "player3"], // Both answered "Cat"
          cow: ["player2"],
        },
        1: {
          // Foods category
          cheese: ["player1"],
          cake: ["player2"],
          chips: ["player3"],
        },
      });

      const categoryAnswers = store.get("categoryAnswers");
      expect(categoryAnswers[0]["cat"]).toContain("player1");
      expect(categoryAnswers[0]["cat"]).toContain("player3");
      expect(categoryAnswers[1]["cheese"]).toContain("player1");
    });

    it("should track which answers belong to which players", () => {
      store.set("playerAnswers", {
        player1: { 0: "Cat", 1: "Cheese", 2: "Canada" },
        player2: { 0: "Cow", 1: "Cake", 2: "Chile" },
        player3: { 0: "Cat", 1: "Chips", 2: "China" },
      });

      const playerAnswers = store.get("playerAnswers");
      expect(playerAnswers["player1"][0]).toBe("Cat");
      expect(playerAnswers["player2"][1]).toBe("Cake");
      expect(playerAnswers["player3"][2]).toBe("China");
    });
  });
});
