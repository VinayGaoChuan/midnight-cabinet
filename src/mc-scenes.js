// ==== mc-scenes.js ====
(function () {
// Chapters, areas, waypoints and difficulties (user rulings 2026-09-26: 「世界分场景，每个场景一个最终首领」, then
// 「暗黑破坏神2 那种体验：从第一章打到最后一章，还愿意打不同难度，还愿意同一难度反复打」).
// · A world is a chapter. Its areas (the old scenes: 钟楼, 墓园 …) run end to end; an area is a small boss, then the
//   area's final boss. Chapters go in order: town → forest → … → casino.
// · Every boss beaten lights a waypoint at once (kept even if the run is lost later): the next run into this chapter
//   can start there, with a shop first and gold for an army. Nothing already beaten has to be played again.
// · An expedition goes as far as you dare: every boss beaten in the same run adds to what the retreat brings home (连战).
// · Clearing the last chapter opens the next difficulty (普通 → 噩梦 → 地狱): the same chapters, stronger enemies,
//   better pay, better blueprints, rarer relics more often; the leader can grow further.
// · To come back to a chapter already cleared, a daily 刷图 stele starts at the waypoint before one of its final bosses.
//   Every final boss has a building of its own (mc-bossbld.js) whose blueprint only it drops — the reason to farm it.
//   Every stele carries a daily modifier.
const M = window.MC, G = M.Game.prototype, DB = M.DB;
const A = (n, story, boss, cols) => ({ n, story, boss, cols: cols || [3, 3] });
const CHAPTERS = {
  town: [A('钟楼', '午夜的钟声是从钟楼上传下来的，敲钟的人从来没有下来过。', 'FB_bell'), A('墓园', '雾最浓的地方是镇外的墓园，新坟一夜比一夜多。', 'FB_grave')],
  forest: [A('德鲁伊', '守林的德鲁伊已经分不清人和树，闯进林子的都被他种进了土里。', 'FB_druid'), A('知识古树', '古树记得森林里发生过的每一件事，它不想再记住别的了。', 'FB_tree'), A('精灵女王', '女王在月池边等了三百年。她说，你就是她等的那个人。', 'FB_queen')],
  park: [A('旋转木马', '旋转木马还在转，每一匹木马上都坐着一个没回家的孩子。', 'FB_doll'), A('马戏大棚', '大棚里的笑声从来没停过，只是再也没有观众。', 'FB_clown')],
  harbor: [A('灯塔', '灯塔熄灭的那一晚，船长把整条船开进了港口。', 'FB_captain'), A('海底', '港口下面还有一座城，城门是一张嘴。', 'FB_maw')],
  foundry: [A('熔炉', '锅炉从来没熄过，因为工头从来没有下班。', 'FB_foreman'), A('总装车间', '工厂最后造出来的东西，把工厂里的人都装了进去。', 'FB_colossus')],
  ward: [A('急诊走廊', '护士长还在查房，床上的人一个都没少。', 'FB_nurse'), A('手术室', '院长说手术很成功，病人只是还没醒。', 'FB_surgeon')],
  starship: [A('舰桥', '舰桥上的倒计时还剩最后一分钟，已经剩了一百年。', 'FB_mech'), A('孵化舱', '船员没有离开，他们只是换了个样子留在船上。', 'FB_xeno')],
  hell: [A('地狱之门', '门后的锁链一头拴着狱卒，另一头拴着所有进来的人。', 'FB_jailer'), A('血河', '过血河只收一种船费，你身上正好有。', 'FB_ferry'), A('炼狱深处', '热风是它的呼吸。它醒着，一直醒着。', 'FB_demon')],
  casino: [A('牌桌', '荷官发牌从来不看牌，因为每一张牌都是他。', 'FB_croupier'), A('金库', '庄家在最里面等你。一切从这里开始，也在这里结束。', 'FB_dealer', [3, 3, 3])],
};
const ORDER = M.CHAPTER_ORDER = ['town', 'forest', 'park', 'harbor', 'foundry', 'ward', 'starship', 'hell', 'casino'];
M.CHAPTERS = CHAPTERS;
M.SCENES = Object.assign({ corridor: [{ n: '序章', story: '走廊尽头有一扇门。', boss: null, cols: [6] }] }, CHAPTERS);   // every area by name (tools/designcheck.js)
// the final bosses: table values only set the shape of the fight (a lot of life, slow heavy blows); the map scales them
const FB = (n, race, desc) => ({ n, q: 3, g: '不朽', voc: '首领', race, type: 'Titan', cost: 2000, hp: 10000, atk: 330, as: 100, spd: 0, ranged: 0, rad: 400, tr: [], desc });
Object.assign(DB, {
  FB_bell: FB('守钟人', '不死', '钟楼里的巨人，背上压着一口大钟。'), FB_grave: FB('守墓人', '僵尸', '从坟坑里爬出来的掘墓人，扛着一把铁锹。'),
  FB_druid: FB('德鲁伊', '自然', '头上长着鹿角的德鲁伊，半个身子已经是树。'), FB_tree: FB('知识古树', '自然', '森林里最老的树，树干上有一张脸。'), FB_queen: FB('精灵女王', '精灵', '浮在月池上的女王，戴着月牙王冠。'),
  FB_doll: FB('木马公主', '虚空', '旋转木马中央的瓷娃娃，脸上有一道裂缝。'), FB_clown: FB('小丑王', '恶魔', '大棚里的小丑，笑脸画到了耳朵根。'),
  FB_captain: FB('溺亡船长', '不死', '从海里站起来的船长，手里拖着船锚。'), FB_maw: FB('深海巨口', '野兽', '海底的一张嘴，头上挂着一盏灯。'),
  FB_foreman: FB('熔炉工头', '兽人', '戴着焊接面罩的工头，抡着一把铁锤。'), FB_colossus: FB('蒸汽巨像', '科技', '工厂最后造出来的巨像，胸口是一座锅炉。'),
  FB_nurse: FB('护士长', '不死', '戴着口罩的护士长，拿着一支巨大的针筒。'), FB_surgeon: FB('院长', '骷髅', '有四只手的院长，每只手里都拿着手术刀。'),
  FB_mech: FB('防卫机甲', '科技', '舰桥的防卫机甲，独眼一直亮着。'), FB_xeno: FB('异形母巢', '虚空', '孵化舱里的母巢，背上长满了卵。'),
  FB_jailer: FB('狱卒', '恶魔', '戴着铁面罩的狱卒，锁链缠满了双臂。'), FB_ferry: FB('血河摆渡人', '不死', '血河上的摆渡人，船桨上挂着一盏骷髅灯。'), FB_demon: FB('深渊魔王', '恶魔', '从岩浆里爬出来的恶魔，只露出上半身。'),
  FB_croupier: FB('荷官', '人类', '戴着遮光帽的荷官，手里的牌从不离手。'), FB_dealer: FB('庄家', '混沌', '戴高礼帽的庄家，面具是一张牌。'),
});
M.isFinalBoss = (k) => !!(DB[k] && DB[k].type === 'Titan');
// every small boss has a fixed body and a name of its own (user ruling 2026-09-26: 「每个小boss都要有个固定的名字，例如
// 天马，虫王……这样玩家在聊天的时候，能说自己打到哪个小boss了」), one per area, in order (金库 has two)
const MB = M.MINI_BOSSES = {
  钟楼: [['GhostKnight', '更夫']], 墓园: [['DecayingChampionRat', '鼠王']],
  德鲁伊: [['HoneyBear', '巨掌']], 知识古树: [['VerdantWormKing', '虫王']], 精灵女王: [['Centaur', '奔雷']],
  旋转木马: [['Mimic', '惊喜盒']], 马戏大棚: [['OgreEnemy', '大力士']],
  灯塔: [['FourEyes', '灯眼']], 海底: [['Kraken', '克拉肯']],
  熔炉: [['SiegeRam', '破门锤']], 总装车间: [['EarthDragonIron', '铁龙']],
  急诊走廊: [['Needler', '针婆']], 手术室: [['ChaosButcher', '屠夫']],
  舰桥: [['EvilEyeDark', '哨眼']], 孵化舱: [['SpiderEmperorAnazos', '蛛皇']],
  地狱之门: [['Cerberus', '三头犬']], 血河: [['Shaman', '血巫']], 炼狱深处: [['ChaosGuardBlackKatos', '黑卡托斯']],
  牌桌: [['LeopardEmperorSavalon', '豹帝']], 金库: [['ChaosSoldier', '金甲卫'], ['EarthDragonKingGargon', '地龙王']],
};

// ───────── segments and columns of a chapter ─────────
// a segment: some random stops, a shop, a boss (small, or the area's final boss); the column after a boss (not the last)
// offers 撤离 next to the road on
const segCache = {};
M.segsOf = function (w) {
  if (segCache[w]) return segCache[w]; const out = [];
  (CHAPTERS[w] || []).forEach((a, ai) => a.cols.forEach((c, i) => { const fb = i === a.cols.length - 1 ? a.boss : null, mb = !fb && MB[a.n] && MB[a.n][i]; out.push({ mids: c, fb, area: ai, mb: mb ? { k: mb[0], n: mb[1] } : null }); }));
  let col = 1; out.forEach((s, i) => { if (i > 0) col++; s.col0 = col; col += s.mids + 2; }); out.cols = col;   // col0: where the segment's first stop is
  return (segCache[w] = out);
};
M.chapterIndex = (w) => ORDER.indexOf(w);

// ───────── difficulties and progress ─────────
const DIFF = M.DIFFS = [
  { n: '普通', c: '#cfd8e3', S: 0, cap: 14, loot: 1, exp: 1, bb: 0.1, q: 0, lv: 20 },
  { n: '噩梦', c: '#b86bff', S: 5, cap: 21, loot: 1.6, exp: 1.5, bb: 0.16, q: 0.8, lv: 30 },
  { n: '地狱', c: '#e8434f', S: 10, cap: 28, loot: 2.4, exp: 2, bb: 0.24, q: 1.6, lv: 40 },
];
const dOf = (m) => Math.max(0, Math.min(2, (m && m.diff) || 0));
M.diffOf = (m) => DIFF[dOf(m)];
const prog = (m, d) => { m.prog = m.prog || {}; const k = 'd' + (d == null ? dOf(m) : d); return m.prog[k] || (m.prog[k] = { wp: {}, clr: {} }); };
M.wpOf = (m, w, d) => prog(m, d).wp[w] || 0;
M.chClear = (m, w, d) => !!prog(m, d).clr[w];
M.frontier = (m) => ORDER.find(w => !M.chClear(m, w)) || null;
// old saves (scenes, 2026-09-26 morning): scenes cleared → waypoints; a world cleared before → its chapter cleared
M.sceneFix = function (m) {
  if (!m || m.prog) return; const p = prog(m, 0);
  Object.keys(m.cleared || {}).forEach(w => { if (CHAPTERS[w]) p.clr[w] = 1; });
  Object.keys(m.scn || {}).forEach(w => { const n = m.scn[w], segs = M.segsOf(w); if (!segs.length) return; let k = 0; for (let a = 0; a < n && a < CHAPTERS[w].length; a++) k += CHAPTERS[w][a].cols.length; if (k >= segs.length) p.clr[w] = 1; else p.wp[w] = k; });
  m.diff = m.diff || 0; m.diffMax = m.diffMax || 0;
};
M.sceneDone = (m, w) => { M.sceneFix(m); return M.chClear(m, w) ? CHAPTERS[w].length : 0; };

// ───────── the day's steles: the story, and a place to farm ─────────
// modifiers make the same chapter play differently from one day to the next
const MODS = M.STELE_MODS = {
  fog: { n: '浓雾', d: '视野 -1，敌人生命和攻击 -8%' },
  blood: { n: '血月', d: '每段多一场精英战，图纸掉率 ×1.5' },
  harvest: { n: '丰收', d: '物资 ×1.5' },
  lesson: { n: '授业', d: '领袖经验 ×1.4' },
  bounty: { n: '悬赏', d: '每场战斗初始积分倍率 +0.3' },
  veteran: { n: '老兵', d: '敌人生命和攻击 +10%，暗金宝物的掉率翻倍' },
};
const rng = (seed) => { let s = seed % 2147483647 || 1; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; };
M.worldShow = (m) => (m.day >= 6 ? 3 : m.day >= 2 ? 2 : 1);
// the leader grows further once a harder difficulty is open (20 / 30 / 40)
const syncLv = (m) => { M.LV_MAX = Math.max(20, DIFF[Math.min(2, (m && m.diffMax) || 0)].lv); };
M.worldsOpen = function (m) {
  M.sceneFix(m); syncLv(m); const d = dOf(m), o = m.offers;
  if (o && o.day === m.day && o.diff === d && o.v === 3 && o.list.every(k => CHAPTERS[k])) return o.list;
  const r = rng(m.day * 7919 + d * 131 + (m.seed || (m.seed = Math.floor(Math.random() * 1e6))));
  const list = [], starts = [], farm = [], mods = [], front = M.frontier(m);
  if (front) { list.push(front); starts.push(M.wpOf(m, front)); farm.push(0); }
  const done = ORDER.filter(w => M.chClear(m, w)).sort(() => r() - 0.5);
  for (const w of done) { if (list.length >= (front ? M.worldShow(m) : 3)) break; const segs = M.segsOf(w), fbs = segs.map((s, i) => (s.fb ? i : -1)).filter(i => i >= 0); list.push(w); starts.push(fbs[Math.floor(r() * fbs.length)]); farm.push(1); }
  const mk = Object.keys(MODS); list.forEach(() => mods.push(mk[Math.floor(r() * mk.length)]));
  m.offers = { v: 3, day: m.day, diff: d, list, starts, farm, mods, tiers: list.map((_, i) => Math.min(2, i)) };
  return list;
};
const offerFor = (m, w) => { const o = m.offers || {}, i = (o.list || []).indexOf(w); return i < 0 ? { start: M.wpOf(m, w), farm: 0, mod: null } : { start: (o.starts || [])[i] || 0, farm: (o.farm || [])[i] || 0, mod: (o.mods || [])[i] }; };
// what a stele leads to, in words
M.sceneOf = function (m, w) {
  const L = CHAPTERS[w]; if (!L) return null; M.sceneFix(m); const o = offerFor(m, w), segs = M.segsOf(w), s = Math.min(segs.length - 1, o.start || 0), a = L[segs[s].area];
  return Object.assign({ i: segs[s].area, of: L.length, w, replay: !!o.farm, start: o.start || 0, segs: segs.length, mod: o.mod, chapter: M.chapterIndex(w) + 1 }, a, { bosses: segs.length - (o.start || 0) });
};

// ───────── the run: a chapter from a waypoint ─────────
const oGen = M.genMap2;
M.genMap2 = function (run, meta) {
  if (run && run.region && !run.region.tut && run.regionKey && CHAPTERS[run.regionKey] && !run.chap) {
    const m = meta || run.M, w = run.regionKey, o = offerFor(m, w), segs = M.segsOf(w), from = Math.min(segs.length - 1, o.start || 0);
    run.chap = { w, from, farm: !!o.farm, mod: o.mod, diff: dOf(m) }; run.startSeg = from; run.bossN = 0;
    run.scene = M.sceneOf(m, w);
    run.len = Object.assign({}, run.len, { n: run.scene.n, boss: segs.length, from, wpShop: from > 0, mids: segs.map(s => s.mids), fbs: segs.map(s => s.fb), mid: [3, 3], fullCols: segs.cols });
    run.colOff = from > 0 ? segs[from].col0 - 2 : 0;   // the run's first stop sits where the chapter's segment starts
  }
  const res = oGen.apply(this, arguments), map = res && res.nodes ? res : run.map;
  // the shop straight after a waypoint sells units
  if (map && map.nodes && run.chap && run.chap.from > 0) map.nodes.filter(n => n.type === 'shop' && n.col === 1).forEach(n => { n.preBoss = true; n.shop = M.shopKindFor(n, run); });
  if (map && map.nodes && run.chap) map.nodes.forEach(n => { const mb = M.miniOf(run, n); if (mb) n.mbN = mb.n; });   // the small boss's own name on its node
  if (map && map.nodes && M.baseMods(meta || run.M).seeElite) map.nodes.forEach(n => { if (n.type === 'elite' || n.type === 'boss') n.seen = true; });   // 侦察: elites and bosses show from the start
  return res;
};
const oLv = M.levelAt;
M.levelAt = (run, node) => oLv(run, node) + (run.colOff || 0) * (run.lvlStep || 0);
// a run from a waypoint gets gold for the army it would have bought on the way (called at the end of newRun3, mc-danger.js)
M.CHAPTER_GRANT = 0.33;
M.chapterGrant = function (run) {
  if (!run || !run.chap || !run.chap.from) return 0; let g = 0;
  for (let c = 1; c < run.colOff + 2; c++) g += M.budgetAt(run.lvl0 + c * run.lvlStep);
  g = Math.round(g * M.CHAPTER_GRANT / 5) * 5; run.wallet += g; run.grant = g; return g;
};
// the difficulty's pay, and the day's modifier
const oNR = M.newRun3;
M.newRun3 = function (meta, hero, worldKey) {
  const run = oNR.apply(this, arguments); if (!run || !run.chap) return run;
  const k = run.chap.mod, D = M.diffOf(meta);
  run.lootMul *= D.loot; run.mods.exp = (run.mods.exp || 0) + (D.exp - 1);
  if (k === 'harvest') run.lootMul *= 1.5;
  if (k === 'lesson') run.mods.exp = (run.mods.exp || 0) + 0.4;
  if (k === 'bounty') run.startMult = Math.round(((run.startMult || 0) + 0.3) * 10) / 10;
  if (k === 'blood') run.bpMul = (run.bpMul || 1) * 1.5;
  if (k === 'fog') { run.vision = Math.max(1, (run.vision || 2) - 1); run.modEk = 0.92; }
  if (k === 'veteran') run.modEk = 1.1;
  if (k === 'blood' && run.map) { const byS = {}; run.map.nodes.forEach(n => { if (n.type === 'normal' && n.seg > run.startSeg && !byS[n.seg]) { byS[n.seg] = 1; n.type = 'elite'; if (M.baseMods(run.M).seeElite) n.seen = true; } }); }
  return run;
};

// ───────── boss fights: the boss alone (user ruling 2026-09-26); small bosses often of the chapter's own peoples ─────────
M.miniOf = (run, node) => { const sg = run && run.chap && node && node.type === 'boss' && !node.fb && M.segsOf(run.regionKey)[node.seg || 0]; return (sg && sg.mb && DB[sg.mb.k]) ? sg.mb : null; };
const oCfg = M.makeBattleCfg;
M.makeBattleCfg = function (run, node) {
  const cfg = oCfg.apply(this, arguments);
  if (!node || node.type !== 'boss') return cfg;
  const b = cfg.list.find(s => s.boss);
  if (node.fb) { cfg.list = [{ type: node.fb, boss: 1, fb: 1, spawn: 0.3, y: 390 }]; cfg.fb = node.fb; }
  else if (b) {
    const mb = M.miniOf(run, node); if (mb) { b.type = mb.k; b.nm = mb.n; }
    cfg.list = [Object.assign(b, { spawn: 0.3, y: 390 })]; cfg.mb = 1;
  }
  return cfg;
};
// the fight's announcement names the boss under 首领战 (a small boss's own name, or the final boss's)
const oBegin = G.beginBattle;
G.beginBattle = function (n) {
  const r = oBegin.apply(this, arguments), B = this.introBanner, cfg = this.cfg;
  if (B && n && n.type === 'boss' && cfg && (cfg.fb || cfg.mb)) { const b = cfg.list.find(x => x.boss); const nm = cfg.fb ? DB[cfg.fb].n : b && (b.nm || (DB[b.type] && DB[b.type].n)); if (nm) B.sub = nm; }
  return r;
};
M.nodeDesc = ((o) => (n) => (!n.seen || n.type !== 'boss' ? o(n) : n.final ? '击败它就通关这一章' : n.fb ? '这个区域的最终首领：打倒它，基地核心 +1，还可能掉下它的专属建筑图纸' : '击败它才能继续前进，还会点亮一个路标'))(M.nodeDesc);
const oLabel = M.nodeLabel;
M.nodeLabel = (n) => (n.seen && n.type === 'boss' && (n.fb || n.mbN) ? (n.fb ? DB[n.fb].n : n.mbN) : oLabel(n));

// ───────── a boss beaten: waypoint, 连战, and a final boss's own rewards ─────────
M.STREAK = 0.15;
const oSettle = G.startSettle;
G.startSettle = function () {
  const r = oSettle.apply(this, arguments), st = this.settle, n = this.node, run = this.run, m = this.meta;
  if (!st || !st.good || !n || n.type !== 'boss' || !run || !run.chap || run.region.tut) return r;
  const w = run.chap.w, p = prog(m), put = (t, c, icon) => st.lines.push({ t, c, icon });
  run.bossN = (run.bossN || 0) + 1;
  if (!n.final) { if ((p.wp[w] || 0) < n.seg + 1 && !M.chClear(m, w)) { p.wp[w] = n.seg + 1; put('路标点亮：下次可以从这里出发', '#5fd0c0', 'up'); } put('连战 ×' + (1 + M.STREAK * run.bossN).toFixed(2) + '：撤离时带回的物资和经验', '#ffcf4a', 'up'); }
  if (n.fb) {
    if (!n.final) { const before = m.core == null ? M.CORE_MAX : m.core; m.core = Math.min(M.CORE_MAX || 3, before + 1); if (m.core > before) put('基地核心 +1', '#ff8ab0', 'up'); }
    // the boss's own building: its blueprint, now and then, until you have it (mc-bossbld.js)
    const D = M.diffOf(m), bk = M.BOSS_BLD && M.BOSS_BLD[n.fb], ch = D.bb * (run.chap.mod === 'veteran' ? 2 : 1);
    if (bk && !M.bbOwned(m, bk) && !run.loot.bp.includes('bbp:' + bk) && Math.random() < ch) { const k = 'bbp:' + bk; run.loot.bp.push(k); const I = M.itemInfo(k); put('掉落：' + I.n + '（首领建筑）', '#ffb13a', I.icon); if (st.tiles) st.tiles.push({ icon: I.icon, v: 1, c: '#ffb13a', to: 'rbp', n: I.n, key: k }); }
  }
  this.save();
  return r;
};
// what comes home: 连战 multiplies it
const oWin = G.runWin;
G.runWin = function (kind) {
  const run = this.run, m = this.meta, L = run && run.loot, ch = run && run.chap;
  if (L && ch && !run.region.tut) {
    const k = 1 + M.STREAK * (run.bossN || 0); L.supplies = Math.round(L.supplies * k); L.exp = Math.round(L.exp * k);
  }
  const r = oWin.apply(this, arguments);
  if (!ch || !run || run.region.tut) return r;
  const e = this.endInfo, w = ch.w, p = prog(m);
  if (e && (run.bossN || 0) > 0) e.lines = (e.lines || []).concat([{ k: '连战', v: '×' + (1 + M.STREAK * run.bossN).toFixed(2), c: '#ffcf4a' }]);
  if (kind === 'clear') {
    const first = !M.chClear(m, w); p.clr[w] = 1; p.wp[w] = 0; if (dOf(m) === 0) m.cleared[w] = true;
    const idx = M.chapterIndex(w), next = ORDER[idx + 1];
    if (e) { e.title = '第 ' + (idx + 1) + ' 章通关'; e.sub = run.region.n + (first ? '通关。' : '又通关了一次。') + (first && next ? '下一章：' + M.WORLDS[next].n + '。' : ''); }
    if (first && w === ORDER[ORDER.length - 1] && dOf(m) < 2 && (m.diffMax || 0) <= dOf(m)) { m.diffMax = dOf(m) + 1; M.LV_MAX = Math.max(M.LV_MAX, DIFF[m.diffMax].lv); if (e) { e.title = DIFF[m.diffMax].n + '难度开启'; e.sub = '全部章节通关。传送门上可以换到' + DIFF[m.diffMax].n + '难度：同样的章节，更强的敌人，更好的收获。'; } }
  } else if (e && kind === 'extract') e.sub = (e.sub || '') + '路标还在，下次从这里接着走。';
  this.save();
  return r;
};

// ───────── the steles: chapter, area, where you start, the day's modifier ─────────
const oTip = G.steleTip;
G.steleTip = function (k) {
  const t = oTip.apply(this, arguments), sc = M.sceneOf(this.meta, k); if (!t || !sc) return t;
  const D = M.diffOf(this.meta), MOD = sc.mod && MODS[sc.mod];
  t.title = '第 ' + sc.chapter + ' 章 · ' + M.WORLDS[k].n + ' · ' + sc.n + (dOf(this.meta) ? '（' + D.n + '）' : '');
  const where = sc.replay ? '刷图：从「' + DB[CHAPTERS[k][sc.i].boss].n + '」之前的路标出发' : sc.start ? '从第 ' + sc.start + ' 个路标出发（先在夜市组一支部队），这一章还剩 ' + sc.bosses + ' 个首领' : '这一章 ' + sc.segs + ' 个首领';
  t.lines = [{ t: sc.story, c: '#e8dcc4' }, { t: where, c: '#a89ca8' }].concat(MOD ? [{ t: '今日「' + MOD.n + '」：' + MOD.d, c: '#ffcf4a' }] : []).concat((t.lines || []).filter(l => l.t !== '已通关'));
  return t;
};
const oNG = G.newGame;
if (oNG) G.newGame = function () { const r = oNG.apply(this, arguments); if (this.meta) { this.meta.prog = { d0: { wp: {}, clr: {} } }; this.meta.diff = 0; this.meta.diffMax = 0; } M.LV_MAX = 20; return r; };

// ───────── choosing the difficulty: tabs over the steles once 噩梦 is open ─────────
const tabs = [];
M.BASE_HOOKS.push(function (ctx, meta, bv, lights, phase) {
  if (phase !== 'top') return; tabs.length = 0; const g = M._g; if (!g || !g.portalOn || !g.portalOn() || !meta || !(meta.diffMax > 0) || !(bv.steles && bv.steles.length)) return;
  const top = Math.min(...bv.steles.map(s => s.y)), cx = bv.steles.reduce((a, s) => a + s.x + s.w / 2, 0) / bv.steles.length, U = M.UI, n = meta.diffMax + 1, W = 150, H = 48, y = Math.max(8, top - 78);
  for (let i = 0; i < n; i++) { const D = DIFF[i], on = dOf(meta) === i, x = Math.round(cx - (n * (W + 12)) / 2 + i * (W + 12)); tabs.push({ i, x, y, w: W, h: H });
    ctx.fillStyle = '#07060f'; ctx.fillRect(x - 4, y - 4, W + 8, H + 8); ctx.fillStyle = on ? '#2b2461' : '#1a1640'; ctx.fillRect(x, y, W, H); ctx.fillStyle = on ? D.c : '#3d3a8c'; ctx.fillRect(x, y, W, 4);
    if (U) U.text(ctx, D.n, x + W / 2, y + H / 2 + 2, 26, on ? D.c : '#a9a3c9', { outline: true }); }
});
const oClick = G.baseClick;
G.baseClick = function (sx, sy) {
  const t = this.portalOn && this.portalOn() && tabs.find(b => sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h);
  if (t) { if (dOf(this.meta) !== t.i) { this.meta.diff = t.i; this.meta.offers = null; M.Sfx.click(); this.toast(DIFF[t.i].n + '难度', DIFF[t.i].c); this.save(); if (this.bv) this.bv.steles = []; } return; }
  return oClick.apply(this, arguments);
};
M.diffTabs = () => tabs;

// ───────── first-look cards (mc-guide.js) ─────────
const wpRect = (g) => { const run = g.run, w = g.walker, map = run && run.map; if (!map || !w) return null; const n = map.nodes.find(x => x.type === 'extract' && x.seen && !x.done); if (!n) return null; const x = 960 + (n.x - w.camX), y = 560 + (n.y - 60 - w.camY); return x > 40 && x < 1880 && y > 120 && y < 1000 ? { x: x - 70, y: y - 70, w: 140, h: 140 } : null; };
if (M.GUIDE) M.GUIDE.push(
  { id: 'chapter', cat: '出征', icon: 'e_path', title: '章节', line: '每个世界是一章，按顺序打；一章分几个区域，每个区域的尽头是它的最终首领。', scr: 'base', at: (g) => M.STELE_AT && M.STELE_AT.scene && M.STELE_AT.scene(g) },
  { id: 'waypoint', cat: '出征', icon: 'g_gate', title: '路标', line: '打倒一个首领就点亮一个路标，下次可以直接从这里出发。', scr: 'world', at: wpRect },
  { id: 'streak', cat: '出征', icon: 'u_star', title: '连战', line: '同一趟里每打倒一个首领，撤离时带回的物资和经验就多 15%。', scr: 'world', at: wpRect, when: (g) => g.run && g.run.bossN > 0 },
  { id: 'farm', cat: '出征', img: () => M.spriteURL && M.spriteURL('skull', 4), title: '刷图', line: '通关过的章节会出现在碑上，直接从某个最终首领前的路标出发，去刷它的专属建筑图纸。', scr: 'base', at: (g) => M.STELE_AT && M.STELE_AT.scene && M.STELE_AT.scene(g), when: (g) => !!(g.meta && g.meta.offers && (g.meta.offers.farm || []).some(Boolean)) },
  { id: 'dmod', cat: '出征', icon: 't_clover', title: '今日修饰', line: '每块碑当天带一个修饰：浓雾、血月、丰收……悬浮碑可以看。', scr: 'base', at: (g) => M.STELE_AT && M.STELE_AT.scene && M.STELE_AT.scene(g) },
  { id: 'bossbld', cat: '房间', img: () => M.spriteURL && M.spriteURL('skull', 4), title: '首领建筑', line: '每个区域的最终首领有一座自己的建筑，图纸只从它身上掉；建好后立着它的石像或铜像。', scr: 'base', sel: '[data-g="nothing"]' },
  { id: 'minib', cat: '战斗', img: () => M.spriteURL && M.spriteURL('skull', 4), title: '小首领', line: '每个区域的小首领都有自己的名字，名字写在它头顶。', scr: 'battle', sel: '[data-g="nothing"]' },
  { id: 'diff', cat: '出征', icon: 't_sword', title: '难度', line: '全部章节通关后开噩梦，噩梦通关后开地狱：同样的章节，敌人更强，收获更好。', scr: 'base', at: (g) => { const t = tabs[0]; return t ? { x: t.x, y: t.y, w: tabs[tabs.length - 1].x + t.w - t.x, h: t.h } : null; } },
);
})();
