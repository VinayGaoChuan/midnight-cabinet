// ==== mc-prosper.js ====
(function () {
// Prosperity on screen (rules in mc-rules26.js; user ruling 2026-09-26). The top bar shows 繁荣 LvN and how far the
// next level is. Rock the base has not opened is pure black and says only which level opens it. When a level is
// reached the next ring opens in one piece of theatre: a gold wave leaves the lift and runs out to the new ring, then
// the black cells crack along glowing seams and burst into shards one after another, nearest the lift first, each
// showing the rock or the terrain it hid (terrain gets its colour and its name), and the banner says the new level.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (q) => 1 - Math.pow(1 - q, 3), RM = () => !!M.PJ.reduced;
const GEO = M.BASE_GEO, CW = GEO.CW, CH = GEO.CH, TOP = GEO.TOP;
const cellXY = (c, r) => ({ x: c * CW, y: TOP + r * CH });

// icon: a small skyline with a gold flag
M.IC.t_pros = (x) => { const R = (a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
  R(4, 16, 8, 12, '#8a7a9a'); R(13, 10, 8, 18, '#b8a8c8'); R(22, 18, 7, 10, '#8a7a9a'); R(6, 19, 3, 3, '#ffcf4a'); R(15, 14, 3, 3, '#ffcf4a'); R(15, 20, 3, 3, '#ffcf4a'); R(24, 21, 3, 3, '#ffcf4a');
  R(16, 2, 2, 9, '#6a5a4a'); x.fillStyle = '#ffcf4a'; x.beginPath(); x.moveTo(18, 2); x.lineTo(26, 5); x.lineTo(18, 8); x.fill(); };

// ───────── a black cell stays black until its turn in the opening ─────────
M.lockedCell = function (m, c, r) {
  if (!M.unlocked(m, c, r)) return true;
  const g = M._g, E = g && g.expand; if (!E || E.m !== m) return false;
  const k = E.at[c + ',' + r]; return k != null && E.t < k;
};

// ───────── the opening ─────────
G.expandStart = function (up) {
  const m = this.meta, cells = [];
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const R = M.ringOf(c, r); if (R > up.from && R <= up.to) cells.push({ c, r, d: Math.abs(c - M.CORE.c) + r * 1.05 + (c < M.CORE.c ? 0 : 0.01) }); }
  cells.sort((a, b) => a.d - b.d);
  const at = {}, W0 = 0.8, STEP = RM() ? 0.05 : 0.11; cells.forEach((o, i) => { o.at = W0 + 0.45 + i * STEP; at[o.c + ',' + o.r] = o.at; o.seed = (o.c * 7 + o.r * 13) % 11; });
  const tEnd = (cells.length ? cells[cells.length - 1].at : W0) + 1.7;
  this.expand = { m, t: 0, up, cells, at, shards: [], W0, tEnd, fired: {}, t0: now() };
  if (this.bv) { this.bv.sel = null; this.bv.free = null; this.bv.tx = 1050; this.bv.ty = 470; this.bv.tz = 0.58; }
  S.creak && S.creak(); this.fx.kick(4); this.bump();
};
const once = (E, k, fn) => { if (!E.fired[k]) { E.fired[k] = 1; fn(); } };
G.expandTick = function (dt) {
  const E = this.expand; if (!E) return; E.t += dt; const t = E.t;
  if (E.m !== this.meta) { this.expand = null; return; }
  if (t > 0.15) once(E, 'wave', () => { S.portal && S.portal(); S.whoosh && S.whoosh(0.5); this.fx.kick(8); });
  E.cells.forEach(o => {
    if (t >= o.at - 0.4) once(E, 'crk' + o.c + ',' + o.r, () => { S.tick && S.tick(o.seed); });
    if (t >= o.at) once(E, 'brk' + o.c + ',' + o.r, () => {
      const { x, y } = cellXY(o.c, o.r);
      for (let i = 0; i < 22; i++) { const a = Math.random() * Math.PI * 2, v = 280 + Math.random() * 520; E.shards.push({ x: x + CW / 2 + Math.cos(a) * 40, y: y + CH / 2 + Math.sin(a) * 30, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 260, s: 10 + Math.random() * 22, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 14, t0: t, gold: i % 5 === 0 }); }
      S.shatter && S.shatter(); this.fx.kick(5);
      const x0 = M.cell(this.meta, o.c, o.r), T = x0 && x0.tile && M.TILES[x0.tile], p = this.cellPos(o.c, o.r);
      if (T) { this.fx.rays(p.x, p.y, T.c, 1.1, { r: 200 }); this.fx.pop(p.x, p.y - 30, T.n, T.c, 34); S.up && S.up(1); }
    });
  });
  const last = E.cells.length ? E.cells[E.cells.length - 1].at : E.W0;
  if (t >= last + 0.6) once(E, 'banner', () => {
    S.fanfare(); this.fx.flash(P.butter, 0.25); const p = this.cellPos(M.CORE.c, M.CORE.r); this.fx.rays(p.x, p.y - 60, P.gold, 1.8, { r: 460 });
    this.banner({ kind: 'win', text: '繁荣度 Lv' + E.up.to, col: '#ffcf4a', col2: '#5a3a08', sub: E.up.to > (M.PROS_RINGS || 4) ? '选一项强化' : E.up.to === (M.PROS_RINGS || 4) ? '所有地块都解锁了' : '地块向外扩了一圈', life: 2.2, y: 440 }); this.pulse.pros = now();
  });
  E.shards = E.shards.filter(s => t - s.t0 < 1.6);
  if (t >= E.tEnd) { this.expand = null; if (this.bv) this.bv.home(); }
  this.bump();
};
// drawn in world space right after the cells (mc-base.js hook): the wave, the cracks on cells still black, the shards
function crackLines(x, X, Y, q, seed) {
  // six seams from near the middle towards the edges, growing with q; gold with a white core
  const cx = X + CW / 2 + ((seed * 13) % 30 - 15), cy = Y + CH / 2 + ((seed * 7) % 20 - 10);
  x.save(); x.lineJoin = 'miter'; x.lineCap = 'butt';
  for (let k = 0; k < 6; k++) {
    const a = k / 6 * Math.PI * 2 + seed, L = (CW * 0.55) * q, n = 4; let px = cx, py = cy; const pts = [[px, py]];
    for (let i = 1; i <= n; i++) { const aa = a + Math.sin(seed * 3 + k * 5 + i * 2.3) * 0.5; px = cx + Math.cos(aa) * L * i / n; py = cy + Math.sin(aa) * L * i / n * 0.75; pts.push([px, py]); }
    [[10, P.amber], [5, P.butter], [2, P.white]].forEach(([w, c]) => { x.strokeStyle = c; x.lineWidth = w; x.beginPath(); pts.forEach(([a2, b2], i) => i ? x.lineTo(a2, b2) : x.moveTo(a2, b2)); x.stroke(); });
  }
  x.restore();
}
M.BASE_HOOKS.push(function (ctx, meta, bv, lights, phase) {
  const g = M._g, E = g && g.expand; if (!E || E.m !== meta || phase !== 'cells') return;
  const t = E.t, lc = cellXY(M.CORE.c, M.CORE.r);
  // the wave: a gold box ring leaves the lift and runs out to the edge of the new ring
  const wq = cl((t - 0.1) / (E.W0 + 0.3), 0, 1);
  if (wq > 0 && wq < 1) {
    const R = E.up.from + (E.up.to - E.up.from) * eo(wq) + 0.5, x0 = lc.x + CW / 2 - R * CW, x1 = lc.x + CW / 2 + R * CW, y1 = TOP + (R + 0.5) * CH;
    ctx.save(); ctx.globalAlpha = 1 - wq * 0.6; ctx.strokeStyle = P.gold; ctx.lineWidth = 16; ctx.strokeRect(x0, TOP - 8, x1 - x0, y1 - TOP + 8); ctx.strokeStyle = P.white; ctx.lineWidth = 5; ctx.strokeRect(x0, TOP - 8, x1 - x0, y1 - TOP + 8); ctx.restore();
    if (lights) lights.push({ x: lc.x + CW / 2, y: TOP + CH, r: R * CW * 1.4, c: '#ffcf4a', f: 1 - wq });
  }
  // the lift glows while the ring opens
  if (lights) lights.push({ x: lc.x + CW / 2, y: lc.y + CH / 2, r: 420, c: '#ffcf4a', f: 0.6 + 0.4 * Math.sin(t * 6) });
  // cracks on the cells still waiting their turn
  E.cells.forEach(o => { if (t >= o.at || t < o.at - 0.45) return; const { x, y } = cellXY(o.c, o.r); crackLines(ctx, x, y, eo(cl((t - (o.at - 0.45)) / 0.45, 0, 1)), o.seed); if (lights) lights.push({ x: x + CW / 2, y: y + CH / 2, r: 260, c: '#ffcf4a', f: 0.8 }); });
  // the flash where a cell just broke, then its shards
  E.cells.forEach(o => { const u = t - o.at; if (u < 0 || u > 0.35) return; const { x, y } = cellXY(o.c, o.r); ctx.save(); ctx.globalAlpha = 1 - u / 0.35; ctx.fillStyle = P.white; ctx.fillRect(x, y, CW, CH); ctx.restore(); if (lights) lights.push({ x: x + CW / 2, y: y + CH / 2, r: 380, c: '#fff3b0', f: 1 - u / 0.35 }); });
  E.shards.forEach(s => { const u = t - s.t0; ctx.save(); ctx.globalAlpha = cl(1 - (u - 0.9) / 0.7, 0, 1); ctx.translate(s.x + s.vx * u, s.y + s.vy * u + 1400 * u * u); ctx.rotate(RM() ? 0 : Math.round((s.rot + s.vr * u) / 0.785) * 0.785); ctx.fillStyle = s.gold ? P.gold : '#000'; ctx.fillRect(-s.s / 2, -s.s / 2, s.s, s.s * 0.7); if (!s.gold) { ctx.fillStyle = P.indigo; ctx.fillRect(-s.s / 2, -s.s / 2, s.s, 3); } ctx.restore(); });
});

// ───────── hooks ─────────
const oTick = G.tick;
G.tick = function (dt) {
  oTick.call(this, dt);
  // the opening never hangs (2026-09-26: a stuck one kept the bar at the old level, and a shown lock would never lift):
  // an error or a show running far past its length finishes it at once, banner and all
  const E = this.expand;
  if (E) { try { if (!this.fx.frozen) this.expandTick(Math.min(dt || 0, 0.05)); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('expand: ' + (e && e.message)); E.t = E.tEnd + 1; }
    if (this.expand === E && (E.t > E.tEnd + 1 || now() - E.t0 > (E.tEnd + 8) * 1000)) { if (!E.fired.banner) { E.fired.banner = 1; this.pulse.pros = now(); this.toast('繁荣度 Lv' + E.up.to, '#ffcf4a'); } this.expand = null; if (this.bv) this.bv.home(); this.bump(); } }
  // a level reached some other way (a keepsake finishing a room, an old save) opens its ring once the base is quiet
  const m = this.meta;
  if (m && this.screen === 'base' && !this.expand && !this.homeQ && !this.raid && !this.rite && !this.modal && !this.tlFx && !this.dayFx) {
    if (m.prosUp) { const up = m.prosUp; delete m.prosUp; this.save(); this.expandStart(up); }
    else { const l1 = M.prosLvOf(M.prosperity(m)), l0 = M.prosLv(m); if (l1 > l0) { m.prosLv = l1; this.save(); this.expandStart({ from: l0, to: l1 }); } }
  }
};
// in the story of a day: right after the rooms that finished, before the calendar turns
const oPD = G.passDay;
G.passDay = function () {
  const r = oPD.apply(this, arguments), m = this.meta;
  if (m && m.prosUp && this.homeQ) { const up = m.prosUp; delete m.prosUp; const st = this.homeQ.steps, i = st.findIndex(s => s && s.run && /tlStart/.test(String(s.run))); const step = { run: () => this.expandStart(up), until: () => !this.expand }; if (i >= 0) st.splice(i, 0, step); else st.push(step); this.save(); }
  return r;
};
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta;
  if (this.expand) { v.tipOn = false; v.pnOn = false; }
  if (v.b && m) {
    // while a ring is opening the bar keeps the old level until the banner says the new one
    const E = this.expand, old = E && E.m === m && !E.fired.banner, lv = old ? E.up.from : M.prosLv(m), p = M.prosperity(m), nx = old ? M.PROS_LV[lv] : M.prosNext(m), lo = M.PROS_LV[lv - 1] || 0;
    v.b.prosLv = lv; v.b.prosW = (nx == null ? 100 : Math.round(cl((p - lo) / (nx - lo), 0, 1) * 100)) + '%'; v.b.prosImg = M.iconURL('t_pros', 2); v.b.prosSc = this.ps ? this.ps('pros') : 1;
  }
  return v;
};
// words: the level and what it does, nothing about points
const oTip = G.tipFor;
G.tipFor = function (key) {
  if (key === 'b-pros') { const m = this.meta, lv = M.prosLv(m); return { title: '繁荣度 Lv' + lv, c: '#ffcf4a', icon: 't_pros', d: '造的建筑品质越高，繁荣度涨得越多；每升一级选一项强化' + (lv < (M.PROS_RINGS || 4) ? '，地块向外扩一圈。' : '。') }; }
  return oTip.apply(this, arguments);
};
const oCT = G.cellTip;
G.cellTip = function (p) { const m = this.meta; if (p && !p.door && p.c != null && M.lockedCell(m, p.c, p.r)) return { title: '未解锁', c: '#8d8496', d: '繁荣度升到 Lv' + M.ringOf(p.c, p.r) + ' 解锁。' }; return oCT.apply(this, arguments); };
const oBC = G.baseClick;
G.baseClick = function (sx, sy) {
  if (this.expand) return;
  const p = !this.raid && this.bv && this.bv.pick(sx, sy), m = this.meta;
  if (p && !p.door && p.c != null && M.lockedCell(m, p.c, p.r)) { M.Sfx.click(); this.closePanel(); this.toast('繁荣度升到 Lv' + M.ringOf(p.c, p.r) + ' 解锁', '#8d8496'); return; }
  return oBC.apply(this, arguments);
};
const oNG = G.newGame;
if (oNG) G.newGame = function () { this.expand = null; return oNG.apply(this, arguments); };
})();

;
