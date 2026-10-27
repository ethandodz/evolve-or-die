// Default game content. Everything here can be changed in the editor (editor.html).
// The editor saves changes on top of these defaults; see config.js.

export const DEFAULT_CONFIG = {
  version: 1,
  // Bump when new built-in content is added, so saved editor edits get it too (see config.js)
  contentVersion: 4,

  balance: {
    ageLength: 300,        // seconds until the time police arrive
    maxEnemies: 150,
    spawnBase: 1.6,        // enemies per second at the start of an age
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
    xpEarly: 0.45,         // first levels cost this much of normal, back to full by level 6
    giftWeaponAt: 0.2,     // part of the first age when you get a free second weapon (0 = off)
    earlyLoot: 3,          // boss loot multiplier when summoned right away (drops to x1 at the time police)
    eliteChance: 0.04,     // chance a normal enemy spawns as a glowing elite (after 45s)
    specialChance: 0.08,   // chance of an age's special enemies (after 45s)
    hitStop: 1,            // tiny freeze on big hits (0 = off)
    maxLevelPerAge: 1,     // weapons and passives can level this much higher in each later age
    sparkTimeEvery: 60,    // +1 Spark per this many seconds survived
    sparkCoinsEvery: 25,   // +1 Spark per this many coins left over
    sparkBoss: 4,          // Sparks from a boss (plus 3 per age, times the early-summon bonus)
    rarityChances: [0.7, 0.2, 0.08, 0.02], // common, rare, epic, legendary level-up cards
    loopHp: 2.5,           // extra enemy health for each Magic Mirror loop
    miniBossHp: 6,
    stampedeSize: 26,
    bossDarkness: 0.75,    // how dark boss fights get (0 = off)
    weaponSlots: 3,
    passiveSlots: 3,
  },

  // Each character has a perk and a drawback. Optional stats: dmgMul, critMul, xpMul,
  // areaMul, damageTaken (0.5 = half a heart per hit), weaponSlots, bonusCount.
  // unlock: 'start', a boss key, or 'kills:N' (total enemies defeated over all runs).
  characters: [
    { key: 'caveman', name: 'GRUG', title: 'The Caveman', sprite: 'caveman', weapon: 'club', hearts: 5, speed: 1, unlock: 'start',
      dmgMul: 1.3, weaponSlots: 2, perk: '+30% damage', drawback: 'Only 2 weapon slots' },
    { key: 'shaman', name: 'ORA', title: 'The Shaman', sprite: 'shaman', weapon: 'fire', hearts: 3, speed: 1, unlock: 'hydra',
      xpMul: 1.3, areaMul: 1.25, perk: '+30% XP, +25% area', drawback: 'Only 3 hearts' },
    { key: 'knight', name: 'EDRIC', title: 'The Knight', sprite: 'knight', weapon: 'axes', hearts: 5, speed: 0.85, unlock: 'dragon',
      damageTaken: 0.5, perk: 'Hits only take half a heart', drawback: '15% slower' },
    { key: 'centurion', name: 'MARCUS', title: 'The Centurion', sprite: 'centurion', weapon: 'spear', hearts: 5, speed: 0.95, unlock: 'kills:1500',
      bonusCount: 1, dmgMul: 0.85, perk: '+1 attack for every weapon', drawback: '-15% damage' },
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
  // ai: charge = stops, shows a red line, then dashes; shield = blocks most damage until
  // its shield breaks (shield = hits it takes); split = breaks into `splitInto` enemies.
  enemies: {
    wolf:       { name: 'Wolf', sprite: 'wolf', hp: 7, speed: 92, r: 10, xp: 1, scale: 1.5, color: '#9a98a6' },
    rival:      { name: 'Rival caveman', sprite: 'rival', hp: 15, speed: 52, r: 11, xp: 1, scale: 1.5, color: '#c98a62' },
    raptor:     { name: 'Raptor', sprite: 'raptor', hp: 10, speed: 74, r: 11, xp: 1, scale: 1.5, color: '#b86a2a' },
    sabertooth: { name: 'Sabertooth', sprite: 'sabertooth', hp: 45, speed: 82, r: 12, xp: 5, scale: 1.6, color: '#e0a040', ai: 'charge' },
    golem:      { name: 'Rock Golem', sprite: 'golem', hp: 70, speed: 40, r: 15, xp: 5, scale: 1.6, color: '#a3a3b0', heavy: true, ai: 'split', splitInto: 'pebble', splitCount: 3 },
    pebble:     { name: 'Pebble', sprite: 'pebble', hp: 8, speed: 88, r: 8, xp: 1, scale: 1.5, color: '#a3a3b0' },
    mammoth:    { name: 'Mammoth', sprite: 'mammoth', hp: 220, speed: 34, r: 22, xp: 20, scale: 1.7, color: '#6a3a20', heavy: true },
    legionary:  { name: 'Legionary', sprite: 'legionary', hp: 16, speed: 54, r: 11, xp: 1, scale: 1.5, color: '#c8283a', ai: 'shield', shield: 2 },
    spearman:   { name: 'Spearman', sprite: 'spearman', hp: 11, speed: 72, r: 11, xp: 1, scale: 1.5, color: '#3a6ac8' },
    gladiator:  { name: 'Gladiator', sprite: 'gladiator', hp: 24, speed: 58, r: 11, xp: 1, scale: 1.55, color: '#d8a040' },
    centurion:  { name: 'Centurion', sprite: 'centurion', hp: 60, speed: 70, r: 12, xp: 5, scale: 1.6, color: '#d83c3c', ai: 'charge' },
    testudo:    { name: 'Testudo', sprite: 'testudo', hp: 90, speed: 36, r: 18, xp: 5, scale: 1.6, color: '#c8283a', heavy: true, ai: 'split', splitInto: 'legionary', splitCount: 4 },
    chariot:    { name: 'Chariot', sprite: 'chariot', hp: 240, speed: 50, r: 20, xp: 20, scale: 1.6, color: '#8a5a2e', heavy: true },
    peasant:    { name: 'Angry Peasant', sprite: 'peasant', hp: 14, speed: 88, r: 10, xp: 1, scale: 1.5, color: '#8a6a3a' },
    footman:    { name: 'Footman', sprite: 'footman', hp: 30, speed: 54, r: 11, xp: 1, scale: 1.5, color: '#a8a8b8', ai: 'shield', shield: 3 },
    jester:     { name: 'Jester', sprite: 'jester', hp: 20, speed: 78, r: 10, xp: 1, scale: 1.5, color: '#d84a8a', ai: 'zigzag' },
    blackknight: { name: 'Black Knight', sprite: 'blackknight', hp: 110, speed: 66, r: 12, xp: 5, scale: 1.6, color: '#4a4a5c', ai: 'charge' },
    slime:      { name: 'Giant Slime', sprite: 'slime', hp: 120, speed: 42, r: 15, xp: 5, scale: 1.6, color: '#6ad04a', ai: 'split', splitInto: 'slimelet', splitCount: 3 },
    slimelet:   { name: 'Slimelet', sprite: 'slimelet', hp: 16, speed: 80, r: 8, xp: 1, scale: 1.5, color: '#6ad04a' },
    troll:      { name: 'Troll', sprite: 'troll', hp: 420, speed: 32, r: 22, xp: 20, scale: 1.7, color: '#6a8a4a', heavy: true },
    timecop:    { name: 'Time police', sprite: 'timecop', hp: 90, speed: 96, r: 12, xp: 5, scale: 1.55, color: '#3a6ac8' },
    trex:       { name: 'T-Rex', sprite: 'trex', hp: 4200, speed: 46, r: 34, xp: 0, scale: 2.2, color: '#b86a2a', boss: true, heavy: true },
    hydra:      { name: 'Hydra', sprite: 'hydra', hp: 11000, speed: 34, r: 36, xp: 0, scale: 2.2, color: '#3ab8a4', boss: true, heavy: true },
    dragon:     { name: 'Dragon', sprite: 'dragon', hp: 26000, speed: 40, r: 36, xp: 0, scale: 2.2, color: '#d84a2a', boss: true, heavy: true },
  },

  // Mini-bosses (the giant elite at the halfway mark) use these moves: stomp, charge, summon, throw
  miniAttacks: ['stomp', 'charge', 'throw', 'summon'],

  ages: [
    {
      key: 'stone', name: 'STONE AGE', ground: 'cave', bg: '#b88c58',
      decor: ['boulder', 'fern', 'bones', 'fern', 'boulder', 'tree', 'campfire'],
      paintings: true,
      basic: ['rival', 'raptor', 'wolf'], medium: 'sabertooth', elite: 'mammoth', specials: ['golem'],
      stampede: 'wolf', stampedeName: 'STAMPEDE!', boss: 'trex', bossName: 'T-REX', bossAttacks: ['charge3', 'stomp', 'rocks', 'charge3', 'roar'], bossStyle: 'hunter',
      music: 'stone', bossMusic: 'stoneBoss', hpMul: 1, xpMul: 1,
    },
    {
      key: 'roman', name: 'ROMAN EMPIRE', ground: 'mosaic', bg: '#d8c8a0',
      decor: ['column', 'urn', 'broken', 'cypress', 'brazier', 'broken'],
      paintings: false,
      basic: ['legionary', 'gladiator', 'spearman'], medium: 'centurion', elite: 'chariot', specials: ['testudo'],
      stampede: 'chariot', stampedeName: 'CHARIOT RACE!', boss: 'hydra', bossName: 'HYDRA', bossAttacks: ['lunge', 'ring', 'pools', 'lunge', 'summon'], bossStyle: 'rooted',
      music: 'roman', bossMusic: 'romanBoss', hpMul: 2.4, xpMul: 2,
    },
    {
      key: 'medieval', name: 'MIDDLE AGES', ground: 'tapestry', bg: '#6a2a2a',
      decor: ['banner', 'haybale', 'shrub', 'torch', 'gravestone', 'shrub'],
      paintings: false,
      basic: ['peasant', 'footman', 'jester'], medium: 'blackknight', elite: 'troll', specials: ['slime'],
      stampede: 'peasant', stampedeName: 'PEASANT MOB!', boss: 'dragon', bossName: 'DRAGON', bossAttacks: ['fly', 'breath', 'meteors', 'fly', 'sweep'], bossStyle: 'flyer',
      music: 'medieval', bossMusic: 'medievalBoss', hpMul: 4.5, xpMul: 3.2,
    },
  ],

  shop: [
    { id: 'potion', name: 'Healing Potion', icon: 'potion', cost: 20, blurb: 'Heal 2 hearts.' },
    { id: 'heartmax', name: 'Heart Charm', icon: 'heart', cost: 45, blurb: '+1 max heart, full heal.' },
    { id: 'upgrade', name: 'Weapon Upgrade', icon: 'star', cost: 35, blurb: 'Level up one of your weapons.' },
    { id: 'weapon', name: 'New Weapon', icon: 'club', cost: 50, blurb: 'Get a random new weapon.' },
    { id: 'power', name: 'Power Brew', icon: 'potion', cost: 40, blurb: '+15% damage for this run.' },
    { id: 'reroll', name: 'Lucky Bones', icon: 'reroll', cost: 25, blurb: '+2 rerolls.' },
    { id: 'confusion', name: 'Confusion Potion', icon: 'potion_purple', cost: 30, blurb: 'Swap every weapon for a random one. Keeps levels.' },
    { id: 'rabbit', name: "Rabbit's Foot", icon: 'rabbitfoot', cost: 40, blurb: '+30% move speed, -1 max heart.' },
  ],
  shopRerollCost: 10,       // goes up by this much each time

  // One rare item shows up on each visit to the wizard
  rareShop: [
    { id: 'crystal', name: 'Time Crystal', icon: 'crystal', cost: 90, blurb: 'Every weapon gains a level.' },
    { id: 'phoenix', name: 'Phoenix Feather', icon: 'feather', cost: 80, blurb: 'Come back to life once this run.' },
    { id: 'idol', name: 'Golden Idol', icon: 'idol', cost: 85, blurb: '+1 attack for every weapon.' },
    { id: 'sparkjar', name: 'Jar of Sparks', icon: 'spark', cost: 70, blurb: '+10 Sparks to keep forever.' },
    { id: 'firegem', name: 'Fire Gem', icon: 'firegem', cost: 90, blurb: 'Every hit sets enemies on fire.' },
  ],
  // Sold by the wizard after the last age's boss: loops the run back to the first age
  mirror: { id: 'mirror', name: 'Magic Mirror', icon: 'mirror', cost: 120, blurb: 'Loop back to the first age. Keep all your gear.' },

  // Permanent upgrades bought with Sparks on the main menu. cost = base + grow * level owned
  meta: [
    { id: 'hearts', name: 'Thick Skin', icon: 'heart', max: 3, base: 80, grow: 80, amount: 1, blurb: '+1 starting heart.' },
    { id: 'damage', name: 'Strong Arm', icon: 'flint', max: 5, base: 40, grow: 40, amount: 0.06, blurb: '+6% damage.' },
    { id: 'speed', name: 'Quick Feet', icon: 'sandal', max: 5, base: 40, grow: 30, amount: 0.04, blurb: '+4% move speed.' },
    { id: 'xp', name: 'Wisdom', icon: 'gem_m', max: 5, base: 50, grow: 40, amount: 0.08, blurb: '+8% XP.' },
    { id: 'pickup', name: 'Long Reach', icon: 'lodestone', max: 3, base: 30, grow: 30, amount: 0.15, blurb: '+15% pickup range.' },
    { id: 'rerolls', name: 'Lucky Charm', icon: 'reroll', max: 3, base: 60, grow: 60, amount: 1, blurb: '+1 reroll each run.' },
    { id: 'coins', name: 'Pouch', icon: 'coin', max: 3, base: 40, grow: 40, amount: 20, blurb: 'Start with +20 coins.' },
    { id: 'revive', name: 'Second Wind', icon: 'feather', max: 1, base: 300, grow: 0, amount: 1, blurb: 'Come back to life once per run.' },
  ],

  // Daily challenge twists. Two are picked each day.
  twists: [
    { id: 'glass', name: 'Glass Cannon', blurb: 'Double damage, half hearts' },
    { id: 'fast', name: 'Fast Forward', blurb: 'Everything moves 30% faster' },
    { id: 'horde', name: 'The Horde', blurb: 'Many more, weaker enemies' },
    { id: 'giants', name: 'Land of Giants', blurb: 'Bigger, tougher enemies, more XP' },
    { id: 'rich', name: 'Gold Rush', blurb: 'Triple coins, no healing meat' },
    { id: 'rush', name: 'Boss Rush', blurb: 'Time police come at 2:00' },
    { id: 'random', name: 'Wild Card', blurb: 'Start with a random weapon' },
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
export const BOSS_ATTACKS = ['charge', 'charge3', 'stomp', 'rocks', 'roar', 'lunge', 'ring', 'pools', 'summon', 'breath', 'meteors', 'fly', 'sweep'];
export const BOSS_STYLES = ['', 'hunter', 'rooted', 'flyer'];
export const MUSIC = ['stone', 'stoneBoss', 'roman', 'romanBoss', 'medieval', 'medievalBoss', 'police', 'title'];
export const GROUNDS = ['cave', 'mosaic', 'tapestry'];
export const ENEMY_AI = ['', 'charge', 'shield', 'split', 'zigzag'];
