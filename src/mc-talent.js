// ==== mc-talent.js ====
(function () {
// Leader talents (user ruling 2026-09-25), after the secondary skills of Heroes of Might and Magic.
// Every leader grows its own random tree out of its skill: layer 1 holds only layer-1 talents, layer 2 only layer-2
// talents and so on, and a talent of a higher layer is always stronger than the same talent lower down. Higher quality
// means a taller tree with more branches (普通 3 layers … 传说 6). The tree is not shown all at once: each level up
// reveals one more layer (layer k at Lv k+1), so a level up always says what it brings next.
// Loaded before mc-save.js: the save check already needs the trees.
// Talents differ in reach — the leader itself, the army it leads, its expeditions, or the whole base — and some change
// how a run is played (stack one vocation, mix many, hunt elites, stop at every shop).
const M = window.MC, G = M.Game.prototype, rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
const TIER = [0, 0.7, 1, 1.35, 1.75, 2.2, 2.7];          // strength of a layer against layer 2
const SHAPE = [                                          // layer widths [min, max] by quality
  [[2, 2], [2, 3], [2, 3]],
  [[2, 3], [3, 3], [3, 3], [2, 3]],
  [[3, 3], [3, 4], [3, 4], [3, 4], [2, 3]],
  [[3, 3], [3, 4], [4, 5], [4, 4], [3, 4], [2, 3]],
];
const SC = { self: { n: '领袖', c: '#ffcf4a' }, army: { n: '部队', c: '#ff7a6a' }, run: { n: '出征', c: '#47d6c1' }, base: { n: '基地', c: '#9cff7a' } };
const VK = { 先锋: 'van', 守护者: 'gua', 战士: 'war', 圣骑士: 'pal', 射手: 'rng', 刺客: 'ass', 法师: 'mag', 牧师: 'cle', 祭司: 'pri', 召唤师: 'sum', 商人: 'mer' };
const pct = (v) => Math.round(Math.abs(v) * 100) + '%';
const S_ = (b) => ({ v: (t) => Math.round(b * TIER[t] * 1000) / 1000 });
const I_ = (b) => ({ v: (t) => Math.max(1, Math.round(b * TIER[t])) });
const X_ = (o) => ({ v: (t) => o[t], tiers: Object.keys(o).map(Number) });
const vocIc = (v) => (M.VOC && M.VOC[v] && M.VOC[v].ic) || 't_command';
const T = {
  // ── the leader itself
  offense:   { n: '进攻术', sc: 'self', ic: 't_sword', ...S_(0.2), d: (v) => '本领袖攻击 +' + pct(v) + '。', m: (v) => ({ heroAtk: v }) },
  armor:     { n: '体魄', sc: 'self', ic: 't_heart', ...S_(0.2), d: (v) => '本领袖生命 +' + pct(v) + '。', m: (v) => ({ heroHp: v }) },
  firstaid:  { n: '急救术', sc: 'self', ic: 't_plus', ...S_(0.06), d: (v) => '本领袖每打完一场仗，回复 ' + pct(v) + ' 生命。', m: (v) => ({ postHeal: v }) },
  mystic:    { n: '神秘术', sc: 'self', ic: 't_hourglass', ...X_({ 3: 1, 6: 2 }), d: (v) => '本领袖的技能冷却少 ' + v + ' 个节点。', m: (v) => ({ skillNode: -v }) },
  rage:      { n: '狂怒', sc: 'self', ic: 't_rage', ...X_({ 3: 5, 5: 8 }), d: (v) => '本领袖亲自上场后 ' + v + ' 秒内，伤害翻倍。', m: (v) => ({ rage: v }) },
  slayer:    { n: '处刑', sc: 'self', ic: 't_claw', ...X_({ 2: 0.05, 3: 0.07, 4: 0.09, 5: 0.12, 6: 0.15 }), d: (v) => '每击倒一个精英或首领，本领袖回复 ' + pct(v) + ' 生命。', m: (v) => ({ eliteHeal: v }) },
  learning:  { n: '学习术', sc: 'self', ic: 'e_up', ...S_(0.2), d: (v) => '本领袖出征得到的经验 +' + pct(v) + '。', m: (v) => ({ exp: v }) },
  hardy:     { n: '好体质', sc: 'self', ic: 't_cross', ...S_(0.5), d: (v) => '本领袖住院时，每天回复的生命 +' + pct(v) + '。', m: (v) => ({ hospital: v }) },
  vault:     { n: '护宝术', sc: 'self', ic: 't_coinShield', ...X_({ 2: 1, 5: 2 }), d: (v) => '本领袖阵亡时，带着的前 ' + v + ' 件宝物不会丢。', m: (v) => ({ bank: v }) },
  martyr:    { n: '殉道', sc: 'self', ic: 't_shard', ...S_(0.6), d: (v) => '本领袖阵亡时，留下的灵魂碎片 +' + pct(v) + '。', m: (v) => ({ deathShards: v }) },
  legacy:    { n: '传承', sc: 'self', ic: 't_orb', ...S_(0.6), d: (v) => '本领袖阵亡时，留下的经验球 +' + pct(v) + '。', m: (v) => ({ deathOrbs: v }) },
  relic:     { n: '宝物大师', sc: 'self', ic: 'g_pack', ...X_({ 4: 1 }), d: () => '本领袖出征可以多带 1 件宝物。', m: (v) => ({ relicSlot: v }) },
  // ── the army it leads
  leader:    { n: '领导术', sc: 'army', ic: 't_command', ...S_(0.1), d: (v) => '本领袖出征时，部队攻击 +' + pct(v) + '。', m: (v) => ({ unitAtk: v }) },
  defense:   { n: '防御术', sc: 'army', ic: 't_shieldHeart', ...S_(0.1), d: (v) => '本领袖出征时，部队生命 +' + pct(v) + '。', m: (v) => ({ unitHp: v }) },
  luck:      { n: '幸运术', sc: 'army', ic: 't_crit', ...S_(0.06), d: (v) => '本领袖出征时，部队暴击率 +' + pct(v) + '。', m: (v) => ({ crit: v }) },
  ward:      { n: '护盾术', sc: 'army', ic: 't_shield', ...S_(0.12), d: (v) => '本领袖出征时，部队每场开局获得 ' + pct(v) + ' 生命的护盾。', m: (v) => ({ shield: v }) },
  vocAtk:    { n: (o) => o + '战法', sc: 'army', voc: 1, ic: vocIc, ...S_(0.2), d: (v, o) => '本领袖出征时，' + o + '部队攻击 +' + pct(v) + '。', m: (v, o) => ({ [VK[o] + 'Atk']: v }) },
  vocHp:     { n: (o) => o + '护甲', sc: 'army', voc: 1, ic: vocIc, ...S_(0.2), d: (v, o) => '本领袖出征时，' + o + '部队生命 +' + pct(v) + '。', m: (v, o) => ({ [VK[o] + 'Hp']: v }) },
  massing:   { n: (o) => o + '集结', sc: 'army', voc: 1, strat: 1, ic: 'e_flag', ...X_({ 3: 0.025, 4: 0.03, 5: 0.04, 6: 0.05 }), d: (v, o) => '本领袖出征时，每有 1 支' + o + '部队，全体部队攻击 +' + Math.round(v * 1000) / 10 + '%。', m: (v, o) => ({ ['mass_' + VK[o]]: v }) },
  diverse:   { n: '混编', sc: 'army', strat: 1, ic: 'e_summon', ...X_({ 2: 0.01, 3: 0.015, 4: 0.02, 5: 0.025, 6: 0.03 }), d: (v) => '本领袖出征时，部队里每有一种职业，全体部队生命 +' + Math.round(v * 1000) / 10 + '%。', m: (v) => ({ diverse: v }) },
  muster:    { n: '征兵术', sc: 'army', voc: 1, strat: 1, ic: 'f_recruit', ...X_({ 2: 1, 5: 2 }), d: (v, o) => '本领袖出征时，开局多带 ' + v + ' 支' + o + '部队。', m: (v, o) => ({ ['muster_' + VK[o]]: v }) },
  // ── its expeditions
  scout:     { n: '侦察术', sc: 'run', ic: 't_eye', ...X_({ 1: 1, 3: 2, 5: 3 }), d: (v) => '本领袖出征时，视野 +' + v + '。', m: (v) => ({ vision: v }) },
  haggle:    { n: '外交术', sc: 'run', ic: 't_coin', ...S_(0.12), d: (v) => '本领袖出征时，商店价格 -' + pct(v) + '。', m: (v) => ({ shop: -v }) },
  fortune:   { n: '红运', sc: 'run', ic: 't_mult', ...X_({ 1: 0.1, 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.5, 6: 0.7 }), d: (v) => '本领袖出征时，每场战斗的初始积分倍率 +' + v + '。', m: (v) => ({ startMult: v }) },
  gambler:   { n: '赌性', sc: 'run', ic: 't_dice', ...S_(0.08), d: (v) => '本领袖出征时，支援道具转出好效果的概率 +' + pct(v) + '。', m: (v) => ({ tier: v }) },
  scavenge:  { n: '后勤学', sc: 'run', ic: 't_sack', ...S_(0.25), d: (v) => '本领袖出征时，打仗得到的物资 +' + pct(v) + '。', m: (v) => ({ supplies: v }) },
  treasure:  { n: '寻宝术', sc: 'run', strat: 1, ic: 't_chest', ...S_(0.4), d: (v) => '本领袖出征时，宝箱里的积分 +' + pct(v) + '。', m: (v) => ({ chest: v }) },
  intuition: { n: '直觉', sc: 'run', ic: 't_clover', ...S_(0.15), d: (v) => '本领袖出征时，奇遇出好结果的概率 +' + pct(v) + '。', m: (v) => ({ eventLuck: v }) },
  patience:  { n: '坚守术', sc: 'run', ic: 'l_hourglass', ...X_({ 1: 0.1, 2: 0.15, 3: 0.2, 4: 0.25, 5: 0.3, 6: 0.35 }), d: (v) => '本领袖出征时，坚守战的时间 -' + pct(v) + '。', m: (v) => ({ hold: -v }) },
  bounty:    { n: '赏金', sc: 'run', strat: 1, ic: 'e_fang', ...X_({ 2: 0.2, 3: 0.3, 4: 0.4, 5: 0.55, 6: 0.7 }), d: (v) => '本领袖出征时，精英战和首领战得到的积分 +' + pct(v) + '。', m: (v) => ({ eliteScore: v }) },
  peddler:   { n: '货郎', sc: 'run', strat: 1, ic: 'e_market', ...X_({ 2: 1, 4: 2, 6: 3 }), d: (v) => '本领袖出征时，卖部队的商店多摆 ' + v + ' 支部队。', m: (v) => ({ shopUnits: v }) },
  scholar:   { n: '考古学', sc: 'run', strat: 1, ic: 'g_scroll', ...X_({ 1: 0.2, 2: 0.3, 3: 0.45, 4: 0.6, 5: 0.8, 6: 1 }), d: (v) => '本领袖出征时，掉图纸的概率 +' + pct(v) + '。', m: (v) => ({ bpFind: v }) },
  forage:    { n: '狩猎', sc: 'run', strat: 1, ic: 'e_bottle', ...X_({ 2: 0.1, 3: 0.15, 4: 0.2, 5: 0.25, 6: 0.3 }), d: (v) => '本领袖出征时，每赢一场仗，有 ' + pct(v) + ' 概率捡到一个支援道具。', m: (v) => ({ forage: v }) },
  // ── the whole base (works every day while this leader is alive)
  estates:   { n: '理财术', sc: 'base', ic: 'f_store', ...I_(12), d: (v) => '基地每天多产 ' + v + ' 物资。', m: (v) => ({ supplyDaily: v }) },
  mentor:    { n: '教导术', sc: 'base', ic: 'f_train', ...I_(10), d: (v) => '基地里的每名领袖每天获得 ' + v + ' 经验。', m: (v) => ({ expDaily: v }) },
  alchemy:   { n: '炼金术', sc: 'base', ic: 'e_mana', ...I_(10), d: (v) => '基地每天多产 ' + v + ' 经验球。', m: (v) => ({ orbDaily: v }) },
  souls:     { n: '招魂术', sc: 'base', ic: 'e_soul', ...X_({ 3: 1, 4: 2, 5: 3, 6: 4 }), d: (v) => '基地每天多产 ' + v + ' 灵魂碎片。', m: (v) => ({ shardDaily: v }) },
  medic:     { n: '医术', sc: 'base', ic: 'f_med', ...S_(0.1), d: (v) => '医院每天给每名领袖多回复 ' + pct(v) + ' 生命。', m: (v) => ({ heal: v }) },
  mining:    { n: '采矿术', sc: 'base', ic: 'u_pick', ...S_(0.2), d: (v) => '基地挖掘费用 -' + pct(v) + '。', m: (v) => ({ digCost: -v }) },
  engineer:  { n: '建筑学', sc: 'base', ic: 'u_hammer', ...X_({ 4: 1, 6: 2 }), d: (v) => '基地建造的工期少 ' + v + ' 天（至少 1 天）。', m: (v) => ({ buildDays: -v }) },
  smith:     { n: '锻造术', sc: 'base', ic: 'g_anvil', ...S_(0.2), d: (v) => '铁匠铺打造宝物的费用 -' + pct(v) + '。', m: (v) => ({ craftCost: -v }) },
  ballistics:{ n: '弹道学', sc: 'base', ic: 'f_defense', ...S_(0.12), d: (v) => '混沌来袭时，基地武器的伤害 +' + pct(v) + '。', m: (v) => ({ defDmg: v }) },
  bulwark:   { n: '城防术', sc: 'base', ic: 'g_gate', ...S_(0.12), d: (v) => '传送门耐久 +' + pct(v) + '。', m: (v) => ({ portalHp: v }) },
  tactics:   { n: '战术', sc: 'base', ic: 'e_bolt', ...S_(0.04), d: (v) => '所有领袖出征时，部队攻击 +' + pct(v) + '。', m: (v) => ({ unitAtk: v }) },
  drill:     { n: '操练', sc: 'base', ic: 'e_thorns', ...S_(0.04), d: (v) => '所有领袖出征时，部队生命 +' + pct(v) + '。', m: (v) => ({ unitHp: v }) },
  logistics: { n: '军需', sc: 'base', ic: 'f_logi', ...S_(0.1), d: (v) => '所有领袖出征带回的物资 +' + pct(v) + '。', m: (v) => ({ lootSup: v }) },
  rally:     { n: '鼓舞', sc: 'base', ic: 'e_star', ...X_({ 2: 0.1, 4: 0.2, 6: 0.3 }), d: (v) => '所有领袖出征时，每场战斗的初始积分倍率 +' + v + '。', m: (v) => ({ startMult: v }) },
  command:   { n: '统御', sc: 'base', ic: 'l_crown', ...X_({ 6: 1 }), d: () => '领袖上限 +1。', m: (v) => ({ heroCap: v }) },
};
M.TALENTS = T; M.TAL_SC = SC; M.TAL_TIER = TIER;
const tiersOf = (k) => T[k].tiers || [1, 2, 3, 4, 5, 6];
const famFor = (t) => Object.keys(T).filter(k => tiersOf(k).includes(t));
M.talHeightOf = (rarity) => (SHAPE[rarity] || SHAPE[0]).length;

// ───────── a new tree ─────────
M.talentTree = function (rarity) {
  const L = SHAPE[rarity] || SHAPE[0], nodes = []; let prev = [-1];
  L.forEach(([a, b], li) => {
    const maxK = prev[0] === -1 ? 3 : 2, w = Math.min(a + Math.floor(rnd() * (b - a + 1)), prev.length * maxK), kids = prev.map(() => 0);
    for (let i = 0; i < w; i++) { const open = prev.map((_, j) => j).filter(j => kids[j] < maxK); kids[M.wpick(open, j => (kids[j] ? 1 : 3))]++; }
    const cur = []; prev.forEach((p, j) => { for (let k = 0; k < kids[j]; k++) { nodes.push({ p, L: li + 1 }); cur.push(nodes.length - 1); } });
    prev = cur;
  });
  // a node never repeats its parent, its children or its siblings
  const give = (i, pred) => {
    const n = nodes[i], near = nodes.filter((x, j) => j !== i && x.f && (x.p === n.p || j === n.p || x.p === i)).map(x => x.f);
    const c = famFor(n.L).filter(k => !near.includes(k) && (!pred || pred(T[k]))); if (!c.length) return false;
    n.f = M.wpick(c, k => (T[k].strat ? 2 : T[k].sc === 'base' ? 2 : 3)); if (T[n.f].voc) n.voc = pick(Object.keys(VK)); else delete n.voc; return true;
  };
  nodes.forEach((n, i) => give(i));
  // every tree has something that changes how a run is played, and something for the base
  const k = nodes.length >= 10 ? 2 : 1, keep = (f) => T[f].strat || T[f].sc === 'base';
  [(F) => !!F.strat, (F) => F.sc === 'base'].forEach(pred => {
    for (let g = 0; g < 30 && nodes.filter(n => pred(T[n.f])).length < k; g++) {
      const c = nodes.map((_, i) => i).filter(i => !keep(nodes[i].f) && famFor(nodes[i].L).some(f => pred(T[f]))); if (!c.length) break; give(pick(c), pred);
    }
  });
  return nodes;
};

// ───────── reading a node ─────────
const F_ = (n) => T[n.f];
M.talVal = (n) => F_(n).v(n.L);
M.talName = (n) => { const F = F_(n); return typeof F.n === 'function' ? F.n(n.voc) : F.n; };
M.talDesc = (n) => F_(n).d(M.talVal(n), n.voc);
M.talIcon = (n) => { const F = F_(n); return typeof F.ic === 'function' ? F.ic(n.voc) : F.ic; };
M.talScope = (n) => SC[F_(n).sc];
M.talHeight = (h) => (Array.isArray(h.tree) ? h.tree.reduce((a, n) => Math.max(a, n.L), 0) : 0);
M.talShown = (h) => Math.max(0, Math.min(M.talHeight(h), h.lv - 1));            // layer k shows from Lv k+1
M.talTaken = (h, i) => Array.isArray(h.taken) && h.taken.includes(i);
M.talOpen = (h, i) => { const n = h.tree[i]; return !!n && n.L <= M.talShown(h) && !M.talTaken(h, i) && (n.p < 0 || M.talTaken(h, n.p)); };
M.talCan = (h, i) => h.points > 0 && M.talOpen(h, i);
M.canTake = M.talCan;
const addM = (o, x) => Object.keys(x).forEach(k => { o[k] = (o[k] || 0) + x[k]; });
// what the leader's own talents do (the base ones go into the base's modifiers instead)
M.talentMods = function (h) {
  const o = {}; if (!h || !Array.isArray(h.tree) || !Array.isArray(h.taken)) return o;
  h.taken.forEach(i => { const n = h.tree[i]; if (n && T[n.f] && T[n.f].sc !== 'base') addM(o, T[n.f].m(M.talVal(n), n.voc)); });
  return o;
};
M.talentBase = function (m) {
  const o = {}; (m && m.heroes || []).forEach(h => { if (!Array.isArray(h.tree) || !Array.isArray(h.taken)) return; h.taken.forEach(i => { const n = h.tree[i]; if (n && T[n.f] && T[n.f].sc === 'base') addM(o, T[n.f].m(M.talVal(n), n.voc)); }); });
  return o;
};
M.talPower = (h) => (Array.isArray(h.taken) ? h.taken.reduce((a, i) => a + (h.tree[i] ? 40 * TIER[h.tree[i].L] : 0), 0) : 0);
// saves: a tree of the old three-branch kind is replaced by a new one and every point comes back
M.talValid = (h) => Array.isArray(h.tree) && Array.isArray(h.taken) && h.tree.length > 0 && h.tree.every((n, i) => n && T[n.f] && Number.isInteger(n.L) && n.L >= 1 && n.L <= 6 && tiersOf(n.f).includes(n.L) && Number.isInteger(n.p) && n.p < i && (n.p < 0 || h.tree[n.p].L === n.L - 1) && (!T[n.f].voc || VK[n.voc])) && h.taken.every(i => Number.isInteger(i) && h.tree[i]) && new Set(h.taken).size === h.taken.length;
M.talReset = function (h) { h.tree = M.talentTree(h.rarity); h.taken = []; h.points = Math.max(0, h.lv - 1); };

// ───────── base-wide talents flow into the base modifiers ─────────
const oBM = M.baseMods;
M.baseMods = function (m, raw) {
  const o = oBM.apply(this, arguments); if (raw || !m || !m.heroes) return o;
  addM(o, M.talentBase(m)); ['digCost', 'craftCost'].forEach(k => { if (o[k]) o[k] = Math.max(-0.8, o[k]); });
  return o;
};
const oRS = M.relicSlots;
M.relicSlots = function (h, m) { return oRS.apply(this, arguments) + (M.talentMods(h).relicSlot || 0); };

// ───────── mechanics ─────────
// 集结 / 混编: the army's make-up feeds every unit
const oLM = M.legionMods;
M.legionMods = function (run, d) {
  const o = oLM.apply(this, arguments), md = run && run.mods; if (!md) return o;
  Object.keys(md).forEach(k => { if (k.slice(0, 5) !== 'mass_' || !md[k]) return; const vk = k.slice(5), n = (run.roster || []).filter(u => M.DB[u.type] && VK[M.DB[u.type].voc] === vk).length; o.atk += n * md[k]; });
  if (md.diverse) o.hp += new Set((run.roster || []).map(u => M.DB[u.type] && M.DB[u.type].voc).filter(Boolean)).size * md.diverse;
  return o;
};
// 征兵术: extra units of one vocation at the start
const oNR = M.newRun3;
M.newRun3 = function (meta, hero) {
  const run = oNR.apply(this, arguments); if (!run || (run.region && run.region.tut)) return run;
  Object.keys(run.mods || {}).forEach(k => {
    if (k.slice(0, 7) !== 'muster_') return; const vk = k.slice(7), pool = M.SHOP_POOL.filter(t => M.DB[t] && VK[M.DB[t].voc] === vk); if (!pool.length) return;
    const lo = Math.min(...pool.map(t => M.DB[t].q)), cheap = pool.filter(t => M.DB[t].q === lo);
    for (let i = 0; i < run.mods[k]; i++) M.addUnit(run, pick(cheap));
  });
  return run;
};
// 货郎: shops that sell units lay out more (called by mc-shops.js after every stock roll)
M.talShopExtra = function (run) {
  const n = run && run.mods && run.mods.shopUnits, sh = run && run.shop;
  if (n && sh && sh.units && sh.units.length) {
    const S = (M.SHOPS && M.SHOPS[run.shopKind]) || {}, pool = M.SHOP_POOL.filter(k => M.DB[k] && (!S.pool || S.pool(k)) && !sh.units.some(u => u.type === k)), pm = M.priceMul(run);
    for (let i = 0; i < n && pool.length; i++) { const k = pool.splice(Math.floor(rnd() * pool.length), 1)[0]; sh.units.push({ kind: 'unit', type: k, q: M.DB[k].q, cost: Math.max(5, Math.round(M.DB[k].cost * pm * (S.price == null ? 1 : S.price))) }); }
  }
};
// 赏金 / 狩猎: after a won fight
const oSettle = G.startSettle;
G.startSettle = function () {
  const r = oSettle.apply(this, arguments), st = this.settle, run = this.run, n = this.node, md = run && run.mods;
  if (!st || !st.good || !md) return r;
  if (md.eliteScore && n && (n.type === 'elite' || n.type === 'boss')) { const add = Math.round((st.score || 0) * md.eliteScore); if (add > 0) { run.wallet += add; st.tiles.push({ icon: 'coin', v: '+' + M.fmt(add), c: '#ffcc33', to: 'wallet', n: '赏金' }); } }
  if (md.forage && rnd() < md.forage && !run.tut) { const s = run.items.indexOf(null); if (s >= 0) { const k = pick(Object.keys(M.ITEMS)); run.items[s] = k; run.itemQ[s] = 0; st.tiles.push({ icon: M.ITEMS[k].icon, v: 1, c: M.ITEM_C, to: 'items', n: M.ITEMS[k].name }); } }
  return r;
};

// ───────── learning ─────────
G.takeTalent = function (id, i) {
  const m = this.meta, h = m.heroes.find(x => x.id === id); if (!h || !M.talCan(h, i)) return;
  const mx0 = M.heroMaxHp(h, m); h.points--; h.taken.push(i); h.hp = Math.min(M.heroMaxHp(h, m), h.hp + Math.max(0, M.heroMaxHp(h, m) - mx0));
  this.save(); this.bump();
};
})();

;
