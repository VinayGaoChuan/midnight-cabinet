// 小螃蟹（衍生单位 · 自然 · 先锋 · 普通；巨蟹系召唤出的肉盾近战宠物）：正面看的一只扁平沙黄小蟹——宽 16 格、只有 6 格高的圆壳贴着地，
// 左右各举一只一样大的小螯（指尖橘红），两根短眼柄顶着黑豆眼，8 条尖腿向两侧放射张开；横着走，所以画成正面、左右对称。
// 攻击：压低身子横冲 6 格，用硬壳侧沿撞人。技能「缩壳翻滚」（没有特性，表现招牌动作）：螯和腿缩进壳下、壳原地越转越快、身周冒白泡；
// 施放时壳变成轮子横滚 16 格撞上目标，一圈泡泡外爆破成水花；收招翻身落地，螯和腿「啪」地伸出来，横窜回原位。
// 死亡：钻沙——被掀翻、四脚朝天挣扎，翻回来后猛刨沙陷进地面，只剩眼柄眨一下，留下一小堆沙再消散。
// 骨架：parts-beast 的 bug 是侧视（螯、腿按前后分布），正面对称的蟹不适用，身体部件写在本模块（候选部件见下）。
PCD.define('Crabling', (E) => {
  const { Sprite, begin, bake, clamp01, ease, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shotFloorGlow } = E;
  const B = E.parts.beast, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.water, EL = FXR[R_EL];                                   // 泡沫 · 浅海白蓝：21 白 → 淡水青 → 水蓝 → 深蓝 → 墨蓝
  const SAND = E.ramp(['#2a1e08', '#6a5020', '#b08e40', '#e0c47a']);        // 沙黄蟹壳（本模块专属 4 色）
  const M = {
    shell: E.defMat(SAND, 1), leg: E.defMat(SAND, 1), legFar: E.defMat(SAND, 1, 0, 1),   // 壳 / 前排腿 / 后排腿（暗一级）
    claw: E.defMat(SAND, 1), under: E.defMat('bone', 1), spot: E.defMat('leather', 1, 1), // 螯 / 壳底奶白 / 墨褐螺旋斑（平涂，按 tone 取色）
    tip: E.defMat([44, 45, 45, 46], 1, 1), eye: E.defMat('ink', 1, 1), spec: E.defMat([21, 21, 21, 21], 1, 1),
    pile: E.defMat('sand', 1),                                              // 死亡留下的小沙堆（共享沙色）
  };

  const HX = 72, DUR = DEFAULT_DUR.slice(), hero = new Sprite(60, 30, 23, 26);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [M.eye, M.spec, M.tip, M.spot]) RIM.skip[k] = 1;

  // 姿势字段：bx 横移 · lift 离地 · yo 身体下沉（压低 + 起伏）· sink 陷进沙里 · gf 步态帧 -1..3 · ls 腿整体横拖 · lr 腿缩进 0 / 1 半缩 / 2 全缩
  //   clL / clR 左右螯 0 常态 · 1 举高 · 2 张大 · 3 收到壳前 · 4 甩开 · 5 缩没 · cy 螯滞后 · eyes 0 睁 / 1 闭 / 2 缩下 · mouth 张嘴
  //   ret 0 常态 / 3 壳球（翻滚）· rot 壳球朝向 0–3 · sp 螺旋斑相位 0–7 · lie 0 正 / 2 四脚朝天 · lf 乱蹬相位 · pile 沙堆 0–2 · tilt 冲撞前倾
  const SPEC = [['bx', -4, 20], ['lift', 0, 7], ['yo', -1, 3], ['sink', 0, 13], ['gf', -1, 3], ['ls', -2, 2], ['lr', 0, 2], ['clL', 0, 5], ['clR', 0, 5], ['cy', -1, 1],
    ['eyes', 0, 2], ['mouth', 0, 1], ['ret', 0, 3], ['rot', 0, 3], ['sp', 0, 7], ['lie', 0, 2], ['lf', 0, 1], ['pile', 0, 2], ['tilt', 0, 1],
    ['flash', 0, 1], ['dq48', 0, 48], ['ddir', 0, 1], ['rim', 0, 3]];
  const P = {};
  function reset() {
    P.bx = 0; P.lift = 0; P.yo = 0; P.sink = 0; P.gf = -1; P.ls = 0; P.lr = 0; P.clL = 0; P.clR = 0; P.cy = 0; P.eyes = 0; P.mouth = 0;
    P.ret = 0; P.rot = 0; P.sp = 0; P.lie = 0; P.lf = 0; P.pile = 0; P.tilt = 0; P.flash = 0; P.dq = 0; P.ddir = 0; P.rim = 0; P.mx = 0; P.flip = 0; P.gx = 0; P.gy = 0;
  }
  reset();
  const HIT_POINT = [1, -6];

  // ───── 姿势 ─────
  const T_HIT = 2 / 12, T_IMP = 3 / 12, T_POP = 0.45, T_LAND = 1 / 12, IDLE_SWAY = [0, 1, 0, -1];
  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.yo = b & 1; P.cy = IDLE_SWAY[(b + 1) & 3] > 0 ? -1 : 0;   // 螯比身体慢一拍
    const lp = tq % DUR[IDLE];
    if (lp >= 1.45 - 1e-6 && lp < 2.05) P.mouth = 1;                                       // 待机个性：吐泡泡，两只螯轮流举一下
    if (lp >= 1.6 - 1e-6 && lp < 1.8) P.clL = 1; else if (lp >= 1.8 - 1e-6 && lp < 2.0) P.clR = 1;
    if (lp >= 0.9 - 1e-6 && lp < 0.9 + 2 / 12) P.eyes = 1;                                 // 眨眼
  }
  // 横窜急停：每 4 帧里窜 3 帧、停 1 帧（12 fps）
  function dashDist(tl, dist) { const fr = f12of(tl); let n = 0; for (let j = 0; j < fr; j++) if ((j & 3) !== 3) n++; return Math.min(dist, R(n * 1.75)); }
  function scuttle(tq) { P.gf = gait(tq); P.yo = (P.gf & 1) ? 0 : 1; }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      scuttle(tq); const half = DUR[MOVE] / 2, w = walkDemo(tq, 14, -1);
      P.flip = w.flip; P.mx = tq < half ? -dashDist(tq, 14) : -(14 - dashDist(tq - half, 14));
      P.cy = (P.gf & 1) ? -1 : 0;
    } else if (st === ATTACK) {
      if (tq < 1 / 12) { /* 常态 */ }
      else if (tq < T_HIT) { P.bx = -1; P.yo = 1; P.clL = 3; P.clR = 3; P.ls = 1; }                    // 预兆：压低、后缩、螯收到壳前
      else if (tq < 0.25) { P.bx = 11; P.tilt = 1; P.clL = 1; P.clR = 3; P.ls = -2; P.eyes = 1; }      // 出手：横冲 11 格，壳沿撞上去
      else if (tq < 0.45) { const q = ease.out(clamp01((tq - 0.25) / 0.2)); P.bx = R(10 - q * 6); P.ls = -1; P.clL = 1; P.clR = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.25)); P.bx = R(4 * (1 - q)); if (P.bx > 0) scuttle(tq); }
    } else if (st === CHARGE) {
      P.eyes = tq < 0.2 ? 0 : 2; P.clL = P.clR = tq < 0.15 ? 0 : tq < 0.35 ? 3 : 5;
      P.lr = tq < 0.35 ? 0 : tq < 0.6 ? 1 : 2; P.yo = tq < 0.35 ? 0 : tq < 0.6 ? 1 : 3;
      const every = tq < 0.7 ? 0 : tq < 1.0 ? 3 : tq < 1.2 ? 2 : 1;                                       // 壳原地打转，越转越快
      P.sp = every ? (Math.floor((f12of(tq) - 8) / every) & 7) : 0; P.bx = tq >= 1.2 ? ((f12 & 1) ? 1 : 0) : 0;
      P.rim = tq < 0.45 ? 1 : 2;
    } else if (st === CAST) {
      const f = f12of(tq), BX = [4, 9, 13, 16, 15, 14], LF = [0, 0, 0, 0, 3, 4];
      P.ret = 3; P.rot = f & 3; P.rim = 3;
      if (f < BX.length) { P.bx = BX[f]; P.lift = LF[f]; } else { P.bx = 13 - Math.min(2, f - 6); P.lift = Math.max(2, 4 - (f - 5)); P.rot = (f >> 1) & 3; }
    } else if (st === RECOVER) {
      const f = f12of(tq);
      if (tq < T_LAND) { P.ret = 3; P.bx = 11; P.lift = 2; P.rot = 2; P.rim = 2; }
      else if (tq < 0.25) { P.bx = 10; P.yo = f === 1 ? 2 : 1; P.clL = P.clR = 2; P.rim = 1; P.mouth = 1; }   // 翻身落地：螯和腿「啪」地伸出来
      else if (tq < 0.6) { P.bx = R(10 * (1 - ease.inOut((tq - 0.25) / 0.35))); scuttle(tq); P.cy = (P.gf & 1) ? -1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.yo = 1; P.eyes = 1; P.clL = P.clR = 4; P.ls = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.cy = 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.yo = d < 0.15 ? 1 : 2; P.eyes = 1; P.clL = P.clR = 4; P.ls = 1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.5) { P.bx = -3; P.lift = d < 0.4 ? 2 : 3; P.eyes = 1; P.clL = P.clR = 4; P.lr = 1; }       // 被掀起来
      else if (d < 1.05) { P.bx = -3; P.lie = 2; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.lf = (f12 >> 1) & 1; }   // 四脚朝天，腿乱蹬，翻身失败
      else if (d < 1.13) { P.bx = -3; P.lift = 2; P.eyes = 1; P.lr = 1; P.clL = P.clR = 4; }                         // 猛一翻，翻回来
      else if (d < 1.95) {
        P.bx = -3; P.gf = f12 & 3; P.clL = (f12 & 1) ? 1 : 4; P.clR = (f12 & 1) ? 4 : 1;                     // 猛刨沙，陷进地面
        P.sink = d < 1.55 ? R((d - 1.13) / 0.42 * 9) : d < 1.87 ? 9 : 11; P.eyes = d >= 1.7 && d < 1.7 + 2 / 12 ? 1 : 0;
        P.pile = d < 1.25 ? 0 : d < 1.45 ? 1 : 2;
      } else { P.bx = -3; P.sink = 13; P.pile = 2; if (d >= 2.0) P.dq = clamp01((d - 2.0) / 0.5); }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    P.gx = P.bx; P.gy = shellTop() - 1 - P.lift;
    B.key(P, SPEC);
  }
  const shellTop = () => -8 + P.yo + P.sink - P.lift;

  // ───── 画 ─────
  // 候选部件：frontShell（正面蟹壳）——壳顶 4 行圆拱 + 壳沿高光 + 壳底（奶白）+ 口器 + 壳背螺旋斑 + 转动的暗斑 + 眼柄，一个部件
  //   yT 壳顶行、sp 螺旋斑相位（0–7，技能里逐帧换位表示旋转）、mouth 张嘴、eyes 0 睁 / 1 闭 / 2 缩下
  const HW = [5, 7, 8, 8, 8, 6];
  const RING = [[-1, -1], [0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0]];
  const SPECK = [[-5, 2], [4, 1], [-2, 3], [6, 2]];
  function frontShell(bx, yT, sp, mouth, eyes) {
    E.part();
    for (let r = 0; r < 6; r++) {
      const y = yT + r, hw = HW[r];
      for (let x = -hw; x <= hw; x++) {
        const under = r === 5 || (r === 4 && Math.abs(x) <= 6);
        U.dot(E, bx + x, y, under ? M.under : M.shell, r === 3 ? (x >= 7 ? 2 : 4) : 0);
      }
    }
    for (const [sx, sr] of SPECK) {                                                        // 壳面暗斑：跟着螺旋斑一起转（在壳拱里横移、绕回）
      const hw = HW[sr] - 1, span = hw * 2 + 1, x = ((sx + hw + sp * 2) % span + span) % span - hw;
      U.dot(E, bx + x, yT + sr, M.shell, 2);
    }
    U.dot(E, bx, yT + 1, M.spot, 1);                                                       // 螺旋斑：中心 + 一段转动的弧
    for (let k = 0; k < 3; k++) { const c = RING[(sp + k) & 7]; U.dot(E, bx + c[0], yT + 1 + c[1], M.spot, k === 2 ? 3 : 2); }
    U.dot(E, bx, yT + 5, M.under, 1); U.dot(E, bx - 1, yT + 5, M.under, mouth ? 1 : 2); U.dot(E, bx + 1, yT + 5, M.under, mouth ? 1 : 2);   // 口器
    if (mouth) U.dot(E, bx, yT + 4, M.under, 1);
    for (const s of [-1, 1]) {                                                             // 眼柄 + 黑豆眼（左眼格在 x = 3s 的外侧）
      const x = bx + 3 * s, xo = x + (s < 0 ? -1 : 1);
      if (eyes === 2) { U.dot(E, x, yT - 1, M.shell, 2); continue; }
      if (eyes === 1) { U.dot(E, x, yT - 1, M.shell, 0); U.dot(E, x, yT - 2, M.shell, 1); U.dot(E, xo, yT - 2, M.shell, 1); continue; }
      U.dot(E, x, yT - 1, M.shell, 0); U.dot(E, x, yT - 2, M.shell, 0);
      for (const xx of [x, xo]) { U.dot(E, xx, yT - 3, M.eye, 3); U.dot(E, xx, yT - 4, M.eye, 3); }
      U.dot(E, Math.min(x, xo), yT - 4, M.spec, 3);
    }
  }
  // 候选部件：radialLegs（正面放射腿）——每侧 4 条：根在壳下 → 膝拱过壳沿 → 尖足往外伸；后排两条暗一级。每条腿一个部件
  //   gf 步态（A 组 = 右 0、2 + 左 1、3；接触帧两组脚左右互换，经过帧抬起一组）、ls 整体横拖、lr 缩进、dangle 悬空下垂
  const ROOT = [[5, 4], [6, 4], [6, 3], [7, 3]], KNEE = [[8.5, 2], [9.5, 1], [11, 1], [12.5, 2]], FOOT = [[8.5, 0], [11, 0], [13.5, 0], [15.5, -2]];   // 四脚朝天时用
  // 站立：从壳侧的腿根往外放射的 4 根射线（尖足落点 TIP，前两条踩地、后两条越来越平），膝往外上方拱 BOW 格
  const HUB = [4, 3], TIP = [[8.5, 0], [12, 0], [15.5, -1], [17.5, -4]], BOW = [1.5, 2.2, 2.4, 2];
  function leg(bx, yT, s, i, gf, ls, lr, dangle, groundY) {
    E.part();
    const mat = i >= 2 ? M.legFar : M.leg, isA = s > 0 ? (i & 1) === 0 : (i & 1) === 1;
    const rx = bx + s * HUB[0], ry = yT + HUB[1];
    let fx = bx + s * TIP[i][0], fy = groundY + TIP[i][1];
    const dx = fx - rx, dy = fy - ry, L = Math.hypot(dx, dy) || 1;
    let kx = rx + dx * 0.5 + (dy / L) * BOW[i] * s, ky = ry + dy * 0.5 - Math.abs(dx / L) * BOW[i];
    if (dangle) { kx = rx + s * 3; ky = ry - 1; fx = kx + s * (1 + i * 0.7); fy = ky + 4 - i; }
    else if (gf >= 0) {
      const sh = gf === 0 ? (isA ? 1 : -1) : gf === 2 ? (isA ? -1 : 1) : 0, up = (gf === 1 && !isA) || (gf === 3 && isA);
      fx += sh; kx += sh * 0.5; if (up) { fy -= 2; ky -= 1; }
    }
    fx += ls; kx += ls * 0.5;
    if (lr === 1) { fx = R((rx + fx) / 2) + s; fy = Math.min(fy, ry + 2); kx = R((rx + kx) / 2) + s; ky = ry - 1; }
    U.seg(E, rx, ry, kx, ky, 1, mat, 0); U.seg(E, kx, ky, fx, fy, 1, mat, 0);
    U.dot(E, kx, ky - 1, mat, i >= 2 ? 0 : 4);                                               // 膝节
    U.dot(E, fx, fy, mat, 1);                                                                // 尖足
  }
  function legs(bx, yT, gf, ls, lr, dangle, groundY) {
    if (lr >= 2) return;
    for (const i of [3, 2]) for (const s of [-1, 1]) leg(bx, yT, s, i, gf, ls, lr, dangle, groundY);
    for (const i of [1, 0]) for (const s of [-1, 1]) leg(bx, yT, s, i, gf, ls, lr, dangle, groundY);
  }
  // 候选部件：pincer（小螯）——螯臂 → 3×2 钳掌 → 两根指（指尖橘红）；s 左右（-1 / 1），st 见姿势字段 clL / clR
  const CL = [{ L: 0, O: 1 }, { L: 2, O: 1 }, { L: 1, O: 2 }];
  function pincer(bx, yT, s, st, cy) {
    if (st === 5) return;
    E.part();
    const px0 = bx + s * 10;
    if (st === 3) {                                                                          // 收到壳前：钳掌贴着壳沿，指朝上
      const px = bx + s * 5, py = yT + 2;
      U.seg(E, bx + s * 7, yT + 4, px + s, py + 1, 1, M.claw, 0);
      for (let dx = -1; dx <= 0; dx++) for (let dy = 0; dy <= 1; dy++) U.dot(E, px + s * dx, py + dy, M.claw, 0);
      U.dot(E, px - s, py - 1, M.tip, 3); U.dot(E, px + s, py - 1, M.tip, 3);
      return;
    }
    if (st === 4) {                                                                          // 甩开：钳掌落到壳侧，两指朝外
      const px = bx + s * 11, py = yT + 3 + cy;
      U.seg(E, bx + s * 7, yT + 3, px, py, 1, M.claw, 0);
      for (let dx = -1; dx <= 0; dx++) for (let dy = 0; dy <= 1; dy++) U.dot(E, px + s * dx, py + dy, M.claw, 0);
      U.dot(E, px + s, py - 1, M.claw, 0); U.dot(E, px + s * 2, py - 1, M.tip, 3);
      U.dot(E, px + s, py + 2, M.claw, 0); U.dot(E, px + s * 2, py + 2, M.tip, 3);
      return;
    }
    const c = CL[st], py = yT - 1 - c.L + cy, px = px0;
    U.seg(E, bx + s * 7, yT + 2, bx + s * 9, py + 2, 1, M.claw, 0);                          // 螯臂
    for (let dx = -1; dx <= 1; dx++) for (let dy = 0; dy <= 1; dy++) U.dot(E, px + dx, py + dy, M.claw, 0);   // 钳掌
    const w = c.O >= 2 ? 2 : 1;
    U.dot(E, px - w, py - 1, M.claw, 0); U.dot(E, px + w, py - 1, M.claw, 0);                // 两指
    U.dot(E, px - w, py - 2, M.tip, 3); U.dot(E, px + w, py - 2, M.tip, 3);                  // 指尖
    if (c.O >= 2) { U.dot(E, px - 1, py - 1, M.claw, 0); U.dot(E, px + 1, py - 1, M.claw, 0); }
  }
  // 候选部件：shellBall（缩成一团的壳球 / 轮子）——旋转椭圆，壳底那一条和螺旋斑跟着转；a 朝向角（弧度，顺时针）
  function shellBall(bx, lift, a) {
    E.part();
    const rx = 7.2, ry = 4.6, ca = Math.cos(a), sa = Math.sin(a), ey = Math.sqrt((rx * sa) ** 2 + (ry * ca) ** 2), cx = bx, cy = -ey - lift + 0.3;
    const n = Math.ceil(rx) + 1;
    for (let y = Math.floor(cy - n); y <= Math.ceil(cy + n); y++) for (let x = cx - n; x <= cx + n; x++) {
      const dx = x - cx, dy = y - cy, u = (dx * ca + dy * sa) / (rx + 0.35), v = (-dx * sa + dy * ca) / (ry + 0.35);
      if (u * u + v * v > 1) continue;
      U.dot(E, x, y, v > 0.5 ? M.under : M.shell, 0);
    }
    const at = (u, v) => [cx + u * ca - v * sa, cy + u * sa + v * ca];
    const s0 = at(0, -ry * 0.4); U.dot(E, s0[0], s0[1], M.spot, 1);
    for (const [u, v, t] of [[1, -ry * 0.4, 2], [1, -ry * 0.4 + 1, 2], [-1.5, -ry * 0.4 + 1, 3]]) { const q = at(u, v); U.dot(E, q[0], q[1], M.spot, t); }
    for (const u of [-4, 4]) { const q = at(u, -1); U.dot(E, q[0], q[1], M.shell, 2); }
  }
  // 候选部件：upsideDown（四脚朝天的蟹）——壳拱贴地、壳底朝上，腿和螯朝天乱蹬；lf 乱蹬相位
  function upsideDown(bx, lift, lf) {
    const yTop = -5 - lift;
    for (const i of [3, 2, 1, 0]) for (const s of [-1, 1]) {
      E.part(); const mat = i >= 2 ? M.legFar : M.leg, fl = ((i + (s > 0 ? 0 : 1)) & 1) === lf ? 1 : -1;
      const rx = bx + s * ROOT[i][0], ry = yTop + 1, kx = bx + s * (KNEE[i][0] - 0.5), ky = yTop - 2 - (i === 1 || i === 2 ? 1 : 0);
      const fx = bx + s * (FOOT[i][0] - 1) + fl, fy = yTop - 5 + [1, 0, 0, 2][i] + (fl > 0 ? 0 : 1);
      U.seg(E, rx, ry, kx, ky, 1, mat, 0); U.seg(E, kx, ky, fx, fy, 1, mat, 0); U.dot(E, fx, fy, mat, 1);
    }
    E.part();
    for (let r = 0; r < 6; r++) {
      const y = yTop + r, hw = HW[5 - r];
      for (let x = -hw; x <= hw; x++) { const under = r === 0 || (r === 1 && Math.abs(x) <= 6); U.dot(E, bx + x, y, under ? M.under : M.shell, r === 2 ? (x >= 7 ? 2 : 4) : 0); }
    }
    U.dot(E, bx, yTop, M.under, 1); U.dot(E, bx - 1, yTop + 1, M.under, 2); U.dot(E, bx + 1, yTop + 1, M.under, 2);
    for (const s of [-1, 1]) {                                                             // 螯朝天乱挥
      E.part(); const px = bx + s * (9 + (lf ? 1 : 0)), py = yTop - 2;
      U.seg(E, bx + s * 7, yTop + 2, px, py + 1, 1, M.claw, 0);
      for (let dx = -1; dx <= 1; dx++) U.dot(E, px + dx, py, M.claw, 0);
      U.dot(E, px - 1, py - 1, M.claw, 0); U.dot(E, px + 1, py - 1, M.claw, 0); U.dot(E, px - 1, py - 2, M.tip, 3); U.dot(E, px + 1, py - 2, M.tip, 3);
    }
  }
  // 小沙堆（死亡留下的）：lv 1 小 / 2 大，沙粒明暗点
  function sandPile(bx, lv) {
    E.part();
    const ROWS = lv === 1 ? [5, 3] : [7, 5, 2];
    for (let r = 0; r < ROWS.length; r++) for (let x = -ROWS[r]; x <= ROWS[r]; x++) U.dot(E, bx + x, -r, M.pile, ((x + r * 3) % 4 === 0) ? 4 : ((x + r) % 5 === 2 ? 2 : 0));
  }
  function drawHero() {
    begin(hero, 0, 0);
    const bx = P.bx;
    if (P.ret === 3) { shellBall(bx, P.lift, P.rot * Math.PI / 4); return; }
    if (P.lie === 2) { upsideDown(bx, P.lift, P.lf); return; }
    if (P.tilt) E.setShear(4);                                                               // 冲撞前倾：上半身往前错 1 格
    const yT = shellTop(), dangle = P.lift > 0 && !P.sink;
    legs(bx, yT, P.gf, P.ls, P.lr, dangle, P.sink - P.lift);
    if (P.sink < 13) frontShell(bx, yT, P.sp, P.mouth, P.eyes);
    if (!P.sink) { pincer(bx, yT, -1, P.clL, P.cy); pincer(bx, yT, 1, P.clR, P.cy); }
    else if (P.sink < 6) { pincer(bx, yT, -1, P.clL, 0); pincer(bx, yT, 1, P.clR, 0); }
    if (P.pile) sandPile(bx, P.pile);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let emberAcc = 0, trailAcc = 0, digAcc = 0, soulAcc = 0, lastGf = -9;
  const sx = (x) => scrX(x);
  function onEnter(s) {
    if (s === CAST) {
      releaseOrbit(30, 70, 0.25, 0.5, { up: 30 });
      burst(sx(0), HY - 4, 14, 30, 80, 0.2, 0.45, R_EL, 8); ring(sx(0), HY - 4, 0, R_EL); shake(0.28, 2); flash(0.05);
      for (let i = 0; i < 5; i++) spawn(K_DUST, sx(-3) + (Math.random() - 0.5) * 6, HY, -10 - Math.random() * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.earth);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const x = sx(P.bx + 9), y = HY - 5;
      burst(x, y, 8, 30, 80, 0.15, 0.3, FXI.impact, 8); hitDummy(0, 1);
      for (let i = 0; i < 3; i++) spawn(K_DUST, sx(-4) + (Math.random() - 0.5) * 4, HY, -8 - Math.random() * 14, -4 - Math.random() * 5, 0.3 + Math.random() * 0.15, FXI.earth);
      for (let i = 0; i < 2; i++) spawnX(K_PHYS, x, y - 2, -10 + Math.random() * 30, -30 - Math.random() * 20, 0.45, R_EL, { g: 200, floor: FLOOR - 1 });
      sfx('swing', { kind: 'smash', w: 0.2 }); sfx('hit', { mat: 'stone', w: 0.2 });
    }
    if (s === CAST && t === T_IMP) {
      const x = DUMMY_X - 4, y = HY - 7;
      fx.circle(x, y, 9, 7, R_EL, 0.35, 0.8, 2);                                            // 一圈小泡点阵
      burst(x, y, 20, 40, 110, 0.25, 0.55, R_EL, 10); ring(x, y, 1, R_EL); hitDummy(1, 1); shake(0.12, 1);
      sfx('impact', { pal: 'water', w: 0.3 });
    }
    if (s === CAST && t === T_POP) {                                                         // 泡泡破成水花
      for (let k = 0; k < 6; k++) { const a = k / 6 * 6.2832, [bx0, by0] = bubbleAt(k, T_POP - T_IMP); spawnX(K_PHYS, bx0, by0, Math.cos(a) * 40, -30 + Math.sin(a) * 25, 0.5, R_EL, { g: 220, floor: FLOOR - 1 }); }
    }
    if (s === RECOVER && t === T_LAND) {
      const x = sx(0);
      for (let i = 0; i < 8; i++) spawn(K_DUST, x - 8 + Math.random() * 16, HY, (Math.random() - 0.5) * 36, -6 - Math.random() * 10, 0.35 + Math.random() * 0.25, FXI.earth);
      burst(x, HY - 6, 6, 20, 50, 0.2, 0.4, R_EL, 6); sfx('step', { w: 0.2 });
    }
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 3 - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.earth);
      shake(0.1, 1); sfx('fall', { w: 0.2 });
    }
    if (s === DEATH && t === INCOMING + 1.05) burst(HX - 3, HY - 6, 6, 15, 40, 0.25, 0.5, R_EL, 8);   // 翻回来时吐出一串泡
  }
  const EVENTS = [[], [], [T_HIT], [], [T_IMP, T_POP], [T_LAND], [], [INCOMING + 0.66, INCOMING + 1.05], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.3) {                                                     // 身周冒出一圈白色小泡
      emberAcc += dt * (8 + 16 * clamp01(stT / DUR[CHARGE]));
      while (emberAcc >= 1) { emberAcc -= 1; const a = Math.random() * 6.2832; spawn(K_EMBER, sx(P.bx) + Math.cos(a) * 10, HY - 4 + Math.sin(a) * 4, Math.random() * 6 - 3, -8 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_EL); }
    }
    if (state === CAST && stT < T_IMP + 1 / 12) {                                           // 滚过去：身后一串泡沫尾和沙尘
      trailAcc += dt * 50;
      while (trailAcc >= 1) {
        trailAcc -= 1; const x = sx(P.bx - 6);
        if (Math.random() < 0.6) spawnX(K_PHYS, x + Math.random() * 3, HY - 1 - Math.random() * 4, -10 - Math.random() * 20, -20 - Math.random() * 20, 0.4 + Math.random() * 0.2, R_EL, { g: 160, floor: FLOOR - 1 });
        else spawn(K_DUST, x, HY, -10 - Math.random() * 20, -3 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.earth);
      }
    }
    if ((state === MOVE || (state === RECOVER && stT >= 0.25) || (state === ATTACK && stT >= 0.45)) && P.gf !== lastGf && P.gf >= 0) {   // 每 2 帧扬 1 颗沙
      const back = P.flip ? 1 : -1;
      spawn(K_DUST, scrX(back * 9) + (Math.random() - 0.5) * 3, HY, back * (4 + Math.random() * 8) * (P.flip ? -1 : 1), -3 - Math.random() * 4, 0.25 + Math.random() * 0.15, FXI.earth);
      if (state === MOVE && (P.gf === 0 || P.gf === 2)) sfx('step', { w: 0.2 });
      lastGf = P.gf;
    }
    const d = stT - INCOMING;
    if (state === DEATH && d > 1.13 && d < 1.8) {                                           // 刨沙：沙粒往两侧飞
      digAcc += dt * 30;
      while (digAcc >= 1) { digAcc -= 1; const s = Math.random() < 0.5 ? -1 : 1; spawnX(K_PHYS, HX - 3 + s * (4 + Math.random() * 4), HY - 1, s * (30 + Math.random() * 40), -40 - Math.random() * 40, 0.5, FXI.earth, { g: 260, floor: FLOOR - 1 }); }
    }
    if (state === DEATH && d > 1.95 && d < 2.5) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 3 - 7 + Math.random() * 14, HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.6, FXI.soul); } }
  }
  function fxReset() { emberAcc = 0; trailAcc = 0; digAcc = 0; soulAcc = 0; lastGf = -9; }
  // 空心小圆泡：十字 4 格 + 左上高光
  function bubble(x, y, c0, c1) { x = R(x); y = R(y); put(x - 1, y, c1); put(x + 1, y, c1); put(x, y - 1, c1); put(x, y + 1, c1); put(x - 1, y - 1, c0); }
  function pop(x, y, c) { x = R(x); y = R(y); put(x - 2, y - 2, c); put(x + 2, y - 2, c); put(x - 2, y + 2, c); put(x + 2, y + 2, c); }
  // 技能命中后外爆的一圈泡：第 k 颗在命中后 dt 秒的位置
  function bubbleAt(k, dt) { const a = k / 6 * 6.2832 + 0.3, r = 3 + dt * 40; return [DUMMY_X - 4 + Math.cos(a) * r, HY - 7 + Math.sin(a) * r * 0.8]; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(sx(P.bx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const st = E.state, t = E.stT;
    if (st === IDLE || (st === HURT && t < INCOMING) || (st === DEATH && t < INCOMING)) {   // 待机个性：嘴边冒 3 个泡往上飘、破掉
      const lp = t % DUR[IDLE];
      for (let k = 0; k < 3; k++) {
        const age = lp - (1.45 + k * 0.17); if (age < 0) continue;
        const x = sx(P.bx + [-1, 1, 0][k] + (f12of(age) % 3 === 2 ? (k & 1 ? -1 : 1) : 0)), y = HY + shellTop() + 4 - R(age * 16);
        if (age < 0.5) bubble(x, y, EL[0], EL[1]); else if (age < 0.5 + 1 / 12) pop(x, y, EL[0]);
      }
    }
    if (st === ATTACK && t >= T_HIT && t < T_HIT + 2 / 12) {                                // 冲撞速度线
      const first = t < T_HIT + 1 / 12, x0 = sx(P.bx - 10);
      for (const [dy, len] of [[-7, 5], [-5, 7], [-3, 4]]) for (let i = 0; i < len; i++) { if (!first && (i & 1)) continue; put(x0 - i, HY + dy, first ? (i < 2 ? EL[0] : EL[1]) : EL[2]); }
    }
    if (st === CHARGE && t > 0.7) {                                                         // 蓄满：4 颗小泡绕着壳转
      for (let k = 0; k < 4; k++) { const a = t * 5 + k * 1.5708; bubble(sx(P.bx) + Math.cos(a) * 11, HY - 4 + Math.sin(a) * 3.5, EL[0], (k + f12) & 1 ? EL[1] : EL[2]); }
    }
    if (st === CAST && t >= T_IMP && t < T_POP) {                                           // 命中：一圈泡往外飞
      for (let k = 0; k < 6; k++) { const [x, y] = bubbleAt(k, t - T_IMP); bubble(x, y, EL[0], EL[1]); }
    }
    if (st === CAST && t >= T_POP && t < T_POP + 1 / 12) for (let k = 0; k < 6; k++) { const [x, y] = bubbleAt(k, T_POP - T_IMP); pop(x, y, EL[0]); }
  }

  return {
    name: '小螃蟹', HX, R_EL, DUR, hero, P, GLOW_MATS: [], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'water', style: 'shield', w: 0.2 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
