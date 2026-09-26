// ==== mc-meta-a.js ====
(function () {
// The room outside the cabinet is the real meta layer. One "game" (局) = base + expeditions inside the machine; it ends when
// the base core breaks (leaders keep dying) or the portal falls. Tokens earned there buy furniture; every piece changes a rule.
const M = window.MC, G = M.Game.prototype, S = M.Sfx;
// switched off for now (user ruling 2026-09-24): the base is the outer loop, expeditions the inner one. With the room off,
// the intro leads to the title menu, no furniture / achievement perks apply, and a finished game goes back to the menu.
M.META_ROOM = false;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = Math.random;

// ═════════════════════ profile (persists across games) ═════════════════════
const PKEY = 'midnight-cabinet-profile-v1';
const defProfile = () => ({ v: 1, tokens: 0, furn: {}, ach: {}, achOn: false, active: false, stats: { games: 0, bestDay: 0, clears: 0, battles: 0, claws: 0, tokensAll: 0 }, hist: [], carry: null, kit: [], hard: false, pending: null });
M.loadProfile = function () { try { const p = JSON.parse(localStorage.getItem(PKEY)); if (p && p.v === 1) { const d = defProfile(); return Object.assign(d, p, { stats: Object.assign(d.stats, p.stats || {}) }); } } catch (e) {} return defProfile(); };
let PV = 1; // perk cache version
Object.defineProperty(G, 'prof', { configurable: true, get() { if (!this._prof) { this._prof = M.loadProfile(); if (!this._prof.active && this.meta && (this.meta.tutDone || this.meta.day > 1)) this._prof.active = true; } return this._prof; }, set(v) { this._prof = v; PV++; } });
G.saveProfile = function () { try { localStorage.setItem(PKEY, JSON.stringify(this.prof)); } catch (e) {} PV++; };
const prof = () => (M._g ? M._g.prof : M.loadProfile());

// ═════════════════════ furniture: each level is a rule change ═════════════════════
// fx is the full effect at that level (levels do not stack)
M.FURN = [
  { k: 'drink', icon: 'f_med', names: ['水壶', '咖啡机', '多合一饮料机'], cost: [50, 150, 350], what: '每一局开始前先喝一杯。', lv: [
    { d: '每局前 3 天：部队和领袖攻击 +10%', fx: { drinkDays: 3, drinkAtk: 0.1 } },
    { d: '每局前 5 天：部队和领袖攻击 +15%', fx: { drinkDays: 5, drinkAtk: 0.15 } },
    { d: '每局前 7 天：攻击 +20%，部队生命 +10%', fx: { drinkDays: 7, drinkAtk: 0.2, drinkHp: 0.1 } }] },
  { k: 'fridge', icon: 'sack', names: ['旧冰箱', '双门冰箱', '冷库'], cost: [60, 160, 380], what: '囤点吃的，底气就足。', lv: [
    { d: '每局初始物资 +150', fx: { startSup: 150 } },
    { d: '初始物资 +150；出征带回的物资 +25%', fx: { startSup: 150, lootSup: 0.25 } },
    { d: '初始物资 +250；带回物资 +25%；基地每天 +25 物资', fx: { startSup: 250, lootSup: 0.25, supplyDaily: 25 } }] },
  { k: 'piggy', icon: 'e_coin', names: ['存钱罐', '保险箱', '瑞士银行'], cost: [70, 180, 420], what: '一局结束时，把一部分家底带进下一局。', lv: [
    { d: '带走上一局 15% 物资和 10% 灵魂碎片', fx: { carrySup: 0.15, carrySh: 0.1 } },
    { d: '带走 30% 物资和 20% 灵魂碎片', fx: { carrySup: 0.3, carrySh: 0.2 } },
    { d: '带走 50% 物资、30% 灵魂碎片，还有最好的 1 件宝物', fx: { carrySup: 0.5, carrySh: 0.3, carryRelic: 1 } }] },
  { k: 'sofa', icon: 'r_human', names: ['旧沙发', '懒人沙发', '按摩椅'], cost: [80, 200, 420], what: '坐得舒服，领袖也出得了力。', lv: [
    { d: '每局初始领袖 +1 级', fx: { startHeroLv: 1 } },
    { d: '初始领袖 +1 级；之后招募的领袖也 +1 级', fx: { startHeroLv: 1, newHeroLv: 1 } },
    { d: '初始领袖 +2 级；招募的领袖 +1 级；医疗回血 +50%', fx: { startHeroLv: 2, newHeroLv: 1, healMul: 0.5 } }] },
  { k: 'books', icon: 't_eye', names: ['攻略书', '地图册', '全知之书'], cost: [90, 220, 480], what: '知道前面有什么，路就好走。', lv: [
    { d: '出征地图视野 +1', fx: { vision: 1 } },
    { d: '出征地图视野 +2', fx: { vision: 2 } },
    { d: '出征时整张地图全部可见', fx: { vision: 2, tower: 1 } }] },
  { k: 'plant', icon: 'r_nature', names: ['小苗', '盆栽', '世界树苗'], cost: [80, 200, 400], what: '它的根扎进了机台里的岩层。', lv: [
    { d: '每局开始时多勘明 1 块特殊地格', fx: { startTiles: 1 } },
    { d: '每局多勘明 2 块特殊地格', fx: { startTiles: 2 } },
    { d: '多勘明 3 块，主基地正下方必定是「灵脉」', fx: { startTiles: 3, coreLey: 1 } }] },
  { k: 'radio', icon: 'e_music', names: ['收音机', '唱片机', '点唱机'], cost: [90, 220, 450], what: '有音乐的夜晚，运气会好一点。', lv: [
    { d: '出征时事件好运 +10%', fx: { eventLuck: 0.1 } },
    { d: '事件好运 +10%；每次出征自带一面随机战旗', fx: { eventLuck: 0.1, runBanner: 1 } },
    { d: '事件好运 +15%；自带战旗；初始积分倍率 +0.2', fx: { eventLuck: 0.15, runBanner: 1, startMult: 0.2 } }] },
  { k: 'clock', icon: 't_hourglass', names: ['挂钟', '落地钟', '时之沙'], cost: [110, 260, 500], what: '机台里的时间，走得比外面快。', lv: [
    { d: '建造时间 -1 天', fx: { buildDays: -1 } },
    { d: '建造时间 -1 天；挖掘立刻完成', fx: { buildDays: -1, digInstant: 1 } },
    { d: '建造时间 -2 天；挖掘立刻完成', fx: { buildDays: -2, digInstant: 1 } }] },
  { k: 'calendar', icon: 'r_skel', names: ['挂历', '行事历', '预言历'], cost: [120, 280, 520], what: '把混沌来袭的日子圈出来。', lv: [
    { d: '混沌来袭间隔 5 天 → 6 天', fx: { raidEvery: 6 } },
    { d: '混沌来袭间隔 7 天', fx: { raidEvery: 7 } },
    { d: '混沌来袭间隔 7 天；混沌来袭时防御塔伤害 +40%', fx: { raidEvery: 7, defDmg: 0.4 } }] },
  { k: 'photo', icon: 't_heart', names: ['相框', '照片墙', '纪念碑'], cost: [100, 240, 480], what: '记住每一个没回来的人。', lv: [
    { d: '领袖阵亡时，多留下 50% 经验球', fx: { deathOrbsX: 0.5 } },
    { d: '阵亡多留 50% 经验球；阵亡时宝物全部保住', fx: { deathOrbsX: 0.5, bank: 9 } },
    { d: '阵亡多留 100% 经验球和灵魂碎片；宝物全部保住', fx: { deathOrbsX: 1, bank: 9, deathShards: 1 } }] },
  { k: 'cat', icon: 'e_cat', names: ['猫碗', '猫窝', '黑猫'], cost: [120, 300, 600], what: '一只不知道从哪来的猫。', lv: [
    { d: '每次出征，地图上必有一只「招财猫」', fx: { catEvent: 1 } },
    { d: '招财猫必出；每局 1 次，领袖倒下时黑猫把他叼回来（不死、不扣核心）', fx: { catEvent: 1, catSaves: 1 } },
    { d: '招财猫必出；每局 2 次叼回倒下的领袖', fx: { catEvent: 1, catSaves: 2 } }] },
  { k: 'rack', icon: 'scroll', names: ['卡带架', '卡带柜', '收藏墙'], cost: [150, 320, 600], what: '投币前，先挑一盘开局卡带。', lv: [
    { d: '解锁 2 种开局卡带', fx: { kits: 2 } },
    { d: '解锁全部 4 种开局卡带', fx: { kits: 4 } },
    { d: '4 种卡带，每局可以同时插 2 盘', fx: { kits: 4, kitSlots: 2 } }] },
  { k: 'cabinet', icon: 'u_star', names: ['展柜'], cost: [100], what: '开启成就。每个成就都会永久解锁一样局内的东西。', lv: [{ d: '开启成就系统（14 个成就）', fx: { ach: 1 } }] },
  { k: 'window', icon: 'u_mask', names: ['月相窗'], cost: [200], what: '每一局都在不同的月亮下开始。', lv: [{ d: '每局随机月相：满月（好运）、新月（便宜）、血月（更难，图纸翻倍，代币 +30%）', fx: { moon: 1 } }] },
  { k: 'door', icon: 'r_demon', names: ['那扇门'], cost: [600], what: '门缝里一直有一双红眼睛。', lv: [{ d: '可以选择「噩梦模式」：敌人 +40%，代币 ×1.6', fx: { hard: 1 } }] },
];
M.FURN_BY = {}; M.FURN.forEach(f => M.FURN_BY[f.k] = f);

// ═════════════════════ achievements: each one unlocks something inside the machine ═════════════════════
M.ACH = [
  { k: 'first_clear', n: '初次通关', d: '通关任意一个世界', r: '每局开局多一张「稀有」以上的建筑图纸', fx: { startBpQ: 1 }, ok: (m) => Object.keys(m.cleared).length >= 1 },
  { k: 'veteran', n: '老兵', d: '把一名领袖升到 8 级', r: '招魂至少招来「稀有」领袖', fx: { recruitMinRar: 1 }, ok: (m) => m.heroes.some(h => h.lv >= 8) },
  { k: 'warden', n: '守夜人', d: '一局里守住 3 次混沌来袭', r: '主基地耐久 +25%', fx: { portalHp: 0.25 }, ok: (m) => (m.st.raidsWon || 0) >= 3 },
  { k: 'architect', n: '建筑师', d: '一局里建成 8 座建筑', r: '建造花费 -15%', fx: { buildCost: -0.15 }, ok: (m) => (m.st.built || 0) >= 8 },
  { k: 'wonder', n: '奇观', d: '建成一座奇观', r: '每局开局送一张奇观图纸', fx: { startWonder: 1 }, ok: (m) => { let f = false; M.eachBuilt(m, (b) => { if (M.BUILDINGS[b].q > 0 && b !== 'core') f = true; }); return f; } },
  { k: 'hunter', n: '猎头', d: '一局里击败 8 个精英', r: '精英必掉图纸', fx: { eliteBp: 1 }, ok: (m) => (m.st.elite || 0) >= 8 },
  { k: 'adventurer', n: '奇遇达人', d: '一局里完成 15 次奇遇', r: '奇遇出现得更多，事件好运 +10%', fx: { eventRate: 0.12, eventLuck: 0.1 }, ok: (m) => (m.st.minis || 0) >= 15 },
  { k: 'collector', n: '收藏家', d: '一局里带回 12 张图纸', r: '宝箱开出图纸的概率翻倍', fx: { chestBp: 1 }, ok: (m) => (m.st.bp || 0) >= 12 },
  { k: 'survivor', n: '不死', d: '活到第 12 天，并且没有领袖在出征中阵亡', r: '每局初始领袖再 +2 级', fx: { startHeroLv: 2 }, ok: (m) => m.day >= 12 && !m.graveyard.some(g => !g.raid) },
  { k: 'abyss', n: '深渊归来', d: '通关「地狱」', r: '首领多掉一张图纸', fx: { bossBp: 1 }, ok: (m) => !!m.cleared.hell },
  { k: 'hauler', n: '满载而归', d: '一次出征带回 300 物资', r: '物资收益 +15%', fx: { lootSup: 0.15 }, ok: (m) => (m.st.bestHaul || 0) >= 300 },
  { k: 'family', n: '一大家子', d: '同时拥有 5 名领袖', r: '招募只要 90 物资', fx: { recruitCost: -30 }, ok: (m) => m.heroes.length >= 5 },
  { k: 'clawgod', n: '娃娃机之神', d: '累计抓到 3 个娃娃', r: '抓娃娃的爪子更紧（成功率 +20%）', fx: { clawBonus: 0.2 }, ok: (m, p) => (p.stats.claws || 0) >= 3 },
  { k: 'centurion', n: '百战', d: '累计赢下 60 场战斗', r: '部队生命 +10%', fx: { unitHp: 0.1 }, ok: (m, p) => (p.stats.battles || 0) >= 60 },
];
M.ACH_BY = {}; M.ACH.forEach(a => M.ACH_BY[a.k] = a);

// ═════════════════════ perks = furniture + earned achievements ═════════════════════
const ADD = ['drinkAtk', 'drinkHp', 'startSup', 'lootSup', 'carrySup', 'carrySh', 'startHeroLv', 'newHeroLv', 'healMul', 'vision', 'startTiles', 'eventLuck', 'startMult', 'buildDays', 'defDmg', 'deathOrbsX', 'deathShards', 'startBpQ', 'portalHp', 'buildCost', 'startWonder', 'eventRate', 'bossBp', 'recruitCost', 'clawBonus', 'unitHp'];
let cache = null, cacheV = -1;
M.perks = function () {
  if (!M.META_ROOM) return {};
  if (cache && cacheV === PV) return cache; const p = prof(), o = {};
  const add = (fx) => Object.keys(fx).forEach(k => { if (ADD.includes(k)) o[k] = (o[k] || 0) + fx[k]; else o[k] = Math.max(o[k] || 0, fx[k]); });
  M.FURN.forEach(f => { const L = p.furn[f.k] || 0; if (L) add(f.lv[L - 1].fx); });
  if (p.achOn) M.ACH.forEach(a => { if (p.ach[a.k]) add(a.fx); });
  cache = o; cacheV = PV; return o;
};
M.furnLv = (k) => prof().furn[k] || 0;
// base-wide perks flow through the existing base modifier channel
const oBM = M.baseMods;
M.baseMods = function (m, raw) { const o = oBM.call(this, m, raw), P = M.perks(); ['lootSup', 'supplyDaily', 'newHeroLv', 'vision', 'tower', 'startMult', 'buildDays', 'defDmg', 'bank', 'deathShards', 'portalHp'].forEach(k => { if (P[k]) o[k] = (o[k] || 0) + P[k]; }); if (m && m.moon === 'blood') o.lootSup = (o.lootSup || 0) + 0.2; return o; };
const oHR = M.hospitalRate; M.hospitalRate = function (m) { return oHR.call(this, m) * (1 + (M.perks().healMul || 0)); };
// raid interval is a per-game setting now
M.nextRaid = (m) => { const E = M.RAID_EVERY; return Math.ceil((m.day + 0.001) / E) * E; };
const syncRaid = (m) => { M.RAID_EVERY = (m && m.raidEvery) || 5; };
const oBO = M.buildOptions;
M.buildOptions = function (m, c, r) { const k = 1 + (M.perks().buildCost || 0); return oBO.call(this, m, c, r).map(o => { if (k === 1) return o; const cost = Math.round(o.cost * k), pw = M.power(m); let why = ''; if (m.supplies < cost) why = '物资不足'; else if (o.pw < 0 && pw.free + o.pw < 0) why = '电力不足'; return Object.assign(o, { cost, why }); }).sort((a, b) => (a.why ? 1 : 0) - (b.why ? 1 : 0) || b.B.q - a.B.q); };
const oSD = M.startDig;
M.startDig = function (m, c, r) { const ok = oSD.call(this, m, c, r); if (ok && M.perks().digInstant) { const x = M.cell(m, c, r); x.dug = true; x.job = null; } return ok; };

// ═════════════════════ a new game (投币) ═════════════════════
M.KITS = [
  { k: 'build', n: '建筑师卡带', d: '开局多 3 张建筑图纸（至少 1 张奇观）', ic: 'scroll' },
  { k: 'arms', n: '军火卡带', d: '开局多 3 张宝物图纸和 1 件「稀有」宝物', ic: 'gem' },
  { k: 'soul', n: '招魂卡带', d: '开局多 150 灵魂碎片，领袖上限 +1', ic: 't_shard' },
  { k: 'dig', n: '工兵卡带', d: '开局已挖通 3 个房间，物资 +100', ic: 'u_pick' }];
const wonderBp = (qMin) => { const ks = Object.keys(M.BUILDINGS).filter(k => !M.BUILDINGS[k].fixed && !M.BUILDINGS[k].boss && !M.BUILDINGS[k].gone && M.BUILDINGS[k].q >= (qMin || 1)); return 'bbp:' + M.pick(ks); };
G.newGame = function (kits) {
  const P = M.perks(), p = this.prof, keepTut = this.meta && this.meta.tutDone;
  const m = this.meta = M.defaultMeta3(); m.tutDone = !!keepTut; m.baseTut = keepTut ? 99 : 0;
  m.st = {}; m.gameNo = (p.stats.games || 0) + 1; m.raidEvery = P.raidEvery || 5; m.drinkUntil = P.drinkDays || 0; m.catSaves = P.catSaves || 0;
  m.hard = !!(P.hard && p.hard); m.moon = P.moon ? M.pick(['full', 'new', 'blood']) : null;
  m.supplies += (P.startSup || 0);
  if (p.carry) { m.supplies += p.carry.sup || 0; m.shards += p.carry.sh || 0; if (p.carry.relic) m.relics.push(p.carry.relic); }
  p.carry = null;
  for (let i = 0; i < (P.startBpQ || 0); i++) M.invAdd(m, wonderBp(1), 1);
  if (P.startWonder) M.invAdd(m, wonderBp(2), 1);
  // tiles found in the rock before the first dig
  const rock = []; for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const x = m.base.cells[r][c]; if (!x.dug && !x.tile && r <= 2) rock.push([c, r]); }
  rock.sort(() => rnd() - 0.5).slice(0, P.startTiles || 0).forEach(([c, r]) => m.base.cells[r][c].tile = M.rollTile ? M.rollTile(r) : M.pick(Object.keys(M.TILES)));
  if (P.coreLey) { const x = M.cell(m, M.CORE.c, M.CORE.r + 1); if (x && !x.dug) x.tile = 'ley'; }
  const h = m.heroes[0]; for (let i = 0; i < (P.startHeroLv || 0); i++) { h.lv++; h.points++; } h.hp = M.heroMaxHp(h, m);
  (kits || []).forEach(k => {
    if (k === 'build') { M.invAdd(m, wonderBp(1), 1); M.invAdd(m, M.dropBp(0.5).replace(/^rbp:.*/, wonderBp(1)), 1); M.invAdd(m, wonderBp(1), 1); }
    if (k === 'arms') { const rs = M.relicPool(); for (let i = 0; i < 3; i++) M.invAdd(m, 'rbp:' + M.pick(rs), 1); if (M.craftRelic3) { const r = M.craftRelic3(m, M.pick(rs), { qUp: 1 }); if (r && !m.relics.includes(r)) m.relics.push(r); } }
    if (k === 'soul') { m.shards += 150; m.heroCapBonus = 1; }
    if (k === 'dig') { m.supplies += 100; let n = 0; for (const [dc, dr] of [[-1, 0], [1, 0], [0, 1], [-2, 0], [2, 0]]) { const x = M.cell(m, M.CORE.c + dc, M.CORE.r + dr); if (x && !x.dug && n < 3) { x.dug = true; n++; } } }
  });
  m.kits = kits || [];
  syncRaid(m); p.active = true; this.saveProfile(); this.save();
};
const oHC = M.heroCap; M.heroCap = (m) => oHC(m) + (m && m.heroCapBonus || 0);
const oStart = G.startGame;
G.startGame = function (kits) { if (!this.prof.active) this.newGame(kits); syncRaid(this.meta); if (this.meta.core == null) this.meta.core = 3; this.meta.st = this.meta.st || {}; return oStart.call(this); };

// ═════════════════════ every expedition: drinks, radio, moon, hard mode ═════════════════════
const oNR = M.newRun3;
M.newRun3 = function (meta, hero, worldKey, relicIds) {
  const run = oNR.apply(this, arguments), P = M.perks(); if (run.region.tut) return run;
  if (meta.drinkUntil && meta.day <= meta.drinkUntil) { run.runBuff.unitAtk = (run.runBuff.unitAtk || 0) + (P.drinkAtk || 0); run.runBuff.heroAtk = (run.runBuff.heroAtk || 0) + (P.drinkAtk || 0); run.mods.unitHp = (run.mods.unitHp || 0) + (P.drinkHp || 0); run.drink = true; }
  run.mods.eventLuck = (run.mods.eventLuck || 0) + (P.eventLuck || 0) + (meta.moon === 'full' ? 0.2 : 0);
  run.mods.unitHp = (run.mods.unitHp || 0) + (P.unitHp || 0);
  if (meta.moon === 'new') run.mods.shop = (run.mods.shop || 0) - 0.15;
  if (P.runBanner) { const ks = Object.keys(M.LEGION).filter(k => M.LEGION[k].q <= 1); run.legion[M.pick(ks)] = true; }
  run.hard = !!meta.hard; run.blood = meta.moon === 'blood';
  // the cat always turns up; more events if the adventurer achievement is earned
  const nodes = run.map && run.map.nodes; if (nodes) {
    if (P.eventRate) nodes.forEach(n => { if (n.type === 'normal' && n.col >= 2 && rnd() < P.eventRate) { n.type = 'event'; n.ev = M.pick(Object.keys(M.MINI).filter(k => M.EVENTS[k])); } });
    if (P.catEvent && !nodes.some(n => n.ev === 'cat')) { const c = nodes.filter(n => (n.type === 'normal' || n.type === 'event') && n.col >= 2); if (c.length) { const n = M.pick(c); n.type = 'event'; n.ev = 'cat'; } }
  }
  return run;
};
const B3P = M.Battle3.prototype, oInit = B3P.init;
B3P.init = function (run, cfg) { oInit.call(this, run, cfg); if (run.hard) this.ek *= 1.4; if (run.blood) this.ek *= 1.2; };

// ═════════════════════ blueprints: bosses always pay, everything else a little more often ═════════════════════
const oSettle = G.startSettle;
G.startSettle = function () {
  const n0 = this.run ? this.run.loot.bp.length : 0;
  oSettle.call(this); const st = this.settle, run = this.run, n = this.node, P = M.perks(); if (!st || !st.good || run.tut) return;
  
  const m = this.meta; m.st = m.st || {}; this.prof.stats.battles = (this.prof.stats.battles || 0) + 1;
  if (n.type === 'boss') m.st.boss = (m.st.boss || 0) + 1; if (n.type === 'elite') m.st.elite = (m.st.elite || 0) + 1;
  const has = (pre) => run.loot.bp.slice(n0).filter(k => !k.startsWith('tile:') && (!pre || k.startsWith(pre))).length;
  const drop = (k) => { this.hold('rbp', run.loot.bp.length); run.loot.bp.push(k); const I = M.itemInfo(k); st.tiles.push({ icon: I.icon, v: 1, c: I.c, to: 'rbp', n: I.n, key: k }); };
  const style = run.theme && run.theme.style, dbl = (run.blood ? 2 : 1) * (1 + (M.baseMods(m).bpLuck || 0));
  const bbp = (bias, qUp) => { let k = M.dropBp(bias, style, qUp); for (let i = 0; i < 6 && !k.startsWith('bbp:'); i++) k = M.dropBp(bias, style, qUp); return k.startsWith('bbp:') ? k : wonderBp(0); };
  // fixed: clearing the world (its final boss) pays one random building blueprint (user ruling 2026-09-25)
  if (n.type === 'boss' && (n.fb || n.final)) drop(M.oneBldBp(style));   // every area's final boss (mc-scenes.js)
  for (let i = 0; i < (P.bossBp || 0) && n.type === 'boss'; i++) drop(bbp(1, 1));
  this.achCheck();
};
// chests: a better chance of a blueprint
const oChest = G.openChest;
G.openChest = function (items, col, done) {
  const run = this.run, P = M.perks();
  if (run && !run.tut && P.chestBp && !items.some(it => it.award && it.award.k === 'bp') && rnd() < M.bpChance(run, 'chest')) { const b = M.dropBp(0.4, run.theme && run.theme.style), I = M.itemInfo(b); items.push({ n: I.n, sub: I.kind, c: I.c, img: M.spriteCanvas(I.icon, 12), award: { k: 'bp', key: b } }); }
  return oChest.call(this, items, col, done);
};
// claw machine: grip bonus and a lifetime counter
if (M.MINI && M.MINI.claw) { const D = M.MINI.claw, oDrop = D.drop, oTick = D.tick;
  D.drop = function (mg) { oDrop.call(this, mg); const b = M.perks().clawBonus || 0; if (b && mg.phase === 'down' && !mg.succ && mg.tgt >= 0 && rnd() < b) mg.succ = true; };
  D.tick = function (mg, dt) { const before = mg.got.length; oTick.call(this, mg, dt); if (mg.got.length > before) { this.prof.stats.claws = (this.prof.stats.claws || 0) + 1; this.saveProfile(); } }; }
// recruiting: cost and minimum rarity from perks
const oRec = G.recruit;
G.recruit = function () {
  // recruiting costs supplies (soul shards are the high-end material now)
  const P = M.perks(), m = this.meta, cost = M.recruitCost ? M.recruitCost(m) : 120; this._recN0 = m.heroes.length;
  if (m.heroes.length >= M.heroCap(m)) { this.deny('领袖已满（上限 ' + M.heroCap(m) + '）', '#d0453c'); return; }
  if (m.supplies < cost) { this.deny('物资不足：招募要 ' + cost + ' 物资', '#d0453c'); return; }
  this.hold('msup', m.supplies); m.supplies -= cost; this.release('msup');
  let rar = M.RARITY.indexOf(M.wpick(M.RARITY, r => r.w)); if (M.hasBuilt(m, B => B.recruit && B.recruit.qUp) || P.recruitMinRar) rar = Math.max(1, rar); rar = Math.max(rar, M.baseMods(m).recruitMin || 0);
  // the leader exists at once (saved), then the card plays: charge, shatter, the true face flies to the leader bar (mc-recruit.js)
  const h = M.newHero(m, null, rar); m.heroes.push(h); this.save(); this.panel = null; if (this.bv) this.bv.home();
  this.recruitCard(h, rar); this.afterRecruit();
};
G.afterRecruit = function () { const m = this.meta, n0 = this._recN0 != null ? this._recN0 : m.heroes.length; this._recN0 = null; setTimeout(() => { m.st = m.st || {}; if (m.heroes.length > n0) m.st.recruits = (m.st.recruits || 0) + (m.heroes.length - n0); this.achCheck(); }, 5000); };
// built counter: count finished buildings on each new day
const oAdv = M.advanceDay; M.advanceDay = function (m) { const logs = oAdv.call(this, m); m.st = m.st || {}; logs.forEach(l => { if (l.key) m.st.built = (m.st.built || 0) + 1; }); return logs; };
const oMF = G.miniFinish; G.miniFinish = function () { const m = this.meta; m.st = m.st || {}; m.st.minis = (m.st.minis || 0) + 1; return oMF.apply(this, arguments); };

// ═════════════════════ the base core: 3 lives for the whole game ═════════════════════
const oFail = G.runFail;
G.runFail = function () {
  const m = this.meta, run = this.run, h = run.hero;
  if ((m.catSaves || 0) > 0 && !run.tut) {
    // the black cat drags the leader home: the expedition is lost, the leader is not
    m.catSaves--; const mx = M.heroMaxHp(h, m); h.hp = Math.max(1, Math.round(mx * 0.1)); h.relics = []; m.runs++; this.pendingDay = true; this.save(); M.Sfx.lose();
    this.endInfo = { title: '黑猫叼回了领袖', color: '#c890ff', sub: h.name + ' 倒下的时候，一只黑猫把他拖回了传送门。本局收获全部丢失，但他还活着。（本局还剩 ' + m.catSaves + ' 次）', tiles: [], lines: [{ k: '基地核心', v: '未受损 · ' + m.core + ' / 3', c: '#ff8ab0' }], at: now(), gain: {} };
    return this.go('end');
  }
  const P = M.perks(); let invested = h.exp; for (let l = 1; l < h.lv; l++) invested += M.expNeed(l);
  oFail.call(this);
  const extraOrbs = Math.round(invested * 0.4 * (P.deathOrbsX || 0)); if (extraOrbs) { m.orbs += extraOrbs; if (this.endInfo && this.endInfo.gain) this.endInfo.gain.morb = (this.endInfo.gain.morb || 0) + extraOrbs; }
  if (m.core == null) m.core = 3; m.core = Math.max(0, m.core - 1); m.st.deaths = (m.st.deaths || 0) + 1;
  if (this.endInfo) { this.endInfo.coreHit = true; this.endInfo.lines = (this.endInfo.lines || []).concat([{ k: '基地核心', v: m.core + ' / 3' + (m.core <= 0 ? ' · 即将爆炸' : ''), c: m.core <= 1 ? '#ff4a4a' : '#ff8ab0' }]); }
  this.save();
};
const oWin = G.runWin;
G.runWin = function (kind) {
  const m = this.meta, run = this.run, L = run && run.loot, bps = L ? L.bp.length : 0, sup = L ? L.supplies : 0;
  oWin.call(this, kind); m.st = m.st || {};
  if (!run.region.tut) { m.st.bp = (m.st.bp || 0) + bps; m.st.bestHaul = Math.max(m.st.bestHaul || 0, sup); if (kind === 'extract') m.st.extract = (m.st.extract || 0) + 1; }
  if (kind === 'clear' && !run.region.tut) { m.st.clears = (m.st.clears || 0) + 1; this.prof.stats.clears = (this.prof.stats.clears || 0) + 1; const before = m.core == null ? 3 : m.core; m.core = Math.min(3, before + 1); if (this.endInfo && m.core > before) { this.endInfo.coreHeal = true; this.endInfo.lines = (this.endInfo.lines || []).concat([{ k: '基地核心', v: '恢复 1 点 · ' + m.core + ' / 3', c: '#9cff7a' }]); } }
  this.save(); this.achCheck();
};
const oRaidEnd = G.raidEnd;
G.raidEnd = function () { const r = this.raid, m = this.meta; if (r && r.over === 'win') { m.st = m.st || {}; m.st.raidsWon = (m.st.raidsWon || 0) + 1; } const res = oRaidEnd.call(this); if (r && r.over === 'win') setTimeout(() => this.achCheck(), 2600); return res; };

// ═════════════════════ achievements ═════════════════════
G.achCheck = function () {
  const p = this.prof, m = this.meta; if (!p.achOn || !m) return []; m.st = m.st || {}; const got = [];
  M.ACH.forEach(a => { if (!p.ach[a.k] && a.ok(m, p)) { p.ach[a.k] = { day: m.day, game: m.gameNo || 0 }; got.push(a); } });
  if (got.length) { this.saveProfile(); got.forEach((a, i) => setTimeout(() => { this.banner({ kind: 'win', text: '成就：' + a.n, col: '#ffe08a', col2: '#6a4a10', sub: '解锁：' + a.r, life: 2.6, y: 360 }); M.Sfx.fanfare(); this.fx.confetti(80); }, 400 + i * 2800)); }
  return got;
};

// ═════════════════════ game over → tokens ═════════════════════
M.settleRows = function (m) {
  const st = m.st || {}, rows = [
    { k: 'coin', n: '投币参与', ic: 'e_coin', v: 1, per: 20 },
    { k: 'day', n: '存活天数', ic: 'u_star', v: m.day, per: 5 },
    { k: 'clears', n: '通关世界', ic: 'r_hero', v: Object.keys(m.cleared).length, per: 40 },
    { k: 'boss', n: '击败首领', ic: 'r_demon', v: st.boss || 0, per: 15 },
    { k: 'elite', n: '击败精英', ic: 't_claw', v: st.elite || 0, per: 6 },
    { k: 'raids', n: '守住混沌来袭', ic: 'f_defense', v: st.raidsWon || 0, per: 12 },
    { k: 'built', n: '建成建筑', ic: 'u_hammer', v: st.built || 0, per: 5 },
    { k: 'bp', n: '带回图纸', ic: 'scroll', v: st.bp || 0, per: 4 },
    { k: 'minis', n: '完成奇遇', ic: 'e_card', v: st.minis || 0, per: 2 },
    { k: 'recruits', n: '招募领袖', ic: 'e_flag', v: st.recruits || 0, per: 4 }];
  rows.forEach(r => r.t = r.v * r.per);
  let mul = 1; if (m.hard) mul *= 1.6; if (m.moon === 'blood') mul *= 1.3;
  const sum = rows.reduce((a, r) => a + r.t, 0), total = Math.round(sum * mul);
  return { rows, sum, mul, total };
};
G.gameOver = function (reason) {
  if (this._over) return; this._over = true;
  const m = this.meta, p = this.prof, P = M.perks(); m.st = m.st || {};
  const newAch = M.META_ROOM ? this.achCheck() : [];
  const S0 = M.settleRows(m); S0.day = m.day; S0.clears = Object.keys(m.cleared || {}).length;
  // piggy bank: part of this game's stock walks out with you
  const best = m.relics.slice().sort((a, b) => (b.q || 0) - (a.q || 0))[0];
  p.carry = (P.carrySup || P.carrySh) ? { sup: Math.round(m.supplies * (P.carrySup || 0)), sh: Math.round(m.shards * (P.carrySh || 0)), relic: P.carryRelic && best ? best : null } : null;
  p.tokens += S0.total; p.stats.tokensAll = (p.stats.tokensAll || 0) + S0.total; p.stats.games = (p.stats.games || 0) + 1; p.stats.bestDay = Math.max(p.stats.bestDay || 0, m.day);
  p.hist.unshift({ day: m.day, reason, tokens: S0.total, clears: Object.keys(m.cleared).length, at: Date.now() }); p.hist = p.hist.slice(0, 8);
  p.pending = Object.assign({ reason, day: m.day, ach: newAch.map(a => a.k), carry: p.carry, moon: m.moon, hard: m.hard }, S0);
  p.active = false; this.saveProfile();
  // the next coin starts a fresh game (tutorial stays done)
  const tut = m.tutDone; this.meta = M.resetMeta3(); this.meta.tutDone = tut; this.meta.baseTut = tut ? 99 : 0; this.save();
  this.run = null; this.battle = null; this.raid = null; this.modal = null; this.panel = null; this.tear = null; this.coreFx = null;
  setTimeout(() => { this._over = false; }, 500);
  if (M.META_ROOM && this.toRoom) { this.toRoom({ settle: true }); return; }
  // no room: back to the title menu with the game's summary
  this.go('menu');
  const why = reason === 'core' ? '基地核心碎了' : reason === 'portal' ? '主基地被攻破了' : '这一局结束了';
  this.modal = { over: 1, title: '这一局结束了', text: why + '。\n坚持到第 ' + S0.day + ' 天，通关 ' + S0.clears + ' 个世界。', border: '#d0453c', img: 'skull', back: () => { this.modal = null; }, choices: [{ t: '重新开始', fn: () => { this.modal = null; this.startGame(); } }, { t: '回到标题', fn: () => { this.modal = null; } }] }; this.bump();
};
// the portal collapsing is also the end of the game
const oGo = G.go;
G.go = function (s) { if (s === 'over') return this.gameOver('portal'); if (s === 'menu' && M.META_ROOM && this.toRoom && !this._goingRoom) return this.toRoom({}); return oGo.call(this, s); };
M.syncRaid = syncRaid;
const oTick = G.tick;
G.tick = function (dt) { if (!this._metaInit) { this._metaInit = 1; syncRaid(this.meta); if (this.meta && this.meta.core == null) this.meta.core = 3; } return oTick.call(this, dt); };
})();

;
