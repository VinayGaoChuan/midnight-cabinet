// ==== mc-roster.js ====
(function () {
// The run's thinking happens in the shops; the base sets the direction (user rulings 2026-09-26: 「局内的核心应该是刷和爽，
// 局外应该负责build……就像小丑牌那样，每局玩的时候有策略，有build，但是决策会很快，花时间的的地方是在每局中间买东西的时候」,
// then the list agreed: everything but 「进化建筑不要带偏部队池」).
// · How many go out: 6 places, +1 at leader Lv4 and Lv7, +1 each for 军械库 and 罗马斗兽场, 10 at most. A card that makes three
//   of a kind can always be bought (they merge at once); any other card, with the army full, is a swap: pick the unit to
//   let go (it pays back half its price) and the new one takes its place. Other gifts of a unit, full: half its price.
// · (Vocation pairs came and went the same day: removed at the user's word.)
// · Shops lay out 5 units; the first refresh in a shop costs 5, each next one 5 more; deeper stops sell better tiers.
// · The base: blueprints come as 「图纸三选一」 (an area's final boss, a prosperity level) and random drops are halved;
//   an evolution building raises one garrison unit of its vocation a tier for soul shards, once a day; every 发展方向
//   also strengthens a vocation or two.
const M = window.MC, G = M.Game.prototype, BP = M.Battle3.prototype, DB = M.DB, B = M.BUILDINGS, S = M.Sfx, Q = M.QUALITY, now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));

// ───────── how many go out ─────────
M.ROSTER_BASE = 6; M.ROSTER_MAX = 10;
['armory', 'colosseum'].forEach(k => { const b = B[k]; if (!b) return; b.fx = Object.assign({}, b.fx, { rosterCap: 1 }); b.d = b.d.replace(/。$/, '') + '，出征上场人数 +1。'; });
M.rosterCap = function (run) {
  if (!run || run.raid || (run.region && run.region.tut)) return 99;
  const h = run.hero, lv = (h && h.lv) || 1, bm = run.M ? M.baseMods(run.M) : {};
  return Math.min(M.ROSTER_MAX, M.ROSTER_BASE + (lv >= 4 ? 1 : 0) + (lv >= 7 ? 1 : 0) + Math.round(bm.rosterCap || 0));
};
M.ROSTER_CAP = M.ROSTER_BASE;
// a third copy always goes in: it merges at once (mc-evo.js)
M.wouldMerge = (run, type) => !!(run && type && DB[type] && DB[type].next && run.roster.filter(u => u.type === type).length >= M.EVO_NEED - 1 && (!M.evoOpen || M.evoOpen(run.M, type)));
M.canAdd = (run, type) => !run || M._noCap || run.roster.length < M.rosterCap(run) || M.wouldMerge(run, type);
// every way a unit joins the army (a shop, a reward, a mini-game, a talent) stays under the tier only evolving reaches (M.buyCap,
// mc-night.js); the tutorial keeps its scripted units
const downTier = (run, type) => { const d = DB[type], m = run && run.M; if (!d || !d.line || !d.tier || !m || !M.buyCap || (run.region && run.region.tut) || run.tut) return type; const c = M.buyCap(m, type); return d.tier > c && DB[M.lineKey(d.line, c)] ? M.lineKey(d.line, c) : type; };
M.downTier = downTier;
M.addUnit = function (run, type) { type = downTier(run, type); if (!M.canAdd(run, type)) return null; run.roster.push({ uid: M.rid(), type, star: 1, bAtk: 0, bHp: 0, lv: 1, battles: 0, kills: 0, mana: 0, bonusAtk: 0 }); return null; };
// the starting army is never cut short by the cap
const oNR = M.newRun3;
M.newRun3 = function () { M._noCap = true; let run; try { run = oNR.apply(this, arguments); } finally { M._noCap = false; } return run; };
// a unit given by an event (a recruit flag, a mini-game, a reward) always joins, whatever the cap (user ruling 2026-09-26:
// 「像招募旗，之类的直接给部队的事件，是不受部队上限影响的，直接入队」); only buying in a shop is held to it
const oAward = G.award;
G.award = function (list, from) {
  if (!(Array.isArray(list) && list.some(g => g && g.k === 'unit'))) return oAward.call(this, list, from);
  const was = M._noCap; M._noCap = true; try { return oAward.call(this, list, from); } finally { M._noCap = was; }
};
// buying with the army full: a merge goes in, anything else is a swap
const oBuy = G.buy;
G.buy = function (zone, i) {
  const run = this.run, c = run && run.shop && run.shop[zone] && run.shop[zone][i];
  if (c && c.kind === 'unit' && !c.sold && run.wallet >= c.cost && !M.canAdd(run, c.type)) {
    if (this.replace && this.replace.i === i) { this.replace = null; S.click && S.click(); this.bump(); return; }
    this.replace = { zone, i, at: now() }; this.sel = null; S.click && S.click(); this.bump(); return;
  }
  this.replace = null;
  return oBuy.apply(this, arguments);
};
G.doReplace = function (uid) {
  const run = this.run, R = this.replace, c = R && run && run.shop && run.shop[R.zone] && run.shop[R.zone][R.i], u = run && run.roster.find(x => x.uid === uid);
  this.replace = null; this.sel = null;
  if (!c || c.sold || !u) { this.bump(); return; }
  const v = M.sellValue(run, u); if (run.wallet + v < c.cost) { this.deny('积分不够', '#d0453c'); return; }
  const p = this.fxPos('roster') || { x: 200, y: 700 };
  run.roster = run.roster.filter(x => x !== u); this.hold('wallet', run.wallet); run.wallet += v; this.release('wallet');
  this.fx.pop(p.x + 40, p.y - 40, DB[u.type].n + ' 离队 · +' + M.fmt(v), '#ffcc33', 30);
  this.buy(R.zone, R.i);
};
const oSell = G.sellSel;
G.sellSel = function () { if (this.replace) { this.replace = null; S.click && S.click(); this.bump(); return; } return oSell.apply(this, arguments); };
const oTickR = G.tick;
G.tick = function (dt) {
  const r = oTickR.apply(this, arguments);
  if (this.replace) { if (this.screen !== 'shop' || !this.run) this.replace = null; else if (this.sel) this.doReplace(this.sel); }
  return r;
};

// ───────── vocation pairs: removed (user ruling 2026-09-26: 「把羁绊先去掉……没有羁绊，我也不会乱买，为了凑高等级单位」) ─────────

// ───────── shops ─────────
Object.keys(M.SHOPS || {}).forEach(k => { const s = M.SHOPS[k]; if (s && s.units > 5) s.units = 5; });
M.refreshCost = (run) => 5 + 5 * ((run && run.refreshN) || 0);
const oOpen = G.openShop;
G.openShop = function () { if (this.run) this.run.refreshN = 0; this.replace = null; return oOpen.apply(this, arguments); };
// deeper stops lean to the better tiers (what the base allows: mc-night.js)
const oQW = M.shopQW;
M.shopQW = function (run) { const w = oQW.apply(this, arguments).slice(), d = cl(((run && run.lastL) || 0) / 6, 0, 1.5); return w.map((x, i) => x * (1 + [0, 0.5, 1, 1.5, 2, 0][i] * d)); };

// ───────── what the screens show: places, swaps, pairs ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run, T = now();
  if (v.w && run && !run.raid) v.w.rosterN = run.roster.length + ' / ' + M.rosterCap(run);
  if (v.s && run && this.screen === 'shop' && run.shop && run.shop.units) {
    const full = run.roster.length >= M.rosterCap(run);
    (v.s.units || []).forEach((cv, i) => { const c = run.shop.units[i]; if (!c || c.sold) return;
      /* a full army buys anyway and lets one go afterwards (mc-swap.js) */ });
    const R = this.replace, rc = R && run.shop.units[R.i];
    if (rc) { v.s.selOn = true; v.s.sell = '点一支部队换成' + DB[rc.type].n + ' · 点这里取消'; if (v.w && v.w.roster) { const on = Math.floor(T / 250) % 2; v.w.roster.forEach(r => { r.border = on ? '#ff5a4a' : '#7a2a2a'; }); } }
  }
  if (this.bpPick && this.screen === 'base') { v.relOn = true; v.lockOn = false; v.rp = this.bpPickView(); }
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  const run = this.run;
  if (key === 'w-roster' && run && !run.raid) { const h = run.hero, bm = run.M ? M.baseMods(run.M) : {}; return { title: '上场人数 ' + run.roster.length + ' / ' + M.rosterCap(run), c: '#ffcf4a', d: '满了还能买能凑成三合一的；别的要替换一支。', lines: [{ t: '领袖 Lv4、Lv7 各 +1' + (h && h.lv >= 4 ? '（已有 ' + ((h.lv >= 7) ? 2 : 1) + '）' : ''), c: '#a9a3c9' }, { t: '军械库、罗马斗兽场各 +1' + (bm.rosterCap ? '（已有 ' + bm.rosterCap + '）' : ''), c: '#a9a3c9' }] }; }
  return oTip.apply(this, arguments);
};

// ───────── blueprints: 三选一 at the base ─────────
const PICK = 'pick:bbp';
M.bpChanceK = 0.25;   // 2026-09-26: halved again (mc-drops.js)
const oChance = M.bpChance; if (oChance) M.bpChance = function () { return oChance.apply(this, arguments) * M.bpChanceK; };
// (2026-09-26, wonders: 「不要强化和图纸了」) an area's final boss pays one random blueprint again, and a 繁荣度 level pays a wonder
// (mc-wonders.js), not a blueprint pick
const oInfo = M.itemInfo;
M.itemInfo = function (key) { if (key === PICK) return { n: '图纸三选一', icon: 'scroll', c: '#ffcf4a', q: 3, kind: '建筑图纸', d: '回到基地后，从三张建筑图纸里选一张。', sub: '三选一' }; return oInfo.apply(this, arguments); };
const pickOpts = (m) => { const out = []; for (let i = 0; i < 40 && out.length < 3; i++) { const k = M.dropBp(1); if (k && k.startsWith('bbp:') && !out.includes(k) && (!M.bpUseful || M.bpUseful(m, k))) out.push(k); } return out; };
G.bpOpen = function () {
  const m = this.meta, opts = pickOpts(m);
  if (!opts.length) { m.inv[PICK]--; if (m.inv[PICK] <= 0) delete m.inv[PICK]; m.supplies += 120; this.toast('没有能选的图纸了：换成 120 物资', '#caa84a'); this.save(); return; }
  this.bpPick = { opts, at: now() }; S.fanfare && S.fanfare(); this.bump();
};
G.bpTake = function (i) {
  const m = this.meta, P = this.bpPick, k = P && P.opts[i]; if (!k || now() - P.at < 500) return;
  M.invAdd(m, k, 1); m.inv[PICK] = (m.inv[PICK] || 1) - 1; if (m.inv[PICK] <= 0) delete m.inv[PICK];
  this.bpPick = null; this.save(); const I = M.itemInfo(k), p = this.corePos ? this.corePos() : { x: 960, y: 500 };
  this.fx.pop && this.fx.pop(p.x, p.y - 60, I.n, I.c, 36); this.fx.rays && this.fx.rays(p.x, p.y, I.c, 1, { r: 220 }); S.up && S.up(2); this.pulse.core = now(); this.bump();
};
G.bpPickView = function () {
  const P = this.bpPick, ready = now() - P.at > 500;
  return { title: '图纸三选一', line: '带走一张', cards: P.opts.map((k, i) => { const Bd = B[k.slice(4)]; return { img: M.roomThumb ? M.roomThumb(k.slice(4)) : '', iw: 168, ih: 118, n: Bd.d, c: Q[Bd.q].c, t: Bd.n, op: ready ? 1 : 0.6, onPick: () => this.bpTake(i) }; }) };
};
const oTickB = G.tick;
G.tick = function (dt) {
  const r = oTickB.apply(this, arguments), m = this.meta;
  if (m && this.screen === 'base' && !this.bpPick && (m.inv[PICK] || 0) > 0 && !this.relPick && !this.dirPick && !this.dirFx && !this.expand && !this.modal && !this.visit && !this.rite && !this.tear && !this.lvFx && !this.lvPick && !this.homeQ && !this.panel && !this.night && !this.evoFx && !this.tlFx) this.bpOpen();
  if (this.bpPick && this.screen !== 'base') this.bpPick = null;
  return r;
};
// one pick on screen at a time
['relOpen', 'dirOpen'].forEach(k => { const o = G[k]; if (o) G[k] = function () { if (this.bpPick) return; return o.apply(this, arguments); }; });
const oNG = G.newGame; if (oNG) G.newGame = function () { this.bpPick = null; this.replace = null; return oNG.apply(this, arguments); };
// a new expedition starts with its own counters (2026-09-26 bug: 「商店中不管有多贵的，我都能买……离开这个商店，后面积分跟显示的就正确
// 了」): a number frozen for a flying reward of the last expedition (hold → release on landing) was never let go when that
// expedition ended mid-flight, so the new one showed the old score while buying used the real one
const RUN_KEYS = ['wallet', 'rsup', 'rbp', 'rshard', 'rexp', 'rfaith', 'hp'];
const oEW = G.enterWorld;
G.enterWorld = function () {
  const run = this.run;
  if (run && this._cntRun !== run) { this._cntRun = run; RUN_KEYS.forEach(k => { delete this.held[k]; delete this.tw[k]; delete this.twT[k]; });
    // the points it sets out with (路标补给 from a waypoint, M.chapterGrant; 钱庄): the big moment below, once the map is showing and no story plays
    if (run.grant > 0 || run.startGift > 0) { const go = (n) => { if (this.run !== run || n < 0) return; if (this.screen !== 'world' || this.storyFx || (this.storyQ && this.storyQ.length)) { setTimeout(() => go(n - 1), 250); return; } this.startPtsFx(run); }; setTimeout(() => go(60), 700); } }
  return oEW.apply(this, arguments);
};
// the points an expedition sets out with, shown once (2026-09-27: 「进入场景后，每次都会送初始积分，这个效果，你现在显示在了屏幕左侧，
// 根本就不明显，看不见，导致，我根本不知道，这个计分是多少哪来的，所以，进入场景的时候，需要有一个伟大的送计分的效果」): a gold flash and rays in
// the middle of the screen, 「开局积分」 slams down over a huge +N, the sources under it, a fountain of coins; then ten coins fly into
// the score counter, which counts up as they land
G.startPtsFx = function (run) {
  const parts = []; if (run.grant > 0) parts.push(['路标补给', run.grant]); if (run.startGift > 0) parts.push(['钱庄', run.startGift]);
  const N = parts.reduce((a, x) => a + x[1], 0), fx = this.fx; if (!N || !fx) return;
  const cx = 960, cy = 470, S = M.Sfx, GOLD = '#ffcc33';
  // 2026-09-27 (later): 「弹一下就可以消失了，否则太乱太晃眼了」 — one pop with where it came from, a few coins to the counter, no flash or rays
  this.hold('wallet', run.wallet - N);
  fx.pop(cx, cy, '开局积分 +' + M.fmt(N), '#ffe08a', 64, { slam: 1, life: 1.1, rise: 0 });
  try { S.coin ? S.coin(N) : S.up && S.up(1); } catch (e) { /* a sound never stops the show */ }
  const n = 6; for (let j = 0; j < n; j++) { const part = Math.round(N * (j + 1) / n) - Math.round(N * j / n);
    this.fly('coin', { x: cx + (Math.random() - 0.5) * 200, y: cy + 30 }, 'wallet', GOLD, j === n - 1 ? () => { if (this.held.wallet != null) this.release('wallet'); } : () => { if (this.held.wallet != null) { this.held.wallet += part; this.pulse.wallet = now(); } }, 0.5 + j * 0.06); }
  setTimeout(() => { if (this.run === run && this.held.wallet != null) this.release('wallet'); }, 4500);
};
// and a shop always opens on the real score (a reward still flying in lands in the counter on its own)
const oOpenS = G.openShop;
G.openShop = function () { if (this.held) { delete this.held.wallet; if (this.run && this.tw) this.tw.wallet = this.run.wallet; } return oOpenS.apply(this, arguments); };

// ───────── the garrison: one unit a tier up, for soul shards, once a day per building ─────────
M.GAR_UP = { 2: 10, 3: 20, 4: 40, 5: 80, 6: 160 };
M.garUpPick = (m, voc) => (M.garrisonOf ? M.garrisonOf(m) : []).filter(u => { const d = DB[u.type]; return d && d.voc === voc && M.evoOpen(m, u.type); }).sort((a, b) => DB[b.type].tier - DB[a.type].tier || M.unitPower(b.type, b) - M.unitPower(a.type, a))[0] || null;
G.garUp = function (c, r) {
  const m = this.meta, x = M.cell(m, c, r), Bd = x && B[x.b]; if (!Bd || !Bd.evoVoc) return false;
  if (x.upDay === m.day) { this.deny('今天已经升过一支了', '#8d8496'); return false; }
  const u = M.garUpPick(m, Bd.evoVoc); if (!u) { this.deny('驻军里没有能升档的' + Bd.evoVoc, '#8d8496'); return false; }
  const to = DB[u.type].next, cost = M.GAR_UP[DB[to].tier] || 40; if (m.shards < cost) { this.deny('灵魂碎片不够', '#d0453c'); return false; }
  const from = u.type; m.shards -= cost; u.type = to; u.evo = (u.evo || 0) + 1; x.upDay = m.day; this.save();
  const p = this.cellPos ? this.cellPos(c, r) : { x: 960, y: 500 }; this.fx.rays && this.fx.rays(p.x, p.y, Q[DB[to].q].c, 1.3, { r: 260 }); this.fx.pop(p.x, p.y - 50, DB[from].n + ' → ' + DB[to].n, Q[DB[to].q].c, 40, { slam: 1 }); S.up && S.up(3); this.pulse.mgar = now(); this.pulse.msh = now(); this.bump();
  return true;
};
const oPV = G.panelView;
G.panelView = function () {
  const v = oPV.apply(this, arguments), p = this.panel, m = this.meta, pn = v && v.pn; if (!pn || !p || p.kind !== 'room' || !m) return v;
  const Bd = B[p.key]; if (!Bd || !Bd.evoVoc) return v;
  const x = M.cell(m, p.c, p.r), u = M.garUpPick(m, Bd.evoVoc), to = u && DB[DB[u.type].next], cost = to ? M.GAR_UP[to.tier] || 40 : 0, done = x && x.upDay === m.day;
  Object.assign(pn, { ruinOn: true, ruinC: '#e8dcc4', ruinTxt: u ? '驻军里的' + DB[u.type].n + '可以升成' + to.n + '。' : '驻军里没有能升档的' + Bd.evoVoc + '。',
    repairBtn: done ? '今天已经升过了' : u ? '升档 · ' + cost + ' 灵魂碎片' : '没有能升档的部队', repairOp: !done && u && m.shards >= cost ? 1 : 0.45, onRepair: () => this.garUp(p.c, p.r) });
  return v;
};

// ───────── 发展方向: each also strengthens a vocation or two (its base keys flow into every expedition and night) ─────────
const DV = { city: [{ merAtk: 0.1, merHp: 0.1 }, '商人攻击和生命 +10%'], fort: [{ vanHp: 0.1, guaHp: 0.1 }, '先锋和守护者生命 +10%'], market: [{ assAtk: 0.12 }, '刺客攻击 +12%'],
  industry: [{ rngAs: 0.1 }, '射手攻速 +10%'], army: [{ warAtk: 0.12 }, '战士攻击 +12%'], pastoral: [{ cleMana: 0.15 }, '牧师回法力 +15%'], holy: [{ palHp: 0.12, priAtk: 0.12 }, '圣骑士生命和祭司攻击 +12%'],
  arcane: [{ magAtk: 0.12 }, '法师攻击 +12%'], future: [{ sumMana: 0.15 }, '召唤师回法力 +15%'], fun: [{ sumHp: 0.12 }, '召唤师生命 +12%'] };
Object.keys(DV).forEach(k => { const D = M.DIRS && M.DIRS[k]; if (!D) return; const [fx, t] = DV[k], of = D.fn; D.fn = (o, m, lv) => { if (of) of(o, m, lv); Object.keys(fx).forEach(x => { o[x] = (o[x] || 0) + fx[x] * lv; }); }; D.t = D.t.replace(/。$/, '') + '，' + t + '。'; });
const VRE = /^(van|gua|war|pal|rng|ass|mag|cle|pri|sum|mer)(Hp|Atk|As|Mana)$/;
M.vocFromBase = (mods, m) => { const bm = m ? M.baseMods(m) : {}; Object.keys(bm).forEach(k => { if (VRE.test(k)) mods[k] = (mods[k] || 0) + bm[k]; }); return mods; };
const oNR2 = M.newRun3;
M.newRun3 = function (meta) { const run = oNR2.apply(this, arguments); if (run && run.mods && meta && !(run.region && run.region.tut)) M.vocFromBase(run.mods, meta); return run; };

// ───────── the fights after the first: a shorter announcement ─────────
const oBB = G.beginBattle;
G.beginBattle = function (n) {
  const r = oBB.apply(this, arguments), run = this.run, B0 = this.introBanner;
  if (B0 && run && !run.raid && (run.battles || 0) >= 1 && n && (n.type === 'normal' || n.type === 'hold')) { B0.life = Math.min(B0.life || 1.5, 0.9); B0.hold = null; }
  return r;
};

if (M.GUIDE) M.GUIDE.push(
  { id: 'rostercap', cat: '出征', icon: 't_command', title: '上场人数', line: '一趟最多带这么多部队；满了还能买能凑成三合一的，别的要替换一支。', scr: 'shop', sel: '[data-tip="w-roster"]' },
  { id: 'swap', cat: '出征', icon: 'e_market', title: '替换', line: '队伍满了还拿到部队时，全队摊开，选一支离队。', scr: 'world', sel: '[data-fx="roster"]' },
  { id: 'garup', cat: '基地', icon: 'u_star', title: '驻军升档', line: '进化建筑每天能花灵魂碎片，让一支这个职业的驻军升一档。', scr: 'base', sel: '[data-fx="mgar"]' });
})();

;
