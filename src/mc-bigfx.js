// ==== mc-bigfx.js ====
(function () {
// The big moments, redone for impact (user ruling 2026-09-25): the fight announcement (普通战 / 精英战 / 首领战 …),
// the victory, and the end-of-expedition screen.
// - Announcement: two blades slice in from the sides and cross, a white flash and a shockwave, the name slams down
//   from 3× with ghost trails and a colour split, speed lines keep streaming; 精英 gets a second blade, 首领 a red
//   vignette that beats and WARNING tapes top and bottom. It stays until both sides stand in place, then flies off.
// - Victory: flash, a ring of gold rays that turns, the letters drop in one by one and each lands with a ring and a
//   burst, sparks orbit the word, confetti rains. Then the word glides up and stays as the title of the settle stage:
//   a dark stage with turning rays, a gold band opens and the reward cards drop in one by one (flash, ring, sparks,
//   the number rolls up, a shine crosses), a rare drop has its own turning halo; the button rises last.
// - End screen: a dark stage lit by slowly turning rays in the result's colour, the title slams in, the finds pop in
//   one by one on dark cards, confetti for a clear.
// Everything is continuous (no stepped frames, §11.5).
const M = window.MC, G = M.Game.prototype, S = M.Sfx, P = M.PJ.PAL, U = M.UI;
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (t) => 1 - Math.pow(1 - cl(t, 0, 1), 3), eio = (t) => { t = cl(t, 0, 1); return t * t * (3 - 2 * t); };
const eback = (t) => { t = cl(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const TYPE = {
  normal:  { a: '#ffcf4a', b: '#e0781f', sub: '#fff3b0' },
  hold:    { a: '#47d6c1', b: '#1f7a82', sub: '#c8fff4' },
  extract: { a: '#47d6c1', b: '#1f7a82', sub: '#c8fff4' },
  elite:   { a: '#c070ff', b: '#e8434f', sub: '#f0d0ff' },
  boss:    { a: '#ff4a4a', b: '#5a0a1a', sub: '#ffd0d0' },
};
const rgba = (c, a) => { const [r, g, b] = M.hexRgb(c); return 'rgba(' + r + ',' + g + ',' + b + ',' + a.toFixed(3) + ')'; };
// a blade: a long slanted bar with a bright edge, sliding along its own axis
function blade(ctx, cx, cy, ang, len, th, col, hi, k) {
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(ang); const off = (1 - k) * 1600;
  ctx.fillStyle = P.ink; ctx.fillRect(-len / 2 - off - 6, -th / 2 - 6, len + 12, th + 12);
  ctx.fillStyle = col; ctx.fillRect(-len / 2 - off, -th / 2, len, th);
  ctx.fillStyle = hi; ctx.fillRect(-len / 2 - off, -th / 2, len, Math.max(4, th * 0.14));
  ctx.restore();
}
function rays(ctx, x, y, n, r, col, a, rot, w) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = col; ctx.globalAlpha = a;
  for (let i = 0; i < n; i++) { const q = rot + i * Math.PI * 2 / n; ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, q - w, q + w); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
function ring(ctx, x, y, r, th, col, a) { if (a <= 0) return; ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = col; ctx.lineWidth = th; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore(); }
// the name, slammed: ghosts behind, a colour split that closes, then the word itself with an outline
function slamText(ctx, txt, x, y, size, col, t, t0) {
  const q = (t - t0) / 0.3, sc = q < 1 ? 1 + 2 * Math.pow(1 - eo(q), 2) : 1 + 0.035 * Math.sin((t - t0 - 0.3) * 9) * Math.exp(-(t - t0 - 0.3) * 3), split = q < 1.6 ? 14 * (1 - eio(q / 1.6)) : 0;
  if (q < 0) return;
  for (let g = 3; g >= 1 && q < 1.2; g--) { ctx.save(); ctx.globalAlpha = 0.18 * (1 - q / 1.2) * g / 3; ctx.translate(x, y); ctx.scale(sc * (1 + g * 0.18), sc * (1 + g * 0.18)); U.text(ctx, txt, 0, 0, size, col); ctx.restore(); }
  if (split > 0.5) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; ctx.translate(x, y); ctx.scale(sc, sc); U.text(ctx, txt, -split, 0, size, '#ff2040'); U.text(ctx, txt, split, 0, size, '#20c8ff'); ctx.restore(); }
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); U.text(ctx, txt, 0, 0, size, col, { outline: true, ramp: true }); ctx.restore();
}
function drawIntro(ctx, b) {
  const t = b.t, T = TYPE[b.ftype] || TYPE.normal, X = 960, Y = b.y || 520, out = cl((b.life - t) / 0.35, 0, 1), boss = b.ftype === 'boss', elite = b.ftype === 'elite';
  if (out < 1 && !b._sOut) { b._sOut = 1; S.introOut(); }
  ctx.save();
  // the dark and, for a boss, the red beat at the edges
  M.fxDim(ctx, 0.55 * eio(t / 0.15) * out);
  if (boss) { const beat = 0.5 + 0.5 * Math.sin(t * 7); const g = ctx.createRadialGradient(X, Y, 300, X, Y, 1150); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, rgba('#ff1030', (0.35 + 0.25 * beat) * out)); ctx.fillStyle = g; ctx.fillRect(0, 0, 1920, 1080); }
  // speed lines streaming out of the centre
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 26; i++) { const a = i * 2.39996, p = ((t * 1.6 + i * 0.137) % 1), r0 = 200 + p * 1100, len = 120 + p * 260; ctx.globalAlpha = 0.35 * (1 - p) * out * eio(t / 0.2); ctx.strokeStyle = i % 3 ? '#ffffff' : T.a; ctx.lineWidth = 3 + (i % 3) * 2; ctx.beginPath(); ctx.moveTo(X + Math.cos(a) * r0, Y + Math.sin(a) * r0 * 0.6); ctx.lineTo(X + Math.cos(a) * (r0 + len), Y + Math.sin(a) * (r0 + len) * 0.6); ctx.stroke(); } ctx.restore();
  // the blades: in fast, cross, then drift; on the way out they fly off
  const kin = eo(t / 0.2);
  ctx.globalAlpha = out; blade(ctx, X, Y, -0.18, 2600, boss ? 190 : 150, T.b, T.a, kin - (1 - out) * 0.6);
  blade(ctx, X, Y + 8, Math.PI - 0.18 + 0.36, 2600, boss ? 120 : 90, T.a, '#ffffff', kin - (1 - out) * 0.6);
  if (elite || boss) blade(ctx, X, Y - 4, 0.12, 2600, 40, '#ffffff', T.a, eo((t - 0.08) / 0.2) - (1 - out) * 0.6);
  // WARNING tapes for a boss
  if (boss) { ctx.globalAlpha = out * eio(t / 0.25); [[120, 1], [960, -1]].forEach(([yy, dir]) => { ctx.fillStyle = P.ink; ctx.fillRect(0, yy - 30, 1920, 60); ctx.fillStyle = '#ffcf4a'; ctx.fillRect(0, yy - 24, 1920, 48); const sh = (t * 260 * dir) % 180; for (let x = -180; x < 2100; x += 180) { ctx.fillStyle = P.ink; ctx.beginPath(); ctx.moveTo(x + sh, yy - 24); ctx.lineTo(x + sh + 60, yy - 24); ctx.lineTo(x + sh + 20, yy + 24); ctx.lineTo(x + sh - 40, yy + 24); ctx.closePath(); ctx.fill(); } for (let x = 0; x < 1920; x += 480) { const tx = ((x + t * 180 * dir) % 2400 + 2400) % 2400 - 240; ctx.fillStyle = P.ink; ctx.fillRect(tx - 110, yy - 22, 220, 44); U.text(ctx, 'WARNING', tx, yy, 34, '#ffcf4a'); } }); ctx.globalAlpha = 1; }
  // impact: flash and shockwave where the blades cross
  const it = t - 0.18; if (it > 0) { ctx.save(); ctx.globalAlpha = 0.9 * (1 - eo(it / 0.18)); ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 1920, 1080); ctx.restore(); ring(ctx, X, Y, 60 + eo(it / 0.5) * 900, 26 * (1 - eo(it / 0.5)) + 2, T.a, (1 - eio(it / 0.5)) * out); ring(ctx, X, Y, 30 + eo(it / 0.7) * 600, 10, '#ffffff', (1 - eio(it / 0.7)) * 0.8 * out); }
  // the name and its line
  ctx.globalAlpha = out; const w0 = U.measure(ctx, b.text, 150), size = w0 > 1500 ? Math.floor(150 * 1500 / w0) : 150;
  ctx.save(); if (out < 1) { ctx.translate(X, Y); ctx.scale(1 + (1 - out) * 0.8, 1 - (1 - out) * 0.6); ctx.translate(-X, -Y); } slamText(ctx, b.text, X, Y - 10, size, T.a, t, 0.14); ctx.restore();
  if (b.sub && t > 0.45) { const q = eo((t - 0.45) / 0.3); ctx.globalAlpha = q * out; U.text(ctx, b.sub, X + (1 - q) * 200, Y + 110, 42, T.sub, { outline: true }); }
  ctx.restore();
}
// the word is drawn on its own canvas first so a shine can cross just the letters
let VC = null;
function drawVictory(ctx, b) {
  const t = b.t, X = 960, txt = [...String(b.text)], gold = b.col || '#ffd970';
  // the settle panel takes the stage: the word glides up to the top and stays until the panel closes
  if (b.stay && b.alive && !b.alive() && !b._end) { b._end = 1; b.life = t + 0.3; }
  const out = cl((b.life - t) / 0.3, 0, 1), k = b.stay ? eio((t - 1.05) / 0.45) : 0, Y = 420 - 170 * k, tsc = 1 - 0.28 * k + (k >= 1 ? 0.015 * Math.sin((t - 1.5) * 2.4) : 0);
  // 声音逐拍跟着横幅的 t 走（胜利横幅可以点击快进）：白闪、每个字掉下和落地、火花、纸片、最后一个字落地后铜管收尾
  const s = b._s || (b._s = {}), beat = (key, at, fn) => { if (t >= at && !s[key]) { s[key] = 1; fn(); } };
  beat('flash', 0, () => S.vic('flash')); txt.forEach((ch, i) => { beat('d' + i, 0.08 + i * 0.1, () => S.vic('drop', i)); beat('l' + i, 0.36 + i * 0.1, () => S.vic('land', i)); });
  beat('sparks', 0.3, () => S.vic('sparks')); beat('conf', 0.45, () => S.vic('confetti')); beat('phrase', 0.5 + (txt.length - 1) * 0.1, () => S.vic('phrase'));
  ctx.save();
  // the dark and the rays belong to the banner until the panel's stage fades in (it has its own)
  M.fxDim(ctx, 0.45 * eio(t / 0.2) * out * (1 - k));
  if (t < 0.25) { ctx.globalAlpha = 0.85 * (1 - t / 0.25); ctx.fillStyle = '#fff6d0'; ctx.fillRect(0, 0, 1920, 1080); ctx.globalAlpha = 1; }
  rays(ctx, X, Y, 16, 1200, gold, 0.16 * eio(t / 0.3) * out * (1 - k), t * 0.6, 0.07); rays(ctx, X, Y, 16, 800, '#ffffff', 0.08 * eio(t / 0.3) * out * (1 - k), -t * 0.9, 0.035);
  const gr = 420 - 160 * k, g = ctx.createRadialGradient(X, Y, 20, X, Y, gr); g.addColorStop(0, rgba(gold, 0.5 * out * (1 - 0.4 * k))); g.addColorStop(1, rgba(gold, 0)); ctx.fillStyle = g; ctx.fillRect(X - gr, Y - gr, gr * 2, gr * 2);
  // letters drop in one by one; each landing rings
  const OW = 1100, OH = 700, OX = OW / 2, OY = 380;
  if (!VC) { VC = document.createElement('canvas'); VC.width = OW; VC.height = OH; }
  const o = VC.getContext('2d'); o.setTransform(1, 0, 0, 1, 0, 0); o.clearRect(0, 0, OW, OH); o.globalCompositeOperation = 'source-over';
  const size = 180, cw = txt.map(ch => U.measure(o, ch, size) + 10), tw = cw.reduce((a, c) => a + c, 0); let px = OX - tw / 2;
  const rings = [];
  txt.forEach((ch, i) => {
    const t0 = 0.08 + i * 0.1, q = (t - t0) / 0.28, cx = px + cw[i] / 2; px += cw[i]; if (q < 0) return;
    const y = OY - (1 - eback(q)) * 260, sc = q < 1 ? 1.8 - 0.8 * eback(q) : 1 + 0.05 * Math.sin((t - t0) * 10) * Math.exp(-(t - t0 - 0.28) * 4), wob = Math.sin(t * 3 + i) * 4 * eio((t - t0 - 0.3) / 0.3);
    if (q >= 1) rings.push([cx - OX, t - t0 - 0.28]);
    o.save(); o.translate(cx, y + wob); o.scale(sc, sc); U.text(o, ch, 0, 0, size, gold, { outline: true, ramp: true }); o.restore();
  });
  // a shine sweeps across the letters, once after they land and then every 2.6 s
  const sp = t > 0.9 ? ((t - 0.9) % 2.6) / 0.7 : 2; if (sp < 1) { o.globalCompositeOperation = 'source-atop'; const sx = -300 + sp * (OW + 600), sg = o.createLinearGradient(sx - 120, 0, sx + 120, 0); sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.75)'); sg.addColorStop(1, 'rgba(255,255,255,0)'); o.fillStyle = sg; o.save(); o.translate(sx, OY); o.transform(1, 0, -0.35, 1, 0, 0); o.fillRect(-120, -OY, 240, OH); o.restore(); o.globalCompositeOperation = 'source-over'; }
  ctx.save(); ctx.translate(X, Y); ctx.scale(tsc, tsc);
  rings.forEach(([rx, lq]) => ring(ctx, rx, 60, 20 + eo(lq / 0.45) * 220, 12 * (1 - eo(lq / 0.45)) + 1, gold, (1 - eio(lq / 0.45)) * out));
  ctx.globalAlpha = out; ctx.drawImage(VC, -OX, -OY);
  // sparks orbiting the word
  ctx.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) { const a = t * 2.2 + i * 0.449, r = 330 + 40 * Math.sin(t * 3 + i); const x = Math.cos(a) * r, y = Math.sin(a) * r * 0.42; ctx.globalAlpha = 0.8 * out * eio((t - 0.3) / 0.3); ctx.fillStyle = i % 2 ? '#ffffff' : gold; ctx.fillRect(x - 5, y - 5, 10, 10); }
  ctx.restore();
  if (b.sub && t > 0.5) { ctx.globalAlpha = eo((t - 0.5) / 0.3) * out * (1 - k); U.text(ctx, b.sub, X, Y + 150, 40, '#fff3b0', { outline: true }); }
  ctx.restore();
}
const oDB = M.drawBanner;
M.drawBanner = function (ctx, b) { if (b.kind === 'intro') return drawIntro(ctx, b); if (b.kind === 'victory') return drawVictory(ctx, b); return oDB.apply(this, arguments); };

// the announcement: same timing as before (it waits for the walk-in), new look, with its hits and sounds
const oBB = G.beginBattle;
G.beginBattle = function (n) {
  const r = oBB.apply(this, arguments), B = this.introBanner; if (!B || !n) return r;
  B.kind = 'intro'; B.ftype = n.type === 'boss' ? 'boss' : n.type === 'elite' ? 'elite' : n.type === 'extract' ? 'extract' : this.cfg && this.cfg.mode === 'hold' ? 'hold' : 'normal'; B.life = Math.max(B.life, 1.7);
  const boss = B.ftype === 'boss';
  S.battleIntro(B.ftype);   // 整段声音一次排好：刀光 0–0.2 秒、交叉 0.18 秒、名字 0.44 秒落定、首领的警戒带和三下心跳
  setTimeout(() => { if (this.introBanner !== B) return; this.fx.kick && this.fx.kick(boss ? 34 : B.ftype === 'elite' ? 24 : 16); this.fx.explode && this.fx.explode(960, 520, (TYPE[B.ftype] || TYPE.normal).a, boss ? 2 : 1.3); }, 180);
  return r;
};
// the victory: the settle banner of a won fight becomes the new show
const oSS = G.startSettle;
G.startSettle = function () {
  const r = oSS.apply(this, arguments), st = this.settle; if (!st || !st.good) return r;
  const B = [...this.banners].reverse().find(b => b.kind === 'win' && b.text === st.title); if (B) { B.kind = 'victory'; B.life = 1e6; B.y = 420; B.stay = 1; B.alive = () => this.settle === st; st.vic = 1; }
  setTimeout(() => { this.fx.confetti && this.fx.confetti(90, { x: 960, y: 300 }); }, 450);
  return r;
};
// each reward card lands with a burst and a small shake; a rare drop lands bigger; the last one closes with a coin run
const oST = G.settleTick;
G.settleTick = function (dt) {
  const st = this.settle, n0 = st ? st.shown : 0; oST.apply(this, arguments); if (!st || !st.tiles) return;
  if (!st.vic && st.t > 1.62 && st.t - dt <= 1.62) this.fx.kick(10);   // the defeat title lands in the DOM (no banner of its own)
  const land = st._land || (st._land = []);
  for (let i = n0; i < st.shown; i++) land.push({ i, at: st.t + 0.26 });
  while (land.length && st.t >= land[0].at) {
    const { i } = land.shift(), tl = st.tiles[i]; if (!tl) continue; const p = M.settleCardPos(i, st.tiles.length), qi = (M.QUALITY || []).findIndex(Q => Q.c === tl.c), rare = !!tl.key && qi >= 2;
    this.fx.burst(p.x, p.y, tl.c, rare ? 26 : 14, { v: rare ? 520 : 360, s: 9, life: 0.55 }); this.fx.ring(p.x, p.y, 40, rare ? 260 : 150, tl.c, rare ? 10 : 6, 0.45);
    if (rare) { this.fx.explode(p.x, p.y, tl.c, 1); this.fx.kick(12); S.cue && S.cue('ui_big'); } else this.fx.kick(4);
    if (i === st.tiles.length - 1) { S.settleTotal && S.settleTotal(); this.fx.kick(8); }
  }
};
// the stage behind the cards: dark, with slowly turning rays and a glow where the title sits
const oVS = G.view;
G.view = function () {
  const v = oVS.call(this), st = this.settle;
  if (st && v.st) {
    const t = st.t, f = eio((t - 1.2) / 0.3), bq = cl((t - 1.28) / 0.34, 0, 1), dq = eo((t - 1.35) / 0.5), btq = cl((t - 1.8) / 0.35, 0, 1), col = st.col || '#ffd970';
    Object.assign(v.st, { bgOp: f.toFixed(3), raysOp: (f * (st.good ? 1 : 0.6)).toFixed(3), rays: rgba(col, st.good ? 0.16 : 0.12), glow: rgba(col, st.good ? 0.34 : 0.22), titleOn: !st.vic, tsc: (t < 1.9 ? 1.8 - 0.8 * eback((t - 1.55) / 0.35) : 1).toFixed(3), tOp: cl((t - 1.55) / 0.12, 0, 1).toFixed(3),
      divW: Math.round(760 * dq), divH: Math.round(380 * dq), dmSc: (eback(cl((t - 1.4) / 0.3, 0, 1))).toFixed(3), bandSc: (0.02 + 0.98 * eback(bq)).toFixed(3), bandOp: cl(bq * 3, 0, 1).toFixed(3), sweepX: Math.round(-400 + 2700 * cl((t - 1.5) / 0.9, 0, 1)),
      btnY: Math.round(60 * (1 - eback(btq))), btnOp: btq.toFixed(3), color: col });
  }
  return v;
};

// ───────── the end screen ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), e = this.endInfo;
  if (v.end && e && this.screen === 'end') {
    const t = (performance.now() - (e.at || 0)) / 1000, col = e.color || '#ffd970', dead = /死亡/.test(e.title || '');
    v.end.tsc = (t < 0.35 ? 2.6 - 1.6 * eback(t / 0.35) : 1 + 0.03 * Math.sin(t * 2.4)).toFixed(3); v.end.top = Math.round(dead ? 0 : -8 * Math.sin(t * 1.6));
    v.end.glow = rgba(col, dead ? 0.22 : 0.35); v.end.glowA = rgba(col, dead ? 0.28 : 0.42); v.end.col = col;
    if (!e._fx) { S.endScreen(dead || /失败/.test(e.title || '') ? 'dead' : /撤离/.test(e.title || '') ? 'evac' : 'clear', (v.end.tiles || []).map(tl => { const i = (M.QUALITY || []).findIndex(q => q.c === tl.c); return i >= 0 ? i : 1; })); }
    if (!e._fx) { e._fx = 1; if (!dead) { setTimeout(() => { this.fx.flash && this.fx.flash('#ffffff', 0.4); this.fx.kick && this.fx.kick(20); }, 250); setTimeout(() => this.fx.confetti && this.fx.confetti(160, { x: 960, y: 200 }), 400); } }
    (v.end.tiles || []).forEach((tl, i) => { const q = cl((t - 0.55 - i * 0.14) / 0.35, 0, 1); tl.op = q; tl.sc = (0.2 + 0.8 * eback(q)).toFixed(3); tl.glow = rgba(tl.c || col, 0.55 * q); });
  }
  return v;
};
})();

;
