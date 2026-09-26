// ==== mc-timeline.js ====
(function () {
// The calendar (user rulings 2026-09-24 / 25): a strip of 10 days sits in the top bar, centre-right. It shows the
// current five-day stretch and the next one: 混沌来袭 closes every stretch, and each stretch carries two other events
// (merchant, lucky star …). A passing day only moves the "today" frame one cell; once the stretch's 混沌来袭 is over,
// the whole strip advances five days in a big show: the spent days fall away, the strip rolls, the next five days
// land one by one and the next 混沌来袭 is called out. An event on the new day happens right after the frame moves.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, cl = (v, a, b) => Math.max(a, Math.min(b, v));
// round day nodes with three small dots between (user ruling 2026-09-25): a passing day lights the dots one by one
const DAYS = 10, CW = 52, GAP = 50, PITCH = CW + GAP, NDOT = 3, TLX = 560, TLY = 6, STEP_D = 1.5, EV_D = 2.9, BIG_D = 4.8;
const EV = {
  raid:     { n: '混沌来袭', ic: 'e_skull', c: '#e8434f', d: '怪物攻打主基地，领袖出来守城。' },
  merchant: { n: '流浪商人', ic: 't_coin', c: '#ffcf4a', d: '用物资或碎片，换随机的好东西。', w: 5 },
  star:     { n: '幸运之星', ic: 't_clover', c: '#9cff7a', d: '三选一：下一次出征的祝福。', w: 4 },
  recruit:  { n: '招募日', ic: 'f_recruit', c: '#7fb0ff', d: '下一次招募领袖免费，至少「稀有」。', w: 2 },
  ley:      { n: '地脉涌动', ic: 'l_ley', c: '#b86bff', d: '一格岩层变成随机的特殊地形。', w: 2 },
  plague:   { n: '疫病', ic: 't_cross', c: '#c8e070', d: '领袖们病倒了：花物资治疗，或者每人失去 30% 生命。', w: 2 },
  harvest:  { n: '丰收', ic: 't_sack', c: '#e8c86a', d: '所有挖掘和建造各推进 1 天。', w: 3 },
};
M.DAYEV = EV;
const E5 = () => M.RAID_EVERY;
const raidOn = (m, d) => d % E5() === 0 && m.lastRaid !== d && m.heroes.length > 0;
// the stretch on show: it starts the day after the last 混沌来袭 that is over
M.tlWinStart = (m) => { const E = E5(); let d = m.day; if (d % E === 0 && m.lastRaid === d) d++; return E * Math.floor((d - 1) / E) + 1; };
// two events in every stretch, rolled a stretch ahead so the big show can land them; old saves roll again once
M.dayEvents = function (m) {
  const E = E5();
  if (m.evV !== 2) { m.evs = (Array.isArray(m.evs) ? m.evs : []).filter(e => e && e.done); m.evGen = m.day; m.evV = 2; }
  m.evs = (Array.isArray(m.evs) ? m.evs : []).filter(e => e && EV[e.k] && e.day >= m.day - 2 * E);
  const upto = M.tlWinStart(m) + DAYS + E - 1;
  for (let guard = 0; (m.evGen || 0) < upto && guard < 8; guard++) {
    const d0 = (m.evGen || 0) + 1, end = E * Math.ceil(d0 / E), days = [];
    for (let d = d0; d < end; d++) if (d > m.day && d > 1 && !m.evs.some(e => e.day === d)) days.push(d);
    const kinds = Object.keys(EV).filter(k => EV[k].w);
    days.sort(() => Math.random() - 0.5).slice(0, 2).forEach(d => { const k = M.wpick(kinds, x => EV[x].w); kinds.splice(kinds.indexOf(k), 1); m.evs.push({ day: d, k }); });
    m.evGen = end;
  }
  return m.evs;
};
// the event that fires on a day (not yet done) / what a cell shows (done or not)
M.eventOn = (m, d) => (raidOn(m, d) ? 'raid' : ((m.evs || []).find(e => e.day === d && !e.done) || {}).k || null);
const shownOn = (m, d) => (d % E5() === 0 ? 'raid' : ((m.evs || []).find(e => e.day === d) || {}).k || null);

// ───────── the strip ─────────
const IC = (k) => (M.iconURL ? M.iconURL(k, 2) : '');
function cells(g, m, first, n) {
  const out = []; for (let i = 0; i < n; i++) {
    const d = first + i, k = shownOn(m, d), E = k && EV[k], past = d < m.day || (d === m.day && k === 'raid' && m.lastRaid === d), today = d === m.day && !past, tom = d === m.day + 1;
    out.push({ d, k, E, past, x: i * PITCH, num: String(d), lab: today ? '今天' : tom ? '明天' : '', c: E ? E.c : '#3d3a8c', dc: today ? '#ffcf4a' : E ? E.c : '#a9a3c9', hasIc: !!E, noIc: !E, ic: E ? IC(E.ic) : '',
      tipOn: g.tipFn(() => (E ? { title: E.n, c: E.c, icon: E.ic, d: E.d, lines: [{ t: past ? '已经过去' : today ? '今天' : '第 ' + d + ' 天（' + (d - m.day) + ' 天后）', c: '#a9a3c9' }] } : { title: today ? '今天 · 第 ' + d + ' 天' : '第 ' + d + ' 天', c: '#ffcf4a', d: past ? '已经过去。' : today ? '' : '这一天没有事件。' })),
      op: past ? 0.45 : 1, dy: 0, sc: 1, stamp: past, stampSc: 1, fl: 0 });
  }
  return out;
}
const eback = (t) => { t = cl(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const eio = (t) => { t = cl(t, 0, 1); return t * t * (3 - 2 * t); };
const eoq = (t) => { t = cl(t, 0, 1); return 1 - (1 - t) * (1 - t); };
// 卡皮「下一天」的节拍：按下去白光一闪（0.25 秒）；格子跳一下 1.2 倍（0.15 秒）再落回（0.05 秒）；底光 0.8 ↔ 1 呼吸
const PRESS = [[0, 0, 0, 0], [0.067, 1, 0, 0], [0.117, 1, 0, 0], [0.25, 0, 0, 0]];
const GLOW = [[0, 0, 0, 0], [0.08, 1, 0, 0], [0.26, 0.8, 0, 0], [0.42, 1, 0, 0], [0.6, 0.8, 0, 0], [0.78, 1, 0, 0], [0.96, 0.8, 0, 0], [1.14, 1, 0, 0], [1.32, 0.8, 0, 0]];
const bump = (u) => (u <= 0 || u >= 0.2 ? 1 : u < 0.15 ? 1 + 0.2 * eoq(u / 0.15) : 1.2 - 0.2 * ((u - 0.15) / 0.05));
const TOK_FLY = 0.5, TOK_LAND = TOK_FLY - 0.2, BANNER_CY = 505;
const pop = (t) => { t = cl(t, 0, 1); return t < 0.55 ? 1.3 * eio(t / 0.55) : 1.3 - 0.3 * eio((t - 0.55) / 0.45); };
const W = DAYS * PITCH - GAP;
// where a cell of the strip is on screen (the strip scales about its top centre)
const cellAt = (tl, i) => { const lx = tl.x + i * PITCH + CW / 2, ly = 6 + CW / 2; return { x: TLX + W / 2 + (lx - W / 2) * tl.sc + tl.dx, y: TLY + ly * tl.sc + tl.y }; };
function stripState(g, m) {
  const F = g.tlFx, tl = { left: TLX, w: W, cw: W + 24, x: 0, dx: 0, y: 0, sc: 1, shade: 0, banner: false, mx: 0, msc: 1, mop: 1 };
  const ws = F && F.kind === 'big' ? F.from : m.tlWin != null ? m.tlWin : M.tlWinStart(m);
  tl.cells = cells(g, m, ws, F && F.kind === 'big' ? DAYS + (F.to - F.from) : DAYS);
  let today = m.day;
  if (F && F.kind === 'day') {
    const t = F.t; today = t < 0.9 ? F.from : F.to;
    const i0 = F.from - ws, i1 = F.to - ws, lift = eio(t / 0.2) * (1 - eio((t - (F.dur - 0.3)) / 0.3)); tl.sc = 1 + 0.06 * lift;
    const c0 = tl.cells[F.from - ws]; if (c0) { c0.fl = M.curve(PRESS, t).toFixed(2); c0.stamp = t > 0.2; c0.stampSc = t > 0.2 ? 1 + 1.4 * (1 - eio((t - 0.2) / 0.18)) : 1; c0.op = 1 - 0.55 * eio((t - 0.2) / 0.3); c0.lab = t < 0.9 ? '今天' : ''; c0.dc = t < 0.9 ? '#ffcf4a' : '#a9a3c9'; }
    const c1 = tl.cells[F.to - ws]; if (c1) { c1.sc = bump(t - 1.05) * (F.ev ? bump(t - (F.dur - TOK_LAND)) : 1); c1.fl = Math.max(M.curve(PRESS, t - 1.0), F.ev ? M.curve(PRESS, t - (F.dur - TOK_LAND) + 0.05) : 0).toFixed(2); c1.op = 1; c1.stamp = false; c1.lab = t < 0.9 ? '明天' : '今天'; c1.dc = t < 0.9 ? (c1.E ? c1.E.c : '#a9a3c9') : '#ffcf4a'; }
    const c2 = tl.cells[F.to - ws + 1]; if (c2 && t < 0.9) c2.lab = '';
    tl.mx = (i0 + (i1 - i0) * eback((t - 0.75) / 0.45)) * PITCH; tl.mop = i1 >= 0 && i1 < DAYS ? 1 : 1 - eio((t - 0.3) / 0.4);
    if (F.ev) {
      // 照卡皮的「下一天」：事件名弹出（弹出 1.1 → 0.96 → 1.02 → 1）、底下一条事件色的底光呼吸；混沌来袭是从上面砸下来、歪着站住。
      // 最后缩到一半，0.2 秒飞回时间轴那一格，那一格跳一下
      const bt = t - 1.2, ft = t - (F.dur - TOK_FLY), fq = eoq(ft / 0.2), bad = F.ev === 'raid';
      tl.banner = bt > 0 && ft < 0.2; tl.shade = 0.45 * eio(bt / 0.25) * (1 - eio(ft / 0.2));
      tl.bannerTxt = EV[F.ev].n; tl.bannerC = EV[F.ev].c; tl.bannerSub = EV[F.ev].d;
      const shrink = 1 - 0.5 * eio((ft + 0.06) / 0.06), p = cellAt(tl, i1);
      tl.bannerSc = ((bad ? 1 : M.curve(M.CURVE.pop, bt * 1.69)) * shrink * (1 - 0.8 * fq)).toFixed(3);
      tl.bannerDY = Math.round((bad ? M.curve(M.CURVE.drop, bt) - 218 : 0) + (p.y - BANNER_CY) * fq); tl.bannerX = Math.round((p.x - 960) * fq);
      tl.bannerRot = bad ? (-4 * eio((bt - 0.13) / 0.12)).toFixed(2) : 0; tl.bannerOp = eio(bt / 0.05); tl.bannerSubOp = (1 - eio((ft + 0.06) / 0.06)).toFixed(2);
      tl.glowOn = true; tl.glowSc = eio((bt - 0.13) / 0.08).toFixed(2); tl.glowOp = (M.curve(GLOW, bt) * (1 - eio((ft + 0.06) / 0.06))).toFixed(2);
    }
  } else if (F && F.kind === 'big') {
    const t = F.t, n5 = F.to - F.from, grow = eio(t / 0.55) * (1 - eio((t - (BIG_D - 0.7)) / 0.6));
    tl.sc = 1 + 0.55 * grow; tl.y = 360 * grow; tl.dx = (960 - (TLX + W / 2)) * grow; tl.shade = 0.66 * grow;
    tl.cells.forEach((c, i) => {
      if (i < n5) { const k = eio((t - 0.6 - i * 0.14) / 0.45); c.stamp = true; c.op = 0.45 * (1 - k); c.dy = 70 * k * k; }
      else if (i >= DAYS) { const j = i - DAYS, k = (t - 2.05 - j * 0.14) / 0.42; c.sc = k <= 0 ? 0.01 : pop(k); c.op = k <= 0 ? 0 : 1; }
    });
    tl.x = -PITCH * n5 * eback((t - 1.3) / 0.8);
    const nr = tl.cells.find(c => c.k === 'raid' && c.d > F.from + n5 - 1 && !c.past); if (nr && t > 2.9) nr.sc = 1 + 0.18 * Math.abs(Math.sin((t - 2.9) * 5));
    const bt = t - 2.7; tl.banner = bt > 0 && t < BIG_D - 0.55; tl.bannerTxt = '新的五天'; tl.bannerC = '#ffcf4a'; tl.bannerSub = nr ? '第 ' + nr.d + ' 天 · 混沌来袭' : ''; tl.bannerSubC = '#ff8a8a';
    tl.bannerSc = 1 + 0.6 * (1 - eio(bt / 0.22)); tl.bannerOp = eio(bt / 0.18) * (1 - eio((t - (BIG_D - 0.85)) / 0.3)); tl.mop = 0;
    today = -1;
  }
  if (!(F && F.kind === 'day')) { const i = today - ws; tl.mx = i * PITCH; tl.mop = i >= 0 && i < DAYS && !(F && F.kind === 'big') ? 1 : 0; }
  tl.cells.forEach(c => { c.border = c.c; c.bg = c.d === today ? '#2b2461' : '#15112e'; c.stampOn = !!c.stamp; });
  // the dots between the days: lit behind today, dim ahead; on a day step they light one by one
  tl.dots = []; for (let i = 0; i < tl.cells.length - 1; i++) { const a = tl.cells[i], b2 = tl.cells[i + 1]; for (let j = 0; j < NDOT; j++) {
    const x = a.x + CW + GAP * (j + 1) / (NDOT + 1) - 4; let lit = b2.past || b2.d <= (F && F.kind === 'day' ? F.from : m.day) ? 1 : 0, sc = 1;
    if (F && F.kind === 'day' && a.d === F.from) { const q = (F.t - 0.12 - j * 0.18) / 0.14; lit = q > 0 ? 1 : 0; sc = q > 0 && q < 1.4 ? 1 + 0.9 * Math.sin(cl(q / 1.4, 0, 1) * Math.PI) : 1; }
    tl.dots.push({ x: Math.round(x), c: lit ? '#ffcf4a' : '#3d3a8c', glow: lit ? 8 : 0, sc: sc.toFixed(2), op: Math.min(a.op, b2.op).toFixed(2) }); } }
  tl.msc = F && F.kind === 'day' ? 1 + 0.15 * Math.sin(cl((F.t - 0.75) / 0.45, 0, 1) * Math.PI) : 1;
  if (!tl.bannerSubC) tl.bannerSubC = '#f4efe0';
  if (!tl.glowOn) { tl.bannerX = 0; tl.bannerDY = 0; tl.bannerRot = 0; tl.bannerSubOp = 1; tl.glowSc = 0; tl.glowOp = 0; }
  tl.bannerY = F && F.kind === 'big' ? 560 : 420;
  return tl;
}
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta;
  if (v.b && m && this.screen === 'base') {
    M.dayEvents(m); if (m.tlWin == null || m.tlWin > M.tlWinStart(m)) m.tlWin = M.tlWinStart(m);
    const tl = stripState(this, m); this._tl = tl;
    v.tl = tl; v.tlShadeOn = tl.shade > 0.01; v.tlShade = tl.shade.toFixed(3);
  }
  return v;
};
// a day passes: today is crossed out and the frame moves one cell; an event day then shows its name
G.tlStart = function (from, to) {
  const m = this.meta; if (m.tlWin == null) m.tlWin = M.tlWinStart(m);
  const ev = M.eventOn(m, to); this.tlFx = { kind: 'day', t: 0, from, to, ev, dur: ev ? EV_D : STEP_D }; this.closePanel && this.closePanel(); this.tipData = null;
};
// the stretch's 混沌来袭 is over: the strip advances five days
G.tlBig = function (from, to) {
  this.tlFx = { kind: 'big', t: 0, from, to }; if (this.panel) this.closePanel(); if (this.portalOn && this.portalOn()) this.closePortal(); this.tipData = null; S.whoosh && S.whoosh(0.6);
};
G.tlTick = function (dt) {
  const F = this.tlFx; if (!F) return; const t0 = F.t; F.t += dt; const x = (a) => t0 < a && F.t >= a, tl = this._tl || { x: 0, dx: 0, y: 0, sc: 1 };
  if (F.kind === 'day') {
    for (let j = 0; j < NDOT; j++) if (x(0.12 + j * 0.18)) S.tlDot(j);
    if (x(0.2)) { S.tlStamp(); this.fx.kick && this.fx.kick(5); }
    if (x(0.75)) S.tlSlide();
    if (x(1.05)) { const p = cellAt(tl, F.to - (this.meta.tlWin || F.to)); this.fx.rays && this.fx.rays(p.x, p.y, F.ev ? EV[F.ev].c : '#ffcf4a', 0.8, { r: 140 }); S.tlLand(); }
    if (F.ev && x(1.2)) { S.tlEvent(F.ev); this.fx.kick && this.fx.kick(F.ev === 'raid' ? 26 : 12); this.fx.rays && this.fx.rays(960, 470, EV[F.ev].c, 1.3, { r: 320 }); this.fx.flash && this.fx.flash(F.ev === 'raid' ? '#e8434f' : '#ffffff', F.ev === 'raid' ? 0.35 : 0.16); }
    if (F.ev && x(F.dur - TOK_FLY - 0.06)) S.whoosh && S.whoosh(0.25);
    if (F.ev && x(F.dur - TOK_LAND)) { const p = cellAt(tl, F.to - (this.meta.tlWin || F.to)); S.tlLand(); this.fx.spark && this.fx.spark(p.x, p.y, EV[F.ev].c, 14, { v: 500 }); this.fx.kick && this.fx.kick(4); }
    if (F.ev === 'raid' && F.t > 1.3 && Math.floor(F.t * 3) !== Math.floor(t0 * 3)) S.heart && S.heart();
    if (F.t >= F.dur) this.tlFx = null;
  } else {
    const n5 = F.to - F.from;
    for (let i = 0; i < n5; i++) if (x(0.6 + i * 0.14)) { S.nfStamp(i); this.fx.kick && this.fx.kick(4); }
    if (x(1.3)) { S.nfScroll(); this.fx.kick && this.fx.kick(10); }
    for (let j = 0; j < n5; j++) if (x(2.05 + j * 0.14)) { const c = (tl.cells || [])[DAYS + j], p = cellAt(tl, DAYS + j); S.nfPop(j, !!(c && c.E)); if (c && c.E) { this.fx.rays && this.fx.rays(p.x, p.y, c.E.c, 1.1, { r: 200 }); this.fx.explode && this.fx.explode(p.x, p.y, c.E.c, 0.8); } }
    if (x(2.7)) { S.nfTitle(); this.fx.flash && this.fx.flash('#ffcf4a', 0.18); this.fx.rays && this.fx.rays(960, 470, '#ffcf4a', 1.6, { r: 420 }); this.fx.confetti && this.fx.confetti(90, { x: 960, y: 470 }); }
    if (F.t >= BIG_D) { this.tlFx = null; this.meta.tlWin = F.to; this.save(); }
  }
  this.bump();
};
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), m = this.meta;
  if (this.tlFx) this.tlTick(dt || 0);
  else if (m && this.screen === 'base' && m.tlWin != null && M.tlWinStart(m) > m.tlWin && !this.raid && !this.raidPrep && !this.homeQ && !this.lvFx && !this.modal && !this.tear && !this.coreFx && !this.coreQueue) {
    this._tlIdle = (this._tlIdle || 0) + (dt || 0); if (this._tlIdle > 0.6) { this._tlIdle = 0; this.tlBig(m.tlWin, M.tlWinStart(m)); }
  } else this._tlIdle = 0;
  return r;
};

// ───────── the events ─────────
const rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
const cur = { sup: ['物资', 'msup', 'supplies', 'sack'], sh: ['碎片', 'msh', 'shards', 'shard'], orb: ['经验球', 'morb', 'orbs', 'orb'] };
function goods(g, m) {
  const out = [], bld = Object.keys(M.BUILDINGS).filter(k => !M.BUILDINGS[k].fixed), rel = Object.keys(M.RELICS), gifts = Object.keys(M.GIFTS || {}).filter(k => M.GIFTS[k].w > 0);
  const bk = pick(bld), B = M.BUILDINGS[bk]; out.push({ n: B.n + '图纸', d: B.d, cost: B.q >= 2 ? ['sh', 40 + 20 * B.q] : ['sup', 90 + 50 * B.q], give: () => M.invAdd(m, 'bbp:' + bk, 1) });
  const rk = pick(rel), Rl = M.RELICS[rk]; out.push({ n: Rl.n + '图纸', d: '打造「' + Rl.n + '」', cost: ['sh', 30], give: () => M.invAdd(m, 'rbp:' + rk, 1) });
  const tk = M.dropTile(), T = M.TILES[tk]; out.push({ n: '地脉结晶·' + T.n, d: '把一格岩层变成「' + T.n + '」：' + (T.anyD || T.d), cost: ['sup', 140], give: () => { const at = M.tileSpot && M.tileSpot(m, tk); if (at) { const [c, r] = at; M.cell(m, c, r).tile = tk; g.homeQueue(g.tileReveal(c, r, tk)); } } });
  { const gk = pick(gifts), K = M.GIFTS[gk]; out.push({ n: K.n, d: K.d, cost: ['sup', 70], give: () => { const r = K.apply(g, m, null); g.toast(K.n + ' · ' + ((r && r.t) || ''), K.c); } }); }
  return out;
}
function merchant(g, m, stock) {
  const choices = stock.map(o => { const [ck, v] = o.cost, C = cur[ck], can = !o.sold && m[C[2]] >= v;
    return { t: (o.sold ? '已买 · ' : '') + o.n, sub: o.d + '　' + v + ' ' + C[0], dis: !can, gold: can, fn: () => { m[C[2]] -= v; o.sold = true; o.give(); g.save(); S.buy(); merchant(g, m, stock); } }; });
  choices.push({ t: '离开', fn: () => { g.modal = null; g.bump(); } });
  g.modal = { title: EV.merchant.n, titleColor: EV.merchant.c, text: EV.merchant.d, img: 'e_market', border: EV.merchant.c, at: g.modal && g.modal.title === EV.merchant.n ? g.modal.at : performance.now(), back: () => { g.modal = null; }, choices };
}
const BLESS = [
  { n: '部队攻击 +20%', f: (run) => { run.runBuff.unitAtk = (run.runBuff.unitAtk || 0) + 0.2; } },
  { n: '带回的物资 +50%', f: (run) => { run.lootMul *= 1.5; } },
  { n: '视野 +2', f: (run) => { run.visAdj = (run.visAdj || 0) + 2; } },
  { n: '开局多带 2 个支援道具', f: (run) => { for (let i = 0; i < 2; i++) { const s = run.items.indexOf(null); if (s >= 0) { run.items[s] = pick(Object.keys(M.ITEMS)); run.itemQ[s] = 0; } } } },
  { n: '每场战斗初始积分倍率 +0.5', f: (run) => { run.startMult = (run.startMult || 0) + 0.5; } },
  { n: '领袖出发时回满生命', f: (run) => { run.hero.hp = M.heroMaxHp(run.hero, run.M); } },
  { n: '掉图纸的概率翻倍', f: (run) => { run.bpMul = (run.bpMul || 1) * 2; } },
];
M.BLESS = BLESS;
G.dayEvent = function (k) {
  const m = this.meta, E = EV[k]; if (!E || k === 'raid') return;
  const ev = (m.evs || []).find(e => e.day === m.day && e.k === k && !e.done); if (ev) ev.done = true; this.save();
  if (k === 'merchant') return merchant(this, m, goods(this, m));
  if (k === 'star') { const opts = BLESS.map((b, i) => i).sort(() => rnd() - 0.5).slice(0, 3);
    this.modal = { title: E.n, titleColor: E.c, text: E.d, img: 'e_fate', border: E.c, at: performance.now(), choices: opts.map(i => ({ t: BLESS[i].n, gold: true, fn: () => { m.bless = i; this.modal = null; this.save(); this.toast('下一次出征：' + BLESS[i].n, E.c); } })) }; return; }
  if (k === 'plague') { const cost = 40 * m.heroes.length;
    this.modal = { title: E.n, titleColor: E.c, text: E.d, img: 'gurney', border: E.c, at: performance.now(), choices: [
      { t: '花 ' + cost + ' 物资治疗', dis: m.supplies < cost, gold: m.supplies >= cost, fn: () => { m.supplies -= cost; this.modal = null; this.save(); this.toast('领袖们都好了', E.c); } },
      { t: '硬扛：每人失去 30% 生命', danger: 1, fn: () => { m.heroes.forEach(h => { h.hp = Math.max(1, Math.round(h.hp - M.heroMaxHp(h, m) * 0.3)); }); this.modal = null; this.save(); this.toast('每名领袖失去 30% 生命', '#ff8a8a'); } }] }; return; }
  if (k === 'recruit') { m.freeRecruit = (m.freeRecruit || 0) + 1; this.save(); this.toast(E.n + '：' + E.d, E.c); return; }
  if (k === 'harvest') { let n = 0; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (!x.job) continue; n++; x.job.days -= 1; if (x.job.days <= 0) { if (x.job.kind === 'dig') x.dug = true; else { x.b = x.job.key; x.dug = true; } x.job = null; const p = this.cellPos(c, r); this.fx.rays(p.x, p.y, E.c, 1.2, { r: 240 }); } }
    this.save(); this.toast(n ? E.n + '：' + n + ' 项工程各推进 1 天' : E.n + '：现在没有工程', E.c); return; }
  if (k === 'ley') { const tk = M.dropTile(), at = M.tileSpot && M.tileSpot(m, tk); if (!at) { this.toast(E.n + '：没有能变的岩层', E.c); return; } const [c, r] = at; M.cell(m, c, r).tile = tk; this.save(); this.homeQueue(this.tileReveal(c, r, tk)); }
};
// ───────── effects waiting to happen, in a row under the top bar (user ruling 2026-09-25) ─────────
// what a keepsake or an event promised for later is shown until it is used: next raid weaker, next recruit free …
M.pendingFx = function (m) {
  const G_ = M.GIFTS || {}, out = [], gi = (k) => G_[k] || {};
  if (m.bless != null && BLESS[m.bless]) out.push({ ic: 't_clover', c: EV.star.c, t: BLESS[m.bless].n, title: EV.star.n, d: '下一次出征：' + BLESS[m.bless].n + '。' });
  if (m.raidWeak) out.push({ ic: gi('decoy').ic || 'g_powder', c: gi('decoy').c || '#c8b0ff', t: '混沌来袭 -' + Math.round(m.raidWeak * 100) + '%', title: gi('decoy').n || '迷踪粉', d: '下一次混沌来袭的怪物减少 ' + Math.round(m.raidWeak * 100) + '%。' });
  if (m.nextKit) out.push({ ic: gi('kit').ic || 'g_pack', c: gi('kit').c || '#caa84a', t: '支援道具 +' + m.nextKit, title: gi('kit').n || '行军包', d: '下次出征开局多带 ' + m.nextKit + ' 个支援道具。' });
  if (m.buildBoost) out.push({ ic: gi('mason').ic || 'g_mason', c: gi('mason').c || '#ff9a6a', t: '工期 -' + m.buildBoost + ' 天', title: gi('mason').n || '工匠', d: '下一项工程少 ' + m.buildBoost + ' 天。' });
  return out;
};
const oViewB = G.view;
G.view = function () {
  const v = oViewB.call(this), m = this.meta;
  if (v.b && m && this.screen === 'base') { const L = M.pendingFx(m); v.b.hasBuffs = L.length > 0; v.b.buffs = L.map(o => ({ img: M.iconURL(o.ic, 2), t: o.t, c: o.c, tipOn: this.tipFn({ title: o.title, c: o.c, icon: o.ic, d: o.d }) })); }
  return v;
};
// a blessing waits for the next expedition
const oNR = M.newRun3;
M.newRun3 = function (meta) { const run = oNR.apply(this, arguments); if (meta && meta.bless != null && BLESS[meta.bless] && !(run.region && run.region.tut)) { try { BLESS[meta.bless].f(run); } catch (e) {} run.blessN = BLESS[meta.bless].n; meta.bless = null; } return run; };

// ───────── a cell gets its terrain: the camera goes there, the ground changes, the effect is said ─────────
G.tileReveal = function (c, r, tk) {
  const T = M.TILES[tk]; return [
    { run: () => { this.bv.focus(c, r); }, wait: 0.7 },
    { run: () => { const p = this.cellPos(c, r); this.fx.explode(p.x, p.y, T.c, 1.4); this.fx.rays(p.x, p.y, T.c, 1.6, { r: 300 }); this.fx.kick && this.fx.kick(12); this.fx.pop(p.x, p.y - 70, T.n, T.c, 56, { slam: 1 }); setTimeout(() => { const q = this.cellPos(c, r); this.fx.pop(q.x, q.y + 30, T.anyD, '#f4efe0', 30); }, 350); S.terrainReveal(); }, wait: 1.8 },
    { run: () => { this.bv.home(); }, wait: 0.5 },
  ];
};
})();

;
