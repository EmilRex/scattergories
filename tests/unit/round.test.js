/**
 * Tests for round.js - Letter selection and answer normalization
 */

import { describe, it, expect } from "vitest";
import {
  selectLetter,
  normalizeAnswer,
  startsWithLetter,
  areAnswersDuplicate,
  groupDuplicateAnswers,
} from "../../js/game/round.js";
import { AVAILABLE_LETTERS } from "../../js/config.js";

describe("round", () => {
  describe("selectLetter", () => {
    it("returns a letter from available letters", () => {
      const letter = selectLetter([]);
      expect(AVAILABLE_LETTERS).toContain(letter);
    });

    it("does not return already used letters", () => {
      const usedLetters = ["A", "B", "C", "D", "E"];

      // Run multiple times to be confident
      for (let i = 0; i < 20; i++) {
        const letter = selectLetter(usedLetters);
        expect(usedLetters).not.toContain(letter);
      }
    });

    it("returns a letter even when all are used (fallback)", () => {
      const usedLetters = [...AVAILABLE_LETTERS];
      const letter = selectLetter(usedLetters);
      expect(letter).toBeTruthy();
      expect(typeof letter).toBe("string");
    });

    it("uses all available letters when none are used", () => {
      const selectedLetters = new Set();

      // Try to get all unique letters
      for (let i = 0; i < AVAILABLE_LETTERS.length; i++) {
        const usedSoFar = Array.from(selectedLetters);
        const letter = selectLetter(usedSoFar);
        selectedLetters.add(letter);
      }

      // Should have covered most letters
      expect(selectedLetters.size).toBe(AVAILABLE_LETTERS.length);
    });
  });

  describe("normalizeAnswer", () => {
    it("returns empty string for null/undefined", () => {
      expect(normalizeAnswer(null)).toBe("");
      expect(normalizeAnswer(undefined)).toBe("");
      expect(normalizeAnswer("")).toBe("");
    });

    it("converts to lowercase", () => {
      expect(normalizeAnswer("HELLO")).toBe("hello");
      expect(normalizeAnswer("HeLLo WoRLD")).toBe("hello world");
    });

    it("trims whitespace", () => {
      expect(normalizeAnswer("  hello  ")).toBe("hello");
      expect(normalizeAnswer("\thello\n")).toBe("hello");
    });

    it('removes "a " prefix', () => {
      expect(normalizeAnswer("a cat")).toBe("cat");
      expect(normalizeAnswer("A Dog")).toBe("dog");
    });

    it('removes "an " prefix', () => {
      expect(normalizeAnswer("an apple")).toBe("apple");
      expect(normalizeAnswer("An Orange")).toBe("orange");
    });

    it('removes "the " prefix', () => {
      expect(normalizeAnswer("the sun")).toBe("sun");
      expect(normalizeAnswer("The Moon")).toBe("moon");
    });

    it("does not remove partial prefix matches", () => {
      expect(normalizeAnswer("ant")).toBe("ant");
      expect(normalizeAnswer("theater")).toBe("theater");
      expect(normalizeAnswer("anatomy")).toBe("anatomy");
    });

    it("handles multiple spaces after normalization", () => {
      expect(normalizeAnswer("a   cat")).toBe("cat");
    });
  });

  describe("startsWithLetter", () => {
    it("returns true for matching starting letter", () => {
      expect(startsWithLetter("Cat", "C")).toBe(true);
      expect(startsWithLetter("cat", "C")).toBe(true);
      expect(startsWithLetter("CAT", "c")).toBe(true);
    });

    it("returns false for non-matching starting letter", () => {
      expect(startsWithLetter("Dog", "C")).toBe(false);
      expect(startsWithLetter("cat", "D")).toBe(false);
    });

    it("handles articles correctly (checks after normalization)", () => {
      expect(startsWithLetter("a cat", "C")).toBe(true);
      expect(startsWithLetter("the dog", "D")).toBe(true);
      expect(startsWithLetter("an apple", "A")).toBe(true);
    });

    it("returns false for empty answers", () => {
      expect(startsWithLetter("", "C")).toBe(false);
      expect(startsWithLetter("   ", "C")).toBe(false);
    });

    it("handles article prefix with trailing space", () => {
      // "a " with trailing space - after trim, becomes "a" which starts with A
      // The prefix "a " is not matched because normalized "a" doesn't start with "a "
      expect(startsWithLetter("a ", "A")).toBe(true);
    });

    it("treats words without trailing space as regular words", () => {
      // "the" alone (without space) is not recognized as an article prefix
      // so it's treated as the word "the" starting with 'T'
      expect(startsWithLetter("the", "T")).toBe(true);
      expect(startsWithLetter("a", "A")).toBe(true);
    });
  });

  describe("areAnswersDuplicate", () => {
    it("detects identical answers", () => {
      expect(areAnswersDuplicate("cat", "cat")).toBe(true);
    });

    it("detects case-insensitive duplicates", () => {
      expect(areAnswersDuplicate("Cat", "CAT")).toBe(true);
      expect(areAnswersDuplicate("HELLO", "hello")).toBe(true);
    });

    it("detects duplicates with different articles", () => {
      expect(areAnswersDuplicate("a cat", "the cat")).toBe(true);
      expect(areAnswersDuplicate("an apple", "apple")).toBe(true);
    });

    it("detects duplicates with different whitespace", () => {
      expect(areAnswersDuplicate("  cat  ", "cat")).toBe(true);
    });

    it("returns false for different answers", () => {
      expect(areAnswersDuplicate("cat", "dog")).toBe(false);
      expect(areAnswersDuplicate("cat", "cats")).toBe(false);
    });
  });

  describe("groupDuplicateAnswers", () => {
    it("groups identical answers together", () => {
      const answers = {
        p1: "cat",
        p2: "cat",
        p3: "dog",
      };

      const groups = groupDuplicateAnswers(answers);

      expect(groups["cat"]).toEqual(["p1", "p2"]);
      expect(groups["dog"]).toEqual(["p3"]);
    });

    it("groups case-insensitive matches", () => {
      const answers = {
        p1: "Cat",
        p2: "CAT",
        p3: "cat",
      };

      const groups = groupDuplicateAnswers(answers);

      expect(groups["cat"]).toEqual(["p1", "p2", "p3"]);
    });

    it("groups answers with different articles", () => {
      const answers = {
        p1: "a cat",
        p2: "the cat",
        p3: "cat",
      };

      const groups = groupDuplicateAnswers(answers);

      expect(groups["cat"]).toEqual(["p1", "p2", "p3"]);
    });

    it("ignores empty answers", () => {
      const answers = {
        p1: "cat",
        p2: "",
        p3: "   ",
      };

      const groups = groupDuplicateAnswers(answers);

      expect(groups["cat"]).toEqual(["p1"]);
      expect(Object.keys(groups)).toHaveLength(1);
    });

    it("handles empty input", () => {
      const groups = groupDuplicateAnswers({});
      expect(groups).toEqual({});
    });
  });
});
