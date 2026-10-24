import Phaser from 'phaser';
import { audio } from '../audio.js';
import { save, persist } from '../save.js';
import { AGES, ENEMIES, WEAPONS, PASSIVES, SHOP_ITEMS, AGE_LENGTH, BAL, CHARACTERS, statsOf, xpForLevel } from '../data.js';
import { W, H, FONT } from '../ui.js';
import { controls } from '../controls.js';

// ?test in the URL shortens ages and weakens bosses, for quick playtesting.
const TEST = new URLSearchParams(location.search).has('test');
const AGE_TIME = TEST ? 60 : AGE_LENGTH;
const BOSS_HP_MUL = TEST ? 0.25 : 1;

const CELL = 64;
const MAX_ENEMIES = BAL.maxEnemies;
const SPAWN_DIST = 520;
const TAU = Math.PI * 2;

const hexColor = (h) => parseInt(String(h || '#ffffff').replace('#', ''), 16);

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function angleDiff(a, b) { let d = a - b; while (d > Math.PI) d -= TAU; while (d < -Math.PI) d += TAU; return Math.abs(d); }
function distToSeg(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const l2 = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / l2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export default class Game extends Phaser.Scene {
  constructor() { super('Game'); }

  init(data) {
    this.character = data.character || 'caveman';
  }

  create() {
    this.ageIndex = 0;
    this.totalTime = 0;
    this.ageTime = 0;
    this.kills = 0;
    this.coins = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = xpForLevel(1);
    this.pendingLevels = 0;
    this.rerolls = BAL.rerolls;
    this.charDef = CHARACTERS.find(c => c.key === this.character) || CHARACTERS[0];
    this.powerMul = 1;
    this.bonusHearts = 0;
    this.gemStreak = 0; this.gemStreakT = 0;
    this.frozen = false;
    this.over = false;

    this.enemies = [];
    this.freeEnemies = [];
    this.pickups = [];
    this.particles = [];
    this.numbers = [];
    this.hazards = [];
    this.grid = new Map();
    this.chunks = new Map();

    this.weapons = [];
    this.passives = {};
    this.passiveOrder = [];

    this.cameras.main.setRoundPixels(true);
    this.ground = this.add.tileSprite(W / 2, H / 2, W, H, 'ground_cave').setScrollFactor(0).setDepth(-3e7).setTileScale(1.5);

    // Player
    this.player = {
      x: 0, y: 0, r: 10, hearts: 5, maxHearts: 5, inv: 0, facing: 1, aim: 0, moving: false,
    };
    this.player.shadow = this.add.image(0, 0, 'shadow').setScale(1.6, 1.4).setDepth(-2e7);
    this.player.spr = this.add.sprite(0, 0, this.charDef.sprite, 0).setScale(1.5).setOrigin(0.5, 0.85);
    this.fx = this.add.container(0, 0).setDepth(1e7 + 1);

    this.stats = {};
    this.recomputeStats();
    this.player.hearts = this.player.maxHearts;
    this.addWeapon(this.charDef.weapon in WEAPONS ? this.charDef.weapon : Object.keys(WEAPONS)[0]);

    this.cameras.main.startFollow(this.player.spr, true, 0.45, 0.45);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    this.input.keyboard.on('keydown-ESC', () => this.ui && this.ui.togglePause());
    this.input.keyboard.on('keydown-P', () => this.ui && this.ui.togglePause());

    this.scene.launch('UI');
    this.ui = this.scene.get('UI');

    this.startAge(0);

    if (!save.seenHint) {
      this.time.delayedCall(400, () => this.ui.banner('MOVE TO DODGE!', 'Weapons attack on their own', 3500));
      save.seenHint = true; persist();
    }
    this.events.on('shutdown', () => { audio.stopMusic(); });
  }

  // ------------------------------------------------------------------
  // Ages
  startAge(i) {
    this.ageIndex = i;
    this.age = AGES[i];
    this.ageTime = 0;
    this.spawnAcc = 0;
    this.nextCluster = 15;
    this.stampedes = [AGE_TIME * 0.33, AGE_TIME * 0.73];
    this.miniSpawned = false;
    this.policeMode = false;
    this.boss = null;
    this.bossSummoned = false;
    this.bossDead = false;
    this.cleared = false;
    this.endless = false;
    this.portal = null;
    this.ground.setTexture(`ground_${this.age.ground}`);
    this.cameras.main.setBackgroundColor(this.age.bg);
    this.setDarkness(false, true);
    for (const [, list] of this.chunks) list.forEach(s => s.destroy());
    this.chunks.clear();
    audio.playMusic(this.age.music);
    if (this.ui && this.ui.ready) this.ui.onAgeStart();
  }

  // ------------------------------------------------------------------
  // Main loop
  update(_, dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05);
    if (this.frozen) { this.updateParticles(dt); this.updateNumbers(dt); return; }
    this.totalTime += dt;
    this.ageTime += dt;

    this.updatePlayer(dt);
    this.updateDirector(dt);
    this.updateEnemies(dt);
    this.buildGrid();
    this.separate();
    this.updateWeapons(dt);
    this.updateBoss(dt);
    this.updateHazards(dt);
    this.checkContacts();
    this.updatePickups(dt);
    this.updatePortal();
    this.updateParticles(dt);
    this.updateNumbers(dt);
    this.updateChunks();

    const cam = this.cameras.main;
    this.ground.tilePositionX = cam.scrollX / 1.5;
    this.ground.tilePositionY = cam.scrollY / 1.5;
    this.updateDarkness(dt);

    if (this.pendingLevels > 0 && !this.frozen && !this.over) this.openLevelUp();
  }

  updatePlayer(dt) {
    const p = this.player;
    const k = this.keys;
    let mx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let my = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (mx || my) { const l = Math.hypot(mx, my); mx /= l; my /= l; }
    else { mx = controls.x; my = controls.y; }
    const mag = Math.hypot(mx, my);
    p.moving = mag > 0.05;
    p.x += mx * this.stats.speed * dt;
    p.y += my * this.stats.speed * dt;
    if (p.moving) {
      p.aim = Math.atan2(my, mx);
      if (Math.abs(mx) > 0.1) p.facing = mx > 0 ? 1 : -1;
    }
    p.spr.setPosition(p.x, p.y + 6);
    p.spr.setFlipX(p.facing < 0);
    p.spr.setFrame(p.moving ? Math.floor(this.totalTime * 7) % 2 : 0);
    p.spr.setDepth(p.y);
    p.shadow.setPosition(p.x, p.y + 7);
    this.fx.setPosition(p.x, p.y);
    if (p.inv > 0) {
      p.inv -= dt;
      p.spr.setAlpha(Math.floor(p.inv * 14) % 2 ? 0.35 : 1);
      if (p.inv <= 0) p.spr.setAlpha(1);
    }
  }

  // ------------------------------------------------------------------
  // Spawning: more enemies with more health over time
  hpScale() {
    return this.age.hpMul * (1 + this.ageTime / BAL.hpGrowth);
  }

  updateDirector(dt) {
    if (this.cleared) return;
    const t = this.ageTime;
    const alive = this.enemies.length;

    let rate = BAL.spawnBase + t * BAL.spawnGrowth;
    if (this.boss) rate *= 0.45;
    // The crowd grows over the age, up to the cap
    const cap = Math.min(MAX_ENEMIES, BAL.crowdStart + t * BAL.crowdGrowth);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (alive < cap) this.spawnEnemy(this.chooseType());
    }

    if (t >= this.nextCluster && !this.boss) {
      this.nextCluster += 14;
      const a = rand(0, TAU);
      const n = 6 + Math.floor(t / 40);
      const type = pick(this.age.basic);
      for (let i = 0; i < n && this.enemies.length < MAX_ENEMIES + 20; i++) {
        this.spawnEnemy(type, Math.cos(a) * SPAWN_DIST + rand(-50, 50), Math.sin(a) * SPAWN_DIST + rand(-50, 50));
      }
    }

    if (this.stampedes.length && t >= this.stampedes[0] - 2 && !this.stampedeWarned && !this.boss) {
      this.stampedeWarned = true;
      this.stampedeDir = rand(0, TAU);
      this.ui.banner('STAMPEDE!', 'Get out of the way', 1800, '#f08a32');
      audio.play('warn');
    }
    if (this.stampedes.length && t >= this.stampedes[0]) {
      this.stampedes.shift();
      this.stampedeWarned = false;
      if (!this.boss) this.spawnStampede(this.stampedeDir ?? rand(0, TAU));
    }

    if (!this.miniSpawned && t >= AGE_TIME / 2 && !this.boss) {
      this.miniSpawned = true;
      const e = this.spawnEnemy(this.age.elite);
      e.hp = e.maxHp = e.maxHp * BAL.miniBossHp;
      e.mini = true;
      e.scaleMul = 1.5;
      e.r *= 1.4;
      e.spr.setScale(e.def.scale * 1.5);
      e.baseTint = 0xff9090;
      e.spr.setTint(e.baseTint);
      this.ui.banner('MINI-BOSS!', `A giant ${e.def.name.toLowerCase()} appears`, 2000, '#d83c3c');
      audio.play('roar');
    }

    // The time police only come if the boss was not summoned in time
    if (!this.policeMode && t >= AGE_TIME && !this.bossSummoned) {
      this.policeMode = true;
      this.policeAcc = 0;
      this.ui.banner('TIME POLICE!', 'You took too long', 2500, '#7ad0f4');
      audio.play('siren');
      if (!this.boss) audio.playMusic('police');
    }
    if (this.policeMode) {
      const over = t - AGE_TIME;
      this.policeAcc += (2 + over * 0.12) * dt;
      while (this.policeAcc >= 1) {
        this.policeAcc -= 1;
        if (this.enemies.length < MAX_ENEMIES + 40) {
          const e = this.spawnEnemy('timecop');
          e.hp = e.maxHp = ENEMIES.timecop.hp * this.age.hpMul * (1.5 + over / 20);
          e.speed = ENEMIES.timecop.speed + Math.min(60, over * 0.8);
        }
      }
    }
  }

  chooseType() {
    const t = this.ageTime;
    const r = Math.random();
    if (t > 110 && r < Math.min(0.04, 0.01 + (t - 110) / 6000)) return this.age.elite;
    if (t > 40 && r < Math.min(0.2, 0.05 + (t - 40) / 900)) return this.age.medium;
    // Basics unlock in order: first one from the start, then the others
    const b = this.age.basic;
    if (t < 20) return b[0];
    if (t < 60) return pick([b[0], b[1], b[1]]);
    return pick(b);
  }

  spawnEnemy(key, ox, oy) {
    const def = ENEMIES[key];
    const p = this.player;
    if (ox === undefined) { const a = rand(0, TAU); ox = Math.cos(a) * SPAWN_DIST; oy = Math.sin(a) * SPAWN_DIST; }
    let e = this.freeEnemies.pop();
    if (!e) {
      e = { spr: this.add.sprite(0, 0, def.sprite || key, 0), shadow: this.add.image(0, 0, 'shadow').setDepth(-2e7) };
      e.spr.setOrigin(0.5, 0.85);
    }
    e.spr.setTexture(def.sprite || key, 0).setScale(def.scale).setVisible(true).setAlpha(1).clearTint().setAngle(0);
    e.shadow.setVisible(true).setScale(def.r / 7, def.r / 9);
    Object.assign(e, {
      key, def, x: p.x + ox, y: p.y + oy, r: def.r, speed: def.speed * rand(0.92, 1.08),
      hp: def.hp * (def.boss ? BOSS_HP_MUL : this.hpScale()), kx: 0, ky: 0, flash: 0, slowT: 0, slowAmt: 0,
      alive: true, mode: 'chase', hitBy: {}, mini: false, boss: !!def.boss, baseTint: null, scaleMul: 1,
      anim: Math.random() * 10,
    });
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  }

  spawnStampede(dir) {
    const p = this.player;
    const key = this.age.stampede;
    const dx = Math.cos(dir), dy = Math.sin(dir);
    const nx = -dy, ny = dx;
    const n = BAL.stampedeSize;
    for (let i = 0; i < n; i++) {
      const off = rand(-230, 230);
      const back = rand(0, 260);
      const e = this.spawnEnemy(key, -dx * (SPAWN_DIST + back) + nx * off, -dy * (SPAWN_DIST + back) + ny * off);
      e.mode = 'stampede';
      e.dx = dx; e.dy = dy;
      e.speed = 210;
      e.hp = e.maxHp = Math.max(e.hp * 0.5, 6);
      e.traveled = 0;
    }
  }

  // ------------------------------------------------------------------
  // Enemies
  updateEnemies(dt) {
    const p = this.player;
    const damp = Math.exp(-9 * dt);
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (!e.alive) { this.enemies.splice(i, 1); this.freeEnemies.push(e); continue; }
      let vx, vy;
      const slow = e.slowT > 0 ? 1 - e.slowAmt : 1;
      if (e.slowT > 0) e.slowT -= dt;
      if (e.mode === 'stampede') {
        vx = e.dx * e.speed; vy = e.dy * e.speed;
        e.traveled += e.speed * dt;
        if (e.traveled > 1700) { this.removeEnemy(e); continue; }
      } else if (e.boss) {
        vx = e.vx || 0; vy = e.vy || 0;
      } else {
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 1000) {
          // Too far behind: bring it back in front of the player
          const a = rand(0, TAU);
          e.x = p.x + Math.cos(a) * SPAWN_DIST; e.y = p.y + Math.sin(a) * SPAWN_DIST;
          continue;
        }
        vx = (dx / d) * e.speed * slow; vy = (dy / d) * e.speed * slow;
      }
      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      e.kx *= damp; e.ky *= damp;
      if (Math.abs(vx) > 1) e.spr.setFlipX(vx < 0);
      e.anim += dt * (4 + e.speed / 20);
      e.spr.setFrame(Math.floor(e.anim) % 2);
      e.spr.setPosition(e.x, e.y);
      e.spr.setDepth(e.y);
      e.shadow.setPosition(e.x, e.y + 2);
      if (e.flash > 0) {
        e.flash -= dt;
        if (e.flash <= 0) { if (e.baseTint) e.spr.setTint(e.baseTint); else e.spr.clearTint(); }
      }
    }
  }

  removeEnemy(e) {
    e.alive = false;
    e.spr.setVisible(false);
    e.shadow.setVisible(false);
  }

  gridKey(cx, cy) { return cx * 73856093 ^ cy * 19349663; }

  buildGrid() {
    this.grid.clear();
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const k = this.gridKey(Math.floor(e.x / CELL), Math.floor(e.y / CELL));
      let c = this.grid.get(k);
      if (!c) { c = []; this.grid.set(k, c); }
      c.push(e);
    }
  }

  // Calls fn for every live enemy whose body overlaps the circle
  query(x, y, r, fn) {
    const pad = 40;
    const x0 = Math.floor((x - r - pad) / CELL), x1 = Math.floor((x + r + pad) / CELL);
    const y0 = Math.floor((y - r - pad) / CELL), y1 = Math.floor((y + r + pad) / CELL);
    for (let cx = x0; cx <= x1; cx++) for (let cy = y0; cy <= y1; cy++) {
      const c = this.grid.get(this.gridKey(cx, cy));
      if (!c) continue;
      for (const e of c) {
        if (!e.alive) continue;
        const dx = e.x - x, dy = e.y - y;
        const rr = r + e.r;
        if (dx * dx + dy * dy <= rr * rr) fn(e);
      }
    }
  }

  separate() {
    for (const [, c] of this.grid) {
      for (let i = 0; i < c.length; i++) {
        const a = c[i];
        for (let j = i + 1; j < c.length; j++) {
          const b = c[j];
          const dx = b.x - a.x, dy = b.y - a.y;
          const min = (a.r + b.r) * 0.8;
          const d2 = dx * dx + dy * dy;
          if (d2 < min * min && d2 > 0.01) {
            const d = Math.sqrt(d2);
            const push = (min - d) * 0.5 / d;
            const wa = a.boss ? 0 : b.boss ? 1 : 0.5;
            a.x -= dx * push * wa; a.y -= dy * push * wa;
            b.x += dx * push * (1 - wa); b.y += dy * push * (1 - wa);
          }
        }
      }
    }
  }

  nearestEnemy(range) {
    const p = this.player;
    let best = null, bd = range * range;
    for (const e of this.enemies) {
      if (!e.alive) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  enemiesInRange(range) {
    const p = this.player;
    const r2 = range * range;
    return this.enemies.filter(e => e.alive && (e.x - p.x) ** 2 + (e.y - p.y) ** 2 < r2);
  }

  hitEnemy(e, base, sx, sy, kb = 0) {
    if (!e.alive) return;
    const crit = Math.random() < BAL.critChance;
    const dmg = Math.max(1, Math.round(base * this.stats.dmg * (crit ? 2 : 1)));
    e.hp -= dmg;
    e.flash = 0.07;
    e.spr.setTintFill(0xffffff);
    if (kb) {
      const dx = e.x - sx, dy = e.y - sy;
      const d = Math.hypot(dx, dy) || 1;
      const k = e.boss ? 0 : e.def.heavy ? kb * 0.25 : kb;
      e.kx += (dx / d) * k; e.ky += (dy / d) * k;
    }
    if (save.settings.damageNumbers) this.spawnNumber(e.x, e.y - e.r * 1.6, dmg, crit);
    audio.play('hit');
    if (e.hp <= 0) this.killEnemy(e);
  }

  killEnemy(e, quiet = false) {
    if (!e.alive) return;
    this.removeEnemy(e);
    this.kills++;
    this.burst(e.x, e.y - e.r * 0.6, hexColor(e.def.color), e.boss ? 60 : e.def.heavy ? 18 : 8, e.boss ? 260 : 140);
    if (!quiet) audio.play('kill');
    if (e.boss) { this.onBossDefeated(e); return; }
    if (quiet) return;
    if (e.mode !== 'stampede' || Math.random() < 0.5) {
      const xp = e.def.xp * this.age.xpMul;
      this.dropGem(e.x, e.y, xp);
    }
    const r = Math.random();
    if (e.mini) this.dropPickup('chest', e.x, e.y);
    else if (e.def.heavy) for (let i = 0; i < 4; i++) this.dropPickup('coin', e.x + rand(-14, 14), e.y + rand(-14, 14));
    else if (r < BAL.coinChance) this.dropPickup('coin', e.x + 6, e.y);
    else if (r < BAL.coinChance + BAL.meatChance) this.dropPickup('meat', e.x, e.y);
    else if (r < BAL.coinChance + BAL.meatChance + BAL.magnetChance) this.dropPickup('magnet', e.x, e.y);
  }

  // ------------------------------------------------------------------
  // Weapons
  addWeapon(key) {
    const w = { key, level: 1, t: 0.4, queue: [], sprites: [], phase: 0 };
    this.weapons.push(w);
    if (WEAPONS[key].behavior === 'aura') {
      w.ring = this.add.graphics().setDepth(-1.8e7);
      for (let i = 0; i < 10; i++) w.sprites.push(this.add.sprite(0, 0, WEAPONS[key].icon, 0).setScale(1.4).setOrigin(0.5, 0.9));
    }
    return w;
  }

  updateWeapons(dt) {
    for (const w of this.weapons) {
      const st = statsOf(w.key, w.level);
      st.icon = WEAPONS[w.key].icon;
      switch (WEAPONS[w.key].behavior) {
        case 'swing': this.updateClub(w, st, dt); break;
        case 'orbit': this.updateAxes(w, st, dt); break;
        case 'thrust': this.updateSpear(w, st, dt); break;
        case 'aura': this.updateFire(w, st, dt); break;
        case 'rockfall': this.updateRocks(w, st, dt); break;
        case 'lightning': this.updateBolt(w, st, dt); break;
      }
    }
  }

  aimAngle(range) {
    const e = this.nearestEnemy(range);
    if (e) return Math.atan2(e.y - this.player.y, e.x - this.player.x);
    return this.player.moving ? this.player.aim : (this.player.facing > 0 ? 0 : Math.PI);
  }

  runQueue(w, dt, fn) {
    for (let i = w.queue.length - 1; i >= 0; i--) {
      const q = w.queue[i];
      q.at -= dt;
      if (q.at <= 0) { w.queue.splice(i, 1); fn(q); }
    }
  }

  updateClub(w, st, dt) {
    w.t -= dt;
    const radius = st.radius * this.stats.area;
    if (w.t <= 0) {
      w.t = st.cd;
      const n = st.count + this.stats.count;
      const aim = this.aimAngle(radius + 120);
      for (let i = 0; i < n; i++) w.queue.push({ at: i * 0.1, ang: aim + i * (TAU / n) * (n === 2 ? 1 : 1) });
    }
    this.runQueue(w, dt, (q) => {
      const p = this.player;
      const arc = 1.15;
      this.query(p.x, p.y, radius, (e) => {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < e.r + 14 || angleDiff(a, q.ang) <= arc) this.hitEnemy(e, st.dmg, p.x, p.y, st.knockback || 260);
      });
      this.slashFx(q.ang, radius, arc, st.icon);
      audio.play('swing');
    });
  }

  slashFx(ang, radius, arc, icon = 'club') {
    const g = this.add.graphics();
    const steps = 14;
    const draw = (inner, alpha, col) => {
      g.fillStyle(col, alpha);
      g.beginPath();
      for (let i = 0; i <= steps; i++) {
        const a = ang - arc + (2 * arc * i) / steps;
        const r = radius * (i === 0 || i === steps ? inner + 0.2 : 1);
        if (i === 0) g.moveTo(Math.cos(a) * r, Math.sin(a) * r); else g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      for (let i = steps; i >= 0; i--) {
        const a = ang - arc + (2 * arc * i) / steps;
        const thick = Math.sin((i / steps) * Math.PI);
        const r = radius * (1 - (1 - inner) * thick);
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath(); g.fillPath();
    };
    draw(0.55, 0.35, 0xffe0a0);
    draw(0.75, 0.9, 0xffffff);
    this.fx.add(g);
    const club = this.add.image(0, 0, icon).setScale(1.7).setOrigin(0.1, 0.9);
    this.fx.add(club);
    const r0 = radius * 0.55;
    const obj = { a: ang - arc };
    this.tweens.add({
      targets: obj, a: ang + arc, duration: 120, ease: 'Cubic.out',
      onUpdate: () => { club.setPosition(Math.cos(obj.a) * r0 * 0.4, Math.sin(obj.a) * r0 * 0.4); club.setRotation(obj.a + Math.PI / 4); },
      onComplete: () => club.destroy(),
    });
    g.setScale(0.85);
    this.tweens.add({ targets: g, alpha: 0, scale: 1.05, duration: 170, ease: 'Quad.out', onComplete: () => g.destroy() });
  }

  updateSpear(w, st, dt) {
    w.t -= dt;
    const len = st.length * this.stats.area;
    if (w.t <= 0) {
      w.t = st.cd;
      const n = st.count + this.stats.count;
      const aim = this.aimAngle(len + 60);
      for (let i = 0; i < n; i++) {
        const off = (i - (n - 1) / 2) * 0.32;
        w.queue.push({ at: Math.abs(i - (n - 1) / 2) * 0.05, ang: aim + off });
      }
    }
    this.runQueue(w, dt, (q) => {
      const p = this.player;
      const x2 = p.x + Math.cos(q.ang) * len, y2 = p.y + Math.sin(q.ang) * len;
      this.query((p.x + x2) / 2, (p.y + y2) / 2, len / 2, (e) => {
        if (distToSeg(e.x, e.y, p.x, p.y, x2, y2) <= e.r + 10) this.hitEnemy(e, st.dmg, p.x, p.y, 120);
      });
      const streak = this.add.graphics();
      streak.lineStyle(10, 0xffffff, 0.5).lineBetween(0, 0, Math.cos(q.ang) * len, Math.sin(q.ang) * len);
      streak.lineStyle(4, 0xffffff, 0.9).lineBetween(0, 0, Math.cos(q.ang) * len, Math.sin(q.ang) * len);
      this.fx.add(streak);
      this.tweens.add({ targets: streak, alpha: 0, duration: 160, onComplete: () => streak.destroy() });
      const sp = this.add.image(0, 0, st.icon).setScale(1.5).setOrigin(0.15, 0.5).setRotation(q.ang);
      this.fx.add(sp);
      const reach = Math.max(0, len - 46);
      this.tweens.add({
        targets: sp, x: Math.cos(q.ang) * reach, y: Math.sin(q.ang) * reach, duration: 90, yoyo: true, hold: 40,
        ease: 'Cubic.out', onComplete: () => sp.destroy(),
      });
      audio.play('swing');
    });
  }

  updateAxes(w, st, dt) {
    const n = st.count + this.stats.count;
    while (w.sprites.length < n) w.sprites.push(this.add.image(0, 0, st.icon).setScale(1.6).setDepth(1e7));
    while (w.sprites.length > n) w.sprites.pop().destroy();
    w.phase += st.spin * dt;
    const p = this.player;
    const radius = st.radius * this.stats.area;
    w.sprites.forEach((s, i) => {
      const a = w.phase + (i * TAU) / n;
      const x = p.x + Math.cos(a) * radius, y = p.y + Math.sin(a) * radius;
      s.setPosition(x, y);
      s.setRotation(w.phase * 3.5);
      this.query(x, y, 14, (e) => {
        if (this.totalTime - (e.hitBy[w.key] || -9) < (st.hitDelay || 0.45)) return;
        e.hitBy[w.key] = this.totalTime;
        this.hitEnemy(e, st.dmg, p.x, p.y, 160);
      });
    });
  }

  updateFire(w, st, dt) {
    const p = this.player;
    const radius = st.radius * this.stats.area;
    const tick = st.tick / (1 + 0.3 * this.stats.count);
    w.phase += dt * 1.2;
    if (w.lastR !== radius) {
      w.lastR = radius;
      w.ring.clear();
      w.ring.fillStyle(0xff7a2a, 0.13).fillCircle(0, 0, radius);
      w.ring.lineStyle(2, 0xffe06a, 0.35).strokeCircle(0, 0, radius);
    }
    w.ring.setPosition(p.x, p.y);
    w.ring.setAlpha(0.8 + Math.sin(this.totalTime * 10) * 0.2);
    w.sprites.forEach((s, i) => {
      const a = w.phase + (i * TAU) / w.sprites.length;
      const y = p.y + Math.sin(a) * radius * 0.92;
      s.setPosition(p.x + Math.cos(a) * radius * 0.92, y);
      s.setDepth(y);
      s.setFrame(Math.floor(this.totalTime * 10 + i) % 2);
    });
    this.query(p.x, p.y, radius, (e) => { e.slowT = 0.15; e.slowAmt = st.slow; });
    w.t -= dt;
    if (w.t <= 0) {
      w.t = tick;
      this.query(p.x, p.y, radius, (e) => this.hitEnemy(e, st.dmg, p.x, p.y, 25));
    }
  }

  updateRocks(w, st, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    w.t = st.cd;
    const n = st.count + this.stats.count;
    const p = this.player;
    const targets = shuffle(this.enemiesInRange(330));
    const radius = st.radius * this.stats.area;
    for (let i = 0; i < n; i++) {
      const e = targets[i];
      const tx = e ? e.x + rand(-8, 8) : p.x + rand(-200, 200);
      const ty = e ? e.y + rand(-8, 8) : p.y + rand(-260, 260);
      this.time.delayedCall(i * 90, () => this.dropRock(tx, ty, radius, st.icon, () => {
        this.query(tx, ty, radius, (en) => this.hitEnemy(en, st.dmg, tx, ty, 200));
      }));
    }
  }

  dropRock(tx, ty, radius, icon, onImpact, color = 0xffffff) {
    const sh = this.add.image(tx, ty, 'shadow').setScale(radius / 12, radius / 20).setAlpha(0.3).setDepth(-1.85e7);
    if (color !== 0xffffff) sh.setTint(color);
    const rock = this.add.image(tx, ty - 260, icon).setScale(radius / 9).setDepth(1e7 + 5);
    this.tweens.add({ targets: sh, alpha: 0.7, duration: 420 });
    this.tweens.add({
      targets: rock, y: ty, angle: 200, duration: 420, ease: 'Quad.in',
      onComplete: () => {
        rock.destroy(); sh.destroy();
        onImpact();
        this.burst(tx, ty, 0xa3a3b0, 10, 150);
        this.ringFx(tx, ty, radius, 0xffffff);
        this.shake(70, 0.004);
        audio.play('thud');
      },
    });
  }

  updateBolt(w, st, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    const targets = shuffle(this.enemiesInRange(st.range));
    if (!targets.length) { w.t = 0.2; return; }
    w.t = st.cd;
    const n = st.count + this.stats.count;
    const radius = st.radius * this.stats.area;
    for (let i = 0; i < n && i < targets.length; i++) {
      this.time.delayedCall(i * 70, () => {
        const e = targets[i];
        let x = e.x, y = e.y;
        this.strike(x, y, radius, st.dmg);
        const hit = new Set([e]);
        for (let c = 0; c < st.chain; c++) {
          let best = null, bd = 140 * 140;
          for (const o of this.enemies) {
            if (!o.alive || hit.has(o)) continue;
            const d = (o.x - x) ** 2 + (o.y - y) ** 2;
            if (d < bd) { bd = d; best = o; }
          }
          if (!best) break;
          hit.add(best);
          this.boltLine(x, y, best.x, best.y);
          this.query(best.x, best.y, radius * 0.7, (o) => this.hitEnemy(o, st.dmg * 0.6, best.x, best.y, 60));
          x = best.x; y = best.y;
        }
      });
    }
  }

  strike(x, y, radius, dmg) {
    this.boltLine(x + rand(-40, 40), y - 340, x, y);
    this.query(x, y, radius, (e) => this.hitEnemy(e, dmg, x, y, 80));
    this.ringFx(x, y, radius, 0xffe06a);
    audio.play('zap');
  }

  boltLine(x1, y1, x2, y2) {
    const g = this.add.graphics().setDepth(1e7 + 6);
    const pts = [[x1, y1]];
    const segs = 7;
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      pts.push([x1 + (x2 - x1) * t + rand(-14, 14), y1 + (y2 - y1) * t + rand(-6, 6)]);
    }
    pts.push([x2, y2]);
    const line = (wd, col, a) => {
      g.lineStyle(wd, col, a);
      g.beginPath(); g.moveTo(pts[0][0], pts[0][1]);
      for (const pt of pts) g.lineTo(pt[0], pt[1]);
      g.strokePath();
    };
    line(8, 0xffe06a, 0.5); line(3, 0xffffff, 1);
    this.tweens.add({ targets: g, alpha: 0, duration: 180, onComplete: () => g.destroy() });
  }

  ringFx(x, y, radius, color) {
    const r = this.add.image(x, y, 'ring').setTint(color).setDepth(1e7 + 4).setScale(radius / 32 * 0.5).setAlpha(0.9);
    this.tweens.add({ targets: r, scale: radius / 32 * 1.1, alpha: 0, duration: 220, onComplete: () => r.destroy() });
  }

  // ------------------------------------------------------------------
  // Player damage and contacts
  checkContacts() {
    const p = this.player;
    if (p.inv > 0) return;
    this.query(p.x, p.y, p.r, (e) => { if (p.inv <= 0) this.hurtPlayer(1); });
  }

  hurtPlayer(n) {
    const p = this.player;
    if (p.inv > 0 || this.over) return;
    p.hearts -= n;
    p.inv = BAL.invincibility;
    audio.play('hurt');
    this.shake(120, 0.008);
    this.cameras.main.flash(90, 160, 20, 20);
    // Shove nearby enemies back to give room to escape
    this.query(p.x, p.y, 90, (e) => {
      if (e.boss) return;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      const k = e.def.heavy ? 120 : 380;
      e.kx += (dx / d) * k; e.ky += (dy / d) * k;
    });
    if (p.hearts <= 0) { p.hearts = 0; this.playerDied(); }
  }

  playerDied() {
    this.over = true;
    this.frozen = true;
    audio.stopMusic();
    audio.play('death');
    const p = this.player;
    p.spr.setAlpha(1);
    this.burst(p.x, p.y, 0xd83c3c, 30, 200);
    this.tweens.add({ targets: p.spr, angle: 90 * p.facing, y: p.y + 10, duration: 500, ease: 'Bounce.out' });
    this.time.delayedCall(1300, () => this.endRun(false));
  }

  endRun(won, info = {}) {
    this.over = true;
    save.bestTime = Math.max(save.bestTime, Math.floor(this.totalTime));
    save.totalKills += this.kills;
    persist();
    this.scene.pause();
    this.ui.showResults({
      won, kills: this.kills, time: this.totalTime, age: this.age.name, level: this.level, ...info,
    });
  }

  // ------------------------------------------------------------------
  // Pickups
  dropGem(x, y, value) {
    const tex = value >= 20 ? 'gem_l' : value >= 5 ? 'gem_m' : 'gem_s';
    // Merge into a nearby gem when the floor is crowded
    if (this.pickups.length > 350) {
      for (const g of this.pickups) {
        if (g.kind === 'gem' && Math.abs(g.x - x) < 60 && Math.abs(g.y - y) < 60) { g.value += value; return; }
      }
    }
    this.dropPickup('gem', x, y, value, tex);
  }

  dropPickup(kind, x, y, value = 1, tex) {
    const key = tex || { coin: 'coin', meat: 'meat', magnet: 'magnet', chest: 'chest' }[kind];
    const spr = this.add.image(x, y, key).setScale(1.5).setDepth(-1.6e7);
    const pk = { kind, x, y, value, spr, fly: false, v: 0 };
    // Little pop when dropped
    spr.y -= 4;
    this.tweens.add({ targets: spr, y: y, duration: 180, ease: 'Bounce.out' });
    this.pickups.push(pk);
    return pk;
  }

  updatePickups(dt) {
    const p = this.player;
    const range = this.stats.pickup;
    if (this.gemStreakT > 0) { this.gemStreakT -= dt; if (this.gemStreakT <= 0) this.gemStreak = 0; }
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      const dx = p.x - k.x, dy = p.y - k.y;
      const d = Math.hypot(dx, dy);
      const reach = k.kind === 'chest' ? 30 : range;
      if (!k.fly && d < reach) { k.fly = true; k.v = -120; }
      if (k.fly) {
        k.v += 1400 * dt;
        const step = Math.min(d, k.v * dt);
        k.x += (dx / (d || 1)) * step; k.y += (dy / (d || 1)) * step;
        k.spr.setPosition(k.x, k.y);
        if (d < 14) { this.collect(k); k.spr.destroy(); this.pickups.splice(i, 1); }
      }
    }
  }

  collect(k) {
    const p = this.player;
    switch (k.kind) {
      case 'gem':
        this.gemStreak++; this.gemStreakT = 0.6;
        audio.play('gem', { streak: this.gemStreak });
        this.addXp(k.value);
        break;
      case 'coin':
        this.coins += k.value; audio.play('coin'); break;
      case 'meat':
        p.hearts = Math.min(p.maxHearts, p.hearts + 1);
        this.floatText(p.x, p.y - 30, '+1 HEART', '#ff8080');
        audio.play('buy');
        break;
      case 'magnet':
        for (const o of this.pickups) if (o.kind === 'gem') { o.fly = true; o.v = 200; }
        audio.play('select');
        break;
      case 'chest': {
        const c = Math.floor(rand(18, 32)) * (this.ageIndex + 1);
        this.coins += c;
        this.floatText(p.x, p.y - 30, `+${c} COINS`, '#f2c84b');
        this.burst(p.x, p.y, 0xf2c84b, 20, 160);
        audio.play('bosskill');
        break;
      }
    }
  }

  addXp(v) {
    this.xp += v;
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      this.xpNeed = xpForLevel(this.level);
      this.pendingLevels++;
    }
  }

  // ------------------------------------------------------------------
  // Level ups
  openLevelUp() {
    this.frozen = true;
    audio.play('levelup');
    this.burst(this.player.x, this.player.y, 0xf2c84b, 24, 180);
    const choices = this.makeChoices();
    this.time.delayedCall(10, () => {
      this.scene.pause();
      this.ui.showLevelUp(choices);
    });
  }

  makeChoices() {
    const pool = [];
    const owned = new Set(this.weapons.map(w => w.key));
    for (const w of this.weapons) if (w.level < WEAPONS[w.key].max) pool.push({ type: 'weapon', key: w.key, level: w.level + 1 });
    for (const k of this.passiveOrder) if (this.passives[k] < PASSIVES[k].max) pool.push({ type: 'passive', key: k, level: this.passives[k] + 1 });
    if (this.weapons.length < 3) for (const k of Object.keys(WEAPONS)) if (!owned.has(k)) pool.push({ type: 'weapon', key: k, level: 1, isNew: true });
    if (this.passiveOrder.length < 3) for (const k of Object.keys(PASSIVES)) if (!this.passives[k]) pool.push({ type: 'passive', key: k, level: 1, isNew: true });
    shuffle(pool);
    const out = pool.slice(0, 3);
    if (!out.length) return [{ type: 'heal' }, { type: 'coins' }];
    return out;
  }

  rerollChoices() {
    if (this.rerolls <= 0) return null;
    this.rerolls--;
    return this.makeChoices();
  }

  applyChoice(c) {
    if (c.type === 'weapon') {
      const w = this.weapons.find(x => x.key === c.key);
      if (w) w.level++; else this.addWeapon(c.key);
    } else if (c.type === 'passive') {
      if (!this.passives[c.key]) { this.passives[c.key] = 0; this.passiveOrder.push(c.key); }
      this.passives[c.key]++;
      if (PASSIVES[c.key].effect === 'hearts') { this.recomputeStats(); this.player.hearts = Math.min(this.player.maxHearts, this.player.hearts + 1); }
    } else if (c.type === 'heal') {
      this.player.hearts = this.player.maxHearts;
    } else if (c.type === 'coins') {
      this.coins += 25;
    }
    this.recomputeStats();
    this.pendingLevels--;
    if (this.pendingLevels > 0) {
      this.ui.showLevelUp(this.makeChoices());
    } else {
      this.frozen = false;
      this.player.inv = Math.max(this.player.inv, 0.5);
      this.scene.resume();
    }
  }

  recomputeStats() {
    // Sum each passive's effect
    const sum = { hearts: 0, speed: 0, count: 0, damage: 0, area: 0, pickup: 0 };
    for (const [k, lvl] of Object.entries(this.passives)) {
      const d = PASSIVES[k];
      if (d && sum[d.effect] !== undefined) sum[d.effect] += d.amount * lvl;
    }
    const ch = this.charDef;
    this.stats.dmg = (1 + sum.damage) * this.powerMul;
    this.stats.area = 1 + sum.area;
    this.stats.count = Math.round(sum.count);
    this.stats.pickup = BAL.pickupRange * (1 + sum.pickup);
    this.stats.speed = BAL.playerSpeed * (ch.speed || 1) * (1 + sum.speed);
    this.player.maxHearts = (ch.hearts || 5) + Math.round(sum.hearts) + this.bonusHearts;
    this.player.hearts = Math.min(this.player.hearts, this.player.maxHearts);
  }

  // ------------------------------------------------------------------
  // Boss
  canSummon() { return !this.boss && !this.bossDead && !this.over; }

  summonBoss() {
    if (!this.canSummon()) return;
    const p = this.player;
    const e = this.spawnEnemy(this.age.boss, 0, -360);
    e.ai = { state: 'walk', t: 2.5, n: 0 };
    e.vx = 0; e.vy = 0;
    this.boss = e;
    this.bossSummoned = true;
    this.setDarkness(true);
    this.ui.banner(`${this.age.bossName}!`, 'Dodge the red zones', 2200, '#d83c3c');
    audio.play('roar');
    audio.playMusic(this.age.bossMusic);
    this.shake(500, 0.01);
  }

  updateBoss(dt) {
    const b = this.boss;
    if (!b || !b.alive) return;
    const p = this.player;
    const ai = b.ai;
    const dx = p.x - b.x, dy = p.y - b.y;
    const d = Math.hypot(dx, dy) || 1;
    ai.t -= dt;
    // Bosses that fall far behind teleport closer
    if (d > 900) { b.x = p.x - (dx / d) * 450; b.y = p.y - (dy / d) * 450; }
    switch (ai.state) {
      case 'walk':
        b.vx = (dx / d) * b.speed; b.vy = (dy / d) * b.speed;
        if (ai.t <= 0) this.bossAttack(b);
        break;
      case 'windup':
        b.vx = 0; b.vy = 0;
        b.spr.x = b.x + Math.sin(this.totalTime * 60) * 2;
        if (ai.t <= 0) ai.onWindup();
        break;
      case 'dash':
        b.vx = ai.dx * 520; b.vy = ai.dy * 520;
        if (Math.random() < 0.5) this.burst(b.x, b.y, 0x8a6a3a, 1, 60);
        if (ai.t <= 0) { ai.state = 'walk'; ai.t = 1.6; }
        break;
      case 'rest':
        b.vx = 0; b.vy = 0;
        if (ai.t <= 0) { ai.state = 'walk'; ai.t = 1.8; }
        break;
    }
  }

  bossAttack(b) {
    const ai = b.ai;
    const p = this.player;
    ai.n++;
    const ang = Math.atan2(p.y - b.y, p.x - b.x);
    const list = this.age.bossAttacks && this.age.bossAttacks.length ? this.age.bossAttacks : ['charge', 'stomp'];
    const choice = list[ai.n % list.length];
    if (choice === 'charge') {
      ai.state = 'windup'; ai.t = 0.9;
      this.addHazard({ kind: 'line', x: b.x, y: b.y, ang, len: 620, w: 70, t: 0.9, telegraphOnly: true });
      ai.onWindup = () => { ai.state = 'dash'; ai.t = 1.15; ai.dx = Math.cos(ang); ai.dy = Math.sin(ang); audio.play('roar'); };
    } else if (choice === 'stomp') {
      ai.state = 'windup'; ai.t = 1.0;
      this.addHazard({ kind: 'circle', x: b.x, y: b.y, r: 150, t: 1.0, follow: b });
      ai.onWindup = () => { ai.state = 'rest'; ai.t = 0.6; this.shake(250, 0.012); this.ringFx(b.x, b.y, 150, 0xffffff); audio.play('thud'); };
    } else if (choice === 'rocks') {
      for (let i = 0; i < 6; i++) {
        const x = p.x + rand(-130, 130), y = p.y + rand(-130, 130);
        this.addHazard({ kind: 'circle', x, y, r: 44, t: 1.1 + i * 0.12, rock: true });
      }
      this.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 44, t: 1.0, rock: true });
      ai.state = 'rest'; ai.t = 0.8; audio.play('roar');
    } else if (choice === 'lunge') {
      ai.state = 'windup'; ai.t = 0.95;
      for (const off of [-0.42, 0, 0.42]) this.addHazard({ kind: 'line', x: b.x, y: b.y - 20, ang: ang + off, len: 430, w: 40, t: 0.95 });
      ai.onWindup = () => { ai.state = 'rest'; ai.t = 0.5; audio.play('roar'); };
    } else if (choice === 'pools') {
      for (let i = 0; i < 5; i++) {
        const x = p.x + rand(-150, 150), y = p.y + rand(-150, 150);
        this.addHazard({ kind: 'circle', x, y, r: 52, t: 1.0, persist: 4, color: 0x6ad04a });
      }
      this.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 52, t: 1.0, persist: 4, color: 0x6ad04a });
      ai.state = 'rest'; ai.t = 0.6;
    } else {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU;
        this.spawnEnemy(pick(this.age.basic), b.x - p.x + Math.cos(a) * 70, b.y - p.y + Math.sin(a) * 70);
      }
      ai.state = 'rest'; ai.t = 0.8; audio.play('roar');
    }
  }

  addHazard(h) {
    h.g = this.add.graphics().setDepth(1e7 - 0.4);
    h.age = 0;
    h.total = h.t;
    h.fired = false;
    this.hazards.push(h);
  }

  updateHazards(dt) {
    const p = this.player;
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.age += dt;
      if (h.follow) { h.x = h.follow.x; h.y = h.follow.y; }
      const g = h.g;
      g.clear();
      const col = h.color || 0xd83c3c;
      if (!h.fired) {
        h.t -= dt;
        const prog = 1 - Math.max(0, h.t) / h.total;
        const pulse = 0.18 + 0.12 * Math.sin(h.age * 20);
        if (h.kind === 'circle') {
          g.fillStyle(col, pulse).fillCircle(h.x, h.y, h.r);
          g.fillStyle(col, 0.35).fillCircle(h.x, h.y, h.r * prog);
          g.lineStyle(2, col, 0.9).strokeCircle(h.x, h.y, h.r);
        } else {
          const ex = h.x + Math.cos(h.ang) * h.len, ey = h.y + Math.sin(h.ang) * h.len;
          g.lineStyle(h.w, col, pulse).lineBetween(h.x, h.y, ex, ey);
          g.lineStyle(h.w * prog, col, 0.35).lineBetween(h.x, h.y, ex, ey);
        }
        if (h.t <= 0) {
          h.fired = true;
          if (h.rock) {
            g.clear();
            this.dropRock(h.x, h.y, h.r, 'rock', () => { if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r) this.hurtPlayer(1); }, 0xff6060);
            h.dead = true;
          } else if (h.kind === 'circle') {
            if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r) this.hurtPlayer(1);
            if (!h.persist) h.dead = true; else h.life = h.persist;
          } else {
            const ex = h.x + Math.cos(h.ang) * h.len, ey = h.y + Math.sin(h.ang) * h.len;
            if (!h.telegraphOnly && distToSeg(p.x, p.y, h.x, h.y, ex, ey) < h.w / 2 + p.r) this.hurtPlayer(1);
            if (!h.telegraphOnly) {
              const f = this.add.graphics().setDepth(1e7 + 3);
              f.lineStyle(h.w * 0.7, 0x3ab8a4, 1).lineBetween(h.x, h.y, ex, ey);
              f.lineStyle(h.w * 0.3, 0xffffff, 1).lineBetween(h.x, h.y, ex, ey);
              this.tweens.add({ targets: f, alpha: 0, duration: 250, onComplete: () => f.destroy() });
              this.shake(100, 0.006);
            }
            h.dead = true;
          }
        }
      } else if (h.life > 0) {
        h.life -= dt;
        g.fillStyle(col, 0.45 * Math.min(1, h.life)).fillCircle(h.x, h.y, h.r);
        if (Math.hypot(p.x - h.x, p.y - h.y) < h.r * 0.85 + p.r) this.hurtPlayer(1);
        if (h.life <= 0) h.dead = true;
      }
      if (h.dead) { g.destroy(); this.hazards.splice(i, 1); }
    }
  }

  clearHazards() {
    for (const h of this.hazards) h.g.destroy();
    this.hazards = [];
  }

  onBossDefeated(b) {
    this.boss = null;
    this.bossDead = true;
    this.setDarkness(false);
    this.cleared = true;
    this.policeMode = false;
    this.clearHazards();
    audio.stopMusic();
    audio.play('bosskill');
    this.shake(600, 0.015);
    this.cameras.main.flash(300, 255, 255, 255);
    // The arena clears
    for (const e of this.enemies) if (e.alive) this.killEnemy(e, true);
    for (let i = 0; i < 12; i++) this.dropPickup('coin', b.x + rand(-40, 40), b.y + rand(-40, 40), 2);
    this.dropPickup('chest', b.x, b.y);

    const first = !save.bossesBeaten[this.age.key];
    save.bossesBeaten[this.age.key] = true;
    persist();
    const next = AGES[this.ageIndex + 1];

    if (first) {
      // First kill of this boss ends the run; next time the portal opens instead
      this.frozen = false;
      this.time.delayedCall(2600, () => this.endRun(true, {
        title: 'AGE CONQUERED',
        unlock: next
          ? `${this.age.bossName} defeated for the first time!\nNext run, beating it opens the\nportal to the ${next.name}.`
          : `${this.age.bossName} defeated! You beat the MVP.\nNext run, this age becomes endless.`,
      }));
      this.ui.banner(`${this.age.bossName} DEFEATED!`, 'First victory!', 2400, '#f2c84b');
    } else if (next) {
      this.ui.banner(`${this.age.bossName} DEFEATED!`, 'A portal opens...', 2400, '#f2c84b');
      this.time.delayedCall(1500, () => this.openPortal());
    } else {
      // Last age: endless from here
      this.ui.banner('ENDLESS', 'Survive as long as you can', 2400, '#7ad0f4');
      this.endless = true;
      this.time.delayedCall(2500, () => { this.cleared = false; this.policeMode = true; this.policeAcc = 0; audio.playMusic('police'); });
    }
  }

  // ------------------------------------------------------------------
  // Portal and wizard shop
  openPortal() {
    const p = this.player;
    const x = p.x, y = p.y - 150;
    const portal = this.add.image(x, y, 'portal').setScale(0).setDepth(y);
    const glow = this.add.image(x, y, 'portal').setScale(0).setAlpha(0.35).setDepth(y - 1).setBlendMode(Phaser.BlendModes.ADD);
    this.tweens.add({ targets: portal, scale: 2.2, duration: 700, ease: 'Back.out' });
    this.tweens.add({ targets: glow, scale: 2.8, duration: 700, ease: 'Back.out', onComplete: () => this.tweens.add({ targets: glow, scale: 3.2, alpha: 0.15, yoyo: true, repeat: -1, duration: 600 }) });
    const wiz = this.add.sprite(x + 85, y + 30, 'wizard', 0).setScale(1.7).setOrigin(0.5, 0.85).setDepth(y + 30);
    this.add.image(wiz.x, wiz.y + 2, 'shadow').setScale(1.6).setDepth(-2e7);
    wiz.setAlpha(0);
    this.tweens.add({ targets: wiz, alpha: 1, duration: 500, delay: 400 });
    this.tweens.add({ targets: wiz, y: wiz.y - 3, yoyo: true, repeat: -1, duration: 700 });
    const label = this.add.text(wiz.x, wiz.y - 52, 'SHOP', { fontFamily: FONT, fontSize: '10px', color: '#e8c070', stroke: '#120c18', strokeThickness: 3 }).setOrigin(0.5).setDepth(1e7 + 10);
    this.portal = { x, y, spr: portal, glow, wiz, label, shopReady: true, entering: false };
    audio.play('portal');
  }

  updatePortal() {
    const pt = this.portal;
    if (!pt || pt.entering) return;
    const p = this.player;
    pt.spr.rotation = Math.sin(this.totalTime * 3) * 0.05;
    const dw = Math.hypot(p.x - pt.wiz.x, p.y - pt.wiz.y);
    if (dw < 44 && pt.shopReady) {
      pt.shopReady = false;
      this.frozen = true;
      this.scene.pause();
      this.ui.showShop(this.makeShop());
    } else if (dw > 90) pt.shopReady = true;
    if (Math.hypot(p.x - pt.x, p.y - pt.y) < 30) this.enterPortal();
  }

  makeShop() {
    const canUp = this.weapons.some(w => w.level < WEAPONS[w.key].max);
    const items = SHOP_ITEMS.filter(it => (it.id !== 'weapon' || this.weapons.length < 3) && (it.id !== 'upgrade' || canUp));
    return shuffle(items.slice()).slice(0, 3).map(it => ({ ...it, cost: Math.round(it.cost * (1 + this.ageIndex * 0.25)) }));
  }

  buyItem(it) {
    if (this.coins < it.cost) return false;
    const p = this.player;
    switch (it.id) {
      case 'potion': p.hearts = Math.min(p.maxHearts, p.hearts + 2); break;
      case 'heartmax': this.bonusHearts++; this.recomputeStats(); p.hearts = p.maxHearts; break;
      case 'upgrade': {
        const opts = this.weapons.filter(w => w.level < WEAPONS[w.key].max);
        if (!opts.length) return false;
        const w = pick(opts); w.level++;
        it.result = `${WEAPONS[w.key].name} is now level ${w.level}`;
        break;
      }
      case 'weapon': {
        const owned = new Set(this.weapons.map(w => w.key));
        const opts = Object.keys(WEAPONS).filter(k => !owned.has(k));
        if (!opts.length || this.weapons.length >= 3) return false;
        const k = pick(opts); this.addWeapon(k);
        it.result = `You got ${WEAPONS[k].name}`;
        break;
      }
      case 'power': this.powerMul *= 1.15; this.recomputeStats(); break;
      case 'reroll': this.rerolls += 2; break;
    }
    this.coins -= it.cost;
    return true;
  }

  closeShop() {
    this.frozen = false;
    this.scene.resume();
  }

  enterPortal() {
    const pt = this.portal;
    const p = this.player;
    pt.entering = true;
    this.frozen = true;
    audio.play('portal');
    this.tweens.add({
      targets: p.spr, x: pt.x, y: pt.y, scale: 0, angle: 360, duration: 700, ease: 'Quad.in',
      onComplete: () => {
        // Portal closes, flash, new age
        this.tweens.add({ targets: [pt.spr, pt.glow], scale: 0, duration: 500, ease: 'Back.in' });
        this.tweens.add({ targets: [pt.wiz, pt.label], alpha: 0, duration: 300 });
        this.time.delayedCall(600, () => {
          this.cameras.main.flash(600, 255, 255, 255);
          [pt.spr, pt.glow, pt.wiz, pt.label].forEach(o => o.destroy());
          this.portal = null;
          for (const k of this.pickups) { if (k.kind === 'gem') this.addXp(k.value); k.spr.destroy(); }
          this.pickups = [];
          this.startAge(this.ageIndex + 1);
          p.spr.setScale(1.5).setAngle(0);
          this.player.inv = 1.5;
          this.frozen = false;
          this.ui.banner(this.age.name, `Summon the ${this.age.bossName} when you are ready`, 3000, '#e8c070');
        });
      },
    });
  }

  // ------------------------------------------------------------------
  // Effects
  burst(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      let pt = this.particles.find(q => !q.alive);
      if (!pt) {
        if (this.particles.length > 400) return;
        pt = { spr: this.add.image(0, 0, 'px').setDepth(1e7 + 2) };
        this.particles.push(pt);
      }
      const a = rand(0, TAU), s = rand(0.3, 1) * speed;
      Object.assign(pt, { alive: true, x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rand(0.3, 0.6) });
      pt.spr.setVisible(true).setTint(color).setPosition(x, y).setScale(rand(1, 2.2)).setAlpha(1);
    }
  }

  updateParticles(dt) {
    for (const pt of this.particles) {
      if (!pt.alive) continue;
      pt.life -= dt;
      if (pt.life <= 0) { pt.alive = false; pt.spr.setVisible(false); continue; }
      pt.vy += 400 * dt;
      pt.x += pt.vx * dt; pt.y += pt.vy * dt;
      pt.vx *= 0.94;
      pt.spr.setPosition(pt.x, pt.y);
      pt.spr.setAlpha(Math.min(1, pt.life * 3));
    }
  }

  spawnNumber(x, y, val, crit) {
    let n = this.numbers.find(q => !q.alive);
    if (!n) {
      if (this.numbers.length > 40) return;
      n = { txt: this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#120c18', strokeThickness: 3 }).setOrigin(0.5).setDepth(1e7 + 8) };
      this.numbers.push(n);
    }
    Object.assign(n, { alive: true, x: x + rand(-6, 6), y, life: 0.55, vy: -70 });
    n.txt.setVisible(true).setText(String(val)).setColor(crit ? '#ffd040' : '#ffffff').setFontSize(crit ? 12 : 8).setAlpha(1).setPosition(n.x, n.y);
  }

  floatText(x, y, str, color) {
    const t = this.add.text(x, y, str, { fontFamily: FONT, fontSize: '10px', color, stroke: '#120c18', strokeThickness: 3 }).setOrigin(0.5).setDepth(1e7 + 9);
    this.tweens.add({ targets: t, y: y - 30, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
  }

  updateNumbers(dt) {
    for (const n of this.numbers) {
      if (!n.alive) continue;
      n.life -= dt;
      if (n.life <= 0) { n.alive = false; n.txt.setVisible(false); continue; }
      n.vy += 160 * dt;
      n.y += n.vy * dt;
      n.txt.setPosition(n.x, n.y).setAlpha(Math.min(1, n.life * 4));
    }
  }

  shake(ms, amt) {
    this.cameras.main.shake(ms, amt * 0.6);
  }

  // ------------------------------------------------------------------
  // Boss fights happen at night: darkness with firelight and glowing eyes
  setDarkness(on, instant = false) {
    this.darkTarget = on ? BAL.bossDarkness : 0;
    if (instant) this.darkLevel = this.darkTarget;
  }

  updateDarkness(dt) {
    const t = this.totalTime;
    for (const [, list] of this.chunks) for (const img of list) if (img.flicker !== undefined) img.setFrame(Math.floor(t * 6 + img.flicker) % 2);
    this.darkLevel = (this.darkLevel || 0) + ((this.darkTarget || 0) - (this.darkLevel || 0)) * Math.min(1, dt * 1.5);
    if (this.darkLevel < 0.01) {
      if (this.dark) { this.dark.setVisible(false); this.eyes.clear(); this.glows.forEach(g => g.setVisible(false)); }
      return;
    }
    if (!this.dark) {
      // One big dark image with a soft hole in the middle follows the player (cheap on phones),
      // and warm glows sit on top of campfires.
      this.dark = this.add.image(0, 0, 'darkness').setDepth(1e7 - 1);
      this.eyes = this.add.graphics().setDepth(1e7 - 0.5);
      this.glows = [];
    }
    const cam = this.cameras.main;
    const sx = cam.scrollX, sy = cam.scrollY;
    const p = this.player;
    this.dark.setVisible(true).setAlpha(this.darkLevel).setPosition(p.x, p.y - 6)
      .setScale(1 + Math.sin(t * 13) * 0.02 + Math.sin(t * 7) * 0.015);
    let gi = 0;
    for (const [, list] of this.chunks) for (const img of list) {
      if (!img.light) continue;
      let gl = this.glows[gi++];
      if (!gl) { gl = this.add.image(0, 0, 'glow').setDepth(1e7 - 0.6).setBlendMode(Phaser.BlendModes.ADD); this.glows.push(gl); }
      gl.setVisible(true).setPosition(img.x, img.y - 14).setScale(3.4 + Math.sin(t * 11 + img.x) * 0.15).setAlpha(this.darkLevel);
    }
    for (; gi < this.glows.length; gi++) this.glows[gi].setVisible(false);
    // Glowing eyes
    const g = this.eyes;
    g.clear();
    for (const e of this.enemies) {
      if (!e.alive || e.x < sx - 20 || e.x > sx + W + 20 || e.y < sy - 20 || e.y > sy + H + 20) continue;
      const dir = e.spr.flipX ? -1 : 1;
      const ex = e.x + dir * e.r * 0.7, ey = e.y - e.r * (e.boss ? 1.6 : 1.3);
      g.fillStyle(e.boss ? 0xff4020 : 0xffe060, this.darkLevel);
      g.fillRect(ex - 1, ey - 1, e.boss ? 4 : 2, e.boss ? 3 : 2);
    }
  }

  // Decorations scattered in chunks around the camera
  updateChunks() {
    const S = 320;
    const cam = this.cameras.main;
    const cx0 = Math.floor((cam.scrollX - 100) / S), cx1 = Math.floor((cam.scrollX + W + 100) / S);
    const cy0 = Math.floor((cam.scrollY - 100) / S), cy1 = Math.floor((cam.scrollY + H + 100) / S);
    const want = new Set();
    for (let cx = cx0; cx <= cx1; cx++) for (let cy = cy0; cy <= cy1; cy++) {
      const k = `${cx},${cy}`;
      want.add(k);
      if (this.chunks.has(k)) continue;
      let seed = Math.abs((cx * 92821) ^ (cy * 68917) ^ (this.ageIndex * 1237)) + 1;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
      const list = [];
      const n = 3 + Math.floor(rnd() * 3);
      for (let i = 0; i < n; i++) {
        const x = cx * S + rnd() * S, y = cy * S + rnd() * S;
        const key = this.age.decor[Math.floor(rnd() * this.age.decor.length)];
        if (!this.textures.exists(key)) continue;
        const flat = key === 'fern' || key === 'bones';
        const img = this.add.sprite(x, y, key, 0).setScale(1.5).setOrigin(0.5, 0.9).setDepth(flat ? -1.9e7 : y);
        if (this.textures.get(key).frameTotal > 2) img.flicker = rnd() * 10;
        if (key === 'campfire' || key === 'brazier') img.light = true;
        list.push(img);
      }
      if (this.age.paintings) {
        const m = Math.floor(rnd() * 3);
        for (let i = 0; i < m; i++) {
          const key = ['handprint', 'deer', 'hunters', 'deer'][Math.floor(rnd() * 4)];
          list.push(this.add.image(cx * S + rnd() * S, cy * S + rnd() * S, key).setScale(1.5).setAlpha(0.5).setDepth(-1.95e7));
        }
      }
      this.chunks.set(k, list);
    }
    for (const [k, list] of this.chunks) {
      if (!want.has(k)) { list.forEach(s => s.destroy()); this.chunks.delete(k); }
    }
  }
}
