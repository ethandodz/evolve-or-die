// Default game content. Everything here can be changed in the editor (editor.html).
// The editor saves changes on top of these defaults; see config.js.

export const DEFAULT_CONFIG = {
  version: 1,
  // Bump when new built-in content is added, so saved editor edits get it too (see config.js)
  contentVersion: 38,

  balance: {
    ageLength: 210,        // seconds until the time police arrive (the boss fight doesn't stop the clock)
    maxEnemies: 200,
    spawnBase: 1.6,        // enemies per second at the start of an age
    spawnGrowth: 0.06,     // extra enemies per second, per second (eased by rampCurve)
    crowdStart: 30,        // max enemies alive at the start of an age
    crowdGrowth: 1.0,      // extra allowed per second (eased by rampCurve)
    rampCurve: 2,          // 1 = steady build-up; 2 = slow start that speeds up to the same peak
    ageSpawnStep: 4,       // each later age starts with this many more enemies per second
    ageCrowdStep: 40,      // and this many more allowed at once
    hpGrowth: 41.7,        // enemy HP goes up by its starting amount every this many seconds
    enemyHpMul: 1.4,       // all enemies (bosses too) have this much health
    ageHpBonus: 0.1,       // and +10% more after each age (stacks)
    playerSpeed: 119,
    pickupRange: 80,
    invincibility: 1.5,    // seconds of safety after a hit
    critChance: 0.08,      // chance of a critical hit (red damage number)
    critDamage: 2,         // critical hits do this many times the damage
    coinChance: 0.09,
    meatChance: 0.006,
    magnetChance: 0.003,
    ghostChance: 0.0015,   // Ghost Heart: a temporary heart above max that the next hit takes
    rerolls: 3,
    xpBase: 5, xpPer: 4, xpCurve: 1.5,
    xpEarly: 0.45,         // first levels cost this much of normal, back to full by level 6
    giftWeaponAt: 0.2,     // part of the first age when you get a free second weapon (0 = off)
    earlyLoot: 3,          // boss loot multiplier when summoned right away (drops to x1 at the time police)
    eliteChance: 0.04,     // chance a normal enemy spawns as a glowing elite (after 45s)
    specialChance: 0.08,   // chance of an age's special enemies (after 45s)
    hitStop: 1,            // tiny freeze on big hits (0 = off)
    sparkTimeEvery: 60,    // +1 Spark per this many seconds survived
    sparkCoinsEvery: 25,   // +1 Spark per this many coins left over
    sparkBoss: 20,         // Sparks from an age boss (times the early-summon bonus)
    rarityChances: [0.7, 0.2, 0.08, 0.02], // common, rare, epic, legendary level-up cards
    loopHp: 2.5,           // extra enemy health for each Magic Mirror loop
    miniBossHp: 6,
    stampedeSize: 26,
    bossDarkness: 0.75,    // how dark boss fights get (0 = off)
    weaponSlots: 3,
    passiveSlots: 3,
    eventTimes: [0.18, 0.6], // random events start at these parts of each age
    eventLength: 20,       // seconds a random event lasts
    treasureChance: 0.001,  // chance any enemy drops a relic chest (0.1%)
    bossTreasureChance: 0.25,  // chance an age boss drops a relic chest
    xpDrop: 0.6,           // XP from each enemy (0.6 = 40% less than the original)
    shopPriceMul: 5,       // wizard prices are this many times the listed cost
    passiveFirstPick: 3,   // a passive's first level in a run counts this many levels, so it's noticeable
  },

  // Each character has a perk and a drawback. Optional stats: dmgMul, dmgPerLevel (damage per player level), critMul, xpMul,
  // areaMul, damageTaken (0.5 = half a heart per hit), weaponSlots, bonusCount.
  // pet: an enemy sprite that fights at your side.
  // unlock: 'start', a boss key, 'kills:N' (total enemies defeated over all runs) or 'quest:<id>'.
  // cost: Sparks to buy it on the UNLOCK menu once the unlock goal is met.
  // Only Grug is in the game for now; the others are hidden (HIDDEN_CHARS in data.js) until they're reworked.
  characters: [
    { key: 'caveman', name: 'CAVEMAN', title: 'The Caveman', sprite: 'caveman', weapon: 'boneclub', hearts: 3, speed: 1, unlock: 'start',
      dmgPerLevel: 0.005, weaponSlots: 2, perk: '+0.5% damage every level up', drawback: 'Only 2 weapon slots' },
    { key: 'gladiator', name: 'GLADIATOR', title: 'The Gladiator', sprite: 'gladiatorhero', weapon: 'gladius', hearts: 3, speed: 1, unlock: 'hydra', cost: 100,
      critPerLevel: 0.01, blurb: 'The Gladiator has mastered the arts of both showmanship and combat.', perk: '+1% critical chance every level up' },
    { key: 'shaman', name: 'SHAMAN', title: 'The Shaman', sprite: 'shaman', weapon: 'spiritfire', hearts: 1, speed: 1, unlock: 'hydra',
      xpMul: 1.3, areaMul: 1.25, perk: '+30% XP, +25% area', drawback: 'Only 1 heart' },
    { key: 'centurion', name: 'CENTURION', title: 'The Centurion', sprite: 'centurion', weapon: 'pilum', hearts: 2, speed: 0.95, unlock: 'kills:3000',
      bonusCount: 1, dmgMul: 0.85, perk: '+1 attack for every weapon', drawback: '-15% damage' },
    { key: 'knight', name: 'KNIGHT', title: 'The Knight', sprite: 'knight', weapon: 'holyblades', hearts: 2, speed: 0.85, unlock: 'dragon',
      damageTaken: 0.5, perk: 'Hits only take half a heart', drawback: '15% slower' },
    { key: 'inventor', name: 'INVENTOR', title: 'The Inventor', sprite: 'inventor', weapon: 'tesla', hearts: 1, speed: 1, unlock: 'mech',
      cdMul: 0.8, areaMul: 0.8, perk: 'Weapons attack 25% faster', drawback: '-20% area and range' },
    { key: 'engineer', name: 'ENGINEER', title: 'The Engineer', sprite: 'engineer', weapon: 'steamhammer', hearts: 2, speed: 0.9, unlock: 'locomotive',
      areaMul: 1.4, perk: '+40% area and range', drawback: '10% slower' },
    { key: 'pilot', name: 'STUNT PILOT', title: 'The Stunt Pilot', sprite: 'pilot', weapon: 'droneswarm', hearts: 2, speed: 1.2, unlock: 'chopper',
      dmgMul: 0.85, perk: '20% faster', drawback: '-15% damage' },
    { key: 'nova', name: 'STAR RANGER', title: 'The Star Ranger', sprite: 'nova', weapon: 'plasmalance', hearts: 1, speed: 1, unlock: 'overlord',
      cdMul: 0.87, dmgMul: 1.15, perk: '15% faster attacks, +15% damage', drawback: 'Only 1 heart' },
    // Unlocked by achievements (unlock: 'quest:<quest id>' from quests.js; unlockText is the short hint on the card)
    { key: 'bard', name: 'BARD', title: 'The Bard', sprite: 'bard', weapon: 'battlelute', hearts: 1, speed: 1, unlock: 'quest:level30', unlockText: 'Reach level 30',
      cdMul: 0.9, xpMul: 1.15, perk: '10% faster attacks, +15% XP', drawback: 'Only 1 heart' },
    { key: 'alchemist', name: 'ALCHEMIST', title: 'The Alchemist', sprite: 'alchemist', weapon: 'potionbombs', hearts: 2, speed: 1, unlock: 'quest:combo5', unlockText: 'Find 5 combos',
      areaMul: 1.3, xpMul: 1.2, weaponSlots: 2, perk: '+30% area, +20% XP', drawback: 'Only 2 weapon slots' },
    { key: 'inspector', name: 'INSPECTOR', title: 'The Inspector', sprite: 'inspector', weapon: 'swordcane', hearts: 2, speed: 1.1, unlock: 'quest:thief10', unlockText: 'Catch 10 thieves',
      critMul: 2, areaMul: 0.8, perk: 'Double crits, 10% faster', drawback: '-20% area and range' },
    { key: 'rocker', name: 'ROCKSTAR', title: 'The Rockstar', sprite: 'rocker', weapon: 'ampblast', hearts: 2, speed: 1, unlock: 'quest:flawless3', unlockText: 'Beat 3 bosses unhit',
      dmgMul: 1.3, areaMul: 0.8, perk: '+30% damage', drawback: '-20% area and range' },
    { key: 'zorp', name: 'ALIEN', title: 'The Alien', sprite: 'zorp', weapon: 'raygun', hearts: 3, speed: 0.9, unlock: 'quest:elites500', unlockText: 'Beat 500 elites',
      pet: 'ufo', perk: 'A mini UFO fights with you', drawback: '10% slower' },
  ],

  // stats: each value is base + per * (level - 1) + one for every level in "at" that is reached.
  // Every weapon goes to level 30 in small steps; the card text for each level is worked out from the stats.
  // unlock + cost: the weapon is bought on the UNLOCK menu (goal met, then Sparks) before it can show up.
  // era: the age where a shared weapon first turns up. Once equipped it shows up in every age after that.
  weapons: {
    club: {
      name: 'Club', icon: 'club', era: 'stone', behavior: 'swing', kind: 'Melee', max: 30,
      blurb: 'Big swing in front of you. Knocks enemies back.',
      stats: { cd: { base: 1.0, per: -0.024 }, dmg: { base: 11.2, per: 2.4 }, radius: { base: 78, per: 3 }, count: { base: 1, at: [11, 25] }, knockback: { base: 260 } },
    },
    axes: {
      name: 'Orbiting Axes', icon: 'axe', era: 'medieval', behavior: 'orbit', kind: 'Orbit', max: 30,
      blurb: 'Stone axes circle around you.',
      stats: { dmg: { base: 6.4, per: 1.6 }, radius: { base: 64, per: 2.5 }, count: { base: 2, at: [11, 20, 30] }, spin: { base: 3.4, per: 0.125 }, hitDelay: { base: 0.45 } },
    },
    spear: {
      name: 'Spear', icon: 'spear', era: 'roman', behavior: 'thrust', kind: 'Melee', max: 30,
      blurb: 'Long thrust at the nearest enemy. Pierces.',
      stats: { cd: { base: 1.25, per: -0.028 }, dmg: { base: 17.6, per: 3.2 }, length: { base: 125, per: 5 }, count: { base: 1, at: [16, 30] } },
    },
    fire: {
      name: 'Fire Ring', icon: 'flame', era: 'stone', behavior: 'aura', kind: 'Aura', max: 30,
      blurb: 'Burns and slows enemies near you.',
      stats: { dmg: { base: 6, per: 1.5 }, radius: { base: 81, per: 3.5 }, tick: { base: 0.5, per: -0.008 }, slow: { base: 0.3, per: 0.015 } },
    },
    rocks: {
      name: 'Meteor', countName: 'meteor', icon: 'meteor', era: 'stone', behavior: 'rockfall', kind: 'Area', max: 30, fiery: true,
      unlock: 'trex', cost: 10,
      blurb: 'Flaming meteors crash down on enemies and leave scorched craters.',
      stats: { cd: { base: 2.1, per: -0.04 }, dmg: { base: 20.8, per: 4 }, radius: { base: 36, per: 1.5 }, count: { base: 2, at: [6, 16, 25] } },
    },
    bolt: {
      name: 'Thunderbolt', countName: 'bolt', icon: 'bolt', era: 'renaissance', behavior: 'lightning', kind: 'Area', max: 30,
      unlock: 'quest:fastboss', unlockText: 'Defeat a boss within 10 seconds', cost: 100,
      blurb: 'Lightning strikes enemies around you.',
      stats: { cd: { base: 1.7, per: -0.04 }, dmg: { base: 25.6, per: 4 }, radius: { base: 28, per: 1 }, count: { base: 1, at: [11, 20, 30] }, chain: { base: 0, at: [20, 20] }, range: { base: 270 } },
    },
    // Signature weapons: each character starts with their own, never offered to anyone else.
    // tier = power rank (later unlocks are stronger); base = the normal weapon it counts as for combos.
    boneclub: {
      name: 'Mammoth Club', countName: 'swing', icon: 'boneclub', behavior: 'swing', kind: 'Melee', max: 30, signature: 'caveman', tier: 1, base: 'club', iconScale: 1.15,
      blurb: "The Caveman's mammoth-bone club. Hits harder and knocks enemies further.",
      stats: { cd: { base: 0.95, per: -0.024 }, dmg: { base: 13.6, per: 2.8 }, radius: { base: 94.3, per: 3.45 }, count: { base: 1, at: [11, 25] }, knockback: { base: 330 } },
    },
    gladius: {
      name: 'Gladius', icon: 'gladius', behavior: 'gladius', kind: 'Orbit', max: 30, signature: 'gladiator', tier: 15, base: 'axes',
      blurb: 'Traditional weapon of the Roman centurions and very deadly in close quarters.',
      stats: { dmg: { base: 12, per: 2.4 }, size: { base: 1, per: 0.025 }, count: { base: 2, at: [9, 18, 27] }, spin: { base: 2.75, per: 0.06 }, crit: { base: 0, per: 0.005 }, radius: { base: 40 }, hitDelay: { base: 0.4 } },
    },
    spiritfire: {
      name: 'Spirit Fire', icon: 'spiritflame', behavior: 'aura', kind: 'Aura', max: 30, signature: 'shaman', tier: 2, base: 'fire', ringColor: [0x3ac8e0, 0xa0f4ff],
      blurb: "The Shaman's blue spirit flames. Wider, hotter and slows more than fire.",
      stats: { dmg: { base: 6, per: 1.4 }, radius: { base: 64, per: 3.5 }, tick: { base: 0.45, per: -0.008 }, slow: { base: 0.4, per: 0.015 } },
    },
    pilum: {
      name: 'Golden Pilum', icon: 'pilum', behavior: 'thrust', kind: 'Melee', max: 30, signature: 'centurion', tier: 3, base: 'spear',
      blurb: "The Centurion's golden javelin. Long reach, pierces everything.",
      stats: { cd: { base: 1.1, per: -0.028 }, dmg: { base: 28.8, per: 5.2 }, length: { base: 150, per: 6 }, count: { base: 1, at: [11, 25] } },
    },
    holyblades: {
      name: 'Holy Blades', icon: 'holyblade', behavior: 'orbit', kind: 'Orbit', max: 30, signature: 'knight', tier: 4, base: 'axes',
      blurb: "The Knight's three blessed swords spin around him.",
      stats: { dmg: { base: 12, per: 2.8 }, radius: { base: 72, per: 2.5 }, count: { base: 3, at: [11, 20, 30] }, spin: { base: 3.8, per: 0.125 }, hitDelay: { base: 0.4 } },
    },
    tesla: {
      name: 'Tesla Coil', icon: 'tesla', behavior: 'lightning', kind: 'Area', max: 30, signature: 'inventor', tier: 6, base: 'bolt', boltColor: 0x7ae0ff,
      blurb: "The Inventor's invention. Blue lightning that always chains to more enemies.",
      stats: { cd: { base: 1.4, per: -0.036 }, dmg: { base: 48, per: 7.2 }, radius: { base: 32, per: 1 }, count: { base: 2, at: [11, 20, 30] }, chain: { base: 2, at: [20] }, range: { base: 300 } },
    },
    // Only from the Ark of the Covenant relic
    steamhammer: {
      name: 'Steam Hammer', icon: 'steamhammer', behavior: 'swing', kind: 'Melee', max: 30, signature: 'engineer', tier: 8, base: 'club',
      blurb: "The Engineer's piston hammer. Huge swings that blast enemies away.",
      stats: { cd: { base: 0.9, per: -0.02 }, dmg: { base: 52, per: 8 }, radius: { base: 96, per: 3.5 }, count: { base: 1, at: [11, 25] }, knockback: { base: 420 } },
    },
    droneswarm: {
      name: 'Drone Swarm', icon: 'drone_s', behavior: 'orbit', kind: 'Orbit', max: 30, signature: 'pilot', tier: 10, base: 'axes',
      blurb: "The Stunt Pilot's stunt drones zip around you, four at a time.",
      stats: { dmg: { base: 30, per: 5 }, radius: { base: 84, per: 3 }, count: { base: 4, at: [11, 20, 30] }, spin: { base: 4.2, per: 0.125 }, hitDelay: { base: 0.35 } },
    },
    plasmalance: {
      name: 'Plasma Lance', icon: 'plasma', fx: 'plasmabeam', behavior: 'thrust', kind: 'Melee', max: 30, signature: 'nova', tier: 12, base: 'spear',
      blurb: "The Star Ranger's lance of pure starlight. Long beams that pierce everything.",
      stats: { cd: { base: 0.85, per: -0.02 }, dmg: { base: 72, per: 11 }, length: { base: 260, per: 8 }, count: { base: 2, at: [11, 20, 30] } },
    },
    battlelute: {
      name: 'Battle Lute', icon: 'lute', auraIcon: 'note', behavior: 'aura', kind: 'Aura', max: 30, signature: 'bard', tier: 5, base: 'fire', ringColor: [0xb030e0, 0xf070ff],
      blurb: "The Bard's war songs. Musical notes circle him, hurting and slowing everything close.",
      stats: { dmg: { base: 10, per: 1.75 }, radius: { base: 70, per: 3 }, tick: { base: 0.4, per: -0.008 }, slow: { base: 0.35, per: 0.01 } },
    },
    potionbombs: {
      name: 'Potion Bombs', icon: 'flask', behavior: 'rockfall', kind: 'Area', max: 30, signature: 'alchemist', tier: 7, base: 'rocks', burn: 0.4,
      blurb: "The Alchemist's bubbling flasks smash on enemies and set them alight.",
      stats: { cd: { base: 1.7, per: -0.04 }, dmg: { base: 40, per: 7 }, radius: { base: 48, per: 2 }, count: { base: 2, at: [11, 20, 30] } },
    },
    swordcane: {
      name: 'Sword Cane', icon: 'swordcane', behavior: 'thrust', kind: 'Melee', max: 30, signature: 'inspector', tier: 9, base: 'spear',
      blurb: "The Inspector's walking cane hides a blade. Lightning-quick lunges.",
      stats: { cd: { base: 0.55, per: -0.012 }, dmg: { base: 60, per: 9 }, length: { base: 180, per: 6 }, count: { base: 1, at: [11, 20, 30] } },
    },
    ampblast: {
      name: 'Amp Blast', icon: 'guitar', behavior: 'lightning', kind: 'Area', max: 30, signature: 'rocker', tier: 11, base: 'bolt', boltColor: 0xff4ad0,
      blurb: "The Rockstar's power chords blast enemies with pink lightning that jumps between them.",
      stats: { cd: { base: 1.2, per: -0.032 }, dmg: { base: 70, per: 10 }, radius: { base: 40, per: 1.5 }, count: { base: 3, at: [11, 20, 30] }, chain: { base: 2, at: [20] }, range: { base: 300 } },
    },
    raygun: {
      name: 'Ray Gun', icon: 'raygun', fx: 'raybolt', behavior: 'shoot', kind: 'Projectile', max: 30, signature: 'zorp', tier: 13, base: 'nailgun',
      blurb: "The Alien's ray gun. Fast bolts that pierce a whole line of enemies.",
      stats: { cd: { base: 0.7, per: -0.016 }, dmg: { base: 64, per: 9 }, count: { base: 2, at: [11, 20, 30] }, pierce: { base: 3, at: [11, 25] }, speed: { base: 700 }, size: { base: 12 }, range: { base: 460 } },
    },
    // New weapons anyone can find
    dynamite: {
      name: 'Dynamite', icon: 'dynamite', era: 'industrial', behavior: 'rockfall', kind: 'Area', max: 30,
      blurb: 'Sticks of dynamite land on enemies and blow up a wide area.',
      stats: { cd: { base: 2.6, per: -0.048 }, dmg: { base: 32, per: 6 }, radius: { base: 54, per: 2 }, count: { base: 1, at: [11, 20, 30] } },
    },
    nailgun: {
      name: 'Nail Gun', icon: 'nailgun', era: 'modern', fx: 'nail', behavior: 'shoot', kind: 'Projectile', max: 30,
      blurb: 'Rapid-fire nails at the nearest enemy.',
      stats: { cd: { base: 0.6, per: -0.012 }, dmg: { base: 9, per: 1.8 }, count: { base: 1, at: [11, 20, 30] }, pierce: { base: 0, at: [16, 25] }, speed: { base: 560 }, size: { base: 8 }, range: { base: 400 } },
    },
    laserdisc: {
      name: 'Laser Disc', countName: 'disc', icon: 'disc', era: 'future', behavior: 'shoot', kind: 'Projectile', max: 30, spin: true,
      unlock: 'quest:soloboss', unlockText: 'Defeat a boss with only one weapon', cost: 75,
      blurb: 'Glowing discs that slice through a line of enemies.',
      stats: { cd: { base: 1.5, per: -0.032 }, dmg: { base: 20, per: 3.5 }, count: { base: 1, at: [11, 25] }, pierce: { base: 4, at: [6, 20] }, speed: { base: 300 }, size: { base: 16 }, range: { base: 420 } },
    },
    fists: {
      name: 'Fallen Star Fists', icon: 'gauntlet', era: 'stone', behavior: 'fists', kind: 'Melee', max: 30, countName: 'gauntlet',
      blurb: 'Floating star gauntlets throw piercing punches at enemies that get too close. Giant Tusk makes them bigger.',
      stats: { cd: { base: 1.1, per: -0.012 }, dmg: { base: 16, per: 2 }, count: { base: 2, per: 0.1 }, range: { base: 120, per: 4 }, size: { base: 1, per: 0.015 } },
    },
    bonetoss: {
      name: 'Bone Club', icon: 'bone', era: 'stone', behavior: 'shoot', kind: 'Projectile', max: 30, spin: true, countName: 'bone',
      unlock: 'quest:deaths20', unlockText: 'Die 20 times', cost: 300,
      blurb: 'Throw a bone that bounces from enemy to enemy.',
      stats: { cd: { base: 1.4, per: -0.015 }, dmg: { base: 14, per: 1.8 }, count: { base: 1, at: [9, 18, 27] }, bounce: { base: 2, at: [4, 7, 11, 14, 17, 21, 24, 28, 30] }, speed: { base: 420 }, size: { base: 10 }, range: { base: 380 } },
    },
    ark: {
      name: 'Ark of the Covenant', icon: 'ark', fx: 'lightray', behavior: 'thrust', kind: 'Melee', max: 30, signature: 'relic',
      blurb: 'Beams of holy light that pierce everything in their path.',
      stats: { cd: { base: 0.95, per: -0.02 }, dmg: { base: 56, per: 8.8 }, length: { base: 240, per: 7.5 }, count: { base: 3, at: [11, 20, 30] } },
    },
  },

  // effect: hearts | speed | count | damage | area | pickup | crit | critDamage | difficulty. amount is per level.
  // Hearts are whole numbers: +1 at level 1, then again each time the levels add up to another 1.
  // Attacks (count) add up in fractions; every whole number reached is one more attack.
  passives: {
    heart:   { name: 'Mammoth Heart', icon: 'heart', max: 30, effect: 'hearts', amount: 0.2, blurb: '+1 max heart now and every 5 levels. Heals 1.' },
    sandals: { name: 'Swift Sandals', icon: 'sandal', max: 30, effect: 'speed', amount: 0.075, blurb: '+7.5% move speed.' },
    totem:   { name: 'Tribal Totem', icon: 'totem', max: 30, effect: 'count', amount: 1, firstPick: 1, blurb: '+1 attack for every weapon. Rarer cards add part of another; each time the total reaches a whole number, every weapon gets one more attack.' },
    flint:   { name: 'Sharp Flint', icon: 'flint', max: 30, effect: 'damage', amount: 0.12, blurb: '+12% damage.' },
    tusk:    { name: 'Giant Tusk', icon: 'tusk', max: 30, effect: 'area', amount: 0.09, blurb: '+9% area and range.' },
    magnet:  { name: 'Lodestone', icon: 'lodestone', max: 30, effect: 'pickup', amount: 0.18, blurb: '+18% XP pickup range.' },
    crit:    { name: 'Focus', icon: 'crit', max: 30, effect: 'crit', amount: 0.045, blurb: '+4.5% critical hit chance (2x damage).\nOver 100%: chance of a DOUBLE CRIT (4x).' },
    critdmg: { name: 'Lethality', icon: 'fang', max: 30, effect: 'critDamage', amount: 0.225, blurb: 'Critical hits do +22.5% more damage.' },
    // English Tea: the first cup gives +15% attack speed (firstPick 1.5 levels), then +10% a level
    tea:     { name: 'English Tea', icon: 'tea', max: 30, effect: 'haste', amount: 0.1, firstPick: 1.5, unlock: 'quest:renmini', blurb: '+10% attack speed.' },
    danger:  { name: 'Difficulty', icon: 'wardrum', max: 30, effect: 'difficulty', amount: 0.05, blurb: '+5% more enemies and +5% enemy health. More enemies, more XP.' },
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
    apprentice: { name: 'Apprentice', sprite: 'apprentice', hp: 22, speed: 90, r: 10, xp: 1, scale: 1.5, color: '#e0c890' },
    duelist:    { name: 'Duelist', sprite: 'duelist', hp: 32, speed: 78, r: 10, xp: 1, scale: 1.5, color: '#3a4a8a', ai: 'zigzag' },
    halberdier: { name: 'Halberdier', sprite: 'halberdier', hp: 46, speed: 56, r: 11, xp: 1, scale: 1.5, color: '#b8324a', ai: 'shield', shield: 3 },
    clockwork:  { name: 'Clockwork Knight', sprite: 'clockwork', hp: 170, speed: 70, r: 12, xp: 5, scale: 1.6, color: '#c8923a', ai: 'charge' },
    gearling:   { name: 'Gear Beast', sprite: 'gearling', hp: 190, speed: 44, r: 15, xp: 5, scale: 1.6, color: '#b8a070', heavy: true, ai: 'split', splitInto: 'cog', splitCount: 4 },
    cog:        { name: 'Rolling Cog', sprite: 'cog', hp: 24, speed: 104, r: 8, xp: 1, scale: 1.5, color: '#b8a070' },
    automaton:  { name: 'Brass Automaton', sprite: 'automaton', hp: 700, speed: 32, r: 22, xp: 20, scale: 1.7, color: '#c8923a', heavy: true },
    thief:      { name: 'Treasure Thief', sprite: 'thief', hp: 60, speed: 118, r: 10, xp: 5, scale: 1.5, color: '#8a5ab0' },
    timecop:    { name: 'Time police', sprite: 'timecop', hp: 90, speed: 96, r: 12, xp: 5, scale: 1.55, color: '#3a6ac8' },
    trex:       { name: 'T-Rex', sprite: 'trex', hp: 4200, speed: 46, r: 34, xp: 0, scale: 2.2, color: '#b86a2a', boss: true, heavy: true },
    hydra:      { name: 'Hydra', sprite: 'hydra', hp: 11000, speed: 34, r: 36, xp: 0, scale: 2.2, color: '#3ab8a4', boss: true, heavy: true },
    dragon:     { name: 'Dragon', sprite: 'dragon', hp: 26000, speed: 40, r: 36, xp: 0, scale: 2.2, color: '#d84a2a', boss: true, heavy: true },
    mech:       { name: 'Steam Mech', sprite: 'mech', hp: 52000, speed: 40, r: 38, xp: 0, scale: 2.2, color: '#c8923a', boss: true, heavy: true },
    sweep:      { name: 'Chimney Sweep', sprite: 'sweep', hp: 24, speed: 92, r: 10, xp: 1, scale: 1.5, color: '#4a4448' },
    navvy:      { name: 'Navvy', sprite: 'navvy', hp: 36, speed: 58, r: 11, xp: 1, scale: 1.5, color: '#4a6aa0', ai: 'shield', shield: 3 },
    luddite:    { name: 'Luddite', sprite: 'luddite', hp: 30, speed: 76, r: 11, xp: 1, scale: 1.5, color: '#6a5c40', ai: 'zigzag' },
    steamhound: { name: 'Steam Hound', sprite: 'steamhound', hp: 180, speed: 84, r: 12, xp: 5, scale: 1.6, color: '#56565e', ai: 'charge' },
    coalcart:   { name: 'Coal Cart', sprite: 'coalcart', hp: 200, speed: 46, r: 15, xp: 5, scale: 1.6, color: '#2e2a30', heavy: true, ai: 'split', splitInto: 'coal', splitCount: 4 },
    coal:       { name: 'Coal Lump', sprite: 'coal', hp: 26, speed: 96, r: 8, xp: 1, scale: 1.5, color: '#2e2a30' },
    rat:        { name: 'Sewer Rat', sprite: 'rat', hp: 18, speed: 120, r: 8, xp: 1, scale: 1.4, color: '#7c7680' },
    furnace:    { name: 'Walking Furnace', sprite: 'furnace', hp: 760, speed: 32, r: 22, xp: 20, scale: 1.7, color: '#56565e', heavy: true },
    locomotive: { name: 'Iron Horse', sprite: 'locomotive', hp: 90000, speed: 46, r: 40, xp: 0, scale: 2.2, color: '#56565e', boss: true, heavy: true },
    punk:       { name: 'Punk', sprite: 'punk', hp: 26, speed: 94, r: 10, xp: 1, scale: 1.5, color: '#f04aa8', ai: 'zigzag' },
    agent:      { name: 'Agent', sprite: 'agent', hp: 34, speed: 70, r: 11, xp: 1, scale: 1.5, color: '#2a2a36' },
    soldier:    { name: 'Soldier', sprite: 'soldier', hp: 44, speed: 58, r: 11, xp: 1, scale: 1.5, color: '#6a7a40', ai: 'shield', shield: 3 },
    biker:      { name: 'Biker', sprite: 'biker', hp: 190, speed: 90, r: 13, xp: 5, scale: 1.6, color: '#b8322a', ai: 'charge' },
    drone:      { name: 'Drone', sprite: 'drone', hp: 210, speed: 60, r: 13, xp: 5, scale: 1.6, color: '#c8c8d8', heavy: true, ai: 'split', splitInto: 'minidrone', splitCount: 4 },
    minidrone:  { name: 'Mini Drone', sprite: 'minidrone', hp: 26, speed: 110, r: 7, xp: 1, scale: 1.5, color: '#c8c8d8' },
    taxi:       { name: 'Taxi', sprite: 'taxi', hp: 60, speed: 130, r: 12, xp: 1, scale: 1.5, color: '#f0c020' },
    tank:       { name: 'Tank', sprite: 'tank', hp: 820, speed: 30, r: 23, xp: 20, scale: 1.7, color: '#6a7a40', heavy: true },
    chopper:    { name: 'Attack Chopper', sprite: 'chopper', hp: 140000, speed: 70, r: 38, xp: 0, scale: 2.2, color: '#6a7a40', boss: true, heavy: true },
    android:    { name: 'Android', sprite: 'android', hp: 30, speed: 96, r: 10, xp: 1, scale: 1.5, color: '#c8d4ea' },
    cyborg:     { name: 'Cyborg', sprite: 'cyborg', hp: 40, speed: 76, r: 11, xp: 1, scale: 1.5, color: '#4a4a5c', ai: 'zigzag' },
    greyalien:  { name: 'Grey Alien', sprite: 'greyalien', hp: 34, speed: 70, r: 10, xp: 1, scale: 1.5, color: '#a0c098', ai: 'shield', shield: 3 },
    hoverbot:   { name: 'Hover Bot', sprite: 'hoverbot', hp: 200, speed: 80, r: 12, xp: 5, scale: 1.6, color: '#5af0ff', ai: 'charge' },
    ufo:        { name: 'UFO', sprite: 'ufo', hp: 230, speed: 52, r: 16, xp: 5, scale: 1.6, color: '#56565e', heavy: true, ai: 'split', splitInto: 'greyalien', splitCount: 3 },
    nanite:     { name: 'Nanite', sprite: 'nanite', hp: 22, speed: 130, r: 7, xp: 1, scale: 1.4, color: '#a8a8b8' },
    walker:     { name: 'Spider Walker', sprite: 'walker', hp: 900, speed: 34, r: 22, xp: 20, scale: 1.7, color: '#c8d4ea', heavy: true },
    overlord:   { name: 'AI Overlord', sprite: 'overlord', hp: 210000, speed: 40, r: 38, xp: 0, scale: 2.2, color: '#ff4a3a', boss: true, heavy: true },
  },

  // Mini-bosses (the giant elite at the halfway mark) use these moves: stomp, charge, summon, throw
  miniAttacks: ['stomp', 'charge', 'throw', 'summon'],

  ages: [
    {
      key: 'stone', name: 'STONE AGE', ground: 'cave', bg: '#70b834',
      decor: ['tree', 'pine', 'boulder', 'fern', 'bush', 'menhir', 'bones', 'fern', 'tree', 'campfire'],
      paintings: false,
      basic: ['rival', 'raptor', 'wolf'], medium: 'sabertooth', elite: 'mammoth', specials: ['golem'],
      stampede: 'wolf', stampedeName: 'STAMPEDE!', boss: 'trex', bossName: 'T-REX', bossAttacks: ['charge3', 'stomp', 'rocks', 'charge3', 'roar'], bossStyle: 'hunter',
      music: 'stone', bossMusic: 'stoneBoss', hpMul: 1, xpMul: 1, ease: 0.6,
    },
    {
      key: 'roman', name: 'ROMAN EMPIRE', ground: 'mosaic', bg: '#94b23e',
      decor: ['column', 'urn', 'broken', 'cypress', 'brazier', 'tree', 'bush', 'broken', 'cypress'],
      paintings: false,
      basic: ['legionary', 'gladiator', 'spearman'], medium: 'centurion', elite: 'chariot', specials: ['testudo'],
      stampede: 'chariot', stampedeName: 'CHARIOT RACE!', boss: 'hydra', bossName: 'HYDRA', bossAttacks: ['lunge', 'ring', 'pools', 'lunge', 'summon'], bossStyle: 'rooted',
      music: 'roman', bossMusic: 'romanBoss', hpMul: 2.4, xpMul: 2, ease: 0.75,
    },
    {
      key: 'medieval', name: 'MIDDLE AGES', ground: 'tapestry', bg: '#46963c',
      decor: ['banner', 'haybale', 'shrub', 'torch', 'gravestone', 'pine', 'tree', 'bush', 'pine'],
      paintings: false,
      basic: ['peasant', 'footman', 'jester'], medium: 'blackknight', elite: 'troll', specials: ['slime'],
      stampede: 'peasant', stampedeName: 'PEASANT MOB!', boss: 'dragon', bossName: 'DRAGON', bossAttacks: ['fly', 'breath', 'meteors', 'fly', 'sweep'], bossStyle: 'flyer',
      music: 'medieval', bossMusic: 'medievalBoss', hpMul: 4.5, xpMul: 3.2, ease: 0.9,
    },
    {
      key: 'renaissance', name: 'RENAISSANCE', ground: 'parchment', bg: '#68aa3e',
      decor: ['easel', 'gearpile', 'statue', 'lantern', 'cypress', 'tree', 'bush', 'cypress'],
      paintings: false,
      basic: ['apprentice', 'duelist', 'halberdier'], medium: 'clockwork', elite: 'automaton', specials: ['gearling'],
      stampede: 'cog', stampedeName: 'COG AVALANCHE!', boss: 'mech', bossName: 'STEAM MECH', bossAttacks: ['steam', 'laser', 'cogs', 'charge', 'summon'], bossStyle: 'mech',
      music: 'renaissance', bossMusic: 'renaissanceBoss', hpMul: 7.5, xpMul: 4.6,
    },
    {
      key: 'industrial', name: 'INDUSTRIAL AGE', ground: 'newsprint', bg: '#bc8038',
      decor: ['chimney', 'crate', 'lantern', 'barrel', 'rails', 'tree_autumn', 'tree_autumn', 'crate'],
      paintings: false,
      basic: ['sweep', 'navvy', 'luddite'], medium: 'steamhound', elite: 'furnace', specials: ['coalcart'],
      stampede: 'rat', stampedeName: 'RAT SWARM!', boss: 'locomotive', bossName: 'IRON HORSE', bossAttacks: ['charge3', 'smoke', 'coal', 'charge', 'summon'], bossStyle: 'train',
      music: 'industrial', bossMusic: 'industrialBoss', hpMul: 10.5, xpMul: 6,
    },
    {
      key: 'modern', name: 'MODERN AGE', ground: 'popart', bg: '#5cbc42',
      decor: ['hydrant', 'cone', 'trashcan', 'stopsign', 'bench', 'tree', 'bush', 'tree'],
      paintings: false,
      basic: ['punk', 'agent', 'soldier'], medium: 'biker', elite: 'tank', specials: ['drone'],
      stampede: 'taxi', stampedeName: 'RUSH HOUR!', boss: 'chopper', bossName: 'ATTACK CHOPPER', bossAttacks: ['missiles', 'strafe', 'missiles', 'summon', 'strafe'], bossStyle: 'chopper',
      music: 'modern', bossMusic: 'modernBoss', hpMul: 14.5, xpMul: 7.6,
    },
    {
      key: 'future', name: 'FAR FUTURE', ground: 'neongrid', bg: '#22a8a0',
      decor: ['pylon', 'crystalrock', 'pod', 'antenna', 'tree_alien', 'holosign', 'tree_alien', 'crystalrock'],
      paintings: false,
      basic: ['android', 'cyborg', 'greyalien'], medium: 'hoverbot', elite: 'walker', specials: ['ufo'],
      stampede: 'nanite', stampedeName: 'NANITE SWARM!', boss: 'overlord', bossName: 'AI OVERLORD', bossAttacks: ['orbital', 'grid', 'blink', 'laser', 'summon'], bossStyle: 'warp',
      music: 'future', bossMusic: 'futureBoss', hpMul: 20, xpMul: 9.6,
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
    { id: 'hearts', name: 'Thick Skin', icon: 'heart', max: 1, base: 80, grow: 80, amount: 1, blurb: '+1 starting heart.' },
    { id: 'damage', name: 'Strong Arm', icon: 'flint', max: 5, base: 40, grow: 40, amount: 0.06, blurb: '+6% damage.' },
    { id: 'speed', name: 'Quick Feet', icon: 'sandal', max: 5, base: 40, grow: 30, amount: 0.04, blurb: '+4% move speed.' },
    { id: 'xp', name: 'Wisdom', icon: 'gem_m', max: 5, base: 50, grow: 40, amount: 0.08, blurb: '+8% XP.' },
    { id: 'pickup', name: 'Long Reach', icon: 'lodestone', max: 3, base: 30, grow: 30, amount: 0.15, blurb: '+15% pickup range.' },
    { id: 'rerolls', name: 'Lucky Charm', icon: 'reroll', max: 3, base: 60, grow: 60, amount: 1, blurb: '+1 reroll each run.' },
    { id: 'coins', name: 'Pouch', icon: 'coin', max: 3, base: 40, grow: 40, amount: 20, blurb: 'Start with +20 coins.' },
    // costs: the price of each level, in order (instead of base + grow)
    { id: 'sparks', name: 'Sparks Gain', icon: 'spark', max: 4, costs: [50, 150, 250, 500], amount: 0.25, blurb: '+0.25x Sparks from every run.' },
    { id: 'revive', name: 'Second Wind', icon: 'feather', max: 1, base: 300, grow: 0, amount: 1, blurb: 'Come back to life once per run.' },
  ],

  // Relics: unlocked on the menu with Sparks, then found in treasure chests (take it or leave it)
  relics: [
    { id: 'monalisa', name: 'Mona Lisa', icon: 'monalisa', cost: 600, blurb: 'Every enemy stops to admire the masterpiece the first time it is hit (stunned for 1.5s).' },
    { id: 'alienegg', name: 'Alien Egg', icon: 'alienegg', cost: 1200, blurb: 'The prized egg of the Queen Alien. Taking damage releases a swarm of aliens that attacks nearby enemies.' },
    { id: 'excalibur', name: 'Excalibur', icon: 'excalibur', cost: 1800, blurb: 'You are worthy to wield the legendary sword! Hold it out in the direction you move.' },
    { id: 'declaration', name: 'Declaration of Independence', icon: 'declaration', cost: 2000, blurb: 'Home of the brave, land of the free! The max level of your weapons goes up by 5.' },
    { id: 'ark', name: 'Ark of the Covenant', icon: 'ark', cost: 2500, blurb: 'All your weapons and weapon slots are replaced by the Ark: piercing beams of holy light that do huge damage.' },
  ],

  // Owning both weapons of a combo gives a bonus (weapons keep their type)
  combos: [
    { id: 'whirlwind', name: 'Whirlwind', a: 'club', b: 'axes', blurb: 'Club swings hit all around you' },
    { id: 'torch', name: 'Torch Club', a: 'club', b: 'fire', blurb: 'Club hits set enemies on fire' },
    { id: 'rod', name: 'Lightning Rod', a: 'spear', b: 'bolt', blurb: 'Spear tips call down lightning' },
    { id: 'magma', name: 'Magma Rocks', a: 'rocks', b: 'fire', blurb: 'Falling rocks set enemies on fire' },
    { id: 'storm', name: 'Thunderstorm', a: 'rocks', b: 'bolt', blurb: 'Bolts strike 35% more often' },
    { id: 'pack', name: "Hunter's Pack", a: 'spear', b: 'axes', blurb: '+1 spear and +1 axe' },
  ],

  // Random events during an age
  events: [
    { id: 'gold', name: 'GOLD RUSH!', blurb: 'Enemies drop way more coins', color: '#f2c84b' },
    { id: 'eclipse', name: 'ECLIPSE!', blurb: 'Faster enemies, double XP', color: '#c890ff' },
    { id: 'meteors', name: 'METEOR SHOWER!', blurb: 'Rocks fall from the sky. Watch out!', color: '#ff9a4a' },
    { id: 'thief', name: 'TREASURE THIEF!', blurb: 'Catch him before he gets away', color: '#7ad0f4' },
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
  shoot: 'Fires projectiles at the nearest enemy (uses cd, dmg, count, pierce, bounce, speed, size, range)',
  gladius: 'Swords circle close to the player, points out, without spinning (uses dmg, size, count, spin, crit, radius, hitDelay)',
  fists: 'Floating gauntlets punch nearby enemies, piercing (uses cd, dmg, count, range, size; size grows with area)',
};

export const PASSIVE_EFFECTS = ['hearts', 'speed', 'count', 'damage', 'area', 'pickup', 'crit', 'critDamage', 'difficulty', 'haste'];
export const BOSS_ATTACKS = ['charge', 'charge3', 'stomp', 'rocks', 'roar', 'lunge', 'ring', 'pools', 'summon', 'breath', 'meteors', 'fly', 'sweep', 'steam', 'laser', 'cogs', 'smoke', 'coal', 'missiles', 'strafe', 'orbital', 'grid', 'blink'];
export const BOSS_STYLES = ['', 'hunter', 'rooted', 'flyer', 'mech', 'train', 'chopper', 'warp'];
export const MUSIC = ['stone', 'stoneBoss', 'roman', 'romanBoss', 'medieval', 'medievalBoss', 'renaissance', 'renaissanceBoss', 'industrial', 'industrialBoss', 'modern', 'modernBoss', 'future', 'futureBoss', 'police', 'title'];
export const GROUNDS = ['cave', 'mosaic', 'tapestry', 'parchment', 'newsprint', 'popart', 'neongrid'];
export const ENEMY_AI = ['', 'charge', 'shield', 'split', 'zigzag'];
