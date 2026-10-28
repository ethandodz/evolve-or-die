// Online scores and cloud saves through Supabase. Turned off until src/content/online.json
// has the project's URL and public (anon) key. See supabase/README.md for the setup.
import ONLINE from './content/online.json';
import { save, persist, dropUnearnedWeapons } from './save.js';

const URL = (ONLINE && ONLINE.url || '').replace(/\/$/, '');
const KEY = ONLINE && ONLINE.key || '';
export const onlineEnabled = !!(URL && KEY);

async function rpc(fn, body) {
  if (!onlineEnabled) throw new Error('offline');
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    // New-style publishable keys (sb_publishable_...) go in apikey only; older anon keys are JWTs and go in both
    headers: { apikey: KEY, ...(KEY.startsWith('sb_') ? {} : { Authorization: `Bearer ${KEY}` }), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${fn} failed: ${res.status}`);
  const t = await res.text();
  return t ? JSON.parse(t) : null;
}

// A long random code that identifies this player's online backup
export function cloudCode() {
  if (!save.cloudCode) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const a = new Uint32Array(12);
    crypto.getRandomValues(a);
    save.cloudCode = [...a].map(n => chars[n % chars.length]).join('');
    persist();
  }
  return save.cloudCode;
}

export function playerName() {
  if (!save.playerName) { save.playerName = `PLAYER${Math.floor(1000 + Math.random() * 9000)}`; persist(); }
  return save.playerName;
}

export function submitScore(run) {
  if (!onlineEnabled || run.time < 30) return Promise.resolve(null);
  return rpc('submit_score', {
    p_code: cloudCode(), p_name: playerName(), p_time: Math.floor(run.time), p_kills: run.kills,
    p_age: run.age, p_character: run.character, p_daily: run.daily || null,
  }).catch(() => null);
}

// daily: a date string for that day's challenge, or null for all-time
export const topScores = (daily = null) => rpc('top_scores', { p_daily: daily, p_limit: 10 });

// The whole device save, minus settings that belong to this device
function backupData() {
  const { settings, ...rest } = save;
  return rest;
}

export const cloudBackup = () => rpc('save_progress', { p_code: cloudCode(), p_data: backupData() });

export async function cloudRestore(code) {
  const data = await rpc('load_progress', { p_code: code.trim().toUpperCase() });
  if (!data) return false;
  Object.assign(save, data, { cloudCode: code.trim().toUpperCase(), settings: save.settings });
  dropUnearnedWeapons();
  persist();
  return true;
}
