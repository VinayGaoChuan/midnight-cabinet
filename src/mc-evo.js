// ==== mc-evo.js ====
(function () {
// Units evolve, and every area has its own pool of units (user rulings 2026-09-26: 「为了让一局游戏能够买到相同单位，所以每次
// 进入一个场景的时候，先随机本次场景的部队池，所有商店都是从这个池子里随机的」, then 「要三个相同的进化一次，这样变化还多，玩家总
// 期待，下一次能进化成什么，一个单位最多进化5次。这个在教学模式中要有，并且进化的时候，要做伟大的进化效果，并且显示进化后的部队卡」).
// · Evolution (rework 2026-09-26, 「3个射手，合成后，是这个射手的进化型」): three of the same unit become the next tier of
//   its own line (mc-lines.js): same vocation, same character, stronger skills; common → rare → epic → legendary, 3 at most.
// · The pool (same day, 「每个职业，随机一个基础单位就行了」): one line per vocation, all four tiers of it.
// · The show: the three fly out of the roster, circle and melt into one light that flickers between the old and the new
//   shape, bursts, and the new unit's card stands in the middle of the screen until the player clicks; then it flies
//   into the roster (2026-09-26: it used to fly off by itself before it could be read).
// · The prologue starts with two 步卒 and its shop sells a third: three 步卒 become a 盾兵.
const M = window.MC, G = M.Game.prototype, DB = M.DB, S = M.Sfx, U = M.UI, P = M.PJ.PAL, Q = M.QUALITY;
const rnd = Math.random, now = () => performance.now(), cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (q) => 1 - Math.pow(1 - q, 3), eb = (q) => { const c = 1.7; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
const RM = () => !!(M.PJ && M.PJ.reduced);

M.EVO_MAX = 5; M.EVO_NEED = 3; M.EVO_PAY = 1.1; M.POOL_COPIES = 3;
// shops lean to the base tier: the higher tiers mostly come from evolving (专精卡带 leans further, mc-legacy.js)
M.POOL_QB = [1.6, 1.3, 1, 0.55, 0.2, 0];   // 普通 … 神话 (神话 only by evolving)
M.EVO_TUT = { from: 'FootSoldier_T1', to: 'FootSoldier_T2' };
const TUT_LINES = ['FootSoldier', 'Ranger', 'YellowManeHorse', 'MageApprentice', 'DesertBeliever'];
const rndOf = (a) => a[Math.floor(rnd() * a.length)];
const tutOf = (run) => !!(run && run.region && run.region.tut);

// ───────── the pool: one line per vocation, every tier of it (2026-09-26: 「每个职业，随机一个基础单位就行了，这些单位及其进化型，就是该场景的部队池」) ─────────
// the army's own lines stay (per vocation the one it holds most of, higher tiers counting more)
M.poolLines = function (run, keepArmy) {
  if (tutOf(run)) return TUT_LINES.filter(l => DB[M.lineKey(l, 1)]);
  const own = {}; if (keepArmy) (run.roster || []).forEach(u => { const d = DB[u.type]; if (d && d.line && d.next) own[d.line] = (own[d.line] || 0) + 1 + (d.tier - 1) * 2; });
  const out = []; Object.keys(M.VOC || {}).forEach(v => { const Ls = M.linesOfVoc(v); if (!Ls.length) return; const mine = Ls.filter(l => own[l]).sort((a, b) => own[b] - own[a])[0]; out.push(mine || rndOf(Ls)); });
  return out;
};
const typesOf = (lines) => lines.reduce((a, l) => a.concat(M.lineTiers(l)), []);
M.unitPool = (run) => (run && run.pool && run.pool.types && run.pool.types.length ? run.pool.types.filter(k => DB[k]) : M.SHOP_POOL);
M.poolAdd = (run, k) => { if (run && run.pool && DB[k] && !run.pool.types.includes(k)) run.pool.types.push(k); };
M.areaOf = (run, node) => { if (!run || !run.chap || !M.segsOf) return 0; const segs = M.segsOf(run.regionKey), s = segs[node ? node.seg || 0 : run.chap.from || 0]; return s ? s.area : 0; };
M.poolEnter = function (run, node) {
  if (!run || !run.pool || tutOf(run)) return false; const a = M.areaOf(run, node); if (a === run.pool.area) return false;
  const lines = M.poolLines(run, true); run.pool = { area: a, lines, types: typesOf(lines), at: now() }; return true;
};
// a trip's first area; the starting army becomes the pool's line of its vocation (same tier), so it can evolve
const oNR = M.newRun3;
M.newRun3 = function (meta) {
  const run = oNR.apply(this, arguments); if (!run) return run;
  const lines = M.poolLines(run, false);
  run.pool = { area: M.areaOf(run), lines, types: typesOf(lines), at: 0 };
  (run.roster || []).forEach(u => { const d = DB[u.type]; if (!d || !d.voc) return; const ln = lines.find(l => DB[M.lineKey(l, 1)].voc === d.voc); if (!ln || d.line === ln) return; const k = M.lineKey(ln, d.tier || Math.min(4, (d.q || 0) + 1)); if (DB[k]) u.type = k; });
  return run;
};
// recruit flags, rewards, mini-games: from the pool too, leaning to the base tier like the shops
const oPU = M.pickUnitQ;
M.pickUnitQ = function (run) {
  if (!run || !run.pool) return oPU.apply(this, arguments);
  const qw = M.shopQW(run), L = M.unitPool(run), QB = M.POOL_QB, q = M.wpick([0, 1, 2, 3, 4], x => Math.max(0.01, (qw[x] || 0) * (QB[x] || 0))), c = L.filter(k => DB[k].q === q);
  return rndOf(c.length ? c : L);
};
// the area changes as you walk into it
const oArr = G.arrive;
G.arrive = function (n) {
  const ch = this.run && M.poolEnter(this.run, n);
  const r = oArr.apply(this, arguments);
  if (ch) { this.pulse.pool = now(); this.toast && this.toast('新的场景，部队池换了一批', '#ffcf4a'); S.up && S.up(1); }
  return r;
};
// the prologue's shop always has the third 步卒
const oRoll = M.rollShop;
M.rollShop = function (run) {
  const r = oRoll.apply(this, arguments), T = M.EVO_TUT, sh = run && run.shop;
  if (tutOf(run) && sh && sh.units && sh.units.length && DB[T.from] && !run.tutEvo && run.roster.filter(u => u.type === T.from).length === 2 && !sh.units.some(c => c.type === T.from)) {
    sh.units[0] = { kind: 'unit', type: T.from, q: DB[T.from].q, cost: Math.max(5, Math.round(DB[T.from].cost * M.priceMul(run))) };
  }
  return r;
};

// ───────── evolution: three of a kind become the next tier of their own line ─────────
M.evoValue = (u) => ((DB[u.type] && DB[u.type].cost) || 10) * (u.ek || 1);
M.evoTarget = (run, type) => (DB[type] && DB[type].next) || type;
M.evoFind = function (run, hide) {
  const g = {}; (run.roster || []).forEach(u => { const d = DB[u.type]; if (!d || !d.next || (hide && hide.has(u.uid))) return; (g[u.type] = g[u.type] || []).push(u); });
  const k = Object.keys(g).find(t => g[t].length >= M.EVO_NEED);
  return k ? g[k].slice(0, M.EVO_NEED) : null;
};
M.evoMerge = function (run, three, to) {
  const V = three.reduce((a, u) => a + M.evoValue(u), 0), evo = Math.max(0, ((DB[to] && DB[to].tier) || 1) - 1);
  const ek = Math.max(1, Math.round(M.EVO_PAY * V / ((DB[to] && DB[to].cost) || 10) * 100) / 100), sum = (f) => three.reduce((a, u) => a + (u[f] || 0), 0);
  let at = run.roster.length; three.forEach(u => { const i = run.roster.indexOf(u); if (i >= 0) { at = Math.min(at, i); run.roster.splice(i, 1); } });
  const nu = { uid: M.rid(), type: to, star: 1, bAtk: sum('bAtk'), bHp: sum('bHp'), lv: 1, battles: Math.max(...three.map(u => u.battles || 0)), kills: sum('kills'), mana: 0, bonusAtk: 0, evo, ek, from: three[0].type };
  run.roster.splice(at, 0, nu); M.poolAdd(run, to); run.evoN = (run.evoN || 0) + 1; if (tutOf(run)) run.tutEvo = 1;
  if (M._g && M._g.prof) { const st = M._g.prof.stats || (M._g.prof.stats = {}); st.evos = (st.evos || 0) + 1; }
  if (M._g && M._g.meta && DB[to] && DB[to].tier >= 5) { const m = M._g.meta; m.st = m.st || {}; m.st.legends = (m.st.legends || 0) + 1; if (DB[to].tier === 6) m.st.myths = (m.st.myths || 0) + 1; }
  return nu;
};

// ───────── where a roster card sits (two columns, strongest first — mc-tidy.js) ─────────
function rosterOrder(g) { const run = g.run; return run.roster.filter(u => !g.hideU.has(u.uid)).map((u, i) => [u, M.unitPower(u.type, u), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]); }
function slotPos(g, i) { const L = g._rosLay || { top: g.screen === 'shop' ? 196 : 320, fit: 1 }, f = L.fit || 1; return { x: 24 + (i % 2) * 86 * f + 39 * f, y: L.top + 38 + Math.floor(i / 2) * 104 * f + 48 * f }; }

// ───────── the show ─────────
const T_IN = 0.7, T_SPIN = 2.0, T_BOOM = 2.8, T_HOLD = 4.9, T_END = 5.45;
const silC = new Map();
function sil(img) { if (!img) return null; let c = silC.get(img); if (c) return c; c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); c.cx = img.cx; c.footY = img.footY; silC.set(img, c); return c; }
// a silhouette in a colour (the new tier flickers in its quality colour: a line keeps its character's shape), and the
// character with a ring of that colour around it (the card)
const colC = new Map();
function colSil(img, col) { if (!img) return null; const k = col; let m = colC.get(img); if (!m) colC.set(img, m = {}); if (m[k]) return m[k]; const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return (m[k] = c); }
function outlined(img, col, w) { if (!img) return null; const k = 'o' + col + w; let m = colC.get(img); if (!m) colC.set(img, m = {}); if (m[k]) return m[k]; const c = document.createElement('canvas'); c.width = img.width + w * 2; c.height = img.height + w * 2; const x = c.getContext('2d'), s = colSil(img, col);
  for (const [dx, dy] of [[-w, 0], [w, 0], [0, -w], [0, w], [-w, -w], [w, -w], [-w, w], [w, w]]) x.drawImage(s, w + dx, w + dy); x.drawImage(img, w, w); return (m[k] = c); }
const imgOf = (k, s) => { try { return M.spriteCanvas(k, s); } catch (e) { return null; } };
// host: the garrison on the base (mc-night.js) — the three rise from its chip on the bar and the card flies back into it
G.evoStart = function (three, to, host) {
  const from = three[0].type, evo = Math.min(M.EVO_MAX, Math.max(...three.map(u => u.evo || 0)) + 1);
  let pos; if (host) { const p = this.fxPos('mgar') || { x: 700, y: 50 }; pos = three.map((u, i) => ({ x: p.x + (i - 1) * 90, y: p.y + 60 })); }
  else { const order = rosterOrder(this); pos = three.map(u => { const i = order.indexOf(u); return slotPos(this, i < 0 ? 0 : i); }); }
  three.forEach(u => this.hideU.add(u.uid));
  const sparks = []; for (let i = 0; i < 46; i++) { const a = rnd() * 6.283, sp = 380 + rnd() * 900; sparks.push({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75 - 120, s: 6 + Math.floor(rnd() * 3) * 3 }); }
  this.evoFx = { t: 0, three, to, from, evo, host: host || null, over: !!(DB[to].tier > M.EVO_BASE), qA: DB[from].q, qB: DB[to].q, pos, imgA: imgOf(from, 6), imgB: imgOf(to, 8), sparks, s: {}, first: !(this.prof && this.prof.stats && this.prof.stats.evos) };
  S.rc && S.rc('in'); this.bump();
};
function beat(F, k, at, fn) { if (F.t >= at && !F.s[k]) { F.s[k] = 1; try { fn(); } catch (e) {} } }
function drawImgAt(ctx, im, x, y, sc) { if (!im) return; ctx.save(); ctx.imageSmoothingEnabled = false; ctx.translate(Math.round(x), Math.round(y)); ctx.scale(sc, sc); ctx.drawImage(im, -im.width / 2, -im.height / 2); ctx.restore(); }
function diamond(ctx, x, y, r, col) { ctx.save(); ctx.translate(x, y); ctx.rotate(Math.PI / 4); U.R(ctx, -r - 3, -r - 3, r * 2 + 6, r * 2 + 6, P.ink); U.R(ctx, -r, -r, r * 2, r * 2, col); U.R(ctx, -r, -r, r * 2, 3, P.white); ctx.restore(); }
function wrap(ctx, s, max, size) { ctx.save(); ctx.font = U.font(size); const out = []; let line = ''; for (const ch of String(s)) { if (ctx.measureText(line + ch).width > max && line) { out.push(line); line = ch; } else line += ch; } if (line) out.push(line); ctx.restore(); return out; }
// the new unit's card: marks, the unit, name, vocation and power, its one line
const CW = 400, CH = 520;
function drawCard(ctx, x, y, sc, F) {
  const d = DB[F.to], qc = Q[d.q].c, im = F.imgB, u = F.nu;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(sc, sc);
  M.glow(ctx, 0, 0, 420, qc, 0.45);
  U.R(ctx, -CW / 2 + 12, -CH / 2 + 12, CW, CH, P.ink);
  U.box(ctx, -CW / 2, -CH / 2, CW, CH, P.night);
  ctx.fillStyle = U.lg(ctx, 0, -CH / 2, 0, 60, [[0, qc], [1, P.night]], 5); ctx.globalAlpha = 0.35; ctx.fillRect(-CW / 2, -CH / 2, CW, CH / 2 + 60); ctx.globalAlpha = 1;
  [[-CW / 2 + 6, -CH / 2 + 6, CW - 12, 6], [-CW / 2 + 6, CH / 2 - 12, CW - 12, 6], [-CW / 2 + 6, -CH / 2 + 6, 6, CH - 12], [CW / 2 - 12, -CH / 2 + 6, 6, CH - 12]].forEach(r => U.R(ctx, r[0], r[1], r[2], r[3], qc));
  for (let i = 0; i < F.evo; i++) diamond(ctx, (i - (F.evo - 1) / 2) * 34, -CH / 2 + 40, 10, P.gold);
  if (im) { const k = Math.min(280 / im.width, 220 / im.height, 3), w = Math.max(2, Math.round(3 / k)); drawImgAt(ctx, d.q > 0 ? outlined(im, qc, w) : im, 0, -70, k); }
  U.text(ctx, d.n, 0, 90, 44, qc, { outline: true });
  const pw = u ? M.unitPower(u.type, u) : d.cost, vc = (M.VOCS && M.VOCS[d.voc]) || P.cream;
  U.text(ctx, (d.voc || '') + '　★ ' + pw, 0, 140, 28, vc);
  wrap(ctx, M.unitLine ? M.unitLine(F.to) : '', CW - 60, 24).slice(0, 3).forEach((ln, i) => U.text(ctx, ln, 0, 188 + i * 32, 24, P.cream));
  ctx.restore();
}
function drawEvo(ctx, g, F) {
  const T = F.t, still = RM(), C = { x: 960, y: 460 }, qa = F.qA, qb = F.qB;
  const climb = T < T_IN ? qa : Math.min(qb, qa + Math.floor((T - T_IN) / ((T_BOOM - T_IN) / (qb - qa + 1)))), gc = Q[climb].c, cB = Q[qb].c;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  U.dim(ctx, T < T_HOLD ? cl(T / 0.3, 0, 1) : 1 - cl((T - T_HOLD) / (T_END - T_HOLD), 0, 1));
  // rays behind everything, turning, in the colour the light has climbed to
  if (T > T_IN * 0.5 && T < T_HOLD + 0.2) { const a = cl((T - T_IN * 0.5) / 0.6, 0, 1) * (T > T_BOOM ? 0.55 : 0.3); ctx.save(); ctx.translate(C.x, C.y); ctx.rotate(still ? 0 : T * 0.5); ctx.globalAlpha = a; for (let i = 0; i < 16; i++) { ctx.rotate(Math.PI / 8); ctx.fillStyle = i % 2 ? (T > T_BOOM ? cB : gc) : P.butter; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-34, -900); ctx.lineTo(34, -900); ctx.fill(); } ctx.restore(); }
  if (T < T_BOOM) {
    const shake = T > T_SPIN ? (T - T_SPIN) / (T_BOOM - T_SPIN) * (8 + qb * 5) : 0, jx = still ? 0 : (rnd() - 0.5) * shake, jy = still ? 0 : (rnd() - 0.5) * shake;
    if (T < T_SPIN) {
      // the three fly in from the roster and circle, faster and closer
      const qi = eo(cl(T / T_IN, 0, 1)), qs = cl((T - T_IN) / (T_SPIN - T_IN), 0, 1), ang0 = still ? 0 : qs * qs * 9, R = 250 - 200 * qs * qs;
      M.glow(ctx, C.x, C.y, 140 + 200 * qs, gc, 0.25 + 0.4 * qs);
      F.pos.forEach((p, i) => {
        const a = ang0 + i * 2.094 - Math.PI / 2, ox = C.x + Math.cos(a) * R, oy = C.y + Math.sin(a) * R * 0.6, x = p.x + (ox - p.x) * qi, y = p.y + (oy - p.y) * qi - Math.sin(qi * Math.PI) * 120, sc = 1 + 0.9 * qi;
        if (T > T_IN) for (let k = 1; k <= 4; k++) { const a2 = a - k * 0.12 * (1 + qs * 3); ctx.globalAlpha = 0.18 * (5 - k) / 4; drawImgAt(ctx, sil(F.imgA), C.x + Math.cos(a2) * R, C.y + Math.sin(a2) * R * 0.6, sc); } ctx.globalAlpha = 1;
        M.glow(ctx, x, y, 110, gc, 0.3); drawImgAt(ctx, qs > 0.5 ? sil(F.imgA) : F.imgA, x, y, sc);
      });
    } else {
      // one light in the middle, flickering between the old shape and the new one, faster and faster
      const q = (T - T_SPIN) / (T_BOOM - T_SPIN), f = 3 + 22 * q * q, showB = Math.floor((T - T_SPIN) * f * 2) % 2 === 1;
      M.glow(ctx, C.x, C.y, 260 + 260 * q, gc, 0.5 + 0.35 * q); M.glow(ctx, C.x, C.y, 90, P.white, 0.45);
      drawImgAt(ctx, showB ? colSil(F.imgB, cB) : sil(F.imgA), C.x + jx, C.y + jy, (1.5 + 0.35 * q) * (showB ? 1.12 : 1));
      if (qb > qa && q > 0.45) { ctx.save(); ctx.translate(C.x, C.y); ctx.strokeStyle = cB; ctx.lineWidth = 6; for (let i = 0; i < 7; i++) { let a = i * 0.9 + 0.3, x = 0, y = 0; ctx.beginPath(); ctx.moveTo(0, 0); for (let s = 0; s < 5 * (q - 0.45) / 0.55 + 1; s++) { a += (i % 2 ? 0.4 : -0.4); x += Math.cos(a) * 34; y += Math.sin(a) * 34; ctx.lineTo(x, y); } ctx.stroke(); } ctx.restore(); }
    }
  } else {
    const d = T - T_BOOM;
    if (d < 0.35) { ctx.globalAlpha = 0.9 * (1 - d / 0.35); U.R(ctx, 0, 0, 1920, 1080, P.white); ctx.globalAlpha = 1; }
    if (d < 0.8) { const e = eo(d / 0.8); [[P.ink, 14], [cB, 8], [P.white, 3]].forEach(([c, w]) => { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(C.x, C.y, 40 + e * 1300, 30 + e * 760, 0, 0, 7); ctx.stroke(); }); }
    if (d < 1.3) F.sparks.forEach(p => { ctx.globalAlpha = cl(1 - d / 1.3, 0, 1); U.R(ctx, C.x + p.vx * d - p.s / 2, C.y + p.vy * d + 700 * d * d - p.s / 2, p.s, p.s, (p.s > 8 ? cB : P.butter)); }); ctx.globalAlpha = 1;
    // the card: pops in, holds, then flies into the roster
    const fl = cl((T - T_HOLD) / (T_END - T_HOLD - 0.05), 0, 1), q = eo(fl), pop = still ? 1 : eb(cl(d / 0.45, 0, 1)), to = F.dest || { x: 80, y: 400 };
    const x = C.x + (to.x - C.x) * q, y = C.y + (to.y - C.y) * q - Math.sin(q * Math.PI) * 140, sc = (1 - 0.86 * q) * pop;
    if (fl < 1) drawCard(ctx, x, y, sc, F);
    if (!F.go && d > 0.6) { ctx.globalAlpha = 0.55 + 0.45 * Math.abs(Math.sin(T * 3)); U.text(ctx, '点击继续', C.x, C.y + CH / 2 + 60, 30, P.cream, { outline: true }); ctx.globalAlpha = 1; }
    // the words: 进化！ and what became what
    if (fl < 0.2) { const a = cl(d / 0.25, 0, 1) * (1 - fl / 0.2); ctx.globalAlpha = a; U.text(ctx, F.over ? '超限进化！' : '进化！', C.x, 96, 88, F.over ? Q[F.qB].c : P.gold, { outline: true, ramp: true }); U.text(ctx, DB[F.from].n + '  →  ' + DB[F.to].n, C.x, 176, 36, P.cream, { outline: true }); ctx.globalAlpha = 1; }
  }
  ctx.restore();
}
function finish(g, F) {
  if (!F.nu) F.nu = M.evoMerge(F.host || g.run, F.three, F.to);
  F.three.forEach(u => g.hideU.delete(u.uid)); g.hideU.delete(F.nu.uid);
  g.evoFx = null; g.pulse.roster = now(); g.bump();
}
const oTick = G.tick;
G.tick = function (dt) {
  const F0 = this.evoFx; if (F0 && this.keys) Object.keys(this.keys).forEach(k => { this.keys[k] = false; });   // nobody walks while it plays
  oTick.call(this, dt);
  const F = this.evoFx, run = F && F.host ? F.host : this.run;
  if (!F) { this.evoCheck(); return; }
  if (!run || (F.host ? this.screen !== 'base' : this.screen !== 'world' && this.screen !== 'shop')) { if (run) finish(this, F); else this.evoFx = null; return; }
  F.t += (dt || 0) * (this.rushUntil > now() ? 3 : 1);
  // the new card stays until the player clicks (user ruling 2026-09-26: 「合成之后的卡片，不要自动收起，玩家点击之后再收起」)
  if (!F.go && F.t > T_HOLD) F.t = T_HOLD;
  beat(F, 'ch', T_IN, () => S.rc && S.rc('charge', { dur: T_BOOM - T_IN, rar: F.qB }));
  const tier = F.t < T_IN ? -1 : Math.min(F.qB, F.qA + Math.floor((F.t - T_IN) / ((T_BOOM - T_IN) / (F.qB - F.qA + 1))));
  if (tier >= 0 && tier !== F.tier && F.t < T_BOOM) { F.tier = tier; S.rc && S.rc('tier', tier); }
  beat(F, 'boom', T_BOOM, () => {
    F.nu = M.evoMerge(run, F.three, F.to); this.hideU.add(F.nu.uid); F.three.forEach(u => this.hideU.delete(u.uid));
    const order = run.roster.filter(u => !this.hideU.has(u.uid) || u === F.nu).map((u, i) => [u, M.unitPower(u.type, u), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]);
    F.dest = F.host ? (this.fxPos('mgar') || { x: 700, y: 50 }) : slotPos(this, Math.max(0, order.indexOf(F.nu)));
    S.rc && S.rc('shatter', F.qB); if (this.fx) { this.fx.kick && this.fx.kick(18 + F.qB * 6); this.fx.burst && this.fx.burst(960, 460, Q[F.qB].c, 36); }
    this.bump();
  });
  beat(F, 'fly', T_HOLD, () => S.rc && S.rc('fly'));
  const fc = this.ui && this.ui.cv && this.ui.cv('fx'); if (fc) { try { drawEvo(fc.getContext('2d'), this, F); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('evo draw: ' + e.message); finish(this, F); return; } }
  if (F.t >= T_END) { const d = F.dest; finish(this, F); if (d && this.fx && this.fx.burst) this.fx.burst(d.x, d.y, Q[F.qB].c, 20); S.rc && S.rc('land', F.qB); }
};
// start one when three of a kind stand in the roster and nothing else is playing
G.evoCheck = function () {
  const run = this.run; if (!run || !run.roster || this.evoFx || (this.screen !== 'world' && this.screen !== 'shop')) return;
  if (this.mini || this.reel || this.chest || this.cardFx || this.settle || this.tear || this.fvStage) return;
  if (this.hideU && this.hideU.size && run.roster.some(u => this.hideU.has(u.uid))) return;   // a unit still flying in
  const three = M.evoFind(run); if (three) this.evoStart(three, M.evoTarget(run, three[0].type));
};
const oLS = G.longShow; G.longShow = function () { return !!this.evoFx || oLS.apply(this, arguments); };
// shops, the walk, the recruit flag: nothing else is clicked while it plays (a click hurries it)
['buy', 'refresh', 'leaveShop', 'sellSel'].forEach(k => { const o = G[k]; if (o) G[k] = function () { if (this.evoFx) { this.hurry && this.hurry(); return; } return o.apply(this, arguments); }; });

// ───────── what the screens show ─────────
const pips = (n, of, on, off) => { const a = []; for (let i = 0; i < of; i++) a.push({ c: i < n ? on : off }); return a; };
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (this.evoFx) { const F = this.evoFx; v.fxZ = 75; v.coverOn = true; v.coverClick = () => { if (F.t >= T_BOOM + 0.45) { F.go = true; S.click && S.click(); } else if (this.hurry) this.hurry(); }; }
  if (!run || !v.w) return v;
  this._rosLay = { top: v.w.rosTop, fit: v.w.rosFit };
  // roster cards: one gold diamond per evolution
  const vis = run.roster.filter(u => !this.hideU.has(u.uid)), byPow = vis.map((u, i) => [u, M.unitPower(u.type, u), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]);
  (v.w.roster || []).forEach((r, i) => { const u = byPow[i], d = u && DB[u.type], e = d && d.tier ? d.tier - 1 : u ? u.evo || 0 : 0; r.evoOn = e > 0; r.evoPips = pips(e, e, P.gold, P.gold); if (e > 0) r.stars = ''; });
  // shop cards: how many of it the army holds; the card that makes three glows
  const have = {}; run.roster.forEach(u => { if (DB[u.type] && DB[u.type].next) have[u.type] = (have[u.type] || 0) + 1; });
  if (v.s && run.shop && this.screen === 'shop') (v.s.units || []).forEach((cv, i) => { const c = (run.shop.units || [])[i], n = c ? have[c.type] || 0 : 0; cv.evoOn = !!c && !c.sold && n > 0; cv.evoPips = pips(Math.min(2, n), 3, P.gold, '#3a3450'); cv.evoGo = !!c && !c.sold && n % M.EVO_NEED === M.EVO_NEED - 1 && (!M.evoOpen || M.evoOpen(run.M, c.type)); });
  // the area's pool, under the minimap
  v.w.poolOn = this.screen === 'world' && !!run.pool;
  if (v.w.poolOn) {
    const pu = this.pulse && this.pulse.pool ? cl((now() - this.pulse.pool) / 900, 0, 1) : 1;
    v.w.poolSc = pu < 1 ? (1 + 0.12 * Math.sin(pu * Math.PI)).toFixed(3) : 1;
    // one card per line (its base unit); diamonds: how close a tier of it is to evolving; the tip names the tiers
    const lines = run.pool.lines || [];
    v.w.pool = lines.map(l => { const ks = M.lineTiers(l), k1 = ks[0], d = DB[k1], n = Math.max(0, ...ks.map(k => (have[k] || 0) % M.EVO_NEED));
      return { img: M.spriteURL(k1, 3), c: Q[d.q].c, pipsOn: n > 0, pips: pips(n, 2, P.gold, '#3a3450'), tipOn: this.tipFn(() => { const t = M.unitTip(k1, null, run) || { title: d.n, lines: [] };
        const cap = M.vocCap ? M.vocCap(run.M, d.voc) : 6; t.lines = (t.lines || []).concat([{ rich: [{ t: '进化　', c: '#ffcf4a', b: 1 }].concat(ks.slice(1).map((k, i) => ({ t: (i ? ' → ' : '') + DB[k].n, c: DB[k].tier > cap ? '#5a5670' : Q[DB[k].q].c, b: 1 }))) }]).concat(cap < 6 ? [{ t: '灰色的档位要在基地建' + d.voc + '的进化建筑', c: '#a9a3c9' }] : []); return t; }) }; });
  }
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  if (key === 'w-pool') return { title: '部队池', c: '#ffcf4a', d: '这个场景的商店和招募只出这几条进化链。' };
  if (key === 's-evo') return { title: '进化', c: '#ffcf4a', d: '同一种部队凑齐三支，就进化成下一档；稀有以上要在基地建进化建筑。' };
  return oTip.apply(this, arguments);
};
if (M.GUIDE) M.GUIDE.push(
  { id: 'evo', cat: '出征', icon: 'u_star', title: '进化', line: '同一种部队凑齐三支，就进化成同一条链的下一档；默认最高到稀有，再往上要建进化建筑。', scr: 'world', sel: '[data-fx="roster"]' },
  { id: 'pool', cat: '出征', icon: 'e_card', title: '部队池', line: '每个场景每个职业一条进化链，商店和招募都从里面来。', scr: 'world', sel: '[data-tip="w-pool"]' });
})();

;
