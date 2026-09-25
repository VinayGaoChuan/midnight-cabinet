// parts-beast.js：非人形骨架与部件（四足、飞行、多足、软体 / 漂浮、蛇 / 蠕虫；翅膀四足与飞行共用）。挂在 PCD.parts.beast 下，说明见 parts-beast.md。
// 约定同 parts.js：坐标以脚底（或身体投影落地点）为原点、面朝右，y ≤ 0 在地面以上，不画进地面以下。
// 每种骨架：B.<骨架>.shape(o) 合并默认形体 → rig(P, o) 由姿势算挂点 → 部件 (E, rig, P, o) 各自调用 E.part() 画一个部件 → draw(E, rig, P, o) 按推荐顺序画全身。
// 部件输出只取决于 (rig, P, o)：不读、不写任何全局可变状态；材质下标放在 o.m（B.mats 生成）。
// 部件函数开头自己调用 E.part()：调用之后、下一个 part() 之前画的像素都并进这个部件（没有分界线）——毛脚、脸上白斑、血汗珠都是这样紧跟着画进去的。
(function () {
'use strict';
const parts = window.PCD.parts = window.PCD.parts || {};
const B = parts.beast = parts.beast || {};
const PI = Math.PI, R = Math.round;
const cl = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;

// ═════════════════════════ 0. 通用：贴地画笔、多边形、材质、缓存键、影子 ═════════════════════════
function hash(a, b) { let h = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }
// 所有画笔都不画进地面以下（y > 0 的像素丢掉）
function dot(E, x, y, m, t) { x = R(x); y = R(y); if (y <= 0) E.sp(x, y, m, t); }
function disc(E, x, y, r, m, t) { x = R(x); y = R(y); const n = Math.ceil(r); for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) if (i * i + j * j <= r * r + 0.35 && y + j <= 0) E.sp(x + i, y + j, m, t); }
// 椭圆按像素中心判断（圆心可以是小数）
function oval(E, cx, cy, rx, ry, m, t) {
  const x0 = Math.floor(cx - rx - 1), x1 = Math.ceil(cx + rx + 1), y0 = Math.floor(cy - ry - 1), y1 = Math.min(0, Math.ceil(cy + ry + 1));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) { const u = (x - cx) / (rx + 0.35), v = (y - cy) / (ry + 0.35); if (u * u + v * v <= 1) E.sp(x, y, m, t); }
}
// 直线段，w = 1–4 格粗（竖着走的线横向加粗，横着走的纵向加粗）
function seg(E, x0, y0, x1, y1, w, m, t) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) * 2)), vert = Math.abs(dy) >= Math.abs(dx), o0 = -((w - 1) >> 1);
  for (let k = 0; k <= n; k++) { const x = R(x0 + dx * k / n), y = R(y0 + dy * k / n); for (let i = 0; i < w; i++) dot(E, vert ? x + o0 + i : x, vert ? y : y + o0 + i, m, t); }
}
// 圆头渐细笔画：半径 r0 → r1（0.5 = 1 格，1 = 十字 3 格，1.5 = 3×3）
function taper(E, x0, y0, x1, y1, r0, r1, m, t) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2)); for (let k = 0; k <= n; k++) disc(E, lerp(x0, x1, k / n), lerp(y0, y1, k / n), lerp(r0, r1, k / n), m, t); }
// 多边形填充（像素中心、奇偶规则）：p = [x0, y0, x1, y1, ...]
function poly(E, p, m, t) {
  const n = p.length >> 1; let ya = 1e9, yb = -1e9; for (let i = 1; i < p.length; i += 2) { ya = Math.min(ya, p[i]); yb = Math.max(yb, p[i]); }
  const xs = [];
  for (let y = Math.ceil(ya); y <= Math.floor(yb); y++) {
    xs.length = 0;
    for (let i = 0; i < n; i++) { const ax = p[2 * i], ay = p[2 * i + 1], bx = p[2 * ((i + 1) % n)], by = p[2 * ((i + 1) % n) + 1]; if ((ay <= y && by > y) || (by <= y && ay > y)) xs.push(ax + (y - ay) * (bx - ax) / (by - ay)); }
    xs.sort((a, b) => a - b);
    for (let k = 0; k + 1 < xs.length; k += 2) for (let x = Math.ceil(xs[k] - 0.2); x <= Math.floor(xs[k + 1] + 0.2); x++) dot(E, x, y, m, t);
  }
}
// 转角坐标：局部 (u 沿方向, v 垂直向下) ↔ 世界 (x, y)；a = 方向角（0 朝右，+ 朝下）
const toW = (cx, cy, a, u, v) => [cx + u * Math.cos(a) - v * Math.sin(a), cy + u * Math.sin(a) + v * Math.cos(a)];

// 材质：spec = { main: 主色阶（身体 band 2、四肢 band 1、远侧暗一级）, 其余键: 色阶名或 4 个下标 }。
//   固定生成：body limb far ink（limb / far 可用 spec.limb 换色阶）；缺省补上：eye 金色豆眼 · claw 爪 / 蹄 / 角（骨白）· horn · teeth 牙（白）· glow 发光体 · spec 高光白。
//   wing / bone / mane / shell / feather 另生成 *Far（远侧暗一级）。eye glow spec iris mark 是不自动明暗的平涂材质。
const FLAT = { eye: 1, glow: 1, spec: 1, iris: 1, mark: 1, ink: 1 }, DUAL = { wing: 1, bone: 1, mane: 1, shell: 1, feather: 1 };
function mats(E, s) {
  const rp = (v) => (typeof v === 'string' ? E.RAMP[v] : v), dk = (a) => [a[0], a[1], a[1], a[2]];
  const main = rp(s.main || 'leather'), lm = s.limb ? rp(s.limb) : main;   // limb：四肢 / 头换一个色阶（蜘蛛腿比腹深、蝙蝠翼骨……），缺省同 main
  const m = { body: E.defMat(main, 2), limb: E.defMat(lm, 1), far: E.defMat(dk(lm), 1), ink: E.defMat([0, 0, 0, 0], 1, 1) };
  const D = { eye: [0, 0, 14, 5], claw: 'bone', horn: 'bone', teeth: 'white', glow: 'glow', spec: [21, 21, 21, 21] };
  for (const k of Object.keys(D).concat(Object.keys(s))) {
    if (k === 'main' || m[k] != null) continue; const v = rp(s[k] != null ? s[k] : D[k]); if (!v) continue;
    m[k] = E.defMat(v, k === 'shell' || k === 'wing' ? 2 : 1, FLAT[k] ? 1 : 0); if (DUAL[k]) m[k + 'Far'] = E.defMat(dk(v), 1);
  }
  return m;
}
// 缓存键：spec = [[字段, 最小, 最大], ...]（取整后的取值范围）。按顺序编进 P.k1，放不下（> 2^52）的自动进 P.k2；超出范围直接报错（否则参数变了画面不变）
function key(P, spec) {
  let k1 = 0, k2 = 0, c1 = 1, c2 = 1; P.dq48 = Math.round((P.dq || 0) * 48);   // 消散量 0–1 按 48 档编码
  for (const f of spec) {
    const n = f[2] - f[1] + 1, v = Math.round(P[f[0]] || 0) - f[1];
    if (v < 0 || v >= n) throw new Error('缓存键字段 ' + f[0] + ' = ' + P[f[0]] + ' 超出 ' + f[1] + '..' + f[2]);
    if (c2 === 1 && c1 * n < 4.5e15) { k1 = k1 * n + v; c1 *= n; } else { k2 = k2 * n + v; c2 *= n; if (c2 >= 4.5e15) throw new Error('缓存键放不下：收窄字段范围'); }
  }
  P.k1 = k1; P.k2 = k2;
}
// 地面影子（画在 fxBack 里，屏幕坐标）：cx 中心、hw 半宽；外沿隔点
function shadow(E, cx, hw) { cx = R(cx); for (let x = cx - hw; x <= cx + hw; x++) { const d = Math.abs(x - cx); if (d < hw - 1 || (x & 1) === 0) E.put(x, E.FLOOR, 0); if (d < hw - 3 && (x & 1)) E.put(x, E.FLOOR + 1, 0); } }
// 掉落物轨迹（纯函数）：d 死亡内秒数；c = { at 0.66 脱落时刻, dur 0.25 飞多久落地, dx 12 横飞几格（+ 往前 / - 往后）, hop 5 抛起最高几格 }
//   → [状态 0 还挂着 / 1 飞行中 / 2 落地, 横移 x, 离地高 y]。各骨架 anim.death 的最后一个参数传 c 就写进 P.drop / dsx / dsy
function dropAt(d, c) {
  const at = c.at == null ? 0.66 : c.at; if (d < at) return [0, 0, 0];
  const q = cl((d - at) / (c.dur || 0.25), 0, 1), dx = c.dx == null ? 12 : c.dx, hop = c.hop == null ? 5 : c.hop;
  return [q >= 1 ? 2 : 1, R(dx * q), R(Math.sin(q * PI) * hop)];
}
// anim.death 的掉落物钩子：h = dropAt 的参数 c（写 P.drop / dsx / dsy）或函数 (P, d, f12) => {}（自己写字段，多个掉落物用这个）
function dropHook(P, d, f12, h) { if (!h) return; if (typeof h === 'function') { h(P, d, f12); return; } const t = dropAt(d, h); P.drop = t[0]; P.dsx = t[1]; P.dsy = t[2]; }
B.util = { hash, dot, disc, oval, seg, taper, poly, toW, key, shadow };
B.mats = mats;
B.key = key;
B.dropAt = dropAt;
// 通用字段（所有骨架都用）：bx 前冲 / 击退（begin 的 x 偏移）· flash 闪白 · dq48 消散（key 按 P.dq 自动算）· ddir 消散方向 · rim 轮廓光档
//   drop 掉落物 0 挂着 / 1 飞行 / 2 落地 · dsx 掉落物横移 · dsy 掉落物离地高（anim.death 的掉落物钩子写）
B.COMMON = [['bx', -16, 31], ['flash', 0, 1], ['dq48', 0, 48], ['ddir', 0, 1], ['rim', 0, 3], ['drop', 0, 2], ['dsx', -24, 24], ['dsy', 0, 15]];
const IDLE_SWAY = [0, 1, 0, -1];

// ═════════════════════════ 1. 翅膀（四足龙、飞禽、蝙蝠共用） ═════════════════════════
// 翼姿表：[臂角 a0, 翼尖扇到的角 aT, 收拢 fold 0–1]；角度从正后方（-x）量起，+ 为向上
const WINGS = [
  [0.8, 0.25, 0.85],   // 0 收拢（贴在背上）
  [1.3, -0.25, 0.05],  // 1 上扬（扑翼最高点，整片翼面看得见）
  [0.3, -0.15, 0.1],   // 2 平展（下扑中，侧看最窄）
  [-1.05, -0.25, 0.1], // 3 下压（扑翼最低点）
  [0.85, 0.15, 0.5],   // 4 回收（上抬中，半收）
  [1.05, -0.4, 0],     // 5 张开（施放 / 威吓，最大）
  [-0.2, 0.05, 0.45],  // 6 垂落（死亡、倒地）
];
B.WINGS = WINGS;
B.FLAP = [1, 2, 3, 4];          // 扑翼 4 帧：步态帧 gf → 翼姿
B.FLAP_BOB = [1, 0, -1, 0];     // 扑翼时身体起伏：下压后身体最高
// w = { span 翼展（根到翼尖）, chord 后根距（膜 / 飞羽贴背的长度）, type 'membrane' 膜翼 | 'feather' 羽翼, fingers 翼指 / 初级飞羽数 }
// 材质：膜翼 m.wing（膜）+ m.bone（翼骨，缺省用 limb）+ m.claw（拇指爪）；羽翼 m.feather（缺省 m.wing）。far = 1 用 *Far 暗一级
function wing(E, x, y, pose, w, m, far) {
  E.part();
  const W = WINGS[pose | 0] || WINGS[0], a0 = W[0], aT = W[1], fold = W[2], span = w.span, nf = w.fingers || 3;
  const arm = span * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm;
  const tips = [];
  for (let k = 0; k < nf; k++) { const q = nf === 1 ? 1 : k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); tips.push(wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl); }
  const bx = x - (w.chord || 4) * (1 - 0.3 * fold), by = y + 1;
  if (w.type === 'feather') {
    const fm = far ? (m.featherFar || m.wingFar || m.far) : (m.feather || m.wing || m.limb);
    const lx = tips[2 * nf - 2], ly = tips[2 * nf - 1];
    poly(E, [x, y, wx, wy, lx, ly, lerp(lx, bx, 0.5), lerp(ly, by, 0.5) + 1, bx, by], fm, 0);                 // 次级飞羽（翼面）
    for (let k = 0; k < nf; k++) seg(E, wx, wy, tips[2 * k], tips[2 * k + 1], span >= 12 ? 2 : 1, fm, 0);        // 初级飞羽：从腕部扇开
    seg(E, x, y, wx, wy, 2, fm, 4);                                                                            // 前缘覆羽（亮）
    for (let k = 1; k <= 3; k++) { const q = k / 4, px = lerp(wx, bx, q), py = lerp(wy, by, q); dot(E, lerp(px, lerp(lx, bx, 0.5), 0.55), lerp(py, lerp(ly, by, 0.5), 0.55), fm, 2); }   // 羽片分隔
  } else {
    const mem = far ? (m.wingFar || m.far) : (m.wing || m.limb), bone = far ? (m.boneFar || m.far) : (m.bone || m.limb);
    const p = [x, y, wx, wy];
    for (let k = 0; k < nf; k++) {
      p.push(tips[2 * k], tips[2 * k + 1]);
      const nx = k < nf - 1 ? tips[2 * k + 2] : bx, ny = k < nf - 1 ? tips[2 * k + 3] : by;   // 两指之间的膜边往腕部凹进去（扇贝边）
      const dq = k < nf - 1 ? 0.12 : 0.4; p.push(lerp((tips[2 * k] + nx) / 2, wx, dq), lerp((tips[2 * k + 1] + ny) / 2, wy, dq));   // 最后一段（翼尖 → 背）凹得最深
    }
    p.push(bx, by);
    poly(E, p, mem, 0);
    seg(E, x, y, wx, wy, span >= 12 ? 2 : 1, bone, 0);                                                       // 臂骨
    for (let k = 0; k < nf; k++) { const e = k === 0 ? 1 : 0.8; seg(E, wx, wy, lerp(wx, tips[2 * k], e), lerp(wy, tips[2 * k + 1], e), 1, bone, k === 0 ? 4 : 0); }   // 翼指（前缘亮；其余只画到 8 成，膜边连成一片）
    dot(E, wx + (a0 > 0 ? 0 : 1), wy - 1, m.claw || bone, 3);                                                 // 拇指爪
  }
}
B.wing = wing;

// ═════════════════════════ 2. 四足 quad：犬狼、熊、猪、鼠、豹、马、蜥蜴、龟、龙（加翼） ═════════════════════════
// 头型预设：w 颅宽 · h 颅高 · snout 吻长 · snH 吻高 · tip 吻尖相对粗细 · ear 耳型 · earH 耳高 · nose 鼻型 · teeth 张嘴露牙 · horn 角 · tusk 獠牙
//   face [w, h, snH]：脸上要加细节（白斑、笼头、额鬃、面甲）时颅宽 / 颅高 / 吻高至少多大；预设本身小于它的，加细节前先把头放大（见 parts-beast.md 第四节）
//   mane / forelock：这种头默认配的鬃 / 额鬃（形体里没写 mane / forelock 时用）
const HEADS = {
  canine: { w: 6, h: 5, snout: 4, snH: 3, tip: 0.6, ear: 'point', earH: 3, nose: 'dot', teeth: 1, face: [6, 5, 3] },
  bear: { w: 7, h: 6, snout: 2.5, snH: 3.5, tip: 0.85, ear: 'round', earH: 2, nose: 'dot', teeth: 1, face: [7, 6, 3.5] },
  boar: { w: 6, h: 6, snout: 4.5, snH: 4, tip: 1, ear: 'droop', earH: 3, nose: 'disc', tusk: 2, face: [6, 6, 4] },
  horse: { w: 6, h: 5.5, snout: 5.5, snH: 4, tip: 0.8, ear: 'long', earH: 3, nose: 'dot', mane: 'crest', forelock: { len: 2 }, face: [6, 5.5, 4] },
  cat: { w: 6, h: 5, snout: 1.5, snH: 3, tip: 0.8, ear: 'point', earH: 2, nose: 'dot', teeth: 1, face: [7, 6, 3.5] },
  rat: { w: 5, h: 4, snout: 3.5, snH: 2.5, tip: 0.45, ear: 'round', earH: 2, nose: 'dot', teeth: 1, face: [6, 5, 3] },
  dragon: { w: 6, h: 5, snout: 5, snH: 3, tip: 0.75, ear: 'none', nose: 'dot', teeth: 2, horn: 'back', face: [6, 5, 3] },
  lizard: { w: 5, h: 4, snout: 3.5, snH: 2.5, tip: 0.7, ear: 'none', nose: 'dot', face: [7, 5.5, 3.5] },
};
B.HEADS = HEADS;
// 默认形体（灰狼）。长度单位是格
const QUAD = {
  len: 12, chest: 4.5, rump: 4, waist: 0.3, hump: 0,              // 胸臀圆心距、胸半径、臀半径、收腹 0–1、肩峰高
  leg: 7, lw: 2, thigh: 2.2, farDx: -2, stride: 3, lift: 2, foot: 'paw',   // 胸底离地、腿粗 1–3、后腿大腿半径、远侧腿 x 偏移、半步幅、抬脚高、脚型 paw | pad | hoof | claw
  neck: 3, neckA: 0.6, neckW: 2.5,                               // 颈长、颈角（弧度，+ 抬起）、颈半径
  head: 'canine', headA: 0.15,                                   // 头型（预设名或 { type, ...覆盖 }）、吻部朝向（弧度，+ 朝下）
  tail: 'bushy', tailLen: 8, tailA: -0.4, tailW: 2, tailCurl: 0.5, tailSpikes: 0,   // 尾型 bushy | thin | stub | horse | long | none、长、根部角（从正后方量，+ 上翘）、粗、末端卷曲
  mane: 'none', maneLen: 3, crest: null, forelock: null,         // 鬃 none | ridge 背脊鬃刺 | neck 贴颈鬃 | crest 蓬鬃（参数 crest = Q.maneCrest 的 c）| ruff 颈圈毛 | lion 狮鬃；额鬃（Q.forelock 的 c）
  fur: 1, pattern: null,                                         // 毛纹 0–1、花纹 null | spots | stripes | scales
  wing: null,                                                    // 翅膀 { span, chord, type, fingers }（龙）
  lieLegs: 1,                                                    // 侧躺（lie 2）时腿：1 僵直伸出轮廓 · 0 收在身下（旧画法，只剩一条躯干）
};
function quadShape(o) {
  if (o && o.__quad) return o;
  const c = Object.assign({}, QUAD, o), h = c.head;
  c.hd = Object.assign({}, HEADS[typeof h === 'string' ? h : (h && h.type) || 'canine'], typeof h === 'object' ? h : null);
  if (!o || o.mane == null) c.mane = c.hd.mane || QUAD.mane;               // 没写 mane：用头型默认的鬃（马 = crest）
  if (!o || o.forelock === undefined) c.forelock = c.hd.forelock || null;  // 没写 forelock：用头型默认的额鬃
  c.__quad = 1; return c;
}
function gaitOff(gf, S, U) {     // 对角两腿一组：A = 近前 + 远后，B = 远前 + 近后 → [A 位移, A 抬, B 位移, B 抬]
  return gf === 0 ? [S, 0, -S, 0] : gf === 1 ? [0, 0, 1, U] : gf === 2 ? [-S, 0, S, 0] : gf === 3 ? [1, U, 0, 0] : [0, 0, 0, 0];
}
// 姿势字段（取整后）：gf 步态帧 -1 站 / 0–3 · bob 起伏 -1..1 · crouch 压低 0–4 · pitch 前高 + / 前低 -（-3..6）· lift 离地 0–15
//   head 抬头 - / 低头 +（-2..3）· jaw 张嘴 0–3 · eyes 闭眼 · ear 耳贴后 · tail 甩尾 -2..2 · mane 鬃摆 -1..1
//   paw 抬近侧前爪 0–3 · reach 前腿前伸 -2..4 · wing 翼姿 0–6 · lie 0 站 / 1 塌下 / 2 侧躺 · glow 眼 / 口发光 0–3 · gem 马具宝石档 0–4
const QKEYS = [['gf', -1, 3], ['bob', -1, 1], ['crouch', 0, 4], ['pitch', -3, 6], ['lift', 0, 15], ['head', -2, 3], ['jaw', 0, 3], ['eyes', 0, 1], ['ear', 0, 1],
  ['tail', -2, 2], ['mane', -1, 1], ['paw', 0, 3], ['reach', -2, 4], ['wing', 0, 6], ['lie', 0, 2], ['glow', 0, 3], ['gem', 0, 4]];
function quadReset(P) { P.gf = -1; P.bob = 0; P.crouch = 0; P.pitch = 0; P.lift = 0; P.head = 0; P.jaw = 0; P.eyes = 0; P.ear = 0; P.tail = 0; P.mane = 0; P.paw = 0; P.reach = 0; P.wing = 0; P.lie = 0; P.glow = 0; P.gem = 0; commonReset(P); }
function commonReset(P) { P.bx = 0; P.flash = 0; P.dq = 0; P.ddir = 0; P.rim = 0; P.flip = 0; P.mx = 0; P.drop = 0; P.dsx = 0; P.dsy = 0; }
// 侧躺伸腿（lie 2 且 lieLegs）：身体翻成肚子朝上、腿从上半身僵直伸出的角度（弧度，从水平量，往上为 +）：近前、远前、近后、远后
const LIE_A = [0.85, 1.2, 0.7, 1.05];
function quadRig(P, o) {
  o = quadShape(o);
  const lie = P.lie | 0, cr = P.crouch | 0, pit = P.pitch | 0, lift = P.lift | 0, bob = P.bob | 0, rc = o.chest, rr = o.rump;
  const sq = lie === 2 ? 0.75 : 1, under = lie === 2 ? 0 : lie === 1 ? Math.max(1, R(o.leg * 0.3)) : Math.max(1, o.leg - cr);
  const C1 = { x: o.len / 2, y: -(under + rc * sq) - lift + bob - pit, r: rc }, C2 = { x: -o.len / 2, y: Math.min(-rr * sq, -(under + rr * sq) - lift + bob + R(pit * 0.3)), r: rr };
  const S = o.stride, U = o.lift, gf = lie ? -1 : (P.gf == null ? -1 : P.gf | 0), g = gaitOff(gf, S, U);
  const fT = { x: C1.x + rc * 0.15, y: C1.y + rc * sq * 0.45 }, rT = { x: C2.x + rr * 0.1, y: C2.y + rr * sq * 0.4 };
  const Lf = o.leg + rc * 0.55, Lr = o.leg + rr * 0.6, legs = [];
  const mk = (front, far) => {
    const T = front ? fT : rT, L = front ? Lf : Lr, fd = far ? o.farDx : 0, isA = front !== far;
    const legsUp = lie === 2 && o.lieLegs, C = front ? C1 : C2;
    const tx = T.x + fd, ty = (legsUp ? C.y - C.r * sq * 0.35 : T.y) - (far ? 0.5 : 0);   // 伸腿时腿根挪到上半身（肚子那一侧朝上）
    let fx = tx + (front ? 0.5 : -0.5) + (isA ? g[0] : g[2]), fy = -(isA ? g[1] : g[3]);
    if (front) { fx += (P.reach | 0) * 1.5; if (!far && P.paw) { fx += P.paw | 0; fy = -(P.paw | 0) * 2; } }
    if (lie === 1) { fx = tx + (front ? 3 : 2); fy = 0; }
    if (legsUp) { const A = LIE_A[(front ? 0 : 2) + (far ? 1 : 0)], e = L * 0.92; fx = tx + (front ? 1 : -1) * Math.cos(A) * e; fy = ty - Math.sin(A) * e; }   // 僵直伸出：前腿往前上、后腿往后上，远侧更竖
    else if (lie === 2) { fx = tx + (front ? L * 0.85 : -L * 0.8); fy = far ? -2 : 0; }
    const d = Math.hypot(fx - tx, fy - ty); if (d > L) { fx = tx + (fx - tx) * L / d; fy = ty + (fy - ty) * L / d; }   // 够不着地：腿伸直指向目标，脚悬空
    legs.push({ front, far, T: [tx, ty], F: [fx, fy], L, up: fy < -0.5 });
  };
  mk(false, true); mk(true, true); mk(false, false); mk(true, false);   // 画的顺序：远后、远前、近后、近前
  const hp = P.head | 0;
  let na = o.neckA - hp * 0.18 + pit * 0.06; if (lie === 2) na = -0.3; else if (lie === 1) na = Math.min(na, 0.05);
  const NB = { x: C1.x + rc * 0.35, y: C1.y - rc * sq * 0.3 }, NT = { x: NB.x + Math.cos(na) * o.neck, y: NB.y - Math.sin(na) * o.neck };
  const hd = o.hd, W = hd.w / 2, Hh = hd.h / 2, ha = o.headA + hp * 0.22 + (lie === 2 ? 0.1 : 0);
  let hx = NT.x + Math.cos(ha) * W * 0.5, hy = NT.y + Math.sin(ha) * W * 0.5 - Hh * 0.25;
  if (lie === 2) hy = Math.max(hy, -Hh + 0.5);
  const tipU = W + hd.snout, vc = Hh * 0.2, mouth = toW(hx, hy, ha, tipU - 0.5, vc + 0.5), eye = toW(hx, hy, ha, W * 0.4, -Hh * 0.35);
  return {
    o, lie, gf, sq, C1, C2, legs, NB, NT,
    head: { x: hx, y: hy, a: ha, W, Hh },
    mouth, eye, top: Math.min(C1.y - rc, hy - Hh - (hd.earH || 0)),
    tail: { x: C2.x - rr * 0.75, y: C2.y - rr * sq * 0.35 },
    wing: { x: C1.x - rc * 0.4, y: C1.y - rc * sq * 0.75 },
    hit: [R(C1.x - 1), R(C1.y)],
  };
}
// 躯干外形（quad.body 和马具共用这一份）：第 x 列的 [上沿 y, 下沿 y]，不在躯干上返回 null。胸圆、臀圆和背线 / 腹线连成一体，含收腹、肩峰
function span(rig, o, x) {
  const C1 = rig.C1, C2 = rig.C2, sq = rig.sq, rmin = Math.min(C1.r, C2.r); let top = 1e9, bot = -1e9;
  for (const C of [C1, C2]) { const dx = x - C.x, rr = C.r + 0.3; if (Math.abs(dx) <= rr) { const h = Math.sqrt(rr * rr - dx * dx) * sq; top = Math.min(top, C.y - h); bot = Math.max(bot, C.y + h); } }
  if (x >= C2.x && x <= C1.x) { const t = (x - C2.x) / (C1.x - C2.x); top = Math.min(top, lerp(C2.y - C2.r * sq, C1.y - C1.r * sq, t) - o.hump * Math.exp(-(((t - 0.78) / 0.22) ** 2))); bot = Math.max(bot, lerp(C2.y + C2.r * sq, C1.y + C1.r * sq, t) - o.waist * rmin * Math.sin(PI * t) * sq); }
  if (top > bot) return null;
  return [Math.ceil(top - 0.35), Math.min(0, Math.floor(bot + 0.35))];
}
// 头部几何（quad.head 和马具共用这一份）：头部局部坐标 u 沿吻部朝向、v 垂直向下，原点在颅心。jaw = 张嘴档（缺省 0：下沿按闭嘴算）
//   at(u, v) → [x, y] · skull(u, v) 在颅内 · prof(u) → [吻上沿 v, 吻下沿 v, 嘴线 v] · gap(u) 张嘴时下颚在 u 处下移 · inSnout(u)
//   top(u) / bot(u) 头顶 / 吻背、下颌 / 吻底的 v（颅 |u| < W 与吻部合起来）· uT 吻尖 · u0 吻根 · uc 下颚铰点 · W Hh 颅半宽 / 半高 · vc 吻中线
function headFrame(rig, o, jaw) {
  o = quadShape(o); const hd = o.hd, H = rig.head, W = H.W, Hh = H.Hh, uT = W + hd.snout, u0 = W * 0.2, uc = W * 0.35, vc = Hh * 0.2, jw = jaw | 0;
  const SW = W * W + 0.4, SH = Hh * Hh + 0.4;
  const skull = (u, v) => (u * u) / SW + (v * v) / SH <= 1;
  const sk = (u) => (Math.abs(u) < W ? Math.sqrt(SH) * Math.sqrt(Math.max(0, 1 - (u * u) / SW)) : -1e9);
  const prof = (u) => { const t = cl((u - u0) / (uT - u0), 0, 1), hh = hd.snH * (1 - (1 - hd.tip) * t); return [vc - hh / 2, vc + hh / 2, vc + hh * 0.1]; };
  const gap = (u) => (u > uc ? jw * 1.3 * (u - uc) / (uT - uc) : 0);
  const inSnout = (u) => u >= u0 - 0.5 && u <= uT + 0.45;
  const top = (u) => { let v = Math.abs(u) < W ? -sk(u) : 1e9; if (inSnout(u)) v = Math.min(v, prof(u)[0]); return v; };
  const bot = (u) => { let v = Math.abs(u) < W ? sk(u) : -1e9; if (inSnout(u)) v = Math.max(v, prof(u)[1] + gap(u)); return v; };
  return { at: (u, v) => toW(H.x, H.y, H.a, u, v), skull, prof, gap, inSnout, top, bot, uT, u0, uc, W, Hh, vc, jaw: jw, a: H.a, x: H.x, y: H.y };
}
// 按头部局部坐标扫一遍像素（F = headFrame 的返回值，ext = 扫描半径）：fn(x, y, u, v)
function scanHead(F, ext, fn) {
  const ca = Math.cos(F.a), sa = Math.sin(F.a), X0 = Math.floor(F.x - ext), X1 = Math.ceil(F.x + ext), Y0 = Math.floor(F.y - ext), Y1 = Math.ceil(F.y + ext);
  for (let y = Y0; y <= Y1; y++) for (let x = X0; x <= X1; x++) { const dx = x - F.x, dy = y - F.y; fn(x, y, dx * ca + dy * sa, -dx * sa + dy * ca); }
}
// 躯干 + 颈（一个部件）：外形按 span 逐列填；浅色腹线、毛纹 / 花纹
function quadBody(E, rig, P, o) {
  o = quadShape(o); E.part();
  const m = o.m, C1 = rig.C1, C2 = rig.C2, bx0 = R(C2.x), by0 = R(C2.y);
  taper(E, rig.NB.x, rig.NB.y, rig.NT.x, rig.NT.y, o.neckW, o.neckW * 0.8, m.body, 0);
  const x0 = Math.floor(C2.x - C2.r) - 1, x1 = Math.ceil(C1.x + C1.r) + 1;
  for (let x = x0; x <= x1; x++) {
    const s = span(rig, o, x); if (!s) continue;
    const yt = s[0], yb = s[1];
    for (let y = yt; y <= yb; y++) {
      const rx = x - bx0, ry = y - by0; let t = 0;
      if (o.pattern === 'spots' && y > yt + 1 && y < yb - 1 && ((rx * 5 + ry * 3) & 7) === 0 && hash(rx, ry) < 0.8) t = 2;
      else if (o.pattern === 'stripes' && y < yt + 3 + ((rx >> 2) & 1) && ((rx + 40) % 4) === 0) t = 2;
      else if (o.pattern === 'scales' && y > yt && y < yb - 1 && ((rx + (ry & 1) * 2 + 40) % 4) === 0 && ((ry + 40) & 1) === 0) t = 2;
      else if (o.fur && y === yt + 2 + ((rx >> 2) & 1) && ((rx + 40) % 4) === 1 && x > x0 + 2 && x < x1 - 2) t = 2;   // 背上的毛纹
      dot(E, x, y, m.body, t);
    }
    if (m.belly && x > C2.x - 1 && x < C1.x + C1.r * 0.5 && yb > yt + 2) dot(E, x, yb, m.belly, ((x - bx0 + 40) % 3) === 0 ? 2 : 0);   // 浅色腹线（带腹甲分隔）
  }
}
// 一条腿（一个部件，开头自己调用 E.part()）：前腿 肩 → 腕（抬起时往前拱）→ 脚；后腿 髋（大腿）→ 膝（前）→ 跗（后）→ 脚；远侧腿用暗一级材质。
//   调用之后、下一个 part() 之前画的像素都算这条腿（没有分界线）：毛脚 legFeather 就是紧跟着画进来的
function quadLeg(E, rig, P, o, i) {
  o = quadShape(o); E.part();
  const L = rig.legs[i], m = o.m, mat = L.far ? m.far : m.limb, lw = o.lw, T = L.T, F = L.F;
  const dx = F[0] - T[0], dy = F[1] - T[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, bend = Math.sqrt(Math.max(0, L.L * L.L - d * d)) * 0.5;
  if (L.front) {
    const jx = T[0] + dx * 0.55 - nx * bend, jy = T[1] + dy * 0.55 - ny * bend;        // 腕往前拱
    taper(E, T[0], T[1], jx, jy, lw * 0.5 + 0.5, lw * 0.5, mat, 0);
    seg(E, jx, jy, F[0], F[1] - 0.5, lw, mat, 0);
  } else {
    const kx = T[0] + dx * 0.35 + nx * (-1.2 - bend * 0.4), ky = T[1] + dy * 0.35 + ny * (-1.2 - bend * 0.4);   // 膝在前
    const hx = T[0] + dx * 0.72 + nx * (1.2 + bend * 0.6), hy = T[1] + dy * 0.72 + ny * (1.2 + bend * 0.6);    // 跗关节在后
    disc(E, T[0], T[1], o.thigh, mat, 0); taper(E, T[0], T[1], kx, ky, o.thigh * 0.8, lw * 0.5 + 0.3, mat, 0);
    seg(E, kx, ky, hx, hy, lw, mat, 0); seg(E, hx, hy, F[0], F[1] - 0.5, Math.max(1, lw - 1), mat, 0);
  }
  const fx = R(F[0]), fy = R(F[1]), lying = rig.lie === 2;
  if (lying && o.lieLegs) {                                                                         // 侧躺伸出的腿：脚尖顺着腿再伸 1–2 格（蹄 / 爪用 claw 材质）
    const ux = dx / d, uy = dy / d, hard = o.foot === 'hoof', c = hard ? (L.far ? (m.clawFar || m.claw) : m.claw) : mat;
    seg(E, F[0], F[1] - 0.5, F[0] + ux * 1.6, F[1] - 0.5 + uy * 1.6, lw, c, 0);
    if (o.foot === 'claw' || o.foot === 'pad') dot(E, F[0] + ux * 2.6, F[1] - 0.5 + uy * 2.6, m.claw, 3);
    return;
  }
  if (lying) { dot(E, fx + (L.front ? 1 : -1), fy, mat, 0); return; }
  if (o.foot === 'hoof') { const c = L.far ? (m.clawFar || m.claw) : m.claw; for (let k = -1; k <= lw - 1; k++) { dot(E, fx + k, fy, c, k === -1 ? 3 : 2); dot(E, fx + k, fy - 1, c, k === -1 ? 4 : 3); } }
  else {
    const w = o.foot === 'pad' ? lw + 2 : lw + 1;
    for (let k = -1; k < w; k++) dot(E, fx + k, fy, mat, 0); for (let k = -1; k < w - 1; k++) dot(E, fx + k, fy - 1, mat, 0);
    dot(E, fx + w - 2, fy, mat, 2);                                                                   // 趾缝
    if (o.foot === 'claw' || o.foot === 'pad') { dot(E, fx + w, fy, m.claw, 3); if (o.foot === 'pad') dot(E, fx + w - 1, fy + 0, m.claw, 4); }
  }
}
function quadLegs(E, rig, P, o, far) { for (let i = 0; i < 4; i++) if (!!rig.legs[i].far === !!far) quadLeg(E, rig, P, o, i); }
// 头（含耳，一个部件）：颅 + 吻按 headFrame 的几何栅格化；张嘴时下颚往下开、口里墨色（glow ≥ 1 换成发光体）；眼、眉、鼻、牙、嘴线
function quadHead(E, rig, P, o) {
  o = quadShape(o); E.part();
  const hd = o.hd, m = o.m, jaw = P.jaw | 0, F = headFrame(rig, o, jaw), W = F.W, Hh = F.Hh, uT = F.uT, uc = F.uc, vc = F.vc;
  const muz = m.muz || m.limb, mouthM = (P.glow | 0) >= 1 ? (m.glow || m.ink) : m.ink;
  scanHead(F, uT + 3 + jaw, (x, y, u, v) => {
    let mat = 0, t = 0;
    if (F.inSnout(u)) {
      const [vt, vb, vm] = F.prof(u), g = F.gap(u);
      if (jaw && u > uc + 0.3 && v > vm + 0.45 && v < vm + g + 0.45) mat = mouthM;
      else if ((v >= vt - 0.45 && v <= vm + 0.45) || (v >= vm + g - 0.45 && v <= vb + g + 0.45)) { mat = u > W * 0.75 ? muz : m.limb; if (!jaw && u > uc && u < uT - 0.8 && Math.abs(v - vm - 0.5) < 0.5) t = 1; }
    }
    if (!mat && F.skull(u, v) && !(jaw && u > uc + 0.3 && v > F.prof(u)[2] + 0.45)) mat = m.limb;
    if (mat) dot(E, x, y, mat, t);
  });
  // 耳：颅顶后方
  const eb = F.at(-W * 0.35, -Hh + 0.3), ex = R(eb[0]), ey = R(eb[1]), eh = hd.earH || 0, pin = P.ear | 0;
  if (hd.ear === 'point') for (let k = 0; k < eh; k++) { const xo = ex - R(k * (pin ? 1 : 0.3)); dot(E, xo - 1, ey - 1 - k, m.limb, k === 0 ? 2 : 0); if (k < eh - 1) dot(E, xo, ey - 1 - k, m.limb, k === 0 ? 2 : 0); }
  else if (hd.ear === 'round') { dot(E, ex - 1, ey - 1, m.limb, 0); dot(E, ex, ey - 1, m.limb, 2); dot(E, ex - 1 - pin, ey - 2 + pin, m.limb, 0); dot(E, ex - pin, ey - 2 + pin, m.limb, 0); }
  else if (hd.ear === 'long') for (let k = 0; k < eh + 1; k++) { dot(E, ex - (pin ? k : 0) + (k === eh ? 1 : 0), ey - 1 - k, m.limb, k === 0 ? 2 : 0); if (k < 2) dot(E, ex - 1 - (pin ? k : 0), ey - 1 - k, m.limb, 0); }
  else if (hd.ear === 'droop') for (let k = 0; k < eh; k++) { dot(E, ex + k, ey - 1 + k - (k ? 1 : 0), m.limb, k === eh - 1 ? 2 : 0); dot(E, ex + k - 1, ey - 1 + k - (k ? 1 : 0), m.limb, 0); }
  // 眼、眉
  const ey2 = rig.eye;
  if (P.eyes) { dot(E, ey2[0], ey2[1], m.limb, 1); dot(E, ey2[0] - 1, ey2[1], m.limb, 1); }
  else { dot(E, ey2[0], ey2[1], (P.glow | 0) >= 2 ? (m.glow || m.eye) : m.eye, 3); dot(E, ey2[0] - 1, ey2[1] - 1, m.limb, 4); dot(E, ey2[0], ey2[1] - 1, m.limb, 4); }
  // 鼻、牙
  const pt = F.prof(uT);
  if (hd.nose === 'disc') { const a = F.at(uT + 0.3, vc - 0.5), b = F.at(uT + 0.3, vc + 0.5); dot(E, a[0], a[1], m.nose || muz, 3); dot(E, b[0], b[1], m.nose || muz, 1); }
  else { const n = F.at(uT - 0.3, pt[0] + 0.3); dot(E, n[0], n[1], m.nose || m.ink, 1); }
  if (jaw && hd.teeth) {
    const g = jaw * 1.3 * (uT - 1 - uc) / (uT - uc), a = F.at(uT - 1, pt[2] + 1), b = F.at(uT - 1.5, pt[2] + g);
    dot(E, a[0], a[1], m.teeth, 3); if (jaw >= 2) dot(E, b[0], b[1], m.teeth, 3);
    if (hd.teeth >= 2) { const c = F.at(uT - 3, pt[2] + 1); dot(E, c[0], c[1], m.teeth, 3); }
  }
}
// 角 / 獠牙（单独部件，骨白）：horn 'back' 后掠双角 | 'bull' 前弯牛角 | 'short' 短角；tusk 獠牙长度
function quadHorn(E, rig, P, o) {
  o = quadShape(o); const hd = o.hd, m = o.m, H = rig.head; if (!hd.horn && !hd.tusk) return; E.part();
  const W = H.W, Hh = H.Hh;
  if (hd.horn) {
    const b = toW(H.x, H.y, H.a, -W * 0.1, -Hh + 0.5), L = hd.hornLen || 5;
    for (const [dxo, far] of [[1, 1], [0, 0]]) {
      const x0 = b[0] + dxo, y0 = b[1] - far, mat = far ? (m.hornFar || m.horn) : m.horn;
      if (hd.horn === 'bull') { seg(E, x0, y0, x0 + 1, y0 - L * 0.5, 2, mat, 0); seg(E, x0 + 1, y0 - L * 0.5, x0 + 2, y0 - L * 0.8, 1, mat, 4); }
      else if (hd.horn === 'short') { seg(E, x0, y0, x0 - 1, y0 - L * 0.6, 1, mat, 0); }
      else { seg(E, x0, y0, x0 - L * 0.45, y0 - L * 0.3, 2, mat, 0); seg(E, x0 - L * 0.45, y0 - L * 0.3, x0 - L * 0.9, y0 - L * 0.45, 1, mat, 0); dot(E, x0 - L * 0.9 - 1, y0 - L * 0.45 - 1, mat, 4); }
    }
  }
  if (hd.tusk) { const u = W + hd.snout * 0.55, a = toW(H.x, H.y, H.a, u, Hh * 0.55); for (let k = 0; k < hd.tusk + 1; k++) dot(E, a[0] + (k > 1 ? 1 : 0), a[1] - k, m.horn, k === hd.tusk ? 4 : 3); }
}
// 尾：从臀后往后长的一串圆，tail 甩动越往尖越大（尖端滞后）；碰地面就贴着地走
function quadTail(E, rig, P, o) {
  o = quadShape(o); if (o.tail === 'none') return; E.part();
  const m = o.m, n = o.tail === 'stub' ? 2 : o.tailLen, sw = (P.tail | 0) * 0.2, lie = rig.lie;
  let x = rig.tail.x, y = rig.tail.y, a = lie === 2 ? -0.05 : o.tailA;
  for (let k = 0; k <= n; k++) {
    const q = k / n; let r = 0.5, mat = m.limb, t = 0;
    if (o.tail === 'bushy') { r = o.tailW * 0.5 * (0.55 + 0.6 * Math.sin(PI * (0.1 + 0.8 * q))); if (q > 0.8 && m.tip) mat = m.tip; }
    else if (o.tail === 'stub') r = 1.2;
    else if (o.tail === 'long') r = lerp(o.tailW * 0.5, 0.5, q);
    else if (o.tail === 'horse') { r = k < 3 ? 1 : 0.5; mat = k < 2 ? m.limb : (m.mane || m.limb); }
    disc(E, x, y, r, mat, t);
    if (o.tailSpikes && o.tail === 'long' && k % 3 === 1 && k < n - 1) { dot(E, x, y - r - 1, m.horn, 3); dot(E, x - 1, y - r - 1, m.horn, 0); }
    if (o.tail === 'horse' && k >= 2) { disc(E, x - 1, y + 1, 0.5, mat, 2); if (k > 3) dot(E, x + 1, y + 1, mat, 4); }
    a += (o.tailCurl * q * 0.35) + sw * (0.25 + q) * 0.35 - (o.tail === 'horse' ? 0.12 : 0);
    x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; }
  }
  if (o.tail === 'thin' && o.tuft) disc(E, x + Math.cos(a), y + Math.sin(a), 1, m.mane || m.limb, 0);
  if (o.tail === 'long' && o.spade) { dot(E, x, y - 1, m.horn, 3); dot(E, x, y + 1, m.horn, 2); dot(E, x - 1, y, m.horn, 3); }
}
// 背脊鬃刺（画在躯干之前，只露出伸出轮廓的部分）：沿背线每 2 格一根，mane 摆动
function quadRidge(E, rig, P, o) {
  o = quadShape(o); if (o.mane !== 'ridge') return; E.part();
  const m = o.m, C1 = rig.C1, C2 = rig.C2, sq = rig.sq, mat = m.mane || m.horn, lean = -0.5 + (P.mane | 0) * 0.3;
  for (let x = R(C2.x - C2.r * 0.3); x <= R(C1.x + C1.r * 0.3); x += 2) {
    const t = cl((x - C2.x) / (C1.x - C2.x), 0, 1), top = lerp(C2.y - C2.r * sq, C1.y - C1.r * sq, t) - o.hump * Math.exp(-(((t - 0.78) / 0.22) ** 2));
    const L = o.maneLen + R(Math.sin(PI * t) * 1.5);
    for (let k = 0; k <= L; k++) { dot(E, x + R(lean * k), top + 1 - k, mat, k === L ? 4 : 0); if (k < L - 1) dot(E, x + 1 + R(lean * k), top + 1 - k, mat, 0); }
  }
}
// 颈鬃 / 颈圈毛 / 狮鬃（画在躯干后、头前）。neck = 贴颈的一片（压在颈上、带深色纹，深色皮毛上不显眼）；马用 crest（Q.maneCrest，参数 o.crest）
function quadMane(E, rig, P, o) {
  o = quadShape(o); const kind = o.mane; if (kind === 'none' || kind === 'ridge') return;
  if (kind === 'crest') { maneCrest(E, rig, P, o, o.crest || {}); return; }
  E.part();
  const m = o.m, mat = m.mane || m.limb, NB = rig.NB, NT = rig.NT, sw = P.mane | 0;
  if (kind === 'neck') {
    const L = Math.hypot(NT.x - NB.x, NT.y - NB.y), n = Math.max(2, R(L + 2)), nxv = (NT.y - NB.y) / (L || 1), nyv = -(NT.x - NB.x) / (L || 1);
    for (let k = 0; k <= n; k++) {
      const q = k / n, px = lerp(NB.x - 1, NT.x, q) + nxv * (o.neckW + 0.6), py = lerp(NB.y, NT.y, q) + nyv * (o.neckW + 0.6), len = o.maneLen - (k === n ? 1 : 0);
      for (let j = 0; j <= len; j++) dot(E, px - j * 0.9 - sw * (j > 1 ? 1 : 0), py + j * 0.45 - 0.5, mat, j === len ? 2 : (k & 1) && j === 1 ? 4 : 0);
    }
    const f = toW(rig.head.x, rig.head.y, rig.head.a, -rig.head.W * 0.1, -rig.head.Hh); dot(E, f[0], f[1], mat, 4); dot(E, f[0] + 1, f[1] + 1, mat, 0);   // 额鬃
  } else {
    const big = kind === 'lion', cx = big ? lerp(NB.x, rig.head.x, 0.55) : NB.x, cy = big ? lerp(NB.y, rig.head.y, 0.55) : NB.y + 0.5, r0 = big ? o.hd.h * 0.75 + 1 : o.neckW + 0.8, L = o.maneLen;
    disc(E, cx, cy, r0, mat, 0);
    for (let k = 0; k < (big ? 9 : 6); k++) {
      const a = (big ? 0.35 : 0.9) + k * (big ? 0.62 : 0.45) + sw * 0.15, ca = Math.cos(a), sa = Math.sin(a);   // 从上方往后、往下一圈尖
      if (!big && ca > 0.3) continue;
      const bx0 = cx - ca * r0 * 0.3, by0 = cy - sa * r0 * 0.3;
      for (let j = 0; j <= r0 * 0.7 + L; j++) dot(E, bx0 - ca * j, by0 - sa * j, mat, j >= r0 * 0.7 + L - 1 ? 4 : (k & 1) ? 0 : 2);
    }
  }
}
// 全身，按推荐顺序：远翼 → 远侧腿 → 尾 → 背鬃刺 → 躯干 + 颈 → 近侧腿 → 近翼 → 颈鬃 / 蓬鬃 / 狮鬃 → 头 → 额鬃 → 角 / 獠牙
//   侧躺伸腿（lie 2 且 lieLegs）：肚子朝镜头，四条腿都在最前面 → 腿挪到最后画（远侧先、近侧后）
function quadDraw(E, rig, P, o) {
  o = quadShape(o); const legsLast = rig.lie === 2 && o.lieLegs;
  if (o.wing) wing(E, rig.wing.x + 2, rig.wing.y - 1, P.wing, o.wing, o.m, 1);
  if (!legsLast) quadLegs(E, rig, P, o, 1);
  quadTail(E, rig, P, o); quadRidge(E, rig, P, o); quadBody(E, rig, P, o);
  if (!legsLast) quadLegs(E, rig, P, o, 0);
  if (o.wing) wing(E, rig.wing.x, rig.wing.y, P.wing, o.wing, o.m, 0);
  quadMane(E, rig, P, o); quadHead(E, rig, P, o); if (o.forelock) forelock(E, rig, P, o, o.forelock); quadHorn(E, rig, P, o);
  if (legsLast) { quadLegs(E, rig, P, o, 1); quadLegs(E, rig, P, o, 0); }
}
// 常用动作（只写姿势字段；模块在调用前先 reset）
const quadAnim = {
  idle(P, tq, f12, dur) { const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.tail = IDLE_SWAY[(b + 1) & 3]; P.mane = IDLE_SWAY[Math.floor(TT * 1.25 + 1e-6) & 3]; return tq % dur; },
  walk(P, tq) { const f = Math.floor(tq * 6 + 1e-6) & 3; P.gf = f; P.bob = f & 1 ? 0 : 1; P.tail = [-1, 0, 1, 0][f]; P.mane = [1, 0, -1, 0][f]; P.head = f & 1 ? 0 : 1; return f; },
  hurt(P, h) { if (h < 0.2) { P.bx = -2; P.eyes = 1; P.ear = 1; P.head = -1; P.tail = 2; P.mane = 1; P.crouch = 1; P.flash = h < 1 / 12 ? 1 : 0; } else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.ear = 1; P.tail = 1; } },
  // 死亡：受击 → 前腿先软（塌下）→ 侧躺（离地 3 → 1 → 0）→ 尾巴最后落下 → 消散。drop = 掉落物钩子（B.dropAt 的参数，或函数，见 dropHook）
  death(P, d, f12, drop) {
    if (d < 0.3) { P.bx = -2; P.eyes = 1; P.ear = 1; P.tail = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.pitch = d < 0.15 ? 0 : -1; P.head = 1; }
    else if (d < 0.5) { P.bx = -3; P.lie = 1; P.eyes = 1; P.ear = 1; P.head = 2; P.tail = 1; P.jaw = 1; }
    else { P.bx = -3; P.lie = 2; P.eyes = 1; P.ear = 1; P.jaw = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tail = d < 0.9 ? 2 : d < 1.0 ? 1 : 0; if (d >= 1.6) P.dq = cl((d - 1.6) / 0.8, 0, 1); }
    dropHook(P, d, f12, drop);
  },
};
B.quad = { DEFAULT: QUAD, KEYS: QKEYS, shape: quadShape, reset: quadReset, rig: quadRig, body: quadBody, leg: quadLeg, legs: quadLegs, head: quadHead, horn: quadHorn, tail: quadTail, ridge: quadRidge, mane: quadMane, draw: quadDraw, anim: quadAnim, gait: gaitOff };
// ═════════════════════════ 2b. 四足马具 / 马铠：战马、坐骑、驮兽共用（挂在 B.quad 上，说明见 parts-beast.md 第五节） ═════════════════════════
// 都按 quad 的 rig 挂点画、自己调用 E.part()；材质键从 o.m 里取（在 B.mats 的 spec 里多写几个键：cloth trim plate rim boss strap gem glow plume ……）。
// 几何和 quad.body / quad.head 同一份：躯干外形 span、头部局部坐标 headFrame（上面第 2 节）。宝石档读 P.gem（已在 quad.KEYS / reset 里）。
//   Q.span(rig, o, x) · Q.headFrame(rig, o, jaw) · Q.scanHead(F, ext, fn) · Q.faceRoom(o)
//   Q.blanket 背毯 / 马衣 · Q.peytral 胸盾（Q.peytralAt 盾心）· Q.bridle 笼头 · Q.chamfron 面甲 + 顶饰羽 · Q.legFeather / legsFeather 毛脚
//   Q.maneCrest 蓬鬃（= quad.mane 'crest'）· Q.forelock 额鬃 · Q.gem 十字宝石 · Q.EMBLEMS 徽记
const Q = B.quad;
Q.span = (rig, o, x) => span(rig, quadShape(o), x);
Q.headFrame = headFrame; Q.scanHead = scanHead;
Q.TACK_KEYS = [];   // 旧写法兼容：gem 已并进 quad.KEYS / reset，不用再 concat
// 这个头够不够大、能不能加面部细节（HEADS 的 face）：够 → null；不够 → [还差的颅宽, 颅高, 吻高]
Q.faceRoom = (o) => { o = quadShape(o); const hd = o.hd, f = hd.face; if (!f) return null; const d = [f[0] - hd.w, f[1] - hd.h, f[2] - hd.snH].map((v) => Math.max(0, +v.toFixed(2))); return d[0] || d[1] || d[2] ? d : null; };

const EMBLEMS = {
  shoe: ['.###.', '#...#', '#...#', '#...#', '##.##'],
  cross: ['..#..', '..#..', '#####', '..#..', '..#..'],
  ring: ['.###.', '#...#', '#...#', '#...#', '.###.'],
  sun: ['#.#.#', '.###.', '##.##', '.###.', '#.#.#'],
};
Q.EMBLEMS = EMBLEMS;
function emblem(E, cx, cy, mat, kind) { const e = EMBLEMS[kind]; if (!e || !mat) return; for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) if (e[j][i] === '#') dot(E, cx - 2 + i, cy - 2 + j, mat, j === 0 || i === 0 ? 4 : 3); }

const GEMLV = [   // 中 左 右 上 下：[用 glow?, tone]
  [[0, 3], [0, 3], [0, 2], [0, 4], [0, 2]],
  [[1, 3], [0, 4], [0, 3], [0, 4], [0, 3]],
  [[1, 3], [1, 3], [0, 4], [1, 3], [0, 4]],
  [[1, 3], [1, 3], [1, 3], [1, 3], [1, 3]],
  [[0, 2], [0, 2], [0, 1], [0, 2], [0, 1]],
];
const GP = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
function gem(E, x, y, lv, m, small) { const L = GEMLV[cl(lv | 0, 0, 4)], g = m.gem || m.glow, w = m.glow || m.gem; for (let k = 0; k < (small ? 1 : 5); k++) dot(E, x + GP[k][0], y + GP[k][1], L[k][0] ? w : g, L[k][1]); }
Q.gem = gem;

// 背毯：c = { a 0.05, b 0.85（沿 臀心 0 → 胸心 1 的起止，可超出 0–1）, drop 5（背线往下垂几格；超过腹线就成了长马衣）, thick 1（盖在背上的厚度）,
//   mat 'cloth', trim 'trim'（下摆和两端镶边的材质键；null = 不镶边）, hem 'straight' 平 | 'scallop' 波浪 | 'dag' 尖齿 | 'fringe' 流苏,
//   quilt 0 | 1 菱格绗缝, emblem null | 'shoe' | 'cross' | 'ring' | 'sun'（emb 徽记材质键，缺省 trim）, embX 0.5（徽记在毯子上的横向位置）,
//   roll 0（后端横放的铺盖卷半径，rollMat 缺省 'strap'）, girth null | 0–1（肚带位置，'strap' 材质）}
// 下摆随 P.mane（-1..1）甩：波浪相位错 1 格，后 / 前下角多出 1 格
function blanket(E, rig, P, o, c) {
  o = quadShape(o); if (!c) return; E.part();
  const m = o.m, mat = m[c.mat || 'cloth'] || m.body, trim = c.trim === null ? 0 : (m[c.trim || 'trim'] || 0), C1 = rig.C1, C2 = rig.C2, sw = P.mane | 0;
  const xa = R(lerp(C2.x, C1.x, c.a == null ? 0.05 : c.a)), xb = R(lerp(C2.x, C1.x, c.b == null ? 0.85 : c.b)), drop = c.drop == null ? 5 : c.drop, th = c.thick == null ? 1 : c.thick, hem = c.hem || 'straight';
  let tMid = 0, bMid = 0, hasMid = false;
  for (let x = xa; x <= xb; x++) {
    const s = span(rig, o, x); if (!s) continue;
    const top = s[0] - th, k = x - xa + sw + 40; let bot = top + th + drop;
    if (hem === 'scallop') bot += (k & 3) === 1 || (k & 3) === 2 ? 1 : 0; else if (hem === 'dag') bot += [0, 1, 2, 1][k & 3];
    const end = x === xa || x === xb;
    for (let y = top + (end ? 1 : 0); y <= bot; y++) {                          // 两端上角圆一格
      let mm = mat, t = 0;
      if (trim && (y === bot || (end && y > top))) mm = trim;
      else if (c.quilt && y > top + 1 && y < bot - 1 && !end && (((x - xa) + (y - top) + 64) % 4 === 0 || ((x - xa) - (y - top) + 64) % 4 === 0)) t = 2;
      dot(E, x, y, mm, t);
    }
    if (hem === 'fringe' && trim && !(k & 1)) { dot(E, x, bot + 1, trim, 2); if ((k & 3) === 0) dot(E, x, bot + 2, trim, 2); }
    if (x === xa && sw > 0) { dot(E, x - 1, bot, trim || mat, 0); dot(E, x - 1, bot - 1, mat, 0); }
    if (x === xb && sw < 0) { dot(E, x + 1, bot, trim || mat, 0); dot(E, x + 1, bot - 1, mat, 0); }
    if (x === R(lerp(xa, xb, c.embX == null ? 0.5 : c.embX))) { tMid = top; bMid = bot; hasMid = true; }
  }
  if (c.emblem && hasMid) emblem(E, R(lerp(xa, xb, c.embX == null ? 0.5 : c.embX)), R((tMid + th + bMid) / 2), m[c.emb || 'trim'] || trim, c.emblem);
  if (c.girth != null) { const gx = R(lerp(xa, xb, c.girth)), s = span(rig, o, gx), st = m[c.strapMat || 'strap'] || mat; if (s) { const b0 = s[0] - th + th + drop + 1; for (let y = b0; y <= s[1]; y++) { dot(E, gx, y, st, 0); dot(E, gx + 1, y, st, 0); } } }
  if (c.roll) { const r = c.roll, x = xa + r, s = span(rig, o, x), rm = m[c.rollMat || 'strap'] || mat; if (s) { const cy = s[0] - th - r + 0.5; oval(E, x, cy, r + 0.4, r * 0.85, rm, 0); dot(E, x, R(cy), rm, 1); dot(E, x - 1, R(cy), rm, 2); for (let y = Math.ceil(cy - r * 0.85); y <= Math.floor(cy + r * 0.85); y++) dot(E, x + 1, y, rm, 1); } }
}
Q.blanket = blanket;

// 胸盾：c = { shape 'round' 圆盾 | 'heater' 鸢尾盾（平顶尖底）, r 4（圆盾半径）, w 7, h 9（鸢尾盾宽高）, fx 0.55（盾心在胸圆心前 fx × 胸半径）, dx 0, dy 1,
//   face 'plate'（盾面材质键）, rim 'rim'（盾边）, boss 0 | 1（盾心 3×3 铆钉，'boss' 材质）, gem 0 | 1（盾心嵌十字宝石，档位读 P.gem）, emblem / emb（同 blanket）,
//   strap 0 | 1（胸带：盾上沿斜拉到鬐甲，'strap' 材质）, at [x, y]（掉落时直接给盾心，不跟胸走）, flat 0 | 1（倒在地上：画成扁的一条）}
function peytralAt(rig, o, c) { if (c.at) return c.at; const C1 = rig.C1; return [C1.x + C1.r * (c.fx == null ? 0.55 : c.fx) + (c.dx || 0), C1.y + (c.dy == null ? 1 : c.dy)]; }
Q.peytralAt = (rig, o, c) => peytralAt(rig, quadShape(o), c);
function peytral(E, rig, P, o, c) {
  o = quadShape(o); if (!c) return; E.part();
  const m = o.m, face = m[c.face || 'plate'] || m.limb, rim = m[c.rim || 'rim'] || face, pc = peytralAt(rig, o, c), cx = R(pc[0]), cy = R(pc[1]), sh = c.shape || 'round';
  const r = c.r || 4, w = c.w || 7, h = c.h || 9;
  if (c.flat) {                                                  // 倒在地上：侧面看是扁的一条，盾心朝上
    const hw = sh === 'round' ? r : Math.round(w / 2);
    for (let x = cx - hw; x <= cx + hw; x++) { dot(E, x, 0, rim, 0); if (Math.abs(x - cx) < hw) dot(E, x, -1, Math.abs(x - cx) < hw - 1 ? face : rim, 0); }
    if (c.boss || c.gem) { dot(E, cx, -2, m.boss || rim, 0); if (c.gem) dot(E, cx, -1, m.gem || rim, P.gem === 4 ? 2 : 3); }
    return;
  }
  const inside = sh === 'round' ? (x, y) => Math.hypot(x - cx, y - cy) <= r + 0.35
    : (x, y) => { const j = y - (cy - (h - 1) / 2), t = j / (h - 1); if (t < -0.01 || t > 1.01) return false; const hw = t < 0.5 ? w / 2 : (w / 2) * (1 - Math.pow((t - 0.5) / 0.5, 1.4)) + 0.3; return Math.abs(x - cx) <= hw - 0.2; };
  const ext = Math.max(r, w, h) + 2;
  if (c.strap) { const st = m[c.strapMat || 'strap'] || rim, wx = rig.C1.x - rig.C1.r * 0.6, s = span(rig, o, R(wx)), ty = sh === 'round' ? cy - r : cy - (h - 1) / 2; if (s) seg(E, cx - 1, ty, wx, s[0], 1, st, 0); }
  for (let y = cy - ext; y <= cy + ext; y++) for (let x = cx - ext; x <= cx + ext; x++) {
    if (!inside(x, y)) continue;
    const edge = !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1);
    dot(E, x, y, edge ? rim : face, 0);
  }
  if (c.emblem) emblem(E, cx, cy + (sh === 'heater' ? -1 : 0), m[c.emb || 'trim'] || rim, c.emblem);
  if (c.boss) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) dot(E, cx + i, cy + j, m.boss || rim, i < 0 || j < 0 ? 4 : 2); }
  if (c.gem) gem(E, cx, cy, P.gem, m, 0);
}
Q.peytral = peytral;

// 笼头：c = { mat 'strap'（皮带）, ring 'rim'（衔环）, nose 2.2（鼻带离吻尖几格）}
function bridle(E, rig, P, o, c) {
  o = quadShape(o); if (!c || rig.lie === 2) return; E.part();
  const m = o.m, F = headFrame(rig, o), st = m[c.mat || 'strap'] || m.ink, rg = m[c.ring || 'rim'] || st, un = F.uT - (c.nose == null ? 2.2 : c.nose);
  for (let v = F.top(un) - 0.2; v <= F.bot(un) + 0.2; v += 0.5) { const p = F.at(un, v); dot(E, p[0], p[1], st, 0); }                     // 鼻带
  const a = F.at(-F.W * 0.45, -F.Hh * 0.55), b = F.at(un - 0.6, F.vc + 0.6); seg(E, a[0], a[1], b[0], b[1], 1, st, 0);                  // 颊带
  const e = F.at(-F.W * 0.1, F.top(-F.W * 0.1) + 0.6); dot(E, e[0], e[1], st, 0);                                                       // 额带
  dot(E, b[0], b[1], rg, 4);                                                                                                              // 衔环
}
Q.bridle = bridle;

// 面甲：c = { from -0.4（护额从 u = from × W 开始）, nose 1.5（离吻尖留几格）, thick 1.5（厚）, mat 'plate', trim 'trim'（下沿镶边；null 不镶）,
//   gem 0 | 1（额心宝石 1 格，档位读 P.gem）, plume 0（顶饰羽长；'plume' 材质，羽尖 'plumeTip'）, strands 3（羽数）, spike 0（额前独角刺长，'horn' 材质）}
// 顶饰羽随 P.mane 摆，是单独的部件（和面甲之间有分界线）
function chamfron(E, rig, P, o, c) {
  o = quadShape(o); if (!c) return; E.part();
  const m = o.m, F = headFrame(rig, o), mat = m[c.mat || 'plate'] || m.limb, trim = c.trim === null ? 0 : (m[c.trim || 'trim'] || 0);
  const ua = (c.from == null ? -0.4 : c.from) * F.W, ub = F.uT - (c.nose == null ? 1.5 : c.nose), th = c.thick == null ? 1.5 : c.thick, ex = rig.eye[0], ey = rig.eye[1];
  scanHead(F, F.uT + 3, (x, y, u, v) => {
    if (u < ua - 0.5 || u > ub + 0.5) return; const tp = F.top(u); if (v < tp - 0.45 || v > tp + th + 0.45) return;
    if (Math.abs(x - ex) + Math.abs(y - ey) <= 1) return;                          // 眼孔
    dot(E, x, y, trim && (v > tp + th - 0.5 || u > ub - 0.5) ? trim : mat, 0);
  });
  if (c.gem) { const g = F.at(F.W * 0.1, F.top(F.W * 0.1) + 0.7); gem(E, g[0], g[1], P.gem, m, 1); }
  if (c.spike) { const b = F.at(F.W * 0.35, F.top(F.W * 0.35)), d = F.at(F.W * 0.35 + c.spike * 0.8, F.top(F.W * 0.35) - c.spike * 0.8); seg(E, b[0], b[1], d[0], d[1], 1, m.horn || trim || mat, 0); dot(E, d[0], d[1], m.horn || trim || mat, 4); }
  if (c.plume) {
    E.part();
    const pm = m[c.plumeMat || 'plume'] || m.mane || mat, tip = m.plumeTip || pm, b = F.at(ua + 0.8, F.top(ua + 0.8) - 0.2), n = c.strands || 3, sw = P.mane | 0;
    dot(E, b[0], b[1], trim || mat, 4); dot(E, b[0], b[1] - 1, trim || mat, 3);                                                  // 羽座
    for (let s = 0; s < n; s++) {                                                                                               // 侧躺时羽毛顺着地面往后倒
      const th2 = rig.lie === 2 ? -1.3 - s * 0.14 : -0.25 - s * 0.38 - sw * 0.18, L = c.plume - s * 0.8, x1 = b[0] + Math.sin(th2) * L, y1 = b[1] - 1 - Math.cos(th2) * L;
      taper(E, b[0], b[1] - 1, x1, y1, 0.9, 0.5, pm, 0); dot(E, x1, y1, tip, 4);
      const x2 = x1 + Math.sin(th2 - 0.8), y2 = y1 - Math.cos(th2 - 0.8) + 1; dot(E, x2, y2, tip, 3);                                // 羽尖往后弯
    }
  }
}
Q.chamfron = chamfron;

// 带毛脚的腿：c = { len 2（毛高）, mat 'mane'（远侧自动用 maneFar）}。quad.leg 开头自己调 part()，毛紧跟着画、不再调 part()，所以和腿是同一个部件（没有分界线）；侧躺不画毛
function legFeather(E, rig, P, o, i, c) {
  o = quadShape(o); quadLeg(E, rig, P, o, i); if (rig.lie === 2) return;
  const L = rig.legs[i], m = o.m, key = (c && c.mat) || 'mane', mat = L.far ? (m[key + 'Far'] || m.far) : (m[key] || m.limb), fx = R(L.F[0]), fy = R(L.F[1]), lw = o.lw, h = (c && c.len) || 2;
  for (let k = 0; k < h; k++) { const y = fy - 1 - k, x0 = fx - 2 + (k ? 1 : 0), x1 = fx + lw - (k ? 1 : 0); for (let x = x0; x <= x1; x++) dot(E, x, y, mat, k === 0 && ((x + 40) & 1) ? 2 : 0); }
}
function legsFeather(E, rig, P, o, far, c) { for (let i = 0; i < 4; i++) if (!!rig.legs[i].far === !!far) legFeather(E, rig, P, o, i, c); }
Q.legFeather = legFeather; Q.legsFeather = legsFeather;

// 蓬鬃 / 飘鬃（quad.mane 'crest' 就是它，马的默认鬃；画在躯干后、头前）：沿颈上沿一排渐细的鬃束，立起并往后扫，尖端随 P.mane 摆（+ 往后、- 往前）。
//   c = { len 4（鬃束长）, lean 0.5（0 = 垂直颈线立起，1 = 完全往后扫成飘鬃）, shag 1.5（长短参差）, withers 1（鬃一直长到鬐甲后的格数）,
//         step 1.2（鬃束间距）, mat 'mane'（尖端亮色、隔一束一道暗纹）}
function maneCrest(E, rig, P, o, c) {
  o = quadShape(o); if (!c) return; E.part();
  const m = o.m, mat = m[c.mat || 'mane'] || m.limb, NB = rig.NB, NT = rig.NT, len = c.len == null ? 4 : c.len, lean = c.lean == null ? 0.5 : c.lean, shag = c.shag == null ? 1.5 : c.shag;
  const dx = NT.x - NB.x, dy = NT.y - NB.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = uy, ny = -ux;          // 颈方向、颈上沿法线（朝上后方）
  const w0 = (c.withers == null ? 1 : c.withers), step = c.step || 1.2, lying = rig.lie === 2, sw = (P.mane | 0) * 0.9;
  let i = 0;
  for (let s = -w0; s <= L + 0.01; s += step, i++) {
    const q = cl(s / L, 0, 1), rad = o.neckW * lerp(1, 0.8, q) - 0.3, bx = NB.x + ux * s + nx * rad, by = NB.y + uy * s + ny * rad;
    const l = (len * (0.75 + 0.35 * Math.sin(PI * cl(q, 0, 1))) - (s < 0 ? 1 : 0)) * (1 - 0.35 * (i % 3 === 1 ? 1 : 0) * shag / 1.5) + (hash(i, 7) - 0.5) * shag;
    let ddx = lerp(nx, -1, lean), ddy = lerp(ny, -0.35, lean); const dl = Math.hypot(ddx, ddy) || 1; ddx /= dl; ddy /= dl;
    if (lying) { ddx = -0.9; ddy = -0.2; }
    const tx = bx + ddx * l - sw * 0.6 * (l / len), ty = Math.min(-0.5, by + ddy * l + Math.abs(sw) * 0.3);
    taper(E, bx, by, tx, ty, 1.1, 0.5, mat, i & 1 ? 2 : 0); dot(E, tx, ty, mat, 4);
  }
}
// 额鬃：从两耳之间往前盖到额头，末端随 P.mane 摆；另在两耳之间竖起 1 格。c = { len 3, mat 'mane' }（画在头之后）
function forelock(E, rig, P, o, c) {
  o = quadShape(o); if (!c || rig.lie === 2) return; E.part();
  const m = o.m, mat = m[c.mat || 'mane'] || m.limb, F = headFrame(rig, o), n = c.len || 3, sw = P.mane | 0;
  for (let k = 0; k <= n; k++) { const u = -F.W * 0.5 + k * 0.75, p = F.at(u, F.top(u) - 0.3 + k * 0.4); dot(E, p[0] - (k === n ? sw : 0), p[1], mat, k === 0 ? 4 : k === n ? 2 : 0); if (k < n - 1) { const p2 = F.at(u, F.top(u) + 0.6 + k * 0.4); dot(E, p2[0], p2[1], mat, 0); } }
  const t = F.at(-F.W * 0.35, F.top(-F.W * 0.35) - 1.4); dot(E, t[0] - 1, t[1], mat, 4);
}
Q.maneCrest = maneCrest; Q.forelock = forelock;

// ═════════════════════════ 3. 飞行 fly：飞禽、蝙蝠（不落地，4 帧扑翼） ═════════════════════════
const FLY = {
  alt: 12, rx: 4.5, ry: 3, head: 'bird', hr: 2.5, beak: 3, beakH: 2, hook: 1, crest: null, earH: 3,   // 身体离地高、身体半径、头型 bird | bat、头半径、喙长 / 高、喙钩、冠 null | comb | tuft、蝠耳高
  tail: 'fan', tailLen: 5, wing: { span: 13, chord: 4, type: 'feather', fingers: 3 }, legLen: 3, talon: 1,   // 尾 fan | fork | none、翅膀、腿长、爪
};
function flyShape(o) { if (o && o.__fly) return o; const c = Object.assign({}, FLY, o); c.wing = Object.assign({}, FLY.wing, o && o.wing); c.__fly = 1; return c; }
// 姿势字段：gf 扑翼帧 -1..3 · wing 翼姿 0–6（gf ≥ 0 时由 FLAP 决定）· bob -2..2 · lift 0–15（lie 1 时 = 离地高度）· pitch 俯冲 + / 仰 -（-2..3）
//   head -1..2 · jaw 张喙 0–2 · eyes · tail -1..1 · legs 0 收 / 1 垂 / 2 前抓 · lie 0 飞 / 1 坠落中 / 2 落地 · glow 0–3
const FKEYS = [['gf', -1, 3], ['wing', 0, 6], ['bob', -2, 2], ['lift', 0, 31], ['pitch', -2, 3], ['head', -1, 2], ['jaw', 0, 2], ['eyes', 0, 1], ['tail', -1, 1], ['legs', 0, 2], ['lie', 0, 2], ['glow', 0, 3]];
function flyReset(P) { P.gf = -1; P.wing = 0; P.bob = 0; P.lift = 0; P.pitch = 0; P.head = 0; P.jaw = 0; P.eyes = 0; P.tail = 0; P.legs = 1; P.lie = 0; P.glow = 0; commonReset(P); }
function flyRig(P, o) {
  o = flyShape(o);
  const lie = P.lie | 0, pa = (P.pitch | 0) * 0.2, alt = lie === 2 ? 0 : lie === 1 ? (P.lift | 0) : o.alt + (P.lift | 0);
  const C = { x: 0, y: lie === 2 ? -o.ry * 0.8 + 0.2 : -(alt + o.ry) + (P.bob | 0), a: lie === 2 ? 0 : pa };
  const at = (u, v) => toW(C.x, C.y, C.a, u, v);
  const bat = o.head === 'bat', hdp = at(o.rx * (bat ? 0.75 : 0.85), -o.ry * (bat ? 0.35 : 0.75));
  const head = { x: hdp[0], y: hdp[1] + (P.head | 0) + (lie === 2 ? o.ry * 0.5 : 0), r: o.hr };
  if (lie === 2) head.y = Math.max(head.y, -o.hr + 0.5);
  const wr = at(o.rx * 0.1, -o.ry * 0.8), tr = at(-o.rx * 0.85, -o.ry * 0.1), lg = at(-0.5, o.ry * 0.8);
  return { o, lie, C, rx: o.rx, ry: lie === 2 ? o.ry * 0.8 : o.ry, head, wing: { x: wr[0], y: wr[1] }, tail: { x: tr[0], y: tr[1] }, legs: { x: lg[0], y: lg[1] },
    mouth: [head.x + o.hr + (bat ? 1 : o.beak), head.y + (bat ? 1 : 0.5)], eye: [R(head.x + o.hr * 0.35), R(head.y - o.hr * 0.25)], hit: [R(C.x), R(C.y)], top: C.y - o.ry - o.wing.span * 0.8 };
}
// 身体：斜卵形（随 pitch 转）；胸前浅色、背上羽鳞纹
function flyBody(E, rig, P, o) {
  o = flyShape(o); E.part();
  const m = o.m, C = rig.C, ca = Math.cos(C.a), sa = Math.sin(C.a), rx = rig.rx, ry = rig.ry;
  for (let y = Math.floor(C.y - rx - 1); y <= Math.min(0, Math.ceil(C.y + rx + 1)); y++) for (let x = Math.floor(C.x - rx - 1); x <= Math.ceil(C.x + rx + 1); x++) {
    const u = (x - C.x) * ca + (y - C.y) * sa, v = -(x - C.x) * sa + (y - C.y) * ca, q = (u / (rx + 0.35)) ** 2 + (v / (ry + 0.35)) ** 2; if (q > 1) continue;
    let mat = m.body, t = 0;
    if (m.belly && u > -rx * 0.2 && v > ry * 0.1) mat = m.belly;
    else if (o.head !== 'bat' && v < -ry * 0.1 && ((R(u) + R(v) * 2 + 40) % 4) === 0 && q < 0.7) t = 2;
    else if (o.head === 'bat' && ((R(u) * 3 + R(v) + 40) % 5) === 0 && q < 0.8) t = 2;
    dot(E, x, y, mat, t);
  }
}
// 头：bird = 圆头 + 眼 + 眉 + 喙（钩、张喙）+ 冠 / 羽簇；bat = 圆头 + 两只大尖耳 + 短吻 + 獠牙
function flyHead(E, rig, P, o) {
  o = flyShape(o); E.part();
  const m = o.m, h = rig.head, r = h.r, jaw = P.jaw | 0;
  oval(E, h.x, h.y, r, r * 0.9, m.head || m.limb, 0);
  if (o.head === 'bat') {
    for (const [dxo, far] of [[-3, 1], [0.5, 0]]) {                  // 两只大尖耳：底 3 格宽往上收尖、微后仰，近耳带内耳色
      const bx0 = h.x + dxo, by0 = h.y - r + 0.5, mat = far ? m.far : m.limb;
      for (let k = 0; k < o.earH; k++) { const w = k < o.earH - 2 ? 3 : k < o.earH - 1 ? 2 : 1, x0 = bx0 - 1 - R(k * 0.35); for (let i = 0; i < w; i++) dot(E, x0 + i, by0 - k, !far && i === 1 && k > 0 && k < o.earH - 1 ? (m.inner || mat) : mat, !far && i === 1 && k > 0 && k < o.earH - 1 && !m.inner ? 2 : 0); }
    }
    dot(E, h.x + r + 0.5, h.y + 0.5, m.limb, 0); dot(E, h.x + r + 0.5, h.y - 0.5, m.nose || m.limb, 3);
    if (jaw) { dot(E, h.x + r - 0.5, h.y + 1.5, m.ink, 0); dot(E, h.x + r + 0.5, h.y + 1.5, m.teeth, 3); dot(E, h.x + r - 0.5, h.y + 2.5, m.teeth, 3); }
  } else {
    const bm = m.beak || m.claw, bx0 = h.x + r * 0.7, by0 = h.y + 0.3;
    for (let k = 0; k <= o.beak; k++) { const hh = Math.max(1, R(o.beakH * (1 - k / (o.beak + 1)))); for (let j = 0; j < hh; j++) dot(E, bx0 + k, by0 - 1 + j, bm, k === 0 && j === 0 ? 4 : 0); }
    if (o.hook) dot(E, bx0 + o.beak, by0 + (o.beakH > 1 ? 1 : 0), bm, 2);
    if (jaw) { for (let k = 1; k <= o.beak - 1; k++) dot(E, bx0 + k, by0 + o.beakH - 1, m.ink, 0); for (let k = 0; k <= o.beak - 1; k++) dot(E, bx0 + k - 0.5, by0 + o.beakH - 1 + jaw, bm, 2); }
    if (o.crest === 'comb') { const cm = m.crest || m.glow; for (let k = 0; k < 3; k++) { dot(E, h.x - 1 + k, h.y - r - 0.5, cm, 0); if (k !== 1) dot(E, h.x - 1 + k, h.y - r - 1.5, cm, k === 0 ? 4 : 0); } dot(E, bx0, by0 + o.beakH, cm, 0); dot(E, bx0, by0 + o.beakH + 1, cm, 2); }
    else if (o.crest === 'tuft') { const cm = m.crest || m.limb; for (let k = 0; k < 4; k++) dot(E, h.x - 1 - k, h.y - r + 0.5 - (k >> 1) - (k === 3 ? 0 : 0), cm, k === 3 ? 4 : 0); }
  }
  if (P.eyes) { dot(E, rig.eye[0], rig.eye[1], m.limb, 1); dot(E, rig.eye[0] - 1, rig.eye[1], m.limb, 1); }
  else { dot(E, rig.eye[0], rig.eye[1], (P.glow | 0) >= 2 ? (m.glow || m.eye) : m.eye, 3); dot(E, rig.eye[0] - 1, rig.eye[1] - 1, m.head || m.limb, 4); }
}
// 尾羽：fan = 3 片扇开（交错 1 格）、fork = 燕尾两根、none
function flyTail(E, rig, P, o) {
  o = flyShape(o); if (o.tail === 'none') return; E.part();
  const m = o.m, mat = m.feather || m.limb, t = rig.tail, sw = (P.tail | 0) * 0.2 + rig.C.a;
  const A = o.tail === 'fork' ? [0.35, -0.35] : [0.2, -0.15, -0.5], L = o.tailLen;
  for (let k = 0; k < A.length; k++) { const a = A[k] + sw, len = o.tail === 'fork' ? L + 1 : L - k, ex = t.x - Math.cos(a) * len, ey = t.y - Math.sin(a) * len; seg(E, t.x, t.y, ex, ey, o.tail === 'fork' ? 1 : 2, mat, k === 0 ? 4 : 0); dot(E, ex - Math.cos(a), ey - Math.sin(a), mat, 2); }
}
// 腿 + 爪：legs 0 收在腹下 / 1 下垂 / 2 往前抓（爪张开）
function flyLegs(E, rig, P, o) {
  o = flyShape(o); E.part();
  const m = o.m, lm = m.leg || m.claw, l = rig.legs, mode = rig.lie === 2 ? 0 : P.legs | 0, L = o.legLen;
  for (const [dxo, far] of [[1.5, 1], [0, 0]]) {
    const x0 = l.x + dxo, y0 = l.y, fx = x0 + (mode === 2 ? 3 : mode === 1 ? -1 : -2), fy = y0 + (mode === 0 ? 1 : L), mat = far ? (m.clawFar || lm) : lm;
    seg(E, x0, y0, fx, fy, 1, mat, 0);
    if (o.talon) { dot(E, fx + 1, fy + (mode === 2 ? -1 : 0), mat, 3); dot(E, fx + (mode === 2 ? 2 : 1), fy + 1, mat, 2); if (mode === 2) dot(E, fx - 1, fy + 1, mat, 2); }
  }
}
// 全身：远翼 → 尾 → 腿 → 身体 → 近翼 → 头（头在翼根前面，扑翼时不被挡住）
function flyDraw(E, rig, P, o) {
  o = flyShape(o); const wp = P.gf >= 0 && !rig.lie ? B.FLAP[P.gf] : P.wing;
  wing(E, rig.wing.x + 2.5, rig.wing.y - 1.5, wp, o.wing, o.m, 1);
  flyTail(E, rig, P, o); flyLegs(E, rig, P, o); flyBody(E, rig, P, o);
  wing(E, rig.wing.x, rig.wing.y, wp, o.wing, o.m, 0); flyHead(E, rig, P, o);
}
const flyAnim = {
  idle(P, tq, f12, dur) { const f = Math.floor(f12 / 2 + 1e-6) & 3; P.gf = f; P.bob = B.FLAP_BOB[f]; P.tail = f === 3 ? 1 : 0; return tq % dur; },   // 悬停：一直小扑翼
  walk(P, tq) { const f = Math.floor(tq * 6 + 1e-6) & 3; P.gf = f; P.bob = B.FLAP_BOB[f] * 2; P.tail = f === 0 ? -1 : f === 2 ? 1 : 0; P.pitch = 1; P.legs = 0; return f; },
  hurt(P, h) { if (h < 0.2) { P.bx = -2; P.eyes = 1; P.wing = 1; P.gf = -1; P.pitch = -1; P.tail = 1; P.legs = 2; P.flash = h < 1 / 12 ? 1 : 0; } else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.wing = 4; P.gf = -1; } },
  // 死亡：受击 → 失去浮力翻滚下坠（翼姿乱扑）→ 落地弹一下 → 翼摊在地上 → 消散
  death(P, d, f12, alt, drop) {
    if (d < 0.3) { P.bx = -2; P.eyes = 1; P.gf = -1; P.wing = 1; P.pitch = -1; P.legs = 2; P.flash = d < 1 / 12 ? 1 : 0; }
    else if (d < 0.66) { const q = (d - 0.3) / 0.36; P.bx = -3; P.eyes = 1; P.gf = -1; P.lie = 1; P.lift = Math.max(0, R(alt * (1 - q * q))); P.wing = [1, 4, 6, 1, 4, 6, 6][Math.floor(q * 6)] || 6; P.pitch = 3; P.legs = 1; }
    else { P.bx = -3; P.eyes = 1; P.gf = -1; P.lie = d < 0.74 ? 1 : 2; P.lift = d < 0.74 ? 2 : 0; P.wing = 6; P.legs = 0; if (d >= 1.6) P.dq = cl((d - 1.6) / 0.8, 0, 1); }
    dropHook(P, d, f12, drop);
  },
};
B.fly = { DEFAULT: FLY, KEYS: FKEYS, shape: flyShape, reset: flyReset, rig: flyRig, body: flyBody, head: flyHead, tail: flyTail, legs: flyLegs, draw: flyDraw, anim: flyAnim };

// ═════════════════════════ 4. 多足 bug：蜘蛛、蟹、蝎、甲虫 ═════════════════════════
const BUG = {
  n: 4, rx: 4, ry: 3, under: 3, abd: { rx: 5.5, ry: 4.5, dx: -7, dy: -1.5 }, head: { rx: 2.5, ry: 2 },   // 每侧腿数、头胸半径、离地、腹 { rx, ry, dx, dy } | null、头 | null
  span: 11, knee: 4, farDx: 1, stride: 2, lift: 2, lw: 1, fan: 0, kneeOut: 0.45,                   // 脚展（前后脚离身体中心）、膝比背高、远侧腿偏移、半步幅、抬脚、腿粗、
                                                                                                    // fan 中间几条腿往外推（0 = 脚距均匀，1 = 中腿也伸到 ±0.55 脚展，剪影里每条腿都是一道拱）、kneeOut 膝在根→脚之间的位置
  claws: null, tail: null, eyes: 4, stalks: 0, fangs: 1, mark: null, hair: 1, legsFront: 1,        // 螯 { len, size } | null、尾 { n, seg, r } | null、眼数、眼柄高、螯肢、腹部花纹 null | hourglass | bands | spots、腿毛、近侧腿画在身体前（0 = 腿从壳下伸出：蟹、蝎）
};
function bugShape(o) { if (o && o.__bug) return o; const c = Object.assign({}, BUG, o); c.__bug = 1; return c; }
// 姿势字段：gf -1..3 · bob -1..1 · crouch 0–3 · pitch 前抬 0–3 · lift 0–15 · claw 螯张开 / 举起 0–3 · tail 尾姿 0 竖起 / 1 后拉 / 2–4 前刺
//   jaw 螯肢张 0–2 · glow 眼亮 0–3 · lie 0 站 / 1 腿软摊开 / 2 翻倒（腿蜷起）
const BKEYS = [['gf', -1, 3], ['bob', -1, 1], ['crouch', 0, 3], ['pitch', 0, 3], ['lift', 0, 15], ['claw', 0, 3], ['tail', 0, 4], ['jaw', 0, 2], ['glow', 0, 3], ['lie', 0, 2]];
function bugReset(P) { P.gf = -1; P.bob = 0; P.crouch = 0; P.pitch = 0; P.lift = 0; P.claw = 0; P.tail = 0; P.jaw = 0; P.glow = 0; P.lie = 0; commonReset(P); }
function bugRig(P, o) {
  o = bugShape(o);
  const lie = P.lie | 0, n = o.n, gf = lie ? -1 : (P.gf == null ? -1 : P.gf | 0), g = gaitOff(gf, o.stride, o.lift), pit = P.pitch | 0;
  const under = lie ? 0 : Math.max(0, o.under - (P.crouch | 0)), T = { x: 0, y: -(under + o.ry) - (P.lift | 0) + (P.bob | 0) - pit * 0.5, rx: o.rx, ry: o.ry };
  const A = o.abd ? { x: T.x + o.abd.dx, y: Math.min(-o.abd.ry, T.y + o.abd.dy + pit * 0.5), rx: o.abd.rx, ry: o.abd.ry } : null;
  const Hd = o.head ? { x: T.x + o.rx + o.head.rx * 0.4, y: T.y + 0.5 - pit * 0.5, rx: o.head.rx, ry: o.head.ry } : null;
  const top = T.y - o.ry, legs = [];
  for (const far of [1, 0]) for (let i = 0; i < n; i++) {
    const q = n === 1 ? 0.5 : i / (n - 1), fd = far ? o.farDx : 0, isA = far ? (i & 1) === 1 : (i & 1) === 0;
    const c = 0.95 - 1.9 * q, bx0 = T.x + o.rx * (0.5 - q) + fd, by0 = T.y + o.ry * 0.25 - far, spread = o.fan ? o.span * Math.sign(c) * 0.95 * Math.pow(Math.abs(c) / 0.95, 1 / (1 + o.fan)) : o.span * c;
    const dx = isA ? g[0] : g[2], up = isA ? g[1] : g[3];
    let fx = bx0 + spread + dx, fy = -up, kx = bx0 + spread * o.kneeOut + dx * 0.5, ky = top - o.knee - up * 0.5 - far + (P.crouch | 0) * 0.5;
    if (lie === 1) { fx = bx0 + spread * 1.25; fy = 0; kx = bx0 + spread * 0.6; ky = T.y - o.ry * 0.5; }
    if (lie === 2) { kx = bx0 + spread * 0.25; ky = top - o.knee * 0.6 - 1; fx = kx - spread * 0.2 + (far ? -1 : 1); fy = ky + 2; }
    legs.push({ far, i, B: [bx0, by0], K: [kx, ky], F: [fx, fy], up: up > 0 });
  }
  const front = Hd || T, cl0 = o.claws, claw = cl0 ? (() => {
    const bxx = T.x + o.rx * 0.8, byy = T.y + o.ry * 0.2, c = P.claw | 0, ex = bxx + cl0.len * 0.4, ey = byy - cl0.len * 0.35 - c * 0.7 + (lie ? 2 : 0), hx = ex + cl0.len * 0.55, hy = ey - 0.5 - c * 0.5 + (lie ? 2 : 0);
    return { B: [bxx, byy], E: [ex, ey], H: [hx, lie ? Math.min(hy, -cl0.size * 0.6) : hy] };
  })() : null;
  let tail = null;
  if (o.tail) {                         // 蝎尾：从腹末往上、往前卷；tail 姿 0 竖起 · 1 后拉蓄力 · 2–4 往前刺
    const tp = P.tail | 0, base = A ? [A.x - A.rx * 0.8, A.y - A.ry * 0.2] : [T.x - o.rx, T.y], pts = [base[0], base[1]];
    let a = lie === 2 ? 3.0 : [1.85, 2.1, 1.5, 1.2, 0.9][tp], c = lie === 2 ? 0.05 : [0.3, 0.24, 0.3, 0.3, 0.26][tp], x = base[0], y = base[1];
    for (let k = 0; k < o.tail.n; k++) { x += Math.cos(a) * o.tail.seg; y -= Math.sin(a) * o.tail.seg; if (y > -1) y = -1; pts.push(x, y); a -= c; }
    tail = { pts, a };
  }
  return { o, lie, gf, T, A, Hd, legs, claw, tail, top: Math.min(top - o.knee, tail ? Math.min(...tail.pts.filter((_, k) => k & 1)) : 0) - 1,
    mouth: [R(front.x + front.rx), R(front.y + 1)], eye: [R(front.x + front.rx * 0.4), R(front.y - front.ry * 0.7)], hit: [R(T.x + 1), R(T.y)] };
}
function bugLeg(E, rig, P, o, L) {
  E.part();
  const m = o.m, mat = L.far ? m.far : m.limb;
  seg(E, L.B[0], L.B[1], L.K[0], L.K[1], o.lw + (o.lw < 2 && !L.far ? 1 : 0), mat, 0);
  seg(E, L.K[0], L.K[1], L.F[0], L.F[1], o.lw, mat, 0);
  dot(E, L.K[0], L.K[1] - 1, mat, L.far ? 0 : 4);                                                  // 膝节高光
  if (o.hair && !L.far) { const hx = lerp(L.K[0], L.F[0], 0.4), hy = lerp(L.K[1], L.F[1], 0.4); dot(E, hx + (L.F[0] > L.K[0] ? 1 : -1), hy, mat, 2); }   // 腿毛
  dot(E, L.F[0], L.F[1], m.claw || mat, 1);                                                         // 足尖
}
function bugLegs(E, rig, P, o, far) { o = bugShape(o); for (const L of rig.legs) if (!!L.far === !!far) bugLeg(E, rig, P, o, L); }
// 身体：腹（花纹）→ 头胸 → 头（眼群 / 眼柄、螯肢）
function bugBody(E, rig, P, o) {
  o = bugShape(o); const m = o.m, T = rig.T, A = rig.A, Hd = rig.Hd;
  if (A) {
    E.part(); oval(E, A.x, A.y, A.rx, A.ry, m.body, 0);
    const mk = m.mark || m.glow;
    if (o.mark === 'hourglass') { const cx = R(A.x - A.rx * 0.1), cy = R(A.y - A.ry * 0.25); dot(E, cx - 1, cy - 1, mk, 3); dot(E, cx, cy - 1, mk, 3); dot(E, cx, cy, mk, 3); dot(E, cx - 1, cy + 1, mk, 3); dot(E, cx, cy + 1, mk, 3); }
    else if (o.mark === 'bands') for (let k = 1; k <= 3; k++) { const x = R(A.x + A.rx - k * A.rx * 0.5); for (let y = R(A.y - A.ry) + 1; y < R(A.y + A.ry); y++) dot(E, x, y, m.body, 1); }
    else if (o.mark === 'spots') for (const [u, v] of [[-0.4, -0.5], [0.2, -0.6], [-0.1, 0]]) dot(E, A.x + u * A.rx, A.y + v * A.ry, mk, 3);
  }
  E.part(); oval(E, T.x, T.y, T.rx, T.ry, A ? m.limb : m.body, 0);
  if (!A) for (let k = -1; k <= 1; k++) dot(E, T.x + k * T.rx * 0.5, T.y - T.ry * 0.3, m.body, 2);                 // 蟹壳纹
  if (Hd) { E.part(); oval(E, Hd.x, Hd.y, Hd.rx, Hd.ry, m.limb, 0); }
  const F = Hd || T, gl = (P.glow | 0) >= 2 ? (m.glow || m.eye) : m.eye;
  if (o.stalks) for (const [dxo, far] of [[-1.5, 1], [0.5, 0]]) { const x = F.x + F.rx * 0.5 + dxo, y0 = F.y - F.ry; seg(E, x, y0, x, y0 - o.stalks, 1, far ? m.far : m.limb, 0); dot(E, x, y0 - o.stalks - 1, gl, 3); dot(E, x + 1, y0 - o.stalks - 1, gl, far ? 2 : 3); }
  else { const EY = [[0, 0], [-1, 0], [0, -1], [-1, -1], [-2, 0], [1, -1]]; for (let k = 0; k < o.eyes; k++) dot(E, rig.eye[0] + EY[k][0], rig.eye[1] + EY[k][1], gl, k === 0 ? 3 : 2); }
  if (o.fangs) { const j = P.jaw | 0, x = R(F.x + F.rx - 0.5), y = R(F.y + F.ry * 0.5); for (const s of [0, 1]) { dot(E, x + s * (1 + j), y + 1, m.claw, 3); dot(E, x + s * (1 + j) + (s ? 0 : -0), y + 2, m.claw, 1); } }
}
// 螯：臂 → 钳掌 → 上下两指（claw 张开）
function bugClaw(E, rig, P, o, far) {
  o = bugShape(o); const c = rig.claw; if (!c) return; E.part();
  const m = o.m, mat = far ? (m.shellFar || m.far) : (m.shell || m.limb), sz = o.claws.size, op = (P.claw | 0) * 0.8, dxo = far ? 1.5 : 0, dyo = far ? -1 : 0;
  const B0 = [c.B[0] + dxo, c.B[1] + dyo], E0 = [c.E[0] + dxo, c.E[1] + dyo], H0 = [c.H[0] + dxo, c.H[1] + dyo];
  seg(E, B0[0], B0[1], E0[0], E0[1], 2, mat, 0); seg(E, E0[0], E0[1], H0[0], H0[1], 2, mat, 0);
  oval(E, H0[0], H0[1], sz * 0.75, sz * 0.55, mat, 0);
  const tx = H0[0] + sz * 0.6;
  for (let k = 0; k <= sz; k++) { dot(E, tx + k, H0[1] - 1 - op * (k / sz), mat, k === sz ? 4 : 0); dot(E, tx + k, H0[1] - (k < sz - 1 ? 0 : 1) - op * (k / sz), mat, 0); }   // 上指（动指）
  for (let k = 0; k < sz; k++) dot(E, tx + k, H0[1] + 1, mat, k === sz - 1 ? 2 : 0);                                                                          // 下指
}
// 蝎尾：节节变细 + 毒囊 + 钩刺（glow ≥ 1 时毒囊发光）
function bugTail(E, rig, P, o) {
  o = bugShape(o); const t = rig.tail; if (!t) return; E.part();
  const m = o.m, p = t.pts, n = p.length / 2 - 1, r0 = o.tail.r || 1.5;
  for (let k = 0; k < n; k++) { const r = lerp(r0, r0 * 0.6, k / n); taper(E, p[2 * k], p[2 * k + 1], p[2 * k + 2], p[2 * k + 3], r, r, m.limb, 0); dot(E, p[2 * k + 2], p[2 * k + 3], m.limb, 1); }
  const ex = p[2 * n], ey = p[2 * n + 1], a = t.a, gl = (P.glow | 0) >= 1 ? (m.glow || m.mark || m.limb) : (m.mark || m.limb);
  disc(E, ex + Math.cos(a) * 1.5, ey - Math.sin(a) * 1.5, 1, gl, 3);
  dot(E, ex + Math.cos(a) * 3, ey - Math.sin(a) * 3 + 1, m.claw, 4); dot(E, ex + Math.cos(a) * 3.5, ey - Math.sin(a) * 3.5 + 2, m.claw, 3);
}
// 全身：远螯 → 远侧腿 →（legsFront 0：近侧腿）→ 身体 → 蝎尾 →（legsFront 1：近侧腿）→ 近螯
function bugDraw(E, rig, P, o) {
  o = bugShape(o); bugClaw(E, rig, P, o, 1); bugLegs(E, rig, P, o, 1); if (!o.legsFront) bugLegs(E, rig, P, o, 0);
  bugBody(E, rig, P, o); bugTail(E, rig, P, o); if (o.legsFront) bugLegs(E, rig, P, o, 0); bugClaw(E, rig, P, o, 0);
}
const bugAnim = {
  idle(P, tq, f12, dur) { const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.glow = ((b >> 1) & 1) ? 1 : 0; return tq % dur; },
  walk(P, tq) { const f = Math.floor(tq * 6 + 1e-6) & 3; P.gf = f; P.bob = f & 1 ? 0 : 1; return f; },
  hurt(P, h) { if (h < 0.2) { P.bx = -2; P.crouch = 1; P.pitch = 1; P.claw = 2; P.tail = 1; P.jaw = 2; P.flash = h < 1 / 12 ? 1 : 0; } else if (h < 0.35) { P.bx = -1; P.crouch = 1; P.claw = 1; } },
  // 死亡：受击 → 腿软摊开 → 翻倒、腿蜷起（离地 3 → 1 → 0）→ 消散
  death(P, d, f12, drop) {
    if (d < 0.3) { P.bx = -2; P.crouch = 2; P.pitch = 2; P.claw = 3; P.jaw = 2; P.flash = d < 1 / 12 ? 1 : 0; }
    else if (d < 0.5) { P.bx = -3; P.lie = 1; P.claw = 1; }
    else { P.bx = -3; P.lie = 2; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; if (d >= 1.6) P.dq = cl((d - 1.6) / 0.8, 0, 1); }
    dropHook(P, d, f12, drop);
  },
};
B.bug = { DEFAULT: BUG, KEYS: BKEYS, shape: bugShape, reset: bugReset, rig: bugRig, body: bugBody, leg: bugLeg, legs: bugLegs, claw: bugClaw, tail: bugTail, draw: bugDraw, anim: bugAnim };

// ═════════════════════════ 5. 软体 / 漂浮 blob：漂浮眼、幽魂、史莱姆、章鱼、蜗牛 ═════════════════════════
const BLOB = {
  r: 7, alt: 0, shape: 'orb',                                       // 半径、悬浮高度（0 = 贴地）、形 orb 球 | dome 贴地圆顶 | slug 蛞蝓 / 蜗牛
  eye: { n: 1, r: 4 }, tent: { n: 5, len: 8 }, wisp: 0, shell: 0,   // 眼 { n: 1 | 2, r } | null、触须 { n, len } | null、幽魂尾长、螺壳半径
  mouth: null, spikes: 0, drip: 0, stalk: 0,                        // 嘴 null | teeth | smile、顶刺数、底边滴液、眼柄高（蜗牛）
};
function blobShape(o) { if (o && o.__blob) return o; const c = Object.assign({}, BLOB, o); c.__blob = 1; return c; }
// 姿势字段：gf -1..3 · bob -2..2 · sq 压扁 + / 拉高 -（-2..2）· lift 0–15（lie 1 时 = 离地高）· ix / iy 看的方向 -3..3 · lid 眼睑 0–4 · pup 瞳孔 0 细 / 1 圆 / 2 放大
//   jaw 张嘴 0–2 · tph 触须相位 0–7 · tmode 触须形态 0 垂 / 1 后拖 / 2 卷 / 3 前伸 / 4 摊地 / 5 张开 · lie 0 / 1 下坠 / 2 摊成一滩 · glow 0–3
const LKEYS = [['gf', -1, 3], ['bob', -2, 2], ['sq', -2, 2], ['lift', 0, 31], ['ix', -3, 3], ['iy', -3, 3], ['lid', 0, 4], ['pup', 0, 2], ['jaw', 0, 2], ['tph', 0, 7], ['tmode', 0, 5], ['lie', 0, 2], ['glow', 0, 3]];
function blobReset(P) { P.gf = -1; P.bob = 0; P.sq = 0; P.lift = 0; P.ix = 1; P.iy = 0; P.lid = 0; P.pup = 1; P.jaw = 0; P.tph = 0; P.tmode = 0; P.lie = 0; P.glow = 0; commonReset(P); }
function blobRig(P, o) {
  o = blobShape(o);
  const lie = P.lie | 0, sq = P.sq | 0, slug = o.shape === 'slug';
  let rx = o.r + sq, ry = o.r - sq, cy;
  if (lie === 2) { rx = o.r * 1.45; ry = Math.max(2, o.r * 0.4); cy = -ry + 0.5; }
  else if (slug) { rx = o.r * 1.5 + sq; ry = o.r * 0.5 - sq * 0.3; cy = -ry + 0.5; }
  else if (o.shape === 'dome') { cy = -ry * 0.8 + (P.bob | 0) - (P.lift | 0); if (lie === 1) { ry *= 0.7; rx *= 1.15; cy = -ry * 0.7; } }
  else { const alt = lie === 1 ? (P.lift | 0) : o.alt + (P.lift | 0); cy = -(alt + ry) + (P.bob | 0); }
  const C = { x: 0, y: cy, rx, ry };
  const head = slug ? { x: C.x + rx * 0.75, y: -o.r * 0.9, r: o.r * 0.45 } : null;
  const eyeC = slug ? [head.x + 0.5, head.y - head.r - o.stalk] : [C.x + rx * 0.22, C.y - ry * 0.12];
  const tents = [];
  if (o.tent && !slug) { const n = o.tent.n; for (let i = 0; i < n; i++) { const u = -0.8 + 1.6 * (i + 0.5) / n, x = C.x + u * rx, y = C.y + ry * Math.sqrt(Math.max(0, 1 - u * u)) - 1.5; tents.push({ x, y, i, cd: u < 0 ? -1 : 1, fwd: u > 0.25 ? 1 : 0 }); } }
  const shell = o.shell ? (lie === 2 ? { x: C.x - 1, y: -o.shell * 0.95 + 0.5, r: o.shell } : { x: C.x - rx * 0.25, y: C.y - ry - o.shell * 0.55, r: o.shell }) : null;
  return { o, lie, C, head, eye: eyeC, tents, shell,
    mouth: [R(C.x + rx * 0.6), R(C.y + ry * 0.35)], hit: [R(C.x + rx * 0.5), R(C.y)], top: C.y - ry - (o.shell ? o.shell * 1.6 : 0) - o.spikes * 1.5 - (slug ? o.stalk + 3 : 0) };
}
// 身体：椭圆 / 圆顶（底边贴地截平）/ 蛞蝓（长足 + 抬起的头）；左上一小块湿高光、底边滴液、顶刺
function blobBody(E, rig, P, o) {
  o = blobShape(o); E.part();
  const m = o.m, C = rig.C, slug = o.shape === 'slug' && rig.lie !== 2;
  oval(E, C.x, C.y, C.rx, C.ry, m.body, 0);
  if (slug) {                                                        // 足沿波纹（gf 让波峰前移）+ 抬起的头
    const ph = (P.gf | 0) + 4;
    for (let x = R(C.x - C.rx); x <= R(C.x + C.rx); x++) if (((x + 40 - ph) & 3) === 0) dot(E, x, 0, m.body, 2);
    oval(E, rig.head.x, rig.head.y, rig.head.r + 0.5, rig.head.r, m.body, 0);
  }
  if (rig.lie !== 2) { dot(E, C.x - C.rx * 0.5, C.y - C.ry * 0.55, m.spec, 3); dot(E, C.x - C.rx * 0.5 + 1, C.y - C.ry * 0.55, m.spec, 3); dot(E, C.x - C.rx * 0.5, C.y - C.ry * 0.55 + 1, m.spec, 3); }
  if (o.drip) for (let k = 0; k < o.drip; k++) { const x = C.x - C.rx * 0.7 + k * C.rx * 1.4 / Math.max(1, o.drip - 1), yb = C.y + C.ry * Math.sqrt(Math.max(0, 1 - ((x - C.x) / C.rx) ** 2)); dot(E, x, yb + 1, m.body, 2); if (k & 1) dot(E, x, yb + 2, m.body, 1); }
  for (let k = 0; k < o.spikes && rig.lie !== 2; k++) { const u = -0.5 + k / Math.max(1, o.spikes - 1), x = C.x + u * C.rx * 0.9, y = C.y - C.ry * Math.sqrt(Math.max(0, 1 - u * u * 0.81)); seg(E, x, y, x - 1, y - 2, 1, m.horn || m.limb, 0); dot(E, x - 1, y - 3, m.horn || m.limb, 4); }
}
// 眼：巩膜 + 虹膜（发光体）+ 瞳孔（pup）+ 湿高光 + 上眼睑（lid）；蜗牛为两根眼柄
function blobEye(E, rig, P, o) {
  o = blobShape(o); if (!o.eye || rig.lie === 2) return; E.part();
  const m = o.m, sc = m.sclera || m.teeth, ir = (P.glow | 0) >= 2 ? (m.glow || m.iris) : (m.iris || m.eye), lid = P.lid | 0;
  if (o.shape === 'slug') {
    const h = rig.head;
    for (const [dxo, far] of [[-1.5, 1], [0.5, 0]]) { const x = h.x + dxo, y0 = h.y - h.r; seg(E, x, y0, x + 1, y0 - o.stalk, 1, far ? m.far : m.limb, 0); dot(E, x + 1, y0 - o.stalk - 1, ir, 3); dot(E, x + 2, y0 - o.stalk - 1, m.ink, 0); }
    return;
  }
  const n = o.eye.n, r = o.eye.r;
  for (let k = 0; k < n; k++) {
    const ex = rig.eye[0] + (n === 2 ? (k ? 1.5 : -r * 1.3) : 0), ey = rig.eye[1] + (n === 2 && !k ? 0.5 : 0), rr = n === 2 ? r * 0.7 : r;
    oval(E, ex, ey, rr + 0.5, rr, sc, 0);
    const ix = ex + (P.ix | 0) * rr / 4, iy = ey + (P.iy | 0) * rr / 4, ri = rr * 0.6;
    for (let y = Math.floor(iy - ri); y <= Math.ceil(iy + ri); y++) for (let x = Math.floor(ix - ri); x <= Math.ceil(ix + ri); x++) {
      const d = Math.hypot(x - ix, y - iy), du = (x - ex) / (rr + 0.5), dv = (y - ey) / rr; if (d > ri + 0.3 || du * du + dv * dv > 1) continue;
      const p = P.pup | 0, pupil = p === 0 ? Math.abs(x - ix) < 0.6 && Math.abs(y - iy) < ri * 0.8 : d < (p === 2 ? ri * 0.75 : ri * 0.4);
      dot(E, x, y, pupil ? m.ink : ir, pupil ? 1 : d > ri * 0.7 ? 2 : 3);
    }
    dot(E, ix - ri * 0.5, iy - ri * 0.5, m.spec, 3);
    if (lid) for (let y = Math.floor(ey - rr - 1); y <= ey - rr - 1 + lid * rr * 0.55; y++) for (let x = Math.floor(ex - rr - 1); x <= Math.ceil(ex + rr + 1); x++) { const du = (x - ex) / (rr + 1.2), dv = (y - ey) / (rr + 0.8); if (du * du + dv * dv <= 1) dot(E, x, y, m.limb, lid >= 4 && y >= ey + rr * 0.1 ? 1 : 0); }
  }
}
// 嘴：teeth = 墨色弧 + 交错的白牙（jaw 张大）；smile = 一道墨线
function blobMouth(E, rig, P, o) {
  o = blobShape(o); if (!o.mouth || rig.lie === 2) return; E.part();
  const m = o.m, mx = rig.mouth[0], my = rig.mouth[1], j = P.jaw | 0, w = R(rig.C.rx * 0.45);
  for (let k = -w; k <= w; k++) { const y = my + R(Math.abs(k) * 0.35 * (o.mouth === 'smile' ? -1 : 0)); for (let jj = 0; jj <= j; jj++) dot(E, mx + k, y + jj, (P.glow | 0) >= 1 ? (m.glow || m.ink) : m.ink, 0); if (o.mouth === 'teeth' && ((k + 40) & 1)) { dot(E, mx + k, y - 1, m.teeth, 3); dot(E, mx + k, y + j + 1, m.teeth, 2); } }
}
// 螺壳：圆 + 螺旋线（tone 1）+ 左上高光
function blobShell(E, rig, P, o) {
  o = blobShape(o); const s = rig.shell; if (!s) return; E.part();
  const m = o.m, mat = m.shell || m.limb; oval(E, s.x, s.y, s.r, s.r * 0.95, mat, 0);   // 死亡（lie 2）时只剩空壳落在地上
  for (let k = 0; k < 26; k++) { const a = k * 0.42, rr = s.r * (1 - k / 30); if (rr < 1) break; dot(E, s.x + Math.cos(a) * rr * 0.8, s.y + Math.sin(a) * rr * 0.75, mat, k < 4 ? 2 : 1); }
  dot(E, s.x - s.r * 0.55, s.y - s.r * 0.55, mat, 4);
}
// 触须：从根部一格一格长（角度 = 与竖直向下的夹角），末端卷曲；tmode 决定形态；碰地面就横铺
function blobTent(E, rig, P, o, t) {
  const m = o.m, L = o.tent.len, md = rig.lie === 2 ? 4 : P.tmode | 0, ph = (P.tph | 0) * PI / 4 + t.i * 1.3;
  let x = t.x, y = t.y, th = 0, amp = 0.16, bend = 0, curl = 0.35, len = L;
  if (md === 1) { bend = -0.06; th = -0.2; amp = 0.1; } else if (md === 2) { curl = 1.0; len = L - 3; }
  else if (md === 3) { th = t.fwd ? 0.9 : 0.2 * t.cd; bend = t.fwd ? 0.04 : 0; amp = 0.05; len = L + (t.fwd ? 2 : 0); curl = t.fwd ? -0.3 : 0.4; }
  else if (md === 4) { th = t.cd * 1.2; curl = 0.3; amp = 0.03; } else if (md === 5) { th = t.cd * 0.6 + 0.15; bend = t.cd * 0.03; curl = 0.6; }
  if (o.shape === 'dome' && md !== 3) { th = t.cd * 0.9; }
  for (let k = 0; k <= len; k++) {
    const thick = k < len * 0.45, X = R(x), Y = R(y);
    dot(E, X, Y, m.limb, thick && k % 3 === 2 ? 4 : 0); if (thick) { if (Math.abs(Math.sin(th)) > 0.7) dot(E, X, Y + 1, m.limb, 0); else dot(E, X + 1, Y, m.limb, 0); }
    th += bend + amp * Math.sin(ph - k * 0.5) + (k > len - 4 ? t.cd * curl * 0.5 : 0);
    x += Math.sin(th); y += Math.cos(th); if (y > 0) { y = 0; th = th >= 0 ? 1.5 : -1.5; }
  }
}
function blobTents(E, rig, P, o, front) { o = blobShape(o); for (const t of rig.tents) if ((t.i & 1) === (front ? 1 : 0)) { E.part(); blobTent(E, rig, P, o, t); } }
// 幽魂尾：从身体下沿往下、往后飘的渐细尾巴（tph 波动）
function blobWisp(E, rig, P, o) {
  o = blobShape(o); if (!o.wisp || rig.lie === 2) return; E.part();
  const m = o.m, C = rig.C, n = o.wisp, ph = (P.tph | 0) * PI / 4;
  for (let k = 0; k <= n; k++) { const q = k / n, x = C.x - k * 0.55 + Math.sin(ph + k * 0.7) * 1.2 * q, y = C.y + C.ry * 0.5 + k * 0.9, r = lerp(C.rx * 0.75, 0.5, q); disc(E, x, y, r, m.limb, q > 0.7 ? 2 : 0); }
}
// 全身：背侧触须 → 幽魂尾 → 身体 → 螺壳 → 眼 → 嘴 → 前侧触须
function blobDraw(E, rig, P, o) { o = blobShape(o); blobTents(E, rig, P, o, 0); blobWisp(E, rig, P, o); blobBody(E, rig, P, o); blobShell(E, rig, P, o); blobEye(E, rig, P, o); blobMouth(E, rig, P, o); blobTents(E, rig, P, o, 1); }
const blobAnim = {
  idle(P, tq, f12, dur) { const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1 ? -1 : 0; P.tph = Math.floor(TT * 10 / 3 + 1e-6) & 7; P.sq = b & 1 ? -1 : 0; return tq % dur; },
  walk(P, tq, ground) { const f = Math.floor(tq * 6 + 1e-6) & 3; P.gf = f; P.tph = f * 2; P.tmode = 1; if (ground) { P.sq = [1, 0, -1, 0][f]; P.bob = 0; } else P.bob = [0, -1, -2, -1][f]; return f; },
  hurt(P, h) { if (h < 0.2) { P.bx = -2; P.lid = 3; P.ix = -1; P.pup = 0; P.sq = 1; P.tmode = 3; P.flash = h < 1 / 12 ? 1 : 0; } else if (h < 0.35) { P.bx = -1; P.lid = 2; P.sq = 1; } },
  // 死亡：受击 → 抽搐 → 失去浮力坠地（压扁回弹）→ 摊成一滩 → 消散
  death(P, d, f12, alt, drop) {
    if (d < 0.3) { P.bx = -2; P.lid = 3; P.pup = 0; P.flash = d < 1 / 12 ? 1 : 0; P.tmode = 2; P.tph = f12 & 7; P.sq = (f12 & 1) ? 1 : -1; }
    else if (d < 0.6) { const q = (d - 0.3) / 0.3; P.bx = -3; P.lie = 1; P.lift = Math.max(0, R(alt * (1 - q * q))); P.lid = 4; P.sq = -1; P.tmode = 1; }
    else if (d < 0.75) { P.bx = -3; P.lie = 1; P.lift = 0; P.lid = 4; P.sq = 2; P.tmode = 4; }
    else { P.bx = -3; P.lie = 2; P.lid = 4; P.tmode = 4; if (d >= 1.6) P.dq = cl((d - 1.6) / 0.8, 0, 1); }
    dropHook(P, d, f12, drop);
  },
};
B.blob = { DEFAULT: BLOB, KEYS: LKEYS, shape: blobShape, reset: blobReset, rig: blobRig, body: blobBody, eye: blobEye, mouth: blobMouth, shell: blobShell, tent: blobTent, tents: blobTents, wisp: blobWisp, draw: blobDraw, anim: blobAnim };

// ═════════════════════════ 6. 蛇 / 蠕虫 serpent：身体贴地拱起、前段竖起 ═════════════════════════
const SERP = {
  n: 24, r: 2.5, rTail: 0.6, arch: 2, waves: 1.5,              // 贴地身体长、身体半径、尾尖半径、拱起高、波数
  rise: 7, neck: 5, head: 'snake', hl: 6, hh: 3.5,            // 前段竖起高、颈前伸、头型 snake | worm、头长 / 高
  hood: 0, bands: 0, belly: 1, scales: 1, spikes: 0,           // 兜帽宽、环节间距（蠕虫）、浅色腹、背鳞纹、背刺
};
function serpShape(o) { if (o && o.__serp) return o; const c = Object.assign({}, SERP, o); c.__serp = 1; return c; }
// 姿势字段：gf 波相 -1..3 · bob -1..1 · rise 竖起高度增减 -8..6 · strike 头前刺 0–6 · jaw 0–3 · tongue 吐信 0–2 · eyes · hood 兜帽张开 0–2 · lie 0 / 1 瘫软 / 2 贴地摊直 · glow 0–3
const SKEYS = [['gf', -1, 3], ['bob', -1, 1], ['rise', -8, 6], ['strike', 0, 6], ['jaw', 0, 3], ['tongue', 0, 2], ['eyes', 0, 1], ['hood', 0, 2], ['lie', 0, 2], ['glow', 0, 3]];
function serpReset(P) { P.gf = -1; P.bob = 0; P.rise = 0; P.strike = 0; P.jaw = 0; P.tongue = 0; P.eyes = 0; P.hood = 0; P.lie = 0; P.glow = 0; commonReset(P); }
function serpRig(P, o) {
  o = serpShape(o);
  const lie = P.lie | 0, gf = lie ? 0 : (P.gf == null ? -1 : P.gf | 0), ph0 = gf < 0 ? 0 : gf * PI / 2, arch = lie ? 0 : o.arch;
  const x0 = -o.n * 0.62, x1 = o.n * 0.2, pts = [];                           // 贴地段：尾尖 → 颈根
  for (let x = x0; x <= x1 + 0.01; x += 1) { const s = (x - x0) / (x1 - x0), r = lerp(o.rTail, o.r, Math.sqrt(s)), hump = Math.max(0, Math.sin(2 * PI * o.waves * s - ph0)); pts.push(x, -r - hump * arch * (0.4 + 0.6 * s), r); }
  const rise = lie === 2 ? 0 : lie === 1 ? Math.max(0, (o.rise + (P.rise | 0)) * 0.3) : Math.max(0, o.rise + (P.rise | 0));
  const b0x = x1, b0y = -o.r, hx = x1 + o.neck + (P.strike | 0) * 1.5 + (lie === 2 ? 2 : 0), hy = -o.r - rise;
  const n = Math.max(3, R(Math.hypot(hx - b0x, hy - b0y) * 1.3));
  for (let k = 1; k <= n; k++) {                                                 // 颈：三次贝塞尔（先平后竖再朝前）
    const t = k / n, it = 1 - t, c1x = b0x + 3, c1y = b0y, c2x = hx - 2 - rise * 0.25, c2y = hy + Math.min(3, rise * 0.4);
    pts.push(it * it * it * b0x + 3 * it * it * t * c1x + 3 * it * t * t * c2x + t * t * t * hx, it * it * it * b0y + 3 * it * it * t * c1y + 3 * it * t * t * c2y + t * t * t * hy, o.r * (1 - 0.15 * t));
  }
  const ha = lie === 2 ? 0 : 0.08 - (P.strike | 0) * 0.03;
  const head = { x: hx + o.hl * 0.35, y: Math.min(hy, -o.hh * 0.5), a: ha };
  const mouth = toW(head.x, head.y, ha, o.hl * 0.55, 0.5), eye = toW(head.x, head.y, ha, o.hl * 0.1, -o.hh * 0.3);
  return { o, lie, gf, pts, head, mouth, eye, neckTop: [hx, hy], hit: [R(x1), R(-o.r - 2)], top: Math.min(hy - o.hh, -o.r - arch - 2) };
}
// 身体（一个部件）：沿脊点画圆；浅色腹（每个点最低的一格）、背鳞纹 / 环节、背刺
function serpBody(E, rig, P, o) {
  o = serpShape(o); E.part();
  const m = o.m, p = rig.pts, n = p.length / 3;
  for (let k = 0; k < n; k++) disc(E, p[3 * k], p[3 * k + 1], p[3 * k + 2], m.body, 0);
  for (let k = 0; k < n; k++) {
    const x = p[3 * k], y = p[3 * k + 1], r = p[3 * k + 2];
    if (o.belly && m.belly && r >= 1) dot(E, x, y + r, m.belly, 0);
    if (o.bands && (k % o.bands) === 0 && r >= 1) for (let j = -R(r); j < R(r); j++) dot(E, x, y + j, m.body, 1);
    else if (o.scales && r >= 1.5 && ((k + 40) % 3) === 0) dot(E, x, y - r + 1, m.mark || m.body, m.mark ? 3 : 2);
    if (o.spikes && (k % 3) === 1 && r >= 1.5) { dot(E, x, y - r - 1, m.horn || m.limb, 4); dot(E, x - 1, y - r - 1, m.horn || m.limb, 0); }
  }
}
// 兜帽（眼镜蛇）：颈上段两侧展开的扁椭圆，hood 张开；背面有花纹（画在头之前）
function serpHood(E, rig, P, o) {
  o = serpShape(o); if (!o.hood || rig.lie === 2) return; E.part();
  const m = o.m, hx = rig.neckTop[0] - 1, hy = rig.neckTop[1] + 2.5, w = o.hood + (P.hood | 0);
  oval(E, hx, hy, w * 0.55, w, m.body, 0); dot(E, hx, hy - 1, m.mark || m.body, m.mark ? 3 : 1); dot(E, hx, hy + 1, m.mark || m.body, m.mark ? 3 : 1);
}
// 头：snake = 楔形头 + 眼 + 张嘴 + 信子；worm = 圆口 + 一圈牙
function serpHead(E, rig, P, o) {
  o = serpShape(o); E.part();
  const m = o.m, H = rig.head, j = P.jaw | 0;
  if (o.head === 'worm') {
    const r = o.hh * 0.6 + 0.5; oval(E, H.x, H.y, r * 0.8, r, m.limb, 0);
    const mx = H.x + r * 0.5, mr = 1 + j * 0.6;
    for (let y = Math.floor(H.y - mr); y <= Math.ceil(H.y + mr); y++) for (let x = R(mx - 1); x <= R(mx + mr * 0.6 + 0.5); x++) if (((x - mx) / (mr * 0.6 + 0.6)) ** 2 + ((y - H.y) / (mr + 0.3)) ** 2 <= 1) dot(E, x, y, (P.glow | 0) >= 1 ? (m.glow || m.ink) : m.ink, 0);
    for (let k = 0; k < 6; k++) { const a = k / 6 * 2 * PI; dot(E, mx + 0.5 + Math.cos(a) * (mr * 0.6 + 1), H.y + Math.sin(a) * (mr + 1), m.teeth, 3); }
    return;
  }
  const ca = Math.cos(H.a), sa = Math.sin(H.a), L = o.hl, h = o.hh;
  for (let y = Math.floor(H.y - L); y <= Math.ceil(H.y + L); y++) for (let x = Math.floor(H.x - L); x <= Math.ceil(H.x + L); x++) {
    const u = (x - H.x) * ca + (y - H.y) * sa, v = -(x - H.x) * sa + (y - H.y) * ca;
    if (u < -L * 0.45 || u > L * 0.6) continue;
    const t = (u + L * 0.45) / (L * 1.05), top = -h * 0.5 * (1 - 0.35 * t * t), bot = h * 0.5 * (1 - 0.5 * t), g = j * 1.1 * Math.max(0, u + L * 0.1) / (L * 0.7), vm = h * 0.1;
    if (j && u > -L * 0.1 && v > vm && v < vm + g) { dot(E, x, y, m.ink, 0); continue; }
    if ((v >= top - 0.4 && v <= vm + 0.4) || (v >= vm + g - 0.4 && v <= bot + g + 0.4)) dot(E, x, y, m.limb, !j && Math.abs(v - vm - 0.5) < 0.5 && u > -L * 0.1 && u < L * 0.45 ? 1 : 0);
  }
  if (P.eyes) dot(E, rig.eye[0], rig.eye[1], m.limb, 1); else { dot(E, rig.eye[0], rig.eye[1], (P.glow | 0) >= 2 ? (m.glow || m.eye) : m.eye, 3); dot(E, rig.eye[0] - 1, rig.eye[1] - 1, m.limb, 4); }
  if (j) { const f = toW(H.x, H.y, H.a, L * 0.45, h * 0.1 + 1); dot(E, f[0], f[1], m.teeth, 3); }
  const tg = P.tongue | 0;
  if (tg) { const tm = m.tongue || m.glow; for (let k = 1; k <= tg + 1; k++) dot(E, rig.mouth[0] + k, rig.mouth[1] + j * 0.5, tm, 3); const tx = rig.mouth[0] + tg + 2, ty = rig.mouth[1] + j * 0.5; dot(E, tx, ty - 1, tm, 3); dot(E, tx, ty + 1, tm, 3); }
}
// 全身：身体 → 兜帽 → 头
function serpDraw(E, rig, P, o) { o = serpShape(o); serpBody(E, rig, P, o); serpHood(E, rig, P, o); serpHead(E, rig, P, o); }
const serpAnim = {
  idle(P, tq, f12, dur) { const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.rise = b & 1 ? -1 : 0; P.tongue = (Math.floor(TT * 6) % 9) < 2 ? 1 + (Math.floor(TT * 6) % 9) : 0; return tq % dur; },
  walk(P, tq) { const f = Math.floor(tq * 6 + 1e-6) & 3; P.gf = f; P.rise = [0, -1, -2, -1][f]; P.strike = f & 1; return f; },
  hurt(P, h) { if (h < 0.2) { P.bx = -2; P.eyes = 1; P.rise = 2; P.strike = 0; P.jaw = 2; P.hood = 2; P.flash = h < 1 / 12 ? 1 : 0; } else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.rise = 1; P.jaw = 1; } },
  // 死亡：受击竖直 → 前段软倒（瘫软）→ 贴地摊直（离地 3 → 1 → 0）→ 吐着信子不动 → 消散
  death(P, d, f12, drop) {
    if (d < 0.3) { P.bx = -2; P.eyes = 1; P.rise = 3; P.jaw = 2; P.hood = 2; P.flash = d < 1 / 12 ? 1 : 0; }
    else if (d < 0.5) { P.bx = -3; P.lie = 1; P.eyes = 1; P.jaw = 2; }
    else { P.bx = -3; P.lie = 2; P.eyes = 1; P.jaw = 1; P.tongue = d > 0.8 ? 1 : 0; if (d >= 1.6) P.dq = cl((d - 1.6) / 0.8, 0, 1); }
    dropHook(P, d, f12, drop);
  },
};
B.serpent = { DEFAULT: SERP, KEYS: SKEYS, shape: serpShape, reset: serpReset, rig: serpRig, body: serpBody, hood: serpHood, head: serpHead, draw: serpDraw, anim: serpAnim };
})();
