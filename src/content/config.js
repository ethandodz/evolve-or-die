// Loads game content: defaults, then any saved edits from the editor on this device.
import { DEFAULT_CONFIG } from './defaults.js';
// Edits that were exported from the editor and committed to the repo (shared with everyone)
import CUSTOM from './custom.json';

export const CONFIG_KEY = 'eod-config-v1';
const BACKUP_KEY = 'eod-config-backup';
const UPDATED_KEY = 'eod-config-updated';
// Bumped each time new shared content is committed to custom.json. Saved edits made
// against an older version are set aside (kept as a backup) so everyone gets the update.
export const BASE_VERSION = (CUSTOM && CUSTOM.version) || 0;

const clone = (o) => JSON.parse(JSON.stringify(o));

// The base everyone gets: committed custom content if there is any, else the defaults
export function baseConfig() {
  return fillMissing(CUSTOM && Object.keys(CUSTOM).length ? clone(CUSTOM) : clone(DEFAULT_CONFIG));
}

// Saved configs are full snapshots (so deletions stick). New balance knobs and
// missing sections are filled in from the defaults.
function fillMissing(cfg) {
  const d = clone(DEFAULT_CONFIG);
  for (const k of Object.keys(d)) if (cfg[k] === undefined) cfg[k] = d[k];
  if (!Array.isArray(cfg.requests)) cfg.requests = [];
  cfg.balance = { ...d.balance, ...cfg.balance };
  return cfg;
}

export function loadConfig() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); } catch { saved = null; }
  if (saved && (saved.baseVersion || 0) !== BASE_VERSION) {
    try {
      localStorage.setItem(BACKUP_KEY, JSON.stringify(saved));
      localStorage.setItem(UPDATED_KEY, '1');
      localStorage.removeItem(CONFIG_KEY);
    } catch { /* ignore */ }
    saved = null;
  }
  return saved ? fillMissing(saved) : baseConfig();
}

export function saveConfig(cfg) {
  cfg.baseVersion = BASE_VERSION;
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); return true; } catch { return false; }
}

// True once after the game picked up a new shared update (the editor shows a notice)
export function takeUpdateNotice() {
  try { const v = !!localStorage.getItem(UPDATED_KEY); localStorage.removeItem(UPDATED_KEY); return v; } catch { return false; }
}

// The edits that were set aside when an update arrived, if any
export function getBackup() {
  try { return JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null'); } catch { return null; }
}

export function resetConfig() {
  try { localStorage.removeItem(CONFIG_KEY); } catch { /* ignore */ }
}

export function hasSavedConfig() {
  try { return !!localStorage.getItem(CONFIG_KEY); } catch { return false; }
}

// Value of one weapon stat at a level
export function statAt(s, level) {
  if (s === undefined) return 0;
  if (typeof s === 'number') return s;
  return (s.base || 0) + (s.per || 0) * (level - 1) + (s.at || []).filter(l => level >= l).length;
}

export function weaponStats(w, level) {
  const out = {};
  for (const [k, s] of Object.entries(w.stats || {})) out[k] = statAt(s, level);
  return out;
}
