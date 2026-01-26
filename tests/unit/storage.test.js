/**
 * Tests for storage.js - localStorage utilities
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  get,
  set,
  remove,
  getUsername,
  setUsername,
  getTheme,
  setTheme,
  getCumulativeScores,
  saveCumulativeScores,
  isAvailable,
} from "../../js/utils/storage.js";

describe("storage", () => {
  beforeEach(() => {
    // Clear localStorage before each test
    global.localStorage.clear();
    // Reset console.warn mock
    vi.restoreAllMocks();
  });

  describe("get", () => {
    it("returns default value when key does not exist", () => {
      expect(get("nonexistent", "default")).toBe("default");
    });

    it("returns null as default when no default provided", () => {
      expect(get("nonexistent")).toBeNull();
    });

    it("parses JSON string values correctly", () => {
      localStorage.setItem("scattergories_test", JSON.stringify({ foo: "bar" }));
      expect(get("test")).toEqual({ foo: "bar" });
    });

    it("parses JSON number values correctly", () => {
      localStorage.setItem("scattergories_number", JSON.stringify(42));
      expect(get("number")).toBe(42);
    });

    it("parses JSON array values correctly", () => {
      localStorage.setItem("scattergories_array", JSON.stringify([1, 2, 3]));
      expect(get("array")).toEqual([1, 2, 3]);
    });

    it("parses JSON boolean values correctly", () => {
      localStorage.setItem("scattergories_bool", JSON.stringify(true));
      expect(get("bool")).toBe(true);
    });

    it("returns default value on JSON parse error", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      localStorage.setItem("scattergories_invalid", "not-valid-json{");
      expect(get("invalid", "fallback")).toBe("fallback");
      expect(warnSpy).toHaveBeenCalled();
    });

    it("uses storage prefix for keys", () => {
      localStorage.setItem("scattergories_prefixed", JSON.stringify("value"));
      expect(get("prefixed")).toBe("value");
      // Without prefix should not work
      localStorage.setItem("unprefixed", JSON.stringify("other"));
      expect(get("unprefixed")).toBeNull();
    });
  });

  describe("set", () => {
    it("stores value as JSON string with prefix", () => {
      set("mykey", { data: "test" });
      const stored = localStorage.getItem("scattergories_mykey");
      expect(stored).toBe(JSON.stringify({ data: "test" }));
    });

    it("stores string values correctly", () => {
      set("str", "hello");
      expect(JSON.parse(localStorage.getItem("scattergories_str"))).toBe("hello");
    });

    it("stores number values correctly", () => {
      set("num", 123);
      expect(JSON.parse(localStorage.getItem("scattergories_num"))).toBe(123);
    });

    it("stores array values correctly", () => {
      set("arr", [1, 2, 3]);
      expect(JSON.parse(localStorage.getItem("scattergories_arr"))).toEqual([1, 2, 3]);
    });

    it("returns true on success", () => {
      expect(set("key", "value")).toBe(true);
    });

    it("returns false and warns on error", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      // Create a circular reference that can't be stringified
      const circular = {};
      circular.self = circular;
      expect(set("circular", circular)).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("remove", () => {
    it("removes item with prefix", () => {
      localStorage.setItem("scattergories_toremove", "value");
      remove("toremove");
      expect(localStorage.getItem("scattergories_toremove")).toBeNull();
    });

    it("returns true on success", () => {
      expect(remove("anykey")).toBe(true);
    });

    it("returns true even if key does not exist", () => {
      expect(remove("nonexistent")).toBe(true);
    });
  });

  describe("getUsername", () => {
    it("returns empty string as default", () => {
      expect(getUsername()).toBe("");
    });

    it("returns stored username", () => {
      localStorage.setItem("scattergories_username", JSON.stringify("Alice"));
      expect(getUsername()).toBe("Alice");
    });
  });

  describe("setUsername", () => {
    it("stores username with correct key", () => {
      setUsername("Bob");
      expect(JSON.parse(localStorage.getItem("scattergories_username"))).toBe("Bob");
    });

    it("returns true on success", () => {
      expect(setUsername("Charlie")).toBe(true);
    });
  });

  describe("getTheme", () => {
    it("returns 'green' as default", () => {
      expect(getTheme()).toBe("green");
    });

    it("returns stored theme", () => {
      localStorage.setItem("scattergories_theme", JSON.stringify("blue"));
      expect(getTheme()).toBe("blue");
    });
  });

  describe("setTheme", () => {
    it("stores theme with correct key", () => {
      setTheme("purple");
      expect(JSON.parse(localStorage.getItem("scattergories_theme"))).toBe("purple");
    });

    it("returns true on success", () => {
      expect(setTheme("red")).toBe(true);
    });
  });

  describe("getCumulativeScores", () => {
    it("returns empty object as default", () => {
      expect(getCumulativeScores()).toEqual({});
    });

    it("returns stored scores", () => {
      const scores = { player1: 100, player2: 200 };
      localStorage.setItem("scattergories_cumulativeScores", JSON.stringify(scores));
      expect(getCumulativeScores()).toEqual(scores);
    });
  });

  describe("saveCumulativeScores", () => {
    it("stores scores object correctly", () => {
      const scores = { alice: 50, bob: 75 };
      saveCumulativeScores(scores);
      expect(JSON.parse(localStorage.getItem("scattergories_cumulativeScores"))).toEqual(scores);
    });

    it("returns true on success", () => {
      expect(saveCumulativeScores({ x: 1 })).toBe(true);
    });
  });

  describe("isAvailable", () => {
    it("returns true when localStorage is available", () => {
      expect(isAvailable()).toBe(true);
    });

    it("returns false when localStorage throws", () => {
      const originalSetItem = localStorage.setItem;
      localStorage.setItem = () => {
        throw new Error("Storage disabled");
      };
      expect(isAvailable()).toBe(false);
      localStorage.setItem = originalSetItem;
    });
  });
});
