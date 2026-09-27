// ==== mc-show.js ====
(function () {
// 小玩法演出工具包（docs/design.md §7.5.1）：结果先定，演出后挑。
// 听牌 reach · 慢动作 slowmo · 预兆 aura / 升格 promote · 中奖四档 win · 没中 lose · 差一点 near · 连击 combo · 评级 grade · 计数器 roll · 大字章 stamp
// 反馈底线（2026-09-27，抽卡参考包）：待机 idle · 悬停 hover · 按下 press · 逐拍加码 charge · 卡帧 hitstop · 揭晓 reveal · 逐项砸出 items ·
// 余韵 ambient · 点空白 tap · 进退场 enter / exit；底层像素特效 ring / burst / rays / shock / flash / white / shake / zoom。
// 状态都挂在「持有者」的 .sh 上（小玩法是 mg，全屏滚轮是 reel）；特效画在 4 逻辑像素一格的缓冲里（和舞台、像素角色同一个格），
// 舞台的压暗 / 聚光 / 推镜头 / 震屏 / 灯珠联动在 M.drawMini 和 K.bulbs 里读它。
const M = window.MC, G = M.Game.prototype, S = M.Sfx, K = M.MK, U = M.UI, C = M.PJ.PAL;
const cl = K.cl, eo = K.eo, eb = K.eb, rnd = Math.random;
const SH = M.SHOW = {};
const RM = () => !!(M.PJ && M.PJ.reduced);
const snd = (ev, x) => { try { S.mini && S.mini('_', ev, x); } catch (e) {} };
const QC = (q) => (M.QUALITY[[0, 2, 3, 4][cl(q | 0, 0, 3)]] || M.QUALITY[0]).c;   // a show's four steps: 普通 / 稀有 / 史诗 / 传说 of the six (mc-q6.js)
const TIER_C = [C.lime, C.gold, C.gold, C.gold];
const GRID = SH.GRID = 4;                                     // logical px per art px: everything the show draws snaps to it
SH.QC = QC;

// ───────── colours: every effect walks a four-step ramp (white → light → main → dark), picked from the palette ─────────
const FAM = [[C.silver, C.white, C.silver, C.steel, C.slate], [C.steel, C.white, C.silver, C.steel, C.slate], [C.blue, C.white, C.blue, C.blueDeep, C.indigo], [C.violet, C.white, C.violet, C.violetDeep, C.indigo],
  [C.orange, C.white, C.gold, C.orange, C.orangeDeep], [C.gold, C.white, C.butter, C.gold, C.amber], [C.amber, C.butter, C.gold, C.amber, C.umber], [C.red, C.white, C.pink, C.red, C.wine], [C.wine, C.pink, C.red, C.wine, C.ink],
  [C.pink, C.white, C.pink, C.magenta, C.wine], [C.magenta, C.white, C.pink, C.magenta, C.violetDeep], [C.teal, C.white, C.ice, C.teal, C.tealDeep], [C.ice, C.white, C.ice, C.teal, C.tealDeep],
  [C.green, C.white, C.lime, C.green, C.greenDeep], [C.lime, C.white, C.lime, C.green, C.greenDeep], [C.tan, C.butter, C.tan, C.brown, C.umber], [C.brown, C.tan, C.brown, C.umber, C.ink], [C.cream, C.white, C.cream, C.lavender, C.haze],
  [C.lavender, C.white, C.lavender, C.haze, C.indigo], [C.white, C.white, C.cream, C.silver, C.steel]];
const RAINBOW = [C.red, C.orange, C.gold, C.lime, C.teal, C.blue, C.violet, C.magenta];
const rgbOf = (h) => { const n = parseInt(String(h).slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const RC = {};
SH.ramp = function (col) {
  col = U ? U.pal(col) : col; if (RC[col]) return RC[col]; const a = rgbOf(col); let best = FAM[0], bd = 1e9;
  FAM.forEach(f => { const b = rgbOf(f[0]), d = (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11; if (d < bd) { bd = d; best = f; } });
  return (RC[col] = [best[1], best[2], col, best[4]]);
};
SH.tierRamp = (q) => SH.ramp(QC(q));
// ABGR words for the pixel buffer, alpha quantised to eighths (hard, never smooth)
const W32 = {}, w32 = (h, a) => { a = a == null ? 1 : Math.round(cl(a, 0, 1) * 8) / 8; const k = h + a; let v = W32[k]; if (v == null) { const [r, g, b] = rgbOf(h); v = W32[k] = ((Math.round(a * 255) << 24) | (b << 16) | (g << 8) | r) >>> 0; } return v; };
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bay = (x, y) => (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16;

// ───────── state ─────────
function st(mg) { return mg.sh || (mg.sh = { clock: 0, q: [], tense: null, tLv: 0, beatT: 9, beatN: 0, stamps: [], rolls: [], gray: 0, black: 0, slow: 1, slowT: 0, lamp: null, combo: 0, fever: 0, feverT: 0, near: null,
  parts: [], fx: [], obj: {}, cam: { z: 0, zv: 0, x: K.CX, y: K.SY + 350 }, shake: 0, sx: 0, sy: 0, hit: 0, hitX: K.CX, hitY: K.SY + 350, flashA: 0, flashC: C.white, dimA: 0, dimT: 0, tintA: 0, tintC: C.gold, amb: null, charge: null, box: null }); }
SH.state = st;
// the area a holder's effects live in (logical px); a minigame's is its stage, the reel sets its own window
SH.box = function (h, x, y, w, hh) { st(h).box = { x, y, w, h: hh }; };
const boxOf = (s) => s.box || { x: K.SX, y: K.SY, w: K.SW, h: K.SH };
// 排一件事到 dt 时钟上（跟着快进一起加速，不用 setTimeout）
function later(mg, dt, fn) { const s = st(mg); s.q.push({ at: s.clock + dt, fn }); }
SH.later = later;

// ───────── low-level pixel effects (logical coordinates in, drawn on the 4-px grid) ─────────
// particles: single art px (size 1–3) that walk the ramp over their life; o { ramp | col | q | rainbow, sp [a, b] px/s, life [a, b], g px/s², drag, size [a, b], ang, spread, att [x, y] pull, ring r (start on a circle, moving round it), vx, vy, w, h }
SH.burst = function (h, x, y, n, o) {
  o = o || {}; const s = st(h), rp = o.rainbow ? null : o.ramp || (o.q != null ? SH.tierRamp(o.q) : SH.ramp(o.col || C.gold)), sp = o.sp || [120, 420], lf = o.life || [0.35, 0.8], sz = o.size || [1, 2];
  n = RM() ? Math.min(n, 6) : n;
  for (let i = 0; i < n; i++) { if (s.parts.length > 520) s.parts.shift(); const a = o.ang != null ? o.ang + (rnd() - 0.5) * (o.spread != null ? o.spread : 1) : rnd() * Math.PI * 2, v = sp[0] + rnd() * (sp[1] - sp[0]);
    const ra = rnd() * Math.PI * 2, rr = o.ring || 0;   // o.ring: start on a circle round (x, y) instead (a charge pulling light in)
    s.parts.push({ x: x + (rnd() - 0.5) * (o.w || 0) + Math.cos(ra) * rr, y: y + (rnd() - 0.5) * (o.h || 0) + Math.sin(ra) * rr, vx: (rr ? -Math.sin(ra) * v : Math.cos(a) * v) + (o.vx || 0), vy: (rr ? Math.cos(ra) * v : Math.sin(a) * v) + (o.vy || 0), t: 0, life: lf[0] + rnd() * (lf[1] - lf[0]), g: o.g || 0, drag: o.drag == null ? 2.2 : o.drag,
      sz: Math.round(sz[0] + rnd() * (sz[1] - sz[0])), rp: rp || SH.ramp(RAINBOW[(i + (s.clock * 10 | 0)) % RAINBOW.length]), att: o.att || null, trail: o.trail !== false && v > 300 }); }
};
// an expanding ring: r0 → r1 px over life s; w = thickness in art px
SH.ring = function (h, x, y, r0, r1, col, o) { o = o || {}; st(h).fx.push({ k: 'ring', x, y, r0, r1, col: U ? U.pal(col) : col, w: o.w || 1, life: o.life || 0.45, t: -(o.delay || 0), sq: o.sq || 0.9 }); };
// hard wedge rays turning round a point; o { n, life, r, c2, rainbow, spin }
SH.rays = function (h, x, y, col, o) { o = o || {}; const rp = SH.ramp(col); st(h).fx.push({ k: 'rays', x, y, c1: o.c1 || rp[2], c2: o.c2 || rp[1], n: o.n || 16, r: o.r || 700, life: o.life || 1.4, t: -(o.delay || 0), rainbow: !!o.rainbow, spin: o.spin == null ? 0.35 : o.spin, a0: rnd() * 6.28 }); };
// shockwave: a thick fast ring, a thin slow one, dust thrown along the ground
SH.shock = function (h, x, y, col, o) { o = o || {}; SH.ring(h, x, y, 8, o.r || 260, col, { w: 3, life: 0.3 }); SH.ring(h, x, y, 8, (o.r || 260) * 1.5, C.white, { w: 1, life: 0.55, delay: 0.04 }); SH.burst(h, x, y + (o.dy || 0), o.n || 18, { ramp: [C.cream, C.lavender, C.haze, C.indigo], sp: [160, 380], ang: 0, spread: 0.5, life: [0.3, 0.6], drag: 4, size: [1, 3] }); SH.burst(h, x, y + (o.dy || 0), o.n || 18, { ramp: [C.cream, C.lavender, C.haze, C.indigo], sp: [160, 380], ang: Math.PI, spread: 0.5, life: [0.3, 0.6], drag: 4, size: [1, 3] }); };
// whole-stage flashes (flat, no gradient): white, a colour tint, a dim that eases back
SH.white = function (h, a) { const s = st(h); s.flashA = Math.max(s.flashA, RM() ? a * 0.4 : a); s.flashC = C.white; };
SH.flash = function (h, col, a) { const s = st(h); s.tintA = Math.max(s.tintA, RM() ? a * 0.4 : a); s.tintC = U ? U.pal(col) : col; };
SH.dim = function (h, a, dur) { const s = st(h); s.dimA = Math.max(s.dimA, a); s.dimT = dur || 0.6; };
// camera: shake amplitude (logical px, decays), zoom kick around a point (springs back)
SH.shake = function (h, amt) { const s = st(h); if (!RM()) s.shake = Math.max(s.shake, amt); };
SH.zoom = function (h, k, x, y) { const s = st(h); if (RM()) return; s.cam.z += k; if (x != null) { s.cam.x = x; s.cam.y = y; } };

// ───────── objects: springs and tweens a minigame reads back for anything it draws (a card, a reel, a prize…) ─────────
function obj(h, id) { const s = st(h); return s.obj[id] || (s.obj[id] = { k: 1, kv: 0, kt: 1, w: 0, spin: null, pop: null, exit: null, enter: null, hov: 0 }); }
SH.obj = obj;
// the transform to draw it with: { k scale, rot, white 0…1, dx, dy, a alpha }
SH.xf = function (h, id) {
  const s = st(h), o = s.obj[id]; if (!o) return { k: 1, rot: 0, white: 0, dx: 0, dy: 0, a: 1 };
  let k = o.k, rot = 0, dx = 0, dy = 0, a = 1; const c = s.clock;
  if (o.pop) { const t = c - o.pop.t0; k *= t < 0 ? 0 : 1 - (1 - o.pop.k0) * Math.exp(-t * 7) * Math.cos(t * 17); }
  if (o.spin) { const p = cl((c - o.spin.t0) / o.spin.dur, 0, 1); rot += o.spin.n * Math.PI * 2 * eo(p); }
  if (o.enter) { const p = (c - o.enter.t0) / 0.38; if (p < 0) { a = 0; } else { dy += -o.enter.h * (1 - eb(Math.min(1, p))); } }
  if (o.exit) { const p = cl((c - o.exit.t0) / 0.42, 0, 1); rot += Math.PI * 3 * p * p; dy -= o.exit.h * p * p; k *= 1 - 0.5 * p; a *= 1 - p; }
  if (o.hov) k *= 1 + 0.06 * o.hov;
  return { k: RM() ? 1 : k, rot: RM() ? 0 : rot, white: o.w, dx, dy: RM() ? 0 : dy, a };
};
// 待机：能点的东西呼吸、微浮（seed 错开）
SH.idle = (t, seed) => RM() ? { dy: 0, k: 1 } : { dy: Math.round(Math.sin(t * 2.1 + (seed || 0) * 1.7) * 1.5) * GRID / 2, k: 1 + 0.015 * Math.sin(t * 2.6 + (seed || 0)) };
// 悬停：放大、提亮、一声（进入时）
SH.hover = function (g, h, id, on) { const o = obj(h, id), was = o.hovOn; o.hovOn = !!on; if (on && !was) { o.kv += 2; o.w = Math.max(o.w, 0.3); snd('hover'); } return o; };
// 按下：挤压到 0.9 → 弹回过冲约 1.12；白闪、一把局部粒子、按键声
SH.press = function (g, h, id, x, y, col) { const o = obj(h, id); o.k = 0.9; o.kv = 4; o.w = 0.85; if (x != null) { SH.burst(h, x, y, 8, { col: col || C.gold, sp: [90, 260], life: [0.2, 0.4], size: [1, 2] }); SH.ring(h, x, y, 6, 70, C.white, { life: 0.22 }); } snd('press'); return o; };
// 弹出来：从 0.35 过冲回 1，可转 n 圈
SH.pop = function (h, id, o) { o = o || {}; const b = obj(h, id), c = st(h).clock; b.pop = { t0: c + (o.delay || 0), k0: o.k0 == null ? 0.35 : o.k0 }; if (o.spin) b.spin = { t0: c + (o.delay || 0), dur: o.dur || 0.6 + 0.15 * o.spin, n: o.spin }; b.w = 1; return b; };
// 入场：从上面落下来弹一下；退场：转着飞走、缩小、变淡（带粒子和一声）
SH.enter = function (h, id, delay, o) { o = o || {}; const b = obj(h, id); b.enter = { t0: st(h).clock + (delay || 0), h: o.h || 90 }; b.exit = null; if (!o.quiet) later(h, (delay || 0) + 0.3, () => snd('enter')); return b; };
SH.exit = function (g, h, id, o) { o = o || {}; const b = obj(h, id); b.exit = { t0: st(h).clock, h: o.h || 320 }; if (o.x != null) SH.burst(h, o.x, o.y, 16, { col: o.col || C.gold, sp: [100, 300], life: [0.3, 0.6] }); snd('exit'); return b; };

// ───────── the reveal chain: beats that escalate → a frozen frame → the burst ─────────
// charge: o { x, y, q final tier 0…3, beats (3 + q), id object to punch, t0, iv, mul, onBeat(i, tq, up), onReveal(), hit (hitstop, default on), reveal (default on), spin }
// the tier shown at beat i climbs to q; each beat is stronger than the last; returns the time until the reveal
SH.charge = function (g, h, o) {
  const s = st(h), q = cl(o.q | 0, 0, 3), n = o.beats || 3 + q, ts = []; let t = o.t0 == null ? 0.45 : o.t0, iv = o.iv || 0.5;
  for (let i = 0; i < n; i++) { ts.push(t); iv *= o.mul || 0.82; t += iv; }
  const T = t + 0.15, x = o.x == null ? K.CX : o.x, y = o.y == null ? K.SY + 330 : o.y;
  s.charge = { t0: s.clock, T, x, y, q, tier: 0 }; s.cam.x = x; s.cam.y = y; snd('riser', T);
  ts.forEach((tt, i) => later(h, tt, () => { const tq = Math.min(q, Math.floor(i * (q + 1) / n)), up = tq > (s.charge ? s.charge.tier : 0); if (s.charge) s.charge.tier = tq; SH.beat(g, h, x, y, i, tq, up, o.id); o.onBeat && o.onBeat(i, tq, up); }));
  later(h, T, () => { s.charge = null; const go = () => { if (o.reveal !== false) SH.reveal(g, h, q, { x, y, id: o.id, spin: o.spin }); o.onReveal && o.onReveal(); }; if (o.hit !== false) SH.hitstop(h, 0.15, x, y, go); else go(); });
  return T + (o.hit !== false ? 0.15 : 0);
};
// one beat: white flash, a punch, a shake that grows, the camera leans in, a ring and a burst in the tier's colour, a higher note;
// a tier-up beat adds a whole-stage tint flash and a white ring
SH.beat = function (g, h, x, y, i, tq, up, id, o) {
  const rp = SH.tierRamp(tq); if (id != null) { const b = obj(h, id); b.k = 1.12; b.kv = 0; b.w = 0.8; }
  SH.shake(h, 3 + i * 2 + (up ? 8 : 0)); SH.zoom(h, 0.012 + (up ? 0.02 : 0), x, y);
  SH.ring(h, x, y, 12, 90 + i * 14, rp[2], { life: 0.45 }); SH.burst(h, x, y, 12 + i * 3, { ramp: rp, sp: [120, 320], life: [0.25, 0.55] });
  if (up) { SH.flash(h, rp[2], 0.3); SH.ring(h, x, y, 12, 220, C.white, { life: 0.5, delay: 0.05, w: 2 }); }
  if (!(o && o.quiet)) snd('beat', { i, tier: tq, up }); if (g && g.fx) g.fx.kick(1 + i * 0.6 + (up ? 2 : 0));
};
// 卡帧：舞台停住、压到近黑、焦点一团白；到点再往下走
SH.hitstop = function (h, dur, x, y, then) { const s = st(h); if (RM()) { then && then(); return; } s.hit = dur || 0.15; s.hitX = x == null ? K.CX : x; s.hitY = y == null ? K.SY + 330 : y; s.hitThen = then || null; snd('hit'); };
SH.frozen = (h) => !!(h && h.sh && h.sh.hit > 0);
// 揭晓爆点：o { x, y, id, spin 圈数, col 主色（默认按档位） }；档位 q 0 普通 … 3 传说
SH.reveal = function (g, h, q, o) {
  o = o || {}; q = cl(q | 0, 0, 3); const s = st(h), x = o.x == null ? K.CX : o.x, y = o.y == null ? K.SY + 330 : o.y, rp = o.col ? SH.ramp(o.col) : SH.tierRamp(q), c1 = rp[2];
  SH.white(h, 1); SH.slowmo(h, 0.3, 0.23); SH.shake(h, 10 + q * 5); SH.zoom(h, 0.08 + q * 0.03, x, y);
  if (o.id != null) SH.pop(h, o.id, { spin: o.spin != null ? o.spin : q >= 3 ? 3 : q >= 2 ? 2 : 1 });
  SH.rays(h, x, y, c1, { rainbow: q >= 3, n: 14 + q * 2, life: 1.1 + q * 0.5 });
  SH.ring(h, x, y, 10, 200, C.white, { w: 2, life: 0.5 }); SH.ring(h, x, y, 10, 300, c1, { life: 0.6, delay: 0.06 }); SH.ring(h, x, y, 10, 420, rp[1], { life: 0.7, delay: 0.14 });
  SH.shock(h, x, y + 30, c1, { r: 220 + q * 60 });
  SH.burst(h, x, y, 60 + q * 30, { ramp: rp, rainbow: q >= 3, sp: [200, 760], life: [0.5, 1.1], g: 260, drag: 1.4, size: [1, 3] });
  SH.burst(h, x, y, 24, { ramp: rp, sp: [40, 160], life: [1, 1.8], g: -40, drag: 0.8 });
  SH.dim(h, 0.45, 0.9 + q * 0.3); SH.flash(h, c1, 0.25 + q * 0.08);
  snd('boom', q); if (g && g.fx) g.fx.kick(8 + q * 5);
  if (q >= 3) later(h, 0.55, () => { SH.white(h, 0.6); SH.shake(h, 14); SH.zoom(h, 0.06, x, y); SH.ring(h, x, y, 20, 520, C.gold, { w: 2, life: 0.8 }); SH.burst(h, x, y, 70, { rainbow: 1, sp: [200, 600], life: [0.6, 1.2], g: 200 }); SH.flash(h, C.gold, 0.35); snd('wave2'); if (o.id != null) { const b = obj(h, o.id); b.k = 1.15; b.kv = 0; } });
};
// 结果逐项砸出：list [{ text, col, size }]，o { x, y, dy 行距, gap 间隔, t0 }；最后一项加金闪、轻震和光环。返回总时长
SH.items = function (g, h, list, o) {
  o = o || {}; const x = o.x == null ? K.CX : o.x, y0 = o.y == null ? K.SY + 420 : o.y, dy = o.dy || 64, gap = o.gap || 0.2, t0 = o.t0 || 0;
  list.forEach((it, i) => later(h, t0 + i * gap, () => { const y = y0 + i * dy, last = i === list.length - 1; SH.stamp(h, it.text, x, y, it.col || C.cream, it.size || 44, o.life || 2.2); SH.burst(h, x, y, 12, { col: it.col || C.gold, sp: [120, 300], life: [0.25, 0.5], w: 120 }); snd('slam', i); SH.shake(h, 3);
    if (last) { SH.flash(h, C.gold, 0.2); SH.shake(h, 6); SH.ring(h, x, y, 10, 160, C.gold, { life: 0.4 }); } }));
  return t0 + list.length * gap;
};
// 余韵：结果停着的时候一直有粒子（普通浮尘、稀有闪点、史诗往上飘、传说金光从底下涌）；box 省略 = 整个舞台；q = null 关掉
SH.ambient = function (h, q, box) { st(h).amb = q == null ? null : { q: cl(q | 0, 0, 3), box: box || null, acc: 0 }; };
// 点空白：ripple、舞台轻弹、一把粒子、一声（框架在没被小玩法用掉的点击上自动调用）
SH.tap = function (g, h, x, y) { SH.ring(h, x, y, 4, 60, C.lavender, { life: 0.35 }); SH.ring(h, x, y, 4, 34, C.white, { life: 0.22, delay: 0.05 }); SH.burst(h, x, y, 6, { ramp: [C.white, C.lavender, C.haze, C.indigo], sp: [60, 180], life: [0.2, 0.4] }); SH.shake(h, 2); SH.zoom(h, 0.006, x, y); snd('tap'); };

// ───────── 听牌：压暗 + 聚光 + 推镜头 + 心跳 + 牌子 ─────────
// o: { x, y, r 聚光半径, col, lv 1 普通 / 2 超级, label }
SH.reach = function (g, mg, o) {
  const s = st(mg), lv = (o && o.lv) || 1;
  s.tense = Object.assign({ x: K.CX, y: K.SY + 350, r: 190, col: lv >= 2 ? C.red : C.gold, lv, label: lv >= 2 ? '超级听牌' : '听牌！', t: 0 }, o);
  s.beatT = 9; snd('reach', lv); g.fx.kick(3 + 3 * lv);
  if (!RM()) { SH.ring(mg, s.tense.x, s.tense.y, s.tense.r * 1.6, s.tense.r, s.tense.col, { w: 2, life: 0.35 }); SH.burst(mg, s.tense.x, s.tense.y, 10 + lv * 8, { col: s.tense.col, sp: [80, 200], life: [0.4, 0.8] }); }
};
SH.calm = function (mg) { const s = st(mg); s.tense = null; };
SH.tense = (mg) => !!(mg.sh && mg.sh.tense);
// 慢动作：之后 dur 秒（真实时间）里小玩法按 k 倍速走
SH.slowmo = function (mg, k, dur) { const s = st(mg); s.slow = k; s.slowT = dur; };
SH.slowK = (mg) => (mg.sh && mg.sh.slowT > 0 ? mg.sh.slow : 1);
// 一格一格挪：每跨过一格响一下、灯珠跟着跳；i = 第几格（越往后音调越高）
SH.crawl = function (g, mg, i) { const s = st(mg); snd('crawl', i); s.beatT = Math.min(s.beatT, 0.12); g.fx.kick(0.6 + Math.min(3, i * 0.4)); if (s.tense) { SH.ring(mg, s.tense.x, s.tense.y, 10, 60 + i * 6, s.tense.col, { life: 0.25 }); SH.shake(mg, 1 + Math.min(4, i)); } };

// ───────── 大字章 / 计数器 ─────────
SH.stamp = function (mg, text, x, y, col, size, life) { st(mg).stamps.push({ text, x, y, col: col || C.gold, size: size || 72, t: 0, life: life || 1.4, rot: (rnd() - 0.5) * 0.16 }); };
SH.roll = function (mg, v, x, y, col, dur) { st(mg).rolls.push({ v, x, y, col: col || C.gold, t: 0, dur: dur || 0.8, n: -1 }); };

// ───────── 中奖四档 ─────────
// tier 1 小中 · 2 中 · 3 大赢 · 4 大奖；o: { x, y, col, v 数字（滚计数器）, label 章上的字, id 要弹一下的东西, q 演出品质（默认按档位） }
SH.win = function (g, mg, tier, o) {
  o = o || {}; const s = st(mg), x = o.x == null ? K.CX : o.x, y = o.y == null ? K.SY + 330 : o.y, col = o.col || TIER_C[tier - 1] || C.gold, fx = g.fx;
  tier = cl(tier | 0, 1, 4); SH.calm(mg); s.gray = 0; s.near = null;
  const rollDur = [0.4, 0.8, 1.3, 2.2][tier - 1], rp = SH.ramp(col);
  if (tier === 4) {
    // 黑场 0.2 秒 → 聚光 → 「大」「奖」逐字砸下 → 金币雨、彩纸 → 计数器越滚越快
    s.black = 1; snd('win4'); fx.kick(4);
    later(mg, 0.2, () => { s.black = 0; SH.reveal(g, mg, 3, { x, y, id: o.id, col: o.col }); s.lamp = { t: 2.8, col, strobe: 1, sp: 6 }; });
    const word = [...(o.label || '大奖')];
    word.forEach((ch, i) => later(mg, 0.32 + i * 0.2, () => { SH.stamp(mg, ch, K.CX + (i - (word.length - 1) / 2) * 150, K.SY + 250, C.gold, 150, 2.4 - i * 0.2); snd('stamp'); fx.kick(10); SH.shake(mg, 8); SH.burst(mg, K.CX + (i - (word.length - 1) / 2) * 150, K.SY + 250, 16, { col: C.gold, sp: [150, 400] }); }));
    later(mg, 0.5, () => { fx.confetti(180); fx.coins(x, y, 60, { v: 1500, spread: 1.9, spreadT: 0.9 }); });
    if (o.v) later(mg, 0.6, () => SH.roll(mg, o.v, K.CX, K.SY + 430, col, rollDur));
    SH.ambient(mg, 3);
    return;
  }
  snd('win' + tier);
  if (o.v) SH.roll(mg, o.v, x, y - 100, col, rollDur);
  if (o.id != null) SH.pop(mg, o.id, { spin: tier >= 2 ? 1 : 0, k0: 0.6 });
  SH.ring(mg, x, y, 10, 120 + tier * 60, col, { w: tier >= 2 ? 2 : 1, life: 0.3 + tier * 0.05 }); SH.burst(mg, x, y, 10 + tier * 10, { ramp: rp, sp: [140, 360 + tier * 120], life: [0.3, 0.7], size: [1, tier >= 2 ? 3 : 2] });
  SH.shake(mg, 3 + tier * 2); if (tier < 3) SH.white(mg, 0.15 * tier);
  if (tier >= 2) { SH.rays(mg, x, y, col, { n: 12, life: 0.7 + tier * 0.25, r: 400 + tier * 100 }); SH.ring(mg, x, y, 10, 260, C.white, { w: 1, life: 0.4, delay: 0.05 }); s.lamp = { t: tier === 2 ? 1.2 : 2, col, sp: 4, strobe: tier >= 3 ? 1 : 0 }; SH.ambient(mg, tier - 1); }
  if (tier === 3) { SH.hitstop(mg, 0.1, x, y, () => SH.reveal(g, mg, 2, { x, y, id: o.id, col })); fx.coins(x, y, 26, { v: 1100 }); later(mg, 0.2, () => { SH.stamp(mg, o.label || '大赢', x, y - 190, col, 110, 1.8); snd('stamp'); fx.kick(12); }); }
  else if (o.label) SH.stamp(mg, o.label, x, y - 170, col, tier === 2 ? 64 : 52, 1.2);
};
// 没中：舞台灰一下 0.25 秒、一声轻响、一小团灰，马上可以再来
SH.lose = function (g, mg) { const s = st(mg); SH.calm(mg); s.gray = 1; snd('lose'); SH.ambient(mg, null); };
// 差一点：落空但离大奖只差一格——那一格在线外抖一下，打个小章；同样一拍带过
SH.near = function (g, mg, x, y, text) { const s = st(mg); SH.calm(mg); s.gray = 0.6; s.near = { x, y, t: 0 }; SH.stamp(mg, text || '差一点！', x, y - 70, C.pink, 44, 0.9); SH.ring(mg, x, y, 10, 90, C.pink, { life: 0.3 }); snd('near'); g.fx.kick(2); SH.shake(mg, 4); };

// ───────── 预兆与升格（揭晓前东西先亮品质色） ─────────
// 画在要揭晓的东西后面：k 0~1 强度（越接近揭晓越强）；q 品质 0~3。返回这一帧该抖多少，给东西本身用
SH.aura = function (x, cx, cy, r, q, t, k) {
  if (!(k > 0)) return { dx: 0, dy: 0 };
  const c = QC(q), a = cl(k, 0, 1), pul = 0.75 + 0.25 * Math.sin(t * (6 + q * 3));
  K.GL(x, cx, cy, r * (1 + 0.25 * a) * pul, c, 0.35 + 0.35 * a);
  if (q >= 1) { x.save(); x.globalAlpha *= 0.5 * a; x.globalCompositeOperation = 'lighter'; x.fillStyle = U.pal(c); for (let i = 0; i < 6 + q * 4; i++) { const ph = (t * (0.6 + q * 0.25) + i * 0.137) % 1, px = cx + Math.sin(i * 2.3 + t) * r * 0.8, py = cy + r * 0.6 - ph * r * 1.6; x.fillRect(Math.round(px / GRID) * GRID, Math.round(py / GRID) * GRID, GRID * (q >= 3 ? 2 : 1), GRID * (q >= 3 ? 2 : 1)); } x.restore(); }
  const amp = RM() ? 0 : a * (1 + q * 2);
  return { dx: Math.round((rnd() - 0.5) * amp), dy: Math.round((rnd() - 0.5) * amp) };
};
SH.omen = function (g, mg, q) { snd('omen', q); };
// 升格：白光一闪、一圈裂纹、颜色跳到 q
SH.promote = function (g, mg, x, y, q) { const c = QC(q); SH.white(mg, 0.3); SH.ring(mg, x, y, 20, 220, c, { w: 2, life: 0.4 }); SH.ring(mg, x, y, 10, 140, C.white, { life: 0.3 }); SH.burst(mg, x, y, 24 + q * 8, { col: c, sp: [150, 450], life: [0.3, 0.7], size: [1, 3] }); SH.flash(mg, c, 0.25); SH.stamp(mg, '升格！', x, y - 150, c, 56, 1); snd('promote', q); g.fx.kick(6 + q * 2); SH.shake(mg, 6 + q * 2); };
// 预兆的升格路线：真实品质 q，先亮哪一档、在哪一档升上去（只会往上升）
SH.omenPath = function (q) { if (q <= 0) return [0]; const r = rnd(); if (q >= 3) return r < 0.45 ? [1, 3] : r < 0.75 ? [2, 3] : r < 0.9 ? [1, 2, 3] : [3]; if (q === 2) return r < 0.5 ? [1, 2] : [2]; return r < 0.3 ? [0, 1] : [1]; };

// ───────── 连击与评级 ─────────
SH.combo = function (g, mg, x, y, word, col) {
  const s = st(mg); s.combo++; const n = s.combo;
  SH.stamp(mg, (word || (n >= 8 ? 'PERFECT' : n >= 4 ? 'GREAT' : 'GOOD')) + (n >= 2 ? ' ×' + n : ''), x, y, col || (n >= 8 ? C.magenta : n >= 4 ? C.gold : C.lime), 40 + Math.min(24, n * 3), 0.7);
  snd('combo', n); if (n === 5) { s.fever = 1; snd('fever'); SH.flash(mg, C.gold, 0.15); SH.white(mg, 0.2); } g.fx.kick(1 + Math.min(4, n * 0.4));
  SH.burst(mg, x, y, 6 + Math.min(12, n), { col: col || (n >= 8 ? C.magenta : n >= 4 ? C.gold : C.lime), sp: [100, 260], life: [0.2, 0.45] }); SH.shake(mg, 1 + Math.min(4, n * 0.4));
  return n;
};
SH.comboBreak = function (mg) { const s = st(mg); s.combo = 0; s.fever = 0; };
// 评级章：S / A / B / C，返回对应的中奖档（S 大奖要看玩法，这里给 3）
SH.grade = function (g, mg, grade, x, y) { const col = { S: C.gold, A: C.magenta, B: C.teal, C: C.steel }[grade] || C.steel, X = x == null ? K.CX : x, Y = y == null ? K.SY + 300 : y; SH.stamp(mg, grade, X, Y, col, 180, 1.8); snd('stamp'); g.fx.kick(grade === 'S' ? 16 : 8); SH.shake(mg, grade === 'S' ? 14 : 6); SH.ring(mg, X, Y, 20, 260, col, { w: 2, life: 0.45 }); SH.burst(mg, X, Y, grade === 'S' ? 50 : 20, { col, sp: [150, 500], life: [0.3, 0.8] }); return { S: 3, A: 2, B: 1, C: 0 }[grade] || 0; };

// ───────── 推进 ─────────
const SPK = 600, SPD = 14;   // object springs: stiffness, damping (overshoot ≈ 12% from a press)
SH.tick = function (g, mg, dt) {
  const s = st(mg);
  if (s.hit > 0) { s.hit -= dt; if (s.hit <= 0) { s.hit = 0; SH.white(mg, 1); const f = s.hitThen; s.hitThen = null; f && f(); } return; }   // frozen: nothing moves
  s.clock += dt;
  if (s.q.length) { const due = s.q.filter(e => e.at <= s.clock); s.q = s.q.filter(e => e.at > s.clock); due.forEach(e => { try { e.fn(); } catch (err) { (window.__mcErrs = window.__mcErrs || []).push('show: ' + err.message); } }); }
  s.tLv += ((s.tense ? (s.tense.lv >= 2 ? 1 : 0.75) : 0) - s.tLv) * Math.min(1, dt * (s.tense ? 5 : 9));
  if (s.tense) { s.tense.t += dt; s.beatT += dt; const iv = 0.8 - 0.45 * s.tLv - Math.min(0.2, s.tense.t * 0.05); if (s.beatT >= iv) { s.beatT = 0; s.beatN++; snd('heart', s.tLv); SH.ring(mg, s.tense.x, s.tense.y, s.tense.r * 0.9, s.tense.r * 1.15, s.tense.col, { life: 0.25 }); } } else s.beatT = 9;
  if (s.slowT > 0) s.slowT -= dt;
  const k = SH.slowK(mg), pd = dt * k;   // particles and rings follow the slow motion
  s.gray = Math.max(0, s.gray - dt * 4); s.black = s.black > 0 && s.black < 1 ? Math.max(0, s.black - dt * 6) : s.black;
  s.stamps.forEach(p => p.t += dt); s.stamps = s.stamps.filter(p => p.t < p.life);
  s.rolls.forEach(r => { r.t += dt; const p = cl(r.t / r.dur, 0, 1), n = Math.floor(p * 14); if (n !== r.n && p < 1) { r.n = n; snd('roll', p); } }); s.rolls = s.rolls.filter(r => r.t < r.dur + 0.9);
  if (s.near) { s.near.t += dt; if (s.near.t > 0.9) s.near = null; }
  if (s.lamp) { s.lamp.t -= dt; if (s.lamp.t <= 0) s.lamp = null; }
  s.feverT += dt * (s.fever ? 1 : 0);
  // flashes, dim, camera
  s.flashA *= Math.exp(-dt * 12); if (s.flashA < 0.02) s.flashA = 0; s.tintA *= Math.exp(-dt * 7); if (s.tintA < 0.02) s.tintA = 0;
  if (s.dimT > 0) s.dimT -= dt; else s.dimA = Math.max(0, s.dimA - dt * 1.6);
  s.shake *= Math.exp(-dt * 9); if (s.shake < 0.5) s.shake = 0; s.sx = s.shake ? Math.round((rnd() - 0.5) * 2 * s.shake / GRID) * GRID : 0; s.sy = s.shake ? Math.round((rnd() - 0.5) * 2 * s.shake / GRID) * GRID : 0;
  s.cam.zv += -s.cam.z * 220 * dt; s.cam.zv *= Math.exp(-dt * 16); s.cam.z += s.cam.zv * dt;
  // objects
  Object.keys(s.obj).forEach(id => { const o = s.obj[id]; const kt = o.kt; o.kv += (kt - o.k) * SPK * dt; o.kv *= Math.exp(-SPD * dt); o.k += o.kv * dt; o.w *= Math.exp(-dt * 9); if (o.w < 0.02) o.w = 0; o.hov += ((o.hovOn ? 1 : 0) - o.hov) * Math.min(1, dt * 14); });
  // charge: particles drawn in from a ring round the focus, more and faster as it builds
  if (s.charge && !RM()) { const c = cl((s.clock - s.charge.t0) / s.charge.T, 0, 1), n = Math.floor((0.3 + c * 1.6) * 60 * dt + rnd()), rp = SH.tierRamp(s.charge.tier); for (let i = 0; i < n; i++) { const a = rnd() * 6.28, r = 110 + rnd() * 90; s.parts.push({ x: s.charge.x + Math.cos(a) * r, y: s.charge.y + Math.sin(a) * r, vx: -Math.sin(a) * 120, vy: Math.cos(a) * 120, t: 0, life: 1.2, g: 0, drag: 0.6, sz: rnd() < 0.3 ? 2 : 1, rp: rnd() < 0.75 ? rp : [C.white, C.white, C.cream, C.lavender], att: [s.charge.x, s.charge.y], trail: false }); } SH.dim(mg, c * 0.45, 0.1); SH.shake(mg, c * c * 4); }
  // ambient afterglow by tier
  if (s.amb && !RM()) { const a = s.amb, b = a.box || boxOf(s), rate = [3, 6, 14, 22][a.q]; a.acc += dt * rate; while (a.acc >= 1) { a.acc -= 1; const x = b.x + rnd() * b.w;
    if (a.q === 0) s.parts.push({ x, y: b.y + rnd() * b.h * 0.3, vx: (rnd() - 0.5) * 10, vy: 12 + rnd() * 16, t: 0, life: 4, g: 0, drag: 0, sz: 1, rp: [C.cream, C.cream, C.lavender, C.haze], amb: 1 });
    else if (a.q === 1) s.parts.push({ x, y: b.y + rnd() * b.h, vx: 0, vy: 0, t: 0, life: 0.7, g: 0, drag: 0, sz: 1, rp: [C.white, C.ice, C.blue, C.indigo], amb: 1, twinkle: 1 });
    else if (a.q === 2) s.parts.push({ x, y: b.y + b.h - rnd() * b.h * 0.2, vx: (rnd() - 0.5) * 20, vy: -30 - rnd() * 40, t: 0, life: 3, g: 0, drag: 0, sz: rnd() < 0.3 ? 2 : 1, rp: [C.white, C.pink, C.violet, C.violetDeep], amb: 1 });
    else s.parts.push({ x, y: b.y + b.h, vx: (rnd() - 0.5) * 30, vy: -60 - rnd() * 70, t: 0, life: 3.2, g: 0, drag: 0, sz: rnd() < 0.35 ? 2 : 1, rp: [C.white, C.butter, C.gold, C.amber], amb: 1 }); } }
  // particles
  for (let i = s.parts.length - 1; i >= 0; i--) { const p = s.parts[i]; p.t += pd; if (p.t >= p.life) { s.parts.splice(i, 1); continue; } p.px = p.x; p.py = p.y;
    if (p.att) { const dx = p.att[0] - p.x, dy = p.att[1] - p.y, d = Math.hypot(dx, dy) || 1; if (d < 14) { s.parts.splice(i, 1); continue; } p.vx += dx / d * 900 * pd; p.vy += dy / d * 900 * pd; }
    p.vy += p.g * pd; const dr = Math.exp(-p.drag * pd); p.vx *= dr; p.vy *= dr; p.x += p.vx * pd; p.y += p.vy * pd; }
  s.fx.forEach(f => { f.t += pd; }); s.fx = s.fx.filter(f => f.t < f.life);
  // 灯珠联动：紧张越高跑得越快，中奖时换成奖的颜色、大赢频闪
  K.lampFx = s.lamp ? { sp: s.lamp.sp || 4, col: s.lamp.col, strobe: s.lamp.strobe } : s.tLv > 0.05 ? { sp: 1 + 3.5 * s.tLv, col: s.tense && s.tense.lv >= 2 && Math.floor(s.clock * 8) % 2 ? C.red : null } : s.charge ? { sp: 0.2, col: null } : null;
};
// 推镜头：聚光绕点放大 6%～10%，加上揭晓 / 逐拍的镜头冲击；震屏偏移按 4 像素格取整
SH.push = function (mg) {
  const s = mg.sh; if (!s || RM()) return null; let k = 1, x = s.cam.x, y = s.cam.y;
  if (s.tense) { k += (s.tense.lv >= 2 ? 0.1 : 0.06) * s.tLv * (1 + 0.015 * Math.max(0, 1 - s.beatT * 6)); x = s.tense.x; y = s.tense.y; }
  if (s.charge) k += 0.08 * cl((s.clock - s.charge.t0) / s.charge.T, 0, 1);
  k += s.cam.z;
  return Math.abs(k - 1) < 0.001 && !s.sx && !s.sy ? null : { x, y, k, sx: s.sx, sy: s.sy };
};

// ───────── 画 ─────────
// the pixel buffer: one art px = GRID logical px, covering the holder's box; effects write whole pixels into it (alpha in eighths)
function jb(s, b) {
  const W = Math.ceil(b.w / GRID), H = Math.ceil(b.h / GRID); let J = s.jb;
  if (!J || J.W !== W || J.H !== H) { const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const cx = cv.getContext('2d'), img = cx.createImageData(W, H); J = s.jb = { W, H, cv, cx, img, u: new Uint32Array(img.data.buffer) }; }
  J.u.fill(0); return J;
}
function put(J, x, y, v) { x |= 0; y |= 0; if (x < 0 || y < 0 || x >= J.W || y >= J.H) return; J.u[y * J.W + x] = v; }
function rect(J, x, y, w, h, v) { for (let yy = y | 0; yy < (y | 0) + h; yy++) for (let xx = x | 0; xx < (x | 0) + w; xx++) put(J, xx, yy, v); }
// scanline triangle
function tri(J, ax, ay, bx, by, cx, cy, vf) {
  const y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy))), y1 = Math.min(J.H - 1, Math.floor(Math.max(ay, by, cy))), P = [[ax, ay], [bx, by], [cx, cy]];
  for (let y = y0; y <= y1; y++) { const yc = y + 0.5, xs = []; for (let i = 0; i < 3; i++) { const a = P[i], b = P[(i + 1) % 3]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    if (xs.length < 2) continue; const xa = Math.max(0, Math.round(Math.min(xs[0], xs[1]))), xb = Math.min(J.W - 1, Math.round(Math.max(xs[0], xs[1])) - 1); for (let x = xa; x <= xb; x++) { const v = vf(x, y); if (v) J.u[y * J.W + x] = v; } }
}
function drawBuf(s, b, pass) {
  const J = jb(s, b), ox = b.x, oy = b.y, A = (x) => (x - ox) / GRID, B = (y) => (y - oy) / GRID; let any = false;
  // the spotlight's dim: three hard steps outside the circle
  const T = s.tense || (s.tLv > 0.02 ? s.lastT : null); if (s.tense) s.lastT = s.tense;
  const back = pass !== 'front', front = pass !== 'back';
  if (back && T && s.tLv > 0.02) { any = true; const cx = A(T.x), cy = B(T.y), beat = Math.max(0, 1 - s.beatT * 5), r = T.r / GRID * (1 + 0.05 * beat), r1 = r * r, r2 = (r * 1.35) ** 2, r3 = (r * 1.9) ** 2, a = s.tLv * (1 + 0.3 * beat);
    const v1 = w32(C.ink, 0.2 * a), v2 = w32(C.ink, 0.42 * a), v3 = w32(C.ink, 0.62 * a), rim = w32(T.col, a * (0.55 + 0.45 * beat));
    for (let y = 0; y < J.H; y++) for (let x = 0; x < J.W; x++) { const d = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2; if (d < r1) continue; J.u[y * J.W + x] = d > r3 ? v3 : d > r2 ? v2 : d > (r + 1.2) ** 2 ? v1 : rim; } }
  // rays
  if (back) s.fx.forEach(f => { if (f.k !== 'rays' || f.t < 0) return; any = true; const p = f.t / f.life, a = p < 0.1 ? p / 0.1 : p > 0.7 ? (1 - p) / 0.3 : 1, cx = A(f.x), cy = B(f.y), R = f.r / GRID, rot = f.a0 + f.t * f.spin, n = f.n;
    for (let i = 0; i < n; i++) { const a0 = rot + (i / n) * Math.PI * 2, w = Math.PI / n * 0.55, c1 = f.rainbow ? RAINBOW[i % RAINBOW.length] : f.c1, c2 = f.rainbow ? C.white : f.c2;
      const va = [w32(c1, 0.5 * a), w32(c1, 0.34 * a), w32(c1, 0.2 * a)], vb = [w32(c2, 0.6 * a), w32(c2, 0.42 * a), w32(c2, 0.26 * a)];
      const x1 = cx + Math.cos(a0 - w) * R, y1 = cy + Math.sin(a0 - w) * R, x2 = cx + Math.cos(a0 + w) * R, y2 = cy + Math.sin(a0 + w) * R, im = Math.cos(w * 0.4);
      tri(J, cx, cy, x1, y1, x2, y2, (x, y) => { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy); if (d < 6) return 0; const band = d < R * 0.22 ? 0 : d < R * 0.5 ? 1 : 2, inner = (dx * Math.cos(a0) + dy * Math.sin(a0)) / d > im; if (band === 2 && ((x + y) & 1)) return 0; return inner ? vb[band] : va[band]; }); } });
  // hitstop: a white core at the focus
  if (front && s.hit > 0) { any = true; const cx = Math.round(A(s.hitX)), cy = Math.round(B(s.hitY)), v = w32(C.white); for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) if (x * x + y * y <= 81) put(J, cx + x, cy + y, v); }
  // rings
  if (front) s.fx.forEach(f => { if (f.k !== 'ring' || f.t < 0) return; any = true; const p = f.t / f.life, r = (f.r0 + (f.r1 - f.r0) * eo(p)) / GRID, cx = A(f.x), cy = B(f.y), v = w32(p < 0.12 ? C.white : f.col), steps = Math.max(12, Math.ceil(r * 7));
    for (let i = 0; i < steps; i++) { const t = i / steps * Math.PI * 2; for (let k = 0; k < f.w; k++) { const rr = r - k, x = Math.round(cx + Math.cos(t) * rr), y = Math.round(cy + Math.sin(t) * rr * f.sq); if (p > 0.55 && bay(x, y) < (p - 0.55) / 0.45) continue; put(J, x, y, v); } } });
  // particles: white → light → main → dark over their life; twinkles blink; fast ones leave a dark trail pixel
  if (front) s.parts.forEach(q => { any = true; const l = q.t / q.life, rp = q.rp, c = q.amb ? rp[Math.min(3, 1 + Math.floor(l * 3))] : rp[Math.min(3, Math.floor(l * 4))], x = Math.round(A(q.x)), y = Math.round(B(q.y));
    if (q.twinkle) { const k = Math.sin(l * Math.PI); put(J, x, y, w32(rp[1])); if (k > 0.6) { const v = w32(rp[2]); put(J, x - 1, y, v); put(J, x + 1, y, v); put(J, x, y - 1, v); put(J, x, y + 1, v); } return; }
    if (q.amb && l > 0.75 && bay(x, y) < (l - 0.75) / 0.25) return;
    if (q.trail && q.px != null) { const tx = Math.round(A(q.px - (q.x - q.px) * 2)), ty = Math.round(B(q.py - (q.y - q.py) * 2)); if (tx !== x || ty !== y) put(J, tx, ty, w32(rp[3])); }
    const v = w32(c); if (q.sz > 1) rect(J, x, y, q.sz, q.sz, v); else put(J, x, y, v); });
  if (!any) return null; J.cx.putImageData(J.img, 0, 0); return J;
}
SH.drawFx = function (x, h, pass) {
  const s = h.sh; if (!s) return; const b = boxOf(s), J = drawBuf(s, b, pass);
  if (J) { const sm = x.imageSmoothingEnabled; x.imageSmoothingEnabled = false; x.drawImage(J.cv, 0, 0, J.W, J.H, b.x, b.y, J.W * GRID, J.H * GRID); x.imageSmoothingEnabled = sm; }
};
// whole-box overlays: dim, tint, white, black (flat alpha, no gradient)
SH.drawOver = function (x, h) {
  const s = h.sh; if (!s) return; const b = boxOf(s);
  const box = (col, a) => { if (a <= 0.01) return; x.save(); x.globalAlpha = Math.round(a * 8) / 8; x.fillStyle = U.pal(col); x.fillRect(b.x, b.y, b.w, b.h); x.restore(); };
  if (s.hit > 0) { box(C.ink, 0.9); return; }
  box(C.ink, s.dimA); box(s.tintC, s.tintA * 0.6); box(s.flashC, s.flashA * 0.85); if (s.black > 0) box(C.ink, s.black);
};
// any holder that is not a minigame (a full-screen show, the reel, a chest…): SH.box(h, …) once, SH.tick(g, h, dt) every frame
// (freeze your own clock while SH.frozen(h)), SH.push(h) for the camera, then this after drawing your scene
// pass: 'back' = the dim and the rays (draw it before your scene, so the light fans out behind it), 'front' = everything else; none = both
SH.drawAll = function (x, h, pass) {
  const s = h.sh; if (!s) return; const back = pass !== 'front', front = pass !== 'back';
  if (back && !(s.hit > 0)) { const b = boxOf(s); if (s.dimA > 0.01) { x.save(); x.globalAlpha = Math.round(s.dimA * 8) / 8; x.fillStyle = U.pal(C.ink); x.fillRect(b.x, b.y, b.w, b.h); x.restore(); } }
  SH.drawFx(x, h, pass); if (!front) return; const dimA = s.dimA; s.dimA = 0; SH.drawOver(x, h); s.dimA = dimA; if (s.hit > 0) SH.drawFx(x, h, 'front');
  s.rolls.forEach(r => { const p = cl(r.t / r.dur, 0, 1), v = Math.round(r.v * (1 - Math.pow(1 - p, 2.2))), done = r.t >= r.dur, bump = done ? 1 + 0.25 * Math.exp(-(r.t - r.dur) * 10) : 1 + 0.04 * Math.sin(r.t * 40); x.save(); x.globalAlpha = cl((r.dur + 0.9 - r.t) / 0.3, 0, 1); x.translate(Math.round(r.x), Math.round(r.y - (done ? (r.t - r.dur) * 30 : 0))); x.scale(bump, bump); U.text(x, '+' + M.fmt(v), 0, 0, 64, r.col, { num: true, outline: true }); x.restore(); });
  s.stamps.forEach(p => { const q = p.t / 0.14, k = q < 1 ? 2.4 - 1.4 * eb(q) : 1, al = cl((p.life - p.t) / 0.3, 0, 1); x.save(); x.globalAlpha = al; x.translate(Math.round(p.x), Math.round(p.y)); x.rotate(p.rot); x.scale(k, k); U.text(x, p.text, 0, 0, p.size, p.col, { outline: true }); x.restore(); });
};
SH.draw = function (x, mg) {
  const s = mg.sh; if (!s) return; const X0 = K.SX, Y0 = K.SY, W = K.SW, H = K.SH;
  if (s.gray > 0) { x.save(); x.globalAlpha = 0.9 * s.gray; x.globalCompositeOperation = 'saturation'; x.fillStyle = '#808080'; x.fillRect(X0, Y0, W, H); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 0.25 * s.gray; x.fillStyle = U.pal(C.ink); x.fillRect(X0, Y0, W, H); x.restore(); }
  if (s.dimA > 0.01) { x.save(); x.globalAlpha = Math.round(s.dimA * 8) / 8; x.fillStyle = U.pal(C.ink); x.fillRect(X0, Y0, W, H); x.restore(); }
  SH.drawFx(x, mg);
  const T = s.tense || (s.tLv > 0.02 ? s.lastT : null);
  if (T && s.tLv > 0.02) {
    const beat = Math.max(0, 1 - s.beatT * 5), r = T.r * (1 + 0.05 * beat), a = s.tLv;
    if (T.lv >= 2 && !RM()) { const on = Math.floor(s.clock * 10) % 2; x.save(); x.globalAlpha = a; [[X0, Y0, W, 8], [X0, Y0 + H - 8, W, 8], [X0, Y0, 8, H], [X0 + W - 8, Y0, 8, H]].forEach(([a1, b1, w1, h1]) => K.R(x, a1, b1, w1, h1, on ? C.red : C.gold)); x.restore(); }
    if (T.label && s.tense) { const q = eb(cl(T.t / 0.25, 0, 1)), ly = Math.max(Y0 + 150, T.y - r - 56); x.save(); x.translate(T.x, ly); x.scale(q * (1 + 0.06 * beat), q * (1 + 0.06 * beat)); K.sign(x, T.label, 0, 0, { kind: T.lv >= 2 ? 'red' : 'gold', size: 40, minW: 220 }); x.restore(); }
  }
  if (s.fever > 0 && !RM()) { const ph = s.feverT * 4, cols = [C.gold, C.magenta, C.teal, C.lime]; x.save(); x.globalAlpha = 0.55 + 0.25 * Math.sin(ph * Math.PI); for (let i = 0; i < 4; i++) { const c = cols[(i + Math.floor(ph)) % 4]; if (i === 0) K.R(x, X0, Y0, W, 12, c); if (i === 1) K.R(x, X0 + W - 12, Y0, 12, H, c); if (i === 2) K.R(x, X0, Y0 + H - 12, W, 12, c); if (i === 3) K.R(x, X0, Y0, 12, H, c); } x.restore(); }
  if (s.near) { const p = s.near.t / 0.9, w = Math.round(Math.sin(s.near.t * 40) * 2 * (1 - p)) * GRID; x.save(); x.globalAlpha = 1 - p; x.strokeStyle = U.pal(C.pink); x.lineWidth = GRID; x.strokeRect(Math.round((s.near.x - 70) / GRID) * GRID + w, Math.round((s.near.y - 60) / GRID) * GRID, 140, 120); x.restore(); }
  if (s.hit > 0) { x.save(); x.globalAlpha = 0.875; x.fillStyle = U.pal(C.ink); x.fillRect(X0, Y0, W, H); x.restore(); const b = boxOf(s), J = s.jb; if (J) { x.imageSmoothingEnabled = false; x.drawImage(J.cv, 0, 0, J.W, J.H, b.x, b.y, J.W * GRID, J.H * GRID); } }
  if (s.tintA > 0.02 && !(s.hit > 0)) { x.save(); x.globalAlpha = Math.round(s.tintA * 0.6 * 8) / 8; x.fillStyle = U.pal(s.tintC); x.fillRect(X0, Y0, W, H); x.restore(); }
  if (s.flashA > 0.02 && !(s.hit > 0)) { x.save(); x.globalAlpha = Math.round(s.flashA * 0.85 * 8) / 8; x.fillStyle = '#ffffff'; x.fillRect(X0, Y0, W, H); x.restore(); }
  if (s.black > 0) { x.save(); x.globalAlpha = s.black; K.R(x, X0, Y0, W, H, C.ink); x.restore(); }
  s.rolls.forEach(r => { const p = cl(r.t / r.dur, 0, 1), v = Math.round(r.v * (1 - Math.pow(1 - p, 2.2))), done = r.t >= r.dur, bump = done ? 1 + 0.25 * Math.exp(-(r.t - r.dur) * 10) : 1 + 0.04 * Math.sin(r.t * 40); x.save(); x.globalAlpha = cl((r.dur + 0.9 - r.t) / 0.3, 0, 1); x.translate(Math.round(r.x), Math.round(r.y - (done ? (r.t - r.dur) * 30 : 0))); x.scale(bump, bump); U.text(x, '+' + M.fmt(v), 0, 0, 64, r.col, { num: true, outline: true }); x.restore(); });
  s.stamps.forEach(p => { const q = p.t / 0.14, k = q < 1 ? 2.4 - 1.4 * eb(q) : 1, al = cl((p.life - p.t) / 0.3, 0, 1); x.save(); x.globalAlpha = al; x.translate(Math.round(p.x), Math.round(p.y)); x.rotate(p.rot); x.scale(k, k); U.text(x, p.text, 0, 0, p.size, p.col, { outline: true }); x.restore(); });
};
})();
