// ==== mc-game-c.js ====
(function () {
const M = window.MC, G = M.Game.prototype;
const now = () => performance.now();
Object.assign(G, {
  startTutorial() {
    const m = this.meta, h = m.heroes[0];
    this.run = M.newRun3(m, h, 'corridor', []); this.run.tut = true; this.enterWorld();
    this.toast('序章 · 旧公寓走廊', '#f2c14e');
    setTimeout(() => this.coachOnce('go', '点击发光的 → 箭头（或按 → 键）前进。路只能往前走，走过的节点不能回头。', 960, 880), 900);
  },
  enterWorld() { if (!this.walker || this.walker.map !== this.run.map) this.walker = new M.Walker2(this.run.map); this.trans = { kind: 'in', t: 0 }; this.modal = null; this.go('world'); },
  worldTick(dt) {
    const w = this.walker, run = this.run; if (!w) return;
    let zoom = 1, fade = 0;
    if (this.trans) { this.trans.t += dt; const q = Math.min(1, this.trans.t / 0.7);
      if (this.trans.kind === 'out') { zoom = 1 + 0.6 * q * q; fade = q; if (this.trans.t >= 0.75) { const n = this.trans.node; this.trans = null; this.beginBattle(n); return; } }
      else { zoom = 1.25 - 0.25 * (1 - Math.pow(1 - q, 3)); fade = 1 - q; if (q >= 1) this.trans = null; } }
    else if (!this.modal && !this.reel && !this.chest) w.update(dt, this.keys, (n) => this.arrive(n)); else w.follow(dt);
    if (run.tut && !w.edge && !this.modal && M.nodeAhead(run.map, w.node).length > 1) this.coachOnce('fork', '岔路！点击 ↑ 或 ↓ 箭头（或按键）选择要走的路。另一条路会就此关闭。', 960, 880);
    const c = this.ui.cv('world'); if (c) M.drawWorld2(c.getContext('2d'), run, w, { zoom, fade, dt });
  },
  worldMove(sx, sy) { if (!this.walker) return; const n = M.worldPick(this.run, this.walker, sx, sy); this.tipData = n ? { title: M.nodeLabel(n), c: n.type === 'boss' || n.type === 'elite' ? '#ff6a5a' : n.type === 'extract' ? '#5fd0c0' : '#f2c14e', kind: n.done ? '已经过' : '第 ' + (n.col + 1) + ' 站', d: M.nodeDesc(n) } : null; },
  gainBp(p) { return Math.random() < p; },
  runP(node) { return M.makeBattleCfg(this.run, { col: node.col, type: 'normal' }).P; },
  heroHeal(pct) { const h = this.run.hero, mx = M.heroMaxHp(h, this.meta), v = Math.round(mx * pct); h.hp = Math.min(mx, h.hp + v); M.Sfx.heal(); const p = this.fxPos('hp'); if (p) { this.fx.pop(p.x, p.y - 30, '+' + v, '#9cff7a', 40, { num: 1 }); this.fx.burst(p.x, p.y, '#9cff7a', 20); } this.pulse.hp = now(); return v; },
  heroHurt(pct) { const h = this.run.hero, mx = M.heroMaxHp(h, this.meta), v = Math.round(mx * pct); h.hp = Math.max(1, h.hp - v); M.Sfx.hit(); this.fx.flash('#ff2a2a', 0.3); this.fx.kick(12); const p = this.fxPos('hp'); if (p) this.fx.pop(p.x, p.y - 30, '-' + v, '#ff5a4a', 40, { num: 1 }); this.pulse.hp = now(); return v; },
  arrive(n) {
    const run = this.run; n.seen = true; n.out.forEach(e => run.map.nodes[run.map.edges[e].b].seen = true);
    run.steps++; if (run.skillCd > 0) { run.skillCd--; if (!run.skillCd) this.toast('领袖技能冷却完毕', '#ffcf4a'); }
    this.node = n; M.Sfx.land(2); this.fx.kick(4);
    if (M.NODE[n.type].battle) { this.trans = { kind: 'out', t: 0, node: n }; M.Sfx.whoosh(0.6); return; }
    if (n.type === 'shop') return this.openShop(n);
    if (n.type === 'chest') return this.nodeChest(n);
    this.openEvent(n);
  },
  finishNode() { if (this.node) this.node.done = true; this.modal = null; this.save(); this.bump(); },
  nodeChest(n) {
    const run = this.run, P = this.runP(n), luck = run.mods.eventLuck || 0;
    if (!run.tut && Math.random() < 0.12 - luck * 0.5) { this.evModal('宝箱', 'chest', '箱子张开了嘴——是宝箱怪！', [{ t: '迎战', fn: () => { n.type = 'elite'; this.modal = null; this.trans = { kind: 'out', t: 0, node: n }; } }], null, '#d0453c'); return; }
    const sc = Math.round(P * 18 * (1 + (run.mods.chest || 0))), items = [];
    items.push({ n: '积分 ' + M.fmt(sc), c: '#ffcc33', img: M.spriteCanvas('coin', 12), award: { k: 'wallet', v: sc } });
    items.push({ n: '物资', c: '#caa84a', img: M.spriteCanvas('sack', 12), award: { k: 'rsup', v: 30 } });
    if (run.tut || Math.random() < 0.3) { const k = M.pick(Object.keys(M.ITEMS)), q = 0; items.push({ n: M.ITEMS[k].name, sub: '支援道具', c: M.ITEM_C, img: M.spriteCanvas(M.ITEMS[k].icon, 12), award: { k: 'item', key: k, q } }); }
    if (run.tut || Math.random() < 0.25) { const b = M.dropBp(); const I = M.itemInfo(b); items.push({ n: I.n, sub: I.kind, c: I.c, img: M.spriteCanvas(I.icon, 12), award: { k: 'bp', key: b } }); }
    if (!run.tut && Math.random() < 0.05) { const t = 'tile:' + M.dropTile(); const I = M.itemInfo(t); items.push({ n: I.n, sub: '地脉结晶', c: I.c, img: M.spriteCanvas('gem', 12), award: { k: 'bp', key: t } }); }
    const best = items.reduce((a, b) => (M.QUALITY.findIndex(q => q.c === b.c) > M.QUALITY.findIndex(q => q.c === a.c) ? b : a), items[0]);
    this.openChest(items, best.c === '#caa84a' ? '#ffcc33' : best.c, () => this.finishNode());
  },
  evModal(title, img, text, choices, backIdx, col) { this.modal = { kind: 'event', title, img, text, border: col || '#8a6a3a', titleColor: col, at: now(), choices, back: backIdx == null ? null : () => choices[backIdx].fn() }; M.Sfx.whoosh(0.25); this.bump(); },
  evResult(text, color, gains, keep) {
    const md = this.modal, got = gains && gains.length ? this.award(gains, { x: 700, y: 470 }) : [];
    this.modal = { kind: 'event', title: md.title, img: md.img, text: text + (got.length ? '\n获得：' + got.join('、') : ''), titleColor: color, border: color || '#8a6a3a', at: now(), result: 1, choices: [{ t: '继续', gold: 1, fn: () => keep ? (this.modal = null) : this.finishNode() }] };
    this.modal.back = this.modal.choices[0].fn; this.bump();
  },
  openEvent(n) {
    const run = this.run, h = run.hero, P = this.runP(n), luck = run.mods.eventLuck || 0, fmt = M.fmt, C = (t, sub, fn, dis) => ({ t, sub, fn, dis });
    if (n.type === 'camp') { if (run.tut) this.coachOnce('camp', '营火可以回血。领袖的生命不会自动回复，要靠营火、事件，或者回基地治疗。', 960, 880); return this.evModal('营火', 'fire', '火堆还温着。可以歇一会儿，也可以整理装备。', [
      C('休息', '领袖回复 ' + (run.mods.campHalf ? 12 : 30) + '% 生命', () => { const v = this.heroHeal(run.mods.campHalf ? 0.12 : 0.3); this.evResult('你在火边睡着了。回复 ' + v + ' 生命。', '#9ccc6a'); }),
      C('磨刀', '本局领袖攻击 +15%', () => { run.runBuff.heroAtk = (run.runBuff.heroAtk || 0) + 0.15; this.evResult('刀口亮了。本局领袖攻击 +15%。', '#f2c14e'); })], null, '#ffb03a'); }
    if (n.type === 'recruit') { const pool = []; run.lastL = M.levelAt(run, n); for (let i = 0; i < 12 && pool.length < 3; i++) { const t = M.pickUnitQ(run); if (!pool.includes(t)) pool.push(t); } const opts = pool.map(t => C(M.QUALITY[M.DB[t].q].n + ' · ' + M.DB[t].n, M.DB[t].race + ' · ' + M.DB[t].voc + ' · ' + (M.traitsOf(t).map(T => T.n).join('、') || '无特性'), () => this.evResult(M.DB[t].n + ' 跟上了你。', M.QUALITY[M.DB[t].q].c, [{ k: 'unit', type: t }]), !M.canAdd(run, t))); opts.push(C('都不要', '', () => this.evResult('旗子在风里响了一会儿。', '#8d8496'))); return this.evModal('招募旗', 'banner', '旗子下面站着三个人影，只有一个能跟你走。', opts, 3, '#6fa8dc'); }
    if (n.type === 'extract') { const cfg = M.makeBattleCfg(run, n); return this.evModal('撤离点', 'door', '门后面是回基地的路。撤离需要坚守 ' + cfg.dur + ' 秒，成功就带走所有收获。领袖倒下则全部损失。放弃撤离，这扇门就再也回不来了。', [C('撤离', '进入坚守战', () => { this.modal = null; this.trans = { kind: 'out', t: 0, node: n }; }), C('继续探索', '放弃这个撤离点', () => this.finishNode())], 1, '#5fd0c0'); }
    const EV = M.EVENTS[n.ev], pay = M.nice(P * 8);
    if (run.tut && n.ev === 'musician') this.coachOnce('ev', '路上会遇到各种奇遇。每个选择都有代价，也可能有惊喜。', 960, 900);
    const map = {
      musician: [C('付 ' + fmt(pay) + ' 积分听一曲', '随机好处', () => { run.wallet -= pay; const r = Math.random() + luck; if (r < 0.3) this.evResult('一曲终了，什么也没发生。', '#8d8496'); else if (r < 0.65) { run.runBuff.unitAtk = (run.runBuff.unitAtk || 0) + 0.1; this.evResult('部队听得热血沸腾。本局部队攻击 +10%。', '#f2c14e'); } else { run.runBuff.mult = (run.runBuff.mult || 0) + 0.2; this.evResult('曲子里有好运气。本局初始倍率 +0.2。', '#ffcc33'); } }, run.wallet < pay), C('给他一首歌', '免费 · 物资', () => this.evResult('他点点头，从琴盒里拿出一袋东西给你。', '#caa84a', [{ k: 'rsup', v: 15 }])), C('离开', '', () => this.evResult('琴声在你背后停了。', '#8d8496'))],
      granny: [C('献出一名部队', '领袖回复 40% 生命', () => { const u = M.pick(run.roster); run.roster = run.roster.filter(x => x !== u); const v = this.heroHeal(0.4); this.evResult(M.DB[u.type].n + ' 被缝进了你的影子。回复 ' + v + ' 生命。', '#9ccc6a'); }, !run.roster.length), C('离开', '', () => this.evResult('她继续缝着什么。', '#8d8496'))],
      well: [C('投入 ' + fmt(pay) + ' 积分', '转一次滚轮', () => { run.wallet -= pay; const outs = [{ n: '空', c: '#6b6570', w: 25 }, { n: '双倍返还', c: '#ffcc33', w: 25 }, { n: '支援道具', c: '#b86bff', w: 20 }, { n: '物资', c: '#caa84a', w: 20 }, { n: '图纸', c: '#e0904a', w: 10 }]; const idx = outs.indexOf(M.wpick(outs, o => o.w)); const md = this.modal; this.modal = null; this.startReel({ title: '许愿井', iconKey: 'well', tiles: outs.map(o => ({ n: o.n, sub: '', c: o.c })), land: idx, ups: 0, onDone: () => { this.modal = md; if (idx === 0) this.evResult('井底什么也没回应。', '#8d8496'); if (idx === 1) this.evResult('井里吐出了双倍的积分。', '#ffcc33', [{ k: 'wallet', v: pay * 2 }]); if (idx === 2) this.evResult('捞到了一个小瓶子。', '#b86bff', [{ k: 'item', key: M.pick(Object.keys(M.ITEMS)), q: M.rollTier2(run) }]); if (idx === 3) this.evResult('捞上来一袋物资。', '#caa84a', [{ k: 'rsup', v: 60 }]); if (idx === 4) this.evResult('一张湿透的图纸。', '#e0904a', [{ k: 'bp', key: M.dropBp() }]); } }); }, run.wallet < pay), C('离开', '', () => this.evResult('你没有许愿。', '#8d8496'))],
      child: [C('带她走', '可能找到她藏起来的东西', () => { if (Math.random() < 0.6 + luck) { this.evResult('她把你带到一个藏东西的地方，然后不见了。', '#9ccc6a', [{ k: 'rsup', v: 40 }]); } else { this.evResult('一转身她就不见了。你总觉得背后有人。生命 -' + this.heroHurt(0.08) + '。', '#d0453c'); } }), C('无视', '', () => this.evResult('她一直看着你走远。', '#8d8496'))],
      grave: [C('挖开', '五五开', () => { if (Math.random() < 0.5 + luck) this.evResult('棺材里有一张图纸。', '#ffcc33', [{ k: 'bp', key: M.dropBp() }]); else { const md = this.modal; this.modal = Object.assign({}, md, { text: '土里伸出了手！', titleColor: '#d0453c', border: '#d0453c', choices: [{ t: '迎战', fn: () => { n.type = 'normal'; this.modal = null; this.trans = { kind: 'out', t: 0, node: n }; } }], back: null, at: now() }); this.fx.kick(20); M.Sfx.boom(); this.bump(); } }), C('默哀', '物资 +', () => this.evResult('你站了一会儿。墓碑后面有人留下了东西。', '#caa84a', [{ k: 'rsup', v: 15 }]))],
      clinic: [C('用药', '领袖回复 25% 生命', () => this.evResult('药很苦。回复 ' + this.heroHeal(0.25) + ' 生命。', '#9ccc6a')), C('搜刮', '物资 +，有风险', () => { let t = '你把柜子翻了个遍。'; if (Math.random() < 0.2) t += '你碰了不该碰的东西。生命 -' + this.heroHurt(0.08) + '。'; this.evResult(t, '#caa84a', [{ k: 'rsup', v: 40 }]); })],
      mirror: [C('凝视', '复制或者失去', () => { if (run.roster.length && Math.random() < 0.5 + luck) { const u = M.pick(run.roster); this.evResult('镜子里走出了另一个' + M.DB[u.type].n + '。', '#6fa8dc', [{ k: 'unit', type: u.type }]); } else if (run.roster.length) { const u = M.pick(run.roster); run.roster = run.roster.filter(x => x !== u); this.evResult(M.DB[u.type].n + ' 走进了镜子，没有回来。', '#d0453c'); } else this.evResult('镜子里只有你。', '#8d8496'); }), C('打碎', '得到道具，领袖受伤', () => { this.heroHurt(0.1); this.evResult('碎片划伤了你。镜框里藏着东西。', '#d0453c', [{ k: 'item', key: M.pick(Object.keys(M.ITEMS)), q: M.rollTier2(run) }]); }, run.items.indexOf(null) < 0)],
      altar: [C('献血', '领袖 -20% 生命，本局倍率 +0.5', () => { this.heroHurt(0.2); run.runBuff.mult = (run.runBuff.mult || 0) + 0.5; M.Sfx.mult(); this.evResult('蜡烛亮了一截。本局初始倍率 +0.5。', '#ffcc33'); }), C('离开', '', () => this.evResult('烛火跟着你晃了一下。', '#8d8496'))],
      peddler: [C('花 ' + fmt(pay) + ' 买一个道具', '随机支援道具', () => { run.wallet -= pay; this.evResult('货郎把瓶子塞到你手里。', '#b86bff', [{ k: 'item', key: M.pick(Object.keys(M.ITEMS)), q: M.rollTier2(run) }]); }, run.wallet < pay || run.items.indexOf(null) < 0), C('离开', '', () => this.evResult('货郎把布盖了回去。', '#8d8496'))],
    };
    const ch = map[n.ev]; this.evModal(EV.n, EV.sprite, EV.text, ch, ch.length - 1);
  },
  // ── shop ──
  openShop(n) { const run = this.run; run.lastP = this.runP(n); M.rollShop(run, true); run.shop.forEach(c => { if (!c.adj) { c.cost = M.nice(c.cost * M.priceMul(run)); c.adj = 1; } }); this.sel = null; this.go('shop'); if (run.tut) this.coachOnce('shop', '积分是局内唯一的货币。买下部队，它会加入你的队伍。三个相同的部队会自动升星。', 960, 760); },
  leaveShop() { if (this.reel) return; M.Sfx.click(); this.node.done = true; this.enterWorld(); },
  buy(i) {
    const run = this.run, c = run.shop[i]; if (!c || c.sold || this.reel) return;
    if (run.wallet < c.cost) { this.toast('积分不够', '#d0453c'); this.pulse['card' + i] = now(); return; }
    if (c.kind === 'unit' && !M.canAdd(run, c.type)) { this.toast('部队已满，先卖掉一个', '#d0453c'); return; }
    if (c.kind === 'item' && run.items.indexOf(null) < 0) { this.toast('支援道具最多 3 个', '#d0453c'); return; }
    const from = this.fxPos('card' + i) || { x: 960, y: 400 };
    this.hold('wallet', run.wallet); run.wallet -= c.cost; this.release('wallet'); c.sold = true; c.soldAt = now(); c.locked = false; M.Sfx.coin(); M.Sfx.stamp(); this.fx.explode(from.x, from.y, '#ffcc33', 1.1); this.fx.coins(from.x, from.y, 10, { v: 700 });
    if (c.kind === 'unit') this.award([{ k: 'unit', type: c.type }], from);
    if (c.kind === 'item') this.award([{ k: 'item', key: c.key, q: 0 }], from);
    if (c.kind === 'legion' || c.kind === 'field') { if (c.kind === 'legion') run.legion[c.key] = true; else run.field = c.key; const info = M.cardInfo(c); this.fly(info.icon, from, 'legion', '#ff9a3c', () => { this.pulse.legion = now(); }); }
    if (c.kind === 'wheel') { const idx = M.WHEEL.indexOf(M.wpick(M.WHEEL, x => x.w)); this.startReel({ title: '赌博滚轮', iconKey: 'wheel', tiles: M.WHEEL.map(w => ({ n: w.n, sub: '', c: w.c })), land: idx, ups: 0, onDone: () => {
      const C0 = { x: 960, y: 540 };
      if (idx === 0) this.toast('什么都没有', '#8d8496');
      if (idx === 1) this.award([{ k: 'wallet', v: c.cost * 2 }], C0);
      if (idx === 2) { const t = M.pickUnitQ(run); if (M.canAdd(run, t)) this.award([{ k: 'unit', type: t }], C0); else this.award([{ k: 'wallet', v: c.cost }], C0); }
      if (idx === 3) { run.startMult += 0.3; this.fx.pop(960, 540, '本局初始倍率 +0.3', '#ff9a3c', 60); }
      if (idx === 4) { if (run.items.indexOf(null) >= 0) this.award([{ k: 'item', key: M.pick(Object.keys(M.ITEMS)), q: M.rollTier2(run) }], C0); else this.award([{ k: 'wallet', v: c.cost }], C0); }
    } }); }
    this.bump();
  },
  lock(i) { const c = this.run.shop[i]; if (!c || c.sold) return; c.locked = !c.locked; M.Sfx.click(); this.bump(); },
  refresh() { const run = this.run, cost = M.nice(M.refreshCost(run) * M.priceMul(run)); if (this.reel) return; if (run.wallet < cost) { this.toast('积分不够', '#d0453c'); return; } this.hold('wallet', run.wallet); run.wallet -= cost; this.release('wallet'); M.rollShop(run, true); run.shop.forEach(c => { if (!c.adj) { c.cost = M.nice(c.cost * M.priceMul(run)); c.adj = 1; } }); this.shopAt = now(); M.Sfx.whoosh(0.3); this.bump(); },
  sellSel() { const run = this.run, u = run.roster.find(x => x.uid === this.sel); if (!u) return; const v = M.sellValue(run, u), from = this.fxPos('roster') || { x: 300, y: 900 }; run.roster = run.roster.filter(x => x !== u); this.sel = null; this.award([{ k: 'wallet', v }], from); this.bump(); },
  // ── battle ──
  beginBattle(n) {
    const run = this.run, cfg = M.makeBattleCfg(run, n); this.cfg = cfg; this.node = n;
    this.battle = new M.Battle2(run, cfg); this.settle = null; this.paused = false; this.lastCut = null; this.go('battle');
    const nm = { normal: '普通战', score: '积分战', hold: '坚守战', holdScore: '坚守积分战' }[cfg.mode] + (n.type === 'elite' ? ' · 精英' : n.type === 'boss' ? (n.final ? ' · 最终首领' : ' · 守关首领') : n.type === 'extract' ? ' · 撤离' : '');
    this.banner({ kind: 'win', text: nm, col: n.type === 'boss' || n.type === 'elite' ? '#ff6a5a' : n.type === 'extract' ? '#5fd0c0' : '#ffd970', life: 1.5, y: 520, sub: cfg.mode === 'normal' ? '全灭敌人' : cfg.mode === 'score' ? '积分目标 ' + M.fmt(cfg.target) : cfg.mode === 'hold' ? '坚守 ' + cfg.dur + ' 秒' : '坚守 ' + cfg.dur + ' 秒 · 目标 ' + M.fmt(cfg.target) });
    M.Sfx.whoosh(0.5); if (n.type === 'boss') M.Sfx.impact();
    if (run.tut) { if (n.col === 1) setTimeout(() => this.coachOnce('b1', '部队会自动上场作战。领袖站在左边的指挥位，部队全灭后会亲自上场。', 960, 300), 1600); if (cfg.mode === 'score') setTimeout(() => this.coachOnce('sc', '积分战：积分 = 基础积分 × 倍率。没达到目标，领袖会扣血。', 960, 300), 1600); if (n.type === 'boss') setTimeout(() => this.coachOnce('boss', '最终首领！打败它，序章就结束了。', 960, 300), 1600); }
  },
  battleTick(dt) {
    const b = this.battle; if (!b) return;
    if (!this.paused && !this.settle) b.step(dt * this.speed * (this.reel ? 0.03 : 1));
    if (b.cutin && b.cutin !== this.lastCut) { this.lastCut = b.cutin; this.banner({ kind: 'skill', text: b.cutin.text, sub: b.cutin.sub, col: b.cutin.col, img: M.spriteCanvas(b.cutin.sprite, 22), life: 1.25, y: 470 }); }
    if (this.run.tut && b.canCast() && !this.settle) this.coachOnce('skill', '领袖技能就绪！点击下方「技能」按钮释放。技能冷却按节点计算，每场最多用一次。', 640, 800, 615, 990);
    if (this.settle) this.settleTick(dt); else if (b.over && b.overT > 1.0) this.startSettle();
    const c = this.ui.cv('field'); if (c) b.render(c.getContext('2d'), { slow: this.reel ? 1 : 0 });
  },
  castSkill() { const b = this.battle, run = this.run; if (this.reel || this.settle || !b) return; if (!b.hero.bench) { this.toast('领袖已经上场，技能收起了', '#8d8496'); return; } if (run.skillCd > 0) { this.toast('技能冷却中：还要 ' + run.skillCd + ' 个节点', '#8d8496'); return; } if (b.skillUsed) { this.toast('本场已经用过技能了', '#8d8496'); return; } if (!b.castSkill()) this.toast('现在还不能释放', '#8d8496'); else this.coachData = null; },
  useSlot(i) {
    const run = this.run, b = this.battle; if (this.reel || this.settle || !b || b.over || !run.items[i]) return;
    const key = run.items[i], q0 = run.itemQ[i] || 0; run.items[i] = null; M.Sfx.click();
    const tier = M.rollTier2(run, q0), I = M.ITEMS[key];
    this.startReel({ title: I.name, iconKey: I.icon, itemMode: true, land: 0, ups: tier, tease: tier < 3, tiles: M.TIERS.map((t, k) => ({ n: t.n, sub: I.tiers[k], c: t.c })), onDone: () => { b.useItem(key, tier); this.toast(M.TIERS[tier].n + ' · ' + I.tiers[tier], M.TIERS[tier].c); } });
  },
  togglePause() { this.paused = !this.paused; M.Sfx.click(); this.bump(); },
  startSettle() {
    const b = this.battle, run = this.run, cfg = this.cfg, h = run.hero, m = this.meta, n = this.node, score = b.score, lines = [], mx = M.heroMaxHp(h, m);
    h.hp = Math.max(0, b.hero.alive ? b.hero.hp : 0);
    const dead = new Set(b.deadUids); run.roster = run.roster.filter(u => !dead.has(u.uid));
    let good = b.over !== 'dead', title = '胜利', col = '#ffd970';
    if (good && cfg.target) { if (score >= cfg.target) { title = '达标'; lines.push({ t: '积分达标', c: '#9ccc6a', icon: 'up' }); } else { const dmg = Math.round(mx * (0.08 + 0.22 * (1 - score / cfg.target)) * (1 - (run.mods.shortRed || 0))); h.hp = Math.max(0, h.hp - dmg); title = '积分不足'; col = '#ff6a5a'; lines.push({ t: '积分不足：领袖受到 ' + dmg + ' 伤害', c: '#ff6a5a', icon: 'skull' }); if (h.hp <= 0) good = false; } }
    if (run.tut && h.hp <= 0) { h.hp = Math.round(mx * 0.3); good = true; lines.push({ t: '序章中领袖不会死亡', c: '#8d8496' }); }
    if (!good) { title = '领袖倒下'; col = '#ff4a4a'; }
    if (good) {
      run.wallet += score; lines.push({ t: '积分 +' + M.fmt(score), c: '#ffcc33', icon: 'coin' });
      const sup = Math.round((8 + 4 * cfg.w) * run.lootMul * (1 + (run.mods.supplies || 0))); run.loot.supplies += sup; lines.push({ t: '物资 +' + sup, c: '#caa84a', icon: 'sack' });
      const ex = Math.round((b.kills * 3 + 10 * cfg.w) * (1 + (run.mods.exp || 0))); run.loot.exp += ex; lines.push({ t: '经验 +' + ex + '（带回基地生效）', c: '#9cff7a', icon: 'orb' });
      const pb = n.type === 'boss' ? 1 : n.type === 'elite' ? 0.45 : run.tut ? 0 : 0.06;
      if (Math.random() < pb) { const k = M.dropBp(n.type === 'boss' ? 1 : 0.3); run.loot.bp.push(k); const I = M.itemInfo(k); lines.push({ t: '掉落：' + I.n, c: I.c, icon: I.icon }); }
      if (n.type === 'boss' && !run.tut && Math.random() < 0.5) { const k = M.dropBp(1.5); run.loot.bp.push(k); const I = M.itemInfo(k); lines.push({ t: '掉落：' + I.n, c: I.c, icon: I.icon }); }
      if (n.type === 'boss' && !run.tut && Math.random() < 0.3) { const k = 'tile:' + M.dropTile(); run.loot.bp.push(k); const I = M.itemInfo(k); lines.push({ t: '掉落：' + I.n, c: I.c, icon: 'gem' }); }
      if (run.mods.postHeal) { const v = Math.round(mx * run.mods.postHeal); h.hp = Math.min(mx, h.hp + v); lines.push({ t: '战后喘息：回复 ' + v, c: '#9ccc6a', icon: 'up' }); }
    }
    if (dead.size) lines.push({ t: dead.size + ' 名部队永久阵亡', c: '#ff6a5a', icon: 'cross' });
    run.battles++;
    this.settle = { t: 0, good, title, col, lines, shown: 0, score, base: b.base, mult: b.mult, target: cfg.target, pass: score >= cfg.target, final: !good ? 'fail' : n.type === 'boss' && n.final ? 'clear' : n.type === 'extract' ? 'extract' : null };
    this.banner({ kind: 'win', text: title, col, col2: good ? '#8a4a10' : '#3a0000', life: 1.7, y: 420 });
    if (good && col !== '#ff6a5a') { M.Sfx.fanfare(); this.fx.confetti(150); this.fx.rays(960, 420, '#ffcc33', 1.7, { r: 800 }); this.fx.kick(20); } else { M.Sfx.lose(); this.fx.flash('#ff0000', 0.35); this.fx.kick(18); }
    this.bump();
  },
  settleTick(dt) { const st = this.settle; st.t += dt; const k = Math.floor((st.t - 1.7) / 0.28) + 1; if (st.t > 1.2 && st.t - dt <= 1.2) M.Sfx.whoosh(0.3); if (k > st.shown && st.shown < st.lines.length && st.t > 1.7) { st.shown++; M.Sfx.land(st.shown); } },
  settleNext() {
    const st = this.settle; if (!st || st.t < 1.8) return; if (st.shown < st.lines.length) { st.shown = st.lines.length; return; }
    M.Sfx.click(); this.node.done = true; this.settle = null; this.battle = null;
    if (st.final === 'fail') return this.runFail(); if (st.final || (this.run.tut && this.node.final)) return this.runWin(st.final || 'clear');
    this.enterWorld();
  },
  lootTiles() { const L = this.run.loot, out = [{ img: M.spriteURL('sack', 7), n: '物资', v: '+' + L.supplies, c: '#caa84a', icon: 'sack' }, { img: M.spriteURL('orb', 7), n: '经验', v: '+' + L.exp, c: '#9cff7a', icon: 'orb' }]; L.bp.forEach(k => { const I = M.itemInfo(k); out.push({ img: M.spriteURL(I.icon, 7), n: I.n, v: I.kind, c: I.c, icon: I.icon }); }); return out; },
  runWin(kind) {
    const m = this.meta, run = this.run, h = run.hero, L = run.loot;
    m.supplies += L.supplies; const tiles = [];
    L.bp.forEach(k => { if (k.startsWith('tile:')) { const at = M.tileSpot ? M.tileSpot(m) : null; if (at) { const [c, r] = at; m.base.cells[r][c].tile = k.slice(5); tiles.push({ c, r, t: k.slice(5) }); } } else M.invAdd(m, k, 1); });
    const ups = M.addExp(h, L.exp); h.runs++; h.relics = [];
    if (kind === 'clear' && !run.region.tut) m.cleared[run.regionKey] = true;
    m.runs++; const tut = !!run.region.tut;
    if (tut) { m.tutDone = true; m.baseTut = 0; } else this.pendingDay = true;
    this.save(); M.Sfx.fanfare();
    this.endInfo = { title: tut ? '序章结束' : kind === 'clear' ? '通关' : '撤离成功', color: kind === 'clear' ? '#ffd970' : '#5fd0c0', sub: tut ? h.name + ' 穿过走廊尽头的门，来到了一座地下基地。' : h.name + ' 带着收获回到了基地。' + (kind === 'clear' ? '「' + run.region.n + '」不会再出现。' : ''), tiles: this.lootTiles(), lines: [{ k: '领袖生命', v: Math.round(h.hp) + ' / ' + M.heroMaxHp(h, m), c: '#e8dcc4' }].concat(ups ? [{ k: '升级', v: h.name + ' 升了 ' + ups + ' 级', c: '#9cff7a' }] : []), newTiles: tiles, at: now() };
    this.fx.confetti(120); this.go('end');
  },
  runFail() {
    const m = this.meta, run = this.run, h = run.hero, md = M.heroMods(h, m);
    let invested = h.exp; for (let l = 1; l < h.lv; l++) invested += M.expNeed(l);
    const shards = M.deathShards ? M.deathShards(h, m) : Math.round((20 + h.lv * 15) * (1 + (md.deathShards || 0) + (M.baseMods(m).deathShards || 0))), orbs = Math.round(invested * 0.4 * (1 + (md.deathOrbs || 0)));
    const keep = (M.baseMods(m).bank || 0) + (md.bank || 0), kept = h.relics.slice(0, keep), lost = h.relics.slice(keep);
    m.relics = m.relics.filter(r => !lost.includes(r.id)); m.heroes = m.heroes.filter(x => x !== h); m.graveyard.push({ name: h.name, cls: h.cls, lv: h.lv, day: m.day });
    m.shards += shards; m.orbs += orbs; m.runs++;
    let extra = ''; if (!m.heroes.length) { m.heroes.push(M.newHero(m, null, 0)); extra = '招魂台自己亮了，送来了一名新领袖。'; }
    this.pendingDay = true; this.save(); M.Sfx.lose();
    this.endInfo = { title: '领袖死亡', color: '#ff4a4a', sub: h.name + '（Lv ' + h.lv + '）永远留在了' + run.region.n + '。本局收获全部丢失。' + extra, tiles: [{ img: M.spriteURL('shard', 7), n: '灵魂碎片', v: '+' + shards, c: '#b86bff', icon: 'shard' }, { img: M.spriteURL('orb', 7), n: '经验球', v: '+' + orbs, c: '#9cff7a', icon: 'orb' }], lines: [{ k: '保住的宝物', v: kept.length ? kept.length + ' 件' : '无', c: '#ffcc33' }, { k: '丢失的宝物', v: lost.length + ' 件', c: '#ff6a5a' }], at: now() };
    this.go('end');
  },
  endBack() {
    const info = this.endInfo; M.Sfx.click(); this.toBase();
    const cp = this.corePos();
    (info.tiles || []).forEach((t, i) => this.fx.fly(M.spriteCanvas(t.icon, 8), { x: 960, y: 540 }, cp, { col: t.c, delay: 0.3 + i * 0.12, s0: 1.2, s1: 0.4, dur: 0.8 }));
    (info.newTiles || []).forEach((t, i) => setTimeout(() => { const p = this.cellPos(t.c, t.r); this.fx.rays(p.x, p.y, M.TILES[t.t].c, 1.5, { r: 260 }); this.fx.pop(p.x, p.y, '新地格 · ' + M.TILES[t.t].n, M.TILES[t.t].c, 44); M.Sfx.up(2); }, 800 + i * 500));
    if (this.pendingDay) { this.pendingDay = false; setTimeout(() => { this.passDay(); setTimeout(() => this.checkRaid(), 1600); }, 900); }
  },
});
})();

;
