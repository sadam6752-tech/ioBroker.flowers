"use strict";

const assert = require("node:assert/strict");
const MonitorService = require("../../lib/monitor-service");

// ── Mocks ─────────────────────────────────────────────────────────────────────
function makeAdapter(configOverrides = {}) {
  const config = {
    plants: [],
    customProfiles: [],
    offlineThreshold: 3,
    wateringDuration: 1,
    ...configOverrides,
  };

  const states = {};
  const createdObjects = {};
  const setStates = [];
  const sentMessages = [];
  const timeouts = [];

  return {
    config,
    states,
    createdObjects,
    setStates,
    sentMessages,
    timeouts,
    log: { debug: () => {}, info: () => {}, warn: () => {}, error: () => {} },
    async subscribeForeignStatesAsync() {},
    async unsubscribeForeignStatesAsync() {},
    async getForeignStateAsync(id) {
      return states[id] || null;
    },
    async setForeignStateAsync(id, val) {
      states[id] = val;
    },
    async extendObjectAsync(id, obj) {
      createdObjects[id] = obj;
    },
    async setStateAsync(id, val) {
      setStates.push({ id, val });
    },
    setTimeout(fn, delay) {
      timeouts.push({ fn, delay });
      return timeouts.length - 1;
    },
    sendTo(target, cmd, payload, cb) {
      sentMessages.push({ target, cmd, payload });
      cb({});
    },
  };
}

function makeNotif() {
  const sent = [];
  return {
    sent,
    async send(text, key) {
      sent.push({ text, key });
      return true;
    },
  };
}

function makePlant(overrides = {}) {
  return {
    name: "Ficus",
    location: "Living room",
    enabled: true,
    profile: "Ficus",
    sensorHumidity: "zigbee.0.hum",
    sensorTemperature: "zigbee.0.temp",
    sensorBattery: "zigbee.0.bat",
    sensorWatering: null,
    humidityMin: "",
    humidityMax: "",
    temperatureMin: "",
    temperatureMax: "",
    batteryMin: "",
    customProfile: "",
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────
describe("MonitorService", () => {
  describe("_getThresholds()", () => {
    it("uses profile defaults when plant fields are empty", () => {
      const adapter = makeAdapter();
      const ms = new MonitorService(adapter, makeNotif(), "en");
      const plant = makePlant(); // Ficus profile: hum 40-70, temp 18-25, bat 20

      const t = ms._getThresholds(plant);

      assert.equal(t.humidityMin, 40);
      assert.equal(t.humidityMax, 70);
      assert.equal(t.temperatureMin, 18);
      assert.equal(t.temperatureMax, 25);
      assert.equal(t.batteryMin, 20);
    });

    it("overrides profile with plant-specific values", () => {
      const adapter = makeAdapter();
      const ms = new MonitorService(adapter, makeNotif(), "en");
      const plant = makePlant({ humidityMin: 30, humidityMax: 80, batteryMin: 15 });

      const t = ms._getThresholds(plant);

      assert.equal(t.humidityMin, 30);
      assert.equal(t.humidityMax, 80);
      assert.equal(t.batteryMin, 15);
    });

    it("uses custom profile when customProfile is set", () => {
      const adapter = makeAdapter({
        customProfiles: [
          { name: "MyPlant", humidityMin: 55, humidityMax: 75, temperatureMin: 20, temperatureMax: 28, batteryMin: 25 },
        ],
      });
      const ms = new MonitorService(adapter, makeNotif(), "en");
      const plant = makePlant({ customProfile: "MyPlant" });

      const t = ms._getThresholds(plant);

      assert.equal(t.humidityMin, 55);
      assert.equal(t.humidityMax, 75);
    });

    it("falls back to Custom profile for unknown profile name", () => {
      const adapter = makeAdapter();
      const ms = new MonitorService(adapter, makeNotif(), "en");
      const plant = makePlant({ profile: "UnknownPlant" });

      const t = ms._getThresholds(plant);
      // Custom profile has some defaults — just check it doesn't throw
      assert.ok(typeof t.humidityMin === "number");
    });
  });

  describe("_safeName()", () => {
    it("converts spaces and special chars to underscores", () => {
      const ms = new MonitorService(makeAdapter(), makeNotif(), "en");
      assert.equal(ms._safeName("Ficus Benjamina!"), "ficus_benjamina_");
      assert.equal(ms._safeName("My Plant (1)"), "my_plant__1_");
      assert.equal(ms._safeName("simple"), "simple");
    });
  });

  describe("onStateChange()", () => {
    it("stores numeric sensor value and triggers check", async () => {
      const plant = makePlant({ humidityMin: 40 });
      const adapter = makeAdapter({ plants: [plant] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");

      await ms.onStateChange("zigbee.0.hum", { val: 25, ts: Date.now() });

      assert.equal(ms.sensorValues["zigbee.0.hum"].val, 25);
      // humidity 25 < min 40 → alert sent
      assert.equal(notif.sent.length, 1);
      assert.ok(notif.sent[0].text.includes("DRY"));
    });

    it("ignores non-numeric values", async () => {
      const adapter = makeAdapter({ plants: [makePlant()] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");

      await ms.onStateChange("zigbee.0.hum", { val: "N/A", ts: Date.now() });

      assert.equal(Object.keys(ms.sensorValues).length, 0);
      assert.equal(notif.sent.length, 0);
    });

    it("ignores null state", async () => {
      const adapter = makeAdapter({ plants: [makePlant()] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");

      await ms.onStateChange("zigbee.0.hum", null);
      assert.equal(notif.sent.length, 0);
    });

    it("skips disabled plants", async () => {
      const plant = makePlant({ enabled: false });
      const adapter = makeAdapter({ plants: [plant] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");

      await ms.onStateChange("zigbee.0.hum", { val: 10, ts: Date.now() });
      assert.equal(notif.sent.length, 0);
    });
  });

  describe("_checkPlant()", () => {
    it("sends humidity_low alert when below min", async () => {
      const plant = makePlant({ humidityMin: 40 });
      const adapter = makeAdapter({ plants: [plant] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");
      ms.sensorValues["zigbee.0.hum"] = { val: 20, ts: Date.now() };

      await ms._checkPlant(plant);

      assert.equal(notif.sent.length, 1);
      assert.ok(notif.sent[0].key.includes("humidity_low"));
    });

    it("sends humidity_high alert when above max", async () => {
      const plant = makePlant({ humidityMax: 70 });
      const adapter = makeAdapter({ plants: [plant] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");
      ms.sensorValues["zigbee.0.hum"] = { val: 90, ts: Date.now() };

      await ms._checkPlant(plant);

      assert.equal(notif.sent.length, 1);
      assert.ok(notif.sent[0].key.includes("humidity_high"));
    });

    it("sends temp_low alert when below min", async () => {
      const plant = makePlant({ temperatureMin: 18 });
      const adapter = makeAdapter({ plants: [plant] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");
      ms.sensorValues["zigbee.0.temp"] = { val: 10, ts: Date.now() };

      await ms._checkPlant(plant);

      assert.equal(notif.sent.length, 1);
      assert.ok(notif.sent[0].key.includes("temp_low"));
    });

    it("sends battery_low alert when below min", async () => {
      const plant = makePlant({ batteryMin: 20 });
      const adapter = makeAdapter({ plants: [plant] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");
      ms.sensorValues["zigbee.0.bat"] = { val: 10, ts: Date.now() };

      await ms._checkPlant(plant);

      assert.equal(notif.sent.length, 1);
      assert.ok(notif.sent[0].key.includes("battery_low"));
    });

    it("sends no alert when all values are within range", async () => {
      const plant = makePlant({ humidityMin: 40, humidityMax: 70, temperatureMin: 18, temperatureMax: 25, batteryMin: 20 });
      const adapter = makeAdapter({ plants: [plant] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");
      ms.sensorValues["zigbee.0.hum"] = { val: 55, ts: Date.now() };
      ms.sensorValues["zigbee.0.temp"] = { val: 22, ts: Date.now() };
      ms.sensorValues["zigbee.0.bat"] = { val: 80, ts: Date.now() };

      await ms._checkPlant(plant);

      assert.equal(notif.sent.length, 0);
    });

    it("updates states for all sensors", async () => {
      const plant = makePlant();
      const adapter = makeAdapter({ plants: [plant] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");
      ms.sensorValues["zigbee.0.hum"] = { val: 55, ts: Date.now() };
      ms.sensorValues["zigbee.0.temp"] = { val: 22, ts: Date.now() };
      ms.sensorValues["zigbee.0.bat"] = { val: 80, ts: Date.now() };

      await ms._checkPlant(plant);

      const ids = adapter.setStates.map((s) => s.id);
      assert.ok(ids.some((id) => id.includes("humidity")));
      assert.ok(ids.some((id) => id.includes("temperature")));
      assert.ok(ids.some((id) => id.includes("battery")));
    });
  });

  describe("_checkOffline()", () => {
    it("sends offline alert when sensor not seen for too long", async () => {
      const plant = makePlant();
      const adapter = makeAdapter({ plants: [plant], offlineThreshold: 3 });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");
      // Set lastSeen to 4 hours ago
      ms.lastSeen[plant.name] = Date.now() - 4 * 60 * 60 * 1000;

      await ms._checkOffline(plant);

      assert.equal(notif.sent.length, 1);
      assert.ok(notif.sent[0].key.includes("offline"));
    });

    it("does not send offline alert when recently seen", async () => {
      const plant = makePlant();
      const adapter = makeAdapter({ plants: [plant], offlineThreshold: 3 });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");
      ms.lastSeen[plant.name] = Date.now() - 1 * 60 * 60 * 1000; // 1 hour ago

      await ms._checkOffline(plant);

      assert.equal(notif.sent.length, 0);
    });

    it("does nothing when plant was never seen", async () => {
      const plant = makePlant();
      const adapter = makeAdapter({ plants: [plant] });
      const notif = makeNotif();
      const ms = new MonitorService(adapter, notif, "en");
      // no lastSeen entry

      await ms._checkOffline(plant);
      assert.equal(notif.sent.length, 0);
    });
  });

  describe("getPlantStates()", () => {
    it("returns current sensor values for enabled plants", () => {
      const plant = makePlant();
      const adapter = makeAdapter({ plants: [plant] });
      const ms = new MonitorService(adapter, makeNotif(), "en");
      ms.sensorValues["zigbee.0.hum"] = { val: 45, ts: Date.now() };
      ms.sensorValues["zigbee.0.temp"] = { val: 22, ts: Date.now() };
      ms.sensorValues["zigbee.0.bat"] = { val: 75, ts: Date.now() };

      const states = ms.getPlantStates();

      assert.equal(states.length, 1);
      assert.equal(states[0].humidity, 45);
      assert.equal(states[0].temperature, 22);
      assert.equal(states[0].battery, 75);
    });

    it("returns null for sensors with no data", () => {
      const plant = makePlant();
      const adapter = makeAdapter({ plants: [plant] });
      const ms = new MonitorService(adapter, makeNotif(), "en");

      const states = ms.getPlantStates();

      assert.equal(states[0].humidity, null);
      assert.equal(states[0].temperature, null);
      assert.equal(states[0].battery, null);
    });

    it("excludes disabled plants", () => {
      const plants = [makePlant({ name: "Active" }), makePlant({ name: "Disabled", enabled: false })];
      const adapter = makeAdapter({ plants });
      const ms = new MonitorService(adapter, makeNotif(), "en");

      const states = ms.getPlantStates();

      assert.equal(states.length, 1);
      assert.equal(states[0].plant.name, "Active");
    });
  });

  describe("subscribeAll()", () => {
    it("reads initial values for all enabled plant sensors", async () => {
      const plant = makePlant();
      const adapter = makeAdapter({ plants: [plant] });
      adapter.states["zigbee.0.hum"] = { val: 50, ts: Date.now() };
      adapter.states["zigbee.0.temp"] = { val: 21, ts: Date.now() };
      adapter.states["zigbee.0.bat"] = { val: 90, ts: Date.now() };

      const ms = new MonitorService(adapter, makeNotif(), "en");
      await ms.subscribeAll();

      assert.equal(ms.sensorValues["zigbee.0.hum"].val, 50);
      assert.equal(ms.sensorValues["zigbee.0.temp"].val, 21);
      assert.equal(ms.sensorValues["zigbee.0.bat"].val, 90);
    });

    it("skips disabled plants", async () => {
      const plant = makePlant({ enabled: false });
      const adapter = makeAdapter({ plants: [plant] });
      adapter.states["zigbee.0.hum"] = { val: 50, ts: Date.now() };

      const ms = new MonitorService(adapter, makeNotif(), "en");
      await ms.subscribeAll();

      assert.equal(Object.keys(ms.sensorValues).length, 0);
    });
  });
});
