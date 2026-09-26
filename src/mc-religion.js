// ==== mc-religion.js ====
(function () {
// 宗教 (user ruling 2026-09-26: 「信仰值的设定需要再调整一下，没有人朝着打不过去玩的。我想信仰值可不可是升级宗教的资源，到了
// 数量自动升级宗教，n选1，当前有几个宗教建筑，就能从每个信仰建筑中，随机抽取一个，该宗教的效果，构成n，（具体效果你自己设计），没有
// 品质和等级之分，从池子中全随机」).
// · 信仰值 only grows the religion now: 祈福 and paying the revival with faith are gone (mc-faith.js, mc-revive.js).
// · When the faith reaches what the next level needs (20, 30, 40 … +10 a level) the religion rises by itself: back at
//   the base, one card per standing 信仰 building, each a doctrine drawn at random from that building's own pool; pick
//   one. What is left over stays for the next level. Doctrines have no quality and no levels; the same one may come
//   again and adds up. No 信仰 building standing: the level waits.
// · Each building's pool has its own leaning (冥想室 the leader, 阿尔忒弥斯神庙 the hunt, 吴哥窟 plenty, 圣索菲亚大教堂
//   light and shields, 布达拉宫 the wall, 泰姬陵 souls, the three boss buildings their own).
// · base: keys of the base modifiers (daily output, leader, army, FEVER …); run: keys of an expedition's modifiers
//   (vocations, shields, shops …), added when an expedition sets out.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, B = M.BUILDINGS, Q = M.QUALITY, now = () => performance.now();
const FC = '#ffe6a0';
const E = (t, base, run) => ({ t, base: base || null, run: run || null });
const DOC = M.REL_DOCTRINES = {
  meditation: [E('领袖技能效果 +15%。', { skillPow: 0.15 }), E('领袖每天获得 25 经验。', { expDaily: 25 }), E('领袖出征得到的经验 +20%。', { exp: 0.2 }),
    E('出征视野 +1。', { vision: 1 }), E('奇遇出好结果的概率 +15%。', null, { eventLuck: 0.15 }), E('领袖每打完一场仗，回复 5% 生命。', { postHeal: 0.05 })],
  artemis: [E('射手部队攻击 +20%。', null, { rngAtk: 0.2 }), E('刺客部队攻击 +25%。', null, { assAtk: 0.25 }), E('精英战和首领战的积分 +30%。', null, { eliteScore: 0.3 }),
    E('每场战斗初始积分倍率 +0.2。', { startMult: 0.2 }), E('掉图纸的概率 +25%。', null, { bpFind: 0.25 }), E('FEVER 槽涨得快 12%。', { feverRate: 0.12 })],
  angkor: [E('部队生命 +8%。', { unitHp: 0.08 }), E('召唤师部队生命 +25%。', null, { sumHp: 0.25 }), E('出征带回的物资 +15%。', { lootSup: 0.15 }),
    E('基地每天多产 12 物资。', { supplyDaily: 12 }), E('部队里每有一种职业，全体部队生命 +1.5%。', null, { diverse: 0.015 }), E('卖部队的商店多摆 1 支部队。', null, { shopUnits: 1 })],
  hagia: [E('部队每场开局获得 8% 生命的护盾。', null, { shield: 0.08 }), E('牧师和圣骑士部队生命 +25%。', null, { cleHp: 0.25, palHp: 0.25 }), E('医院每天给领袖多回复 10% 生命。', { heal: 0.1 }),
    E('领袖生命 +15%。', { heroHp: 0.15 }), E('主基地耐久 +12%。', { portalHp: 0.12 }), E('FEVER 转出好效果的概率 +10%。', null, { tier: 0.1 })],
  potala: [E('先锋和守护者部队生命 +20%。', null, { vanHp: 0.2, guaHp: 0.2 }), E('混沌来袭时，基地武器的伤害 +15%。', { defDmg: 0.15 }), E('坚守战的时间 -15%。', null, { hold: -0.15 }),
    E('领袖攻击 +15%。', { heroAtk: 0.15 }), E('基地每天多产 2 灵魂碎片。', { shardDaily: 2 }), E('建造的工期少 1 天（至少 1 天）。', { buildDays: -1 })],
  taj: [E('基地每天多产 3 灵魂碎片。', { shardDaily: 3 }), E('部队攻击 +6%。', { unitAtk: 0.06 }), E('每场战斗开局，FEVER 槽已经有 15%。', { feverStart: 0.15 }),
    E('挖掘的费用 -25%。', { digCost: -0.25 }), E('打造宝物的费用 -25%。', { craftCost: -0.25 }), E('每天多产 3 信仰值。', { faithDaily: 3 })],
  bb_grave: [E('部队攻击 +8%。', { unitAtk: 0.08 }), E('战士部队攻击 +25%。', null, { warAtk: 0.25 }), E('法师部队攻击 +25%。', null, { magAtk: 0.25 }),
    E('部队生命 +6%。', { unitHp: 0.06 }), E('每天多产 3 信仰值。', { faithDaily: 3 }), E('基地每天多产 3 灵魂碎片。', { shardDaily: 3 })],
  bb_queen: [E('每场战斗初始积分倍率 +0.3。', { startMult: 0.3 }), E('FEVER 槽涨得快 15%。', { feverRate: 0.15 }), E('祭司部队攻击和生命 +20%。', null, { priAtk: 0.2, priHp: 0.2 }),
    E('射手部队攻速 +15%。', null, { rngAs: 0.15 }), E('奇遇出好结果的概率 +15%。', null, { eventLuck: 0.15 }), E('每天多产 3 信仰值。', { faithDaily: 3 })],
  bb_ferry: [E('基地每天多产 4 灵魂碎片。', { shardDaily: 4 }), E('商店价格 -10%。', null, { shop: -0.1 }), E('宝箱里的积分 +40%。', null, { chest: 0.4 }),
    E('打仗得到的物资 +25%。', null, { supplies: 0.25 }), E('召唤师部队攻击 +25%。', null, { sumAtk: 0.25 }), E('每天多产 3 信仰值。', { faithDaily: 3 })],
};
M.REL_NEED = (lv) => 20 + 10 * (lv || 0);
const relOf = (m) => { if (!m) return { lv: 0, picks: [] }; if (!m.rel || typeof m.rel !== 'object' || !Array.isArray(m.rel.picks)) m.rel = { lv: 0, picks: [] }; return m.rel; };
M.relOf = relOf;
const docOf = (p) => { const L = p && DOC[p.b]; return L && L[p.e] ? L[p.e] : null; };
M.relDoc = docOf;
// the 信仰 buildings standing now (each is a religion with its own pool)
M.relSources = (m) => { const out = []; if (m && m.base && M.eachBuilt) M.eachBuilt(m, (k) => { if (B[k] && B[k].cat === 'faith' && DOC[k] && !out.includes(k)) out.push(k); }); return out; };
const addM = (o, x) => { if (x) Object.keys(x).forEach(k => { o[k] = (o[k] || 0) + x[k]; }); };
// doctrines taken: base keys into the base modifiers, run keys into every expedition
const oBM = M.baseMods;
M.baseMods = function (m) { const o = oBM.apply(this, arguments); if (m && m.rel && Array.isArray(m.rel.picks)) m.rel.picks.forEach(p => { const d = docOf(p); if (d) addM(o, d.base); }); if (o.digCost) o.digCost = Math.max(-0.8, o.digCost); if (o.craftCost) o.craftCost = Math.max(-0.8, o.craftCost); return o; };
const oNR = M.newRun3;
M.newRun3 = function (meta) { const run = oNR.apply(this, arguments); if (run && meta && meta.rel && !(run.region && run.region.tut)) meta.rel.picks.forEach(p => { const d = docOf(p); if (d && d.run) addM(run.mods, d.run); }); return run; };

// ───────── the level: when the faith is there, at the base, with nothing else playing ─────────
const due = (m) => M.faithOn && M.faithOn(m) && (m.faith || 0) >= M.REL_NEED(relOf(m).lv) && M.relSources(m).length > 0;
G.relOpen = function () {
  const m = this.meta, R = relOf(m), cards = M.relSources(m).map(k => ({ b: k, e: Math.floor(Math.random() * DOC[k].length) }));
  this.relPick = { cards, lv: R.lv + 1, at: now() }; S.fanfare && S.fanfare(); this.bump();
};
G.relTake = function (i) {
  const m = this.meta, P = this.relPick, c = P && P.cards[i]; if (!c || now() - P.at < 500) return;
  const R = relOf(m), need = M.REL_NEED(R.lv);
  this.hold && this.hold('mfa', m.faith || 0); m.faith = Math.max(0, (m.faith || 0) - need); this.release && this.release('mfa');
  R.lv++; R.picks.push({ b: c.b, e: c.e }); this.relPick = null; this.save();
  const d = docOf(c), p = this.fxPos && this.fxPos('mfa');
  if (p && this.fx) { this.fx.burst && this.fx.burst(p.x, p.y, FC, 24); this.fx.pop && this.fx.pop(p.x, p.y + 60, '宗教 Lv' + R.lv, FC, 36); }
  this.pulse.mfa = now(); this.toast && this.toast('教义 · ' + d.t, FC); S.up && S.up(3);
  this.bump();
};
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), m = this.meta;
  if (m && this.screen === 'base' && !this.relPick && !this.dirPick && !this.dirFx && !this.expand && !this.modal && !this.visit && !this.raid && !this.raidPrep && !this.rite && !this.tear && !this.lvFx && !this.lvPick && !this.homeQ && !this.panel && due(m)) this.relOpen();
  if (this.relPick && this.screen !== 'base') this.relPick = null;
  return r;
};
// one pick at a time: the 发展方向 pick waits while the religion's is up (and the religion waits for it, above)
const oDO = G.dirOpen; if (oDO) G.dirOpen = function () { if (this.relPick) return; return oDO.apply(this, arguments); };
const oBack = G.backAction; if (oBack) G.backAction = function () { if (this.relPick) return; return oBack.apply(this, arguments); };
const oBusy = G.baseBusy; if (oBusy) G.baseBusy = function () { return !!this.relPick || oBusy.apply(this, arguments); };
const oGB = G.guideBusy; if (oGB) G.guideBusy = function () { return !!this.relPick || oGB.apply(this, arguments); };
const oNG = G.newGame; if (oNG) G.newGame = function () { this.relPick = null; return oNG.apply(this, arguments); };

// ───────── the view: the cards; the bar shows how far the next level is ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta, P = this.relPick;
  if (v.b && v.b.res && m && M.faithOn && M.faithOn(m)) { const r = v.b.res.find(x => x.fx === 'mfa'); if (r) { r.hasSub = true; r.sub = '/' + M.REL_NEED(relOf(m).lv); } }
  v.relOn = !!P && this.screen === 'base';
  if (v.relOn) {
    const ready = now() - P.at > 500;
    v.rp = { title: '宗教 Lv' + P.lv, line: '选一条教义', cards: P.cards.map((c, i) => { const Bd = B[c.b], d = docOf(c);
      return { img: M.roomThumb ? M.roomThumb(c.b) : '', n: Bd.n, c: (Q[Bd.q] || Q[0]).c, t: d ? d.t : '', op: ready ? 1 : 0.6, onPick: () => this.relTake(i) }; }) };
  }
  return v;
};
// the faith tip: the religion's level, how far the next one is, and every doctrine taken
const oTip = G.tipFor;
G.tipFor = function (key) {
  const t = oTip.apply(this, arguments), m = this.meta;
  if (key === 'rel-faith' && m) { const R = relOf(m); return { title: '信仰值 · 宗教 Lv' + R.lv, c: FC, d: '攒够 ' + M.REL_NEED(R.lv) + ' 宗教自动升级，每座信仰建筑给出一条教义，选一条。', lines: R.picks.map(p => { const d = docOf(p); return d ? { rich: [{ t: B[p.b].n + '　', c: FC }, { t: d.t, c: '#e8dcc4' }] } : null; }).filter(Boolean) }; }
  return t;
};
if (M.GUIDE) M.GUIDE.push({ id: 'religion', cat: '基地', icon: 'f_faith', title: '宗教', line: '信仰值攒够，宗教自动升一级：每座信仰建筑给出一条教义，选一条。', scr: 'base', sel: '[data-fx="mfa"]', when: (g) => M.faithOn && M.faithOn(g.meta) });
})();

;
