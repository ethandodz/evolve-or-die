// Pixel art editor for one sprite: draw, fill, pick colors, edit the palette,
// manage animation frames. Sprite data is { pal: ['#hex'], frames: [[row strings]] }.
import { CHARS } from '../art.js';

const h = (tag, attrs = {}, ...kids) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (v !== false && v !== null && v !== undefined) el.setAttribute(k, v === true ? '' : v);
  }
  for (const kid of kids.flat(Infinity)) if (kid !== null && kid !== undefined && kid !== false) el.append(kid);
  return el;
};

const TOOLS = [
  ['pencil', '✏️ Pencil'], ['eraser', '🧽 Eraser'], ['fill', '🪣 Fill'], ['pick', '💧 Pick color'],
];

export class PixelEditor {
  constructor(container, sprite, opts = {}) {
    this.container = container;
    this.opts = opts;
    this.pal = [...sprite.pal];
    this.w = Math.max(...sprite.frames.map(f => Math.max(...f.map(r => r.length))));
    this.h = sprite.frames[0].length;
    this.frames = sprite.frames.map(rows => this.parse(rows));
    this.frame = 0;
    this.color = this.pal.length > 1 ? 1 : 0;
    this.tool = 'pencil';
    this.mirror = false;
    this.grid = true;
    this.zoom = this.fitZoom();
    this.undoStack = [];
    this.drawing = false;
    this.edited = !!opts.edited;
  }

  parse(rows) {
    return Array.from({ length: this.h }, (_, y) => Array.from({ length: this.w }, (_, x) => {
      const ch = (rows[y] || '')[x];
      return !ch || ch === '.' ? -1 : CHARS.indexOf(ch);
    }));
  }

  data() {
    return {
      pal: [...this.pal],
      frames: this.frames.map(f => f.map(row => row.map(i => (i < 0 || !this.pal[i] ? '.' : CHARS[i])).join(''))),
    };
  }

  fitZoom() {
    const avail = Math.min(window.innerWidth - 80, 560);
    return Math.max(4, Math.min(24, Math.floor(avail / Math.max(this.w, this.h))));
  }

  // --- history / saving -----------------------------------------------------
  snapshot() {
    this.undoStack.push(JSON.stringify({ pal: this.pal, frames: this.frames, w: this.w, h: this.h }));
    if (this.undoStack.length > 60) this.undoStack.shift();
  }
  undo() {
    const s = this.undoStack.pop(); if (!s) return;
    const o = JSON.parse(s);
    Object.assign(this, { pal: o.pal, frames: o.frames, w: o.w, h: o.h });
    this.frame = Math.min(this.frame, this.frames.length - 1);
    this.color = Math.min(this.color, this.pal.length - 1);
    this.commit(true);
  }
  commit(full = false) {
    this.edited = true;
    if (this.opts.onChange) this.opts.onChange(this.data());
    if (full) this.mount(); else { this.draw(); this.drawFrames(); }
  }

  // --- layout ---------------------------------------------------------------
  mount() {
    const o = this.opts;
    this.container.innerHTML = '';
    const header = h('div', { class: 'row', style: 'justify-content:space-between;margin-bottom:12px' },
      h('div', { class: 'row' }, o.back || null, h('h2', { style: 'margin:0' }, o.title || 'Sprite'),
        h('span', { class: 'note' }, `${this.w}×${this.h}, ${this.frames.length} frame${this.frames.length > 1 ? 's' : ''}`)),
      h('div', { class: 'row' },
        this.edited && o.onRevert ? h('button', { class: 'btn small', onclick: () => o.onRevert() }, '↺ Original') : null,
        o.onDelete ? h('button', { class: 'btn small danger', onclick: () => o.onDelete() }, 'Delete sprite') : null),
    );

    // Canvas
    this.canvas = h('canvas');
    this.wrap = h('div', { class: 'canvasWrap' }, this.canvas);
    this.bindPointer();

    const tools = h('div', { class: 'toolbar' },
      TOOLS.map(([k, label]) => h('button', { class: 'btn small' + (this.tool === k ? ' on' : ''), onclick: () => { this.tool = k; this.mount(); } }, label)),
      h('button', { class: 'btn small' + (this.mirror ? ' on' : ''), title: 'Draw on both sides at once', onclick: () => { this.mirror = !this.mirror; this.mount(); } }, '🦋 Mirror'),
      h('button', { class: 'btn small', onclick: () => this.undo() }, '↶ Undo'),
    );
    const view = h('div', { class: 'toolbar' },
      h('button', { class: 'btn small', onclick: () => { this.zoom = Math.max(2, this.zoom - 2); this.draw(); } }, '− Zoom'),
      h('button', { class: 'btn small', onclick: () => { this.zoom = Math.min(40, this.zoom + 2); this.draw(); } }, '+ Zoom'),
      h('button', { class: 'btn small' + (this.grid ? ' on' : ''), onclick: () => { this.grid = !this.grid; this.mount(); } }, '# Grid'),
      h('button', { class: 'btn small', onclick: () => this.flip() }, '⇋ Flip'),
      h('button', { class: 'btn small', onclick: () => this.shift(-1, 0) }, '←'),
      h('button', { class: 'btn small', onclick: () => this.shift(1, 0) }, '→'),
      h('button', { class: 'btn small', onclick: () => this.shift(0, -1) }, '↑'),
      h('button', { class: 'btn small', onclick: () => this.shift(0, 1) }, '↓'),
      h('button', { class: 'btn small', onclick: () => this.resize() }, '⤢ Resize'),
      h('button', { class: 'btn small danger', onclick: () => { if (confirm('Clear this frame?')) { this.snapshot(); this.cur().forEach(r => r.fill(-1)); this.commit(); } } }, 'Clear'),
    );
    const left = h('div', {}, tools, this.wrap, view);

    // Right side: palette, frames, preview
    this.paletteEl = h('div', { class: 'palette' });
    this.framesEl = h('div', { class: 'row' });
    this.preview = h('canvas', { style: 'background:#c49a64;border:2px solid var(--line);border-radius:6px;image-rendering:pixelated' });
    this.previewDark = h('canvas', { style: 'background:#1a1410;border:2px solid var(--line);border-radius:6px;image-rendering:pixelated' });
    this.speed = this.speed || 4;
    const right = h('div', {},
      h('h3', { style: 'margin-top:0' }, 'COLORS'),
      h('div', { class: 'note' }, 'Tap a color to draw with it. Change it with the picker below and every pixel of that color updates.'),
      this.paletteEl,
      h('div', { class: 'row' },
        this.colorInput = h('input', { type: 'color', style: 'width:60px;height:36px', oninput: (e) => this.setColor(e.target.value), onchange: () => this.commit() }),
        h('button', { class: 'btn small', onclick: () => this.addColor() }, '+ Add color'),
        h('button', { class: 'btn small', onclick: () => this.removeColor() }, '− Remove color'),
      ),
      h('h3', {}, 'FRAMES'),
      h('div', { class: 'note' }, 'Characters use 2 walking frames. Fire and torches flicker through theirs.'),
      this.framesEl,
      h('div', { class: 'row', style: 'margin-top:8px' },
        h('button', { class: 'btn small', onclick: () => this.addFrame(true) }, '⧉ Copy frame'),
        h('button', { class: 'btn small', onclick: () => this.addFrame(false) }, '+ Blank frame'),
        h('button', { class: 'btn small danger', onclick: () => this.deleteFrame() }, 'Delete frame'),
      ),
      h('h3', {}, 'PREVIEW'),
      h('div', { class: 'row', style: 'align-items:flex-end' }, this.preview, this.previewDark),
      h('div', { class: 'row', style: 'margin-top:6px' }, h('label', { class: 'note' }, 'Speed'),
        h('input', { type: 'range', min: 1, max: 12, value: this.speed, oninput: (e) => { this.speed = +e.target.value; } })),
      h('p', { class: 'note' }, 'Changes save automatically. Open Play test to see them in the game.'),
    );

    this.container.append(header, h('div', { class: 'pixel' }, left, right));
    this.draw(); this.drawPalette(); this.drawFrames(); this.animate();
  }

  cur() { return this.frames[this.frame]; }

  // --- drawing --------------------------------------------------------------
  draw() {
    const z = this.zoom, c = this.canvas;
    c.width = this.w * z; c.height = this.h * z;
    const ctx = c.getContext('2d');
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      ctx.fillStyle = (x + y) % 2 ? '#3a3a3a' : '#4a4a4a';
      ctx.fillRect(x * z, y * z, z, z);
    }
    // Faint previous frame (onion skin) helps line up animation
    if (this.frames.length > 1) {
      const prev = this.frames[(this.frame + this.frames.length - 1) % this.frames.length];
      ctx.globalAlpha = 0.2;
      this.paintFrame(ctx, prev, z);
      ctx.globalAlpha = 1;
    }
    this.paintFrame(ctx, this.cur(), z);
    if (this.grid && z >= 6) {
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= this.w; x++) { ctx.moveTo(x * z + 0.5, 0); ctx.lineTo(x * z + 0.5, this.h * z); }
      for (let y = 0; y <= this.h; y++) { ctx.moveTo(0, y * z + 0.5); ctx.lineTo(this.w * z, y * z + 0.5); }
      ctx.stroke();
    }
    if (this.mirror) {
      ctx.strokeStyle = '#f0c060'; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(this.w * z / 2, 0); ctx.lineTo(this.w * z / 2, this.h * z); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  paintFrame(ctx, f, z) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      const i = f[y][x];
      if (i < 0 || !this.pal[i]) continue;
      ctx.fillStyle = this.pal[i]; ctx.fillRect(x * z, y * z, z, z);
    }
  }

  frameCanvas(f, scale) {
    const c = document.createElement('canvas');
    c.width = this.w * scale; c.height = this.h * scale;
    this.paintFrame(c.getContext('2d'), f, scale);
    return c;
  }

  drawPalette() {
    const el = this.paletteEl; el.innerHTML = '';
    el.append(h('div', { class: 'swatch clear' + (this.tool === 'eraser' ? ' on' : ''), title: 'Transparent', onclick: () => { this.tool = 'eraser'; this.mount(); } }));
    this.pal.forEach((col, i) => {
      el.append(h('div', { class: 'swatch' + (i === this.color && this.tool !== 'eraser' ? ' on' : ''), style: `background:${col}`, title: col,
        onclick: () => { this.color = i; if (this.tool === 'eraser' || this.tool === 'pick') this.tool = 'pencil'; this.mount(); } }));
    });
    if (this.colorInput) this.colorInput.value = this.pal[this.color] || '#000000';
  }

  drawFrames() {
    const el = this.framesEl; if (!el) return; el.innerHTML = '';
    const s = Math.max(1, Math.floor(56 / Math.max(this.w, this.h)));
    this.frames.forEach((f, i) => {
      const c = this.frameCanvas(f, s);
      c.style.cssText = `image-rendering:pixelated;background:#c49a64;border-radius:4px;border:2px solid ${i === this.frame ? '#f0c060' : '#5a3e26'};cursor:pointer`;
      c.onclick = () => { this.frame = i; this.draw(); this.drawFrames(); };
      el.append(c);
    });
  }

  animate() {
    cancelAnimationFrame(this.raf);
    let t = 0, last = performance.now();
    const s = Math.max(2, Math.floor(96 / Math.max(this.w, this.h)));
    const loop = (now) => {
      if (!this.preview.isConnected) return;
      t += (now - last) / 1000; last = now;
      const i = Math.floor(t * this.speed) % this.frames.length;
      for (const c of [this.preview, this.previewDark]) {
        c.width = this.w * s; c.height = this.h * s;
        this.paintFrame(c.getContext('2d'), this.frames[i] || this.frames[0], s);
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  // --- input ----------------------------------------------------------------
  bindPointer() {
    const c = this.canvas;
    const cell = (e) => {
      const r = c.getBoundingClientRect();
      return [Math.floor((e.clientX - r.left) / r.width * this.w), Math.floor((e.clientY - r.top) / r.height * this.h)];
    };
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      const [x, y] = cell(e);
      if (this.tool === 'pick') { this.pick(x, y); return; }
      this.snapshot();
      if (this.tool === 'fill') { this.fill(x, y); this.commit(); return; }
      this.drawing = true; this.dirty = false; this.last = null;
      this.plot(x, y);
    });
    c.addEventListener('pointermove', (e) => { if (this.drawing) { const [x, y] = cell(e); this.plot(x, y); } });
    const end = () => {
      if (!this.drawing) return;
      this.drawing = false;
      if (this.dirty) this.commit(); else this.undoStack.pop();
    };
    c.addEventListener('pointerup', end);
    c.addEventListener('pointercancel', end);
  }

  plot(x, y) {
    // Join fast strokes so lines have no gaps
    const pts = [];
    if (this.last) {
      const [lx, ly] = this.last, n = Math.max(Math.abs(x - lx), Math.abs(y - ly));
      for (let k = 1; k <= n; k++) pts.push([Math.round(lx + (x - lx) * k / n), Math.round(ly + (y - ly) * k / n)]);
    } else pts.push([x, y]);
    this.last = [x, y];
    const v = this.tool === 'eraser' ? -1 : this.color;
    for (const [px, py] of pts) {
      this.set(px, py, v);
      if (this.mirror) this.set(this.w - 1 - px, py, v);
    }
    this.draw();
  }

  set(x, y, v) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    if (this.cur()[y][x] !== v) { this.cur()[y][x] = v; this.dirty = true; }
  }

  fill(x, y) {
    const f = this.cur();
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const from = f[y][x], to = this.color;
    if (from === to) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [px, py] = stack.pop();
      if (px < 0 || py < 0 || px >= this.w || py >= this.h || f[py][px] !== from) continue;
      f[py][px] = to;
      stack.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
    }
  }

  pick(x, y) {
    const i = this.cur()[y]?.[x];
    if (i === undefined) return;
    if (i < 0) this.tool = 'eraser'; else { this.color = i; this.tool = 'pencil'; }
    this.mount();
  }

  // --- palette --------------------------------------------------------------
  setColor(hex) {
    if (!this.colorChanging) { this.snapshot(); this.colorChanging = true; }
    this.pal[this.color] = hex;
    this.draw(); this.drawFrames();
    const sw = this.paletteEl.children[this.color + 1];
    if (sw) sw.style.background = hex;
    clearTimeout(this.colorTimer);
    this.colorTimer = setTimeout(() => { this.colorChanging = false; }, 400);
  }

  addColor() {
    if (this.pal.length >= CHARS.length) { alert('That is the most colors a sprite can have.'); return; }
    this.snapshot();
    this.pal.push(this.pal[this.color] || '#ffffff');
    this.color = this.pal.length - 1;
    this.commit(true);
  }

  removeColor() {
    if (this.pal.length <= 1) return;
    const used = this.frames.some(f => f.some(r => r.includes(this.color)));
    if (used && !confirm('Pixels use this color. Remove it and erase them?')) return;
    this.snapshot();
    const rm = this.color;
    this.pal.splice(rm, 1);
    this.frames = this.frames.map(f => f.map(r => r.map(i => (i === rm ? -1 : i > rm ? i - 1 : i))));
    this.color = Math.max(0, Math.min(rm, this.pal.length - 1));
    this.commit(true);
  }

  // --- frames and transforms ------------------------------------------------
  addFrame(copy) {
    this.snapshot();
    const f = copy ? this.cur().map(r => [...r]) : Array.from({ length: this.h }, () => Array(this.w).fill(-1));
    this.frames.splice(this.frame + 1, 0, f);
    this.frame++;
    this.commit(true);
  }

  deleteFrame() {
    if (this.frames.length <= 1) { alert('A sprite needs at least one frame.'); return; }
    this.snapshot();
    this.frames.splice(this.frame, 1);
    this.frame = Math.min(this.frame, this.frames.length - 1);
    this.commit(true);
  }

  flip() {
    this.snapshot();
    this.frames[this.frame] = this.cur().map(r => [...r].reverse());
    this.commit();
  }

  shift(dx, dy) {
    this.snapshot();
    const f = this.cur();
    this.frames[this.frame] = f.map((r, y) => r.map((_, x) => f[y - dy]?.[x - dx] ?? -1));
    this.commit();
  }

  resize() {
    const s = prompt('New size, width x height (art stays centered at the bottom)', `${this.w}x${this.h}`);
    if (!s) return;
    const [nw, nh] = s.toLowerCase().split('x').map(n => Math.max(4, Math.min(128, parseInt(n) || 0)));
    if (!nw || !nh) return;
    this.snapshot();
    const ox = Math.floor((nw - this.w) / 2), oy = nh - this.h;
    this.frames = this.frames.map(f => Array.from({ length: nh }, (_, y) => Array.from({ length: nw }, (_, x) => f[y - oy]?.[x - ox] ?? -1)));
    this.w = nw; this.h = nh;
    this.zoom = this.fitZoom();
    this.commit(true);
  }
}
