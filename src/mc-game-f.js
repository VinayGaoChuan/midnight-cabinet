// ==== mc-game-f.js ====
(function () {
const M = window.MC, G = M.Game.prototype, DB = M.DB;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const Q = M.QUALITY;
M.HEROES.butcherlord.skill.v = (lv) => 0.2 + 0.05 * Math.floor(lv / 3);
Object.keys(M.BUILDINGS).forEach(k => { const w = M.BUILDINGS[k].weapon; if (w && !w._s) { w._s = 1; w.dmg *= 9; } });
const qGlow = (q) => q >= 3 ? '0 0 26px ' + Q[3].c + ', 0 0 60px rgba(255,200,60,0.45)' : q === 2 ? '0 0 22px rgba(232,240,250,0.55)' : q === 1 ? '0 0 10px rgba(224,144,74,0.4)' : 'none';
const qBg = (q) => 'radial-gradient(ellipse at 50% 78%,' + Q[q].c + (q >= 2 ? '66' : '33') + ' 0%,rgba(20,14,24,0.95) 62%)';
M.qGlow = qGlow; M.qBg = qBg;
const oldBase = G.bldTip;
G.bldTip = function (key, c, r) {
  const m = this.meta, B = M.BUILDINGS[key];
  if (B.weapon && c != null && !M.weaponStats(m, c, r)) { const t = oldBase.call(this, key, null, null); if (M.cell(m, c, r) && M.cell(m, c, r).tile) { const T = M.TILES[M.cell(m, c, r).tile]; t.lines.push({ t: '地格加成 · ' + T.n + '：' + T.d, c: T.c }); } return t; }
  return oldBase.call(this, key, c, r);
};
G.unitTip = function (type) { return M.unitTip(type, null, this.run); };
G.runP = function (node) { return Math.max(4, M.budgetAt(M.levelAt(this.run, { col: node.col, type: 'normal' })) / 12); };
// ───────── battle ─────────
G.beginBattle = function (n) {
  const run = this.run, cfg = M.makeBattleCfg(run, n); this.cfg = cfg; this.node = n;
  this.battle = new M.Battle3(run, cfg); this.settle = null; this.paused = false; this.lastCut = null; this.go('battle');
  const nm = (cfg.mode === 'hold' ? '坚守战' : '普通战') + (n.type === 'elite' ? ' · 精英' : n.type === 'boss' ? (n.final ? ' · 最终首领' : ' · 守关首领') : n.type === 'extract' ? ' · 撤离' : '');
  // the announcement stays while both sides walk in, and leaves once everyone stands in place; the fight waits for it
  const b = this.battle;
  this.banner({ kind: 'win', text: nm, col: n.type === 'boss' || n.type === 'elite' ? '#ff6a5a' : n.type === 'extract' ? '#5fd0c0' : '#ffd970', life: 1.5, y: 520, sub: cfg.mode === 'hold' ? '坚守 ' + cfg.dur + ' 秒' : '全灭敌人', hold: () => this.battle === b && !b.over && b.t < b.entryEnd - 0.01 });
  this.introBanner = this.banners[this.banners.length - 1];
  M.Sfx.whoosh(0.5); if (n.type === 'boss') M.Sfx.impact();
  if (run.tut) {
    const T = { 1: ['b1', '部队会自动上场作战。领袖站在左边的指挥位，部队全灭后，领袖会亲自上场。鼠标悬浮在单位上能看到它的特性。'], 3: ['b3', '每场战斗的收益 = 基础积分 × 倍率。击杀敌人得到基础积分；精英、首领和部分特性能提高倍率，每次 +0.1。'], 5: ['b5', '这一场试试下方的支援道具：点击后滚轮会决定它的品质。'], 6: ['b6', '精英战！精英更强，击杀后倍率 +0.1。战斗胜利后，倒下的部队会全部复活。'], 9: ['boss', '最终首领！打败它，序章就结束了。'] }[n.col];
    if (T) setTimeout(() => this.coachOnce(T[0], T[1], 960, 300), 1600);
  }
};
G.startSettle = function () {
  const b = this.battle, run = this.run, cfg = this.cfg, h = run.hero, m = this.meta, n = this.node, score = b.score, lines = [], mx = M.heroMaxHp(h, m);
  h.hp = Math.max(0, b.hero.alive ? b.hero.hp : 0);
  let good = b.over !== 'dead', title = '胜利', col = '#ffd970';
  if (run.tut && h.hp <= 0) { h.hp = Math.round(mx * 0.3); good = true; lines.push({ t: '序章中领袖不会死亡', c: '#8d8496' }); }
  if (!good) { title = '领袖倒下'; col = '#ff4a4a'; }
  if (good) {
    run.wallet += score; lines.push({ t: '积分 +' + M.fmt(score) + '（' + M.fmt(b.base) + ' × ' + b.mult.toFixed(1) + '）', c: '#ffcc33', icon: 'coin' });
    const sup = Math.round((8 + 4 * cfg.w) * run.lootMul * (1 + (run.mods.supplies || 0))); run.loot.supplies += sup; lines.push({ t: '物资 +' + sup, c: '#caa84a', icon: 'sack' });
    const ex = Math.round((b.kills * 3 + 10 * cfg.w) * (1 + (run.mods.exp || 0))); run.loot.exp += ex; lines.push({ t: '经验 +' + ex + '（带回基地生效）', c: '#9cff7a', icon: 'orb' });
    const pb = n.type === 'boss' ? 1 : n.type === 'elite' ? 0.45 : run.tut ? 0 : 0.06;
    if (Math.random() < pb && !run.tut) { const k = M.dropBp(n.type === 'boss' ? 1 : 0.3); run.loot.bp.push(k); const I = M.itemInfo(k); lines.push({ t: '掉落：' + I.n, c: I.c, icon: I.icon }); }
    if (n.type === 'boss' && !run.tut && Math.random() < 0.3) { const k = 'tile:' + M.dropTile(); run.loot.bp.push(k); const I = M.itemInfo(k); lines.push({ t: '掉落：' + I.n, c: I.c, icon: 'gem' }); }
    if (run.mods.postHeal) { const v = Math.round(mx * run.mods.postHeal); h.hp = Math.min(mx, h.hp + v); lines.push({ t: '战后喘息：回复 ' + v, c: '#9ccc6a', icon: 'up' }); }
    const dn = b.deadUids.length; if (dn) lines.push({ t: dn + ' 名部队倒下，已全部复活', c: '#9cff7a', icon: 'up' });
    run.roster.forEach(u => { u.battles = (u.battles || 0) + 1; (DB[u.type].tr || []).forEach(t => { const T = M.TDB[t]; if (!T) return; const hh = M.TRAIT_H[T.cls.replace(/^Summon|Trait$/g, '')]; if (hh && hh.post) hh.post(b, null, T.v, u); }); });
    b.growLog.forEach(t => lines.push({ t, c: '#ffcc33', icon: 'up' }));
    if (!run.tut && Math.random() < 0.18) { const pos = b.heroDmgTaken > mx * 0.2 ? Math.random() < 0.3 : Math.random() < 0.75; const q = M.addQuirk(h, pos); if (q) lines.push({ t: h.name + ' 觉醒了性格「' + M.QUIRKS[q].n + '」：' + M.QUIRKS[q].d, c: M.QUIRKS[q].pos ? '#9ccc6a' : '#ff6a5a' }); }
  }
  run.battles++;
  this.settle = { t: 0, good, title, col, lines, shown: 0, score, base: b.base, mult: b.mult, target: 0, pass: true, final: !good ? 'fail' : n.type === 'boss' && n.final ? 'clear' : n.type === 'extract' ? 'extract' : null };
  this.banner({ kind: 'win', text: title, col, col2: good ? '#8a4a10' : '#3a0000', life: 1.7, y: 420 });
  if (good) { M.Sfx.fanfare(); this.fx.confetti(150); this.fx.rays(960, 420, '#ffcc33', 1.7, { r: 800 }); this.fx.kick(20); } else { M.Sfx.lose(); this.fx.flash('#ff0000', 0.35); this.fx.kick(18); }
  this.bump();
};
// ───────── shop ─────────
G.openShop = function (n) {
  const run = this.run; run.lastL = M.levelAt(run, n); M.rollShop(run); this.sel = null; this.shopAt = now(); this.go('shop');
  if (run.tut) { if (n.col === 4) this.coachOnce('shop', '夜市分三个区：部队、战旗、道具。卡片底色代表品质（普通 → 稀有 → 史诗 → 传说），越亮越强。鼠标悬浮看详情，点击直接购买。', 960, 700); else this.coachOnce('shop2', '点击下方队伍里的部队可以把它卖掉，换回一半价格。买到的战旗会显示在顶部。', 960, 700); }
};
G.buy = function (zone, i) {
  const run = this.run, list = run.shop[zone], c = list && list[i]; if (!c || c.sold || this.reel) return;
  const id = zone + i;
  if (run.wallet < c.cost) { this.toast('积分不够', '#d0453c'); this.pulse['card' + id] = now(); M.Sfx.hit(); return; }
  if (c.kind === 'unit' && !M.canAdd(run)) { this.toast('部队已满（' + M.ROSTER_CAP + '），先卖掉一个', '#d0453c'); return; }
  if (c.kind === 'item' && run.items.indexOf(null) < 0) { this.toast('支援道具最多 3 个', '#d0453c'); return; }
  const from = this.fxPos('card' + id) || { x: 960, y: 400 };
  this.hold('wallet', run.wallet); run.wallet -= c.cost; this.release('wallet'); c.sold = true; c.soldAt = now();
  M.Sfx.coin(); M.Sfx.stamp(); if (this.fx.explode) this.fx.explode(from.x, from.y, Q[c.q].c, 0.8 + c.q * 0.25); else this.fx.burst(from.x, from.y, Q[c.q].c, 30); if (this.fx.coins) this.fx.coins(from.x, from.y, 8, { v: 600 });
  if (c.q >= 2) { this.fx.rays(from.x, from.y, Q[c.q].c, 0.9, { r: 260 }); this.fx.kick(8 + c.q * 3); }
  if (c.kind === 'unit') this.award([{ k: 'unit', type: c.type }], from);
  if (c.kind === 'item') this.award([{ k: 'item', key: c.key, q: c.q }], from);
  if (c.kind === 'legion') { run.legion[c.key] = true; this.fly(M.spriteCanvas('flag', 8), from, 'banners', Q[c.q].c, () => { this.pulse.banners = now(); M.Sfx.up(1); }); }
  this.bump();
};
G.lock = function () {};
G.refresh = function () { const run = this.run, cost = M.refreshCost(run); if (this.reel) return; if (run.wallet < cost) { this.toast('积分不够', '#d0453c'); return; } this.hold('wallet', run.wallet); run.wallet -= cost; this.release('wallet'); run.refreshN = (run.refreshN || 0) + 1; M.rollShop(run); this.shopAt = now(); M.Sfx.whoosh(0.3); M.Sfx.lever(); this.bump(); };
G.sellSel = function () { const run = this.run, u = run.roster.find(x => x.uid === this.sel); if (!u) return; const v = M.sellValue(run, u), from = this.fxPos('roster') || { x: 300, y: 900 }; run.roster = run.roster.filter(x => x !== u); this.sel = null; this.award([{ k: 'wallet', v }], from); M.Sfx.coin(); this.bump(); };
// ───────── tutorial ─────────
const oldStartTut = G.startTutorial;
G.startTutorial = function () { oldStartTut.call(this); };
const oldArrive = G.arrive;
G.arrive = function (n) {
  if (this.run && this.run.tut) {
    const T = { 2: ['ev', '路上会遇到奇遇。每个选择都有代价，也可能有惊喜。'], 3: ['fork', '岔路：上面是战斗，下面是宝箱。选了一条，另一条就关闭了。'], 7: ['camp', '营火可以回血。领袖的生命不会自动恢复，要靠营火、事件，或者回基地治疗。'] }[n.col];
    if (T) setTimeout(() => this.coachOnce(T[0], T[1], 960, 880), 400);
  }
  return oldArrive.call(this, n);
};
const oldWin = G.runWin;
G.runWin = function (kind) { const tut = this.run && this.run.region.tut; if (tut) { M.invAdd(this.meta, 'bbp:tavern', 1); this.meta.supplies = Math.max(this.meta.supplies, 200); } oldWin.call(this, kind); if (tut) this.endInfo.tiles.push({ img: M.spriteURL('scroll', 7), n: '酒馆图纸', v: '建筑图纸', c: Q[0].c, icon: 'scroll' }); };
// ───────── base tutorial ─────────
G.baseTutStep = function () {
  const m = this.meta; if (this.screen !== 'base') return;
  if (m.baseTut === 0 && m.tutDone) { m.baseTut = 1; this.save(); }
  const C = M.CORE, cp = (c, r) => this.cellPos(c, r);
  if (m.baseTut === 1) { const p = cp(C.c, C.r); this.coach('这是你的地下基地。主基地会照亮周围 3 格。点击「主基地」打开仓库，看看你带回了什么。', p.x, p.y + 230, p.x, p.y); }
  if (m.baseTut === 3) { const p = cp(C.c - 1, C.r); this.coach('主基地两边各有一个空房间。点击左边的空房间，用「酒馆图纸」建造酒馆。普通品质的建筑只要 1 天。', p.x, p.y + 230, p.x, p.y); }
  if (m.baseTut === 4) { const p = cp(C.c, C.r + 1); this.coach('再点击主基地下方的岩层，挖出一块新空地。新挖的房间自带光亮，能照亮周围 1 格。发光的岩层是特殊地格。', p.x, p.y + 230, p.x, p.y); }
  if (m.baseTut === 5) { const p = this.bv.toScreen(M.BASE_GEO.DOOR_X, -130); this.coach('每次出征，基地就过去 1 天，挖掘和建造也会推进。点击地面上的「传送门」，再来一局！每 ' + M.RAID_EVERY + ' 天基地会遭到袭击，记得在地下造武器房间。', p.x, p.y + 330, p.x, p.y); }
};
const oldClose = G.closePanel;
G.closePanel = function () { const was = this.panel; const b0 = this.meta.baseTut; oldClose.call(this); const m = this.meta; if (was && was.key === 'core' && m.baseTut === 3) { this.coachData = null; setTimeout(() => this.baseTutStep(), 750); } };
const oldBuild = G.doBuild;
G.doBuild = function (c, r, key) { oldBuild.call(this, c, r, key); const m = this.meta; if (m.baseTut === 3 && M.cell(m, c, r).job) { m.baseTut = 4; this.save(); setTimeout(() => { this.closePanel(); setTimeout(() => this.baseTutStep(), 750); }, 900); } };
const oldDig = G.doDig;
G.doDig = function (c, r) { const m = this.meta, before = m.baseTut; oldDig.call(this, c, r); if (before === 4 && M.cell(m, c, r).job) { m.baseTut = 5; this.save(); setTimeout(() => { this.closePanel(); setTimeout(() => this.baseTutStep(), 750); }, 900); } };
const oldOpenW = G.openWorlds;
G.openWorlds = function () { if (this.meta.baseTut === 5) { this.meta.baseTut = 99; this.coachData = null; } oldOpenW.call(this); };
const GUIDE = { recruit: '酒馆建好了！点击它，花物资招募新领袖。每个领袖的天赋树都不一样。', forge: '锻造建筑建好了！点击它，用宝物图纸打造宝物。品质随机，越高能力越多。', train: '训练建筑建好了！点击它，把经验球灌给领袖。', med: '医疗建筑建好了！受伤的领袖每天会自动回血，也可以花物资急救。', defense: '武器房间建好了！基地遭袭时它会向地面开火。点击它能看到红色的射程范围，越深覆盖越窄。', power: '电力建筑建好了！顶部的电力数字变多了，可以建更多耗电的房间。', store: '后勤建筑建好了！它会每天产出物资或提供出征补给。', luck: '这座建筑会在出征时给你好运。', misc: '特殊建筑建好了！悬浮在它上面看看效果。' };
const oldPass = G.passDay;
G.passDay = function () { const logs = oldPass.call(this), m = this.meta; m.seenB = m.seenB || {}; const nb = logs.filter(l => l.key && !m.seenB[M.BUILDINGS[l.key].cat]); if (nb.length) { const l = nb[0], cat = M.BUILDINGS[l.key].cat; m.seenB[cat] = 1; this.save(); setTimeout(() => { const p = this.cellPos(l.c, l.r); this.coach(GUIDE[cat] || GUIDE.misc, p.x, p.y + 230, p.x, p.y); }, 2200); } return logs; };
// ───────── raid uses the new enemies ─────────
const OldRaid = M.Raid;
M.Raid = class extends OldRaid {
  constructor(meta) { super(meta); const bud = M.budgetAt(1 + meta.day * 0.32 + meta.raids * 0.4); this.list = []; for (let w = 0; w < 3; w++) M.pickWave(bud * 0.5).forEach((e, i) => this.list.push({ t: 2 + w * 9 + i * 0.6, type: e.type, side: Math.random() < 0.5 ? -1 : 1 })); if (meta.day >= 10) this.list.push({ t: 30, type: meta.day >= 20 ? 'ChaosGuardBlackKatos' : 'Kraken', side: 1 }); this.total = this.list.length; this.ents.forEach(e => { if (e.sprite === 'nail') { e.sprite = 'FootSoldier'; e.hp = e.max = DB.FootSoldier.hp * (1 + meta.day * 0.1); e.atk = DB.FootSoldier.atk * 2; } }); }
  spawn(s) { const E = DB[s.type], boss = E.g === '不朽' || s.type === 'Kraken'; this.ents.push({ side: 'E', kind: s.type, sprite: s.type, s: boss ? 6 : 4, x: s.side < 0 ? -350 : M.BCOLS * M.BASE_GEO.CW + 350, y: -18 - Math.random() * 30, hp: E.hp, max: E.hp, atk: E.atk, cd: 100 / (E.as || 100), range: E.ranged === 1 ? 300 : 70, spd: (E.spd || 300) * 0.3, ranged: E.ranged === 1, t: 0, alive: true, face: -s.side, boss, elite: E.g === '史诗', slow: 0 }); }
};
// ───────── view ─────────
const oldView = G.view;
G.view = function () {
  const run = this.run, s = this.screen, t0 = now();
  const v = oldView.call(this);
  if (this.tipData && v.tip) v.tip.lines = (this.tipData.lines || []).map(l => ({ segs: l.rich || [{ t: l.t, c: l.c }] }));
  if (v.w && run) {
    v.w.roster = run.roster.filter(u => !this.hideU.has(u.uid)).map(u => { const d = DB[u.type]; return { img: M.spriteURL(u.type, 4), q: d.q, bg: qBg(d.q), glow: qGlow(d.q), stars: u.lv > 1 ? 'Lv' + u.lv : '', tipOn: this.tipFn(() => M.unitTip(u.type, u, run)), border: this.sel === u.uid ? '#ffffff' : Q[d.q].c, onClick: () => { if (this.screen === 'shop') { this.sel = this.sel === u.uid ? null : u.uid; M.Sfx.click(); this.bump(); } } }; });
    v.w.items = run.items.map((k, i) => ({ has: !!k && !this.hideI.has(i), img: k ? M.spriteURL(M.ITEMS[k].icon, 5) : '', border: k ? Q[run.itemQ[i] || 0].c : '#3a3040', bg: k ? qBg(run.itemQ[i] || 0) : '#100c14', glow: k ? qGlow(run.itemQ[i] || 0) : 'none', tipOn: this.tipFn(k ? this.itemTip(k, run.itemQ[i]) : { title: '空道具栏', d: '宝箱、商店、事件都能获得支援道具。' }) }));
    v.w.rosterN = run.roster.length + ' / ' + M.ROSTER_CAP;
    v.w.banners = Object.keys(run.legion).map(k => { const L = M.LEGION[k]; return { n: L.name.replace('战旗', ''), c: Q[L.q].c, glow: qGlow(L.q), tipOn: this.tipFn({ title: L.name, c: Q[L.q].c, kind: Q[L.q].n + ' · 战旗', d: L.desc }) }; });
    v.w.hasBanners = v.w.banners.length > 0; v.w.banSc = this.ps('banners');
  }
  if (s === 'shop' && run && run.shop && run.shop.units) {
    const ra = this.shopAt ? cl((t0 - this.shopAt) / 450, 0, 1) : 1;
    const card = (zone, c, i, k) => { const id = zone + i, ok = run.wallet >= c.cost && !c.sold, dq = cl(ra * 1.8 - k * 0.1, 0, 1), sq = c.soldAt ? cl((t0 - c.soldAt) / 250, 0, 1) : 1, sh = this.pulse['card' + id] && t0 - this.pulse['card' + id] < 320 ? Math.round(Math.sin(t0 / 18) * 9) : 0;
      return { fx: 'card' + id, q: c.q, qn: Q[c.q].n, qc: Q[c.q].c, bg: qBg(c.q), glow: qGlow(c.q), price: M.fmt(c.cost), priceC: ok ? '#ffe08a' : '#ff6a5a', sold: !!c.sold, stampSc: 1 + 1.5 * (1 - M.ease.eo(sq)), dy: Math.round((1 - M.ease.eback(dq)) * 90) + 0, op: dq, sh, onBuy: () => this.buy(zone, i) }; };
    v.s = { wallet: v.w.wallet, walSc: v.w.walSc, refreshText: '刷新 · ' + M.refreshCost(run), refreshBorder: run.wallet >= M.refreshCost(run) ? '#e8dcc4' : '#3a3040' };
    v.s.units = run.shop.units.map((c, i) => { const d = DB[c.type]; return Object.assign(card('units', c, i, i), { img: M.spriteURL(c.type, 10), n: d.n, race: d.race, rc: M.RACES[d.race] || '#fff', voc: d.voc, vc: M.VOCS[d.voc] || '#aaa', trait: M.traitsOf(c.type).map(T => T.n).join(' · ') || '无特性', pw: '战力 ' + M.unitPower(c.type), tipOn: this.tipFn(() => { const t = M.unitTip(c.type, null, run); t.kind = Q[c.q].n + ' · 价格 ' + c.cost + ' · 点击购买'; return t; }) }); });
    v.s.banners = run.shop.banners.map((c, i) => { const L = M.LEGION[c.key]; return Object.assign(card('banners', c, i, 6 + i), { n: L.name, emb: L.name.slice(0, 1), desc: L.desc, tipOn: this.tipFn({ title: L.name, c: Q[c.q].c, kind: Q[c.q].n + ' · 战旗 · 价格 ' + c.cost, d: L.desc + '。本局一直生效。', lines: [{ rich: M.rich(L.desc) }] }) }); });
    v.s.items = run.shop.items.map((c, i) => Object.assign(card('items', c, i, 8 + i), { img: M.spriteURL(M.ITEMS[c.key].icon, 8), n: M.ITEMS[c.key].name, tipOn: this.tipFn(() => { const t = this.itemTip(c.key, c.q); t.kind = '支援道具 · 最低 ' + Q[c.q].n + ' · 价格 ' + c.cost; return t; }) }));
    v.s.noBanner = !v.s.banners.length;
    const u = run.roster.find(x => x.uid === this.sel); v.s.selOn = !!u; v.s.sell = u ? '卖出 ' + DB[u.type].n + ' +' + M.fmt(M.sellValue(run, u)) : '';
  }
  v.syn = [];
  if (this.settle || this.reel || this.chest) v.coachOn = false;
  return v;
};
})();

;
window.MC_ALL_READY = true; window.__mcLoading = true;
