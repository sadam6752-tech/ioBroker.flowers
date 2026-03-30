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
    this.sensorValues = {};
    this.lastSeen = {};
    // active watering timers: key = plant.name, value = true if watering in progress
    this._wateringActive = {};
  }

  /**
   * Get effective thresholds for a plant (plant overrides profile).
   *
   * @param {object} plant - plant configuration object
   * @returns {object} effective threshold values
   */
  _getThresholds(plant) {
    // First check custom profiles from config, then built-in profiles
    const customProfiles = this.adapter.config.customProfiles || [];
    const profileName = plant.customProfile || plant.profile;
    const customProfile = customProfiles.find((p) => p.name === profileName);
    const profile =
      customProfile || profiles[profileName] || profiles["Custom"];
    const override = (val, fallback) => {
      if (val === null || val === undefined || val === "") {
        return fallback;
      }
      const n = parseFloat(val);
      return isNaN(n) ? fallback : n;
    };
    return {
      humidityMin: override(plant.humidityMin, profile.humidityMin),
      humidityMax: override(plant.humidityMax, profile.humidityMax),
      temperatureMin: override(plant.temperatureMin, profile.temperatureMin),
      temperatureMax: override(plant.temperatureMax, profile.temperatureMax),
      batteryMin: override(plant.batteryMin, profile.batteryMin),
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
              this.sensorValues[stateId] = {
                val: state.val,
                ts: state.ts || Date.now(),
              };
              this.lastSeen[plant.name] = Date.now();
              this.adapter.log.debug(
                `MonitorService: initial value ${stateId} = ${state.val}`,
              );
            }
          } catch (err) {
            this.adapter.log.warn(
              `MonitorService: could not read initial value for ${stateId}: ${err.message}`,
            );
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
   * Check a single plant's thresholds and send alerts if needed.
   *
   * @param {object} plant - plant configuration object
   */
  async _checkPlant(plant) {
    const thresholds = this._getThresholds(plant);
    const label = `${plant.name}${plant.location ? ` (${plant.location})` : ""}`;
    this.adapter.log.debug(
      `MonitorService: checking plant "${plant.name}", thresholds: hum ${thresholds.humidityMin}-${thresholds.humidityMax}%`,
    );

    // Humidity
    if (plant.sensorHumidity) {
      const entry = this.sensorValues[plant.sensorHumidity];
      if (entry != null) {
        const val = entry.val;
        this.adapter.log.debug(
          `MonitorService: ${plant.name} humidity=${val}% (min=${thresholds.humidityMin}, max=${thresholds.humidityMax})`,
        );
        if (val < thresholds.humidityMin) {
          await this.notif.send(
            msg("humidity_low", this.lang, label, val, thresholds.humidityMin),
            `${plant.name}:humidity_low`,
          );
          await this._startWatering(plant);
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
   * @param {object} plant - plant configuration object
   */
  async _checkOffline(plant) {
    const offlineHours = parseInt(this.adapter.config.offlineThreshold) || 3;
    const last = this.lastSeen[plant.name];
    if (!last) {
      return;
    }
    const diffHours = (Date.now() - last) / (1000 * 60 * 60);
    if (diffHours >= offlineHours) {
      const label = `${plant.name}${plant.location ? ` (${plant.location})` : ""}`;
      await this.notif.send(
        msg("offline", this.lang, label, Math.round(diffHours)),
        `${plant.name}:offline`,
      );
    }
  }

  /**
   * Start automatic watering for a plant if configured and not already active.
   *
   * @param {object} plant - plant configuration object
   */
  async _startWatering(plant) {
    if (!plant.sensorWatering) {
      return;
    }
    if (this._wateringActive[plant.name]) {
      this.adapter.log.debug(
        `MonitorService: watering already active for "${plant.name}", skipping`,
      );
      return;
    }

    const durationMin = parseInt(this.adapter.config.wateringDuration) || 3;
    const durationMs = durationMin * 60 * 1000;

    try {
      await this.adapter.setForeignStateAsync(plant.sensorWatering, {
        val: true,
        ack: false,
      });
      this._wateringActive[plant.name] = true;
      this.adapter.log.info(
        `MonitorService: watering started for "${plant.name}" (${durationMin} min)`,
      );

      this.adapter.setTimeout(async () => {
        try {
          await this.adapter.setForeignStateAsync(plant.sensorWatering, {
            val: false,
            ack: false,
          });
          this.adapter.log.info(
            `MonitorService: watering stopped for "${plant.name}"`,
          );
        } catch (err) {
          this.adapter.log.warn(
            `MonitorService: failed to stop watering for "${plant.name}": ${err.message}`,
          );
        }
        this._wateringActive[plant.name] = false;
      }, durationMs);
    } catch (err) {
      this.adapter.log.warn(
        `MonitorService: failed to start watering for "${plant.name}": ${err.message}`,
      );
      this._wateringActive[plant.name] = false;
    }
  }

  /**
   * Update or create a state for a plant sensor value.
   * Ensures parent device and channel objects exist first.
   *
   * @param {string} id - relative state id (e.g. plants.ficus.humidity)
   * @param {number} val - sensor value
   * @param {string} unit - unit of measurement
   */
  async _updateState(id, val, unit) {
    try {
      // Ensure parent objects exist: plants (channel) → plants.<name> (device)
      const parts = id.split(".");
      if (parts.length === 3) {
        // parts = ['plants', '<safeName>', '<sensor>']
        await this.adapter.extendObjectAsync(parts[0], {
          type: "channel",
          common: { name: "Plants" },
          native: {},
        });
        await this.adapter.extendObjectAsync(`${parts[0]}.${parts[1]}`, {
          type: "device",
          common: { name: parts[1] },
          native: {},
        });
      }

      // Determine correct role
      const roleMap = {
        humidity: "value.humidity",
        temperature: "value.temperature",
        battery: "value.battery",
      };
      const sensor = parts[parts.length - 1];
      const role = roleMap[sensor] || "value";

      await this.adapter.extendObjectAsync(id, {
        type: "state",
        common: {
          name: sensor,
          type: "number",
          role,
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
   * @param {string} name - plant name
   * @returns {string} sanitized name safe for use as state id
   */
  _safeName(name) {
    return name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
  }

  /**
   * Get current sensor values for all enabled plants (for reports).
   *
   * @returns {Array<object>} array of { plant, humidity, temperature, battery }
   */
  getPlantStates() {
    const plants = this.adapter.config.plants || [];
    return plants
      .filter((p) => p.enabled)
      .map((plant) => ({
        plant,
        humidity: plant.sensorHumidity
          ? (this.sensorValues[plant.sensorHumidity]?.val ?? null)
          : null,
        temperature: plant.sensorTemperature
          ? (this.sensorValues[plant.sensorTemperature]?.val ?? null)
          : null,
        battery: plant.sensorBattery
          ? (this.sensorValues[plant.sensorBattery]?.val ?? null)
          : null,
      }));
  }
}

module.exports = MonitorService;
