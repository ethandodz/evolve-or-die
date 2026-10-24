// Loads game content: defaults, then any saved edits from the editor on this device.
import { DEFAULT_CONFIG } from './defaults.js';
// Edits that were exported from the editor and committed to the repo (shared with everyone)
import CUSTOM from './custom.json';

export const CONFIG_KEY = 'eod-config-v1';

const clone = (o) => JSON.parse(JSON.stringify(o));

// The base everyone gets: committed custom content if there is any, else the defaults
export function baseConfig() {
  return CUSTOM && Object.keys(CUSTOM).length ? fillMissing(clone(CUSTOM)) : clone(DEFAULT_CONFIG);
}

// Saved configs are full snapshots (so deletions stick). New balance knobs and
// missing sections are filled in from the defaults.
function fillMissing(cfg) {
  const d = clone(DEFAULT_CONFIG);
  for (const k of Object.keys(d)) if (cfg[k] === undefined) cfg[k] = d[k];
  cfg.balance = { ...d.balance, ...cfg.balance };
  return cfg;
}

export function loadConfig() {
  let saved = null;
  try { saved = JSON.parse(localStorage.getItem(CONFIG_KEY) || 'null'); } catch { saved = null; }
  return saved ? fillMissing(saved) : baseConfig();
}

export function saveConfig(cfg) {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg)); return true; } catch { return false; }
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
