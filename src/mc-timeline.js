// ==== mc-timeline.js ====
(function () {
// The calendar (user ruling 2026-09-24): a timeline across the top of the base shows today and the next 9 days, with
// whatever is coming on each (混沌来袭 every 5 days, and other events). When a day passes the strip rolls one cell
// with a show of its own; an event on the new day happens right after. Every event says itself in one line.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const DAYS = 10, CW = 64, GAP = 6, PITCH = CW + GAP, DUR = 2.6;
const EV = {
  raid:     { n: '混沌来袭', ic: 'e_skull', c: '#e8434f', d: '怪物攻打传送门，所有领袖一起守城。' },
  merchant: { n: '流浪商人', ic: 't_coin', c: '#ffcf4a', d: '用物资、碎片或经验球，换随机的好东西。', w: 5 },
  star:     { n: '幸运之星', ic: 't_clover', c: '#9cff7a', d: '三选一：下一次出征的祝福。', w: 4 },
  recruit:  { n: '招募日', ic: 'f_recruit', c: '#7fb0ff', d: '下一次招募领袖免费，至少「稀有」。', w: 2 },
  ley:      { n: '地脉涌动', ic: 'l_ley', c: '#b86bff', d: '一格岩层变成随机的特殊地形。', w: 2 },
  plague:   { n: '疫病', ic: 't_cross', c: '#c8e070', d: '领袖们病倒了：花物资治疗，或者每人失去 30% 生命。', w: 2 },
  harvest:  { n: '丰收', ic: 't_sack', c: '#e8c86a', d: '所有挖掘和建造各推进 1 天。', w: 3 },
};
M.DAYEV = EV;
const raidOn = (m, d) => d % M.RAID_EVERY === 0 && m.lastRaid !== d && m.heroes.length > 0;
// the next days' events are rolled as the calendar reaches them, never two days in a row
M.dayEvents = function (m) {
  m.evs = Array.isArray(m.evs) ? m.evs.filter(e => e && EV[e.k] && e.day >= m.day) : [];
  for (let d = Math.max(m.day + 1, (m.evGen || m.day) + 1); d <= m.day + DAYS - 1; d++) {
    m.evGen = d; if (d % M.RAID_EVERY === 0) continue;
    const prev = m.evs.some(e => e.day === d - 1) || (d - 1) % M.RAID_EVERY === 0;
    if (!prev && Math.random() < 0.42) m.evs.push({ day: d, k: M.wpick(Object.keys(EV).filter(k => EV[k].w), k => EV[k].w) });
  }
  return m.evs;
};
M.eventOn = (m, d) => (raidOn(m, d) ? 'raid' : ((m.evs || []).find(e => e.day === d && !e.done) || {}).k || null);

// ───────── the strip ─────────
const IC = (k) => (M.iconURL ? M.iconURL(k, 2) : '');
function cells(g, m, first, n) {
  const out = []; for (let i = 0; i < n; i++) {
    const d = first + i, k = M.eventOn(m, d), E = k && EV[k], today = d === m.day;
    out.push({ d, lab: today ? '今天' : '第' + d + '天', k, c: E ? E.c : today ? '#ffcf4a' : '#3d3a8c', dc: today ? '#ffcf4a' : E ? E.c : '#a9a3c9', hasIc: !!E, noIc: !E, ic: E ? IC(E.ic) : '',
      tipOn: g.tipFn(() => (E ? { title: E.n, c: E.c, icon: E.ic, d: E.d, lines: [{ t: today ? '今天' : '第 ' + d + ' 天（' + (d - m.day) + ' 天后）', c: '#a9a3c9' }] } : { title: today ? '今天 · 第 ' + d + ' 天' : '第 ' + d + ' 天', c: '#ffcf4a', d: today ? '' : '这一天没有事件。' })), op: 1, dy: 0, sc: 1 });
  }
  return out;
}
const eback = (t) => { t = cl(t, 0, 1); const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const eio = (t) => { t = cl(t, 0, 1); return t * t * (3 - 2 * t); };
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta;
  if (v.b && m && this.screen === 'base') {
    M.dayEvents(m);
    const F = this.tlFx, tl = { w: DAYS * PITCH - GAP, x: 0, sc: 1, y: 0, shade: 0, banner: false };
    if (!F) tl.cells = cells(this, m, m.day, DAYS);
    else {
      const t = F.t, from = F.from; tl.cells = cells(this, m, from, DAYS + 1);
      const grow = eio(t / 0.35) * (1 - eio((t - (DUR - 0.45)) / 0.45));
      tl.sc = 1 + 0.38 * grow; tl.y = 70 * grow; tl.shade = 0.55 * grow;
      const slide = eback((t - 0.55) / 0.75); tl.x = -PITCH * slide;
      const c0 = tl.cells[0]; c0.op = 1 - eio((t - 0.55) / 0.5); c0.dy = 40 * eio((t - 0.45) / 0.6); c0.stamp = t > 0.32; c0.stampSc = t > 0.32 ? 1 + 1.8 * (1 - eio((t - 0.32) / 0.18)) : 1;
      const c1 = tl.cells[1]; c1.today = true; c1.lab = '今天'; c1.dc = '#ffcf4a'; c1.sc = t > 1.2 ? 1 + 0.35 * Math.sin(cl((t - 1.2) / 0.5, 0, 1) * Math.PI) : 1; if (!c1.k) c1.c = '#ffcf4a';
      tl.banner = t > 1.25 && t < DUR - 0.3; tl.bannerTxt = F.ev ? EV[F.ev].n : '第 ' + F.to + ' 天'; tl.bannerC = F.ev ? EV[F.ev].c : '#ffcf4a'; tl.bannerSc = 1 + 0.6 * (1 - eio((t - 1.25) / 0.25)); tl.bannerOp = eio((t - 1.25) / 0.2) * (1 - eio((t - (DUR - 0.55)) / 0.25));
      tl.bannerSub = F.ev ? EV[F.ev].d : '';
    }
    tl.cells.forEach(c => { c.border = c.today || (c.d === m.day && !F) ? '#ffcf4a' : c.c; c.bg = c.d === (F ? F.to : m.day) ? '#2b2461' : '#15112e'; c.stampOn = !!c.stamp; });
    v.tl = tl; v.tlShadeOn = tl.shade > 0.01; v.tlShade = tl.shade.toFixed(3);
  }
  return v;
};
// the show: the strip grows and drops in, today is stamped and falls away, the strip rolls one cell, the new day slams in;
// an event day gets its name and its line in the middle of the screen
G.tlStart = function (from, to) {
  const ev = M.eventOn(this.meta, to); this.tlFx = { t: 0, from, to, ev, fired: {} }; this.closePanel && this.closePanel(); this.tipData = null; S.whoosh && S.whoosh(0.6);
};
const pos = (i, F) => ({ x: 30 + i * PITCH + CW / 2, y: 50 });
G.tlTick = function (dt) {
  const F = this.tlFx; if (!F) return; const t0 = F.t; F.t += dt; const x = (a) => t0 < a && F.t >= a;
  if (x(0.32)) { const p = pos(0); S.stamp && S.stamp(); this.fx.kick && this.fx.kick(10); this.fx.explode && this.fx.explode(p.x * 1.38, p.y + 70, '#e8434f', 0.9); }
  if (x(0.6)) S.whoosh && S.whoosh(0.4);
  if (x(1.2)) { const p = pos(0); S.impact && S.impact(); this.fx.kick && this.fx.kick(F.ev === 'raid' ? 30 : 16); this.fx.rays && this.fx.rays(p.x * 1.38, p.y + 70, F.ev ? EV[F.ev].c : '#ffcf4a', 1.3, { r: 320 }); this.fx.flash && this.fx.flash(F.ev === 'raid' ? '#e8434f' : '#ffffff', F.ev === 'raid' ? 0.35 : 0.18); if (F.ev === 'raid') { S.alarm && S.alarm(); } else S.up && S.up(2); }
  if (F.ev === 'raid' && F.t > 1.3 && Math.floor(F.t * 3) !== Math.floor(t0 * 3)) S.heart && S.heart();
  if (F.t >= DUR) this.tlFx = null;
  this.bump();
};
const oTick = G.tick;
G.tick = function (dt) { const r = oTick.apply(this, arguments); if (this.tlFx) this.tlTick(dt || 0); return r; };

// ───────── the events ─────────
const rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
const cur = { sup: ['物资', 'msup', 'supplies', 'sack'], sh: ['碎片', 'msh', 'shards', 'shard'], orb: ['经验球', 'morb', 'orbs', 'orb'] };
function goods(g, m) {
  const out = [], bld = Object.keys(M.BUILDINGS).filter(k => !M.BUILDINGS[k].fixed), rel = Object.keys(M.RELICS), gifts = Object.keys(M.GIFTS || {});
  const bk = pick(bld), B = M.BUILDINGS[bk]; out.push({ n: B.n + '图纸', d: B.d, cost: B.q >= 2 ? ['sh', 40 + 20 * B.q] : ['sup', 90 + 50 * B.q], give: () => M.invAdd(m, 'bbp:' + bk, 1) });
  const rk = pick(rel), Rl = M.RELICS[rk]; out.push({ n: Rl.n + '图纸', d: '打造「' + Rl.n + '」', cost: ['orb', 60], give: () => M.invAdd(m, 'rbp:' + rk, 1) });
  const tk = M.dropTile(), T = M.TILES[tk]; out.push({ n: '地脉结晶·' + T.n, d: '把一格岩层变成「' + T.n + '」：' + (T.anyD || T.d), cost: ['orb', 80], give: () => { const at = M.tileSpot && M.tileSpot(m); if (at) { const [c, r] = at; M.cell(m, c, r).tile = tk; g.homeQueue(g.tileReveal(c, r, tk)); } } });
  if (rnd() < 0.6) out.push({ n: '一名领袖（至少稀有）', d: '加入你的基地。', cost: ['sh', 70], give: () => { if (m.heroes.length >= M.heroCap(m)) { m.shards += 70; g.toast('领袖已满，碎片退还', '#d0453c'); return; } const rar = Math.max(1, M.RARITY.indexOf(M.wpick(M.RARITY, r => r.w))); const h = M.newHero(m, null, rar); m.heroes.push(h); g.save(); g.recruitCard && g.recruitCard(h, rar); } });
  else { const gk = pick(gifts), K = M.GIFTS[gk]; out.push({ n: K.n, d: K.d, cost: ['sup', 70], give: () => { const r = K.apply(g, m, null); g.toast(K.n + ' · ' + ((r && r.t) || ''), K.c); } }); }
  return out;
}
function merchant(g, m, stock) {
  const choices = stock.map(o => { const [ck, v] = o.cost, C = cur[ck], can = !o.sold && m[C[2]] >= v;
    return { t: (o.sold ? '已买 · ' : '') + o.n, sub: o.d + '　' + v + ' ' + C[0], dis: !can, gold: can, fn: () => { m[C[2]] -= v; o.sold = true; o.give(); g.save(); S.coin && S.coin(); merchant(g, m, stock); } }; });
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
];
M.BLESS = BLESS;
G.dayEvent = function (k) {
  const m = this.meta, E = EV[k]; if (!E || k === 'raid') return;
  const ev = (m.evs || []).find(e => e.day === m.day && e.k === k && !e.done); if (ev) ev.done = true; this.save();
  if (k === 'merchant') return merchant(this, m, goods(this, m));
  if (k === 'star') { const opts = BLESS.map((b, i) => i).sort(() => rnd() - 0.5).slice(0, 3);
    this.modal = { title: E.n, titleColor: E.c, text: E.d, img: 'e_tarot', border: E.c, at: performance.now(), choices: opts.map(i => ({ t: BLESS[i].n, gold: true, fn: () => { m.bless = i; this.modal = null; this.save(); this.toast('下一次出征：' + BLESS[i].n, E.c); } })) }; return; }
  if (k === 'plague') { const cost = 40 * m.heroes.length;
    this.modal = { title: E.n, titleColor: E.c, text: E.d, img: 'e_clinic', border: E.c, at: performance.now(), choices: [
      { t: '花 ' + cost + ' 物资治疗', dis: m.supplies < cost, gold: m.supplies >= cost, fn: () => { m.supplies -= cost; this.modal = null; this.save(); this.toast('领袖们都好了', E.c); } },
      { t: '硬扛：每人失去 30% 生命', danger: 1, fn: () => { m.heroes.forEach(h => { h.hp = Math.max(1, Math.round(h.hp - M.heroMaxHp(h, m) * 0.3)); }); this.modal = null; this.save(); this.toast('每名领袖失去 30% 生命', '#ff8a8a'); } }] }; return; }
  if (k === 'recruit') { m.freeRecruit = (m.freeRecruit || 0) + 1; this.save(); this.toast(E.n + '：' + E.d, E.c); return; }
  if (k === 'harvest') { let n = 0; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (!x.job) continue; n++; x.job.days -= 1; if (x.job.days <= 0) { if (x.job.kind === 'dig') x.dug = true; else { x.b = x.job.key; x.dug = true; } x.job = null; const p = this.cellPos(c, r); this.fx.rays(p.x, p.y, E.c, 1.2, { r: 240 }); } }
    this.save(); this.toast(n ? E.n + '：' + n + ' 项工程各推进 1 天' : E.n + '：现在没有工程', E.c); return; }
  if (k === 'ley') { const at = M.tileSpot && M.tileSpot(m); if (!at) { this.toast(E.n + '：没有能变的岩层', E.c); return; } const [c, r] = at, tk = M.dropTile(); M.cell(m, c, r).tile = tk; this.save(); this.homeQueue(this.tileReveal(c, r, tk)); }
};
// a blessing waits for the next expedition
const oNR = M.newRun3;
M.newRun3 = function (meta) { const run = oNR.apply(this, arguments); if (meta && meta.bless != null && BLESS[meta.bless] && !(run.region && run.region.tut)) { try { BLESS[meta.bless].f(run); } catch (e) {} run.blessN = BLESS[meta.bless].n; meta.bless = null; } return run; };

// ───────── a cell gets its terrain: the camera goes there, the ground changes, the effect is said ─────────
G.tileReveal = function (c, r, tk) {
  const T = M.TILES[tk]; return [
    { run: () => { this.bv.focus(c, r); }, wait: 0.7 },
    { run: () => { const p = this.cellPos(c, r); this.fx.explode(p.x, p.y, T.c, 1.4); this.fx.rays(p.x, p.y, T.c, 1.6, { r: 300 }); this.fx.kick && this.fx.kick(12); this.fx.pop(p.x, p.y - 70, T.n, T.c, 56, { slam: 1 }); setTimeout(() => { const q = this.cellPos(c, r); this.fx.pop(q.x, q.y + 30, T.anyD, '#f4efe0', 30); }, 350); S.up && S.up(3); }, wait: 1.8 },
    { run: () => { this.bv.home(); }, wait: 0.5 },
  ];
};
})();

;
