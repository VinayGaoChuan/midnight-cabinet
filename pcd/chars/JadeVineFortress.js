// 玉藤堡垒（精灵 · 先锋 · 史诗）：长在两条树根腿上的藤缠玉石小塔楼。塔顶一圈雉堞 + 一簇香蕉叶、塔身缠满带倒刺的深绿藤蔓、
// 右侧一只长藤臂卷着一串黄香蕉；攻击 = 藤臂后甩再抡出，抛物线投一只香蕉；技能 = 特性「倒刺」（受到攻击时反弹伤害）：
// 敌弹打在藤甲上，倒刺一根根竖起，再一齐迸射成扇形绿刺弹钉回假人。死亡 = 塔身裂开、玉石砖碎成小块落地成堆（死亡套件 chunks），香蕉串滚出。
// 身体不用现成骨架：树根双足、方塔、藤蔓、藤臂、香蕉串、香蕉叶都是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('JadeVineFortress', (E) => {
  const { defMat, Sprite, begin, part, sp, run, rect, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_BURST, K_PHYS, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx, B8 } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const JADE = E.ramp([34, '#23594b', '#3b8b71', '#78c7a2']);           // 玉青石：勾线借共享深绿，暗 / 基 / 亮是本角色的青绿玉色
  const M_JADE = defMat(JADE, 2), M_JADE1 = defMat(JADE, 1);             // 塔身（大面积 band 2）/ 雉堞与挑檐（小块 band 1）
  const M_VINE = defMat('moss', 1), M_BARB = defMat('bone', 1);          // 深绿藤蔓 / 骨白倒刺
  const M_LEAF = defMat('green', 1), M_LEAF_D = defMat('green', 1, 0, 1); // 香蕉叶（远侧那片暗一级）
  const M_ROOT = defMat('wood', 1), M_ROOT_D = defMat('wood', 1, 0, 1);  // 树根腿（远侧暗一级）
  const M_BAN = defMat([20, 14, 47, 51], 1);                             // 香蕉：褐尖 / 金 / 黄 / 淡黄
  const M_SLIT = defMat('ink', 1, 1), M_EYE = defMat([36, 37, 38, 21], 1, 1);   // 射孔 / 眼光（发光体，按档位直接写色调）
  const R_EL = FXI.nature, EL = FXR[R_EL], R_IMP = FXI.impact, HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(58, 50, 27, 45);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 9, 12], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  RIM.skip[M_BAN] = RIM.skip[M_ROOT] = RIM.skip[M_ROOT_D] = RIM.skip[M_EYE] = RIM.skip[M_SLIT] = RIM.skip[M_BARB] = 1;

  // ───── 姿势 ─────
  // hx / hy：藤臂末端（卷香蕉串的地方，本地坐标，不含塔身摇晃）；bend：藤臂弯度（正 = 向上拱）
  const P = { hx: 0, hy: 0, bend: 0, bob: 0, crouch: 0, rock: 0, sway: 0, leaf: 0, nb: 4, pick: 0, ex: 0, eye: 0, barb: 0, crack: 0, droop: 0,
    fF: 0, fB: 0, uF: 0, uB: 0, step: 0, bx: 0, flash: 0, dq: 0, dq48: 0, rim: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['hx', -4, 24], ['hy', -40, 0], ['bend', -5, 5], ['bob', 0, 1], ['crouch', 0, 3], ['rock', -1, 1], ['sway', -2, 2], ['leaf', -2, 2],
    ['nb', 0, 4], ['pick', 0, 1], ['ex', -1, 1], ['eye', 0, 4], ['barb', 0, 4], ['crack', 0, 2], ['droop', 0, 2], ['fF', -3, 3], ['fB', -3, 3], ['uF', 0, 2], ['uB', 0, 2],
    ['bx', -4, 8], ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  const K_IDLE = { hx: 14, hy: -14, bend: 2 }, K_PEEK = { hx: 11, hy: -18, bend: 2 };
  const K_WIND = { hx: 4, hy: -31, bend: -4 }, K_FLING = { hx: 19, hy: -24, bend: 3 }, K_HOLD = { hx: 17, hy: -19, bend: 2 };
  const K_BRACE = { hx: 11, hy: -11, bend: 1 }, K_CAST = { hx: 17, hy: -27, bend: 4 }, K_HURT = { hx: 11, hy: -10, bend: -2 }, K_DROOP = { hx: 12, hy: -4, bend: -3 };
  const FIELDS = ['hx', 'hy', 'bend'], mixK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const T_REL = 2 / 12, T_HIT = 0.45, T_DROP = INCOMING + 0.3, T_BREAK = INCOMING + 0.66, T_LAND = T_BREAK + 0.25;
  const W_F = [2, 0, -2, 1], W_B = [-2, 1, 2, 0], W_UF = [0, 0, 0, 2], W_UB = [0, 2, 0, 0], W_BOB = [1, 0, 1, 0], W_ROCK = [-1, 0, 1, 0], W_STEP = [1, 0, -1, 0];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.bob = 0; P.crouch = 0; P.rock = 0; P.sway = 0; P.leaf = 0; P.nb = 4; P.pick = 0; P.ex = 0; P.eye = 0; P.barb = 0; P.crack = 0; P.droop = 0;
    P.fF = 0; P.fB = 0; P.uF = 0; P.uB = 0; P.step = 0; P.bx = 0; P.flash = 0; P.dq = 0; P.rim = 1; P.mx = 0; P.flip = 0;
    const idle = () => {
      mixK(K_IDLE, K_IDLE, 0); const TT = f12 / 12, b = Math.floor(TT * 2.5);
      P.bob = b & 1; P.sway = [0, 1, 0, -1][(b + 1) & 3]; P.leaf = [0, 1, 0, -1][Math.floor(TT * 1.25) & 3];
      const lp = tq % DUR[IDLE]; P.ex = [0, 1, 0, -1][Math.floor(lp / 0.6) & 3];          // 射孔里的眼光左右扫
      if (lp >= 1.6 && lp < 2.0) {                                                         // 待机个性：把香蕉串举到射孔前，掰下一根看看，又插回去
        mixK(K_PEEK, K_PEEK, 0); P.sway = 0; P.ex = 1;
        if (lp >= 1.75 && lp < 1.92) { P.pick = 1; P.nb = 3; P.eye = 1; }
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                                // 根须蹒跚：两条树根腿一拖一顿，塔身左右摇
      mixK(K_IDLE, K_IDLE, 0); const f = gait(tq);
      P.fF = W_F[f]; P.fB = W_B[f]; P.uF = W_UF[f]; P.uB = W_UB[f]; P.bob = W_BOB[f]; P.rock = W_ROCK[f]; P.step = W_STEP[f];
      P.sway = -W_ROCK[f]; P.leaf = -W_ROCK[f]; P.hx += W_ROCK[f];
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                            // 藤臂后甩 → 抡出（投出一只）→ 延续 → 收回
      if (tq < 0.12) { mixK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.sway = 1; P.leaf = 1; P.eye = 1; P.rock = -1; }
      else if (tq < 0.2) { mixK(K_FLING, K_FLING, 0); P.sway = -2; P.leaf = -2; P.eye = 2; P.nb = 3; P.rock = 1; }
      else if (tq < 0.45) { mixK(K_FLING, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.sway = -1; P.leaf = -1; P.eye = 1; P.nb = 3; }
      else { mixK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.nb = 3; P.leaf = tq < 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                                            // 缩起藤臂挨打：敌弹命中后倒刺一根根竖起
      const q = ease.inOut(clamp01(tq / 0.7)); mixK(K_IDLE, K_BRACE, q); P.crouch = q > 0.5 ? 1 : 0; P.rim = 2;
      if (tq >= T_HIT && tq < T_HIT + 1 / 12) { P.rock = -1; P.sway = 2; }
      P.barb = tq < T_HIT ? 0 : tq < 0.7 ? 1 : tq < 0.95 ? 2 : 3;
      P.eye = tq < T_HIT ? 1 : tq < 0.95 ? 1 + (f12 & 1) : 2; P.leaf = tq > 1.0 ? ((f12 & 1) ? 1 : 0) : 0;
    } else if (st === CAST) {                                                              // 倒刺齐射：塔身挺直、藤臂甩开
      mixK(K_BRACE, K_CAST, ease.out(clamp01(tq / 0.12))); P.barb = tq < 0.25 ? 4 : 3; P.eye = 3; P.rim = 3; P.sway = -2; P.leaf = -2; P.rock = tq < 0.12 ? -1 : 0;
    } else if (st === RECOVER) {                                                           // 倒刺缓缓收回藤里
      const q = ease.inOut(clamp01(tq / 0.6)); mixK(K_CAST, K_IDLE, q); P.barb = tq < 0.15 ? 3 : tq < 0.3 ? 2 : tq < 0.45 ? 1 : 0;
      P.eye = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.leaf = q < 0.6 ? -1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixK(K_HURT, K_HURT, 0); P.bx = -2; P.eye = 4; P.sway = 2; P.leaf = 2; P.rock = -1; P.barb = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { mixK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eye = 4; P.sway = 1; P.leaf = 1; P.barb = 1; P.rim = 0; }
      else mixK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                                             // 裂纹 → 塔身下坐、藤臂垂下、香蕉串掉落 → 碎成一地玉块
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { mixK(K_HURT, K_HURT, 0); P.bx = -2; P.eye = (f12 & 1) ? 1 : 4; P.sway = 2; P.leaf = 2; P.rock = -1; P.crack = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
      else {
        mixK(K_DROOP, K_DROOP, 0); P.bx = -2; P.crack = 2; P.crouch = 2; P.nb = 0; P.droop = d < 0.45 ? 1 : 2; P.leaf = -2; P.sway = 1;
        P.eye = d < 0.5 ? ((f12 & 1) ? 1 : 4) : 4;
        if (d >= T_BREAK - INCOMING) P.dq = 1;                                               // 之后由死亡套件（碎块）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.eye = tq > 0.85 ? 2 : 0;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bend = RD(P.bend); P.dq48 = RD(P.dq * 48);
    const yo = P.bob + P.crouch;
    P.gx = 3 + P.ex + P.rock + P.bx; P.gy = -21 + yo;                                      // 发光体 = 射孔里的眼光
    KEY(P);
  }

  // ───── 画（部件从后往前：远侧叶 → 远侧根腿 → 近侧根腿 → 叶 → 塔身 → 藤蔓与倒刺 → 藤臂 → 香蕉串）─────
  const bez = (a, c, b, q) => (1 - q) * (1 - q) * a + 2 * (1 - q) * q * c + q * q * b;
  // 候选部件：树根腿（粗根柱 + 贴地张开的根须；hx 胯列、hy 胯行、fx 落脚列、up 抬起格数）
  function rootLeg(hx, hy, fx, up, m) {
    part(); const fy = -up;
    for (let y = hy; y <= fy; y++) { const q = (y - hy) / Math.max(1, fy - hy), c = RD(hx + (fx - hx) * q); run(y, c - 1, c + 2, m, 0); if (((y + hx) & 3) === 0) sp(c, y, m, 2); }
    run(fy, fx - 2, fx + 3, m, 0); sp(fx - 3, fy, m, 2); sp(fx + 4, fy, m, 2);           // 根须向两边张开
    if (!up) { sp(fx + 5, fy, m, 1); sp(fx - 4, fy, m, 1); } else { sp(fx - 2, fy + 1, m, 2); sp(fx + 3, fy + 1, m, 2); }   // 着地时须尖贴地，抬起时须尖下垂
  }
  // 候选部件：香蕉叶（二次曲线，2 格厚，中脉亮一级，叶尖 1 格）
  function leaf(x0, y0, cx, cy, x1, y1, m) {
    part(); const n = 18;
    for (let k = 0; k <= n; k++) { const q = k / n, x = RD(bez(x0, cx, x1, q)), y = RD(bez(y0, cy, y1, q)); sp(x, y, m, q > 0.3 && q < 0.8 ? 4 : 0); if (q < 0.86) sp(x, y + 1, m, 0); }
  }
  // 候选部件：雉堞方塔（x0..x1 塔身列、yTop 塔身顶行、yBot 塔身底行；merl = 垛口列表；塔基 + 挑檐各宽出 1 格）
  function tower(X, Y) {
    part();
    run(Y - 7, X - 8, X + 8, M_JADE, 0); run(Y - 6, X - 8, X + 8, M_JADE, 0);                               // 塔基
    for (let y = -23; y <= -8; y++) run(Y + y, X - 7, X + 7, M_JADE, 0);                                   // 塔身
    run(Y - 25, X - 8, X + 8, M_JADE1, 0); run(Y - 24, X - 8, X + 8, M_JADE1, 0);                          // 挑檐
    for (const mx of [-8, -3, 2, 7]) rect(X + mx, Y - 28, 2, 3, M_JADE1, 0);                                // 四个垛口，垛缝 3 格
    for (let x = -7; x <= 7; x += 2) sp(X + x, Y - 24, M_JADE1, 2);                                          // 挑檐下的落石孔
    const COURSES = [[-12, [-3, 3]], [-17, [0, -5, 5]], [-22, [-3, 3]]];                                   // 砖缝：灰缝行 + 错缝竖缝
    for (const [my, joints] of COURSES) {
      for (let x = -6; x <= 6; x++) sp(X + x, Y + my, M_JADE, 2);
      for (const jx of joints) for (let k = 1; k <= 4 && my + k <= -8; k++) sp(X + jx, Y + my + k, M_JADE, 2);
      for (const jx of joints) sp(X + jx + 1, Y + my + 1, M_JADE, 4);                                     // 每块砖左上角一格玉光
    }
    for (let x = 0; x <= 5; x++) { sp(X + x, Y - 21, M_SLIT, 0); sp(X + x, Y - 20, M_SLIT, 0); }            // 射孔
    if (P.eye !== 4) {                                                                                      // 眼光：0 待机 · 1 蓄力 · 2 蓄满 · 3 施放（4 熄灭）
      const t = [2, 3, 4, 4][P.eye], ex = X + P.ex;
      sp(ex + 2, Y - 21, M_EYE, t); sp(ex + 4, Y - 21, M_EYE, t);
      if (P.eye >= 2) { sp(ex + 2, Y - 20, M_EYE, 2); sp(ex + 4, Y - 20, M_EYE, 2); }
      if (P.eye === 3) { sp(ex + 3, Y - 21, M_EYE, 3); }
    }
    if (P.crack) {                                                                                          // 死亡裂纹
      const C1 = [[-3, -23], [-2, -22], [-2, -21], [-1, -20], [-1, -19], [0, -18], [-1, -17], [0, -16], [1, -15], [1, -14], [2, -13]];
      const C2 = [[5, -9], [4, -10], [4, -11], [3, -12], [-5, -9], [-4, -10], [-5, -11], [-4, -12], [-6, -14], [6, -21], [5, -22], [5, -23]];
      for (let i = 0; i < (P.crack >= 2 ? C1.length : 5); i++) sp(X + C1[i][0], Y + C1[i][1], M_JADE, 1);
      if (P.crack >= 2) for (const [x, y] of C2) sp(X + x, Y + y, M_JADE, 1);
    }
  }
  // 候选部件：带倒刺的缠藤（斜着缠过塔身的藤条 2 格厚、顶上每 3 格一根小刺；两侧外沿伸出轮廓的倒刺，长度随 barb 档位 1 → 5 格）
  const EDGE = [[-1, -9], [-1, -16], [-1, -22], [1, -13], [1, -19], [1, -10], [-1, -12], [1, -23]];
  const EDGE2 = [[-1, -19], [1, -16], [-1, -6], [1, -6], [-1, -26], [1, -26]];
  function vines(X, Y) {                                                                    // 和塔身同一个部件：藤和玉石之间是明暗边，不压分界线
    const seg = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let k = 0; k <= n; k++) { const x = RD(x0 + (x1 - x0) * k / n), y = RD(y0 + (y1 - y0) * k / n); sp(X + x, Y + y, M_VINE, 0); sp(X + x, Y + y + 1, M_VINE, 0); if (k % 3 === 1) sp(X + x, Y + y - 1, M_BARB, P.barb >= 2 ? 4 : 3); } };
    seg(-8, -8, 8, -13); seg(-8, -15, 8, -19); seg(-8, -21, -2, -23); seg(3, -9, 8, -7);
    const L = 1 + Math.min(P.barb, 3) + (P.barb >= 4 ? 1 : 0);
    const barb = (side, y) => { const bx = side < 0 ? -8 : 8; for (let i = 1; i <= L; i++) sp(X + bx + side * i, Y + y - (i >> 1), M_BARB, i === L ? 4 : 3); };
    for (const [s, y] of EDGE) barb(s, y);
    if (P.barb >= 2) for (const [s, y] of EDGE2) { if (y === -26) { for (let i = 1; i <= L - 1; i++) sp(X + s * (8 + i), Y + y - i, M_BARB, i === L - 1 ? 4 : 3); } else barb(s, y); }
  }
  // 候选部件：卷物藤臂（肩点 → 末端的二次曲线，2 格厚，顶上几根小刺；末端卷一圈）
  function vineArm(sx, sy, hx, hy, bend) {
    part();
    const dx = hx - sx, dy = hy - sy, L = Math.hypot(dx, dy) || 1, cx = (sx + hx) / 2 + (dy / L) * bend, cy = (sy + hy) / 2 - (dx / L) * bend, n = Math.ceil(L * 1.6);
    for (let k = 0; k <= n; k++) { const q = k / n, x = RD(bez(sx, cx, hx, q)), y = RD(bez(sy, cy, hy, q)); sp(x, y, M_VINE, 0); sp(x, y + 1, M_VINE, 0); if (k % 6 === 3 && k < n - 3) sp(x, y - 1, M_BARB, 3); }
    sp(hx + 1, hy - 1, M_VINE, 0); sp(hx + 2, hy - 1, M_VINE, 0); sp(hx + 2, hy, M_VINE, 0);
  }
  // 候选部件：香蕉串（挂点下一行是果冠，nb 根香蕉扇形散开、每根 2 格厚亮暗相间，尖端褐色、外侧两根尖端上翘）
  const FING = [
    [[-1, 1, 4], [-2, 2, 4], [-2, 3, 3], [-3, 3, 4], [-3, 4, 3], [-4, 4, 1]],
    [[0, 1, 3], [-1, 2, 3], [-1, 3, 4], [-1, 4, 3], [-2, 5, 1]],
    [[1, 1, 4], [1, 2, 4], [1, 3, 3], [2, 4, 4], [2, 5, 1]],
    [[2, 1, 3], [3, 2, 4], [3, 3, 3], [4, 3, 4], [4, 4, 3], [5, 4, 1]],
  ];
  function bunch(ax, ay, nb, pick) {
    part();
    sp(ax, ay - 1, M_ROOT, 3); run(ay, ax - 1, ax + 2, M_BAN, 2);
    for (let k = 0; k < nb; k++) for (const [dx, dy, t] of FING[k]) sp(ax + dx, ay + dy, M_BAN, t);
    if (pick) { sp(ax + 4, ay - 2, M_BAN, 4); sp(ax + 5, ay - 1, M_BAN, 3); sp(ax + 5, ay, M_BAN, 3); sp(ax + 4, ay + 1, M_BAN, 1); }   // 掰下来的那根
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const yo = P.bob + P.crouch, X = P.rock, Y = yo, lf = P.leaf, dr = P.droop * 2;
    leaf(X - 1, Y - 25, X - 3, Y - 34 + dr, X - 9 + lf, Y - 29 + dr * 2, M_LEAF_D);                       // 远侧叶（向后垂）
    rootLeg(-4, Y - 6, -4 + P.fB, P.uB, M_ROOT_D);
    rootLeg(3, Y - 6, 3 + P.fF, P.uF, M_ROOT);
    leaf(X, Y - 25, X + 1, Y - 31 + dr, X + 1 + lf, Y - 33 + dr * 2, M_LEAF);                            // 中间直立的一片
    leaf(X + 1, Y - 25, X + 4, Y - 34 + dr, X + 10 + lf, Y - 29 + dr * 2, M_LEAF);                        // 前侧叶（向前垂）
    tower(X, Y);
    vines(X, Y);
    const hx = P.hx + X + P.sway, hy = P.hy + Y;
    vineArm(X + 8, Y - 16, hx, hy, P.bend);
    if (P.nb) bunch(hx + 1, hy + 2, P.nb, P.pick);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 自己的抛射物（抛物线香蕉 / 扇形刺弹 / 死亡时滚出的香蕉串）：预分配，stepFX 推进，fxFront 画
  const PJN = 12, pjOn = new Uint8Array(PJN), pjK = new Uint8Array(PJN), pjX = new Float32Array(PJN), pjY = new Float32Array(PJN), pjVX = new Float32Array(PJN), pjVY = new Float32Array(PJN),
    pjG = new Float32Array(PJN), pjAge = new Float32Array(PJN), pjT = new Float32Array(PJN), pjRot = new Uint8Array(PJN), pjB = new Uint8Array(PJN), pjI = new Uint8Array(PJN);
  function launch(k, x, y, vx, vy, g, tArr, idx) { let i = 0; for (; i < PJN - 1 && pjOn[i]; i++); pjOn[i] = 1; pjK[i] = k; pjX[i] = x; pjY[i] = y; pjVX[i] = vx; pjVY[i] = vy; pjG[i] = g; pjAge[i] = 0; pjT[i] = tArr; pjRot[i] = 0; pjB[i] = 0; pjI[i] = idx || 0; return i; }
  const STK = 8, stX = new Float32Array(STK), stY = new Float32Array(STK); let stN = 0, stT = 9;   // 钉在假人身上的刺
  let chargeAcc = 0, soulAcc = 0, lastStep = 0, flingT = 9, hitOnce = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s !== CAST) return;
    const ox = wx(9), oy = wy(-17);
    releaseOrbit(30, 70, 0.3, 0.6, { pts: 1, up: 6 });
    for (let i = 0; i < 5; i++) { const ty = wy(-26 + i * 4), tx = DUMMY_X - 4 + (i & 1), T = 0.18; launch(2, ox, oy, (tx - ox) / T, (ty - oy) / T, 0, T, i); }   // 扇形 5 根绿刺弹
    for (const [s, y] of EDGE) burst(wx(s * 10), wy(y), 3, 20, 50, 0.2, 0.4, R_EL, 4);                  // 倒刺迸射时藤上溅出的汁
    fx.cross(ox, oy, 6, R_EL, 0.3); ring(ox, oy, 0, R_EL); hitOnce = 0;
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'arrow' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                                     // 抡出：掰下一只香蕉抛过去
      const x = wx(P.hx + P.rock + 3), y = wy(P.hy + 3), tx = DUMMY_X - 2, ty = HY - 16, T = 0.3, g = 260;
      launch(1, x, y, (tx - x) / T, (ty - y - 0.5 * g * T * T) / T, g, T); flingT = 0;
      sfx('swing', { kind: 'throw', w: 0.5 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === CHARGE && Math.abs(t - 0.15) < 1e-9) { const tx = wx(8); shoot(3, tx + 300 * (T_HIT - 0.15), HY - 17, -300, tx, FXI.enemy); }   // 一颗敌弹飞来
    if (s === CHARGE && Math.abs(t - T_HIT) < 1e-9) {                                      // 敌弹打在藤甲上
      const x = wx(8), y = HY - 17; burst(x, y, 10, 30, 80, 0.15, 0.35, FXI.enemy, 6); burst(x, y, 6, 20, 60, 0.2, 0.4, R_IMP, 6); fx.cross(x, y, 3, FXI.enemy, 0.15); shake(0.1, 1); sfx('hit', { mat: 'stone', w: 0.5 });
    }
    if (s === RECOVER && Math.abs(t - 0.1) < 1e-9) for (let i = 0; i < 5; i++) spawnX(K_PHYS, wx(-6 + Math.random() * 14), wy(-30 + Math.random() * 6), (Math.random() - 0.5) * 16, -6 - Math.random() * 8, 1.1, R_EL, { g: 30, dragX: 0.4, floor: HY, age0: 0.3 });   // 掉下几片叶
    if (s === DEATH && Math.abs(t - T_DROP) < 1e-9) { const x = wx(K_DROOP.hx + 1), y = wy(K_DROOP.hy + 2); launch(3, x, y, 22, -40, 300, 99); }   // 香蕉串脱手滚出
    if (s === DEATH && Math.abs(t - T_BREAK) < 1e-9) {                                     // 碎成一地玉块（死亡套件 chunks）
      poseAt(DEATH, T_BREAK - 1 / 12, T_BREAK - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 3, power: 0.55, fromX: 0, fromY: -18, fadeAt: 1.05, fadeDur: 0.6 });
      shake(0.16, 2); burst(wx(0), wy(-16), 16, 30, 80, 0.3, 0.6, FXI.dust, 20); burst(wx(0), wy(-18), 10, 20, 60, 0.3, 0.6, R_EL, 10);
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 12 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.85 }); }
  }
  const EVENTS = [[], [], [T_REL], [0.15, T_HIT], [], [0.1], [], [T_DROP, T_BREAK, T_LAND], []];
  function hurtFx(s) {                                                                     // 玉石受击：火花里夹着碎石屑和汁
    const hx = HX + 1, hy = HY - 16; burst(hx, hy, s === DEATH ? 20 : 12, 50, 130, 0.25, 0.55, R_IMP, 20); burst(hx, hy, s === DEATH ? 10 : 6, 30, 80, 0.3, 0.6, FXI.dust, 12);
    burst(hx + 6, hy, 4, 20, 50, 0.2, 0.4, R_EL, 6); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, t) {
    if (state === CHARGE && t >= T_HIT) {                                                  // 绿汁在命中点螺旋汇聚
      chargeAcc += dt * (22 + 30 * clamp01((t - T_HIT) / 0.9));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 9 + Math.random() * 8; spawn(K_SPIRAL_PT, wx(8), HY - 17, r / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 0.85 }); const fx0 = wx(P.step > 0 ? 3 + W_F[0] : -4 + W_B[2]); for (let i = 0; i < 3; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 22, -5 - Math.random() * 8, 0.35 + Math.random() * 0.2, FXI.dust); spawnX(K_PHYS, fx0, HY - 1, (Math.random() - 0.5) * 20, -20, 0.5, FXI.earth, { g: 160, floor: HY }); }
      lastStep = P.step;
    }
    if (state === DEATH && t > INCOMING + 1.6 && t < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 22, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
    for (let i = 0; i < PJN; i++) {
      if (!pjOn[i]) continue; pjAge[i] += dt; const k = pjK[i];
      pjVY[i] += pjG[i] * dt; pjX[i] += pjVX[i] * dt; pjY[i] += pjVY[i] * dt;
      if (k === 1) { if (((pjAge[i] * 60) | 0) % 3 === 0) spawn(K_TRAIL, pjX[i] - 2, pjY[i], -10, 0, 0.18, FXI.coin); pjRot[i] = ((pjAge[i] * 16) | 0) & 3; }
      if (k === 2 && ((pjAge[i] * 60) | 0) % 2 === 0) spawn(K_TRAIL, pjX[i] - 3, pjY[i], -14, 0, 0.15, R_EL);
      if ((k === 1 || k === 2) && pjAge[i] >= pjT[i]) {
        pjOn[i] = 0; const x = pjX[i], y = pjY[i];
        if (k === 1) { burst(x, y, 8, 30, 80, 0.15, 0.35, R_IMP, 10); burst(x, y, 6, 20, 60, 0.25, 0.45, FXI.coin, 14); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.4 }); }
        else {
          if (stN < STK) { stX[stN] = x; stY[stN] = y; stN++; } stT = 0; burst(x, y, 6, 30, 70, 0.15, 0.4, R_EL, 6);
          if (!hitOnce) { hitOnce = 1; hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'nature', w: 0.85 }); }
        }
      }
      if (k === 3) {                                                                       // 香蕉串：落地弹一下，再往前滚几圈停下
        if (pjY[i] >= HY - 2 && pjVY[i] > 0) { pjY[i] = HY - 2; if (pjB[i] < 1) { pjVY[i] *= -0.35; pjVX[i] *= 0.8; pjB[i]++; } else { pjVY[i] = 0; pjG[i] = 0; pjVX[i] *= Math.pow(0.12, dt); } }
        if (Math.abs(pjVX[i]) > 3) pjRot[i] = ((pjAge[i] * 11) | 0) & 3; else pjVX[i] = 0;
        if (pjAge[i] > 2.3) pjOn[i] = 0;
      }
    }
    stT += dt; flingT += dt;
  }
  function fxReset() { pjOn.fill(0); stN = 0; stT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; flingT = 9; hitOnce = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  // 香蕉（3×2 月牙，4 个朝向）
  const BAN = [[[-1, -1, 47], [-1, 0, 51], [0, 1, 47], [1, 1, 14], [2, 0, 20]], [[1, -1, 47], [0, -1, 51], [-1, 0, 47], [-1, 1, 14], [0, 2, 20]], [[1, 1, 47], [1, 0, 51], [0, -1, 47], [-1, -1, 14], [-2, 0, 20]], [[-1, 1, 47], [0, 1, 51], [1, 0, 47], [1, -1, 14], [0, -2, 20]]];
  // 滚出的香蕉串（5×5，按 90° 翻滚）
  const BUN = [[0, -2, 19], [-1, -1, 14], [0, -1, 14], [1, -1, 14], [-2, 0, 51], [-1, 0, 47], [0, 0, 51], [1, 0, 47], [-2, 1, 51], [-1, 1, 47], [0, 1, 51], [1, 1, 47], [2, 1, 20], [-3, 2, 20], [-1, 2, 47], [0, 2, 51], [1, 2, 20], [-1, 3, 20], [0, 3, 20]];
  const rot = (x, y, r) => (r === 0 ? [x, y] : r === 1 ? [-y, x] : r === 2 ? [-x, -y] : [y, -x]);
  function fxFront(f12) {
    for (let i = 0; i < PJN; i++) {
      if (!pjOn[i]) continue; const x = RD(pjX[i]), y = RD(pjY[i]), k = pjK[i];
      if (k === 1) for (const [dx, dy, c] of BAN[pjRot[i]]) put(x + dx, y + dy, c);
      else if (k === 2) { const l = Math.hypot(pjVX[i], pjVY[i]) || 1, ux = pjVX[i] / l, uy = pjVY[i] / l; put(x, y, 21); put(RD(x - ux), RD(y - uy), 37); put(RD(x - 2 * ux), RD(y - 2 * uy), 36); put(RD(x - 3 * ux), RD(y - 3 * uy), 35); }
      else if (k === 3) { const fade = clamp01((pjAge[i] - 1.75) / 0.5); for (const [dx, dy, c] of BUN) { const r = rot(dx, dy, pjRot[i]); if (fade > 0 && B8[((r[1] + 64) & 7) * 8 + ((r[0] + 64) & 7)] < fade) continue; put(x + r[0], y + r[1], c); } }
    }
    if (stT < 0.75) for (let i = 0; i < stN; i++) {                                        // 刺钉在假人身上：白尖朝里、绿尾露在外面，后半段断续消失
      if (stT > 0.45 && ((i + f12) & 1)) continue; const x = RD(stX[i]), y = RD(stY[i]); put(x, y, 36); put(x - 1, y, 37); put(x - 2, y, 37); put(x - 3, y, stT < 0.2 ? 21 : 38);
    }
    if (P.eye >= 2 && P.eye <= 3 && P.dq < 1) {                                             // 眼光星芒（蓄满 / 施放）
      const gx = wx(P.gx), gy = wy(P.gy), L = P.eye === 3 ? 4 : 1 + (f12 & 1);
      for (let r = 2; r <= L + 1; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + 1, gy - r, c); put(gx + 1, gy + r + 1, c); put(gx + r + 2, gy, c); }
    }
  }

  return {
    name: '玉藤堡垒', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EYE], HIT_POINT: [2, -16], EVENTS,
    deathKit: { mode: 'chunks', at: T_BREAK },
    SFX: { body: 'stone', how: 'shatter', pal: 'nature', style: 'blade', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
