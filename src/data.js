// Game content, loaded from src/content (defaults + edits made in the editor).
import { loadConfig, weaponStats } from './content/config.js';

export const CFG = loadConfig();
export const BAL = CFG.balance;
export const AGE_LENGTH = BAL.ageLength;
export const AGES = CFG.ages;
export const ENEMIES = CFG.enemies;
export const WEAPONS = CFG.weapons;
// Weapons and passives taken out of the game for now (data kept; take a key out to bring it back)
export const HIDDEN_WEAPONS = ['club', 'axes', 'spear', 'dynamite', 'nailgun', 'bonetoss'];
export const HIDDEN_PASSIVES = ['heart'];
// Random age events taken out of the game (the treasure thief, Lauren 2026-10-28)
export const HIDDEN_EVENTS = ['thief'];
export const PASSIVES = Object.fromEntries(Object.entries(CFG.passives).filter(([k]) => !HIDDEN_PASSIVES.includes(k)));
export const SHOP_ITEMS = CFG.shop;
// Characters taken out of the game for now (Aidan's playtest: build up again from Grug).
// Their data stays in defaults.js; take a key out of this list to bring that character back.
export const HIDDEN_CHARS = ['shaman', 'centurion', 'knight', 'inventor', 'engineer', 'pilot', 'nova', 'bard', 'alchemist', 'inspector', 'rocker', 'zorp'];
export const CHARACTERS = CFG.characters.filter(c => !HIDDEN_CHARS.includes(c.key));
export const RARE_ITEMS = CFG.rareShop;
export const META = CFG.meta;
export const TWISTS = CFG.twists;
export const RELICS = CFG.relics || [];
// Weapon combos are switched off (Lauren, 2026-10-28); CFG.combos still holds them
export const COMBOS = [];
// Weapons anyone can find; signature weapons belong to one character
export const POOL_WEAPONS = Object.keys(WEAPONS).filter(k => !WEAPONS[k].signature && !HIDDEN_WEAPONS.includes(k));
// A signature weapon counts as its normal weapon for combos
export const baseWeapon = (k) => (WEAPONS[k] && WEAPONS[k].base) || k;
export const EVENTS = (CFG.events || []).filter(e => !HIDDEN_EVENTS.includes(e.id));
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

// Whole-number passives (hearts) can't take +20%, so they are only Common or Legendary
export const wholeEffect = (effect) => effect === 'hearts';

// A passive's card text with the rarity boost applied ("+12% damage." -> "+14% damage.")
export const boostedBlurb = (blurb, mult) => mult === 1 ? blurb : blurb
  .replace(/\d+(\.\d+)?/g, n => String(Math.round(parseFloat(n) * mult * 10) / 10))
  .replace(/\b([2-9]) max heart\b/, '$1 max hearts')
  .replace(/\b([2-9]) attack\b/, '$1 attacks');

export const statsOf = (key, level) => weaponStats(WEAPONS[key], level);

// Weapon level-ups: each one raises a single stat, picked at random from the weapon's stats.
// Whole-number stats (attacks, chain, pierce, bounce) go up by 1, as many times as the weapon's
// old level table allowed. The other stats take a bigger step than the old per-level amount,
// since they now share the level-ups, so a maxed weapon ends up about as strong as before.
const WHOLE_STATS = ['count', 'chain', 'pierce', 'bounce'];
const LEVEL_UPS = 29;
export function upgradeOptions(key) {
  const w = WEAPONS[key];
  const st = w.stats || {};
  const whole = [], cont = [];
  for (const [k, s] of Object.entries(st)) {
    if (!s || typeof s !== 'object') continue;
    if (WHOLE_STATS.includes(k)) {
      const cap = s.at ? s.at.filter(l => l > 1).length : Math.round((s.per || 0) * LEVEL_UPS);
      if (cap > 0) whole.push({ stat: k, whole: true, cap });
    } else if (s.per) cont.push({ stat: k, per: s.per });
  }
  const wholeUps = whole.reduce((a, o) => a + o.cap, 0);
  const share = cont.length ? Math.max(1, LEVEL_UPS - wholeUps) / cont.length : 1;
  for (const o of cont) o.step = (o.per * LEVEL_UPS) / share;
  return [...whole, ...cont];
}

const round = (n, d) => +n.toFixed(d);
// Card text for one weapon upgrade, with the exact amount ("+1 swing", "+8.4 damage")
export function upgradeText(key, stat, amount) {
  const w = WEAPONS[key];
  const s = w.stats[stat] || {};
  const n = Math.abs(amount);
  switch (stat) {
    case 'count': { const name = w.countName || 'attack'; return `+${n} ${name}${n > 1 ? 's' : ''}`; }
    case 'chain': return `+${n} chain`;
    case 'pierce': return `+${n} pierce`;
    case 'bounce': return `+${n} bounce${n > 1 ? 's' : ''}`;
    case 'dmg': return `+${round(n, 1)} damage`;
    case 'cd': return `-${round(n, 2)}s between attacks`;
    case 'tick': return `-${round(n, 2)}s between burns`;
    case 'spin': return `+${round(n, 1)} spin speed`;
    case 'slow': return `Slows ${Math.round(n * 100)}% more`;
    case 'size': return `+${Math.round((n / (s.base || 1)) * 100)}% size`;
    case 'radius': return `+${Math.round(n)} ${w.behavior === 'swing' ? 'reach' : 'area'}`;
    case 'length': return `+${Math.round(n)} reach`;
    case 'range': return `+${Math.round(n)} range`;
    default: return `+${round(n, 2)} ${stat}`;
  }
}

// What one weapon level adds, worked out from its stats ("+2.4 damage, +1 bounce")
export function levelText(key, level, mult = 1) {
  const w = WEAPONS[key];
  const a = statsOf(key, level - 1), b = statsOf(key, level);
  const d = (k) => (b[k] || 0) - (a[k] || 0);
  const out = [];
  if (d('dmg') > 0) out.push(`+${+(d('dmg') * mult).toFixed(1)} damage`);
  if (d('count') > 0) out.push(`+${+(d('count') * (d('count') < 1 ? mult : 1)).toFixed(2)} ${w.countName || 'attack'}`);
  if (d('bounce') >= 1) out.push(`+${Math.round(d('bounce'))} bounce`);
  if (d('pierce') >= 1) out.push('pierces more');
  if (d('chain') >= 1) out.push(`+${Math.round(d('chain'))} chain`);
  if (d('cd') < 0 || d('tick') < 0 || d('spin') > 0) out.push('faster');
  if (d('length') > 0) out.push('longer');
  else if (d('radius') > 0) out.push('bigger');
  if (d('slow') > 0) out.push('slows more');
  if (d('range') > 0) out.push('more range');
  if (d('size') > 0) out.push('bigger');
  const t = out.slice(0, 5).join(', ');
  return t ? t[0].toUpperCase() + t.slice(1) : 'Stronger';
}

// The first few levels are cheaper so a run gets going quickly
export const xpForLevel = (lvl) => {
  const full = BAL.xpBase + (lvl - 1) * BAL.xpPer + Math.pow(lvl - 1, BAL.xpCurve);
  const early = BAL.xpEarly ?? 1;
  const mul = lvl >= 6 ? 1 : early + (1 - early) * (lvl - 1) / 5;
  return Math.max(2, Math.floor(full * mul));
};
