// Device saves for the MVP (cloud saves with Supabase come later).
const KEY = 'eod-save-v1';

const DEFAULTS = {
  bossesBeaten: {},
  settings: { music: 0.5, sfx: 0.7, damageNumbers: true },
  runs: 0,
  bestTime: 0,
  totalKills: 0,
  seenHint: false,
  seenShield: false,
  sparks: 0,          // carry-over currency, spent on permanent upgrades
  upgrades: {},       // meta upgrade id -> level
  daily: { date: '', best: 0, bestKills: 0, played: false },
};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const data = JSON.parse(raw);
    return {
      ...structuredClone(DEFAULTS), ...data,
      settings: { ...DEFAULTS.settings, ...(data.settings || {}) },
      upgrades: { ...(data.upgrades || {}) },
      daily: { ...DEFAULTS.daily, ...(data.daily || {}) },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export const save = load();

export function persist() {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* private mode */ }
}

export function resetProgress() {
  save.bossesBeaten = {};
  save.runs = 0; save.bestTime = 0; save.totalKills = 0;
  save.sparks = 0; save.upgrades = {};
  save.daily = structuredClone(DEFAULTS.daily);
  persist();
}
