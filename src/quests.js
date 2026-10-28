// Quests and achievements: lifetime goals that pay Sparks when claimed on the menu.
import { save, persist } from './save.js';
import { WEAPONS, PASSIVES, AGES, ENEMIES, COMBOS, CHARACTERS, RELICS, weaponEra, HIDDEN_WEAPONS } from './data.js';

// Lifetime counters live in save.stats
export function stats() {
  const s = save.stats;
  s.kills ??= save.totalKills || 0;
  s.wk ??= {};       // kills per weapon
  s.combos ??= {};   // combos found
  // Runs lost (counted from before deaths were tracked: runs that didn't end in a first boss win)
  s.deaths ??= Math.max(0, (save.runs || 0) - Object.keys(save.bossesBeaten || {}).length);
  return s;
}

export function bump(key, n = 1) { const s = stats(); s[key] = (s[key] || 0) + n; }
export function best(key, v) { const s = stats(); if (v > (s[key] || 0)) s[key] = v; }

let list = null;
export function allQuests() {
  if (list) return list;
  const st = () => stats();
  list = [
    { id: 'time3', name: 'Survivor', blurb: 'Survive 3 minutes in one run', target: 180, reward: 10, value: () => Math.max(st().bestTime || 0, save.bestTime), time: true },
    { id: 'kills1k', name: 'Hunter', blurb: 'Defeat 1,000 enemies', target: 1000, reward: 20, value: () => st().kills },
    { id: 'level20', name: 'Growing Strong', blurb: 'Reach level 20 in one run', target: 20, reward: 15, value: () => st().bestLevel || 0 },
    { id: 'legend', name: 'Legendary!', blurb: 'Get a Legendary card', target: 1, reward: 15, value: () => st().legendary || 0 },
    { id: 'chests10', name: 'Treasure Hunter', blurb: 'Open 5 treasure chests', target: 5, reward: 20, value: () => st().chests || 0 },
    { id: 'combo3', name: 'Combo Maker', blurb: 'Discover 3 weapon combos', target: 3, reward: 25, value: () => Object.keys(st().combos).length },
    { id: 'thief3', name: 'Thief Catcher', blurb: 'Catch 3 treasure thieves', target: 3, reward: 25, value: () => st().thieves || 0 },
    { id: 'coins400', name: 'Deep Pockets', blurb: 'Collect 400 coins in one run', target: 400, reward: 20, value: () => st().bestCoins || 0 },
    { id: 'elites100', name: 'Elite Hunter', blurb: 'Defeat 100 glowing elites', target: 100, reward: 25, value: () => st().elites || 0 },
    { id: 'brave', name: 'Brave', blurb: 'Summon a boss in the first minute and beat it', target: 1, reward: 30, value: () => st().brave || 0 },
    { id: 'flawless', name: 'Untouchable', blurb: 'Beat a boss without getting hit', target: 1, reward: 40, value: () => st().flawless || 0 },
    { id: 'daily3', name: 'Daily Player', blurb: 'Finish 3 daily challenges', target: 3, reward: 20, value: () => st().dailies || 0 },
    { id: 'time10', name: 'Ten Minutes', blurb: 'Survive 10 minutes in one run', target: 600, reward: 25, value: () => Math.max(st().bestTime || 0, save.bestTime), time: true },
    { id: 'level40', name: 'Evolved', blurb: 'Reach level 40 in one run', target: 40, reward: 30, value: () => st().bestLevel || 0 },
    { id: 'kills10k', name: 'Slayer', blurb: 'Defeat 10,000 enemies', target: 10000, reward: 60, value: () => st().kills },
    { id: 'comboall', name: 'Combo Master', blurb: `Discover all ${COMBOS.length} weapon combos`, target: Math.max(1, COMBOS.length), reward: 50, value: () => Object.keys(st().combos).length },
    { id: 'relic1', name: 'Collector', blurb: 'Take a relic from a treasure chest', target: 1, reward: 20, value: () => st().relics || 0 },
    // Harder goals that unlock the stronger characters
    { id: 'level30', name: 'Seasoned', blurb: 'Reach level 30 in one run', target: 30, reward: 25, value: () => st().bestLevel || 0 },
    { id: 'combo5', name: 'Mad Scientist', blurb: 'Discover 5 weapon combos', target: 5, reward: 35, value: () => Object.keys(st().combos).length },
    { id: 'thief10', name: 'Master Detective', blurb: 'Catch 10 treasure thieves', target: 10, reward: 40, value: () => st().thieves || 0 },
    { id: 'flawless3', name: 'Showstopper', blurb: 'Beat 3 bosses without getting hit', target: 3, reward: 50, value: () => st().flawless || 0 },
    { id: 'elites500', name: 'Elite Slayer', blurb: 'Defeat 500 glowing elites', target: 500, reward: 50, value: () => st().elites || 0 },
    { id: 'deaths20', name: 'Never Give Up', blurb: 'Die 20 times', target: 20, reward: 20, value: () => st().deaths || 0 },
    // Weapon unlocks
    { id: 'fastboss', name: 'Lightning Fast', blurb: 'Defeat a boss within 10 seconds of summoning it', target: 1, reward: 30, value: () => st().fastBoss || 0 },
    { id: 'soloboss', name: 'One and Only', blurb: 'Defeat a boss with only one weapon equipped', target: 1, reward: 30, value: () => st().soloBoss || 0 },
    // Passive unlocks
    { id: 'renmini', name: 'Tea Time', blurb: 'Defeat the Renaissance mini boss', target: 1, reward: 20, value: () => st().renMini || 0 },
    { id: 'loop', name: 'Time Loop', blurb: 'Loop back in time with the Magic Mirror', target: 1, reward: 50, value: () => st().loops || 0 },
  ];
  // Weapon combos are switched off, so their quests are too
  if (!COMBOS.length) list = list.filter(q => !q.id.startsWith('combo'));
  // One per age boss
  AGES.forEach((a, i) => {
    const boss = ENEMIES[a.boss];
    list.push({ id: `boss_${a.key}`, name: `${boss ? boss.name : a.bossName} Slayer`, blurb: `Beat the ${boss ? boss.name : a.bossName}`, target: 1, reward: 15 + 10 * i, value: () => (save.bossesBeaten[a.key] ? 1 : 0) });
  });
  // One per weapon
  for (const [k, w] of Object.entries(WEAPONS)) {
    if (w.signature || HIDDEN_WEAPONS.includes(k)) continue;
    list.push({ id: `wk_${k}`, name: `${w.name} Master`, blurb: `Defeat 500 enemies with the ${w.name}`, target: 500, reward: 15, value: () => st().wk[k] || 0 });
  }
  return list;
}

export const progress = (q) => Math.min(q.target, q.value());
export const isDone = (q) => progress(q) >= q.target;
export const isClaimed = (q) => !!save.quests[q.id];
export const claimable = () => allQuests().filter(q => isDone(q) && !isClaimed(q));
export const doneIds = () => new Set(allQuests().filter(isDone).map(q => q.id));

export function claim(q) {
  if (!isDone(q) || isClaimed(q)) return false;
  save.quests[q.id] = true;
  save.sparks += q.reward;
  persist();
  return true;
}

// Whether an unlock goal is met.
// unlock: 'start', a boss key, 'kills:N' (enemies defeated over all runs) or 'quest:<id>' (an achievement)
export function goalMet(item) {
  const u = String(item.unlock || '');
  if (!u || u === 'start') return true;
  if (u.startsWith('kills:')) return save.totalKills >= (parseInt(u.slice(6), 10) || 0);
  if (u.startsWith('quest:')) { const q = allQuests().find(x => x.id === u.slice(6)); return !!q && isDone(q); }
  return AGES.some(a => a.boss === u && save.bossesBeaten[a.key]);
}

// Things with a Sparks cost are bought on the UNLOCK menu once their goal is met
export const unlockId = (type, key) => `${type}:${key}`;
export const bought = (type, key) => !!save.unlocks[unlockId(type, key)];

export function charUnlocked(ch) {
  return goalMet(ch) && (!ch.cost || bought('char', ch.key));
}

export function weaponUnlocked(key) {
  const w = WEAPONS[key];
  return !!w && (!w.cost || bought('weapon', key));
}

export function passiveUnlocked(key) {
  const p = PASSIVES[key];
  return !!p && goalMet(p) && (!p.cost || bought('passive', key));
}

// Rows for one UNLOCK menu tab ('weapon', 'passive' or 'relic').
// goal: what's still needed; ready: the goal is met so it can be bought for cost Sparks
export function unlockList(tab) {
  const out = [];
  if (tab === 'weapon') {
    for (const [k, w] of Object.entries(WEAPONS)) {
      if (HIDDEN_WEAPONS.includes(k)) continue;
      const row = { type: 'weapon', key: k, name: w.name, icon: w.icon, blurb: w.blurb, cost: w.cost || 0, item: w };
      if (w.signature) {
        // A character's own weapon: unlocked along with the character (hidden characters' are left out)
        const ch = CHARACTERS.find(c => c.key === w.signature);
        if (!ch) continue;
        Object.assign(row, { unlocked: charUnlocked(ch), goal: `Unlock ${ch.name} to find it` });
      } else if (w.cost) {
        Object.assign(row, { unlocked: bought('weapon', k), ready: goalMet(w), goal: goalText(w) });
      } else {
        // Shared weapons from later ages turn up once you reach their age
        const era = weaponEra(k);
        Object.assign(row, { order: era, unlocked: era === 0 || !!save.weaponsFound[k], goal: `Reach the ${titleCase(AGES[era].name)} to find it` });
      }
      out.push(row);
    }
  } else if (tab === 'passive') {
    for (const [k, p] of Object.entries(PASSIVES)) {
      out.push({ type: 'passive', key: k, name: p.name, icon: p.icon, blurb: p.blurb, cost: p.cost || 0, item: p,
        unlocked: passiveUnlocked(k), ready: goalMet(p), goal: goalText(p) });
    }
  } else {
    for (const r of RELICS) {
      out.push({ type: 'relic', key: r.id, name: r.name, icon: r.icon, blurb: r.blurb, cost: r.cost, item: r,
        unlocked: !!save.relics[r.id], ready: true, goal: `Unlock it for ${r.cost} Sparks, then find it in treasure chests during a run.` });
    }
  }
  // Unlocked, then ready to buy with Sparks, then still locked
  const rank = (r) => (r.unlocked ? 0 : r.ready && r.cost ? 1 : 2);
  return out.sort((a, b) => rank(a) - rank(b) || (a.order || 0) - (b.order || 0));
}

const titleCase = (t) => String(t).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

// The goal still to reach for an unlockable, with progress ("Die 20 times 12/20")
export function goalText(item) {
  const u = String(item.unlock || '');
  if (u.startsWith('kills:')) { const k = parseInt(u.slice(6), 10) || 0; return `Defeat ${k} enemies ${Math.min(save.totalKills, k)}/${k}`; }
  if (u.startsWith('quest:')) {
    const q = allQuests().find(x => x.id === u.slice(6));
    if (!q) return item.unlockText || '';
    return `${item.unlockText || q.blurb}${q.target > 1 && !q.time ? ` ${progress(q)}/${q.target}` : ''}`;
  }
  const a = AGES.find(x => x.boss === u);
  return a ? `Beat the ${ENEMIES[u] ? ENEMIES[u].name : a.bossName}` : '';
}

export function buyUnlock(u) {
  if (u.unlocked || !u.cost || !u.ready || save.sparks < u.cost) return false;
  save.sparks -= u.cost;
  if (u.type === 'relic') save.relics[u.key] = true;
  else save.unlocks[unlockId(u.type, u.key)] = true;
  persist();
  return true;
}

// Signature weapons of unlocked characters: anyone can be offered them
export function unlockedSignatures() {
  return Object.keys(WEAPONS).filter(k => {
    const ch = CHARACTERS.find(c => c.key === WEAPONS[k].signature);
    return ch && charUnlocked(ch);
  });
}

// The unfinished goal closest to done, for the "so close" note on the results screen
export function closestGoal(characters) {
  let bestGoal = null;
  const consider = (frac, textFn) => { if (frac >= 0.5 && frac < 1 && (!bestGoal || frac > bestGoal.frac)) bestGoal = { frac, text: textFn() }; };
  for (const ch of characters) {
    const m = String(ch.unlock || '').match(/^kills:(\d+)$/);
    if (!m) continue;
    const need = +m[1], have = stats().kills;
    consider(have / need, () => `${need - have} more kills to unlock ${ch.name}!`);
  }
  for (const q of allQuests()) {
    if (isDone(q) || q.target <= 1) continue;
    const p = progress(q);
    consider(p / q.target, () => `Quest "${q.name}": ${q.time ? `${Math.floor(p / 60)}:${String(Math.floor(p % 60)).padStart(2, '0')}` : p}/${q.time ? `${q.target / 60}:00` : q.target}`);
  }
  return bestGoal ? bestGoal.text : '';
}
