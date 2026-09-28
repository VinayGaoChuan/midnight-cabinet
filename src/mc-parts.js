// ==== mc-parts.js ====
(function () {
// The cabinet's parts (user ruling 2026-09-26: 「这次把机器屋的解锁内容都确定下来，局内的一些机制也是要靠机器屋的解锁才有的，例如
// fever，机器屋的某个解锁后，局内才有fever」, plan confirmed the same day). A first game has only the core of the game: the
// map, the fights, the night market and its merges, digging and building, the nights and the garrison, prosperity, the
// leader. Once the cabinet opens (after the first game), tokens buy parts; each part brings one mechanic into every game
// from then on. No part is a plain number: each one opens something.
const M = window.MC, G = M.Game.prototype, BP = M.Battle3.prototype, B = M.BUILDINGS, S = M.Sfx, now = () => performance.now();
const PARTS = M.PARTS = [
  { k: 'fever', n: 'FEVER 灯管', ic: 't_mult', c: '#ffcf4a', cost: 80, d: '战斗里有了 FEVER：部队打满槽就爆发。' },
  { k: 'events', n: '奇遇转盘', ic: 't_dice', c: '#b86bff', cost: 100, d: '地图上的奇遇从 8 种变成 27 种。' },
  { k: 'neon', n: '霓虹招牌', ic: 'f_store', c: '#ff7ab6', cost: 120, d: '夜市里出现奴隶贩子和佣兵团。' },
  { k: 'forge', n: '锻造炉', ic: 'f_forge', c: '#ff9a3c', cost: 150, d: '有了宝物：工坊和宝物图纸开始掉落。' },
  { k: 'badge', n: '驻军徽章', ic: 't_shield', c: '#7fb0ff', cost: 150, d: '进化建筑能花灵魂碎片给驻军升档。' },
  { k: 'shrine', n: '神龛', ic: 'f_luck', c: '#ffe6a0', cost: 180, d: '有了信仰：信仰建筑、神龛奇遇和守护神。' },
];
const PK = {}; PARTS.forEach(p => { PK[p.k] = p; });
// players who played before the parts existed keep everything they had
const prof = () => (M._g && M._g.prof) || null;
const fix = (p) => { if (!p || p.partsV === 1) return p; p.parts = Object.assign({}, p.parts); if (p.stats && p.stats.games > 0) PARTS.forEach(x => { p.parts[x.k] = 1; }); p.partsV = 1; return p; };
M.hasPart = (k, p) => { p = fix(p || prof()); return !p || !!(p.parts && p.parts[k]); };   // no profile (sims, tools): everything on
const on = M.hasPart;

// ───────── FEVER ─────────
const oInit = BP.init;
BP.init = function (run) { const r = oInit.apply(this, arguments); if (!on('fever')) this.fever = null; return r; };
const oView = G.view;
G.view = function () {
  const v = oView.call(this);
  if (v.h) v.h.fvOn = !!(this.battle && this.battle.fever);
  // the cabinet: two tabs, the parts on the second
  const L = this.lg, p = fix(this.prof);
  if (v.lg && L && p) {
    const tab = L.tab || 'main', can = PARTS.some(x => !(p.parts || {})[x.k] && (p.tokens || 0) >= x.cost);
    // 成就 on a page of its own (2026-09-28: 「成就不要放在遗像墙中，而是要放在一个新的页面中，叫做成就」)
    const TABS = ['main', 'parts', 'ach'];
    v.lg.tabs = [{ n: L.mode === 'setup' ? '投币前' : '遗像墙', g: 'lg-tab-main' }, { n: '机台零件', g: 'lg-tab-parts', dot: can }, { n: '成就', g: 'lg-tab-ach' }].map((t, i) => { const sel = TABS[i] === tab; return Object.assign(t, { q: sel ? '#ffcf4a' : '#3d3a8c', c: sel ? '#ffcf4a' : '#a9a3c9', onClick: () => { L.tab = TABS[i]; S.click && S.click(); this.bump(); } }); });
    v.lg.tabMain = tab === 'main'; v.lg.tabParts = tab === 'parts'; v.lg.tabAch = tab === 'ach';
    v.lg.achLine = '每个成就只给一次代币，在那一局结算时给。';
    v.lg.partsLine = '装上的零件，每一局都有。';
    v.lg.parts = PARTS.map(x => { const own = !!(p.parts || {})[x.k], ok = (p.tokens || 0) >= x.cost;
      return { n: x.n, d: x.d, img: M.iconURL ? M.iconURL(x.ic, 3) : '', c: own ? x.c : '#a9a3c9', own, buy: !own, price: String(x.cost), pc: ok ? '#ffcf4a' : '#e8434f', filt: own ? 'none' : 'grayscale(1) brightness(0.7)', ring: own ? x.c : '#2b2461', op: own || ok ? 1 : 0.6,
        onClick: () => this.partBuy(x.k) }; });
    // what needs a part is not offered before it
    if (v.lg.kits) v.lg.kits = v.lg.kits.filter((kv, i) => { const K = (M.KITS2 || [])[i]; return !K || !(K.k === 'gamble' && !on('fever', p)) && !(K.k === 'arms' && !on('forge', p)); });
  }
  return v;
};
G.partBuy = function (k) {
  const p = fix(this.prof), x = PK[k]; if (!p || !x || (p.parts || {})[k]) return;
  if ((p.tokens || 0) < x.cost) { this.deny && this.deny('代币不够：要 ' + x.cost, '#d0453c'); return; }
  p.tokens -= x.cost; p.parts = Object.assign({}, p.parts, { [k]: 1 }); this.saveProfile && this.saveProfile();
  S.up && S.up(2); S.fanfare && S.fanfare(); this.toast && this.toast('装上了' + x.n, x.c); this.bump();
};
// a talent for FEVER is not grown before FEVER is in the game (mc-talent.js)
M.talOff = (k) => (k === 'rally' || k === 'forage') && !on('fever');

// ───────── 奇遇转盘: eight encounters before it ─────────
const BASE_EV = ['musician', 'well', 'child', 'clinic', 'pachinko', 'claw', 'roulette', 'spring'];
const oGen = M.genMap2;
M.genMap2 = function (run) {
  const res = oGen.apply(this, arguments), map = res && res.nodes ? res : run && run.map; if (!map || !map.nodes || (run && run.region && run.region.tut)) return res;
  const all = on('events'), faith = on('shrine'), ok = (k) => (all || BASE_EV.includes(k)) && (k !== 'shrine' || faith), pool = Object.keys(M.EVENTS || {}).filter(ok);
  map.nodes.forEach(n => { if (n.ev && !ok(n.ev) && pool.length) n.ev = pool[Math.floor(Math.random() * pool.length)]; });
  return res;
};

// ───────── 霓虹招牌: the two shops with a catch ─────────
const SPECIAL = ['slaver', 'mercs'];
const oKind = M.shopKindFor;
M.shopKindFor = function () { for (let i = 0; i < 12; i++) { const k = oKind.apply(this, arguments); if (!SPECIAL.includes(k) || on('neon')) return k; } return 'bazaar'; };

// ───────── 锻造炉 · 神龛: whole building kinds, and what hangs on them ─────────
const needs = (Bd) => (!Bd ? null : Bd.forge || Bd.cat === 'forge' ? 'forge' : Bd.cat === 'faith' && !Bd.boss ? 'shrine' : Bd.fx && (Bd.fx.feverStart || Bd.fx.feverRate || Bd.fx.feverQ) && !Bd.boss ? 'fever' : null);
M.partFor = (key) => needs(B[key]);
const oUse = M.bpUseful;
M.bpUseful = function (m, key) {
  if (typeof key === 'string') { if (key.startsWith('bbp:')) { const n = needs(B[key.slice(4)]); if (n && !on(n)) return false; } if (key.startsWith('rbp:') && !on('forge')) return false; }
  return oUse ? oUse.apply(this, arguments) : true;
};
const oDrop = M.dropBp;
if (oDrop) M.dropBp = function () { for (let i = 0; i < 12; i++) { const k = oDrop.apply(this, arguments); if (!k || typeof k !== 'string' || M.bpUseful(null, k)) return k; } return M.defBp ? M.defBp() : null; };
// a new game's stock: nothing it cannot use yet
const oNG = G.newGame;
G.newGame = function () {
  const r = oNG.apply(this, arguments), m = this.meta;
  if (m && m.inv) Object.keys(m.inv).forEach(k => { if ((k.startsWith('bbp:') || k.startsWith('rbp:')) && !M.bpUseful(null, k)) delete m.inv[k]; });
  return r;
};

// ───────── 驻军徽章 ─────────
const oPV = G.panelView;
G.panelView = function () {
  const v = oPV.apply(this, arguments), p = this.panel, pn = v && v.pn;
  if (pn && p && p.kind === 'room' && B[p.key] && B[p.key].evoVoc && !on('badge')) { pn.ruinOn = false; pn.onRepair = null; }
  return v;
};
const oUp = G.garUp; if (oUp) G.garUp = function () { if (!on('badge')) return false; return oUp.apply(this, arguments); };

if (M.GUIDE) M.GUIDE.push({ id: 'parts', cat: '机台', icon: 'u_star', title: '机台零件', line: '用代币装上，每一局都多一样玩法。', scr: 'menu', sel: '[data-g="lg-wall"]', when: (g) => M.unfolded && M.unfolded(g.prof) });
// the achievements reached this game pay at its settlement (mc-legacy.js keeps them on the game until then); after the
// difficulty's multiplier (mc-gdiff.js), they are paid as they are
const oSR9 = M.settleRows;
M.settleRows = function (m) { const S0 = oSR9.apply(this, arguments); if (m && m.achTok > 0) { S0.rows.push({ k: 'ach', n: '成就', ic: 'u_star', v: m.achN || 1, t: m.achTok }); S0.total += m.achTok; } return S0; };
})();
