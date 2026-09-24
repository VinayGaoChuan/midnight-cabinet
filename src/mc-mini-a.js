// ==== mc-mini-a.js ====
(function () {
// Every event is a little game. Framework (stage, input, buttons, rewards) + 挖矿 / 转盘 / 水果机 / 抓娃娃.
const M = window.MC, G = M.Game.prototype, S = M.Sfx;
const now = () => performance.now();
const cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (p) => 1 - Math.pow(1 - cl(p, 0, 1), 3), eio = (p) => { p = cl(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; }, eb = (p) => M.ease.eback(cl(p, 0, 1));
const rnd = Math.random;
const MINI = M.MINI = {};
const SX = 360, SY = 110, SW = 1200, SH = 700, CX = SX + SW / 2, FLOOR = SY + SH - 110;
// ───────── drawing kit (shared by every mini game) ─────────
const K = M.MK = { SX, SY, SW, SH, CX, FLOOR, cl, eo, eio, eb, rnd };
K.R = (x, a, b, w, h, c) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
K.CI = (x, a, b, r, c) => { x.fillStyle = c; x.beginPath(); x.arc(a, b, Math.max(0, r), 0, 7); x.fill(); };
K.EL = (x, a, b, rx, ry, c, rot) => { x.fillStyle = c; x.beginPath(); x.ellipse(a, b, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, 7); x.fill(); };
K.PL = (x, pts, c) => { x.fillStyle = c; x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
K.LN = (x, a, b, c, d, w, col) => { x.strokeStyle = col; x.lineWidth = w; x.lineCap = 'round'; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
K.RR = (x, a, b, w, h, r, c, st, sw) => { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); if (c) { x.fillStyle = c; x.fill(); } if (st) { x.strokeStyle = st; x.lineWidth = sw || 2; x.stroke(); } };
K.LG = (x, x0, y0, x1, y1, stops) => { const g = x.createLinearGradient(x0, y0, x1, y1); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g; };
K.RG = (x, a, b, r0, r1, stops) => { const g = x.createRadialGradient(a, b, r0, a, b, r1); stops.forEach(([p, c]) => g.addColorStop(p, c)); return g; };
K.TX = (x, s, a, b, size, col, o = {}) => { x.font = (o.w || 700) + ' ' + size + "px 'Noto Serif SC', serif"; x.textAlign = o.al || 'center'; x.textBaseline = 'middle'; if (o.sh !== 0) { x.fillStyle = 'rgba(0,0,0,0.85)'; x.fillText(s, a + 2, b + 3); } x.fillStyle = col; x.fillText(s, a, b); };
K.PT = (x, s, a, b, size, col, o) => M.pxText(x, String(s), a, b, size, col, o || {});
K.GL = (x, a, b, r, col, al) => { if (al <= 0) return; const A = x.globalAlpha; x.globalAlpha = A * cl(al, 0, 1); x.globalCompositeOperation = 'lighter'; x.fillStyle = K.RG(x, a, b, 0, r, [[0, col], [1, 'rgba(0,0,0,0)']]); x.fillRect(a - r, b - r, r * 2, r * 2); x.globalCompositeOperation = 'source-over'; x.globalAlpha = A; };
K.IC = (x, key, a, b, s) => { const c = M.iconCanvas(key, 3) || (M.SP && M.SP[key] ? M.spriteCanvas(key, 4) : null); if (c) x.drawImage(c, a - s / 2, b - s / 2, s, s); };
K.SP = (x, key, a, b, h, flip) => { const c = M.spriteCanvas(key, 6); if (!c || !c.height) return 0; const s = h / c.height; x.save(); x.translate(a, b); if (flip) x.scale(-1, 1); x.drawImage(c, -c.width * s / 2, -c.height * s, c.width * s, c.height * s); x.restore(); return c.width * s; };
K.bulbs = (x, a, b, w, h, t, col, n) => { n = n || 24; for (let i = 0; i < n; i++) { const p = i / n, per = 2 * (w + h), d = p * per; let px, py; if (d < w) { px = a + d; py = b; } else if (d < w + h) { px = a + w; py = b + d - w; } else if (d < 2 * w + h) { px = a + w - (d - w - h); py = b + h; } else { px = a; py = b + h - (d - 2 * w - h); } const on = (Math.floor(t * 6) + i) % 3 === 0; K.CI(x, px, py, 5, on ? '#fff6c0' : col); if (on) K.GL(x, px, py, 16, col, 0.7); } };
K.shade = (c, k) => M.shade(c, k);
K.ease = { eo, eio, eb };
// ───────── lifecycle ─────────
G.miniStart = function (kind, o) {
  const D = MINI[kind]; if (!D) return false; const run = this.run;
  const mg = this.mini = Object.assign({ kind, D, t: 0, pt: 0, phase: 'idle', title: D.title || '', text: D.text || '', col: D.col || '#ffe08a', img: D.img || 'star', keys: {}, msg: null, mx: 960, my: 540 }, o || {});
  mg.P = run && this.node ? this.runP(this.node) : 10; mg.pay = M.nice(mg.P * 8); mg.luck = run ? run.mods.eventLuck || 0 : 0;
  // a placeholder modal keeps the explorer, pad cursor and hotkeys in 'window open' mode while the game runs
  this.modal = { kind: 'event', title: mg.title, img: mg.img, at: now(), choices: [], mini: 1 };
  try { D.init && D.init.call(this, mg); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('mini init ' + kind + ': ' + e.message); this.mini = null; this.modal = null; return false; }
  M.Sfx.whoosh(0.3); this.tipData = null; this.bump(); return true;
};
G.miniSet = function (phase) { const mg = this.mini; if (mg) { mg.phase = phase; mg.pt = 0; } };
G.miniSay = function (text, col, big) { const mg = this.mini; if (mg) mg.msg = { text, col: col || '#ffe08a', t: 0, big: !!big }; };
G.miniFinish = function (text, col, gains) { const mg = this.mini; this.mini = null; if (!this.modal) this.modal = { kind: 'event', title: mg.title, img: mg.img, at: now(), choices: [] }; else Object.assign(this.modal, { title: mg.title, img: mg.img }); this.evResult(text, col, gains); };
G.miniBattle = function (type) { const n = this.node; this.mini = null; this.modal = null; n.type = type || 'normal'; this.trans = { kind: 'out', t: 0, node: n }; M.Sfx.boom(); this.fx.kick(20); this.bump(); };
G.miniPay = function (v) { const run = this.run; if (run.wallet < v) { this.toast('积分不够', '#d0453c'); return false; } this.hold('wallet', run.wallet); run.wallet -= v; this.release('wallet'); M.Sfx.coin(); return true; };
// rewards shared by the games
K.item = (run, P) => run.items.indexOf(null) >= 0 ? { k: 'item', key: M.pick(Object.keys(M.ITEMS)), q: M.rollTier2(run) } : { k: 'wallet', v: M.nice(P * 4) };
K.bp = (style, qUp) => ({ k: 'bp', key: M.dropBp(null, style, qUp) });
G.giveExp = function (v, from) { const run = this.run; this.hold('rexp', run.loot.exp); run.loot.exp += v; this.fly('orb', from || { x: 960, y: 500 }, 'rexp', '#9cff7a', () => this.release('rexp')); return '经验 +' + v; };
G.giveShards = function (v, from) { const run = this.run; run.loot.shards = run.loot.shards || 0; this.hold('rshard', run.loot.shards); run.loot.shards += v; this.fly('shard', from || { x: 960, y: 500 }, 'rshard', '#d8a0ff', () => this.release('rshard')); return '灵魂碎片 +' + v; };
G.buffRun = function (k, v, label, col) { const run = this.run; if (k === 'unitAtk' || k === 'heroAtk' || k === 'mult') run.runBuff[k] = (run.runBuff[k] || 0) + v; else run.mods[k] = (run.mods[k] || 0) + v; this.fx.pop(960, 420, label, col || '#ffcc33', 54); M.Sfx.mult(); return label; };
// ───────── frame: dim, stage, title plate, flavour text, message banner ─────────
function frameBegin(x, mg) {
  const a = cl(mg.t / 0.25, 0, 1), q = eb(mg.t / 0.4), D = mg.D;
  x.fillStyle = 'rgba(4,2,8,' + (0.8 * a) + ')'; x.fillRect(0, 0, 1920, 1080);
  x.save(); x.globalAlpha = a; const sc = 0.86 + 0.14 * q; x.translate(CX, SY + SH / 2); x.scale(sc, sc); x.translate(-CX, -(SY + SH / 2));
  x.fillStyle = '#0a080c'; x.fillRect(SX - 10, SY - 10, SW + 20, SH + 20);
  x.fillStyle = D.bg ? D.bg(x) : K.LG(x, 0, SY, 0, SY + SH, [[0, '#1c1622'], [1, '#0c0a10']]); x.fillRect(SX, SY, SW, SH);
  x.save(); x.beginPath(); x.rect(SX, SY, SW, SH); x.clip();
}
function frameDeco(x, mg) {
  const a = cl(mg.t / 0.25, 0, 1), q = eb(mg.t / 0.4), sc = 0.86 + 0.14 * q; x.save(); x.globalAlpha = a; x.translate(CX, SY + SH / 2); x.scale(sc, sc); x.translate(-CX, -(SY + SH / 2));
  const col = mg.col;
  x.strokeStyle = col; x.lineWidth = 4; x.strokeRect(SX - 2, SY - 2, SW + 4, SH + 4); x.strokeStyle = 'rgba(0,0,0,0.7)'; x.lineWidth = 2; x.strokeRect(SX + 3, SY + 3, SW - 6, SH - 6);
  [[SX, SY], [SX + SW, SY], [SX, SY + SH], [SX + SW, SY + SH]].forEach(([a, b]) => { K.R(x, a - 9, b - 9, 18, 18, col); K.R(x, a - 5, b - 5, 10, 10, '#0a080c'); });
  // title plate
  const tw = 420, ty = SY - 34; K.PL(x, [[CX - tw / 2 - 30, ty], [CX + tw / 2 + 30, ty], [CX + tw / 2, ty + 64], [CX - tw / 2, ty + 64]], '#0a080c'); x.strokeStyle = col; x.lineWidth = 3; x.beginPath(); x.moveTo(CX - tw / 2 - 30, ty); x.lineTo(CX + tw / 2 + 30, ty); x.lineTo(CX + tw / 2, ty + 64); x.lineTo(CX - tw / 2, ty + 64); x.closePath(); x.stroke();
  K.IC(x, mg.img, CX - tw / 2 + 24, ty + 32, 44); K.PT(x, mg.title, CX + 16, ty + 32, 46, col);
  if (mg.text) { x.globalAlpha *= 0.9; K.TX(x, mg.text, CX, SY + 56, 24, '#cfc6b8', { w: 400 }); x.globalAlpha = cl(mg.t / 0.25, 0, 1); }
  // message
  const m = mg.msg; if (m) { const q = cl(m.t / 0.25, 0, 1), fade = cl((m.big ? 3 : 2.2) - m.t, 0, 1), y = SY + SH - 64; if (fade > 0) { x.globalAlpha = fade; const w = 60 + m.text.length * (m.big ? 44 : 30); x.fillStyle = 'rgba(8,6,10,0.88)'; x.fillRect(CX - w / 2 * eb(q), y - 30, w * eb(q), 60); K.R(x, CX - w / 2 * eb(q), y - 30, w * eb(q), 3, m.col); K.R(x, CX - w / 2 * eb(q), y + 27, w * eb(q), 3, m.col); K.PT(x, m.text, CX, y, m.big ? 44 : 32, m.col); x.globalAlpha = 1; } }
  x.restore();
}
// the stage is painted at art resolution (pixel look, like the rest of the game); frame, title and text stay crisp on top
M.drawMini = function (ctx, g) {
  const mg = g.mini; if (!mg || g.reel) return;
  const L = M.pixelMode ? M.pxLayer('mini', 1920, 1080) : null, x = L ? L.getContext('2d') : ctx;
  if (L) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 1920, 1080); }
  frameBegin(x, mg); try { mg.D.draw.call(g, x, mg); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('mini ' + mg.kind + ': ' + e.message); } x.restore(); x.restore();
  if (L) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(L, 0, 0, L.width, L.height, 0, 0, 1920, 1080); ctx.restore(); }
  frameDeco(ctx, mg);
};
// ───────── input ─────────
const padHeld = () => { try { const P = M.settings.pad, gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean); return !!(gp && P && gp.buttons[P.confirm] && gp.buttons[P.confirm].pressed); } catch (e) { return false; } };
G.miniPt = function (cx, cy) { const st = this.ui.stage(); if (!st) return { x: 960, y: 540 }; const r = st.getBoundingClientRect(), s = this.ui.scale(); return { x: (cx - r.left) / s, y: (cy - r.top) / s }; };
G.miniDown = function (x, y, src) { const mg = this.mini; if (!mg || this.reel) return false; mg.mx = x; mg.my = y; if (mg.D.down) { mg.holding = src; mg.D.down.call(this, mg, x, y, src); this.bump(); return true; } return false; };
G.miniUp = function (src) { const mg = this.mini; if (!mg || !mg.holding || (src && mg.holding !== src)) return; mg.holding = null; if (mg.D.up) mg.D.up.call(this, mg); this.bump(); };
const KEYMAP = { Space: 'act', Enter: 'act', NumpadEnter: 'act', KeyQ: 'l0', KeyW: 'up', KeyE: 'l2', ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyA: 'left', KeyD: 'right', KeyS: 'down', Escape: 'back' };
const oldKey = G.handleKey;
G.handleKey = function (ev) {
  const mg = this.mini; if (!mg || this.reel) return oldKey.call(this, ev);
  const k = KEYMAP[ev.code], down = ev.type === 'keydown'; if (!k) return; ev.preventDefault(); if (down && ev.repeat) return;
  mg.keys[k] = down; if (down) this.lastInput = 'kbm';
  if (mg.D.key && mg.D.key.call(this, mg, k, down) === true) { this.bump(); return; }
  if (k === 'act') { if (mg.D.down) { if (down) this.miniDown(mg.mx, mg.my, 'key'); else this.miniUp('key'); return; } if (down) { const b = (mg.D.btns ? mg.D.btns.call(this, mg) : []).find(b => !b.dis); if (b) { M.Sfx.click(); b.fn(); } } }
  if (k === 'back' && down) { const b = (mg.D.btns ? mg.D.btns.call(this, mg) : []).find(b => b.leave && !b.dis); if (b) { M.Sfx.click(); b.fn(); } }
  this.bump();
};
const oldCC = G.cursorClick;
G.cursorClick = function () {
  if (this.mini && !this.reel && this.cur) { const p = this.stageToClient(this.cur.x, this.cur.y), el = p && document.elementFromPoint(p.x, p.y); if (!(el && el.closest && el.closest('[data-minibtn]'))) { if (this.miniDown(this.cur.x, this.cur.y, 'pad')) return; } }
  return oldCC.call(this);
};
const oldTick = G.tick;
G.tick = function (dt) {
  if (!this._miniInit) { this._miniInit = 1;
    window.addEventListener('pointerdown', (e) => { if (e.pointerId === 77 || !this.mini || this.reel) return; if (e.target && e.target.closest && e.target.closest('[data-minibtn]')) return; const p = this.miniPt(e.clientX, e.clientY); if (this.miniDown(p.x, p.y, 'ptr')) e.preventDefault(); }, true);
    ['pointerup', 'pointercancel'].forEach(n => window.addEventListener(n, (e) => { if (e.pointerId === 77) return; this.miniUp('ptr'); }, true));
    window.addEventListener('pointermove', (e) => { if (!this.mini) return; const p = this.miniPt(e.clientX, e.clientY); this.mini.mx = p.x; this.mini.my = p.y; }, true);
  }
  oldTick.call(this, dt);
  const mg = this.mini;
  if (mg && !this.reel && !this.fx.frozen) { const d = Math.min(dt, 0.05); mg.t += d; mg.pt += d; if (mg.msg) mg.msg.t += d; if (mg.holding === 'pad' && !padHeld()) this.miniUp('pad'); if (this.cur && M.inputMode(this) === 'pad' && this.cur.shown) { mg.mx = this.cur.x; mg.my = this.cur.y; } try { mg.D.tick && mg.D.tick.call(this, mg, d); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('mini ' + mg.kind + ': ' + e.message); } this.bump(); }
};
// ───────── view: buttons ─────────
const oldView = G.view;
G.view = function () {
  const v = oldView.call(this), mg = this.mini;
  v.miniOn = !!mg && !this.reel;
  if (mg) { v.modalOn = false; v.tipOn = false; v.coachOn = false; if (!this.reel) v.coverOn = true;
    const bs = mg.D.btns ? mg.D.btns.call(this, mg) || [] : [];
    v.mini = { btns: bs.map(b => ({ t: b.t, sub: b.sub || '', hasSub: !!b.sub, op: b.dis ? 0.45 : 1, bg: b.dis ? '#15111a' : b.gold ? 'linear-gradient(180deg,#ffe08a,#d4982e)' : b.danger ? 'linear-gradient(180deg,#e05a4a,#8a2020)' : 'linear-gradient(180deg,#2e2436,#1a1420)', color: b.dis ? '#6b6570' : b.gold ? '#1a0e08' : '#f5ead4', border: b.dis ? '#2a2230' : b.gold ? '#fff3c4' : b.danger ? '#ff9a8a' : '#8a6a3a', glow: b.gold && !b.dis ? 'rgba(255,200,90,0.45)' : 'rgba(0,0,0,0)',
      onClick: () => { if (!this.mini) return; if (b.dis) { this.toast(b.why || '现在不行', '#8d8496'); return; } M.Sfx.click(); b.fn(); this.bump(); } })) };
  }
  return v;
};
M.EVMINI = {}; // event key -> mini kind

// ═════════════════════ 挖矿 · push your luck ═════════════════════
MINI.mine = { title: '废弃矿坑', img: 'u_pick', col: '#e0904a', text: '岩壁里闪着光。每挖一镐，头顶的石头就松一分。',
  init(mg) { mg.digs = 0; mg.pile = []; mg.cracks = []; mg.seed = rnd() * 100; mg.rocks = [...Array(26)].map((_, i) => ({ x: SX + 80 + rnd() * (SW - 160), y: SY + 110 + rnd() * 330, r: 30 + rnd() * 50, c: ['#3a2e26', '#2e241e', '#443629'][i % 3] })); mg.fall = []; mg.dust = []; },
  risk(mg) { return cl(0.05 + mg.digs * 0.085 - mg.luck * 0.3, 0.03, 0.8); },
  table(mg) { const d = mg.digs, run = this.run, P = mg.P; return [
    { n: '煤块', ic: 'sack', c: '#9a9aa8', w: 40, g: () => ({ k: 'rsup', v: 10 + d * 4 }) },
    { n: '银矿石', ic: 'coin', c: '#dfe6f0', w: 26, g: () => ({ k: 'wallet', v: M.nice(P * 2.5) }) },
    { n: '金矿石', ic: 'coin', c: '#ffcc33', w: 12 + d * 3, g: () => ({ k: 'wallet', v: M.nice(P * 6) }) },
    { n: '魔晶', ic: 'gem', c: '#c890ff', w: 6 + d * 2, g: () => K.item(run, P) },
    { n: '古代图纸', ic: 'scroll', c: '#ffe08a', w: 4 + d * 2, g: () => K.bp() }]; },
  dig(mg) { mg.collapse = rnd() < MINI.mine.risk(mg); mg.next = M.wpick(MINI.mine.table.call(this, mg), o => o.w); mg.hit = false; this.miniSet('swing'); },
  btns(mg) { if (mg.phase !== 'idle') return []; const r = Math.round(MINI.mine.risk(mg) * 100);
    return [{ t: '挖一镐', sub: '塌方风险 ' + r + '%', gold: 1, fn: () => MINI.mine.dig.call(this, mg) }, { t: '收工离开', leave: 1, sub: mg.pile.length ? '带走 ' + mg.pile.length + ' 样东西' : '什么也不拿', fn: () => { if (!mg.pile.length) return this.miniFinish('你拍掉身上的灰，离开了矿坑。', '#8d8496'); this.miniFinish('你背着 ' + mg.pile.map(p => p.n).join('、') + ' 爬出了矿坑。', '#e0904a', mg.pile.map(p => p.g())); } }]; },
  tick(mg, dt) {
    const ox = CX + 60, oy = SY + 290;
    if (mg.phase === 'swing') {
      if (!mg.hit && mg.pt > 0.3) { mg.hit = true; S.dig(); this.fx.kick(6 + mg.digs); this.fx.spark(ox - 40, oy, '#ffd080', 14, { dir: Math.PI, spread: 1.4, v: 700 }); for (let i = 0; i < 3 + mg.digs; i++) mg.cracks.push({ a: rnd() * 6.28, l: 40 + rnd() * (60 + mg.digs * 25), w: 1 + rnd() * 2 }); }
      if (mg.pt > 0.7) {
        if (mg.collapse) { this.miniSet('collapse'); S.boom(); S.shatter(); this.fx.kick(34); this.fx.flash('#ffffff', 0.2); for (let i = 0; i < 22; i++) mg.fall.push({ x: SX + 60 + rnd() * (SW - 120), y: SY - rnd() * 300, vy: 200 + rnd() * 300, r: 18 + rnd() * 40, rot: rnd() * 6, c: ['#4a3a2e', '#3a2e26', '#5a4838'][i % 3] }); }
        else { const o = mg.next; mg.digs++; mg.pile.push(o); mg.ore = { o, t: 0 }; this.miniSet('idle'); S.coin(); S.land(mg.digs); this.fx.explode(ox, oy, o.c, 0.8); this.fx.pop(ox, oy - 70, o.n, o.c, 44); this.miniSay('挖到了 ' + o.n + '！', o.c); }
      }
    }
    if (mg.ore) mg.ore.t += dt;
    if (mg.phase === 'collapse') { mg.fall.forEach(f => { f.vy += 1400 * dt; f.y += f.vy * dt; f.rot += dt * 3; if (f.y > FLOOR - f.r * 0.5) { f.y = FLOOR - f.r * 0.5; f.vy *= -0.2; } });
      if (mg.pt > 1.8 && !mg.done) { mg.done = true; const lost = mg.pile.map(p => p.n); this.heroHurt(0.12); this.miniFinish('矿坑塌了！你被埋了半截才爬出来。' + (lost.length ? '挖到的 ' + lost.join('、') + ' 全埋在了下面。' : ''), '#d0453c'); } }
    const r = MINI.mine.risk(mg); if (rnd() < r * 0.6) mg.dust.push({ x: SX + 40 + rnd() * (SW - 80), y: SY, v: 60 + rnd() * 80, t: 0 }); mg.dust.forEach(d => { d.y += d.v * dt; d.t += dt; }); mg.dust = mg.dust.filter(d => d.y < FLOOR);
  },
  draw(x, mg) {
    const t = mg.t, ox = CX + 60, oy = SY + 290, r = MINI.mine.risk(mg);
    x.fillStyle = K.LG(x, 0, SY, 0, SY + SH, [[0, '#2a1e18'], [1, '#120c0a']]); x.fillRect(SX, SY, SW, SH);
    mg.rocks.forEach(k => { K.EL(x, k.x, k.y, k.r, k.r * 0.7, k.c); K.EL(x, k.x - k.r * 0.2, k.y - k.r * 0.25, k.r * 0.5, k.r * 0.3, 'rgba(255,220,180,0.05)'); });
    for (let i = 0; i < 18; i++) { const a = mg.seed + i * 2.1, px = SX + 120 + ((i * 97) % (SW - 240)), py = SY + 120 + ((i * 61) % 320); K.GL(x, px, py, 14, ['#ffcc33', '#c890ff', '#dfe6f0'][i % 3], 0.25 + 0.2 * Math.sin(t * 2 + a)); K.R(x, px - 2, py - 2, 4, 4, ['#ffcc33', '#c890ff', '#dfe6f0'][i % 3]); }
    // the hole grows with every swing
    const hr = 50 + mg.digs * 16; K.EL(x, ox, oy, hr + 10, hr * 0.8 + 8, '#1a120e'); K.EL(x, ox, oy, hr, hr * 0.78, K.RG(x, ox, oy, 4, hr, [[0, '#000'], [1, '#150e0b']]));
    x.strokeStyle = r > 0.4 ? 'rgba(255,90,60,0.55)' : 'rgba(0,0,0,0.6)'; mg.cracks.forEach(c => { x.lineWidth = c.w; x.beginPath(); let px = ox + Math.cos(c.a) * hr, py = oy + Math.sin(c.a) * hr * 0.78; x.moveTo(px, py); for (let s = 1; s <= 4; s++) { px += Math.cos(c.a + Math.sin(s * 3 + c.l) * 0.5) * c.l / 4; py += Math.sin(c.a + Math.cos(s * 2 + c.l) * 0.5) * c.l / 4; x.lineTo(px, py); } x.stroke(); });
    if (mg.ore && mg.ore.t < 1.4) { const q = eb(mg.ore.t / 0.4), o = mg.ore.o; K.GL(x, ox, oy, 120, o.c, 0.8 * (1 - mg.ore.t / 1.4)); K.IC(x, o.ic, ox, oy - q * 30, 90 * q); }
    // floor + hero
    K.R(x, SX, FLOOR, SW, SH - (FLOOR - SY), '#1a120e'); K.R(x, SX, FLOOR, SW, 4, '#4a3a2e');
    const hx = CX - 260, sw = mg.phase === 'swing' ? (mg.pt < 0.3 ? -1.9 + mg.pt / 0.3 * 2.6 : 0.7 - (mg.pt - 0.3) * 1.5) : -0.5 + Math.sin(t * 2) * 0.1;
    K.SP(x, M.HEROES[this.run.hero.cls].sprite, hx, FLOOR, 170);
    x.save(); x.translate(hx + 40, FLOOR - 110); x.rotate(sw); K.IC(x, 'u_pick', 60, 0, 110); x.restore();
    K.GL(x, hx + 20, FLOOR - 140, 160, '#ffcf80', 0.35); // head lamp
    // danger gauge
    const gx = SX + SW - 90, gy = SY + 110, gh = 380; K.R(x, gx - 4, gy - 4, 44, gh + 8, '#0a080c'); K.R(x, gx, gy, 36, gh, '#1a1418'); const fh = gh * r; K.R(x, gx, gy + gh - fh, 36, fh, K.LG(x, 0, gy + gh, 0, gy, [[0, '#9cff7a'], [0.5, '#ffcc33'], [1, '#ff3a2a']])); K.IC(x, 'r_skel', gx + 18, gy - 34, 44); K.PT(x, Math.round(r * 100) + '%', gx + 18, gy + gh + 30, 30, r > 0.4 ? '#ff6a5a' : '#ffe08a');
    mg.dust.forEach(d => K.R(x, d.x, d.y, 3, 3, 'rgba(200,180,150,0.6)'));
    // haul
    mg.pile.forEach((p, i) => { const px = SX + 70 + i * 86, py = FLOOR + 50; K.R(x, px - 36, py - 36, 72, 72, 'rgba(0,0,0,0.5)'); K.R(x, px - 36, py - 36, 72, 3, p.c); K.IC(x, p.ic, px, py, 52); });
    if (mg.phase === 'collapse') { x.fillStyle = 'rgba(40,30,20,' + cl(mg.pt / 1.2, 0, 0.7) + ')'; x.fillRect(SX, SY, SW, SH); mg.fall.forEach(f => { x.save(); x.translate(f.x, f.y); x.rotate(f.rot); K.EL(x, 0, 0, f.r, f.r * 0.75, f.c); K.EL(x, -f.r * 0.25, -f.r * 0.25, f.r * 0.4, f.r * 0.25, 'rgba(255,220,180,0.08)'); x.restore(); }); if (mg.pt > 0.6) K.PT(x, '塌方！', CX, SY + 300, 110, '#ff4a3a'); }
  } };

// ═════════════════════ 转盘 · roulette ═════════════════════
const RSEC = [...Array(14)].map((_, i) => i === 0 ? 'g' : i === 7 ? 'x' : i % 2 ? 'r' : 'b');
MINI.roulette = { title: '午夜转盘', img: 'e_wheel', col: '#ff5a4a', text: '荷官没有脸。转盘上的小球一直在跳，好像在等你下注。',
  init(mg) { mg.ang = rnd() * 6.28; mg.spins = 0; mg.max = 3; mg.net = 0; mg.hist = []; mg.lastSec = -1; },
  spin(mg, bet) {
    const stake = bet === 'g' ? mg.pay : mg.pay; if (!this.miniPay(stake)) return; mg.net -= stake; mg.bet = bet;
    let tg = Math.floor(rnd() * 14); if (mg.luck > 0 && rnd() < mg.luck && RSEC[tg] !== bet) tg = Math.floor(rnd() * 14);
    const st = Math.PI * 2 / 14, j = (rnd() - 0.5) * st * 0.7; let af = -Math.PI / 2 - (tg + 0.5) * st - j; while (af < mg.ang + Math.PI * 2 * 5) af += Math.PI * 2;
    mg.tg = tg; mg.a0 = mg.ang; mg.af = af; this.miniSet('spin'); S.lever(); S.whoosh(0.4);
  },
  btns(mg) { if (mg.phase !== 'idle') return []; const left = mg.max - mg.spins, poor = this.run.wallet < mg.pay, over = left <= 0;
    const b = (t, k, sub) => ({ t, sub: sub + ' · ' + mg.pay, dis: poor || over, why: over ? '荷官收起了转盘' : '积分不够', fn: () => MINI.roulette.spin.call(this, mg, k) });
    return [b('押红', 'r', '×2'), b('押黑', 'b', '×2'), b('押金', 'g', '×10'), { t: '离开', leave: 1, sub: '还能转 ' + left + ' 次', gold: over, fn: () => this.miniFinish(mg.net > 0 ? '你赢走了 ' + M.fmt(mg.net) + ' 积分。荷官的笑容僵住了。' : mg.net < 0 ? '转盘吃掉了你 ' + M.fmt(-mg.net) + ' 积分。' : '你看了一会儿，没有下注。', mg.net > 0 ? '#ffcc33' : '#8d8496') }]; },
  tick(mg, dt) {
    if (mg.phase !== 'spin') return; const D = 3.8, p = cl(mg.pt / D, 0, 1), e = 1 - Math.pow(1 - p, 4); mg.ang = mg.a0 + (mg.af - mg.a0) * e;
    const st = Math.PI * 2 / 14, sec = Math.floor((((-Math.PI / 2 - mg.ang) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2) / st); if (sec !== mg.lastSec) { mg.lastSec = sec; S.tick(sec % 8); }
    if (p >= 1) { mg.spins++; const r = RSEC[mg.tg]; mg.hist.push(r); const win = r === mg.bet ? (r === 'g' ? 10 : 2) : 0;
      if (win) { const v = mg.pay * win; mg.net += v; this.award([{ k: 'wallet', v }], { x: CX, y: SY + 380 }); this.miniSay(r === 'g' ? '金色！×10！' : '中了！×2', '#ffcc33', r === 'g'); if (r === 'g') { this.fx.confetti(80); S.fanfare(); } else S.up(2); this.fx.explode(CX, SY + 380, '#ffcc33', 1.2); }
      else if (r === 'x') { this.heroHurt(0.05); this.miniSay('骷髅格：庄家通吃，还咬了你一口', '#ff5a4a'); S.lose(); }
      else { this.miniSay({ r: '红', b: '黑', g: '金' }[r] + '色，没中', '#8d8496'); S.reelStop(); }
      this.miniSet('idle'); }
  },
  draw(x, mg) {
    const t = mg.t, wx = CX, wy = SY + 380, R = 250, st = Math.PI * 2 / 14;
    x.fillStyle = K.RG(x, CX, SY + 380, 60, 700, [[0, '#1e5a36'], [1, '#08180e']]); x.fillRect(SX, SY, SW, SH);
    for (let i = 0; i < 40; i++) K.R(x, SX + (i * 131) % SW, SY + 80 + (i * 71) % (SH - 80), 2, 2, 'rgba(255,255,255,0.05)');
    K.CI(x, wx, wy + 14, R + 34, 'rgba(0,0,0,0.5)'); K.CI(x, wx, wy, R + 30, '#6a3a1a'); K.CI(x, wx, wy, R + 22, '#caa84a'); K.CI(x, wx, wy, R + 16, '#3a200e');
    for (let i = 0; i < 28; i++) { const a = i / 28 * 6.28; const on = (Math.floor(t * 8) + i) % 4 === 0 || mg.phase === 'spin' && (i + Math.floor(t * 20)) % 7 === 0; K.CI(x, wx + Math.cos(a) * (R + 26), wy + Math.sin(a) * (R + 26), 5, on ? '#fff6c0' : '#8a6a2a'); }
    x.save(); x.translate(wx, wy); x.rotate(mg.ang);
    RSEC.forEach((s, i) => { x.fillStyle = s === 'g' ? '#e8b830' : s === 'x' ? '#2a2a33' : s === 'r' ? (i % 4 === 1 ? '#c0302a' : '#a8241e') : (i % 4 === 2 ? '#1a1418' : '#221c22'); x.beginPath(); x.moveTo(0, 0); x.arc(0, 0, R, i * st, (i + 1) * st); x.closePath(); x.fill(); x.strokeStyle = '#caa84a'; x.lineWidth = 2; x.stroke();
      const ma = (i + 0.5) * st; x.save(); x.rotate(ma); x.translate(R * 0.74, 0); x.rotate(Math.PI / 2); if (s === 'g') K.IC(x, 'u_star', 0, 0, 44); else if (s === 'x') K.IC(x, 'r_skel', 0, 0, 44); else K.CI(x, 0, 0, 9, s === 'r' ? '#ff8a7a' : '#8a8090'); x.restore(); });
    K.CI(x, 0, 0, R * 0.42, '#3a200e'); K.CI(x, 0, 0, R * 0.36, K.RG(x, -20, -20, 5, R * 0.4, [[0, '#ffe08a'], [1, '#8a6a2a']])); for (let k = 0; k < 4; k++) { x.rotate(Math.PI / 2); K.R(x, -4, -R * 0.5, 8, R * 0.22, '#caa84a'); } x.restore();
    K.PL(x, [[wx - 22, wy - R - 44], [wx + 22, wy - R - 44], [wx, wy - R + 6]], '#ff4a3a'); K.PL(x, [[wx - 12, wy - R - 40], [wx + 12, wy - R - 40], [wx, wy - R - 6]], '#ffb0a0');
    if (mg.phase === 'spin') K.GL(x, wx, wy - R, 60, '#ffcc33', 0.5 + 0.3 * Math.sin(t * 30));
    // side table: bet + history
    K.PT(x, '下注', SX + 150, SY + 150, 30, '#e8dcc4'); if (mg.bet) { const c = { r: '#c0302a', b: '#2a2430', g: '#e8b830' }[mg.bet]; for (let i = 0; i < 5; i++) { K.EL(x, SX + 150, SY + 250 - i * 10, 44, 14, '#0a080c'); K.EL(x, SX + 150, SY + 246 - i * 10, 42, 12, c); } }
    K.PT(x, '战绩', SX + SW - 150, SY + 150, 30, '#e8dcc4'); mg.hist.forEach((h, i) => K.CI(x, SX + SW - 190 + (i % 3) * 40, SY + 210 + Math.floor(i / 3) * 40, 14, { r: '#c0302a', b: '#1a1418', g: '#e8b830', x: '#6a6a78' }[h]));
    K.PT(x, (mg.net >= 0 ? '+' : '') + M.fmt(mg.net), SX + SW - 150, SY + 340, 36, mg.net >= 0 ? '#ffcc33' : '#ff6a5a');
  } };

// ═════════════════════ 水果机 · slot machine ═════════════════════
const SYM = ['cherry', 'lemon', 'bell', 'bar', 'seven', 'skull'], SW8 = [30, 26, 18, 12, 6, 8], STRIP = [0, 1, 2, 0, 3, 1, 4, 0, 2, 5, 1, 3];
K.sym = function (x, k, a, b, s) {
  const u = s / 100; x.save(); x.translate(a, b); x.scale(u, u);
  if (k === 'cherry') { x.strokeStyle = '#3a8a3a'; x.lineWidth = 6; x.beginPath(); x.moveTo(-18, 10); x.quadraticCurveTo(-6, -30, 14, -38); x.moveTo(20, 16); x.quadraticCurveTo(14, -20, 14, -38); x.stroke(); K.EL(x, 22, -38, 14, 7, '#5ab04a', -0.4); K.CI(x, -20, 18, 22, '#d0202a'); K.CI(x, 20, 24, 22, '#e0303a'); K.CI(x, -27, 10, 6, '#ff9a9a'); K.CI(x, 13, 16, 6, '#ff9a9a'); }
  else if (k === 'lemon') { K.EL(x, 0, 0, 40, 30, '#ffd23a', -0.3); K.EL(x, -10, -10, 16, 8, '#fff2a0', -0.3); K.CI(x, 38, -14, 6, '#e8b020'); }
  else if (k === 'bell') { K.PL(x, [[-34, 26], [-26, -10], [-14, -34], [14, -34], [26, -10], [34, 26]], '#f0c040'); K.R(x, -40, 22, 80, 10, '#c8982a'); K.CI(x, 0, 38, 9, '#8a6a2a'); K.R(x, -18, -26, 8, 40, 'rgba(255,255,255,0.35)'); }
  else if (k === 'bar') { K.RR(x, -46, -24, 92, 48, 6, '#1a1418', '#ffe08a', 4); K.TX(x, 'BAR', 0, 2, 34, '#ffe08a', { sh: 0, w: 900 }); }
  else if (k === 'seven') { K.TX(x, '7', 4, 4, 100, '#6a0a0a', { sh: 0, w: 900 }); K.TX(x, '7', 0, 0, 100, '#ff2a2a', { sh: 0, w: 900 }); }
  else if (k === 'skull') { K.CI(x, 0, -6, 32, '#e8e0d0'); K.R(x, -18, 18, 36, 18, '#e8e0d0'); K.CI(x, -12, -6, 9, '#1a1418'); K.CI(x, 12, -6, 9, '#1a1418'); K.PL(x, [[0, 6], [-5, 14], [5, 14]], '#1a1418'); for (let i = 0; i < 3; i++) K.R(x, -12 + i * 10, 26, 3, 10, '#1a1418'); }
  x.restore();
};
MINI.fruit = { title: '水果机', img: 'e_fruit', col: '#ff7ab0', text: '一台还插着电的老虎机。投币口旁边刻着：三个七，带你回家。',
  init(mg) { mg.reels = [0, 1, 2].map(() => ({ pos: Math.floor(rnd() * 12), f: 0, s0: 0 })); mg.pulls = 0; mg.max = 5; mg.lever = 0; mg.win = 0; mg.flash = 0; },
  pull(mg) {
    if (!this.miniPay(mg.pay)) return; mg.pulls++; mg.win = 0;
    let res = [0, 1, 2].map(() => M.wpick([0, 1, 2, 3, 4, 5], i => SW8[i])); if (mg.luck && rnd() < mg.luck) res[2] = res[1] = res[0];
    mg.res = res; mg.reels.forEach((r, i) => { const js = STRIP.map((s, j) => s === res[i] ? j : -1).filter(j => j >= 0), j = M.pick(js); r.s0 = r.pos; let f = Math.floor(r.pos) + 24 + i * 8; while (((f % 12) + 12) % 12 !== j) f++; r.f = f; r.d = 1.1 + i * 0.45; });
    this.miniSet('spin'); S.lever(); mg.stopped = 0;
  },
  btns(mg) { if (mg.phase !== 'idle') return []; const over = mg.pulls >= mg.max; return [{ t: '拉杆', sub: mg.pay + ' 积分 · 剩 ' + (mg.max - mg.pulls) + ' 次', gold: !over, dis: over || this.run.wallet < mg.pay, why: over ? '机器吐出一张「今日已满」' : '积分不够', fn: () => MINI.fruit.pull.call(this, mg) }, { t: '离开', leave: 1, gold: over, fn: () => this.miniFinish(mg.total > 0 ? '机器吐了 ' + M.fmt(mg.total) + ' 积分给你。' : '机器吞掉了你的硬币，发出满足的嗡嗡声。', mg.total > 0 ? '#ffcc33' : '#8d8496') }]; },
  tick(mg, dt) {
    mg.lever = mg.phase === 'spin' ? Math.max(0, 1 - mg.pt * 3) : 0; mg.flash = Math.max(0, mg.flash - dt);
    if (mg.phase !== 'spin') return;
    mg.reels.forEach((r, i) => { const p = cl(mg.pt / r.d, 0, 1); r.pos = r.s0 + (r.f - r.s0) * (p < 1 ? eo(p) + Math.sin(p * Math.PI) * 0.02 : 1); if (p >= 1 && mg.stopped <= i) { mg.stopped = i + 1; S.reelStop(); this.fx.kick(3); } });
    if (mg.stopped >= 3 && mg.pt > 2.3) {
      const r = mg.res, c = (k) => r.filter(v => v === k).length, same = r[0] === r[1] && r[1] === r[2], P = mg.pay; let v = 0, bp = false, text = '';
      if (same && r[0] === 4) { v = P * 25; bp = true; text = '777！大奖！'; } else if (same && r[0] === 3) { v = P * 10; text = '三个 BAR ×10'; } else if (same && r[0] === 2) { v = P * 6; text = '三个铃铛 ×6'; } else if (same && r[0] < 2) { v = P * 4; text = '三连水果 ×4'; } else if (same && r[0] === 5) { this.heroHurt(0.15); text = '三个骷髅……'; S.lose(); } else if (c(0) >= 2) { v = P * 2; text = '两颗樱桃 ×2'; } else if (c(5) === 2) { this.heroHurt(0.06); text = '两个骷髅，机器电了你一下'; } else text = '没中';
      if (v) { mg.total = (mg.total || 0) - 0 + v; this.award([{ k: 'wallet', v }].concat(bp ? [K.bp()] : []), { x: CX, y: SY + 320 }); mg.flash = 1.2; if (bp) { this.fx.confetti(120); S.fanfare(); } else S.up(2); }
      this.miniSay(text, v ? '#ffcc33' : same && r[0] === 5 ? '#ff5a4a' : '#8d8496', bp); this.miniSet('idle');
    }
  },
  draw(x, mg) {
    const t = mg.t, bx = CX - 330, by = SY + 150, bw = 560, bh = 480;
    x.fillStyle = K.RG(x, CX, SY + 350, 50, 700, [[0, '#3a1030'], [1, '#0e0610']]); x.fillRect(SX, SY, SW, SH);
    // pay table
    const PT = [['seven', '×25'], ['bar', '×10'], ['bell', '×6'], ['lemon', '×4'], ['cherry', '2个 ×2'], ['skull', '伤身']]; K.RR(x, SX + 40, SY + 110, 190, 440, 10, 'rgba(0,0,0,0.5)', '#6a3a5a', 2); PT.forEach(([k, s], i) => { K.sym(x, k, SX + 90, SY + 160 + i * 70, 44); K.TX(x, s, SX + 170, SY + 160 + i * 70, 22, k === 'skull' ? '#ff6a5a' : '#ffe08a'); });
    // cabinet
    K.RR(x, bx - 20, by - 60, bw + 40, bh + 80, 30, '#6a0a1a'); K.RR(x, bx - 10, by - 50, bw + 20, bh + 60, 24, K.LG(x, 0, by - 50, 0, by + bh, [[0, '#d0303a'], [1, '#6a0a1a']])); K.bulbs(x, bx, by - 40, bw, bh + 20, t + (mg.flash ? t * 3 : 0), '#ffcc33', 30);
    K.RR(x, bx + 60, by - 30, bw - 120, 60, 12, '#1a0810', '#ffcc33', 3); K.PT(x, 'LUCKY 777', CX - 50, by, 40, mg.flash ? (Math.floor(t * 12) % 2 ? '#fff' : '#ffcc33') : '#ffcc33');
    const wy = by + 110, ww = 150, wh = 250; for (let i = 0; i < 3; i++) { const wx = bx + 40 + i * (ww + 20), r = mg.reels[i]; K.RR(x, wx - 6, wy - 6, ww + 12, wh + 12, 10, '#1a0810'); K.R(x, wx, wy, ww, wh, K.LG(x, 0, wy, 0, wy + wh, [[0, '#888'], [0.2, '#f5f0e8'], [0.8, '#f5f0e8'], [1, '#888']]));
      x.save(); x.beginPath(); x.rect(wx, wy, ww, wh); x.clip(); const fast = mg.phase === 'spin' && mg.pt < r.d - 0.2; const base = Math.floor(r.pos), fr = r.pos - base;
      for (let k = -2; k <= 2; k++) { const s = STRIP[(((base + k) % 12) + 12) % 12], yy = wy + wh / 2 + (k - fr) * 110; if (fast) { x.globalAlpha = 0.55; K.sym(x, SYM[s], wx + ww / 2, yy, 84); K.sym(x, SYM[s], wx + ww / 2, yy - 24, 84); x.globalAlpha = 1; } else K.sym(x, SYM[s], wx + ww / 2, yy, 90); }
      x.fillStyle = K.LG(x, 0, wy, 0, wy + wh, [[0, 'rgba(0,0,0,0.5)'], [0.25, 'rgba(0,0,0,0)'], [0.75, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.5)']]); x.fillRect(wx, wy, ww, wh); x.restore(); }
    K.R(x, bx + 30, wy + wh / 2 - 2, bw - 60, 4, mg.flash ? '#ffcc33' : 'rgba(255,60,60,0.8)');
    K.RR(x, bx + 120, by + bh - 110, bw - 240, 50, 8, '#1a0810', '#caa84a', 2); K.PT(x, '剩余 ' + (mg.max - mg.pulls), CX - 50, by + bh - 85, 28, '#ffe08a');
    // lever
    const lx = bx + bw + 60, ly = by + 260, la = -1.1 + (mg.lever > 0 ? (1 - mg.lever) * 0 + 2.0 * mg.lever : 0); K.RR(x, lx - 18, ly - 20, 36, 90, 8, '#8a8a9a'); x.save(); x.translate(lx, ly); x.rotate(la * 0.6 + (mg.phase === 'spin' ? 1.2 * Math.max(0, 1 - mg.pt * 2) : 0)); K.R(x, -6, -170, 12, 170, '#c8d0dc'); K.CI(x, 0, -176, 28, '#d0202a'); K.CI(x, -8, -184, 9, '#ff9a9a'); x.restore();
    if (mg.flash) K.GL(x, CX - 50, wy + wh / 2, 380, '#ffcc33', mg.flash * 0.5);
  } };

// ═════════════════════ 抓娃娃 · claw machine ═════════════════════
MINI.claw = { title: '抓娃娃机', img: 'e_claw', col: '#ff8ac0', text: '玻璃柜里塞满了玩偶——仔细看，每一只都是会动的部队。',
  init(mg) { const run = this.run, seen = new Set(); mg.prizes = []; for (let i = 0; i < 24 && mg.prizes.length < 6; i++) { const t = M.pickUnitQ(run); if (seen.has(t)) continue; seen.add(t); mg.prizes.push({ type: t, q: M.DB[t].q, x: 0, y: 0, rot: (rnd() - 0.5) * 0.5, vy: 0 }); }
    const L = SX + 380, Rr = SX + SW - 120; mg.prizes.forEach((p, i) => { p.x = L + 40 + (i % 3) * ((Rr - L - 80) / 2) + (rnd() - 0.5) * 40 + (i >= 3 ? 70 : 0); p.y = FLOOR - 10 - (i >= 3 ? 70 : 0); });
    mg.tries = 0; mg.max = 3; mg.cx = CX; mg.cy = SY + 130; mg.open = 1; mg.hold = -1; mg.got = []; },
  box: { L: SX + 360, R: SX + SW - 80, T: SY + 110 },
  drop(mg) { if (!this.miniPay(mg.pay)) return; mg.tries++; const dx = mg.cx; let best = -1, bd = 999; mg.prizes.forEach((p, i) => { if (p.gone) return; const d = Math.abs(p.x - dx) + Math.max(0, (FLOOR - p.y) - 60) * 0.3; if (d < bd) { bd = d; best = i; } });
    const p = best >= 0 ? mg.prizes[best] : null; let ch = !p ? 0 : bd < 16 ? 0.85 : bd < 32 ? 0.6 : bd < 50 ? 0.3 : 0; if (p) ch = cl(ch - p.q * 0.08 + mg.luck, 0, 0.95);
    mg.tgt = p && bd < 60 ? best : -1; mg.succ = rnd() < ch; mg.dx = dx; mg.ty = p && bd < 60 ? p.y - 80 : FLOOR - 40; this.miniSet('down'); S.whoosh(0.3); },
  btns(mg) { if (mg.phase !== 'idle') return []; const over = mg.tries >= mg.max; return [{ t: '放爪！', sub: mg.pay + ' 积分 · 剩 ' + (mg.max - mg.tries) + ' 次 · 空格', gold: !over, dis: over || this.run.wallet < mg.pay, why: over ? '机器没电了' : '积分不够', fn: () => MINI.claw.drop.call(this, mg) }, { t: '离开', leave: 1, gold: over, fn: () => this.miniFinish(mg.got.length ? '你抱着 ' + mg.got.join('、') + ' 离开了娃娃机。' : '一个都没抓到。爪子好像是松的。', mg.got.length ? '#ff8ac0' : '#8d8496') }]; },
  tick(mg, dt) {
    const top = SY + 130, B = MINI.claw.box;
    if (mg.phase === 'idle') { mg.cx = (B.L + 60) + (B.R - B.L - 120) * (0.5 + 0.5 * Math.sin(mg.t * 1.6)); mg.cy = top; mg.open = 1; }
    if (mg.phase === 'down') { mg.cx = mg.dx; mg.cy = top + (mg.ty - top) * eio(mg.pt / 0.9); if (mg.pt >= 0.9) { this.miniSet('grab'); S.creak(); } }
    if (mg.phase === 'grab') { mg.open = 1 - cl(mg.pt / 0.35, 0, 1); if (mg.pt >= 0.35) { if (mg.tgt >= 0 && (mg.succ || rnd() < 0.7)) mg.hold = mg.tgt; this.miniSet('up'); } }
    if (mg.phase === 'up') { mg.cy = mg.ty + (top - mg.ty) * eio(mg.pt / 1.0); if (mg.hold >= 0 && !mg.succ && mg.pt > 0.45) { const p = mg.prizes[mg.hold]; p.vy = 0; mg.hold = -1; p.falling = true; S.tone(300, 0.2, 'sine', 0.1, -200); this.miniSay('滑掉了……', '#8d8496'); }
      if (mg.pt >= 1.0) { this.miniSet(mg.hold >= 0 ? 'move' : 'back'); } }
    if (mg.phase === 'move') { mg.cx = mg.dx + (SX + 200 - mg.dx) * eio(mg.pt / 0.8); if (mg.pt >= 0.8) { this.miniSet('release'); mg.open = 1; const p = mg.prizes[mg.hold]; p.falling = true; p.vy = 0; p.toChute = true; mg.hold = -1; } }
    if (mg.phase === 'release' && mg.pt > 0.6) { const p = mg.prizes.find(p => p.toChute && !p.gone); if (p) { p.gone = true; const run = this.run, n = M.DB[p.type].n; if (M.canAdd(run, p.type)) { this.award([{ k: 'unit', type: p.type }], { x: SX + 200, y: FLOOR }); mg.got.push(n); this.miniSay('抓到了 ' + n + '！', M.QUALITY[p.q].c, true); } else { const v = M.nice(mg.P * 5); this.award([{ k: 'wallet', v }], { x: SX + 200, y: FLOOR }); mg.got.push(n + '（队伍满了，换成积分）'); this.miniSay('队伍满了，玩偶换成了 ' + v + ' 积分', '#ffcc33'); } S.fanfare(); this.fx.confetti(50); this.fx.explode(SX + 200, FLOOR - 40, M.QUALITY[p.q].c, 1); } this.miniSet('back'); }
    if (mg.phase === 'back') { mg.cx += ((B.L + 60) - mg.cx) * Math.min(1, dt * 3); mg.open = Math.min(1, mg.open + dt * 3); if (mg.pt > 0.7) this.miniSet('idle'); }
    if (mg.hold >= 0) { const p = mg.prizes[mg.hold]; p.x = mg.cx; p.y = mg.cy + 80; }
    mg.prizes.forEach(p => { if (!p.falling || p.gone) return; p.vy += 1500 * dt; p.y += p.vy * dt; const fl = p.toChute ? FLOOR + 90 : FLOOR - 10; if (p.y >= fl) { p.y = fl; if (Math.abs(p.vy) > 200) { p.vy *= -0.3; S.pop(); } else { p.vy = 0; p.falling = false; } } });
  },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'idle' && mg.tries < mg.max && this.run.wallet >= mg.pay) { MINI.claw.drop.call(this, mg); return true; } },
  draw(x, mg) {
    const t = mg.t, B = MINI.claw.box;
    x.fillStyle = K.RG(x, CX, SY + 300, 40, 800, [[0, '#4a1a4a'], [1, '#12061a']]); x.fillRect(SX, SY, SW, SH);
    K.RR(x, B.L - 30, B.T - 60, B.R - B.L + 60, FLOOR - B.T + 100, 20, '#ff8ac0'); K.RR(x, B.L - 20, B.T - 50, B.R - B.L + 40, FLOOR - B.T + 80, 16, '#2a0a2a');
    x.fillStyle = K.LG(x, 0, B.T, 0, FLOOR, [[0, '#3a1a4a'], [1, '#1a0a24']]); x.fillRect(B.L, B.T, B.R - B.L, FLOOR - B.T);
    for (let i = 0; i < 20; i++) { const px = B.L + (i * 73) % (B.R - B.L), py = B.T + 20 + (i * 47) % (FLOOR - B.T - 60); K.GL(x, px, py, 10, '#ff8ac0', 0.3 + 0.3 * Math.sin(t * 3 + i)); }
    K.bulbs(x, B.L - 26, B.T - 56, B.R - B.L + 52, FLOOR - B.T + 92, t, '#ff8ac0', 34);
    // chute
    K.RR(x, SX + 120, FLOOR - 120, 160, 200, 10, '#1a0a1a', '#ff8ac0', 3); K.R(x, SX + 130, FLOOR - 10, 140, 90, '#000'); K.PT(x, '出口', SX + 200, FLOOR - 90, 30, '#ff8ac0'); K.PL(x, [[SX + 185, FLOOR - 60], [SX + 215, FLOOR - 60], [SX + 200, FLOOR - 36]], '#ffcc33');
    // prizes
    mg.prizes.forEach((p, i) => { if (p.gone) return; const col = M.QUALITY[p.q].c; x.save(); x.translate(p.x, p.y); x.rotate(p.rot + (mg.hold === i ? Math.sin(t * 8) * 0.15 : 0)); K.EL(x, 0, -44, 52, 50, 'rgba(255,255,255,0.08)'); K.SP(x, p.type, 0, 0, 92); K.PL(x, [[-12, -96], [0, -88], [12, -96], [12, -82], [0, -88], [-12, -82]], col); x.restore(); });
    // floor & glass
    K.R(x, B.L, FLOOR, B.R - B.L, 12, '#6a2a5a');
    if (mg.phase === 'idle') { x.globalAlpha = 0.35; K.EL(x, mg.cx, FLOOR, 40, 10, '#ffcc33'); x.globalAlpha = 1; }
    // claw
    K.R(x, B.L, B.T - 14, B.R - B.L, 10, '#8a8a9a'); K.RR(x, mg.cx - 34, B.T - 30, 68, 34, 6, '#c8d0dc', '#4a4a55', 2); K.LN(x, mg.cx, B.T, mg.cx, mg.cy, 3, '#dfe6f0');
    K.RR(x, mg.cx - 22, mg.cy - 6, 44, 26, 6, '#caa84a'); const op = 0.25 + mg.open * 0.55;
    [-1, 0, 1].forEach(s => { x.save(); x.translate(mg.cx + s * 12, mg.cy + 18); x.rotate(s * op + (s === 0 ? 0 : 0)); x.strokeStyle = '#dfe6f0'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, 0); x.lineTo(s * 16, 34); x.lineTo(s * 6 - s * op * 10, 58); x.stroke(); x.restore(); });
    x.fillStyle = 'rgba(255,255,255,0.06)'; x.beginPath(); x.moveTo(B.L + 40, B.T); x.lineTo(B.L + 120, B.T); x.lineTo(B.L + 20, FLOOR); x.lineTo(B.L - 20 + 20, FLOOR); x.fill();
    for (let i = 0; i < mg.max; i++) K.CI(x, SX + 170 + i * 30, FLOOR - 150, 10, i < mg.max - mg.tries ? '#ffcc33' : '#3a2a3a');
  } };
})();

;
