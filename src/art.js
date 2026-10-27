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
  return buf.map((row, y) => row.map((c, x) => c || (((buf[y - 1] && buf[y - 1][x]) || (buf[y + 1] && buf[y + 1][x]) || row[x - 1] || row[x + 1]) ? (opts.outline || OUT) : null)));
}

// Turns colour grids (one per frame) into editable sprite data
function toSprite(grids) {
  const pal = [];
  const frames = grids.map(g => g.map(row => row.map(c => {
    if (!c) return '.';
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
const SKIN = ['#e8a874', '#c47e50', '#935632', '#5e321c'];
const SKIN2 = ['#c88a5c', '#9e6440', '#72422a', '#4a2618'];
const HAIR = ['#7a4a28', '#5a321a', '#3e2010', '#24120a'];
const BLACKH = ['#4a3a3a', '#302424', '#201618', '#140c0e'];
const FUR = ['#ecc88a', '#c89a5a', '#9a6a36', '#6a4220'];
const LEATHER = ['#b0784a', '#8a5a34', '#623e22', '#3e2614'];
const WOOD = ['#a8774a', '#7f5534', '#5a3a24', '#3a2516'];
const GREYW = ['#a8a2a6', '#7c7680', '#565260', '#36323e'];
const DINO = ['#c8843a', '#a0642a', '#76461c', '#4c2c12'];
const SABER = ['#ecb04c', '#c8862c', '#98601a', '#64400e'];
const MAMM = ['#8a5a3a', '#6a4028', '#4a2a1a', '#2e180e'];
const TREXR = ['#9aa45a', '#76823e', '#52602a', '#323e1a'];
const STONE = ['#d8c8aa', '#b0a084', '#86785e', '#5c503c'];
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
const LEAF = ['#8a8a44', '#6a6c30', '#4c4e20', '#303212'];
const DARKLEAF = ['#4a6a3a', '#344e2a', '#22361c', '#142210'];
const GOLD = ['#fff0a0', '#f0c040', '#b88420', '#7a5410'];
const BONE = ['#f6eed4', '#ddd2b4', '#aca084', '#7a705a'];
const MARBLE = ['#fbf8f0', '#e4ded2', '#bab2a4', '#8c8476'];
const DARKSTEEL = ['#6a6a7c', '#4a4a5c', '#32323e', '#1e1e28'];
const SACK = ['#c8a878', '#a8885a', '#806440', '#5a442a'];
const SLIME = ['#a8f08a', '#6ad04a', '#3e9a2e', '#22601a'];
const TROLL = ['#8aa86a', '#6a8a4a', '#4a6632', '#2e4220'];
const DRAGON = ['#f0704a', '#d0482a', '#9a2e1c', '#601a10'];
const WING = ['#c84a5a', '#9a3044', '#6a1e30', '#40101c'];
const GREEN = ['#5aa05a', '#3e7e3e', '#2a5a2a', '#183a18'];
const BRASS = ['#f8d878', '#d8a848', '#a87a2a', '#6a4a14'];
const COPPER = ['#e89a6a', '#c0703e', '#8a4a26', '#5a2c14'];
const SEPIA = ['#f2e2c0', '#dcc6a0', '#b8a07a', '#8a7454'];
const EYE = '#160c08';

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
  const H = 34;
  return paint(24, H, (s) => {
    const oy = 4;
    const lx = f ? 1 : 0;
    const legs = o.legs || o.skin;
    s.rect(7 + lx, 22 + oy, 3, f ? 5 : 6, legs); s.rect(13 - lx, 22 + oy, 3, f ? 6 : 5, legs);
    const boot = o.boots || HAIR;
    s.rect(6 + lx, 26 + oy + (f ? -1 : 0), 4, 2, boot); s.rect(13 - lx, 26 + oy + (f ? 0 : -1), 4, 2, boot);
    if (o.cape) s.ell(8, 18 + oy, 5, 7, o.cape);
    s.ell(11.5, 18 + oy, 6, 6, o.body, o.bodyTex || 0);
    if (o.halves) { for (let y = 12; y < 24; y++) for (let x = 12; x < 18; x++) if ((x - 11.5) ** 2 / 36 + (y - 18) ** 2 / 36 <= 1) s.put(x, y + oy, o.halves[(x + y) % 3 ? 1 : 2]); }
    if (o.tabard) { s.rect(9, 13 + oy, 6, 9, o.tabard); s.put(11, 16 + oy, '#f0d040'); s.put(12, 16 + oy, '#f0d040'); s.put(11, 17 + oy, '#f0d040'); s.put(12, 15 + oy, '#f0d040'); }
    if (o.spots) [[9, 16], [13, 19], [10, 20], [14, 16]].forEach(([x, y]) => s.put(x, y + oy, o.body[3]));
    if (o.belt) s.rect(6, 21 + oy, 12, 1, o.belt);
    if (o.badge) s.put(9, 16 + oy, '#f0d040');
    // arms (back arm, front arm)
    s.rect(4, 14 + oy + (f ? 1 : 0), 3, 7, o.arms || o.skin);
    s.rect(17, 14 + oy + (f ? 0 : 1), 3, 6, o.arms || o.skin);
    // head
    s.ell(11.5, 8 + oy, 5, 5, o.skin);
    if (o.hair) { s.ell(10.5, 5 + oy, 7, 4, o.hair, 0.2); s.ell(5.5, 9 + oy, 2.5, 4, o.hair, 0.2); }
    if (o.beard) s.ell(12.5, 12 + oy, 4, 2.4, o.beard, 0.2);
    if (o.band) s.rect(6, 5 + oy, 12, 1, o.band);
    if (o.goggles) { s.rect(6, 5 + oy, 12, 1, LEATHER); s.ell(11.5, 5 + oy, 1.6, 1.5, o.goggles); s.ell(15, 5 + oy, 1.6, 1.5, o.goggles); s.put(11, 4 + oy, '#c8f0ff'); s.put(15, 4 + oy, '#c8f0ff'); }
    if (o.feathers) { s.line(8, 2 + oy, 6, -3 + oy, '#e8e0d0'); s.line(11, 1 + oy, 11, -4 + oy, '#d84a2a'); s.line(14, 2 + oy, 16, -3 + oy, '#e8e0d0'); }
    if (o.helmet) {
      s.ell(11.5, 6 + oy, 6, 4.5, o.helmet);
      s.rect(5, 7 + oy, 3, 5, o.helmet);
      if (o.plume) { s.ell(11.5, 0 + oy, 6, 2.6, o.plume, 0.1); s.rect(8, 1 + oy, 7, 2, o.plume); }
      if (o.grill) for (let y = 7; y < 12; y += 2) s.rect(12, y + oy, 5, 1, o.helmet);
    }
    if (o.jesterHat) {
      s.ell(7, 3 + oy, 3.5, 3, o.jesterHat[0], 0); s.ell(16, 3 + oy, 3.5, 3, o.jesterHat[1], 0);
      s.rect(6, 4 + oy, 12, 3, o.jesterHat[0]);
      s.put(4, 1 + oy, '#f0d040'); s.put(19, 1 + oy, '#f0d040');
    }
    if (o.hood) { s.ell(11.5, 6 + oy, 6.5, 5, o.hood); s.rect(5, 6 + oy, 3, 7, o.hood); }
    if (o.cap) { s.rect(6, 3 + oy, 12, 3, o.cap); s.rect(12, 6 + oy, 7, 1, ['#1a1a1a', '#1a1a1a', '#101010', '#080808']); s.put(11, 4 + oy, '#f0d040'); }
    if (o.paint) { s.put(10, 9 + oy, '#e8e0d0'); s.put(10, 10 + oy, '#e8e0d0'); s.put(15, 9 + oy, '#e8e0d0'); }
    if (!o.grill) { s.put(14, 8 + oy, EYE); s.put(13, 8 + oy, '#f4ece0'); }
    // held items
    if (o.shield) { s.ell(4, 19 + oy, 4, 6, o.shield); s.put(4, 19 + oy, '#f0c060'); }
    if (o.spear) { s.line(20, 28 + oy, 20, -2 + oy, WOOD[2]); s.line(21, 28 + oy, 21, -2 + oy, WOOD[1]); s.ell(20.5, -2 + oy, 1.6, 2.4, STEEL); }
    if (o.sword) { s.line(19, 20 + oy, 22, 13 + oy, STEEL[1]); s.line(18, 20 + oy, 21, 13 + oy, STEEL[0]); }
    if (o.staff) { s.line(20, 30 + oy, 20, 4 + oy, WOOD[1]); s.ell(20.5, 3 + oy, 2.2, 2.2, o.staff); }
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
  heart: () => paint(13, 12, (s) => { s.ell(3.5, 3.5, 3, 3, RED); s.ell(8.5, 3.5, 3, 3, RED); s.ell(6, 6, 5, 4, RED); s.line(3, 7, 6, 10, RED[1]); s.line(9, 7, 6, 10, RED[2]); s.put(3, 2, '#ffffff'); }),
  heart_empty: () => paint(13, 12, (s) => { const D = ['#5a3a30', '#4a2e26', '#3a221c', '#2a1812']; s.ell(3.5, 3.5, 3, 3, D); s.ell(8.5, 3.5, 3, 3, D); s.ell(6, 6, 5, 4, D); s.line(3, 7, 6, 10, D[1]); s.line(9, 7, 6, 10, D[2]); }),
  sandal: () => paint(14, 12, (s) => { s.ell(7, 8, 6, 2.6, LEATHER); s.line(4, 7, 8, 2, LEATHER[2]); s.line(10, 7, 8, 2, LEATHER[2]); s.put(8, 2, '#f0c060'); }),
  totem: () => paint(12, 18, (s) => { s.rect(2, 2, 8, 15, WOOD, 0.1); s.rect(1, 1, 10, 2, RED); s.put(4, 5, EYE); s.put(7, 5, EYE); s.rect(4, 8, 4, 1, RED[2]); s.put(4, 12, EYE); s.put(7, 12, EYE); s.rect(4, 14, 4, 1, GOLD[1]); }),
  flint: () => paint(12, 14, (s) => { for (let y = 0; y < 10; y++) s.line(6 - y * 0.5, y, 6 + y * 0.3, y, GREYS[y < 4 ? 0 : y < 7 ? 1 : 2]); s.rect(5, 10, 2, 4, LEATHER); }),
  tusk: () => paint(14, 14, (s) => { for (let i = 0; i < 10; i++) s.ell(2 + i, 2 + i * 0.9 + Math.sin(i / 3) * 1.5, 1.8 - i * 0.05 + 0.6, 1.6, BONE); }),
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
  heart_half: () => paint(13, 12, (s) => {
    const D = ['#5a3a30', '#4a2e26', '#3a221c', '#2a1812'];
    s.ell(3.5, 3.5, 3, 3, RED); s.ell(8.5, 3.5, 3, 3, D); s.ell(6, 6, 5, 4, D); s.line(9, 7, 6, 10, D[2]);
    for (let y = 2; y < 11; y++) for (let x = 1; x <= 6; x++) if ((x - 6) ** 2 / 25 + (y - 6) ** 2 / 16 <= 1 || (x - 3.5) ** 2 + (y - 3.5) ** 2 <= 9) s.put(x, y, y < 5 ? RED[0] : RED[1]);
    s.put(3, 2, '#ffffff');
  }),
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
  cypress: () => paint(18, 48, (s) => { s.rect(8, 40, 3, 7, WOOD); s.ell(9, 22, 7, 20, DARKLEAF, 0.3); }),
};

const ANIM_ITEMS = {
  flame: (f) => paint(14, 18, (s) => { s.ell(7, 11, 5, 6, FIRE); s.ell(7 + (f ? 1 : -1), 7, 2.4, 4, FIRE.slice(0, 1).concat(FIRE.slice(0, 3))); s.put(7 + (f ? -2 : 2), 2, FIRE[1]); }),
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
  for (const k of ['wolf', 'raptor', 'sabertooth', 'mammoth', 'trex', 'hydra', 'chariot', 'golem', 'pebble', 'testudo', 'slime', 'slimelet', 'troll', 'dragon', 'clockwork', 'gearling', 'cog', 'automaton', 'mech']) { seed = 202; add(k, [quad(k, 0), quad(k, 1)]); }
  seed = 303; add('wizard', [wizard()]);
  for (const [k, fn] of Object.entries(ITEMS)) { seed = 404; add(k, [fn()]); }
  for (const [k, fn] of Object.entries(ANIM_ITEMS)) { seed = 505; add(k, [fn(0), fn(1)]); }
  for (const [k, fn] of Object.entries(PAINTINGS)) { seed = 606; add(k, [fn()]); }
  cache = out;
  return out;
}

export const SPRITE_GROUPS = {
  Characters: ['caveman', 'tamer', 'shaman', 'knight', 'centurion', 'inventor', 'wizard'],
  'Stone Age enemies': ['rival', 'wolf', 'raptor', 'sabertooth', 'golem', 'pebble', 'mammoth', 'trex'],
  'Roman enemies': ['legionary', 'spearman', 'gladiator', 'centurion', 'testudo', 'chariot', 'hydra', 'timecop'],
  'Medieval enemies': ['peasant', 'footman', 'jester', 'blackknight', 'slime', 'slimelet', 'troll', 'dragon'],
  'Renaissance enemies': ['apprentice', 'duelist', 'halberdier', 'clockwork', 'gearling', 'cog', 'automaton', 'thief', 'mech'],
  Weapons: ['club', 'axe', 'spear', 'flame', 'rock', 'bolt', 'boneclub', 'amber', 'spiritflame', 'pilum', 'holyblade', 'tesla'],
  Items: ['treasure', 'chest_open', 'scroll', 'trophy', 'combo', 'cogicon', 'heart_half', 'shieldicon', 'potion_purple', 'rabbitfoot', 'firegem', 'mirror', 'gem_s', 'gem_m', 'gem_l', 'coin', 'spark', 'meat', 'magnet', 'chest', 'potion', 'star', 'reroll', 'skull', 'lock', 'crystal', 'feather', 'idol', 'ark', 'monalisa', 'alienegg', 'alien', 'excalibur', 'declaration', 'lightray'],
  Icons: ['heart', 'heart_empty', 'sandal', 'totem', 'flint', 'tusk', 'lodestone'],
  Scenery: ['boulder', 'fern', 'bones', 'tree', 'campfire', 'handprint', 'deer', 'hunters', 'column', 'broken', 'urn', 'cypress', 'brazier', 'banner', 'haybale', 'shrub', 'torch', 'gravestone', 'easel', 'gearpile', 'statue', 'lantern'],
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
  makeCaveGround(scene);
  makeMosaicGround(scene);
  makeTapestryGround(scene);
  makeParchmentGround(scene);
  makeSimple(scene, 'px', 2, 2, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 2, 2); });
  makeSimple(scene, 'shadow', 16, 6, (ctx) => {
    ctx.fillStyle = 'rgba(40,16,6,0.32)';
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

// Ochre cave floor: warm specks, cracks and dust
function makeCaveGround(scene) {
  makeSimple(scene, 'ground_cave', 192, 192, (ctx) => {
    let s = 9001;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    ctx.fillStyle = '#c49a64'; ctx.fillRect(0, 0, 192, 192);
    const specks = ['#ba9058', '#cea672', '#b0864e', '#d6b282', '#a87c48'];
    for (let i = 0; i < 9000; i++) {
      ctx.fillStyle = specks[Math.floor(r() * specks.length)];
      ctx.fillRect(Math.floor(r() * 192), Math.floor(r() * 192), 1, 1 + Math.floor(r() * 2));
    }
    ctx.fillStyle = 'rgba(110,64,34,0.35)';
    for (let i = 0; i < 6; i++) {
      let x = 20 + r() * 150, y = 20 + r() * 150;
      for (let j = 0; j < 24; j++) { ctx.fillRect(Math.floor(x), Math.floor(y), 1, 1); x += r() * 2 - 0.6; y += r() * 2 - 0.9; }
    }
    ctx.fillStyle = 'rgba(240,210,160,0.25)';
    for (let i = 0; i < 30; i++) ctx.fillRect(Math.floor(r() * 190), Math.floor(r() * 190), 2, 1);
  });
}

// Roman mosaic floor: small tesserae, a border band and a diamond in each panel
function makeMosaicGround(scene) {
  makeSimple(scene, 'ground_mosaic', 192, 192, (ctx) => {
    let s = 4242;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const T = 3;
    const cream = ['#e8dcbc', '#e0d2b0', '#ecdec0', '#dccca8'];
    const terra = ['#b8582e', '#a84a26', '#c0643a'];
    const blue = ['#3a5a8a', '#2e4a76', '#46689a'];
    const ink = ['#3a2a20', '#2e2018'];
    ctx.fillStyle = '#8a7a64'; ctx.fillRect(0, 0, 192, 192);
    for (let y = 0; y < 192; y += T) for (let x = 0; x < 192; x += T) {
      const px = x % 96, py = y % 96;
      const edge = Math.min(px, py, 95 - px, 95 - py);
      const cx = Math.abs(px - 48), cy = Math.abs(py - 48);
      let set = cream;
      if (edge < 6) set = terra;
      else if (edge < 9) set = ink;
      else if (cx + cy < 18) set = blue;
      else if (cx + cy < 21) set = ink;
      else if ((cx + cy) % 24 < 3 && cx + cy < 40) set = terra;
      ctx.fillStyle = set[Math.floor(r() * set.length)];
      ctx.fillRect(x, y, T - 1, T - 1);
    }
  });
}

// Medieval tapestry: woven wool threads, a gold lattice and little fleur shapes
function makeTapestryGround(scene) {
  makeSimple(scene, 'ground_tapestry', 192, 192, (ctx) => {
    let s = 777;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    const red = ['#7a2e2a', '#722a26', '#80342e', '#6a2622'];
    const green = ['#3e5a34', '#36502e', '#46623a'];
    const gold = ['#c8a050', '#b89040', '#d4ac5c'];
    for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) {
      const px = x % 48, py = y % 48;
      const d1 = Math.abs(((px + py) % 48) - 24), d2 = Math.abs(((px - py + 96) % 48) - 24);
      const cx = Math.abs(px - 24), cy = Math.abs(py - 24);
      let set = red;
      if (Math.min(d1, d2) > 22) set = gold;
      else if (cx + cy < 6 || (cx < 2 && cy < 10) || (cy < 2 && cx < 10)) set = green;
      // Woven look: alternate thread shading
      const c = set[Math.floor(r() * set.length)];
      ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1);
      if ((x + (y >> 1)) % 4 === 0) { ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(x, y, 1, 1); }
      if ((y + (x >> 1)) % 6 === 0) { ctx.fillStyle = 'rgba(255,230,200,0.06)'; ctx.fillRect(x, y, 1, 1); }
    }
  });
}

// Renaissance sketchbook: sepia paper, faint grid and ink sketches of gears and flying machines
function makeParchmentGround(scene) {
  makeSimple(scene, 'ground_parchment', 192, 192, (ctx) => {
    let s = 1452;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    ctx.fillStyle = '#dcc69c'; ctx.fillRect(0, 0, 192, 192);
    const specks = ['#d4bc90', '#e2cea6', '#cfb486', '#e8d6b0'];
    for (let i = 0; i < 7000; i++) {
      ctx.fillStyle = specks[Math.floor(r() * specks.length)];
      ctx.fillRect(Math.floor(r() * 192), Math.floor(r() * 192), 1 + Math.floor(r() * 2), 1);
    }
    ctx.fillStyle = 'rgba(120,90,50,0.12)';
    for (let i = 0; i < 192; i += 24) { ctx.fillRect(i, 0, 1, 192); ctx.fillRect(0, i, 192, 1); }
    // Ink sketches: a gear and a wing
    ctx.fillStyle = 'rgba(80,50,24,0.35)';
    const ring = (cx, cy, rad, teeth) => {
      for (let a = 0; a < Math.PI * 2; a += 0.05) ctx.fillRect(Math.round(cx + Math.cos(a) * rad), Math.round(cy + Math.sin(a) * rad), 1, 1);
      for (let i = 0; i < teeth; i++) {
        const a = (i / teeth) * Math.PI * 2;
        ctx.fillRect(Math.round(cx + Math.cos(a) * (rad + 2)), Math.round(cy + Math.sin(a) * (rad + 2)), 2, 2);
      }
    };
    ring(50, 60, 14, 10); ring(68, 74, 8, 7); ring(150, 140, 11, 9);
    for (let i = 0; i < 6; i++) {
      for (let t = 0; t < 30; t++) ctx.fillRect(Math.round(110 + t * 1.6), Math.round(40 + i * 3 - Math.sin(t / 30 * Math.PI) * 10), 1, 1);
    }
    for (let i = 0; i < 4; i++) { const y = 150 + i * 6; ctx.fillRect(20, y, 30 + Math.floor(r() * 20), 1); }
  });
}
