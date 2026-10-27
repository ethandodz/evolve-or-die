import Phaser from 'phaser';
import { audio } from '../audio.js';
import { save } from '../save.js';
import { WEAPONS, PASSIVES, AGES, RARITIES } from '../data.js';
import { W, H, text, button, panel, settingsPanel, COLORS, fmtTime, FONT } from '../ui.js';
import { controls } from '../controls.js';


// Scale an image so it fits in a box
const fit = (img, size) => { const f = img.frame; return img.setScale(Math.min(size / f.width, size / f.height)); };

export default class UI extends Phaser.Scene {
  constructor() { super('UI'); }

  create() {
    this.g = this.scene.get('Game');
    this.modal = null;
    this.ready = true;

    // XP bar
    this.xpBg = this.add.rectangle(0, 0, W, 16, 0x1e1009).setOrigin(0, 0).setStrokeStyle(2, 0xc89a5a);
    this.xpFill = this.add.rectangle(2, 2, 0, 12, 0xd0601e).setOrigin(0, 0);
    // Stone tablet behind the timer
    panel(this, W / 2, 50, 130, 44);
    this.xpShine = this.add.rectangle(2, 2, 0, 3, 0xffffff, 0.35).setOrigin(0, 0);
    this.lvText = text(this, 8, 9, 'LV 1', 8, '#ffffff', 0);

    // Hearts
    this.hearts = [];
    // Timer and age
    this.timer = text(this, W / 2, 40, '5:00', 18);
    this.ageText = text(this, W / 2, 62, '', 8, '#e8c070');

    // Pause button
    this.pauseBtn = button(this, W - 28, 44, 40, 40, 'II', () => this.togglePause(), { size: 12 });

    // Coins and kills
    this.add.image(W - 104, 82, 'coin').setScale(2);
    this.coinText = text(this, W - 90, 82, '0', 10, '#f2c84b', 0);
    this.add.image(W - 104, 104, 'skull').setScale(1.6);
    this.killText = text(this, W - 90, 104, '0', 10, '#ffffff', 0);
    this.add.image(W - 104, 124, 'spark').setScale(1.4);
    this.sparkText = text(this, W - 90, 124, '0', 10, '#ffe060', 0);

    // Weapon and passive slots
    this.slots = [];
    for (let row = 0; row < 2; row++) for (let i = 0; i < 3; i++) {
      const x = 22 + i * 34, y = 82 + row * 34;
      const bg = this.add.rectangle(x, y, 30, 30, 0x1e1009, 0.7).setStrokeStyle(2, row ? 0x7a48b0 : 0x8a5a2e);
      const ic = this.add.image(x, y, 'club').setScale(1.6).setVisible(false);
      const lv = this.add.text(x + 14, y + 14, '', { fontFamily: FONT, fontSize: '8px', color: '#ffffff', stroke: '#120c18', strokeThickness: 3 }).setOrigin(1, 1);
      this.slots.push({ bg, ic, lv });
    }

    // Summon boss button
    this.summon = button(this, W - 80, 160, 140, 44, 'SUMMON', () => this.g.summonBoss(), { size: 10, color: COLORS.red, hi: COLORS.redHi, icon: 'skull', iconScale: 2 });

    this.lootText = text(this, W - 80, 192, '', 8, '#f2c84b');

    // Boss bar
    this.bossBox = this.add.container(W / 2, 196).setVisible(false);
    const bb = this.add.rectangle(0, 0, 364, 20, 0x1e1009).setStrokeStyle(2, 0xe8c070);
    this.bossFill = this.add.rectangle(-180, 0, 360, 14, 0xd83c3c).setOrigin(0, 0.5);
    this.bossName = text(this, 0, -20, '', 10, '#ffffff');
    this.bossBox.add([bb, this.bossFill, this.bossName]);

    // Banner
    this.bannerTitle = text(this, W / 2, 280, '', 26, '#ffffff').setAlpha(0);
    this.bannerSub = text(this, W / 2, 318, '', 10, '#e0d0f0').setAlpha(0);

    // Floating joystick
    this.joy = this.add.graphics().setDepth(50);
    this.joyActive = false;
    this.input.on('pointerdown', (ptr, over) => {
      audio.unlock();
      if (this.modal || over.length) return;
      this.joyActive = true; this.joyId = ptr.id;
      this.joyX = ptr.x; this.joyY = ptr.y;
      this.drawJoy(ptr.x, ptr.y);
    });
    this.input.on('pointermove', (ptr) => {
      if (!this.joyActive || ptr.id !== this.joyId) return;
      let dx = ptr.x - this.joyX, dy = ptr.y - this.joyY;
      let d = Math.hypot(dx, dy);
      const max = 50;
      // The base follows the finger when it slides past the edge
      if (d > max) {
        this.joyX = ptr.x - (dx / d) * max; this.joyY = ptr.y - (dy / d) * max;
        dx = ptr.x - this.joyX; dy = ptr.y - this.joyY; d = max;
      }
      // Small dead zone, then full speed after a short push
      const power = d < 8 ? 0 : Math.min(1, (d - 8) / 14);
      controls.x = d ? (dx / d) * power : 0; controls.y = d ? (dy / d) * power : 0;
      this.drawJoy(this.joyX + dx, this.joyY + dy);
    });
    const release = (ptr) => {
      if (ptr.id !== this.joyId) return;
      this.joyActive = false; controls.x = 0; controls.y = 0; this.joy.clear();
    };
    this.input.on('pointerup', release);
    this.input.on('pointerupoutside', release);

    this.onAgeStart();
    this.events.on('shutdown', () => { controls.x = 0; controls.y = 0; });
  }

  drawJoy(kx, ky) {
    const g = this.joy;
    g.clear();
    g.fillStyle(0xffffff, 0.12).fillCircle(this.joyX, this.joyY, 52);
    g.lineStyle(3, 0xffffff, 0.3).strokeCircle(this.joyX, this.joyY, 52);
    g.fillStyle(0xffffff, 0.45).fillCircle(kx, ky, 22);
  }

  onAgeStart() {
    const age = this.g.age;
    this.ageText.setText(age.name);
    this.summon.label.setText(`SUMMON\n${age.bossName}`);
    this.summon.label.setFontSize(8);
  }

  update() {
    const g = this.g;
    if (!g || !g.player) return;
    const p = g.player;

    this.xpFill.width = (W - 4) * Math.min(1, g.xp / g.xpNeed);
    this.xpShine.width = this.xpFill.width;
    this.lvText.setText(`LV ${g.level}`);

    while (this.hearts.length < p.maxHearts) {
      const i = this.hearts.length;
      this.hearts.push(this.add.image(18 + (i % 8) * 22, 34 + Math.floor(i / 8) * 20, 'heart').setScale(1.6));
    }
    this.hearts.forEach((h, i) => {
      h.setVisible(i < p.maxHearts);
      h.setTexture(i + 1 <= p.hearts ? 'heart' : i < p.hearts ? 'heart_half' : 'heart_empty');
    });

    const left = g.ageLen - g.ageTime;
    if (g.bossDead && !g.endless) { this.timer.setText('--:--').setColor('#e8c070'); }
    else if (g.endless) { this.timer.setText(fmtTime(g.totalTime)).setColor('#7ad0f4'); }
    else if (g.boss) { this.timer.setText('BOSS!').setColor('#d83c3c'); }
    else if (left <= 0) {
      this.timer.setText('POLICE!').setColor(Math.floor(g.totalTime * 4) % 2 ? '#7ad0f4' : '#d83c3c');
    } else {
      this.timer.setText(fmtTime(left)).setColor(left < 30 ? '#ff7070' : '#ffffff');
    }

    this.coinText.setText(String(g.coins));
    this.killText.setText(String(g.kills));
    this.sparkText.setText(String(g.sparks));

    for (let i = 0; i < 6; i++) {
      const s = this.slots[i];
      let icon = null, lvl = 0;
      if (i < 3) { const w = g.weapons[i]; if (w) { icon = WEAPONS[w.key].icon; lvl = w.level; } }
      else { const k = g.passiveOrder[i - 3]; if (k) { icon = PASSIVES[k].icon; lvl = g.passives[k]; } }
      const locked = i < 3 && i >= g.weaponSlots;
      s.ic.setVisible(!!icon || locked);
      if (icon) fit(s.ic.setTexture(icon, 0), 24).setAlpha(1);
      else if (locked) fit(s.ic.setTexture('lock', 0), 18).setAlpha(0.6);
      s.lv.setText(icon ? String(lvl) : '');
      if (i < 3 && g.weapons[i]) s.lv.setColor(g.weapons[i].legendary ? '#ffc040' : '#ffffff');
    }

    const canSummon = g.canSummon();
    this.summon.setVisible(canSummon);
    this.lootText.setVisible(canSummon);
    if (canSummon) {
      this.summon.setScale(left < 30 ? 1 + Math.sin(g.totalTime * 8) * 0.04 : 1);
      const m = g.currentLootMul();
      this.lootText.setText(m > 1 ? `LOOT x${m.toFixed(1)}` : 'LOOT x1');
      this.lootText.setColor(m >= 2 ? '#f2c84b' : m > 1 ? '#e8c070' : '#a090b0');
    }

    // Boss bar, or the mini-boss's when no boss is out
    const b = g.boss || (g.mini && g.mini.alive ? g.mini : null);
    this.bossBox.setVisible(!!b);
    if (b) {
      this.bossName.setText(b.boss ? g.age.bossName : `GIANT ${b.def.name.toUpperCase()}`);
      this.bossFill.setFillStyle(b.boss ? 0xd83c3c : 0xf08a32);
      // Below the Summon button while that is still showing
      this.bossBox.y = b.boss ? 196 : 228;
      this.bossFill.width = 360 * Math.max(0, b.hp / b.maxHp);
    }
  }

  banner(title, sub, ms = 2000, color = '#ffffff') {
    if (!this.ready) return;
    this.tweens.killTweensOf([this.bannerTitle, this.bannerSub]);
    this.bannerTitle.setText(title).setColor(color).setAlpha(0).setScale(1.6);
    this.bannerSub.setText(sub || '').setAlpha(0);
    this.tweens.add({ targets: this.bannerTitle, alpha: 1, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: this.bannerSub, alpha: 1, duration: 300, delay: 120 });
    this.tweens.add({ targets: [this.bannerTitle, this.bannerSub], alpha: 0, duration: 400, delay: ms });
  }

  // ------------------------------------------------------------------
  openModal() {
    this.closeModal();
    this.joyActive = false; controls.x = 0; controls.y = 0; this.joy.clear();
    const c = this.add.container(0, 0).setDepth(100);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x08040c, 0.72).setInteractive());
    this.modal = c;
    return c;
  }

  closeModal() {
    if (this.modal) { this.modal.destroy(); this.modal = null; }
  }

  togglePause() {
    if (this.modal && this.modal.kind !== 'pause') return;
    if (this.g.over || this.g.frozen && !this.modal) return;
    if (this.modal) { this.closeModal(); this.scene.resume('Game'); return; }
    this.scene.pause('Game');
    const c = this.openModal();
    c.kind = 'pause';
    c.add(panel(this, W / 2, H / 2, 340, 470));
    c.add(text(this, W / 2, H / 2 - 195, 'PAUSED', 24, '#e8c070'));
    const g = this.g;
    const lines = g.weapons.map(w => `${WEAPONS[w.key].name} LV ${w.level}`)
      .concat(g.passiveOrder.map(k => `${PASSIVES[k].name} LV ${g.passives[k]}`));
    c.add(text(this, W / 2, H / 2 - 100, lines.join('\n') || '', 8, '#c0b0d0'));
    c.add(button(this, W / 2, H / 2 + 20, 240, 50, 'RESUME', () => this.togglePause(), { color: COLORS.green, hi: COLORS.greenHi }));
    c.add(button(this, W / 2, H / 2 + 90, 240, 46, 'SETTINGS', () => {
      c.setVisible(false);
      settingsPanel(this, () => c.setVisible(true));
    }));
    c.add(button(this, W / 2, H / 2 + 160, 240, 46, 'QUIT RUN', () => {
      this.closeModal();
      this.scene.stop('Game');
      this.scene.start('Title');
    }, { color: COLORS.red, hi: COLORS.redHi }));
  }

  // ------------------------------------------------------------------
  showLevelUp(choices, opt = {}) {
    const c = this.openModal();
    c.kind = 'levelup';
    const title = text(this, W / 2, 150, opt.title || 'LEVEL UP!', 30, opt.title ? '#7ad0f4' : '#f2c84b');
    title.setScale(0.3);
    this.tweens.add({ targets: title, scale: 1, duration: 350, ease: 'Back.out' });
    c.add(title);
    c.add(text(this, W / 2, 192, opt.sub || `LEVEL ${this.g.level - this.g.pendingLevels + 1}`, 10, '#ffffff'));
    const cards = this.add.container(0, 0);
    c.add(cards);
    const build = (list) => {
      cards.removeAll(true);
      list.forEach((ch, i) => {
        const y = 290 + i * 128;
        const card = this.choiceCard(ch, W / 2, y, () => {
          audio.play('select');
          this.closeModal();
          this.g.applyChoice(ch);
        });
        card.x = W + 250;
        this.tweens.add({ targets: card, x: 0, duration: 260, delay: i * 70, ease: 'Cubic.out' });
        cards.add(card);
      });
    };
    build(choices);
    const rr = button(this, W / 2, 680, 220, 46, `REROLL (${this.g.rerolls})`, () => {
      const next = this.g.rerollChoices();
      if (!next) return;
      build(next);
      rr.label.setText(`REROLL (${this.g.rerolls})`);
      rr.setDisabled(this.g.rerolls <= 0);
    }, { color: COLORS.purple, hi: COLORS.purpleHi, size: 12, icon: 'reroll' });
    rr.setDisabled(this.g.rerolls <= 0);
    if (!opt.noReroll) c.add(rr); else rr.destroy();
  }

  choiceCard(ch, x, y, onPick) {
    let name, desc, icon, tag, tagColor;
    if (ch.type === 'weapon') {
      const d = WEAPONS[ch.key];
      name = d.name; icon = d.icon;
      desc = ch.isNew ? `${d.kind}. ${d.blurb}` : (d.levels[ch.level - 1] || 'More damage, faster');
      tag = ch.isNew ? 'NEW WEAPON' : `LV ${ch.level}`; tagColor = ch.isNew ? '#f2c84b' : '#7ad0f4';
      if (ch.isNew && ch.level > 1) tag = `NEW, LV ${ch.level}`;
      if (ch.legendary) desc = `${desc}\nLEGENDARY: +30% damage, +1 attack`;
    } else if (ch.type === 'passive') {
      const d = PASSIVES[ch.key];
      name = d.name; icon = d.icon; desc = d.blurb;
      tag = ch.isNew ? 'NEW PASSIVE' : `LV ${ch.level}`; tagColor = ch.isNew ? '#c08aff' : '#7ad0f4';
      if (ch.isNew && ch.level > 1) tag = `NEW, LV ${ch.level}`;
    } else if (ch.type === 'heal') {
      name = 'Roast Meat'; icon = 'meat'; desc = 'Heal all hearts.'; tag = ''; tagColor = '#fff';
    } else {
      name = 'Coin Pouch'; icon = 'coin'; desc = '+25 coins.'; tag = ''; tagColor = '#fff';
    }
    const card = this.add.container(0, 0);
    const w = 390, h = 112;
    const bg = this.add.graphics();
    const rar = RARITIES[ch.rarity || 0];
    const fancy = (ch.rarity || 0) > 0;
    const draw = (hi) => {
      bg.clear();
      bg.fillStyle(0x0c0810, 1).fillRect(x - w / 2 - 3, y - h / 2 - 3, w + 6, h + 9);
      bg.fillStyle(hi ? 0x4a3460 : 0x2e2240, 1).fillRect(x - w / 2, y - h / 2, w, h);
      if (fancy) bg.fillStyle(rar.color, hi ? 0.22 : 0.14).fillRect(x - w / 2, y - h / 2, w, h);
      bg.lineStyle(fancy ? 4 : 3, fancy ? rar.color : ch.type === 'passive' ? 0x7a48b0 : 0xe8c070, 1).strokeRect(x - w / 2, y - h / 2, w, h);
    };
    draw(false);
    card.add(bg);
    card.add(this.add.rectangle(x - w / 2 + 50, y, 70, 70, 0x1e1009));
    card.add(fit(this.add.image(x - w / 2 + 50, y, icon, 0), 60));
    card.add(text(this, x - w / 2 + 100, y - 30, name.toUpperCase(), 12, '#ffffff', 0));
    if (tag) card.add(text(this, x + w / 2 - 12, y - 30, tag, 8, tagColor, 1));
    if (fancy) {
      const label = `${rar.name}${ch.gain > 1 ? ` +${ch.gain} LV` : ''}`;
      const rt = text(this, x + w / 2 - 12, y + h / 2 - 12, label, 8, rar.text, 1);
      card.add(rt);
      if (ch.rarity >= 2) this.tweens.add({ targets: rt, alpha: 0.4, yoyo: true, repeat: -1, duration: 400 });
    }
    const dt = this.add.text(x - w / 2 + 100, y + 8, desc, {
      fontFamily: FONT, fontSize: '8px', color: '#d0c0e0', wordWrap: { width: 270 }, lineSpacing: 6,
    }).setOrigin(0, 0.5);
    card.add(dt);
    const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0.001);
    card.add(hit);
    // Short delay so a finger still on the joystick can't pick by accident
    this.time.delayedCall(320, () => {
      hit.setInteractive({ useHandCursor: true });
      hit.on('pointerover', () => draw(true));
      hit.on('pointerout', () => draw(false));
      hit.on('pointerup', onPick);
    });
    return card;
  }

  // ------------------------------------------------------------------
  showShop(items) {
    const c = this.openModal();
    c.kind = 'shop';
    c.add(panel(this, W / 2, H / 2, 410, 720, 0x22163a));
    const wiz = this.add.sprite(W / 2, 112, 'wizard', 0).setScale(4.4);
    this.tweens.add({ targets: wiz, y: 106, yoyo: true, repeat: -1, duration: 800 });
    c.add(wiz);
    c.add(text(this, W / 2, 174, 'THE TIME WIZARD', 14, '#c08aff'));
    c.add(text(this, W / 2, 198, '"Coins are no good where\nyou are going. Spend them!"', 8, '#d0c0e0'));
    const coinT = text(this, W / 2 + 10, 232, `${this.g.coins}`, 14, '#f2c84b', 0);
    c.add(this.add.image(W / 2 - 8, 232, 'coin').setScale(2.5));
    c.add(coinT);
    const msg = text(this, W / 2, 652, '', 8, '#7ad0f4');
    c.add(msg);
    const rows = this.add.container(0, 0);
    c.add(rows);
    let list = items;
    const refresh = () => {
      coinT.setText(`${this.g.coins}`);
      list.forEach(it => { if (!it.sold && it.btn) it.btn.setAlpha(this.g.coins >= it.cost ? 1 : 0.55); });
      rr.label.setText(`REROLL ${this.g.shopRerollCost()}`);
      rr.setAlpha(this.g.coins >= this.g.shopRerollCost() ? 1 : 0.55);
    };
    const buy = (it, choice) => {
      if (!this.g.buyItem(it, choice)) { audio.play('deny'); msg.setText('Not enough coins!').setColor('#ff7070'); return; }
      audio.play('buy');
      it.sold = true;
      it.btn.label.setText('SOLD');
      it.btn.setDisabled(true);
      msg.setText(it.result || `Bought ${it.name}`).setColor('#7ad0f4');
      refresh();
    };
    const build = () => {
      rows.removeAll(true);
      list.forEach((it, i) => {
        const y = 300 + i * 88;
        const g = this.add.graphics();
        g.fillStyle(0x0c0810, 1).fillRect(W / 2 - 183, y - 39, 366, 82);
        g.fillStyle(it.rare ? 0x3e2a18 : 0x2e2240, 1).fillRect(W / 2 - 180, y - 36, 360, 76);
        if (it.rare) g.lineStyle(2, 0xf2c84b, 1).strokeRect(W / 2 - 180, y - 36, 360, 76);
        rows.add(g);
        rows.add(fit(this.add.image(W / 2 - 145, y, it.icon, 0), 48));
        rows.add(text(this, W / 2 - 108, y - 18, it.name.toUpperCase(), 10, it.rare ? '#f2c84b' : '#ffffff', 0));
        if (it.rare) rows.add(text(this, W / 2 + 172, y - 28, 'RARE', 6, '#f2c84b', 1));
        rows.add(this.add.text(W / 2 - 108, y + 10, it.blurb, { fontFamily: FONT, fontSize: '8px', color: '#d0c0e0', wordWrap: { width: 150 }, lineSpacing: 4 }).setOrigin(0, 0.5));
        const b = button(this, W / 2 + 125, y, 96, 44, it.sold ? 'SOLD' : `${it.cost}`, () => {
          if (it.sold) return;
          if (this.g.coins < it.cost) { audio.play('deny'); msg.setText('Not enough coins!').setColor('#ff7070'); return; }
          // Weapon upgrade: you choose which weapon
          const opts = it.id === 'upgrade' ? this.g.upgradableWeapons() : [];
          if (opts.length > 1) this.pickWeapon(opts, (key) => buy(it, key));
          else buy(it);
        }, { size: 10, color: COLORS.green, hi: COLORS.greenHi, icon: 'coin', iconScale: 1.6 });
        if (it.sold) b.setDisabled(true);
        rows.add(b);
        it.btn = b;
      });
    };
    const rr = button(this, W / 2 - 100, 700, 180, 46, 'REROLL', () => {
      const next = this.g.rerollShop();
      if (!next) { audio.play('deny'); msg.setText('Not enough coins!').setColor('#ff7070'); return; }
      // The wizard brings out new stock
      items.length = 0; items.push(...next);
      list = items;
      build();
      msg.setText('The wizard shuffles his wares...').setColor('#c08aff');
      refresh();
    }, { color: COLORS.purple, hi: COLORS.purpleHi, size: 10, icon: 'reroll', iconScale: 1.6 });
    c.add(rr);
    c.add(button(this, W / 2 + 100, 700, 180, 46, 'LEAVE', () => {
      this.closeModal();
      this.g.closeShop();
    }, { color: COLORS.button, hi: COLORS.buttonHi }));
    build();
    refresh();
  }

  // Small pop-up to choose which weapon gets the upgrade
  pickWeapon(opts, onPick) {
    const c = this.add.container(0, 0).setDepth(200);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive());
    const h = 120 + opts.length * 64;
    c.add(panel(this, W / 2, H / 2, 320, h, 0x2e2240));
    c.add(text(this, W / 2, H / 2 - h / 2 + 30, 'UPGRADE WHICH?', 12, '#f2c84b'));
    opts.forEach((w, i) => {
      const y = H / 2 - h / 2 + 80 + i * 64;
      const d = WEAPONS[w.key];
      const b = button(this, W / 2, y, 260, 50, `${d.name.toUpperCase()}\nLV ${w.level} > ${w.level + 1}`, () => { c.destroy(); onPick(w.key); }, { size: 8, icon: d.icon, iconScale: 1.6 });
      c.add(b);
    });
    c.add(button(this, W / 2, H / 2 + h / 2 - 30, 140, 36, 'CANCEL', () => c.destroy(), { size: 10, color: COLORS.grey, hi: COLORS.button }));
    this.modal.add(c);
  }

  // ------------------------------------------------------------------
  showResults(r) {
    const c = this.openModal();
    c.kind = 'results';
    c.add(panel(this, W / 2, H / 2, 400, 720));
    const title = r.won ? (r.title || 'VICTORY') : 'YOU DIED';
    const t = text(this, W / 2, 95, title, 26, r.won ? '#f2c84b' : '#d83c3c');
    t.setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 400, ease: 'Back.out' });
    c.add(t);
    if (r.daily) c.add(text(this, W / 2, 128, r.dailyNew ? 'DAILY CHALLENGE - NEW BEST!' : 'DAILY CHALLENGE', 8, '#7ad0f4'));
    if (r.won) c.add(this.add.sprite(W / 2, 175, this.g.charDef.sprite, 0).setScale(3));
    else c.add(this.add.sprite(W / 2, 175, this.g.charDef.sprite, 0).setScale(3).setAngle(90).setTint(0x8080a0));
    const rows = [
      ['TIME SURVIVED', fmtTime(r.time)],
      ['KILLS', String(r.kills)],
      ['LEVEL', String(r.level)],
      ['AGE REACHED', r.age],
    ];
    rows.forEach(([k, v], i) => {
      const y = 240 + i * 30;
      c.add(text(this, W / 2 - 160, y, k, 10, '#a090b0', 0));
      c.add(text(this, W / 2 + 160, y, v, 10, '#ffffff', 1));
    });
    const unlock = r.unlock || (save.bossesBeaten.stone ? 'Beat the boss of an age to\nadvance further next run.' : 'Tip: summon the boss when you feel\nstrong. Beat it to unlock the portal.');
    c.add(text(this, W / 2, 380, unlock, 8, r.won ? '#7ad0f4' : '#c0b0d0'));
    // Sparks earned, line by line, then the total counts up
    const sp = r.sparks || { total: 0, lines: [] };
    let sy = 430;
    sp.lines.forEach(([k, v], i) => {
      const a = text(this, W / 2 - 150, sy, k.toUpperCase(), 8, '#a090b0', 0).setAlpha(0);
      const b = text(this, W / 2 + 150, sy, `+${v}`, 8, '#ffe060', 1).setAlpha(0);
      c.add([a, b]);
      this.tweens.add({ targets: [a, b], alpha: 1, duration: 200, delay: 300 + i * 200 });
      sy += 22;
    });
    const totalY = Math.max(sy + 14, 480);
    c.add(this.add.image(W / 2 - 70, totalY, 'spark').setScale(2.2));
    const tot = text(this, W / 2 - 50, totalY, '+0 SPARKS', 14, '#ffe060', 0);
    c.add(tot);
    const counter = { v: 0 };
    this.tweens.add({
      targets: counter, v: sp.total, duration: 700, delay: 300 + sp.lines.length * 200,
      onUpdate: () => tot.setText(`+${Math.round(counter.v)} SPARKS`),
      onComplete: () => { if (sp.total) audio.play('spark'); },
    });
    c.add(text(this, W / 2, totalY + 28, `YOU HAVE ${save.sparks} SPARKS. SPEND THEM ON THE MENU.`, 6, '#c0b0d0'));
    c.add(button(this, W / 2, 620, 260, 54, 'PLAY AGAIN', () => {
      this.closeModal();
      save.runs++;
      const daily = this.g.daily;
      this.scene.stop('Game');
      this.scene.start('Game', { character: this.g.character, daily });
    }, { size: 16, color: COLORS.green, hi: COLORS.greenHi }));
    c.add(button(this, W / 2, 690, 200, 46, 'MENU', () => {
      this.closeModal();
      this.scene.stop('Game');
      this.scene.start('Title');
    }));
  }
}
