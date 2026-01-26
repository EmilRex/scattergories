/**
 * Tests for url.js - URL utilities for game ID handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

describe("url", () => {
  let urlModule;

  beforeEach(async () => {
    // Reset modules before each test to pick up fresh window state
    vi.resetModules();

    // Create a fresh window mock
    global.window = {
      location: {
        href: "http://localhost:3000",
        origin: "http://localhost:3000",
        pathname: "/",
        search: "",
        hash: "",
      },
      history: {
        replaceState: vi.fn(),
        pushState: vi.fn(),
      },
    };

    // Re-import the module with fresh window
    urlModule = await import("../../js/utils/url.js");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("generateGameId", () => {
    it("generates a 6-character ID", () => {
      const id = urlModule.generateGameId();
      expect(id).toHaveLength(6);
    });

    it("only uses valid characters (no I, O, 0, 1)", () => {
      const validChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      // Generate multiple IDs to test randomness
      for (let i = 0; i < 100; i++) {
        const id = urlModule.generateGameId();
        for (const char of id) {
          expect(validChars).toContain(char);
        }
      }
    });

    it("does not contain confusing characters", () => {
      const confusingChars = ["I", "O", "0", "1"];
      // Generate multiple IDs to ensure no confusing chars
      for (let i = 0; i < 100; i++) {
        const id = urlModule.generateGameId();
        for (const char of confusingChars) {
          expect(id).not.toContain(char);
        }
      }
    });

    it("generates different IDs on subsequent calls", () => {
      const ids = new Set();
      for (let i = 0; i < 50; i++) {
        ids.add(urlModule.generateGameId());
      }
      // Should have many unique IDs (allow some collision chance)
      expect(ids.size).toBeGreaterThan(40);
    });
  });

  describe("getGameIdFromUrl", () => {
    it("returns game ID from query parameter", async () => {
      vi.resetModules();
      global.window.location.search = "?game=ABC123";
      const mod = await import("../../js/utils/url.js");
      expect(mod.getGameIdFromUrl()).toBe("ABC123");
    });

    it("returns null when no game parameter", () => {
      expect(urlModule.getGameIdFromUrl()).toBeNull();
    });

    it("returns null when other parameters exist but not game", async () => {
      vi.resetModules();
      global.window.location.search = "?foo=bar&baz=qux";
      const mod = await import("../../js/utils/url.js");
      expect(mod.getGameIdFromUrl()).toBeNull();
    });

    it("handles multiple query parameters", async () => {
      vi.resetModules();
      global.window.location.search = "?other=value&game=XYZ789&another=param";
      const mod = await import("../../js/utils/url.js");
      expect(mod.getGameIdFromUrl()).toBe("XYZ789");
    });
  });

  describe("setGameIdInUrl", () => {
    it("calls history.replaceState with game ID", () => {
      urlModule.setGameIdInUrl("TEST01");
      expect(window.history.replaceState).toHaveBeenCalled();
      const call = window.history.replaceState.mock.calls[0];
      expect(call[2]).toContain("game=TEST01");
    });

    it("preserves existing query parameters", async () => {
      vi.resetModules();
      global.window.location.href = "http://localhost:3000?existing=param";
      global.window.location.search = "?existing=param";
      const mod = await import("../../js/utils/url.js");

      mod.setGameIdInUrl("GAME01");
      const call = window.history.replaceState.mock.calls[0];
      expect(call[2]).toContain("existing=param");
      expect(call[2]).toContain("game=GAME01");
    });
  });

  describe("removeGameIdFromUrl", () => {
    it("calls history.replaceState to remove game ID", async () => {
      vi.resetModules();
      global.window.location.href = "http://localhost:3000?game=ABC123";
      global.window.location.search = "?game=ABC123";
      const mod = await import("../../js/utils/url.js");

      mod.removeGameIdFromUrl();
      expect(window.history.replaceState).toHaveBeenCalled();
      const call = window.history.replaceState.mock.calls[0];
      expect(call[2]).not.toContain("game=");
    });

    it("preserves other query parameters when removing game", async () => {
      vi.resetModules();
      global.window.location.href = "http://localhost:3000?other=val&game=ABC123";
      global.window.location.search = "?other=val&game=ABC123";
      const mod = await import("../../js/utils/url.js");

      mod.removeGameIdFromUrl();
      const call = window.history.replaceState.mock.calls[0];
      expect(call[2]).toContain("other=val");
      expect(call[2]).not.toContain("game=");
    });
  });

  describe("generateGameUrl", () => {
    it("generates full URL with game ID", () => {
      const url = urlModule.generateGameUrl("GAME01");
      expect(url).toBe("http://localhost:3000/?game=GAME01");
    });

    it("clears existing hash from URL", async () => {
      vi.resetModules();
      global.window.location.href = "http://localhost:3000#somehash";
      global.window.location.hash = "#somehash";
      const mod = await import("../../js/utils/url.js");

      const url = mod.generateGameUrl("GAME02");
      expect(url).not.toContain("#somehash");
      expect(url).toContain("game=GAME02");
    });

    it("includes origin in generated URL", async () => {
      vi.resetModules();
      global.window.location.href = "https://example.com/path";
      global.window.location.origin = "https://example.com";
      const mod = await import("../../js/utils/url.js");

      const url = mod.generateGameUrl("TEST99");
      expect(url).toContain("https://example.com");
    });
  });

  describe("copyGameUrlToClipboard", () => {
    it("copies URL to clipboard using navigator.clipboard", async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(global, "navigator", {
        value: { clipboard: { writeText: writeTextMock } },
        writable: true,
        configurable: true,
      });

      const result = await urlModule.copyGameUrlToClipboard("COPY01");
      expect(result).toBe(true);
      expect(writeTextMock).toHaveBeenCalledWith(expect.stringContaining("game=COPY01"));
    });

    it("returns true on successful copy", async () => {
      Object.defineProperty(global, "navigator", {
        value: { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } },
        writable: true,
        configurable: true,
      });

      const result = await urlModule.copyGameUrlToClipboard("SUCCESS");
      expect(result).toBe(true);
    });

    it("uses fallback when clipboard API fails", async () => {
      Object.defineProperty(global, "navigator", {
        value: { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Not allowed")) } },
        writable: true,
        configurable: true,
      });

      const selectMock = vi.fn();
      global.document = {
        createElement: vi.fn(() => ({
          value: "",
          style: {},
          select: selectMock,
        })),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: vi.fn().mockReturnValue(true),
      };

      const result = await urlModule.copyGameUrlToClipboard("FALLBACK");
      expect(result).toBe(true);
      expect(document.createElement).toHaveBeenCalledWith("textarea");
      expect(document.execCommand).toHaveBeenCalledWith("copy");
    });

    it("returns false when both methods fail", async () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      Object.defineProperty(global, "navigator", {
        value: { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Not allowed")) } },
        writable: true,
        configurable: true,
      });

      global.document = {
        createElement: vi.fn(() => ({
          value: "",
          style: {},
          select: vi.fn(),
        })),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn(),
        },
        execCommand: vi.fn(() => {
          throw new Error("execCommand failed");
        }),
      };

      const result = await urlModule.copyGameUrlToClipboard("FAIL");
      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
    });
  });

  describe("getHash", () => {
    it("returns hash without # symbol", async () => {
      vi.resetModules();
      global.window.location.hash = "#lobby";
      const mod = await import("../../js/utils/url.js");
      expect(mod.getHash()).toBe("lobby");
    });

    it("returns empty string when no hash", () => {
      expect(urlModule.getHash()).toBe("");
    });

    it("returns empty string for hash with only #", async () => {
      vi.resetModules();
      global.window.location.hash = "#";
      const mod = await import("../../js/utils/url.js");
      expect(mod.getHash()).toBe("");
    });

    it("handles complex hash values", async () => {
      vi.resetModules();
      global.window.location.hash = "#game/round/1";
      const mod = await import("../../js/utils/url.js");
      expect(mod.getHash()).toBe("game/round/1");
    });
  });

  describe("setHash", () => {
    it("sets the window location hash", () => {
      urlModule.setHash("newscreen");
      expect(window.location.hash).toBe("newscreen");
    });

    it("can set empty hash", () => {
      urlModule.setHash("");
      expect(window.location.hash).toBe("");
    });
  });
});
