"use strict";

const assert = require("node:assert/strict");
const NotificationManager = require("../../lib/notification-manager");

// ── Minimal adapter mock ──────────────────────────────────────────────────────
function makeAdapter(configOverrides = {}) {
  const config = {
    telegramInstance: "0",
    telegramUsers: "user1",
    maxMessagesPerDay: 5,
    repeatInterval: 60,
    nightModeEnabled: false,
    nightModeStart: "22:00",
    nightModeEnd: "08:00",
    ...configOverrides,
  };

  const sentMessages = [];

  return {
    config,
    sentMessages,
    log: {
      debug: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
    },
    sendTo(target, command, payload, callback) {
      sentMessages.push({ target, command, payload });
      callback({});
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("NotificationManager", () => {
  describe("send()", () => {
    it("sends a message and increments counter", async () => {
      const adapter = makeAdapter();
      const nm = new NotificationManager(adapter, "en");

      const result = await nm.send("Hello plant!");

      assert.equal(result, true);
      assert.equal(nm.sentToday, 1);
      assert.equal(adapter.sentMessages.length, 1);
      assert.equal(adapter.sentMessages[0].target, "telegram.0");
      assert.equal(adapter.sentMessages[0].payload.text, "Hello plant!");
    });

    it("respects daily limit", async () => {
      const adapter = makeAdapter({ maxMessagesPerDay: 2 });
      const nm = new NotificationManager(adapter, "en");

      await nm.send("msg 1");
      await nm.send("msg 2");
      const result = await nm.send("msg 3"); // should be blocked

      assert.equal(result, false);
      assert.equal(nm.sentToday, 2);
      assert.equal(adapter.sentMessages.length, 2);
    });

    it("respects cooldown", async () => {
      const adapter = makeAdapter({ repeatInterval: 60 });
      const nm = new NotificationManager(adapter, "en");

      await nm.send("first", "plant1:humidity_low");
      const result = await nm.send("second", "plant1:humidity_low"); // in cooldown

      assert.equal(result, false);
      assert.equal(adapter.sentMessages.length, 1);
    });

    it("sends again after cooldown expires", async () => {
      const adapter = makeAdapter({ repeatInterval: 1 });
      const nm = new NotificationManager(adapter, "en");

      await nm.send("first", "plant1:humidity_low");
      // Manually expire cooldown
      nm.cooldowns["plant1:humidity_low"] = Date.now() - 2 * 60 * 1000;

      const result = await nm.send("second", "plant1:humidity_low");
      assert.equal(result, true);
      assert.equal(adapter.sentMessages.length, 2);
    });

    it("no cooldown when repeatInterval=0", async () => {
      const adapter = makeAdapter({ repeatInterval: 0 });
      const nm = new NotificationManager(adapter, "en");

      await nm.send("first", "plant1:humidity_low");
      const result = await nm.send("second", "plant1:humidity_low");

      // repeatInterval=0 means no repeat → always in cooldown after first
      assert.equal(result, false);
    });

    it("force=true bypasses night mode and daily limit", async () => {
      const adapter = makeAdapter({
        maxMessagesPerDay: 1,
        nightModeEnabled: true,
        nightModeStart: "00:00",
        nightModeEnd: "23:59",
      });
      const nm = new NotificationManager(adapter, "en");
      await nm.send("normal"); // uses up daily limit

      const result = await nm.send("forced", null, true);
      assert.equal(result, true);
    });

    it("blocks during night mode", async () => {
      const adapter = makeAdapter({
        nightModeEnabled: true,
        nightModeStart: "00:00",
        nightModeEnd: "23:59",
      });
      const nm = new NotificationManager(adapter, "en");

      const result = await nm.send("night message");
      assert.equal(result, false);
      assert.equal(adapter.sentMessages.length, 0);
    });

    it("sends to multiple users", async () => {
      const adapter = makeAdapter({ telegramUsers: "alice,bob" });
      const nm = new NotificationManager(adapter, "en");

      await nm.send("hello");
      assert.equal(adapter.sentMessages[0].payload.user, "alice, bob");
    });

    it("normalizes telegramInstance with dot notation", async () => {
      const adapter = makeAdapter({ telegramInstance: "telegram.1" });
      const nm = new NotificationManager(adapter, "en");

      await nm.send("test");
      assert.equal(adapter.sentMessages[0].target, "telegram.1");
    });

    it("resets daily counter on new day", async () => {
      const adapter = makeAdapter({ maxMessagesPerDay: 1 });
      const nm = new NotificationManager(adapter, "en");

      await nm.send("today");
      assert.equal(nm.sentToday, 1);

      // Simulate day change
      nm.lastResetDate = "Mon Jan 01 2000";
      nm._checkDailyReset();

      assert.equal(nm.sentToday, 0);
    });
  });

  describe("sendDailyReport()", () => {
    it("sends a daily report with all plant data", async () => {
      const adapter = makeAdapter();
      const nm = new NotificationManager(adapter, "en");

      const plantStates = [
        { plant: { name: "Ficus", location: "Living room" }, humidity: 45, temperature: 22, battery: 80 },
        { plant: { name: "Cactus", location: "Kitchen" }, humidity: 15, temperature: 25, battery: null },
      ];

      await nm.sendDailyReport(plantStates);

      assert.equal(adapter.sentMessages.length, 1);
      const text = adapter.sentMessages[0].payload.text;
      assert.ok(text.includes("Daily Plant Report"));
      assert.ok(text.includes("Ficus"));
      assert.ok(text.includes("45%"));
      assert.ok(text.includes("22°C"));
      assert.ok(text.includes("Cactus"));
      assert.ok(text.includes("n/a")); // null battery
    });

    it("does nothing with empty plant list", async () => {
      const adapter = makeAdapter();
      const nm = new NotificationManager(adapter, "en");

      await nm.sendDailyReport([]);
      assert.equal(adapter.sentMessages.length, 0);
    });
  });

  describe("sendWeeklyReport()", () => {
    it("sends a weekly report with correct header", async () => {
      const adapter = makeAdapter();
      const nm = new NotificationManager(adapter, "de");

      const plantStates = [
        { plant: { name: "Monstera", location: "Office" }, humidity: 55, temperature: 21, battery: 60 },
      ];

      await nm.sendWeeklyReport(plantStates);

      const text = adapter.sentMessages[0].payload.text;
      assert.ok(text.includes("Wöchentlicher Pflanzenbericht"));
      assert.ok(text.includes("Monstera"));
    });
  });

  describe("resetDailyCounter()", () => {
    it("resets counter and date", () => {
      const adapter = makeAdapter();
      const nm = new NotificationManager(adapter, "en");
      nm.sentToday = 5;

      nm.resetDailyCounter();

      assert.equal(nm.sentToday, 0);
      assert.equal(nm.lastResetDate, new Date().toDateString());
    });
  });
});
