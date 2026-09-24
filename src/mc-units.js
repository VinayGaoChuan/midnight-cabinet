// ==== mc-units.js ====
(function () {
const M = window.MC;
const { pick, wpick, nice } = M;
const DB = M.DB, TDB = M.TDB, Q = M.QUALITY;
// ───────── races / vocations ─────────
M.RACES = { 兽人:'#8fd060', 不死:'#8fe0ff', 骷髅:'#e8e0cc', 人类:'#ffd98a', 精灵:'#b8ff90', 僵尸:'#c8e070', 科技:'#6ff0ff', 恶魔:'#ff6a4a', 自然:'#d8ff70', 虚空:'#c890ff', 混沌:'#ff4a4a', 野兽:'#ffb060', 英雄:'#ffd060' };
M.VOCS = { 先锋:'#7fb0ff', 战士:'#ff8a6a', 射手:'#ffd060', 法师:'#c890ff', 祭司:'#9cffb0', 商人:'#ffcc33' };
// custom unit demonstrating a race-count trait
DB.JadeBeast = { n:'宝玉兽', q:1, g:'优质', voc:'商人', race:'兽人', type:'Summon', cost:90, hp:900, atk:34, as:100, spd:320, ranged:0, rad:256, tr:['JadeBeastTrait'], desc:'身上长着玉石的兽，同族越多越值钱。' };
TDB.JadeBeastTrait = { n:'玉石共鸣', d:'场上存在2个兽人单位时，倍率+0.1；存在3个兽人单位时，倍率再+0.1', cls:'JadeBeast', lines:[{ need:2, t:'2 个兽人：倍率 +0.1' }, { need:3, t:'3 个兽人：倍率再 +0.1' }] };
// UNITS_PROXY: legacy code reads M.UNITS[k].name/tags/desc
Object.keys(M.UNITS).forEach(k => { if (!DB[k]) delete M.UNITS[k]; });
Object.keys(DB).forEach(k => { const d = DB[k]; if (d.type !== 'Summon' && d.type !== 'Derivant') return; M.UNITS[k] = { name: d.n, tags: [d.race, d.voc].filter(Boolean), tier: d.q + 1, hp: d.hp, atk: d.atk, desc: d.desc || '', q: d.q }; });
M.pickUnitQ = function (run) { const qw = M.shopQW(run), q = wpick([0, 1, 2, 3], x => qw[x]); const c = M.SHOP_POOL.filter(k => DB[k].q === q); return pick(c.length ? c : M.SHOP_POOL); };
M.nums = (d) => [...String(d).matchAll(/\d+(?:\.\d+)?/g)].map(m => +m[0]);
Object.keys(TDB).forEach(k => { TDB[k].v = M.nums(TDB[k].d); });
M.SHOP_POOL = Object.keys(DB).filter(k => DB[k].type === 'Summon' && DB[k].cost > 0 && DB[k].atk > 0 && !['SlaveLordFinal'].includes(k) || k === 'Stone' || /Tower$/.test(k) && DB[k].type === 'Summon' && DB[k].cost > 0);
M.unitName = (k) => DB[k] ? DB[k].n : k;
M.unitPower = (k, u) => { const d = DB[k]; return Math.round((d.hp + (u ? u.bHp || 0 : 0)) * 0.1 + (d.atk + (u ? u.bAtk || 0 : 0)) * (d.as || 100) / 100 * 1.6); };
// ───────── rich text ─────────
const KW = [['法力值', '#6fb8ff'], ['法力', '#6fb8ff'], ['攻击速度', '#ffd060'], ['攻速', '#ffd060'], ['技能伤害', '#d890ff'], ['最大生命值', '#7fff9a'], ['生命值', '#7fff9a'], ['生命', '#7fff9a'], ['防御', '#9fc8ff'], ['攻击力', '#ff9a6a'], ['吸血', '#ff5a6a'], ['召唤', '#c890ff'], ['光环', '#ffe08a'], ['闪避', '#b8f0ff'], ['积分', '#ffcc33'], ['倍率', '#ffcc33'], ['连击', '#ff9a6a'], ['治疗', '#7fff9a'], ['恢复', '#7fff9a'], ['隐身', '#b8b8ff'], ['复活', '#7fff9a'], ['进化', '#ffcc33'], ['升级', '#ffcc33'], ['永久', '#ffcc33'], ['反弹', '#9cff7a'], ['弹射', '#6fe0ff'], ['溅射', '#ff9a6a'], ['降低', '#ff7a7a'], ['减少', '#9fc8ff']];
M.rich = function (s, base) {
  const out = []; let i = 0, buf = ''; s = String(s || '');
  const flush = () => { if (buf) { out.push({ t: buf, c: base || '#d8cfc0' }); buf = ''; } };
  while (i < s.length) {
    const m = s.slice(i).match(/^(\d+(?:\.\d+)?%?(?:\*|x\d+)?)/);
    if (m && !/[A-Za-z]/.test(s[i - 1] || '')) { flush(); out.push({ t: m[1], c: '#ffe08a', b: 1 }); i += m[1].length; continue; }
    const kw = KW.find(([w]) => s.startsWith(w, i));
    if (kw) { flush(); out.push({ t: kw[0], c: kw[1], b: 1 }); i += kw[0].length; continue; }
    const en = s.slice(i).match(/^[A-Z][A-Za-z]+/);
    if (en && DB[en[0]]) { flush(); out.push({ t: '「' + DB[en[0]].n + '」', c: Q[DB[en[0]].q].c, b: 1 }); i += en[0].length; continue; }
    buf += s[i++];
  }
  flush(); return out;
};
M.traitsOf = (k) => (DB[k] ? DB[k].tr : []).filter(t => TDB[t]).map(t => Object.assign({ key: t }, TDB[t]));
M.growthTraits = ['JuniorFishermanTrait', 'CommercialFishermanTrait', 'IncubationTrait', 'SpiritOfferingTrait', 'BloomingTrait', 'FatalityTrait', 'UnyieldingSpiritTrait', 'ExuberanceTrait', 'EliteFishermanTrait'].map(x => 'Summon' + x);
M.unitTip = function (k, u, run) {
  const d = DB[k], q = Q[d.q];
  const lines = [{ rich: [{ t: d.race, c: M.RACES[d.race] || '#fff', b: 1 }, { t: ' · ', c: '#6b6570' }, { t: d.voc || '野怪', c: M.VOCS[d.voc] || '#aaa', b: 1 }, { t: ' · ' + (d.ranged === 1 ? '远程' : d.ranged === 2 ? '不攻击' : '近战'), c: '#a89ca8' }] },
    { rich: [{ t: '生命 ', c: '#8d8496' }, { t: M.fmt(d.hp + (u && u.bHp || 0)), c: '#7fff9a', b: 1 }, { t: '　攻击 ', c: '#8d8496' }, { t: M.fmt(d.atk + (u && u.bAtk || 0)), c: '#ff9a6a', b: 1 }, { t: '　攻速 ', c: '#8d8496' }, { t: ((d.as || 0) / 100).toFixed(2), c: '#ffd060', b: 1 }, { t: '　战力 ', c: '#8d8496' }, { t: String(M.unitPower(k, u)), c: q.c, b: 1 }] }];
  M.traitsOf(k).forEach(T => {
    lines.push({ rich: [{ t: '【' + T.n + '】', c: '#ffe8b0', b: 1 }].concat(M.rich(T.d)) });
    if (T.lines && run) { const cnt = run.roster.filter(x => DB[x.type] && DB[x.type].race === d.race).length; T.lines.forEach(l => lines.push({ rich: [{ t: (cnt >= l.need ? '● ' : '○ ') + l.t, c: cnt >= l.need ? '#ffcc33' : '#5a5460', b: cnt >= l.need }] })); }
  });
  if (u && (u.lv || u.battles)) lines.push({ rich: [{ t: '成长 ', c: '#8d8496' }, { t: 'Lv ' + (u.lv || 1), c: '#ffcc33', b: 1 }, { t: ' · 已参战 ' + (u.battles || 0) + ' 场 · 击杀 ' + (u.kills || 0), c: '#a89ca8' }] });
  return { title: d.n, c: q.c, kind: q.n + ' · ' + (d.cost ? '价格 ' + d.cost : ''), d: d.desc || '', lines };
};
// ───────── roster (no merging, no stars) ─────────
M.ROSTER_CAP = 10;
M.canAdd = (run) => run.roster.length < M.ROSTER_CAP;
M.addUnit = function (run, type) { if (!M.canAdd(run)) return null; run.roster.push({ uid: M.rid(), type, star: 1, bAtk: 0, bHp: 0, lv: 1, battles: 0, kills: 0, mana: 0, bonusAtk: 0 }); return null; };
M.wouldMerge = () => false;
M.sellValue = (run, u) => Math.round((DB[u.type].cost || 10) * 0.5);
M.synergies = () => ({ cnt: {}, lvl: {} });
M.TAGS = {};
// ───────── banners (legion) ─────────
M.LEGION = {
  vanguard:{ name:'先锋战旗', q:0, icon:'flag', cost:60, desc:'先锋单位生命 +20%', m:{ voc:'先锋', hp:0.2 } },
  warrior:{ name:'战士战旗', q:0, icon:'flag', cost:60, desc:'战士单位攻击 +15%', m:{ voc:'战士', atk:0.15 } },
  archer:{ name:'射手战旗', q:0, icon:'flag', cost:60, desc:'射手单位攻击速度 +15%', m:{ voc:'射手', as:0.15 } },
  mage:{ name:'法师战旗', q:1, icon:'flag', cost:90, desc:'法师单位法力恢复 +30%', m:{ voc:'法师', mana:0.3 } },
  priest:{ name:'祭司战旗', q:1, icon:'flag', cost:90, desc:'祭司单位生命与攻击 +15%', m:{ voc:'祭司', hp:0.15, atk:0.15 } },
  merchant:{ name:'商人战旗', q:1, icon:'flag', cost:90, desc:'击杀获得的基础积分 +15%', m:{ base:0.15 } },
  zeal:{ name:'狂热战旗', q:2, icon:'flag', cost:140, desc:'每场战斗初始倍率 +0.1', m:{ mult:0.1 } },
  bounty:{ name:'赏金战旗', q:2, icon:'flag', cost:140, desc:'击杀精英或首领时，倍率额外 +0.1', m:{ eliteMult:0.1 } },
  bulwark:{ name:'壁垒战旗', q:2, icon:'flag', cost:150, desc:'战斗开始时，全体获得 15% 生命的护盾', m:{ shield:0.15 } },
  fury:{ name:'血怒战旗', q:3, icon:'flag', cost:220, desc:'全体攻击 +12%，攻击速度 +8%', m:{ atk:0.12, as:0.08 } },
  crown:{ name:'王冠战旗', q:3, icon:'flag', cost:240, desc:'每击杀 15 个敌人，倍率 +0.1', m:{ killMult:15 } },
};
M.FIELDS = {};
M.legionMods = function (run, d) {
  const o = { hp: 0, atk: 0, as: 0, mana: 0, shield: 0 };
  Object.keys(run.legion || {}).forEach(k => { const L = M.LEGION[k]; if (!L) return; const m = L.m; if (m.voc && m.voc !== d.voc) return; ['hp', 'atk', 'as', 'mana', 'shield'].forEach(x => { if (m[x]) o[x] += m[x]; }); });
  return o;
};
M.legionSum = (run, key) => Object.keys(run.legion || {}).reduce((a, k) => a + ((M.LEGION[k] && M.LEGION[k].m[key]) || 0), 0);
// ───────── shop ─────────
M.shopQW = function (run) { const L = Math.max(0, run.lastL || 0); return [Math.max(8, 70 - L * 9), 26 + L * 2, 6 + L * 3.2, Math.max(0, -3 + L * 1.6)]; };
M.itemPrice = (q) => [40, 70, 120, 200][q];
M.rollShop = function (run) {
  const qw = M.shopQW(run), pool = M.SHOP_POOL.concat(['JadeBeast']);
  const units = []; for (let i = 0; i < 6; i++) { const q = wpick([0, 1, 2, 3], x => qw[x]); const c = pool.filter(k => DB[k].q === q && !units.some(u => u.type === k)); const k = pick(c.length ? c : pool); units.push({ kind: 'unit', type: k, q: DB[k].q, cost: Math.max(10, Math.round(DB[k].cost * M.priceMul(run))) }); }
  const lk = Object.keys(M.LEGION).filter(k => !run.legion[k]).sort(() => Math.random() - 0.5).slice(0, 2);
  const banners = lk.map(k => ({ kind: 'legion', key: k, q: M.LEGION[k].q, cost: Math.round(M.LEGION[k].cost * M.priceMul(run)) }));
  const items = []; for (let i = 0; i < 3; i++) { const q = wpick([0, 1, 2, 3], x => [60, 28, 10, 2][x]); items.push({ kind: 'item', key: pick(Object.keys(M.ITEMS)), q, cost: Math.round(M.itemPrice(q) * M.priceMul(run)) }); }
  run.shop = { units, banners, items };
};
M.refreshCost = (run) => 10 + 5 * (run.refreshN || 0);
M.cardInfo = (c) => ({ name: c.kind === 'unit' ? DB[c.type].n : c.kind === 'legion' ? M.LEGION[c.key].name : M.ITEMS[c.key].name, icon: c.kind === 'unit' ? c.type : c.kind === 'legion' ? 'banner' : M.ITEMS[c.key].icon, cat: c.kind === 'legion' ? '战旗' : c.kind === 'item' ? '道具' : '部队', cc: '#ffcc33', desc: c.kind === 'legion' ? M.LEGION[c.key].desc : c.kind === 'item' ? M.ITEMS[c.key].desc : '', tags: [] });
// ───────── enemy waves ─────────
M.budgetAt = (L) => Math.round(40 * Math.pow(1.34, L));
M.ENEMY_POOL = Object.keys(DB).filter(k => DB[k].type === 'Enemy' && k !== 'Deadman');
const BOSSES = { tut:'VerdantWormKing', mid:['Kraken', 'Cerberus', 'LeopardEmperorSavalon', 'ChaosButcher'], big:['SpiderEmperorAnazos', 'EarthDragonKingGargon', 'ChaosGuardBlackKatos'], final:'EvilEyeKingNixon' };
M.pickWave = function (budget, opts = {}) {
  const pool = M.ENEMY_POOL.filter(k => DB[k].g !== '不朽' && !['VerdantWormKing', 'Kraken', 'Cerberus', 'LeopardEmperorSavalon', 'ChaosButcher'].includes(k) && DB[k].cost <= budget * (opts.elite ? 0.7 : 0.45) && DB[k].cost >= Math.min(budget / 14, 60));
  const list = []; let left = budget;
  if (opts.elite) { const ep = M.ENEMY_POOL.filter(k => DB[k].g === '史诗' || DB[k].g === '稀有').filter(k => DB[k].cost <= budget * 0.6).sort((a, b) => DB[b].cost - DB[a].cost); const e = ep[Math.floor(Math.random() * Math.min(3, ep.length))] || 'Brute'; list.push({ type: e, elite: 1 }); left -= DB[e].cost; }
  let guard = 0; while (left > 8 && guard++ < 40) { const c = pool.filter(k => DB[k].cost <= left); if (!c.length) break; const k = pick(c); list.push({ type: k }); left -= DB[k].cost; if (k === 'Imp') { list.push({ type: 'Imp' }); left -= DB.Imp.cost; } }
  if (!list.length) list.push({ type: 'Snail' });
  return list;
};
M.levelAt = (run, node) => run.lvl0 + node.col * run.lvlStep + (node.type === 'elite' ? 0.5 : 0) + (node.type === 'boss' ? 0.8 : 0);
M.makeBattleCfg = function (run, node) {
  const L = M.levelAt(run, node), t = node.type, tut = run.region.tut, budget = M.budgetAt(L) * (tut ? 0.8 : 1);
  const mode = t === 'extract' || t === 'hold' ? 'hold' : 'normal';
  const cfg = { mode, w: L, type: t, list: [], dur: 0, budget };
  if (mode === 'hold') {
    cfg.dur = Math.round((t === 'extract' ? 40 : 32) * (1 + (run.mods.hold || 0)));
    const waves = Math.ceil(cfg.dur / 8);
    for (let i = 0; i < waves; i++) M.pickWave(budget * 0.45).forEach((e, j) => cfg.list.push(Object.assign(e, { spawn: 1.6 + i * 8 + j * 0.35 })));
  } else {
    const list = M.pickWave(budget * (t === 'boss' ? 0.55 : 1), { elite: t === 'elite' });
    list.forEach((e, i) => { e.spawn = 1.6 + i * 0.45 + Math.random() * 0.3; cfg.list.push(e); });
    if (t === 'boss') { let b; if (tut) b = BOSSES.tut; else if (node.final && run.region.final) b = BOSSES.final; else { const c = BOSSES.mid.concat(BOSSES.big, ['VerdantWormKing', 'EvilEyeDark', 'ChaosSoldier', 'SiegeRam', 'Centaur']); b = c.sort((x, y) => Math.abs(DB[x].cost - budget * 0.7) - Math.abs(DB[y].cost - budget * 0.7))[Math.floor(Math.random() * 2)]; } cfg.list.push({ type: b, boss: 1, spawn: 4.5 }); }
  }
  cfg.list.forEach(e => e.y = 90 + Math.random() * 540);
  cfg.list.sort((a, b) => a.spawn - b.spawn);
  return cfg;
};
// ───────── items keep; quality shown ─────────
// ───────── buildings: tavern + day rules ─────────
const B = M.BUILDINGS;
B.tavern = { n:'酒馆', q:0, cat:'recruit', style:'medieval', pw:-1, cost:60, days:1, recruit:{}, d:'花物资招募新领袖。领袖越多，出征和守城的选择越多。' };
Object.keys(B).forEach(k => { if (!B[k].fixed && !B[k].specialDays) B[k].days = B[k].q + 1; });
M.LIGHT_R = (m, x) => x.b === 'core' ? 3 : x.b ? [1, 2, 2, 3][M.BUILDINGS[x.b].q] : x.dug ? 1 : 0;
// ───────── heroes scaled to the new stat range ─────────
Object.keys(M.HEROES).forEach(k => { const H = M.HEROES[k]; if (!H._s) { H._s = 1; H.hp *= 5; H.atk *= 3; H.range = H.ranged ? 420 : 70; } });
// ───────── meta v4 ─────────
const KEY = 'midnight-cabinet-meta-v4';
M.defaultMeta3 = function () {
  const m = { v: 4, day: 1, supplies: 200, shards: 30, orbs: 0, inv: {}, relics: [], heroes: [], graveyard: [], cleared: {}, seenWorlds: {}, runs: 0, tutDone: false, baseTut: 0, portal: { hp: 1000 }, raids: 0, log: [], seenB: {} };
  m.base = M.newBase(); m.base.cells[M.CORE.r][M.CORE.c - 1].dug = true; m.base.cells[M.CORE.r][M.CORE.c + 1].dug = true;
  m.base.cells[M.CORE.r][M.CORE.c - 1].tile = null; m.base.cells[M.CORE.r][M.CORE.c + 1].tile = null;
  m.heroes.push(M.newHero(m, 'watchman', 1));
  return m;
};
M.loadMeta3 = function () { try { const m = JSON.parse(localStorage.getItem(KEY)); if (m && m.v === 4) return m; } catch (e) {} return M.defaultMeta3(); };
M.saveMeta3 = function (m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) {} };
M.resetMeta3 = function () { try { localStorage.removeItem(KEY); } catch (e) {} return M.defaultMeta3(); };
// ───────── runs: starting army from table ─────────
const oldNewRun = M.newRun3;
M.newRun3 = function (meta, hero, worldKey, relicIds) {
  const run = oldNewRun(meta, hero, worldKey, relicIds);
  run.roster = []; run.legion = {}; run.field = null; run.refreshN = 0; run.meta.unlocked = M.SHOP_POOL.slice();
  const starters = M.SHOP_POOL.filter(k => DB[k].q === 0 && DB[k].cost >= 15 && DB[k].cost <= 60 && DB[k].ranged !== 2).sort(() => Math.random() - 0.5);
  const tut = run.region.tut;
  (tut ? ['FootSoldier', 'Ranger', 'Guard'] : starters.slice(0, 3)).forEach(k => M.addUnit(run, k));
  run.startMult = Math.round(((run.startMult || 0)) * 10) / 10;
  const df = run.region.diff || 0; run.lvl0 = tut ? 0.3 : 0.5 + df * 0.2 + Math.min(0.8, (meta.day - 1) * 0.03); const endL = tut ? 1.5 : Math.min(11, 3 + df * 1.0 + run.len.cols * 0.12); run.lvlStep = Math.max(0.12, (endL - run.lvl0) / Math.max(1, run.len.cols - 1));
  if (tut) { run.len = { n: '序章', cols: 10, ex: 0, elite: [1, 1], boss: 1 }; run.map = M.genMap2(run, meta); }
  return run;
};
M.unitPool3 = () => M.SHOP_POOL.slice();
M.NODE.score && delete M.NODE.score; M.NODE.holdScore && delete M.NODE.holdScore;
})();

;
