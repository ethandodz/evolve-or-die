# Evolve or Die

A survivors-like roguelike where you fight through the ages of history. Move to dodge, your weapons attack on their own, collect XP, and pick upgrades. Summon each age's boss when you feel strong enough, beat it, shop with the time wizard, and step through the portal to the next age.

**Play:** https://ethandodz.github.io/evolve-or-die/

## Contents

- 6 characters, each with a perk and a drawback. Grug the caveman to start, plus one unlocked by each age's boss: Taka the Dino Tamer (T-Rex, a pet raptor fights with you), Ora the Shaman (Hydra), Edric the Knight (Dragon) and Nico the Inventor (Steam Mech, weapons attack faster). Marcus the Centurion unlocks at 1500 total kills
- 4 ages: Stone Age (boss: T-Rex), Roman Empire (boss: Hydra), Middle Ages (boss: Dragon) and Renaissance (boss: Steam Mech, which overheats and takes double damage)
- 6 weapons: Club, Orbiting Axes, Spear, Fire Ring, Rock Fall, Sky Bolt
- Each character starts with their own signature weapon that no one else can get, and later unlocks have stronger ones: Bone Club (Grug), Amber Meteors (Taka), Spirit Fire (Ora), Golden Pilum (Marcus), Holy Blades (Edric), Tesla Coil (Nico). They count as their normal weapon for combos and stay put when a Confusion Potion is used.
- 6 passives: Mammoth Heart, Swift Sandals, Tribal Totem, Sharp Flint, Giant Tusk, Lodestone
- 3 weapon slots, 3 passive slots, 3 choices per level, 3 rerolls per run
- Mini-boss at the halfway mark, stampede events, and the time police if you don't summon the boss within 5 minutes
- Portal and wizard shop between ages (coins are shop-only)
- A run ends when you die, or the first time you ever beat an age's boss. After that, beating it opens the portal.
- Summoning a boss early gives up to x3 loot (shown under the Summon button)
- A free second weapon one minute into the first age
- Enemy moves: chargers (aim, then dash), shields (break after a few hits), splitters, zigzaggers, and rare glowing elites
- Wizard shop: choose which weapon to upgrade, reroll the stock, and one rare item per visit
- Sparks: a currency you keep between runs, spent on permanent upgrades (EVOLVE on the main menu)
- Level-up cards can be Rare (x1.2), Epic (x1.5) or Legendary (x2): still one level, but that level's stat boost is bigger (Rare Sharp Flint = +14% damage instead of +12%). Hearts and attacks are whole numbers, so those are only Common or Legendary.
- Mini-bosses have a health bar and special moves; each boss fights differently (T-Rex hunts, Hydra burrows and enrages, Dragon flies and dives)
- Weapons and passives can level higher in each later age
- After the last boss, the wizard sells a Magic Mirror that loops the run back to the first age with tougher enemies
- Daily challenge: two twists a day, the same for everyone, +10 Sparks for the first run
- Treasure chests (from bosses, the treasure thief and rarely a glowing elite) spin out 1, 3 or 5 rewards: coins, a full heal, a Lucky Star (next level-up cards are all Rare or better), a reroll, an XP magnet or Sparks. They never give upgrades, so every upgrade is still your pick on level-up.
- Weapon combos: owning both weapons of a pair turns on a bonus (Whirlwind, Torch Club, Lightning Rod, Magma Rocks, Thunderstorm, Hunter's Pack)
- Random events twice an age: Gold Rush, Eclipse, Meteor Shower, Treasure Thief
- Relics: unlock them with Sparks (RELICS on the main menu), then they can turn up in treasure chests, where you take one or leave it for coins. Mona Lisa (first hit stuns each enemy), Rosetta Stone (+50% XP), Holy Grail (heal every 30s), Golden Fleece (double coins, -1 max heart), Pandora's Box (+50% enemies, XP and coins), Ark of the Covenant (all weapons and slots replaced by piercing beams of holy light)
- Quests on the main menu pay Sparks; a note on the results screen shows what's closest to done
- First-run tips, and settings for vibration and screen shake
- Character select shows each character's weapon, its type (Melee, Orbit, Aura, Area) and what that type does
- Run stats after every run: damage and kills for each weapon (plus pet, burning and boss shockwave)
- Scores: your best runs on this device, plus an online top 10 and cloud saves once Supabase is set up (see supabase/README.md)

## Controls

- PC: WASD or arrow keys. Esc or P pauses.
- Phone: touch and drag anywhere for the floating joystick.

## Testing tips

- Add `?test` to the URL for 60-second ages and weaker bosses.
- Hold R for 2 seconds on the title screen to reset saved progress.

## Develop

```
npm install
npm run dev     # local server
npm run build   # production build in dist/
```

Built with Phaser 3 and Vite. Art is drawn in code (src/art.js) and sounds and music are generated with Web Audio (src/audio.js), so there are no asset licensing issues. Tuning numbers live in src/data.js.
