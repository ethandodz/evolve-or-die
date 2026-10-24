// Placeholder pixel art, drawn in code so the MVP has no licensing questions.
// Each sprite is a grid of palette letters. A dark outline is added automatically
// around every shape, which gives the chunky "dark outline, few shades" look.

const PAL = {
  k: '#1b1424', w: '#f4f0e8', s: '#e8a872', S: '#b8704a',
  h: '#5a3420', H: '#7a4a2a', b: '#8a5a2e', B: '#5e3a1c',
  g: '#a3a3b0', G: '#62627a', r: '#d83c3c', R: '#8a1e2a',
  y: '#f2c84b', Y: '#c08a2a', o: '#f08a32', e: '#64a84e', E: '#356e3a',
  l: '#7ad0f4', L: '#3a6ac8', n: '#263a7a', p: '#a466d4', P: '#5a2e8a',
  t: '#d0a066', T: '#8a6236', c: '#f0dca0', m: '#a0603c', M: '#6a3624',
  z: '#fff2c8', i: '#c0c0cc', I: '#7a7a8c', v: '#cc2a3c', V: '#8a1824',
  q: '#d8a040', Q: '#8a5a1e', x: '#ece8e0', X: '#b4aea4', a: '#3ab8a4', A: '#1e6e6a',
  f: '#ffe06a', F: '#ff7a2a', d: '#3a2a3a', u: '#e04a8a', j: '#88e05a',
};
const OUTLINE = PAL.k;

// --- Characters ---------------------------------------------------------
const CAVEMAN = [
  '....hhhhh.....',
  '...hhHHhhhh...',
  '..hhssssshh...',
  '..hssssksh....',
  '..hsssssss....',
  '..hhsSSssh....',
  '...hhhhhhh....',
  '...tTttTtt....',
  '..sttttTtts...',
  '..sttTttttS...',
  '...ttttTtt....',
  '...TttttTt....',
];
const CAVEMAN_LEGS = [['...ss...ss....', '..SSS...SSS...'], ['....ss.ss.....', '...SSS.SSS....']];

const ROMAN = [
  '....qqqqq.....',
  '...qqqqqqq....',
  '...qQssskq....',
  '...qQsssss....',
  '....ssSss.....',
  '...vvvvvvv....',
  '..svvqqvvvs...',
  '..svvvvvvvs...',
  '...vqqqqqv....',
  '...vvvvvvv....',
];
const ROMAN_LEGS = [['...s....s.....', '..QQ....QQ....'], ['....s..s......', '...QQ.QQ......']];

const COP = [
  '....nnnnn.....',
  '...nnnynnn....',
  '..kkkkkkkkk...',
  '...sssssss....',
  '...ssskssk....',
  '....sssss.....',
  '...LLLLLLL....',
  '..sLLyLLLLs...',
  '..sLLLLLLLs...',
  '...LkkkkkL....',
  '...LLLLLLL....',
];
const COP_LEGS = [['...n....n.....', '..kk....kk....'], ['....n..n......', '...kk.kk......']];

const WOLF = [
  '...........i.i',
  '..........iiii',
  '.I.......iiiki',
  '.II.....iiiiiz',
  '..IIiiiiiiiI..',
  '...iiiiiiiiI..',
  '...IiiiiiiI...',
];
const WOLF_LEGS = [['...I.I...I.I..', '...I.I...I.I..'], ['..I...I.I...I.', '..I...I.I...I.']];

const RAPTOR = [
  '.........eee..',
  '........eekee.',
  '........eeeeez',
  '........eeE...',
  '..E....eeeE...',
  '.EeE..eeeeE...',
  '..eeeeeeeeE...',
  '...eeEeeeE....',
  '....eEeeE.....',
];
const RAPTOR_LEGS = [['....e...e.....', '....ee..ee....'], ['.....e.e......', '....ee.ee.....']];

const SABER = [
  '..........tt..',
  '.........tttt.',
  '.T......ttktt.',
  '.TT....ttttttt',
  '..TttTttTtttz.',
  '...ttttTttt.z.',
  '...tTtttttT...',
];
const SABER_LEGS = [['...t.t...t.t..', '...T.T...T.T..'], ['..t...t.t...t.', '..T...T.T...T.']];

const MAMMOTH = [
  '.....mmmmmm.......',
  '...mmmmmmmmmm.....',
  '..mmmmmmmmmmmmm...',
  '.mmMmmmmmmmmkmmm..',
  '.mmmmMmmmmmmmmmm..',
  '.mmmmmmMmmmmmmmmm.',
  '.mmmmmmmmmmmmmmzm.',
  '.mMmmmmmmmmmmmzmm.',
  '.mmmmmmmmmmmmzmm..',
];
const MAMMOTH_LEGS = [
  ['..MmmM..MmmM.zmm..', '..mmmm..mmmm..mm..', '..MMMM..MMMM...m..'],
  ['...MmmM.MmmM.zmm..', '...mmmm.mmmm..mm..', '...MMMM.MMMM...m..'],
];

const CHARIOT = [
  '................bb..',
  '...............bbkb.',
  '..............bbbbbb',
  '.....q.......bbb....',
  '....qqq.....bbb.....',
  '....vsv..bbbbbbb....',
  '.QQQQQQQbbbbbbbbb...',
  '.QvvvvvQbbbbbbbbbb..',
  '.QQQQQQQ.bb.bb.bb...',
];
const CHARIOT_LEGS = [
  ['..GgG....b..b...b...', '..gkg...bb..b...bb..', '..GgG...............'],
  ['..gGg...b....b.b....', '..GkG..bb...bb.bb...', '..gGg...............'],
];

const TREX = [
  '................EEEEEE..',
  '...............EeeeeeeE.',
  '..............Eeeekeeeee',
  '..............Eeeeeeeeee',
  '..............EeeeeRRRRR',
  '..............Eeeezzzzz.',
  '..............Eeeeeeeee.',
  '.............Eeeeeee....',
  '............EeeeeeeeE...',
  'E..........EeeeeeeeeE...',
  'EE.......EEeeeeeeeeEeE..',
  '.EEE...EEeeeeeeeeeeE.E..',
  '..EEEEEeeeeeeeeeeEeE....',
  '....EEeeeceeeeeeeE......',
  '......EEeeccceeEE.......',
  '........EeeeeeE.........',
];
const TREX_LEGS = [
  ['........EeE.EeE.........', '........Ee...Ee.........', '.......EEe..EEe.........', '.......zzz..zzz.........'],
  ['.......EeE...EeE........', '.......Ee.....Ee........', '......EEe....EEe........', '......zzz....zzz........'],
];

const HYDRA = [
  '..aa........aa........aa..',
  '.aaka......aaka......aaka.',
  '.aaaar.....aaaar.....aaaar',
  '..aaa.......aaa.......aaa.',
  '...Aa........aA......aA...',
  '....Aa.......aA.....aA....',
  '.....aa......aA....aa.....',
  '......aa.....aA...aa......',
  '.......aa....aA..aa.......',
  '........aaaaaaaaaaa.......',
  '.......aaaaaaaaaaaaa......',
  '......aAaaaaaaaaaaAaa.....',
  '.....aaaAaaaaaaaaAaaaa....',
  '....aaaaaaaaaaaaaaaaaaa...',
  '....aaacccccccccccccaaa...',
  '.....aaccccccccccccaaa....',
];
const HYDRA_LEGS = [
  ['......aaAaa....aaAaa.....', '......aa.........aa......', '.....AAA........AAA......'],
  ['.....aaAaa......aaAaa....', '.....aa...........aa.....', '....AAA..........AAA.....'],
];

const WIZARD = [
  '.......P......',
  '......PPp.....',
  '.....PPppy....',
  '....PPpppp....',
  '...PPPPPPPP...',
  '....swwwws..y.',
  '....skwwks.yfy',
  '....wwwwww..Q.',
  '...wwwwwwww.Q.',
  '...PwwwwwwP.Q.',
  '..PPpwwwwpPPQ.',
  '..PppppppppPQ.',
  '..PppppppppPQ.',
  '..PPPPPPPPPP..',
];

// --- Weapons, pickups, icons -------------------------------------------
const CLUB = [
  '.....bbb',
  '....bbbbb',
  '....bBbbb',
  '...bBbbb.',
  '..bBb....',
  '.bB......',
  'bB.......',
];
const AXE = [
  '.gggg...',
  'gwggg...',
  'gggggbb.',
  'Ggggbbb.',
  '.GG..bb.',
  '......bb',
  '.......b',
];
const SPEAR = [
  '...................gg...',
  'bbbbbbbbbbbbbbbbbbgwgg..',
  'BBBBBBBBBBBBBBBBBBggggg.',
  '...................gg...',
];
const ROCK = ['..gggg..', '.gggwgg.', 'ggggggGg', 'gGggggGg', '.GggGGG.', '..GGGG..'];
const BOLT = ['....yy', '...yy.', '..yyyy', '....y.', '...y..', '..y...'];
const FLAME = ['...f...', '..fFf..', '.fFFFf.', '.FFoFF.', 'FFoyoFF', '.FoyoF.', '..FFF..'];
const FLAME2 = ['..f....', '..ff...', '.fFFf..', '.FFoFF.', 'FFoyoFF', '.FoyoF.', '..FFF..'];

const GEM_S = ['..l..', '.lwl.', 'lllll', '.lLl.', '..L..'];
const GEM_M = ['...j...', '..jwj..', '.jjjjj.', 'jjjjjjj', '.jjEjj.', '..jEj..', '...E...'];
const GEM_L = ['...u...', '..uwu..', '.uuwuu.', 'uuuuuuu', 'uuuRuuu', '.uuRuu.', '..uRu..', '...R...'];
const COIN = ['.yyyy.', 'yyfyyy', 'yfyYyy', 'yyyYyy', 'yyYYyy', '.yyyy.'];
const MEAT = ['...rrr..', '..rrRrr.', '.rRrrrr.', '.rrrrRr.', '.zrrrr..', 'zz.rr...', 'z.......'];
const MAGNET = ['rr..gg', 'rr..gg', 'rr..gg', 'rr..gg', 'rrrrgg', '.rrgg.'];
const CHEST = ['.QQQQQQQQ.', 'QqqqqqqqqQ', 'QqqqqqqqqQ', 'QQQQyyQQQQ', 'QqqqykqqqQ', 'QqqqqqqqqQ', 'QQQQQQQQQQ'];
const HEART = ['.rr.rr.', 'rwrrrrr', 'rrrrrrr', 'rrrrrrr', '.rrrrr.', '..rrr..', '...r...'];
const HEART_EMPTY = ['.dd.dd.', 'ddddddd', 'ddddddd', 'ddddddd', '.ddddd.', '..ddd..', '...d...'];
const SANDAL = ['....bb', '...bbb', '..bbtb', '.bbbb.', 'bbbb..', 'BBB...'];
const TOTEM = ['.yyyy.', 'tkttkt', 'tttttt', '.TrrT.', 'tkttkt', 'tttttt', '.TTTT.', '.T..T.'];
const FLINT = ['....G', '...Gg', '..Ggg', '.Ggwg', 'Gggg.', 'bG...', 'b....'];
const TUSK = ['z.....', 'zz....', '.zz...', '.zzz..', '..zzz.', '...zzc', '....cc'];
const LODESTONE = ['..GG..', '.GggG.', 'GglggG', 'GggglG', '.GggG.', '..GG..'];
const SKULL = ['.wwwww.', 'wwwwwww', 'wkkwkkw', 'wkkwkkw', 'wwwkwww', '.wwwww.', '.w.w.w.'];
const LOCK = ['..ggg..', '.g...g.', '.g...g.', 'yyyyyyy', 'yyykyyy', 'yyykyyy', 'yyyyyyy'];
const POTION = ['..gg..', '..ww..', '.wrrw.', 'wrrrrw', 'wrwrrw', 'wrrrrw', '.wwww.'];
const STAR = ['...y...', '..yyy..', 'yyyfyyy', '.yyfyy.', '..yyy..', '.yy.yy.', 'y.....y'];
const REROLL = ['.lll..', 'l...l.', 'l....l', '....ll', 'll....', 'l....l', '.l...l', '..lll.'];

// Decor
const BUSH = ['...eee...', '.eeEeee..', 'eeeeeEee.', 'eEeeeeeEe', 'eeeEeeeee', '.EEEEEEE.'];
const STONE = ['..ggg...', '.gggwgg.', 'gggggggG', 'GgggggGG', '.GGGGGG.'];
const BONE = ['z.....z', 'zz...zz', '.zzzzz.', 'zz...zz', 'z.....z'];
const FERN = ['e...e..', '.e.e..e', '..e..e.', 'e.Ee.e.', '.eEEe..', '..EE...'];
const COLUMN = ['xxxxxx', '.XxxX.', '.xXxx.', '.xXxx.', '.xXxx.', '.xXxx.', 'xxxxxx', 'XXXXXX'];
const URN = ['.QQQ.', '..q..', '.qqq.', 'qqTqq', 'qTTTq', 'qqqqq', '.qqq.'];
const BROKEN = ['xx..', 'xXx.', 'xXxx', 'XXXx'];

function withLegs(body, legs, i) { return body.concat(legs[i]); }

const SPRITES = {
  caveman: [withLegs(CAVEMAN, CAVEMAN_LEGS, 0), withLegs(CAVEMAN, CAVEMAN_LEGS, 1)],
  rival: [withLegs(CAVEMAN, CAVEMAN_LEGS, 0), withLegs(CAVEMAN, CAVEMAN_LEGS, 1)],
  wolf: [withLegs(WOLF, WOLF_LEGS, 0), withLegs(WOLF, WOLF_LEGS, 1)],
  raptor: [withLegs(RAPTOR, RAPTOR_LEGS, 0), withLegs(RAPTOR, RAPTOR_LEGS, 1)],
  sabertooth: [withLegs(SABER, SABER_LEGS, 0), withLegs(SABER, SABER_LEGS, 1)],
  mammoth: [withLegs(MAMMOTH, MAMMOTH_LEGS, 0), withLegs(MAMMOTH, MAMMOTH_LEGS, 1)],
  trex: [withLegs(TREX, TREX_LEGS, 0), withLegs(TREX, TREX_LEGS, 1)],
  legionary: [withLegs(ROMAN, ROMAN_LEGS, 0), withLegs(ROMAN, ROMAN_LEGS, 1)],
  spearman: [withLegs(ROMAN, ROMAN_LEGS, 0), withLegs(ROMAN, ROMAN_LEGS, 1)],
  gladiator: [withLegs(ROMAN, ROMAN_LEGS, 0), withLegs(ROMAN, ROMAN_LEGS, 1)],
  centurion: [withLegs(['.....rrrr.....', '....rrrrrr....'].concat(ROMAN), ROMAN_LEGS, 0), withLegs(['.....rrrr.....', '....rrrrrr....'].concat(ROMAN), ROMAN_LEGS, 1)],
  chariot: [withLegs(CHARIOT, CHARIOT_LEGS, 0), withLegs(CHARIOT, CHARIOT_LEGS, 1)],
  hydra: [withLegs(HYDRA, HYDRA_LEGS, 0), withLegs(HYDRA, HYDRA_LEGS, 1)],
  timecop: [withLegs(COP, COP_LEGS, 0), withLegs(COP, COP_LEGS, 1)],
  wizard: [WIZARD],
  club: [CLUB], axe: [AXE], spear: [SPEAR], rock: [ROCK], bolt: [BOLT], flame: [FLAME, FLAME2],
  gem_s: [GEM_S], gem_m: [GEM_M], gem_l: [GEM_L], coin: [COIN], meat: [MEAT], magnet: [MAGNET], chest: [CHEST],
  heart: [HEART], heart_empty: [HEART_EMPTY], sandal: [SANDAL], totem: [TOTEM], flint: [FLINT], tusk: [TUSK],
  lodestone: [LODESTONE], skull: [SKULL], lock: [LOCK], potion: [POTION], star: [STAR], reroll: [REROLL],
  bush: [BUSH], stone: [STONE], bone: [BONE], fern: [FERN], column: [COLUMN], urn: [URN], broken: [BROKEN],
};

// Palette swaps make enemy variants from the same body
const SWAPS = {
  rival: { h: 'd', H: 'k', t: 'g', T: 'G', s: 'S' },
  spearman: { v: 'L', q: 'g', Q: 'G' },
  gladiator: { v: 's', q: 'q' },
  timecop: {},
};

function parse(rows, swap) {
  const h = rows.length;
  const w = Math.max(...rows.map(r => r.length));
  // 1px padding for the outline
  const grid = [];
  for (let y = 0; y < h + 2; y++) grid.push(new Array(w + 2).fill(null));
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      let ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      if (swap && swap[ch]) ch = swap[ch];
      grid[y + 1][x + 1] = PAL[ch] || '#ff00ff';
    }
  });
  // Outline: any empty pixel touching a filled one
  const out = grid.map(r => r.slice());
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[0].length; x++) {
      if (grid[y][x]) continue;
      const n = (grid[y - 1] && grid[y - 1][x]) || (grid[y + 1] && grid[y + 1][x]) || grid[y][x - 1] || grid[y][x + 1];
      if (n) out[y][x] = OUTLINE;
    }
  }
  return out;
}

function drawGrid(ctx, grid, ox) {
  grid.forEach((row, y) => row.forEach((c, x) => {
    if (!c) return;
    ctx.fillStyle = c;
    ctx.fillRect(ox + x, y, 1, 1);
  }));
}

export function generateTextures(scene) {
  for (const [key, frames] of Object.entries(SPRITES)) {
    const grids = frames.map(f => parse(f, SWAPS[key]));
    const fw = Math.max(...grids.map(g => g[0].length));
    const fh = Math.max(...grids.map(g => g.length));
    const canvas = document.createElement('canvas');
    canvas.width = fw * grids.length;
    canvas.height = fh;
    const ctx = canvas.getContext('2d');
    grids.forEach((g, i) => drawGrid(ctx, g, i * fw + Math.floor((fw - g[0].length) / 2)));
    const tex = scene.textures.addCanvas(key, canvas);
    grids.forEach((_, i) => tex.add(i, 0, i * fw, 0, fw, fh));
  }
  makeGround(scene, 'ground_stone', ['#5f8a3c', '#56803a', '#6a9644', '#4e7434'], ['#7aa84c', '#8a6a3a', '#3e6a30']);
  makeGround(scene, 'ground_roman', ['#d8b878', '#d0ae6c', '#e0c286', '#c8a462'], ['#b89058', '#ecd49a', '#a88048'], true);
  makeSimple(scene, 'px', 2, 2, (ctx) => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 2, 2); });
  makeSimple(scene, 'shadow', 16, 6, (ctx) => {
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(3, 0, 10, 6); ctx.fillRect(1, 1, 14, 4); ctx.fillRect(0, 2, 16, 2);
  });
  makeSimple(scene, 'portal', 40, 56, (ctx) => {
    const cols = ['#2a1050', '#5a2e8a', '#8a4ad0', '#b47af0', '#e0c0ff'];
    cols.forEach((c, i) => {
      ctx.fillStyle = c;
      const rx = 20 - i * 3.5, ry = 28 - i * 5;
      for (let y = -ry; y <= ry; y++) {
        const w = Math.round(rx * Math.sqrt(1 - (y * y) / (ry * ry)));
        ctx.fillRect(20 - w, 28 + y, w * 2, 1);
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
}

function makeSimple(scene, key, w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'));
  scene.textures.addCanvas(key, c);
}

function makeGround(scene, key, base, specks, paved) {
  const S = 128;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  let seed = key.length * 977;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let y = 0; y < S; y += 4) for (let x = 0; x < S; x += 4) {
    ctx.fillStyle = base[Math.floor(rnd() * base.length)];
    ctx.fillRect(x, y, 4, 4);
  }
  if (paved) {
    ctx.fillStyle = 'rgba(120,90,50,0.35)';
    for (let y = 0; y < S; y += 32) {
      ctx.fillRect(0, y, S, 2);
      const off = (y / 32) % 2 ? 16 : 0;
      for (let x = off; x < S; x += 32) ctx.fillRect(x, y, 2, 32);
    }
  }
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = specks[Math.floor(rnd() * specks.length)];
    const x = Math.floor(rnd() * S / 2) * 2, y = Math.floor(rnd() * S / 2) * 2;
    if (!paved && rnd() < 0.5) { ctx.fillRect(x, y, 2, 4); ctx.fillRect(x + 2, y + 2, 2, 2); }
    else ctx.fillRect(x, y, 2, 2);
  }
  scene.textures.addCanvas(key, c);
}
