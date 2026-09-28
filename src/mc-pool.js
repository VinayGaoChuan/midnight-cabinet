// ==== mc-pool.js ====
(function () {
// What a stage can give, and the run's pool of copies (user rulings 2026-09-27, docs/design.md §7.3–§7.4):
// · 「品质上限应该=章节难度和挑战难度控制」: a stage's level L = chapter (序章 0, 第 1–9 章) + the game difficulty (困难 +1 …
//   地狱 +3) + the challenge (the stele: 低 0 / 中 1 / 高 2; for a blueprint also the stop: elite, boss …). L sets the best
//   quality the stage can give (0 优质 · 1–2 稀有 · 3–5 史诗 · 6–9 传说 · 10+ 神话) and the odds (ODDS, the top quality it
//   can give always at least 1%). Nothing else raises the cap: the evolution buildings only make better cards come more often.
// · 「卡池里只有种类，没有数量」: every line has copies for the run — 3^cap of them (1 copy = one 普通, a 优质 takes 3, a 稀有 9 …) —
//   so merging can never go past the stage either. What the army holds, what lies on the counter and what waits to join
//   count against them; a unit that leaves the army gives its copies back.
// · 「没必要每个职业都选1个」: an area's pool is a few lines of a few races (first area: 4 + 3 of two races; later areas: the
//   army's lines, up to 2 more of its main race, and a new race to 4 new lines), so a race can be gathered to its full set.
// · 「不要专营店了，都是通用商店」「部队不允许卖，只允许替换」: one kind of shop (the stalls still look different), no selling.
const M = window.MC, G = M.Game.prototype, DB = M.DB, B = M.BUILDINGS, rnd = Math.random;
const pick = (a) => a[Math.floor(rnd() * a.length)], cl = (v, a, b) => Math.max(a, Math.min(b, v));
const LQ = (L) => (L < 1 ? 1 : L < 3 ? 2 : L < 6 ? 3 : L < 10 ? 4 : 5);   // stage level → the best quality (0 普通 … 5 神话)
M.stageCapQ = LQ;
// 普通 / 优质 / 稀有 / 史诗 / 传说 / 神话, by level (row); a level between two rows averages them
const ODDS = [
  [99, 1, 0, 0, 0, 0], [94, 5, 1, 0, 0, 0], [82, 16, 2, 0, 0, 0], [72, 22, 5, 1, 0, 0], [62, 28, 8, 2, 0, 0], [53, 32, 12, 3, 0, 0],
  [46, 34, 14, 5, 1, 0], [40, 35, 16, 7, 2, 0], [35, 35, 18, 9, 3, 0], [30, 35, 20, 11, 4, 0], [26, 34, 22, 12, 5, 1], [23, 33, 23, 13, 6, 2], [20, 32, 24, 14, 7, 3],
];
M.Q_ODDS = ODDS;
// the weights for row P, nothing above capQ (folded into it), the cap itself at least 1%
M.qOdds = function (P, capQ) {
  const r0 = cl(Math.floor(P), 0, ODDS.length - 1), r1 = cl(r0 + 1, 0, ODDS.length - 1), f = cl(P - Math.floor(P), 0, 1);
  const w = ODDS[r0].map((x, i) => x + (ODDS[r1][i] - x) * f);
  for (let i = w.length - 1; i > capQ; i--) { w[capQ] += w[i]; w[i] = 0; }
  if (w[capQ] < 1) { w[0] -= 1 - w[capQ]; w[capQ] = 1; }
  return w;
};
const chapIdx = (run) => { if (!run || !run.region || run.region.tut || run.tut) return 0; const i = (M.CHAPTER_ORDER || []).indexOf(run.regionKey); return i >= 0 ? i + 1 : Math.max(1, Math.round(run.region.diff || 1)); };
const gdIdx = (m) => cl((m && m.gd) || 0, 0, 3);
// the stage a run is on: its level, best quality and the copies each line has
M.stageOf = function (run) {
  const tut = !run || (run.region && run.region.tut) || run.tut;
  const L = tut ? 0 : chapIdx(run) + gdIdx(run.M) + cl(run.danger || 0, 0, 2), capQ = LQ(L);
  return { L, capQ, quota: Math.pow(3, capQ), tut: !!tut };
};
// 奇观·宙斯神像 and each evolution building of a vocation: one row further down the table for that vocation's cards
const vocRows = (m, voc) => (m && M.evoBlds ? M.evoBlds(m, voc).length : 0) + (m && M.hasWonder && M.hasWonder(m, 'zeus') ? 1 : 0);
const copiesOf = (k) => { const d = DB[k]; return d && d.tier ? Math.pow(3, d.tier - 1) : 1; };
M.copiesOf = copiesOf;
// copies of a line in use: the army, the unsold cards on the counter, anything waiting to join
M.poolUsed = function (run, line) {
  let n = 0; const add = (k) => { const d = DB[k]; if (d && d.line === line) n += copiesOf(k); };
  (run.roster || []).forEach(u => add(u.type));
  const sh = run.shop; if (sh && sh.units) sh.units.forEach(c => { if (c && !c.sold && c.kind === 'unit') add(c.type); });
  if (sh && sh.gacha) sh.gacha.forEach(c => { if (c && !c.sold) add(c.type); });
  return n;
};
M.poolAvail = (run, line) => Math.max(0, M.stageOf(run).quota - M.poolUsed(run, line));
// one card: a line of the pool that still has copies, then its quality from the table (never more than is left)
// o: { shift (rows), minQ, hold {line: copies already promised in this roll}, line (a given line) }
M.rollUnitCard = function (run, o) {
  o = o || {}; const st = M.stageOf(run), lines = (run.pool && run.pool.lines) || [], hold = o.hold || {};
  const left = (l) => M.poolAvail(run, l) - (hold[l] || 0);
  const ok = (o.line ? [o.line] : lines).filter(l => DB[M.lineKey(l, 1)] && left(l) >= 1); if (!ok.length) return null;
  const line = pick(ok), d1 = DB[M.lineKey(line, 1)], area = (run.pool && run.pool.area) || 0;
  const P = st.tut ? 0 : st.L + 0.5 * area + vocRows(run.M, d1.voc) + (o.shift || 0);
  const w = M.qOdds(P, st.capQ), top = Math.min(st.capQ, Math.floor(Math.log(left(line) + 1e-9) / Math.log(3) + 1e-9));
  for (let i = w.length - 1; i > top; i--) { w[top] += w[i]; w[i] = 0; }
  let q = M.wpick([0, 1, 2, 3, 4, 5], i => (i >= (o.minQ || 0) && i <= top ? w[i] : 0));
  if (q == null || !(w[q] > 0)) q = Math.min(top, o.minQ || 0);
  const k = M.lineKey(line, q + 1); if (!DB[k]) return null;
  hold[line] = (hold[line] || 0) + copiesOf(k);
  return { type: k, line, q };
};

// ───────── the area's pool: lines by race ─────────
const FRONT = { 先锋: 1, 守护者: 1, 战士: 1, 圣骑士: 1 };
const lineVoc = (l) => { const d = DB[M.lineKey(l, 1)]; return d ? d.voc : ''; };
const front = (l) => !!FRONT[lineVoc(l)];
const TUT_LINES = ['FootSoldier', 'Ranger', 'MageApprentice', 'YellowManeHorse', 'DesertBeliever'];
// take n lines of a race (not in `have`), at least one front and one back when it can, a vocation at most twice in the pool, and
// never two lines of one race with one vocation (2026-09-27: 「亡灵族，守护者，在同一个池子中，出现了两种，这是不对的。同一种族，
// 同一职业，同一个池子中，只能出现1种」)
const sameRV = (a, b) => M.RACE_OF[a] === M.RACE_OF[b] && lineVoc(a) === lineVoc(b);
function takeRace(race, n, have) {
  const all = M.raceLines(race).filter(l => !have.includes(l)).sort(() => rnd() - 0.5), out = [];
  const ok = (l) => { const got = have.concat(out); return got.filter(x => lineVoc(x) === lineVoc(l)).length < 2 && !got.some(x => sameRV(x, l)); };
  const fr = all.find(front), bk = all.find(l => !front(l));
  [fr, bk].forEach(l => { if (l && out.length < n && ok(l)) out.push(l); });
  all.forEach(l => { if (out.length < n && !out.includes(l) && ok(l)) out.push(l); });
  return out;
}
// a pool made before that rule loses its second line of a race and vocation (a line the army already fields stays)
M.poolDedupe = function (run) {
  const P = run && run.pool; if (!P || !Array.isArray(P.lines) || P.rvV === 1) return false; P.rvV = 1;
  const army = new Set((run.roster || []).map(u => DB[u.type] && DB[u.type].line).filter(Boolean)), keep = [];
  P.lines.slice().sort((a, b) => (army.has(b) ? 1 : 0) - (army.has(a) ? 1 : 0)).forEach(l => { if (army.has(l) || !keep.some(x => sameRV(x, l))) keep.push(l); });
  const cut = P.lines.length - keep.length; if (!cut) return false;
  P.lines = P.lines.filter(l => keep.includes(l)); P.types = typesOf(P.lines); return true;
};
M.poolLines = function (run, keepArmy) {
  if (run && ((run.region && run.region.tut) || run.tut)) return TUT_LINES.filter(l => DB[M.lineKey(l, 1)]);
  const races = M.RACE6.slice(), prev = (run && run.pool && run.pool.races) || [];
  if (!keepArmy) {   // the first area: two races, 4 + 3 lines
    const A = pick(races), Bn = pick(races.filter(r => r !== A));
    const la = takeRace(A, 4, []), lb = takeRace(Bn, 3, la);
    run._poolRaces = [A, Bn]; return la.concat(lb);
  }
  // later areas: the army's lines stay; up to 2 more of its main race; a new race to 4 new lines in all
  const army = []; (run.roster || []).forEach(u => { const d = DB[u.type]; if (d && d.line && !army.includes(d.line)) army.push(d.line); });
  const cnt = {}; army.forEach(l => { const r = M.RACE_OF[l]; if (r) cnt[r] = (cnt[r] || 0) + 1; });
  const main = Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a])[0] || pick(races);
  const more = takeRace(main, 2, army), used = army.concat(more);
  const fresh = races.filter(r => r !== main && !prev.includes(r)), R2 = pick(fresh.length ? fresh : races.filter(r => r !== main));
  const extra = takeRace(R2, 4 - more.length, used);
  run._poolRaces = [main, R2]; return used.concat(extra);
};
const typesOf = (lines) => lines.reduce((a, l) => a.concat(M.lineTiers(l)), []);
// every place that asks for the area's units gets its lines, up to what the stage can give
M.unitPool = function (run) {
  const L = (run && run.pool && run.pool.lines) || []; if (!L.length) return M.SHOP_POOL;
  const cap = M.stageOf(run).capQ; return typesOf(L).filter(k => DB[k] && (DB[k].q || 0) <= cap);
};
// the pool object remembers its races (the next area picks a new one)
const oEnter = M.poolEnter;
M.poolEnter = function (run, node) { const r = oEnter.apply(this, arguments); if (r && run.pool) { run.pool.races = run._poolRaces || []; run.pool.types = typesOf(run.pool.lines); run.pool.rvV = 1; } return r; };
{ const oTickP = G.tick; G.tick = function (dt) { const r = oTickP.apply(this, arguments); if (this.run && this.run.pool && this.run.pool.rvV !== 1 && M.poolDedupe(this.run)) this.save && this.save(); return r; }; }
const oNR = M.newRun3;
M.newRun3 = function () {
  const run = oNR.apply(this, arguments); if (!run || !run.pool) return run;
  run.pool.races = run._poolRaces || []; run.pool.types = typesOf(run.pool.lines);
  // the starting army comes from the pool too: a unit whose line is not in it takes a pool line of the same role, same tier,
  // no better than the stage allows
  const st = M.stageOf(run), lines = run.pool.lines;
  (run.roster || []).forEach(u => { const d = DB[u.type]; if (!d || !d.line) return; let tier = Math.min(d.tier || 1, st.capQ + 1);
    let line = lines.includes(d.line) ? d.line : null;
    if (!line) { const same = lines.filter(l => front(l) === !!FRONT[d.voc] && M.poolAvail(run, l) >= Math.pow(3, tier - 1)); line = same.length ? pick(same) : lines.find(l => M.poolAvail(run, l) >= 1) || d.line; }
    while (tier > 1 && M.poolAvail(run, line) + (d.line === line ? copiesOf(u.type) : 0) < Math.pow(3, tier - 1)) tier--;
    const k = M.lineKey(line, tier); if (DB[k]) u.type = k; });
  return run;
};

// ───────── shops: one kind, cards from the pool ─────────
const SALE_ANY = 0.3, SALE_OFF = 0.3;
M.rollShop = function (run) {
  const hold = {}, pm = M.priceMul ? M.priceMul(run) : 1, units = [];
  // the prologue's shop always has the third 步卒 (its evolution lesson)
  const T = M.EVO_TUT, tut = !!((run.region && run.region.tut) || run.tut);
  if (tut && T && DB[T.from] && !run.tutEvo && run.roster.filter(u => u.type === T.from).length === 2) { const d = DB[T.from]; hold[d.line] = 1; units.push({ kind: 'unit', type: T.from, q: d.q, cost: Math.max(5, Math.round(d.cost * pm)) }); }
  run.shop = { units: [], banners: [], items: [] };   // the old counter no longer holds copies while the new one is rolled
  for (let i = units.length; i < 5; i++) { const c = M.rollUnitCard(run, { hold }); if (!c) break; const d = DB[c.type]; units.push({ kind: 'unit', type: c.type, q: d.q, cost: Math.max(5, Math.round(d.cost * pm)) }); }
  run.shop = { units, banners: [], items: [] };
  if (M.talShopExtra) try { M.talShopExtra(run); } catch (e) {}
  // 货郎's extra cards come from the pool's copies too
  for (let i = 5; i < run.shop.units.length; i++) { const x = run.shop.units[i]; if (!x || x.kind !== 'unit') continue; const c = M.rollUnitCard(run, { hold }); if (!c) { run.shop.units.length = i; break; } const d = DB[c.type]; x.type = c.type; x.q = d.q; x.cost = Math.max(5, Math.round(d.cost * pm)); }
  if (!tut && rnd() < SALE_ANY) { const c = pick(units.filter(x => x.cost > 0)); if (c) { c.off = SALE_OFF; c.cost = Math.max(1, Math.round(c.cost * (1 - SALE_OFF))); } }
};
// every stall is the general one; the stall it looks like stays (mc-pxmarket.js draws run.shopLook)
M.shopKindFor = function () { return 'bazaar'; };
const oOpen = G.openShop;
G.openShop = function (n) { const run = this.run; if (run) run.shopLook = (n && n.shop) || run.shopLook || 'bazaar'; const r = oOpen.apply(this, arguments); if (run) run.shopKind = 'bazaar'; return r; };
if (M.SHOPS && M.SHOPS.bazaar) M.SHOPS.bazaar.d = '这一带的部队，什么职业都有。';
// recruit flags, event gifts, mini-game prizes: a card from the pool
M.pickUnitQ = function (run) { const c = run && run.pool ? M.rollUnitCard(run, {}) : null; if (c) return c.type; const L = M.unitPool(run).filter(k => DB[k] && (DB[k].q || 0) === 0); return L.length ? pick(L) : 'FootSoldier_T1'; };
// the card pack: 1.5 rows further down the table; four packs in a row below the second-best quality → the next one is at least that
M.gaRoll = function (run) {
  if (!run || !run.pool) return null; const st = M.stageOf(run), need = Math.max(0, st.capQ - 1), pity = (run.gaPity || 0) >= M.GA_PITY;
  const c = M.rollUnitCard(run, { shift: 1.5, minQ: pity ? need : 0 }); if (!c) return null;
  run.gaPity = c.q >= need ? 0 : Math.min(M.GA_PITY, (run.gaPity || 0) + 1);
  return c.type;
};
// the machine's rates line shows this stage's odds (1.5 rows down, what the stage allows)
M.gaRates = function (run) { const st = M.stageOf(run); return M.qOdds(st.tut ? 0 : st.L + 1.5, st.capQ).slice(0, 5).map(x => Math.round(x * 10) / 10); };

// ───────── joining: nothing is held back, nothing is sold; an army over its size must let one go (mc-swap.js) ─────────
M.canAdd = () => true;
M.downTier = (run, type) => type;
G.sellSel = function () { this.sel = null; this.bump(); };
// what evolving may reach: in a run the stage's best quality; at the base (the garrison) the best stage ever finished
M.buyCap = (m, k) => { const g = M._g, run = g && g.run; return run && run.M === m && run.pool ? M.stageOf(run).capQ + 1 : M.vocCap(m); };
M.vocCap = (m) => Math.min(6, Math.max(M.EVO_BASE || 3, (m && m.bestCapT) || 0));
M.evoOpen = function (m, type) {
  const d = DB[type], n = d && d.next && DB[d.next]; if (!n) return false; if (!n.tier || !m) return true;
  const g = M._g, run = g && g.run; if (run && run.M === m && run.pool && !run.raid) return n.tier <= M.stageOf(run).capQ + 1;
  return n.tier <= M.vocCap(m);
};
M.canMythic = (m) => M.vocCap(m) >= 6;
// the best stage finished lifts the garrison's cap
const endRun = (g) => { const run = g.run, m = g.meta; if (!run || !m || !run.pool || run.region.tut) return; m.bestCapT = Math.max(m.bestCapT || 0, M.stageOf(run).capQ + 1); };
const oWin = G.runWin; G.runWin = function () { endRun(this); return oWin.apply(this, arguments); };
// evolution buildings and 宙斯神像: better odds for their vocation, not a higher cap
Object.keys(B).forEach(k => { const b = B[k]; if (b && b.evoVoc) b.d = b.evoVoc + '部队在夜市里更常出高品质。'; });
if (M.CAT_D) M.CAT_D.defense = '让一个职业的高品质部队更常出现：每座好一档。';
if (M.WONDERS && M.WONDERS.zeus) M.WONDERS.zeus.d = '所有职业的高品质部队更常出现。';

// ───────── blueprints: the same table; level = chapter + difficulty + stele + the stop's challenge ─────────
const STOP_C = { normal: 0, hold: 0.5, score: 0, holdScore: 0.5, extract: 0.5, elite: 1, chest: 0, event: 0, camp: 0, shop: 0, recruit: 0 };
M.bpLevel = function (g) {
  g = g || M._g; const run = g && g.run, m = g && g.meta;
  if (run && !run.raid && run.region) {
    if (run.region.tut || run.tut) return 0;
    const n = g.node, st = M.stageOf(run);
    const c = !n ? 0 : n.type === 'boss' ? (n.final ? 2 : n.fb ? 1.5 : 1) : (STOP_C[n.type] || 0);
    return st.L + c;
  }
  // at the base: the furthest chapter reached, and the night's own challenge
  const best = Math.max(1, (m && m.bestChap) || 1) + gdIdx(m), nk = g && g.raid && M.nightKind ? M.nightKind(m.day) : undefined;
  return best + (g && g.raid ? (nk === 'boss' ? 2 : nk === 'strong' ? 1.5 : 1) : 0.5);
};
M.bpQFor = (L) => { const capQ = Math.min(3, LQ(L)), w = M.qOdds(L, LQ(L)); for (let i = w.length - 1; i > capQ; i--) { w[capQ] += w[i]; w[i] = 0; } return M.wpick([0, 1, 2, 3, 4, 5], i => w[i]); };   // no 传说 / 神话 rooms yet: those come as 史诗
const oDrop = M.dropBp;
M.dropBp = function (bias, style) {
  const k0 = oDrop.apply(this, arguments); if (!k0 || typeof k0 !== 'string' || !k0.startsWith('bbp:')) return k0;
  const g = M._g, m = g && g.meta, q = M.bpQFor(Math.floor(M.bpLevel(g))), b0 = B[k0.slice(4)];
  if (b0 && b0.q === q && !b0.boss) return k0;
  return (M.bpOfQ && M.bpOfQ(m, q, style)) || k0;
};
M.dayBpQ = (m) => M.bpQFor(Math.floor(Math.max(1, (m && m.bestChap) || 1) + gdIdx(m) + 0.5));
// a useless blueprint is swapped for a useful one of the same quality or lower, never higher
M.usefulBp = function (m, like, style) {
  const B0 = like && like.startsWith('bbp:') ? B[like.slice(4)] : null, q0 = B0 ? B0.q : 0;
  const ks = Object.keys(B).filter(k => !B[k].fixed && !B[k].boss && !B[k].gone && M.bpUseful(m, 'bbp:' + k));
  for (let q = q0; q >= 0; q--) { const a = ks.filter(k => B[k].q === q && (!style || B[k].style === style)), b = a.length ? a : ks.filter(k => B[k].q === q); if (b.length) return 'bbp:' + pick(b); }
  const low = ks.slice().sort((a, b) => B[a].q - B[b].q); return 'bbp:' + (low[0] || 'farm');
};
// the furthest chapter reached (the base's blueprints and the garrison read it)
const oNR2 = M.newRun3;
M.newRun3 = function (meta) { const run = oNR2.apply(this, arguments); if (run && meta && !(run.region && run.region.tut)) meta.bestChap = Math.max(meta.bestChap || 0, chapIdx(run)); return run; };

// ───────── a stele says four things (2026-09-27: 「场景碑上的详细信息太乱了。实际上只需要知道，几个boss（是否已掉落专属图纸），
// 战斗力对比，难易程度，掉落物品质范围」) ─────────
const QN = (q) => M.QUALITY[q] || M.QUALITY[0];
const oST = G.steleTip;
G.steleTip = function (k) {
  const t = oST.apply(this, arguments), m = this.meta; if (!t || !m || !M.worldDanger) return t;
  const D = M.worldDanger(m, k), sc = M.sceneOf ? M.sceneOf(m, k) : null, segs = (M.segsOf && M.segsOf(k)) || [], from = sc ? sc.start || 0 : 0;
  const bosses = segs.slice(from).map(s => (s.fb ? { n: (DB[s.fb] && DB[s.fb].n) || '首领', bb: M.BOSS_BLD && M.BOSS_BLD[s.fb] } : s.mb ? { n: s.mb.n } : null)).filter(Boolean);
  const ci = Math.max(1, (M.CHAPTER_ORDER || []).indexOf(k) + 1), L = ci + gdIdx(m) + cl(M.tierOf ? M.tierOf(m, k) : 0, 0, 2), uq = LQ(L), bq = Math.min(3, LQ(L + 2));
  const span = (hi) => [{ t: QN(0).n, c: QN(0).c, b: 1 }, { t: ' – ', c: '#8d8496' }, { t: QN(hi).n, c: QN(hi).c, b: 1 }];
  // one thing a line (2026-09-27: 「墓碑上面的文字，排列的时候，要换行……每个Boss都要换行显示，战斗力换行显示。掉落物换行显示」)
  const H = (t) => ({ rich: [{ t, c: '#a89ca8' }] }), IN = '　';
  const lines = [H('首领')];
  bosses.forEach(b => { const r = [{ t: IN + b.n, c: '#ff8a6a', b: 1 }]; if (b.bb) { const own = M.bbOwned && M.bbOwned(m, b.bb); r.push({ t: own ? '（图纸已得）' : '（图纸未得）', c: own ? '#9cff7a' : '#8d8496' }); } lines.push({ rich: r }); });
  lines.push(H('战斗力'),
    { rich: [{ t: IN + '你 ', c: '#e8dcc4' }, { t: '★' + D.mine, c: '#ffe08a', b: 1 }].concat(D.gift ? [{ t: '（含开局积分 +' + D.gift + '）', c: '#a89ca8' }] : []) },
    { rich: [{ t: IN + '敌人 ', c: '#e8dcc4' }, { t: '★' + D.first, c: '#ff8a8a', b: 1 }] },
    { rich: [{ t: IN + '首领 ', c: '#e8dcc4' }, { t: '★' + D.boss, c: '#ff5a4a', b: 1 }] },
    { rich: [{ t: '难度 ', c: '#a89ca8' }, { t: D.n, c: D.c, b: 1 }] },
    H('掉落'),
    { rich: [{ t: IN + '部队 ', c: '#e8dcc4' }].concat(span(uq)) },
    { rich: [{ t: IN + '图纸 ', c: '#e8dcc4' }].concat(span(bq)) });
  return { title: t.title, c: t.c, lines };
};

// 霓虹招牌 (a cabinet part) used to open the two shops with a catch; with one kind of shop it makes each shop's first refresh free
if (M.PARTS) { const np = M.PARTS.find(p => p.k === 'neon'); if (np) np.d = '每家夜市第一次刷新免费。'; }
const oRC = M.refreshCost; M.refreshCost = (run) => (run && !run.refreshN && M.hasPart && M.hasPart('neon') ? 0 : oRC(run));

// ───────── nothing joins from outside the pool (2026-09-27: 「所有部队都要从池中随机，不能出现池以外的」) ─────────
// The recruit flag's three figures, every gift, talent and building that hands out a unit: a unit whose line is not in the
// pool, or that the pool has no copies left for, becomes the same line a tier lower, else a pool line of the same role
// (front or back), never better than it was; nothing left at all → it does not come.
M.poolFit = function (run, type) {
  const d = DB[type]; if (!run || !run.pool || !d || !d.line) return type;
  const lines = run.pool.lines || [], capQ = M.stageOf(run).capQ;
  const best = (line) => { for (let q = Math.min(d.q | 0, capQ); q >= 0; q--) { const k = M.lineKey(line, q + 1); if (DB[k] && M.poolAvail(run, line) >= copiesOf(k)) return k; } return null; };
  if (lines.includes(d.line)) { const k = best(d.line); if (k) return k; }
  const ok = lines.filter(l => l !== d.line && M.poolAvail(run, l) >= 1), same = ok.filter(l => front(l) === !!FRONT[d.voc]);
  for (const l of (same.length ? same : ok).sort(() => rnd() - 0.5)) { const k = best(l); if (k) return k; }
  return null;
};
const oAdd = M.addUnit;
M.addUnit = function (run, type) { if (run && run.pool) { const k = M.poolFit(run, type); if (!k) return null; type = k; } return oAdd.call(this, run, type); };
// the recruit flag: three figures from the pool (the old one took two of them from every unit in the game)
M.recruitTrio = function (run) {
  const hold = {}, out = [];
  for (let i = 0; i < 16 && out.length < 3; i++) { const c = run && run.pool ? M.rollUnitCard(run, { hold }) : null; if (!c) break; if (!out.includes(c.type)) out.push(c.type); }
  while (out.length < 3) out.push(M.pickUnitQ(run));
  return out;
};
// a gift names the unit that really comes (its picture flies, its name is said)
const oAward = G.award;
G.award = function (list, from) {
  const run = this.run; if (run && run.pool && Array.isArray(list)) list = list.filter(g => { if (!g || g.k !== 'unit') return true; const k = M.poolFit(run, g.type); if (!k) return false; g.type = k; return true; });
  return oAward.call(this, list, from);
};
})();
