// ==== mc-legacy.js ====
(function () {
// The cabinet between games: portraits, cartridges, leaders, achievements (user rulings 2026-09-26: the plan's 遗像 and
// 精简的机台层, then 「机台物中的东西，只有第一次失败后，才会展开，否则没有意义，也会让每个玩家觉得太多，太复杂」).
// · Nothing of it shows before the first game is lost (核心碎了 / 主基地被攻破; 放弃 does not count). A player who has
//   never failed sees the cabinet as before: 开始游戏 / 继续, 玩法说明, 设置.
// · 遗像: when a game is lost, the fallen leader's card lies on the table and one talent it learned is carved into a
//   portrait. The portrait hangs on the wall (6 at most, the oldest falls off). A new game may take one: the new leader
//   starts with that talent outside its tree, one talent point more if it is the same vocation; the portrait is used up.
// · 投币前 (a new game): pick the leader among the unlocked ones, one cartridge, one portrait, then 投币.
// · Leaders: 守夜人, 驱魔修女, 焚尸人 from the start; a vocation once played stays open; the other three open by a feat.
// · Cartridges are bought once with the tokens every game pays out (the old settlement); one per game.
// · Achievements pay tokens once. The old furniture and its perks stay switched off (M.META_ROOM).
const M = window.MC, G = M.Game.prototype, S = M.Sfx, B = M.BUILDINGS, H = M.HEROES, T = M.TALENTS, Q = M.QUALITY;
const now = () => performance.now(), rnd = Math.random, pick = (a) => a[Math.floor(rnd() * a.length)];
const CLS = Object.keys(H), START = ['watchman', 'nun', 'cremator'];
const UNLOCK = M.CLS_UNLOCK = {
  widow: { d: 'FEVER 转出一次传说效果', ok: (p) => !!p.stats.feverLegend },
  butcherlord: { d: '累计让 3 支部队进化', ok: (p) => (p.stats.evos || 0) >= 3 },
  clockmaker: { d: '守住第 15 天的混沌来袭', ok: (p) => !!p.stats.raid15 },
};
const KITS = M.KITS2 = [
  // names without 卡带 (the section says it), one short line each (docs/design.md §11.1b)
  { k: 'dig', n: '工兵', ic: 'u_pick', d: '开局多挖通 3 格，物资 +100。', cost: 120 },
  { k: 'build', n: '建筑师', ic: 'scroll', d: '开局多 2 张稀有以上的图纸。', cost: 200 },
  { k: 'muster', n: '征兵', ic: 'f_recruit', d: '出征时多带一支同名部队。', cost: 200 },
  { k: 'focus', n: '专精', ic: 'e_card', d: '商店多摆基础部队，更容易进化。', cost: 300 },
  { k: 'arms', n: '军火', ic: 'gem', d: '开局多工坊和宝物图纸。', cost: 300 },
  { k: 'gamble', n: '赌徒', ic: 't_dice', d: 'FEVER 快 20%，物资少 20%。', cost: 300 },
];
const KIT = {}; KITS.forEach(k => KIT[k.k] = k);
const ACH = M.ACH2 = [
  { k: 'boss10', n: '首领猎手', d: '一局里打倒 10 个首领', tok: 80, ok: (m) => (m.st && m.st.boss || 0) >= 10 },
  { k: 'raid3', n: '守城人', d: '一局里守住 3 次混沌来袭', tok: 80, ok: (m) => (m.st && m.st.raidsWon || 0) >= 3 },
  { k: 'build10', n: '建筑师', d: '一局里建成 10 座建筑', tok: 80, ok: (m) => (m.st && m.st.built || 0) >= 10 },
  { k: 'chapter', n: '第一章', d: '通关一章', tok: 100, ok: (m) => !!(m.prog && m.prog.d0 && Object.keys(m.prog.d0.clr || {}).length) },
  { k: 'day20', n: '长夜', d: '活到第 20 天', tok: 120, ok: (m) => m.day >= 20 },
  { k: 'evo3', n: '传说进化', d: '让一支部队进化成传说', tok: 100, ok: (m, p) => (p.stats.evoMax || 0) >= 3 },
  { k: 'legion', n: '传说军团', d: '一局里进化出 3 支传说部队', tok: 200, ok: (m) => (m.st && m.st.legends || 0) >= 3 },
  { k: 'fever', n: '大奖', d: 'FEVER 转出一次传说效果', tok: 100, ok: (m, p) => !!p.stats.feverLegend },
  { k: 'legend', n: '传说建筑', d: '建成一座传说品质的建筑', tok: 120, ok: (m) => { let f = false; if (M.eachBuilt) M.eachBuilt(m, (k) => { if (B[k] && B[k].q === 3 && !B[k].boss) f = true; }); return f; } },
  { k: 'hard', n: '噩梦', d: '打开噩梦难度', tok: 200, ok: (m) => (m.diffMax || 0) >= 1 },
];
M.SHRINE_MAX = 6;

// ───────── the profile ─────────
const stats = (p) => p.stats || (p.stats = {});
M.unfolded = (p) => !!(p && p.stats && p.stats.games > 0);
// players who have lost a game before this (2026-09-26) keep every leader they could pick
const fix = (p) => { if (!p || p.lgV === 1) return p; if (stats(p).games > 0) stats(p).allCls = 1; p.lgV = 1; p.shrine = p.shrine || []; p.kits2 = p.kits2 || {}; p.ach2 = p.ach2 || {}; return p; };
const P_ = (g) => fix(g.prof);
M.clsOpen = (p, k) => !!H[k] && (START.includes(k) || !!stats(p).allCls || !!(stats(p).played && stats(p).played[k]) || !!(UNLOCK[k] && UNLOCK[k].ok(p)));
// feats the unlocks and achievements read
const oFS = G.fvStageStart;
if (oFS) G.fvStageStart = function (key, tier) { if (tier === 3 && this.prof) { stats(this.prof).feverLegend = 1; this.saveProfile && this.saveProfile(); } return oFS.apply(this, arguments); };
const oRE = G.raidEnd;
if (oRE) G.raidEnd = function () { const r = this.raid, won = !!(r && r.over === 'win'), m = this.meta; const res = oRE.apply(this, arguments); if (won && m && m.day >= 15 && this.prof) { stats(this.prof).raid15 = 1; this.saveProfile && this.saveProfile(); } this.achCheck2(); return res; };
const oEM = M.evoMerge;
M.evoMerge = function (run, three) { const nu = oEM.apply(this, arguments); const g = M._g; if (g && g.prof && nu) { const st = stats(g.prof); st.evoMax = Math.max(st.evoMax || 0, nu.evo || 0); g.saveProfile && g.saveProfile(); } return nu; };
// achievements: tokens once, told as they come (only once the cabinet is open)
G.achCheck2 = function () {
  const p = P_(this), m = this.meta; if (!p || !m || !M.unfolded(p)) return; p.ach2 = p.ach2 || {};
  let got = 0; ACH.forEach(a => { if (p.ach2[a.k]) return; let ok = false; try { ok = a.ok(m, p); } catch (e) {} if (!ok) return; p.ach2[a.k] = 1; p.tokens = (p.tokens || 0) + a.tok; got++; this.toast && this.toast('成就 · ' + a.n + ' · 代币 +' + a.tok, '#ffcf4a'); });
  if (got) { S.up && S.up(2); this.saveProfile(); }
};
const oPD = G.passDay;
if (oPD) G.passDay = function () { const r = oPD.apply(this, arguments); this.achCheck2(); return r; };

// ───────── portraits: a talent the leader learned ─────────
const learned = (h) => (Array.isArray(h.taken) && Array.isArray(h.tree) ? h.taken.map(i => h.tree[i]).filter(n => n && T[n.f]) : []).sort((a, b) => b.L - a.L).slice(0, 5).map(n => ({ f: n.f, L: n.L, voc: n.voc }));
const talOk = (n) => !!(n && T[n.f] && Number.isInteger(n.L) && n.L >= 1 && n.L <= 6);
const talLine = (n) => M.talName(n) + '：' + M.talDesc(n);
// the portrait's talent works as if learned (the leader's own reach, or the base's)
const addM = (o, x) => Object.keys(x).forEach(k => { o[k] = (o[k] || 0) + x[k]; });
const oTM = M.talentMods;
M.talentMods = function (h) { const o = oTM.apply(this, arguments); const n = h && h.inh; if (talOk(n) && T[n.f].sc !== 'base') addM(o, T[n.f].m(M.talVal(n), n.voc)); return o; };
const oTB = M.talentBase;
M.talentBase = function (m) { const o = oTB.apply(this, arguments); (m && m.heroes || []).forEach(h => { const n = h.inh; if (talOk(n) && T[n.f].sc === 'base') addM(o, T[n.f].m(M.talVal(n), n.voc)); }); return o; };
const oHT = G.heroTip;
G.heroTip = function (h) { const t = oHT.apply(this, arguments); if (t && h && talOk(h.inh)) t.lines = (t.lines || []).concat([{ rich: [{ t: '遗像　', c: '#ffcf4a', b: 1 }, { t: talLine(h.inh), c: '#e8dcc4' }] }]); return t; };

// ───────── a game lost: carve, then the summary ─────────
const oGO = G.gameOver;
G.gameOver = function (reason) {
  if (this._over) return oGO.apply(this, arguments);
  const p = P_(this), m = this.meta, h = m && m.heroes && m.heroes[0], first = !M.unfolded(p);
  try { this.achCheck2(); } catch (e) {}
  const snap = h && H[h.cls] ? { cls: h.cls, lv: h.lv, day: m.day, tal: learned(h) } : null, tok0 = p.tokens || 0;
  const r = oGO.apply(this, arguments), over = this.modal && this.modal.over ? this.modal : null;
  const got = (p.tokens || 0) - tok0;
  if (over) {
    over.text += '\n代币 +' + got + (first ? '\n机台屏幕上多了「遗像墙」。' : '');
    (over.choices || []).forEach(c => { if (c.t === '重新开始') c.fn = () => { this.modal = null; this.lgOpen('setup'); }; });
  }
  if (snap && snap.tal.length && over) {
    const carve = (n) => {
      p.shrine = (p.shrine || []).concat([{ id: M.rid(), cls: snap.cls, lv: snap.lv, day: snap.day, t: n, at: Date.now() }]);
      if (p.shrine.length > M.SHRINE_MAX) p.shrine = p.shrine.slice(-M.SHRINE_MAX);
      this.saveProfile(); S.up && S.up(2); this.toast && this.toast('遗像挂上了墙', '#ffcf4a');
    };
    const back = () => { this.modal = this.screen === 'menu' ? over : null; this.bump(); };
    this.modal = { title: '刻一张遗像', text: 'Lv' + snap.lv + ' ' + H[snap.cls].n + ' 倒下了。\n选一个它学会的天赋刻进遗像，下一局可以带上。', border: '#ffcf4a', img: 'skull', back,
      choices: snap.tal.map(n => ({ t: M.talName(n) + ' · 第 ' + n.L + ' 层', sub: M.talDesc(n), gold: n.L >= 4, fn: () => { carve(n); back(); } })).concat([{ t: '不刻了', fn: back }]) };
    this.bump();
  }
  return r;
};

// ───────── 投币前 / 遗像墙 ─────────
G.lgOpen = function (mode) {
  const p = P_(this), open = CLS.filter(k => M.clsOpen(p, k));
  const cls = open.includes(p.lastCls) ? p.lastCls : open[0], kit = p.lastKit && (p.kits2 || {})[p.lastKit] ? p.lastKit : null;
  this.lg = { mode, cls, kit, pid: null, at: now() }; S.click && S.click(); this.bump();
};
G.lgClose = function () { this.lg = null; this.bump(); };
G.lgBuy = function (k) {
  const p = P_(this), K = KIT[k]; if (!K || (p.kits2 || {})[k]) return;
  if ((p.tokens || 0) < K.cost) { this.deny && this.deny('代币不够：要 ' + K.cost, '#d0453c'); return; }
  p.tokens -= K.cost; p.kits2 = Object.assign({}, p.kits2, { [k]: 1 }); this.saveProfile(); S.up && S.up(2); if (this.lg && this.lg.mode === 'setup') this.lg.kit = k; this.bump();
};
G.lgGo = function () {
  const L = this.lg, p = P_(this); if (!L) return;
  this._lgPick = { cls: L.cls, kit: L.kit, pid: L.pid }; M._nextCls = L.cls; this.lg = null;
  p.lastCls = L.cls; p.lastKit = L.kit; this.saveProfile();
  if (this.screen === 'menu' && this.menuGo) this.menuGo(); else this.startGame();
};
// 开始游戏 on the cabinet: once the cabinet is open, a new game starts with 投币前
const oMG = G.menuGo;
G.menuGo = function () { const p = P_(this); if (!this.lg && !this._lgPick && M.unfolded(p) && !(p && p.active) && this.meta && this.meta.tutDone && !this.menuDive && !this.modal) { this.lgOpen('setup'); return; } return oMG.apply(this, arguments); };
// the chosen leader, cartridge and portrait go into the new game
const oDM = M.defaultMeta3;
M.defaultMeta3 = function () { const m = oDM.apply(this, arguments); if (M._nextCls && H[M._nextCls] && m.heroes && m.heroes.length) m.heroes = [M.newHero(m, M._nextCls)]; return m; };
const wsBp = () => { const ks = Object.keys(B).filter(k => B[k].cat === 'forge' && !B[k].boss && !B[k].fixed && !B[k].gone && B[k].q <= 1); return ks.length ? 'bbp:' + pick(ks) : null; };
const oNG = G.newGame;
G.newGame = function () {
  const r = oNG.apply(this, arguments), m = this.meta, p = P_(this), L = this._lgPick; M._nextCls = null; this._lgPick = null;
  const h = m && m.heroes && m.heroes[0]; if (h && p) { const st = stats(p); st.played = Object.assign({}, st.played, { [h.cls]: 1 }); }
  if (L && m) {
    m.kit2 = L.kit && (p.kits2 || {})[L.kit] ? L.kit : null;
    if (m.kit2 === 'dig') { m.supplies += 100; let n = 0; for (const [dc, dr] of [[-1, 0], [1, 0], [0, 1], [-2, 0], [2, 0]]) { const x = M.cell(m, M.CORE.c + dc, M.CORE.r + dr); if (x && !x.dug && n < 3) { x.dug = true; n++; } } }
    if (m.kit2 === 'build') { const ks = Object.keys(B).filter(k => !B[k].fixed && !B[k].boss && !B[k].gone && B[k].q >= 1 && B[k].q <= 2 && k !== 'core'); for (let i = 0; i < 2 && ks.length; i++) M.invAdd(m, 'bbp:' + ks.splice(Math.floor(rnd() * ks.length), 1)[0], 1); }
    if (m.kit2 === 'arms') { const w = wsBp(); if (w) M.invAdd(m, w, 1); const rs = M.relicPool ? M.relicPool() : []; if (rs.length) M.invAdd(m, 'rbp:' + pick(rs), 1); }
    const pi = (p.shrine || []).findIndex(x => x.id === L.pid);
    if (pi >= 0 && h) { const po = p.shrine[pi]; if (talOk(po.t)) h.inh = { f: po.t.f, L: po.t.L, voc: po.t.voc }; if (po.cls === h.cls) h.points = (h.points || 0) + 1; p.shrine.splice(pi, 1); }
    this.saveProfile(); this.save && this.save();
  }
  return r;
};
// cartridges that work on every expedition
const oNR = M.newRun3;
M.newRun3 = function (meta) {
  const run = oNR.apply(this, arguments); if (!run || (run.region && run.region.tut) || !meta) return run;
  if (meta.kit2 === 'muster' && run.roster && run.roster[0]) { M.addUnit(run, run.roster[0].type); M.poolAdd && M.poolAdd(run, run.roster[0].type); }
  if (meta.kit2 === 'gamble') { run.mods.feverRate = (run.mods.feverRate || 0) + 0.2; run.lootMul = (run.lootMul || 1) * 0.8; }
  return run;
};

// ───────── what the cabinet shows ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), p = this.prof, L = this.lg;
  if (v.isMenu && v.mn && v.mn.on) { v.mnWall = M.unfolded(fix(p)); v.openWall = () => this.lgOpen('wall'); }
  v.lgOn = !!L && this.screen === 'menu';
  if (!v.lgOn) return v;
  const setup = L.mode === 'setup', kits2 = p.kits2 || {};
  const leaders = CLS.map(k => { const on = M.clsOpen(p, k), sel = setup && L.cls === k, Hk = H[k];
    return { img: M.spriteURL(Hk.sprite, 6), n: Hk.n, c: on ? '#f4efe0' : '#6a6394', sub: on ? Hk.skill.n : UNLOCK[k] ? UNLOCK[k].d : '', ring: sel ? '#ffcf4a' : on ? '#3d3a8c' : '#2b2461', op: on ? 1 : 0.5,
      tipOn: this.tipFn({ title: Hk.n, c: '#ffcf4a', d: Hk.skill.n + '：' + Hk.skill.d + '。' }), onClick: () => { if (!setup) return; if (!on) { this.deny && this.deny('还没解锁', '#8d8496'); return; } L.cls = k; S.click && S.click(); this.bump(); } }; });
  const kits = KITS.map(K => { const own = !!kits2[K.k], sel = setup && L.kit === K.k;
    return { img: M.iconURL(K.ic, 3), n: K.n, d: K.d, c: own ? '#f4efe0' : '#a9a3c9', buy: !own, price: String(K.cost), pc: (p.tokens || 0) >= K.cost ? '#ffcf4a' : '#e8434f',
      ring: sel ? '#ffcf4a' : own ? '#3d3a8c' : '#2b2461', op: own || (p.tokens || 0) >= K.cost ? 1 : 0.6,
      onClick: () => { if (!own) { this.lgBuy(K.k); return; } if (!setup) return; L.kit = L.kit === K.k ? null : K.k; S.click && S.click(); this.bump(); } }; });
  const ports = (p.shrine || []).slice().reverse().map(po => { const sel = setup && L.pid === po.id, Hk = H[po.cls] || H.watchman, ok = talOk(po.t);
    return { img: M.spriteURL(Hk.sprite, 5), n: 'Lv' + po.lv + ' ' + Hk.n, t: ok ? M.talName(po.t) + ' · 第 ' + po.t.L + ' 层' : '', c: ok && po.t.L >= 4 ? '#ffcf4a' : '#e8dcc4', ring: sel ? '#ffcf4a' : '#3d3a8c',
      tipOn: this.tipFn({ title: '遗像 · ' + Hk.n, c: '#ffcf4a', d: ok ? talLine(po.t) : '' }), onClick: () => { if (!setup) return; L.pid = L.pid === po.id ? null : po.id; S.click && S.click(); this.bump(); } }; });
  const achs = ACH.map(a => { const done = !!(p.ach2 || {})[a.k]; return { n: a.n, d: a.d, tok: '+' + a.tok, c: done ? '#ffcf4a' : '#a9a3c9', ring: done ? '#ffcf4a' : '#2b2461', op: done ? 1 : 0.7 }; });
  v.lg = { title: setup ? '投币前' : '遗像墙', tok: String(p.tokens || 0), leaders, kits, ports, hasPorts: ports.length > 0, noPorts: !ports.length, noPortT: '还没有遗像：一局输了，倒下的领袖会留下一张。', achs, isSetup: setup, isWall: !setup, closeT: setup ? '返回' : '关闭',
    close: () => { S.click && S.click(); this.lgClose(); }, go: () => this.lgGo() };
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  if (key === 'lg-tok') return { title: '代币', c: '#ffcf4a', d: '每一局结束和成就换来，用来买卡带。' };
  return oTip.apply(this, arguments);
};
const oBack = G.backAction; if (oBack) G.backAction = function () { if (this.lg) { this.lgClose(); return; } return oBack.apply(this, arguments); };
if (M.GUIDE) M.GUIDE.push(
  { id: 'portrait', cat: '机台', icon: 't_heart', title: '遗像', line: '倒下的领袖留下的一个天赋，新的一局可以带上一张。', scr: 'menu', sel: '[data-g="lg-wall"]', when: (g) => M.unfolded(g.prof) },
  { id: 'kits2', cat: '机台', icon: 'scroll', title: '卡带', line: '用代币买下，每局开始前插一盘。', scr: 'menu', sel: '[data-g="lg-wall"]', when: (g) => M.unfolded(g.prof) },
  { id: 'tokens2', cat: '机台', icon: 'e_coin', title: '代币', line: '每一局结束和成就换来，用来买卡带。', scr: 'menu', sel: '[data-g="lg-wall"]', when: (g) => M.unfolded(g.prof) });
})();

;
