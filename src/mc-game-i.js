// ==== mc-game-i.js ====
(function () {
// Input for every platform: keyboard+mouse, gamepad (virtual cursor + direct actions, Steam Deck), touch (phones).
const M = window.MC, G = M.Game.prototype;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const PAD_N = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'View', 'Menu', 'LS', 'RS', '↑', '↓', '←', '→', 'Home'];
M.padName = (i) => (i == null ? '—' : PAD_N[i] || ('键' + i));
const ua = navigator.userAgent || '';
M.platform = (window.Capacitor || /Android|iPhone|iPad|Mobile/i.test(ua) || (navigator.maxTouchPoints > 1 && window.matchMedia && matchMedia('(pointer: coarse)').matches)) ? 'mobile'
  : /Steam ?Deck/i.test(ua) || (/Linux/.test(ua) && screen.width === 1280 && screen.height === 800) ? 'deck' : 'pc';
// the mode that drives prompts and controls
M.inputMode = function (g) {
  const s = M.settings.input;
  if (M.platform === 'mobile') return s === 'pad' ? 'pad' : 'touch';
  if (s === 'kbm' || s === 'pad') return s;
  if (M.platform === 'deck') return g && g.lastInput === 'kbm' ? 'kbm' : 'pad';
  return g && g.lastInput === 'pad' ? 'pad' : 'kbm';
};
const oldKeyOf = M.keyOf;
M.keyOf = (act) => { const md = M.inputMode(M._g); if (md === 'touch') return ''; if (md === 'pad') { const b = M.settings.pad[act]; return b == null ? '' : M.padName(b); } return oldKeyOf(act); };

// ───────── gamepad ─────────
const DEAD = 0.28;
G.padPoll = function (dt) {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : []; if (!pads.length) { this.padPrev = null; return; }
  const p = pads[0], prev = this.padPrev || [], cur = p.buttons.map(b => b.pressed || b.value > 0.5), ax = p.axes;
  this.padPrev = cur;
  const pressed = (i) => cur[i] && !prev[i], lx = Math.abs(ax[0]) > DEAD ? ax[0] : 0, ly = Math.abs(ax[1]) > DEAD ? ax[1] : 0, rx = Math.abs(ax[2]) > DEAD ? ax[2] : 0, ry = Math.abs(ax[3]) > DEAD ? ax[3] : 0;
  const any = cur.some(Boolean) || lx || ly || rx || ry; if (any) { this.mAnchor = null; if (this.lastInput !== 'pad') { this.lastInput = 'pad'; this.bump(); } }
  if (this.rebindPad) { const i = cur.findIndex((v, k) => v && !prev[k]); if (i >= 0) this.finishRebind(i, true); return; }
  if (M.inputMode(this) !== 'pad') return;
  const P = M.settings.pad, hit = (act) => P[act] != null && pressed(P[act]), s = this.screen;
  const c = this.cur || (this.cur = { x: 960, y: 540, shown: 0 });
  const uiOpen = !!(this.modal || this.panel || this.settingsOpen || this.settle || this.chest || this.reel || s === 'shop' || s === 'end' || s === 'menu' || s === 'over');
  // world walking: stick / d-pad drive the explorer when no window is open
  if (s === 'world' && !uiOpen) {
    this.keys.up = ly < -0.5 || cur[12]; this.keys.down = ly > 0.5 || cur[13]; this.keys.right = lx > 0.5 || cur[15];
    c.shown = 0;
  } else {
    // virtual cursor with gentle magnetism to the nearest clickable thing
    const sp = 1500 * dt, mag = Math.hypot(lx, ly);
    if (mag) { c.x = cl(c.x + lx * Math.pow(mag, 0.6) * sp, 0, 1920); c.y = cl(c.y + ly * Math.pow(mag, 0.6) * sp, 0, 1080); c.shown = now(); this.cursorHover(); }
    else if (c.shown && now() - c.shown < 60) this.cursorSnap();
    const dir = pressed(12) ? 'up' : pressed(13) ? 'down' : pressed(14) ? 'left' : pressed(15) ? 'right' : null;
    if (dir) { this.cursorJump(dir); c.shown = now(); }
    if (hit('confirm')) { c.shown = now(); if (this.settle) this.settleNext(); else this.cursorClick(); }
  }
  if (hit('back')) { if (this.settingsOpen) this.closeSettings(); else if (this.modal && this.modal.back) { this.modal.back(); this.bump(); } else if (this.settle) this.settleNext(); else this.closePanel(); }
  if (s === 'battle' && this.battle) {
    ['item1', 'item2', 'item3'].forEach((a, i) => { if (hit(a)) { this.useSlot(i); this.pulse['bslot' + i] = now(); } });
    if (hit('skill')) this.castSkill(); if (hit('pause')) this.togglePause(); if (hit('speed')) { this.speed = this.speed % 3 + 1; M.Sfx.click(); this.bump(); }
  }
  if (s === 'intro' && hit('confirm')) this.introClick();
  if (ry && (this.panel || this.settingsOpen)) this.scrollUnderCursor(ry * 900 * dt);
};
// stage <-> client coordinates
G.stageToClient = function (x, y) { const st = this.ui.stage(); if (!st) return null; const r = st.getBoundingClientRect(), s = this.ui.scale(); return { x: r.left + x * s, y: r.top + y * s }; };
G.clickables = function () {
  const st = this.ui.stage(); if (!st) return [];
  const r0 = st.getBoundingClientRect(), s = this.ui.scale(), out = [];
  const modal = st.querySelector('[style*="z-index:800"],[style*="z-index: 800"]');
  (modal || st).querySelectorAll('[style*="cursor: pointer"],[style*="cursor:pointer"],[data-tip]').forEach(el => { const b = el.getBoundingClientRect(); if (!b.width || !b.height || b.width > 1500 * s) return; if (el.tagName === 'CANVAS') return; const cs = getComputedStyle(el); if (cs.visibility === 'hidden' || cs.pointerEvents === 'none') return; out.push({ el, x: (b.left + b.width / 2 - r0.left) / s, y: (b.top + b.height / 2 - r0.top) / s, w: b.width / s, h: b.height / s }); });
  // base rooms and the portal live on the canvas: expose them as targets too
  if ((this.screen === 'base') && !this.settingsOpen && !this.modal) {
    const G2 = M.BASE_GEO, bv = this.bv, z = bv.z;
    for (let r = 0; r < M.BROWS; r++) for (let c = 0; c < M.BCOLS; c++) { const p = bv.toScreen(c * G2.CW + G2.CW / 2, G2.TOP + r * G2.CH + G2.CH / 2); if (p.x < 0 || p.x > (this.panel ? 1180 : 1920) || p.y < 92 || p.y > 1080) continue; out.push({ x: p.x, y: p.y, w: G2.CW * z * 0.8, h: G2.CH * z * 0.8, cell: 1 }); }
    const d = bv.toScreen(G2.DOOR_X, -130); if (d.y > 92 && d.y < 1080) out.push({ x: d.x, y: d.y, w: 200 * z, h: 240 * z, cell: 1 });
  }
  return out;
};
G.cursorSnap = function () { const c = this.cur, L = this.clickables(); let best = null, bd = 90; L.forEach(o => { const dx = Math.max(0, Math.abs(c.x - o.x) - o.w / 2), dy = Math.max(0, Math.abs(c.y - o.y) - o.h / 2), d = Math.hypot(dx, dy); if (d < bd) { bd = d; best = o; } }); if (best && bd > 0) { c.x += (best.x - c.x) * 0.5; c.y += (best.y - c.y) * 0.5; this.cursorHover(); } };
G.cursorJump = function (dir) {
  const c = this.cur, v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
  const L = this.clickables().filter(o => { const dx = o.x - c.x, dy = o.y - c.y; return dx * v[0] + dy * v[1] > 12; });
  let best = null, bs = 1e9; L.forEach(o => { const dx = o.x - c.x, dy = o.y - c.y, along = dx * v[0] + dy * v[1], side = Math.abs(dx * v[1] - dy * v[0]); const sc = along + side * 2.2; if (sc < bs) { bs = sc; best = o; } });
  if (best) { c.x = best.x; c.y = best.y; }
  else if (this.screen === 'base') { c.x = cl(c.x + v[0] * 300 * this.bv.z, 0, 1920); c.y = cl(c.y + v[1] * 210 * this.bv.z, 0, 1080); }
  M.Sfx.hover(); this.cursorHover();
};
const fire = (el, type, p, rel) => { if (!el) return; const Ctor = /^pointer/.test(type) && window.PointerEvent ? PointerEvent : MouseEvent; el.dispatchEvent(new Ctor(type, { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, relatedTarget: rel || null, pointerId: 77, pointerType: 'mouse', button: 0, buttons: /down/.test(type) ? 1 : 0 })); };
G.cursorHover = function () {
  const p = this.stageToClient(this.cur.x, this.cur.y); if (!p) return; const el = document.elementFromPoint(p.x, p.y);
  if (el !== this.curEl) { fire(this.curEl, 'mouseout', p, el); fire(el, 'mouseover', p, this.curEl); this.curEl = el; }
  fire(el, 'mousemove', p);
};
G.cursorClick = function () {
  const p = this.stageToClient(this.cur.x, this.cur.y); if (!p) return; const el = document.elementFromPoint(p.x, p.y); if (!el) return;
  fire(el, 'pointerdown', p); fire(el, 'mousedown', p); fire(el, 'pointerup', p); fire(el, 'mouseup', p); fire(el, 'click', p);
  this.fx.clickBurst(this.cur.x, this.cur.y, '#ffe08a');
};
G.scrollUnderCursor = function (dy) { const p = this.stageToClient(this.cur.x, this.cur.y); if (!p) return; let el = document.elementFromPoint(p.x, p.y); while (el && el !== document.body) { const cs = getComputedStyle(el); if (/auto|scroll/.test(cs.overflowY) && el.scrollHeight > el.clientHeight) { el.scrollTop += dy; return; } el = el.parentElement; } };
// pixel pointer on the fx layer
M.drawPadCursor = function (ctx, g) {
  const c = g.cur; if (!c || !c.shown || M.inputMode(g) !== 'pad' || now() - c.shown > 6000) return;
  const P = 4, x = Math.round(c.x), y = Math.round(c.y), rows = ['X.........', 'XX........', 'XWX.......', 'XWWX......', 'XWWWX.....', 'XWWWWX....', 'XWWWWWX...', 'XWWWWWWX..', 'XWWWWXXXX.', 'XWXWWX....', 'XX.XWWX...', 'X...XWX...', '....XWWX..', '.....XX...'];
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); M.pxGlow && M.pxGlow(ctx, x + 10, y + 16, 40, '#ffe08a', 0.35);
  rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const ch = r[i]; if (ch === '.') continue; ctx.fillStyle = ch === 'X' ? '#140a06' : '#ffe8b0'; ctx.fillRect(x + i * P, y + j * P, P, P); } });
  ctx.restore();
};

// ───────── touch ─────────
G.worldTap = function (sx, sy) {
  const w = this.walker, run = this.run; if (!w || w.edge || this.modal || this.reel || this.chest) return false;
  const map = run.map, n = map.nodes[w.node], outs = M.nodeAhead(map, w.node), toS = (x, y) => ({ x: 960 + (x - w.camX), y: 560 + (y - w.camY) });
  let pick = null;
  outs.forEach(e => { const hx = e.dir === 'right' ? n.x + 270 : n.x + 130, hy = e.dir === 'right' ? n.y - 4 : n.y + (e.dir === 'up' ? -150 : 150), p = toS(hx, hy), t = toS(map.nodes[e.b].x, map.nodes[e.b].y - 40);
    if (Math.hypot(p.x - sx, p.y - sy) < 90 || Math.hypot(t.x - sx, t.y - sy) < 110) pick = e.dir; });
  if (!pick) return false;
  this.tapDir = pick; this.tapAt = now(); M.Sfx.click(); return true;
};
G.touchInit = function () {
  if (this._touchInit) return; this._touchInit = 1;
  let timer = null, startEl = null, sx = 0, sy = 0;
  window.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'touch') return; if (this.lastInput !== 'touch') { this.lastInput = 'touch'; }
    startEl = e.target; sx = e.clientX; sy = e.clientY; clearTimeout(timer);
    timer = setTimeout(() => { const p = { x: sx, y: sy }; fire(startEl, 'mouseover', p); fire(startEl, 'mousemove', p); this.touchTipAt = now(); }, 420);
  }, true);
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch' && Math.hypot(e.clientX - sx, e.clientY - sy) > 14) clearTimeout(timer); }, true);
  window.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') return; clearTimeout(timer); if (this.touchTipAt && now() - this.touchTipAt < 3000) { const kill = () => { this.tipData = null; this.tipKey = null; this.bump(); }; setTimeout(kill, 1400); if (now() - this.touchTipAt > 380) { e.preventDefault(); e.stopPropagation(); this.swallowClick = now(); } } }, true);
  window.addEventListener('click', (e) => { if (this.swallowClick && now() - this.swallowClick < 400) { e.preventDefault(); e.stopPropagation(); this.swallowClick = 0; } }, true);
};

// ───────── settings panel ─────────
G.openSettings = function () { this.settingsOpen = true; this.rebind = null; this.rebindPad = null; M.Sfx.whoosh(0.2); this.bump(); };
G.closeSettings = function () { this.settingsOpen = false; this.rebind = null; this.rebindPad = null; M.saveSettings(M.settings); M.Sfx.click(); this.bump(); };
G.startRebind = function (act, pad) { if (pad) { this.rebindPad = act; this.rebind = null; } else { this.rebind = act; this.rebindPad = null; } M.Sfx.click(); this.bump(); };
G.finishRebind = function (code, pad) {
  const S = M.settings;
  if (pad) { const act = this.rebindPad; if (!act) return; const old = S.pad[act]; Object.keys(S.pad).forEach(a => { if (a !== act && S.pad[a] === code && ctx(a) === ctx(act)) S.pad[a] = old; }); S.pad[act] = code; this.rebindPad = null; }
  else { const act = this.rebind; if (!act) return; if (code === 'Escape' && act !== 'back') { this.rebind = null; this.bump(); return; } const old = (S.keys[act] || [])[0]; Object.keys(S.keys).forEach(a => { if (a !== act && ctx(a) === ctx(act) && (S.keys[a] || []).includes(code)) S.keys[a] = S.keys[a].map(k => (k === code ? old : k)).filter(Boolean); }); S.keys[act] = [code].concat((S.keys[act] || []).slice(1).filter(k => k !== code)); this.rebind = null; }
  M.saveSettings(S); M.Sfx.up(0); this.bump();
};
const ctx = (a) => (a === 'up' || a === 'down' || a === 'right' ? 'world' : /item|skill|pause|speed/.test(a) ? 'battle' : a === 'zoomIn' || a === 'zoomOut' ? 'base' : 'all');
G.resetBindings = function () { M.settings.keys = JSON.parse(JSON.stringify(M.DEF_KEYS)); M.settings.pad = Object.assign({}, M.DEF_PAD); M.saveSettings(M.settings); M.Sfx.whoosh(0.3); this.bump(); };
G.setInputMode = function (m) { M.settings.input = m; M.saveSettings(M.settings); M.Sfx.click(); this.bump(); };
G.settingsView = function () {
  const S = M.settings, md = M.inputMode(this), plat = { pc: '电脑', deck: 'Steam 掌机', mobile: '手机 / 平板' }[M.platform];
  const modes = (M.platform === 'mobile' ? [['auto', '触屏'], ['pad', '手柄']] : [['auto', '自动'], ['kbm', '键鼠'], ['pad', '手柄']]).map(([k, n]) => ({ n, on: S.input === k, border: S.input === k ? '#f2c14e' : '#4a3a2a', color: S.input === k ? '#ffe08a' : '#a89ca8', onClick: () => this.setInputMode(k) }));
  const kacts = ['up', 'down', 'right', 'item1', 'item2', 'item3', 'skill', 'pause', 'speed', 'back'];
  const pacts = ['confirm', 'back', 'item1', 'item2', 'item3', 'skill', 'pause', 'speed'];
  return { set: { plat, cur: { kbm: '键鼠', pad: '手柄', touch: '触屏' }[md], modes, showKeys: M.platform !== 'mobile',
    keys: kacts.map(a => ({ n: M.ACTION_N[a], k: this.rebind === a ? '按下新按键…' : (S.keys[a] || []).map(M.keyName).join(' / '), c: this.rebind === a ? '#ffe08a' : '#e8dcc4', border: this.rebind === a ? '#f2c14e' : '#3a3040', onClick: () => this.startRebind(a) })),
    pads: pacts.map(a => ({ n: M.ACTION_N[a], k: this.rebindPad === a ? '按下手柄按键…' : M.padName(S.pad[a]), c: this.rebindPad === a ? '#ffe08a' : '#e8dcc4', border: this.rebindPad === a ? '#f2c14e' : '#3a3040', onClick: () => this.startRebind(a, true) })),
    close: () => this.closeSettings(), reset: () => this.resetBindings() } };
};

// ───────── hooks into the loop & views ─────────
const oldTick = G.tick;
G.tick = function (dt) {
  M._g = this; if (!this._inInit) { this._inInit = 1; this.touchInit(); window.addEventListener('mousemove', (e) => { if (e.isTrusted === false || this.lastInput !== 'pad' || M.settings.input === 'pad' || M.platform === 'deck') { this.mAnchor = null; return; } const a = this.mAnchor || (this.mAnchor = { x: e.clientX, y: e.clientY }); if (Math.hypot(e.clientX - a.x, e.clientY - a.y) > 12) { this.lastInput = 'kbm'; this.mAnchor = null; this.bump(); } }, true); }
  this.padPoll(Math.min(0.05, dt));
  // a tapped arrow stays pressed until the explorer actually sets off (taps during a transition still count)
  if (this.tapDir) { if (this.screen !== 'world' || !this.walker || this.walker.edge || now() - this.tapAt > 4000) { this.keys[this.tapDir] = false; this.tapDir = null; } else this.keys[this.tapDir] = true; }
  oldTick.call(this, dt);
  const fc = this.ui.cv('fx'); if (fc) M.drawPadCursor(fc.getContext('2d'), this);
};
const oldView = G.view;
G.view = function () {
  const v = oldView.call(this), md = M.inputMode(this);
  v.inputMode = md; v.isTouch = md === 'touch'; v.isPad = md === 'pad';
  if (v.h) { v.h.items.forEach(it => { it.keyOn = !!it.key; }); v.h.skillKeyOn = !!v.h.skillKey; }
  v.worldHint = md === 'pad' ? '左摇杆 / 十字键 前进和选择岔路 · A 确认 · B 返回' : md === 'touch' ? '点击发光的箭头前进 · 长按任何东西查看说明' : '→ 前进 · ↑ ↓ 选择岔路 · 走过的路不能回头 · 鼠标悬浮节点查看详情';
  v.openSettings = () => this.openSettings();
  const portrait = md === 'touch' && window.innerHeight > window.innerWidth; v.rotateOn = portrait;
  return v;
};
// tutorial and hint wording follows the active input device
const PHR = [
  [/按 → 方向键前进/g, { pad: '推左摇杆向右（或十字键 →）前进', touch: '点击发光的 → 箭头前进' }],
  [/按 ↑ 或 ↓ 选择要走的路/g, { pad: '推左摇杆向上或向下选择要走的路', touch: '点击上下的箭头选择要走的路' }],
  [/鼠标悬浮/g, { pad: '把光标移到', touch: '长按' }],
  [/点击下方「技能」按钮释放/g, { pad: '按 RT 释放', touch: '点击下方「技能」按钮释放' }],
];
const oldCoachI = G.coach;
G.coach = function (text, x, y, tx, ty) { const md = M.inputMode(this); if (md !== 'kbm') PHR.forEach(([re, alt]) => { text = text.replace(re, alt[md] || '$&'); }); return oldCoachI.call(this, text, x, y, tx, ty); };
// unit cards also explain their active skill
const oldUT = M.unitTip;
M.unitTip = function (k, u, run) { const t = oldUT(k, u, run), sk = M.unitSkill && M.unitSkill(k); if (sk && sk.sig) t.lines.splice(1, 0, { rich: [{ t: '【主动 · ' + sk.n + '】', c: '#ffe08a', b: 1 }].concat(M.rich(sk.d + '。开场先放一次，之后法力攒满再放。')) }); return t; };
// taps on the world canvas walk the map
const oldMove = G.worldMove;
G.worldClick = function (sx, sy) { if (!this.worldTap(sx, sy)) oldMove.call(this, sx, sy); };
})();

;
