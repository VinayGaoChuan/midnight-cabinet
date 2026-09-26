// ==== mc-dirs.js ====
(function () {
// 发展方向 (user ruling 2026-09-27: 「繁荣度升级时的三选一，改成二选一，并且我希望是类似城市化，堡垒化，市场化，等等这种名字。
// 这种名字也代表了我的一个预期，就是，根据选的方向不同，基地会向不同风格的变化」). It takes the place of the 繁荣度 perks.
// Every 繁荣度 level (the ring opening plays first) offers two directions, one sentence each. Taking one again deepens it
// (I → II → III, the effect adds up). Most directions strengthen a category and a style of building, so function and
// style build up together; and the town on the surface grows that way: its ground, the skyline behind it, the things in
// its streets and the roofs of its houses (mc-townlook.js). The deepest direction sets the look.
const M = window.MC, G = M.Game.prototype, S = M.Sfx, B = M.BUILDINGS, now = () => performance.now();
const SCALE = ['supplyDaily', 'shardDaily', 'faithDaily', 'expDaily', 'heal', 'healAll', 'exp', 'lootSup', 'startMult', 'unitHp', 'unitAtk', 'heroAtk', 'heroHp', 'feverStart', 'feverRate', 'portalHp', 'bpLuck', 'defDmg'];
const K = M.DIR_K = 0.35, MAXLV = M.DIR_MAX = 3;
const each = (m, fn) => { if (m && m.base && M.eachBuilt) M.eachBuilt(m, (k, c, r) => { if (k !== 'core' && B[k]) fn(B[k], k, c, r); }); };
const fits = (D, Bd) => !!Bd && ((D.cats || []).includes(Bd.cat) || (D.styles || []).includes(Bd.style));
const flat = (fx) => (o, m, lv) => Object.keys(fx).forEach(x => { o[x] = (o[x] || 0) + fx[x] * lv; });
// n: name · c: colour · cats / styles: the buildings it strengthens (效果 ×(1 + 0.35 per level)) · t: the sentence · fn: its own extra
const DIRS = M.DIRS = {
  city:     { n: '城市化', c: '#ffd27a', t: '每 5 座建筑，每天多产 6 物资。', fn: (o, m, lv) => { let n = 0; each(m, () => { n++; }); o.supplyDaily = (o.supplyDaily || 0) + Math.floor(n / 5) * 6 * lv; } },
  fort:     { n: '堡垒化', c: '#d8c8b0', cats: ['defense'], styles: ['medieval'], t: '防御类和中世纪风格的建筑效果 +35%。' },
  market:   { n: '市场化', c: '#ff9a5a', cats: ['store'], styles: ['water'], t: '仓储类和水域风格的建筑效果 +35%，出征带回的物资 +10%。', fn: flat({ lootSup: 0.1 }) },
  industry: { n: '工业化', c: '#ff8a3a', cats: ['power'], styles: ['steam'], t: '生产类和蒸汽风格的建筑效果 +35%。' },
  army:     { n: '军事化', c: '#ff6a6a', cats: ['train'], t: '训练类建筑效果 +35%，出征部队攻击 +5%。', fn: flat({ unitAtk: 0.05 }) },
  pastoral: { n: '田园化', c: '#8ee06a', cats: ['med'], styles: ['nature'], t: '医疗类和自然风格的建筑效果 +35%。' },
  holy:     { n: '圣城化', c: '#ffe08a', cats: ['faith'], styles: ['fantasy'], t: '信仰类和玄幻风格的建筑效果 +35%。' },
  arcane:   { n: '秘法化', c: '#c89aff', styles: ['magic'], t: '魔法风格的建筑效果 +35%，领袖技能效果 +10%。', fn: flat({ skillPow: 0.1 }) },
  future:   { n: '未来化', c: '#6af4ff', styles: ['scifi'], t: '科幻风格的建筑效果 +35%，出征部队生命 +5%。', fn: flat({ unitHp: 0.05 }) },
  fun:      { n: '乐园化', c: '#ff8ac0', styles: ['cartoon'], t: '卡通风格的建筑效果 +35%，FEVER 槽涨得快 8%。', fn: flat({ feverRate: 0.08 }) },
};
M.DIR_ORDER = Object.keys(DIRS);
const ROMAN = ['', 'I', 'II', 'III'];
M.dirName = (k, lv) => DIRS[k].n + (lv ? ' ' + ROMAN[lv] : '');
const dirsOf = (m) => (m && m.dirs && typeof m.dirs === 'object') ? m.dirs : {};
M.dirLv = (m, k) => Math.min(MAXLV, Math.max(0, dirsOf(m)[k] | 0));
M.dirTaken = (m) => Object.keys(dirsOf(m)).reduce((a, k) => a + (DIRS[k] ? M.dirLv(m, k) : 0), 0);
// the look of the town: the deepest direction, the one taken last among equals
M.dirTop = (m) => { const d = dirsOf(m), ord = (m && m.dirOrd) || []; let best = null, bl = 0, bi = -1; Object.keys(d).forEach(k => { if (!DIRS[k]) return; const lv = M.dirLv(m, k), i = ord.lastIndexOf(k); if (lv > bl || (lv === bl && i > bi)) { best = k; bl = lv; bi = i; } }); return best; };
// how much stronger a building is by the directions taken (fighting buildings: life and damage; the rest: their numbers)
M.dirMul = (m, key) => { const Bd = B[key]; if (!Bd) return 1; let k = 0; Object.keys(dirsOf(m)).forEach(d => { if (DIRS[d] && fits(DIRS[d], Bd)) k += K * M.dirLv(m, d); }); return 1 + k; };
const oBM = M.baseMods;
M.baseMods = function (m) {
  const o = oBM.apply(this, arguments); const d = dirsOf(m); if (!m || M._dirIn || !Object.keys(d).length) return o;
  M._dirIn = true;
  try {
    Object.keys(d).forEach(k => { const D = DIRS[k], lv = M.dirLv(m, k); if (!D || !lv) return;
      if (D.cats || D.styles) each(m, (Bd) => { if (!fits(D, Bd) || !Bd.fx) return; SCALE.forEach(x => { if (typeof Bd.fx[x] === 'number') o[x] = (o[x] || 0) + Bd.fx[x] * K * lv; }); });
      if (D.fn) D.fn(o, m, lv); });
  } finally { M._dirIn = false; }
  return o;
};
// towers hit harder by the directions that fit them (their life and the other fighting buildings: mc-siege.js)
const oWS = M.weaponStats;
M.weaponStats = function (m, c, r) { const w = oWS.apply(this, arguments); if (!w) return w; const x = M.cell(m, c, r); if (x && x.b) w.dmg *= M.dirMul(m, x.b); return w; };
// 阿蒙森站: every building counts half as much again for 繁荣度
const oPros = M.prosperity;
if (oPros) M.prosperity = function (m) { const p = oPros.apply(this, arguments); return m && M.hasBuilt && M.hasBuilt(m, X => X.fx && X.fx.prosMul) ? Math.round(p * 1.5) : p; };
// how many standing rooms a direction strengthens (for the weighting and the card)
const count = (m, D) => { let n = 0; each(m, (Bd) => { if (fits(D, Bd)) n++; }); return n; };
M.dirCount = (m, k) => (DIRS[k] ? count(m, DIRS[k]) : 0);
// two directions: never maxed, ones already taken and ones your rooms fit come up more
M.dirOffer = function (m) {
  const pool = M.DIR_ORDER.filter(k => M.dirLv(m, k) < MAXLV), out = [];
  const w = (k) => 1 + (M.dirLv(m, k) ? 2 : 0) + (k === 'city' || count(m, DIRS[k]) > 0 ? 2 : 0);
  for (let i = 0; i < 2 && pool.length; i++) { const k = M.wpick(pool, w); out.push(k); pool.splice(pool.indexOf(k), 1); }
  return out;
};
// old saves: the picks their level already owes
const owed = (m) => { if (!m) return 0; if (m.dirOwe == null) m.dirOwe = Math.max(0, M.prosLv(m) - 1 - M.dirTaken(m)); return m.dirOwe; };
M.dirOwed = owed;

// ───────── when: right after a level's ring has opened (the homecoming waits) ─────────
const oES = G.expandStart;
G.expandStart = function (up) { const m = this.meta; owed(m); if (m && up) m.dirOwe = (m.dirOwe || 0) + Math.max(1, (up.to || 0) - (up.from || 0)); return oES.apply(this, arguments); };
const oHS = G.homeStep;
G.homeStep = function () { if (this.dirPick || this.dirFx || (this.meta && owed(this.meta) > 0 && !this.expand && this.screen === 'base')) return; return oHS.apply(this, arguments); };
G.dirOpen = function () {
  const m = this.meta, ks = M.dirOffer(m); if (!ks.length) { m.dirOwe = 0; return; }
  this.dirPick = { ks, at: now(), lv: M.prosLv(m) }; S.fanfare && S.fanfare(); this.bump();
};
G.dirTake = function (k) {
  const m = this.meta, P = this.dirPick; if (!P || !DIRS[k] || now() - P.at < 500) return; const from = M.dirTop(m);
  m.dirs = Object.assign({}, dirsOf(m)); m.dirs[k] = Math.min(MAXLV, (m.dirs[k] | 0) + 1); m.dirOrd = (m.dirOrd || []).concat([k]);
  m.dirOwe = Math.max(0, (m.dirOwe || 1) - 1); this.dirPick = null; this.save();
  // the town turns that way: a wave runs out from the main base and the new look grows behind it (mc-townlook.js)
  this.dirFx = { k, lv: m.dirs[k], t0: now() }; if (this.town) this.town.lookFx = { k, from, t: 0 };
  if (this.bv) { this.bv.keepFree && this.bv.keepFree(); this.bv.sel = null; this.bv.tx = M.BASE_GEO.DOOR_X; this.bv.ty = -160; this.bv.tz = Math.max(0.5, Math.min(0.62, 1920 / ((M.townSpan || 1600) + 700))); }
  S.up && S.up(3); S.whoosh && S.whoosh();
  this.bump();
};
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments), m = this.meta;
  if (m && this.screen === 'base' && !this.dirPick && !this.dirFx && !this.expand && !this.modal && !this.visit && !this.raid && !this.raidPrep && !this.rite && !this.tear && !this.lvFx && !this.lvPick && owed(m) > 0) this.dirOpen();
  if (this.dirPick && this.screen !== 'base') this.dirPick = null;
  if (this.dirFx && now() - this.dirFx.t0 > 2700) { this.dirFx = null; if (this.bv && this.bv.home) this.bv.home(); }
  return r;
};
// the pick has no way out but choosing; while the town turns, the base waits
const oBack = G.backAction; if (oBack) G.backAction = function () { if (this.dirPick) return; return oBack.apply(this, arguments); };
const oBusy = G.baseBusy; if (oBusy) G.baseBusy = function () { return !!this.dirFx || oBusy.apply(this, arguments); };
const oNG = G.newGame; if (oNG) G.newGame = function () { this.dirPick = null; this.dirFx = null; return oNG.apply(this, arguments); };
// the view: two cards, each with the town grown that way
const oView = G.view;
G.view = function () {
  const v = oView.call(this), P = this.dirPick, m = this.meta; v.dirOn = !!P && this.screen === 'base';
  if (v.dirOn) {
    const T = now(), ready = T - P.at > 500;
    // every card says what it strengthens (the category and style, icon + word) and which of your buildings those are, by
    // name in their quality colour (user ruling 2026-09-26: 「要显示出来，当前基地，对应风格或者类型的建筑的数量和具体名字
    // （带品质色），这样能给我一个指导性的参考……二选一中的风格和类型，要带icon和文字描述」)
    const QC = (q) => ((M.QUALITY[q] || M.QUALITY[0]).c);
    v.dp = { title: '繁荣度 Lv' + P.lv, line: '城市朝哪个方向长？', cards: P.ks.map((k, i) => { const D = DIRS[k], lv = M.dirLv(m, k) + 1;
      const tags = [].concat((D.cats || []).map(c => { const t = M.tagIc('cat', c); return t && { img: t.img, n: t.n + '类', c: t.c, tip: t.tip }; }), (D.styles || []).map(st => { const t = M.tagIc('style', st); return t && { img: t.img, n: t.n + '风格', c: t.c, tip: t.tip }; })).filter(Boolean);
      const own = {}; let all = 0; each(m, (Bd, bk) => { all++; if (fits(D, Bd)) own[bk] = (own[bk] || 0) + 1; });
      const blds = Object.keys(own).sort((a, c) => B[c].q - B[a].q || own[c] - own[a]).map(bk => ({ n: B[bk].n + (own[bk] > 1 ? ' ×' + own[bk] : ''), c: QC(B[bk].q) }));
      const nOwn = Object.keys(own).reduce((a, bk) => a + own[bk], 0), city = !D.cats && !D.styles;
      const have = city ? '你的基地有 ' + all + ' 座建筑，每天多产 ' + Math.floor(all / 5) * 6 * lv + ' 物资' : nOwn ? '你的基地里有 ' + nOwn + ' 座：' : '你的基地里还没有这类建筑';
      return { n: M.dirName(k, lv), c: D.c, t: D.t, tags, hasTags: tags.length > 0, have, blds, sub: lv > 1 ? '已经是 ' + M.dirName(k, lv - 1) + '，效果叠加' : '', hasSub: lv > 1, img: M.dirPreview ? M.dirPreview(k, lv) : '', op: ready ? 1 : 0.6, onPick: () => this.dirTake(k), fx: 'dir' + i }; }) };
  }
  return v;
};
// the 繁荣度 tip lists the directions taken
const oTip = G.tipFor;
G.tipFor = function (key) {
  const t = oTip.apply(this, arguments), m = this.meta;
  if (key === 'b-pros' && t && m && M.dirTaken(m)) t.lines = (t.lines || []).concat(M.DIR_ORDER.filter(k => M.dirLv(m, k)).map(k => ({ rich: [{ t: M.dirName(k, M.dirLv(m, k)) + '　', c: DIRS[k].c }, { t: DIRS[k].t, c: '#e8dcc4' }] })));
  return t;
};
if (M.GUIDE) M.GUIDE.push({ id: 'dirs', cat: '基地', icon: 't_pros', title: '发展方向', line: '繁荣度每升一级，从两个方向里选一个，城市就朝那边长。', scr: 'base', sel: '[data-tip="b-pros"]', when: (g) => M.dirTaken(g.meta) > 0 && !g.dirFx });
const oGB = G.guideBusy; if (oGB) G.guideBusy = function () { return !!(this.dirPick || this.dirFx) || oGB.apply(this, arguments); };
})();
