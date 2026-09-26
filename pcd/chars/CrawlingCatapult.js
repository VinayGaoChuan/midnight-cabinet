// 爬行投石车（虚空 · 射手 · 史诗）：架在六条紫黑虫足上的焦黑木投石车。车尾一块发紫光的虚空石配重、车侧一只铁绞盘、
// 木投臂斜指后上方、末端抛兜里兜着一颗石弹。移动极慢：六条腿一条一条往前挪。
// 攻击 = 绞盘咔咔后压投臂 → 猛甩，燃烧石弹高抛落到假人身上；技能 = 特性「火炮」（目标越远伤害越高）：
// 地面从近到远亮起 3 个瞄准点，投臂压到底，石弹点燃，一甩砸在最远那个点上（火焰外爆 + 地裂 + 碎石四溅）。
// 死亡 = 虫足一齐软塌摊平、绳索绷断投臂弹飞，木架起火烧焦后化灰（死亡套件 ash）。
// 身体不用现成骨架：虫足、车架、配重、绞盘、投臂、抛兜都是本模块自画的部件（候选部件见各函数前的注释）；画笔借 parts-beast 的 util。
PCD.define('CrawlingCatapult', (E) => {
  const { defMat, Sprite, begin, part, sp, run, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, death, sfx } = E;
  const U = E.parts.beast.util, dropAt = E.parts.beast.dropAt || null, RD = Math.round;

  // ───── 材质 ─────
  const M_WOOD = defMat('wood', 2), M_ARM = defMat('wood', 1);                       // 焦黑旧木车架（大块 band 2）/ 投臂
  const M_CH1 = defMat([0, 0, 20, 19], 2), M_CH2 = defMat([0, 0, 0, 20], 2);          // 烧焦一档 / 二档（死亡）
  const M_LEG = defMat('shadow', 1), M_LEGF = defMat('shadow', 1, 0, 1), M_CLAW = defMat('bone', 1);   // 紫黑虫足（远侧暗一级）/ 足尖
  const M_IRON = defMat('iron', 1), M_ROPE = defMat('leather', 1), M_STONE = defMat('pale', 1);
  const M_FIRE = defMat([44, 45, 46, 47], 1, 1), M_HOT = defMat([46, 47, 51, 21], 1, 1);   // 燃石（发光体，手写色调）/ 白热芯
  const M_CW = defMat([25, 42, 24, 43], 1, 1), M_CWG = defMat([43, 43, 21, 21], 1, 1);     // 虚空石配重（发光体）/ 最亮芯
  const R_EL = FXI.fire, EL = FXR[R_EL], R_IMP = FXI.impact, HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(68, 48, 38, 43);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  RIM.skip[M_FIRE] = RIM.skip[M_HOT] = RIM.skip[M_CW] = RIM.skip[M_CWG] = RIM.skip[M_ROPE] = RIM.skip[M_CLAW] = 1;
  const R_VOID = FXR[FXI.curse];

  // ───── 姿势 ─────
  // ai 投臂角度档（ANG 下标）· sl 抛兜 0 兜着石弹 / 1 空兜垂着 / 2 甩出 · gem 石弹火 0–3 · cw 配重亮度 0–3、4 熄灭 · wn 绞盘转角 · rope 绞索绷紧
  // gf 步态帧 · tap 待机里轻踏的那条腿 · sag 虫足软塌 0–2 · rs 轮廓光光源 0 配重 / 1 石弹 · burn 烧焦档 · drop / dsx / dsy / dai 断掉飞出的投臂
  const P = { ai: 2, sl: 0, sw: 0, gem: 0, fl: 0, cw: 0, wn: 0, rope: 0, bob: 0, cr: 0, lift: 0, sag: 0, gf: -1, tap: -1, rs: 0, burn: 0,
    drop: 0, dsx: 0, dsy: 0, dai: 0, bx: 0, flash: 0, dq: 0, dq48: 0, rim: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['ai', 0, 6], ['sl', 0, 2], ['sw', -1, 1], ['gem', 0, 3], ['fl', 0, 1], ['cw', 0, 4], ['wn', 0, 3], ['rope', 0, 1], ['bob', 0, 1], ['cr', 0, 1],
    ['lift', 0, 3], ['sag', 0, 2], ['gf', -1, 3], ['tap', -1, 2], ['rs', 0, 1], ['burn', 0, 2], ['drop', 0, 2], ['dsx', -24, 4], ['dsy', 0, 12], ['dai', 0, 6],
    ['bx', -4, 2], ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  // 投臂角度只取像素友好的斜率：水平后 · 2:1 · 45° · 1:2 · 竖直 · 1:2 前 · 45° 前（0 朝上、顺时针为正）
  const ANG = [-Math.PI / 2, -1.1071, -Math.PI / 4, -0.4636, 0, 0.4636, Math.PI / 4], ARM_L = 14;
  const LEGS = [[8, 16, 0, 5], [1, 5, 1, 3], [-8, -16, 2, 5]];                  // 近侧 前 / 中 / 后：[根 x, 脚 x, 相位偏移, 膝高出车底几格]；远侧同表、左移 1 格、相位再错 2
  const PH = [[2, 0], [0, 0], [-2, 0], [0, 2]];                                   // 相位 → [前后位移, 抬起]：刚落下（在前）→ 撑住 → 蹬到后面 → 抬起前移
  const T_REL = 2 / 12, T_SNAP = INCOMING + 0.5, T_LAND = INCOMING + 0.66, T_ASH = INCOMING + 1.3;
  const yoOf = () => P.bob + P.cr + (P.sag === 1 ? 2 : P.sag === 2 ? 6 : 0) - P.lift;
  const pivot = (yo) => [3, -16 + yo];
  function tipOf(ai, yo) { const pv = pivot(yo), a = ANG[ai]; return [RD(pv[0] + Math.sin(a) * ARM_L), RD(pv[1] - Math.cos(a) * ARM_L)]; }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.ai = 2; P.sl = 0; P.sw = 0; P.gem = 0; P.fl = f12 & 1; P.cw = 0; P.wn = 0; P.rope = 0; P.bob = 0; P.cr = 0; P.lift = 0; P.sag = 0; P.gf = -1; P.tap = -1;
    P.rs = 0; P.burn = 0; P.drop = 0; P.dsx = 0; P.dsy = 0; P.dai = 0; P.bx = 0; P.flash = 0; P.dq = 0; P.rim = 1; P.mx = 0; P.flip = 0;
    const idle = () => {                                                            // 待机个性：虫足轮流轻踏、抛兜跟着晃；1.6–2.0 s 绞盘自己咔哒一下，投臂往下一沉
      const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.tap = b % 3; P.cw = b & 1; P.sw = [0, 1, 0, -1][(b + 1) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { P.wn = lp < 1.75 ? 1 : 2; P.ai = lp < 1.75 ? 1 : 2; P.tap = -1; P.cw = 2; P.sw = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                          // 极慢爬行：六条腿一条一条往前挪，抛兜反向晃
      const f = gait(tq); P.gf = f; P.bob = f & 1; P.sw = [-1, 0, 1, 0][f];
      const w = walkDemo(tq, 8, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                      // 绞盘后压 → 猛甩（石弹出手）→ 投臂靠在竖直位 → 摆回、重新装弹
      if (tq < T_REL) { P.ai = 1; P.wn = tq < 1 / 12 ? 1 : 2; P.rope = 1; P.gem = 1; P.cr = tq < 1 / 12 ? 0 : 1; P.sw = 1; P.rs = 1; }
      else if (tq < 0.2) { P.ai = 4; P.sl = 2; P.lift = 1; P.rim = 2; P.cw = 2; P.rs = 1; }
      else if (tq < 0.45) { P.ai = tq < 0.3 ? 4 : 3; P.sl = 2; P.cw = 1; P.rs = 1; }
      else { P.ai = tq < 0.55 ? 3 : 2; P.sl = tq < 0.62 ? 1 : 0; P.sw = tq < 0.62 ? -1 : 0; }
    } else if (st === CHARGE) {                                                      // 绞盘咔咔转、投臂缓缓压到水平；石弹点燃；地面从近到远亮起瞄准点（fxBack）
      const q = ease.inOut(clamp01(tq / 0.7)); P.ai = RD(2 - 2 * q); P.wn = tq < 0.8 ? (f12 & 3) : 0; P.rope = 1; P.cr = tq > 0.4 ? 1 : 0;
      P.gem = tq < 0.35 ? 0 : tq < 0.8 ? 1 : 1 + (f12 & 1); P.cw = tq < 0.7 ? 1 : 2; P.rim = 2; P.rs = 1; P.sw = tq > 1.1 ? (f12 & 1) : 0;
    } else if (st === CAST) {                                                        // 猛甩：车身被反冲抬起 2 格，投臂甩过竖直
      if (tq < T_REL) { P.ai = 5; P.lift = 2; P.sl = 2; P.cw = 3; P.rim = 3; P.rs = 1; }
      else { P.ai = 4; P.lift = tq < 0.25 ? 1 : 0; P.sl = 2; P.cw = 2; P.rim = 2; P.rs = 1; }
    } else if (st === RECOVER) {                                                     // 投臂摆回，虫足重新抓地
      const q = ease.inOut(clamp01(tq / 0.6)); P.ai = RD(4 - 2 * q); P.sl = tq < 0.35 ? 2 : tq < 0.5 ? 1 : 0; P.cr = tq < 0.3 ? 1 : 0;
      P.tap = tq < 0.4 ? f12of(tq) % 3 : -1; P.rim = q < 0.5 ? 2 : 1; P.rs = q < 0.5 ? 1 : 0; P.cw = 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.ai = 1; P.cr = 1; P.bx = -2; P.sw = 1; P.cw = 4; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.wn = 1; }
      else if (h < 0.35) { P.ai = 1; P.bx = -1; P.sw = 1; P.cw = 0; P.rim = 0; }
      else { P.ai = 2; P.sw = -1; }
    } else if (st === DEATH) {                                                       // 虫足一齐软塌摊平 → 绳索绷断投臂弹飞 → 落地 → 起火烧焦 → 化灰
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { P.ai = 1; P.cr = d < 0.15 ? 0 : 1; P.bx = -2; P.sw = 1; P.cw = (f12 & 1) ? 2 : 4; P.flash = d < 1 / 12 ? 1 : 0; }
      else {
        P.bx = -2; P.ai = 1; P.sag = d < 0.5 ? 1 : 2; P.lift = d < 0.5 ? 0 : d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.sw = 1; P.sl = d < 0.5 ? 0 : 1;
        if (d >= 0.5) { const q = clamp01((d - 0.5) / 0.3); P.drop = q >= 1 ? 2 : 1; P.dsx = RD(-15 * q); P.dsy = q >= 1 ? 0 : RD(Math.sin(q * Math.PI) * 8); P.dai = q >= 1 ? 0 : [2, 4, 6, 4][f12 & 3]; }
        P.cw = d < 0.9 ? ((f12 & 1) ? 1 : 4) : 4; P.burn = d < 0.75 ? 0 : d < 1.05 ? 1 : 2;
        if (d >= T_ASH - INCOMING) P.dq = 1;                                        // 之后由死亡套件（化灰）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.tap = -1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.cw = tq > 0.85 ? 2 : 0;
    }
    P.dq48 = RD(P.dq * 48);
    const yo = yoOf();
    if (P.rs) { const tp = tipOf(P.ai, yo); P.gx = tp[0] + P.sw + P.bx; P.gy = tp[1] + 3; }   // 发光体：抛兜里的燃石
    else { P.gx = -10 + P.bx; P.gy = -18 + yo; }                                                // 发光体：车尾的虚空石配重
    KEY(P);
  }

  // ───── 画（从后往前：远侧虫足 → 车架 → 配重 → 近侧虫足 → 绞盘 + 绞索 → 投臂 → 抛兜 → 石弹）─────
  // 候选部件：节肢虫足（根 → 高拱的膝 → 细足尖；近侧上段 2 格粗）
  function bugLeg(rx, ry, kx, ky, fx, fy, m, thick) {
    part();
    U.seg(E, rx, ry, kx, ky, thick, m, 0); U.seg(E, kx, ky, fx, fy, 1, m, 0);
    U.dot(E, kx, ky - 1, m, thick > 1 ? 4 : 3);                                   // 膝节高光
    U.dot(E, fx, fy, M_CLAW, 3);                                                     // 足尖
  }
  function legs(far, yo) {
    const yB = -8 + yo, yT = -14 + yo;
    for (let j = 0; j < 3; j++) {
      const L = LEGS[j], rx = L[0] - far, fx0 = L[1] - far, ry = yB - 1;
      let dx = 0, up = 0;
      if (P.gf >= 0) { const ph = PH[(P.gf + L[2] + (far ? 2 : 0)) & 3]; dx = ph[0]; up = ph[1]; }
      else if (!far && P.tap === j) up = 1;
      // 前后两条腿的膝拱过车顶（从侧面看像蜘蛛腿），中腿的膝在车侧；抬腿时膝跟着抬
      let fx = fx0 + dx, fy = -up, kx = rx + (fx - rx) * 0.6, ky = yB - L[3] - up + (P.cr ? 1 : 0) + (far ? 1 : 0);
      if (P.sag === 1) { fx = rx + (fx0 - rx) * 1.25; kx = rx + (fx - rx) * 0.6; ky = yB - 2; }
      if (P.sag === 2) { fx = rx + (fx0 - rx) * 1.5 + (j === 1 ? 3 : 0); kx = rx + (fx - rx) * 0.55; ky = Math.min(-3, yB - 1); fy = 0; }
      bugLeg(rx, ry, kx, ky, fx, fy, far ? M_LEGF : M_LEG, far ? 1 : 2);
    }
  }
  // 候选部件：木车架（6 行厚的箱体 + 木板缝 + 两道铁箍 + 铆钉 + 烧焦斑；顶上一个铁转轴座）
  function chassis(yo, mat) {
    part(); const yT = -14 + yo, yB = -8 + yo;
    for (let y = yT; y <= yB; y++) run(y, y === yB ? -11 : -12, y === yT || y === yB ? 10 : 11, mat, 0);
    for (const yy of [yT + 2, yT + 4]) for (let x = -11; x <= 10; x++) if (((x + yy + 40) % 7) !== 0) sp(x, yy, mat, 2);
    for (const bx of [-6, 5]) { for (let y = yT; y <= yB; y++) sp(bx, y, M_IRON, 0); sp(bx, yT + 1, M_IRON, 4); sp(bx, yB - 1, M_IRON, 4); }
    sp(-9, yT + 3, mat, 1); sp(-8, yT + 3, mat, 1); sp(8, yB - 1, mat, 1); sp(1, yT + 1, mat, 1); sp(2, yT + 1, mat, 1);   // 烧焦斑
    run(yT - 1, 1, 5, M_IRON, 0); run(yT - 2, 2, 4, M_IRON, 0);                      // 转轴座
  }
  // 候选部件：虚空石配重（车尾一块多面晶石；lv 0–3 亮度，4 熄灭）
  const CW_SHAPE = [[0, -5, 3], [-1, -4, 2], [0, -4, 4], [1, -4, 3], [-2, -3, 2], [-1, -3, 3], [0, -3, 4], [1, -3, 3], [2, -3, 2], [-2, -2, 2], [-1, -2, 2], [0, -2, 3], [1, -2, 2], [2, -2, 2], [-2, -1, 2], [-1, -1, 2], [0, -1, 2], [1, -1, 2], [2, -1, 1], [3, -2, 2], [3, -1, 1]];
  function counterweight(yo, lv) {
    part(); const X = -10, Y = -14 + yo;
    for (const [dx, dy, t] of CW_SHAPE) {
      if (lv === 4) { sp(X + dx, Y + dy, M_CW, t >= 3 ? 2 : 1); continue; }
      const tt = Math.min(4, t + (lv >= 2 ? 1 : 0) + (lv >= 3 ? 1 : 0) - (lv === 0 && t === 4 ? 1 : 0));
      if (lv >= 2 && t === 4) sp(X + dx, Y + dy, M_CWG, 3); else sp(X + dx, Y + dy, M_CW, tt);
    }
  }
  // 候选部件：铁绞盘（半径 3 的铁轮 + 4 根木辐条，wn 每档转 45°；摇把跟着转）+ 绞索（绷紧时从轮顶拉到投臂）
  function winch(cx, cy, wn, rope, armPt) {
    part();
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) { const d = Math.hypot(x, y); if (d > 2.4 && d < 3.5) sp(cx + x, cy + y, M_IRON, 0); }
    const SP = (wn & 1) ? [[1, 1], [-1, 1], [1, -1], [-1, -1], [2, 2], [-2, 2], [2, -2], [-2, -2]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0], [0, 2], [0, -2]];
    for (const [x, y] of SP) sp(cx + x, cy + y, M_ARM, 3);
    sp(cx, cy, M_IRON, 4);
    const H = [[0, -4], [4, 0], [0, 4], [-4, 0]][wn & 3]; sp(cx + H[0], cy + H[1], M_IRON, 4);   // 摇把
    if (rope) { const n = Math.max(Math.abs(armPt[0] - cx), Math.abs(armPt[1] - cy + 3)); for (let k = 1; k < n; k++) sp(RD(cx + (armPt[0] - cx) * k / n), RD(cy - 3 + (armPt[1] - cy + 3) * k / n), M_ROPE, 3); }
  }
  // 候选部件：投石臂（2 格粗木臂，短尾 3 格、长端 14 格，末端铁箍，转轴 1 格铁）
  function arm(pv, ai, mat, len) {
    part(); const a = ANG[ai], dx = Math.sin(a), dy = -Math.cos(a), L = len || ARM_L;
    U.seg(E, pv[0] - dx * 3, pv[1] - dy * 3, pv[0] + dx * L, pv[1] + dy * L, 2, mat, 0);
    U.dot(E, pv[0] + dx * L, pv[1] + dy * L, M_IRON, 3); U.dot(E, pv[0] + dx * (L - 1), pv[1] + dy * (L - 1), M_IRON, 0);
    U.dot(E, pv[0], pv[1], M_IRON, 4);
  }
  // 候选部件：抛兜（皮兜 + 两根短绳；sl 0 兜着 / 1 空兜垂着 / 2 甩出去、绳拉直往前）
  function sling(tx, ty, sl, sw) {
    part();
    if (sl === 2) { sp(tx + 1, ty, M_ROPE, 3); sp(tx + 2, ty, M_ROPE, 3); sp(tx + 3, ty + 1, M_ROPE, 3); run(ty + 1, tx + 4, tx + 5, M_ROPE, 0); sp(tx + 5, ty, M_ROPE, 2); return; }
    const x = tx + sw; sp(tx, ty + 1, M_ROPE, 3); sp(x - 1, ty + 2, M_ROPE, 3); sp(x + 1, ty + 2, M_ROPE, 3);
    run(ty + 5, x - 1, x + 1, M_ROPE, 0); sp(x - 2, ty + 4, M_ROPE, 0); sp(x + 2, ty + 4, M_ROPE, 0);
    if (sl === 1) { sp(x - 1, ty + 4, M_ROPE, 2); sp(x + 1, ty + 4, M_ROPE, 2); sp(x, ty + 4, M_ROPE, 2); }
  }
  // 石弹：3×3 圆石；点燃后变燃石 + 顶上一两簇火舌（gem 1 小火 · 2 大火 · 3 白热）
  function stone(sx, sy, gem, fl) {
    part();
    const C = [[-1, -1], [0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1], [1, 1]];
    if (!gem) { for (const [x, y] of C) sp(sx + x, sy + y, M_STONE, x + y < 0 ? 4 : x + y > 0 ? 2 : 3); return; }
    for (const [x, y] of C) { const core = x === 0 && y === 0; if (core && gem >= 2) sp(sx, sy, M_HOT, gem === 3 ? 4 : 3); else sp(sx + x, sy + y, M_FIRE, core ? 4 : x + y < 0 ? 3 : 2); }
    sp(sx - 1 + fl, sy - 2, M_FIRE, 3); if (gem >= 2) { sp(sx + 1 - fl, sy - 2, M_FIRE, 2); sp(sx, sy - 3, M_FIRE, fl ? 4 : 3); }
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0);
    const yo = yoOf(), mat = P.burn === 2 ? M_CH2 : P.burn === 1 ? M_CH1 : M_WOOD, amat = P.burn === 2 ? M_CH2 : P.burn === 1 ? M_CH1 : M_ARM, pv = pivot(yo);
    legs(1, yo);
    chassis(yo, mat);
    counterweight(yo, P.cw);
    legs(0, yo);
    const a = ANG[P.ai], armPt = [RD(pv[0] + Math.sin(a) * 6), RD(pv[1] - Math.cos(a) * 6)];
    winch(-3, -11 + yo, P.wn, P.rope && !P.drop, armPt);
    if (!P.drop) {
      arm(pv, P.ai, amat);
      const tp = tipOf(P.ai, yo); sling(tp[0], tp[1], P.sl, P.sw);
      if (P.sl === 0) stone(tp[0] + P.sw, tp[1] + 3, P.gem, P.fl);
    } else if (P.drop === 1) {                                                        // 绳断，投臂翻着飞出去
      arm([pv[0] + P.dsx, pv[1] - P.dsy], P.dai, amat, 11);
    } else {                                                                          // 落在车后地上，横躺
      part(); const x0 = pv[0] + P.dsx; U.seg(E, x0 - 13, -1, x0 + 2, -1, 2, amat, 0); U.dot(E, x0 - 13, -2, M_IRON, 3); U.dot(E, x0 - 12, -2, M_IRON, 0);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rimRamp = P.rs ? EL : R_VOID; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 自己的抛射物：1 普通燃石（高抛）· 2 技能大燃石（更高的抛物线），预分配
  const PJN = 6, pjOn = new Uint8Array(PJN), pjK = new Uint8Array(PJN), pjX = new Float32Array(PJN), pjY = new Float32Array(PJN), pjVX = new Float32Array(PJN), pjVY = new Float32Array(PJN), pjG = new Float32Array(PJN), pjAge = new Float32Array(PJN), pjT = new Float32Array(PJN);
  function launch(k, x, y, tx, ty, T, g) { let i = 0; for (; i < PJN - 1 && pjOn[i]; i++); pjOn[i] = 1; pjK[i] = k; pjX[i] = x; pjY[i] = y; pjG[i] = g; pjVX[i] = (tx - x) / T; pjVY[i] = (ty - y - 0.5 * g * T * T) / T; pjAge[i] = 0; pjT[i] = T; }
  const MARK_X = [HX + 22, HX + 42, DUMMY_X];
  let chargeAcc = 0, soulAcc = 0, burnAcc = 0, lastGf = -1, landed = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s === CHARGE) landed = 0;
    if (s !== CAST) return;
    const yo = yoOf(), pv = pivot(yo), x = wx(P.gx), y = wy(P.gy);
    releaseOrbit(30, 80, 0.25, 0.55, { up: 10 });
    launch(2, x, y, DUMMY_X, HY - 12, 0.34, 3000);                                   // 大燃石飞得极高，落在最远的瞄准点
    fx.slash(wx(pv[0]), wy(pv[1]), ARM_L, ANG[0], ANG[5], R_EL, 0.2, 2, 1);           // 身后留一道投臂拖影弧
    burst(x, y, 20, 40, 110, 0.2, 0.5, R_EL, 14); ring(x, y, 0, R_EL);
    burst(wx(0), HY, 8, 20, 50, 0.3, 0.5, FXI.dust, 6);                              // 反冲扬起的尘
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'fire' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                               // 猛甩：燃石高抛
      const yo = yoOf(), pv = pivot(yo), tp = tipOf(1, yo); launch(1, wx(tp[0] + 1), wy(tp[1] + 3), DUMMY_X - 2, HY - 14, 0.4, 1400);
      fx.slash(wx(pv[0]), wy(pv[1]), ARM_L, ANG[1], ANG[4], R_EL, 0.17, 1, 1);
      burst(wx(pv[0]), wy(pv[1] - ARM_L), 6, 20, 50, 0.15, 0.3, R_EL, 4);
      sfx('swing', { kind: 'throw', w: 0.6 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === DEATH && Math.abs(t - T_SNAP) < 1e-9) {                                 // 绳索绷断：几颗木屑 + 火星
      burst(wx(3), wy(-12), 8, 20, 60, 0.2, 0.4, FXI.earth, 12); burst(wx(3), wy(-12), 5, 20, 50, 0.15, 0.3, R_EL, 8);
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.6 });
    }
    if (s === DEATH && Math.abs(t - T_ASH) < 1e-9) {                                 // 烧成的焦木化灰飘走
      poseAt(DEATH, T_ASH - 1 / 12, T_ASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: FXI.dust });
    }
  }
  const EVENTS = [[], [], [T_REL], [], [], [], [], [T_SNAP, T_LAND, T_ASH], []];
  function hurtFx(s) {                                                               // 木架受击：火花里夹着木屑，虫足甲壳迸紫点
    const hx = HX - 1, hy = HY - 12; burst(hx, hy, s === DEATH ? 20 : 12, 50, 130, 0.25, 0.55, R_IMP, 20); burst(hx, hy, s === DEATH ? 10 : 6, 30, 80, 0.3, 0.6, FXI.earth, 14);
    burst(hx - 4, hy + 5, 4, 20, 50, 0.2, 0.4, FXI.curse, 6); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, t) {
    if (state === CHARGE && t > 0.35) {                                              // 火星螺旋汇进抛兜里的石弹
      chargeAcc += dt * (18 + 30 * clamp01((t - 0.35) / 1.0));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, wx(P.gx), wy(P.gy), (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE) {                                                            // 每 2 个步态帧落一次脚：1 颗尘
      if (P.gf !== lastGf && (P.gf & 1) === 0) { sfx('step', { w: 0.5 }); spawn(K_DUST, wx(P.gf === 0 ? 14 : -11), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastGf = P.gf;
    } else lastGf = -1;
    if (state === DEATH && t > T_LAND - 0.05 && t < T_ASH + 0.6) {                   // 起火：车架上窜火星
      burnAcc += dt * (t < T_ASH ? 34 : 14);
      while (burnAcc >= 1) { burnAcc -= 1; spawn(K_EMBER, wx(-11 + Math.random() * 22), wy(-9 - Math.random() * 3), Math.random() * 8 - 4, -10 - Math.random() * 12, 0.4 + Math.random() * 0.5, R_EL); }
    }
    if (state === DEATH && t > INCOMING + 1.6 && t < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 24, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.curse); } }
    for (let i = 0; i < PJN; i++) {
      if (!pjOn[i]) continue; pjAge[i] += dt; const k = pjK[i];
      pjVY[i] += pjG[i] * dt; pjX[i] += pjVX[i] * dt; pjY[i] += pjVY[i] * dt;
      if (((pjAge[i] * 60) | 0) % (k === 2 ? 1 : 2) === 0) spawn(K_TRAIL, pjX[i] - Math.sign(pjVX[i]) * 2, pjY[i] - Math.sign(pjVY[i]) * 2 + Math.random() * 2 - 1, -pjVX[i] * 0.15, -pjVY[i] * 0.15, k === 2 ? 0.3 : 0.2, R_EL);
      if (pjAge[i] >= pjT[i]) {
        pjOn[i] = 0; const x = pjX[i], y = pjY[i];
        if (k === 1) {                                                               // 普通命中：小火团 + 几颗碎石
          burst(x, y, 12, 30, 90, 0.15, 0.4, R_EL, 10); for (let n = 0; n < 5; n++) spawnX(K_PHYS, x, y + 2, (Math.random() - 0.5) * 60, -40 - Math.random() * 40, 0.6, FXI.earth, { g: 260, floor: HY });
          hitDummy(0); sfx('hit', { mat: 'stone', w: 0.5 });
        } else {                                                                     // 技能命中：火焰外爆 + 地裂 + 碎石四溅 + 大冲击环
          landed = 1;
          burst(x, y, 34, 50, 140, 0.3, 0.7, R_EL, 16); ring(x, y + 2, 1, R_EL); fx.cross(x, y, 7, R_EL, 0.3);
          fx.crack(x, HY + 1, 13, 1, FXI.earth, 0.9); fx.crack(x - 1, HY + 1, 13, -1, FXI.earth, 0.9);
          for (let n = 0; n < 14; n++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, HY - 3, (Math.random() - 0.5) * 110, -50 - Math.random() * 70, 0.8, FXI.earth, { g: 300, floor: HY, sz: n < 4 ? 2 : 1 });
          hitDummy(1); dummyFx({ dur: 0.9, tint: 'fire' }); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.8 });
        }
      }
    }
  }
  function fxReset() { pjOn.fill(0); chargeAcc = 0; soulAcc = 0; burnAcc = 0; lastGf = -1; landed = 0; }
  // 瞄准点：近 → 远依次亮起，越远越大越亮（最远那个在假人脚下，外加两道竖刻度闪烁）
  function markers(f12) {
    const s = E.state, t = E.stT; let n = 0;
    if (s === CHARGE) n = t >= 1.05 ? 3 : t >= 0.7 ? 2 : t >= 0.35 ? 1 : 0; else if (s === CAST && !landed) n = 3;
    for (let k = 0; k < n; k++) {
      const x = MARK_X[k], w = k + 1, c = EL[3 - k];
      for (let dx = -w * 2; dx <= w * 2; dx++) if (Math.abs(dx) > w - 1 || k === 2) put(x + dx, FLOOR, Math.abs(dx) <= 1 && k === 2 && (f12 & 1) ? EL[0] : c);
      if (k >= 1) { put(x - w * 2, FLOOR - 1, c); put(x + w * 2, FLOOR - 1, c); }
      if (k === 2) { const hgt = 2 + (f12 & 1); for (let j = 1; j <= hgt; j++) { put(x - 7, FLOOR - j, EL[j === hgt ? 1 : 2]); put(x + 7, FLOOR - j, EL[j === hgt ? 1 : 2]); } }
    }
  }
  function fxBack(f12) { markers(f12); if (P.dq < 1 && P.rs) floorGlow(wx(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    for (let i = 0; i < PJN; i++) {                                                  // 燃石：小的 2×2 + 火舌，大的 4×4 白热芯
      if (!pjOn[i]) continue; const x = RD(pjX[i]), y = RD(pjY[i]);
      if (pjK[i] === 1) { put(x, y, EL[1]); put(x + 1, y, EL[2]); put(x, y + 1, EL[2]); put(x + 1, y + 1, EL[3]); put(x - 1, y - 1, (f12 & 1) ? EL[1] : EL[2]); }
      else { for (let dy = -1; dy <= 2; dy++) for (let dx = -1; dx <= 2; dx++) { if ((dx === -1 || dx === 2) && (dy === -1 || dy === 2)) continue; put(x + dx, y + dy, dx >= 0 && dx <= 1 && dy >= 0 && dy <= 1 ? (dx === 0 && dy === 0 ? EL[0] : EL[1]) : EL[2]); } put(x - 2, y - 2, (f12 & 1) ? EL[1] : EL[2]); put(x + 3, y - 1, EL[3]); }
    }
    if (E.state === DEATH && P.burn && P.dq < 1) {                                  // 车架上的火舌
      const yT = -14 + yoOf();
      for (let x = -11; x <= 10; x += 3) { const h = 2 + RD(E.hash(x + 20, f12) * 3); for (let j = 0; j < h; j++) put(wx(x + (j === h - 1 ? ((f12 + x) & 1) : 0)), wy(yT - 1 - j), EL[j === 0 ? 2 : j === h - 1 ? 1 : 2]); }
    }
    if (P.gem >= 2 && P.gem <= 3 && P.sl === 0 && P.dq < 1) {                       // 燃石蓄满的十字火芒
      const gx = wx(P.gx), gy = wy(P.gy), L = 3 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r === 2 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r - 1, c); }
    }
  }

  return {
    name: '爬行投石车', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_FIRE, M_HOT, M_CW, M_CWG], HIT_POINT: [-1, -12], EVENTS,
    deathKit: { mode: 'ash', at: T_ASH },
    SFX: { body: 'machine', how: 'collapse', pal: 'fire', style: 'fire', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
