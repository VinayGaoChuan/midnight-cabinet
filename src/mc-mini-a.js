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
// 画具按设计稿（§11.5）：颜色过调色板、硬边无圆角、渐变变成色带、像素字 + 3px 墨影、灯珠是方块
const U = M.UI, pc = (c) => (U ? U.pal(c) : c);
K.R = (x, a, b, w, h, c) => { x.fillStyle = pc(c); x.fillRect(a, b, w, h); };
K.CI = (x, a, b, r, c) => { x.fillStyle = pc(c); x.beginPath(); x.arc(a, b, Math.max(0, r), 0, 7); x.fill(); };
K.EL = (x, a, b, rx, ry, c, rot) => { x.fillStyle = pc(c); x.beginPath(); x.ellipse(a, b, Math.max(0, rx), Math.max(0, ry), rot || 0, 0, 7); x.fill(); };
K.PL = (x, pts, c) => { x.fillStyle = pc(c); x.beginPath(); pts.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.closePath(); x.fill(); };
K.LN = (x, a, b, c, d, w, col) => { x.strokeStyle = pc(col); x.lineWidth = w; x.lineCap = 'square'; x.beginPath(); x.moveTo(a, b); x.lineTo(c, d); x.stroke(); };
K.RR = (x, a, b, w, h, r, c, st, sw) => { if (c) { x.fillStyle = pc(c); x.fillRect(a, b, w, h); } if (st) { const lw = Math.max(3, Math.round((sw || 2))); x.strokeStyle = pc(st); x.lineWidth = lw; x.strokeRect(a + lw / 2, b + lw / 2, w - lw, h - lw); } };
K.LG = (x, x0, y0, x1, y1, stops) => (U ? U.lg(x, x0, y0, x1, y1, stops) : stops[0][1]);
K.RG = (x, a, b, r0, r1, stops) => (U ? U.rg(x, a, b, r0, r1, stops) : stops[0][1]);
K.TX = (x, s, a, b, size, col, o = {}) => { if (U) { U.text(x, s, a, b, size, col, { align: o.al || 'center', shadow: o.sh !== 0 }); return; } x.font = size + "px 'Noto Serif SC', serif"; x.textAlign = o.al || 'center'; x.textBaseline = 'middle'; x.fillStyle = col; x.fillText(s, a, b); };
K.PT = (x, s, a, b, size, col, o) => M.pxText(x, String(s), a, b, size, pc(col), o || {});
K.GL = (x, a, b, r, col, al) => { if (al <= 0) return; const A = x.globalAlpha; x.globalAlpha = A * cl(al, 0, 1); x.globalCompositeOperation = 'lighter'; x.fillStyle = K.RG(x, a, b, 0, r, [[0, col], [1, 'rgba(0,0,0,0)']]); x.fillRect(a - r, b - r, r * 2, r * 2); x.globalCompositeOperation = 'source-over'; x.globalAlpha = A; };
K.IC = (x, key, a, b, s) => { const c = M.iconCanvas(key, 3) || (M.SP && M.SP[key] ? M.spriteCanvas(key, 4) : null); if (c) x.drawImage(c, a - s / 2, b - s / 2, s, s); };
K.SP = (x, key, a, b, h, flip) => { const c = M.spriteCanvas(key, 6); if (!c || !c.height) return 0; const s = h / c.height; x.save(); x.translate(a, b); if (flip) x.scale(-1, 1); x.drawImage(c, -c.width * s / 2, -c.height * s, c.width * s, c.height * s); x.restore(); return c.width * s; };
// 灯珠跟着演出走（K.lampFx 由 mc-show.js 每帧写）：紧张越高跑得越快，中奖换成奖的颜色，大赢整圈频闪
K.bulbs = (x, a, b, w, h, t, col, n) => { n = n || 24; const L = K.lampFx; if (L) { t *= L.sp || 1; if (L.col) col = L.col; } const strobe = L && L.strobe ? Math.floor(t * 3) % 2 : -1; for (let i = 0; i < n; i++) { const p = i / n, per = 2 * (w + h), d = p * per; let px, py; if (d < w) { px = a + d; py = b; } else if (d < w + h) { px = a + w; py = b + d - w; } else if (d < 2 * w + h) { px = a + w - (d - w - h); py = b + h; } else { px = a; py = b + h - (d - 2 * w - h); } const on = strobe >= 0 ? (i + strobe) % 2 === 0 : (Math.floor(t * 6) + i) % 3 === 0; K.R(x, px - 6, py - 6, 12, 12, '#07060f'); K.R(x, px - 3, py - 3, 6, 6, on ? (L && L.strobe ? col : '#fff3b0') : L && L.strobe ? '#07060f' : col); } };
K.shade = (c, k) => M.shade(c, k);
K.ease = { eo, eio, eb };
// ───────── pixel stages (2026-09-27)：所有小游戏同一个像素格——1 美术格 = 4 逻辑像素，舞台 300×175 格，和像素角色一样大 ─────────
// 舞台和道具用 M.PXR.def 画（材质色阶、每帧打光、4 个深度层，以后 HD-2D 直接升维），用 K.pxr 按 4 倍贴上舞台；
// 美术格 (ax, ay) 对应逻辑坐标 (SX + 4ax, SY + 4ay)。人物用 M.PCDG.bodyFrame（默认也是 4 倍）。
K.ART = 4; K.AW = SW / 4; K.AH = SH / 4;
K.snap = (v) => Math.round(v / 4) * 4;
K.ax = (lx) => (lx - SX) / 4; K.ay = (ly) => (ly - SY) / 4; K.lx = (ax) => SX + ax * 4; K.ly = (ay) => SY + ay * 4;
const TOUCH = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0 && typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
K.pxrEvery = TOUCH ? 2 : 1;   // phones re-light the stage every other frame
// draw PXR def `key` with its top-left at art cell (ax, ay) of the stage; t = the minigame's clock (mg.t), o = the def's anim options,
// id = which instance (one slot per id). A new minigame run starts the slot fresh and its lights come on one by one.
K.pxr = function (x, key, ax, ay, t, o, id) {
  const X = M.PXR; if (!X || !X.has(key)) return null;
  const sid = '_mg:' + (id || key), g = M._g, mg = (g && g.mini) || null; let s = X.slots[sid];
  if (s && s._mg !== mg) { delete X.slots[sid]; s = null; }
  const fresh = !s;
  if (fresh || !(K.pxrEvery > 1 && (s._n = (s._n || 0) + 1) % K.pxrEvery)) { X.pixels(key, t, o || {}, sid); s = X.slots[sid]; if (fresh) { s._mg = mg; if (!(o && o.noBoot)) X.poke(sid, 'built'); } if (s.cx) s.cx.putImageData(s.img, 0, 0); }
  if (s.cv) { const sm = x.imageSmoothingEnabled; x.imageSmoothingEnabled = false; x.drawImage(s.cv, SX + ax * 4, SY + ay * 4, s.cv.width * 4, s.cv.height * 4); x.imageSmoothingEnabled = sm; }
  return s;
};
// kick one of a stage's lights (index as declared with sc.light) for a moment: a flash, a win glow
K.pxrFlash = (id, i, a) => { const s = M.PXR && M.PXR.slots['_mg:' + id]; if (s) s.flash(i, a); };
// ───────── lifecycle ─────────
G.miniStart = function (kind, o) {
  const D = MINI[kind]; if (!D) return false; const run = this.run;
  const mg = this.mini = Object.assign({ kind, D, t: 0, pt: 0, phase: 'idle', title: D.title || '', text: D.text || '', col: D.col || '#ffe08a', img: D.img || 'star', keys: {}, msg: null, mx: 960, my: 540 }, o || {});
  mg.P = run && this.node ? this.runP(this.node) : 10; mg.pay = M.nice(mg.P * 8); mg.luck = run ? run.mods.eventLuck || 0 : 0;
  // a placeholder modal keeps the explorer, pad cursor and hotkeys in 'window open' mode while the game runs
  this.modal = { kind: 'event', title: mg.title, img: mg.img, at: now(), choices: [], mini: 1 };
  try { D.init && D.init.call(this, mg); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('mini init ' + kind + ': ' + e.message); this.mini = null; this.modal = null; return false; }
  S.mini('_', 'start'); this.tipData = null; this.bump(); return true;
};
G.miniSet = function (phase) { const mg = this.mini; if (mg) { mg.phase = phase; mg.pt = 0; } };
G.miniSay = function (text, col, big) { const mg = this.mini; if (mg) mg.msg = { text, col: col || '#ffe08a', t: 0, big: !!big }; };
G.miniFinish = function (text, col, gains) { const mg = this.mini; this.mini = null; if (!this.modal) this.modal = { kind: 'event', title: mg.title, img: mg.img, at: now(), choices: [] }; else Object.assign(this.modal, { title: mg.title, img: mg.img }); this.evResult(text, col, gains); };
G.miniBattle = function (type) { const n = this.node; this.mini = null; this.modal = null; n.type = type || 'normal'; this.trans = { kind: 'out', t: 0, node: n }; S.mini('_', 'battle'); this.fx.kick(20); this.bump(); };
G.miniPay = function (v) { const run = this.run; if (run.wallet < v) { this.deny('积分不够', '#d0453c'); return false; } this.hold('wallet', run.wallet); run.wallet -= v; this.release('wallet'); S.mini('_', 'pay'); return true; };
// rewards shared by the games
K.item = (run, P) => run.items.indexOf(null) >= 0 ? { k: 'item', key: M.pick(Object.keys(M.ITEMS)), q: M.rollTier2(run) } : { k: 'wallet', v: M.nice(P * 4) };
K.bp = (style, qUp) => ({ k: 'bp', key: M.dropBp(null, style, qUp) });
G.giveExp = function (v, from) { const run = this.run; this.hold('rexp', run.loot.exp); run.loot.exp += v; this.fly('orb', from || { x: 960, y: 500 }, 'rexp', '#9cff7a', () => this.release('rexp')); return '经验 +' + v; };
G.giveShards = function (v, from) { const run = this.run; run.loot.shards = run.loot.shards || 0; this.hold('rshard', run.loot.shards); run.loot.shards += v; this.fly('shard', from || { x: 960, y: 500 }, 'rshard', '#d8a0ff', () => this.release('rshard')); return '灵魂碎片 +' + v; };
G.buffRun = function (k, v, label, col) { const run = this.run; if (k === 'unitAtk' || k === 'heroAtk' || k === 'mult') run.runBuff[k] = (run.runBuff[k] || 0) + v; else run.mods[k] = (run.mods[k] || 0) + v; this.fx.pop(960, 420, label, col || '#ffcc33', 54); S.mini('_', 'buff'); return label; };
// ───────── frame: dim, stage, title plate, flavour text, message banner ─────────
// 入场分层：压暗 → 机箱从上落下弹一下（0.38 秒）→ 招牌砸下（0.36 秒起）→ 舞台里的灯一盏盏亮（像素舞台的 boot）
const dropY = (mg) => (M.PJ && M.PJ.reduced ? 0 : -K.snap(90 * (1 - eb(mg.t / 0.38))));
function frameBegin(x, mg) {
  const a = cl(mg.t / 0.25, 0, 1), D = mg.D, sh = mg.sh || {};
  x.save(); x.globalAlpha = a * 0.84; K.R(x, 0, 0, 1920, 1080, '#07060f'); x.restore();
  x.save(); x.globalAlpha = cl(mg.t / 0.12, 0, 1); x.translate(sh.sx || 0, dropY(mg) + (sh.sy || 0));
  x.fillStyle = D.bg ? D.bg(x) : K.LG(x, 0, SY, 0, SY + SH, [[0, '#1a1640'], [1, '#0d0b1e']]); x.fillRect(SX, SY, SW, SH);
  x.save(); x.beginPath(); x.rect(SX, SY, SW, SH); x.clip();
}
// 机箱框：像素铁皮（4 倍格）——斜面、本玩法颜色的enamel 边、四角包铁和铆钉、一圈跑马灯泡、右下硬投影；标题是压在上沿的招牌灯箱
const BZ = 6, BW = SW / 4 + BZ * 2, BH = SH / 4 + BZ * 2;   // bezel ring (art px) round the 300×175 stage
const BZ_R = ['sand', 'red', 'pink', 'candy', 'ice', 'teal', 'gold', 'arcane', 'leaf', 'brass', 'copper', 'crimson', 'tile', 'fire', 'lav', 'bone', 'magic'];
const nearRamp = (col, list) => { const X = M.PXR, h = (c) => { const n = parseInt(String(c).slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }, a = h(pc(col)); let best = list[0], bd = 1e9;
  list.forEach(r => { const R = X.RAMPS[r]; if (!R) return; const b = h(R[Math.min(R.length - 1, 7)]), d = (a[0] - b[0]) ** 2 * 0.3 + (a[1] - b[1]) ** 2 * 0.59 + (a[2] - b[2]) ** 2 * 0.11; if (d < bd) { bd = d; best = r; } }); return best; };
function bezelDef(ramp) {
  const X = M.PXR, key = '_mg_bezel_' + ramp; if (!X || X.has(key)) return key;
  X.def(key, { size: [BW, BH], fy: BH, clear: 1, noFrame: 1, noFloor: 1, amb: [0.52, 0.34],
    paint(S, sc) {
      const TX = X.TX; S.lay('back'); const ring = (x, y) => x < BZ || y < BZ || x >= BW - BZ || y >= BH - BZ;
      for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) { if (!ring(x, y)) continue; const edge = x === 0 || y === 0 || x === BW - 1 || y === BH - 1, inner = !ring(x - 1, y) || !ring(x + 1, y) || !ring(x, y - 1) || !ring(x, y + 1);
        let tn = 4.2 + ((x * 7 + y * 3) % 5 === 0 ? -0.6 : 0) + (x + y) % 9 * 0.04, n = [0, 0];
        if (edge) { S.px(x, y, 'ink', 0); continue; }
        if (y === 1 || x === 1) { tn = 7.5; n = [-0.6, -0.6]; } else if (y === BH - 2 || x === BW - 2) { tn = 2.4; n = [0.6, 0.6]; }
        if (inner) { S.px(x, y, ramp, 7.5, { n: [0, -0.5] }); continue; }
        const nearIn = !ring(x - 2, y) || !ring(x + 2, y) || !ring(x, y - 2) || !ring(x, y + 2); if (nearIn) { S.px(x, y, ramp, 4.5); continue; }
        S.px(x, y, 'iron', tn, { n }); }
      // corner plates with rivets
      [[0, 0], [BW - 12, 0], [0, BH - 12], [BW - 12, BH - 12]].forEach(([x, y]) => { S.beg(); S.box(x + 1, y + 1, 11, 11, 'iron', 6, { bev: 1 }); for (let yy = y + 1; yy < y + 12; yy++) for (let xx = x + 1; xx < x + 12; xx++) if (!ring(xx, yy)) S.px(xx, yy, 'iron', 6); S.end({ none: 1 }); TX.rivet(S, x + 3, y + 3, 'iron', 7); TX.rivet(S, x + 8, y + 8, 'iron', 7); });
      sc.light({ x: BW / 2, y: -40, z: 60, r: 400, i: 0.35, c: '#fff0d0', tint: 0.2 });
    },
    anim(D, t, rs, o) {
      // chase bulbs along the middle of the ring: dark glass when off, the lamp colour (a glowing pixel with a hot core) when on
      const L = o.L, per = 2 * (BW - 26 + BH - 26), n = Math.round(per / 11), sp = (L && L.sp) || 1, strobe = L && L.strobe ? Math.floor(t * 3) % 2 : -1, m = o.lamp || 'lamp';
      for (let i = 0; i < n; i++) { let d = i / n * per, x, y; if (d < BW - 26) { x = 13 + d; y = 2; } else if ((d -= BW - 26) < BH - 26) { x = BW - 4; y = 13 + d; } else if ((d -= BH - 26) < BW - 26) { x = BW - 13 - d; y = BH - 4; } else { d -= BW - 26; x = 2; y = BH - 13 - d; }
        x = Math.round(x); y = Math.round(y); const on = strobe >= 0 ? (i + strobe) % 2 === 0 : (Math.floor(t * 6 * sp) + i) % 3 === 0;
        D.rect(x, y, 2, 2, on ? m : 'iron', on ? 10 : 2.5, { e: on ? 255 : 0 }); D.px(x, y, on ? m : 'iron', on ? 11 : 4, { e: on ? 255 : 0 }); }
    } });
  return key;
}
function frameDeco(x, mg) {
  const a = cl(mg.t / 0.12, 0, 1), sh = mg.sh || {}; x.save(); x.globalAlpha = a; x.translate(sh.sx || 0, dropY(mg) + (sh.sy || 0));
  const ink = '#07060f', X = M.PXR;
  K.R(x, SX + SW + 24, SY - 12, 12, SH + 48, ink); K.R(x, SX - 12, SY + SH + 24, SW + 48, 12, ink);   // hard shadow, right and below
  if (X) { const L = K.lampFx, key = bezelDef(mg.bzR || (mg.bzR = nearRamp(mg.col, BZ_R))), lamp = L && L.col ? nearRamp(L.col, ['lamp', 'red', 'pink', 'teal', 'gold', 'arcane', 'leaf', 'ice', 'fire', 'candy']) : 'lamp';
    const s = X.pixels(key, mg.t, { L, lamp }, '_mg:bezel') && X.slots['_mg:bezel']; if (s && s.cx) { s.cx.putImageData(s.img, 0, 0); x.imageSmoothingEnabled = false; x.drawImage(s.cv, SX - BZ * 4, SY - BZ * 4, BW * 4, BH * 4); } }
  // the title sign slams down onto the top edge
  const mt = mg.t - 0.24; if (mt > 0 && U) { const q = cl(mt / 0.14, 0, 1), k = q < 1 ? 1.9 - 0.9 * eb(q) : 1; x.save(); x.translate(CX, SY - 6); x.scale(k, k); x.translate(-CX, -(SY - 6)); U.marquee(x, mg.title, CX, SY - 6, { size: 52, t: mg.t, minW: 380 }); x.restore(); }
  // the rule line sits on a dark strip so it reads over a detailed stage
  if (mg.text && U) { const w = K.snap(U.measure(x, mg.text, 26) + 48); x.save(); x.globalAlpha *= 0.75; K.R(x, CX - w / 2, SY + 54, w, 40, '#0d0b1e'); x.restore(); K.R(x, CX - w / 2, SY + 94, w, 4, ink); K.TX(x, mg.text, CX, SY + 74, 26, '#a9a3c9'); }
  // 提示条：小面板，顶边一道本条颜色
  const m = mg.msg; if (m) { const q = cl(m.t / 0.25, 0, 1), fade = cl((m.big ? 3 : 2.2) - m.t, 0, 1), y = SY + SH - 64; if (fade > 0 && U) { x.globalAlpha = fade; const size = m.big ? 44 : 32, w = (U.measure(x, m.text, size) + 72) * eb(q), h = size + 30; U.box(x, CX - w / 2, y - h / 2, w, h, '#1a1640'); K.R(x, CX - w / 2, y - h / 2, w, 6, m.col); K.R(x, CX - w / 2, y + h / 2 - 6, w, 6, '#0d0b1e'); if (q > 0.7) U.text(x, m.text, CX, y + 2, size, m.col, { outline: m.big }); x.globalAlpha = 1; } }
  x.restore();
}
// the stage is painted at art resolution (pixel look, like the rest of the game); frame, title and text stay crisp on top.
// SHOW 的镜头：聚光 / 逐拍 / 揭晓的推镜头只推舞台内容；震屏整台机箱一起动（按 4 像素格取整）
M.drawMini = function (ctx, g) {
  const mg = g.mini; if (!mg || g.reel) return;
  const L = M.pixelMode ? M.pxLayer('mini', 1920, 1080) : null, x = L ? L.getContext('2d') : ctx;
  if (L) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, 1920, 1080); }
  frameBegin(x, mg); const SW_ = M.SHOW, pz = SW_ && SW_.push(mg);
  x.save(); if (pz && pz.k !== 1) { x.translate(pz.x, pz.y); x.scale(pz.k, pz.k); x.translate(-pz.x, -pz.y); }
  try { mg.D.draw.call(g, x, mg); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('mini ' + mg.kind + ': ' + e.message); } x.restore();
  try { SW_ && SW_.draw(x, mg); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('show ' + mg.kind + ': ' + e.message); }
  // D.front: what is being revealed stays bright on top of the show's dim and rays (same camera as D.draw)
  if (mg.D.front) { x.save(); if (pz && pz.k !== 1) { x.translate(pz.x, pz.y); x.scale(pz.k, pz.k); x.translate(-pz.x, -pz.y); } try { mg.D.front.call(g, x, mg); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('mini ' + mg.kind + ': ' + e.message); } x.restore(); }
  x.restore(); x.restore();
  if (L) { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.drawImage(L, 0, 0, L.width, L.height, 0, 0, 1920, 1080); ctx.restore(); }
  frameDeco(ctx, mg);
};
// ───────── input ─────────
const padHeld = () => { try { const P = M.settings.pad, gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean); return !!(gp && P && gp.buttons[P.confirm] && gp.buttons[P.confirm].pressed); } catch (e) { return false; } };
G.miniPt = function (cx, cy) { const st = this.ui.stage(); if (!st) return { x: 960, y: 540 }; const r = st.getBoundingClientRect(), s = this.ui.scale(); return { x: (cx - r.left) / s, y: (cy - r.top) / s }; };
// D.down may return false: the press was not for the game (then the framework's empty-stage feedback runs)
G.miniDown = function (x, y, src) { const mg = this.mini; if (!mg || this.reel) return false; mg.mx = x; mg.my = y; if (mg.D.down) { mg.holding = src; const used = mg.D.down.call(this, mg, x, y, src); this.bump(); if (used === false) { mg.holding = null; return false; } return true; } return false; };
// a click on the stage the game did not use: a ripple and a light tick (feedback floor: nothing is ever dead to the touch)
G.miniTap = function (x, y) { const mg = this.mini; if (!mg || this.reel || !M.SHOW || x < SX || y < SY || x > SX + SW || y > SY + SH) return; M.SHOW.tap(this, mg, x, y); this.bump(); };
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
  if (this.mini && !this.reel && this.cur) { const p = this.stageToClient(this.cur.x, this.cur.y), el = p && document.elementFromPoint(p.x, p.y); if (!(el && el.closest && el.closest('[data-minibtn]'))) { if (this.miniDown(this.cur.x, this.cur.y, 'pad')) return; this.miniTap(this.cur.x, this.cur.y); } }
  return oldCC.call(this);
};
const oldTick = G.tick;
G.tick = function (dt) {
  if (!this._miniInit) { this._miniInit = 1;
    window.addEventListener('pointerdown', (e) => { if (e.pointerId === 77 || !this.mini || this.reel) return; if (e.target && e.target.closest && e.target.closest('[data-minibtn]')) return; const p = this.miniPt(e.clientX, e.clientY); if (this.miniDown(p.x, p.y, 'ptr')) e.preventDefault(); else this.miniTap(p.x, p.y); }, true);
    ['pointerup', 'pointercancel'].forEach(n => window.addEventListener(n, (e) => { if (e.pointerId === 77) return; this.miniUp('ptr'); }, true));
    window.addEventListener('pointermove', (e) => { if (!this.mini) return; const p = this.miniPt(e.clientX, e.clientY); this.mini.mx = p.x; this.mini.my = p.y; }, true);
  }
  oldTick.call(this, dt);
  const mg = this.mini;
  if (!mg) M.MK.lampFx = null;
  if (mg && !this.reel && !this.fx.frozen) { const d0 = Math.min(dt, 0.05), d = d0 * (M.SHOW ? M.SHOW.slowK(mg) : 1); if (M.SHOW) M.SHOW.tick(this, mg, d0); if (M.SHOW && M.SHOW.frozen(mg)) { this.bump(); return; }   // 卡帧：整个小玩法停住
    if (!mg.signed && mg.t + d0 >= 0.38) { mg.signed = 1; if (M.SHOW) M.SHOW.shake(mg, 6); S.mini('_', 'slam', 0); }
    mg.t += d0; mg.pt += d; if (mg.msg) mg.msg.t += d0; if (mg.holding === 'pad' && !padHeld()) this.miniUp('pad'); if (this.cur && M.inputMode(this) === 'pad' && this.cur.shown) { mg.mx = this.cur.x; mg.my = this.cur.y; } try { mg.D.tick && mg.D.tick.call(this, mg, d); } catch (e) { (window.__mcErrs = window.__mcErrs || []).push('mini ' + mg.kind + ': ' + e.message); } this.bump(); }
};
// ───────── view: buttons ─────────
const oldView = G.view;
G.view = function () {
  const v = oldView.call(this), mg = this.mini;
  v.miniOn = !!mg && !this.reel;
  if (mg) { v.modalOn = false; v.tipOn = false; v.coachOn = false; if (!this.reel) v.coverOn = true;
    const bs = mg.D.btns ? mg.D.btns.call(this, mg) || [] : [];
    v.mini = { btns: bs.map(b => ({ t: b.t, sub: b.sub || '', hasSub: !!b.sub, op: b.dis ? 0.45 : 1, k: b.dis ? 'dis' : b.gold ? 'gold' : b.danger ? 'red' : 'dark', bg: b.dis ? '#15111a' : b.gold ? 'linear-gradient(180deg,#ffe08a,#d4982e)' : b.danger ? 'linear-gradient(180deg,#e05a4a,#8a2020)' : 'linear-gradient(180deg,#2e2436,#1a1420)', color: b.dis ? '#6b6570' : b.gold ? '#1a0e08' : '#f5ead4', border: b.dis ? '#2a2230' : b.gold ? '#fff3c4' : b.danger ? '#ff9a8a' : '#8a6a3a', glow: b.gold && !b.dis ? 'rgba(255,200,90,0.45)' : 'rgba(0,0,0,0)',
      onClick: () => { if (!this.mini) return; if (b.dis) { this.deny(b.why || '现在不行', '#8d8496'); return; } M.Sfx.click(); b.fn(); this.bump(); } })) };
  }
  return v;
};
M.EVMINI = {}; // event key -> mini kind

// ═════════════════════ 挖矿 · push your luck ═════════════════════
// 小游戏里的界面件（设计稿 §11.5，b / c / d 共用）：招牌小牌、居中标签、卡框、方块计数灯、弹跳大字
const C = M.PJ.PAL, T = U.T;
const SIGN = { wine: [C.wine, C.red, C.umber, C.butter], gold: [C.gold, C.butter, C.amber, C.ink], indigo: [C.indigo, C.dusk, C.night, C.butter], red: [C.red, C.pink, C.wine, C.ink], teal: [C.teal, C.ice, C.tealDeep, C.ink], dark: [C.abyss, C.dusk, C.ink, C.gold] };
K.sign = (x, s, cx, cy, o = {}) => { const size = o.size || T.btn, k = SIGN[o.kind || 'wine'], pad = Math.round(size * 0.6), w = Math.max(o.minW || 0, Math.ceil(U.measure(x, s, size, o.num)) + pad * 2), h = o.h || Math.round(size * 1.45), X = Math.round(cx - w / 2), Y = Math.round(cy - h / 2);
  K.R(x, X + 3, Y + 3, w + 6, h + 6, C.ink); U.box(x, X, Y, w, h, k[0]); K.R(x, X, Y, w, 3, k[1]); K.R(x, X, Y + h - 6, w, 6, k[2]); if (o.ring) K.RR(x, X, Y, w, h, 0, null, o.ring, 3);
  U.text(x, s, cx, cy - 2, size, o.col || k[3], { num: o.num, shadow: k[3] !== C.ink }); return { x: X, y: Y, w, h }; };
K.chipC = (x, s, cx, cy, col, size) => { size = size || T.cap; return U.chip(x, s, cx, Math.round(cy - Math.round(size * 1.6) / 2), col, { size, align: 'center' }); };
K.card = (x, a, b, w, h, ring, hov, fill) => { a = Math.round(a); b = Math.round(b); const k = hov ? 6 : 3; K.R(x, a + 6, b + 6, w + 6, h + 6, C.ink); U.box(x, a, b, w, h, fill || C.night); K.R(x, a, b, w, k, ring); K.R(x, a, b + h - k, w, k, ring); K.R(x, a, b, k, h, ring); K.R(x, a + w - k, b, k, h, ring); };
K.pip = (x, a, b, s, col) => { const h = Math.round(s / 2), X = Math.round(a) - h, Y = Math.round(b) - h, f = col ? pc(col) : C.indigo; U.box(x, X, Y, s, s, f); if (col && M.PJ.shades) K.R(x, X, Y, s, 3, M.PJ.shades(f).hi); };
K.pop = (t) => (M.PJ.reduced || !(t >= 0) || t >= 0.5 ? 1 : 1 + 0.45 * Math.exp(-t * 11) * Math.cos(t * 26));   // 砸下来回弹，连续
K.big = (x, s, a, b, size, col, t, o) => { const k = K.pop(t); x.save(); x.translate(Math.round(a), Math.round(b)); if (k !== 1) x.scale(k, k); U.text(x, s, 0, 0, size, col, Object.assign({ outline: size >= 52 }, o)); x.restore(); };
MINI.mine = { title: '废弃矿坑', img: 'u_pick', col: C.tan, text: '岩壁里闪着光。每挖一镐，头顶的石头就松一分。',
  init(mg) { mg.digs = 0; mg.pile = []; mg.cracks = []; mg.seed = rnd() * 100; mg.rocks = [...Array(26)].map((_, i) => ({ x: SX + 80 + rnd() * (SW - 160), y: SY + 110 + rnd() * 330, r: 30 + rnd() * 50, c: ['#3a2e26', '#2e241e', '#443629'][i % 3] })); mg.fall = []; mg.dust = []; },
  risk(mg) { return cl(0.05 + mg.digs * 0.085 - mg.luck * 0.3, 0.03, 0.8); },
  table(mg) { const d = mg.digs, run = this.run, P = mg.P; return [
    { n: '煤块', ic: 'sack', c: C.steel, w: 40, g: () => ({ k: 'rsup', v: 10 + d * 4 }) },
    { n: '银矿石', ic: 'coin', c: C.silver, w: 26, g: () => ({ k: 'wallet', v: M.nice(P * 2.5) }) },
    { n: '金矿石', ic: 'coin', c: C.gold, w: 12 + d * 3, g: () => ({ k: 'wallet', v: M.nice(P * 6) }) },
    { n: '魔晶', ic: 'gem', c: C.violet, w: 6 + d * 2, g: () => K.item(run, P) },
    { n: '古代图纸', ic: 'scroll', c: C.butter, w: 4 + d * 2, g: () => K.bp() }]; },
  dig(mg) { const r = MINI.mine.risk(mg); mg.collapse = rnd() < r; mg.next = M.wpick(MINI.mine.table.call(this, mg), o => o.w); mg.hit = false; this.miniSet('swing');
    // 风险一高，这一镐就是一次紧张：压暗、聚光罩住坑、心跳，镐子挥得慢一点
    if (r >= 0.3) { M.SHOW.reach(this, mg, { x: CX + 60, y: SY + 290, r: 170, lv: r >= 0.55 ? 2 : 1, label: '危险！', col: C.red }); M.SHOW.slowmo(mg, 0.55, 0.9); } },
  btns(mg) { if (mg.phase !== 'idle') return []; const r = Math.round(MINI.mine.risk(mg) * 100);
    return [{ t: '挖一镐', sub: '塌方风险 ' + r + '%', gold: 1, fn: () => MINI.mine.dig.call(this, mg) }, { t: '收工离开', leave: 1, sub: mg.pile.length ? '带走 ' + mg.pile.length + ' 样东西' : '什么也不拿', fn: () => { if (!mg.pile.length) return this.miniFinish('你拍掉身上的灰，离开了矿坑。', '#8d8496'); this.miniFinish('你背着 ' + mg.pile.map(p => p.n).join('、') + ' 爬出了矿坑。', '#e0904a', mg.pile.map(p => p.g())); } }]; },
  tick(mg, dt) {
    const ox = CX + 60, oy = SY + 290;
    if (mg.phase === 'swing') {
      if (!mg.hit && mg.pt > 0.3) { mg.hit = true; S.mini('mine', 'pick'); this.fx.kick(6 + mg.digs); this.fx.spark(ox - 40, oy, '#ffd080', 14, { dir: Math.PI, spread: 1.4, v: 700 }); for (let i = 0; i < 3 + mg.digs; i++) mg.cracks.push({ a: rnd() * 6.28, l: 40 + rnd() * (60 + mg.digs * 25), w: 1 + rnd() * 2 }); }
      if (mg.pt > 0.7) {
        if (mg.collapse) { this.miniSet('collapse'); S.mini('mine', 'cavein'); M.SHOW.lose(this, mg); this.fx.kick(16); this.fx.flash('#ffffff', 0.15); for (let i = 0; i < 22; i++) mg.fall.push({ x: SX + 60 + rnd() * (SW - 120), y: SY - rnd() * 300, vy: 200 + rnd() * 300, r: 18 + rnd() * 40, rot: rnd() * 6, c: ['#4a3a2e', '#3a2e26', '#5a4838'][i % 3] }); }
        else { const o = mg.next; mg.digs++; mg.pile.push(o); mg.ore = { o, t: 0 }; this.miniSet('idle'); S.mini('mine', 'gem'); S.mini('mine', 'loosen', MINI.mine.risk(mg));
          const tier = { 煤块: 1, 银矿石: 1, 金矿石: 2, 魔晶: 2, 古代图纸: 3 }[o.n] || 1; M.SHOW.win(this, mg, tier, { x: ox, y: oy, col: o.c, label: o.n }); this.miniSay('挖到了 ' + o.n + '！', o.c, tier >= 3); }
      }
    }
    if (mg.ore) mg.ore.t += dt;
    if (mg.phase === 'collapse') { mg.fall.forEach(f => { f.vy += 1400 * dt; f.y += f.vy * dt; f.rot += dt * 3; if (f.y > FLOOR - f.r * 0.5) { f.y = FLOOR - f.r * 0.5; f.vy *= -0.2; } });
      if (mg.pt > 1.0 && !mg.done) { mg.done = true; const lost = mg.pile.map(p => p.n); this.heroHurt(0.12); this.miniFinish('矿坑塌了！你被埋了半截才爬出来。' + (lost.length ? '挖到的 ' + lost.join('、') + ' 全埋在了下面。' : ''), '#d0453c'); } }
    const r = MINI.mine.risk(mg); if (rnd() < r * 0.6) mg.dust.push({ x: SX + 40 + rnd() * (SW - 80), y: SY, v: 60 + rnd() * 80, t: 0 }); mg.dust.forEach(d => { d.y += d.v * dt; d.t += dt; }); mg.dust = mg.dust.filter(d => d.y < FLOOR);
  },
  draw(x, mg) {
    const t = mg.t, ox = CX + 60, oy = SY + 290, r = MINI.mine.risk(mg);
    x.fillStyle = K.LG(x, 0, SY, 0, SY + SH, [[0, '#2a1e18'], [1, '#120c0a']]); x.fillRect(SX, SY, SW, SH);
    mg.rocks.forEach(k => { K.EL(x, k.x, k.y, k.r, k.r * 0.7, k.c); K.EL(x, k.x - k.r * 0.2, k.y - k.r * 0.25, k.r * 0.5, k.r * 0.3, 'rgba(255,220,180,0.05)'); });
    for (let i = 0; i < 18; i++) { const a = mg.seed + i * 2.1, px = SX + 120 + ((i * 97) % (SW - 240)), py = SY + 120 + ((i * 61) % 320); K.GL(x, px, py, 14, [C.gold, C.violet, C.silver][i % 3], 0.25 + 0.2 * Math.sin(t * 2 + a)); K.R(x, px - 2, py - 2, 4, 4, [C.gold, C.violet, C.silver][i % 3]); }
    // the hole grows with every swing
    const hr = 50 + mg.digs * 16; K.EL(x, ox, oy, hr + 10, hr * 0.8 + 8, '#1a120e'); K.EL(x, ox, oy, hr, hr * 0.78, K.RG(x, ox, oy, 4, hr, [[0, '#000'], [1, '#150e0b']]));
    // 裂纹：3px 硬线，风险高了变红
    x.save(); x.globalAlpha *= 0.6; x.strokeStyle = r > 0.4 ? C.red : C.ink; x.lineWidth = 3; x.lineCap = 'square'; mg.cracks.forEach(c => { x.beginPath(); let px = ox + Math.cos(c.a) * hr, py = oy + Math.sin(c.a) * hr * 0.78; x.moveTo(px, py); for (let s = 1; s <= 4; s++) { px += Math.cos(c.a + Math.sin(s * 3 + c.l) * 0.5) * c.l / 4; py += Math.sin(c.a + Math.cos(s * 2 + c.l) * 0.5) * c.l / 4; x.lineTo(px, py); } x.stroke(); }); x.restore();
    if (mg.ore && mg.ore.t < 1.4) { const q = eb(mg.ore.t / 0.4), o = mg.ore.o; K.GL(x, ox, oy, 120, o.c, 0.8 * (1 - mg.ore.t / 1.4)); K.IC(x, o.ic, ox, oy - q * 30, 90 * q); }
    // floor + hero
    K.R(x, SX, FLOOR, SW, SH - (FLOOR - SY), '#1a120e'); K.R(x, SX, FLOOR, SW, 4, '#4a3a2e');
    const hx = CX - 260, sw = mg.phase === 'swing' ? (mg.pt < 0.3 ? -1.9 + mg.pt / 0.3 * 2.6 : 0.7 - (mg.pt - 0.3) * 1.5) : -0.5 + Math.sin(t * 2) * 0.1;
    K.SP(x, M.HEROES[this.run.hero.cls].sprite, hx, FLOOR, 170);
    x.save(); x.translate(hx + 40, FLOOR - 110); x.rotate(sw); K.IC(x, 'u_pick', 60, 0, 110); x.restore();
    K.GL(x, hx + 20, FLOOR - 140, 160, '#ffcf80', 0.35); // head lamp
    // 塌方风险条：小机箱面板上的墨槽，按格切，底绿、中金、顶红
    const gx = SX + SW - 90, gy = SY + 110, gh = 380, fh = Math.round(gh * r); U.plate(x, gx - 30, gy - 66, 96, gh + 132, { shadow: 9, rivets: false }); U.box(x, gx, gy, 36, gh, C.ink);
    [[0, C.green], [1 / 3, C.gold], [2 / 3, C.red]].forEach(([z, c]) => { const y0 = gy + gh - Math.round(gh * z), y1 = Math.max(gy + gh - fh, gy + gh - Math.round(gh * (z + 1 / 3))); if (y1 < y0) K.R(x, gx, y1, 36, y0 - y1, c); });
    if (fh > 0) K.R(x, gx, gy + gh - fh, 36, 3, C.butter); for (let k = gy + gh - 38; k > gy; k -= 38) K.R(x, gx, k, 36, 3, C.ink);
    K.IC(x, 'r_skel', gx + 18, gy - 34, 44); U.text(x, Math.round(r * 100) + '%', gx + 18, gy + gh + 30, T.item, r > 0.4 ? C.red : C.gold, { num: true });
    mg.dust.forEach(d => K.R(x, d.x, d.y, 3, 3, 'rgba(200,180,150,0.6)'));
    // haul：底部一排小格，顶边是矿石的颜色
    mg.pile.forEach((p, i) => { const px = SX + 70 + i * 86, py = FLOOR + 50; U.box(x, px - 36, py - 36, 72, 72, C.abyss); K.R(x, px - 36, py - 36, 72, 6, p.c); K.IC(x, p.ic, px, py + 3, 52); });
    if (mg.phase === 'collapse') { K.R(x, SX, SY, SW, SH, 'rgba(7,6,15,' + Math.floor(cl(mg.pt / 0.84, 0, 1) * 4) / 4 * 0.7 + ')'); mg.fall.forEach(f => { x.save(); x.translate(f.x, f.y); x.rotate(f.rot); K.EL(x, 0, 0, f.r, f.r * 0.75, f.c); K.EL(x, -f.r * 0.25, -f.r * 0.25, f.r * 0.4, f.r * 0.25, 'rgba(255,220,180,0.08)'); x.restore(); }); if (mg.pt > 0.6) K.big(x, '塌方！', CX, SY + 300, 120, C.red, mg.pt - 0.6); }
  } };

// ═════════════════════ 转盘 · roulette ═════════════════════
// 地下赌场的一张赌桌（mc-minipx-a.js 的 _mg_roul_back / _mg_roul_front，荷官站在两层之间）：斜着看下去的轮盘，小球反着轮盘转、
// 撞铜挡片弹两下、落进格子，最后几格一格一格跳。结果和概率不变：mg.ang 仍是「小球相对轮盘的位置」，和以前的指针一样算格子。
const RSEC = [...Array(14)].map((_, i) => i === 0 ? 'g' : i === 7 ? 'x' : i % 2 ? 'r' : 'b');
const RLP = () => M.ROUL_PX, RST = Math.PI * 2 / 14;
const ballPhi = (mg) => ((((-Math.PI / 2 - mg.ang) % (Math.PI * 2)) + Math.PI * 4) % (Math.PI * 2));   // ball angle in the wheel's frame
const ballXY = (mg) => { const P = RLP(), b = mg.ball; return { x: K.lx(P.WX + Math.cos(b.a) * b.r * P.WRX), y: K.ly(P.WY + Math.sin(b.a) * b.r * P.WRY - (b.h || 0)) }; };
const spotAt = (x, y) => { const P = RLP(); for (const k of ['r', 'b', 'g']) { const [cx, cy] = P.spots[k]; if (Math.abs(K.ax(x) - cx) / 19 + Math.abs(K.ay(y) - cy) / 9 <= 1) return k; } return null; };
MINI.roulette = { title: '午夜转盘', img: 'e_wheel', col: C.red, text: '荷官没有脸。转盘上的小球一直在跳，好像在等你下注。',
  init(mg) { mg.ang = rnd() * 6.28; mg.spins = 0; mg.max = 3; mg.net = 0; mg.hist = []; mg.lastSec = -1; mg.rot = rnd() * 6.28; mg.spin = 0.35; mg.ball = { a: 0, r: 0.83, h: 0 }; mg.idleA = rnd() * 6.28; mg.flying = []; mg.stack = null; mg.cro = { st: 'idle', t0: 0 }; mg.histT = 9; },
  spin(mg, bet) {
    const stake = mg.pay; if (!this.miniPay(stake)) return; mg.net -= stake; mg.bet = bet; M.SHOW.calm(mg); M.SHOW.ambient(mg, null);
    let tg = Math.floor(rnd() * 14); if (mg.luck > 0 && rnd() < mg.luck && RSEC[tg] !== bet) tg = Math.floor(rnd() * 14);
    const st = RST, j = (rnd() - 0.5) * st * 0.5; let af = -Math.PI / 2 - (tg + 0.5) * st - j; while (af < mg.ang + Math.PI * 2 * 5) af += Math.PI * 2;
    // 结果已定；只挑演法：押金时停在金格上或旁边 → 超级听牌（旁边就是「擦过」）；押红黑时中了的四成、没中的一成半演一次普通听牌
    const win = RSEC[tg] === bet, dg = Math.min(tg, 14 - tg);
    mg.reachLv = bet === 'g' ? (dg <= 1 ? 2 : 0) : (win ? rnd() < 0.4 : rnd() < 0.15) ? 1 : 0;
    mg.near = bet === 'g' && dg === 1;
    mg.cr = mg.reachLv >= 2 ? 5 : mg.reachLv ? 4 : 3;                                  // 最后几格一格一格跳
    mg.tg = tg; mg.a0 = mg.ang; mg.af = af; mg.a1 = af - mg.cr * st; mg.TA = 2.6; mg.starts = [0]; for (let i = 1; i < mg.cr; i++) mg.starts.push(mg.starts[i - 1] + 0.16 + 0.1 * i + (mg.reachLv && i === mg.cr - 1 ? 0.35 : 0));
    mg.dur = mg.TA + mg.starts[mg.cr - 1] + 0.25; mg.step = -1; mg.reached = false; mg.clacks = 0; mg.glowSec = null;
    // five chips slide on to the spot, one clack each; the croupier shoves the wheel, then flicks the ball the other way
    const P = RLP(), [sx, sy] = P.spots[bet]; mg.stack = { x: sx, y: sy, n: 0, m: bet }; mg.flying = [];
    for (let k = 0; k < 5; k++) M.SHOW.later(mg, k * 0.06, () => mg.flying.push({ x: sx + (rnd() - 0.5) * 30, y: 182, tx: sx, ty: sy - k * 2, t: 0, m: { r: 'red', b: 'iron', g: 'gold' }[bet] }));
    mg.spin = 7.5; mg.cro = { st: 'cast', t0: mg.t }; M.SHOW.later(mg, 0.5, () => { mg.cro = { st: 'attack', t0: mg.t }; });
    M.SHOW.press(this, mg, 'spot' + bet, K.lx(sx), K.ly(sy), { r: C.red, b: C.steel, g: C.gold }[bet]);
    this.miniSet('spin'); S.mini('roulette', 'bet'); S.mini('roulette', 'spin'); this.fx.kick(2);
  },
  btns(mg) { if (mg.phase !== 'idle') return []; const left = mg.max - mg.spins, poor = this.run.wallet < mg.pay, over = left <= 0;
    const b = (t, k, sub) => ({ t, sub: sub + ' · ' + mg.pay, dis: poor || over, why: over ? '荷官收起了转盘' : '积分不够', fn: () => MINI.roulette.spin.call(this, mg, k) });
    return [b('押红', 'r', '×2'), b('押黑', 'b', '×2'), b('押金', 'g', '×10'), { t: '离开', leave: 1, sub: '还能转 ' + left + ' 次', gold: over, fn: () => this.miniFinish(mg.net > 0 ? '你赢走了 ' + M.fmt(mg.net) + ' 积分。荷官的笑容僵住了。' : mg.net < 0 ? '转盘吃掉了你 ' + M.fmt(-mg.net) + ' 积分。' : '你看了一会儿，没有下注。', mg.net > 0 ? '#ffcc33' : '#8d8496') }]; },
  // 直接点桌面上的下注位也能下注（和按键一样）；点别处交给框架
  down(mg, x, y, src) {
    const k = src === 'key' ? null : spotAt(x, y); if (!k) return src === 'key' ? undefined : false;
    const b = (MINI.roulette.btns.call(this, mg) || []).find(b => b.t === { r: '押红', b: '押黑', g: '押金' }[k]); if (!b) return true;
    if (b.dis) { this.deny(b.why, '#8d8496'); return true; } S.click(); b.fn(); return true;
  },
  tick(mg, dt) {
    const P = RLP(), SHW = M.SHOW; mg.winT = mg.winT == null ? -1 : mg.winT; mg.histT += dt;
    // the wheel keeps turning (fast after a shove, slowing down); chips fly on to the spot
    mg.spin += (0.35 - mg.spin) * Math.min(1, dt * 0.55); mg.rot += mg.spin * dt;
    mg.flying.forEach(f => { f.t += dt / 0.18; const q = eo(f.t); f.x = f.x + (f.tx - f.x) * Math.min(1, q); f.y = 182 + (f.ty - 182) * q - Math.sin(Math.min(1, f.t) * Math.PI) * 6; if (f.t >= 1) { f.done = true; if (mg.stack) mg.stack.n++; S.mini('roulette', 'click'); SHW.burst(mg, K.lx(f.tx), K.ly(f.ty), 3, { col: C.cream, sp: [40, 100], life: [0.15, 0.3] }); } });
    mg.flying = mg.flying.filter(f => !f.done);
    if (mg.rake) { mg.rake.t += dt / 0.45; const q = eo(mg.rake.t), [rx, ry] = P.rack; if (mg.stack) { mg.stack.x = mg.rake.x0 + (rx - mg.rake.x0) * q; mg.stack.y = mg.rake.y0 + (ry - mg.rake.y0) * q; } if (mg.rake.t >= 1) { mg.stack = null; mg.rake = null; } }
    SHW.hover(this, mg, 'spots', mg.phase === 'idle' && !!spotAt(mg.mx, mg.my)); mg.hovSpot = mg.phase === 'idle' ? spotAt(mg.mx, mg.my) : null;
    if (mg.phase !== 'spin') {   // 待机：小球自己在外轨上慢慢跳（「好像在等你下注」）
      mg.idleA += dt * 0.9; mg.ball = { a: mg.rot * 0.2 + mg.idleA, r: 0.83, h: Math.abs(Math.sin(mg.idleA * 3)) * 2 };
      return; }
    const pt = mg.pt, st = RST;
    if (pt < mg.TA) { const p = pt / mg.TA; mg.ang = mg.a0 + (mg.a1 - mg.a0) * (1 - Math.pow(1 - p, 3)); }
    else { let k = 0; while (k + 1 < mg.cr && pt >= mg.TA + mg.starts[k + 1]) k++;
      if (k !== mg.step) { mg.step = k; SHW.crawl(this, mg, k); }
      mg.ang = mg.a1 + st * (k + eb(cl((pt - mg.TA - mg.starts[k]) / 0.14, 0, 1))); }
    // the ball: flies round the outer track, drops off it (two clacks on the brass diamonds), then hops pocket to pocket
    const p = pt / mg.TA, phi = ballPhi(mg);
    let r = 0.83, h = 0; if (p > 0.68) { const q = cl((p - 0.68) / 0.22, 0, 1); r = 0.83 - 0.2 * eo(q); h = Math.abs(Math.sin(q * Math.PI * 2.5)) * 5 * (1 - q); }
    if (p >= 1) { const k = mg.step, u = cl((pt - mg.TA - mg.starts[Math.max(0, k)]) / 0.14, 0, 1); r = 0.63; h = Math.sin(u * Math.PI) * 3; }
    mg.ball = { a: mg.rot + phi, r, h, trail: p < 0.6 ? 1 : 0 };
    [0.72, 0.8].forEach((c, i) => { if (p >= c && mg.clacks === i) { mg.clacks++; S.mini('roulette', 'click'); const b = ballXY(mg); SHW.burst(mg, b.x, b.y, 6, { col: C.gold, sp: [120, 300], life: [0.15, 0.35] }); SHW.shake(mg, 2); } });
    if (mg.reachLv && !mg.reached && pt > mg.TA - 0.5) { mg.reached = true; const b = ballXY(mg); SHW.reach(this, mg, { x: b.x, y: b.y, r: 110, lv: mg.reachLv, label: mg.reachLv >= 2 ? '金格！' : '听牌！', col: mg.reachLv >= 2 ? C.gold : C.red }); if (mg.reachLv >= 2) mg.cro = { st: 'charge', t0: mg.t }; }
    if (mg.sh && mg.sh.tense) { const b = ballXY(mg); mg.sh.tense.x = b.x; mg.sh.tense.y = b.y; }
    const sec = Math.floor(phi / st); if (sec !== mg.lastSec) { mg.lastSec = sec; if (p > 0.85) S.mini('roulette', 'click'); }
    if (pt >= mg.dur) { mg.ang = mg.af; mg.spins++; const r0 = RSEC[mg.tg]; mg.hist.push(r0); mg.histT = 0; mg.glowSec = mg.tg; const win = r0 === mg.bet ? (r0 === 'g' ? 10 : 2) : 0, b = ballXY(mg);
      if (win) { const v = mg.pay * win; mg.net += v; mg.winT = mg.t; SHW.win(this, mg, r0 === 'g' ? 4 : 1, { x: b.x, y: b.y, v, col: r0 === 'g' ? C.gold : C.red, label: r0 === 'g' ? '×10' : '×2' });
        mg.cro = { st: r0 === 'g' ? 'death' : 'hurt', t0: mg.t };   // 荷官输钱一抖；押金中了，他的脸裂开
        SHW.later(mg, r0 === 'g' ? 0.7 : 0.1, () => this.award([{ k: 'wallet', v }], { x: K.lx(RLP().spots[mg.bet][0]), y: K.ly(RLP().spots[mg.bet][1]) })); SHW.later(mg, r0 === 'g' ? 0.8 : 0, () => this.miniSay(r0 === 'g' ? '金色！×10！' : '中了！×2', '#ffcc33', r0 === 'g')); if (r0 === 'g') S.mini('roulette', 'gold'); else S.mini('roulette', 'win');
        SHW.later(mg, 0.3, () => { if (mg.stack) mg.stack.n = Math.min(12, mg.stack.n * win); }); }
      else if (r0 === 'x') { this.heroHurt(0.05); SHW.lose(this, mg); this.miniSay('骷髅格：庄家通吃，还咬了你一口', '#ff5a4a'); S.mini('roulette', 'skull'); mg.skullT = mg.t; mg.cro = { st: 'recover', t0: mg.t }; if (mg.stack) mg.rake = { t: 0, x0: mg.stack.x, y0: mg.stack.y }; SHW.shake(mg, 6); }
      else if (mg.near) { SHW.near(this, mg, b.x, b.y, '擦过金格！'); this.miniSay('就差一格', '#8d8496'); S.mini('roulette', 'miss'); if (mg.stack) mg.rake = { t: 0, x0: mg.stack.x, y0: mg.stack.y }; }
      else { SHW.lose(this, mg); this.miniSay({ r: '红', b: '黑', g: '金' }[r0] + '色，没中', '#8d8496'); S.mini('roulette', 'miss'); if (mg.stack) mg.rake = { t: 0, x0: mg.stack.x, y0: mg.stack.y }; }
      this.miniSet('idle'); }
  },
  // the croupier's pose: a state of his pixel module and the time into it (the jackpot holds on the crack)
  croFrame(mg) { const c = mg.cro, d = mg.t - c.t0, L = { cast: 0.5, attack: 0.75, charge: 9, hurt: 0.8, recover: 0.7, death: 1.2 }[c.st]; if (c.st === 'death') return ['death', Math.min(d, 1.2)]; if (c.st !== 'idle' && d > L) { mg.cro = { st: 'idle', t0: mg.t }; return ['idle', 0]; } return [c.st, c.st === 'idle' ? mg.t : d]; },
  draw(x, mg) {
    const P = RLP(), t = mg.t, sk = mg.skullT != null && t - mg.skullT < 0.8;
    const o = { rot: mg.rot, spin: mg.spin, ball: mg.ball, glowSec: mg.glowSec != null && mg.winT >= 0 && t - mg.winT < 3 ? mg.glowSec : mg.glowSec === 7 && sk ? 7 : null, glow: mg.winT >= 0 && t - mg.winT < 2.5 ? 1.2 * (1 - (t - mg.winT) / 2.5) : 0, skull: sk ? 1.4 * (1 - (t - mg.skullT) / 0.8) : 0,
      hist: mg.hist, histT: mg.histT, stack: mg.stack, flying: mg.flying, bet: mg.phase === 'spin' ? mg.bet : null, hov: mg.hovSpot };
    K.pxr(x, '_mg_roul_back', 0, 0, t, o, 'roul_b');
    // the croupier stands between the curtain and the table (his pixel module; the table hides him from the waist down)
    if (M.PCDG && M.PCDG.has('croupier')) { const [st, tt] = MINI.roulette.croFrame(mg), fi = Math.floor(tt * 12 + 1e-6), c = M.PCDG.bodyFrame('croupier', st, fi); if (c) { const sm = x.imageSmoothingEnabled; x.imageSmoothingEnabled = false; x.drawImage(c, Math.round(K.lx(P.cr[0]) - c.cx), Math.round(K.ly(P.cr[1]) - c.footY)); x.imageSmoothingEnabled = sm; } }
    K.pxr(x, '_mg_roul_front', 0, 0, t, o, 'roul_f');
    // the net on the board's plate, the spots' multipliers on the felt (crisp)
    U.text(x, (mg.net >= 0 ? '+' : '') + M.fmt(mg.net), K.lx(P.board[0] + 17), K.ly(P.board[1] + 82), 20, mg.net >= 0 ? C.gold : C.red, { num: true, align: 'center' });
    [['r', '×2'], ['b', '×2'], ['g', '×10']].forEach(([k, s]) => U.text(x, s, K.lx(P.spots[k][0]), K.ly(P.spots[k][1] + 13), 20, k === 'g' ? C.butter : C.cream, { align: 'center' }));
  } };

// ═════════════════════ 水果机 · slot machine ═════════════════════
// 舞台是后街游戏厅角落里的一台老虎机（mc-minipx-a.js 的 _mg_fruit：霓虹 LUCKY 777、GOGO 灯、圆柱滚筒、墙上的赔率板、出币盘、拉杆、插在墙上的电源线）。
// 规则和概率不变；拉杆也能直接点。硬币真的掉进出币盘，一局下来越堆越高。
const SW8 = [30, 26, 18, 12, 6, 8], STRIP = M.FRUIT_STRIP = [0, 1, 2, 0, 3, 1, 4, 0, 2, 5, 1, 3];
const FRP = () => M.FRUIT_PX, fReelX = (i) => K.lx((FRP().RW[i][0] + FRP().RW[i][1]) / 2), fLineY = () => K.ly(FRP().line);
const fKnob = (mg) => { const P = FRP(), la = 0.18 + (mg.lever || 0) * 2.2; return { x: K.lx(P.lever[0] + Math.sin(la) * 34), y: K.ly(P.lever[1] - Math.cos(la) * 34) }; };
// the pay board's rows: 7 ×25 · BAR ×10 · 铃铛 ×6 · 三连水果 ×4 · 两颗樱桃 ×2 · 骷髅 伤身
const PAYT = ['×25', '×10', '×6', '×4', '2个 ×2', '伤身'];
const payRow = (r) => { const same = r[0] === r[1] && r[1] === r[2]; if (same) return r[0] === 4 ? 0 : r[0] === 3 ? 1 : r[0] === 2 ? 2 : r[0] === 5 ? 5 : 3; if (r.filter(v => v === 0).length >= 2) return 4; if (r.filter(v => v === 5).length === 2) return 5; return null; };
MINI.fruit = { title: '水果机', img: 'e_fruit', col: C.magenta, text: '一台还插着电的老虎机。投币口旁边刻着：三个七，带你回家。',
  init(mg) { mg.reels = [0, 1, 2].map(() => ({ pos: Math.floor(rnd() * 12), f: 0, s0: 0, done: true, bt: 9, sf: 0 })); mg.pulls = 0; mg.max = 5; mg.lever = 0; mg.win = 0; mg.flash = 0; mg.gogo = 0; mg.winT = -1; mg.winK = []; mg.drops = []; mg.pile = 0; mg.dark = 0; mg.ins = null; mg.payHit = null; },
  // 结果在拉杆这一刻就定了（概率不变）；下面只挑怎么演：听牌、差一格、先告灯
  pull(mg) {
    if (!this.miniPay(mg.pay)) return; mg.pulls++; mg.win = 0; mg.winT = -1; mg.winK = []; mg.payHit = null; M.SHOW.calm(mg); M.SHOW.ambient(mg, null);
    const kn = fKnob(mg); M.SHOW.press(this, mg, 'lever', kn.x, kn.y, C.red); M.SHOW.shake(mg, 4); M.SHOW.zoom(mg, 0.015, K.lx(150), fLineY()); mg.ins = 0;
    let res = [0, 1, 2].map(() => M.wpick([0, 1, 2, 3, 4, 5], i => SW8[i])); if (mg.luck && rnd() < mg.luck) res[2] = res[1] = res[0];
    const same = res[0] === res[1] && res[1] === res[2];
    mg.reachLv = res[0] === res[1] && res[0] !== 5 ? (res[0] === 4 ? 2 : 1) : 0;   // 前两个一样（骷髅不算）就听牌；两个 7 是超级听牌
    mg.nearMiss = !!mg.reachLv && !same;
    mg.gogo = same && res[0] >= 2 && res[0] <= 4 && rnd() < 1 / 3 ? 0.001 : 0;       // 先告灯：铃铛以上的中奖，三分之一的机会拉杆时就亮
    mg.res = res; mg.resolved = false; mg.nudge = -1;
    mg.reels.forEach((r, i) => {
      let js = STRIP.map((s, j) => s === res[i] ? j : -1).filter(j => j >= 0);
      // 差一格：第三轮停下时，想要的图案正好在中线下面一格——再挪一格就中
      if (i === 2 && mg.nearMiss) { const nj = js.filter(j => STRIP[(j + 1) % 12] === res[0]); if (nj.length) js = nj; else mg.nearMiss = false; }
      // 照卡皮：三个轮错开 0.12 秒起转，全速转（约 13 格/秒），到点正好转到结果那格猛地停住
      const j = M.pick(js); r.j = j; r.s0 = r.pos; r.go = i * 0.12; r.d = 0.9 + i * 0.45; let f = Math.ceil(r.pos + 13 * (r.d - r.go - 0.06) - 6); while (((f % 12) + 12) % 12 !== j) f++; r.f = f; r.mode = 'ease'; r.done = false; r.bt = 9;
    });
    this.miniSet('spin'); S.mini('fruit', 'lever'); S.mini('fruit', 'spin'); mg.stopped = 0; this.fx.kick(2);
  },
  // 听牌：第三个轮从正在减速的状态重新加速到两倍、拖出残影，最后一格一格挪进来
  reach(mg) {
    // n 格一格一格挪：每一格之间的停顿越来越长，最后一格前停得最久
    const r = mg.reels[2], lv = mg.reachLv, n = lv >= 2 ? 7 : 5, fast = lv >= 2 ? 2.0 : 1.3, starts = [0];
    for (let i = 1; i < n; i++) starts.push(starts[i - 1] + 0.17 + 0.08 * i + (i === n - 1 ? 0.3 : 0));
    r.mode = 'reach'; r.t0 = mg.pt; r.s0 = r.pos; r.starts = starts; r.n = n; r.Tc = fast; r.D = fast + starts[n - 1] + 0.14; r.step = -1;
    let f = Math.floor(r.s0 + fast * 17) + n; while (((f % 12) + 12) % 12 !== r.j) f++; r.f = f;
    M.SHOW.reach(this, mg, { x: fReelX(2), y: fLineY(), r: 120, lv, label: lv >= 2 ? '777 REACH' : '听牌！' });
  },
  btns(mg) { if (mg.phase !== 'idle') return []; const over = mg.pulls >= mg.max; return [{ t: '拉杆', sub: mg.pay + ' 积分 · 剩 ' + (mg.max - mg.pulls) + ' 次', gold: !over, dis: over || this.run.wallet < mg.pay, why: over ? '机器吐出一张「今日已满」' : '积分不够', fn: () => MINI.fruit.pull.call(this, mg) }, { t: '离开', leave: 1, gold: over, fn: () => this.miniFinish(mg.total > 0 ? '机器吐了 ' + M.fmt(mg.total) + ' 积分给你。' : '机器吞掉了你的硬币，发出满足的嗡嗡声。', mg.total > 0 ? '#ffcc33' : '#8d8496') }]; },
  // 拉杆也能直接抓：点拉杆 / 空格 = 拉一下；点别处不算（框架给点空白的反馈）
  onLever(mg, x, y) { const kn = fKnob(mg), P = FRP(); return x > K.lx(P.lever[0]) - 44 && x < kn.x + 48 && y > kn.y - 48 && y < K.ly(P.lever[1] + 14); },
  down(mg, x, y, src) {
    if (src !== 'key' && !MINI.fruit.onLever(mg, x, y)) return false;
    const b = (MINI.fruit.btns.call(this, mg) || [])[0]; if (!b) return true;
    if (b.dis) { this.deny(b.why, '#8d8496'); return true; } S.click(); b.fn(); return true;
  },
  tick(mg, dt) {
    const SHW = M.SHOW;
    mg.lever = mg.phase === 'spin' ? (mg.pt < 0.08 ? mg.pt / 0.08 : Math.max(0, 1 - (mg.pt - 0.08) / 0.35)) : 0; mg.flash = Math.max(0, mg.flash - dt); mg.dark = Math.max(0, mg.dark - dt * 1.5); mg.reels.forEach(r => { r.bt += dt; r.sf = Math.max(0, (r.sf || 0) - dt * 5); });
    if (mg.ins != null) { mg.ins += dt * 4; if (mg.ins >= 1) mg.ins = null; }
    SHW.hover(this, mg, 'lever', mg.phase === 'idle' && mg.pulls < mg.max && MINI.fruit.onLever(mg, mg.mx, mg.my));
    // coins drop out of the chute and land on the pile (art px)
    const top = 138 - Math.floor(Math.min(96, mg.pile) / 16); mg.drops.forEach(c => { c.vy += 420 * dt; c.x += c.vx * dt; c.y += c.vy * dt; if (c.y >= top && c.vy > 0) { c.done = true; mg.pile++; S.mini('fruit', 'drop', mg.pile); } }); mg.drops = mg.drops.filter(c => !c.done);
    // 先告灯 GOGO：拉杆后一亮就一定是铃铛以上
    if (mg.gogo && mg.gogo < 1 && mg.phase === 'spin' && mg.pt > 0.3) { mg.gogo = 1; mg.gogoT = mg.t; SHW.omen(this, mg, 3); S.mini('fruit', 'gogo'); const P = FRP(), gx = K.lx(P.gogo[0]), gy = K.ly(P.gogo[1]); SHW.white(mg, 0.3); SHW.flash(mg, C.gold, 0.2); SHW.shake(mg, 8); SHW.ring(mg, gx, gy, 10, 180, C.gold, { w: 2, life: 0.45 }); SHW.burst(mg, gx, gy, 26, { col: C.gold, sp: [200, 600], life: [0.3, 0.7] }); SHW.rays(mg, gx, gy, C.gold, { n: 12, life: 0.9, r: 300 }); this.fx.kick(6); }
    if (mg.phase !== 'spin') return;
    mg.reels.forEach((r, i) => {
      if (r.done) return;
      const stop = (big) => { r.pos = r.f; r.done = true; r.bt = 0; r.sf = 1; mg.stopped++; S.mini('fruit', 'stop', i); this.fx.kick(big ? 5 : 3); SHW.shake(mg, 3 + i * 1.5 + (big ? 3 : 0)); SHW.ring(mg, fReelX(i), fLineY(), 10, 80, C.cream, { life: 0.25 }); SHW.burst(mg, fReelX(i), K.ly(FRP().ry0), 5, { col: C.gold, sp: [60, 160], ang: -Math.PI / 2, spread: 1.2, life: [0.2, 0.4] }); };
      if (r.mode === 'ease') { const u = cl(mg.pt - r.go, 0, r.d - r.go), R = 0.12, v = (r.f - r.s0) / (r.d - r.go - R / 2); r.pos = r.s0 + (u < R ? v * u * u / (2 * R) : v * (u - R / 2));
        if (mg.pt >= r.d) { stop(false); if (i === 1 && mg.reachLv) MINI.fruit.reach.call(this, mg); } }
      else if (r.mode === 'reach') { const tt = mg.pt - r.t0;
        if (tt < r.Tc) r.pos = r.s0 + (r.f - r.n - r.s0) * (tt / r.Tc);
        else { let k = 0; while (k + 1 < r.n && tt >= r.Tc + r.starts[k + 1]) k++;
          if (k !== r.step) { r.step = k; SHW.crawl(this, mg, k); }
          r.pos = r.f - r.n + k + eb(cl((tt - r.Tc - r.starts[k]) / 0.12, 0, 1)); }
        if (tt >= r.D) { stop(true); if (mg.nearMiss) mg.nudge = 0; } }
    });
    // 差一格：第三轮往上蹭了一下，又落回去
    if (mg.nudge >= 0) { mg.nudge += dt; const r = mg.reels[2], q = cl(mg.nudge / 0.42, 0, 1); r.pos = r.f + 0.34 * Math.sin(q * Math.PI) * (1 - q * 0.3); if (q >= 1) { r.pos = r.f; mg.nudge = -1; mg.nudged = true; } else return; }
    if (mg.stopped >= 3 && !mg.resolved) {
      mg.resolved = true;
      const r = mg.res, c = (k) => r.filter(v => v === k).length, same = r[0] === r[1] && r[1] === r[2], P = mg.pay, X0 = K.lx(150), wy = fLineY(); let v = 0, bp = false, text = '', tier = 0, win = [];
      if (same && r[0] === 4) { v = P * 25; bp = true; text = '777！大奖！'; tier = 4; } else if (same && r[0] === 3) { v = P * 10; text = '三个 BAR ×10'; tier = 3; } else if (same && r[0] === 2) { v = P * 6; text = '三个铃铛 ×6'; tier = 2; } else if (same && r[0] < 2) { v = P * 4; text = '三连水果 ×4'; tier = 2; } else if (same && r[0] === 5) { this.heroHurt(0.15); text = '三个骷髅……'; S.mini('fruit', 'skulls'); } else if (c(0) >= 2) { v = P * 2; text = '两颗樱桃 ×2'; tier = 1; } else if (c(5) === 2) { this.heroHurt(0.06); text = '两个骷髅，机器电了你一下'; S.mini('fruit', 'skulls'); } else { text = '没中'; S.mini('fruit', 'nomatch'); }
      if (same) win = [0, 1, 2]; else if (tier === 1) win = [0, 1, 2].filter(i => r[i] === 0);
      mg.payHit = payRow(r);
      if (v) { mg.total = (mg.total || 0) + v; mg.winT = mg.t; mg.winK = win; mg.flash = 1.2 + tier * 0.4;
        win.forEach((i, k) => SHW.later(mg, 0.06 * k, () => SHW.pop(mg, 'r' + i, { k0: 0.6 })));
        const later = tier === 4 ? 0.7 : 0.15; SHW.later(mg, later, () => this.award([{ k: 'wallet', v }].concat(bp ? [K.bp()] : []), { x: X0, y: wy }));
        SHW.win(this, mg, tier, { x: X0, y: wy, v, col: tier >= 3 ? C.gold : C.magenta, label: tier === 4 ? '大奖' : tier === 3 ? '大赢' : tier === 2 ? '×' + v / P : '' });
        // the machine pays out for real: coins drop into the tray (777 overflows and sprays the stage)
        const n = [0, 4, 10, 18, 36][tier]; for (let k = 0; k < n; k++) SHW.later(mg, (tier === 4 ? 0.6 : 0.12) + k * 0.05, () => mg.drops.push({ x: 146 + rnd() * 8, y: 129, vx: (rnd() - 0.5) * 60, vy: 5 + rnd() * 20 }));
        if (tier === 4) SHW.later(mg, 0.7, () => SHW.burst(mg, K.lx(150), K.ly(134), 70, { ramp: [C.white, C.butter, C.gold, C.amber], sp: [300, 900], ang: -Math.PI / 2, spread: 2.2, g: 900, drag: 0.6, life: [0.9, 1.5], size: [2, 3] }));
        if (tier === 4) S.mini('fruit', 'jackpot'); else S.mini('fruit', 'win'); }
      else if (same && r[0] === 5 || c(5) === 2) { // 骷髅：机身冒电火花、灯一黑、领袖被电一下（一拍带过）
        mg.dark = same ? 0.6 : 0.4; S.mini('fruit', 'zap'); SHW.lose(this, mg); SHW.shake(mg, same ? 10 : 6); SHW.flash(mg, C.teal, 0.3);
        [FRP().x0, FRP().x1].forEach(ax => SHW.burst(mg, K.lx(ax), K.ly(80), same ? 16 : 10, { ramp: [C.white, C.ice, C.teal, C.tealDeep], sp: [250, 700], life: [0.12, 0.3], h: 160 })); }
      else if (mg.nudged) { SHW.near(this, mg, fReelX(2), wy + 110, '差一格！'); text = '差一格就是' + (r[0] === 4 ? ' 777' : '三连') + '！'; }
      else SHW.lose(this, mg);
      mg.nudged = false;
      const say = () => this.miniSay(text, v ? '#ffcc33' : same && r[0] === 5 ? '#ff5a4a' : '#8d8496', tier >= 3); if (tier === 4) SHW.later(mg, 0.75, say); else say();   // 大奖：字砸下来之后再出提示，不剧透
      this.miniSet('idle');
    }
  },
  draw(x, mg) {
    const t = mg.t, P = FRP(), sh = mg.sh || {}, SHW = M.SHOW;
    const reels = mg.reels.map((r, i) => { const reachSpin = r.mode === 'reach' && !r.done && mg.pt - r.t0 < r.Tc, fast = mg.phase === 'spin' && !r.done && (r.mode === 'reach' ? reachSpin : mg.pt >= r.go + 0.06), won = mg.winK.includes(i) && mg.winT >= 0 && t - mg.winT < 3;
      return { pos: r.pos - M.curve(M.CURVE.stop, r.bt) * 6, fast, win: won, k: SHW.xf(mg, 'r' + i).k, sf: r.sf, reachSpin }; });
    const lv = SHW.xf(mg, 'lever');
    K.pxr(x, '_mg_fruit', 0, 0, t, { reels, flash: mg.flash > 0 ? 1 : 0, tense: !!sh.tense, gogo: mg.gogo >= 1, neon: sh.tense && sh.tense.lv >= 2 ? 'strobe' : 'on', dark: mg.dark, payHit: mg.winT >= 0 && t - mg.winT < 3 ? mg.payHit : null,
      ins: mg.ins, pile: mg.pile, drops: mg.drops, lever: mg.lever, sway: mg.phase === 'idle' ? Math.sin(t * 1.6) * 0.03 : 0, leverW: lv.white, knob: lv.k, L: K.lampFx }, 'fruit');
    // the third reel re-accelerating for a reach glows through (flat, in hard steps)
    const r2 = reels[2]; if (r2.reachSpin) { x.save(); x.globalAlpha = Math.round((0.25 + 0.15 * Math.sin(t * 40)) * 8) / 8; K.R(x, K.lx(P.RW[2][0]), K.ly(P.ry0), (P.RW[2][1] - P.RW[2][0]) * 4, (P.ry1 - P.ry0) * 4, mg.reachLv >= 2 ? C.red : C.gold); x.restore(); }
    // the pay board's multipliers and the LCD's pulls left (crisp text over the pixels)
    PAYT.forEach((s, i) => { const on = mg.payHit === i && mg.winT >= 0 && t - mg.winT < 3; U.text(x, s, K.lx(P.pay.tx), K.ly(P.pay.y + i * P.pay.dy), 22, on ? C.gold : i === 5 ? C.red : C.pink, { align: 'center' }); });
    U.text(x, '剩余 ' + (mg.max - mg.pulls), K.lx(P.lcd[0] + P.lcd[2] / 2), K.ly(P.lcd[1] + P.lcd[3] / 2), 20, C.lime, { align: 'center', shadow: false });
  } };

// ═════════════════════ 抓娃娃 · claw machine ═════════════════════
// 夜里游戏厅的粉色机箱（mc-minipx-a.js 的 _mg_claw_back / _mg_claw_front）：柜里坐着真的像素部队（播待机动画），爪子下面的投影落在娃娃堆上，
// 对准的娃娃描一圈它的品质色。抓取的概率和坐标不变；大红按钮也能直接按；抓到的娃娃从取奖口翻着跟头跳出来。
const CLP = () => M.CLAW_PX;
const clawTarget = (mg) => { let best = -1, bd = 999; mg.prizes.forEach((p, i) => { if (p.gone || p.falling) return; const d = Math.abs(p.x - mg.cx) + Math.max(0, (FLOOR - p.y) - 60) * 0.3; if (d < bd) { bd = d; best = i; } }); return bd < 60 ? best : -1; };
const qRgb = (q) => { const h = U.pal(M.QUALITY[q] ? M.QUALITY[q].c : C.white), n = parseInt(h.slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
MINI.claw = { title: '抓娃娃机', img: 'e_claw', col: C.pink, text: '玻璃柜里塞满了玩偶——仔细看，每一只都是会动的部队。',
  init(mg) { const run = this.run, seen = new Set(); mg.prizes = []; for (let i = 0; i < 24 && mg.prizes.length < 6; i++) { const t = M.pickUnitQ(run); if (seen.has(t)) continue; seen.add(t); mg.prizes.push({ type: t, q: M.DB[t].q, x: 0, y: 0, rot: (rnd() - 0.5) * 0.5, vy: 0, ph: rnd() * 3 }); }
    const L = SX + 380, Rr = SX + SW - 120; mg.prizes.forEach((p, i) => { p.x = L + 40 + (i % 3) * ((Rr - L - 80) / 2) + (rnd() - 0.5) * 40 + (i >= 3 ? 70 : 0); p.y = FLOOR - 10 - (i >= 3 ? 70 : 0); });
    mg.prizes.sort((a, b) => a.y - b.y);
    mg.tries = 0; mg.max = 3; mg.cx = CX; mg.cy = SY + 130; mg.open = 1; mg.hold = -1; mg.got = []; mg.sw = 0; mg.swv = 0; mg.vx = 0; mg.press = 0; mg.door = 0; mg.pop = null; },
  box: { L: SX + 360, R: SX + SW - 80, T: SY + 110 },
  drop(mg) { if (!this.miniPay(mg.pay)) return; mg.tries++; const dx = mg.cx; let best = -1, bd = 999; mg.prizes.forEach((p, i) => { if (p.gone) return; const d = Math.abs(p.x - dx) + Math.max(0, (FLOOR - p.y) - 60) * 0.3; if (d < bd) { bd = d; best = i; } });
    const p = best >= 0 ? mg.prizes[best] : null; let ch = !p ? 0 : bd < 16 ? 0.85 : bd < 32 ? 0.6 : bd < 50 ? 0.3 : 0; if (p) ch = cl(ch - p.q * 0.08 + mg.luck, 0, 0.95);
    mg.tgt = p && bd < 60 ? best : -1; mg.succ = rnd() < ch; mg.dx = dx; mg.ty = p && bd < 60 ? p.y - 80 : FLOOR - 40; this.miniSet('down'); S.mini('claw', 'drop');
    // the button goes down, the claw brakes hard and swings on its cable, the motor whines
    const P = CLP(); mg.press = 1; M.SHOW.press(this, mg, 'btn', K.lx(P.btn[0]), K.ly(P.btn[1]), C.red); mg.swv += -mg.vx * 0.004; M.SHOW.shake(mg, 3); S.mini('claw', 'move'); },
  btns(mg) { if (mg.phase !== 'idle') return []; const over = mg.tries >= mg.max; return [{ t: '放爪！', sub: mg.pay + ' 积分 · 剩 ' + (mg.max - mg.tries) + ' 次 · 空格', gold: !over, dis: over || this.run.wallet < mg.pay, why: over ? '机器没电了' : '积分不够', fn: () => MINI.claw.drop.call(this, mg) }, { t: '离开', leave: 1, gold: over, fn: () => this.miniFinish(mg.got.length ? '你抱着 ' + mg.got.join('、') + ' 离开了娃娃机。' : '一个都没抓到。爪子好像是松的。', mg.got.length ? '#ff8ac0' : '#8d8496') }]; },
  // the big red button on the cabinet works like the key; any other click is the framework's
  down(mg, x, y) { const P = CLP(); if (Math.abs(K.ax(x) - P.btn[0]) > 12 || Math.abs(K.ay(y) - P.btn[1]) > 9) return false; const b = (MINI.claw.btns.call(this, mg) || [])[0]; if (!b) return true; if (b.dis) { this.deny(b.why, '#8d8496'); return true; } S.click(); b.fn(); return true; },
  tick(mg, dt) {
    const top = SY + 130, B = MINI.claw.box, SHW = M.SHOW, x0 = mg.cx;
    if (mg.phase === 'idle') { mg.cx = (B.L + 60) + (B.R - B.L - 120) * (0.5 + 0.5 * Math.sin(mg.t * 1.6)); mg.cy = top; mg.open = 1; }
    if (mg.phase === 'down') { mg.cx = mg.dx; mg.cy = top + (mg.ty - top) * eio(mg.pt / 0.9); if (mg.pt >= 0.9) { this.miniSet('grab'); S.mini('claw', 'grab'); } }
    if (mg.phase === 'grab') { mg.open = 1 - cl(mg.pt / 0.35, 0, 1); if (mg.pt >= 0.35) { if (mg.tgt >= 0 && (mg.succ || rnd() < 0.7)) mg.hold = mg.tgt; this.miniSet('up'); S.mini('claw', mg.hold >= 0 ? 'lift' : 'empty');
      // 抓住了：娃娃被夹得一扁，聚光跟着它走，品质越高越紧张（传说是超级）；空爪：咔一声、一小团绒毛，一拍带过
      if (mg.hold >= 0) { const p = mg.prizes[mg.hold], o = SHW.obj(mg, 'p' + mg.hold); o.k = 0.8; o.kv = 3; o.w = 0.6; SHW.reach(this, mg, { x: p.x, y: p.y - 50, r: 120, lv: p.q >= 3 ? 2 : 1, label: '抓住了！', col: M.QUALITY[p.q].c }); SHW.burst(mg, mg.cx, mg.cy + 60, 8, { ramp: [C.white, C.pink, C.magenta, C.violetDeep], sp: [60, 160], life: [0.3, 0.6] }); }
      else { SHW.lose(this, mg); SHW.burst(mg, mg.cx, mg.cy + 60, 10, { ramp: [C.white, C.pink, C.lavender, C.haze], sp: [40, 120], life: [0.5, 0.9], g: 60, drag: 2 }); } } }
    if (mg.phase === 'up') { mg.cy = mg.ty + (top - mg.ty) * eio(mg.pt / 1.0); if (mg.hold >= 0 && !mg.succ && mg.pt > 0.45) { const p = mg.prizes[mg.hold]; p.vy = 0; mg.hold = -1; p.falling = true; S.mini('claw', 'slip'); SHW.near(this, mg, p.x, p.y - 40, '滑掉了！'); this.miniSay('滑掉了……', '#8d8496'); }
      if (mg.pt >= 1.0) { this.miniSet(mg.hold >= 0 ? 'move' : 'back'); } }
    if (mg.phase === 'move' && mg.pt < 0.02) SHW.slowmo(mg, 0.5, 1.2);   // 吊着往出口挪：慢动作
    if (mg.phase === 'move') { mg.cx = mg.dx + (SX + 200 - mg.dx) * eio(mg.pt / 0.8); if (mg.pt >= 0.8) { this.miniSet('release'); mg.open = 1; const p = mg.prizes[mg.hold]; p.falling = true; p.vy = 0; p.toChute = true; mg.hold = -1; mg.swv += 0.4; } }
    if (mg.phase === 'release' && mg.pt > 0.6) { const p = mg.prizes.find(p => p.toChute && !p.gone); if (p) { p.gone = true; const run = this.run, n = M.DB[p.type].n; if (M.canAdd(run, p.type)) { this.award([{ k: 'unit', type: p.type }], { x: SX + 200, y: FLOOR }); mg.got.push(n); this.miniSay('抓到了 ' + n + '！', M.QUALITY[p.q].c, true); } else { const v = M.nice(mg.P * 5); this.award([{ k: 'wallet', v }], { x: SX + 200, y: FLOOR }); mg.got.push(n + '（队伍满了，换成积分）'); this.miniSay('队伍满了，玩偶换成了 ' + v + ' 积分', '#ffcc33'); } S.mini('claw', 'prize');
      // the prize door flaps open and the doll tumbles out of it, turning more the better it is; then it flies off to the army
      const P = CLP(), dx = K.lx(P.door[0]), dy = K.ly(P.door[1] - 16); mg.door = 2.4; mg.pop = { type: p.type, q: p.q, t0: mg.t }; SHW.pop(mg, 'pop', { spin: p.q >= 4 ? 3 : p.q >= 2 ? 2 : 1, k0: 0.35 }); K.pxrFlash('claw_b', 5, 2.5);
      SHW.win(this, mg, cl(p.q + 1, 1, 4), { x: dx, y: dy, col: M.QUALITY[p.q].c, label: p.q >= 3 ? '传说' : p.q === 2 ? '大赢' : M.QUALITY[p.q].n });
      SHW.later(mg, 1.7, () => SHW.exit(this, mg, 'pop', { x: dx, y: dy, col: M.QUALITY[p.q].c, h: 360 })); SHW.later(mg, 2.2, () => { mg.pop = null; }); } this.miniSet('back'); }
    if (mg.phase === 'back') { mg.cx += ((B.L + 60) - mg.cx) * Math.min(1, dt * 3); mg.open = Math.min(1, mg.open + dt * 3); if (mg.pt > 0.7) this.miniSet('idle'); }
    if (mg.hold >= 0) { const p = mg.prizes[mg.hold]; p.x = mg.cx; p.y = mg.cy + 80; const T = mg.sh && mg.sh.tense; if (T) { T.x = p.x; T.y = p.y - 50; } }
    mg.prizes.forEach(p => { if (!p.falling || p.gone) return; p.vy += 1500 * dt; p.y += p.vy * dt; const fl = p.toChute ? FLOOR + 90 : FLOOR - 10; if (p.y >= fl) { p.y = fl; if (Math.abs(p.vy) > 200) { p.vy *= -0.3; S.mini('claw', 'bounce'); if (!p.toChute) SHW.burst(this.mini || mg, p.x, p.y, 6, { ramp: [C.white, C.pink, C.lavender, C.haze], sp: [40, 120], life: [0.3, 0.5] }); } else { p.vy = 0; p.falling = false; } } });
    // the cable swings: pushed by how fast the carriage moves, damped
    mg.vx = (mg.cx - x0) / Math.max(1e-3, dt); mg.swv += (-mg.sw * 60 - mg.vx * 0.0009 * (mg.phase === 'idle' ? 1 : 0)) * dt; mg.swv *= Math.exp(-dt * 2.2); mg.sw = cl(mg.sw + mg.swv * dt, -0.5, 0.5);
    mg.press = Math.max(0, mg.press - dt * 4); mg.door = Math.max(0, mg.door - dt);
  },
  key(mg, k, down) { if (k === 'act' && down && mg.phase === 'idle' && mg.tries < mg.max && this.run.wallet >= mg.pay) { MINI.claw.drop.call(this, mg); return true; } },
  // one doll: its idle loop (each at its own phase), squashed or turned by the show, an outline in its quality colour when the claw is over it
  doll(x, mg, p, i, X0, Y0, o) {
    const G = M.PCDG, key = M.artOf ? M.artOf(p.type) : p.type; if (!G || !G.has(key)) { K.SP(x, p.type, X0, Y0, 120); return; }   // an evolved unit is drawn as its line's character
    const b = G.body(key), fi = Math.floor((mg.t + p.ph) * 12) % (b.nIdle || 1), c = G.bodyFrame(key, 'idle', fi); if (!c) return;
    const xf = M.SHOW.xf(mg, o.id || 'p' + i); x.save(); x.translate(Math.round(X0 + xf.dx), Math.round(Y0 + xf.dy)); if (o.rot || xf.rot) x.rotate((o.rot || 0) + xf.rot); if (xf.k !== 1) { if (o.id) x.scale(xf.k, xf.k); else x.scale(xf.k, 2 - xf.k); }   // grabbed: pinched thin; popping out: whole x.globalAlpha *= xf.a; x.imageSmoothingEnabled = false;
    if (o.ring) { const q = G.bodyFrame(key, 'idle', fi, U.pal(o.ring)); if (q) [[-4, 0], [4, 0], [0, -4], [0, 4]].forEach(([a, bb]) => x.drawImage(q, a - q.cx, bb - q.footY)); }
    x.drawImage(c, -c.cx, -c.footY); if (xf.white > 0.3) { const w = G.bodyFrame(key, 'idle', fi, '#ffffff'); if (w) { x.globalAlpha *= Math.round(xf.white * 4) / 4; x.drawImage(w, -w.cx, -w.footY); } }
    x.restore();
  },
  draw(x, mg) {
    const t = mg.t, P = CLP(), sh = mg.sh || {}, tgt = mg.phase === 'idle' ? clawTarget(mg) : -1, held = mg.hold >= 0 ? mg.prizes[mg.hold] : null;
    const o = { cx: K.ax(mg.cx), cy: K.ay(mg.cy), open: mg.open, sway: mg.sw, shadow: mg.phase === 'idle', chute: mg.door > 1.4 ? (mg.door - 1.4) * 2.5 : 0, L: K.lampFx, press: Math.max(mg.press, M.SHOW.xf(mg, 'btn').k < 0.97 ? 1 : 0), door: mg.door > 0 ? 1 : 0, doorGlow: Math.min(1, mg.door), lean: cl(mg.vx / 400, -1, 1),
      glow: held ? 0.5 + held.q * 0.25 : 0, glowRgb: held ? qRgb(held.q) : null };
    K.pxr(x, '_mg_claw_back', 0, 0, t, o, 'claw_b');
    // a doll in the claw hangs with its head and shoulders between the prongs (drawn 60 px under its logical spot)
    mg.prizes.forEach((p, i) => { if (p.gone) return; MINI.claw.doll.call(this, x, mg, p, i, p.x, p.y + (mg.hold === i || p.toChute ? 60 : 0), { rot: p.rot + (mg.hold === i ? Math.sin(t * 8) * 0.15 : 0), ring: i === tgt || mg.hold === i ? M.QUALITY[p.q].c : null }); });
    K.pxr(x, '_mg_claw_front', 0, 0, t, o, 'claw_f');
    K.chipC(x, '出口', K.lx(P.chute[0]), K.ly(P.chute[1] - 14), C.pink);
    for (let i = 0; i < mg.max; i++) K.pip(x, K.lx(222) + i * 24, K.ly(163), 16, i < mg.max - mg.tries ? C.gold : null);
  },
  // the doll that just came out of the prize door: above the show's dim and rays
  front(x, mg) { const pp = mg.pop; if (!pp) return; const P = CLP(), q = eo(cl((mg.t - pp.t0) / 0.4, 0, 1)); MINI.claw.doll.call(this, x, mg, { type: pp.type, ph: 0 }, -1, K.lx(P.door[0]), K.ly(P.door[1]) - q * 110, { id: 'pop' }); },
};
})();

;
