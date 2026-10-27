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
export const CHARACTERS = CFG.characters;
export const RARE_ITEMS = CFG.rareShop;
export const META = CFG.meta;
export const TWISTS = CFG.twists;
export const RELICS = CFG.relics || [];
export const RELIC_CHANCE = CFG.relicChance ?? 0.5;
export const COMBOS = CFG.combos || [];
// Weapons anyone can find; signature weapons belong to one character
export const POOL_WEAPONS = Object.keys(WEAPONS).filter(k => !WEAPONS[k].signature);
// A signature weapon counts as its normal weapon for combos
export const baseWeapon = (k) => (WEAPONS[k] && WEAPONS[k].base) || k;
export const EVENTS = CFG.events || [];

// Level-up card rarities. mult = how much bigger this level's stat boost is
// (a Rare Sharp Flint gives +14% damage instead of +12%).
export const RARITIES = [
  { name: 'COMMON', color: 0xe8c070, text: '#e8c070', mult: 1 },
  { name: 'RARE', color: 0x4a9aff, text: '#7ab8ff', mult: 1.2 },
  { name: 'EPIC', color: 0xb05aff, text: '#c890ff', mult: 1.5 },
  { name: 'LEGENDARY', color: 0xffa020, text: '#ffc040', mult: 2 },
];

// Whole-number passives (hearts, attacks) can't take +20%, so they are only Common or Legendary
export const wholeEffect = (effect) => effect === 'hearts' || effect === 'count';

// A passive's card text with the rarity boost applied ("+12% damage." -> "+14% damage.")
export const boostedBlurb = (blurb, mult) => mult === 1 ? blurb : blurb
  .replace(/\d+(\.\d+)?/g, n => String(Math.round(parseFloat(n) * mult)))
  .replace(/\b([2-9]) max heart\b/, '$1 max hearts')
  .replace(/\b([2-9]) attack\b/, '$1 attacks');

export const statsOf = (key, level) => weaponStats(WEAPONS[key], level);

// The first few levels are cheaper so a run gets going quickly
export const xpForLevel = (lvl) => {
  const full = BAL.xpBase + (lvl - 1) * BAL.xpPer + Math.pow(lvl - 1, BAL.xpCurve);
  const early = BAL.xpEarly ?? 1;
  const mul = lvl >= 6 ? 1 : early + (1 - early) * (lvl - 1) / 5;
  return Math.max(2, Math.floor(full * mul));
};
