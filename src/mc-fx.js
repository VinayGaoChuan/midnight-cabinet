// ==== mc-fx.js ====
(function () {
const M = window.MC;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (t) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const eback = (t) => { t = clamp(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const eel = (t) => { t = clamp(t, 0, 1); if (t === 0 || t === 1) return t; return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI / 3)) + 1; };
M.ease = { eo, eback, eel, clamp };
const CNF = "'Noto Serif SC', serif", NUMF = "'Cinzel', 'Noto Serif SC', serif";

// ───────── audio: layered synth + reverb + compressor ─────────
let AC = null, OUT = null, DRY = null, REVG = null, pad = null;
const S = M.Sfx;
function impulse(sec, decay) { const n = AC.sampleRate * sec, b = AC.createBuffer(2, n, AC.sampleRate); for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); } return b; }
S.init = function () {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    const comp = AC.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4; comp.connect(AC.destination);
    OUT = AC.createGain(); OUT.gain.value = S.muted ? 0 : 0.55; OUT.connect(comp);
    DRY = AC.createGain(); DRY.gain.value = 1; DRY.connect(OUT);
    const rev = AC.createConvolver(); rev.buffer = impulse(2.2, 2.6); REVG = AC.createGain(); REVG.gain.value = 0.28; rev.connect(REVG); REVG.connect(OUT);
    S._rev = rev;
  } catch (e) { AC = null; }
};
S.setMuted = function (m) { S.muted = m; if (OUT) OUT.gain.value = m ? 0 : 0.55; };
function env(g, t0, a, dur, vol) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
function tone(f, dur, o = {}) {
  if (!AC || S.muted) return; const t0 = AC.currentTime + (o.delay || 0);
  const os = AC.createOscillator(), g = AC.createGain(); os.type = o.type || 'triangle';
  os.frequency.setValueAtTime(f, t0); if (o.to) os.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), t0 + (o.slideT || dur));
  if (o.detune) os.detune.value = o.detune;
  env(g, t0, o.a || 0.005, dur, o.vol == null ? 0.12 : o.vol);
  let node = os;
  if (o.lp) { const f2 = AC.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = o.lp; os.connect(f2); node = f2; }
  node.connect(g); g.connect(DRY); if (o.wet !== 0) { const w = AC.createGain(); w.gain.value = o.wet == null ? 0.6 : o.wet; g.connect(w); w.connect(S._rev); }
  os.start(t0); os.stop(t0 + dur + 0.05);
}
function noise(dur, o = {}) {
  if (!AC || S.muted) return; const t0 = AC.currentTime + (o.delay || 0);
  const n = Math.max(1, Math.floor(AC.sampleRate * dur)), b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  const src = AC.createBufferSource(); src.buffer = b;
  const f = AC.createBiquadFilter(); f.type = o.ft || 'bandpass'; f.Q.value = o.q || 0.8; f.frequency.setValueAtTime(o.f || 1200, t0); if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t0 + dur);
  const g = AC.createGain(); env(g, t0, o.a || 0.003, dur, o.vol == null ? 0.2 : o.vol);
  src.connect(f); f.connect(g); g.connect(DRY); if (o.wet) { const w = AC.createGain(); w.gain.value = o.wet; g.connect(w); w.connect(S._rev); }
  src.start(t0); src.stop(t0 + dur + 0.05);
}
const chord = (fs, dur, o = {}) => fs.forEach((f, i) => { tone(f, dur, Object.assign({}, o, { delay: (o.delay || 0) + i * (o.arp || 0) })); tone(f * 2.003, dur * 0.7, Object.assign({}, o, { vol: (o.vol || 0.1) * 0.25, type: 'sine', delay: (o.delay || 0) + i * (o.arp || 0) })); });
Object.assign(S, {
  tone: (f, dur, type, vol, slide, delay) => tone(f, dur, { type, vol, to: slide ? f + slide : 0, delay }),
  noise: (dur, vol, f, delay) => noise(dur, { vol, f, delay }),
  hover() { if (S.lim('hover', 40)) tone(1800, 0.03, { type: 'sine', vol: 0.025, wet: 0.2 }); },
  click() { tone(900, 0.04, { type: 'square', vol: 0.05, lp: 3000, wet: 0.2 }); tone(180, 0.08, { type: 'sine', vol: 0.12, to: 90, wet: 0 }); },
  tick(p) { if (S.lim('tick', 28)) { tone(1400 + (p || 0) * 60, 0.025, { type: 'square', vol: 0.05, lp: 5000, wet: 0.15 }); noise(0.02, { f: 5000, vol: 0.05 }); } },
  hit() { if (S.lim('hit', 45)) { noise(0.06, { f: 1800, vol: 0.14, q: 0.6 }); tone(140, 0.07, { type: 'sine', vol: 0.14, to: 60, wet: 0 }); } },
  shoot() { if (S.lim('shoot', 55)) { noise(0.07, { f: 3200, to: 1200, vol: 0.06, q: 2 }); tone(1100, 0.05, { type: 'square', vol: 0.03, to: 500, lp: 4000, wet: 0.1 }); } },
  kill() { if (S.lim('kill', 40)) { tone(660, 0.16, { type: 'square', vol: 0.06, to: 180, lp: 2500 }); noise(0.12, { f: 900, vol: 0.1 }); } },
  crit() { noise(0.08, { f: 2600, vol: 0.18 }); tone(1760, 0.25, { type: 'sine', vol: 0.08 }); tone(2640, 0.2, { type: 'sine', vol: 0.05, delay: 0.02 }); tone(90, 0.12, { type: 'sine', vol: 0.2, to: 40, wet: 0 }); },
  mult() { chord([784, 988, 1175, 1568], 0.18, { type: 'square', vol: 0.05, arp: 0.045, lp: 4200 }); },
  coin() { tone(1319, 0.1, { type: 'square', vol: 0.05, lp: 5000 }); tone(1976, 0.35, { type: 'sine', vol: 0.08, delay: 0.06 }); tone(2637, 0.3, { type: 'sine', vol: 0.03, delay: 0.08 }); },
  land(i) { const f = [523, 659, 784, 988, 1175][(i || 0) % 5]; tone(f, 0.18, { type: 'triangle', vol: 0.12 }); tone(f * 2, 0.12, { type: 'sine', vol: 0.05, delay: 0.01 }); tone(120, 0.08, { type: 'sine', vol: 0.12, to: 60, wet: 0 }); },
  whoosh(d) { noise(d || 0.35, { f: 400, to: 3500, vol: 0.12, q: 1.2, a: 0.08, wet: 0.3 }); },
  sparkle() { for (let i = 0; i < 5; i++) tone(2000 + Math.random() * 2000, 0.12, { type: 'sine', vol: 0.03, delay: i * 0.04 }); },
  up(i = 0) { chord([523, 659, 784, 1047, 1319, 1568].slice(0, 3 + i).map(f => f * (1 + i * 0.12)), 0.22, { type: 'square', vol: 0.06, arp: 0.055, lp: 3800 }); if (i >= 2) S.sparkle(); },
  bolt(tier) { noise(0.3 + tier * 0.15, { f: 3000, to: 300, vol: 0.2 + tier * 0.06, q: 0.4, wet: 0.5 }); tone(70, 0.4 + tier * 0.1, { type: 'sawtooth', vol: 0.12 + tier * 0.03, to: 35, lp: 600 }); },
  boom() { if (S.lim('boom', 80)) { noise(0.6, { ft: 'lowpass', f: 1400, to: 80, vol: 0.35, wet: 0.5 }); tone(70, 0.5, { type: 'sine', vol: 0.35, to: 28, wet: 0 }); } },
  impact() { noise(0.9, { ft: 'lowpass', f: 2400, to: 60, vol: 0.4, wet: 0.7 }); tone(55, 0.8, { type: 'sine', vol: 0.45, to: 25, wet: 0 }); tone(110, 0.4, { type: 'square', vol: 0.06, to: 40, lp: 400 }); },
  cast() { noise(0.55, { f: 300, to: 5000, vol: 0.14, q: 3, a: 0.4, wet: 0.5 }); tone(220, 0.55, { type: 'sawtooth', vol: 0.05, to: 880, a: 0.4, lp: 2000 }); },
  die() { tone(330, 0.6, { type: 'triangle', vol: 0.15, to: 90 }); tone(165, 0.8, { type: 'triangle', vol: 0.1, to: 60, delay: 0.1 }); noise(0.4, { f: 400, vol: 0.08, delay: 0.05 }); },
  heal() { chord([659, 880, 1109, 1319], 0.5, { type: 'sine', vol: 0.07, arp: 0.07 }); S.sparkle(); },
  win() { const seq = [[523, 659, 784], [587, 740, 880], [659, 831, 988], [784, 988, 1175, 1568]]; seq.forEach((c, i) => chord(c, i === 3 ? 1.2 : 0.2, { type: 'square', vol: 0.05, delay: i * 0.14, lp: 3600 })); tone(131, 1.4, { type: 'triangle', vol: 0.15, delay: 0.42 }); setTimeout(() => S.sparkle(), 500); },
  fanfare() { S.win(); noise(0.6, { f: 6000, vol: 0.05, delay: 0.42, wet: 0.6 }); },
  lose() { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.45, { type: 'triangle', vol: 0.13, to: f * 0.97, delay: i * 0.22 })); },
  stamp() { noise(0.2, { ft: 'lowpass', f: 900, vol: 0.4 }); tone(70, 0.3, { type: 'sine', vol: 0.4, to: 35, wet: 0 }); },
  lever() { noise(0.12, { f: 700, vol: 0.2 }); for (let i = 0; i < 6; i++) tone(300 + i * 40, 0.02, { type: 'square', vol: 0.04, delay: i * 0.03, lp: 2000 }); tone(90, 0.2, { type: 'sine', vol: 0.25, to: 50, delay: 0.2, wet: 0 }); },
  reelStop() { tone(200, 0.12, { type: 'square', vol: 0.08, to: 90, lp: 1200 }); noise(0.08, { f: 1500, vol: 0.12 }); },
  chest() { noise(0.4, { f: 300, to: 900, vol: 0.12, q: 4 }); setTimeout(() => { S.impact(); chord([523, 659, 784, 1047, 1319], 1.4, { type: 'sine', vol: 0.06, arp: 0.03, delay: 0.05 }); S.sparkle(); }, 10); },
  heart() { tone(55, 0.18, { type: 'sine', vol: 0.35, to: 40, wet: 0 }); tone(50, 0.16, { type: 'sine', vol: 0.25, to: 36, delay: 0.16, wet: 0 }); },
  shatter() { noise(0.5, { f: 6000, to: 1500, vol: 0.18, q: 0.5, wet: 0.6 }); for (let i = 0; i < 6; i++) tone(2500 + Math.random() * 3000, 0.15, { type: 'sine', vol: 0.04, delay: i * 0.03 }); },
  pop() { tone(700, 0.06, { type: 'sine', vol: 0.12, to: 1400, wet: 0.1 }); noise(0.04, { f: 3000, vol: 0.06 }); },
  creak() { noise(0.5, { f: 250, to: 500, vol: 0.12, q: 8 }); },
  dig() { noise(0.25, { ft: 'lowpass', f: 600, vol: 0.25 }); tone(80, 0.2, { type: 'square', vol: 0.06, to: 50, lp: 300 }); for (let i = 0; i < 4; i++) noise(0.05, { f: 3000, vol: 0.06, delay: 0.1 + i * 0.07 }); },
  build() { for (let i = 0; i < 3; i++) { tone(1200, 0.08, { type: 'square', vol: 0.05, lp: 3000, delay: i * 0.16 }); noise(0.04, { f: 4000, vol: 0.1, delay: i * 0.16 }); } },
  alarm() { for (let i = 0; i < 3; i++) { tone(660, 0.25, { type: 'sawtooth', vol: 0.05, to: 990, lp: 2000, delay: i * 0.5 }); tone(990, 0.25, { type: 'sawtooth', vol: 0.05, to: 660, lp: 2000, delay: i * 0.5 + 0.25 }); } },
  portal() { tone(110, 1.2, { type: 'sine', vol: 0.12, a: 0.3 }); tone(165, 1.2, { type: 'sine', vol: 0.06, a: 0.3, detune: 8 }); noise(1.0, { f: 800, to: 2400, vol: 0.05, q: 5, a: 0.4, wet: 0.7 }); },
  drone(on) {
    if (!AC) return;
    if (on && !pad) { pad = []; [55, 82.4, 110, 164.8].forEach((f, i) => { const o = AC.createOscillator(), g = AC.createGain(), lp = AC.createBiquadFilter(); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6; lp.type = 'lowpass'; lp.frequency.value = 420; g.gain.value = 0.0001; g.gain.exponentialRampToValueAtTime(0.018, AC.currentTime + 3); o.connect(lp); lp.connect(g); g.connect(DRY); const w = AC.createGain(); w.gain.value = 0.8; g.connect(w); w.connect(S._rev); o.start(); pad.push({ o, g }); }); }
    else if (!on && pad) { pad.forEach(p => { p.g.gain.exponentialRampToValueAtTime(0.0001, AC.currentTime + 1); p.o.stop(AC.currentTime + 1.1); }); pad = null; }
  },
});

// ───────── HD-2D post processing ─────────
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const PP = {};
function pp(W, H) { const k = W + 'x' + H; if (!PP[k]) { const lw = Math.round(W / 4), lh = Math.round(H / 4); PP[k] = { lw, lh, low: mk(lw, lh), bl: mk(lw, lh), dof: mk(lw, lh), grain: null }; } return PP[k]; }
M.hd2d = function (ctx, W, H, o = {}) {
  if (M.HD2D_OFF) return;
  const P = pp(W, H), src = ctx.canvas;
  const lx = P.low.getContext('2d'), bx = P.bl.getContext('2d'), dx = P.dof.getContext('2d');
  lx.imageSmoothingEnabled = true; lx.setTransform(1, 0, 0, 1, 0, 0); lx.filter = 'none'; lx.clearRect(0, 0, P.lw, P.lh); lx.drawImage(src, 0, 0, W * (ctx._R || 1), H * (ctx._R || 1), 0, 0, P.lw, P.lh);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = true;
  // tilt-shift depth of field
  if (o.dof !== 0) {
    dx.globalCompositeOperation = 'source-over'; dx.clearRect(0, 0, P.lw, P.lh); dx.filter = 'blur(' + (o.dofBlur || 2.2) + 'px)'; dx.drawImage(P.low, 0, 0); dx.filter = 'none';
    dx.globalCompositeOperation = 'destination-in';
    const f = (o.focus == null ? 0.55 : o.focus), band = o.band || 0.22, g = dx.createLinearGradient(0, 0, 0, P.lh);
    g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(clamp(f - band - 0.18, 0, 1), 'rgba(0,0,0,0.85)'); g.addColorStop(clamp(f - band, 0, 1), 'rgba(0,0,0,0)'); g.addColorStop(clamp(f + band, 0, 1), 'rgba(0,0,0,0)'); g.addColorStop(clamp(f + band + 0.15, 0, 1), 'rgba(0,0,0,0.9)'); g.addColorStop(1, 'rgba(0,0,0,1)');
    dx.fillStyle = g; dx.fillRect(0, 0, P.lw, P.lh); dx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = o.dofA == null ? 1 : o.dofA; ctx.drawImage(P.dof, 0, 0, W, H);
  }
  // bloom
  bx.clearRect(0, 0, P.lw, P.lh); bx.filter = 'brightness(' + (o.bright || 0.9) + ') contrast(' + (o.contrast || 3.2) + ') saturate(1.4) blur(' + (o.bloomBlur || 5) + 'px)'; bx.drawImage(P.low, 0, 0); bx.filter = 'none';
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = o.bloom == null ? 0.55 : o.bloom; ctx.drawImage(P.bl, 0, 0, W, H);
  // color grade
  if (o.grade) { ctx.globalCompositeOperation = 'soft-light'; ctx.globalAlpha = o.gradeA || 0.35; const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, o.grade[0]); g.addColorStop(1, o.grade[1]); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  // vignette
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  const v = ctx.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.35, W / 2, H * 0.52, Math.max(W, H) * 0.72);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,' + (o.vig == null ? 0.6 : o.vig) + ')'); ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
};
M.glow = function (ctx, x, y, r, col, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a == null ? 0.5 : a;
  const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(0.35, col + '66'); g.addColorStop(1, col + '00');
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2); ctx.restore();
};
M.godRays = function (ctx, W, H, t, col, n, a) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < (n || 5); i++) {
    const x = W * (0.1 + 0.85 * ((i * 0.618 + 0.13) % 1)) + Math.sin(t * 0.3 + i) * 60, w = 90 + (i % 3) * 70, al = (a || 0.06) * (0.6 + 0.4 * Math.sin(t * 0.7 + i * 2));
    const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, col + 'aa'); g.addColorStop(1, col + '00');
    ctx.globalAlpha = al; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x, -20); ctx.lineTo(x + w, -20); ctx.lineTo(x + w * 2.4 + 300, H); ctx.lineTo(x + 300, H); ctx.closePath(); ctx.fill();
  }
  ctx.restore();
};

// ───────── ambient particles ─────────
M.Ambient = class {
  constructor(kind, W, H, n) { this.kind = kind; this.W = W; this.H = H; this.p = []; for (let i = 0; i < (n || 60); i++) this.p.push(this.spawn(true)); }
  spawn(init) {
    const k = this.kind, W = this.W, H = this.H;
    const p = { x: Math.random() * W, y: init ? Math.random() * H : (k === 'embers' || k === 'bubbles' ? H + 20 : k === 'snow' || k === 'ash' || k === 'petals' ? -20 : Math.random() * H), z: 0.4 + Math.random() * 1.2, ph: Math.random() * 7, life: 0 };
    return p;
  }
  update(dt) {
    const k = this.kind;
    this.p.forEach((p, i) => {
      p.life += dt; p.ph += dt;
      if (k === 'embers') { p.y -= (40 + 50 * p.z) * dt; p.x += Math.sin(p.ph * 1.5) * 30 * dt; }
      else if (k === 'snow' || k === 'ash') { p.y += (30 + 30 * p.z) * dt; p.x += Math.sin(p.ph) * 25 * dt; }
      else if (k === 'petals') { p.y += (40 + 20 * p.z) * dt; p.x += (40 + Math.sin(p.ph) * 40) * dt; }
      else if (k === 'bubbles') { p.y -= (30 + 40 * p.z) * dt; p.x += Math.sin(p.ph * 2) * 20 * dt; }
      else { p.x += Math.sin(p.ph * 0.5 + i) * 12 * dt; p.y += Math.cos(p.ph * 0.4 + i) * 10 * dt - 6 * dt; }
      if (p.y < -40 || p.y > this.H + 40 || p.x < -40 || p.x > this.W + 40) Object.assign(p, this.spawn(false));
    });
  }
  draw(ctx, ox, oy) {
    const k = this.kind, col = { motes: '#ffe6a8', embers: '#ff8a3a', fireflies: '#c8ff7a', snow: '#eef6ff', ash: '#9a8f9a', bubbles: '#9fe8ff', spores: '#d59bff', petals: '#ffb0d0', sparks: '#8ff6ff' }[k] || '#fff';
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    this.p.forEach((p, i) => {
      const px = ((p.x - (ox || 0) * p.z * 0.15) % this.W + this.W) % this.W, py = p.y - (oy || 0) * p.z * 0.08;
      let a = 0.5 * p.z; if (k === 'fireflies' || k === 'motes' || k === 'spores' || k === 'sparks') a *= 0.5 + 0.5 * Math.sin(p.ph * (k === 'fireflies' ? 3 : 1.2) + i);
      const s = Math.round((k === 'snow' ? 3 : k === 'bubbles' ? 4 : 2.5) * p.z * 2);
      ctx.globalAlpha = clamp(a, 0, 1) * 0.35; const g = ctx.createRadialGradient(px, py, 0, px, py, s * 4); g.addColorStop(0, col); g.addColorStop(1, col + '00'); ctx.fillStyle = g; ctx.fillRect(px - s * 4, py - s * 4, s * 8, s * 8);
      ctx.globalAlpha = clamp(a, 0, 1); ctx.fillStyle = col;
      if (k === 'bubbles') { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(px - s, py - s, s * 2, s * 2); } else ctx.fillRect(Math.round(px - s / 2), Math.round(py - s / 2), s, s);
    });
    ctx.restore();
  }
};

// ───────── UI fx layer (flyers, bursts, confetti, text pops) ─────────
M.FxLayer = class {
  constructor() { this.items = []; this.t = 0; this.shake = 0; this.trauma = 0; this.sx = 0; this.sy = 0; this.sr = 0; this.flashA = 0; this.flashC = '#fff'; this.freezeUntil = 0; }
  get busy() { return this.items.length > 0 || this.trauma > 0.01 || this.flashA > 0.01; }
  get frozen() { return performance.now() < this.freezeUntil; }
  freeze(ms) { this.freezeUntil = Math.max(this.freezeUntil, performance.now() + ms); }
  spark(x, y, col, n, o = {}) { for (let i = 0; i < n; i++) { const a = o.dir != null ? o.dir + (Math.random() - 0.5) * (o.spread || 1) : Math.random() * Math.PI * 2, v = (o.v || 900) * (0.3 + Math.random() * 0.9); this.add({ k: 'spark', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, col: Math.random() < 0.3 ? '#ffffff' : col, w: (o.w || 5) * (0.5 + Math.random()), life: (o.life || 0.45) * (0.5 + Math.random() * 0.8), g: o.g == null ? 600 : o.g, delay: o.delay }); } }
  shock(x, y, r, col, life, delay) { this.add({ k: 'shock', x, y, r: r || 400, col: col || '#ffffff', life: life || 0.45, delay }); }
  flare(x, y, r, col, life, delay) { this.add({ k: 'flare', x, y, r: r || 200, col: col || '#ffffff', life: life || 0.25, delay }); }
  explode(x, y, col, p = 1) { this.flare(x, y, 160 + 120 * p, '#ffffff', 0.22 + 0.06 * p); this.flare(x, y, 260 + 200 * p, col, 0.4 + 0.1 * p); this.shock(x, y, 260 + 260 * p, col, 0.42 + 0.08 * p); this.shock(x, y, 180 + 200 * p, '#ffffff', 0.32, 0.06); if (p >= 2) this.shock(x, y, 500 + 300 * p, col, 0.7, 0.12); this.spark(x, y, col, Math.round(26 * p), { v: 700 + 300 * p, w: 4 + p * 2 }); this.burst(x, y, col, Math.round(14 * p), { v: 420 + 120 * p, s: 10 + 4 * p }); this.kick(5 + 7 * p); this.flash(col, 0.12 + 0.12 * p); this.freeze(30 + 35 * p); }
  clickBurst(x, y, col) { this.flare(x, y, 60, '#ffffff', 0.14); this.ring(x, y, 6, 70, col || '#ffe08a', 5, 0.28); this.spark(x, y, col || '#ffe08a', 9, { v: 520, w: 3, life: 0.3, g: 300 }); this.kick(1.6); }
  coins(x, y, n, o = {}) { for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * (o.spread || 1.3), v = (o.v || 900) * (0.5 + Math.random() * 0.6); this.add({ k: 'coin', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, ph: Math.random() * 6, life: 1.4 + Math.random() * 0.6, delay: (o.delay || 0) + Math.random() * (o.spreadT || 0.4) }); } }
  add(o) { o.t0 = this.t + (o.delay || 0); this.items.push(o); return o; }
  fly(img, from, to, o = {}) {
    const cx = (from.x + to.x) / 2 + (o.curve == null ? (Math.random() - 0.5) * 300 : o.curve), cy = Math.min(from.y, to.y) - (o.arc == null ? 260 : o.arc);
    return this.add({ k: 'fly', img, from, to, cx, cy, life: o.dur || 0.75, s0: o.s0 || 1, s1: o.s1 == null ? 0.45 : o.s1, col: o.col || '#ffe08a', onLand: o.onLand, delay: o.delay, landed: false, trail: [] });
  }
  burst(x, y, col, n, o = {}) { for (let i = 0; i < (n || 16); i++) { const a = Math.random() * Math.PI * 2, v = (o.v || 380) * (0.35 + Math.random() * 0.8); this.add({ k: 'pt', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.up || 120), g: o.g == null ? 900 : o.g, col: i % 4 === 0 ? '#ffffff' : col, s: (o.s || 10) * (0.5 + Math.random()), life: (o.life || 0.7) * (0.6 + Math.random() * 0.6), delay: o.delay }); } }
  confetti(n, o = {}) { const cols = o.cols || ['#ffcc33', '#ff5a7a', '#6fe0ff', '#9cff7a', '#ffffff', '#c78aff']; for (let i = 0; i < n; i++) this.add({ k: 'conf', x: o.x == null ? Math.random() * 1920 : o.x + (Math.random() - 0.5) * 200, y: o.y == null ? -30 - Math.random() * 300 : o.y, vx: (Math.random() - 0.5) * (o.x == null ? 200 : 1400), vy: o.y == null ? 120 + Math.random() * 200 : -600 - Math.random() * 700, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, col: cols[i % cols.length], w: 10 + Math.random() * 10, h: 6 + Math.random() * 6, life: 2.6 + Math.random(), delay: (o.delay || 0) + Math.random() * 0.2 }); }
  ring(x, y, r0, r1, col, w, life, delay) { this.add({ k: 'ring', x, y, r0, r1, col, w, life: life || 0.5, delay }); }
  rays(x, y, col, life, o = {}) { return this.add({ k: 'rays', x, y, col, life: life || 1.5, n: o.n || 14, r: o.r || 520, delay: o.delay, spin: o.spin || 0.4 }); }
  pop(x, y, text, col, size, o = {}) { this.add({ k: 'pop', x, y, text, col, size: size || 60, life: o.life || 1.1, rise: o.rise == null ? 80 : o.rise, num: o.num, delay: o.delay, slam: o.slam }); }
  flash(col, a) { this.flashC = col; this.flashA = Math.max(this.flashA, a); }
  kick(v) { this.trauma = Math.min(1, this.trauma + v / 34); }
  update(dt) {
    this.t += dt; this.trauma = Math.max(0, this.trauma - dt * 1.9); const tr = this.trauma * this.trauma, T = this.t; this.shake = tr * 30; this.sx = tr * 34 * (Math.sin(T * 61) * 0.6 + Math.sin(T * 97 + 1) * 0.4); this.sy = tr * 30 * (Math.sin(T * 71 + 2) * 0.6 + Math.sin(T * 113 + 3) * 0.4); this.sr = tr * 1.1 * Math.sin(T * 53 + 5); this.flashA = Math.max(0, this.flashA - dt * 3);
    this.items = this.items.filter(it => {
      const d = this.t - it.t0; if (d < 0) return true;
      if (it.k === 'fly') {
        const p = d / it.life;
        if (p >= 1 && !it.landed) { it.landed = true; this.burst(it.to.x, it.to.y, it.col, 12, { v: 300, s: 9, life: 0.5 }); this.spark(it.to.x, it.to.y, it.col, 10, { v: 520, w: 3, life: 0.3, g: 200 }); this.flare(it.to.x, it.to.y, 90, it.col, 0.2); this.ring(it.to.x, it.to.y, 10, 80, it.col, 6, 0.35); this.kick(1.2); M.Sfx.land(it.li || 0); it.onLand && it.onLand(); return false; }
        return true;
      }
      return d < it.life;
    });
  }
  pos(it, p) { const q = 1 - p; const e = p < 0.2 ? p * 0.6 : 0.12 + (p - 0.2) / 0.8 * 0.88; const u = eo(e) * 0.3 + e * 0.7; const a = 1 - u; return { x: a * a * it.from.x + 2 * a * u * it.cx + u * u * it.to.x, y: a * a * it.from.y + 2 * a * u * it.cy + u * u * it.to.y }; }
  draw(ctx, noClear) {
    ctx.setTransform(1, 0, 0, 1, 0, 0); if (!noClear) ctx.clearRect(0, 0, 1920, 1080);
    for (const it of this.items) {
      const d = this.t - it.t0; if (d < 0) continue; const p = clamp(d / it.life, 0, 1);
      if (it.k === 'fly') {
        const P = this.pos(it, p); it.trail.unshift(P); if (it.trail.length > 10) it.trail.pop();
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        it.trail.forEach((q, i) => { ctx.globalAlpha = 0.35 * (1 - i / 10); ctx.fillStyle = it.col; const s = 16 * (1 - i / 10); ctx.fillRect(q.x - s / 2, q.y - s / 2, s, s); });
        ctx.restore();
        M.glow(ctx, P.x, P.y, 70, it.col, 0.5);
        const pop = p < 0.18 ? eback(p / 0.18) : 1, sc = (it.s0 + (it.s1 - it.s0) * eo(p)) * pop * (p < 0.18 ? 1.15 : 1);
        if (it.img) { const w = it.img.width * sc, h = it.img.height * sc; ctx.imageSmoothingEnabled = false; ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(Math.sin(p * 9) * 0.15 * (1 - p)); ctx.drawImage(it.img, -w / 2, -h / 2, w, h); ctx.restore(); }
        else if (it.text) { ctx.font = `${Math.round(44 * sc)}px ${CNF}`; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(it.text, P.x + 3, P.y + 3); ctx.fillStyle = it.col; ctx.fillText(it.text, P.x, P.y); }
      } else if (it.k === 'pt') {
        const x = it.x + it.vx * d, y = it.y + it.vy * d + 0.5 * it.g * d * d; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p; ctx.fillStyle = it.col; const s = it.s * (1 - p * 0.5); ctx.fillRect(x - s / 2, y - s / 2, s, s); ctx.restore();
      } else if (it.k === 'conf') {
        const x = it.x + it.vx * d * (it.vy < 0 ? Math.max(0.2, 1 - d * 0.5) : 1), y = it.y + it.vy * d + (it.vy < 0 ? 700 * d * d : 0), r = it.rot + it.vr * d;
        ctx.save(); ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1; ctx.translate(x + Math.sin(d * 4 + it.rot) * 30, y); ctx.rotate(r); ctx.scale(1, Math.abs(Math.cos(d * 6 + it.rot))); ctx.fillStyle = it.col; ctx.fillRect(-it.w / 2, -it.h / 2, it.w, it.h); ctx.restore();
      } else if (it.k === 'ring') {
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p; ctx.strokeStyle = it.col; ctx.lineWidth = it.w * (1 - p * 0.6); ctx.beginPath(); ctx.arc(it.x, it.y, it.r0 + (it.r1 - it.r0) * eo(p), 0, Math.PI * 2); ctx.stroke(); ctx.restore();
      } else if (it.k === 'rays') {
        const a = p < 0.15 ? p / 0.15 : p > 0.8 ? (1 - p) / 0.2 : 1; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(it.x, it.y); ctx.rotate(d * it.spin);
        for (let i = 0; i < it.n; i++) { ctx.rotate(Math.PI * 2 / it.n); const g = ctx.createLinearGradient(0, 0, it.r, 0); g.addColorStop(0, it.col + 'aa'); g.addColorStop(1, it.col + '00'); ctx.globalAlpha = a * 0.55; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(it.r, -it.r * 0.12); ctx.lineTo(it.r, it.r * 0.12); ctx.closePath(); ctx.fill(); }
        ctx.restore(); M.glow(ctx, it.x, it.y, it.r * 0.5, it.col, a * 0.5);
      } else if (it.k === 'spark') {
        const dd = d, dr = Math.exp(-dd * 3), x = it.x + it.vx * (1 - dr) / 3, y = it.y + it.vy * (1 - dr) / 3 + 0.5 * it.g * dd * dd, vx = it.vx * dr, vy = it.vy * dr + it.g * dd, L = 0.035;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 1 - p; ctx.strokeStyle = it.col; ctx.lineCap = 'round'; ctx.lineWidth = it.w * (1 - p * 0.7); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - vx * L, y - vy * L); ctx.stroke(); ctx.restore();
      } else if (it.k === 'shock') {
        const r = it.r * eo(p), w = Math.max(2, 70 * (1 - p)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - p) * 0.9;
        const g = ctx.createRadialGradient(it.x, it.y, Math.max(0, r - w), it.x, it.y, r + 2); g.addColorStop(0, it.col + '00'); g.addColorStop(0.75, it.col + '88'); g.addColorStop(1, '#ffffffcc'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(it.x, it.y, r + 2, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      } else if (it.k === 'flare') {
        const r = it.r * (0.4 + 0.6 * eo(p)); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Math.pow(1 - p, 1.5); const g = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, r); g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, it.col + 'ee'); g.addColorStop(1, it.col + '00'); ctx.fillStyle = g; ctx.fillRect(it.x - r, it.y - r, r * 2, r * 2); ctx.restore();
      } else if (it.k === 'coin') {
        const x = it.x + it.vx * d, y = it.y + it.vy * d + 1100 * d * d, w = Math.abs(Math.cos(d * 12 + it.ph)) * 22 + 4; ctx.save(); ctx.globalAlpha = p > 0.8 ? (1 - p) / 0.2 : 1; ctx.fillStyle = '#8a5a10'; ctx.fillRect(x - w / 2, y - 12, w, 26); ctx.fillStyle = '#ffcc33'; ctx.fillRect(x - w / 2, y - 13, w, 22); ctx.fillStyle = '#fff6c0'; ctx.fillRect(x - w / 4, y - 9, Math.max(2, w / 4), 8); ctx.restore(); M.glow(ctx, x, y, 30, '#ffcc33', 0.3);
      } else if (it.k === 'pop') {
        const sc = it.slam ? (p < 0.1 ? 3.2 - 2.2 * eo(p / 0.1) : 1 + 0.12 * Math.exp(-(p - 0.1) * 14) * Math.cos((p - 0.1) * 60)) : (p < 0.15 ? 0.3 + eback(p / 0.15) * 0.9 : 1.2 - 0.2 * eo((p - 0.15) / 0.25)), y = it.y - it.rise * eo(p);
        ctx.save(); ctx.globalAlpha = p > 0.75 ? (1 - p) / 0.25 : 1; ctx.translate(it.x, y); ctx.scale(sc, sc); ctx.font = `${it.size}px ${it.num ? NUMF : CNF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = it.size * 0.16; ctx.strokeStyle = '#140c10'; ctx.strokeText(it.text, 0, 0); ctx.fillStyle = it.col; ctx.fillText(it.text, 0, 0); ctx.restore();
      }
    }
    if (this.flashA > 0) { ctx.globalAlpha = this.flashA; ctx.fillStyle = this.flashC; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = 1; }
  }
};

// ───────── the great reel (slot cabinet) ─────────
M.reelP = function (r) {
  const N = r.tiles.length, L0 = N * 4 + r.land, t = r.t;
  let p = L0 * (1 - Math.pow(1 - clamp((t - 0.45) / 1.9, 0, 1), 3.2));
  for (let i = 0; i < r.ups; i++) { const at = 2.55 + i * 0.95; if (t >= at) p = L0 + i + eback((t - at) / 0.4); }
  if (r.tease) { const at = 2.55 + r.ups * 0.95; if (t >= at) { const q = clamp((t - at) / 0.75, 0, 1); p = L0 + r.ups + (q < 0.55 ? 0.47 * eo(q / 0.55) : 0.47 * (1 - eback((q - 0.55) / 0.45))); } }
  return p;
};
M.reelLock = (r) => 2.55 + r.ups * 0.95 + (r.tease ? 0.75 : 0);
M.reelDur = (r) => M.reelLock(r) + 1.5;
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function bolt(ctx, x1, y1, x2, y2, col, w, seed) { let s = seed; const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; }; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x1, y1); const n = 9; for (let i = 1; i < n; i++) { const t = i / n; ctx.lineTo(x1 + (x2 - x1) * t + (rnd() - 0.5) * 60, y1 + (y2 - y1) * t + (rnd() - 0.5) * 60); } ctx.lineTo(x2, y2); ctx.stroke(); ctx.strokeStyle = '#fff'; ctx.lineWidth = w * 0.35; ctx.stroke(); ctx.restore(); }
M.bolt = bolt;
M.drawReel = function (ctx, r, fx) {
  const t = r.t, N = r.tiles.length, p = M.reelP(r), lockT = M.reelLock(r), dur = M.reelDur(r);
  const vel = Math.abs(M.reelP(Object.assign({}, r, { t: t + 0.02 })) - p) / 0.02;
  const cur = r.tiles[((Math.round(p) % N) + N) % N];
  const inA = eback(t / 0.35), outA = clamp((dur - t) / 0.25, 0, 1);
  const X = 960, Y = 540;
  ctx.save();
  ctx.globalAlpha = 0.72 * Math.min(1, t / 0.2) * outA; ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = outA;
  if (t > lockT) { const q = t - lockT; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(X, Y); ctx.rotate(q * 0.5); for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); const g = ctx.createLinearGradient(0, 0, 900, 0); g.addColorStop(0, cur.c + 'cc'); g.addColorStop(1, cur.c + '00'); ctx.globalAlpha = 0.35 * Math.min(1, q * 3) * outA; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(900, -80); ctx.lineTo(900, 80); ctx.fill(); } ctx.restore(); }
  const upIdx = r.ups ? [...Array(r.ups)].map((_, i) => 2.55 + i * 0.95).findIndex(a => t >= a && t < a + 0.45) : -1;
  const sh = upIdx >= 0 ? (1 - (t - (2.55 + upIdx * 0.95)) / 0.45) * 16 : t > lockT && t < lockT + 0.3 ? (1 - (t - lockT) / 0.3) * 20 : 0;
  const ant = t < lockT ? clamp((t - (lockT - 0.9)) / 0.9, 0, 1) : 0, punch = t >= lockT ? 1 + 0.16 * Math.exp(-(t - lockT) * 9) * Math.cos((t - lockT) * 30) : 1, upP = upIdx >= 0 ? 1 + 0.07 * (1 - (t - (2.55 + upIdx * 0.95)) / 0.45) : 1;
  if (ant > 0) { ctx.globalAlpha = 0.35 * ant * outA; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = outA; }
  const SC = inA * (0.85 + 0.15 * outA) * (1 + 0.08 * ant * ant) * punch * upP;
  ctx.translate(X + (Math.random() - 0.5) * (sh + ant * 5), Y + (Math.random() - 0.5) * (sh + ant * 5)); ctx.scale(SC, SC);
  const W = 820, H = 640;
  // cabinet
  const cg = ctx.createLinearGradient(0, -H / 2, 0, H / 2); cg.addColorStop(0, '#3a1224'); cg.addColorStop(0.5, '#1c0a14'); cg.addColorStop(1, '#2a0c18');
  ctx.shadowColor = t > lockT ? cur.c : '#ff3a6a'; ctx.shadowBlur = 60; rr(ctx, -W / 2, -H / 2, W, H, 36); ctx.fillStyle = cg; ctx.fill(); ctx.shadowBlur = 0;
  ctx.lineWidth = 14; const fg = ctx.createLinearGradient(-W / 2, -H / 2, W / 2, H / 2); fg.addColorStop(0, '#fff2b0'); fg.addColorStop(0.3, '#d9a53a'); fg.addColorStop(0.6, '#8a5a18'); fg.addColorStop(1, '#ffd970'); ctx.strokeStyle = fg; ctx.stroke();
  // chasing bulbs
  const per = 2 * (W + H) - 80, nb = 34, speed = vel > 0.5 ? 18 : t > lockT ? 10 : 4;
  for (let i = 0; i < nb; i++) {
    let d = (i / nb) * per, bx, by; const w2 = W / 2 - 22, h2 = H / 2 - 22;
    if (d < 2 * w2) { bx = -w2 + d; by = -h2; } else if ((d -= 2 * w2) < 2 * h2) { bx = w2; by = -h2 + d; } else if ((d -= 2 * h2) < 2 * w2) { bx = w2 - d; by = h2; } else { d -= 2 * w2; bx = -w2; by = h2 - d; }
    const on = (Math.floor(t * speed) + i) % 3 === 0;
    ctx.fillStyle = on ? '#fff6c0' : '#5a3a18'; ctx.beginPath(); ctx.arc(bx, by, 7, 0, Math.PI * 2); ctx.fill();
    if (on) M.glow(ctx, bx, by, 26, t > lockT ? cur.c : '#ffd060', 0.7);
  }
  // marquee
  rr(ctx, -300, -H / 2 + 34, 600, 84, 18); ctx.fillStyle = '#0c0508'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = '#d9a53a'; ctx.stroke();
  ctx.font = `56px ${CNF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#ffe08a'; ctx.shadowColor = '#ff9a3c'; ctx.shadowBlur = 20; ctx.fillText(r.title, 0, -H / 2 + 78); ctx.shadowBlur = 0;
  if (r.icon) { ctx.imageSmoothingEnabled = false; ctx.drawImage(r.icon, -290, -H / 2 + 44, 64, 64); }
  // window with cylinder
  const WX = -300, WY = -150, WW = 600, WH = 330;
  ctx.save(); rr(ctx, WX, WY, WW, WH, 20); ctx.clip();
  const bgw = ctx.createLinearGradient(0, WY, 0, WY + WH); bgw.addColorStop(0, '#050307'); bgw.addColorStop(0.5, '#1a1420'); bgw.addColorStop(1, '#050307'); ctx.fillStyle = bgw; ctx.fillRect(WX, WY, WW, WH);
  const base = Math.floor(p), cy = WY + WH / 2, R = 190;
  for (let o = -3; o <= 3; o++) {
    const idx = base + o, tile = r.tiles[((idx % N) + N) % N], off = idx - p, ang = off * 0.62;
    if (Math.abs(ang) > 1.5) continue;
    const y = cy + Math.sin(ang) * R, sy = Math.cos(ang), br = Math.pow(Math.cos(ang), 2);
    const blurN = vel > 3 ? 3 : 1;
    for (let b = 0; b < blurN; b++) {
      ctx.save(); ctx.globalAlpha = (blurN > 1 ? 0.4 : 1) * br; ctx.translate(0, y + (b - 1) * (blurN > 1 ? vel * 1.6 : 0)); ctx.scale(1, sy);
      if (Math.abs(off) < 0.5 && t > 1.2) { ctx.shadowColor = tile.c; ctx.shadowBlur = 30; }
      ctx.font = `92px ${CNF}`; ctx.fillStyle = tile.c; ctx.fillText(tile.n, 0, -18);
      ctx.shadowBlur = 0; if (tile.sub) { ctx.font = `30px ${CNF}`; ctx.fillStyle = '#e8dcc4'; ctx.fillText(tile.sub, 0, 50); }
      ctx.restore();
    }
  }
  const sg = ctx.createLinearGradient(0, WY, 0, WY + WH); sg.addColorStop(0, 'rgba(0,0,0,0.95)'); sg.addColorStop(0.3, 'rgba(0,0,0,0)'); sg.addColorStop(0.7, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,0.95)'); ctx.fillStyle = sg; ctx.fillRect(WX, WY, WW, WH);
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.08; ctx.fillStyle = '#fff'; ctx.fillRect(WX, WY + 20, WW, 40);
  if (t >= lockT && t < lockT + 0.45) { const q = (t - lockT) / 0.45; ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = (1 - q); ctx.fillStyle = '#ffffff'; ctx.fillRect(WX, WY, WW, WH); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  if (upIdx >= 0) { const q = (t - (2.55 + upIdx * 0.95)) / 0.45; ctx.globalAlpha = (1 - q) * 0.7; ctx.fillStyle = cur.c; ctx.fillRect(WX, WY, WW, WH); for (let k = 0; k < 3; k++) bolt(ctx, WX + Math.random() * WW, WY, WX + Math.random() * WW, WY + WH, cur.c, 6, Math.floor(t * 30) + k * 7); }
  ctx.restore();
  // payline
  ctx.lineWidth = 5; ctx.strokeStyle = t > 1.2 ? cur.c : '#6b5a70'; ctx.globalAlpha = outA * (0.6 + 0.4 * Math.sin(t * 12)); rr(ctx, WX - 8, cy - 85, WW + 16, 170, 14); ctx.stroke(); ctx.globalAlpha = outA;
  ctx.fillStyle = t > 1.2 ? cur.c : '#d9a53a'; [[-1, WX - 14], [1, WX + WW + 14]].forEach(([s, x]) => { ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x - s * 30, cy - 24); ctx.lineTo(x - s * 30, cy + 24); ctx.fill(); });
  rr(ctx, WX, WY, WW, WH, 20); ctx.lineWidth = 8; ctx.strokeStyle = '#8a5a18'; ctx.stroke();
  // lever
  const lp = t < 0.45 ? Math.sin(t / 0.45 * Math.PI) : 0, la = -0.9 + lp * 1.8;
  ctx.save(); ctx.translate(W / 2 + 24, -20); ctx.fillStyle = '#2a1a10'; ctx.fillRect(-10, -30, 34, 60); ctx.rotate(la * 0.6); ctx.fillStyle = '#b8b0a0'; ctx.fillRect(0, -200, 12, 200); ctx.fillStyle = '#e03a4a'; ctx.beginPath(); ctx.arc(6, -206, 26, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ff9aa0'; ctx.beginPath(); ctx.arc(-2, -214, 8, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  // message
  let msg = '', mc = '#8d8496';
  if (t < 0.5) msg = '拉杆！'; else if (t < 1.9) msg = '滚动中……';
  else if (upIdx >= 0) { msg = '升品！'; mc = cur.c; }
  else if (r.tease && t >= lockT - 0.75 && t < lockT) { msg = '还能再升……？'; mc = '#e8dcc4'; }
  else if (t >= lockT) { msg = r.itemMode ? '锁定 · ' + cur.n : cur.n; mc = cur.c; }
  else { msg = cur.n + '……'; mc = cur.c; }
  const ms = t >= lockT ? 1 + 0.5 * (1 - eo((t - lockT) / 0.3)) : upIdx >= 0 ? 1.2 : 1;
  ctx.save(); ctx.translate(0, H / 2 - 80); ctx.scale(ms, ms); ctx.font = `62px ${CNF}`; ctx.lineWidth = 10; ctx.strokeStyle = '#0c0508'; ctx.strokeText(msg, 0, 0); ctx.fillStyle = mc; ctx.shadowColor = mc; ctx.shadowBlur = t >= lockT ? 30 : 0; ctx.fillText(msg, 0, 0); ctx.restore();
  ctx.restore();
};

// ───────── treasure chest opening ─────────
M.drawChest = function (ctx, st) {
  const t = st.t, X = 960, Y = 600, col = st.col || '#ffcc33';
  ctx.save();
  ctx.globalAlpha = Math.min(1, t / 0.25) * 0.82; ctx.fillStyle = '#05030a'; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = 1;
  const drop = t < 0.5 ? -700 * (1 - eo(t / 0.5)) : 0, land = t >= 0.5 && t < 0.7 ? Math.sin((t - 0.5) / 0.2 * Math.PI) * 30 : 0;
  const open = t >= 1.5, q = t - 1.5;
  if (t > 0.9) { const k = open ? 1 : (t - 0.9) / 0.6; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(X, Y - 60); ctx.rotate(t * 0.35); const n = 18; for (let i = 0; i < n; i++) { ctx.rotate(Math.PI * 2 / n); const g = ctx.createLinearGradient(0, 0, 1100, 0); g.addColorStop(0, col + 'ff'); g.addColorStop(1, col + '00'); ctx.globalAlpha = (open ? 0.5 : 0.15 * k) * (i % 2 ? 1 : 0.6); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(1100, -90); ctx.lineTo(1100, 90); ctx.fill(); } ctx.restore(); M.glow(ctx, X, Y - 60, open ? 420 : 200 * k, col, open ? 0.8 : 0.5 * k); }
  const shake = t > 0.8 && t < 1.5 ? (t - 0.8) / 0.7 * 14 : 0;
  ctx.save(); ctx.translate(X + (Math.random() - 0.5) * shake, Y + drop + land + (Math.random() - 0.5) * shake * 0.5);
  const sq = t >= 0.5 && t < 0.7 ? 1 - Math.sin((t - 0.5) / 0.2 * Math.PI) * 0.15 : open && q < 0.2 ? 1 - Math.sin(q / 0.2 * Math.PI) * 0.12 : 1;
  ctx.scale(1 / sq, sq);
  const s = 18, img = M.spriteCanvas('chest', s), w = img.width, h = img.height;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.beginPath(); ctx.ellipse(0, 6, w * 0.6, 26, 0, 0, Math.PI * 2); ctx.fill();
  const lidH = s * 3;
  ctx.drawImage(img, 0, lidH, w, h - lidH, -w / 2, -h + lidH, w, h - lidH);
  if (!open) { ctx.drawImage(img, 0, 0, w, lidH, -w / 2, -h, w, lidH); if (t > 0.9) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 40); ctx.fillStyle = col; ctx.fillRect(-w / 2, -h + lidH - 6, w, 8); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; } }
  else { const lq = eo(q / 0.5); ctx.save(); ctx.translate(-w / 2 - lq * 160, -h - lq * 420); ctx.rotate(-lq * 2.4); ctx.drawImage(img, 0, 0, w, lidH, 0, 0, w, lidH); ctx.restore(); }
  ctx.restore();
  // items
  if (open) {
    const n = st.items.length, gap = Math.min(260, 1500 / Math.max(1, n));
    st.items.forEach((it, i) => {
      const d = q - 0.25 - i * 0.28; if (d < 0) return;
      const tx = X + (i - (n - 1) / 2) * gap, ty = 380, e = eback(d / 0.55), x = X + (tx - X) * e, y = (Y - 120) + (ty - (Y - 120)) * e - Math.sin(clamp(d / 0.55, 0, 1) * Math.PI) * 200;
      if (!it.popped) { it.popped = true; st.onPop && st.onPop(it, tx, ty); }
      it.x = tx; it.y = ty;
      M.glow(ctx, x, y, 140, it.c, 0.7);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(x, y); ctx.rotate(t * 1.4 + i); ctx.globalAlpha = 0.35; ctx.fillStyle = it.c; for (let k = 0; k < 6; k++) { ctx.rotate(Math.PI / 3); ctx.fillRect(0, -3, 110, 6); } ctx.restore();
      const bob = Math.sin(t * 3 + i) * 6, sc = Math.min(1, d / 0.3) * (1 + 0.25 * Math.max(0, 1 - d / 0.3));
      if (it.img) { const iw = it.img.width * sc, ih = it.img.height * sc; ctx.imageSmoothingEnabled = false; ctx.drawImage(it.img, x - iw / 2, y - ih / 2 + bob, iw, ih); }
      if (d > 0.4) { ctx.globalAlpha = Math.min(1, (d - 0.4) / 0.2); ctx.font = `38px ${CNF}`; ctx.textAlign = 'center'; ctx.lineWidth = 8; ctx.strokeStyle = '#0c0508'; ctx.strokeText(it.n, x, y + 110); ctx.fillStyle = it.c; ctx.fillText(it.n, x, y + 110); if (it.sub) { ctx.font = `26px ${CNF}`; ctx.strokeText(it.sub, x, y + 148); ctx.fillStyle = '#e8dcc4'; ctx.fillText(it.sub, x, y + 148); } ctx.globalAlpha = 1; }
    });
    if (q > 0.6 + n * 0.28) { ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 4); ctx.font = `40px ${CNF}`; ctx.textAlign = 'center'; ctx.fillStyle = '#e8dcc4'; ctx.fillText('点击任意处收下', X, 1000); ctx.globalAlpha = 1; }
  } else if (t > 0.7) { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 8); ctx.font = `44px ${CNF}`; ctx.textAlign = 'center'; ctx.fillStyle = col; ctx.fillText('……', X, Y + 110); ctx.globalAlpha = 1; }
  ctx.restore();
};

// ───────── big banners (victory / defeat / skill cut-in) ─────────
M.drawBanner = function (ctx, b) {
  const t = b.t, X = 960, Y = b.y || 470;
  ctx.save();
  if (b.kind === 'skill') {
    const inq = eo(t / 0.25), out = clamp((b.life - t) / 0.25, 0, 1), a = Math.min(inq, out);
    ctx.globalAlpha = a * 0.55; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 1920, 1080);
    ctx.globalAlpha = a; ctx.save(); ctx.translate(0, Y); ctx.transform(1, -0.08, 0, 1, 0, 0);
    const bx = -1920 * (1 - inq) + (1920 * 0.2) * (t / b.life);
    const g = ctx.createLinearGradient(0, -130, 0, 130); g.addColorStop(0, b.col + '00'); g.addColorStop(0.2, b.col + 'dd'); g.addColorStop(0.8, b.col + 'dd'); g.addColorStop(1, b.col + '00'); ctx.fillStyle = g; ctx.fillRect(bx - 200, -130, 2400, 260);
    ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { ctx.globalAlpha = a * 0.4; ctx.fillStyle = '#fff'; const ly = -120 + ((i * 37) % 240), lx = ((t * 3200 + i * 400) % 2600) - 300; ctx.fillRect(lx, ly, 200 + (i % 3) * 120, 3); }
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a;
    if (b.img) { ctx.imageSmoothingEnabled = false; const s = 1.0 + 0.08 * (t / b.life); const iw = b.img.width * s, ih = b.img.height * s; ctx.drawImage(b.img, 300 + bx * 0.3, 110 - ih, iw, ih); }
    ctx.font = `140px ${CNF}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.lineWidth = 16; ctx.strokeStyle = '#0c0508'; const tx = 760 - (1 - inq) * 600 + 60 * (t / b.life); ctx.strokeText(b.text, tx, -10); ctx.fillStyle = '#fff'; ctx.shadowColor = b.col; ctx.shadowBlur = 40; ctx.fillText(b.text, tx, -10); ctx.shadowBlur = 0;
    if (b.sub) { ctx.font = `40px ${CNF}`; ctx.lineWidth = 8; ctx.strokeText(b.sub, tx + 10, 90); ctx.fillStyle = '#ffe8b0'; ctx.fillText(b.sub, tx + 10, 90); }
    ctx.restore();
  } else {
    const s = t < 0.22 ? 3.2 - 2.2 * eo(t / 0.22) : 1 + 0.06 * Math.sin((t - 0.22) * 3) * Math.max(0, 1 - (t - 0.22) / 1.5);
    const a = Math.min(1, t / 0.12) * clamp((b.life - t) / 0.3, 0, 1);
    ctx.globalAlpha = a; ctx.translate(X, Y); ctx.scale(s, s);
    ctx.font = `230px ${CNF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 26; ctx.strokeStyle = '#140810'; ctx.strokeText(b.text, 0, 0);
    const g = ctx.createLinearGradient(0, -110, 0, 110); g.addColorStop(0, '#ffffff'); g.addColorStop(0.45, b.col); g.addColorStop(1, b.col2 || '#8a4a10');
    ctx.fillStyle = g; ctx.shadowColor = b.col; ctx.shadowBlur = 60; ctx.fillText(b.text, 0, 0); ctx.shadowBlur = 0;
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.6 * Math.max(0, 1 - t * 2); ctx.fillStyle = '#fff'; ctx.fillText(b.text, 0, 0);
    if (b.sub) { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * clamp((t - 0.3) / 0.3, 0, 1); ctx.font = `52px ${CNF}`; ctx.lineWidth = 10; ctx.strokeText(b.sub, 0, 150); ctx.fillStyle = '#f5ead4'; ctx.fillText(b.sub, 0, 150); }
  }
  ctx.restore();
};
})();

;
