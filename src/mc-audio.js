// ==== mc-audio.js ====
// 午夜机台 · 音效库：M.Sfx 的实现。全部实时合成，没有音频文件（docs/design.md §10.1）。
/* 午夜机台 · 音效库（核心）
   全部实时合成，没有音频文件。音高落在 F 大调五声音阶上（明天和混沌来袭时换成 D 小调），
   这样音效和基地配乐同调，叠在一起不打架。 */
(function (root) {
'use strict';
// 在游戏里直接挂到 M.Sfx 上：其他模块早就拿着 M.Sfx 的引用，旧的调用会自动用上新声音
const S = root.SFX = (root.MC && root.MC.Sfx) || root.SFX || {};
let ac = null, OUT, MIX, SFXB, MUSB, CRUSH, REV, DLY, NOISE, BROWN, CRK, DIP, W12, W25, W50;
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = a => a[Math.random() * a.length | 0];
S.muted = !!S.muted; S.volume = S.volume == null ? .8 : S.volume; S.mood = 'calm';
const KEYS = {
  calm: { root: 65, pent: [0, 2, 4, 7, 9], scale: [0, 2, 4, 5, 7, 9, 11] },
  dark: { root: 62, pent: [0, 3, 5, 7, 10], scale: [0, 2, 3, 5, 7, 8, 10] },
};
// 五声音阶第 i 级（可以是负数或超过一个八度），返回 MIDI 音高
function deg(i, oct) { const k = KEYS[S.mood] || KEYS.calm, n = k.pent.length, o = Math.floor(i / n); return k.root + 12 * ((oct || 0) + o) + k.pent[((i % n) + n) % n]; }
function sdeg(i, oct) { const k = KEYS[S.mood] || KEYS.calm, n = k.scale.length, o = Math.floor(i / n); return k.root + 12 * ((oct || 0) + o) + k.scale[((i % n) + n) % n]; }
const hz = (i, oct) => mtof(deg(i, oct));

// ───────── 音频图 ─────────
function impulse(sec, bright) {
  const sr = ac.sampleRate, n = Math.floor(sr * sec), b = ac.createBuffer(2, n, sr), pre = Math.floor(sr * .012);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = pre; i < n; i++) { const x = (i - pre) / (n - pre), k = bright - .7 * x; lp += Math.max(.05, k) * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.pow(1 - x, 2) * Math.exp(-x * 3); }
    [.006, .011, .017, .024, .031].forEach((e, j) => { const i = pre + Math.floor(sr * e * (c ? 1.13 : 1)); if (i < n) d[i] += (j % 2 ? -.45 : .55) / (1 + j * .5); });
  }
  return b;
}
function pulseWave(d) { const N = 48, re = new Float32Array(N), im = new Float32Array(N); for (let n = 1; n < N; n++) re[n] = 2 * Math.sin(Math.PI * n * d) / (Math.PI * n); return ac.createPeriodicWave(re, im); }
function biquad(type, f, q) { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; if (q != null) b.Q.value = q; return b; }
function panner(p) { const s = ac.createStereoPanner(); s.pan.value = Math.max(-1, Math.min(1, p)); return s; }

// ───────── 调音台 ─────────
// 8 条通道，各有推子和 EQ：演出最响；战斗往后退一点、压掉一点高频；界面切掉低频只留清脆的一层；
// 配乐在 2~4 kHz 挖一个坑，给音效的清晰度让位置。混响、回声跟着通道的推子走。
const dB = v => Math.pow(10, v / 20);
const CHDEF = {
  show:   { g: 0,   n: '演出' },
  skill:  { g: -2,  n: '技能' },
  mini:   { g: -3,  n: '小游戏' },
  world:  { g: -4,  n: '世界' },
  combat: { g: -5,  n: '战斗', hi: -3, lo: 1.5 },
  ui:     { g: -7,  n: '界面', hp: 250 },
  amb:    { g: -10, n: '环境' },
  music:  { g: -3,  n: '配乐', pf: 3000, pg: -3.5, hi: -1.5 },
};
const CH = {};
let CURCH = null;
S.channels = () => Object.keys(CHDEF).map(k => ({ k, n: CHDEF[k].n, g: CH[k] ? CH[k].g : CHDEF[k].g }));
S.setChannel = function (k, db) { const c = CH[k]; if (!c) { if (CHDEF[k]) CHDEF[k].g = db; return; } c.g = db; const v = dB(db), t = ac.currentTime; [c.fad, c.rv, c.dy].forEach(n => n.gain.setTargetAtTime(v, t, .03)); };
S.init = function () {
  if (ac) { if (ac.state !== 'running') ac.resume(); return true; }
  const AC = root.AudioContext || root.webkitAudioContext;
  if (!AC) return false;
  try { ac = new AC({ latencyHint: 'interactive' }); } catch (e) { ac = new AC(); }
  const sr = ac.sampleRate;
  NOISE = ac.createBuffer(1, sr * 2, sr); { const d = NOISE.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  BROWN = ac.createBuffer(1, sr * 4, sr); { const d = BROWN.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { b = (b + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.2; } }
  // 火堆 / 纸张 / 电流共用的「噼啪」素材：稀疏的小脉冲，每个衰减长短不一
  CRK = ac.createBuffer(1, sr * 3, sr); { const d = CRK.getChannelData(0); for (let i = 0; i < d.length; i++) if (Math.random() < 60 / sr) { const a = (.3 + .7 * Math.random()) * (Math.random() < .5 ? -1 : 1), n = 20 + Math.random() * 260 | 0; for (let k = 0; k < n && i + k < d.length; k++) d[i + k] += a * Math.exp(-k / (n / 5)) * (Math.random() * 2 - 1); } }
  DIP = ac.createBuffer(1, Math.floor(sr * .8), sr); { const d = DIP.getChannelData(0); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = -(t < .02 ? t / .02 : Math.exp(-(t - .02) / .18)); } }
  W12 = pulseWave(.125); W25 = pulseWave(.25); W50 = pulseWave(.5);

  OUT = ac.createGain(); OUT.gain.value = S.muted ? 0 : S.volume;
  const glue = ac.createDynamicsCompressor(); glue.threshold.value = -18; glue.knee.value = 10; glue.ratio.value = 2.5; glue.attack.value = .006; glue.release.value = .18;
  const lim = ac.createDynamicsCompressor(); lim.threshold.value = -2.5; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = .002; lim.release.value = .1;
  MIX = ac.createGain(); MIX.connect(glue); glue.connect(lim); lim.connect(OUT); OUT.connect(ac.destination);
  S.analyser = ac.createAnalyser(); S.analyser.fftSize = 2048; OUT.connect(S.analyser);
  SFXB = ac.createGain(); SFXB.connect(MIX);
  MUSB = ac.createGain(); MUSB.connect(MIX);
  // 机台味：把一部分声音压到约 5 bit 再轻轻滤掉毛刺
  // 先放大 12 倍再量化（音效本身很轻，直接量化会被变成 0），量化完再缩回去
  CRUSH = ac.createGain(); CRUSH.gain.value = 12;
  const q = ac.createWaveShaper(); { const n = 4096, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.round(x * 16) / 16; } q.curve = c; }
  const back = ac.createGain(); back.gain.value = 1 / 12;
  const cl = biquad('lowpass', 7500); CRUSH.connect(q); q.connect(back); back.connect(cl); cl.connect(SFXB);
  REV = ac.createConvolver(); REV.buffer = impulse(1.6, .8);   // 干脆利落：混响短一些
  const rhp = biquad('highpass', 160), rg = ac.createGain(); rg.gain.value = .8; REV.connect(rhp); rhp.connect(rg); rg.connect(MIX);
  DLY = ac.createGain();
  const dl = ac.createDelay(1), dr = ac.createDelay(1), fb = ac.createGain(), dlp = biquad('lowpass', 3000), pl = panner(-.6), pr = panner(.6), dOut = ac.createGain();
  dl.delayTime.value = .18; dr.delayTime.value = .27; fb.gain.value = .3; dOut.gain.value = .5;
  DLY.connect(dl); dl.connect(pl); pl.connect(dOut); dl.connect(dr); dr.connect(pr); pr.connect(dOut); dr.connect(dlp); dlp.connect(fb); fb.connect(dl); dOut.connect(MIX);
  Object.keys(CHDEF).forEach(k => {
    const d = CHDEF[k], inp = ac.createGain(), hp = biquad('highpass', d.hp || 20, .7), ls = biquad('lowshelf', 220), pk = biquad('peaking', d.pf || 2800, 1), hs = biquad('highshelf', 6500), fad = ac.createGain();
    ls.gain.value = d.lo || 0; pk.gain.value = d.pg || 0; hs.gain.value = d.hi || 0; fad.gain.value = dB(d.g);
    inp.connect(hp); hp.connect(ls); ls.connect(pk); pk.connect(hs); hs.connect(fad); fad.connect(k === 'music' ? MIX : SFXB);
    const rv = ac.createGain(), dy = ac.createGain(); rv.gain.value = dy.gain.value = dB(d.g); rv.connect(REV); dy.connect(DLY);
    const cr = ac.createGain(); cr.gain.value = 12; const qs = ac.createWaveShaper(); qs.curve = q.curve; const bk = ac.createGain(); bk.gain.value = 1 / 12; const lp = biquad('lowpass', 7500); cr.connect(qs); qs.connect(bk); bk.connect(lp); lp.connect(inp);
    CH[k] = { in: inp, crush: cr, rv, dy, fad, g: d.g };
  });
  // 配乐总线也走一条通道；MUSB 本身留给「大时刻压低音乐」
  MUSB.disconnect(); MUSB.connect(CH.music.in);
  return true;
};
S.ready = () => !!ac;
S.ctx = () => ac;
S.now = () => ac ? ac.currentTime : 0;
S.setMuted = function (m) { S.muted = m; if (OUT) OUT.gain.setTargetAtTime(m ? 0 : S.volume, ac.currentTime, .02); };
S.setVolume = function (v) { S.volume = v; if (OUT && !S.muted) OUT.gain.setTargetAtTime(v, ac.currentTime, .03); };
S.setMood = function (m) { S.mood = KEYS[m] ? m : 'calm'; };
S._last = {};
S.lim = function (k, gap) { const n = performance.now(); if (S._last[k] && n - S._last[k] < gap) return false; S._last[k] = n; return true; };
S.musicBus = () => MUSB;
// 大时刻把音乐压低一下（胜利、升级、招募揭晓……）；len 秒后回来
const DIPS = {};
function dipBuf(len) {
  const k = Math.round(len * 10) / 10; if (DIPS[k]) return DIPS[k];
  const sr = ac.sampleRate, n = Math.floor(sr * (k + .6)), b = ac.createBuffer(1, n, sr), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) { const t = i / sr; d[i] = -(t < .05 ? t / .05 : t < k ? 1 : Math.exp(-(t - k) / .15)); }
  return (DIPS[k] = b);
}
function duck(t, depth, len) { if (!ac) return; const s = ac.createBufferSource(), g = ac.createGain(); s.buffer = len ? dipBuf(len) : DIP; g.gain.value = depth; s.connect(g); g.connect(MUSB.gain); s.start(t); }
S.duck = (d, len) => duck(ac.currentTime, d || .5, len);

// 同时发声数量上限：低优先级的（悬浮、tick、命中）在拥挤时让路
const ends = [];
function room(prio) { if (!ac) return false; const now = ac.currentTime; while (ends.length && ends[0] < now) ends.shift(); return prio >= 2 || ends.length < (prio ? 160 : 90); }   // 按发声的原件数算：一次大奖就有几十个
function claim(end) { let i = ends.length; while (i > 0 && ends[i - 1] > end) i--; ends.splice(i, 0, end); }

// ───────── 发声原件 ─────────
// 导演给这次调用算出来的音量（越密越轻、演出进行时压低），所有发声原件都乘上它
let CURG = 1;
function out(node, o, t, end) {
  let last = node;
  if (CURG !== 1) { const g = ac.createGain(); g.gain.value = CURG; last.connect(g); last = g; }
  if (o.pan != null && o.pan !== 0) { const p = panner(o.pan); last.connect(p); last = p; }
  if (o.panTo != null) { const p = panner(o.pan || 0); p.pan.setValueAtTime(o.pan || 0, t); p.pan.linearRampToValueAtTime(o.panTo, end); last.connect(p); last = p; }
  const ch = CURCH;
  last.connect(o.dest || (o.crush ? (ch ? ch.crush : CRUSH) : (ch ? ch.in : SFXB)));
  if (o.rev) { const s = ac.createGain(); s.gain.value = o.rev * .6; last.connect(s); s.connect(ch ? ch.rv : REV); }
  if (o.dly) { const s = ac.createGain(); s.gain.value = o.dly; last.connect(s); s.connect(ch ? ch.dy : DLY); }
  claim(end);
}
function env(g, t, a, pk, dur, hold) {
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + a);
  if (hold) g.gain.setValueAtTime(pk, t + a + hold);
  g.gain.exponentialRampToValueAtTime(.0001, t + Math.max(dur, a + (hold || 0) + .005));
}
function filt(src, o, t, dur) {
  let n = src;
  if (o.hp) { const f = biquad('highpass', o.hp, o.hq || .7); n.connect(f); n = f; }
  if (o.bp) { const f = biquad('bandpass', o.bp, o.q || 1); if (o.bpTo) f.frequency.exponentialRampToValueAtTime(o.bpTo, t + (o.fSlide || dur)); n.connect(f); n = f; }
  if (o.lp) { const f = biquad('lowpass', o.lp, o.lq || .7); if (o.lpTo) f.frequency.exponentialRampToValueAtTime(o.lpTo, t + (o.fSlide || dur)); n.connect(f); n = f; }
  return n;
}
// oscillator一个音：type 可以是 sine / triangle / square / sawtooth / p12 / p25 / p50
function tone(t, type, f, dur, pk, o) {
  o = o || {};
  const os = ac.createOscillator();
  if (type[0] === 'p') os.setPeriodicWave(type === 'p12' ? W12 : type === 'p25' ? W25 : W50); else os.type = type;
  os.frequency.setValueAtTime(f, t);
  if (o.to) { if (o.lin) os.frequency.linearRampToValueAtTime(o.to, t + (o.slide || dur)); else os.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || dur)); }
  if (o.detune) os.detune.value = o.detune;
  let vib = null;
  if (o.vib) { vib = ac.createOscillator(); const vg = ac.createGain(); vib.frequency.value = o.vib[0]; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(o.vib[1], t + (o.vib[2] || .05)); vib.connect(vg); vg.connect(os.detune); vib.start(t); vib.stop(t + dur + .05); }
  const g = ac.createGain(); env(g, t, o.a || .002, pk, dur, o.hold);
  filt(os, o, t, dur).connect(g);
  os.start(t); os.stop(t + dur + .05);
  out(g, o, t, t + dur);
  return t + dur;
}
// noise一段：type 是滤波器种类，src 可以换成 BROWN / CRK
function nz(t, dur, type, f, q, pk, o) {
  o = o || {};
  const s = ac.createBufferSource(); s.buffer = o.src === 'brown' ? BROWN : o.src === 'crk' ? CRK : NOISE; s.loop = true;
  if (o.rate) s.playbackRate.value = o.rate;
  const fl = biquad(type, f, q); if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + (o.fSlide || dur));
  const g = ac.createGain(); env(g, t, o.a || .001, pk, dur, o.hold);
  s.connect(fl); let n = fl; if (o.lp) { const l = biquad('lowpass', o.lp); n.connect(l); n = l; } n.connect(g);
  s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
  out(g, o, t, t + dur);
  return t + dur;
}
// FM：铃、玻璃、电钢琴、金属片都靠它；r 是调制比，i 是调制深度（乘以频率）
function fm(t, f, dur, pk, o) {
  o = o || {};
  const c = ac.createOscillator(), m = ac.createOscillator(), mg = ac.createGain(), g = ac.createGain();
  c.frequency.value = f; m.frequency.value = f * (o.r || 3.5);
  if (o.to) { c.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || dur)); m.frequency.exponentialRampToValueAtTime(o.to * (o.r || 3.5), t + (o.slide || dur)); }
  const I = f * (o.i == null ? 1.2 : o.i);
  mg.gain.setValueAtTime(I, t); mg.gain.setTargetAtTime(I * (o.iEnd || .04), t, o.itau || .2);
  m.connect(mg); mg.connect(c.frequency);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + (o.a || .003)); g.gain.setTargetAtTime(.0001, t + (o.a || .003) + (o.hold || 0), o.tau || dur / 4);
  filt(c, o, t, dur).connect(g);
  c.start(t); m.start(t); c.stop(t + dur + .05); m.stop(t + dur + .05);
  out(g, o, t, t + dur);
  return t + dur;
}
// 金属 / 钟：inharmonic partials（1 · 2.76 · 5.40 · 8.93），高次 partial衰减更快
function ring(t, f, dur, pk, o) {
  o = o || {};
  const parts = o.parts || [[1, 1], [2.76, .5], [5.4, .3], [8.93, .18]];
  const sum = ac.createGain();
  parts.forEach(([r, a], i) => {
    const os = ac.createOscillator(), g = ac.createGain(); os.frequency.value = f * r * (1 + rnd(-.002, .002));
    const d = dur / (1 + i * .8);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk * a, t + .002); g.gain.exponentialRampToValueAtTime(.0001, t + d);
    os.connect(g); g.connect(sum); os.start(t); os.stop(t + d + .05);
  });
  out(filt(sum, o, t, dur), o, t, t + dur);
  return t + dur;
}
// 低频重击：正弦从 f0 滑到 f1
function thud(t, f0, f1, dur, pk, o) { return tone(t, 'sine', f0, dur, pk, Object.assign({ to: f1, slide: Math.min(dur, .12) }, o)); }
// whoosh：带通 noise 扫频，音量先涨后落
function whoosh(t, dur, f0, f1, pk, o) {
  o = o || {};
  const s = ac.createBufferSource(); s.buffer = NOISE; s.loop = true;
  const f = biquad('bandpass', f0, o.q || 1.2); f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain(), peak = t + dur * (o.peak || .55);
  g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, peak); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  s.connect(f); f.connect(g); s.start(t, Math.random()); s.stop(t + dur + .05);
  out(g, o, t, t + dur);
  return t + dur;
}
// 反向涨起来的一段（落拍前的吸气）
function riser(t0, t1, f0, f1, pk, o) {
  o = o || {};
  const s = ac.createBufferSource(); s.buffer = NOISE; s.loop = true;
  const f = biquad('bandpass', f0, o.q || 1.3); f.frequency.setValueAtTime(f0, t0); f.frequency.exponentialRampToValueAtTime(f1, t1);
  const g = ac.createGain(); g.gain.setValueAtTime(.0001, t0); g.gain.exponentialRampToValueAtTime(pk, t1 - .01); g.gain.linearRampToValueAtTime(0, t1 + .02);
  s.connect(f); f.connect(g); s.start(t0); s.stop(t1 + .05);
  out(g, o, t0, t1);
  return t1;
}
// 噼啪声（火、纸、电）
function crackle(t, dur, f, pk, o) { return nz(t, dur, 'highpass', f || 1500, .7, pk, Object.assign({ src: 'crk', a: o && o.a || .02, hold: dur * .5 }, o)); }
// 水泡 / 滴水：正弦快速上滑
function blip(t, f, pk, o) { return tone(t, 'sine', f * .7, .12, pk, Object.assign({ to: f * 1.35, slide: .05 }, o)); }
// 钟琴 / 八音盒
function bell(t, m, dur, pk, o) { return fm(t, mtof(m), dur, pk, Object.assign({ r: 3.5, i: 1.1, itau: .2, tau: .45 + dur * .2, rev: .35 }, o)); }
// 电钢琴一个音
function ep(t, m, dur, pk, o) { return fm(t, mtof(m), dur, pk, Object.assign({ r: 1, i: 1.4, itau: .3, iEnd: .15, tau: .6 }, o)); }
// sawtooth和弦长音
function padc(t, ms, dur, pk, o) {
  o = o || {};
  const f = biquad('lowpass', o.lp || 1800, .6), g = ac.createGain();
  f.frequency.setValueAtTime((o.lp || 1800) * .4, t); f.frequency.linearRampToValueAtTime(o.lp || 1800, t + Math.min(.8, dur * .4));
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + (o.a || .25)); g.gain.setValueAtTime(pk, t + dur * .6); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  ms.forEach((m, i) => [-1, 1].forEach(sd => { const os = ac.createOscillator(); os.type = o.type || 'sawtooth'; os.frequency.value = mtof(m); os.detune.value = sd * (6 + i); const p = panner(sd * .4); os.connect(p); p.connect(f); os.start(t); os.stop(t + dur + .05); }));
  f.connect(g); out(g, o, t, t + dur);
  return t + dur;
}
// rip：noise被快速随机开关
function rip(t, dur, pk, o) {
  o = o || {};
  const s = ac.createBufferSource(); s.buffer = NOISE; s.loop = true;
  const f = biquad('bandpass', o.f || 2600, .8), g = ac.createGain();
  g.gain.setValueAtTime(0, t);
  let x = t; while (x < t + dur) { const v = pk * (.3 + .7 * Math.random()) * (1 - (x - t) / dur * .5); g.gain.setValueAtTime(v, x); x += rnd(.004, .018); g.gain.setValueAtTime(v * .15, x); x += rnd(.002, .01); }
  g.gain.setValueAtTime(0, t + dur);
  s.connect(f); f.connect(g); s.start(t, Math.random()); s.stop(t + dur + .05);
  out(g, o, t, t + dur);
  return t + dur;
}
// 低沉的持续轰鸣（地面、岩石）
function rumble(t, dur, pk, o) { return nz(t, dur, 'lowpass', (o && o.f) || 160, .8, pk, Object.assign({ src: 'brown', a: dur * .25, hold: dur * .3 }, o)); }
// 一串音（arpeggio）；fn 是一个音的发声写法
function arp(t, ms, gap, fn) { ms.forEach((m, i) => fn(t + i * gap, m, i)); return t + ms.length * gap; }
// 铜管：两根sawtooth，滤波器先张开再收一点，后半段加vibrato
function brass(t, m, dur, pk, o) {
  o = o || {};
  const f = mtof(m), br = o.bright || 3000, lp = biquad('lowpass', 400, 1.1), g = ac.createGain();
  lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(br, t + .05); lp.frequency.exponentialRampToValueAtTime(br * .5, t + .35);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + (o.a || .02)); g.gain.setValueAtTime(pk * .8, t + Math.max(.04, dur - .05)); g.gain.exponentialRampToValueAtTime(.0001, t + dur + (o.rel || .15));
  [-6, 6].forEach(d => { const os = ac.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; os.detune.value = d; if (dur > .3) { const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = 5.4; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(0, t + .18); vg.gain.linearRampToValueAtTime(11, t + .45); v.connect(vg); vg.connect(os.detune); v.start(t); v.stop(t + dur + .3); } os.connect(lp); os.start(t); os.stop(t + dur + .3); });
  lp.connect(g); out(g, Object.assign({ rev: .22 }, o), t, t + dur + .2);
  return t + dur;
}
// 合唱：sawtooth 过两个元音 formant
function choir(t, ms, dur, pk, o) {
  o = o || {};
  const sum = ac.createGain(), f1 = biquad('bandpass', o.dark ? 600 : 800, 4), f2 = biquad('bandpass', o.dark ? 1000 : 1200, 5), f3 = biquad('lowpass', 2800), g = ac.createGain();
  sum.connect(f1); sum.connect(f2); sum.connect(f3); const mixg = ac.createGain(); mixg.gain.value = 1; f1.connect(mixg); f2.connect(mixg); const f3g = ac.createGain(); f3g.gain.value = .25; f3.connect(f3g); f3g.connect(mixg);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + (o.a || .3)); g.gain.setValueAtTime(pk, t + dur * .65); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
  ms.forEach(m => [-8, 0, 8].forEach(d => { const os = ac.createOscillator(); os.type = 'sawtooth'; os.frequency.value = mtof(m); os.detune.value = d + rnd(-3, 3); const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = rnd(4.6, 5.6); vg.gain.value = 9; v.connect(vg); vg.connect(os.detune); os.connect(sum); os.start(t); v.start(t); os.stop(t + dur + .05); v.stop(t + dur + .05); }));
  sum.gain.value = .5 / ms.length; mixg.connect(g); out(g, Object.assign({ rev: .5 }, o), t, t + dur);
  return t + dur;
}
// 定音鼓
function timp(t, m, pk, o) { const f = mtof(m); tone(t, 'sine', f * 1.04, 1.3, pk, Object.assign({ to: f, slide: .08, rev: .3 }, o)); tone(t, 'triangle', f * 2.01, .5, pk * .25, o); return nz(t, .1, 'lowpass', 500, .7, pk * .45, o); }
// cymbal
function cymbal(t, dur, pk, o) {
  o = o || {};
  nz(t, dur, 'highpass', 5200, .5, pk, Object.assign({ rev: .45 }, o));
  return ring(t, 420, dur * .8, pk * .35, Object.assign({ parts: [[1, .6], [1.48, .5], [2.13, .45], [2.9, .4], [3.6, .35], [4.4, .3], [5.9, .2]], hp: 2500 }, o));
}
// 一把金币落下来
// 一把金币落下来：沿五声音阶往上走的一串，不是随机音高
function coins(t, n, pk, o) { o = o || {}; const g = o.gap || .045; for (let i = 0; i < n; i++) { const tt = t + i * g + rnd(0, g * .4), m = deg(10 + (i % 10)); ring(tt, mtof(m), .2, pk * (.75 + .25 * Math.min(1, i / 6)), { parts: [[1, 1], [2.01, .35], [3, .15]], pan: rnd(-.5, .5), rev: .2 }); } return t + n * g; }
// 一步脚步
function step(t, pk, o) { nz(t, .06, 'lowpass', 700, .7, pk, o); return thud(t, 110, 60, .08, pk * .6, o); }
// 一组可以中间切断的声音（快进时蓄力 / 垫底和弦要跟着提前收掉）
function grp() { const g = ac.createGain(); g.connect(SFXB); return g; }
function cut(g, t, tau) { if (!g) return; g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.setTargetAtTime(0, t, tau || .06); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 4000); }
// 音乐小节：给曲子时间轴用
S._p = { gainNow: () => CURG, setGain: v => { CURG = v; }, chNow: () => CURCH, setCh: c => { CURCH = typeof c === 'string' ? CH[c] || null : c; }, ac: () => ac, mtof, rnd, pick, deg, sdeg, hz, tone, nz, fm, ring, thud, whoosh, riser, crackle, blip, bell, ep, padc, rip, rumble, arp, duck, room, biquad, panner, brass, choir, timp, cymbal, coins, step, out, env, filt, grp, cut, W: () => ({ W12, W25, W50 }), get MUSB() { return MUSB; }, get SFXB() { return SFXB; }, get REV() { return REV; }, get DLY() { return DLY; }, get NOISE() { return NOISE; } };
})(typeof window !== 'undefined' ? window : globalThis);
/* 午夜机台 · 音效库（全部音效）
   每个音效的第一个参数都是开始时间，由 def() 填上当前时间。演出类音效（进战、胜利、升级……）
   一次把整段排好，时间点和对应动画里的常数一致，所以只在动画开始的那一刻调用一次。 */
(function (root) {
'use strict';
const S = root.SFX, P = S._p;
const { mtof, rnd, pick, deg, hz, tone, nz, fm, ring, thud, whoosh, riser, crackle, blip, bell, ep, padc, rip, rumble, arp, duck, brass, choir, timp, cymbal, coins, step, grp, cut } = P;
const A = () => P.ac();
const go = prio => A() && !S.muted && P.room(prio == null ? 1 : prio);
const V = c => 1 + rnd(-c, c);

// ═════════ 导演：所有声音先经过这里 ═════════
// 每个音效属于一个类别。同一帧（同一轮 JS）里的战斗声放在一起裁决：同一个目标只留最重要的一声，一帧最多两声；
// 近战挥击和命中同一帧时只放命中；普通单位的出手声最多 0.4 秒一次。同类声音在时间窗里越密越轻，超过上限就丢。
// 大演出进行时（进战、胜利、升级、招募……）战斗和入场声压低。高频声音轮换变体、不连续两次同一个音。
const CAT = {
  ui:    { max: 6, win: .25, dens: .15, stage: 1 },
  hit:   { max: 2, win: .3,  dens: .5,  stage: .3 },
  atk:   { max: 2, win: .4,  dens: .45, stage: .2 },
  skill: { max: 3, win: .3,  dens: .25, stage: .45 },
  world: { max: 5, win: .3,  dens: .2,  stage: .6 },
  show:  { max: 6, win: .2,  dens: 0,   stage: 1 },
  mini:  { max: 6, win: .25, dens: .15, stage: .8 },
  amb:   { max: 99, win: 1,  dens: 0,   stage: 1 },
};
const KIND = {};
const RANK = { killAt: 5, kill: 5, critAt: 4, crit: 4, allyDie: 4, die: 4, proj: 3, armorHit: 2, hitAt: 2, hit: 2, wallHit: 2, dodge: 1, tomb: 1, soul: 1 };
const PANARG = { proj: 1, atk: 1 };
// 这些演出一响，接下来这段时间就是「舞台」：战斗、入场这些声音压低让路
const STAGE = { battleIntro: 1.5, victory: 2, endScreen: 2.4, levelUp: 3.2, recruit: 3.4, leaderDown: 2.6, chaos: 2.4, tlEvent: 1.2, nfTitle: 1.6, raidWin: 2.4, portalCollapse: 3, cutin: 1.4, bossDrop: 1.2, launch: 1.4, fanfare: 1.2, win: 1, lose: 1.6, worldTheme: 2, steleHit: 1, chest: 1.2, settleTotal: 1 };
const STAGE_MINI = { win3: 1.8, win4: 3.4, fever: 1.4 };
const STAGE_GAME = { 'arena.ko': 1.4, 'statue.wake': 1.8 };
const STAGE_BEAT = { lv: { in: 3.2 }, rc: { in: 3.4 }, vic: { flash: 1.8 }, tear: { in: 2.4 } };
const DIR = S.dir = { stage: 0, recent: {}, vi: {}, last: {}, inside: 0, q: [], qOn: false, pq: [], pqOn: false, payRank: 0, payUntil: 0, lastAtk: 0, lastCombat: 0, stats: {}, introUntil: 0, lastSkill: 0, lastLeg: 0, soft: {} };
let VARI = 0;
// 变体：同一个名字连着响时轮换 0 / 1 / 2，不连续两次同一个
function nextVar(name) { const l = DIR.vi[name] == null ? -1 : DIR.vi[name]; let v = Math.random() * 3 | 0; if (v === l) v = (v + 1) % 3; DIR.vi[name] = v; return v; }
// 从一组音里挑一个，和上一次不一样
function nr(name, arr) { const l = DIR.last[name]; let v = pick(arr); if (arr.length > 1 && v === l) v = arr[(arr.indexOf(v) + 1) % arr.length]; DIR.last[name] = v; return v; }
function def(name, prio, fn, gap) {
  if (!KIND[name]) KIND[name] = prio >= 2 ? 'show' : 'world';
  S[name] = function (a, b, c, d) { request(name, fn, gap, [a, b, c, d]); };
}
function request(name, fn, gap, args) {
  if (DIR.inside) { run(name, fn, args, 1); return; }          // 演出内部的调用：跟着外层直接放
  if (DIR.off) { if (A() && !S.muted) run(name, fn, args, 1); return; }   // 试听页的「没导演」对比：什么都放
  if (!A() || S.muted) return;
  if (gap && !S.lim(name, gap)) return;
  if (BQ[name] && inBattle()) { DIR.q.push({ name, fn, args, cat: 'b' }); if (!DIR.qOn) { DIR.qOn = true; Promise.resolve().then(flush); } return; }
  const pr = payRank(name, args);
  if (pr) { DIR.pq.push({ name, fn, args, pr }); if (!DIR.pqOn) { DIR.pqOn = true; Promise.resolve().then(flushPay); } return; }
  const cat = KIND[name] || 'world';
  if (cat === 'hit' || cat === 'atk') { DIR.q.push({ name, fn, args, cat }); if (!DIR.qOn) { DIR.qOn = true; Promise.resolve().then(flush); } return; }
  play(name, fn, args, cat, 0);
}
function play(name, fn, args, cat, rank, force) {
  const C = CAT[cat] || CAT.world, now = A().currentTime, list = (DIR.recent[cat] = (DIR.recent[cat] || []).filter(x => x > now - C.win));
  const st = DIR.stats[name] || (DIR.stats[name] = [0, 0]); st[0]++;
  if (!force && list.length >= C.max && rank < 4) return;
  // force：战斗里每一声都放，密的时候只把音量压一点（最低压到四成）
  let g = force ? Math.max(.4, 1 / (1 + .05 * list.length)) * force : C.dens ? 1 / (1 + C.dens * list.length) : 1;
  const stageMe = STAGE[name] || (STAGE_BEAT[name] && STAGE_BEAT[name][args[0]]) || (name === 'mini' && STAGE_GAME[args[0] + '.' + args[1]]) || (name === 'mini' && args[0] === '_' && (STAGE_MINI[args[1]] || (args[1] === 'reach' && (args[2] | 0) >= 2 && 1.8)));
  if (now < DIR.stage && !stageMe && !STAGE_BEAT[name]) g *= C.stage;
  if (!force && g < .12 && rank < 4) return;
  if (!force && !P.room(cat === 'show' || rank >= 1.5 ? 2 : cat === 'ui' || cat === 'mini' || rank >= 1 ? 1 : 0)) return;   // 按钮声、小游戏的动作声、奖励声随时都要能响
  list.push(now); st[1]++;
  if (stageMe) DIR.stage = Math.max(DIR.stage, now + stageMe);
  run(name, fn, args, g, cat);
}
// 类别 → 调音台通道
const CHOF = { ui: 'ui', hit: 'combat', atk: 'combat', skill: 'skill', world: 'world', show: 'show', mini: 'mini', amb: 'amb' };
function run(name, fn, args, g, cat) {
  const g0 = P.gainNow(), v0 = VARI, c0 = P.chNow(); P.setGain(g0 * g); VARI = nextVar(name);
  if (!DIR.inside) P.setCh(CHOF[cat || KIND[name]] || 'world');                 // 演出内部的调用跟着外层的通道
  DIR.inside++;
  try { fn(A().currentTime + .006, args[0], args[1], args[2], args[3]); } catch (e) { if (S.debug) console.error(name, e); }
  DIR.inside--; P.setGain(g0); P.setCh(c0); VARI = v0;
}
// 奖励声：同一帧（以及紧接着 0.35 秒内）只放分量最大的那一个，小的让路；
// 重击、揭晓、金币算伴奏，只给更大的让路（重击遇到大赢以上才让）
const PAY = { fanfare: 3.5, win: 3, chest: 3, impact: 2, itemReveal: 2, reelUp: 1.5, up: 1, coin: 1, mult: 1 };
const PAY_MINI = { win4: 5, win3: 4, win2: 3, win1: 1.5 };   // 小游戏自己原来的「中了」（金格、三个七、抓到……）算 1.4：单独响照常，遇到新的四档就让路
const PAY_MINI_OLD = ['jackpot', 'gold', 'great', 'prize', 'treasure', 'box', 'wake', 'win', 'edge', 'gem', 'pass', 'good', 'found', 'ok', 'fruit', 'done', 'rest', 'sharpen'];
const YIELD = { impact: 4, itemReveal: 3.5, coin: 3 };
function payRank(name, a) { return name === 'mini' ? (PAY_MINI[a[1]] || (PAY_MINI_OLD.includes(a[1]) ? 1.4 : 0)) : (PAY[name] || 0); }
function flushPay() {
  DIR.pqOn = false; const q = DIR.pq; DIR.pq = []; if (!A() || !q.length) return;
  const now = A().currentTime; q.sort((x, y) => y.pr - x.pr); const top = q[0];
  const locked = now < DIR.payUntil ? DIR.payRank : 0;
  q.forEach((o, i) => {
    const yieldTo = YIELD[o.name] || o.pr + .01;                    // 默认：比它大的都能压住它
    if (i > 0 && top.pr >= yieldTo) return;                          // 同一帧里有更大的
    if (locked >= yieldTo && o.pr < locked) return;                  // 刚放过更大的
    if (o.pr >= top.pr) { DIR.payRank = o.pr; DIR.payUntil = now + .35; }
    play(o.name, o.fn, o.args, KIND[o.name] || 'world', o.pr >= 3 ? 4 : 0);
  });
}
// 同一帧的战斗声一起裁决
// 战斗里每一声都放（用户裁定 2026-09-25：打击、被击打每一声都要出来才够爽）；只有进战通告那 1.4 秒是安静的
const inBattle = () => { const g = root.__mcg; return !!g && (g.screen === 'battle' || g.screen === 'raid'); };
const BQ = { skillFx: 1, boom: 1, impact: 1, heal: 1, bolt: 1, up: 1, sparkle: 1, whoosh: 1, cast: 1, shoot: 1, hit: 1, crit: 1, kill: 1, land: 1, portal: 1, pop: 1, entry: 1, summonIn: 1, coin: 1, mult: 1 };
function flush() {
  DIR.qOn = false; const q = DIR.q; DIR.q = []; if (!A()) return;
  const now = A().currentTime;
  // 进战通告那 1.4 秒里只有通告：单位入场、开场的第一批技能和命中都不出声（用户裁定：进战按现在这样）
  if (now < DIR.introUntil) return;
  // 同一帧挤了很多声时，每一声都放，只是一起轻一点，不爆音
  const k = q.length > 4 ? Math.sqrt(4 / q.length) : 1;
  q.forEach(x => { const cat = x.cat === 'b' ? (KIND[x.name] || 'world') : x.cat; play(x.name, x.fn, x.args, cat, RANK[x.name] || 1, k); if (cat === 'hit') DIR.lastCombat = now; });
  // 技能放出：战斗配乐让一下，下一拍补一记太鼓
  const sk = q.find(x => x.name === 'skillFx' && x.args[0] === 'cast' && (x.args[3] | 0) >= 1); if (sk && BATM.on) BATM.hit(sk.args[3]);
}
S.cue = function (name, o) { const f = S[name]; if (typeof f !== 'function' || !S._names[name]) return false; f(o || {}); return true; };
S._names = {};
const reg = (sec, names) => names.forEach(n => { S._names[n] = sec; });
// 类别表（没列的：优先级 2 的算演出，其余算世界）
const kinds = (cat, names) => names.forEach(n => { KIND[n] = cat; });
kinds('ui', ['ui_tap', 'ui_back', 'ui_no', 'ui_good', 'ui_big', 'ui_rush', 'hover', 'click', 'optHover', 'panelOpen', 'panelClose', 'toast', 'guideCard', 'bookOpen', 'typeBlip', 'tick', 'numTick', 'coin', 'land', 'fly', 'bump', 'stamp', 'pop', 'toggle', 'charge', 'boing', 'settleTick', 'speed', 'pause', 'knock']);
kinds('hit', ['hit', 'hitAt', 'crit', 'critAt', 'kill', 'killAt', 'armorHit', 'proj', 'dodge', 'allyDie', 'die', 'tomb', 'soul', 'wallHit']);
kinds('atk', ['atk', 'shoot']);
kinds('skill', ['skillFx', 'skill', 'skillTitle', 'skillReady', 'charFx', 'cast', 'bolt', 'boom', 'itemUse', 'weapon', 'summonIn', 'entry', 'legionCard', 'scoreFly', 'mult', 'holdTick', 'waveHorn', 'heal', 'sparkle', 'up']);
kinds('mini', ['mini']);
kinds('amb', ['roomAmb', 'drone']);

// ═════════ 界面 ═════════
// 五档按下反馈（动效那边的 juice(tier) 会调用 cue('ui_*')）
const pw = o => Math.max(0, Math.min(1, o && o.power != null ? o.power : .5));
let lastUi = 0;
function keyDown(t, k) { lastUi = performance.now(); nz(t, .016, 'bandpass', 2400 * V(.08), 1.3, .09 * k); thud(t, 170, 85, .07, .13 * k); }
def('ui_tap', 0, (t, o) => keyDown(t, .7 + .3 * pw(o)), 25);   // 只有按键本身的一下；这次点击做了什么由动作自己的声音说
def('ui_back', 0, (t) => { keyDown(t, .7); tone(t + .02, 'p25', hz(6), .05, .022, { crush: 1, lp: 3500 }); }, 30);
def('ui_good', 1, (t, o) => { const p = pw(o), n = p > .6 ? 4 : 3; keyDown(t, 1); arp(t + .01, [4, 6, 9, 11].slice(0, n).map(i => deg(i)), .038, (tt, m, i) => { tone(tt, 'p25', mtof(m), .06, .035, { crush: 1, lp: 5000 }); if (i === n - 1) bell(tt, m + 12, .35, .07 + .03 * p, { rev: .2 }); }); }, 40);
def('ui_big', 2, (t, o) => { const p = pw(o); keyDown(t, 1.2); thud(t, 120, 45, .3, .28 + .12 * p); [53, 60, 65].forEach(m => brass(t + .01, m, .22, .05 + .02 * p, { bright: 3500 })); }, 60);
function sparkleAt(t, n, pk) { for (let i = 0; i < n; i++) tone(t + i * .045 + rnd(0, .02), 'sine', hz(pick([10, 11, 12, 13, 14, 15])), .3, pk, { pan: rnd(-.7, .7), rev: .5 }); }
def('ui_rush', 0, (t) => { whoosh(t, .25, 800, 5000, .07); arp(t, [deg(7), deg(9), deg(12)], .03, (tt, m) => tone(tt, 'p25', mtof(m), .04, .03, { crush: 1 })); }, 300);
def('hover', 0, (t) => tone(t, 'sine', hz(nr('hover', [7, 8, 9, 10])), .04, .01, { hp: 900 }), 150);
def('click', 0, (t) => { if (performance.now() - lastUi > 400) S.ui_tap(); });   // 按下时已经响过，同一次点击不再响
def('optHover', 0, (t) => { tone(t, 'triangle', hz(pick([5, 7, 9])), .07, .03, { lp: 3000 }); nz(t, .01, 'highpass', 5000, .7, .02); }, 50);
def('panelOpen', 0, (t) => { whoosh(t, .22, 500, 2600, .12, { pan: .5, panTo: 0 }); nz(t + .2, .03, 'bandpass', 1400, 1, .05); thud(t + .2, 140, 90, .06, .08); }, 80);
def('panelClose', 0, (t) => { if (performance.now() - lastUi > 400) whoosh(t, .18, 2400, 600, .07, { pan: 0, panTo: .5 }); }, 80);   // 按返回键关掉的：返回键已经响过
def('toast', 0, (t) => { bell(t, deg(7), .25, .05); bell(t + .07, deg(9), .35, .05); }, 120);
def('guideCard', 1, (t) => { [0, .05, .1].forEach(d => nz(t + d, .04, 'bandpass', 3500, 1.5, .04)); arp(t + .08, [deg(5), deg(7), deg(9)], .07, (tt, m) => bell(tt, m, .5, .07)); }, 200);
def('bookOpen', 1, (t) => { thud(t, 110, 70, .12, .12); whoosh(t, .25, 800, 3000, .05); [0, .06, .12].forEach(d => nz(t + .05 + d, .05, 'bandpass', 4000, 1.4, .03)); }, 200);
def('typeBlip', 0, (t) => tone(t, 'p25', mtof(nr('typeBlip', [67, 69, 72])), .025, .018, { crush: 1, lp: 3500 }), 45);
def('numTick', 0, (t, p) => tone(t, 'p25', hz(Math.round(p || 0) % 15, 1), .02, .022, { crush: 1, lp: 6000 }), 28);
// 金币：连着来的一个比一个高（五声音阶往上爬），停 0.7 秒再从低处开始；
// 一次给很多时按数量连成一串（数量越多串越长，最多 8 个音）。积分到手、卖出、招财猫接金币都走这里
const CH = { step: 0, last: 0 };
const coinN = n => n == null ? 1 : Math.max(1, Math.min(8, Math.round(Math.log2(Math.max(0, n) + 1) / 1.4)));
function coinRun(t, k, pk) {
  const now = performance.now(); if (now - CH.last > 700) CH.step = 0; CH.last = now;
  for (let i = 0; i < k; i++) {
    const st = Math.min(CH.step++, 13), m = deg(5 + st), tt = t + i * .05;
    tone(tt, 'p25', mtof(deg(4 + st)), .05, pk, { crush: 1, lp: 6000 });            // 前面一个短的装饰音
    tone(tt + .045, 'p25', mtof(m), .22, pk, { crush: 1, lp: 6000 });             // 主音
    tone(tt + .045, 'sine', mtof(m + 12), .25, pk * .35, { rev: .3 });            // 高八度的亮光
  }
}
def('coin', 1, (t, n) => coinRun(t, coinN(n), .065), 30);
def('land', 0, (t, i) => { const k = Math.round(i || 0); bell(t, deg(5 + k), .35, .08); thud(t, 130, 70, .07, .1); }, 20);
def('fly', 0, (t) => whoosh(t, .2, 700, 2600, .04, { pan: rnd(-.3, .3) }), 40);
def('bump', 0, (t) => tone(t, 'sine', 520 * V(.05), .07, .06, { to: 900, slide: .05 }), 30);
def('stamp', 1, (t) => { thud(t, 125, 58, .2, .36); nz(t, .09, 'lowpass', 1800, .7, .26); nz(t + .006, .03, 'highpass', 4000, .5, .05); }, 60);
def('pop', 0, (t) => { tone(t, 'sine', 600 * V(.08), .07, .1, { to: 1300, slide: .05 }); nz(t, .03, 'highpass', 3000, .7, .04); }, 25);
def('toggle', 0, (t, on) => { keyDown(t, .7); tone(t + .02, 'p25', hz(on ? 9 : 5), .05, .03, { crush: 1 }); });
reg('界面', ['ui_tap', 'ui_back', 'ui_no', 'ui_good', 'ui_big', 'ui_rush', 'hover', 'optHover', 'panelOpen', 'panelClose', 'toast', 'guideCard', 'bookOpen', 'typeBlip', 'tick', 'numTick', 'coin', 'land', 'fly', 'bump', 'stamp', 'pop', 'toggle']);

// ═════════ 通用（旧名字保留，声音重做）═════════
def('whoosh', 0, (t, d) => whoosh(t, d || .35, 450, 3200, .1, { pan: -.4, panTo: .4 }), 30);
def('sparkle', 0, (t) => sparkleAt(t, 5, .03), 60);
def('boom', 1, (t) => { thud(t, 85, 28, .6, .42); nz(t, .5, 'lowpass', 1500, .7, .3, { to: 90 }); }, 70);
def('impact', 2, (t) => { thud(t, 110, 32, .6, .48); nz(t, .45, 'lowpass', 2400, .7, .3, { to: 80 }); }, 60);
def('heart', 1, (t) => { thud(t, 62, 40, .2, .4); thud(t + .16, 55, 36, .18, .28); }, 150);
def('alarm', 2, (t) => siren(t, 6, .09, 1800), 400);
function siren(t, n, pk, cut) { const o = A().createOscillator(), f = P.biquad('lowpass', cut), g = A().createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(440, t); for (let k = 0; k < n; k++) o.frequency.exponentialRampToValueAtTime(k % 2 ? 440 : 587.33, t + (k + 1) * .36); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + .15); g.gain.setValueAtTime(pk, t + n * .36 - .2); g.gain.exponentialRampToValueAtTime(.0001, t + n * .36); o.connect(f); f.connect(g); P.out(g, { rev: .4 }, t, t + n * .36); o.start(t); o.stop(t + n * .36 + .05); }
def('portal', 1, (t) => { [0, 7].forEach(d => tone(t, 'sine', hz(0, -2), 1.3, .09, { to: hz(4, -1), slide: 1.2, a: .3, detune: d, vib: [6, 25, .4] })); whoosh(t, 1.2, 300, 2400, .06, { q: 4, rev: .6 }); thud(t, 60, 40, 1.2, .12, { a: .3 }); }, 300);
def('shatter', 1, (t) => { nz(t, .45, 'highpass', 5000, .5, .16, { to: 1500, rev: .5 }); for (let i = 0; i < 9; i++) ring(t + rnd(0, .18), rnd(2500, 6000), .25, .025, { parts: [[1, 1], [2.3, .5], [3.9, .3]], pan: rnd(-.8, .8) }); thud(t, 200, 80, .15, .12); }, 80);
def('creak', 0, (t) => { nz(t, .4, 'bandpass', 420, 9, .06, { to: 700, a: .04 }); tone(t, 'sawtooth', 80, .4, .025, { lp: 600, vib: [21, 50, .02], a: .04 }); }, 150);
def('lever', 1, (t) => { for (let i = 0; i < 6; i++) { nz(t + i * .035, .012, 'bandpass', 2600, 2, .08); tone(t + i * .035, 'p25', hz(i, 0), .02, .02, { crush: 1 }); } thud(t + .22, 140, 60, .18, .3); ring(t + .22, 900, .3, .05); tone(t + .26, 'sine', 300, .25, .05, { to: 180, vib: [18, 80, .01] }); }, 200);
def('dig', 1, (t) => { ring(t, 2100 * V(.05), .12, .08, { parts: [[1, 1], [2.6, .4]] }); nz(t, .22, 'lowpass', 750, .7, .24); for (let i = 0; i < 4; i++) nz(t + .08 + i * .06 + rnd(0, .03), .03, 'bandpass', 2500 * V(.3), 2, .06, { pan: rnd(-.5, .5) }); }, 80);
def('build', 1, (t) => { for (let i = 0; i < 3; i++) { ring(t + i * .17, 1150 * V(.04), .12, .07, { parts: [[1, 1], [2.4, .4]] }); thud(t + i * .17, 160, 90, .06, .12); nz(t + i * .17, .03, 'bandpass', 3500, 1.2, .06); } }, 150);
def('cast', 1, (t) => { riser(t, t + .5, 300, 5000, .09, { q: 3 }); tone(t, 'sawtooth', hz(0, -1), .55, .035, { to: hz(0, 1), a: .4, lp: 2200 }); }, 80);
def('bolt', 1, (t, tier) => thunder(t, tier || 1), 80);
function thunder(t, k) { nz(t, .3, 'highpass', 3000, .5, .18 + .05 * k, { to: 300 }); crackle(t, .25, 2000, .1); tone(t, 'sawtooth', 90, .35, .08, { to: 40, lp: 700 }); rumble(t + .05, 1 + .4 * k, .16 + .05 * k, { f: 140 }); }
function fanfare(t, k) { fanfare2(t, k); }   // 旧的号角function：转到新的三种轮换
def('kill', 1, (t) => kill(t, 1), 40);
def('hit', 0, (t) => hit(t, 1), 45);
def('crit', 1, (t) => crit(t), 50);
def('shoot', 0, (t) => atk(t, 'bow'), 55);
def('drone', 2, (t, on) => roomAmb(t, on));
def('rip', 1, (t, d) => { rip(t, d || .4, .22); rip(t + .02, (d || .4) * .9, .12, { f: 1200 }); }, 100);
// 按住天赋蓄力：p 从 0 涨到 1，音一格格往上爬
def('charge', 0, (t, p) => { const k = Math.max(0, Math.min(1, p || 0)); tone(t, 'p25', hz(Math.round(k * 12), 0), .05, .03 + .03 * k, { crush: 1, lp: 5000 }); tone(t, 'sine', hz(Math.round(k * 12), 1), .08, .015 + .02 * k); }, 55);
def('boing', 0, (t) => { tone(t, 'sine', 180, .35, .14, { to: 520, slide: .08, vib: [14, 120, .02] }); thud(t, 140, 80, .08, .08); }, 60);
reg('通用', ['whoosh', 'sparkle', 'up', 'mult', 'heal', 'boom', 'impact', 'heart', 'alarm', 'portal', 'shatter', 'creak', 'lever', 'reelStop', 'chest', 'dig', 'build', 'cast', 'bolt', 'win', 'fanfare', 'lose', 'die', 'kill', 'hit', 'crit', 'shoot', 'rip', 'charge', 'boing']);
// 旧接口：tone(频率, 时长, 波形, 音量, 滑音, delay) / noise(时长, 音量, 频率, delay)
S.tone = function (f, dur, type, vol, slide, delay) { if (!go(0)) return; const t = A().currentTime + .006 + (delay || 0); tone(t, type || 'square', f, dur, Math.min(.2, vol == null ? .12 : vol), { to: slide ? Math.max(20, f + slide) : 0, lin: 1, lp: 5000 }); };
S.noise = function (dur, vol, f, delay) { if (!go(0)) return; const t = A().currentTime + .006 + (delay || 0); nz(t, dur, 'bandpass', f || 1200, .8, Math.min(.3, vol == null ? .2 : vol)); };

// ═════════ 开场与菜单 ═════════
let amb = null;
function roomAmb(t, on) {
  const ac = A();
  if (on && !amb) {
    const g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 3); g.connect(P.MUSB);
    // 窗外的雨
    const r = ac.createBufferSource(); r.buffer = P.NOISE; r.loop = true; const rf = P.biquad('bandpass', 2400, .5), rl = P.biquad('lowpass', 5000), rg = ac.createGain(); rg.gain.value = .025; r.connect(rf); rf.connect(rl); rl.connect(rg); rg.connect(g); r.start(t);
    // 机台的低鸣（原来那段 drone 的音高）
    const hums = [];   // 不要持续的低鸣（用户裁定 2026-09-25）：只留雨声、挂钟和偶尔的水滴
    amb = { g, srcs: [r].concat(hums), iv: setInterval(() => { if (!amb || !go(0)) return; const tt = A().currentTime + .05; nz(tt, .015, 'bandpass', 3200, 4, .05, { dest: g, pan: -.5 }); if (Math.random() < .35) blip(tt + rnd(0, .5), rnd(1800, 3000), .012, { dest: g, pan: rnd(-.8, .8) }); }, 1000) };
  } else if (!on && amb) { const a = amb; amb = null; clearInterval(a.iv); a.g.gain.setTargetAtTime(0, t, .4); a.srcs.forEach(s => s.stop(t + 2)); }
}
def('roomAmb', 2, (t, on) => roomAmb(t, on !== false));
def('cabinetOn', 2, (t) => { thud(t, 90, 50, .25, .3); tone(t + .05, 'sine', 60, .9, .08, { vib: [7, 400, .02], a: .02 }); tone(t + .1, 'sine', 9000, 1.2, .006, { a: .6 }); nz(t + .05, .35, 'bandpass', 3000, .7, .08, { to: 6000 }); arp(t + .45, [deg(5), deg(7), deg(9), deg(12)], .06, (tt, m) => tone(tt, 'p25', mtof(m), .12, .04, { crush: 1, lp: 5000 })); }, 400);
def('coinInsert', 2, (t) => { ring(t, 3300, .12, .06, { parts: [[1, 1], [1.5, .6], [2.3, .3]] }); ring(t + .11, 3100, .1, .04, { parts: [[1, 1], [1.5, .6]] }); nz(t + .16, .18, 'bandpass', 1800, 2, .06, { to: 900 }); thud(t + .34, 150, 90, .08, .15); tone(t + .38, 'p25', mtof(84), .08, .07, { crush: 1 }); tone(t + .46, 'p25', mtof(89), .35, .07, { crush: 1, rev: .3 }); }, 300);
def('screenDive', 2, (t) => { riser(t, t + .9, 200, 6000, .16, { q: 1.5 }); tone(t, 'sawtooth', 400, .9, .04, { to: 60, lp: 1800 }); nz(t + .85, .3, 'bandpass', 3500, .6, .12); thud(t + .9, 80, 35, .5, .3); }, 500);
def('saveTear', 2, (t) => { for (let i = 0; i < 3; i++) tone(t + i * .12, 'square', 1000, .06, .03, { crush: 1 }); rip(t + .4, .55, .24); rip(t + .45, .5, .12, { f: 1300 }); nz(t + .4, .6, 'bandpass', 4000, .4, .04); for (let i = 0; i < 6; i++) nz(t + 1 + i * .09, .05, 'bandpass', 2500, 1.5, .04, { pan: rnd(-.7, .7) }); }, 400);
def('saveRow', 0, (t, ok) => { tone(t, 'square', ok ? 1320 : 440, .05, .03, { crush: 1, lp: 4000 }); }, 60);
reg('开场与菜单', ['roomAmb', 'cabinetOn', 'coinInsert', 'screenDive', 'saveTear', 'saveRow']);

// ═════════ 基地 ═════════
def('digDone', 1, (t) => { rumble(t, .5, .2, { f: 200 }); for (let i = 0; i < 4; i++) nz(t + i * .09 + rnd(0, .04), .05, 'bandpass', rnd(900, 2200), 1.5, .07); IN.marimba(t + .4, dg(67, 4), .4, .7); }, 200);
def('buildDone', 2, (t) => { ring(t, 1100, .15, .07); [0, 2, 4].forEach((d, i) => IN.vibes(t + .06 + i * .07, dg(65, d), .5, .7)); }, 300);
def('roomSelect', 0, (t, q) => { const k = q || 0; nz(t, .03, 'bandpass', 900, 1.2, .08); thud(t, 150, 90, .06, .1); if (k > 0) bell(t + .02, deg(5 + k * 2), .35, .03 + .01 * k); }, 60);
def('portalOpen', 2, (t) => { rumble(t, 1.3, .18, { f: 220 }); nz(t, 1.2, 'bandpass', 300, 3, .1, { src: 'brown', to: 700, a: .3 }); [0, 9].forEach(d => tone(t + .2, 'sine', hz(0, -1), 1.4, .07, { to: hz(7, -1), slide: 1.3, a: .4, detune: d, vib: [5, 30, .5] })); whoosh(t + .3, 1.2, 250, 1800, .05, { q: 3, rev: .5 }); }, 500);
def('steleRise', 1, (t, i) => { const k = i || 0; nz(t, .45, 'bandpass', 500, 2, .07, { src: 'brown', a: .1 }); ring(t + .3, mtof(deg(k * 2, -1)), 1.4, .06, { parts: [[1, 1], [2.01, .4], [3.9, .2]], rev: .5 }); }, 60);
def('steleLift', 1, (t) => { whoosh(t, .2, 400, 1600, .08); whoosh(t + .18, .3, 3000, 500, .14, { peak: .9 }); }, 300);
def('steleHit', 2, (t) => { thud(t, 95, 30, .6, .48); ring(t, 260, .9, .07); for (let i = 0; i < 4; i++) nz(t + rnd(0, .3), .05, 'bandpass', rnd(900, 2600), 1.5, .06, { pan: rnd(-.7, .7) }); duck(t, .5, .9); }, 300);
def('steleDrop', 2, (t) => { whoosh(t, .25, 400, 1600, .08); whoosh(t + .25, .35, 3000, 500, .14, { peak: .9 }); const g = t + .6; thud(g, 95, 30, .6, .48); ring(g, 260, .9, .07); for (let i = 0; i < 4; i++) nz(g + rnd(0, .3), .05, 'bandpass', rnd(900, 2600), 1.5, .06, { pan: rnd(-.7, .7) }); duck(t + .5, .5, .9); }, 400);
// 世界主题传送门：每个世界一段三秒左右的招牌声音
const WORLD = {
  town: (t) => { ring(t, mtof(53), 3, .09, { parts: [[1, 1], [2.01, .5], [2.76, .3], [5.4, .15]], rev: .8 }); nz(t, 2.6, 'lowpass', 500, .7, .07, { a: 1, src: 'brown' }); arp(t + .6, [deg(4), deg(2), deg(0), deg(-1)], .3, (tt, m) => bell(tt, m + 12, .9, .05)); },
  forest: (t) => { for (let i = 0; i < 6; i++) { const tt = t + .2 + i * rnd(.15, .35), f = rnd(2600, 4200); tone(tt, 'sine', f, .09, .03, { to: f * 1.35, slide: .05, vib: [30, 300, .01], pan: rnd(-.8, .8) }); } nz(t, 2.4, 'highpass', 3000, .5, .03, { a: .6 }); arp(t + .5, [deg(7), deg(9), deg(12), deg(9)], .35, (tt, m) => tone(tt, 'triangle', mtof(m), .5, .05, { vib: [5, 18, .15], a: .04, rev: .5 })); },
  carnival: (t) => { [[0, 0], [.33, 4], [.5, 7], [.66, 4], [1, 2], [1.33, 5], [1.5, 9], [1.66, 5]].forEach(([d, i]) => { tone(t + d, 'square', hz(i), .15, .04, { lp: 3500, crush: 1 }); tone(t + d, 'triangle', hz(i, 1), .15, .03); }); [0, 1].forEach(d => thud(t + d, 120, 80, .1, .15)); ring(t + 2, 3200, .6, .05); sparkleAt(t + 2, 6, .025); },
  harbor: (t) => { nz(t, 2.6, 'lowpass', 700, .7, .1, { a: 1.1, src: 'brown' }); nz(t + .3, 1.4, 'bandpass', 1300, .8, .05, { to: 500, a: .6 }); brass(t + .8, 41, 1.2, .04, { bright: 600 }); brass(t + .8, 48, 1.2, .03, { bright: 600 }); [0, .5].forEach(d => tone(t + 1.6 + d, 'sine', 2200, .4, .025, { to: 1400, vib: [9, 60, .05], pan: .5 })); for (let i = 0; i < 5; i++) blip(t + rnd(.2, 2), rnd(400, 900), .03); },
  foundry: (t) => { for (let i = 0; i < 6; i++) { ring(t + i * .28, 700 * V(.05), .3, .06, { parts: [[1, 1], [2.7, .5], [5.1, .2]] }); nz(t + i * .28, .04, 'bandpass', 2000, 1.2, .06); } nz(t + .9, .8, 'highpass', 3500, .5, .1, { a: .05, to: 6000 }); ring(t + 1.9, 1400, 1.4, .09, { rev: .5 }); thud(t + 1.9, 120, 60, .3, .25); },
  hospital: (t) => { [0, .9, 1.8].forEach(d => tone(t + d, 'sine', 1000, .12, .04)); tone(t + .4, 'sine', 900, 1.8, .045, { to: 1900, slide: 1.2, vib: [6, 60, .2], a: .3, rev: .8 }); nz(t + .4, 1.6, 'bandpass', 1600, 6, .05, { a: .6, to: 2600, rev: .7 }); padc(t, [50, 51, 57], 2.6, .012, { lp: 700 }); },
  starship: (t) => { tone(t, 'sawtooth', 80, 1.6, .06, { to: 1600, slide: 1.4, lp: 3000, a: .3 }); riser(t + .2, t + 1.5, 300, 7000, .1); for (let i = 0; i < 5; i++) tone(t + 1.6 + i * .08, 'p25', hz(pick([9, 11, 12, 14])), .06, .03, { crush: 1 }); thud(t + 1.5, 90, 40, .5, .3); whoosh(t + 1.5, .7, 5000, 400, .1); },
  hell: (t) => { crackle(t, 2.6, 900, .12, { a: .8 }); rumble(t, 2.6, .2, { f: 180 }); tone(t + .3, 'sawtooth', 55, 2, .06, { lp: 400, vib: [3, 40, .5] }); choir(t + .4, [50, 51, 57], 2.2, .04, { dark: 1, a: .8 }); },
  casino: (t) => { for (let i = 0; i < 14; i++) nz(t + i * (.05 + i * .006), .01, 'bandpass', 3500, 3, .06); coins(t + 1.2, 10, .03); [53, 57, 60, 64].forEach(m => ep(t + 1.25, m, .9, .05)); brass(t + 1.25, 72, .4, .04); brass(t + 1.25, 76, .4, .035); },
};
WORLD.park = WORLD.carnival; WORLD.ward = WORLD.hospital;
def('worldTheme', 2, (t, k) => { (WORLD[k] || WORLD.town)(t); duck(t, .5, 2.4); }, 600);
def('terrainReveal', 2, (t) => { thud(t, 100, 40, .45, .35); [0, 4, 7].forEach((d, i) => IN.glassHarm(t + .05 + i * .08, 72 + d, .8, .7)); }, 400);
// 时间轴：盖章、三个小圆点、今天圈滑过去落位
def('tlStamp', 1, (t) => S.stamp());
def('tlSlide', 0, (t) => { whoosh(t, .3, 600, 2400, .06, { pan: -.3, panTo: .3 }); });
// 新的五天：旧的五天一格格盖章掉落、整条滚过去、新的五天弹进来、大字
reg('基地', ['dig', 'digDone', 'build', 'buildDone', 'roomSelect', 'portalOpen', 'steleRise', 'steleLift', 'steleHit', 'steleDrop', 'worldTheme', 'terrainReveal', 'tlStamp', 'tlDot', 'tlSlide', 'tlLand', 'tlEvent', 'chaos', 'nfStamp', 'nfScroll', 'nfPop', 'nfTitle']);

// 收获飞进顶栏：每种资源落地的声音不一样
const LOOT = {
  supplies: (t) => { nz(t, .05, 'bandpass', 700, 1.2, .1); thud(t, 180, 100, .07, .12); },
  shards: (t) => { ring(t, 2400 * V(.05), .5, .05, { parts: [[1, 1], [2.7, .5], [4.1, .3]], rev: .3 }); tone(t, 'sine', mtof(deg(9, 1)), .3, .02, { vib: [7, 30, .02] }); },
  exp: (t) => { bell(t, deg(pick([9, 10, 11])), .3, .06); sparkleAt(t, 1, .02); },
  blueprint: (t) => { nz(t, .08, 'bandpass', 3000, 1, .06); nz(t + .05, .06, 'bandpass', 2200, 1, .05); thud(t + .1, 200, 120, .04, .06); },
  score: (t, n) => coinRun(t, coinN(n), .05),
};
def('loot', 0, (t, k, n) => (LOOT[k] || LOOT.supplies)(t, n), 450);   // 一批奖励飞进顶栏只响第一个落地的：卡片弹出时已经一张张响过
reg('收获', ['loot']);

// ═════════ 演出 ═════════
// 进战通告：两把刀 0.2 秒内切到中间交叉，0.18 秒白闪 + 冲击波，名字 0.14 秒起砸下、0.44 秒落定，副行 0.45 秒滑入
def('introOut', 1, (t) => whoosh(t, .3, 1200, 4000, .04, { pan: 0, panTo: .8 }), 300);
// 胜利：白闪，光芒转起来，每个字在 0.08 + 0.1·i 秒开始掉、0.28 秒后落地，0.3 秒火花绕字，0.45 秒confetti，最后一个字落地后铜管收尾
// 胜利横幅可以点击快进，所以游戏里按横幅的 t 逐拍调用 S.vic(拍, i)；S.victory(字数) 是整段
// 结算：标题 0.35 秒砸到位，0.25 秒闪光（阵亡没有），卡片从 0.55 + 0.14·i 秒起一张张弹出
// 升级：0.12 闪光，0.36「LEVEL UP」落定，0.7「Lv a → Lv b」，1.3–2.3 战斗力滚动（属和弦撑着），2.3 停住变金（解决到主和弦）
// 游戏里按动画自己的时间逐拍调用 S.lv(拍, 参数)（点击快进时画面和声音一起加速）；S.levelUp() 是整段，给试听页用
let lvG = null;
// 招募碎卡：0.55 秒卡片到位，蓄力时光一档档爬到它的品质，1.75 秒碎开，3.0 秒飞走，3.7 秒落进领袖栏
// 游戏里逐拍调用 S.rc(拍, 参数)；S.recruit(品质) 是整段
let rcG = null;
// 领袖阵亡 · 卡片裂开：in 在卡片飞出来时（低沉的小调 + 钟声），rip 在卡片裂成两半时；中间的心跳由游戏按拍调用 heart
reg('演出', ['battleIntro', 'introOut', 'vic', 'victory', 'endScreen', 'lv', 'levelUp', 'rc', 'recruit', 'reveal', 'tear', 'leaderDown']);

// ═════════ 宝箱与转盘 ═════════
def('chestShake', 1, (t, k) => { const n = 3 + (k | 0); for (let i = 0; i < n; i++) { nz(t + i * .09, .04, 'bandpass', 700 * V(.2), 2, .08); thud(t + i * .09, 150, 90, .05, .08); } }, 80);
// 宝箱抖动时的一下木头碰撞，k 从 0 到 1 越来越急
def('knock', 0, (t, k) => { k = Math.max(0, Math.min(1, k || 0)); nz(t, .05, 'bandpass', 520 * (1 + k * .7), 2.2, .09 + .05 * k); thud(t, 150 + 60 * k, 90, .06, .08 + .04 * k); }, 140);
reg('宝箱与转盘', ['chestShake', 'knock', 'itemReveal', 'reelUp']);

// ═════════ 出征地图 ═════════
def('launch', 2, (t) => { S.portal(); riser(t, t + .8, 300, 5000, .1); thud(t + .8, 80, 36, .5, .35); IN.harp(t + .85, 77, .8, .6); duck(t, .6, 1.4); }, 600);
def('step', 0, (t, i) => step(t, .045 * HV[VARI % 3], { pan: (i | 0) % 2 ? .15 : -.15 }), 120);
def('nodeReveal', 0, (t) => nz(t, .25, 'highpass', 4000, .5, .02, { a: .08 }), 80);
const ARRIVE = {
  // 战斗节点不出声：紧接着就是进战通告
  battle: () => {}, elite: () => {}, boss: () => {},
  shop: (t) => [0, .08, .16].forEach((d, i) => ring(t + d, 2400 + i * 300, .45, .04, { parts: [[1, 1], [2.3, .4]] })),
  event: (t) => arp(t, [deg(0), deg(3), deg(5), deg(8)].map(m => m + 12), .09, (tt, m) => bell(tt, m, .9, .06, { rev: .6 })),
  chest: (t) => IN.glock(t, dg(72, 7), .7, .6),
  camp: (t) => { whoosh(t, .5, 200, 900, .08); crackle(t + .1, 1, 1500, .06, { a: .2 }); },
  evac: (t) => arp(t, [deg(0), deg(2), deg(4), deg(7)].map(m => m + 12), .08, (tt, m) => bell(tt, m, .8, .07)),
  empty: (t) => step(t, .06),
};
def('arrive', 1, (t, k) => { if (k === 'battle' || k === 'elite' || k === 'boss') return; thud(t, 140, 80, .07, .12); (ARRIVE[k] || ARRIVE.empty)(t + .02); }, 150);
def('shopEnter', 1, (t) => [0, .07, .14].forEach((d, i) => ring(t + d, 2600 + i * 250, .45, .045, { parts: [[1, 1], [2.3, .4]], pan: .3 })), 400);
def('buy', 1, (t) => { ring(t, 3100, .5, .07, { parts: [[1, 1], [2.02, .4]] }); thud(t + .08, 180, 90, .08, .12); coinRun(t + .1, 2, .04); }, 80);
def('sell', 1, (t, n) => { coinRun(t, coinN(n == null ? 40 : n), .05); nz(t, .05, 'bandpass', 900, 1, .06); }, 80);
def('refresh', 1, (t) => { for (let i = 0; i < 7; i++) nz(t + i * .04, .03, 'bandpass', 3000 * V(.2), 1.5, .05); thud(t + .3, 170, 100, .05, .08); }, 150);
const GAIN = {
  unit: (t) => { timp(t, 41, .2); brass(t + .05, 65, .25, .035); brass(t + .05, 72, .25, .035); },
  flag: (t) => { whoosh(t, .35, 400, 1800, .08, { q: .6 }); for (let i = 0; i < 4; i++) nz(t + .05 + i * .06, .04, 'bandpass', 1200, 1, .05); },
  item: (t) => { nz(t, .06, 'bandpass', 900, 1, .08); bell(t + .04, deg(9), .4, .06); },
  relic: (t) => ring(t, 1800, .9, .06, { rev: .3 }),
};
def('gain', 1, (t, k) => (GAIN[k] || GAIN.item)(t), 60);
reg('出征地图', ['launch', 'step', 'nodeReveal', 'arrive', 'shopEnter', 'buy', 'sell', 'refresh', 'gain']);

// ═════════ 战斗 ═════════
// 攻击按武器族：挥砍 / 重砸 / 突刺 / 法杖 / 弓 / 枪
const ATK = {
  slash: (t, p) => { whoosh(t, .12, 900, 3800, .08, { pan: p, peak: .5 }); nz(t + .02, .06, 'bandpass', 6000, 4, .025, { pan: p }); },
  smash: (t, p) => whoosh(t, .2, 250, 1200, .1, { pan: p, peak: .7 }),
  thrust: (t, p) => whoosh(t, .09, 1500, 4500, .07, { pan: p, peak: .4, q: 2 }),
  staff: (t, p) => { fm(t, hz(pick([7, 9, 10])), .18, .04, { r: 2, i: 3, itau: .05, pan: p }); nz(t, .1, 'highpass', 4000, .5, .02, { pan: p }); },
  bow: (t, p) => { tone(t, 'triangle', 140 * V(.05), .12, .07, { to: 110, pan: p, lp: 1500 }); nz(t, .02, 'bandpass', 2500, 2, .06, { pan: p }); whoosh(t + .02, .18, 1800, 4200, .035, { pan: p, panTo: -p }); },
  gun: (t, p) => { nz(t, .12, 'highpass', 800, .5, .2, { pan: p }); thud(t, 180, 60, .1, .2, { pan: p }); nz(t, .02, 'bandpass', 3500, 1, .1, { pan: p }); if (Math.random() < .4) ring(t + .15, rnd(3500, 5000), .1, .015, { pan: p }); },
  claw: (t, p) => { whoosh(t, .1, 1200, 3000, .06, { pan: p }); rip(t + .03, .08, .05, { pan: p }); },
  bite: (t, p) => { thud(t, 220, 120, .06, .12, { pan: p }); nz(t, .05, 'bandpass', 1400, 2, .07, { pan: p }); },
  throw: (t, p) => { whoosh(t, .16, 700, 2600, .06, { pan: p, panTo: -p * .5, peak: .4 }); for (let i = 0; i < 3; i++) nz(t + .03 + i * .045, .025, 'bandpass', 1800, 2, .025, { pan: p }); },
};
const atk = (t, k, p, w) => (ATK[k] || ATK.slash)(t, p || 0, w == null ? .5 : w);
// 武器 → 攻击音（和 mc-px16-hum.js 的武器族一致）；没拿武器的按爪
const WKIND = { sword: 'slash', katana: 'slash', dagger: 'slash', axe: 'slash', mace: 'smash', sickle: 'slash', fan: 'slash', claws: 'claw', fist: 'smash', greatsword: 'smash', hammer: 'smash', flail: 'smash', scythe: 'smash', club: 'smash', spear: 'thrust', lance: 'thrust', trident: 'thrust', pike: 'thrust', banner: 'thrust', staff: 'staff', wand: 'staff', torch: 'staff', book: 'staff', orb: 'staff', bow: 'bow', crossbow: 'bow', gun: 'gun', rifle: 'gun', cannon: 'gun', shuriken: 'thrust', bag: 'smash', none: 'claw' };
S.atkKind = w => WKIND[w] || 'claw';
// 弹道样式 → 命中音
const PKIND = { arrow: 'arrow', bolt: 'arrow', stone: 'stone', rock: 'stone', bullet: 'bullet', shell: 'stone', orb: 'spark', spark: 'spark', fire: 'spark', water: 'water', bubble: 'water', coin: 'coin' };
S.projKind = st => PKIND[st] || 'arrow';
// 战斗画面横坐标（0~1920）→ 左右声像
S.panX = x => Math.max(-.8, Math.min(.8, ((x == null ? 960 : x) - 960) / 1100));
def('atk', 0, (t, k, p, w) => atk(t, k, p, w));
// 投射物命中
const PROJ_ = {
  arrow: (t, p, v = 1) => { thud(t, 300 * v, 160, .05, .160, { pan: p }); nz(t, .04, 'bandpass', 1200, 1.5, .128, { pan: p }); },
  stone: (t, p, v = 1) => { thud(t, 160 * v, 70, .1, .256, { pan: p }); for (let i = 0; i < 3; i++) nz(t + .02 + i * .03, .03, 'bandpass', rnd(1500, 3000), 2, .064, { pan: p }); },
  bullet: (t, p, v = 1) => { nz(t, .03, 'highpass', 2500, .7, .160, { pan: p }); thud(t, 250 * v, 120, .04, .128, { pan: p }); if (Math.random() < .3) tone(t + .02, 'sine', 3200, .18, .02, { to: 1800, pan: p }); },
  spark: (t, p, v = 1) => { crackle(t, .15, 2500 * v, .096, { pan: p }); tone(t, 'square', 1800, .05, .02, { to: 600, crush: 1, pan: p }); },
  water: (t, p, v = 1) => { nz(t, .15, 'bandpass', 1200 * v, 1, .128, { to: 500, pan: p }); for (let i = 0; i < 3; i++) blip(t + .02 + i * .04, rnd(500, 1000), .064, { pan: p }); },
  coin: (t, p, v = 1) => ring(t, rnd(2800, 3600), .3, .05, { parts: [[1, 1], [1.5, .5], [2.4, .3]], pan: p }),
};
const PROJ = PROJ_;
def('proj', 0, (t, k, p) => (PROJ[k] || PROJ.arrow)(t, p || 0, HV[VARI % 3]));
S._projGain = 1;
// 命中：按攻击者的武器族换质感，每种 3 个变体轮换（导演给的 VARI）
const HV = [1, .86, 1.15];
function hit(t, k, p, kind) {
  const v = HV[VARI % 3], o = { pan: p };
  if (kind === 'smash') { thud(t, 130 * v, 50, .13, .3 * k, o); nz(t, .09, 'lowpass', 900 * v, .8, .18 * k, o); }
  else if (kind === 'slash' || kind === 'thrust' || kind === 'claw') { thud(t, 185 * v, 80, .07, .2 * k, o); nz(t, .07, 'bandpass', 2300 * v, 1.4, .13 * k, Object.assign({ to: 1100 }, o)); if (kind === 'claw') rip(t, .05, .05 * k, o); }
  else if (kind === 'staff') { thud(t, 160 * v, 80, .06, .15 * k, o); tone(t, 'square', 1500 * v, .05, .025 * k, Object.assign({ to: 500, crush: 1 }, o)); crackle(t, .06, 3000, .04 * k, o); }
  else { thud(t, 170 * v, 70, .09, .24 * k, o); nz(t, .05, 'bandpass', 1600 * v, 1, .15 * k, o); nz(t, .02, 'highpass', 4000, .7, .05 * k, o); }
}
function crit(t, p) { hit(t, 1.4, p); ring(t, 2600 * V(.05), .35, .07, { parts: [[1, 1], [1.5, .5], [2.8, .3]], pan: p }); thud(t, 90, 40, .25, .25, { pan: p }); bell(t + .02, deg(pick([12, 14])), .5, .06, { pan: p }); nz(t, .1, 'highpass', 5000, .5, .06); }
function kill(t, k, p) { tone(t, 'square', 700 * V(.05), .14, .05 * k, { to: 180, crush: 1, pan: p }); nz(t, .12, 'bandpass', 900, .8, .1 * k, { to: 300, pan: p }); thud(t, 120, 50, .15, .15 * k, { pan: p }); tone(t + .04, 'sine', hz(pick([9, 12])), .12, .025, { pan: p }); }
def('hitAt', 0, (t, p, k, kind) => hit(t, k || 1, p || 0, kind));
def('critAt', 1, (t, p) => crit(t, p || 0));
def('killAt', 1, (t, p) => kill(t, 1, p || 0));
def('armorHit', 0, (t, p) => { ring(t, 1500 * V(.1), .2, .06, { parts: [[1, 1], [2.3, .4]], pan: p || 0 }); nz(t, .04, 'bandpass', 2500, 1.2, .06, { pan: p || 0 }); }, 45);
def('dodge', 0, (t, p) => whoosh(t, .12, 1800, 4200, .05, { pan: p || 0, peak: .4 }), 60);
def('summonIn', 1, (t, p) => { fm(t, 900, .3, .05, { r: 1.5, i: 3, to: 1800, itau: .1, pan: p || 0 }); thud(t + .05, 140, 70, .1, .12, { pan: p || 0 }); }, 90);
def('tomb', 1, (t, p) => { thud(t, 140, 60, .2, .3, { pan: p || 0 }); nz(t, .15, 'lowpass', 1200, .7, .12, { pan: p || 0 }); ring(t, 300, .3, .03, { pan: p || 0 }); }, 100);
def('soul', 1, (t, p) => { tone(t, 'sine', hz(7), .9, .04, { to: hz(12), slide: .8, vib: [6, 30, .1], a: .1, rev: .7, pan: p || 0 }); nz(t, .8, 'highpass', 4000, .5, .02, { a: .3 }); }, 150);
// 入场
const ENTRY = {
  walk: (t) => step(t, .07, { pan: rnd(-.4, .4) }),
  march: (t) => { for (let i = 0; i < 8; i++) step(t + i * .19 + rnd(0, .03), .06, { pan: rnd(-.6, .6) }); },
  descend: (t) => { whoosh(t, .5, 3000, 500, .08, { peak: .8 }); thud(t + .5, 120, 60, .15, .2); },
  drop: (t) => { whoosh(t, .25, 2000, 600, .06); thud(t + .25, 100, 40, .35, .35); nz(t + .25, .3, 'lowpass', 1200, .7, .12); },
  leap: (t) => { whoosh(t, .25, 600, 2800, .07); whoosh(t + .25, .2, 2400, 700, .05); thud(t + .45, 130, 60, .12, .2); },
  rise: (t) => { rumble(t, .7, .2, { f: 180 }); for (let i = 0; i < 5; i++) nz(t + .3 + rnd(0, .3), .05, 'bandpass', rnd(900, 2500), 1.5, .05); },
  spin: (t) => { for (let i = 0; i < 3; i++) whoosh(t + i * .12, .14, 800, 2600, .06, { pan: i % 2 ? .5 : -.5 }); },
  flash: (t) => fm(t, 1200, .25, .05, { r: 1.5, i: 4, to: 3000, itau: .08 }),
};
def('entry', 1, (t, k) => (ENTRY[k] || ENTRY.march)(t), 120);
def('skillReady', 0, (t, p) => { bell(t, deg(12), .3, .03, { pan: p || 0 }); tone(t, 'sine', hz(14), .15, .012, { pan: p || 0 }); }, 150);
def('skillTitle', 1, (t, pal) => { thud(t, 100, 45, .3, .3); const q = palOf(pal); (q.minor ? [50, 57, 62, 65] : [53, 60, 65, 69]).forEach(m => brass(t, m + (q.shift || 0), .35, .035, { bright: 3000 })); }, 200);
def('scoreFly', 0, (t) => { whoosh(t, .25, 1200, 4000, .03); tone(t + .25, 'p25', hz(pick([9, 10, 12])), .06, .035, { crush: 1 }); }, 40);
def('legionCard', 2, (t) => { S.ui_big({ power: .8 }); whoosh(t + .05, .4, 400, 3000, .1, { pan: -.6, panTo: .6 }); }, 300);
// 领袖上场：色带 3 步滑入，名字砸下，铜管吹出回家的动机 C F G A
def('pause', 1, (t, on) => { if (on) { tone(t, 'sine', 600, .3, .06, { to: 150 }); nz(t, .2, 'lowpass', 2000, .7, .05, { to: 200 }); } else { tone(t, 'sine', 150, .25, .06, { to: 600 }); } }, 150);
def('speed', 0, (t, n) => { for (let i = 0; i < (n || 1); i++) tone(t + i * .06, 'p25', hz(7 + i * 2), .04, .04, { crush: 1 }); }, 100);
def('holdTick', 1, (t, s) => { const last = (s | 0) <= 3; tone(t, 'square', last ? 1320 : 990, .06, last ? .05 : .03, { crush: 1, lp: 4000 }); nz(t, .015, 'bandpass', 3200, 4, .05); }, 300);
def('waveHorn', 1, (t) => { brass(t, 50, .7, .045, { bright: 1500 }); brass(t, 57, .7, .035, { bright: 1500 }); timp(t, 38, .3); }, 800);
def('settleTick', 0, (t, i) => tone(t, 'p25', hz((i | 0) % 12, 0), .03, .035, { crush: 1, lp: 5000 }), 30);
def('settleTotal', 2, (t) => { thud(t, 110, 40, .35, .38); coinRun(t + .02, 8, .05); }, 400);
reg('战斗', ['atk', 'proj', 'hitAt', 'critAt', 'killAt', 'armorHit', 'dodge', 'summonIn', 'allyDie', 'tomb', 'soul', 'entry', 'bossDrop', 'skillReady', 'skillTitle', 'scoreFly', 'legionCard', 'cutin', 'pause', 'speed', 'holdTick', 'waveHorn', 'settleTick', 'settleTotal']);

// ═════════ 技能：花样 × 色板 ═════════
// 技能全部经过 P16.castFx(战斗, 单位, 'charge' | 'cast', 配方, 等级, 时长)：配方里 ch / cs 是 15 种花样之一，ramp 是色板。
// 花样决定声音的「动作」（聚气、落刃、陨石……），色板决定「材质」（火是噼啪、冰是玻璃、圣光是钟……）。
const PAL = {
  holy: { mat: 'bell', d: 7 }, fire: { mat: 'fire', d: 0 }, frost: { mat: 'glass', d: 9 }, arcane: { mat: 'fm', d: 5 },
  shadow: { mat: 'shadow', d: -3, minor: 1 }, toxic: { mat: 'bubble', d: 2 }, green: { mat: 'leaf', d: 4 }, blood: { mat: 'wet', d: -2, minor: 1 },
  sea: { mat: 'water', d: 3 }, teal: { mat: 'clock', d: 6 }, steel: { mat: 'metal', d: 2 }, iron: { mat: 'metal', d: 0 },
  gold: { mat: 'coin', d: 7 }, pink: { mat: 'twinkle', d: 10 }, orange: { mat: 'earth', d: 0 },
  bolt: { mat: 'zap', d: 4 }, curse: { mat: 'hex', d: -4, minor: 1 },
};
// 角色重做那边用的元素名
Object.assign(PAL, { poison: PAL.toxic, nature: PAL.green, water: PAL.sea, earth: PAL.orange, metal: PAL.steel, coin: PAL.gold, time: PAL.teal, magic: PAL.arcane });
S.PAL = PAL;
const PAL_ALIAS = [[/arcane|magic|mana|star/, 'arcane'], [/holy|light|sun|angel/, 'holy'], [/frost|ice|snow|cold/, 'frost'], [/fire|flame|lava|ember|burn/, 'fire'], [/toxic|poison|venom|acid/, 'toxic'], [/green|nature|leaf|wood|forest/, 'green'], [/sea|water|wave|tide/, 'sea'], [/orange|earth|stone|rock|sand|dust/, 'orange'], [/shadow|dark|void|night|ghost|soul/, 'shadow'], [/blood|flesh/, 'blood'], [/steel|metal|tech|machine|iron/, 'steel'], [/gold|coin|money/, 'gold'], [/teal|time|clock/, 'teal'], [/pink|love|charm/, 'pink']];
function palOf(n) { if (PAL[n]) return PAL[n]; const k = String(n || '').toLowerCase(), a = PAL_ALIAS.find(([re]) => re.test(k)); return PAL[a ? a[1] : 'holy']; }
S.palOf = palOf;
function tex(t, mat, k, d, p) {
  p = p || 0;
  switch (mat) {
    case 'bell': arp(t, [deg(d), deg(d + 2), deg(d + 4)], .03, (tt, m) => bell(tt, m, .8, .05 * k, { pan: p })); break;
    case 'fire': crackle(t, .5, 1200, .08 * k, { pan: p }); nz(t, .5, 'bandpass', 500, .8, .1 * k, { src: 'brown', to: 1500, pan: p }); break;
    case 'glass': for (let i = 0; i < 5; i++) ring(t + i * .03, mtof(deg(d + i, 1)), .5, .03 * k, { parts: [[1, 1], [2.7, .5], [5.2, .25]], pan: p }); nz(t, .3, 'highpass', 6000, .5, .04 * k, { pan: p }); break;
    case 'fm': fm(t, hz(d), .5, .06 * k, { r: 1.5, i: 5, itau: .3, pan: p, rev: .4 }); break;
    case 'shadow': nz(t, .5, 'bandpass', 600, 3, .08 * k, { a: .15, to: 250, pan: p }); tone(t, 'sine', hz(d, -1), .6, .08 * k, { to: hz(d - 2, -1), pan: p }); break;
    case 'bubble': for (let i = 0; i < 6; i++) blip(t + i * .05 + rnd(0, .03), rnd(300, 800), .06 * k, { pan: p + rnd(-.3, .3) }); break;
    case 'leaf': nz(t, .4, 'highpass', 3500, .5, .04 * k, { a: .05, pan: p }); arp(t, [deg(d), deg(d + 2)], .06, (tt, m) => tone(tt, 'triangle', mtof(m + 12), .4, .04 * k, { pan: p })); break;
    case 'wet': nz(t, .2, 'lowpass', 900, 1, .14 * k, { pan: p }); thud(t, 140, 60, .12, .15 * k, { pan: p }); break;
    case 'water': nz(t, .35, 'bandpass', 1400, 1, .1 * k, { to: 500, pan: p }); for (let i = 0; i < 4; i++) blip(t + .03 + i * .05, rnd(600, 1300), .05 * k, { pan: p }); break;
    case 'clock': for (let i = 0; i < 4; i++) nz(t + i * .06, .012, 'bandpass', i % 2 ? 2700 : 3600, 5, .1 * k, { pan: i % 2 ? .3 : -.3 }); bell(t + .24, deg(d + 5), .6, .05 * k, { pan: p }); break;
    case 'metal': ring(t, mtof(deg(d, 0)) * 2, .7, .07 * k, { pan: p }); break;
    case 'coin': coins(t, 5, .03 * k); break;
    case 'twinkle': sparkleAt(t, 5, .025 * k); break;
    case 'zap': crackle(t, .3, 3000, .08 * k, { pan: p }); tone(t, 'sawtooth', 1400, .12, .04 * k, { to: 300, crush: 1, pan: p }); tone(t + .08, 'square', 900, .1, .025 * k, { to: 2400, crush: 1, pan: p }); break;
    case 'hex': fm(t, hz(d, -1), .7, .06 * k, { r: 1.414, i: 3, itau: .5, pan: p, rev: .5 }); tone(t, 'sine', hz(d + 1, 0), .7, .03 * k, { vib: [4, 60, .1], pan: p }); nz(t, .6, 'bandpass', 900, 5, .05 * k, { a: .2, pan: p }); break;
    case 'earth': rumble(t, .4, .14 * k); for (let i = 0; i < 3; i++) nz(t + i * .05, .04, 'bandpass', rnd(900, 2000), 1.5, .05 * k, { pan: p }); break;
  }
}
// 蓄力（时长 d 秒，声音在施放那一刻正好涨满）
const CHARGE = {
  spiral: (t, d, q, k, p) => { whoosh(t, d, 300, 2600, .07 * k, { pan: p - .5, panTo: p + .5, peak: .9 }); tone(t, 'sawtooth', hz(q.d, -2), d, .03 * k, { to: hz(q.d, 0), a: d * .8, lp: 1800, pan: p }); },
  heal: (t, d, q, k, p) => { arp(t, [0, 1, 2, 3, 4].map(i => deg(q.d + i)), d / 5, (tt, m) => bell(tt, m, .5, .04 * k, { pan: p })); riser(t, t + d, 2000, 7000, .04 * k, { pan: p }); },
  fire: (t, d, q, k, p) => { crackle(t, d, 1500, .07 * k, { a: d * .8, pan: p }); riser(t, t + d, 200, 1800, .06 * k, { pan: p }); },
  frost: (t, d, q, k, p) => { for (let i = 0; i < 6; i++) ring(t + i * d / 6, mtof(deg(q.d + i, 1)), .3, .02 * k, { parts: [[1, 1], [2.7, .4]], pan: p + Math.sin(i * 1.3) * .4 }); nz(t, d, 'highpass', 6000, .5, .035 * k, { a: d * .8, pan: p }); },
  bolt: (t, d, q, k, p) => { tone(t, 'sawtooth', 60, d, .04 * k, { a: d * .8, lp: 900, vib: [31, 200, .05], pan: p }); crackle(t, d, 3000, .05 * k, { a: d * .8, pan: p }); },
  shield: (t, d, q, k, p) => { tone(t, 'sine', hz(q.d, -1), d + .1, .05 * k, { a: d * .7, vib: [9, 20, .05], pan: p }); tone(t, 'sawtooth', hz(q.d, -1), d + .1, .012 * k, { a: d * .7, lp: 1200, pan: p }); },
  summon: (t, d, q, k, p) => { fm(t, hz(q.d, -1), d + .1, .04 * k, { r: 2, i: 2, a: d * .7, itau: 1, pan: p }); for (let i = 0; i < 6; i++) tone(t + i * d / 6, 'sine', hz(q.d + i, 1), .15, .02 * k, { pan: p + Math.sin(i) * .5 }); },
  poison: (t, d, q, k, p) => { for (let i = 0; i < 8; i++) blip(t + d * Math.sqrt(i / 8), rnd(250, 600), .04 * k, { pan: p }); nz(t, d, 'highpass', 3000, .5, .04 * k, { a: d * .8, pan: p }); },
  blade: (t, d, q, k, p) => { nz(t, d, 'bandpass', 5200, 6, .05 * k, { a: d * .85, to: 7500, pan: p }); ring(t + d * .7, 3600, .4, .02 * k, { pan: p }); },
  buff: (t, d, q, k, p) => { padc(t, [deg(q.d, -1), deg(q.d + 2, -1), deg(q.d + 4, -1)], d + .1, .02 * k, { a: d * .8, lp: 2500, pan: p }); riser(t, t + d, 300, 4000, .05 * k, { pan: p }); },
  shadow: (t, d, q, k, p) => { nz(t, d, 'bandpass', 500, 3, .08 * k, { a: d * .9, to: 900, pan: p }); tone(t, 'sine', hz(q.d, -2), d, .06 * k, { a: d * .8, pan: p }); },
  beam: (t, d, q, k, p) => { tone(t, 'sine', hz(q.d, -1), d, .04 * k, { to: hz(q.d, 1), a: d * .7, pan: p }); tone(t, 'p25', hz(q.d, -1), d, .012 * k, { to: hz(q.d, 1), a: d * .8, crush: 1, pan: p }); },
  coin: (t, d, q, k, p) => { for (let i = 0; i < 6; i++) ring(t + d * i / 6, rnd(2800, 3800), .12, .015 * k * (1 + i / 3), { parts: [[1, 1], [1.5, .5]], pan: p }); },
  nova: (t, d, q, k, p) => { riser(t, t + d, 3500, 300, .06 * k, { pan: p }); tone(t, 'sine', hz(q.d, -2), d, .05 * k, { a: d * .9, pan: p }); },
  meteor: (t, d, q, k, p) => { rumble(t, d, .08 * k, { a: d * .8 }); riser(t, t + d, 200, 2500, .05 * k, { pan: p }); },
};
// 施放（t 是放出去的那一刻）
const CAST = {
  spiral: (t, q, k, p) => { whoosh(t, .35, 3200, 500, .09 * k, { pan: p }); thud(t, 120, 50, .25, .22 * k, { pan: p }); },
  heal: (t, q, k, p) => { arp(t, [deg(q.d), deg(q.d + 2), deg(q.d + 4), deg(q.d + 5)].map(m => m + 12), .03, (tt, m) => bell(tt, m, .9, .06 * k, { pan: p })); thud(t, 150, 90, .08, .08 * k, { pan: p }); },
  fire: (t, q, k, p) => { whoosh(t, .5, 200, 1800, .12 * k, { q: .8, pan: p }); crackle(t, .7, 1200, .1 * k, { pan: p }); thud(t, 100, 45, .3, .25 * k, { pan: p }); },
  frost: (t, q, k, p) => { nz(t, .06, 'highpass', 3000, .5, .14 * k, { pan: p }); for (let i = 0; i < 8; i++) ring(t + rnd(0, .12), rnd(2400, 5200), .35, .03 * k, { parts: [[1, 1], [2.3, .5], [3.9, .3]], pan: p + rnd(-.4, .4) }); thud(t, 180, 90, .1, .12 * k, { pan: p }); },
  bolt: (t, q, k, p) => thunder(t, k),
  shield: (t, q, k, p) => { thud(t, 150, 70, .45, .2 * k, { pan: p }); fm(t, hz(q.d), .8, .05 * k, { r: 2, i: 1.5, itau: .4, rev: .5, pan: p }); tone(t, 'sine', hz(q.d, -1), .7, .05 * k, { vib: [9, 25, .02], pan: p }); },
  summon: (t, q, k, p) => { arp(t, [deg(q.d), deg(q.d + 2), deg(q.d + 4)], .05, (tt, m) => fm(tt, mtof(m), .8, .04 * k, { r: 3, i: 1, rev: .5, pan: p })); thud(t + .15, 100, 45, .35, .28 * k, { pan: p }); tone(t, 'sine', hz(q.d, -2), .6, .08 * k, { to: hz(q.d, -1), pan: p }); },
  poison: (t, q, k, p) => { nz(t, .7, 'bandpass', 2500, .6, .1 * k, { to: 900, a: .03, pan: p }); for (let i = 0; i < 10; i++) blip(t + rnd(0, .6), rnd(250, 700), .05 * k, { pan: p + rnd(-.5, .5) }); },
  blade: (t, q, k, p) => { tone(t, 'sine', 2200, .22, .03 * k, { to: 700, pan: p }); whoosh(t + .2, .1, 1500, 5000, .08 * k, { pan: p }); ring(t + .24, 2400, .4, .06 * k, { parts: [[1, 1], [1.6, .5], [2.9, .3]], pan: p }); thud(t + .24, 130, 55, .15, .2 * k, { pan: p }); },
  buff: (t, q, k, p) => { whoosh(t, .5, 300, 5000, .1 * k, { pan: p }); choir(t, [deg(q.d, -1), deg(q.d + 2, -1), deg(q.d + 4, -1)], .9, .035 * k, { a: .05, dark: q.minor, pan: p }); },
  shadow: (t, q, k, p) => { thud(t, 80, 35, .5, .3 * k, { pan: p }); nz(t, .5, 'bandpass', 700, 2, .1 * k, { to: 200, pan: p }); tone(t, 'sine', hz(q.d, -1), .7, .06 * k, { to: hz(q.d - 3, -2), pan: p }); },
  beam: (t, q, k, p) => { tone(t, 'sawtooth', hz(q.d, 1), .5, .04 * k, { to: hz(q.d, 0), lp: 3000, vib: [30, 40, .02], pan: p }); tone(t, 'p25', hz(q.d, 1), .45, .025 * k, { crush: 1, pan: p }); nz(t, .45, 'highpass', 3000, .5, .05 * k, { pan: p }); thud(t, 130, 60, .2, .15 * k, { pan: p }); },
  coin: (t, q, k, p) => coins(t, 8, .035 * k, { gap: .035 }),
  nova: (t, q, k, p) => { thud(t, 110, 40, .45, .35 * k, { pan: p }); nz(t, .5, 'lowpass', 3500, .7, .18 * k, { to: 150, pan: p }); whoosh(t, .45, 3000, 400, .06 * k, { pan: p }); },
  meteor: (t, q, k, p) => { tone(t, 'sine', 1800, .45, .03 * k, { to: 300 }); whoosh(t, .45, 4000, 300, .08 * k, { peak: .9, pan: p }); thud(t + .45, 75, 28, .9, .5 * k, { pan: p }); nz(t + .45, .8, 'lowpass', 2200, .7, .3 * k, { to: 80, rev: .4 }); rumble(t + .5, .9, .15 * k); },
};
const LAND = { blade: .24, meteor: .45 };
S.PATTERNS = Object.keys(CAST);
// phase: 'charge' | 'cast'；tier 0~3 越高越重；pan -1~1（按单位在屏幕上的位置）
def('skillFx', 1, (t, phase, pat, pal, tier, dur, pan) => {
  const q = palOf(pal), k = .65 + .2 * Math.max(0, Math.min(3, tier || 0)), p = Math.max(-.8, Math.min(.8, pan || 0));
  if (phase === 'charge') { const d = Math.max(.25, dur || .5); (CHARGE[pat] || CHARGE.spiral)(t, d, q, k, p); tex(t + d * .6, q.mat, .35 * k, q.d, p); }
  else { (CAST[pat] || CAST.nova)(t, q, k, p); tex(t + (LAND[pat] || 0), q.mat, k, q.d, p); if ((tier || 0) >= 3) { duck(t, .5, .8); cymbal(t, 1.2, .04); } }
}, 40);
def('skill', 1, (t, ch, cs, pal, o) => { o = o || {}; const d = o.dur || .6; S.skillFx('charge', ch, pal, o.tier || 1, d, o.pan); setTimeout(() => S.skillFx('cast', cs, pal, o.tier || 1, 0, o.pan), d * 1000); }, 60);
reg('技能', ['skillFx', 'skill']);

// ═════════ 角色关键帧（重做后的角色在自己的动画关键帧上调用）═════════
// charFx(事件, 参数)：step / swing / hit / shoot / charge / release / impact / hurt / death / fall
const BODY = {
  flesh: (t, w, p) => { thud(t, 150 - 50 * w, 70, .1, .14 + .1 * w, { pan: p }); nz(t, .05, 'bandpass', 1300, 1, .08, { pan: p }); },
  armor: (t, w, p) => { ring(t, 1500 - 500 * w, .25, .06, { parts: [[1, 1], [2.3, .4]], pan: p }); thud(t, 160, 80, .08, .1 + .08 * w, { pan: p }); },
  stone: (t, w, p) => { thud(t, 120, 60, .12, .18 + .1 * w, { pan: p }); for (let i = 0; i < 3; i++) nz(t + i * .025, .03, 'bandpass', rnd(1500, 3000), 2, .05, { pan: p }); },
  ghost: (t, w, p) => { tone(t, 'sine', 900, .25, .04, { to: 500, vib: [8, 60, .02], pan: p, rev: .5 }); nz(t, .15, 'bandpass', 2000, 4, .04, { pan: p }); },
  beast: (t, w, p) => { thud(t, 130 - 40 * w, 60, .12, .16 + .1 * w, { pan: p }); tone(t, 'sawtooth', 160 - 60 * w, .18, .03, { to: 90, lp: 900, pan: p }); },
  machine: (t, w, p) => { ring(t, 900, .2, .05, { parts: [[1, 1], [2.9, .4]], pan: p }); tone(t, 'square', 120, .1, .03, { crush: 1, pan: p }); },
};
def('charFx', 0, (t, ev, o) => {
  o = o || {}; const w = Math.max(0, Math.min(1, o.w == null ? .5 : o.w)), p = o.pan || 0;
  switch (ev) {
    case 'step': step(t, .03 + .05 * w, { pan: p }); break;
    case 'swing': atk(t, o.kind || 'slash', p, w); break;
    case 'shoot': atk(t, o.proj === 'bullet' ? 'gun' : o.proj === 'orb' ? 'staff' : 'bow', p, w); break;
    case 'hit': (o.mat === 'metal' ? BODY.armor : o.mat === 'stone' ? BODY.stone : o.mat === 'magic' ? BODY.ghost : BODY.flesh)(t, w, p); break;
    case 'charge': S.skillFx('charge', o.style || 'spiral', o.pal, 1 + 2 * w, o.dur, p); break;
    case 'release': S.skillFx('cast', o.style || 'nova', o.pal, 1 + 2 * w, 0, p); break;
    case 'impact': tex(t, palOf(o.pal).mat, .6 + .6 * w, palOf(o.pal).d, p); thud(t, 110, 45, .25, .15 + .2 * w, { pan: p }); break;
    case 'hurt': (BODY[o.body] || BODY.flesh)(t, w, p); break;
    case 'death': ({ shatter: () => S.shatter(), dissolve: () => S.soul(p), explode: () => S.boom() }[o.how] || (() => kill(t, .8, p)))(); break;
    case 'fall': thud(t, 110 - 40 * w, 45, .2, .12 + .15 * w, { pan: p }); nz(t, .12, 'lowpass', 900, .7, .06 + .06 * w, { pan: p }); break;
  }
});
reg('角色关键帧', ['charFx']);

// ═════════ 支援道具（先转盘定品质，再放；品质 0~3）═════════
const ITEM = {
  storm: (t, q) => { for (let i = 0; i <= q; i++) thunder(t + i * .22, .6 + q * .2); },
  candle: (t, q) => { choir(t, [deg(0), deg(2), deg(4), deg(7)], 1.2 + q * .3, .035 + q * .01, { a: .1 }); S.heal(); if (q >= 3) arp(t + .4, [84, 89, 93, 96], .08, (tt, m) => bell(tt, m, 1, .07)); },
  frame: (t, q) => { tone(t, 'sine', 700, 1.2, .04, { to: 1400, vib: [6, 80, .1], a: .2, rev: .8 }); nz(t, 1, 'bandpass', 1500, 5, .04, { a: .4, to: 2500, rev: .7 }); if (q >= 3) { thud(t + .6, 70, 30, .8, .4); choir(t + .5, [50, 51, 57], 1.4, .04, { dark: 1 }); } },
  bell: (t, q) => { for (let i = 0; i <= Math.min(2, q); i++) ring(t + i * .35, mtof(62 - i * 5), 2, .09, { parts: [[1, 1], [2.01, .5], [2.76, .35], [5.4, .2]], rev: .7 }); },
  dice: (t, q) => { for (let i = 0; i < 10; i++) nz(t + i * .045 + rnd(0, .02), .025, 'bandpass', rnd(1500, 3000), 2, .07); thud(t + .5, 200, 110, .06, .12); thud(t + .6, 200, 110, .06, .1); arp(t + .7, Array.from({ length: 2 + q }, (_, i) => deg(7 + i * 2)), .06, (tt, m) => tone(tt, 'p25', mtof(m), .1, .045, { crush: 1 })); },
};
def('itemUse', 2, (t, k, q) => { q = Math.max(0, Math.min(3, q | 0)); (ITEM[k] || ITEM.dice)(t, q); if (q >= 2) duck(t, .5, 1); }, 300);
reg('支援道具', ['itemUse']);

// ═════════ 守城 ═════════
const WEAPON = {
  bolt: (t, p) => { tone(t, 'triangle', 110, .12, .08, { to: 80, pan: p }); nz(t, .03, 'bandpass', 2000, 1.5, .1, { pan: p }); whoosh(t + .02, .2, 2000, 4500, .04, { pan: p }); },
  shell: (t, p) => { thud(t, 90, 35, .5, .4, { pan: p }); nz(t, .4, 'lowpass', 1800, .7, .25, { to: 150, pan: p }); tone(t + .1, 'sine', 2400, .5, .02, { to: 800 }); },
  chain: (t, p) => { for (let i = 0; i < 3; i++) { tone(t + i * .07, 'sawtooth', 1200 - i * 250, .08, .05, { to: 300, crush: 1, pan: p }); crackle(t + i * .07, .1, 3000, .07, { pan: p }); } },
  arcane: (t, p) => { fm(t, hz(9), .35, .06, { r: 1.5, i: 4, to: hz(4), itau: .2, pan: p, rev: .4 }); nz(t, .2, 'highpass', 5000, .5, .03, { pan: p }); },
  colossus: (t, p) => { riser(t, t + .35, 300, 3000, .08); tone(t + .35, 'sawtooth', 180, .7, .06, { to: 90, lp: 1600, vib: [40, 30, .01] }); thud(t + .35, 80, 30, .6, .4); nz(t + .35, .6, 'lowpass', 2000, .7, .2, { to: 120 }); },
  zeus: (t, p) => { thunder(t, 1.3); ring(t, 1300, .6, .04, { pan: p }); },
  terracotta: (t) => { for (let i = 0; i < 10; i++) step(t + i * .14, .06, { pan: rnd(-.7, .7) }); brass(t, 53, .8, .04, { bright: 1400 }); brass(t, 60, .8, .035, { bright: 1400 }); },
  temple: (t) => { ring(t, 110, 3, .1, { parts: [[1, 1], [2.01, .5], [2.76, .35], [5.4, .2], [8.9, .1]], rev: .8 }); choir(t + .2, [41, 48, 53], 2.2, .03, { dark: 1, a: .6 }); },
};
def('weapon', 0, (t, k, p) => (WEAPON[k] || WEAPON.bolt)(t, p || 0), 60);
def('wallHit', 0, (t) => { thud(t, 100, 50, .2, .25); nz(t, .12, 'bandpass', 700, 1.2, .12); nz(t + .03, .08, 'bandpass', 2500, 2, .05); }, 90);
reg('守城', ['weapon', 'wallHit', 'raidWin', 'rankStamp', 'portalCollapse']);

// ═════════ 奇遇小游戏（28 个，每个一组：动作 / 成功 / 失败 / 特殊）═════════
function cheer(t, dur, pk) { for (let i = 0; i < 4; i++) nz(t + i * .04, dur, 'bandpass', [700, 1100, 1600, 2400][i], 2, pk, { a: dur * .3, hold: dur * .3, pan: rnd(-.6, .6) }); for (let i = 0; i < 3; i++) tone(t + rnd(.1, dur * .6), 'sine', rnd(1800, 2600), .35, pk * .5, { to: rnd(2800, 3400), pan: rnd(-.7, .7) }); }
function fiddle(t, m, dur, pk) { tone(t, 'sawtooth', mtof(m), dur, pk, { a: .05, hold: dur * .6, lp: 2800, vib: [5.5, 18, .12], rev: .45 }); nz(t, dur * .6, 'bandpass', 3000, 2, pk * .15, { a: .03 }); }
function grind(t, dur, pk) { nz(t, dur, 'bandpass', 300, 2, pk, { src: 'brown', a: .05, hold: dur * .6 }); for (let i = 0; i < 4; i++) nz(t + i * dur / 4, .02, 'bandpass', 1800, 3, pk * .5); }
const win = (t, big) => big ? fanfare(t, .8) : S.up(2), sad = (t) => { tone(t, 'triangle', hz(4, -1), .25, .08, { to: hz(2, -1) }); tone(t + .2, 'triangle', hz(0, -1), .5, .07); };
const MINI = {
  _: { start: (t) => { arp(t, [deg(5), deg(7), deg(9), deg(12)], .05, (tt, m) => tone(tt, 'p25', mtof(m), .08, .035, { crush: 1 })); whoosh(t, .3, 600, 2400, .05); }, pay: (t) => S.coin(), battle: (t) => { S.boom(); timp(t, 38, .35); }, buff: (t) => S.mult(),
    // ── 小玩法的表演（动效那边的 mc-show.js 调用）──
    // 听牌：x = 1 普通、2 超级
    reach: (t, x) => { const sup = (x | 0) >= 2, L = sup ? 2 : 1.3; [60, 64, 67, 70].forEach(m => brass(t, m + (sup ? 12 : 0), sup ? .45 : .3, sup ? .05 : .04, { bright: 3800 })); bell(t, sup ? 96 : 89, .8, .09); riser(t + .1, t + L, 300, sup ? 7000 : 4000, sup ? .1 : .06); tone(t + .1, 'sawtooth', hz(0, -2), L, .03, { to: hz(0, -1), a: L * .8, lp: 1200 }); if (sup) { for (let i = 0; i < 16; i++) timp(t + .3 + i * (L - .4) / 16, 36 + (i % 2) * 5, .08 + i * .012); choir(t + .2, [60, 64, 67, 72], L, .04, { a: .6 }); duck(t, .6, L + .4); } },
    // 心跳：x = 紧张度 0~1，越紧越响越高（快慢由调用方决定）
    heart: (t, x) => { const k = Math.max(0, Math.min(1, x || 0)); thud(t, 60 + 25 * k, 38, .2, .3 + .2 * k); thud(t + .15 - .04 * k, 54 + 20 * k, 35, .18, .2 + .15 * k); },
    // 最后几格慢慢走：x = 第几格，音一格比一格高
    crawl: (t, x) => { const i = x | 0; tone(t, 'p25', hz(5 + i, 0), .06, .045, { crush: 1, lp: 5000 }); nz(t, .015, 'bandpass', 2600 + i * 150, 3, .07); },
    // 差一点：短
    near: (t) => { bell(t, deg(9), .25, .08); bell(t + .1, deg(7) - 1, .45, .07); thud(t, 150, 90, .06, .08); },
    // 普通没中：很短、很轻
    lose: (t) => tone(t, 'triangle', hz(2, -1), .12, .04, { to: hz(0, -1) }),
    // 中奖四档：小中、中、大赢、大奖（最长、最隆重）
    win1: (t) => { arp(t, [deg(5), deg(7), deg(9)], .06, (tt, m) => bell(tt, m, .5, .08)); coins(t + .12, 3, .025); },
    win2: (t) => { arp(t, [deg(5), deg(7), deg(9), deg(12)], .06, (tt, m) => bell(tt, m, .7, .09)); [53, 60, 65, 69].forEach(m => brass(t + .24, m, .35, .035)); coins(t + .2, 6, .03); sparkleAt(t + .25, 4, .02); },
    win3: (t) => { duck(t, .7, 1.8); fanfare(t, 1); coins(t + .3, 14, .03, { gap: .035 }); sparkleAt(t + .4, 8, .025); },
    win4: (t) => { duck(t, .85, 3.2); riser(t, t + .2, 600, 6000, .12); const B = t + .2; thud(B, 80, 28, 1, .5); cymbal(B, 2.6, .08); nz(B, .3, 'highpass', 2500, .5, .14); choir(B, [65, 69, 72, 77], 2.4, .05, { a: .05 }); coins(B + .05, 12, .03, { gap: .025 }); const f = t + .6; [[0, 72, .14], [.16, 77, .14], [.32, 79, .14], [.48, 81, 1.2]].forEach(([d, m, len]) => brass(f + d, m, len, .065, { bright: 4400 })); [53, 60, 65, 69, 72].forEach(m => brass(f + .48, m, 1.3, .045)); timp(f + .48, 41, .5); cymbal(f + .48, 2.2, .06); coins(f + .5, 24, .03, { gap: .03 }); sparkleAt(f + .6, 12, .025); arp(f + 1.3, [84, 89, 93, 96, 101], .07, (tt, m) => bell(tt, m, 1.2, .07)); },
    // 计数器往上滚一下：x = 0~1 进度
    roll: (t, x) => tone(t, 'p25', hz(Math.round(Math.max(0, Math.min(1, x || 0)) * 12), 0), .03, .035, { crush: 1, lp: 5000 }),
    // 评级章 / 大奖字砸下
    stamp: (t) => { thud(t, 110, 40, .45, .45); nz(t, .12, 'lowpass', 1800, .7, .3); bell(t + .01, deg(12), .6, .07); },
    // 揭晓前的光：x = 品质 0~3
    omen: (t, x) => { const q = Math.max(0, Math.min(3, x | 0)); riser(t, t + .6, 800, 2500 + q * 1500, .03 + q * .015); tone(t, 'sine', hz(5 + q * 2, 0), .8, .02 + q * .01, { a: .3, vib: [6, 20, .2], rev: .5 }); if (q >= 2) sparkleAt(t + .2, q + 1, .018); },
    // 光升一档：白光一闪、颜色升一档；x = 升到的品质
    promote: (t, x) => { const q = Math.max(0, Math.min(3, x | 0)); nz(t, .12, 'highpass', 4000, .5, .08); tone(t, 'sine', hz(5 + q * 2, 0), .3, .05, { to: hz(9 + q * 2, 1), slide: .12 }); bell(t + .1, deg(9 + q * 2), .8, .08 + q * .02); if (q >= 3) ring(t + .1, mtof(deg(14)), 1.2, .05, { rev: .6 }); },
    // 连击：x = 连击数，一下比一下高
    combo: (t, x) => { const n = Math.max(1, x | 0); tone(t, 'p25', hz(Math.min(14, 4 + n), 0), .07, .045, { crush: 1, lp: 5000 }); nz(t, .03, 'bandpass', 2000 + n * 120, 1.5, .06); if (n % 5 === 0) bell(t, deg(Math.min(16, 7 + n / 5 * 2)), .5, .06); },
    // 连击进入狂热
    fever: (t) => { duck(t, .6, 1.4); riser(t, t + .35, 400, 6000, .1); for (let i = 0; i < 6; i++) nz(t + i * .05, .06, 'bandpass', 1900, .7, .1 + i * .02); [60, 64, 67, 72].forEach(m => brass(t + .35, m, .5, .045, { bright: 4200 })); },
  },
  mine: { pick: (t) => S.dig(), loosen: (t, x) => { tone(t, 'sawtooth', 60, .5, .03 + .03 * (x || 0), { lp: 500, vib: [18, 50, .02] }); for (let i = 0; i < 2 + 4 * (x || 0); i++) nz(t + rnd(0, .5), .03, 'bandpass', rnd(1500, 3000), 2, .04, { pan: rnd(-.5, .5) }); }, gem: (t) => { ring(t, 2600, .9, .07, { parts: [[1, 1], [2.7, .5], [4.2, .3]], rev: .5 }); sparkleAt(t + .05, 4, .025); S.coin(); }, cavein: (t) => { rumble(t, 1.4, .3, { f: 220 }); for (let i = 0; i < 14; i++) nz(t + rnd(0, 1), .06, 'bandpass', rnd(600, 2500), 1.5, .08, { pan: rnd(-.8, .8) }); thud(t + .3, 70, 28, 1, .45); } },
  roulette: { spin: (t) => whoosh(t, .6, 400, 1600, .06), click: (t) => { nz(t, .01, 'bandpass', 3800 * [1, .9, 1.1][VARI], 3, .06); if (Math.random() < .3) tone(t, 'sine', 5200, .02, .01); }, bet: (t) => { for (let i = 0; i < 3; i++) nz(t + i * .05, .02, 'bandpass', 2600, 2, .08); }, gold: (t) => { win(t, 1); coins(t + .3, 10, .03); }, win: (t) => win(t), skull: (t) => { S.hitAt(0, 1.5); S.lose(); }, miss: (t) => S.reelStop() },
  fruit: { gogo: (t) => { ring(t, 1760, 2.4, .1, { parts: [[1, 1], [2.01, .45], [3, .2], [4.2, .1]], rev: .6 }); tone(t, 'sine', 3520, 1.6, .02, { a: .02, vib: [6, 12, .3] }); }, lever: (t) => S.lever(), spin: (t) => { for (let i = 0; i < 20; i++) nz(t + i * .045, .012, 'bandpass', 2400, 3, .05); tone(t, 'sawtooth', 90, .9, .015, { lp: 500 }); }, stop: (t, i) => { S.reelStop(); tone(t, 'p25', hz(5 + (i | 0) * 2), .08, .04, { crush: 1 }); }, jackpot: (t) => { fanfare(t, 1); coinRun(t + .3, 8, .045); }, win: (t) => S.up(2), skulls: (t) => { S.hitAt(0, 1.5); S.lose(); }, nomatch: (t) => sad(t) },
  claw: { move: (t) => tone(t, 'sawtooth', 110, .35, .02, { to: 130, lp: 700, vib: [30, 20, .01] }), drop: (t) => tone(t, 'sawtooth', 160, .6, .02, { to: 80, lp: 600 }), grab: (t) => { ring(t, 900, .2, .06, { parts: [[1, 1], [2.3, .4]] }); thud(t, 180, 100, .06, .1); }, lift: (t) => tone(t, 'sawtooth', 80, .6, .02, { to: 170, lp: 700 }), prize: (t) => { win(t, 1); S.pop(); }, slip: (t) => { tone(t, 'sine', 600, .4, .06, { to: 150 }); thud(t + .4, 130, 70, .1, .12); }, empty: (t) => { ring(t, 800, .15, .04); sad(t + .15); }, bounce: (t) => S.pop() },
  pachinko: { launch: (t) => { S.boing(); nz(t + .1, .3, 'bandpass', 1800, 1.5, .03, { to: 900 }); }, peg: (t, row) => { const r = row | 0; ring(t, mtof(deg(14 - r, 0)), .18, .04, { parts: [[1, 1], [2.9, .3]], pan: rnd(-.6, .6) }); }, slot: (t) => { S.land(2); }, edge: (t) => { S.up(3); coins(t + .2, 8, .03); } },
  tree: { curse: (t) => { fm(t, hz(-4, -1), .45, .06, { r: 1.414, i: 3, itau: .2, rev: .4 }); tone(t, 'sine', hz(1, 0) * 1.06, .3, .025, { vib: [9, 60, .02] }); nz(t, .25, 'bandpass', 900, 4, .04); }, pick: (t) => { nz(t, .25, 'highpass', 3000, .5, .06, { a: .05 }); nz(t + .2, .03, 'bandpass', 1400, 2, .1); bell(t + .25, deg(9), .6, .07); }, water: (t) => { nz(t, .5, 'bandpass', 1200, 1, .06, { to: 500 }); arp(t + .3, [deg(5), deg(7), deg(9)], .08, (tt, m) => bell(tt, m, .6, .05)); }, cut: (t) => { thud(t, 160, 90, .1, .2); nz(t, .08, 'bandpass', 900, 1.5, .12); S.creak(); }, grow: (t) => arp(t, [deg(0), deg(2), deg(4), deg(7), deg(9)], .1, (tt, m) => bell(tt, m, .7, .05)), fruit: (t) => S.up(2) },
  tarot: { lift: (t) => { whoosh(t, .35, 400, 1600, .04, { peak: .7 }); tone(t, 'sine', hz(5), .6, .03, { to: hz(9), slide: .4, a: .1, rev: .6 }); }, shuffle: (t) => { for (let i = 0; i < 12; i++) nz(t + i * .03, .025, 'bandpass', 3500 * V(.2), 1.5, .05); }, flip: (t) => { nz(t, .05, 'bandpass', 3000, 1.2, .08); whoosh(t, .15, 1200, 3500, .03); }, good: (t) => { arp(t, [deg(0), deg(2), deg(4), deg(7)].map(m => m + 12), .08, (tt, m) => bell(tt, m, 1, .08)); S.sparkle(); }, bad: (t) => { bell(t, 62, 1.2, .09); bell(t + .02, 63, 1.2, .07); padc(t, [50, 51, 56], 1.5, .02, { lp: 700 }); } },
  // 砸金蛋：hammer 在锤子落下的那一帧调用，声音不能晚
  eggs: { hammer: (t) => { ring(t, 1800 * [1, .92, 1.08][VARI], .4, .08, { parts: [[1, 1], [2.4, .5], [3.8, .3]] }); thud(t, 150, 70, .1, .2); nz(t, .03, 'bandpass', 2500, 1.2, .06); }, crack: (t) => { for (let i = 0; i < 5; i++) nz(t + i * .025, .02, 'highpass', 3000, .7, .08); S.shatter(); }, prize: (t) => { S.up(3); coins(t + .1, 10, .03); }, snake: (t) => { nz(t, .6, 'highpass', 4500, .6, .08, { a: .05 }); S.hitAt(0, 1.2); } },
  dice: { shake: (t) => { for (let i = 0; i < 10; i++) nz(t + i * .045 + rnd(0, .015), .02, 'bandpass', rnd(1800, 3000), 2, .07); }, roll: (t) => whoosh(t, .2, 900, 2400, .04), clack: (t) => { nz(t, .02, 'bandpass', 1900 * [1, .85, 1.15][VARI], 2.5, .07); thud(t, 230, 130, .03, .06); }, win: (t) => S.up(2), lose: (t) => sad(t), tie: (t) => tone(t, 'p25', hz(5), .1, .03, { crush: 1 }) },
  fate: { cost: (t) => { nz(t, .2, 'lowpass', 900, 1, .14); S.heart(); }, spin: (t) => grind(t, 1.8, .12), click: (t) => { nz(t, .015, 'bandpass', 2500 * [1, .92, 1.08][VARI], 3, .08); thud(t, 180, 110, .03, .05); }, stop: (t) => { thud(t, 120, 50, .3, .35); ring(t + .02, mtof(deg(0, -1)), 2.2, .08, { parts: [[1, 1], [2.01, .5], [2.76, .35], [5.4, .2]], rev: .6 }); } },
  musician: { note: (t, i) => fiddle(t, deg(i | 0, 0), .45, .05), metro: (t) => nz(t, .015, 'bandpass', 2600, 5, .09), miss: (t) => { tone(t, 'sawtooth', 190, .25, .05, { to: 170, lp: 2500, vib: [23, 120, .01] }); nz(t, .2, 'bandpass', 3500, 3, .04); }, great: (t) => { fiddle(t, deg(7), .3, .05); fiddle(t + .3, deg(9), .3, .05); fiddle(t + .6, deg(12), .8, .06); cheer(t + .6, 1.2, .025); }, ok: (t) => { fiddle(t, deg(5), .3, .05); fiddle(t + .3, deg(7), .6, .05); }, poor: (t) => { fiddle(t, deg(4), .3, .04); fiddle(t + .3, deg(2), .6, .04); } },
  granny: { stitch: (t, i) => { nz(t, .025, 'bandpass', 4200, 3, .07); tone(t + .02, 'sine', hz(5 + (i | 0), 1), .06, .025, { to: hz(6 + (i | 0), 1) }); }, miss: (t) => tone(t, 'triangle', 180, .15, .06, { to: 120 }), done: (t) => S.heal() },
  well: { charge: (t, x) => tone(t, 'p25', hz(Math.round((x || 0) * 10)), .04, .03, { crush: 1 }), toss: (t) => { ring(t, 3300, .1, .05, { parts: [[1, 1], [1.5, .5]] }); whoosh(t, .5, 1200, 3000, .04); }, splash: (t) => { nz(t, .2, 'bandpass', 1400, 1, .1, { to: 500, rev: .8 }); blip(t + .05, 700, .06, { rev: .9 }); blip(t + .5, 600, .03, { rev: .9 }); }, great: (t) => S.fanfare(), ok: (t) => arp(t, [deg(4), deg(7)], .15, (tt, m) => bell(tt, m, 1, .06, { rev: .9 })), miss: (t) => { ring(t, 2800, .15, .04); sad(t + .1); } },
  child: { step: (t, i) => { step(t, .05); bell(t + .02, deg(5 + (i | 0)), .5, .05, { rev: .6 }); }, wrong: (t) => { thud(t, 110, 60, .15, .15); sad(t + .05); }, lost: (t) => { nz(t, 1.5, 'bandpass', 500, 2, .06, { a: .5, src: 'brown' }); S.hitAt(0, 1); }, found: (t) => { [53, 57, 60, 64].forEach(m => ep(t, m, 1.4, .06)); bell(t + .3, deg(12), 1.2, .07); } },
  grave: { lid: (t) => { thud(t, 140, 60, .2, .3); nz(t, .08, 'bandpass', 900, 1.2, .16); tone(t + .05, 'sawtooth', 70, .5, .045, { lp: 700, vib: [23, 60, .02], a: .05 }); nz(t + .05, .45, 'bandpass', 380, 10, .08, { to: 650, a: .05 }); nz(t + .1, .6, 'lowpass', 1500, .7, .05, { a: .1 }); }, dig: (t) => { nz(t, .18, 'lowpass', 600, .7, .22); thud(t, 110, 60, .1, .15); }, candle: (t) => nz(t, .4, 'bandpass', 900, 1, .02, { a: .1 }), coffin: (t) => { thud(t, 150, 100, .15, .25); ring(t, 260, .4, .04); }, hand: (t) => { thud(t, 70, 30, .7, .45); tone(t, 'sawtooth', 700, .6, .04, { to: 1400, vib: [9, 80, .01], lp: 3000 }); }, out: (t) => tone(t, 'sine', 90, .6, .1, { to: 60 }), treasure: (t) => S.chest() },
  clinic: { pick: (t) => ring(t, 2200 * V(.1), .25, .05, { parts: [[1, 1], [2.3, .4]] }), drink: (t) => { for (let i = 0; i < 4; i++) blip(t + i * .09, 350, .07); }, good: (t) => S.heal(), bad: (t) => { padc(t, [50, 51, 55], 1, .025, { lp: 600 }); tone(t, 'sawtooth', 220, .5, .04, { to: 160, vib: [7, 60, .05], lp: 1200 }); }, mult: (t) => S.mult() },
  mirror: { tone: (t, i) => { const m = [deg(0), deg(2), deg(4), deg(7)][(i | 0) % 4] + 12; ring(t, mtof(m), .6, .06, { parts: [[1, 1], [2.01, .3], [3, .15]], rev: .5 }); }, wrong: (t) => S.shatter(), pass: (t) => S.up(2) },
  altar: { pour: (t, x) => { const k = x || 0; blip(t, 400 + 700 * k, .06); nz(t, .1, 'lowpass', 900, 1, .05); }, flicker: (t) => nz(t, .3, 'bandpass', 800, 1, .03, { a: .1 }), out: (t) => { nz(t, .4, 'highpass', 3000, .5, .08, { to: 6000 }); tone(t, 'sine', 120, .8, .12, { to: 70 }); padc(t + .1, [50, 51, 56], 1.2, .02, { lp: 600 }); }, win: (t) => S.mult() },
  peddler: { shuffle: (t) => { for (let i = 0; i < 6; i++) nz(t + i * .09, .07, 'bandpass', 900 * V(.2), 1.5, .06, { pan: i % 2 ? .4 : -.4 }); }, lift: (t) => { nz(t, .05, 'bandpass', 1100, 1.5, .08); bell(t + .05, deg(7), .5, .06); }, win: (t) => win(t, 1), lose: (t) => S.lose() },
  spring: { zone: (t) => { bell(t, deg(7), .5, .07); bell(t + .06, deg(9), .6, .06); blip(t, 900, .03); }, bubble: (t) => { for (let i = 0; i < 3; i++) blip(t + rnd(0, .3), rnd(300, 700), .04); }, tick: (t, x) => tone(t, 'p25', hz(Math.round((x || 0) * 10)), .03, .025, { crush: 1 }), good: (t) => S.heal(), hot: (t) => { nz(t, .6, 'highpass', 3000, .5, .1, { a: .05 }); S.hitAt(0, 1); }, cool: (t) => { nz(t, .3, 'bandpass', 1000, 1, .07, { to: 400 }); sad(t + .1); } },
  trap: { step: (t) => step(t, .07), num: (t, n) => tone(t, 'p25', hz(n | 0), .07, .04, { crush: 1 }), boom: (t) => { S.boom(); thud(t, 60, 25, .8, .45); }, box: (t) => S.chest() },
  cat: { wave: (t) => { [0, .08].forEach(d => ring(t + d, 3000 + d * 2000, .5, .04, { parts: [[1, 1], [2.3, .4]] })); }, coin: (t) => S.coin(), bar: (t) => { coinRun(t, 3, .06); ring(t + .15, mtof(deg(12)), .8, .06, { parts: [[1, 1], [2.1, .5], [3.2, .3]] }); }, bomb: (t) => S.boom(), miss: (t) => thud(t, 180, 110, .05, .06) },
  market: { grab: (t, g) => { g = Math.max(1, Math.min(3, g | 0)); whoosh(t, .12, 900, 4000, .06); nz(t + .02, .05, 'bandpass', 3000, 1.2, .08); thud(t + .05, 110, 40, .35, .3 + .05 * g); nz(t + .05, .1, 'lowpass', 1800, .7, .22); arp(t + .08, [deg(7), deg(9), deg(12)].slice(0, g), .06, (tt, m) => bell(tt, m, .6, .07)); if (g >= 3) sparkleAt(t + .25, 6, .022); }, swing: (t) => nz(t, .015, 'bandpass', 3000, 4, .05), stamp: (t) => S.stamp(), deal: (t) => { S.buy(); }, miss: (t) => sad(t) },
  trainer: { bell: (t) => { [0, .18].forEach(d => ring(t + d, 980, 1.4, .09, { parts: [[1, 1], [2.76, .5], [5.4, .25], [8.93, .12]], rev: .4 })); }, punch: (t, i) => { const k = Math.min(1, (i | 0) / 10); thud(t, 140 + 60 * k, 60, .12, .25 + .1 * k); nz(t, .06, 'lowpass', 1200, .8, .15); if (k > .5) tone(t, 'p25', hz(Math.round(k * 12)), .05, .03, { crush: 1 }); }, done: (t) => S.up(3) },
  statue: { eyes: (t) => { riser(t, t + .35, 500, 3500, .05); tone(t, 'sine', hz(0, -1), .6, .05, { a: .3 }); tone(t, 'sine', hz(7, 1), .5, .02, { a: .25, vib: [6, 20, .1], rev: .6 }); }, turn: (t) => { grind(t, .4, .1); nz(t + .38, .02, 'bandpass', 2000, 3, .1); }, align: (t, i) => ring(t, mtof(deg(5 + (i | 0) * 2)), 1.2, .06, { parts: [[1, 1], [2.01, .4], [2.76, .3]], rev: .5 }), wake: (t) => { rumble(t, 1.6, .25); choir(t + .3, [41, 48, 53, 57], 2.2, .045, { a: .6 }); S.portal(); }, fail: (t) => { grind(t, .6, .08); sad(t + .4); } },
  arena: { ko: (t) => { duck(t, .6, 1.4); thud(t, 90, 30, .5, .5); [0, .2, .4].forEach(d => ring(t + .05 + d, 980, .7, .06, { parts: [[1, 1], [2.76, .5], [5.4, .25]] })); }, open: (t) => { cheer(t, 1.5, .035); timp(t, 38, .3); }, roar: (t) => { tone(t, 'sawtooth', 110, .7, .07, { to: 70, lp: 900, vib: [11, 80, .05] }); nz(t, .6, 'bandpass', 700, 1.5, .1); }, cheer: (t) => cheer(t, .7, .03), bet: (t) => { for (let i = 0; i < 3; i++) nz(t + i * .05, .02, 'bandpass', 2600, 2, .08); }, hit: (t) => S.hitAt(rnd(-.4, .4), 1.3), win: (t) => { S.kill(); fanfare(t + .2, .9); }, lose: (t) => { S.kill(); sad(t + .3); } },
  camp: { fire: (t) => crackle(t, 1.5, 1300, .06, { a: .3 }), rest: (t) => { [53, 57, 60, 64].forEach(m => ep(t, m, 1.6, .05)); S.heal(); }, sharpen: (t) => { for (let i = 0; i < 3; i++) nz(t + i * .28, .22, 'bandpass', 4200, 3, .08, { a: .08, to: 6000 }); ring(t + .9, 3400, .5, .04); S.up(2); } },
  recruit: { curtain: (t) => { whoosh(t, .45, 300, 1500, .07, { q: .7 }); for (let i = 0; i < 3; i++) nz(t + .05 + i * .07, .05, 'bandpass', 1300, 1, .05); }, reveal: (t) => { S.land(2); arp(t + .05, [deg(4), deg(7), deg(9), deg(12)], .06, (tt, m) => bell(tt, m, .6, .06)); }, full: (t) => S.ui_no() },
};
S.MINI = MINI;
def('mini', 1, (t, g, ev, x) => { if (!S.lim('mini:' + g + '.' + ev, 20)) return; const G = MINI[g] || MINI._, f = G[ev] || MINI._[ev]; if (f) f(t, x); });   // 每个小游戏的每个事件各自限流
reg('小游戏', ['mini']);


// ═════════ 乐器库 ═════════
// 每件乐器 IN.x(t, 音高, 时值, 力度 0~1, 选项) 发一个音；选项 { pan, rev }。
// 全部合成：钢琴是带inharmonic的泛音叠加加琴槌声；竖琴、guitar、拨弦用 Karplus-Strong 拨弦（算好的波形按音高缓存）；
// 教堂钟按真钟的泛音结构（低八度的嗡声、小三度、五度……）；锣的高泛音比低泛音晚一点才涨起来。
const IN = S.inst = {};
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], LYD = [0, 2, 4, 6, 7, 9, 11], PHR = [0, 1, 3, 5, 7, 8, 10];
// 调里的第 d 级（0 起算，可以跨八度）
const dg = (root, d, mode) => { const M = mode || MAJ, n = M.length, o = Math.floor(d / n); return root + 12 * o + M[((d % n) + n) % n]; };
const chordOf = (root, degs, mode) => degs.map(d => dg(root, d, mode));
// 同一个演出每次轮换变体
const ROT = {}; const rot = (k, n) => (ROT[k] = ((ROT[k] == null ? -1 : ROT[k]) + 1) % n);
const AC = () => A();
function adsr(g, t, a, pk, d, s, dur, r) { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pk, t + a); if (d) g.gain.setTargetAtTime(pk * s, t + a, d); g.gain.setTargetAtTime(0, t + Math.max(dur, a + .01), r); }
function osc(type, f, t, end, o) {
  const ac = AC(), x = ac.createOscillator(); o = o || {};
  if (type === 'p12' || type === 'p25') x.setPeriodicWave(P.W()[type === 'p12' ? 'W12' : 'W25']); else x.type = type;
  x.frequency.setValueAtTime(f, t); if (o.from) { x.frequency.setValueAtTime(o.from, t); x.frequency.exponentialRampToValueAtTime(f, t + (o.glide || .05)); }
  if (o.det) x.detune.value = o.det;
  if (o.vib) { const v = ac.createOscillator(), vg = ac.createGain(); v.frequency.value = o.vib[0] * (1 + rnd(-.05, .05)); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(0, t + (o.vib[2] || .3) * .5); vg.gain.linearRampToValueAtTime(o.vib[1], t + (o.vib[2] || .3)); v.connect(vg); vg.connect(x.detune); v.start(t); v.stop(end); }
  x.start(t); x.stop(end); return x;
}
const bqf = (type, f, q, g) => { const b = P.biquad(type, f, q); if (g != null) b.gain.value = g; return b; };
function wire(src, nodes) { let n = src; nodes.forEach(x => { n.connect(x); n = x; }); return n; }
function noiseSrc(t, end, rate) { const s = AC().createBufferSource(); s.buffer = P.NOISE; s.loop = true; if (rate) s.playbackRate.value = rate; s.start(t, Math.random() * 1.5); s.stop(end); return s; }
const O = (o, rev) => Object.assign({ rev }, o || {});
// 一组正弦泛音 [倍数, 音量, 衰减秒]
function partials(t, f, list, pk, o, att) {
  const ac = AC(), sum = ac.createGain(); let end = t;
  list.forEach(([r, a, d, bloom]) => { const fr = f * r; if (fr > 16000) return; const g = ac.createGain(), at = bloom || att || .002; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + at); g.gain.setTargetAtTime(0, t + at, d / 3); const e = t + at + d * 1.6; end = Math.max(end, e); osc('sine', fr * (1 + rnd(-.0015, .0015)), t, e).connect(g); g.connect(sum); });
  const out = ac.createGain(); out.gain.value = pk; sum.connect(out); P.out(out, o, t, end); return end;
}
// Karplus-Strong：拨弦的波形，按（音高、亮度、衰减）缓存
const KSC = {};
function ksBuf(m, bright, dec, len) {
  const key = m + '|' + bright + '|' + dec + '|' + len; if (KSC[key]) return KSC[key];
  const ac = AC(), sr = ac.sampleRate, f = mtof(m), N = Math.max(2, Math.floor(sr / f - .5)), L = Math.floor(sr * len), b = ac.createBuffer(1, L, sr), d = b.getChannelData(0), r = new Float32Array(N);
  let lp = 0, mx = 0; for (let i = 0; i < N; i++) { lp += bright * ((Math.random() * 2 - 1) - lp); r[i] = lp; mx = Math.max(mx, Math.abs(lp)); }
  for (let i = 0; i < N; i++) r[i] /= mx || 1;
  let j = 0; for (let i = 0; i < L; i++) { const k = j + 1 === N ? 0 : j + 1; d[i] = r[j]; r[j] = dec * .5 * (r[j] + r[k]); j = k; }
  // 结尾 35% 慢慢收掉：低音还没衰减完时不会被一刀切断（用户：琴声停的时候很硬，突然就断了）
  const fl = Math.floor(L * .35); for (let i = L - fl; i < L; i++) d[i] *= .5 + .5 * Math.cos(Math.PI * (i - (L - fl)) / fl);
  return (KSC[key] = { b, rate: f / (sr / (N + .5)) });
}
function pluck(t, m, v, o, bright, dec, len, filters, pk) {
  const ac = AC(), k = ksBuf(m, bright, dec, len), s = ac.createBufferSource(); s.buffer = k.b; s.playbackRate.value = k.rate;
  const g = ac.createGain(); g.gain.value = pk * (v == null ? .7 : v); const last = wire(s, (filters || []).concat([g])); s.start(t); P.out(last, o, t, t + len); return t + len;
}

// ── 键盘 / 拨弦 ──
IN.piano = (t, m, dur, v, o) => {
  v = v == null ? .7 : v; const ac = AC(), f = mtof(m), base = Math.max(.6, 3.2 * Math.pow(.5, (m - 48) / 24)), end = t + Math.min(6, Math.max(dur, .1) + base * 1.5), sum = ac.createGain();
  for (let n = 1; n <= 8; n++) { const fn = f * n * Math.sqrt(1 + .0004 * n * n); if (fn > 12000) break; const a = Math.pow(n, -1.1) * (n > 3 ? .3 + .9 * v : 1), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(a, t + .003); g.gain.setTargetAtTime(0, t + .003, base / (1 + .45 * (n - 1))); g.gain.setTargetAtTime(0, t + Math.max(dur, .1), .15); osc('sine', fn, t, end, { det: n === 1 ? rnd(-2, 2) : 0 }).connect(g); g.connect(sum); }
  const hn = noiseSrc(t, t + .04), hl = bqf('lowpass', 1600, .7), hg = ac.createGain(); hg.gain.setValueAtTime(.5 * v, t); hg.gain.exponentialRampToValueAtTime(.001, t + .03); hn.connect(hl); hl.connect(hg); hg.connect(sum);
  const out = ac.createGain(); out.gain.value = .075 * (.5 + .5 * v); sum.connect(out); P.out(out, O(o, .3), t, end);
};
IN.harp = (t, m, dur, v, o) => pluck(t, m, v, O(o, .45), .55, .9985, 2.6, [bqf('lowpass', 4500, .7)], .2);
IN.guitar = (t, m, dur, v, o) => pluck(t, m, v, O(o, .3), .8, .997, 2, [bqf('peaking', 220, 1, 4), bqf('lowpass', 5000, .7)], .18);
IN.pizz = (t, m, dur, v, o) => pluck(t, m, v, O(o, .35), .45, .992, .7, [bqf('peaking', 350, 1.2, 5), bqf('lowpass', 3000, .7)], .22);
IN.musicbox = (t, m, dur, v, o) => { v = v == null ? .7 : v; partials(t, mtof(m), [[1, 1, 1.2], [2.01, .3, .5], [3.9, .12, .2], [6.2, .05, .1]], .075 * v, O(o, .4)); nz(t, .01, 'highpass', 6000, .7, .02 * v, o); };
IN.celesta = (t, m, dur, v, o) => fm(t, mtof(m), Math.max(dur, .6), .09 * (v == null ? .7 : v), Object.assign({ r: 3.5, i: .8, itau: .15, tau: .5, rev: .45 }, o || {}));
IN.glock = (t, m, dur, v, o) => partials(t, mtof(m), [[1, 1, 1.4], [2.76, .35, .4], [5.4, .15, .15]], .085 * (v == null ? .7 : v), O(o, .4));
IN.vibes = (t, m, dur, v, o) => {
  const ac = AC(), f = mtof(m), end = t + 3, g = ac.createGain(), trem = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); v = v == null ? .7 : v;
  adsr(g, t, .004, .09 * v, 1.2, .0, Math.max(dur, 2.2), .6);
  trem.gain.value = .75; l.frequency.value = 5.5; lg.gain.value = .25; l.connect(lg); lg.connect(trem.gain); l.start(t); l.stop(end);
  const a = osc('sine', f, t, end), b = osc('sine', f * 4, t, t + .6), bg = ac.createGain(); bg.gain.setValueAtTime(.15, t); bg.gain.exponentialRampToValueAtTime(.001, t + .5);
  a.connect(g); b.connect(bg); bg.connect(g); g.connect(trem); P.out(trem, O(o, .4), t, end);
};
IN.marimba = (t, m, dur, v, o) => { v = v == null ? .7 : v; partials(t, mtof(m), [[1, 1, .7], [3.93, .22, .18], [9.2, .05, .06]], .1 * v, O(o, .25)); nz(t, .02, 'lowpass', 2200, .7, .05 * v, o); };
IN.xylo = (t, m, dur, v, o) => { v = v == null ? .7 : v; partials(t, mtof(m), [[1, 1, .38], [3, .35, .12], [6.2, .12, .05]], .09 * v, O(o, .3)); nz(t, .012, 'highpass', 3000, .7, .04 * v, o); };
IN.churchBell = (t, m, dur, v, o) => { v = v == null ? .7 : v; partials(t, mtof(m), [[.5, .5, 6], [1, 1, 4], [1.19, .6, 3], [1.5, .45, 2.6], [2, .7, 2.3], [2.52, .3, 1.6], [3, .25, 1.3], [4.1, .15, .9]], .07 * v, O(o, .7)); nz(t, .03, 'bandpass', 3000, 1, .04 * v, o); };
IN.glassHarm = (t, m, dur, v, o) => { const ac = AC(), g = ac.createGain(), end = t + dur + 1.2; v = v == null ? .7 : v; adsr(g, t, .15, .07 * v, 0, 1, dur, .5); osc('sine', mtof(m), t, end, { vib: [4.5, 8, .4] }).connect(g); const h = osc('sine', mtof(m) * 2, t, end), hg = ac.createGain(); hg.gain.value = .15; h.connect(hg); hg.connect(g); P.out(g, O(o, .6), t, end); };
IN.organ = (t, m, dur, v, o) => {
  const ac = AC(), f = mtof(m), end = t + dur + .5, sum = ac.createGain(), trem = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); v = v == null ? .7 : v;
  adsr(sum, t, .03, .035 * v, 0, 1, dur, .15);
  [[.5, .4], [1, 1], [2, .7], [3, .35], [4, .3], [6, .15], [8, .1]].forEach(([r, a]) => { const x = osc('sine', f * r, t, end, { vib: [6.2, 6, .05] }), g = ac.createGain(); g.gain.value = a; x.connect(g); g.connect(sum); });
  trem.gain.value = .85; l.frequency.value = 6.2; lg.gain.value = .15; l.connect(lg); lg.connect(trem.gain); l.start(t); l.stop(end);
  sum.connect(trem); P.out(trem, O(o, .5), t, end);
};

// ── 弦乐 ──
function strSection(t, m, dur, v, o, n, a, lpf, trem) {
  const ac = AC(), f = mtof(m), end = t + dur + .9, sum = ac.createGain(); v = v == null ? .7 : v;
  adsr(sum, t, a, (trem ? .065 : .045) * v, 0, 1, dur, .25);
  const lp = bqf('lowpass', lpf || (1800 + 2600 * v), .5), hp = bqf('highpass', 150, .7), body = bqf('peaking', 1100, 1.2, 3);
  for (let i = 0; i < n; i++) osc('sawtooth', f, t, end, { det: (i - (n - 1) / 2) * 7 + rnd(-2, 2), vib: [4.8 + i * .35, 10, .35] }).connect(lp);
  let last = wire(lp, [hp, body, sum]);
  if (trem) { const tg = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(); tg.gain.value = .6; l.frequency.value = trem; lg.gain.value = .4; l.connect(lg); lg.connect(tg.gain); l.start(t); l.stop(end); last.connect(tg); last = tg; }
  P.out(last, O(o, .45), t, end);
}
IN.strings = (t, m, dur, v, o) => strSection(t, m, dur, v, o, 4, o && o.a != null ? o.a : .18);
IN.stringsShort = (t, m, dur, v, o) => strSection(t, m, Math.min(dur, .18), v, o, 3, .01, 4200);
IN.tremolo = (t, m, dur, v, o) => strSection(t, m, dur, v, o, 3, .12, 3600, 12);
IN.cello = (t, m, dur, v, o) => {
  const ac = AC(), f = mtof(m), end = t + dur + 1.4, g = ac.createGain(); v = v == null ? .7 : v;
  adsr(g, t, .12, .07 * v, 0, 1, dur, .3);
  const x = osc('sawtooth', f, t, end, { vib: [5.4, 20, .45] }), last = wire(x, [bqf('peaking', 250, 1, 5), bqf('peaking', 1000, 1.3, 3), bqf('lowpass', 3200, .6), g]);
  const bn = noiseSrc(t, t + dur), bb = bqf('bandpass', 2500, 2), bg = ac.createGain(); bg.gain.setValueAtTime(0, t); bg.gain.linearRampToValueAtTime(.012 * v, t + .1); bg.gain.setTargetAtTime(0, t + dur, .1); bn.connect(bb); bb.connect(bg); bg.connect(g);
  P.out(last, O(o, .5), t, end);
};

// ── 铜管 / 木管 ──
function brassV(t, m, dur, v, o, lpMax, mix, att, lvl) {
  const ac = AC(), f = mtof(m), end = t + dur + .4, g = ac.createGain(), lp = bqf('lowpass', 400, 1.1); v = v == null ? .7 : v;
  lp.frequency.setValueAtTime(400, t); lp.frequency.exponentialRampToValueAtTime(lpMax * (.6 + .5 * v), t + att + .03); lp.frequency.exponentialRampToValueAtTime(lpMax * .55, t + att + .35);
  adsr(g, t, att, lvl * v, .4, .8, dur, .12);
  [-5, 5].forEach(d => osc('sawtooth', f, t, end, { det: d, from: f * .97, glide: .04, vib: dur > .35 ? [5.3, 11, .45] : null }).connect(lp));
  if (mix) { const tr = osc('triangle', f, t, end), tg = ac.createGain(); tg.gain.value = mix; tr.connect(tg); tg.connect(lp); }
  lp.connect(g); P.out(g, O(o, .25), t, end);
}
IN.trumpet = (t, m, dur, v, o) => brassV(t, m, dur, v, o, 4200, 0, .02, .06);
IN.horn = (t, m, dur, v, o) => brassV(t, m, dur, v, o, 1100, 1.2, .07, .08);
IN.trombone = (t, m, dur, v, o) => brassV(t, m, dur, v, o, 1500, .3, .04, .07);
IN.tuba = (t, m, dur, v, o) => brassV(t, m, dur, v, o, 600, 1.5, .05, .11);
IN.flute = (t, m, dur, v, o) => {
  const ac = AC(), f = mtof(m), end = t + dur + .4, g = ac.createGain(); v = v == null ? .7 : v;
  adsr(g, t, .07, .06 * v, 0, 1, dur, .1);
  osc('triangle', f, t, end, { vib: [5, 14, .3] }).connect(g); const h = osc('sine', f * 2, t, end), hg = ac.createGain(); hg.gain.value = .15; h.connect(hg); hg.connect(g);
  const n = noiseSrc(t, end), nb = bqf('bandpass', f * 2, 8), ng = ac.createGain(); ng.gain.value = .25; n.connect(nb); nb.connect(ng); ng.connect(g);
  P.out(wire(g, [bqf('lowpass', 5000, .7)]), O(o, .45), t, end);
};
IN.clarinet = (t, m, dur, v, o) => { const ac = AC(), f = mtof(m), end = t + dur + .3, g = ac.createGain(); v = v == null ? .7 : v; adsr(g, t, .04, .06 * v, 0, 1, dur, .08); P.out(wire(osc('square', f, t, end, { vib: [5, 7, .4] }), [bqf('lowpass', f * 3, .8), g]), O(o, .35), t, end); };
IN.accordion = (t, m, dur, v, o) => {
  const ac = AC(), f = mtof(m), end = t + dur + .2, g = ac.createGain(), tg = ac.createGain(), l = ac.createOscillator(), lg = ac.createGain(), bp = bqf('bandpass', 1200, .6); v = v == null ? .7 : v;
  adsr(g, t, .03, .07 * v, 0, 1, dur, .06); [-9, 9].forEach(d => osc('sawtooth', f, t, end, { det: d }).connect(bp));
  tg.gain.value = .75; l.frequency.value = 6.5; lg.gain.value = .25; l.connect(lg); lg.connect(tg.gain); l.start(t); l.stop(end);
  P.out(wire(bp, [bqf('lowpass', 3000, .7), g, tg]), O(o, .3), t, end);
};
IN.calliope = (t, m, dur, v, o) => { const ac = AC(), f = mtof(m), end = t + dur + .2, g = ac.createGain(); v = v == null ? .7 : v; adsr(g, t, .02, .05 * v, 0, 1, dur, .05); osc('sine', f, t, end, { vib: [7, 22, .05] }).connect(g); const h = osc('triangle', f * 2, t, end), hg = ac.createGain(); hg.gain.value = .3; h.connect(hg); hg.connect(g); P.out(g, O(o, .35), t, end); };
IN.theremin = (t, m, dur, v, o) => { const ac = AC(), g = ac.createGain(), end = t + dur + 1; v = v == null ? .7 : v; adsr(g, t, .15, .045 * v, 0, 1, dur, .2); osc('sine', mtof(m), t, end, { from: mtof(m - 5), glide: .25, vib: [6.5, 45, .1] }).connect(g); P.out(g, O(o, .6), t, end); };

// ── 人声 ──
function vox(t, ms, dur, v, o, f1, f2, lvl) {
  const ac = AC(), end = t + dur + .5, sum = ac.createGain(), a = bqf('bandpass', f1, 4), b = bqf('bandpass', f2, 5), g = ac.createGain(); v = v == null ? .7 : v;
  adsr(g, t, (o && o.a) || .25, lvl * v, 0, 1, dur, .35); sum.gain.value = .6 / ms.length;
  ms.forEach(m => [-8, 0, 8].forEach(d => osc('sawtooth', mtof(m), t, end, { det: d + rnd(-3, 3), vib: [rnd(4.6, 5.6), 9, .3] }).connect(sum)));
  sum.connect(a); sum.connect(b); a.connect(g); b.connect(g); P.out(g, O(o, .55), t, end);
}
IN.choirAh = (t, ms, dur, v, o) => vox(t, [].concat(ms), dur, v, o, 800, 1200, .22);
IN.choirOo = (t, ms, dur, v, o) => vox(t, [].concat(ms), dur, v, o, 320, 870, .26);

// ── 合成器 ──
IN.supersaw = (t, ms, dur, v, o) => {
  const ac = AC(), end = t + dur + .4, g = ac.createGain(), lp = bqf('lowpass', 900, .8); v = v == null ? .7 : v;
  lp.frequency.setValueAtTime(900, t); lp.frequency.exponentialRampToValueAtTime(6500, t + .04); lp.frequency.setTargetAtTime(2600, t + .05, .25);
  adsr(g, t, .006, .035 * v / Math.sqrt([].concat(ms).length), .4, .7, dur, .2);
  [].concat(ms).forEach(m => [-24, -14, -6, 0, 6, 14, 24].forEach(d => osc('sawtooth', mtof(m), t, end, { det: d }).connect(lp)));
  P.out(wire(lp, [bqf('highpass', 180, .7), g]), O(o, .3), t, end);
};
IN.synthPluck = (t, m, dur, v, o) => { const ac = AC(), end = t + .6, g = ac.createGain(), lp = bqf('lowpass', 5000, 2); v = v == null ? .7 : v; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(500, t + .25); g.gain.setValueAtTime(.11 * v, t); g.gain.exponentialRampToValueAtTime(.001, t + .5); osc('sawtooth', mtof(m), t, end).connect(lp); P.out(wire(lp, [g]), O(o, .35), t, end); };
IN.sub = (t, m, dur, v, o) => thud(t, mtof(m) * 1.5, mtof(m), Math.max(.5, dur), .45 * (v == null ? .7 : v), Object.assign({ slide: .06 }, o || {}));
IN.distGuitar = (t, m, dur, v, o) => {
  const ac = AC(), end = t + dur + .3, g = ac.createGain(), sh = ac.createWaveShaper(), n = 1024, c = new Float32Array(n); v = v == null ? .7 : v;
  for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(6 * x); } sh.curve = c;
  adsr(g, t, .004, .09 * v, .3, .7, dur, .08);
  const pre = ac.createGain(); pre.gain.value = .7; [m, m + 7, m + 12].forEach((mm, i) => [-7, 7].forEach(d => osc('sawtooth', mtof(mm), t, end, { det: d + i }).connect(pre)));
  P.out(wire(pre, [sh, bqf('highpass', 90, .7), bqf('peaking', 1500, 1, -5), bqf('lowpass', 3200, .8), g]), O(o, .2), t, end);
};

// ── 打击乐 ──
IN.taiko = (t, v, o) => { v = v == null ? .8 : v; tone(t, 'sine', 78, .9, .5 * v, Object.assign({ to: 56, slide: .15, rev: .5 }, o || {})); tone(t, 'triangle', 150, .2, .12 * v, o); nz(t, .12, 'lowpass', 500, .7, .25 * v, O(o, .5)); };
IN.bassDrum = (t, v, o) => { v = v == null ? .8 : v; tone(t, 'sine', 95, .5, .45 * v, Object.assign({ to: 48, slide: .08 }, o || {})); nz(t, .05, 'lowpass', 900, .7, .15 * v, o); };
IN.snare = (t, v, o) => { v = v == null ? .8 : v; nz(t, .16, 'bandpass', 2200, .8, .22 * v, O(o, .15)); nz(t, .08, 'highpass', 6000, .5, .08 * v, o); tone(t, 'triangle', 220, .08, .15 * v, Object.assign({ to: 180, slide: .06 }, o || {})); };
IN.roll = (t, dur, v0, v1, o) => { const n = Math.round(dur / .042); for (let i = 0; i < n; i++) IN.snare(t + i * dur / n + rnd(0, .006), (v0 + (v1 - v0) * i / n) * rnd(.85, 1), o); };
IN.clap = (t, v, o) => { v = v == null ? .8 : v; [0, .011, .022].forEach(d => nz(t + d, .08, 'bandpass', 1200, 1.2, .35 * v, O(o, .3))); };
IN.woodblock = (t, m, v, o) => { v = v == null ? .8 : v; tone(t, 'sine', mtof(m || 84), .06, .18 * v, o); nz(t, .02, 'bandpass', mtof(m || 84) * 2, 4, .14 * v, o); };
IN.triangle = (t, v, o) => partials(t, 2800 * rnd(.98, 1.02), [[1, 1, 1.8], [2.83, .5, 1.2], [5.3, .3, .8], [8.3, .15, .5]], .04 * (v == null ? .8 : v), O(o, .4));
IN.tamb = (t, v, o) => { v = v == null ? .8 : v; for (let i = 0; i < 5; i++) tone(t + rnd(0, .01), 'sine', rnd(5200, 9000), .14, .02 * v, o); nz(t, .12, 'highpass', 7000, .6, .12 * v, o); };
IN.gong = (t, f, v, o) => {
  v = v == null ? .8 : v; f = f || 82;
  partials(t, f, [[1, 1, 4.5, .02], [1.52, .7, 4, .05], [1.97, .6, 3.5, .1], [2.34, .5, 3, .15], [2.9, .45, 3, .2], [3.36, .4, 2.6, .25], [3.87, .35, 2.4, .3], [4.52, .3, 2, .35], [5.1, .25, 1.8, .4], [5.94, .2, 1.6, .45], [6.6, .15, 1.4, .5], [7.3, .12, 1.2, .5]], .07 * v, O(o, .6));
  nz(t, 3, 'bandpass', 3000, .8, .03 * v, { a: .6, hold: .4, rev: .6 }); thud(t, 70, 45, .6, .2 * v, o);
};
IN.revCym = (t0, t1, pk, o) => { riser(t0, t1, 5000, 9000, pk || .12, Object.assign({ q: .4 }, o || {})); nz(t0, t1 - t0, 'highpass', 6000, .5, (pk || .12) * .7, { a: (t1 - t0) * .95, hold: 0 }); };
IN.orchHit = (t, ms, v, o) => {
  v = v == null ? .9 : v; const k = v * Math.min(1, 2.2 / ms.length); ms.forEach(m => { IN.stringsShort(t, m + 12, .2, k * .75, o); IN.trumpet(t, m, .22, k * .75, o); }); IN.sub(t, ms[0] - 12, .6, v * .8, o);
  timp(t, ms[0] - 12 < 36 ? ms[0] : ms[0] - 12, .35 * v);
};
IN.airSiren = (t, dur, pk, o) => {
  const ac = AC(), end = t + dur + .2, g = ac.createGain(), x = osc('sawtooth', 180, t, end, { vib: [5, 25, .1] }), y = osc('square', 180, t, end);
  [x, y].forEach(o2 => { o2.frequency.setValueAtTime(180, t); o2.frequency.exponentialRampToValueAtTime(720, t + dur * .45); o2.frequency.setValueAtTime(720, t + dur * .55); o2.frequency.exponentialRampToValueAtTime(220, t + dur); });
  adsr(g, t, dur * .3, (pk || .05) * 2.5, 0, 1, dur * .8, .3); const mix = ac.createGain(); mix.gain.value = .5; x.connect(mix); y.connect(mix);
  P.out(wire(mix, [bqf('lowpass', 1600, .7), g]), O(o, .6), t, end);
};
// 一串音：[[拍, 乐器, 音高或音高数组, 时值拍, 力度], ...]，按 bpm 排
function score(t, bpm, list, o) { const b = 60 / bpm; list.forEach(([at, ins, m, d, v]) => { const fn = IN[ins]; if (!fn) return; const tt = t + at * b, dd = (d || 1) * b; if (ins === 'orchHit') fn(tt, m, v, o); else if (Array.isArray(m) && !/choir|supersaw/.test(ins)) m.forEach(mm => fn(tt, mm, dd, v, o)); else fn(tt, m, dd, v, o); }); }
S.score = score;

// ═════════ 新编曲 ═════════
// 每个时刻有自己的乐器、调式和节奏（不再都是「cymbal + 低音 + F 大调铜管 + 钟琴」），同一个时刻每次轮换变体。
// 节拍仍然对着动画里的时间点。

// ── 进战通告：号角（用户裁定 2026-09-25：进入战斗的音乐应该是号角声；之前说过要轻、起到提示作用、不要混响、不要杂）──
// 圆号加低八度的大号，像战场上的长号角；0.08 秒起吹，第二个音落在名字砸下的 0.44 秒前后。只有一点点混响，没有鼓、没有齐奏。
// 战斗配乐「战鼓」的第一小节空着留给号角，鼓点从第二小节进来。
function warHorn(t, m, dur, v) { IN.horn(t, m, dur, v, { rev: .08 }); IN.tuba(t, m - 12, dur, v * .6, { rev: .05 }); }
const INTRO2 = {
  // 普通：低音起、上五度长音
  normal: (t, v) => { const r = [50, 52, 48][v]; warHorn(t + .08, r, .28, .52); warHorn(t + .4, r + 7, .9, .62); },
  // 坚守：一个长音，上面叠一个五度，像守城的警号
  hold: (t, v) => { const r = [48, 50, 46][v]; warHorn(t + .08, r, 1.1, .54); IN.horn(t + .08, r + 7, 1.1, .36, { rev: .08 }); },
  // 撤离：小号的军号，两个短音加一个长音，往上四度；低八度的圆号垫厚
  extract: (t, v) => { const r = [67, 69, 65][v]; [[0, 0, .1], [.14, 0, .1], [.28, 5, .6]].forEach(([d, s2, len]) => { IN.trumpet(t + .1 + d, r + s2, len, .9, { rev: .06 }); IN.horn(t + .1 + d, r + s2 - 12, len, .6, { rev: .06 }); }); },
  // 精英：低音往上半音，压着不舒服
  elite: (t, v) => { const r = [45, 47, 43][v]; warHorn(t + .08, r, .32, .54); warHorn(t + .44, r + 1, .9, .62); },
  // 首领：一声很低很长的号角，然后三下心跳
  boss: (t) => { warHorn(t + .05, 38, 1.4, .68); [1.3, 1.65, 2].forEach(d => { thud(t + d, 62, 40, .18, .3); thud(t + d + .15, 55, 36, .16, .2); }); },
};
def('battleIntro', 2, (t, ft) => { DIR.introUntil = t + 1.4; const k = INTRO2[ft] ? ft : 'normal'; INTRO2[k](t, rot('intro:' + k, 3)); }, 500);

// ── 胜利：小号号角 + 军鼓；每个字落地是cadence里的一个和弦（IV → V），最后铜管解决到 I；每场换调、换旋律 ──
const VK = { root: 58, mel: null };
const VMEL = [[[0, 4, .5], [.5, 4, .5], [1, 4, .5], [1.5, 7, 2]], [[0, 2, .5], [.5, 4, .5], [1, 7, .75], [1.75, 9, 2]], [[0, 7, .5], [.5, 6, .25], [.75, 7, .25], [1, 9, .5], [1.5, 11, 2]]];
const VIC2 = {
  flash: (t) => { VK.root = [58, 60, 62, 63][rot('vicKey', 4)]; VK.mel = VMEL[rot('vicMel', 3)]; duck(t, .8, 2.2); chordOf(VK.root + 24, [0, 2, 4]).forEach((m, i) => IN.glock(t + i * .03, m, .8, .6)); },
  drop: (t) => tone(t, 'sine', 2400, .26, .025, { to: 900, slide: .24 }),
  land: (t, i) => { const d = [[3, 5, 7], [4, 6, 8], [0, 2, 4], [3, 5, 7]][Math.min(i | 0, 3)]; IN.orchHit(t, chordOf(VK.root, d), .8); },
  sparks: () => {},
  confetti: (t) => IN.clap(t, .5),
  phrase: (t) => { const r = VK.root, mel = VK.mel || VMEL[0], b = .3; mel.forEach(([at, d, len]) => IN.trumpet(t + at * b, dg(r + 12, d), len * b, .9)); const end = t + mel[mel.length - 1][0] * b; chordOf(r - 12, [0, 4, 7]).forEach(m => IN.horn(end, m + 12, .9, .75)); timp(end, r - 24 < 36 ? r - 12 : r - 24, .4); },
};
def('vic', 2, (t, beat, i) => { const f = VIC2[beat]; if (f) f(t, i); });
def('victory', 2, (t, n) => { n = n || 2; VIC2.flash(t); for (let i = 0; i < n; i++) { const t0 = t + .08 + i * .1; VIC2.drop(t0); VIC2.land(t0 + .28, i); } VIC2.sparks(t + .3); VIC2.confetti(t + .45); VIC2.phrase(t + .08 + (n - 1) * .1 + .28 + .14); }, 500);

// ── 出征结算：通关是圆号、弦乐、合唱的grand cadence（D 大调）；撤离是acoustic guitar加长笛，松一口气（G 大调）；领袖阵亡是大提琴lament加教堂钟（A 小调） ──
const END2 = {
  clear: (t) => { const r = 62; duck(t, .8, 2.6); thud(t + .35, 95, 38, .5, .42); chordOf(r - 12, [3, 5, 7]).forEach(m => IN.horn(t + .35, m, .45, .8)); chordOf(r - 12, [0, 4, 7, 9]).forEach(m => IN.horn(t + .8, m, 1.4, .85)); IN.choirAh(t + .8, chordOf(r, [0, 2, 4]), 1.5, .7, { a: .15 }); },
  evac: (t) => { const r = 55; duck(t, .6, 2.4); thud(t + .35, 110, 50, .25, .22); [0, 2, 4, 6, 8, 6].forEach((d, i) => IN.guitar(t + .35 + i * .12, dg(r, d), .5, .7)); [[0, 4, .3], [.3, 5, .3], [.6, 7, 1]].forEach(([at, d, len]) => IN.flute(t + .8 + at, dg(r + 12, d), len, .7)); },
  dead: (t) => { const r = 57; duck(t, .85, 3.2); IN.churchBell(t + .3, 45, 3, .6); [[.4, 4, .5], [.9, 3, .5], [1.4, 1, .5], [1.9, 0, 1.2]].forEach(([at, d, len]) => IN.cello(t + at, dg(r - 12, d, MIN), len, .8)); },
};
const TILE2 = {
  clear: (t, i, q) => { if (q >= 3) IN.glock(t, dg(74, 4 + i * 2), .6, .75); else IN.harp(t, dg(62, 4 + i * 2), .5, .7); },
  evac: (t, i, q) => (q >= 2 ? IN.vibes : IN.marimba)(t, dg(67, i * 2), .5, .75),
  dead: (t, i) => IN.pizz(t, dg(45, [4, 3, 1, 0, -1][i % 5], MIN), .45, .6),
};
def('endScreen', 2, (t, kind, qs) => { const k = kind === 'dead' ? 'dead' : kind === 'evac' ? 'evac' : 'clear'; END2[k](t); (qs || []).forEach((q, i) => TILE2[k](t + .55 + i * .14 + .12, i, q | 0)); }, 800);

// ── 升级：合成器的电子味（超级sawtooth、808、合成拨弦、手拍）；每升一级调高两个半音，每次升级都在新的高度 ──
let LK = 60;
const LV2 = {
  in: (t, lv) => { LK = 60 + (Math.max(0, (lv | 0) - 2) * 2) % 12; duck(t, .75, 3); riser(t, t + .12, 400, 3200, .07); },
  flash: (t) => { nz(t, .15, 'highpass', 2500, .5, .1); IN.sub(t, LK - 24, .6, .8); },
  slam: (t) => { IN.supersaw(t, chordOf(LK, [0, 2, 4]), .45, .9); IN.clap(t, .7); },
  num: (t) => { IN.synthPluck(t, dg(LK + 12, 4), .2, .8); IN.synthPluck(t + .12, dg(LK + 12, 7), .3, .9); },
  panel: (t) => whoosh(t, .2, 500, 1800, .045),
  roll: (t, d) => { cut(lvG, t); lvG = grp(); const g = lvG, dd = d || 1; chordOf(LK - 12, [4, 6, 8]).forEach(m => IN.tremolo(t, m + 12, dd + .5, .5, { dest: g })); riser(t, t + dd, 600, 5000, .045, { dest: g }); },
  tick: (t, p) => IN.synthPluck(t, dg(LK + 12, Math.round((p || 0) * 7)), .1, .4),
  gold: (t) => { cut(lvG, t, .04); lvG = null; IN.supersaw(t, chordOf(LK, [0, 4, 7]), .8, .75); chordOf(LK + 24, [0, 2, 4, 7]).forEach((m, i) => IN.glock(t + .04 + i * .05, m, .7, .6)); },
  talTitle: (t) => IN.vibes(t, LK + 12, .8, .6),
  tal: (t, k) => IN.marimba(t, dg(LK + 12, (k | 0) + 2), .35, .8),
};
def('lv', 2, (t, beat, x) => { const f = LV2[beat]; if (f) f(t, x); });
def('levelUp', 2, (t, o) => {
  o = o || {}; const nT = o.talents || 0; LV2.in(t, o.lv || 2 + rot('lvDemo', 6)); LV2.flash(t + .12); LV2.slam(t + .36); LV2.num(t + .7); LV2.panel(t + 1.18); LV2.roll(t + 1.3, 1);
  for (let k = 1; k <= 16; k++) LV2.tick(t + 1.3 + 1 - Math.pow(1 - k / 16, 1 / 3), k / 16);
  LV2.gold(t + 2.3); if (nT) { LV2.talTitle(t + 2.55); for (let k = 0; k < nT; k++) LV2.tal(t + 2.75 + k * .12, k); }
}, 600);

// ── 招募碎卡：光每爬一档品质换一件乐器（八音盒 → 竖琴 → 拨弦 → 合唱）；碎开后按品质换整个编制 ──
function reveal2(t, q) {
  if (q === 0) { [0, 2, 4, 7].forEach((d, i) => IN.musicbox(t + i * .1, dg(72, d), .3, .8)); return; }
  if (q === 1) { for (let i = 0; i < 6; i++) IN.harp(t + i * .035, dg(55, i * 2), .45, .6); [[.3, 4, .25], [.55, 7, .8]].forEach(([d, s, len]) => IN.flute(t + d, dg(67, s), len, .75)); return; }
  if (q === 2) { chordOf(52, [0, 2, 4], MIN).forEach(m => IN.strings(t, m, .6, .8, { a: .05 })); chordOf(52, [0, 2, 4]).forEach(m => IN.strings(t + .6, m + 12, 1.1, .85, { a: .08 })); IN.choirAh(t + .6, chordOf(64, [0, 2, 4]), 1.1, .7, { a: .15 }); return; }
  duck(t, .8, 2.6); IN.gong(t, 73, .9); [[.1, 0, .14], [.26, 3, .14], [.42, 4, .14], [.58, 5, 1.1]].forEach(([d, s, len]) => IN.trumpet(t + d, dg(73, s), len, .9)); IN.choirAh(t + .58, chordOf(73, [0, 2, 4]), 1.4, .8, { a: .1 });
}
const RC2 = {
  in: (t) => { duck(t, .75, 3.2); whoosh(t, .55, 300, 2400, .09, { pan: .3, panTo: 0 }); },
  charge: (t, o) => { cut(rcG, t); rcG = grp(); const g = rcG, d = (o && o.dur) || 1.2, rar = (o && o.rar) | 0; crackle(t, d + .5, 2500, .03 + .02 * rar, { a: d * .9, dest: g }); riser(t, t + d, 200, 3000 + rar * 1500, .035 + rar * .025, { dest: g }); },
  tier: (t, k) => [() => IN.musicbox(t, 72, .35, .8), () => IN.harp(t, 67, .5, .8), () => IN.pizz(t, 59, .45, .9), () => IN.choirOo(t, [76], .6, .8, { a: .05 })][Math.min(3, k | 0)](),
  shatter: (t, rar) => { cut(rcG, t, .03); rcG = null; S.shatter(); reveal2(t + .05, Math.max(0, Math.min(3, rar | 0))); },
  fly: (t) => whoosh(t, .6, 1800, 500, .06, { pan: 0, panTo: -.7 }),
  land: (t, rar) => IN.marimba(t, dg(67, 4 + (rar | 0)), .4, .8, { pan: -.6 }),
};
def('rc', 2, (t, beat, x) => { const f = RC2[beat]; if (f) f(t, x); });
def('recruit', 2, (t, rar) => { rar = Math.max(0, Math.min(3, rar | 0)); RC2.in(t); RC2.charge(t + .55, { dur: 1.2, rar }); for (let k = 0; k <= rar; k++) RC2.tier(t + .55 + k * 1.2 / (rar + 1), k); RC2.shatter(t + 1.75, rar); RC2.fly(t + 3); RC2.land(t + 3.7, rar); }, 800);
def('reveal', 2, (t, q) => reveal2(t, q | 0), 300);

// ── 宝箱（2026-09-25 重做：层太多听不清）：一条线，每个时刻只有一个主角 ──
// 开箱木头响 → 0.5 秒落地一声低响 → 抖动是一下下木头碰撞（越抖越急越亮）→ 1.5 秒打开：六个音的竖琴上行停在一个钟琴和弦上 →
// 奖励每件只响一个音，接着这个和弦往上走（普通马林巴、稀有颤音琴、史诗钟琴，传说多一声低音钟）
const CHK = { i: 0, last: 0 };
def('chestLand', 1, (t) => { thud(t, 120, 55, .2, .3); nz(t, .08, 'lowpass', 700, .8, .16); }, 200);
def('chest', 2, (t) => { CHK.i = 0; CHK.last = performance.now(); duck(t, .35, .9); thud(t, 90, 45, .3, .22); for (let i = 0; i < 6; i++) IN.harp(t + i * .028, dg(65, i * 2 - 2), .5, .5); [77, 81, 84].forEach(m => IN.glock(t + .17, m, 1.2, .5)); }, 200);
def('itemReveal', 1, (t, q) => { q = Math.max(0, Math.min(3, q | 0)); const now = performance.now(); if (now - CHK.last > 1500) CHK.i = 0; CHK.last = now; const m = dg(72, 2 + CHK.i++); [() => IN.marimba(t, m, .5, .8), () => IN.vibes(t, m, .8, .75), () => IN.glock(t, m + 12, .8, .7), () => { IN.glock(t, m + 12, 1, .75); IN.churchBell(t, m - 12, 2.5, .35); }][q](); }, 60);

// ── 换日：三个小圆点是拨弦往上走，今天圈落位是颤音琴 ──
def('tlDot', 0, (t, j) => IN.pizz(t, dg(62, 2 + (j | 0) * 2), .4, .8));
def('tlLand', 1, (t) => IN.vibes(t, dg(62, 9), .7, .8));
// 日程事件：每种一件标志乐器
const EVENT2 = {
  raid: (t) => chaos2(t, false),
  merchant: (t) => [0, 2, 4, 2, 0].forEach((d, i) => IN.accordion(t + i * .12, dg(67, d), i === 4 ? .4 : .11, .8)),
  star: (t) => { for (let i = 0; i < 8; i++) IN.harp(t + i * .03, dg(60, i + 4), .45, .6); IN.glock(t + .3, 91, .8, .6); },
  plague: (t) => [[0, 0, .3], [.3, 1, .3], [.6, -1, .7]].forEach(([d, s, len]) => IN.clarinet(t + d, dg(50, s, PHR), len, .8)),
  harvest: (t) => { [0, 2, 4, 7].forEach((d, i) => IN.guitar(t + i * .03, dg(55, d), .7, .8)); [[.3, 4, .25], [.55, 5, .25], [.8, 4, .45]].forEach(([d, s, len]) => IN.flute(t + d, dg(79, s), len, .7)); },
  surge: (t) => { IN.sub(t, 33, .8, .7); [0, 4, 7].forEach((d, i) => IN.glassHarm(t + .25 + i * .12, 72 + d, .6, .6)); },
  recruit: (t) => { IN.horn(t, 60, .25, .8); IN.horn(t + .3, 67, .25, .8); IN.horn(t + .6, 72, .7, .9); },
};
EVENT2.ley = EVENT2.surge;
def('tlEvent', 2, (t, ev) => { (EVENT2[ev] || EVENT2.star)(t); if (ev !== 'raid') duck(t, .5, 1.1); }, 300);

// ── 新的五天：旧的五天是一记记大鼓加盖章；整条滚过去是定音鼓滚奏；新的五天是木琴一格格往上；大字是圆号的英雄动机（C 大调）──
def('nfStamp', 1, (t) => S.stamp());
def('nfScroll', 1, (t) => whoosh(t, .7, 300, 2600, .13, { pan: .7, panTo: -.7, q: .9 }));
def('nfPop', 1, (t, j, ev) => (ev ? IN.glock : IN.xylo)(t, dg(ev ? 84 : 72, (j | 0) * 2), .35, .85));
def('nfTitle', 2, (t) => { duck(t, .7, 2); IN.orchHit(t, chordOf(48, [0, 2, 4]), .85); [[.15, 0, .2], [.35, 4, .2], [.55, 7, .2], [.75, 9, 1]].forEach(([d, s, len]) => IN.horn(t + d, dg(60, s), len, .95)); });

// ── 混沌来袭：防空siren + 太鼓 + 低音铜管的不协和团块 + 暗色合唱，倒放的cymbal吸进第一下 ──
function chaos2(t, hearts) {
  duck(t, .85, 2.6); IN.airSiren(t, 2.2, .04); IN.taiko(t, 1); IN.taiko(t + .43, .8); IN.choirAh(t + .1, [38, 44, 50], 1.6, .85, { a: .2 });
  if (hearts !== false) [1.3, 1.63, 1.96].forEach(d => { thud(t + d, 62, 40, .2, .4); thud(t + d + .16, 55, 36, .18, .28); });
}
def('chaos', 2, (t) => chaos2(t, true), 800);

// ── 守住了：军鼓进行曲 + 小号（G 大调）+ 欢呼；评级章每档一种声音 ──
def('raidWin', 2, (t, rank) => { const r = Math.max(0, ['C', 'B', 'A', 'S'].indexOf(rank)); duck(t, .7, 2.2); [0, .15, .3].forEach(d => IN.snare(t + d, .65)); [[.45, 0, .15], [.6, 4, .15], [.75, 7, .15], [.9, 9 + (r >= 2 ? 3 : 0), .9]].forEach(([d, s, len]) => IN.trumpet(t + d, dg(67, s), len, .9)); setTimeout(() => S.rankStamp(rank), 1200); }, 600);
def('rankStamp', 2, (t, rank) => { const r = Math.max(0, ['C', 'B', 'A', 'S'].indexOf(rank)); thud(t, 110, 40, .4, .38); [() => IN.woodblock(t + .02, 79, .8), () => IN.horn(t + .02, 67, .6, .8), () => chordOf(55, [0, 2, 4]).forEach(m => IN.trumpet(t + .02, m + 12, .45, .8)), () => { IN.gong(t, 90, .7); IN.choirAh(t + .02, [67, 71, 74], 1.3, .8, { a: .05 }); }][r](); }, 300);

// ── 传送门崩塌：管风琴的小调和弦 + 往下滑的弦乐 + 锣 + 崩落 ──
def('portalCollapse', 2, (t) => { duck(t, .9, 3.5); thud(t, 60, 22, 1.6, .5); rumble(t, 2.4, .22, { f: 200 }); for (let i = 0; i < 6; i++) nz(t + rnd(0, 1.8), .08, 'bandpass', rnd(500, 2200), 1.5, .07, { pan: rnd(-.8, .8) }); chordOf(48, [0, 2, 4], MIN).forEach(m => IN.organ(t + .4, m, 2.4, .8)); });

// ── 领袖上场：distorted guitar用强力和弦弹出「回家」的动机 C F G A + 鼓的加花 + cymbal ──
def('cutin', 2, (t) => { duck(t, .7, 1.8); whoosh(t, .2, 600, 3500, .08, { pan: -.7, panTo: .3 }); [[.22, 48, .14], [.36, 53, .14], [.5, 55, .14], [.64, 57, .7]].forEach(([d, m, len]) => IN.distGuitar(t + d, m - 12, len, .9)); cymbal(t + .22, 1.2, .05); }, 600);

// ── 首领落地：长长的下坠 → 地震一样的低音 + 锣 + 低音合唱的一记重音 + 碎石 ──
def('bossDrop', 2, (t) => { whoosh(t, .7, 2500, 300, .13, { peak: .9 }); duck(t + .6, .6, 1.2); const g = t + .7; IN.sub(g, 24, 1.2, 1); IN.gong(g, 60, .8); for (let i = 0; i < 4; i++) nz(g + rnd(0, .4), .05, 'bandpass', rnd(700, 2500), 1.5, .06, { pan: rnd(-.8, .8) }); }, 800);

// ── 领袖阵亡 · 卡片裂开：大提琴的下行 + 低音钢琴 + 教堂钟（A 小调）；裂开时是rip加一记低音钢琴的不协和团块 ──
const TEAR2 = {
  in: (t) => { duck(t, .85, 2.8); IN.churchBell(t + .05, 45, 3, .6); [[.1, 4, .45], [.55, 3, .45], [1, 2, .45], [1.45, 0, .9]].forEach(([d, s, len]) => IN.cello(t + d, dg(45, s, MIN), len, .8)); },
  rip: (t) => { rip(t, .6, .26); rip(t + .04, .5, .12, { f: 1200 }); },
};
def('tear', 2, (t, b) => (TEAR2[b] || TEAR2.in)(t));
def('leaderDown', 2, (t) => { TEAR2.in(t); for (let k = 0; k < 4; k++) { thud(t + .7 + k * .32, 62, 40, .2, .35); thud(t + .86 + k * .32, 55, 36, .18, .25); } TEAR2.rip(t + 2); }, 800);

// ── 负面：每种各自的乐器 ──
// 战斗失败：钢琴和大提琴，D 小调，和阵亡不是同一段
def('lose', 2, (t) => { duck(t, .6, 1.8); [[0, 7, .35], [.35, 5, .35], [.7, 4, .35], [1.05, 2, .9]].forEach(([d, s, len]) => IN.cello(t + d, dg(50, s, MIN), len, .75)); }, 400);
// 领袖倒下（战斗里）：定音鼓 + 长号的小调
def('die', 1, (t) => { timp(t, 38, .4); [38, 41, 45].forEach(m => IN.trombone(t + .05, m + 12, .7, .6)); }, 90);
// 我方单位倒下：竖琴轻轻往下三个音
def('allyDie', 1, (t, p) => [0, 1, 2].forEach(i => IN.harp(t + i * .09, dg(67, 4 - i * 2, MIN), .4, .45, { pan: p || 0 })), 90);
// 不行：两个muted马林巴，挨着的小二度
def('ui_no', 0, (t) => { IN.marimba(t, 50, .15, .8); IN.marimba(t + .09, 49, .2, .7); keyDown(t, .6); }, 60);

// ── 通用正向：换乐器、每次轮换调 ──
const UPK = [65, 67, 62, 69];
def('up', 1, (t, i) => { i = i || 0; const r = UPK[rot('up', 4)], n = 3 + Math.min(2, Math.floor(i)); for (let k = 0; k < n; k++) IN.vibes(t + k * .06, dg(r, Math.round(i) + k * 2), .45, .5 + .1 * k); }, 40);
def('mult', 1, (t) => [0, 2, 4, 7].forEach((d, k) => IN.xylo(t + k * .045, dg(72, d + rot('mult', 3)), .3, .8)), 60);
def('heal', 1, (t) => { for (let k = 0; k < 5; k++) IN.harp(t + k * .05, dg(60, k * 2), .5, .55); }, 80);
// 号角（20 处）：三种轮换——小号（降 B）、圆号（降 E）、铜管加弦乐（C）
const FANF = [
  (t, k) => { [[0, 4, .09], [.09, 4, .09], [.18, 4, .09], [.27, 7, .7]].forEach(([d, s, len]) => IN.trumpet(t + d, dg(70, s), len, .9 * k)); chordOf(58, [0, 2, 4]).forEach(m => IN.horn(t + .27, m, .7, .7 * k)); },
  (t, k) => { [[0, 0, .2], [.2, 4, .2], [.4, 7, .8]].forEach(([d, s, len]) => IN.horn(t + d, dg(63, s), len, .9 * k)); chordOf(51, [0, 4, 7]).forEach(m => IN.trombone(t + .4, m, .8, .6 * k)); },
  (t, k) => { chordOf(60, [0, 2, 4, 7]).forEach(m => IN.trumpet(t, m, .7, .8 * k)); timp(t, 36, .35 * k); },
];
function fanfare2(t, k) { duck(t, .6, 1.2); FANF[rot('fanf', 3)](t, k || 1); }
def('fanfare', 2, (t) => fanfare2(t, 1));
def('win', 2, (t) => { IN.horn(t, 67, .2, .8); IN.horn(t + .2, 72, .6, .9); IN.triangle(t + .2, .5); });

// ── 转盘：棘轮一样的木头click，停下是一记机械声加一声高铃，升品是老虎机的铃 ──
def('tick', 0, (t, p) => { const i = Math.round(p || 0); IN.woodblock(t, [84, 86, 88, 91, 93][((i % 5) + 5) % 5], .5); }, 26);
def('reelStop', 1, (t) => { thud(t, 210, 90, .12, .3); nz(t, .07, 'bandpass', 1500, 1, .14); IN.glock(t + .02, 96, .6, .6); }, 60);
def('reelUp', 1, (t, k) => { k = k | 0; for (let i = 0; i < 3; i++) IN.glock(t + i * .05, dg(84, i * 2 + k), .3, .65); }, 120);
// ═════════ 开场演出（mc-opening.js）═════════
// 午夜的两声钟：低沉的钟体 + 泛音，第二声轻一点
def('introToll', 2, (t) => { [0, 1.1].forEach((d, i) => { ring(t + d, 98, 3.2, .1 - i * .03, { parts: [[1, 1], [2.01, .55], [2.76, .35], [4.1, .2], [5.4, .1]], rev: .7 }); thud(t + d, 70, 40, .5, .18); }); }, 400);
// 金币从黑暗里滚出来：越滚越慢的叮叮声，最后转几圈越转越快、倒下
def('coinRoll', 1, (t) => { let tt = t, g = .26; for (let i = 0; i < 6; i++) { ring(tt, 3400 + rnd(-200, 200), .12, .04, { parts: [[1, 1], [1.5, .5], [2.3, .25]] }); nz(tt, .05, 'bandpass', 2500, 2, .02); tt += g; g *= .92; } tt += .1; for (let i = 0, gg = .12; i < 14; i++) { ring(tt, 2900 + i * 40, .1, .035 * (1 - i / 16), { parts: [[1, 1], [1.5, .4]] }); tt += gg; gg *= .84; } thud(tt, 900, 600, .04, .05); }, 400);
// 墙上影子出现：不协和的锯齿和弦 + 一口气的噪声 + 重低音
def('spook', 2, (t) => { [0, 1, 6, 11].forEach(d => tone(t, 'sawtooth', mtof(50 + d), .9, .035, { lp: 2400, a: .005, vib: [9, 40, .02] })); nz(t, .5, 'bandpass', 3000, .6, .14, { to: 500 }); thud(t, 70, 30, .6, .38); }, 400);
// 门后的音乐盒：小调旋律，每个音轻微走调
def('musicBox', 1, (t) => { [76, 79, 83, 82, 79, 75, 76].forEach((m, i) => ring(t + i * .2, mtof(m) * (1 + rnd(-.004, .004)), .9, .045, { parts: [[1, 1], [2.01, .3], [3.98, .12]], rev: .6 })); }, 800);
// 转轮转动：d 秒的机械咔哒
def('reelSpin', 1, (t, d) => { const n = Math.round((d || 1.8) / .06); for (let i = 0; i < n; i++) nz(t + i * .06, .02, 'bandpass', 2200 + (i % 2) * 400, 3, .045 * (1 - .4 * i / n)); }, 300);
// 屏幕闪过鬼脸：短促的数码杂音
def('glitch', 1, (t) => { for (let i = 0; i < 5; i++) tone(t + i * .035, 'square', rnd(200, 1600), .03, .04, { crush: 1 }); nz(t, .22, 'bandpass', 1800, .5, .08); }, 200);
// 中大奖：重击 + 镲 + 上行钟琴 + 金币哗啦 + 号角
def('jackpot', 2, (t) => { thud(t, 90, 30, .7, .45); nz(t, .6, 'lowpass', 1800, .7, .25, { to: 120 }); cymbal(t + .02, 1.6, .12); [0, 4, 7, 12, 16, 19, 24].forEach((d, i) => bell(t + .05 + i * .06, 72 + d, .8, .06)); coins(t + .15, 26, .05, { gap: .05 }); IN.horn(t + .5, 72, .5, .8); }, 600);
reg('开场演出', ['introToll', 'coinRoll', 'spook', 'musicBox', 'reelSpin', 'glitch', 'jackpot']);

// ── 小游戏的四档中奖：小中是马林巴，中是颤音琴加拍手，大赢是铜管加军鼓（G），大奖是老虎机铃群 + 合唱 + 小号（降 E）──
const MW = {
  win1: (t) => { const r = [67, 69, 65][rot('w1', 3)]; [0, 2, 4].forEach((d, i) => IN.marimba(t + i * .06, dg(r, d), .35, .85)); },
  win2: (t) => { const r = [67, 70, 64][rot('w2', 3)]; [0, 2, 4, 7].forEach((d, i) => IN.vibes(t + i * .07, dg(r, d), .5, .8)); IN.clap(t + .28, .6); },
  win3: (t) => { duck(t, .7, 1.6); [[0, 0, .12], [.12, 4, .12], [.24, 7, .8]].forEach(([d, s, len]) => IN.trumpet(t + d, dg(67, s), len, .9)); chordOf(55, [0, 4, 7]).forEach(m => IN.horn(t + .24, m, .8, .75)); coinRun(t + .3, 4, .045); },
  win4: (t) => { duck(t, .85, 3); riser(t, t + .2, 600, 6000, .1); const B = t + .2; IN.sub(B, 27, 1, 1); cymbal(B, 2, .07); IN.choirAh(B, chordOf(63, [0, 2, 4, 7]), 2, .85, { a: .05 }); const f = t + .6; [[0, 0, .14], [.16, 3, .14], [.32, 4, .14], [.48, 5, 1.1]].forEach(([d, s, len]) => IN.trumpet(f + d, dg(75, s), len, .95)); coinRun(f + .5, 8, .045); },
  near: (t) => { IN.flute(t, dg(79, 2), .15, .7); IN.flute(t + .15, dg(79, 0) - 1, .3, .6); },
  lose: (t) => { IN.marimba(t, 52, .15, .5); IN.marimba(t + .1, 50, .2, .4); },
};
Object.assign(MINI._, MW);

// ── 世界主题传送门：每个世界一段招牌小曲 ──
Object.assign(WORLD, {
  town: (t) => { IN.churchBell(t, 53, 4, .8); [[.6, 4], [.9, 2], [1.2, 0], [1.5, -1], [1.8, 0]].forEach(([d, s]) => IN.musicbox(t + d, dg(77, s), .3, .7)); nz(t, 2.6, 'lowpass', 500, .7, .06, { a: 1, src: 'brown' }); },
  forest: (t) => { for (let i = 0; i < 6; i++) { const tt = t + .2 + i * rnd(.15, .35), f = rnd(2600, 4200); tone(tt, 'sine', f, .09, .025, { to: f * 1.35, slide: .05, vib: [30, 300, .01], pan: rnd(-.8, .8) }); } [[.4, 7, .3], [.7, 9, .3], [1, 12, .3], [1.3, 9, .9]].forEach(([d, s, len]) => IN.flute(t + d, dg(67, s), len, .75)); [0, 4, 7].forEach((d, i) => IN.harp(t + .4 + i * .08, dg(55, d), .6, .5)); },
  carnival: (t) => { [[0, 0], [.33, 4], [.5, 7], [.66, 4], [1, 2], [1.33, 5], [1.5, 9], [1.66, 5]].forEach(([d, s]) => IN.calliope(t + d, dg(72, s), .15, .8)); [0, 1].forEach(d => IN.bassDrum(t + d, .5)); },
  harbor: (t) => { nz(t, 2.6, 'lowpass', 700, .7, .09, { a: 1.1, src: 'brown' }); IN.tuba(t + .8, 41, 1.2, .7); IN.tuba(t + .8, 48, 1.2, .5); [[.3, 0], [.5, 2], [.7, 4], [1.1, 2], [1.5, 0]].forEach(([d, s]) => IN.accordion(t + d, dg(62, s), .18, .7)); [0, .5].forEach(d => tone(t + 1.6 + d, 'sine', 2200, .4, .02, { to: 1400, vib: [9, 60, .05], pan: .5 })); },
  foundry: (t) => { for (let i = 0; i < 6; i++) { ring(t + i * .28, 700 * V(.05), .3, .06, { parts: [[1, 1], [2.7, .5], [5.1, .2]] }); IN.taiko(t + i * .28, .35); } ring(t + 1.9, 1400, 1, .09); IN.distGuitar(t + 1.9, 28, .6, .6); },
  hospital: (t) => { [0, .9, 1.8].forEach(d => tone(t + d, 'sine', 1000, .12, .035)); IN.theremin(t + .3, 81, 1.6, .7); [[.2, 4], [.6, 3], [1, 1], [1.4, 0]].forEach(([d, s]) => IN.musicbox(t + d, dg(69, s, MIN) + (Math.random() < .5 ? .3 : 0), .3, .6)); },
  starship: (t) => { IN.supersaw(t, [48, 55, 60], 1.6, .6); riser(t + .2, t + 1.5, 300, 7000, .08); for (let i = 0; i < 8; i++) IN.synthPluck(t + 1.5 + i * .07, dg(72, [0, 4, 7, 11, 14, 11, 7, 4][i], LYD), .1, .6); IN.sub(t + 1.5, 28, .8, .8); },
  hell: (t) => { crackle(t, 2.6, 900, .1, { a: .8 }); rumble(t, 2.6, .18, { f: 180 }); chordOf(38, [0, 1, 4], PHR).forEach(m => IN.organ(t + .2, m, 2.2, .7)); IN.choirAh(t + .4, [50, 51, 57], 2.2, .8, { a: .8 }); },
  casino: (t) => { for (let i = 0; i < 14; i++) IN.woodblock(t + i * (.05 + i * .006), 91, .4); [[1.2, [53, 57, 60, 64]], [1.5, [55, 59, 62, 65]], [1.8, [53, 57, 60, 64]]].forEach(([d, ch]) => ch.forEach(m => IN.piano(t + d, m, .3, .6))); },
});

// ═════════ 配乐导演 ═════════
// 看着游戏（window.__mcg）选背景：开场和标题是房间里的雨声；基地是基地主题（离混沌来袭越近层数越多，
// 明天转进小调、鼓换成心跳和时钟，今天只剩心跳和嗡鸣）；守城用它「今天」的那一层；
// 地图、战斗、小游戏是原来那段低音嗡鸣。换日后在下一小节切层；有音高的音效跟着换调（明天起 D 小调）。
const MUS = (() => {
  const BPM = 84, SPB = 60 / BPM, STEP = SPB / 4, BAR = SPB * 4, SWING = .2;
  const C = (at, len, root, pad, name) => ({ at, len, root, pad, name });
  const CALM = [
    [C(0, 16, 34, [58, 62, 65, 69, 72])], [C(0, 16, 36, [58, 62, 65, 67, 70])], [C(0, 16, 33, [55, 60, 64, 67, 71])], [C(0, 16, 38, [57, 60, 64, 65, 69])],
    [C(0, 16, 31, [58, 62, 65, 69, 74])], [C(0, 16, 36, [58, 62, 64, 69])], [C(0, 16, 41, [57, 60, 64, 67, 72])], [C(0, 8, 37, [56, 60, 65, 68]), C(8, 8, 36, [58, 61, 64, 67])],
  ];
  const DARK = [
    [C(0, 16, 34, [58, 62, 64, 69])], [C(0, 16, 31, [58, 62, 65, 69])], [C(0, 16, 38, [57, 62, 64, 65])], [C(0, 16, 33, [55, 58, 61, 64])],
    [C(0, 16, 34, [58, 62, 64, 69])], [C(0, 16, 31, [58, 62, 64, 67])], [C(0, 16, 36, [57, 62, 65, 69])], [C(0, 8, 39, [58, 62, 67, 69]), C(8, 8, 33, [55, 58, 61, 64])],
  ];
  // 主旋律 [小节, 起点, 音, 长度]：开头是「回家」的动机 C F G → A；小调版 A D E → F
  const MEL = [[0,0,81,10],[0,10,79,2],[0,12,77,2],[0,14,79,2],[1,0,77,6],[1,6,74,2],[1,8,72,8],[2,0,76,2],[2,2,79,2],[2,4,81,8],[2,12,79,2],[2,14,76,2],[3,0,77,8],[3,10,72,2],[3,12,77,2],[3,14,79,2],[4,0,81,6],[4,6,82,2],[4,8,81,4],[4,12,79,2],[4,14,77,2],[5,0,76,6],[5,6,77,2],[5,8,79,8],[6,0,76,6],[6,6,77,2],[6,8,81,8],[7,0,80,6],[7,6,79,2],[7,8,76,2],[7,10,72,2],[7,12,77,2],[7,14,79,2],[8,0,81,4],[8,4,84,4],[8,8,86,6],[8,14,84,2],[9,0,82,6],[9,6,81,2],[9,8,79,6],[9,14,77,2],[10,0,76,6],[10,6,79,2],[10,8,83,4],[10,12,81,4],[11,0,81,6],[11,6,77,2],[11,8,76,4],[11,12,74,2],[11,14,76,2],[12,0,77,6],[12,6,79,2],[12,8,81,4],[12,12,82,2],[12,14,84,2],[13,0,86,6],[13,6,84,2],[13,8,82,4],[13,12,81,2],[13,14,79,2],[14,0,81,6],[14,6,79,2],[14,8,77,8],[15,0,77,4],[15,4,80,4],[15,8,79,2],[15,10,72,2],[15,12,77,2],[15,14,79,2]];
  const MEL_D = [[0,0,69,2],[0,2,74,2],[0,4,76,2],[0,6,77,10],[1,0,74,12],[3,0,73,8],[3,8,70,8],[4,0,69,2],[4,2,74,2],[4,4,76,2],[4,6,77,6],[4,12,79,4],[5,0,76,8],[5,8,74,8],[6,0,77,4],[6,4,76,4],[6,8,74,8],[7,0,74,8],[7,8,73,8]];
  const ARP = [0,2,3,2, 1,3,2,1, 0,2,3,2, 1,3,2,1];
  // 每个声部在 5 层（还有 4 天 / 3 天 / 2 天 / 明天 / 今天）的音量
  const LV = { pad: [1, .9, .85, .9, 0], keys: [1, 1, 1, .75, 0], bass: [.75, 1, 1, 1, .9], drums: [0, .85, 1, 1, 1], bell: [.7, .9, 1, .85, 0], chip: [0, 0, 1, .7, 0], amb: [1, 1, .9, 1, 1], chaos: [0, 0, 0, 1, 1] };
  const REVS = { pad: .45, keys: .22, bass: .03, drums: .1, bell: .55, chip: .22, amb: .35, chaos: .5 }, DLYS = { keys: .08, bell: .22, chip: .32 };
  const GRP = { pad: 'duck', keys: 'duck', bass: 'bass', drums: 'mix', bell: 'wow', chip: 'duck', amb: 'mix', chaos: 'mix' };
  let ac = null, built = false, BUS, REVm, DLYm, WOW, DUCK_A, DUCK_B, W25, W12, NOISE, CRACK, BROWN, DIPb, STING, SREV, SDLY;
  const L = {};
  let on = false, bar = 0, level = 0, nextBarT = 0, pend = null, drone = null, ambSrc = [], hist = [];
  const mt = m => 440 * Math.pow(2, (m - 69) / 12), R = (a, b) => a + Math.random() * (b - a);
  const bq = (type, f) => { const b = ac.createBiquadFilter(); b.type = type; b.frequency.value = f; return b; };
  const pn = p => { const s = ac.createStereoPanner(); s.pan.value = p; return s; };
  const lfo = (f, depth, param) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = f; g.gain.value = depth; o.connect(g); g.connect(param); o.start(); return o; };
  const shaper = k => { const s2 = ac.createWaveShaper(), n = 2048, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(k * x) / k; } s2.curve = c; s2.oversample = '2x'; return s2; };
  const pw = d => { const N = 48, re = new Float32Array(N), im = new Float32Array(N); for (let n = 1; n < N; n++) re[n] = 2 * Math.sin(Math.PI * n * d) / (Math.PI * n); return ac.createPeriodicWave(re, im); };
  const snd = (n, bus, amt) => { const g = ac.createGain(); g.gain.value = amt; n.connect(g); g.connect(bus); };
  const D = id => L[id].in;
  function build() {
    if (built) return; ac = A(); built = true; const sr = ac.sampleRate;
    NOISE = P.NOISE;
    BROWN = ac.createBuffer(1, sr * 6, sr); { const d = BROWN.getChannelData(0); let b = 0; for (let i = 0; i < d.length; i++) { b = (b + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = b * 3.2; } }
    CRACK = ac.createBuffer(2, sr * 4, sr);
    for (let c = 0; c < 2; c++) { const d = CRACK.getChannelData(c); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * .0025; for (let i = 0; i < d.length; i++) if (Math.random() < 7 / sr) { const a = Math.pow(Math.random(), 2) * .08 * (Math.random() < .5 ? -1 : 1), n = 6 + Math.random() * 40 | 0; for (let k = 0; k < n && i + k < d.length; k++) d[i + k] += a * Math.exp(-k / (n / 4)); } let p = 0, px = 0; for (let i = 0; i < d.length; i++) { const x = d[i]; p = .995 * (p + x - px); px = x; d[i] = p; } }
    DIPb = ac.createBuffer(1, Math.floor(sr * .6), sr); { const d = DIPb.getChannelData(0); for (let i = 0; i < d.length; i++) { const t = i / sr; d[i] = -(t < .008 ? t / .008 : Math.exp(-(t - .008) / .09)); } }
    W25 = pw(.25); W12 = pw(.125);
    BUS = ac.createGain(); BUS.gain.value = .55; BUS.connect(P.MUSB);          // 配乐整体比音效低一截，让音效站在前面
    // 配乐用自己的 3.2 秒大混响（和「地下灯火」试听版同一个）；音效那边的混响短，互不影响
    REVm = ac.createConvolver(); {
      const n = Math.floor(sr * 3.2), b = ac.createBuffer(2, n, sr), pre = Math.floor(sr * .018);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let lp = 0; for (let i = pre; i < n; i++) { const x = (i - pre) / (n - pre), k = .85 - .7 * x; lp += k * ((Math.random() * 2 - 1) - lp); d[i] = lp * Math.pow(1 - x, 2.2) * Math.exp(-x * 2.5); } [.007, .013, .019, .027, .034].forEach((e, j) => { const i = pre + Math.floor(sr * e * (c ? 1.13 : 1)); if (i < n) d[i] += (j % 2 ? -.5 : .6) / (1 + j * .5); }); }
      REVm.buffer = b; const hp = bq('highpass', 180), o = ac.createGain(); o.gain.value = .9; REVm.connect(hp); hp.connect(o); o.connect(BUS);
    }
    DLYm = ac.createGain(); { const hp = bq('highpass', 320), dl = ac.createDelay(2), dr = ac.createDelay(2), fb = ac.createGain(), lp = bq('lowpass', 2600), pl = pn(-.7), pr = pn(.7), o = ac.createGain(); dl.delayTime.value = dr.delayTime.value = SPB * .75; fb.gain.value = .36; o.gain.value = .55; DLYm.connect(hp); hp.connect(dl); dl.connect(pl); pl.connect(o); dl.connect(dr); dr.connect(pr); pr.connect(o); dr.connect(lp); lp.connect(fb); fb.connect(dl); o.connect(BUS); }
    WOW = ac.createGain(); { const wd = ac.createDelay(.1); wd.delayTime.value = .014; lfo(.42, .0011, wd.delayTime); lfo(5.8, .00005, wd.delayTime); WOW.connect(wd); wd.connect(BUS); }
    DUCK_A = ac.createGain(); DUCK_A.connect(WOW); DUCK_B = ac.createGain(); DUCK_B.connect(BUS);
    Object.keys(LV).forEach(id => {
      const x = L[id] = {}; x.head = ac.createGain(); let tail = x.head;
      if (id === 'keys') { const sh = shaper(2.5), ap = ac.createStereoPanner(); x.lp = bq('lowpass', 5200); x.lp.Q.value = .5; lfo(3.1, .32, ap.pan); tail.connect(sh); sh.connect(x.lp); x.lp.connect(ap); tail = ap; }
      if (id === 'bass') { const sh = shaper(3), lp = bq('lowpass', 1100); tail.connect(sh); sh.connect(lp); tail = lp; }
      if (id === 'drums') { const sh = shaper(1), lp = bq('lowpass', 9500); tail.connect(sh); sh.connect(lp); tail = lp; }
      x.auto = ac.createGain(); x.auto.gain.value = 0; tail.connect(x.auto);
      x.auto.connect(GRP[id] === 'duck' ? DUCK_A : GRP[id] === 'bass' ? DUCK_B : GRP[id] === 'wow' ? WOW : BUS);
      if (REVS[id]) snd(x.auto, REVm, REVS[id]); if (DLYS[id]) snd(x.auto, DLYm, DLYS[id]);
    });
  }
  function kill(g, t) { g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + .8); setTimeout(() => { try { g.disconnect(); } catch (e) {} }, 1500); }
  function session() {
    const t = ac.currentTime;
    Object.keys(L).forEach(id => { const x = L[id]; if (x.in) kill(x.in, t); x.in = ac.createGain(); x.in.connect(x.head); });
    [STING, SREV, SDLY].forEach(g => g && kill(g, t));
    SREV = ac.createGain(); SREV.connect(REVm); SDLY = ac.createGain(); SDLY.connect(DLYm); STING = ac.createGain(); STING.connect(BUS); snd(STING, SREV, .3);
    ambSrc.forEach(s2 => { try { s2.stop(t + .9); } catch (e) {} }); ambSrc = [];
    if (drone) stopDrone(t);
  }
  // ── 音色 ──
  function oo(g, dest, o) { let last = g; if (o.pan) { const p2 = pn(o.pan); g.connect(p2); last = p2; } last.connect(dest); if (o.rev) snd(last, SREV, o.rev); if (o.dly) snd(last, SDLY, o.dly); }
  function tn(t, type, f, dur, pk, dest, o) { o = o || {}; const os = ac.createOscillator(); if (type === 'pulse') os.setPeriodicWave(o.wave || W25); else os.type = type; os.frequency.setValueAtTime(f, t); if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || dur)); if (o.detune) os.detune.value = o.detune; const g = ac.createGain(), a = o.a || .002; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur); let n = os; if (o.lp) { const fl = bq('lowpass', o.lp); os.connect(fl); n = fl; } n.connect(g); oo(g, dest, o); os.start(t); os.stop(t + dur + .03); }
  function ns(t, dur, type, f, q, pk, dest, o) { o = o || {}; const s2 = ac.createBufferSource(); s2.buffer = NOISE; s2.loop = true; const fl = bq(type, f); fl.Q.value = q; if (o.to) fl.frequency.exponentialRampToValueAtTime(o.to, t + dur); const g = ac.createGain(), a = o.a || .001; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(pk, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + dur); s2.connect(fl); fl.connect(g); oo(g, dest, o); s2.start(t, Math.random() * 1.5); s2.stop(t + dur + .02); }
  function pad(t, notes, dur, cutoff, lvl, dest) { const f = bq('lowpass', cutoff * .45); f.Q.value = .6; f.frequency.setValueAtTime(cutoff * .45, t); f.frequency.linearRampToValueAtTime(cutoff, t + Math.min(1.6, dur * .5)); const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(lvl, t + .7); g.gain.setValueAtTime(lvl, t + dur); g.gain.setTargetAtTime(.0001, t + dur, .45); f.connect(g); g.connect(dest); const end = t + dur + 2.6; notes.forEach((m, i) => [-1, 1].forEach(sd => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = mt(m); o.detune.value = sd * (6 + i); const p2 = pn(sd * .45); o.connect(p2); p2.connect(f); o.start(t); o.stop(end); })); }
  function ep(t, m, dur, v, dest) { const f = mt(m), c = ac.createOscillator(), mo = ac.createOscillator(), mg = ac.createGain(), tno = ac.createOscillator(), tg = ac.createGain(), g = ac.createGain(); c.frequency.value = f; mo.frequency.value = f; tno.frequency.value = f * 14; const I = f * (.6 + 1.4 * v); mg.gain.setValueAtTime(I, t); mg.gain.setTargetAtTime(I * .15, t, .35); tg.gain.setValueAtTime(f * 1.2 * v, t); tg.gain.setTargetAtTime(0, t, .025); mo.connect(mg); mg.connect(c.frequency); tno.connect(tg); tg.connect(c.frequency); const pk = .12 * v; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(pk, t + .005); g.gain.setTargetAtTime(pk * .3, t + .005, .6); g.gain.setTargetAtTime(.0001, t + dur, .09); c.connect(g); g.connect(dest); const end = t + dur + .6; [c, mo, tno].forEach(o => { o.start(t); o.stop(end); }); }
  function bl(t, m, dur, v, dest) { const f = mt(m), c = ac.createOscillator(), mo = ac.createOscillator(), mg = ac.createGain(), c2 = ac.createOscillator(), g2 = ac.createGain(), fl = ac.createOscillator(), fg = ac.createGain(), g = ac.createGain(), sum = ac.createGain(); c.frequency.value = f; mo.frequency.value = f * 3.5; c2.frequency.value = f * 2; fl.frequency.value = f; mg.gain.setValueAtTime(f * 1.1 * v, t); mg.gain.setTargetAtTime(f * .04, t, .22); mo.connect(mg); mg.connect(c.frequency); const pk = .15 * v, hold = Math.max(.07, dur); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(pk, t + .003); g.gain.setTargetAtTime(.0001, t + .003, .5 + Math.min(dur, 1.5) * .3); g2.gain.setValueAtTime(.0001, t); g2.gain.linearRampToValueAtTime(pk * .3, t + .003); g2.gain.setTargetAtTime(.0001, t + .003, .25); fg.gain.setValueAtTime(.0001, t); fg.gain.linearRampToValueAtTime(pk * .26, t + .06); fg.gain.setValueAtTime(pk * .26, t + hold); fg.gain.setTargetAtTime(.0001, t + hold, .12); c.connect(g); c2.connect(g2); fl.connect(fg); g.connect(sum); g2.connect(sum); fg.connect(sum); sum.connect(dest); const end = t + Math.max(dur + .8, 2.6); [c, mo, c2, fl].forEach(o => { o.start(t); o.stop(end); }); }
  function chp(t, m, dur, v, kind) { const o = ac.createOscillator(); o.setPeriodicWave(kind === 'lead' ? W12 : W25); o.frequency.value = mt(m); const fl = bq('lowpass', kind === 'arp' ? 3200 : kind === 'pulse' ? 1300 : 2600), g = ac.createGain(); if (kind === 'lead') { const pk = .12 * v; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(pk, t + .012); g.gain.setTargetAtTime(pk * .7, t + .012, .2); g.gain.setTargetAtTime(.0001, t + dur, .05); if (dur > .3) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(0, t + .18); lg.gain.linearRampToValueAtTime(14, t + .5); l.connect(lg); lg.connect(o.detune); l.start(t); l.stop(t + dur + .3); } } else { const pk = (kind === 'pulse' ? .16 : .14) * v; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(pk, t + .003); g.gain.setTargetAtTime(.0001, t + .003, kind === 'pulse' ? .05 : .07); } o.connect(fl); fl.connect(g); g.connect(D('chip')); o.start(t); o.stop(t + dur + .4); }
  function bs(t, m, dur, v, soft, dest) { const f = mt(m), o = ac.createOscillator(), o2 = ac.createOscillator(), g2 = ac.createGain(), g = ac.createGain(); o.frequency.setValueAtTime(f * (soft ? 1 : 1.03), t); if (!soft) o.frequency.exponentialRampToValueAtTime(f, t + .03); o2.type = 'triangle'; o2.frequency.value = f; g2.gain.value = .45; const a = soft ? .06 : .006, pk = .17 * v; g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(pk, t + a); g.gain.setTargetAtTime(pk * .65, t + a, .3); g.gain.setTargetAtTime(.0001, t + dur, .05); o.connect(g); o2.connect(g2); g2.connect(g); g.connect(dest || D('bass')); const end = t + dur + .4; o.start(t); o.stop(end); o2.start(t); o2.stop(end); }
  function duckAt(t, depth) { [DUCK_A, DUCK_B].forEach(d => { const s2 = ac.createBufferSource(), g = ac.createGain(); s2.buffer = DIPb; g.gain.value = depth; s2.connect(g); g.connect(d.gain); s2.start(t); }); }
  function kick(t, v, heart, dest) { dest = dest || D('drums'); const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(heart ? 90 : 150, t); o.frequency.exponentialRampToValueAtTime(heart ? 38 : 46, t + (heart ? .12 : .09)); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.6 * v, t + .004); g.gain.exponentialRampToValueAtTime(.0001, t + (heart ? .5 : .42)); o.connect(g); g.connect(dest); o.start(t); o.stop(t + .55); if (!heart) ns(t, .012, 'highpass', 2500, .7, .1 * v, dest); if (dest === D('drums')) duckAt(t, heart ? .3 : .42 * Math.min(1, v)); }
  function snare(t, v, dest) { dest = dest || D('drums'); ns(t, .2, 'bandpass', 1900, .7, .3 * v, dest, { rev: .15 }); ns(t, .09, 'highpass', 5000, .5, .1 * v, dest); tn(t, 'triangle', 200, .11, .22 * v, dest, { to: 160, slide: .08 }); }
  const rim = (t, v) => { tn(t, 'triangle', 830, .05, .14 * v, D('drums'), { to: 760 }); ns(t, .03, 'bandpass', 3200, 2, .1 * v, D('drums')); };
  const hat = (t, v, open) => ns(t, open ? .3 : .045, 'highpass', 7800, .6, (open ? .08 : .1) * v, D('drums'), { pan: .22 });
  const shk = (t, v) => ns(t, .07, 'bandpass', 6500, 1.2, .06 * v, D('drums'), { a: .015, pan: -.3 });
  const tik = (t, hi) => { const p2 = hi ? -.45 : .45; ns(t, .02, 'bandpass', hi ? 3600 : 2700, 5, .25, D('drums'), { pan: p2 }); tn(t, 'sine', hi ? 1900 : 1500, .03, .05, D('drums'), { pan: p2 }); };
  const tom = (t, v, dest) => { tn(t, 'sine', 120, .7, .5 * v, dest, { to: 55, slide: .25, rev: .35 }); ns(t, .18, 'lowpass', 700, .7, .22 * v, dest, { rev: .3 }); };
  const drip = (t, m, v) => tn(t, 'sine', mt(m) * .72, .14, .07 * v, D('amb'), { to: mt(m) * 1.3, slide: .05, pan: R(-.7, .7), rev: .9 });
  function rub(t, dur, v) { const g = ac.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.011 * v, t + dur * .5); g.gain.linearRampToValueAtTime(.0001, t + dur); oo(g, D('chaos'), { rev: .6 }); [[69, 0, -.5], [69, 20, .5], [62, -10, 0]].forEach(([m, c2, p2]) => { const o = ac.createOscillator(), q = pn(p2); o.frequency.value = mt(m); o.detune.value = c2; o.connect(q); q.connect(g); o.start(t); o.stop(t + dur + .05); }); }
  function startDrone(t) { const g = ac.createGain(), f = bq('lowpass', 200); f.Q.value = 4; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.035, t + 2.5); const lf = lfo(.07, 140, f.frequency); const os = [[26, -7, 'sawtooth'], [26, 7, 'sawtooth'], [33, 0, 'sawtooth'], [38, 0, 'sine']].map(([m, d, ty]) => { const o = ac.createOscillator(); o.type = ty; o.frequency.value = mt(m); o.detune.value = d; o.connect(f); o.start(t); return o; }); f.connect(g); g.connect(D('chaos')); drone = { g, os: os.concat(lf) }; }
  // 混沌层的低音：一段 3 小节的涨落（涨 1.2 小节、落 1.8 小节），不是一直开着
  function swell(t, dur, v) { const g = ac.createGain(), f = bq('lowpass', 160); f.Q.value = 3; f.frequency.setValueAtTime(160, t); f.frequency.linearRampToValueAtTime(420, t + dur * .4); f.frequency.linearRampToValueAtTime(160, t + dur); g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(.03 * v, t + dur * .4); g.gain.linearRampToValueAtTime(.0001, t + dur); [[26, -7, 'sawtooth'], [26, 7, 'sawtooth'], [38, 0, 'sine']].forEach(([m, d, ty]) => { const o = ac.createOscillator(); o.type = ty; o.frequency.value = mt(m); o.detune.value = d; o.connect(f); o.start(t); o.stop(t + dur + .05); }); f.connect(g); g.connect(D('chaos')); }
  function stopDrone(t) { const d = drone; drone = null; d.g.gain.setTargetAtTime(.0001, t, .5); d.os.forEach(o => o.stop(t + 3)); }
  function startAmb(t) { const a = ac.createBufferSource(), ag = ac.createGain(); a.buffer = CRACK; a.loop = true; ag.gain.value = .55; a.connect(ag); ag.connect(D('amb')); a.start(t); const r = ac.createBufferSource(), rf = bq('lowpass', 110), rg = ac.createGain(); r.buffer = BROWN; r.loop = true; rg.gain.value = 0; r.connect(rf); rf.connect(rg); rg.connect(D('amb')); r.start(t); ambSrc = [a, r]; }   // 地层低鸣关掉：不要持续的嗡
  // ── 编曲：一次排一小节 ──
  const slotOf = (slots, st) => slots.find(x => st >= x.at && st < x.at + x.len) || slots[0];
  function setLevel(lv, t) { level = lv; Object.keys(L).forEach(id => L[id].auto.gain.setTargetAtTime(LV[id][lv], t, .06)); L.keys.lp.frequency.setTargetAtTime(lv >= 3 ? 1500 : 5200, t, .4); if (drone) stopDrone(t); }
  function doBar(t) {
    if (pend && t >= pend.nb - 1e-3) { const p2 = pend; pend = null; setLevel(p2.lv, t); }
    const lv = level, b = bar, prog = lv >= 3 ? DARK : CALM, slots = prog[b % 8], has = id => LV[id][lv] > 0;
    const Sx = st => t + st * STEP + (st % 2 && lv < 3 ? SWING * STEP : 0);
    if (has('pad')) slots.forEach(sl => pad(t + sl.at * STEP, sl.pad, sl.len * STEP + .1, [1800, 2200, 2600, 1200][lv], .036, D('pad')));
    if (has('keys')) { const hits = (lv === 0 || lv >= 3) ? slots.map(sl => [sl.at, sl.len - 2, lv === 0 ? .6 : .5]) : b % 2 ? [[0, 3, .85], [3, 3, .5], [8, 6, .72], [14, 2, .45]] : [[0, 5, .85], [6, 3, .55], [10, 5, .7]]; for (const [st, len, v] of hits) { const sl = slotOf(slots, st), l = Math.min(len, sl.at + sl.len - st), t0 = Sx(st); sl.pad.slice(-4).forEach((m, i) => ep(t0 + i * .011 + R(0, .004), m, l * STEP, v * R(.88, 1.05), D('keys'))); } }
    if (has('bass')) {
      if (lv === 0) slots.forEach(sl => bs(Sx(sl.at), sl.root, sl.len * STEP * .96, .55, true));
      else if (lv >= 3) { for (const [st, len, v] of [[0, 2, .95], [3, 4, .7], [8, 2, .9], [11, 4, .65]]) bs(Sx(st), lv === 4 ? 38 : slotOf(slots, st).root, len * STEP, v); }
      else { const nxt = prog[(b + 1) % 8][0].root, appr = r => nxt > r ? nxt - 1 : nxt + 1; if (slots.length === 1) { const r = slots[0].root; bs(Sx(0), r, 5 * STEP, 1); bs(Sx(7), r, 2 * STEP, .65); bs(Sx(10), r + 7, 3 * STEP, .8); bs(Sx(14), appr(r), 2 * STEP, .7); } else slots.forEach((sl, k) => { bs(Sx(sl.at), sl.root, 5 * STEP, 1); bs(Sx(sl.at + 6), k ? appr(sl.root) : sl.root + 12, 2 * STEP, .65); }); }
    }
    if (has('drums')) {
      const fill = b % 8 === 7;
      if (lv === 1) { kick(Sx(0), 1); kick(Sx(10), .75); rim(Sx(4), .8); rim(Sx(12), .8); if (fill) { rim(Sx(14), .45); rim(Sx(15), .35); } for (let st = 0; st < 16; st += 2) hat(Sx(st), st % 4 ? .35 : .55); }
      else if (lv === 2) { kick(Sx(0), 1); kick(Sx(7), .6); kick(Sx(10), .9); if (b % 4 === 3) kick(Sx(15), .5); snare(Sx(4), 1); if (fill) [[12, .45], [13, .55], [14, .7], [15, .85]].forEach(([st, v]) => snare(Sx(st), v)); else snare(Sx(12), 1); if (b % 2) snare(Sx(9), .16); for (let st = 0; st < 16; st++) { if (st === 14 && b % 4 === 3) hat(Sx(st), .55, true); else hat(Sx(st), [.6, .22, .4, .26][st % 4]); } for (let st = 2; st < 16; st += 4) shk(Sx(st), .7); }
      else { const k = lv === 4 ? 1.15 : 1; kick(Sx(0), k, true); kick(Sx(3), .65 * k, true); kick(Sx(8), .95 * k, true); kick(Sx(11), .6 * k, true); if (lv === 3) for (let st = 0; st < 16; st += 2) tik(Sx(st), (st / 2) % 2 === 0); if (lv === 4 ? b % 2 : b % 4 === 3) { tom(Sx(12), .8, D('drums')); tom(Sx(14), 1, D('drums')); } }
    }
    if (has('bell')) { const v = [.6, .85, .95, .8, 0][lv], src = lv >= 3 ? MEL_D.filter(n => n[0] === b % 8) : MEL.filter(n => n[0] === b); for (const [, st, m, len] of src) bl(Sx(st), m, len * STEP, v * R(.9, 1.05), D('bell')); }
    if (has('chip')) { if (lv === 2) { for (let st = 0; st < 16; st++) { const ns2 = slotOf(slots, st).pad.slice(-4); chp(Sx(st), ns2[ARP[st] % ns2.length], STEP * .9, st % 4 ? .5 : .9, 'arp'); } for (const [, st, m, len] of MEL.filter(n => n[0] === b)) chp(Sx(st), m, len * STEP * .92, .75, 'lead'); } else if (lv === 3) for (let st = 0; st < 16; st++) { if (st % 4 === 0) chp(Sx(st), slotOf(slots, st).root + 24, STEP * .55, .7, 'pulse'); }; }
    if (has('amb')) { let n = Math.random() < .6 ? 1 : 0; if (Math.random() < .25) n++; for (let i = 0; i < n; i++) { const st = Math.random() * 16 | 0, p2 = slotOf(slots, st).pad; drip(Sx(st), p2[Math.random() * p2.length | 0] + 24, R(.5, 1)); } }
    if (has('chaos') && b % 8 === 4) rub(t, BAR, lv === 4 ? .8 : .55);   // 每 8 小节飘过一次，不再一直叫
    if (has('chaos') && b % 4 === 0) swell(t, BAR * 3, lv === 4 ? 1 : .7);   // 低音每 4 小节涨落一次，不再一直嗡
    hist.push(t); if (hist.length > 4) hist.shift();
    bar = (b + 1) % 16;
  }
  // 进场一小节：full 是从标题进基地（投币、原来的嗡鸣涨起来、arpeggio 爬升、军鼓滚奏、落拍展开）；soft 是出征回来
  function sting(T0, full) {
    const T = T0 + BAR, Sg = STING;
    if (full) { tn(T0, 'pulse', mt(83), .09, .1, Sg, { wave: W25, lp: 5000 }); tn(T0 + .085, 'pulse', mt(88), .5, .1, Sg, { wave: W25, lp: 5000, rev: .4, dly: .3 }); }
    [[55, 'triangle'], [82.4, 'sawtooth'], [110, 'triangle']].forEach(([f, ty], i) => { const o = ac.createOscillator(), lp = bq('lowpass', 420), g = ac.createGain(); o.type = ty; o.frequency.value = f; o.detune.value = (i - 1) * 6; g.gain.setValueAtTime(.0001, T0 + .2); g.gain.linearRampToValueAtTime(full ? .035 : .02, T - .2); g.gain.setTargetAtTime(.0001, T, .35); o.connect(lp); lp.connect(g); g.connect(Sg); o.start(T0 + .2); o.stop(T + 2.5); });
    if (full) { [58, 62, 65, 69, 72, 74, 77, 81, 84, 86, 89, 93].forEach((m, i) => tn(T0 + (4 + i) * STEP, 'pulse', mt(m), .16, .03 + .035 * i / 11, Sg, { wave: W25, lp: 2200 + i * 400, dly: .35 })); for (let i = 0; i < 8; i++) snare(T - SPB + i * SPB / 8, .15 + .1 * i, Sg); }
    [[10, 72], [12, 77], [14, 79]].forEach(([st, m]) => bl(T0 + st * STEP, m, 2 * STEP, full ? .95 : .7, Sg));
    tn(T, 'sine', 95, 1.4, full ? .5 : .3, Sg, { to: 32, slide: .5 }); ns(T, full ? 2.4 : 1.4, 'highpass', 5200, .5, full ? .1 : .05, Sg, { rev: .5 });
    if (full) [82, 86, 89, 93].forEach((m, i) => bl(T + i * .035, m, 1.5, .5, Sg));
  }
  function pump() {
    if (!on || !ac) return;
    const now = ac.currentTime, ahead = document.hidden ? 1.6 : .35;
    if (nextBarT < now - .05) nextBarT = now + .1;
    while (nextBarT < now + ahead) { doBar(nextBarT); nextBarT += BAR; }
  }
  if (typeof document !== 'undefined') setInterval(pump, 40);
  return {
    get on() { return on; },
    start(lv, how) { build(); session(); const T0 = ac.currentTime + .1; bar = 0; pend = null; level = lv; nextBarT = T0 + (how ? BAR : .05); setLevel(lv, T0); startAmb(T0 + .3); if (how) sting(T0, how === 'full'); on = true; },
    stop() { if (!on) return; on = false; pend = null; Object.keys(LV).forEach(id => L[id].auto.gain.setTargetAtTime(0, ac.currentTime, .5)); session(); },
    level(lv) { if (!on) return; if ((pend ? pend.lv : level) !== lv) pend = { lv, nb: 0 }; },
    get lv() { return level; },
  };
})();
// 地图、战斗、小游戏的底：原来那段低音嗡鸣（开场第一次点击就有的那个声音）
const BED = (() => {
  let nodes = null;
  return {
    start(t) { return;   // 地图、战斗、小游戏暂时不放背景（用户裁定 2026-09-25：不要持续的嗡声），以后写战斗音乐
      if (nodes) return; const ac = A(), g = ac.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 2.5); g.connect(P.MUSB); const w = ac.createGain(); w.gain.value = .6; g.connect(w); w.connect(P.REV);
      const os = [55, 82.4, 110, 164.8].map((f, i) => { const o = ac.createOscillator(), og = ac.createGain(), lp = P.biquad('lowpass', 300); o.type = i % 2 ? 'sawtooth' : 'triangle'; o.frequency.value = f; o.detune.value = (i - 1.5) * 6; og.gain.value = .011; o.connect(lp); lp.connect(og); og.connect(g); o.start(t); return o; });
      nodes = { g, os }; },
    stop(t) { if (!nodes) return; const n = nodes; nodes = null; n.g.gain.setTargetAtTime(0, t, .5); n.os.forEach(o => o.stop(t + 3)); },
  };
})();
// 场景：房间 / 基地 / 守城 / 底（地图、战斗、小游戏）/ 没有
// 地图、战斗配乐总线的音量（实测调平：地图比基地配乐低 3 dB 左右，战斗再低一点，让打击声站在前面）
// 排程提前 1 秒：切到别的标签页时计时器会降到 1 秒一次，也不会断音
const MAPG = .6, BATG = .4;
// ═════════ 地图配乐「出征」═════════
// 用户裁定 2026-09-25：地图不要柔和的，要动态的鼓点、像战歌；不要尖硬的琴声（不用八音盒、竖琴、拨弦、钟琴、木琴）。
// D 小调，112 拍，16 小节一轮：前 4 小节鼓和低音弦乐的冲锋节奏先起来，5~8 小节主旋律，
// 9~12 小节弦乐和圆号的和弦顶上去、太鼓加倍，13~16 小节旋律再来一遍、更高，第 8、16 小节最后一拍军鼓加花。
// 隔一轮的 5~8 小节不唱旋律，换成和弦铺底。主奏乐器按世界换，全是吹奏、拉奏这类软起音的乐器。
const MAPM = (() => {
  const BPM = 112, SPB = 60 / BPM, S16 = SPB / 4, BAR = SPB * 4;
  // 和弦 [低音, 中音区的三个音]
  const Dm = [50, [57, 62, 65]], Bb = [46, [58, 62, 65]], Cc = [48, [55, 60, 64]], Aa = [45, [57, 61, 64]];
  const PROG = [Dm, Dm, Bb, Cc, Dm, Bb, Cc, Aa, Bb, Cc, Dm, Dm, Bb, Cc, Dm, Aa];
  // 旋律 [小节, 第几个十六分音符, 音, 长度（十六分音符）]
  const MEL = [[3, 12, 57, 2], [3, 14, 60, 2],
    [4, 0, 62, 4], [4, 4, 69, 6], [4, 10, 67, 2], [4, 12, 65, 4], [5, 0, 65, 6], [5, 6, 62, 2], [5, 8, 65, 4], [5, 12, 70, 4],
    [6, 0, 69, 6], [6, 6, 67, 2], [6, 8, 64, 4], [6, 12, 67, 4], [7, 0, 69, 10],
    [11, 12, 69, 2], [11, 14, 72, 2],
    [12, 0, 74, 6], [12, 6, 72, 2], [12, 8, 70, 4], [12, 12, 69, 4], [13, 0, 67, 6], [13, 6, 69, 2], [13, 8, 72, 8],
    [14, 0, 77, 6], [14, 6, 76, 2], [14, 8, 74, 4], [14, 12, 69, 4], [15, 0, 73, 8], [15, 8, 76, 6]];
  // 低音弦乐的冲锋节奏：一个八分音符 + 两个十六分音符
  const GALLOP = { 0: 1, 2: 1, 3: 1, 4: 1, 6: 1, 7: 1, 8: 1, 10: 1, 11: 1, 12: 1, 14: 1, 15: 1 };
  // 每个世界的主奏；lo 是移几个半音
  const LOOK = {
    town: { lead: 'horn' }, forest: { lead: 'flute' }, park: { lead: 'calliope' }, harbor: { lead: 'accordion' },
    foundry: { lead: 'trombone', lo: -12 }, ward: { lead: 'theremin' }, starship: { lead: 'trumpet' }, hell: { lead: 'cello', lo: -12 }, casino: { lead: 'trumpet' },
  };
  let on = false, bus = null, W = LOOK.town, wk = 'town', st = 0, pass = 0, nextT = 0;
  const hat = (t, v) => nz(t, .03, 'highpass', 8000, .7, v, { dest: bus });
  function doStep(t) {
    const bar = (st >> 4) % 16, s = st & 15, ch = PROG[bar], B = bar >= 8, fill = bar === 7 || bar === 15, odd = pass % 2 === 1;
    const dry = { dest: bus, rev: 0 }, wet = { dest: bus, rev: .08 };
    // 鼓：大鼓 1、3 拍（单数小节加一个切分，每 4 小节最后加一个弱起），军鼓 2、4 拍，段落开头和后半段加太鼓，八分音符的高频沙声
    if (s === 0 || s === 8 || (bar % 2 && s === 6) || (bar % 4 === 3 && s === 14 && !fill)) IN.bassDrum(t, .6, dry);
    if ((s === 4 || s === 12) && !(fill && s === 12)) IN.snare(t, .32, wet);
    if (fill && s >= 12) { IN.snare(t, .2 + (s - 12) * .08, wet); if (s === 12 || s === 14) IN.taiko(t, .45, wet); }
    if ((s === 0 && bar % 4 === 0) || (B && (s === 0 || s === 8))) IN.taiko(t, bar % 4 === 0 && s === 0 ? .6 : .38, wet);
    if (s % 4 === 2) hat(t, .022); else if (B && s % 2 === 1) hat(t, .01);
    // 低音弦乐冲锋 + 大号压根音
    if (GALLOP[s]) IN.stringsShort(t, ch[0], S16 * 1.6, s % 4 === 0 ? .55 : .34, wet);
    if (s === 0 || s === 8) IN.tuba(t, ch[0] - 12, SPB * 1.7, .38, dry);
    // 和弦：后半段（隔一轮的 5~8 小节也有）弦乐长音 + 圆号五度
    if (s === 0 && (B || (odd && bar >= 4 && bar < 8))) { ch[1].forEach(m => IN.strings(t, m, BAR * .95, .22, { dest: bus, rev: .15, a: .25 })); IN.horn(t, ch[0] + 12, BAR * .9, .2, { dest: bus, rev: .12 }); IN.horn(t, ch[0] + 19, BAR * .9, .17, { dest: bus, rev: .12 }); }
    // 旋律
    if (!(odd && bar < 8)) MEL.forEach(([b, at, m, len]) => { if (b === bar && at === s) { const f = IN[W.lead]; if (f) f(t, m + (W.lo || 0), len * S16 * .92, at >= 12 && (b === 3 || b === 11) ? .38 : .5, { dest: bus, rev: .16 }); } });
    st++; if (st % 256 === 0) pass++;
  }
  function pump() {
    if (!on || !A()) return; const c0 = P.chNow(); P.setCh('music');
    try { while (nextT < A().currentTime + 1) { doStep(nextT); nextT += S16; } } finally { P.setCh(c0); }
  }
  if (typeof document !== 'undefined') setInterval(pump, 40);
  return {
    get on() { return on; }, get world() { return wk; },
    start(k) {
      const ac = A(); if (!ac) return; const t = ac.currentTime;
      if (bus) fadeBus(bus, t, .6);
      wk = LOOK[k] ? k : 'town'; W = LOOK[wk];
      bus = ac.createGain(); bus.gain.setValueAtTime(0, t); bus.gain.linearRampToValueAtTime(MAPG, t + 1.2); bus.connect(P.MUSB);
      st = 0; pass = 0; nextT = t + .1; on = true;
    },
    stop() { if (!on) return; on = false; fadeBus(bus, A().currentTime, 1.2); bus = null; },
  };
})();
// 配乐总线淡出：先让最后的音和混响自然收掉，再断开
function fadeBus(b, t, d) { b.gain.cancelScheduledValues(t); b.gain.setValueAtTime(b.gain.value, t); b.gain.setTargetAtTime(0, t, d / 3); setTimeout(() => { try { b.disconnect(); } catch (e) {} }, d * 1000 + 4000); }

// ═════════ 战斗配乐「战鼓」═════════
// 用户裁定 2026-09-25：进入战斗要激昂的鼓点，和打击声、技能声互相配合出爽点。
// 几乎全是鼓：太鼓群 + 大鼓 + 军鼓，低音弦乐按 3-3-2 的重音压着根音，每两小节一记铜管和弦；没有旋律，中高频留给打击声和技能声。
// D 小调带一个降 E（紧张），132 拍，8 小节一轮。第一小节空着留给进战的号角，最后一拍四下太鼓引进来；首领战和精英战多一层太鼓十六分音符和更密的军鼓。
// 放 1 级以上的技能时，配乐让一下（0.25 秒压到四成），下一个十六分音符补一记太鼓，像鼓手在回应技能。
const BATM = (() => {
  const BPM = 132, SPB = 60 / BPM, S16 = SPB / 4, BAR = SPB * 4;
  const PROG = [[38, [50, 57, 62]], [38, [50, 57, 62]], [39, [51, 58, 63]], [38, [50, 57, 62]], [34, [46, 53, 58]], [36, [48, 55, 60]], [39, [51, 58, 63]], [33, [45, 52, 57]]];
  const BIG = { 0: .7, 6: .5, 8: .6, 14: .5 }, SMALL = { 3: 1, 11: 1 }, STR = { 0: .45, 3: .4, 6: .4, 8: .45, 11: .4, 14: .4 };
  let on = false, bus = null, dk = null, st = 0, nextT = 0, t0 = 0, hot = false;
  const hat = (t, v) => nz(t, .025, 'highpass', 8500, .7, v, { dest: dk });
  function doStep(t) {
    const bar = (st >> 4) % 8, s = st & 15, ch = PROG[bar], dry = { dest: dk, rev: 0 }, wet = { dest: dk, rev: .06 };
    if (st < 16) {   // 第一小节空着留给进战的号角，最后一拍四下太鼓从弱到强引进来
      if (s >= 12) IN.taiko(t, .2 + .1 * (s - 12), wet);
      st++; return;
    }
    if (BIG[s]) IN.taiko(t, BIG[s], wet);
    if (SMALL[s] || (hot && s % 4 === 1)) IN.taiko(t, .26, wet);
    if (s === 0 || s === 8 || (hot && s === 10)) IN.bassDrum(t, .62, dry);
    if (s === 4 || s === 12) IN.snare(t, .38, wet);
    if (hot && (s === 13 || s === 15)) IN.snare(t, .14, wet);
    if (bar === 7 && s >= 12) IN.snare(t, .22 + (s - 12) * .08, wet);
    if (s % 2 === 0) hat(t, s % 4 === 2 ? .02 : .012);
    if (STR[s]) IN.stringsShort(t, ch[0] + 12, S16 * 1.5, STR[s], wet);
    if (s === 0) IN.tuba(t, ch[0], BAR * .85, .34, dry);
    if (s === 0 && bar % 2 === 0) ch[1].forEach(m => IN.horn(t, m, SPB * .9, .3, { dest: dk, rev: .1 }));
    st++;
  }
  function pump() {
    if (!on || !A()) return; const c0 = P.chNow(); P.setCh('music');
    try { while (nextT < A().currentTime + 1) { doStep(nextT); nextT += S16; } } finally { P.setCh(c0); }
  }
  if (typeof document !== 'undefined') setInterval(pump, 40);
  return {
    get on() { return on; },
    start(h) {
      const ac = A(); if (!ac) return; const t = ac.currentTime;
      if (bus) fadeBus(bus, t, .4);
      hot = !!h; bus = ac.createGain(); bus.gain.setValueAtTime(BATG, t); bus.connect(P.MUSB);
      dk = ac.createGain(); dk.connect(bus);
      st = 0; nextT = t0 = t + .05; on = true;
    },
    // 技能放出：配乐让一下，下一个十六分音符补一记太鼓
    hit(tier) {
      if (!on || !A()) return; const t = A().currentTime, g = dk.gain;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.setTargetAtTime(.4, t, .015); g.setTargetAtTime(1, t + .25, .08);
      IN.taiko(t0 + Math.ceil((t + .03 - t0) / S16) * S16, .45 + .15 * Math.min(2, tier | 0), { dest: bus, rev: .06 });
    },
    stop(d) { if (!on) return; on = false; fadeBus(bus, A().currentTime, d || .6); bus = null; },
  };
})();

const DIRM = S.musicDir = { scene: null, lv: 0 };
function sceneOf(g) { const s2 = g && g.screen; if (!s2 || s2 === 'intro' || s2 === 'menu' || s2 === 'room') return 'room'; if (s2 === 'base') return 'base'; if (s2 === 'raid') return 'raid'; if (s2 === 'world' || s2 === 'shop') return 'map'; if (s2 === 'battle') return 'battle'; if (s2 === 'over') return 'none'; return 'bed'; }
function baseLevel(m) { const MC = root.MC; if (!m || !MC) return 0; const E = MC.RAID_EVERY || 5; if (m.day % E === 0 && m.lastRaid !== m.day && (m.heroes || []).length) return 4; const left = E - (m.day % E); return left >= 4 ? 0 : left === 3 ? 1 : left === 2 ? 2 : 3; }
function setScene(sc, lv, wk, hot) {
  const prev = DIRM.scene, t = A().currentTime; DIRM.scene = sc;
  if (sc !== 'map') MAPM.stop();
  if (sc !== 'battle') BATM.stop();
  if (sc !== 'room') roomAmb(t, false);
  if (sc !== 'bed') BED.stop(t);
  if (sc !== 'base' && sc !== 'raid') MUS.stop();
  if (sc === 'room') roomAmb(t, true);
  else if (sc === 'bed') BED.start(t);
  else if (sc === 'map') MAPM.start(wk);
  else if (sc === 'battle') BATM.start(hot);
  else if (sc === 'base' || sc === 'raid') { if (MUS.on) MUS.level(lv); else MUS.start(lv, sc === 'raid' ? null : prev === 'room' ? 'full' : prev ? 'soft' : null); }
}
if (typeof document !== 'undefined') setInterval(() => {
  const g = root.__mcg; if (!A() || !g) return;
  const sc = sceneOf(g), lv = sc === 'raid' ? 4 : baseLevel(g.meta), wk = g.run && g.run.regionKey, hot = !!(g.node && (g.node.type === 'boss' || g.node.type === 'elite'));
  DIRM.lv = lv; S.setMood(lv >= 3 ? 'dark' : 'calm');
  if (sc !== DIRM.scene) setScene(sc, lv, wk, hot); else if (sc === 'battle') { if (g.battle && g.battle.over) BATM.stop(.5); } else if (sc === 'base' || sc === 'raid') MUS.level(lv); else if (sc === 'map' && MAPM.world !== wk && wk) MAPM.start(wk);
}, 250);
S.music = MUS; S.bed = BED; S.mapMusic = MAPM; S.battleMusic = BATM;
// 关掉所有持续的声音（房间环境、配乐、低音底）；试听页的按钮用
S.stopAll = function () { if (!A()) return; const t = A().currentTime; roomAmb(t, false); BED.stop(t); MUS.stop(); MAPM.stop(); BATM.stop(); DIRM.scene = null; };
// 旧接口：drone(true) 以前是开场点击时起的低音嗡鸣，现在场景由导演管，这里只把音频启动起来
S.drone = function () { S.init(); };
})(typeof window !== 'undefined' ? window : globalThis);
