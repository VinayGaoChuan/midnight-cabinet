// 守卫（部队 · 骷髅 · 先锋 · 普通 · 飞行 · batch-15）：一只从教堂屋檐上飞下来的小石像鬼骷髅——身子蜷成蹲姿悬在半空，
// 一对石化羊角从头两侧往后盘、石雕獠牙下巴、背后一对灰石破膜骨翼，双手抱着一块比自己还宽的圆顶墓碑（刻十字、长青苔）挡在身前。
// 攻击 = 冲撞（收翼斜着俯冲，墓碑在前撞向目标，再扑翼弹回）；技能 = 特性「石肤术」生效（受到的伤害减少 20%）：
// 石纹从翼根往下逐行爬满全身 → 双翼向前一合把自己包住、剪影一帧变成纯石色、石屑外爆 → 一颗敌弹打在翼面上「叮」地弹开。
// 死亡 = 坠落碎裂：翼一垂直线坠地，落地像石头一样碎成块弹开（死亡套件 chunks），墓碑立在碎块旁边。
// 升级成「教堂守卫」（ChurchGuard.js）：同一个体——卷角、石獠牙下巴保留，骨翼收拢石化成石翼斗篷，不再能飞。设定卡见 pcd/batch-15/Guard/design.md。
PCD.define('Guard', (E) => {
  const { defMat, Sprite, begin, part, sp, run, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, groundShadow, blitShape, sfx, death, parts } = E;
  const B = parts.beast, U = B.util, R = Math.round;

  // ───── 材质：墓石灰身体与翼膜（石化后亮一级）、骨只露在关节、墓碑苍白石 + 青苔 ─────
  const S_BODY = [0, 9, 10, 18], S_LIT = [0, 10, 18, 17], S_WING = [0, 9, 10, 18], S_WLIT = [0, 10, 18, 17], S_SKULL = [0, 10, 18, 17], S_SKLIT = [0, 18, 17, 21];
  const M_BODY = defMat(S_BODY, 2), M_LIMB = defMat(S_BODY, 1), M_LIMBD = defMat(S_BODY, 1, 0, 1), M_LIT = defMat(S_LIT, 2), M_LITL = defMat(S_LIT, 1), M_LITD = defMat(S_LIT, 1, 0, 1);
  const M_BONE = defMat('bone', 1), M_BONED = defMat('bone', 1, 0, 1), M_HORN = defMat(S_BODY, 1), M_HORNL = defMat(S_LIT, 1);
  const M_SKULL = defMat(S_SKULL, 1), M_SKLIT = defMat(S_SKLIT, 1), M_RIB = defMat('stone', 1), M_RIBD = defMat('stone', 1, 0, 1), M_RIBL = defMat(S_BODY, 1), M_RIBLD = defMat(S_BODY, 1, 0, 1);
  const M_TOMB = defMat('pale', 2), M_MOSS = defMat('moss', 1), M_INK = defMat('ink', 1, 1), M_EYE = defMat([20, 61, 62, 5], 1, 1);
  const WM = { wing: defMat(S_WING, 2), wingFar: defMat(S_WING, 1, 0, 1), bone: M_RIB, boneFar: M_RIBD, claw: M_BONE };     // 翼膜灰石、翼指深石，只有拇指爪是骨
  const WL = { wing: defMat(S_WLIT, 2), wingFar: defMat(S_WLIT, 1, 0, 1), bone: M_RIBL, boneFar: M_RIBLD, claw: M_BONE };
  const R_EL = FXI.earth, EL = FXR[R_EL], CHIP = E.fxRamp('graveChip', [17, 18, 10, 9, 8]), CH = FXR[CHIP];   // 石肤 · 墓苔灰：土黄色阶 + 石屑灰
  const HX = 76, DUR = DEFAULT_DUR.slice(), ALT = 6;
  const hero = new Sprite(64, 56, 28, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 9, 13], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const m of [M_TOMB, M_MOSS, M_EYE, M_INK, M_HORN, M_HORNL]) RIM.skip[m] = 1;
  const WSPEC = { span: 14, chord: 4, type: 'membrane', fingers: 3 };

  // ───── 姿势 ─────
  // wing 翼姿（B.WINGS 0–6）· bob 飘动 · dy 下沉（+ 往下；俯冲、坠落）· jaw 下巴张开 0–2 · tilt 歪头 -1..1 · eyeG 眼火 0 暗 / 1 亮 / 2 很亮 / 3 爆闪 / 4 熄灭
  // pet 石化进度 0–8（0 没有；≥ 1 翼与头石化，之后每档往下多 2 行）· wrap 双翼前合 · noTomb 不画墓碑（死亡碎裂时墓碑单独画）
  const P = { wing: 1, bob: 0, dy: 0, bx: 0, jaw: 0, tilt: 0, eyeG: 0, pet: 0, wrap: 0, eyes: 0, flash: 0, rim: 1, dq: 0, dq48: 0, noTomb: 0,
    gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['wing', 0, 6], ['bob', -2, 2], ['dy', -3, 8], ['bx', -8, 15], ['jaw', 0, 2], ['tilt', -1, 1], ['eyeG', 0, 4], ['pet', 0, 8], ['wrap', 0, 1],
    ['eyes', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['dq48', 0, 48], ['noTomb', 0, 1]]);
  const FLAP = B.FLAP, FLAP_BOB = B.FLAP_BOB;
  const T_HIT = 2 / 12, T_SHOT = 1.27, T_LAND = INCOMING + 0.55, T_CRUMBLE = INCOMING + 0.66, T_CLACK = 1.84;
  function reset() { P.wing = 1; P.bob = 0; P.dy = 0; P.bx = 0; P.jaw = 0; P.tilt = 0; P.eyeG = 0; P.pet = 0; P.wrap = 0; P.eyes = 0; P.flash = 0; P.rim = 0; P.dq = 0; P.noTomb = 0; P.mx = 0; P.flip = 0; }
  function idle(tq, f12) {                                                    // 蹲伏悬停：只扇翼；循环末尾歪头看一眼、石下巴咔地合一下
    const TT = f12 / 12; P.wing = FLAP[(f12 >> 1) & 3]; P.bob = (Math.floor(TT * 2.5 + 1e-6) & 1) ? -1 : 0;
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 && lp < 2.0) { P.tilt = 1; P.jaw = lp < T_CLACK ? 1 : 0; P.eyeG = lp >= T_CLACK && lp < T_CLACK + 0.09 ? 2 : 1; }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                   // 扑翼悬飞：4 帧扑翼 + 上下飘 2 格，不落地
      const f = gait(tq); P.wing = FLAP[f]; P.bob = FLAP_BOB[f];
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                               // 冲撞：抬高后引 → 收翼斜着俯冲、墓碑撞目标 → 扑翼弹回
      if (tq < 0.12) { const q = ease.out(tq / 0.12); P.bx = -R(2 * q); P.dy = -R(2 * q) - 1; P.wing = 5; P.jaw = 1; P.eyeG = 1; }
      else if (tq < 0.25) { P.bx = 7; P.dy = 3; P.wing = 0; P.jaw = 1; P.eyeG = 2; P.rim = 2; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.25) / 0.2); P.bx = R(6 - 4 * q); P.dy = R(2 - 3 * q); P.wing = (f12 & 1) ? 3 : 1; P.eyeG = 1; }
      else { idle(tq, f12); const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.bx = R(2 * (1 - q)); P.dy = -R(1 - q); }
    } else if (st === CHARGE) {                                               // 双翼高举，石纹从翼根往下逐行爬（每帧 2 行）
      const q = ease.inOut(clamp01(tq / 0.7));
      P.wing = q > 0.3 ? ((tq > 1.1 && (f12 & 1)) ? 1 : 5) : FLAP[(f12 >> 1) & 3]; P.dy = -R(q); P.jaw = 0;
      P.pet = Math.max(0, Math.min(8, f12of(tq) - 4)); P.rim = 1; P.eyeG = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
    } else if (st === CAST) {                                                 // 双翼前合包住身体；第 2 帧敌弹弹开，身上闪一下（不击退）
      P.wrap = 1; P.wing = 0; P.pet = 8; P.rim = 2; P.eyeG = 3; P.dy = -1; P.flash = tq >= 1 / 12 && tq < 2 / 12 ? 1 : 0;
    } else if (st === RECOVER) {                                              // 张翼、石纹从下往上退回
      const q = ease.inOut(clamp01(tq / 0.6));
      if (tq < 0.12) { P.wrap = 1; P.wing = 0; } else if (tq < 0.25) P.wing = 5; else idle(tq, f12);
      P.pet = R(8 * (1 - q)); P.eyeG = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.dy = -R(1 - q);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.flash = h < 1 / 12 ? 1 : 0; P.eyes = 1; P.jaw = 2; P.wing = 5; P.tilt = -1; P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.jaw = 1; P.wing = 4; P.rim = 0; }
      else idle(tq, f12);
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 1; P.jaw = 2; P.wing = d < 0.15 ? 5 : 6; P.tilt = -1; P.eyeG = (f12 & 1) ? 1 : 4; }
      else if (d < T_LAND - INCOMING) { const q = (d - 0.3) / (T_LAND - INCOMING - 0.3); P.bx = -2; P.eyes = 1; P.jaw = 2; P.wing = 6; P.tilt = -1; P.dy = R(ALT * q * q); P.eyeG = 4; }   // 翼一垂，直线坠落
      else { P.bx = -2; P.eyes = 1; P.jaw = 2; P.wing = 6; P.tilt = 1; P.dy = ALT; P.eyeG = 4; if (d >= T_CRUMBLE - INCOMING) { P.dq = 1; P.noTomb = 1; } }         // 落地一顿 → 碎裂（交给死亡套件）
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    const e = eyeAt(); P.gx = e[0] + P.bx; P.gy = e[1] + yOff();
    P.dq48 = R(P.dq * 48); KEY(P);
  }
  const yOff = () => -ALT + P.bob + P.dy;                                      // 悬停偏移：身体按「站在地上」的坐标画，整体抬高 ALT 格
  const eyeAt = () => [5 + Math.max(0, P.tilt), -21 + Math.max(0, P.tilt)];

  // ───── 画（本地坐标 = 蹲在地上时的坐标；begin 的 y 偏移把整只抬到空中）─────
  const lit = (y) => P.pet > 0 && y <= -16 + (P.pet - 1) * 2;                  // 石化线：pet ≥ 1 翼根以上先石化，之后每档往下 2 行
  const front = (y) => P.pet > 0 && P.pet < 8 && y > -18 + (P.pet - 1) * 2 && y <= -16 + (P.pet - 1) * 2;   // 正在爬的那 2 行（石纹亮线）
  const limbM = (y, far) => (lit(y) ? (far ? M_LITD : M_LITL) : (far ? M_LIMBD : M_LIMB));
  function claws(x, far) {                                                    // 鸟爪一样的石脚：脚掌 3 格 + 两根骨白趾爪
    const m = limbM(-1, far), c = far ? M_BONED : M_BONE;
    run(-1, x - 1, x + 1, m, 0); sp(x - 1, 0, c, 3); sp(x + 1, 0, c, 3); sp(x + 2, 0, c, far ? 3 : 4);
  }
  function drawLegs() {                                                       // 蹲姿：大腿顶到胸前（被躯干盖住），小腿垂下
    part(); U.taper(E, -4, -7, -1, -10, 1.1, 0.9, limbM(-8, 1), 0); U.taper(E, -1, -10, -1, -2, 0.9, 0.7, limbM(-6, 1), 0); U.dot(E, -1, -10, M_BONED, 3); claws(-1, 1);
    part(); U.taper(E, -2, -6, 3, -10, 1.1, 0.9, limbM(-8, 0), 0); U.taper(E, 3, -10, 2, -2, 0.9, 0.7, limbM(-6, 0), 0); U.dot(E, 3, -10, M_BONE, 4); claws(2, 0);
  }
  function drawTorso() {                                                      // 佝偻的石化骨架躯干：背拱、两道肋沟、脊骨节
    part();
    for (let y = -15; y <= -6; y++) {
      const t = (y + 15) / 9, L = R(-5 - 1.3 * Math.sin(Math.PI * Math.min(1, t * 1.1))), Rr = R(1 - t * 1.2), lt = lit(y), fr = front(y);
      for (let x = L; x <= Rr; x++) sp(x, y, lt ? M_LIT : M_BODY, fr ? 4 : (!lt && (y === -12 || y === -9) && x > L + 1 && x < Rr) ? 2 : 0);
      if ((y & 1) && y < -7) sp(L + 1, y, M_BONE, 3);                          // 脊骨节
    }
  }
  function drawBackArm() {                                                    // 后手绕到墓碑后面，只有骨爪从碑顶扣出来
    part(); U.taper(E, -3, -14, 4, -16, 0.9, 0.8, limbM(-15, 1), 0);
    part(); for (const x of [6, 7, 8]) U.dot(E, x, -16, M_BONED, x === 8 ? 3 : 2); U.dot(E, 8, -15, M_BONED, 2);
  }
  function drawFrontArm() {                                                   // 前手：肩 → 肘（骨节）→ 骨爪扣在碑面左沿
    part(); U.taper(E, -1, -13, -2, -9, 1, 0.9, limbM(-11, 0), 0); U.taper(E, -2, -9, 1, -8, 0.9, 0.8, limbM(-9, 0), 0); U.dot(E, -2, -9, M_BONE, 4);
    part(); sp(2, -9, M_BONE, 4); sp(3, -9, M_BONE, 3); sp(2, -8, M_BONE, 3); sp(3, -8, M_BONE, 2); sp(4, -9, M_BONE, 3); sp(4, -7, M_BONE, 2);
  }
  // 候选部件：gargoyleSkull 石像鬼骷髅头——7×6 石颅（眉骨、2 格眼窝 + 1 格眼火、鼻孔）+ 外凸的石雕下颌（张合 jaw 0–2）+ 一对外翻獠牙。
  // (x0, y0) = 颅左上角；w 颅宽；mats = { skull, bone, eye, ink }。ChurchGuard.js 用同一画法放大一圈。
  function gargoyleSkull(x0, y0, w, mats, jaw, eyes, eyeG) {
    const h = 6, x1 = x0 + w - 1, sk = mats.skull, bone = mats.bone;
    part();
    for (let j = 0; j < h; j++) { const y = y0 + j, a = j === 0 ? x0 + 1 : j === h - 1 ? x0 + 1 : x0, b = j === 0 ? x1 - 1 : j >= 4 ? x1 + 1 : x1; run(y, a, b, sk, 0); }
    run(y0 + 1, x1 - 2, x1, sk, 4);                                           // 眉骨
    if (eyes) { sp(x1 - 2, y0 + 2, M_INK, 0); sp(x1 - 1, y0 + 2, sk, 1); }
    else { sp(x1 - 2, y0 + 2, M_INK, 0); sp(x1 - 1, y0 + 2, mats.eye, [2, 3, 4, 4, 1][eyeG]); if (eyeG === 3) sp(x1 - 1, y0 + 1, mats.eye, 4); }
    sp(x1 + 1, y0 + 3, M_INK, 0); sp(x1, y0 + 4, sk, 2);                     // 鼻孔 · 颧沟
    for (let x = x0 + 3; x <= x1 + 1; x += 2) sp(x, y0 + 5, bone, 4);           // 上排牙
    const jy = y0 + 6 + jaw;
    if (jaw) for (let x = x0 + 2; x <= x1; x++) for (let y = y0 + 6; y < jy; y++) sp(x, y, M_INK, 0);   // 张嘴的黑缝
    run(jy, x0 + 1, x1 + 1, sk, 0); run(jy + 1, x0 + 2, x1, sk, 0); sp(x1 + 1, jy + 1, sk, 2);         // 石下颌（往前凸 1 格）
    sp(x1 + 2, jy - 1, bone, 4); sp(x1 + 2, jy - 2, bone, 3); sp(x0 + 4, jy - 1, bone, 3);             // 獠牙外翻
  }
  // 候选部件：ramHorn 侧面看的盘卷羊角——从颅顶往后绕一圈再从耳侧往前勾，根部 2 格粗、每 2 格一道环纹，尖端亮；k 放大倍数（ChurchGuard 用 1.4）
  const RAM = [[1, 0, 2], [0, -1, 2], [-1, -1, 2], [-2, -1, 2], [-3, 0, 2], [-4, 1, 2], [-4, 2, 1], [-4, 3, 1], [-3, 4, 1], [-2, 4, 1], [-1, 3, 1]];
  function ramHorn(x, y, m, far, k) {
    part();
    for (let i = 0; i < RAM.length; i++) { const [dx, dy, w] = RAM[i], X = R(x + dx * k), Y = R(y + dy * k), tip = i === RAM.length - 1;
      for (let j = 0; j < w; j++) sp(X, Y + j, m, tip ? (far ? 3 : 4) : far ? (i & 1 ? 1 : 2) : ((i & 1) ? 2 : j === 0 ? 4 : 3)); }
  }
  // 候选部件：tombSlab 圆顶墓碑——10×13，圆顶两级收边、刻十字（2 格宽竖 + 横）、一道斜裂纹、碑脚青苔。(ox, oy) = 左下角
  function drawTomb(ox, oy) {
    part();
    for (let j = 0; j <= 12; j++) { const y = oy - 12 + j, a = j === 0 ? ox + 2 : j === 1 ? ox + 1 : ox, b = j === 0 ? ox + 7 : j === 1 ? ox + 8 : ox + 9; run(y, a, b, M_TOMB, 0); }
    for (let j = 3; j <= 9; j++) { sp(ox + 4, oy - 12 + j, M_TOMB, 2); sp(ox + 5, oy - 12 + j, M_TOMB, 2); }
    for (let x = ox + 2; x <= ox + 7; x++) sp(x, oy - 7, M_TOMB, 2);
    sp(ox + 3, oy - 8, M_TOMB, 4); sp(ox + 3, oy - 9, M_TOMB, 4);                // 刻痕上沿受光
    sp(ox + 8, oy - 10, M_TOMB, 2); sp(ox + 7, oy - 9, M_TOMB, 2); sp(ox + 7, oy - 8, M_TOMB, 2); sp(ox + 8, oy - 7, M_TOMB, 2);   // 裂纹
    for (const [dx, dy, t] of [[0, 0, 3], [1, 0, 4], [2, 0, 3], [0, -1, 4], [0, -2, 3], [8, 0, 3], [9, 0, 4], [9, -1, 3], [1, -1, 3]]) sp(ox + dx, oy + dy, M_MOSS, t);
  }
  // 候选部件：wingWrap 双翼前合（石肤施放）——一片石化翼膜从背后绕到身前把身体包住，只露出眼窝和角；三根翼指 + 翼顶拇指爪
  function drawWrap() {
    part();
    U.poly(E, [-4, -14, -3, -19, 1, -20, 6, -19, 11, -20, 13, -16, 13, -9, 11, -4, 6, -2, 1, -3, -3, -6], WL.wing, 0);
    for (const [x, y] of [[6, -19], [12, -17], [13, -9]]) U.seg(E, -2, -17, x, y, 1, M_BONE, 0);
    U.dot(E, -2, -18, M_BONE, 4); U.dot(E, -3, -19, M_BONE, 3);
    for (const [x, y] of [[9, -6], [4, -3], [12, -13]]) U.dot(E, x, y, WL.wing, 2);          // 翼膜上的石纹
  }
  function drawHero() {
    begin(hero, P.bx, yOff());
    const wm = P.pet > 0 ? WL : WM, t = P.tilt > 0 ? 1 : 0;
    B.wing(E, 1, -16, P.wrap ? 0 : P.wing, WSPEC, wm, 1);                      // 远翼（翼根错开，暗一级）
    drawBackArm();
    drawLegs();
    drawTorso();
    if (!P.wrap) B.wing(E, -3, -14, P.wing, WSPEC, wm, 0);                     // 近翼
    const sm = { skull: P.pet > 0 ? M_SKLIT : M_SKULL, bone: M_BONE, eye: M_EYE };
    part(); U.dot(E, -1, -16, limbM(-16, 0), 0); U.dot(E, 0, -17, limbM(-17, 0), 0);   // 颈骨
    const hm = P.pet > 0 ? M_HORNL : M_HORN;
    ramHorn(3 + t, -23 + t, hm, 1, 1);                                        // 远侧角（错开、暗一级）
    gargoyleSkull(0 + t, -23 + t, 7, sm, P.jaw, P.eyes, P.eyeG);
    ramHorn(1 + t, -23 + t, hm, 0, 1);                                        // 近侧角盘在颅侧
    if (!P.noTomb) drawTomb(1, -3);
    drawFrontArm();
    if (P.wrap) drawWrap();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const tomb = new Sprite(14, 18, 6, 16), TB = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };
  let tombOn = 0, tombX = 0, diveT = 9, chargeAcc = 0, soulAcc = 0, lastGf = -1, lastLp = 0, lastPet = 0;
  const bodyScr = () => [scrX(-1 + P.bx), HY + yOff() - 11];
  function chips(x, y, n, spd, up) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * spd, -up * Math.random(), 0.5 + Math.random() * 0.4, CHIP, { g: 220, floor: HY }); }
  function onEnter(s) {
    if (s === CAST) {                                                         // 双翼一合：石屑向四周外爆 18 颗 + 土黄冲击环
      const [cx, cy] = bodyScr();
      releaseOrbit(30, 70, 0.3, 0.6, { pts: 1 }); burst(cx + 4, cy, 18, 50, 120, 0.3, 0.7, CHIP, 10); ring(cx + 4, cy, 0, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                        // 墓碑正面撞上假人
      const x = scrX(11 + P.bx), y = HY + yOff() - 9; diveT = 0;
      burst(x, y, 12, 40, 100, 0.15, 0.35, FXI.impact, 8); chips(x, y, 6, 50, 40); fx.cross(x, y, 4, FXI.impact, 0.2); hitDummy(0, 1); shake(0.1, 1);
      sfx('swing', { kind: 'smash', w: 0.45 }); sfx('hit', { mat: 'stone', w: 0.45 });
    }
    if (s === CHARGE && t === T_SHOT) shoot(1, 134, HY - ALT - 14, -200, HX + 13, FXI.enemy);   // 敌弹从画外飞来（打在合起的翼面上）
    if (s === DEATH && t === T_LAND) {                                        // 砸在地上
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 12 + Math.random() * 22, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      chips(HX + 1, HY - 4, 6, 50, 50); shake(0.12, 1); sfx('fall', { w: 0.45 });
    }
    if (s === DEATH && t === T_CRUMBLE) {                                     // 碎成石块弹开，墓碑单独立在旁边
      poseAt(DEATH, T_CRUMBLE - 0.03, E.simT); P.noTomb = 1; P.dq = 0; P.dq48 = 0; KEY(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 4, power: 0.6, fromX: -1, fromY: -9, fadeAt: 0.94, fadeDur: 0.8, ramp: 'soul' });
      begin(tomb, 0, 0); drawTomb(-5, 0); bake(tomb, TB); tombOn = 1; tombX = HX + P.mx + P.bx + 6;
      burst(HX, HY - 8, 14, 40, 110, 0.3, 0.6, CHIP, 14); shake(0.16, 1); sfx('hit', { mat: 'stone', w: 0.5 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [T_SHOT], [], [], [], [T_LAND, T_CRUMBLE], []];
  function impactOn(k, x, y) {
    if (k !== 1) return;                                                      // 敌弹打在翼面上「叮」地弹开（反向往右上飞走）
    shoot(2, x + 2, y, 150, 170, FXI.enemy, -80, { trail: { every: 1, life: [0.1, 0.2], back: [10, 20], off: 2 }, glow: -1 });
    burst(x, y, 10, 40, 110, 0.15, 0.4, R_EL, 6); chips(x, y, 6, 40, 40); fx.cross(x, y, 5, R_EL, 0.25); ring(x, y, 0, R_EL); shake(0.12, 1);
    sfx('impact', { pal: 'earth', w: 0.45 });
  }
  function hurtFx(s) {                                                        // 石头挨打：石屑 + 尘，不是血肉火花
    const hx = HX + 2, hy = HY - ALT - 12; burst(hx, hy, s === DEATH ? 22 : 14, 50, 130, 0.25, 0.55, CHIP, 20); burst(hx, hy, 6, 40, 90, 0.2, 0.4, FXI.dust, 10);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE) {                                                     // 身下掉 1 颗石屑色尘粒
      const f = gait(q12(stT)); if (f !== lastGf) { spawnX(K_PHYS, scrX(-1) + (Math.random() - 0.5) * 3, HY + yOff() + 1, (P.flip ? 1 : -1) * (6 + Math.random() * 6), 0, 0.5, CHIP, { g: 90, floor: HY }); lastGf = f; }
    }
    if (state === IDLE) { const lp = q12(stT) % DUR[IDLE]; if (lastLp < T_CLACK && lp >= T_CLACK) chips(scrX(7), HY + yOff() - 17, 3, 30, 20); lastLp = lp; }
    if (state === CHARGE || state === RECOVER) {                              // 石化线爬过的地方掉下细石屑；蓄力时土黄尘粒从脚下聚到胸口
      if (P.pet !== lastPet && P.pet > 0 && P.pet < 8) { const y = HY + yOff() - 16 + (P.pet - 1) * 2; chips(scrX(-5 + P.bx), y, 1, 20, 10); chips(scrX(1 + P.bx), y, 1, 20, 10); }
      lastPet = P.pet;
      if (state === CHARGE) { chargeAcc += dt * 14; while (chargeAcc >= 1) { chargeAcc -= 1; const [cx, cy] = bodyScr(), a = Math.random() * 6.2832, r = 12 + Math.random() * 8; spawnX(K_SPIRAL_PT, cx, cy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 3 + Math.random() * 2, tx: cx, ty: cy }); } }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 22, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    diveT += dt;
  }
  function fxReset() { tombOn = 0; diveT = 9; chargeAcc = 0; soulAcc = 0; lastGf = -1; lastLp = 0; lastPet = 0; }
  function fxBack(f12) {
    if (P.dq < 0.6 && !tombOn) groundShadow(scrX(2 + P.bx), 7, Math.max(0, ALT - P.dy - P.bob));
    if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  function fxMid(f12) {
    if (diveT < 2 / 12) {                                                     // 俯冲的风线：从抬高的起点斜着拉到撞击点（第 2 帧断续）
      const late = diveT >= 1 / 12;
      for (const [oy, len] of [[-18, 12], [-12, 14], [-6, 10]]) { const x1 = scrX(P.bx - 3), y1 = HY + yOff() + oy; for (let k = 0; k < len; k++) { if (late && (k & 1)) continue; put(R(x1 - k * (P.flip ? -1 : 1)), R(y1 - k * 0.5), k < 3 ? CH[0] : k < 8 ? CH[1] : CH[2]); } }
    }
    if (tombOn && E.state === DEATH) {                                        // 墓碑：落地后立在碎块旁边，最后一起消散
      const d = E.stT - T_CRUMBLE, up = d < 1 / 12 ? 3 : d < 2 / 12 ? 1 : 0, yb = HY - up, dq = clamp01((E.stT - INCOMING - 1.6) / 0.8), o = tomb.out;   // 离地 3 → 1 → 0
      for (let y = 0; y < tomb.h; y++) for (let x = 0; x < tomb.w; x++) { const c = o[y * tomb.w + x]; if (c === 255 || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue; put(tombX - tomb.ox + x, yb - tomb.oy + y, c); }
    }
  }
  function fxFront(f12) {
    if (E.state === CAST && E.stT < 1 / 12 && P.dq < 1) blitShape(hero, HX + P.mx, HY, P.flip, EL[2], 0);   // 施放第 1 帧：整个剪影变成纯石色
    if (E.state === CHARGE && P.pet > 0 && P.pet < 8) {                       // 石纹爬行前沿两侧的土黄轮廓点
      const y = HY + yOff() - 16 + (P.pet - 1) * 2; put(scrX(-7 + P.bx), y, (f12 & 1) ? EL[1] : EL[2]); put(scrX(2 + P.bx), y, (f12 & 1) ? EL[2] : EL[1]);
    }
  }

  return {
    name: '守卫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EYE], HIT_POINT: [3, -ALT - 12], EVENTS,
    deathKit: { mode: 'chunks', at: T_CRUMBLE },
    SFX: { body: 'stone', how: 'shatter', pal: 'earth', style: 'shield', w: 0.45, hover: 1 },
    REVIVE: { dy: -ALT - 10, ramp: FXI.soul },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
