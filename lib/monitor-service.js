"use strict";

const profiles = require("./plant-profiles.json");
const { msg } = require("./messages");

/**
 * MonitorService — подписка на датчики, проверка порогов, генерация алертов.
 */
class MonitorService {
  /**
   * @param {object} adapter - ioBroker adapter instance
   * @param {object} notificationManager - NotificationManager instance
   * @param {string} lang - system language code
   */
  constructor(adapter, notificationManager, lang) {
    this.adapter = adapter;
    this.notif = notificationManager;
    this.lang = lang || "en";
    // last known sensor values: key = stateId, value = { val, ts }
    this.sensorValues = {};
    // last seen timestamps per plant (for offline detection)
    this.lastSeen = {};
    // room name cache: key = roomId, value = name string
    this._roomCache = {};
  }

  /**
   * Get effective thresholds for a plant (plant overrides profile).
   *
   * @param {object} plant
   * @returns {object}
   */
  _getThresholds(plant) {
    const profile = profiles[plant.profile] || profiles["Custom"];
    const override = (val, fallback) => {
      if (val === null || val === undefined || val === "") return fallback;
      const n = parseFloat(val);
      return isNaN(n) ? fallback : n;
    };
    return {
      humidityMin:    override(plant.humidityMin,    profile.humidityMin),
      humidityMax:    override(plant.humidityMax,    profile.humidityMax),
      temperatureMin: override(plant.temperatureMin, profile.temperatureMin),
      temperatureMax: override(plant.temperatureMax, profile.temperatureMax),
      batteryMin:     override(plant.batteryMin,     profile.batteryMin),
    };
  }

  /**
   * Subscribe to all sensor states for all enabled plants.
   */
  async subscribeAll() {
    const plants = this.adapter.config.plants || [];
    for (const plant of plants) {
      if (!plant.enabled) {
        continue;
      }
      for (const attr of [
        "sensorHumidity",
        "sensorTemperature",
        "sensorBattery",
      ]) {
        const stateId = plant[attr];
        if (stateId) {
          await this.adapter.subscribeForeignStatesAsync(stateId);
          this.adapter.log.debug(`MonitorService: subscribed to ${stateId}`);
          // Read initial value so checkAll() works immediately
          try {
            const state = await this.adapter.getForeignStateAsync(stateId);
            if (state && state.val !== null && state.val !== undefined) {
              this.sensorValues[stateId] = { val: state.val, ts: state.ts || Date.now() };
              this.lastSeen[plant.name] = Date.now();
              this.adapter.log.debug(`MonitorService: initial value ${stateId} = ${state.val}`);
            }
          } catch (err) {
            this.adapter.log.warn(`MonitorService: could not read initial value for ${stateId}: ${err.message}`);
          }
        }
      }
    }
  }

  /**
   * Unsubscribe from all sensor states.
   */
  async unsubscribeAll() {
    const plants = this.adapter.config.plants || [];
    for (const plant of plants) {
      for (const attr of [
        "sensorHumidity",
        "sensorTemperature",
        "sensorBattery",
      ]) {
        const stateId = plant[attr];
        if (stateId) {
          await this.adapter.unsubscribeForeignStatesAsync(stateId);
        }
      }
    }
  }

  /**
   * Handle incoming state change from subscribed sensor.
   *
   * @param {string} id - state id
   * @param {object} state - ioBroker state object
   */
  async onStateChange(id, state) {
    if (!state || state.val === null || state.val === undefined) {
      return;
    }

    // Ensure numeric value (sensors may send strings)
    const numVal = parseFloat(state.val);
    if (isNaN(numVal)) {
      return;
    }
    this.sensorValues[id] = { val: numVal, ts: state.ts || Date.now() };

    const plants = this.adapter.config.plants || [];
    for (const plant of plants) {
      if (!plant.enabled) {
        continue;
      }
      if (
        plant.sensorHumidity === id ||
        plant.sensorTemperature === id ||
        plant.sensorBattery === id
      ) {
        this.lastSeen[plant.name] = Date.now();
        await this._checkPlant(plant);
      }
    }
  }

  /**
   * Check all plants against current sensor values (called on interval).
   */
  async checkAll() {
    const plants = this.adapter.config.plants || [];
    for (const plant of plants) {
      if (!plant.enabled) {
        continue;
      }
      await this._checkPlant(plant);
      await this._checkOffline(plant);
    }
  }

  /**
   * Resolve room ID to human-readable name.
   * Falls back to the raw value if not a room enum ID.
   *
   * @param {string} location
   * @returns {Promise<string>}
   */
  async _resolveLocation(location) {
    if (!location) return "";
    if (!location.startsWith("enum.rooms.")) return location;
    if (this._roomCache[location]) return this._roomCache[location];
    try {
      const obj = await this.adapter.getForeignObjectAsync(location);
      if (obj && obj.common && obj.common.name) {
        const name = typeof obj.common.name === "object"
          ? (obj.common.name[this.lang] || obj.common.name["en"] || location)
          : obj.common.name;
        this._roomCache[location] = name;
        return name;
      }
    } catch {
      // ignore
    }
    return location;
  }

  /**
   * Check a single plant's thresholds and send alerts if needed.
   *
   * @param {object} plant
   */
  async _checkPlant(plant) {
    const thresholds = this._getThresholds(plant);
    const locationName = await this._resolveLocation(plant.location);
    const label = `${plant.name}${locationName ? ` (${locationName})` : ""}`;
    this.adapter.log.debug(`MonitorService: checking plant "${plant.name}", thresholds: hum ${thresholds.humidityMin}-${thresholds.humidityMax}%`);

    // Humidity
    if (plant.sensorHumidity) {
      const entry = this.sensorValues[plant.sensorHumidity];
      if (entry != null) {
        const val = entry.val;
        this.adapter.log.debug(`MonitorService: ${plant.name} humidity=${val}% (min=${thresholds.humidityMin}, max=${thresholds.humidityMax})`);
        if (val < thresholds.humidityMin) {
          await this.notif.send(
            msg("humidity_low", this.lang, label, val, thresholds.humidityMin),
            `${plant.name}:humidity_low`,
          );
        } else if (val > thresholds.humidityMax) {
          await this.notif.send(
            msg("humidity_high", this.lang, label, val, thresholds.humidityMax),
            `${plant.name}:humidity_high`,
          );
        }
        await this._updateState(
          `plants.${this._safeName(plant.name)}.humidity`,
          val,
          "%",
        );
      }
    }

    // Temperature
    if (plant.sensorTemperature) {
      const entry = this.sensorValues[plant.sensorTemperature];
      if (entry != null) {
        const val = entry.val;
        if (val < thresholds.temperatureMin) {
          await this.notif.send(
            msg("temp_low", this.lang, label, val, thresholds.temperatureMin),
            `${plant.name}:temp_low`,
          );
        } else if (val > thresholds.temperatureMax) {
          await this.notif.send(
            msg("temp_high", this.lang, label, val, thresholds.temperatureMax),
            `${plant.name}:temp_high`,
          );
        }
        await this._updateState(
          `plants.${this._safeName(plant.name)}.temperature`,
          val,
          "°C",
        );
      }
    }

    // Battery
    if (plant.sensorBattery) {
      const entry = this.sensorValues[plant.sensorBattery];
      if (entry != null) {
        const val = entry.val;
        if (val < thresholds.batteryMin) {
          await this.notif.send(
            msg("battery_low", this.lang, label, val, thresholds.batteryMin),
            `${plant.name}:battery_low`,
          );
        }
        await this._updateState(
          `plants.${this._safeName(plant.name)}.battery`,
          val,
          "%",
        );
      }
    }
  }

  /**
   * Check if a plant sensor has gone offline.
   *
   * @param {object} plant
   */
  async _checkOffline(plant) {
    const offlineHours = parseInt(this.adapter.config.offlineThreshold) || 3;
    const last = this.lastSeen[plant.name];
    if (!last) {
      return;
    }

    const diffHours = (Date.now() - last) / (1000 * 60 * 60);
    if (diffHours >= offlineHours) {
      const locationName = await this._resolveLocation(plant.location);
      const label = `${plant.name}${locationName ? ` (${locationName})` : ""}`;
      await this.notif.send(
        msg("offline", this.lang, label, Math.round(diffHours)),
        `${plant.name}:offline`,
      );
    }
  }

  /**
   * Update or create a state for a plant sensor value.
   *
   * @param {string} id - relative state id
   * @param {number} val
   * @param {string} unit
   */
  async _updateState(id, val, unit) {
    try {
      await this.adapter.extendObjectAsync(id, {
        type: "state",
        common: {
          name: id,
          type: "number",
          role: "value",
          unit,
          read: true,
          write: false,
        },
        native: {},
      });
      await this.adapter.setStateAsync(id, { val, ack: true });
    } catch (err) {
      this.adapter.log.warn(
        `MonitorService: failed to update state ${id}: ${err.message}`,
      );
    }
  }

  /**
   * Convert plant name to safe state id segment.
   *
   * @param {string} name
   * @returns {string}
   */
  _safeName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  }

  /**
   * Get current sensor values for all enabled plants (for reports).
   *
   * @returns {Array}
   */
  async getPlantStates() {
    const plants = this.adapter.config.plants || [];
    const result = [];
    for (const plant of plants.filter(p => p.enabled)) {
      const locationName = await this._resolveLocation(plant.location);
      result.push({
        plant: { ...plant, location: locationName },
        humidity: plant.sensorHumidity
          ? (this.sensorValues[plant.sensorHumidity]?.val ?? null)
          : null,
        temperature: plant.sensorTemperature
          ? (this.sensorValues[plant.sensorTemperature]?.val ?? null)
          : null,
        battery: plant.sensorBattery
          ? (this.sensorValues[plant.sensorBattery]?.val ?? null)
          : null,
      });
    }
    return result;
  }
}

module.exports = MonitorService;
