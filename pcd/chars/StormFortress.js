// 风暴堡垒（精灵 · 先锋 · 神话）：玉藤堡垒进化成的两层阶梯石塔。保留雉堞塔顶、香蕉叶、倒刺藤蔓和卷香蕉的藤臂——塔加高一层、
// 石色转成灰青风暴石、倒刺长成带电蓝刺尖的粗荆棘、藤臂长到三只（右侧 · 左侧 · 背后举过顶），塔顶香蕉叶上方悬着一团雷云。
// 攻击 = 三只藤臂依次急抡，一次攻击连投 3 只香蕉（特性「部落战争」连击 +2）；技能 = 特性「荆棘」+「部落战争」：两颗敌弹打在塔上，
// 全身荆棘一根根带电竖起、雷云压低蓄电 → 荆棘迸射一大扇 8 根带电刺弹，雷云同时劈出三道闪电（连击三下）→ 假人眩晕。
// 死亡 = 上层塔先歪、从中间断开向后倒下，雷云散成雨丝和最后一道闪电，香蕉串甩飞，倒下的塔块化成碎石（死亡套件 chunks）。
// 身体不用现成骨架：树根双足、阶梯塔、荆棘藤、三只藤臂、香蕉串、香蕉叶、雷云都是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('StormFortress', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_EMBER, K_PHYS, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, fall, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, sfx, B8 } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const STONE = E.ramp([27, '#2f4a52', '#50727a', '#8fb2b4']);           // 灰青风暴石：勾线借共享钢黑，暗 / 基 / 亮是本角色的冷灰青（玉青石褪色、带蓝调）
  const M_ST = defMat(STONE, 2), M_ST1 = defMat(STONE, 1);                 // 塔身（band 2）/ 雉堞、走道（band 1）
  const M_VINE = defMat([0, 34, 34, 35], 1), M_VINE_D = defMat([0, 0, 34, 34], 1);   // 墨绿荆棘藤（背后的藤臂再暗一级）
  const M_THORN = defMat([0, 34, 35, 36], 1);                              // 荆棘刺身
  const M_ZAP = defMat([40, 23, 22, 21], 1, 1);                            // 电蓝刺尖 / 云里的电光（发光体，按档位直接写色调）
  const M_LEAF = defMat('green', 1), M_LEAF_D = defMat('green', 1, 0, 1);
  const M_ROOT = defMat('wood', 1), M_ROOT_D = defMat('wood', 1, 0, 1);
  const M_BAN = defMat([20, 14, 47, 51], 1);
  const M_CLOUD = defMat([27, 28, 29, 30], 2);                             // 灰蓝风暴云（steel 色阶）
  const M_SLIT = defMat('ink', 1, 1), M_EYE = defMat([40, 23, 22, 21], 1, 1);   // 射孔 / 眼光（电蓝，发光体）
  const R_EL = FXI.bolt, EL = FXR[R_EL], R_NAT = FXI.nature, R_IMP = FXI.impact, HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(74, 56, 38, 51);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 9, 12], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const m of [M_BAN, M_ROOT, M_ROOT_D, M_EYE, M_SLIT, M_ZAP, M_CLOUD, M_THORN]) RIM.skip[m] = 1;

  // ───── 姿势 ─────
  // 三只藤臂各有一个姿态档 a0 / a1 / a2（0 待机 · 1 后引 · 2 抡出 · 3 延续 · 4 缩起 · 5 高举 · 6 受击 · 7 垂下）和摆动 s0 / s1 / s2；t0–t2 = 这只已经投出一根
  const ARM = [
    { sh: [10, -14], far: 0, p: [[18, -12, 2], [7, -31, -4], [22, -23, 3], [20, -18, 2], [15, -9, 1], [19, -27, 3], [15, -8, -2], [16, -3, -3]] },       // 右侧（前）
    { sh: [-4, -25], far: 2, p: [[-13, -37, -2], [-17, -34, -2], [9, -39, 3], [8, -36, 2], [-11, -33, 2], [-9, -40, -2], [-14, -32, 2], [-13, -22, 3]] }, // 背后举过顶
    { sh: [-10, -14], far: 1, p: [[-18, -12, -2], [-21, -8, -2], [3, -37, 4], [1, -33, 3], [-15, -9, -1], [-18, -27, -3], [-16, -8, 2], [-15, -3, 3]] }, // 左侧（远）
  ];
  const P = { a0: 0, a1: 0, a2: 0, s0: 0, s1: 0, s2: 0, t0: 0, t1: 0, t2: 0, bob: 0, crouch: 0, rock: 0, leaf: 0, ex: 0, eye: 0, barb: 0, crack: 0, tilt: 0,
    cloud: 1, cdn: 0, clag: 0, zap: 0, fF: 0, fB: 0, uF: 0, uB: 0, step: 0, bx: 0, flash: 0, dq: 0, dq48: 0, rim: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['a0', 0, 7], ['a1', 0, 7], ['a2', 0, 7], ['s0', -1, 1], ['s1', -1, 1], ['s2', -1, 1], ['t0', 0, 1], ['t1', 0, 1], ['t2', 0, 1], ['bob', 0, 1], ['crouch', 0, 3],
    ['rock', -1, 1], ['leaf', -2, 2], ['ex', -1, 1], ['eye', 0, 4], ['barb', 0, 4], ['crack', 0, 2], ['tilt', 0, 3], ['cloud', 0, 1], ['cdn', 0, 3], ['clag', -1, 1], ['zap', 0, 2],
    ['fF', -3, 3], ['fB', -3, 3], ['uF', 0, 2], ['uB', 0, 2], ['bx', -4, 8], ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  const armSet = (a, b, c) => { P.a0 = a; P.a1 = b; P.a2 = c; };
  const T_R = [2 / 12, 4 / 12, 6 / 12], T_FLY = 0.22;                     // 三连投的出手帧、香蕉飞行时间
  const T_HIT1 = 0.4, T_HIT2 = 0.65;                                        // 蓄力里两颗敌弹命中
  const T_TOP = INCOMING + 0.3, T_LAND = INCOMING + 0.6, T_BREAK = INCOMING + 1.0;
  const W_F = [3, 0, -2, 1], W_B = [-3, 1, 2, 0], W_UF = [0, 0, 0, 2], W_UB = [0, 2, 0, 0], W_BOB = [1, 0, 1, 0], W_ROCK = [-1, 0, 1, 0], W_STEP = [1, 0, -1, 0];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; armSet(0, 0, 0); P.s0 = 0; P.s1 = 0; P.s2 = 0; P.t0 = 0; P.t1 = 0; P.t2 = 0; P.bob = 0; P.crouch = 0; P.rock = 0; P.leaf = 0; P.ex = 0; P.eye = 0; P.barb = 0; P.crack = 0; P.tilt = 0;
    P.cloud = 1; P.cdn = 0; P.clag = 0; P.zap = 0; P.fF = 0; P.fB = 0; P.uF = 0; P.uB = 0; P.step = 0; P.bx = 0; P.flash = 0; P.dq = 0; P.rim = 1; P.mx = 0; P.flip = 0;
    const idle = () => {
      const TT = f12 / 12, b = Math.floor(TT * 2.5), SW = [0, 1, 0, -1];
      P.bob = b & 1; P.s0 = SW[(b + 1) & 3]; P.s1 = SW[(b + 2) & 3]; P.s2 = SW[(b + 3) & 3]; P.leaf = SW[Math.floor(TT * 1.25) & 3];   // 三只藤臂错相位晃香蕉串
      const lp = tq % DUR[IDLE]; P.ex = [0, 1, 0, -1][Math.floor(lp / 0.6) & 3]; P.cdn = (Math.floor(lp / 0.4) & 1);                 // 雷云翻滚
      if (lp >= 0.9 && lp < 1.0) P.zap = 1;                                                                                        // 云里闪一下
      if (lp >= 1.6 && lp < 2.0) {                                                                                                 // 待机个性：雷云劈出一道细闪电，塔身嘎吱一晃，眼光抬头看云
        P.ex = -1; P.zap = lp < 1.75 ? 2 : 1; P.rock = lp >= 1.67 && lp < 1.83 ? -1 : 0; P.eye = lp < 1.75 ? 1 : 0;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                                // 根须重踏：粗树根慢步，落脚顿挫，雷云拖后 1 格
      const f = gait(tq); P.fF = W_F[f]; P.fB = W_B[f]; P.uF = W_UF[f]; P.uB = W_UB[f]; P.bob = W_BOB[f]; P.crouch = f === 0 || f === 2 ? 1 : 0; P.rock = W_ROCK[f]; P.step = W_STEP[f];
      P.s0 = -W_ROCK[f]; P.s1 = W_ROCK[f]; P.s2 = -W_ROCK[f]; P.leaf = -W_ROCK[f]; P.clag = -1; P.cdn = f & 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                            // 三只藤臂依次急抡，连投三只
      const f = f12of(tq);
      const SEQ = [[0, 0, 0], [1, 0, 0], [2, 1, 0], [3, 1, 0], [3, 2, 1], [0, 3, 1], [0, 3, 2], [0, 0, 3], [0, 0, 3]];
      const s = SEQ[Math.min(f, SEQ.length - 1)]; armSet(s[0], s[1], s[2]);
      P.t0 = tq >= T_R[0] ? 1 : 0; P.t1 = tq >= T_R[1] ? 1 : 0; P.t2 = tq >= T_R[2] ? 1 : 0;
      P.eye = f >= 1 && f <= 6 ? 1 + ((f & 1) ? 1 : 0) : 0; P.rock = f === 2 || f === 4 || f === 6 ? 1 : f >= 1 && f < 7 ? 0 : 0; P.leaf = f >= 1 && f <= 7 ? -1 : 0; P.clag = f >= 2 && f <= 6 ? 1 : 0;
      if (f >= 9) { P.t0 = P.t1 = P.t2 = 1; }
    } else if (st === CHARGE) {                                                            // 挨两下敌弹：荆棘一根根带电竖起、雷云压低、三只藤臂高举
      const q = clamp01(tq / 0.7); const a = q < 0.3 ? 0 : q < 0.7 ? 4 : 5; armSet(a, a, a); P.crouch = q > 0.3 && q < 0.7 ? 1 : 0; P.rim = 2;
      if ((tq >= T_HIT1 && tq < T_HIT1 + 1 / 12) || (tq >= T_HIT2 && tq < T_HIT2 + 1 / 12)) P.rock = -1;
      P.barb = tq < T_HIT1 ? 0 : tq < T_HIT2 ? 1 : tq < 0.95 ? 2 : 3; P.cdn = tq < 0.5 ? 1 : tq < 0.9 ? 2 : 3; P.zap = tq < 0.6 ? 1 : 1 + (f12 & 1);
      P.eye = tq < T_HIT1 ? 1 : tq < 0.95 ? 1 + (f12 & 1) : 2; P.leaf = tq > 1.0 ? ((f12 & 1) ? 1 : -1) : 0;
    } else if (st === CAST) {                                                              // 荆棘齐射 + 雷云三连劈
      armSet(5, 5, 5); P.barb = tq < 0.25 ? 4 : 3; P.eye = 3; P.rim = 3; P.leaf = -2; P.cdn = 3; P.zap = 2; P.rock = tq < 0.12 ? -1 : 0;
    } else if (st === RECOVER) {                                                           // 荆棘收回，雷云重新升高，余电沿藤流走
      const q = ease.inOut(clamp01(tq / 0.6)); const a = q < 0.4 ? 5 : q < 0.8 ? 3 : 0; armSet(a, a === 3 ? 0 : a, a);
      P.barb = tq < 0.15 ? 3 : tq < 0.3 ? 2 : tq < 0.45 ? 1 : 0; P.cdn = tq < 0.2 ? 3 : tq < 0.4 ? 2 : tq < 0.55 ? 1 : 0; P.zap = tq < 0.3 ? 1 : 0;
      P.eye = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.leaf = q < 0.6 ? -1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { armSet(6, 6, 6); P.bx = -2; P.eye = 4; P.s0 = 1; P.s1 = 1; P.s2 = 1; P.leaf = 2; P.rock = -1; P.barb = 1; P.clag = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { armSet(6, 0, 6); P.bx = -1; P.eye = 4; P.leaf = 1; P.barb = 1; P.rim = 0; }
      else idle();
    } else if (st === DEATH) {                                                             // 上层塔先歪 → 断开向后倒下 → 碎成一地石块
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { armSet(6, 6, 6); P.bx = -2; P.eye = (f12 & 1) ? 1 : 4; P.leaf = 2; P.rock = -1; P.crack = 1; P.clag = 1; P.zap = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
      else {
        armSet(7, 7, 7); P.t0 = P.t1 = P.t2 = 1; P.bx = -2; P.crack = 2; P.crouch = 1; P.cloud = 0; P.leaf = -2; P.eye = d < 0.45 ? ((f12 & 1) ? 1 : 4) : 4;
        P.tilt = d < 0.45 ? 1 : d < 0.6 ? 2 : 3;
        if (d >= T_BREAK - INCOMING) P.dq = 1;                                               // 之后由死亡套件（碎块）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.eye = tq > 0.85 ? 2 : 0;
    }
    P.dq48 = RD(P.dq * 48);
    const yo = P.bob + P.crouch;
    P.gx = 3 + P.ex + P.rock + P.bx; P.gy = -24 + yo;                                      // 发光体 = 上层射孔里的眼光
    KEY(P);
  }

  // ───── 画 ─────
  const bez = (a, c, b, q) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * c + q * q * b;
  // 上层塔的落笔变换：tilt 0 直立 · 1 / 2 从走道那一行往上逐行后歪 · 3 断开后向后倒在地上（按 90° 转，明暗烘焙时重算）
  let TM = 0;
  function tp(x, y) { if (TM === 3) return [y + 8, -x - 8]; if (TM) { const k = TM === 1 ? 5 : 3; return [x - RD(Math.max(0, -17 - y) / k), y + (TM === 2 ? 1 : 0)]; } return [x, y]; }
  const spU = (x, y, m, t) => { const q = tp(x, y); sp(q[0], q[1], m, t); };
  const runU = (y, x0, x1, m, t) => { for (let x = x0; x <= x1; x++) spU(x, y, m, t); };
  // 候选部件：树根腿（粗根柱 + 贴地张开的根须；比玉藤堡垒粗 1 格、根须外扩）
  function rootLeg(hx, hy, fx, up, m) {
    part(); const fy = -up;
    for (let y = hy; y <= fy; y++) { const q = (y - hy) / Math.max(1, fy - hy), c = RD(hx + (fx - hx) * q); for (let x = c - 2; x <= c + 2; x++) sp(x, y, m, 0); if (((y + hx) & 3) === 0) sp(c, y, m, 2); if (((y + hx) & 3) === 2) sp(c - 1, y, m, 2); }
    for (let x = fx - 3; x <= fx + 3; x++) sp(x, fy, m, 0); sp(fx - 4, fy, m, 2); sp(fx + 4, fy, m, 2);
    if (!up) { sp(fx + 5, fy, m, 1); sp(fx - 5, fy, m, 1); sp(fx + 6, fy, m, 1); } else { sp(fx - 3, fy + 1, m, 2); sp(fx + 3, fy + 1, m, 2); }
  }
  // 候选部件：香蕉叶（二次曲线，2 格厚，中脉亮一级，叶尖 1 格）；走上层塔的落笔变换
  function leaf(x0, y0, cx, cy, x1, y1, m) {
    part(); const n = 18;
    for (let k = 0; k <= n; k++) { const q = k / n, x = RD(bez(x0, cx, x1, q)), y = RD(bez(y0, cy, y1, q)); spU(x, y, m, q > 0.3 && q < 0.8 ? 4 : 0); if (q < 0.86) spU(x, y + 1, m, 0); }
  }
  // 候选部件：阶梯雉堞塔（下层宽 19 格 + 走道角垛；上层 15 格 = 玉藤堡垒同款塔身 + 雉堞）
  function lowerTier(X, Y) {
    part();
    for (let x = -10; x <= 10; x++) { sp(X + x, Y - 7, M_ST, 0); sp(X + x, Y - 6, M_ST, 0); }                                  // 塔基
    for (let y = -15; y <= -8; y++) for (let x = -9; x <= 9; x++) sp(X + x, Y + y, M_ST, 0);                                    // 下层塔身
    for (let x = -10; x <= 10; x++) { sp(X + x, Y - 17, M_ST1, 0); sp(X + x, Y - 16, M_ST1, 0); }                              // 走道
    for (const mx of [-10, 9]) for (let y = -19; y <= -18; y++) { sp(X + mx, Y + y, M_ST1, 0); sp(X + mx + 1, Y + y, M_ST1, 0); }   // 走道角垛
    for (let x = -9; x <= 9; x += 2) sp(X + x, Y - 16, M_ST1, 2);
    for (const [my, J] of [[-12, [-4, 3]]]) { for (let x = -8; x <= 8; x++) sp(X + x, Y + my, M_ST, 2); for (const jx of J) { for (let k = 1; k <= 3 && my + k <= -8; k++) sp(X + jx, Y + my + k, M_ST, 2); sp(X + jx + 1, Y + my + 1, M_ST, 4); } }
    if (P.crack) { for (const [x, y] of [[-2, -15], [-1, -14], [0, -14], [-1, -13], [0, -12], [1, -11], [1, -10]]) sp(X + x, Y + y, M_ST, 1); }
    if (P.crack >= 2) for (const [x, y] of [[6, -9], [5, -10], [5, -11], [4, -12], [-6, -9], [-5, -10], [-6, -11], [-7, -14]]) sp(X + x, Y + y, M_ST, 1);
    thornVine(X, Y, [[-10, -8, 10, -11], [-10, -13, 10, -15]], [[-1, -9, 10], [-1, -14, 10], [1, -11, 10], [1, -15, 10], [-1, -17, 11]], [[1, -8, 10], [-1, -11, 10], [1, -13, 10], [-1, -6, 11], [1, -6, 11], [1, -18, 11]], sp);
  }
  function upperTier(X, Y) {
    part();
    for (let y = -29; y <= -20; y++) runU(Y + y, X - 7, X + 7, M_ST, 0);                                                         // 上层塔身
    runU(Y - 31, X - 8, X + 8, M_ST1, 0); runU(Y - 30, X - 8, X + 8, M_ST1, 0);                                                 // 挑檐
    for (const mx of [-8, -3, 2, 7]) for (let y = -34; y <= -32; y++) { spU(X + mx, Y + y, M_ST1, 0); spU(X + mx + 1, Y + y, M_ST1, 0); }   // 同款四垛雉堞
    for (let x = -7; x <= 7; x += 2) spU(X + x, Y - 30, M_ST1, 2);
    for (let x = -6; x <= 6; x++) spU(X + x, Y - 23, M_ST, 2); for (const jx of [-3, 3]) { spU(X + jx, Y - 22, M_ST, 2); spU(X + jx, Y - 21, M_ST, 2); spU(X + jx + 1, Y - 22, M_ST, 4); }
    for (let x = 0; x <= 5; x++) { spU(X + x, Y - 26, M_SLIT, 0); spU(X + x, Y - 25, M_SLIT, 0); }                              // 射孔
    if (P.eye !== 4) { const t = [2, 3, 4, 4][P.eye], ex = X + P.ex; spU(ex + 2, Y - 26, M_EYE, t); spU(ex + 4, Y - 26, M_EYE, t); if (P.eye >= 2) { spU(ex + 2, Y - 25, M_EYE, 2); spU(ex + 4, Y - 25, M_EYE, 2); } if (P.eye === 3) spU(ex + 3, Y - 26, M_EYE, 3); }
    if (P.crack) for (const [x, y] of [[-4, -29], [-3, -28], [-3, -27], [-2, -26], [-2, -25], [-1, -24], [-2, -23], [-1, -22], [0, -21], [0, -20]]) spU(X + x, Y + y, M_ST, 1);
    thornVine(X, Y, [[-8, -21, 8, -24], [-8, -27, -2, -29]], [[-1, -23, 8], [-1, -28, 8], [1, -22, 8], [1, -27, 8]], [[-1, -25, 8], [1, -25, 8], [-1, -32, 9], [1, -32, 9], [1, -29, 8]], spU);
  }
  // 候选部件：带电荆棘藤（藤条 2 格厚、每 3 格一根刺；外沿荆棘 2–3 格长、刺尖电蓝，barb 档位越高越长越亮）——和塔身同一个部件，不压分界线
  function thornVine(X, Y, segs, edge, edge2, put1) {
    for (const [x0, y0, x1, y1] of segs) { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) { const x = RD(x0 + (x1 - x0) * k / n), y = RD(y0 + (y1 - y0) * k / n); put1(X + x, Y + y, M_VINE, 0); put1(X + x, Y + y + 1, M_VINE, 0); if (k % 3 === 1) { put1(X + x, Y + y - 1, M_THORN, 3); if (P.barb >= 2) put1(X + x, Y + y - 2, M_ZAP, 2); } } }
    const L = 2 + Math.min(P.barb, 3);
    const spike = (side, y, hw, lit) => { for (let i = 1; i <= L; i++) put1(X + side * (hw + i), Y + y - (i >> 1), i === L ? M_ZAP : M_THORN, i === L ? (lit ? 4 : 2) : 3); };
    edge.forEach(([s, y, hw], i) => spike(s, y, hw, P.barb > 0 && i < P.barb * 3));
    if (P.barb >= 2) for (const [s, y, hw] of edge2) spike(s, y, hw, P.barb >= 3);
  }
  // 候选部件：卷物藤臂（肩点 → 末端的二次曲线，2 格厚，顶上几根刺；末端卷一圈）
  function vineArm(sx, sy, hx, hy, bend, m) {
    part();
    const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1, cx = (sx + hx) / 2 + (dy / L) * bend, cy = (sy + hy) / 2 - (dx / L) * bend, n = Math.ceil(L * 1.6), d = hx >= sx ? 1 : -1;
    for (let k = 0; k <= n; k++) { const q = k / n, x = RD(bez(sx, cx, hx, q)), y = RD(bez(sy, cy, hy, q)); sp(x, y, m, 0); sp(x, y + 1, m, 0); if (k % 6 === 3 && k < n - 3) sp(x, y - 1, M_THORN, 3); }
    sp(hx + d, hy - 1, m, 0); sp(hx + 2 * d, hy - 1, m, 0); sp(hx + 2 * d, hy, m, 0);
  }
  // 候选部件：香蕉串（同玉藤堡垒：果冠 + nb 根扇形散开的香蕉，尖端褐色、外侧两根上翘）
  const FING = [
    [[-1, 1, 4], [-2, 2, 4], [-2, 3, 3], [-3, 3, 4], [-3, 4, 3], [-4, 4, 1]],
    [[0, 1, 3], [-1, 2, 3], [-1, 3, 4], [-1, 4, 3], [-2, 5, 1]],
    [[1, 1, 4], [1, 2, 4], [1, 3, 3], [2, 4, 4], [2, 5, 1]],
    [[2, 1, 3], [3, 2, 4], [3, 3, 3], [4, 3, 4], [4, 4, 3], [5, 4, 1]],
  ];
  function bunch(ax, ay, nb) { part(); sp(ax, ay - 1, M_ROOT, 3); for (let x = ax - 1; x <= ax + 2; x++) sp(x, ay, M_BAN, 2); for (let k = 0; k < nb; k++) for (const [dx, dy, t] of FING[k]) sp(ax + dx, ay + dy, M_BAN, t); }
  function arm(i, X, Y) {
    const A = ARM[i], ph = A.p[P['a' + i]], s = P['s' + i], nb = P['t' + i] ? 3 : 4;
    const sx = X + A.sh[0], sy = Y + A.sh[1], hx = ph[0] + X + s, hy = ph[1] + Y;
    vineArm(sx, sy, hx, hy, ph[2], A.far === 2 ? M_VINE_D : M_VINE);
    if (P.st !== DEATH || P.tilt === 0) bunch(hx + (hx >= sx ? 1 : -2), hy + 2, nb);
  }
  // 候选部件：雷云（椭圆底 + 三个翻滚的云包，底部平；zap 1 = 云肚里电光，2 = 再劈出一道细闪电）
  function cloud(cx, cy) {
    part(); const ch = P.cdn & 1;
    for (let j = -2; j <= 1; j++) for (let i = -6; i <= 6; i++) if ((i * i) / 42 + (j * j) / 4.5 <= 1) sp(cx + i, cy + j, M_CLOUD, 0);
    for (const [bx, by, r] of [[-3 + ch, -2, 2], [1, -3 + ch, 2], [4 - ch, -2, 1.7]]) for (let j = -3; j <= 3; j++) for (let i = -3; i <= 3; i++) if (i * i + j * j <= r * r + 0.35 && cy + by + j <= cy) sp(cx + bx + i, cy + by + j, M_CLOUD, 0);
    for (let i = -5; i <= 5; i += 3) sp(cx + i + ch, cy + 1, M_CLOUD, 2);
    if (P.zap >= 1) { sp(cx - 1, cy, M_ZAP, 3); sp(cx + 2, cy - 1, M_ZAP, 2); sp(cx - 3, cy - 1, M_ZAP, 2); }
    if (P.zap >= 2) { sp(cx, cy, M_ZAP, 4); for (const [x, y] of [[0, 2], [1, 3], [1, 4], [0, 5], [2, 4]]) sp(cx + x, cy + y, M_ZAP, y === 2 ? 4 : 3); }
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0);
    const yo = P.bob + P.crouch, X = P.rock, Y = yo, lf = P.leaf;
    TM = P.tilt;
    leaf(X - 1, Y - 29, X - 3, Y - 38, X - 9 + lf, Y - 33, M_LEAF_D);                                   // 远侧叶
    TM = 0;
    if (P.tilt < 3) arm(1, X, Y);                                                                          // 背后那只（举过顶）
    arm(2, X, Y);                                                                                          // 左侧远的那只
    rootLeg(-5, Y - 6, -5 + P.fB, P.uB, M_ROOT_D);
    rootLeg(4, Y - 6, 4 + P.fF, P.uF, M_ROOT);
    TM = P.tilt;
    leaf(X, Y - 29, X + 1, Y - 35, X + 1 + lf, Y - 37, M_LEAF);
    leaf(X + 1, Y - 29, X + 4, Y - 38, X + 10 + lf, Y - 33, M_LEAF);
    TM = 0; lowerTier(X, Y);
    TM = P.tilt; upperTier(X, Y + 2); TM = 0;                                              // 上层整体比坐标表低 2 格（压在走道上）
    arm(0, X, Y);
    if (P.cloud) cloud(1 + P.clag + X, -40 + P.cdn + (P.bob & 1));
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const PJN = 16, pjOn = new Uint8Array(PJN), pjK = new Uint8Array(PJN), pjX = new Float32Array(PJN), pjY = new Float32Array(PJN), pjVX = new Float32Array(PJN), pjVY = new Float32Array(PJN),
    pjG = new Float32Array(PJN), pjAge = new Float32Array(PJN), pjT = new Float32Array(PJN), pjRot = new Uint8Array(PJN), pjB = new Uint8Array(PJN);
  function launch(k, x, y, vx, vy, g, tArr) { let i = 0; for (; i < PJN - 1 && pjOn[i]; i++); pjOn[i] = 1; pjK[i] = k; pjX[i] = x; pjY[i] = y; pjVX[i] = vx; pjVY[i] = vy; pjG[i] = g; pjAge[i] = 0; pjT[i] = tArr; pjRot[i] = 0; pjB[i] = 0; return i; }
  const STK = 10, stX = new Float32Array(STK), stY = new Float32Array(STK); let stN = 0, stT = 9;
  let chargeAcc = 0, soulAcc = 0, sparkAcc = 0, lastStep = 0, boltN = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y, cloudPt = () => [wx(1), wy(-40 + 3)];
  const handOf = (i, ph) => { const p = ARM[i].p[ph]; return [wx(p[0] + P.rock + (p[0] >= ARM[i].sh[0] ? 1 : -2)), wy(p[1] + P.bob + P.crouch + 3)]; };
  function strike(n) {                                                                     // 雷云劈向假人（三下各一道）
    const [cx, cy] = cloudPt(), tx = DUMMY_X - 1, ty = HY - 20 + n * 3;
    fx.bolt(cx + 2, cy + 2, tx, ty, R_EL, 0.25, 2, 11 + n * 7); fx.cross(tx, ty, 5 + n, R_EL, 0.25); burst(tx, ty, 10, 40, 110, 0.15, 0.4, R_EL, 8);
    hitDummy(n === 2 ? 1 : 0); sfx('impact', { pal: 'bolt', w: n === 2 ? 1.0 : 0.7 });
    if (n === 2) { dummyFx({ dur: 1.1, stun: 1, outline: 'bolt' }); shake(0.12, 1); }
  }
  function onEnter(s) {
    if (s !== CAST) return;
    const ox = wx(10), oy = wy(-20);
    releaseOrbit(30, 80, 0.3, 0.6, { pts: 1, up: 6 });
    for (let i = 0; i < 8; i++) { const ty = wy(-30 + i * 3), tx = DUMMY_X - 4 + (i & 1), T = 0.2; launch(2, ox, oy + (i - 4), (tx - ox) / T, (ty - oy - (i - 4)) / T, 0, T); }   // 一大扇 8 根带电刺弹
    for (const y of [-9, -14, -23, -28]) { burst(wx(-12), wy(y), 3, 20, 50, 0.2, 0.4, R_NAT, 4); burst(wx(12), wy(y), 3, 20, 50, 0.2, 0.4, R_EL, 4); }
    fx.cross(ox, oy, 7, R_EL, 0.3); ring(ox, oy, 1, R_EL); boltN = 0; strike(0);
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'arrow' });
  }
  function onTime(s, t) {
    if (s === ATTACK) for (let i = 0; i < 3; i++) if (Math.abs(t - T_R[i]) < 1e-9) {    // 第 i 只藤臂抡出
      const [x, y] = handOf(i, 2), tx = DUMMY_X - 2, ty = HY - 16 + i * 2, g = 240;
      launch(1, x, y, (tx - x) / T_FLY, (ty - y - 0.5 * g * T_FLY * T_FLY) / T_FLY, g, T_FLY);
      sfx('swing', { kind: 'throw', w: 0.6 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === CHARGE) for (const th of [T_HIT1, T_HIT2]) {
      if (Math.abs(t - (th - 0.25)) < 1e-9) { const tx = wx(10); shoot(3, tx + 300 * 0.25, HY - 14 - (th === T_HIT2 ? 8 : 0), -300, tx, FXI.enemy); }   // 敌弹飞来
      if (Math.abs(t - th) < 1e-9) { const x = wx(10), y = HY - 14 - (th === T_HIT2 ? 8 : 0); burst(x, y, 10, 30, 80, 0.15, 0.35, FXI.enemy, 6); burst(x, y, 6, 20, 60, 0.2, 0.4, R_EL, 6); fx.cross(x, y, 3, R_EL, 0.15); shake(0.1, 1); sfx('hit', { mat: 'stone', w: 0.6 }); }
    }
    if (s === CAST && (Math.abs(t - 1 / 12) < 1e-9 || Math.abs(t - 2 / 12) < 1e-9)) strike(t < 0.1 ? 1 : 2);   // 第二、三道闪电（间隔 1 帧）
    if (s === DEATH && Math.abs(t - T_TOP) < 1e-9) {                                        // 雷云散成雨丝和最后一道闪电，三串香蕉甩飞
      const [cx, cy] = cloudPt(); fx.cloud(cx, cy - 3, 7, FXI.steel, 0.9, 2); fx.bolt(cx, cy, cx + 6, HY, R_EL, 0.3, 2, 5); flash(0.03);
      for (let i = 0; i < 18; i++) fall(cx - 7 + Math.random() * 14, cy - 2 + Math.random() * 4, -6 + Math.random() * 4, 20 + Math.random() * 30, HY, FXI.water, 1);
      const V = [[30, -70], [-28, -80], [-40, -55]]; for (let i = 0; i < 3; i++) { const [x, y] = handOf(i, 6); launch(3, x, y, V[i][0], V[i][1], 300, 99); }
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 18; i++) spawn(K_DUST, HX - 28 + Math.random() * 22, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.16, 1); sfx('fall', { w: 1.0 }); }
    if (s === DEATH && Math.abs(t - T_BREAK) < 1e-9) {                                      // 倒下的塔化成碎石（死亡套件 chunks）
      poseAt(DEATH, T_BREAK - 1 / 12, T_BREAK - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 4, power: 0.35, fromX: -4, fromY: -8, fadeAt: 0.95, fadeDur: 0.6 });
      shake(0.12, 1); burst(wx(-6), wy(-8), 16, 30, 70, 0.3, 0.6, FXI.dust, 16);
    }
  }
  const EVENTS = [[], [], T_R.slice(), [T_HIT1 - 0.25, T_HIT1, T_HIT2 - 0.25, T_HIT2], [1 / 12, 2 / 12], [], [], [T_TOP, T_LAND, T_BREAK], []];
  function hurtFx(s) {                                                                     // 石塔受击：火花 + 碎石 + 几点电火花
    const hx = HX + 1, hy = HY - 20; burst(hx, hy, s === DEATH ? 22 : 14, 50, 130, 0.25, 0.55, R_IMP, 20); burst(hx, hy, s === DEATH ? 12 : 8, 30, 80, 0.3, 0.6, FXI.dust, 12);
    burst(hx + 8, hy, 5, 30, 70, 0.15, 0.3, R_EL, 6); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, t) {
    if (state === CHARGE && t >= T_HIT1) {                                                  // 云里电光螺旋汇聚
      chargeAcc += dt * (24 + 34 * clamp01((t - T_HIT1) / 0.9)); const [cx, cy] = cloudPt();
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 10 + Math.random() * 9; spawn(K_SPIRAL_PT, cx, cy - 2 + P.cdn, r / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 6 + Math.random() * 3); }
    }
    if (state === RECOVER && t < 0.55) { sparkAcc += dt * 18; while (sparkAcc >= 1) { sparkAcc -= 1; const sd = Math.random() < 0.5 ? -1 : 1, y = -8 - Math.random() * 22; spawn(K_EMBER, wx(sd * (y < -19 ? 9 : 11)), wy(y), sd * 6, 10 + Math.random() * 10, 0.3 + Math.random() * 0.2, R_EL); } }   // 余电沿藤噼啪流走
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 1.0 }); const fx0 = wx(P.step > 0 ? 4 + W_F[0] : -5 + W_B[2]); for (let i = 0; i < 4; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 26, -5 - Math.random() * 9, 0.35 + Math.random() * 0.25, FXI.dust); spawnX(K_PHYS, fx0, HY - 1, (Math.random() - 0.5) * 20, -24, 0.5, FXI.earth, { g: 160, floor: HY }); }
      lastStep = P.step;
    }
    if (state === DEATH && t > INCOMING + 1.6 && t < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < PJN; i++) {
      if (!pjOn[i]) continue; pjAge[i] += dt; const k = pjK[i];
      pjVY[i] += pjG[i] * dt; pjX[i] += pjVX[i] * dt; pjY[i] += pjVY[i] * dt;
      if (k === 1) { if (((pjAge[i] * 60) | 0) % 3 === 0) spawn(K_TRAIL, pjX[i] - 2, pjY[i], -10, 0, 0.18, FXI.coin); pjRot[i] = ((pjAge[i] * 16) | 0) & 3; }
      if (k === 2 && ((pjAge[i] * 60) | 0) % 2 === 0) spawn(K_TRAIL, pjX[i] - 3, pjY[i], -14, 0, 0.15, R_EL);
      if ((k === 1 || k === 2) && pjAge[i] >= pjT[i]) {
        pjOn[i] = 0; const x = pjX[i], y = pjY[i];
        if (k === 1) { burst(x, y, 8, 30, 80, 0.15, 0.35, R_IMP, 10); burst(x, y, 6, 20, 60, 0.25, 0.45, FXI.coin, 14); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.45 }); }
        else { if (stN < STK) { stX[stN] = x; stY[stN] = y; stN++; } stT = 0; burst(x, y, 4, 30, 70, 0.15, 0.35, R_NAT, 6); burst(x, y, 3, 20, 60, 0.1, 0.25, R_EL, 4); }
      }
      if (k === 3) {                                                                       // 甩飞的香蕉串：落地弹一下，滚几圈停下
        if (pjY[i] >= HY - 2 && pjVY[i] > 0) { pjY[i] = HY - 2; if (pjB[i] < 1) { pjVY[i] *= -0.35; pjVX[i] *= 0.8; pjB[i]++; } else { pjVY[i] = 0; pjG[i] = 0; pjVX[i] *= Math.pow(0.12, dt); } }
        if (Math.abs(pjVX[i]) > 3) pjRot[i] = ((pjAge[i] * 11) | 0) & 3; else pjVX[i] = 0;
        if (pjAge[i] > 2.4) pjOn[i] = 0;
      }
    }
    stT += dt;
  }
  function fxReset() { pjOn.fill(0); stN = 0; stT = 9; chargeAcc = 0; soulAcc = 0; sparkAcc = 0; lastStep = 0; boltN = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  const BAN = [[[-1, -1, 47], [-1, 0, 51], [0, 1, 47], [1, 1, 14], [2, 0, 20]], [[1, -1, 47], [0, -1, 51], [-1, 0, 47], [-1, 1, 14], [0, 2, 20]], [[1, 1, 47], [1, 0, 51], [0, -1, 47], [-1, -1, 14], [-2, 0, 20]], [[-1, 1, 47], [0, 1, 51], [1, 0, 47], [1, -1, 14], [0, -2, 20]]];
  const BUN = [[0, -2, 19], [-1, -1, 14], [0, -1, 14], [1, -1, 14], [-2, 0, 51], [-1, 0, 47], [0, 0, 51], [1, 0, 47], [-2, 1, 51], [-1, 1, 47], [0, 1, 51], [1, 1, 47], [2, 1, 20], [-3, 2, 20], [-1, 2, 47], [0, 2, 51], [1, 2, 20], [-1, 3, 20], [0, 3, 20]];
  const rot = (x, y, r) => (r === 0 ? [x, y] : r === 1 ? [-y, x] : r === 2 ? [-x, -y] : [y, -x]);
  function fxFront(f12) {
    for (let i = 0; i < PJN; i++) {
      if (!pjOn[i]) continue; const x = RD(pjX[i]), y = RD(pjY[i]), k = pjK[i];
      if (k === 1) for (const [dx, dy, c] of BAN[pjRot[i]]) put(x + dx, y + dy, c);
      else if (k === 2) { const l = Math.hypot(pjVX[i], pjVY[i]) || 1, ux = pjVX[i] / l, uy = pjVY[i] / l; put(x, y, 21); put(RD(x - ux), RD(y - uy), 22); put(RD(x - 2 * ux), RD(y - 2 * uy), 36); put(RD(x - 3 * ux), RD(y - 3 * uy), 35); }
      else if (k === 3) { const fade = clamp01((pjAge[i] - 1.8) / 0.5); for (const [dx, dy, c] of BUN) { const r = rot(dx, dy, pjRot[i]); if (fade > 0 && B8[((r[1] + 64) & 7) * 8 + ((r[0] + 64) & 7)] < fade) continue; put(x + r[0], y + r[1], c); } }
    }
    if (stT < 0.8) for (let i = 0; i < stN; i++) {                                          // 刺钉满一排，冒电火花
      if (stT > 0.5 && ((i + f12) & 1)) continue; const x = RD(stX[i]), y = RD(stY[i]); put(x, y, 35); put(x - 1, y, 36); put(x - 2, y, 36); put(x - 3, y, stT < 0.2 ? 21 : 22);
      if (((i + f12) % 3) === 0 && stT < 0.5) put(x + 1, y - 1, EL[(f12 >> 1) & 1 ? 1 : 2]);
    }
    if (P.eye >= 2 && P.eye <= 3 && P.dq < 1 && P.tilt === 0) {
      const gx = wx(P.gx), gy = wy(P.gy), L = P.eye === 3 ? 4 : 1 + (f12 & 1);
      for (let r = 2; r <= L + 1; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + 1, gy - r, c); put(gx + 1, gy + r + 1, c); put(gx + r + 2, gy, c); }
    }
  }

  return {
    name: '风暴堡垒', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EYE, M_ZAP], HIT_POINT: [3, -20], EVENTS,
    deathKit: { mode: 'chunks', at: T_BREAK },
    SFX: { body: 'stone', how: 'topple', pal: 'bolt', style: 'bolt', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
