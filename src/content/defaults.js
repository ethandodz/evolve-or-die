// Default game content. Everything here can be changed in the editor (editor.html).
// The editor saves changes on top of these defaults; see config.js.

export const DEFAULT_CONFIG = {
  version: 1,

  balance: {
    ageLength: 300,        // seconds until the time police arrive
    maxEnemies: 150,
    spawnBase: 1.1,        // enemies per second at the start of an age
    spawnGrowth: 0.03,     // extra enemies per second, per second
    crowdStart: 30,        // max enemies alive at the start of an age
    crowdGrowth: 0.6,      // extra allowed per second
    hpGrowth: 85,          // enemy HP doubles roughly every this many seconds
    playerSpeed: 140,
    pickupRange: 80,
    invincibility: 1.1,    // seconds of safety after a hit
    critChance: 0.08,
    coinChance: 0.09,
    meatChance: 0.012,
    magnetChance: 0.003,
    rerolls: 3,
    xpBase: 5, xpPer: 4, xpCurve: 1.5,
    miniBossHp: 6,
    stampedeSize: 26,
    bossDarkness: 0.75,    // how dark boss fights get (0 = off)
    weaponSlots: 3,
    passiveSlots: 3,
  },

  characters: [
    { key: 'caveman', name: 'GRUG', title: 'The Caveman', sprite: 'caveman', weapon: 'club', hearts: 5, speed: 1, unlock: 'start' },
    { key: 'hunter', name: 'ROKA', title: 'The Hunter', sprite: 'hunter', weapon: 'spear', hearts: 4, speed: 1.12, unlock: 'trex' },
    { key: 'shaman', name: 'ORA', title: 'The Shaman', sprite: 'shaman', weapon: 'fire', hearts: 4, speed: 1, unlock: 'hydra' },
  ],

  // stats: each value is base + per * (level - 1) + one for every level in "at" that is reached
  weapons: {
    club: {
      name: 'Club', icon: 'club', behavior: 'swing', kind: 'Melee', max: 7,
      blurb: 'Big swing in front of you. Knocks enemies back.',
      stats: { cd: { base: 1.0, per: -0.06 }, dmg: { base: 14, per: 6 }, radius: { base: 78, per: 6 }, count: { base: 1, at: [3, 6] }, knockback: { base: 260 } },
      levels: ['', '+6 damage', '+1 swing', 'Faster, +6 damage', 'Bigger swing, +6 damage', '+1 swing', 'Faster, +6 damage'],
    },
    axes: {
      name: 'Orbiting Axes', icon: 'axe', behavior: 'orbit', kind: 'Orbit', max: 7,
      blurb: 'Stone axes circle around you.',
      stats: { dmg: { base: 8, per: 4 }, radius: { base: 64, per: 5 }, count: { base: 2, at: [3, 5, 7] }, spin: { base: 3.4, per: 0.25 }, hitDelay: { base: 0.45 } },
      levels: ['', '+4 damage, faster', '+1 axe', '+4 damage, wider', '+1 axe', '+4 damage, faster', '+1 axe'],
    },
    spear: {
      name: 'Spear', icon: 'spear', behavior: 'thrust', kind: 'Melee', max: 7,
      blurb: 'Long thrust at the nearest enemy. Pierces.',
      stats: { cd: { base: 1.25, per: -0.07 }, dmg: { base: 22, per: 8 }, length: { base: 125, per: 10 }, count: { base: 1, at: [4, 7] } },
      levels: ['', '+8 damage, longer', 'Faster, +8 damage', '+1 spear', '+8 damage, longer', 'Faster, +8 damage', '+1 spear'],
    },
    fire: {
      name: 'Fire Ring', icon: 'flame', behavior: 'aura', kind: 'Aura', max: 7,
      blurb: 'Burns and slows enemies near you.',
      stats: { dmg: { base: 5, per: 2.5 }, radius: { base: 54, per: 7 }, tick: { base: 0.5, per: -0.02 }, slow: { base: 0.3, per: 0.03 } },
      levels: ['', '+2.5 damage, wider', '+2.5 damage, burns faster', '+2.5 damage, wider', '+2.5 damage, slows more', '+2.5 damage, wider', '+2.5 damage, burns faster'],
    },
    rocks: {
      name: 'Rock Fall', icon: 'rock', behavior: 'rockfall', kind: 'Area', max: 7,
      blurb: 'Boulders crash down on enemies.',
      stats: { cd: { base: 2.1, per: -0.1 }, dmg: { base: 26, per: 10 }, radius: { base: 36, per: 3 }, count: { base: 2, at: [2, 4, 6] } },
      levels: ['', '+10 damage, +1 rock', 'Faster, +10 damage', '+10 damage, +1 rock', 'Bigger, +10 damage', '+10 damage, +1 rock', 'Faster, +10 damage'],
    },
    bolt: {
      name: 'Sky Bolt', icon: 'bolt', behavior: 'lightning', kind: 'Area', max: 7,
      blurb: 'Lightning strikes enemies around you.',
      stats: { cd: { base: 1.7, per: -0.1 }, dmg: { base: 32, per: 10 }, radius: { base: 28, per: 2 }, count: { base: 1, at: [3, 5, 7] }, chain: { base: 0, at: [5, 5] }, range: { base: 270 } },
      levels: ['', '+10 damage, faster', '+1 bolt', '+10 damage, faster', '+1 bolt, bolts chain', '+10 damage, faster', '+1 bolt'],
    },
  },

  // effect: hearts | speed | count | damage | area | pickup. amount is per level.
  passives: {
    heart:   { name: 'Mammoth Heart', icon: 'heart', max: 5, effect: 'hearts', amount: 1, blurb: '+1 max heart and heal 1.' },
    sandals: { name: 'Swift Sandals', icon: 'sandal', max: 5, effect: 'speed', amount: 0.1, blurb: '+10% move speed.' },
    totem:   { name: 'Tribal Totem', icon: 'totem', max: 3, effect: 'count', amount: 1, blurb: '+1 attack for every weapon.' },
    flint:   { name: 'Sharp Flint', icon: 'flint', max: 5, effect: 'damage', amount: 0.12, blurb: '+12% damage.' },
    tusk:    { name: 'Giant Tusk', icon: 'tusk', max: 5, effect: 'area', amount: 0.1, blurb: '+10% area and range.' },
    magnet:  { name: 'Lodestone', icon: 'lodestone', max: 5, effect: 'pickup', amount: 0.35, blurb: '+35% XP pickup range.' },
  },

  // Fast enemies are fragile, slow ones are tanky. None of them shoot.
  // r = hit radius, scale = sprite size.
  enemies: {
    wolf:       { name: 'Wolf', sprite: 'wolf', hp: 7, speed: 92, r: 10, xp: 1, scale: 1.5, color: '#9a98a6' },
    rival:      { name: 'Rival caveman', sprite: 'rival', hp: 15, speed: 52, r: 11, xp: 1, scale: 1.5, color: '#c98a62' },
    raptor:     { name: 'Raptor', sprite: 'raptor', hp: 10, speed: 74, r: 11, xp: 1, scale: 1.5, color: '#b86a2a' },
    sabertooth: { name: 'Sabertooth', sprite: 'sabertooth', hp: 45, speed: 82, r: 12, xp: 5, scale: 1.6, color: '#e0a040' },
    mammoth:    { name: 'Mammoth', sprite: 'mammoth', hp: 220, speed: 34, r: 22, xp: 20, scale: 1.7, color: '#6a3a20', heavy: true },
    legionary:  { name: 'Legionary', sprite: 'legionary', hp: 16, speed: 54, r: 11, xp: 1, scale: 1.5, color: '#c8283a' },
    spearman:   { name: 'Spearman', sprite: 'spearman', hp: 11, speed: 72, r: 11, xp: 1, scale: 1.5, color: '#3a6ac8' },
    gladiator:  { name: 'Gladiator', sprite: 'gladiator', hp: 24, speed: 58, r: 11, xp: 1, scale: 1.55, color: '#d8a040' },
    centurion:  { name: 'Centurion', sprite: 'centurion', hp: 60, speed: 70, r: 12, xp: 5, scale: 1.6, color: '#d83c3c' },
    chariot:    { name: 'Chariot', sprite: 'chariot', hp: 240, speed: 50, r: 20, xp: 20, scale: 1.6, color: '#8a5a2e', heavy: true },
    timecop:    { name: 'Time police', sprite: 'timecop', hp: 90, speed: 96, r: 12, xp: 5, scale: 1.55, color: '#3a6ac8' },
    trex:       { name: 'T-Rex', sprite: 'trex', hp: 4200, speed: 46, r: 34, xp: 0, scale: 2.2, color: '#b86a2a', boss: true, heavy: true },
    hydra:      { name: 'Hydra', sprite: 'hydra', hp: 11000, speed: 34, r: 36, xp: 0, scale: 2.2, color: '#3ab8a4', boss: true, heavy: true },
  },

  ages: [
    {
      key: 'stone', name: 'STONE AGE', ground: 'cave', bg: '#b88c58',
      decor: ['boulder', 'fern', 'bones', 'fern', 'boulder', 'tree', 'campfire'],
      paintings: true,
      basic: ['rival', 'raptor', 'wolf'], medium: 'sabertooth', elite: 'mammoth',
      stampede: 'wolf', boss: 'trex', bossName: 'T-REX', bossAttacks: ['charge', 'rocks', 'stomp', 'charge'],
      music: 'stone', bossMusic: 'stoneBoss', hpMul: 1, xpMul: 1,
    },
    {
      key: 'roman', name: 'ROMAN EMPIRE', ground: 'mosaic', bg: '#d8c8a0',
      decor: ['column', 'urn', 'broken', 'cypress', 'brazier', 'broken'],
      paintings: false,
      basic: ['legionary', 'gladiator', 'spearman'], medium: 'centurion', elite: 'chariot',
      stampede: 'chariot', boss: 'hydra', bossName: 'HYDRA', bossAttacks: ['lunge', 'pools', 'lunge', 'summon'],
      music: 'roman', bossMusic: 'romanBoss', hpMul: 2.4, xpMul: 2,
    },
  ],

  shop: [
    { id: 'potion', name: 'Healing Potion', icon: 'potion', cost: 20, blurb: 'Heal 2 hearts.' },
    { id: 'heartmax', name: 'Heart Charm', icon: 'heart', cost: 45, blurb: '+1 max heart, full heal.' },
    { id: 'upgrade', name: 'Weapon Upgrade', icon: 'star', cost: 35, blurb: 'Level up one of your weapons.' },
    { id: 'weapon', name: 'New Weapon', icon: 'club', cost: 50, blurb: 'Get a random new weapon.' },
    { id: 'power', name: 'Power Brew', icon: 'potion', cost: 40, blurb: '+15% damage for this run.' },
    { id: 'reroll', name: 'Lucky Bones', icon: 'reroll', cost: 25, blurb: '+2 rerolls.' },
  ],

  // Sprite overrides drawn in the editor's pixel tool: key -> { pal: [hex], frames: [[rows]] }
  sprites: {},
};

// Descriptions shown in the editor
export const BEHAVIORS = {
  swing: 'Melee swing toward the nearest enemy (uses cd, dmg, radius, count, knockback)',
  orbit: 'Objects circle the player (uses dmg, radius, count, spin, hitDelay)',
  thrust: 'Long piercing stab (uses cd, dmg, length, count)',
  aura: 'Damaging ring around the player (uses dmg, radius, tick, slow)',
  rockfall: 'Things fall on enemies (uses cd, dmg, radius, count)',
  lightning: 'Strikes random enemies (uses cd, dmg, radius, count, chain, range)',
};

export const PASSIVE_EFFECTS = ['hearts', 'speed', 'count', 'damage', 'area', 'pickup'];
export const BOSS_ATTACKS = ['charge', 'stomp', 'rocks', 'lunge', 'pools', 'summon'];
export const MUSIC = ['stone', 'stoneBoss', 'roman', 'romanBoss', 'police', 'title'];
export const GROUNDS = ['cave', 'mosaic'];
