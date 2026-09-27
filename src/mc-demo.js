// ==== mc-demo.js ====
(function () {
// Every help card plays its own short animation of how the thing is used (user ruling 2026-09-27: 「说明页面中的每个说明，都要配一段
// 单独的动画，表明应该怎么操作，这样一目了然，不用玩家理解复杂文字，对应功能更新后，说明和动画也要更新」). The 玩法说明 page lists
// the cards on the left and plays the chosen one on a stage on the right; the new-player guide (mc-tutor.js) plays the same
// animations in the middle of the screen. tools/designcheck.js fails when a card on the page has no animation.
// A demo is { bg, len, draw(k, t) }: t runs 0 → len and loops; k is the kit below (stage 800×450, drawn at 2×). The pointer is
// the platform's own (M.byInput): an arrow for mouse and pad, a fingertip on phones — and 「悬浮」 is a long-press there.
const M = window.MC, DB = M.DB, U = M.UI, P = M.PJ.PAL;
const W = 800, H = 450, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const eo = (p) => 1 - Math.pow(1 - cl(p, 0, 1), 3), eio = (p) => { p = cl(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const eb = (p) => { p = cl(p, 0, 1); const c = 1.7; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const imgC = new Map();
const pic = (key, s) => { const k = key + '|' + (s || 3); if (imgC.has(k)) return imgC.get(k); let c = null; try { c = (M.iconCanvas && M.iconCanvas(key, s || 3)) || null; } catch (e) {} if (!c) try { c = M.spriteCanvas(key, s || 3); } catch (e) { c = null; } if (c && c.height) imgC.set(k, c); return c && c.height ? c : null; };
const touch = () => M.inputMode && M.inputMode(M._g) === 'touch';

// ───────── the kit ─────────
const K = {
  x: null, t: 0,
  seg: (t, a, b) => cl((t - a) / (b - a), 0, 1), eo, eio, eb,
  lerp: (a, b, q) => a + (b - a) * q,
  R(x, y, w, h, c) { const g = this.x; g.fillStyle = U ? U.pal(c) : c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); },
  box(x, y, w, h, fill, ring) { this.R(x + 4, y + 4, w, h, P.ink); this.R(x, y, w, h, fill || P.night); if (ring) { const g = this.x; g.strokeStyle = ring; g.lineWidth = 3; g.strokeRect(Math.round(x) + 1.5, Math.round(y) + 1.5, Math.round(w) - 3, Math.round(h) - 3); } },
  text(s, x, y, size, col, o) { if (U) U.text(this.x, String(s), x, y, size || 22, col || P.cream, Object.assign({ shadow: true, u: 2 }, o || {})); },
  // a picture (icon or sprite) centred at (x, y), fitting s×s
  ic(key, x, y, s, a) { const c = pic(key, 3); if (!c) return; const k = s / Math.max(c.width, c.height), g = this.x; g.save(); if (a != null) g.globalAlpha *= a; g.imageSmoothingEnabled = false; g.drawImage(c, Math.round(x - c.width * k / 2), Math.round(y - c.height * k / 2), Math.round(c.width * k), Math.round(c.height * k)); g.restore(); },
  // a unit (or any sprite) standing with its feet at (x, y), h tall
  unit(key, x, y, h, flip, a) { let c = null; try { c = M.spriteCanvas(key, 4); } catch (e) {} if (!c || !c.height) return; const k = h / c.height, g = this.x; g.save(); if (a != null) g.globalAlpha *= a; g.imageSmoothingEnabled = false; g.translate(Math.round(x), Math.round(y)); if (flip) g.scale(-1, 1); g.drawImage(c, Math.round(-c.width * k / 2), Math.round(-c.height * k), Math.round(c.width * k), Math.round(c.height * k)); g.restore(); },
  // a HUD chip: picture + number
  chip(key, s, x, y, col, sc) { const g = this.x; g.save(); g.translate(x, y); if (sc && sc !== 1) g.scale(sc, sc); const w = 44 + (U ? U.measure(g, String(s), 22) : 40); this.box(-w / 2, -20, w, 40, P.night, col || P.dusk); this.ic(key, -w / 2 + 22, 0, 26); this.text(s, -w / 2 + 40, 0, 22, col || P.cream, { align: 'left' }); g.restore(); },
  btn(s, x, y, w, h, kind, down) { const C = { gold: [P.gold, P.butter, P.amber, P.ink], dark: [P.dusk, P.indigo, P.abyss, P.cream], red: [P.red, P.pink, P.wine, P.cream], teal: [P.teal, P.ice, P.tealDeep, P.ink] }[kind || 'gold'], d = down ? 4 : 0; this.R(x - w / 2 + 3, y - h / 2 + 6, w, h, P.ink); this.R(x - w / 2, y - h / 2 + d, w, h - d, C[0]); this.R(x - w / 2, y - h / 2 + d, w, 4, C[1]); this.R(x - w / 2, y + h / 2 - 6, w, 6, C[2]); this.text(s, x, y + d / 2 - 2, Math.min(28, h * 0.5), C[3], { shadow: C[3] !== P.ink }); },
  key(s, x, y, down) { const w = Math.max(40, (U ? U.measure(this.x, s, 20, true) : 20) + 22), h = 40, d = down ? 5 : 0; this.R(x - w / 2 - 2, y - h / 2 + 4, w + 4, h + 2, P.ink); this.R(x - w / 2, y - h / 2 + d, w, h - d, P.cream); this.R(x - w / 2, y + h / 2 - 8, w, 8, P.lavender); this.text(s, x, y - 3 + d / 2, 20, P.ink, { shadow: false }); },
  bar(x, y, w, h, p, col) { this.R(x, y, w, h, P.ink); this.R(x + 3, y + 3, (w - 6) * cl(p, 0, 1), h - 6, col || P.lime); },
  ring(x, y, r, col, w) { const g = this.x; g.strokeStyle = U ? U.pal(col) : col; g.lineWidth = w || 3; g.beginPath(); g.arc(x, y, Math.max(0, r), 0, 7); g.stroke(); },
  glow(x, y, r, col, a) { const g = this.x; g.save(); g.globalAlpha *= a == null ? 0.4 : a; g.globalCompositeOperation = 'lighter'; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.restore(); },
  ripple(x, y, age) { if (age < 0 || age > 0.5) return; const q = age / 0.5; this.x.save(); this.x.globalAlpha *= 1 - q; this.ring(x, y, 10 + q * 36, P.white, 4); this.x.restore(); },
  // a number rising out of (x, y)
  pop(s, x, y, age, col, size) { if (age < 0 || age > 1.2) return; const q = age / 1.2; this.x.save(); this.x.globalAlpha *= q < 0.8 ? 1 : (1 - q) / 0.2; const k = age < 0.15 ? 1 + 0.6 * (1 - age / 0.15) : 1; this.x.translate(x, y - eo(q) * 40); this.x.scale(k, k); this.text(s, 0, 0, size || 28, col || P.gold, { outline: true }); this.x.restore(); },
  // the tooltip a hover (or long-press) brings up
  tip(x, y, title, line, col) { const g = this.x, w = Math.max(U ? U.measure(g, title, 24) : 100, line ? (U ? U.measure(g, line, 18) : 100) : 0) + 36, h = line ? 74 : 46, X = cl(x - w / 2, 8, W - w - 8), Y = cl(y, 8, H - h - 8); this.box(X, Y, w, h, '#1a1640', col || P.gold); this.R(X, Y, w, 4, col || P.gold); this.text(title, X + 18, Y + 24, 24, col || P.gold, { align: 'left' }); if (line) this.text(line, X + 18, Y + 54, 18, P.lavender, { align: 'left' }); },
  arrow(x, y, dir, t) { const b = Math.sin(t * 8) * 6, g = this.x; g.save(); g.translate(x + (dir === 'left' ? b : dir === 'right' ? -b : 0), y + (dir === 'up' ? b : dir === 'down' ? -b : 0)); g.rotate({ down: 0, up: Math.PI, left: Math.PI / 2, right: -Math.PI / 2 }[dir || 'down']); g.fillStyle = U.pal(P.gold); g.beginPath(); g.moveTo(-14, -18); g.lineTo(14, -18); g.lineTo(14, -2); g.lineTo(24, -2); g.lineTo(0, 22); g.lineTo(-24, -2); g.lineTo(-14, -2); g.closePath(); g.fill(); g.strokeStyle = U.pal(P.ink); g.lineWidth = 3; g.stroke(); g.restore(); },
  // the pointer: an arrow for mouse / pad, a fingertip on a phone; down = pressed, hold (0…1) = a long-press filling up
  cursor(x, y, down, hold) {
    const g = this.x; g.save(); g.translate(Math.round(x), Math.round(y));
    if (touch()) { if (hold > 0) { g.strokeStyle = U.pal(P.gold); g.lineWidth = 5; g.beginPath(); g.arc(0, 0, 30, -Math.PI / 2, -Math.PI / 2 + hold * Math.PI * 2); g.stroke(); } g.fillStyle = 'rgba(255,240,220,' + (down ? 0.85 : 0.6) + ')'; g.beginPath(); g.arc(0, 0, down ? 18 : 22, 0, 7); g.fill(); g.strokeStyle = U.pal(P.ink); g.lineWidth = 3; g.stroke(); }
    else { const s = down ? 0.9 : 1; g.scale(s, s); g.fillStyle = U.pal(P.white); g.strokeStyle = U.pal(P.ink); g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.lineTo(0, 30); g.lineTo(8, 23); g.lineTo(14, 36); g.lineTo(20, 33); g.lineTo(14, 21); g.lineTo(24, 21); g.closePath(); g.fill(); g.stroke(); }
    g.restore();
  },
  // walk the pointer through keyframes [[t, x, y, down?], …] (eased between); returns its state
  move(t, keys) { let a = keys[0]; for (let i = 1; i < keys.length; i++) { const b = keys[i]; if (t <= b[0]) { const q = eio((t - a[0]) / Math.max(0.001, b[0] - a[0])); return { x: a[1] + (b[1] - a[1]) * q, y: a[2] + (b[2] - a[2]) * q, down: !!a[3] && t - a[0] < 0.18 }; } a = b; } return { x: a[1], y: a[2], down: !!a[3] && t - a[0] < 0.18 }; },
  // the usual: pointer comes in, rests on (x, y) — a click at tc (null: none), a hover / long-press from th on
  point(t, x, y, o) { o = o || {}; const t0 = o.t0 == null ? 0.2 : o.t0, t1 = o.t1 == null ? 1.0 : o.t1, sx = o.sx == null ? W - 60 : o.sx, sy = o.sy == null ? H - 30 : o.sy;
    const q = eio(this.seg(t, t0, t1)), px = sx + (x - sx) * q, py = sy + (y - sy) * q, down = o.tc != null && t >= o.tc && t < o.tc + 0.18, hold = o.th != null && touch() ? this.seg(t, o.th, o.th + 0.45) : 0;
    this.cursor(px + (touch() ? 0 : 0), py, down || (hold > 0 && hold < 1), hold); if (o.tc != null) this.ripple(x, y, t - o.tc); return { x: px, y: py }; },
  hovered(t, th) { return t >= th + (touch() ? 0.45 : 0.1); },
};

// ───────── stages ─────────
// palette colours only (U.pal snaps any other colour to its nearest palette entry)
const BG = {
  plain(k) { const g = k.x, gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, P.night); gr.addColorStop(1, P.abyss); g.fillStyle = gr; g.fillRect(0, 0, W, H); },
  base(k) { k.R(0, 0, W, 110, P.abyss); for (let i = 0; i < 40; i++) k.R((i * 97) % W, (i * 37) % 90, 3, 3, i % 3 ? P.haze : P.butter); k.R(0, 104, W, 6, P.umber); k.R(0, 110, W, H - 110, P.ink); for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) { const x = 20 + c * 130, y = 126 + r * 82; k.R(x, y, 124, 76, (r + c) % 2 ? P.abyss : P.night); k.R(x, y, 124, 3, P.indigo); } },
  map(k) { k.R(0, 0, W, H, P.abyss); for (let i = 0; i < 60; i++) k.R((i * 131) % W, (i * 71) % H, 4, 4, i % 2 ? P.night : P.ink); k.R(0, 200, W, 60, P.umber); k.R(0, 206, W, 4, P.brown); },
  battle(k) { k.R(0, 0, W, 150, P.night); for (let i = 0; i < 8; i++) k.R(i * 110 - 20, 70 + (i % 3) * 14, 90, 80, P.abyss); k.R(0, 150, W, H - 150, P.slate); for (let y = 170; y < H; y += 40) k.R(0, y, W, 2, P.ink); },
  shop(k) { k.R(0, 0, W, H, P.abyss); for (let i = 0; i < 10; i++) k.R(40 + i * 72, 24, 56, 40, i % 2 ? P.red : P.cream); k.R(30, 64, W - 60, 10, P.umber); k.R(30, 330, W - 60, 24, P.umber); k.R(30, 330, W - 60, 4, P.brown); },
  night(k) { k.R(0, 0, W, H, P.ink); for (let i = 0; i < 50; i++) k.R((i * 113) % W, (i * 53) % 260, 3, 3, P.haze); k.R(0, 330, W, H - 330, P.night); },
};

// ───────── building blocks shared by several demos ─────────
const T = {
  // hover / long-press a thing to read it
  hover(draw, x, y, title, line, bg) { return { bg: bg || 'plain', len: 4.2, draw(k, t) { draw(k, t); const p = k.point(t, x, y, { th: 1.0 }); if (k.hovered(t, 1.0) && t < 3.9) k.tip(p.x + 20, p.y + 26, title, line); } }; },
  // click a thing, then something happens (after(k, t - tc))
  click(draw, x, y, after, bg, len) { const tc = 1.1; return { bg: bg || 'plain', len: len || 4, draw(k, t) { draw(k, t, t - tc); k.point(t, x, y, { tc }); if (t >= tc && after) after(k, t - tc); } }; },
};
const heroKey = () => { const h = M.HEROES && Object.values(M.HEROES)[0]; return h ? h.sprite : 'coin'; };
const units3 = ['FootSoldier_T1', 'Ranger_T1', 'MageApprentice_T1'];
const has = (k) => !!(DB && DB[k]);
const U1 = (i) => (has(units3[i]) ? units3[i] : Object.keys(DB).find(k => DB[k].tier === 1 && DB[k].voc) || 'coin');
const QC = () => (M.QUALITY || []).map(q => q.c);

// ───────── the demos, one per card ─────────
const D = M.DEMO = {};
// 基地
D.buffs = T.hover((k) => { k.chip('g_powder', '3', 400, 200, P.violet); }, 400, 200, '待生效', '用掉之前一直在这里', 'base');
D.rest = { bg: 'base', len: 4.6, draw(k, t) { const dusk = k.seg(t, 1.4, 2.6); k.R(0, 0, W, 110, dusk > 0 ? P.ink : P.abyss); k.btn('☾ 结束白天', 560, 60, 240, 70, 'dark', t > 1.2 && t < 1.4); k.text('今晚 ★96 · 驻军 ★133', 560, 104, 16, P.lime); k.point(t, 560, 60, { tc: 1.2 });
  if (dusk > 0) { k.x.save(); k.x.globalAlpha = dusk * 0.6; k.R(0, 110, W, H - 110, P.ink); k.x.restore(); for (let i = 0; i < 4; i++) { const q = k.seg(t, 2.4 + i * 0.25, 3.6 + i * 0.25); k.unit(U1(i % 3) === 'coin' ? 'coin' : 'Ghoul', 820 - q * 380 - i * 40, 330, 70, true, q > 0 ? 1 : 0); } if (t > 2.6) k.text('混沌来袭！', 400, 250, 44, P.red, { outline: true }); } } };
D.dayev = T.hover((k, t) => { for (let i = 0; i < 6; i++) { const x = 150 + i * 100; k.ring(x, 150, 26, i === 2 ? P.gold : P.dusk, 4); k.text(String(4 + i), x, 150, 20, P.cream); } k.ic('t_clover', 350, 150, 30); }, 350, 150, '日程事件', '到那天就发生', 'base');
D.raid = { bg: 'base', len: 4, draw(k, t) { const sl = k.seg(t, 1.2, 2.2); for (let i = 0; i < 10; i++) { const x = 90 + i * 70 - sl * 70; if (x < 30 || x > 770) continue; const red = (i + 1) % 5 === 0; k.ring(x, 150, 24, i === 1 ? P.gold : red ? P.red : P.dusk, 4); if (red) k.ic('t_sword', x, 150, 26); else k.text(String(i + 4), x, 150, 18, P.cream); } k.text('今天', 160 - sl * 70 + 70 * (sl >= 1 ? 1 : 0) * 0, 190, 18, P.gold); k.text('每 5 天一次混沌来袭', 400, 300, 26, P.cream); } };
D.sup = T.hover((k, t) => { k.chip('sack', '2000', 400, 180, P.gold); }, 400, 180, '物资', '挖掘、建造、打造都花它', 'base');
D.shard = T.hover((k) => { k.chip('shard', '300', 400, 180, P.violet); }, 400, 180, '灵魂碎片', '史诗 / 传说建筑要用', 'base');
D.core = { bg: 'base', len: 4.4, draw(k, t) { for (let i = 0; i < 3; i++) { const gone = i === 2 && t > 1.6, q = k.seg(t, 1.6, 2.2); k.ic('r_heart', 330 + i * 70, 150 - (gone ? q * 40 : 0), 48, gone ? 1 - q : 1); } k.unit(heroKey(), 400, 360, 110, false, t > 2 ? k.seg(t, 2, 2.6) : 0.35); if (t > 2.2) k.pop('救回领袖', 400, 230, t - 2.2, P.lime, 30); } };
D.pros = { bg: 'base', len: 4.4, draw(k, t) { const p = k.seg(t, 0.4, 2.2); k.chip('t_pros', '繁荣 Lv' + (p >= 1 ? 3 : 2), 400, 70, P.gold, p >= 1 && t < 2.6 ? 1.15 : 1); k.bar(250, 110, 300, 18, p, P.gold); const ex = k.seg(t, 2.3, 3.2); k.x.save(); k.x.globalAlpha = ex; k.box(80 - ex * 30, 170 - ex * 20, 640 + ex * 60, 250 + ex * 40, null, P.gold); k.x.restore(); k.text('地块向外扩一圈', 400, 300, 26, P.cream); } };
D.town = { bg: 'base', len: 4, draw(k, t) { const q = k.seg(t, 1, 2); k.R(0, 100 - q * 50, W, 12, P.umber); k.R(350, 100 - q * 60, 100, q * 60, P.wine); k.R(340, 90 - q * 60, 120, 12, P.red); k.box(340, 160, 124, 76, P.slate, P.gold); k.text('地下建一座', 400, 270, 22, P.cream); k.text('地面升一座', 400, 30, 22, P.gold); } };
D.locked = T.hover((k) => { k.R(430, 290, 124, 76, P.ink); k.R(560, 290, 124, 76, P.ink); }, 490, 328, '未解锁', '繁荣度升级后才能挖', 'base');
D.rock = T.click((k, t, a) => { const q = a > 0 ? k.seg(a, 0, 0.8) : 0; k.R(280, 208, 124, 76, q >= 1 ? P.abyss : P.umber); if (q > 0 && q < 1) for (let i = 0; i < 5; i++) k.R(300 + i * 20, 220 + (i % 2) * 30, 14, 4, P.ink); if (a > 0.9) k.text('挖开', 342, 246, 22, P.lime); k.box(410, 208, 124, 76, P.slate, P.dusk); }, 342, 246, (k, a) => { k.pop('-50 物资 · 1 天', 342, 190, a, P.gold, 22); }, 'base');
D.bp = { bg: 'base', len: 4.4, draw(k, t) { k.R(180, 208, 124, 76, P.abyss); const tc = 1.1, open = t > tc + 0.1; k.point(t, 242, 246, { tc }); if (open) { const q = eo(k.seg(t, tc + 0.1, tc + 0.5)); k.x.save(); k.x.globalAlpha = q; k.box(420, 120, 340, 260, P.night, P.gold); ['石墙 ×2', '法师塔', '医院'].forEach((s, i) => { k.ic('g_scroll', 452, 160 + i * 70, 30); k.text(s, 480, 160 + i * 70, 22, P.cream, { align: 'left' }); }); k.x.restore(); } } };
D.heroes = T.click((k) => { k.box(300, 150, 200, 150, P.night, P.gold); k.unit(heroKey(), 360, 280, 110); k.R(460, 160, 14, 14, P.gold); }, 400, 225, (k, a) => { k.x.save(); k.x.globalAlpha = eo(k.seg(a, 0, 0.4)); k.box(520, 100, 250, 260, P.night, P.lime); for (let i = 0; i < 3; i++) k.ic('t_clover', 580 + i * 60, 180, 36); k.text('天赋', 645, 130, 24, P.lime); k.x.restore(); });
D.faith = T.hover((k) => { k.chip('f_faith', '40 / 100', 400, 180, '#ffe6a0'); }, 400, 180, '信仰值', '攒够了守护神升一级', 'base');
D.god = { bg: 'base', len: 4, draw(k, t) { const p = k.seg(t, 0.3, 2.2); k.chip('f_faith', Math.round(40 + p * 60) + ' / 100', 400, 120, '#ffe6a0'); k.bar(250, 160, 300, 18, 0.4 + p * 0.6, '#ffe6a0'); if (t > 2.3) { k.glow(400, 290, 120, '#ffe6a0', 0.5); k.ic('u_star', 400, 290, 60); k.pop('守护神 Lv2', 400, 230, t - 2.3, P.gold, 30); } } };
D.visit = T.click((k) => { k.R(300, 120, 200, 200, P.indigo); k.R(360, 180, 80, 140, P.ink); k.unit(heroKey(), 470, 330, 90, true); }, 400, 250, (k, a) => { k.x.save(); k.x.globalAlpha = eo(k.seg(a, 0, 0.3)); k.box(520, 120, 250, 190, P.night, P.gold); ['一样东西', '一样东西'].forEach((s, i) => k.btn(s, 645, 180 + i * 70, 200, 50, i ? 'dark' : 'gold')); k.x.restore(); }, 'base');
D.bcat = T.hover((k) => { k.box(300, 160, 200, 120, P.slate, P.dusk); k.box(462, 248, 34, 34, P.ink, P.gold); k.ic('f_eng', 479, 265, 24); }, 479, 265, '建筑大类', '九类，看右下角的图标', 'base');
D.wonder = { bg: 'base', len: 4.6, draw(k, t) { const tc = 1.3; [0, 1].forEach(i => { const x = 280 + i * 240; k.box(x - 90, 130, 180, 200, P.night, i === 0 && t > tc ? P.gold : P.dusk); k.ic('t_pros', x, 210, 70); k.text(i ? '奇观 B' : '奇观 A', x, 300, 22, P.cream); }); k.point(t, 280, 230, { tc }); if (t > tc + 0.3) { const q = eo(k.seg(t, tc + 0.3, tc + 1)); k.R(0, 60 - q * 40, W, 8, P.umber); k.R(360, 60 - q * 50, 80, q * 50, P.gold); } } };
D.garrison = { bg: 'base', len: 4.4, draw(k, t) { k.box(40, 20, 420, 70, P.night, P.teal); k.text('驻军', 80, 55, 22, P.teal); for (let i = 0; i < 3; i++) k.unit(U1(i), 150 + i * 60, 84, 50); const q = eo(k.seg(t, 1, 2)); k.unit(U1(1), 400 - q * 70, 300 - q * 216, 90 - q * 40); if (t > 2.4) k.text('夜里守城', 400, 300, 28, P.cream); } };
D.evobld = { bg: 'base', len: 4.4, draw(k, t) { k.box(300, 150, 200, 130, P.slate, '#b86bff'); k.text('进化建筑', 400, 215, 24, '#d8a0ff'); const q = k.seg(t, 1.2, 2.2), qc = QC(); const lv = q >= 1 ? 3 : 2; for (let i = 0; i < 4; i++) { k.R(260 + i * 80, 330, 60, 24, i <= lv ? qc[i + 1] || P.gold : P.dusk); } k.text(q >= 1 ? '上限 → 史诗' : '上限 稀有', 400, 390, 24, q >= 1 ? '#d8a0ff' : P.cream); } };
D.gdiff = T.hover((k) => { for (let i = 0; i < 10; i++) k.ring(130 + i * 60, 180, 20, i === 9 ? P.gold : P.dusk, 4); k.ic('u_star', 670, 180, 28); }, 670, 180, '通关目标', '守过这一夜就通关', 'base');
D.garup = T.click((k) => { k.box(300, 150, 200, 130, P.slate, '#b86bff'); k.unit(U1(0), 400, 260, 80); }, 400, 215, (k, a) => { if (a > 0.1) k.pop('升一档', 400, 150, a - 0.1, '#d8a0ff', 30); k.pop('-碎片', 400, 320, a, P.violet, 20); }, 'base');
// 领袖
D.relic = T.hover((k) => { k.unit(heroKey(), 320, 330, 150); k.box(430, 180, 64, 64, P.night, P.gold); k.ic('r_ring', 462, 212, 44); }, 462, 212, '宝物', '出征失败也不会丢');
D.talent = T.click((k, t, a) => { for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) { const x = 300 + c * 100, y = 340 - r * 100, on = r === 0 && c === 1 && a > 0; k.box(x - 30, y - 30, 60, 60, on ? P.indigo : P.night, on ? P.lime : P.dusk); k.ic('t_clover', x, y, 34, r === 0 ? 1 : 0.35); } }, 400, 340, (k, a) => { k.pop('学会', 400, 290, a, P.lime, 26); });
D.hclass = T.hover((k) => { k.box(300, 130, 200, 180, P.night, P.gold); k.unit(heroKey(), 400, 290, 130); k.box(300, 130, 50, 50, P.ink, P.gold); k.ic('c_nun', 325, 155, 34); }, 325, 155, '职业', '决定被动技能');
D.legion = T.hover((k) => { k.unit(heroKey(), 330, 330, 140); k.chip('t_skill', '被动技能', 520, 200, P.lime); }, 520, 200, '被动技能', '一直生效，随等级变强');
D.lvpick = { bg: 'plain', len: 4.4, draw(k, t) { k.unit(heroKey(), 250, 340, 140); if (t > 0.6) k.pop('Lv 3！', 250, 170, t - 0.6, P.gold, 36); const q = eo(k.seg(t, 1.4, 1.9)); k.x.save(); k.x.globalAlpha = q; k.box(400, 110, 330, 250, P.night, P.lime); k.text('选一个天赋', 565, 150, 24, P.lime); for (let i = 0; i < 3; i++) k.ic('t_clover', 470 + i * 95, 250, 50); k.x.restore(); if (t > 1.9) k.point(t, 565, 250, { t0: 1.9, t1: 2.6, tc: 2.8 }); } };
// 出征
D.portal = { bg: 'night', len: 5, draw(k, t) { const tc = 1.0, open = k.seg(t, tc + 0.1, tc + 0.8); k.R(360, 200, 80, 130, P.indigo); k.glow(400, 265, 80 + open * 40, '#6fd0ff', 0.3 + open * 0.4); for (let i = 0; i < 3; i++) { const q = eb(k.seg(t, 1.8 + i * 0.15, 2.4 + i * 0.15)); k.box(200 + i * 160, 170 - q * 110 + 150, 90, 120, P.slate, i === 1 && t > 3.3 ? P.gold : P.dusk); k.text('世界', 245 + i * 160, 230 - q * 110 + 150, 18, P.cream); } const p = k.move(t, [[0, 700, 420], [tc - 0.1, 400, 265], [tc, 400, 265, 1], [3.0, 400, 265], [3.4, 405, 250, 1], [5, 405, 250]]); k.cursor(p.x, p.y, p.down); k.ripple(400, 265, t - tc); k.ripple(405, 250, t - 3.4); if (t > 3.6) k.text('只带回一支', 400, 400, 26, P.teal); } };
D.danger = T.hover((k) => { k.box(340, 110, 120, 170, P.slate, P.dusk); k.ic('skull', 380, 180, 30); k.text('中', 420, 180, 24, P.gold); }, 400, 180, '难度 中', '越难收获越多', 'night');
D.loot = T.hover((k) => { k.box(340, 110, 120, 170, P.slate, P.dusk); k.ic('sack', 400, 250, 34); }, 400, 250, '世界特产', '这个世界多给的东西', 'night');
D.nodes = { bg: 'map', len: 4.6, draw(k, t) { const nodes = [[160, 230, 'normal'], [400, 150, 'chest'], [400, 310, 'shop']]; k.unit(heroKey(), 160 + k.seg(t, 2.2, 3.4) * 240, 240 - k.seg(t, 2.2, 3.4) * 80, 70); nodes.slice(1).forEach(([x, y, ty], i) => { k.box(x - 60, y + 26, 150, 36, P.night, i ? P.gold : P.gold); k.text(i ? '夜市' : '宝箱', x - 30, y + 44, 18, P.cream); k.ic(i ? 'coin' : 'chest', x + 50, y + 44, 22); k.ic(i ? 'e_market' : 'chest', x, y - 10, 44); }); k.arrow(290, 180, 'right', t); k.point(t, 290, 180, { tc: 1.8 }); } };
D.chest = { bg: 'map', len: 4.4, draw(k, t) { const tc = 1.1; k.ic('chest', 400, 220, 110); for (let i = 0; i < 3; i++) { const q = k.seg(t, tc + 0.2 + i * 0.2, tc + 0.5 + i * 0.2); k.R(330, 190 + i * 25 + q * 80, 140, 6, P.steel); } k.point(t, 400, 220, { tc }); if (t > 2.4) { k.pop('积分 +80', 400, 130, t - 2.4, P.gold); k.pop('图纸', 470, 150, t - 2.6, '#6fd0ff'); } } };
D.whp = { bg: 'map', len: 4.4, draw(k, t) { const hp = t < 1.5 ? 1 : t < 2.5 ? 1 - k.seg(t, 1.5, 2) * 0.5 : 0.5 + k.seg(t, 2.8, 3.6) * 0.4; k.bar(250, 100, 300, 26, hp, hp < 0.35 ? P.red : P.lime); k.unit(heroKey(), 330, 330, 120); if (t > 2.6) { k.ic('e_camp', 520, 300, 70); k.glow(520, 300, 80, '#ffb060', 0.4); k.pop('+40%', 330, 190, t - 2.8, P.lime); } } };
D.wallet = { bg: 'map', len: 4.2, draw(k, t) { const a = t > 1 ? Math.min(1, (t - 1) / 0.4) : 0; k.chip('coin', String(Math.round(120 + a * 44)), 150, 40, P.gold, t > 1.3 && t < 1.6 ? 1.15 : 1); if (t < 1.4) k.ic('coin', 400 - eo(k.seg(t, 0.4, 1.3)) * 250, 250 - eo(k.seg(t, 0.4, 1.3)) * 210, 36); k.text('打赢得到 · 在夜市和奇遇里花', 400, 250, 24, P.cream); if (t > 2.4) k.text('回基地清零', 400, 320, 26, P.red); } };
D.haul = T.hover((k) => { k.chip('sack', '41', 200, 40, P.gold); k.chip('orb', '120', 330, 40, P.lime); k.chip('g_scroll', '1', 450, 40, '#6fd0ff'); k.text('撤离或通关才带得回', 400, 260, 26, P.cream); }, 330, 40, '本次收获', '失败只留一半经验', 'map');
D.rostercap = { bg: 'shop', len: 4.6, draw(k, t) { for (let i = 0; i < 6; i++) { k.box(40 + i * 70, 370, 60, 70, P.night, P.dusk); k.unit(U1(i % 3), 70 + i * 70, 432, 46); } k.text('6 / 6', 470, 405, 24, P.red); [[U1(0), '凑成三合一 · 能买', P.lime], [U1(2), '要替换一支', P.gold]].forEach(([u, s, c], i) => { k.box(250 + i * 250, 80, 180, 220, P.night, c); k.unit(u, 340 + i * 250, 250, 100); k.text(s, 340 + i * 250, 280, 18, c); }); } };
D.chapcap = { bg: 'map', len: 4.4, draw(k, t) { const q = k.seg(t, 1, 2); k.text('序章', 200, 110, 26, P.lavender); k.text('第 1 章', 600, 110, 26, P.gold); for (let i = 0; i < 6; i++) k.unit(U1(i % 3), 90 + i * 40 - q * 60, 250, 60, false, 1 - q); for (let i = 0; i < 6; i++) k.box(470 + (i % 3) * 90, 180 + Math.floor(i / 3) * 90, 70, 70, P.night, P.gold); k.text('最多 6 支', 600, 390, 24, P.gold); } };
D.roster = { bg: 'map', len: 4.4, draw(k, t) { for (let i = 0; i < 3; i++) { k.box(60 + i * 90, 340, 76, 90, P.night, P.dusk); k.unit(U1(i), 98 + i * 90, 420, 70); } const q = eo(k.seg(t, 1, 1.8)); k.unit(U1(0), 400 + q * -40, 300 - q * 60, 80, false, q); if (t > 2) k.text('战斗里自动作战', 460, 200, 26, P.cream); } };
D.minimap = T.hover((k) => { k.box(420, 30, 360, 170, P.night, P.dusk); for (let c = 0; c < 8; c++) for (let r = 0; r < 3; r++) if ((c + r) % 2 || r === 1) k.R(440 + c * 40, 60 + r * 40, 20, 14, c === 7 && r === 1 ? P.red : P.lavender); }, 740, 100, '小地图', '最右边是首领', 'map');
D.tripbuff = T.hover((k) => { k.box(60, 60, 460, 44, P.night, P.teal); k.ic('e_path', 86, 82, 26); k.text('部队攻击 +10% · 奇遇好运 +5%', 110, 82, 20, '#bff7f0', { align: 'left' }); }, 280, 82, '这一趟的加成', '回基地时清空', 'map');
D.mmfold = T.click((k, t, a) => { const f = a > 0 ? eo(k.seg(a, 0, 0.4)) : 0; k.box(420, 30, 360, 170 - f * 120, P.night, P.dusk); k.text('雾中小镇 · 第 3/24 站', 600, 52, 18, P.cream); k.btn(f > 0.5 ? '▼' : '▲', 750, 30, 44, 36, 'dark'); }, 750, 30, null, 'map');
D.wpower = { bg: 'map', len: 4.4, draw(k, t) { k.unit(heroKey(), 220, 300, 110); k.chip('u_star', '380', 220, 160, P.gold); const vs = [[300, P.lime], [420, P.gold], [600, P.red]], i = Math.min(2, Math.floor(t / 1.4)); k.unit(U1(1), 560, 300, 100, true); k.chip('t_sword', String(vs[i][0]), 560, 160, vs[i][1]); k.text(['稳赢', '有风险', '很危险'][i], 560, 360, 26, vs[i][1]); } };
D.gogo = { bg: 'plain', len: 4, draw(k, t) { k.box(300, 110, 200, 260, P.wine, P.gold); const on = t > 1.4; k.R(360, 80, 80, 40, on && Math.floor(t * 8) % 2 ? P.gold : P.dusk); k.text('GOGO', 400, 100, 20, on ? P.ink : P.lavender, { shadow: false }); if (on) k.glow(400, 100, 80, '#ffcf4a', 0.5); k.btn('拉杆', 400, 400, 160, 50, 'gold', t > 1 && t < 1.2); k.point(t, 400, 400, { tc: 1.0 }); if (t > 2) k.text('必中铃铛以上', 400, 240, 24, P.gold); } };
D.chapter = { bg: 'map', len: 4.4, draw(k, t) { ['第 1 章', '第 2 章', '第 3 章'].forEach((s, i) => { const on = i === 0 || (i === 1 && t > 2); k.box(90 + i * 230, 150, 180, 120, on ? P.night : P.abyss, on ? P.gold : P.dusk); k.text(s, 180 + i * 230, 190, 24, on ? P.gold : P.lavender); k.ic('e_skull', 180 + i * 230, 235, 34, on ? 1 : 0.3); }); k.text('一章一章往下打', 400, 340, 24, P.cream); } };
D.waypoint = { bg: 'map', len: 4.4, draw(k, t) { k.ic('e_skull', 300, 220, 70, t < 1.4 ? 1 : 1 - k.seg(t, 1.4, 1.8)); const q = k.seg(t, 1.8, 2.4); k.R(470, 170, 20, 100, P.steel); k.glow(480, 170, 60, '#6fd0ff', q); k.ic('g_gate', 480, 160, 50, q); if (t > 2.6) k.text('下次从这里出发', 400, 350, 24, '#6fd0ff'); } };
D.streak = { bg: 'map', len: 4, draw(k, t) { for (let i = 0; i < 3; i++) if (t > 0.5 + i * 0.9) { k.ic('e_skull', 220 + i * 180, 200, 60, 0.5); k.pop('+15%', 220 + i * 180, 150, t - 0.5 - i * 0.9, P.gold); } k.chip('sack', '×' + (1 + 0.15 * Math.min(3, Math.floor((t - 0.5) / 0.9) + 1)).toFixed(2), 400, 330, P.gold); } };
D.farm = T.click((k) => { for (let i = 0; i < 3; i++) k.box(200 + i * 150, 140, 100, 150, P.slate, i === 2 ? P.lime : P.dusk); k.text('刷图', 550, 180, 20, P.lime); }, 550, 215, (k, a) => { k.pop('专属图纸', 550, 120, a, '#6fd0ff'); }, 'night');
D.dmod = T.hover((k) => { k.box(340, 110, 120, 170, P.slate, P.dusk); k.ic('t_clover', 400, 160, 34); }, 400, 180, '今日修饰', '浓雾 · 血月 · 丰收……', 'night');
D.diff = { bg: 'plain', len: 4, draw(k, t) { ['普通', '困难', '噩梦', '地狱'].forEach((s, i) => { const on = Math.floor(t) % 4 === i; k.box(90 + i * 165, 170, 140, 90, on ? P.indigo : P.night, on ? [P.lime, P.gold, P.pink, P.red][i] : P.dusk); k.text(s, 160 + i * 165, 215, 26, [P.lime, P.gold, P.pink, P.red][i]); }); k.text('越往上敌人越强、收获越好', 400, 330, 24, P.cream); } };
D.shrine = T.click((k) => { k.ic('f_faith', 400, 220, 80); k.glow(400, 220, 90, '#ffe6a0', 0.3); }, 400, 220, (k, a) => { k.pop('信仰 +10', 400, 150, a, '#ffe6a0'); }, 'map');
D.evo = { bg: 'plain', len: 4.8, draw(k, t) { const q = eio(k.seg(t, 0.8, 2)); for (let i = 0; i < 3; i++) { const a = i * 2.094 + q * 6; k.unit(U1(0), 400 + Math.cos(a) * 200 * (1 - q), 290 + Math.sin(a) * 60 * (1 - q), 90, false, 1 - k.seg(t, 1.9, 2.1)); } if (t > 2) { k.glow(400, 240, 160, '#6fd0ff', 0.5 * (1 - k.seg(t, 2, 3))); const nk = DB[U1(0)] && DB[U1(0)].next; k.unit(nk && DB[nk] ? nk : U1(0), 400, 320, 150 * eb(k.seg(t, 2, 2.4))); k.text('3 支 → 1 支', 400, 380, 28, P.gold); } } };
D.pool = T.hover((k) => { for (let r = 0; r < 2; r++) for (let c = 0; c < 5; c++) { k.box(200 + c * 84, 120 + r * 100, 70, 84, P.night, P.dusk); k.unit(U1((c + r) % 3), 235 + c * 84, 196 + r * 100, 60); } }, 319, 162, '部队池', '商店和招募都从这里来', 'map');
// 战斗
D.bmode = { bg: 'battle', len: 4.4, draw(k, t) { const hold = t > 2.2, tt = hold ? t - 2.2 : t; k.text(hold ? '坚守战 · 撑过倒计时' : '普通战 · 消灭所有敌人', 400, 40, 28, P.gold); if (!hold) for (let i = 0; i < 3; i++) k.unit(U1(i), 520 + i * 60, 330, 70, true, 1 - k.seg(tt, 0.6 + i * 0.4, 0.9 + i * 0.4)); else { k.text(String(Math.max(0, 30 - Math.round(tt * 12))), 400, 150, 60, P.cream, { outline: true }); } k.unit(U1(0), 200, 330, 80); } };
D.score = { bg: 'battle', len: 4, draw(k, t) { k.unit(U1(0), 260, 330, 80); const d = k.seg(t, 0.8, 1.2); k.unit(U1(1), 520, 330, 80, true, 1 - d); if (t > 1.2) { const q = eo(k.seg(t, 1.2, 2)); k.ic('coin', 520 - q * 380, 280 - q * 230, 30); k.pop('+12', 520, 240, t - 1.2); } k.chip('t_coin', String(t > 2 ? 52 : 40), 140, 40, P.gold, t > 2 && t < 2.3 ? 1.2 : 1); } };
D.bhero = { bg: 'battle', len: 4.6, draw(k, t) { const out = t > 2.4; k.unit(heroKey(), out ? 200 + k.seg(t, 2.4, 3) * 150 : 80, 330, 120); if (!out) for (let i = 0; i < 3; i++) k.unit(U1(i), 300 + i * 60, 330, 70, false, 1 - k.seg(t, 1 + i * 0.3, 1.3 + i * 0.3)); k.unit(U1(1), 620, 330, 90, true); k.text(out ? '部队全灭，领袖亲自上场' : '领袖在左边指挥', 400, 60, 26, out ? P.red : P.cream); } };
D.trait = { bg: 'battle', len: 4.4, draw(k, t) { k.unit(U1(1), 400, 340, 130); const q = eb(k.seg(t, 0.8, 1.3)); k.ic('e_skull', 400, 330 - q * 170, 44, q > 0 ? 1 : 0); if (t > 2.4 && Math.floor(t * 6) % 2) k.glow(400, 160, 50, '#ffcf4a', 0.6); k.text('卡片上那一句话就是它的本事', 400, 410, 22, P.cream); } };
D.report = { bg: 'plain', len: 4.2, draw(k, t) { k.btn('继续前进', 400, 110, 300, 64, 'gold'); [['输出最高', '#ff8a6a'], ['承伤最高', '#6fd0ff'], ['治疗最多', '#9cff7a']].forEach(([s, c], i) => { const q = eo(k.seg(t, 0.4 + i * 0.3, 0.8 + i * 0.3)); k.x.save(); k.x.globalAlpha = q; k.box(90 + i * 215, 200 + (1 - q) * 30, 190, 80, P.night, c); k.unit(U1(i), 130 + i * 215, 270 + (1 - q) * 30, 60); k.text(s, 205 + i * 215, 225 + (1 - q) * 30, 18, c); k.text(String(300 + i * 120), 205 + i * 215, 256 + (1 - q) * 30, 22, P.cream); k.x.restore(); }); if (t > 1.8) k.text('倒下 1 支 · 下一仗全部归队', 400, 340, 22, P.lime); } };
D.minib = T.hover((k) => { k.unit(U1(1), 400, 340, 170, true); k.text('小首领的名字', 400, 130, 24, P.red); }, 400, 250, '小首领', '名字写在头顶', 'battle');
D.omen = { bg: 'battle', len: 4, draw(k, t) { const q = k.seg(t, 0.4, 2.4); k.ring(420, 320, 90, P.red, 4); k.x.save(); k.x.globalAlpha = 0.35; k.x.fillStyle = U.pal(P.red); k.x.beginPath(); k.x.arc(420, 320, 90 * q, 0, 7); k.x.fill(); k.x.restore(); if (t > 2.4 && t < 2.8) k.glow(420, 320, 140, '#ff5a4a', 0.8); k.unit(U1(0), 250 + k.seg(t, 0.6, 1.6) * -100, 340, 70); k.text('填满就落下，快躲开', 400, 80, 24, P.red); } };
D.elite = T.hover((k) => { k.unit(U1(2), 400, 340, 170, true); k.glow(400, 250, 110, '#ffcf4a', 0.35); }, 400, 250, '精英', '更强，积分更多', 'battle');
D.fboss = { bg: 'battle', len: 4.6, draw(k, t) { k.unit(U1(1), 480, 360, 220, true); const hp = 1 - k.seg(t, 0.4, 2.4) * 0.6; k.bar(200, 60, 400, 24, hp, hp < 0.5 ? P.red : P.pink); if (hp < 0.5) { k.text('第二阶段！', 400, 120, 34, P.red, { outline: true }); k.glow(480, 250, 140, '#ff5a4a', 0.3); } } };
D.fever = { bg: 'battle', len: 4.6, draw(k, t) { const p = k.seg(t, 0.2, 2.2); k.bar(200, 50, 400, 22, p, P.pink); k.text('FEVER', 400, 36, 22, p >= 1 ? P.gold : P.lavender); for (let i = 0; i < 3; i++) k.unit(U1(i), 240 + i * 90, 340, 80); if (t > 2.2 && t < 2.6) { k.R(0, 0, W, H, 'rgba(255,255,255,0.3)'); } if (t > 2.3) { k.text('攻速更快！', 400, 180, 40, P.gold, { outline: true }); for (let i = 0; i < 3; i++) k.glow(240 + i * 90, 300, 50, '#ffcf4a', 0.4); } } };
D.boons = T.hover((k) => { [['t_pros', '建筑'], ['u_star', '奇观'], ['f_faith', '守护神'], ['e_path', '途中']].forEach(([ic, s], i) => { k.box(40, 90 + i * 70, 200, 56, P.night, P.gold); k.ic(ic, 70, 118 + i * 70, 30); k.text(s, 100, 118 + i * 70, 20, P.cream, { align: 'left' }); }); }, 140, 118, '局外加成', '这一仗吃到的加成', 'battle');
// 夜市
D.shop = { bg: 'shop', len: 4.6, draw(k, t) { for (let i = 0; i < 3; i++) { k.box(170 + i * 170, 110, 140, 210, P.night, P.dusk); k.unit(U1(i), 240 + i * 170, 250, 100); k.btn('购买 45', 240 + i * 170, 350, 130, 40, 'gold', false); } k.box(40, 380, 250, 60, P.night, P.dusk); for (let i = 0; i < 3; i++) k.unit(U1(i), 70 + i * 60, 432, 44); const tc = 2.6; k.point(t, 70, 410, { t0: 1.8, t1: 2.5, tc }); if (t > tc) k.pop('半价卖掉 +20', 150, 360, t - tc, P.gold, 22); } };
D.shopnums = T.hover((k) => { [['生命之苗', '生命 460 · 奉献 4%'], ['生命之枝', '生命 1530 · 奉献 4.75%']].forEach(([n, s], i) => { k.box(150 + i * 270, 90, 230, 270, P.night, P.dusk); k.unit('LifeTree_T' + (i + 1), 265 + i * 270, 250, 120); k.text(n, 265 + i * 270, 290, 22, i ? P.lime : P.cream); k.text(s, 265 + i * 270, 330, 16, '#bff7f0'); }); }, 535, 330, '关键数值', '高一档的数字更大', 'shop');
D.shopbuy = { bg: 'shop', len: 4.6, draw(k, t) { const two = touch(), t1 = 1.1, t2 = two ? 2.3 : 99, bought = t > (two ? t2 : t1) + 0.1; k.box(330, 90 - (two && t > t1 && !bought ? 12 : 0), 140, 230, P.night, two && t > t1 ? P.white : P.dusk); k.unit(U1(1), 400, 250 - (two && t > t1 && !bought ? 12 : 0), 100, false, bought ? 0.4 : 1); k.btn(two && t < t1 ? '◉ 45' : '购买 ◉ 45', 400, 350, 170, 44, two && t < t1 ? 'dark' : 'gold', (t > t1 && t < t1 + 0.2) || (t > t2 && t < t2 + 0.2)); if (two) { const p = k.move(t, [[0, 700, 420], [t1 - 0.1, 400, 200], [t1, 400, 200, 1], [t2 - 0.5, 400, 200], [t2 - 0.1, 400, 350], [t2, 400, 350, 1], [5, 400, 350]]); k.cursor(p.x, p.y, p.down); } else k.point(t, 400, 350, { tc: t1 }); if (bought) { k.text('已购', 400, 200, 40, P.red, { outline: true }); } } };
D.gacha = { bg: 'shop', len: 5, draw(k, t) { k.box(520, 60, 220, 330, P.indigo, P.teal); k.text('午夜卡包', 630, 90, 22, P.teal); k.btn('免费抽一包', 630, 340, 180, 50, 'teal', t > 1 && t < 1.2); k.point(t, 630, 340, { tc: 1.0 }); if (t > 1.3) { const q = eo(k.seg(t, 1.3, 2)); k.box(300 - 60, 300 - q * 150, 120, 160, P.night, P.gold); if (t > 2.4) { k.glow(300, 230, 120, '#6fd0ff', 0.5 * (1 - k.seg(t, 2.4, 3.4))); k.unit(U1(2), 300, 290, 110); k.text('稀有！', 300, 110, 30, '#6fd0ff', { outline: true }); } } } };
D.garate = T.hover((k) => { [['45', P.cream], ['30', P.lime], ['18', '#6fd0ff'], ['5.5', '#d8a0ff'], ['1.5', P.gold]].forEach(([s, c], i) => { k.box(190 + i * 86, 180, 70, 60, P.night, c); k.text(s, 225 + i * 86, 210, 22, c); }); }, 397, 210, '出货概率', '每包各品质的百分比', 'shop');
D.gapity = { bg: 'shop', len: 4.4, draw(k, t) { const n = Math.min(4, Math.floor(t / 0.7)); for (let i = 0; i < 4; i++) { k.R(240 + i * 90, 190, 60, 36, i < n ? P.gold : P.dusk); if (i < n) k.glow(270 + i * 90, 208, 40, '#ffcf4a', 0.3); } if (n >= 4) k.text('下一包必出稀有以上', 400, 300, 26, '#6fd0ff'); else k.text('没出稀有就亮一盏', 400, 300, 24, P.cream); } };
D.canevo = { bg: 'shop', len: 4.4, draw(k, t) { const n = t > 2.2 ? 3 : 2; k.box(300, 70, 200, 290, P.night, P.dusk); k.unit(U1(0), 400, 260, 110); for (let i = 0; i < 3; i++) { k.x.save(); k.x.translate(350 + i * 22, 100); k.x.rotate(Math.PI / 4); k.R(-6, -6, 12, 12, i < n ? P.gold : P.dusk); k.x.restore(); } k.text(n >= 3 ? '进化！' : '已有 2/3 · 买下就进化', 400, 330, 20, P.gold); k.point(t, 400, 400, { tc: 2.0, t1: 1.6 }); k.btn('购买 45', 400, 400, 140, 40, 'gold', t > 2 && t < 2.2); } };
D.swap = { bg: 'shop', len: 5, draw(k, t) { for (let i = 0; i < 6; i++) { k.box(40 + i * 70, 370, 60, 70, P.night, i === 2 && t > 2.3 ? P.red : P.dusk); k.unit(U1(i % 3), 70 + i * 70, 432, 46, false, i === 2 && t > 2.8 ? 1 - k.seg(t, 2.8, 3.2) : 1); } k.box(560, 100, 150, 230, P.night, t > 1.0 ? P.white : P.dusk); k.unit(U1(2), 635, 280, 100); const p = k.move(t, [[0, 780, 440], [0.9, 635, 220], [1.0, 635, 220, 1], [2.0, 635, 220], [2.3, 210, 400, 1], [5, 210, 400]]); k.cursor(p.x, p.y, p.down); if (t > 3) k.pop('+22', 210, 330, t - 3, P.gold); } };
// 标签与品质
D.rarity = { bg: 'plain', len: 4.2, draw(k, t) { const q = M.QUALITY || []; q.slice(0, 6).forEach((Q, i) => { const on = Math.floor(t * 1.5) % 6 === i; k.box(40 + i * 125, 170 - (on ? 10 : 0), 110, 110, P.night, Q.c); k.text(Q.n, 95 + i * 125, 225 - (on ? 10 : 0), 24, Q.c); }); k.text('不朽：领袖、精英和首领', 400, 350, 22, '#d4af37'); } };
D.voc = { bg: 'plain', len: 5, draw(k, t) { const vs = Object.keys(M.VOC || {}).slice(0, 8); const i = Math.floor(t / (5 / Math.max(1, vs.length))) % Math.max(1, vs.length), v = vs[i] || ''; vs.forEach((n, j) => { const tg = M.tagIc && M.tagIc('voc', n); k.box(40 + (j % 8) * 92, 90, 80, 80, P.night, j === i ? P.gold : P.dusk); k.text(n, 80 + (j % 8) * 92, 130, 18, tg ? tg.c : P.cream); }); k.text(v + '：' + ((M.VOC && M.VOC[v] && M.VOC[v].d) || ''), 400, 290, 22, P.cream); } };
D.upower = { bg: 'shop', len: 4, draw(k, t) { [[U1(0), 40], [U1(1), 130]].forEach(([u, p], i) => { k.box(180 + i * 250, 110, 190, 230, P.night, P.dusk); k.unit(u, 275 + i * 250, 270, 100 + i * 20); k.chip('u_star', String(p), 275 + i * 250, 300, P.gold); k.btn('购买 ' + p, 275 + i * 250, 380, 150, 40, 'gold'); }); k.text('越贵越强', 400, 92, 24, P.gold); } };
// 混沌来袭
D.defend = { bg: 'night', len: 5, draw(k, t) { k.R(330, 220, 140, 110, P.indigo); k.unit(heroKey(), 400, 220, 60); for (let i = 0; i < 3; i++) k.unit(U1(i), 250 + i * 40, 330, 60); for (let i = 0; i < 4; i++) k.unit('Ghoul', 780 - k.seg(t, 0.5, 3) * 240 + i * 40, 330, 60, true); if (t > 1 && Math.floor(t * 4) % 2) k.R(420, 200, 60, 4, P.gold); k.text('驻军迎敌，领袖在屋顶射箭', 400, 60, 24, P.cream); } };
// 房间 (the final bosses' own buildings)
D.bossbld = T.hover((k) => { k.box(300, 150, 200, 150, P.slate, P.gold); k.unit(U1(1), 400, 280, 110); }, 400, 225, '首领建筑', '图纸只从它的首领身上掉', 'base');

// ───────── the 玩法说明 page: the list on the left, the chosen card's animation on the right ─────────
const G = M.Game.prototype;
const CV = { el: null, t0: performance.now() };
function stageEl() { if (CV.el && CV.el.isConnected) return CV.el; CV.el = document.querySelector('[data-g="demo-cv"]'); return CV.el; }
M.demoDraw = function (cv, id, t) {
  const d = D[id]; if (!cv || !d) return false; const g = cv.getContext('2d'); g.setTransform(cv.width / W, 0, 0, cv.height / H, 0, 0); g.imageSmoothingEnabled = false;
  K.x = g; K.t = t; const tt = t % (d.len || 4);
  try { (BG[d.bg] || BG.plain)(K); d.draw(K, tt); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('demo ' + id + ': ' + e.message); return false; }
  return true;
};
const oTick = G.tick;
G.tick = function () {
  const r = oTick.apply(this, arguments);
  if (this.rulesOpen) { const el = stageEl(); if (el) { if (this._helpSelDrawn !== this.helpSel) { this._helpSelDrawn = this.helpSel; CV.t0 = performance.now(); } M.demoDraw(el, this.helpSel, (performance.now() - CV.t0) / 1000); } }
  return r;
};
// the page's list and the chosen card
const oView = G.view;
G.view = function () {
  const v = oView.call(this);
  if (this.rulesOpen && v.gl) {
    const cats = (v.gl.cats || []).map(ct => { const cs = (M.GUIDE || []).filter(c => c.cat === ct.n); return { n: ct.n, items: ct.items.map((it, i) => Object.assign({}, it, { id: cs[i] && cs[i].id })) }; });
    const all = cats.reduce((a, ct) => a.concat(ct.items), []);
    if (!all.some(it => it.id === this.helpSel)) this.helpSel = all.length ? all[0].id : null;
    const sel = all.find(it => it.id === this.helpSel);
    v.hsel = { t: sel ? sel.t : '', d: sel ? sel.d : '' };
    v.gl2 = cats.map(ct => ({ n: ct.n, items: ct.items.map(it => { const on = it.id === this.helpSel; return { t: it.t, img: it.img, bg: on ? P.indigo : 'transparent', col: on ? '#ffe08a' : '#f4efe0', pick: () => { if (this.helpSel !== it.id) { this.helpSel = it.id; M.Sfx.hover && M.Sfx.hover(); this.bump(); } } }; }) }));
  }
  return v;
};
})();
