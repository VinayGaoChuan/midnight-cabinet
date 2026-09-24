// ==== mc-game-h.js ====
(function () {
// Systems pass: stable hover, tooltip registry, anchored coach ring, key bindings, daily world offers,
// world-flavoured loot & enemies, vision, icon settlement, flying rewards.
const M = window.MC, G = M.Game.prototype, DB = M.DB, Q = M.QUALITY;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const inside = (x, y, r, m) => r && x >= r.x - (m || 0) && x <= r.x + r.w + (m || 0) && y >= r.y - (m || 0) && y <= r.y + r.h + (m || 0);

// ───────── settings & key bindings (persisted per device) ─────────
const SKEY = 'midnight-cabinet-settings-v1';
const DEF_KEYS = { up: ['ArrowUp', 'KeyW'], down: ['ArrowDown', 'KeyS'], right: ['ArrowRight', 'KeyD'], item1: ['KeyQ'], item2: ['KeyW'], item3: ['KeyE'], skill: ['Space'], pause: ['KeyP'], speed: ['KeyF'], back: ['Escape'] };
const DEF_PAD = { confirm: 0, back: 1, item1: 2, item2: 3, item3: 5, skill: 7, pause: 9, speed: 8, zoomIn: 4, zoomOut: 6 };
M.ACTION_N = { up: '向上 / 岔路上', down: '向下 / 岔路下', right: '前进', item1: '支援道具 1', item2: '支援道具 2', item3: '支援道具 3', skill: '领袖技能', pause: '暂停 / 继续', speed: '切换战斗速度', back: '返回 / 关闭', confirm: '确认 / 点击', zoomIn: '基地放大', zoomOut: '基地缩小' };
M.loadSettings = function () { let s = null; try { s = JSON.parse(localStorage.getItem(SKEY)); } catch (e) {} s = s || {}; return { input: s.input || 'auto', keys: Object.assign({}, DEF_KEYS, s.keys || {}), pad: Object.assign({}, DEF_PAD, s.pad || {}), vol: s.vol == null ? 1 : s.vol }; };
M.saveSettings = function (s) { try { localStorage.setItem(SKEY, JSON.stringify(s)); } catch (e) {} };
M.DEF_KEYS = DEF_KEYS; M.DEF_PAD = DEF_PAD;
M.settings = M.loadSettings();
M.keyName = (code) => !code ? '—' : code === 'Space' ? '空格' : code === 'Escape' ? 'Esc' : code === 'Enter' ? '回车' : /^Key/.test(code) ? code.slice(3) : /^Digit/.test(code) ? code.slice(5) : { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', Tab: 'Tab', Backspace: '退格' }[code] || code;
M.keyOf = (act) => M.keyName((M.settings.keys[act] || [])[0]);
const actOf = (code) => Object.keys(M.settings.keys).filter(a => (M.settings.keys[a] || []).includes(code));
G.handleKey = function (ev) {
  const down = ev.type === 'keydown', acts = actOf(ev.code);
  if (this.rebind) { if (down) { ev.preventDefault(); this.finishRebind(ev.code); } return; }
  if (down) this.lastInput = 'kbm';
  const s = this.screen;
  // movement keys are held (world map)
  const mv = acts.find(a => a === 'up' || a === 'down' || a === 'right');
  if (mv && s === 'world') { ev.preventDefault(); this.keys[mv] = down; return; }
  if (!down) return;
  if (acts.includes('back')) { if (this.settingsOpen) return this.closeSettings(); if (this.modal && this.modal.back) { this.modal.back(); this.bump(); } else this.closePanel(); return; }
  if (s === 'battle' && this.battle) {
    const it = acts.find(a => /^item\d$/.test(a)); if (it) { ev.preventDefault(); this.useSlot(+it.slice(4) - 1); this.pulse['bslot' + (+it.slice(4) - 1)] = now(); return; }
    if (acts.includes('skill')) { ev.preventDefault(); this.castSkill(); return; }
    if (acts.includes('pause')) { ev.preventDefault(); this.togglePause(); return; }
    if (acts.includes('speed')) { ev.preventDefault(); this.speed = this.speed % 3 + 1; M.Sfx.click(); this.bump(); return; }
  }
};

// ───────── stable hover: CSS :hover transforms become a JS class with a fixed hit box ─────────
const HOVCLS = new Set(); let sheetSig = -1;
const sheetCount = (sheets) => sheets.reduce((a, s) => { try { return a + s.cssRules.length; } catch (e) { return a; } }, 0);
function convertHover() {
  const sheets = [...document.styleSheets]; if (sheetCount(sheets) === sheetSig) return;
  sheets.forEach(sh => { let rules; try { rules = sh.cssRules; } catch (e) { return; }
    for (let i = rules.length - 1; i >= 0; i--) { const r = rules[i], m = r.selectorText && /^\.(scp\d+):hover$/.exec(r.selectorText); if (!m) continue; HOVCLS.add(m[1]); try { sh.insertRule('.' + m[1] + '.jhov { ' + r.style.cssText + ' }', i + 1); sh.deleteRule(i); } catch (e) {} } });
  sheetSig = sheetCount(sheets);
}
G.hoverMove = function (e) {
  convertHover();
  const set = this.hovSet || (this.hovSet = new Set()), x = e.clientX, y = e.clientY;
  for (const el of [...set]) { const r = el._hr; if (!el.isConnected || !(x >= r.left && x <= r.right && y >= r.top && y <= r.bottom)) { el.classList.remove('jhov'); set.delete(el); } }
  for (let el = e.target; el && el.classList && el !== document.body; el = el.parentElement) {
    if (set.has(el)) continue; let hit = false; for (const c of el.classList) if (HOVCLS.has(c)) { hit = true; break; }
    if (!hit) continue; el._hr = el.getBoundingClientRect(); el.classList.add('jhov'); set.add(el);
  }
};
G.hoverClear = function () { (this.hovSet || []).forEach(el => el.classList.remove('jhov')); if (this.hovSet) this.hovSet.clear(); };
// the JS hover (pop + tilt) keeps its element while the pointer is inside the element's original box
const oldHover = G.uiHover;
G.uiHover = function (t, x, y) {
  this.tipDeleg(t);
  if (this.hovEl && this.hovEl.isConnected && this.hovRect && inside(x, y, this.hovRect)) return;
  oldHover.call(this, t, x, y);
  if (this.hovEl) { const st = this.ui.stage().getBoundingClientRect(), s = this.ui.scale(), b = this.hovEl.getBoundingClientRect(); this.hovRect = { x: (b.left - st.left) / s, y: (b.top - st.top) / s, w: b.width / s, h: b.height / s }; } else this.hovRect = null;
};

// ───────── tooltip registry: any element with data-tip="key" explains itself ─────────
const R = (s) => ({ rich: M.rich(s) });
G.tipFor = function (key) {
  const m = this.meta, run = this.run, b = this.battle, kq = (a) => '「' + M.keyOf(a) + '」';
  const T = {
    'b-mode': () => ({ title: this.cfg && this.cfg.mode === 'hold' ? '坚守战' : '普通战', c: '#f2c14e', d: this.cfg && this.cfg.mode === 'hold' ? '撑过倒计时就赢。' : '消灭所有敌人就赢。' }),
    'b-base': () => ({ title: '基础积分', c: '#f5ead4', d: '击杀获得，乘以倍率就是本场积分。' }),
    'b-mult': () => ({ title: '倍率', c: '#ffcc33', d: '击杀精英 +0.1，击杀首领 +0.3。' }),
    'b-score': () => ({ title: '积分', c: '#ffcc33', d: '胜利后存进钱包，在夜市花。' }),
    'b-hero': () => ({ title: run ? 'Lv' + run.hero.lv + ' ' + M.heroN(run.hero) : '领袖', c: '#f2c14e', d: '部队全灭后亲自上场。' }),
    'b-count': () => ({ title: '战况', c: '#e8dcc4', d: '我方剩余部队 / 剩余敌人。' }),
    'b-pause': () => ({ title: '暂停 ' + kq('pause'), c: '#e8dcc4' }),
    'b-speed': () => ({ title: '战斗速度 ' + kq('speed'), c: '#f2c14e' }),
    'b-items': () => ({ title: '支援道具', c: '#ffcc33', d: '使用时随机品质，至少是道具本身的品质。' }),
    'w-hero': () => run && this.heroTip(run.hero),
    'w-hp': () => ({ title: '领袖生命', c: '#f2c14e', d: '不会自动恢复，归零领袖永久死亡。' }),
    'w-wallet': () => ({ title: '积分', c: '#ffcc33', d: '这次出征的钱，回基地后清空。' }),
    'w-rsup': () => ({ title: '本局物资', c: '#e8c86a', d: '撤离后带回基地；领袖阵亡则丢失。' }),
    'w-rexp': () => ({ title: '本局经验', c: '#9cff7a', d: '撤离后给领袖。' }),
    'w-rshard': () => ({ title: '灵魂碎片', c: '#d8a0ff', d: '撤离后带回基地。' }),
    'w-roster': () => ({ title: '部队 ' + (run ? run.roster.length : 0) + ' / ' + M.ROSTER_CAP, c: '#6fa8dc', d: '在夜市买卖。' }),
    'b-day': () => ({ title: '第 ' + m.day + ' 天', c: '#ffe08a', d: '出征或休整一天，过去 1 天。' }),
    'b-herocap': () => ({ title: '领袖 ' + m.heroes.length + ' / ' + M.heroCap(m), c: '#ffe08a', d: '领袖数 / 上限。' }),
    's-refresh': () => ({ title: '刷新', c: '#e8dcc4', d: '花积分换一批货，每次涨价。' }),
    's-leave': () => ({ title: '离开夜市', c: '#ffe08a', d: '回到地图，不能再回来。' }),
    'b-rest': () => ({ title: '休整一天', c: '#cfc6b8', d: '不出征，直接过一天。' }),
  };
  const f = T[key]; return f ? f() : null;
};
G.tipDeleg = function (t) {
  const el = t && t.closest ? t.closest('[data-tip]') : null;
  if (el) { const k = el.getAttribute('data-tip'); if (k !== this.tipKey) { const d = this.tipFor(k); if (d) { this.tipKey = k; this.tipData = d; M.Sfx.hover(); this.bump(); } } }
  else if (this.tipKey) { this.tipKey = null; this.tipData = null; }
};

// ───────── coach ring anchored to the world, not the screen ─────────
const oldCoach = G.coach;
G.coach = function (text, x, y, tx, ty) {
  oldCoach.call(this, text, x, y, tx, ty);
  if ((this.screen === 'base' || this.screen === 'raid') && tx != null) this.coachData.world = { p: this.bv.toWorld(tx, ty), off: { x: x - tx, y: y - ty } };
};

// ───────── vision: how many steps ahead the map reveals ─────────
M.visionOf = (run) => 1 + (M.baseMods(run.M).vision || 0) + (run.mods.vision || 0);
M.revealAhead = function (map, id, depth) { let front = [id]; for (let d = 0; d < depth; d++) { const next = []; front.forEach(i => map.nodes[i].out.forEach(e => { const b = map.edges[e].b; map.nodes[b].seen = true; next.push(b); })); front = next; } };
if (M.BUILDINGS.lookout) { M.BUILDINGS.lookout.fx = { vision: 2 }; M.BUILDINGS.lookout.d = '出征时视野 +2：地图和小地图能提前看清前方 3 步以内的节点。'; }
const oldArrive = G.arrive;
G.arrive = function (n) { if (this.run) M.revealAhead(this.run.map, n.id, M.visionOf(this.run)); return oldArrive.call(this, n); };

// ───────── worlds: a few random offers per day, each with its own loot and monsters ─────────
const WT = {
  town:    { races: ['人类', '僵尸', '骷髅'], style: 'medieval', loot: { sup: 1.35 }, tags: [['sack', '×1.35']], lootD: '物资收益 ×1.35。雾里的小镇到处是能拆的木料和铁钉。' },
  forest:  { races: ['精灵', '自然', '野兽'], style: 'nature', loot: { exp: 1.6 }, tags: [['orb', '×1.6']], lootD: '经验收益 ×1.6。精灵之森的空气里都是灵气。' },
  park:    { races: ['虚空', '不死', '混沌'], style: 'cartoon', loot: { wallet: 1.3, item: 0.25 }, tags: [['coin', '×1.3'], ['bell', '+']], lootD: '积分收益 ×1.3，战斗后常常捡到支援道具。' },
  harbor:  { races: ['虚空', '野兽', '不死'], style: 'water', loot: { tile: 0.14, sup: 1.1 }, tags: [['gem', '+'], ['sack', '×1.1']], lootD: '常常打捞到地脉结晶，物资 ×1.1。' },
  foundry: { races: ['科技', '兽人'], style: 'steam', loot: { rbp: 0.2 }, tags: [['r_gear', '+'], ['scroll', '+']], lootD: '经常掉落宝物图纸，偏向蒸汽建筑。' },
  ward:    { races: ['不死', '骷髅', '僵尸'], style: 'scifi', loot: { heal: 0.06, exp: 1.2 }, tags: [['r_heart', '+6%'], ['orb', '×1.2']], lootD: '每场战斗后领袖回复 6% 生命，经验 ×1.2。' },
  starship:{ races: ['科技', '虚空'], style: 'scifi', loot: { bpq: 1, tile: 0.08 }, tags: [['scroll', '★'], ['gem', '+']], lootD: '掉落的图纸品质更高，偶尔有地脉结晶。' },
  hell:    { races: ['恶魔', '混沌'], style: 'fantasy', loot: { shards: 1 }, tags: [['shard', '+']], lootD: '每场战斗都能收集灵魂碎片。' },
  casino:  { races: ['人类', '虚空', '恶魔', '混沌'], style: 'fantasy', loot: { wallet: 2, bpq: 2 }, tags: [['coin', '×2'], ['scroll', '★★']], lootD: '积分收益 ×2，掉落的多是奇观图纸。' },
};
M.WTHEME = WT;
const TIER_W = [['town', 'forest', 'park'], ['harbor', 'foundry', 'ward'], ['starship', 'hell']];
M.worldShow = (m) => (m.day >= 12 ? 3 : m.day >= 6 ? 2 : 1);
M.worldPool = (m) => { let p = TIER_W[0].slice(); if (m.day >= 6) p = p.concat(TIER_W[1]); if (m.day >= 12) p = p.concat(TIER_W[2]); if (m.cleared.hell) p.push('casino'); return p; };
M.worldsOpen = function (m) {
  if (m.offers && m.offers.day === m.day && m.offers.list.every(k => M.WORLDS[k])) return m.offers.list;
  let s = (m.day * 7919 + (m.seed || (m.seed = Math.floor(Math.random() * 1e6)))) % 2147483647 || 1; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const pool = M.worldPool(m).sort(() => r() - 0.5); m.offers = { day: m.day, list: pool.slice(0, M.worldShow(m)) }; return m.offers.list;
};
// themed monsters
const THEMED = {}; Object.keys(WT).forEach(k => { THEMED[k] = Object.keys(DB).filter(u => { const d = DB[u]; return d.type === 'Summon' && d.cost > 0 && d.atk > 0 && d.ranged !== 2 && u !== 'JadeBeast' && WT[k].races.includes(d.race); }); });
let CUR = null; const oPick = M.pickWave, oCfg = M.makeBattleCfg;
M.pickWave = function (budget, opts) { if (!CUR || !THEMED[CUR] || !THEMED[CUR].length) return oPick(budget, opts); const saved = M.ENEMY_POOL; M.ENEMY_POOL = saved.concat(THEMED[CUR], THEMED[CUR]); try { return oPick(budget, opts); } finally { M.ENEMY_POOL = saved; } };
M.makeBattleCfg = function (run, node) { CUR = run.region.tut ? null : run.regionKey; try { return oCfg(run, node); } finally { CUR = null; } };
// blueprints lean towards the world's building style
const oDrop = M.dropBp;
M.dropBp = function (bias, style, qUp) {
  if (!style || Math.random() < 0.4) return oDrop(bias);
  if (Math.random() < 0.45) return 'rbp:' + M.pick(Object.keys(M.RELICS));
  const w = [60, 25, 11, 4].map((x, i) => i === 0 ? x : x * (1 + (bias || 0) + (qUp || 0) * 0.8));
  const ks = Object.keys(M.BUILDINGS).filter(k => !M.BUILDINGS[k].fixed && M.BUILDINGS[k].style === style); if (!ks.length) return oDrop(bias);
  const q = M.wpick([0, 1, 2, 3], i => ks.some(k => M.BUILDINGS[k].q === i) ? w[i] : 0);
  return 'bbp:' + M.pick(ks.filter(k => M.BUILDINGS[k].q === q));
};
const oNewRun = M.newRun3;
M.newRun3 = function (meta, hero, worldKey, relicIds) {
  const run = oNewRun(meta, hero, worldKey, relicIds); run.theme = WT[worldKey] || null; run.loot.shards = run.loot.shards || 0;
  run.vision = M.visionOf(run); if (!run.region.tut) M.revealAhead(run.map, 0, run.vision);
  return run;
};

// ───────── settlement: icons with count badges, flying to where they belong ─────────
const TILE_TO = { coin: 'wallet', sack: 'rsup', orb: 'rexp', shard: 'rshard', scroll: 'rbp', gem: 'rbp', heal: 'hp', unit: 'roster' };
G.startSettle = function () {
  const b = this.battle, run = this.run, cfg = this.cfg, h = run.hero, m = this.meta, n = this.node, score = b.score, mx = M.heroMaxHp(h, m), th = (run.theme && run.theme.loot) || {};
  h.hp = Math.max(0, b.hero.alive ? b.hero.hp : 0);
  let good = b.over !== 'dead', title = '胜利', col = '#ffd970'; const tiles = [];
  if (run.tut && h.hp <= 0) { h.hp = Math.round(mx * 0.3); good = true; }
  if (!good) { title = '领袖倒下'; col = '#ff4a4a'; }
  if (good) {
    const sc = Math.round(score * (th.wallet || 1)); this.hold('wallet', run.wallet); run.wallet += sc; tiles.push({ icon: 'coin', v: M.fmt(sc), c: '#ffcc33', to: 'wallet' });
    const sup = Math.round((8 + 4 * cfg.w) * run.lootMul * (1 + (run.mods.supplies || 0)) * (th.sup || 1)); this.hold('rsup', run.loot.supplies); run.loot.supplies += sup; tiles.push({ icon: 'sack', v: sup, c: '#e8c86a', to: 'rsup' });
    const ex = Math.round((b.kills * 3 + 10 * cfg.w) * (1 + (run.mods.exp || 0)) * (th.exp || 1)); this.hold('rexp', run.loot.exp); run.loot.exp += ex; tiles.push({ icon: 'orb', v: ex, c: '#9cff7a', to: 'rexp' });
    if (th.shards) { const sh = Math.round((2 + cfg.w * 1.5) * (n.type === 'boss' ? 4 : n.type === 'elite' ? 2 : 1)); this.hold('rshard', run.loot.shards); run.loot.shards += sh; tiles.push({ icon: 'shard', v: sh, c: '#d8a0ff', to: 'rshard' }); }
    const bpHold = () => this.hold('rbp', run.loot.bp.length);
    const pb = (n.type === 'boss' ? 1 : n.type === 'elite' ? 0.45 : run.tut ? 0 : 0.06) + (th.rbp || 0) * (n.type === 'normal' ? 1 : 0);
    const drop = (k) => { bpHold(); run.loot.bp.push(k); const I = M.itemInfo(k); tiles.push({ icon: I.icon === 'scroll' || I.icon === 'gem' ? I.icon : I.icon, v: 1, c: I.c, to: 'rbp', n: I.n }); };
    if (Math.random() < pb && !run.tut) drop(th.rbp && Math.random() < 0.5 ? 'rbp:' + M.pick(Object.keys(M.RELICS)) : M.dropBp(n.type === 'boss' ? 1 : 0.3, run.theme && run.theme.style, th.bpq));
    if (!run.tut && Math.random() < (n.type === 'boss' ? 0.3 : 0) + (th.tile || 0)) drop('tile:' + M.dropTile());
    const heal = (run.mods.postHeal || 0) + (th.heal || 0); if (heal) { const v = Math.round(mx * heal); this.hold('hp', Math.round(h.hp)); h.hp = Math.min(mx, h.hp + v); tiles.push({ icon: 'r_heart', v: '+' + v, c: '#9cff7a', to: 'hp' }); }
    run.roster.forEach(u => { u.battles = (u.battles || 0) + 1; (DB[u.type].tr || []).forEach(t => { const T = M.TDB[t]; if (!T) return; const hh = M.TRAIT_H[T.cls.replace(/^Summon|Trait$/g, '')]; if (hh && hh.post) hh.post(b, null, T.v, u); }); });
    (b.grew || []).forEach(g => tiles.push({ icon: g.type, v: g.v, c: '#ffcc33', to: 'roster', unit: 1 }));
  }
  run.battles++;
  this.settle = { t: 0, good, title, col, tiles, shown: 0, score, base: b.base, mult: b.mult, target: 0, pass: true, lines: [], final: !good ? 'fail' : n.type === 'boss' && n.final ? 'clear' : n.type === 'extract' ? 'extract' : null };
  this.banner({ kind: 'win', text: title, col, col2: good ? '#8a4a10' : '#3a0000', life: 1.7, y: 420 });
  if (good) { M.Sfx.fanfare(); this.fx.confetti(150); this.fx.rays(960, 420, '#ffcc33', 1.7, { r: 800 }); this.fx.kick(20); } else { M.Sfx.lose(); this.fx.flash('#ff0000', 0.35); this.fx.kick(18); }
  this.bump();
};
G.settleTick = function (dt) { const st = this.settle; st.t += dt; const k = Math.floor((st.t - 1.7) / 0.16) + 1; if (st.t > 1.2 && st.t - dt <= 1.2) M.Sfx.whoosh(0.3); if (k > st.shown && st.shown < st.tiles.length && st.t > 1.7) { st.shown++; M.Sfx.land(st.shown); } };
G.settleNext = function () {
  const st = this.settle; if (!st || st.t < 1.8) return; if (st.shown < st.tiles.length) { st.shown = st.tiles.length; return; }
  M.Sfx.click(); this.node.done = true; this.settle = null; this.battle = null;
  if (st.final === 'fail') return this.runFail(); if (st.final || (this.run.tut && this.node.final)) return this.runWin(st.final || 'clear');
  this.enterWorld();
  // rewards fly out of the middle into their HUD slots; each slot ticks up when its icon lands
  setTimeout(() => st.tiles.forEach((t, i) => { const img = M.spriteCanvas(t.icon, t.unit ? 5 : 8), from = { x: 960 + (i - (st.tiles.length - 1) / 2) * 110, y: 520 }; this.fly(img, from, t.to, t.c, () => this.release(t.to), 0.05 + i * 0.09); }), 380);
};
// the world HUD now also shows run exp and shards
const oldView = G.view;
G.view = function () {
  const v = oldView.call(this), run = this.run, t0 = now(), st = this.settle;
  if (v.w && run) { v.w.rexp = this.tv('rexp', run.loot.exp); v.w.rexpSc = this.ps('rexp'); v.w.rshard = this.tv('rshard', run.loot.shards || 0); v.w.rshardSc = this.ps('rshard'); v.w.hasShard = (run.loot.shards || 0) > 0 || !!(run.theme && run.theme.loot.shards); v.w.orbImg = M.spriteURL('orb', 4); v.w.shardImg = M.spriteURL('shard', 4); v.w.hp = this.tv('hp', Math.round(run.hero.hp)) + ' / ' + M.heroMaxHp(run.hero, this.meta); }
  if (st && v.st) {
    const q = cl((st.t - 1.4) / 0.8, 0, 1);
    v.st.tiles = st.tiles.slice(0, st.shown).map((t, i) => { const age = st.t - 1.7 - i * 0.16, s = 1 + 0.35 * Math.exp(-Math.max(0, age) * 9) * Math.cos(Math.max(0, age) * 22); return { img: M.spriteURL(t.icon, t.unit ? 5 : 7), v: String(t.v), c: t.c, border: t.c, sc: s.toFixed(3), op: cl(age / 0.1 + 1, 0, 1), glow: '0 0 18px ' + t.c + '66', n: t.n || '', hasN: !!t.n, tipOn: this.tipFn(t.n ? { title: t.n, c: t.c } : null) }; });
    v.st.hasTiles = v.st.tiles.length > 0; v.st.eqOn = st.good; v.st.base = M.fmt(st.base); v.st.mult = (Math.round(st.mult * 100) / 100).toFixed(2); v.st.score = M.fmt(st.score * M.ease.eo(q));
    v.st.btn = st.shown < st.tiles.length ? '跳过' : st.final === 'fail' ? '结束' : st.final ? '带着收获回家' : '继续前进';
  }
  // coach ring follows its building while the camera moves
  const co = this.coachData; if (co && co.world && v.coach && (this.screen === 'base' || this.screen === 'raid')) { const p = this.bv.toScreen(co.world.p.x, co.world.p.y); v.coach.rx = Math.round(p.x - 70); v.coach.ry = Math.round(p.y - 70); v.coach.x = cl(Math.round(p.x + co.world.off.x - 360), 20, 1180); v.coach.y = cl(Math.round(p.y + co.world.off.y - 60), 110, 940); }
  // key hints on battle controls
  if (v.h) { v.h.items = v.h.items.map((it, i) => Object.assign(it, { key: M.keyOf('item' + (i + 1)), sc: this.ps('bslot' + i) })); v.h.skillKey = M.keyOf('skill'); }
  v.settingsOn = !!this.settingsOpen; if (this.settingsOpen) Object.assign(v, this.settingsView ? this.settingsView() : {});
  return v;
};
// battle-side rewards (death rattles, bounty) fly coins into the base-score counter
const oldGo = G.beginBattle;
G.beginBattle = function (n) {
  oldGo.call(this, n); const b = this.battle; if (!b) return;
  b.grew = [];
  b.onGain = (x, y, g) => { this.hold('bbase', b.base - g); const img = M.spriteCanvas('coin', 6); const from = { x, y: y + 180 }; this.fx.fly(img, from, this.fxPos('bbase') || { x: 700, y: 90 }, { col: '#ffcc33', dur: 0.55, s0: 1.2, s1: 0.6, onLand: () => { this.release('bbase'); this.punchSel('bbase', 0.7); } }); };
};
const B3P = M.Battle3.prototype;
B3P.gainBase = function (g, e) { this.base += g; this.coins(e.x, e.y - 40, 6); this.float(e.x, e.y - 90 * e.sz, '+' + M.fmt(g), '#ffcc33', 26, true); if (this.onGain) this.onGain(e.x, e.y - 60 * e.sz, g); };
// growth logged as unit tiles, not sentences
const oldEvU = B3P.evolveU;
B3P.evolveU = function (u, to, e) { const from = u ? u.type : null; oldEvU.call(this, u, to, e); if (u && u.type !== from && this.grew) this.grew.push({ type: u.type, v: '进化' }); };
if (M.TRAIT_H.Blooming) M.TRAIT_H.Blooming.post = function (b, e, v, u) { if (!u) return; const k = u.battles >= 11 ? 3 : 1; u.bHp += v[0] * k; u.bAtk += v[1] * k; u.lv++; if (b.grew) b.grew.push({ type: u.type, v: 'Lv' + u.lv }); };

const oldWin2 = G.runWin;
G.runWin = function (kind) { const L = this.run && this.run.loot, sh = L && L.shards; if (sh) this.meta.shards += sh; oldWin2.call(this, kind); if (sh && this.endInfo) { this.endInfo.tiles.push({ img: M.spriteURL('shard', 7), n: '灵魂碎片', v: '+' + sh, c: '#b86bff', icon: 'shard' }); this.save(); } };
const okPt = (p) => p && isFinite(p.x) && isFinite(p.y);
const oldAward = G.award; G.award = function (list, from) { return oldAward.call(this, list, okPt(from) ? from : { x: 960, y: 470 }); };
const oldFly = G.fly; G.fly = function (icon, from, sel, col, onLand, delay) { return oldFly.call(this, icon, okPt(from) ? from : { x: 960, y: 500 }, sel, col, onLand, delay); };
// effects with a missing position are dropped instead of breaking the whole overlay frame
const FLP = M.FxLayer.prototype, oFxDraw = FLP.draw;
FLP.draw = function (ctx, noClear) { this.items = this.items.filter(it => it.k === 'fly' ? okPt(it.from) && okPt(it.to) : ['x', 'y'].every(k => isFinite(it[k])) && ['r', 'r0', 'r1'].every(k => it[k] === undefined || isFinite(it[k]))); return oFxDraw.call(this, ctx, noClear); };
// ───────── minimap hover: every node can be inspected, including ones only visible on the minimap ─────────
const oldWM = G.worldMove;
G.worldMove = function (sx, sy) {
  if (this.walker && sx >= 1330 && sx <= 1890 && sy >= 30 && sy <= 280) {
    const map = this.run.map, X = 1330, Y = 30, Wd = 560, Ht = 250, COLW = 520, ROWH = 270, Y0 = 700, sxk = (Wd - 70) / (map.W - 500), syk = (Ht - 90) / (ROWH * 2.4);
    let best = null, bd = 18; map.nodes.forEach(n => { const cx = X + 35 + (n.x - 300) * sxk, cy = Y + 60 + (n.y - (Y0 - ROWH * 1.2)) * syk, d = Math.hypot(cx - sx, cy - sy); if (d < bd) { bd = d; best = n; } });
    if (best) { const n = best, cur = this.walker.edge ? this.walker.edge.b : this.walker.node; this.tipData = { title: M.nodeLabel(n), c: !n.seen ? '#8d8496' : n.type === 'boss' || n.type === 'elite' ? '#ff6a5a' : n.type === 'extract' ? '#5fd0c0' : '#f2c14e', kind: (n.id === cur ? '你在这里 · ' : n.done ? '已经过 · ' : '') + '第 ' + (n.col + 1) + ' 站', d: n.seen ? M.nodeDesc(n) : '在视野之外。' }; this.tipKey = null; return; }
    this.tipData = { title: '小地图', c: '#e8dcc4', d: '整张地图。', lines: [R('当前视野：前方 ' + (this.run.vision || 1) + ' 步')] }; return;
  }
  return oldWM.call(this, sx, sy);
};
})();

;
