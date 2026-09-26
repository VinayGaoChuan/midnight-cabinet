// ==== mc-scenes.js ====
(function () {
// Worlds and scenes (user ruling 2026-09-26). A world has two or three scenes, each with its own story; the story sets
// its length, so a scene's length is fixed (how many segments, how many stops in each). Every scene ends with its own
// final boss — the scene is named after it (精灵之森: 德鲁伊 → 知识古树 → 精灵女王). The bosses in the middle of a scene
// are small bosses. A scene is cleared by killing its final boss; the world is cleared by clearing its last scene.
// Scenes go in story order: a world's stele always offers its first scene not yet cleared (a cleared world replays one).
//   cols: stops in each segment before its shop and boss (one segment per boss; all but the last end in a small boss)
//   boss: the final boss (M.DB, type 'Titan'; its look, arena and attacks are in mc-titan.js / mc-bossfight.js)
const M = window.MC, G = M.Game.prototype, DB = M.DB;
const S = (n, story, cols, boss) => ({ n, story, cols, boss });
const SCENES = M.SCENES = {
  corridor: [S('序章', '走廊尽头有一扇门。', [6], null)],
  town: [
    S('钟楼', '午夜的钟声是从钟楼上传下来的，敲钟的人从来没有下来过。', [3, 3], 'FB_bell'),
    S('墓园', '雾最浓的地方是镇外的墓园，新坟一夜比一夜多。', [2, 3, 3], 'FB_grave'),
  ],
  forest: [
    S('德鲁伊', '守林的德鲁伊已经分不清人和树，闯进林子的都被他种进了土里。', [3, 3], 'FB_druid'),
    S('知识古树', '古树记得森林里发生过的每一件事，它不想再记住别的了。', [2, 3, 3], 'FB_tree'),
    S('精灵女王', '女王在月池边等了三百年。她说，你就是她等的那个人。', [3, 3, 3], 'FB_queen'),
  ],
  park: [
    S('旋转木马', '旋转木马还在转，每一匹木马上都坐着一个没回家的孩子。', [3, 3], 'FB_doll'),
    S('马戏大棚', '大棚里的笑声从来没停过，只是再也没有观众。', [2, 3, 3], 'FB_clown'),
  ],
  harbor: [
    S('灯塔', '灯塔熄灭的那一晚，船长把整条船开进了港口。', [3, 3], 'FB_captain'),
    S('海底', '港口下面还有一座城，城门是一张嘴。', [2, 3, 3], 'FB_maw'),
  ],
  foundry: [
    S('熔炉', '锅炉从来没熄过，因为工头从来没有下班。', [3, 3], 'FB_foreman'),
    S('总装车间', '工厂最后造出来的东西，把工厂里的人都装了进去。', [2, 3, 3], 'FB_colossus'),
  ],
  ward: [
    S('急诊走廊', '护士长还在查房，床上的人一个都没少。', [3, 3], 'FB_nurse'),
    S('手术室', '院长说手术很成功，病人只是还没醒。', [2, 3, 3], 'FB_surgeon'),
  ],
  starship: [
    S('舰桥', '舰桥上的倒计时还剩最后一分钟，已经剩了一百年。', [3, 3], 'FB_mech'),
    S('孵化舱', '船员没有离开，他们只是换了个样子留在船上。', [2, 3, 3], 'FB_xeno'),
  ],
  hell: [
    S('地狱之门', '门后的锁链一头拴着狱卒，另一头拴着所有进来的人。', [3, 3], 'FB_jailer'),
    S('血河', '过血河只收一种船费，你身上正好有。', [2, 3, 3], 'FB_ferry'),
    S('炼狱深处', '热风是它的呼吸。它醒着，一直醒着。', [3, 3, 3], 'FB_demon'),
  ],
  casino: [
    S('牌桌', '荷官发牌从来不看牌，因为每一张牌都是他。', [3, 3], 'FB_croupier'),
    S('金库', '庄家在最里面等你。一切从这里开始，也在这里结束。', [2, 3, 3, 3], 'FB_dealer'),
  ],
};
// the final bosses: table values only set the shape of the fight (a lot of life, slow heavy blows); the map scales
// both to the scene (mc-power.js tuneBoss)
const FB = (n, race, desc) => ({ n, q: 3, g: '不朽', voc: '首领', race, type: 'Titan', cost: 2000, hp: 10000, atk: 330, as: 100, spd: 0, ranged: 0, rad: 400, tr: [], desc });
Object.assign(DB, {
  FB_bell: FB('守钟人', '不死', '钟楼里的巨人，背上压着一口大钟。'),
  FB_grave: FB('守墓人', '僵尸', '从坟坑里爬出来的掘墓人，扛着一把铁锹。'),
  FB_druid: FB('德鲁伊', '自然', '头上长着鹿角的德鲁伊，半个身子已经是树。'),
  FB_tree: FB('知识古树', '自然', '森林里最老的树，树干上有一张脸。'),
  FB_queen: FB('精灵女王', '精灵', '浮在月池上的女王，戴着月牙王冠。'),
  FB_doll: FB('木马公主', '虚空', '旋转木马中央的瓷娃娃，脸上有一道裂缝。'),
  FB_clown: FB('小丑王', '恶魔', '大棚里的小丑，笑脸画到了耳朵根。'),
  FB_captain: FB('溺亡船长', '不死', '从海里站起来的船长，手里拖着船锚。'),
  FB_maw: FB('深海巨口', '野兽', '海底的一张嘴，头上挂着一盏灯。'),
  FB_foreman: FB('熔炉工头', '兽人', '戴着焊接面罩的工头，抡着一把铁锤。'),
  FB_colossus: FB('蒸汽巨像', '科技', '工厂最后造出来的巨像，胸口是一座锅炉。'),
  FB_nurse: FB('护士长', '不死', '戴着口罩的护士长，拿着一支巨大的针筒。'),
  FB_surgeon: FB('院长', '骷髅', '有四只手的院长，每只手里都拿着手术刀。'),
  FB_mech: FB('防卫机甲', '科技', '舰桥的防卫机甲，独眼一直亮着。'),
  FB_xeno: FB('异形母巢', '虚空', '孵化舱里的母巢，背上长满了卵。'),
  FB_jailer: FB('狱卒', '恶魔', '戴着铁面罩的狱卒，锁链缠满了双臂。'),
  FB_ferry: FB('血河摆渡人', '不死', '血河上的摆渡人，船桨上挂着一盏骷髅灯。'),
  FB_demon: FB('深渊魔王', '恶魔', '从岩浆里爬出来的恶魔，只露出上半身。'),
  FB_croupier: FB('荷官', '人类', '戴着遮光帽的荷官，手里的牌从不离手。'),
  FB_dealer: FB('庄家', '混沌', '戴高礼帽的庄家，面具是一张牌。'),
});
M.isFinalBoss = (k) => !!(DB[k] && DB[k].type === 'Titan');

// ───────── which scene a world offers ─────────
// old saves: a world cleared before scenes existed counts as all its scenes cleared
M.sceneFix = function (m) { if (!m) return; m.scn = m.scn || {}; Object.keys(m.cleared || {}).forEach(w => { if (SCENES[w] && !(m.scn[w] >= SCENES[w].length)) m.scn[w] = SCENES[w].length; }); };
M.sceneDone = (m, w) => { if (m && !m.scn) M.sceneFix(m); return ((m && m.scn) || {})[w] || 0; };
M.sceneOf = function (m, w) {
  const L = SCENES[w]; if (!L) return null; const done = M.sceneDone(m, w);
  const i = done < L.length ? done : ((m.day || 1) * 7 + w.length) % L.length;
  return Object.assign({ i, of: L.length, w, replay: done >= L.length }, L[i]);
};

// ───────── the map: a scene's fixed segments ─────────
const oGen = M.genMap2;
M.genMap2 = function (run, meta) {
  if (run && run.region && !run.region.tut && run.regionKey && SCENES[run.regionKey] && !run.scene) {
    const sc = run.scene = M.sceneOf(meta || run.M, run.regionKey);
    run.len = Object.assign({}, run.len, { n: sc.n, boss: sc.cols.length, mids: sc.cols.slice(), mid: [sc.cols[0], sc.cols[0]] });
  }
  return oGen.apply(this, arguments);
};
M.nodeDesc = ((o) => (n) => (n.seen && n.type === 'boss' && n.final ? '击败它就能通关这个场景' : o(n)))(M.nodeDesc);

// ───────── boss fights: the boss alone (user ruling 2026-09-26) ─────────
const oCfg = M.makeBattleCfg;
M.makeBattleCfg = function (run, node) {
  const cfg = oCfg.apply(this, arguments);
  if (!node || node.type !== 'boss') return cfg;
  const b = cfg.list.find(s => s.boss);
  if (node.final && run.scene && run.scene.boss) { cfg.list = [{ type: run.scene.boss, boss: 1, fb: 1, spawn: 0.3, y: 390 }]; cfg.fb = run.scene.boss; }
  else if (b) { cfg.list = [Object.assign(b, { spawn: 0.3, y: 390 })]; cfg.mb = 1; }
  return cfg;
};

// ───────── clearing: the scene; the world when its last scene falls ─────────
const oWin = G.runWin;
G.runWin = function (kind) {
  const run = this.run, m = this.meta, w = run && run.regionKey, sc = run && run.scene, was = !!(m && m.cleared && m.cleared[w]);
  const r = oWin.apply(this, arguments);
  if (kind === 'clear' && sc && run && !run.region.tut) {
    m.scn = m.scn || {}; const n = (SCENES[w] || []).length;
    if (!sc.replay) m.scn[w] = Math.max(M.sceneDone(m, w), sc.i + 1);
    const all = M.sceneDone(m, w) >= n; if (!all && !was) delete m.cleared[w];
    const e = this.endInfo; if (e) {
      const next = all ? null : SCENES[w][M.sceneDone(m, w)];
      e.title = all && !sc.replay ? '世界通关' : '场景通关';
      e.sub = '「' + sc.n + '」通关。' + (next ? '下一次来' + run.region.n + '，是「' + next.n + '」。' : sc.replay ? '' : run.region.n + '全部通关。');
    }
    this.save();
  }
  return r;
};

// ───────── the steles: world, scene, story; fully cleared worlds step aside while there is anything else ─────────
const oPool = M.worldPool;
if (oPool) M.worldPool = function (m) {
  const p = oPool.apply(this, arguments), open = p.filter(k => M.sceneDone(m, k) < (SCENES[k] || []).length);
  return open.length >= Math.min(p.length, M.worldShow ? M.worldShow(m) : 1) ? open : p;
};
const oTip = G.steleTip;
G.steleTip = function (k) {
  const t = oTip.apply(this, arguments), sc = M.sceneOf(this.meta, k); if (!t || !sc) return t;
  t.title = M.WORLDS[k].n + ' · ' + sc.n;
  t.lines = [{ t: sc.story, c: '#e8dcc4' }, { t: '场景 ' + (sc.i + 1) + ' / ' + sc.of + (sc.replay ? '（已通关）' : '') + ' · ' + sc.cols.length + ' 个首领', c: '#a89ca8' }].concat((t.lines || []).filter(l => l.t !== '已通关'));
  return t;
};
const oNG = G.newGame;
if (oNG) G.newGame = function () { const r = oNG.apply(this, arguments); if (this.meta) this.meta.scn = this.meta.scn || {}; return r; };
})();
