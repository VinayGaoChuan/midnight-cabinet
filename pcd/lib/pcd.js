// pcd.js：像素人物共享引擎（全部角色共用一份）。
// 色板 · 材质缓冲与烘焙 · 粒子 / 弹道 / 冲击环 / 震屏 · 特效积木 · 动作积木 · 死亡套件 · 舞台与训练假人 · 状态机 · 渲染 · 动作表 · 验收接口。
// 角色写成模块：PCD.define(key, (E) => ({ ...钩子 }))，view.html?c=key 加载；接口说明见 pcd/lib/README.md。
(function () {
'use strict';
const PCD = window.PCD = window.PCD || {};
const W = 128, H = 96, DT = 1 / 60;

// ═════════════════════════ 1. 色板：全部角色共用，屏幕上每个像素都来自这里 ═════════════════════════
const PAL = [
  '#0b0a18', '#12132e', '#1a1d45', '#242b5f', '#333d7c', //  0 墨 · 1–4 夜空
  '#fff3d4', '#cdc5a3', '#8d8670',                       //  5–7 月光 / 奶油 / 暖灰
  '#221f33', '#37324b', '#524b6a',                       //  8–10 石
  '#33102a', '#621c40', '#9c2f4c',                       // 11–13 酒红
  '#e3a13c', '#f2c7a0', '#b27658',                       // 14 金 · 15–16 肤
  '#ebe9e1', '#a6a2b5', '#7a4a2b', '#472916',            // 17–18 白发 / 骨 · 19–20 木
  '#ffffff', '#86f5ff', '#38b2ff', '#7b5cff', '#33218a', // 21–25 魔法 白→青→蓝→紫→深紫
  '#cf4f5a',                                             // 26 酒红亮
  '#1b1e2a', '#394055', '#65708a', '#a2acc2', '#dde3ee', // 27–31 钢
  '#a8703f', '#d49a5c',                                  // 32–33 皮革亮
  '#16301c', '#2b5a2a', '#4f8a3a', '#8cc45a', '#d2f08c', // 34–38 绿
  '#10204a', '#1f4a8a', '#3a7ad0',                       // 39–41 蓝
  '#4b2a78', '#b58cff',                                  // 42–43 紫
  '#5a1a08', '#b8401a', '#f07a2a', '#ffc24a',            // 44–47 火
  '#3a4a0a', '#7aa018', '#c4e84a',                       // 48–50 毒
  '#fff7b8',                                             // 51 圣光淡金
  '#1a1026', '#3a2450', '#6a4a8a',                       // 52–54 暗影
  '#4a0a14', '#8a1422', '#d23a3a', '#ff8a7a',            // 55–58 血
  '#5a6a8a', '#9aaac8',                                  // 59–60 苍白
  '#8a6a2a', '#d8b060',                                  // 61–62 沙
  '#e87aa8',                                             // 63 粉
];
// 材质色阶 [勾线, 暗, 基, 亮]
const RAMP = {
  crimson: [11, 12, 13, 26], gold: [20, 19, 14, 5], skin: [11, 16, 15, 15], skinDark: [20, 19, 16, 15], white: [7, 18, 17, 21], bone: [8, 7, 6, 17],
  wood: [0, 20, 19, 16], leather: [20, 19, 32, 33], boot: [0, 20, 20, 19], stone: [0, 8, 9, 10], steel: [27, 28, 29, 30], iron: [0, 27, 28, 29],
  green: [34, 35, 36, 37], moss: [0, 34, 35, 36], blue: [0, 39, 40, 41], sky: [39, 40, 41, 23], purple: [25, 42, 24, 43], shadow: [0, 52, 53, 54],
  blood: [55, 56, 57, 58], pale: [8, 59, 60, 17], sand: [20, 61, 62, 5], pink: [11, 12, 63, 58], fire: [44, 45, 46, 47], poison: [48, 49, 50, 38],
  ink: [0, 0, 0, 0], gem: [25, 24, 23, 22], glow: [22, 22, 21, 21],
};
// 特效色阶（亮 → 暗，5 级），粒子按寿命逐级走完
const FX = {
  magic: [21, 22, 23, 24, 25], impact: [21, 5, 14, 19, 20], enemy: [21, 26, 13, 12, 11], dust: [6, 7, 10, 9, 8], soul: [22, 23, 24, 25, 3],
  fire: [21, 47, 46, 45, 44], holy: [21, 51, 5, 14, 61], poison: [21, 50, 49, 48, 34], frost: [21, 22, 23, 40, 39], shadow: [43, 54, 53, 52, 0],
  blood: [21, 58, 57, 56, 55], nature: [21, 38, 37, 36, 35], bolt: [21, 51, 22, 23, 40], coin: [21, 5, 14, 61, 20], water: [21, 22, 41, 40, 39],
  earth: [5, 62, 61, 19, 20], steel: [21, 31, 30, 29, 28], curse: [43, 24, 42, 25, 52],
};
const FXR = [], FXI = {}; for (const k of Object.keys(FX)) { FXI[k] = FXR.length; FXR.push(FX[k]); }
const BASE_PAL = PAL.length;                                   // 共享色板长度；之后的是本页角色模块追加的专属色
let LUT, LUTF, LUTD;
function buildLUT() {
  LUT = new Uint32Array(PAL.length); LUTF = new Uint32Array(PAL.length);
  for (let i = 0; i < PAL.length; i++) { const n = parseInt(PAL[i].slice(1), 16); LUT[i] = ((255 << 24) | ((n & 255) << 16) | (((n >> 8) & 255) << 8) | (n >> 16)) >>> 0; }
  for (let i = 0; i < PAL.length; i++) LUTF[i] = LUT[i === 1 || i === 2 ? 3 : i === 3 ? 4 : i];   // 天空闪白只提亮夜空
  LUTD = new Uint32Array(PAL.length); for (let i = 0; i < PAL.length; i++) LUTD[i] = LUT[i >= 1 && i <= 4 ? i - 1 : i];   // 夜空压暗（和闪白相反）
}
buildLUT();
// 角色专属色：一页只跑一个角色，模块在定义时追加，导出的 palette 带上它们。
// color(hex)：色板里已有这个颜色就返回它的下标，没有就追加。near(hex, d)：和某个共享色足够接近（默认距离 ≤ 18）就用共享色，否则追加。
// ramp([4 个 hex]) → 材质色阶（给 defMat）；fxRamp(名字, [5 个 hex，亮 → 暗]) → 新元素特效色阶，返回下标，之后 FXI[名字] 也能取到。
const rgbOf = (h) => { const n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
const cdist = (a, b) => { const x = rgbOf(a), y = rgbOf(b); return Math.hypot(x[0] - y[0], (x[1] - y[1]) * 1.2, x[2] - y[2]); };
function color(hex) {
  hex = hex.toLowerCase(); const i = PAL.indexOf(hex); if (i >= 0) return i;
  if (PAL.length >= 255) throw new Error('色板已满 255 色：' + hex); PAL.push(hex); return PAL.length - 1;
}
function near(hex, d) { let best = 1e9, bi = -1; for (let i = 0; i < BASE_PAL; i++) { const q = cdist(hex, PAL[i]); if (q < best) { best = q; bi = i; } } return best <= (d == null ? 18 : d) ? bi : color(hex); }
const ramp = (a) => a.map((c) => (typeof c === 'number' ? c : color(c)));
function fxRamp(name, a) { const r = ramp(a); if (FXI[name] != null) { FXR[FXI[name]] = r; return FXI[name]; } FXI[name] = FXR.length; FXR.push(r); FX[name] = r; return FXI[name]; }

// ═════════════════════════ 2. 材质缓冲 → 分部明暗 → 分界线 → 选择性勾线 → 轮廓光 → 闪白 → 消散 ═════════════════════════
const MRAMP = [0, 0, 0, 0], MBAND = [0], MFLAT = [0];
// dark 1 = 远侧暗一级：[勾线, 暗, 暗, 基]（远侧腿、远侧臂、远翼）
function defMat(r, band, flat, dark) { if (typeof r === 'string') r = RAMP[r]; if (dark) r = [r[0], r[1], r[1], r[2]]; MRAMP.push(r[0], r[1], r[2], r[3]); MBAND.push(band || 1); MFLAT.push(flat ? 1 : 0); return MBAND.length - 1; }
class Sprite { constructor(w, h, ox, oy) { this.w = w; this.h = h; this.ox = ox; this.oy = oy; const n = w * h; this.mat = new Uint8Array(n); this.tone = new Uint8Array(n); this.part = new Uint8Array(n); this.out = new Uint8Array(n); this.k1 = -1; this.k2 = -1; } }
let S = null, cPart = 0, dX = 0, dY = 0, shear = 0;
let clipL = Infinity;
// clipY：本地坐标，y 大于它的像素不画（贴地截断：画笔不会画进地面以下）
function begin(spr, ox, oy, clipY) { S = spr; S.mat.fill(0); S.tone.fill(0); S.part.fill(0); cPart = 0; dX = ox | 0; dY = oy | 0; shear = 0; clipL = clipY == null ? Infinity : clipY; }
function part() { cPart++; }
function setShear(v) { shear = v; }
function sp(x, y, m, t) {
  x = Math.round(x); y = Math.round(y); if (y > clipL) return; if (shear) x += Math.round(shear * -y / 26);
  x += dX + S.ox; y += dY + S.oy; if (x < 0 || y < 0 || x >= S.w || y >= S.h) return; const i = y * S.w + x;
  if (!m) { S.mat[i] = 0; return; } S.mat[i] = m; S.tone[i] = t || 0; S.part[i] = cPart;
}
function run(y, x0, x1, m, t) { x0 = Math.round(x0); x1 = Math.round(x1); for (let x = x0; x <= x1; x++) sp(x, y, m, t); }
function rect(x, y, w, h, m, t) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) sp(x + i, y + j, m, t); }
function line(x0, y0, x1, y1, m, t, maxY) {
  if (maxY == null) maxY = 99;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const ax = Math.abs(x1 - x0), ay = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = ax + ay;
  for (let n = 0; n < 300; n++) { if (y0 <= maxY) sp(x0, y0, m, t); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= ay) { e += ay; x0 += sx; } if (e2 <= ax) { e += ax; y0 += sy; } }
}
function brush(x, y, r, m, t) { x = Math.round(x); y = Math.round(y); const R = Math.ceil(r); for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= r * r + 0.35) sp(x + i, y + j, m, t); }
function ellipse(cx, cy, rx, ry, m, t) { const X = Math.ceil(rx), Y = Math.ceil(ry); for (let j = -Y; j <= Y; j++) for (let i = -X; i <= X; i++) if ((i * i) / (rx * rx + 0.3) + (j * j) / (ry * ry + 0.3) <= 1) sp(cx + i, cy + j, m, t); }
function copySprite(dst, src) { dst.out.set(src.out); }
function oth(s, x, y, m, g) { if (x < 0 || y < 0 || x >= s.w || y >= s.h) return true; const j = y * s.w + x; return s.mat[j] !== m || s.part[j] !== g; }
function front(s, x, y, g) { if (x < 0 || y < 0 || x >= s.w || y >= s.h) return false; const j = y * s.w + x; return s.mat[j] !== 0 && s.part[j] > g; }
function emp(s, x, y) { return x < 0 || y < 0 || x >= s.w || y >= s.h || s.mat[y * s.w + x] === 0; }
const B8 = new Float32Array(64);
for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { let v = 0; for (let b = 0; b < 3; b++) { const xb = (x >> b) & 1, yb = (y >> b) & 1; v = v * 4 + 2 * (xb ^ yb) + yb; } B8[y * 8 + x] = (v + 0.5) / 64; }
// o: { rim 0–3, rx, ry（光源在缓冲里的坐标）, rimR[], rimRamp, flash 0/1, dq 0–1（上升：从头顶消失；下降：从脚下显形），
//      skip 不受轮廓光的材质（下标 → 1，例如握发光体的手、面纱），rimAll 1 = 光源在剪影内部（眼、胸口核心）：半径内所有外沿都打光，不看朝向 }
function bake(s, o) {
  const w = s.w, h = s.h, M = s.mat, T = s.tone, G = s.part, out = s.out; out.fill(255);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, m = M[i]; if (!m) continue; const g = G[i]; let tn = T[i];
    if (!tn) {
      if (MFLAT[m]) tn = 3;
      else { const lit = oth(s, x - 1, y, m, g) || oth(s, x, y - 1, m, g); let dark = oth(s, x + 1, y + 1, m, g); for (let k = 1; k <= MBAND[m] && !dark; k++) dark = oth(s, x + k, y, m, g) || oth(s, x, y + k, m, g); tn = lit && dark ? 3 : lit ? 4 : dark ? 2 : 3; }
    }
    if (!MFLAT[m] && (front(s, x + 1, y, g) || front(s, x - 1, y, g) || front(s, x, y + 1, g) || front(s, x, y - 1, g))) tn = 1;
    out[i] = MRAMP[m * 4 + tn - 1];
  }
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (M[i]) continue; let m = 0;
    if (y + 1 < h && M[i + w]) m = M[i + w]; else if (x + 1 < w && M[i + 1]) m = M[i + 1]; else if (x > 0 && M[i - 1]) m = M[i - 1]; else if (y > 0 && M[i - w]) m = M[i - w];
    if (m) out[i] = MRAMP[m * 4];
  }
  if (o.rim) {
    const R = o.rimR[o.rim], RR = o.rimRamp;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, m = M[i]; if (!m || (o.skip && o.skip[m])) continue;
      const nx = (emp(s, x + 1, y) ? 1 : 0) - (emp(s, x - 1, y) ? 1 : 0), ny = (emp(s, x, y + 1) ? 1 : 0) - (emp(s, x, y - 1) ? 1 : 0);
      if (!nx && !ny && !emp(s, x + 1, y) && !emp(s, x - 1, y) && !emp(s, x, y - 1) && !emp(s, x, y + 1)) continue;
      const vx = o.rx - x, vy = o.ry - y; if (!o.rimAll && nx * vx + ny * vy <= 0) continue; const d = Math.hypot(vx, vy); if (d > R) continue;
      out[i] = o.rim === 3 ? (d < R * 0.3 ? RR[0] : d < R * 0.6 ? RR[1] : RR[2]) : o.rim === 2 ? (d < R * 0.5 ? RR[1] : RR[2]) : RR[2];
    }
  }
  if (o.flash) for (let i = 0; i < w * h; i++) if (M[i]) out[i] = 21;
  if (o.dq > 0) {
    let top = h, bot = -1; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (out[y * w + x] !== 255) { if (y < top) top = y; if (y > bot) bot = y; }
    const span = Math.max(1, bot - top);
    for (let y = top; y <= bot; y++) { const bias = (y - top) / span; for (let x = 0; x < w; x++) { const i = y * w + x; if (out[i] !== 255 && B8[(y & 7) * 8 + (x & 7)] * 0.55 + bias * 0.45 < o.dq) out[i] = 255; } }
  }
}

// ═════════════════════════ 3. 状态与动作积木 ═════════════════════════
const IDLE = 0, MOVE = 1, ATTACK = 2, CHARGE = 3, CAST = 4, RECOVER = 5, HURT = 6, DEATH = 7, REVIVE = 8;
const NAMES = ['IDLE 待机', 'MOVE 移动', 'ATTACK 攻击', 'SKILL 技能 · 蓄力', 'SKILL 技能 · 施放', 'SKILL 技能 · 收招', 'HURT 受击', 'DEATH 死亡', 'REVIVE 复活'];
const DEFAULT_DUR = [2.4, 1.6, 0.75, 1.4, 0.5, 0.7, 0.8, 2.9, 1.0];
const CHAIN = [-1, -1, -1, CAST, RECOVER, -1, -1, REVIVE, -1];
const INCOMING = 0.3, ASTEP = Math.PI / 32;
const ease = {
  lin: (q) => q, out: (q) => 1 - (1 - q) * (1 - q) * (1 - q), in: (q) => q * q * q,
  inOut: (q) => (q < 0.5 ? 2 * q * q : 1 - (-2 * q + 2) * (-2 * q + 2) / 2),
  back: (q) => { const c = 1.7; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); },   // 冲过头再回来
  snap: (q) => (q < 1 ? 0 : 1),                                                                          // 定格，到点才跳
};
const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
// 关键帧轨道：track = [[t, 姿势对象, 缓动名], ...]，按 tq 在相邻两帧之间插值，结果写进 P 的 fields 字段
function keys(tq, track, P, fields) {
  let i = 0; while (i < track.length - 1 && tq >= track[i + 1][0]) i++;
  const A = track[i][1], nx = track[i + 1]; if (!nx) { for (const f of fields) P[f] = A[f]; return; }
  const q = (ease[nx[2] || 'inOut'] || ease.inOut)(clamp01((tq - track[i][0]) / Math.max(1e-6, nx[0] - track[i][0]))), B = nx[1];
  for (const f of fields) P[f] = A[f] + (B[f] - A[f]) * q;
}
// 缓存键打包：spec = [[字段, 最小, 最大], ...]（取整后的整数范围）→ 返回 (P) => 写 P.k1 / P.k2。自动分进两个键（各 < 2^52），放不下直接报错；
// 运行时越界会夹紧并在控制台警告一次（说明范围写小了）
function keyer(spec) {
  const K = [[], []], cap = [1, 1];
  for (const [n, lo, hi] of spec) { const span = hi - lo + 1, j = cap[0] * span < 2 ** 52 ? 0 : 1; if (j === 1 && cap[1] * span >= 2 ** 52) throw new Error('缓存键放不下：' + n); K[j].push({ n, lo, span }); cap[j] *= span; }
  let warned = false;
  return (P) => { for (let j = 0; j < 2; j++) { let k = 0; for (const x of K[j]) { let v = Math.round(P[x.n] || 0) - x.lo; if (v < 0 || v >= x.span) { if (!warned) { console.warn('缓存键越界：' + x.n + ' = ' + P[x.n]); warned = true; } v = v < 0 ? 0 : x.span - 1; } k = k * x.span + v; } P['k' + (j + 1)] = k; } };
}
function mix(P, A, B, q, fields) { for (const f of fields) P[f] = A[f] + (B[f] - A[f]) * q; }
// 取帧：t → 12 fps 的帧时间 / 帧号。一律用这两个，不要自己写 Math.floor(t * 12)：浮点误差会让整帧时间（如 7/12）落回上一帧
const q12 = (t) => Math.floor(t * 12 + 1e-6) / 12, f12of = (t) => Math.floor(t * 12 + 1e-6);
// 步态帧 0–3（0 接触 A · 1 经过 · 2 接触 B · 3 经过），默认 6 fps，两个接触帧前后脚互换
const gait = (tq, fps) => Math.floor(tq * (fps || 6) + 1e-6) & 3;
// 移动演示的走位：前半段朝 dir 走 dist 格，后半段转身走回来。远程 dir = 1（朝假人）；近战站位离假人近，用 dir = -1 先往回走
function walkDemo(tq, dist, dir) {
  dir = dir || 1; const half = DUR[MOVE] / 2;
  if (tq < half) return { mx: Math.round(dir * dist * tq / half), flip: dir < 0 ? 1 : 0 };
  return { mx: Math.round(dir * dist * (1 - (tq - half) / half)), flip: dir < 0 ? 0 : 1 };
}

// ═════════════════════════ 4. 粒子、弹道、冲击环、震屏 ═════════════════════════
const PN = 480, K_SPIRAL = 1, K_ORBIT = 2, K_BURST = 3, K_TRAIL = 4, K_EMBER = 5, K_RISE = 6, K_DUST = 7, K_SPIRAL_PT = 8, K_FALL = 9, K_STILL = 10, K_PHYS = 11, K_ORBIT_PT = 12;
const pX = new Float32Array(PN), pY = new Float32Array(PN), pVX = new Float32Array(PN), pVY = new Float32Array(PN), pAge = new Float32Array(PN), pLife = new Float32Array(PN);
const pA = new Float32Array(PN), pR = new Float32Array(PN), pW = new Float32Array(PN), pTX = new Float32Array(PN), pTY = new Float32Array(PN), pK = new Uint8Array(PN), pRamp = new Uint8Array(PN), pSz = new Uint8Array(PN);
// 可选参数（spawnX 设置）：pG 重力、pDX / pDY 每步阻力倍数、pFl 落地高度（贴住、走完色阶）、pOW 环绕角速度（负 = 逆时针）、pOR 到达后的环绕半径、pSq 纵向压扁
const pG = new Float32Array(PN), pDX = new Float32Array(PN), pDY = new Float32Array(PN), pFl = new Float32Array(PN), pOW = new Float32Array(PN), pOR = new Float32Array(PN), pSq = new Float32Array(PN);
let pHead = 0;
function spawn(k, x, y, vx, vy, life, ramp, a, r, w) {
  let i = pHead; for (let n = 0; n < PN; n++) { const j = (pHead + n) % PN; if (pK[j] === 0) { i = j; break; } }
  pHead = (i + 1) % PN; pK[i] = k; pX[i] = x; pY[i] = y; pVX[i] = vx; pVY[i] = vy; pAge[i] = 0; pLife[i] = life; pRamp[i] = ramp; pA[i] = a || 0; pR[i] = r || 0; pW[i] = w || 0; pTX[i] = x; pTY[i] = y; pSz[i] = 1;
  pG[i] = 0; pDX[i] = 1; pDY[i] = 1; pFl[i] = NaN; pOW[i] = 0; pOR[i] = 0; pSq[i] = 0.75; return i;
}
// 带选项的粒子。o：{ g 重力（格/秒²）, dragX / dragY（每秒保留比例，1 = 无阻力）, floor 落地高度（屏幕 y，贴住后走完色阶）, age0 出生时已走过的寿命比例,
//   sz 2 = 2×2, a / r / w（螺旋参数，同 spawn）, tx / ty（定点汇聚目标）, orbitW 环绕角速度（默认 8.5，负 = 逆时针）, orbitR 到达后的环绕半径, squash 纵向压扁（默认 0.75） }
// k 用 K_PHYS 时按 g / drag / floor 运动（血滴、滴落、溅液、弹跳前的碎屑）；其他种类只取用得上的选项
function spawnX(k, x, y, vx, vy, life, ramp, o) {
  o = o || {}; const i = spawn(k, x, y, vx, vy, life, ramp, o.a, o.r, o.w);
  if (o.g) pG[i] = o.g; if (o.dragX != null) pDX[i] = Math.pow(o.dragX, DT); if (o.dragY != null) pDY[i] = Math.pow(o.dragY, DT);
  if (o.floor != null) pFl[i] = o.floor; if (o.age0) pAge[i] = o.age0 * life; if (o.sz) pSz[i] = o.sz;
  if (o.tx != null) pTX[i] = o.tx; if (o.ty != null) pTY[i] = o.ty; if (o.orbitW) pOW[i] = o.orbitW; if (o.orbitR) pOR[i] = o.orbitR; if (o.squash != null) pSq[i] = o.squash;
  return i;
}
const DRAG = Math.exp(-3.4 * DT);
function burst(x, y, n, vmin, vmax, lmin, lmax, ramp, up) { for (let i = 0; i < n; i++) { const a = i / n * 6.2832 + Math.random() * 0.3, v = vmin + Math.random() * (vmax - vmin); spawn(K_BURST, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.8 - (up || 0), lmin + Math.random() * (lmax - lmin), ramp); } }
// 汇聚 / 环绕中的粒子全部外爆（蓄力 → 施放）
// o（可选）：{ pts 1 = 连定点汇聚 / 定点环绕的也放出, up 上抛量（默认 12）, kind 放出后的种类（默认 K_BURST；K_PHYS 时再给 g / floor）, ramp 换色阶,
//   at [x, y] 从这个点往上半圆溅出, to [x, y, k] 从当前位置飞向目标（速度 = 距离 × k） }
function releaseOrbit(vmin, vmax, lmin, lmax, o) {
  o = o || {}; const up = o.up == null ? 12 : o.up, kind = o.kind || K_BURST;
  for (let i = 0; i < PN; i++) {
    const k = pK[i]; if (!(k === K_SPIRAL || k === K_ORBIT || (o.pts && (k === K_SPIRAL_PT || k === K_ORBIT_PT)))) continue;
    const v = vmin + Math.random() * (vmax - vmin); pK[i] = kind; pAge[i] = 0; pLife[i] = lmin + Math.random() * (lmax - lmin);
    if (o.at) { const a = -Math.PI * Math.random(); pX[i] = o.at[0]; pY[i] = o.at[1]; pVX[i] = Math.cos(a) * v; pVY[i] = Math.sin(a) * v - up; }
    else if (o.to) { const kk = o.to[2] || 3; pVX[i] = (o.to[0] - pX[i]) * kk; pVY[i] = (o.to[1] - pY[i]) * kk; }
    else { pVX[i] = Math.cos(pA[i]) * v; pVY[i] = Math.sin(pA[i]) * v * 0.75 - up; }
    if (o.ramp != null) pRamp[i] = typeof o.ramp === 'string' ? FXI[o.ramp] : o.ramp;
    if (kind === K_PHYS) { pG[i] = o.g || 0; pFl[i] = o.floor == null ? NaN : o.floor; pDX[i] = 1; pDY[i] = 1; }
  }
}
// 清掉所有汇聚 / 环绕中的粒子（不外爆）
function clearOrbit() { for (let i = 0; i < PN; i++) { const k = pK[i]; if (k === K_SPIRAL || k === K_ORBIT || k === K_SPIRAL_PT || k === K_ORBIT_PT) pK[i] = 0; } }
// 从天而降（雨、剑、箭、陨石碎）：落到 groundY 变成扬尘
function fall(x, y, vx, vy, groundY, ramp, sz) { const i = spawn(K_FALL, x, y, vx, vy, 3, ramp); pTY[i] = groundY; pSz[i] = sz || 1; return i; }
const PRN = 6, prOn = new Uint8Array(PRN), prK = new Uint8Array(PRN), prX = new Float32Array(PRN), prY = new Float32Array(PRN), prVX = new Float32Array(PRN), prVY = new Float32Array(PRN), prTX = new Float32Array(PRN), prRamp = new Uint8Array(PRN);
const prTr = new Uint8Array(PRN), prEv = new Uint8Array(PRN), prL0 = new Float32Array(PRN), prL1 = new Float32Array(PRN), prB0 = new Float32Array(PRN), prB1 = new Float32Array(PRN), prOff = new Float32Array(PRN), prGl = new Int8Array(PRN), prN = new Uint16Array(PRN);
// 弹道：k 种类（3、4 留给来袭敌弹）；到达目标 x 时调用角色的 impactOn(k, x, y)
// o（可选）：{ trail false = 不拖尾 | { every 每几步一颗（默认 1）, life [最短, 最长], back [最慢, 最快] 往后的速度, off 起点在弹道后几格（默认 2） },
//   glow 地面映光用色阶第几级（0–4，默认 2；-1 = 不映光） }
function shoot(k, x, y, vx, tx, ramp, vy, o) {
  let i = 0; for (; i < PRN - 1 && prOn[i]; i++); prOn[i] = 1; prK[i] = k; prX[i] = x; prY[i] = y; prVX[i] = vx; prVY[i] = vy || 0; prTX[i] = tx; prRamp[i] = ramp == null ? (k >= 3 ? FXI.enemy : C.R_EL) : ramp;
  o = o || {}; const T = o.trail; prTr[i] = T === false ? 0 : 1; prN[i] = 0;
  prEv[i] = (T && T.every) || 1; prL0[i] = T && T.life ? T.life[0] : 0.15; prL1[i] = T && T.life ? T.life[1] : 0.15 + (k === 2 ? 0.3 : 0.15);
  prB0[i] = T && T.back ? T.back[0] : 12; prB1[i] = T && T.back ? T.back[1] : 32; prOff[i] = T && T.off != null ? T.off : 2; prGl[i] = o.glow == null ? 2 : o.glow;
}
const RN = 4, rgT = new Float32Array(RN).fill(9), rgX = new Float32Array(RN), rgY = new Float32Array(RN), rgBig = new Uint8Array(RN), rgRamp = new Uint8Array(RN);
function ring(x, y, big, ramp) { let o = 0; for (let k = 0; k < RN; k++) if (rgT[k] > rgT[o]) o = k; rgT[o] = 0; rgX[o] = x; rgY[o] = y; rgBig[o] = big; rgRamp[o] = ramp; }
let shakeT = 0, shakeAmp = 0, sx = 0, sy = 0, flashT = 0;
function shake(t, amp) { if (reduceMotion) return; shakeT = Math.max(shakeT, t); shakeAmp = Math.max(shakeAmp, amp); }
function flash(t) { flashT = Math.max(flashT, t); }
let dimT = 0;
function dim(t) { dimT = Math.max(dimT, t); }   // 夜空压暗 t 秒（闪白优先）

// ═════════════════════════ 5. 特效积木：光柱、光束、闪电、法阵、护盾、斩击弧、地裂、波浪、毒雾、连线、星芒 ═════════════════════════
// 每个积木占一个槽，按寿命走色阶、后半段断续；layer 0 = 角色后面，1 = 假人与角色之间，2 = 角色前面
const XN = 32, xOn = new Uint8Array(XN), xType = new Uint8Array(XN), xLayer = new Uint8Array(XN), xRamp = new Uint8Array(XN), xAge = new Float32Array(XN), xDur = new Float32Array(XN), xP = new Float32Array(XN * 12);
const T_PILLAR = 1, T_BEAM = 2, T_BOLT = 3, T_CIRCLE = 4, T_DOME = 5, T_SLASH = 6, T_CRACK = 7, T_WAVE = 8, T_CLOUD = 9, T_LINK = 10, T_CROSS = 11;
function fxSlot(type, ramp, dur, layer) { let i = 0, o = 0; for (; i < XN && xOn[i]; i++) if (xAge[i] / xDur[i] > xAge[o] / xDur[o]) o = i; if (i === XN) i = o; xOn[i] = 1; xType[i] = type; xRamp[i] = typeof ramp === 'string' ? FXI[ramp] : ramp; xAge[i] = 0; xDur[i] = dur; xLayer[i] = layer == null ? 2 : layer; return i; }
function prm(i, a) { for (let k = 0; k < a.length; k++) xP[i * 12 + k] = a[k]; return i; }
const fx = {
  pillar: (x, yTop, yBot, w, ramp, dur, layer) => prm(fxSlot(T_PILLAR, ramp, dur, layer), [x, yTop, yBot, w]),                   // 天降光柱：第 1 帧全亮，之后从上往下断开
  beam: (x0, y0, x1, y1, w, ramp, dur, layer) => prm(fxSlot(T_BEAM, ramp, dur, layer), [x0, y0, x1, y1, w]),                    // 直线光束
  bolt: (x0, y0, x1, y1, ramp, dur, layer, seed) => prm(fxSlot(T_BOLT, ramp, dur, layer), [x0, y0, x1, y1, seed || 7]),          // 折线闪电，逐帧抖动
  circle: (x, y, rx, ry, ramp, dur, spin, layer) => prm(fxSlot(T_CIRCLE, ramp, dur, layer == null ? 0 : layer), [x, y, rx, ry, spin || 1]),   // 地面法阵：椭圆 + 刻度 + 旋转
  dome: (x, y, rx, ry, ramp, dur, layer) => prm(fxSlot(T_DOME, ramp, dur, layer), [x, y, rx, ry]),                              // 护盾：点阵半椭圆，按角度逐点亮起
  slash: (cx, cy, r, a0, a1, ramp, dur, width, layer) => prm(fxSlot(T_SLASH, ramp, dur, layer), [cx, cy, r, a0, a1, width || 2]), // 斩击弧（角度：0 朝上，顺时针为正）
  crack: (x, y, len, dir, ramp, dur, layer) => prm(fxSlot(T_CRACK, ramp, dur, layer == null ? 0 : layer), [x, y, len, dir]),     // 地面裂纹
  wave: (x, y, dir, len, height, ramp, dur, layer) => prm(fxSlot(T_WAVE, ramp, dur, layer), [x, y, dir, len, height]),          // 沿地面推进的火浪 / 水浪 / 地刺
  cloud: (x, y, r, ramp, dur, layer) => prm(fxSlot(T_CLOUD, ramp, dur, layer), [x, y, r]),                                      // 毒雾 / 烟团
  link: (x0, y0, x1, y1, ramp, dur, layer) => prm(fxSlot(T_LINK, ramp, dur, layer == null ? 1 : layer), [x0, y0, x1, y1]),      // 光环连线 / 锁链
  cross: (x, y, len, ramp, dur, layer) => prm(fxSlot(T_CROSS, ramp, dur, layer), [x, y, len]),                                   // 十字星芒
};
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
function lineDots(x0, y0, x1, y1, c, skipOdd, f12) { const n = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)))); for (let k = 0; k <= n; k++) { if (skipOdd && ((k + f12) & 1)) continue; put(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), c); } }
function drawFx(layer, f12) {
  for (let i = 0; i < XN; i++) {
    if (!xOn[i] || xLayer[i] !== layer) continue; const q = xAge[i] / xDur[i], R = FXR[xRamp[i]], p = i * 12, late = q > 0.55;
    const c0 = q < 0.2 ? R[0] : q < 0.45 ? R[1] : q < 0.7 ? R[2] : q < 0.88 ? R[3] : R[4];
    switch (xType[i]) {
      case T_PILLAR: { const x = xP[p], y0 = xP[p + 1], y1 = xP[p + 2], w = xP[p + 3], cut = y0 + (y1 - y0) * Math.max(0, (q - 0.35) / 0.65);
        for (let y = Math.round(cut); y <= y1; y++) for (let dx = -w; dx <= w; dx++) { const e = Math.abs(dx) / Math.max(1, w); if (late && e > 0.5 && ((dx + y + f12) & 1)) continue; put(Math.round(x + dx), y, q < 0.12 ? R[0] : e < 0.4 ? (q < 0.5 ? R[0] : R[1]) : e < 0.8 ? R[1] : R[2]); } break; }
      case T_BEAM: { const w = Math.max(1, xP[p + 4]); for (let o = -w + 1; o < w; o++) { const c = o === 0 ? (q < 0.4 ? R[0] : R[1]) : Math.abs(o) < w - 1 ? R[1] : R[2]; const nx = xP[p + 3] - xP[p + 1], ny = xP[p] - xP[p + 2], l = Math.hypot(nx, ny) || 1; lineDots(xP[p] + nx / l * o, xP[p + 1] + ny / l * o, xP[p + 2] + nx / l * o, xP[p + 3] + ny / l * o, q > 0.7 ? R[3] : c, late, f12); } break; }
      case T_BOLT: { if (q > 0.35 && (f12 & 1)) break; let px = xP[p], py = xP[p + 1]; const seg = 7; for (let k = 1; k <= seg; k++) { const t = k / seg, jx = k === seg ? 0 : (hash(xP[p + 4] + f12, k) - 0.5) * 8, jy = k === seg ? 0 : (hash(k, xP[p + 4] - f12) - 0.5) * 8; const nx = xP[p] + (xP[p + 2] - xP[p]) * t + jx, ny = xP[p + 1] + (xP[p + 3] - xP[p + 1]) * t + jy; lineDots(px, py, nx, ny, k & 1 ? c0 : R[Math.min(4, 1 + (q > 0.5 ? 1 : 0))], false, f12); px = nx; py = ny; } break; }
      case T_CIRCLE: { const x = xP[p], y = xP[p + 1], rx = xP[p + 2] * Math.min(1, q * 5), ry = xP[p + 3] * Math.min(1, q * 5), sp_ = xP[p + 4] * xAge[i] * 3, n = Math.ceil(rx * 5);
        for (let k = 0; k < n; k++) { if (late && ((k + f12) & 1)) continue; const a = k / n * 6.2832; put(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), c0); }
        for (let k = 0; k < 6; k++) { const a = sp_ + k / 6 * 6.2832, gx = Math.round(x + Math.cos(a) * rx * 0.72), gy = Math.round(y + Math.sin(a) * ry * 0.72); put(gx, gy, R[Math.min(4, 1 + (late ? 1 : 0))]); put(gx + 1, gy, R[2]); } break; }
      case T_DOME: { const x = xP[p], y = xP[p + 1], rx = xP[p + 2], ry = xP[p + 3], lit = Math.min(1, q / 0.3), n = Math.ceil(rx * 2.2);
        for (let k = 0; k <= n; k++) { const a = Math.PI + k / n * Math.PI; if (k / n > lit || (late && ((k + f12) & 1))) continue; put(Math.round(x + Math.cos(a) * rx), Math.round(y + Math.sin(a) * ry), k / n > lit - 0.1 ? R[0] : c0); } break; }
      case T_SLASH: { const cx = xP[p], cy = xP[p + 1], r = xP[p + 2], a0 = xP[p + 3], a1 = xP[p + 4], wd = q < 0.5 ? xP[p + 5] : 1, n = Math.ceil(Math.abs(a1 - a0) * r);
        for (let k = 0; k <= n; k++) { if (late && (k & 1)) continue; const a = a0 + (a1 - a0) * k / n; for (let o = 0; o < wd; o++) put(Math.round(cx + Math.sin(a) * (r - o)), Math.round(cy - Math.cos(a) * (r - o)), o === 0 ? c0 : R[Math.min(4, 2 + (late ? 1 : 0))]); } break; }
      case T_CRACK: { const x = xP[p], y = xP[p + 1], len = xP[p + 2] * Math.min(1, q * 5), d = xP[p + 3]; let yy = y; for (let k = 0; k <= len; k++) { if (hash(k, x) < 0.3) yy += hash(x, k) < 0.5 ? -1 : 1; yy = Math.max(y - 1, Math.min(y + 1, yy)); put(Math.round(x + d * k), yy, q < 0.3 ? R[1] : R[3]); if (hash(k, 3) < 0.12) put(Math.round(x + d * k), yy + 1, R[4]); } break; }
      case T_WAVE: { const x = xP[p], y = xP[p + 1], d = xP[p + 2], len = xP[p + 3], ht = xP[p + 4], head = len * ease.out(Math.min(1, q * 1.6));
        for (let k = 0; k <= head; k++) { const back = head - k, hh = Math.round(ht * Math.max(0, 1 - back / (len * 0.5)) * (0.7 + 0.3 * hash(k, f12))); for (let j = 0; j < hh; j++) { if (late && ((k + j + f12) & 1)) continue; put(Math.round(x + d * k), y - j, j === hh - 1 ? R[0] : j > hh * 0.5 ? R[1] : R[2]); } } break; }
      case T_CLOUD: { const x = xP[p], y = xP[p + 1], r = xP[p + 2] * (0.6 + 0.4 * Math.min(1, q * 3)); for (let j = -r; j <= r; j += 2) for (let k = -r; k <= r; k += 2) { const d = Math.hypot(k, j * 1.4) / r; if (d > 1 || hash(k + f12, j) < q * 0.8) continue; const c = d < 0.4 ? R[2] : d < 0.75 ? R[3] : R[4]; const X = Math.round(x + k + Math.sin(xAge[i] * 2 + j) * 1.5), Y = Math.round(y + j - xAge[i] * 4); put(X, Y, c); put(X + 1, Y, c); } break; }
      case T_LINK: { const x0 = xP[p], y0 = xP[p + 1], x1 = xP[p + 2], y1 = xP[p + 3], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 2)); for (let k = 0; k <= n; k++) { if (((k + f12) % 3) === 0) continue; put(Math.round(x0 + (x1 - x0) * k / n), Math.round(y0 + (y1 - y0) * k / n), (k + f12) % 3 === 1 ? R[1] : R[2]); } break; }
      case T_CROSS: { const x = Math.round(xP[p]), y = Math.round(xP[p + 1]), L = Math.max(1, Math.round(xP[p + 2] * (1 - q))); for (let r = 1; r <= L; r++) { const c = r <= L / 3 ? R[0] : r <= L * 0.7 ? R[1] : R[2]; put(x + r, y, c); put(x - r, y, c); put(x, y + r, c); put(x, y - r, c); } put(x, y, R[0]); if (q < 0.3) { put(x + 1, y + 1, R[1]); put(x - 1, y - 1, R[1]); put(x + 1, y - 1, R[1]); put(x - 1, y + 1, R[1]); } break; }
    }
  }
}

// ═════════════════════════ 6. 死亡套件：散架 / 碎裂 / 爆裂 / 融化 / 化灰 ═════════════════════════
// 把当前烘焙好的角色精灵拆成碎片交给物理：碎片只用角色自己的像素（色板纯度不变），翻滚只按 90° 转，位置吸附网格，落地弹跳后抖动消散。
const FRN = 220, FPX = 112 * 112 * 3;   // 碎片像素上限按最大精灵 112×112 分配（巨型体 + 长柄武器倒地也放得下）
const fOn = new Uint8Array(FRN), fX = new Float32Array(FRN), fY = new Float32Array(FRN), fVX = new Float32Array(FRN), fVY = new Float32Array(FRN), fRot = new Uint8Array(FRN), fRotT = new Float32Array(FRN), fSpin = new Float32Array(FRN), fRest = new Uint8Array(FRN), fBot = new Int16Array(FRN * 4), fS = new Int32Array(FRN), fN = new Int32Array(FRN);
const fPix = new Int16Array(FPX); let fPixN = 0;
const DK = { on: 0, mode: 0, t: 0, fadeAt: 0.9, fadeDur: 0.5, x0: 0, y0: 0, flip: 0, ramp: 0, n: 0, meltN: 0 };
const DKM = { parts: 1, chunks: 2, burst: 3, melt: 4, ash: 5 };
const grp = new Int32Array(112 * 112);
function deathStart(mode, o) {
  o = o || {}; const s = C.hero, w = s.w, h = s.h, out = s.out, M = s.mat, Gp = s.part;
  DK.on = 1; DK.mode = DKM[mode] || 2; DK.t = 0; DK.fadeAt = o.fadeAt == null ? 0.9 : o.fadeAt; DK.fadeDur = o.fadeDur || 0.5; DK.x0 = HX + C.P.mx; DK.y0 = HY; DK.flip = C.P.flip; DK.ramp = o.ramp == null ? FXI.soul : (typeof o.ramp === 'string' ? FXI[o.ramp] : o.ramp);
  fOn.fill(0); fPixN = 0; DK.n = 0;
  const power = o.power == null ? 1 : o.power, chunk = o.chunk || 4, fromX = o.fromX == null ? 6 : o.fromX, fromY = o.fromY == null ? -14 : o.fromY;
  if (DK.mode === DKM.melt || DK.mode === DKM.ash) {   // 整体一个“碎片”，按列 / 按像素处理
    let n = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = out[y * w + x]; if (c === 255 || fPixN >= FPX) continue; fPix[fPixN++] = x - s.ox; fPix[fPixN++] = y - s.oy; fPix[fPixN++] = c; n++; }
    DK.meltN = n; return;
  }
  // 分组：散架按部件（勾线像素并入相邻部件），碎裂 / 爆裂按抖动网格
  grp.fill(-1);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x; if (out[i] === 255) continue; let g;
    if (DK.mode === DKM.parts) { g = M[i] ? Gp[i] : (y + 1 < h && M[i + w] ? Gp[i + w] : x + 1 < w && M[i + 1] ? Gp[i + 1] : x > 0 && M[i - 1] ? Gp[i - 1] : y > 0 && M[i - w] ? Gp[i - w] : 0); }
    else { const jx = hash(y, 11) < 0.5 ? 0 : 1, jy = hash(x, 5) < 0.5 ? 0 : 1; g = Math.floor((x + jx) / chunk) * 64 + Math.floor((y + jy) / chunk); }
    grp[i] = g;
  }
  const seen = new Map();
  for (let i = 0; i < w * h; i++) { const g = grp[i]; if (g < 0) continue; if (!seen.has(g)) { if (seen.size >= FRN) continue; seen.set(g, []); } seen.get(g).push(i); }
  let k = 0;
  for (const [g, list] of seen) {
    if (k >= FRN) break; let cx = 0, cy = 0; for (const i of list) { cx += i % w; cy += (i / w) | 0; } cx /= list.length; cy /= list.length;
    fS[k] = fPixN; for (const i of list) { if (fPixN >= FPX) break; const x = i % w, y = (i / w) | 0; fPix[fPixN++] = Math.round(x - cx); fPix[fPixN++] = Math.round(y - cy); fPix[fPixN++] = out[i]; } fN[k] = (fPixN - fS[k]) / 3;
    const lx = cx - s.ox, ly = cy - s.oy, sgn = DK.flip ? -1 : 1;
    fX[k] = DK.x0 + sgn * lx; fY[k] = DK.y0 + ly;
    const dxv = lx - fromX, dyv = ly - fromY, dl = Math.hypot(dxv, dyv) || 1, heavy = Math.min(1, 12 / Math.max(4, list.length));
    const spd = (DK.mode === DKM.burst ? 120 : DK.mode === DKM.parts ? 55 : 70) * power * (0.5 + heavy) * (0.7 + 0.6 * hash(k, 3));
    fVX[k] = sgn * dxv / dl * spd + sgn * (o.push || 0); fVY[k] = dyv / dl * spd - (DK.mode === DKM.parts ? 60 : 50) * power * (0.6 + 0.5 * hash(k, 9));
    fRot[k] = 0; fSpin[k] = list.length < 70 ? (0.06 + 0.1 * hash(k, 1)) : 0; fRotT[k] = fSpin[k]; fRest[k] = 0; fOn[k] = 1; k++;
  }
  DK.n = k;
  for (let i = 0; i < k; i++) fragBounds(i);
}
function rot(dx, dy, r) { return r === 0 ? [dx, dy] : r === 1 ? [-dy, dx] : r === 2 ? [-dx, -dy] : [dy, -dx]; }
function fragBounds(i) { let b = -99; for (let j = 0; j < fN[i]; j++) { const q = fS[i] + j * 3, r = rot(fPix[q], fPix[q + 1], fRot[i]); if (r[1] > b) b = r[1]; } fBot[i] = b; }
function stepDeath(dt) {
  if (!DK.on) return; DK.t += dt;
  if (DK.mode === DKM.melt || DK.mode === DKM.ash) return;
  for (let i = 0; i < DK.n; i++) {
    if (!fOn[i] || fRest[i]) continue;
    fVY[i] += 320 * dt; fX[i] += fVX[i] * dt; fY[i] += fVY[i] * dt;
    if (fSpin[i]) { fRotT[i] -= dt; if (fRotT[i] <= 0) { fRot[i] = (fRot[i] + (fVX[i] >= 0 ? 1 : 3)) & 3; fRotT[i] = fSpin[i]; fragBounds(i); } }
    if (fY[i] + fBot[i] >= HY) { fY[i] = HY - fBot[i]; if (Math.abs(fVY[i]) < 40) { fRest[i] = 1; fVY[i] = 0; fVX[i] = 0; } else { fVY[i] *= -0.32; fVX[i] *= 0.55; fSpin[i] *= 1.6; } }
  }
}
function drawDeath() {
  const T = DK.t, dq = clamp01((T - DK.fadeAt) / DK.fadeDur);
  if (DK.mode === DKM.melt) {       // 按列塌成一滩：越高的像素落得越多，最后整滩消散
    const q = ease.inOut(clamp01(T / 0.9)), sgn = DK.flip ? -1 : 1;
    for (let j = 0; j < DK.meltN; j++) { const p = j * 3, dx = fPix[p], dy = fPix[p + 1]; if (B8[((dy + 64) & 7) * 8 + ((dx + 64) & 7)] < dq) continue; const y = Math.round(dy * (1 - q * 0.82)), x = Math.round(dx * (1 + q * 0.35)); put(DK.x0 + sgn * x, DK.y0 + y, fPix[p + 2]); }
    return;
  }
  if (DK.mode === DKM.ash) {        // 从头顶开始逐像素化成灰飘走（粒子在 stepAsh 里生成）
    const q = clamp01(T / 1.2); let top = 99, bot = -99; for (let j = 0; j < DK.meltN; j++) { const dy = fPix[j * 3 + 1]; if (dy < top) top = dy; if (dy > bot) bot = dy; }
    const span = Math.max(1, bot - top), sgn = DK.flip ? -1 : 1;
    for (let j = 0; j < DK.meltN; j++) { const p = j * 3, dx = fPix[p], dy = fPix[p + 1]; if (B8[((dy + 64) & 7) * 8 + ((dx + 64) & 7)] * 0.4 + (dy - top) / span * 0.6 < q * 1.05) continue; put(DK.x0 + sgn * dx, DK.y0 + dy, q > 0 && B8[((dy + 64) & 7) * 8 + ((dx + 64) & 7)] * 0.4 + (dy - top) / span * 0.6 < q * 1.05 + 0.08 ? 7 : fPix[p + 2]); }
    return;
  }
  for (let i = 0; i < DK.n; i++) {
    if (!fOn[i]) continue; const x0 = Math.round(fX[i]), y0 = Math.round(fY[i]);
    for (let j = 0; j < fN[i]; j++) { const q = fS[i] + j * 3, r = rot(fPix[q], fPix[q + 1], fRot[i]); if (B8[((r[1] + 64) & 7) * 8 + ((r[0] + 64) & 7)] < dq) continue; put(x0 + (DK.flip ? -r[0] : r[0]), y0 + r[1], fPix[q + 2]); }
  }
}
function stepAsh(dt) {
  if (!DK.on || DK.mode !== DKM.ash) return; if (Math.random() < dt * 40 && DK.t < 1.2) { const j = Math.floor(Math.random() * DK.meltN) * 3; spawn(K_RISE, DK.x0 + (DK.flip ? -fPix[j] : fPix[j]), DK.y0 + fPix[j + 1], (Math.random() - 0.5) * 8, -10 - Math.random() * 14, 0.7 + Math.random() * 0.6, DK.ramp); }
}

// ═════════════════════════ 7. 舞台：抖动夜空、月亮、远山、石地；训练假人 ═════════════════════════
const fb = new Uint8Array(W * H), bg = new Uint8Array(W * H);
let seed = 1337; const rnd = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5], bayer = (x, y) => (BAYER[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const HORIZON = 72, FLOOR = 80, HY = 79, MX = 70, MY = 17, MR = 8.5, DUMMY_X = 98;
let HX = 34;
function paintBackground() {
  const SKY = [1, 2, 3, 4];
  for (let y = 0; y < FLOOR; y++) for (let x = 0; x < W; x++) { const v = Math.pow(Math.min(1, y / HORIZON), 1.35) * 3, b = Math.floor(v) + (v - Math.floor(v) > bayer(x, y) ? 1 : 0); bg[y * W + x] = SKY[Math.min(3, b)]; }
  for (let y = 0; y < 40; y++) for (let x = 44; x < 100; x++) { const d = Math.hypot(x - MX, y - MY), i = y * W + x; if (d > MR && d < MR + 4.5 && ((x + y) & 1) === 0 && bg[i] < 3) bg[i] = d < MR + 2.5 ? 3 : bg[i] + 1; if (d <= MR) { let c = 6; if (Math.hypot(x - MX + 2.5, y - MY + 2.5) < MR - 2.2) c = 5; if ((x - MX) + (y - MY) > MR * 0.95) c = 7; bg[i] = c; } }
  [[2, -1], [3, -1], [-3, 3], [1, 4], [2, 4], [-1, -4]].forEach(([dx, dy]) => { bg[(MY + dy) * W + MX + dx] = 7; });
  for (let x = 0; x < W; x++) { const h1 = Math.round(69 + 3 * Math.sin(x * 0.07 + 1) + 2 * Math.sin(x * 0.19)), h2 = Math.round(74 + 2 * Math.sin(x * 0.11 + 3) + 1.5 * Math.sin(x * 0.29)); for (let y = h1; y < FLOOR; y++) bg[y * W + x] = 2; for (let y = h2; y < FLOOR; y++) bg[y * W + x] = 1; }
  for (let y = FLOOR; y < H; y++) for (let x = 0; x < W; x++) { const r = y - FLOOR, row = r >> 2, ox = (row & 1) * 4 + (row * 3 & 7), lx = (x + ox) & 7, ly = r & 3; let c = 9; if (lx === 0 || ly === 3) c = 8; else if (ly === 0 || lx === 1) c = 10; if (c === 9 && ((x * 7 + y * 13) % 11) === 0) c = 8; const fade = (y - FLOOR - 6) / 10; if (fade > bayer(x, y)) c = c === 10 ? 9 : 8; if (fade - 0.6 > bayer(x, y)) c = 0; bg[y * W + x] = c; }
  for (let x = 0; x < W; x++) bg[FLOOR * W + x] = ((x & 7) === 0) ? 9 : 10;
  for (const cx of [HX, DUMMY_X]) { for (let x = cx - 8; x <= cx + 8; x++) bg[FLOOR * W + x] = Math.abs(x - cx) < 7 ? 8 : 9; for (let x = cx - 5; x <= cx + 6; x++) bg[(FLOOR + 1) * W + x] = 8; }
}
const NS = 34, starX = new Uint8Array(NS), starY = new Uint8Array(NS), starPh = new Float32Array(NS), starSp = new Float32Array(NS), starBig = new Uint8Array(NS);
for (let i = 0; i < NS; i++) { let x, y; do { x = 2 + Math.floor(rnd() * 124); y = 2 + Math.floor(rnd() * 56); } while (Math.hypot(x - MX, y - MY) < MR + 6); starX[i] = x; starY[i] = y; starPh[i] = rnd() * 6.28; starSp[i] = 0.25 + rnd() * 0.6; starBig[i] = rnd() < 0.18 ? 1 : 0; }
const D_WOOD = defMat('wood'), D_SACK = defMat([20, 7, 6, 5], 1), D_STRAW = defMat('gold'), D_RED = defMat('crimson'), D_INK = defMat('ink', 1, 1);
const dummy = new Sprite(28, 36, 14, 33);
const DUM = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: FX.magic, flash: 0, dq: 0 };
let dumHitT = 9, dumBig = 0, dumK = -1, dumDir = 1;
const WOB_S = [1, -1, 1, 0], WOB_B = [3, -2, 2, -1, 1, 0];
function hitDummy(big, dir) { dumHitT = 0; dumBig = big; dumDir = dir || 1; }
// 假人身上的持续效果：o = { dur 秒, tint 特效色阶名或下标（按原色明暗映射成单色，最后 30% 闪烁褪去）, slow 0–1（摇晃变慢，表现「攻速降低」）,
//   sink 格数（陷进地面）, stun 1（头顶转圈的星） }；再次调用会覆盖
// 另有：outline 色阶（剪影外罩一圈描边）、fill 色阶（第 1 帧整片填色）、fade false（不做最后 30% 的闪烁褪去）、sinkEase 0（整段都下沉，不渐入渐出）
let dfT = 9, dfDur = 0, dfTint = -1, dfSlow = 1, dfSink = 0, dfStun = 0, dfOut = -1, dfFill = -1, dfFade = 1, dfSinkE = 1;
const rampOf = (r) => (r == null ? -1 : typeof r === 'string' ? FXI[r] : r);
function dummyFx(o) { dfT = 0; dfDur = o.dur || 1.2; dfTint = rampOf(o.tint); dfSlow = o.slow || 1; dfSink = o.sink || 0; dfStun = o.stun ? 1 : 0; dfOut = rampOf(o.outline); dfFill = rampOf(o.fill); dfFade = o.fade === false ? 0 : 1; dfSinkE = o.sinkEase === 0 ? 0 : 1; }
const FILLMAP = [];
function fillMap(r) { if (FILLMAP[r]) return FILLMAP[r]; const m = new Uint8Array(256).fill(FXR[r][1]); m[255] = 255; return (FILLMAP[r] = m); }
// 精灵剪影外罩一圈描边（画在已画好的精灵外面）
function outlineSprite(s, X, Y, c, clipY) { const x0 = X - s.ox, y0 = Y - s.oy, o = s.out, w = s.w, h = s.h, on = (x, y) => x >= 0 && y >= 0 && x < w && y < h && o[y * w + x] !== 255;
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) { if (on(x, y)) continue; if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) { const yy = y0 + y; if (yy <= clipY) put(x0 + x, yy, c); } } }
const TINTMAP = [];
function tintMap(r) {
  if (TINTMAP[r]) return TINTMAP[r]; const R = FXR[r], m = new Uint8Array(256);
  for (let i = 0; i < 256; i++) { if (i >= PAL.length) { m[i] = i; continue; } const n = parseInt(PAL[i].slice(1), 16), l = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; m[i] = l > 0.7 ? R[1] : l > 0.42 ? R[2] : l > 0.17 ? R[3] : R[4]; }
  return (TINTMAP[r] = m);
}
// 友军占位：返回项 ALLIES = true（一直在）| 'skill'（蓄力到收招期间在）；E.allies(1 / 0 / null) 手动开关（null = 按 ALLIES）。
// 两个小兵站在角色身边（近战站位在身后，远程一前一后，ALLY_X 可覆盖），allyPoints() 给出挂点（连线、盾印、加血数字用），
// allyFx({ dur, outline, tint }) 让他们亮起来（被光环覆盖的样子）
const A_STEEL = defMat('steel'), A_BLUE = defMat('blue', 1), A_SKIN = defMat('skin'), A_BOOT = defMat('boot'), A_WOOD = defMat('wood');
const allySpr = [new Sprite(16, 22, 8, 19), new Sprite(16, 22, 8, 19)];
let allyForce = null, afT = 9, afDur = 0, afOut = -1, afTint = -1;
function drawAlly(bob) {
  part(); line(-4, -18 + bob, -4, 0, A_WOOD, 0); sp(-4, -19 + bob, A_STEEL, 4); sp(-4, -20 + bob, A_STEEL, 3);
  part(); rect(-3, -1, 2, 2, A_BOOT, 0); rect(1, -1, 3, 2, A_BOOT, 0); rect(-3, -4, 2, 3, A_BLUE, 2); rect(1, -4, 2, 3, A_BLUE, 2);
  part(); rect(-3, -10 + bob, 6, 6 - bob, A_BLUE, 0); run(-5 + bob, -3, 2, A_BOOT, 3);
  part(); rect(-2, -14 + bob, 4, 4, A_SKIN, 0); sp(1, -12 + bob, 0, 0);
  part(); run(-15 + bob, -2, 1, A_STEEL, 0); run(-14 + bob, -3, 2, A_STEEL, 0);
  part(); rect(2, -9 + bob, 2, 4, A_STEEL, 0); sp(3, -7 + bob, A_WOOD, 4);
}
const ALLY_BAKE = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: FX.magic, flash: 0, dq: 0 };
function bakeAllies() { for (let b = 0; b < 2; b++) { begin(allySpr[b], 0, 0); drawAlly(-b); bake(allySpr[b], ALLY_BAKE); } }   // 两帧呼吸（第 2 帧上身抬 1 格）
function allyXs() { return C.ALLY_X || (HX > 50 ? [HX - 17, HX - 30] : [HX - 17, HX + 16]); }
function allyShown() { if (allyForce != null) return !!allyForce; return C.ALLIES === true || (C.ALLIES === 'skill' && (state === CHARGE || state === CAST || state === RECOVER)); }
function allyPoints() { return allyXs().map((x) => ({ x, y: HY, top: HY - 16, mid: HY - 8 })); }
function allyFx(o) { afT = 0; afDur = o.dur || 1.2; afOut = rampOf(o.outline); afTint = rampOf(o.tint); }
function drawAllies(f12) {
  if (!allyShown()) return; const xs = allyXs(), on = afT < afDur, fading = on && afT / afDur > 0.7 && (f12 & 1);
  xs.forEach((x, k) => { const s = allySpr[((f12 >> 2) + k) & 1]; blitMap(s, x, HY, on && afTint >= 0 && !fading ? tintMap(afTint) : null, HY + 1); if (on && afOut >= 0 && !fading) outlineSprite(s, x, HY, FXR[afOut][(f12 >> 1) & 1 ? 1 : 2], HY + 1); });
}
function drawDummy(wob, knock) {
  begin(dummy, knock, 0); shear = wob;
  part(); rect(-4, -1, 9, 2, D_WOOD, 2); rect(-1, -26, 2, 25, D_WOOD, 0);
  part(); rect(-8, -20, 17, 2, D_WOOD, 0); sp(-9, -20, D_STRAW, 0); sp(-9, -19, D_STRAW, 0); sp(9, -20, D_STRAW, 0); sp(9, -19, D_STRAW, 0); sp(-10, -18, D_STRAW, 3); sp(10, -21, D_STRAW, 3);
  part(); for (let y = -21; y <= -9; y++) { const q = (y + 15) / 7, w = Math.round(5.2 * Math.sqrt(Math.max(0, 1 - q * q * 0.45))); run(y, -w, w, D_SACK, 0); }
  run(-20, -4, 4, D_WOOD, 2); run(-10, -4, 4, D_WOOD, 2);
  for (let y = -18; y <= -12; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y + 15); if (d <= 3.3 && d > 2.2) sp(x, y, D_RED, 0); else if (d <= 1.1) sp(x, y, D_RED, 3); }
  for (const x of [-4, -2, 1, 3]) { sp(x, -8, D_STRAW, 0); sp(x + (x & 1), -7, D_STRAW, 3); }
  part(); for (let y = -28; y <= -22; y++) { const w = y === -28 || y === -22 ? 2 : 3; run(y, -w, w, D_SACK, 0); } run(-22, -1, 1, D_WOOD, 2);
  sp(-2, -26, D_INK); sp(-1, -25, D_INK); sp(-2, -24, D_INK); sp(1, -26, D_INK); sp(2, -25, D_INK); sp(1, -24, D_INK); run(-23, -1, 1, D_INK); sp(-2, -29, D_STRAW, 3); sp(0, -30, D_STRAW, 4); sp(2, -29, D_STRAW, 3);
}

// ═════════════════════════ 8. 画面：色板下标帧缓冲 → RGBA → 整数倍放大 ═════════════════════════
let disp, dctx, off, octx, img, px32, dw = 0, dh = 0, scale = 1, offX = 0, offY = 0;
const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
function resize() { const dpr = window.devicePixelRatio || 1; dw = Math.max(1, Math.floor(innerWidth * dpr)); dh = Math.max(1, Math.floor(innerHeight * dpr)); disp.width = dw; disp.height = dh; scale = Math.max(1, Math.floor(Math.min(dw / W, dh / H))); offX = Math.floor((dw - W * scale) / 2); offY = Math.floor((dh - H * scale) / 2); dctx.imageSmoothingEnabled = false; }
function put(x, y, c) { if (x >= 0 && y >= 0 && x < W && y < H) fb[y * W + x] = c; }
function blit(s, X, Y, flip) { const x0 = X - s.ox, y0 = Y - s.oy, o = s.out; for (let y = 0; y < s.h; y++) { const yy = y0 + y; if (yy < 0 || yy >= H) continue; for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c !== 255) { const xx = flip ? X + s.ox - x : x0 + x; if (xx >= 0 && xx < W) fb[yy * W + xx] = c; } } } }
function blitMap(s, X, Y, map, clipY) { const x0 = X - s.ox, y0 = Y - s.oy, o = s.out; for (let y = 0; y < s.h; y++) { const yy = y0 + y; if (yy < 0 || yy >= H || yy > clipY) continue; for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c !== 255) { const xx = x0 + x; if (xx >= 0 && xx < W) fb[yy * W + xx] = map ? map[c] : c; } } } }
function blitShape(s, X, Y, flip, c, dq) { const x0 = X - s.ox, y0 = Y - s.oy, o = s.out; for (let y = 0; y < s.h; y++) { const yy = y0 + y; if (yy < 0 || yy >= H) continue; for (let x = 0; x < s.w; x++) { if (o[y * s.w + x] === 255 || B8[(y & 7) * 8 + (x & 7)] < (dq || 0)) continue; const xx = flip ? X + s.ox - x : x0 + x; if (xx >= 0 && xx < W) fb[yy * W + xx] = c; } } }
function scrX(px) { return HX + C.P.mx + (C.P.flip ? -px : px); }
// 常用画面：发光体地面映光、弹道地面映光、默认弹道外形
function floorGlow(gx, rim, EL, f12) { if (rim < 2) return; const span = rim === 3 ? 14 : 7; for (let x = gx - span; x <= gx + span; x++) { const d = Math.abs(x - gx); if (rim === 3 ? d < span : ((x + f12) & 1) === 0) put(x, FLOOR, rim === 3 && d < 6 ? EL[1] : d < span * 0.5 ? EL[2] : EL[3]); } }
function shotFloorGlow(f12) { for (let i = 0; i < PRN; i++) if (prOn[i] && prGl[i] >= 0) for (let x = Math.round(prX[i]) - 3; x <= Math.round(prX[i]) + 3; x++) if (((x + f12) & 1) === 0) put(x, FLOOR, FXR[prRamp[i]][prGl[i]]); }
// 飞行 / 漂浮单位的地面影子：x 中心，hw 半宽，alt 离地高度（越高越窄越淡）
function groundShadow(x, hw, alt) { const w = Math.max(2, Math.round(hw * (1 - Math.min(0.6, (alt || 0) / 40)))), thin = (alt || 0) > 16; for (let dx = -w; dx <= w; dx++) { if (thin && ((x + dx) & 1)) continue; const e = Math.abs(dx) > w - 2; put(Math.round(x + dx), FLOOR, e ? 9 : 8); if (!e && !thin) put(Math.round(x + dx), FLOOR + 1, 8); } }
function drawShotDefault(k, x, y, d, f12, R) {
  if (k === 1 || k === 3) { put(x, y, R[0]); put(x + d, y, R[0]); put(x - d, y, R[1]); put(x, y - 1, R[1]); put(x, y + 1, R[1]); put(x - 2 * d, y, R[2]); }
  else { put(x - 3 * d, y, R[2]); put(x - 2 * d, y, R[1]); put(x - d, y, R[1]); put(x, y, R[0]); put(x + d, y, R[0]); put(x + 2 * d, y, R[1]); put(x + 3 * d, y, R[2]); put(x, y - 1, R[1]); put(x + d, y - 1, R[1]); put(x, y + 1, R[1]); put(x + d, y + 1, R[1]); put(x, y - 2, R[2]); put(x, y + 2, R[2]); if (f12 & 1) { put(x + d, y - 2, R[0]); put(x - d, y + 2, R[0]); } }
}

// ═════════════════════════ 9. 运行：状态机、固定 60Hz 更新、渲染、动作表、按键、验收接口 ═════════════════════════
let C = null, DUR = DEFAULT_DUR.slice(), state = IDLE, stT = 0, stN = 0, simT = 0, stepN = 0, reelI = 0, auto = true, paused = false, slow = false, acc = 0, last = 0, lastLabel = '';
const REEL = [IDLE, MOVE, IDLE, ATTACK, IDLE, CHARGE, IDLE, HURT, IDLE, DEATH];
// ───── 音效钩子：角色在关键帧上调用 sfx(事件, 参数)；查看页没接音效库时什么也不响，进游戏后接到 M.Sfx.charFx ─────
// 事件：step 脚落地 {w} · swing 攻击挥出 {kind, w} · hit 攻击接触 {mat, w} · shoot 弹道发射 {proj} · charge 蓄力开始 {dur, pal, style}
//       release 施放 {pal, style, w} · impact 特效落地 / 冲击环炸开 {pal, w} · hurt 受击 {body} · death 开始死亡 {how, body} · fall 身体落地 {w}
// charge / release / hurt / death 由引擎按状态自动发（参数取模块的 SFX 声明），其余由模块在 onTime / stepFX / impactOn 里调用。
const STATE_KEY = ['idle', 'move', 'attack', 'charge', 'cast', 'recover', 'hurt', 'death', 'revive'];
let sfxRec = null, sfxChain = '', sfxBase = 0;
const fxName = (i) => Object.keys(FXI).find((k) => FXI[k] === i) || 'magic';
// 和音效库共用的词表：pal = 元素音色，style = 蓄力 / 施放花样。SFX 声明和 impact 的 pal 只用这些名字（音效库认不出的会退回默认）
const SFX_PAL = ['arcane', 'holy', 'frost', 'fire', 'poison', 'nature', 'water', 'earth', 'shadow', 'blood', 'metal', 'coin', 'time', 'bolt', 'curse'];
const SFX_STYLE = ['spiral', 'heal', 'fire', 'frost', 'bolt', 'shield', 'summon', 'poison', 'blade', 'buff', 'shadow', 'beam', 'coin', 'nova', 'meteor'];
const SFX_PAL_OF = { magic: 'arcane', holy: 'holy', frost: 'frost', fire: 'fire', poison: 'poison', nature: 'nature', water: 'water', earth: 'earth', shadow: 'shadow', blood: 'blood', steel: 'metal', coin: 'coin', bolt: 'bolt', curse: 'curse', soul: 'shadow', dust: 'earth', impact: 'holy', enemy: 'blood' };
function sfx(ev, p) {
  const e = Object.assign({ ev, state: STATE_KEY[state], t: +stT.toFixed(3), f: f12of(stT) }, p || {});
  if (sfxRec) { e.chain = sfxChain; e.ct = +((stepN - sfxBase) * DT).toFixed(3); sfxRec.push(e); }
  if (typeof PCD.sfxOut === 'function') { try { PCD.sfxOut(ev, Object.assign({ key: C.key }, e)); } catch (err) { /* 音效库出错不影响画面 */ } }
}
function sfxAuto(s) {
  const X = C.SFX; if (!X || X.auto === false) return;
  const pal = X.pal || SFX_PAL_OF[fxName(C.R_EL)] || 'arcane';
  if (s === CHARGE) sfx('charge', { dur: DUR[CHARGE], pal, style: X.style || 'spiral' });
  else if (s === CAST) sfx('release', { pal, style: X.style || 'spiral', w: X.w == null ? 0.5 : X.w });
}
// 每个状态从头模拟一遍，记下音效事件和时间点（导出给游戏、验收用）
function sfxTimeline() {
  const keep = { state, stT, stN, paused, auto }, rec = []; sfxRec = rec;
  const chains = [['idle', IDLE, DUR[IDLE]], ['move', MOVE, DUR[MOVE]], ['attack', ATTACK, DUR[ATTACK]], ['skill', CHARGE, DUR[CHARGE] + DUR[CAST] + DUR[RECOVER]], ['hurt', HURT, DUR[HURT]], ['death', DEATH, DUR[DEATH]]];
  try {
    for (const [name, s0, total] of chains) { resetFX(); auto = false; sfxChain = name; sfxBase = stepN; enter(s0); const n = Math.round(total / DT) - 1; for (let i = 0; i < n; i++) update(); }
  } finally { sfxRec = null; resetFX(); state = keep.state; stT = keep.stT; stN = keep.stN; paused = keep.paused; auto = keep.auto; }
  return rec;
}
function enter(s) {
  state = s; stT = 0; stN = 0; DK.on = 0;
  sfxAuto(s);
  if (s === HURT || s === DEATH) { const tx = HX + C.HIT_POINT[0] + 2; shoot(s === HURT ? 3 : 4, tx + 300 * INCOMING, HY + C.HIT_POINT[1] - (s === DEATH ? 1 : 0), -300, tx, FXI.enemy); }   // 敌弹正好在 INCOMING 秒命中
  if (s === REVIVE) { const RV = C.REVIVE || {}, dy = RV.dy == null ? -12 : RV.dy, rr = RV.ramp == null ? FXI.soul : rampOf(RV.ramp); for (let i = 0; i < 34; i++) { const a = Math.random() * 6.2832, r = 14 + Math.random() * 12; spawn(K_SPIRAL_PT, HX, HY + dy, r / (0.25 + Math.random() * 0.2), 0, 9, rr, a, r, 5 + Math.random() * 3); } }
  if (C.onEnter) C.onEnter(s);
}
function nextState() { if (CHAIN[state] >= 0) return enter(CHAIN[state]); if (auto) { reelI = (reelI + 1) % REEL.length; return enter(REEL[reelI]); } enter(IDLE); }
function engineTime(s, t) {
  if ((s === HURT || s === DEATH) && Math.abs(t - INCOMING) < 1e-9 && C.SFX && C.SFX.auto !== false) { if (s === HURT) sfx('hurt', { body: C.SFX.body || 'flesh' }); else sfx('death', { how: C.SFX.how || 'collapse', body: C.SFX.body || 'flesh' }); }
  if ((s === HURT || s === DEATH) && Math.abs(t - INCOMING) < 1e-9) { if (!(C.hurtFx && C.hurtFx(s))) { const hx = HX + C.HIT_POINT[0] - 1, hy = HY + C.HIT_POINT[1]; burst(hx, hy, s === DEATH ? 26 : 16, 50, 130, 0.25, 0.55, C.R_HURT == null ? FXI.impact : C.R_HURT, 20); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); } }
  if (s === REVIVE && Math.abs(t - 0.84) < 1e-9) { const RV = C.REVIVE || {}, dy = RV.dy == null ? -12 : RV.dy; ring(HX + 1, HY + dy, RV.big ? 1 : 0, RV.ramp == null ? FXI.soul : rampOf(RV.ramp)); burst(HX + 1, HY + dy - 2, 14, 30, 70, 0.3, 0.5, C.R_EL, 10); }
}
const ENGINE_EVENTS = [[], [], [], [], [], [], [INCOMING], [INCOMING], [0.84]];   // 按状态下标：受击 / 死亡的命中、复活的收尾
function update() {
  stepN++; simT = stepN * DT; const prev = stT; stN++; stT = stN * DT;   // 按步数算时间，不累加小数（累加会让整帧时间落回上一帧）
  const ev = (C.EVENTS && C.EVENTS[state]) || [], ee = ENGINE_EVENTS[state] || [];
  for (let i = 0; i < ee.length; i++) if (prev < ee[i] && stT >= ee[i]) { C.poseAt(state, stT, simT); engineTime(state, ee[i]); }
  for (let i = 0; i < ev.length; i++) if (prev < ev[i] && stT >= ev[i]) { C.poseAt(state, stT, simT); C.onTime(state, ev[i]); }
  if (stT >= DUR[state]) nextState();
  C.poseAt(state, stT, simT);
  if (C.stepFX) C.stepFX(DT, state, stT);
  stepEngine(DT);
  dumHitT += DT; dfT += DT; afT += DT;
}
function stepEngine(dt) {
  const gx = scrX(C.P.gx), gy = HY + C.P.gy;
  for (let i = 0; i < PN; i++) {
    const k = pK[i]; if (!k) continue; pAge[i] += dt;
    if (k === K_SPIRAL || k === K_SPIRAL_PT) {
      const tx = k === K_SPIRAL ? gx : pTX[i], ty = k === K_SPIRAL ? gy : pTY[i];
      pA[i] += pW[i] * dt; pR[i] -= pVX[i] * dt;
      if (pR[i] <= 3.5) { if (k === K_SPIRAL) { pK[i] = K_ORBIT; pR[i] = pOR[i] || 3 + (i % 3); } else if (pOR[i]) { pK[i] = K_ORBIT_PT; pR[i] = pOR[i]; } else { pK[i] = 0; continue; } }
      pX[i] = tx + Math.cos(pA[i]) * pR[i]; pY[i] = ty + Math.sin(pA[i]) * pR[i] * pSq[i]; continue;
    }
    if (k === K_ORBIT || k === K_ORBIT_PT) { const cx = k === K_ORBIT ? gx : pTX[i], cy = k === K_ORBIT ? gy : pTY[i]; pA[i] += (pOW[i] || 8.5) * dt; pX[i] = cx + Math.cos(pA[i]) * pR[i]; pY[i] = cy + Math.sin(pA[i]) * pR[i] * pSq[i]; if (k === K_ORBIT_PT && pAge[i] >= pLife[i]) pK[i] = 0; continue; }
    if (pAge[i] >= pLife[i]) { pK[i] = 0; continue; }
    if (k === K_BURST) { pVX[i] *= DRAG; pVY[i] = pVY[i] * DRAG + 46 * dt; }
    else if (k === K_TRAIL) { pVX[i] *= DRAG; pVY[i] *= DRAG; }
    else if (k === K_DUST) { pVX[i] *= DRAG; pVY[i] = pVY[i] * DRAG + 10 * dt; }
    else if (k === K_RISE) pVX[i] += Math.sin(pAge[i] * 7 + i) * 10 * dt;
    else if (k === K_FALL) { pVY[i] += 600 * dt; if (pY[i] + pVY[i] * dt >= pTY[i]) { pY[i] = pTY[i]; pK[i] = K_DUST; pVX[i] = (Math.random() - 0.5) * 20; pVY[i] = -8; pAge[i] = pLife[i] * 0.55; continue; } }
    else if (k === K_STILL) { pVX[i] = 0; pVY[i] = 0; }
    else if (k === K_PHYS) { pVX[i] *= pDX[i]; pVY[i] = pVY[i] * pDY[i] + pG[i] * dt; if (pFl[i] === pFl[i] && pY[i] + pVY[i] * dt >= pFl[i]) { pY[i] = pFl[i]; pVX[i] = 0; pVY[i] = 0; continue; } }
    else pVX[i] += Math.sin(pAge[i] * 9 + i) * 14 * dt;
    pX[i] += pVX[i] * dt; pY[i] += pVY[i] * dt;
  }
  for (let i = 0; i < PRN; i++) {
    if (!prOn[i]) continue; prX[i] += prVX[i] * dt; prY[i] += prVY[i] * dt; const k = prK[i];
    if (prTr[i] && (prN[i]++ % prEv[i]) === 0) spawn(K_TRAIL, prX[i] - Math.sign(prVX[i]) * prOff[i], prY[i] + Math.random() * 2 - 1, -Math.sign(prVX[i]) * (prB0[i] + Math.random() * (prB1[i] - prB0[i])), Math.random() * 10 - 5, prL0[i] + Math.random() * (prL1[i] - prL0[i]), prRamp[i]);
    if ((prVX[i] > 0 && prX[i] >= prTX[i]) || (prVX[i] < 0 && prX[i] <= prTX[i])) { prOn[i] = 0; if (k < 3 && C.impactOn) C.impactOn(k, prX[i], prY[i]); }
  }
  for (let i = 0; i < XN; i++) if (xOn[i]) { xAge[i] += dt; if (xAge[i] >= xDur[i]) xOn[i] = 0; }
  stepDeath(dt); stepAsh(dt);
  if (shakeT > 0) { shakeT -= dt; if ((stepN & 1) === 0) { const a = shakeT > 0.12 ? shakeAmp : 1; sx = Math.floor(Math.random() * (2 * a + 1)) - a; sy = Math.floor(Math.random() * (2 * a + 1)) - a; } } else { sx = 0; sy = 0; shakeAmp = 0; }
  if (flashT > 0) flashT -= dt;
  if (dimT > 0) dimT -= dt;
  for (let i = 0; i < RN; i++) rgT[i] += dt;
}
function resetFX() { pK.fill(0); prOn.fill(0); rgT.fill(9); xOn.fill(0); DK.on = 0; dfT = 9; afT = 9; dimT = 0; shakeT = 0; shakeAmp = 0; sx = 0; sy = 0; flashT = 0; dumHitT = 9; if (C.fxReset) C.fxReset(); }
function render() {
  const P = C.P;
  if (P.k1 !== C.hero.k1 || P.k2 !== C.hero.k2) { C.drawHero(); C.bakeHero(); C.hero.k1 = P.k1; C.hero.k2 = P.k2; }
  const dfOn = dfT < dfDur, df = Math.floor(dumHitT * 12 * (dfOn ? dfSlow : 1)), seq = dumBig ? WOB_B : WOB_S, wob = (df < seq.length ? seq[df] : 0) * dumDir, dflash = df === 0 ? 1 : 0, dk = (dumBig && df < 3 ? 1 : 0) * dumDir, dkey = ((wob + 4) * 4 + dflash * 2) * 4 + dk + 1;
  if (dkey !== dumK) { drawDummy(wob, dk); DUM.flash = dflash; bake(dummy, DUM); dumK = dkey; }
  fb.set(bg);
  const f8 = Math.floor(simT * 8), f12 = Math.floor(simT * 12);
  for (let i = 0; i < NS; i++) { const b = Math.sin(f8 / 8 * starSp[i] * 6 + starPh[i]); if (b < -0.3) continue; const x = starX[i], y = starY[i]; if (b > 0.75) { put(x, y, 5); if (starBig[i]) { put(x - 1, y, 3); put(x + 1, y, 3); put(x, y - 1, 3); put(x, y + 1, 3); } } else put(x, y, 6); }
  if (C.fxBack) C.fxBack(f12); drawFx(0, f12);
  drawAllies(f12);
  if (dfOn) {
    const q = dfT / dfDur, sk = Math.round(dfSink * (!dfSinkE ? 1 : q < 0.15 ? q / 0.15 : q > 0.8 ? (1 - q) / 0.2 : 1)), fading = dfFade && q > 0.7 && (f12 & 1);
    let map = dfTint >= 0 && !fading ? tintMap(dfTint) : null; if (dfFill >= 0 && dfT < 1 / 12) map = fillMap(dfFill);
    blitMap(dummy, DUMMY_X, HY + sk, map, HY + 1);
    if (dfOut >= 0 && !fading) outlineSprite(dummy, DUMMY_X, HY + sk, FXR[dfOut][(f12 >> 1) & 1 ? 2 : 3], HY + 1);
    if (dfStun) for (let k = 0; k < 3; k++) { const a = f12 * 0.52 + k * 2.094, x = Math.round(DUMMY_X + Math.cos(a) * 6), y = Math.round(HY - 33 + sk + Math.sin(a) * 2), c = FXR[FXI.coin][k === 0 ? 0 : 1]; put(x, y, c); put(x - 1, y, FXR[FXI.coin][2]); put(x + 1, y, FXR[FXI.coin][2]); put(x, y - 1, FXR[FXI.coin][2]); put(x, y + 1, FXR[FXI.coin][2]); }
  } else blit(dummy, DUMMY_X, HY, 0);
  if (C.fxMid) C.fxMid(f12); drawFx(1, f12);
  if (DK.on) drawDeath(); else blit(C.hero, HX + P.mx, HY, P.flip);
  if (C.fxFront) C.fxFront(f12); drawFx(2, f12);
  for (let k = 0; k < RN; k++) { const t = rgT[k], life = rgBig[k] ? 0.22 : 0.16; if (t >= life) continue; const R = FXR[rgRamp[k]], r = 2 + t * (rgBig[k] ? 62 : 48), c = t < life * 0.3 ? R[0] : t < life * 0.65 ? R[1] : R[2], n = Math.ceil(r * 6.3); for (let i = 0; i < n; i++) { if (((i + f12) & 3) === 3 && t > life * 0.5) continue; const a = i / n * 6.2832; put(Math.round(rgX[k] + Math.cos(a) * r), Math.round(rgY[k] + Math.sin(a) * r * 0.8), c); } }
  for (let i = 0; i < PN; i++) {
    const k = pK[i]; if (!k) continue; let c; const R = FXR[pRamp[i]];
    if (k === K_SPIRAL || k === K_ORBIT || k === K_SPIRAL_PT || k === K_ORBIT_PT) { const s = (i + f12) % 6; c = s < 1 ? R[0] : s < 3 ? R[1] : R[2]; }
    else { const q = pAge[i] / pLife[i]; c = R[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4]; }
    const x = Math.round(pX[i]), y = Math.round(pY[i]); put(x, y, c); if (pSz[i] > 1) { put(x + 1, y, c); put(x, y + 1, c); put(x + 1, y + 1, c); }
  }
  for (let i = 0; i < PRN; i++) if (prOn[i]) { const x = Math.round(prX[i]), y = Math.round(prY[i]), d = prVX[i] > 0 ? 1 : -1, R = FXR[prRamp[i]]; if (!(C.drawShot && C.drawShot(prK[i], x, y, d, f12, R))) drawShotDefault(prK[i], x, y, d, f12, R); }
  if (C.fxTop) C.fxTop(f12);   // 最上层：压在冲击环、粒子、弹道之上（刀光、扫描线错位这类后期效果）
  const lut = flashT > 0 ? LUTF : dimT > 0 ? LUTD : LUT;
  for (let i = 0; i < W * H; i++) px32[i] = lut[fb[i]];
  octx.putImageData(img, 0, 0);
  dctx.fillStyle = '#0b0a18'; dctx.fillRect(0, 0, dw, dh);
  dctx.drawImage(off, offX + sx * scale, offY + sy * scale, W * scale, H * scale);
}
// 动作表
const SHEET_DEFAULT = () => [[IDLE, [0, 0.4, 0.8, 1.2, 1.7, 1.85]], [MOVE, [0, 1 / 6, 2 / 6, 3 / 6]], [ATTACK, null], [CHARGE, 'step2'], [CAST, null], [RECOVER, 'step2'], [HURT, 'hurt'], [DEATH, [0.34, 0.42, 0.6, 0.7, 0.9, 1.1, 1.3, 1.95, 2.15, 2.35]], [REVIVE, [0.45, 0.55, 0.65, 0.75, 0.9]]];
function buildSheet() {
  const box = document.getElementById('sheet'); box.textContent = ''; const s = C.hero;
  const fr = new Uint8ClampedArray(s.w * s.h * 4), tmp = new ImageData(fr, s.w, s.h);
  for (const [st, spec] of (C.SHEET || SHEET_DEFAULT())) {
    let ts = []; if (Array.isArray(spec)) ts = spec; else { const step = spec === 'step2' ? 2 : 1, i0 = spec === 'hurt' ? Math.round(INCOMING * 12) : 0; for (let i = i0; i / 12 < DUR[st] - 1e-6; i += step) ts.push(i / 12); }
    const h = document.createElement('h2'); h.textContent = NAMES[st] + ' · ' + ts.length + ' 帧 · ' + DUR[st].toFixed(2) + ' 秒'; box.appendChild(h);
    const row = document.createElement('div'); row.className = 'frames'; box.appendChild(row);
    for (const t of ts) {
      C.poseAt(st, t, t); C.drawHero(); C.bakeHero();
      for (let i = 0; i < s.w * s.h; i++) { const c = s.out[i]; const v = LUT[c === 255 ? (Math.floor(i / s.w) === s.oy + 1 ? 10 : 2) : c]; fr[i * 4] = v & 255; fr[i * 4 + 1] = (v >> 8) & 255; fr[i * 4 + 2] = (v >> 16) & 255; fr[i * 4 + 3] = 255; }
      const cv = document.createElement('canvas'); cv.width = s.w; cv.height = s.h; cv.style.width = s.w * 3 + 'px'; cv.style.height = s.h * 3 + 'px'; cv.title = t.toFixed(2) + 's'; cv.getContext('2d').putImageData(tmp, 0, 0); row.appendChild(cv);
    }
  }
  if (C.deathKit) { const p = document.createElement('p'); p.textContent = '死亡：' + C.deathKit.mode + '（引擎死亡套件，从第 ' + C.deathKit.at + ' 秒开始，动作表里看不到碎片，请在画面里按 6 查看）'; box.appendChild(p); }
  C.hero.k1 = C.hero.k2 = -1; C.poseAt(state, stT, simT);
}
function toggleSheet(on) { const box = document.getElementById('sheet'); const show = on == null ? box.hidden : on; if (show) buildSheet(); box.hidden = !show; }
// 验收：每个状态不同帧数、裁切、色板；待机尺寸
const AUDIT = [[IDLE, 2], [MOVE, 4], [ATTACK, 4], [CHARGE, 3], [CAST, 2], [RECOVER, 2], [HURT, 3], [DEATH, 6]];
function frameHash(o) { let h = 2166136261; for (let i = 0; i < o.length; i++) { h ^= o[i]; h = Math.imul(h, 16777619); } return h >>> 0; }
function bboxOf(s) { const o = s.out; let x0 = 999, y0 = 999, x1 = -1, y1 = -1, n = 0, edge = false, bad = 0; for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c === 255) continue; n++; if (c >= PAL.length) bad++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (x === 0 || y === 0 || x === s.w - 1 || y === s.h - 1) edge = true; } return { x0, y0, x1, y1, n, edge, bad }; }
function audit() {
  const s = C.hero, res = { name: C.name, states: {}, problems: [] };
  for (const [st, min0] of AUDIT) {
    const min = st === DEATH && C.deathKit ? 3 : min0, seen = new Set(); let edge = false, bad = 0, X0 = 999, Y0 = 999, X1 = -1, Y1 = -1;
    for (let i = 0; i / 12 < DUR[st] - 1e-6; i++) { const t = i / 12; C.poseAt(st, t, t); C.drawHero(); C.bakeHero(); seen.add(frameHash(s.out)); const b = bboxOf(s); edge = edge || b.edge; bad += b.bad; if (b.n) { X0 = Math.min(X0, b.x0); Y0 = Math.min(Y0, b.y0); X1 = Math.max(X1, b.x1); Y1 = Math.max(Y1, b.y1); } }
    res.states[NAMES[st]] = { distinctFrames: seen.size, bbox: [X0 - s.ox, Y0 - s.oy, X1 - s.ox, Y1 - s.oy], clipped: edge };
    if (seen.size < min) res.problems.push(NAMES[st] + '：只有 ' + seen.size + ' 个不同帧（至少 ' + min + '）');
    if (edge) res.problems.push(NAMES[st] + '：画到了缓冲边缘，会被裁掉（加大 Sprite 尺寸）');
    if (bad) res.problems.push(NAMES[st] + '：' + bad + ' 个像素不在色板里');
  }
  C.poseAt(IDLE, 0, 0); C.drawHero(); C.bakeHero(); const b = bboxOf(s);
  res.idle = { w: b.x1 - b.x0 + 1, h: b.y1 - b.y0 + 1, pixels: b.n };
  if (res.idle.h < 12 || res.idle.h > 48) res.problems.push('待机高度 ' + res.idle.h + ' 格，超出 12–48');
  res.ownColors = PAL.length - BASE_PAL; if (res.ownColors > 24) res.problems.push('专属色 ' + res.ownColors + ' 个，超过 24（和共享色接近的改用 near()）');
  if (C.deathKit) res.deathKit = C.deathKit;
  if (C.SFX) {   // 声明了音效的模块：检查关键事件都有
    const tl = sfxTimeline(), has = (ch, ev) => tl.some((e) => e.chain === ch && e.ev === ev);
    res.sfx = {}; for (const e of tl) res.sfx[e.chain + '.' + e.ev] = (res.sfx[e.chain + '.' + e.ev] || 0) + 1;
    if (!C.SFX.hover && !has('move', 'step')) res.problems.push('音效：移动里没有 step（脚落地）');
    if (!has('attack', 'swing')) res.problems.push('音效：攻击里没有 swing（挥出）');
    if (!has('attack', 'hit') && !has('attack', 'shoot')) res.problems.push('音效：攻击里没有 hit（接触）或 shoot（发射）');
    if (!has('skill', 'impact')) res.problems.push('音效：技能里没有 impact（特效落地）');
    if (/collapse|topple/.test(C.SFX.how || 'collapse') && !has('death', 'fall')) res.problems.push('音效：死亡方式是倒下，但没有 fall（身体落地）');
    if (C.SFX.pal && !SFX_PAL.includes(C.SFX.pal)) res.problems.push('音效：SFX.pal「' + C.SFX.pal + '」不在词表里（' + SFX_PAL.join(' ') + '）');
    if (C.SFX.style && !SFX_STYLE.includes(C.SFX.style)) res.problems.push('音效：SFX.style「' + C.SFX.style + '」不在词表里（' + SFX_STYLE.join(' ') + '）');
    for (const e of tl) if (e.pal && !SFX_PAL.includes(e.pal)) { res.problems.push('音效：' + e.chain + ' 的 ' + e.ev + ' 用了词表外的 pal「' + e.pal + '」'); break; }
  }
  res.pass = res.problems.length === 0; s.k1 = s.k2 = -1; C.poseAt(state, stT, simT); return res;
}
function paletteCheck() { const ok = new Set(); for (let i = 0; i < LUT.length; i++) { ok.add(LUT[i]); ok.add(LUTF[i]); } let bad = 0; for (let i = 0; i < px32.length; i++) if (!ok.has(px32[i])) bad++; return bad; }
function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); }
function exportData() {
  const s = C.hero, glowSet = new Uint8Array(MBAND.length + 4); for (const m of C.GLOW_MATS || []) glowSet[m] = 1;
  const out = { name: C.name, key: C.key, palette: PAL, w: s.w, h: s.h, ox: s.ox, oy: s.oy, hx: HX, hitPoint: C.HIT_POINT, deathKit: C.deathKit || null, offField: !!C.offField, variant: location.search || '', states: {} }, glow = new Uint8Array(s.w * s.h);
  for (const [st] of AUDIT.concat([[REVIVE, 0]])) {
    const frames = [];
    for (let fi = 0; fi / 12 < DUR[st] - 1e-6; fi++) { const t = fi / 12; C.poseAt(st, t, t); C.drawHero(); C.bakeHero(); for (let i = 0; i < glow.length; i++) glow[i] = glowSet[s.mat[i]] && s.out[i] !== 255 ? 1 : 0; frames.push({ t: +t.toFixed(3), px: b64(s.out), glow: b64(glow), focus: [C.P.gx, C.P.gy], mx: C.P.mx, flip: C.P.flip }); }
    out.states[NAMES[st]] = { dur: DUR[st], frames };
  }
  out.sfxDecl = C.SFX || null; out.sfx = sfxTimeline();   // 音效事件时间线：chain 状态链 · ct 链内秒数 · f 状态内 12 fps 帧号
  s.k1 = s.k2 = -1; C.poseAt(state, stT, simT); return out;
}
const STATE_OF = { idle: IDLE, move: MOVE, attack: ATTACK, skill: CHARGE, hurt: HURT, death: DEATH };
function play(s) { auto = false; if (s != null) enter(s); }
// 领袖的场外效果（全场生效的那一半技能）：角色保持待机，模块在 offField() 里起特效、自己计时
function playOff() { if (!C.offField) return false; auto = false; enter(IDLE); C.offField(); return true; }
function playOffAt(t) { if (!C.offField) return null; paused = true; auto = false; resetFX(); enter(IDLE); C.offField(); const n = Math.round(t / DT); for (let i = 0; i < n; i++) update(); render(); return '场外 +' + t.toFixed(2) + 's'; }
function at(name, t) { const s = STATE_OF[name]; if (s == null) return null; paused = true; auto = false; resetFX(); stepN = 0; simT = 0; enter(s); const n = Math.round(t / DT); for (let i = 0; i < n; i++) update(); render(); return NAMES[state] + ' +' + stT.toFixed(2) + 's'; }   // 从 simT 0 开始：闪烁相位每次一致
function frame(now) {
  let dt = (now - last) / 1000; last = now; if (dt > 0.25) dt = 0.25;
  if (!paused) { acc += slow ? dt * 0.25 : dt; let n = 0; while (acc >= DT && n < 8) { update(); acc -= DT; n++; } if (n === 8) acc = 0; }
  render();
  const label = (C.name ? C.name + ' · ' : '') + NAMES[state] + (paused ? ' · 暂停' : slow ? ' · 慢放' : '') + (auto ? '' : ' · 手动');
  if (label !== lastLabel) { const el = document.getElementById('state'); if (el) el.textContent = label; lastLabel = label; }
  requestAnimationFrame(frame);
}

// ═════════════════════════ 10. 角色模块接口 ═════════════════════════
const defs = {};
PCD.define = (key, factory) => { defs[key] = factory; };
PCD.PAL = PAL; PCD.RAMP = RAMP; PCD.FX = FX;
const E = {
  W, H, DT, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, PAL, RAMP, FX, FXR, FXI, B8, BASE_PAL, color, near, ramp, fxRamp,
  IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, NAMES, DEFAULT_DUR,
  K_SPIRAL, K_ORBIT, K_BURST, K_TRAIL, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT, K_FALL, K_STILL, K_PHYS, K_ORBIT_PT,
  defMat, Sprite, begin, part, sp, run, rect, line, brush, ellipse, bake, copySprite, setShear,
  ease, clamp01, keys, mix, hash, q12, f12of, gait, walkDemo, keyer,
  spawn, spawnX, burst, releaseOrbit, clearOrbit, fall, shoot, ring, shake, flash, dim, fx, groundShadow, bayer,
  allies: (v) => { allyForce = v; }, allyPoints, allyFx, outlineSprite, death: { start: deathStart, get active() { return !!DK.on; } },
  sfx, SFX_PAL, SFX_STYLE, hitDummy, dummyFx, put, blitShape, floorGlow, shotFloorGlow, drawShotDefault,
  get fb() { return fb; }, get stepN() { return stepN; }, get dummy() { return dummy; },
  scrX: (px) => scrX(px), get HX() { return HX; }, get state() { return state; }, get stT() { return stT; }, get simT() { return simT; },
};
PCD.parts = PCD.parts || {};
E.parts = PCD.parts;
PCD.start = function (key) {
  const f = defs[key]; if (!f) throw new Error('没有这个角色模块：' + key);
  C = f(E); C.key = key; buildLUT(); bakeAllies(); if (C.HX != null) HX = C.HX; if (C.DUR) DUR = C.DUR.slice(); if (C.R_EL == null) C.R_EL = FXI.magic;
  if (!C.HIT_POINT) C.HIT_POINT = [2, -13]; if (!C.EVENTS) C.EVENTS = [];
  document.title = C.name || key;
  paintBackground();
  disp = document.getElementById('screen'); dctx = disp.getContext('2d', { alpha: false });
  off = document.createElement('canvas'); off.width = W; off.height = H; octx = off.getContext('2d', { alpha: false });
  img = octx.createImageData(W, H); px32 = new Uint32Array(img.data.buffer);
  addEventListener('resize', resize); resize();
  addEventListener('keydown', (e) => {
    const k = e.code;
    if (k === 'Space') { e.preventDefault(); paused = !paused; }
    else if (k === 'ArrowRight' && paused) { for (let i = 0; i < 5; i++) update(); }
    else if (k === 'KeyS') slow = !slow;
    else if (k === 'KeyA') { auto = !auto; if (auto) { reelI = 0; enter(REEL[0]); } }
    else if (k === 'KeyT') toggleSheet();
    else if (k === 'Digit1') play(IDLE); else if (k === 'Digit2') play(MOVE); else if (k === 'Digit3') play(ATTACK); else if (k === 'Digit4') play(CHARGE); else if (k === 'Digit5') play(HURT); else if (k === 'Digit6') play(DEATH); else if (k === 'Digit7') playOff();
  });
  disp.addEventListener('click', () => { paused = !paused; });
  window.__pc = { play: (n) => (n === 'off' ? playOff() : play(STATE_OF[n])), at, off: playOff, offAt: playOffAt, resume: () => { paused = false; }, sheet: toggleSheet, audit, exportData, paletteCheck, sfxTimeline, get state() { return NAMES[state]; } };
  if (C.offField) { const h = document.getElementById('hint'); if (h) h.textContent = h.textContent.replace(' · A 自动', ' · 7 场外 · A 自动'); }
  C.poseAt(IDLE, 0, 0); last = performance.now(); requestAnimationFrame(frame);
};
})();
