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

export const statsOf = (key, level) => weaponStats(WEAPONS[key], level);

export const xpForLevel = (lvl) => Math.floor(BAL.xpBase + (lvl - 1) * BAL.xpPer + Math.pow(lvl - 1, BAL.xpCurve));
