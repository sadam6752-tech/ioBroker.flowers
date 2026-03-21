"use strict";

const utils = require("@iobroker/adapter-core");
const NotificationManager = require("./lib/notification-manager");
const MonitorService = require("./lib/monitor-service");

class FlowersAdapter extends utils.Adapter {
  constructor(options) {
    super({ ...options, name: "flowers" });

    this.notif = null;
    this.monitor = null;
    this._checkTimer = null;
    this._dailyReportTimer = null;
    this._weeklyReportTimer = null;

    this.on("ready", this.onReady.bind(this));
    this.on("stateChange", this.onStateChange.bind(this));
    this.on("unload", this.onUnload.bind(this));
  }

  async onReady() {
    this.log.info("flowers adapter starting...");

    // Read system language
    let lang = "en";
    try {
      const sysConfig = await this.getForeignObjectAsync("system.config");
      if (sysConfig && sysConfig.common && sysConfig.common.language) {
        lang = sysConfig.common.language;
      }
    } catch {
      // fallback to en
    }
    this.log.debug(`flowers: system language = ${lang}`);

    this.notif = new NotificationManager(this, lang);
    this.monitor = new MonitorService(this, this.notif, lang);

    // Subscribe to sensor states
    await this.monitor.subscribeAll();

    // Set connection indicator
    await this.setStateAsync("info.connection", { val: true, ack: true });

    // Start periodic check
    const intervalMin = parseInt(this.config.checkInterval) || 60;
    this._checkTimer = this.setInterval(
      async () => {
        await this.monitor.checkAll();
      },
      intervalMin * 60 * 1000,
    );

    // Run initial check
    await this.monitor.checkAll();

    // Schedule daily report
    if (this.config.dailyReportEnabled) {
      this._scheduleDailyReport();
    }

    // Schedule weekly report
    if (this.config.weeklyReportEnabled) {
      this._scheduleWeeklyReport();
    }

    this.log.info(`flowers adapter ready. Check interval: ${intervalMin} min`);
  }

  async onStateChange(id, state) {
    if (!state || state.val === null || state.val === undefined) {
      return;
    }
    await this.monitor.onStateChange(id, state);
  }

  onUnload(callback) {
    try {
      if (this._checkTimer) {
        this.clearInterval(this._checkTimer);
      }
      if (this._dailyReportTimer) {
        this.clearTimeout(this._dailyReportTimer);
      }
      if (this._weeklyReportTimer) {
        this.clearTimeout(this._weeklyReportTimer);
      }
      this.monitor.unsubscribeAll().catch(() => {});
      this.setStateAsync("info.connection", { val: false, ack: true }).catch(
        () => {},
      );
    } catch {
      // ignore
    }
    callback();
  }

  // ── Report scheduling ──────────────────────────────────────────────────

  _scheduleDailyReport() {
    const [h, m] = (this.config.dailyReportTime || "20:00")
      .split(":")
      .map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(h, m, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }

    const delay = next - now;
    this._dailyReportTimer = this.setTimeout(async () => {
      await this.notif.sendDailyReport(this.monitor.getPlantStates());
      // reschedule for next day
      this._scheduleDailyReport();
    }, delay);

    this.log.debug(
      `Daily report scheduled in ${Math.round(delay / 60000)} min`,
    );
  }

  _scheduleWeeklyReport() {
    const targetDay = parseInt(this.config.weeklyReportDay ?? "1"); // 0=Sun..6=Sat
    const [h, m] = (this.config.weeklyReportTime || "10:00")
      .split(":")
      .map(Number);
    const now = new Date();
    const next = new Date(now);
    next.setHours(h, m, 0, 0);

    const daysUntil = (targetDay - now.getDay() + 7) % 7 || 7;
    next.setDate(now.getDate() + daysUntil);

    const delay = next - now;
    this._weeklyReportTimer = this.setTimeout(async () => {
      await this.notif.sendDailyReport(this.monitor.getPlantStates());
      this._scheduleWeeklyReport();
    }, delay);

    this.log.debug(
      `Weekly report scheduled in ${Math.round(delay / 60000)} min`,
    );
  }
}

if (require.main !== module) {
  module.exports = (options) => new FlowersAdapter(options);
} else {
  new FlowersAdapter();
}
