// ==== mc-game-b.js ====
(function () {
const M = window.MC, G = M.Game.prototype;
const now = () => performance.now();
Object.assign(G, {
  baseTick(dt) {
    const bv = this.bv; bv.update(dt);
    if (this.raid) { M.__bvT = bv.t; this.raid.step(dt * 2); if (this.raid.shake) this.fx.kick(this.raid.shake * 0.5); if (this.raid.over && this.raid.overT > 1.2 && !this.raid.done) this.raidEnd(); }
    const c = this.ui.cv('base'); if (c) M.drawBase(c.getContext('2d'), this.meta, bv, { raid: this.raid, fire: this.raid ? this.raid.fire : null, showReach: this.showReach });
  },
  cellTip(p) {
    const m = this.meta;
    if (p.door && p.wing) return { title: '主基地 · 仓库', c: '#ffcf4a', kind: '耐久 ' + Math.round(m.portal.hp) + ' / ' + M.portalMax(m), d: '物资、图纸和宝物都在这里。被攻破，这一局结束。' };
    if (p.door) return { title: '主基地 · 传送门', c: '#5fd0c0', kind: '耐久 ' + Math.round(m.portal.hp) + ' / ' + M.portalMax(m), d: '点它选世界出征。' };
    const x = M.cell(m, p.c, p.r), T = x.tile ? M.TILES[x.tile] : null, tl = T ? [{ t: '特殊地格 · ' + T.n, c: T.c }, { t: T.d, c: '#cfc6b8' }] : [];
    if (x.b) return this.bldTip(x.b, p.c, p.r);
    if (x.job) return { title: x.job.kind === 'dig' ? '挖掘中' : M.BUILDINGS[x.job.key].n + '（建造中）', c: '#ffd060', d: '还需 ' + x.job.days + ' 天。', lines: tl };
    if (x.dug) return { title: '空房间', c: '#e8dcc4', d: '可以建造。', lines: tl };
    if (M.canDig(m, p.c, p.r)) return { title: '岩层', c: '#f2c14e', d: '挖掘：' + M.digCost(m, p.c, p.r) + ' 物资，1 天。', lines: tl };
    return { title: '岩层', c: '#8d8496', lines: tl };
  },
  bldTip(key, c, r) {
    const B = M.BUILDINGS[key], m = this.meta, lines = [{ t: M.QUALITY[B.q].n + ' · ' + M.STYLE[B.style] + ' · ' + M.CAT[B.cat], c: M.QUALITY[B.q].c }];
    if (B.weapon) lines.push({ t: '射程 ' + (c != null ? M.weaponStats(m, c, r).range : B.weapon.range) + ' 格', c: '#ff8a8a' });
    if (c != null) { const x = M.cell(m, c, r); if (x.tile) lines.push({ t: M.TILES[x.tile].n + '：' + M.TILES[x.tile].d, c: M.TILES[x.tile].c }); }
    return { title: B.n, c: B.q ? M.QUALITY[B.q].c : '#e8dcc4', kind: B.q ? '奇观' : '建筑', d: B.d, lines };
  },
  baseMove(sx, sy) { if (this.raid || (this.drag && this.drag.moved)) return; const p = this.bv.pick(sx, sy); const k = p ? (p.door ? 'door' : p.c + ',' + p.r) : null; if (k !== this.hoverK) { this.hoverK = k; this.bv.hover = p; if (p) M.Sfx.hover(); } this.tipData = p ? this.cellTip(p) : null; },
  baseLeave() { this.bv.hover = null; this.hoverK = null; this.tipData = null; },
  // the base camera is fully automatic: no dragging, pinching or wheel zoom (it frames the selected room by itself)
  basePDown() {},
  basePMove() { return false; },
  basePUp() {},
  baseWheel() {},
  baseClick(sx, sy) {
    if (this.raid || this.reel) return; if (this.dragEnd && now() - this.dragEnd < 350) return; M.Sfx.init(); this.lastPress = { el: null, x: sx, y: sy, t: now() };
    const p = this.bv.pick(sx, sy); if (!p) { this.closePanel(); return; }
    M.Sfx.click(); this.fx.clickBurst(sx, sy, '#ffe08a');
    if (p.door) return p.wing ? this.openWarehouse() : this.openWorlds();
    const m = this.meta, x = M.cell(m, p.c, p.r);
    this.showReach = null;
    if (x.b) { this.bv.focus(p.c, p.r); this.openPanel({ kind: 'room', c: p.c, r: p.r, key: x.b }); if (M.BUILDINGS[x.b].weapon) this.showReach = { c: p.c, r: p.r }; if (x.b === 'core' && m.baseTut === 1) { m.baseTut = 2; this.coach('仓库里是你所有的物资、图纸和宝物，有多少显示多少。鼠标悬浮可以查看详情，点击画面其它地方就能关闭。', 700, 900); this.save(); } }
    else if (x.job) { this.bv.focus(p.c, p.r); this.openPanel({ kind: 'job', c: p.c, r: p.r }); }
    else if (x.dug) { this.bv.focus(p.c, p.r); this.openPanel({ kind: 'build', c: p.c, r: p.r }); }
    else if (M.canDig(m, p.c, p.r)) { this.bv.focus(p.c, p.r); this.openPanel({ kind: 'dig', c: p.c, r: p.r }); }
    else { this.deny('只能挖掘与已有房间相邻的岩层', '#8d8496'); }
  },
  // 开面板是普通操作：轻轻一声，面板和里面的行分层滑进来（CSS data-enter），不放粒子、不震屏；换一个面板时重播入场
  openPanel(o) { const re = !!this.panel; this.panel = Object.assign({ at: now() }, o); M.Sfx.panelOpen(); this.bump(); if (re) this.replayEnter(); },
  closePanel() { if (!this.panel) return; const was = this.panel; this.panel = null; this.showReach = null; this.bv.home(); if (was.key === 'core' && this.meta.baseTut === 2) { this.meta.baseTut = 3; this.save(); } this.bump(); },
  baseTutStep() {
    const m = this.meta; if (this.screen !== 'base') return;
    if (m.baseTut === 0 && m.tutDone) { m.baseTut = 1; this.save(); }
    if (m.baseTut === 1) { const p = this.corePos(); this.coach('这是你的地下基地。点击「主基地」，打开仓库看看。', p.x, p.y + 220, p.x, p.y); }
    if (m.baseTut === 3) { const p = this.cellPos(M.CORE.c, M.CORE.r + 1); this.coach('点击主基地左、右、下方的岩层，挖出新房间（花物资和 1 个探索日）。发光的岩层是特殊地格，建在上面会有加成。', p.x, p.y + 200, p.x, p.y); }
    if (m.baseTut === 4) { const p = this.bv.toScreen(M.BASE_GEO.DOOR_X, -130); this.coach('每次出征，基地就过去 1 天，挖掘和建造也跟着推进。点击地面上的「传送门」，再点升起的碑出发。每 ' + M.RAID_EVERY + ' 天会有混沌来袭，记得在地下造武器房间。', p.x, p.y + 330, p.x, p.y); }
  },
  doDig(c, r) {
    const m = this.meta, cost = M.digCost(m, c, r);
    if (m.supplies < cost) { this.deny('物资不足', '#d0453c'); return; }
    this.hold('msup', m.supplies); M.startDig(m, c, r); this.release('msup');
    // 开挖是普通操作：按键弹一下，稍后地格上扬一阵土、一个小圈（按键 → 地格，前后错开），不炸开、不卡帧
    const p = this.cellPos(c, r); M.Sfx.dig(); this.juice('good', { sfx: false, p: 0.4 }); setTimeout(() => { this.fx.burst(p.x, p.y, '#8a6a40', 18, { v: 480 }); this.fx.ring(p.x, p.y, 10, 110, '#ffb050', 5, 0.3); this.fx.kick(3); this.fx.pop(p.x, p.y - 60, '开始挖掘 · 1 天', '#ffd060', 44); }, 90);
    this.panel = Object.assign({}, this.panel, { kind: 'job' });
    if (m.baseTut === 3) { m.baseTut = 4; setTimeout(() => this.baseTutStep(), 900); }
    this.save();
  },
  doBuild(c, r, key) {
    const m = this.meta, o = M.buildOptions(m, c, r).find(x => x.key === key);
    if (!o) return; if (o.why) { this.deny(o.why, '#d0453c'); return; }
    this.hold('msup', m.supplies); M.startBuild(m, c, r, key); this.release('msup');
    // 开工：普通 / 稀有建筑是小爽点（按键弹 → 地格上一圈光和尘），史诗 / 传说是大爽点（地格炸开）
    const p = this.cellPos(c, r), qc = M.QUALITY[o.B.q].c; M.Sfx.build(); this.juice(o.B.q >= 2 ? 'big' : 'good', { sfx: false, col: qc, p: 0.5 + o.B.q * 0.2 });
    setTimeout(() => { if (o.B.q >= 2) this.fx.explode(p.x, p.y, qc, 1.2 + o.B.q * 0.5); else { this.fx.flare(p.x, p.y, 140, qc, 0.22); this.fx.ring(p.x, p.y, 10, 140, qc, 6, 0.34); this.fx.burst(p.x, p.y, '#8a6a40', 14, { v: 420 }); this.fx.kick(4); } this.fx.pop(p.x, p.y - 70, o.B.n + ' 开工 · ' + o.days + ' 天', qc, 44); }, 110);
    this.panel = Object.assign({}, this.panel, { kind: 'job', at: now() }); this.save();
  },
  forgeOf(c, r) { const m = this.meta, x = M.cell(m, c, r), B = M.BUILDINGS[x.b], t = M.tileMod(m, c, r, x.b); return Object.assign({}, B.forge, { luck: t.forgeLuck || 0 }); },
  craftCost() { return Math.round(120 * (1 + (M.baseMods(this.meta).craftCost || 0))); },
  craft(key, c, r) {
    const m = this.meta, R = M.RELICS[key], cost = this.craftCost();
    if (!M.invHas(m, 'rbp:' + key)) { this.deny('没有「' + R.n + '」的图纸', '#8d8496'); return; }
    if (m.supplies < cost) { this.deny('物资不足', '#d0453c'); return; }
    m.supplies -= cost; M.invAdd(m, 'rbp:' + key, -1);
    const res = M.craftRelic3(m, key, this.forgeOf(c, r)); this.save();
    this.startReel({ title: '打造 · ' + R.n, iconKey: R.icon, itemMode: true, land: 0, ups: res.landQ, tease: res.landQ < 3, tiles: M.QUALITY.map((q, i) => ({ n: q.n, sub: M.statText(R.lines[i].k, R.lines[i].v), c: q.c })), onDone: () => {
      const col = M.QUALITY[res.r.q].c, img = M.spriteCanvas(R.icon, 16);
      this.fx.rays(960, 460, col, 2.2, { r: 700 }); this.fx.pop(960, 700, M.QUALITY[res.r.q].n + ' · ' + R.n, col, 80, { life: 1.8, rise: 20 }); M.Sfx.itemReveal(res.r.q);
      this.fx.fly(img, { x: 960, y: 460 }, this.corePos(), { col, delay: 1.1, s0: 1, s1: 0.3, dur: 0.9 });
      if (res.twin) setTimeout(() => { this.fx.pop(960, 800, '兵工厂额外打造了一件！', '#ffcc33', 50); M.Sfx.up(3); }, 900);
      this.toast(R.n + ' 已放进仓库', col);
    } });
  },
  recruit() {
    const m = this.meta, cost = M.recruitCost ? M.recruitCost(m) : 120;
    if (m.heroes.length >= M.heroCap(m)) { this.deny('领袖已满（上限 ' + M.heroCap(m) + '）', '#d0453c'); return; }
    if (m.supplies < cost) { this.deny('物资不足：招募要 ' + cost + ' 物资', '#d0453c'); return; }
    this.hold('msup', m.supplies); m.supplies -= cost; this.release('msup');
    let rar = M.RARITY.indexOf(M.wpick(M.RARITY, r => r.w)); if (M.hasBuilt(m, B => B.recruit && B.recruit.qUp)) rar = Math.max(1, rar); rar = Math.max(rar, M.baseMods(m).recruitMin || 0);
    this.startReel({ title: '招魂', iconKey: 'candle', itemMode: true, land: 0, ups: rar, tease: rar < 3, tiles: M.RARITY.map(r => ({ n: r.n, sub: '领袖', c: r.c })), onDone: () => {
      const h = M.newHero(m, null, rar); m.heroes.push(h); this.save(); const col = M.RARITY[rar].c;
      this.fx.rays(960, 460, col, 2.2); this.fx.pop(960, 700, M.heroN(h), col, 80, { life: 1.8, rise: 20 });
      this.fly(M.spriteCanvas(M.HEROES[h.cls].sprite, 14), { x: 960, y: 440 }, 'heroes', col, () => { this.pulse.heroes = now(); }, 1.0);
    } });
  },
  train(id, c, r) {
    const m = this.meta, h = m.heroes.find(x => x.id === id); if (!h) return;
    if (!m.orbs) { this.deny('没有经验球', '#8d8496'); return; }
    const mul = 1 + (M.baseMods(m).orbMul || 0), from = this.cellPos(c, r);
    const orbs = m.orbs; this.hold('morb', orbs); m.orbs = 0; this.release('morb');
    const ups = M.addExp(h, orbs * mul); h.hp = Math.min(h.hp, M.heroMaxHp(h, m)); this.save();
    for (let i = 0; i < 6; i++) this.fly('orb', { x: from.x + (Math.random() - 0.5) * 100, y: from.y }, 'hero-' + id, '#9cff7a', i === 5 ? () => { if (ups) { const p = this.fxPos('hero-' + id) || from; this.fx.pop(p.x, p.y - 90, '升级！Lv ' + h.lv, '#9cff7a', 56); this.fx.rays(p.x, p.y, '#9cff7a', 1.2, { r: 240 }); M.Sfx.up(3); } } : null, i * 0.07);
  },
  quickHeal(id) {
    const m = this.meta, h = m.heroes.find(x => x.id === id), mx = M.heroMaxHp(h, m);
    if (h.hp >= mx) return; if (m.supplies < 40) { this.deny('物资不足', '#d0453c'); return; }
    this.hold('msup', m.supplies); m.supplies -= 40; this.release('msup'); h.hp = Math.min(mx, h.hp + mx * 0.3); this.save(); M.Sfx.heal();
    const p = this.fxPos('hero-' + id); if (p) { this.fx.pop(p.x, p.y - 80, '+' + Math.round(mx * 0.3), '#9cff7a', 44, { num: 1 }); this.fx.burst(p.x, p.y, '#9cff7a', 16); }
  },
  openHero(id) { this.openPanel({ kind: 'hero', id }); },
  // no relics in the vault: straight in; with relics, the panel opens with last time's choice ticked (2026-09-25)
  openWarehouse() { this.bv.focusDoor && this.bv.focusDoor(); this.openPanel({ kind: 'room', c: M.CORE.c, r: M.CORE.r, key: 'core', top: 1 }); },
  pickWorld(k) { const m = this.meta, h = m.heroes.find(x => !x.status && x.hp > 0); if (!h) { this.deny('领袖还起不来', '#d0453c'); return; } const keep = (m.lastRelics || []).filter(id => m.relics.some(r => r.id === id)).slice(0, M.relicSlots(h, m)); this.openPanel({ kind: 'loadout', world: k, hero: h.id, relics: keep }); if (!m.relics.length) this.launch(); },
  toggleRelic(rid) { const p = this.panel, m = this.meta, h = m.heroes.find(x => x.id === p.hero), slots = M.relicSlots(h, m); const i = p.relics.indexOf(rid); if (i >= 0) p.relics.splice(i, 1); else if (p.relics.length < slots) { p.relics.push(rid); M.Sfx.land(p.relics.length); } else this.deny('这名领袖最多带 ' + slots + ' 件宝物', '#8d8496'); this.bump(); },
  pickHero(id) { const p = this.panel, m = this.meta, h = m.heroes.find(x => x.id === id); if (h.hp <= 0) { this.deny('重伤，先去治疗', '#8d8496'); return; } p.hero = id; p.relics = p.relics.slice(0, M.relicSlots(h, m)); M.Sfx.click(); this.bump(); },
  launch() {
    const p = this.panel, m = this.meta, h = m.heroes.find(x => x.id === p.hero);
    m.lastRelics = p.relics.slice(); this.panel = null; this.coachData = null; M.Sfx.launch();
    this.bv.tx = M.BASE_GEO.DOOR_X; this.bv.ty = -125; this.bv.tz = 3.4; this.fx.flash('#bff8ee', 0.2);
    setTimeout(() => { this.fx.flash('#e0fff5', 1); this.run = M.newRun3(m, h, p.world, p.relics); this.enterWorld(); this.toast(this.run.region.n + ' · ' + this.run.len.boss + ' 个首领 · ' + this.run.map.cols + ' 站', '#f2c14e'); }, 750);
  },
  restDay() { this.closePanel(); this.passDay(); setTimeout(() => this.checkRaid(), 1200); },
  passDay() {
    const m = this.meta, logs = M.advanceDay(m); m.portal.hp = Math.min(M.portalMax(m), m.portal.hp + M.portalMax(m) * 0.15); this.save();
    this.banner({ kind: 'win', text: '第 ' + m.day + ' 天', col: '#ffe8b0', col2: '#6a4a20', life: 1.6, y: 420 }); M.Sfx.whoosh(0.5);
    logs.forEach((l, i) => setTimeout(() => { if (l.c != null) { const p = this.cellPos(l.c, l.r); this.fx.rays(p.x, p.y, '#ffd060', 1.4, { r: 300 }); this.fx.pop(p.x, p.y - 40, l.t, '#ffe08a', 50, { slam: 1 }); this.fx.explode(p.x, p.y, '#ffd060', 1.6); M.Sfx.up(2); } else this.toast(l.t, '#9ccc6a'); }, 900 + i * 450));
    return logs;
  },
  checkRaid() {
    const m = this.meta;
    if (m.day % M.RAID_EVERY === 0 && m.lastRaid !== m.day && m.heroes.length) { setTimeout(() => this.startRaid(), 600); return true; }
    return false;
  },
  startRaid() {
    this.panel = null; this.coachData = null; this.bv.raidCam(); this.raid = new M.Raid(this.meta); this.go('raid'); M.Sfx.alarm();
    this.banner({ kind: 'win', text: '混沌来袭！', col: '#ff5a4a', col2: '#6a0a0a', sub: '第 ' + this.meta.day + ' 天夜里，怪物朝传送门涌来。', life: 2.4, y: 440 });
  },
  raidEnd() {
    const r = this.raid, m = this.meta; r.done = true;
    r.ents.forEach(e => { if (e.hero) e.hero.hp = Math.max(1, Math.round(e.hp)); });
    m.portal.hp = Math.max(0, Math.round(r.portal.hp)); m.lastRaid = m.day; m.raids++;
    if (r.over === 'lose') { this.save(); this.banner({ kind: 'win', text: '主基地被攻破', col: '#ff4a4a', col2: '#3a0000', life: 2.5 }); M.Sfx.lose(); setTimeout(() => { this.raid = null; this.go('over'); }, 2200); return; }
    const sup = 60 + m.day * 10, sh = 10 + m.day * 2;
    this.banner({ kind: 'win', text: '守住了！', col: '#ffd970', life: 2.2, sub: '击退 ' + r.kills + ' 个敌人 · 物资 +' + sup + ' · 灵魂碎片 +' + sh }); M.Sfx.fanfare(); this.fx.confetti(160); this.fx.rays(960, 470, '#ffcc33', 2);
    setTimeout(() => { this.raid = null; this.go('base'); this.bv.home(); this.hold('msup', m.supplies); this.hold('msh', m.shards); m.supplies += sup; m.shards += sh; this.save(); this.fly('sack', { x: 960, y: 540 }, 'msup', '#caa84a', () => this.release('msup')); this.fly('shard', { x: 960, y: 540 }, 'msh', '#b86bff', () => this.release('msh'), 0.2); }, 2300);
  },
  restart() { this.meta = M.resetMeta3(); this.meta.tutDone = true; this.meta.baseTut = 99; this.save(); this.toBase(); },
});
})();

;
