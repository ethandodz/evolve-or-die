// Quests and achievements: lifetime goals that pay Sparks when claimed on the menu.
import { save, persist } from './save.js';
import { WEAPONS, AGES, ENEMIES, COMBOS } from './data.js';

// Lifetime counters live in save.stats
export function stats() {
  const s = save.stats;
  s.kills ??= save.totalKills || 0;
  s.wk ??= {};       // kills per weapon
  s.combos ??= {};   // combos found
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
    { id: 'chests10', name: 'Treasure Hunter', blurb: 'Open 10 treasure chests', target: 10, reward: 20, value: () => st().chests || 0 },
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
    { id: 'loop', name: 'Time Loop', blurb: 'Loop back in time with the Magic Mirror', target: 1, reward: 50, value: () => st().loops || 0 },
  ];
  // One per age boss
  AGES.forEach((a, i) => {
    const boss = ENEMIES[a.boss];
    list.push({ id: `boss_${a.key}`, name: `${boss ? boss.name : a.bossName} Slayer`, blurb: `Beat the ${boss ? boss.name : a.bossName}`, target: 1, reward: 15 + 10 * i, value: () => (save.bossesBeaten[a.key] ? 1 : 0) });
  });
  // One per weapon
  for (const [k, w] of Object.entries(WEAPONS)) {
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
