# ioBroker.flowers

![Logo](admin/flowers.png)

[![NPM version](https://img.shields.io/npm/v/iobroker.flowers.svg)](https://www.npmjs.com/package/iobroker.flowers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Monitor indoor plants via soil moisture, temperature and battery sensors with Telegram notifications.

This adapter works with **any sensor** already integrated in ioBroker (Zigbee, Wi-Fi, Bluetooth, Z-Wave, etc.) — no specific hardware required. Popular compatible sensors:

- [Xiaomi Mi Flora / HHCC Plant Sensor](https://www.mi.com/global/mi-flora) — Bluetooth soil moisture + temperature + light
- [Zigbee soil moisture sensors](https://www.zigbee2mqtt.io/supported-devices/#s=soil) (e.g. Tuya TS0601, MOES) — via ioBroker Zigbee adapter
- Any sensor exposing humidity/temperature/battery states in ioBroker

Notifications are sent via the [ioBroker Telegram adapter](https://github.com/ioBroker/ioBroker.telegram).

## Features

- Monitor multiple plants with individual sensor assignments
- Built-in plant profiles (Ficus, Orchid, Cactus, Monstera, Fern, Succulent, Palm, Pothos, Aloe Vera, Peace Lily, Coffea arabica, Rhapis excelsa, Calathea zebrina, Sansevieria Laurentii, Custom)
- Custom profiles: create your own plant profiles with individual thresholds in the Profiles tab
- Configurable thresholds per plant (override profile defaults)
- Automatic watering: trigger a watering switch when soil humidity drops below minimum
- Configurable watering duration (minutes)
- Telegram notifications via `sendTo('telegram.X', ...)`
- Anti-spam: max messages per day limit + configurable cooldown per alert type
- Night mode: suppress notifications during quiet hours
- Daily and weekly plant status reports with manual trigger buttons
- Offline sensor detection

## Configuration

### Settings Tab

| Parameter | Description |
|-----------|-------------|
| Telegram Instance | Instance number of the telegram adapter |
| Telegram Users | Comma-separated usernames (empty = all users) |
| Check Interval | How often to check sensor values |
| Max Messages per Day | Anti-spam limit |
| Offline Threshold | Hours before sensor is considered offline |
| Night Mode | Suppress notifications during night hours |
| Daily/Weekly Report | Scheduled status reports |

### Plants Tab

Add your plants and assign ioBroker state IDs for each sensor. Select a profile — thresholds are applied automatically. You can override individual threshold values per plant.

For automatic watering, assign a **Watering** state ID (e.g. a switch that controls a pump or valve). When soil humidity drops below the minimum threshold, the adapter sets this state to `true` for the configured watering duration, then sets it back to `false`.

### Profiles Tab

Overview of built-in profiles with recommended thresholds. You can also create **custom profiles** in the table at the top — enter a name and thresholds, then use that name in the "Custom Profile" field in the Plants tab.

## States

The adapter creates states under `flowers.X.plants.<plant_name>`:

| State | Description |
|-------|-------------|
| `humidity` | Current soil humidity % |
| `temperature` | Current temperature °C |
| `battery` | Current battery % |

And under `flowers.X`:

| State | Description |
|-------|-------------|
| `info.connection` | Adapter connection status |
| `notifications.totalToday` | Notifications sent today |
| `notifications.sendDailyReport` | Button: trigger daily report manually |
| `notifications.sendWeeklyReport` | Button: trigger weekly report manually |

### Automatic Watering

Assign a **Watering** state (e.g. `zigbee.0.pump.state`) in the Plants tab. When humidity drops below the minimum:
1. The adapter sets the watering state to `true`
2. Waits for the configured **Watering Duration** (minutes)
3. Sets the state back to `false`

Only one watering cycle runs at a time per plant. Configure the duration in Settings → Automatic Watering.

## Changelog

### 0.3.4 (2026-03-31)
- (sadam6752-tech) Add unit tests for MonitorService, NotificationManager and messages (106 tests total)
- (sadam6752-tech) Update README with links to compatible devices and Telegram adapter
- (sadam6752-tech) Remove mocha from devDependencies (already included in @iobroker/testing)

### 0.3.3 (2026-03-30)
- (sadam6752-tech) Fix object hierarchy: create device/channel parent objects before states
- (sadam6752-tech) Use correct state roles: value.humidity, value.temperature, value.battery
- (sadam6752-tech) Improve unload: null timers after clearing, guard monitor null check

### 0.3.2 (2026-03-30)
- (sadam6752-tech) Custom profiles: users can create own plant profiles in Profiles tab
- (sadam6752-tech) Custom profile field in Plants table for direct profile name entry

### 0.3.1 (2026-03-30)
- (sadam6752-tech) Fixed all lint warnings: complete JSDoc descriptions for all methods

### 0.3.0 (2026-03-30)
- (sadam6752-tech) Standard CI/CD workflow using ioBroker testing actions
- (sadam6752-tech) Added dependabot and automerge workflow
- (sadam6752-tech) Added release-script and standard test structure
- (sadam6752-tech) Added .releaseconfig.json

### 0.2.9 (2026-03-22)
- (sadam6752-tech) Automatic watering support: sensorWatering column, wateringDuration setting
- (sadam6752-tech) Fixed checkbox column width; increased battery sensor column width

### 0.2.8 (2026-03-21)
* (sadam6752-tech) Added sendWeeklyReport button for manual weekly report trigger
* (sadam6752-tech) Fixed repochecker issues: grid values, dependencies

### 0.2.7 (2026-03-21)
* (sadam6752-tech) Fixed weekly report header; separated daily/weekly report logic

### 0.2.6 (2026-03-21)
* (sadam6752-tech) Added dividers to daily/weekly report format

### 0.2.5 (2026-03-21)
* (sadam6752-tech) Added sendDailyReport button for manual report trigger

### 0.2.4 (2026-03-21)
* (sadam6752-tech) Fixed Profiles tab causing dirty state on open

### 0.2.3 (2026-03-21)
* (sadam6752-tech) Increased Bat Min column width; allow empty threshold fields

### 0.2.2 (2026-03-21)
* (sadam6752-tech) Allow empty threshold fields - profile values used as fallback

### 0.2.0 (2026-03-21)
* (sadam6752-tech) Added 4 new plant profiles; translations for all 11 languages
### 0.1.0 (2026-03-21)
- Initial release: plant monitoring with Telegram notifications, configurable thresholds, night mode and periodic reports

## License

MIT License  
Copyright (c) 2025-2026 sadam6752-tech <sadam6752@gmail.com>  
