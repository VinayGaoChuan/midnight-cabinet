// 巫毒信徒（部队 · 精灵 · 先锋 · 普通 · 飞行）：没有甲壳和大爪的幼体——淡青绿分节软虫身 + 比身体还宽的骨白巫毒木面具（顶插 3 根紫羽、额顶骨钉）
// + 两对细长透明膜翅（上大下小）+ 腹下一只紫皮荧绿毒囊。攻击「面具头槌」前冲 5 格；技能表现特性「过敏反应」（亡语）：毒囊蓄满，以面具为引抛出一颗诅咒毒弹；
// 死亡爆裂：翅膀停摆、毒囊胀大后炸开（死亡套件 burst），面具弹飞落地，毒雾一团团飘向击杀者。升级为巫毒守卫（chars/VoodooGuard.js）。
PCD.define('VoodooBeliever', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow, keyer, sfx, death } = E;
  const U = E.parts.beast.util, R = Math.round;

  // ───── 材质（软虫身、翅膜是本角色专属色，其余取共享色板）─────
  const T_BODY = [34, E.color('#2a6e58'), E.color('#4fb08a'), E.color('#9ee0b8')];                 // 淡青绿软虫身
  const T_WING = [E.color('#2e4446'), E.color('#6f8f8c'), E.color('#a9c4c0'), E.color('#dcece8')];   // 淡灰青翅膜
  const M_BODY = defMat(T_BODY, 2), M_BELLY = defMat([34, T_BODY[2], T_BODY[3], 17], 1);
  const M_WING = defMat(T_WING, 1), M_WINGF = defMat(T_WING, 1, 0, 1);
  const M_MASK = defMat('bone', 1), M_PAINT = defMat([0, 52, 53, 54], 1, 1), M_INK = defMat('ink', 1, 1);
  const M_PLUME = defMat('purple', 1), M_SAC = defMat('purple', 1);
  const M_LIQ = defMat([48, 49, 50, 38], 1, 1), M_HOT = defMat([50, 38, 21, 21], 1, 1), M_EYE = defMat([42, 24, 43, 21], 1, 1);
  const R_EL = FXI.poison, EL = FXR[R_EL], CU = FXR[FXI.curse], HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(64, 48, 30, 44);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const m of [M_EYE, M_LIQ, M_HOT, M_INK, M_PAINT]) RIM.skip[m] = 1;
  const ALT = 8;                                                    // 身体离地高

  // ───── 姿势 ─────
  // wu / wl 上 / 下对翅的翼姿 0 收 · 1 上扬 · 2 平展 · 3 下压 · 4 回收 · 5 张开 · 6 垂落；bob 起伏；dy 额外升降（- 升）；lean 面具前顶 + / 后仰 -；look 面具转头；
  // tw 尾摆；sway 羽摆；sac 毒囊胀大 0–3；sacSw 毒囊摆；sacG 毒液亮度 0–3；bub 囊内气泡；eyeG 眼孔亮 0–3；eyes 闭眼；nomask 面具已飞走（死亡）
  const P = { wu: 1, wl: 2, bob: 0, dy: 0, bx: 0, lean: 0, look: 0, tw: 0, sway: 0, sac: 0, sacSw: 0, sacG: 0, bub: 0, eyeG: 0, eyes: 0,
    flash: 0, rim: 1, dq: 0, dq48: 0, nomask: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['wu', 0, 6], ['wl', 0, 6], ['bob', -2, 2], ['dy', -3, 3], ['bx', -8, 15], ['lean', -1, 1], ['look', -1, 1], ['tw', -1, 1], ['sway', -1, 1],
    ['sac', 0, 3], ['sacSw', -1, 1], ['sacG', 0, 3], ['bub', 0, 3], ['eyeG', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['dq48', 0, 48], ['nomask', 0, 1]]);
  const FLAP = [1, 2, 3, 4], FLAP_L = [2, 3, 4, 1];
  function reset() { P.wu = 1; P.wl = 2; P.bob = 0; P.dy = 0; P.bx = 0; P.lean = 0; P.look = 0; P.tw = 0; P.sway = 0; P.sac = 0; P.sacSw = 0; P.sacG = 0; P.bub = 0; P.eyeG = 0; P.eyes = 0; P.flash = 0; P.rim = 1; P.dq = 0; P.nomask = 0; P.mx = 0; P.flip = 0; }
  // 几何（本地坐标，脚底投影为原点）
  const bodyC = () => [0, -(ALT + 3) + P.bob + P.dy];
  const maskC = () => { const [cx, cy] = bodyC(); return [cx + 6 + P.lean, cy - 1 - (P.lean < 0 ? 1 : 0)]; };
  const sacR = () => 2.6 + P.sac * 0.6;
  const sacC = () => { const [cx, cy] = bodyC(), r = sacR(); return [cx - 1 + P.sacSw, cy + 1.5 + r]; };

  function hover(f12) { const f = f12 & 3; P.wu = FLAP[f]; P.wl = FLAP_L[f]; }   // 高频扑翼：每个 12 fps 帧换一次翼姿
  function idle(tq, f12) {
    hover(f12); const TT = f12 / 12, b = Math.floor(TT * 2.5);
    P.bob = (b & 1) ? -1 : 0; P.sacSw = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25) & 3];
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 && lp < 2.0) { P.look = lp < 1.8 ? -1 : 1; P.bub = lp < 1.75 ? 1 : lp < 1.9 ? 2 : 3; }   // 待机个性：面具左右转头张望，毒囊咕嘟冒泡
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                          // 振翅飘移：身体沿蛇形上下漂 2 格，尾反向摆
      hover(f12); const f = gait(tq);
      P.bob = [0, -1, -2, -1][f]; P.tw = [1, 0, -1, 0][f]; P.sway = [0, 1, 0, -1][f]; P.sacSw = [-1, 0, 1, 0][f]; P.lean = f === 2 ? 1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                      // 面具头槌：后引 → 前冲 5 格定格 → 收回
      if (tq < 0.12) { const q = ease.out(tq / 0.12); P.bx = -R(2 * q); P.lean = -1; P.wu = 1; P.wl = 1; P.eyeG = 1; P.sway = 1; P.tw = 1; }
      else if (tq < 0.25) { P.bx = 5; P.lean = 1; P.wu = 3; P.wl = 3; P.eyeG = 2; P.rim = 1; P.tw = -1; P.sway = -1; P.sacSw = -1; }
      else if (tq < 0.45) { hover(f12); P.bx = R(4 - 2 * ease.out((tq - 0.25) / 0.2)); P.lean = 1; P.eyeG = 1; P.sway = -1; }
      else { hover(f12); P.bx = R(2 * (1 - ease.inOut(clamp01((tq - 0.45) / 0.3)))); }
    } else if (st === CHARGE) {                                      // 毒囊逐帧胀大，眼孔亮起紫光，身体升起 2 格
      hover(f12); const q = ease.inOut(clamp01(tq / 0.7));
      P.dy = -R(2 * q); P.sac = tq < 0.2 ? 0 : tq < 0.5 ? 1 : tq < 0.8 ? 2 : 3; P.sacG = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
      P.eyeG = tq < 0.3 ? 0 : tq < 0.7 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.sway = tq > 1.1 ? ((f12 & 1) ? -1 : 0) : -1; P.lean = tq > 0.7 ? -1 : 0;
    } else if (st === CAST) {                                        // 后仰一帧，毒囊喷出毒弹
      if (tq < 1 / 12) { P.lean = -1; P.dy = -3; P.sac = 3; P.sacG = 3; P.eyeG = 3; P.rim = 3; P.wu = 5; P.wl = 5; P.sway = -1; P.tw = 1; }
      else { hover(f12); P.lean = 1; P.dy = -2; P.sac = tq < 0.25 ? 1 : 0; P.sacG = 2; P.eyeG = 2; P.rim = 3; P.sway = 1; P.sacSw = 1; }
    } else if (st === RECOVER) {                                     // 毒囊瘪回，打一个嗝
      hover(f12); const q = ease.inOut(clamp01(tq / 0.6));
      P.dy = -R(2 * (1 - q)); P.sacG = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.eyeG = q < 0.5 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
      if (tq >= 0.33 && tq < 0.5) { P.lean = 1; P.sac = 1; P.sacSw = 1; P.bub = 2; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.flash = h < 1 / 12 ? 1 : 0; P.eyes = 1; P.wu = 1; P.wl = 1; P.sacSw = 1; P.sway = 1; P.tw = 1; P.lean = -1; P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.wu = 4; P.wl = 4; P.sway = 1; P.rim = 0; }
      else idle(tq, f12);
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 1; P.wu = 1; P.wl = 1; P.sacSw = 1; P.sway = 1; P.tw = 1; P.lean = -1; P.sacG = (f12 & 1) ? 2 : 1; }
      else if (d < T_BURST - INCOMING) { P.bx = -2; P.eyes = 1; P.wu = 6; P.wl = 6; P.dy = 1; P.sac = d < 0.37 ? 2 : 3; P.sacG = (f12 & 1) ? 3 : 2; P.sway = 1; }   // 翅膀停摆、毒囊胀大一帧
      else { P.bx = -2; P.eyes = 1; P.wu = 6; P.wl = 6; P.dy = 1; P.sac = 3; P.nomask = 1; P.dq = 1; }                                                      // 已炸开：精灵交给死亡套件
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    if (st !== ATTACK) { const [sx, sy] = sacC(); P.gx = R(sx) + P.bx; P.gy = R(sy); }   // 焦点：毒囊（攻击时在面具骨钉）
    else { const [mx, my] = maskC(); P.gx = R(mx) + 3 + P.bx; P.gy = R(my) - 4; }
    P.dq48 = R(P.dq * 48); KEY(P);
  }

  // ───── 画 ─────
  // 候选部件：insectWing 昆虫膜翅——细长椭圆翼面（前缘窄、后缘宽）、前缘脉 + 中脉、后半隔点透光；a 从正后方量、+ 向上，L 长，wd 宽
  const WA = [0.12, 1.25, 0.3, -0.5, 0.8, 1.05, -0.4], WF = [0.6, 1, 0.45, 1, 0.75, 1, 0.8];
  function insectWing(x, y, a, L, wd, m) {
    part();
    const dx = -Math.cos(a), dy = -Math.sin(a), nx = -dy, ny = dx, ext = Math.ceil(L + wd + 1);
    for (let py = Math.floor(y - ext); py <= Math.ceil(y + ext); py++) for (let px = Math.floor(x - ext); px <= Math.ceil(x + ext); px++) {
      const u = (px - x) * dx + (py - y) * dy, v = (px - x) * nx + (py - y) * ny; if (u < -0.3 || u > L + 0.3) continue;
      const s = clamp01(u / L), half = wd * Math.sqrt(Math.sin(Math.PI * (0.12 + 0.86 * s))), lead = half * 0.42, trail = half * 0.58 + 0.3;
      if (v > lead || v < -trail) continue;
      let t = 0;
      if (v > lead - 1 && s > 0.08) t = 2;                                        // 前缘脉
      else if (Math.abs(v + half * 0.1) < 0.5 && s > 0.15 && s < 0.85) t = 2;     // 中脉
      else if (v < -0.6 && ((px + py) & 1)) t = 4;                               // 后半隔点：透光
      U.dot(E, px, py, m, t);
    }
  }
  function wings(cx, cy, far) {
    const m = far ? M_WINGF : M_WING, ox = far ? 2 : 0, oy = far ? -1 : 0;
    const wl = P.wl, wu = P.wu;
    insectWing(cx - 1 + ox, cy - 2 + oy, WA[wl] - 0.4, 7, 2.2 * WF[wl], m);        // 下对（小）
    insectWing(cx + ox, cy - 3 + oy, WA[wu], 10, 3.2 * WF[wu], m);              // 上对（大）
  }
  // 分节软虫身：前粗后细、尾端随 tw 摆，每 3 列一道体节环
  function drawBody(cx, cy) {
    part();
    const xa = cx - 6, xb = cx + 3;
    for (let x = xa; x <= xb; x++) {
      const s = (x - xa) / (xb - xa), r = 1.2 + 1.5 * Math.pow(s, 0.7), yc = cy + P.tw * (1 - s) * (1 - s) * 2 + (1 - s) * 0.8, y0 = R(yc - r), y1 = R(yc + r);
      for (let y = y0; y <= y1; y++) { const ring = ((x - xa) % 3) === 2 && y > y0 && y < y1, belly = y >= y1 - 1 && s > 0.25; sp(x, y, belly ? M_BELLY : M_BODY, ring ? 2 : 0); }
    }
    sp(xa - 1, R(cy + P.tw * 2 + 0.8), M_BODY, 0);
  }
  // 候选部件：venomSac 毒囊——细颈吊着的紫皮圆囊，内透荧绿毒液（亮度 sacG 0–3），气泡 bub
  function drawSac(cx, cy) {
    part();
    const r = sacR(), [sx, sy] = sacC();
    for (let y = R(cy + 1); y < R(sy - r); y++) sp(R(cx - 1 + P.sacSw * 0.5), y, M_SAC, 0);
    const n = Math.ceil(r) + 1;
    for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
      const px = R(sx) + i, py = R(sy) + j, d = Math.hypot(px - sx, (py - sy) * 1.05) / (r + 0.3); if (d > 1 || py > 0) continue;
      if (d < 0.74 && py - sy > -r * 0.4) {
        const deep = d > 0.5 || py - sy > r * 0.45; let m = M_LIQ, t = deep ? 2 : 3;
        if (P.sacG === 1) t = deep ? 3 : 4; else if (P.sacG === 2) { m = d < 0.35 ? M_HOT : M_LIQ; t = d < 0.35 ? 2 : 3; } else if (P.sacG === 3) { m = M_HOT; t = d < 0.45 ? 3 : 2; }
        U.dot(E, px, py, m, t);
      } else U.dot(E, px, py, M_SAC, d < 0.5 && py < sy ? 4 : 0);
    }
    if (P.bub) { const by = R(sy + r * 0.35 - P.bub), bx = R(sx - 1 + (P.bub & 1)); if (by - sy > -r * 0.4) sp(bx, by, M_HOT, 3); }
    sp(R(sx - r * 0.45), R(sy - r * 0.5), M_SAC, 4);
  }
  // 候选部件：voodooMask 巫毒木面具——竖椭圆面板（面即脸）、锯齿额纹、泪痕涂纹、嘴缝齿、额顶骨钉；plume 顶羽 3 根
  function drawMask(mx, my, eyeG, eyes, look, sway) {
    part();                                                          // 顶羽：3 根往后上扇开，羽尖随 sway 摆
    for (const [ox, tx, ty] of [[-2, -5, -7], [-1, -2, -8], [0, 1, -7]]) { const ex = mx + tx + sway, ey = my + ty; U.seg(E, mx + ox, my - 4, ex, ey, 1, M_PLUME, 0); U.dot(E, ex, ey, M_PLUME, 4); }
    part();
    U.oval(E, mx, my, 3, 4, M_MASK, 0);
    const lx = look;                                                 // 转头：五官整体平移 1 格
    for (const x of [-2, 0, 2]) sp(mx + x + lx, my - 3, M_PAINT, 2);
    for (const x of [-1, 1]) sp(mx + x + lx, my - 2, M_PAINT, 2);
    const eyeM = eyes || !eyeG ? M_INK : M_EYE, eyeT = eyes ? 0 : eyeG + 1;
    if (!eyes) { sp(mx - 1 + lx, my - 1, eyeM, eyeT); sp(mx + 1 + lx, my - 1, eyeM, eyeT); sp(mx + 2 + lx, my - 1, eyeM, eyeT); }
    else { sp(mx - 1 + lx, my - 1, M_PAINT, 1); run2(my - 1, mx + 1 + lx, mx + 2 + lx, M_PAINT, 1); }
    sp(mx + lx, my, M_MASK, 4);                                      // 鼻梁
    sp(mx - 1 + lx, my, M_PAINT, 2); sp(mx + 2 + lx, my, M_PAINT, 2); sp(mx - 1 + lx, my + 1, M_PAINT, 1); sp(mx + 2 + lx, my + 1, M_PAINT, 1);   // 泪痕
    run2(my + 2, mx - 1 + lx, mx + 2 + lx, M_INK, 0); sp(mx + lx, my + 3, M_INK, 0); sp(mx - 1 + lx, my + 3, M_MASK, 4); sp(mx + 1 + lx, my + 3, M_MASK, 4);   // 嘴缝 + 齿
    sp(mx + 2, my - 4, M_MASK, 0); sp(mx + 3, my - 5, M_MASK, 0); sp(mx + 4, my - 5, M_MASK, 4);   // 额顶骨钉（头槌）
  }
  function run2(y, x0, x1, m, t) { for (let x = x0; x <= x1; x++) sp(x, y, m, t); }
  function drawHero() {
    begin(hero, P.bx, 0);
    const [cx, cy] = bodyC(), [mx, my] = maskC();
    wings(cx, cy, 1);
    drawSac(cx, cy);
    drawBody(cx, cy);
    wings(cx, cy, 0);
    if (!P.nomask) drawMask(mx, my, P.eyeG, P.eyes, P.look, P.sway);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }
  // 弹飞的面具（死亡）：单独一张小精灵
  const maskSpr = new Sprite(20, 22, 10, 13), MASK_BAKE = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };
  let maskBaked = false;
  function bakeMask() { if (maskBaked) return; begin(maskSpr, 0, 0); drawMask(0, 0, 0, 1, 0, 0); bake(maskSpr, MASK_BAKE); maskBaked = true; begin(hero, P.bx, 0); hero.k1 = hero.k2 = -1; }

  // ───── 特效 ─────
  const T_HIT = 2 / 12, T_BURST = INCOMING + 0.45, T_FOG2 = INCOMING + 0.62, T_FOG3 = INCOMING + 0.8, T_BURP = 0.35;
  let smT = 9, smX = 0, smY = 0, chargeAcc = 0, trailAcc = 0, soulAcc = 0, lastLp = 0;
  let lobT = 9, lobX0 = 0, lobY0 = 0, lobX1 = 0, lobY1 = 0, lobHit = 1, skullT = 9;
  let mkOn = 0, mkX = 0, mkY = 0, mkVX = 0, mkVY = 0, mkRot = 0, mkRT = 0, mkRest = 0, mkT = 0, fogX = 0, fogY = 0;
  const LOB_DUR = 0.3;
  const sacScr = () => { const [sx, sy] = sacC(); return [scrX(R(sx) + P.bx), HY + R(sy)]; };
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = sacScr();
      releaseOrbit(30, 70, 0.3, 0.6); burst(gx, gy, 16, 40, 100, 0.25, 0.55, R_EL, 8); ring(gx, gy, 0, R_EL); shake(0.28, 2); flash(0.05);
      lobT = 0; lobHit = 0; lobX0 = gx + 1; lobY0 = gy; lobX1 = DUMMY_X - 3; lobY1 = HY - 15;
    }
    if (s === REVIVE) mkOn = 0;
  }
  function lobLanded() {
    const x = lobX1, y = lobY1; lobHit = 1;
    fx.cloud(x, y + 1, 8, R_EL, 1.1, 2); ring(x, y, 0, R_EL); burst(x, y, 22, 40, 110, 0.3, 0.6, R_EL, 10); fx.cross(x, y, 4, R_EL, 0.2, 2);
    hitDummy(1, 1); dummyFx({ dur: 1.4, tint: 'poison' }); shake(0.12, 1); skullT = 0;
    sfx('impact', { pal: 'poison', w: 0.5 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [mx, my] = maskC(); smT = 0; smX = HX + R(mx) + P.bx; smY = HY + R(my);
      const tx = DUMMY_X - 5, ty = HY - 16;
      burst(tx, ty, 8, 35, 80, 0.15, 0.35, FXI.impact, 8); burst(tx, ty, 5, 25, 60, 0.2, 0.4, R_EL, 6); fx.cross(tx, ty, 3, FXI.impact, 0.15, 2); hitDummy(0, 1);
      sfx('swing', { kind: 'smash', w: 0.2 }); sfx('hit', { mat: 'wood', w: 0.2 });
    }
    if (s === RECOVER && t === T_BURP) {                                  // 打嗝冒泡
      const [mx, my] = maskC(); for (let i = 0; i < 3; i++) spawn(K_EMBER, HX + R(mx) + 2 + P.bx + i, HY + R(my) + 2, 4 + Math.random() * 6, -10 - Math.random() * 8, 0.5 + Math.random() * 0.3, R_EL);
    }
    if (s === DEATH && t === T_BURST) {                                   // 毒囊爆开：精灵（去掉面具）交给死亡套件，面具单独弹飞
      bakeMask();
      poseAt(DEATH, T_BURST - 0.02, E.simT); P.nomask = 1; KEY(P); drawHero(); bakeHero(); hero.k1 = P.k1; hero.k2 = P.k2;
      const [sx, sy] = sacC(), [mx, my] = maskC();
      death.start('burst', { power: 0.9, chunk: 3, fromX: R(sx), fromY: R(sy), fadeAt: 1.0, fadeDur: 0.6, ramp: 'soul' });
      const gx = HX + R(sx) + P.bx, gy = HY + R(sy); fogX = gx; fogY = gy;
      burst(gx, gy, 26, 50, 130, 0.3, 0.7, R_EL, 10); ring(gx, gy, 1, R_EL); fx.cloud(gx + 3, gy - 2, 7, R_EL, 1.2, 2); flash(0.05); shake(0.2, 2);
      mkOn = 1; mkT = 0; mkX = HX + R(mx) + P.bx; mkY = HY + R(my); mkVX = -38; mkVY = -78; mkRot = 0; mkRT = 0.07; mkRest = 0;
    }
    if (s === DEATH && (t === T_FOG2 || t === T_FOG3)) {                  // 毒雾一团团飘向击杀者（右侧）
      const k = t === T_FOG2 ? 1 : 2; fx.cloud(fogX + 7 * k, fogY - 3 - 2 * k, 6 - k, R_EL, 1.0, 2);
      for (let i = 0; i < 6; i++) spawnX(K_TRAIL, fogX + 6 * k + Math.random() * 4, fogY - 2 * k + (Math.random() - 0.5) * 6, 18 + Math.random() * 16, -3 - Math.random() * 4, 0.6 + Math.random() * 0.4, R_EL, { age0: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [], [T_BURP], [], [T_BURST, T_FOG2, T_FOG3], []];
  function impactOn() {}
  const rot = (dx, dy, r) => (r === 0 ? [dx, dy] : r === 1 ? [-dy, dx] : r === 2 ? [-dx, -dy] : [dy, -dx]);
  let mkBot = [0, 0, 0, 0];
  function maskBottoms() { for (let r = 0; r < 4; r++) { let b = -99; for (let y = 0; y < maskSpr.h; y++) for (let x = 0; x < maskSpr.w; x++) if (maskSpr.out[y * maskSpr.w + x] !== 255) b = Math.max(b, rot(x - maskSpr.ox, y - maskSpr.oy, r)[1]); mkBot[r] = b; } }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {
      const [gx, gy] = sacScr();
      chargeAcc += dt * (14 + 18 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 3 + Math.random() * 2); }
    }
    if (state === MOVE) { trailAcc += dt * 9; while (trailAcc >= 1) { trailAcc -= 1; const [gx, gy] = sacScr(); spawn(K_TRAIL, gx + (P.flip ? 2 : -2), gy + 2, (P.flip ? 1 : -1) * (6 + Math.random() * 6), 4 + Math.random() * 4, 0.3 + Math.random() * 0.25, R_EL); } }
    if (state === IDLE) { const lp = stT % DUR[IDLE]; if (lastLp < 1.92 && lp >= 1.92) { const [gx, gy] = sacScr(); spawn(K_EMBER, gx, gy - 3, Math.random() * 4 - 2, -9, 0.6, R_EL); } lastLp = lp; }
    if (lobT < LOB_DUR) {
      lobT += dt; const q = clamp01(lobT / LOB_DUR), x = lobX0 + (lobX1 - lobX0) * q, y = lobY0 + (lobY1 - lobY0) * q - 40 * q * (1 - q);
      spawn(K_TRAIL, x - 2, y + Math.random() * 2 - 1, -12 - Math.random() * 10, Math.random() * 8 - 4, 0.25 + Math.random() * 0.2, R_EL);
      if (lobT >= LOB_DUR && !lobHit) lobLanded();
    }
    if (mkOn && !mkRest) {                                                 // 面具：抛物线翻滚 → 落地弹一下 → 仰面躺着
      if (!mkBot[1] && !mkBot[3]) maskBottoms();
      mkT += dt; mkVY += 300 * dt; mkX += mkVX * dt; mkY += mkVY * dt; mkRT -= dt; if (mkRT <= 0) { mkRot = (mkRot + 3) & 3; mkRT = 0.07; }
      if (mkY + mkBot[mkRot] >= HY) {
        if (mkVY > 70) { mkVY *= -0.3; mkVX *= 0.5; mkRot = 1; for (let i = 0; i < 5; i++) spawn(K_DUST, mkX + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); }
        else { mkRest = 1; mkRot = 1; }
        mkY = HY - mkBot[mkRot];
      }
    }
    if (mkOn) mkT += mkRest ? dt : 0;
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 14, HY - 4 - Math.random() * 12, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT += dt; skullT += dt;
  }
  function fxReset() { smT = 9; chargeAcc = 0; trailAcc = 0; soulAcc = 0; lastLp = 0; lobT = 9; lobHit = 1; skullT = 9; mkOn = 0; mkRest = 0; mkT = 0; }
  function fxBack(f12) {
    if (P.dq < 0.6) groundShadow(scrX(0), 5, ALT - P.dy);
    if (P.rim >= 2 && !P.nomask) floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  const SKULL = ['.###.', '#####', '#.#.#', '#####', '.#.#.'];
  function fxFront(f12) {
    if (smT < 2 / 12) {                                               // 头槌冲刺速度线：面具后方 3 道
      const c = smT < 1 / 12 ? EL[1] : EL[2];
      for (const [dy, L] of [[-2, 5], [0, 7], [2, 4]]) for (let k = 1; k <= L; k++) { if (smT >= 1 / 12 && (k & 1)) continue; put(smX - 4 - k, smY + dy, k < 3 ? c : EL[3]); }
    }
    if (lobT < LOB_DUR) {                                             // 诅咒毒弹：2×2 荧绿芯 + 外圈 + 紫色骷髅尾点
      const q = clamp01(lobT / LOB_DUR), x = R(lobX0 + (lobX1 - lobX0) * q), y = R(lobY0 + (lobY1 - lobY0) * q - 40 * q * (1 - q));
      for (const [dq, c] of [[0.1, CU[1]], [0.2, CU[2]], [0.3, CU[3]]]) { const qq = Math.max(0, q - dq); put(R(lobX0 + (lobX1 - lobX0) * qq), R(lobY0 + (lobY1 - lobY0) * qq - 40 * qq * (1 - qq)), c); }
      put(x - 1, y - 1, EL[2]); put(x + 2, y, EL[2]); put(x, y + 2, EL[2]); put(x - 1, y + 1, EL[2]); put(x + 1, y - 1, EL[1]); put(x + 2, y + 1, EL[2]);
      put(x, y, EL[0]); put(x + 1, y, EL[1]); put(x, y + 1, EL[1]); put(x + 1, y + 1, EL[0]);
    }
    if (skullT < 0.5 && !(skullT > 0.35 && (f12 & 1))) {                // 假人头顶的紫色小骷髅记号
      const x0 = DUMMY_X - 2, y0 = HY - 40 - (skullT < 0.1 ? 0 : 1);
      for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) { const ch = SKULL[j][i]; if (ch === '#') put(x0 + i, y0 + j, j === 0 ? CU[0] : CU[1]); else if (j === 2 || (j === 4 && i !== 0 && i !== 4)) put(x0 + i, y0 + j, CU[4]); }
    }
    if (mkOn) {                                                       // 弹飞的面具（死亡）
      const dq = clamp01((E.stT - INCOMING - 1.6) / 0.8), x0 = R(mkX), y0 = R(mkY), s = maskSpr;
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = s.out[y * s.w + x]; if (c === 255) continue; const r = rot(x - s.ox, y - s.oy, mkRot); if (B8[((r[1] + 64) & 7) * 8 + ((r[0] + 64) & 7)] < dq) continue; put(x0 + r[0], y0 + r[1], c); }
    }
  }

  return {
    name: '巫毒信徒', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EYE, M_LIQ, M_HOT], HIT_POINT: [1, -12], EVENTS,
    deathKit: { mode: 'burst', at: T_BURST },
    SFX: { body: 'flesh', how: 'explode', pal: 'poison', style: 'poison', w: 0.2, hover: 1 },
    REVIVE: { dy: -12, ramp: FXI.poison },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront,
  };
});
