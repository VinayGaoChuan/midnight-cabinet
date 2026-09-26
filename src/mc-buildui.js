// ==== mc-buildui.js ====
(function () {
// Building on special terrain (user rulings 2026-09-25):
// - a room's tooltip says the terrain once: its two lines, each ticked green (works for this room) or crossed red;
// - the build list marks only rooms that fit the ground (a blinking ★), puts them first, and no longer repeats the
//   terrain under the list; the "works for any room" half is not marked at all (it is true for every room);
// - clicking unopened terrain lists the rooms you hold blueprints for, the same way, so you can tell whether opening it
//   is worth it.
// Loaded after mc-soul.js, whose build list re-sorts by affordability and quality.
const M = window.MC, G = M.Game.prototype, okC = '#9cff7a', noC = '#ff6a5a';
const tileAt = (m, c, r) => { const x = c != null && M.cell(m, c, r); return x && x.tile && M.TILES[x.tile] && !(M.tileHidden && M.tileHidden(m, c, r)) ? x.tile : null; };
M.fitsAt = (m, c, r, key) => { const tk = tileAt(m, c, r); return !!(tk && M.tileFits(tk, key)); };
// the terrain, once: the any-room line always holds, the fitting line holds only for fitting rooms
M.tileCheckLines = function (tk, key) {
  const T = M.TILES[tk], fit = M.tileFits(tk, key);
  return [{ t: '地格「' + T.n + '」', c: T.c }, { t: '✔ 任何房间：' + T.anyD, c: okC }, { t: (fit ? '✔ ' : '✘ ') + '契合「' + T.fitN + '」：' + T.fitD, c: fit ? okC : noC }];
};
const oBT = G.bldTip;
G.bldTip = function (key, c, r) {
  const t = oBT.apply(this, arguments), tk = t && tileAt(this.meta, c, r); if (!tk) return t;
  const T = M.TILES[tk];
  t.lines = (t.lines || []).filter(l => { const s = l.t || ''; return s !== T.n + '：' + T.d && !/^地格加成 · /.test(s) && !/　✔$/.test(s) && !/^(任何房间|契合「)/.test(s); }).concat(M.tileCheckLines(tk, key));
  return t;
};
// fitting rooms first, the rest in the order they had
const oBO = M.buildOptions;
M.buildOptions = function (m, c, r) {
  const list = oBO.apply(this, arguments); if (!tileAt(m, c, r)) return list;
  return list.map((o, i) => ({ o, i, f: M.fitsAt(m, c, r, o.key) ? 1 : 0 })).sort((a, b) => (b.f - a.f) || (a.i - b.i)).map(z => Object.assign(z.o, { fit: !!z.f }));
};
const BLINK = 'fitBlink 1s ease-in-out infinite';
const card = (g, m, c, r, o) => ({
  thumb: M.roomThumb(o.key), n: M.qn ? M.qn(o.B.n, o.B.q) + (o.count > 1 ? ' ×' + o.count : '') : o.B.n, c: M.qc ? M.qc(o.B.q) : '#ffe8b0',
  si: M.tagIc('style', o.B.style) || { img: '', tip: '', c: '#07060f' }, ci: M.tagIc('cat', o.B.cat) || { img: '', tip: '', c: '#07060f' },
  ms: [{ img: M.spriteURL('sack', 4), t: String(o.cost) }].concat(o.sh ? [{ img: M.spriteURL('shard', 4), t: String(o.sh) }] : []).concat([{ img: M.iconURL('t_hourglass', 2), t: o.days + ' 天' }]),
  bonus: o.fit ? '★ 契合地格' : '', banim: o.fit ? BLINK : 'none', border: o.fit ? '#ffcf4a' : o.B.q ? M.qc(o.B.q) : '#8a6a3a',
  tipOn: g.tipFn(() => g.bldTip(o.key, c, r)),
});
const oView = G.view;
G.view = function () {
  const v = oView.call(this), pn = v.pn, p = this.panel, m = this.meta; if (!pn || !p || p.c == null || !m) return v;
  if (pn.isRoom && p.key === 'core') { pn.title = '主基地 · 仓库'; pn.sub = ''; }   // the stock lives in the main base on the surface (2026-09-25)
  const tk = tileAt(m, p.c, p.r);
  if (pn.isBuild) {
    pn.hasTile = false; pn.tileTxt = '';   // the terrain is said on each room that fits, and in each room's tooltip
    const opts = M.buildOptions(m, p.c, p.r); (pn.opts || []).forEach((o, i) => { const q = opts[i]; o.bonus = q && q.fit ? '★ 契合地格' : ''; o.banim = q && q.fit ? BLINK : 'none'; if (q && q.fit && !q.why) o.border = '#ffcf4a'; });
  }
  pn.hasDigOpts = false; pn.digOpts = [];
  if (pn.isDig && tk) { const opts = M.buildOptions(m, p.c, p.r); pn.digOpts = opts.map(o => card(this, m, p.c, p.r, o)); pn.hasDigOpts = pn.digOpts.length > 0; }
  return v;
};
})();

;
