// parts-boss.js：首领这类大精灵的画笔（配合 pcd.js 的深色阶材质 defDeep）。
// 大精灵不再用 24×32 的小部件拼：身体是一块块有体积的形状（旋转椭圆、锥形胶囊、多边形、沿折线的发束），
// 明暗交给 defDeep 按剪影打光；每个形状前自己调用 E.part()，分界线仍然靠部件顺序（从后往前）。
// 全部函数的坐标都是精灵本地坐标（脚底 / 岩浆线为原点，面朝右，y 向上为负），可以先过一次 xf 变换（整体后仰、倒地）。
(function () {
'use strict';
const PCD = window.PCD = window.PCD || {};
PCD.parts = PCD.parts || {};
const B = PCD.parts.boss = {};

// 变换栈（2×3 仿射）：B.reset() 清空；B.rot(px, py, a) 绕本地点转 a 弧度；B.move(dx, dy) 平移；B.save() / B.restore() 嵌套（身体后仰 → 上身前倾 → 转头）
let T = [1, 0, 0, 1, 0, 0]; const ST = [];
// 立绘：B.zoom(2) 之后同一套形状画成两倍分辨率（像素更细，不是放大）；半径、线、点都跟着换算。最后一步乘，只影响落笔
let Z = 1;
B.zoom = (z) => { Z = z || 1; };
B.Z = () => Z;
B.reset = () => { T = [1, 0, 0, 1, 0, 0]; ST.length = 0; };
B.save = () => { ST.push(T.slice()); };
B.restore = () => { if (ST.length) T = ST.pop(); };
const mul = (m) => { const [a, b, c, d, e, f] = T; T = [a * m[0] + c * m[1], b * m[0] + d * m[1], a * m[2] + c * m[3], b * m[2] + d * m[3], a * m[4] + c * m[5] + e, b * m[4] + d * m[5] + f]; };
B.move = (dx, dy) => mul([1, 0, 0, 1, dx, dy]);
B.rot = (px, py, a) => { if (!a) return; const c = Math.cos(a), s = Math.sin(a); mul([c, s, -s, c, px - c * px + s * py, py - s * px - c * py]); };
B.at = (x, y) => [T[0] * x + T[2] * y + T[4], T[1] * x + T[3] * y + T[5]];
const zp = (p) => [p[0] * Z, p[1] * Z];
B.ang = () => Math.atan2(T[1], T[0]);
// 世界坐标（精灵本地）→ 当前变换下的本地坐标（钉在地上的蹄子、掉在地上的武器）
B.inv = (x, y) => { const [a, b, c, d, e, f] = T, det = a * d - b * c, u = x - e, v = y - f; return [(d * u - c * v) / det, (-b * u + a * v) / det]; };
// 多边形扫描填充（点已在本地坐标，内部会过变换）
B.poly = (E, pts, m, t) => {
  const q = pts.map((p) => zp(B.at(p[0], p[1]))); let y0 = 1e9, y1 = -1e9; for (const p of q) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const xs = [], yc = y + 0.5 - 0.5; for (let i = 0; i < q.length; i++) { const a = q[i], b = q[(i + 1) % q.length]; if ((a[1] <= yc && b[1] > yc) || (b[1] <= yc && a[1] > yc)) xs.push(a[0] + (yc - a[1]) / (b[1] - a[1]) * (b[0] - a[0])); }
    xs.sort((a, b) => a - b); for (let i = 0; i + 1 < xs.length; i += 2) E.run(y, Math.round(xs[i]), Math.round(xs[i + 1]), m, t);
  }
};
// 旋转椭圆（ang 是自身的角度，再叠加 B.T 的旋转）
B.ell = (E, cx, cy, rx, ry, ang, m, t) => {
  const c0 = zp(B.at(cx, cy)), a = (ang || 0) + B.ang(), ca = Math.cos(a), sa = Math.sin(a); rx *= Z; ry *= Z; const R = Math.ceil(Math.max(rx, ry)) + 1;
  for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) { const u = i * ca + j * sa, v = -i * sa + j * ca; if ((u * u) / (rx * rx + 0.25) + (v * v) / (ry * ry + 0.25) <= 1) E.sp(Math.round(c0[0]) + i, Math.round(c0[1]) + j, m, t); }
};
// 锥形胶囊（四肢、角、爪、斧柄）：从 (x0, y0) 半径 r0 到 (x1, y1) 半径 r1
B.cap = (E, x0, y0, x1, y1, r0, r1, m, t) => {
  const a = zp(B.at(x0, y0)), b = zp(B.at(x1, y1)), L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.ceil(L * 1.5));
  for (let k = 0; k <= n; k++) { const q = k / n, r = (r0 + (r1 - r0) * q) * Z, x = a[0] + (b[0] - a[0]) * q, y = a[1] + (b[1] - a[1]) * q; E.brush(x, y, Math.max(0.4, r), m, t); }
};
// 不过变换、只乘立绘倍数的版本（端点已经是精灵本地坐标：钉在地上的蹄、算好的手和武器）
B.capW = (E, x0, y0, x1, y1, r0, r1, m, t) => { B.save(); T = [1, 0, 0, 1, 0, 0]; B.cap(E, x0, y0, x1, y1, r0, r1, m, t); B.restore(); };
B.polyW = (E, pts, m, t) => { B.save(); T = [1, 0, 0, 1, 0, 0]; B.poly(E, pts, m, t); B.restore(); };
B.dotW = (E, x, y, r, m, t) => { E.brush(x * Z, y * Z, Math.max(0.4, r * Z), m, t); };
B.pxW = (E, x, y, m, t) => { const x0 = Math.round(x * Z), y0 = Math.round(y * Z); for (let j = 0; j < Z; j++) for (let i = 0; i < Z; i++) E.sp(x0 + i, y0 + j, m, t); };
B.lnW = (E, x0, y0, x1, y1, m, t) => E.line(x0 * Z, y0 * Z, x1 * Z, y1 * Z, m, t);
B.rectW = (E, x, y, w, h, m, t) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) B.pxW(E, x + i, y + j, m, t); };
// 沿折线的一束（发、鬃、尾、翼骨）：pts 本地点，半径从 r0 渐变到 r1
B.strand = (E, pts, r0, r1, m, t) => { let tot = 0; for (let i = 1; i < pts.length; i++) tot += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); let s = 0;
  for (let i = 1; i < pts.length; i++) { const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); B.cap(E, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1], r0 + (r1 - r0) * s / (tot || 1), r0 + (r1 - r0) * (s + d) / (tot || 1), m, t); s += d; } };
// 单像素 / 细线（花纹、肌肉沟、裂纹）：不改部件，画在当前部件里，t 用深色阶的加减级
B.px = (E, x, y, m, t) => { const p = B.at(x, y); B.pxW(E, p[0], p[1], m, t); };
B.ln = (E, x0, y0, x1, y1, m, t) => { const a = zp(B.at(x0, y0)), b = zp(B.at(x1, y1)); E.line(a[0], a[1], b[0], b[1], m, t); };
// 二次贝塞尔折线上的点（尾、鬃、翼的弧）
B.bez = (p0, p1, p2, n) => { const out = []; for (let i = 0; i <= n; i++) { const q = i / n, a = (1 - q) * (1 - q), b = 2 * (1 - q) * q, c = q * q; out.push([p0[0] * a + p1[0] * b + p2[0] * c, p0[1] * a + p1[1] * b + p2[1] * c]); } return out; };
// 两段腿 / 手臂的膝肘：从 a 到 b，两段长 l1 l2，bend 1 / -1 选弯向
B.ik = (a, b, l1, l2, bend) => { const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.min(l1 + l2 - 0.01, Math.max(0.01, Math.hypot(dx, dy))), ca = (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), an = Math.atan2(dy, dx) + (bend || 1) * Math.acos(Math.max(-1, Math.min(1, ca))); return [a[0] + Math.cos(an) * l1, a[1] + Math.sin(an) * l1]; };
})();
