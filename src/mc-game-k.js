// ==== mc-game-k.js ====
(function () {
// Hero page: pictures over words. One talent tree per hero, rooted in the hero's active skill; press and hold to learn.
const M = window.MC, G = M.Game.prototype, S = M.Sfx;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const TAL_IC = { heroAtk: 't_sword', unitAtk: 't_command', crit: 't_crit', skillCd: 't_hourglass', rage: 't_rage', fire: 't_flame', beastAs: 't_claw', eliteHeal: 't_heal',
  heroHp: 't_heart', unitHp: 't_shieldHeart', postHeal: 't_plus', shortRed: 't_coinShield', bank: 't_chest', hospital: 't_cross', shield: 't_shield', hold: 't_hourglass',
  startMult: 't_mult', shop: 't_coin', tier: 't_dice', deathShards: 't_shard', deathOrbs: 't_orb', chest: 't_chest', eventLuck: 't_clover', supplies: 't_sack',
  baseScore: 't_coin', killHeal: 't_heal', campHalf: 't_flame', exp: 't_orb' };
M.TAL_IC = TAL_IC;
const SKILL_IC = { watchman: 't_eye', widow: 't_dice', nun: 't_chant', butcherlord: 't_rage', clockmaker: 't_rewind', cremator: 't_pyre' };
M.SKILL_IC = SKILL_IC;
const icOf = (m) => TAL_IC[Object.keys(m || {})[0]] || 't_skill';
const HOLD = 0.75; // seconds of charge to learn a talent
const W = 636, H = 500, ROOT = { x: 318, y: 440 };
const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) % 9973; return h; };
// node positions: three branches fan up out of the root, each hero's tree bends its own way
function layout(h) {
  const hs = hash(h.id), out = {};
  ['atk', 'def', 'luck'].forEach((b, k) => {
    // side branches fan out 150px+ from the trunk so no two nodes (72px) can touch; each hero bends a little differently
    const d = k - 1, n = h.tree[b].length, step = Math.min(86, 280 / Math.max(1, n - 1));
    out[b] = h.tree[b].map((_, i) => ({ x: ROOT.x + d * (150 + i * 28) + Math.sin(hs * 0.7 + i * 1.9 + k * 2.3) * (d ? 10 : 6), y: ROOT.y - 100 - i * step }));
  });
  return out;
}
const hexA = (c, a) => { const [r, g, b] = M.hexRgb(c); return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')'; };
const link = (a, b, lit, c, pending) => { const dx = b.x - a.x, dy = b.y - a.y, w = Math.hypot(dx, dy), th = lit ? 9 : 6; return { x: Math.round(a.x), y: Math.round(a.y - th / 2), w: Math.round(w), h: th, a: Math.atan2(dy, dx).toFixed(4), c: lit ? 'linear-gradient(90deg,' + c + ',' + M.shade(c, 0.25) + ')' : pending ? 'repeating-linear-gradient(90deg,#8d8496 0 10px,transparent 10px 18px)' : '#2a2230', glow: lit ? '0 0 12px ' + hexA(c, 0.8) : 'none' }; };

// ───────── view ─────────
const oldView = G.view;
G.view = function () {
  const v = oldView.call(this), p = this.panel, m = this.meta;
  if (!v.pn || !v.pn.isHero || !p) return v;
  const h = m.heroes.find(x => x.id === p.id); if (!h) return v;
  const Hc = M.HEROES[h.cls], R = M.RARITY[h.rarity], mx = M.heroMaxHp(h, m), pts = h.points, t = now() / 1000, ch = this.talCharge;
  const pn = v.pn, L = layout(h), IC = (k, s) => M.iconURL(k, s || 3);
  pn.title = Hc.n; pn.sub = ''; pn.img = M.spriteURL(Hc.sprite, 5);
  pn.heads = [{ tip: 'hs-rar', ic: IC('u_star', 2), t: R.n, c: R.c }, { tip: 'hs-lv', ic: IC('t_orb', 2), t: 'Lv ' + h.lv, c: '#9cff7a', bar: Math.min(100, h.exp / M.expNeed(h.lv) * 100) + '%', hasBar: true }, { tip: 'hs-pts', ic: IC('t_skill', 2), t: String(pts), c: pts ? '#ffe08a' : '#6b6570', hot: pts > 0 }].map(x => Object.assign({ hasBar: false, bar: '0%', anim: x.hot ? 'talPulse 1.1s ease-in-out infinite' : 'none' }, x));
  pn.hasHeads = true;
  pn.stats = [{ tip: 'hs-hp', ic: IC('t_heart', 2), v: Math.round(h.hp) + '/' + mx, c: h.hp / mx < 0.35 ? '#ff6a5a' : '#9cff7a' }, { tip: 'hs-atk', ic: IC('t_sword', 2), v: String(Math.round(M.heroAtk(h, m))), c: '#ff9a6a' }, { tip: 'hs-slot', ic: IC('t_chest', 2), v: String(M.relicSlots(h, m)), c: '#ffcc33' }, { tip: 'hs-runs', ic: IC('u_mask', 2), v: String(h.runs), c: '#cfc6b8' }];
  pn.rGlow = hexA(R.c, 0.35);
  // tree
  const nodes = [], links = [], caps = [];
  const rootIc = SKILL_IC[h.cls] || 't_skill', rp = 0.5 + 0.5 * Math.sin(t * 2.2);
  nodes.push({ id: 'root', tip: 'tal-root', fx: 'tal-root', x: ROOT.x - 46, y: ROOT.y - 46, s: 92, is: 60, ic: IC(rootIc, 3), border: '#ffe08a', bg: 'radial-gradient(circle at 50% 40%,#6a4a1a,#1a1008)', glow: '0 0 ' + Math.round(24 + rp * 16) + 'px rgba(255,210,110,0.85),inset 0 0 18px rgba(255,220,140,0.6)', filter: 'none', sx: 0, sy: 0, sc: 1, cursor: 'help', anim: 'none', charging: false, big: false, deg: 0, ringC: '#fff', hint: false, hintT: '' });
  ['atk', 'def', 'luck'].forEach(b => {
    const Bc = M.BRANCH[b].c, taken = h.taken[b];
    h.tree[b].forEach((T, i) => {
      const q = L[b][i], prev = i ? L[b][i - 1] : ROOT, isTaken = i < taken, avail = i === taken && pts > 0;
      links.push(link(prev, q, isTaken, Bc, avail));
      const chg = ch && ch.b === b && ch.i === i ? cl((t - ch.t0) / HOLD, 0, 1) : 0, sh = chg ? chg * 4 : 0;
      nodes.push({ id: b + '-' + i, tip: 'tal-' + b + '-' + i, fx: 'tal-' + b + '-' + i, x: Math.round(q.x - 36), y: Math.round(q.y - 36), s: 72, is: 46, ic: IC(icOf(T.m), 3),
        border: isTaken ? Bc : avail ? '#fff3c4' : '#3a3040', bg: isTaken ? 'radial-gradient(circle at 50% 40%,' + hexA(Bc, 0.55) + ',#140e18)' : avail ? 'radial-gradient(circle at 50% 40%,#3a2e20,#140e18)' : '#120e16',
        glow: isTaken ? '0 0 16px ' + hexA(Bc, 0.7) + ',inset 0 0 12px ' + hexA(Bc, 0.5) : 'none', filter: isTaken || avail ? 'none' : 'grayscale(1) brightness(0.55)',
        sx: sh ? Math.round((Math.random() - 0.5) * sh * 2) : 0, sy: sh ? Math.round((Math.random() - 0.5) * sh * 2) : 0, sc: (1 + chg * 0.14).toFixed(3),
        cursor: avail ? 'pointer' : 'default', anim: avail && !chg ? 'talPulse 1.1s ease-in-out infinite, talBob 1.1s ease-in-out infinite' : 'none', charging: chg > 0, deg: Math.round(chg * 360), ringC: chg >= 1 ? '#ffffff' : Bc, big: !!T.big,
        hint: avail, hintT: chg > 0 ? '蓄力中…' : '按住' });
    });
    const top = L[b][h.tree[b].length - 1];
    caps.push({ x: Math.round(top.x - 40), y: Math.max(4, Math.round(top.y - 66)), t: M.BRANCH[b].n + ' ' + taken + '/' + h.tree[b].length, c: Bc });
  });
  pn.nodes = nodes; pn.links = links; pn.caps = caps; pn.noPts = pts <= 0; pn.hasPts = pts > 0;
  pn.holdTip = '按住发光的天赋，圆环蓄满就学会'; const nag = this.talNag && now() - this.talNag.at < 1600 ? this.talNag : null; pn.nagOn = !!nag; pn.nagX = nag ? nag.x : 0; pn.nagY = nag ? nag.y : 0;
  return v;
};

// ───────── tips for every picture on the page ─────────
const oldTipFor = G.tipFor;
G.tipFor = function (key) {
  const p = this.panel, m = this.meta, h = p && p.kind === 'hero' && m.heroes.find(x => x.id === p.id);
  if (h && /^(tal|hs)-/.test(key || '')) {
    const Hc = M.HEROES[h.cls], R = M.RARITY[h.rarity], mx = M.heroMaxHp(h, m);
    if (key === 'tal-root') return { title: '「' + Hc.skill.n + '」', c: '#ffe08a', kind: '主动技能 · 已点亮', d: M.skillDesc(h), icon: SKILL_IC[h.cls] || 't_skill', lines: [{ t: '冷却 ' + M.skillNodeCd(h, m) + ' 个节点 · 每场战斗最多 1 次', c: '#a89ca8' }, { t: '效果随等级提升。天赋从这里长出来。', c: '#a89ca8' }] };
    let mm = /^tal-(atk|def|luck)-(\d+)$/.exec(key);
    if (mm) { const b = mm[1], i = +mm[2], T = h.tree[b][i], taken = i < h.taken[b], avail = i === h.taken[b] && h.points > 0;
      const st = taken ? '已学会' : avail ? '按住学习' : i > h.taken[b] ? '先学会下面的天赋' : '没有天赋点';
      return { title: T.n + (T.big ? ' ×2' : ''), c: M.BRANCH[b].c, kind: M.BRANCH[b].n + ' · 第 ' + (i + 1) + ' 层 · ' + st, d: T.d + (T.big ? '（传说领袖：效果翻倍）' : ''), icon: icOf(T.m) }; }
    if (key === 'hs-rar') return { title: R.n + '领袖', c: R.c, d: '品质决定基础属性和天赋树的层数。', lines: [{ t: '每条分支 ' + h.tree.atk.length + ' 层 · 属性 ×' + R.stat, c: '#a89ca8' }] };
    if (key === 'hs-lv') return { title: '等级 ' + h.lv, c: '#9cff7a', d: '经验 ' + h.exp + ' / ' + M.expNeed(h.lv) + '。每升 1 级获得 1 个天赋点，最高 10 级。', icon: 't_orb' };
    if (key === 'hs-pts') return { title: '天赋点 ' + h.points, c: '#ffe08a', d: h.points ? '发光跳动的天赋可以学。按住它，蓄满就学会了。' : '升级获得天赋点。去出征，或者在训练建筑里灌经验球。', icon: 't_skill' };
    if (key === 'hs-hp') return { title: '生命 ' + Math.round(h.hp) + ' / ' + mx, c: '#9cff7a', d: '不会自动恢复。医疗建筑每天治疗，也可以急救。降到 0 就永久死亡。', icon: 't_heart' };
    if (key === 'hs-atk') return { title: '攻击 ' + Math.round(M.heroAtk(h, m)), c: '#ff9a6a', d: '部队全灭后领袖亲自上场时的攻击力。', icon: 't_sword' };
    if (key === 'hs-slot') return { title: '宝物格 ' + M.relicSlots(h, m), c: '#ffcc33', d: '出征时能带的宝物数量。领袖死亡时带着的宝物会丢失。', icon: 't_chest' };
    if (key === 'hs-runs') return { title: '出征 ' + h.runs + ' 次', c: '#cfc6b8', d: '这名领袖出征过的次数。', icon: 'u_mask' };
  }
  return oldTipFor.call(this, key);
};

// ───────── press & hold to learn ─────────
S.charge = function (p) { if (S.lim && !S.lim('charge', 60)) return; S.tone(300 + p * 900, 0.06, 'triangle', 0.05 + p * 0.05); };
S.boing = function () { S.tone(220, 0.12, 'sine', 0.12, 160); S.tone(330, 0.1, 'triangle', 0.05, -120, 0.05); };
function talState(g, id) {
  const p = g.panel, h = p && p.kind === 'hero' && g.meta.heroes.find(x => x.id === p.id); if (!h) return null;
  if (id === 'root') return { h, root: 1 };
  const [b, i] = id.split('-'); return { h, b, i: +i, avail: +i === h.taken[b] && h.points > 0, taken: +i < h.taken[b] };
}
G.talDown = function (el, src) {
  const id = el.getAttribute('data-tal'), s = talState(this, id); if (!s) return false;
  if (s.avail) { this.talCharge = { b: s.b, i: s.i, t0: now() / 1000, src, el, last: 0 }; M.Sfx.whoosh(0.2); return true; }
  // anything else only bounces
  this.jiggle(el, [{ transform: 'translateY(0) scale(1)' }, { transform: 'translateY(-14px) scale(1.08,0.94)', offset: 0.3 }, { transform: 'translateY(0) scale(0.94,1.06)', offset: 0.6 }, { transform: 'translateY(-4px) scale(1)', offset: 0.8 }, { transform: 'translateY(0) scale(1)' }], 420);
  S.boing(); return true;
};
G.talUp = function () {
  const c = this.talCharge; if (!c) return; this.talCharge = null;
  if (now() / 1000 - c.t0 < HOLD) { M.Sfx.tone(180, 0.08, 'sine', 0.06, -60); const L = layout(this.meta.heroes.find(x => x.id === this.panel.id)), q = L[c.b][c.i]; this.talNag = { at: now(), x: cl(Math.round(q.x - 110), 4, W - 228), y: cl(Math.round(q.y - 92), 4, H - 44) }; this.bump(); }
};
G.talTick = function () {
  const c = this.talCharge; if (!c) return;
  if (!this.panel || this.panel.kind !== 'hero') { this.talCharge = null; return; }
  if (c.src === 'pad' && !padHeld()) return this.talUp();
  const p = (now() / 1000 - c.t0) / HOLD, step = Math.floor(p * 8);
  if (step > c.last && p < 1) { c.last = step; S.charge(p); }
  if (p >= 1) { this.talCharge = null; const h = this.meta.heroes.find(x => x.id === this.panel.id); this.takeTalent(h.id, c.b);
    const pos = this.fxPos('tal-' + c.b + '-' + c.i); if (pos) { const col = M.BRANCH[c.b].c; this.fx.explode(pos.x, pos.y, col, 1.2); this.fx.rays(pos.x, pos.y, col, 0.9, { r: 220 }); this.fx.pop(pos.x, pos.y - 60, h.tree[c.b][c.i].n, col, 40); this.fx.kick(8); }
    M.Sfx.mult(); this.punchSel('tal-' + c.b + '-' + c.i, 1.4); }
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
