// Character Maker: one chunky toy-figure body (big head, crouched lunge, weapon gripped
// low in one fist, other hand thrown forward) with swappable hair, face, outfit, boots,
// hat and weapon. Parts are painted smoothly on a canvas, then turned into detailed
// pixel art with the Image → Sprite converter and saved as a game character.
import { convert } from './convert.js';

const W = 360, H = 456;
const TOP = 64, HEAD = 1.2;                      // room above for hair and hats; chibi head scale
const HIP = 270, LEG = 0.72;                     // legs are squashed up toward the hips

// --- shape helpers ------------------------------------------------------------------
// Smooth closed path through points; [x, y, 1] marks a sharp corner
function blob(pts, t = 0.5) {
  const n = pts.length, P = (i) => pts[(i + n) % n];
  let d = `M${P(0)[0]},${P(0)[1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const k1 = p1[2] ? 0 : t / 3, k2 = p2[2] ? 0 : t / 3;
    d += ` C${p1[0] + (p2[0] - p0[0]) * k1},${p1[1] + (p2[1] - p0[1]) * k1} ${p2[0] - (p3[0] - p1[0]) * k2},${p2[1] - (p3[1] - p1[1]) * k2} ${p2[0]},${p2[1]}`;
  }
  return d + ' Z';
}
const boxOf = (pts, pad = 0) => [Math.min(...pts.map(p => p[0])) - pad, Math.min(...pts.map(p => p[1])) - pad, Math.max(...pts.map(p => p[0])) + pad, Math.max(...pts.map(p => p[1])) + pad];
// Tapered limb through joints [[x, y, width], ...] with rounded ends
function limb(j) {
  const L = [], R = [];
  j.forEach((p, i) => {
    const a = j[Math.max(0, i - 1)], b = j[Math.min(j.length - 1, i + 1)];
    const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l, ny = dx / l, r = p[2] / 2;
    L.push([p[0] + nx * r, p[1] + ny * r]); R.push([p[0] - nx * r, p[1] - ny * r]);
  });
  const out = (p, q, r) => { const dx = p[0] - q[0], dy = p[1] - q[1], l = Math.hypot(dx, dy) || 1; return [p[0] + dx / l * r, p[1] + dy / l * r]; };
  const e = j[j.length - 1], s = j[0];
  const pts = [...L, out(e, j[j.length - 2], e[2] * 0.45), ...R.reverse(), out(s, j[1], s[2] * 0.45)];
  return { d: blob(pts), box: boxOf(pts) };
}
const B = (pts) => ({ d: blob(pts), box: boxOf(pts) });
const E = (cx, cy, rx, ry) => ({ d: `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${rx * 2},0 a${rx},${ry} 0 1,0 ${-rx * 2},0 Z`, box: [cx - rx, cy - ry, cx + rx, cy + ry] });

export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k)));
  return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
}

// Paints a part lit from the top left, with a darker edge line so parts read apart
function paint(ctx, s, color, o = {}) {
  const p = new Path2D(s.d);
  const [x0, y0, x1, y1] = s.box, w = x1 - x0, h = y1 - y0, m = Math.max(w, h);
  const g = ctx.createRadialGradient(x0 + w * 0.32, y0 + h * 0.25, m * 0.04, x0 + w * 0.45, y0 + h * 0.45, m * 0.78);
  g.addColorStop(0, shade(color, o.shine ?? 0.3)); g.addColorStop(0.45, color); g.addColorStop(1, shade(color, -0.42));
  ctx.fillStyle = g; ctx.fill(p);
  if (o.line !== false) { ctx.lineWidth = o.lw || 3.4; ctx.lineJoin = 'round'; ctx.strokeStyle = shade(color, -0.62); ctx.stroke(p); }
  return p;
}
// Draws inside a part only (patterns, folds)
function within(ctx, p, fn) { ctx.save(); ctx.clip(p); fn(); ctx.restore(); }
function stroke(ctx, d, color, w = 3) { ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color; ctx.stroke(new Path2D(d)); }
function dot(ctx, x, y, r, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, r, r, 0, 0, Math.PI * 2); ctx.fill(); }
function star(ctx, x, y, r, color) {
  ctx.fillStyle = color; ctx.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.fill();
}

// --- the body layout ------------------------------------------------------------------
const HX = 180, HY = 140;                       // head centre
const FIST = [52, 252];                         // back fist, grips the weapon
const BODY = {
  torso: B([[112, 196], [150, 186], [210, 186], [250, 196], [262, 232], [252, 262], [200, 274], [140, 272], [110, 258], [100, 226]]),
  belt: B([[110, 248], [180, 254], [252, 246], [256, 268, 1], [180, 278], [106, 272, 1]]),
  thighL: limb([[150, 272, 60], [112, 300, 52], [92, 318, 46]]),
  thighR: limb([[212, 272, 60], [250, 290, 52], [266, 302, 46]]),
  hips: B([[110, 266], [180, 272], [252, 264], [262, 292], [214, 300], [180, 290], [146, 302], [104, 296]]),
  armL: limb([[124, 204, 48], [86, 234, 42], [68, 248, 38]]),
  upperL: limb([[124, 204, 48], [98, 226, 44]]),
  armR: limb([[240, 204, 48], [280, 216, 42], [300, 204, 36]]),
  upperR: limb([[240, 204, 48], [268, 214, 44]]),
  bootL: B([[64, 310], [120, 310], [116, 352], [112, 390], [120, 410], [112, 428], [38, 430], [26, 414], [44, 398], [66, 388], [62, 350]]),
  bootR: B([[236, 296], [294, 296], [292, 340], [290, 378], [322, 394], [340, 412], [332, 430], [230, 430], [224, 410], [238, 382], [240, 340]]),
  shinL: limb([[92, 318, 44], [86, 360, 38], [80, 392, 36]]),
  shinR: limb([[264, 304, 44], [264, 350, 38], [262, 388, 36]]),
};

// --- parts ----------------------------------------------------------------------------
const OUTFITS = {
  wanderer: { name: 'Wanderer robe', sleeves: 'long', legs: 'pants', colors: ['#e0d4b8', '#5a3820'] },
  pelt: { name: 'Caveman pelt', sleeves: 'none', legs: 'bare', colors: ['#e9b14e', '#7a3e16'] },
  armor: { name: 'Roman armor', sleeves: 'short', legs: 'bare', colors: ['#c9ccd6', '#b83a2a'] },
  wizard: { name: 'Wizard robe', sleeves: 'long', legs: 'robe', colors: ['#6e48b8', '#f2c440'] },
  knight: { name: 'Knight tabard', sleeves: 'long', legs: 'pants', colors: ['#2e5aa8', '#f2c440'] },
  tunic: { name: 'Hunter tunic', sleeves: 'short', legs: 'pants', colors: ['#5e8a3a', '#8a5a30'] },
};
const HAIRS = { spiky: 'Spiky', wild: 'Wild mane', short: 'Short', long: 'Long', mohawk: 'Mohawk', topknot: 'Topknot', bald: 'Bald' };
const EYES = { big: 'Big & bright', fierce: 'Fierce', calm: 'Calm', old: 'Old & wise' };
const MOUTHS = { smile: 'Smile', grin: 'Grin', shout: 'Battle shout', frown: 'Serious' };
const BEARDS = { none: 'None', stubble: 'Stubble', full: 'Full beard', long: 'Long beard' };
const HATS = { none: 'None', wizard: 'Wizard hat', helmet: 'Roman helmet', headband: 'Headband', hood: 'Hood', horns: 'Horned helmet' };
const BOOTS = { tall: 'Tall boots', fur: 'Fur wraps', sandals: 'Sandals', greaves: 'Armored' };
const WEAPONS = {
  club: { name: 'Club', game: 'club' }, spiked: { name: 'Spiked club', game: 'club' }, axe: { name: 'Stone axe', game: 'axes' },
  spear: { name: 'Spear', game: 'spear' }, sword: { name: 'Sword', game: 'club' }, staff: { name: 'Crystal staff', game: 'fire' },
  blade: { name: 'Energy blade', game: 'bolt' }, hammer: { name: 'Hammer', game: 'rocks' },
};
const SKINS = ['#f6d2b0', '#eab98e', '#d59a68', '#b07448', '#7a4a2c'];

export const DEFAULT_LOOK = {
  skin: '#eab98e', hair: 'spiky', hairColor: '#4a4650', eyes: 'big', eyeColor: '#2f6fd0', mouth: 'smile', beard: 'none',
  outfit: 'wanderer', outfitColor: '#e0d4b8', trimColor: '#5a3820', boots: 'tall', bootColor: '#6e3e22',
  hat: 'none', hatColor: '#6e48b8', weapon: 'blade', weaponColor: '#3aa8ff', blush: true,
};

// Starting points to remix
export const PRESETS = {
  Hero: { ...DEFAULT_LOOK },
  Caveman: { ...DEFAULT_LOOK, hair: 'wild', hairColor: '#2a2026', eyes: 'fierce', eyeColor: '#8a5a2a', mouth: 'grin', outfit: 'pelt', outfitColor: '#e9b14e', trimColor: '#7a3e16', boots: 'fur', bootColor: '#a07850', weapon: 'club', weaponColor: '#8a5a34', skin: '#d59a68' },
  Legionary: { ...DEFAULT_LOOK, hair: 'short', hairColor: '#3a2a20', eyes: 'fierce', eyeColor: '#6a4a2a', mouth: 'frown', outfit: 'armor', outfitColor: '#c9ccd6', trimColor: '#b83a2a', boots: 'sandals', bootColor: '#7a4a28', hat: 'helmet', hatColor: '#c0402c', weapon: 'sword', weaponColor: '#d8dce6' },
  Wizard: { ...DEFAULT_LOOK, hair: 'long', hairColor: '#ece8f2', eyes: 'old', eyeColor: '#2f6fd0', beard: 'long', outfit: 'wizard', outfitColor: '#6e48b8', trimColor: '#f2c440', boots: 'tall', bootColor: '#5a3a22', hat: 'wizard', hatColor: '#6e48b8', weapon: 'staff', weaponColor: '#5ad8ff', skin: '#f6d2b0' },
  Knight: { ...DEFAULT_LOOK, hair: 'short', hairColor: '#c88a3a', eyes: 'calm', eyeColor: '#3a9a4a', mouth: 'smile', outfit: 'knight', outfitColor: '#2e5aa8', trimColor: '#f2c440', boots: 'greaves', weapon: 'sword', weaponColor: '#d8dce6' },
  Viking: { ...DEFAULT_LOOK, hair: 'long', hairColor: '#c8702a', eyes: 'fierce', eyeColor: '#2f8ad0', mouth: 'shout', beard: 'full', outfit: 'tunic', outfitColor: '#7a3a2a', trimColor: '#5a4a3a', boots: 'fur', bootColor: '#8a6a4a', hat: 'horns', weapon: 'axe', weaponColor: '#9aa0ac', skin: '#f6d2b0' },
};

// --- drawing ----------------------------------------------------------------------------
export function drawCharacter(ctx, L) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  ctx.translate(0, TOP);
  // the head is drawn bigger, growing up and out from the chin
  const shortLegs = (fn) => { ctx.save(); ctx.translate(0, HIP); ctx.scale(1, LEG); ctx.translate(0, -HIP); fn(); ctx.restore(); };
  const bigHead = (fn) => { ctx.save(); ctx.translate(HX, HY + 60); ctx.scale(HEAD, HEAD); ctx.translate(-HX, -(HY + 60)); fn(); ctx.restore(); };
  const skin = L.skin, hair = L.hairColor, oc = L.outfitColor, tc = L.trimColor;
  const of = OUTFITS[L.outfit] || OUTFITS.wanderer;

  drawWeapon(ctx, L);
  bigHead(() => {
  if (L.hair === 'long') hairBack(ctx, hair);
  if (L.hat === 'hood') paint(ctx, B([[HX - 84, HY - 10], [HX - 70, HY - 70], [HX, HY - 96], [HX + 70, HY - 70], [HX + 86, HY - 6], [HX + 90, HY + 60], [HX + 50, HY + 82], [HX - 50, HY + 82], [HX - 90, HY + 60]]), L.hatColor);
  });

  // legs: pants, bare skin or robe skirt, then boots
  const legC = of.legs === 'bare' ? skin : of.legs === 'robe' ? oc : L.outfit === 'knight' ? '#7a808c' : tc;
  shortLegs(() => {
    for (const k of ['thighL', 'thighR', 'shinL', 'shinR']) paint(ctx, BODY[k], legC);
    if (of.legs === 'pants') for (const [x, y] of [[124, 290], [236, 286]]) stroke(ctx, `M${x - 10},${y - 8} q8 10 18 6`, shade(legC, -0.5), 2.6);
    drawBoots(ctx, L);
  });

  // torso and outfit
  const torsoC = of.sleeves === 'none' ? skin : oc;
  const torso = paint(ctx, BODY.torso, torsoC);
  if (of.legs === 'robe') {
    shortLegs(() => {
      const skirt = paint(ctx, B([[106, 258], [254, 256], [276, 300], [300, 340, 1], [250, 330], [214, 344], [180, 330], [146, 346], [104, 334], [70, 340, 1], [90, 296]]), oc);
      within(ctx, skirt, () => { for (const [x, y] of [[120, 300], [200, 316], [250, 300], [160, 330]]) star(ctx, x, y, 7, tc); });
    });
  } else shortLegs(() => paint(ctx, BODY.hips, of.legs === 'bare' ? (L.outfit === 'pelt' ? oc : tc) : legC, { line: true }));
  outfitDetails(ctx, L, torso);
  paint(ctx, BODY.belt, L.outfit === 'wizard' || L.outfit === 'knight' ? tc : L.outfit === 'pelt' ? '#6e4a2a' : shade(tc, -0.2));
  if (L.outfit !== 'pelt') paint(ctx, E(186, 262, 9, 8), '#e8c050');

  // back arm and fist on the weapon
  arm(ctx, 'L', of, skin, oc);
  const fist = paint(ctx, B([[24, 240], [40, 226], [66, 228], [80, 244], [78, 270], [60, 282], [34, 278], [22, 262]]), skin);
  within(ctx, fist, () => { for (const y of [244, 256, 268]) stroke(ctx, `M${44},${y} q12 -3 30 2`, shade(skin, -0.5), 2.4); });
  paint(ctx, E(36, 236, 11, 9), skin);                                            // thumb over the top
  if (L.weapon === 'blade' || L.weapon === 'sword') drawGripEnd(ctx, L);

  // front arm and open hand
  arm(ctx, 'R', of, skin, oc);
  openHand(ctx, skin);

  // head
  bigHead(() => {
  paint(ctx, E(HX - 64, HY + 10, 11, 15), skin);
  paint(ctx, E(HX + 64, HY + 10, 11, 15), skin);
  const face = paint(ctx, B([[HX - 62, HY - 30], [HX - 40, HY - 58], [HX, HY - 64], [HX + 40, HY - 58], [HX + 62, HY - 28], [HX + 64, HY + 8], [HX + 52, HY + 40], [HX + 24, HY + 60], [HX, HY + 64], [HX - 24, HY + 60], [HX - 52, HY + 40], [HX - 64, HY + 8]]), skin, { shine: 0.22 });
  drawFace(ctx, L, face);
  drawHair(ctx, L);
  drawHat(ctx, L);
  });
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

function arm(ctx, side, of, skin, oc) {
  const full = BODY['arm' + side], upper = BODY['upper' + side];
  if (of.sleeves === 'long') {
    paint(ctx, full, oc);
    const [x, y] = side === 'L' ? [70, 248] : [298, 206];
    paint(ctx, E(x, y, 14, 20), shade(oc, -0.1));                                  // cuff
  } else {
    paint(ctx, full, skin);
    if (of.sleeves === 'short') paint(ctx, upper, oc);
  }
}

function openHand(ctx, skin) {
  const fingers = [[[322, 176, 13], [326, 150, 12], [328, 136, 11]], [[332, 178, 13], [342, 152, 12], [348, 140, 11]], [[338, 186, 12], [352, 166, 11], [360, 158, 10]], [[340, 196, 12], [354, 186, 11], [358, 180, 10]]];
  for (const f of fingers) paint(ctx, limb(f), skin, { lw: 2.6 });
  paint(ctx, B([[298, 186], [314, 170], [336, 172], [346, 192], [338, 212], [312, 214], [298, 204]]), skin);
  paint(ctx, limb([[304, 198, 14], [292, 184, 13], [286, 172, 12]]), skin, { lw: 2.6 }); // thumb
  stroke(ctx, 'M312 198 q12 8 24 0', shade(skin, -0.45), 2.4);
}

function outfitDetails(ctx, L, torso) {
  const oc = L.outfitColor, tc = L.trimColor;
  within(ctx, torso, () => {
    if (L.outfit === 'wanderer') {
      // crossed robe lapels with an under-tunic V
      paint(ctx, B([[160, 186], [200, 186], [180, 232, 1]]), shade(oc, -0.18));
      stroke(ctx, 'M150 188 L196 250', shade(oc, -0.5), 5); stroke(ctx, 'M210 188 L168 250', shade(oc, -0.5), 4);
      stroke(ctx, 'M130 214 q-6 20 2 40', shade(oc, -0.4), 2.6); stroke(ctx, 'M232 212 q8 20 0 40', shade(oc, -0.4), 2.6);
    } else if (L.outfit === 'pelt') {
      const pelt = paint(ctx, B([[104, 214], [128, 192, 1], [150, 196], [220, 236], [262, 246], [262, 268], [104, 270]]), oc);
      within(ctx, pelt, () => { [[124, 230], [150, 246], [182, 238], [210, 256], [136, 260], [236, 258], [168, 220]].forEach(([x, y], i) => { dot(ctx, x, y, 6 + (i % 2) * 2, tc); dot(ctx, x + 9, y - 4, 2.6, tc); }); });
    } else if (L.outfit === 'armor') {
      for (let y = 196; y < 262; y += 16) stroke(ctx, `M100 ${y} Q180 ${y + 10} 262 ${y}`, shade(oc, -0.45), 3);
      stroke(ctx, 'M180 186 L180 256', shade(oc, -0.4), 2.4);
      paint(ctx, B([[118, 190], [150, 184], [154, 206], [120, 214]]), oc); paint(ctx, B([[210, 184], [244, 190], [244, 212], [208, 206]]), oc);
    } else if (L.outfit === 'wizard') {
      stroke(ctx, 'M180 186 L180 256', tc, 6);
      for (const [x, y, r] of [[140, 214, 7], [220, 226, 6], [130, 246, 5], [236, 200, 5]]) star(ctx, x, y, r, tc);
    } else if (L.outfit === 'knight') {
      ctx.fillStyle = '#9aa0ac'; ctx.fillRect(90, 180, 180, 100);
      for (let y = 186; y < 272; y += 6) for (let x = 92 + (y % 12 ? 0 : 3); x < 270; x += 6) dot(ctx, x, y, 1.6, '#6a707c');
      const tab = paint(ctx, B([[138, 186], [222, 186], [226, 272], [134, 272]]), oc);
      within(ctx, tab, () => { paint(ctx, B([[180, 208], [198, 222], [180, 250], [162, 222]]), tc); });
    } else if (L.outfit === 'tunic') {
      stroke(ctx, 'M160 188 q20 18 40 0', shade(oc, -0.5), 4);
      for (const x of [170, 190]) stroke(ctx, `M${x} 196 l${x === 170 ? 8 : -8} 10`, tc, 3);
      stroke(ctx, 'M118 220 q-4 18 4 34', shade(oc, -0.4), 2.6);
    }
  });
}

function drawBoots(ctx, L) {
  const c = L.bootColor, skin = L.skin;
  for (const side of ['L', 'R']) {
    const s = BODY['boot' + side];
    if (L.boots === 'sandals') {
      paint(ctx, BODY['shin' + side], skin);
      const foot = side === 'L' ? B([[30, 412], [70, 396], [116, 404], [114, 428], [34, 430]]) : B([[230, 404], [282, 392], [334, 410], [330, 430], [232, 430]]);
      paint(ctx, foot, skin);
      const sole = side === 'L' ? B([[26, 424], [116, 424], [116, 432], [26, 432]]) : B([[228, 424], [334, 424], [334, 432], [228, 432]]);
      paint(ctx, sole, c);
      const x0 = side === 'L' ? 70 : 240;
      for (let i = 0; i < 4; i++) stroke(ctx, `M${x0} ${330 + i * 22} l${side === 'L' ? 44 : 50} 8`, c, 5);
      continue;
    }
    const boot = paint(ctx, s, L.boots === 'greaves' ? '#b8bcc8' : c);
    within(ctx, boot, () => {
      if (L.boots === 'fur') for (let i = 0; i < 6; i++) stroke(ctx, side === 'L' ? `M50 ${322 + i * 18} q34 8 70 -2` : `M232 ${308 + i * 20} q34 8 64 -2`, shade(c, -0.45), 3);
      if (L.boots === 'tall') { stroke(ctx, side === 'L' ? 'M70 330 q-4 30 6 56' : 'M276 316 q6 30 0 60', shade(c, 0.35), 4); }
      if (L.boots === 'greaves') { stroke(ctx, side === 'L' ? 'M64 352 L118 352' : 'M238 340 L292 340', '#6a707c', 3); stroke(ctx, side === 'L' ? 'M92 314 L88 392' : 'M266 300 L264 380', '#ffffff', 3); }
    });
    // cuff
    const cuff = side === 'L' ? B([[58, 304], [124, 304], [126, 324], [56, 324]]) : B([[230, 290], [298, 290], [300, 310], [228, 310]]);
    paint(ctx, cuff, L.boots === 'fur' ? '#e6cf9e' : L.boots === 'greaves' ? '#d0d4de' : shade(c, 0.1));
  }
}

function drawFace(ctx, L, face) {
  const ec = L.eyeColor, hc = L.hairColor, skin = L.skin, ink = '#24141a';
  within(ctx, face, () => {
    // soft shadow under the hair line
    ctx.fillStyle = shade(skin, -0.14); ctx.beginPath(); ctx.ellipse(HX, HY - 54, 72, 24, 0, 0, Math.PI * 2); ctx.fill();
    if (L.beard === 'stubble') { ctx.fillStyle = shade(skin, -0.22); ctx.beginPath(); ctx.ellipse(HX, HY + 46, 50, 22, 0, 0, Math.PI * 2); ctx.fill(); }
  });
  const eye = (x, y, side) => {
    const st = L.eyes;
    const w = st === 'old' ? 22 : 30, h = st === 'old' ? 18 : st === 'calm' ? 26 : 34;
    ctx.save();
    ctx.beginPath(); ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fillStyle = '#ffffff'; ctx.fill(); ctx.clip();
    const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2);
    g.addColorStop(0, shade(ec, -0.6)); g.addColorStop(0.55, ec); g.addColorStop(1, shade(ec, 0.45));
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x + side * 2, y + 2, w * 0.36, h * 0.42, 0, 0, Math.PI * 2); ctx.fill();
    dot(ctx, x + side * 2, y + 3, w * 0.16, '#0c0a14');
    dot(ctx, x - w * 0.12, y - h * 0.16, w * 0.14, '#ffffff'); dot(ctx, x + w * 0.16, y + h * 0.2, w * 0.06, '#ffffff');
    // lids: calm and fierce cut the top of the eye
    ctx.fillStyle = skin;
    if (st === 'calm') ctx.fillRect(x - w, y - h / 2 - 2, w * 2, h * 0.3);
    if (st === 'fierce') { ctx.beginPath(); ctx.moveTo(x - w, y - h); ctx.lineTo(x + w, y - h); ctx.lineTo(x - side * w, y - h * 0.18); ctx.lineTo(x + side * w, y - h * 0.62); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    // heavy upper lash line
    ctx.lineWidth = 4.4; ctx.strokeStyle = ink; ctx.lineCap = 'round';
    ctx.beginPath();
    if (st === 'fierce') { ctx.moveTo(x + side * w * 0.55, y - h * 0.5); ctx.lineTo(x - side * w * 0.5, y - h * 0.26); }
    else ctx.ellipse(x, y, w / 2, h / 2, 0, Math.PI * (st === 'calm' ? 1.12 : 1.05), Math.PI * (st === 'calm' ? 1.88 : 1.95));
    ctx.stroke();
  };
  const ey = HY + 12;
  eye(HX - 26, ey, -1); eye(HX + 26, ey, 1);
  // brows
  const bc = shade(hc, -0.25), thick = L.eyes === 'old' ? 9 : 6;
  for (const side of [-1, 1]) {
    const x = HX + side * 26, y = ey - (L.eyes === 'old' ? 18 : 24);
    const tilt = L.eyes === 'fierce' ? 8 : L.eyes === 'old' ? -3 : 2;
    stroke(ctx, `M${x - side * 16} ${y - tilt * 0.3} Q${x} ${y - 6} ${x + side * 16} ${y + tilt}`, bc, thick);
  }
  // nose
  stroke(ctx, `M${HX + 2} ${HY + 32} q4 3 8 0`, shade(skin, -0.38), 2.6);
  if (L.blush) for (const side of [-1, 1]) { ctx.fillStyle = 'rgba(240,120,110,0.35)'; ctx.beginPath(); ctx.ellipse(HX + side * 40, HY + 36, 12, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  // beards sit under the mouth
  if (L.beard === 'full' || L.beard === 'long') {
    const long = L.beard === 'long';
    const pts = long
      ? [[HX - 64, HY + 6], [HX - 50, HY + 52], [HX - 30, HY + 96], [HX, HY + 136, 1], [HX + 30, HY + 96], [HX + 50, HY + 52], [HX + 64, HY + 6], [HX + 40, HY + 40], [HX, HY + 46], [HX - 40, HY + 40]]
      : [[HX - 64, HY + 6], [HX - 56, HY + 46], [HX - 30, HY + 74], [HX, HY + 80], [HX + 30, HY + 74], [HX + 56, HY + 46], [HX + 64, HY + 6], [HX + 40, HY + 40], [HX, HY + 46], [HX - 40, HY + 40]];
    const bd = paint(ctx, B(pts), hc);
    within(ctx, bd, () => { for (let i = -3; i <= 3; i++) stroke(ctx, `M${HX + i * 14} ${HY + 50} q${i * 2} 30 ${i * 4} ${long ? 70 : 26}`, shade(hc, -0.35), 2.4); });
    paint(ctx, B([[HX - 30, HY + 40], [HX - 6, HY + 34], [HX + 6, HY + 34], [HX + 30, HY + 40], [HX + 36, HY + 50, 1], [HX + 8, HY + 46], [HX - 8, HY + 46], [HX - 36, HY + 50, 1]]), hc);
  }
  // mouth
  const mx = HX + 4, my = HY + 48;
  if (L.beard === 'full' || L.beard === 'long') { stroke(ctx, `M${mx - 8} ${my + 4} q8 4 16 0`, '#5a1e1a', 3); return; }
  if (L.mouth === 'smile') stroke(ctx, `M${mx - 10} ${my} q10 8 20 0`, '#6a2a22', 3);
  else if (L.mouth === 'frown') stroke(ctx, `M${mx - 9} ${my + 2} l18 -2`, '#6a2a22', 3);
  else {
    const open = L.mouth === 'shout';
    ctx.fillStyle = '#7a1e18'; ctx.strokeStyle = '#3a1210'; ctx.lineWidth = 2.6;
    ctx.beginPath();
    if (open) ctx.ellipse(mx, my + 4, 10, 12, 0, 0, Math.PI * 2);
    else { ctx.moveTo(mx - 16, my - 2); ctx.quadraticCurveTo(mx, my + 20, mx + 16, my - 2); ctx.closePath(); }
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffffff';
    if (open) ctx.fillRect(mx - 7, my - 6, 14, 5); else { ctx.beginPath(); ctx.moveTo(mx - 13, my); ctx.lineTo(mx + 13, my); ctx.lineTo(mx + 10, my + 5); ctx.lineTo(mx - 10, my + 5); ctx.fill(); }
    if (open) dot(ctx, mx, my + 10, 5, '#d0584a');
  }
}

function hairBack(ctx, c) {
  paint(ctx, B([[HX - 74, HY - 30], [HX - 84, HY + 50], [HX - 76, HY + 110, 1], [HX - 40, HY + 92], [HX + 40, HY + 92], [HX + 76, HY + 110, 1], [HX + 84, HY + 50], [HX + 74, HY - 30]]), c);
}

function strands(ctx, p, c, from, to, n) {
  within(ctx, p, () => {
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1), x0 = from[0] + (to[0] - from[0]) * t;
      stroke(ctx, `M${x0} ${from[1]} q${(t - 0.5) * 30} -40 ${(t - 0.5) * 70 + 20} -${80 + (i % 3) * 14}`, shade(c, -0.4), 2.6);
    }
    ctx.globalAlpha = 0.45; stroke(ctx, `M${HX - 50} ${HY - 52} Q${HX} ${HY - 80} ${HX + 50} ${HY - 54}`, shade(c, 0.55), 8); ctx.globalAlpha = 1;
  });
}

function drawHair(ctx, L) {
  const c = L.hairColor, h = L.hair;
  if (h === 'bald') { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(HX - 18, HY - 44, 18, 8, -0.3, 0, Math.PI * 2); ctx.fill(); return; }
  if (L.hat === 'wizard' || L.hat === 'helmet' || L.hat === 'horns' || L.hat === 'hood') {
    // only a fringe shows under a hat
    if (h !== 'mohawk') paint(ctx, B([[HX - 66, HY - 2], [HX - 62, HY - 40], [HX + 62, HY - 40], [HX + 66, HY - 2], [HX + 44, HY - 22, 1], [HX + 24, HY - 12], [HX + 4, HY - 28, 1], [HX - 16, HY - 12], [HX - 36, HY - 26, 1], [HX - 52, HY - 10]]), c);
    return;
  }
  let p;
  if (h === 'spiky') {
    p = paint(ctx, B([[HX - 70, HY + 22], [HX - 74, HY - 18], [HX - 100, HY - 36, 1], [HX - 68, HY - 50], [HX - 84, HY - 92, 1], [HX - 42, HY - 74], [HX - 38, HY - 122, 1], [HX - 6, HY - 82], [HX + 18, HY - 128, 1], [HX + 30, HY - 84], [HX + 72, HY - 114, 1], [HX + 60, HY - 70], [HX + 104, HY - 80, 1], [HX + 76, HY - 46], [HX + 100, HY - 28, 1], [HX + 70, HY - 12], [HX + 72, HY + 22], [HX + 60, HY - 6], [HX + 50, HY - 20, 1], [HX + 36, HY - 4], [HX + 20, HY - 28, 1], [HX + 4, HY - 6], [HX - 14, HY - 28, 1], [HX - 26, HY - 4], [HX - 44, HY - 24, 1], [HX - 58, HY]]), c);
    strands(ctx, p, c, [HX - 60, HY - 10], [HX + 60, HY - 10], 8);
  } else if (h === 'wild') {
    p = paint(ctx, B([[HX - 66, HY + 50], [HX - 96, HY + 30, 1], [HX - 80, HY - 6], [HX - 108, HY - 30, 1], [HX - 76, HY - 54], [HX - 92, HY - 96, 1], [HX - 44, HY - 82], [HX - 30, HY - 120, 1], [HX, HY - 88], [HX + 30, HY - 120, 1], [HX + 44, HY - 82], [HX + 92, HY - 96, 1], [HX + 76, HY - 54], [HX + 108, HY - 30, 1], [HX + 80, HY - 6], [HX + 96, HY + 30, 1], [HX + 66, HY + 50], [HX + 62, HY - 10], [HX + 40, HY - 20, 1], [HX + 20, HY - 6], [HX, HY - 26, 1], [HX - 20, HY - 6], [HX - 40, HY - 22, 1], [HX - 62, HY - 10]]), c);
    strands(ctx, p, c, [HX - 70, HY], [HX + 70, HY], 9);
  } else if (h === 'short' || h === 'long' || h === 'topknot') {
    if (h === 'topknot') { paint(ctx, E(HX - 6, HY - 78, 24, 20), c); paint(ctx, B([[HX - 22, HY - 62], [HX + 12, HY - 62], [HX + 12, HY - 54], [HX - 22, HY - 54]]), '#c0402c'); }
    p = paint(ctx, B([[HX - 68, HY + (h === 'long' ? 40 : 6)], [HX - 72, HY - 34], [HX - 40, HY - 68], [HX, HY - 76], [HX + 40, HY - 68], [HX + 72, HY - 34], [HX + 68, HY + (h === 'long' ? 40 : 6)], [HX + 58, HY - 14], [HX + 30, HY - 26, 1], [HX + 10, HY - 12], [HX - 10, HY - 30, 1], [HX - 30, HY - 14], [HX - 58, HY - 16]]), c);
    strands(ctx, p, c, [HX - 50, HY - 10], [HX + 50, HY - 10], 6);
  } else if (h === 'mohawk') {
    ctx.fillStyle = shade(L.skin, -0.25); ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.ellipse(HX, HY - 34, 64, 32, 0, Math.PI, 0); ctx.fill(); ctx.globalAlpha = 1;
    p = paint(ctx, B([[HX - 16, HY - 40], [HX - 30, HY - 92, 1], [HX - 6, HY - 84], [HX + 4, HY - 132, 1], [HX + 20, HY - 88], [HX + 46, HY - 116, 1], [HX + 40, HY - 74], [HX + 64, HY - 74, 1], [HX + 30, HY - 40]]), c);
    strands(ctx, p, c, [HX - 10, HY - 40], [HX + 30, HY - 40], 4);
  }
}

function drawHat(ctx, L) {
  const c = L.hatColor;
  if (L.hat === 'wizard') {
    const cone = paint(ctx, B([[HX - 64, HY - 34], [HX - 30, HY - 80], [HX - 14, HY - 118], [HX - 30, HY - 136], [HX - 66, HY - 140, 1], [HX - 20, HY - 152], [HX + 16, HY - 126], [HX + 40, HY - 80], [HX + 66, HY - 34]]), c);
    within(ctx, cone, () => { star(ctx, HX - 4, HY - 96, 9, '#f2c440'); star(ctx, HX - 22, HY - 128, 6, '#f2c440'); star(ctx, HX + 22, HY - 60, 6, '#f2c440'); });
    paint(ctx, B([[HX - 96, HY - 32], [HX - 50, HY - 46], [HX + 50, HY - 46], [HX + 100, HY - 30], [HX + 60, HY - 20], [HX - 60, HY - 20]]), c);
    paint(ctx, B([[HX - 60, HY - 50], [HX + 62, HY - 50], [HX + 58, HY - 38], [HX - 58, HY - 38]]), '#f2c440');
  } else if (L.hat === 'helmet' || L.hat === 'horns') {
    const metal = L.hat === 'helmet' ? '#c8ccd6' : '#a8a0a0';
    if (L.hat === 'helmet') paint(ctx, B([[HX - 20, HY - 70], [HX - 30, HY - 120], [HX + 20, HY - 132], [HX + 70, HY - 112], [HX + 30, HY - 70]]), c);   // crest
    else for (const s of [-1, 1]) paint(ctx, B([[HX + s * 50, HY - 50], [HX + s * 90, HY - 70], [HX + s * 106, HY - 120, 1], [HX + s * 80, HY - 88], [HX + s * 56, HY - 70]]), '#f0e6d0');
    paint(ctx, B([[HX - 72, HY - 6], [HX - 72, HY - 50], [HX - 40, HY - 80], [HX, HY - 86], [HX + 40, HY - 80], [HX + 72, HY - 50], [HX + 72, HY - 6], [HX + 56, HY - 26], [HX - 56, HY - 26]]), metal);
    paint(ctx, B([[HX - 74, HY - 30], [HX + 74, HY - 30], [HX + 74, HY - 18], [HX - 74, HY - 18]]), shade(metal, -0.15));
    if (L.hat === 'helmet') for (const s of [-1, 1]) paint(ctx, B([[HX + s * 74, HY - 20], [HX + s * 58, HY - 20], [HX + s * 56, HY + 30], [HX + s * 70, HY + 26]]), metal);
  } else if (L.hat === 'headband') {
    paint(ctx, B([[HX - 70, HY - 36], [HX + 70, HY - 36], [HX + 70, HY - 22], [HX - 70, HY - 22]]), c);
    paint(ctx, limb([[HX - 70, HY - 30, 10], [HX - 96, HY - 10, 8], [HX - 110, HY + 16, 6]]), c);
    paint(ctx, limb([[HX - 70, HY - 28, 9], [HX - 88, HY + 4, 7], [HX - 92, HY + 30, 5]]), c);
  } else if (L.hat === 'hood') {
    paint(ctx, B([[HX - 80, HY + 10], [HX - 76, HY - 46], [HX - 40, HY - 84], [HX, HY - 92], [HX + 40, HY - 84], [HX + 76, HY - 46], [HX + 80, HY + 10], [HX + 64, HY - 30], [HX, HY - 52], [HX - 64, HY - 30]]), c);
  }
}

function drawGripEnd(ctx, L) {
  // pommel under the fist so the grip reads
  paint(ctx, E(54, 292, 9, 7), L.weapon === 'blade' ? '#9aa0ac' : '#c8a040');
}

function drawWeapon(ctx, L) {
  const c = L.weaponColor, w = L.weapon;
  ctx.save();
  ctx.translate(FIST[0], FIST[1]); ctx.rotate(-0.08);
  const R = (pts) => B(pts);
  const handle = (y0, y1, col = '#8a5a34', wd = 12) => paint(ctx, R([[-wd / 2, y0], [wd / 2, y0], [wd / 2, y1], [-wd / 2, y1]]), col, { lw: 2.6 });
  if (w === 'club' || w === 'spiked') {
    handle(40, -110, c);
    const head = paint(ctx, R([[-14, -100], [-26, -140], [-28, -186], [-10, -214], [16, -214], [32, -186], [30, -140], [16, -100]]), c);
    within(ctx, head, () => { stroke(ctx, 'M-8 -150 q6 -8 12 0', shade(c, -0.5), 3); dot(ctx, 10, -180, 5, shade(c, -0.45)); });
    if (w === 'spiked') for (const [x, y, a] of [[-28, -150, -1], [30, -160, 1], [-24, -190, -1], [28, -196, 1], [2, -216, 0]]) paint(ctx, R([[x, y - 7], [x + a * 16 + (a ? 0 : -6), y - (a ? 0 : 18)], [x + (a ? 0 : 6), y + (a ? 7 : 0)]]), '#c8c4bc', { lw: 2 });
  } else if (w === 'axe') {
    handle(40, -170, '#8a5a34');
    paint(ctx, R([[-6, -170], [-54, -186], [-66, -150, 1], [-50, -124], [-6, -136]]), c);
    paint(ctx, R([[-10, -160], [8, -160], [8, -140], [-10, -140]]), '#6e4a2a');
  } else if (w === 'spear') {
    handle(50, -200, '#8a5a34', 10);
    paint(ctx, R([[0, -250, 1], [14, -214], [8, -196], [-8, -196], [-14, -214]]), c);
    paint(ctx, R([[-8, -200], [8, -200], [8, -188], [-8, -188]]), '#c0402c');
  } else if (w === 'sword') {
    paint(ctx, R([[-9, -30], [9, -30], [9, -200], [0, -222, 1], [-9, -200]]), c);
    within(ctx, new Path2D(blob([[-9, -30], [9, -30], [9, -200], [0, -222, 1], [-9, -200]])), () => stroke(ctx, 'M-2 -40 L-2 -200', '#ffffff', 3));
    paint(ctx, R([[-30, -32], [30, -32], [30, -22], [-30, -22]]), '#c8a040');
    handle(-22, 34, '#5a3a24', 11);
  } else if (w === 'staff') {
    handle(140, -170, '#8a5a34', 11);
    paint(ctx, limb([[0, -168, 8], [-14, -186, 6], [-16, -198, 5]]), '#8a5a34', { lw: 2 });
    paint(ctx, limb([[0, -168, 8], [14, -186, 6], [16, -198, 5]]), '#8a5a34', { lw: 2 });
    const g = ctx.createRadialGradient(0, -200, 2, 0, -200, 40); g.addColorStop(0, shade(c, 0.6)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.globalAlpha = 0.6; ctx.fillRect(-40, -240, 80, 80); ctx.globalAlpha = 1;
    paint(ctx, R([[0, -228, 1], [14, -204], [0, -182, 1], [-14, -204]]), c, { shine: 0.6 });
  } else if (w === 'blade') {
    const g = ctx.createLinearGradient(-20, 0, 20, 0);
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(0.3, c); g.addColorStop(0.5, '#ffffff'); g.addColorStop(0.7, c); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(-16, -232, 32, 216, 16); ctx.fill();
    paint(ctx, R([[-7, -226], [7, -226], [7, -20], [-7, -20]]), shade(c, 0.55), { line: false, shine: 0.7 });
    paint(ctx, R([[-9, -24], [9, -24], [9, 40], [-9, 40]]), '#a8aeb8', { lw: 2.4 });
    for (const y of [-6, 10, 26]) stroke(ctx, `M-9 ${y} L9 ${y}`, '#4a505a', 2.4);
  } else if (w === 'hammer') {
    handle(40, -150, '#8a5a34');
    paint(ctx, R([[-40, -150], [40, -150], [44, -196], [-44, -196]]), c);
    paint(ctx, R([[-40, -156], [40, -156], [40, -150], [-40, -150]]), '#6e4a2a', { line: false });
  }
  ctx.restore();
}

// --- pixel conversion -------------------------------------------------------------------
export function makeSprite(look, size = 128, colors = 24) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  drawCharacter(c.getContext('2d'), look);
  return convert(c, { size, method: 'smooth', bg: 'none', tol: 0, colors, palette: 'own', bright: 0, contrast: 8, sat: 8, warm: 0, clean: true, main: false, outline: true, flip: false, frames: 'bob' }, []);
}

// --- editor tab -------------------------------------------------------------------------
const S = { look: { ...DEFAULT_LOOK }, size: 128, colors: 24, name: 'HERO', charKey: '' };

export function renderMaker(main, { cfg, changed, h, uniqueKey }) {
  const box = h('div', { class: 'form maker', style: 'grid-column: 1 / -1' });
  main.append(box);
  const L = S.look;
  const set = (k, v) => { L[k] = v; update(); };
  const pick = (k, label, opts) => h('div', { class: 'field' }, h('label', {}, label),
    h('div', { class: 'row' }, Object.entries(opts).map(([v, t]) => h('button', { class: 'btn small' + (L[k] === v ? ' on' : ''), onclick: (e) => {
      L[k] = v; e.target.parentNode.querySelectorAll('.btn').forEach(b => b.classList.remove('on')); e.target.classList.add('on'); update();
    } }, typeof t === 'string' ? t : t.name))));
  const col = (k, label) => h('label', { class: 'swatchPick' }, h('input', { type: 'color', value: L[k], oninput: (e) => set(k, e.target.value) }), label);

  const smooth = h('canvas', { width: W, height: H, class: 'pv smooth' });
  const pix = h('canvas', { class: 'pv' });
  const game = h('canvas', { class: 'pv' });
  const info = h('div', { class: 'note' });

  // existing characters made here can be reopened
  const made = cfg.characters.filter(c => c.look);
  const loadSel = h('select', { onchange: (e) => {
    const ch = cfg.characters.find(c => c.key === e.target.value); if (!ch) return;
    Object.assign(S, { look: { ...DEFAULT_LOOK, ...ch.look }, name: ch.name, charKey: ch.key }); redraw();
  } }, h('option', { value: '' }, made.length ? 'Open a character you made...' : 'No characters made here yet'), made.map(c => h('option', { value: c.key, selected: S.charKey === c.key }, c.name)));

  const nameIn = h('input', { type: 'text', value: S.name, oninput: (e) => { S.name = e.target.value.toUpperCase(); } });
  const startWeapon = h('select', {}, Object.entries(cfg.weapons).map(([k, w]) => h('option', { value: k, selected: k === (WEAPONS[L.weapon] || {}).game }, w.name)));

  const save = (asNew) => {
    const sp = S.result; if (!sp) return;
    let ch = !asNew && cfg.characters.find(c => c.key === S.charKey);
    if (!ch) {
      const key = uniqueKey(S.name || 'hero', cfg.characters.map(c => c.key));
      ch = { key, name: (S.name || 'HERO').toUpperCase(), title: 'The Hero', weapon: 'club', hearts: 5, speed: 1, unlock: 'start' };
      cfg.characters.push(ch);
    }
    const spriteKey = ch.sprite && cfg.sprites[ch.sprite] && ch.look ? ch.sprite : uniqueKey('char_' + ch.key, Object.keys(cfg.sprites));
    cfg.sprites[spriteKey] = JSON.parse(JSON.stringify(sp));
    Object.assign(ch, { name: (S.name || ch.name).toUpperCase(), sprite: spriteKey, look: { ...L }, weapon: startWeapon.value, scale: +(60 / sp.frames[0].length).toFixed(2) });
    S.charKey = ch.key;
    changed(true);
  };

  box.append(
    h('div', { class: 'row', style: 'justify-content:space-between' },
      h('div', {}, h('h2', {}, 'Character Maker'), h('div', { class: 'sub' }, 'Mix and match hair, face, clothes and weapon on the toy-figure body. It becomes detailed pixel art for the game.')),
      h('div', { class: 'row' }, Object.keys(PRESETS).map(k => h('button', { class: 'btn small', onclick: () => { Object.assign(S, { look: { ...PRESETS[k] }, name: k.toUpperCase(), charKey: '' }); redraw(); } }, k)), loadSel, h('button', { class: 'btn small', onclick: () => { Object.assign(S, { look: randomLook(), charKey: '' }); redraw(); } }, '🎲 Random'))),
    h('div', { class: 'makerGrid' },
      h('div', { class: 'controls' },
        h('h3', {}, 'HAIR'), pick('hair', 'Style', HAIRS), h('div', { class: 'row' }, col('hairColor', 'Hair color')),
        h('h3', {}, 'FACE'), pick('eyes', 'Eyes', EYES), pick('mouth', 'Mouth', MOUTHS), pick('beard', 'Beard', BEARDS),
        h('div', { class: 'row' }, col('eyeColor', 'Eye color'), col('skin', 'Skin'),
          SKINS.map(s => h('button', { class: 'swatch', style: `background:${s}`, title: s, onclick: () => set('skin', s) })),
          h('label', { class: 'swatchPick' }, h('input', { type: 'checkbox', checked: L.blush, onchange: (e) => set('blush', e.target.checked) }), 'Blush')),
        h('h3', {}, 'CLOTHES'), pick('outfit', 'Outfit', OUTFITS), h('div', { class: 'row' }, col('outfitColor', 'Main color'), col('trimColor', 'Trim / pants')),
        pick('boots', 'Boots', BOOTS), h('div', { class: 'row' }, col('bootColor', 'Boot color')),
        pick('hat', 'Hat', HATS), h('div', { class: 'row' }, col('hatColor', 'Hat color')),
        h('h3', {}, 'WEAPON'), pick('weapon', 'Weapon', WEAPONS), h('div', { class: 'row' }, col('weaponColor', 'Weapon color')),
      ),
      h('div', {},
        h('h3', { style: 'margin-top:0' }, 'PIXEL ART'),
        h('div', { class: 'row', style: 'align-items:flex-end' }, pix, smooth),
        info,
        h('div', { class: 'grid', style: 'margin-top:8px' },
          h('div', { class: 'field' }, h('label', {}, 'Detail (pixels tall)'), h('div', { class: 'row' }, [96, 128, 160].map(v => h('button', { class: 'btn small' + (S.size === v ? ' on' : ''), onclick: (e) => { S.size = v; e.target.parentNode.querySelectorAll('.btn').forEach(b => b.classList.remove('on')); e.target.classList.add('on'); update(); } }, String(v))))),
          h('div', { class: 'field' }, h('label', {}, 'Colors'), h('input', { type: 'range', min: 12, max: 40, value: S.colors, oninput: (e) => { S.colors = +e.target.value; update(); } }))),
        h('h3', {}, 'IN THE GAME'), game,
        h('div', { class: 'request', style: 'margin-top:12px' },
          h('div', { class: 'grid' }, h('div', { class: 'field' }, h('label', {}, 'Name'), nameIn), h('div', { class: 'field' }, h('label', {}, 'Starting weapon (how it attacks)'), startWeapon)),
          h('div', { class: 'row', style: 'margin-top:10px' },
            S.charKey ? h('button', { class: 'btn primary', onclick: () => save(false) }, '💾 Update ' + (cfg.characters.find(c => c.key === S.charKey) || {}).name) : null,
            h('button', { class: S.charKey ? 'btn' : 'btn primary', onclick: () => save(true) }, '+ Save as new character')),
          h('div', { class: 'note', style: 'margin-top:6px' }, 'It shows up on the character select screen. Change hearts, speed and unlocks in the Characters tab.')),
      ),
    ),
  );

  let raf = 0;
  function update() { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); }
  function redraw() { box.remove(); renderMaker(main, { cfg, changed, h, uniqueKey }); }
  function draw() {
    drawCharacter(smooth.getContext('2d'), L);
    const sp = S.result = makeSprite(L, S.size, S.colors);
    const w = sp.frames[0][0].length, hh = sp.frames[0].length;
    info.textContent = `${w}×${hh} pixels, ${sp.pal.length} colors, 2 walk frames`;
    paintSprite(pix, sp, 0, Math.max(2, Math.floor(400 / hh)));
    animateGame(game, sp);
  }
  draw();
}

function paintSprite(c, sp, fi, z, bg = '#e8d2a8') {
  const CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&*+-/:;<=>?@^_~';
  const rows = sp.frames[fi], w = rows[0].length, h = rows.length;
  c.width = w * z; c.height = h * z;
  const ctx = c.getContext('2d');
  if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); } else ctx.clearRect(0, 0, c.width, c.height);
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') { ctx.fillStyle = sp.pal[CH.indexOf(ch)]; ctx.fillRect(x * z, y * z, z, z); } }));
}

// The sprite walking on cave ground at about its in-game size
function animateGame(c, sp) {
  c.width = 320; c.height = 150;
  const ctx = c.getContext('2d'); ctx.imageSmoothingEnabled = false;
  const tmp = document.createElement('canvas');
  const h = sp.frames[0].length, scale = 60 / h * 2;   // 60 px tall in game, shown 2x
  let f = 0;
  clearInterval(c._t);
  const tick = () => {
    if (!c.isConnected && f > 0) { clearInterval(c._t); return; }
    ctx.fillStyle = '#c49a64'; ctx.fillRect(0, 0, c.width, c.height);
    ctx.fillStyle = 'rgba(40,16,6,0.25)'; ctx.beginPath(); ctx.ellipse(160, 138, 36, 7, 0, 0, Math.PI * 2); ctx.fill();
    paintSprite(tmp, sp, f % 2, 1, null);
    ctx.drawImage(tmp, 160 - tmp.width * scale / 2, 140 - tmp.height * scale, tmp.width * scale, tmp.height * scale);
    f++;
  };
  tick(); c._t = setInterval(tick, 220);
}

function randomLook() {
  const r = (o) => { const k = Object.keys(o); return k[Math.floor(Math.random() * k.length)]; };
  const rc = (list) => list[Math.floor(Math.random() * list.length)];
  const outfit = r(OUTFITS);
  return {
    ...DEFAULT_LOOK, hair: r(HAIRS), hairColor: rc(['#4a4650', '#2a2026', '#7a4a28', '#c88a3a', '#e8e4ea', '#b83a2a', '#3a5ab8']),
    eyes: r(EYES), eyeColor: rc(['#2f6fd0', '#3a9a4a', '#8a5a2a', '#9a3ad0', '#d03a3a']), mouth: r(MOUTHS), beard: rc(['none', 'none', 'stubble', 'full', 'long']),
    skin: rc(SKINS), outfit, outfitColor: OUTFITS[outfit].colors[0], trimColor: OUTFITS[outfit].colors[1], boots: r(BOOTS),
    hat: rc(['none', 'none', 'none', 'wizard', 'helmet', 'headband', 'hood', 'horns']), weapon: r(WEAPONS),
    weaponColor: rc(['#3aa8ff', '#ff4a4a', '#5ae05a', '#c8ccd6', '#8a5a34', '#b0a4ff']),
  };
}
