// Device saves. A copy can be backed up online when Supabase is set up (see online.js).
const KEY = 'eod-save-v1';

const DEFAULTS = {
  bossesBeaten: {},
  settings: { music: 0.5, sfx: 0.7, damageNumbers: true, vibration: true, shake: true },
  runs: 0,
  bestTime: 0,
  totalKills: 0,
  seenHint: false,
  seenShield: false,
  sparks: 0,          // carry-over currency, spent on permanent upgrades
  upgrades: {},       // meta upgrade id -> level
  relics: {},         // relic id -> true once unlocked with Sparks
  daily: { date: '', best: 0, bestKills: 0, played: false },
  tutorialDone: false,
  stats: {},          // lifetime counters for quests (see quests.js)
  quests: {},         // quest id -> true once its reward is claimed
  history: [],        // best runs on this device, for the scores screen
  playerName: '',
  cloudCode: '',      // secret code for the online backup
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
      relics: { ...(data.relics || {}) },
      daily: { ...DEFAULTS.daily, ...(data.daily || {}) },
      stats: { ...(data.stats || {}) },
      quests: { ...(data.quests || {}) },
      history: Array.isArray(data.history) ? data.history : [],
      // Players from before the tutorial existed already know how to move
      tutorialDone: data.tutorialDone ?? !!data.seenHint,
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
  save.sparks = 0; save.upgrades = {}; save.relics = {};
  save.daily = structuredClone(DEFAULTS.daily);
  save.stats = {}; save.quests = {}; save.history = [];
  save.tutorialDone = false;
  persist();
}
