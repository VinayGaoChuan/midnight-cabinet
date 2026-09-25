// parts.js：人形部件库（全部角色共用）。参数表、挂点、推荐顺序、拼装例子见 pcd/lib/README.md「部件库（parts）」。
// 约定：坐标以脚底为原点、面朝右、y 向上为负；每个部件 parts.<名字>(E, rig, P, o) 自己调用 E.part()，返回后续部件要用的挂点。
//   rig = parts.rig(P, 体型)：骨架（关节 / 挂点），同时也是「落笔变换」——倒地时整具身体按 90° 转，部件照常画，明暗在烘焙时按新朝向重算；
//   P = 姿势（只读，字段语义沿用星辉巫师）；o = 本部件的参数（材质下标、样式、尺寸）。
//   部件的输出只取决于 (rig, P, o)：不读写模块外的可变状态，所以角色的缓存键 k1 / k2 只要编进「部件读的 P 字段」就可靠。
// 画法遵守标准：部件从后往前、每个部件一个 part()（手臂 = 袖 / 袖口 / 手三个部件）、光从左上（自动明暗）、不画进地面以下；
// 细的斜放道具（剑、匕首、矛、枪管、牌、箭）方向吸附到 0 / 1:2 / 45° / 2:1 / 90°，画成逐行错位的平行四边形；
// 宽的武器头（斧、锤、铲、戟、剁刀）只按 90° 换朝向，中心放在真实角度的位置上，柄用直线插进套口。
(function () {
'use strict';
const PCD = window.PCD = window.PCD || {};
const parts = PCD.parts = PCD.parts || {};
const RD = Math.round, FL = (v) => Math.floor(v + 1e-6), CL = (v, a, b) => (v < a ? a : v > b ? b : v), SG = (v) => (v > 0 ? 1 : v < 0 ? -1 : 0);
const HALF = Math.PI / 2;
const FREE = Object.freeze({ r0: 0, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 });   // 不跟身体走（掉在地上的帽子 / 武器）

// ═════════════════════════ 落笔：本地 (x, y) → 内旋 r0 → 平移 (tx, ty) → 身体旋转 rot → 平移 (ox, oy)；都是整 90°，像素不损坏 ═════════════════════════
function px(E, T, x, y, m, t) {
  let X = RD(x), Y = RD(y), s;
  const a = T.r0; if (a === 1) { s = X; X = -Y; Y = s; } else if (a === 2) { X = -X; Y = -Y; } else if (a === 3) { s = X; X = Y; Y = -s; }
  X += T.tx; Y += T.ty;
  const r = T.rot; if (r === 1) { s = X; X = -Y; Y = s; } else if (r === 2) { X = -X; Y = -Y; } else if (r === 3) { s = X; X = Y; Y = -s; }
  X += T.ox; Y += T.oy; if (Y > 0) return;                     // 不画进地面以下
  E.sp(X, Y, m, t);
}
function run(E, T, y, x0, x1, m, t) { x0 = RD(x0); x1 = RD(x1); for (let x = x0; x <= x1; x++) px(E, T, x, y, m, t); }
function rect(E, T, x, y, w, h, m, t) { x = RD(x); y = RD(y); for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(E, T, x + i, y + j, m, t); }
function line(E, T, x0, y0, x1, y1, m, t) {
  x0 = RD(x0); y0 = RD(y0); x1 = RD(x1); y1 = RD(y1);
  const ax = Math.abs(x1 - x0), ay = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = ax + ay;
  for (let n = 0; n < 300; n++) { px(E, T, x0, y0, m, t); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= ay) { e += ay; x0 += sx; } if (e2 <= ax) { e += ax; y0 += sy; } }
}
function brush(E, T, x, y, r, m, t) { x = RD(x); y = RD(y); const K = Math.ceil(r); for (let j = -K; j <= K; j++) for (let i = -K; i <= K; i++) if (i * i + j * j <= r * r + 0.35) px(E, T, x + i, y + j, m, t); }
function sweep(E, T, x0, y0, x1, y1, r0, r1, m, t) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; brush(E, T, x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, r0 + (r1 - r0) * q, m, t); } }
function sweep2(E, T, x0, y0, x1, y1, m, t) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; rect(E, T, RD(x0 + (x1 - x0) * q - 0.5), RD(y0 + (y1 - y0) * q - 0.5), 2, 2, m, t); } }
const frame = (R, r0, tx, ty) => ({ r0: r0 & 3, tx: R.tx + tx, ty: R.ty + ty, rot: R.rot, ox: R.ox, oy: R.oy });
const freeFrame = (r0, x, y) => ({ r0: r0 & 3, tx: x, ty: y, rot: 0, ox: 0, oy: 0 });
parts.px = px; parts.run = run; parts.rect = rect; parts.line = line; parts.brush = brush; parts.sweep = sweep; parts.FREE = FREE;

// ═════════════════════════ 材质、步态、缓存键 ═════════════════════════
// parts.mats(E, { 名字: 色阶 }) → { 名字: 材质, 名字D: 暗一级的材质（远侧腿 / 后臂用） }。色阶：RAMP 名 / 4 个下标或 #hex / { r, band, flat }
parts.mats = function (E, spec) {
  const M = {};
  for (const k of Object.keys(spec)) {
    let v = spec[k], band = 1, flat = 0;
    if (v && typeof v === 'object' && !Array.isArray(v)) { band = v.band || 1; flat = v.flat ? 1 : 0; v = v.r; }
    const r = typeof v === 'string' ? E.RAMP[v] : v.map((c) => (typeof c === 'number' ? c : E.color(c)));
    if (!r) throw new Error('parts.mats：没有这个色阶 ' + v);
    M[k] = E.defMat(r, band, flat); M[k + 'D'] = flat ? M[k] : E.defMat([r[0], r[1], r[1], r[2]], band, 0);
  }
  return M;
};
// 4 帧步态（0 接触 A · 1 经过 · 2 接触 B · 3 经过）：写 P.walk / step / wup / bob / sway / beard；两只脚的落点由 rig 按 step / wup 算（接触 B = 接触 A 的镜像）
const G_STEP = [1, 0, -1, 0], G_UP = [0, 2, 0, 1], G_BOB = [1, 0, 1, 0], G_SWAY = [-1, 0, 1, 0], G_BEARD = [0, -1, 0, 1];
parts.gait = function (P, f) { f &= 3; P.walk = 1; P.step = G_STEP[f]; P.wup = G_UP[f]; P.bob = G_BOB[f]; P.sway = G_SWAY[f]; P.beard = G_BEARD[f]; };
// 缓存键：spec = [[字段, 最小, 最大, 倍数?], ...] → (P) => 混合进制整数；取值范围乘积超过 2^53 时直接报错
parts.keyer = function (spec) {
  let prod = 1; for (const s of spec) prod *= s[2] - s[1] + 1;
  if (prod > 9007199254740992) throw new Error('parts.keyer：取值范围乘积超过 2^53，拆到另一个键或收窄范围');
  return (P) => { let k = 0; for (let i = 0; i < spec.length; i++) { const s = spec[i], v = CL(RD((P[s[0]] || 0) * (s[3] || 1)), s[1], s[2]); k = k * (s[2] - s[1] + 1) + v - s[1]; } return k; };
};

// ═════════════════════════ 骨架 ═════════════════════════
// 体型档：leg 胯高 · torso 胯到肩 · head / headW 头高宽 · sw 躯干半厚（侧面看的前后宽）· arm 臂长 · lw 腿粗 · stride 步幅 · limb 袖粗倍数
//        belly 肚子前凸 · hunch 驼背（肩和头前移、背上鼓包）· neck 脖子 · waist 收腰 · headX 头前后偏移 · lift 经过帧抬脚高度
const BODY = parts.BODY = {
  standard: { leg: 9, torso: 8, head: 6, headW: 6, sw: 4, arm: 9, lw: 3, stride: 3, limb: 1 },
  slim:     { leg: 10, torso: 8, head: 6, headW: 5, sw: 3, arm: 9, lw: 2, stride: 4, limb: 0.9 },
  tall:     { leg: 11, torso: 10, head: 6, headW: 6, sw: 4, arm: 11, lw: 3, stride: 4, limb: 1 },
  heroic:   { leg: 10, torso: 10, head: 6, headW: 6, sw: 5, arm: 10, lw: 3, stride: 3, limb: 1.2 },
  stocky:   { leg: 6, torso: 9, head: 6, headW: 6, sw: 5, arm: 8, lw: 3, stride: 3, limb: 1.2, belly: 1 },
  fat:      { leg: 7, torso: 10, head: 6, headW: 6, sw: 5, arm: 9, lw: 3, stride: 3, limb: 1.3, belly: 3 },
  giant:    { leg: 12, torso: 13, head: 7, headW: 7, sw: 6, arm: 13, lw: 4, stride: 4, limb: 1.5 },
  hunched:  { leg: 8, torso: 8, head: 6, headW: 6, sw: 4, arm: 9, lw: 2, stride: 2, limb: 1, hunch: 3 },
  child:    { leg: 5, torso: 6, head: 6, headW: 6, sw: 3, arm: 6, lw: 2, stride: 2, limb: 0.9 },
};
// parts.rig(P, o)：o = { body: 体型档名, 覆盖的数值…, fall: 'back' 仰倒（头在左）| 'front' 前扑（头在右） }。
// 读 P：lean crouch bob step wup walk head lying lift。crouch ≥ 4 = 单膝跪；lying = 1 时整具身体转 90° 躺在地上（lift 离地格数）。
parts.rig = function (P, o) {
  o = o || {}; const base = BODY[o.body] || BODY.standard, b = {};
  for (const k in base) b[k] = base[k]; for (const k in o) if (typeof o[k] === 'number') b[k] = o[k];
  const lie = P.lying ? 1 : 0, cr = lie ? 0 : CL(RD(P.crouch || 0), 0, 7), kneel = cr >= 4;
  const bob = lie ? 0 : RD(P.bob || 0), lean = lie ? 0 : RD(P.lean || 0), hunch = b.hunch || 0;
  const R = { b, lie, kneel, cr, bob, lean, hunch, sw: b.sw, belly: b.belly || 0, arm: b.arm, limb: b.limb || 1, lw: b.lw, r0: 0, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 };
  R.yHip = -b.leg + (kneel ? b.leg - RD(b.leg * 0.55) : Math.min(cr, 3)) + bob;
  R.yS = R.yHip - b.torso + RD(hunch * 0.4);
  R.yWaist = R.yS + RD(b.torso * 0.6);
  R.sFx = lean + hunch + Math.max(1, b.sw - 2); R.sFy = R.yS + 2;
  R.sBx = lean + hunch - Math.max(2, b.sw - 1); R.sBy = R.yS + 2;
  R.hw = b.headW; R.hh = b.head;
  R.hx = lean + (lie ? 0 : RD(P.head || 0)) + (hunch ? hunch + 1 : 0) + (b.headX || 0);
  R.hy = R.yS - 1 - (b.neck || 0) + RD(hunch * 0.67);
  R.hx0 = R.hx - FL((R.hw - 1) / 2); R.hx1 = R.hx0 + R.hw - 1; R.htop = R.hy - R.hh + 1; R.ey = R.htop + RD(R.hh * 0.4);
  R.hipFx = Math.max(1, RD(b.sw * 0.35)); R.hipBx = -Math.max(2, RD(b.sw * 0.55));
  const st = lie || kneel ? 0 : RD(P.step || 0), wup = lie || kneel ? 0 : RD(P.wup || 0), sd = b.stride * Math.abs(st), up = b.lift || 2;
  if (st > 0) { R.footFx = R.hipFx + sd; R.footBx = R.hipBx - sd; }                             // 接触 A：近侧脚在前、远侧脚在后
  else if (st < 0) { R.footFx = R.hipBx - sd; R.footBx = R.hipFx + sd; }                        // 接触 B：接触 A 的镜像——两脚落点互换，跨度相同
  else { R.footFx = R.hipFx + 1; R.footBx = R.hipBx - 1; }                                      // 站立
  R.footFup = 0; R.footBup = 0;
  // 经过帧（两个互为镜像）：两只脚都回到各自的胯下，支撑脚踩地，摆动脚抬起 lift 格、膝盖前顶。
  // 远侧脚抬起时在近侧腿后面整只露出来（不往前错，前手的盾 / 武器挡不住它）；近侧脚抬起时压在远侧腿前面。
  if (wup === 1) { R.footFx = R.hipFx + 1; R.footFup = up; R.footBx = R.hipBx + 1; }
  else if (wup === 2) { R.footFx = R.hipFx + 1; R.footBx = R.hipBx + 1; R.footBup = up; }
  R.legFx = st < 0 ? R.hipBx : R.hipFx; R.legBx = st < 0 ? R.hipFx : R.hipBx;                // 出腿的胯位：接触 B 两条腿也互换胯位，和接触 A 一样是 A 字形（不在胯下交叉，短腿也分得开）
  R.contact = st !== 0 ? 1 : 0;                                                                // 接触帧（扬尘由调用方做）
  if (lie) {                                                                                  // 倒地：整具身体转 90°，背（仰倒）或胸（前扑）贴地
    const front = o.fall === 'front';
    R.rot = front ? 1 : 3;
    R.oy = -(front ? b.sw - 1 + R.belly : b.sw) - RD(P.lift || 0);
    R.ox = (front ? -1 : 1) * RD(-R.htop * 0.3);
  }
  return R;
};
// 躯干第 y 行的后沿 / 前沿（不含服装外扩）：前倾只推上半身、驼背把肩推前并在背上鼓包、肚子在下腹前凸
parts.edges = function (R, y) {
  const span = Math.max(1, R.yHip - R.yS), t = CL((y - R.yS) / span, 0, 1), sh = R.lean * (1 - t) + R.hunch * Math.pow(1 - t, 1.5);
  let L = -R.sw + sh, Rr = R.sw - 1 + sh;
  if (R.belly) Rr += R.belly * Math.sin(Math.PI * CL(t * 0.85 + 0.12, 0, 1));
  if (R.hunch) L -= R.hunch * 0.9 * Math.sin(Math.PI * CL(t * 1.4 + 0.1, 0, 1));
  if (R.b.waist) { const w = R.b.waist * Math.max(0, 1 - Math.abs(t - 0.62) * 3); L += w; Rr -= w; }
  if (y <= R.yS) { L += 1; Rr -= 1; }
  return [RD(L), RD(Rr)];
};
// 世界坐标换算（给特效挂点用）：部件本地坐标 → 精灵本地坐标（倒地时按 rig 的旋转）
parts.toSprite = function (T, x, y) {
  let X = RD(x), Y = RD(y), s; const a = T.r0 || 0; if (a === 1) { s = X; X = -Y; Y = s; } else if (a === 2) { X = -X; Y = -Y; } else if (a === 3) { s = X; X = Y; Y = -s; }
  X += T.tx; Y += T.ty; const r = T.rot; if (r === 1) { s = X; X = -Y; Y = s; } else if (r === 2) { X = -X; Y = -Y; } else if (r === 3) { s = X; X = Y; Y = -s; }
  return [X + T.ox, Y + T.oy];
};

// ═════════════════════════ 腿脚 ═════════════════════════
// o = { style: 'boot' 高靴 | 'shoe' 矮鞋 | 'greave' 板甲胫甲 | 'bare' 赤足 | 'sandal' 凉鞋, mat 裤 / 腿, matD, boot 靴, bootD, w 腿粗, bootH 靴高 }
// 远侧腿先画、整条用 D（暗一级）材质；近侧腿后画，脚尖比远侧多 1 格。步态和跪姿都由 rig 决定。返回 { fx, bx, fUp, bUp, contact }（脚的 x，用来扬尘）
function legCol(E, T, hx, hy, fx, up, kn, w, m, bm, bootH, toe, cuff, knee) {
  const yb = -up, h0 = hy + 1, n = Math.max(1, yb - h0), c0 = Math.ceil((w - 1) / 2); let c = fx;
  for (let y = h0; y <= yb; y++) {
    const t = (y - h0) / n; c = RD(hx + (fx - hx) * t + kn * Math.sin(t * Math.PI));
    const a = c - c0, boot = y > yb - bootH; run(E, T, y, a, a + w - 1, boot ? bm : m, 0);
    if (boot && cuff && y === yb - bootH + 1) px(E, T, a + w, y, bm, 4);          // 靴筒翻口
    if (knee && y === RD(h0 + n * 0.45)) { px(E, T, a + w, y, knee, 0); px(E, T, a + w - 1, y, knee, 4); }   // 膝甲外凸
  }
  const a = c - c0;
  for (let i = 0; i < toe; i++) px(E, T, a + w + i, yb, bm, i === toe - 1 ? 3 : 0);
  if (toe > 1 && bootH >= 2) px(E, T, a + w, yb - 1, bm, 0);
  return c;
}
parts.legs = function (E, R, P, o) {
  o = o || {}; const st = o.style || 'boot', w = o.w || R.lw, mF = o.mat, mB = o.matD || mF, bF = o.boot || mF, bB = o.bootD || o.boot || mB;
  const bootH = o.bootH != null ? o.bootH : st === 'boot' ? Math.max(3, RD(R.b.leg * 0.45)) : st === 'shoe' || st === 'greave' ? 2 : 1;
  const knee = st === 'greave' ? mF : 0, kneeB = st === 'greave' ? mB : 0, cuff = st === 'boot';
  if (R.kneel) {                                                                              // 单膝跪：远侧膝盖着地、小腿贴地向后；近侧大腿水平、小腿竖直
    const yh = R.yHip + 1, bx = R.hipBx, fx = R.hipFx + 3, c0 = Math.ceil((w - 1) / 2);
    E.part();
    for (let y = yh; y <= -2; y++) { const t = (y - yh) / Math.max(1, -2 - yh), c = RD(bx - t) - c0; run(E, R, y, c, c + w - 1, mB, 0); }
    run(E, R, -1, bx - 5, bx - c0 + w - 2, mB, 0); run(E, R, 0, bx - 4, bx - c0 + w - 2, mB, 0);
    run(E, R, -1, bx - 7, bx - 5, bB, 0); run(E, R, 0, bx - 6, bx - 5, bB, 0); px(E, R, bx - 7, -2, bB, 3);
    E.part();
    for (let y = yh; y < yh + w; y++) run(E, R, y, R.hipFx - 1, fx + w - 1 - c0, mF, 0);
    for (let y = yh + w; y <= 0; y++) { const boot = y > -bootH; run(E, R, y, fx - c0, fx - c0 + w - 1, boot ? bF : mF, 0); }
    px(E, R, fx - c0 + w, 0, bF, 0); px(E, R, fx - c0 + w + 1, 0, bF, 3); if (knee) px(E, R, fx - c0 + w, yh + 1, knee, 4);
    return { fx, bx: bx - 6, fUp: 0, bUp: 0, contact: 0 };
  }
  const kn = R.cr * 0.9;
  E.part(); legCol(E, R, R.legBx, R.yHip, R.footBx, R.footBup, kn + (R.footBup ? 0.8 : 0), w, mB, bB, bootH, 1, cuff, kneeB);
  E.part(); legCol(E, R, R.legFx, R.yHip, R.footFx, R.footFup, kn + (R.footFup ? 0.8 : 0), w, mF, bF, bootH, 2, cuff, knee);
  return { fx: R.footFx, bx: R.footBx, fUp: R.footFup, bUp: R.footBup, contact: R.contact };
};

// ═════════════════════════ 躯干服装 ═════════════════════════
// o = { style: 'robe' 长袍 | 'habit' 修女袍 | 'dress' 长裙 | 'coat' 大衣 | 'tunic' / 'leather' 皮甲短衣 | 'plate' 板甲 | 'vest' 背心 + 衬衫 | 'bare' 赤膊,
//       mat, trim 镶边 / 前襟, belt 腰带, buckle 扣, collar 领, emblem 胸徽 + emblemStyle 'cross'|'dot'|'hourglass'|'bar'|'diamond',
//       buttons 扣子, shirt 衬衫（vest）, tabard 罩袍布片（plate）, strap / strap2 斜挎带, studs 铆钉（leather）, cloth 缠腰布（bare）, tassel 腰间垂穗,
//       hem 下摆行（覆盖默认）, flare / flareF 下摆后 / 前外扩 }
// 读 P：sway（下摆左右摆）bend（下摆被吹向后）beard（垂穗摆）。返回 { hem, belt: y, front(y), back(y) 的采样 [L, R] 表 rows, chest: [x, y] }
const GARB = {
  robe: { fy: 'chest', fb: 4, ff: 3 }, habit: { fy: 'chest', fb: 2.5, ff: 1.5 }, dress: { fy: 'waist', fb: 5, ff: 4 }, coat: { fy: 'waist', fb: 2, ff: 1.5 },
  tunic: { fy: 'hip', fb: 1, ff: 1 }, leather: { fy: 'hip', fb: 1, ff: 1 }, plate: { fy: 'waist', fb: 1, ff: 1 }, vest: { fy: 'hip', fb: 0, ff: 0 }, bare: { fy: 'hip', fb: 0, ff: 0 },
};
function emblem(E, T, cx, cy, m, st) {
  if (st === 'dot') px(E, T, cx, cy, m, 4);
  else if (st === 'hourglass') { run(E, T, cy - 1, cx - 1, cx, m, 3); px(E, T, cx - 1, cy, m, 4); run(E, T, cy + 1, cx - 1, cx, m, 3); }
  else if (st === 'bar') run(E, T, cy, cx - 1, cx + 1, m, 3);
  else if (st === 'diamond') { px(E, T, cx, cy - 1, m, 4); px(E, T, cx - 1, cy, m, 3); px(E, T, cx + 1, cy, m, 3); px(E, T, cx, cy + 1, m, 3); }
  else { for (let y = cy - 1; y <= cy + 2; y++) px(E, T, cx, y, m, 3); px(E, T, cx - 1, cy, m, 3); px(E, T, cx + 1, cy, m, 3); px(E, T, cx, cy - 1, m, 4); }
}
parts.torso = function (E, R, P, o) {
  o = o || {}; const st = GARB[o.style] ? o.style : 'tunic', G = GARB[st], m = o.mat, sway = RD(P.sway || 0), bend = RD(P.bend || 0), T = R;
  const yS = R.yS, yH = R.yHip, yW = R.yWaist;
  const HEM = { robe: -2, habit: -1, dress: -1, coat: RD(yH * 0.45), tunic: yH + 2, leather: yH + 2, plate: yH + 2, vest: yH + 1, bare: yH };
  const hem = Math.min(0, o.hem != null ? o.hem : HEM[st]), fy0 = G.fy === 'chest' ? yS + 3 : G.fy === 'waist' ? yW + 1 : yH;
  let fb = o.flare != null ? o.flare : G.fb, ff = o.flareF != null ? o.flareF : o.flare != null ? o.flare * 0.8 : G.ff; if (R.lie) { fb *= 0.3; ff *= 0.3; }
  const span = Math.max(1, hem - fy0), LL = [], RR = [], I = (y) => CL(y, yS, hem) - yS, Lx = (y) => LL[I(y)], Rx = (y) => RR[I(y)];
  E.part();
  for (let y = yS; y <= hem; y++) {
    const e = parts.edges(R, Math.min(y, yH)); let L = e[0], Rr = e[1];
    if (st === 'dress' && y > yS + 1 && y <= yW) { L += 1; if (y > yS + 3) Rr -= 1; }                     // 窄肩细腰胸衣
    if (y > fy0) {
      const t = (y - fy0) / span, s = sway * t * t;
      L = Math.min(L, RD(e[0] - fb * Math.pow(t, 1.1) + s - bend * t * t * 0.8)); Rr = Math.max(Rr, RD(e[1] + ff * Math.pow(t, 0.9) + s));
      if (st === 'dress') L -= RD(2.4 * Math.exp(-Math.pow((t - 0.22) / 0.18, 2)));                       // 后腰裙撑
    }
    LL.push(L); RR.push(Rr); run(E, T, y, L, Rr, st === 'vest' && o.shirt ? o.shirt : m, 0);
  }
  const mid = (y) => RD((Lx(y) + Rx(y)) / 2);
  // ── 各样式的细节（同一个部件：材质之间是自动明暗的边，不是分界线）──
  if (st === 'robe' || st === 'habit') {
    for (let y = fy0 + 3; y < hem; y++) { const t = (y - fy0) / span; px(E, T, Lx(y) + 2 + RD(t), y, m, 2); if (st === 'robe' && t > 0.4) px(E, T, Rx(y) - 2 - RD(t), y, m, 2); }
    if (o.trim) line(E, T, Rx(yW) - 2, yW + 1, Rx(hem) - 3 + sway, hem, o.trim, 3);                     // 前襟镶边
    for (let x = Lx(hem) + 1; x < Rx(hem); x++) if ((((x - sway) % (st === 'robe' ? 4 : 3)) + 4) % (st === 'robe' ? 4 : 3) === 0) px(E, T, x, hem, st === 'robe' ? 0 : m, st === 'robe' ? 0 : 2);   // 下摆波浪 / 一跳一跳的袍摆
    if (st === 'habit' && o.collar) { run(E, T, yS, Lx(yS), Rx(yS), o.collar, 0); run(E, T, yS + 1, Lx(yS + 1) + 1, Rx(yS + 1), o.collar, 0); run(E, T, yS + 2, Rx(yS) - 3, Rx(yS) - 1, o.collar, 0); }
    else if (o.collar) { px(E, T, Rx(yS) - 1, yS, o.collar, 4); px(E, T, Rx(yS + 1) - 2, yS + 1, o.collar, 3); px(E, T, Rx(yS) - 2, yS, o.collar, 3); }
  } else if (st === 'dress') {
    const n = hem - yW; for (let y = yW + 3; y < hem; y++) { const t = (y - yW) / n; px(E, T, Lx(y) + 3 + RD(t * 1.5), y, m, 2); if (t > 0.3) px(E, T, Rx(y) - 2 - RD(t), y, m, 2); if (t > 0.5) px(E, T, mid(y), y, m, 4); }
    const lace = o.trim || m; for (let x = Lx(hem); x <= Rx(hem); x++) { const k = (((x - sway) % 4) + 4) % 4; if (k === 0) px(E, T, x, hem, 0, 0); else px(E, T, x, hem, lace, k === 2 ? 4 : 0); if (k === 2) px(E, T, x, hem - 1, lace, 3); }
    if (o.collar) { run(E, T, yS, Rx(yS) - 2, Rx(yS), o.collar, 0); px(E, T, Rx(yS) - 1, yS - 1, o.collar, 3); }
  } else if (st === 'coat') {
    const ox = (y) => Rx(y) - 2;
    for (let y = yS + 2; y <= hem; y++) px(E, T, ox(y), y, m, 2);                                     // 前襟开口
    px(E, T, ox(hem), hem, 0, 0); px(E, T, Lx(hem) + 2, hem, 0, 0); px(E, T, Lx(hem) + 2, hem - 1, m, 2);   // 前后开衩
    if (o.buttons) for (let y = yS + 3; y < yW; y += 2) px(E, T, ox(y) + 1, y, o.buttons, 4);
    if (o.collar) { run(E, T, yS, Lx(yS), Rx(yS), o.collar, 0); px(E, T, Rx(yS + 1) - 1, yS + 1, o.collar, 0); px(E, T, Rx(yS + 2), yS + 2, o.collar, 3); }
    else { px(E, T, Rx(yS) - 1, yS, m, 4); px(E, T, Rx(yS + 1), yS + 1, m, 4); }
    run(E, T, yW + 2, Lx(yW + 2) + 2, Lx(yW + 2) + 3, m, 2);                                          // 口袋盖
    if (o.trim) for (let x = Lx(hem); x <= Rx(hem); x++) if (x !== ox(hem) && x !== Lx(hem) + 2) px(E, T, x, hem, o.trim, 0);
  } else if (st === 'tunic' || st === 'leather') {
    for (let y = yS + 2; y <= hem; y += 2) px(E, T, Rx(y) - 1, y, m, 2);                              // 前沿缝线
    px(E, T, Rx(yS + 2) - 2, yS + 2, m, 4); px(E, T, Rx(yS + 3) - 1, yS + 3, m, 2); px(E, T, Rx(yS + 4) - 2, yS + 4, m, 4);   // 胸前系带
    if (o.studs) for (let y = yS + 2; y < yW; y += 3) for (let x = Lx(y) + 2; x < Rx(y) - 2; x += 3) px(E, T, x, y, o.studs, 4);
    px(E, T, Rx(hem), hem, 0, 0); px(E, T, Lx(hem) + 3, hem, m, 2);
    if (o.trim) run(E, T, hem, Lx(hem), Rx(hem) - 1, o.trim, 0);
  } else if (st === 'plate') {
    if (o.tabard) { for (let y = yS + 1; y <= hem + 1 && y <= 0; y++) { const a = mid(Math.min(y, hem)) - 1, b = Math.min(Rx(Math.min(y, hem)), a + 3); run(E, T, y, a + (y > hem ? RD(sway * 0.5) : 0), b + (y > hem ? RD(sway * 0.5) : 0), o.tabard, 0); } px(E, T, mid(hem) - 1 + RD(sway * 0.5), Math.min(0, hem + 1), 0, 0); }
    else for (let y = yS + 1; y <= yW - 2; y++) px(E, T, mid(y) + 1, y, m, 4);                     // 中脊高光
    run(E, T, yS + RD((yW - yS) * 0.6), Lx(yS + 1) + 1, Rx(yS + 1) - 1, m, 2);                       // 胸腹分界
    for (let y = yW + 1; y <= hem; y++) { if (((y - yW) & 1) === 0) run(E, T, y, Lx(y), Rx(y), m, 2); px(E, T, mid(y), y, m, 2); }   // 腿甲裙：甲片分段 + 中缝
    px(E, T, Lx(yW + 1) + 1, yW + 1, m, 4); px(E, T, Rx(yW + 1) - 1, yW + 1, m, 4);                  // 铆钉
    run(E, T, yS - 1, R.hx - 2, R.hx + 1, m, 2);                                                      // 护颈
  } else if (st === 'vest') {
    for (let y = yS; y <= hem; y++) run(E, T, y, Lx(y), Rx(y) - 2, m, 0);                             // 背心盖住后背和侧面，前面露出衬衫
    px(E, T, Rx(hem) - 1, hem, m, 0); px(E, T, Rx(hem) - 1, hem - 1, m, 0);                          // 背心前下角尖
    if (o.buttons) for (let y = yS + 3; y <= yW; y += 2) px(E, T, Rx(y) - 2, y, o.buttons, 4);
    if (o.collar) { px(E, T, Rx(yS), yS, o.collar, 4); px(E, T, Rx(yS) - 1, yS, o.collar, 3); px(E, T, Rx(yS + 1), yS + 1, o.collar, 3); }
    px(E, T, Lx(yS + 2) + 2, yS + 2, m, 2); px(E, T, Lx(yS + 3) + 2, yS + 3, m, 2);
  } else if (st === 'bare') {
    const cy = yS + 3; run(E, T, cy, mid(cy), Rx(cy) - 1, m, 2);                                       // 胸肌下沿
    px(E, T, Rx(cy - 1), cy - 1, m, 4); px(E, T, mid(yS + 1), yS + 1, m, 4);
    if (!R.belly) { px(E, T, Rx(cy + 2) - 2, cy + 2, m, 2); px(E, T, Rx(cy + 4) - 2, cy + 4, m, 2); }   // 腹肌
    const ny = RD((yW + yH) / 2); px(E, T, Rx(ny) - 1 - (R.belly ? 0 : 1), ny, m, 1);                  // 肚脐
    if (R.belly) run(E, T, yH - 1, Rx(yH - 1) - 3, Rx(yH - 1) - 1, m, 2);                              // 赘肉褶
    if (o.cloth) { const cx = Rx(yH) - 3 + sway; for (let y = yH + 1; y <= Math.min(0, yH + 3); y++) run(E, T, y, cx + (y - yH > 2 ? 1 : 0), cx + 2, o.cloth, 0); }
  }
  // 腰带 + 扣 + 垂穗（赤膊时是低腰的裤腰带）
  const by = st === 'bare' ? yH - 1 : yW;
  if (o.belt) { run(E, T, by, Lx(by), Rx(by), o.belt, 0); if (st === 'bare' || st === 'plate') run(E, T, by + 1, Lx(by + 1), Rx(by + 1), o.belt, 2); }
  if (o.buckle) { const bx = Rx(by) - 2; px(E, T, bx, by - 1, o.buckle, 4); px(E, T, bx + 1, by - 1, o.buckle, 3); px(E, T, bx, by, o.buckle, 3); px(E, T, bx + 1, by, o.buckle, 2); if (st !== 'bare') { px(E, T, bx, by + 1, o.buckle, 3); px(E, T, bx + 1, by + 1, o.buckle, 2); } }
  if (o.tassel) { const tx = Rx(by) - 4, sw = RD((P.beard || 0) * 0.5); px(E, T, tx, by + 1, o.tassel, 3); px(E, T, tx, by + 2, o.tassel, 2); px(E, T, tx + sw, by + 3, o.tassel, 3); }
  if (o.strap) line(E, T, Lx(yS + 1) + 1, yS + 1, Rx(yW - 1) - 1, yW - 1, o.strap, 3);                  // 斜挎带
  if (o.strap2) line(E, T, Rx(yS + 1) - 1, yS + 1, Lx(yW - 1) + 1, yW - 1, o.strap2, 3);
  if (o.emblem) emblem(E, T, (o.tabard ? mid(yS + 3) : mid(yS + 3) + 1), yS + 3, o.emblem, o.emblemStyle);
  return { hem, belt: by, rows: [LL, RR], y0: yS, chest: [mid(yS + 3), yS + 3], front: Rx(yW), back: Lx(yW) };
};
// 围裙：胸兜 + 挂脖带 + 腰后系带 + 口袋 + 污渍；单独一个部件（压在躯干前面）。o = { mat, strap, stain 污渍材质, hem, pocket }
parts.apron = function (E, R, P, o) {
  o = o || {}; const m = o.mat, T = R, sway = RD(P.sway || 0), yS = R.yS, yW = R.yWaist, top = yS + 2, hem = Math.min(0, o.hem != null ? o.hem : RD(R.yHip * 0.35));
  E.part();
  let f0 = 0, b0 = 0;
  for (let y = top; y <= hem; y++) {
    const e = parts.edges(R, Math.min(y, R.yHip)), below = y > R.yHip, t = below ? (y - R.yHip) / Math.max(1, hem - R.yHip) : 0;
    const a = RD((e[0] + e[1]) / 2) - (y > yW ? 2 : 0) + (below ? RD(sway * t) : 0), b = e[1] + 1 + (below ? RD(sway * t) : 0);
    run(E, T, y, a, b, m, 0); if (y === hem) { f0 = a; b0 = b; } if (y === top) f0 = a;
    if (y === hem) for (let x = a; x <= b; x++) if ((((x - sway) % 3) + 3) % 3 === 1) px(E, T, x, y, 0, 0);
  }
  line(E, T, RD((parts.edges(R, top)[0] + parts.edges(R, top)[1]) / 2), top, R.hx0, R.hy + 1, o.strap || m, 3);   // 挂脖带
  const e = parts.edges(R, yW); run(E, T, yW, e[0], e[0] + 2, o.strap || m, 2); px(E, T, e[0] - 1, yW - 1 + (sway > 0 ? 1 : 0), o.strap || m, 3); px(E, T, e[0] - 1, yW + 1, o.strap || m, 2);   // 腰后系带结
  if (o.pocket !== 0) { const py = yW + 2; if (py < hem) { px(E, T, e[1] - 1, py, m, 2); px(E, T, e[1], py, m, 2); px(E, T, e[1] - 1, py + 1, m, 4); } }
  if (o.stain) { const pts = [[0, 2], [1, 3], [-1, 5], [0, 6], [1, 6], [0, 9], [2, 4]]; for (const [dx, dy] of pts) { const y = top + dy; if (y >= hem) continue; const ee = parts.edges(R, Math.min(y, R.yHip)); px(E, T, ee[1] - 1 - dx, y, o.stain, dy & 1 ? 2 : 3); } }
  return { hem };
};
// 腰间挂件：o = { style: 'pouch' 钱袋 | 'keys' 钥匙串 | 'flask' 水瓶 | 'book' 小书 | 'tools' 工具, mat, trim, x（默认前腰）, y（默认腰带下 1 行）}。读 P.beard（钥匙尖摆）
parts.pendant = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, tr = o.trim || m, e = parts.edges(R, R.yWaist), st = o.style || 'pouch';
  const x = o.x != null ? o.x : e[1] - 1, y = o.y != null ? o.y : R.yWaist + 1, b = RD((P.beard || 0) * 0.5);
  E.part();
  if (st === 'keys') { px(E, T, x, y, tr, 4); px(E, T, x - 1, y + 1, tr, 0); px(E, T, x + 1, y + 1, tr, 0); line(E, T, x - 1, y + 2, x - 1 + b, y + 4, tr, 3); line(E, T, x + 1, y + 2, x + 1 + b, y + 3, tr, 2); }
  else if (st === 'flask') { px(E, T, x, y, tr, 3); rect(E, T, x - 1, y + 1, 2, 3, m, 0); px(E, T, x - 1, y + 1, m, 4); }
  else if (st === 'book') { rect(E, T, x - 1, y, 3, 3, m, 0); for (let k = 0; k < 3; k++) px(E, T, x - 1, y + k, m, 2); px(E, T, x + 1, y + 1, tr, 3); }
  else if (st === 'tools') { line(E, T, x, y, x + b, y + 4, tr, 3); line(E, T, x + 1, y, x + 2 + b, y + 3, m, 2); px(E, T, x + 2 + b, y + 4, m, 3); }
  else { px(E, T, x, y, tr, 3); rect(E, T, x - 1, y + 1, 3, 2, m, 0); px(E, T, x, y + 3, m, 2); px(E, T, x - 1, y + 1, m, 4); }
};
// 短披肩（压在躯干、头之后，帽子之前）：o = { style: 'plain' 锯齿下摆 | 'fur' 毛皮, mat, clasp 领扣, len 行数 }。读 P.sway（锯齿 / 毛尖相位）bend（后角被吹起）
// fur：主体平涂（只靠自动明暗：左上亮、右下暗），每 3 列一撮竖毛束——束与束之间的缝从下摆往上 2 行（色阶第 2 级），
//      下摆锯齿：每撮毛垂下一个长尖（2 格）+ 一个短尖（1 格），缝那一列空着。不用逐格亮暗交替（那样读成格子布）。
parts.mantle = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, len = o.len || 4, fur = o.style === 'fur', sway = RD(P.sway || 0), bend = RD(P.bend || 0), y0 = R.yS;
  const ph = (x) => ((((x - sway) % 3) + 3) % 3), LL = [], RR = [];                        // 毛束相位：0 长尖 · 1 短尖 · 2 缝
  E.part();
  for (let k = 0; k < len; k++) {
    const y = y0 + k, e = parts.edges(R, y), g = Math.min(k, 2) + (fur ? 1 : 0);
    const L = k === 0 ? R.hx0 - 1 : e[0] - g - (k >= len - 2 && bend > k - len + 2 ? 1 : 0), Rr = k === 0 ? R.hx1 : e[1] + Math.min(k, 1) + (fur ? 1 : 0);
    run(E, T, y, L, Rr, m, 0); LL.push(L); RR.push(Rr);
    if (k === len - 1 && !fur) for (let x = L; x <= Rr; x++) if ((((x - sway) % 3) + 3) % 3 === 0) px(E, T, x, y + 1, m, 2);
  }
  if (fur) {
    const yb = y0 + len - 1, L = LL[len - 1], Rr = RR[len - 1];
    for (let x = L; x <= Rr; x++) { const q = ph(x); if (q === 2) continue; px(E, T, x, yb + 1, m, 0); if (q === 0 && x > L) px(E, T, x, yb + 2, m, 0); }   // 下摆锯齿
    for (let k = Math.max(1, len - 2); k < len; k++) for (let x = LL[k] + 1; x < RR[k]; x++) if (ph(x) === 2) px(E, T, x, y0 + k, m, 2);                  // 竖毛束之间的缝
  } else { const e = parts.edges(R, y0 + 2); px(E, T, e[0] + 1, y0 + 2, m, 2); px(E, T, e[0], y0 + 3, m, 2); }
  if (o.clasp) { px(E, T, R.hx1 - 1, y0, o.clasp, 4); px(E, T, R.hx1 - 1, y0 + 1, o.clasp, 2); }
};
// 披风（最后面，第一个画）：o = { style: 'plain' | 'tattered' 破边, mat（大面积，建议 band 2）, trim 下摆镶边, len: 'long' | 'short' | 行号, flare 后飘宽度, clasp }
// 读 P.sway（下摆摆）bend（后扬 0–3）。倒地时铺在身下（被地面裁掉）。
parts.cape = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, sway = P.sway || 0, bend = P.bend || 0, top = R.yS - 1;
  const bot = Math.min(0, typeof o.len === 'number' ? o.len : o.len === 'short' ? R.yHip + 1 : -2), n = Math.max(1, bot - top), fl = (o.flare != null ? o.flare : 6.5) * (R.lie ? 0.3 : 1), tat = o.style === 'tattered';
  E.part();
  let Lb = 0;
  for (let y = top; y <= bot; y++) {
    const t = (y - top) / n, s = sway * t * t, f = bend * t * t, e = parts.edges(R, CL(y, R.yS, R.yHip));
    const L = RD(e[0] - fl * Math.pow(t, 1.1) + s - f * 0.9), Rr = e[0] + 4;
    run(E, T, y, L, Rr, m, 0);
    if (t > 0.3 && y < bot) { px(E, T, L + 2 + RD(t), y, m, 2); if (t > 0.55) px(E, T, L + 5, y, m, 2); }
    if (y === bot) { Lb = L; for (let x = L; x <= Rr; x++) { const k = (((x - RD(sway)) % (tat ? 6 : 4)) + 12) % (tat ? 6 : 4); if (tat ? k < 3 : k === 2) { px(E, T, x, y, 0, 0); if (tat && k === 1) px(E, T, x, y - 1, 0, 0); } else if (o.trim) px(E, T, x, y, o.trim, 0); } }
  }
  px(E, T, Lb - 1, bot - (bend >= 2 ? 1 : 0), m, 0); if (bend < 2) px(E, T, Lb - 1, bot + 1, o.trim || m, 0);   // 会摆的后下角
  if (o.clasp) { px(E, T, parts.edges(R, R.yS)[1] - 1, R.yS, o.clasp, 4); }
  return { bot, back: Lb };
};
// 围巾：o = { mat, layer: 'tail' 两条飘带（最后面画）| 'wrap' 绕颈一圈（头之后画）, len 额外长度 }。读 P.beard（< 0 被风拉直、> 0 上甩）sway（尖端摆）
parts.scarf = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, b = RD(P.beard || 0), sw = RD(P.sway || 0);
  E.part();
  if (o.layer === 'wrap') { run(E, T, R.hy + 1, R.hx0 - 1, R.hx1 - 1, m, 0); run(E, T, R.hy + 2, R.hx0, R.hx1 - 2, m, 2); px(E, T, R.hx1 - 1, R.hy + 1, m, 4); return; }
  const x0 = R.hx0 - 1, y0 = R.hy + 1;
  for (let j = 0; j < 2; j++) {
    const L = (j ? 5 : 8) + (o.len || 0) + (b < 0 ? -b * 2 : 0), droop = b < 0 ? 2.4 + b : 2.4 - b * 2.5, wag = j === 0 ? sw : 0;
    for (let k = 0; k <= L; k++) { const q = k / L, y = y0 + j + q * q * droop + (k >= L - 1 ? wag : 0); px(E, T, x0 - k, y, m, j ? 2 : 0); if (k < 2 && j === 0) px(E, T, x0 - k, y + 1, m, 0); }
  }
};
// 背负物（画在后臂、腿、躯干之前）：o = { style: 'quiver' 箭袋 | 'sack' 布袋 | 'box' 木箱 | 'shield' 背盾, mat, trim, fletch 箭羽, 背盾另见 parts.shield 的参数（shape 盾形，round = targe） }
// 都用 rig 的落笔变换画：倒地时跟着身体转；背盾带 back: 1，倒地时压扁成侧看的一条（见 parts.targe / shield 的 back）。
parts.pack = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, tr = o.trim || m, st = o.style || 'sack', e = parts.edges(R, R.yS + 3), bx = e[0], top = R.yS;
  if (st === 'shield') return parts.shield(E, R, P, Object.assign({}, o, { style: o.shape || 'round', at: [bx - 1, top + 4], back: 1 }));
  E.part();
  if (st === 'quiver') {                                                                      // 3 格宽的斜筒，上端后仰，箭羽从肩后伸出
    bar(15, bx + 2, R.yWaist + 2, 0, 11, 3, (k, j, X, Y) => px(E, T, X, Y, k === 10 || k === 11 ? tr : m, k === 11 ? (j === 0 ? 4 : 0) : j === 0 ? 4 : j === 2 ? 2 : 0));
    const c = cell(15, bx + 2, R.yWaist + 2, 12); E.part();
    const fl = o.fletch || tr;
    for (let i = 0; i < 3; i++) { const ax = c[0] - 1 + i * 2, ay = c[1] - (i === 1 ? 2 : 1); px(E, T, ax, ay + 1, tr, 3); px(E, T, ax, ay, fl, 4); px(E, T, ax - 1, ay - 1, fl, 3); px(E, T, ax + 1, ay - 1, fl, 2); px(E, T, ax, ay - 1, fl, 3); }
  } else if (st === 'box') {
    rect(E, T, bx - 4, top - 2, 5, 10, m, 0);
    for (const y of [top - 2, top + 7]) { px(E, T, bx - 4, y, tr, 4); px(E, T, bx, y, tr, 3); }
    run(E, T, top + 2, bx - 4, bx, tr, 2); run(E, T, top + 5, bx - 4, bx, m, 2); px(E, T, bx - 3, top, m, 4);
  } else {
    for (let y = top; y <= top + 6; y++) { const q = (y - top - 3.2) / 3.6, w = RD(2.6 * Math.sqrt(Math.max(0, 1 - q * q))); run(E, T, y, bx - 2 * w + 1, bx + 1, m, 0); }
    px(E, T, bx - 1, top - 1, tr, 4); px(E, T, bx, top - 1, tr, 3); px(E, T, bx - 3, top + 3, m, 2); px(E, T, bx - 2, top + 4, m, 2); px(E, T, bx - 1, top + 2, tr, 3);
  }
};

// ═════════════════════════ 手臂与手 ═════════════════════════
// o = { side: 'F' 近侧前手（默认）| 'B' 远侧后手, at: [x, y] 手的位置（默认 F = P.hx/hy，B = P.bhx/bhy，没有时自然下垂）, from: [x, y] 肩（默认 rig 的肩）,
//       sleeve: 'tight' 2 格窄袖 | 'loose' 3 格 | 'bell' 喇叭袖 | 'puff' 泡泡袖 | 'bare' 赤臂 | 'plate' 臂甲, mat 袖, cuff 袖口 / 护腕材质,
//       cuffStyle: 'band' | 'bracer' 长护腕 | 'lace' 白哭袖 | 'fur', hand 手材质, grip: 'fist' 2×2 | 'big' 3×3 铁手套 | 'none',
//       pauldron 肩甲材质 + pStyle: 'round' | 'spike' | 'fur', trim 肩甲镶边, elbow: 'out' 肘向外 }
// 三个部件：袖（+ 肩甲）→ 袖口 → 手。返回 { hx, hy 手, ex, ey 肘, wx, wy 腕 }
const SLEEVE = { tight: [0, 0, 0, 1.6], loose: [1, 1, 1, 1.6], bell: [1, 1, 1.9, 1.8], puff: [1.6, 1.1, 0.9, 1.5], bare: [1.2, 1.1, 1, 1.2], plate: [1, 1, 1, 1.4] };
parts.arm = function (E, R, P, o) {
  o = o || {}; const T = R, B = o.side === 'B', st = SLEEVE[o.sleeve] ? o.sleeve : 'loose', S = SLEEVE[st], lim = R.limb;
  const sx0 = o.from ? o.from[0] : B ? R.sBx : R.sFx, sy0 = o.from ? o.from[1] : B ? R.sBy : R.sFy;
  let hx, hy, sx = sx0, sy = sy0;
  if (o.at) { hx = o.at[0]; hy = o.at[1]; } else if (B) { if (P.bhx != null) { hx = P.bhx; hy = P.bhy; } else { hx = sx - 1; hy = sy + RD(R.arm * 0.8); } } else { hx = P.hx; hy = P.hy; }
  hx = RD(hx); hy = RD(hy);
  { const qx = hx - sx0, qy = hy - sy0, q = Math.hypot(qx, qy), reach = R.arm - 0.5;           // 手在臂长之外（双手武器的后手握在前胸、宽肩 sw 大）：肩点沿手臂方向前移（肩往前送），
    if (q > reach) { const k = (q - reach) / q; sx = sx0 + qx * k; sy = sy0 + qy * k; } }     // 画出来的手臂最长 = 臂长，不会被拉成一条更长的直线；肩甲留在原来的肩上
  const L1 = R.arm * 0.5, dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
  let ex = sx + dx / 2, ey = sy + dy / 2;
  if (d < R.arm - 0.5) { const h = Math.sqrt(Math.max(0, L1 * L1 - d * d / 4)); let nx = -dy / d, ny = dx / d, s = (-nx + ny * 0.8) >= 0 ? 1 : -1; if (o.elbow === 'out') s = -s; ex += nx * s * h; ey += ny * s * h; }
  const ux0 = hx - ex, uy0 = hy - ey, ul = Math.hypot(ux0, uy0) || 1, ux = ux0 / ul, uy = uy0 / ul, cut = Math.min(S[3], ul), wx = hx - ux * cut, wy = hy - uy * cut;
  const r = (v) => (v <= 0 ? 0 : Math.max(0.9, v * lim));
  E.part();
  if (st === 'tight') { sweep2(E, T, sx, sy, ex, ey, o.mat, 0); sweep2(E, T, ex, ey, wx, wy, o.mat, 0); }
  else { sweep(E, T, sx, sy, ex, ey, r(S[0]), r(S[1]), o.mat, 0); sweep(E, T, ex, ey, wx, wy, r(S[1]), r(S[2]), o.mat, 0); }
  if (st === 'plate') { const nx = -uy, ny = ux, k = (-nx + ny) >= 0 ? -1 : 1; px(E, T, ex + nx * k * 1.6, ey + ny * k * 1.6, o.mat, 4); px(E, T, ex, ey, o.mat, 4); }
  if (st === 'bare') px(E, T, (sx + ex) / 2 - 0.5, (sy + ey) / 2 - 0.5, o.mat, 4);
  if (o.pauldron) {
    E.part(); const pm = o.pauldron, ps = o.pStyle || 'round', q = B ? -1 : 1, x = sx0, sy = sy0;
    run(E, T, sy - 3, x - 1, x + 1, pm, 0); run(E, T, sy - 2, x - 2, x + 2, pm, 0); run(E, T, sy - 1, x - 2 - (B ? 1 : 0), x + 2 + (B ? 0 : 1), pm, 0);
    run(E, T, sy, x - 2 - (B ? 1 : 0), x + 2 + (B ? 0 : 1), o.trim || pm, ps === 'fur' ? 3 : 0);
    if (ps === 'spike') { px(E, T, x, sy - 4, pm, 0); px(E, T, x - q, sy - 5, pm, 4); }
    if (ps === 'fur') { for (let i = -2; i <= 2; i += 2) px(E, T, x + i, sy - 4 + (i & 2 ? 1 : 0), pm, 4); px(E, T, x - 3, sy - 1, pm, 3); }
    else px(E, T, x - 1, sy - 2, pm, 4);
  }
  if (o.cuff) {
    E.part(); const cs = o.cuffStyle || 'band';
    if (cs === 'bracer') sweep(E, T, wx - ux * 1.6, wy - uy * 1.6, wx, wy, 1, 1, o.cuff, 0);
    else if (cs === 'lace') { for (let k = -1; k <= 1; k++) px(E, T, wx - uy * k, wy + ux * k, o.cuff, 0); px(E, T, wx + ux * 0.6, wy + uy * 0.6 + 1, o.cuff, 3); }
    else brush(E, T, wx, wy, cs === 'fur' ? 1.3 : 0.9, o.cuff, 0);
  }
  const gs = o.grip || 'fist';
  if (gs !== 'none' && o.hand) drawHand(E, T, hx, hy, o.hand, gs);
  return { hx, hy, ex: RD(ex), ey: RD(ey), wx: RD(wx), wy: RD(wy) };
};
function drawHand(E, T, hx, hy, m, gs) { E.part(); if (gs === 'big') { rect(E, T, hx - 1, hy - 1, 3, 3, m, 0); px(E, T, hx - 1, hy - 1, m, 4); } else { rect(E, T, hx - 1, hy - 1, 2, 2, m, 0); px(E, T, hx - 1, hy - 1, m, 4); } }
// 单独的手（2×2 / 3×3，一个部件）：手臂先用 grip: 'none' 画袖子（藏在身体后面），握武器的手晚一点再画，压在武器前面。o = { side, at, hand 材质, grip }
parts.hand = function (E, R, P, o) {
  o = o || {}; const B = o.side === 'B', hx = RD(o.at ? o.at[0] : B ? P.bhx : P.hx), hy = RD(o.at ? o.at[1] : B ? P.bhy : P.hy);
  drawHand(E, R, hx, hy, o.hand || o.mat, o.grip || 'fist'); return { hx, hy };
};

// ═════════════════════════ 头与脸 ═════════════════════════
// o = { mat 肤, face: 'round' 圆 | 'square' 方下巴 | 'long' 长脸 | 'gaunt' 瘦削, age: 'young' | 'old' | 'rugged' 粗犷,
//       eye 眼材质（墨 / 发光体）+ eyeStyle: 'dot' | 'narrow' 细长 | 'wide' 带眼白（white 眼白材质）| 'glow' 发光眼, brow 眉材质 + browStyle 1 细 | 2 粗,
//       nose: 'small' | 'big' | 'long' 尖长 | 'hook' 鹰钩 | 'none', mouth: 'line' | 'wide' | 'none', lips 唇材质, ear: 'dot' | 'pointy' 尖耳 | 'none',
//       blush 腮红材质, stubble 胡茬材质, bald 1 = 秃顶反光, shade n = 上 n 行压在帽檐阴影里, veil 面纱材质（面纱和脸必须同一个部件）,
//       wimple 修女头巾包脸带材质（同上：浅色带子和脸同一个部件，外面再用 hood 'wimple' 画黑头巾）}
// 读 P：eyes（1 闭眼）beard（面纱下摆摆）。rig 决定位置（P.head 转头）。返回 { x0, x1, top, bot, ey, eye: [x, y] }
parts.head = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, sh = o.face || 'round', age = o.age || 'young';
  E.part();
  for (let y = top; y <= bot; y++) {
    let a = x0, b = x1;
    if (y === top) { a++; if (sh !== 'square') b--; }
    if (y === bot) { if (sh === 'round') { a++; b--; } else if (sh === 'long' || sh === 'gaunt') a += 2; }
    run(E, T, y, a, b, m, 0);
  }
  if (sh === 'long' || sh === 'gaunt') px(E, T, x1, bot + 1, m, 3);                             // 长下巴
  if (o.shade) for (let y = top; y < top + o.shade; y++) for (let x = x0 + 1; x <= x1; x++) px(E, T, x, y, m, 2);
  const ex = x1 - 1;
  if (P.eyes) { px(E, T, ex, ey, m, 1); px(E, T, ex - 1, ey, m, 1); }
  else if (o.eye) {
    const es = o.eyeStyle || 'dot';
    if (es === 'wide' && o.white) { px(E, T, ex, ey, o.white, 3); px(E, T, ex - 1, ey, o.eye, 1); }
    else if (es === 'narrow') { px(E, T, ex, ey, o.eye, 1); px(E, T, ex - 1, ey, o.eye, 1); }
    else if (es === 'glow') { px(E, T, ex, ey, o.eye, 4); px(E, T, ex - 1, ey, o.eye, 2); }
    else px(E, T, ex, ey, o.eye, 1);
    if (!o.shade) px(E, T, x1, ey, m, 3);
  }
  const bs = o.browStyle || 1, bm = o.brow || m, bt = o.brow ? (age === 'old' ? 4 : 3) : 2;
  if (bs >= 2) run(E, T, ey - 1, ex - 1, x1, bm, bt); else run(E, T, ey - 1, ex, x1, bm, bt);
  const ns = o.nose || 'small';
  if (ns === 'small') px(E, T, x1 + 1, ey + 1, m, 3);
  else if (ns === 'big') { px(E, T, x1 + 1, ey + 1, m, 3); px(E, T, x1 + 1, ey + 2, m, 2); }
  else if (ns === 'long') { px(E, T, x1 + 1, ey + 1, m, 3); px(E, T, x1 + 2, ey + 2, m, 2); }
  else if (ns === 'hook') { px(E, T, x1 + 1, ey, m, 4); px(E, T, x1 + 1, ey + 1, m, 3); px(E, T, x1 + 2, ey + 1, m, 2); }
  const my = Math.min(bot, ey + 3), ms = o.mouth || 'line';
  if (o.lips) { px(E, T, x1, my, o.lips, 3); if (ms === 'wide') px(E, T, x1 - 1, my, o.lips, 2); }
  else if (ms === 'line') px(E, T, x1, my, m, 1); else if (ms === 'wide') { px(E, T, x1, my, m, 1); px(E, T, x1 - 1, my, m, 1); }
  const es = o.ear || 'dot';
  if (es === 'dot') px(E, T, x0 + 1, ey + 1, m, 2);
  else if (es === 'pointy') { px(E, T, x0 + 1, ey + 1, m, 2); px(E, T, x0, ey, m, 0); px(E, T, x0 - 1, ey - 1, m, 0); px(E, T, x0 - 2, ey - 2, m, 4); }
  if (age === 'old') { px(E, T, ex - 2, ey, m, 2); px(E, T, x1, ey + 2, m, 2); }
  else if (age === 'rugged') { px(E, T, ex - 1, ey + 1, m, 4); px(E, T, ex - 2, ey + 2, m, 4); px(E, T, x1 - 1, bot, m, 2); }   // 脸颊一道浅疤 + 下颌阴影
  if (o.blush) px(E, T, ex - 1, ey + 2, o.blush, 3);
  if (o.stubble) for (let y = bot - 1; y <= bot; y++) for (let x = x0 + 2; x <= x1; x++) if (((x + y) & 1) === 0 && !(x === x1 && y === my)) px(E, T, x, y, o.stubble, 2);
  if (o.bald) { px(E, T, x0 + 2, top, m, 4); px(E, T, x0 + 3, top, m, 4); }
  if (o.wimple) {                                                                           // 修女头巾的白色包脸带：和脸同一个部件（额前一行、后脑两列、下巴下一行 + 耳旁褶），不会把脸压出一圈黑边
    const w = o.wimple; run(E, T, top - 1, x0 + 1, x1 - 1, w, 0); run(E, T, top, x0, x1 - 1, w, 0);
    for (let y = top + 1; y <= bot; y++) { px(E, T, x0, y, w, 0); px(E, T, x0 + 1, y, w, y === ey + 1 ? 2 : 0); }
    run(E, T, bot + 1, x0 + 1, x1 - 1, w, 0); px(E, T, x1, bot, m, 3);
  }
  if (o.veil) {                                                                              // 面纱：墨色蕾丝和脸交替成棋盘格，前沿一列帘边，下摆垂到下巴下、随 beard 摆
    const v = o.veil, b = RD(P.beard || 0);
    for (let y = ey - 1; y <= bot; y++) for (let x = x1 - 3; x <= x1; x++) if (((x + y) & 1) === 0 && !(x === ex && y === ey && !P.eyes)) px(E, T, x, y, v, 1);
    for (let y = ey - 1; y <= bot + 1; y++) px(E, T, x1 + 1, y, v, (y & 1) ? 1 : 3);
    for (let x = x1 - 2; x <= x1 + 1; x++) px(E, T, x + (x === x1 + 1 && b > 0 ? 1 : 0), bot + 1 + ((x & 1) ? 1 : 0), v, 1);
    px(E, T, x1 - 3 + Math.min(0, b), bot + 2, v, 1);
  }
  return { x0, x1, top, bot, ey, eye: [ex, ey] };
};
parts.face = parts.head;
parts.veil = (E, R, P, o) => parts.head(E, R, P, Object.assign({}, o, { veil: o.veilMat || o.veil }));   // 面纱是脸的一部分（同一部件），见 head 的 veil

// 头发：o = { style: 'short' | 'long' 披肩 | 'ponytail' 马尾 | 'bun' 发髻 | 'spiky' 刺头 | 'fringe' 秃顶一圈, mat, tie 发绳 / 发簪材质, len 长度 }。读 P.beard（发梢摆）
parts.hair = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, st = o.style || 'short', x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, b = RD(P.beard || 0);
  E.part();
  if (st === 'fringe') { for (let y = top + 2; y <= ey + 2; y++) { px(E, T, x0, y, m, 0); if (y <= ey + 1) px(E, T, x0 + 1, y, m, y === ey + 1 ? 2 : 0); } px(E, T, x0 - 1, top + 3, m, 3); px(E, T, x0 + 2, ey + 2, m, 2); return; }
  // 头顶：上一行盖满，头顶那一行只盖到眉毛后面 3 格——头发（后画的部件）不贴着眉毛，眉眼上不会多出一条分界线
  const fr = ey - top >= 3 ? x1 - 1 : x1 - 3;
  run(E, T, top - 1, x0 + 1, x1 - 1, m, 0); run(E, T, top, x0, fr, m, 0);
  for (let y = top + 1; y <= ey + 1; y++) px(E, T, x0, y, m, 0);
  for (let y = top + 1; y <= ey - 1; y++) px(E, T, x0 + 1, y, m, 0);
  px(E, T, x0 + 2, top - 1, m, 4); px(E, T, x0 + 2, top, m, 2); px(E, T, x1 - 1, top - 1, m, 2);
  if (st === 'long') {
    const L = o.len || 5;
    for (let k = 0; k <= bot - top + L; k++) { const y = top + 1 + k, q = k / (bot - top + L), s = RD(-b * q * q * 1.5); run(E, T, y, x0 - 1 + s, x0 + (k < 4 ? 1 : 0) + s, m, 0); if (k > 1 && (k & 1)) px(E, T, x0 + s, y, m, 2); }
  } else if (st === 'ponytail') {
    if (o.tie) px(E, T, x0 - 1, top + 1, o.tie, 4);
    const L = o.len || 6; for (let k = 1; k <= L; k++) { const q = k / L, x = x0 - 1 - RD(k * 0.55 + (b < 0 ? -b * q : 0)), y = top + 1 + RD(k * (b < 0 ? 0.5 : 0.9) - b * q * q); px(E, T, x, y, m, k === L ? 4 : 0); if (k < L - 1) px(E, T, x, y + 1, m, 2); }
  } else if (st === 'bun') {
    brush(E, T, x0 - 1, top, 1.5, m, 0); px(E, T, x0 - 1, top, m, 2); if (o.tie) { px(E, T, x0 - 3, top - 2, o.tie, 4); px(E, T, x0 - 2, top - 1, o.tie, 3); }
  } else if (st === 'spiky') {
    px(E, T, x0 + 1, top - 2, m, 0); px(E, T, x0, top - 3, m, 4); px(E, T, x0 - 1, top - 1, m, 0); px(E, T, x0 - 2, top - 1, m, 3);
    px(E, T, x0 + 4, top - 2, m, 0); px(E, T, x0 + 3, top - 3, m, 0); px(E, T, x0 + 3, top - 4, m, 4);
  }
};
// 胡须：o = { style: 'long' 长须 | 'full' 络腮 | 'goatee' 山羊胡 | 'mustache' 八字胡, mat, len（长须行数）, join }。读 P.beard（尖端摆 / 八字胡上翘）
// 长须、络腮是自己的部件（外轮廓靠分界线立起来）；八字胡、山羊胡默认 join = 1：不新开部件，紧跟在 head 后面调用就并进脸里——
// 小脸上再压一圈分界线，鼻子和嘴会全变成勾线色（试点的钟表匠、守夜人也是把髭画在脸的部件里）。
parts.beard = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, st = o.style || 'full', x0 = R.hx0, x1 = R.hx1, bot = R.hy, ey = R.ey, b = P.beard || 0, W = R.hw;
  if (!((st === 'mustache' || st === 'goatee') && o.join !== 0 && o.join !== false)) E.part();
  if (st === 'long') {
    const L = o.len || 9;
    for (let k = 0; k <= L; k++) { const y = bot - 1 + k, q = k / L, w = Math.max(1, RD((W - 0.2) * (1 - q * 0.8))), cx = x1 - 1.5 + b * q * q * 1.2 - q * 0.6, a = RD(cx - w / 2); run(E, T, y, a, a + w - 1, m, 0); if (k > 1) for (let x = a + 1; x < a + w - 1; x++) if (((x * 3 + y + 30) % 5) === 0) px(E, T, x, y, m, 2); }
    run(E, T, bot - 1, x1 - 2, x1 + 1, m, 4);
  } else if (st === 'full') {
    run(E, T, ey + 2, x1 - 1, x1 + 1, m, 4);
    for (let y = ey + 3; y <= bot + 2; y++) { const k = y - ey - 3, a = x0 + 2 + (k > 1 ? k - 1 : 0) + RD(b * 0.3 * k * 0.5), z = x1 + (k < 2 ? 1 : 0) + RD(b * 0.3 * k * 0.5); run(E, T, y, a, z, m, 0); if (k === 1) px(E, T, a + 1, y, m, 2); }
    for (let y = ey + 1; y <= bot; y++) px(E, T, x0 + 1, y, m, 0);
  } else if (st === 'goatee') {
    run(E, T, ey + 2, x1 - 1, x1 + 1, m, 3); px(E, T, x1, bot, m, 0); px(E, T, x1 - 1, bot, m, 0); px(E, T, x1, bot + 1, m, 0); px(E, T, x1 + RD(b * 0.5), bot + 2, m, 4);
  } else {
    const y = ey + 2, up = b > 0 ? 1 : b < 0 ? -1 : 0; run(E, T, y, x1 - 1, x1 + 1, m, 0); px(E, T, x1 + 2, y - 1 + (up < 0 ? 1 : 0), m, 4); px(E, T, x1 - 2, y + 1 - (up > 0 ? 1 : 0), m, 3);
  }
};

// ═════════════════════════ 头饰（都在「头饰本地坐标」里画：u = 0 是头的中线，v = 0 是头顶上一行）═════════════════════════
// 公共参数：o.at = [x, y] 掉在地上时的位置（不跟身体走，精灵本地坐标）+ o.rot 翻滚档（0–3，整 90°）；不给 at 时戴在 rig 的头上。
function hwFrame(R, o) { return o.at ? freeFrame(o.rot || 0, RD(o.at[0]), RD(o.at[1])) : frame(R, o.rot || 0, R.hx, R.htop - 1); }
function hwBox(R, o) { return o.at ? { a: -FL((R.hw - 1) / 2), b: R.hw - 1 - FL((R.hw - 1) / 2), h: R.hh } : { a: R.hx0 - R.hx, b: R.hx1 - R.hx, h: R.hh }; }
// 帽子：o = { style: 'wide' 宽檐平顶 | 'pointed' 尖帽 | 'top' 礼帽 | 'tricorn' 三角帽, mat, band 帽带, badge 帽徽 }。读 P.bend（尖帽的帽尖弯折、宽檐后沿下垂）head（尖帽后倾）
parts.hat = function (E, R, P, o) {
  o = o || {}; const T = hwFrame(R, o), H = hwBox(R, o), m = o.mat, st = o.style || 'wide', bend = RD(P.bend || 0), band = o.band || m;
  E.part();
  if (st === 'pointed') {
    run(E, T, 0, H.a - 2, H.b + 3, m, 0); run(E, T, -1, H.a - 1, H.b + 2, m, 0); run(E, T, -2, H.a, H.b, band, 0);
    let ax = 0; for (let k = 0; k <= 7; k++) { const w = Math.max(1, RD(6 - k * 0.72)), cx = 0.5 - k * 0.45 - (o.at ? 0 : (P.head || 0)) * k * 0.12, a = RD(cx - w / 2); run(E, T, -3 - k, a, a + w - 1, m, 0); if (k === 7) ax = a; }
    const ay = -10; px(E, T, ax - 1, ay - 1, m, 0); px(E, T, ax - 2, ay - 1, m, 0); px(E, T, ax - 3, ay - 1 + (bend >= 1 ? 1 : 0), m, 0);
    if (bend >= 2) px(E, T, ax - 4, ay + 1, m, 0); if (bend >= 3) px(E, T, ax - 4, ay + 2, m, 0);
    if (o.badge) { px(E, T, 0, -4, o.badge, 4); px(E, T, 1, -5, o.badge, 3); }
  } else if (st === 'top') {
    run(E, T, 0, H.a - 1, H.b + 2, m, 0); px(E, T, H.a - 2, -1, m, 0); px(E, T, H.b + 3, -1, m, 3);
    for (let v = -1; v >= -6; v--) { const s = v <= -4 ? -1 : 0; run(E, T, v, H.a + 1 + s, H.b + s, v === -2 ? band : m, v === -6 ? 4 : 0); }
    px(E, T, H.a + 1, -5, m, 4);
    if (o.badge) px(E, T, H.b - 1, -2, o.badge, 4);
  } else if (st === 'tricorn') {
    run(E, T, 0, H.a - 2, H.b + 2, m, 0); run(E, T, -1, H.a - 3, H.b + 3, m, 0); px(E, T, H.a - 4, -2, m, 0); px(E, T, H.b + 4, -2, m, 4); px(E, T, 0, -2, m, 0);
    run(E, T, -2, H.a, H.b, m, 0); run(E, T, -3, H.a + 1, H.b - 1, m, 0); run(E, T, -1, H.a - 1, H.b + 1, band, 2);
    if (o.badge) px(E, T, H.b, -2, o.badge, 4);
  } else {
    run(E, T, 0, H.a - 3, H.b + 3, m, 0); if (bend >= 2) px(E, T, H.a - 4, 1, m, 0);
    run(E, T, -1, H.a, H.b, band, 2); run(E, T, -2, H.a, H.b, m, 0); run(E, T, -3, H.a, H.b, m, 0); px(E, T, H.a, -3, m, 4);
    if (o.badge) px(E, T, H.b - 1, -1, o.badge, 4);
  }
};
// 兜帽：分两层画——o.layer 'back'（头之前：帽身、后脑、披到肩背的垂布）→ parts.head → 'front'（头之后：鸟喙前檐压在眉眼上）。
// o = { style: 'hood' 圆兜帽 | 'cowl' 尖顶僧帽 | 'wimple' 修女黑头巾（只有后层；包脸的白带子用 head 的 wimple）, mat, layer }。读 P.bend（垂布后摆）
parts.hood = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, st = o.style || 'hood', x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, bend = RD(P.bend || 0);
  E.part();
  if (o.layer === 'front') {
    if (st === 'wimple') return;                                                             // 修女头巾的白带子画在脸里（head 的 wimple），这里没有前层
    run(E, T, top, x0 + 1, x1 + 1, m, 0); px(E, T, x1 + 1, top + 1, m, 3); px(E, T, x1, top, m, 4);
    return;
  }
  const wim = st === 'wimple' ? 1 : 0;
  run(E, T, top - 2 - wim, x0 + 1, x1 - 2 + wim, m, 0); run(E, T, top - 1 - wim, x0 - 1, x1 - 1 + wim, m, 0); if (wim) run(E, T, top - 1, x0 - 1, x1, m, 0);
  for (let y = top; y <= bot + 1; y++) run(E, T, y, x0 - 1 - (y > ey ? 1 : 0) - wim, x0 + 1 - wim, m, 0);
  for (let y = top; y <= ey - 1; y++) px(E, T, x1, y, m, 0);
  const dr = st === 'wimple' ? 6 : 3;
  for (let k = 0; k < dr; k++) run(E, T, bot + 1 + k, x0 - 2 - RD(k * 0.5) - (k >= dr - 2 ? bend : 0), x0 + 2 - RD(k * 0.3), m, k === dr - 1 ? 2 : 0);
  px(E, T, x0, top + 1, m, 2); px(E, T, x0 - 1, ey + 1, m, 2);
  if (st === 'cowl') { px(E, T, x0, top - 3, m, 0); px(E, T, x0 - 1, top - 4, m, 0); px(E, T, x0 - 2, top - 4 + (bend > 0 ? 1 : 0), m, 4); }
};
// 头盔（画在头之后，盖住头）：o = { style: 'great' 平顶桶盔 | 'kettle' 宽边铁帽 | 'horned' 角盔 | 'nasal' 护鼻尖盔, mat, trim 盔箍 / 面饰, eye 眼光材质（great），
//       nasal 0 = 不画护鼻条（horned / nasal；默认画，只到眼睛那一行，不压鼻子）,
//       horn 角材质 + hornSize 角长 3–9（默认 4）+ hornCurve 'crescent' 月牙（默认）| 'up' | 'back' | 'ram' + hornBand 角根箍, horns 0 = 不画角（horned 的角就是 parts.horns，在盔帽之前画、根部压在盔下；
//       要更大的角调 hornSize，不要再叠一个 parts.horns——两对角会杂乱）,
//       crest 盔缨材质 }。读 P：eyes（眼光熄灭）beard（盔缨尖摆）head（角随头转）。角、盔缨各自单独一个部件。返回 { tipF, tipB }（horned 的角尖）
parts.helm = function (E, R, P, o) {
  o = o || {}; const T = hwFrame(R, o), H = hwBox(R, o), m = o.mat, tr = o.trim || m, st = o.style || 'great', nasal = o.nasal !== 0 && o.nasal !== false;
  const top = 1, bot = H.h, ey = RD(H.h * 0.4) + 1; let out;
  if (st === 'horned' && o.horns !== 0) out = parts.horns(E, R, P, { mat: o.horn || tr, size: o.hornSize || 4, curve: o.hornCurve || 'crescent', band: o.hornBand, y: top, at: o.at, rot: o.rot });   // 角先画（根部压在盔帽下面），不吃脸、不给护鼻条压分界线
  E.part();
  if (st === 'great') {
    run(E, T, top - 1, H.a, H.b - 1, m, 0);
    for (let v = top; v <= bot; v++) run(E, T, v, H.a - 1, H.b + (v === bot ? 0 : 1), m, 0);
    run(E, T, top, H.a - 1, H.b + 1, tr, 0); px(E, T, H.a - 1, top, tr, 4);
    run(E, T, top + 1, 0, H.b + 1, m, 4);
    run(E, T, ey, 0, H.b + 1, m, 1); if (!P.eyes && o.eye) px(E, T, H.b, ey, o.eye, 3);
    for (let v = ey + 1; v < bot; v++) px(E, T, H.b, v, tr, 0);
    px(E, T, H.b + 1, ey + 2, m, 1); px(E, T, H.a + 1, ey + 2, m, 2);
  } else if (st === 'kettle') {
    run(E, T, top - 1, H.a + 1, H.b - 1, m, 0); run(E, T, top, H.a, H.b, m, 0); run(E, T, top + 1, H.a - 3, H.b + 3, m, 0); px(E, T, H.a - 3, top + 1, m, 4);
    run(E, T, top + 1, H.a, H.b, tr, 2); px(E, T, H.a + 1, top - 1, m, 4); px(E, T, 0, top, m, 4);
  } else if (st === 'horned') {
    run(E, T, top - 1, H.a + 1, H.b - 1, m, 0); run(E, T, top, H.a, H.b, m, 0); run(E, T, top + 1, H.a - 1, H.b, tr, 0); px(E, T, H.a + 1, top - 1, m, 4);
    if (nasal) for (let v = top + 2; v <= ey; v++) px(E, T, H.b, v, tr, v === top + 2 ? 4 : 0);                // 护鼻条：到眼睛那一行为止，鼻尖露在外面
  } else {
    px(E, T, 0, top - 4, m, 4); run(E, T, top - 3, -1, 1, m, 0); run(E, T, top - 2, H.a + 1, H.b - 1, m, 0); run(E, T, top - 1, H.a, H.b, m, 0); run(E, T, top, H.a, H.b, m, 0);
    run(E, T, top + 1, H.a - 1, H.b, tr, 0); px(E, T, H.a + 1, top - 2, m, 4); px(E, T, -1, top - 3, m, 4);
    if (nasal) for (let v = top + 2; v <= ey; v++) px(E, T, H.b, v, tr, v === ey ? 2 : 0);
  }
  if (o.crest) {                                                                             // 盔缨：盔顶拱起、向后披，逐行收窄，尖端会摆
    E.part(); const c = o.crest, b = P.beard || 0, h = (k) => RD(b * k), v0 = st === 'nasal' ? top - 4 : top - 1;
    run(E, T, v0 - 2, -1, 1, c, 0); run(E, T, v0 - 1, -3, 2, c, 0); run(E, T, v0, -5, 1, c, 0); run(E, T, v0 + 1, -7, -3, c, 0);
    run(E, T, v0 + 2, -8 + h(0.3), -5, c, 0); run(E, T, v0 + 3, -8 + h(0.6), -6 + h(0.3), c, 0); px(E, T, -8 + h(0.9), v0 + 4, c, 0);
    px(E, T, -1, v0 - 1, c, 2); px(E, T, -3, v0, c, 2); px(E, T, -5, v0 + 1, c, 2); px(E, T, 0, v0 - 2, c, 4);
  }
  return out || {};
};
// 王冠：o = { mat（金）, gem 宝石材质, grand 1 = 大冠（多一个齿、更宽）}。三个齿中间高 2 格，纯黑剪影里能看出台阶。读 P.glint
parts.crown = function (E, R, P, o) {
  o = o || {}; const T = hwFrame(R, o), H = hwBox(R, o), m = o.mat, g = o.gem || m, W = o.grand ? 1 : 0;
  E.part();
  run(E, T, 0, H.a - W, H.b + W, m, 0); run(E, T, -1, H.a - W, H.b + W, m, 0);
  const xs = W ? [H.a - 1, H.a + 2, H.b - 1, H.b + 1] : [H.a, RD((H.a + H.b) / 2), H.b], hs = W ? [2, 4, 4, 2] : [2, 4, 2];
  for (let i = 0; i < xs.length; i++) for (let k = 1; k <= hs[i]; k++) px(E, T, xs[i], -1 - k, m, k === hs[i] ? 4 : 0);
  px(E, T, RD((H.a + H.b) / 2), 0, g, 3); px(E, T, H.a + 1, -1, g, 2); if (P.glint) px(E, T, RD((H.a + H.b) / 2) + 1, -6, g, 4);
};
// 缠头巾：o = { mat, gem 额前宝石, plume 羽饰材质 }。比头大一圈的布团 + 斜向缠纹 + 额前宝石 + 羽饰 + 脑后垂下的巾尾。读 P.beard（巾尾 / 羽饰摆）
parts.turban = function (E, R, P, o) {
  o = o || {}; const T = hwFrame(R, o), H = hwBox(R, o), m = o.mat, b = RD(P.beard || 0);
  E.part();
  const rows = [[H.a + 1, H.b - 1], [H.a - 1, H.b + 1], [H.a - 1, H.b + 1], [H.a - 1, H.b + 1], [H.a, H.b]];
  for (let k = 0; k < rows.length; k++) { const v = -3 + k; run(E, T, v, rows[k][0], rows[k][1], m, 0); for (let x = rows[k][0] + ((k * 2) % 3); x <= rows[k][1]; x += 3) px(E, T, x, v, m, 2); }
  for (let v = 2; v <= 5 + (H.h > 6 ? 1 : 0); v++) run(E, T, v, H.a - 1 - (v > 3 ? RD(b * 0.5) : 0), H.a - (v > 4 ? 1 : 0), m, v === 5 ? 3 : 0);
  if (o.gem) { px(E, T, H.b, -1, o.gem, 4); px(E, T, H.b, 0, o.gem, 2); }
  if (o.plume) { E.part(); const p = o.plume; px(E, T, H.b - 1, -4, p, 0); px(E, T, H.b - 1 - (b < 0 ? 1 : 0), -5, p, 0); px(E, T, H.b - 2 - (b < 0 ? 1 : 0), -6, p, 4); px(E, T, H.b - 3 + (b > 0 ? 1 : 0), -7, p, 3); }
};

// ═════════════════════════ 武器几何：握点、吸附方向、90° 武器头 ═════════════════════════
const DIRS = [[0, -1], [1, -2], [1, -1], [2, -1], [1, 0], [2, 1], [1, 1], [1, 2], [0, 1], [-1, 2], [-1, 1], [-2, 1], [-1, 0], [-2, -1], [-1, -1], [-1, -2]];
const DANG = DIRS.map((d) => Math.atan2(d[0], -d[1])), MAJ = DIRS.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1])) / Math.hypot(d[0], d[1]));
function snapDir(a) { let bi = 0, bd = 9; for (let i = 0; i < 16; i++) { let d = Math.abs(a - DANG[i]) % (2 * Math.PI); if (d > Math.PI) d = 2 * Math.PI - d; if (d < bd - 1e-9) { bd = d; bi = i; } } return bi; }
const quad = (a) => ((RD(a / HALF) % 4) + 4) % 4;
function cell(di, x0, y0, k) { const sx = DIRS[di][0], sy = DIRS[di][1]; return Math.abs(sy) >= Math.abs(sx) ? [x0 + SG(sx) * FL(k * Math.abs(sx) / Math.abs(sy)), y0 + k * SG(sy)] : [x0 + k * SG(sx), y0 + SG(sy) * FL(k * Math.abs(sy) / Math.abs(sx))]; }
// 沿吸附方向画直条：k 沿条（主轴步数），j 横跨宽度 w（j = 0 在受光的左 / 上侧）；cb(k, j, X, Y)
function bar(di, x0, y0, k0, k1, w, cb) {
  const sx = DIRS[di][0], sy = DIRS[di][1], vert = Math.abs(sy) >= Math.abs(sx), c0 = Math.ceil((w - 1) / 2);
  for (let k = k0; k <= k1; k++) { const c = cell(di, x0, y0, k); for (let j = 0; j < w; j++) { const off = j - c0; cb(k, j, vert ? c[0] + off : c[0], vert ? c[1] : c[1] + off); } }
}
parts.snapDir = snapDir; parts.bar = bar; parts.cell = cell;
// 握点：o.hand 'F'（P.hx, hy, a）| 'B'（P.bhx, bhy, ba）；o.at / o.a 覆盖（掉在地上的武器配 o.free = 1，坐标是精灵本地坐标、不跟身体转）
function grip(P, o) { const B = o.hand === 'B'; return [RD(o.at ? o.at[0] : B ? P.bhx : P.hx), RD(o.at ? o.at[1] : B ? P.bhy : P.hy), o.a != null ? o.a : (B ? P.ba : P.a) || 0]; }
// 细长武器的起点：让 2×2 手正好盖住握把（k = 0、-1 在手里，k = 1 是护手 / 刃根）
function org(di, gx, gy) { return [DIRS[di][0] < 0 ? gx - 1 : gx, DIRS[di][1] < 0 ? gy - 1 : gy]; }
// 某个吸附武器上第 k 步的位置（放后手、算挂点）：parts.along(P, o, k)
parts.along = function (P, o, k) { o = o || {}; const g = grip(P, o), di = snapDir(g[2]), s = org(di, g[0], g[1]); return cell(di, s[0], s[1], RD(k * MAJ[di])); };
// 直柄武器（斧、锤、戟、铲、杖）柄上距握点 d 格的点：parts.onShaft(P, o, d)
parts.onShaft = function (P, o, d) { o = o || {}; const g = grip(P, o); return [RD(g[0] + Math.sin(g[2]) * d), RD(g[1] - Math.cos(g[2]) * d)]; };
// 90° 武器头：rows 从远端（朝外）到近端，anchor = 柄插进去的套口格；朝上时 u 向右 = 刃口朝前
function stamp(E, T, ax, ay, q, S, roles, mirror) {
  const rows = S.rows, cx = S.anchor[0], cy = S.anchor[1];
  for (let r = 0; r < rows.length; r++) for (let c = 0; c < rows[r].length; c++) {
    const ch = rows[r][c], role = roles[ch]; if (!role || !role[0]) continue;
    const u = (mirror ? -1 : 1) * (c - cx), v = r - cy; let dx, dy;
    if (q === 0) { dx = u; dy = v; } else if (q === 1) { dx = -v; dy = u; } else if (q === 2) { dx = -u; dy = -v; } else { dx = v; dy = -u; }
    px(E, T, ax + dx, ay + dy, role[0], role[1]);
  }
}
function stampCenter(S, ax, ay, q, mirror) { const u = (mirror ? -1 : 1) * (S.center[0] - S.anchor[0]), v = S.center[1] - S.anchor[1]; return q === 0 ? [ax + u, ay + v] : q === 1 ? [ax - v, ay + u] : q === 2 ? [ax - u, ay - v] : [ax + v, ay - u]; }
// 发光档（5 档：0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）→ 单格的 [材质, 色调]
function glowCell(o, lv, strong) { const g = o.gem || o.glow || o.metal, w = o.glow || g; return lv === 4 ? [g, 1] : lv === 3 ? [w, strong ? 4 : 3] : lv === 2 ? [w, strong ? 3 : 4] : lv === 1 ? [g, 4] : [g, 3]; }
function roles(o, P) {
  const mt = o.metal, lv = CL(o.glowLv != null ? o.glowLv : P.gem || 0, 0, 4);
  return { M: [mt, 0], m: [mt, 2], H: [mt, 4], d: [mt, 1], E: [o.edge || mt, 4], e: [o.edge || mt, 3], T: [o.trim || mt, 0], t: [o.trim || mt, 4], W: [o.wood || mt, 0], w: [o.wood || mt, 2],
    G: (o.glow || o.gem) ? glowCell(o, lv, 1) : [mt, 2], g: (o.glow || o.gem) ? glowCell(o, lv, 0) : [mt, 0] };
}
const HEADS = {
  axe:     { rows: ['.MMME', 'mMMME', '.M.ME', '.M..E', '.M.E.', '.T...'], anchor: [1, 5], center: [2, 1], len: 8, back: 4 },          // 胡子斧：上半实心、上沿平，刃口沿柄往下垂成「胡子」，胡子和柄之间留空（竖放、横放都读成斧）
  battle:  { rows: ['.H...E.', '.M...ME', '.M..MME', 'mMMMMME', 'mMMGMME', 'mMMMMME', '.M..MME', '.M...ME', '.M...E.', '.T.....'], anchor: [1, 9], center: [3, 4], len: 11, back: 7 },   // 月牙：只在中间 3 行连柄，两只月牙尖往回勾，背后 3 格空（剪影里也看得出凹口）
  double:  { rows: ['EE.M.EE', 'EMMMMME', 'EMMGMME', 'EMMMMME', 'EE.M.EE'], anchor: [3, 4], center: [3, 2], len: 11, back: 7 },
  hammer:  { rows: ['..H..', 'MMMMM', 'MMGMM', 'MMMMM', '.mTm.'], anchor: [2, 4], center: [2, 2], len: 8, back: 3 },
  maul:    { rows: ['.MMMMM.', 'MMMMMMM', 'MMMGMMM', 'MMMMMMM', '.mmTmm.'], anchor: [3, 4], center: [3, 2], len: 11, back: 7 },
  mace:    { rows: ['..H..', '.MMM.', 'HMGMm', '.MMM.', '..m..', '..T..'], anchor: [2, 5], center: [2, 2], len: 7, back: 3 },
  halberd: { rows: ['..H...', '..M...', '..M...', 'm.MMEE', 'mmMGME', '..MMEE', '..T...'], anchor: [2, 6], center: [3, 4], len: 13, back: 12 },
  trident: { rows: ['..H..', 'H.M.H', 'M.M.M', 'MMGMM', '..T..'], anchor: [2, 4], center: [2, 2], len: 13, back: 12 },
  cleaver: { rows: ['mMMMME', 'mdMMME', 'mMMGME', 'mMMMME', 'mMMMME', 'mMMMME', 'TT....'], anchor: [0, 6], center: [3, 3], len: 3, back: 2 },
  shovel:  { rows: ['.EEE.', 'EMMME', 'MMMMM', 'MMGMM', 'mMMMm', '.mTm.'], anchor: [2, 5], center: [2, 2], len: 13, back: 6 },
  pick:    { rows: ['HMMMMMMH', '...T....'], anchor: [3, 1], center: [3, 0], len: 9, back: 4 },
  crook:   { rows: ['.WW.', 'W..W', 'W..W', 'W...'], anchor: [0, 3], center: [1, 1], len: 12, back: 10 },
};
parts.HEADS = HEADS;
// 直柄 + 90° 头：o = { head: HEADS 名, metal, wood, trim, edge, glow / gem 发光体材质, len 握点到套口, back 握点后柄长, mirror 刃朝后, hand, at / a / free }
// 两个部件：柄 → 头（头压在柄上出分界线）。返回 { head: [x, y] 头中心（发光体 / 命中挂点）, butt: [x, y] 柄尾, q 头的朝向档 }
function poled(E, R, P, o, def) {
  const S = HEADS[o.head || def] || HEADS[def], T = o.free ? FREE : R, g = grip(P, o), a = g[2], dx = Math.sin(a), dy = -Math.cos(a);
  const len = o.len != null ? o.len : S.len, back = o.back != null ? o.back : S.back, ax = RD(g[0] + dx * len), ay = RD(g[1] + dy * len), q = quad(a);
  const bx = g[0] - dx * back, by = g[1] - dy * back;
  E.part(); line(E, T, bx, by, ax, ay, o.wood, 3);
  if (o.trim) px(E, T, bx, by, o.trim, 3);
  E.part(); stamp(E, T, ax, ay, q, S, roles(o, P), o.mirror);
  if (P.glint && (o.glow || o.gem)) { const c = stampCenter(S, ax, ay, q, o.mirror); px(E, T, c[0] - 1, c[1] - 1, o.glow || o.gem, 4); }
  return { head: stampCenter(S, ax, ay, q, o.mirror), butt: [RD(bx), RD(by)], q, socket: [ax, ay] };
}
function poledFocus(P, o, def) { o = o || {}; const S = HEADS[o.head || def] || HEADS[def], g = grip(P, o), a = g[2], len = o.len != null ? o.len : S.len; return stampCenter(S, RD(g[0] + Math.sin(a) * len), RD(g[1] - Math.cos(a) * len), quad(a), o.mirror); }
parts.axe = (E, R, P, o) => poled(E, R, P, o || {}, 'axe'); parts.axe.focus = (P, o) => poledFocus(P, o, 'axe');
parts.hammer = (E, R, P, o) => poled(E, R, P, o || {}, 'hammer'); parts.hammer.focus = (P, o) => poledFocus(P, o, 'hammer');
parts.halberd = (E, R, P, o) => poled(E, R, P, o || {}, 'halberd'); parts.halberd.focus = (P, o) => poledFocus(P, o, 'halberd');
parts.shovel = (E, R, P, o) => poled(E, R, P, o || {}, 'shovel'); parts.shovel.focus = (P, o) => poledFocus(P, o, 'shovel');
parts.cleaver = (E, R, P, o) => poled(E, R, P, o || {}, 'cleaver'); parts.cleaver.focus = (P, o) => poledFocus(P, o, 'cleaver');

// 剑类（吸附斜率）：o = { style: 'long' | 'broad' 阔剑 | 'great' 双手大剑 | 'rapier' 细剑 | 'saber' 弯刀 | 'dagger' 匕首 | 'knife' 刀,
//   metal 刃, trim 护手 / 柄头, wood 握把, edge 刃口亮色, glow 附魔材质（刃里的符文，和刃同一部件）, len 刃长, w 刃宽, guard 护手宽, hand, at / a / free }
// 读 P：gem（附魔档）glint。一个部件。返回 { tip, guard, mid, di }
const SWORD = { long: [10, 2, 3], broad: [9, 3, 5], great: [14, 3, 5], rapier: [12, 1, 3], saber: [10, 2, 3], dagger: [5, 1, 3], knife: [4, 2, 0] };
function swordGeo(P, o) {
  const S = SWORD[o.style] || SWORD.long, g = grip(P, o), di = snapDir(g[2]), s = org(di, g[0], g[1]);
  const n = Math.max(2, RD((o.len || S[0]) * MAJ[di])), w = o.w || S[1], gw = o.guard != null ? o.guard : S[2];
  return { S, di, s, n, w, gw, tip: cell(di, s[0], s[1], n + 1), mid: cell(di, s[0], s[1], 1 + RD(n * 0.6)) };
}
parts.sword = function (E, R, P, o) {
  o = o || {}; const T = o.free ? FREE : R, G = swordGeo(P, o), di = G.di, x0 = G.s[0], y0 = G.s[1], n = G.n, w = G.w, st = o.style || 'long', mt = o.metal, tr = o.trim || mt;
  const lv = CL(o.glowLv != null ? o.glowLv : P.gem || 0, 0, 4), gl = o.glow;
  E.part();
  bar(di, x0, y0, -2 - (st === 'great' ? 1 : 0), -2 - (st === 'great' ? 1 : 0), 1, (k, j, X, Y) => px(E, T, X, Y, tr, 4));       // 柄头
  bar(di, x0, y0, -1 - (st === 'great' ? 1 : 0), 0, 1, (k, j, X, Y) => px(E, T, X, Y, o.wood || tr, 2));                              // 握把（被手盖住）
  if (G.gw) { const c = cell(di, x0, y0, 1), pd = (di + 4) % 16, h = FL(G.gw / 2); bar(pd, c[0], c[1], -h, h, 1, (k, j, X, Y) => px(E, T, X, Y, tr, k === -h ? 4 : k === h ? 2 : 3)); }
  else bar(di, x0, y0, 1, 1, 1, (k, j, X, Y) => px(E, T, X, Y, tr, 3));
  const bend = st === 'saber' ? RD(n * 0.66) : 99;
  bar(di, x0, y0, 2, n + 1, w, (k, j, X, Y) => {
    const tip = k === n + 1, c0 = Math.ceil((w - 1) / 2); if (tip && j !== c0 && w > 1) return;
    if (k > bend) { const vert = Math.abs(DIRS[di][1]) >= Math.abs(DIRS[di][0]); if (vert) X -= SG(DIRS[di][0]) || -1; else Y += 1; }   // 弯刀：刃的后三分之一向刃背弯 1 格
    let m = mt, t = w === 1 ? (tip ? 4 : 3) : j === 0 ? 4 : j === w - 1 ? 2 : 3;
    if (o.edge && j === 0 && w > 1) m = o.edge;
    if (st === 'broad' && w >= 3 && j === 1 && k < n) t = 2;                                     // 血槽
    if (gl && j === Math.min(c0, w - 1) && !tip) { const every = lv === 0 ? 4 : lv === 1 ? 3 : 2; if (lv === 3) { m = gl; t = 4; } else if (lv === 4) { if ((k % 3) === 0) t = 1; } else if ((k % every) === 0) { m = gl; t = lv === 2 ? 4 : 3; } }
    if (gl && lv === 3 && j !== c0 && !tip) { m = gl; t = 3; }
    px(E, T, X, Y, m, t);
  });
  if (P.glint) { const c = cell(di, x0, y0, n + 2); px(E, T, c[0], c[1], gl || o.edge || mt, 4); }
  return { tip: G.tip, guard: cell(di, x0, y0, 1), mid: G.mid, di };
};
parts.sword.focus = (P, o) => swordGeo(P, o || {}).mid;
parts.dagger = (E, R, P, o) => parts.sword(E, R, P, Object.assign({ style: 'dagger' }, o)); parts.dagger.focus = (P, o) => swordGeo(P, Object.assign({ style: 'dagger' }, o)).tip;
parts.knife = (E, R, P, o) => parts.sword(E, R, P, Object.assign({ style: 'knife' }, o)); parts.knife.focus = (P, o) => swordGeo(P, Object.assign({ style: 'knife' }, o)).tip;

// 矛（吸附斜率）：o = { style: 'leaf' 叶形 | 'spike' 锥形 | 'wing' 翼矛, wood 杆, metal 矛头, trim 銎, tassel 缨穗材质, len 握点前杆长, back 握点后杆长, hand, at / a / free }
// 读 P：beard（缨穗摆）glint。一个部件（杆 + 头，头和杆之间是自动明暗）。返回 { tip, socket, di }
const SPEAR = { leaf: [1, 3, 3, 2, 1, 1], spike: [1, 1, 1, 1, 1], wing: [3, 1, 3, 3, 1, 1, 1] };
function spearGeo(P, o) { const g = grip(P, o), di = snapDir(g[2]), s = org(di, g[0], g[1]), n = RD((o.len != null ? o.len : 11) * MAJ[di]), back = RD((o.back != null ? o.back : 10) * MAJ[di]), prof = SPEAR[o.style] || SPEAR.leaf; return { di, s, n, back, prof, tip: cell(di, s[0], s[1], n + prof.length) }; }
parts.spear = function (E, R, P, o) {
  o = o || {}; const T = o.free ? FREE : R, G = spearGeo(P, o), di = G.di, x0 = G.s[0], y0 = G.s[1], n = G.n, prof = G.prof, mt = o.metal;
  E.part();
  bar(di, x0, y0, -G.back, n - 1, 1, (k, j, X, Y) => px(E, T, X, Y, o.wood, 3));
  bar(di, x0, y0, n, n, 1, (k, j, X, Y) => px(E, T, X, Y, o.trim || mt, 3));
  for (let i = 0; i < prof.length; i++) { const k = n + 1 + i, w = prof[i]; bar(di, x0, y0, k, k, w, (kk, j, X, Y) => px(E, T, X, Y, mt, i === prof.length - 1 ? 4 : w === 1 ? 3 : j === 0 ? 4 : j === w - 1 ? 2 : 3)); }
  if (o.tassel) { const c = cell(di, x0, y0, n), b = RD((P.beard || 0) * 0.5); px(E, T, c[0], c[1] + 1, o.tassel, 3); px(E, T, c[0] - b, c[1] + 2, o.tassel, 2); px(E, T, c[0] - 1 - b, c[1] + 2, o.tassel, 3); }
  if (P.glint) px(E, T, G.tip[0], G.tip[1] - 1, mt, 4);
  return { tip: G.tip, socket: cell(di, x0, y0, n), di };
};
parts.spear.focus = (P, o) => spearGeo(P, o || {}).tip;

// 法杖：o = { style: 'gem' 杖爪抓宝石 | 'orb' 宝珠 | 'crook' 弯钩 | 'plain' 两端包铁, wood, trim 爪 / 包铁, gem 宝石材质, glow 发光材质, len, back, hand, at / a / free }
// 读 P：gem（宝石 5 档）glint。杖身一个部件，宝石另一个部件（伸出杖外的发光体单独 part）。返回 { gem: [x, y] 发光体中心, tip }
const GEM_SHAPE = [0, -2, -1, -1, 0, -1, 1, -1, -1, 0, 0, 0, 1, 0, 0, 1];
const GEM_LV = [[0, 4, 0, 4, 0, 3, 0, 3, 0, 3, 0, 2, 0, 2, 0, 1], [1, 3, 0, 4, 0, 4, 0, 3, 0, 4, 0, 3, 0, 2, 0, 2], [1, 3, 1, 3, 1, 3, 0, 4, 0, 4, 0, 4, 0, 3, 0, 3], [1, 3, 1, 3, 1, 3, 1, 1, 1, 3, 1, 3, 0, 4, 0, 4], [0, 2, 0, 2, 0, 2, 0, 1, 0, 2, 0, 1, 0, 1, 0, 1]];
function staffGeo(P, o) { const g = grip(P, o), a = g[2], dx = Math.sin(a), dy = -Math.cos(a), len = o.len != null ? o.len : 13; return { g, dx, dy, len, tip: [g[0] + dx * len, g[1] + dy * len], gem: [RD(g[0] + dx * (len + 2.5)), RD(g[1] + dy * (len + 2.5))] }; }
parts.staff = function (E, R, P, o) {
  o = o || {}; const T = o.free ? FREE : R, G = staffGeo(P, o), g = G.g, dx = G.dx, dy = G.dy, st = o.style || 'gem', back = o.back != null ? o.back : 12, tx = G.tip[0], ty = G.tip[1], lv = CL(o.glowLv != null ? o.glowLv : P.gem || 0, 0, 4);
  E.part(); line(E, T, g[0] - dx * back, g[1] - dy * back, tx, ty, o.wood, 3);
  const tr = o.trim || o.wood;
  if (st === 'gem') { px(E, T, tx - dy * 1.5 + dx, ty + dx * 1.5 + dy, tr, 2); px(E, T, tx + dy * 1.5 + dx, ty - dx * 1.5 + dy, tr, 2); }
  else if (st === 'plain') { px(E, T, g[0] - dx * back, g[1] - dy * back, tr, 3); px(E, T, tx, ty, tr, 4); px(E, T, tx - dx, ty - dy, tr, 3); }
  else if (st === 'crook') stamp(E, T, RD(tx), RD(ty), quad(g[2]), HEADS.crook, { W: [o.wood, 3] }, o.mirror);
  else if (st === 'orb') { px(E, T, tx, ty, tr, 3); px(E, T, tx - dy, ty + dx, tr, 2); px(E, T, tx + dy, ty - dx, tr, 2); }
  if (st === 'gem' || st === 'orb') {
    E.part(); const cx = G.gem[0], cy = G.gem[1], gm = o.gem, wm = o.glow || gm, L = GEM_LV[lv];
    if (st === 'gem') for (let i = 0; i < 8; i++) px(E, T, cx + GEM_SHAPE[i * 2], cy + GEM_SHAPE[i * 2 + 1], L[i * 2] ? wm : gm, L[i * 2 + 1]);
    else { const c = glowCell(o, lv, 1), e = glowCell(o, lv, 0); px(E, T, cx, cy, c[0], c[1]); for (const [ax, ay] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(E, T, cx + ax, cy + ay, e[0], ay < 0 || ax < 0 ? Math.min(4, e[1] + (lv < 4 ? 0 : 0)) : Math.max(1, e[1] - 1)); px(E, T, cx - 1, cy - 1, gm, lv === 4 ? 1 : 2); px(E, T, cx + 1, cy - 1, gm, 2); px(E, T, cx - 1, cy + 1, gm, 2); px(E, T, cx + 1, cy + 1, gm, lv === 4 ? 1 : 2); }
    if (P.glint) px(E, T, cx - 1, cy - 1 - (st === 'gem' ? 1 : 0), wm, 4);
  }
  return { gem: G.gem, tip: [RD(tx), RD(ty)] };
};
parts.staff.focus = (P, o) => staffGeo(P, o || {}).gem;

// 弓（前手握弓身）：o = { wood 弓臂, string 弦, arrow 箭杆, head 箭头, fletch 箭羽, len 半弓长, pull 拉弦档（默认 P.pull 0–3）, nock: [x, y] 搭箭点（默认后手 P.bhx/bhy）, rot / at / free }
// 两个部件：弓（弓臂 + 弦）→ 箭（pull ≥ 1 或 o.nocked）。返回 { tip: 箭头位置, nock }
parts.bow = function (E, R, P, o) {
  o = o || {}; const g = grip(P, o), pull = CL(RD(o.pull != null ? o.pull : P.pull || 0), 0, 3), L = o.len || 8, bend = 1.6 + pull * 0.7, T = o.free ? freeFrame(o.rot || 0, g[0], g[1]) : frame(R, o.rot || 0, g[0], g[1]);
  const nk = o.nock ? [o.nock[0] - g[0], o.nock[1] - g[1]] : P.bhx != null ? [RD(P.bhx) - g[0], RD(P.bhy) - g[1]] : [-2, 0];
  E.part();
  for (let r = -L; r <= L; r++) { const q = r / L, x = RD(-bend * q * q) + (Math.abs(r) === L ? 1 : 0); px(E, T, x, r, o.wood, Math.abs(r) <= 1 ? 3 : Math.abs(r) === L ? 4 : 0); if (Math.abs(r) <= 2) px(E, T, x + 1, r, o.wood, 2); }
  const tipX = RD(-bend) + 1, s = o.string || o.wood;
  if (pull && nk[0] < tipX) { line(E, T, tipX - 1, -L + 1, nk[0], nk[1], s, 3); line(E, T, nk[0], nk[1], tipX - 1, L - 1, s, 3); }
  else line(E, T, tipX - 1, -L + 1, tipX - 1, L - 1, s, 3);
  let tip = null;
  if (o.arrow && (pull >= 1 || o.nocked)) {
    E.part(); const ax0 = pull ? nk[0] : tipX - 1, ay = pull ? nk[1] : 0, ax1 = 4;
    run(E, T, ay, ax0, ax1, o.arrow, 3); px(E, T, ax1 + 1, ay, o.head || o.arrow, 4); px(E, T, ax1, ay - 1, o.head || o.arrow, 3); px(E, T, ax1, ay + 1, o.head || o.arrow, 2);
    const f = o.fletch || o.arrow; px(E, T, ax0 + 1, ay - 1, f, 4); px(E, T, ax0, ay - 1, f, 3); px(E, T, ax0 + 1, ay + 1, f, 2);
    tip = [ax1 + 1, ay];
  }
  const tw = tip ? parts.toSprite(T, tip[0], tip[1]) : parts.toSprite(T, 2, 0);
  return { tip: tw, nock: parts.toSprite(T, nk[0], nk[1]) };
};
parts.bow.focus = (P, o) => { o = o || {}; const g = grip(P, o); return [g[0] + 5, g[1]]; };
// 弩（吸附斜率）：o = { wood 弩臂托, metal 弩弓 / 机件, string, bolt 弩箭, head, loaded（默认 P.pull ≥ 1）, hand, at / a / free }。一个部件 + 弩箭一个部件。返回 { tip 箭头 / 弩口, di }
function xbowGeo(P, o) { const g = grip(P, o), di = snapDir(g[2]), s = org(di, g[0], g[1]); return { di, s, tip: cell(di, s[0], s[1], 9) }; }
parts.crossbow = function (E, R, P, o) {
  o = o || {}; const T = o.free ? FREE : R, G = xbowGeo(P, o), di = G.di, x0 = G.s[0], y0 = G.s[1], mt = o.metal, loaded = o.loaded != null ? o.loaded : (P.pull || 0) >= 1, pd = (di + 4) % 16, ud = (di + 12) % 16;
  E.part();
  bar(di, x0, y0, -5, 6, 2, (k, j, X, Y) => px(E, T, X, Y, k === 0 ? mt : o.wood, k <= -4 ? (j ? 2 : 3) : j === 0 ? 4 : 2));
  const c = cell(di, x0, y0, 6);
  bar(pd, c[0], c[1], -4, 4, 1, (k, j, X, Y) => { const back = Math.abs(k) >= 3 ? cell(di, X, Y, -1) : [X, Y]; px(E, T, back[0], back[1], mt, Math.abs(k) === 4 ? 4 : 3); });
  const tipA = cell(pd, c[0], c[1], -4), tipB = cell(pd, c[0], c[1], 4), nut = cell(di, x0, y0, loaded ? 1 : 5), ta = cell(di, tipA[0], tipA[1], -1), tb = cell(di, tipB[0], tipB[1], -1);
  line(E, T, ta[0], ta[1], nut[0], nut[1], o.string || mt, 3); line(E, T, nut[0], nut[1], tb[0], tb[1], o.string || mt, 3);
  if (loaded && o.bolt) { E.part(); const u = cell(ud, x0, y0, 1); bar(di, u[0], u[1], 1, 8, 1, (k, j, X, Y) => px(E, T, X, Y, k === 8 ? (o.head || mt) : o.bolt, k === 8 ? 4 : 3)); }
  return { tip: G.tip, di };
};
parts.crossbow.focus = (P, o) => xbowGeo(P, o || {}).tip;
// 火枪（吸附斜率）：o = { style: 'musket' 长枪 | 'blunder' 喇叭口 | 'pistol' 短枪, wood 枪托, metal 枪管, trim 箍 / 机件, len 枪管长, hand, at / a / free }
// 一个部件。返回 { muzzle 枪口, di }
function gunGeo(P, o) { const g = grip(P, o), di = snapDir(g[2]), s = org(di, g[0], g[1]), n = RD((o.len != null ? o.len : o.style === 'pistol' ? 4 : 10) * MAJ[di]); return { di, s, n, muzzle: cell(di, s[0], s[1], n + 1) }; }
parts.gun = function (E, R, P, o) {
  o = o || {}; const T = o.free ? FREE : R, G = gunGeo(P, o), di = G.di, x0 = G.s[0], y0 = G.s[1], n = G.n, st = o.style || 'musket', mt = o.metal, tr = o.trim || mt;
  E.part();
  if (st === 'pistol') { const dn = (di + (DIRS[di][0] >= 0 ? 4 : 12)) % 16; bar(dn, x0, y0, 0, 2, 2, (k, j, X, Y) => px(E, T, X, Y, o.wood, j ? 2 : 3)); }
  else bar(di, x0, y0, -6, -1, 2, (k, j, X, Y) => { if (k === -6 && j === 0) return; px(E, T, X, Y, o.wood, k <= -5 ? 2 : j === 0 ? 4 : 3); });
  bar(di, x0, y0, 0, 1, 2, (k, j, X, Y) => px(E, T, X, Y, tr, j === 0 ? 4 : 2));
  bar(di, x0, y0, 2, n, 1, (k, j, X, Y) => px(E, T, X, Y, (k === RD(n * 0.55) || k === n - 1) && st !== 'pistol' ? tr : mt, k === n ? 4 : 3));
  if (st !== 'pistol') bar(di, x0, y0, 2, RD(n * 0.7), 2, (k, j, X, Y) => { if (j === 1) px(E, T, X, Y, o.wood, 2); });
  if (st === 'blunder') bar(di, x0, y0, n, n + 1, 3, (k, j, X, Y) => px(E, T, X, Y, mt, j === 0 ? 4 : j === 2 ? 2 : 3));
  return { muzzle: G.muzzle, di };
};
parts.gun.focus = (P, o) => gunGeo(P, o || {}).muzzle;

// 盾（盾面朝镜头，挂在前臂上；也能背在背上）：o = { style: 'kite' 鸢盾 | 'heater' 骑士盾 | 'round' 圆盾（= parts.targe，见下）| 'tower' 塔盾 | 'buckler' 小圆盾,
//   face 盾面, rim 边框, emblem 纹章材质 + emblemStyle: 'cross' | 'boss' 盾心 | 'bend' 斜带 | 'quarter' 四分 | 'chevron' 人字 | 'none',
//   at: [x, y] 盾心（默认前手 + (1, 1)）, rot 翻滚档, clip 这一行以下不画（插进地里）, free, back 1 = 背在背上（倒地时压扁成侧看的一条，不会像一块立着的板）}。
// round 交给 parts.targe 画（r 半径，默认 4 = 直径 9；emblemStyle 换成 targe 的 pattern，boss 用纹章材质做盾心，其余图案用纹章材质当第二种漆；plank 默认 0）。
// 一个部件。返回 { center, top, bot }
const SHIELDS = { kite: [3, 4, 4, 4, 4, 4, 4, 3, 3, 2, 2, 1, 1, 0], heater: [4, 4, 4, 4, 4, 4, 3, 3, 2, 1], tower: [1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2], buckler: [1, 2, 2, 2, 1] };
const ROUND_PAT = { boss: 'none', quarter: 'quarter', cross: 'cross', bend: 'bend', chevron: 'chevron', none: 'none' };
parts.shield = function (E, R, P, o) {
  o = o || {};
  if (o.style === 'round') { const es = o.emblemStyle || 'boss', em = o.emblem; return parts.targe(E, R, P, Object.assign({ r: 4, plank: 0 }, o, { face2: es === 'boss' ? o.face : em || o.face, boss: es === 'boss' && em ? em : o.boss || o.rim, pattern: ROUND_PAT[es] || 'none' })); }
  const W0 = SHIELDS[o.style] || SHIELDS.kite, n = W0.length, flat = R.lie && o.back && !o.free, W = flat ? W0.map((w) => (w > 0 ? 1 : 0)) : W0;   // 背盾 + 倒地：侧看的一条（3 格厚，内沿贴背）
  const cx = RD(o.at ? o.at[0] : P.hx + 1) - (flat ? 1 : 0), cy = RD(o.at ? o.at[1] : P.hy + 1), T = o.free ? freeFrame(o.rot || 0, cx, cy) : frame(R, o.rot || 0, cx, cy);
  const es = o.emblemStyle || (o.style === 'buckler' ? 'boss' : 'cross'), mid = FL(n / 2), cr = o.style === 'kite' ? 4 : FL(n * 0.35), clip = o.clip != null ? o.clip - cy : 99;
  E.part();
  for (let r = 0; r < n; r++) {
    const w = W[r], v = r - mid; if (v > clip) continue;
    for (let x = -w; x <= w; x++) {
      const rim = r === 0 || r === n - 1 || Math.abs(x) === w || Math.abs(x) > (W[r + 1] != null ? W[r + 1] : -1) || Math.abs(x) > (W[r - 1] != null ? W[r - 1] : -1);
      let m = rim ? o.rim : o.face, t = 0;
      if (!rim && o.emblem && !flat) {
        const on = es === 'cross' ? (x === 0 && r >= 1 && r <= n - 3) || (r === cr && Math.abs(x) <= w - 1) : es === 'boss' ? Math.abs(x) <= 1 && Math.abs(v) <= 1 : es === 'bend' ? Math.abs(x - v * 0.8) < 0.9 : es === 'quarter' ? (x < 0) === (v < 0) && x !== 0 && v !== 0 : es === 'chevron' ? r === cr + 2 - Math.abs(x) || r === cr + 3 - Math.abs(x) : false;
        if (on) { m = o.emblem; t = es === 'boss' && x === -1 && v === -1 ? 4 : 0; }
      }
      if (rim && !flat && ((r === 1 || r === n - 3) && Math.abs(x) === w && n > 6)) t = 4;                   // 铆钉
      px(E, T, x, v, m, t);
    }
  }
  if (!flat && (!o.emblem || es !== 'boss')) { px(E, T, -1, -mid + 2, o.face, 4); px(E, T, -1, -mid + 3, o.face, 4); }   // 盾面冷光
  return { center: parts.toSprite(T, 0, 0), top: -mid, bot: n - 1 - mid };
};
parts.shield.focus = (P, o) => { o = o || {}; return [RD(o.at ? o.at[0] : P.hx + 1), RD(o.at ? o.at[1] : P.hy + 1)]; };
// 提灯（挂在手下）：o = { metal 灯框, glass 灯罩（flat）, glow 白热（flat）, rot / at / free, hand }。读 P：gem（灯火 5 档）glint（火苗摇曳）。一个部件。返回 { focus 灯芯 }
const LAMP_LV = [[3, 2, 0], [4, 3, 0], [3, 4, 1], [4, 4, 2], [1, 1, 0]];   // [芯色调, 四周色调, 白热格数（0 无 · 1 芯 · 2 十字）]
parts.lantern = function (E, R, P, o) {
  o = o || {}; const g = grip(P, o), T = o.free ? freeFrame(o.rot || 0, g[0], g[1]) : frame(R, o.rot || 0, g[0], g[1]), mt = o.metal, lv = CL(o.glowLv != null ? o.glowLv : P.gem || 0, 0, 4), L = LAMP_LV[lv];
  E.part();
  px(E, T, 0, 1, mt, 3); run(E, T, 2, -1, 1, mt, 0); run(E, T, 3, -2, 2, mt, 0);
  for (let y = 4; y <= 6; y++) { px(E, T, -2, y, mt, 0); px(E, T, 2, y, mt, 2); for (let x = -1; x <= 1; x++) { const core = x === 0 && y === 5, cross = x === 0 || y === 5; let m = o.glass, t = core ? L[0] : cross ? L[1] : Math.max(1, L[1] - 1); if ((L[2] === 1 && core) || (L[2] === 2 && cross)) { m = o.glow || o.glass; t = core ? 4 : 3; } px(E, T, x, y, m, t); } }
  if (P.glint && lv < 3) { px(E, T, -1, 4, o.glass, 4); px(E, T, 0, 4, o.glass, 4); }
  run(E, T, 7, -2, 2, mt, 0); px(E, T, 0, 8, mt, 2); px(E, T, -2, 3, mt, 4);
  return { focus: parts.toSprite(T, 0, 5) };
};
parts.lantern.focus = (P, o) => { o = o || {}; const g = grip(P, o); return [g[0], g[1] + 5]; };
// 书：o = { open 1 = 摊开 | 0 = 合上, cover 封皮, page 书页, trim 包角 / 扣, glow 书页发光材质, rot / at / free, hand }。读 P.gem（书页发光档）。一个部件。返回 { focus 书页上方 }
parts.book = function (E, R, P, o) {
  o = o || {}; const g = grip(P, o), T = o.free ? freeFrame(o.rot || 0, g[0], g[1]) : frame(R, o.rot || 0, g[0], g[1]), lv = CL(o.glowLv != null ? o.glowLv : P.gem || 0, 0, 4), open = o.open != null ? o.open : 1, cv = o.cover, pg = o.page || cv;
  E.part();
  if (open) {
    run(E, T, 0, -3, 3, cv, 0); px(E, T, 0, -1, cv, 2);
    for (let y = -2; y <= -1; y++) for (const s of [-1, 1]) for (let k = 1; k <= 3; k++) { const x = s * k; let m = pg, t = y === -2 ? 4 : 3; if (lv >= 2 && lv < 4 && o.glow) { m = o.glow; t = lv === 3 || k === 2 ? 4 : 3; } else if ((k + y) & 1) t = 2; px(E, T, x, y - (k === 3 ? 1 : 0), m, t); }
    px(E, T, 0, -2, cv, 3); if (o.trim) { px(E, T, -3, 0, o.trim, 4); px(E, T, 3, 0, o.trim, 3); }
  } else {
    rect(E, T, -1, -3, 3, 4, cv, 0); for (let y = -2; y <= 0; y++) px(E, T, 2, y, pg, 3); px(E, T, -1, -3, cv, 4);
    if (o.trim) { px(E, T, 0, -2, o.trim, 4); px(E, T, 2, -1, o.trim, 3); }
  }
  return { focus: parts.toSprite(T, 0, open ? -4 : -4) };
};
parts.book.focus = (P, o) => { o = o || {}; const g = grip(P, o); return [g[0], g[1] - 4]; };
// 牌（吸附斜率，远端平头）：o = { n 张数（牌扇 1–5）, spread 张开角, card 牌面, trim 金框, pip 花色材质, lit 点亮材质, len 牌长, hand, at / a / free }
// 读 P.gem（≥ 3 时牌面点亮）。每张牌一个部件（牌与牌之间自动压出分界线）。返回 { tips: [[x, y] …] }
parts.card = function (E, R, P, o) {
  o = o || {}; const T = o.free ? FREE : R, g = grip(P, o), N = CL(o.n || 1, 1, 5), sp = o.spread != null ? o.spread : 0.32, len = o.len || 4, lit = (P.gem || 0) >= 3 && o.lit, tips = [];
  for (let i = 0; i < N; i++) {
    const a = g[2] + (i - (N - 1) / 2) * sp, di = snapDir(a), s = org(di, g[0], g[1]), n = RD(len * MAJ[di]) + 1;
    E.part();
    bar(di, s[0], s[1], 1, n, 3, (k, j, X, Y) => { let m = lit ? o.lit : o.card, t = k === n ? 3 : 0; if (!lit && o.trim && k === n - 1 && j !== 1) { m = o.trim; t = i === N - 1 ? 4 : 3; } if (!lit && o.pip && k === n - 1 && j === 1) { m = o.pip; t = 3; } px(E, T, X, Y, m, t); });
    tips.push(cell(di, s[0], s[1], n + 1));
  }
  return { tips };
};
parts.card.focus = (P, o) => { o = o || {}; const g = grip(P, o), di = snapDir(g[2]), s = org(di, g[0], g[1]); return cell(di, s[0], s[1], RD((o.len || 4) * MAJ[di]) + 1); };

// ═════════════════════════ 追加（batch-02 · 维京线）：大圆木盾 targe · 编辫胡 braids · 角 horns · 锁链 chain（README「部件库」表里都有）═════════════════════════
// 大圆木盾 targe（维京 / 蛮族 / 海盗；shield 'round' 也交给它画）：半径可调、竖木板缝、两色漆面图案、铁边框一圈铆钉（r ≥ 5 时 8 颗，否则 4 颗）、3×3 盾心铁包，盾心能嵌发光符文。
// o = { r 半径 3–8（默认 6，直径 2r+1）, face 盾面漆, face2 第二种漆（缺省 = face）, rim 铁边框, boss 盾心材质（缺省 = rim）,
//       pattern: 'quarter' 四分 | 'wedge' 八瓣轮辐 | 'band' 横带 | 'cross' 十字 | 'bend' 斜带 | 'chevron' 人字 | 'none'（默认 quarter；盾心铁包总是画）, plank 0 = 不画竖木板缝,
//       rune 盾心符文材质（flat；和盾同一部件，按 P.gem 5 档亮）, glowLv 覆盖符文档, at [x, y] 盾心（默认前手 +(1, 1)）, rot 翻滚档, clip 这一行以下不画（插进地里）, free,
//       back 1 = 背在背上（at 是背后沿外 1 格，pack 的约定）：倒地（rig lying）时画成侧看的一条——3 格厚（边框 · 盾面 · 边框）+ 盾心往外鼓 1 格，内沿贴着背，
//                随身体转：前扑时压在背上，仰倒时压在身下；不会像一块立在身上的圆板 }
// 读 P：gem（符文档：0 待机暗 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）glint（盾心反光）。一个部件。返回 { center, top, bot, r }；parts.targe.focus(P, o) = 盾心
parts.targe = function (E, R, P, o) {
  o = o || {}; const r = CL(RD(o.r || 6), 3, 8), flat = R.lie && o.back && !o.free, cx = RD(o.at ? o.at[0] : P.hx + 1) - (flat ? 1 : 0), cy = RD(o.at ? o.at[1] : P.hy + 1);
  const T = o.free ? freeFrame(o.rot || 0, cx, cy) : frame(R, o.rot || 0, cx, cy);
  const f1 = o.face, f2 = o.face2 || o.face, rim = o.rim || f1, boss = o.boss || rim, pat = o.pattern || 'quarter', clip = o.clip != null ? o.clip - cy : 99;
  E.part();
  if (flat) {                                                                                 // 背盾 + 倒地：侧看的一条（外侧边框 · 盾面 · 贴背的边框），盾心铁包往外鼓 1 格；内沿贴着背
    for (let y = -r; y <= r; y++) { if (y > clip) continue; const end = Math.abs(y) === r; for (let x = -1; x <= 1; x++) if (!end || x === 0) px(E, T, x, y, x === 0 && !end ? f1 : rim, 0); }
    for (let y = -1; y <= 1; y++) if (y <= clip) px(E, T, -2, y, boss, y < 0 ? 4 : 3);
    return { center: parts.toSprite(T, 0, 0), top: -r, bot: r, r };
  }
  const lv = CL(o.glowLv != null ? o.glowLv : P.gem || 0, 0, 4), rr = r * r + r * 0.8, inside = (x, y) => x * x + y * y <= rr, riv = new Set(), nr = r >= 5 ? 8 : 4;
  for (let k = 0; k < nr; k++) { const q = (k + (nr === 4 ? 0.5 : 0)) * 2 * Math.PI / nr; riv.add(RD(Math.cos(q) * (r - 0.2)) + ',' + RD(Math.sin(q) * (r - 0.2))); }
  for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) {
    if (!inside(x, y) || y > clip) continue;
    let m, t = 0;
    if (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) { m = rim; if (riv.has(x + ',' + y)) t = 4; }       // 铁边框 + 铆钉
    else if (Math.abs(x) <= 1 && Math.abs(y) <= 1) { m = boss; t = x + y < 0 ? 4 : x + y > 0 ? 2 : 3; }                                           // 盾心铁包（左上亮、右下暗）
    else {
      const a = Math.atan2(y, x), ch = y + Math.abs(x) * 0.8 - r * 0.3;
      const on = pat === 'quarter' ? (x < 0) === (y < 0) : pat === 'wedge' ? (FL((a + Math.PI) / (Math.PI / 4)) & 1) === 0 : pat === 'band' ? Math.abs(y) <= 1 : pat === 'cross' ? Math.abs(x) <= 1 || Math.abs(y) <= 1
        : pat === 'bend' ? Math.abs(x - y) <= 1 : pat === 'chevron' ? ch >= 0 && ch < 2 : false;
      m = on ? f2 : f1; if (o.plank !== 0 && ((x + 64) % 3) === 1) t = 2;                                                                           // 竖木板缝
    }
    px(E, T, x, y, m, t);
  }
  if (o.rune && clip >= 0) {                                                                  // 盾心符文：和盾同一部件，周围的铁不会被压出分界线
    px(E, T, 0, 0, o.rune, lv === 4 ? 1 : lv >= 2 ? 4 : lv === 1 ? 3 : 2);
    if (lv === 2 || lv === 3) for (const d of [[-1, 0], [1, 0], [0, -1], [0, 1]]) px(E, T, d[0], d[1], o.rune, lv === 3 ? 4 : 3);
  }
  if (P.glint) px(E, T, -1, -1, o.rune || boss, 4);
  return { center: parts.toSprite(T, 0, 0), top: -r, bot: r, r };
};
parts.targe.focus = (P, o) => { o = o || {}; return [RD(o.at ? o.at[0] : P.hx + 1), RD(o.at ? o.at[1] : P.hy + 1)]; };
// 编辫胡 braids（维京 / 矮人）：八字胡 + 下巴一团胡子，下面垂 1–2 条辫子——辫纹逐行亮暗交错，每 3 行一个辫环，辫梢 1 格会摆；后面那条整条暗一级。
// 八字胡压在眼睛下面第 3 行（头高 ≥ 7 时第 4 行），给鼻子、脸颊留出 2 行肤色；不画鬓角（小脸上再多一条分界线，脸就全黑了）。
// o = { mat 胡须, ring 辫环材质（金 / 铁，缺省不画）, n 辫子数 1 | 2（默认 2）, len 辫长（默认 6）, lip 0 = 不画八字胡 }
// 画在 head 之后；自己的部件（压在脸上，下颌出一条分界线）。侧视时前手（盾臂 / 握武器的前臂）横在胸前会挡住辫子：这种角色把 braids 画在前臂之后、盾之前（推荐顺序的例外，见 README）。
// 读 P.beard（辫梢摆：< 0 被风吹向后，> 0 甩向前）。返回 { tips: [[x, y] …] }
parts.braids = function (E, R, P, o) {
  o = o || {}; const T = R, m = o.mat, x0 = R.hx0, x1 = R.hx1, bot = R.hy, ey = R.ey, b = P.beard || 0, n = CL(o.n || 2, 1, 2), L = o.len || 6, tips = [];
  const my = Math.min(bot, ey + (R.hh >= 7 ? 3 : 2));
  E.part();
  if (o.lip !== 0) { run(E, T, my, x1 - 1, x1 + 1, m, 4); px(E, T, x1 + 2, my + 1, m, 3); }                                      // 八字胡（前梢下垂 1 格）
  for (let y = my + 1; y <= bot + 2; y++) { const k = y - my - 1; run(E, T, y, x0 + 2 + (k > 1 ? 1 : 0), x1 + (k < 2 ? 1 : 0), m, k === 0 ? 3 : 0); }   // 下巴一团胡子
  for (let j = n - 1; j >= 0; j--) {                                                                                             // 后面那条先画
    const back = j === 1, bx = back ? x1 - 4 : x1 - 1, Lj = L - (back ? 1 : 0);
    for (let k = 0; k < Lj; k++) {
      const q = (k + 1) / Lj, y = bot + 3 + k, x = bx + RD(b * q * q * 1.6) - FL(k * 0.25), last = k === Lj - 1;
      if (last) { px(E, T, x, y, m, back ? 2 : 3); tips.push(parts.toSprite(T, x, y)); }
      else if (o.ring && k % 3 === 1) { px(E, T, x, y, o.ring, back ? 3 : 4); px(E, T, x + 1, y, o.ring, 2); }
      else { px(E, T, x, y, m, (k & 1) ? 2 : back ? 3 : 4); px(E, T, x + 1, y, m, (k & 1) ? (back ? 3 : 4) : 2); }
    }
  }
  return { tips };
};
// 角 horns（独立部件，画在头盔 / 头之后；配 helm 'nasal' / 'kettle'、光头都行）：两只角从头的前后两侧长出，根部 2 格粗、尖端 1 格亮；远侧角整只暗一级。
// o = { mat 角, band 角根箍材质（缺省不画）, size 角长 3–9（默认 6）, curve: 'up' 牛角先外张再上翘 | 'crescent' 月牙角（外弯、尖端往里勾；helm 'horned' 默认）| 'back' 后掠 | 'ram' 羊角向后下盘卷,
//       y 角根在头饰坐标里的行（默认 2，即头顶下 1 行）, at / rot（掉在地上，同头饰）}
// 读 P.head（随头转）。返回 { tipF, tipB }（精灵本地坐标，挂特效用）
function hornPath(cv, s, t) {
  if (cv === 'crescent') { const f = t * Math.PI * 0.9; return [s * 0.55 * Math.sin(f), -s * 0.5 * (1 - Math.cos(f))]; }
  if (cv === 'back') return [-s * 0.9 * t, -s * 0.45 * Math.sin(t * 2.4) - t];
  if (cv === 'ram') { const a = t * 4.4; return [-s * 0.34 * Math.sin(a) - t * 1.5, -s * 0.3 * (1 - Math.cos(a)) + t * 2]; }
  return [s * 0.85 * Math.sin(t * HALF), -s * 0.85 * (1 - Math.cos(t * HALF)) - t * 1.2];
}
parts.horns = function (E, R, P, o) {
  o = o || {}; const T = hwFrame(R, o), H = hwBox(R, o), m = o.mat, s = CL(RD(o.size || 6), 3, 9), cv = o.curve || 'up', y0 = o.y != null ? o.y : 2, out = {};
  E.part();
  for (const side of [-1, 1]) {                                                               // -1 远侧（后）先画 · 1 近侧（前）
    const far = side < 0, up = cv === 'up' || cv === 'crescent', rx = up ? (far ? H.a : H.b) : (far ? H.a + 2 : H.b - 1), ry = y0 - (far && !up ? 1 : 0);
    let lx = rx, ly = ry;
    for (let k = 0; k <= s * 2; k++) {
      const t = k / (s * 2), p = hornPath(cv, s, t), x = RD(rx + (up ? side : 1) * p[0]), y = RD(ry + p[1]), tip = k === s * 2;
      const tone = tip ? (far ? 3 : 4) : far ? (t < 0.5 ? 1 : 2) : (t < 0.3 ? 2 : 3);
      line(E, T, lx, ly, x, y, m, tone); if (t < 0.45) px(E, T, x, y + 1, m, far ? 1 : 2);
      lx = x; ly = y; if (tip) out[far ? 'tipB' : 'tipF'] = parts.toSprite(T, x, y);
    }
    if (o.band) { px(E, T, rx, ry, o.band, far ? 2 : 4); px(E, T, rx, ry + 1, o.band, far ? 1 : 3); }
  }
  return out;
};
// 锁链 chain（挂在一点、下垂会摆；可以先沿一段缠绕再垂下：缠在前臂 / 腰上）：链节 = 横环（2 格：亮 + 暗）和竖环（1 格中间调）逐行交替。
// o = { at [x, y] 挂点（缺省 = wrap 终点）, len 垂下的格数（默认 5）, mat 铁, cuff 末端张开的镣铐材质（缺省不画）,
//       wrap [x0, y0, x1, y1] 先沿这段缠绕（斜穿过去的亮暗点）, swing 摆幅倍数（默认 1）, free }
// 缠绕段和挂点跟着 rig 的落笔变换走；垂下的那段永远朝屏幕下方垂（倒地时身体转了 90°，链子照样往地上掉），碰到地面就沿地面往前堆开。
// 挂点 + len + 镣铐（3 行）的最低点别低于 y −4，不然站着时镣铐贴地，剪影里像多出一只脚。
// 读 P：beard（链尾摆，< 0 甩向后）sway。一个部件。返回 { end }（精灵本地坐标）
parts.chain = function (E, R, P, o) {
  o = o || {}; const T = o.free ? FREE : R, m = o.mat, L = o.len != null ? o.len : 5, sw = ((P.beard || 0) * 1.2 + (P.sway || 0) * 0.5) * (o.swing != null ? o.swing : 1);
  E.part();
  if (o.wrap) { const w = o.wrap, n = Math.max(1, Math.ceil(Math.hypot(w[2] - w[0], w[3] - w[1]))); for (let k = 0; k <= n; k += 2) { const x = w[0] + (w[2] - w[0]) * k / n, y = w[1] + (w[3] - w[1]) * k / n; px(E, T, x, y, m, 4); px(E, T, x + 1, y + 1, m, 2); } }
  const A = parts.toSprite(T, o.at ? o.at[0] : o.wrap ? o.wrap[2] : 0, o.at ? o.at[1] : o.wrap ? o.wrap[3] : 0), G = FREE;   // 垂下的那段在精灵坐标里画（不跟身体转）
  let ex = A[0], ey = A[1], pile = 0; const amp = sw * 1.5 * Math.min(1, L / 4);             // 摆幅按链长缩放（短链甩不出长链那么远）
  for (let k = 1; k <= L; k++) {
    const q = k / L; let x = RD(A[0] + amp * q * q), y = A[1] + k;
    if (y > 0) { pile++; x += pile; y = 0; }                                                   // 落地：沿地面往前堆
    if (Math.abs(x - ex) > 1) run(E, G, y, Math.min(x, ex + SG(x - ex)), Math.max(x, ex + SG(x - ex)), m, 3);   // 甩得远时这一节斜着拉开，不断开
    if ((k & 1) && !pile) { px(E, G, x, y, m, 4); px(E, G, x + 1, y, m, 2); } else px(E, G, x, y, m, 3); ex = x; ey = y;
  }
  if (o.cuff) { const c = o.cuff, x = ex, y = Math.min(ey + 1, -2); px(E, G, x - 1, y, c, 4); px(E, G, x - 1, y + 1, c, 3); px(E, G, x - 1, y + 2, c, 3); px(E, G, x, y + 2, c, 2); px(E, G, x + 1, y + 2, c, 2); px(E, G, x + 1, y, c, 3); ey = y + 2; }
  return { end: [ex, ey] };
};

parts.README = '人形部件库：骨架 rig、腿脚、躯干服装（长袍 / 修女袍 / 长裙 / 大衣 / 皮甲 / 板甲 / 背心 / 赤膊）、围裙、挂件、披肩、披风、围巾、背负物、手臂与手、头与脸、发、须、编辫胡、锁链、头饰（帽 / 兜帽 / 头盔 / 角 / 王冠 / 头巾 / 面纱）、武器与道具（剑 / 匕首 / 刀 / 斧 / 锤 / 戟 / 铲 / 剁刀 / 矛 / 杖 / 弓 / 弩 / 枪 / 盾 / 大圆木盾 / 提灯 / 书 / 牌）。非人形在 parts-beast.js。';
})();
