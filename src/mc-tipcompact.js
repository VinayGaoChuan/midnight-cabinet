// ==== mc-tipcompact.js ====
(function () {
// Pictures first (user ruling 2026-09-24). Tooltips lead with rows of icons. Only leaders (tips marked ctrl)
// keep their words behind Ctrl — a blinking blue line says so; every other tooltip shows its details directly.
// Tip builders may add:
//   briefTitle — the title shown without Ctrl ("Lv2 驱魔修女" instead of the full name)
//   brief      — rows of parts: { img, t, c, fs, is } or a bar { bar: 0..1, bc, bw } (then { t } for its numbers)
//   pic        — a picture for the header (unit portraits, item and relic icons)
const M = window.MC, G = M.Game.prototype;
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const IC = (k) => M.iconURL(k, 2), SP = (k) => M.spriteURL(k, 4);
const fmt = (n) => (M.fmt ? M.fmt(n) : String(n));
const rsegs = (arr) => (arr || []).map(s => ({ t: s.t || '', c: s.c || '#e8dcc4', img: s.img || '', hasImg: !!s.img, fw: s.b ? 700 : 400 }));
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

// ───────── leaders (user ruling 2026-09-24) ─────────
//   Lv2 驱魔修女 / life bar 1864/1870 / skill icon + name / blinking 按住 Ctrl… / blinking 有 N 个天赋点可用
// With Ctrl only the skill changes: it unfolds into its sentence; everything else stays where it was.
const oHT = G.heroTip;
G.heroTip = function (h) {
  const t = oHT.apply(this, arguments); if (!t || !h) return t;
  const m = this.meta, H = M.HEROES[h.cls], P = M.PSKILL && M.PSKILL[h.cls], mx = M.heroMaxHp(h, m), hp = Math.max(0, Math.round(h.hp)), f = hp / Math.max(1, mx);
  const bar = [{ bar: f, bc: f < 0.35 ? '#ff5a4a' : '#9cff7a', bw: 190 }, { t: hp + '/' + mx, c: '#e8dcc4' }];
  const s1 = { img: IC((M.SKILL_IC || {})[h.cls] || 't_skill'), t: H.skill.n, c: '#ffe08a' };
  t.title = t.briefTitle = 'Lv' + h.lv + ' ' + H.n;
  t.brief = [bar, [s1]];
  t.briefDet = [bar, { parts: [s1], desc: M.heroSkillD(h, m) }];
  t.kind = ''; t.d = ''; t.lines = [];
  t.alert = h.points > 0 ? { t: '有 ' + h.points + ' 个天赋点可用', c: '#f2c14e' } : null;
  t.ctrl = true;
  return t;
};

// units: see mc-awaken.js (name / vocation + power / one sentence, no Ctrl layer)
// items, relics and relic blueprints show their own picture
const oIT = G.itemTip; if (oIT) G.itemTip = function (key) { const t = oIT.apply(this, arguments); const I = M.ITEMS[key]; if (t && I && I.icon) t.pic = SP(I.icon); return t; };
const oRT = G.relicTip; if (oRT) G.relicTip = function (r) { const t = oRT.apply(this, arguments); const R = r && M.RELICS[r.key]; if (t && R && R.icon) t.pic = SP(R.icon); return t; };
const oRB = G.relicBpTip; if (oRB) G.relicBpTip = function (key) { const t = oRB.apply(this, arguments); const R = M.RELICS[key]; if (t && R && R.icon) t.pic = SP(R.icon); return t; };

// ───────── the tooltip view: header + icons; leaders' words only with Ctrl ─────────
const oView = G.view;
G.view = function () {
  const v = oView.call(this), tip = this.tipData, det = this.detailOn ? this.detailOn() : false;
  const kbm = !M.inputMode || M.inputMode(this) === 'kbm', hintTxt = kbm ? '按住 Ctrl 显示详细信息' : '点右下角 ⓘ 显示详细信息';
  if (tip && v.tip) {
    const T = v.tip, cmp = !!tip.ctrl; let brief = det && tip.briefDet ? tip.briefDet : tip.brief;
    // a row is an array of parts, or { parts, desc } when it also carries a line of text under its icons
    const part = (p) => ({ hasImg: !!p.img, img: p.img || '', is: p.is || 30, isBar: p.bar != null, bw: p.bw || 160, fill: Math.round(cl(p.bar || 0, 0, 1) * 100) + '%', bc: p.bc || '#9cff7a', hasT: p.t != null && p.t !== '', t: String(p.t == null ? '' : p.t), c: p.c || '#e8dcc4', fs: p.fs || 24 });
    const rows = (brief || []).map(r => Array.isArray(r) ? { parts: r } : r).filter(r => r && r.parts && r.parts.some(Boolean)).map(r => ({ parts: r.parts.filter(Boolean).map(part), hasDesc: !!r.desc, desc: r.desc ? rsegs(M.rich ? M.rich(r.desc, r.c || '#e8dcc4') : [{ t: r.desc, c: r.c }]) : [] }));
    T.brief = rows; T.hasBrief = rows.length > 0;
    T.hasPic = !!tip.pic && !T.hasIcon; T.pic = tip.pic || '';
    T.hasAlert = !!tip.alert; T.alertTxt = tip.alert ? tip.alert.t : ''; T.alertC = tip.alert ? tip.alert.c || '#f2c14e' : '#f2c14e';
    const more = !!(tip.kind || tip.d || (tip.lines && tip.lines.length) || tip.briefDet);
    if (cmp && !det) { if (tip.briefTitle) T.title = tip.briefTitle; T.hasKind = false; T.hasD = false; T.lines = []; }
    T.hint = cmp && more && !det; T.hintTxt = hintTxt;
  }
  // shop cards (see mc-awaken.js for the rest)
  if (v.s && this.run && this.run.shop) (v.s.units || []).forEach((su, i) => { const c = this.run.shop.units[i], sk = c && M.unitSkill && M.unitSkill(c.type); su.pwN = String(su.pw || '').replace(/[^\d.,万k]/g, '') || su.pw; su.hasSk = !!sk; });
  v.pwIc = IC('u_star'); v.skIc = IC('t_skill'); v.ctrlHint = hintTxt;
  if (v.w && this.run && this.run.hero) v.w.skIc = IC((M.SKILL_IC || {})[this.run.hero.cls] || 't_skill');
  // panels: terrain as an icon row, its effect right under it
  const pn = v.pn, P = this.panel, m = this.meta;
  if (pn && P && P.c != null && m) {
    const x = M.cell(m, P.c, P.r), T = x && x.tile && M.TILES[x.tile];
    pn.hasTileRow = !!(T && pn.hasTile);
    if (pn.hasTileRow && pn.chips) pn.chips = pn.chips.filter(ch => !/^地格/.test(ch.t || ''));   // the terrain row below says it with icons
    if (pn.hasTileRow) { const hid = M.tileHidden && M.tileHidden(m, P.c, P.r); pn.tileRow = [{ hasImg: true, img: IC(hid ? 'l_unknown' : 'l_' + x.tile), t: hid ? '未勘明的地脉' : T.n, c: T.c || '#ffe08a' }].concat(hid ? [] : ((M.tileBrief(x.tile) || [[]])[0]).map(p => ({ hasImg: !!p.img, img: p.img || '', t: p.t, c: p.c || '#e8dcc4' }))); if (pn.isDig) pn.tileRow = pn.tileRow.slice(1);   // the panel title already names the terrain
      pn.tileTxt = hid ? '' : T.d; }
  }
  if (pn) {
    pn.hint = !det && !!(this._dtHas); pn.hintTxt = hintTxt;
  }
  return v;
};
})();

;
