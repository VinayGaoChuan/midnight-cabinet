// ==== mc-names.js ====
(function () {
// One naming rule everywhere: just the name, written in the quality colour (普通白 / 稀有蓝 / 史诗紫 / 传说金) — the colour is the quality.
// Buildings read in three parts: name + quality, then tags + power, then the description.
const M = window.MC, G = M.Game.prototype, Q = M.QUALITY, TG = M.TAG;
const QN = Q.map(q => q.n);
M.qn = (name) => name;
M.qc = (q) => (Q[q] || Q[0]).c;
const stripQ = (s) => String(s || '').replace(new RegExp('^(' + QN.join('|') + ')(\\s*·\\s*)?'), '').replace(/^\s*·\s*/, '');
const named = (t, name, q) => { if (!t) return t; t.title = M.qn(name, q); t.c = M.qc(q); t.kind = stripQ(t.kind); return t; };

// ───────── tooltips ─────────
const oUT = M.unitTip;
M.unitTip = function (k, u, run) { const t = oUT.call(this, k, u, run), d = M.DB[k]; return d ? named(t, d.n, d.q) : t; };
// items keep their dark gold: they have no quality
const oRT = G.relicTip; G.relicTip = function (r) { const t = oRT.call(this, r); return r ? named(t, M.RELICS[r.key].n, r.q) : t; };
const oHT = G.heroTip; G.heroTip = function (h) { const t = oHT.call(this, h); if (!t || !h) return t; t.title = 'Lv' + h.lv + ' ' + M.heroN(h); t.c = M.qc(h.rarity); t.kind = stripQ(t.kind); return t; };
// blueprints carry the building's quality in their name
const oInfo = M.itemInfo;
M.itemInfo = function (key) { const I = oInfo.call(this, key); if (key && key.startsWith('bbp:')) { const B = M.BUILDINGS[key.slice(4)]; if (B) { I.n = M.qn(B.n + '图纸', B.q); I.c = M.qc(B.q); } } return I; };

// ───────── buildings: name（品质） / tags + power / description ─────────
const powerSeg = (pw) => ({ t: pw >= 0 ? '电力 +' + pw : '耗电 ' + (-pw), c: pw >= 0 ? '#9cff7a' : '#ff9a6a', b: 1 });
M.bldTop = function (key, pw) {
  const B = M.BUILDINGS[key], st = TG.style(B.style), ct = TG.cat(B.cat);
  return [{ img: M.iconURL(st.icon, 1) }, { t: st.n, c: st.c, b: 1 }, { t: '　' }, { img: M.iconURL(ct.icon, 1) }, { t: ct.n, c: ct.c, b: 1 }];
};
const oBT = G.bldTip;
G.bldTip = function (key, c, r) {
  const t = oBT.call(this, key, c, r), B = M.BUILDINGS[key], m = this.meta, pw = c != null ? M.roomPw(m, c, r, key) : B.pw;
  t.title = M.qn(B.n, B.q); t.c = M.qc(B.q); t.kind = ''; t.top = M.bldTop(key, pw); t.icon = null;
  // drop the old quality/tag line and the power line; keep range and tile bonus lines
  t.lines = (t.lines || []).filter(l => !(l.rich && l.rich.some(s => s.img)) && !/^(电力 \+|耗电 )/.test(l.t || ''));
  return t;
};

// ───────── tooltip view: the second line (tags / power) with icons ─────────
const segs = (arr) => (arr || []).map(s => ({ t: s.t || '', c: s.c || '#e8dcc4', img: s.img || '', hasImg: !!s.img, fw: s.b ? 700 : 400 }));
const oView = G.view;
G.view = function () {
  const v = oView.call(this), tip = this.tipData, m = this.meta, run = this.run;
  if (tip && v.tip) { v.tip.hasTop = !!(tip.top && tip.top.length); v.tip.top = v.tip.hasTop ? segs(tip.top) : []; v.tip.kind = stripQ(v.tip.kind).replace(/^\s*·\s*/, ''); v.tip.hasKind = !!v.tip.kind; v.tip.title = tip.title; v.tip.c = tip.c || v.tip.c; }
  // shop cards
  if (v.s && run && run.shop) {
    (v.s.units || []).forEach((u, i) => { const c = run.shop.units[i], d = c && M.DB[c.type]; if (d) { u.n = M.qn(d.n, d.q); u.qn = ''; } });
    (v.s.banners || []).forEach((b, i) => { const c = run.shop.banners[i], L = c && M.LEGION[c.key]; if (L) b.n = M.qn(L.name, c.q); });
  }
  // panels: room title, build options, hero, loadout
  if (v.pn && this.panel) {
    const p = this.panel, pn = v.pn;
    if (pn.isRoom) { const B = M.BUILDINGS[p.key], pw = M.roomPw(m, p.c, p.r, p.key); pn.title = M.qn(B.n, B.q); pn.titleColor = M.qc(B.q); pn.sub = '';
      pn.chips = (pn.chips || []).filter(ch => !/^(电力 \+|耗电 )/.test(ch.t)); }
    if (pn.isBuild && pn.opts) { const opts = M.buildOptions(m, p.c, p.r); pn.opts.forEach((o, i) => { const x = opts[i]; if (!x) return; o.n = M.qn(x.B.n, x.B.q) + (x.count > 1 ? ' ×' + x.count : ''); o.c = M.qc(x.B.q); }); }
    if (pn.isHero) { const h = m.heroes.find(x => x.id === p.id); if (h) { pn.title = M.heroN(h); pn.titleColor = M.qc(h.rarity); } }
    if (pn.isLoadout && pn.heroes) pn.heroes.forEach((x, i) => { const h = m.heroes[i]; if (h) { x.n = M.heroN(h); x.c = M.qc(h.rarity); } });
    if (pn.heroes && !pn.isLoadout) pn.heroes.forEach((x, i) => { const h = m.heroes[i]; if (h && x.n) { x.n = M.heroN(h) + ' · Lv ' + h.lv; x.c = M.qc(h.rarity); } });
  }
  return v;
};
const oTF = G.tipFor;
G.tipFor = function (key) { if (key === 'b-power' && this.panel && this.panel.kind === 'room') { const p = this.panel, pw = M.roomPw(this.meta, p.c, p.r, p.key); return { title: pw >= 0 ? '电力 +' + pw : '耗电 ' + (-pw), c: pw >= 0 ? '#9cff7a' : '#ff9a6a', d: pw >= 0 ? '这个房间向基地供电。' : '这个房间运转要消耗电力。电力不够时，新的耗电建筑建不了。', icon: 'f_power' }; } return oTF.call(this, key); };
// mini-game recruit cards and claw prizes speak the same language
if (M.MINI && M.MINI.recruit) { const D = M.MINI.recruit, oB = D.btns; D.btns = function (mg) { const b = oB.call(this, mg); (b || []).forEach((x, i) => { const c = mg.cards && mg.cards[i]; if (c && x.t && x.t.startsWith('选 ')) x.t = '选 ' + M.qn(M.DB[c.k].n, M.DB[c.k].q); }); return b; }; }
})();

;
