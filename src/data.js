// Game content: ages, enemies, weapons, passives, shop items.
// Tuning numbers live here so they are easy to change after playtesting.

export const AGE_LENGTH = 300; // seconds until the time police arrive

export const AGES = [
  {
    key: 'stone', name: 'STONE AGE', ground: 'ground_stone', bg: 0x4e7434,
    decor: ['bush', 'stone', 'bone', 'fern', 'bush', 'fern'],
    basic: ['rival', 'raptor', 'wolf'], medium: 'sabertooth', elite: 'mammoth',
    stampede: 'wolf', boss: 'trex', bossName: 'T-REX',
    music: 'stone', bossMusic: 'stoneBoss', hpMul: 1, xpMul: 1,
  },
  {
    key: 'roman', name: 'ROMAN EMPIRE', ground: 'ground_roman', bg: 0xc8a462,
    decor: ['column', 'urn', 'broken', 'stone', 'broken'],
    basic: ['legionary', 'gladiator', 'spearman'], medium: 'centurion', elite: 'chariot',
    stampede: 'chariot', boss: 'hydra', bossName: 'HYDRA',
    music: 'roman', bossMusic: 'romanBoss', hpMul: 2.4, xpMul: 2,
  },
];

// Fast enemies are fragile, slow ones are tanky. None of them shoot.
// r = hit radius in world pixels, scale = sprite scale.
export const ENEMIES = {
  wolf:       { hp: 7,   speed: 92, r: 10, xp: 1,  scale: 2, name: 'Wolf' },
  rival:      { hp: 15,  speed: 52, r: 11, xp: 1,  scale: 2, name: 'Rival caveman' },
  raptor:     { hp: 10,  speed: 74, r: 11, xp: 1,  scale: 2, name: 'Raptor' },
  sabertooth: { hp: 45,  speed: 82, r: 12, xp: 5,  scale: 2.4, name: 'Sabertooth' },
  mammoth:    { hp: 220, speed: 34, r: 22, xp: 20, scale: 2.6, name: 'Mammoth', heavy: true },
  legionary:  { hp: 16,  speed: 54, r: 11, xp: 1,  scale: 2, name: 'Legionary' },
  spearman:   { hp: 11,  speed: 72, r: 11, xp: 1,  scale: 2, name: 'Spearman' },
  gladiator:  { hp: 24,  speed: 58, r: 11, xp: 1,  scale: 2.1, name: 'Gladiator' },
  centurion:  { hp: 60,  speed: 70, r: 12, xp: 5,  scale: 2.3, name: 'Centurion' },
  chariot:    { hp: 240, speed: 50, r: 20, xp: 20, scale: 2.2, name: 'Chariot', heavy: true },
  timecop:    { hp: 90,  speed: 96, r: 12, xp: 5,  scale: 2.2, name: 'Time police' },
  trex:       { hp: 4200, speed: 46, r: 34, xp: 0, scale: 4, name: 'T-Rex', boss: true, heavy: true },
  hydra:      { hp: 11000, speed: 34, r: 36, xp: 0, scale: 3.6, name: 'Hydra', boss: true, heavy: true },
};

// Weapons stay the same type and get stronger as they level up.
// "count" is the number of attacks; the Tribal Totem passive adds to it for every weapon.
export const WEAPONS = {
  club: {
    name: 'Club', icon: 'club', kind: 'Melee', max: 7,
    blurb: 'Big swing in front of you. Knocks enemies back.',
    stats: (l) => ({ cd: 1.0 - 0.06 * (l - 1), dmg: 14 + 6 * (l - 1), radius: 78 + 6 * (l - 1), count: 1 + (l >= 3) + (l >= 6) }),
    levels: ['', '+6 damage', '+1 swing', 'Faster, +6 damage', 'Bigger swing, +6 damage', '+1 swing', 'Faster, +6 damage'],
  },
  axes: {
    name: 'Orbiting Axes', icon: 'axe', kind: 'Orbit', max: 7,
    blurb: 'Stone axes circle around you.',
    stats: (l) => ({ dmg: 8 + 4 * (l - 1), radius: 64 + 5 * (l - 1), count: 2 + (l >= 3) + (l >= 5) + (l >= 7), spin: 3.4 + 0.25 * (l - 1) }),
    levels: ['', '+4 damage, faster', '+1 axe', '+4 damage, wider', '+1 axe', '+4 damage, faster', '+1 axe'],
  },
  spear: {
    name: 'Spear', icon: 'spear', kind: 'Melee', max: 7,
    blurb: 'Long thrust at the nearest enemy. Pierces.',
    stats: (l) => ({ cd: 1.25 - 0.07 * (l - 1), dmg: 22 + 8 * (l - 1), length: 125 + 10 * (l - 1), count: 1 + (l >= 4) + (l >= 7) }),
    levels: ['', '+8 damage, longer', 'Faster, +8 damage', '+1 spear', '+8 damage, longer', 'Faster, +8 damage', '+1 spear'],
  },
  fire: {
    name: 'Fire Ring', icon: 'flame', kind: 'Aura', max: 7,
    blurb: 'Burns and slows enemies near you.',
    stats: (l) => ({ dmg: 5 + 2.5 * (l - 1), radius: 54 + 7 * (l - 1), tick: 0.5 - 0.02 * (l - 1), slow: 0.3 + 0.03 * (l - 1) }),
    levels: ['', '+2.5 damage, wider', '+2.5 damage, burns faster', '+2.5 damage, wider', '+2.5 damage, slows more', '+2.5 damage, wider', '+2.5 damage, burns faster'],
  },
  rocks: {
    name: 'Rock Fall', icon: 'rock', kind: 'Area', max: 7,
    blurb: 'Boulders crash down on enemies.',
    stats: (l) => ({ cd: 2.1 - 0.1 * (l - 1), dmg: 26 + 10 * (l - 1), radius: 36 + 3 * (l - 1), count: 2 + Math.floor(l / 2) }),
    levels: ['', '+10 damage, +1 rock', 'Faster, +10 damage', '+10 damage, +1 rock', 'Bigger, +10 damage', '+10 damage, +1 rock', 'Faster, +10 damage'],
  },
  bolt: {
    name: 'Sky Bolt', icon: 'bolt', kind: 'Area', max: 7,
    blurb: 'Lightning strikes enemies around you.',
    stats: (l) => ({ cd: 1.7 - 0.1 * (l - 1), dmg: 32 + 10 * (l - 1), radius: 28 + 2 * (l - 1), count: 1 + Math.floor((l - 1) / 2), chain: l >= 5 ? 2 : 0, range: 270 }),
    levels: ['', '+10 damage, faster', '+1 bolt', '+10 damage, faster', '+1 bolt, bolts chain', '+10 damage, faster', '+1 bolt'],
  },
};

export const PASSIVES = {
  heart:   { name: 'Mammoth Heart', icon: 'heart', max: 5, blurb: '+1 max heart and heal 1.' },
  sandals: { name: 'Swift Sandals', icon: 'sandal', max: 5, blurb: '+10% move speed.' },
  totem:   { name: 'Tribal Totem', icon: 'totem', max: 3, blurb: '+1 attack for every weapon.' },
  flint:   { name: 'Sharp Flint', icon: 'flint', max: 5, blurb: '+12% damage.' },
  tusk:    { name: 'Giant Tusk', icon: 'tusk', max: 5, blurb: '+10% area and range.' },
  magnet:  { name: 'Lodestone', icon: 'lodestone', max: 5, blurb: '+35% XP pickup range.' },
};

export const SHOP_ITEMS = [
  { id: 'potion', name: 'Healing Potion', icon: 'potion', cost: 20, blurb: 'Heal 2 hearts.' },
  { id: 'heartmax', name: 'Heart Charm', icon: 'heart', cost: 45, blurb: '+1 max heart, full heal.' },
  { id: 'upgrade', name: 'Weapon Upgrade', icon: 'star', cost: 35, blurb: 'Level up one of your weapons.' },
  { id: 'weapon', name: 'New Weapon', icon: 'club', cost: 50, blurb: 'Get a random new weapon.' },
  { id: 'power', name: 'Power Brew', icon: 'potion', cost: 40, blurb: '+15% damage for this run.' },
  { id: 'reroll', name: 'Lucky Bones', icon: 'reroll', cost: 25, blurb: '+2 rerolls.' },
];

export const CHARACTERS = [
  { key: 'caveman', name: 'GRUG', title: 'The Caveman', weapon: 'club', locked: false },
  { key: 'locked1', name: '???', title: 'Beat the Hydra', weapon: null, locked: true },
  { key: 'locked2', name: '???', title: 'Coming soon', weapon: null, locked: true },
];

export const xpForLevel = (lvl) => Math.floor(5 + (lvl - 1) * 4 + Math.pow(lvl - 1, 1.5));
