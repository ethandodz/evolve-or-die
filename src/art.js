// Pixel art for the game, drawn in code with a shaded "painter" so the MVP has no
// licensing questions. Every sprite becomes editable data ({ pal, frames }) that the
// editor's pixel tool can change; edits are stored in the config's `sprites`.

const CHARS = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&*+-/:;<=>?@^_~';
const OUT = '#1e1009';

// ---------------------------------------------------------------------------
// Painter: shaded ellipses and boxes lit from the top left, then a dark outline
let seed = 1;
const R = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

function paint(w, h, fn, opts = {}) {
  const buf = Array.from({ length: h }, () => Array(w).fill(null));
  const put = (x, y, c) => { x = Math.floor(x); y = Math.floor(y); if (x >= 0 && y >= 0 && x < w && y < h && c) buf[y][x] = c; };
  const idx = (s) => (s > 0.5 ? 0 : s > 0.1 ? 1 : s > -0.3 ? 2 : 3);
  const api = {
    put,
    get: (x, y) => (buf[Math.floor(y)] ? buf[Math.floor(y)][Math.floor(x)] : null),
    ell(cx, cy, rx, ry, ramp, tex = 0) {
      for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry, d = nx * nx + ny * ny;
        if (d > 1) continue;
        let s = -nx * 0.55 - ny * 0.75 + (1 - d) * 0.35 - 0.15;
        if (tex && R() < tex) s -= 0.4;
        put(x, y, ramp[idx(s)]);
      }
    },
    rect(x0, y0, w0, h0, ramp, tex = 0) {
      for (let y = y0; y < y0 + h0; y++) for (let x = x0; x < x0 + w0; x++) {
        const nx = (x - x0) / Math.max(1, w0 - 1) * 2 - 1, ny = (y - y0) / Math.max(1, h0 - 1) * 2 - 1;
        let s = -nx * 0.5 - ny * 0.6 + 0.1;
        if (tex && R() < tex) s -= 0.45;
        put(x, y, ramp[idx(s)]);
      }
    },
    line(x0, y0, x1, y1, c, thick = 1) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n);
        for (let t = 0; t < thick; t++) put(x, y + t, c);
      }
    },
    clear(x, y) { x = Math.floor(x); y = Math.floor(y); if (buf[y]) buf[y][x] = null; },
  };
  fn(api);
  if (opts.noOutline) return buf;
  // Dark outline tinted by the colour it touches (green trees get a deep green edge, skin a deep brown...)
  return buf.map((row, y) => row.map((c, x) => {
    if (c) return c;
    const n = (buf[y + 1] && buf[y + 1][x]) || (buf[y - 1] && buf[y - 1][x]) || row[x - 1] || row[x + 1];
    return n ? (opts.outline || edgeOf(n)) : null;
  }));
}

// ---------------------------------------------------------------------------
// Colour helpers for the lush look: tinted outlines and a saturated, hue-shifted grade
const rgbOf = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const hexOf = (c) => '#' + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const edgeCache = {};
function edgeOf(c) {
  if (edgeCache[c]) return edgeCache[c];
  const [r, g, b] = rgbOf(c), k = 0.3;
  return (edgeCache[c] = hexOf([r * k + 16 * 0.7, g * k + 8 * 0.7, b * k + 30 * 0.7]));
}
function rgb2hsl([r, g, b]) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  if (mx === mn) return [0, 0, l];
  const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
  const h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}
function hsl2rgb([h, s, l]) {
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  const t = (x) => { x = (x % 360 + 360) % 360 / 360; return x < 1 / 6 ? p + (q - p) * 6 * x : x < 0.5 ? q : x < 2 / 3 ? p + (q - p) * (2 / 3 - x) * 6 : p; };
  return [t(h + 120) * 255, t(h) * 255, t(h - 120) * 255];
}
// Brighter colours lean warm (toward yellow), darker ones lean cool (toward blue-purple), and everything gets punchier
const gradeCache = {};
function grade(c) {
  if (!c || c[0] !== '#' || c.length !== 7) return c;
  if (gradeCache[c]) return gradeCache[c];
  let [h, s, l] = rgb2hsl(rgbOf(c));
  if (s > 0.06) {
    s = Math.min(1, s * 1.12 + 0.02);
    const toward = (target, amt) => { let d = ((target - h + 540) % 360) - 180; h += d * amt; };
    if (l < 0.42) toward(250, (0.42 - l) * 0.35);
    else if (l > 0.62) toward(50, (l - 0.62) * 0.3);
  }
  return (gradeCache[c] = hexOf(hsl2rgb([h, s, l])));
}

// Turns colour grids (one per frame) into editable sprite data
function toSprite(grids) {
  const pal = [];
  const frames = grids.map(g => g.map(row => row.map(c => {
    if (!c) return '.';
    c = grade(c);
    let i = pal.indexOf(c);
    if (i < 0) { pal.push(c); i = pal.length - 1; }
    return CHARS[i];
  }).join('')));
  return { pal, frames };
}

// Old-style letter grids (for small icons)
function letters(rows, map, outline = true) {
  const w = Math.max(...rows.map(r => r.length));
  return paint(w + 2, rows.length + 2, (s) => rows.forEach((r, y) => [...r].forEach((ch, x) => { if (map[ch]) s.put(x + 1, y + 1, map[ch]); })), { noOutline: !outline });
}

// ---------------------------------------------------------------------------
// Ramps (light to dark), warm and earthy to match the cave-painting look
const SKIN = ['#ffd2a4', '#f0a874', '#c87e54', '#8e5236'];
const SKIN2 = ['#e2a87c', '#c08258', '#94603e', '#64402a'];
const HAIR = ['#94603a', '#6e4228', '#4e2c1a', '#341a10'];
const BLACKH = ['#4a3a3a', '#302424', '#201618', '#140c0e'];
const FUR = ['#fadc9a', '#e2b26a', '#b88446', '#845a30'];
const LEATHER = ['#b0784a', '#8a5a34', '#623e22', '#3e2614'];
const WOOD = ['#d29256', '#a8693c', '#7e4a2c', '#58321e'];
const GREYW = ['#ccd4e6', '#9ca6c2', '#727c9e', '#4e5678'];
const DINO = ['#c8843a', '#a0642a', '#76461c', '#4c2c12'];
const SABER = ['#ecb04c', '#c8862c', '#98601a', '#64400e'];
const MAMM = ['#8a5a3a', '#6a4028', '#4a2a1a', '#2e180e'];
const TREXR = ['#9aa45a', '#76823e', '#52602a', '#323e1a'];
const STONE = ['#eeeadc', '#c6c0b4', '#9a948e', '#716c72'];
const GREYS = ['#b8b4b0', '#8c8884', '#64605c', '#403c38'];
const BRONZE = ['#f0c060', '#c8923a', '#966420', '#603c10'];
const STEEL = ['#dcdce4', '#a8a8b8', '#76768a', '#4a4a5c'];
const RED = ['#e0503c', '#b8322a', '#86201c', '#541410'];
const BLUE = ['#6a9ae0', '#4470b8', '#2c4c8a', '#1a2e5a'];
const NAVY = ['#4a5a9a', '#323e72', '#222a50', '#141a34'];
const PURPLE = ['#a674d8', '#7e4cb4', '#5a3088', '#381a5a'];
const WHITE = ['#ffffff', '#e4e0d8', '#b8b2a8', '#86807a'];
const TEAL = ['#5cd0b0', '#38a48c', '#227a68', '#124e44'];
const CREAM = ['#f4e8c0', '#dcc898', '#b4a070', '#86744a'];
const FIRE = ['#fff4b0', '#ffc848', '#f07a24', '#a83a12'];
const LEAF = ['#9ee05a', '#5ec23c', '#36a03a', '#22803a'];
const DARKLEAF = ['#44b88a', '#279872', '#18785c', '#0f5848'];
const GOLD = ['#fff0a0', '#f0c040', '#b88420', '#7a5410'];
const BONE = ['#f6eed4', '#ddd2b4', '#aca084', '#7a705a'];
const MARBLE = ['#fbf8f0', '#e4ded2', '#bab2a4', '#8c8476'];
const DARKSTEEL = ['#6a6a7c', '#4a4a5c', '#32323e', '#1e1e28'];
const SACK = ['#c8a878', '#a8885a', '#806440', '#5a442a'];
const SLIME = ['#a8f08a', '#6ad04a', '#3e9a2e', '#22601a'];
const TROLL = ['#8aa86a', '#6a8a4a', '#4a6632', '#2e4220'];
const DRAGON = ['#f0704a', '#d0482a', '#9a2e1c', '#601a10'];
const WING = ['#c84a5a', '#9a3044', '#6a1e30', '#40101c'];
const GREEN = ['#74cc3e', '#44aa3a', '#2a8a3a', '#1c6a36'];
const BRASS = ['#f8d878', '#d8a848', '#a87a2a', '#6a4a14'];
const COPPER = ['#e89a6a', '#c0703e', '#8a4a26', '#5a2c14'];
const SEPIA = ['#f2e2c0', '#dcc6a0', '#b8a07a', '#8a7454'];
const EYE = '#160c08';
// Industrial, Modern and Future
const SOOT = ['#5a5658', '#423e42', '#2e2a30', '#1c181e'];
const BRICK = ['#c0604a', '#9a4434', '#722e24', '#4a1c16'];
const DENIM = ['#6a8ac0', '#4a6aa0', '#344c7a', '#203252'];
const TWEED = ['#8a7a5a', '#6a5c40', '#4c422c', '#30281a'];
const IRON = ['#7a7a84', '#56565e', '#3c3c44', '#24242a'];
const PINK = ['#ff8ad0', '#f04aa8', '#b82a7a', '#7a1450'];
const BLACKL = ['#4a4450', '#34303a', '#24202a', '#16121a'];
const SUIT = ['#3a3a48', '#2a2a36', '#1c1c26', '#101018'];
const ARMY = ['#8a9a5a', '#6a7a40', '#4c5a2c', '#2e381a'];
const YELLOWC = ['#ffe060', '#f0c020', '#c09010', '#806008'];
const ORANGE = ['#ffb060', '#f08020', '#c05a10', '#803a08'];
const BLOND = ['#f8e090', '#e0c060', '#b89440', '#806428'];
const NEON = ['#e0fcff', '#5af0ff', '#20b0e0', '#106090'];
const NEONP = ['#ffd0ff', '#f070ff', '#b030e0', '#701a9a'];
const ALIENS = ['#c8e0c0', '#a0c098', '#78987a', '#4a6a50'];
const SPACE = ['#f4f8ff', '#c8d4ea', '#94a2c0', '#5a6888'];
const VISOR = ['#9af8ff', '#3ae0ff', '#1aa0d0', '#0a6090'];
const VISORR = ['#ffb0a0', '#ff4a3a', '#c02020', '#801010'];

// A gear: round body with square teeth
function gear(s, cx, cy, r, ramp, teeth = 8, rot = 0) {
  for (let i = 0; i < teeth; i++) {
    const a = rot + (i / teeth) * Math.PI * 2;
    s.ell(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.max(1.2, r * 0.28), Math.max(1.2, r * 0.28), ramp);
  }
  s.ell(cx, cy, r, r, ramp, 0.05);
  s.ell(cx, cy, r * 0.35, r * 0.35, [ramp[3], ramp[3], ramp[3], ramp[3]]);
}

// ---------------------------------------------------------------------------
// Humanoids share one body; options change the look
function human(o, f) {
  // Slim build: small head, narrow torso, thin arms and long legs
  const H = 37;
  return paint(24, H, (s) => {
    const oy = 4;
    const lx = f ? 1 : 0;
    const legs = o.legs || o.skin;
    s.rect(9 + lx, 22 + oy, 2, f ? 7 : 8, legs); s.rect(13 - lx, 22 + oy, 2, f ? 8 : 7, legs);
    const boot = o.boots || HAIR;
    s.rect(8 + lx, 29 + oy + (f ? -1 : 0), 3, 2, boot); s.rect(13 - lx, 29 + oy + (f ? 0 : -1), 3, 2, boot);
    if (o.cape) s.ell(8.5, 18 + oy, 4, 6.5, o.cape);
    // back arm behind the body
    s.rect(6, 14 + oy + (f ? 1 : 0), 2, 7, o.arms || o.skin);
    s.ell(11.5, 17.5 + oy, o.broad ? 5.2 : 4.2, 5.2, o.body, o.bodyTex || 0);
    if (o.broad) { s.ell(7.5, 14.5 + oy, 1.8, 1.8, o.body); s.ell(15.5, 14.5 + oy, 1.8, 1.8, o.body); }
    s.rect(8, 18 + oy, 8, 5, o.body, o.bodyTex || 0);
    for (let x = 8; x < 16; x += 2) s.put(x, 23 + oy, o.body[2]);
    if (o.halves) { for (let y = 12; y < 24; y++) for (let x = 12; x < 16; x++) if (s.get(x, y + oy)) s.put(x, y + oy, o.halves[(x + y) % 3 ? 1 : 2]); }
    if (o.tabard) { s.rect(10, 13 + oy, 4, 10, o.tabard); s.put(11, 16 + oy, '#f0d040'); s.put(12, 16 + oy, '#f0d040'); s.put(11, 17 + oy, '#f0d040'); s.put(12, 15 + oy, '#f0d040'); }
    if (o.abs) {
      // Chest and stomach muscles
      s.line(9, 16 + oy, 11, 16 + oy, o.body[2]); s.line(13, 16 + oy, 15, 16 + oy, o.body[2]); s.put(12, 15 + oy, o.body[2]);
      for (const y of [18, 20]) { s.put(11, y + oy, o.body[2]); s.put(13, y + oy, o.body[2]); }
      s.put(10, 14 + oy, o.body[0]); s.put(14, 14 + oy, o.body[0]);
    }
    if (o.spots) [[10, 16], [13, 19], [10, 21], [14, 15]].forEach(([x, y]) => s.put(x, y + oy, o.body[3]));
    if (o.loin) { s.rect(10, 22 + oy, 4, 4, o.loin); s.put(11, 25 + oy, o.loin[2]); }
    if (o.belt) s.rect(8, 21 + oy, 8, 1, o.belt);
    if (o.badge) s.put(10, 16 + oy, '#f0d040');
    // front arm
    s.rect(16, 14 + oy + (f ? 0 : 1), 2, 7, o.arms || o.skin);
    s.put(16, 20 + oy + (f ? 0 : 1), o.skin[1]); s.put(17, 20 + oy + (f ? 0 : 1), o.skin[2]);
    if (o.armband) s.rect(16, 18 + oy + (f ? 0 : 1), 2, 1, o.armband);
    // head
    s.ell(11.5, 8 + oy, 4.6, 4.6, o.skin);
    if (o.hair) { s.ell(10.5, 4.5 + oy, 5.8, 3.2, o.hair, 0.2); s.ell(7, 8 + oy, 1.8, 3.2, o.hair, 0.2); for (const x of [6, 9, 12, 15]) s.put(x, 1 + oy, o.hair[1]); }
    if (o.beard) s.ell(12.5, 12.5 + oy, 3.4, 1.8, o.beard, 0.2);
    if (o.band) s.rect(6, 5 + oy, 12, 1, o.band);
    if (o.goggles) { s.rect(6, 5 + oy, 12, 1, LEATHER); s.ell(11.5, 5 + oy, 1.6, 1.5, o.goggles); s.ell(15, 5 + oy, 1.6, 1.5, o.goggles); s.put(11, 4 + oy, '#c8f0ff'); s.put(15, 4 + oy, '#c8f0ff'); }
    if (o.feathers) { s.line(8, 2 + oy, 6, -3 + oy, '#e8e0d0'); s.line(11, 1 + oy, 11, -4 + oy, '#d84a2a'); s.line(14, 2 + oy, 16, -3 + oy, '#e8e0d0'); }
    if (o.helmet) {
      s.ell(11.5, 6 + oy, 6, 4.5, o.helmet);
      s.rect(5, 7 + oy, 3, 5, o.helmet);
      if (o.plume) { s.ell(11.5, 0 + oy, 6, 2.6, o.plume, 0.1); s.rect(8, 1 + oy, 7, 2, o.plume); }
      if (o.grill) for (let y = 7; y < 12; y += 2) s.rect(12, y + oy, 5, 1, o.helmet);
      if (o.crest) { s.rect(7, 0 + oy, 9, 2, o.crest); s.ell(11.5, 0 + oy, 4.5, 1.6, o.crest, 0.1); s.rect(6, 7 + oy, 12, 1, o.helmet); }
    }
    if (o.jesterHat) {
      s.ell(7, 3 + oy, 3.5, 3, o.jesterHat[0], 0); s.ell(16, 3 + oy, 3.5, 3, o.jesterHat[1], 0);
      s.rect(6, 4 + oy, 12, 3, o.jesterHat[0]);
      s.put(4, 1 + oy, '#f0d040'); s.put(19, 1 + oy, '#f0d040');
    }
    if (o.hood) { s.ell(11.5, 6 + oy, 6.5, 5, o.hood); s.rect(5, 6 + oy, 3, 7, o.hood); }
    if (o.cap) { s.rect(6, 3 + oy, 12, 3, o.cap); s.rect(12, 6 + oy, 7, 1, ['#1a1a1a', '#1a1a1a', '#101010', '#080808']); s.put(11, 4 + oy, '#f0d040'); }
    if (o.tophat) { s.rect(7, -3 + oy, 10, 7, o.tophat); s.rect(5, 4 + oy, 14, 1, o.tophat); }
    if (o.flatcap) { s.ell(11, 5 + oy, 6.5, 2.6, o.flatcap); s.rect(13, 5 + oy, 7, 1, o.flatcap); }
    if (o.mohawk) { s.rect(10, -2 + oy, 3, 7, o.mohawk); [[9, 0], [13, 1], [11, -3]].forEach(([x, y]) => s.put(x, y + oy, o.mohawk[0])); }
    if (o.antenna) { s.line(11, 3 + oy, 11, -2 + oy, STEEL[1]); s.put(11, -3 + oy, '#ff3a5a'); }
    if (o.paint) { s.put(10, 9 + oy, '#e8e0d0'); s.put(10, 10 + oy, '#e8e0d0'); s.put(15, 9 + oy, '#e8e0d0'); }
    if (!o.grill) { s.put(14, 8 + oy, EYE); s.put(14, 9 + oy, EYE); s.put(11, 8 + oy, EYE); s.put(11, 9 + oy, EYE); s.put(15, 10 + oy, '#ff9a8a'); }
    if (o.shades) { s.rect(11, 7 + oy, 6, 2, ['#2a2a34', '#1a1a22', '#101016', '#08080c']); s.put(12, 7 + oy, '#8a9ab0'); }
    if (o.visor) { s.rect(9, 7 + oy, 9, 2, o.visor); s.put(15, 7 + oy, '#ffffff'); }
    if (o.alienEyes) { s.ell(13.5, 8 + oy, 1.8, 2.4, [EYE, EYE, EYE, EYE]); s.put(13, 7 + oy, '#c0e0ff'); s.ell(9.5, 8 + oy, 1.4, 2.2, [EYE, EYE, EYE, EYE]); }
    // held items
    if (o.shield) { s.ell(4, 19 + oy, 4, 6, o.shield); s.put(4, 19 + oy, '#f0c060'); }
    if (o.spear) { s.line(20, 28 + oy, 20, -2 + oy, WOOD[2]); s.line(21, 28 + oy, 21, -2 + oy, WOOD[1]); s.ell(20.5, -2 + oy, 1.6, 2.4, STEEL); }
    if (o.sword) { s.line(19, 20 + oy, 22, 13 + oy, STEEL[1]); s.line(18, 20 + oy, 21, 13 + oy, STEEL[0]); }
    if (o.staff) { s.line(20, 30 + oy, 20, 4 + oy, WOOD[1]); s.ell(20.5, 3 + oy, 2.2, 2.2, o.staff); }
    if (o.blaster) { s.rect(17, 19 + oy, 7, 2, DARKSTEEL); s.rect(17, 21 + oy, 2, 2, DARKSTEEL); s.put(23, 19 + oy, o.blaster); }
    if (o.lute) { s.line(15, 22 + oy, 22, 13 + oy, WOOD[2]); s.ell(15, 23 + oy, 3.5, 3, WOOD); s.put(15, 23 + oy, EYE); s.put(22, 12 + oy, WOOD[0]); }
    if (o.flask) { s.rect(19, 15 + oy, 2, 3, CREAM); s.ell(20, 20 + oy, 3, 3, o.flask); s.put(19, 19 + oy, '#ffffff'); }
    if (o.cane) { s.line(20, 31 + oy, 20, 13 + oy, BLACKL[1]); s.ell(20, 12 + oy, 1.4, 1.4, GOLD); }
    if (o.guitar) { s.line(14, 20 + oy, 23, 10 + oy, BLACKL[0]); s.ell(13, 22 + oy, 4.5, 3.5, o.guitar); s.put(13, 22 + oy, EYE); s.rect(22, 9 + oy, 2, 2, STEEL); }
    if (o.trident) { s.line(20, 30 + oy, 20, 0 + oy, WOOD[1]); s.line(18, 0 + oy, 22, 0 + oy, STEEL[1]); [18, 20, 22].forEach(x => s.line(x, 0 + oy, x, -3 + oy, STEEL[0])); }
  });
}

const CHAR_LOOKS = {
  caveman: { skin: SKIN, hair: HAIR, beard: HAIR, body: FUR, spots: true },
  hunter: { skin: SKIN, hair: HAIR, body: LEATHER, band: ['#d84a2a', '#b8322a', '#86201c', '#541410'], spear: true, legs: SKIN, belt: '#3a2010' },
  shaman: { skin: SKIN2, hair: BLACKH, body: ['#7a8a4a', '#5a6a34', '#3e4a22', '#262e14'], feathers: true, paint: true, staff: FIRE, belt: '#d0a040' },
  rival: { skin: SKIN2, hair: BLACKH, beard: BLACKH, body: GREYW, spots: true },
  legionary: { skin: SKIN, helmet: BRONZE, body: RED, belt: '#5a3a20', shield: RED, sword: true, legs: SKIN, boots: LEATHER },
  spearman: { skin: SKIN, helmet: STEEL, body: BLUE, belt: '#3a2a20', spear: true, boots: LEATHER },
  gladiator: { skin: SKIN2, helmet: BRONZE, grill: true, body: SKIN2, arms: SKIN2, belt: '#8a5a2e', trident: true, legs: SKIN2, boots: LEATHER },
  // Playable Gladiator: shirtless and muscular, bronze helmet with the face guard down, red crest and accents
  gladiatorhero: { skin: SKIN2, helmet: BRONZE, grill: true, crest: RED, body: SKIN2, arms: SKIN2, broad: true, abs: true, armband: RED, belt: '#c8923a', loin: RED, legs: SKIN2, boots: LEATHER, sword: true },
  centurion: { skin: SKIN, helmet: BRONZE, plume: RED, body: RED, cape: ['#a83a2a', '#86281c', '#5e1a12', '#3a0e0a'], belt: '#f0c060', sword: true, boots: LEATHER },
  knight: { skin: SKIN, helmet: STEEL, plume: BLUE, body: STEEL, bodyTex: 0.25, tabard: BLUE, belt: '#f0c060', sword: true, legs: STEEL, boots: LEATHER },
  peasant: { skin: SKIN, hair: HAIR, beard: HAIR, body: SACK, belt: '#5a3a20', trident: true, legs: SACK, boots: LEATHER },
  footman: { skin: SKIN, helmet: STEEL, body: STEEL, bodyTex: 0.3, shield: BLUE, sword: true, belt: '#3a2a20', legs: LEATHER, boots: LEATHER },
  jester: { skin: SKIN, jesterHat: [RED, PURPLE], body: RED, halves: PURPLE, legs: PURPLE, boots: RED },
  blackknight: { skin: SKIN2, helmet: DARKSTEEL, grill: true, plume: RED, body: DARKSTEEL, bodyTex: 0.25, cape: ['#a83a2a', '#86281c', '#5e1a12', '#3a0e0a'], shield: DARKSTEEL, sword: true, legs: DARKSTEEL, boots: DARKSTEEL },
  tamer: { skin: SKIN, hair: HAIR, body: DINO, spots: true, band: TEAL, paint: true, belt: '#f6eed4', legs: SKIN, boots: LEATHER },
  apprentice: { skin: SKIN, hair: HAIR, body: CREAM, belt: '#8a5a2e', staff: RED, legs: LEATHER, boots: LEATHER },
  duelist: { skin: SKIN, hair: BLACKH, body: NAVY, cape: RED, belt: '#f0c060', sword: true, legs: NAVY, boots: LEATHER },
  halberdier: { skin: SKIN, helmet: STEEL, body: RED, halves: GOLD, belt: '#3a2a20', spear: true, legs: GOLD, boots: LEATHER },
  thief: { skin: SKIN2, hood: PURPLE, body: SACK, belt: '#f0c060', legs: LEATHER, boots: LEATHER },
  inventor: { skin: SKIN, hair: HAIR, goggles: BRASS, body: CREAM, arms: CREAM, tabard: LEATHER, belt: '#d8a848', staff: BRASS, legs: LEATHER, boots: LEATHER },
  sweep: { skin: SKIN, tophat: SOOT, body: SOOT, arms: SOOT, belt: '#1a1418', staff: BLACKL, legs: SOOT, boots: BLACKL },
  navvy: { skin: SKIN, flatcap: TWEED, body: DENIM, arms: SKIN, belt: '#3a2a20', spear: true, legs: DENIM, boots: LEATHER },
  luddite: { skin: SKIN2, hair: BLACKH, beard: BLACKH, body: TWEED, belt: '#2a1a10', staff: IRON, legs: SACK, boots: LEATHER },
  engineer: { skin: SKIN, hair: ['#c8643a', '#a04a28', '#78341a', '#4e200e'], goggles: BRASS, body: DENIM, arms: DENIM, tabard: LEATHER, belt: '#d8a848', staff: STEEL, legs: DENIM, boots: LEATHER },
  punk: { skin: SKIN, mohawk: PINK, body: BLACKL, spots: true, belt: '#c0c0c8', legs: DENIM, boots: BLACKL },
  agent: { skin: SKIN2, hair: BLACKH, shades: true, body: SUIT, arms: SUIT, belt: '#e8e8f0', legs: SUIT, boots: ['#2a2a2a', '#1a1a1a', '#101010', '#080808'] },
  soldier: { skin: SKIN, helmet: ARMY, body: ARMY, arms: ARMY, belt: '#3a3020', blaster: '#ffe060', legs: ARMY, boots: BLACKL },
  pilot: { skin: SKIN, hair: BLOND, shades: true, body: LEATHER, arms: LEATHER, belt: '#e0e0e8', legs: DENIM, boots: BLACKL },
  android: { skin: STEEL, visor: VISOR, antenna: true, body: SPACE, arms: STEEL, legs: STEEL, boots: DARKSTEEL },
  cyborg: { skin: SKIN, hair: BLACKH, visor: VISORR, body: DARKSTEEL, bodyTex: 0.2, arms: STEEL, blaster: '#ff3a5a', legs: DARKSTEEL, boots: DARKSTEEL },
  greyalien: { skin: ALIENS, alienEyes: true, body: ALIENS, arms: ALIENS, legs: ALIENS, boots: ALIENS },
  nova: { skin: SKIN2, hair: ['#f8f8ff', '#d8dcf0', '#a8acc8', '#70748c'], visor: VISOR, body: SPACE, arms: SPACE, belt: '#5af0ff', staff: NEON, legs: SPACE, boots: NEONP },
  bard: { skin: SKIN, hair: ['#c8643a', '#a04a28', '#78341a', '#4e200e'], body: GREEN, cape: RED, belt: '#f0c060', lute: true, legs: ['#a07a4a', '#80603a', '#5a4228', '#3a2a18'], boots: LEATHER },
  alchemist: { skin: SKIN2, hair: BLACKH, goggles: BRASS, body: PURPLE, arms: PURPLE, belt: '#f0c060', flask: ['#b0ff8a', '#6ad04a', '#3e9a2e', '#22601a'], legs: PURPLE, boots: LEATHER },
  inspector: { skin: SKIN, hair: HAIR, flatcap: TWEED, cape: TWEED, body: TWEED, arms: TWEED, belt: '#3a2a20', cane: true, legs: SUIT, boots: BLACKL },
  rocker: { skin: SKIN, hair: PINK, shades: true, body: BLACKL, spots: true, belt: '#d0d0d8', guitar: RED, legs: DENIM, boots: BLACKL },
  zorp: { skin: ['#b8f08a', '#8ad060', '#5a9a3a', '#2e5a1e'], alienEyes: true, antenna: true, body: SPACE, arms: ['#b8f08a', '#8ad060', '#5a9a3a', '#2e5a1e'], belt: '#5af0ff', blaster: '#5af0ff', legs: SPACE, boots: NEONP },
  timecop: { skin: SKIN, cap: NAVY, body: BLUE, badge: true, belt: '#1a1a2a', legs: NAVY, boots: ['#2a2a2a', '#1a1a1a', '#101010', '#080808'] },
};

function quad(kind, f) {
  switch (kind) {
    case 'wolf': return paint(28, 18, (s) => {
      const P = GREYW;
      s.ell(13, 8, 8, 4.5, P, 0.15); s.ell(21, 5, 4, 3.5, P, 0.1); s.rect(23, 5, 4, 2, P);
      s.put(20, 0, P[1]); s.put(20, 1, P[2]); s.put(22, 1, P[1]); s.put(22, 2, P[2]);
      s.put(22, 4, EYE); s.put(26, 5, EYE); s.put(24, 7, '#f0e8dc');
      s.line(5, 7, 1, f ? 2 : 4, P[2]); s.line(5, 6, 2, f ? 2 : 4, P[1]);
      const L = f ? [[7, 4], [11, 5], [16, 4], [20, 5]] : [[8, 5], [11, 4], [17, 5], [19, 4]];
      L.forEach(([x, hgt]) => s.rect(x, 11, 2, hgt, P));
    });
    case 'raptor': return paint(26, 24, (s) => {
      const P = DINO;
      s.ell(11, 12, 6, 5, P, 0.12); s.ell(17, 5, 4, 3.4, P); s.rect(19, 5, 5, 2, P);
      s.put(18, 4, EYE); s.put(22, 7, '#f0e8dc'); s.put(20, 7, '#f0e8dc');
      for (let i = 0; i < 4; i++) s.put(8 + i * 2, 8, P[3]);
      s.line(5, 11, 0, f ? 7 : 9, P[2]); s.line(5, 12, 1, f ? 8 : 10, P[1]);
      s.rect(15, 8, 2, 4, P);
      if (f) { s.rect(8, 16, 2, 5, P); s.rect(14, 16, 2, 4, P); s.rect(7, 21, 3, 1, P); s.rect(14, 20, 3, 1, P); }
      else { s.rect(10, 16, 2, 4, P); s.rect(12, 16, 2, 5, P); s.rect(10, 20, 3, 1, P); s.rect(12, 21, 3, 1, P); }
    });
    case 'sabertooth': return paint(32, 20, (s) => {
      const P = SABER;
      s.ell(14, 9, 9, 5, P, 0.06);
      for (let i = 0; i < 4; i++) s.line(10 + i * 3, 5, 9 + i * 3, 12, P[3]);
      s.ell(24, 6, 4.5, 4, P); s.rect(26, 7, 4, 2, P); s.put(27, 9, BONE[0]); s.put(27, 10, BONE[1]); s.put(29, 9, BONE[0]); s.put(29, 10, BONE[1]);
      s.put(25, 4, EYE);
      s.line(5, 8, 1, f ? 3 : 5, P[2]);
      const L = f ? [[7, 4], [11, 5], [17, 4], [21, 5]] : [[8, 5], [12, 4], [18, 5], [20, 4]];
      L.forEach(([x, hgt]) => s.rect(x, 13, 2, hgt, P));
    });
    case 'mammoth': return paint(46, 38, (s) => {
      const P = MAMM;
      s.ell(20, 16, 15, 12, P, 0.25); s.ell(33, 12, 8, 8, P, 0.2);
      s.rect(37, 16, 4, 12 + (f ? 1 : 0), P); s.rect(38, 27 + (f ? 1 : 0), 4, 3, P);
      s.line(33, 20, 39, 24, BONE[0]); s.line(33, 21, 40, 26, BONE[2]); s.line(40, 24, 42, 20, BONE[0]);
      s.put(35, 9, EYE);
      s.ell(30, 11, 4, 6, P.slice(1).concat(['#1a0c06']));
      const L = f ? [[9, 10], [16, 9], [24, 10], [30, 9]] : [[10, 9], [16, 10], [23, 9], [30, 10]];
      L.forEach(([x, hgt]) => s.rect(x, 24, 5, hgt, P));
    });
    case 'trex': return paint(62, 50, (s) => {
      const P = TREXR;
      // tail
      for (let i = 0; i < 12; i++) s.ell(4 + i * 1.6, 20 - i * 0.2 + (f ? 1 : 0), 4 - i * 0.15 + 1, 3, P, 0.1);
      s.ell(26, 24, 14, 11, P, 0.12);
      s.ell(26, 28, 9, 6, CREAM);
      s.ell(38, 15, 6, 8, P);
      s.ell(46, 10, 10, 7, P, 0.08);
      s.rect(44, 12, 15, 5, P);
      s.rect(46, 17, 12, 3, ['#86201c', '#6a1814', '#541410', '#3a0c08']);
      for (let x = 46; x < 58; x += 2) { s.put(x, 17, BONE[0]); s.put(x + 1, 19, BONE[1]); }
      s.rect(45, 20, 12, 3, P);
      s.put(48, 8, '#f0d040'); s.put(49, 8, EYE);
      s.line(36, 24, 40, 28, P[1], 2); s.put(41, 29, BONE[1]);
      const lf = f ? 2 : 0;
      s.rect(20 - lf, 33, 6, 10, P); s.rect(30 + lf, 33, 6, 10, P);
      s.rect(18 - lf, 43, 9, 3, P); s.rect(29 + lf, 43, 9, 3, P);
      [19, 22, 25].forEach(x => s.put(x - lf, 46, BONE[1])); [30, 33, 36].forEach(x => s.put(x + lf, 46, BONE[1]));
      for (let i = 0; i < 6; i++) s.put(18 + i * 3, 14 + (i % 2), P[3]);
    });
    case 'hydra': return paint(62, 54, (s) => {
      const P = TEAL;
      const heads = [[10, 10 + (f ? 1 : 0)], [31, 5 + (f ? 0 : 1)], [52, 10 + (f ? 1 : 0)]];
      heads.forEach(([hx, hy]) => {
        for (let i = 0; i <= 10; i++) {
          const t = i / 10;
          const x = 31 + (hx - 31) * t + Math.sin(t * Math.PI) * (hx < 31 ? -4 : hx > 31 ? 4 : 0);
          const y = 34 + (hy + 6 - 34) * t;
          s.ell(x, y, 3.2, 3.2, P);
        }
      });
      s.ell(31, 38, 18, 11, P, 0.12);
      s.ell(31, 42, 12, 6, CREAM);
      heads.forEach(([hx, hy]) => {
        s.ell(hx, hy, 5, 4, P);
        const dir = hx < 31 ? -1 : 1;
        s.rect(dir > 0 ? hx + 2 : hx - 7, hy, 6, 3, P);
        s.put(hx + dir, hy - 2, '#f0d040'); s.put(hx + dir * 2, hy - 2, EYE);
        s.line(hx + dir * 7, hy + 2, hx + dir * 10, hy + 3, '#d83c3c');
      });
      for (let i = 0; i < 7; i++) s.put(20 + i * 3, 30 + (i % 2), P[3]);
      const lf = f ? 1 : 0;
      s.rect(18 - lf, 46, 5, 6, P); s.rect(40 + lf, 46, 5, 6, P);
    });
    case 'golem': return paint(30, 32, (s) => {
      const P = GREYS;
      const b = f ? 1 : 0;
      s.ell(9 - b, 27, 4, 4, P, 0.2); s.ell(21 + b, 27, 4, 4, P, 0.2);
      s.ell(15, 18, 10, 9, STONE, 0.25);
      s.ell(4, 16 + b, 4, 5, P, 0.2); s.ell(26, 16 - b, 4, 5, P, 0.2);
      s.ell(15, 7, 6, 5, STONE, 0.2);
      s.put(13, 7, '#7ad0f4'); s.put(17, 7, '#7ad0f4'); s.put(14, 7, '#c0f0ff'); s.put(18, 7, '#c0f0ff');
      s.line(11, 15, 14, 20, P[3]); s.line(18, 14, 16, 22, P[3]);
    });
    case 'pebble': return paint(14, 12, (s) => {
      s.ell(7, 6 + (f ? 1 : 0), 6, 4.5, STONE, 0.2);
      s.put(5, 5 + (f ? 1 : 0), EYE); s.put(9, 5 + (f ? 1 : 0), EYE);
      s.rect(4, 10, 2, 1, GREYS); s.rect(8 + (f ? 1 : 0), 10, 2, 1, GREYS);
    });
    case 'testudo': return paint(38, 30, (s) => {
      const lf = f ? 1 : 0;
      for (let i = 0; i < 4; i++) { s.rect(5 + i * 8 + (i % 2 ? lf : -lf), 22, 2, 5, SKIN); s.rect(4 + i * 8 + (i % 2 ? lf : -lf), 26, 4, 2, LEATHER); }
      for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) {
        const x = 2 + c * 8.5, y = 3 + r * 9;
        s.rect(x, y, 8, 10, RED);
        s.rect(x + 3, y + 3, 2, 3, BRONZE);
      }
      for (let c = 0; c < 4; c++) s.rect(2 + c * 8.5, 0, 8, 3, RED);
    });
    case 'slime': return paint(32, 26, (s) => {
      const sq = f ? 1 : 0;
      s.ell(16, 15 + sq, 14 + sq, 10 - sq, SLIME, 0.06);
      s.ell(10, 9 + sq, 3, 2, ['#e0ffd0', '#e0ffd0', SLIME[0], SLIME[0]]);
      s.ell(12, 14 + sq, 2.4, 3, [EYE, EYE, EYE, EYE]); s.ell(20, 14 + sq, 2.4, 3, [EYE, EYE, EYE, EYE]);
      s.put(12, 13 + sq, '#ffffff'); s.put(20, 13 + sq, '#ffffff');
      s.line(14, 19 + sq, 18, 19 + sq, SLIME[3]);
    });
    case 'slimelet': return paint(16, 13, (s) => {
      const sq = f ? 1 : 0;
      s.ell(8, 7 + sq, 7 + sq, 5 - sq, SLIME, 0.05);
      s.put(6, 7 + sq, EYE); s.put(10, 7 + sq, EYE); s.put(5, 4 + sq, '#e0ffd0');
    });
    case 'troll': return paint(44, 42, (s) => {
      const P = TROLL;
      const lf = f ? 2 : 0;
      s.rect(13 - lf, 30, 7, 10, P); s.rect(25 + lf, 30, 7, 10, P);
      s.ell(22, 22, 15, 12, P, 0.12);
      s.ell(22, 26, 9, 6, SACK, 0.15);
      s.ell(22, 9, 8, 7, P);
      s.put(19, 8, '#f0d040'); s.put(25, 8, '#f0d040');
      s.put(20, 13, BONE[0]); s.put(24, 13, BONE[0]);
      s.rect(4, 16 - lf, 5, 14, P); s.rect(35, 16 + lf, 5, 14, P);
      s.line(38, 30 + lf, 42, 8, WOOD[2], 3); s.ell(41, 7, 4, 5, WOOD, 0.2);
    });
    case 'dragon': return paint(68, 56, (s) => {
      const P = DRAGON;
      const fl = f ? 3 : 0;
      // wings
      for (const [dir, cx] of [[-1, 18], [1, 44]]) {
        for (let i = 0; i < 14; i++) s.line(cx, 20, cx + dir * (6 + i * 1.2), 2 + fl + i * 1.1, WING[i % 3 ? 1 : 2]);
        s.line(cx, 20, cx + dir * 22, 2 + fl, WING[3], 2);
      }
      // tail
      for (let i = 0; i < 12; i++) s.ell(18 - i * 1.4, 40 + i * 0.5, 4 - i * 0.2 + 0.8, 3, P, 0.08);
      s.ell(31, 34, 14, 12, P, 0.1);
      s.ell(31, 38, 8, 7, GOLD.slice(1).concat(['#7a5410']));
      s.ell(45, 20, 5, 8, P);
      s.ell(50, 11, 8, 6, P);
      s.rect(52, 12, 12, 5, P);
      s.put(53, 9, '#f0d040'); s.put(54, 9, EYE);
      s.line(47, 5, 44, 0, BONE[1]); s.line(51, 5, 50, 0, BONE[1]);
      for (let x = 54; x < 64; x += 2) s.put(x, 17, BONE[0]);
      s.put(64, 14, FIRE[1]); s.put(65, 13, FIRE[0]); s.put(66, 15, FIRE[2]);
      for (let i = 0; i < 6; i++) s.put(22 + i * 3, 23 + (i % 2), P[3]);
      const lf = f ? 2 : 0;
      s.rect(23 - lf, 44, 6, 8, P); s.rect(35 + lf, 44, 6, 8, P);
      s.rect(21 - lf, 52, 9, 3, P); s.rect(33 + lf, 52, 9, 3, P);
    });
    case 'clockwork': return paint(26, 34, (s) => {
      const lf = f ? 1 : 0;
      s.rect(8 - lf, 24, 3, 8, BRASS); s.rect(15 + lf, 24, 3, 8, BRASS);
      s.rect(7 - lf, 31, 5, 2, COPPER); s.rect(14 + lf, 31, 5, 2, COPPER);
      s.rect(6, 12, 14, 13, BRASS, 0.05);
      gear(s, 13, 18, 3, COPPER, 6, f ? 0.4 : 0);
      s.rect(3, 13 + lf, 3, 9, COPPER); s.rect(20, 13 - lf, 3, 9, COPPER);
      s.line(22, 20, 25, 6, STEEL[1], 1); s.line(23, 20, 26, 6, STEEL[0], 1);
      s.rect(8, 4, 10, 8, BRASS); s.rect(9, 7, 8, 2, ['#3a2a10', '#3a2a10', '#2a1a08', '#1a1004']);
      s.put(11, 7, '#7ae0ff'); s.put(15, 7, '#7ae0ff');
      s.line(13, 4, 13, 0, COPPER[1]); s.put(13, 0, '#ff6a3a');
    });
    case 'gearling': return paint(32, 30, (s) => {
      const lf = f ? 1 : 0;
      s.rect(8 - lf, 23, 4, 6, COPPER); s.rect(20 + lf, 23, 4, 6, COPPER);
      gear(s, 16, 14, 10, BRASS, 10, f ? 0.3 : 0);
      gear(s, 8, 6, 4, COPPER, 6, f ? 0 : 0.5); gear(s, 25, 7, 4, COPPER, 6, f ? 0.5 : 0);
      s.put(13, 13, '#ff6a3a'); s.put(19, 13, '#ff6a3a'); s.put(14, 13, '#ffd0a0'); s.put(20, 13, '#ffd0a0');
      s.line(13, 18, 19, 18, BRASS[3]);
    });
    case 'cog': return paint(16, 16, (s) => {
      gear(s, 8, 8, 5, BRASS, 7, f ? 0.45 : 0);
      s.put(6, 7, EYE); s.put(10, 7, EYE);
    });
    case 'automaton': return paint(44, 44, (s) => {
      const lf = f ? 2 : 0;
      s.rect(11 - lf, 32, 8, 10, COPPER); s.rect(25 + lf, 32, 8, 10, COPPER);
      s.ell(22, 22, 15, 13, BRASS, 0.08);
      s.ell(22, 24, 6, 6, FIRE);
      for (let x = 17; x <= 27; x += 2) s.line(x, 19, x, 29, BRASS[3]);
      s.rect(3, 14 - lf, 6, 16, COPPER); s.rect(35, 14 + lf, 6, 16, COPPER);
      s.ell(6, 31 - lf, 4, 3, BRASS); s.ell(38, 31 + lf, 4, 3, BRASS);
      s.rect(15, 2, 14, 10, BRASS); s.rect(17, 6, 10, 2, ['#3a2a10', '#3a2a10', '#2a1a08', '#1a1004']);
      s.put(19, 6, '#7ae0ff'); s.put(24, 6, '#7ae0ff');
      s.rect(30, 0, 3, 8, DARKSTEEL);
      gear(s, 13, 12, 3, COPPER, 6);
    });
    case 'mech': return paint(70, 60, (s) => {
      const lf = f ? 2 : 0;
      // legs
      s.rect(16 - lf, 40, 8, 14, DARKSTEEL); s.rect(46 + lf, 40, 8, 14, DARKSTEEL);
      s.rect(13 - lf, 52, 14, 5, BRASS); s.rect(43 + lf, 52, 14, 5, BRASS);
      gear(s, 20 - lf, 42, 4, COPPER, 6); gear(s, 50 + lf, 42, 4, COPPER, 6);
      // body
      s.ell(35, 28, 22, 16, BRASS, 0.06);
      s.ell(35, 30, 9, 9, FIRE);
      for (let x = 28; x <= 42; x += 3) s.line(x, 22, x, 38, BRASS[3]);
      gear(s, 18, 22, 5, COPPER, 8, f ? 0.4 : 0); gear(s, 52, 22, 5, COPPER, 8, f ? 0 : 0.4);
      // arms: a drill and a claw
      s.rect(4, 20 + lf, 9, 7, COPPER); for (let i = 0; i < 6; i++) s.line(4 - i, 20 + lf + i * 0.6, 4 - i, 26 + lf - i * 0.6, STEEL[i % 2]);
      s.rect(57, 20 - lf, 9, 7, COPPER); s.line(66, 19 - lf, 69, 15 - lf, STEEL[1], 2); s.line(66, 27 - lf, 69, 31 - lf, STEEL[1], 2);
      // head and smokestacks
      s.rect(27, 6, 16, 10, BRASS); s.rect(29, 9, 12, 3, ['#3a2a10', '#3a2a10', '#2a1a08', '#1a1004']);
      s.rect(31, 10, 3, 1, '#ff3a1a'); s.rect(36, 10, 3, 1, '#ff3a1a');
      s.rect(22, 0, 4, 10, DARKSTEEL); s.rect(44, 0, 4, 10, DARKSTEEL);
      s.put(23, 0, '#e0e0e0'); s.put(45, f ? 0 : 1, '#e0e0e0');
    });
    // Industrial Age
    case 'steamhound': return paint(32, 22, (s) => {
      const P = IRON;
      s.ell(14, 10, 9, 5, P, 0.05); for (let x = 8; x <= 20; x += 4) s.put(x, 8, BRASS[1]);
      s.ell(24, 6, 4.5, 4, P); s.rect(26, 7, 5, 3, P); s.put(25, 5, '#ff6a3a'); s.put(30, 9, BRASS[0]);
      s.rect(20, 1, 2, 3, P);
      s.line(5, 9, 2, f ? 4 : 6, P[2], 2);
      const L = f ? [[8, 5], [12, 6], [17, 5], [21, 6]] : [[9, 6], [12, 5], [18, 6], [20, 5]];
      L.forEach(([x, hgt]) => s.rect(x, 14, 2, hgt, DARKSTEEL));
      s.ell(5, 4 - (f ? 1 : 0), 2.4, 2, WHITE); s.ell(3, 2 - (f ? 1 : 0), 1.8, 1.6, WHITE);
    });
    case 'furnace': return paint(40, 46, (s) => {
      const lf = f ? 2 : 0;
      s.rect(9 - lf, 36, 7, 9, DARKSTEEL); s.rect(24 + lf, 36, 7, 9, DARKSTEEL);
      s.rect(4, 12, 32, 26, IRON, 0.05);
      for (let y = 15; y < 36; y += 5) { s.put(6, y, IRON[0]); s.put(33, y, IRON[0]); }
      s.rect(13, 22, 14, 10, FIRE); for (let x = 14; x < 27; x += 3) s.line(x, 22, x, 31, DARKSTEEL[2]);
      s.put(14, 17, '#ff6a3a'); s.put(25, 17, '#ff6a3a'); s.rect(13, 16, 3, 1, DARKSTEEL[3]); s.rect(24, 16, 3, 1, DARKSTEEL[3]);
      s.rect(1, 18 + lf, 4, 12, DARKSTEEL); s.rect(35, 18 - lf, 4, 12, DARKSTEEL);
      s.rect(26, 0, 6, 13, BRICK); s.ell(29, 0, 4, 1.5, SOOT);
    });
    case 'coalcart': return paint(34, 28, (s) => {
      s.ell(10, 7 + (f ? 1 : 0), 6, 4, SOOT, 0.3); s.ell(22, 6, 7, 5, SOOT, 0.3); s.ell(16, 3, 5, 3, SOOT, 0.3);
      s.rect(2, 8, 30, 12, ['#a86a3a', '#80502a', '#5a361c', '#3a2210'], 0.05);
      s.rect(2, 8, 30, 2, IRON); s.rect(2, 18, 30, 2, IRON);
      s.put(12, 13, '#ffb040'); s.put(20, 13, '#ffb040');
      s.ell(8, 22, 4, 4, DARKSTEEL); s.ell(26, 22, 4, 4, DARKSTEEL); s.put(8 + (f ? 1 : -1), 22, STEEL[0]); s.put(26 + (f ? 1 : -1), 22, STEEL[0]);
    });
    case 'coal': return paint(14, 12, (s) => {
      s.ell(7, 6 + (f ? 1 : 0), 6, 4.5, SOOT, 0.3);
      s.put(5, 5 + (f ? 1 : 0), '#ffa030'); s.put(9, 5 + (f ? 1 : 0), '#ffa030'); s.put(7, 8 + (f ? 1 : 0), '#c04010');
    });
    case 'rat': return paint(22, 12, (s) => {
      s.ell(10, 6, 6, 3.5, GREYW, 0.1); s.ell(16, 5, 3.5, 2.8, GREYW); s.put(19, 5, '#e0a0a0'); s.put(16, 4, EYE);
      s.ell(14, 2, 1.5, 1.5, ['#e0a0a0', '#c08080', '#a06060', '#704040']);
      s.line(4, 6, 0, f ? 3 : 5, '#c08080');
      const L = f ? [7, 13] : [8, 12]; L.forEach(x => s.rect(x, 9, 2, 2, GREYW));
    });
    case 'locomotive': return paint(76, 62, (s) => {
      // Front of a steam engine, seen head on, with an angry face
      s.rect(22, 0, 12, 14, SOOT); s.ell(28, 1, 8, 2.5, SOOT); s.ell(28, 0, 5, 1.5, ['#e8e8f0', '#c0c0c8', '#9a9aa8', '#6a6a78']);
      s.rect(50, 4, 7, 10, BRASS); s.ell(53.5, 4, 4, 2, BRASS);
      s.ell(38, 30, 26, 22, IRON, 0.04);
      s.ell(38, 30, 20, 17, DARKSTEEL);
      for (let a = 0; a < 12; a++) s.put(38 + Math.cos(a / 12 * Math.PI * 2) * 22, 30 + Math.sin(a / 12 * Math.PI * 2) * 19, BRASS[0]);
      s.ell(38, 15, 5, 4, ['#fffbe0', '#ffe060', '#f0b020', '#a07010']);
      // eyes and frown
      s.rect(26, 24, 8, 4, ['#ffe0a0', '#ffb040', '#e07020', '#a04010']); s.rect(42, 24, 8, 4, ['#ffe0a0', '#ffb040', '#e07020', '#a04010']);
      s.line(24, 21, 34, 24, EYE, 2); s.line(52, 21, 42, 24, EYE, 2);
      s.rect(30, 34, 16, 6, EYE); for (let x = 31; x < 46; x += 3) s.rect(x, 34, 2, 2, BONE[1]);
      // buffer beam and cowcatcher
      s.rect(6, 48, 64, 6, RED); s.ell(10, 51, 4, 3, IRON); s.ell(66, 51, 4, 3, IRON);
      for (let i = 0; i < 9; i++) s.line(14 + i * 6, 54, 38 + (i - 4) * 2, 61, IRON[i % 2 ? 1 : 2]);
      s.ell(6 + (f ? 2 : 0), 8, 4, 3, WHITE); s.ell(2 + (f ? 2 : 0), 4, 3, 2.4, WHITE);
    });
    // Modern Age
    case 'biker': return paint(36, 30, (s) => {
      s.ell(8, 23, 6, 6, BLACKL); s.ell(8, 23, 2.5, 2.5, STEEL); s.ell(28, 23, 6, 6, BLACKL); s.ell(28, 23, 2.5, 2.5, STEEL);
      s.rect(9, 16, 20, 5, RED); s.rect(24, 12, 3, 6, STEEL); s.rect(23, 11, 6, 2, BLACKL);
      s.rect(12, 19, 10, 3, STEEL);
      s.ell(17, 9, 4.5, 4, BLACKL); s.rect(13, 12, 8, 6, BLACKL); s.rect(19, 10, 6, 3, BLACKL);
      s.ell(18, 4, 4, 4, RED); s.rect(19, 3, 4, 2, ['#9ac8f0', '#6a9ad0', '#4a7ab0', '#2a5a90']);
      if (f) { s.put(1, 20, '#c0c0c8'); s.put(0, 22, '#9a9aa8'); }
    });
    case 'tank': return paint(50, 36, (s) => {
      s.rect(2, 22, 46, 11, BLACKL); for (let x = 4 + (f ? 2 : 0); x < 46; x += 5) s.ell(x + 1, 27, 2, 2, IRON);
      s.rect(5, 13, 40, 10, ARMY, 0.05); s.rect(3, 20, 44, 3, ARMY);
      s.ell(22, 11, 10, 6, ARMY, 0.05); s.rect(30, 9, 18, 3, DARKSTEEL); s.rect(46, 8, 3, 5, DARKSTEEL);
      s.put(18, 9, '#ffe060'); s.rect(16, 4, 2, 4, DARKSTEEL);
      s.ell(12, 16, 2, 2, ['#e8e8d0', '#c8c8b0', '#a0a088', '#707060']);
    });
    case 'drone': return paint(30, 20, (s) => {
      s.line(6, 8, 24, 8, IRON[2], 2); s.line(9, 14, 21, 14, IRON[2]);
      s.ell(15, 10, 6, 4, ['#f0f0f8', '#c8c8d8', '#9898ac', '#686880']); s.put(17, 10, '#ff3a3a'); s.put(16, 10, '#ffb0a0');
      const blade = f ? 5 : 2;
      for (const x of [5, 25]) { s.rect(x - blade, 5, blade * 2 + 1, 1, '#c8d0e0'); s.rect(x - 1, 6, 3, 2, DARKSTEEL); }
      s.line(13, 14, 11, 18, IRON[1]); s.line(17, 14, 19, 18, IRON[1]);
    });
    case 'minidrone': return paint(16, 11, (s) => {
      s.ell(8, 6, 4, 2.6, ['#f0f0f8', '#c8c8d8', '#9898ac', '#686880']); s.put(9, 6, '#ff3a3a');
      const blade = f ? 3 : 1;
      for (const x of [3, 13]) s.rect(x - blade, 2, blade * 2 + 1, 1, '#c8d0e0');
      s.line(3, 3, 6, 5, IRON[1]); s.line(13, 3, 10, 5, IRON[1]);
    });
    case 'taxi': return paint(40, 24, (s) => {
      s.rect(2, 9, 36, 9, YELLOWC, 0.03); s.ell(19, 9, 11, 6, YELLOWC); s.rect(10, 4, 18, 5, YELLOWC);
      s.rect(12, 5, 6, 4, ['#bce0f8', '#8ac0e8', '#5a98c8', '#3a6898']); s.rect(20, 5, 6, 4, ['#bce0f8', '#8ac0e8', '#5a98c8', '#3a6898']);
      s.rect(16, 1, 6, 3, BLACKL); for (let x = 3; x < 37; x += 4) s.put(x, 13, EYE);
      s.put(37, 11, '#fffbe0'); s.put(2, 11, '#ff3a3a');
      s.ell(10, 19, 4, 4, BLACKL); s.ell(30, 19, 4, 4, BLACKL); s.put(10 + (f ? 1 : -1), 19, STEEL[0]); s.put(30 + (f ? 1 : -1), 19, STEEL[0]);
    });
    case 'chopper': return paint(80, 52, (s) => {
      // Attack helicopter, side on, facing right
      s.rect(4, 18, 34, 5, ARMY); s.rect(0, 10, 5, 13, ARMY); s.line(2, 12 + (f ? 0 : 4), 2, 18 + (f ? 4 : 0), '#d0d8e0', 2);
      s.ell(48, 24, 20, 12, ARMY, 0.04); s.ell(60, 21, 9, 7, ['#d8f0ff', '#9ac8f0', '#5a98d0', '#2a5a90']);
      s.put(61, 18, '#ffffff'); s.put(62, 19, '#ffffff');
      s.rect(36, 34, 22, 4, DARKSTEEL); for (const x of [38, 46, 54]) { s.rect(x, 36, 5, 3, RED); s.put(x + 4, 37, '#ffe060'); }
      s.line(36, 44, 62, 44, DARKSTEEL[1], 2); s.line(40, 36, 40, 44, DARKSTEEL[2]); s.line(58, 36, 58, 44, DARKSTEEL[2]);
      s.rect(46, 8, 4, 6, DARKSTEEL);
      const r = f ? 34 : 22; s.line(48 - r, 6, 48 + r, 6, '#c0c8d0', 2); s.put(48, 6, DARKSTEEL[0]);
      s.put(56, 22, '#ff3a3a'); s.rect(26, 15, 6, 3, ['#e8e8d0', '#c8c8b0', '#a0a088', '#707060']);
    });
    // Far Future
    case 'hoverbot': return paint(26, 28, (s) => {
      s.ell(13, 24 + (f ? 1 : 0), 6, 2, ['#e0fcff', '#5af0ff', '#20b0e0', '#106090']);
      s.ell(13, 12, 10, 10, SPACE, 0.03); s.rect(4, 11, 18, 2, DARKSTEEL);
      s.ell(15, 10, 4, 4, DARKSTEEL); s.ell(15.5, 10, 2.2, 2.2, VISORR); s.put(14, 9, '#ffffff');
      s.line(5, 4, 3, 0, STEEL[1]); s.put(3, 0, '#5af0ff');
    });
    case 'walker': return paint(48, 42, (s) => {
      const lf = f ? 2 : 0;
      for (const [x0, dir, up] of [[14, -1, lf], [18, -1, -lf], [30, 1, -lf], [34, 1, lf]]) {
        s.line(x0, 18, x0 + dir * 12, 10 + up, DARKSTEEL[1], 2); s.line(x0 + dir * 12, 10 + up, x0 + dir * 14, 38, DARKSTEEL[2], 2);
      }
      s.ell(24, 18, 13, 9, SPACE, 0.05); s.rect(12, 18, 24, 3, DARKSTEEL);
      s.ell(30, 15, 4, 3, ['#ffd0ff', '#f070ff', '#b030e0', '#701a9a']); s.put(31, 14, '#ffffff');
      s.rect(20, 6, 3, 5, DARKSTEEL); s.put(21, 5, '#5af0ff');
    });
    case 'ufo': return paint(36, 22, (s) => {
      s.ell(18, 7, 7, 6, ['#d8f8ff', '#a0e0f0', '#60b0d0', '#3080a0']);
      s.ell(18, 9, 3, 3, ALIENS); s.put(19, 8, EYE); s.put(17, 8, EYE);
      s.ell(18, 13, 17, 5, IRON, 0.03); s.rect(2, 13, 32, 1, DARKSTEEL);
      for (let i = 0; i < 6; i++) s.put(5 + i * 5, 14, (i + (f ? 1 : 0)) % 2 ? '#5af0ff' : '#ff3aff');
      s.ell(18, 19, 5, 2, ['#e0ffd0', '#a0f080', '#60c040', '#308020']);
    });
    case 'nanite': return paint(12, 12, (s) => {
      for (let y = 1; y < 10; y++) s.line(6 - (y * 0.5), y, 6 + (y * 0.5), y, STEEL[y < 4 ? 0 : y < 7 ? 1 : 2]);
      s.put(6, 6 + (f ? 1 : 0), '#ff3a3a');
    });
    case 'overlord': return paint(76, 68, (s) => {
      // A floating AI core: a metal skull-shaped head, one red eye, cables trailing below
      for (let i = 0; i < 5; i++) s.line(24 + i * 7, 46, 18 + i * 10 + (f ? 2 : -2) * (i % 2 ? 1 : -1), 66, i % 2 ? NEONP[2] : NEON[2], 2);
      s.ell(38, 28, 26, 22, DARKSTEEL, 0.03);
      s.ell(38, 24, 20, 15, SPACE, 0.02);
      for (let x = 22; x <= 54; x += 4) s.put(x, 40, NEON[1]);
      s.ell(38, 26, 9, 8, EYE); s.ell(38, 26, 6.5, 6, VISORR); s.ell(38, 26, 2.6, 2.6, ['#ffffff', '#fff0e0', '#ffd0b0', '#ffa080']);
      s.rect(16, 12, 4, 10, NEONP); s.rect(56, 12, 4, 10, NEONP);
      for (let a = 0; a < 16; a++) { const an = a / 16 * Math.PI * 2 + (f ? 0.2 : 0); s.put(38 + Math.cos(an) * 34, 28 + Math.sin(an) * 9, a % 2 ? NEON[1] : NEONP[1]); }
    });
    case 'chariot': return paint(46, 32, (s) => {
      const H = LEATHER;
      // horse
      s.ell(31, 15, 9, 5, H, 0.08); s.ell(40, 8, 3.5, 4, H); s.rect(41, 7, 4, 3, H); s.put(40, 6, EYE);
      s.rect(37, 2, 3, 3, ['#3a2010', '#2a160a', '#1e1008', '#140a04']);
      const L = f ? [[24, 8], [28, 7], [33, 8], [37, 7]] : [[25, 7], [27, 8], [34, 7], [36, 8]];
      L.forEach(([x, hgt]) => s.rect(x, 18, 2, hgt, H));
      s.line(17, 15, 23, 15, WOOD[2]);
      // rider
      s.ell(10, 6, 3.5, 3.5, SKIN); s.ell(10, 4, 4, 2.6, BRONZE); s.rect(7, 8, 7, 6, RED); s.put(12, 6, EYE);
      // cart
      s.rect(2, 12, 15, 9, BRONZE); s.rect(3, 13, 13, 2, RED);
      s.ell(9, 23, 6, 6, WOOD); s.ell(9, 23, 3, 3, ['#3a2516', '#3a2516', '#2a1a0e', '#1a1008']);
      for (let a = 0; a < 4; a++) s.line(9, 23, 9 + Math.cos(a * 0.8 + (f ? 0.4 : 0)) * 5, 23 + Math.sin(a * 0.8 + (f ? 0.4 : 0)) * 5, WOOD[0]);
    });
  }
  return null;
}

function wizard() {
  return paint(26, 36, (s) => {
    s.ell(12, 26, 8, 9, PURPLE, 0.05);
    s.rect(5, 30, 14, 5, PURPLE);
    s.ell(12, 13, 5, 5, SKIN);
    s.ell(12, 18, 5, 5, WHITE, 0.1);
    s.line(8, 9, 12, 0, PURPLE[1], 2); s.line(16, 9, 12, 0, PURPLE[2], 2);
    for (let y = 2; y < 10; y++) s.line(12 - (y - 1) * 0.5, y, 12 + (y - 1) * 0.5, y, PURPLE[1 + (y > 6 ? 1 : 0)]);
    s.rect(5, 9, 15, 2, PURPLE);
    s.put(9, 4, '#f0d040'); s.put(14, 7, '#f0d040');
    s.put(10, 13, EYE); s.put(14, 13, EYE);
    s.line(22, 34, 22, 8, WOOD[1]); s.line(23, 34, 23, 8, WOOD[2]);
    s.ell(22.5, 6, 2.6, 2.6, ['#e0fcff', '#7ae0ff', '#3aa0e0', '#1a60a0']);
    s.ell(19, 22, 2, 2.5, SKIN);
  });
}


// ---------------------------------------------------------------------------
// Lush scenery: 6-tone ramps (light to dark) shaded from the top left, like the approved mockup
const T_LEAF = ['#b4ea64', '#74cc3e', '#44aa3a', '#2a8a3a', '#1c6a36', '#124a2c'];
const T_AUTUMN = ['#ffd25a', '#ffa03a', '#f0702c', '#c84a26', '#962e22', '#641c1a'];
const T_ALIEN = ['#c0a0ff', '#9a70f0', '#7a4ad8', '#5c34b0', '#422488', '#2c1860'];
const T_PINE = ['#7adca6', '#44b88a', '#279872', '#18785c', '#0f5848', '#0a3a36'];
const T_BARK = ['#d29256', '#a8693c', '#7e4a2c', '#58321e', '#3a2014'];
const T_STONE = ['#eeeadc', '#c6c0b4', '#9a948e', '#716c72', '#4e4a58'];
const T_MOSS = ['#b4dc58', '#80bc3c', '#58983a'];
const T_FRUIT = ['#ffe0a0', '#ff8a4a', '#e0482c', '#a02420'];
function shadeIdx(sv, n) { return Math.max(0, Math.min(n - 1, Math.round((1 - (sv + 1) / 2) * (n - 1)))); }
function lushEll(s, cx, cy, rx, ry, ramp, bias = 0, tex = 0, sd = 0) {
  const m = Math.max(rx, ry) + 1;
  for (let y = Math.floor(cy - ry); y <= cy + ry; y++) for (let x = Math.floor(cx - rx); x <= cx + rx; x++) {
    const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = (dx / rx) ** 2 + (dy / ry) ** 2;
    if (d > 1) continue;
    let i = shadeIdx(-dx / m * 0.9 - dy / m * 1.1 + (1 - d) * 0.5 - 0.15 - bias, ramp.length);
    if (tex && ghash(x + 40, y + 40, 91 + sd) < tex) i = Math.min(ramp.length - 1, i + 1);
    s.put(x, y, ramp[i]);
  }
}
function lushRect(s, x0, y0, w, h, ramp, bias = 0, tex = 0) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) {
    const nx = (x - x0) / Math.max(1, w - 1) * 2 - 1, ny = (y - y0) / Math.max(1, h - 1) * 2 - 1;
    let i = shadeIdx(-nx * 0.7 - ny * 0.5 + 0.2 - bias, ramp.length);
    if (tex && ghash(x, y, 92) < tex) i = Math.min(ramp.length - 1, i + 1);
    s.put(x, y, ramp[i]);
  }
}
function lushTree(leaf, fruit, big = 1.35) {
  const w = Math.round(44 * big), h = Math.round(56 * big);
  return paint(w, h, (s) => {
    const tx = w / 2, tw = Math.round(8 * big), ttop = Math.round(30 * big);
    lushRect(s, Math.round(tx - tw / 2), ttop, tw, h - ttop - 1, T_BARK, 0, 0.12);
    lushEll(s, tx - 6, h - 3, 3, 2, T_BARK, 0.3); lushEll(s, tx + 6, h - 3, 3, 2, T_BARK, 0.5);
    for (let j = ttop + 2; j < h - 2; j += 3) s.put(tx - 1 + (j % 2), j, T_BARK[4]);
    const R0 = 15 * big;
    const clumps = [[0, -2, 1.0, 0.2], [-10, 2, 0.75, 0.45], [10, 2, 0.75, 0.55], [-6, -9, 0.7, -0.05], [6, -9, 0.7, 0.05], [0, -14, 0.6, -0.2], [-12, -4, 0.6, 0.25], [12, -4, 0.6, 0.35], [-4, 6, 0.7, 0.6], [6, 6, 0.65, 0.7]];
    clumps.forEach(([ox, oy, r, b]) => lushEll(s, tx + ox * big, 20 * big + oy * big, R0 * r, R0 * r * 0.9, leaf, b, 0.16));
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const c = s.get(i, j), k = leaf.indexOf(c);
      if (k >= 0 && k < 3 && ghash(i, j, 77) < 0.06) { s.put(i, j, leaf[0]); if (s.get(i + 1, j + 1)) s.put(i + 1, j + 1, leaf[k + 1]); }
    }
    if (fruit) [[-7, 4], [8, -2], [2, 9]].forEach(([fx, fy]) => lushEll(s, tx + fx * big, 20 * big + fy * big, 2, 2, fruit));
  });
}
function lushPine(sc = 1.4) {
  const w = Math.round(30 * sc), h = Math.round(52 * sc);
  return paint(w, h, (s) => {
    const tx = w / 2;
    lushRect(s, Math.round(tx - 3), h - 11, 6, 10, T_BARK, 0, 0.1);
    for (let t = 0; t < 5; t++) {
      const ty = 3 + t * (h - 16) / 5, half = (3 + t * 2.6) * sc, th = 12 * sc;
      for (let j = 0; j < th; j++) for (let i = -half - 2; i <= half + 2; i++) {
        const lim = half * (0.35 + 0.65 * j / th) + (ghash(Math.round(i) + 30, j + t * 20, 5) - 0.5) * 2.4;
        if (Math.abs(i) > lim) continue;
        let k = shadeIdx(-i / (half + 1) * 0.9 + 0.4 - j / th * 0.9 - t * 0.06, T_PINE.length);
        if (ghash(Math.round(tx + i), Math.round(ty + j), 93) < 0.14) k = Math.min(5, k + 1);
        s.put(tx + i, ty + j, T_PINE[k]);
      }
      for (let i = -half; i <= half; i += 2) s.put(tx + i, ty + th - (Math.round(i) % 4 === 0 ? 0 : 1), T_PINE[4]);
    }
  });
}
const LUSH = {
  tree: () => lushTree(T_LEAF, T_FRUIT),
  tree_autumn: () => lushTree(T_AUTUMN, null),
  tree_alien: () => lushTree(T_ALIEN, ['#e0ffff', '#70f0ff', '#20b0e0', '#106090']),
  pine: () => lushPine(1.4),
  bush: () => paint(26, 18, (s) => {
    [[8, 11, 6, 0.3], [18, 11, 6, 0.45], [13, 7, 6.5, 0]].forEach(([x, y, r, b]) => lushEll(s, x, y, r, r * 0.85, T_LEAF, b, 0.16));
    [[9, 9], [16, 6], [19, 12]].forEach(([x, y]) => { s.put(x, y, '#ff4a6a'); s.put(x, y - 1, '#ffb0c0'); });
  }),
  fern: () => paint(26, 18, (s) => {
    [[-2.4, 11], [-1.9, 12], [-1.3, 12], [-0.7, 11], [-3.0, 9], [-0.1, 9]].forEach(([a, L]) => {
      for (let t = 0; t <= L; t++) {
        const px = 13 + Math.cos(a) * t, py = 16 + Math.sin(a) * t * 0.9, wd = Math.sin(Math.PI * t / L) * 2.2;
        for (let k = -wd; k <= wd; k += 0.5) s.put(px - Math.sin(a) * k, py + Math.cos(a) * k * 0.9, k < -0.5 ? T_LEAF[1] : k > 0.8 ? T_LEAF[3] : T_LEAF[2]);
        s.put(px, py, T_LEAF[4]);
      }
    });
  }),
  boulder: () => paint(24, 17, (s) => {
    lushEll(s, 11, 9, 10, 7.2, T_STONE, 0.05, 0.08); lushEll(s, 16, 11, 5.5, 4.5, T_STONE, 0.25);
    for (let x = 0; x < 24; x++) for (let y = 0; y < 7; y++) if (s.get(x, y) && ghash(x, y, 94) < 0.55 && gnoise(x * 4 % 192, y * 4 % 192, 16, 3) > 0.45) s.put(x, y, T_MOSS[y < 3 ? 0 : 1]);
    s.line(9, 6, 12, 11, T_STONE[4]);
  }),
  menhir: () => paint(14, 28, (s) => {
    lushEll(s, 7, 14, 5.5, 13, T_STONE, 0, 0.1); lushRect(s, 2, 20, 10, 7, T_STONE, 0.2, 0.1);
    [[6, 11], [7, 11], [8, 12], [8, 13], [7, 14], [6, 14], [5, 13], [5, 12], [6, 12], [7, 13]].forEach(([x, y]) => s.put(x, y, '#c0482c'));
    for (let x = 0; x < 14; x++) for (let y = 0; y < 7; y++) if (s.get(x, y) && ghash(x, y, 95) < 0.5) s.put(x, y, T_MOSS[1]);
  }),
};

// Chunky pixel heart for the HUD: shiny red, with a dark purple empty half
function pixelHeart(kind) {
  const rows = ['.11...11.', '1221.1221', '122211111', '122111111', '.1111111.', '..11111..', '...111...', '....1....'];
  return paint(11, 10, (s) => rows.forEach((r, j) => [...r].forEach((ch, i) => {
    if (ch === '.') return;
    let c = ch === '2' ? '#ffd0d8' : (i > 5 || j > 4) ? '#c01c3c' : '#ff3a5a';
    if (kind === 'empty' || (kind === 'half' && i > 4)) c = ch === '2' ? '#7a6a8a' : '#3a2c4a';
    if (kind === 'ghost') c = ch === '2' ? '#ffffff' : (i > 5 || j > 4) ? '#7ac8e8' : '#c0f0ff';
    s.put(i + 1, j + 1, c);
  })), { outline: kind === 'ghost' ? '#1a3a5a' : '#2a0a18' });
}

// Items, icons and decor
const ITEMS = {
  club: () => paint(16, 16, (s) => { s.line(2, 14, 10, 6, WOOD[1], 2); s.ell(11, 5, 4, 4, WOOD, 0.2); s.put(10, 3, WOOD[0]); }),
  axe: () => paint(16, 16, (s) => { s.line(3, 14, 11, 4, WOOD[1], 2); s.ell(10, 5, 5, 3.8, GREYS, 0.15); s.put(7, 4, GREYS[0]); }),
  spear: () => paint(32, 8, (s) => { s.line(1, 3, 24, 3, WOOD[1]); s.line(1, 4, 24, 4, WOOD[2]); s.ell(27, 3.5, 4, 2.2, GREYS); s.put(25, 2, '#f0e8dc'); s.rect(22, 2, 2, 4, LEATHER); }),
  rock: () => paint(14, 12, (s) => s.ell(7, 6, 6, 5, GREYS, 0.15)),
  bolt: () => paint(12, 16, (s) => { s.line(8, 1, 4, 7, GOLD[1], 2); s.line(4, 7, 8, 8, GOLD[0], 2); s.line(8, 8, 3, 15, GOLD[1], 2); }),
  // Signature weapons
  boneclub: () => paint(16, 16, (s) => { s.line(2, 14, 10, 6, BONE[1], 2); s.ell(11, 5, 4.2, 4.2, BONE, 0.15); s.ell(3, 13, 1.8, 1.8, BONE); [[14, 2], [15, 6], [9, 1]].forEach(([x, y]) => s.put(x, y, BONE[3])); s.put(10, 3, '#ffffff'); }),
  amber: () => paint(14, 12, (s) => { s.ell(7, 6, 6, 5, ['#ffe08a', '#f0a830', '#c06a18', '#7a3a0c'], 0.1); s.put(5, 4, '#fff6c8'); s.put(6, 4, '#fff6c8'); s.put(9, 7, '#7a3a0c'); }),
  pilum: () => paint(32, 8, (s) => { s.line(1, 3, 22, 3, WOOD[1]); s.line(1, 4, 22, 4, WOOD[2]); s.line(22, 3, 26, 3, STEEL[1]); s.line(22, 4, 26, 4, STEEL[2]); s.ell(28, 3.5, 3.5, 2.2, GOLD); s.put(28, 2, '#fffbe0'); s.rect(19, 2, 2, 4, GOLD); }),
  holyblade: () => paint(16, 16, (s) => { s.line(4, 12, 13, 3, STEEL[0], 2); s.line(5, 13, 13, 5, STEEL[2]); s.line(2, 10, 6, 14, GOLD[1], 2); s.ell(2.5, 13.5, 1.5, 1.5, GOLD); s.put(12, 3, '#ffffff'); }),
  tesla: () => paint(12, 16, (s) => { s.rect(3, 9, 6, 6, COPPER); for (let y = 10; y < 15; y += 2) s.rect(3, y, 6, 1, BRASS); s.line(6, 9, 6, 4, BRASS[1]); s.ell(6, 3, 2.6, 2.6, ['#e0fcff', '#7ae0ff', '#3aa0e0', '#1a60a0']); s.put(1, 2, '#7ae0ff'); s.put(10, 1, '#7ae0ff'); }),
  gem_s: () => paint(8, 10, (s) => { const G = ['#d0f4ff', '#6ad0ff', '#2a8ae0', '#1a4aa0']; s.rect(2, 1, 3, 7, G); s.rect(1, 3, 5, 3, G); s.put(2, 2, '#ffffff'); }),
  gem_m: () => paint(10, 12, (s) => { const G = ['#d8ffb0', '#88e05a', '#4aa83a', '#2a6a20']; s.rect(3, 1, 3, 9, G); s.rect(1, 3, 7, 5, G); s.put(3, 2, '#ffffff'); }),
  gem_l: () => paint(12, 14, (s) => { const G = ['#ffd0e8', '#f070b0', '#c03a80', '#7a1a4a']; s.rect(4, 1, 3, 11, G); s.rect(2, 3, 7, 7, G); s.rect(1, 5, 9, 3, G); s.put(4, 2, '#ffffff'); }),
  coin: () => paint(10, 10, (s) => { s.ell(5, 5, 4, 4, GOLD); s.put(5, 3, GOLD[2]); s.put(5, 4, GOLD[2]); s.put(5, 5, GOLD[2]); }),
  meat: () => paint(16, 14, (s) => { s.line(1, 12, 6, 8, BONE[1], 2); s.ell(1.5, 12.5, 1.5, 1.5, BONE); s.ell(9, 6, 6, 5, RED, 0.1); s.ell(7, 4, 2, 1.4, ['#f4a090', '#f4a090', '#e07060', '#b8402e']); }),
  magnet: () => paint(14, 14, (s) => { s.rect(2, 2, 4, 9, RED); s.rect(8, 2, 4, 9, RED); s.rect(2, 9, 10, 3, RED); s.rect(2, 1, 4, 3, STEEL); s.rect(8, 1, 4, 3, STEEL); }),
  treasure: () => paint(22, 18, (s) => { s.rect(1, 6, 20, 11, ['#b85a2a', '#8a3a1a', '#62240e', '#3e1408'], 0.05); s.ell(11, 6, 10, 5, ['#b85a2a', '#8a3a1a', '#62240e', '#3e1408']); s.rect(1, 9, 20, 2, GOLD); s.rect(4, 2, 2, 15, GOLD); s.rect(16, 2, 2, 15, GOLD); s.rect(9, 8, 4, 5, GOLD); s.put(11, 10, EYE); }),
  chest_open: () => paint(22, 22, (s) => { s.rect(1, 10, 20, 11, ['#b85a2a', '#8a3a1a', '#62240e', '#3e1408'], 0.05); s.rect(1, 13, 20, 2, GOLD); s.rect(2, 1, 18, 7, ['#8a3a1a', '#62240e', '#3e1408', '#2a0c04']); s.rect(2, 1, 18, 1, GOLD); s.ell(11, 10, 8, 2.5, ['#fff8c0', '#ffe060', '#f0c040', '#c89020']); s.put(7, 9, '#ffffff'); s.put(14, 9, '#ffffff'); }),
  scroll: () => paint(14, 16, (s) => { s.rect(3, 2, 8, 12, SEPIA); s.ell(7, 2, 5, 1.6, SEPIA); s.ell(7, 14, 5, 1.6, SEPIA); for (let y = 5; y < 12; y += 2) s.line(5, y, 9, y, SEPIA[3]); s.put(9, 12, RED[1]); }),
  trophy: () => paint(14, 16, (s) => { s.ell(7, 5, 5, 4.5, GOLD); s.ell(2, 5, 1.6, 2.4, GOLD); s.ell(12, 5, 1.6, 2.4, GOLD); s.rect(6, 9, 2, 3, GOLD); s.rect(3, 12, 8, 3, GOLD); s.put(5, 3, '#ffffff'); }),
  combo: () => paint(14, 14, (s) => { s.line(1, 12, 10, 3, STEEL[1], 2); s.line(12, 12, 3, 3, GOLD[1], 2); s.ell(7, 7, 2, 2, FIRE); }),
  cogicon: () => paint(14, 14, (s) => gear(s, 7, 7, 4.5, BRASS, 7)),
  easel: () => paint(20, 34, (s) => { s.line(4, 33, 10, 2, WOOD[1], 1); s.line(16, 33, 10, 2, WOOD[2], 1); s.line(10, 6, 10, 33, WOOD[2]); s.rect(2, 6, 16, 14, CREAM); s.ell(7, 12, 3, 3, ['#7ab0e0', '#5a90c8', '#3a70a8', '#1a5088']); s.rect(11, 14, 5, 4, GREEN); s.put(13, 10, '#e05a3a'); s.rect(1, 20, 18, 2, WOOD); }),
  gearpile: () => paint(26, 18, (s) => { gear(s, 8, 11, 5, BRASS, 7); gear(s, 18, 12, 4, COPPER, 6, 0.3); gear(s, 13, 6, 3, STEEL, 6); }),
  statue: () => paint(18, 44, (s) => { s.rect(2, 34, 14, 9, MARBLE); s.rect(4, 32, 10, 3, MARBLE); s.ell(9, 22, 5, 9, MARBLE); s.ell(9, 9, 4, 4.5, MARBLE); s.ell(8.5, 6, 4.5, 2.5, MARBLE, 0.3); s.rect(3, 17, 3, 8, MARBLE); s.rect(12, 15, 3, 7, MARBLE); s.put(10, 9, MARBLE[3]); }),
  chest: () => paint(20, 16, (s) => { s.rect(1, 5, 18, 10, WOOD, 0.1); s.ell(10, 5, 9, 4, WOOD); s.rect(1, 8, 18, 1, BRONZE); s.rect(8, 7, 4, 4, GOLD); s.put(10, 9, EYE); }),
  heart: () => pixelHeart('full'),
  heart_empty: () => pixelHeart('empty'),
  ghostheart: () => pixelHeart('ghost'),
  sandal: () => paint(14, 12, (s) => { s.ell(7, 8, 6, 2.6, LEATHER); s.line(4, 7, 8, 2, LEATHER[2]); s.line(10, 7, 8, 2, LEATHER[2]); s.put(8, 2, '#f0c060'); }),
  totem: () => paint(12, 18, (s) => { s.rect(2, 2, 8, 15, WOOD, 0.1); s.rect(1, 1, 10, 2, RED); s.put(4, 5, EYE); s.put(7, 5, EYE); s.rect(4, 8, 4, 1, RED[2]); s.put(4, 12, EYE); s.put(7, 12, EYE); s.rect(4, 14, 4, 1, GOLD[1]); }),
  flint: () => paint(12, 14, (s) => { for (let y = 0; y < 10; y++) s.line(6 - y * 0.5, y, 6 + y * 0.3, y, GREYS[y < 4 ? 0 : y < 7 ? 1 : 2]); s.rect(5, 10, 2, 4, LEATHER); }),
  tusk: () => paint(14, 14, (s) => { for (let i = 0; i < 10; i++) s.ell(2 + i, 2 + i * 0.9 + Math.sin(i / 3) * 1.5, 1.8 - i * 0.05 + 0.6, 1.6, BONE); }),
  // Thrown Bone Club: a bone with knobs on both ends
  bone: () => paint(16, 16, (s) => { s.line(4, 12, 12, 4, BONE[1], 2); s.ell(3, 11, 1.8, 1.8, BONE); s.ell(5, 13, 1.8, 1.8, BONE); s.ell(11, 3, 1.8, 1.8, BONE); s.ell(13, 5, 1.8, 1.8, BONE); s.put(11, 5, BONE[3]); s.put(10, 2, '#ffffff'); }),
  // Meteor: a cratered rock wrapped in flames, tail up and to the right
  meteor: () => paint(18, 18, (s) => { s.line(9, 8, 16, 1, FIRE[2], 3); s.line(8, 9, 14, 3, FIRE[1], 2); s.line(10, 6, 17, 2, FIRE[0]); s.ell(7, 11, 6.2, 6.2, FIRE, 0.1); s.ell(6.5, 11.5, 4.6, 4.6, ['#a07a64', '#7a5a48', '#5a3e30', '#3a261c'], 0.15); s.ell(5, 12, 1.2, 1.2, ['#3a261c', '#3a261c', '#2a1810', '#2a1810']); s.put(8, 10, '#2a1810'); s.put(7, 14, '#2a1810'); s.put(4, 9, FIRE[0]); }),
  // Fallen Star Fists: a golden gauntlet with a star on the back
  gauntlet: () => paint(16, 16, (s) => { s.rect(3, 4, 9, 8, GOLD, 0.05); for (let i = 0; i < 4; i++) s.rect(3 + i * 2, 2, 2, 3, GOLD); s.rect(11, 6, 3, 4, GOLD); s.rect(4, 12, 7, 3, NAVY); s.put(7, 6, '#ffffff'); s.put(6, 7, '#ffffff'); s.put(8, 7, '#ffffff'); s.put(7, 8, '#ffffff'); s.put(7, 7, '#7ad0f4'); }),
  // Focus (critical chance): a red bullseye
  crit: () => paint(14, 14, (s) => { s.ell(7, 7, 6, 6, RED); s.ell(7, 7, 4, 4, WHITE); s.ell(7, 7, 2, 2, RED); s.put(6, 6, '#ffffff'); }),
  // Lethality (critical damage): a sabertooth fang with a red tip
  fang: () => paint(12, 16, (s) => { for (let y = 0; y < 13; y++) s.line(3 + y * 0.25, y, 9 - y * 0.35, y, BONE[y < 5 ? 0 : y < 9 ? 1 : 2]); s.rect(5, 12, 2, 3, RED); s.put(4, 2, '#ffffff'); }),
  // English Tea: a china teacup with steam
  tea: () => paint(16, 15, (s) => { s.line(5, 0, 6, 3, '#e8f0f8'); s.line(9, 0, 8, 3, '#e8f0f8'); s.rect(2, 5, 10, 6, ['#ffffff', '#e8f0f8', '#c8d4ea', '#8a9ab8'], 0.1); s.ell(7, 5, 5, 1.4, ['#a8642a', '#8a4a1a', '#6a3410', '#4a2408']); s.ell(13, 8, 2, 2, ['#ffffff', '#e8f0f8', '#c8d4ea', '#8a9ab8']); s.ell(13, 8, 0.9, 0.9, [null, null, null, null]); s.rect(5, 7, 4, 1, '#3a6ac8'); s.ell(7, 12.5, 6, 1.5, ['#ffffff', '#e8f0f8', '#c8d4ea', '#8a9ab8']); }),
  // Difficulty: a war drum
  wardrum: () => paint(16, 14, (s) => { s.rect(2, 4, 12, 8, RED, 0.1); s.ell(8, 4, 6, 2.4, CREAM); for (let x = 3; x < 14; x += 3) s.line(x, 5, x + 1.5, 11, GOLD[2]); s.line(10, 0, 13, 3, WOOD[1]); s.ell(9.5, 0.5, 1, 1, CREAM); }),
  lodestone: () => paint(13, 13, (s) => { s.ell(6.5, 6.5, 5.5, 5, GREYS, 0.15); s.put(5, 4, '#7ad0f4'); s.put(8, 7, '#7ad0f4'); s.put(4, 8, '#7ad0f4'); }),
  skull: () => paint(12, 12, (s) => { s.ell(6, 5, 5, 4.5, BONE); s.rect(3, 8, 6, 3, BONE); s.ell(4, 5, 1.4, 1.4, [EYE, EYE, EYE, EYE]); s.ell(8, 5, 1.4, 1.4, [EYE, EYE, EYE, EYE]); s.put(6, 7, EYE); }),
  lock: () => paint(12, 14, (s) => { s.ell(6, 4, 3.5, 3.5, GREYS); s.ell(6, 4, 1.6, 1.6, [null, null, null, null]); s.rect(1, 6, 10, 7, GOLD); s.put(6, 9, EYE); s.put(6, 10, EYE); }),
  potion: () => paint(12, 15, (s) => { s.rect(5, 1, 2, 4, CREAM); s.ell(6, 9, 5, 5, ['#ff8a8a', '#e04040', '#a82020', '#6a1010']); s.put(4, 7, '#ffffff'); }),
  star: () => paint(13, 13, (s) => { s.ell(6.5, 6.5, 2.5, 2.5, GOLD); for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + a * Math.PI * 2 / 5; s.line(6.5, 6.5, 6.5 + Math.cos(an) * 6, 6.5 + Math.sin(an) * 6, GOLD[1]); } }),
  reroll: () => paint(13, 13, (s) => { for (let a = 0.6; a < 5.6; a += 0.12) s.put(6.5 + Math.cos(a) * 4.5, 6.5 + Math.sin(a) * 4.5, '#7ad0f4'); s.line(10, 3, 12, 5, '#7ad0f4'); s.line(10, 3, 9, 6, '#7ad0f4'); }),
  boulder: () => paint(24, 18, (s) => { s.ell(12, 10, 11, 7, STONE, 0.12); s.ell(8, 8, 3, 2, [STONE[0], STONE[0], STONE[1], STONE[1]]); }),
  fern: () => paint(20, 14, (s) => { for (let i = 0; i < 5; i++) { const a = -2.6 + i * 0.55; for (let r = 0; r < 9; r++) s.put(10 + Math.cos(a) * r, 13 + Math.sin(a) * r * 1.1, LEAF[r % 3]); } }),
  bones: () => paint(18, 10, (s) => { s.line(1, 6, 12, 3, BONE[1]); s.line(1, 7, 12, 4, BONE[2]); s.ell(2, 6, 1.6, 1.6, BONE); s.ell(12, 3.5, 1.6, 1.6, BONE); s.ell(14, 7, 3, 2.2, BONE); s.put(14, 7, EYE); s.put(15, 7, EYE); }),
  tree: () => paint(44, 56, (s) => { s.rect(19, 30, 6, 24, WOOD, 0.2); s.line(22, 30, 12, 20, WOOD[2], 2); s.line(22, 30, 32, 21, WOOD[2], 2); s.ell(22, 16, 20, 9, LEAF, 0.3); s.ell(11, 20, 9, 5, LEAF, 0.3); s.ell(33, 20, 9, 5, LEAF, 0.3); }),
  column: () => paint(18, 44, (s) => { s.rect(1, 0, 16, 4, MARBLE); s.rect(3, 4, 12, 34, MARBLE); for (let x = 5; x < 14; x += 3) s.line(x, 5, x, 37, MARBLE[2]); s.rect(1, 38, 16, 5, MARBLE); }),
  broken: () => paint(20, 18, (s) => { s.rect(3, 6, 12, 10, MARBLE); s.line(3, 6, 8, 2, MARBLE[1]); s.line(8, 2, 15, 6, MARBLE[1]); s.rect(5, 3, 8, 3, MARBLE); for (let x = 5; x < 14; x += 3) s.line(x, 7, x, 15, MARBLE[2]); s.ell(17, 15, 2.5, 2, MARBLE); }),
  urn: () => paint(14, 18, (s) => { s.rect(4, 0, 6, 2, DINO); s.rect(5, 2, 4, 3, DINO); s.ell(7, 10, 6, 6, DINO); s.rect(3, 9, 8, 1, EYE); s.put(5, 11, EYE); s.put(9, 11, EYE); s.rect(4, 15, 6, 2, DINO); }),
  spark: () => paint(14, 14, (s) => {
    const S = ['#fffbe0', '#ffe060', '#ffa020', '#c05a10'];
    s.line(6.5, 0, 6.5, 12, S[1]); s.line(0, 6.5, 12, 6.5, S[1]);
    s.ell(6.5, 6.5, 3.2, 3.2, S); s.put(6, 5, '#ffffff'); s.put(2, 2, S[2]); s.put(11, 11, S[2]); s.put(11, 2, S[2]); s.put(2, 11, S[2]);
  }),
  heart_half: () => pixelHeart('half'),
  shieldicon: () => paint(10, 12, (s) => { const B = ['#e0f0ff', '#a8c8f0', '#6a8ac8', '#3a5a9a']; s.rect(1, 1, 8, 5, B); s.ell(5, 6, 4, 4.5, B); s.put(5, 3, '#ffffff'); }),
  potion_purple: () => paint(12, 15, (s) => { s.rect(5, 1, 2, 4, CREAM); s.ell(6, 9, 5, 5, PURPLE); s.put(4, 7, '#ffffff'); s.put(7, 10, '#f0d040'); s.put(5, 11, '#7ad0f4'); }),
  rabbitfoot: () => paint(12, 16, (s) => { s.ell(6, 10, 4, 5, CREAM, 0.1); s.ell(4, 5, 1.6, 3, CREAM); s.ell(8, 5, 1.6, 3, CREAM); s.rect(3, 14, 6, 1, GOLD); s.put(6, 13, GOLD[1]); }),
  firegem: () => paint(12, 14, (s) => { for (let y = 1; y < 13; y++) { const w = y < 5 ? y : 13 - y; s.line(6 - w * 0.6, y, 6 + w * 0.6, y, FIRE[y < 4 ? 0 : y < 8 ? 1 : 2]); } s.put(5, 4, '#ffffff'); }),
  // Relics
  ark: () => paint(20, 16, (s) => { s.rect(3, 6, 14, 8, GOLD, 0.1); s.rect(3, 6, 14, 1, GOLD[3]); s.line(1, 13, 19, 13, WOOD[1]); s.ell(6, 4, 3, 2, GOLD); s.ell(14, 4, 3, 2, GOLD); s.line(4, 3, 1, 1, GOLD[0]); s.line(16, 3, 19, 1, GOLD[0]); s.put(10, 9, '#fffbe0'); s.put(9, 10, GOLD[3]); s.put(11, 10, GOLD[3]); }),
  monalisa: () => paint(14, 18, (s) => { s.rect(0, 0, 14, 18, GOLD, 0.1); s.rect(2, 2, 10, 14, ['#6a7a4a', '#4a5a34', '#3a4426', '#262e18']); s.ell(7, 7, 2.6, 3.2, ['#e8c8a0', '#d0a878', '#b08858', '#806040']); s.ell(7, 6, 3.4, 3.6, ['#3a2416', '#2a1a10', '#1a100a', '#100804']); s.ell(7, 7.5, 2, 2.5, ['#e8c8a0', '#d0a878', '#b08858', '#806040']); s.ell(7, 14, 4, 3, ['#3a2416', '#2a1a10', '#1a100a', '#100804']); s.put(6, 9, '#804030'); s.put(7, 9, '#804030'); }),
  rosetta: () => paint(14, 16, (s) => { s.ell(7, 8, 6.5, 7.5, DARKSTEEL, 0.15); for (let y = 3; y < 14; y += 2) s.line(3, y, 11 - (y % 4 ? 1 : 0), y, '#9a9aaa'); }),
  grail: () => paint(14, 16, (s) => { s.ell(7, 4, 6, 3.5, GOLD, 0.1); s.ell(7, 2.5, 5, 1.2, ['#a8202a', '#86181e', '#5a1014', '#3a0a0c']); s.rect(6, 7, 2, 5, GOLD); s.ell(7, 13, 4, 1.8, GOLD); s.put(4, 4, '#fffbe0'); s.put(9, 5, '#7ae0ff'); }),
  fleece: () => paint(18, 14, (s) => { for (let i = 0; i < 9; i++) s.ell(3 + (i % 5) * 3, 4 + Math.floor(i / 5) * 4 + (i % 2), 2.6, 2.4, GOLD); s.ell(9, 7, 7, 4, GOLD, 0.3); s.ell(16, 5, 2, 2, GOLD); s.put(16, 4, EYE); }),
  pandora: () => paint(16, 16, (s) => { s.ell(8, 3, 6, 3, ['#d0a0f0', '#a674d8', '#7e4cb4', '#5a3088']); s.rect(2, 6, 12, 8, WOOD, 0.15); s.rect(1, 5, 14, 2, GOLD); s.rect(7, 8, 2, 3, GOLD); for (const [x, y] of [[3, 1], [12, 0], [8, 0]]) s.put(x, y, '#f0d0ff'); }),
  alienegg: () => paint(14, 16, (s) => { s.ell(7, 9, 5.5, 6.5, ['#c8f0a0', '#8ad060', '#5a9a3a', '#2e5a1e'], 0.2); for (const [x, y] of [[5, 6], [9, 9], [6, 12]]) s.put(x, y, '#e0ff60'); s.put(5, 4, '#ffffff'); }),
  alien: () => paint(12, 12, (s) => { s.ell(6, 5, 4.5, 4, ['#a8f08a', '#6ad04a', '#3e9a2e', '#22601a']); s.put(4, 4, EYE); s.put(8, 4, EYE); s.put(3, 3, '#e0ffe0'); s.line(3, 8, 2, 11, '#3e9a2e'); s.line(6, 9, 6, 11, '#3e9a2e'); s.line(9, 8, 10, 11, '#3e9a2e'); }),
  declaration: () => paint(14, 18, (s) => { s.rect(2, 2, 10, 14, SEPIA, 0.1); s.ell(7, 2, 6, 1.5, SEPIA); s.ell(7, 16, 6, 1.5, SEPIA); for (let y = 4; y < 14; y += 2) s.line(4, y, 10 - (y % 4 ? 2 : 0), y, '#6a5434'); s.put(9, 13, '#8a2020'); }),
  excalibur: () => paint(44, 10, (s) => { s.line(10, 4, 40, 4, STEEL[0], 2); s.line(10, 5, 40, 5, STEEL[2]); s.put(41, 4, STEEL[0]); s.rect(8, 1, 2, 8, GOLD); s.line(1, 4, 7, 4, ['#3a6ac8', '#2c4c8a'][0], 2); s.ell(1, 4.5, 1.5, 1.5, GOLD); s.put(20, 4, '#c8f0ff'); s.put(30, 4, '#c8f0ff'); }),
  lightray: () => paint(32, 8, (s) => { s.line(0, 3, 30, 3, '#fff4b0', 2); s.line(0, 3, 30, 3, '#ffffff'); s.ell(29, 3.5, 3, 3, GOLD); }),
  mirror: () => paint(14, 18, (s) => { s.ell(7, 7, 6, 7, GOLD); s.ell(7, 7, 4.2, 5.2, ['#e0fcff', '#a8e0f0', '#7ab0d0', '#4a80a8']); s.put(5, 4, '#ffffff'); s.put(6, 5, '#ffffff'); s.rect(6, 13, 3, 4, GOLD); }),
  crystal: () => paint(12, 16, (s) => { const C = ['#e0fcff', '#7ae0ff', '#3aa0e0', '#1a60a0']; for (let y = 0; y < 14; y++) { const w = y < 5 ? y : 14 - y; s.line(6 - w * 0.6, y, 6 + w * 0.6, y, C[y < 4 ? 0 : y < 8 ? 1 : 2]); } s.put(5, 4, '#ffffff'); }),
  feather: () => paint(14, 16, (s) => { for (let i = 0; i < 11; i++) s.ell(4 + i * 0.7, 13 - i * 1.1, 2.6 - Math.abs(i - 5) * 0.2, 1.5, FIRE, 0.1); s.line(2, 15, 11, 2, FIRE[3]); }),
  idol: () => paint(12, 16, (s) => { s.ell(6, 4, 4, 4, GOLD); s.rect(3, 7, 6, 7, GOLD); s.rect(2, 13, 8, 2, GOLD); s.put(4, 4, EYE); s.put(7, 4, EYE); s.put(5, 10, GOLD[3]); s.put(6, 10, GOLD[3]); }),
  banner: () => paint(18, 46, (s) => { s.line(4, 2, 4, 44, WOOD[1], 2); s.ell(4.5, 1.5, 1.6, 1.6, GOLD); s.rect(6, 4, 10, 20, RED); s.rect(6, 4, 10, 2, GOLD); s.put(10, 12, '#f0d040'); s.put(11, 12, '#f0d040'); s.put(10, 13, '#f0d040'); s.put(11, 11, '#f0d040'); s.line(6, 24, 11, 28, RED[1]); s.line(16, 24, 11, 28, RED[2]); }),
  haybale: () => paint(22, 16, (s) => { s.ell(11, 9, 10, 6, GOLD.slice(1).concat(['#5a3a10']), 0.3); s.rect(4, 6, 1, 8, LEATHER); s.rect(17, 6, 1, 8, LEATHER); }),
  shrub: () => paint(18, 14, (s) => { s.ell(9, 8, 8, 5, GREEN, 0.25); s.ell(5, 6, 4, 3, GREEN, 0.2); s.put(12, 6, '#d84a4a'); s.put(7, 9, '#d84a4a'); }),
  gravestone: () => paint(14, 18, (s) => { s.ell(7, 6, 5.5, 5, GREYS); s.rect(2, 6, 11, 10, GREYS, 0.1); s.line(7, 4, 7, 11, GREYS[3]); s.line(5, 6, 9, 6, GREYS[3]); s.ell(7, 16, 6, 1.5, GREEN); }),
  // Weapons from the later ages
  dynamite: () => paint(14, 16, (s) => { for (const x of [2, 6, 10]) s.rect(x, 5, 3, 10, RED); s.rect(2, 8, 11, 1, SACK); s.rect(2, 12, 11, 1, SACK); s.line(7, 5, 9, 1, '#5a4030'); s.put(10, 0, '#ffe060'); s.put(11, 1, '#ff8a20'); }),
  nailgun: () => paint(18, 12, (s) => { s.rect(1, 2, 13, 5, ORANGE); s.rect(14, 3, 3, 2, STEEL); s.rect(3, 7, 4, 4, DARKSTEEL); s.rect(9, 7, 3, 2, BLACKL); s.put(3, 3, '#ffe0b0'); }),
  nail: () => paint(14, 5, (s) => { s.line(1, 2, 11, 2, STEEL[0]); s.line(1, 3, 10, 3, STEEL[2]); s.rect(0, 1, 2, 3, STEEL); s.put(12, 2, STEEL[1]); }),
  disc: () => paint(16, 16, (s) => { s.ell(8, 8, 7, 7, NEON); s.ell(8, 8, 3, 3, ['#1a0e30', '#1a0e30', '#120a24', '#0a0618']); s.put(5, 4, '#ffffff'); s.put(6, 4, '#ffffff'); }),
  steamhammer: () => paint(18, 18, (s) => { s.line(2, 16, 10, 8, WOOD[1], 2); s.rect(8, 1, 9, 8, IRON, 0.05); s.rect(8, 3, 9, 1, BRASS[1]); s.rect(8, 6, 9, 1, BRASS[1]); s.ell(15, 1, 2, 1.4, WHITE); }),
  drone_s: () => paint(16, 10, (s) => { s.ell(8, 6, 4, 2.6, ['#f0f0f8', '#c8c8d8', '#9898ac', '#686880']); s.put(9, 6, '#5af0ff'); s.rect(0, 2, 6, 1, '#c8d0e0'); s.rect(10, 2, 6, 1, '#c8d0e0'); s.line(3, 3, 6, 5, IRON[1]); s.line(13, 3, 10, 5, IRON[1]); }),
  plasma: () => paint(32, 8, (s) => { s.rect(1, 2, 18, 4, SPACE); s.rect(4, 3, 12, 2, NEONP); s.line(19, 3, 27, 3, NEON[1]); s.line(19, 4, 27, 4, NEON[2]); s.ell(28, 3.5, 3.5, 2.6, NEON); s.put(28, 2, '#ffffff'); }),
  plasmabeam: () => paint(34, 8, (s) => { s.line(0, 3, 30, 3, NEON[1], 2); s.line(0, 3, 30, 3, '#ffffff'); s.ell(30, 3.5, 3.2, 3.2, NEON); }),
  coalicon: () => paint(14, 12, (s) => { s.ell(7, 6, 6, 5, SOOT, 0.3); s.put(5, 5, '#ff8a20'); s.put(9, 7, '#ffb040'); }),
  missile: () => paint(10, 20, (s) => { s.rect(3, 4, 4, 12, STEEL); s.ell(5, 16, 2, 3, RED); s.rect(1, 3, 8, 2, RED); s.put(4, 1, FIRE[1]); s.put(5, 0, FIRE[0]); s.put(5, 2, FIRE[2]); }),
  lute: () => paint(16, 18, (s) => { s.line(8, 9, 14, 1, WOOD[2], 2); s.ell(6, 12, 5, 4.5, WOOD, 0.05); s.ell(6, 12, 1.5, 1.5, [EYE, EYE, EYE, EYE]); s.rect(13, 0, 3, 2, WOOD[3]); }),
  flask: () => paint(12, 16, (s) => { s.rect(5, 1, 3, 5, CREAM); s.ell(6, 10, 5, 5, ['#b0ff8a', '#6ad04a', '#3e9a2e', '#22601a']); s.put(4, 8, '#ffffff'); s.put(7, 12, '#e0ffb0'); s.rect(4, 0, 5, 2, WOOD); }),
  // Points up; the game turns it so the point faces away from the player
  gladius: () => paint(10, 26, (s) => {
    s.put(4, 0, STEEL[1]); s.put(5, 0, STEEL[1]);
    s.rect(3, 1, 4, 15, STEEL); s.line(5, 2, 5, 15, STEEL[0]); s.line(6, 2, 6, 15, STEEL[2]);
    s.rect(0, 16, 10, 2, GOLD); s.rect(4, 18, 2, 5, LEATHER); s.put(4, 20, '#e0503c'); s.put(5, 20, '#b8322a');
    s.ell(4.5, 24, 2.2, 1.6, GOLD);
  }),
  swordcane: () => paint(32, 8, (s) => { s.line(1, 3, 12, 3, BLACKL[1], 2); s.ell(1.5, 3.5, 1.6, 1.6, GOLD); s.rect(12, 2, 2, 4, GOLD); s.line(14, 3, 29, 3, STEEL[0]); s.line(14, 4, 28, 4, STEEL[2]); s.put(30, 3, STEEL[1]); }),
  guitar: () => paint(16, 18, (s) => { s.line(7, 10, 14, 1, BLACKL[0], 2); s.ell(5, 12, 4.5, 4, RED); s.ell(5, 12, 1.4, 1.4, [EYE, EYE, EYE, EYE]); s.rect(13, 0, 3, 2, STEEL); s.line(9, 12, 12, 15, '#ffe060'); }),
  raygun: () => paint(18, 12, (s) => { s.ell(7, 4, 6, 3, SPACE); s.rect(12, 3, 5, 2, NEON); s.ell(16.5, 4, 1.5, 1.5, NEON); s.rect(4, 6, 3, 5, NEONP); s.put(6, 3, '#ffffff'); }),
  raybolt: () => paint(18, 8, (s) => { s.ell(10, 3.5, 7, 2.6, NEON); s.line(2, 3, 16, 3, '#ffffff'); }),
  // Industrial decor
  chimney: () => paint(22, 58, (s) => { s.rect(5, 6, 12, 50, BRICK, 0.15); for (let y = 9; y < 56; y += 4) s.line(5, y, 16, y, BRICK[3]); s.rect(3, 4, 16, 4, SOOT); s.ell(11, 2, 6, 2, WHITE); s.ell(7, 0, 4, 1.4, WHITE); }),
  crate: () => paint(20, 18, (s) => { s.rect(1, 2, 18, 15, WOOD, 0.1); s.rect(1, 2, 18, 2, WOOD[3]); s.line(2, 4, 18, 16, WOOD[3]); s.line(18, 4, 2, 16, WOOD[3]); }),
  barrel: () => paint(16, 20, (s) => { s.ell(8, 11, 7, 8, IRON, 0.05); s.rect(1, 5, 14, 1, DARKSTEEL); s.rect(1, 15, 14, 1, DARKSTEEL); s.ell(8, 3, 6, 2, SOOT); s.put(5, 10, '#f0c040'); }),
  rails: () => paint(44, 12, (s) => { for (let x = 2; x < 42; x += 6) s.rect(x, 2, 3, 9, WOOD); s.line(0, 4, 43, 4, IRON[1]); s.line(0, 9, 43, 9, IRON[1]); }, { noOutline: true }),
  // Modern decor
  hydrant: () => paint(14, 18, (s) => { s.rect(4, 4, 6, 12, RED); s.ell(7, 4, 3.5, 2.5, RED); s.rect(1, 8, 12, 3, RED); s.rect(3, 15, 8, 2, RED); s.put(7, 1, RED[0]); }),
  cone: () => paint(14, 16, (s) => { for (let y = 1; y < 13; y++) s.line(7 - y * 0.42, y, 7 + y * 0.42, y, (y > 4 && y < 8) ? WHITE[0] : ORANGE[y < 6 ? 0 : 1]); s.rect(1, 13, 12, 2, ORANGE); }),
  trashcan: () => paint(16, 20, (s) => { s.rect(2, 5, 12, 14, STEEL, 0.05); for (let x = 4; x < 13; x += 3) s.line(x, 6, x, 18, STEEL[2]); s.ell(8, 4, 7, 2, STEEL); s.rect(6, 1, 4, 2, STEEL); }),
  stopsign: () => paint(16, 38, (s) => { s.rect(7, 12, 2, 25, STEEL); s.ell(8, 7, 6.5, 6.5, RED); s.rect(4, 6, 8, 2, WHITE); }),
  bench: () => paint(30, 16, (s) => { s.rect(1, 3, 28, 3, WOOD); s.rect(1, 8, 28, 2, WOOD); s.rect(3, 10, 2, 5, DARKSTEEL); s.rect(25, 10, 2, 5, DARKSTEEL); }),
  // Future decor
  pylon: () => paint(14, 44, (s) => { s.rect(4, 6, 6, 36, DARKSTEEL); s.rect(5, 8, 4, 30, NEON); s.rect(2, 40, 10, 3, DARKSTEEL); s.ell(7, 4, 4, 3, NEONP); }),
  crystalrock: () => paint(22, 20, (s) => { s.ell(11, 16, 10, 4, SOOT); for (const [x, h] of [[6, 10], [11, 15], [16, 8]]) for (let y = 0; y < h; y++) s.line(x - (h - y) * 0.2, 17 - y, x + (h - y) * 0.2, 17 - y, NEONP[y > h - 4 ? 0 : 1]); }),
  pod: () => paint(20, 26, (s) => { s.ell(10, 13, 8, 11, SPACE, 0.02); s.ell(10, 11, 5, 6, ['#d8f8ff', '#a0e0f0', '#60b0d0', '#3080a0']); s.put(8, 8, '#ffffff'); s.rect(4, 23, 12, 2, DARKSTEEL); }),
  antenna: () => paint(18, 42, (s) => { s.line(9, 8, 9, 40, STEEL[1], 1); s.line(9, 40, 3, 40, STEEL[2]); s.line(9, 40, 15, 40, STEEL[2]); s.ell(9, 6, 6, 3, SPACE); s.put(9, 2, '#ff3a5a'); s.line(9, 3, 9, 6, STEEL[0]); }),
  holosign: () => paint(26, 34, (s) => { s.rect(12, 18, 2, 15, DARKSTEEL); s.rect(1, 1, 24, 16, ['#5af0ff', '#20b0e0', '#106090', '#083050']); s.rect(3, 3, 20, 12, ['#1a0e30', '#1a0e30', '#120a24', '#0a0618']); s.line(5, 6, 20, 6, NEONP[1]); s.line(5, 10, 15, 10, NEON[1]); }),
  cypress: () => paint(18, 48, (s) => { s.rect(8, 40, 3, 7, WOOD); s.ell(9, 22, 7, 20, DARKLEAF, 0.3); }),
};

const ANIM_ITEMS = {
  flame: (f) => paint(14, 18, (s) => { s.ell(7, 11, 5, 6, FIRE); s.ell(7 + (f ? 1 : -1), 7, 2.4, 4, FIRE.slice(0, 1).concat(FIRE.slice(0, 3))); s.put(7 + (f ? -2 : 2), 2, FIRE[1]); }),
  note: (f) => paint(10, 14, (s) => { const N = ['#ffe8ff', '#f070ff', '#b030e0', '#701a9a']; s.ell(3.5, 11 - f, 3, 2.4, N); s.line(6, 11 - f, 6, 2 - f, N[1]); s.line(6, 2 - f, 9, 4 - f, N[1]); }),
  spiritflame: (f) => { const SF = ['#e8fcff', '#8ae8ff', '#3aa8e0', '#1a5aa0']; return paint(14, 18, (s) => { s.ell(7, 11, 5, 6, SF); s.ell(7 + (f ? 1 : -1), 7, 2.4, 4, SF.slice(0, 1).concat(SF.slice(0, 3))); s.put(7 + (f ? -2 : 2), 2, SF[1]); }); },
  campfire: (f) => paint(22, 24, (s) => {
    for (let i = 0; i < 7; i++) { const a = Math.PI + i * Math.PI / 6; s.ell(11 + Math.cos(a) * 8, 21 + Math.sin(a) * 2.5, 2.4, 1.9, GREYS); }
    s.ell(11, 20, 8, 2.6, GREYS); s.line(4, 21, 17, 18, WOOD[1], 2); s.line(5, 18, 18, 21, WOOD[2], 2);
    s.ell(11, 13 + (f ? 1 : 0), 5, 6 + (f ? -1 : 0), FIRE); s.ell(11 + (f ? 1 : 0), 14, 2.6, 3.5, [FIRE[0], FIRE[0], FIRE[1], FIRE[2]]);
    s.put(9 + (f ? 2 : 0), 4, FIRE[1]); s.put(13 - (f ? 2 : 0), 3, FIRE[0]);
  }),
  torch: (f) => paint(12, 34, (s) => {
    s.line(6, 12, 6, 32, WOOD[1], 1); s.line(5, 12, 5, 32, WOOD[2], 1); s.rect(3, 11, 6, 2, GREYS);
    s.ell(5.5, 6 + (f ? 1 : 0), 3.5, 5, FIRE); s.ell(5.5 + (f ? 1 : -1), 7, 1.6, 2.6, [FIRE[0], FIRE[0], FIRE[1], FIRE[2]]);
  }),
  lantern: (f) => paint(12, 36, (s) => {
    s.line(6, 12, 6, 35, DARKSTEEL[1]); s.line(5, 12, 5, 35, DARKSTEEL[2]); s.rect(2, 33, 8, 2, DARKSTEEL);
    s.rect(2, 2, 8, 10, BRASS); s.rect(3, 4, 6, 6, FIRE.slice(f ? 0 : 1).concat(f ? [] : [FIRE[3]]));
    s.rect(1, 1, 10, 2, DARKSTEEL); s.put(6, 0, DARKSTEEL[0]);
  }),
  brazier: (f) => paint(16, 28, (s) => {
    s.rect(7, 12, 3, 14, BRONZE); s.rect(3, 25, 11, 2, BRONZE); s.ell(8.5, 11, 6, 3, BRONZE);
    s.ell(8.5, 6 + (f ? 1 : 0), 4, 5, FIRE); s.ell(8.5 + (f ? 1 : -1), 7, 2, 3, [FIRE[0], FIRE[0], FIRE[1], FIRE[2]]);
  }),
};

// Cave-art paintings scattered on the Stone Age ground (no outline, drawn like ochre paint)
const PAINTINGS = {
  handprint: () => paint(12, 14, (s) => {
    const c = '#9a3a1c';
    s.ell(6, 9, 4, 4, [c, c, c, c]);
    [[2, 2], [4, 1], [6, 1], [8, 2]].forEach(([x, y]) => s.line(x + 0.5, y, x + 0.5, 6, c));
    s.line(10, 8, 11, 5, c);
  }, { noOutline: true }),
  deer: () => paint(22, 14, (s) => {
    const c = '#7a2a14';
    s.line(3, 7, 15, 6, c, 2); s.line(15, 6, 18, 3, c, 2);
    s.line(18, 3, 17, 0, c); s.line(18, 3, 21, 0, c); s.line(17, 1, 15, 0, c);
    [[4, 1], [7, -1], [12, 1], [14, -1]].forEach(([x, d]) => s.line(x, 8, x + d, 13, c));
    s.line(3, 7, 1, 5, c);
  }, { noOutline: true }),
  hunters: () => paint(24, 14, (s) => {
    const c = '#5a2010';
    [[3, 0], [11, 1], [19, 0]].forEach(([x, f]) => {
      s.put(x, 1, c); s.put(x + 1, 1, c); s.line(x, 2, x, 7, c); s.line(x, 7, x - 2 + f, 12, c); s.line(x, 7, x + 2 - f, 12, c);
      s.line(x, 4, x + 4, 1, c);
    });
  }, { noOutline: true }),
};

let cache = null;
export function buildDefaultSprites() {
  if (cache) return cache;
  const out = {};
  const add = (key, grids) => { out[key] = toSprite(grids); };
  for (const [k, o] of Object.entries(CHAR_LOOKS)) { seed = 101; add(k, [human(o, 0), human(o, 1)]); }
  for (const k of ['wolf', 'raptor', 'sabertooth', 'mammoth', 'trex', 'hydra', 'chariot', 'golem', 'pebble', 'testudo', 'slime', 'slimelet', 'troll', 'dragon', 'clockwork', 'gearling', 'cog', 'automaton', 'mech', 'steamhound', 'furnace', 'coalcart', 'coal', 'rat', 'locomotive', 'biker', 'tank', 'drone', 'minidrone', 'taxi', 'chopper', 'hoverbot', 'walker', 'ufo', 'nanite', 'overlord']) { seed = 202; add(k, [quad(k, 0), quad(k, 1)]); }
  seed = 303; add('wizard', [wizard()]);
  for (const [k, fn] of Object.entries(ITEMS)) { seed = 404; add(k, [fn()]); }
  for (const [k, fn] of Object.entries(LUSH)) { seed = 707; add(k, [fn()]); }
  for (const [k, fn] of Object.entries(ANIM_ITEMS)) { seed = 505; add(k, [fn(0), fn(1)]); }
  for (const [k, fn] of Object.entries(PAINTINGS)) { seed = 606; add(k, [fn()]); }
  cache = out;
  return out;
}

export const SPRITE_GROUPS = {
  Characters: ['caveman', 'tamer', 'shaman', 'knight', 'centurion', 'inventor', 'engineer', 'pilot', 'nova', 'bard', 'alchemist', 'inspector', 'rocker', 'zorp', 'gladiatorhero', 'wizard'],
  'Stone Age enemies': ['rival', 'wolf', 'raptor', 'sabertooth', 'golem', 'pebble', 'mammoth', 'trex'],
  'Roman enemies': ['legionary', 'spearman', 'gladiator', 'centurion', 'testudo', 'chariot', 'hydra', 'timecop'],
  'Medieval enemies': ['peasant', 'footman', 'jester', 'blackknight', 'slime', 'slimelet', 'troll', 'dragon'],
  'Renaissance enemies': ['apprentice', 'duelist', 'halberdier', 'clockwork', 'gearling', 'cog', 'automaton', 'thief', 'mech'],
  'Industrial enemies': ['sweep', 'navvy', 'luddite', 'steamhound', 'coalcart', 'coal', 'rat', 'furnace', 'locomotive'],
  'Modern enemies': ['punk', 'agent', 'soldier', 'biker', 'drone', 'minidrone', 'taxi', 'tank', 'chopper'],
  'Future enemies': ['android', 'cyborg', 'greyalien', 'hoverbot', 'ufo', 'nanite', 'walker', 'overlord'],
  Weapons: ['club', 'axe', 'spear', 'flame', 'rock', 'bolt', 'boneclub', 'amber', 'spiritflame', 'pilum', 'holyblade', 'tesla', 'steamhammer', 'drone_s', 'plasma', 'plasmabeam', 'dynamite', 'nailgun', 'nail', 'disc', 'lute', 'note', 'flask', 'swordcane', 'gladius', 'guitar', 'raygun', 'raybolt', 'bone', 'meteor', 'gauntlet'],
  Items: ['treasure', 'chest_open', 'scroll', 'trophy', 'combo', 'cogicon', 'heart_half', 'shieldicon', 'potion_purple', 'rabbitfoot', 'firegem', 'mirror', 'gem_s', 'gem_m', 'gem_l', 'coin', 'spark', 'meat', 'magnet', 'chest', 'potion', 'star', 'reroll', 'skull', 'lock', 'crystal', 'feather', 'idol', 'ark', 'monalisa', 'alienegg', 'alien', 'excalibur', 'declaration', 'lightray'],
  Icons: ['heart', 'heart_empty', 'ghostheart', 'sandal', 'totem', 'flint', 'tusk', 'lodestone', 'crit', 'fang', 'wardrum'],
  Scenery: ['boulder', 'fern', 'bones', 'tree', 'tree_autumn', 'tree_alien', 'pine', 'bush', 'menhir', 'campfire', 'handprint', 'deer', 'hunters', 'column', 'broken', 'urn', 'cypress', 'brazier', 'banner', 'haybale', 'shrub', 'torch', 'gravestone', 'easel', 'gearpile', 'statue', 'lantern', 'chimney', 'crate', 'barrel', 'rails', 'hydrant', 'cone', 'trashcan', 'stopsign', 'bench', 'pylon', 'crystalrock', 'pod', 'antenna', 'holosign', 'coalicon', 'missile'],
};

export function getSprite(key, overrides = {}) {
  return overrides[key] || buildDefaultSprites()[key];
}

export function spriteToCanvas(sp, frameIndex = null) {
  const frames = sp.frames;
  const h = frames[0].length;
  const w = Math.max(...frames.map(f => Math.max(...f.map(r => r.length))));
  const n = frameIndex === null ? frames.length : 1;
  const c = document.createElement('canvas');
  c.width = w * n; c.height = h;
  const ctx = c.getContext('2d');
  const list = frameIndex === null ? frames : [frames[frameIndex]];
  list.forEach((rows, fi) => rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const col = sp.pal[CHARS.indexOf(ch)];
    if (!col) return;
    ctx.fillStyle = col; ctx.fillRect(fi * w + x, y, 1, 1);
  })));
  return { canvas: c, w, h, n };
}

export { CHARS };

// ---------------------------------------------------------------------------
// Textures for Phaser
export function generateTextures(scene, overrides = {}) {
  const all = { ...buildDefaultSprites(), ...overrides };
  for (const [key, sp] of Object.entries(all)) {
    if (!sp || !sp.frames || !sp.frames.length) continue;
    const { canvas, w, h, n } = spriteToCanvas(sp);
    if (scene.textures.exists(key)) scene.textures.remove(key);
    const tex = scene.textures.addCanvas(key, canvas);
    for (let i = 0; i < n; i++) tex.add(i, 0, i * w, 0, w, h);
  }
  for (const [k, g] of Object.entries(GROUNDS)) makeLushGround(scene, k, g);
  makeSimple(scene, 'px', 2, 2, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 2, 2); });
  makeSimple(scene, 'shadow', 16, 6, (ctx) => {
    ctx.fillStyle = 'rgba(24,36,80,0.34)';
    ctx.fillRect(3, 0, 10, 6); ctx.fillRect(1, 1, 14, 4); ctx.fillRect(0, 2, 16, 2);
  });
  makeSimple(scene, 'portal', 40, 56, (ctx) => {
    const cols = ['#2a1050', '#5a2e8a', '#8a4ad0', '#b47af0', '#e0c0ff'];
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      const rx = 20 - i * 3.5, ry = 28 - i * 5;
      for (let y = -ry; y <= ry; y++) {
        const ww = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
        ctx.fillRect(20 - ww, 28 + y, ww * 2, 1);
      }
    });
  });
  makeSimple(scene, 'ring', 64, 64, (ctx) => {
    ctx.fillStyle = '#ffffff';
    for (let a = 0; a < 360; a += 2) {
      const r = a * Math.PI / 180;
      ctx.fillRect(Math.round(32 + Math.cos(r) * 30), Math.round(32 + Math.sin(r) * 30), 2, 2);
    }
  });
  // Soft light used to cut holes in the boss-fight darkness
  makeSimple(scene, 'light', 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  });
  makeSimple(scene, 'darkness', 1000, 1700, (ctx) => {
    ctx.fillStyle = '#06040e'; ctx.fillRect(0, 0, 1000, 1700);
    ctx.globalCompositeOperation = 'destination-out';
    const g = ctx.createRadialGradient(500, 850, 0, 500, 850, 200);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(0.45, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 1000, 1700);
  });
  makeSimple(scene, 'glow', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,170,70,0.55)'); g.addColorStop(1, 'rgba(255,120,40,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  });
}

function makeSimple(scene, key, w, h, draw) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  scene.textures.addCanvas(key, c);
}

// ---------------------------------------------------------------------------
// Lush tiled grounds, one per age. Every noise wraps every 192px so the tile repeats seamlessly.
const GT = 192;
function ghash(x, y, sd) {
  let h = (x * 374761393 + y * 668265263 + sd * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return ((h >>> 0) % 100000) / 100000;
}
// Value noise that wraps at the tile edge (sc must divide 192)
function gnoise(x, y, sc, sd) {
  const P = GT / sc, fx = x / sc, fy = y / sc, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
  const m = (v) => ((v % P) + P) % P, sm = (t) => t * t * (3 - 2 * t), L = (a, b, t) => a + (b - a) * t;
  const a = ghash(m(x0), m(y0), sd), b = ghash(m(x0 + 1), m(y0), sd), c = ghash(m(x0), m(y0 + 1), sd), d = ghash(m(x0 + 1), m(y0 + 1), sd);
  return L(L(a, b, sm(tx)), L(c, d, sm(tx)), sm(ty));
}

const GROUNDS = {
  // Stone Age: bright spring meadow with worn dirt clearings
  cave: { grass: ['#c6e25c', '#98cf3e', '#70b834', '#519c2f', '#3b7d2c'], patch: 'dirt', dirt: ['#ffdc84', '#f6c062', '#e4a24a', '#c8803a', '#a0602e'], cover: 0.2, flowers: ['#ff6aa8', '#ffe060', '#b070ff', '#ffffff'] },
  // Roman Empire: sun-baked olive grass and old sandstone road slabs
  mosaic: { grass: ['#dce070', '#b8cc4c', '#94b23e', '#729636', '#56782e'], patch: 'slabs', dirt: ['#fff2d0', '#f0dcb0', '#dcc290', '#bca274', '#94805a'], cover: 0.26, flowers: ['#ff5a4a', '#ffffff', '#ffe060'] },
  // Middle Ages: deep green fields with cobblestone patches and mushrooms
  tapestry: { grass: ['#8cd062', '#62b244', '#46963c', '#317a36', '#225e30'], patch: 'cobble', dirt: ['#d8d8d0', '#b0aeac', '#8a8890', '#6a6874', '#4a4858'], cover: 0.18, flowers: ['#ff4a4a', '#ffffff', '#c080ff'] },
  // Renaissance: Tuscan flower meadow, lavender and poppies
  parchment: { grass: ['#b8e070', '#8ec64c', '#68aa3e', '#4c8c38', '#36702e'], patch: 'dirt', dirt: ['#ffe8b0', '#f4d090', '#e2b470', '#c8945a', '#a07446'], cover: 0.12, flowers: ['#b080ff', '#9a60f0', '#ff4a4a', '#ffd040', '#ffffff'], flowerDensity: 3 },
  // Industrial Age: autumn grass, cinder paths with coal and brick bits
  newsprint: { grass: ['#f0c45c', '#d8a040', '#bc8038', '#9a6232', '#784a2c'], patch: 'cinder', dirt: ['#8a8088', '#6e666e', '#565058', '#423c46', '#2e2a34'], cover: 0.24, flowers: ['#ff7a3a', '#ffe060'] },
  // Modern Age: striped park lawn with concrete paving
  popart: { grass: ['#a8ea64', '#7cd44c', '#5cbc42', '#44a03c', '#328236'], patch: 'pavement', dirt: ['#f0f0ea', '#d8d8d2', '#bcbcb8', '#9a9aa0', '#7a7a84'], cover: 0.26, stripes: true, flowers: ['#ffffff', '#ffe060'] },
  // Far Future: teal alien moss with glowing metal floor panels
  neongrid: { grass: ['#6af0d0', '#3ad0b8', '#22a8a0', '#1a8088', '#145c70'], patch: 'panel', dirt: ['#b8c4e0', '#8e9cc0', '#6a789e', '#4c587c', '#343e5c'], cover: 0.22, flowers: ['#ff70ff', '#70ffff', '#fff070'], glow: '#5af0ff' },
};

function makeLushGround(scene, key, g) {
  makeSimple(scene, `ground_${key}`, GT, GT, (ctx) => drawLushGround(ctx, key, g));
}
export function drawLushGround(ctx, key, g = GROUNDS[key]) {
  {
    const img = ctx.createImageData(GT, GT), D = img.data;
    const sd = key.length * 31 + key.charCodeAt(0);
    const G = g.grass.map(rgbOf), P = g.dirt.map(rgbOf);
    const W8 = (v) => ((v % GT) + GT) % GT;
    const set = (x, y, c) => { const i = (W8(y) * GT + W8(x)) * 4; D[i] = c[0]; D[i + 1] = c[1]; D[i + 2] = c[2]; D[i + 3] = 255; };
    // patches cover a set share of the tile (g.cover), whatever the noise happens to do
    const pv = [];
    for (let y = 0; y < GT; y++) for (let x = 0; x < GT; x++) pv[y * GT + x] = gnoise(x, y, 64, sd) * 0.85 + gnoise(x, y, 12, sd + 1) * 0.15;
    const cut = [...pv].sort((a, b) => b - a)[Math.floor(pv.length * g.cover)];
    const patch = pv.map(v => v > cut);
    const pAt = (x, y) => patch[W8(y) * GT + W8(x)];
    for (let y = 0; y < GT; y++) for (let x = 0; x < GT; x++) {
      if (!pAt(x, y)) {
        const n = gnoise(x, y, 24, sd + 2) * 0.7 + gnoise(x, y, 6, sd + 3) * 0.3;
        let i = n > 0.62 ? 1 : n > 0.42 ? 2 : 3;
        if (g.stripes && Math.floor(y / 24) % 2) i = Math.max(1, i - 1);
        if (ghash(x, y, sd + 4) < 0.12) i += 1;
        set(x, y, G[Math.min(4, i)]);
        continue;
      }
      const n = gnoise(x, y, 12, sd + 5);
      let c = P[n > 0.55 ? 1 : 2];
      if (g.patch === 'dirt' || g.patch === 'cinder') {
        if (ghash(x, y, sd + 6) < 0.07) c = P[3];
      } else if (g.patch === 'cobble') {
        // round-ish stones in a staggered grid with dark gaps
        const cy = Math.floor(y / 6), ox = (cy % 2) * 3, cx = Math.floor((x + ox) / 6);
        const lx = (x + ox) % 6, ly = y % 6;
        const v = ghash(cx % 32, cy % 32, sd + 7);
        c = (lx === 0 || ly === 0 || (lx === 5 && ly === 5)) ? P[4] : (lx + ly < 3 ? P[0] : lx + ly > 7 ? P[2] : P[v > 0.5 ? 1 : 2]);
      } else if (g.patch === 'slabs') {
        const cy = Math.floor(y / 12), ox = (cy % 2) * 8, lx = (x + ox) % 16, ly = y % 12;
        c = (lx === 0 || ly === 0) ? P[3] : (lx === 1 || ly === 1) ? P[0] : P[n > 0.5 ? 1 : 2];
        if (ghash(x, y, sd + 8) < 0.02) c = ['#c0482c', '#2a6ab0', '#e8b030'].map(rgbOf)[Math.floor(ghash(x, y, 9) * 3)]; // mosaic chips
      } else if (g.patch === 'pavement') {
        const lx = x % 16, ly = y % 16;
        c = (lx === 0 || ly === 0) ? P[3] : (lx === 1 || ly === 1) ? P[0] : P[n > 0.5 ? 1 : 2];
      } else if (g.patch === 'panel') {
        const lx = x % 24, ly = y % 24;
        c = (lx === 0 || ly === 0) ? rgbOf(g.glow) : (lx === 1 || ly === 1) ? P[0] : (lx === 23 || ly === 23) ? P[4] : P[n > 0.5 ? 1 : 2];
        if ((lx === 12 && ly > 8 && ly < 16) || (ly === 12 && lx > 8 && lx < 16)) c = P[3];
      }
      set(x, y, c);
    }
    // grass lip over the patches, darker patch rim
    for (let y = 0; y < GT; y++) for (let x = 0; x < GT; x++) {
      const p = pAt(x, y), nb = [pAt(x - 1, y), pAt(x + 1, y), pAt(x, y - 1), pAt(x, y + 1)];
      if (p && nb.includes(false)) { set(x, y, P[4]); if (!pAt(x, y - 1)) set(x, y + 1, P[3]); }
      if (!p && nb.includes(true)) set(x, y, G[1]);
    }
    // leaf tufts, pebbles and flowers
    for (let y = 0; y < GT; y++) for (let x = 0; x < GT; x++) {
      if (pAt(x, y)) {
        if ((g.patch === 'dirt' || g.patch === 'cinder') && ghash(x, y, sd + 10) < 0.01 && pAt(x + 2, y + 2) && pAt(x - 2, y - 2)) {
          const peb = g.patch === 'cinder' && ghash(x, y, 11) < 0.5 ? ['#2a2228', '#141016', '#ff8a30'] : null;
          set(x, y, peb ? rgbOf(peb[0]) : P[4]); set(x + 1, y, peb ? rgbOf(peb[1]) : P[3]); set(x, y - 1, peb ? rgbOf(peb[2]) : P[0]);
        }
        continue;
      }
      if (ghash(x, y, sd + 12) < 0.035 && !pAt(x, y + 2) && !pAt(x, y - 2)) {
        const light = ghash(x, y, sd + 13) < 0.5 ? G[0] : G[1];
        set(x - 1, y - 1, light); set(x + 1, y - 1, light); set(x, y, light); set(x, y + 1, G[4]); set(x - 1, y, G[2]); set(x + 1, y, G[2]);
      } else if (ghash(x, y, sd + 14) < 0.0022 * (g.flowerDensity || 1) && !pAt(x, y + 2) && !pAt(x + 2, y)) {
        const f = rgbOf(g.flowers[Math.floor(ghash(x, y, sd + 15) * g.flowers.length)]);
        const lt = f.map(v => v + (255 - v) * 0.5), dk = f.map(v => v * 0.7);
        set(x, y - 1, lt); set(x - 1, y, dk); set(x + 1, y, f); set(x, y + 1, f); set(x, y, rgbOf('#fff2a0')); set(x, y + 2, G[4]);
      }
    }
    ctx.putImageData(img, 0, 0);
  }
}
