import Phaser from 'phaser';
import { audio } from '../audio.js';
import { save, persist, resetProgress } from '../save.js';
import { CHARACTERS, AGES, WEAPONS, ENEMIES, META, TWISTS } from '../data.js';
import { W, H, text, button, panel, settingsPanel, COLORS, fmtTime, FONT } from '../ui.js';

const fit = (img, size) => { const f = img.frame; return img.setScale(Math.min(size / f.width, size / f.height)); };

// Today's daily challenge: same twists and weapon for everyone on the same date
export function todaysDaily() {
  const d = new Date();
  const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  let seed = 0;
  for (const ch of date) seed = (seed * 31 + ch.charCodeAt(0)) % 2147483647;
  const rnd = () => { seed = (seed * 16807 + 11) % 2147483647; return seed / 2147483647; };
  const pool = (TWISTS || []).slice();
  const twists = [];
  while (twists.length < 2 && pool.length) twists.push(pool.splice(Math.floor(rnd() * pool.length), 1)[0].id);
  const keys = Object.keys(WEAPONS);
  const weapon = twists.includes('random') ? keys[Math.floor(rnd() * keys.length)] : null;
  return { date, twists, weapon };
}

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    audio.setVolumes(save.settings.music, save.settings.sfx);
    this.cameras.main.setBackgroundColor('#120c18');
    this.bg = this.add.tileSprite(W / 2, H / 2, W, H, 'ground_cave').setTileScale(1.5).setAlpha(0.5);
    this.add.rectangle(W / 2, H / 2, W, H, 0x1e1009, 0.55);
    for (let i = 0; i < 8; i++) this.add.image(Phaser.Math.Between(20, W - 20), Phaser.Math.Between(60, H - 60), ['handprint', 'deer', 'hunters'][i % 3]).setScale(2).setAlpha(0.35);

    // March of the ages behind the title
    const marchers = ['wolf', 'rival', 'raptor', 'legionary', 'spearman', 'mammoth', 'centurion'];
    this.marchers = [];
    for (let i = 0; i < 7; i++) {
      const m = this.add.sprite(-60 - i * 80, 560 + (i % 2) * 18, marchers[i], 0).setScale(1.6).setAlpha(0.85);
      m.speed = 30 + Math.random() * 15;
      this.marchers.push(m);
    }

    const t1 = text(this, W / 2, 150, 'EVOLVE', 44, '#e8c070');
    const t2 = text(this, W / 2, 210, 'OR DIE', 44, '#d83c3c');
    this.tweens.add({ targets: [t1, t2], y: '+=6', yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' });
    text(this, W / 2, 262, 'SURVIVE THE AGES', 10, '#c0b0d0');

    this.hero = this.add.sprite(W / 2, 385, 'caveman', 0).setScale(4);
    this.add.image(W / 2, 438, 'shadow').setScale(4, 3).setDepth(-1);
    this.time.addEvent({ delay: 220, loop: true, callback: () => this.hero.setFrame(this.hero.frame.name === 0 ? 1 : 0) });

    this.mainButtons = [
      button(this, W / 2, 500, 260, 56, 'PLAY', () => this.showCharacterSelect(), { size: 20, color: COLORS.green, hi: COLORS.greenHi }),
      button(this, W / 2 - 68, 568, 124, 48, 'DAILY', () => this.showDaily(), { size: 10, color: COLORS.red, hi: COLORS.redHi, icon: 'skull', iconScale: 1.6 }),
      button(this, W / 2 + 68, 568, 124, 48, 'EVOLVE', () => this.showUpgrades(), { size: 10, icon: 'spark', iconScale: 1.8 }),
      button(this, W / 2 - 68, 630, 124, 42, 'SETTINGS', () => this.openSettings(), { size: 8 }),
      button(this, W / 2 + 68, 630, 124, 42, 'EDITOR', () => { window.location.href = 'editor.html'; }, { size: 8, color: COLORS.purple, hi: COLORS.purpleHi }),
    ];
    // Sparks you own
    this.add.image(W - 92, 26, 'spark').setScale(2);
    this.sparkText = text(this, W - 76, 26, String(save.sparks), 12, '#ffe060', 0);

    const beaten = AGES.filter(a => save.bossesBeaten[a.key]).map(a => a.bossName);
    const info = [`RUNS ${save.runs}`, `BEST ${fmtTime(save.bestTime)}`];
    text(this, W / 2, 712, info.join('   '), 10, '#d8b890');
    text(this, W / 2, 736, beaten.length ? `BOSSES BEATEN: ${beaten.join(', ')}` : 'NO BOSSES BEATEN YET', 8, '#d8b890');
    text(this, W / 2, 770, 'v0.2', 8, '#5a4a6a');

    this.input.once('pointerdown', () => { audio.unlock(); audio.playMusic('title'); });
    this.input.keyboard.once('keydown', () => { audio.unlock(); audio.playMusic('title'); });
    if (audio.ctx) audio.playMusic('title');

    // Hidden reset for testers: hold R for 2 seconds on the title screen
    this.rHeld = 0;
    this.keyR = this.input.keyboard.addKey('R');
  }

  update(_, dtMs) {
    const dt = dtMs / 1000;
    this.bg.tilePositionX += dt * 8;
    for (const m of this.marchers) {
      m.x += m.speed * dt;
      if (m.x > W + 60) m.x -= W + 600;
      m.setFrame(Math.floor(this.time.now / 180 + m.speed) % 2);
    }
    if (this.keyR.isDown) {
      this.rHeld += dt;
      if (this.rHeld > 2 && !this.didReset) { this.didReset = true; resetProgress(); this.scene.restart(); }
    } else this.rHeld = 0;
  }

  openSettings() {
    this.mainButtons.forEach(b => b.setVisible(false));
    settingsPanel(this, () => this.mainButtons.forEach(b => b.setVisible(true)));
  }

  showCharacterSelect() {
    audio.unlock();
    this.mainButtons.forEach(b => b.setVisible(false));
    const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive());
    c.add(panel(this, W / 2, H / 2, 410, 600));
    c.add(text(this, W / 2, H / 2 - 262, 'CHOOSE YOUR\nCHARACTER', 16, '#e8c070'));
    const beatenBosses = new Set(AGES.filter(a => save.bossesBeaten[a.key]).map(a => a.boss));
    // unlock: 'start', a boss key, or 'kills:N' (enemies defeated over all runs)
    const killsNeeded = (ch) => (String(ch.unlock || '').startsWith('kills:') ? parseInt(ch.unlock.slice(6), 10) || 0 : 0);
    const isOpen = (ch) => !ch.unlock || ch.unlock === 'start' || beatenBosses.has(ch.unlock)
      || (killsNeeded(ch) && save.totalKills >= killsNeeded(ch)) || this.unlockAll;
    const lockText = (ch) => {
      const k = killsNeeded(ch);
      if (k) return `${Math.min(save.totalKills, k)}/${k} kills`;
      const boss = ENEMIES[ch.unlock];
      return `Beat ${boss ? boss.name : 'a boss'}`;
    };
    const list = CHARACTERS.slice(0, 8);
    // Up to 3 per row (4 cards don't fit in one row, so they go 2 x 2)
    const cols = list.length === 4 ? 2 : Math.min(3, Math.max(1, list.length));
    const cw = 112, ch0 = 120, gap = 122;
    let selected = list.find(isOpen) || list[0];
    const desc = text(this, W / 2, H / 2 + 92, '', 8, '#e8d0b0');
    const perk = text(this, W / 2, H / 2 + 140, '', 8, '#9ae07a');
    const drawback = text(this, W / 2, H / 2 + 160, '', 8, '#ff9a8a');
    c.add([desc, perk, drawback]);
    const cards = [];
    const refresh = () => {
      cards.forEach(({ ch, g, x, y }) => {
        const open = isOpen(ch), sel = ch === selected;
        g.clear();
        g.fillStyle(open ? (sel ? 0x5a3a22 : 0x3a2618) : 0x2a1c14, 1).fillRect(x - cw / 2, y - ch0 / 2, cw, ch0);
        g.lineStyle(3, sel ? 0xf0c060 : open ? COLORS.border : 0x4a3a30, 1).strokeRect(x - cw / 2, y - ch0 / 2, cw, ch0);
      });
      const w = WEAPONS[selected.weapon];
      desc.setText(`${selected.name}, ${selected.title.toUpperCase()}\nStarts with: ${w ? w.name : '?'}\n${selected.hearts || 5} hearts`);
      perk.setText(selected.perk ? `+ ${selected.perk}` : '');
      drawback.setText(selected.drawback ? `- ${selected.drawback}` : '');
    };
    list.forEach((ch, i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const inRow = Math.min(cols, list.length - row * cols);
      const x = W / 2 - ((inRow - 1) * gap) / 2 + col * gap, y = H / 2 - 160 + row * 130;
      const g = this.add.graphics();
      c.add(g);
      cards.push({ ch, g, x, y });
      const open = isOpen(ch);
      const spr = this.add.sprite(x, y - 14, this.textures.exists(ch.sprite) ? ch.sprite : 'caveman', 0).setScale(2);
      if (!open) spr.setTintFill(0x140a06);
      else this.tweens.add({ targets: spr, y: y - 18, yoyo: true, repeat: -1, duration: 500 + i * 40 });
      c.add(spr);
      if (!open) c.add(this.add.image(x, y - 14, 'lock').setScale(2));
      c.add(text(this, x, y + 34, open ? ch.name : '???', 9, open ? '#ffffff' : '#7a6a5a'));
      c.add(text(this, x, y + 49, open ? ch.title : lockText(ch), 6, '#c0a080'));
      const hit = this.add.rectangle(x, y, cw, ch0, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => { if (!open) { audio.play('deny'); return; } audio.play('select'); selected = ch; refresh(); });
      c.add(hit);
    });
    refresh();
    c.add(button(this, W / 2, H / 2 + 210, 260, 52, 'START RUN', () => this.startRun(selected.key), { size: 18, color: COLORS.green, hi: COLORS.greenHi }));
    c.add(button(this, W / 2, H / 2 + 268, 160, 36, 'BACK', () => { c.destroy(); this.mainButtons.forEach(b => b.setVisible(true)); }, { size: 12 }));
  }

  startRun(character, daily = null) {
    save.runs++;
    persist();
    audio.stopMusic();
    this.scene.start('Game', { character, daily });
  }

  // Permanent upgrades bought with Sparks
  showUpgrades() {
    audio.unlock();
    this.mainButtons.forEach(b => b.setVisible(false));
    const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive());
    c.add(panel(this, W / 2, H / 2, 420, 740));
    c.add(text(this, W / 2, 62, 'EVOLVE', 22, '#e8c070'));
    c.add(text(this, W / 2, 90, 'Upgrades that last forever', 8, '#c0a080'));
    c.add(this.add.image(W / 2 - 40, 118, 'spark').setScale(2));
    const have = text(this, W / 2 - 22, 118, '', 12, '#ffe060', 0);
    c.add(have);
    const rows = this.add.container(0, 0);
    c.add(rows);
    const cost = (m) => m.base + m.grow * (save.upgrades[m.id] || 0);
    const draw = () => {
      rows.removeAll(true);
      have.setText(String(save.sparks));
      this.sparkText.setText(String(save.sparks));
      (META || []).forEach((m, i) => {
        const y = 160 + i * 66;
        const lvl = save.upgrades[m.id] || 0;
        const maxed = lvl >= m.max;
        const g = this.add.graphics();
        g.fillStyle(0x1e1009, 1).fillRect(W / 2 - 196, y - 29, 392, 60);
        g.fillStyle(0x3a2618, 1).fillRect(W / 2 - 194, y - 27, 388, 56);
        rows.add(g);
        if (this.textures.exists(m.icon)) rows.add(fit(this.add.image(W / 2 - 168, y, m.icon, 0), 36));
        rows.add(text(this, W / 2 - 140, y - 13, m.name.toUpperCase(), 9, '#ffffff', 0));
        rows.add(this.add.text(W / 2 - 140, y + 8, m.blurb, { fontFamily: FONT, fontSize: '7px', color: '#d0b890' }).setOrigin(0, 0.5));
        // Level pips
        for (let k = 0; k < m.max; k++) rows.add(this.add.rectangle(W / 2 - 136 + k * 12, y + 22, 9, 4, k < lvl ? 0xffe060 : 0x5a4030));
        const b = button(this, W / 2 + 140, y, 96, 40, maxed ? 'MAX' : String(cost(m)), () => {
          if (maxed) return;
          const c2 = cost(m);
          if (save.sparks < c2) { audio.play('deny'); return; }
          save.sparks -= c2;
          save.upgrades[m.id] = lvl + 1;
          persist();
          audio.play('buy');
          draw();
        }, { size: 10, icon: maxed ? null : 'spark', iconScale: 1.4, color: maxed ? COLORS.grey : COLORS.green, hi: maxed ? COLORS.grey : COLORS.greenHi });
        if (!maxed && save.sparks < cost(m)) b.setAlpha(0.55);
        if (maxed) b.setDisabled(true);
        rows.add(b);
      });
    };
    draw();
    c.add(text(this, W / 2, 698, 'Earn Sparks every run: bosses, big enemies,\ntime survived and leftover coins.', 7, '#c0a080'));
    c.add(button(this, W / 2, 742, 160, 36, 'BACK', () => { c.destroy(); this.mainButtons.forEach(b => b.setVisible(true)); }, { size: 12 }));
  }

  showDaily() {
    audio.unlock();
    this.mainButtons.forEach(b => b.setVisible(false));
    const daily = todaysDaily();
    const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive());
    c.add(panel(this, W / 2, H / 2, 400, 560));
    c.add(text(this, W / 2, H / 2 - 236, 'DAILY CHALLENGE', 16, '#d83c3c'));
    c.add(text(this, W / 2, H / 2 - 208, daily.date, 8, '#c0a080'));
    c.add(text(this, W / 2, H / 2 - 180, 'Same run for everyone today', 8, '#d0b890'));
    daily.twists.forEach((id, i) => {
      const t = TWISTS.find(x => x.id === id);
      const y = H / 2 - 120 + i * 76;
      const g = this.add.graphics();
      g.fillStyle(0x1e1009, 1).fillRect(W / 2 - 170, y - 30, 340, 62);
      g.fillStyle(0x5a2018, 1).fillRect(W / 2 - 168, y - 28, 336, 58);
      c.add(g);
      c.add(text(this, W / 2, y - 10, t.name.toUpperCase(), 12, '#ffd0a0'));
      c.add(text(this, W / 2, y + 14, t.blurb, 8, '#ffffff'));
    });
    if (daily.weapon) c.add(text(this, W / 2, H / 2 + 34, `Starting weapon: ${WEAPONS[daily.weapon].name}`, 8, '#7ad0f4'));
    const d = save.daily;
    const today = d.date === daily.date;
    c.add(text(this, W / 2, H / 2 + 70, today && d.best ? `TODAY'S BEST: ${fmtTime(d.best)}  (${d.bestKills} kills)` : 'No run yet today', 9, '#e8c070'));
    if (!(today && d.played)) {
      c.add(this.add.image(W / 2 - 92, H / 2 + 100, 'spark').setScale(1.6));
      c.add(text(this, W / 2 - 78, H / 2 + 100, 'First run today: +10 Sparks', 8, '#ffe060', 0));
    }
    c.add(button(this, W / 2, H / 2 + 165, 260, 56, 'START', () => this.startRun(CHARACTERS[0].key, daily), { size: 18, color: COLORS.green, hi: COLORS.greenHi }));
    c.add(button(this, W / 2, H / 2 + 232, 160, 40, 'BACK', () => { c.destroy(); this.mainButtons.forEach(b => b.setVisible(true)); }, { size: 12 }));
  }
}
