// ==== mc-gdiff.js ====
(function () {
// The difficulty of a whole game (user ruling 2026-09-26: 「要分多个难度，玩家第一次进入游戏是普通难度（最低难度），当普通难度通过多少
// 天后解锁上面的难度。不同难度，在机制上要有一些变……不同难度，前面说的那些比例应该不同」, plan confirmed the same day).
// · 普通 → 困难 → 噩梦 → 地狱. A new player plays 普通; 投币前 lets you pick any difficulty unlocked.
// · Each has a goal night: hold it and this difficulty is won — a ceremony, tokens, the next difficulty opens; then carry
//   on (every day still pays) or cash out.
// · They differ in what comes at night (强敌 / 首领 / 血月), how strong nights and expeditions are, the final boss's second
//   phase, the core's hearts, the main base, the visitors, the loot and the tokens.
// · The chapters' own 普通 / 噩梦 / 地狱 (mc-scenes.js) are gone: a game never gets through nine chapters anyway.
const M = window.MC, G = M.Game.prototype, BP = M.Battle3.prototype, S = M.Sfx, now = () => performance.now();
// foe: expeditions ×0.7 / 0.85 / 0.95 / 1.05 since 2026-09-27 (普通 at 0.85 lost 2 of 8 bot games by day 5, all to chapter-1 expeditions)
const GD = M.GDIFF = [
  { n: '普通', c: '#cfd8e3', goal: 15, night: 0.8, foe: 0.7, strong: 0, boss: 0, moon: 0, p2: 0, fast: 0, core: 3, portal: 1.3, plague: 0, loot: 1, tok: 1, bb: 0.05, elite: [1, 1, 1], eliteK: 1, d: '夜里只有混沌来袭。' },
  { n: '困难', c: '#ffcf4a', goal: 20, night: 1, foe: 0.85, strong: 1, boss: 0, moon: 0, p2: 1, fast: 0, core: 3, portal: 1, plague: 2, loot: 1.25, tok: 1.25, bb: 0.08, elite: [1, 1, 1], eliteK: 1, d: '每 5 天强敌来袭，最终首领有第二阶段。' },
  { n: '噩梦', c: '#b86bff', goal: 25, night: 1.15, foe: 0.95, strong: 1, boss: 1, moon: 0, p2: 1, fast: 0, core: 3, portal: 1, plague: 2, loot: 1.5, tok: 1.5, bb: 0.12, elite: [0.5, 1, 1.5], eliteK: 1, d: '再加每 10 天首领来袭，精英更多。' },
  { n: '地狱', c: '#e8434f', goal: 30, night: 1.3, foe: 1.05, strong: 1, boss: 1, moon: 1, p2: 1, fast: 0.75, core: 2, portal: 0.8, plague: 4, loot: 2, tok: 2, bb: 0.18, elite: [0.5, 1, 1.5], eliteK: 1.25, d: '强敌和首领之夜是血月，基地核心只有 2 颗心。' },
];
const gi = (m) => Math.max(0, Math.min(GD.length - 1, (m && m.gd) || 0));
const gdOf = M.gdOf = (m) => GD[gi(m)];
const curM = () => (M._g && M._g.meta) || null;
const P_ = (g) => g.prof || {};
M.gdMax = (p) => Math.max(0, Math.min(GD.length - 1, (p && p.gdMax) || 0));

// ───────── the night ─────────
M.nightKind = (d) => { const D = gdOf(curM()); return d > 0 && D.boss && d % 10 === 0 ? 'boss' : d > 0 && D.strong && d % 5 === 0 ? 'strong' : null; };
M.bloodMoon = (d) => !!M.nightKind(d);
M.moonNight = (d) => !!(gdOf(curM()).moon && M.nightKind(d));
M.MOON_K = 1.25;   // a blood moon: the whole night stronger, and three in ten of the garrison that falls are gone even when it holds
const oNP = M.nightPower;
M.nightPower = (m) => Math.round(oNP(m) * gdOf(m).night * (gdOf(m).moon && M.nightKind((m && m.day) || 1) ? M.MOON_K : 1));
const oFoe = M.nightFoe;
M.nightFoe = function (m, d) { const f = oFoe.apply(this, arguments); if (f && gdOf(m).moon) f.title += ' · 血月'; return f; };
const oRE = G.raidEnd;
G.raidEnd = function () {
  const r = this.raid, m = this.meta, won = !!(r && r.night && r.over === 'win');
  if (won && m && M.moonNight(m.day)) { const g = M.garrisonOf(m), fell = r.ents.filter(e => e.gar && !e.alive).map(e => e.gar), gone = fell.filter(() => Math.random() < 0.3); if (gone.length) { for (let i = g.length - 1; i >= 0; i--) if (gone.includes(g[i].uid)) g.splice(i, 1); this.toast && this.toast('血月带走了 ' + gone.length + ' 支倒下的驻军', '#e8434f'); } }
  const res = oRE.apply(this, arguments);
  // the goal night held: this difficulty is won
  if (won && m && !m.goalDone && m.day >= gdOf(m).goal) { m.goalDone = 1; m.goalPend = 1; const p = P_(this); if (gi(m) >= M.gdMax(p) && gi(m) < GD.length - 1) { p.gdMax = gi(m) + 1; m.gdOpened = 1; } p.gdWon = Object.assign({}, p.gdWon, { [gi(m)]: 1 }); this.saveProfile && this.saveProfile(); this.save && this.save(); }
  return res;
};
// after the night: the goal ceremony, then carry on or cash out
const oNO = G.nightOver;
G.nightOver = function () {
  const m = this.meta;
  if (m && m.goalPend && m.portal.hp > 0) {
    m.goalPend = 0; this.night = null; const D = gdOf(m), nx = m.gdOpened ? GD[gi(m) + 1] : null;
    this.banner && this.banner({ kind: 'win', text: '通关 · ' + D.n + '！', col: '#ffd970', col2: '#6a4a0a', sub: '守过了第 ' + D.goal + ' 夜', life: 2.6, y: 440 }); S.fanfare && S.fanfare(); this.fx && this.fx.confetti && this.fx.confetti(160);
    setTimeout(() => { this.modal = { title: '通关 · ' + D.n, titleColor: '#ffd970', text: '守过了第 ' + D.goal + ' 夜。' + (nx ? nx.n + '难度开启了。' : ''), img: 'u_star', border: '#ffd970', at: now(),
      choices: [{ t: '继续守下去', sub: '每多守一天，代币照样多', gold: true, fn: () => { this.modal = null; this.bump(); this.passDay(); } }, { t: '收工结算', fn: () => { this.modal = null; this.gameOver('goal'); } }] }; this.bump(); }, 2200);
    this.bump(); return;
  }
  return oNO.apply(this, arguments);
};

// ───────── expeditions ─────────
const oEk = M.runEk;
if (oEk) M.runEk = (run) => oEk(run) * (run && run.M && !(run.region && run.region.tut) ? gdOf(run.M).foe : 1);
const oGen = M.genMap2;
M.genMap2 = function (run) { if (run && run.len && !(run.region && run.region.tut) && run.M) run.len = Object.assign({}, run.len, { elite: gdOf(run.M).elite }); return oGen.apply(this, arguments); };
const oSpawn = BP.spawnEnemy;
BP.spawnEnemy = function () { const e = oSpawn.apply(this, arguments), k = this.run && this.run.M ? gdOf(this.run.M).eliteK : 1; if (e && e.elite && !e.boss && k !== 1) { e.hp *= k; e.maxHp *= k; e.atk *= k; } return e; };
const oInit = BP.init;
BP.init = function (run) { const r = oInit.apply(this, arguments), D = run && run.M ? gdOf(run.M) : GD[1]; this.noP2 = !D.p2; this.fbFast = D.fast || 0; return r; };
// the chapters are played at their plain difficulty; what the game's difficulty pays comes on top
const DIFF0 = M.DIFFS && M.DIFFS[0];
if (DIFF0) M.diffOf = (m) => { const D = gdOf(m); return Object.assign({}, DIFF0, { loot: D.loot, exp: D.loot, bb: D.bb }); };
const oWO = M.worldsOpen;
if (oWO) M.worldsOpen = function (m) { if (m) { m.diff = 0; m.diffMax = 0; } return oWO.apply(this, arguments); };

// ───────── the base ─────────
Object.defineProperty(M, 'CORE_MAX', { configurable: true, get: () => gdOf(curM()).core });
const oPM = M.portalMax;
M.portalMax = (m) => Math.round(oPM(m) * gdOf(m).portal);
const EV = M.DAYEV;
if (EV && EV.plague) Object.defineProperty(EV.plague, 'w', { configurable: true, get: () => gdOf(curM()).plague });

// ───────── a new game: its difficulty ─────────
const oNG = G.newGame;
G.newGame = function () {
  const p = P_(this), want = M._nextGd != null ? M._nextGd : (M.unfolded && M.unfolded(p) ? Math.min(M.gdMax(p), p.lastGd || 0) : 0); M._nextGd = null;
  const r = oNG.apply(this, arguments), m = this.meta;
  if (m) { m.gd = Math.max(0, Math.min(M.gdMax(p), want)); m.core = gdOf(m).core; if (m.portal) m.portal.hp = M.portalMax(m); m.goalDone = 0; this.save && this.save(); }
  return r;
};
// tokens: the difficulty pays more, and the goal held pays a prize
const oSR = M.settleRows;
M.settleRows = function (m) {
  const S0 = oSR.apply(this, arguments), D = gdOf(m);
  if (m && m.goalDone) { const r = { k: 'goal', n: '通关 · ' + D.n, ic: 'u_star', v: 1, per: 100 * (gi(m) + 1) }; r.t = r.per; S0.rows.push(r); S0.sum += r.t; }
  S0.mul = D.tok; S0.total = Math.round(S0.sum * S0.mul); S0.gdTxt = D.tok > 1 ? D.n + ' ×' + D.tok : ''; return S0;
};
// achievements: winning each difficulty (the old 「打开噩梦难度」 is gone with the chapters' difficulties)
if (M.ACH2) {
  const i = M.ACH2.findIndex(a => a.k === 'hard'); if (i >= 0) M.ACH2.splice(i, 1);
  GD.forEach((D, k) => M.ACH2.push({ k: 'gd' + k, n: '通关' + D.n, d: '守过' + D.n + '难度的第 ' + D.goal + ' 夜', tok: [100, 150, 200, 300][k], ok: (m, p) => !!(p && p.gdWon && p.gdWon[k]) }));
}

// ───────── what the base shows: how far to the goal ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), m = this.meta;
  if (v.b && v.b.res && m && m.tutDone) { const D = gdOf(m); v.b.res.push({ img: M.iconURL ? M.iconURL('u_star', 2) : '', v: m.goalDone ? m.day + ' 天' : m.day + '/' + D.goal, c: D.c, fx: 'mgoal', sc: this.ps ? this.ps('mgoal') : 1, hasSub: false, sub: '', tipOn: this.tipFn(() => this.tipFor('b-goal')) }); }
  // 投币前: the difficulty row (mc-legacy.js)
  if (v.lg && this.lg) { const p = P_(this), L = this.lg, setup = L.mode === 'setup', mx = M.gdMax(p); if (L.gd == null) L.gd = Math.min(mx, p.lastGd || 0);
    v.lg.diffs = GD.map((D, i) => { const on = i <= mx, sel = setup && L.gd === i; return { n: D.n, c: on ? D.c : '#6a6394', sub: on ? '目标 ' + D.goal + ' 夜' : '未开启', ring: sel ? '#ffcf4a' : on ? '#3d3a8c' : '#2b2461', op: on ? 1 : 0.5, won: !!(p.gdWon && p.gdWon[i]),
      tipOn: this.tipFn({ title: D.n, c: D.c, d: D.d, lines: [{ t: on ? '守过第 ' + D.goal + ' 夜通关' : '通关' + GD[i - 1].n + '开启', c: '#a9a3c9' }] }), onClick: () => { if (!setup) return; if (!on) { this.deny && this.deny('还没开启', '#8d8496'); return; } L.gd = i; S.click && S.click(); this.bump(); } }; });
    v.lg.showDiffs = setup && mx > 0; }
  return v;
};
const oGo = G.lgGo;
if (oGo) G.lgGo = function () { const L = this.lg, p = P_(this); if (L && L.gd != null) { M._nextGd = Math.min(M.gdMax(p), L.gd); p.lastGd = M._nextGd; } return oGo.apply(this, arguments); };
const oTip = G.tipFor;
G.tipFor = function (key) {
  const m = this.meta;
  if (key === 'b-goal' && m) { const D = gdOf(m); return { title: D.n + ' · ' + (m.goalDone ? '已通关' : '目标第 ' + D.goal + ' 夜'), c: D.c, d: D.d }; }
  return oTip.apply(this, arguments);
};
if (M.GUIDE) M.GUIDE.forEach(c => { if (c && c.id === 'diff') Object.assign(c, { title: '游戏难度', line: '普通、困难、噩梦、地狱：越往上敌人越强、收获越好。' }); if (c && c.id === 'danger') c.title = '碑的难度'; });
if (M.GUIDE) M.GUIDE.push(
  { id: 'gdiff', cat: '基地', icon: 'u_star', title: '通关目标', line: '守过这个难度的目标夜就通关，开启下一个难度。', scr: 'base', sel: '[data-fx="mgoal"]' });
})();
