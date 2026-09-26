// ==== mc-shops.js ====
(function () {
// Shops on the map are not all the same (user ruling 2026-09-24): some sell units, some banners, some support items,
// and shops of one trade differ too — a barracks, a refugee camp, a slaver, a mages' guild … each with its own stock,
// prices and catch. The shop before a boss always sells units (which kind is random). Every shop says its catch in
// one line under its sign.
const M = window.MC, G = M.Game.prototype, DB = M.DB, rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
const VOCS = (...v) => (k) => v.includes(DB[k].voc);
const SHOPS = {
  bazaar:   { n: '夜市', d: '什么部队都卖一点。', units: 8, w: 3, unit: 1 },
  barracks: { n: '兵营', d: '只卖前排和近战：先锋、守护者、战士、圣骑士。', units: 8, pool: VOCS('先锋', '守护者', '战士', '圣骑士'), w: 3, unit: 1 },
  refugee:  { n: '难民营', d: '全是普通部队，便宜一成半。', units: 8, pool: (k) => DB[k].q === 0, price: 0.85, w: 2, unit: 1 },
  slaver:   { n: '奴隶贩子', d: '好部队打七折，但每买一支，领袖失去 8% 生命。', units: 6, pool: (k) => DB[k].q >= 1, qBoost: 2, price: 0.7, hpCost: 0.08, w: 2, unit: 1 },
  guild:    { n: '法师协会', d: '只卖法师、牧师、祭司和召唤师。', units: 8, pool: VOCS('法师', '牧师', '祭司', '召唤师'), w: 2, unit: 1 },
  hunters:  { n: '猎人营地', d: '只卖射手和刺客。', units: 8, pool: VOCS('射手', '刺客'), w: 2, unit: 1 },
  mercs:    { n: '佣兵团', d: '只卖史诗和传说部队，价格贵一成。', units: 6, pool: (k) => DB[k].q >= 2, price: 1.1, w: 1, unit: 1 },
};
// discounts are rare and single (user ruling 2026-09-25): a shop may put one card on sale, a few shops say they do
const SALE_ANY = 0.3, SALE_OFF = 0.3;
M.SHOPS = SHOPS;
// 7 shops, all selling units (user ruling 2026-09-26: 「局内的build，集中在部队上。不要战旗和道具了」)
const UNIT_SHOPS = Object.keys(SHOPS).filter(k => SHOPS[k].unit);
M.shopKindFor = (n, run) => (run && (run.tut || run.region.tut) ? 'bazaar' : n && n.preBoss ? pick(UNIT_SHOPS) : M.wpick(Object.keys(SHOPS), k => SHOPS[k].w));
// every shop on a new map gets its trade (the one before a boss sells units)
const oGen = M.genMap2;
M.genMap2 = function (run) {
  const res = oGen.apply(this, arguments), map = res && res.nodes ? res : run.map; if (!map || !map.nodes) return res;
  map.nodes.forEach(n => { if (n.type !== 'shop') return; n.preBoss = map.nodes.some(b => b.type === 'boss' && b.col === n.col + 1); n.shop = M.shopKindFor(n, run); });
  return res;
};
// the stock
const oRoll = M.rollShop;
M.rollShop = function (run) {
  const S = SHOPS[run.shopKind] || SHOPS.bazaar;
  const pooled = !!(run.pool && M.unitPool), qw = M.shopQW(run), pm = M.priceMul(run), base = (pooled ? M.unitPool(run) : M.SHOP_POOL.concat(['JadeBeast'])).filter(k => DB[k]), units = [];
  // the area's pool (mc-evo.js): copies are the point, up to three of one unit; a trade the pool cannot serve falls back to all units
  const pool0 = S.pool ? base.filter(S.pool) : base, pool = pool0.length ? pool0 : M.SHOP_POOL.filter(k => DB[k] && (!S.pool || S.pool(k)));
  const room = (k) => (pooled ? units.filter(u => u.type === k).length < (M.POOL_COPIES || 3) : !units.some(u => u.type === k));
  for (let i = 0; i < (S.units || 0); i++) {
    const q = M.wpick([0, 1, 2, 3], x => qw[x] * (S.qBoost && x >= 1 ? S.qBoost : 1)), c = pool.filter(k => DB[k].q === q && room(k)), rest = pool.filter(room); if (!c.length && !rest.length) break; const k = pick(c.length ? c : rest);
    units.push({ kind: 'unit', type: k, q: DB[k].q, cost: Math.max(5, Math.round(DB[k].cost * pm * (S.price || 1))) });
  }
  run.shop = { units, banners: [], items: [] };
};
// leader talents may add to any stock (货郎, mc-talent.js)
const oRoll2 = M.rollShop;
M.rollShop = function (run) {
  const r = oRoll2.apply(this, arguments); if (M.talShopExtra) M.talShopExtra(run);
  const S = SHOPS[run.shopKind] || SHOPS.bazaar, sh = run.shop || {}, put = (list, n, off) => list.filter(c => c && c.cost > 0 && !c.off).sort(() => rnd() - 0.5).slice(0, n).forEach(c => { c.off = off; c.cost = Math.max(1, Math.round(c.cost * (1 - off))); });
  if (S.sale) put(sh[S.sale[0]] || [], S.sale[1], 0.5);
  else if (!S.pickOne && !S.wild && rnd() < SALE_ANY) put([].concat(sh.units || [], sh.banners || [], sh.items || []), 1, SALE_OFF);
  return r;
};
const oOpen = G.openShop;
G.openShop = function (n) { const run = this.run; if (run) run.shopKind = (n && n.shop) || M.shopKindFor(n, run); return oOpen.apply(this, arguments); };
// the quartermaster's gift is one banner, not one per refresh
const oRef = G.refresh;
G.refresh = function () { const run = this.run, S = run && SHOPS[run.shopKind]; if (S && S.pickOne && (run.shop.banners || []).some(o => o.sold)) { this.deny('军需官只给一面', '#d0453c'); return; } return oRef.apply(this, arguments); };
// the slaver takes its price in the leader's blood too
const oBuy = G.buy;
G.buy = function (zone, i) {
  const run = this.run, S = run && SHOPS[run.shopKind], c = run && run.shop && run.shop[zone] && run.shop[zone][i], was = c && c.sold;
  const r = oBuy.apply(this, arguments);
  if (S && S.pickOne && zone === 'banners' && c && c.sold && !was) run.shop.banners.forEach(o => { if (o !== c) { o.sold = true; o.gone = true; } });
  if (S && S.bonus && zone === 'items' && c && c.sold && !was && rnd() < S.bonus && run.items.indexOf(null) >= 0) { this.award([{ k: 'item', key: pick(Object.keys(M.ITEMS)) }], this.fxPos('card' + zone + i) || { x: 960, y: 400 }); this.fx.pop(960, 180, '多送一个！', M.ITEM_C, 44); }
  if (S && S.hpCost && zone === 'units' && c && c.sold && !was) { const h = run.hero, mx = M.heroMaxHp(h, this.meta), d = Math.round(mx * S.hpCost); h.hp = Math.max(1, h.hp - d); this.fx.pop(960, 180, '领袖生命 -' + d, '#e8434f', 40); M.Sfx.hit && M.Sfx.hit(); }
  return r;
};
// the sign, the line, and only the counters this shop has
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (v.s && run && this.screen === 'shop') {
    const S = SHOPS[run.shopKind] || SHOPS.bazaar, hu = !!(run.shop.units || []).length, hb = !!(run.shop.banners || []).length, hi = !!(run.shop.items || []).length;
    Object.assign(v.s, { title: S.n, sub: S.d, showU: hu, showB: hb, showI: hi });
    ['units', 'banners', 'items'].forEach(z => (v.s[z] || []).forEach((cv, i) => { const c = (run.shop[z] || [])[i]; cv.saleOn = !!(c && c.off && !c.sold); cv.sale = c && c.off ? '-' + Math.round(c.off * 100) + '%' : ''; }));
    // geometry: a unit-only shop spreads its cards over the whole floor; banner / item shops use the left side too
    if (hu && !hb && !hi) Object.assign(v.s, { uW: 1840, uCols: run.shop.units.length > 6 ? 4 : 3 }); else Object.assign(v.s, { uW: 1180, uCols: 3 });
    if (!hu) Object.assign(v.s, { bX: 40, bW: 1840, bY: 196, bH: hi ? 300 : 644, iX: 40, iW: 1840, iY: hb ? 530 : 196, iH: hb ? 310 : 644 });
    else Object.assign(v.s, { bX: 1250, bW: 630, bY: 196, bH: 290, iX: 1250, iW: 630, iY: 520, iH: 320 });
  }
  return v;
};
// the map says which shop it is: its name on the node, its catch in the tip
const oNL = M.nodeLabel, oND = M.nodeDesc;
M.nodeLabel = function (n) { return n && n.seen && n.type === 'shop' && n.shop && SHOPS[n.shop] ? SHOPS[n.shop].n : oNL.apply(this, arguments); };
M.nodeDesc = function (n) { const r = oND.apply(this, arguments); return n && n.seen && n.type === 'shop' && n.shop && SHOPS[n.shop] ? SHOPS[n.shop].d : r; };
})();

;
