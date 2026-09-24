// ==== mc-tipcompact.js ====
(function () {
// Pictures first, words on demand (user ruling 2026-09-24). Every tooltip shows its header and rows of icons; the text
// (kind, description, extra lines) appears only while Ctrl is held — a blinking blue line says so. Cards, terrain and
// panels follow the same rule. Tip builders may add:
//   briefTitle — the title shown without Ctrl ("Lv2 驱魔修女" instead of the full name)
//   brief      — rows of parts: { img, t, c, fs, is } or a bar { bar: 0..1, bc, bw } (then { t } for its numbers)
//   pic        — a picture for the header (unit portraits, item and relic icons)
const M = window.MC, G = M.Game.prototype;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const IC = (k) => M.iconURL(k, 2), SP = (k) => M.spriteURL(k, 4);
const fmt = (n) => (M.fmt ? M.fmt(n) : String(n));
try { const st = document.createElement('style'); st.textContent = '[data-blink]{animation:mcBlink 1.2s ease-in-out infinite}@keyframes mcBlink{0%,100%{opacity:1}50%{opacity:.28}}'; document.head.appendChild(st); } catch (e) {}

// words that name a room tag → the tag's icon (terrain "契合" targets)
// (terrain says 防守 / 武器 for defence rooms and 奇观 for landmarks)
const ALIAS = { 防守: ['cat', 'defense'], 武器: ['cat', 'defense'] };
const tagByName = (n) => {
  if (n === '奇观') return { img: IC('u_star'), c: '#ffcc33' };
  if (ALIAS[n]) return M.tagIc(ALIAS[n][0], ALIAS[n][1]);
  const cat = Object.keys(M.CAT || {}).find(k => M.CAT[k] === n), sty = Object.keys(M.STYLE || {}).find(k => M.STYLE[k] === n);
  return (cat && M.tagIc('cat', cat)) || (sty && M.tagIc('style', sty)) || null;
};
M.tileBrief = function (key) {
  const T = M.TILES && M.TILES[key]; if (!T) return null; const row = [{ t: '契合', c: '#a89ca8', fs: 20 }];
  String(T.fitN || '').split(/\s*[\/、]\s*/).filter(Boolean).forEach(n => { const tg = tagByName(n); row.push(tg ? { img: tg.img, t: n, c: tg.c, fs: 22 } : { t: n, c: '#ffe08a', fs: 22 }); });
  return row.length > 1 ? [row] : null;
};

// ───────── leaders: "Lv2 驱魔修女" / life bar / the two skills ─────────
const oHT = G.heroTip;
G.heroTip = function (h) {
  const t = oHT.apply(this, arguments); if (!t || !h) return t;
  const H = M.HEROES[h.cls], P = M.PSKILL && M.PSKILL[h.cls], mx = M.heroMaxHp(h, this.meta), hp = Math.max(0, Math.round(h.hp)), f = hp / Math.max(1, mx);
  t.briefTitle = 'Lv' + h.lv + ' ' + H.n;
  t.brief = [
    [{ bar: f, bc: f < 0.35 ? '#ff5a4a' : '#9cff7a', bw: 190 }, { t: hp + '/' + mx, c: '#e8dcc4' }],
    [{ img: IC((M.SKILL_IC || {})[h.cls] || 't_skill'), t: H.skill.n, c: '#ffe08a' }, P ? { img: IC(P.ic), t: P.n, c: P.col } : null],
  ];
  return t;
};

// ───────── units: portrait, race & vocation, life / attack / power (and price), the active skill ─────────
const oUT = M.unitTip;
M.unitTip = function (k, u, run) {
  const t = oUT.apply(this, arguments), d = M.DB[k]; if (!t || !d) return t;
  const ri = M.tagIc('race', d.race), vi = d.voc && M.tagIc('voc', d.voc), sk = M.unitSkill && M.unitSkill(k), price = /价格\s*(\d+)/.exec(t.kind || '');
  t.pic = SP(k);
  const stats = [{ img: IC('t_heart'), t: fmt(d.hp + (u && u.bHp || 0)) }, { img: IC('t_sword'), t: fmt(d.atk + (u && u.bAtk || 0)) }, { img: IC('u_star'), t: M.unitPower ? M.unitPower(k, u) : '' }];
  if (price) stats.push({ img: SP('coin'), t: price[1], c: '#ffcc33' });
  t.brief = [[ri && { img: ri.img, t: d.race, c: ri.c, fs: 22 }, vi && { img: vi.img, t: d.voc, c: vi.c, fs: 22 }], stats];
  if (sk) t.brief.push([{ img: IC('t_skill'), t: sk.n, c: '#ffe08a' }]);
  return t;
};
// items, relics and relic blueprints show their own picture
const oIT = G.itemTip; if (oIT) G.itemTip = function (key) { const t = oIT.apply(this, arguments); const I = M.ITEMS[key]; if (t && I && I.icon) t.pic = SP(I.icon); return t; };
const oRT = G.relicTip; if (oRT) G.relicTip = function (r) { const t = oRT.apply(this, arguments); const R = r && M.RELICS[r.key]; if (t && R && R.icon) t.pic = SP(R.icon); return t; };
const oRB = G.relicBpTip; if (oRB) G.relicBpTip = function (key) { const t = oRB.apply(this, arguments); const R = M.RELICS[key]; if (t && R && R.icon) t.pic = SP(R.icon); return t; };

// ───────── the tooltip view: header + icons, words only with Ctrl ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), tip = this.tipData, det = this.detailOn ? this.detailOn() : false;
  const kbm = !M.inputMode || M.inputMode(this) === 'kbm', hintTxt = kbm ? '按住 Ctrl 显示详细信息' : '点右下角 ⓘ 显示详细信息';
  if (tip && v.tip) {
    const T = v.tip; let brief = tip.brief;
    if (!brief && tip.icon && /^l_/.test(tip.icon) && tip.icon !== 'l_unknown') brief = M.tileBrief(tip.icon.slice(2));
    const rows = (brief || []).filter(r => r && r.some(Boolean)).map(r => ({ parts: r.filter(Boolean).map(p => ({ hasImg: !!p.img, img: p.img || '', is: p.is || 30, isBar: p.bar != null, bw: p.bw || 160, fill: Math.round(cl(p.bar || 0, 0, 1) * 100) + '%', bc: p.bc || '#9cff7a', hasT: p.t != null && p.t !== '', t: String(p.t == null ? '' : p.t), c: p.c || '#e8dcc4', fs: p.fs || 24 })) }));
    T.brief = rows; T.hasBrief = rows.length > 0;
    T.hasPic = !!tip.pic && !T.hasIcon; T.pic = tip.pic || '';
    const more = !!(tip.kind || tip.d || (tip.lines && tip.lines.length));
    if (!det) { if (tip.briefTitle) T.title = tip.briefTitle; T.hasKind = false; T.hasD = false; T.lines = []; }
    T.hint = more && !det; T.hintTxt = hintTxt;
  }
  // shop cards: power as an icon and a number, a skill icon when the unit has one; words behind Ctrl
  if (v.s && this.run && this.run.shop) (v.s.units || []).forEach((su, i) => { const c = this.run.shop.units[i], sk = c && M.unitSkill && M.unitSkill(c.type); su.pwN = String(su.pw || '').replace(/[^\d.,万k]/g, '') || su.pw; su.hasSk = !!sk; });
  v.pwIc = IC('u_star'); v.skIc = IC('t_skill'); v.ctrlHint = hintTxt;
  if (v.w && this.run && this.run.hero) v.w.skIc = IC((M.SKILL_IC || {})[this.run.hero.cls] || 't_skill');
  // panels: terrain as icons (words with Ctrl), room text behind Ctrl
  const pn = v.pn, P = this.panel, m = this.meta;
  if (pn && P && P.c != null && m) {
    const x = M.cell(m, P.c, P.r), T = x && x.tile && M.TILES[x.tile];
    pn.hasTileRow = !!(T && pn.hasTile);
    if (pn.hasTileRow && pn.chips) pn.chips = pn.chips.filter(ch => !/^地格/.test(ch.t || ''));   // the terrain row below says it with icons
    if (pn.hasTileRow) { const hid = M.tileHidden && M.tileHidden(m, P.c, P.r); pn.tileRow = [{ hasImg: true, img: IC(hid ? 'l_unknown' : 'l_' + x.tile), t: hid ? '未勘明的地脉' : T.n, c: T.c || '#ffe08a' }].concat(hid ? [] : ((M.tileBrief(x.tile) || [[]])[0]).map(p => ({ hasImg: !!p.img, img: p.img || '', t: p.t, c: p.c || '#e8dcc4' }))); pn.tileTxt = this.D('', pn.tileTxt); }
  }
  if (pn) {
    if (pn.isRoom && pn.d) pn.d = this.D('', pn.d);
    if (pn.isDig && pn.digTxt) pn.digTxt = this.D('', pn.digTxt);
    pn.hint = !det && !!(this._dtHas); pn.hintTxt = hintTxt;
  }
  return v;
};
})();

;
