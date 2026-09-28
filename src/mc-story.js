// ==== mc-story.js ====
(function () {
// The story, told in a little show (user ruling 2026-09-26: 「进入章节，击杀大boss后，都要有仪式感，可以在屏幕中间要出现一段动画，讲一段简单的
// 剧情，可跳过。并且游戏中所有有剧情的地方都做类似处理，中间屏幕简短动画+剧情，首次观看不可跳过，之后可跳过」).
// · When: the prologue starts; an expedition sets out into an area of a chapter; an area's final boss falls (what comes
//   next: the next area, or the end of the chapter).
// · How: the screen darkens, a framed picture opens in the middle — the area's final boss in the dark, lit little by little
//   (an area opening), or sinking away in dust (its fall) — and the lines type out under it.
// · The first time a story is seen it cannot be skipped (the lines have to finish); after that a click skips it.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, DB = M.DB, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), RM = () => !!(M.PJ && M.PJ.reduced);
const seen = (g) => { const p = g.prof; if (!p) return {}; p.story = p.story && typeof p.story === 'object' ? p.story : {}; return p.story; };
G.storyPush = function (o) { if (!o || !o.id) return; if ((this.storyQ = this.storyQ || []).some(x => x.id === o.id)) return; this.storyQ.push(o); };
// what the chapters say
const chapN = (w) => { const i = (M.CHAPTER_ORDER || []).indexOf(w); return i >= 0 ? '第 ' + (i + 1) + ' 章 · ' + ((M.WORLDS[w] || {}).n || '') : ''; };
M.storyArea = (w, a) => a && ({ id: 'area:' + w + ':' + a.n, title: chapN(w), sub: a.n, lines: [a.story], boss: a.boss, mode: 'dark' });
M.storyFall = function (w, fb) {
  const L = (M.CHAPTERS || {})[w] || [], i = L.findIndex(a => a.boss === fb), a = L[i], nx = L[i + 1], d = DB[fb] || {}, O = M.CHAPTER_ORDER || [], wi = O.indexOf(w);
  const lines = [(d.n || '首领') + '倒下了。'];
  if (nx) lines.push('前面是「' + nx.n + '」：' + nx.story);
  else lines.push('第 ' + (wi + 1) + ' 章到这里结束了。' + (O[wi + 1] && M.WORLDS[O[wi + 1]] ? '下一章：' + M.WORLDS[O[wi + 1]].n + '。' : ''));
  return { id: 'fall:' + fb, title: a ? a.n : '', sub: '', lines, boss: fb, mode: 'fall' };
};
// when
const oEW = G.enterWorld;
G.enterWorld = function () {
  const run = this.run, m = this.meta, r = oEW.apply(this, arguments);
  if (run && this._storyRun !== run) { this._storyRun = run;
    if (run.region && run.region.tut) this.storyPush({ id: 'tut', title: '序章', sub: '', lines: ['走廊尽头有一扇门。', '门后面，有一台午夜才亮起来的老虎机。'], mode: 'door' });
    else if (run.chap && M.sceneOf) { const a = M.sceneOf(m, run.chap.w); const o = M.storyArea(run.chap.w, a); m.storyIn = m.storyIn || {}; if (o && !m.storyIn[o.id]) { m.storyIn[o.id] = 1; this.storyPush(o); } } }   /* an area's story once a game */
  return r;
};
const oSettle = G.startSettle;
G.startSettle = function () {
  const n = this.node, b = this.battle, run = this.run, r = oSettle.apply(this, arguments);
  if (n && n.fb && b && b.over === 'clear' && run && run.chap) this.storyPush(M.storyFall(run.chap.w, n.fb));
  return r;
};
// ───────── the show ─────────
const X0 = 360, Y0 = 170, W = 1200, H = 560, CPS = 20;
const framed = (fb) => { try { const T = M.TITAN, P = M.bossPortrait && M.bossPortrait(fb, 700, 460); return P || (T && T.frame ? T.frame(fb, 'idle', 0) : null); } catch (e) { return null; } };   // a redrawn boss: its portrait (mc-bossart.js)
// the figure darkened on its own canvas, so the sky around it stays as it is
function shade(F, im, bw, bh, lit) {
  const c = F.sh || (F.sh = document.createElement('canvas')); c.width = bw; c.height = bh; const g = c.getContext('2d');
  g.drawImage(im, 0, 0, bw, bh); g.globalCompositeOperation = 'source-atop'; g.globalAlpha = 1 - lit; g.fillStyle = '#07060f'; g.fillRect(0, 0, bw, bh); return c;
}
function door(x, T) {
  const cx = X0 + W / 2, fy = Y0 + H - 90, dw = 170, dh = 250, op = cl((T - 0.4) / 2.2, 0, 1), gap = dw * op * op;
  // light spilling out along the floor, then the doorway
  x.globalAlpha = 0.35 * op; x.fillStyle = '#ffcf4a'; x.beginPath(); x.moveTo(cx - gap / 2, fy); x.lineTo(cx + gap / 2, fy); x.lineTo(cx + gap * 1.6, Y0 + H); x.lineTo(cx - gap * 1.6, Y0 + H); x.fill();
  x.globalAlpha = 1; x.fillStyle = '#2b2461'; x.fillRect(cx - dw / 2 - 16, fy - dh - 16, dw + 32, dh + 16); x.fillStyle = '#ffe9a8'; x.fillRect(cx - dw / 2, fy - dh, dw, dh);
  x.fillStyle = '#1a1438'; x.fillRect(cx - dw / 2, fy - dh, (dw - gap) / 2, dh); x.fillRect(cx + gap / 2, fy - dh, (dw - gap) / 2, dh);
  x.fillStyle = '#ffcf4a'; if (op < 1) { x.fillRect(cx - dw / 2 + (dw - gap) / 2 - 16, fy - dh / 2, 6, 14); x.fillRect(cx + gap / 2 + 10, fy - dh / 2, 6, 14); }
  // the machine inside, once the door is open: a cabinet with three lit reels
  if (op > 0.5) { const k = cl((op - 0.5) * 2, 0, 1); x.globalAlpha = k; x.fillStyle = '#3a1a2a'; x.fillRect(cx - 44, fy - 150, 88, 150); x.fillStyle = '#ff5a8a'; x.fillRect(cx - 44, fy - 150, 88, 8);
    for (let i = 0; i < 3; i++) { x.fillStyle = (Math.floor(T * 6) + i) % 3 ? '#f4efe0' : '#ffcf4a'; x.fillRect(cx - 34 + i * 24, fy - 120, 20, 30); }
    x.fillStyle = '#ffcf4a'; x.fillRect(cx - 30, fy - 70, 60, 10); x.globalAlpha = 1; }
}
function scene(ctx, F, T) {
  const o = F.o, x = ctx; x.save(); x.beginPath(); x.rect(X0, Y0, W, H); x.clip();
  const g = x.createLinearGradient(0, Y0, 0, Y0 + H); g.addColorStop(0, '#07060f'); g.addColorStop(1, o.mode === 'fall' ? '#3a1a2a' : '#1a1640'); x.fillStyle = g; x.fillRect(X0, Y0, W, H);
  for (let i = 0; i < 60; i++) { const sx = X0 + (i * 211) % W, sy = Y0 + (i * 97) % (H * 0.6), tw = 0.5 + 0.5 * Math.sin(T * 2 + i); x.globalAlpha = 0.3 + 0.5 * tw; x.fillStyle = i % 7 ? '#6a63b4' : '#f4efe0'; x.fillRect(sx, sy, 3, 3); } x.globalAlpha = 1;
  x.fillStyle = '#0c0a1c'; x.fillRect(X0, Y0 + H - 90, W, 90); x.fillStyle = '#2b2461'; x.fillRect(X0, Y0 + H - 90, W, 4);
  const im = F.img;
  if (im) {
    const bw = im.bw || im.width, bh = im.bh || im.height, s = Math.min(460 / bh, 700 / bw) * (o.mode === 'fall' ? 1 : 1 + 0.04 * Math.min(1, T / 6)), dx = X0 + W / 2 - bw * s / 2, base = Y0 + H - 60;
    let dy = base - bh * s; if (o.mode === 'fall') dy += Math.min(1, Math.max(0, (T - 0.8) / 3.5)) ** 2 * 380;
    x.save(); x.imageSmoothingEnabled = false;
    const lit = o.mode === 'dark' ? cl((T - 0.5) / 3, 0, 1) * 0.75 : 1;
    x.globalAlpha = o.mode === 'fall' ? 1 - cl((T - 3.2) / 1.2, 0, 1) : 1; x.drawImage(lit < 1 ? shade(F, im, bw, bh, lit) : im, dx, dy, bw * s, bh * s);
    x.restore();
    if (o.mode === 'dark' && lit < 0.6) { const e = cl((T - 0.2) / 0.6, 0, 1) * (1 - lit / 0.6), k = (im.width / bw) || 1, fo = im.focus || [0, -300]; x.globalAlpha = e * (0.6 + 0.4 * Math.sin(T * 5)); x.fillStyle = '#ff3a3a'; const ex = dx + ((im.cx || bw * k / 2) + fo[0]) / k * s, ey = dy + ((im.footY || bh * k) + fo[1]) / k * s; x.fillRect(ex - 22, ey, 12, 5); x.fillRect(ex + 10, ey, 12, 5); x.globalAlpha = 1; }
    if (o.mode === 'fall') for (let i = 0; i < 24; i++) { const q = (T * 0.6 + i / 24) % 1, px = X0 + W / 2 + Math.sin(i * 7.1) * 300 * q, py = base - q * 160; x.globalAlpha = (1 - q) * 0.6; x.fillStyle = i % 2 ? '#8a6a50' : '#c8a080'; x.fillRect(px, py, 8, 8); } x.globalAlpha = 1;
  } else door(x, T);
  x.restore();
}
function draw(ctx, F) {
  const T = F.t, o = F.o, out = F.out != null ? cl((T - F.out) / 0.35, 0, 1) : 0; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  const dk = cl(T / 0.35, 0, 1) * (1 - out); U.dim(ctx, dk); ctx.globalAlpha = 0.7 * dk; U.R(ctx, 0, 0, 1920, 1080, P.ink); ctx.globalAlpha = 1 - out;
  const op = RM() ? 1 : cl(T / 0.45, 0, 1); ctx.save(); ctx.translate(960, 450); ctx.scale(0.9 + 0.1 * op, 0.9 + 0.1 * op); ctx.translate(-960, -450);
  U.R(ctx, X0 - 14, Y0 - 14, W + 28, H + 28, P.ink); U.R(ctx, X0 - 8, Y0 - 8, W + 16, H + 16, P.gold); scene(ctx, F, T); ctx.restore();
  if (o.title) U.text(ctx, o.title, X0 + 24, Y0 - 34, 34, P.gold, { outline: true, align: 'left' });
  if (o.sub) U.text(ctx, o.sub, X0 + W - 24, Y0 - 34, 34, P.cream, { outline: true, align: 'right' });
  // the lines, typed
  const all = o.lines.join('\n'), n = Math.floor(Math.max(0, T - 0.6) * CPS); let shown = all.slice(0, n), y = Y0 + H + 70;
  shown.split('\n').forEach((ln) => { wrap(ctx, ln, W - 40, 32).forEach(t => { U.text(ctx, t, 960, y, 32, P.cream, { outline: true }); y += 46; }); });
  const done = n >= all.length; F.done = done;
  const hint = done && T > F.doneAt + 0.6 ? '点击继续' : F.skip ? '点击跳过' : '';
  if (hint) { ctx.globalAlpha = (1 - out) * (0.55 + 0.45 * Math.abs(Math.sin(T * 3))); U.text(ctx, hint, 960, 1040, 26, P.lavender || '#a9a3c9', { outline: true }); }
  ctx.restore();
}
function wrap(ctx, s, max, size) { ctx.save(); ctx.font = U.font ? U.font(size) : size + 'px sans-serif'; const out = []; let line = ''; for (const ch of String(s)) { if (ctx.measureText(line + ch).width > max && line) { out.push(line); line = ch; } else line += ch; } if (line) out.push(line); ctx.restore(); return out; }
const ok = (g) => ['world', 'end', 'base'].includes(g.screen) && !g.settle && !g.bigFx && !g.parade && !g.modal && !g.evoFx && !g.mini && !g.trans && !g.reel;
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments);
  if (!this.storyFx && this.storyQ && this.storyQ.length && ok(this)) { const o = this.storyQ.shift(), sn = seen(this); this.storyFx = { t: 0, o, skip: !!sn[o.id], img: o.boss ? framed(o.boss) : null, doneAt: 1e9 }; sn[o.id] = 1; this.saveProfile && this.saveProfile(); S.whoosh && S.whoosh(0.4); }
  const F = this.storyFx; if (!F) return r;
  if (this.keys) Object.keys(this.keys).forEach(k => { this.keys[k] = false; });   // nobody walks while it plays
  const t0 = F.t; F.t += dt || 0; if (F.done && F.doneAt > 1e8) F.doneAt = F.t;
  if (Math.floor(F.t * CPS) !== Math.floor(t0 * CPS) && !F.done && F.t > 0.6 && S.tick) S.tick(Math.floor(F.t * CPS) % 8);
  if (F.o.mode === 'fall' && t0 < 1 && F.t >= 1 && S.boom) S.boom();
  if (F.out != null && F.t - F.out > 0.35) { this.storyFx = null; this.bump(); return r; }
  const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (fc) { try { draw(fc.getContext('2d'), F); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('story: ' + e.message); this.storyFx = null; } }
  return r;
};
// a click: once the lines are done, go on; a story seen before can be skipped at any time
G.storyClick = function () { const F = this.storyFx; if (!F || F.out != null) return; if (F.skip || (F.done && F.t > F.doneAt + 0.6)) { F.out = F.t; S.click && S.click(); } };
const oView = G.view;
G.view = function () { const v = oView.call(this); if (this.storyFx) { v.fxZ = 88; v.coverOn = true; v.coverClick = () => this.storyClick(); } return v; };
const oLS = G.longShow; if (oLS) G.longShow = function () { return !!this.storyFx || oLS.apply(this, arguments); };
// only the base is locked while a story plays (on the chapter's end page the story's own click layer takes the clicks —
// 2026-09-27: after 守墓人 the base lock sat over the end page and swallowed every click)
const oBusy = G.baseBusy; if (oBusy) G.baseBusy = function () { return (!!this.storyFx && this.screen === 'base') || oBusy.apply(this, arguments); };
// the map does not walk on while a story is told
const oWT = G.worldTap; if (oWT) G.worldTap = function () { if (this.storyFx) return false; return oWT.apply(this, arguments); };
// keys and pads: Enter / Space / Esc go on, like a click
const oKey = G.handleKey;
G.handleKey = function (ev) {
  if (this.storyFx && ev && ev.type === 'keydown') { const k = ev.code || ev.key; if (/Enter|Space|Escape|KeyJ/.test(k)) this.storyClick(); ev.preventDefault && ev.preventDefault(); return; }
  if (this.bigFx && ev && ev.type === 'keydown') { const k = ev.code || ev.key; if (/Enter|Space|Escape|KeyJ/.test(k) && this.bigClick) this.bigClick(); ev.preventDefault && ev.preventDefault(); return; }
  return oKey ? oKey.apply(this, arguments) : undefined;
};
const oNG = G.newGame; if (oNG) G.newGame = function () { this.storyFx = null; this.storyQ = []; return oNG.apply(this, arguments); };
})();
