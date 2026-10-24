// Small pixel UI kit shared by the menus and in-run screens.
import { audio } from './audio.js';
import { save, persist } from './save.js';

export const W = 450;
export const H = 800;
export const FONT = '"Press Start 2P", monospace';

export const COLORS = {
  // Carved stone and ochre paint, to match the cave-painting art
  panel: 0x3a2618, panelEdge: 0x1e1009, border: 0xc89a5a,
  button: 0x8a4a24, buttonHi: 0xa85c2e, green: 0x5a7a2a, greenHi: 0x6e9436,
  red: 0x9a2a1c, redHi: 0xb83a26, purple: 0x5a2e6a, purpleHi: 0x74408a, grey: 0x4a3a30,
};

export function text(scene, x, y, str, size = 16, color = '#ffffff', origin = 0.5) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: `${size}px`, color,
    stroke: '#120c18', strokeThickness: Math.max(2, Math.round(size / 4)),
    align: 'center', lineSpacing: Math.round(size / 2),
  });
  t.setOrigin(origin, 0.5);
  return t;
}

export function panel(scene, x, y, w, h, color = COLORS.panel) {
  const g = scene.add.graphics();
  g.fillStyle(COLORS.panelEdge, 1).fillRect(x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8);
  g.fillStyle(COLORS.border, 1).fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4);
  g.fillStyle(color, 1).fillRect(x - w / 2, y - h / 2, w, h);
  return g;
}

export function button(scene, x, y, w, h, label, onClick, opt = {}) {
  const c = scene.add.container(x, y);
  const base = opt.color ?? COLORS.button;
  const hi = opt.hi ?? COLORS.buttonHi;
  const g = scene.add.graphics();
  const draw = (col, down) => {
    g.clear();
    g.fillStyle(COLORS.panelEdge, 1).fillRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6 + (down ? 0 : 3));
    g.fillStyle(col, 1).fillRect(-w / 2, -h / 2 + (down ? 2 : 0), w, h);
    g.fillStyle(0xffffff, 0.18).fillRect(-w / 2, -h / 2 + (down ? 2 : 0), w, 4);
  };
  draw(base);
  const t = text(scene, 0, 0, label, opt.size || 14, opt.textColor || '#ffffff');
  c.add([g, t]);
  if (opt.icon) {
    const ic = scene.add.image(-w / 2 + 22, 0, opt.icon).setScale(opt.iconScale || 2);
    c.add(ic);
    t.setX(12);
  }
  c.setSize(w, h);
  c.setInteractive({ useHandCursor: true });
  c.on('pointerover', () => draw(hi));
  c.on('pointerout', () => { draw(base); c.pressed = false; });
  c.on('pointerdown', () => { draw(hi, true); c.pressed = true; });
  c.on('pointerup', () => {
    draw(hi);
    if (!c.pressed) return;
    c.pressed = false;
    if (c.disabled) { audio.play('deny'); return; }
    audio.play('click');
    onClick();
  });
  c.label = t;
  c.setDisabled = (d) => { c.disabled = d; c.setAlpha(d ? 0.5 : 1); };
  return c;
}

// Settings: volume and damage numbers. Returns a container; onClose removes it.
export function settingsPanel(scene, onClose) {
  const c = scene.add.container(0, 0).setDepth(1000);
  const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive();
  c.add(shade);
  c.add(panel(scene, W / 2, H / 2, 360, 380));
  c.add(text(scene, W / 2, H / 2 - 150, 'SETTINGS', 20, '#e8c070'));
  const s = save.settings;
  const rows = [
    { label: 'MUSIC', key: 'music' },
    { label: 'SOUND', key: 'sfx' },
  ];
  rows.forEach((r, i) => {
    const y = H / 2 - 80 + i * 70;
    c.add(text(scene, W / 2 - 150, y, r.label, 12, '#ffffff', 0));
    const val = text(scene, W / 2 + 70, y, `${Math.round(s[r.key] * 100)}%`, 12);
    const set = (d) => {
      s[r.key] = Math.max(0, Math.min(1, Math.round((s[r.key] + d) * 10) / 10));
      val.setText(`${Math.round(s[r.key] * 100)}%`);
      audio.setVolumes(s.music, s.sfx);
      persist();
    };
    c.add(val);
    c.add(button(scene, W / 2 + 10, y, 40, 36, '-', () => set(-0.1)));
    c.add(button(scene, W / 2 + 130, y, 40, 36, '+', () => set(0.1)));
  });
  const y3 = H / 2 + 60;
  c.add(text(scene, W / 2 - 150, y3, 'DAMAGE\nNUMBERS', 12, '#ffffff', 0));
  const dn = button(scene, W / 2 + 70, y3, 120, 40, s.damageNumbers ? 'ON' : 'OFF', () => {
    s.damageNumbers = !s.damageNumbers;
    dn.label.setText(s.damageNumbers ? 'ON' : 'OFF');
    persist();
  });
  c.add(dn);
  c.add(button(scene, W / 2, H / 2 + 140, 200, 48, 'BACK', () => { c.destroy(); onClose && onClose(); }, { color: COLORS.green, hi: COLORS.greenHi }));
  return c;
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
