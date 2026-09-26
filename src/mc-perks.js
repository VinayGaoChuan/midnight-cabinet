// ==== mc-perks.js ====
(function () {
// 繁荣度 perks (user ruling 2026-09-26: 「把地形效果都去掉吧。但是加一个繁荣度升级3选1，内容是某类型或者某风格的建筑，进行什么
// 强化，注意还是一句话描述。这样，风格和功能，就能build起来了，玩家也不用地格了」).
// Every 繁荣度 level (the ring opening plays first) offers three strengthenings, one sentence each, one to take:
// · a category: its rooms do half as much again (生产、仓储、信仰、医疗、训练), or a category-wide gift (工坊、防御、侦察、工程);
// · a style: every room of that style adds a little — the more rooms of one style, the more it gives.
// Taken perks stay for the whole game (m.perks). The homecoming waits for the pick. Old saves get the picks their level owes.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, B = M.BUILDINGS, now = () => performance.now();
const SCALE = ['supplyDaily', 'shardDaily', 'faithDaily', 'expDaily', 'heal', 'healAll', 'exp', 'lootSup', 'startMult', 'unitHp', 'unitAtk', 'heroAtk', 'heroHp', 'feverStart', 'feverRate', 'portalHp', 'bpLuck'];
const each = (m, fn) => { if (m && m.base && M.eachBuilt) M.eachBuilt(m, (k) => { if (k !== 'core' && B[k]) fn(B[k], k); }); };
const catBoost = (cat, k) => (o, m) => each(m, (Bd) => { if (Bd.cat !== cat || !Bd.fx) return; SCALE.forEach(x => { if (typeof Bd.fx[x] === 'number') o[x] = (o[x] || 0) + Bd.fx[x] * k; }); });
const flat = (fx) => (o) => Object.keys(fx).forEach(x => { o[x] = (o[x] || 0) + fx[x]; });
const perStyle = (st, fx) => (o, m) => { let n = 0; each(m, (Bd) => { if (Bd.style === st) n++; }); if (n) Object.keys(fx).forEach(x => { o[x] = (o[x] || 0) + fx[x] * n; }); };
// k: key · t: the sentence · cat / style: what it strengthens (for the tag colour and the weighting)
const PERKS = M.PERKS = {
  c_power:   { cat: 'power', t: '生产类建筑的产出 +50%。', fn: catBoost('power', 0.5) },
  c_store:   { cat: 'store', t: '仓储类建筑的效果 +50%。', fn: catBoost('store', 0.5) },
  c_forge:   { cat: 'forge', t: '工坊打造宝物的费用 -40%。', fn: flat({ craftCost: -0.4 }) },
  c_faith:   { cat: 'faith', t: '信仰类建筑的产出 +50%。', fn: catBoost('faith', 0.5) },
  c_med:     { cat: 'med', t: '医疗类建筑的回复 +50%。', fn: catBoost('med', 0.5) },
  c_train:   { cat: 'train', t: '训练类建筑的效果 +50%。', fn: catBoost('train', 0.5) },
  c_defense: { cat: 'defense', t: '防御类建筑守城时的伤害 +25%。', fn: flat({ defDmg: 0.25 }) },
  c_scout:   { cat: 'scout', t: '出征视野 +1，精英和首领一开始就能看到。', fn: flat({ vision: 1, seeElite: 1 }) },
  c_eng:     { cat: 'eng', t: '所有建造少花 1 天，挖掘费用 -30%。', fn: flat({ buildDays: -1, digCost: -0.3 }) },
  s_steam:   { style: 'steam', t: '每座蒸汽风格的建筑，每天多产 10 物资。', fn: perStyle('steam', { supplyDaily: 10 }) },
  s_magic:   { style: 'magic', t: '每座魔法风格的建筑，让领袖技能效果 +8%。', fn: perStyle('magic', { skillPow: 0.08 }) },
  s_nature:  { style: 'nature', t: '每座自然风格的建筑，让领袖每天回复 5% 生命。', fn: perStyle('nature', { healAll: 0.05 }) },
  s_water:   { style: 'water', t: '每座水域风格的建筑，让出征带回的物资 +6%。', fn: perStyle('water', { lootSup: 0.06 }) },
  s_fantasy: { style: 'fantasy', t: '每座玄幻风格的建筑，每天多产 1 灵魂碎片。', fn: perStyle('fantasy', { shardDaily: 1 }) },
  s_scifi:   { style: 'scifi', t: '每座科幻风格的建筑，让出征部队攻击 +3%。', fn: perStyle('scifi', { unitAtk: 0.03 }) },
  s_medieval:{ style: 'medieval', t: '每座中世纪风格的建筑，让主基地耐久 +8%。', fn: perStyle('medieval', { portalHp: 0.08 }) },
  s_cartoon: { style: 'cartoon', t: '每座卡通风格的建筑，让 FEVER 槽涨得快 5%。', fn: perStyle('cartoon', { feverRate: 0.05 }) },
};
const oBM = M.baseMods;
M.baseMods = function (m) {
  const o = oBM.apply(this, arguments); if (!m || !Array.isArray(m.perks) || !m.perks.length || M._perkIn) return o;
  M._perkIn = true; try { m.perks.forEach(k => { const P = PERKS[k]; if (P) P.fn(o, m); }); } finally { M._perkIn = false; }
  return o;
};
// 阿蒙森站: every building counts half as much again for 繁荣度
const oPros = M.prosperity;
if (oPros) M.prosperity = function (m) { const p = oPros.apply(this, arguments); return m && M.hasBuilt && M.hasBuilt(m, X => X.fx && X.fx.prosMul) ? Math.round(p * 1.5) : p; };
// how many rooms of a category / style stand (for the weighting and the tip)
const count = (m, P) => { let n = 0; each(m, (Bd) => { if ((P.cat && Bd.cat === P.cat) || (P.style && Bd.style === P.style)) n++; }); return n; };
M.perkOffer = function (m) {
  const taken = m.perks || [], pool = Object.keys(PERKS).filter(k => !taken.includes(k)), out = [];
  for (let i = 0; i < 3 && pool.length; i++) { const k = M.wpick(pool, x => (count(m, PERKS[x]) > 0 ? 3 : 1)); out.push(k); pool.splice(pool.indexOf(k), 1); }
  return out;
};
// old saves: the picks their level already owes
const owed = (m) => { if (!m) return 0; if (m.perkOwe == null) m.perkOwe = Math.max(0, M.prosLv(m) - 1 - ((m.perks || []).length)); return m.perkOwe; };

// ───────── when: right after a level's ring has opened (the homecoming waits) ─────────
const oES = G.expandStart;
G.expandStart = function (up) { const m = this.meta; owed(m); if (m && up) m.perkOwe = (m.perkOwe || 0) + Math.max(1, (up.to || 0) - (up.from || 0)); return oES.apply(this, arguments); };
const oHS = G.homeStep;
G.homeStep = function () { if (this.perkPick || (this.meta && owed(this.meta) > 0 && !this.expand && this.screen === 'base')) return; return oHS.apply(this, arguments); };
G.perkOpen = function () {
  const m = this.meta, ks = M.perkOffer(m); if (!ks.length) { m.perkOwe = 0; return; }
  this.perkPick = { ks, at: now() }; S.fanfare && S.fanfare();
  const col = (P) => (P.cat ? M.CAT_COL[P.cat] : M.STYLE_COL[P.style]) || '#ffcf4a';
  this.modal = { title: '繁荣度 Lv' + M.prosLv(m), titleColor: '#ffcf4a', text: '选一项强化，整局都有效。', img: 't_pros', border: '#ffcf4a', at: now(), perk: 1,
    choices: ks.map(k => { const P = PERKS[k], n = count(m, P); return { t: P.t, sub: n ? '现在有 ' + n + ' 座' + (P.cat ? M.CAT[P.cat] + '类建筑' : M.STYLE[P.style] + '风格的建筑') : '', gold: true, col: col(P), fn: () => this.perkTake(k) }; }) };
  this.bump();
};
G.perkTake = function (k) {
  const m = this.meta; m.perks = (m.perks || []).concat([k]); m.perkOwe = Math.max(0, (m.perkOwe || 1) - 1); this.modal = null; this.perkPick = null; this.save();
  const P = PERKS[k], p = this.fxPos('pros') || { x: 300, y: 60 }; this.fx.rays && this.fx.rays(p.x, p.y + 30, '#ffcf4a', 1.2, { r: 220 }); this.fx.pop && this.fx.pop(960, 420, P.t, '#ffe08a', 36); this.pulse.pros = now(); S.up && S.up(3);
  this.bump();
};
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), m = this.meta;
  if (m && this.screen === 'base' && !this.perkPick && !this.expand && !this.modal && !this.visit && !this.raid && !this.raidPrep && !this.rite && !this.tear && !this.lvFx && !this.lvPick && owed(m) > 0) this.perkOpen();
  if (this.perkPick && !this.modal) this.perkPick = null;   // a new game or a screen change took the modal away
  return r;
};
// the pick has no way out but choosing
const oBack = G.backAction; if (oBack) G.backAction = function () { if (this.perkPick) return; return oBack.apply(this, arguments); };
const oNG = G.newGame; if (oNG) G.newGame = function () { this.perkPick = null; return oNG.apply(this, arguments); };
// the 繁荣度 tip lists what was taken
const oTip = G.tipFor;
G.tipFor = function (key) {
  const t = oTip.apply(this, arguments), m = this.meta;
  if (key === 'b-pros' && t && m && (m.perks || []).length) t.lines = (t.lines || []).concat(m.perks.filter(k => PERKS[k]).map(k => ({ rich: M.rich ? M.rich(PERKS[k].t, '#e8dcc4', 'bld') : [{ t: PERKS[k].t, c: '#e8dcc4' }] })));
  return t;
};
if (M.GUIDE) M.GUIDE.push({ id: 'perk', cat: '基地', icon: 't_pros', title: '繁荣度强化', line: '繁荣度每升一级，从三项强化里选一项：强化某一类或某种风格的建筑，整局有效。', scr: 'base', sel: '[data-tip="b-pros"]' });
})();
