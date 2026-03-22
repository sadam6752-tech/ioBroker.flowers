# ioBroker.flowers

[![NPM version](https://img.shields.io/npm/v/iobroker.flowers.svg)](https://www.npmjs.com/package/iobroker.flowers)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

Monitor indoor plants via soil moisture, temperature and battery sensors with Telegram notifications.

## Features

- Monitor multiple plants with individual sensor assignments
- Built-in plant profiles (Ficus, Orchid, Cactus, Monstera, Fern, Succulent, Palm, Pothos, Aloe Vera, Peace Lily, Custom)
- Configurable thresholds per plant (override profile defaults)
- Telegram notifications via `sendTo('telegram.X', ...)`
- Anti-spam: max messages per day limit + 1-hour cooldown per alert type
- Night mode: suppress notifications during quiet hours
- Daily and weekly plant status reports
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

### Profiles Tab

Overview of built-in profiles with recommended thresholds.

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

## Changelog

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
