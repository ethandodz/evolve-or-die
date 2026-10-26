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

export const statsOf = (key, level) => weaponStats(WEAPONS[key], level);

// The first few levels are cheaper so a run gets going quickly
export const xpForLevel = (lvl) => {
  const full = BAL.xpBase + (lvl - 1) * BAL.xpPer + Math.pow(lvl - 1, BAL.xpCurve);
  const early = BAL.xpEarly ?? 1;
  const mul = lvl >= 6 ? 1 : early + (1 - early) * (lvl - 1) / 5;
  return Math.max(2, Math.floor(full * mul));
};
