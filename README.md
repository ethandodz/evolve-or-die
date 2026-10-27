# Evolve or Die

A survivors-like roguelike where you fight through the ages of history. Move to dodge, your weapons attack on their own, collect XP, and pick upgrades. Summon each age's boss when you feel strong enough, beat it, shop with the time wizard, and step through the portal to the next age.

**Play:** https://ethandodz.github.io/evolve-or-die/

## Contents

- 4 characters, each with a perk and a drawback: Grug the caveman, plus Ora and Edric (unlocked by beating bosses) and Marcus the Centurion (1500 total kills)
- 3 ages: Stone Age (boss: T-Rex), Roman Empire (boss: Hydra) and Middle Ages (boss: Dragon)
- 6 weapons: Club, Orbiting Axes, Spear, Fire Ring, Rock Fall, Sky Bolt
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
