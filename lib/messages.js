"use strict";

/**
 * Localized alert messages for the flowers adapter.
 * Supported languages: en, de, ru, fr, it, es, pl, pt, nl, uk, zh-cn
 */
const MESSAGES = {
  humidity_low: {
    en: (label, val, min) =>
      `💧 ${label}: soil too DRY — ${val}% (min ${min}%). Time to water!`,
    de: (label, val, min) =>
      `💧 ${label}: Erde zu TROCKEN — ${val}% (min ${min}%). Zeit zum Gießen!`,
    ru: (label, val, min) =>
      `💧 ${label}: почва слишком СУХАЯ — ${val}% (мин ${min}%). Пора поливать!`,
    fr: (label, val, min) =>
      `💧 ${label}: terre trop SÈCHE — ${val}% (min ${min}%). Il faut arroser!`,
    it: (label, val, min) =>
      `💧 ${label}: terra troppo SECCA — ${val}% (min ${min}%). È ora di annaffiare!`,
    es: (label, val, min) =>
      `💧 ${label}: tierra demasiado SECA — ${val}% (mín ${min}%). ¡Hora de regar!`,
    pl: (label, val, min) =>
      `💧 ${label}: gleba zbyt SUCHA — ${val}% (min ${min}%). Czas podlać!`,
    pt: (label, val, min) =>
      `💧 ${label}: terra muito SECA — ${val}% (mín ${min}%). Hora de regar!`,
    nl: (label, val, min) =>
      `💧 ${label}: grond te DROOG — ${val}% (min ${min}%). Tijd om water te geven!`,
    uk: (label, val, min) =>
      `💧 ${label}: ґрунт занадто СУХИЙ — ${val}% (мін ${min}%). Час поливати!`,
    "zh-cn": (label, val, min) =>
      `💧 ${label}: 土壤太干 — ${val}% (最低 ${min}%). 该浇水了！`,
  },
  humidity_high: {
    en: (label, val, max) =>
      `💦 ${label}: soil too WET — ${val}% (max ${max}%). Check drainage!`,
    de: (label, val, max) =>
      `💦 ${label}: Erde zu NASS — ${val}% (max ${max}%). Drainage prüfen!`,
    ru: (label, val, max) =>
      `💦 ${label}: почва слишком ВЛАЖНАЯ — ${val}% (макс ${max}%). Проверьте дренаж!`,
    fr: (label, val, max) =>
      `💦 ${label}: terre trop HUMIDE — ${val}% (max ${max}%). Vérifiez le drainage!`,
    it: (label, val, max) =>
      `💦 ${label}: terra troppo UMIDA — ${val}% (max ${max}%). Controlla il drenaggio!`,
    es: (label, val, max) =>
      `💦 ${label}: tierra demasiado HÚMEDA — ${val}% (máx ${max}%). ¡Revisa el drenaje!`,
    pl: (label, val, max) =>
      `💦 ${label}: gleba zbyt MOKRA — ${val}% (max ${max}%). Sprawdź drenaż!`,
    pt: (label, val, max) =>
      `💦 ${label}: terra muito ÚMIDA — ${val}% (máx ${max}%). Verifique a drenagem!`,
    nl: (label, val, max) =>
      `💦 ${label}: grond te NAT — ${val}% (max ${max}%). Controleer de afwatering!`,
    uk: (label, val, max) =>
      `💦 ${label}: ґрунт занадто ВОЛОГИЙ — ${val}% (макс ${max}%). Перевірте дренаж!`,
    "zh-cn": (label, val, max) =>
      `💦 ${label}: 土壤太湿 — ${val}% (最高 ${max}%). 检查排水！`,
  },
  temp_low: {
    en: (label, val, min) => `🥶 ${label}: too COLD — ${val}°C (min ${min}°C)`,
    de: (label, val, min) => `🥶 ${label}: zu KALT — ${val}°C (min ${min}°C)`,
    ru: (label, val, min) =>
      `🥶 ${label}: слишком ХОЛОДНО — ${val}°C (мин ${min}°C)`,
    fr: (label, val, min) =>
      `🥶 ${label}: trop FROID — ${val}°C (min ${min}°C)`,
    it: (label, val, min) =>
      `🥶 ${label}: troppo FREDDO — ${val}°C (min ${min}°C)`,
    es: (label, val, min) =>
      `🥶 ${label}: demasiado FRÍO — ${val}°C (mín ${min}°C)`,
    pl: (label, val, min) =>
      `🥶 ${label}: zbyt ZIMNO — ${val}°C (min ${min}°C)`,
    pt: (label, val, min) =>
      `🥶 ${label}: muito FRIO — ${val}°C (mín ${min}°C)`,
    nl: (label, val, min) => `🥶 ${label}: te KOUD — ${val}°C (min ${min}°C)`,
    uk: (label, val, min) =>
      `🥶 ${label}: занадто ХОЛОДНО — ${val}°C (мін ${min}°C)`,
    "zh-cn": (label, val, min) =>
      `🥶 ${label}: 太冷 — ${val}°C (最低 ${min}°C)`,
  },
  temp_high: {
    en: (label, val, max) => `🥵 ${label}: too HOT — ${val}°C (max ${max}°C)`,
    de: (label, val, max) => `🥵 ${label}: zu HEISS — ${val}°C (max ${max}°C)`,
    ru: (label, val, max) =>
      `🥵 ${label}: слишком ЖАРКО — ${val}°C (макс ${max}°C)`,
    fr: (label, val, max) =>
      `🥵 ${label}: trop CHAUD — ${val}°C (max ${max}°C)`,
    it: (label, val, max) =>
      `🥵 ${label}: troppo CALDO — ${val}°C (max ${max}°C)`,
    es: (label, val, max) =>
      `🥵 ${label}: demasiado CALIENTE — ${val}°C (máx ${max}°C)`,
    pl: (label, val, max) =>
      `🥵 ${label}: zbyt GORĄCO — ${val}°C (max ${max}°C)`,
    pt: (label, val, max) =>
      `🥵 ${label}: muito QUENTE — ${val}°C (máx ${max}°C)`,
    nl: (label, val, max) => `🥵 ${label}: te HEET — ${val}°C (max ${max}°C)`,
    uk: (label, val, max) =>
      `🥵 ${label}: занадто ЖАРКО — ${val}°C (макс ${max}°C)`,
    "zh-cn": (label, val, max) =>
      `🥵 ${label}: 太热 — ${val}°C (最高 ${max}°C)`,
  },
  battery_low: {
    en: (label, val, min) =>
      `🔋 ${label}: battery LOW — ${val}% (min ${min}%). Replace battery!`,
    de: (label, val, min) =>
      `🔋 ${label}: Batterie SCHWACH — ${val}% (min ${min}%). Batterie wechseln!`,
    ru: (label, val, min) =>
      `🔋 ${label}: батарея РАЗРЯЖЕНА — ${val}% (мин ${min}%). Замените батарею!`,
    fr: (label, val, min) =>
      `🔋 ${label}: batterie FAIBLE — ${val}% (min ${min}%). Remplacez la batterie!`,
    it: (label, val, min) =>
      `🔋 ${label}: batteria SCARICA — ${val}% (min ${min}%). Sostituire la batteria!`,
    es: (label, val, min) =>
      `🔋 ${label}: batería BAJA — ${val}% (mín ${min}%). ¡Reemplaza la batería!`,
    pl: (label, val, min) =>
      `🔋 ${label}: bateria SŁABA — ${val}% (min ${min}%). Wymień baterię!`,
    pt: (label, val, min) =>
      `🔋 ${label}: bateria FRACA — ${val}% (mín ${min}%). Substitua a bateria!`,
    nl: (label, val, min) =>
      `🔋 ${label}: batterij LAAG — ${val}% (min ${min}%). Vervang de batterij!`,
    uk: (label, val, min) =>
      `🔋 ${label}: батарея РОЗРЯДЖЕНА — ${val}% (мін ${min}%). Замініть батарею!`,
    "zh-cn": (label, val, min) =>
      `🔋 ${label}: 电池电量低 — ${val}% (最低 ${min}%). 请更换电池！`,
  },
  offline: {
    en: (label, hours) =>
      `📡 ${label}: sensor OFFLINE for ${hours}h. Check connection!`,
    de: (label, hours) =>
      `📡 ${label}: Sensor OFFLINE seit ${hours}h. Verbindung prüfen!`,
    ru: (label, hours) =>
      `📡 ${label}: датчик ОФЛАЙН ${hours}ч. Проверьте подключение!`,
    fr: (label, hours) =>
      `📡 ${label}: capteur HORS LIGNE depuis ${hours}h. Vérifiez la connexion!`,
    it: (label, hours) =>
      `📡 ${label}: sensore OFFLINE da ${hours}h. Controlla la connessione!`,
    es: (label, hours) =>
      `📡 ${label}: sensor DESCONECTADO por ${hours}h. ¡Revisa la conexión!`,
    pl: (label, hours) =>
      `📡 ${label}: czujnik OFFLINE od ${hours}h. Sprawdź połączenie!`,
    pt: (label, hours) =>
      `📡 ${label}: sensor OFFLINE há ${hours}h. Verifique a conexão!`,
    nl: (label, hours) =>
      `📡 ${label}: sensor OFFLINE voor ${hours}u. Controleer de verbinding!`,
    uk: (label, hours) =>
      `📡 ${label}: датчик ОФЛАЙН ${hours}год. Перевірте підключення!`,
    "zh-cn": (label, hours) =>
      `📡 ${label}: 传感器离线 ${hours}小时. 请检查连接！`,
  },
  report_header: {
    en: () => "🌿 Daily Plant Report",
    de: () => "🌿 Täglicher Pflanzenbericht",
    ru: () => "🌿 Ежедневный отчёт о растениях",
    fr: () => "🌿 Rapport quotidien des plantes",
    it: () => "🌿 Rapporto giornaliero piante",
    es: () => "🌿 Informe diario de plantas",
    pl: () => "🌿 Dzienny raport roślin",
    pt: () => "🌿 Relatório diário de plantas",
    nl: () => "🌿 Dagelijks plantenrapport",
    uk: () => "🌿 Щоденний звіт про рослини",
    "zh-cn": () => "🌿 每日植物报告",
  },
  weekly_report_header: {
    en: () => "🌿 Weekly Plant Report",
    de: () => "🌿 Wöchentlicher Pflanzenbericht",
    ru: () => "🌿 Еженедельный отчёт о растениях",
    fr: () => "🌿 Rapport hebdomadaire des plantes",
    it: () => "🌿 Rapporto settimanale piante",
    es: () => "🌿 Informe semanal de plantas",
    pl: () => "🌿 Tygodniowy raport roślin",
    pt: () => "🌿 Relatório semanal de plantas",
    nl: () => "🌿 Wekelijks plantenrapport",
    uk: () => "🌿 Щотижневий звіт про рослини",
    "zh-cn": () => "🌿 每周植物报告",
  },
};

/**
 * Get a localized message.
 *
 * @param {string} key - message key
 * @param {string} lang - language code
 * @param {...any} args - message arguments
 * @returns {string} localized message string
 */
function msg(key, lang, ...args) {
  const translations = MESSAGES[key];
  if (!translations) {
    return `[${key}]`;
  }
  const fn = translations[lang] || translations["en"];
  return fn(...args);
}

module.exports = { msg };
