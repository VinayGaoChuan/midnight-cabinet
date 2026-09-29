// ==== mc-bbar.js ====
(function () {
// The battle bar (user ruling 2026-09-29: 「战斗的时候，一闪而过很多东西，实际上都没看全。需要把本场战斗的所有加成，和羁绊都
// 显示出来，但是都要是一句话描述，并且有序排列。每个显示可以默认是一个icon，然后等鼠标悬浮之后，在从tip里面看到描述内容。
// 如果是羁绊的话，激活的是亮的，没激活的是暗的。包括英雄对队伍的加成也要显示出来，默认也是个icon」).
// A row of icons at the top left of the field for the whole fight, always in this order: the army's bonds (lit when active,
// dim when not yet), the leader's passive, then what comes from outside the fight (M.boonsOf): talents, relics, the base's
// buildings, the directions, religion, the god, wonders, what the way gave. Hovering one shows its name and one sentence.
const M = window.MC, G = M.Game.prototype;
const RANK = (c) => (/^天赋/.test(c.n) ? 1 : /^宝物/.test(c.n) ? 2 : /^基地建筑/.test(c.n) ? 3 : /^宗教/.test(c.n) ? 5 : /^奇观/.test(c.n) ? 7 : c.n === '这一趟途中' ? 8 : c.ic === 'f_faith' ? 6 : 4);
const end = (t) => (/[。！？.!?]$/.test(t) ? t : t + '。');

M.battleBar = function (g) {
  const run = g.run, b = g.battle, out = []; if (!run || !b || (run.region && run.region.tut)) return out;
  // the bonds: every race the army has, the active ones first
  if (M.synRows && M.SYN && !run.raid) {
    const live = b.syn || {};
    M.synRows(run.roster.map(u => u.type), run).map(r => Object.assign({}, r, { L: live[r.r] || r.L })).sort((a, c) => c.L - a.L || c.n - a.n).forEach(r => {
      const s = M.SYN[r.r]; if (!s) return; const L = r.L, need = M.SYN_AT[L], name = r.r + ' · ' + (L >= 3 ? s.top : s.n);
      out.push({ img: r.img, c: L >= 3 ? '#ffcf4a' : r.c, lit: L > 0, title: name + ' ' + r.n + (need ? ' / ' + need : ''),
        d: L ? end(L >= 3 ? s.topD : s.d[L - 1]) : '还差 ' + (M.SYN_AT[0] - r.n) + ' 支：' + end(s.d[0]) });
    });
  }
  // the leader's passive: what the leader gives the whole army
  const h = run.hero, P = h && M.passiveOf && M.passiveOf(h), H = h && M.HEROES[h.cls];
  if (P && H) out.push({ img: M.spriteURL(H.sprite, 3), fit: true, c: P.col, lit: true, title: P.n, d: M.heroSkillD ? M.heroSkillD(h) : end(M.skillDesc(h)) });
  // everything from outside the fight, in a fixed order
  (M.boonsOf ? M.boonsOf(run) : []).filter(c => !c.syn).map((c, i) => ({ c, i })).sort((a, x) => RANK(a.c) - RANK(x.c) || a.i - x.i)
    .forEach(({ c }) => out.push({ img: M.iconURL(c.ic, 2), c: c.c, lit: true, title: c.n, d: end(c.t) }));
  return out;
};

const oView = G.view;
G.view = function () {
  const v = oView.call(this);
  if (this.screen !== 'battle' || !this.battle) { v.bb = { on: false, items: [] }; return v; }
  // worked out once per fight: the view runs every frame
  if (!this._bb || this._bb.b !== this.battle) {
    const list = M.battleBar(this);
    this._bb = { b: this.battle, v: { on: list.length > 0, items: list.map(x => ({ img: x.img, fit: !!x.fit, c: x.c, op: x.lit ? 1 : 0.38, flt: x.lit ? 'none' : 'grayscale(1)', tipOn: this.tipFn({ title: x.title, c: x.c, d: x.d }) })) } };
  }
  v.bb = this._bb.v;
  return v;
};

if (M.GUIDE) { const c = M.GUIDE.find(x => x.id === 'boons'); if (c) Object.assign(c, { title: '战斗加成', line: '这一仗生效的羁绊和加成，一个图标一项；暗的羁绊还没凑齐。', sel: '[data-g="bbar"]' }); }
})();
