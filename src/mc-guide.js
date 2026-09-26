// ==== mc-guide.js ====
(function () {
// Few words on screen, and nothing on it left unexplained (docs/design.md §界面文字规范).
//  · 详情层：rules in brackets, how-to hints and flavour stay hidden until Ctrl is held (or the ⓘ button is pinned).
//    View code asks this.D(brief, full) / this.D1(text); fixed template text is marked data-detail.
//  · 初见说明：the first time a design element shows up, a one-line card points at it and says what it is. Each card
//    shows once per device; every card is also listed in 玩法说明 (F1, the ？ button, the title menu).
const M = window.MC, G = M.Game.prototype;
const K_SEEN = 'midnight-cabinet-guide-v1';
const now = () => performance.now(), cl = (v, a, b) => Math.max(a, Math.min(b, v));
const icon = (k) => M.iconURL(k, 3), sprite = (k) => M.spriteURL(k, 4);

// ───────── 详情层 ─────────
// the page evaluates the bundle twice: the switch state and its key listeners live once, on window
const DS = window.__mcDetail || (window.__mcDetail = { hold: false, pin: false });
// the Ctrl / ⓘ detail layer was removed (user ruling 2026-09-24): every view shows its one short form
const detailOn = () => false;
const sync = () => { document.documentElement.classList.toggle('mc-detail', detailOn()); const g = M._g; if (g) g.bump(); };
G.detailOn = function () { return detailOn(); };
G.D = function (brief, full) { if (full && full !== brief) this._dtHas = true; return detailOn() ? (full || brief) : brief; };
const firstSentence = (s) => { if (!s) return s; const i = s.search(/[。！？]/); return i > 0 && i < s.length - 1 ? s.slice(0, i + 1) : s; };
G.D1 = function (s) { return this.D(firstSentence(s), s); };
M.firstSentence = firstSentence;
if (!DS.bound) {
  DS.bound = true;
  window.addEventListener('keydown', (e) => {
    if (e.code === 'F1') { e.preventDefault(); const g = M._g; if (g) { g.rulesOpen = !g.rulesOpen; M.Sfx.click(); g.bump(); } }
  }, true);
  try { const st = document.createElement('style'); st.textContent = 'html:not(.mc-detail) [data-detail]{display:none!important}html.mc-detail [data-brief]{display:none!important}'; document.head.appendChild(st); } catch (e) {}
}

// ───────── 初见说明：every design element, its one line, where it sits ─────────
// scr: screens where it can show · sel: DOM anchor · at(g): stage-rect anchor for canvas things · when(g): extra condition
// freeze: battle waits while the card is up
const bvIcon = (g, pred) => { const i = (g.bv && g.bv.icons || []).find(o => o.tip && pred(o.tip)); return i ? { x: i.x, y: i.y, w: i.w, h: i.h } : null; };
const nextNode = (g) => { const run = g.run, w = g.walker; if (!run || !w || w.edge) return null; const outs = M.nodeAhead(run.map, w.node); if (!outs.length) return null; const n = run.map.nodes[outs[0].b]; if (!n) return null; const x = 960 + (n.x - w.camX), y = 560 + (n.y - 60 - w.camY); return { x: x - 60, y: y - 70, w: 120, h: 120 }; };
// the surface town and the dark rock: rectangles on the stage (mc-town.js / mc-prosper.js)
const townRect = (g, pred) => { const T = g.town, bv = g.bv; if (!T || !bv || g.panel) return null; const vs = Object.values(T.vis).filter(pred); if (!vs.length) return null;
  const x0 = Math.min(...vs.map(v => v.x - v.w * (v.sc || 1) / 2)), x1 = Math.max(...vs.map(v => v.x + v.w * (v.sc || 1) / 2)), y0 = Math.min(...vs.map(v => (v.y || 0) - v.h * (v.sc || 1))) - 10, y1 = Math.max(...vs.map(v => v.y || 0));
  const a = bv.toScreen(x0, y0), b = bv.toScreen(x1, y1); const r = { x: Math.max(20, a.x), y: Math.max(110, a.y), w: 0, h: 0 }; r.w = Math.min(1900, b.x) - r.x; r.h = b.y - r.y; return r.w > 20 && r.h > 20 ? r : null; };
const lockedRect = (g) => { const m = g.meta, bv = g.bv; if (!m || !bv || g.panel || !M.lockedCell) return null; const G_ = M.BASE_GEO;
  for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) if (M.lockedCell(m, c, r)) { const a = bv.toScreen(c * G_.CW, G_.TOP + r * G_.CH), b = bv.toScreen((c + 1) * G_.CW, G_.TOP + (r + 1) * G_.CH); if (a.x > 0 && b.x < 1920 && b.y < 1080 && a.y > 100) return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; }
  return null; };
const CONCEPTS = [
  // ── 一局怎么玩 ──
  { id: 'machine', cat: '房间', icon: 't_coin', title: '午夜机台', line: '点机台投币开始一局：在地下建基地、出征异世界、守住主基地。', scr: 'room', at: () => ({ x: 880, y: 330, w: 230, h: 400 }) },
  { id: 'furn', cat: '房间', icon: 'u_star', title: '家具', line: '用一局结束时换来的代币解锁、升级家具，每件都是永久加成。', scr: 'room', sel: '[data-tip="r-tokens"]', when: (g) => g.prof && g.prof.stats && g.prof.stats.games > 0 },
  // ── 基地 ──
  { id: 'buffs', cat: '基地', icon: 'g_powder', title: '待生效', line: '带回的纪念品和事件留下的效果，用掉之前一直在这里。', scr: 'base', sel: '[data-g="buffs"]' },
  { id: 'rest', cat: '基地', icon: 't_hourglass', title: '休整一天', line: '不出征，直接过一天。', scr: 'base', sel: '[data-g="rest"]' },
  { id: 'dayev', cat: '基地', icon: 't_clover', title: '日程事件', line: '时间轴上带图标的日子：到那天就发生，悬浮看它做什么。', scr: 'base', sel: '[data-g="timeline"]' },
  { id: 'raid', cat: '基地', icon: 't_sword', title: '时间轴', line: '这 5 天和下 5 天：哪天混沌来袭，哪天有别的事件。', scr: 'base', sel: '[data-g="timeline"]' },
  { id: 'sup', cat: '基地', img: () => sprite('sack'), title: '物资', line: '挖岩层、建房间、打造宝物都花它。出征带回来，守住夜晚也有。', scr: 'base', sel: '[data-fx="msup"]' },
  { id: 'shard', cat: '基地', img: () => sprite('shard'), title: '灵魂碎片', line: '高端材料：建史诗 / 传说建筑、精铸宝物时要用。夜里击退怪物得到。', scr: 'base', sel: '[data-fx="msh"]' },
  { id: 'core', cat: '基地', icon: 't_heart', title: '基地核心', line: '三颗心：探索失败时献出一颗救回领袖，通关一个场景补回一颗；心用完这一局就结束。', scr: 'base', sel: '[data-tip="b-core"]' },
  { id: 'pros', cat: '基地', icon: 't_pros', title: '繁荣度', line: '造的建筑品质越高，繁荣度涨得越多；升一级，地块向外扩一圈。', scr: 'base', sel: '[data-tip="b-pros"]' },
  { id: 'town', cat: '基地', icon: 'f_defense', title: '地面城镇', line: '地下每建一座建筑，地面就升起一座：前排是会挨打的战斗建筑，后面是城市。', scr: 'base', at: (g) => townRect(g, () => true), when: (g) => !!(g.town && Object.keys(g.town.vis).length) },
  { id: 'locked', cat: '基地', icon: 't_pros', title: '未解锁的地块', line: '黑色的地块还没解锁，繁荣度升级后才能挖。', scr: 'base', at: (g) => lockedRect(g) },
  { id: 'heroes', cat: '领袖', icon: 't_command', title: '领袖', line: '你的化身：出征带队，夜里站在主基地屋顶指挥。点卡片看天赋；卡片上的黄点 = 有没用的天赋点。', scr: 'base', sel: '[data-fx="heroes"]' },
  { id: 'rock', cat: '基地', icon: 'u_pick', title: '挖掘', line: '点和房间相邻的岩层，花物资和天数挖开，挖通才能建房间。', scr: 'base', sel: '[data-g="dig"]' },
  { id: 'bp', cat: '基地', icon: 'g_scroll', title: '建筑图纸', line: '列表里只有你有图纸的建筑，×2 就是有 2 张。图纸靠出征拿。', scr: 'base', sel: '[data-g="bld"]' },
  { id: 'portal', cat: '出征', icon: 'g_gate', title: '传送门', line: '点它打开，上方升起今天能去的世界碑，点碑出征。', scr: 'base', at: (g) => { if (g.panel || !g.bv || !M.BASE_GEO) return null; const p = g.bv.toScreen(M.BASE_GEO.DOOR_X, -130); return { x: p.x - 100, y: p.y - 110, w: 200, h: 230 }; } },
  { id: 'danger', cat: '出征', img: () => sprite('skull'), title: '难度', line: '碑上的低 / 中 / 高：越难收获越多，图纸越好。', scr: 'base', at: (g) => M.STELE_AT && M.STELE_AT.danger(g) },
  { id: 'loot', cat: '出征', img: () => sprite('sack'), title: '世界特产', line: '碑下方的图标：这个世界多给的东西。悬浮看详情。', scr: 'base', at: (g) => M.STELE_AT && M.STELE_AT.loot(g) },
  { id: 'relic', cat: '领袖', icon: 't_eye', title: '宝物', line: '出征时带在身上的装备，出征失败也不会丢。', scr: 'base', sel: '[data-g="relics"]' },
  { id: 'talent', cat: '领袖', icon: 't_clover', title: '天赋树', line: '每名领袖一棵自己的树，每三级长出一层，越往上越强。', scr: 'base', sel: '[data-tip^="tal-"]:not([data-tip="tal-root"])' },
  { id: 'hclass', cat: '领袖', icon: 'c_nun', title: '职业', line: '头像左上角是领袖的职业。职业决定技能：同一职业，技能永远一样。', scr: 'base', sel: '[data-g="hclass"]' },
  { id: 'rarity', cat: '标签与品质', icon: 'u_star', title: '品质', line: '白 普通 → 蓝 稀有 → 紫 史诗 → 金 传说。名字和边框的颜色就是品质。', scr: ['base', 'shop'], sel: '[data-tip="hs-rar"],[data-g="shop-units"]' },
  { id: 'defend', cat: '混沌来袭', icon: 't_shield', title: '混沌来袭', line: '每天夜里怪物攻打主基地：驻军迎敌，领袖在屋顶用技能。驻军败退，剩下的怪物打主基地。', scr: 'base', sel: '[data-g="raidprep"]' },
  // ── 出征 ──
  { id: 'nodes', cat: '出征', icon: 'e_path', title: '地图节点', line: '图标就是这一站的内容：战斗、夜市、营火、宝箱、奇遇……鼠标悬浮看详情。', scr: 'world', at: nextNode },
  { id: 'whp', cat: '出征', icon: 't_heart', title: '领袖生命', line: '不会自动回复：靠营火、奇遇，或者回基地后的医疗建筑。归零就探索失败，基地核心献出一颗心救回领袖。', scr: 'world', sel: '[data-tip="w-hp"]' },
  { id: 'wallet', cat: '出征', img: () => sprite('coin', 4), title: '积分', line: '这一局的钱：打赢战斗得到，在夜市和奇遇里花。回基地就清零。', scr: 'world', sel: '[data-tip="w-wallet"]' },
  { id: 'haul', cat: '出征', img: () => sprite('sack'), title: '本次收获', line: '物资、经验、图纸要撤离或通关才带得回基地；出征失败只留下一半经验。', scr: 'world', sel: '[data-tip="w-rsup"]' },
  { id: 'roster', cat: '出征', icon: 'v_warrior', title: '部队', line: '战斗里自动作战。在夜市买、招募旗领；三支相同的会进化。', scr: 'world', sel: '[data-tip="w-roster"]' },
  { id: 'items', cat: '出征', icon: 't_chest', title: '支援道具', line: '战斗中按 Q W E 由领袖放出。用的时候转一下，转出这次的效果；图片下面写着它是哪一类。', scr: ['world', 'battle'], sel: '[data-tip="b-items"]' },
  { id: 'banners', cat: '出征', img: () => sprite('flag'), title: '战旗', line: '整支部队的常驻加成，比如「射手战旗」让所有射手更强。', scr: ['world', 'shop'], sel: '[data-fx="banners"],[data-g="shop-banners"]' },
  { id: 'minimap', cat: '出征', icon: 'e_path', title: '小地图', line: '整条路线的缩略图。越往右越深，最右边是首领。', scr: 'world', at: () => Object.assign({}, M.MMAP || { x: 1320, y: 48 }, { w: 560, h: 250 }), when: (g) => g.run && !g.run.tut },
  { id: 'wpower', cat: '出征', icon: 'u_star', title: '战斗力', line: '敌人头上是它的战斗力，你头上是你的。颜色：绿稳赢，黄有风险，红很危险。', scr: 'world', sel: '[data-tip="w-power"]' },
  { id: 'gogo', cat: '出征', icon: 'u_star', title: 'GOGO 灯', line: '水果机顶上的灯。拉杆时亮了，这一把一定中铃铛以上。', scr: 'world', at: (g) => g.mini && g.mini.kind === 'fruit' ? { x: 1110, y: 202, w: 100, h: 64 } : null },
  { id: 'legion', cat: '领袖', icon: 't_skill', title: '领袖技能', line: '每个职业一个技能：在场外指挥时按空格放，每场战斗一开战就能用一次。', scr: ['base', 'world'], sel: '[data-tip="tal-root"],[data-g="w-skill"]' },
  // ── 战斗 ──
  { id: 'bmode', cat: '战斗', icon: 't_sword', title: '战斗目标', line: '普通战：消灭所有敌人；坚守战：撑过倒计时。', scr: 'battle', sel: '[data-tip="b-mode"]', freeze: 1 },
  { id: 'score', cat: '战斗', icon: 't_coin', title: '积分', line: '击杀敌人得积分，越强的敌人给得越多。积分就是这一趟在夜市用的钱。', scr: 'battle', sel: '[data-tip="b-base"]', freeze: 1 },
  { id: 'bhero', cat: '战斗', icon: 't_command', title: '指挥位', line: '领袖站在左边指挥；部队全灭后亲自上场，撤离战和部队一起上场。', scr: 'battle', sel: '[data-tip="b-hero"]', freeze: 1 },
  { id: 'bskill', cat: '战斗', icon: 't_skill', title: '领袖技能', line: '按空格放。', scr: 'battle', sel: '[data-g="b-skill"]', freeze: 1, when: (g) => g.battle && g.battle.hero && g.battle.hero.bench },
  { id: 'voc', cat: '标签与品质', icon: 'v_archer', title: '职业标签', line: '决定打法：先锋、守护者扛伤，战士近战，射手远程，刺客先杀弱小，法师群体伤害，牧师、圣骑士治疗，祭司光环，召唤师召唤，商人赚钱。', scr: ['shop', 'world', 'battle', 'base'], sel: '[data-tip^="tag-voc-"]' },
  { id: 'trait', cat: '战斗', icon: 'e_skull', title: '特性', line: '卡片上那一句话就是这支部队的本事。开战时它的图标从身上亮出来，停在头顶，生效时会闪。', scr: ['shop', 'world'], sel: '[data-g="trait"]' },
  { id: 'upower', cat: '标签与品质', icon: 'u_star', title: '战斗力', line: '部队有多强，就是它的价格：越贵越强。', scr: ['world'], sel: '[data-tip="w-power"]' },
  // ── 夜市 ──
  { id: 'shop', cat: '夜市', icon: 'e_market', title: '商店', line: '每家店卖的部队不一样，招牌旁边写着它的特点和代价。点自己的部队可以半价卖掉。', scr: 'shop', sel: '[data-g="shop-units"]' },
  // ── 守城 ──
];
M.GUIDE = CONCEPTS;
const seen = (() => { try { return JSON.parse(localStorage.getItem(K_SEEN) || '{}') || {}; } catch (e) { return {}; } })();
const markSeen = (id) => { seen[id] = 1; try { localStorage.setItem(K_SEEN, JSON.stringify(seen)); } catch (e) {} };
M.guideReset = () => { Object.keys(seen).forEach(k => delete seen[k]); try { localStorage.removeItem(K_SEEN); } catch (e) {} };

const onScreen = (el) => { const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth && getComputedStyle(el).visibility !== 'hidden'; };
G.guideRect = function (c) {
  if (c.at) return c.at(this);
  const els = document.querySelectorAll(c.sel); let el = null; for (const e of els) { if (onScreen(e)) { el = e; break; } } if (!el) return null;
  const st = this.ui && this.ui.stage && this.ui.stage(); if (!st) return null; const s = this.ui.scale(), sr = st.getBoundingClientRect(), r = el.getBoundingClientRect();
  return { x: (r.left - sr.left) / s, y: (r.top - sr.top) / s, w: r.width / s, h: r.height / s };
};
// anything else on screen that a card must not cover or interrupt
G.guideBusy = function () {
  return !!((this.banners && this.banners.length) || this.coachData || this.modal || this.reel || this.chest || this.mini || this.settle || this.tear || this.coreFx || this.saveFx || this.lvFx || this.settingsOpen || this.rulesOpen || this.rebind || this._goingRoom || (this.battle && this.battle.introBanner) || (this.raid && this.screen !== 'raid'));
};
G.guideClose = function () { const gd = this.guide; if (!gd) return; markSeen(gd.c.id); this.guide = null; this.guideNext = now() + 900; M._guideFreeze = false; this.bump(); };
G.guideScan = function () {
  const t = now(); if (this.guide || t < (this.guideNext || 0)) return;
  if (this.screen !== this._gScr) { this._gScr = this.screen; this._gAt = t; } if (t - (this._gAt || 0) < 700 || this.guideBusy()) return;
  for (const c of CONCEPTS) {
    if (seen[c.id]) continue; const scr = [].concat(c.scr); if (!scr.includes(this.screen)) continue; if (c.when && !c.when(this)) continue;
    const r = this.guideRect(c); if (!r) continue;
    this.guide = { c, r, at: t }; M._guideFreeze = !!(c.freeze && this.battle && !this.battle.over); M.Sfx.sparkle && M.Sfx.sparkle(); this.bump(); return;
  }
};
const oTick = G.tick;
G.tick = function (dt) {
  oTick.apply(this, arguments);
  const t = now(); if (t - (this._gScan || 0) > 250) { this._gScan = t; this._domDt = !!document.querySelector('[data-detail]'); }   // first-time cards no longer pop up (onboarding removed, user ruling 2026-09-24); 玩法说明 still lists them
  const gd = this.guide; if (gd) { if (this.guideBusy() && !gd.c.freeze) { this.guide = null; M._guideFreeze = false; this.guideNext = t + 600; } else if (t - gd.at > 20000) this.guideClose(); else { const r = this.guideRect(gd.c); if (r) gd.r = r; } }
};
if (M.Battle3) { const BP = M.Battle3.prototype, oStep = BP.step; BP.step = function () { if (M._guideFreeze) return; return oStep.apply(this, arguments); }; }
const oBack = G.backAction;
G.backAction = function () { if (this.guide) { this.guideClose(); return; } if (this.rulesOpen) { this.rulesOpen = false; this.bump(); return; } return oBack.apply(this, arguments); };

// ───────── tags say what they are for, not just what they are ─────────
const VOC_D = {};   // vocations say it in one line (M.VOC)
const oRace = M.TAG.race, oVoc = M.TAG.voc, oStyle = M.TAG.style;
M.TAG.race = (n) => { const t = oRace(n); if (t) t.d = '种族只是分类：战旗、特性、事件写到「' + n + '」时，带这个图标的单位才算数。'; return t; };
M.TAG.voc = (n) => { const t = oVoc(n); if (t) t.d = (M.VOC && M.VOC[n] && M.VOC[n].d) || ''; return t; };
M.TAG.style = (k) => { const t = oStyle(k); if (t) t.d = '建筑风格：地格和奇观写着「契合某风格」时，风格对上的房间才有额外效果。'; return t; };

// ───────── 玩法说明：the loop in four steps, then every card by topic ─────────
const LOOP = [
  { icon: 'u_pick', t: '基地', d: '在地下挖岩层、盖房间：生产、打造、医疗、训练、进化。' },
  { icon: 'g_gate', t: '出征', d: '穿过传送门进入异世界，一站站往前走：战斗、夜市、奇遇。' },
  { icon: 'g_pack', t: '带回', d: '撤离或打败场景尽头的首领，把物资、经验、图纸带回基地；出征失败只留下一半经验，基地核心献出一颗心救回领袖。' },
  { icon: 't_shield', t: '守夜', d: '每天夜里混沌来袭，出征带回来的部队守城；主基地被打破，这一局结束。' },
];
const CATS = ['房间', '基地', '领袖', '出征', '战斗', '夜市', '混沌来袭', '标签与品质'];
let glossC = null;
const glossary = () => glossC || (glossC = {
  loop: LOOP.map(s => ({ img: icon(s.icon), t: s.t, d: s.d })),
  cats: CATS.map(n => ({ n, items: CONCEPTS.filter(c => c.cat === n).map(c => ({ img: c.img ? c.img() : icon(c.icon), t: c.title, d: c.line })) })).filter(c => c.items.length),
});

// ───────── view ─────────
const oView = G.view;
G.view = function () {
  this._dtHas = false;
  const v = oView.call(this), m = this.meta, D = (a, b) => this.D(a, b), D1 = (s) => this.D1(s);
  // world: the how-to bar is for the first (tutorial) run only
  if (v.worldHint && this.run && !this.run.tut) v.worldHint = '';
  // battle: the legion card shows its name and key; what it does is one Ctrl away (or on hover)
  // base top bar: the raid is tonight while the defenders are being picked; tips say what is true now
  if (v.b && m) {
    if (this.raidPrep || m.raidPending === m.day) { v.b.raidTxt = '今晚混沌来袭'; v.b.raidC = '#ff5a4a'; }
    v.raidTip = this.tipFn({ title: '混沌来袭', c: '#ff6a5a', d: '第 ' + M.nextRaid(m) + ' 天夜里，怪物攻打主基地。' });
  }
  // panels: details are shown directly; only the leaders' own lines keep a Ctrl layer
  const pn = v.pn;
  if (pn) {
    if (pn.isBuild) {
      pn.sub = '';
      (pn.opts || []).forEach(o => { const s = o.meta || '', seg = []; let x;
        if ((x = /(\d+) 物资/.exec(s))) seg.push({ img: sprite('sack'), t: x[1] }); if ((x = /(\d+) 碎片/.exec(s))) seg.push({ img: sprite('shard'), t: x[1] });
        if ((x = /(\d+) 天/.exec(s))) seg.push({ img: icon('t_hourglass'), t: x[1] + ' 天' }); if ((x = /电力 \+(\d+)/.exec(s))) seg.push({ img: icon('f_power'), t: '+' + x[1] }); else if ((x = /耗电 (\d+)/.exec(s))) seg.push({ img: icon('f_power'), t: '-' + x[1] });
        o.ms = seg; o.hasMs = seg.length > 0; });
    }
    if (pn.isRaidPrep) {
      pn.sub = '第 ' + m.day + ' 天';
      (pn.rpHeroes || []).forEach(rh => { if (rh.sub) rh.sub = D(rh.sub.split(' · ').slice(0, 2).join(' · '), rh.sub); if (rh.sh) rh.sh = rh.sh.replace('阵亡留下 ', '阵亡 → '); });
    }
  }
  // the ⓘ switch shows up only where there is something behind it
  const dtAny = this._dtHas || this._domDt;
  v.dtOn = false && !!dtAny; const on = this.detailOn();
  const kbm = !M.inputMode || M.inputMode(this) === 'kbm'; v.dtTxt = on ? (DS.pin ? 'ⓘ 详情 · 已展开' : 'ⓘ 详情') : kbm ? 'ⓘ 按住 Ctrl 看详情' : 'ⓘ 详情'; v.dtC = on ? '#ffe08a' : '#8d8496';
  v.dtToggle = () => { DS.pin = !DS.pin; M.Sfx.click(); sync(); };
  v.helpOn = this.screen !== 'intro'; v.helpOpen = () => { this.rulesOpen = true; M.Sfx.click(); this.bump(); };
  // the card
  const gd = this.guide; v.guideOn = !!gd;
  if (gd) {
    const r = gd.r, c = gd.c, W = 640, H = 170, q = 1;
    let y = r.y + r.h + 18; if (y + H > 1060) y = r.y - H - 18; if (y < 10) y = cl(r.y + r.h / 2 - H / 2, 10, 1060 - H);
    let x = r.x + r.w / 2 - W / 2; if (y > r.y - H && y < r.y + r.h) x = r.x + r.w + 24 > 1920 - W ? r.x - W - 24 : r.x + r.w + 24;
    const nSeen = Object.keys(seen).length;
    v.gd = { x: Math.round(cl(x, 16, 1920 - W - 16)), y: Math.round(y), op: q, c: '#ffe08a', img: c.img ? c.img() : icon(c.icon), title: c.title, text: c.line,
      foot: (nSeen < 2 ? '点击知道了 · 所有说明都在右下角「？」里' : '点击知道了') + (M._guideFreeze ? ' · 战斗已暂停' : ''),
      ringOn: c.id !== 'machine', rx: Math.round(r.x + r.w / 2 - Math.max(r.w + 16, 96) / 2), ry: Math.round(r.y + r.h / 2 - Math.max(r.h + 16, 96) / 2), rw: Math.round(Math.max(r.w + 16, 96)), rh: Math.round(Math.max(r.h + 16, 96)), rOp: 0.55 + 0.45 * Math.sin(now() / 180),
      close: (e) => { if (e && e.stopPropagation) e.stopPropagation(); M.Sfx.click(); this.guideClose(); } };
  }
  v.gl = glossary();
  return v;
};
})();

;
