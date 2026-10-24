import Phaser from 'phaser';
import { audio } from '../audio.js';
import { save, persist, resetProgress } from '../save.js';
import { CHARACTERS, AGES, WEAPONS } from '../data.js';
import { W, H, text, button, panel, settingsPanel, COLORS, fmtTime } from '../ui.js';

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    audio.setVolumes(save.settings.music, save.settings.sfx);
    this.cameras.main.setBackgroundColor('#120c18');
    this.bg = this.add.tileSprite(W / 2, H / 2, W, H, 'ground_stone').setScale(2).setAlpha(0.35);
    this.add.rectangle(W / 2, H / 2, W, H, 0x120c18, 0.45);

    // March of the ages behind the title
    const marchers = ['wolf', 'rival', 'raptor', 'legionary', 'spearman', 'mammoth', 'centurion'];
    this.marchers = [];
    for (let i = 0; i < 7; i++) {
      const m = this.add.sprite(-60 - i * 80, 560 + (i % 2) * 18, marchers[i], 0).setScale(2.5).setAlpha(0.8);
      m.speed = 30 + Math.random() * 15;
      this.marchers.push(m);
    }

    const t1 = text(this, W / 2, 150, 'EVOLVE', 44, '#e8c070');
    const t2 = text(this, W / 2, 210, 'OR DIE', 44, '#d83c3c');
    this.tweens.add({ targets: [t1, t2], y: '+=6', yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' });
    text(this, W / 2, 262, 'SURVIVE THE AGES', 10, '#c0b0d0');

    this.hero = this.add.sprite(W / 2, 380, 'caveman', 0).setScale(6);
    this.add.image(W / 2, 430, 'shadow').setScale(5).setDepth(-1);
    this.time.addEvent({ delay: 220, loop: true, callback: () => this.hero.setFrame(this.hero.frame.name === 0 ? 1 : 0) });

    this.mainButtons = [
      button(this, W / 2, 520, 240, 56, 'PLAY', () => this.showCharacterSelect(), { size: 20, color: COLORS.green, hi: COLORS.greenHi }),
      button(this, W / 2, 600, 240, 48, 'SETTINGS', () => this.openSettings()),
    ];

    const beaten = AGES.filter(a => save.bossesBeaten[a.key]).map(a => a.bossName);
    const info = [`RUNS ${save.runs}`, `BEST ${fmtTime(save.bestTime)}`];
    text(this, W / 2, 690, info.join('   '), 10, '#a090b0');
    text(this, W / 2, 715, beaten.length ? `BOSSES BEATEN: ${beaten.join(', ')}` : 'NO BOSSES BEATEN YET', 8, '#a090b0');
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
    CHARACTERS.forEach((ch, i) => {
      const x = W / 2 - 130 + i * 130, y = H / 2 - 70;
      const card = this.add.graphics();
      card.fillStyle(ch.locked ? 0x2a2234 : 0x3a2a4a, 1).fillRect(x - 56, y - 90, 112, 200);
      card.lineStyle(3, ch.locked ? 0x4a4458 : COLORS.border, 1).strokeRect(x - 56, y - 90, 112, 200);
      c.add(card);
      if (ch.locked) {
        c.add(this.add.sprite(x, y - 20, 'caveman', 0).setScale(4).setTintFill(0x0c0810));
        c.add(this.add.image(x, y - 20, 'lock').setScale(3));
      } else {
        const s = this.add.sprite(x, y - 20, ch.key, 0).setScale(4);
        this.tweens.add({ targets: s, y: y - 26, yoyo: true, repeat: -1, duration: 500 });
        c.add(s);
        c.add(this.add.image(x, y + 45, WEAPONS[ch.weapon].icon).setScale(2));
      }
      c.add(text(this, x, y + 75, ch.name, 12, ch.locked ? '#6a5a7a' : '#ffffff'));
      c.add(text(this, x, y + 98, ch.title, 6, '#a090b0'));
    });
    c.add(text(this, W / 2, H / 2 + 80, 'GRUG starts with a CLUB.\nBeat age bosses to unlock\nmore characters later.', 8, '#c0b0d0'));
    c.add(button(this, W / 2, H / 2 + 160, 260, 56, 'START RUN', () => this.startRun('caveman'), { size: 18, color: COLORS.green, hi: COLORS.greenHi }));
    c.add(button(this, W / 2, H / 2 + 230, 160, 40, 'BACK', () => { c.destroy(); this.mainButtons.forEach(b => b.setVisible(true)); }, { size: 12 }));
  }

  startRun(character) {
    save.runs++;
    persist();
    audio.stopMusic();
    this.scene.start('Game', { character });
  }
}
