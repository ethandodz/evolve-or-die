// Code-made 8-bit sound effects and music (Web Audio, no files).

const NOTE = (m) => 440 * Math.pow(2, (m - 69) / 12);

class Audio8 {
  constructor() {
    this.ctx = null;
    this.musicVol = 0.5;
    this.sfxVol = 0.7;
    this.last = {};
    this.track = null;
    this.step = 0;
    this.nextTime = 0;
    this.timer = null;
  }

  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.connect(this.master);
      this.noiseBuf = this.ctx.createBuffer(1, this.ctx.sampleRate, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.setVolumes(this.musicVol, this.sfxVol);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setVolumes(music, sfx) {
    this.musicVol = music; this.sfxVol = sfx;
    if (!this.ctx) return;
    this.musicGain.gain.value = music * 0.35;
    this.sfxGain.gain.value = sfx * 0.6;
  }

  tone(freq, dur, type = 'square', vol = 0.3, slideTo = null, when = 0, dest = null) {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || this.sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }

  noise(dur, vol = 0.3, freq = 2000, when = 0, dest = null, type = 'lowpass') {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + when;
    const s = c.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = c.createBiquadFilter();
    f.type = type; f.frequency.value = freq;
    const g = c.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(dest || this.sfxGain);
    s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  throttle(name, ms) {
    const now = performance.now();
    if (this.last[name] && now - this.last[name] < ms) return false;
    this.last[name] = now;
    return true;
  }

  play(name, opt = {}) {
    if (!this.ctx || this.sfxVol <= 0) return;
    const r = 1 + (Math.random() - 0.5) * 0.12;
    switch (name) {
      case 'hit':
        if (!this.throttle(name, 45)) return;
        this.noise(0.05, 0.25, 3000 * r); this.tone(220 * r, 0.05, 'square', 0.08, 110);
        break;
      case 'kill':
        if (!this.throttle(name, 40)) return;
        this.tone(330 * r, 0.09, 'square', 0.12, 80); this.noise(0.08, 0.15, 1200);
        break;
      case 'gem': {
        if (!this.throttle(name, 35)) return;
        const p = Math.min(opt.streak || 0, 24);
        this.tone(NOTE(76 + p), 0.06, 'square', 0.08);
        break;
      }
      case 'coin':
        if (!this.throttle(name, 60)) return;
        this.tone(NOTE(83), 0.05, 'square', 0.1); this.tone(NOTE(88), 0.12, 'square', 0.1, null, 0.05);
        break;
      case 'swing':
        if (!this.throttle(name, 60)) return;
        this.noise(0.09, 0.12, 900 * r, 0, null, 'bandpass');
        break;
      case 'thud':
        if (!this.throttle(name, 50)) return;
        this.noise(0.18, 0.35, 400); this.tone(90 * r, 0.15, 'triangle', 0.3, 40);
        break;
      case 'zap':
        if (!this.throttle(name, 50)) return;
        this.noise(0.15, 0.25, 6000, 0, null, 'highpass'); this.tone(1200, 0.12, 'sawtooth', 0.06, 200);
        break;
      case 'hurt':
        this.tone(200, 0.25, 'sawtooth', 0.2, 60); this.noise(0.2, 0.3, 800);
        break;
      case 'levelup': {
        // The big sound moment
        const seq = [72, 76, 79, 84, 88, 91, 96];
        seq.forEach((m, i) => {
          this.tone(NOTE(m), 0.16, 'square', 0.13, null, i * 0.055);
          this.tone(NOTE(m - 12), 0.16, 'triangle', 0.15, null, i * 0.055);
        });
        this.tone(NOTE(96), 0.6, 'square', 0.1, null, seq.length * 0.055);
        this.noise(0.5, 0.08, 8000, 0.3, null, 'highpass');
        break;
      }
      case 'select':
        this.tone(NOTE(79), 0.06, 'square', 0.12); this.tone(NOTE(86), 0.1, 'square', 0.12, null, 0.06);
        break;
      case 'click':
        this.tone(NOTE(72), 0.04, 'square', 0.1);
        break;
      case 'roar':
        this.noise(1.0, 0.5, 500); this.tone(110, 1.0, 'sawtooth', 0.25, 50);
        break;
      case 'warn':
        for (let i = 0; i < 3; i++) this.tone(880, 0.12, 'square', 0.12, 660, i * 0.2);
        break;
      case 'siren':
        for (let i = 0; i < 4; i++) { this.tone(700, 0.25, 'square', 0.1, 1000, i * 0.5); this.tone(1000, 0.25, 'square', 0.1, 700, i * 0.5 + 0.25); }
        break;
      case 'portal':
        this.tone(200, 1.2, 'triangle', 0.25, 1600); this.noise(1.2, 0.15, 3000, 0, null, 'bandpass');
        break;
      case 'buy':
        [72, 79, 84].forEach((m, i) => this.tone(NOTE(m), 0.1, 'square', 0.12, null, i * 0.07));
        break;
      case 'deny':
        this.tone(160, 0.15, 'square', 0.12, 120);
        break;
      case 'bosskill':
        this.noise(1.5, 0.5, 1200); [60, 64, 67, 72, 76, 79, 84].forEach((m, i) => this.tone(NOTE(m), 0.3, 'square', 0.12, null, 0.3 + i * 0.09));
        break;
      case 'death':
        [67, 63, 60, 55, 48].forEach((m, i) => this.tone(NOTE(m), 0.3, 'square', 0.15, null, i * 0.18));
        break;
    }
  }

  // --- Music: a tiny step sequencer -----------------------------------
  playMusic(name) {
    if (!this.ctx) return;
    if (this.track && this.track.name === name) return;
    this.track = TRACKS[name] ? { name, ...TRACKS[name] } : null;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    if (!this.timer) this.timer = setInterval(() => this.schedule(), 25);
  }

  stopMusic() { this.track = null; }

  schedule() {
    if (!this.track || !this.ctx) return;
    const tr = this.track;
    const stepDur = 60 / tr.bpm / 4;
    while (this.nextTime < this.ctx.currentTime + 0.12) {
      const i = this.step % tr.len;
      const when = this.nextTime - this.ctx.currentTime;
      const lead = tr.lead[i], bass = tr.bass[i], drum = tr.drums[i];
      if (lead != null) this.tone(NOTE(lead), stepDur * (tr.leadLen || 1.8), tr.leadWave, 0.12, null, when, this.musicGain);
      if (bass != null) this.tone(NOTE(bass), stepDur * 1.9, tr.bassWave || 'triangle', 0.28, null, when, this.musicGain);
      if (drum === 'k') this.tone(140, 0.12, 'sine', 0.5, 45, when, this.musicGain);
      else if (drum === 't') this.tone(110, 0.16, 'triangle', 0.4, 70, when, this.musicGain);
      else if (drum === 's') this.noise(0.1, 0.25, 2500, when, this.musicGain);
      else if (drum === 'h') this.noise(0.03, 0.12, 8000, when, this.musicGain, 'highpass');
      this.nextTime += stepDur;
      this.step++;
    }
  }
}

// Patterns are written as space-separated tokens, one per 16th step.
// Numbers are MIDI notes, '-' is a rest.
function pat(str) {
  return str.trim().split(/\s+/).map(t => (t === '-' ? null : isNaN(+t) ? t : +t));
}
function rep(str, n) { return Array(n).fill(str).join(' '); }

const TRACKS = {
  // Stone Age: tribal toms, pentatonic minor
  stone: {
    bpm: 108, len: 64, leadWave: 'square',
    lead: pat(`
      69 - - 72 - 74 - - 76 - 74 - 72 - 69 -
      67 - - 69 - - 72 - 69 - - - - - - -
      69 - - 72 - 74 - - 76 - 79 - 76 - 74 -
      72 - 74 - 72 - 69 - 67 - 69 - - - - -`),
    bass: pat(`
      45 - - - 45 - - - 43 - - - 43 - - -
      41 - - - 41 - - - 43 - - - 40 - - -
      45 - - - 45 - - - 43 - - - 43 - - -
      41 - - - 43 - - - 45 - - - 45 - - -`),
    drums: pat(rep('k - t - - t k - k - t - t t t -', 4)),
  },
  stoneBoss: {
    bpm: 140, len: 64, leadWave: 'sawtooth', bassWave: 'square', leadLen: 1,
    lead: pat(`
      57 57 60 - 57 57 63 - 57 57 64 - 63 - 60 -
      57 57 60 - 57 57 63 - 64 - 63 - 60 - 58 -
      57 57 60 - 57 57 63 - 57 57 64 - 67 - 64 -
      69 - 67 - 64 - 63 - 60 - 58 - 57 - - -`),
    bass: pat(rep('33 - 33 - 33 - 36 - 33 - 33 - 39 - 38 -', 4)),
    drums: pat(rep('k h s h k k s h k h s h k k s s', 4)),
  },
  // Roman Empire: march snare, Phrygian dominant lead
  roman: {
    bpm: 112, len: 64, leadWave: 'square',
    lead: pat(`
      64 - - 65 - - 68 - 69 - - - 68 - 65 -
      64 - - - - - 62 - 64 - - - - - - -
      64 - - 65 - - 68 - 69 - 71 - 72 - 71 -
      69 - 68 - 65 - 64 - 65 - 64 - - - - -`),
    bass: pat(`
      40 - - - 40 - 47 - 40 - - - 40 - 47 -
      41 - - - 41 - 48 - 40 - - - 40 - 47 -
      40 - - - 40 - 47 - 45 - - - 45 - 52 -
      41 - - - 41 - 48 - 40 - - - 40 - - -`),
    drums: pat(rep('k - s s - s k - k - s s s s s -', 4)),
  },
  romanBoss: {
    bpm: 150, len: 64, leadWave: 'sawtooth', bassWave: 'square', leadLen: 1,
    lead: pat(`
      64 65 68 - 64 65 69 - 68 65 64 - 65 - 68 -
      64 65 68 - 64 65 71 - 69 68 65 - 64 - - -
      76 - 77 - 76 - 74 - 72 - 71 - 69 - 68 -
      69 - 68 - 65 - 64 - 65 - 68 - 64 - - -`),
    bass: pat(rep('40 40 - 40 41 - 40 - 40 40 - 40 44 - 41 -', 4)),
    drums: pat(rep('k s k s k s k s k s k s k s s s', 4)),
  },
  police: {
    bpm: 160, len: 32, leadWave: 'square', leadLen: 2,
    lead: pat('81 - 76 - 81 - 76 - 81 - 76 - 81 - 76 - 83 - 78 - 83 - 78 - 83 - 78 - 83 - 78 -'),
    bass: pat(rep('33 - 33 33 - 33 - 33', 4)),
    drums: pat(rep('k h s h k h s s', 4)),
  },
  title: {
    bpm: 96, len: 64, leadWave: 'square',
    lead: pat(`
      57 - - - 64 - - - 62 - 64 - 67 - - -
      69 - - - 67 - 64 - 62 - - - - - - -
      57 - - - 64 - - - 62 - 64 - 67 - 69 -
      72 - - - 71 - 67 - 69 - - - - - - -`),
    bass: pat(rep('33 - - - 33 - - - 31 - - - 31 - - -', 4)),
    drums: pat(rep('t - - - - - - - t - - t - - - -', 4)),
  },
};

export const audio = new Audio8();
