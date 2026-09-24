// ==== mc-game-j.js ====
(function () {
// Tags everywhere: race / vocation / building style / building function are icons + coloured words, and every icon explains itself.
const M = window.MC, G = M.Game.prototype, DB = M.DB, TG = M.TAG;
const now = () => performance.now();
// icon data-URLs are cached (views are rebuilt every frame)
const urlC = new Map(), oldURL = M.iconURL;
M.iconURL = function (key, s) { const k = key + '|' + s; let u = urlC.get(k); if (u == null) { u = oldURL(key, s); urlC.set(k, u); } return u; };
M.tagIc = (kind, k) => { const t = TG[kind] && TG[kind](k); return t ? { img: M.iconURL(t.icon, 2), tip: 'tag-' + kind + '-' + k, c: t.c, n: t.n } : null; };
const NIL = { img: '', tip: '', c: '#fff', n: '' };
const tagFromKey = (key) => {
  const m = /^tag-(race|voc|style|cat|tile)-(.+)$/.exec(key || ''); if (!m) return null;
  if (m[1] === 'tile') { const T = M.TILES[m[2]]; return T && { title: T.n, c: T.c, kind: '特殊地格', d: T.d, icon: 'l_' + m[2], ctx: 'bld' }; }
  const t = TG[m[1]](m[2]); return t && Object.assign(M.tagTip(t), { ctx: m[1] === 'style' || m[1] === 'cat' ? 'bld' : null });
};
M.tagFromKey = tagFromKey;
const oldTipFor = G.tipFor;
G.tipFor = function (key) { return tagFromKey(key) || oldTipFor.call(this, key); };
// a badge inside a card overrides the card's tip while hovered and hands it back afterwards
G.tipDeleg = function (t) {
  const el = t && t.closest ? t.closest('[data-tip]') : null;
  if (el) { const k = el.getAttribute('data-tip'); if (k !== this.tipKey) { const d = this.tipFor(k); if (d) { if (!this.tipKey) this.tipPrev = this.tipData; this.tipKey = k; this.tipData = d; M.Sfx.hover(); this.bump(); } } }
  else if (this.tipKey) { this.tipKey = null; this.tipData = this.tipPrev || null; this.tipPrev = null; this.bump(); }
};

// ───────── tooltip view: header icon, rich description, icon segments ─────────
const segs = (arr) => (arr || []).map(s => ({ t: s.t || '', c: s.c || '#e8dcc4', img: s.img || '', hasImg: !!s.img, fw: s.b ? 700 : 400 }));
M.richSegs = (s, base, ctx) => segs(M.rich(s, base, ctx));
const oldView = G.view;
G.view = function () {
  const v = oldView.call(this), tip = this.tipData, run = this.run, t0 = now();
  if (tip && v.tip) {
    if (this._tipSrc !== tip) { this._tipSrc = tip; this._tipV = { hasIcon: !!tip.icon, icon: tip.icon ? M.iconURL(tip.icon, 3) : '', dsegs: segs(M.rich(tip.d || '', '#e8dcc4', tip.ctx)), lines: (tip.lines || []).map(l => ({ segs: segs(l.rich || M.rich(l.t, l.c, tip.ctx)) })) }; }
    Object.assign(v.tip, this._tipV);
  }
  // world HUD roster: race top-left, vocation top-right
  if (v.w && run && v.w.roster) { const vis = run.roster.filter(u => !this.hideU.has(u.uid)); v.w.roster.forEach((r, i) => { const d = vis[i] && DB[vis[i].type]; const ri = d && M.tagIc('race', d.race), vi = d && M.tagIc('voc', d.voc); Object.assign(r, { ri: ri || NIL, vi: vi || NIL, hasR: !!ri, hasV: !!vi }); }); }
  if (v.w && run && v.w.banners) v.w.banners.forEach((b, i) => { const k = Object.keys(run.legion)[i], L = M.LEGION[k]; b.ic = banIc(L); });
  // shop cards
  if (v.s && run && run.shop) {
    (v.s.units || []).forEach((u, i) => { const c = run.shop.units[i], d = c && DB[c.type]; const ri = d && M.tagIc('race', d.race), vi = d && M.tagIc('voc', d.voc); Object.assign(u, { ri: ri || NIL, vi: vi || NIL, hasR: !!ri, hasV: !!vi }); });
    (v.s.banners || []).forEach((b, i) => { const c = run.shop.banners[i]; b.ic = banIc(M.LEGION[c.key]); b.icTip = banTip(M.LEGION[c.key]); b.hasIcTip = !!b.icTip; });
  }
  // event choices: tag words inside the sub line become icons
  if (v.md && v.md.choices) v.md.choices.forEach(mb => { mb.subSegs = M.richSegs(mb.sub || '', 'inherit'); });
  // rooms: quality text + two tag chips; build options show their tags too
  if (v.pn && this.panel) {
    const p = this.panel;
    if (v.pn.isRoom) { const B = M.BUILDINGS[p.key]; v.pn.sub = (p.key === 'core' ? '核心 · ' : B.q ? '奇观 · ' : '') + M.QUALITY[B.q].n; v.pn.tags = [M.tagIc('style', B.style), M.tagIc('cat', B.cat)]; v.pn.hasTags = true; }
    else v.pn.hasTags = false;
    if (v.pn.isBuild && v.pn.opts) { const opts = M.buildOptions(this.meta, p.c, p.r); v.pn.opts.forEach((o, i) => { const B = opts[i] && opts[i].B; o.si = B ? M.tagIc('style', B.style) : NIL; o.ci = B ? M.tagIc('cat', B.cat) : NIL; }); }
  }
  return v;
};
const banIc = (L) => { const m = L && L.m || {}; if (m.voc) return M.iconURL(TG.voc(m.voc).icon, 2); if (m.race) return M.iconURL(TG.race(m.race).icon, 2); return M.iconURL(m.mult ? 't_mult' : m.base ? 'v_merchant' : 'u_star', 2); };
const banTip = (L) => { const m = L && L.m || {}; return m.voc ? 'tag-voc-' + m.voc : m.race ? 'tag-race-' + m.race : ''; };

// ───────── unit tooltips: race & vocation with their icons ─────────
const oldUT = M.unitTip;
M.unitTip = function (k, u, run) {
  const t = oldUT(k, u, run), d = DB[k]; if (!d || !t.lines[0] || !t.lines[0].rich) return t;
  const out = []; t.lines[0].rich.forEach(s => { const tg = s.t === d.race ? TG.race(d.race) : s.t === d.voc ? TG.voc(d.voc) : null; if (tg) out.push({ img: M.iconURL(tg.icon, 1) }); out.push(s); });
  t.lines[0] = { rich: out }; return t;
};

// ───────── buildings: tag line with icons; the headquarters is the core, not a wonder ─────────
const oldBT = G.bldTip;
G.bldTip = function (key, c, r) {
  const t = oldBT.call(this, key, c, r), B = M.BUILDINGS[key], st = TG.style(B.style), ct = TG.cat(B.cat), Q = M.QUALITY[B.q];
  t.lines[0] = { rich: [{ t: Q.n, c: Q.c, b: 1 }, { t: '　' }, { img: M.iconURL(st.icon, 1) }, { t: st.n, c: st.c, b: 1 }, { t: '　' }, { img: M.iconURL(ct.icon, 1) }, { t: ct.n, c: ct.c, b: 1 }] };
  t.kind = key === 'core' ? '核心建筑' : B.q ? '奇观' : '建筑'; t.icon = ct.icon; t.ctx = 'bld';
  return t;
};
const oldCT = G.cellTip;
G.cellTip = function (p) { const t = oldCT.call(this, p); if (t && !p.door) t.ctx = 'bld'; return t; };

// ───────── base overview badges: hover explains the tag ─────────
const oldBM = G.baseMove;
G.baseMove = function (sx, sy) {
  oldBM.call(this, sx, sy);
  const bv = this.bv; if (this.raid || (this.drag && this.drag.moved)) { bv.hoverIc = null; return; }
  const ic = (bv.icons || []).find(i => sx >= i.x && sx <= i.x + i.w && sy >= i.y && sy <= i.y + i.h);
  if (!ic) { bv.hoverIc = null; return; }
  const T = ic.tip; let tip = null, hk = '';
  if (T.tag) { tip = Object.assign(M.tagTip(T.tag), { ctx: 'bld', lines: [{ t: '这个房间：' + M.BUILDINGS[T.key].n, c: '#a89ca8' }] }); hk = T.tag.kind === 'style' ? 's' : 'f'; }
  else if (T.job) { tip = Object.assign(this.cellTip({ c: T.c, r: T.r }), { icon: M.cell(this.meta, T.c, T.r).job.kind === 'dig' ? 'u_pick' : 'u_hammer' }); hk = 'j'; }
  else if (T.tile) { tip = tagFromKey('tag-tile-' + T.tile); hk = 't'; }
  const key = T.c + ',' + T.r + hk; if (key !== this.hoverIcK) { this.hoverIcK = key; M.Sfx.hover(); }
  bv.hoverIc = { c: T.c, r: T.r, k: hk }; this.tipData = tip;
};
const oldBL = G.baseLeave; G.baseLeave = function () { if (this.bv) this.bv.hoverIc = null; this.hoverIcK = null; return oldBL.call(this); };

// ───────── room thumbnails carry the two tag badges too ─────────
const oldThumb = M.roomThumb, thumbC = {};
M.roomThumb = function (key) {
  if (thumbC[key]) return thumbC[key];
  const B = M.BUILDINGS[key], src = oldThumb(key), c = document.createElement('canvas'); c.width = 450; c.height = 315; const x = c.getContext('2d'); x.imageSmoothingEnabled = false;
  const im = new Image(); im.src = src; thumbC[key] = src;
  im.onload = () => { x.drawImage(im, 0, 0); const b = (ic, X, Y, col) => { x.fillStyle = 'rgba(8,6,10,0.86)'; x.fillRect(X, Y, 66, 66); x.fillStyle = col; x.fillRect(X, Y, 66, 4); x.fillRect(X, Y + 62, 66, 4); x.fillRect(X, Y, 4, 66); x.fillRect(X + 62, Y, 4, 66); x.drawImage(M.iconCanvas(ic, 3), X + 6, Y + 6, 54, 54); };
    const st = TG.style(B.style), ct = TG.cat(B.cat); b(st.icon, 14, 14, st.c); b(ct.icon, 450 - 80, 315 - 80, ct.c); thumbC[key] = c.toDataURL(); if (M._g) M._g.bump(); };
  return thumbC[key];
};
})();

;
