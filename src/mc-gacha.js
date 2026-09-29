// ==== mc-gacha.js ====
(function () {
'use strict';
// 午夜卡包 (user ruling 2026-09-27: 「夜市的界面也要重新设计，现在太空了；要把抽卡加进来」, the reveal must beat the reference
// card reveal on every beat, and 「抽卡不能让界面卡」). A card-pack machine in every shop: one pack = one unit from this shop's
// trade, quality by rates with a pity, half the time a kind the army already has. The show: the pack drops into the tray,
// flies up and is torn open; the card waits for a click; the charge (1–6 heartbeats, promotions only when the result is
// higher); a breath in, a freeze, impact frames, the back bursts into shards; the quality's own pixel world springs in; the
// unit steps out of the card and does its skill; click the card for the detail panel, anywhere else to take it.
// Drawn on the fx canvas over three 480×270 pixel layers (1 art px = 4 px); the market behind is the pixel scene of
// mc-pxmarket.js on the shop canvas. Sounds: M.Sfx.ga (mc-audio.js, 午夜卡包).
const M = window.MC, G = M.Game.prototype, DB = M.DB;
if (!M.PXR) return;
const X = M.PXR;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, k) => a + (b - a) * k, rnd = (a, b) => a + Math.random() * (b - a), pick = (a) => a[Math.floor(Math.random() * a.length)];
const eo = (p) => 1 - Math.pow(1 - clamp(p, 0, 1), 3), eio = (p) => { p = clamp(p, 0, 1); return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const eb = (p) => { p = clamp(p, 0, 1); const c = 2.2; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const INK = '#07060f', WHITE = '#ffffff', BUTTER = '#fff3b0', GOLD = '#ffcf4a', AMBER = '#e0781f';
// the reveal's five steps are the unit qualities 普通 … 传说 (神话 only comes from evolving)
const Q = [
  { n: '普通', c: '#c4ccd9', c2: '#8791a6', c3: '#4b5268', lt: '#f4f6fa' },
  { n: '优质', c: '#6fd46a', c2: '#3b9a4a', c3: '#1d4a2a', lt: '#c8f5b0' },
  { n: '稀有', c: '#4f8fff', c2: '#2f5fd0', c3: '#1a2f7a', lt: '#bcd6ff' },
  { n: '史诗', c: '#b86bff', c2: '#7a3ad0', c3: '#3a1a6a', lt: '#e6c8ff' },
  { n: '传说', c: '#ff9a3c', c2: '#e0581f', c3: '#8c2f1a', lt: '#ffe0a0' }];
const RAIN = ['#ff4a5a', '#ff9a3c', '#ffcf4a', '#6fd46a', '#47d6c1', '#4f8fff', '#b86bff'];
const reducedM = () => !!(M.PJ && M.PJ.reduced);
let reduced = false;
const SX = new Proxy({}, { get: (_, k) => (...a) => { try { if (M.Sfx && M.Sfx.ga) M.Sfx.ga(k, a[0], a[1], a[2]); } catch (e) { /* sound never breaks the show */ } } });

// ───────── rules ─────────
M.GA_RATES = [45, 30, 18, 5.5, 1.5];                 // 普通 优质 稀有 史诗 传说 (%)
M.GA_PITY = 4;                                        // this many packs below 稀有 in a row: the next one is 稀有 or better
const LADDER = [60, 90, 135, 200, 300, 450, 680, 1000, 1500];
// the price of the next pack in this shop: the first is free, then 60 and half again each (2026-09-28: 「每到1个夜市，都能获得1次免费抽卡包的机会」;
// it used to be the first pack of a trip)
M.gaPrice = (run) => { if (!run) return 0; if (!run.gaFreeUsed) return 0; const k = M.priceMul ? M.priceMul(run) : 1; return Math.max(5, Math.round(LADDER[Math.min(LADDER.length - 1, run.gaPulls || 0)] * k / 5) * 5); };
{ const GP = M.Game.prototype, oOS = GP.openShop; GP.openShop = function () { const run = this.run; if (run) { run.gaFreeUsed = false; run.gaPulls = 0; } return oOS.apply(this, arguments); }; }
// the shop's trade: the same units its shelves draw from (mc-shops.js)
function tradePool(run) { const S = (M.SHOPS || {})[run.shopKind] || {}, pooled = !!(run.pool && M.unitPool), base = (pooled ? M.unitPool(run) : M.SHOP_POOL || []).filter(k => DB[k] && DB[k].line);
  const p = S.pool ? base.filter(S.pool) : base; return p.length ? p : base; }
const topOk = (run, k) => { const d = DB[k]; if (!d || !d.tier || !run.M || !M.buyCap) return true; return d.tier <= M.buyCap(run.M, k); };
// the result is fixed here, on the press; the show only decides how to hand it over (§7.5.1)
M.gaRoll = function (run) {
  const pool = tradePool(run).filter(k => topOk(run, k)); if (!pool.length) return null;
  const maxQ = Math.max(...pool.map(k => DB[k].q)), need = Math.min(2, maxQ), pity = (run.gaPity || 0) >= M.GA_PITY;
  let q; if (pity) { const w = M.GA_RATES.map((r, i) => (i >= need ? r : 0)); q = M.wpick([0, 1, 2, 3, 4], i => w[i]); }
  else q = M.wpick([0, 1, 2, 3, 4], i => M.GA_RATES[i]);
  while (q > 0 && !pool.some(k => DB[k].q === q)) q--;    // above what this shop can hand out: the best it can
  let cand = pool.filter(k => DB[k].q === q); if (!cand.length) cand = pool;
  // 配对: half the time, a kind the army already has at this quality
  const owned = run.roster.map(u => u.type).filter(t => cand.includes(t)), pair = owned.length && Math.random() < 0.5;
  const k = pair ? pick(owned) : pick(cand);
  run.gaPity = DB[k].q >= need ? 0 : Math.min(M.GA_PITY, (run.gaPity || 0) + 1);
  return k;
};
// what the card shows: the game's own name, vocation, power (= price), one line, art, traits, evolution line
function unitInfo(k) { const d = DB[k], art = M.artOf ? M.artOf(k) : k, V = (M.VOC || {})[d.voc] || {};
  const base = String(k).replace(/_T\d$/, ''), chain = [1, 2, 3, 4, 5, 6].map(i => { const x = DB[base + '_T' + i]; return x ? x.n : ''; });
  const TD = M.TDB || {}, tr = (d.tr || []).map(t => TD[t] ? [TD[t].n || '', (M.traitD ? M.traitD(t) : TD[t].d || '').replace(/。?$/, '。')] : null).filter(x => x && x[0]).slice(0, 2);
  const vd = V.d || '', m = /擅长(.+?)(，.*)?。$/.exec(vd) || [];
  return { n: d.n, voc: d.voc, q: Math.min(4, d.q | 0), cost: M.unitPower ? M.unitPower(k) : d.cost, art, line: M.unitLine ? M.unitLine(k) : '', chain, tr, vk: m[1] || '', vr: m[2] || '', vc: V.c || '#c4ccd9' }; }

// ───────── the unit's moves: idle / attack from the character's frames, the skill from its own engine (with its FX) ─────────
const SPR = {};
function sprOf(art) {
  if (SPR[art]) return SPR[art]; const B = M.PCDG, has = B && B.has && B.has(art); const o = { art, has, idle: { n: 29, fw: 24, fh: 30 }, attack: { n: 11 }, skill: { n: 34 }, reel: [] };
  if (has) { try { const b = B.body(art); o.idle.n = b.nIdle || 29; const f = B.bodyFrame(art, 'idle', 0, '', 1); o.idle.fh = Math.round(b.top) || 30; void f; o.idle.fw = b.w || 24; o.attack.n = Math.max(6, Math.round((b.dur[2] || 0.75) * 12)); } catch (e) { o.has = false; } }
  return (SPR[art] = o);
}
// the skill with its effects: the character's own engine, stepped at 12 fps into a reel of frames (built as they are needed)
function skillFrame(o, i) {
  if (!o.has || !window.PCD || !window.PCD.createEngine) return null;
  if (!o.eng) { try { o.eng = window.PCD.createEngine({ game: true }); o.eng.load(o.art); o.eng.enter('skill'); } catch (e) { o.has = false; return null; } }
  while (o.reel.length <= i && o.reel.length < 40) { o.eng.step(1 / 12); const fb = o.eng.render(), W = o.eng.W, H = o.eng.H, lut = o.eng.lut, c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d'), im = cx.createImageData(W, H), px = new Uint32Array(im.data.buffer); for (let p = 0; p < W * H; p++) if (fb[p] !== 255) px[p] = lut[fb[p]]; cx.putImageData(im, 0, 0); c._ax = o.eng.HX; c._ay = o.eng.HY; o.reel.push(c); }
  return o.reel[Math.min(i, o.reel.length - 1)];
}
function drawSpr(ctx, art, anim, fi, x, y, sc, alpha) {
  const o = sprOf(art); if (!o.has) { const c = M.spriteCanvas && M.spriteCanvas(art, 1); if (c) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(c, Math.round(x - c.width * sc / 2), Math.round(y - c.height * sc), c.width * sc, c.height * sc); ctx.restore(); } return; }
  let c, ax, ay;
  if (anim === 'skill') { c = skillFrame(o, fi); if (!c) return; ax = c._ax; ay = c._ay; }
  else { const n = anim === 'attack' ? o.attack.n : o.idle.n; c = M.PCDG.bodyFrame(art, anim === 'attack' ? 'attack' : 'idle', ((fi % n) + n) % n, '', 1); ax = c.cx; ay = c.footY; }
  ctx.save(); ctx.imageSmoothingEnabled = false; if (alpha != null) ctx.globalAlpha *= alpha; ctx.drawImage(c, Math.round(x - ax * sc), Math.round(y - ay * sc), c.width * sc, c.height * sc); ctx.restore();
}

// ───────── fx: everything is drawn on three 480×270 pixel layers (1 art px = 4 px) and blitted crisp ─────────
// PB glow behind the card (additive), PS solid things (shards, coins, confetti), PF glow in front (additive).
// Particles walk a colour ramp over their life (white → light → colour → dark), like the pixel rooms' particles.
function cv(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); g.imageSmoothingEnabled = false; return [c, g]; }
const [PB, pb] = cv(480, 270), [PS, ps] = cv(480, 270), [PF, pf] = cv(480, 270);
const P = [], RINGS = [], FLY = [], TXT = [], BURSTS = [], LINES = [], BOLTS = [], SHARDS = [], PILLARS = [];
let flashA = 0, flashC = WHITE, shake = 0;
const rampOf = (c) => { const q = Q.find(x => x.c === c || x.lt === c); if (q) return [WHITE, q.lt, q.c, q.c2, q.c3]; if (c === GOLD || c === BUTTER) return [WHITE, BUTTER, GOLD, AMBER, '#8c4a1a']; return [WHITE, c, c]; };
function part(o) { if (P.length > 1600) P.splice(0, 200); const p = Object.assign({ t: 0, life: 0.6, s: 8, g: 0, drag: 0.9, k: 'sq', vx: 0, vy: 0, lay: 'f' }, o); if (!p.ramp) p.ramp = p.c ? rampOf(p.c) : [WHITE]; P.push(p); return p; }
function burst(x, y, n, cols, sp0, sp1, o) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), s = rnd(sp0, sp1); part(Object.assign({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, c: pick(cols), s: pick([4, 4, 8, 8, 12]), life: rnd(0.35, 0.8), k: s > 500 ? 'streak' : 'sq' }, o || {})); } }
function ring(x, y, r1, c, life, w, delay, o) { RINGS.push(Object.assign({ x, y, r1, c, ramp: rampOf(c), life: life || 0.45, w: w || 8, t: -(delay || 0) }, o || {})); }
function flash(c, a) { flashC = c; flashA = Math.max(flashA, a); }
function floatText(x, y, s, c, size) { TXT.push({ x, y, s, c, size: size || 40, t: 0, life: 0.9 }); }
function stepFx(dt) {
  for (let i = P.length - 1; i >= 0; i--) { const p = P[i]; p.t += dt; if (p.t >= p.life) { if (p.k === 'shell') fwBurst(p); P.splice(i, 1); continue; }
    const dr = Math.pow(p.drag, dt * 60); p.vx *= dr; p.vy = p.vy * dr + p.g * dt; if (p.wob) p.vx += Math.sin(p.t * 6 + (p.ph || 0)) * p.wob * dt;
    if (p.pull) { const dx = 960 - p.x, dy = 520 - p.y, d = Math.hypot(dx, dy) || 1; p.vx += dx / d * p.pull * dt; p.vy += dy / d * p.pull * dt; }
    p.px = p.x; p.py = p.y; p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.floor && p.y > p.floor && p.vy > 0) { p.y = p.floor; p.vy *= -0.42; p.vx *= 0.7; if (Math.abs(p.vy) < 40) p.vy = 0; }
    if (p.k === 'shell' && Math.random() < 0.9) part({ x: p.x + rnd(-2, 2), y: p.y + 6, vx: rnd(-20, 20), vy: rnd(20, 60), c: GOLD, s: 4, life: 0.35, drag: 0.9 }); }
  [RINGS, TXT, BURSTS, LINES, BOLTS, PILLARS].forEach(L => { for (let i = L.length - 1; i >= 0; i--) { L[i].t += dt; if (L[i].t >= L[i].life) L.splice(i, 1); } });
  for (let i = SHARDS.length - 1; i >= 0; i--) { const s = SHARDS[i]; s.t += dt; s.vy += 520 * dt; s.x += s.vx * dt; s.y += s.vy * dt; s.r += s.vr * dt; if (s.t >= s.life) SHARDS.splice(i, 1); }
  for (let i = FLY.length - 1; i >= 0; i--) { const f = FLY[i]; f.t += dt; if (f.t >= f.life) { FLY.splice(i, 1); if (f.done) f.done(); } }
  flashA *= Math.pow(0.001, dt * 1.6); if (flashA < 0.01) flashA = 0; shake *= Math.pow(0.015, dt); if (shake < 0.5) shake = 0;
}
const px1 = (g, x, y, c) => { g.fillStyle = c; g.fillRect(x, y, 1, 1); };
function pline(g, x0, y0, x1, y1, c) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; g.fillStyle = c;
  for (let n = 0; n < 400; n++) { g.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
function drawP(g, p) {
  const k = p.t / p.life, R = p.ramp, ci = Math.min(R.length - 1, Math.floor(k * R.length)), c = R[ci], c2 = R[Math.min(R.length - 1, ci + 1)], x = Math.round(p.x / 4), y = Math.round(p.y / 4), s = Math.max(1, Math.round(p.s / 4));
  if (x < -20 || y < -20 || x > 500 || y > 290) return;
  switch (p.k) {
    case 'streak': { const v = Math.hypot(p.vx, p.vy) || 1, L = clamp(v * 0.01, 1, 12), ux = p.vx / v, uy = p.vy / v; for (let j = L; j >= 1; j--) px1(g, Math.round(x - ux * j), Math.round(y - uy * j), j > L * 0.5 ? c2 : c); g.fillStyle = k < 0.3 ? WHITE : c; g.fillRect(x, y, s, s); break; }
    case 'star': { const b = k < 0.5 ? 2 : 1; g.fillStyle = c2; g.fillRect(x - b, y, b * 2 + 1, 1); g.fillRect(x, y - b, 1, b * 2 + 1); px1(g, x, y, k < 0.4 ? WHITE : c); break; }
    case 'coin': { const w = Math.max(1, Math.round(Math.abs(Math.cos(p.t * 9 + (p.ph || 0))) * 3)); g.fillStyle = INK; g.fillRect(x - 1 - (w >> 1), y - 2, w + 2, 5); g.fillStyle = GOLD; g.fillRect(x - (w >> 1), y - 1, w, 3); px1(g, x - (w >> 1), y - 1, BUTTER); break; }
    case 'conf': { const f = Math.floor(p.t * 10 + (p.ph || 0)) % 3; g.fillStyle = p.c || c; g.fillRect(x, y, f === 1 ? 1 : 2, f === 1 ? 2 : 1); break; }
    case 'moth': { const up = Math.floor(p.t * 14) % 2; g.fillStyle = c; g.fillRect(x - 3, y - (up ? 2 : 0), 2, 2); g.fillRect(x + 2, y - (up ? 2 : 0), 2, 2); g.fillStyle = WHITE; g.fillRect(x, y - 1, 1, 2); break; }
    case 'meteor': { for (let j = 0; j < 7; j++) px1(g, x + j * (p.vx > 0 ? -1 : 1), y - j, j < 1 ? WHITE : j < 3 ? c : c2); break; }
    case 'shell': { g.fillStyle = WHITE; g.fillRect(x, y, 2, 2); break; }
    case 'bit': { g.fillStyle = p.c; g.fillRect(x, y, s, s); break; }
    case 'lantern': { const w = s + 1, fl = 0.5 + 0.5 * Math.sin(p.t * 9 + (p.ph || 0)); g.fillStyle = '#e0781f'; g.fillRect(x - (w >> 1), y, w, w + 1); g.fillStyle = fl > 0.4 ? '#ffcf4a' : '#fff3b0'; g.fillRect(x - (w >> 1), y + 1, w, w - 1); g.fillStyle = '#fff3b0'; g.fillRect(x, y + (w >> 1), 1, 1); g.fillStyle = '#8c4a1a'; g.fillRect(x - (w >> 1), y - 1, w, 1); break; }
    default: { g.fillStyle = k < 0.2 ? WHITE : c; g.fillRect(x - (s >> 1), y - (s >> 1), s, s); if (p.glow && s >= 1) { g.fillStyle = c2; g.fillRect(x - (s >> 1) - 1, y, 1, 1); g.fillRect(x + s - (s >> 1), y, 1, 1); g.fillRect(x, y - (s >> 1) - 1, 1, 1); g.fillRect(x, y + s - (s >> 1), 1, 1); } }
  }
}
function drawRing(g, r) { if (r.t < 0) return; const k = r.t / r.life, R = r.ramp, c = R[Math.min(R.length - 1, Math.floor(k * R.length))], rad = 3 + eo(k) * r.r1 / 4, w = Math.max(1, Math.round(r.w / 4 * (1 - k * 0.7))), sq = r.ground ? 0.28 : 0.92, cx = r.x / 4, cy = r.y / 4;
  g.fillStyle = c; const n = Math.max(16, Math.floor(rad * 6.283 / Math.max(1, w * 0.8))); for (let i = 0; i < n; i++) { const a = i / n * 6.283; g.fillRect(Math.round(cx + Math.cos(a) * rad - w / 2), Math.round(cy + Math.sin(a) * rad * sq - w / 2), w, w); }
  if (k < 0.35) { g.fillStyle = WHITE; const r2 = rad - w; for (let i = 0; i < n; i += 2) { const a = i / n * 6.283; g.fillRect(Math.round(cx + Math.cos(a) * r2), Math.round(cy + Math.sin(a) * r2 * sq), 1, 1); } } }
function drawStarburst(g, b) { if (b.t < 0) return; const k = b.t / b.life, C = Q[b.q], grow = eo(Math.min(1, b.t / 0.16)), R0 = b.R / 4 * grow * (1 + k * 0.25), n = b.n, fade = k < 0.4 ? 1 : 1 - (k - 0.4) / 0.6;
  const lay = b.rain ? [[1, RAIN[0]], [0.86, RAIN[2]], [0.72, RAIN[4]], [0.55, RAIN[5]], [0.36, WHITE]] : [[1, C.c3], [0.86, C.c2], [0.7, C.c], [0.5, C.lt], [0.3, WHITE]];
  lay.forEach(([m, col], li) => { const mm = m * (li >= 3 ? 1 - k * 0.9 : 1); if (mm <= 0.02) return; g.globalAlpha = fade; g.fillStyle = col; g.beginPath();
    for (let i = 0; i < n * 2; i++) { const a = b.rot + i / (n * 2) * 6.283 + b.t * (li % 2 ? 0.5 : -0.35), r = (i % 2 ? R0 * 0.3 : R0 * (i % 4 === 0 ? 1 : 0.66)) * mm, x = Math.round(b.x / 4 + Math.cos(a) * r), y = Math.round(b.y / 4 + Math.sin(a) * r); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.closePath(); g.fill(); }); g.globalAlpha = 1; }
function drawLines(g, L) { const k = L.t / L.life, C = Q[L.q], f = Math.floor(L.t * 30), cx = L.x / 4, cy = L.y / 4; g.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4;
  for (let i = 0; i < 64; i++) { const h = hash(i * 7 + f * 131), a = i / 64 * 6.283 + (h - 0.5) * 0.08, inner = 60 + hash(i * 3 + f * 17) * 70 + k * 40, w = 1 + Math.floor(hash(i + f) * 3); if (hash(i * 11 + f) < 0.3) continue;
    g.fillStyle = i % 3 ? WHITE : C.lt; g.beginPath(); const ox = Math.cos(a), oy = Math.sin(a), nx = -oy, ny = ox, R_ = 340; g.moveTo(cx + ox * R_ + nx * w * 2, cy + oy * R_ + ny * w * 2); g.lineTo(cx + ox * R_ - nx * w * 2, cy + oy * R_ - ny * w * 2); g.lineTo(cx + ox * inner, cy + oy * inner); g.fill(); }
  g.globalAlpha = 1; }
function drawPillar(g, p) { const k = p.t / p.life, C = Q[p.q], w0 = lerp(44, 8, eo(k)) * Math.min(1, p.t / 0.06), a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3, x = p.x / 4, y = p.y / 4;
  [[1, C.c3], [0.66, C.c], [0.38, C.lt], [0.16, WHITE]].forEach(([m, col]) => { const w = Math.max(1, Math.round(w0 * m)); g.globalAlpha = a; g.fillStyle = p.rain && m < 0.7 && m > 0.2 ? RAIN[Math.floor(p.t * 12) % RAIN.length] : col; g.fillRect(Math.round(x - w / 2), 0, w, Math.round(y)); });
  g.globalAlpha = a * 0.8; g.fillStyle = C.lt; const fw = Math.round(w0 * 1.6); g.fillRect(Math.round(x - fw / 2), Math.round(y - 3), fw, 6); g.globalAlpha = 1; }
function drawBolt(g, b) { const C = Q[b.q]; for (let i = 0; i + 1 < b.pts.length; i++) { const [x0, y0] = b.pts[i], [x1, y1] = b.pts[i + 1]; pline(g, x0 + 1, y0, x1 + 1, y1, C.c); pline(g, x0 - 1, y0, x1 - 1, y1, C.c2); pline(g, x0, y0, x1, y1, WHITE); } }
function bolt(q, x, y, len) { const a = rnd(0, 6.283), pts = [[x / 4, y / 4]]; let px = x / 4, py = y / 4; const n = 6; for (let i = 1; i <= n; i++) { px += Math.cos(a) * len / n + rnd(-4, 4); py += Math.sin(a) * len / n * 0.8 + rnd(-4, 4); pts.push([px, py]); } BOLTS.push({ q, pts, t: 0, life: 0.09 }); }
function drawShard(g, s) { const C = Q[s.q], k = s.t / s.life, sc = 1 + (s.z ? s.z * s.t * 2.4 : 0); if (s.z && sc > 4) return; g.save(); g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; g.translate(Math.round(s.x), Math.round(s.y)); g.rotate(s.r); g.scale(sc, sc);
  g.beginPath(); s.tri.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); g.fillStyle = s.t < 0.08 ? WHITE : s.col; g.fill(); g.lineWidth = 1 / sc; g.strokeStyle = s.t < 0.3 ? C.lt : C.c; g.stroke(); g.restore(); }
function fwBurst(p) { const c = p.cols, n = p.big ? 80 : 52; for (let i = 0; i < n; i++) { const a = i / n * 6.283 + rnd(-0.05, 0.05), s = rnd(0.7, 1) * (p.big ? 560 : 400); part({ x: p.x, y: p.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, g: 280, drag: 0.93, c: pick(c), s: pick([4, 8]), life: rnd(0.9, 1.5), glow: 1, k: 'streak' }); }
  ring(p.x, p.y, p.big ? 220 : 150, pick(c), 0.4, 8); BURSTS.push({ x: p.x, y: p.y, R: p.big ? 120 : 80, q: 4, n: 8, rot: rnd(0, 6), t: 0, life: 0.3, rain: p.big }); SX.fw(p.big); kick(0.6); flash(pick(c), 0.08); }
function firework(x, y, cols, big) { part({ k: 'shell', x, y: 1090, vx: rnd(-40, 40), vy: -Math.sqrt(2 * 900 * (1090 - y)), g: 900, drag: 1, life: Math.sqrt(2 * (1090 - y) / 900), s: 8, cols, big }); SX.launch(); }
const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
function drawText(g, s, x, y, size, fill, o) {
  o = o || {}; g.save(); g.font = size + 'px "Fusion Pixel 12px Proportional SC", sans-serif'; g.textAlign = o.align || 'center'; g.textBaseline = 'middle';
  const w = Math.max(3, Math.round(size / 14)); g.fillStyle = INK; for (const [dx, dy] of [[-w, 0], [w, 0], [0, -w], [0, w], [-w, -w], [w, -w], [-w, w], [w, w], [0, w * 2], [w, w * 2], [-w, w * 2]]) g.fillText(s, x + dx, y + dy);
  if (o.bands) { const gr = g.createLinearGradient(0, y - size / 2, 0, y + size / 2), b = o.bands; b.forEach((c, i) => { gr.addColorStop(i / b.length, c); gr.addColorStop((i + 1) / b.length - 0.001, c); }); g.fillStyle = gr; } else g.fillStyle = fill;
  g.fillText(s, x, y); g.restore();
}
// paint every pixel layer for this frame (glow layers additive inside themselves)
function paintLayers() {
  [pb, ps, pf].forEach(g => { g.globalCompositeOperation = 'source-over'; g.clearRect(0, 0, 480, 270); });
  pb.globalCompositeOperation = 'lighter'; pf.globalCompositeOperation = 'lighter';
  PILLARS.forEach(p => drawPillar(pb, p)); LINES.forEach(L => drawLines(pb, L)); BURSTS.forEach(b => drawStarburst(pb, b));
  if (R.on) drawCircle(pb);
  RINGS.forEach(r => drawRing(r.front ? pf : pb, r));
  SHARDS.forEach(s => drawShard(ps, s));
  P.forEach(p => drawP(p.lay === 's' || p.k === 'coin' || p.k === 'conf' || p.k === 'bit' ? ps : p.lay === 'b' ? pb : pf, p));
  BOLTS.forEach(b => drawBolt(pf, b));
}

const PARTS = P;
// ───────── the card up close: click the revealed card, the unit pops out of it and a panel tells what it is ─────────
// (no life / attack numbers: §7.3 shows a unit as name, vocation, power and what its traits do)
const PX0 = 1010, PY0 = 150, PW = 820, PH = 830, KEY = { x: PX0 + PW - 250, y: PY0 + PH - 104, w: 210, h: 74 };
function openInspect() { R.insp = { t: 0, fired: {}, closing: -1, collect: false, rl: -1 }; SX.whoosh(1.2); }
function closeInspect(collect) { const I = R.insp; if (!I || I.closing >= 0) return; I.closing = I.t; I.collect = collect; SX.back(); }
function onceI(k, at, fn) { const I = R.insp; if (I.t >= at && !I.fired[k]) { I.fired[k] = 1; fn(); } }
function inspectTick(dt) {
  const I = R.insp; if (!I) return; I.t += dt; const q = R.q, C = Q[q], info = R.d;
  onceI('pop', 0.16, () => { SX.charpop(q); flash(WHITE, 0.7); shake = 14; ring(600, 640, 700, C.c, 0.5, 16); ring(600, 860, 800, C.c, 0.6, 14, 0.03, { ground: 1 }); BURSTS.push({ x: 600, y: 640, R: 420, q, n: 10, rot: rnd(0, 6), t: 0, life: 0.4, rain: q >= 4 });
    for (let j = 0; j < 90; j++) { const a = rnd(0, 6.283), s = rnd(300, 1200); part({ k: 'streak', x: 600, y: 640, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.9, g: 200, c: pick([C.c, C.lt]), life: rnd(0.4, 0.9) }); } });
  onceI('panel', 0.26, () => SX.panel());
  const rows = [0.3, 0.38, 0.46].concat(info.tr.map((_, i) => 0.56 + i * 0.1)).concat([0.8]); rows.forEach((at, i) => onceI('row' + i, at, () => { SX.seg(i + 2); burst(PX0 + 50, rowY(i), 10, [C.c, WHITE], 60, 260); }));
  const rollK = clamp((I.t - 0.46) / 0.5, 0, 1); if (rollK > 0 && rollK < 1 && Math.floor(I.t * 30) !== I.rl) { I.rl = Math.floor(I.t * 30); SX.roll(I.rl); }
  for (let i = 0; i <= q; i++) onceI('evo' + i, 0.86 + i * 0.08, () => { SX.seg(6 + i); const x = PX0 + 44 + i * 116 + 50; burst(x, PY0 + 630, 12, [Q[i].c, WHITE], 60, 280); ring(x, PY0 + 630, 110, Q[i].c, 0.3, 6, 0, { front: 1 }); if (i === q) { SX.pip(q); ring(x, PY0 + 630, 200, GOLD, 0.4, 8, 0, { front: 1 }); } });
  // the unit's loop: idle → attack → idle → skill (with its own FX), a hit ring on the strike and on the release
  const L = loopAt(I.t - 0.16); if (L && L.hit && !I['h' + L.n]) { I['h' + L.n] = 1; ring(760, 700, L.big ? 520 : 300, C.c, 0.35, 10); if (L.big) { shake = 10; flash(C.c, 0.18); SX.thunk(); SX.zap(); burst(760, 650, 40, [C.c, C.lt, WHITE], 200, 800); } else SX.thunk(); }
  if (I.closing >= 0 && I.t - I.closing > 0.26) { const col = I.collect; R.insp = null; if (col) R.leaving = R.t; else { ring(960, 520, 420, C.c, 0.35, 10); burst(960, 520, 30, [C.c, WHITE], 100, 500); SX.pip(1); R.cardBack = R.t; } }
}
function rowY(i) { return [PY0 + 70, PY0 + 150, PY0 + 262].concat(R.d.tr.map((_, j) => PY0 + 348 + j * 108))[i] || PY0 + 600; }
// the loop in seconds: idle 1.0 · attack 0.92 · idle 0.5 · skill 2.1
function loopAt(t) { if (t < 0) return null; const S = sprOf(R.d.art), atk = S.attack ? S.attack.n / 12 : 0, sk = S.skill ? S.skill.n / 16 : 0, cyc = 1 + atk + 0.5 + sk, n = Math.floor(t / cyc), u = t - n * cyc;
  if (u < 1) return { st: 'idle', fi: Math.floor(t * 12), n };
  if (u < 1 + atk) { const fi = Math.floor((u - 1) * 12); return { st: 'attack', fi, n: n * 2, hit: fi >= 3 }; }
  if (u < 1.5 + atk) return { st: 'idle', fi: Math.floor(t * 12), n };
  const fi = Math.floor((u - 1.5 - atk) * 16); return { st: 'skill', fi, n: n * 2 + 1, hit: fi >= 17, big: 1 }; }
function inspectK() { const I = R.insp; if (!I) return 0; const open = eo(clamp(I.t / 0.3, 0, 1)); return I.closing >= 0 ? open * (1 - clamp((I.t - I.closing) / 0.24, 0, 1)) : open; }
// glow behind the unit (into the glow layer, art px)
function drawInspectGlow(g) { const I = R.insp; if (!I) return; const k = inspectK(), C = Q[R.q]; if (k <= 0) return;
  [[92, 0.14], [66, 0.24], [42, 0.4]].forEach(([r, a]) => { g.globalAlpha = a * k; g.fillStyle = C.c; g.beginPath(); g.arc(150, 170, r, 0, 7); g.fill(); });
  g.globalAlpha = k; g.fillStyle = C.lt; const n = 90, rot = I.t * 1.2; for (let i = 0; i < n; i++) { if ((i + Math.floor(I.t * 12)) % 5 < 2) continue; const a = i / n * 6.283 + rot; g.fillRect(Math.round(150 + Math.cos(a) * 60), Math.round(215 + Math.sin(a) * 11), 1, 1); }
  g.globalAlpha = 1; }
function drawInspect(g) {
  const I = R.insp; if (!I) return; const q = R.q, C = Q[q], d = R.d, info = R.d, k = inspectK(), cl = I.closing >= 0 ? clamp((I.t - I.closing) / 0.24, 0, 1) : 0;
  // the unit
  const S = sprOf(d.art), sc0 = clamp(Math.floor(380 / S.idle.fh), 5, 10), pop = I.t < 0.16 ? 0 : eb(clamp((I.t - 0.16) / 0.35, 0, 1)) * (1 - cl), L = loopAt(I.t - 0.16) || { st: 'idle', fi: 0 };
  if (pop > 0.02) { const sc = Math.max(1, Math.round(sc0 * pop)); g.save(); g.globalAlpha = 0.5; g.fillStyle = INK; g.fillRect(600 - 120, 856, 240, 14); g.restore(); drawSpr(g, d.art, S[L.st] ? L.st : 'idle', L.fi, lerp(960, 600, eo(pop)), lerp(520, 860, eo(Math.min(1, pop))), sc); if (I.t < 0.3) { g.globalAlpha = 1 - (I.t - 0.16) / 0.14; g.fillStyle = WHITE; g.fillRect(420, 460, 360, 420); g.globalAlpha = 1; } }
  // the panel slides in from the right with an overshoot; rows come in one by one
  const px = lerp(1000, 0, eb(clamp((I.t - 0.18) / 0.32, 0, 1))) + cl * 1000; if (px > 990) return;
  g.save(); g.translate(px, 0);
  g.fillStyle = INK; g.fillRect(PX0 + 12, PY0 + 12, PW + 6, PH + 6); g.fillRect(PX0 - 6, PY0 - 6, PW + 12, PH + 12); g.fillStyle = '#1a1640'; g.fillRect(PX0, PY0, PW, PH);
  g.fillStyle = '#3d3a8c'; g.fillRect(PX0, PY0, PW, 6); g.fillRect(PX0, PY0, 6, PH); g.fillStyle = '#0d0b1e'; g.fillRect(PX0, PY0 + PH - 6, PW, 6); g.fillRect(PX0 + PW - 6, PY0, 6, PH);
  g.fillStyle = C.c; g.fillRect(PX0 + 6, PY0 + 6, PW - 12, 4);
  [[PX0 + 16, PY0 + 16], [PX0 + PW - 28, PY0 + 16], [PX0 + 16, PY0 + PH - 28], [PX0 + PW - 28, PY0 + PH - 28]].forEach(([x, y]) => { g.fillStyle = '#c4ccd9'; g.fillRect(x, y, 12, 12); g.fillStyle = '#4b5268'; g.fillRect(x + 6, y + 6, 6, 6); });
  const row = (i) => { const at = [0.3, 0.38, 0.46].concat(info.tr.map((_, j) => 0.56 + j * 0.1)).concat([0.8])[i], a = clamp((I.t - at) / 0.16, 0, 1); return { a, dx: (1 - eo(a)) * 50, fl: a > 0 && a < 1 ? 1 - a : 0 }; };
  const flashRow = (r, y, h) => { if (r.fl > 0) { g.globalAlpha = r.fl * 0.6; g.fillStyle = WHITE; g.fillRect(PX0 + 20, y - h / 2, PW - 40, h); g.globalAlpha = 1; } };
  // 0 · name and quality chip
  let r = row(0); if (r.a > 0) { g.globalAlpha = r.a; drawText(g, d.n, PX0 + 44 + r.dx, rowY(0), 62, C.c, { align: 'left' }); const cw = 120; g.fillStyle = INK; g.fillRect(PX0 + PW - 44 - cw - 6, rowY(0) - 26, cw + 12, 58); g.fillStyle = C.c; g.fillRect(PX0 + PW - 44 - cw, rowY(0) - 20, cw, 46); g.save(); g.font = '30px "Fusion Pixel 12px Proportional SC"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText(C.n, PX0 + PW - 44 - cw / 2, rowY(0) + 3); g.restore(); g.globalAlpha = 1; flashRow(r, rowY(0), 80); }
  // 1 · vocation and what it is good at
  r = row(1); if (r.a > 0) { g.globalAlpha = r.a; const y = rowY(1), vc = d.vc; g.fillStyle = INK; g.fillRect(PX0 + 42 + r.dx, y - 30, 30, 30); g.fillStyle = vc; g.fillRect(PX0 + 46 + r.dx, y - 26, 22, 22); drawText(g, d.voc, PX0 + 88 + r.dx, y - 14, 34, '#f4efe0', { align: 'left' });
    const kw = d.vk, rest = d.vr; g.save(); g.font = '26px "Fusion Pixel 12px Proportional SC"'; const w0 = g.measureText('该职业擅长').width, w1 = g.measureText(kw).width; g.restore();
    drawText(g, '该职业擅长', PX0 + 44 + r.dx, y + 34, 26, '#c9c3e6', { align: 'left' }); drawText(g, kw, PX0 + 44 + w0 + r.dx, y + 34, 26, vc, { align: 'left' }); drawText(g, rest + '。', PX0 + 44 + w0 + w1 + r.dx, y + 34, 26, '#c9c3e6', { align: 'left' }); g.globalAlpha = 1; flashRow(r, y + 10, 90); }
  // 2 · power, rolling up
  r = row(2); if (r.a > 0) { g.globalAlpha = r.a; const y = rowY(2); drawText(g, '战斗力', PX0 + 44 + r.dx, y, 28, '#a9a3c9', { align: 'left' }); const pw = Math.round(d.cost * eo(clamp((I.t - 0.46) / 0.5, 0, 1)));
    g.save(); g.font = '64px Silkscreen, monospace'; g.textBaseline = 'middle'; g.fillStyle = INK; [[-4, 0], [4, 0], [0, -4], [0, 8], [4, 8]].forEach(([a, b]) => g.fillText(String(pw), PX0 + 170 + r.dx + a, y + b)); g.fillStyle = GOLD; g.fillText(String(pw), PX0 + 170 + r.dx, y); g.restore(); g.globalAlpha = 1; flashRow(r, y, 80); }
  // traits
  info.tr.forEach(([n, ds], j) => { r = row(3 + j); if (r.a <= 0) return; g.globalAlpha = r.a; const y = rowY(3 + j); g.save(); g.translate(PX0 + 58 + r.dx, y); g.rotate(Math.PI / 4); g.fillStyle = INK; g.fillRect(-10, -10, 20, 20); g.fillStyle = C.c; g.fillRect(-6, -6, 12, 12); g.restore();
    drawText(g, n, PX0 + 82 + r.dx, y, 32, C.lt, { align: 'left' }); wrapLines(g, ds, PW - 140, 24).forEach((ln, li) => drawText(g, ln, PX0 + 82 + r.dx, y + 40 + li * 32, 24, '#f4efe0', { align: 'left' })); g.globalAlpha = 1; flashRow(r, y + 20, 96); });
  // the evolution line: six tiers light up to this one
  r = row(3 + info.tr.length); if (r.a > 0) { g.globalAlpha = r.a; drawText(g, '进化', PX0 + 44 + r.dx, PY0 + 548, 28, '#a9a3c9', { align: 'left' });
    for (let i = 0; i < 6; i++) { const x = PX0 + 44 + i * 116 + r.dx, y = PY0 + 580, lit = I.t >= 0.86 + i * 0.08 && i <= q, cur = i === q, Qi = Q[Math.min(4, i)], qc = i === 5 ? '#ff4a5a' : Qi.c, pp = lit ? 1 + 0.2 * Math.max(0, 1 - (I.t - 0.86 - i * 0.08) / 0.2) : 1;
      g.save(); g.translate(x + 50, y + 50); g.scale(pp, pp); g.translate(-x - 50, -y - 50);
      g.fillStyle = INK; g.fillRect(x - 5, y - 5, 110, 110); g.fillStyle = lit ? '#221c52' : '#0d0b1e'; g.fillRect(x, y, 100, 100); g.fillStyle = lit ? qc : '#3d3a8c'; g.fillRect(x, y, 100, 4); g.fillRect(x, y + 96, 100, 4); g.fillRect(x, y, 4, 100); g.fillRect(x + 96, y, 4, 100);
      g.globalAlpha = r.a * (lit ? 1 : 0.35); drawSpr(g, d.art, 'idle', lit && cur ? Math.floor(I.t * 12) : 0, x + 50, y + 90, S.idle.fh > 40 ? 1 : 2); g.globalAlpha = r.a;
      if (cur && lit) { g.fillStyle = GOLD; const b = Math.sin(I.t * 6) > 0 ? 8 : 6; g.fillRect(x - 5 - b, y - 5 - b, 110 + 2 * b, 4); g.fillRect(x - 5 - b, y + 105 + b - 4, 110 + 2 * b, 4); g.fillRect(x - 5 - b, y - 5 - b, 4, 110 + 2 * b); g.fillRect(x + 105 + b - 4, y - 5 - b, 4, 110 + 2 * b); }
      g.restore(); drawText(g, info.chain[i], x + 50, y + 124, 20, lit ? qc : '#6a6394'); }
    g.globalAlpha = 1; }
  // how many of it are already in the party, and the key that takes it
  if (I.t > 1.2) { const a = clamp((I.t - 1.2) / 0.2, 0, 1); g.globalAlpha = a; const n = R.have; drawText(g, n ? '队伍里已有 ' + n + ' 支' + (n === 2 ? ' · 收下就进化' : '') : '队伍里还没有', PX0 + 44, PY0 + PH - 58, 26, n ? GOLD : '#a9a3c9', { align: 'left' });
    const kb = KEY, hov = R.keyHov, yy = kb.y + (hov ? -4 : 0); g.fillStyle = INK; g.fillRect(kb.x - 4, yy - 4, kb.w + 8, kb.h + 16); g.fillStyle = GOLD; g.fillRect(kb.x, yy, kb.w, kb.h); g.fillStyle = BUTTER; g.fillRect(kb.x, yy, kb.w, 6); g.fillStyle = AMBER; g.fillRect(kb.x, yy + kb.h - 9, kb.w, 9);
    g.save(); g.font = '36px "Fusion Pixel 12px Proportional SC"'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = INK; g.fillText('收下', kb.x + kb.w / 2, yy + kb.h / 2 - 2); g.restore(); g.globalAlpha = 1; }
  g.restore();
}
function wrapLines(g, s, maxW, size) { g.save(); g.font = size + 'px "Fusion Pixel 12px Proportional SC"'; const tw = M.trWrap && M.trWrap(g, s, maxW); if (tw) { g.restore(); return tw; } const out = []; let cur = ''; for (const ch of s) { if (g.measureText(cur + ch).width > maxW && cur) { out.push(cur); cur = ch; } else cur += ch; } if (cur) out.push(cur); g.restore(); return out; }

// ───────── the reveal's world: each quality has its own pixel world that slams in behind the card ─────────
// 普通 moonlit meadow · 优质 firefly wood at dusk · 稀有 aurora over snow peaks · 史诗 the star abyss with floating isles ·
// 传说 the golden city above the clouds (and the market's lanterns fly up into it). Four layers (sky, far, mid, near) on
// 480×270 art px, material ramps from the pixel room engine, hard bands; they spring in (sky from above, the ground from
// below), take a parallax with the pointer, bounce on every letter, and a shockwave bends the whole picture.
const WR = MC.PXR.RAMPS, vn = MC.PXR.vnoise;
const c32 = (h) => { const n = parseInt(h.slice(1), 16); return ((255 << 24) | ((n & 255) << 16) | (n & 0xff00) | (n >> 16)) >>> 0; };
const RC = {}; const rc = (m, k) => { const R = WR[m]; k = Math.max(0, Math.min(R.length - 1, Math.round(k))); const key = m + k; return RC[key] || (RC[key] = c32(R[k])); };
const BAYW = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const dth = (x, y) => (BAYW[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
function wLayer() { const c = document.createElement('canvas'); c.width = 480; c.height = 270; const g = c.getContext('2d', { willReadFrequently: true }), im = g.createImageData(480, 270); return { c, g, im, u: new Uint32Array(im.data.buffer) }; }
const WP = (L, x, y, col) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < 480 && y < 270) L.u[y * 480 + x] = col; };
// a tone that rounds with a narrow dither band, so gradients read as hard pixel bands
const tk = (v, x, y) => Math.floor(v + 0.5 + (dth(x, y) - 0.5) * 0.35);
function sky(L, m, t0, t1, y1) { for (let y = 0; y < 270; y++) { const v = t0 + (t1 - t0) * Math.min(1, y / y1); for (let x = 0; x < 480; x++) L.u[y * 480 + x] = rc(m, tk(v, x, y)); } }
function below(L, fn, m, tn, o) { o = o || {}; for (let x = 0; x < 480; x++) { const top = Math.round(fn(x)); for (let y = Math.max(0, top); y < 270; y++) { let v = tn + (o.fall ? -(y - top) * o.fall : 0); if (y - top < (o.rim || 0)) v += o.rimT || 1.5; WP(L, x, y, rc(m, tk(v, x, y))); } } }
function disc(L, cx, cy, r, fn) { for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) { const dx = x + 0.5 - cx, dy = y + 0.5 - cy, d = Math.hypot(dx, dy); if (d <= r) { const c = fn(dx / r, dy / r, d / r, x, y); if (c) WP(L, x, y, c); } } }
function stars(L, n, y1, seed) { const r = MC.PXR.rng(seed); for (let i = 0; i < n; i++) { const x = Math.floor(r() * 480), y = Math.floor(r() * y1), b = r(); WP(L, x, y, rc('linen', 6 + b * 5)); if (b > 0.93) { WP(L, x - 1, y, rc('linen', 6)); WP(L, x + 1, y, rc('linen', 6)); WP(L, x, y - 1, rc('linen', 6)); WP(L, x, y + 1, rc('linen', 6)); } } }
function moon(L, cx, cy, r, m, halo) { [[r + 12, 0.8], [r + 7, 1.6], [r + 3, 2.4]].forEach(([rr, add]) => disc(L, cx, cy, rr, (u, v, d, x, y) => { const i = y * 480 + x; return null; }));
  if (halo) [[r + 13, halo[1]], [r + 8, halo[1] + 0.8], [r + 4, halo[1] + 1.6]].forEach(([rr, tn]) => disc(L, cx, cy, rr, () => rc(halo[0], tn)));
  disc(L, cx, cy, r, (u, v, d, x, y) => { const sh = 0.5 + 0.5 * (-u * 0.5 - v * 0.5 + Math.sqrt(Math.max(0, 1 - d * d)) * 0.7); return rc(m, 5 + sh * 5.5 + (vn(x / 4, y / 4, 3) < 0.33 ? -1.2 : 0)); }); }
function tree(L, x, y, h, lit) { for (let k = 0; k < h * 0.35; k++) { WP(L, x, y - k, rc('wood', 2)); WP(L, x + 1, y - k, rc('wood', 3)); } const cy = y - h * 0.62, r = h * 0.42;
  disc(L, x + 0.5, cy, r, (u, v, d, px, py) => { const sh = -u * 0.6 - v * 0.7, bump = vn(px / 3, py / 3, 7) - 0.5; return rc('leaf', 3.2 + sh * 2 + bump * 1.8 + (lit && u > 0.3 && sh < 0 ? 0 : 0)); }); }
function pine(L, x, y, h, m, tn, snow) { for (let k = 0; k < h; k++) { const hw = Math.round((h - k) * 0.32 + (k % 5 < 2 ? 1 : 0)); for (let dx = -hw; dx <= hw; dx++) WP(L, x + dx, y - k, rc(m, tn + (dx > 0 ? -0.4 : 0.3) + (snow && k % 5 === 4 && dx < 0 ? 5 : 0))); } }
function cloud(L, cx, cy, w, h, top, bot, seed) { for (let y = Math.floor(cy - h); y <= Math.ceil(cy + h); y++) for (let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++) { const u = (x - cx) / w, v = (y - cy) / h, bump = vn(x / 7, y / 5, seed) * 0.6; if (u * u + v * v * 1.6 > 0.55 + bump) continue; WP(L, x, y, v < -0.1 ? top : bot); } }

const WORLDS = [
  // 普通 · 月下草原
  () => { const L = [wLayer(), wLayer(), wLayer(), wLayer()];
    sky(L[0], 'night', 1.2, 4.8, 200); stars(L[0], 90, 150, 11); moon(L[0], 372, 58, 15, 'bone', ['night', 3.2]);
    below(L[1], x => 170 - 16 * Math.sin(x * 0.013) - 8 * Math.sin(x * 0.037 + 1), 'night', 1.6, { rim: 1, rimT: 1.6 });
    below(L[2], x => 198 - 10 * Math.sin(x * 0.02 + 2) - 4 * Math.sin(x * 0.07), 'moss', 2.6, { rim: 1, rimT: 2, fall: 0.02 });
    below(L[3], x => 238 - 4 * Math.sin(x * 0.05) - 2 * Math.sin(x * 0.13), 'leaf', 3.4, { rim: 1, rimT: 1.5, fall: 0.03 });
    for (let x = 0; x < 480; x += 3) { const y = Math.round(238 - 4 * Math.sin(x * 0.05) - 2 * Math.sin(x * 0.13)); WP(L[3], x, y - 1, rc('leaf', 4.5)); WP(L[3], x + 1, y - 2, rc('leaf', 5)); }
    return L; },
  // 优质 · 萤火林（黄昏）
  () => { const L = [wLayer(), wLayer(), wLayer(), wLayer()];
    sky(L[0], 'dusk', 2, 9.5, 190); disc(L[0], 300, 176, 34, (u, v, d) => rc('lamp', 9 + (1 - d) * 2.5)); for (let i = 0; i < 5; i++) cloud(L[0], 60 + i * 95, 60 + (i % 3) * 22, 40, 5, rc('dusk', 8), rc('dusk', 5), i + 3);
    below(L[1], x => 172 - 20 * Math.sin(x * 0.011 + 1) - 9 * Math.sin(x * 0.04), 'leaf', 1.6, { rim: 1, rimT: 3.5 });
    for (let i = 0; i < 16; i++) { const x = 12 + i * 30 + (i % 3) * 7; tree(L[2], x, 214 - (i % 2) * 6, 38 + (i % 4) * 7); }
    below(L[3], x => 236 - 5 * Math.sin(x * 0.045) - 2 * Math.sin(x * 0.15), 'leaf', 3.6, { rim: 1, rimT: 2, fall: 0.03 });
    const r = MC.PXR.rng(5); for (let i = 0; i < 40; i++) { const x = Math.floor(r() * 480), y = 240 + Math.floor(r() * 26); WP(L[3], x, y, rc(r() < 0.5 ? 'candy' : 'linen', 8)); WP(L[3], x, y + 1, rc('leaf', 5)); }
    return L; },
  // 稀有 · 极光雪峰
  () => { const L = [wLayer(), wLayer(), wLayer(), wLayer()];
    sky(L[0], 'night', 0.6, 3.6, 200); stars(L[0], 140, 170, 21); moon(L[0], 92, 56, 18, 'bone', ['night', 3]);
    for (let b = 0; b < 3; b++) for (let x = 0; x < 480; x++) { const y0 = 58 + b * 22 + 14 * Math.sin(x * 0.018 + b * 1.7) + 6 * Math.sin(x * 0.05 + b); const len = 26 + 10 * Math.sin(x * 0.03 + b * 2); for (let k = 0; k < len; k++) { const v = (b === 1 ? 'teal' : 'leaf'), tn = 8.5 - k / len * 6; if (tk(tn, x, Math.round(y0 + k)) < 3) continue; WP(L[0], x, y0 + k, rc(v, tn)); } }
    const peaks = [[40, 96], [120, 70], [205, 104], [290, 66], [380, 92], [460, 78]];
    for (let x = 0; x < 480; x++) { let top = 270; peaks.forEach(([px, py]) => { top = Math.min(top, py + Math.abs(x - px) * 1.05 + 8 * vn(x / 9, px, 2)); }); for (let y = Math.round(top); y < 270; y++) { const snow = y - top < 16 + 6 * vn(x / 6, 1, 3), lit = ((x % 80) + 80) % 80 < 40; WP(L[1], x, y, snow ? rc('ice', 9 - (y - top) * 0.1 + (lit ? 0.5 : -1.5)) : rc('ice', 2.6 + (lit ? 0.6 : 0))); } }
    for (let i = 0; i < 26; i++) pine(L[2], 8 + i * 19 + (i % 3) * 5, 222 + (i % 2) * 4, 26 + (i % 4) * 6, 'night', 1.1, true);
    for (let y = 226; y < 270; y++) for (let x = 0; x < 480; x++) { const refl = Math.abs(x - 92) < 10 - (y - 226) * 0.1 && (y & 1), aur = (y % 5 < 2) && Math.sin(x * 0.02 + y * 0.3) > 0.6; WP(L[3], x, y, refl ? rc('bone', 8) : aur ? rc('teal', 6) : rc('ice', 3.2 + (y - 226) * 0.03 + (dth(x, y) > 0.8 ? 0.5 : 0))); }
    for (let x = 0; x < 480; x++) WP(L[3], x, 226, rc('ice', 8));
    return L; },
  // 史诗 · 星渊浮岛
  () => { const L = [wLayer(), wLayer(), wLayer(), wLayer()];
    for (let y = 0; y < 270; y++) for (let x = 0; x < 480; x++) { const n = vn(x / 40, y / 28, 5) * 0.65 + vn(x / 14, y / 10, 6) * 0.35, sw = Math.sin((x + y * 0.6) * 0.012 + n * 4); let col = rc('magic', tk(1 + n * 3.4 + sw * 0.8, x, y)); if (n > 0.66) col = rc('arcane', tk(2 + (n - 0.66) * 14, x, y)); if (n > 0.8 && sw > 0.4) col = rc('pink', tk(4 + (n - 0.8) * 20, x, y)); L[0].u[y * 480 + x] = col; }
    stars(L[0], 220, 270, 31);
    disc(L[0], 370, 72, 30, (u, v, d, x, y) => rc('lav', 3 + (-u * 0.6 - v * 0.5 + 0.5) * 6 + (Math.sin(v * 9) > 0.6 ? 1 : 0)));
    for (let x = 322; x < 420; x++) { const u = (x - 370) / 50, y = 72 + u * 10; for (let k = -1; k <= 1; k++) if (Math.abs(u) > 0.62 || y + k > 76) WP(L[0], x, Math.round(y + k + u * u * 2), rc('arcane', 8 - Math.abs(k) * 2)); }
    const isle = (Ly, cx, cy, w, h, seed) => { for (let x = -w; x <= w; x++) { const top = cy - 2 - vn((cx + x) / 6, seed, 1) * 3, bot = cy + h * Math.sqrt(Math.max(0, 1 - (x / w) * (x / w))) * (0.8 + vn((cx + x) / 5, seed, 2) * 0.5); for (let y = Math.round(top); y < bot; y++) WP(Ly, cx + x, y, y - top < 2 ? rc('moss', 5) : rc('rock', 6 - (y - top) * 0.25 + (x < 0 ? 0.8 : -0.6))); }
      for (let k = 0; k < 5; k++) { const x = cx - w * 0.6 + k * w * 0.3, hh = 6 + (k * 7) % 13; for (let j = 0; j < hh; j++) { const hw = Math.round((hh - j) * 0.28); for (let dx = -hw; dx <= hw; dx++) WP(Ly, x + dx, cy - 3 - j, rc('arcane', 7 + (dx < 0 ? 2.5 : 0) + j / hh * 2)); } } };
    [[70, 120, 22, 12, 1], [180, 90, 14, 8, 2], [430, 150, 18, 10, 3]].forEach(a => isle(L[1], ...a));
    isle(L[2], 112, 196, 70, 40, 7); for (let y = 200; y < 270; y++) if (y % 2) { WP(L[2], 150, y, rc('arcane', 10 - (y - 200) * 0.08)); WP(L[2], 151, y + 1, rc('teal', 8)); }
    for (const [x0, dir] of [[0, 1], [479, -1]]) for (let k = 0; k < 6; k++) { const bx = x0 + dir * (k * 14 + 6), hh = 30 + (k * 13) % 34; for (let j = 0; j < hh; j++) { const hw = Math.round((hh - j) * 0.22) + 1; for (let dx = -hw; dx <= hw; dx++) WP(L[3], bx + dx, 270 - j, rc('arcane', 4 + (dx * dir < 0 ? 3 : 0) + j / hh * 4)); } }
    return L; },
  // 传说 · 金色天城
  () => { const L = [wLayer(), wLayer(), wLayer(), wLayer()];
    for (let y = 0; y < 270; y++) for (let x = 0; x < 480; x++) { const v = y / 200; let col = v < 0.5 ? rc('dusk', tk(3.6 + v * 8, x, y)) : rc('gold', tk(5.2 + (v - 0.5) * 6, x, y)); L[0].u[y * 480 + x] = col; }
    for (let i = 0; i < 20; i++) { const a = i / 20 * 6.283; for (let r = 50; r < 260; r++) { const x = Math.round(240 + Math.cos(a) * r), y = Math.round(150 + Math.sin(a) * r * 0.8); if (i % 2 === 0 && r < 200) { WP(L[0], x, y, rc('gold', 8 - r / 50)); } } }
    [[58, 'fire', 7], [50, 'lamp', 8.5], [44, 'lamp', 9.5]].forEach(([rr, m, tn]) => disc(L[0], 240, 150, rr, () => rc(m, tn))); disc(L[0], 240, 150, 22, () => rc('lamp', 10.5));
    for (let i = 0; i < 7; i++) cloud(L[1], i * 80 + 20, 176 + (i % 2) * 8, 60, 16, rc('gold', 8.5), rc('dusk', 6.5), 40 + i);
    const px = 330; for (let tier = 0; tier < 4; tier++) { const y = 150 - tier * 17, hw = 36 - tier * 7; for (let k = 0; k < 5; k++) for (let dx = -(hw + 6 - k); dx <= hw + 6 - k; dx++) WP(L[2], px + dx, y - k, rc('crimson', 6 - k * 0.3 + (dx > 0 ? -1 : 0.5))); for (let yy = y; yy < y + 12; yy++) for (let dx = -hw + 4; dx <= hw - 4; dx++) WP(L[2], px + dx, yy, rc('gold', 6.5 + (dx > 0 ? -1.2 : 0.4) + ((dx + 40) % 8 < 3 && yy > y + 3 && yy < y + 9 ? 3.5 : 0))); }
    for (let k = 0; k < 16; k++) WP(L[2], px, 82 - k, rc('gold', 10)); cloud(L[2], px, 168, 70, 12, rc('gold', 8.8), rc('dusk', 7), 77);
    for (let i = 0; i < 6; i++) cloud(L[3], i * 96 + (i % 2) * 30, 252 + (i % 3) * 6, 70, 22, rc('gold', 9.2), rc('dusk', 7.5), 90 + i);
    return L; },
];
const WORLD = { q: -1, L: null, dy: [0, 0, 0, 0], v: [0, 0, 0, 0], t: -1, landed: [0, 0, 0, 0], out: -1, par: 0 };
const WB = (() => { const c = document.createElement('canvas'); c.width = 480; c.height = 270; return { c, g: c.getContext('2d', { willReadFrequently: true }) }; })();
// worlds are built ahead (idle time after load), never at the moment of the reveal
const WCACHE = {}; function worldBuild(q) { if (!WCACHE[q] && WORLDS[q]) { const L = WORLDS[q](); L.forEach(l => l.g.putImageData(l.im, 0, 0)); WCACHE[q] = L; } return WCACHE[q]; }
{ const idle = window.requestIdleCallback || ((f) => setTimeout(f, 60)); let k = 0; const next = () => { if (k > 4) return; worldBuild(k++); idle(next); }; setTimeout(() => idle(next), 1200); }
function worldStart(q) { const L = worldBuild(q); if (!L) return; Object.assign(WORLD, { q, L, dy: [-280, 280, 300, 320], v: [0, 0, 0, 0], t: 0, landed: [0, 0, 0, 0], out: -1 }); }
function worldHit(k) { if (!WORLD.L) return; for (let i = 1; i < 4; i++) WORLD.v[i] += (60 + i * 50) * k; WORLD.v[0] -= 20 * k; }
function worldOut() { if (WORLD.L && WORLD.out < 0) WORLD.out = WORLD.t; }
function worldTick(dt) { if (!WORLD.L) return; WORLD.t += dt; const w = WORLD;
  for (let i = 0; i < 4; i++) { const start = i * 0.07; if (w.t < start) continue; const target = w.out >= 0 ? (i === 0 ? -300 : 320) : 0; w.v[i] += (target - w.dy[i]) * 260 * dt; w.v[i] *= Math.exp(-(w.out >= 0 ? 6 : 11) * dt); w.dy[i] += w.v[i] * dt;
    if (!w.landed[i] && w.out < 0 && Math.abs(w.dy[i]) < 12) { w.landed[i] = 1; SX.world(i); } }
  if (w.out >= 0 && w.t - w.out > 0.6) { w.L = null; w.q = -1; }
  // ambient life of each world
  if (w.out < 0 && w.t > 0.3) { const q = w.q;
    if (q === 1 && Math.random() < dt * 14) part({ x: rnd(0, 1920), y: rnd(700, 1060), vx: rnd(-20, 20), vy: rnd(-90, -30), drag: 0.99, wob: 50, ph: rnd(0, 6), c: pick(['#c0e27a', '#fff3b0']), s: 4, life: rnd(1.5, 3), glow: 1, lay: 'b' });
    if (q === 2 && Math.random() < dt * 3) part({ k: 'star', x: rnd(0, 1920), y: rnd(0, 500), c: '#bff7f0', life: rnd(0.6, 1.2), lay: 'b' });
    if (q === 3 && Math.random() < dt * 4) part({ k: 'meteor', x: rnd(400, 2000), y: rnd(-80, 200), vx: -rnd(500, 800), vy: rnd(400, 700), drag: 1, c: pick(['#b86bff', '#e6c8ff']), life: rnd(0.9, 1.4), lay: 'b' });
    if (q === 4 && Math.random() < dt * 6) skyLantern(rnd(100, 1820), 1100, false); } }
// a sky lantern: a warm paper body drifting up, glowing
function skyLantern(x, y, fromMarket) { part({ k: 'lantern', x, y, vx: rnd(-30, 30), vy: -rnd(90, 170), drag: 1, wob: 20, ph: rnd(0, 6), c: GOLD, s: fromMarket ? 12 : pick([4, 8]), life: rnd(4, 7), lay: 'b' }); }
function aurora(w) { if (w.q !== 2) return; const t = w.t; for (let b = 0; b < 2; b++) for (let x = 0; x < 480; x += 2) { const y = Math.round(w.dy[0] + 60 + b * 26 + 14 * Math.sin(x * 0.018 + b * 1.7 + t * 0.6)); if ((x + Math.floor(t * 20)) % 9 < 3) { WB.g.fillStyle = b ? '#9aeede' : '#c0e27a'; WB.g.globalAlpha = 0.35; WB.g.fillRect(x, y, 2, 10); WB.g.globalAlpha = 1; } } }
let WAVECP = null;
function worldDraw(g, wave) { if (!WORLD.L) return false; const w = WORLD; WB.g.clearRect(0, 0, 480, 270);
  w.L.forEach((l, i) => { WB.g.drawImage(l.c, Math.round(w.par * [0, 2, 4, 7][i]), Math.round(w.dy[i])); if (i === 0) aurora(w); });
  if (false) { const t = w.t; for (let b = 0; b < 2; b++) for (let x = 0; x < 480; x += 2) { const y = Math.round(w.dy[0] + 60 + b * 26 + 14 * Math.sin(x * 0.018 + b * 1.7 + t * 0.6)); if ((x + Math.floor(t * 20)) % 9 < 3) { WB.g.fillStyle = b ? '#9aeede' : '#c0e27a'; WB.g.globalAlpha = 0.35; WB.g.fillRect(x, y, 2, 10); WB.g.globalAlpha = 1; } } }
  if (wave && wave.a > 0.02) { const im = WB.g.getImageData(0, 0, 480, 270), px = new Uint32Array(im.data.buffer), cp = WAVECP && WAVECP.length === px.length ? WAVECP : (WAVECP = new Uint32Array(px.length)); cp.set(px); MC.MARKET.waveRows(px, cp, Object.assign({}, wave, { a: wave.a * 1.15 }), 480, 270); WB.g.putImageData(im, 0, 0); }
  g.imageSmoothingEnabled = false; g.drawImage(WB.c, 0, 0, 1920, 1080); return true; }

// ───────── the card in 3D, still pixel art: every one of its 75 columns is projected with perspective (rotation about
// the vertical axis), drawn 1 art px wide on a 480×270 layer and blitted ×4. A gold edge shows its thickness, the face
// darkens as it turns away and a specular band slides across it; the pointer tilts it. ─────────
const [PC, pcx] = cv(480, 270);
const [FACEB, fbx] = cv(75, 105);
const CAM = { mx: 0, my: 0, tilt: 0, tv: 0 };   // pointer (−1…1) and the card's tilt spring
function card3d(g, face, cx, cy, s, th, o) {
  o = o || {}; const f = 230, c = Math.cos(th), sn = Math.sin(th), back = c < 0, xs = [];
  for (let i = 0; i <= 75; i++) { const u = i - 37.5, z = u * sn * s, k = f / (f + z); xs.push([cx + u * c * s * k, k]); }
  // thickness: the side facing us, a strip of the frame's gold
  const thick = Math.abs(sn) * 3.2 * s; if (thick >= 0.6) { const ei = sn > 0 === !back ? 75 : 0, [ex, ek] = xs[ei], h = 105 * s * ek, w = Math.max(1, Math.round(thick)), x0 = Math.round(ex + ((ex > cx) ? 0 : -w));
    g.fillStyle = '#80500e'; g.fillRect(x0, Math.round(cy - h / 2), w, Math.round(h)); g.fillStyle = '#c48a1e'; g.fillRect(x0, Math.round(cy - h / 2), w, 1); }
  for (let i = 0; i < 75; i++) { const a = xs[i], b = xs[i + 1], x0 = Math.round(Math.min(a[0], b[0])), x1 = Math.round(Math.max(a[0], b[0])), k = (a[1] + b[1]) / 2, h = Math.round(105 * s * k); if (x1 - x0 < 1 && Math.abs(c) > 0.04) { /* sub-pixel column: still draw 1 px */ }
    g.drawImage(face, back ? 74 - i : i, 0, 1, 105, x0, Math.round(cy - h / 2), Math.max(1, x1 - x0), h); }
  // light: darker as it turns away, a specular band that slides with the angle
  g.save(); g.globalCompositeOperation = 'source-atop';
  const dark = (1 - Math.abs(c)) * 0.55; if (dark > 0.02) { g.globalAlpha = dark; g.fillStyle = INK; g.fillRect(cx - 80 * s, cy - 70 * s, 160 * s, 140 * s); }
  const sp = Math.pow(Math.max(0, Math.cos(th * 1 - 0.55)), 10) * 0.55 + (o.shine || 0); if (sp > 0.02) { g.globalAlpha = Math.min(0.8, sp); g.fillStyle = WHITE; const bx = cx + Math.sin(th - 0.55) * 90 * s; g.beginPath(); g.moveTo(bx - 10 * s, cy - 60 * s); g.lineTo(bx + 2 * s, cy - 60 * s); g.lineTo(bx - 12 * s, cy + 60 * s); g.lineTo(bx - 24 * s, cy + 60 * s); g.fill(); }
  if (o.white > 0.02) { g.globalAlpha = Math.min(1, o.white); g.fillStyle = WHITE; g.fillRect(cx - 80 * s, cy - 70 * s, 160 * s, 140 * s); }
  g.restore();
  const minX = Math.min(...xs.map(p => p[0])), maxX = Math.max(...xs.map(p => p[0])); return { x0: minX, x1: maxX, h: 105 * s };
}
// the back with its cracks, redrawn each frame into a face canvas
function backFace() { fbx.clearRect(0, 0, 75, 105); fbx.drawImage(R.back, 0, 0); const n = Math.floor(R.crk * 34); if (n > 0) { const C = Q[R.tier];
    R.cracks.forEach(path => { for (let i = 0; i < Math.min(n, path.length); i++) { const [x, y] = path[i]; fbx.fillStyle = INK; fbx.fillRect(x - 1, y, 3, 1); fbx.fillRect(x, y - 1, 1, 3); } });
    R.cracks.forEach(path => { for (let i = 0; i < Math.min(n, path.length); i++) { const [x, y] = path[i]; fbx.fillStyle = i < n - 6 ? WHITE : C.c; fbx.fillRect(x, y, 1, 1); } });
    if (R.t >= R.P.tail - 0.2) { fbx.fillStyle = WHITE; const s = 9 + Math.round((R.t - R.P.tail + 0.2) * 40); fbx.fillRect(37 - s / 2, 52 - s / 2, s, s); } }
  return FACEB; }
function frontFace(t) { const F = R.front, P = R.P; const [c2, g2] = R.fc || (R.fc = cv(75, 105)); g2.clearRect(0, 0, 75, 105); g2.drawImage(F.c, 0, 0);
  g2.save(); g2.beginPath(); g2.rect(F.W0, F.H0, F.WW, F.WH - 7); g2.clip(); const inLeap = P.leap > 0 && t > P.leap && t < P.stats; if (!inLeap) { const sp = sprOf(R.d.art).idle, k2 = sp.fh <= 38 && sp.fw <= 31 ? 2 : 1; drawSpr(g2, R.d.art, 'idle', Math.floor(t * 12), 37, F.H0 + F.WH - 9, k2); } g2.restore();
  const sh = ((t * 0.45) % 1.6) - 0.3; if (sh > 0 && sh < 1) { g2.save(); g2.globalAlpha = 0.5; const sx = -10 + sh * 100; for (let y = 0; y < 105; y++) { g2.fillStyle = R.q >= 4 ? RAIN[Math.floor(y / 6) % RAIN.length] : WHITE; g2.fillRect(Math.round(sx - y * 0.4), y, 3, 1); } g2.restore(); }
  return c2; }

// ───────── the draw ─────────
// the result is fixed on the press (rates, pity); the show only decides how to hand it over (§7.5.1)
// plan: every beat of the show on one clock (R.t, seconds at 1×). B = the impact (the card back bursts), rel = the
// release after the impact frames, when the front springs out and the market is hit
function plan(q) {
  const P = { q, drop: 0.06, fly0: 0.36, fly1: 0.66, tear0: 0.74, tear1: 0.94, out1: 1.12 }, nb = [1, 2, 3, 5, 6][q];
  let t = P.out1 + 0.16, iv = q === 0 ? 0.3 : 0.42; P.beats = [];
  for (let i = 0; i < nb; i++) { const tier = Math.min(q, Math.floor(i * (q + 1) / nb)), prev = i ? P.beats[i - 1].tier : 0, up = i > 0 && tier > prev, pause = up && tier >= 3; if (pause) t += 0.3; P.beats.push({ t, tier, up, pause }); t += iv; iv *= 0.82; }
  P.charge0 = P.out1 + 0.1; P.tail = P.beats[nb - 1].t + (q === 0 ? 0.12 : 0.3); P.hit = q === 0 ? 0.04 : q >= 4 ? 0.34 : 0.16; P.B = P.tail + P.hit; P.rel = P.B + [0, 0.04, 0.12, 0.12, 0.12][q];
  P.flipD = [0.3, 0.42, 0.5, 0.62, 0.78][q]; P.turns = [0.5, 1, 1, 2, 3][q];
  P.title = P.rel + 0.22; P.letters = q === 0 ? 2 : 3; P.leap = q >= 2 ? P.title + P.letters * 0.08 + 0.25 : -1; P.leapD = q >= 2 ? 1.3 : 0;
  P.stats = q >= 2 ? P.leap + P.leapD + 0.1 : P.title + P.letters * 0.08 + 0.12; P.pips = P.stats + 0.35; P.ready = P.pips + (q + 1) * 0.15 + 0.25;
  return P;
}
const R = { on: false, t: 0, rushUntil: 0, z: 1, zv: 0, rot: 0, rv: 0, chroma: 0 };
const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
R.start = function (q, k) {
  const P = plan(q), d = unitInfo(k); Object.assign(R, { on: true, insp: null, go: false, waitT: 0, P, q, k, d, t: 0, fired: {}, tier: 0, white: 0, kickS: 1, tilt: 0, dim: 0, crk: 0, ready: false, leaving: -1, have: GAME && GAME.run ? GAME.run.roster.filter(u => u.type === k).length : 0, sAcc: 0, bAcc: 0, circK: 0, z: 1, zv: 0, rot: 0, rv: 0, chroma: 0 });
  R.cracks = genCracks(); R.back = backCanvas(); R.front = frontCanvas(q, d); worldBuild(q);
  SX.press(); so.ev.pull = T; { const el = GAME && GAME.ui.stage() && GAME.ui.stage().querySelector('[data-fx="gapull"]'); if (el && el.animate) el.animate([{ transform: 'scale(1)' }, { transform: 'scale(.9)', offset: 0.3 }, { transform: 'scale(1.12)', offset: 0.65 }, { transform: 'scale(1)' }], { duration: 260 }); }
  burst(1742, 788, 12, [GOLD, BUTTER], 80, 300); ring(1742, 788, 140, GOLD, 0.3, 8, 0, { front: 1 });
};
R.click = function (p) { if (!R.on) return;
  if (R.insp) { const I = R.insp; if (I.closing >= 0) return; if (p && I.t > 1.2 && p.x >= KEY.x && p.x <= KEY.x + KEY.w && p.y >= KEY.y && p.y <= KEY.y + KEY.h) { closeInspect(true); return; } if (p && p.x >= PX0 && p.y >= PY0 && p.y <= PY0 + PH) return; closeInspect(false); return; }
  if (!R.go && R.t >= R.P.tear1) { R.go = true; SX.tap(); SX.press(); R.kickS = 0.84; R.white = 0.6; burst(960, 520, 24, [WHITE, '#c4ccd9'], 120, 500); ring(960, 520, 300, WHITE, 0.35, 10); return; }
  if (R.ready && R.leaving < 0) { if (p && Math.abs(p.x - 960) < 160 && Math.abs(p.y - 520) < 220) { openInspect(); return; } R.leaving = R.t; SX.fly(); return; }
  if (R.leaving < 0) { if (!(R.rushUntil > performance.now())) SX.tick(); R.rushUntil = performance.now() + 1200; } };
function once(key, at, fn) { if (R.t >= at && !R.fired[key]) { R.fired[key] = 1; fn(); } }
function genCracks() { const out = []; for (let i = 0; i < 9; i++) { let a = i / 9 * 6.283 + rnd(-0.3, 0.3), x = 37, y = 52; const pts = []; for (let s = 0; s < 34; s++) { a += rnd(-0.5, 0.5); x += Math.cos(a) * 1.2; y += Math.sin(a) * 1.2; const px = Math.round(x), py = Math.round(y); if (px < 3 || py < 3 || px > 71 || py > 101) break; pts.push([px, py]); if (Math.random() < 0.07) { let bx = px, by = py, ba = a + rnd(-1.2, 1.2); for (let b = 0; b < 8; b++) { bx += Math.cos(ba); by += Math.sin(ba); pts.push([Math.round(bx), Math.round(by), 1]); } } } out.push(pts); } return out; }
// card back (75×105 art px): gold frame, indigo diamond lattice, the crescent moon and star of the midnight pack
function backCanvas() { const [c, g] = cv(75, 105), R_ = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R_(1, 0, 73, 105, INK); R_(0, 1, 75, 103, INK); R_(1, 1, 73, 103, '#c48a1e'); R_(1, 1, 73, 1, '#ffda6e'); R_(1, 1, 1, 103, '#ffda6e'); R_(1, 103, 73, 1, '#80500e'); R_(73, 1, 1, 103, '#80500e');
  R_(4, 4, 67, 97, '#1a1d45'); g.fillStyle = '#242b5f'; for (let y = 4; y < 101; y++) for (let x = 4; x < 71; x++) if ((x + y) % 10 === 0 || (x - y + 200) % 10 === 0) g.fillRect(x, y, 1, 1);
  R_(6, 6, 63, 1, '#f2c24a'); R_(6, 98, 63, 1, '#f2c24a'); R_(6, 6, 1, 93, '#f2c24a'); R_(68, 6, 1, 93, '#f2c24a');
  const cx = 37, cy = 52; for (let y = -20; y <= 20; y++) for (let x = -20; x <= 20; x++) { const d = Math.abs(x) + Math.abs(y); const col = d === 20 ? INK : d === 19 ? '#ffda6e' : d >= 16 && d <= 18 ? '#a46c14' : d === 15 ? '#ffda6e' : d < 15 ? '#12132e' : null; if (col) R_(cx + x, cy + y, 1, 1, col); }
  for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) { const a = x * x + y * y <= 81, b = (x - 4) * (x - 4) + (y + 2) * (y + 2) <= 64; if (a && !b) R_(cx + x - 2, cy + y, 1, 1, x < -5 ? '#fff0b8' : '#f2c24a'); }
  R_(cx + 5, cy - 7, 1, 5, '#fff8d6'); R_(cx + 3, cy - 5, 5, 1, '#fff8d6');
  [[10, 10], [64, 10], [10, 94], [64, 94]].forEach(([x, y]) => { R_(x, y, 2, 2, '#ffda6e'); R_(x + 1, y + 1, 1, 1, '#80500e'); });
  return c; }
// card front: the quality frame, the art window with its quality sky, a dark name well
function frontCanvas(q, d) { const [c, g] = cv(75, 105), C = Q[q], R_ = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  R_(1, 0, 73, 105, INK); R_(0, 1, 75, 103, INK); R_(1, 1, 73, 103, C.c2); R_(1, 1, 73, 1, C.lt); R_(1, 1, 1, 103, C.lt); R_(1, 103, 73, 1, C.c3); R_(73, 1, 1, 103, C.c3); R_(3, 3, 69, 99, C.c);
  R_(5, 5, 65, 95, '#0d0b1e');
  const W0 = 6, H0 = 6, WW = 63, WH = 84;
  for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { let col;
    if (q === 0) col = ['#12132e', '#1a1d45', '#242b5f'][Math.floor(y / WH * 3)];
    else if (q === 1) { const d2 = Math.hypot(x - 31, y - 64); col = d2 < 16 ? '#2e5330' : d2 < 30 ? '#1d4124' : d2 < 46 ? '#15311e' : '#0f2419'; }
    else if (q === 2) col = ['#0b1430', '#0e1e48', '#132a62', '#1a3a7e'][Math.floor(y / WH * 4)];
    else if (q === 3) { const a = Math.atan2(y - 40, x - 31) + Math.hypot(x - 31, y - 40) * 0.08; col = Math.sin(a * 3) > 0.3 ? '#442b62' : Math.sin(a * 3) > -0.4 ? '#2c1c43' : '#19112b'; }
    else { const a = Math.atan2(y - 46, x - 31) / 6.283 * 14, f = a - Math.floor(a); col = f < 0.5 ? '#f2c24a' : '#dea630'; if (Math.hypot(x - 31, y - 46) < 14) col = '#ffec9e'; }
    R_(W0 + x, H0 + y, 1, 1, col); }
  if (q === 2) { for (let y = -6; y <= 6; y++) for (let x = -6; x <= 6; x++) if (x * x + y * y <= 36) R_(52 + x, 16 + y, 1, 1, x * x + y * y > 25 ? '#6cb8ec' : '#d0f2ff'); }
  if (q === 1 || q === 3) for (let i = 0; i < 18; i++) R_(W0 + Math.floor(Math.random() * WW), H0 + Math.floor(Math.random() * WH * 0.7), 1, 1, q === 1 ? '#c0e27a' : '#e6c8ff');
  R_(W0, H0 + WH, WW, 1, C.c); R_(W0, H0 + WH - 7, WW, 7, q === 4 ? '#a46c14' : '#07060f'); R_(W0, H0 + WH - 7, WW, 1, q === 4 ? '#c48a1e' : '#12132e');
  if (q >= 1) [[4, 4], [70, 4], [4, 100], [70, 100]].forEach(([x, y]) => { R_(x - 1, y, 3, 1, INK); R_(x, y - 1, 1, 3, INK); R_(x, y, 1, 1, C.lt); });
  return { c, g, W0, H0, WW, WH }; }
// the back bursts into shards (art px, around the card's centre at art 240×130)
function mkShards(q) { const id = R.back.getContext('2d').getImageData(0, 0, 75, 105).data, n = q === 0 ? [3, 4] : [5, 7], cw = 75 / n[0], ch = 105 / n[1];
  for (let gy = 0; gy < n[1]; gy++) for (let gx = 0; gx < n[0]; gx++) { const x0 = gx * cw - 37.5, y0 = gy * ch - 52.5, x1 = x0 + cw, y1 = y0 + ch, j = () => rnd(-2, 2);
    [[[x0, y0], [x1 + j(), y0], [x0, y1 + j()]], [[x1 + j(), y0], [x1, y1], [x0, y1 + j()]]].forEach(tri => { const cx = (tri[0][0] + tri[1][0] + tri[2][0]) / 3, cy = (tri[0][1] + tri[1][1] + tri[2][1]) / 3, sx = clamp(Math.round(cx + 37.5), 0, 74), sy = clamp(Math.round(cy + 52.5), 0, 104), i = (sy * 75 + sx) * 4;
      const a = Math.atan2(cy, cx), sp = rnd(120, 320) * (0.6 + q * 0.15); SHARDS.push({ q, tri: tri.map(([x, y]) => [x - cx, y - cy]), x: 240 + cx, y: 130 + cy, vx: Math.cos(a) * sp + rnd(-30, 30), vy: Math.sin(a) * sp - rnd(30, 140), r: 0, vr: rnd(-12, 12), z: q >= 2 && Math.random() < 0.14 ? rnd(1, 2.4) : 0, col: `rgb(${id[i]},${id[i + 1]},${id[i + 2]})`, t: 0, life: rnd(0.8, 1.4) }); }); } }
function revealTick(dt) {
  if (!R.on) return; if (R.insp) inspectTick(dt); worldTick(dt);
  const P = R.P, q = R.q, rush = R.rushUntil > performance.now() ? 3 : 1, slow = R.t >= P.rel && R.t < P.rel + 0.1 && q >= 2 ? 0.3 : 1;
  R.dtS = dt * rush * slow; R.t += R.dtS; if (!R.go && R.t > P.charge0) { R.waitT += dt; R.t = P.charge0; if (R.auto && R.waitT > 0.5) R.go = true; if (Math.random() < dt * 10) { const a = rnd(0, 6.283), r = rnd(500, 800); part({ k: 'streak', x: 960 + Math.cos(a) * r, y: 520 + Math.sin(a) * r * 0.75, vx: -Math.cos(a) * 500, vy: -Math.sin(a) * 375, drag: 1, life: r / 500 * 0.9, c: '#c4ccd9', s: 4 }); } }
  const t = R.t, C = Q[t >= P.B ? q : R.tier];
  // scene: coin, coil, the pack drops into the tray
  once('coil', 0.05, () => SX.coil());
  so.drop = t < P.drop ? -1 : t < P.fly0 ? (t - P.drop) / (P.fly0 - P.drop - 0.05) : t < P.fly0 + 0.02 ? 1 : -1;
  once('thunk', P.fly0 - 0.06, () => { SX.thunk(); shake = 8; burst(1720, 890, 12, ['#5fe0d0', WHITE], 60, 260); ring(1720, 890, 120, '#47d6c1', 0.3, 8, 0, { ground: 1 }); });
  once('fly', P.fly0, () => SX.whoosh(1));
  once('foil', P.fly1 - 0.05, () => SX.foil());
  once('tear', P.tear0, () => { SX.tear(); shake = 6; for (let i = 0; i < 40; i++) part({ k: 'bit', lay: 's', x: 960 + rnd(-120, 120), y: 330 + rnd(-8, 8), vx: rnd(-400, 400), vy: rnd(-700, -200), g: 1500, drag: 0.99, c: pick(['#c0c8e0', '#8a93b8', '#ffcf4a', '#b86bff', WHITE]), s: pick([4, 8, 8]), life: rnd(0.8, 1.4) }); burst(960, 330, 20, [BUTTER, WHITE], 200, 700); });
  once('riser', P.charge0, () => SX.riser(P.tail - P.charge0 + 0.1));
  once('swell', P.tail - 0.28, () => SX.suck(0.28));
  const cK = clamp((t - P.charge0) / Math.max(0.1, P.tail - P.charge0), 0, 1), charging = t >= P.charge0 && t < P.tail;
  // beats
  P.beats.forEach((b, i) => {
    if (b.pause) once('pz' + i, b.t - 0.3, () => { SX.heart(); R.dark = b.t; });
    once('b' + i, b.t, () => { R.tier = b.tier; const Cb = Q[b.tier]; R.white = 0.85; R.kickS = 1.14 + i * 0.012; R.tilt = rnd(-0.07, 0.07); R.zv += 0.9 + (b.up ? 1.2 : 0); shake = Math.max(shake, 5 + i * 3 + (b.up ? 10 : 0)); R.dark = -1; R.circK = 1;
      ring(960, 520, 240 + i * 30, Cb.c, 0.45, 14); ring(960, 880, 300 + i * 40, Cb.c, 0.4, 10, 0, { ground: 1 });
      for (let j = 0; j < 20 + i * 6; j++) { const a = rnd(0, 6.283), s = rnd(300, 900); part({ k: 'streak', x: 960 + Math.cos(a) * 60, y: 520 + Math.sin(a) * 80, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.9, c: Cb.c, s: 4, life: rnd(0.3, 0.55) }); }
      kick(0.4 + (b.up ? 0.6 : 0)); so.tier = b.tier; R.crk = Math.max(R.crk, (i + 1) / P.beats.length);
      if (b.tier >= 2) for (let j = 0; j < b.tier; j++) bolt(b.tier, 960 + rnd(-150, 150), 520 + rnd(-200, 200), rnd(30, 70));
      if (b.up) { flash(Cb.c, 0.42); ring(960, 520, 520, WHITE, 0.6, 18, 0.05); BURSTS.push({ x: 960, y: 520, R: 220, q: b.tier, n: 8, rot: rnd(0, 6), t: 0, life: 0.28 }); hopAll(0.35); }
      SX.beat(i, b.tier, b.up); }); });
  // charging: energy streams into the card from every side, faster and denser as it fills; bolts crackle from 稀有
  if (charging && !reduced) { R.sAcc += R.dtS * (30 + 300 * cK) * (1 + R.tier * 0.35); while (R.sAcc >= 1) { R.sAcc--; const a = rnd(0, 6.283), r = rnd(620, 1050), sp = rnd(800, 1400) * (1 + cK); part({ k: 'streak', x: 960 + Math.cos(a) * r, y: 520 + Math.sin(a) * r * 0.75, vx: -Math.cos(a) * sp, vy: -Math.sin(a) * sp * 0.75, drag: 1, life: r / sp * 0.92, ramp: [Q[R.tier].c3, Q[R.tier].c2, Q[R.tier].c, Q[R.tier].lt, WHITE], s: 4 }); }
    if (R.tier >= 2 || (q >= 3 && cK > 0.6)) { R.bAcc += R.dtS * 4 * Math.max(1, R.tier); while (R.bAcc >= 1) { R.bAcc--; bolt(Math.max(2, R.tier), 960 + rnd(-150, 150), 520 + rnd(-210, 210), rnd(24, 64)); if (Math.random() < 0.5) SX.zap(); } } }
  once('suck', P.tail - 0.22, () => { for (const p of PARTS) { p.pull = 5000; p.drag = 0.96; } });
  once('tail', P.tail, () => { R.white = 1; SX.cut(); });
  // the impact: the back bursts, impact frames; then the release
  once('B', P.B, () => { mkShards(q); SX.boom(q); });
  once('rel', P.rel, () => { const Cq = Q[q]; flash(WHITE, q >= 2 ? 1 : 0.75); shake = [12, 18, 30, 38, 48][q]; R.z = [1.08, 1.16, 1.26, 1.32, 1.4][q]; R.zv = 0; R.rot = (Math.random() < 0.5 ? -1 : 1) * [0, 0.016, 0.03, 0.04, 0.055][q]; R.rv = 0; R.chroma = [0, 0.5, 1, 1, 1.2][q];
    so.blast = T; so.ev.buy = T; kick(1.6); so.tier = q; R.white = 1;
    BURSTS.push({ x: 960, y: 520, R: [300, 420, 600, 760, 900][q], q, n: [6, 8, 10, 12, 14][q], rot: rnd(0, 6), t: 0, life: 0.5 + q * 0.1, rain: q >= 4 });
    if (q >= 1) LINES.push({ x: 960, y: 520, q, t: 0, life: 0.3 + q * 0.1 });
    ring(960, 520, [520, 760, 1000, 1200, 1400][q], WHITE, 0.55, 22); ring(960, 520, [640, 900, 1200, 1400, 1600][q], Cq.c, 0.8, 18, 0.06); if (q >= 2) ring(960, 520, 1800, Cq.c2, 1, 14, 0.14);
    ring(960, 880, [700, 900, 1200, 1400, 1700][q], Cq.c, 0.8, 18, 0.02, { ground: 1 });
    if (q >= 2) PILLARS.push({ x: 960, y: 520, q, t: 0, life: 1.1 + q * 0.25, rain: q >= 4 });
    for (let j = 0; j < 90 + q * 70; j++) { const a = rnd(0, 6.283), s = rnd(300, 1700); part({ k: 'streak', x: 960, y: 520, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.85, drag: 0.9, g: 220, c: pick([Cq.c, Cq.c, Cq.lt]), s: pick([4, 8]), life: rnd(0.4, 1.1) }); }
    for (let j = 0; j < 16 + q * 12; j++) part({ x: 960 + rnd(-40, 40), y: 520 + rnd(-40, 40), vx: rnd(-800, 800), vy: rnd(-1300, -300), g: 1800, drag: 0.995, floor: rnd(930, 1030), c: Cq.c, s: pick([8, 12]), life: rnd(1.4, 2.4), glow: 1 });
    for (let j = 0; j < 40 + q * 20; j++) part({ k: 'star', x: 960 + rnd(-260, 260), y: 520 + rnd(-300, 300), vx: rnd(-140, 140), vy: rnd(-220, -40), drag: 0.97, c: Cq.lt, life: rnd(1, 2.2) });
    hopAll(1); worldStart(q); if (q >= 4) for (let i = 0; i < 34; i++) setTimeout(() => skyLantern(rnd(60, 1860), rnd(1080, 1200), true), 200 + i * 40); });
  once('theme', P.rel + 0.12, () => theme(q));
  if (q >= 4) once('wave2', P.rel + 0.62, () => { flash(GOLD, 0.6); shake = 26; R.zv += 2.5; ring(960, 520, 1600, GOLD, 1, 20); BURSTS.push({ x: 960, y: 520, R: 1000, q: 4, n: 16, rot: rnd(0, 6), t: 0, life: 0.8, rain: true }); LINES.push({ x: 960, y: 520, q: 4, t: 0, life: 0.5 });
    for (let j = 0; j < 160; j++) { const a = rnd(0, 6.283), s = rnd(300, 1400); part({ k: 'streak', x: 960, y: 520, vx: Math.cos(a) * s, vy: Math.sin(a) * s, drag: 0.92, g: 200, c: pick(RAIN), life: rnd(0.6, 1.3) }); }
    for (let j = 0; j < 70; j++) part({ k: 'coin', x: 960 + rnd(-60, 60), y: 520, vx: rnd(-500, 500), vy: rnd(-1500, -700), g: 1900, drag: 1, floor: rnd(940, 1040), life: rnd(2.2, 3.2), ph: rnd(0, 6), s: 12 });
    SX.coins(18); SX.wave2(); worldHit(1.4); hopAll(0.8); for (let i = 0; i < 4; i++) setTimeout(() => firework(rnd(300, 1620), rnd(110, 300), RAIN, true), i * 150); });
  for (let i = 0; i < P.letters; i++) once('L' + i, P.title + i * 0.08, () => { SX.slam(i); worldHit(0.55); shake = Math.max(shake, 10); R.zv += 0.6; const x = 960 + (i - (P.letters - 1) / 2) * 150; ring(x, 200, 180, Q[q].c, 0.35, 10, 0, { front: 1 }); for (let j = 0; j < 14; j++) part({ x: x + rnd(-60, 60), y: 250, vx: rnd(-300, 300), vy: rnd(-200, 40), drag: 0.9, c: pick([Q[q].lt, WHITE]), s: 4, life: rnd(0.3, 0.6) }); });
  if (P.leap > 0) { once('leap', P.leap, () => { SX.whoosh(1.4); ring(640, 820, 500, Q[q].c, 0.5, 14, 0, { ground: 1 }); burst(700, 600, 30, [Q[q].c, WHITE], 200, 700); });
    once('cast', P.leap + 0.2 + 1.4 * 12 / 30 + 0.2, () => { shake = 16; flash(Q[q].c, 0.3); kick(0.9); SX.boom(0); worldHit(0.8); BURSTS.push({ x: 900, y: 600, R: 300, q, n: 8, rot: rnd(0, 6), t: 0, life: 0.35 }); ring(900, 600, 700, Q[q].c, 0.5, 14); }); }
  const rollK = clamp((t - P.stats) / 0.5, 0, 1); if (rollK > 0 && rollK < 1 && Math.floor(t * 30) !== R.rl) { R.rl = Math.floor(t * 30); SX.roll(R.rl); }
  for (let i = 0; i <= q; i++) once('pip' + i, P.pips + i * 0.15, () => { SX.pip(i); const x = 960 + (i - q / 2) * 44; burst(x, 758, 14, [i === q ? GOLD : Q[q].c, WHITE], 80, 320); ring(x, 758, 90, i === q ? GOLD : Q[q].c, 0.3, 6, 0, { front: 1 }); if (i === q && q >= 3) { flash(GOLD, 0.35); shake = 10; ring(960, 758, 260, GOLD, 0.45, 10, 0, { front: 1 }); } });
  if (R.have > 0) once('pair', P.ready - 0.1, () => { SX.pip(5); burst(990, 962, 18, [GOLD, WHITE], 80, 300); if (R.have === 2) { SX.evo(); flash(GOLD, 0.3); shake = 12; } });
  once('ready', P.ready, () => { R.ready = true; });
  // ambience while it waits
  if (R.ready && R.leaving < 0) { if (Math.random() < R.dtS * (8 + q * 10)) part({ k: q >= 3 ? 'star' : 'sq', x: rnd(560, 1360), y: rnd(700, 1000), vy: rnd(-160, -60), vx: rnd(-20, 20), c: pick([Q[q].c, Q[q].lt]), s: 4, life: rnd(1, 2), drag: 0.99, wob: 30, ph: rnd(0, 6), glow: 1 });
    if (q >= 4 && Math.random() < R.dtS * 0.9) firework(rnd(300, 1620), rnd(120, 320), RAIN, false); if (q >= 4 && Math.random() < R.dtS * 16) part({ k: 'coin', x: rnd(200, 1720), y: -20, vy: rnd(200, 400), g: 300, drag: 1, life: 3, ph: rnd(0, 6), s: 12 }); }
  // camera: a spring for the push-in and the kick, another for the roll
  const zt = t < P.charge0 ? 1 : t < P.B ? 1 + 0.1 * cK : 1; R.zv += (zt - R.z) * 240 * dt; R.zv *= Math.exp(-15 * dt); R.z += R.zv * dt;
  R.rv += (0 - R.rot) * 200 * dt; R.rv *= Math.exp(-12 * dt); R.rot += R.rv * dt; R.chroma *= Math.exp(-dt * 7);
  R.white *= Math.pow(0.015, dt); R.kickS = 1 + (R.kickS - 1) * Math.pow(0.0005, dt); R.tilt *= Math.pow(0.001, dt); R.circK *= Math.pow(0.01, dt);
  let dim = t < P.fly0 ? 0 : t < P.charge0 ? 0.6 * eo((t - P.fly0) / 0.3) : t < P.tail ? 0.6 + 0.25 * cK : t < P.rel ? 0.96 : 0.7 + 0.2 * Math.exp(-(t - P.rel) * 3);
  if (R.dark > 0 && t < R.dark) dim = 0.94;
  const lv = R.leaving >= 0 ? clamp((t - R.leaving) / 0.45, 0, 1) : 0; dim *= 1 - lv; R.dim = dim;
  // the market lives through it: the card lights the stall, the shockwave bends it, the lanterns swing
  if (charging) so.glow = { x: 240, y: 130, r: 140 + 80 * cK, i: 0.15 + 0.8 * cK, c: rgbOf(Q[R.tier].c) };
  else if (t >= P.tail && t < P.rel) so.glow = null;
  else if (t >= P.rel) so.glow = { x: 240, y: 130, r: 210 + 50 * q, i: ((0.3 + q * 0.08) + 2 * Math.exp(-(t - P.rel) * 2.4)) * (1 - lv), c: rgbOf(Q[q].c) };
  const wv = (t0, amp) => (t >= t0 && t < t0 + 0.9 ? { x: 240, y: 130, r: (t - t0) * 580, w: 16, a: (1 - (t - t0) / 0.9) * amp } : null);
  so.wave = (q >= 4 && wv(P.rel + 0.62, 1.2)) || wv(P.rel, [0.4, 0.6, 0.9, 1, 1.2][q]);
  if (R.leaving >= 0) worldOut();
  { const tgt = (!R.go || R.ready) && !R.insp ? CAM.mx * 0.5 : 0; CAM.tv += (tgt - CAM.tilt) * 90 * dt; CAM.tv *= Math.exp(-9 * dt); CAM.tilt += CAM.tv * dt; WORLD.par += (-CAM.mx - WORLD.par) * Math.min(1, dt * 4); }
  once('name', P.stats - 0.2, () => SX.name());
  if (R.leaving >= 0 && t - R.leaving > 0.5) { const k = R.k; R.on = false; so.tier = -1; so.drop = -1; so.glow = null; so.wave = null; if (GAME) gaGive(GAME, k); }
  if (t >= P.tail && t < P.B) R.white = 1;
}
function theme(q) {
  const C = Q[q];
  if (q === 0) burst(960, 700, 30, ['#8791a6', '#c4ccd9'], 60, 300, { g: -30, drag: 0.95, life: 0.9 });
  if (q === 1) for (let i = 0; i < 80; i++) part({ x: rnd(420, 1500), y: rnd(820, 1080), vx: rnd(-20, 20), vy: rnd(-300, -80), drag: 0.985, c: pick(['#c0e27a', '#6fd46a']), s: 8, life: rnd(1.4, 2.6), wob: 60, ph: rnd(0, 6), glow: 1 });
  if (q === 2) for (let i = 0; i < 34; i++) { const sd = i % 2 ? 1 : -1; part({ k: 'moth', x: 960 + sd * rnd(700, 1000), y: rnd(160, 900), vx: -sd * rnd(500, 850), vy: rnd(-120, 60), drag: 0.965, c: pick(['#4f8fff', '#bcd6ff']), life: rnd(1.6, 2.6), wob: 80, ph: rnd(0, 6) }); }
  if (q === 3) for (let i = 0; i < 46; i++) part({ k: 'meteor', x: rnd(200, 2000), y: rnd(-360, 0), vx: -rnd(400, 700), vy: rnd(500, 850), drag: 1, c: pick(['#b86bff', '#e6c8ff']), life: rnd(1.2, 1.9) });
  if (q >= 3) for (let i = 0; i < (q >= 4 ? 6 : 3); i++) setTimeout(() => firework(rnd(260, 1660), rnd(110, 320), q >= 4 ? RAIN : [C.c, C.lt, WHITE], q >= 4), 60 + i * 220);
  if (q >= 4) { for (let i = 0; i < 70; i++) { const sd = i % 2 ? 1 : -1; part({ k: 'conf', x: 960 + sd * 1000, y: rnd(900, 1080), vx: -sd * rnd(500, 1100), vy: rnd(-1500, -800), g: 900, drag: 0.985, c: pick(RAIN), life: rnd(2.2, 3.4), ph: rnd(0, 6), wob: 40 }); }
    for (let i = 0; i < 90; i++) part({ k: 'conf', x: rnd(0, 1920), y: rnd(-400, -10), vx: rnd(-60, 60), vy: rnd(160, 320), drag: 0.99, g: 40, c: pick(RAIN), life: rnd(2.5, 3.6), ph: rnd(0, 6), wob: 60 }); }
}
// the magic circle under the card while it charges: two pixel ellipses and runes that spin faster as it fills
function drawCircle(g) { const P = R.P, t = R.t; if (t < P.charge0 - 0.1 || t >= P.rel) return; const cK = clamp((t - P.charge0) / Math.max(0.1, P.tail - P.charge0), 0, 1), C = Q[R.tier], a = Math.min(1, (t - P.charge0 + 0.1) / 0.3) * (0.45 + 0.55 * cK) + R.circK * 0.5, cx = 240, cy = 222, rot = t * (0.8 + cK * 5);
  g.globalAlpha = Math.min(1, a); [[70, 14, C.c], [58, 11, C.lt], [44, 8, C.c2]].forEach(([rx, ry, col], li) => { g.fillStyle = col; const n = Math.floor(rx * 4); for (let i = 0; i < n; i++) { if (li === 1 && (i + Math.floor(t * 20)) % 6 < 2) continue; const an = i / n * 6.283 + (li % 2 ? rot : -rot) * 0.3; g.fillRect(Math.round(cx + Math.cos(an) * rx), Math.round(cy + Math.sin(an) * ry), 1, 1); } });
  for (let i = 0; i < 12; i++) { const an = i / 12 * 6.283 + rot, x = Math.round(cx + Math.cos(an) * 64), y = Math.round(cy + Math.sin(an) * 12.8); g.fillStyle = WHITE; g.fillRect(x, y - 1, 1, 3); g.fillRect(x - 1, y, 3, 1); g.fillStyle = C.c; g.fillRect(x, y - 3 - Math.round(cK * 6), 1, 2 + Math.round(cK * 6)); }
  g.globalAlpha = 1; }
function drawReveal(g) {
  if (!R.on) return; const P = R.P, q = R.q, t = R.t, C = Q[t >= P.B ? q : R.tier], lv = R.leaving >= 0 ? clamp((t - R.leaving) / 0.5, 0, 1) : 0;
  // dim: ink wash + 6px checker, no blur
  const wv = t >= P.rel && t < P.rel + 0.9 ? { x: 240, y: 130, r: (t - P.rel) * 560, w: 18, a: (1 - (t - P.rel) / 0.9) * 1.2 } : q >= 4 && t >= P.rel + 0.62 && t < P.rel + 1.5 ? { x: 240, y: 130, r: (t - P.rel - 0.62) * 560, w: 18, a: (1 - (t - P.rel - 0.62) / 0.9) * 1.2 } : null;
  if (R.dim > 0.01) { g.globalAlpha = R.dim * 0.84; g.fillStyle = INK; g.fillRect(-200, -200, 2320, 1480); g.globalAlpha = R.dim * 0.35; g.fillStyle = checker(g); g.fillRect(-200, -200, 2320, 1480); g.globalAlpha = 1; }
  worldDraw(g, wv);
  // behind the card, into the glow layer: colour bands and rays (hard, rotating)
  const glowA = t < P.charge0 ? 0 : t < P.tail ? 0.3 + 0.4 * clamp((t - P.charge0) / (P.tail - P.charge0), 0, 1) : t < P.rel ? 0 : 0.6 * (1 - lv);
  const wk = WORLD.L && WORLD.out < 0 ? 0.3 : 1; if (glowA > 0) { pb.globalAlpha = 1; [[120, 0.16], [86, 0.26], [58, 0.42]].forEach(([r, a]) => { pb.globalAlpha = a * glowA * wk; pb.fillStyle = C.c; pb.beginPath(); pb.arc(240, 130, r * (t >= P.rel ? 1.35 : 1), 0, 7); pb.fill(); }); pb.globalAlpha = 1; }
  if (t >= P.rel && q >= 1) { const n = 18, rot = (t - P.rel) * 0.4; pb.save(); pb.translate(240, 130); pb.rotate(rot); pb.globalAlpha = (q >= 2 ? 0.42 : 0.22) * (WORLD.L ? 0.45 : 1) * (1 - lv) * clamp((t - P.rel) / 0.12, 0, 1); for (let i = 0; i < n; i++) { pb.rotate(6.283 / n); pb.fillStyle = q >= 4 ? RAIN[i % RAIN.length] : i % 2 ? C.c : C.lt; pb.beginPath(); pb.moveTo(0, 0); pb.lineTo(-12, -340); pb.lineTo(12, -340); pb.fill(); } pb.restore(); pb.globalAlpha = 1; }
  drawInspectGlow(pb);
  g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(PB, 0, 0, 1920, 1080); g.restore();
  // the pack: flies from the tray to the centre, is torn open, the card slides out of it
  if (t >= P.fly0 && t < P.out1 + 0.5) drawPack(g, t, P);
  // the card in 3D pixel columns: its back through the wait and the charge (tilting to the pointer); after the impact
  // the front springs out of the white core and spins, then tilts again
  pcx.clearRect(0, 0, 480, 270); let cardOn = false;
  if (t >= P.tear0 + 0.05 && lv < 1 && !(t >= P.B && t < P.rel)) {
    const out = eo(clamp((t - P.tear0 - 0.05) / (P.out1 - P.tear0 - 0.05), 0, 1)); let x = 960, y = lerp(430, 520, out), s = lerp(0.72, 1, out), th = CAM.tilt;
    const cK = clamp((t - P.charge0) / Math.max(0.1, P.tail - P.charge0), 0, 1), jit = t < P.B && t >= P.charge0 && R.go ? cK * cK * (3 + R.tier * 3) : 0; x += rnd(-jit, jit); y += rnd(-jit, jit) - cK * 18 * (t < P.B ? 1 : 0);
    if (!R.go) { y += Math.sin(performance.now() / 380) * 8; th += Math.sin(performance.now() / 900) * 0.08; }
    if (t >= P.rel) { const k = clamp((t - P.rel) / P.flipD, 0, 1), spin = Math.PI * (1 + 2 * [0, 0, 1, 1, 2][q]); th = spin * eio(k) + CAM.tilt * clamp((t - P.rel - P.flipD) / 0.3, 0, 1); s = lerp(0.15, 1, eb(clamp((t - P.rel) / 0.42, 0, 1))); y = 520; }
    if (P.leap > 0 && t > P.leap && t < P.stats) { const k = clamp((t - P.leap) / 0.22, 0, 1) * (1 - clamp((t - P.stats + 0.25) / 0.25, 0, 1)); x += 330 * eo(k); s *= 1 - 0.22 * k; y -= 40 * k; }
    if (lv > 0) { const to = (GAME && GAME.fxPos('roster')) || { x: 200, y: 980 }, e = eio(lv); x = lerp(960, to.x, e); y = lerp(520, to.y, e) - Math.sin(e * Math.PI) * 220; s *= 1 - 0.8 * e; th += e * 6.283; }
    const I = R.insp, cm = !I ? 1 : I.closing >= 0 ? eb(clamp((I.t - I.closing) / 0.26, 0, 1)) : Math.max(0, 1 - I.t / 0.16); s *= cm;
    const bob = R.ready && lv === 0 ? Math.sin(t * 2.2) * 6 : 0, sc = s * R.kickS, ax = x / 4, ay = (y + bob) / 4;
    if (sc > 0.02) { cardOn = true;
      // hard glow frame (additive, behind) and a shadow on the floor
      if (t >= P.charge0 || !R.go) { const w = 75 * sc * Math.max(0.12, Math.abs(Math.cos(th))) / 2 + 3, h = 105 * sc / 2 + 3, a = !R.go ? 0.25 + 0.15 * Math.sin(performance.now() / 200) : 0.35 + 0.35 * R.white; pb.globalAlpha = a * 0.6; pb.fillStyle = C.c; pb.fillRect(Math.round(ax - w - 3), Math.round(ay - h - 3), Math.round(w * 2 + 6), Math.round(h * 2 + 6)); pb.globalAlpha = a; pb.fillRect(Math.round(ax - w), Math.round(ay - h), Math.round(w * 2), Math.round(h * 2)); pb.globalAlpha = 1; }
      pcx.globalAlpha = 0.35; pcx.fillStyle = INK; pcx.beginPath(); pcx.ellipse(Math.round(ax), Math.round(ay + 66 * sc), Math.round(30 * sc * Math.max(0.3, Math.abs(Math.cos(th)))), Math.round(5 * sc), 0, 0, 7); pcx.fill(); pcx.globalAlpha = 1;
      const face = (tt) => (Math.cos(tt) >= 0 ? backFace() : frontFace(t));
      if (t >= P.rel && q >= 3 && t - P.rel < P.flipD) { pcx.globalAlpha = 0.3; card3d(pcx, face(th - 0.5), ax, ay, sc, th - 0.5); pcx.globalAlpha = 1; }
      card3d(pcx, face(th + R.tilt), ax, ay, sc, th + R.tilt, { white: R.white }); } }
  // the unit steps out and does its signature skill (its own FX), then goes back in
  if (P.leap > 0 && t > P.leap && t < P.stats) { const k = clamp((t - P.leap) / 0.22, 0, 1), back = clamp((t - (P.stats - 0.25)) / 0.25, 0, 1), sc = Math.round(lerp(4, 10, eb(k) * (1 - back))), fi = Math.floor(clamp(t - P.leap - 0.2, 0, 9) * 30);
    const x = lerp(960, 640, eo(k) * (1 - back)), y = lerp(520, 820, eo(k) * (1 - back)), sp = eo(k) * (1 - back), C2 = Q[q]; g.save(); [[260, 0.16], [190, 0.26], [120, 0.4]].forEach(([r, a]) => { g.globalAlpha = a * sp; g.fillStyle = C2.c; g.beginPath(); g.arc(x, y - 150, r, 0, 7); g.fill(); }); g.globalAlpha = 0.5 * sp; g.fillStyle = INK; g.fillRect(x - 100, y - 4, 200, 12); g.restore();
    drawSpr(g, R.d.art, fi < 34 && k >= 1 && back === 0 ? 'skill' : 'idle', fi < 34 && k >= 1 && back === 0 ? fi : Math.floor(t * 12), x, y, sc); }
  // the card, the shards and solid bits, then the glow in front
  g.drawImage(PC, 0, 0, 1920, 1080); g.drawImage(PS, 0, 0, 1920, 1080);
  g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(PF, 0, 0, 1920, 1080); g.restore();
  const ik = inspectK(); g.save(); g.globalAlpha = 1 - ik;
  // the banner and the title: letters slam down one by one
  if (t >= P.title - 0.06 && lv < 1) { const bk = eo(clamp((t - P.title + 0.06) / 0.14, 0, 1)); g.save(); g.globalAlpha = (1 - lv) * (1 - ik); g.translate(960, 200); g.scale(1, bk);
      g.fillStyle = INK; g.fillRect(-1000, -70, 2000, 140); g.fillStyle = C.c3; g.fillRect(-1000, -62, 2000, 124); g.fillStyle = C.c2; g.fillRect(-1000, -46, 2000, 8); g.fillRect(-1000, 38, 2000, 8);
      if (q >= 4) RAIN.forEach((c, i) => { g.fillStyle = c; g.fillRect(-1000, -62 + i * 2, 2000, 2); g.fillRect(-1000, 48 + i * 2, 2000, 2); });
      for (let x = -1000; x < 1000; x += 40) { const on = ((x / 40 + Math.floor(t * 10)) % 3 + 3) % 3 === 0; g.fillStyle = on ? WHITE : C.c; g.fillRect(x + 14, -58, 12, 8); g.fillRect(x + 14, 50, 12, 8); }
      g.restore();
    const word = [...(M.tr ? M.tr(Q[q].n + (q ? '！' : '')) : Q[q].n + (q ? '！' : ''))]; word.forEach((ch, i) => { const at = P.title + i * 0.08, k = clamp((t - at) / 0.14, 0, 1); if (k <= 0) return; const land = clamp((t - at - 0.14) / 0.25, 0, 1), sc = k < 1 ? lerp(3.2, 1, eo(k)) : 1 + 0.18 * Math.sin(land * Math.PI) * (1 - land), x = 960 + (i - (word.length - 1) / 2) * 150, y = 200 - (1 - k) * 60 + Math.sin(t * 3 + i) * 3 * land;
      g.save(); g.translate(x, y); g.scale(sc, 1 / Math.max(0.8, sc > 1 ? 1 + (sc - 1) * 0.5 : sc)); g.globalAlpha = (1 - lv) * (1 - ik) * Math.min(1, k * 3); drawText(g, ch, 0, 0, 150, C.c, q >= 4 ? { bands: RAIN.slice(1, 6) } : q >= 3 ? { bands: [WHITE, C.lt, C.c, C.c2] } : { bands: [WHITE, C.lt, C.c] }); g.restore(); });
    const nk = clamp((t - P.stats + 0.2) / 0.25, 0, 1); if (nk > 0) { g.globalAlpha = (1 - lv) * (1 - ik) * nk; drawText(g, R.d.n, 960, 800 + (1 - nk) * 20, 56, C.c);
      const pw = Math.round(R.d.cost * eo(clamp((t - P.stats) / 0.5, 0, 1))); drawText(g, R.d.voc + ' · 战斗力 ' + pw, 960, 856, 32, '#f4efe0'); drawText(g, R.d.line, 960, 904, 26, '#c9c3e6'); }
    for (let i = 0; i <= q; i++) { const k = clamp((t - P.pips - i * 0.15) / 0.12, 0, 1); const x = 960 + (i - q / 2) * 44, y = 758; g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.globalAlpha = (1 - lv) * (1 - ik); g.fillStyle = INK; g.fillRect(-12, -12, 24, 24); g.fillStyle = k > 0 ? (i === q && q >= 3 ? GOLD : C.c) : '#3d3a8c'; const s2 = 8 + 2 * Math.sin(k * Math.PI) * 3; g.fillRect(-s2, -s2, s2 * 2, s2 * 2); g.restore(); }
    if (R.have > 0 && t >= P.ready - 0.1) { drawText(g, R.have === 2 ? '凑齐三张 · 进化' : '配对', 900, 962, 30, GOLD, { align: 'right' }); for (let i = 0; i < 3; i++) { const lit = i < R.have + 1, x = 930 + i * 34; g.save(); g.translate(x, 962); g.rotate(Math.PI / 4); g.fillStyle = INK; g.fillRect(-9, -9, 18, 18); g.fillStyle = lit ? GOLD : '#3d3a8c'; g.fillRect(-6, -6, 12, 12); g.restore(); } }
    g.globalAlpha = 1; }
  g.restore(); drawInspect(g);
  if (!R.go && R.t >= P.charge0 && Math.sin(performance.now() / 160) > -0.3) drawText(g, '点卡片', 960, 830, 40, '#fff3b0');
  if (R.ready && lv === 0 && !R.insp && Math.sin(t * 5) > -0.2) drawText(g, '点卡片看详情 · 点别处收下', 960, 1046, 26, '#fff3b0');
  // impact frames: two-tone stills with focus lines (ink / white / quality colour), then the release
  if (t >= P.B && t < P.rel && !reduced) { const ph = Math.min(2, Math.floor((t - P.B) / 0.04)), bg = ph === 0 ? INK : ph === 1 ? WHITE : C.c, fg = ph === 0 ? WHITE : ph === 1 ? INK : WHITE;
    g.fillStyle = bg; g.fillRect(-200, -200, 2320, 1480); g.fillStyle = ph === 1 ? C.c : fg;
    for (let i = 0; i < 56; i++) { const a = i / 56 * 6.283 + hash(i + ph * 50) * 0.08, inner = 250 + hash(i * 3 + ph) * 260, w = 6 + hash(i * 7 + ph) * 22; g.beginPath(); g.moveTo(960 + Math.cos(a) * 1500 - Math.sin(a) * w, 520 + Math.sin(a) * 1500 + Math.cos(a) * w); g.lineTo(960 + Math.cos(a) * 1500 + Math.sin(a) * w, 520 + Math.sin(a) * 1500 - Math.cos(a) * w); g.lineTo(960 + Math.cos(a) * inner, 520 + Math.sin(a) * inner); g.fill(); }
    g.fillStyle = fg; const k = 1 + (t - P.B) * 3; g.fillRect(960 - 160 * k, 520 - 224 * k, 320 * k, 448 * k); if (ph === 1) { g.fillStyle = C.c; g.fillRect(960 - 120, 520 - 170, 240, 340); } }
}
let CHK = null; function checker(g) { if (CHK) return CHK; const [c, cg] = cv(12, 12); cg.fillStyle = INK; cg.fillRect(0, 0, 6, 6); cg.fillRect(6, 6, 6, 6); CHK = g.createPattern(c, 'repeat'); return CHK; }
function drawCracks(g) { const P = R.P, t = R.t; if (R.crk <= 0) return; const C = Q[R.tier], n = Math.floor(R.crk * 34);
  g.save(); g.scale(4, 4); g.translate(-37.5, -52.5); R.cracks.forEach(path => { for (let i = 0; i < Math.min(n, path.length); i++) { const [x, y] = path[i]; g.fillStyle = INK; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3); } });
  R.cracks.forEach(path => { for (let i = 0; i < Math.min(n, path.length); i++) { const [x, y] = path[i]; g.fillStyle = i < n - 6 ? WHITE : C.c; g.fillRect(x, y, 1, 1); } });
  if (t >= P.tail - 0.2) { g.fillStyle = WHITE; const s = 9 + Math.round((t - P.tail + 0.2) * 40); g.fillRect(37 - s / 2, 52 - s / 2, s, s); } g.restore(); }
function drawFront(g, t) { const F = R.front, P = R.P; const [c2, g2] = R.fc || (R.fc = cv(75, 105)); g2.clearRect(0, 0, 75, 105); g2.drawImage(F.c, 0, 0);
  g2.save(); g2.beginPath(); g2.rect(F.W0, F.H0, F.WW, F.WH - 7); g2.clip(); const inLeap = P.leap > 0 && t > P.leap && t < P.stats; if (!inLeap) { const sp = sprOf(R.d.art).idle, k2 = sp.fh <= 38 && sp.fw <= 31 ? 2 : 1; drawSpr(g2, R.d.art, 'idle', Math.floor(t * 12), 37, F.H0 + F.WH - 9, k2); } g2.restore();
  g.drawImage(c2, -150, -210, 300, 420); }
function drawPack(g, t, P) {
  const k = eo(clamp((t - P.fly0) / (P.fly1 - P.fly0), 0, 1)), x = lerp(1720, 960, k), y = lerp(900, 430, k) - Math.sin(k * Math.PI) * 180, s = lerp(0.25, 1, k), spin = (1 - k) * 6.283;
  const fall = clamp((t - P.out1 + 0.05) / 0.45, 0, 1), torn = t >= P.tear0;
  g.save(); g.translate(Math.round(x), Math.round(y + fall * fall * 700)); g.rotate(spin + fall * 0.6); g.scale(s * (1 + 0.04 * Math.sin(t * 20) * (t > P.fly1 && !torn ? 1 : 0)), s); g.globalAlpha = 1 - fall;
  const W = 240, H = 340, top = torn ? -H / 2 + 44 : -H / 2;
  g.fillStyle = INK; g.fillRect(-W / 2 - 6, top - 6, W + 12, H / 2 - top + H / 2 + 12);
  const bands = ['#2c1c43', '#372352', '#442b62', '#533574', '#442b62', '#372352']; for (let i = 0; i < 12; i++) { g.fillStyle = bands[i % bands.length]; g.fillRect(-W / 2 + i * 20, top, 20, H / 2 - top + H / 2); }
  g.fillStyle = '#c48a1e'; g.fillRect(-W / 2, top, W, 8); g.fillRect(-W / 2, H / 2 - 16, W, 16); g.fillStyle = '#ffda6e'; for (let i = 0; i < W; i += 12) g.fillRect(-W / 2 + i, H / 2 - 16, 6, 4);
  g.fillStyle = '#12132e'; g.fillRect(-70, -60, 140, 140); g.fillStyle = '#f2c24a'; for (let yy = -40; yy <= 40; yy += 4) for (let xx = -40; xx <= 40; xx += 4) { const a = xx * xx + yy * yy <= 1600, b = (xx - 16) * (xx - 16) + (yy + 8) * (yy + 8) <= 1100; if (a && !b) g.fillRect(xx - 8, yy + 10, 4, 4); }
  g.fillStyle = '#fff8d6'; g.fillRect(20, -40, 4, 20); g.fillRect(12, -32, 20, 4);
  const sh = ((t * 1.3) % 1.4) - 0.2; if (sh > 0 && sh < 1) { g.globalAlpha *= 0.55; g.fillStyle = WHITE; for (let yy = top; yy < H / 2; yy += 4) g.fillRect(Math.round((-W / 2 + sh * (W + 120) - (yy - top) * 0.35) / 4) * 4, yy, 16, 4); }
  if (!torn) { g.globalAlpha = 1 - fall; g.fillStyle = '#c48a1e'; for (let i = 0; i < W; i += 12) { g.fillRect(-W / 2 + i, -H / 2, 12, 36); g.fillStyle = '#ffda6e'; g.fillRect(-W / 2 + i, -H / 2 + 36, 6, 6); g.fillStyle = '#c48a1e'; } }
  g.restore();
  if (torn) { const k2 = clamp((t - P.tear0) / 0.6, 0, 1); if (k2 < 1) { g.save(); g.translate(Math.round(x + k2 * 420), Math.round(y - H / 2 * s + 18 - k2 * 260 + k2 * k2 * 500)); g.rotate(k2 * 3); g.globalAlpha = 1 - k2; g.fillStyle = '#c48a1e'; g.fillRect(-W / 2 * s, -18, W * s, 36); g.fillStyle = '#ffda6e'; for (let i = 0; i < W * s; i += 12) g.fillRect(-W / 2 * s + i, 14, 6, 6); g.restore(); } }
}


// ───────── the market scene on the shop canvas: the stall, its keeper, the machine (mc-pxmarket.js) ─────────
let T = 0, FRAME = 0; const so = { ev: {}, tier: -1, pity: 0, drop: -1 };
const SLOT = '_shop';
const kick = (a) => { const s = X.slots && X.slots[SLOT]; if (s) s.kick.all = Math.max(s.kick.all || 0, a); };
let GAME = null;
function drawMarket(g) {
  const c = g.ui && g.ui.cv && g.ui.cv('shop'); if (!c) return; const run = g.run, key = '_mk_' + ((run && (run.shopLook || run.shopKind)) || 'bazaar'); if (!X.has(key)) return;
  const covered = R.on && WORLD.L && WORLD.out < 0 && WORLD.landed[0] && WORLD.landed[1];
  so.pity = Math.min(M.GA_PITY, (run && run.gaPity) || 0);
  let s = X.slots[SLOT];
  // the market redraws every frame; during a draw every other one, and not at all while the world covers it
  if (!s || s.key !== key || (!covered && (!R.on || (FRAME++ & 1) === 0))) { const g0 = so.glow; so.glow = null; X.pixels(key, T, so, SLOT); so.glow = g0; s = X.slots[SLOT]; if (s && s.cx) { s.cx.putImageData(s.img, 0, 0); if (g0) M.MARKET.glow(s.cx, g0); } }
  if (!s || !s.cv) return;
  const ctx = c.getContext('2d'); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = INK; ctx.fillRect(0, 0, 1920, 1080); ctx.imageSmoothingEnabled = false;
  const z = R.on ? R.z : 1, rot = R.on && !reduced ? R.rot : 0;
  ctx.save(); ctx.translate(960, 560); ctx.rotate(rot); ctx.scale(z, z); ctx.translate(-960, -560); ctx.drawImage(s.cv, 0, 0, 1920, 1080); ctx.restore();
}
// the cards on the counter and the army hop when the reveal hits
function hopAll(k) { const st = GAME && GAME.ui && GAME.ui.stage && GAME.ui.stage(); if (!st || reduced) return;
  [...st.querySelectorAll('[data-fx^="cardunits"]')].forEach((el, i) => { if (el.animate) el.animate([{ translate: '0 0', rotate: '0deg' }, { translate: `0 ${-26 * k}px`, rotate: `${(i - 2) * 3 * k}deg`, offset: 0.3 }, { translate: '0 4px', rotate: '0deg', offset: 0.7 }, { translate: '0 0', rotate: '0deg' }], { duration: 460, delay: Math.abs(i - 2) * 45, easing: 'ease-out' }); });
  [...st.querySelectorAll('[data-fx="roster"],[data-fx="wallet"],[data-fx="gapull"]')].forEach((el, i) => { if (el.animate) el.animate([{ translate: '0 0' }, { translate: `0 ${-14 * k}px`, offset: 0.35 }, { translate: '0 0' }], { duration: 380, delay: 60 + i * 25, easing: 'ease-out' }); }); }

// ───────── the shop, around the draw ─────────
const oOpen = G.openShop;
G.openShop = function () { const r = oOpen.apply(this, arguments), run = this.run; if (run) run.gaPulls = 0; so.ev = {}; so.tier = -1; so.drop = -1; so.glow = null; so.wave = null; R.on = false; WORLD.L = null; return r; };
const oBuy = G.buy;
G.buy = function (zone, i) { const run = this.run, c = run && run.shop && run.shop[zone] && run.shop[zone][i], was = c && c.sold; if (zone === 'gacha') this.bigLoot = () => {}; let r; try { r = oBuy.apply(this, arguments); } finally { if (zone === 'gacha') delete this.bigLoot; } if (this.screen === 'shop' && c && c.sold && !was) { so.ev.buy = T; if (zone === 'gacha') { run.shop.gacha = null; } } return r; };
const oRef = G.refresh;
G.refresh = function () { if (R.on) return; const n0 = this.run && this.run.refreshN; const r = oRef.apply(this, arguments); if (this.run && this.run.refreshN !== n0) so.ev.refresh = T; return r; };
const oDeny = G.deny;
G.deny = function () { if (this.screen === 'shop') so.ev.deny = T; return oDeny.apply(this, arguments); };
// the drawn unit, when the army is full and it does not merge: swap one out (mc-roster.js) or take half its price
const halfOf = (k) => Math.max(1, Math.round((DB[k] ? DB[k].cost : 0) / 2));
function gaCash(g) { const run = g.run, c = run && run.shop && run.shop.gacha && run.shop.gacha[0]; g.replace = null; if (!c || c.sold) return; c.sold = true; run.shop.gacha = null; const v = halfOf(c.type);
  g.hold('wallet', run.wallet); run.wallet += v; g.release('wallet'); g.fx.pop(960, 420, '+' + v, GOLD, 40); M.Sfx.coin && M.Sfx.coin(v); g.bump(); }
const oSell = G.sellSel;
G.sellSel = function () { if (this.replace && this.replace.zone === 'gacha') { gaCash(this); return; } return oSell.apply(this, arguments); };
const oLeave = G.leaveShop;
G.leaveShop = function () { if (R.on) return; if (this.replace && this.replace.zone === 'gacha') gaCash(this); return oLeave.apply(this, arguments); };
function gaGive(g, k) { const run = g.run; if (!run) return;
  if (M.canAdd(run, k)) { g.bigLoot = () => {}; try { g.award([{ k: 'unit', type: k }], { x: 960, y: 520 }); } finally { delete g.bigLoot; } so.ev.buy = T; }
  else { run.shop.gacha = [{ kind: 'unit', type: k, q: DB[k].q, cost: 0, gacha: 1 }]; g.replace = { zone: 'gacha', i: 0, at: performance.now() }; g.sel = null; }
  g.bump(); }
G.gaActive = function () { return R.on; };
// the shop is not done while a pack can still be drawn, one is playing, or a drawn unit waits for its swap (mc-tidy.js)
M.gaBusy = (g) => !!(R.on || (g.replace && g.replace.zone === 'gacha') || (g.run && g.run.wallet >= M.gaPrice(g.run)));
G.gaReady = function () { return R.on && R.ready && !R.insp && R.leaving < 0; };
G.gachaPull = function () {
  const run = this.run; if (!run || this.screen !== 'shop' || R.on || this.reel) return;
  if (this.replace && this.replace.zone === 'gacha') { this.deny('上一张还没收下', '#d0453c'); return; }
  const p = M.gaPrice(run); if (run.wallet < p) { this.deny('积分不够', '#d0453c'); return; }
  const k = M.gaRoll(run); if (!k) { this.deny('这家店没有能抽的部队', '#d0453c'); return; }
  this.hold('wallet', run.wallet); run.wallet -= p; this.release('wallet'); if (!run.gaFreeUsed) run.gaFreeUsed = true; else run.gaPulls = (run.gaPulls || 0) + 1;
  GAME = this; this.tipData = null; this.replace = null; R.start(Math.min(4, DB[k].q | 0), k); this.bump();
};
G.gachaClick = function (x, y) { if (!R.on) return; R.click({ x, y }); this.bump(); };
// for the play bot: take whatever the draw gives at once
G.gachaSkip = function () { if (!R.on) return; const k = R.k; R.on = false; WORLD.L = null; so.tier = -1; so.drop = -1; so.glow = null; so.wave = null; P.length = 0; SHARDS.length = 0; gaGive(this, k); };

// ───────── every frame on the shop screen ─────────
const oTick = G.tick;
G.tick = function (dt) {
  const r = oTick.apply(this, arguments);
  if (this.screen !== 'shop' || !this.run) { if (R.on) { R.on = false; WORLD.L = null; } return r; }
  GAME = this; reduced = reducedM(); T += dt; CAM.mx = clamp(((this.mx == null ? 960 : this.mx) - 960) / 960, -1, 1);
  if (R.insp) R.keyHov = this.mx >= KEY.x && this.mx <= KEY.x + KEY.w && this.my >= KEY.y && this.my <= KEY.y + KEY.h;
  const wasOn = R.on;
  revealTick(dt);
  const hold = R.on && R.t >= R.P.tail && R.t < R.P.rel ? 0.05 : 1, fdt = R.on ? (R.dtS || dt) * hold : dt;
  stepFx(fdt); if (shake > 0.5) { if (!reduced) this.fx.kick(shake * 0.8); shake = 0; }
  drawMarket(this);
  const fc = this.ui.cv('fx');
  if (fc && (R.on || P.length || RINGS.length || SHARDS.length || BURSTS.length || TXT.length || flashA > 0)) {
    paintLayers(); const g = fc.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.imageSmoothingEnabled = false;
    const z = R.on ? R.z : 1, rot = R.on && !reduced ? R.rot : 0;
    if (R.on) { g.save(); g.translate(960, 560); g.rotate(rot); g.scale(z, z); g.translate(-960, -560); drawReveal(g); g.restore(); }
    else { g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(PB, 0, 0, 1920, 1080); g.restore(); g.drawImage(PS, 0, 0, 1920, 1080); g.save(); g.globalCompositeOperation = 'lighter'; g.drawImage(PF, 0, 0, 1920, 1080); g.restore(); }
    TXT.forEach(tx => { const k = tx.t / tx.life; g.globalAlpha = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3; drawText(g, tx.s, tx.x, tx.y - eo(k) * 50, tx.size * (k < 0.15 ? lerp(1.6, 1, k / 0.15) : 1), tx.c); }); g.globalAlpha = 1;
    if (flashA > 0 && !reduced) { g.globalAlpha = Math.min(1, flashA * (reduced ? 0.3 : 1)); g.fillStyle = flashC; g.fillRect(-200, -200, 2320, 1480); g.globalAlpha = 1; }
    g.restore();
  }
  if (wasOn !== R.on) this.bump();
  return r;
};
// the shop screen's own view: the machine, the swap of a drawn unit, the click catcher while a draw plays
const oView = G.view;
G.view = function () {
  const v = oView.call(this), run = this.run;
  if (v.s && run && this.screen === 'shop') {
    const maxQ = M.stageOf ? M.stageOf(run).capQ : 4, free = !run.gaFreeUsed, p = M.gaPrice(run), RT = M.gaRates ? M.gaRates(run) : M.GA_RATES;
    v.s.ga = { key: free ? '免费抽一包' : '抽一包', price: p, priceOn: !free, cls: free ? 'teal' : run.wallet >= p ? 'gold' : 'dis', rates: RT.map((r, i) => ({ t: String(r), c: i <= maxQ ? Q[i].lt : '#6a6394' })) };
    v.s.gaPull = () => { if (M.Sfx.init) M.Sfx.init(); this.gachaPull(); };
    v.s.gaOn = R.on; v.s.gaClick = () => this.gachaClick(this.mx, this.my);
    if (R.on) v.fxZ = 60;
    if (this.replace && this.replace.zone === 'gacha') { const c = run.shop.gacha && run.shop.gacha[0]; if (c) { v.s.selOn = true; v.s.sell = '点一支部队换成' + DB[c.type].n + ' · 点这里换成 ' + halfOf(c.type) + ' 积分'; } }
  }
  return v;
};
const oTip = G.tipFor;
G.tipFor = function (key) {
  if (key === 's-ga') return { title: '午夜卡包', c: '#bff7f0', d: '抽一张这家店的部队，品质看运气。' };
  if (key === 's-garate') return { title: '出货概率', c: '#bff7f0', d: '每包出各品质的概率；灰色的档位这一关出不了。', lines: (M.gaRates ? M.gaRates(this.run) : M.GA_RATES).map((r, i) => ({ t: Q[i].n + ' ' + r + '%', c: Q[i].c })) };
  if (key === 's-gapity') { const run = this.run, n = Math.min(M.GA_PITY, (run && run.gaPity) || 0); return { title: '保底灯 ' + n + ' / ' + M.GA_PITY, c: GOLD, d: '亮满 ' + M.GA_PITY + ' 盏，下一包必出稀有以上。' }; }
  return oTip ? oTip.apply(this, arguments) : null;
};
})();
