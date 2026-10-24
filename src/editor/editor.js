// Evolve or Die editor: change characters, enemies, weapons, passives, ages, shop,
// balance and pixel art. Changes save on this device and the game picks them up.
import '@fontsource/press-start-2p';
import './editor.css';
import { loadConfig, saveConfig, resetConfig, baseConfig, weaponStats, takeUpdateNotice, getBackup } from '../content/config.js';
import { BEHAVIORS, PASSIVE_EFFECTS, BOSS_ATTACKS, MUSIC, GROUNDS } from '../content/defaults.js';
import { buildDefaultSprites, getSprite, spriteToCanvas, SPRITE_GROUPS, CHARS } from '../art.js';
import { PixelEditor } from './pixel.js';

let cfg = loadConfig();
const state = { tab: 'characters', sel: {}, updated: takeUpdateNotice() };

// ---------------------------------------------------------------------------
// Tiny DOM helpers
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'style') el.style.cssText = v;
    else if (v !== undefined && v !== null && v !== false) el.setAttribute(k, v === true ? '' : v);
  }
  for (const c of kids.flat(Infinity)) if (c !== null && c !== undefined && c !== false) el.append(c.nodeType ? c : document.createTextNode(String(c)));
  return el;
}
const app = document.getElementById('app');

let saveTimer = null;
function changed(rerender = false) {
  clearTimeout(saveTimer);
  const st = document.getElementById('status');
  if (st) st.textContent = 'Saving...';
  saveTimer = setTimeout(() => {
    const ok = saveConfig(cfg);
    if (st) st.textContent = ok ? 'Saved' : 'Could not save!';
    renderWarnings();
  }, 250);
  if (rerender) render();
}

const allSprites = () => ({ ...buildDefaultSprites(), ...cfg.sprites });
function spriteCanvas(key, size = 32, frame = 0) {
  const sp = getSprite(key, cfg.sprites);
  const c = h('canvas', { width: size, height: size });
  if (!sp) return c;
  const { canvas, w, h: hh } = spriteToCanvas(sp, Math.min(frame, sp.frames.length - 1));
  const s = Math.max(1, Math.floor(Math.min(size / w, size / hh)) || 1);
  const sc = Math.min(size / w, size / hh) < 1 ? Math.min(size / w, size / hh) : s;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, (size - w * sc) / 2, (size - hh * sc) / 2, w * sc, hh * sc);
  return c;
}

// ---------------------------------------------------------------------------
// Form fields bound to an object
function field(label, input, hint) {
  return h('div', { class: 'field' }, h('label', {}, label), input, hint ? h('div', { class: 'hint' }, hint) : null);
}
function num(obj, key, label, hint, opts = {}) {
  const inp = h('input', { type: 'number', step: opts.step || 'any', value: obj[key] ?? '' });
  inp.addEventListener('input', () => { const v = parseFloat(inp.value); if (!isNaN(v)) { obj[key] = v; changed(); opts.after && opts.after(); } });
  return field(label, inp, hint);
}
function txt(obj, key, label, hint, opts = {}) {
  const inp = opts.area ? h('textarea', {}, obj[key] ?? '') : h('input', { type: 'text', value: obj[key] ?? '' });
  inp.addEventListener('input', () => { obj[key] = opts.upper ? inp.value.toUpperCase() : inp.value; changed(); opts.after && opts.after(); });
  return field(label, inp, hint);
}
function sel(obj, key, label, options, hint, opts = {}) {
  const s = h('select', {}, options.map(o => {
    const [value, text] = Array.isArray(o) ? o : [o, o];
    return h('option', { value, selected: String(obj[key]) === String(value) }, text);
  }));
  s.addEventListener('change', () => { obj[key] = s.value; changed(opts.rerender); opts.after && opts.after(); });
  return field(label, s, hint);
}
function check(obj, key, label) {
  const inp = h('input', { type: 'checkbox', checked: !!obj[key] });
  inp.addEventListener('change', () => { obj[key] = inp.checked; changed(); });
  return h('div', { class: 'field check' }, inp, h('label', {}, label));
}
function color(obj, key, label) {
  const inp = h('input', { type: 'color', value: obj[key] || '#ffffff' });
  inp.addEventListener('input', () => { obj[key] = inp.value; changed(); });
  return field(label, inp);
}
function spritePick(obj, key, label, hint) {
  const keys = Object.keys(allSprites()).sort();
  const prev = h('span');
  const update = () => { prev.replaceChildren(spriteCanvas(obj[key], 40)); };
  const s = h('select', {}, keys.map(k => h('option', { value: k, selected: obj[key] === k }, k)));
  s.addEventListener('change', () => { obj[key] = s.value; update(); changed(); });
  update();
  return field(label, h('div', { class: 'spritepick' }, prev, s), hint);
}
function multiChips(arr, options, onChange, withSprites = false) {
  const wrap = h('div', { class: 'chips' });
  const draw = () => {
    wrap.replaceChildren(...options.map(([value, text]) => {
      const on = arr.includes(value);
      return h('span', {
        class: 'chip' + (on ? ' on' : ''),
        onclick: () => {
          if (on) arr.splice(arr.indexOf(value), 1); else arr.push(value);
          draw(); onChange();
        },
      }, withSprites ? spriteCanvas(value, 20) : null, text);
    }));
  };
  draw();
  return wrap;
}
// Ordered list (duplicates allowed), e.g. boss attack pattern
function orderedList(arr, options, onChange) {
  const wrap = h('div');
  const draw = () => {
    wrap.replaceChildren(
      h('div', { class: 'chips' }, arr.map((v, i) => h('span', { class: 'chip on', title: 'Click to remove', onclick: () => { arr.splice(i, 1); draw(); onChange(); } }, `${i + 1}. ${v} ✕`))),
      h('div', { class: 'chips', style: 'margin-top:6px' }, options.map(o => h('span', { class: 'chip', onclick: () => { arr.push(o); draw(); onChange(); } }, `+ ${o}`))),
    );
  };
  draw();
  return wrap;
}

function uniqueKey(name, taken) {
  let base = String(name || 'new').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'new';
  let k = base, i = 2;
  while (taken.includes(k)) k = `${base}_${i++}`;
  return k;
}

// ---------------------------------------------------------------------------
// Layout
const TABS = [
  ['characters', 'Characters'], ['enemies', 'Enemies'], ['weapons', 'Weapons'], ['passives', 'Passives'],
  ['ages', 'Ages'], ['shop', 'Shop'], ['balance', 'Balance'], ['art', 'Pixel Art'], ['requests', 'Requests'],
];
const TAB_NAMES = Object.fromEntries(TABS);

function render() {
  app.replaceChildren(
    h('header', {},
      h('h1', {}, 'EVOLVE OR DIE · EDITOR'),
      h('span', { id: 'status', class: 'status' }, 'Saved'),
      h('span', { class: 'spacer' }),
      h('button', { class: 'btn primary', onclick: () => window.open('./?test', '_blank') }, '▶ Play test (short ages)'),
      h('button', { class: 'btn', onclick: () => window.open('./', '_blank') }, '▶ Play'),
      h('button', { class: 'btn', onclick: askClaude }, '💬 Ask Claude'),
      h('button', { class: 'btn', onclick: exportConfig }, 'Export'),
      h('button', { class: 'btn', onclick: importConfig }, 'Import'),
      h('button', { class: 'btn danger', onclick: resetAll }, 'Reset all'),
    ),
    h('nav', { class: 'tabs' }, TABS.map(([k, label]) => h('button', { class: state.tab === k ? 'active' : '', onclick: () => { state.tab = k; render(); } },
      k === 'requests' && cfg.requests.length ? `${label} (${cfg.requests.length})` : label))),
    state.updated ? h('div', { class: 'banner' }, '✨ Claude\'s latest changes are loaded.',
      getBackup() ? h('button', { class: 'btn small', onclick: restoreBackup }, 'Go back to my previous version') : null,
      h('button', { class: 'btn small', onclick: () => { state.updated = false; render(); } }, 'OK')) : '',
    h('div', { id: 'warnings' }),
    h('main', { id: 'main' }),
  );
  renderWarnings();
  const main = document.getElementById('main');
  ({ characters: renderCharacters, enemies: renderEnemies, weapons: renderWeapons, passives: renderPassives, ages: renderAges, shop: renderShop, balance: renderBalance, art: renderArt, requests: renderRequests })[state.tab](main);
}

function listPanel(items, selKey, onPick, actions) {
  return h('div', { class: 'list' },
    h('div', { class: 'items' }, items.map(it => h('button', { class: 'item' + (it.key === selKey ? ' active' : ''), onclick: () => onPick(it.key) }, it.sprite ? spriteCanvas(it.sprite, 32) : null, h('span', {}, it.label)))),
    h('div', { class: 'actions' }, actions),
  );
}

// ---------------------------------------------------------------------------
// Tabs
function renderCharacters(main) {
  const list = cfg.characters;
  let cur = list.find(c => c.key === state.sel.characters) || list[0];
  state.sel.characters = cur && cur.key;
  main.append(listPanel(list.map(c => ({ key: c.key, label: c.name, sprite: c.sprite })), cur && cur.key, (k) => { state.sel.characters = k; render(); }, [
    h('button', { class: 'btn small', onclick: () => {
      const name = prompt('Character name?', 'NEW HERO'); if (!name) return;
      const c = { ...JSON.parse(JSON.stringify(cur || list[0])), key: uniqueKey(name, list.map(x => x.key)), name: name.toUpperCase(), unlock: 'start' };
      list.push(c); state.sel.characters = c.key; changed(true);
    } }, '+ New'),
    cur && list.length > 1 ? h('button', { class: 'btn small danger', onclick: () => {
      if (!confirm(`Delete ${cur.name}?`)) return;
      list.splice(list.indexOf(cur), 1); state.sel.characters = null; changed(true);
    } }, 'Delete') : null,
    cur ? h('button', { class: 'btn small', onclick: () => { const i = list.indexOf(cur); if (i > 0) { list.splice(i, 1); list.splice(i - 1, 0, cur); changed(true); } } }, '↑ Move up') : null,
  ]));
  if (!cur) return;
  const bosses = Object.entries(cfg.enemies).filter(([, e]) => e.boss).map(([k, e]) => [k, `Beat the ${e.name}`]);
  const prev = h('div', { class: 'preview' });
  const drawPrev = () => prev.replaceChildren(animPreview(cur.sprite, 4));
  drawPrev();
  main.append(h('div', { class: 'form' },
    h('h2', {}, cur.name), h('div', { class: 'sub' }, 'Playable characters. The first 6 show on the character select screen.'),
    prev,
    h('div', { class: 'grid' },
      txt(cur, 'name', 'Name', null, { upper: true }),
      txt(cur, 'title', 'Title'),
      spritePickWith(cur, 'sprite', 'Sprite', drawPrev),
      sel(cur, 'weapon', 'Starting weapon', Object.entries(cfg.weapons).map(([k, w]) => [k, w.name])),
      num(cur, 'hearts', 'Hearts', 'Starting max hearts'),
      num(cur, 'speed', 'Speed multiplier', '1 = normal, 1.2 = 20% faster'),
      sel(cur, 'unlock', 'How to unlock', [['start', 'Unlocked from the start'], ...bosses]),
    ),
  ));
}

function spritePickWith(obj, key, label, after) {
  const f = spritePick(obj, key, label);
  f.querySelector('select').addEventListener('change', after);
  return f;
}

function animPreview(key, scale = 3, bg = '#c49a64') {
  const sp = getSprite(key, cfg.sprites);
  const c = h('canvas', { width: 10, height: 10 });
  if (!sp) return c;
  const { canvas, w, h: hh, n } = spriteToCanvas(sp);
  c.width = w * scale + 16; c.height = hh * scale + 16;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  let f = 0;
  const draw = () => {
    if (!c.isConnected && f > 0) return;
    ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(canvas, (f % n) * w, 0, w, hh, 8, 8, w * scale, hh * scale);
    f++;
    setTimeout(draw, 200);
  };
  draw();
  return c;
}

function renderEnemies(main) {
  const E = cfg.enemies;
  const keys = Object.keys(E);
  let k = keys.includes(state.sel.enemies) ? state.sel.enemies : keys[0];
  state.sel.enemies = k;
  main.append(listPanel(keys.map(x => ({ key: x, label: E[x].name + (E[x].boss ? ' (boss)' : ''), sprite: E[x].sprite })), k, (x) => { state.sel.enemies = x; render(); }, [
    h('button', { class: 'btn small', onclick: () => {
      const name = prompt('Enemy name?', 'New enemy'); if (!name) return;
      const nk = uniqueKey(name, keys);
      E[nk] = { ...JSON.parse(JSON.stringify(E[k] || Object.values(E)[0])), name, boss: false };
      state.sel.enemies = nk; changed(true);
    } }, '+ New'),
    k ? h('button', { class: 'btn small danger', onclick: () => {
      if (!confirm(`Delete ${E[k].name}? Ages that use it will need a new enemy.`)) return;
      delete E[k]; state.sel.enemies = null; changed(true);
    } }, 'Delete') : null,
  ]));
  const e = E[k];
  if (!e) return;
  const prev = h('div', { class: 'preview' });
  const drawPrev = () => prev.replaceChildren(animPreview(e.sprite, 3), h('div', { class: 'note' }, `In game it is ${e.scale}x size. Hit radius ${e.r}.`));
  drawPrev();
  const usedIn = cfg.ages.filter(a => [...(a.basic || []), a.medium, a.elite, a.boss, a.stampede].includes(k)).map(a => a.name);
  main.append(h('div', { class: 'form' },
    h('h2', {}, e.name), h('div', { class: 'sub' }, usedIn.length ? `Used in: ${usedIn.join(', ')}` : 'Not used in any age yet. Add it on the Ages tab.'),
    prev,
    h('div', { class: 'grid' },
      txt(e, 'name', 'Name'),
      spritePickWith(e, 'sprite', 'Sprite', drawPrev),
      num(e, 'hp', 'Health', 'Grows over each age'),
      num(e, 'speed', 'Speed', 'Player is 140'),
      num(e, 'r', 'Hit radius', 'Body size for hits', { after: drawPrev }),
      num(e, 'scale', 'Sprite scale', '1.5 is normal', { after: drawPrev }),
      num(e, 'xp', 'XP dropped', '1 = small gem, 5 = medium, 20 = big'),
      color(e, 'color', 'Hit particle color'),
      check(e, 'heavy', 'Heavy (hard to knock back)'),
      check(e, 'boss', 'Boss'),
    ),
  ));
}

function renderWeapons(main) {
  const Wp = cfg.weapons;
  const keys = Object.keys(Wp);
  let k = keys.includes(state.sel.weapons) ? state.sel.weapons : keys[0];
  state.sel.weapons = k;
  main.append(listPanel(keys.map(x => ({ key: x, label: Wp[x].name, sprite: Wp[x].icon })), k, (x) => { state.sel.weapons = x; render(); }, [
    h('button', { class: 'btn small', onclick: () => {
      const name = prompt('Weapon name?', 'New Weapon'); if (!name) return;
      const nk = uniqueKey(name, keys);
      Wp[nk] = { ...JSON.parse(JSON.stringify(Wp[k])), name };
      state.sel.weapons = nk; changed(true);
    } }, '+ New (copy)'),
    k && keys.length > 1 ? h('button', { class: 'btn small danger', onclick: () => {
      if (!confirm(`Delete ${Wp[k].name}?`)) return;
      delete Wp[k]; state.sel.weapons = null; changed(true);
    } }, 'Delete') : null,
  ]));
  const w = Wp[k];
  if (!w) return;
  w.stats = w.stats || {};
  w.levels = w.levels || [];
  const table = h('div', { class: 'scroll' });
  const preview = h('div', { class: 'scroll' });
  const drawPreview = () => {
    const lv = Array.from({ length: w.max }, (_, i) => i + 1);
    const names = Object.keys(w.stats);
    preview.replaceChildren(h('table', { class: 'stats' },
      h('tr', {}, h('th', {}, 'Stat'), lv.map(l => h('th', {}, `Lv ${l}`))),
      names.map(n => h('tr', {}, h('td', {}, n), lv.map(l => h('td', {}, String(Math.round(weaponStats(w, l)[n] * 100) / 100))))),
    ));
  };
  const drawTable = () => {
    table.replaceChildren(h('table', { class: 'stats' },
      h('tr', {}, h('th', {}, 'Stat'), h('th', {}, 'Level 1 value'), h('th', {}, 'Change per level'), h('th', {}, '+1 at levels (e.g. 3,6)'), h('th', {}, '')),
      Object.entries(w.stats).map(([n, s]) => {
        const inp = (prop, isList) => {
          const i = h('input', { type: 'text', value: isList ? (s.at || []).join(',') : (s[prop] ?? '') });
          i.addEventListener('input', () => {
            if (isList) s.at = i.value.split(',').map(x => parseInt(x)).filter(x => !isNaN(x));
            else { const v = parseFloat(i.value); if (!isNaN(v)) s[prop] = v; else if (i.value === '') delete s[prop]; }
            changed(); drawPreview();
          });
          return i;
        };
        return h('tr', {}, h('td', {}, n), h('td', {}, inp('base')), h('td', {}, inp('per')), h('td', {}, inp('at', true)),
          h('td', {}, h('button', { class: 'btn small', onclick: () => { delete w.stats[n]; changed(); drawTable(); drawPreview(); } }, '✕')));
      }),
    ));
  };
  drawTable(); drawPreview();
  const levelBox = h('div', { class: 'grid' });
  const drawLevels = () => {
    levelBox.replaceChildren(...Array.from({ length: w.max - 1 }, (_, i) => {
      const l = i + 2;
      const inp = h('input', { type: 'text', value: w.levels[l - 1] || '' });
      inp.addEventListener('input', () => { w.levels[l - 1] = inp.value; changed(); });
      return field(`Level ${l} card text`, inp);
    }));
  };
  drawLevels();
  const statNames = ['cd', 'dmg', 'radius', 'length', 'count', 'spin', 'tick', 'slow', 'chain', 'range', 'knockback', 'hitDelay'];
  const addSel = h('select', {}, statNames.filter(n => !w.stats[n]).map(n => h('option', { value: n }, n)));
  main.append(h('div', { class: 'form' },
    h('h2', {}, w.name), h('div', { class: 'sub' }, BEHAVIORS[w.behavior] || ''),
    h('div', { class: 'preview' }, animPreview(w.icon, 4)),
    h('div', { class: 'grid' },
      txt(w, 'name', 'Name'),
      spritePick(w, 'icon', 'Icon / sprite', 'Also used for the weapon in the world'),
      sel(w, 'behavior', 'How it attacks', Object.keys(BEHAVIORS), null, { rerender: true }),
      txt(w, 'kind', 'Type label', 'Shown on the level-up card'),
      num(w, 'max', 'Max level', null, { after: () => { drawLevels(); drawPreview(); } }),
      txt(w, 'blurb', 'Description', null, { area: true }),
    ),
    h('h3', {}, 'STATS'),
    h('div', { class: 'note' }, 'cd = seconds between attacks, dmg = damage, count = number of attacks (Tribal Totem adds more), radius/length = size, spin = orbit speed, tick = seconds between burns, slow = 0.3 means 30% slower, chain = extra jumps.'),
    table,
    h('div', { class: 'row', style: 'margin-top:8px' }, addSel, h('button', { class: 'btn small', onclick: () => { if (!addSel.value) return; w.stats[addSel.value] = { base: 1 }; changed(true); } }, '+ Add stat')),
    h('h3', {}, 'VALUES AT EACH LEVEL'),
    preview,
    h('h3', {}, 'LEVEL-UP CARD TEXT'),
    levelBox,
  ));
}

function renderPassives(main) {
  const P = cfg.passives;
  const keys = Object.keys(P);
  let k = keys.includes(state.sel.passives) ? state.sel.passives : keys[0];
  state.sel.passives = k;
  main.append(listPanel(keys.map(x => ({ key: x, label: P[x].name, sprite: P[x].icon })), k, (x) => { state.sel.passives = x; render(); }, [
    h('button', { class: 'btn small', onclick: () => {
      const name = prompt('Passive name?', 'New Charm'); if (!name) return;
      const nk = uniqueKey(name, keys);
      P[nk] = { ...JSON.parse(JSON.stringify(P[k])), name };
      state.sel.passives = nk; changed(true);
    } }, '+ New'),
    k && keys.length > 1 ? h('button', { class: 'btn small danger', onclick: () => { if (!confirm(`Delete ${P[k].name}?`)) return; delete P[k]; state.sel.passives = null; changed(true); } }, 'Delete') : null,
  ]));
  const p = P[k];
  if (!p) return;
  main.append(h('div', { class: 'form' },
    h('h2', {}, p.name), h('div', { class: 'sub' }, 'Passive items boost your stats. You can hold 3 at a time (see Balance).'),
    h('div', { class: 'preview' }, animPreview(p.icon, 4)),
    h('div', { class: 'grid' },
      txt(p, 'name', 'Name'),
      spritePick(p, 'icon', 'Icon'),
      sel(p, 'effect', 'What it boosts', PASSIVE_EFFECTS.map(e => [e, { hearts: 'Max hearts', speed: 'Move speed (%)', count: 'Attacks per weapon', damage: 'Damage (%)', area: 'Area and range (%)', pickup: 'XP pickup range (%)' }[e]])),
      num(p, 'amount', 'Amount per level', '0.1 = +10% for percent boosts, 1 = +1 otherwise'),
      num(p, 'max', 'Max level'),
      txt(p, 'blurb', 'Description', null, { area: true }),
    ),
  ));
}

function renderAges(main) {
  const A = cfg.ages;
  let i = Math.min(state.sel.ages || 0, A.length - 1);
  state.sel.ages = i;
  main.append(listPanel(A.map((a, j) => ({ key: j, label: `${j + 1}. ${a.name}`, sprite: a.boss && cfg.enemies[a.boss] ? cfg.enemies[a.boss].sprite : null })), i, (j) => { state.sel.ages = j; render(); }, [
    h('button', { class: 'btn small', onclick: () => {
      const name = prompt('Age name?', 'MEDIEVAL'); if (!name) return;
      const a = { ...JSON.parse(JSON.stringify(A[A.length - 1])), key: uniqueKey(name, A.map(x => x.key)), name: name.toUpperCase() };
      A.push(a); state.sel.ages = A.length - 1; changed(true);
    } }, '+ New age'),
    A.length > 1 ? h('button', { class: 'btn small danger', onclick: () => { if (!confirm(`Delete ${A[i].name}?`)) return; A.splice(i, 1); state.sel.ages = 0; changed(true); } }, 'Delete') : null,
    i > 0 ? h('button', { class: 'btn small', onclick: () => { const [a] = A.splice(i, 1); A.splice(i - 1, 0, a); state.sel.ages = i - 1; changed(true); } }, '↑ Earlier') : null,
  ]));
  const a = A[i];
  const enemyOpts = Object.entries(cfg.enemies).filter(([, e]) => !e.boss).map(([k, e]) => [k, e.name]);
  const bossOpts = Object.entries(cfg.enemies).filter(([, e]) => e.boss).map(([k, e]) => [k, e.name]);
  const scenery = SPRITE_GROUPS.Scenery.filter(k => !['handprint', 'deer', 'hunters'].includes(k));
  a.basic = a.basic || []; a.decor = a.decor || []; a.bossAttacks = a.bossAttacks || [];
  main.append(h('div', { class: 'form' },
    h('h2', {}, a.name), h('div', { class: 'sub' }, `Age ${i + 1} of ${A.length}. Ages play in this order; the last one is endless.`),
    h('div', { class: 'grid' },
      txt(a, 'name', 'Name', null, { upper: true }),
      sel(a, 'ground', 'Ground style', GROUNDS.map(g => [g, { cave: 'Cave painting (ochre rock)', mosaic: 'Roman mosaic' }[g] || g])),
      color(a, 'bg', 'Background color'),
      check(a, 'paintings', 'Cave paintings on the ground'),
      num(a, 'hpMul', 'Enemy health multiplier', 'Stone Age is 1'),
      num(a, 'xpMul', 'XP multiplier'),
      sel(a, 'music', 'Music', MUSIC),
      sel(a, 'bossMusic', 'Boss music', MUSIC),
    ),
    h('h3', {}, 'ENEMIES'),
    field('Basic enemies (they unlock in this order as the age goes on)', multiChips(a.basic, enemyOpts, () => changed(), false)),
    h('div', { class: 'grid', style: 'margin-top:12px' },
      sel(a, 'medium', 'Medium enemy (after 40s)', enemyOpts),
      sel(a, 'elite', 'Elite enemy (after 110s, also the mini-boss)', enemyOpts),
      sel(a, 'stampede', 'Stampede enemy', enemyOpts),
    ),
    h('h3', {}, 'BOSS'),
    h('div', { class: 'grid' },
      sel(a, 'boss', 'Boss', bossOpts.length ? bossOpts : [['', 'Mark an enemy as Boss first']]),
      txt(a, 'bossName', 'Boss name on screen', null, { upper: true }),
    ),
    field('Attack pattern (repeats in order). Click a step to remove it.', orderedList(a.bossAttacks, BOSS_ATTACKS, () => changed())),
    h('div', { class: 'note', style: 'margin-top:6px' }, 'charge = dash at you, stomp = shockwave ring, rocks = falling rocks, lunge = 3 bite lines, pools = poison puddles, summon = calls 10 enemies.'),
    h('h3', {}, 'SCENERY'),
    field('Things scattered on the ground (campfires and braziers light up boss fights)', multiChips(a.decor, scenery.map(k => [k, k]), () => changed(), true)),
  ));
}

function renderShop(main) {
  const S = cfg.shop;
  let i = Math.min(state.sel.shop || 0, S.length - 1);
  state.sel.shop = i;
  const effects = [['potion', 'Heal 2 hearts'], ['heartmax', '+1 max heart, full heal'], ['upgrade', 'Level up a random weapon'], ['weapon', 'Random new weapon'], ['power', '+15% damage for the run'], ['reroll', '+2 rerolls']];
  main.append(listPanel(S.map((it, j) => ({ key: j, label: `${it.name} (${it.cost})`, sprite: it.icon })), i, (j) => { state.sel.shop = j; render(); }, [
    h('button', { class: 'btn small', onclick: () => { S.push({ id: 'potion', name: 'New Item', icon: 'potion', cost: 30, blurb: '' }); state.sel.shop = S.length - 1; changed(true); } }, '+ New'),
    S.length > 1 ? h('button', { class: 'btn small danger', onclick: () => { S.splice(i, 1); state.sel.shop = 0; changed(true); } }, 'Delete') : null,
  ]));
  const it = S[i];
  if (!it) return;
  main.append(h('div', { class: 'form' },
    h('h2', {}, it.name), h('div', { class: 'sub' }, 'The time wizard offers 3 random items after each boss. Prices go up 25% per age.'),
    h('div', { class: 'grid' },
      txt(it, 'name', 'Name'),
      spritePick(it, 'icon', 'Icon'),
      sel(it, 'id', 'What it does', effects),
      num(it, 'cost', 'Price (coins)'),
      txt(it, 'blurb', 'Description', null, { area: true }),
    ),
  ));
}

function renderBalance(main) {
  const B = cfg.balance;
  const rows = [
    ['ageLength', 'Seconds before the time police', 'Default 300 (5 minutes)'],
    ['playerSpeed', 'Player move speed'], ['pickupRange', 'XP pickup range'], ['invincibility', 'Safe time after a hit (seconds)'],
    ['weaponSlots', 'Weapon slots'], ['passiveSlots', 'Passive slots'], ['rerolls', 'Rerolls per run'],
    ['maxEnemies', 'Most enemies at once', 'Phones may lag above ~200'],
    ['spawnBase', 'Spawns per second at start'], ['spawnGrowth', 'Extra spawns per second, each second'],
    ['crowdStart', 'Crowd size at start'], ['crowdGrowth', 'Crowd growth per second'],
    ['hpGrowth', 'Enemy health growth', 'Health doubles about every this many seconds'],
    ['miniBossHp', 'Mini-boss health multiplier'], ['stampedeSize', 'Stampede size'],
    ['critChance', 'Critical hit chance', '0.08 = 8%'], ['coinChance', 'Coin drop chance'], ['meatChance', 'Healing meat drop chance'], ['magnetChance', 'Magnet drop chance'],
    ['xpBase', 'XP for level 2'], ['xpPer', 'Extra XP per level'], ['xpCurve', 'XP curve', 'Higher = later levels take much longer'],
    ['bossDarkness', 'Boss fight darkness', '0 = off, 1 = pitch black'],
  ];
  main.append(h('div', { class: 'form', style: 'grid-column: 1 / -1' },
    h('h2', {}, 'Balance'), h('div', { class: 'sub' }, 'Numbers that control the whole game.'),
    h('div', { class: 'grid' }, rows.map(([k, l, hint]) => num(B, k, l, hint))),
  ));
}

// ---------------------------------------------------------------------------
// Pixel art
function renderArt(main) {
  const all = allSprites();
  const key = state.sel.art && all[state.sel.art] ? state.sel.art : null;
  if (!key) {
    const groups = { ...SPRITE_GROUPS };
    const known = new Set(Object.values(groups).flat());
    const custom = Object.keys(all).filter(k => !known.has(k));
    if (custom.length) groups['Your sprites'] = custom;
    main.append(h('div', { class: 'form', style: 'grid-column: 1 / -1' },
      h('div', { class: 'row', style: 'justify-content:space-between' },
        h('div', {}, h('h2', {}, 'Pixel Art'), h('div', { class: 'sub' }, 'Click any sprite to draw on it. Green border = you changed it.')),
        h('button', { class: 'btn primary', onclick: newSprite }, '+ New sprite'),
      ),
      Object.entries(groups).map(([g, keys]) => [
        h('h3', {}, g.toUpperCase()),
        h('div', { class: 'gallery' }, keys.filter(k => all[k]).map(k => h('div', { class: 'tile' + (cfg.sprites[k] ? ' edited' : ''), onclick: () => { state.sel.art = k; render(); } }, spriteCanvas(k, 64), k))),
      ]),
    ));
    return;
  }
  const back = h('button', { class: 'btn', onclick: () => { state.sel.art = null; render(); } }, '← All sprites');
  const box = h('div', { class: 'form', style: 'grid-column: 1 / -1' });
  main.append(box);
  const sp = JSON.parse(JSON.stringify(all[key]));
  const ed = new PixelEditor(box, sp, {
    title: key,
    edited: !!cfg.sprites[key],
    back,
    onChange: (data) => { cfg.sprites[key] = data; changed(); },
    onRevert: () => {
      if (!buildDefaultSprites()[key]) { alert('This is your own sprite, so there is no original. Use Delete instead.'); return; }
      if (!confirm('Go back to the original sprite?')) return;
      delete cfg.sprites[key]; changed(true);
    },
    requests: {
      list: () => cfg.requests.filter(r => r.target === `Sprite: ${key}`),
      add: (text) => addRequest(`Sprite: ${key}`, text),
      remove: removeRequest,
    },
    onDelete: buildDefaultSprites()[key] ? null : () => { if (!confirm(`Delete sprite ${key}?`)) return; delete cfg.sprites[key]; state.sel.art = null; changed(true); },
  });
  ed.mount();
}

function newSprite() {
  const name = prompt('Name for the new sprite (letters and numbers)?', 'my_sprite'); if (!name) return;
  const key = uniqueKey(name, Object.keys(allSprites()));
  const size = prompt('Size in pixels, width x height', '24x32'); if (!size) return;
  const [w, hh] = size.toLowerCase().split('x').map(n => Math.max(4, Math.min(96, parseInt(n) || 24)));
  const row = '.'.repeat(w);
  cfg.sprites[key] = { pal: ['#1e1009', '#ffffff', '#c47e50', '#8a5a34'], frames: [Array(hh).fill(row), Array(hh).fill(row)] };
  state.sel.art = key;
  changed(true);
}

// ---------------------------------------------------------------------------
// Checks for broken references
function renderWarnings() {
  const el = document.getElementById('warnings');
  if (!el) return;
  const out = [];
  const sprites = allSprites();
  const E = cfg.enemies;
  for (const a of cfg.ages) {
    for (const k of [...(a.basic || []), a.medium, a.elite, a.stampede]) if (k && !E[k]) out.push(`${a.name}: enemy "${k}" no longer exists.`);
    if (!(a.basic || []).length) out.push(`${a.name}: needs at least one basic enemy.`);
    if (!a.boss || !E[a.boss]) out.push(`${a.name}: pick a boss.`);
    else if (!E[a.boss].boss) out.push(`${a.name}: ${E[a.boss].name} is not marked as a boss.`);
  }
  for (const c of cfg.characters) if (!cfg.weapons[c.weapon]) out.push(`${c.name}: starting weapon is missing.`);
  for (const [k, e] of Object.entries(E)) if (!sprites[e.sprite]) out.push(`${e.name}: sprite "${e.sprite}" is missing.`);
  for (const w of Object.values(cfg.weapons)) if (!sprites[w.icon]) out.push(`${w.name}: icon "${w.icon}" is missing.`);
  if (!E.timecop) out.push('The "timecop" enemy is needed for the time police.');
  el.replaceChildren(...(out.length ? [h('div', { class: 'warnings' }, h('b', {}, 'Fix before playing: '), out.join(' '))] : []));
}

// ---------------------------------------------------------------------------
// Requests for Claude: typed change requests that travel in the export file
function addRequest(target, text) {
  cfg.requests.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), target, text, at: new Date().toISOString().slice(0, 10) });
  changed();
}
function removeRequest(id) {
  cfg.requests = cfg.requests.filter(r => r.id !== id);
  changed();
}

// What the person is looking at right now, as a request target
function currentTarget() {
  const key = state.sel[state.tab];
  if (state.tab === 'art') return key ? `Sprite: ${key}` : 'Pixel Art';
  if (state.tab === 'requests') return state.reqTarget || 'Whole game';
  if (state.tab === 'balance' || !key) return TAB_NAMES[state.tab];
  return `${TAB_NAMES[state.tab]}: ${key}`;
}

function askClaude() {
  state.reqTarget = currentTarget();
  state.tab = 'requests';
  render();
  document.getElementById('reqText')?.focus();
}

function renderRequests(main) {
  const targets = ['Whole game', ...TABS.filter(([k]) => k !== 'requests').map(([, l]) => l),
    ...cfg.characters.map(c => `Characters: ${c.key}`), ...Object.keys(cfg.enemies).map(k => `Enemies: ${k}`),
    ...Object.keys(cfg.weapons).map(k => `Weapons: ${k}`), ...Object.keys(cfg.passives).map(k => `Passives: ${k}`),
    ...Object.keys(allSprites()).map(k => `Sprite: ${k}`)];
  const target = state.reqTarget || 'Whole game';
  if (!targets.includes(target)) targets.unshift(target);
  const pick = h('select', { onchange: (e) => { state.reqTarget = e.target.value; } }, targets.map(t => h('option', { value: t, selected: t === target }, t)));
  const text = h('textarea', { id: 'reqText', rows: 4, placeholder: 'Describe the change, e.g. "Make the T-Rex green with a bone crown" or "Add a slingshot weapon that fires 3 stones"' });
  const add = () => { const t = text.value.trim(); if (!t) return; addRequest(pick.value, t); state.reqTarget = pick.value; render(); };
  const asText = () => cfg.requests.map((r, i) => `${i + 1}. [${r.target}] ${r.text}`).join('\n');
  main.append(h('div', { class: 'form', style: 'grid-column: 1 / -1' },
    h('h2', {}, 'Ask Claude'),
    h('div', { class: 'sub' }, 'Type changes you want Claude to make: redraw a sprite, change how something works, add something new. ' +
      'When you are ready, press Export and send the file to Claude in your project chat. Claude makes the changes and pushes an update, and the game loads it for everyone.'),
    h('div', { class: 'grid', style: 'grid-template-columns: minmax(0, 260px) 1fr' },
      field('What it is about', pick), field('What should change', text)),
    h('div', { class: 'row', style: 'margin-top:10px' }, h('button', { class: 'btn primary', onclick: add }, '+ Add request')),
    h('h3', {}, `YOUR REQUESTS (${cfg.requests.length})`),
    cfg.requests.length
      ? h('ul', { class: 'reqlist' }, cfg.requests.map(r => h('li', {},
          h('div', {}, h('span', { class: 'target' }, r.target), r.text),
          h('button', { class: 'btn small', title: 'Remove', onclick: () => { removeRequest(r.id); render(); } }, '✕'))))
      : h('div', { class: 'note' }, 'No requests yet.'),
    cfg.requests.length ? h('div', { class: 'row', style: 'margin-top:12px' },
      h('button', { class: 'btn primary', onclick: exportConfig }, '⬇ Export to send to Claude'),
      h('button', { class: 'btn', onclick: async (e) => {
        try { await navigator.clipboard.writeText(asText()); e.target.textContent = 'Copied!'; } catch { prompt('Copy this:', asText()); }
      } }, 'Copy as text')) : null,
    h('p', { class: 'note' }, 'Requests that only need words (like "make wolves faster") can be copied as text and pasted in chat. ' +
      'Send the export file when you also changed things in the editor, so Claude starts from your version.'),
  ));
}

function restoreBackup() {
  const b = getBackup(); if (!b) return;
  if (!confirm('Go back to the version you had before Claude\'s update? Claude\'s new changes will be replaced on this device.')) return;
  cfg = b; saveConfig(cfg); cfg = loadConfig(); state.updated = false; render();
}

// ---------------------------------------------------------------------------
// Export / import / reset
function exportConfig() {
  const blob = new Blob([JSON.stringify(cfg, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `evolve-or-die-config-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
}
function importConfig() {
  const inp = h('input', { type: 'file', accept: '.json,application/json' });
  inp.addEventListener('change', async () => {
    const f = inp.files[0]; if (!f) return;
    try {
      const data = JSON.parse(await f.text());
      if (!data.enemies || !data.weapons || !data.ages) throw new Error('Not an Evolve or Die config file');
      cfg = data; saveConfig(cfg); cfg = loadConfig(); render();
      alert('Imported!');
    } catch (e) { alert(`Could not import: ${e.message}`); }
  });
  inp.click();
}
function resetAll() {
  if (!confirm('Reset EVERYTHING back to the original game? Your changes on this device will be lost (export first if you want to keep them).')) return;
  resetConfig(); cfg = baseConfig(); state.sel = {}; render();
}

render();
window.addEventListener('beforeunload', () => saveConfig(cfg));
export { CHARS };
