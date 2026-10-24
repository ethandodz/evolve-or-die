// Chibi character painter: big heads, short limbs, cel shading and selective
// outlines (each part outlined in a dark tone of its own colour, near-black outside).
// Produces the same editable { pal, frames } sprite data as art.js.

const OUTER = '#1a0f0c';

// Ramps: [highlight, base, shadow, line]
export const R = {
  skinLight: ['#fbd6b0', '#eeb88e', '#cf916a', '#7a4630'],
  skinTan: ['#eec094', '#d59c6c', '#b07548', '#5e341e'],
  skinDeep: ['#c98a5e', '#a86a42', '#84502e', '#45281a'],
  hairBlack: ['#5a4c5a', '#3a2e3a', '#261d28', '#100a10'],
  hairBrown: ['#6a4630', '#4a2e1e', '#331e14', '#170c08'],
  furTan: ['#f4d49a', '#dcb070', '#b88848', '#6a4824'],
  furBrown: ['#b07c4e', '#8c5c34', '#683f22', '#3a2010'],
  furGrey: ['#c8c4c8', '#a09ca4', '#78747e', '#3e3a44'],
  furOrange: ['#f8b860', '#e08e34', '#b4661e', '#5e300c'],
  leather: ['#a87a54', '#86593a', '#643e26', '#341e10'],
  wood: ['#b08050', '#8a5e36', '#664224', '#331e0e'],
  woodDark: ['#8a6444', '#6a4a30', '#4c3220', '#24160c'],
  bone: ['#fffaea', '#ece0c2', '#c8b894', '#6e604a'],
  stone: ['#c8c4bc', '#a29e96', '#7a766e', '#3a3832'],
  red: ['#f07058', '#d04434', '#a02c22', '#4e1410'],
  teal: ['#7ad8c0', '#44b098', '#2c8470', '#123c32'],
  leaf: ['#9ab45a', '#76923a', '#566e26', '#26320e'],
  white: ['#ffffff', '#ffffff', '#d8dce8', '#6a6e80'],
};

function canvas(w, h) {
  const part = Array.from({ length: h }, () => Array(w).fill(-1));
  const flat = Array.from({ length: h }, () => Array(w).fill(null));
  const parts = [];
  const inside = (x, y) => x >= 0 && y >= 0 && x < w && y < h;

  function add(ramp, test, bbox, opts = {}) {
    const id = parts.length;
    parts.push({ ramp, opts });
    const [x0, y0, x1, y1] = bbox.map(Math.floor);
    for (let y = Math.max(0, y0); y <= Math.min(h - 1, y1 + 1); y++)
      for (let x = Math.max(0, x0); x <= Math.min(w - 1, x1 + 1); x++)
        if (test(x + 0.5, y + 0.5)) { part[y][x] = id; flat[y][x] = null; }
    return id;
  }

  const api = {
    w, h,
    ell(cx, cy, rx, ry, ramp, opts) {
      return add(ramp, (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1, [cx - rx - 1, cy - ry - 1, cx + rx + 1, cy + ry + 1], opts);
    },
    rect(x, y, rw, rh, ramp, opts) {
      return add(ramp, (px, py) => px >= x && px <= x + rw && py >= y && py <= y + rh, [x - 1, y - 1, x + rw + 1, y + rh + 1], opts);
    },
    poly(pts, ramp, opts) {
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const test = (x, y) => {
        let c = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c;
        }
        return c;
      };
      return add(ramp, test, [Math.min(...xs) - 1, Math.min(...ys) - 1, Math.max(...xs) + 1, Math.max(...ys) + 1], opts);
    },
    // thick line as a polygon
    bar(x0, y0, x1, y1, t, ramp, opts) {
      const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy) || 1, nx = -dy / l * t / 2, ny = dx / l * t / 2;
      return api.poly([[x0 + nx, y0 + ny], [x1 + nx, y1 + ny], [x1 - nx, y1 - ny], [x0 - nx, y0 - ny]], ramp, opts);
    },
    // spiky shape: tips given as [angleDeg, length] around a centre (0deg = up, clockwise)
    spikes(cx, cy, r, tips, ramp, opts) {
      const pts = [];
      tips.forEach(([a, len, wid = 18], i) => {
        const rad = (d) => (d - 90) * Math.PI / 180;
        pts.push([cx + Math.cos(rad(a - wid)) * r, cy + Math.sin(rad(a - wid)) * r]);
        pts.push([cx + Math.cos(rad(a)) * (r + len), cy + Math.sin(rad(a)) * (r + len)]);
        pts.push([cx + Math.cos(rad(a + wid)) * r, cy + Math.sin(rad(a + wid)) * r]);
      });
      return api.poly(pts, ramp, opts);
    },
    // flat detail pixel (eyes, spots): keeps the part underneath for outlining
    dot(x, y, c) { if (inside(x, y) && c) { flat[y][x] = c; if (part[y][x] < 0) part[y][x] = add(null, () => false, [0, 0, 0, 0]); } },
    // recolour pixels of a part matching a test (fur spots, stripes)
    pattern(id, test, c) { for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (part[y][x] === id && test(x, y)) flat[y][x] = c; },
    has(id, x, y) { return inside(x, y) && part[y][x] === id; },
  };

  api.finish = () => {
    const out = Array.from({ length: h }, () => Array(w).fill(null));
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const id = part[y][x];
      if (id < 0) continue;
      const p = parts[id];
      if (flat[y][x]) { out[y][x] = flat[y][x]; continue; }
      if (!p.ramp) continue;
      const r = p.ramp;
      // Selective outline: edge of this part where it sits on top of something drawn earlier
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (inside(x + dx, y + dy) ? part[y + dy][x + dx] : -1));
      if (!p.opts.noLine && nb.some(n => n >= 0 && n < id && parts[n].ramp && (parts[n].ramp !== r || p.opts.line))) { out[y][x] = r[3]; continue; }
      // Cel shading: lit from the top left
      const same = (dx, dy) => { const q = inside(x + dx, y + dy) ? part[y + dy][x + dx] : -1; return q === id || (q >= 0 && !p.opts.line && parts[q].ramp === r && !parts[q].opts.line); };
      const depth = p.opts.shade ?? 3;
      let c = r[1];
      if (!same(depth, depth) || !same(depth + 1, 0) || !same(0, depth + 1)) c = r[2];
      else if (!same(-1, -1) || !same(-1, 0) || !same(0, -1)) c = r[0];
      out[y][x] = c;
    }
    // Outer outline
    const res = out.map(row => row.slice());
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      if (out[y][x]) continue;
      if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(x + dx, y + dy) && out[y + dy][x + dx])) res[y][x] = OUTER;
    }
    return res;
  };
  return api;
}

// Draws on a canvas in "logical" units scaled by U, so the same layout gains pixels.
// dot() paints a logical block; px() paints one real pixel for fine detail.
function scaled(s, U) {
  const k = (v) => v * U;
  const n = Math.max(1, Math.round(U));
  return {
    U, w: s.w, h: s.h, pattern: s.pattern, has: s.has, finish: s.finish, px: s.dot,
    ell: (cx, cy, rx, ry, r, o) => s.ell(k(cx), k(cy), k(rx), k(ry), r, o),
    rect: (x, y, w, h, r, o) => s.rect(k(x), k(y), k(w), k(h), r, o),
    poly: (pts, r, o) => s.poly(pts.map(([x, y]) => [k(x), k(y)]), r, o),
    bar: (x0, y0, x1, y1, t, r, o) => s.bar(k(x0), k(y0), k(x1), k(y1), k(t), r, o),
    spikes: (cx, cy, r, tips, ramp, o) => s.spikes(k(cx), k(cy), k(r), tips.map(([a, l, w]) => [a, k(l), w]), ramp, o),
    dot: (x, y, c) => { for (let dy = 0; dy < n; dy++) for (let dx = 0; dx < n; dx++) s.dot(Math.round(k(x)) + dx, Math.round(k(y)) + dy, c); },
  };
}

// Gaia-style eye in real pixels (7x6): heavy lid, big iris, pupil, sparkle, lash flick.
// The far eye in a 3/4 view is narrower (drops a white column).
function eye(s, x, y, iris, lid, side, narrow = false) {
  const P = '#140a10', W = '#ffffff';
  let rows = [
    '.PPPPPP',
    lid ? 'PPiiiPP' : 'PWiiiiW',
    'PWisDDW',
    'PWiDDiW',
    '.WiiiiW',
    '..lll..',
  ];
  if (narrow) rows = rows.map(r => r.slice(0, 1) + r.slice(2));
  const w = rows[0].length;
  rows.forEach((row, dy) => [...row].forEach((ch, dx) => {
    const c = { P, W, s: W, i: iris[1], D: iris[3], l: iris[0] }[ch];
    const xx = side > 0 ? x + w - 1 - dx : x + dx;
    if (c) s.px(xx, y + dy, c);
  }));
  s.px(side > 0 ? x + w : x - 1, y, P);
}

// Mirrors drawing left-right around x = px (used to swing the club back over the shoulder)
function mirror(s, px) {
  const m = (x) => 2 * px - x;
  return {
    ...s,
    ell: (cx, cy, rx, ry, r, o) => s.ell(m(cx), cy, rx, ry, r, o),
    rect: (x, y, w, h, r, o) => s.rect(m(x) - w, y, w, h, r, o),
    poly: (pts, r, o) => s.poly(pts.map(([x, y]) => [m(x), y]), r, o),
    bar: (x0, y0, x1, y1, t, r, o) => s.bar(m(x0), y0, m(x1), y1, t, r, o),
    spikes: (cx, cy, r, tips, ramp, o) => s.spikes(m(cx), cy, r, tips.map(([a, l, w]) => [-a, l, w]), ramp, o),
    dot: (x, y, c) => s.dot(m(x) - 1, y, c),
  };
}

const BROWN_EYE = ['#d09a5a', '#8a5428', '#4a2410', '#24100a'];
const GREEN_EYE = ['#b0d070', '#7a9a3a', '#3e5a1a', '#22300e'];

// One body for every caveman look. o = options, f = walk frame (0/1).
// Logical layout is 60x60, drawn at U=1.6 (96x96 real pixels). Pose follows the
// toy-figure reference: 3/4 view facing right, crouched lunge, club raised back in
// one hand, the other arm reaching forward with an open palm.
export const U = 1.6;
export function chibi(o, f = 0) {
  const s = scaled(canvas(Math.round(60 * U), Math.round(60 * U)), U);
  const b = f ? 0.7 : 0;            // bob
  const cx = 29;                    // body centre
  const hx = cx + 1.5, hy = 16 + b; // head centre (turned toward the right)
  const skin = o.skin, hair = o.hair, out = o.outfit;
  const legs = o.legs || skin, feet = o.feet || R.furBrown;
  const X = (v) => Math.round(v * U);

  // --- back layers -----------------------------------------------------------
  if (o.backHair) o.backHair(s, hx, hy, hair);

  // lunge: front leg bent forward to the right, back leg braced out to the left
  const step = f ? 1 : 0;
  s.bar(cx - 3, 43 + b, cx - 9, 47.5, 6.4, legs);                    // back thigh
  s.bar(cx - 9, 47.5, cx - 13 - step, 51.5, 5.8, legs);                // back shin
  s.bar(cx + 3, 43 + b, cx + 9.5, 46 + b, 6.6, legs);                  // front thigh
  s.bar(cx + 9.5, 46 + b, cx + 11 + step, 51.5, 6, legs);              // front shin
  const footB = s.ell(cx - 14.5 - step, 53, 4.6, 2.8, feet);
  const footF = s.ell(cx + 13 + step, 53, 5.4, 2.9, feet);
  for (const id of [footB, footF]) s.pattern(id, (x, y) => (x - y) % 4 === 0 && s.has(id, x, y - 1), feet[2]);

  // torso (3/4: a little narrower, leaning into the lunge)
  s.rect(hx - 3.5, hy + 8, 6, 6, skin);                                 // neck
  s.ell(cx + 0.5, 37.2 + b, 9.4, 8.6, skin);
  if (out) out(s, cx + 0.5, b);

  // front arm reaching out to the right with an open palm
  const px = cx + 20, py = 32 + b + (f ? -0.6 : 0);
  s.ell(cx + 8, 31.4 + b, 4.2, 3.9, skin);
  s.bar(cx + 9, 32 + b, px - 3, py + 0.8, 5.6, skin);
  s.ell(px - 0.6, py, 3.2, 4, skin);                                   // palm
  [[-1.4, -7.6], [0.6, -8], [2.4, -7.2], [3.8, -5.4]].forEach(([dx, dy]) => s.bar(px + dx * 0.55, py - 2.5, px + dx, py + dy, 1.7, skin, { noLine: true }));
  s.bar(px - 2.4, py + 0.8, px - 5, py - 3.2, 1.8, skin, { noLine: true }); // thumb
  if (o.wrist) s.bar(px - 4.6, py - 2.4, px - 4.4, py + 2.8, 1.4, o.wrist, { noLine: true });
  for (let i = 0; i < 3; i++) s.px(X(px + 0.6 + i * 1.1), X(py - 2.6), skin[2]);  // finger gaps

  // back arm: elbow down and out to the left, fist at chest height, club raised up and back
  const fx = cx - 17, fy = 32.6 + b - (f ? 0.6 : 0);
  if (o.club) o.club(mirror(s, fx), fx, fy);
  s.ell(cx - 8, 31.6 + b, 4.2, 3.9, skin);
  s.bar(cx - 9, 32.4 + b, cx - 13, 36.4 + b, 5.6, skin);               // upper arm
  s.bar(cx - 13, 36.4 + b, fx, fy + 1, 5.2, skin);                     // forearm
  s.ell(fx, fy, 3.8, 3.6, skin);                                       // fist
  if (o.clubFront) o.clubFront(mirror(s, fx), fx, fy);
  if (o.wrist) s.bar(fx + 1.4, fy + 2.4, fx + 3.6, fy + 4.2, 1.4, o.wrist, { noLine: true });
  for (let i = 0; i < 3; i++) s.px(X(fx - 2), X(fy - 1) + i, skin[3]);

  // --- head (3/4, facing right) -----------------------------------------------
  s.ell(hx - 8.6, hy + 2.2, 2.4, 3.2, skin);                           // near ear
  // face: round, with the jaw and chin pushed toward the facing side (3/4 view)
  const face = [];
  for (let a = 0; a < 360; a += 10) {
    const c = Math.cos(a * Math.PI / 180), sn = Math.sin(a * Math.PI / 180);
    const low = Math.max(0, sn);
    face.push([hx + 10.6 * c + 2.6 * low * low, hy + 1 + 10.4 * sn - (c < -0.2 ? 1.2 * low : 0)]);
  }
  s.poly(face, skin, { line: true });
  if (o.beard) o.beard(s, hx + 1.5, hy);
  if (o.frontHair) o.frontHair(s, hx, hy, hair);
  if (o.headband) o.headband(s, hx, hy);

  const ey = X(hy + 1.6);
  const iris = o.eyes || BROWN_EYE;
  eye(s, X(hx - 5.6), ey, iris, o.lid, -1);                           // near eye
  eye(s, X(hx + 3.6), ey, iris, o.lid, 1, true);                       // far eye, narrower
  if (!o.noBrows) {
    const brow = hair[3], angry = o.brow === 'angry';
    for (let i = 0; i < 8; i++) {
      const tilt = angry ? Math.floor(i / 3) : (i === 0 || i === 7 ? 1 : 0);
      s.px(X(hx - 6.2) + i, ey - 4 + tilt, brow); s.px(X(hx - 6.2) + i, ey - 3 + tilt, brow);
      if (i < 6) { s.px(X(hx + 7.4) - i, ey - 4 + tilt, brow); s.px(X(hx + 7.4) - i, ey - 3 + tilt, brow); }
    }
  }
  // nose points toward the facing side
  const nx = X(hx + 2.4), ny = ey + 8;
  s.px(nx, ny, skin[2]); s.px(nx + 1, ny, skin[2]); s.px(nx + 2, ny - 1, skin[2]); s.px(nx + 1, ny - 1, skin[1]);
  const mx = X(hx + 2.4), my = ey + 12;
  const D = '#4a1810', T = '#ffffff', L = '#b84a3a';
  if (o.mouth === 'grin') {
    for (let i = -4; i <= 3; i++) s.px(mx + i, my, D);
    for (let i = -3; i <= 2; i++) s.px(mx + i, my + 1, i % 3 === 0 ? D : T);
    for (let i = -2; i <= 1; i++) s.px(mx + i, my + 2, D);
    s.px(mx - 5, my - 1, D);
  } else if (o.mouth === 'open') {
    for (let i = -2; i <= 2; i++) { s.px(mx + i, my, D); s.px(mx + i, my + 2, D); }
    for (let i = -2; i <= 2; i++) s.px(mx + i, my + 1, i ? L : D);
    s.px(mx - 1, my, T); s.px(mx + 1, my, T);
  } else {
    // gritted, determined mouth
    for (let i = -3; i <= 2; i++) s.px(mx + i, my, skin[3]);
    s.px(mx - 4, my + 1, skin[3]);
  }
  if (o.blush) for (const [bx, n] of [[X(hx - 6.5), 4], [X(hx + 5), 3]]) for (let i = 0; i < n; i++) { s.px(bx + i, ey + 8, '#f08a7a'); if (i % 2) s.px(bx + i, ey + 9, '#e87868'); }
  if (o.paint) o.paint(s, hx + 1, hy + 1.6);
  if (o.extra) o.extra(s, hx + 1.5, hy, b);
  return s.finish();
}

// --- parts shared by the looks ---------------------------------------------------
const spots = (id, s, c, seed = 0) => s.pattern(id, (x, y) => ((x * 7 + y * 13 + seed) % 11 === 0) || ((x * 5 + y * 3 + seed) % 17 === 0 && (x + y) % 2 === 0), c);
const rosettes = (id, s) => {
  s.pattern(id, (x, y) => { const u = (x + (y % 6 < 3 ? 0 : 3)) % 6, v = y % 3; return (u === 0 || u === 2) && v === 1 || u === 1 && (v === 0 || v === 2); }, '#6a3e1c');
};
const stripes = (id, s, c) => s.pattern(id, (x, y) => ((x + Math.floor(y * 0.6)) % 6) === 0, c);

function peltOneShoulder(ramp, mark) {
  return (s, cx, b) => {
    // strap over the left shoulder, body wrap, ragged hem
    const top = s.poly([[cx - 9, 30 + b], [cx - 4, 29 + b], [cx + 9, 38 + b], [cx + 10, 45 + b], [cx - 10, 45 + b], [cx - 10, 36 + b]], ramp);
    const hem = s.poly([[cx - 10, 43 + b], [cx + 10, 43 + b], [cx + 9, 48 + b], [cx + 6, 46 + b], [cx + 3, 49 + b], [cx, 46 + b], [cx - 3, 49 + b], [cx - 6, 46 + b], [cx - 9, 48 + b]], ramp, { noLine: true });
    if (mark) [top, hem].forEach(id => mark(id, s));
  };
}

function woodClub(ramp = R.wood, knots = true) {
  return (s, hx, hy) => {
    s.bar(hx, hy + 3, hx + 6, hy - 16, 3.4, ramp);
    const head = s.ell(hx + 7, hy - 18, 5, 6.5, ramp, { shade: 3 });
    if (knots) { s.dot(hx + 6, hy - 20, ramp[3]); s.dot(hx + 9, hy - 16, ramp[3]); s.dot(hx + 5, hy - 15, ramp[3]); }
    return head;
  };
}

function boneClub() {
  return (s, hx, hy) => {
    s.bar(hx, hy + 3, hx + 6, hy - 15, 3.2, R.bone);
    s.ell(hx + 5.5, hy - 17, 3, 2.6, R.bone);
    s.ell(hx + 9, hy - 16, 3, 2.6, R.bone);
    s.ell(hx - 1, hy + 4.5, 2.6, 2.2, R.bone);
    s.ell(hx + 2.5, hy + 5, 2.6, 2.2, R.bone);
  };
}

function spikedClub() {
  return (s, hx, hy) => {
    s.bar(hx, hy + 3, hx + 6, hy - 14, 3.6, R.woodDark);
    s.ell(hx + 7, hy - 17, 6, 7.5, R.woodDark, { shade: 3 });
    [[hx + 1, hy - 21], [hx + 13, hy - 19], [hx + 4, hy - 25], [hx + 11, hy - 25], [hx + 13, hy - 13]].forEach(([x, y]) => s.ell(x, y, 1.8, 1.8, R.stone));
  };
}

function stoneClub() {
  return (s, hx, hy) => {
    s.bar(hx, hy + 3, hx + 6, hy - 14, 3, R.wood);
    s.rect(hx + 3, hy - 13, 5, 2, R.leather);
    s.poly([[hx + 2, hy - 18], [hx + 7, hy - 24], [hx + 13, hy - 20], [hx + 12, hy - 13], [hx + 5, hy - 12]], R.stone, { shade: 3 });
  };
}

// hair strands: thin darker lines that follow the spikes
const HEADX = 30.5 * 1.6;
const strands = (id, s, hair) => {
  // strand lines fan out from the middle of the head; shine near the tops
  s.pattern(id, (x, y) => { const t = x < HEADX ? x + Math.floor(y / 2) : x - Math.floor(y / 2); return ((t % 7) + 7) % 7 === 0 && s.has(id, x, y + 2) && s.has(id, x, y - 1); }, hair[2]);
  s.pattern(id, (x, y) => { const t = x < HEADX ? x + Math.floor(y / 2) : x - Math.floor(y / 2); return ((t % 7) + 7) % 7 === 3 && !s.has(id, x, y - 3) && s.has(id, x, y + 2); }, hair[0]);
};

// fringe: downward spikes across the forehead
const fringe = (tips) => (s, cx, hy, hair) => {
  const cap = s.ell(cx, hy - 6, 11.5, 6, hair, { noLine: true });
  const f = s.poly(tips.map(([x, y]) => [cx + x, hy + y]), hair);
  strands(cap, s, hair); strands(f, s, hair);
};

// --- the five looks ---------------------------------------------------------------
export const LOOKS = {
  // 1. Classic: spiky black hair like the reference, tan leopard pelt, knotted wood club
  grug: {
    name: 'Classic Grug',
    skin: R.skinTan, hair: R.hairBlack, eyes: BROWN_EYE, brow: 'angry',
    backHair: (s, cx, hy, hair) => strands(s.spikes(cx, hy - 2, 11, [[-115, 6, 16], [-85, 9, 20], [-50, 12, 22], [-15, 14, 20], [20, 13, 22], [55, 11, 20], [85, 9, 18], [115, 6, 16]], hair), s, hair),
    frontHair: fringe([[-12, -6], [-9, 1], [-6, -3], [-3, 2], [0, -3], [4, 1], [6, -3], [9, 2], [12, -6], [8, -10], [-8, -10]]),
    outfit: peltOneShoulder(R.furTan, (id, s) => rosettes(id, s)),
    club: woodClub(),
    feet: R.furTan,
  },
  // 2. Wild mane: huge messy hair, tooth headband, bone necklace, bone club
  mane: {
    name: 'Wild Mane',
    skin: R.skinLight, hair: R.hairBrown, eyes: GREEN_EYE, mouth: 'grin',
    backHair: (s, cx, hy, hair) => {
      strands(s.spikes(cx, hy, 12, [[-155, 9, 24], [-125, 11, 20], [-95, 12, 20], [-62, 11, 20], [-30, 12, 20], [2, 13, 20], [34, 12, 20], [66, 11, 20], [98, 12, 20], [128, 11, 20], [158, 9, 24]], hair), s, hair);
    },
    frontHair: fringe([[-12, -4], [-10, 3], [-7, -2], [-4, 3], [-1, -2], [2, 2], [5, -2], [8, 3], [11, -2], [12, -8], [-12, -9]]),
    headband: (s, cx, hy) => { s.rect(cx - 11, hy - 6, 22, 2, R.red, { noLine: true }); s.poly([[cx + 3, hy - 5], [cx + 6, hy - 5], [cx + 4.5, hy - 1]], R.bone); },
    outfit: (s, cx, b) => {
      const id = s.poly([[cx - 10, 33 + b], [cx + 10, 33 + b], [cx + 10, 45 + b], [cx + 7, 48 + b], [cx + 3, 46 + b], [cx, 48 + b], [cx - 4, 46 + b], [cx - 8, 48 + b], [cx - 10, 45 + b]], R.furOrange);
      stripes(id, s, '#4a2410');
      s.rect(cx - 10, 42 + b, 20, 1.6, R.leather, { noLine: true });
      [-6, -3, 0, 3, 6].forEach((dx, i) => s.poly([[cx + dx - 1, 31 + b + Math.abs(dx) / 3], [cx + dx + 1, 31 + b + Math.abs(dx) / 3], [cx + dx, 34.5 + b + (i % 2)]], R.bone));
    },
    club: boneClub(),
    feet: R.furOrange,
  },
  // 3. Young hunter: shorter spiky hair, face paint, grey wolf-pelt hood and cape, stone club
  hunter: {
    name: 'Wolf Pelt',
    skin: R.skinTan, hair: R.hairBlack, eyes: BROWN_EYE, lid: 1,
    backHair: (s, cx, hy, hair) => {
      s.ell(cx, hy + 3, 14, 13, R.furGrey);                                        // hood back
      s.spikes(cx, hy - 2, 10, [[-100, 5], [-60, 6], [-20, 6], [20, 6], [60, 5], [100, 4]], hair);
    },
    frontHair: (s, cx, hy, hair) => {
      fringe([[-11, -6], [-8, 0], [-5, -4], [-2, 1], [1, -4], [4, 1], [7, -4], [10, 0], [11, -7], [0, -11]])(s, cx, hy, hair);
      // wolf head worn on top: ears, brow, yellow eyes, snout and fangs over the forehead
      s.poly([[cx - 11, hy - 10], [cx - 9, hy - 22], [cx - 3, hy - 14]], R.furGrey);
      s.poly([[cx + 3, hy - 14], [cx + 9, hy - 22], [cx + 11, hy - 10]], R.furGrey);
      s.ell(cx, hy - 11, 11.5, 6, R.furGrey);
      s.ell(cx, hy - 7.5, 4.5, 3.2, ['#f0ece4', '#d8d2c8', '#aaa49a', '#4a4640']);
      s.dot(cx - 1, hy - 9, '#140a10'); s.dot(cx, hy - 9, '#140a10');
      [[-6, -12], [5, -12]].forEach(([dx, dy]) => { s.dot(cx + dx, hy + dy, '#f0c040'); s.dot(cx + dx + 1, hy + dy, '#140a10'); });
      [[-3, -4], [2, -4]].forEach(([dx, dy]) => { s.dot(cx + dx, hy + dy, '#ffffff'); s.dot(cx + dx, hy + dy + 1, '#ffffff'); });
    },
    paint: (s, cx, ey) => { [[-9, 4], [-8, 5], [7, 4], [6, 5]].forEach(([dx, dy]) => s.dot(cx + dx, ey + dy, '#c83a2a')); },
    outfit: (s, cx, b) => {
      s.poly([[cx - 10, 32 + b], [cx + 10, 32 + b], [cx + 9, 46 + b], [cx - 9, 46 + b]], R.leather);
      s.rect(cx - 10, 41 + b, 20, 2, R.woodDark, { noLine: true });
      s.ell(cx - 6, 31 + b, 5, 3, R.furGrey); s.ell(cx + 6, 31 + b, 5, 3, R.furGrey);
    },
    club: stoneClub(),
    feet: R.leather,
    legs: R.leather,
  },
  // 4. Brute: beard, heavy brow, mammoth-fur vest, spiked log
  brute: {
    name: 'Bearded Brute',
    skin: R.skinLight, hair: R.hairBlack, eyes: BROWN_EYE, brow: 'angry',
    backHair: (s, cx, hy, hair) => strands(s.spikes(cx, hy - 3, 10, [[-110, 5, 20], [-70, 8, 22], [-30, 10, 22], [10, 10, 22], [50, 8, 22], [95, 5, 20]], hair), s, hair),
    frontHair: fringe([[-11, -7], [-7, -2], [-3, -5], [1, -1], [5, -5], [9, -2], [11, -8], [0, -12]]),
    beard: (s, cx, hy) => {
      s.poly([[cx - 10, hy + 2], [cx - 7, hy + 12], [cx - 3, hy + 15], [cx, hy + 13], [cx + 3, hy + 16], [cx + 7, hy + 12], [cx + 10, hy + 2], [cx + 6, hy + 7], [cx - 6, hy + 7]], R.hairBlack);
    },
    mouth: 'open',
    outfit: (s, cx, b) => {
      const v = s.poly([[cx - 10, 32 + b], [cx - 3, 33 + b], [cx - 4, 46 + b], [cx - 10, 46 + b]], R.furBrown);
      const v2 = s.poly([[cx + 3, 33 + b], [cx + 10, 32 + b], [cx + 10, 46 + b], [cx + 4, 46 + b]], R.furBrown);
      s.rect(cx - 10, 42 + b, 20, 3, R.leather);
      s.ell(cx, 43.5 + b, 2, 1.6, R.bone);
      [v, v2].forEach(id => s.pattern(id, (x, y) => (x * 3 + y) % 7 === 0, '#4a2a14'));
    },
    club: spikedClub(),
    wrist: R.leather,
    feet: R.furBrown,
  },
  // 5. Tribal: topknot with feather, cheetah wrap, leaf skirt, carved club over shoulder
  tribal: {
    name: 'Tribal Topknot',
    skin: R.skinTan, hair: R.hairBlack, eyes: BROWN_EYE, blush: true, mouth: 'grin',
    backHair: (s, cx, hy, hair) => {
      s.ell(cx, hy - 3, 11, 9, hair);
      s.ell(cx + 1, hy - 14, 4.5, 4, hair);                                     // topknot
      s.bar(cx + 3, hy - 16, cx + 9, hy - 24, 2.4, R.white);                     // feather
      s.bar(cx + 7, hy - 21, cx + 10, hy - 26, 2.4, R.red);
    },
    frontHair: (s, cx, hy, hair) => {
      fringe([[-11, -5], [-11, 4], [-8, -2], [-5, 1], [-2, -3], [2, 0], [6, -3], [9, 1], [11, 4], [11, -6], [0, -10]])(s, cx, hy, hair);
      s.rect(cx - 2, hy - 12, 6, 1.6, R.teal, { noLine: true });               // topknot band
    },
    outfit: (s, cx, b) => {
      const id = s.poly([[cx + 9, 30 + b], [cx + 4, 29 + b], [cx - 9, 37 + b], [cx - 10, 43 + b], [cx + 10, 43 + b], [cx + 10, 36 + b]], R.furOrange);
      spots(id, s, '#3a1c0c', 3);
      [-9, -6, -3, 0, 3, 6, 9].forEach((dx, i) => s.poly([[cx + dx - 2, 42 + b], [cx + dx + 2, 42 + b], [cx + dx + 0.5, 48 + b + (i % 2)]], R.leaf));
      s.rect(cx - 10, 41.5 + b, 20, 1.6, R.teal, { noLine: true });
    },
    extra: (s, cx, hy, b) => { s.ell(cx - 10, hy + 6, 1.2, 1.2, R.bone); },  // earring
    club: woodClub(R.wood, false),
    clubFront: (s, hx, hy) => { s.rect(hx + 1, hy - 7, 4, 1.4, R.teal, { noLine: true }); },
    wrist: R.teal,
    feet: R.leather,
  },
};

export function chibiSprite(key) {
  const o = LOOKS[key];
  const grids = [chibi(o, 0), chibi(o, 1)];
  const pal = [];
  const CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&*+-/:;<=>?@^_~';
  const frames = grids.map(g => g.map(row => row.map(c => {
    if (!c) return '.';
    let i = pal.indexOf(c);
    if (i < 0) { pal.push(c); i = pal.length - 1; }
    return CH[i];
  }).join('')));
  return { pal, frames };
}
