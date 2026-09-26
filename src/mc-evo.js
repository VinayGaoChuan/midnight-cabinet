// ==== mc-evo.js ====
(function () {
// Units evolve, and every area has its own pool of units (user rulings 2026-09-26: 「为了让一局游戏能够买到相同单位，所以每次
// 进入一个场景的时候，先随机本次场景的部队池，所有商店都是从这个池子里随机的」, then 「要三个相同的进化一次，这样变化还多，玩家总
// 期待，下一次能进化成什么，一个单位最多进化5次。这个在教学模式中要有，并且进化的时候，要做伟大的进化效果，并且显示进化后的部队卡」).
// · The pool: entering an area (场景) draws a few kinds of units for it; every shop, recruit flag and unit reward there comes
//   from them, so the same unit turns up again and again. The next area keeps the kinds the army is growing (up to 4) and
//   draws the rest anew. The pool shows on the map, under the minimap.
// · Evolution: three of the same unit (evolved fewer than 5 times) become one new unit at once. What it becomes is drawn
//   from the pool (the same vocation more likely, never a lower quality) — the surprise is the point. It is never a loss:
//   the new unit is worth 110% of the three (its life and attack are scaled up when its own price is lower) and wears one
//   more evolution mark. It joins the pool, so two more of it evolve it again. Five evolutions at most.
// · The show: the three fly out of the roster, circle and melt into one light that flickers between the old and the new
//   shape, bursts, and the new unit's card stands in the middle of the screen before it flies into the roster.
// · The prologue starts with two 步卒 and its shop sells a third: three 步卒 become a 铁甲战士.
const M = window.MC, G = M.Game.prototype, DB = M.DB, S = M.Sfx, U = M.UI, P = M.PJ.PAL, Q = M.QUALITY;
const rnd = Math.random, now = () => performance.now(), cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (q) => 1 - Math.pow(1 - q, 3), eb = (q) => { const c = 1.7; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
const RM = () => !!(M.PJ && M.PJ.reduced);

M.EVO_MAX = 5; M.EVO_NEED = 3; M.EVO_PAY = 1.1; M.POOL_N = 8; M.POOL_KEEP = 4; M.POOL_COPIES = 3;
M.EVO_TUT = { from: 'FootSoldier', to: 'IroncladWarrior' };
const TUT_POOL = ['FootSoldier', 'Guard', 'Ranger', 'Pikeman', 'EagleBeakedArcher', 'MageApprentice'];   // 铁甲战士 joins when the 步卒 evolve
const FRONT = ['先锋', '守护者', '战士', '圣骑士'], RANGE = ['射手', '刺客'], CAST = ['法师', '牧师', '祭司', '召唤师'];
const grp = (k) => { const v = DB[k].voc; return FRONT.includes(v) ? 'F' : RANGE.includes(v) ? 'R' : CAST.includes(v) ? 'C' : 'X'; };
const ALL = () => M.SHOP_POOL.concat(['JadeBeast']).filter((k, i, a) => DB[k] && DB[k].cost > 0 && a.indexOf(k) === i);
const shuf = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; };
const tutOf = (run) => !!(run && run.region && run.region.tut);

// ───────── the pool ─────────
// how many of each quality: what the shops sell at this level, and always one epic (佣兵团 sells only epic and up)
function qPlan(L, n) {
  const w = M.shopQW({ lastL: L }).map(x => Math.max(0, x)), s = w.reduce((a, b) => a + b, 0) || 1, c = w.map(x => Math.floor(n * x / s));
  if (!c[2]) c[2] = 1;
  for (let k = 0; k < 8 && c.reduce((a, b) => a + b, 0) < n; k++) { let best = 0, bv = -1e9; w.forEach((x, q) => { const r = n * x / s - c[q]; if (x > 0 && r > bv) { bv = r; best = q; } }); c[best]++; }
  for (let k = 0; k < 8 && c.reduce((a, b) => a + b, 0) > n; k++) c[c.indexOf(Math.max(...c))]--;
  return c;
}
// a front line (3), shooters (2) and casters (2) at least, so every kind of shop has something to sell
M.poolGen = function (run, keep, L) {
  const n = run && run.M && run.M.kit2 === 'focus' ? 6 : M.POOL_N, all = ALL(), out = [];   // 专精卡带 (mc-legacy.js): fewer kinds
  (keep || []).forEach(k => { if (DB[k] && !out.includes(k) && out.length < n) out.push(k); });
  const qc = qPlan(L || 0, n), need = { F: 3, R: 2, C: 2 };
  const took = (k) => { if (qc[DB[k].q] > 0) qc[DB[k].q]--; const g = grp(k); if (need[g] > 0) need[g]--; };
  out.forEach(took);
  const one = (f) => shuf(all.filter(k => !out.includes(k) && f(k)))[0];
  const cheapFront = (k) => DB[k].q === 0 && (DB[k].voc === '先锋' || DB[k].voc === '守护者') && DB[k].cost <= 60;
  if (out.length < n && !out.some(cheapFront)) { const k = one(cheapFront); if (k) { out.push(k); took(k); } }
  for (let guard = 0; out.length < n && guard < 40; guard++) {
    let q = qc.findIndex(x => x > 0); if (q < 0) q = 0;
    const gs = Object.keys(need).filter(g => need[g] > 0), want = gs.length ? gs[Math.floor(rnd() * gs.length)] : null;
    const k = one(x => DB[x].q === q && (!want || grp(x) === want)) || one(x => DB[x].q === q) || one(() => true);
    if (!k) break; out.push(k); took(k);
  }
  return out;
};
M.unitPool = (run) => (run && run.pool && run.pool.types && run.pool.types.length ? run.pool.types.filter(k => DB[k]) : M.SHOP_POOL);
M.poolAdd = (run, k) => { if (run && run.pool && DB[k] && !run.pool.types.includes(k)) run.pool.types.push(k); };
M.areaOf = (run, node) => { if (!run || !run.chap || !M.segsOf) return 0; const segs = M.segsOf(run.regionKey), s = segs[node ? node.seg || 0 : run.chap.from || 0]; return s ? s.area : 0; };
// what the army is growing: the kinds it holds most of (evolved ones count more)
const keepOf = (run, n) => { const c = {}; (run.roster || []).forEach(u => { if ((u.evo || 0) < M.EVO_MAX && DB[u.type]) c[u.type] = (c[u.type] || 0) + 1 + (u.evo || 0) * 0.5; }); return Object.keys(c).sort((a, b) => c[b] - c[a]).slice(0, n); };
M.poolEnter = function (run, node) {
  if (!run || !run.pool || tutOf(run)) return false; const a = M.areaOf(run, node); if (a === run.pool.area) return false;
  run.pool = { area: a, types: M.poolGen(run, keepOf(run, M.POOL_KEEP), M.levelAt(run, node)), at: now() }; return true;
};
// a trip's first area: the starting army's kinds are in it (so they can evolve)
const oNR = M.newRun3;
M.newRun3 = function (meta) {
  const run = oNR.apply(this, arguments); if (!run) return run;
  if (tutOf(run)) run.pool = { area: 0, types: TUT_POOL.filter(k => DB[k]), at: 0 };
  else run.pool = { area: M.areaOf(run), types: M.poolGen(run, keepOf(run, 5), (run.lvl0 || 0) + (run.colOff || 0) * (run.lvlStep || 0)), at: 0 };
  return run;
};
// recruit flags, rewards, mini-games: from the pool too
const oPU = M.pickUnitQ;
M.pickUnitQ = function (run) {
  if (!run || !run.pool) return oPU.apply(this, arguments);
  const qw = M.shopQW(run), L = M.unitPool(run), q = M.wpick([0, 1, 2, 3], x => Math.max(0.01, qw[x])), c = L.filter(k => DB[k].q === q);
  return (c.length ? c : L)[Math.floor(rnd() * (c.length ? c : L).length)];
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
  if (tutOf(run) && sh && sh.units && sh.units.length && DB[T.from] && !run.tutEvo && run.roster.filter(u => u.type === T.from && !(u.evo > 0)).length === 2 && !sh.units.some(c => c.type === T.from)) {
    sh.units[0] = { kind: 'unit', type: T.from, q: DB[T.from].q, cost: Math.max(5, Math.round(DB[T.from].cost * M.priceMul(run))) };
  }
  return r;
};

// ───────── evolution ─────────
M.evoValue = (u) => ((DB[u.type] && DB[u.type].cost) || 10) * (u.ek || 1);
M.evoTarget = function (run, type) {
  const d = DB[type]; if (!d) return type;
  if (tutOf(run) && type === M.EVO_TUT.from && DB[M.EVO_TUT.to]) return M.EVO_TUT.to;
  // never a cheaper body than the one that evolves (2026-09-26 bot runs: a 65 镰刃虫 became a 20 维京战士 ×10.8, and pairs of
  // kinds evolved back and forth); the very top units, with nothing dearer, take the dearest of their quality
  const ok = (k) => k !== type && DB[k] && DB[k].q >= d.q && DB[k].cost >= d.cost && (DB[k].ranged !== 2 || d.ranged === 2);
  const top = (k) => k !== type && DB[k] && DB[k].q >= d.q && DB[k].cost >= d.cost * 0.85 && (DB[k].ranged !== 2 || d.ranged === 2);
  const draw = (list) => { if (!list.length) return null; const w = list.map(k => { const e = DB[k]; let x = 1; if (e.voc === d.voc) x *= 3; if (e.race === d.race) x *= 1.5; if (e.q === d.q + 1) x *= 1.6; else if (e.q > d.q + 1) x *= 0.7; return x; });
    let s = w.reduce((a, b) => a + b, 0) * rnd(); for (let i = 0; i < list.length; i++) { s -= w[i]; if (s <= 0) return list[i]; } return list[list.length - 1]; };
  return draw(M.unitPool(run).filter(ok)) || draw(ALL().filter(ok)) || draw(ALL().filter(top)) || type;
};
// three of a kind that can still evolve (the most evolved first); units still flying in do not count yet
M.evoFind = function (run, hide) {
  const g = {}; (run.roster || []).forEach(u => { if ((u.evo || 0) >= M.EVO_MAX || (hide && hide.has(u.uid)) || !DB[u.type]) return; (g[u.type] = g[u.type] || []).push(u); });
  const k = Object.keys(g).find(t => g[t].length >= M.EVO_NEED);
  return k ? g[k].slice().sort((a, b) => (b.evo || 0) - (a.evo || 0) || (b.ek || 1) - (a.ek || 1)).slice(0, M.EVO_NEED) : null;
};
M.evoMerge = function (run, three, to) {
  const V = three.reduce((a, u) => a + M.evoValue(u), 0), evo = Math.min(M.EVO_MAX, Math.max(...three.map(u => u.evo || 0)) + 1);
  const ek = Math.max(1, Math.round(M.EVO_PAY * V / ((DB[to] && DB[to].cost) || 10) * 100) / 100), sum = (f) => three.reduce((a, u) => a + (u[f] || 0), 0);
  let at = run.roster.length; three.forEach(u => { const i = run.roster.indexOf(u); if (i >= 0) { at = Math.min(at, i); run.roster.splice(i, 1); } });
  const nu = { uid: M.rid(), type: to, star: 1, bAtk: sum('bAtk'), bHp: sum('bHp'), lv: 1, battles: Math.max(...three.map(u => u.battles || 0)), kills: sum('kills'), mana: 0, bonusAtk: 0, evo, ek, from: three[0].type };
  run.roster.splice(at, 0, nu); M.poolAdd(run, to); run.evoN = (run.evoN || 0) + 1; if (tutOf(run)) run.tutEvo = 1;
  if (M._g && M._g.prof) { const st = M._g.prof.stats || (M._g.prof.stats = {}); st.evos = (st.evos || 0) + 1; }
  return nu;
};

// ───────── where a roster card sits (two columns, strongest first — mc-tidy.js) ─────────
function rosterOrder(g) { const run = g.run; return run.roster.filter(u => !g.hideU.has(u.uid)).map((u, i) => [u, M.unitPower(u.type, u), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]); }
function slotPos(g, i) { const L = g._rosLay || { top: g.screen === 'shop' ? 196 : 320, fit: 1 }, f = L.fit || 1; return { x: 24 + (i % 2) * 86 * f + 39 * f, y: L.top + 38 + Math.floor(i / 2) * 104 * f + 48 * f }; }

// ───────── the show ─────────
const T_IN = 0.7, T_SPIN = 2.0, T_BOOM = 2.8, T_HOLD = 4.9, T_END = 5.45;
const silC = new Map();
function sil(img) { if (!img) return null; let c = silC.get(img); if (c) return c; c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height); c.cx = img.cx; c.footY = img.footY; silC.set(img, c); return c; }
const imgOf = (k, s) => { try { return M.spriteCanvas(k, s); } catch (e) { return null; } };
G.evoStart = function (three, to) {
  const order = rosterOrder(this), from = three[0].type, evo = Math.min(M.EVO_MAX, Math.max(...three.map(u => u.evo || 0)) + 1);
  const pos = three.map(u => { const i = order.indexOf(u); return slotPos(this, i < 0 ? 0 : i); });
  three.forEach(u => this.hideU.add(u.uid));
  const sparks = []; for (let i = 0; i < 46; i++) { const a = rnd() * 6.283, sp = 380 + rnd() * 900; sparks.push({ vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.75 - 120, s: 6 + Math.floor(rnd() * 3) * 3 }); }
  this.evoFx = { t: 0, three, to, from, evo, qA: DB[from].q, qB: DB[to].q, pos, imgA: imgOf(from, 6), imgB: imgOf(to, 8), sparks, s: {}, first: !(this.prof && this.prof.stats && this.prof.stats.evos) };
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
  if (im) { const k = Math.min(280 / im.width, 220 / im.height, 3); drawImgAt(ctx, im, 0, -70, k); }
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
      drawImgAt(ctx, sil(showB ? F.imgB : F.imgA), C.x + jx, C.y + jy, 1.5 + 0.35 * q);
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
    // the words: 进化！ and what became what
    if (fl < 0.2) { const a = cl(d / 0.25, 0, 1) * (1 - fl / 0.2); ctx.globalAlpha = a; U.text(ctx, '进化！', C.x, 96, 88, P.gold, { outline: true, ramp: true }); U.text(ctx, DB[F.from].n + '  →  ' + DB[F.to].n, C.x, 176, 36, P.cream, { outline: true }); ctx.globalAlpha = 1; }
  }
  ctx.restore();
}
function finish(g, F) {
  if (!F.nu) F.nu = M.evoMerge(g.run, F.three, F.to);
  F.three.forEach(u => g.hideU.delete(u.uid)); g.hideU.delete(F.nu.uid);
  g.evoFx = null; g.pulse.roster = now(); g.bump();
}
const oTick = G.tick;
G.tick = function (dt) {
  const F0 = this.evoFx; if (F0 && this.keys) Object.keys(this.keys).forEach(k => { this.keys[k] = false; });   // nobody walks while it plays
  oTick.call(this, dt);
  const F = this.evoFx, run = this.run;
  if (!F) { this.evoCheck(); return; }
  if (!run || (this.screen !== 'world' && this.screen !== 'shop')) { if (run) finish(this, F); else this.evoFx = null; return; }
  F.t += (dt || 0) * (this.rushUntil > now() ? 3 : 1);
  beat(F, 'ch', T_IN, () => S.rc && S.rc('charge', { dur: T_BOOM - T_IN, rar: F.qB }));
  const tier = F.t < T_IN ? -1 : Math.min(F.qB, F.qA + Math.floor((F.t - T_IN) / ((T_BOOM - T_IN) / (F.qB - F.qA + 1))));
  if (tier >= 0 && tier !== F.tier && F.t < T_BOOM) { F.tier = tier; S.rc && S.rc('tier', tier); }
  beat(F, 'boom', T_BOOM, () => {
    F.nu = M.evoMerge(run, F.three, F.to); this.hideU.add(F.nu.uid); F.three.forEach(u => this.hideU.delete(u.uid));
    const order = run.roster.filter(u => !this.hideU.has(u.uid) || u === F.nu).map((u, i) => [u, M.unitPower(u.type, u), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]);
    F.dest = slotPos(this, Math.max(0, order.indexOf(F.nu)));
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
  if (this.evoFx) { v.fxZ = 75; v.coverOn = true; v.coverClick = () => { this.hurry && this.hurry(); }; }
  if (!run || !v.w) return v;
  this._rosLay = { top: v.w.rosTop, fit: v.w.rosFit };
  // roster cards: one gold diamond per evolution
  const vis = run.roster.filter(u => !this.hideU.has(u.uid)), byPow = vis.map((u, i) => [u, M.unitPower(u.type, u), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(x => x[0]);
  (v.w.roster || []).forEach((r, i) => { const u = byPow[i], e = u ? u.evo || 0 : 0; r.evoOn = e > 0; r.evoPips = pips(e, e, P.gold, P.gold); if (e > 0) r.stars = ''; });
  // shop cards: how many of it the army holds; the card that makes three glows
  const have = {}; run.roster.forEach(u => { if ((u.evo || 0) < M.EVO_MAX) have[u.type] = (have[u.type] || 0) + 1; });
  if (v.s && run.shop && this.screen === 'shop') (v.s.units || []).forEach((cv, i) => { const c = (run.shop.units || [])[i], n = c ? have[c.type] || 0 : 0; cv.evoOn = !!c && !c.sold && n > 0; cv.evoPips = pips(Math.min(2, n), 3, P.gold, '#3a3450'); cv.evoGo = !!c && !c.sold && n % M.EVO_NEED === M.EVO_NEED - 1; });
  // the area's pool, under the minimap
  v.w.poolOn = this.screen === 'world' && !!run.pool;
  if (v.w.poolOn) {
    const pu = this.pulse && this.pulse.pool ? cl((now() - this.pulse.pool) / 900, 0, 1) : 1;
    v.w.poolSc = pu < 1 ? (1 + 0.12 * Math.sin(pu * Math.PI)).toFixed(3) : 1;
    v.w.pool = M.unitPool(run).map(k => { const d = DB[k], n = have[k] || 0; return { img: M.spriteURL(k, 3), c: Q[d.q].c, pipsOn: n > 0, pips: pips(Math.min(2, n), 2, P.gold, '#3a3450'), tipOn: this.tipFn(() => M.unitTip(k, null, run)) }; });
  }
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  if (key === 'w-pool') return { title: '部队池', c: '#ffcf4a', d: '这个场景的商店和招募只出这几种部队。' };
  if (key === 's-evo') return { title: '进化', c: '#ffcf4a', d: '同一种部队凑齐三支，就进化成一支新的部队。' };
  return oTip.apply(this, arguments);
};
if (M.GUIDE) M.GUIDE.push(
  { id: 'evo', cat: '出征', icon: 'u_star', title: '进化', line: '同一种部队凑齐三支就进化成一支新部队，最多进化 5 次。', scr: 'world', sel: '[data-fx="roster"]' },
  { id: 'pool', cat: '出征', icon: 'e_card', title: '部队池', line: '每个场景只出几种部队，商店和招募都从里面来。', scr: 'world', sel: '[data-tip="w-pool"]' });
})();

;
