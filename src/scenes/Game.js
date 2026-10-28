import Phaser from 'phaser';
import { audio } from '../audio.js';
import { save, persist } from '../save.js';
import { AGES, ENEMIES, WEAPONS, PASSIVES, SHOP_ITEMS, RARE_ITEMS, META, CFG, RARITIES, wholeEffect, AGE_LENGTH, BAL, CHARACTERS, COMBOS, EVENTS, statsOf, xpForLevel, POOL_WEAPONS, baseWeapon, RELICS, weaponEra } from '../data.js';
import { W, H, FONT, buzz } from '../ui.js';
import { stats, bump, best, allQuests, isDone, doneIds } from '../quests.js';
import { submitScore, cloudBackup, onlineEnabled } from '../online.js';
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
    // Daily challenge: { date, twists: [ids], weapon }
    this.daily = data.daily || null;
  }

  // Permanent upgrades bought with Sparks, as totals (e.g. damage: 0.12)
  metaBonus() {
    const out = { hearts: 0, damage: 0, speed: 0, xp: 0, pickup: 0, rerolls: 0, coins: 0, revive: 0 };
    for (const m of META || []) {
      const lvl = Math.min(save.upgrades[m.id] || 0, m.max);
      if (out[m.id] !== undefined) out[m.id] += lvl * m.amount;
    }
    return out;
  }

  // How far into the run we are (each Magic Mirror loop counts as more ages)
  stage() { return this.loop * AGES.length + this.ageIndex; }

  // Weapons and passives can level higher in later ages
  weaponMax(key) { return WEAPONS[key].max + Math.round((BAL.maxLevelPerAge || 0) * this.stage()) + (this.relics && this.relics.has('declaration') ? 5 : 0); }
  passiveMax(key) { return PASSIVES[key].max + Math.round((BAL.maxLevelPerAge || 0) * this.stage()); }

  // Daily challenge twists change these
  makeMods() {
    const m = { dmg: 1, hearts: 1, speed: 1, enemySpeed: 1, spawn: 1, enemyHp: 1, enemyScale: 1, xp: 1, coin: 1, noMeat: false, ageLen: AGE_TIME, randomWeapon: false };
    const tw = this.daily ? this.daily.twists : [];
    for (const t of tw) {
      if (t === 'glass') { m.dmg *= 2; m.hearts *= 0.5; }
      if (t === 'fast') { m.speed *= 1.3; m.enemySpeed *= 1.3; }
      if (t === 'horde') { m.spawn *= 1.7; m.enemyHp *= 0.6; }
      if (t === 'giants') { m.enemyHp *= 1.8; m.enemyScale *= 1.3; m.xp *= 1.6; }
      if (t === 'rich') { m.coin *= 3; m.noMeat = true; }
      if (t === 'rush') m.ageLen = TEST ? 40 : 120;
      if (t === 'random') m.randomWeapon = true;
    }
    return m;
  }

  create() {
    this.ageIndex = 0;
    this.totalTime = 0;
    this.ageTime = 0;
    this.kills = 0;
    this.meta = this.metaBonus();
    this.mods = this.makeMods();
    this.ageLen = this.mods.ageLen;
    this.coins = this.meta.coins;
    this.sparks = 0;
    this.revives = this.meta.revive;
    this.loop = 0;           // Magic Mirror loops back to the first age
    this.fireGem = false;
    this.speedMul = 1;       // Rabbit's Foot
    this.lostHearts = 0;     // Rabbit's Foot
    this.mini = null;
    this.hitStop = 0; this.hitStopCd = 0;
    this.levelFx = 0;
    this.giftGiven = !BAL.giftWeaponAt;
    this.pops = 0;
    this.level = 1;
    this.xp = 0;
    this.xpNeed = xpForLevel(1);
    this.pendingLevels = 0;
    this.rerolls = BAL.rerolls + this.meta.rerolls;
    this.charDef = CHARACTERS.find(c => c.key === this.character) || CHARACTERS[0];
    this.bonusCount = this.charDef.bonusCount || 0;
    this.weaponSlots = this.charDef.weaponSlots || BAL.weaponSlots || 3;
    this.passiveSlots = BAL.passiveSlots || 3;
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
    this.passivePts = {}; // levels weighted by card rarity
    this.passiveOrder = [];
    this.combos = new Set();   // weapon combos that are active
    this.event = null;         // random event going on (gold rush, eclipse...)
    this.hitSrc = null;        // weapon doing the hitting, for per-weapon quests
    this.runHits = {};         // damage and kills per weapon this run, for the stats screen
    this.relics = new Set();   // relics taken this run
    this.shots = [];           // projectiles from shooting weapons
    this.aliens = [];          // Alien Egg swarm
    this.sword = null;         // Excalibur
    this.coinsEarned = 0;
    this.questsDone = doneIds();
    this.questT = 1;
    this.newQuests = [];
    this.pet = null;

    this.cameras.main.setRoundPixels(true);
    this.ground = this.add.tileSprite(W / 2, H / 2, W, H, 'ground_cave').setScrollFactor(0).setDepth(-3e7).setTileScale(1.5);

    // Player
    this.player = {
      x: 0, y: 0, r: 10, hearts: 5, maxHearts: 5, inv: 0, facing: 1, aim: 0, moving: false,
    };
    this.player.shadow = this.add.image(0, 0, 'shadow').setScale(1.6, 1.4).setDepth(-2e7);
    this.player.spr = this.add.sprite(0, 0, this.charDef.sprite, 0).setScale(this.charDef.scale || 1.5).setOrigin(0.5, 0.85);
    this.fx = this.add.container(0, 0).setDepth(1e7 + 1);

    this.stats = {};
    this.recomputeStats();
    this.player.hearts = this.player.maxHearts;
    let startWeapon = this.charDef.weapon in WEAPONS ? this.charDef.weapon : Object.keys(WEAPONS)[0];
    if (this.daily && this.daily.weapon in WEAPONS) startWeapon = this.daily.weapon;
    this.addWeapon(startWeapon);
    this.checkCombos();
    if (this.charDef.pet) this.makePet(this.charDef.pet);

    this.cameras.main.startFollow(this.player.spr, true, 0.45, 0.45);

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT');
    this.input.keyboard.on('keydown-ESC', () => this.ui && this.ui.togglePause());
    this.input.keyboard.on('keydown-P', () => this.ui && this.ui.togglePause());

    this.scene.launch('UI');
    this.ui = this.scene.get('UI');

    this.startAge(0);

    // First run: a few short tips at the bottom of the screen
    this.tut = save.tutorialDone ? null : { step: 0, t: 0, moved: 0, shown: -1 };
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
    this.stampedes = [this.ageLen * 0.33, this.ageLen * 0.73];
    this.lootMul = 1;
    this.miniSpawned = false;
    this.policeMode = false;
    this.boss = null;
    this.bossSummoned = false;
    this.bossDead = false;
    this.cleared = false;
    this.endless = false;
    this.portal = null;
    this.endEvent(true);
    this.usedEvents = new Set();
    this.eventQueue = (BAL.eventTimes || []).map(f => this.ageLen * f).sort((a, b) => a - b);
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
    let dt = Math.min(dtMs / 1000, 0.05);
    if (this.frozen) { this.updateParticles(dt); this.updateNumbers(dt); return; }
    // Hit-stop: the world pauses for a few frames on a big hit
    if (this.hitStopCd > 0) this.hitStopCd -= dt;
    if (this.hitStop > 0) { this.hitStop -= dt; this.updateParticles(dt); this.updateNumbers(dt); return; }
    // Level-up slow motion before the cards appear
    if (this.levelFx > 0) {
      this.levelFx -= dt;
      dt *= 0.15;
      if (this.levelFx <= 0) this.openLevelUp();
    }
    this.totalTime += dt;
    this.ageTime += dt;

    this.updatePlayer(dt);
    this.updateTutorial(dt);
    this.updateDirector(dt);
    this.updateEvent(dt);
    this.updateEnemies(dt);
    this.buildGrid();
    this.separate();
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updatePet(dt);
    this.updateAliens(dt);
    this.updateSword(dt);
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
    this.questT -= dt;
    if (this.questT <= 0) { this.questT = 1; this.checkQuests(); }

    if (this.pendingLevels > 0 && !this.frozen && !this.over && this.levelFx <= 0) this.startLevelFx();
    // A free second weapon early in the first age
    if (!this.giftGiven && this.ageIndex === 0 && this.ageTime >= this.ageLen * BAL.giftWeaponAt && !this.frozen && !this.over && this.levelFx <= 0) {
      this.giftGiven = true;
      if (this.weapons.length < 2) this.openGift();
    }
  }

  requestHitStop(sec) {
    if (!BAL.hitStop || this.hitStopCd > 0 || this.over) return;
    this.hitStop = sec * BAL.hitStop;
    this.hitStopCd = 0.25;
  }

  startLevelFx() {
    this.levelFx = 0.4;
    buzz(25);
    const p = this.player;
    this.player.inv = Math.max(this.player.inv, 0.6);
    audio.play('levelup');
    this.burst(p.x, p.y, 0xf2c84b, 30, 220);
    this.ringFx(p.x, p.y, 90, 0xf2c84b);
    this.ringFx(p.x, p.y, 150, 0xffffff);
    this.cameras.main.zoomTo(1.12, 250);
    this.floatText(p.x, p.y - 40, 'LEVEL UP!', '#f2c84b');
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
    let spd = this.stats.speed;
    if (p.slowT > 0) { p.slowT -= dt; spd *= 0.55; }
    p.x += mx * spd * dt;
    p.y += my * spd * dt;
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
    return this.age.hpMul * (1 + this.ageTime / BAL.hpGrowth) * this.loopMul();
  }

  loopMul() {
    return 1 + this.loop * (BAL.loopHp || 2.5);
  }

  updateDirector(dt) {
    if (this.cleared) return;
    const t = this.ageTime;
    const alive = this.enemies.length;

    let rate = (BAL.spawnBase + t * BAL.spawnGrowth) * this.mods.spawn;
    if (this.boss) rate *= 0.45;
    // The crowd grows over the age, up to the cap
    const cap = Math.min(MAX_ENEMIES, BAL.crowdStart + t * BAL.crowdGrowth);
    this.spawnAcc += rate * dt;
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (alive < cap) {
        const e = this.spawnEnemy(this.chooseType());
        if (t > 45 && !e.def.heavy && !e.boss && Math.random() < (BAL.eliteChance || 0)) this.makeElite(e);
      }
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
      this.ui.banner(this.age.stampedeName || 'STAMPEDE!', 'Get out of the way', 1800, '#f08a32');
      audio.play('warn');
    }
    if (this.stampedes.length && t >= this.stampedes[0]) {
      this.stampedes.shift();
      this.stampedeWarned = false;
      if (!this.boss) this.spawnStampede(this.stampedeDir ?? rand(0, TAU));
    }

    if (this.eventQueue.length && t >= this.eventQueue[0]) {
      this.eventQueue.shift();
      if (!this.boss && !this.policeMode && !this.event) this.startEvent();
    }

    if (!this.miniSpawned && t >= this.ageLen / 2 && !this.boss) {
      this.miniSpawned = true;
      const e = this.spawnEnemy(this.age.elite);
      e.hp = e.maxHp = e.maxHp * BAL.miniBossHp;
      e.mini = true;
      e.mt = 3; e.mn = 0; e.mstate = null;
      this.mini = e;
      e.scaleMul *= 1.5;
      e.r *= 1.4;
      e.shieldHits = 0;
      e.baseTint = 0xff9090;
      e.spr.setTint(e.baseTint);
      this.ui.banner('MINI-BOSS!', `A giant ${e.def.name.toLowerCase()} appears`, 2000, '#d83c3c');
      audio.play('roar');
    }

    // The time police only come if the boss was not summoned in time
    if (!this.policeMode && t >= this.ageLen && !this.bossSummoned) {
      this.policeMode = true;
      this.policeAcc = 0;
      this.ui.banner('TIME POLICE!', 'You took too long', 2500, '#7ad0f4');
      audio.play('siren');
      if (!this.boss) audio.playMusic('police');
    }
    if (this.policeMode) {
      const over = t - this.ageLen;
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
    const sp = (this.age.specials || []).filter(k => ENEMIES[k]);
    if (t > 45 && sp.length && Math.random() < (BAL.specialChance || 0)) return pick(sp);
    if (t > 110 && r < Math.min(0.04, 0.01 + (t - 110) / 6000)) return this.age.elite;
    if (t > 40 && r < Math.min(0.2, 0.05 + (t - 40) / 900)) return this.age.medium;
    // Basics unlock in order: first one from the start, then the others
    const b = this.age.basic && this.age.basic.length ? this.age.basic : [this.age.medium];
    if (t < 20) return b[0];
    if (t < 60) return pick([b[0], b[1], b[1]]);
    return pick(b);
  }

  spawnEnemy(key, ox, oy) {
    // Content comes from the editor, so fall back safely if a reference is missing
    if (!ENEMIES[key]) key = Object.keys(ENEMIES).find(k => !ENEMIES[k].boss) || Object.keys(ENEMIES)[0];
    const def = ENEMIES[key];
    const p = this.player;
    if (ox === undefined) { const a = rand(0, TAU); ox = Math.cos(a) * SPAWN_DIST; oy = Math.sin(a) * SPAWN_DIST; }
    let e = this.freeEnemies.pop();
    if (!e) {
      e = { spr: this.add.sprite(0, 0, def.sprite || key, 0), shadow: this.add.image(0, 0, 'shadow').setDepth(-2e7) };
      e.spr.setOrigin(0.5, 0.85);
    }
    const big = def.boss ? 1 : this.mods.enemyScale;
    e.spr.setTexture(def.sprite || key, 0).setScale(def.scale * big).setVisible(true).setAlpha(1).clearTint().setAngle(0);
    e.shadow.setVisible(true).setScale(def.r * big / 7, def.r * big / 9);
    if (e.glow) e.glow.setVisible(false);
    Object.assign(e, {
      key, def, x: p.x + ox, y: p.y + oy, r: def.r * big, speed: def.speed * rand(0.92, 1.08) * (def.boss ? 1 : this.mods.enemySpeed),
      hp: def.hp * (def.boss ? BOSS_HP_MUL : this.hpScale() * this.mods.enemyHp), kx: 0, ky: 0, flash: 0, slowT: 0, slowAmt: 0,
      alive: true, mode: 'chase', hitBy: {}, mini: false, boss: !!def.boss, baseTint: null, scaleMul: big, squash: 0,
      anim: Math.random() * 10, elite: null, shieldHits: def.ai === 'shield' ? (def.shield || 2) : 0,
      aiState: null, aiT: rand(1.2, 3), zig: rand(0, TAU),
      burnT: 0, burnDps: 0, burnAcc: 0, flying: false, lift: 0,
    });
    if (e.def.boss) e.hp *= this.loopMul();
    if (e.shieldIcon) e.shieldIcon.setVisible(false);
    if (e.shieldHits) { e.baseTint = 0xb8d0ff; e.spr.setTint(e.baseTint); }
    e.maxHp = e.hp;
    this.enemies.push(e);
    return e;
  }

  // Mini-boss special moves. Returns a velocity while it is busy, or null to just chase.
  updateMini(e, dt, dx, dy, d) {
    const moves = (CFG.miniAttacks || []).length ? CFG.miniAttacks : ['stomp', 'charge'];
    const p = this.player;
    e.mt -= dt;
    if (e.mstate === 'windup') {
      e.spr.x = e.x + Math.sin(this.totalTime * 60) * 2;
      if (e.mt <= 0) e.onWindup();
      return [0, 0];
    }
    if (e.mstate === 'dash') {
      if (Math.random() < 0.5) this.burst(e.x, e.y, 0x8a6a3a, 1, 60);
      if (e.mt <= 0) { e.mstate = null; e.mt = 2.5; }
      return [e.cdx * 470, e.cdy * 470];
    }
    if (e.mstate === 'rest') {
      if (e.mt <= 0) { e.mstate = null; e.mt = 2.5; }
      return [0, 0];
    }
    if (e.mt > 0 || d > 420) return null;
    const move = moves[e.mn++ % moves.length];
    const ang = Math.atan2(dy, dx);
    if (move === 'stomp') {
      e.mstate = 'windup'; e.mt = 0.9;
      this.addHazard({ kind: 'circle', x: e.x, y: e.y, r: 115, t: 0.9, follow: e, owner: e });
      e.onWindup = () => { e.mstate = 'rest'; e.mt = 0.5; this.shake(160, 0.008); this.ringFx(e.x, e.y, 115, 0xffffff); audio.play('thud'); };
    } else if (move === 'charge') {
      e.mstate = 'windup'; e.mt = 0.8;
      e.cdx = Math.cos(ang); e.cdy = Math.sin(ang);
      this.addHazard({ kind: 'line', x: e.x, y: e.y, ang, len: 380, w: e.r * 2, t: 0.8, telegraphOnly: true, owner: e });
      e.onWindup = () => { e.mstate = 'dash'; e.mt = 0.8; audio.play('dash'); };
    } else if (move === 'throw') {
      for (let i = 0; i < 3; i++) this.addHazard({ kind: 'circle', x: p.x + rand(-70, 70), y: p.y + rand(-70, 70), r: 40, t: 1.0 + i * 0.15, rock: true });
      e.mstate = 'rest'; e.mt = 0.8; audio.play('roar');
    } else {
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        this.spawnEnemy(pick(this.age.basic), e.x - p.x + Math.cos(a) * 50, e.y - p.y + Math.sin(a) * 50);
      }
      e.mstate = 'rest'; e.mt = 0.7; audio.play('roar');
    }
    return [0, 0];
  }

  // Glowing elite: a normal enemy with a twist and better drops
  makeElite(e) {
    const kind = pick(['swift', 'giant', 'armored']);
    e.elite = kind;
    if (kind === 'swift') { e.speed *= 1.7; e.hp *= 2; e.baseTint = 0x90e0ff; }
    if (kind === 'giant') { e.hp *= 5; e.scaleMul *= 1.4; e.r *= 1.35; e.baseTint = 0xffb060; }
    if (kind === 'armored') { e.hp *= 2.5; e.shieldHits += 4; e.baseTint = 0xd0a0ff; }
    e.maxHp = e.hp;
    e.spr.setTint(e.baseTint);
    if (!e.glow) e.glow = this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD);
    e.glow.setVisible(true).setTint(e.baseTint).setScale(e.r / 10).setAlpha(0.9);
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
      } else if (e.mode === 'flee') {
        // Treasure thief: runs away, weaving, slower when far so it stays catchable
        const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
        e.zig += dt * 3;
        const ang = Math.atan2(dy, dx) + Math.sin(e.zig) * 0.7;
        const sp = e.speed * slow * (d > 380 ? 0.45 : d < 140 ? 1 : 0.85);
        vx = Math.cos(ang) * sp; vy = Math.sin(ang) * sp;
        if (Math.random() < 0.15) this.burst(e.x, e.y - 10, 0xf2c84b, 1, 30);
      } else {
        const dx = p.x - e.x, dy = p.y - e.y;
        const d = Math.hypot(dx, dy) || 1;
        if (d > 1000) {
          // Too far behind: bring it back in front of the player
          const a = rand(0, TAU);
          e.x = p.x + Math.cos(a) * SPAWN_DIST; e.y = p.y + Math.sin(a) * SPAWN_DIST;
          continue;
        }
        const fast = this.event && this.event.id === 'eclipse' ? 1.25 : 1;
        vx = (dx / d) * e.speed * slow * fast; vy = (dy / d) * e.speed * slow * fast;
        const ai = e.def.ai;
        if (e.mini) {
          const mv = this.updateMini(e, dt, dx, dy, d);
          if (mv) { vx = mv[0]; vy = mv[1]; }
        } else if (ai === 'zigzag') {
          e.zig += dt * 5;
          const side = Math.sin(e.zig) * e.speed * 1.1;
          vx += (-dy / d) * side; vy += (dx / d) * side;
        } else if (ai === 'charge') {
          // Stop, show the dash line, then dash straight ahead
          e.aiT -= dt;
          if (e.aiState === 'aim') {
            vx = 0; vy = 0;
            e.spr.x = e.x + Math.sin(this.totalTime * 70) * 1.5;
            if (e.aiT <= 0) { e.aiState = 'dash'; e.aiT = 0.45; audio.play('dash'); }
          } else if (e.aiState === 'dash') {
            vx = e.cdx * 430 * slow; vy = e.cdy * 430 * slow;
            if (Math.random() < 0.4) this.burst(e.x, e.y, 0x8a6a3a, 1, 40);
            if (e.aiT <= 0) { e.aiState = null; e.aiT = rand(2.5, 4); }
          } else if (e.aiT <= 0 && d < 300) {
            e.aiState = 'aim'; e.aiT = 0.7;
            const a = Math.atan2(dy, dx);
            e.cdx = Math.cos(a); e.cdy = Math.sin(a);
            this.addHazard({ kind: 'line', x: e.x, y: e.y, ang: a, len: 200, w: e.r * 1.6, t: 0.7, telegraphOnly: true, owner: e });
          }
        }
      }
      // Fire Gem burn: damage over time
      if (e.burnT > 0) {
        e.burnT -= dt; e.burnAcc += dt;
        if (Math.random() < 0.25) this.burst(e.x + rand(-6, 6), e.y - e.r, 0xff7a2a, 1, 30);
        if (e.burnAcc >= 0.5) {
          e.burnAcc -= 0.5;
          const bd = Math.max(1, Math.round(e.burnDps * 0.5));
          if (!e.flying) {
            this.hitSrc = 'burn';
            this.logHit(Math.min(bd, Math.max(0, e.hp)));
            e.hp -= bd;
            if (save.settings.damageNumbers) this.spawnNumber(e.x, e.y - e.r * 1.6, bd, false, '#ff9a4a');
            if (e.hp <= 0) this.killEnemy(e);
            this.hitSrc = null;
            if (!e.alive) continue;
          }
        }
      }
      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      e.kx *= damp; e.ky *= damp;
      if (Math.abs(vx) > 1) e.spr.setFlipX(vx < 0);
      e.anim += dt * (4 + e.speed / 20);
      e.spr.setFrame(Math.floor(e.anim) % 2);
      if (e.aiState !== 'aim' && e.mstate !== 'windup') e.spr.setPosition(e.x, e.y - e.lift); else e.spr.y = e.y - e.lift;
      if (e.shieldHits > 0 && !e.shieldIcon) e.shieldIcon = this.add.image(0, 0, 'shieldicon').setScale(1.3);
      if (e.shieldIcon) e.shieldIcon.setVisible(e.shieldHits > 0).setPosition(e.x, e.y - e.r * 2.6 - 4).setDepth(e.y + 1);
      // Squash when hit
      const sc = e.def.scale * e.scaleMul;
      if (e.squash > 0) {
        e.squash = Math.max(0, e.squash - dt * 8);
        e.spr.setScale(sc * (1 + e.squash * 0.28), sc * (1 - e.squash * 0.22));
      } else e.spr.setScale(sc);
      if (e.glow) e.glow.setPosition(e.x, e.y - e.r * 0.6).setDepth(e.y - 1).setAlpha(0.7 + Math.sin(this.totalTime * 8) * 0.25);
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
    if (e.glow) e.glow.setVisible(false);
    if (e.shieldIcon) e.shieldIcon.setVisible(false);
    if (e === this.mini) this.mini = null;
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
    if (!e.alive || e.flying) return;
    const crit = Math.random() < BAL.critChance * (this.charDef.critMul || 1);
    let dmg = Math.max(1, Math.round(base * this.stats.dmg * (crit ? 2 : 1) * (e.vuln ? 2 : 1)));
    if (e.shieldHits > 0 && !save.seenShield) {
      save.seenShield = true; persist();
      this.ui.banner('SHIELDS!', 'Blue enemies block most damage\nuntil their shield breaks', 2600, '#b8d0ff');
    }
    // Shields soak most of a hit, and break after a few
    if (e.shieldHits > 0) {
      e.shieldHits--;
      dmg = Math.max(1, Math.round(dmg * 0.15));
      if (e.shieldHits === 0) {
        audio.play('break');
        this.burst(e.x, e.y - e.r, 0xb8d0ff, 10, 160);
        this.floatText(e.x, e.y - e.r * 2, 'SHIELD BROKEN!', '#b8d0ff');
        if (!e.elite) e.baseTint = null;
        if (e.shieldIcon) e.shieldIcon.setVisible(false);
      } else audio.play('clang');
    }
    this.logHit(Math.min(dmg, Math.max(0, e.hp)));
    // Mona Lisa: the first hit stops each enemy to admire the painting
    if (this.relics.has('monalisa') && !e.admired && !e.boss) { e.admired = true; e.slowT = 1.5; e.slowAmt = 1; }
    e.hp -= dmg;
    if (this.fireGem && !e.boss) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, dmg * 0.4); }
    else if (this.fireGem) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, dmg * 0.15); }
    e.flash = 0.07;
    e.squash = 1;
    e.spr.setTintFill(0xffffff);
    if (crit) this.requestHitStop(0.035);
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

  // Per-run damage and kills, by whatever is doing the hitting
  runHit(src = this.hitSrc || 'other') {
    return this.runHits[src] || (this.runHits[src] = { dmg: 0, kills: 0 });
  }
  logHit(dmg) { this.runHit().dmg += dmg; }

  killEnemy(e, quiet = false) {
    if (!e.alive) return;
    this.removeEnemy(e);
    this.kills++;
    this.runHit(quiet ? 'clear' : undefined).kills++;
    const st = stats();
    st.kills++;
    if (this.hitSrc && WEAPONS[this.hitSrc]) st.wk[this.hitSrc] = (st.wk[this.hitSrc] || 0) + 1;
    if (e.elite) st.elites = (st.elites || 0) + 1;
    this.burst(e.x, e.y - e.r * 0.6, hexColor(e.def.color), e.boss ? 60 : e.def.heavy || e.elite ? 18 : 8, e.boss ? 260 : 140);
    this.deathPop(e);
    if (!quiet) audio.play('kill');
    if (e.boss) { this.onBossDefeated(e); return; }
    if (quiet) return;
    if (e.def.heavy || e.mini || e.elite) { this.requestHitStop(0.06); this.shake(90, 0.005); }
    if (e.def.ai === 'split' && ENEMIES[e.def.splitInto]) {
      const n = e.def.splitCount || 2;
      const p = this.player;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.3, 0.3);
        const c = this.spawnEnemy(e.def.splitInto, e.x - p.x + Math.cos(a) * 10, e.y - p.y + Math.sin(a) * 10);
        c.kx = Math.cos(a) * 260; c.ky = Math.sin(a) * 260;
      }
    }
    if (e.thief) {
      bump('thieves');
      const chest = this.dropTreasure(e.x, e.y);
      if (!chest) this.dropPickup('chest', e.x, e.y);
      for (let i = 0; i < 8; i++) this.dropPickup('coin', e.x + rand(-20, 20), e.y + rand(-20, 20), this.mods.coin * 2);
      this.ui.banner('CAUGHT!', chest ? 'He dropped a relic chest' : 'He dropped his loot', 1600, '#7ad0f4');
      if (this.event && this.event.target === e) this.event = null;
    }
    if (e.mode !== 'stampede' || Math.random() < 0.5) {
      const xp = e.def.xp * (BAL.xpDrop ?? 0.6) * this.age.xpMul * this.mods.xp * (e.elite ? 5 : 1) * (this.event && this.event.id === 'eclipse' ? 2 : 1);
      this.dropGem(e.x, e.y, xp);
    }
    // Any enemy has a tiny chance of a relic chest
    if (Math.random() < (BAL.treasureChance ?? 0.001)) this.dropTreasure(e.x + 10, e.y + 10);
    const r = Math.random();
    const coin = this.mods.coin;
    const coinChance = BAL.coinChance * (this.event && this.event.id === 'gold' ? 5 : 1);
    if (e.mini) { this.dropPickup('chest', e.x + 24, e.y); this.dropPickup('spark', e.x + 16, e.y + 16, 2); }
    else if (e.def.heavy || e.elite) {
      for (let i = 0; i < 4; i++) this.dropPickup('coin', e.x + rand(-14, 14), e.y + rand(-14, 14), coin);
      if (Math.random() < (e.def.heavy ? 0.35 : 0.25)) this.dropPickup('spark', e.x, e.y - 8, 1);
    }
    else if (r < coinChance) this.dropPickup('coin', e.x + 6, e.y, coin);
    else if (r < coinChance + BAL.meatChance) { if (!this.mods.noMeat) this.dropPickup('meat', e.x, e.y); }
    else if (r < coinChance + BAL.meatChance + BAL.magnetChance) this.dropPickup('magnet', e.x, e.y);
  }

  // A white silhouette that squashes flat and fades
  deathPop(e) {
    if (this.pops > 30) return;
    this.pops++;
    const sc = e.def.scale * e.scaleMul;
    const img = this.add.image(e.x, e.y, e.spr.texture.key, e.spr.frame.name).setOrigin(0.5, 0.85)
      .setScale(sc).setFlipX(e.spr.flipX).setTintFill(0xffffff).setDepth(e.y);
    this.tweens.add({
      targets: img, scaleX: sc * 1.5, scaleY: sc * 0.15, alpha: 0, duration: e.boss ? 600 : 160, ease: 'Quad.out',
      onComplete: () => { img.destroy(); this.pops--; },
    });
  }

  // ------------------------------------------------------------------
  // Weapons
  // Shared weapons you can be offered: those from this age or earlier, plus any found in past runs
  poolWeapons() {
    return POOL_WEAPONS.filter(k => weaponEra(k) <= this.ageIndex || this.loop > 0 || save.weaponsFound[k]);
  }

  addWeapon(key) {
    const w = { key, level: 1, t: 0.4, queue: [], sprites: [], phase: 0 };
    this.weapons.push(w);
    // Equipping a later age's weapon for the first time unlocks it from the Stone Age on
    if (!WEAPONS[key].signature && !save.weaponsFound[key]) {
      save.weaponsFound[key] = true;
      persist();
      if (weaponEra(key) > 0 && this.ui && this.ui.ready) this.ui.banner('DISCOVERED!', `${WEAPONS[key].name} can now show up\nfrom the ${AGES[0].name} in future runs`, 2200, '#7ad0f4');
    }
    if (WEAPONS[key].behavior === 'aura') {
      w.ring = this.add.graphics().setDepth(-1.8e7);
      for (let i = 0; i < 10; i++) w.sprites.push(this.add.sprite(0, 0, WEAPONS[key].icon, 0).setScale(1.4).setOrigin(0.5, 0.9));
    }
    return w;
  }

  updateWeapons(dt) {
    for (const w of this.weapons) {
      const st = statsOf(w.key, w.level);
      st.icon = WEAPONS[w.key].fx || WEAPONS[w.key].icon;
      // Rare+ level-ups add a bigger share of each stat's per-level step
      if (w.boost) for (const [k, s] of Object.entries(WEAPONS[w.key].stats || {})) if (s && s.per) st[k] += s.per * w.boost;
      if (w.dmgMul) st.dmg *= w.dmgMul;
      if (st.cd && this.charDef.cdMul) st.cd *= this.charDef.cdMul;
      if (w.bonusCount && st.count !== undefined) st.count += w.bonusCount;
      if (this.combos.has('pack') && (baseWeapon(w.key) === 'spear' || baseWeapon(w.key) === 'axes') && st.count !== undefined) st.count += 1;
      this.hitSrc = w.key;
      switch (WEAPONS[w.key].behavior) {
        case 'swing': this.updateClub(w, st, dt); break;
        case 'orbit': this.updateAxes(w, st, dt); break;
        case 'thrust': this.updateSpear(w, st, dt); break;
        case 'aura': this.updateFire(w, st, dt); break;
        case 'rockfall': this.updateRocks(w, st, dt); break;
        case 'lightning': this.updateBolt(w, st, dt); break;
        case 'shoot': this.updateShoot(w, st, dt); break;
      }
    }
    this.hitSrc = null;
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
      // Whirlwind combo: the swing goes all the way around
      const arc = this.combos.has('whirlwind') ? Math.PI : 1.15;
      const torch = this.combos.has('torch');
      this.query(p.x, p.y, radius, (e) => {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        const d = Math.hypot(e.x - p.x, e.y - p.y);
        if (d < e.r + 14 || angleDiff(a, q.ang) <= arc) {
          this.hitEnemy(e, st.dmg, p.x, p.y, st.knockback || 260);
          if (torch) this.ignite(e, st.dmg * 0.35 * this.stats.dmg, 2.5);
        }
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
      // Lightning Rod combo: a bolt strikes the spear tip
      if (this.combos.has('rod')) this.strike(x2, y2, 34 * this.stats.area, st.dmg * 0.6);
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

  // Projectile weapons: fire at the nearest enemy; shots fly straight and can pierce
  updateShoot(w, st, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    const range = (st.range || 400) * this.stats.area;
    const target = this.nearestEnemy(range);
    if (!target) { w.t = 0.1; return; }
    w.t = st.cd;
    const n = st.count + this.stats.count;
    const p = this.player;
    const aim = Math.atan2(target.y - p.y, target.x - p.x);
    const spin = !!WEAPONS[w.key].spin;
    for (let i = 0; i < n; i++) {
      const ang = aim + (i - (n - 1) / 2) * 0.16;
      this.time.delayedCall(i * 60, () => {
        if (this.over) return;
        const spr = this.add.image(p.x, p.y - 14, st.icon).setScale(1.5).setDepth(1e7 + 2).setRotation(spin ? 0 : ang);
        this.shots.push({
          key: w.key, x: p.x, y: p.y - 14, vx: Math.cos(ang) * (st.speed || 500), vy: Math.sin(ang) * (st.speed || 500),
          dmg: st.dmg, pierce: Math.round(st.pierce || 0), r: (st.size || 8) * Math.sqrt(this.stats.area), life: range / (st.speed || 500) + 0.2, spr, spin, hit: new Set(),
        });
      });
    }
    audio.play('swing');
  }

  updateShots(dt) {
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.life -= dt;
      s.spr.setPosition(s.x, s.y);
      if (s.spin) s.spr.rotation += dt * 14;
      this.hitSrc = s.key;
      this.query(s.x, s.y, s.r + 12, (e) => {
        if (s.dead || s.hit.has(e) || Math.hypot(e.x - s.x, e.y - s.y) > e.r + s.r) return;
        s.hit.add(e);
        this.hitEnemy(e, s.dmg, s.x - s.vx * 0.05, s.y - s.vy * 0.05, 90);
        if (s.pierce-- <= 0) s.dead = true;
      });
      this.hitSrc = null;
      if (s.dead || s.life <= 0) { s.spr.destroy(); this.shots.splice(i, 1); }
    }
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
      const [fill, edge] = WEAPONS[w.key].ringColor || [0xff7a2a, 0xffe06a];
      w.ring.fillStyle(fill, 0.13).fillCircle(0, 0, radius);
      w.ring.lineStyle(2, edge, 0.35).strokeCircle(0, 0, radius);
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
        const magma = this.combos.has('magma');
        this.hitSrc = w.key;
        this.query(tx, ty, radius, (en) => {
          this.hitEnemy(en, st.dmg, tx, ty, 200);
          if (magma) this.ignite(en, st.dmg * 0.3 * this.stats.dmg, 3);
        });
        this.hitSrc = null;
        if (magma) this.burst(tx, ty, 0xff7a2a, 8, 120);
      }, 0xffffff, true));
    }
  }

  // small: the player's own rocks, drawn smaller and quieter so they don't distract (same hit area)
  dropRock(tx, ty, radius, icon, onImpact, color = 0xffffff, small = false) {
    const sz = small ? 0.55 : 1;
    const sh = this.add.image(tx, ty, 'shadow').setScale(radius / 12 * sz, radius / 20 * sz).setAlpha(0.3).setDepth(-1.85e7);
    if (color !== 0xffffff) sh.setTint(color);
    const rock = this.add.image(tx, ty - 260, icon).setScale(radius / 9 * sz).setDepth(1e7 + 5);
    this.tweens.add({ targets: sh, alpha: 0.7, duration: 420 });
    this.tweens.add({
      targets: rock, y: ty, angle: 200, duration: 420, ease: 'Quad.in',
      onComplete: () => {
        rock.destroy(); sh.destroy();
        onImpact();
        this.burst(tx, ty, 0xa3a3b0, small ? 4 : 10, small ? 90 : 150);
        if (small) this.ringFx(tx, ty, radius * 0.7, 0xffffff);
        else { this.ringFx(tx, ty, radius, 0xffffff); this.shake(70, 0.004); }
        audio.play('thud');
      },
    });
  }

  updateBolt(w, st, dt) {
    w.t -= dt;
    if (w.t > 0) return;
    const targets = shuffle(this.enemiesInRange(st.range));
    if (!targets.length) { w.t = 0.2; return; }
    w.t = st.cd * (this.combos.has('storm') ? 0.65 : 1);
    const n = st.count + this.stats.count;
    const radius = st.radius * this.stats.area;
    for (let i = 0; i < n && i < targets.length; i++) {
      this.time.delayedCall(i * 70, () => {
        const e = targets[i];
        let x = e.x, y = e.y;
        this.hitSrc = w.key;
        const col = WEAPONS[w.key].boltColor;
        this.strike(x, y, radius, st.dmg, col);
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
          this.boltLine(x, y, best.x, best.y, col);
          this.query(best.x, best.y, radius * 0.7, (o) => this.hitEnemy(o, st.dmg * 0.6, best.x, best.y, 60));
          x = best.x; y = best.y;
        }
        this.hitSrc = null;
      });
    }
  }

  strike(x, y, radius, dmg, color = 0xffe06a) {
    this.boltLine(x + rand(-40, 40), y - 340, x, y, color);
    this.query(x, y, radius, (e) => this.hitEnemy(e, dmg, x, y, 80));
    this.ringFx(x, y, radius, color);
    audio.play('zap');
  }

  boltLine(x1, y1, x2, y2, color = 0xffe06a) {
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
    line(8, color, 0.5); line(3, 0xffffff, 1);
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
    this.query(p.x, p.y, p.r, (e) => { if (p.inv <= 0 && !e.flying && !e.thief) this.hurtPlayer(1); });
  }

  hurtPlayer(n) {
    const p = this.player;
    if (p.inv > 0 || this.over) return;
    p.hearts -= n * (this.charDef.damageTaken || 1);
    p.inv = BAL.invincibility;
    if (this.boss) this.bossHits++;
    audio.play('hurt');
    buzz(70);
    this.shake(120, 0.008);
    this.cameras.main.flash(90, 160, 20, 20);
    // Shove nearby enemies back to give room to escape
    this.query(p.x, p.y, 90, (e) => {
      if (e.boss) return;
      const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
      const k = e.def.heavy ? 120 : 380;
      e.kx += (dx / d) * k; e.ky += (dy / d) * k;
    });
    if (this.relics.has('alienegg') && p.hearts > 0) this.releaseAliens();
    if (p.hearts <= 0 && this.revives > 0) { this.revive(); return; }
    if (p.hearts <= 0) { p.hearts = 0; this.playerDied(); }
  }

  // ------------------------------------------------------------------
  // Alien Egg: getting hit hatches a swarm that hunts nearby enemies for a few seconds
  releaseAliens() {
    const p = this.player;
    const n = 6 + Math.floor(this.level / 8);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const spr = this.add.sprite(p.x, p.y, 'alien', 0).setScale(1.6);
      this.aliens.push({ x: p.x, y: p.y, vx: Math.cos(a) * 260, vy: Math.sin(a) * 260, spr, life: 6, cd: 0, target: null });
    }
    this.burst(p.x, p.y, 0x8ad060, 16, 180);
    this.floatText(p.x, p.y - 40, 'THE SWARM!', '#a8f08a');
    audio.play('gift');
  }

  updateAliens(dt) {
    if (!this.aliens.length) return;
    const p = this.player;
    for (let i = this.aliens.length - 1; i >= 0; i--) {
      const a = this.aliens[i];
      a.life -= dt; a.cd -= dt;
      if (a.life <= 0) { this.burst(a.x, a.y, 0x8ad060, 4, 80); a.spr.destroy(); this.aliens.splice(i, 1); continue; }
      if (!a.target || !a.target.alive) a.target = this.nearestEnemyTo(a.x, a.y, 300);
      const tx = a.target ? a.target.x : p.x + Math.cos(a.life * 3 + i) * 50;
      const ty = a.target ? a.target.y : p.y + Math.sin(a.life * 3 + i) * 50;
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, dt * 6);
      a.vx += ((dx / d) * 300 - a.vx) * k; a.vy += ((dy / d) * 300 - a.vy) * k;
      a.x += a.vx * dt; a.y += a.vy * dt;
      if (a.target && d < a.target.r + 8 && a.cd <= 0) {
        a.cd = 0.35;
        this.hitSrc = 'aliens';
        this.hitEnemy(a.target, 6 + this.level * 1.2, a.x, a.y, 40);
        this.hitSrc = null;
      }
      a.spr.setPosition(a.x, a.y).setDepth(a.y).setFlipX(a.vx < 0).setAlpha(a.life < 1 ? a.life : 1);
    }
  }

  nearestEnemyTo(x, y, range) {
    let best = null, bd = range * range;
    for (const e of this.enemies) {
      if (!e.alive || e.flying) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // Excalibur: held out in the direction you move, it cuts whatever it touches
  updateSword(dt) {
    const s = this.sword;
    if (!s) return;
    const p = this.player;
    const want = p.moving ? p.aim : s.ang;
    const diff = Math.atan2(Math.sin(want - s.ang), Math.cos(want - s.ang));
    s.ang += diff * Math.min(1, dt * 14);
    const len = 120 * this.stats.area;
    const x0 = p.x + Math.cos(s.ang) * 10, y0 = p.y - 10 + Math.sin(s.ang) * 10;
    s.spr.setPosition(x0, y0).setRotation(s.ang).setScale(len / 44, 1.8).setDepth(p.y + (Math.sin(s.ang) > 0 ? 1 : -1));
    s.glow.setPosition(x0 + Math.cos(s.ang) * len * 0.55, y0 + Math.sin(s.ang) * len * 0.55).setScale(len / 40, 0.9).setRotation(s.ang);
    const x2 = x0 + Math.cos(s.ang) * len, y2 = y0 + Math.sin(s.ang) * len;
    this.hitSrc = 'excalibur';
    this.query((x0 + x2) / 2, (y0 + y2) / 2, len / 2 + 10, (e) => {
      if (distToSeg(e.x, e.y, x0, y0, x2, y2) > e.r + 8) return;
      if (this.totalTime - (e.hitBy.excalibur || -9) < 0.4) return;
      e.hitBy.excalibur = this.totalTime;
      this.hitEnemy(e, 14.4 + this.level * 2, p.x, p.y, 160);
    });
    this.hitSrc = null;
  }

  revive() {
    const p = this.player;
    this.revives--;
    p.hearts = Math.max(1, Math.ceil(p.maxHearts / 2));
    p.inv = 2.5;
    audio.play('revive');
    this.cameras.main.flash(400, 255, 200, 120);
    this.burst(p.x, p.y, 0xffc848, 50, 300);
    this.ringFx(p.x, p.y, 200, 0xffc848);
    this.ui.banner('SECOND WIND!', 'Back from the dead', 1800, '#ffc848');
    this.query(p.x, p.y, 200, (e) => {
      if (e.boss) return;
      this.hitEnemy(e, 60, p.x, p.y, 700);
    });
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
    // Sparks still on the floor are picked up for you
    for (const k of this.pickups) if (k.kind === 'spark') this.sparks += k.value;
    const lines = [];
    if (this.sparks) lines.push(['Sparks found', this.sparks]);
    const timeBonus = Math.floor(this.totalTime / (BAL.sparkTimeEvery || 60));
    if (timeBonus) lines.push(['Time survived', timeBonus]);
    const coinBonus = Math.floor(this.coins / (BAL.sparkCoinsEvery || 25));
    if (coinBonus) lines.push(['Leftover coins', coinBonus]);
    let dailyNew = false;
    best('bestTime', this.totalTime); best('bestLevel', this.level); best('bestCoins', this.coinsEarned);
    if (this.daily) bump('dailies');
    // Best runs on this device, for the scores screen
    save.history.push({ time: Math.floor(this.totalTime), kills: this.kills, age: this.age.name, character: this.charDef.name, date: new Date().toISOString().slice(0, 10), daily: this.daily ? this.daily.date : null });
    save.history.sort((a, b) => b.time - a.time);
    save.history.length = Math.min(save.history.length, 10);
    if (this.daily) {
      const d = save.daily;
      if (d.date !== this.daily.date) Object.assign(d, { date: this.daily.date, best: 0, bestKills: 0, played: false });
      if (!d.played) lines.push(['First daily run', 10]);
      d.played = true;
      if (this.totalTime > d.best) { d.best = Math.floor(this.totalTime); d.bestKills = this.kills; dailyNew = true; }
    }
    const total = lines.reduce((a, l) => a + l[1], 0);
    save.sparks += total;
    save.bestTime = Math.max(save.bestTime, Math.floor(this.totalTime));
    save.totalKills += this.kills;
    persist();
    if (onlineEnabled) {
      submitScore({ time: this.totalTime, kills: this.kills, age: this.age.name, character: this.charDef.name, daily: this.daily ? this.daily.date : null });
      cloudBackup().catch(() => {});
    }
    this.checkQuests(true);
    this.scene.pause();
    this.ui.showResults({
      won, kills: this.kills, time: this.totalTime, age: this.age.name, level: this.level,
      sparks: { total, lines }, daily: this.daily, dailyNew, quests: this.newQuests.length, hits: this.runHits, ...info,
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
    const key = tex || { coin: 'coin', meat: 'meat', magnet: 'magnet', chest: 'chest', spark: 'spark', treasure: 'treasure' }[kind];
    const spr = this.add.image(x, y, key).setScale(kind === 'treasure' ? 1.8 : 1.5).setDepth(-1.6e7);
    if (kind === 'treasure') this.tweens.add({ targets: spr, angle: { from: -6, to: 6 }, yoyo: true, repeat: -1, duration: 260 });
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
      const reach = k.kind === 'chest' || k.kind === 'treasure' ? 30 : k.kind === 'spark' ? range * 1.5 : range;
      if (k.kind === 'spark' && !k.fly) k.spr.setScale(1.5 + Math.sin(this.totalTime * 8 + k.x) * 0.2);
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
        this.coins += k.value; this.coinsEarned += k.value; audio.play('coin'); break;
      case 'treasure':
        this.openTreasure();
        break;
      case 'spark':
        this.sparks += k.value;
        audio.play('spark');
        if (k.value > 1) this.floatText(p.x, p.y - 30, `+${k.value} SPARKS`, '#ffe060');
        break;
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
        const c = Math.round(Math.floor(rand(18, 32)) * (this.ageIndex + 1) * (k.value || 1));
        this.coins += c;
        this.coinsEarned += c;
        this.floatText(p.x, p.y - 30, `+${c} COINS`, '#f2c84b');
        this.burst(p.x, p.y, 0xf2c84b, 20, 160);
        audio.play('bosskill');
        break;
      }
    }
  }

  addXp(v) {
    this.xp += v * (1 + this.meta.xp) * (this.charDef.xpMul || 1);
    while (this.xp >= this.xpNeed) {
      this.xp -= this.xpNeed;
      this.level++;
      best('bestLevel', this.level);
      this.xpNeed = xpForLevel(this.level);
      this.pendingLevels++;
    }
  }

  // ------------------------------------------------------------------
  // Level ups
  openLevelUp() {
    this.levelFx = 0;
    this.cameras.main.zoomTo(1, 150);
    if (this.over) return;
    this.frozen = true;
    const choices = this.makeChoices();
    this.time.delayedCall(10, () => {
      this.scene.pause();
      this.ui.showLevelUp(choices);
    });
  }

  // Free weapon pick early in the run
  openGift() {
    const owned = new Set(this.weapons.map(w => w.key));
    const list = shuffle(this.poolWeapons().filter(k => !owned.has(k))).slice(0, 3)
      .map(k => ({ type: 'weapon', key: k, level: 1, isNew: true, gift: true }));
    if (!list.length) return;
    this.frozen = true;
    audio.play('gift');
    this.burst(this.player.x, this.player.y, 0x7ad0f4, 30, 200);
    this.time.delayedCall(10, () => {
      this.scene.pause();
      this.ui.showLevelUp(list, { title: 'A GIFT!', sub: 'Pick a free weapon', noReroll: true });
    });
  }

  // Everything a level-up card could offer right now
  upgradePool() {
    const pool = [];
    const owned = new Set(this.weapons.map(w => w.key));
    for (const w of this.weapons) if (w.level < this.weaponMax(w.key)) pool.push({ type: 'weapon', key: w.key, cur: w.level, max: this.weaponMax(w.key) });
    for (const k of this.passiveOrder) if (this.passives[k] < this.passiveMax(k)) pool.push({ type: 'passive', key: k, cur: this.passives[k], max: this.passiveMax(k) });
    if (this.weapons.length < this.weaponSlots) for (const k of this.poolWeapons()) if (!owned.has(k)) pool.push({ type: 'weapon', key: k, cur: 0, max: this.weaponMax(k), isNew: true });
    if (this.passiveOrder.length < this.passiveSlots) for (const k of Object.keys(PASSIVES)) if (!this.passives[k]) pool.push({ type: 'passive', key: k, cur: 0, max: this.passiveMax(k), isNew: true });
    return pool;
  }

  makeChoices() {
    const pool = shuffle(this.upgradePool());
    const out = pool.slice(0, 3).map(c => this.rollRarity(c));
    if (!out.length) return [{ type: 'heal' }, { type: 'coins' }];
    return out;
  }

  // Cards can come up Rare, Epic or Legendary for a bigger stat boost (still one level)
  rollRarity(c) {
    const ch = BAL.rarityChances || [1, 0, 0, 0];
    let r = Math.random(), ri = 0;
    for (let i = ch.length - 1; i > 0; i--) {
      const above = ch.slice(i).reduce((a, b) => a + b, 0);
      if (r < above) { ri = i; break; }
    }
    if (c.type === 'passive' && wholeEffect(PASSIVES[c.key].effect) && ri < 3) ri = 0;
    c.rarity = ri;
    c.mult = RARITIES[ri].mult;
    c.level = c.cur + 1;
    return c;
  }

  rerollChoices() {
    if (this.rerolls <= 0) return null;
    this.rerolls--;
    return this.makeChoices();
  }

  // Weapon or passive part of a card (also used by treasure chests)
  applyUpgrade(c) {
    const mult = c.mult || 1;
    if (c.rarity === 3) bump('legendary');
    if (c.type === 'weapon') {
      let w = this.weapons.find(x => x.key === c.key);
      if (w) w.level++; else w = this.addWeapon(c.key);
      if (mult > 1) {
        w.boost = (w.boost || 0) + (mult - 1);
        // Legendary doubles this level's extra attacks too
        const cs = WEAPONS[c.key].stats?.count;
        if (c.rarity === 3 && cs && (cs.at || []).includes(w.level)) w.bonusCount = (w.bonusCount || 0) + 1;
        if (c.rarity === 3) w.legendary = true;
      }
    } else if (c.type === 'passive') {
      if (!this.passives[c.key]) { this.passives[c.key] = 0; this.passivePts[c.key] = 0; this.passiveOrder.push(c.key); }
      this.passives[c.key]++;
      this.passivePts[c.key] += mult;
      if (PASSIVES[c.key].effect === 'hearts') { this.recomputeStats(); this.player.hearts = Math.min(this.player.maxHearts, this.player.hearts + Math.round(mult)); }
    }
    if (c.type === 'weapon') this.checkCombos();
  }

  applyChoice(c) {
    if (c.type === 'weapon' || c.type === 'passive') this.applyUpgrade(c);
    else if (c.type === 'heal') {
      this.player.hearts = this.player.maxHearts;
    } else if (c.type === 'coins') {
      this.coins += 25;
    }
    this.recomputeStats();
    if (c.rarity >= 2) {
      audio.play('gift');
      this.burst(this.player.x, this.player.y, RARITIES[c.rarity].color, 40, 260);
      this.ringFx(this.player.x, this.player.y, 140, RARITIES[c.rarity].color);
    }
    if (!c.gift) this.pendingLevels--;
    if (this.pendingLevels > 0 && !c.gift) {
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
      if (d && sum[d.effect] !== undefined) sum[d.effect] += d.amount * (this.passivePts[k] ?? lvl);
    }
    const ch = this.charDef;
    const m = this.meta, mods = this.mods;
    this.stats.dmg = (1 + sum.damage + m.damage) * this.powerMul * mods.dmg * (ch.dmgMul || 1);
    this.stats.area = (1 + sum.area) * (ch.areaMul || 1);
    this.stats.count = Math.round(sum.count) + this.bonusCount;
    this.stats.pickup = BAL.pickupRange * (1 + sum.pickup + m.pickup);
    this.stats.speed = BAL.playerSpeed * (ch.speed || 1) * (1 + sum.speed + m.speed) * mods.speed * this.speedMul;
    const baseHearts = Math.max(1, Math.ceil(((ch.hearts || 5) + m.hearts) * mods.hearts));
    this.player.maxHearts = Math.max(1, baseHearts + Math.round(sum.hearts) + this.bonusHearts - this.lostHearts);
    this.player.hearts = Math.min(this.player.hearts, this.player.maxHearts);
  }

  // ------------------------------------------------------------------
  // Boss
  canSummon() { return !this.boss && !this.bossDead && !this.over; }

  // Summoning the boss early is riskier, so it pays more
  currentLootMul() {
    const top = BAL.earlyLoot || 1;
    if (this.policeMode || this.ageTime >= this.ageLen) return 1;
    return Math.round((1 + (top - 1) * (1 - this.ageTime / this.ageLen)) * 10) / 10;
  }

  summonBoss() {
    if (!this.canSummon()) return;
    const p = this.player;
    const e = this.spawnEnemy(this.age.boss, 0, -360);
    e.ai = { state: 'walk', t: 2.5, n: 0, style: this.age.bossStyle || '', fast: 1, dashMul: this.age.bossStyle === 'train' ? 1.2 : 1 };
    e.vx = 0; e.vy = 0;
    this.boss = e;
    this.bossSummoned = true;
    this.bossHits = 0;
    this.braveSummon = this.ageTime < 60;
    this.lootMul = this.currentLootMul();
    this.setDarkness(true);
    this.ui.banner(`${this.age.bossName}!`, this.lootMul > 1 ? `Early summon: loot x${this.lootMul}` : 'Dodge the red zones', 2200, '#d83c3c');
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
    if (d > 900 && !b.flying) { b.x = p.x - (dx / d) * 450; b.y = p.y - (dy / d) * 450; }
    // Rooted bosses (Hydra) grow angrier at half health
    if (ai.style === 'rooted' && !ai.enraged && b.hp < b.maxHp / 2) {
      ai.enraged = true; ai.fast = 0.55;
      this.ui.banner('TWO MORE HEADS!', 'It attacks faster', 1800, '#3ab8a4');
      audio.play('roar'); this.shake(300, 0.01);
    }
    // The Steam Mech overheats twice: it stops and takes double damage for a moment
    if (ai.style === 'mech') {
      ai.heat = ai.heat || [0.66, 0.33];
      if (ai.heat.length && b.hp < b.maxHp * ai.heat[0] && ai.state !== 'overheat') {
        ai.heat.shift();
        ai.state = 'overheat'; ai.t = 3.5; b.vuln = true;
        this.clearHazards();
        this.ui.banner('OVERHEATED!', 'Hit it now for double damage!', 1800, '#ff9a4a');
        audio.play('steam');
      }
    }
    // Later bosses get angrier at half health
    const RAGE = { train: ['FULL STEAM AHEAD!', 'Faster, longer charges', '#ff9a4a'], chopper: ['LOCKED ON!', 'It fires more often', '#ffe060'], warp: ['SYSTEM OVERLOAD!', 'It attacks faster', '#f070ff'] };
    if (RAGE[ai.style] && !ai.enraged && b.hp < b.maxHp / 2) {
      ai.enraged = true; ai.fast = 0.6;
      if (ai.style === 'train') ai.dashMul = 1.45;
      const [title, sub, color] = RAGE[ai.style];
      this.ui.banner(title, sub, 1800, color);
      audio.play('roar'); this.shake(300, 0.01);
    }
    // The Hunter (T-Rex) gets faster as it gets hurt
    const hunt = ai.style === 'hunter' ? 1.4 + 0.8 * (1 - b.hp / b.maxHp) : 1;
    // Lift for flying bosses
    b.lift += ((b.flying ? 90 : ai.style === 'chopper' ? 46 : 0) - b.lift) * Math.min(1, dt * 4);
    b.spr.setAlpha(b.flying ? 0.75 : 1);
    switch (ai.state) {
      case 'walk':
        if (ai.style === 'rooted') {
          // Stays put; burrows over to you when you get too far
          b.vx = 0; b.vy = 0;
          if (d > 380 && ai.t > 0.4) { this.bossBurrow(b); break; }
        } else if (ai.style === 'chopper') {
          // Keeps its distance and circles you
          const away = d > 300 ? 1 : d < 220 ? -1 : 0;
          b.vx = ((dx / d) * away - (dy / d) * 0.8) * b.speed; b.vy = ((dy / d) * away + (dx / d) * 0.8) * b.speed;
        } else if (ai.style === 'warp') { b.vx = (dx / d) * b.speed * 0.6; b.vy = (dy / d) * b.speed * 0.6; }
        else { b.vx = (dx / d) * b.speed * hunt; b.vy = (dy / d) * b.speed * hunt; }
        if (ai.style === 'train' && Math.random() < 0.15) this.burst(b.x, b.y - 110, 0xd0d0d8, 1, 50);
        if (ai.t <= 0) this.bossAttack(b);
        break;
      case 'burrow':
        b.vx = 0; b.vy = 0;
        if (ai.t <= 0) {
          b.x = ai.tx; b.y = ai.ty;
          b.spr.setVisible(true); b.shadow.setVisible(true); b.flying = false;
          this.burst(b.x, b.y, 0x8a6a3a, 30, 200); this.shake(200, 0.01); audio.play('thud');
          ai.state = 'rest'; ai.t = 0.6;
        }
        break;
      case 'fly':
        // High in the air: can't be hit, its shadow follows you
        b.vx = (dx / d) * Math.min(260, d * 2); b.vy = (dy / d) * Math.min(260, d * 2);
        if (Math.random() < 0.2) this.burst(b.x, b.y - 90, 0xff7a2a, 1, 40);
        if (ai.t <= 0) {
          ai.state = 'dive'; ai.t = 0.9;
          ai.tx = p.x; ai.ty = p.y;
          this.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 100, t: 0.9, color: 0xff7a2a });
        }
        break;
      case 'dive':
        b.vx = (ai.tx - b.x) * 3; b.vy = (ai.ty - b.y) * 3;
        if (ai.t <= 0) {
          b.flying = false; b.x = ai.tx; b.y = ai.ty;
          this.shake(300, 0.014); this.ringFx(b.x, b.y, 100, 0xff7a2a); this.burst(b.x, b.y, 0xff7a2a, 30, 220);
          audio.play('thud');
          ai.state = 'rest'; ai.t = 1.0;
        }
        break;
      case 'windup':
        b.vx = 0; b.vy = 0;
        b.spr.x = b.x + Math.sin(this.totalTime * 60) * 2;
        if (ai.t <= 0) ai.onWindup();
        break;
      case 'dash':
        b.vx = ai.dx * 520 * (ai.dashMul || 1); b.vy = ai.dy * 520 * (ai.dashMul || 1);
        if (Math.random() < 0.5) this.burst(b.x, b.y, 0x8a6a3a, 1, 60);
        if (ai.t <= 0) {
          // Chained charges: aim again right away
          if (ai.chain > 0) { ai.chain--; this.bossCharge(b, 0.5); }
          else { ai.state = 'walk'; ai.t = 1.6 * ai.fast; }
        }
        break;
      case 'rest':
        b.vx = 0; b.vy = 0;
        if (ai.t <= 0) { ai.state = 'walk'; ai.t = 1.8 * ai.fast; }
        break;
      case 'overheat':
        b.vx = 0; b.vy = 0;
        if (Math.random() < 0.5) this.burst(b.x + rand(-30, 30), b.y - 60, 0xe8e8f0, 2, 80);
        b.spr.setTint(Math.floor(this.totalTime * 10) % 2 ? 0xff8060 : 0xffffff);
        if (ai.t <= 0) { b.vuln = false; b.spr.clearTint(); ai.state = 'walk'; ai.t = 1.2; }
        break;
    }
  }

  bossCharge(b, windup = 0.9) {
    const ai = b.ai, p = this.player;
    const ang = Math.atan2(p.y - b.y, p.x - b.x);
    ai.state = 'windup'; ai.t = windup;
    this.addHazard({ kind: 'line', x: b.x, y: b.y, ang, len: 620, w: 70, t: windup, telegraphOnly: true });
    ai.onWindup = () => { ai.state = 'dash'; ai.t = 1.0; ai.dx = Math.cos(ang); ai.dy = Math.sin(ang); audio.play('roar'); };
  }

  // Rooted boss sinks into the ground and comes up near you
  bossBurrow(b) {
    const ai = b.ai, p = this.player;
    const a = rand(0, TAU);
    ai.tx = p.x + Math.cos(a) * 200; ai.ty = p.y + Math.sin(a) * 200;
    ai.state = 'burrow'; ai.t = 1.0;
    b.flying = true; // can't be hit while underground
    b.spr.setVisible(false); b.shadow.setVisible(false);
    this.burst(b.x, b.y, 0x8a6a3a, 20, 160);
    this.addHazard({ kind: 'circle', x: ai.tx, y: ai.ty, r: 90, t: 1.0, color: 0x3ab8a4 });
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
    } else if (choice === 'charge3') {
      ai.chain = 2;
      this.bossCharge(b, 0.8);
    } else if (choice === 'roar') {
      // Roar: a shockwave that slows you, and the pack answers
      ai.state = 'windup'; ai.t = 0.7;
      this.addHazard({ kind: 'circle', x: b.x, y: b.y, r: 260, t: 0.7, follow: b, telegraphOnly: true, color: 0xffe06a });
      ai.onWindup = () => {
        ai.state = 'rest'; ai.t = 0.6;
        audio.play('roar'); this.shake(350, 0.012); this.ringFx(b.x, b.y, 260, 0xffe06a);
        if (Math.hypot(p.x - b.x, p.y - b.y) < 260) { this.player.slowT = 2; this.floatText(p.x, p.y - 30, 'SLOWED!', '#ffe06a'); }
        const pack = this.age.basic && this.age.basic.length ? this.age.basic : [this.age.medium];
        for (let i = 0; i < 4; i++) { const a = rand(0, TAU); this.spawnEnemy(pick(pack), Math.cos(a) * 320, Math.sin(a) * 320); }
      };
    } else if (choice === 'ring') {
      // Poison ring around you: stay in the middle or dash through
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * TAU;
        this.addHazard({ kind: 'circle', x: p.x + Math.cos(a) * 160, y: p.y + Math.sin(a) * 160, r: 46, t: 1.0, persist: 4, color: 0x6ad04a });
      }
      ai.state = 'rest'; ai.t = 0.6; audio.play('roar');
    } else if (choice === 'fly') {
      ai.state = 'fly'; ai.t = 3.0;
      b.flying = true;
      this.ui.banner('IT TAKES FLIGHT!', 'Watch for where it lands', 1400, '#ff9a4a');
      audio.play('roar');
    } else if (choice === 'sweep') {
      // Fire breath that sweeps across
      ai.state = 'windup'; ai.t = 1.6;
      const dir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 8; i++) {
        this.addHazard({ kind: 'line', x: b.x, y: b.y - 20, ang: ang + dir * (-1 + i * 0.28), len: 380, w: 44, t: 0.7 + i * 0.12, color: 0xff7a2a, flash: 0xffc848 });
      }
      ai.onWindup = () => { ai.state = 'rest'; ai.t = 0.5; };
      audio.play('roar');
    } else if (choice === 'steam') {
      // Steam vents: rings of scalding steam roll outward. Stand between them.
      ai.state = 'windup'; ai.t = 1.8;
      for (let i = 0; i < 3; i++) this.addHazard({ kind: 'ring', x: b.x, y: b.y, r: 90 + i * 90, w: 44, t: 0.9 + i * 0.45, color: 0xd0e8f0 });
      ai.onWindup = () => { ai.state = 'rest'; ai.t = 0.4; };
      audio.play('steam');
    } else if (choice === 'laser') {
      // Eye laser that sweeps across
      ai.state = 'windup'; ai.t = 1.9;
      const dir = Math.random() < 0.5 ? 1 : -1;
      for (let i = 0; i < 10; i++) {
        this.addHazard({ kind: 'line', x: b.x, y: b.y - 40, ang: ang + dir * (-1.2 + i * 0.26), len: 470, w: 34, t: 0.8 + i * 0.1, color: 0xff4a3a, flash: 0xffd0c0 });
      }
      ai.onWindup = () => { ai.state = 'rest'; ai.t = 0.5; };
      audio.play('zap');
    } else if (choice === 'cogs') {
      for (let i = 0; i < 7; i++) {
        const x = p.x + rand(-170, 170), y = p.y + rand(-170, 170);
        this.addHazard({ kind: 'circle', x, y, r: 46, t: 1.0 + i * 0.13, rock: true, icon: 'cogicon', color: 0xc8923a });
      }
      this.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 46, t: 1.0, rock: true, icon: 'cogicon', color: 0xc8923a });
      ai.state = 'rest'; ai.t = 0.9; audio.play('roar');
    } else if (choice === 'smoke') {
      // Clouds of choking smoke that hang around
      for (let i = 0; i < 5; i++) {
        const x = p.x + rand(-160, 160), y = p.y + rand(-160, 160);
        this.addHazard({ kind: 'circle', x, y, r: 56, t: 1.0, persist: 4, color: 0x6a6a74 });
      }
      this.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 56, t: 1.0, persist: 4, color: 0x6a6a74 });
      ai.state = 'rest'; ai.t = 0.6; audio.play('steam');
    } else if (choice === 'coal') {
      for (let i = 0; i < 7; i++) {
        const x = p.x + rand(-170, 170), y = p.y + rand(-170, 170);
        this.addHazard({ kind: 'circle', x, y, r: 46, t: 1.0 + i * 0.13, rock: true, icon: 'coalicon', color: 0x3a3a40 });
      }
      this.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 46, t: 1.0, rock: true, icon: 'coalicon', color: 0x3a3a40 });
      ai.state = 'rest'; ai.t = 0.9; audio.play('roar');
    } else if (choice === 'missiles') {
      for (let i = 0; i < 6; i++) {
        const x = p.x + rand(-150, 150), y = p.y + rand(-150, 150);
        this.addHazard({ kind: 'circle', x, y, r: 48, t: 1.0 + i * 0.15, rock: true, icon: 'missile', color: 0xff6a3a });
      }
      this.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 48, t: 1.0, rock: true, icon: 'missile', color: 0xff6a3a });
      ai.state = 'rest'; ai.t = 0.8; audio.play('zap');
    } else if (choice === 'strafe') {
      // A line of gunfire walks toward you
      ai.state = 'windup'; ai.t = 1.5;
      for (let i = 0; i < 10; i++) {
        const dd = 50 + i * 46;
        this.addHazard({ kind: 'circle', x: b.x + Math.cos(ang) * dd, y: b.y + Math.sin(ang) * dd, r: 30, t: 0.7 + i * 0.07, color: 0xffe060 });
      }
      ai.onWindup = () => { ai.state = 'rest'; ai.t = 0.4; };
      audio.play('zap');
    } else if (choice === 'orbital') {
      // Orbital strikes: big circles of light from the sky
      for (let i = 0; i < 3; i++) {
        const a = rand(0, TAU);
        this.addHazard({ kind: 'circle', x: p.x + Math.cos(a) * 170, y: p.y + Math.sin(a) * 170, r: 120, t: 1.5 + i * 0.2, color: 0x5af0ff });
      }
      this.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 110, t: 1.6, color: 0x5af0ff });
      ai.state = 'rest'; ai.t = 1.2; audio.play('zap');
    } else if (choice === 'grid') {
      // Laser grid: find a gap between the lines
      ai.state = 'windup'; ai.t = 1.6;
      for (const off of [-150, 0, 150]) {
        this.addHazard({ kind: 'line', x: p.x - 420, y: p.y + off, ang: 0, len: 840, w: 40, t: 1.4, color: 0xf070ff, flash: 0xffd0ff });
        this.addHazard({ kind: 'line', x: p.x + off + 75, y: p.y - 420, ang: Math.PI / 2, len: 840, w: 40, t: 1.4, color: 0xf070ff, flash: 0xffd0ff });
      }
      ai.onWindup = () => { ai.state = 'rest'; ai.t = 0.5; };
      audio.play('zap');
    } else if (choice === 'blink') {
      // Teleports and lands right next to you
      const a = rand(0, TAU);
      const tx = p.x + Math.cos(a) * 120, ty = p.y + Math.sin(a) * 120;
      ai.state = 'windup'; ai.t = 0.9;
      this.addHazard({ kind: 'circle', x: tx, y: ty, r: 120, t: 0.9, color: 0xf070ff });
      ai.onWindup = () => {
        this.burst(b.x, b.y, 0xf070ff, 24, 200);
        b.x = tx; b.y = ty;
        this.burst(b.x, b.y, 0x5af0ff, 30, 220); this.ringFx(b.x, b.y, 120, 0xf070ff);
        ai.state = 'rest'; ai.t = 0.7; audio.play('zap');
      };
    } else if (choice === 'breath') {
      ai.state = 'windup'; ai.t = 1.0;
      for (let i = -2; i <= 2; i++) this.addHazard({ kind: 'line', x: b.x, y: b.y - 20, ang: ang + i * 0.26, len: 400, w: 46, t: 1.0, color: 0xff7a2a, flash: 0xffc848 });
      ai.onWindup = () => { ai.state = 'rest'; ai.t = 0.7; audio.play('roar'); this.shake(200, 0.01); };
    } else if (choice === 'meteors') {
      for (let i = 0; i < 6; i++) {
        const x = p.x + rand(-160, 160), y = p.y + rand(-160, 160);
        this.addHazard({ kind: 'circle', x, y, r: 50, t: 1.1 + i * 0.15, rock: true, burn: true, color: 0xff7a2a });
      }
      this.addHazard({ kind: 'circle', x: p.x, y: p.y, r: 50, t: 1.0, rock: true, burn: true, color: 0xff7a2a });
      ai.state = 'rest'; ai.t = 0.9; audio.play('roar');
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
      if (h.owner && !h.owner.alive) { h.g.destroy(); this.hazards.splice(i, 1); continue; }
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
        } else if (h.kind === 'ring') {
          g.lineStyle(h.w, col, pulse).strokeCircle(h.x, h.y, h.r);
          g.lineStyle(h.w * prog, col, 0.4).strokeCircle(h.x, h.y, h.r);
        } else {
          const ex = h.x + Math.cos(h.ang) * h.len, ey = h.y + Math.sin(h.ang) * h.len;
          g.lineStyle(h.w, col, pulse).lineBetween(h.x, h.y, ex, ey);
          g.lineStyle(h.w * prog, col, 0.35).lineBetween(h.x, h.y, ex, ey);
        }
        if (h.t <= 0) {
          h.fired = true;
          if (h.rock) {
            g.clear();
            this.dropRock(h.x, h.y, h.r, h.icon || (h.burn ? 'flame' : 'rock'), () => {
              if (Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r) this.hurtPlayer(1);
              if (h.hitsEnemies) this.query(h.x, h.y, h.r, (e) => { if (!e.boss && !e.thief) this.hitEnemy(e, 30, h.x, h.y, 220); });
              if (h.burn && this.boss) this.addHazard({ kind: 'circle', x: h.x, y: h.y, r: h.r * 0.9, t: 0.01, persist: 3, color: 0xff7a2a });
            }, 0xff6060);
            h.dead = true;
          } else if (h.kind === 'circle') {
            if (!h.telegraphOnly && Math.hypot(p.x - h.x, p.y - h.y) < h.r + p.r) this.hurtPlayer(1);
            if (!h.persist) h.dead = true; else h.life = h.persist;
          } else if (h.kind === 'ring') {
            if (Math.abs(Math.hypot(p.x - h.x, p.y - h.y) - h.r) < h.w / 2 + p.r) this.hurtPlayer(1);
            this.ringFx(h.x, h.y, h.r, 0xffffff);
            h.dead = true;
          } else {
            const ex = h.x + Math.cos(h.ang) * h.len, ey = h.y + Math.sin(h.ang) * h.len;
            if (!h.telegraphOnly && distToSeg(p.x, p.y, h.x, h.y, ex, ey) < h.w / 2 + p.r) this.hurtPlayer(1);
            if (!h.telegraphOnly) {
              const f = this.add.graphics().setDepth(1e7 + 3);
              f.lineStyle(h.w * 0.7, h.flash || 0x3ab8a4, 1).lineBetween(h.x, h.y, ex, ey);
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
    this.endEvent(true);
    if (this.bossHits === 0) bump('flawless');
    if (this.braveSummon) bump('brave');
    buzz(200);
    const lm = this.lootMul || 1;
    if (Math.random() < (BAL.bossTreasureChance ?? 0.25)) this.dropTreasure(b.x - 30, b.y + 10);
    for (let i = 0; i < Math.round(12 * lm); i++) this.dropPickup('coin', b.x + rand(-50, 50), b.y + rand(-50, 50), 2);
    this.dropPickup('chest', b.x, b.y, lm);
    this.dropPickup('spark', b.x + 20, b.y - 10, Math.round((BAL.sparkBoss ?? 20) * lm));
    if (lm > 1) this.ui.banner(`LOOT x${lm}`, 'Bonus for summoning early', 1600, '#f2c84b');
    // Everything flies to you
    this.time.delayedCall(900, () => { for (const k of this.pickups) { k.fly = true; k.v = 150; } });

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
          : `${this.age.bossName} defeated! You beat every age.\nNext run, beat it again to go endless\nor loop back with the Magic Mirror.`,
      }));
      this.ui.banner(`${this.age.bossName} DEFEATED!`, 'First victory!', 2400, '#f2c84b');
    } else if (next) {
      this.ui.banner(`${this.age.bossName} DEFEATED!`, 'A portal opens...', 2400, '#f2c84b');
      this.time.delayedCall(1500, () => this.openPortal());
    } else {
      // Last age: endless from here, and the wizard sells a Magic Mirror to loop back in time
      this.ui.banner('ENDLESS', 'Survive, or buy the Magic Mirror\nfrom the wizard to loop back in time', 3000, '#7ad0f4');
      this.endless = true;
      this.finalShop = true;
      this.time.delayedCall(1500, () => this.openPortal(true));
      this.time.delayedCall(2500, () => { this.cleared = false; this.policeMode = true; this.policeAcc = 0; audio.playMusic('police'); });
    }
  }

  // ------------------------------------------------------------------
  // Portal and wizard shop
  // locked: only the wizard shows up; the portal opens when the Magic Mirror is bought
  openPortal(locked = false) {
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
    this.portal = { x, y, spr: portal, glow, wiz, label, shopReady: true, entering: false, locked };
    if (locked) {
      this.tweens.killTweensOf([portal, glow]);
      portal.setVisible(false); glow.setVisible(false);
      this.tweens.add({ targets: glow, alpha: 0.2, yoyo: true, repeat: -1, duration: 600 });
    }
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
      if (!this.shopItems) { this.shopItems = this.makeShop(); this.shopRerolls = 0; }
      this.ui.showShop(this.shopItems);
    } else if (dw > 90) pt.shopReady = true;
    if (!pt.locked && Math.hypot(p.x - pt.x, p.y - pt.y) < 30) this.enterPortal();
  }

  // Three normal items and one rare one
  makeShop() {
    const canUp = this.weapons.some(w => w.level < this.weaponMax(w.key));
    const items = SHOP_ITEMS.filter(it => (it.id !== 'weapon' || this.weapons.length < this.weaponSlots) && (it.id !== 'upgrade' || canUp)
      && (it.id !== 'rabbit' || this.player.maxHearts > 1));
    const priced = (it) => ({ ...it, cost: Math.round(it.cost * (BAL.shopPriceMul ?? 5) * (1 + this.ageIndex * 0.25)) });
    const out = shuffle(items.slice()).slice(0, 3).map(priced);
    const rares = (RARE_ITEMS || []).filter(it => (it.id !== 'crystal' || canUp) && (it.id !== 'firegem' || !this.fireGem));
    // After the last boss the wizard always has the Magic Mirror
    if (this.finalShop && CFG.mirror) out.push({ ...priced(CFG.mirror), rare: true });
    else if (rares.length) out.push({ ...priced(pick(rares)), rare: true });
    return out;
  }

  shopRerollCost() {
    return (CFG.shopRerollCost || 10) * (1 + (this.shopRerolls || 0));
  }

  rerollShop() {
    const cost = this.shopRerollCost();
    if (this.coins < cost || (this.shopItems || []).some(it => it.sold)) return null;
    this.coins -= cost;
    this.shopRerolls = (this.shopRerolls || 0) + 1;
    return this.makeShop();
  }

  // Confusion Potion: every weapon becomes a different random one at the same level
  confuseWeapons() {
    const old = this.weapons;
    const pool = shuffle(this.poolWeapons().filter(k => !old.some(w => w.key === k)).concat(old.map(w => w.key).filter(k => !WEAPONS[k].signature)));
    this.weapons = [];
    const used = new Set();
    for (const w of old) {
      // A character's own weapon stays theirs
      if (WEAPONS[w.key].signature) { this.weapons.push(w); continue; }
      w.sprites.forEach(sp => sp.destroy());
      if (w.ring) w.ring.destroy();
      const k = pool.find(x => !used.has(x) && x !== w.key) || pool.find(x => !used.has(x));
      used.add(k);
      const nw = this.addWeapon(k);
      Object.assign(nw, { level: Math.min(w.level, this.weaponMax(k)), boost: w.boost, dmgMul: w.dmgMul, bonusCount: w.bonusCount, legendary: w.legendary });
    }
  }

  upgradableWeapons() {
    return this.weapons.filter(w => w.level < this.weaponMax(w.key));
  }

  buyItem(it, choice) {
    if (this.coins < it.cost) return false;
    const p = this.player;
    switch (it.id) {
      case 'potion': p.hearts = Math.min(p.maxHearts, p.hearts + 2); break;
      case 'heartmax': this.bonusHearts++; this.recomputeStats(); p.hearts = p.maxHearts; break;
      case 'upgrade': {
        const opts = this.upgradableWeapons();
        if (!opts.length) return false;
        const w = opts.find(x => x.key === choice) || pick(opts);
        w.level++;
        it.result = `${WEAPONS[w.key].name} is now level ${w.level}`;
        break;
      }
      case 'crystal': {
        const opts = this.upgradableWeapons();
        if (!opts.length) return false;
        opts.forEach(w => w.level++);
        it.result = 'All your weapons leveled up!';
        break;
      }
      case 'phoenix': this.revives++; it.result = 'You will come back once'; break;
      case 'idol': this.bonusCount++; this.recomputeStats(); it.result = '+1 attack for every weapon'; break;
      case 'sparkjar': this.sparks += 10; it.result = '+10 Sparks'; break;
      case 'firegem': this.fireGem = true; it.result = 'Your attacks now burn!'; break;
      case 'rabbit': {
        if (p.maxHearts <= 1) return false;
        this.speedMul *= 1.3; this.lostHearts++; this.recomputeStats();
        it.result = 'Faster, but one heart lighter';
        break;
      }
      case 'confusion': this.confuseWeapons(); this.checkCombos(); it.result = 'Your weapons changed!'; break;
      case 'mirror': {
        if (!this.portal) return false;
        this.portal.locked = false;
        this.portal.spr.setVisible(true); this.portal.glow.setVisible(true);
        this.tweens.add({ targets: this.portal.spr, scale: 2.2, duration: 700, ease: 'Back.out' });
        this.tweens.add({ targets: this.portal.glow, scale: 2.8, duration: 700, ease: 'Back.out' });
        audio.play('portal');
        it.result = 'The mirror opens a portal to the past!';
        break;
      }
      case 'weapon': {
        const owned = new Set(this.weapons.map(w => w.key));
        const opts = this.poolWeapons().filter(k => !owned.has(k));
        if (!opts.length || this.weapons.length >= this.weaponSlots) return false;
        const k = pick(opts); this.addWeapon(k);
        this.checkCombos();
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
          this.shopItems = null;
          for (const k of this.pickups) { if (k.kind === 'gem') this.addXp(k.value); k.spr.destroy(); }
          this.pickups = [];
          // The Magic Mirror loops back to the first age, with tougher enemies
          let next = this.ageIndex + 1;
          if (next >= AGES.length || this.finalShop) { next = 0; this.loop++; this.finalShop = false; bump('loops'); }
          this.startAge(next);
          p.spr.setScale(this.charDef.scale || 1.5).setAngle(0);
          this.player.inv = 1.5;
          this.frozen = false;
          const cap = WEAPONS[this.weapons[0].key] ? this.weaponMax(this.weapons[0].key) : 0;
          if (this.loop && next === 0) this.ui.banner(`LOOP ${this.loop + 1}`, `Back to the ${this.age.name.toLowerCase()}. Tougher enemies.\nWeapons can now reach level ${cap}`, 3200, '#c890ff');
          else this.ui.banner(this.age.name, `Weapons can now reach level ${cap}`, 3000, '#e8c070');
        });
      },
    });
  }

  // ------------------------------------------------------------------
  // Treasure chests only hold relics, so they only drop while an unlocked relic is still to be found
  relicsLeft() { return RELICS.filter(r => save.relics[r.id] && !this.relics.has(r.id)); }

  dropTreasure(x, y) {
    const onGround = this.pickups.filter(k => k.kind === 'treasure').length;
    if (onGround >= this.relicsLeft().length) return false;
    this.dropPickup('treasure', x, y);
    return true;
  }

  openTreasure() {
    if (this.over) return;
    // Two chests picked up at once: the second opens after the first
    if (this.chestOpen) { this.chestQueue = (this.chestQueue || 0) + 1; return; }
    const relics = this.relicsLeft();
    if (!relics.length) { this.leaveRelic(); return; }
    bump('chests');
    const relic = pick(relics);
    this.chestOpen = true;
    this.frozen = true;
    audio.play('chest');
    buzz(40);
    this.time.delayedCall(10, () => { this.scene.pause(); this.ui.showRelic(relic); });
  }

  takeRelic(id) {
    const p = this.player;
    this.relics.add(id);
    bump('relics');
    switch (id) {
      case 'excalibur': {
        const spr = this.add.image(0, 0, 'excalibur').setOrigin(0.05, 0.5).setDepth(1e7);
        const glow = this.add.image(0, 0, 'glow').setTint(0x8ad0ff).setAlpha(0.35).setBlendMode(Phaser.BlendModes.ADD).setDepth(1e7 - 1);
        this.sword = { spr, glow, ang: p.facing > 0 ? 0 : Math.PI };
        break;
      }
      case 'ark': {
        // Every weapon and slot gives way to the Ark, at the best level you had
        const best = Math.max(1, ...this.weapons.map(w => w.level));
        for (const w of this.weapons) { w.sprites.forEach(sp => sp.destroy()); if (w.ring) w.ring.destroy(); }
        this.weapons = [];
        this.combos = new Set();
        this.weaponSlots = 1;
        const w = this.addWeapon('ark');
        w.level = Math.min(best, this.weaponMax('ark'));
        this.cameras.main.flash(400, 255, 240, 180);
        break;
      }
    }
    p.hearts = Math.min(p.hearts, p.maxHearts);
  }

  // Leaving a relic behind still pays a little
  leaveRelic() {
    const c = 40 * (this.ageIndex + 1);
    this.coins += c; this.coinsEarned += c;
    this.floatText(this.player.x, this.player.y - 30, `+${c} COINS`, '#f2c84b');
  }

  closeTreasure() {
    this.frozen = false;
    this.chestOpen = false;
    this.player.inv = Math.max(this.player.inv, 0.6);
    this.scene.resume();
    if (this.chestQueue > 0) { this.chestQueue--; this.time.delayedCall(300, () => this.openTreasure()); }
  }

  // ------------------------------------------------------------------
  // Weapon combos: owning both weapons of a pair turns on a bonus
  comboWith(key) {
    const owned = new Set(this.weapons.map(w => baseWeapon(w.key)));
    key = baseWeapon(key);
    if (owned.has(key)) return null;
    return COMBOS.find(c => !this.combos.has(c.id) && ((c.a === key && owned.has(c.b)) || (c.b === key && owned.has(c.a))));
  }

  checkCombos() {
    const owned = new Set(this.weapons.map(w => baseWeapon(w.key)));
    for (const c of COMBOS) {
      const on = owned.has(c.a) && owned.has(c.b);
      if (on && !this.combos.has(c.id)) {
        this.combos.add(c.id);
        const st = stats();
        const found = !st.combos[c.id];
        st.combos[c.id] = true;
        if (this.ui && this.ui.ready) {
          this.time.delayedCall(300, () => {
            this.ui.banner(`${c.name.toUpperCase()}!`, `${found ? 'NEW COMBO! ' : 'COMBO: '}${c.blurb}`, 2600, '#ffc040');
            audio.play('combo');
          });
        }
      } else if (!on && this.combos.has(c.id)) this.combos.delete(c.id);
    }
  }

  // Sets an enemy on fire (bosses burn less)
  ignite(e, dps, t) {
    if (!e.alive) return;
    e.burnT = Math.max(e.burnT, t);
    e.burnDps = Math.max(e.burnDps, dps * (e.boss ? 0.4 : 1));
  }

  // ------------------------------------------------------------------
  // Random events: gold rush, eclipse, meteor shower, treasure thief
  startEvent(id = null) {
    const fresh = EVENTS.filter(e => !this.usedEvents.has(e.id));
    const ev = id ? EVENTS.find(e => e.id === id) : pick(fresh.length ? fresh : EVENTS);
    if (!ev) return;
    this.usedEvents.add(ev.id);
    this.event = { ...ev, t: BAL.eventLength || 20, total: BAL.eventLength || 20, acc: 0 };
    this.ui.banner(ev.name, ev.blurb, 2200, ev.color);
    audio.play('warn');
    if (ev.id === 'eclipse') this.setDarkness(true, false, 0.55);
    if (ev.id === 'thief') {
      const a = rand(0, TAU);
      const e = this.spawnEnemy('thief', Math.cos(a) * 230, Math.sin(a) * 230);
      e.mode = 'flee'; e.thief = true;
      e.hp = e.maxHp = (ENEMIES.thief ? ENEMIES.thief.hp : 60) * this.age.hpMul * 2 * this.loopMul();
      e.baseTint = 0xffe8a0; e.spr.setTint(e.baseTint);
      this.event.target = e;
      this.event.t = this.event.total = 15;
    }
  }

  endEvent(silent = false) {
    const ev = this.event;
    if (!ev) return;
    this.event = null;
    if (ev.id === 'eclipse' && !this.boss) this.setDarkness(false);
    if (ev.id === 'thief' && ev.target && ev.target.alive) {
      this.burst(ev.target.x, ev.target.y, 0x8a5ab0, 20, 160);
      this.removeEnemy(ev.target);
      if (!silent) this.ui.banner('HE GOT AWAY!', 'Maybe next time', 1500, '#a090b0');
    }
  }

  updateEvent(dt) {
    const ev = this.event;
    if (!ev) return;
    ev.t -= dt;
    if (this.boss || this.cleared || ev.t <= 0) { this.endEvent(); return; }
    if (ev.id === 'meteors') {
      ev.acc += dt;
      while (ev.acc >= 0.55) {
        ev.acc -= 0.55;
        const p = this.player;
        this.addHazard({ kind: 'circle', x: p.x + rand(-220, 220), y: p.y + rand(-280, 280), r: 46, t: 1.2, rock: true, hitsEnemies: true, color: 0xff9a4a });
      }
    }
  }

  // ------------------------------------------------------------------
  // Pet (Taka's baby raptor): runs to the nearest enemy and bites it
  makePet(key) {
    const p = this.player;
    const tex = ENEMIES[key] ? ENEMIES[key].sprite : key;
    if (!this.textures.exists(tex)) return;
    const spr = this.add.sprite(p.x - 30, p.y, tex, 0).setScale(1.15).setOrigin(0.5, 0.85).setTint(0xd8ffc8);
    const shadow = this.add.image(0, 0, 'shadow').setScale(1.1, 1).setDepth(-2e7);
    this.pet = { x: p.x - 30, y: p.y, spr, shadow, cd: 0, target: null, retarget: 0, anim: 0 };
  }

  updatePet(dt) {
    const pet = this.pet;
    if (!pet) return;
    const p = this.player;
    pet.cd -= dt;
    const tg = pet.target;
    if (!tg || !tg.alive || tg.flying || Math.hypot(tg.x - p.x, tg.y - p.y) > 320) {
      pet.target = null;
      pet.retarget -= dt;
      if (pet.retarget <= 0) { pet.retarget = 0.25; pet.target = this.nearestEnemy(260); }
    }
    let tx, ty, speed;
    if (pet.target) { tx = pet.target.x; ty = pet.target.y; speed = 280; }
    else { tx = p.x - p.facing * 34; ty = p.y + 8; speed = Math.max(this.stats.speed * 1.3, 180); }
    const dx = tx - pet.x, dy = ty - pet.y, d = Math.hypot(dx, dy);
    if (pet.target && d < pet.target.r + 12) {
      if (pet.cd <= 0) {
        pet.cd = 0.5;
        this.hitSrc = 'pet';
        this.hitEnemy(pet.target, 9 + this.level * 1.4, pet.x, pet.y, 140);
        this.hitSrc = null;
        pet.spr.setScale(1.4, 0.95);
      }
    } else if (d > 4) {
      const step = Math.min(d, speed * dt);
      pet.x += (dx / d) * step; pet.y += (dy / d) * step;
      if (Math.abs(dx) > 2) pet.spr.setFlipX(dx < 0);
    }
    if (Math.hypot(pet.x - p.x, pet.y - p.y) > 500) { pet.x = p.x - 30; pet.y = p.y; }
    pet.anim += dt * (d > 4 ? 10 : 3);
    const k = Math.min(1, dt * 10);
    pet.spr.setScale(pet.spr.scaleX + (1.15 - pet.spr.scaleX) * k, pet.spr.scaleY + (1.15 - pet.spr.scaleY) * k);
    pet.spr.setPosition(pet.x, pet.y).setFrame(Math.floor(pet.anim) % 2).setDepth(pet.y);
    pet.shadow.setPosition(pet.x, pet.y + 2);
  }

  // ------------------------------------------------------------------
  // Quests: a note pops up the moment one is done
  checkQuests(quiet = false) {
    best('bestTime', this.totalTime); best('bestLevel', this.level); best('bestCoins', this.coinsEarned);
    for (const q of allQuests()) {
      if (this.questsDone.has(q.id) || !isDone(q)) continue;
      this.questsDone.add(q.id);
      this.newQuests.push(q);
      if (!quiet) { this.ui.toast(`QUEST DONE: ${q.name.toUpperCase()}`, `+${q.reward} Sparks to claim on the menu`); audio.play('quest'); }
    }
  }

  // ------------------------------------------------------------------
  // First-run tips
  updateTutorial(dt) {
    const tut = this.tut;
    if (!tut || !this.ui || !this.ui.ready) return;
    tut.t += dt;
    if (this.player.moving) tut.moved += dt;
    const steps = [
      { text: 'DRAG ANYWHERE TO MOVE\n(OR USE WASD / ARROW KEYS)', done: () => tut.moved > 0.8 },
      { text: 'YOUR WEAPON ATTACKS ON ITS OWN.\nJUST STAY AWAY FROM ENEMIES!', done: () => tut.t > 4.5 },
      { text: 'GRAB THE GEMS THEY DROP\nTO LEVEL UP', done: () => this.level >= 2 },
      { text: 'SUMMON THE BOSS WHEN YOU FEEL STRONG.\nEARLIER = BIGGER LOOT', done: () => tut.t > 7, arrow: 'summon' },
    ];
    const s = steps[tut.step];
    if (!s) {
      this.tut = null;
      save.tutorialDone = true; save.seenHint = true; persist();
      this.ui.hint(null);
      return;
    }
    if (tut.shown !== tut.step) { tut.shown = tut.step; this.ui.hint(s.text, s.arrow); }
    if (s.done()) { tut.step++; tut.t = 0; audio.play('select'); }
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

  spawnNumber(x, y, val, crit, color) {
    let n = this.numbers.find(q => !q.alive);
    if (!n) {
      if (this.numbers.length > 40) return;
      n = { txt: this.add.text(0, 0, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#120c18', strokeThickness: 3 }).setOrigin(0.5).setDepth(1e7 + 8) };
      this.numbers.push(n);
    }
    Object.assign(n, { alive: true, x: x + rand(-6, 6), y, life: 0.55, vy: -70 });
    n.txt.setVisible(true).setText(String(val)).setColor(color || (crit ? '#ffd040' : '#ffffff')).setFontSize(crit ? 12 : 8).setAlpha(1).setPosition(n.x, n.y);
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
    if (save.settings.shake === false) return;
    this.cameras.main.shake(ms, amt * 0.6);
  }

  // ------------------------------------------------------------------
  // Boss fights happen at night: darkness with firelight and glowing eyes
  setDarkness(on, instant = false, amount = null) {
    this.darkTarget = on ? (amount ?? BAL.bossDarkness) : 0;
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
        const flat = key === 'fern' || key === 'bones' || key === 'rails';
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
