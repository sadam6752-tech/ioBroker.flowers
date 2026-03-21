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

### 0.1.0 (2026-03-21)
- Initial release: plant monitoring with Telegram notifications, configurable thresholds, night mode and periodic reports

## License

MIT License  
Copyright (c) 2025-2026 sadam6752-tech <sadam6752@gmail.com>  
