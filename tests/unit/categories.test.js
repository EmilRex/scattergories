/**
 * Tests for categories.js - Category pool selection
 */

import { describe, it, expect } from "vitest";
import { getCategories, getAllCategories, getCategoryCount } from "../../js/game/categories.js";

describe("categories", () => {
  describe("getCategories", () => {
    it("returns the requested number of categories", () => {
      expect(getCategories(6)).toHaveLength(6);
      expect(getCategories(12)).toHaveLength(12);
      expect(getCategories(1)).toHaveLength(1);
    });

    it("returns unique categories (no duplicates)", () => {
      const categories = getCategories(12);
      const unique = new Set(categories);
      expect(unique.size).toBe(12);
    });

    it("uses default count of 12 when not specified", () => {
      const categories = getCategories();
      expect(categories).toHaveLength(12);
    });

    it("returns different categories on multiple calls (randomized)", () => {
      const results = [];

      for (let i = 0; i < 5; i++) {
        results.push(getCategories(6).join(","));
      }

      // At least some should be different
      const unique = new Set(results);
      expect(unique.size).toBeGreaterThan(1);
    });

    it("returns categories from the category pool", () => {
      const allCategories = getAllCategories();
      const selected = getCategories(6);

      for (const category of selected) {
        expect(allCategories).toContain(category);
      }
    });
  });

  describe("getAllCategories", () => {
    it("returns all available categories", () => {
      const all = getAllCategories();
      expect(all.length).toBeGreaterThan(0);
      expect(Array.isArray(all)).toBe(true);
    });

    it("returns a copy (not the original array)", () => {
      const all1 = getAllCategories();
      const all2 = getAllCategories();

      // Should be equal content
      expect(all1).toEqual(all2);

      // But not the same reference
      all1.push("Test Category");
      expect(all2).not.toContain("Test Category");
    });
  });

  describe("getCategoryCount", () => {
    it("returns the total number of available categories", () => {
      const count = getCategoryCount();
      const all = getAllCategories();

      expect(count).toBe(all.length);
    });

    it("returns a positive number", () => {
      expect(getCategoryCount()).toBeGreaterThan(0);
    });
  });
});
