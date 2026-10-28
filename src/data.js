// Game content, loaded from src/content (defaults + edits made in the editor).
import { loadConfig, weaponStats } from './content/config.js';

export const CFG = loadConfig();
export const BAL = CFG.balance;
export const AGE_LENGTH = BAL.ageLength;
export const AGES = CFG.ages;
export const ENEMIES = CFG.enemies;
export const WEAPONS = CFG.weapons;
export const PASSIVES = CFG.passives;
export const SHOP_ITEMS = CFG.shop;
// Characters taken out of the game for now (Aidan's playtest: build up again from Grug).
// Their data stays in defaults.js; take a key out of this list to bring that character back.
export const HIDDEN_CHARS = ['shaman', 'centurion', 'knight', 'inventor', 'engineer', 'pilot', 'nova', 'bard', 'alchemist', 'inspector', 'rocker', 'zorp'];
export const CHARACTERS = CFG.characters.filter(c => !HIDDEN_CHARS.includes(c.key));
export const RARE_ITEMS = CFG.rareShop;
export const META = CFG.meta;
export const TWISTS = CFG.twists;
export const RELICS = CFG.relics || [];
export const COMBOS = CFG.combos || [];
// Weapons anyone can find; signature weapons belong to one character
export const POOL_WEAPONS = Object.keys(WEAPONS).filter(k => !WEAPONS[k].signature);
// A signature weapon counts as its normal weapon for combos
export const baseWeapon = (k) => (WEAPONS[k] && WEAPONS[k].base) || k;
export const EVENTS = CFG.events || [];
// Index of the age a shared weapon belongs to (0 = from the start)
export const weaponEra = (k) => Math.max(0, AGES.findIndex(a => a.key === (WEAPONS[k] && WEAPONS[k].era)));

// Level-up card rarities. mult = how much bigger this level's stat boost is
// (a Rare Sharp Flint gives +14% damage instead of +12%).
export const RARITIES = [
  { name: 'COMMON', color: 0x9a9aa6, text: '#b8b8c4', mult: 1 },
  { name: 'RARE', color: 0x4a9aff, text: '#7ab8ff', mult: 1.2 },
  { name: 'EPIC', color: 0xb05aff, text: '#c890ff', mult: 1.5 },
  { name: 'LEGENDARY', color: 0xffa020, text: '#ffc040', mult: 2 },
];

// Whole-number passives (hearts, attacks) can't take +20%, so they are only Common or Legendary
export const wholeEffect = (effect) => effect === 'hearts' || effect === 'count';

// A passive's card text with the rarity boost applied ("+12% damage." -> "+14% damage.")
export const boostedBlurb = (blurb, mult) => mult === 1 ? blurb : blurb
  .replace(/\d+(\.\d+)?/g, n => String(Math.round(parseFloat(n) * mult * 10) / 10))
  .replace(/\b([2-9]) max heart\b/, '$1 max hearts')
  .replace(/\b([2-9]) attack\b/, '$1 attacks');

export const statsOf = (key, level) => weaponStats(WEAPONS[key], level);

// What one weapon level adds, worked out from its stats ("+2.4 damage, +1 bounce")
export function levelText(key, level, mult = 1) {
  const w = WEAPONS[key];
  const a = statsOf(key, level - 1), b = statsOf(key, level);
  const d = (k) => (b[k] || 0) - (a[k] || 0);
  const out = [];
  if (d('dmg') > 0) out.push(`+${+(d('dmg') * mult).toFixed(1)} damage`);
  if (d('count') >= 1) out.push(`+${Math.round(d('count'))} ${w.countName || 'attack'}`);
  if (d('bounce') >= 1) out.push(`+${Math.round(d('bounce'))} bounce`);
  if (d('pierce') >= 1) out.push('pierces more');
  if (d('chain') >= 1) out.push(`+${Math.round(d('chain'))} chain`);
  if (d('cd') < 0 || d('tick') < 0 || d('spin') > 0) out.push('faster');
  if (d('length') > 0) out.push('longer');
  else if (d('radius') > 0) out.push('bigger');
  if (d('slow') > 0) out.push('slows more');
  const t = out.slice(0, 3).join(', ');
  return t ? t[0].toUpperCase() + t.slice(1) : 'Stronger';
}

// The first few levels are cheaper so a run gets going quickly
export const xpForLevel = (lvl) => {
  const full = BAL.xpBase + (lvl - 1) * BAL.xpPer + Math.pow(lvl - 1, BAL.xpCurve);
  const early = BAL.xpEarly ?? 1;
  const mul = lvl >= 6 ? 1 : early + (1 - early) * (lvl - 1) / 5;
  return Math.max(2, Math.floor(full * mul));
};
