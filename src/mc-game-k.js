// ==== mc-game-k.js ====
(function () {
// Hero page: pictures over words. One random talent tree per hero (mc-talent.js), rooted in the hero's skill: only the
// layers the level has reached are drawn, the next one waits as a row of question marks; press and hold to learn.
const M = window.MC, G = M.Game.prototype, S = M.Sfx;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const SKILL_IC = { watchman: 't_eye', widow: 't_dice', nun: 't_chant', butcherlord: 't_rage', clockmaker: 't_rewind', cremator: 't_pyre' };
M.SKILL_IC = SKILL_IC;
const HOLD = 0.75; // seconds of charge to learn a talent
const W = 636, H = 500, ROOT = { x: 318, y: 440 };
const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 9973; return h; };
// node positions: the root at the bottom, one row per layer shown plus the waiting row; children spread around their
// parent, rows are pushed apart where they crowd and squeezed into the box; the fewer the rows, the bigger the nodes
const rowY = (L, dy) => ROOT.y - 46 - 8 - (L - 0.5) * dy;
function layout(h) {
  const shown = M.talShown(h), rows = Math.min(M.talHeight(h), shown + 1), dy = Math.min(96, (ROOT.y - 46 - 8 - 30) / Math.max(1, rows)), s = Math.round(Math.max(44, Math.min(72, dy * 0.75)));
  const pos = { root: ROOT }, hs = hash(h.id), byL = {};
  h.tree.forEach((n, i) => { if (n.L <= rows) (byL[n.L] = byL[n.L] || []).push(i); });
  for (let L = 1; L <= rows; L++) {
    const ids = byL[L] || [], y = rowY(L, dy), sp = Math.min(s + 40, (W - 40 - s) / Math.max(1, ids.length - 1));
    const want = ids.map(i => { const par = h.tree[i].p < 0 ? ROOT : pos[h.tree[i].p], sib = ids.filter(j => h.tree[j].p === h.tree[i].p); return par.x + (sib.indexOf(i) - (sib.length - 1) / 2) * sp; });
    const xs = want.slice(); for (let k = 1; k < xs.length; k++) xs[k] = Math.max(xs[k], xs[k - 1] + sp);
    const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); let sh = mean(want) - mean(xs); for (let k = 0; k < xs.length; k++) xs[k] += sh;
    const lo = 50 + s / 2, hi = W - 24 - s / 2;   // room on the left for the row labels (1 2 3 … / Lv11)
    if (xs.length) { if (xs[0] < lo) { sh = lo - xs[0]; xs.forEach((_, k) => { xs[k] += sh; }); } if (xs[xs.length - 1] > hi) { sh = hi - xs[xs.length - 1]; xs.forEach((_, k) => { xs[k] += sh; }); } if (xs[0] < lo) xs.forEach((_, k) => { xs[k] = xs.length > 1 ? lo + (hi - lo) * k / (xs.length - 1) : W / 2; }); }
    ids.forEach((i, k) => { pos[i] = { x: xs[k] + Math.sin(hs * 0.7 + i * 1.9) * 5, y: y + Math.cos(hs * 1.3 + i * 2.1) * 3 }; });
  }
  return { pos, s, rows, shown, dy };
}
const hexA = (c, a) => { const [r, g, b] = M.hexRgb(c); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
const link = (a, b, lit, c, pending, wait) => { const dx = b.x - a.x, dy = b.y - a.y, w = Math.hypot(dx, dy), th = lit ? 9 : wait ? 4 : 6; return { x: Math.round(a.x), y: Math.round(a.y - th / 2), w: Math.round(w), h: th, a: Math.atan2(dy, dx).toFixed(4), c: lit ? 'linear-gradient(90deg,' + c + ',' + M.shade(c, 0.25) + ')' : pending ? 'repeating-linear-gradient(90deg,#8d8496 0 10px,transparent 10px 18px)' : wait ? 'repeating-linear-gradient(90deg,#2b2461 0 6px,transparent 6px 12px)' : '#2a2230', glow: lit ? '0 0 12px ' + hexA(c, 0.8) : 'none' }; };

// ───────── view ─────────
const oldView = G.view;
G.view = function () {
  const v = oldView.call(this), p = this.panel, m = this.meta;
  if (!v.pn || !v.pn.isHero || !p) return v;
  const h = m.heroes.find(x => x.id === p.id); if (!h) return v;
  const Hc = M.HEROES[h.cls], R = M.RARITY[h.rarity], mx = M.heroMaxHp(h, m), pts = h.points, t = now() / 1000, ch = this.talCharge;
  const pn = v.pn, L = layout(h), IC = (k, s) => M.iconURL(k, s || 3);
  pn.title = Hc.n; pn.sub = ''; pn.img = M.spriteURL(Hc.sprite, 5);
  // one leader, no quality (2026-09-25): the level shows its cap
  pn.heads = [{ tip: 'hs-lv', ic: IC('t_orb', 2), t: 'Lv ' + h.lv + ' / ' + (M.LV_MAX || 10), c: '#9cff7a', bar: Math.min(100, h.exp / M.expNeed(h.lv) * 100) + '%', hasBar: true }, { tip: 'hs-pts', ic: IC('t_skill', 2), t: String(pts), c: pts ? '#ffe08a' : '#6b6570', hot: pts > 0 }].map(x => Object.assign({ hasBar: false, bar: '0%', anim: x.hot ? 'talPulse 1.1s ease-in-out infinite' : 'none' }, x));
  pn.hasHeads = true;
  pn.stats = [{ tip: 'hs-hp', ic: IC('t_heart', 2), v: Math.round(h.hp) + '/' + mx, c: h.hp / mx < 0.35 ? '#ff6a5a' : '#9cff7a' }, { tip: 'hs-atk', ic: IC('t_sword', 2), v: String(Math.round(M.heroAtk(h, m))), c: '#ff9a6a' }, { tip: 'hs-slot', ic: IC('t_chest', 2), v: String(M.relicSlots(h, m)), c: '#ffcc33' }, { tip: 'hs-runs', ic: IC('u_mask', 2), v: String(h.runs), c: '#cfc6b8' }];
  pn.rGlow = hexA(R.c, 0.35);
  // tree
  const nodes = [], links = [], caps = [], Lo = layout(h), P = Lo.pos, NS = Lo.s, NI = Math.round(NS * 0.64);
  const rootIc = SKILL_IC[h.cls] || 't_skill', rp = 0.5 + 0.5 * Math.sin(t * 2.2);
  nodes.push({ id: 'root', tip: 'tal-root', fx: 'tal-root', x: ROOT.x - 46, y: ROOT.y - 46, s: 92, is: 60, ic: IC(rootIc, 3), border: '#ffe08a', bg: 'radial-gradient(circle at 50% 40%,#6a4a1a,#1a1008)', glow: '0 0 ' + Math.round(24 + rp * 16) + 'px rgba(255,210,110,0.85),inset 0 0 18px rgba(255,220,140,0.6)', filter: 'none', sx: 0, sy: 0, sc: 1, cursor: 'help', anim: 'none', charging: false, qm: false, qs: 0, big: false, deg: 0, ringC: '#fff', hint: false, hintT: '' });
  // a layer the last level-up revealed pops in the first time the page is seen after the ceremony
  const nw = this.talNew && this.talNew[h.id]; if (nw && !this.lvFx && !nw.at) nw.at = now(); if (nw && nw.at && now() - nw.at > 2200) delete this.talNew[h.id];
  const fresh = (L, k) => (nw && nw.at && L > nw.from ? 'talNew .6s cubic-bezier(.3,1.6,.5,1) ' + (0.15 + k * 0.09).toFixed(2) + 's both' : null);
  h.tree.forEach((T, i) => {
    const q = P[i]; if (!q) return; const par = T.p < 0 ? ROOT : P[T.p], k = Object.keys(P).indexOf(String(i));
    if (T.L > Lo.shown) {   // the waiting row: only its shape
      links.push(link(par, q, false, '#3d3a8c', false, true));
      nodes.push({ id: 'q-' + i, tip: 'talq-' + T.L, fx: 'talq-' + i, x: Math.round(q.x - NS / 2), y: Math.round(q.y - NS / 2), s: NS, is: NI, ic: '', qm: true, qs: Math.round(NS * 0.5), border: '#2b2461', bg: '#0d0b1e', glow: 'none', filter: 'none', sx: 0, sy: 0, sc: 1, cursor: 'help', anim: fresh(T.L, k) || 'none', charging: false, deg: 0, ringC: '#2b2461', big: false, hint: false, hintT: '' });
      return;
    }
    const Sc = M.talScope(T), c = Sc.c, isTaken = M.talTaken(h, i), open = M.talOpen(h, i), avail = open && pts > 0;
    links.push(link(par, q, isTaken, c, avail));
    const chg = ch && ch.i === i ? cl((t - ch.t0) / HOLD, 0, 1) : 0, sh = chg ? chg * 4 : 0;
    nodes.push({ id: 'n-' + i, tip: 'tal-' + i, fx: 'tal-' + i, x: Math.round(q.x - NS / 2), y: Math.round(q.y - NS / 2), s: NS, is: NI, ic: IC(M.talIcon(T), 3), qm: false, qs: 0,
      border: isTaken ? c : avail ? '#fff3c4' : open ? hexA(c, 0.7) : '#3a3040', bg: isTaken ? 'radial-gradient(circle at 50% 40%,' + hexA(c, 0.55) + ',#140e18)' : avail ? 'radial-gradient(circle at 50% 40%,#3a2e20,#140e18)' : '#120e16',
      glow: isTaken ? '0 0 16px ' + hexA(c, 0.7) + ',inset 0 0 12px ' + hexA(c, 0.5) : 'none', filter: isTaken || avail ? 'none' : open ? 'brightness(0.85)' : 'grayscale(0.7) brightness(0.7)',
      sx: sh ? Math.round((Math.random() - 0.5) * sh * 2) : 0, sy: sh ? Math.round((Math.random() - 0.5) * sh * 2) : 0, sc: (1 + chg * 0.14).toFixed(3),
      cursor: avail ? 'pointer' : 'default', anim: fresh(T.L, k) || (avail && !chg ? 'talPulse 1.1s ease-in-out infinite, talBob 1.1s ease-in-out infinite' : 'none'), charging: chg > 0, deg: Math.round(chg * 360), ringC: chg >= 1 ? '#ffffff' : c, big: false,
      hint: avail && (NS >= 60 || chg > 0), hintT: chg > 0 ? '蓄力中…' : '按住' });
  });
  // layer numbers down the left edge, the level that opens the waiting row, and what the colours mean
  for (let L = 1; L <= Lo.rows; L++) { const y = rowY(L, Lo.dy); caps.push({ x: -22, y: Math.round(y - 12), t: L > Lo.shown ? 'Lv' + (M.talLvFor ? M.talLvFor(L) : L + 1) : String(L), c: L > Lo.shown ? '#ffcf4a' : '#6a6394' }); }
  Object.keys(M.TAL_SC).forEach((k, j) => caps.push({ x: -16 + j * 56, y: 468, t: M.TAL_SC[k].n, c: M.TAL_SC[k].c }));
  pn.nodes = nodes; pn.links = links; pn.caps = caps; pn.noPts = pts <= 0; pn.hasPts = pts > 0;
  pn.holdHint = pts > 0 && NS < 60 && nodes.some(n => n.cursor === 'pointer');
  const nag = this.talNag && now() - this.talNag.at < 1600 ? this.talNag : null; pn.nagOn = !!nag; pn.nagX = nag ? nag.x : 0; pn.nagY = nag ? nag.y : 0;
  return v;
};

// ───────── tips for every picture on the page ─────────
const oldTipFor = G.tipFor;
G.tipFor = function (key) {
  const p = this.panel, m = this.meta, h = p && p.kind === 'hero' && m.heroes.find(x => x.id === p.id);
  if (h && /^(tal|talq|hs)-/.test(key || '')) {
    const Hc = M.HEROES[h.cls], R = M.RARITY[h.rarity], mx = M.heroMaxHp(h, m);
    if (key === 'tal-root') return { title: '「' + Hc.skill.n + '」', c: '#ffe08a', kind: '主动技能 · 已点亮', d: M.skillDesc(h), icon: SKILL_IC[h.cls] || 't_skill', lines: [{ t: '冷却 ' + M.skillNodeCd(h, m) + ' 个节点 · 每场战斗最多 1 次', c: '#a89ca8' }, { t: '效果随等级提升。天赋从这里长出来。', c: '#a89ca8' }] };
    let mm = /^tal-(\d+)$/.exec(key);
    if (mm) { const i = +mm[1], T = h.tree[i]; if (!T) return null; const Sc = M.talScope(T), taken = M.talTaken(h, i), open = M.talOpen(h, i);
      const st = taken ? '已学会' : open && h.points > 0 ? '按住学习' : open ? '升级获得天赋点' : '先学会下面连着的天赋';
      return { title: M.talName(T), c: Sc.c, kind: '第 ' + T.L + ' 层 · ' + Sc.n, d: M.talDesc(T), icon: M.talIcon(T), lines: [{ t: st, c: taken ? Sc.c : '#a89ca8' }] }; }
    mm = /^talq-(\d+)$/.exec(key);
    if (mm) return { title: '第 ' + mm[1] + ' 层', c: '#ffcf4a', d: '升到 Lv ' + (M.talLvFor ? M.talLvFor(+mm[1]) : +mm[1] + 1) + ' 展开。', icon: 't_orb' };
    if (key === 'hs-rar') return { title: R.n + '领袖', c: R.c, d: '属性 ×' + R.stat + '，天赋树 ' + M.talHeight(h) + ' 层。' };
    if (key === 'hs-lv') return { title: '等级 ' + h.lv + ' / ' + (M.LV_MAX || 10), c: '#9cff7a', d: h.lv >= (M.LV_MAX || 10) ? '已经满级。' : '经验 ' + h.exp + ' / ' + M.expNeed(h.lv) + '。', icon: 't_orb' };
    if (key === 'hs-pts') return { title: '天赋点 ' + h.points, c: '#ffe08a', d: h.points ? '按住发光的天赋学习。' : '升级获得。', icon: 't_skill' };
    if (key === 'hs-hp') return { title: '生命 ' + Math.round(h.hp) + ' / ' + mx, c: '#9cff7a', d: '不会自动恢复，医疗建筑每天治疗。', icon: 't_heart' };
    if (key === 'hs-atk') return { title: '攻击 ' + Math.round(M.heroAtk(h, m)), c: '#ff9a6a', d: '亲自上场时的攻击力。', icon: 't_sword' };
    if (key === 'hs-slot') return { title: '宝物格 ' + M.relicSlots(h, m), c: '#ffcc33', d: '出征能带的宝物数。', icon: 't_chest' };
    if (key === 'hs-runs') return { title: '出征 ' + h.runs + ' 次', c: '#cfc6b8', icon: 'u_mask' };
  }
  return oldTipFor.call(this, key);
};

// ───────── press & hold to learn ─────────
function talState(g, id) {
  const p = g.panel, h = p && p.kind === 'hero' && g.meta.heroes.find(x => x.id === p.id); if (!h) return null;
  if (id === 'root') return { h, root: 1 };
  const [k, i] = id.split('-'); if (k !== 'n') return { h, wait: 1 }; return { h, i: +i, avail: M.talCan(h, +i), taken: M.talTaken(h, +i) };
}
G.talDown = function (el, src) {
  const id = el.getAttribute('data-tal'), s = talState(this, id); if (!s) return false;
  if (s.avail) { this.talCharge = { i: s.i, t0: now() / 1000, src, el, last: 0 }; M.Sfx.whoosh(0.2); return true; }
  // anything else only bounces
  this.jiggle(el, [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1.08,0.94)', offset: 0.3 }, { transform: 'translateY(0) scale(0.94,1.06)', offset: 0.6 }, { transform: 'translateY(-4px) scale(1)', offset: 0.8 }, { transform: 'translateY(0) scale(1)' }], 420);
  S.boing(); return true;
};
G.talUp = function () {
  const c = this.talCharge; if (!c) return; this.talCharge = null;
  if (now() / 1000 - c.t0 < HOLD) { M.Sfx.tone(180, 0.08, 'sine', 0.06, -60); const q = layout(this.meta.heroes.find(x => x.id === this.panel.id)).pos[c.i] || ROOT; this.talNag = { at: now(), x: cl(Math.round(q.x - 110), 4, W - 228), y: cl(Math.round(q.y - 92), 4, H - 44) }; this.bump(); }
};
G.talTick = function () {
  const c = this.talCharge; if (!c) return;
  if (!this.panel || this.panel.kind !== 'hero') { this.talCharge = null; return; }
  if (c.src === 'pad' && !padHeld()) return this.talUp();
  const p = (now() / 1000 - c.t0) / HOLD, step = Math.floor(p * 8);
  if (step > c.last && p < 1) { c.last = step; S.charge(p); }
  if (p >= 1) { this.talCharge = null; const h = this.meta.heroes.find(x => x.id === this.panel.id), T = h.tree[c.i]; this.takeTalent(h.id, c.i);
    const pos = this.fxPos('tal-' + c.i); if (pos && T) { const col = M.talScope(T).c; this.fx.explode(pos.x, pos.y, col, 1.2); this.fx.rays(pos.x, pos.y, col, 0.9, { r: 220 }); this.fx.pop(pos.x, pos.y - 60, M.talName(T), col, 40); this.fx.kick(8); }
    M.Sfx.mult(); this.punchSel('tal-' + c.i, 1.4); setTimeout(() => this.punchSel('hero-' + h.id, 0.8), 140); }   // 节点炸开 → 领袖卡跟着鼓一下
  this.bump();
};
const padHeld = () => { try { const P = M.settings.pad, gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean); return !!(gp && P && gp.buttons[P.confirm] && gp.buttons[P.confirm].pressed); } catch (e) { return false; } };
// the gamepad's A starts a charge on a talent instead of clicking it
const oldCC = G.cursorClick;
G.cursorClick = function () {
  const p = this.stageToClient && this.cur ? this.stageToClient(this.cur.x, this.cur.y) : null, el = p && document.elementFromPoint(p.x, p.y), tl = el && el.closest && el.closest('[data-tal]');
  if (tl && this.talDown(tl, 'pad')) return;
  return oldCC.call(this);
};
const oldTick = G.tick;
G.tick = function (dt) {
  if (!this._talInit) { this._talInit = 1;
    window.addEventListener('pointerdown', (e) => { if (e.pointerId === 77) return; const tl = e.target && e.target.closest && e.target.closest('[data-tal]'); if (tl && this.talDown(tl, 'ptr')) { e.preventDefault(); } }, true);
    ['pointerup', 'pointercancel'].forEach(n => window.addEventListener(n, (e) => { if (e.pointerId === 77) return; if (this.talCharge && this.talCharge.src === 'ptr') this.talUp(); }, true));
    window.addEventListener('pointermove', (e) => { const c = this.talCharge; if (!c || c.src !== 'ptr' || !c.el || !c.el.isConnected) return; const r = c.el.getBoundingClientRect(), pad = 30; if (e.clientX < r.left - pad || e.clientX > r.right + pad || e.clientY < r.top - pad || e.clientY > r.bottom + pad) this.talUp(); }, true);
  }
  oldTick.call(this, dt);
  this.talTick();
};
const oldClose = G.closePanel; G.closePanel = function () { this.talCharge = null; return oldClose.apply(this, arguments); };
})();

;
