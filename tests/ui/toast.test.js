/**
 * Tests for toast.js - Toast notification component
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { createMockDocument, createMockElement } from "../mocks/dom-mock.js";

// Store original document
let originalDocument;
let mockDocument;
let toastContainer;

describe("toast", () => {
  beforeEach(async () => {
    // Save original
    originalDocument = global.document;

    // Create mock document
    mockDocument = createMockDocument();
    toastContainer = createMockElement("div");
    toastContainer.id = "toast-container";
    mockDocument._registerElement("toast-container", toastContainer);

    global.document = mockDocument;

    // Reset module to pick up new document mock
    vi.resetModules();
  });

  afterEach(() => {
    global.document = originalDocument;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("showToast", () => {
    it("creates a toast element and appends to container", async () => {
      const { showToast } = await import("../../js/ui/components/toast.js");

      showToast("Test message", "info", 3000);

      expect(toastContainer.children).toHaveLength(1);
      expect(toastContainer.children[0].tagName).toBe("DIV");
    });

    it("sets correct message text", async () => {
      const { showToast } = await import("../../js/ui/components/toast.js");

      showToast("Hello World", "info", 3000);

      expect(toastContainer.children[0].textContent).toBe("Hello World");
    });

    it("applies toast class with type", async () => {
      const { showToast } = await import("../../js/ui/components/toast.js");

      showToast("Error message", "error", 3000);

      expect(toastContainer.children[0].className).toBe("toast error");
    });

    it("defaults to info type", async () => {
      const { showToast } = await import("../../js/ui/components/toast.js");

      showToast("Default type");

      expect(toastContainer.children[0].className).toBe("toast info");
    });

    it("does nothing when toast container not found", async () => {
      mockDocument._clearElements();
      global.document = mockDocument;
      vi.resetModules();

      const { showToast } = await import("../../js/ui/components/toast.js");

      // Should not throw
      expect(() => showToast("No container")).not.toThrow();
    });

    it("removes toast after duration", async () => {
      vi.useFakeTimers();
      const { showToast } = await import("../../js/ui/components/toast.js");

      // Track if remove was called
      let removeCalled = false;
      const originalCreateElement = mockDocument.createElement;
      mockDocument.createElement = (tag) => {
        const el = originalCreateElement(tag);
        el.remove = () => {
          removeCalled = true;
        };
        el.classList = {
          add: vi.fn(),
        };
        return el;
      };

      showToast("Temporary", "info", 1000);

      // Advance past duration
      vi.advanceTimersByTime(1000);
      // Advance past removal animation (300ms)
      vi.advanceTimersByTime(300);

      expect(removeCalled).toBe(true);
    });

    it("adds removing class before actual removal", async () => {
      vi.useFakeTimers();
      const { showToast } = await import("../../js/ui/components/toast.js");

      let addedClass = null;
      const originalCreateElement = mockDocument.createElement;
      mockDocument.createElement = (tag) => {
        const el = originalCreateElement(tag);
        el.classList = {
          add: (className) => {
            addedClass = className;
          },
        };
        el.remove = vi.fn();
        return el;
      };

      showToast("Fading", "info", 500);

      vi.advanceTimersByTime(500);
      expect(addedClass).toBe("removing");
    });
  });

  describe("showSuccess", () => {
    it("shows toast with success type", async () => {
      const { showSuccess } = await import("../../js/ui/components/toast.js");

      showSuccess("Success!");

      expect(toastContainer.children[0].className).toBe("toast success");
      expect(toastContainer.children[0].textContent).toBe("Success!");
    });

    it("accepts custom duration", async () => {
      vi.useFakeTimers();
      const { showSuccess } = await import("../../js/ui/components/toast.js");

      let removeCalled = false;
      const originalCreateElement = mockDocument.createElement;
      mockDocument.createElement = (tag) => {
        const el = originalCreateElement(tag);
        el.remove = () => {
          removeCalled = true;
        };
        el.classList = { add: vi.fn() };
        return el;
      };

      showSuccess("Quick success", 500);

      vi.advanceTimersByTime(500);
      vi.advanceTimersByTime(300);

      expect(removeCalled).toBe(true);
    });
  });

  describe("showError", () => {
    it("shows toast with error type", async () => {
      const { showError } = await import("../../js/ui/components/toast.js");

      showError("Error occurred");

      expect(toastContainer.children[0].className).toBe("toast error");
      expect(toastContainer.children[0].textContent).toBe("Error occurred");
    });
  });

  describe("showWarning", () => {
    it("shows toast with warning type", async () => {
      const { showWarning } = await import("../../js/ui/components/toast.js");

      showWarning("Warning!");

      expect(toastContainer.children[0].className).toBe("toast warning");
      expect(toastContainer.children[0].textContent).toBe("Warning!");
    });
  });

  describe("multiple toasts", () => {
    it("stacks multiple toasts in container", async () => {
      const { showToast } = await import("../../js/ui/components/toast.js");

      showToast("First", "info");
      showToast("Second", "success");
      showToast("Third", "error");

      expect(toastContainer.children).toHaveLength(3);
    });

    it("maintains correct order of toasts", async () => {
      const { showToast } = await import("../../js/ui/components/toast.js");

      showToast("First", "info");
      showToast("Second", "success");

      expect(toastContainer.children[0].textContent).toBe("First");
      expect(toastContainer.children[1].textContent).toBe("Second");
    });
  });
});
