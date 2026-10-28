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
  if (seen < d.contentVersion) addNewContent(cfg, d, seen);
  return cfg;
}

// Saved edits are full snapshots, so built-in content added later (new enemies, ages,
// characters, fields) is merged in once. Nothing the player changed is overwritten.
function addNewContent(cfg, d, seen) {
  // Harder game (v13), before new built-in weapons (already weaker) are merged in: weapons and passives 20% weaker, more enemies that toughen up faster
  if (seen < 13) {
    const nerf = (x) => Math.round(x * 0.8 * 100) / 100;
    for (const w of Object.values(cfg.weapons)) {
      const s = w.stats && w.stats.dmg;
      if (s && typeof s === 'object') { s.base = nerf(s.base || 0); s.per = nerf(s.per || 0); }
      if (Array.isArray(w.levels)) w.levels = w.levels.map(t => t.replace(/\+([\d.]+) damage/g, (m, n) => `+${nerf(parseFloat(n))} damage`));
    }
    for (const [key, val] of Object.entries(d.passives)) {
      const have = cfg.passives[key];
      if (!have) continue;
      if (have.effect !== 'hearts' && have.effect !== 'count') { have.amount = val.amount; have.blurb = val.blurb; }
      if (key === 'heart' && have.max === 5) have.max = val.max;
    }
    const OLD_BAL = { maxEnemies: 150, spawnGrowth: 0.03, crowdGrowth: 0.6, hpGrowth: 85, sparkBoss: 4 };
    for (const [k, v] of Object.entries(OLD_BAL)) if (cfg.balance[k] === v) cfg.balance[k] = d.balance[k];
  }
  // Signature weapon power ranks were renumbered when achievement characters arrived (v17)
  if (seen < 18) for (const [k, w] of Object.entries(d.weapons)) if (w.tier && cfg.weapons[k]) cfg.weapons[k].tier = w.tier;
  // Even harder (v14): every character starts with 3 fewer hearts (at least 1), weaker Lodestone
  if (seen < 14) {
    for (const c of cfg.characters) if (typeof c.hearts === 'number') c.hearts = Math.max(1, c.hearts - 3);
    for (const c of cfg.characters) if (/^Only \d hearts$/.test(c.drawback || '')) c.drawback = 'Only 1 heart';
    const mag = cfg.passives.magnet;
    if (mag && mag.amount === 0.28) { mag.amount = d.passives.magnet.amount; mag.blurb = d.passives.magnet.blurb; }
  }
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
  const REMOVED_CHARS = ['hunter', 'tamer'];
  cfg.characters = cfg.characters.filter(c => !REMOVED_CHARS.includes(c.key));
  for (const [k, w] of Object.entries(cfg.weapons)) if (REMOVED_CHARS.includes(w.signature)) delete cfg.weapons[k];
  // Old default that the faster start replaced
  if (cfg.balance.spawnBase === 1.1) cfg.balance.spawnBase = d.balance.spawnBase;
  if ([0.15, 0.03].includes(cfg.balance.treasureChance)) cfg.balance.treasureChance = d.balance.treasureChance;
  if (cfg.balance.bossTreasureChance == null) cfg.balance.bossTreasureChance = d.balance.bossTreasureChance;
  // Lush restyle (v19): every age gets the new scenery, ground colour and no cave paintings
  if (seen < 19) for (const a of cfg.ages) {
    const nd = d.ages.find(x => x.key === a.key);
    if (nd) { a.decor = nd.decor; a.bg = nd.bg; a.paintings = nd.paintings; }
  }
  // Tougher enemies (v20): health grows faster within an age, if never edited
  if (seen < 20 && cfg.balance.hpGrowth === 50) cfg.balance.hpGrowth = d.balance.hpGrowth;
  // Bram nerf (v21): weaker Battle Lute and less bonus XP, if never edited
  if (seen < 21) {
    const lute = cfg.weapons.battlelute, nl = d.weapons.battlelute;
    if (lute && lute.stats.dmg.base === 14 && lute.stats.dmg.per === 5) { lute.stats = JSON.parse(JSON.stringify(nl.stats)); lute.levels = [...nl.levels]; }
    const bard = cfg.characters.find(c => c.key === 'bard'), nb = d.characters.find(c => c.key === 'bard');
    if (bard && bard.xpMul === 1.25) { bard.xpMul = nb.xpMul; bard.perk = nb.perk; }
  }
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
