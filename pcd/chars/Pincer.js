// 巨蟹钳（衍生单位 · 自然 · 先锋 · 普通 · 近战 240）：「肉盾近战宠物（巨蟹）」——巨蟹系召唤物里的「单只巨钳」。
// 一只超大的珊瑚红蟹钳占全身七成，斜举在身前当盾（钳尖朝右上 30°），钳根连着一个小圆壳身体和 6 条短细腿，像一只「长了腿的钳子」。
// 钳背附着藤壶、垂下一撮海藻；两根 1 格细眼柄从小壳上竖起，墨黑眼点只高出壳顶 4 格、比举起的钳尖高 2 格。
// 攻击 = 巨钳张开向前一伸，「咔」地夹住目标；技能 = 先锋的招牌「钳盾」：举钳格挡撑起点阵半圆水盾 → 护盾向前推出、碎成水花，巨钳猛地合拢 →
//   目标处两道钳形小弧对夹 + 溅液 + 冲击环 + 眩晕 → 钳子放下、海藻晃动。
// 移动 = 钳子撑地拖行（钳尖着地时身体顿一下，抬钳时往前滑）；死亡 = 整只翻过来、壳腹朝天、钳子朝天，细腿在空中蹬几下后僵住，钳指慢慢合上，然后消散。
// 身体用 parts-beast 的 bug（短腿、腿在壳下），巨钳、眼柄、翻倒姿自画。
PCD.define('Pincer', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, G = B.bug, U = B.util, R = Math.round;

  // ───── 元素：潮汐 · 深海蓝（water 色阶 21 白 → 淡水青 → 水蓝 → 深蓝 → 墨蓝；汇聚与护盾以第 3–4 级深水蓝为主）─────
  const R_EL = FXI.water, EL = FXR[R_EL];
  const R_DEEP = E.fxRamp('tideDeep', [22, 41, 40, 39, 39]);               // 深水：汇聚粒子（第 3–4 级为主）

  // ───── 材质 ─────
  const CORAL = E.ramp(['#2a0806', '#6a1c10', '#b83a1e', '#f07a4a']);              // 珊瑚红蟹甲（crimson 偏橘）
  const m = B.mats(E, { main: CORAL, limb: E.ramp(['#2a0806', '#4a140c', '#6a1c10', '#b83a1e']), claw: 'bone', eye: [0, 0, 0, 0] });   // 细腿比壳暗一级
  const M = {
    claw: E.defMat(CORAL, 2), arm: E.defMat(CORAL, 1), tip: E.defMat('bone', 1),                 // 巨钳（大面积 band 2）、腕节、钳尖 / 钳齿骨白
    glowT: E.defMat([39, 22, 21, 21], 1, 1),                                                      // 发光的钳尖（技能，发光体）
    barn: E.defMat([CORAL[0], 7, 18, 17], 1), weed: E.defMat([CORAL[0], 35, 36, 37], 1), belly: E.defMat('sand', 1),   // 藤壶（石灰白）、海藻（苔绿，勾线借甲壳色）、翻过来的腹甲
    eye: E.defMat([0, 0, 0, 0], 1, 1), spec: E.defMat([21, 21, 21, 21], 1, 1),
  };
  // 小圆壳 + 6 条短细腿：膝最高只到壳身中线（knee 负数 = 膝低于壳顶），脚尖着地，藏在钳子和壳下面
  const o = G.shape({ n: 3, rx: 4.5, ry: 3.3, under: 6.5, abd: null, head: null, span: 5.5, knee: -4.5, farDx: -2, stride: 1.5, lift: 1, lw: 1, fan: 0.6, kneeOut: 0.5,
    claws: null, eyes: 0, stalks: 0, fangs: 0, hair: 0, legsFront: 0, m });

  const HX = 66, DUR = DEFAULT_DUR.slice(), hero = new Sprite(64, 40, 26, 36);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [m.eye, m.ink, m.spec, m.claw, M.tip, M.glowT, M.barn, M.weed, M.eye, M.spec, M.belly]) RIM.skip[k] = 1;
  // 姿势字段：th 巨钳指向（×5°，0 朝前、6 = 30° 斜举、18 = 朝天）· cx cy 掌心 · pin 张开 0–6（PHI 表，3 = 0.48 rad 待机 V 口、6 = 0.72 rad 张到最大）· gem 钳尖发光 0–4 · stk 眼柄转向 -1..1
  //   blink 闭眼 · sw 海藻摆 -1..1 · flipd 0 站 / 1 失衡 / 2 翻倒 · kick 翻倒后腿：0 蜷 · 1 / 2 交替蹬 · 3 僵直 · glint 合拢瞬间钳尖闪
  const EXTRA = [['th', -12, 18], ['cx', -4, 24], ['cy', -24, 4], ['pin', 0, 6], ['gem', 0, 4], ['stk', -1, 1], ['blink', 0, 1], ['sw', -1, 1], ['flipd', 0, 2], ['kick', 0, 3], ['glint', 0, 1]];
  const SPEC = G.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  const REST = { th: 4, cx: 9, cy: -5, pin: 3 };                  // 下指 20°、张开 0.48 rad → V 口的中线约 34°（钳尖朝右上）
  function reset() { G.reset(P); Object.assign(P, REST); P.gem = 0; P.stk = 0; P.blink = 0; P.sw = 0; P.flipd = 0; P.kick = 0; P.glint = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = G.rig(P, o);
  const HIT_POINT = [6, -8];
  const T_SNAP = 2 / 12, T_PUSH = 2 / 12, T_HIT = 3 / 12, T_LAND = INCOMING + 0.66;

  // ───── 巨钳几何：本地 u 沿钳指、v 垂直（v > 0 是动指 / 钳背一侧）；世界 = 掌心 + u·(cos, −sin) + v·(−sin, −cos) ─────
  const PA = 6.5, PB = 5, HU = 3, HV = 3.4, PHI = [0, 0.16, 0.32, 0.48, 0.58, 0.66, 0.72], TIP_U = 14, TIP_V = 0.4;
  const inPalm = (u, v) => (u * u) / (PA * PA) + (v * v) / (PB * PB) <= 1;
  function lowerAt(u, v) {                                                     // 不动指（下指，粗）：0 无 · 1 甲 · 2 内缘齿 · 3 钳尖
    if (u < 2.5 || u > 14.5) return 0;
    const k = (u - 2.5) / 12, hi = 0.4 + 0.9 * k * k, lo = -PB + 0.6 + 3.6 * Math.pow(k, 0.85);
    if (v >= lo && v <= hi) return u >= 12.6 ? 3 : 1;
    if (u >= 5 && u < 12 && (Math.floor(u) & 1) && v > hi && v <= hi + 1.05) return 2;
    return 0;
  }
  function upperAt(u, v) {                                                     // 动指（上指，短、细，合拢坐标）
    if (u < HU - 0.5 || u > 13.2) return 0;
    const k = Math.max(0, (u - HU) / 10.2), top = HV + 1.3 - 2.6 * Math.pow(k, 0.9), lo = 1.5 - 0.9 * k * k;
    if (v >= lo && v <= top) return u >= 11.6 ? 3 : 1;
    if (u >= 5 && u < 11 && !(Math.floor(u) & 1) && v < lo && v >= lo - 1.05) return 2;
    return 0;
  }
  const clawW = (X, Y, th, u, v) => { const a = th * Math.PI / 36, c = Math.cos(a), s = Math.sin(a); return [X + u * c - v * s, Y - u * s - v * c]; };
  const tipAt = () => clawW(P.cx, P.cy + (P.flipd === 2 ? -P.lift : 0), P.th, TIP_U, TIP_V);

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.cy = REST.cy + (b & 1); P.sw = [0, 1, 0, -1][(b + 1) & 3]; P.stk = 0;
    const lp = tq % DUR[IDLE];
    if (lp >= 1.5 - 1e-6 && lp < 2.0) { const k = Math.min(5, f12of(lp - 1.5)); P.pin = [5, 0, 5, 0, 2, 3][k]; P.stk = [-1, -1, 1, 1, 0, 0][k]; P.sw = [1, -1, 1, -1, 0, 0][k]; }   // 待机个性：咔嚓两下，眼柄左右转
    else if (lp >= 0.6 && lp < 0.9) P.stk = 1;
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                    // 钳子撑地拖行：钳尖着地（身体顿一格）→ 拖 → 再撑（顿）→ 抬钳往前滑
      const f = G.anim.walk(P, tq);
      if (f === 3) { P.th = 6; P.cx = 11; P.cy = -8; P.pin = 3; P.sw = 1; P.bx = 1; P.stk = 1; }
      else { P.th = [-6, -6, -7][f]; P.cx = [12, 10, 9][f]; P.cy = [-8, -7, -7][f]; P.pin = 1; P.sw = f === 0 ? -1 : 0; }
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                // 张到最大后缩 → 前伸「咔」地夹住 → 夹紧 → 回到斜举
      if (tq < T_SNAP - 1e-6) { P.th = 5; P.cx = 7; P.cy = -7; P.pin = 6; P.bx = -1; P.pitch = 1; P.sw = 1; }
      else if (tq < 0.25) { P.th = 2; P.cx = 11; P.cy = -8; P.pin = 0; P.bx = 2; P.sw = -1; P.stk = 1; }
      else if (tq < 0.45) { P.th = 2; P.cx = 10; P.cy = -8; P.pin = 0; P.bx = 2; P.sw = -1; }
      else { const q = clamp01((tq - 0.45) / 0.3); P.th = R(2 + 2 * q); P.cx = R(10 - q); P.cy = R(-8 + 3 * q); P.pin = R(1 + 2 * q); P.bx = R(2 * (1 - q)); P.sw = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                                // 巨钳举到身前张开成盾面，钳尖发亮
      const q = ease.inOut(clamp01(tq / 0.7)); P.th = R(4 + 2 * q); P.cx = R(9 + q); P.cy = R(-5 - q); P.pin = q < 0.3 ? 3 : q < 0.6 ? 5 : 6; P.crouch = q > 0.5 ? 1 : 0;
      P.gem = tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = 2; P.sw = q > 0.4 ? ((f12 & 1) ? -1 : 1) : 0; P.stk = -1;
      if (tq > 1.1) P.pin = 6 - (f12 & 1);
    } else if (st === CAST) {                                                  // 第 0 帧：护盾推出、钳子还张着 → 第 1 帧起：钳子「咔」地合拢定格
      if (tq < 1 / 12 - 1e-6) { P.th = 8; P.cx = 11; P.cy = -7; P.pin = 6; P.bx = 1; P.gem = 3; P.rim = 3; P.sw = -1; P.crouch = 1; }
      else { P.th = 7; P.cx = 12; P.cy = -7; P.pin = 0; P.bx = 2; P.gem = 3; P.rim = 3; P.sw = 1; P.glint = tq < 3 / 12 ? 1 : 0; }
      P.stk = 1;
    } else if (st === RECOVER) {                                               // 钳子放回斜举、慢慢张开，海藻晃动
      const q = ease.inOut(clamp01(tq / 0.6)); P.th = R(7 - 3 * q); P.cx = R(12 - 3 * q); P.cy = R(-7 + 2 * q); P.bx = R(2 * (1 - q)); P.pin = R(3 * q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.sw = [1, -1][f12 & 1] * (q < 0.8 ? 1 : 0);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { G.anim.hurt(P, h); P.claw = 0; P.pitch = 0; P.jaw = 0; P.tail = 0; if (h < 0.35) { P.blink = 1; P.th = 9; P.cx = 7; P.cy = h < 0.2 ? -8 : -7; P.pin = 5; P.sw = 1; P.stk = -1; } }
    } else if (st === DEATH) {                                                 // 翻倒：失衡甩钳 → 壳腹朝天、钳子朝天 → 腿在空中蹬 → 僵住 → 钳指慢慢合上 → 消散
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.crouch = d < 0.15 ? 1 : 2; P.flash = d < 1 / 12 ? 1 : 0; P.blink = 1; P.th = 9; P.cx = 7; P.cy = -8; P.pin = 5; P.sw = 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { P.flipd = 1; P.lie = 1; P.bx = -3; P.blink = 1; P.th = 15; P.cx = 6; P.cy = -9; P.pin = 6; P.sw = -1; P.gem = 4; }
      else {
        P.flipd = 2; P.bx = -3; P.blink = 1; P.th = 17; P.cx = 12; P.cy = -8; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.gem = 4;
        P.kick = d < 0.66 ? 0 : d < 1.3 ? 1 + (Math.floor((d - 0.66) * 6 + 1e-6) & 1) : 3;
        P.sw = d < 1.3 ? ((f12 & 1) ? 1 : -1) : 0;
        P.pin = d < 1.0 ? 6 : d >= 1.6 ? 0 : Math.max(0, Math.min(6, R(6 * (1 - (d - 1.0) / 0.6))));
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = G.rig(P, o);
    const tp = tipAt(); P.gx = R(tp[0]) + P.bx; P.gy = R(tp[1]);
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：giantPincer —— 单只巨钳（非人形「单螯」角色用），按像素反算本地坐标栅格化，任意角度都不漏点：
  //   腕节粗臂 → 掌 + 不动指（下指粗、内缘骨白齿、钩尖）→ 动指（绕铰点张开，短、细、内缘齿）→ 钳背藤壶 → 钳背垂下的海藻。
  //   (X, Y) 掌心、th 指向（×5°）、pin 张开 0–6、gl 钳尖发光档 0–4、sw 海藻摆、arm 腕节从哪里伸出（null = 不画臂）
  function giantPincer(X, Y, th, pin, gl, sw, arm) {
    const a = th * Math.PI / 36, c = Math.cos(a), s = Math.sin(a), ph = PHI[pin], pc = Math.cos(ph), ps = Math.sin(ph);
    const W = (u, v) => [X + u * c - v * s, Y - u * s - v * c];
    const tipM = gl === 2 || gl === 3 ? M.glowT : M.tip, tipT = gl === 3 ? 4 : gl === 4 ? 2 : 3;
    const x0 = R(X) - 18, x1 = R(X) + 18, y0 = R(Y) - 18, y1 = Math.min(0, R(Y) + 18);
    if (arm) { E.part(); const h = W(-PA + 1.5, -0.5); U.seg(E, arm[0], arm[1], h[0], h[1], 3, M.arm, 0); U.dot(E, R((arm[0] + h[0]) / 2) - 1, R((arm[1] + h[1]) / 2), M.arm, 4); }
    E.part();                                                                  // 掌 + 不动指
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - X, dy = y - Y, u = dx * c - dy * s, v = -dx * s - dy * c;
      if (inPalm(u, v)) { const hl = ((u + 1.5) * (u + 1.5)) / 9 + ((v - 2) * (v - 2)) / 2.2 <= 1; U.dot(E, x, y, M.claw, hl ? 4 : 0); continue; }
      const k = lowerAt(u, v); if (k) U.dot(E, x, y, k === 1 ? M.claw : k === 2 ? M.tip : tipM, k === 1 ? 0 : k === 2 ? 3 : tipT);
    }
    E.part();                                                                  // 动指：绕铰点 (HU, HV) 张开
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const dx = x - X, dy = y - Y, du = dx * c - dy * s - HU, dv = -dx * s - dy * c - HV;
      const k = upperAt(HU + du * pc + dv * ps, HV - du * ps + dv * pc);
      if (k) U.dot(E, x, y, k === 1 ? M.claw : k === 2 ? M.tip : tipM, k === 1 ? 0 : k === 2 ? 3 : tipT);
    }
    E.part();                                                                  // 钳背藤壶：3 只小石锥（顶上暗口），骑在掌背轮廓上
    for (const [u, v] of [[-3.5, 4.6], [-0.2, 5], [-5.8, 2.6]]) { const p = W(u, v), bx = R(p[0]) - 1, by = R(p[1]) - 1; U.dot(E, bx, by, M.barn, 3); U.dot(E, bx + 1, by, M.barn, 2); U.dot(E, bx + 2, by, M.barn, 3); U.dot(E, bx, by + 1, M.barn, 4); U.dot(E, bx + 1, by + 1, M.barn, 3); U.dot(E, bx + 2, by + 1, M.barn, 2); }
    E.part();                                                                  // 海藻：从钳背垂下 3 格，两缕，随 sw 摆
    const r0 = W(-2, 3.6), ax = R(r0[0]), ay = R(r0[1]);
    U.dot(E, ax, ay, M.weed, 4); U.dot(E, ax, ay + 1, M.weed, 3); U.dot(E, ax + (sw < 0 ? -1 : 0), ay + 2, M.weed, 3); U.dot(E, ax + sw, ay + 3, M.weed, 4);
    U.dot(E, ax + 1, ay, M.weed, 3); U.dot(E, ax + 1, ay + 1, M.weed, 2); U.dot(E, ax + 1 + (sw > 0 ? 1 : 0), ay + 2, M.weed, 2);
  }
  // 候选部件：eyeStalk —— 1 格细眼柄（长 L 格）+ 顶端 2×2 墨黑眼点（近侧带 1 格白高光）；look -1..1 顶端偏转；closed 闭眼 = 眼柄缩一格、眼点变暗
  function eyeStalk(x0, base, L, look, far, closed) {
    E.part(); const mat = far ? m.far : m.limb;
    for (let k = 1; k <= L; k++) U.dot(E, x0 + (k === L ? look : 0), base - k, mat, 0);
    const ex = x0 + look, ey = base - L - 1;
    if (closed) { U.dot(E, ex, ey + 1, mat, 2); U.dot(E, ex + 1, ey + 1, mat, 2); return; }
    U.dot(E, ex, ey, M.eye, 1); U.dot(E, ex + 1, ey, M.eye, 1); U.dot(E, ex, ey - 1, M.eye, 1); U.dot(E, ex + 1, ey - 1, M.eye, 1);
    if (!far) U.dot(E, ex + 1, ey - 1, M.spec, 4);
  }
  function face() {                                                            // 口器 + 壳沿斑点
    const T = rig.T, x = R(T.x + T.rx), y = R(T.y + 1);
    U.dot(E, x, y, m.body, 1); U.dot(E, x - 1, y + 1, m.body, 1);
    U.dot(E, R(T.x - 2), R(T.y - 2), m.body, 4); U.dot(E, R(T.x + 1), R(T.y - 2), m.body, 4);
  }
  // 翻倒姿（drawLying）：壳背着地、腹甲朝天，6 条腿从腹甲朝上伸（kick 0 蜷 · 1 / 2 两组交替上下蹬 · 3 僵直），眼柄软垂，巨钳朝天
  function drawLying() {
    const y0 = -P.lift;
    const leg = (far, i) => {
      E.part(); const mat = far ? m.far : m.limb, dir = i - 1, rx = -6 + i * 3 + (far ? -1 : 0), grpA = far ? i === 1 : i !== 1;
      const off = P.kick === 1 ? (grpA ? -2 : 0) : P.kick === 2 ? (grpA ? 0 : -2) : P.kick === 3 ? -1 : 1, ry0 = y0 - 6;
      let kx, ky, fx2, fy;
      if (P.kick === 3) { kx = rx + dir * 1.5; ky = ry0 - 3 + off; fx2 = rx + dir * 3; fy = ry0 - 6 + off; }          // 僵直：一条直线戳向天
      else if (P.kick === 0) { kx = rx + dir * 2 + (dir === 0 ? 1 : 0); ky = ry0 - 3; fx2 = kx + (dir <= 0 ? 1 : -1); fy = ry0 - 4; }   // 蜷起
      else { kx = rx + dir * 2 + (dir === 0 ? 1 : 0); ky = ry0 - 3 + off; fx2 = rx + dir * 3 + (dir === 0 ? -1 : 0); fy = ry0 - 6 + off; }
      U.seg(E, rx, ry0, kx, ky, far ? 1 : 2, mat, 0); U.seg(E, kx, ky, fx2, fy, 1, mat, 0); U.dot(E, kx, ky - 1, mat, far ? 0 : 4); U.dot(E, fx2, fy, m.claw, 1);
    };
    for (let i = 0; i < 3; i++) leg(1, i);
    E.part(); U.oval(E, -3, y0 - 3.4, 5, 3.3, m.body, 0);                        // 壳背着地
    for (const x of [-6, -3, 0]) U.dot(E, x, y0 - 1, m.body, 2);
    E.part(); for (let x = -7; x <= 1; x++) U.dot(E, x, y0 - 6, M.belly, 0); for (let x = -6; x <= 0; x++) U.dot(E, x, y0 - 7, M.belly, 0);   // 腹甲朝天
    for (const x of [-5, -2]) U.dot(E, x, y0 - 6, M.belly, 2); U.dot(E, -4, y0 - 7, M.belly, 4); U.dot(E, -1, y0 - 7, M.belly, 4);
    for (let i = 0; i < 3; i++) leg(0, i);
    E.part(); U.seg(E, 1, y0 - 2, 3, y0, 1, m.limb, 0); U.dot(E, 4, y0, m.limb, 2);   // 软垂到地上的眼柄
    giantPincer(P.cx, P.cy + y0, P.th, P.pin, P.gem, P.sw, [1, y0 - 4]);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    if (P.flipd === 2) { drawLying(); return; }
    const T = rig.T, base = R(T.y - T.ry), tx = R(T.x), L = P.blink ? 1 : 2;
    G.legs(E, rig, P, o, 1);
    eyeStalk(tx - 2, base, L, P.stk, 1, P.blink);
    G.legs(E, rig, P, o, 0);
    G.body(E, rig, P, o); face();
    eyeStalk(tx + 3, base, L, P.stk, 0, P.blink);
    giantPincer(P.cx, P.cy, P.th, P.pin, P.gem, P.sw, [R(T.x + T.rx - 1), R(T.y + 1)]);
    if (P.glint) { const t = tipAt(); U.dot(E, R(t[0]) + 1, R(t[1]) - 1, M.glowT, 4); U.dot(E, R(t[0]) + 2, R(t[1]) - 2, M.glowT, 4); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const DCX = DUMMY_X, DCY = HY - 14, SH_X = 12, SH_Y = -11, SH_R = 12;       // 水盾：以钳前 (12, −11) 为心、半径 12 的右半圆
  let chargeAcc = 0, bubAcc = 0, soulAcc = 0, lastGf = -9, snapT = 9, snapX = 0, snapY = 0, pushT = 9, lastKick = -1, shLit = -1, shX0 = 0;
  const tipScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CAST) {                                                           // 护盾「啪」地向前推出
      poseAt(CAST, 0, E.simT); const [gx, gy] = tipScr();
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1, kind: K_PHYS, g: 140, floor: FLOOR - 1 }); burst(gx, gy, 12, 40, 90, 0.2, 0.45, R_EL, 6);
      pushT = 0; shX0 = scrX(SH_X); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SNAP) {                                         // 「咔」：钳尖咬合弧 + 命中火花
      snapT = 0; const [gx, gy] = tipScr(); snapX = gx; snapY = gy;
      burst(DCX - 3, gy, 10, 30, 80, 0.12, 0.3, FXI.impact, 6); burst(DCX - 3, gy, 5, 20, 50, 0.2, 0.4, R_EL, 10); hitDummy(0);
      sfx('swing', { kind: 'claw', w: 0.5 }); sfx('hit', { mat: 'stone', w: 0.5 });
    }
    if (s === CAST && t === T_PUSH) {                                           // 护盾推到最前、碎成水花
      const x = shX0 + 6;
      for (let i = 0; i < 16; i++) { const a = -Math.PI / 2 + Math.random() * Math.PI; spawnX(K_PHYS, x + Math.cos(a) * SH_R, HY + SH_Y + Math.sin(a) * SH_R, 10 + Math.cos(a) * 40, -20 + Math.sin(a) * 30 - Math.random() * 20, 0.45 + Math.random() * 0.3, R_EL, { g: 200, floor: FLOOR - 1 }); }
    }
    if (s === CAST && t === T_HIT) {                                            // 目标处两道钳形小弧对夹 + 溅液 + 冲击环 + 眩晕
      fx.slash(DCX - 1, DCY - 6, 8, -1.9, -0.2, R_EL, 0.25, 2, 2); fx.slash(DCX - 1, DCY + 6, 8, -1.25, -2.95, R_EL, 0.25, 2, 2);
      for (let i = 0; i < 16; i++) spawnX(K_PHYS, DCX - 2, DCY, (Math.random() - 0.5) * 90, -30 - Math.random() * 60, 0.5 + Math.random() * 0.4, R_EL, { g: 220, floor: FLOOR - 1 });
      ring(DCX - 2, DCY, 1, R_EL); fx.cross(DCX - 2, DCY, 5, R_EL, 0.2); hitDummy(1); dummyFx({ dur: 1.0, stun: 1 }); shake(0.12, 1);
      sfx('impact', { pal: 'water', w: 0.5 });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 12 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 12, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.45 });
    }
  }
  const EVENTS = [[], [], [T_SNAP], [], [T_PUSH, T_HIT], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = tipScr();
    shLit = state === CHARGE ? (stT >= 0.45 ? clamp01((stT - 0.45) / 0.6) : -1) : -1;   // 水盾从 0.45 s 起逐点亮起
    if (state === CHARGE) {
      chargeAcc += dt * (18 + 20 * clamp01(stT / DUR[CHARGE]));                // 水珠从地面汇聚到钳尖
      while (chargeAcc >= 1) { chargeAcc -= 1; const x = gx - 14 + Math.random() * 20; spawnX(K_SPIRAL_PT, x, HY - 1, 0, 0, 9, R_DEEP, { a: Math.random() * 6.28, r: 9, w: 5, tx: gx, ty: gy, orbitR: 2, orbitW: 9, squash: 0.6 }); }
    }
    if (state === MOVE && P.gf !== lastGf) { if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 2; i++) spawn(K_DUST, gx + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 18, -3 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); sfx('step', { w: 0.4 }); } lastGf = P.gf; }
    if (state === IDLE) { bubAcc += dt * 1.2; while (bubAcc >= 1) { bubAcc -= 1; spawn(K_EMBER, scrX(R(rig.T.x + rig.T.rx) + 1), HY + R(rig.T.y), 2 + Math.random() * 4, -6 - Math.random() * 4, 0.7 + Math.random() * 0.4, R_EL); } }   // 口器吐泡
    if (state === RECOVER && stT < 0.4) { bubAcc += dt * 14; while (bubAcc >= 1) { bubAcc -= 1; spawnX(K_PHYS, gx - 8 + Math.random() * 6, gy + 6 + Math.random() * 6, (Math.random() - 0.5) * 10, 0, 0.5, R_EL, { g: 120, floor: FLOOR - 1 }); } }   // 钳子上的水往下滴
    if (state === DEATH && P.flipd === 2 && P.kick !== lastKick) { if (P.kick === 1 || P.kick === 2) spawn(K_DUST, scrX(P.bx), HY - 14, (Math.random() - 0.5) * 12, -6, 0.3, FXI.dust); lastKick = P.kick; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 28, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    snapT += dt; pushT += dt;
  }
  function fxReset() { chargeAcc = 0; bubAcc = 0; soulAcc = 0; lastGf = -9; snapT = 9; pushT = 9; lastKick = -1; shLit = -1; }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1 && !P.flipd) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 点阵半圆水盾：外圈 r 12 连点（水蓝，第 3 级）、中圈 r 10 隔点（深蓝，第 4 级）、内圈 r 8 每 3 点；从地面往上逐点亮起，刚亮的点是白 / 淡水青，
  //   一个淡水青高光沿外圈往上跑；brk = 碎开（隔点、淡色）
  function waterShield(cx, cy, lit, brk, f12) {
    const n = 40, run = (f12 >> 1) % 8;
    for (let k = 0; k <= n; k++) {
      const q = k / n; if (q > lit) break;
      const a = Math.PI / 2 - q * Math.PI, ca = Math.cos(a), sa = Math.sin(a), fresh = lit < 1 && q > lit - 0.1;
      for (const [r, every, col] of [[SH_R, 1, EL[2]], [SH_R - 2, 2, EL[3]], [SH_R - 4, 3, EL[3]]]) {
        if (k % every) continue; if (brk && ((k + f12) & 1)) continue;
        const x = R(cx + ca * r), y = R(cy + sa * r); if (y > HY) continue;
        put(x, y, fresh ? (r === SH_R ? EL[0] : EL[1]) : brk ? EL[1] : r === SH_R && (k >> 2) % 8 === run ? EL[1] : col);
      }
    }
  }
  function fxFront(f12) {
    const [gx, gy] = tipScr();
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.flipd) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (shLit >= 0) waterShield(scrX(SH_X), HY + SH_Y, shLit, 0, f12);
    if (pushT < T_PUSH) waterShield(shX0 + R(6 * ease.out(Math.min(1, (pushT + 1 / 12) / T_PUSH))), HY + SH_Y, 1, pushT >= 1 / 12 - 1e-6 ? 1 : 0, f12);   // 施放：护盾往前推 3 → 6 格，第 1 帧碎开
    if (snapT < 2 / 12) {                                                       // 咬合弧：钳尖上下两道小弧向中间合
      const c = snapT < 1 / 12 ? EL[0] : EL[2], r = snapT < 1 / 12 ? 4 : 3;
      for (let k = 0; k <= 4; k++) { if (snapT >= 1 / 12 && (k & 1)) continue; const a = k / 4 * 1.2; put(snapX + 2 + R(Math.sin(a) * r), snapY - 1 - R(Math.cos(a) * r), c); put(snapX + 2 + R(Math.sin(a) * r), snapY + 1 + R(Math.cos(a) * r), c); }
    }
  }

  return {
    name: '巨蟹钳', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glowT], HIT_POINT, EVENTS,
    REVIVE: { dy: -8, ramp: 'water' },
    SFX: { body: 'armor', how: 'topple', pal: 'water', style: 'shield', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
