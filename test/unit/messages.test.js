"use strict";

const assert = require("node:assert/strict");
const { msg } = require("../../lib/messages");

describe("messages", () => {
  describe("msg()", () => {
    it("returns english humidity_low message", () => {
      const result = msg("humidity_low", "en", "Ficus", 25, 40);
      assert.ok(result.includes("Ficus"));
      assert.ok(result.includes("25%"));
      assert.ok(result.includes("40%"));
      assert.ok(result.includes("💧"));
    });

    it("returns german humidity_low message", () => {
      const result = msg("humidity_low", "de", "Ficus", 25, 40);
      assert.ok(result.includes("Gießen"));
    });

    it("returns russian humidity_low message", () => {
      const result = msg("humidity_low", "ru", "Ficus", 25, 40);
      assert.ok(result.includes("поливать"));
    });

    it("falls back to english for unknown language", () => {
      const result = msg("humidity_low", "xx", "Ficus", 25, 40);
      assert.ok(result.includes("water"));
    });

    it("returns [key] for unknown message key", () => {
      const result = msg("unknown_key", "en");
      assert.equal(result, "[unknown_key]");
    });

    it("returns report_header without args", () => {
      const result = msg("report_header", "en");
      assert.ok(result.includes("Daily Plant Report"));
    });

    it("returns weekly_report_header in german", () => {
      const result = msg("weekly_report_header", "de");
      assert.ok(result.includes("Wöchentlicher"));
    });

    it("returns offline message with hours", () => {
      const result = msg("offline", "en", "Cactus (Kitchen)", 5);
      assert.ok(result.includes("5h"));
      assert.ok(result.includes("Cactus"));
    });

    it("returns battery_low message", () => {
      const result = msg("battery_low", "en", "Orchid", 10, 20);
      assert.ok(result.includes("10%"));
      assert.ok(result.includes("🔋"));
    });

    it("returns temp_high message", () => {
      const result = msg("temp_high", "en", "Palm", 35, 27);
      assert.ok(result.includes("35°C"));
      assert.ok(result.includes("🥵"));
    });

    it("returns temp_low message", () => {
      const result = msg("temp_low", "en", "Fern", 10, 15);
      assert.ok(result.includes("10°C"));
      assert.ok(result.includes("🥶"));
    });

    it("returns humidity_high message", () => {
      const result = msg("humidity_high", "en", "Ficus", 85, 70);
      assert.ok(result.includes("85%"));
      assert.ok(result.includes("💦"));
    });
  });
});
