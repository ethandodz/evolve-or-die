import Phaser from 'phaser';
import { audio } from '../audio.js';
import { save, persist, resetProgress } from '../save.js';
import { CHARACTERS, AGES, WEAPONS, ENEMIES } from '../data.js';
import { W, H, text, button, panel, settingsPanel, COLORS, fmtTime } from '../ui.js';

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
      button(this, W / 2, 520, 240, 56, 'PLAY', () => this.showCharacterSelect(), { size: 20, color: COLORS.green, hi: COLORS.greenHi }),
      button(this, W / 2, 596, 240, 48, 'SETTINGS', () => this.openSettings()),
      button(this, W / 2, 660, 240, 44, 'EDITOR', () => { window.location.href = 'editor.html'; }, { size: 12, color: COLORS.purple, hi: COLORS.purpleHi }),
    ];

    const beaten = AGES.filter(a => save.bossesBeaten[a.key]).map(a => a.bossName);
    const info = [`RUNS ${save.runs}`, `BEST ${fmtTime(save.bestTime)}`];
    text(this, W / 2, 712, info.join('   '), 10, '#d8b890');
    text(this, W / 2, 736, beaten.length ? `BOSSES BEATEN: ${beaten.join(', ')}` : 'NO BOSSES BEATEN YET', 8, '#d8b890');
    text(this, W / 2, 770, 'v0.1 MVP', 8, '#5a4a6a');

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
    c.add(panel(this, W / 2, H / 2, 410, 560));
    c.add(text(this, W / 2, H / 2 - 245, 'CHOOSE YOUR\nCHARACTER', 16, '#e8c070'));
    const beatenBosses = new Set(AGES.filter(a => save.bossesBeaten[a.key]).map(a => a.boss));
    const isOpen = (ch) => !ch.unlock || ch.unlock === 'start' || beatenBosses.has(ch.unlock) || this.unlockAll;
    const list = CHARACTERS.slice(0, 6);
    let selected = list.find(isOpen) || list[0];
    const desc = text(this, W / 2, H / 2 + 112, '', 8, '#e8d0b0');
    c.add(desc);
    const cards = [];
    const refresh = () => {
      cards.forEach(({ ch, g, x, y }) => {
        const open = isOpen(ch), sel = ch === selected;
        g.clear();
        g.fillStyle(open ? (sel ? 0x5a3a22 : 0x3a2618) : 0x2a1c14, 1).fillRect(x - 56, y - 76, 112, 150);
        g.lineStyle(3, sel ? 0xf0c060 : open ? COLORS.border : 0x4a3a30, 1).strokeRect(x - 56, y - 76, 112, 150);
      });
      const w = WEAPONS[selected.weapon];
      desc.setText(`${selected.name}, ${selected.title.toUpperCase()}\nStarts with: ${w ? w.name : '?'}\n${selected.hearts || 5} hearts`);
    };
    list.forEach((ch, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const x = W / 2 - 130 + col * 130, y = H / 2 - 120 + row * 160;
      const g = this.add.graphics();
      c.add(g);
      cards.push({ ch, g, x, y });
      const open = isOpen(ch);
      const spr = this.add.sprite(x, y - 18, this.textures.exists(ch.sprite) ? ch.sprite : 'caveman', 0);
      spr.setScale(Math.min(2.6, 92 / spr.height));       // big detailed sprites fit the card
      if (!open) spr.setTintFill(0x140a06);
      else this.tweens.add({ targets: spr, y: y - 23, yoyo: true, repeat: -1, duration: 500 + i * 40 });
      c.add(spr);
      if (!open) c.add(this.add.image(x, y - 18, 'lock').setScale(2.4));
      c.add(text(this, x, y + 46, open ? ch.name : '???', 10, open ? '#ffffff' : '#7a6a5a'));
      const boss = Object.values(ENEMIES).find((e, k) => Object.keys(ENEMIES)[k] === ch.unlock);
      c.add(text(this, x, y + 62, open ? ch.title : `Beat ${boss ? boss.name : 'a boss'}`, 6, '#c0a080'));
      const hit = this.add.rectangle(x, y, 112, 150, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => { if (!open) { audio.play('deny'); return; } audio.play('select'); selected = ch; refresh(); });
      c.add(hit);
    });
    refresh();
    c.add(button(this, W / 2, H / 2 + 175, 260, 56, 'START RUN', () => this.startRun(selected.key), { size: 18, color: COLORS.green, hi: COLORS.greenHi }));
    c.add(button(this, W / 2, H / 2 + 240, 160, 40, 'BACK', () => { c.destroy(); this.mainButtons.forEach(b => b.setVisible(true)); }, { size: 12 }));
  }

  startRun(character) {
    save.runs++;
    persist();
    audio.stopMusic();
    this.scene.start('Game', { character });
  }
}
