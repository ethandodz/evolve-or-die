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
  const seen = cfg.contentVersion || 1;
  for (const k of Object.keys(d)) if (cfg[k] === undefined) cfg[k] = d[k];
  if (!Array.isArray(cfg.requests)) cfg.requests = [];
  cfg.balance = { ...d.balance, ...cfg.balance };
  // Not editable in the editor, so they always come from the game itself
  for (const k of ['meta', 'rareShop', 'twists', 'mirror', 'miniAttacks', 'combos', 'events', 'relics']) cfg[k] = d[k];
  if (seen < d.contentVersion) addNewContent(cfg, d);
  return cfg;
}

// Saved edits are full snapshots, so built-in content added later (new enemies, ages,
// characters, fields) is merged in once. Nothing the player changed is overwritten.
function addNewContent(cfg, d) {
  for (const k of ['enemies', 'weapons', 'passives']) {
    for (const [key, val] of Object.entries(d[k])) {
      if (!cfg[k][key]) cfg[k][key] = val;
      else for (const [f, v] of Object.entries(val)) if (cfg[k][key][f] === undefined) cfg[k][key][f] = v;
    }
  }
  // Boss patterns that were never edited move to the new, more unique ones
  const OLD_ATTACKS = {
    stone: ['charge', 'rocks', 'stomp', 'charge'], roman: ['lunge', 'pools', 'lunge', 'summon'],
    medieval: ['breath', 'meteors', 'charge', 'breath', 'summon'],
  };
  for (const a of cfg.ages) {
    const nd = d.ages.find(x => x.key === a.key);
    if (nd && OLD_ATTACKS[a.key] && JSON.stringify(a.bossAttacks) === JSON.stringify(OLD_ATTACKS[a.key])) a.bossAttacks = nd.bossAttacks;
  }
  // Character stats that changed with perks, if they were never edited
  const OLD_CHARS = { hunter: { speed: 1.12 }, shaman: { hearts: 4 }, knight: { hearts: 6, speed: 0.92 } };
  for (const c of cfg.characters) {
    const nd = d.characters.find(x => x.key === c.key);
    for (const [f, v] of Object.entries(OLD_CHARS[c.key] || {})) if (nd && c[f] === v) c[f] = nd[f];
  }
  // New wizard shop items
  for (const it of d.shop) if (!cfg.shop.find(x => x.id === it.id)) cfg.shop.push(it);
  for (const k of ['ages', 'characters']) {
    for (const val of d[k]) {
      const have = cfg[k].find(x => x.key === val.key);
      if (!have) cfg[k].push(val);
      else for (const [f, v] of Object.entries(val)) if (have[f] === undefined) have[f] = v;
    }
  }
  // Characters moved from a shared starting weapon to their own signature weapon
  const OLD_START = { caveman: 'club', tamer: 'rocks', shaman: 'fire', knight: 'axes', centurion: 'spear', inventor: 'bolt' };
  for (const c of cfg.characters) {
    const nd = d.characters.find(x => x.key === c.key);
    if (nd && OLD_START[c.key] && c.weapon === OLD_START[c.key]) c.weapon = nd.weapon;
  }
  // Characters that were taken out of the game
  const REMOVED_CHARS = ['hunter'];
  cfg.characters = cfg.characters.filter(c => !REMOVED_CHARS.includes(c.key));
  // Old default that the faster start replaced
  if (cfg.balance.spawnBase === 1.1) cfg.balance.spawnBase = d.balance.spawnBase;
  if ([0.15, 0.03].includes(cfg.balance.treasureChance)) cfg.balance.treasureChance = d.balance.treasureChance;
  if (cfg.balance.bossTreasureChance == null) cfg.balance.bossTreasureChance = d.balance.bossTreasureChance;
  cfg.contentVersion = d.contentVersion;
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
