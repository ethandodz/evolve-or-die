// Shopkeeper wizard in the toy-figure lunge: big fist gripping a crystal staff, open
// palm casting, wide crouch with heavy boots. Layout follows the converted toy photo
// (86x97) with a longer torso and shorter arms and legs, redrawn with the chibi
// painter's cel shading so it reads cleanly. Same { pal, frames } data as art.js.
import { canvas, eye, R } from './chibi.js';

const W = 84, H = 96;
const ROBE = ['#a882dc', '#7c56b4', '#58388a', '#2a1648'];
const HAT = ['#9a74d2', '#6e4aa6', '#4c2e7c', '#24123e'];
const BEARD = ['#ffffff', '#e8e6f0', '#c4c0d2', '#6e6a80'];
const SKIN = R.skinLight;
const BOOT = ['#9a6e4a', '#74502f', '#523620', '#2a180c'];
const GOLD = ['#fff0a0', '#f0c840', '#c08a20', '#5e400c'];
const CRYSTAL = ['#e8fcff', '#7ae0ff', '#3aa0e0', '#163e7a'];
const EYES = ['#a8e8ff', '#3a9ad8', '#1a5a9a', '#0c2a4a'];

// Proportions: torso rows stretch, legs and arms shrink toward their joints
const TORSO = 1.3, LIMB = 0.8, ARM = 0.82;
const ty = (y) => (y <= 38 ? y : 38 + (y - 38) * TORSO);
const HIP = ty(60);

// Wraps the painter so parts are drawn in the photo's coordinates and moved into place
function part(s, map, k, b) {
  const P = ([x, y]) => { const [a, c] = map(x, y); return [a, c + b]; };
  return {
    ell: (cx, cy, rx, ry, r, o) => { const [x, y] = P([cx, cy]); return s.ell(x, y, rx * k[0], ry * k[1], r, o); },
    poly: (pts, r, o) => s.poly(pts.map(P), r, o),
    bar: (x0, y0, x1, y1, t, r, o) => { const [a, c] = P([x0, y0]), [d, e] = P([x1, y1]); return s.bar(a, c, d, e, t * Math.min(...k), r, o); },
    dot: (x, y, c) => { const [a, d] = P([x, y]); s.dot(Math.round(a), Math.round(d), c); },
    at: P,
  };
}

export function toyWizard(f = 0) {
  const s = canvas(W, H);
  const b = f ? 1 : 0;
  const body = part(s, (x, y) => [x, ty(y)], [1, TORSO], b);
  const head = part(s, (x, y) => [x, y], [1, 1], b);
  const legs = (bb) => part(s, (x, y) => [44 + (x - 44) * LIMB, HIP + (y - 60) * LIMB], [LIMB, LIMB], bb);
  const thigh = legs(b), foot = legs(0);
  const lArm = part(s, (x, y) => [30 + (x - 30) * ARM, ty(42) + (y - 42) * ARM], [ARM, ARM], b);
  const rArm = part(s, (x, y) => [54 + (x - 54) * ARM, ty(42) + (y - 42) * ARM - (f ? 0.6 : 0)], [ARM, ARM], b);
  const stars = (id) => s.pattern(id, (x, y) => (x * 5 + y * 11) % 37 === 0 && s.has(id, x, y - 1) && s.has(id, x, y + 1) && s.has(id, x - 1, y), GOLD[0]);

  // --- staff, behind the fist ----------------------------------------------------
  lArm.bar(5, 2, 15, 68, 4.4, R.wood);
  lArm.bar(5, 2, 2, -3, 2.2, R.wood);
  lArm.bar(5, 2, 9, -3, 2.2, R.wood);
  lArm.ell(5, -4.5, 6, 6, CRYSTAL);
  [[3, -7.5], [4, -7.5], [3, -6.3]].forEach(([x, y]) => lArm.dot(x, y, '#ffffff'));

  // --- legs: back leg out to the left, front leg bent to the right ---------------
  foot.bar(26, 72, 24, 86, 12, ROBE);
  foot.bar(56, 68, 52, 82, 12, ROBE);
  thigh.bar(37, 61, 26, 72, 13, ROBE);
  thigh.bar(47, 61, 56, 68, 13, ROBE);
  const bootL = foot.poly([[18, 82], [31, 82], [34, 90], [33, 96], [12, 96], [10, 92], [16, 88]], BOOT);
  const bootR = foot.poly([[46, 80], [58, 80], [60, 84], [74, 85], [79, 89], [77, 92], [46, 92]], BOOT);
  foot.bar(17, 82, 32, 82, 3, BOOT);          // boot cuffs
  foot.bar(45, 80, 59, 80, 3, BOOT);
  for (const id of [bootL, bootR]) s.pattern(id, (x, y) => (x - y) % 5 === 0 && s.has(id, x, y - 1) && s.has(id, x, y + 1), BOOT[2]);

  // --- robe body, skirt and belt ---------------------------------------------------
  const skirt = s.poly([...[[27, 56], [53, 56]].map(([x, y]) => body.at([x, y])),
    ...[[64, 68], [58, 72], [50, 69], [43, 73], [36, 69], [28, 73], [20, 70]].map(([x, y]) => thigh.at([x, y]))], ROBE);
  stars(skirt);
  const torso = body.poly([[28, 37], [56, 37], [59, 47], [54, 58], [29, 58], [25, 47]], ROBE);
  stars(torso);
  body.bar(44, 38, 44, 57, 1.6, GOLD, { noLine: true });   // front trim
  const belt = body.poly([[28, 53.5], [54, 53.5], [54, 58], [28, 58]], GOLD);
  s.pattern(belt, (x, y) => !s.has(belt, x, y + 1), GOLD[2]);
  body.ell(49, 56, 2, 2, GOLD);
  body.bar(49, 57, 47, 62, 1.4, GOLD, { noLine: true });
  body.bar(50, 57, 52, 62, 1.4, GOLD, { noLine: true });

  // --- left arm and fist gripping the staff -----------------------------------------
  lArm.ell(31, 43, 7, 7, ROBE);
  stars(lArm.bar(31, 43, 19, 51, 13, ROBE));
  lArm.ell(19, 51, 3.4, 7, GOLD);                          // cuff
  lArm.ell(11, 51, 9.5, 10, SKIN);
  lArm.bar(5, 2, 15, 68, 4.4, R.wood);                    // staff over the fingers...
  lArm.poly([[3, 45], [19, 45], [19, 58], [4, 58]], SKIN);  // ...and fingers wrapped round it
  for (const yy of [48.5, 52, 55.5]) lArm.bar(5, yy, 17, yy, 0.9, SKIN.map(() => SKIN[3]), { noLine: true });
  lArm.ell(6, 43.5, 4, 3, SKIN);                           // thumb over the top

  // --- right arm reaching out with an open palm ---------------------------------------
  rArm.ell(54, 42, 7, 7.5, ROBE);
  stars(rArm.bar(54, 43, 64, 44, 13, ROBE));
  rArm.ell(64, 44, 3.4, 7, GOLD);
  rArm.ell(70, 41, 6.5, 8, SKIN);
  [[66, 35, 66, 26], [69.5, 34, 71, 25], [73, 35, 76, 27], [75, 38, 80, 32]].forEach(([a, c, d, e]) => rArm.bar(a, c, d, e, 3.4, SKIN, { noLine: true }));
  rArm.bar(66, 45, 61, 39, 3.4, SKIN, { noLine: true });   // thumb
  [[67, 32], [70.5, 31], [74, 32]].forEach(([x, y]) => rArm.dot(x, y + 3, SKIN[2]));
  // spell sparkles over the palm
  [[73, 18, '#ffffff'], [72, 18, CRYSTAL[1]], [74, 18, CRYSTAL[1]], [73, 17, CRYSTAL[1]], [73, 19, CRYSTAL[1]],
    [79, 23, GOLD[0]], [67, 20, CRYSTAL[0]], [81, 16, CRYSTAL[1]]].forEach(([x, y, c]) => rArm.dot(x, y, c));

  // --- head: 3/4 view facing right ------------------------------------------------------
  head.ell(34, 29, 5, 8, BEARD);                            // hair at the back
  head.ell(33.5, 29, 2.4, 3.2, SKIN);                       // ear
  head.ell(44, 27, 10.5, 11, SKIN, { line: true });
  // long beard over the chest, then the moustache
  const beard = head.poly([[34, 30], [38, 34], [44, 35], [50, 34], [55, 29], [55, 37], [52, 44], [47, 51], [45, 56], [42, 50], [37, 44], [34, 37]], BEARD);
  s.pattern(beard, (x, y) => (x + Math.floor(y / 3)) % 4 === 0 && s.has(beard, x, y - 2) && s.has(beard, x, y + 2), BEARD[2]);
  head.poly([[38, 33], [44, 31.5], [51, 33], [53, 36], [47, 34.6], [44, 35.4], [41, 34.6], [36, 36.5]], BEARD);
  // hat: crooked tip bent back, wide brim, gold band with stars
  const cone = head.poly([[34, 19], [37, 11], [36, 6], [31, 3], [25, 5], [31, 6.5], [33, 9], [38, 2.5], [45, 6], [50, 12], [55, 19]], HAT);
  s.pattern(cone, (x, y) => (x * 7 + y * 5) % 23 === 0 && s.has(cone, x - 1, y) && s.has(cone, x + 1, y), GOLD[0]);
  head.ell(45, 19.5, 17, 3, HAT);
  head.poly([[34, 15], [54, 15], [55, 17.5], [33.5, 17.5]], GOLD, { noLine: true });
  head.ell(26, 4.5, 1.6, 1.6, GOLD);                        // tassel

  // face: big Gaia eyes, bushy white brows, nose, rosy cheeks
  const P = (x, y, c) => s.dot(Math.round(x), Math.round(y + b), c);
  const ey = 24;
  eye({ px: (x, y, c) => P(x, y, c) }, 37, ey, EYES, 1, -1);
  eye({ px: (x, y, c) => P(x, y, c) }, 46, ey, EYES, 1, 1, true);
  for (let i = 0; i < 7; i++) { P(36 + i, ey - 2 + (i < 2 ? 1 : 0), BEARD[1]); P(36 + i, ey - 1, BEARD[2]); }
  for (let i = 0; i < 6; i++) { P(46 + i, ey - 2 + (i > 3 ? 1 : 0), BEARD[1]); P(46 + i, ey - 1, BEARD[2]); }
  P(45, 30, SKIN[2]); P(46, 30, SKIN[2]); P(46, 29, SKIN[1]); P(47, 30, SKIN[2]);
  [[37, 31], [38, 31], [52, 30]].forEach(([x, y]) => P(x, y, '#f0a090'));
  return s.finish();
}

export function toyWizardSprite() {
  const grids = [toyWizard(0), toyWizard(1)];
  // trim empty columns and rows shared by both frames
  const used = (x, y) => grids.some(g => g[y][x]);
  let x0 = W, x1 = 0, y0 = H, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (used(x, y)) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const pal = [];
  const CH = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#$%&*+-/:;<=>?@^_~';
  const frames = grids.map(g => g.slice(y0, y1 + 1).map(row => row.slice(x0, x1 + 1).map(c => {
    if (!c) return '.';
    let i = pal.indexOf(c);
    if (i < 0) { pal.push(c); i = pal.length - 1; }
    return CH[i];
  }).join('')));
  return { pal, frames };
}
