import Phaser from 'phaser';
import { audio } from '../audio.js';
import { save, persist, resetProgress } from '../save.js';
import { CHARACTERS, AGES, WEAPONS, ENEMIES, META, TWISTS, RELICS } from '../data.js';
import { W, H, text, button, panel, settingsPanel, COLORS, fmtTime, FONT } from '../ui.js';
import { allQuests, progress, isDone, isClaimed, claimable, claim, charUnlocked, goalMet, bought, unlockList, buyUnlock } from '../quests.js';
import { onlineEnabled, topScores, playerName, cloudCode, cloudBackup, cloudRestore } from '../online.js';

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
  const keys = Object.keys(WEAPONS).filter(k => !WEAPONS[k].signature && !WEAPONS[k].cost);
  const weapon = twists.includes('random') ? keys[Math.floor(rnd() * keys.length)] : null;
  return { date, twists, weapon };
}

export default class Title extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    audio.setVolumes(save.settings.music, save.settings.sfx);
    this.cameras.main.setBackgroundColor('#0c1030');
    this.bg = this.add.tileSprite(W / 2, H / 2, W, H, 'ground_cave').setTileScale(1.125);
    // a few trees around the edges of the meadow
    [[34, 130, 'tree'], [420, 96, 'pine'], [410, 330, 'tree'], [30, 420, 'pine'], [60, 760, 'tree'], [400, 790, 'pine'], [220, 790, 'bush']].forEach(([x, y, k]) => {
      this.add.image(x + 3, y, 'shadow').setScale(3.4, 1.6);
      this.add.image(x, y, k).setScale(1.25).setOrigin(0.5, 0.95);
    });
    this.add.rectangle(W / 2, H / 2, W, H, 0x0c1030, 0.3);

    // March of the ages behind the title
    const marchers = ['wolf', 'rival', 'raptor', 'legionary', 'spearman', 'mammoth', 'centurion'];
    this.marchers = [];
    for (let i = 0; i < 7; i++) {
      const m = this.add.sprite(-60 - i * 80, 560 + (i % 2) * 18, marchers[i], 0).setScale(1.6).setAlpha(0.85);
      m.speed = 30 + Math.random() * 15;
      this.marchers.push(m);
    }

    const t1 = text(this, W / 2, 150, 'EVOLVE', 44, '#ffe070');
    const t2 = text(this, W / 2, 210, 'OR DIE', 44, '#d83c3c');
    this.tweens.add({ targets: [t1, t2], y: '+=6', yoyo: true, repeat: -1, duration: 1400, ease: 'Sine.inOut' });
    text(this, W / 2, 262, 'SURVIVE THE AGES', 10, '#c0b0d0');

    this.hero = this.add.sprite(W / 2, 370, 'caveman', 0).setScale(4);
    this.add.image(W / 2, 423, 'shadow').setScale(4, 3).setDepth(-1);
    this.time.addEvent({ delay: 220, loop: true, callback: () => this.hero.setFrame(this.hero.frame.name === 0 ? 1 : 0) });

    const ready = claimable().length;
    this.mainButtons = [
      button(this, W / 2, 470, 260, 56, 'PLAY', () => this.showCharacterSelect(), { size: 20, color: COLORS.green, hi: COLORS.greenHi }),
      button(this, W / 2 - 68, 536, 124, 48, 'DAILY', () => this.showDaily(), { size: 10, color: COLORS.red, hi: COLORS.redHi, icon: 'skull', iconScale: 1.6 }),
      button(this, W / 2 + 68, 536, 124, 48, 'EVOLVE', () => this.showUpgrades(), { size: 10, icon: 'spark', iconScale: 1.8 }),
      button(this, W / 2 - 68, 594, 124, 48, 'QUESTS', () => this.showQuests(), { size: 10, icon: 'scroll', iconScale: 1.6 }),
      button(this, W / 2 + 68, 594, 124, 48, 'SCORES', () => this.showScores(), { size: 10, icon: 'trophy', iconScale: 1.6 }),
      button(this, W / 2 - 68, 650, 124, 40, 'UNLOCK', () => this.showUnlocks(), { size: 8, icon: 'lock', iconScale: 1.4, color: COLORS.purple, hi: COLORS.purpleHi }),
      button(this, W / 2 + 68, 650, 124, 40, 'SETTINGS', () => this.openSettings(), { size: 8 }),
      button(this, 52, 26, 84, 30, 'EDITOR', () => { window.location.href = 'editor.html'; }, { size: 6, color: COLORS.grey, hi: COLORS.button }),
    ];
    // Red badge when quest rewards are waiting
    if (ready) {
      const qb = this.mainButtons[3];
      const badge = this.add.container(qb.x + 56, qb.y - 22);
      badge.add(this.add.circle(0, 0, 11, 0xd83c3c).setStrokeStyle(2, 0x0c1030));
      badge.add(text(this, 0, 1, String(ready), 8, '#ffffff'));
      this.tweens.add({ targets: badge, scale: 1.2, yoyo: true, repeat: -1, duration: 500 });
      this.mainButtons.push(badge);
    }
    // Sparks you own
    this.add.image(W - 92, 26, 'spark').setScale(2);
    this.sparkText = text(this, W - 76, 26, String(save.sparks), 12, '#ffe060', 0);

    const beaten = AGES.filter(a => save.bossesBeaten[a.key]).map(a => a.bossName);
    const info = [`RUNS ${save.runs}`, `BEST ${fmtTime(save.bestTime)}`];
    text(this, W / 2, 712, info.join('   '), 10, '#d8b890');
    text(this, W / 2, 736, beaten.length ? `BOSSES BEATEN: ${beaten.length}/${AGES.length}` : 'NO BOSSES BEATEN YET', 8, '#d8b890');
    text(this, W / 2, 770, 'v0.3', 8, '#5a4a6a');

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
    settingsPanel(this, () => this.mainButtons.forEach(b => b.setVisible(true)), { onCloud: () => this.showCloud() });
  }

  // A panel on top of the menu; returns the container and a close function
  overlay(w, h) {
    audio.unlock();
    this.mainButtons.forEach(b => b.setVisible(false));
    const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive());
    c.add(panel(this, W / 2, H / 2, w, h));
    const close = () => { c.destroy(); this.mainButtons.forEach(b => b.setVisible(true)); };
    return { c, close };
  }

  // Quests: progress bars, and a CLAIM button for finished ones
  showQuests() {
    const { c, close } = this.overlay(420, 760);
    c.add(text(this, W / 2, 50, 'QUESTS', 22, '#ffe070'));
    c.add(text(this, W / 2, 78, 'Finish them for Sparks', 8, '#c0a080'));
    const rows = this.add.container(0, 0);
    c.add(rows);
    const perPage = 7;
    // Claimable first, then unfinished (closest first), then claimed
    const order = () => allQuests().slice().sort((a, b) => {
      const rank = (q) => (isDone(q) && !isClaimed(q) ? 0 : isClaimed(q) ? 2 : 1);
      return rank(a) - rank(b) || progress(b) / b.target - progress(a) / a.target;
    });
    let list = order();
    let page = 0;
    const pages = () => Math.max(1, Math.ceil(list.length / perPage));
    const pageText = text(this, W / 2, 696, '', 8, '#c0a080');
    c.add(pageText);
    const draw = () => {
      rows.removeAll(true);
      this.sparkText.setText(String(save.sparks));
      list.slice(page * perPage, page * perPage + perPage).forEach((q, i) => {
        const y = 130 + i * 78;
        const done = isDone(q), claimed = isClaimed(q);
        const g = this.add.graphics();
        g.fillStyle(0x0c1030, 1).fillRect(W / 2 - 196, y - 34, 392, 70);
        g.fillStyle(done && !claimed ? 0x2f7a3a : 0x263ea8, 1).fillRect(W / 2 - 194, y - 32, 388, 66);
        if (done && !claimed) g.lineStyle(2, 0xffe060, 1).strokeRect(W / 2 - 194, y - 32, 388, 66);
        rows.add(g);
        rows.add(text(this, W / 2 - 182, y - 18, q.name.toUpperCase(), 9, claimed ? '#8a7a6a' : '#ffffff', 0));
        rows.add(this.add.text(W / 2 - 182, y + 2, q.blurb, { fontFamily: FONT, fontSize: '7px', color: claimed ? '#8a7a6a' : '#d0b890', wordWrap: { width: 250 } }).setOrigin(0, 0.5));
        // Progress bar
        const pr = progress(q) / q.target;
        rows.add(this.add.rectangle(W / 2 - 182, y + 22, 240, 6, 0x5a4030).setOrigin(0, 0.5));
        rows.add(this.add.rectangle(W / 2 - 182, y + 22, 240 * pr, 6, done ? 0x9ae07a : 0xffe060).setOrigin(0, 0.5));
        const fmt = (v) => (q.time ? fmtTime(v) : String(Math.floor(v)));
        rows.add(text(this, W / 2 + 64, y + 22, `${fmt(progress(q))}/${fmt(q.target)}`, 6, '#c0a080', 0));
        if (claimed) {
          rows.add(text(this, W / 2 + 150, y, 'DONE', 9, '#9ae07a'));
        } else {
          const b = button(this, W / 2 + 148, y - 4, 80, 40, done ? `+${q.reward}` : String(q.reward), () => {
            if (!claim(q)) { audio.play('deny'); return; }
            audio.play('spark');
            list = order();
            draw();
          }, { size: 9, icon: 'spark', iconScale: 1.2, color: done ? COLORS.green : COLORS.grey, hi: done ? COLORS.greenHi : COLORS.grey });
          if (!done) b.setAlpha(0.6);
          else this.tweens.add({ targets: b, scale: 1.06, yoyo: true, repeat: -1, duration: 400 });
          rows.add(b);
        }
      });
      pageText.setText(`${page + 1} / ${pages()}`);
    };
    c.add(button(this, W / 2 - 110, 696, 70, 36, '<', () => { page = (page + pages() - 1) % pages(); draw(); }, { size: 12 }));
    c.add(button(this, W / 2 + 110, 696, 70, 36, '>', () => { page = (page + 1) % pages(); draw(); }, { size: 12 }));
    c.add(button(this, W / 2, 748, 160, 36, 'BACK', () => { close(); this.scene.restart(); }, { size: 12 }));
    draw();
  }

  // Best runs: online top 10 when Supabase is set up, otherwise this device's best runs
  showScores() {
    const { c, close } = this.overlay(420, 720);
    c.add(text(this, W / 2, 72, 'SCORES', 22, '#ffe070'));
    const rows = this.add.container(0, 0);
    c.add(rows);
    const status = text(this, W / 2, 400, '', 8, '#c0a080');
    c.add(status);
    const header = text(this, W / 2, 104, '', 8, '#c0a080');
    c.add(header);
    const show = (list, empty) => {
      rows.removeAll(true);
      status.setText(list.length ? '' : empty);
      list.forEach((r, i) => {
        const y = 150 + i * 44;
        const g = this.add.graphics();
        g.fillStyle(i % 2 ? 0x263ea8 : 0x22368f, 1).fillRect(W / 2 - 190, y - 20, 380, 40);
        rows.add(g);
        rows.add(text(this, W / 2 - 178, y, `${i + 1}`, 10, i === 0 ? '#ffe060' : '#ffffff', 0));
        rows.add(text(this, W / 2 - 144, y - 8, String(r.name || r.hero || '').toUpperCase(), 8, '#ffffff', 0));
        rows.add(text(this, W / 2 - 144, y + 9, `${r.age}  ${r.kills} kills`, 6, '#c0a080', 0));
        rows.add(text(this, W / 2 + 178, y, fmtTime(r.time_s ?? r.time), 10, '#9ae07a', 1));
      });
    };
    const local = () => {
      header.setText('YOUR BEST RUNS ON THIS DEVICE');
      show(save.history || [], 'No runs yet. Go play!');
    };
    const online = (daily) => {
      header.setText(daily ? `TODAY'S DAILY CHALLENGE (${daily})` : 'TOP PLAYERS, ALL TIME');
      rows.removeAll(true);
      status.setText('Loading...');
      topScores(daily).then(list => { if (c.active) show(list || [], 'No scores yet. Be the first!'); })
        .catch(() => { if (c.active) status.setText("Couldn't reach the scoreboard.\nCheck your connection."); });
    };
    if (onlineEnabled) {
      c.add(button(this, W / 2 - 128, 640, 118, 38, 'ALL TIME', () => online(null), { size: 8 }));
      c.add(button(this, W / 2, 640, 118, 38, 'TODAY', () => online(todaysDaily().date), { size: 8, color: COLORS.red, hi: COLORS.redHi }));
      c.add(button(this, W / 2 + 128, 640, 118, 38, 'MINE', () => local(), { size: 8 }));
      const nameBtn = button(this, W / 2, 686, 260, 34, `NAME: ${playerName()}`, () => {
        const v = window.prompt('Your name on the scoreboard (up to 12 letters)', save.playerName || '');
        if (v === null) return;
        const clean = v.replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 12).trim();
        if (!clean) return;
        save.playerName = clean.toUpperCase(); persist();
        nameBtn.label.setText(`NAME: ${save.playerName}`);
      }, { size: 8, color: COLORS.purple, hi: COLORS.purpleHi });
      c.add(nameBtn);
      online(null);
    } else {
      local();
      c.add(text(this, W / 2, 650, 'Online scores are coming soon', 7, '#8a7a6a'));
    }
    c.add(button(this, W / 2, 736, 160, 34, 'BACK', close, { size: 12 }));
  }

  // Cloud save: back up progress and bring it to another device with a code
  showCloud() {
    const { c, close } = this.overlay(400, 520);
    const back = () => { close(); this.openSettings(); };
    c.add(text(this, W / 2, H / 2 - 220, 'CLOUD SAVE', 18, '#ffe070'));
    if (!onlineEnabled) {
      c.add(text(this, W / 2, H / 2 - 40, 'Cloud saves are coming soon.\nYour progress is saved\non this device.', 9, '#d0b890'));
      c.add(button(this, W / 2, H / 2 + 200, 160, 40, 'BACK', back, { size: 12 }));
      return;
    }
    c.add(text(this, W / 2, H / 2 - 170, 'Your save code. Keep it secret!\nType it on another device\nto bring your progress over.', 8, '#d0b890'));
    c.add(text(this, W / 2, H / 2 - 95, cloudCode(), 16, '#ffe060'));
    const msg = text(this, W / 2, H / 2 + 120, 'Backed up after every run', 8, '#9ae07a');
    c.add(msg);
    c.add(button(this, W / 2, H / 2 - 20, 260, 46, 'BACK UP NOW', () => {
      msg.setText('Saving...').setColor('#c0a080');
      cloudBackup().then(() => msg.setText('Saved!').setColor('#9ae07a')).catch(() => msg.setText("Couldn't save. Try again.").setColor('#ff9a8a'));
    }, { size: 10, color: COLORS.green, hi: COLORS.greenHi }));
    c.add(button(this, W / 2, H / 2 + 50, 260, 46, 'LOAD FROM CODE', () => {
      const code = window.prompt('Type your save code');
      if (!code) return;
      if (!window.confirm('This replaces the progress on this device. Continue?')) return;
      msg.setText('Loading...').setColor('#c0a080');
      cloudRestore(code).then(ok => {
        if (ok) { msg.setText('Loaded! Restarting...').setColor('#9ae07a'); setTimeout(() => location.reload(), 800); }
        else msg.setText('No save found for that code.').setColor('#ff9a8a');
      }).catch(() => msg.setText("Couldn't load. Try again.").setColor('#ff9a8a'));
    }, { size: 10 }));
    c.add(button(this, W / 2, H / 2 + 200, 160, 40, 'BACK', back, { size: 12 }));
  }

  showCharacterSelect() {
    audio.unlock();
    this.mainButtons.forEach(b => b.setVisible(false));
    const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.7).setInteractive());
    c.add(panel(this, W / 2, H / 2, 410, 600));
    c.add(text(this, W / 2, H / 2 - 262, CHARACTERS.length > 6 ? 'CHOOSE YOUR CHARACTER' : 'CHOOSE YOUR\nCHARACTER', CHARACTERS.length > 6 ? 13 : 16, '#ffe070'));
    const killsNeeded = (ch) => (String(ch.unlock || '').startsWith('kills:') ? parseInt(ch.unlock.slice(6), 10) || 0 : 0);
    const questOf = (ch) => (String(ch.unlock || '').startsWith('quest:') ? allQuests().find(q => q.id === ch.unlock.slice(6)) : null);
    const isOpen = (ch) => charUnlocked(ch) || this.unlockAll;
    const lockText = (ch) => {
      if (ch.cost && goalMet(ch) && !bought('char', ch.key)) return 'Buy it on UNLOCK';
      const k = killsNeeded(ch);
      if (k) return `${Math.min(save.totalKills, k)}/${k} kills`;
      const q = questOf(ch);
      if (q) return `${ch.unlockText || q.name}${q.target > 1 && !q.time ? ` ${progress(q)}/${q.target}` : ''}`;
      const boss = ENEMIES[ch.unlock];
      return `Beat ${boss ? boss.name : 'a boss'}`;
    };
    // Nine to a page; arrows flip through the rest
    const PAGE = 9;
    const pages = Math.ceil(CHARACTERS.length / PAGE);
    let page = 0;
    const list = CHARACTERS.slice(0, PAGE);
    // More than 6 characters: smaller cards in three rows
    const compact = list.length > 6;
    const maxTier = Math.max(1, ...CHARACTERS.map(x => (WEAPONS[x.weapon] && WEAPONS[x.weapon].tier) || 0));
    // Up to 3 per row (4 cards don't fit in one row, so they go 2 x 2)
    const cols = list.length === 4 ? 2 : Math.min(3, Math.max(1, list.length));
    const cw = 112, ch0 = compact ? 92 : 120, gap = 122, rowGap = compact ? 98 : 130, top = compact ? H / 2 - 196 : H / 2 - 160;
    let selected = list.find(isOpen) || list[0];
    const desc = text(this, W / 2, H / 2 + 78, '', 8, '#e8d0b0');
    const wName = text(this, W / 2 + 12, H / 2 + 100, '', 8, '#ffe060');
    const wIcon = this.add.image(W / 2, H / 2 + 100, 'club', 0);
    const wInfo = text(this, W / 2, H / 2 + 120, '', 6, '#c0a080');
    const perk = text(this, W / 2, H / 2 + 144, '', 8, '#9ae07a');
    const drawback = text(this, W / 2, H / 2 + 162, '', 8, '#ff9a8a');
    c.add([desc, wName, wIcon, wInfo, perk, drawback]);
    // What each kind of weapon does
    const KIND_TIPS = { Melee: 'hits enemies close to you', Orbit: 'circles around you', Aura: 'burns everything around you', Area: 'strikes enemies from afar', Projectile: 'fires at the nearest enemy' };
    const cards = [];
    const refresh = () => {
      cards.forEach(({ ch, g, x, y }) => {
        const open = isOpen(ch), sel = ch === selected;
        g.clear();
        g.fillStyle(open ? (sel ? 0x3a5ad0 : 0x263ea8) : 0x1c2a70, 1).fillRect(x - cw / 2, y - ch0 / 2, cw, ch0);
        g.lineStyle(3, sel ? 0xf0c060 : open ? COLORS.border : 0x4a3a30, 1).strokeRect(x - cw / 2, y - ch0 / 2, cw, ch0);
      });
      const w = WEAPONS[selected.weapon];
      const own = w && w.signature === selected.key;
      desc.setText(`${selected.name}, ${selected.title.toUpperCase()}  -  ${selected.hearts || 5} HEARTS`);
      wName.setText(w ? `${w.name.toUpperCase()}  -  ${(w.kind || '').toUpperCase()} WEAPON` : '');
      if (w && this.textures.exists(w.icon)) {
        wIcon.setTexture(w.icon, 0).setVisible(true);
        wIcon.setScale(Math.min(20 / wIcon.width, 20 / wIcon.height));
        wIcon.setX(wName.x - wName.width / 2 - 16);
      } else wIcon.setVisible(false);
      const tip = w ? KIND_TIPS[w.kind] : '';
      const forAll = own && selected.unlock && selected.unlock !== 'start' ? 'Unlocks it for everyone. ' : '';
      wInfo.setText(w ? `${tip ? `${w.kind}: ${tip}. ` : ''}${own ? `${forAll}Power ${w.tier}/${maxTier}` : 'Starting weapon'}` : '');
      perk.setText(selected.perk ? `+ ${selected.perk}` : '');
      drawback.setText(selected.drawback ? `- ${selected.drawback}` : '');
    };
    const grid = this.add.container(0, 0);
    c.add(grid);
    const drawPage = () => {
      grid.removeAll(true);
      cards.length = 0;
      const list = CHARACTERS.slice(page * PAGE, page * PAGE + PAGE);
      list.forEach((ch, i) => {
        const col = i % cols, row = Math.floor(i / cols);
        const inRow = Math.min(cols, list.length - row * cols);
        const x = W / 2 - ((inRow - 1) * gap) / 2 + col * gap, y = top + row * rowGap;
        const g = this.add.graphics();
        grid.add(g);
        cards.push({ ch, g, x, y });
        const open = isOpen(ch);
        const sy = compact ? y - 12 : y - 14;
        const spr = this.add.sprite(x, sy, this.textures.exists(ch.sprite) ? ch.sprite : 'caveman', 0).setScale(compact ? 1.6 : 2);
        if (!open) spr.setTintFill(0x140a06);
        else this.tweens.add({ targets: spr, y: sy - 4, yoyo: true, repeat: -1, duration: 500 + i * 40 });
        grid.add(spr);
        if (!open) grid.add(this.add.image(x, sy, 'lock').setScale(2));
        grid.add(text(this, x, y + (compact ? 25 : 34), open ? ch.name : '???', 9, open ? '#ffffff' : '#7a6a5a'));
        grid.add(text(this, x, y + (compact ? 38 : 49), open ? ch.title : lockText(ch), 6, '#c0a080'));
        const hit = this.add.rectangle(x, y, cw, ch0, 0xffffff, 0.001).setInteractive({ useHandCursor: true });
        hit.on('pointerup', () => { if (!open) { audio.play('deny'); return; } audio.play('select'); selected = ch; refresh(); });
        grid.add(hit);
      });
      refresh();
    };
    drawPage();
    if (pages > 1) {
      const flip = (d) => { audio.play('select'); page = (page + d + pages) % pages; drawPage(); };
      c.add(button(this, W / 2 - 172, H / 2 - 262, 34, 30, '<', () => flip(-1), { size: 10 }));
      c.add(button(this, W / 2 + 172, H / 2 - 262, 34, 30, '>', () => flip(1), { size: 10 }));
    }
    c.add(button(this, W / 2, H / 2 + 210, 260, 52, 'START RUN', () => this.startRun(selected.key), { size: 18, color: COLORS.green, hi: COLORS.greenHi }));
    c.add(button(this, W / 2, H / 2 + 268, 160, 36, 'BACK', () => { c.destroy(); this.mainButtons.forEach(b => b.setVisible(true)); }, { size: 12 }));
  }

  startRun(character, daily = null) {
    save.runs++;
    persist();
    audio.stopMusic();
    this.scene.start('Game', { character, daily });
  }

  // Everything there is to unlock, in tabs: weapons, passives and relics.
  // Locked ones are blacked out as ??? with the quest that unlocks them; some then cost Sparks.
  showUnlocks(tab = 'weapon') {
    const { c, close } = this.overlay(420, 760);
    c.add(text(this, W / 2, 46, 'UNLOCK', 22, '#ffe070'));
    c.add(this.add.image(W / 2 - 40, 78, 'spark').setScale(2));
    const have = text(this, W / 2 - 22, 78, '', 12, '#ffe060', 0);
    c.add(have);
    const TABS = [['weapon', 'WEAPONS'], ['passive', 'PASSIVES'], ['relic', 'RELICS']];
    const tabBtns = TABS.map(([id, label], i) => {
      const b = button(this, W / 2 - 128 + i * 128, 118, 120, 38, label, () => { audio.play('select'); tab = id; page = 0; draw(); }, { size: 8 });
      c.add(b);
      return [id, b];
    });
    const rows = this.add.container(0, 0);
    c.add(rows);
    const PER = 6;
    let page = 0;
    const pageText = text(this, W / 2, 690, '', 8, '#c0a080');
    const prev = button(this, W / 2 - 110, 690, 70, 34, '<', () => { page--; draw(); }, { size: 12 });
    const next = button(this, W / 2 + 110, 690, 70, 34, '>', () => { page++; draw(); }, { size: 12 });
    c.add([pageText, prev, next]);
    const draw = () => {
      rows.removeAll(true);
      have.setText(String(save.sparks));
      this.sparkText.setText(String(save.sparks));
      for (const [id, b] of tabBtns) b.setAlpha(id === tab ? 1 : 0.55);
      const list = unlockList(tab);
      const pages = Math.max(1, Math.ceil(list.length / PER));
      page = (page + pages) % pages;
      pageText.setText(`${page + 1} / ${pages}`);
      [pageText, prev, next].forEach(o => o.setVisible(pages > 1));
      list.slice(page * PER, page * PER + PER).forEach((u, i) => {
        const y = 186 + i * 82;
        const open = u.unlocked, canBuy = !open && u.cost > 0;
        const g = this.add.graphics();
        g.fillStyle(0x0c1030, 1).fillRect(W / 2 - 196, y - 38, 392, 76);
        g.fillStyle(open ? 0x263ea8 : 0x1c2a70, 1).fillRect(W / 2 - 194, y - 36, 388, 72);
        rows.add(g);
        if (this.textures.exists(u.icon)) {
          const ic = fit(this.add.image(W / 2 - 166, y, u.icon, 0), 42);
          if (!open) ic.setTintFill(0x0c0604);
          rows.add(ic);
        }
        const textW = canBuy ? 200 : 290;
        rows.add(text(this, W / 2 - 136, y - 22, open ? u.name.toUpperCase() : '???', open && u.name.length > 18 ? 7 : 9, open ? '#ffffff' : '#7a6a5a', 0));
        const desc = open ? u.blurb : u.type === 'relic' ? u.goal : u.ready && u.cost ? `Quest done! Unlock it for ${u.cost} Sparks.` : `To unlock: ${u.goal}`;
        rows.add(this.add.text(W / 2 - 136, y - 10, desc || '', { fontFamily: FONT, fontSize: '7px', color: open ? '#d0b890' : u.type === 'relic' ? '#ffe060' : u.ready ? '#9ae07a' : '#ff9a8a', wordWrap: { width: textW }, lineSpacing: 3 }).setOrigin(0, 0));
        if (canBuy) {
          const b = button(this, W / 2 + 145, y, 86, 40, String(u.cost), () => {
            if (!buyUnlock(u)) { audio.play('deny'); return; }
            audio.play('buy');
            draw();
          }, { size: 10, icon: 'spark', iconScale: 1.4, color: u.ready ? COLORS.green : COLORS.grey, hi: u.ready ? COLORS.greenHi : COLORS.grey });
          if (!u.ready || save.sparks < u.cost) b.setAlpha(0.55);
          rows.add(b);
        }
      });
    };
    draw();
    c.add(button(this, W / 2, 742, 160, 36, 'BACK', close, { size: 12 }));
  }

  // Permanent upgrades bought with Sparks
  showUpgrades() {
    audio.unlock();
    this.mainButtons.forEach(b => b.setVisible(false));
    const c = this.add.container(0, 0).setDepth(500);
    c.add(this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.75).setInteractive());
    c.add(panel(this, W / 2, H / 2, 420, 740));
    c.add(text(this, W / 2, 62, 'EVOLVE', 22, '#ffe070'));
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
        g.fillStyle(0x0c1030, 1).fillRect(W / 2 - 196, y - 29, 392, 60);
        g.fillStyle(0x263ea8, 1).fillRect(W / 2 - 194, y - 27, 388, 56);
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
      g.fillStyle(0x0c1030, 1).fillRect(W / 2 - 170, y - 30, 340, 62);
      g.fillStyle(0x5a2018, 1).fillRect(W / 2 - 168, y - 28, 336, 58);
      c.add(g);
      c.add(text(this, W / 2, y - 10, t.name.toUpperCase(), 12, '#ffd0a0'));
      c.add(text(this, W / 2, y + 14, t.blurb, 8, '#ffffff'));
    });
    if (daily.weapon) c.add(text(this, W / 2, H / 2 + 34, `Starting weapon: ${WEAPONS[daily.weapon].name}`, 8, '#7ad0f4'));
    const d = save.daily;
    const today = d.date === daily.date;
    c.add(text(this, W / 2, H / 2 + 70, today && d.best ? `TODAY'S BEST: ${fmtTime(d.best)}  (${d.bestKills} kills)` : 'No run yet today', 9, '#ffe070'));
    if (!(today && d.played)) {
      c.add(this.add.image(W / 2 - 92, H / 2 + 100, 'spark').setScale(1.6));
      c.add(text(this, W / 2 - 78, H / 2 + 100, 'First run today: +10 Sparks', 8, '#ffe060', 0));
    }
    c.add(button(this, W / 2, H / 2 + 165, 260, 56, 'START', () => this.startRun(CHARACTERS[0].key, daily), { size: 18, color: COLORS.green, hi: COLORS.greenHi }));
    c.add(button(this, W / 2, H / 2 + 232, 160, 40, 'BACK', () => { c.destroy(); this.mainButtons.forEach(b => b.setVisible(true)); }, { size: 12 }));
  }
}
