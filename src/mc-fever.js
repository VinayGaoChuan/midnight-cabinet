// ==== mc-fever.js ====
(function () {
// FEVER (user ruling 2026-09-26: 「局内的build，集中在部队上。不要战旗和道具了。根据战场的表现，自动触发fever，fever的效果就是现在
// 道具的效果，这样即保留了爽，也解决了玩家不舍得用的问题。而且fever，还有一种街机感，所以要做伟大的fever效果」「合理的前后排
// 搭配，不同职业组合对fever的难易程度，这些build差不多了，先不要战旗了」).
// · A fight fills a FEVER gauge by how the army fights: every hit (archers more, mages a little per target), crits,
//   the front line taking blows, kills (assassins and merchants more, elites much more), heals, summons, priests' auras.
//   More vocations fill it faster (up to +35%); an army with both a front and a back line +15%, one without −15%.
// · Full, it goes off by itself, at once (2026-09-26: no slam, no reel, the fight never stops): the unit that filled it
//   flares and 「FEVER!」 with the effect's name rises over it; one of the five effects (闪电风暴 · 回魂烛 · 旧相框 ·
//   摄魂铃 · 战吼号角) plays over the running fight, picked by the fight's state (a hurt army leans to 回魂烛, a crowd of
//   enemies to 摄魂铃, a thin army to 旧相框), its tier rolled on the six qualities. At the same time 8 s of FEVER TIME:
//   the army attacks 30% faster in a golden glow. The gauge refills for the next one.
// · Items and banners are gone: shops sell units, what gave an item gives points, what added item slots feeds FEVER.
const M = window.MC, G = M.Game.prototype, BP = M.Battle3 && M.Battle3.prototype, S = M.Sfx, U = M.UI, P = M.PJ.PAL, DB = M.DB, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v)), eo = (q) => 1 - Math.pow(1 - q, 3), eback = (q) => { const c = 1.7; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
const RM = () => !!(M.PJ && M.PJ.reduced);
const FEVER_T = 8, RAIN = [P.red, P.gold, P.lime, P.teal, P.violet], WORD = ['F', 'E', 'V', 'E', 'R'];
M.FEVER = { T: FEVER_T, AS: 0.3,
  // what fills the gauge (points out of 100, before the army's rate)
  G: { hit: 0.9, archer: 1.1, mage: 0.55, crit: 1, front: 0.5, kill: 6, assassin: 4, merchant: 3, elite: 10, heal: 8, summon: 3, aura: 0.8, boss: 150 } };
const GN = M.FEVER.G;
const isFront = (e) => !!(e && e.d && M.isDefVoc && M.isDefVoc(e.d.voc));

// ───────── the gauge ─────────
if (BP) {
  const oInit = BP.init;
  BP.init = function (run) {
    const r = oInit.apply(this, arguments);
    const m = run && run.M, bm = m ? M.baseMods(m) : {}, md = (run && run.mods) || {}, roster = (run && run.roster) || [];
    const vocs = new Set(roster.map(u => DB[u.type] && DB[u.type].voc).filter(Boolean)), front = roster.some(u => DB[u.type] && M.isDefVoc(DB[u.type].voc)), back = roster.some(u => DB[u.type] && !M.isDefVoc(DB[u.type].voc));
    const mix = Math.min(0.35, 0.07 * Math.max(0, vocs.size - 1)), form = front && back ? 0.15 : -0.15;
    this.fever = { v: Math.min(90, 100 * ((md.feverStart || 0) + (bm.feverStart || 0) + ((run && run.feverNext) || 0))), rate: Math.max(0.3, 1 + (md.feverRate || 0) + (bm.feverRate || 0) + mix + form),
      mix, vocN: vocs.size, form: front && back, n: 0, q0: Math.max(md.feverQ || 0, bm.feverQ || 0), on: null, pending: false };
    return r;
  };
  // who: the unit whose action this was (the one that fills the gauge is named when FEVER goes off)
  const feed = (b, v, who) => { const F = b.fever; if (!F || F.on || F.pending || b.over || !(v > 0)) return; F.v = Math.min(100, F.v + v * F.rate); if (F.v >= 100 && who && who.side === 'A') F.who = who; };
  M.feverFeed = feed;
  const oDeal = BP.deal;
  BP.deal = function (src, tg, amt, o) {
    const r = oDeal.apply(this, arguments);
    if (this.fever && src && tg && src !== tg && amt > 0) {
      if (src.side === 'A' && !src.isHero) { const v = src.d && src.d.voc; feed(this, (v === '射手' ? GN.archer : v === '法师' ? GN.mage : GN.hit) + (o && o.crit ? GN.crit : 0), src); }
      if (src.side === 'A' && tg.boss && tg.maxHp) feed(this, GN.boss * amt / tg.maxHp, src);   // a boss alone gives no kills: its life is the fuel
      if (tg.side === 'A' && isFront(tg)) feed(this, GN.front, tg);   // the front line holding
    }
    return r;
  };
  const oKill = BP.kill;
  BP.kill = function (e, src) {
    const was = e && e.alive, r = oKill.apply(this, arguments);
    if (was && e && !e.alive && e.side === 'E' && this.fever) { const v = src && src.d && src.d.voc; feed(this, GN.kill + (v === '刺客' ? GN.assassin : 0) + (v === '商人' ? GN.merchant : 0) + (e.elite ? GN.elite : 0), src); }
    return r;
  };
  const oHeal = BP.heal;
  BP.heal = function (o, amt) { const h0 = o && o.hp, r = oHeal.apply(this, arguments); if (this.fever && o && o.side === 'A' && o.hp > h0) feed(this, GN.heal * (o.hp - h0) / (o.maxHp || 1), o); return r; };
  const oSum = BP.summon;
  BP.summon = function (key, side) { const e = oSum.apply(this, arguments); if (e && side === 'A' && this.fever) feed(this, GN.summon, e); return e; };
  const oStep = BP.step;
  BP.step = function (dt) {
    const r = oStep.apply(this, arguments), F = this.fever; if (!F) return r;
    // priests' auras warm the army
    let pr = 0; for (const e of this.ents) if (e.alive && e.side === 'A' && e.d && e.d.voc === '祭司') pr++; if (pr) feed(this, GN.aura * pr * (dt || 0));
    if (!F.on && !F.pending && F.v >= 100 && !this.over && this.t > (this.entryEnd || 0)) { F.pending = true; F.n++; }
    // FEVER TIME: a golden glow on the army, then it ends
    if (F.on) {
      if (this.t >= F.on.until || this.over) { this.ents.forEach(e => { if (e._fv) { e.asB -= M.FEVER.AS; e._fv = false; } }); F.on = null; F.v = 0; }
      else if (this.t - (F.on.sp || 0) > 0.28) { F.on.sp = this.t; const A = this.ents.filter(e => e.alive && e.side === 'A'); const e = A[Math.floor(Math.random() * A.length)]; if (e) this.burst && this.burst(e.x, e.y - 40 * (e.sz || 1), '#ffcf4a', 6); }
    }
    return r;
  };
}
// the effect the fight needs most, weighted: a hurt army → 回魂烛, a crowd → 摄魂铃, a thin army → 旧相框
const pickEffect = (b) => {
  const A = b.ents.filter(e => e.alive && e.side === 'A' && !e.isHero), E = b.ents.filter(e => b.active(e) && e.side === 'E');
  const hp = A.reduce((s, e) => s + e.hp, 0) / Math.max(1, A.reduce((s, e) => s + e.maxHp, 0));
  const w = { bolt: 3, heal: hp < 0.55 ? 5 : 0.6, frame: A.length < 3 ? 4 : 1, bell: E.length >= 6 ? 3 : 1, horn: 1.4 };
  return M.wpick(Object.keys(w), k => w[k]);
};

// ───────── the show ─────────
// 2026-09-26 (user ruling: 「fever频繁触发，感觉特别烦，每次都要等动画，把fever的滚轮去掉，fever直接播放，战斗也不暂停了，效果同时
// 触发，触发的明显点就行，让玩家知道这个效果谁触发的就行」): full, it goes off at once — no slam, no reel, the fight runs on.
// The unit that filled it flares and says 「FEVER!」 with the effect's name; the effect (mc-feverstage.js) and FEVER TIME
// start together.
G.feverGo = function (b) {
  const F = b.fever; F.pending = false; F.v = 0;
  const key = pickEffect(b), tier = Math.max(F.n === 1 ? F.q0 : 0, M.rollTier2(this.run, 0)), who = F.who && F.who.alive ? F.who : null; F.who = null;
  this.feverFx = { t0: now(), key, tier, b, who, quick: 1, rolled: true, seed: Math.random() * 100 };
  S.fanfare && S.fanfare(); b.flash = 0.35; b.flashCol = '#fff3b0'; this.fx.kick && this.fx.kick(8);
  if (who && b.burst) { b.burst(who.x, who.y - 40 * (who.sz || 1), '#ffcf4a', 24); b.ring && b.ring(who.x, who.y - 30, 10, 220, '#ffcf4a', 10, 0.5); }
  try { M.T && M.T.ev('fever', { n: F.n, key, tier }); } catch (e) {}
  this.feverTimeStart(b);
  if (this.fvStageStart) this.fvStageStart(key, tier, b);
};
G.feverRoll = function () {};   // the reel is gone
// after the show: 8 s of FEVER TIME, its +0.2 flying into the multiplier as two chips
G.feverTimeStart = function (b) {
  const X = this.feverFx, F = b.fever; if (!F) return;
  F.on = { until: b.t + FEVER_T, t0: b.t, sp: 0 };
  b.ents.forEach(e => { if (e.alive && e.side === 'A' && !e._fv) { e.asB += M.FEVER.AS; e._fv = true; } });
  if (X) X.timeAt = now();
};
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), b = this.battle;
  if (this.screen === 'battle' && b && b.fever) {
    if (b.fever.pending && !this.feverFx && !this.reel && !this.settle && !b.over) this.feverGo(b);
    const X = this.feverFx; if (X && !X.rolled && now() >= X.reelAt && !this.reel) this.feverRoll();
    if (X && X.rolled && !this.reel && !b.fever.on && X.timeAt) this.feverFx = null;
  } else if (this.feverFx) this.feverFx = null;
  return r;
};
// the slam slows the fight right down until the reel takes over (the reel slows it by itself, mc-game-m.js)
const oBT = G.battleTick;
// the fight stops from the slam until the effect has played (user ruling 2026-09-27: 「fever触发的时候，战斗停止」)
if (oBT) G.battleTick = function (dt) {
  const X = this.feverFx, b = this.battle;
  // frozen, the fight's own shake and flash would hang on the screen: they fade in real time (2026-09-26: 「屏幕还要震好久，才结算效果」)
  if (X && !X.timeAt && b) { const d = Math.max(0, dt || 0); b.shake = Math.max(0, (b.shake || 0) - d * 90); b.flash = Math.max(0, (b.flash || 0) - d * 3); }
  return oBT.call(this, X && !X.timeAt ? 0 : dt);
};

// drawn on the fx layer, screen space: the marquee, the slam, the FEVER TIME bar
M.drawFever = function (x, g) {
  const b = g.battle, X = g.feverFx, F = b && b.fever; if (!b || !F || (!X && !F.on)) return;
  const T = now() / 1000, t = X ? (now() - X.t0) / 1000 : 9;
  // the marquee: bulbs all round the screen, chasing, in the five colours
  const step = RM() ? 0 : Math.floor(T * 16), per = 48, W = 1920, H = 1080, pts = [];
  for (let s = 24; s < W - 24; s += per) { pts.push([s, 24]); } for (let s = 24; s < H - 24; s += per) pts.push([W - 24, s]); for (let s = W - 24; s > 24; s -= per) pts.push([s, H - 24]); for (let s = H - 24; s > 24; s -= per) pts.push([24, s]);
  const lit = X && !X.rolled ? 1 : 0.8;
  x.save(); pts.forEach(([px, py], i) => { const on = (i + step) % 4 === 0, c = RAIN[(i + Math.floor(step / 4)) % 5]; x.globalAlpha = lit * (on ? 1 : 0.35); U.R(x, px - 9, py - 9, 18, 18, P.ink); U.R(x, px - 6, py - 6, 12, 12, on ? c : P.dusk); if (on) { U.R(x, px - 3, py - 6, 6, 3, P.white); } });
  x.restore();
  // the slam: F · E · V · E · R drop in one by one, then fly up to the top
  if (X && !X.quick && t < 3.2) {
    const up = X.rolled ? cl((now() - X.reelAt) / 350, 0, 1) : 0, cy = 430 - up * 300, size = Math.round(170 - up * 90);
    if (!X.rolled) { x.save(); x.globalAlpha = cl(1 - t / 0.5, 0, 1) * 0.6; U.R(x, 0, 0, W, H, P.white); x.restore(); }
    WORD.forEach((ch, i) => {
      const q = cl((t - 0.08 - i * 0.12) / 0.22, 0, 1); if (q <= 0) return;
      const sc = RM() ? 1 : 2.4 - 1.4 * eback(q), gx = 960 + (i - 2) * size * 0.78, gy = cy - (1 - eo(q)) * 120;
      x.save(); x.translate(gx, gy); x.scale(sc, sc); U.text(x, ch, 0, 0, size, RAIN[i], { num: true, outline: true, u: 5 }); x.restore();
      if (q >= 1 && !X['hit' + i]) { X['hit' + i] = 1; g.fx.kick && g.fx.kick(6 + i * 2); S.tick && S.tick(i * 2); g.fx.rays && g.fx.rays(gx, gy, RAIN[i], 0.5, { r: 160 }); }
    });
    if (t > 0.75 && !X.rolled) U.text(x, '!!', 960 + 2.8 * size * 0.78, cy, size, P.white, { num: true, outline: true, u: 5 });
  }
  // who set it off: 「FEVER!」 and the effect's name over that unit, a gold ring under it (1.6 s)
  if (X && X.quick && t < 1.6) {
    const e = X.who, I = M.ITEMS[X.key], a = cl((1.6 - t) / 0.3, 0, 1), up = eo(cl(t / 0.25, 0, 1));
    const p = e && M.feverBody ? M.feverBody(g, e) : { x: 960, y: 420 };
    x.save(); x.globalAlpha = a; M.glow && M.glow(x, p.x, p.y, 150, P.gold, 0.5);
    U.text(x, 'FEVER!', p.x, p.y - 110 - up * 30, 56, P.gold, { num: true, outline: true, u: 4 });
    U.text(x, (I ? I.name : '') + ' · ' + M.TIERS[X.tier].n, p.x, p.y - 58 - up * 30, 30, M.TIERS[X.tier].c, { outline: true });
    x.restore();
  }
  // FEVER TIME: the word small at the top, a bar that runs out
  if (F.on) {
    const left = cl((F.on.until - b.t) / FEVER_T, 0, 1), pulse = RM() ? 0 : Math.sin(T * 10) * 3;
    WORD.forEach((ch, i) => U.text(x, ch, 960 + (i - 2) * 58, 150 + (i % 2 ? pulse : -pulse), 72, RAIN[(i + Math.floor(T * 6)) % 5], { num: true, outline: true, u: 4 }));
    U.R(x, 960 - 183, 196, 366, 18, P.ink); U.R(x, 960 - 180, 199, 360 * left, 12, RAIN[Math.floor(T * 8) % 5]);
  }
};
const FLP = M.FxLayer.prototype, oD = FLP.draw;
FLP.draw = function (ctx, noClear) { const g = M._g, r = oD.call(this, ctx, noClear); if (g && this === g.fx && g.screen === 'battle' && g.battle && (g.feverFx || (g.battle.fever && g.battle.fever.on))) { ctx.save(); try { ctx.setTransform(1, 0, 0, 1, 0, 0); M.drawFever(ctx, g); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('fever: ' + e.message); g.feverFx = null; } ctx.restore(); } return r; };

// the gauge in the battle bar: five letters light up as it fills; all dance during FEVER TIME
const oView = G.view;
G.view = function () {
  const v = oView.call(this), b = this.battle, F = b && b.fever;
  if (v.h && F) {
    const T = now() / 1000, pct = F.on ? 100 : F.v, on = !!F.on || !!this.feverFx;
    v.h.fvL = WORD.map((ch, i) => { const lit = on || pct >= (i + 1) * 20; return { ch, c: lit ? RAIN[on ? (i + Math.floor(T * 8)) % 5 : i] : '#2b2461', dy: on && !RM() ? Math.round(Math.sin(T * 12 + i) * 6) : 0 }; });
    v.h.fvW = (F.on ? cl((F.on.until - b.t) / FEVER_T, 0, 1) * 100 : pct).toFixed(1) + '%'; v.h.fvC = on ? RAIN[Math.floor(T * 8) % 5] : P.gold;
    v.h.fvTip = this.tipFn({ title: 'FEVER', c: P.gold, d: '部队越打越热，满了自动爆发一次。', lines: [{ t: '职业 ' + F.vocN + ' 种 · 涨得快 ' + Math.round(F.mix * 100) + '%', c: '#e8dcc4' }, { t: F.form ? '有前排也有后排 · 涨得快 15%' : '前排后排不全 · 涨得慢 15%', c: F.form ? '#9cff7a' : '#ff8a6a' }] });
  }
  return v;
};

// ───────── items and banners are gone ─────────
if (M.ITEMS) G.useSlot = function () {};   // Q W E no longer do anything
const oAward = G.award;
G.award = function (list, from) {
  const run = this.run; (list || []).forEach(g => { if (g && (g.k === 'item' || g.k === 'legion') && run) { g.v = Math.round(45 * (1 + (g.q || 0)) * (M.priceMul ? M.priceMul(run) : 1)); g.k = 'wallet'; } });   // a better roll pays more
  return oAward.call(this, list, from);
};
const oChest = G.openChest;
if (oChest) G.openChest = function (items, col, done) {
  const run = this.run; (items || []).forEach(it => { if (it && it.award && (it.award.k === 'item' || it.award.k === 'legion')) { const v = Math.round(45 * (M.priceMul ? M.priceMul(run) : 1)); it.award = { k: 'wallet', v }; it.n = '积分 +' + v; it.sub = '积分'; it.c = '#ffcc33'; it.img = M.spriteCanvas('coin', 12); } });
  return oChest.call(this, items, col, done);
};
const oNR = M.newRun3;
M.newRun3 = function (meta) {
  const run = oNR.apply(this, arguments); run.items = [null, null, null]; run.itemQ = [0, 0, 0]; run.legion = {};
  if (meta && meta.nextFever) { run.feverNext = meta.nextFever; delete meta.nextFever; }
  return run;
};
// what used to add items feeds FEVER
const set = (k, o) => { if (M.BUILDINGS[k]) Object.assign(M.BUILDINGS[k], o); };
set('storage', { fx: { feverStart: 0.15 }, d: '每场战斗开局，FEVER 槽已经有 15%。' });
set('stonehenge', { fx: { vision: 1, feverStart: 0.1 }, d: '出征视野 +1；每场战斗开局，FEVER 槽已经有 10%。' });
set('hagia', { fx: { faithDaily: 3, feverQ: 1 }, d: '每天产出 3 信仰值；每场战斗的第一次 FEVER 至少转出「稀有」。' });
set('bb_doll', { fx: { feverRate: 0.25, feverQ: 2 }, d: 'FEVER 槽涨得快 25%，每场战斗的第一次 FEVER 至少转出「史诗」。' });
if (M.BLESS && M.BLESS[3]) Object.assign(M.BLESS[3], { n: 'FEVER 槽涨得快 30%', f: (run) => { run.mods.feverRate = (run.mods.feverRate || 0) + 0.3; } });
if (M.GIFTS && M.GIFTS.kit) Object.assign(M.GIFTS.kit, { n: '战鼓', d: '下一次出征，每场战斗开局 FEVER 槽已经有 30%。', apply(g, m) { m.nextFever = 0.3; return { t: '下一次出征 FEVER 槽开局 30%' }; } });
if (M.TALENTS) {
  if (M.TALENTS.forage) Object.assign(M.TALENTS.forage, { n: '热身', d: (v) => '每场战斗开局，FEVER 槽已经有 ' + Math.round(v * 200) + '%。', m: (v) => ({ feverStart: v * 2 }) });
  if (M.TALENTS.gambler) { const oD2 = M.TALENTS.gambler.d; M.TALENTS.gambler.d = (...a) => String(oD2(...a)).replace('支援道具转出好效果', 'FEVER 转出好效果'); }
}
const WT = M.WTHEME; if (WT && WT.park) { WT.park.loot = { wallet: 1.3, fever: 0.2 }; WT.park.tags = [['coin', '×1.3'], ['t_mult', '+']]; WT.park.lootD = '积分收益 ×1.3，FEVER 槽涨得快 20%。'; }
const oNR2 = M.newRun3;
M.newRun3 = function (meta, hero, worldKey) { const run = oNR2.apply(this, arguments); const th = WT && WT[worldKey]; if (th && th.loot && th.loot.fever) run.mods.feverRate = (run.mods.feverRate || 0) + th.loot.fever; return run; };
// the first-look cards: items and banners out, FEVER in
if (M.GUIDE) { for (let i = M.GUIDE.length - 1; i >= 0; i--) if (['items', 'banners', 'refill'].includes(M.GUIDE[i].id)) M.GUIDE.splice(i, 1);
  M.GUIDE.push({ id: 'fever', cat: '战斗', icon: 't_mult', title: 'FEVER', line: '部队越打越热，槽满了自动爆发一次随机效果，接着 8 秒部队攻速更快。职业越多、前后排齐全，涨得越快。', scr: 'battle', sel: '[data-tip="b-fever"]' }); }
})();
