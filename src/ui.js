// Small pixel UI kit shared by the menus and in-run screens.
import { audio } from './audio.js';
import { save, persist } from './save.js';

export const W = 450;
export const H = 800;
export const FONT = '"Press Start 2P", monospace';

export const COLORS = {
  // Rounded blue panels with a bright rim, to match the lush pixel art
  panel: 0x263ea8, panelEdge: 0x0c1030, border: 0x7a98ff,
  button: 0x3456c8, buttonHi: 0x4a6ee6, green: 0x2e9a3e, greenHi: 0x3cb84c,
  red: 0xb02434, redHi: 0xd03646, purple: 0x6a38b0, purpleHi: 0x8248d0, grey: 0x3a4270,
};

export function text(scene, x, y, str, size = 16, color = '#ffffff', origin = 0.5) {
  const t = scene.add.text(x, y, str, {
    fontFamily: FONT, fontSize: `${size}px`, color,
    stroke: '#0c1030', strokeThickness: Math.max(2, Math.round(size / 4)),
    align: 'center', lineSpacing: Math.round(size / 2),
  });
  t.setOrigin(origin, 0.5);
  return t;
}

// A lighter version of a colour, for button rims
function lighten(c) { const r = c >> 16, g = (c >> 8) & 255, b = c & 255, f = (v) => Math.min(255, Math.round(v + (255 - v) * 0.45)); return (f(r) << 16) | (f(g) << 8) | f(b); }

// Pixel-rounded box: dark outline, bright rim, fill and a soft top-left shine
export function roundBox(g, x, y, w, h, fill, rim = COLORS.border, alpha = 1) {
  const P = (px, py, pw, ph) => g.fillRect(x + px, y + py, pw, ph);
  g.fillStyle(COLORS.panelEdge, 1); P(2, 0, w - 4, h); P(0, 2, w, h - 4); P(1, 1, w - 2, h - 2);
  g.fillStyle(rim, 1); P(3, 1, w - 6, h - 2); P(1, 3, w - 2, h - 6); P(2, 2, w - 4, h - 4);
  g.fillStyle(fill, alpha); P(4, 3, w - 8, h - 6); P(3, 4, w - 6, h - 8);
  g.fillStyle(0xffffff, 0.16); P(4, 3, w - 8, 2); P(3, 4, 2, Math.max(0, h - 10));
  return g;
}

export function panel(scene, x, y, w, h, color = COLORS.panel) {
  return roundBox(scene.add.graphics(), x - w / 2 - 4, y - h / 2 - 4, w + 8, h + 8, color);
}

export function button(scene, x, y, w, h, label, onClick, opt = {}) {
  const c = scene.add.container(x, y);
  const base = opt.color ?? COLORS.button;
  const hi = opt.hi ?? COLORS.buttonHi;
  const g = scene.add.graphics();
  const draw = (col, down) => {
    g.clear();
    if (!down) g.fillStyle(COLORS.panelEdge, 1).fillRect(-w / 2, h / 2, w, 4);
    roundBox(g, -w / 2 - 3, -h / 2 - 3 + (down ? 2 : 0), w + 6, h + 6, col, lighten(col));
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

// Settings: volume, damage numbers, vibration, screen shake and cloud save.
// Returns a container; onClose removes it.
export function settingsPanel(scene, onClose, opt = {}) {
  const c = scene.add.container(0, 0).setDepth(1000);
  const shade = scene.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6).setInteractive();
  c.add(shade);
  c.add(panel(scene, W / 2, H / 2, 380, 600));
  c.add(text(scene, W / 2, H / 2 - 250, 'SETTINGS', 20, '#ffe070'));
  const s = save.settings;
  const rows = [
    { label: 'MUSIC', key: 'music' },
    { label: 'SOUND', key: 'sfx' },
  ];
  rows.forEach((r, i) => {
    const y = H / 2 - 180 + i * 64;
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
  const toggles = [
    { label: 'DAMAGE\nNUMBERS', key: 'damageNumbers' },
    { label: 'VIBRATION', key: 'vibration' },
    { label: 'SCREEN\nSHAKE', key: 'shake' },
  ];
  toggles.forEach((r, i) => {
    const y = H / 2 - 50 + i * 60;
    c.add(text(scene, W / 2 - 160, y, r.label, 10, '#ffffff', 0));
    const on = () => s[r.key] !== false;
    const b = button(scene, W / 2 + 90, y, 110, 40, on() ? 'ON' : 'OFF', () => {
      s[r.key] = !on();
      b.label.setText(on() ? 'ON' : 'OFF');
      if (r.key === 'vibration' && on()) buzz(40);
      persist();
    });
    c.add(b);
  });
  if (opt.onCloud) {
    c.add(button(scene, W / 2, H / 2 + 140, 240, 44, 'CLOUD SAVE', () => { c.destroy(); opt.onCloud(); }, { size: 10, color: COLORS.purple, hi: COLORS.purpleHi }));
  }
  c.add(button(scene, W / 2, H / 2 + 230, 200, 48, 'BACK', () => { c.destroy(); onClose && onClose(); }, { color: COLORS.green, hi: COLORS.greenHi }));
  return c;
}

// Phone vibration, when the player has it on
export function buzz(ms) {
  try { if (save.settings.vibration !== false && navigator.vibrate) navigator.vibrate(ms); } catch { /* not supported */ }
}

export function fmtTime(sec) {
  sec = Math.max(0, Math.floor(sec));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;
}
