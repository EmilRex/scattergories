/**
 * Tests for timer.js - Timer formatting and urgency levels
 */

import { describe, it, expect } from "vitest";
import { formatTime, getTimerUrgency } from "../../js/game/timer.js";

describe("timer", () => {
  describe("formatTime", () => {
    it("formats 0 seconds as 0:00", () => {
      expect(formatTime(0)).toBe("0:00");
    });

    it("formats seconds under a minute correctly", () => {
      expect(formatTime(5)).toBe("0:05");
      expect(formatTime(30)).toBe("0:30");
      expect(formatTime(59)).toBe("0:59");
    });

    it("formats exact minutes correctly", () => {
      expect(formatTime(60)).toBe("1:00");
      expect(formatTime(120)).toBe("2:00");
      expect(formatTime(180)).toBe("3:00");
    });

    it("formats minutes and seconds correctly", () => {
      expect(formatTime(65)).toBe("1:05");
      expect(formatTime(90)).toBe("1:30");
      expect(formatTime(125)).toBe("2:05");
      expect(formatTime(301)).toBe("5:01");
    });

    it("pads seconds with leading zero", () => {
      expect(formatTime(61)).toBe("1:01");
      expect(formatTime(69)).toBe("1:09");
      expect(formatTime(1)).toBe("0:01");
    });
  });

  describe("getTimerUrgency", () => {
    it('returns "critical" for 10 seconds or less', () => {
      expect(getTimerUrgency(10)).toBe("critical");
      expect(getTimerUrgency(5)).toBe("critical");
      expect(getTimerUrgency(1)).toBe("critical");
      expect(getTimerUrgency(0)).toBe("critical");
    });

    it('returns "warning" for 11-30 seconds', () => {
      expect(getTimerUrgency(30)).toBe("warning");
      expect(getTimerUrgency(20)).toBe("warning");
      expect(getTimerUrgency(11)).toBe("warning");
    });

    it('returns "normal" for more than 30 seconds', () => {
      expect(getTimerUrgency(31)).toBe("normal");
      expect(getTimerUrgency(60)).toBe("normal");
      expect(getTimerUrgency(180)).toBe("normal");
    });
  });
});
