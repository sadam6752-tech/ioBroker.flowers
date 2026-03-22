"use strict";

const { msg } = require("./messages");

/**
 * NotificationManager — отправка Telegram-уведомлений через sendTo,
 * антиспам (maxMessagesPerDay), ночной режим.
 */
class NotificationManager {
  /**
   * @param {object} adapter - ioBroker adapter instance
   * @param {string} lang - system language code
   */
  constructor(adapter, lang) {
    this.adapter = adapter;
    this.lang = lang || "en";
    this.sentToday = 0;
    this.lastResetDate = new Date().toDateString();
    // cooldown per plant+type: key = `${plantName}:${type}`, value = timestamp
    this.cooldowns = {};
    // COOLDOWN_MS is dynamic — read from config in _inCooldown()
  }

  /**
   * Reset daily counter if date changed.
   */
  _checkDailyReset() {
    const today = new Date().toDateString();
    if (today !== this.lastResetDate) {
      this.sentToday = 0;
      this.lastResetDate = today;
      this.adapter.log.debug("NotificationManager: daily counter reset");
    }
  }

  /**
   * Check if current time is within night mode window.
   *
   * @returns {boolean}
   */
  _isNightMode() {
    const cfg = this.adapter.config;
    if (!cfg.nightModeEnabled) {
      return false;
    }

    const now = new Date();
    const [startH, startM] = (cfg.nightModeStart || "22:00")
      .split(":")
      .map(Number);
    const [endH, endM] = (cfg.nightModeEnd || "08:00").split(":").map(Number);

    const nowMin = now.getHours() * 60 + now.getMinutes();
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;

    if (startMin <= endMin) {
      return nowMin >= startMin && nowMin < endMin;
    }
    // overnight: e.g. 22:00 – 08:00
    return nowMin >= startMin || nowMin < endMin;
  }

  /**
   * Check cooldown for a specific plant+alertType combination.
   *
   * @param {string} key
   * @returns {boolean} true if still in cooldown
   */
  _inCooldown(key) {
    const last = this.cooldowns[key];
    if (!last) {
      return false;
    }
    // repeatInterval=0 means no repeat → always in cooldown after first alert
    const repeatMin = parseInt(this.adapter.config.repeatInterval);
    if (isNaN(repeatMin) || repeatMin === 0) {
      return true; // no repeat
    }
    const cooldownMs = repeatMin * 60 * 1000;
    return Date.now() - last < cooldownMs;
  }

  /**
   * Send a Telegram message via sendTo.
   *
   * @param {string} text - message text
   * @param {string} [cooldownKey] - optional key for cooldown tracking
   * @param {boolean} [force] - skip night mode and daily limit checks
   * @returns {Promise<boolean>} true if sent
   */
  async send(text, cooldownKey, force = false) {
    this._checkDailyReset();

    const maxPerDay = this.adapter.config.maxMessagesPerDay || 10;
    if (!force && this.sentToday >= maxPerDay) {
      this.adapter.log.debug(
        `NotificationManager: daily limit reached (${maxPerDay}), skipping`,
      );
      return false;
    }

    if (!force && this._isNightMode()) {
      this.adapter.log.debug(
        "NotificationManager: night mode active, skipping",
      );
      return false;
    }

    if (cooldownKey && this._inCooldown(cooldownKey)) {
      this.adapter.log.debug(
        `NotificationManager: cooldown active for ${cooldownKey}, skipping`,
      );
      return false;
    }

    const instance = this.adapter.config.telegramInstance || "0";
    // telegramInstance может быть "0" или "telegram.0" — нормализуем
    const telegramTarget = instance.includes(".") ? instance : `telegram.${instance}`;
    const users = this.adapter.config.telegramUsers
      ? this.adapter.config.telegramUsers
          .split(",")
          .map((u) => u.trim())
          .filter(Boolean)
      : [];

    return new Promise((resolve) => {
      const payload = users.length > 0 ? { text, user: users.join(", ") } : { text };
      this.adapter.sendTo(telegramTarget, "send", payload, (result) => {
        if (result && result.error) {
          this.adapter.log.error(`NotificationManager: sendTo error: ${result.error}`);
          resolve(false);
        } else {
          this.sentToday++;
          if (cooldownKey) {
            this.cooldowns[cooldownKey] = Date.now();
          }
          this.adapter.log.info(
            `NotificationManager: sent (${this.sentToday}/${maxPerDay}): ${text.substring(0, 80)}`,
          );
          resolve(true);
        }
      });
    });
  }

  /**
   * Send daily report for all plants.
   *
   * @param {Array} plantStates - array of { plant, humidity, temperature, battery }
   */
  async sendDailyReport(plantStates) {
    await this._sendReport(plantStates, "report_header");
  }

  async sendWeeklyReport(plantStates) {
    await this._sendReport(plantStates, "weekly_report_header");
  }

  async _sendReport(plantStates, headerKey) {
    if (!plantStates || plantStates.length === 0) {
      return;
    }

    const divider = "━━━━━━━━━━━━━━━";
    let lines = [msg(headerKey, this.lang)];
    for (const ps of plantStates) {
      const hum  = ps.humidity    !== null ? `${ps.humidity}%`     : "n/a";
      const temp = ps.temperature !== null ? `${ps.temperature}°C` : "n/a";
      const bat  = ps.battery     !== null ? `${ps.battery}%`      : "n/a";
      lines.push(divider);
      lines.push(`🪴 ${ps.plant.name} (${ps.plant.location || "—"})`);
      lines.push(`💧 ${hum}  🌡 ${temp}  🔋 ${bat}`);
    }
    lines.push(divider);

    await this.send(lines.join("\n"), null, true);
  }

  /**
   * Reset daily counter (called externally at midnight if needed).
   */
  resetDailyCounter() {
    this.sentToday = 0;
    this.lastResetDate = new Date().toDateString();
  }
}

module.exports = NotificationManager;
