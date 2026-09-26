// ==== mc-opening.js ====
(function () {
'use strict';
// 开场演出（docs/design.md §10.3）。三幕：雨夜公寓外景 → 漆黑走廊（手电、滚来的金币、墙上的影子）→ 恶魔脸老虎机
// （自己通电、自己拉杆、三只眼睛中奖、金币喷出、标题砸下）；镜头最后停在机台屏幕上，标题菜单的按钮就摆在屏幕里（mc-flow.js）。
// 主角「小夜」用像素角色引擎（pcd）画：分部件、自动明暗和分界线、机台亮起后吃青色轮廓光。
// 世界按 1 格 = 4 舞台像素画在小画布上，镜头裁一块放大到 1920×1080；文字、闪白、遮幅画在舞台上。
// 覆盖 M.drawIntro / M.INTRO_LEN / M.drawCabinet / M.cabScreen；演出里的声音按时间点触发（跳过后不再响）。
const M = window.MC, PCD = window.PCD, XU = M && M.UI;
if (!M || !PCD || !PCD.createEngine || !XU || typeof document === 'undefined') return;
const eng = PCD.createEngine({ game: true }), E = eng.E, PAL = E.PAL;
const { defMat, Sprite, begin, part, sp, run, rect, line, brush, ellipse, bake, q12 } = E;
const RGB = PAL.map((h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
const W = 1920, H = 1080, LW = 480, LH = 270;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, q) => a + (b - a) * q, seg = (s, a, b) => clamp((s - a) / (b - a), 0, 1);
const eIO = (q) => (q < 0.5 ? 4 * q * q * q : 1 - Math.pow(-2 * q + 2, 3) / 2), eOut = (q) => 1 - Math.pow(1 - q, 3), eIn = (q) => q * q * q;
const hsh = (a, b) => { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const still = () => !!(M.PJ && M.PJ.reduced);
function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return { c, x, w, h }; }
// CM：画静态图层时的换色表（闪电照亮的那一版用 LIT，每个颜色换成同色阶亮一级）
let CM = null;
const CHAINS = [[0, 1, 2, 3, 4, 60], [8, 9, 10, 18, 17], [11, 12, 13, 26, 58], [20, 19, 32, 33, 15], [27, 28, 29, 30, 31], [52, 53, 54, 43], [34, 35, 36, 37, 38], [39, 40, 41, 23, 22], [44, 45, 46, 47, 51], [7, 6, 17, 21], [55, 56, 57, 58], [16, 15, 5], [42, 24, 43], [14, 5, 51, 21]];
const LIT = PAL.map((_, i) => i); CHAINS.forEach((ch) => ch.forEach((c, k) => { LIT[c] = ch[Math.min(ch.length - 1, k + 1)]; }));
const PC = (col) => PAL[CM ? CM[col] : col];
function R(x, a, b, w, h, col, al) { if (al != null) x.globalAlpha = al; x.fillStyle = PC(col); x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); if (al != null) x.globalAlpha = 1; }
function oval(x, cx, cy, rx, ry, col, al) { if (al != null) x.globalAlpha = al; x.fillStyle = PC(col); for (let j = -Math.ceil(ry); j <= Math.ceil(ry); j++) { const q = 1 - (j * j) / (ry * ry + 0.3); if (q < 0) continue; const hw = Math.round(Math.sqrt(q) * rx); x.fillRect(Math.round(cx) - hw, Math.round(cy) + j, hw * 2 + 1, 1); } if (al != null) x.globalAlpha = 1; }
const disc = (x, cx, cy, r, col, al) => oval(x, cx, cy, r, r, col, al);
// 硬边光晕：同色 4 圈叠出阶梯
function halo(x, cx, cy, rx, ry, col, a) { for (let k = 4; k >= 1; k--) oval(x, cx, cy, rx * k / 4, ry * k / 4, col, a * 0.3); }
// 小位图：rows 里 'X' 画 col
function bm(x, a, b, rows, col) { x.fillStyle = PC(col); rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === 'X') x.fillRect(a + i, b + j, 1, 1); }); }

// ═════════════════════ 主角「小夜」：chibi 风格的少年训练家 ═════════════════════
// 约 2.4 头身：头大主要是头发的体积，脸小、在头的下半部；刘海盖住额头，两侧长发贴着脸颊；眼睛靠下、带睫毛和两个高光；
// 看得见脖子、四肢修长。红帽白前片（金币帽徽）、敞开的芥末黄夹克 + 白 T 恤、卷边牛仔裤、黑色露指手套、红白球鞋、绿色小背包、钢壳手电。
// 用像素角色引擎（pcd）画：分部件从后往前、自动明暗和分界线；机台亮起后吃青色轮廓光。
const K = { W: 64, H: 84, X: 32, Y: 78 };
const spr = new Sprite(K.W, K.H, K.X, K.Y);
const rp = (a) => E.ramp(a);
const mt = {
  skin: defMat(rp(['#6a3030', '#e5a58a', '#fcd6bf', '#fff0e4'])), skinF: defMat(rp(['#6a3030', '#c98a74', '#e5a58a', '#fcd6bf'])),
  hair: defMat(rp(['#1c0c0a', '#5c2c1a', '#8e4a28', '#c07a44'])), hairD: defMat(rp(['#1c0c0a', '#3e1c10', '#5c2c1a', '#8e4a28'])),
  cap: defMat(rp(['#360a12', '#9c1c2a', '#dc3a3c', '#ff7c6a'])), capW: defMat(rp(['#3a3848', '#b8b8c8', '#eeeef4', '#ffffff'])),
  jk: defMat(rp(['#3a2208', '#a0601a', '#e2a434', '#ffd87c'])), jkF: defMat(rp(['#3a2208', '#7a4612', '#a0601a', '#e2a434'])),
  tee: defMat(rp(['#3a3848', '#c4c4d4', '#f2f2f8', '#ffffff'])),
  jean: defMat(rp(['#0e1a3c', '#1f3a78', '#2e58a8', '#4a80d2'])), jeanF: defMat(rp(['#0e1a3c', '#172c5c', '#1f3a78', '#2e58a8'])),
  shoe: defMat(rp(['#360a12', '#a01c28', '#e03c3a', '#ff7c6a'])), sole: defMat(rp(['#3a3848', '#d8d8e4', '#f6f6fa', '#ffffff']), 1, true),
  glove: defMat(rp(['#07060c', '#16151f', '#262534', '#3e3d52'])),
  pack: defMat(rp(['#10261a', '#2a6036', '#44904c', '#80c46a'])), torch: defMat('steel'), lens: defMat([14, 51, 51, 21], 1, true), coin: defMat('gold'),
  ink: defMat(rp(['#1a0c10', '#1a0c10', '#1a0c10', '#1a0c10']), 1, true), white: defMat([21, 21, 21, 21], 1, true), blush: defMat(rp(['#ff9a9a', '#ff9a9a', '#ff9a9a', '#ff9a9a']), 1, true),
  mouth: defMat(rp(['#8a2a3a', '#8a2a3a', '#8a2a3a', '#8a2a3a']), 1, true), iris: defMat(rp(['#2a5ac8', '#2a5ac8', '#2a5ac8', '#2a5ac8']), 1, true), irisL: defMat(rp(['#8ae0ff', '#8ae0ff', '#8ae0ff', '#8ae0ff']), 1, true),
};
const RGBK = PAL.map((h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; });
function limb(A, B, m, r) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(B[0] - A[0]), Math.abs(B[1] - A[1])))); for (let i = 0; i <= n; i++) brush(A[0] + (B[0] - A[0]) * i / n, A[1] + (B[1] - A[1]) * i / n, r, m); }
// 一缕头发：从 (x0, y0) 到 (x1, y1) 越来越细
function lock(x0, y0, x1, y1, r0, m) { const n = 8; for (let i = 0; i <= n; i++) brush(x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, r0 * (1 - 0.75 * i / n), m || mt.hair); }
// 腿：牛仔裤从胯到脚踝，脚踝上面两行是卷边（亮一级）
function leg(hx, hy, fx, ay, far) { const n = Math.max(1, ay - hy), m = far ? mt.jeanF : mt.jean; for (let y = hy; y <= ay; y++) { const x = Math.round(hx + (fx - hx) * (y - hy) / n); run(y, x - 1, x + 1, m, ay - y < 2 ? 4 : 0); } }
function shoe(fx, fy) { run(fy - 3, fx - 2, fx + 1, mt.shoe); run(fy - 2, fx - 2, fx + 3, mt.shoe); run(fy - 1, fx - 2, fx + 4, mt.shoe); sp(fx, fy - 3, mt.tee); sp(fx + 1, fy - 2, mt.tee); run(fy, fx - 2, fx + 4, mt.sole); }
function shoeB(fx, fy) { run(fy - 3, fx - 1, fx + 1, mt.shoe); run(fy - 2, fx - 2, fx + 2, mt.shoe); run(fy - 1, fx - 2, fx + 2, mt.shoe); run(fy, fx - 2, fx + 2, mt.sole); }
let lens = [0, 0];
function torch(Hd, a) {
  const dx = Math.cos(a), dy = Math.sin(a);
  for (let k = 0; k <= 3; k++) brush(Hd[0] + dx * k, Hd[1] + dy * k, 1, mt.torch);
  for (let k = 4; k <= 5; k++) brush(Hd[0] + dx * k, Hd[1] + dy * k, 1.6, mt.torch);
  part(); brush(Hd[0] + dx * 6, Hd[1] + dy * 6, 1.3, mt.lens); lens = [Hd[0] + dx * 7, Hd[1] + dy * 7];
}
// 眼睛 3×5：上沿一道睫毛（外眼角多翘一格）、左上大高光 + 右下小高光、下半蓝色虹膜
function eye(x0, y0, f, outer) {
  if (f === 'blink') { sp(x0, y0 + 3, mt.ink); sp(x0 + 1, y0 + 4, mt.ink); sp(x0 + 2, y0 + 3, mt.ink); sp(x0 + outer * 2 + (outer > 0 ? 1 : 0), y0 + 2, mt.ink); return; }
  if (f === 'happy') { sp(x0, y0 + 3, mt.ink); sp(x0 + 1, y0 + 2, mt.ink); sp(x0 + 2, y0 + 3, mt.ink); return; }
  rect(x0, y0, 3, 5, mt.ink); sp(x0 + 1, y0 + 5, mt.ink); sp(outer > 0 ? x0 + 3 : x0 - 1, y0, mt.ink);
  if (f === 'shock') { sp(x0 + 1, y0 + 1, mt.white); sp(x0 + 1, y0 + 2, mt.white); sp(x0 + 1, y0 + 3, mt.white); return; }
  sp(x0, y0 + 1, mt.white); sp(x0 + 1, y0 + 1, mt.white); sp(x0, y0 + 2, mt.white); sp(x0, y0 + 3, mt.iris); sp(x0 + 1, y0 + 3, mt.iris); sp(x0, y0 + 4, mt.iris); sp(x0 + 1, y0 + 4, mt.iris); sp(x0 + 2, y0 + 4, mt.irisL);
}
// 头（侧面四分之三，朝右）：后脑头发 → 脸 → 五官 → 两侧长发 → 刘海 → 帽子 → 帽檐 → 呆毛
function headSide(hx, hy, f) {
  part(); ellipse(hx - 1, hy, 12.5, 11, mt.hair); lock(hx - 10, hy + 4, hx - 12, hy + 12, 2.6, mt.hairD); lock(hx - 7, hy + 7, hx - 8, hy + 13, 2.2, mt.hairD);
  part(); ellipse(hx + 2.5, hy + 4, 7.5, 6.8, mt.skin);
  eye(hx - 0, hy + 1, f, -1); eye(hx + 6, hy + 1, f, 1);
  if (f !== 'shock') { run(hy + 7, hx - 1, hx, mt.blush); run(hy + 7, hx + 8, hx + 9, mt.blush); }
  if (f === 'shock') rect(hx + 4, hy + 8, 2, 2, mt.mouth); else if (f === 'happy') { run(hy + 8, hx + 3, hx + 5, mt.mouth); } else sp(hx + 4, hy + 8, mt.mouth);
  part(); lock(hx - 5, hy - 2, hx - 5, hy + 10, 2.4); lock(hx + 10, hy - 2, hx + 10.5, hy + 7, 1.8);
  part(); for (let k = 0; k < 5; k++) lock(hx - 4 + k * 3.4, hy - 7, hx - 4.5 + k * 3.4 + (k > 2 ? 1 : 0), hy - 1 + (k === 2 ? 1 : 0), 2.3);
  part(); lock(hx - 10, hy - 4, hx - 17, hy - 7, 2.4); lock(hx - 11, hy + 1, hx - 17, hy + 1, 2.2); lock(hx - 9, hy + 5, hx - 14, hy + 8, 2);
  part(); for (let y = hy - 14; y <= hy - 6; y++) { const hw = Math.round(Math.sqrt(Math.max(0, 1 - ((y - (hy - 6)) / 8.6) ** 2)) * 12.8); for (let x = hx - 1 - hw; x <= hx - 1 + hw; x++) sp(x, y, x >= hx + 3 && y <= hy - 7 && y >= hy - 12 ? mt.capW : mt.cap); }
  sp(hx - 1, hy - 15, mt.cap); rect(hx + 6, hy - 11, 3, 3, mt.coin); sp(hx + 6, hy - 11, mt.capW); run(hy - 6, hx - 13, hx + 11, mt.cap, 2);
  part(); run(hy - 6, hx + 6, hx + 17, mt.cap); run(hy - 5, hx + 7, hx + 16, mt.cap, 2);
}
// 侧面（四分之三侧，朝右）。p: g 步态帧 0–3（-1 站）、run、crouch、bob、ta 手电角度（0 平、1 向下、-1 向上）、face（n blink happy shock）
function drawSide(p) {
  const g = p.g == null ? -1 : p.g, rn = p.run ? 1 : 0, cr = p.crouch ? 1 : 0;
  let nF = 1, fF = -2, nL = 0, fL = 0, bob = p.bob || 0;
  if (g >= 0 && !cr) { const st = rn ? 5 : 3, lf = rn ? 3 : 2; if (g === 0) { nF = st; fF = -st; } else if (g === 2) { nF = -st; fF = st; } else if (g === 1) { nF = 0; fF = 0; fL = lf; bob -= 1; } else { nF = 0; fF = 0; nL = lf; bob -= 1; } }
  const l = rn ? 2 : cr ? 1 : 0, dy = bob + cr * 7;
  // 远手
  const sw = (g === 0 ? 1 : g === 2 ? -1 : 0) * (rn ? 4 : 3);
  part(); limb([l - 2, -28 + dy], [l - 4 - sw, -19 + dy], mt.jkF, 1.4); part(); brush(l - 4 - sw, -18 + dy, 1.4, mt.glove);
  // 背包
  part(); for (let y = -29; y <= -19; y++) { const ins = y === -29 || y === -19 ? 1 : 0; run(y + dy, l - 10 + ins, l - 5, mt.pack); } run(-26 + dy, l - 9, l - 5, mt.pack, 1); sp(l - 7, -25 + dy, mt.coin);
  // 腿、鞋
  if (cr) { part(); run(-10, l - 3, l + 3, mt.jeanF); leg(l - 2, -9, l - 2, -5, 1); part(); shoe(l - 3, -1); part(); run(-11, l - 1, l + 6, mt.jean); leg(l + 5, -10, l + 4, -5, 0); part(); shoe(l + 3, -1); }
  else { part(); leg(-2, -18 + bob, fF - 1, -5 - fL, 1); part(); shoe(fF - 1, -1 - fL); part(); leg(1, -18 + bob, nF + 1, -5 - nL, 0); part(); shoe(nF + 1, -1 - nL); }
  // 夹克（敞开，里面白 T 恤）
  part(); for (let y = -31; y <= -16; y++) { const ins = y === -31 ? 2 : y === -30 ? 1 : y >= -18 ? 0 : 0, wx = y >= -18 ? 1 : 0; run(y + dy, l - 5 + ins - wx, l + 4 - ins + wx, mt.jk, y >= -17 ? 2 : 0); }
  for (let y = -29; y <= -19; y++) { sp(l + 1, y + dy, mt.tee); sp(l + 2, y + dy, mt.tee); } for (let y = -29; y <= -17; y++) sp(l + 3, y + dy, mt.jk, 1);
  run(-31 + dy, l - 3, l - 1, mt.jk, 4); run(-31 + dy, l + 3, l + 4, mt.jk, 4);
  part(); line(l - 4, -30 + dy, l - 1, -20 + dy, mt.pack);
  part(); rect(l, -33 + dy, 2, 3, mt.skin);
  headSide(l + 1, -44 + dy, p.face || 'n');
  // 近手 + 手电
  const ta = p.ta || 0, S0 = [l + 2, -28 + dy], HN = ta === 1 ? [l + 5, -19 + dy] : ta === -1 ? [l + 6, -29 + dy] : [l + 7, -22 + dy];
  part(); limb(S0, HN, mt.jk, 1.5); sp(HN[0] - 1, HN[1], mt.jk, 4);
  part(); torch(HN, ta * 0.6);
  part(); brush(HN[0], HN[1], 1.5, mt.glove);
}
// 背面（面朝机台）。p: g 步态、bob、arm（down / up 右手举起 / cheer 双手举起）、coin
function drawBack(p) {
  const g = p.g == null ? -1 : p.g, dy = (p.bob || 0) - (g === 1 || g === 3 ? 1 : 0), lL = g === 1 ? 2 : 0, rL = g === 3 ? 2 : 0;
  const upR = p.arm === 'up' || p.arm === 'cheer', upL = p.arm === 'cheer';
  part(); leg(-3, -18 + dy, -3, -5 - lL, 0); part(); shoeB(-3, -1 - lL);
  part(); leg(2, -18 + dy, 2, -5 - rL, 0); part(); shoeB(2, -1 - rL);
  part(); for (let y = -31; y <= -16; y++) { const ins = y === -31 ? 2 : y === -30 ? 1 : 0, wx = y >= -18 ? 1 : 0; run(y + dy, -6 + ins - wx, 5 - ins + wx, mt.jk, y >= -17 ? 2 : 0); }
  for (let y = -29; y <= -19; y++) sp(-0.5, y + dy, mt.jk, 1);
  if (!upL) { part(); limb([-6, -29 + dy], [-8, -19 + dy], mt.jk, 1.5); part(); brush(-8, -18 + dy, 1.5, mt.glove); }
  if (!upR) { part(); limb([5, -29 + dy], [7, -19 + dy], mt.jk, 1.5); part(); brush(7, -18 + dy, 1.5, mt.glove); }
  part(); for (let y = -29; y <= -19; y++) { const ins = y === -29 || y === -19 ? 1 : 0; run(y + dy, -5 + ins, 4 - ins, mt.pack); }
  run(-24 + dy, -3, 2, mt.pack, 1); for (let y = -23; y <= -21; y++) { sp(-3, y + dy, mt.pack, 1); sp(2, y + dy, mt.pack, 1); } sp(-1, -24 + dy, mt.coin);
  rect(-5, -31 + dy, 2, 3, mt.pack); rect(3, -31 + dy, 2, 3, mt.pack);
  const hy = -44 + dy;
  part(); rect(-1, hy + 10, 2, 3, mt.skin);
  part(); ellipse(-0.5, hy, 12.5, 11, mt.hair);
  for (const k of [-7, -2, 3, 8]) line(k, hy + 1, k - 1, hy + 9, mt.hair, 2);
  part(); for (let k = 0; k < 6; k++) lock(-10 + k * 4, hy + 6, -10.5 + k * 4 + (k > 2 ? 1 : 0), hy + 12 + (k === 2 || k === 3 ? 1 : 0), 2.3);
  part(); lock(-11, hy - 2, -17, hy - 4, 2.3); lock(10, hy - 2, 16, hy - 4, 2.3); lock(-10, hy + 4, -15, hy + 7, 2); lock(9, hy + 4, 14, hy + 7, 2);
  part(); for (let y = hy - 14; y <= hy - 6; y++) { const hw = Math.round(Math.sqrt(Math.max(0, 1 - ((y - (hy - 6)) / 8.6) ** 2)) * 12.8); run(y, -0.5 - hw, -0.5 + hw, mt.cap); } sp(0, hy - 15, mt.cap); run(hy - 6, -13, 12, mt.cap, 2);
  part(); run(hy - 8, -4, 3, mt.capW); run(hy - 7, -3, 2, mt.hair);
  if (upR) { part(); limb([5, -29 + dy], [10, -40 + dy], mt.jk, 1.5); part(); brush(10, -41 + dy, 1.5, mt.glove); if (p.coin) { part(); ellipse(10, -45 + dy, 2, 2, mt.coin); } }
  if (upL) { part(); limb([-6, -29 + dy], [-11, -40 + dy], mt.jk, 1.5); part(); brush(-11, -41 + dy, 1.5, mt.glove); }
}
const kcache = new Map();
function kidImg(p) {
  const key = JSON.stringify(p); let c = kcache.get(key); if (c) return c;
  begin(spr, 0, 0); lens = [0, 0]; (p.v === 'back' ? drawBack : drawSide)(p);
  bake(spr, { rim: p.rim || 0, rx: K.X + (p.rx || 0), ry: K.Y + (p.ry || 0), rimR: [0, 30, 60, 80], rimRamp: E.FX.magic, flash: p.flash ? 1 : 0, dq: 0 });
  c = mk(K.W, K.H); const id = c.x.createImageData(K.W, K.H), d = id.data, o = spr.out;
  for (let i = 0; i < o.length; i++) { const v = o[i]; if (v === 255) continue; const q = RGBK[v]; d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255; }
  c.x.putImageData(id, 0, 0); c.lens = lens.slice();
  if (kcache.size > 300) kcache.clear(); kcache.set(key, c); return c;
}
function kid(x, wx, fy, p, flip) {
  const c = kidImg(p), X = Math.round(wx), Y = Math.round(fy);
  if (flip) { x.save(); x.translate(X * 2, 0); x.scale(-1, 1); x.drawImage(c.c, X - K.X, Y - K.Y); x.restore(); } else x.drawImage(c.c, X - K.X, Y - K.Y);
  return [X + (flip ? -c.lens[0] : c.lens[0]), Y + c.lens[1]];
}
// 宝可梦式表情气泡（! ? ♪ …），画在世界里
const GLY = { '!': ['.X.', '.X.', '.X.', '.X.', '...', '.X.'], '?': ['XXX', '..X', '.XX', '.X.', '...', '.X.'], '♪': ['.XX', '.XX', '.X.', '.X.', 'XX.', 'XX.'], '…': ['...', '...', '...', '...', '...', 'X.X'] };
function bubble(x, bx, by, ch, age) {
  const pop = age < 0.08 ? -2 : age < 0.16 ? 1 : 0, a = Math.round(bx) - 6, b = Math.round(by) - 14 + pop;
  R(x, a, b + 1, 13, 10, 0); R(x, a + 1, b, 11, 12, 0); R(x, a + 1, b + 1, 11, 10, 21); R(x, a + 1, b + 10, 11, 1, 18);
  R(x, a + 3, b + 12, 2, 1, 0); R(x, a + 3, b + 11, 2, 1, 21); R(x, a + 3, b + 13, 1, 1, 0);
  if (ch === '…') { R(x, a + 3, b + 6, 1, 1, 0); R(x, a + 6, b + 6, 1, 1, 0); R(x, a + 9, b + 6, 1, 1, 0); }
  else bm(x, a + 5, b + 3, GLY[ch], ch === '!' ? 57 : ch === '♪' ? 23 : 40);
}
// 转动的金币（3×3 或 5×5），fr 0–3 翻面相位
function coin(x, cx, cy, r, fr) {
  const w = [r, r - 1, 0, r - 1][fr & 3];
  if (w <= 0) { R(x, cx, cy - r, 1, r * 2 + 1, 14); return; }
  oval(x, cx, cy, w, r, 20); oval(x, cx, cy, Math.max(0, w - 1), r - 1, 14); if (w > 1) R(x, cx - w + 1, cy - r + 1, 1, 1, 5); if (w >= r) R(x, cx, cy - 1, 1, 2, 5);
}
function sparkle(x, cx, cy, n, col) { R(x, cx, cy - n, 1, n * 2 + 1, col); R(x, cx - n, cy, n * 2 + 1, 1, col); if (n > 1) R(x, cx, cy, 1, 1, 21); }
const FXC = E.FX.coin, FXM = E.FX.magic;
// 纯函数外爆：以 t0 起、按寿命走完 5 级色阶
function burstAt(x, cx, cy, age, n, seed, spd, life, ramp) {
  for (let i = 0; i < n; i++) { const a = hsh(i, seed) * Math.PI * 2, v = spd * (0.5 + hsh(i, seed + 1) * 0.7), L = life * (0.6 + hsh(i, seed + 2) * 0.5); if (age > L || age < 0) continue; const q = age / L, d = v * eOut(q); R(x, cx + Math.cos(a) * d, cy + Math.sin(a) * d * 0.8 + q * q * 8, 1, 1, ramp[Math.min(4, Math.floor(q * 5))]); }
}

// ═════════════════════ 镜头与舞台 ═════════════════════
// 镜头：S = 每格占几个舞台像素（4 × z）。S 是整数的停留镜头对齐到屏幕像素：每格一样大、滚动不抖；只有推拉的过程里是小数。
// 位置和镜头都是连续的；只有角色的姿势按像素画的逐帧节奏（12 帧 / 秒，走路 8 帧 / 秒）换。
const w2s = (cam, wx, wy) => [(wx - cam.x) * 4 * cam.z + 960, (wy - cam.y) * 4 * cam.z + 540];
function snapCam(cam) { const S = 4 * cam.z, Si = Math.round(S); if (Math.abs(S - Si) > 1e-3) return cam; return { x: Math.round(cam.x * Si) / Si, y: Math.round(cam.y * Si) / Si, z: cam.z }; }
function blit(ctx, wc, cam) {
  const S = 4 * cam.z, vw = W / S, vh = H / S, sx = cam.x - vw / 2, sy = cam.y - vh / 2, ix = Math.floor(sx), iy = Math.floor(sy), nw = Math.ceil(vw) + 2, nh = Math.ceil(vh) + 2;
  ctx.imageSmoothingEnabled = false; ctx.drawImage(wc.c, ix, iy, nw, nh, Math.round((ix - sx) * S), Math.round((iy - sy) * S), nw * S, nh * S);
}
function shaken(cam, amp, s) { if (!amp || still()) return cam; const f = Math.floor(s * 30); return { x: cam.x + (hsh(f, 91) - 0.5) * 2 * amp, y: cam.y + (hsh(f, 92) - 0.5) * 2 * amp, z: cam.z }; }
function fill(ctx, col, a) { if (a <= 0) return; ctx.globalAlpha = Math.min(1, a); ctx.fillStyle = PAL[col]; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
function flashA(ctx, a) { fill(ctx, 21, a * (still() ? 0.2 : 0.35)); }
function bars(ctx, k, h0) { if (k <= 0) return; const h = Math.round((h0 || 84) * k); ctx.fillStyle = PAL[0]; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h); }
function spaced(ctx, s, cx, y, size, col, gap) { const cs = [...s], w = cs.map((c) => XU.measure(ctx, c, size, true)); let px = cx - (w.reduce((a, b) => a + b, 0) + gap * (cs.length - 1)) / 2; cs.forEach((c, i) => { XU.text(ctx, c, px + w[i] / 2, y, size, PAL[col], { num: true }); px += w[i] + gap; }); }
// 舞台暗角
const VG = new WeakMap();
function vignette(ctx, a) { let g = VG.get(ctx); if (!g) { g = ctx.createRadialGradient(960, 540, 420, 960, 540, 1180); g.addColorStop(0, 'rgba(11,10,24,0)'); g.addColorStop(1, 'rgba(11,10,24,1)'); VG.set(ctx, g); } ctx.globalAlpha = a; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
const lighter = (x, fn) => { x.globalCompositeOperation = 'lighter'; fn(); x.globalCompositeOperation = 'source-over'; };
function poly(x, pts, col, a) { x.globalAlpha = a; x.fillStyle = PC(col); x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) x.lineTo(pts[i][0], pts[i][1]); x.fill(); x.globalAlpha = 1; }

// ═════════════════════ 像素浮雕：高度 + 材质 → 逐像素受光、投影、缝隙暗角、高光、纹理 ═════════════════════
// 机台、云、月亮用它画：每个部件带高度（倒角、凹槽、圆钉、按钮都真的凸起或凹下），光从左上方来；
// 明暗按材质自己的多级色阶取色，级与级之间用 4×4 有序抖动过渡，所以是像素画而不是渐变。只在第一次用到时画一次。
const hex3 = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const B4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
const bay = (x, y) => B4[(y & 3) * 4 + (x & 3)];
const RM = {
  lacq: { r: ['#10030a', '#240716', '#3c0c22', '#58122e', '#74193a', '#922448', '#b23656', '#d25868', '#f0948c'], sp: 0.7, tx: 'lacq' },
  lacqD: { r: ['#0a0206', '#16040c', '#240814', '#340c1e', '#461228', '#5a1a34', '#722642', '#8e3452'], sp: 0.4, tx: 'lacq' },
  gold: { r: ['#261404', '#44260a', '#6a3e10', '#945a18', '#bc7c22', '#dca238', '#f2c860', '#fce496', '#fffadc'], sp: 1, tx: 'grain' },
  chrome: { r: ['#0e1016', '#1e2230', '#343a4c', '#505a70', '#747e96', '#9ca6bc', '#c4ccdc', '#e6ecf4', '#ffffff'], sp: 1.2, tx: 'brush' },
  bone: { r: ['#241c14', '#3e3224', '#5c4e3a', '#7e6e56', '#a09076', '#c2b498', '#ded4bc', '#f6f0e2'], sp: 0.35, tx: 'grain' },
  ink: { r: ['#030206', '#07060c', '#0b0a14', '#100e1c'], sp: 0, tx: '' },
  red: { r: ['#300406', '#5a0a0e', '#8a1418', '#ba2626', '#e04638', '#f87c62', '#ffc0a8', '#ffffff'], sp: 1.3, tx: '' },
  yel: { r: ['#342004', '#5e3e08', '#8e620e', '#c08c1a', '#e6b634', '#fad866', '#fff2b4', '#ffffff'], sp: 1.3, tx: '' },
  teal: { r: ['#03201f', '#08403e', '#0e6662', '#16928a', '#2ebeb2', '#66e2d6', '#b8fff4', '#ffffff'], sp: 1.3, tx: '' },
  pink: { r: ['#2c0610', '#521020', '#801c34', '#b0304a', '#d8506a', '#f48898', '#ffd0d8', '#ffffff'], sp: 1.3, tx: '' },
  moon: { r: ['#3a3a52', '#56566c', '#767486', '#9894a0', '#bab4b8', '#d8d2c8', '#ece6d6', '#fbf6e8'], sp: 0, tx: 'grain' },
};
const RMK = Object.keys(RM), RMI = {}; RMK.forEach((k, i) => { RMI[k] = i + 1; RM[k].c = RM[k].r.map(hex3); });
const nrm = (x, y, z) => { const l = Math.hypot(x, y, z) || 1; return [x / l, y / l, z / l]; };
class Relief {
  constructor(w, h) { this.w = w; this.h = h; this.m = new Uint8Array(w * h); this.z = new Float32Array(w * h); }
  set(x, y, m, z, max) { x = Math.floor(x); y = Math.floor(y); if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; const i = y * this.w + x; if (max && this.m[i] && this.z[i] >= z) return; this.m[i] = RMI[m]; this.z[i] = z; }
  addZ(x, y, dz) { if (x < 0 || y < 0 || x >= this.w || y >= this.h) return; this.z[y * this.w + x] += dz; }
  // 有符号距离形状：fn(x, y) < 0 在里面；高度 = z0 + bh × 圆角倒角（bw 格宽）
  sdf(x0, y0, x1, y1, fn, m, z0, bh, bw, max) { for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) { const d = -fn(x + 0.5, y + 0.5); if (d < 0) continue; const q = Math.min(1, d / (bw || 1)); this.set(x, y, m, z0 + bh * Math.sqrt(1 - (1 - q) * (1 - q)), max); } }
  box(x0, y0, x1, y1, r, m, z0, bh, bw, max) { const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, hx = (x1 - x0) / 2 - r, hy = (y1 - y0) / 2 - r; this.sdf(x0, y0, x1, y1, (x, y) => { const qx = Math.abs(x - cx) - hx, qy = Math.abs(y - cy) - hy; return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r; }, m, z0, bh, bw, max); }
  dome(cx, cy, rx, ry, m, z0, hh, max) { for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry, d = dx * dx + dy * dy; if (d > 1) continue; this.set(x, y, m, z0 + hh * Math.sqrt(1 - d), max); } }
  ring(cx, cy, rx, ry, t, m, z0, hh) { const inner = 1 - t / Math.min(rx, ry); for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) { const p = Math.hypot((x + 0.5 - cx) / rx, (y + 0.5 - cy) / ry); if (p > 1 || p < inner) continue; this.set(x, y, m, z0 + hh * Math.sin(Math.PI * (p - inner) / (1 - inner))); } }
  line(pts, w, m, z0, hh, max) { for (let k = 0; k < pts.length - 1; k++) { const [ax, ay] = pts[k], [bx, by] = pts[k + 1], L2 = (bx - ax) ** 2 + (by - ay) ** 2 || 1; for (let y = Math.floor(Math.min(ay, by) - w); y <= Math.ceil(Math.max(ay, by) + w); y++) for (let x = Math.floor(Math.min(ax, bx) - w); x <= Math.ceil(Math.max(ax, bx) + w); x++) { const t = clamp(((x + 0.5 - ax) * (bx - ax) + (y + 0.5 - ay) * (by - ay)) / L2, 0, 1), d = Math.hypot(x + 0.5 - ax - t * (bx - ax), y + 0.5 - ay - t * (by - ay)); if (d > w) continue; this.set(x, y, m, z0 + hh * Math.sqrt(1 - (d / w) ** 2), max); } } }
  groove(x, y0, y1, dep) { for (let y = y0; y <= y1; y++) for (let dx = -1; dx <= 1; dx++) this.addZ(x + dx, y, -dep * (1 - Math.abs(dx) * 0.6)); }
  render(o) {
    o = o || {};
    const { w, h, m, z } = this, c = mk(w, h), id = c.x.createImageData(w, h), d = id.data;
    const L = nrm(o.lx == null ? -0.55 : o.lx, o.ly == null ? -0.7 : o.ly, o.lz == null ? 0.46 : o.lz), l2 = Math.hypot(L[0], L[1]), sx = L[0] / l2, sy = L[1] / l2, rise = L[2] / l2, Hv = nrm(L[0], L[1], L[2] + 1);
    const Z = (x, y, z0) => { if (x < 0 || y < 0 || x >= w || y >= h) return z0 - 3; const i = y * w + x; return m[i] ? z[i] : z0 - 3; };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, mi = m[i]; if (!mi) continue;
      const mat = RM[RMK[mi - 1]], C = mat.c, N = C.length, z0 = z[i];
      const gx = clamp(Z(x - 1, y, z0) - Z(x + 1, y, z0), -4, 4), gy = clamp(Z(x, y - 1, z0) - Z(x, y + 1, z0), -4, 4), n = nrm(gx * 0.9, gy * 0.9, 2);
      const diff = Math.max(0, n[0] * L[0] + n[1] * L[1] + n[2] * L[2]);
      let sh = 0; for (let k = 1; k <= 12; k++) { const px = Math.round(x + sx * k), py = Math.round(y + sy * k); if (px < 0 || py < 0 || px >= w || py >= h) break; const j = py * w + px; if (m[j] && z[j] > z0 + rise * k + 0.5) { sh = 1; break; } }
      let occ = 0; for (const [ox, oy] of [[2, 0], [-2, 0], [0, 2], [0, -2], [2, 2], [-2, -2], [2, -2], [-2, 2]]) occ += Math.max(0, Z(x + ox, y + oy, z0) - z0); occ = Math.min(1, occ / 7);
      let t = 0; if (mat.tx === 'lacq') t = (hsh(x, 3) - 0.5) * 0.05 + (hsh(x >> 1, y >> 3) - 0.5) * 0.05; else if (mat.tx === 'brush') t = (hsh(y, 11) - 0.5) * 0.14 + (hsh(y * 7 + (x >> 3), 12) - 0.5) * 0.05; else if (mat.tx === 'grain') t = (hsh(x * 31 + y, 13) - 0.5) * 0.1;
      const spec = sh ? 0 : Math.pow(Math.max(0, n[0] * Hv[0] + n[1] * Hv[1] + n[2] * Hv[2]), 22) * mat.sp;
      let I = (o.amb == null ? 0.18 : o.amb) + 0.85 * diff * (sh ? 0.3 : 1) - occ * 0.35 + t + spec * 0.9;
      if (z0 - Z(x + 1, y, z0) > 1.2 || z0 - Z(x, y + 1, z0) > 1.2) I = Math.min(I, 0.1);
      const tone = clamp(Math.floor(I * (N - 1) + bay(x, y)), 0, N - 1), q = C[tone];
      d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255;
    }
    c.x.putImageData(id, 0, 0); return c;
  }
}

// ── 云：很多团蓬松的球，各团自己受光（月亮在左上），团与团之间压出阴影缝，底部压平变暗，边缘抖动虚化 ──
const CLOUD_R = { n: ['#0b0c26', '#111434', '#181c44', '#222756', '#2d3468', '#3c457e', '#505b96', '#6a76ae', '#8e9ac8', '#b8c2e2'], l: ['#262a4e', '#363b66', '#4a5082', '#60689c', '#7a84b4', '#98a2ca', '#b6bede', '#d2d8ee', '#eceff8', '#ffffff'] };
Object.keys(CLOUD_R).forEach((k) => { CLOUD_R[k] = CLOUD_R[k].map(hex3); });
function cloudSprite(seed, cw, ch, lit, face) {
  const C = CLOUD_R[lit ? 'l' : 'n'], N = C.length, c = mk(cw, ch), id = c.x.createImageData(cw, ch), d = id.data, base = ch * 0.82, B = [];
  const n = 7 + Math.floor(hsh(seed, 1) * 4);
  for (let i = 0; i < n; i++) { const t = (i + 0.5) / n, r = ch * (0.26 + 0.3 * Math.sin(Math.PI * t)) * (0.85 + 0.3 * hsh(seed, i + 10)); B.push([cw * (0.1 + 0.8 * t) + (hsh(seed, i + 30) - 0.5) * cw * 0.05, base - r * 0.55 + (hsh(seed, i + 50) - 0.5) * ch * 0.08, r, 1]); }
  for (let i = 0; i < 16; i++) { const t = 0.12 + 0.76 * hsh(seed, i + 70), r = ch * (0.08 + 0.1 * hsh(seed, i + 80)), top = base - ch * (0.3 + 0.42 * Math.sin(Math.PI * t)); B.push([cw * t, top + r * 0.6, r, 0.7]); }
  // 平滑合成的密度场：每团一个圆滑的核，叠起来；顶上的小团让轮廓起伏
  const F = new Float32Array(cw * ch);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) { let f = 0; for (const [bx, by, r, k] of B) { const q = 1 - ((x + 0.5 - bx) ** 2 + (y + 0.5 - by) ** 2) / (r * r); if (q > 0) f += q * q * k; } if (y > base - 3) f *= Math.max(0, (base + 1 - y) / 4); F[y * cw + x] = f; }
  const thr = 0.2, Hf = (x, y) => (x < 0 || y < 0 || x >= cw || y >= ch ? 0 : Math.sqrt(Math.max(0, F[y * cw + x] - thr)) * 16), L = nrm(-0.6, -0.7, 0.45);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const i = y * cw + x, f = F[i];
    if (f < thr) { if (f > thr * 0.55 && bay(x, y) < (f - thr * 0.55) / (thr * 0.45) * 0.7) { const q = C[1]; d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255; } continue; }
    const nn = nrm(Hf(x - 1, y) - Hf(x + 1, y), Hf(x, y - 1) - Hf(x, y + 1), 2.2), diff = Math.max(0, nn[0] * L[0] + nn[1] * L[1] + nn[2] * L[2]);
    let I = 0.12 + 0.78 * diff - (y / ch) * 0.28 + (hsh(x * 13 + y, seed) - 0.5) * 0.05;
    if (f < thr * 1.9 && nn[1] < 0.1 && nn[0] < 0.3) I += 0.22;
    if (y > base - 4) I -= 0.12;
    const tone = clamp(Math.floor(I * (N - 1) + bay(x, y)), 0, N - 1), q = C[tone];
    d[i * 4] = q[0]; d[i * 4 + 1] = q[1]; d[i * 4 + 2] = q[2]; d[i * 4 + 3] = 255;
  }
  c.x.putImageData(id, 0, 0);
  if (face) {   // 闪电里的笑脸：斜吊的眼缝（深处一点红）、咧到两边的嘴和一排牙
    const x = c.x, fx = cw / 2, fy = ch * 0.5, ink = lit ? '#161a3a' : '#07081a';
    x.fillStyle = ink; for (let k = 0; k < 12; k++) { x.fillRect(Math.round(fx - 40 + k * 1.7), Math.round(fy - 14 + k * 0.75), 5, 3); x.fillRect(Math.round(fx + 35 - k * 1.7), Math.round(fy - 14 + k * 0.75), 5, 3); }
    x.fillStyle = '#d23a3a'; x.fillRect(Math.round(fx - 25), Math.round(fy - 6), 2, 2); x.fillRect(Math.round(fx + 23), Math.round(fy - 6), 2, 2);
    for (let k = -42; k <= 42; k++) { const yy = Math.round(fy + 6 + 14 * (1 - (k / 42) ** 2)); x.fillStyle = ink; x.fillRect(Math.round(fx + k), Math.round(fy + 6), 1, yy - Math.round(fy + 6) + 2); if (((k + 42) % 7) < 3 && Math.abs(k) < 38) { x.fillStyle = lit ? '#ffffff' : '#8e9ac8'; x.fillRect(Math.round(fx + k), Math.round(fy + 6), 1, 3); } }
  }
  return c;
}
const CLOUDS = [[6, 230, 62, 700, 2, 1.3], [0, 220, 60, 0, 8, 1.6], [1, 190, 54, 260, 16, 2.0], [2, 170, 48, 480, 28, 2.5], [3, 130, 40, 110, 58, 3.1], [4, 150, 42, 380, 92, 3.5], [5, 110, 34, 620, 118, 4.1]];   // [种子, 宽, 高, 起点, 高度, 速度]
let CLS = null;
function cloudsFor() { if (!CLS) { CLS = CLOUDS.map(([sd, cw, ch]) => [cloudSprite(sd + 3, cw, ch, false), cloudSprite(sd + 3, cw, ch, true)]); CLS.face = [cloudSprite(97, 180, 90, false, true), cloudSprite(97, 180, 90, true, true)]; } return CLS; }
function drawClouds(ctx, cam, T, fl, face) {
  const S = 4 * cam.z, cl = cloudsFor(); ctx.imageSmoothingEnabled = false;
  const put = (img, wx, wy, a) => { const P = w2s(cam, wx, wy); ctx.globalAlpha = a; ctx.drawImage(img.c, P[0], P[1], img.w * S, img.h * S); ctx.globalAlpha = 1; };
  CLOUDS.forEach(([, cw, ch, x0, y0, sp], i) => { const wx = ((x0 + T * sp) % (LW + cw + 60)) - cw - 30; put(cl[i][0], wx, y0, 1); if (fl > 0.02) put(cl[i][1], wx, y0, Math.min(1, fl * 1.3)); });
  if (face > 0) { put(cl.face[0], 395 - 90, 80 - 45, face); if (fl > 0.02) put(cl.face[1], 395 - 90, 80 - 45, Math.min(1, fl * 1.3) * face); }
}
// ── 月亮：球面受光 + 环形山 ──
function moonSprite() {
  const r = new Relief(44, 44);
  r.dome(22, 22, 18, 18, 'moon', 0, 18);
  [[16, 17, 4], [27, 26, 3], [22, 30, 2.5], [12, 26, 2], [28, 14, 2.2]].forEach(([cx, cy, cr]) => { for (let y = cy - cr - 1; y <= cy + cr + 1; y++) for (let x = cx - cr - 1; x <= cx + cr + 1; x++) { const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / cr; if (dd < 1) r.addZ(x, y, -1.6 * (1 - dd * dd)); else if (dd < 1.35) r.addZ(x, y, 0.6); } });
  return r.render({ lx: -0.3, ly: -0.4, lz: 0.86, amb: 0.3 });
}

// ═════════════════════ 第一幕：雨夜公寓（480×270）═════════════════════
const WIN = { x: 299, y: 122, w: 20, h: 28 }, CAT = [304, 194];
let stA = null, stAL = null, stS = null, stSL = null, MOON = null;
// 天空层（最后面）：夜空色带、星星、月晕、月亮；云在天空和楼之间，画在舞台上（按屏幕像素平滑地飘）
function paintSky() {
  const c = mk(LW, LH), x = c.x;
  [[0, 0], [52, 1], [112, 2], [176, 3]].forEach(([y0, col], i, A) => { const y1 = A[i + 1] ? A[i + 1][0] : LH; R(x, 0, y0, LW, y1 - y0, col); if (i) for (let yy = 0; yy < 4; yy++) for (let xx = (yy & 1); xx < LW; xx += 2) if (yy < 2 || (xx & 3) === (yy & 1)) R(x, xx, y0 - 1 - yy, 1, 1, col); });
  for (let i = 0; i < 46; i++) R(x, hsh(i, 7) * LW, hsh(i, 8) * 130, 1, 1, hsh(i, 9) > 0.8 ? 5 : 6, 0.35 + 0.5 * hsh(i, 10));
  halo(x, 92, 58, 50, 50, 6, 0.1); halo(x, 92, 58, 28, 28, 5, 0.12);
  if (!MOON) MOON = moonSprite(); x.drawImage(MOON.c, 70, 36);
  return c;
}
// 前景层：远处的楼、公寓、路灯、树、栅栏（天空透明）
function paintA() {
  const c = mk(LW, LH), x = c.x;
  let cx0 = -6, i = 0; while (cx0 < LW) { const w = 14 + Math.floor(hsh(i, 11) * 28), h = 26 + Math.floor(hsh(i, 12) * 64); R(x, cx0, 238 - h, w, h + 32, 1); R(x, cx0, 238 - h, 1, h + 32, 2); for (let yy = 242 - h; yy < 232; yy += 7) for (let xx = cx0 + 3; xx < cx0 + w - 3; xx += 6) if (hsh(xx * 7 + yy, i) > 0.84) R(x, xx, yy, 2, 3, 14, 0.35); cx0 += w + Math.floor(hsh(i, 13) * 5); i++; }
  const bx = 176, bw = 196, by = 64;
  R(x, bx, by, bw, 200, 8);
  for (let y = by + 4, r = 0; y < 262; y += 6, r++) { R(x, bx, y, bw, 1, 9, 0.7); for (let k = (r & 1) * 9; k < bw; k += 18) { R(x, bx + k, y, 1, 6, 9, 0.5); const v = hsh(k * 13 + r, 77); if (v > 0.86) R(x, bx + k + 1, y + 1, 17, 5, 9, 0.45); else if (v < 0.07) R(x, bx + k + 1, y + 1, 17, 5, 0, 0.22); } }
  R(x, bx, by, 3, 200, 9); R(x, bx + 3, by, 1, 200, 10, 0.4); R(x, bx + bw - 4, by, 4, 200, 0, 0.35);
  R(x, bx - 4, by - 7, bw + 8, 7, 10); R(x, bx - 4, by - 7, bw + 8, 1, 18); R(x, bx - 4, by - 1, bw + 8, 1, 0); for (let k = 0; k < bw + 8; k += 6) R(x, bx - 4 + k, by, 3, 2, 9);
  R(x, 198, 38, 30, 22, 20); R(x, 198, 38, 30, 2, 19); R(x, 198, 38, 2, 22, 19); R(x, 198, 45, 30, 1, 0, 0.5); R(x, 198, 52, 30, 1, 0, 0.5); for (let k = 0; k < 6; k++) R(x, 213 - k * 2.6, 32 + k, k * 5.2 + 2, 1, 20); R(x, 201, 60, 2, 4, 0); R(x, 223, 60, 2, 4, 0);
  R(x, 340, 22, 1, 42, 28); R(x, 333, 32, 15, 1, 28); R(x, 335, 40, 11, 1, 28);
  R(x, bx + bw - 12, by, 3, 196, 27); R(x, bx + bw - 12, by, 1, 196, 29); for (let y = by + 20; y < 260; y += 34) R(x, bx + bw - 13, y, 5, 2, 28);
  for (let cI = 0; cI < 5; cI++) for (let rI = 0; rI < 4; rI++) {
    const wx = 188 + cI * 37, wy = 78 + rI * 44, h = hsh(cI * 7 + rI, 91), teal = cI === 3 && rI === 1;
    R(x, wx - 2, wy - 2, 24, 32, 10); R(x, wx - 2, wy - 2, 24, 1, 18); R(x, wx, wy, 20, 28, 1);
    if (cI === 1 && rI === 3) R(x, wx, wy, 20, 28, 19, 0.55);
    R(x, wx + 3, wy + 2, 2, 8, 2); R(x, wx + 5, wy + 2, 1, 5, 2);
    if (h > 0.55 && !teal) { R(x, wx, wy, 5, 28, 12, 0.85); R(x, wx + 15, wy, 5, 28, 12, 0.85); R(x, wx + 2, wy, 1, 28, 11, 0.8); R(x, wx + 17, wy, 1, 28, 11, 0.8); }
    R(x, wx + 9, wy, 2, 28, 10); R(x, wx, wy + 13, 20, 2, 10); R(x, wx - 3, wy + 28, 26, 3, 18); R(x, wx - 3, wy + 30, 26, 1, 0, 0.6);
    if (h < 0.3 && rI > 0 && cI > 0) { R(x, wx + 4, wy + 32, 12, 6, 9); R(x, wx + 4, wy + 32, 12, 1, 10); for (let k = 0; k < 5; k++) R(x, wx + 6 + k * 2, wy + 34, 1, 3, 8); R(x, wx + 14, wy + 38, 1, 2, 0); }
  }
  for (let rI = 0; rI < 4; rI++) { const wx = 188, wy = 78 + rI * 44; R(x, wx - 8, wy + 31, 36, 2, 27); R(x, wx - 8, wy + 23, 36, 1, 28); for (let k = 0; k <= 36; k += 4) R(x, wx - 8 + k, wy + 23, 1, 8, 28); if (rI < 3) for (let k = 0; k < 42; k += 2) R(x, wx + 26 - k * 0.8, wy + 33 + k, 2, 1, 27); }
  R(x, 252, 226, 42, 4, 10); R(x, 252, 226, 42, 1, 18); R(x, 256, 230, 34, 32, 0); R(x, 272, 230, 1, 32, 8); R(x, 250, 262, 46, 2, 10); R(x, 272, 219, 3, 4, 51);
  R(x, 0, 258, LW, 12, 1); R(x, 0, 258, LW, 1, 10); for (let k = 0; k < 9; k++) oval(x, 30 + k * 55 + hsh(k, 40) * 20, 263 + hsh(k, 41) * 4, 8 + hsh(k, 42) * 10, 1.2, 2);
  R(x, 118, 160, 3, 98, 27); R(x, 118, 160, 1, 98, 29); R(x, 112, 154, 15, 6, 28); R(x, 112, 154, 15, 1, 29);
  R(x, 26, 150, 7, 110, 0); [[29, 168, 8, 132], [30, 184, 58, 150], [31, 200, 4, 176], [8, 132, -4, 118], [58, 150, 70, 140], [58, 150, 64, 128]].forEach(([a, b, cc, d]) => { const n = Math.max(Math.abs(cc - a), Math.abs(d - b)); for (let k = 0; k <= n; k++) R(x, a + (cc - a) * k / n, b + (d - b) * k / n, 2, 2, 0); });
  R(x, 0, 246, LW, 2, 0); R(x, 0, 240, LW, 1, 0); for (let k = 0; k < LW; k += 8) { R(x, k, 236, 2, 34, 0); R(x, k, 233, 2, 3, 0); R(x, k - 1, 235, 4, 1, 0); }
  // 黑猫：蹲在青光窗正下方那扇窗的窗台上（眼睛在动态层）
  const [ax, ay] = CAT; oval(x, ax + 3, ay - 4, 5, 4, 0); disc(x, ax, ay - 9, 3, 0); R(x, ax - 3, ay - 14, 1, 3, 0); R(x, ax - 2, ay - 13, 1, 1, 0); R(x, ax + 2, ay - 14, 1, 3, 0); R(x, ax + 1, ay - 13, 1, 1, 0); for (let k = 0; k < 9; k++) R(x, ax + 8 + Math.round(Math.sin(k * 0.6) * 1.5), ay - 3 + k, 1, 1, 0);
  return c;
}
function lightA(s, T, story) {
  if (!story) { const p = T % 6.5; return p < 0.08 ? 1 : p > 0.16 && p < 0.22 ? 0.8 : p < 0.9 ? Math.max(0, 0.35 * (1 - (p - 0.22) / 0.68)) : 0; }
  const p = s - 1.0; return p < 0 ? 0 : p < 0.1 ? 1 : p > 0.18 && p < 0.25 ? 0.85 : p < 0.9 ? Math.max(0, 0.4 * (1 - (p - 0.25) / 0.65)) : 0;
}
function sceneA(ws, wc, s, T, story) {
  if (!stA) { stA = paintA(); stS = paintSky(); CM = LIT; stAL = paintA(); stSL = paintSky(); CM = null; }
  const x = wc.x, fl = lightA(s, T, story);
  ws.x.drawImage(stS.c, 0, 0); if (fl > 0.02) { ws.x.globalAlpha = Math.min(1, fl * 1.3); ws.x.drawImage(stSL.c, 0, 0); ws.x.globalAlpha = 1; }
  x.clearRect(0, 0, LW, LH); x.drawImage(stA.c, 0, 0);
  if (fl > 0.02) { x.globalAlpha = Math.min(1, fl * 1.3); x.drawImage(stAL.c, 0, 0); x.globalAlpha = 1; }
  const face = story ? Math.max(fl > 0.3 ? 1 : 0, 0.7 * (1 - seg(s, 1.25, 2.0))) * (s > 0.98 ? 1 : 0) : fl > 0.5 ? 0.6 : 0;
  if (fl > 0.75) { let bx = 130, by = 0; for (let k = 0; k < 9; k++) { const nx = 130 + (hsh(k, Math.floor(s * 10) + (story ? 3 : Math.floor(T / 6.5))) - 0.5) * 30, ny = by + 14; const n = Math.max(Math.abs(nx - bx), 14); for (let j = 0; j <= n; j++) { R(x, bx + (nx - bx) * j / n - 1, by + 14 * j / n, 3, 1, 51); R(x, bx + (nx - bx) * j / n, by + 14 * j / n, 1, 1, 21); } bx = nx; by = ny; } }
  // 那扇青光窗：闪烁，窗里偶尔有一双红眼
  const fk = Math.floor(T * 12), flick = hsh(fk, 3) > 0.9 ? 23 : 22;
  lighter(x, () => halo(x, WIN.x + 10, WIN.y + 14, 38, 34, 22, 0.28));
  R(x, WIN.x, WIN.y, WIN.w, WIN.h, flick); R(x, WIN.x + 2, WIN.y + 18, 16, 10, 23, 0.5); R(x, WIN.x + 1, WIN.y + 1, 7, 1, 21, 0.6); R(x, WIN.x + 9, WIN.y, 2, WIN.h, 10); R(x, WIN.x, WIN.y + 13, WIN.w, 2, 10);
  R(x, WIN.x - 3, WIN.y + 28, 26, 1, 22, 0.8); R(x, WIN.x - 2, WIN.y + 31, 24, 6, 22, 0.18);
  const eyes = story ? s > 2.0 : (T % 9) > 7.6 && (T % 9) < 8.4;
  if (eyes && !(story && s > 2.35 && s < 2.45)) { R(x, WIN.x + 4, WIN.y + 5, 3, 2, 57); R(x, WIN.x + 13, WIN.y + 5, 3, 2, 57); R(x, WIN.x + 5, WIN.y + 5, 1, 1, 21); R(x, WIN.x + 14, WIN.y + 5, 1, 1, 21); }
  if ((T % 3.3) > 0.15) { R(x, CAT[0] - 2, CAT[1] - 10, 1, 1, 50); R(x, CAT[0] + 1, CAT[1] - 10, 1, 1, 50); }
  if ((T * 1.2) % 1 < 0.15) { R(x, 339, 20, 3, 3, 57); lighter(x, () => halo(x, 340, 21, 7, 7, 57, 0.5)); }
  const lamp = hsh(Math.floor(T * 8), 5) > 0.12;
  if (lamp) { R(x, 114, 160, 11, 2, 51); poly(x, [[114, 162], [125, 162], [150, 258], [90, 258]], 51, 0.09); oval(x, 120, 259, 30, 3, 51, 0.16); for (let i = 0; i < 3; i++) R(x, 119 + Math.cos(T * 5 + i * 2) * (5 + i), 166 + Math.sin(T * 7 + i) * 4, 1, 1, 5); } else R(x, 114, 160, 11, 2, 19);
  for (let i = 0; i < 5; i++) { const fx = ((hsh(i, 60) * 700 + T * (4 + i)) % 700) - 110; oval(x, fx, 244 + i * 3, 70 + i * 10, 5, 3, 0.2); }
  // 雨：远处细、近处长；地上溅起的水花；水洼里青光的倒影
  x.fillStyle = PAL[10]; x.globalAlpha = 0.35;
  for (let i = 0; i < 150; i++) { const y = ((hsh(i, 2) * 290 + T * (240 + hsh(i, 4) * 60)) % 290) - 10, xx = ((hsh(i, 1) * 560 + y * 0.2) % 560) - 40; x.fillRect(Math.round(xx), Math.round(y), 1, 2); }
  x.fillStyle = PAL[31]; x.globalAlpha = 0.55;
  for (let i = 0; i < 60; i++) { const y = ((hsh(i, 5) * 300 + T * (480 + hsh(i, 6) * 80)) % 300) - 15, xx = ((hsh(i, 8) * 560 + y * 0.3) % 560) - 40; x.fillRect(Math.round(xx), Math.round(y), 1, 3); x.fillRect(Math.round(xx) + 1, Math.round(y) + 3, 1, 3); }
  x.globalAlpha = 1;
  for (let i = 0; i < 40; i++) { const pd = 0.35 + hsh(i, 71) * 0.4, ph = ((T + hsh(i, 72) * pd) % pd) / pd; if (ph > 0.25) continue; const sx = Math.floor(hsh(i, 73) * LW), sy = 259 + Math.floor(hsh(i, 74) * 10); if (ph < 0.1) R(x, sx, sy, 1, 1, 31); else { R(x, sx - 1, sy - 1, 1, 1, 30, 0.8); R(x, sx + 1, sy - 1, 1, 1, 30, 0.8); } }
  const rp = Math.round(Math.sin(T * 3)); R(x, WIN.x + rp, 260, 20, 1, 22, 0.45); R(x, WIN.x + 3 - rp, 262, 14, 1, 22, 0.3); R(x, WIN.x + 6, 264, 8, 1, 22, 0.2);
  return { fl, face };
}
function camA(s, story) {
  if (!story) return { x: 240, y: 135, z: 1 };
  const q1 = eIO(seg(s, 0, 1.4)), q2 = eIn(seg(s, 1.4, 3.0));
  return { x: lerp(lerp(240, 262, q1), WIN.x + 10, q2), y: lerp(135, WIN.y + 12, q2), z: lerp(1 + 0.15 * q1, 7.5, q2) };
}

// ═════════════════════ 第二幕：走廊（460×270）═════════════════════
const BW = 460, FEET = 228, P1 = [30, 20], BL = 6.9;
// 走廊的时间点（秒，从这一幕开始算）
const KB = { walk: 1.4, x0: 50, x1: 118, coinT: 0.95, coinArr: 2.05, coinX: 134, crouch: 2.45, get: 2.6, bolt: 3.6, turn: 4.3, tune: 5.05, back: 5.3, runT: 5.5, runE: 6.7, door: 5.95 };
let stB = null, stBL = null, dmB = null;
function paintB() {
  const c = mk(BW, LH), x = c.x;
  R(x, 0, 0, BW, LH, 0); R(x, 0, 0, BW, 56, 8, 0.5); R(x, 0, 56, BW, 4, 19); R(x, 0, 56, BW, 1, 32); R(x, 0, 60, BW, 3, 20);
  R(x, 0, 63, BW, 97, 52); for (let i = 0; i < BW; i += 14) { R(x, i, 63, 2, 97, 53); R(x, i + 2, 63, 1, 97, 0, 0.25); }
  for (let yy = 70, r = 0; yy < 156; yy += 12, r++) for (let xx = (r & 1) * 7 + 5; xx < BW; xx += 14) { R(x, xx, yy, 1, 1, 54); R(x, xx - 1, yy + 1, 3, 1, 54); R(x, xx, yy + 2, 1, 1, 54); }
  R(x, 0, 63, BW, 8, 0, 0.35); R(x, 0, 71, BW, 4, 0, 0.18); R(x, 0, 152, BW, 8, 0, 0.2);
  [[140, 70, 30, 60], [300, 64, 20, 80], [430, 90, 26, 50]].forEach(([a, b, w, h]) => { R(x, a, b, w, h, 0, 0.18); R(x, a + 4, b + h, w - 8, 12, 0, 0.12); });
  for (let k = 0; k < 18; k++) R(x, 232 + (hsh(k, 60) - 0.5) * 6 + k * 0.4, 70 + k * 3, 1, 3, 0, 0.6);
  R(x, 0, 160, BW, 4, 19); R(x, 0, 160, BW, 1, 32); R(x, 0, 163, BW, 1, 20); R(x, 0, 164, BW, 2, 0, 0.4);
  R(x, 0, 164, BW, 38, 20); for (let i = 4; i < BW; i += 34) { R(x, i, 169, 28, 28, 19, 0.5); R(x, i, 169, 28, 1, 32, 0.6); R(x, i, 169, 1, 28, 32, 0.6); R(x, i, 196, 28, 1, 0, 0.6); R(x, i + 27, 169, 1, 28, 0, 0.6); }
  R(x, 0, 202, BW, 4, 0); R(x, 0, 202, BW, 1, 20);
  R(x, 0, 206, BW, 64, 20); [210, 216, 246, 258].forEach((y, r) => { R(x, 0, y, BW, 1, 0, 0.6); for (let k = (r * 23) % 60; k < BW; k += 60) R(x, k, y + 1, 1, 6, 0, 0.5); });
  for (let k = 0; k < 40; k++) R(x, hsh(k, 61) * BW, 207 + Math.floor(hsh(k, 62) * 3) * 4 + (hsh(k, 63) > 0.5 ? 40 : 0), 4 + hsh(k, 64) * 10, 1, 32, 0.35);
  R(x, 0, 218, BW, 26, 12); R(x, 0, 218, BW, 1, 13); R(x, 0, 243, BW, 1, 11); R(x, 0, 220, BW, 1, 14, 0.5); R(x, 0, 241, BW, 1, 14, 0.5); for (let k = 6; k < BW; k += 12) { R(x, k, 229, 3, 1, 14, 0.35); R(x, k + 1, 228, 1, 3, 14, 0.35); }
  // 壁灯（不亮）
  for (const sx0 of [60, 296]) { R(x, sx0 - 2, 124, 5, 10, 19); R(x, sx0 - 2, 124, 1, 10, 32); R(x, sx0, 118, 1, 6, 14); oval(x, sx0, 114, 5, 3, 7); R(x, sx0 - 4, 114, 9, 1, 6); R(x, sx0 - 1, 117, 3, 1, 18); }
  // 衣帽架（帽子在动态层）
  R(x, 24, 104, 3, 102, 20); R(x, 24, 104, 1, 102, 19); R(x, 16, 202, 19, 3, 20); R(x, 18, 110, 15, 2, 20);
  for (let y = 114; y < 190; y++) { const hw = y < 120 ? 6 + (y - 114) : y < 180 ? 12 + (y - 120) * 0.06 : 15; R(x, 25 - hw, y, hw * 2, 1, 9); R(x, 25 - hw, y, 1, 1, 10); } R(x, 22, 116, 6, 40, 8); R(x, 12, 122, 3, 60, 8, 0.8); R(x, 36, 122, 3, 58, 8, 0.8); for (let k = 0; k < 4; k++) R(x, 24, 128 + k * 9, 2, 2, 7);
  // 肖像 1：夫人（眼睛在动态层）
  x.save(); x.translate(P1[0], P1[1]);
  R(x, 75, 95, 36, 48, 0, 0.45);
  R(x, 72, 92, 36, 48, 19); R(x, 74, 94, 32, 44, 14); R(x, 74, 94, 32, 1, 5); R(x, 74, 94, 1, 44, 5); R(x, 77, 97, 26, 38, 1);
  oval(x, 90, 113, 9, 12, 52); oval(x, 90, 114, 6, 8, 60); R(x, 86, 108, 3, 5, 59, 0.6); R(x, 80, 126, 20, 9, 13); R(x, 87, 121, 6, 5, 60); R(x, 88, 119, 4, 1, 56); R(x, 85, 108, 3, 1, 0); R(x, 91, 108, 3, 1, 0); R(x, 84, 128, 12, 2, 5, 0.7);
  x.restore();
  // 窗
  R(x, 166, 96, 46, 82, 20); R(x, 166, 96, 46, 1, 32); R(x, 170, 100, 38, 74, 1); R(x, 188, 100, 2, 74, 20); R(x, 170, 134, 38, 2, 20);
  for (const [a, dir] of [[158, 1], [206, -1]]) { R(x, a, 92, 14, 92, 12); for (let k = 2; k < 14; k += 4) { R(x, a + k, 92, 1, 92, 11); R(x, a + k + 1, 92, 1, 92, 13); } R(x, a + (dir > 0 ? 10 : 0), 140, 4, 3, 14); }
  R(x, 156, 88, 66, 8, 13); R(x, 156, 88, 66, 1, 26); for (let k = 158; k < 220; k += 6) R(x, k, 95, 3, 2, 13); R(x, 164, 176, 50, 4, 19); R(x, 164, 176, 50, 1, 32);
  // 落地钟
  R(x, 247, 125, 30, 84, 0, 0.4); R(x, 242, 116, 34, 6, 20); R(x, 242, 116, 34, 1, 32); R(x, 244, 122, 30, 84, 20); R(x, 246, 124, 26, 80, 19); R(x, 246, 124, 1, 80, 32); disc(x, 259, 136, 9, 7); disc(x, 259, 136, 8, 6);
  for (let k = 0; k < 12; k++) R(x, 259 + Math.round(Math.sin(k / 12 * 6.283) * 6.5), 136 - Math.round(Math.cos(k / 12 * 6.283) * 6.5), 1, 1, 20);
  R(x, 259, 129, 1, 7, 0); R(x, 258, 131, 1, 5, 0); R(x, 252, 150, 14, 44, 0); R(x, 252, 150, 14, 1, 20); R(x, 244, 204, 30, 2, 0);
  // 门（光从门缝漏出在动态层）
  R(x, 318, 134, 46, 72, 0); R(x, 322, 138, 38, 68, 19); R(x, 326, 142, 13, 28, 20, 0.7); R(x, 343, 142, 13, 28, 20, 0.7); R(x, 326, 176, 13, 26, 20, 0.7); R(x, 343, 176, 13, 26, 20, 0.7); R(x, 322, 138, 38, 1, 32); R(x, 322, 138, 1, 68, 32); disc(x, 355, 176, 1, 14); R(x, 354, 180, 1, 2, 0);
  // 肖像 3：黑猫
  x.save(); x.translate(0, P1[1]);
  R(x, 393, 101, 32, 40, 0, 0.45);
  R(x, 390, 98, 32, 40, 19); R(x, 392, 100, 28, 36, 14); R(x, 392, 100, 28, 1, 5); R(x, 395, 103, 22, 30, 1); oval(x, 406, 118, 7, 6, 0); R(x, 400, 110, 3, 4, 0); R(x, 409, 110, 3, 4, 0); oval(x, 406, 130, 9, 5, 0);
  x.restore();
  return c;
}
// 小夜在走廊里：位置（连续）、朝向、姿势（逐帧）
function kidB(u, fl) {
  const uq = q12(u); let x = KB.x1, dir = 1, hop = 0, bub = null, bubT = 0;
  const p = { v: 'side', g: -1, ta: 0, face: 'n', bob: (Math.floor(uq / 0.4) & 1) ? -1 : 0 };
  if (u < KB.walk) { x = lerp(KB.x0, KB.x1, u / KB.walk); p.g = Math.floor(uq * 8) & 3; p.bob = 0; }
  else if (u < KB.crouch) { p.ta = u > 1.75 ? 1 : 0; if (uq > 2.05 && uq < 2.15) p.face = 'blink'; }
  else if (u < 2.72) { p.crouch = 1; p.ta = 1; p.bob = 0; p.face = 'blink'; }
  else if (u < KB.bolt) { p.face = 'happy'; p.ta = 1; }
  else if (u < KB.turn) { p.face = 'shock'; p.ta = -1; p.bob = 0; hop = -9 * Math.sin(Math.PI * seg(u, 3.7, 3.95)); }
  else if (u < KB.back) { dir = -1; p.face = uq < 4.7 ? 'shock' : uq > 4.95 && uq < 5.05 ? 'blink' : 'n'; }
  else if (u >= KB.runT) { x = lerp(KB.x1, 318, Math.pow(seg(u, KB.runT, KB.runE), 1.3)); p.run = 1; p.g = Math.floor(uq * 12) & 3; p.bob = 0; }
  if (u >= 1.3 && u < 2.2) { bub = '?'; bubT = 1.3; } else if (u >= 3.7 && u < 4.35) { bub = '!'; bubT = 3.7; } else if (u >= KB.tune && u < KB.tune + 0.45) { bub = '♪'; bubT = KB.tune; }
  if (fl > 0.85) p.flash = 1;
  return { x, dir, p, hop: Math.round(hop), bub, bubT };
}
// 金币：从黑暗里滚出来，转几圈倒下
function coinB(x, u) {
  if (u < KB.coinT || u >= KB.get) return null;
  if (u < KB.coinArr) { const cx = Math.round(300 - (300 - KB.coinX) * eOut(seg(u, KB.coinT, KB.coinArr))); coin(x, cx, FEET - 3, 2, Math.floor(cx / 3) & 3); return [cx, FEET - 3]; }
  if (u < 2.45) { const q = seg(u, KB.coinArr, 2.45), fr = Math.floor(q * q * 14) % 4; coin(x, KB.coinX, FEET - 3 + Math.round(q), q > 0.8 ? 1 : 2, fr); return [KB.coinX, FEET - 3]; }
  oval(x, KB.coinX, FEET - 1, 2, 1, 20); R(x, KB.coinX - 1, FEET - 2, 3, 1, 14); R(x, KB.coinX - 1, FEET - 2, 1, 1, 5); return [KB.coinX, FEET - 1];
}
function sceneB(wc, u) {
  if (!stB) { stB = paintB(); CM = LIT; stBL = paintB(); CM = null; dmB = mk(BW, LH); }
  const x = wc.x;
  const lp = u - KB.bolt, fl = lp < 0 ? 0 : lp < 0.1 ? 1 : lp > 0.16 && lp < 0.24 ? 0.8 : lp < 0.8 ? 0.35 * (1 - (lp - 0.24) / 0.56) : 0;
  x.drawImage(stB.c, 0, 0);
  if (fl > 0.02) { x.globalAlpha = Math.min(1, fl * 1.3); x.drawImage(stBL.c, 0, 0); x.globalAlpha = 1; }
  // 窗：雨夜、玻璃上的水痕、闪电
  R(x, 170, 100, 18, 34, fl > 0.3 ? 30 : 2, 0.9); R(x, 190, 100, 18, 34, fl > 0.3 ? 30 : 2, 0.9); R(x, 170, 136, 38, 38, fl > 0.3 ? 29 : 1, 0.9);
  if (fl > 0.6) { let bx = 196, by = 100; for (let k = 0; k < 5; k++) { const nx = 176 + hsh(k, 33) * 28, ny = by + 12; for (let j = 0; j <= 12; j++) R(x, bx + (nx - bx) * j / 12, by + j, 1, 1, 21); bx = nx; by = ny; } }
  for (let i = 0; i < 16; i++) { const yy = 100 + ((hsh(i, 70) * 74 + u * 60) % 74), xx = 171 + hsh(i, 71) * 36; if (Math.abs(xx - 189) > 1 && Math.abs(yy - 135) > 1) R(x, xx, yy, 1, 2, 30, 0.5); }
  for (let i = 0; i < 5; i++) { const xx = 173 + hsh(i, 75) * 32, yy = 102 + ((hsh(i, 76) * 70 + u * 9) % 70); if (Math.abs(xx - 189) > 1) { R(x, xx, yy, 1, 1, 31, 0.7); R(x, xx, yy - 3, 1, 3, 30, 0.3); } }
  if (fl > 0.05) { poly(x, [[172, 206], [208, 206], [238, 252], [202, 252]], 30, 0.3 * fl); R(x, 205, 206, 3, 46, 0, 0.3 * fl); }
  const K0 = kidB(u, fl);
  if (u < KB.bolt) { R(x, 14, 104, 23, 3, 0); R(x, 18, 94, 15, 10, 0); R(x, 18, 101, 15, 1, 13); }
  // 夫人的眼睛跟着小夜转；回头之后她闭上了眼
  const look = clamp(Math.round((K0.x - 120) / 20), -1, 1), ex = P1[0], ey = P1[1];
  if (u < 4.2) { R(x, 85 + ex, 110 + ey, 3, 2, 17); R(x, 91 + ex, 110 + ey, 3, 2, 17); R(x, 86 + ex + look, 110 + ey, 1, 2, 0); R(x, 92 + ex + look, 110 + ey, 1, 2, 0); } else { R(x, 85 + ex, 111 + ey, 3, 1, 53); R(x, 91 + ex, 111 + ey, 3, 1, 53); }
  const pa = Math.sin(u * 3.2) * 4; R(x, 258 + pa * 0.3, 152, 2, 26, 14, 0.9); disc(x, 259 + pa, 182, 3, 14); R(x, 258 + pa, 181, 1, 1, 5);
  // 门缝光 / 开门
  const tune = seg(u, KB.tune, KB.tune + 0.15) * (1 - seg(u, KB.tune + 0.15, KB.tune + 1)), pulse = 0.5 + 0.5 * Math.sin(u * 5);
  const open = eOut(seg(u, KB.door, KB.door + 0.4));
  if (open > 0) { R(x, 322, 138, 38, 68, 22); R(x, 326, 146, 30, 60, 21, 0.6); R(x, 322, 138, Math.round(38 * (1 - open)) + 2, 68, 20); R(x, 322 + Math.round(38 * (1 - open)), 138, 2, 68, 0); poly(x, [[322, 206], [360, 206], [420, LH], [270, LH]], 22, 0.3 * open); }
  else { const a = 0.45 + 0.35 * pulse + tune; R(x, 320, 138, 2, 68, 22, a); R(x, 360, 138, 2, 68, 22, a); R(x, 322, 205, 38, 1, 21, a); R(x, 318, 206, 46, 2, 22, a * 0.6); R(x, 354, 180, 1, 2, 22, a); }
  const cp = coinB(x, u);
  oval(x, K0.x, FEET, 9, 2, 0, 0.45);
  const L = kid(x, K0.x, FEET + K0.hop, K0.p, K0.dir < 0);
  // 墙上的影子（闪电那一下）：戴着衣帽架上那顶帽子、长爪子伸到小夜头上
  const sh = fl > 0.3 ? 0.9 : u > KB.bolt && u < KB.bolt + 0.7 ? 0.9 * (1 - seg(u, KB.bolt + 0.2, KB.bolt + 0.7)) : 0;
  if (sh > 0) {
    x.save(); x.beginPath(); x.rect(0, 0, BW, 206); x.clip(); x.translate(-18, 22);
    x.globalAlpha = sh; x.fillStyle = PAL[0];
    const P = (pts) => { x.beginPath(); x.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach((q) => x.lineTo(q[0], q[1])); x.fill(); };
    P([[40, 206], [48, 130], [58, 116], [78, 116], [90, 132], [98, 206]]); oval(x, 68, 100, 13, 16, 0, sh); R(x, 44, 84, 48, 4, 0); R(x, 54, 64, 28, 21, 0);
    P([[84, 124], [110, 140], [132, 150], [140, 158], [130, 158], [106, 146], [82, 134]]);
    [[140, 158, 150, 154], [140, 158, 152, 162], [138, 160, 146, 170], [134, 160, 138, 172]].forEach(([a, b, c2, d]) => { const n = Math.max(Math.abs(c2 - a), Math.abs(d - b)); for (let k = 0; k <= n; k++) x.fillRect(Math.round(a + (c2 - a) * k / n), Math.round(b + (d - b) * k / n), 2, 2); });
    x.globalAlpha = 1; R(x, 60, 98, 4, 1, 57, sh); R(x, 72, 98, 4, 1, 57, sh); for (let k = -8; k <= 8; k++) R(x, 68 + k, 106 + Math.round(3 * (1 - (k / 8) ** 2)), 1, 1, 18, sh);
    x.restore();
  }
  // 黑暗：只有手电、身边一圈、窗、门缝是亮的
  const dm = dmB.x; dm.globalCompositeOperation = 'source-over'; dm.globalAlpha = 1; dm.fillStyle = PAL[0]; dm.fillRect(0, 0, BW, LH); dm.globalCompositeOperation = 'destination-out';
  const hole = (fn, a) => { dm.globalAlpha = a; dm.beginPath(); fn(); dm.fill(); };
  const kx = K0.x, ky = FEET - 32 + K0.hop;
  const ag = dm.createRadialGradient(kx, ky, 6, kx, ky, 46); ag.addColorStop(0, 'rgba(0,0,0,0.72)'); ag.addColorStop(0.55, 'rgba(0,0,0,0.4)'); ag.addColorStop(1, 'rgba(0,0,0,0)'); dm.globalAlpha = 1; dm.fillStyle = ag; dm.fillRect(kx - 46, ky - 46, 92, 92); dm.fillStyle = PAL[0];
  const ta = K0.p.ta || 0, dir = K0.dir, wob = Math.sin(u * 2.3) * 0.05 + Math.sin(u * 7.1) * 0.015, ang = dir > 0 ? ta * 0.6 + wob : Math.PI - ta * 0.6 - wob;
  const cone = (h, len) => { dm.moveTo(L[0], L[1]); dm.lineTo(L[0] + Math.cos(ang - h) * len, L[1] + Math.sin(ang - h) * len); dm.lineTo(L[0] + Math.cos(ang + h) * len, L[1] + Math.sin(ang + h) * len); };
  if (!K0.p.flash) { hole(() => cone(0.36, 200), 0.45); hole(() => cone(0.26, 185), 0.5); hole(() => cone(0.15, 170), 0.55); }
  hole(() => dm.rect(166, 96, 46, 82), 0.3); hole(() => dm.rect(160, 212, 70, 20), 0.18);
  hole(() => dm.rect(310, 130, 62, 80), open > 0 ? 1 : 0.25 + 0.25 * tune); if (open > 0) hole(() => { dm.moveTo(322, 206); dm.lineTo(360, 206); dm.lineTo(430, LH); dm.lineTo(260, LH); }, open);
  if (cp) hole(() => dm.arc(cp[0], cp[1], 5, 0, 7), 0.8);
  x.globalAlpha = (u < 0.35 ? 1 : 0.94) * (1 - Math.min(1, fl * 1.1)); x.drawImage(dmB.c, 0, 0); x.globalAlpha = 1;
  if (!K0.p.flash) {
    lighter(x, () => { poly(x, [L, [L[0] + Math.cos(ang - 0.3) * 170, L[1] + Math.sin(ang - 0.3) * 170], [L[0] + Math.cos(ang + 0.3) * 170, L[1] + Math.sin(ang + 0.3) * 170]], 44, 0.1); poly(x, [L, [L[0] + Math.cos(ang - 0.12) * 120, L[1] + Math.sin(ang - 0.12) * 120], [L[0] + Math.cos(ang + 0.12) * 120, L[1] + Math.sin(ang + 0.12) * 120]], 51, 0.06); });
    // 光打到地上 / 墙上的光斑
    const sa = Math.sin(ang), ca = Math.cos(ang); let hx, hy, hr = 20;
    if (sa > 0.08) { const t = (FEET - L[1]) / sa; hx = L[0] + ca * t; hy = FEET - 1; hr = 10 + t * 0.12; if (t > 200) hx = null; } else { hx = L[0] + ca * 150; hy = L[1] + sa * 150; }
    if (hx != null) lighter(x, () => { oval(x, hx, hy, hr, sa > 0.08 ? 3 : hr * 0.8, 51, 0.12); oval(x, hx, hy, hr * 0.5, sa > 0.08 ? 1.5 : hr * 0.4, 51, 0.12); });
    // 光里飘的灰尘
    for (let i = 0; i < 60; i++) { const mx = (hsh(i, 1) * BW + Math.sin(u * 0.5 + i) * 6 + u * 2) % BW, my = 110 + hsh(i, 2) * 118 + Math.sin(u * 0.7 + i * 1.3) * 4, dx = mx - L[0], dy = my - L[1], d = Math.hypot(dx, dy); if (d < 8 || d > 175) continue; let da = Math.atan2(dy, dx) - ang; da = Math.atan2(Math.sin(da), Math.cos(da)); if (Math.abs(da) > 0.3) continue; const tw = Math.sin(u * 3 + i * 2.1) > 0.3; R(x, mx, my, 1, 1, tw ? 51 : 5, 0.9 * (1 - d / 175)); }
    lighter(x, () => halo(x, L[0], L[1], 5, 5, 51, 0.5)); R(x, L[0], L[1], 1, 1, 21);
  }
  if (u > 0.35 && u < 0.95 && !(u > 0.65 && u < 0.72)) { R(x, 296, 196, 2, 1, 57); R(x, 303, 196, 2, 1, 57); }
  if (cp) { const g = Math.floor(u * 6) % 5 === 0; if (g) sparkle(x, cp[0] + 2, cp[1] - 3, 1, 5); lighter(x, () => halo(x, cp[0], cp[1], 5, 4, 14, 0.4)); }
  // 「获得道具」：金币从地上弹起来，悬在头顶发光
  if (u >= KB.get && u < KB.bolt - 0.05) { const a = u - KB.get, q = eOut(seg(a, 0, 0.3)), cx = Math.round(lerp(KB.coinX, K0.x + 1, q)), cy = Math.round(lerp(FEET - 3, FEET - 74, q) - Math.sin(Math.PI * q) * 6 + (a > 0.3 ? Math.sin(a * 9) : 0)); if (a > 0.1) { lighter(x, () => halo(x, cx, cy, 14, 14, 51, 0.35)); for (let k = 0; k < 8; k++) { const an = k / 8 * Math.PI * 2 + a * 2; if ((k + Math.floor(a * 12)) % 2) R(x, cx + Math.cos(an) * 9, cy + Math.sin(an) * 9, 1, 1, 51); } } coin(x, cx, cy, 3, Math.floor(a * 10) % 4); burstAt(x, cx, cy, a - 0.25, 18, 5, 18, 0.6, FXC); if (Math.floor(u * 8) % 2) sparkle(x, cx + 5, cy - 4, 2, 21); }
  for (let i = 0; i < 4; i++) { const a = u - KB.tune - i * 0.28; if (a < 0 || a > 1.4) continue; const nx = 335 - a * 22 + Math.sin(a * 5 + i) * 4, ny = 170 - a * 26; bm(x, Math.round(nx), Math.round(ny), GLY['♪'], a > 1 ? 23 : 22); }
  if (u > KB.runT) for (let k = 0; k < 10; k++) { const tk = KB.runT + k / 6, a = u - tk; if (a < 0 || a > 0.4) continue; const px = lerp(KB.x1, 318, Math.pow(seg(tk, KB.runT, KB.runE), 1.3)) - 6; disc(x, px - a * 10, FEET - 2 - a * 6, 1 + a * 5, a < 0.2 ? 18 : 10, 0.8 - a * 1.5); }
  if (K0.p.face === 'shock' && K0.dir > 0 && u < KB.turn) R(x, K0.x - 4, FEET - 56 + K0.hop + Math.round(seg(u, 3.75, 4.3) * 4), 2, 3, 41);
  if (K0.bub) bubble(x, K0.x + (K0.dir > 0 ? 4 : -4), FEET - 62 + K0.hop, K0.bub, u - K0.bubT);
  return { fl, kx: K0.x };
}
function camB(u, kx) {
  const punch = u >= KB.bolt + 0.02 && u < KB.turn, z = punch ? 2.5 : 2;
  const lead = u < KB.turn ? 30 : u < KB.back ? lerp(30, -24, eIO(seg(u, KB.turn, KB.turn + 0.35))) : lerp(-24, 36, eIO(seg(u, KB.back, KB.back + 0.5)));
  return { x: clamp(Math.round(kx) + Math.round(lead), 240 / z, BW - 240 / z), y: punch ? 182 : 184, z };
}
// ═════════════════════ 第三幕：恶魔脸老虎机（480×270）═════════════════════
const SCRN = { x: 186, y: 69, w: 108, h: 76 };
const MENU = { x: 240, y: 142, z: 1.5 };
const KC = { x: 170, y: 228 };
const SLOT = [198, 193];
const SYMS = ['cherry', 'bell', '7', 'eye', 'coin', 'skull'];
const W0 = 2.95, STOP = [3.5, 3.9, 4.8], SPD = 16, CL = 7.4;
const BULBS = []; for (let k = 0; k <= 18; k++) { const a = Math.PI + Math.PI * k / 18; BULBS.push([240 + Math.round(Math.cos(a) * 72), 40 + Math.round(Math.sin(a) * 26)]); } for (let y = 46; y <= 60; y += 7) { BULBS.unshift([168, y]); BULBS.push([312, y]); }
let stC = null, stCab = null;
// 房间（背景层）
function paintRoom() {
  const c = mk(LW, LH), x = c.x;
  R(x, 0, 0, LW, 222, 52); for (let i = 0; i < LW; i += 22) { R(x, i, 0, 1, 222, 0, 0.5); R(x, i + 1, 0, 1, 222, 53, 0.5); for (let y = 10 + (i % 3) * 13; y < 222; y += 47) R(x, i + 2, y, 19, 1, 0, 0.25); } R(x, 0, 0, LW, 26, 0, 0.5); R(x, 0, 26, LW, 10, 0, 0.25); R(x, 0, 216, LW, 6, 0, 0.5);
  for (let k = 0; k < 20; k++) R(x, hsh(k, 80) * LW, 30 + hsh(k, 81) * 180, 2, 1, 0, 0.4);
  // 海报：画叉眼睛的兔子
  R(x, 45, 73, 56, 72, 0, 0.4);
  R(x, 42, 70, 56, 72, 7); R(x, 44, 72, 52, 68, 6); R(x, 44, 72, 52, 1, 17); oval(x, 70, 104, 14, 13, 17); R(x, 60, 76, 5, 18, 17); R(x, 75, 76, 5, 18, 17); R(x, 61, 78, 3, 14, 63); R(x, 76, 78, 3, 14, 63, 0.6);
  [[64, 100], [74, 100]].forEach(([a, b]) => { for (let k = -2; k <= 2; k++) { R(x, a + k, b + k, 1, 1, 0); R(x, a + k, b - k, 1, 1, 0); } });
  for (let k = -6; k <= 6; k++) R(x, 70 + k, 110 + Math.round(2 * (1 - (k / 6) ** 2)), 1, 1, 56); R(x, 50, 124, 40, 2, 13, 0.7); R(x, 54, 130, 32, 2, 13, 0.5); R(x, 68, 71, 4, 3, 7); R(x, 69, 70, 2, 2, 14);
  for (let k = 0; k < 12; k++) R(x, 98 - k, 142 - Math.floor(k * 0.8), k, 1, 52);
  // 吊着的灯泡（不亮）、挂钟
  R(x, 110, 0, 1, 40, 0); R(x, 108, 40, 5, 4, 28); disc(x, 110, 47, 3, 7); R(x, 109, 45, 1, 2, 17);
  disc(x, 424, 52, 11, 0, 0.4); disc(x, 422, 50, 11, 20); disc(x, 422, 50, 9, 6); R(x, 422, 43, 1, 7, 0); R(x, 421, 45, 1, 5, 0); for (let k = 0; k < 12; k++) R(x, 422 + Math.round(Math.sin(k / 12 * 6.283) * 7.5), 50 - Math.round(Math.cos(k / 12 * 6.283) * 7.5), 1, 1, 20);
  // 架子和玩偶
  R(x, 366, 112, 86, 4, 20); R(x, 366, 112, 86, 1, 32); R(x, 366, 116, 86, 3, 0, 0.4); R(x, 366, 156, 86, 4, 20); R(x, 366, 156, 86, 1, 32); R(x, 366, 160, 86, 3, 0, 0.4);
  disc(x, 382, 101, 8, 19); disc(x, 380, 99, 5, 32, 0.5); disc(x, 376, 93, 3, 19); disc(x, 388, 93, 3, 19); R(x, 379, 100, 2, 2, 0); R(x, 384, 100, 2, 2, 0); disc(x, 382, 106, 2, 32);
  oval(x, 410, 104, 7, 8, 60); R(x, 403, 94, 14, 6, 13); R(x, 406, 102, 2, 2, 0); R(x, 412, 102, 2, 2, 0); R(x, 408, 108, 4, 1, 56);
  disc(x, 436, 146, 9, 36); disc(x, 434, 144, 5, 37, 0.5); R(x, 432, 143, 2, 2, 0); R(x, 438, 143, 2, 2, 0); R(x, 430, 134, 3, 5, 36); R(x, 440, 134, 3, 5, 36);
  disc(x, 392, 148, 7, 18); R(x, 389, 146, 2, 2, 0); R(x, 394, 146, 2, 2, 0); for (let k = 0; k < 5; k++) R(x, 390 + k, 151, 1, 1, 0);
  // 蛛网
  for (const [a, dir] of [[0, 1], [LW, -1]]) { for (let k = 0; k < 5; k++) { const n = 40; for (let j = 0; j < n; j++) { const q = j / n, ang = (k / 4) * Math.PI / 2; R(x, a + dir * Math.cos(ang) * q * 44, Math.sin(ang) * q * 40, 1, 1, 10, 0.5); } } for (let r = 12; r <= 40; r += 9) for (let j = 0; j <= 20; j++) { const ang = (j / 20) * Math.PI / 2; R(x, a + dir * Math.cos(ang) * r, Math.sin(ang) * r * 0.9 + 2, 1, 1, 10, 0.4); } }
  // 地板：透视棋盘格，远处暗
  for (let y = 222; y < LH; y++) { const s = 1 + (y - 222) / 72, row = Math.floor(Math.log(1 + (y - 222) / 5) * 2.2); for (let k = -16; k < 16; k++) { const a = Math.round(240 + k * 24 * s), b = Math.round(240 + (k + 1) * 24 * s); R(x, a, y, b - a, 1, (k + row) & 1 ? 8 : 9); R(x, a, y, 1, 1, 0, 0.5); } }
  R(x, 0, 222, LW, 1, 0, 0.6); R(x, 0, 223, LW, 4, 0, 0.3); oval(x, 240, 224, 92, 6, 0, 0.6);
  return c;
}
// 机台（透明底，单独一层：中奖的放射光在它后面）。浮雕画法：酒红烤漆机身、两侧带竖槽的立柱和金柱头、拉丝镀铬屏框和螺丝、
// 金色转轮框、斜面控制台（塑料按钮 + 镀铬圈、投币口）、金唇獠牙出币口、恶魔脸招牌（金边、眼窝、怒眉、獠牙）、骨质螺旋角、金爪脚
function paintCab() {
  const r = new Relief(LW, LH);
  const arch = (cx, cy, rx, ry, yb) => (x, y) => (y < cy ? (Math.hypot((x - cx) / rx, (y - cy) / ry) - 1) * Math.min(rx, ry) : Math.max(Math.abs(x - cx) - rx, y - yb));
  const rectF = (x0, y0, x1, y1) => (x, y) => Math.max(x0 - x, x - x1, y0 - y, y - y1);
  // 角：一串越来越细的骨质球，带一圈圈的棱
  for (const dir of [-1, 1]) for (let k = 0; k <= 60; k++) {
    const t = k / 60, u = 1 - t, px = u * u * (240 + dir * 60) + 2 * u * t * (240 + dir * 84) + t * t * (240 + dir * 86), py = u * u * 26 + 2 * u * t * 22 + t * t * 0;
    const rr = (5.2 * (1 - t) + 0.9) * (1 + 0.1 * Math.sin(t * 46));
    r.dome(px, py, rr, rr, 'bone', 4 + t * 2, rr * 0.9, 1);
  }
  // 招牌：金边拱 → 酒红面 → 凹进去的脸
  r.sdf(162, 10, 318, 63, arch(240, 40, 77, 29, 63), 'gold', 5, 3, 3);
  r.sdf(167, 15, 313, 63, arch(240, 40, 72, 24, 63), 'lacq', 6, 2.5, 3);
  r.sdf(178, 23, 302, 59, arch(240, 40, 62, 16.5, 59), 'lacqD', 8.5, -1.5, 2);
  BULBS.forEach(([bx, by]) => r.ring(bx + 0.5, by + 0.5, 2.9, 2.9, 1.3, 'chrome', 8, 1));
  for (const ex of [218, 262]) { r.ring(ex + 0.5, 36.5, 11, 7.8, 2.4, 'chrome', 7, 2); r.box(ex - 8, 31, ex + 9, 42, 4, 'ink', 6, 0, 1); }
  r.line([[204, 25], [213, 26], [227, 30]], 1.7, 'gold', 7, 1.6, 1); r.line([[276, 25], [267, 26], [253, 30]], 1.7, 'gold', 7, 1.6, 1);
  for (let xx = 198; xx <= 282; xx++) { const yc = 48 + Math.round(4 * (1 - ((xx - 240) / 44) ** 2)); for (let y = yc - 2; y <= yc + 2; y++) r.set(xx, y, 'ink', 5.5); }
  for (let xx = 200; xx <= 278; xx += 6) { const yc = 48 + Math.round(4 * (1 - ((xx + 1 - 240) / 44) ** 2)); for (let j = 0; j < 3; j++) for (let k = -1 + j * 0.5; k <= 1 - j * 0.5; k += 0.5) r.set(xx + 1 + k, yc - 2 + j, 'bone', 7.5 - j * 0.6); }
  for (let xx = 203; xx <= 276; xx += 6) { const yc = 48 + Math.round(4 * (1 - ((xx + 1 - 240) / 44) ** 2)); for (let j = 0; j < 2; j++) for (let k = -0.5 + j * 0.5; k <= 0.5 - j * 0.5; k += 0.5) r.set(xx + 1 + k, yc + 2 - j, 'bone', 7 - j * 0.5); }
  // 机身和两侧立柱
  r.box(172, 58, 308, 203, 3, 'lacq', 2, 4, 4);
  for (const px of [172, 300]) {
    r.box(px, 64, px + 8, 197, 1.5, 'lacq', 6, 2, 1.5);
    r.groove(px + 3, 72, 188, 1.4); r.groove(px + 6, 72, 188, 1.4);
    r.box(px - 1, 61, px + 9, 70, 1, 'gold', 7, 1.8, 1.5); r.box(px - 1, 189, px + 9, 198, 1, 'gold', 7, 1.8, 1.5);
    for (let y = 64; y <= 67; y += 3) r.line([[px, y], [px + 8, y]], 0.6, 'gold', 8.5, 0.6);
    r.dome(px + 4, 130, 3, 3, 'gold', 8, 1.8); r.dome(px + 4, 130, 1.2, 1.2, 'red', 9.6, 0.8);
  }
  // 屏幕：拉丝镀铬厚框（圆角）→ 往里倒角 → 屏幕玻璃（动态层画内容）；四角螺丝
  r.box(180, 63, 300, 151, 5, 'chrome', 6, 2.6, 3);
  r.box(184, 67, 296, 147, 3, 'chrome', 8.6, -2.6, 2);
  r.box(SCRN.x, SCRN.y, SCRN.x + SCRN.w, SCRN.y + SCRN.h, 1, 'ink', 5, 0, 1);
  for (const [a, b] of [[183, 66], [297, 66], [183, 148], [297, 148]]) { r.dome(a, b, 1.8, 1.8, 'chrome', 8.6, 1.4); r.set(a - 0.5, b - 0.5, 'ink', 9.5); }
  // 转轮框：金，三个往里凹的镀铬窗
  r.box(184, 151, 296, 188, 2, 'gold', 6, 2, 2);
  for (let i = 0; i < 3; i++) { const wx = 187 + i * 37; r.box(wx, 155, wx + 32, 185, 2, 'chrome', 8, -2, 1.5); r.box(wx + 1, 157, wx + 31, 183, 1, 'ink', 5, 0, 1); }
  for (const xx of [223, 260]) { r.dome(xx, 158, 1.4, 1.4, 'chrome', 8, 1); r.dome(xx, 182, 1.4, 1.4, 'chrome', 8, 1); }
  // 控制台：越往下越高的斜面（朝上，受光），前沿一条镀铬
  for (let y = 187; y <= 198; y++) for (let x = 174; x <= 306; x++) { const e = Math.min(x - 174, 306 - x); r.set(x, y, 'lacq', 5 + (y - 187) * 0.32 + Math.min(1, e / 2)); }
  r.box(174, 198, 306, 201, 1, 'chrome', 8.5, 1, 1);
  r.box(SLOT[0] - 6, 189, SLOT[0] + 6, 197, 1.5, 'chrome', 9.5, 1.5, 1.5); r.box(SLOT[0] - 1.5, 190.5, SLOT[0] + 1.5, 195.5, 0.5, 'ink', 10.5, -2, 1);
  [[226, 'red'], [242, 'yel'], [258, 'teal']].forEach(([bx, m]) => { r.ring(bx + 0.5, 193.5, 4.7, 4.3, 1.4, 'chrome', 9.5, 1.2); r.dome(bx + 0.5, 193.2, 3.4, 3.1, m, 9.5, 2.4); });
  r.ring(282.5, 193.5, 5.8, 5.3, 1.4, 'chrome', 9.5, 1.2); r.dome(282.5, 193.2, 4.4, 4, 'pink', 9.5, 2.8);
  // 底座：暗一级的烤漆、踢脚凹槽、两侧金章、出币口（金唇 + 深洞 + 上下獠牙）、金爪脚
  r.box(170, 200, 310, 223, 2, 'lacqD', 2, 3, 3);
  r.box(176, 216, 304, 221, 1, 'lacqD', 5, -1.4, 1.5);
  for (const ex of [190, 290]) { r.dome(ex, 208, 5, 5, 'gold', 5, 2.2); r.ring(ex + 0.5, 208.5, 5.4, 5.4, 1.2, 'gold', 6.5, 0.8); for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + k * Math.PI * 2 / 5; r.line([[ex, 208], [ex + Math.cos(a) * 3, 208 + Math.sin(a) * 3]], 0.6, 'gold', 7.5, 0.6); } }
  r.box(210, 203, 270, 219, 5, 'gold', 5, 2.6, 2.5);
  r.box(214, 206, 266, 216, 3, 'ink', 7.6, -4, 2);
  for (let xx = 217; xx <= 262; xx += 5) for (let j = 0; j < 3; j++) for (let k = -1 + j * 0.5; k <= 1 - j * 0.5; k += 0.5) r.set(xx + k, 206 + j, 'bone', 7 - j * 0.5);
  for (let xx = 219.5; xx <= 262; xx += 5) for (let j = 0; j < 2; j++) for (let k = -0.5 + j * 0.5; k <= 0.5 - j * 0.5; k += 0.5) r.set(xx + k, 215 - j, 'bone', 6.5 - j * 0.4);
  for (const fx of [181, 299]) { r.dome(fx, 222, 8, 3.6, 'gold', 1, 2.6, 1); for (let k = -1; k <= 1; k++) r.dome(fx + k * 4.2, 225, 2.3, 1.8, 'gold', 2.5, 1.6, 1); }
  // 拉杆的镀铬座
  r.box(306, 139, 316, 158, 1.5, 'chrome', 6, 2, 1.5); r.dome(311, 148, 3.5, 3.5, 'chrome', 8, 2);
  return r.render();
}
// 符号 14×14
function sym(x, k, cx, cy, o) {
  o = o || {};
  if (k === '7') { R(x, cx - 5, cy - 6, 11, 3, 55); R(x, cx - 4, cy - 5, 9, 1, 57); for (let j = 0; j < 9; j++) R(x, cx + 2 - Math.round(j * 0.5), cy - 3 + j, 3, 1, j < 1 ? 55 : 57); R(x, cx + 1, cy - 3, 1, 9, 58); }
  else if (k === 'cherry') { disc(x, cx - 3, cy + 3, 3, 56); disc(x, cx - 3, cy + 3, 2, 57); R(x, cx - 4, cy + 1, 1, 1, 58); disc(x, cx + 3, cy + 2, 3, 56); disc(x, cx + 3, cy + 2, 2, 57); R(x, cx + 2, cy, 1, 1, 58); for (let j = 0; j < 7; j++) { R(x, cx - 2 + j * 0.4, cy - j, 1, 1, 36); R(x, cx + 3 - j * 0.3, cy - 1 - j * 0.7, 1, 1, 36); } R(x, cx, cy - 7, 4, 2, 37); }
  else if (k === 'bell') { for (let j = 0; j < 10; j++) { const hw = 1 + Math.round(j * 0.55); R(x, cx - hw, cy - 5 + j, hw * 2 + 1, 1, j < 1 ? 20 : 14); R(x, cx - hw, cy - 5 + j, 1, 1, 5); } R(x, cx - 6, cy + 5, 13, 2, 19); disc(x, cx, cy + 7, 1, 20); R(x, cx, cy - 7, 1, 2, 20); }
  else if (k === 'coin') { disc(x, cx, cy, 6, 20); disc(x, cx, cy, 5, 14); R(x, cx - 3, cy - 4, 2, 1, 5); R(x, cx - 1, cy - 3, 2, 6, 19); R(x, cx - 2, cy - 2, 4, 1, 19); R(x, cx - 2, cy + 1, 4, 1, 19); }
  else if (k === 'skull') { disc(x, cx, cy - 1, 6, 7); disc(x, cx, cy - 1, 5, 6); R(x, cx - 3, cy + 4, 7, 3, 6); R(x, cx - 4, cy - 2, 3, 3, 0); R(x, cx + 2, cy - 2, 3, 3, 0); R(x, cx, cy + 1, 1, 2, 0); for (let i = -3; i <= 3; i += 2) R(x, cx + i, cy + 5, 1, 2, 7); }
  else if (k === 'eye') {
    const op = o.open == null ? 1 : o.open, lx = o.lx || 0, ly = o.ly || 0;
    oval(x, cx, cy, 7, 4, 0); if (op > 0.15) { oval(x, cx, cy, 6, Math.max(1, Math.round(3 * op)), 21); disc(x, cx + lx, cy + ly, 2, 57); R(x, cx + lx, cy + ly - 2, 1, 4, 0); R(x, cx + lx - 1, cy + ly - 1, 1, 1, 21); } else R(x, cx - 6, cy, 13, 1, 13);
  }
}
function reelPos(i, w) {
  const Tn = STOP[i], D = (r) => (i < 2 ? SPD * r : r > 0.7 ? SPD * (r - 0.7) + SPD * 0.35 : SPD * 0.35 * (r / 0.7) ** 2);
  const d0 = D(Tn - W0), tgt = 6 * Math.ceil((d0 + 2) / 6) + 3;
  if (w < W0) return [0, 1, 4][i];
  if (w >= Tn) return tgt - 0.22 * Math.sin(Math.PI * seg(w, Tn, Tn + 0.2));
  return tgt - D(Tn - Math.max(W0, w));
}
function reels(x, w, T, menu) {
  for (let i = 0; i < 3; i++) {
    const wx = 188 + i * 37, p = menu ? reelPos(i, 99) : reelPos(i, w), spin = !menu && w > W0 && w < STOP[i];
    x.save(); x.beginPath(); x.rect(wx, 157, 30, 26); x.clip();
    R(x, wx, 157, 30, 26, 17); R(x, wx, 157, 30, 3, 18); R(x, wx, 180, 30, 3, 18); R(x, wx, 157, 30, 1, 7); R(x, wx, 182, 30, 1, 7);
    const base = Math.floor(p);
    for (let k = base - 1; k <= base + 1; k++) {
      const idx = ((k % 6) + 6) % 6, y = 170 + Math.round((p - k) * 20);
      let o = null;
      if (SYMS[idx] === 'eye') { const st = menu ? 1 : seg(w, STOP[i], STOP[i] + 0.1); const stare = menu ? 0 : w >= 4.85 + i * 0.12 ? 1 : 0; const bl = menu ? (T + i * 1.3) % 4.7 < 0.12 : false; o = { open: bl ? 0 : Math.max(0.3, st), lx: stare ? -2 : menu ? Math.round(Math.sin(T * 0.8 + i) * 2) : 0, ly: stare ? 1 : menu ? Math.round(Math.sin(T * 0.53 + i * 2)) : 0 }; }
      sym(x, SYMS[idx], wx + 15, y, o);
      if (spin && (i < 2 || w < STOP[2] - 0.5)) { R(x, wx + 2, y - 9, 26, 1, 18, 0.6); R(x, wx + 2, y + 9, 26, 1, 18, 0.6); }
    }
    if (spin) { x.globalAlpha = 0.35; x.drawImage(x.canvas, wx, 157, 30, 26, wx, 161, 30, 26); x.globalAlpha = 1; }
    x.restore();
    const hit = !menu && w >= STOP[i] && w < STOP[i] + 0.15; if (hit) R(x, wx, 157, 30, 26, 21, 0.5);
    R(x, wx + 2, 158, 12, 1, 21, 0.4); R(x, wx + 2, 159, 6, 1, 21, 0.25); R(x, wx + 29, 157, 1, 26, 0, 0.3);
  }
  R(x, 186, 169, 108, 1, 57, 0.35);
}
function screen(x, w, T, menu) {
  const s = SCRN;
  const on = menu || w >= 1.3;
  if (!on) { R(x, s.x, s.y, s.w, s.h, 0); for (let k = 0; k < 10; k++) R(x, s.x + 10 + k * 2, s.y + 6 + k * 2, 30, 1, 1, 0.5); return; }
  if (!menu && w < 1.45) { const q = seg(w, 1.3, 1.45); R(x, s.x, s.y, s.w, s.h, 0); const hh = Math.max(1, Math.round(s.h * q * q)); R(x, s.x, s.y + s.h / 2 - hh / 2, s.w, hh, 21, 0.9); return; }
  R(x, s.x, s.y, s.w, s.h, 1); halo(x, s.x + s.w / 2, s.y + s.h / 2, 60, 40, 22, 0.25);
  if (!menu && w < 2.0) {
    const f = Math.floor(w * 24);
    const cols = [PAL[9], PAL[10], PAL[18]]; for (let j = 0; j < s.h; j += 2) for (let i = 0; i < s.w; i += 2) { const v = hsh(i * 131 + j, f); if (v > 0.55) { x.fillStyle = cols[v > 0.9 ? 2 : v > 0.75 ? 1 : 0]; x.fillRect(s.x + i, s.y + j, 2, 2); } }
    if (w > 1.65 && w < 1.87) {
      const jx = Math.round((hsh(f, 9) - 0.5) * 6), cx = s.x + s.w / 2 + jx, cy = s.y + s.h / 2;
      R(x, s.x, s.y, s.w, s.h, 0, 0.8);
      for (let k = 0; k < 12; k++) { R(x, cx - 34 + k * 2, cy - 22 + k, 4, 3, 57); R(x, cx + 30 - k * 2, cy - 22 + k, 4, 3, 57); }
      for (let k = -36; k <= 36; k++) { const yy = cy + 8 + Math.round(12 * (1 - (k / 36) ** 2)); R(x, cx + k, cy + 8, 1, yy - cy - 8, 0); R(x, cx + k, yy, 1, 2, 57); if (((k + 36) % 6) < 3) R(x, cx + k, cy + 8, 1, Math.max(0, Math.round((yy - cy - 8) * 0.4)), 21); }
      R(x, s.x, cy - 4 + (f % 3) * 3, s.w, 2, 22, 0.6);
    }
  } else {
    for (let j = 0; j < s.h; j += 6) R(x, s.x, s.y + j, s.w, 1, 3, 0.6);
    const gl = !menu && w < 5.2 ? seg(w, 3.0, 5.2) : 1; halo(x, s.x + s.w / 2, s.y + s.h / 2, 50, 32, 22, 0.25 * gl);
  }
  x.globalAlpha = 0.25; x.fillStyle = PAL[0]; for (let y = s.y + (Math.floor(T * 5) % 2); y < s.y + s.h; y += 2) x.fillRect(s.x, y, s.w, 1); x.globalAlpha = 1;
}
function eyeLamp(x, cx, cy, op, lx, ly, pw) {
  halo(x, cx, cy, 14, 9, 57, pw ? 0.35 : 0.15);
  oval(x, cx, cy, 8, 5, 0);
  if (op < 0.2) { R(x, cx - 7, cy, 15, 1, pw ? 56 : 55); return; }
  oval(x, cx, cy, 7, Math.max(1, Math.round(4 * op)), pw ? 17 : 7);
  disc(x, cx + lx, cy + ly, 3, pw ? 57 : 56); R(x, cx + lx, cy + ly - 3, 1, 6, 0); if (pw) R(x, cx + lx - 2, cy + ly - 2, 1, 1, 21);
  if (op < 1) R(x, cx - 7, cy - 5, 15, Math.round(5 * (1 - op)), 12);
}
function lever(x, a) {
  const px = 311, py = 148, L = 40, ex = px + Math.cos(a) * L, ey = py + Math.sin(a) * L;
  for (let k = 0; k <= L; k++) { const qx = px + Math.cos(a) * k, qy = py + Math.sin(a) * k; R(x, qx, qy + 1, 3, 2, 0, 0.35); R(x, qx - 1, qy - 1, 3, 2, 28); R(x, qx - 1, qy - 1, 1, 1, 31); R(x, qx + 1, qy, 1, 1, 27); }
  disc(x, px, py, 2, 29); R(x, px - 1, py - 1, 1, 1, 21);
  disc(x, ex + 1, ey + 2, 5, 0, 0.45); disc(x, ex, ey, 5, 55); disc(x, ex - 0.5, ey - 0.5, 4, 56); disc(x, ex - 1, ey - 1, 3, 57); disc(x, ex - 2, ey - 2, 1.5, 58); R(x, ex - 2, ey - 3, 1, 1, 21); R(x, ex + 2, ey + 3, 2, 1, 58, 0.6);
}
const COINS = []; for (let i = 0; i < 48; i++) COINS.push({ t0: 5.22 + (i % 24) * 0.028 + (i >= 24 ? 0.14 : 0), vx: (hsh(i, 31) - 0.5) * 170, vy: -(120 + hsh(i, 32) * 120), fy: 226 + hsh(i, 33) * 40, ph: Math.floor(hsh(i, 34) * 4), x0: 240 + (hsh(i, 35) - 0.5) * 36 });
function coinAt(c, a) { let x = c.x0, y = 208, vx = c.vx, vy = c.vy, rest = false; const n = Math.min(300, Math.floor(a * 60)); for (let i = 0; i < n && !rest; i++) { const dt = 1 / 60; x += vx * dt; vy += 440 * dt; y += vy * dt; if (y > c.fy) { y = c.fy; vy = -vy * 0.38; vx *= 0.6; if (Math.abs(vy) < 30) rest = true; } } return [x, y, rest]; }
function kidC(w, T, menu) {
  const p = { v: 'back', g: -1, arm: 'down', bob: 0 }; let x = KC.x, y = KC.y, hop = 0, bub = null, bubT = 0;
  const wq = q12(w), tq = q12(T);
  if (menu || w >= 6.2) { p.bob = (Math.floor(tq / 0.5) & 1) ? -1 : 0; }
  else if (w < 1.2) { const q = eOut(seg(w, 0.2, 1.2)); x = lerp(140, KC.x, q); y = lerp(290, KC.y, q); p.g = w < 1.1 ? Math.floor(wq * 8) & 3 : -1; }
  else if (w < 2.0) { p.bob = (Math.floor(wq / 0.4) & 1) ? -1 : 0; if (w > 1.65 && w < 1.9) hop = -1; }
  else if (w < 2.75) { p.arm = 'up'; p.coin = w < 2.3 ? 1 : 0; }
  else if (w < 5.2) { if (w >= 2.95 && w < 3.6) { hop = -4 * Math.sin(Math.PI * seg(w, 2.95, 3.15)); bub = '!'; bubT = 2.95; } if (w >= 4.85) { bub = '…'; bubT = 4.85; } }
  else { p.arm = 'cheer'; hop = w < 6.0 ? -6 * Math.abs(Math.sin(Math.PI * (w - 5.2) * 2.5)) : 0; if (w >= 5.35) { bub = '♪'; bubT = 5.35; } }
  if (menu || w >= 1.25) { p.rim = 2; p.rx = 14; p.ry = -78; }
  return { x, y, hop: Math.round(hop), p, bub, bubT };
}
// w：第三幕的时间；menu：标题菜单（最后一帧的状态，T 驱动待机动画）
function sceneC(wc, w, T, menu) {
  if (!stC) { stC = paintRoom(); stCab = paintCab(); }
  const x = wc.x, pw = menu || w >= 1.2, jack = !menu && w >= 5.2 && w < 7.2;
  x.drawImage(stC.c, 0, 0);
  // 中奖：机台背后的放射光（菜单里留一点点慢慢转）
  const ra = jack ? (1 - seg(w, 6.2, 7.2)) : menu ? 0.35 : 0;
  if (ra > 0) lighter(x, () => { const rot = (menu ? T : w) * 0.35; for (let k = 0; k < 14; k++) { const a0 = rot + k * Math.PI * 2 / 14; poly(x, [[240, 100], [240 + Math.cos(a0) * 300, 100 + Math.sin(a0) * 300], [240 + Math.cos(a0 + 0.13) * 300, 100 + Math.sin(a0 + 0.13) * 300]], k & 1 ? 51 : 22, 0.12 * ra); } });
  x.drawImage(stCab.c, 0, 0);
  const la = menu ? -1.4 : w < 2.9 ? -1.4 : w < 3.05 ? lerp(-1.4, 0.45, eIn(seg(w, 2.9, 3.05))) : lerp(0.45, -1.4, 1 - Math.pow(1 - seg(w, 3.1, 3.6), 2) * (1 + 0.3 * Math.sin(seg(w, 3.1, 3.6) * 9) * (1 - seg(w, 3.1, 3.6))));
  lever(x, la);
  x.globalAlpha = pw ? 0.28 : 0.6; x.fillStyle = PAL[0]; x.fillRect(0, 0, LW, LH); x.globalAlpha = 1;
  if (pw) lighter(x, () => { halo(x, 240, 232, 120, 16, 22, 0.3); halo(x, 240, 107, 110, 70, 22, 0.1); });
  screen(x, w, T, menu); reels(x, w, T, menu);
  // 屏幕玻璃：圆角、左上反光
  for (const [a, b, dx, dy] of [[SCRN.x, SCRN.y, 1, 1], [SCRN.x + SCRN.w - 1, SCRN.y, -1, 1], [SCRN.x, SCRN.y + SCRN.h - 1, 1, -1], [SCRN.x + SCRN.w - 1, SCRN.y + SCRN.h - 1, -1, -1]]) { R(x, a, b, 1, 1, 27); R(x, a + dx, b, 1, 1, 27); R(x, a, b + dy, 1, 1, 27); }
  if (pw) { for (let k = 0; k < 16; k++) R(x, SCRN.x + 4 + k, SCRN.y + 3, 1, 1, 21, 0.25 * (1 - k / 16)); for (let k = 0; k < 10; k++) R(x, SCRN.x + 3, SCRN.y + 4 + k, 1, 1, 21, 0.2 * (1 - k / 10)); }
  // 灯泡：通电时一颗颗亮起；平时两亮一灭往前追；中奖时彩虹快追
  const n = BULBS.length, lit = menu ? n : Math.floor(seg(w, 1.2, 1.8) * n), ph = Math.floor(T * (jack ? 18 : 7));
  BULBS.forEach(([bx, by], i) => { let col = 19; if (i < lit) { if (jack) col = [51, 63, 22, 50][(i + ph) % 4]; else col = (i + ph) % 3 ? (i & 1 ? 63 : 51) : 19; } R(x, bx - 1, by - 1, 3, 3, 0); R(x, bx - 1, by - 1, 2, 2, col); if (col !== 19) { R(x, bx - 1, by - 1, 1, 1, 21); lighter(x, () => halo(x, bx, by, 5, 5, col, 0.35)); } });
  // 眼灯：没通电时闭着、缝里透红光；通电一下睁开；投币时看硬币，中奖前盯住小夜
  const bl = (T % 3.7) < 0.12, op = menu ? (bl ? 0 : 1) : w < 1.2 ? 0 : bl ? 0 : 1;
  const stare = menu ? 0 : w >= 4.85 ? 1 : w > 2.0 && w < 2.8 ? 0.6 : 0;
  const lx = stare ? -3 : menu ? Math.round(Math.sin(T * 0.7) * 2) : 0, ly = stare ? 2 : menu ? Math.round(Math.sin(T * 0.43)) : 0;
  eyeLamp(x, 218, 36, op, lx, ly, pw); eyeLamp(x, 262, 36, op, lx, ly, pw);
  if (!pw) { const g = 0.25 + 0.2 * Math.sin(T * 2); R(x, 211, 36, 15, 1, 57, g); R(x, 255, 36, 15, 1, 57, g); }
  if (pw && (menu || w < 2.3) && Math.floor(T * 3) % 2) { R(x, SLOT[0] - 2, 184, 5, 1, 22); R(x, SLOT[0] - 1, 185, 3, 1, 22); R(x, SLOT[0], 186, 1, 1, 22); }
  if (!menu && w >= 2.3 && w < 2.7) { const q = seg(w, 2.3, 2.55); if (q < 1) coin(x, Math.round(lerp(KC.x + 10, SLOT[0], q)), Math.round(lerp(KC.y - 45, SLOT[1], q) - Math.sin(Math.PI * q) * 14), 2, Math.floor(w * 16) % 4); else { R(x, SLOT[0] - 5, 190, 10, 7, 22, 1 - seg(w, 2.55, 2.7)); burstAt(x, SLOT[0], SLOT[1], w - 2.55, 10, 11, 10, 0.4, FXC); } }
  if (menu || w >= 5.2) { R(x, 220, 212, 40, 3, 14); for (let k = 0; k < 8; k++) R(x, 222 + k * 5, 211 - (k & 1), 3, 1, 5); }
  // 地板倒影：机台下半截（转轮、面板、出币口、灯光）倒映在瓷砖上
  x.save(); x.beginPath(); x.rect(150, 223, 180, 47); x.clip(); x.globalAlpha = pw ? 0.22 : 0.12; x.translate(0, 445); x.scale(1, -1); x.drawImage(wc.c, 150, 150, 180, 73, 150, 150, 180, 73); x.restore(); x.globalAlpha = 1;
  if (pw) lighter(x, () => { const fk = 0.85 + 0.15 * Math.sin(T * 9) * Math.sin(T * 3.1); poly(x, [[SCRN.x + 4, SCRN.y + SCRN.h], [SCRN.x + SCRN.w - 4, SCRN.y + SCRN.h], [360, LH], [120, LH]], 22, 0.045 * fk); for (let i = 0; i < 36; i++) { const mx = 130 + (hsh(i, 41) * 220 + Math.sin(T * 0.4 + i) * 8), my = 70 + ((hsh(i, 42) * 190 - T * (2 + hsh(i, 43) * 3)) % 190 + 190) % 190; if (Math.sin(T * 2 + i) > -0.2) R(x, mx, my, 1, 1, hsh(i, 44) > 0.7 ? 21 : 22, 0.5); } });
  const K0 = kidC(w, T, menu);
  oval(x, K0.x, K0.y, 11, 2.5, 0, 0.5);
  kid(x, K0.x, K0.y + K0.hop, K0.p, false);
  if (menu || w >= 5.2) COINS.forEach((c, i) => { const a = menu ? 9 : w - c.t0; if (a < 0) return; const [cx, cy, rest] = coinAt(c, a); if (rest) { oval(x, cx, cy, 2.4, 1.2, 20); R(x, cx - 1, cy - 1, 3, 2, 14); R(x, cx - 1, cy - 1, 1, 1, 5); } else { coin(x, Math.round(cx), Math.round(cy), 2, (Math.floor(a * 16) + c.ph) % 4); if (i % 3 === 0) R(x, cx - c.vx * 0.02, cy + 3, 1, 1, 51, 0.7); } });
  if (jack) {
    for (let i = 0; i < 26; i++) { const a = w - 5.2 - hsh(i, 50) * 1.4; if (a < 0 || a > 0.5) continue; sparkle(x, Math.round(150 + hsh(i, 51) * 180), Math.round(20 + hsh(i, 52) * 190), a < 0.15 ? 2 : 1, a < 0.25 ? 21 : 51); }
    burstAt(x, 240, 210, w - 5.2, 30, 21, 60, 0.8, FXC);
    // 冲击波：从屏幕中间炸开两圈
    for (const [t0, col] of [[5.2, 21], [5.32, 51]]) { const q = seg(w, t0, t0 + 0.6); if (q <= 0 || q >= 1) continue; const r = 10 + eOut(q) * 190; x.globalAlpha = 1 - q; x.strokeStyle = PAL[col]; x.lineWidth = 3 * (1 - q) + 1; x.beginPath(); x.ellipse(240, 107, r, r * 0.62, 0, 0, Math.PI * 2); x.stroke(); x.globalAlpha = 1; }
  }
  if (menu) for (let i = 0; i < 4; i++) { const a = (T * 0.6 + i * 0.27) % 1; if (a < 0.2) sparkle(x, 150 + hsh(i, Math.floor(T * 0.6 + i * 0.27)) * 180, 30 + hsh(i + 9, Math.floor(T * 0.6 + i * 0.27)) * 170, 1, 51); }
  if (K0.bub) bubble(x, K0.x + 2, K0.y - 62 + K0.hop, K0.bub, w - K0.bubT);
}
// 前半段停在 z 1.25（每格 5 像素）；中奖后推到菜单机位 z 1.5（每格 6 像素）
function camC(w) { const q = eIO(seg(w, 5.8, 7.4)); return { x: 240, y: lerp(125, MENU.y, q), z: lerp(1.25, MENU.z, q) }; }
function shakeC(w) { let a = 0; STOP.forEach((t, i) => { if (w >= t && w < t + 0.18) a = Math.max(a, i === 2 ? 2.5 : 1.2); }); if (w >= 5.2 && w < 5.8) a = Math.max(a, 4 * (1 - seg(w, 5.2, 5.8))); if (w >= 2.9 && w < 3.05) a = Math.max(a, 1); return a; }
// 标题：中奖时一个字一个字砸在屏幕中间，随后跟着镜头退到屏幕上方（菜单的位置）
function title(ctx, cam, w, T, menu) {
  if (!menu && w < 5.25) return;
  const k = menu ? 1 : eIO(seg(w, 5.8, 7.4)), wy = lerp(SCRN.y + 34, SCRN.y + 19.5, k), per = lerp(88, 54, k);
  const P = w2s(cam, 240, wy), size = Math.max(24, Math.round(per * cam.z / 4) * 4), ch = [...'午夜机台'], gap = Math.round(size * 0.08);
  const cw = ch.map((c) => XU.measure(ctx, c, size)); let px = P[0] - (cw.reduce((a, b) => a + b, 0) + gap * (ch.length - 1)) / 2;
  ch.forEach((c, i) => {
    const a0 = 5.25 + i * 0.09, q = menu ? 1 : seg(w, a0, a0 + 0.16);
    if (q > 0) {
      const land = menu ? 9 : w - a0 - 0.16, dy = q < 1 ? -(1 - eOut(q)) * 180 : land < 0.12 ? Math.round(Math.sin(land / 0.12 * Math.PI) * size * 0.12) : 0;
      const ph = ((T * 1.25 + (ch.length - i) * 0.12) % 1), wave = still() || !(menu || w > 6.5) ? 0 : [0, -0.1, 0, 0.04][Math.floor(ph * 4)] * size;
      const sz = q < 1 ? Math.round(size * (1 + (1 - q) * 0.6) / 4) * 4 : size;
      XU.text(ctx, c, px + cw[i] / 2, P[1] + dy + wave, sz, q < 1 || land < 0.06 ? PAL[21] : PAL[14], { ramp: q >= 1 && land >= 0.06, outline: true });
    }
    px += cw[i] + gap;
  });
  const sa = menu ? 1 : seg(w, 5.75, 6.1); if (sa > 0) { ctx.globalAlpha = sa; spaced(ctx, 'MIDNIGHT CABINET', P[0], P[1] + size * 0.78, Math.max(18, Math.round(16 * cam.z / 2) * 2), 63, 3); ctx.globalAlpha = 1; }
}
function screenText(ctx, cam, w, T) {
  if (w >= 2.0 && w < 2.5 && Math.floor(T * 3) % 2 === 0) { const P = w2s(cam, 240, SCRN.y + SCRN.h / 2); spaced(ctx, 'INSERT COIN', P[0], P[1], 28, 22, 4); }
  if (w >= 2.55 && w < 5.2) { const P = w2s(cam, 240, SCRN.y + SCRN.h / 2), n = Math.floor(w * 3) % 4; spaced(ctx, '.'.repeat(n) + ' '.repeat(3 - n), P[0], P[1], 40, 22, 6); }
}

// ═════════════════════ 时间轴 ═════════════════════
const A_END = 3.2, B_END = A_END + BL, C_END = B_END + CL, PRE = 0.8;
const CUES = [];
const cue = (t, fn) => CUES.push([t, fn]);
const S = (n, ...a) => () => { const f = M.Sfx && M.Sfx[n]; if (typeof f === 'function') f.apply(M.Sfx, a); };
cue(0.05, S('introToll')); cue(1.0, S('bolt', 3));
for (let k = 0; k < 6; k++) cue(A_END + k / 4, S('step', k));
cue(A_END + KB.coinT, S('coinRoll')); cue(A_END + KB.get + 0.02, S('coin', 3)); cue(A_END + KB.get + 0.1, S('sparkle'));
cue(A_END + KB.bolt, S('bolt', 3)); cue(A_END + KB.bolt + 0.1, S('spook')); cue(A_END + 4.4, S('heart')); cue(A_END + 4.85, S('heart')); cue(A_END + KB.tune, S('musicBox'));
for (let k = 0; k < 8; k++) cue(A_END + KB.runT + k / 6, S('step', k));
cue(A_END + KB.door - 0.05, S('creak')); cue(A_END + 6.4, S('whoosh', 0.8));
for (let k = 0; k < 4; k++) cue(B_END + 0.2 + k / 4, S('step', k));
cue(B_END + 1.2, S('cabinetOn')); cue(B_END + 1.65, S('glitch')); cue(B_END + 2.3, S('coinInsert')); cue(B_END + 2.9, S('lever')); cue(B_END + 2.95, S('reelSpin', 1.85));
STOP.forEach((t) => cue(B_END + t, S('reelStop'))); cue(B_END + 4.9, S('heart')); cue(B_END + 5.2, S('jackpot'));
let lastS = 0;
function cues(s) { if (s < lastS) lastS = s; for (const [t, fn] of CUES) if (lastS < t && s >= t) { try { fn(); } catch (e) {} } lastS = s; }
// 待机画面时把后面两幕的图层和主角的每个姿势先画好，播放时不在切幕的那一帧卡一下
let warmI = 0;
function prewarm() {
  if (!stB) { stB = paintB(); CM = LIT; stBL = paintB(); CM = null; dmB = mk(BW, LH); return; }
  if (!stC) { stC = paintRoom(); stCab = paintCab(); return; }
  const N = Math.ceil((BL + CL) * 12) + 24;
  for (let k = 0; k < 12 && warmI < N; k++, warmI++) { const t = warmI / 12; kidImg(t < BL ? kidB(t, 0).p : t < BL + CL ? kidC(t - BL, 0, false).p : kidC(99, t, true).p); }
}

const WA = mk(LW, LH), WAS = mk(LW, LH), WB = mk(BW, LH), WC = mk(LW, LH);
function drawIntro(ctx, t) {
  const T = performance.now() / 1000, s = Math.max(0, t - PRE), story = t > PRE + 1e-4;
  if (story) cues(s); if (!story || s < A_END) prewarm();
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = PAL[0]; ctx.fillRect(0, 0, W, H);
  if (s < A_END) {
    const r = sceneA(WAS, WA, s, T, story), fl = r.fl, cam = snapCam(shaken(camA(s, story), story && s > 1.0 && s < 1.4 ? 2 : 0, s));
    blit(ctx, WAS, cam); drawClouds(ctx, cam, T, fl, r.face); blit(ctx, WA, cam); flashA(ctx, fl * 0.5); vignette(ctx, 0.5);
    fill(ctx, 22, seg(s, 2.45, 2.9) * 0.9); fill(ctx, 0, seg(s, 2.9, 3.2));
    bars(ctx, 1);
    const clk = story && s > 0.05 ? '00:00' : '23:59', blink = Math.floor(T * 2) % 2;
    ctx.globalAlpha = story ? 1 - seg(s, 2.2, 2.6) : 1; XU.text(ctx, 'AM', 60, H - 84 - 46, 24, PAL[18], { num: true, align: 'left' }); XU.text(ctx, clk.replace(':', blink ? ':' : ' '), 112, H - 84 - 50, 44, story && s < 0.4 && Math.floor(s * 10) % 2 ? PAL[21] : PAL[22], { num: true, align: 'left' }); ctx.globalAlpha = 1;
  } else if (s < B_END) {
    const u = s - A_END, r = sceneB(WB, u), cam = snapCam(shaken(camB(u, r.kx), u > KB.bolt && u < KB.bolt + 0.4 ? 3 : 0, s));
    blit(ctx, WB, cam); flashA(ctx, r.fl * 0.4); vignette(ctx, 0.55);
    fill(ctx, 0, 1 - seg(u, 0, 0.35)); fill(ctx, 22, seg(u, 6.4, 6.85)); fill(ctx, 21, seg(u, 6.6, 6.9) * 0.8);
    bars(ctx, 1, 64);
  } else {
    const w = Math.min(s - B_END, CL);
    sceneC(WC, w, T, false);
    const cam = snapCam(shaken(camC(w), shakeC(w), s));
    blit(ctx, WC, cam); screenText(ctx, cam, w, T); title(ctx, cam, w, T, false); vignette(ctx, 0.45);
    if (w >= 5.2 && w < 5.5) flashA(ctx, 1 - seg(w, 5.2, 5.5)); if (w >= 1.3 && w < 1.4) flashA(ctx, 0.3);
    fill(ctx, 22, 1 - seg(w, 0, 0.3)); fill(ctx, 21, (1 - seg(w, 0, 0.25)) * 0.8);
    bars(ctx, 1 - eOut(seg(w, 0.2, 0.9)));
  }
}
// 标题菜单：第三幕的最后一帧，灯泡、眼睛、主角继续动；dive 0..1 = 点「开始游戏」后镜头钻进屏幕
function drawCabinet(ctx, t, dive) {
  const T = performance.now() / 1000;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.fillStyle = PAL[0]; ctx.fillRect(0, 0, W, H);
  sceneC(WC, 99, T, true);
  const d = dive || 0, e = d * d * d, cam = snapCam({ x: lerp(MENU.x, 240, Math.min(1, d * 1.5)), y: lerp(MENU.y, SCRN.y + SCRN.h / 2, Math.min(1, d * 1.5)), z: MENU.z + (9 - MENU.z) * e });
  blit(ctx, WC, cam); title(ctx, cam, 99, T, true); vignette(ctx, 0.45 * (1 - d));
  fill(ctx, 22, seg(d, 0.55, 0.8) * 0.6); fill(ctx, 0, seg(d, 0.72, 1));
}
const cabScreen = () => { const a = w2s(MENU, SCRN.x, SCRN.y), b = w2s(MENU, SCRN.x + SCRN.w, SCRN.y + SCRN.h); return { x: Math.round(a[0]), y: Math.round(a[1]), w: Math.round(b[0] - a[0]), h: Math.round(b[1] - a[1]) }; };
Object.assign(M, { drawIntro, drawCabinet, cabScreen, INTRO_LEN: PRE + C_END });
// 演出自然播完进菜单时，机台早就通电了：不再放一次开机声（点击跳过时照放）
const G = M.Game && M.Game.prototype;
if (G && G.toMenu) { const oTM = G.toMenu; G.toMenu = function () { const nat = this.screen === 'intro' && this.intro && this.intro.t >= M.INTRO_LEN, S0 = M.Sfx, c = S0 && S0.cabinetOn; if (nat && c) { S0.cabinetOn = () => {}; try { return oTM.apply(this, arguments); } finally { S0.cabinetOn = c; } } return oTM.apply(this, arguments); }; }
M.OPENING = { kidImg, K, A_END, B_END, C_END };
})();
