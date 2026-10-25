// Image to sprite: upload a picture and turn it into game pixel art. Removes the
// background, shrinks it to sprite size, cuts it down to a few colors (optionally the
// game's own cave-painting colors), cleans specks and adds the dark outline.
import { buildDefaultSprites, CHARS } from '../art.js';

const OUT = '#1e1009';
const MAX_WORK = 640; // longest side of the working copy, keeps it fast on phones

const SIZES = [['Item', 14], ['Small', 24], ['Character', 34], ['Big beast', 46], ['Boss', 62], ['Detailed', 96]];

// Settings and the loaded picture survive switching tabs
const S = {
  img: null, name: 'my_sprite',
  size: 34, method: 'smooth', bg: 'auto', tol: 28, colors: 12, palette: 'own',
  bright: 0, contrast: 0, sat: 0, warm: 0, clean: true, main: true, outline: true, flip: false, frames: 'bob',
  replace: '', saved: null,
};

export function renderConverter(main, { cfg, changed, h, allSprites, uniqueKey, openSprite }) {
  const box = h('div', { class: 'form convert', style: 'grid-column: 1 / -1' });
  main.append(box);

  const fileInput = h('input', { type: 'file', accept: 'image/*', style: 'display:none', onchange: (e) => e.target.files[0] && load(e.target.files[0]) });
  const drop = h('div', { class: 'drop', onclick: () => fileInput.click() },
    S.img ? h('img', { src: S.img.src, alt: 'Your picture' }) : null,
    h('div', {}, S.img ? 'Tap to pick a different picture' : 'Tap to upload a picture, or drop / paste one here'));
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); const f = e.dataTransfer.files[0]; if (f) load(f); });
  document.onpaste = (e) => {
    if (!box.isConnected) { document.onpaste = null; return; }
    const it = [...(e.clipboardData?.items || [])].find(i => i.type.startsWith('image/'));
    if (it) load(it.getAsFile());
  };

  function load(file) {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      S.img = img; S.saved = null;
      S.name = (file.name || 'my_sprite').replace(/\.[^.]+$/, '');
      draw();
    };
    img.onerror = () => alert('That file could not be opened as a picture.');
    img.src = url;
  }

  // --- controls -------------------------------------------------------------
  const slider = (key, label, min, max, step = 1, hint) => {
    const out = h('span', { class: 'val' }, String(S[key]));
    const inp = h('input', { type: 'range', min, max, step, value: S[key], oninput: (e) => { S[key] = +e.target.value; out.textContent = e.target.value; update(); } });
    return h('div', { class: 'field' }, h('label', {}, label, ' ', out), inp, hint ? h('div', { class: 'hint' }, hint) : null);
  };
  const choice = (key, label, opts, hint) => h('div', { class: 'field' }, h('label', {}, label),
    h('div', { class: 'row' }, opts.map(([v, t]) => h('button', { class: 'btn small' + (S[key] === v ? ' on' : ''), onclick: () => { S[key] = v; draw(); } }, t))),
    hint ? h('div', { class: 'hint' }, hint) : null);
  const tick = (key, label) => {
    const inp = h('input', { type: 'checkbox', checked: S[key], onchange: (e) => { S[key] = e.target.checked; update(); } });
    return h('div', { class: 'field check' }, inp, h('label', {}, label));
  };

  const sizeIn = h('input', { type: 'number', min: 6, max: 128, value: S.size, style: 'width:80px',
    oninput: (e) => { const v = parseInt(e.target.value); if (v >= 6 && v <= 128) { S.size = v; update(); } } });
  const sizeRow = h('div', { class: 'field' }, h('label', {}, 'Size in pixels (longest side)'),
    h('div', { class: 'row' }, sizeIn, SIZES.map(([t, v]) => h('button', { class: 'btn small' + (S.size === v ? ' on' : ''), onclick: () => { S.size = v; draw(); } }, `${t} ${v}`))),
    h('div', { class: 'hint' }, 'The caveman and Roman soldiers are 34 tall, wolves 28 wide, the T-Rex 62. Bigger = more detail.'));

  const controls = h('div', { class: 'controls' },
    sizeRow,
    choice('bg', 'Background', [['auto', 'Remove it'], ['none', 'Keep it']], 'Removes the plain color around the edges. Pictures that are already see-through keep their own.'),
    S.bg === 'auto' ? slider('tol', 'How much background to remove', 0, 100, 1, 'Raise it if bits of background are left, lower it if parts of your character vanish.') : null,
    slider('colors', 'Number of colors', 2, 32, 1, 'Game sprites use about 8 to 16.'),
    choice('palette', 'Colors', [['own', 'From the picture'], ['game', 'Cave-painting colors only']], 'Cave-painting colors snaps everything to colors already used in the game, so it matches the art style.'),
    choice('method', 'Shrink style', [['smooth', 'Smooth (photos, drawings)'], ['sharp', 'Sharp (already pixel art)']]),
    h('div', { class: 'grid' },
      slider('bright', 'Brightness', -60, 60),
      slider('contrast', 'Contrast', -60, 60),
      slider('sat', 'Color strength', -100, 100),
      slider('warm', 'Warm ochre tint', 0, 100),
    ),
    h('div', { class: 'row' }, tick('outline', 'Dark outline'), tick('clean', 'Clean up stray pixels'), tick('main', 'Only keep the main shape'), tick('flip', 'Face the other way')),
    choice('frames', 'Animation', [['bob', 'Walk bob (2 frames)'], ['still', 'Still']], 'Characters and enemies flip between 2 frames as they move.'),
  );

  // --- previews -------------------------------------------------------------
  const big = h('canvas', { class: 'pv' });
  const night = h('canvas', { class: 'pv night' });
  const scene = h('canvas', { class: 'pv' });
  const info = h('div', { class: 'note' });
  const previews = h('div', {},
    h('h3', { style: 'margin-top:0' }, 'RESULT'),
    h('div', { class: 'row', style: 'align-items:flex-end' }, big, night),
    info,
    h('h3', {}, 'NEXT TO GRUG, AT GAME SIZE'),
    scene,
  );

  // --- saving ---------------------------------------------------------------
  const all = allSprites();
  const nameIn = h('input', { type: 'text', value: S.name, oninput: (e) => { S.name = e.target.value; } });
  const replaceSel = h('select', { onchange: (e) => { S.replace = e.target.value; } },
    h('option', { value: '' }, 'Pick a sprite to replace...'),
    Object.keys(all).sort().map(k => h('option', { value: k, selected: S.replace === k }, k)));
  const matchBtn = h('button', { class: 'btn small', onclick: () => {
    const sp = all[S.replace]; if (!sp) { alert('Pick a sprite first.'); return; }
    S.size = Math.max(sp.frames[0].length, sp.frames[0][0].length); draw();
  } }, 'Match its size');

  const save = (key) => {
    const sp = S.result; if (!sp) return;
    cfg.sprites[key] = JSON.parse(JSON.stringify(sp));
    S.saved = key;
    changed(true);
  };
  const saveBox = h('div', { class: 'request' },
    h('h3', { style: 'margin-top:0' }, 'PUT IT IN THE GAME'),
    S.saved ? h('div', { class: 'banner', style: 'margin:0 0 10px' }, `Saved as "${S.saved}".`,
      h('button', { class: 'btn small primary', onclick: () => openSprite(S.saved) }, '✏️ Touch it up in Pixel Art')) : null,
    h('div', { class: 'field' }, h('label', {}, 'As a new sprite named'), nameIn),
    h('div', { class: 'row', style: 'margin:6px 0 4px' }, h('button', { class: 'btn small primary', onclick: () => {
      const key = uniqueKey(S.name, Object.keys(allSprites())); save(key);
    } }, '+ Save as new sprite')),
    h('div', { class: 'hint note' }, 'New sprites show up in every Sprite dropdown, so you can give one to a character or enemy in their tab.'),
    h('div', { class: 'field', style: 'margin-top:12px' }, h('label', {}, 'Or replace one that is already in the game'), h('div', { class: 'row' }, replaceSel, matchBtn)),
    h('div', { class: 'row', style: 'margin-top:6px' },
      h('button', { class: 'btn small danger', onclick: () => {
        if (!S.replace) { alert('Pick a sprite to replace first.'); return; }
        if (!confirm(`Replace "${S.replace}" with this picture? You can undo it with ↺ Original in Pixel Art.`)) return;
        save(S.replace);
      } }, 'Replace it'),
      h('button', { class: 'btn small', onclick: downloadPng }, '⬇ Download PNG')),
  );

  box.append(
    h('h2', {}, 'Image → Sprite'),
    h('div', { class: 'sub' }, 'Upload a drawing or picture and turn it into a sprite for the game. Use your own art, or pictures you are allowed to use.'),
    fileInput,
    h('div', { class: 'convertGrid' },
      h('div', {}, drop, S.img ? controls : null),
      S.img ? h('div', {}, previews, saveBox) : h('div', { class: 'note' }, 'Tips: a single character on a plain background works best. Simple, bold shapes read better at small sizes than detailed photos.'),
    ),
  );

  let raf = 0;
  function update() { cancelAnimationFrame(raf); raf = requestAnimationFrame(compute); }
  function draw() { box.remove(); renderConverter(main, { cfg, changed, h, allSprites, uniqueKey, openSprite }); }

  function compute() {
    if (!S.img) return;
    S.result = convert(S.img, S, gamePalette());
    const sp = S.result;
    const w = sp.frames[0][0].length, hh = sp.frames[0].length;
    const z = Math.max(2, Math.min(12, Math.floor(300 / Math.max(w, hh))));
    info.textContent = `${w}×${hh} pixels, ${sp.pal.length} colors`;
    paintSprite(big, sp, 0, z, '#c49a64');
    paintSprite(night, sp, 0, Math.max(2, Math.floor(z / 2)), '#1a1410');
    animateScene(scene, sp);
  }
  compute();

  function downloadPng() {
    const sp = S.result; if (!sp) return;
    const c = document.createElement('canvas');
    paintSprite(c, sp, 0, 1, null);
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png'); a.download = `${uniqueKey(S.name, [])}.png`; a.click();
  }
}

// Every color the built-in sprites use: the cave-painting palette
let GAME_PAL = null;
function gamePalette() {
  if (GAME_PAL) return GAME_PAL;
  const set = new Set();
  for (const sp of Object.values(buildDefaultSprites())) for (const c of sp.pal) if (/^#[0-9a-f]{6}$/i.test(c)) set.add(c.toLowerCase());
  set.delete(OUT);
  GAME_PAL = [...set].map(hexRgb);
  return GAME_PAL;
}

// ---------------------------------------------------------------------------
// Conversion pipeline
export function convert(img, o, gamePal = []) {
  // 1. Working copy at a sane size
  const sc = Math.min(1, MAX_WORK / Math.max(img.naturalWidth || img.width, img.naturalHeight || img.height));
  const W = Math.max(1, Math.round((img.naturalWidth || img.width) * sc)), H = Math.max(1, Math.round((img.naturalHeight || img.height) * sc));
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, W, H);
  const px = ctx.getImageData(0, 0, W, H).data;

  // 2. Background
  let see = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] < 128) see++;
  if (o.bg === 'auto' && see < W * H * 0.02) removeBackground(px, W, H, o.tol);

  if (o.main) keepBiggest(px, W, H);

  // 3. Trim to the picture
  let x0 = W, y0 = H, x1 = -1, y1 = -1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (px[(y * W + x) * 4 + 3] >= 128) {
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) { x0 = 0; y0 = 0; x1 = W - 1; y1 = H - 1; }
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1;

  // 4. Shrink to sprite size (outline takes 1px each side)
  const room = Math.max(4, o.size - (o.outline ? 2 : 0));
  const k = room / Math.max(cw, ch);
  const w = Math.max(1, Math.round(cw * k)), h = Math.max(1, Math.round(ch * k));
  let grid = o.method === 'sharp' ? shrinkSharp(px, W, x0, y0, cw, ch, w, h) : shrinkSmooth(px, W, x0, y0, cw, ch, w, h);

  // 5. Color adjustments
  grid = grid.map(p => p && adjust(p, o));

  // 6. Fewer colors
  const opaque = grid.filter(Boolean);
  let pal = medianCut(opaque, o.colors);
  if (o.palette === 'game' && gamePal.length) pal = [...new Map(pal.map(p => { const g = nearest(gamePal, p); return [g.join(), g]; })).values()];
  let idx = grid.map(p => (p ? nearestIndex(pal, p) : -1));

  // 7. Clean up
  if (o.clean) idx = cleanUp(idx, w, h);
  if (o.flip) idx = Array.from({ length: w * h }, (_, i) => idx[Math.floor(i / w) * w + (w - 1 - (i % w))]);

  // 8. Outline and frames
  const pad = o.outline ? 1 : 0, bob = o.frames === 'bob' ? 1 : 0;
  const fw = w + pad * 2, fh = h + pad * 2 + bob;
  const colors = pal.map(rgbHex);
  const outI = o.outline ? (colors.push(OUT), colors.length - 1) : -1;
  const frame = (lift) => {
    const f = Array.from({ length: fh }, () => Array(fw).fill(-1));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = idx[y * w + x]; if (v >= 0) f[y + pad + bob - lift][x + pad] = v; }
    if (o.outline) {
      const has = (x, y) => f[y]?.[x] >= 0 && f[y][x] !== outI;
      for (let y = 0; y < fh; y++) for (let x = 0; x < fw; x++)
        if (f[y][x] < 0 && (has(x - 1, y) || has(x + 1, y) || has(x, y - 1) || has(x, y + 1))) f[y][x] = outI;
    }
    return f;
  };
  return toSprite(colors, [frame(0), frame(bob)]);
}

// Flood from the edges through pixels close to the edge color
function removeBackground(px, W, H, tol) {
  const edge = [];
  for (let x = 0; x < W; x++) edge.push(x, (H - 1) * W + x);
  for (let y = 0; y < H; y++) edge.push(y * W, y * W + W - 1);
  const samples = edge.map(i => [px[i * 4], px[i * 4 + 1], px[i * 4 + 2]]);
  const bg = [0, 1, 2].map(c => samples.map(s => s[c]).sort((a, b) => a - b)[samples.length >> 1]);
  const lim = (tol / 100) * 160 + 6;
  const close = (i) => dist([px[i * 4], px[i * 4 + 1], px[i * 4 + 2]], bg) <= lim;
  const seen = new Uint8Array(W * H);
  const stack = edge.filter(close);
  while (stack.length) {
    const i = stack.pop();
    if (seen[i]) continue;
    seen[i] = 1;
    if (!close(i)) continue;
    px[i * 4 + 3] = 0;
    const x = i % W, y = (i / W) | 0;
    if (x > 0) stack.push(i - 1); if (x < W - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - W); if (y < H - 1) stack.push(i + W);
  }
}

// Drop separate bits (a hand poking in at the edge, specks) and keep the biggest shape
function keepBiggest(px, W, H) {
  const label = new Int32Array(W * H).fill(-1);
  let best = -1, bestN = 0, id = 0;
  for (let s = 0; s < W * H; s++) {
    if (label[s] >= 0 || px[s * 4 + 3] < 128) continue;
    let n = 0; const stack = [s]; label[s] = id;
    while (stack.length) {
      const i = stack.pop(); n++;
      const x = i % W, y = (i / W) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy, j = ny * W + nx;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H || label[j] >= 0 || px[j * 4 + 3] < 128) continue;
        label[j] = id; stack.push(j);
      }
    }
    if (n > bestN) { bestN = n; best = id; }
    id++;
  }
  if (id < 2) return;
  for (let i = 0; i < W * H; i++) if (label[i] >= 0 && label[i] !== best) px[i * 4 + 3] = 0;
}

// Average each block; a pixel is solid if at least half the block is
function shrinkSmooth(px, W, x0, y0, cw, ch, w, h) {
  const out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx0 = x0 + Math.floor(x * cw / w), sx1 = x0 + Math.max(Math.floor(x * cw / w) + 1, Math.floor((x + 1) * cw / w));
    const sy0 = y0 + Math.floor(y * ch / h), sy1 = y0 + Math.max(Math.floor(y * ch / h) + 1, Math.floor((y + 1) * ch / h));
    let r = 0, g = 0, b = 0, a = 0, n = 0;
    for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) {
      const i = (sy * W + sx) * 4, al = px[i + 3] / 255;
      r += px[i] * al; g += px[i + 1] * al; b += px[i + 2] * al; a += al; n++;
    }
    out.push(a / n >= 0.5 ? [r / a, g / a, b / a] : null);
  }
  return out;
}

// Most common color in each block, for art that is already pixelated
function shrinkSharp(px, W, x0, y0, cw, ch, w, h) {
  const out = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const sx0 = x0 + Math.floor(x * cw / w), sx1 = x0 + Math.max(Math.floor(x * cw / w) + 1, Math.floor((x + 1) * cw / w));
    const sy0 = y0 + Math.floor(y * ch / h), sy1 = y0 + Math.max(Math.floor(y * ch / h) + 1, Math.floor((y + 1) * ch / h));
    const count = new Map(); let n = 0, solid = 0;
    for (let sy = sy0; sy < sy1; sy++) for (let sx = sx0; sx < sx1; sx++) {
      const i = (sy * W + sx) * 4; n++;
      if (px[i + 3] < 128) continue;
      solid++;
      const key = (px[i] >> 3) << 10 | (px[i + 1] >> 3) << 5 | (px[i + 2] >> 3);
      const e = count.get(key) || { n: 0, c: [px[i], px[i + 1], px[i + 2]] };
      e.n++; count.set(key, e);
    }
    if (solid * 2 < n) { out.push(null); continue; }
    let best = null; for (const e of count.values()) if (!best || e.n > best.n) best = e;
    out.push(best.c);
  }
  return out;
}

function adjust([r, g, b], o) {
  const ct = (100 + o.contrast) / 100, br = o.bright * 1.6;
  [r, g, b] = [r, g, b].map(v => (v - 128) * ct + 128 + br);
  const l = 0.299 * r + 0.587 * g + 0.114 * b, s = (100 + o.sat) / 100;
  [r, g, b] = [r, g, b].map(v => l + (v - l) * s);
  if (o.warm) {
    const t = o.warm / 100 * 0.45, ochre = [200 * l / 150, 140 * l / 150, 80 * l / 150];
    [r, g, b] = [r, g, b].map((v, i) => v + (ochre[i] - v) * t);
  }
  return [r, g, b].map(v => Math.max(0, Math.min(255, v)));
}

// Median cut: split the color box with the widest range until there are n boxes
function medianCut(pixels, n) {
  if (!pixels.length) return [[0, 0, 0]];
  let boxes = [pixels];
  while (boxes.length < n) {
    let bi = -1, bc = 0, br = 0;
    boxes.forEach((bx, i) => {
      if (bx.length < 2) return;
      for (let c = 0; c < 3; c++) {
        let lo = 255, hi = 0; for (const p of bx) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; }
        // Weight by size so big areas get more shades
        const r = (hi - lo) * Math.sqrt(bx.length);
        if (r > br) { br = r; bi = i; bc = c; }
      }
    });
    if (bi < 0 || br < 1) break;
    const bx = boxes[bi].sort((a, b) => a[bc] - b[bc]), mid = bx.length >> 1;
    boxes.splice(bi, 1, bx.slice(0, mid), bx.slice(mid));
  }
  return boxes.map(bx => [0, 1, 2].map(c => Math.round(bx.reduce((s, p) => s + p[c], 0) / bx.length)));
}

// Drop lone pixels and pixels unlike every neighbor
function cleanUp(idx, w, h) {
  const at = (a, x, y) => (x < 0 || y < 0 || x >= w || y >= h ? -1 : a[y * w + x]);
  const out = idx.slice();
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = idx[y * w + x]; if (v < 0) continue;
    const n4 = [at(idx, x - 1, y), at(idx, x + 1, y), at(idx, x, y - 1), at(idx, x, y + 1)];
    if (n4.every(n => n < 0)) { out[y * w + x] = -1; continue; }
    const n8 = [...n4, at(idx, x - 1, y - 1), at(idx, x + 1, y - 1), at(idx, x - 1, y + 1), at(idx, x + 1, y + 1)].filter(n => n >= 0);
    if (n8.length >= 6 && !n8.includes(v)) {
      const cnt = {}; for (const n of n8) cnt[n] = (cnt[n] || 0) + 1;
      out[y * w + x] = +Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0];
    }
  }
  return out;
}

function toSprite(colors, grids) {
  // Keep only colors that are used, in order
  const used = [...new Set(grids.flat(2).filter(i => i >= 0))].sort((a, b) => a - b);
  const map = new Map(used.map((c, i) => [c, i]));
  return {
    pal: used.map(i => colors[i]),
    frames: grids.map(g => g.map(row => row.map(i => (i < 0 ? '.' : CHARS[map.get(i)])).join(''))),
  };
}

// Weighted RGB distance, close enough to how eyes see it for small palettes
const dist = (a, b) => { const dr = a[0] - b[0], dg = a[1] - b[1], db = a[2] - b[2]; return Math.sqrt(2 * dr * dr + 4 * dg * dg + 3 * db * db) / 3; };
const nearestIndex = (pal, p) => { let bi = 0, bd = Infinity; pal.forEach((q, i) => { const d = dist(p, q); if (d < bd) { bd = d; bi = i; } }); return bi; };
const nearest = (pal, p) => pal[nearestIndex(pal, p)];
const hexRgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const rgbHex = (p) => '#' + p.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');

// ---------------------------------------------------------------------------
// Drawing previews
function paintSprite(c, sp, fi, z, bg) {
  const rows = sp.frames[fi], w = rows[0].length, h = rows.length;
  c.width = w * z; c.height = h * z;
  const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); } else ctx.clearRect(0, 0, c.width, c.height);
  rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    ctx.fillStyle = sp.pal[CHARS.indexOf(ch)]; ctx.fillRect(x * z, y * z, z, z);
  }));
}

// The new sprite beside the caveman on cave ground, both at the game's 1.5x
function animateScene(c, sp) {
  const grug = buildDefaultSprites().caveman;
  const Z = 3; // 1.5x in game, doubled so it is easy to see here
  const gw = grug.frames[0][0].length, gh = grug.frames[0].length;
  const w = sp.frames[0][0].length, h = sp.frames[0].length;
  c.width = Math.max(260, (gw + w) * Z + 60); c.height = Math.max(gh, h) * Z + 30;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  const tmp = document.createElement('canvas');
  const base = c.height - 12;
  let f = 0;
  clearInterval(c._t);
  const tickFn = () => {
    if (!c.isConnected && f > 0) { clearInterval(c._t); return; }
    ctx.fillStyle = '#c49a64'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(40,16,6,0.25)';
    ctx.fillRect(20, base - 4, gw * Z, 8); ctx.fillRect(40 + gw * Z, base - 4, w * Z, 8);
    paintSprite(tmp, grug, f % 2, Z, null); ctx.drawImage(tmp, 20, base - gh * Z);
    paintSprite(tmp, sp, f % sp.frames.length, Z, null); ctx.drawImage(tmp, 40 + gw * Z, base - h * Z);
    f++;
  };
  tickFn();
  c._t = setInterval(tickFn, 220);
}
