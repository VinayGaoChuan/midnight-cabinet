// 糖果女孩（部队 · 骷髅 · 召唤师 · 史诗 · 近战 304）：召唤师长大、打扮华丽了——同一个骷髅小女孩：大圆颅骨、两条灰白长双马尾（拖过膝、发梢卷成大卷，
// 发结换成两颗包装糖果发夹），草莓粉钟形蓬裙（下摆一圈白糖霜花边、裙面点着草莓籽），胸前还挂着那只骨哨；
// 双手扛一根比人还高的漩涡巨型棒棒糖（白骨糖棍、粉白漩涡糖面 9 格、糖心是发光体），手腕上缠着红白糖果条纹狗链，链尾拴一只带尖刺的粉色项圈。
// 攻击 = 砸：双手把棒棒糖从头顶抡下来砸在目标脚前，糖面砸地崩出糖渣；
// 技能 = 特性「召唤地狱犬」：棒棒糖立起、糖面漩涡越转越快并发光、四周糖粒螺旋汇聚进糖心、裙摆被风吹鼓 → 把棒棒糖往地上狠砸，
//        砸点沿地面裂出一道地狱火裂缝向前 12 格、震屏 2 格 → 一只火焰狼头从裂缝尽头跃出（先剪影、再实体），糖渣 + 火星双色外爆，粉色项圈「咔」地扣上它的脖子。
// 死亡 = 爆裂成糖：身体「啵」地炸成一堆糖果碎屑和小骨头（死亡套件 burst），棒棒糖倒地裂成两半，双马尾最后飘下来。
// 升级线：召唤师（Summoner.js）→ 糖果女孩：保留双马尾、狗链 + 项圈、骨哨、骷髅颅骨；加体量（孩童档加高）、加武器（巨型棒棒糖）、加特效层次（地狱火裂缝 + 火焰狼头）。
PCD.define('CandyGirl', (E) => {
  const { parts, Sprite, bake, begin, ease, clamp01, q12, f12of, walkDemo, keyer, hash, bayer, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, death, hitDummy, dummyFx, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：糖浆地狱火 · 草莓粉（自建 candy 色阶：白 → 淡粉 → 粉 → 玫红 → 深红），裂缝里的火用 fire ─────
  const R_EL = fxRamp('candy', [21, '#ffc6de', 63, '#c23a6e', 12]), EL = FXR[R_EL], FIRE = FXR[FXI.fire];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    bone: 'bone',                                         // 骨（颅骨、四肢、糖棍、骨哨）
    hair: 'pale',                                         // 灰白双马尾（和召唤师同款）
    dress: { r: [11, 13, 63, '#ffc6de'], band: 2 },       // 草莓粉钟形蓬裙
    lace: 'white',                                        // 糖霜花边、糖面白、包装纸
    candy: [11, 13, 63, '#ffc6de'],                       // 糖面粉漩涡、发夹糖
    chainR: 'crimson', collar: [11, 13, 63, '#ffc6de'], spike: 'white',
    ink: { r: 'ink', flat: 1 },
    core: { r: [12, 63, '#ffc6de', 21], flat: 1 },        // 糖心（发光体，5 档）
    hole: { r: [12, 13, 63, '#ffc6de'], flat: 1 },        // 骨哨孔
    eyeG: { r: [0, 12, 13, 63], flat: 1 },                // 眼窝里的粉光
  });
  const BODY = { body: 'child', leg: 6, torso: 7, head: 8, headW: 8, sw: 4, arm: 7, lw: 1, stride: 1 };
  const HX = 72, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 44, 34, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 3, 7, 11], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['ink', 'core', 'hole', 'eyeG', 'chainR', 'collar', 'spike', 'candy', 'lace']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 hx/hy + 棒棒糖角度 a（后手在糖棍下方 3 格）· 项圈 cx/cy + 链下垂 sag · 漩涡转角 spin · 张嘴 jaw · 跳起 air ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, a: 0, ak: 0, lean: 0, head: 0, crouch: 0, bob: 0, air: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0, gem: 0, glint: 0, rim: 0,
    eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqk: 0, st: 0, cx: 0, cy: 0, sag: 0, spin: 0, jaw: 0, nolol: 0, notail: 0, nocol: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, cx, cy, sag) => ({ hx, hy, a, lean, cx, cy, sag });
  const STICK = 17;                                                   // 前手到糖心的距离（糖面顶比颅顶高 ≥ 6 格）
  const K_IDLE = K(5, -9, 0.25, 0, 13, -1, 2);
  const K_LICK = K(6, -6, 0.2, 0, 13, -1, 3);                         // 待机个性：把糖凑到嘴边舔一下
  const K_WIND = K(2, -14, -0.9, -1, 11, -1, 3);                      // 抡到头顶身后
  const K_SMASH = K(3, -8, 1.9, 1, 13, -1, 2);                        // 砸下：糖面砸在目标脚前
  const K_CHG = K(4, -12, 0, -1, 12, -1, 4);                          // 蓄力：棒棒糖立起
  const K_SLAM = K(5, -16, 2.45, 1, 12, -1, 2);                       // 施放：往地上狠砸（人已退后 11 格，糖面砸在 x≈77，前面留出裂缝和狼头的地方）
  const K_HURT = K(3, -9, -0.1, -1, 12, -1, 3);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'cx', 'cy', 'sag'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 24], ['hy', -24, 4], ['ak', -40, 40], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 5], ['bob', 0, 1], ['air', 0, 3], ['cx', -24, 32], ['cy', -28, 1], ['sag', 0, 6],
    ['spin', 0, 7], ['jaw', 0, 1], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 2],
    ['flash', 0, 1], ['dqk', 0, 48], ['bx', -12, 8], ['st', 0, 8], ['nolol', 0, 1], ['notail', 0, 1], ['nocol', 0, 1]]);
  const T_SMASH = 2 / 12, T_HIT = 4 / 12, T_POP = INCOMING + 0.4, T_LAND = INCOMING + 0.8;
  const BACK = 11;                                                     // 技能时先往后蹦 11 格
  const HEAD_X = DUMMY_X - 19, NECKW = [HEAD_X + 4, HY - 8];                  // 火焰狼头（世界坐标）：12×10，x 79–90（离假人前沿 2 格），底边 HY-9（比糖面高 2 格）；项圈在脖子下沿
  const CRACK_X = HX - BACK + 21, CRACK_LEN = 12;                      // 裂缝：从糖面前沿（x 82）起向前 12 格，到假人底座前

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.crouch = 0; P.dq = 0; P.bob = 0; P.air = 0; P.flip = 0; P.mx = 0; P.spin = 0; P.jaw = 0; P.nolol = 0; P.notail = 0; P.nocol = 0; P.head = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const i = Math.floor((lp - 1.6) * 12 + 1e-6); setK(K_IDLE, K_LICK, i === 0 || i === 4 ? 0.5 : 1); P.head = i >= 1 && i <= 3 ? 1 : 0; P.jaw = i === 2 ? 1 : 0; P.beard = [0, 1, -1, 1, 0][i]; P.bob = 0; P.spin = i >= 3 ? 1 : 0; P.glint = i === 3 ? 1 : 0; }
      else if (lp >= 2.0) P.spin = 1;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 蹦跳：两脚并拢一蹦一落，落地时换领先的脚、裙摆鼓一下
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); P.walk = 1;
      P.step = [1, 0, -1, 0][f]; P.crouch = [1, 0, 1, 0][f]; P.air = [0, 3, 0, 2][f]; P.sway = [1, -1, 1, -1][f]; P.beard = [1, -1, 1, -2][f]; P.bend = [0, 1, 0, 2][f];
      P.a = K_IDLE.a + [0.1, -0.1, 0.1, -0.05][f]; P.sag = [2, 4, 2, 3][f];
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; P.sway = 1; P.gem = 1; }
      else if (tq < 0.2) { setK(K_SMASH, K_SMASH, 0); P.bx = 2; P.crouch = 1; P.beard = -2; P.sway = -2; P.gem = 2; }
      else if (tq < 0.45) { setK(K_SMASH, K_SMASH, 0); P.bx = 2; P.crouch = tq < 0.3 ? 1 : 0; P.beard = -1; P.sway = -1; P.gem = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_SMASH, K_IDLE, q); P.bx = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                          // 立糖：漩涡越转越快、裙摆被风吹鼓
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHG, q);
      const hb = clamp01(tq / 0.3); P.bx = -RD(BACK * ease.out(hb)); P.air = hb > 0 && hb < 1 ? RD(Math.sin(hb * Math.PI) * 2) : 0;   // 往后蹦一下
      P.spin = Math.floor(12 * tq + 9 * tq * tq + 1e-6) & 7;                // 每帧至少转一格，越转越快 P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.3 ? -2 : -1; P.bend = q > 0.5 ? 2 + (f12 & 1) : 1;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                            // 往地上狠砸
      setK(K_CHG, K_SLAM, tq < 1 / 12 ? 0.6 : 1); P.bx = -BACK; P.crouch = tq < 0.25 ? 2 : 1; P.beard = -2; P.sway = 2; P.gem = 3; P.rim = 3;
      if (tq >= T_HIT) { P.cx = NECKW[0] - HX - P.bx; P.cy = NECKW[1] - HY; P.sag = 0; P.nocol = 1; }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SLAM, K_IDLE, q); P.beard = -RD(1 - q); P.bx = -RD(BACK * (1 - ease.inOut(clamp01((tq - 0.2) / 0.45))));
      if (tq < 0.45) { P.cx = NECKW[0] - HX - P.bx; P.cy = NECKW[1] - HY; P.sag = 0; P.nocol = tq < 0.4 ? 1 : 0; }
      else if (tq < 0.55) { P.cx = NECKW[0] - HX - 2; P.cy = -3; P.sag = 2; }
      else { const r = clamp01((tq - 0.55) / 0.15); P.cx = RD(NECKW[0] - HX - 2 + (K_IDLE.cx - NECKW[0] + HX + 2) * r); P.cy = -1; }
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 爆裂成糖
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.crouch = 2; P.sway = 2; P.beard = -1; P.gem = 2; if (d >= T_POP - INCOMING) P.dq = 1; }   // 鼓一下 → 啵
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const cr = Math.min(3, RD(P.crouch)), yo = P.bob + cr;
    P.a = RD(P.a / ASTEP) * ASTEP; P.ak = RD(P.a / ASTEP);
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.hx - Math.sin(P.a) * 3); P.bhy = RD(P.hy + Math.cos(P.a) * 3);
    P.lean = RD(P.lean); P.crouch = RD(P.crouch); P.cx = RD(P.cx); P.cy = RD(P.cy); P.sag = RD(P.sag);
    const c = candyAt(); P.gx = c[0] + P.bx; P.gy = c[1] - P.air;          // 发光体 = 糖心
    P.dqk = RD(P.dq * 48); KEY(P);
  }
  const candyAt = () => [RD(P.hx + Math.sin(P.a) * STICK), RD(P.hy - Math.cos(P.a) * STICK)];

  // ───── 画 ─────
  const BW = BODY.arm;
  // 候选部件：boneArm —— 骷髅细臂（同召唤师）：1 格骨上臂 + 前臂 + 肘节 + 2×2 骨手，肩头 2×2 泡泡短袖
  function boneArm(T, sx, sy, hx, hy, bm, sm, noHand) {
    const L = BW, L1 = L / 2; let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
    if (d > L) { const k = (d - L) / d; sx += dx * k; sy += dy * k; dx = hx - sx; dy = hy - sy; d = L; }
    let ex = sx + dx / 2, ey = sy + dy / 2;
    if (d < L - 0.5) { const h = Math.sqrt(Math.max(0, L1 * L1 - d * d / 4)), nx = -dy / d, ny = dx / d, s = (-nx + ny * 0.8) >= 0 ? 1 : -1; ex += nx * s * h; ey += ny * s * h; }
    E.part(); parts.line(E, T, sx, sy, ex, ey, bm, 0); parts.line(E, T, ex, ey, hx, hy, bm, 0); PX(E, T, ex, ey, bm, 4);
    if (!noHand) { parts.rect(E, T, hx - 1, hy - 1, 2, 2, bm, 0); PX(E, T, hx - 1, hy - 1, bm, 4); }
    E.part(); const qx = RD(sx), qy = RD(sy); parts.rect(E, T, qx - 1, qy - 1, 2, 2, sm, 0); PX(E, T, qx - 1, qy - 1, sm, 4); PX(E, T, qx, qy, sm, 2);
  }
  // 候选部件：skullHead —— 骷髅大圆颅（同召唤师）+ jaw 张嘴：下颌往下掉 1 格，嘴里一格黑
  function skull(T, R, eyeLv) {
    E.part(); const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, m = M.bone, j = P.jaw;
    for (let y = top; y <= bot; y++) { let a = x0, b = x1; if (y === top) { a += 2; b -= 1; } else if (y === top + 1 || y === bot - 1) a += 1; else if (y === bot) a += 3; parts.run(E, T, y + (j && y === bot ? 1 : 0), a, b, m, 0); }
    if (j) { PX(E, T, x1, bot, M.ink, 1); PX(E, T, x1 - 1, bot, M.ink, 1); parts.run(E, T, bot, x0 + 3, x1 - 2, m, 0); }
    PX(E, T, x0 + 2, top + 1, m, 4); PX(E, T, x0 + 3, top + 1, m, 4); PX(E, T, x0 + 1, top + 2, m, 4);
    PX(E, T, x0 + 2, ey + 1, m, 2); PX(E, T, x0 + 3, ey + 2, m, 2);
    const sx = x1 - 2;
    if (P.eyes) { parts.run(E, T, ey + 1, sx, x1 - 1, M.ink, 1); PX(E, T, sx, ey, m, 2); }
    else { parts.rect(E, T, sx, ey, 2, 2, M.ink, 1); PX(E, T, sx + 1, ey, M.eyeG, eyeLv); if (eyeLv >= 4) PX(E, T, sx, ey + 1, M.eyeG, 2); }
    PX(E, T, x1, ey + 2, M.ink, 1);
    for (let x = x1 - 3; x <= x1; x++) PX(E, T, x, bot - 1, m, ((x - x1) & 1) ? 1 : 4);
    if (!j) PX(E, T, x1, bot, m, 2);
    PX(E, T, x0 + 5, ey + 3, M.candy, 3);                                  // 一点粉腮红（糖粉）
  }
  // 候选部件：drillTail —— 加长的双马尾：从发结往外甩出 5 格再垂到膝下，上段 2 格宽，发梢卷成 3×3 大卷（中间空一格），随 beard / sway 摆
  const TAIL_LEN = 13;
  function tail(T, R, s) {
    E.part(); const m = s < 0 ? M.hairD : M.hair, b = P.beard, tx = s < 0 ? R.hx0 : R.hx1, ty = R.htop + 1; let ex = 0, ey = 0;
    for (let k = 0; k <= TAIL_LEN; k++) {
      const q = k / TAIL_LEN, out = (s > 0 ? 2 : 1) + 4 * Math.sin(Math.min(1, q * 1.7) * Math.PI / 2) - (q > 0.7 ? (q - 0.7) * 4 : 0);
      const x = RD(tx + s * out + b * q * q * 1.8 + (k >= TAIL_LEN - 1 ? P.sway : 0)), y = ty + k; ex = x; ey = y;
      PX(E, T, x, y, m, 0); if (k < TAIL_LEN * 0.75) PX(E, T, x + s, y, m, (k & 1) ? 2 : 0); if (k > 2 && k < TAIL_LEN * 0.5 && (k % 3) === 0) PX(E, T, x + 2 * s, y, m, 3);
    }
    const cx = ex + s, cy = ey + 2;                                         // 发梢大卷
    PX(E, T, cx - 1, cy - 1, m, 0); PX(E, T, cx + 1, cy - 1, m, 0); PX(E, T, cx - 1, cy, m, 0); PX(E, T, cx + 1, cy, m, 2); PX(E, T, cx - 1, cy + 1, m, 3); PX(E, T, cx, cy + 1, m, 4); PX(E, T, cx + 1, cy + 1, m, 2);
  }
  // 候选部件：candyClip —— 包装糖果发夹：中间 3 格粉糖（1 格白条纹）+ 两端扭起来的白包装纸三角
  function candyClip(T, cx, cy) {
    parts.run(E, T, cy, cx - 1, cx + 1, M.candy, 0); PX(E, T, cx, cy, M.lace, 4); PX(E, T, cx - 1, cy, M.candy, 4);
    PX(E, T, cx - 2, cy, M.lace, 3); PX(E, T, cx - 3, cy - 1, M.lace, 4); PX(E, T, cx - 3, cy + 1, M.lace, 2);
    PX(E, T, cx + 2, cy, M.lace, 3); PX(E, T, cx + 3, cy - 1, M.lace, 3); PX(E, T, cx + 3, cy + 1, M.lace, 2);
  }
  // 候选部件：swirlCandy —— 漩涡棒棒糖糖面（半径 4.5 的圆，两条粉 / 白螺旋臂按 spin 转，中心糖心是发光体，和糖面同一部件）；糖棍 1 格骨，糖面压在糖棍上
  const CORE_LV = [2, 3, 4, 4, 1];
  function stick(T, x0, y0, x1, y1) { E.part(); parts.line(E, T, x0, y0, x1, y1, M.bone, 0); }
  function swirlCandy(T, cx, cy, spin, lv) {
    E.part(); const r = 4.5;
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
      const d = Math.hypot(dx, dy); if (d > r) continue; const X = cx + dx, Y = cy + dy;
      if (d < 1.1) { PX(E, T, X, Y, M.core, lv); continue; }
      const v = (((Math.atan2(dy, dx) / 6.2832) * 2 + d / 2.1 + spin / 4) % 2 + 4) % 2;
      PX(E, T, X, Y, v < 1 ? M.candy : M.lace, 0);
    }
    if (P.glint) PX(E, T, cx - 2, cy - 3, M.lace, 4);
  }
  // 候选部件：stripeChain —— 红白糖果条纹链（leash 的双材质版）：手 → 链尾按抛物线下垂，贴地就平铺，红 / 白逐格交替
  function stripeChain(T, x0, y0, x1, y1, sag) {
    E.part(); const n = Math.max(2, Math.ceil((Math.abs(x1 - x0) + Math.abs(y1 - y0) + sag) * 1.6)); let lx = 1e9, ly = 1e9, i = 0;
    for (let s = 0; s <= n; s++) {
      const q = s / n, x = RD(x0 + (x1 - x0) * q), y = Math.min(0, RD(y0 + (y1 - y0) * q + sag * 4 * q * (1 - q)));
      if (x === lx && y === ly) continue; lx = x; ly = y; PX(E, T, x, y, (i & 1) ? M.lace : M.chainR, (i & 1) ? 3 : 4); i++;
    }
  }
  // 候选部件：spikedCollar —— 粉色尖刺项圈（4×3 空心环 + 顶上 2 根白尖刺 + 一块骨牌）
  function spikedCollar(T, cx, cy) {
    E.part(); const m = M.collar;
    parts.run(E, T, cy - 1, cx, cx + 1, m, 4); PX(E, T, cx - 1, cy, m, 0); PX(E, T, cx + 2, cy, m, 2); parts.run(E, T, cy + 1, cx, cx + 1, m, 2);
    PX(E, T, cx, cy - 2, M.spike, 4); PX(E, T, cx + 2, cy - 1, M.spike, 3); PX(E, T, cx - 1, cy - 1 - (cy > -2 ? 0 : 1), M.spike, 3);
    if (cy + 2 <= 0) PX(E, T, cx + 1, cy + 2, M.bone, 4); else PX(E, T, cx + 3, cy + 1, M.bone, 4);
  }
  // 骨哨（同召唤师，挂在胸前，不再发主光）
  function whistle(T, R) { E.part(); const x = 1 + R.lean, y = R.yS + 2; parts.run(E, T, y, x - 1, x + 1, M.bone, 0); PX(E, T, x - 1, y, M.bone, 4); PX(E, T, x + 2, y, M.bone, 2); PX(E, T, x, y, M.hole, P.gem >= 2 && P.gem < 4 ? 4 : 2); }
  // 草莓籽（和裙子同一部件）
  function seeds(T, R, tor) {
    const [LL, RR] = tor.rows, y0 = tor.y0;
    for (let y = R.yWaist + 2; y < tor.hem - 1; y += 2) { const i = y - y0, L = LL[i], Rr = RR[i]; for (let x = L + 2 + ((y >> 1) & 1); x < Rr - 1; x += 3) PX(E, T, x, y, M.lace, 4); }
  }
  const EYE_LV = [3, 3, 4, 4, 1];
  function drawHero() {
    E.begin(hero, P.bx, -P.air);
    const R = parts.rig(P, BODY), T = R;
    if (!P.notail) tail(T, R, -1);
    boneArm(T, R.sBx, R.sBy, P.bhx, P.bhy, M.boneD, M.dressD, 1);
    parts.legs(E, R, P, { style: 'bare', mat: M.bone, matD: M.boneD, w: 1 });
    const tor = parts.torso(E, R, P, { style: 'dress', mat: M.dress, trim: M.lace, collar: M.lace, hem: Math.min(0, R.yHip + 3), flare: 4.5, flareF: 4 });
    seeds(T, R, tor);
    skull(T, R, EYE_LV[P.gem]);
    if (!P.notail) { tail(T, R, 1); E.part(); candyClip(T, R.hx0 - 1, R.htop); candyClip(T, R.hx1 + 1, R.htop); }
    whistle(T, R);
    if (!P.nolol) {
      const c = candyAt(), bx = RD(P.hx - Math.sin(P.a) * 5), by = RD(P.hy + Math.cos(P.a) * 5);
      stick(T, bx, by, c[0], c[1]); swirlCandy(T, c[0], c[1], P.spin, CORE_LV[P.gem]);
      E.part(); parts.rect(E, T, P.bhx - 1, P.bhy - 1, 2, 2, M.boneD, 0);            // 后手压在糖棍上
    }
    const ax = P.cx > P.hx ? P.cx - 1 : P.cx + 2;
    stripeChain(T, P.hx, P.hy + 1, ax, P.cy, P.sag); if (!P.nocol) spikedCollar(T, P.cx, P.cy);
    boneArm(T, R.sFx, R.sFy, P.hx, P.hy, M.bone, M.dress);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 火焰狼头（世界坐标，从裂缝尽头跃出）：先 2 帧剪影，再实体；两只尖耳、往前伸 3 格的长吻、白黄眼；鬃毛火苗逐帧跳 ─────
  const WOLF = [
    '..F...F.....',
    '.FHF.FHF....',
    'fHHHHHHHH...',
    'fHHHHHHHHH..',
    'fHHHHHEEHHHn',
    'HHHHHHHHHHHH',
    'HHHHHHW.W.W.',
    'HHHHHH.W.W..',
    '.HHHHHHHHh..',
    '..fHHHHf....',
  ];
  const WH = WOLF.length, WW = 12;
  const wolfAt = (i, j) => i >= 0 && j >= 0 && i < WW && j < WH && WOLF[j][i] !== '.';
  function headPhase() {
    const s = E.state, t = q12(E.stT);
    if (s === CAST && t >= 2 / 12) return { rise: Math.min(1, (t - 2 / 12) / (2 / 12)), dq: 0, sil: t < T_HIT - 1e-6, snap: Math.abs(t - T_HIT) < 1e-6, t };
    if (s === RECOVER) return { rise: 1, dq: clamp01((t - 0.2) / 0.4), sil: 0, snap: 0, t };
    return null;
  }
  function drawWolfHead(f12) {
    const ph = headPhase(); if (!ph) return;
    const by = HY - RD(-3 + 12 * ease.out(ph.rise)), dq = ph.dq, vis = (x, y) => y <= HY && !(dq > 0 && bayer(x, y) < dq);   // by = 底边：从裂缝里（地下 3 格）跃到地上 9 格
    for (let j = 0; j < WH; j++) for (let i = 0; i < WW; i++) {
      const ch = WOLF[j][i]; if (ch === '.') continue;
      const x = HEAD_X + i, y = by - (WH - 1 - j) - (ch === 'f' && (f12 & 1) ? 1 : 0); if (!vis(x, y)) continue;
      const edge = !wolfAt(i - 1, j) || !wolfAt(i + 1, j) || !wolfAt(i, j - 1) || !wolfAt(i, j + 1);
      let c;
      if (ph.sil) c = edge ? EL[3] : 11;                                                    // 剪影：玫红外沿 + 深红实心
      else if (ch === 'E') c = (f12 & 1) ? 21 : FIRE[1];                                  // 白黄眼
      else if (ch === 'W') c = 17;                                                        // 白牙
      else if (ch === 'n') c = 0;                                                         // 鼻头
      else if (ch === 'f') c = (f12 + i) & 1 ? FIRE[1] : FIRE[0];                         // 火鬃
      else if (edge) c = j <= 2 || ch === 'F' ? FIRE[1] : FIRE[2];                         // 外沿：上沿淡黄、其余橙
      else c = ((i + j) % 5) === 0 ? FIRE[2] : ((i * 3 + j) % 4) === 0 ? FIRE[4] : FIRE[3];   // 内部：红底 + 深红斑 + 橙火纹
      put(x, y, c);
    }
    if (!ph.sil) {                                                                       // 粉色尖刺项圈：扣在脖子下沿（扣上那一帧两半还分开 2 格）
      const cy = by + 1, gap = ph.snap ? 2 : 0;
      for (let i = 1; i <= 7; i++) { const x = HEAD_X + i + (i <= 3 ? -gap : i >= 5 ? gap : 0); if (ph.snap && i === 4) continue; if (vis(x, cy)) put(x, cy, i === 4 ? 17 : (i & 1) ? EL[1] : EL[2]); }
      for (const i of [2, 4, 6]) { const x = HEAD_X + i + (i <= 3 ? -gap : i >= 5 ? gap : 0); if (vis(x, cy + 1)) put(x, cy + 1, 21); }
      if (vis(HEAD_X + 4, cy + 2) && !ph.snap) put(HEAD_X + 4, cy + 2, 6);             // 骨牌
    }
  }
  // 地狱火裂缝：从糖面前沿起向前 12 格，2 行粗，芯是火色阶第 1 / 2 级，上沿冒火苗（画在最前面，不被糖面和假人底座盖住）
  const CRK = []; { let yy = 0; for (let k = 0; k < CRACK_LEN; k++) { if (k > 1 && hash(k, 5) < 0.35) yy = yy ? 0 : 1; CRK.push(yy); } }
  function drawCrack(f12) {
    const s = E.state, t = q12(E.stT); let len, dq = 0;
    if (s === CAST) len = Math.min(CRACK_LEN, RD(CRACK_LEN * (t + 1 / 12) / (3 / 12)));
    else if (s === RECOVER) { len = CRACK_LEN; dq = clamp01((t - 0.25) / 0.35); } else return;
    for (let k = 0; k < len; k++) {
      const x = CRACK_X + k, y = FLOOR + CRK[k], hot = ((k + f12) % 3) !== 0; if (dq > 0 && bayer(x, y) < dq) continue;
      put(x, y, hot ? FIRE[1] : FIRE[2]); put(x, y + 1, hot ? FIRE[2] : FIRE[1]);
      if (((k + f12) & 1) === 0) put(x, y - 1, FIRE[3]);                             // 上沿红边（隔格）
      if ((k & 1) === 0) put(x, y + 2, FIRE[4]);
      if (dq < 0.3 && hash(k, f12 >> 1) < 0.35) { put(x, y - 2, FIRE[2]); if (hash(k, f12) < 0.5) put(x, y - 3, FIRE[1]); }
    }
  }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, emberAcc = 0, lastStep = 0, lastPers = -1, lolT = -1;
  const wx = (x) => scrX(x + P.bx), wy = (y) => HY + y - P.air;
  const candyGrain = (x, y, vx, vy, life) => spawnX(K_PHYS, x, y, vx, vy, life, R_EL, { g: 260, floor: HY, sz: 2 });
  function onEnter(s) {
    if (s === CAST) {                                                    // 砸地：地狱火裂缝向前 12 格
      releaseOrbit(40, 90, 0.2, 0.45, { pts: 1 });
      const sx = CRACK_X - 5;                                            // 糖面砸点
      burst(sx, HY - 2, 16, 40, 100, 0.2, 0.5, R_EL, 18); for (let i = 0; i < 6; i++) candyGrain(sx, HY - 3, (Math.random() - 0.5) * 70, -50 - Math.random() * 40, 0.8);
      shake(0.3, 2); flash(0.05); sfx('impact', { pal: 'fire', w: 0.5 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SMASH) {                                 // 糖面砸地崩出糖渣
      const c = candyAt(), x = wx(c[0]), y = HY - 2;
      fx.slash(wx(4), wy(-10), 14, -0.9, 2.0, R_EL, 0.2, 2, 1);
      burst(x, y, 12, 40, 100, 0.15, 0.4, R_EL, 20); burst(x, y, 6, 30, 70, 0.2, 0.4, FXI.impact, 12);
      for (let i = 0; i < 5; i++) candyGrain(x, y - 1, (Math.random() - 0.5) * 60, -40 - Math.random() * 40, 0.7);
      hitDummy(1); shake(0.12, 1); sfx('swing', { kind: 'smash', w: 0.4 }); sfx('hit', { mat: 'wood', w: 0.4 });
    }
    if (s === CAST && t === T_HIT) {                                     // 狼头成形：糖渣 + 火星双色外爆，项圈「咔」扣上
      const x = HEAD_X + 6, y = HY - 1;                                  // 从裂缝尽头（狼头脚下）往外爆，不压住狼头
      burst(x, y, 14, 50, 130, 0.25, 0.6, R_EL, 18); burst(x, y, 14, 50, 130, 0.25, 0.6, FXI.fire, 22); ring(x, y, 1, FXI.fire);
      fx.cross(NECKW[0], NECKW[1] + 1, 3, R_EL, 0.2); for (let i = 0; i < 6; i++) candyGrain(x, y - 2, (Math.random() - 0.5) * 90, -40 - Math.random() * 50, 0.9);
      hitDummy(1); shake(0.16, 1);                                       // 假人只摇 + 闪白，不再描火边（免得和狼头连成一片） sfx('impact', { pal: 'fire', w: 0.7 });
    }
    if (s === DEATH && t === T_POP) {                                    // 啵：炸成糖果碎屑和小骨头；棒棒糖和双马尾单独留下
      poseAt(DEATH, T_POP - 1 / 12, T_POP - 1 / 12); lolFrom(); P.nolol = 1; P.notail = 1; KEY(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      bakeTails(); death.start('burst', { power: 0.8, chunk: 3, fromX: 0, fromY: -10, fadeAt: 1.3, fadeDur: 0.6, ramp: 'soul' });
      for (let i = 0; i < 12; i++) candyGrain(HX - 2, HY - 10, (Math.random() - 0.5) * 120, -60 - Math.random() * 60, 1.1);
      burst(HX - 2, HY - 10, 20, 50, 130, 0.2, 0.5, R_EL, 16); flash(0.05); shake(0.2, 2); lolT = 0;
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 30 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.4, FXI.dust); burst(HX - 22, HY - 2, 8, 20, 60, 0.2, 0.4, R_EL, 10); shake(0.1, 1); sfx('fall', { w: 0.3 }); }
  }
  const EVENTS = [[], [], [T_SMASH], [], [T_HIT], [], [], [T_POP, T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx - P.bx), gy = HY + P.gy;
    if (state === CHARGE) {                                              // 糖粒（粉 2×2）螺旋汇聚到糖心
      chargeAcc += dt * (26 + 26 * clamp01(stT / DUR[CHARGE]));           // 同屏 16 颗以上 2×2 糖粒
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 8, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, gx, gy, (r - 4.5) / (0.5 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 6 + Math.random() * 3, tx: gx, ty: gy, squash: 0.8, sz: 2 }); }
    }
    if (state === CAST && stT < 0.5) { emberAcc += dt * 20; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, CRACK_X + Math.random() * CRACK_LEN, HY, (Math.random() - 0.5) * 6, -10 - Math.random() * 14, 0.4 + Math.random() * 0.3, FXI.fire); } }
    if (state === MOVE && P.step !== lastStep) {                         // 落地：叮当 + 掉 1 颗糖粒
      if (P.step !== 0) { sfx('step', { w: 0.3 }); candyGrain(wx(P.step > 0 ? 3 : -3), HY - 2, (Math.random() - 0.5) * 20, -30, 0.9); spawn(K_DUST, wx(0), HY, -6, -3, 0.25, FXI.dust); spawn(K_DUST, wx(2), HY, 6, -3, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE) {                                                // 舔糖：糖面漩涡转一格，冒两颗糖星
      const lp = q12(stT) % DUR[IDLE], i = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (i !== lastPers) { if (i === 3) { spawn(K_EMBER, gx + 3, gy - 2, 6, -12, 0.4, R_EL); spawn(K_EMBER, gx - 3, gy - 3, -5, -14, 0.4, R_EL); } lastPers = i; }
    }
    if (lolT >= 0) lolT += dt;
    if (state === DEATH && stT > INCOMING + 1.8 && stT < INCOMING + 2.5) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 22, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; emberAcc = 0; lastStep = 0; lastPers = -1; lolT = -1; }

  // ───── 死亡：倒下的棒棒糖（倒地裂成两半）、飘落的双马尾 ─────
  let lolX = 0, lolY = 0, lolA = 0;
  function lolFrom() { lolX = HX + P.mx + P.bx + P.hx; lolY = HY + P.hy + 3; lolA = P.a; }
  const tailSpr = [new Sprite(40, 30, 20, 26), new Sprite(40, 30, 20, 26)], TB = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };   // [0 近侧, 1 远侧] 各带自己的糖果发夹
  function bakeTails() {
    begin(tailSpr[0], 0, 0); let R = parts.rig(P, BODY); tail(R, R, 1); E.part(); candyClip(R, R.hx1 + 1, R.htop); bake(tailSpr[0], TB);
    begin(tailSpr[1], 0, 0); R = parts.rig(P, BODY); tail(R, R, -1); E.part(); candyClip(R, R.hx0 - 1, R.htop); bake(tailSpr[1], TB);
  }
  const HAIR_C = [8, 59, 60, 17];
  function tailsDown(x0, dq, f12, k) {                                   // 落在地上的一条马尾（k 0 近侧 / 1 远侧）：波浪长发平铺，发梢一个大卷，发根一颗糖果发夹
    const pp = (x, y, c) => { if (!(dq > 0 && bayer(x, y) < dq)) put(x, y, c); };
    { const y0 = HY - 1 - k, xs = x0 + k * 3; for (let i = 0; i <= 13; i++) { const y = y0 + ((i >> 2) & 1 ? -1 : 0) * (k ? 1 : 0); pp(xs + i, y, i & 1 ? HAIR_C[2] : HAIR_C[3]); pp(xs + i, y - 1, HAIR_C[0]); pp(xs + i, y + 1 > HY ? HY : y + 1, k ? HAIR_C[1] : HAIR_C[0]); }
      const cx = xs + 15, cy = y0 - 1; pp(cx - 1, cy, HAIR_C[2]); pp(cx + 1, cy, HAIR_C[1]); pp(cx, cy - 1, HAIR_C[3]); pp(cx, cy + 1, HAIR_C[1]); pp(cx - 1, cy - 1, HAIR_C[0]); pp(cx + 1, cy + 1, HAIR_C[0]);
      pp(xs - 1, y0, 63); pp(xs - 2, y0, 17); pp(xs, y0, 63); pp(xs - 3, y0 - 1, 17); }
  }
  function blitSpr(s, X, Y, dq, sh) { const o = s.out; for (let y = 0; y < s.h; y++) { const dx = RD((y - s.oy) * (sh || 0)); for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c === 255 || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue; const yy = Y - s.oy + y; if (yy > HY) continue; put(X - s.ox + x + dx, yy, c); } } }   // sh：按行错位（斜着飘）
  const CANDY_C = [12, 63, EL[1]], SUGAR_C = [18, 17, 21];
  function discPut(cx, cy, half, dq) {                                   // 糖面（直接画色板色）；half：0 整片 · -1 左半 · 1 右半
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
      const d = Math.hypot(dx, dy); if (d > 4.5 || (half < 0 && dx > 0) || (half > 0 && dx < 1)) continue; const X = cx + dx + (half < 0 ? -1 : half > 0 ? 1 : 0), Y = cy + dy; if (Y > HY) continue;
      if (dq > 0 && bayer(X, Y) < dq) continue;
      const edge = d > 3.6 || (half < 0 && dx === 0) || (half > 0 && dx === 1), sh = dx + dy > 2 ? 0 : dx + dy < -3 ? 2 : 1;
      const v = (((Math.atan2(dy, dx) / 6.2832) * 2 + d / 2.1) % 2 + 4) % 2;
      put(X, Y, edge && (dx + dy > 0 || half) ? 11 : d < 1.1 ? (half ? 12 : 63) : v < 1 ? CANDY_C[sh] : SUGAR_C[sh]);
    }
  }
  function drawDeathProps(f12) {
    if (E.state !== DEATH || E.stT < T_POP) return; const u = E.stT - T_POP, dq = clamp01((E.stT - T_POP - 1.3) / 0.6);
    // 双马尾：先悬着 0.15 s，再慢慢飘下，左右晃
    for (let k = 1; k >= 0; k--) {                                       // 两条马尾各飘各的（远侧先画、近侧压在上面）：近侧先落（早 2 帧），近侧往前歪、远侧往后歪
      const uk = u - k * (2 / 12), sgn = k ? -1 : 1;
      if (uk < 0.6) { const tq = clamp01((uk - 0.15) / 0.45); blitSpr(tailSpr[k], HX - 2 + sgn * RD(2 * tq) + RD(Math.sin(uk * 9 + k * 2) * 2 * tq), HY - 3 + RD(ease.in(tq) * 8), 0, -sgn * 0.3 * tq); }
      else tailsDown(HX - 4, dq, f12, k);                                 // 落地摊开：长发 + 大卷 + 糖果发夹
    }
    // 棒棒糖：糖棍变长后往身后倒（不砸到假人身上），落地（0.4 s）后裂成两半
    const q = clamp01(u / 0.4), a = lolA + (-Math.PI / 2 - lolA) * ease.in(q), bx = lolX, by = lolY;
    if (q < 1) { const cx = RD(bx + Math.sin(a) * (STICK + 5)), cy = RD(by - Math.cos(a) * (STICK + 5)); for (let k = 0; k <= STICK + 1; k++) { const x = RD(bx + Math.sin(a) * k), y = RD(by - Math.cos(a) * k); if (y <= HY) put(x, y, k & 1 ? 6 : 17); } discPut(cx, Math.min(cy, HY - 4), 0, 0); }
    else { const gy = HY - 4, cx = RD(bx - STICK - 5), sp = Math.min(2, RD((u - 0.4) * 10)); for (let x = cx + 5; x <= bx; x++) if (!(dq > 0 && bayer(x, HY) < dq)) put(x, HY, x & 1 ? 6 : 17); discPut(cx - sp, gy, -1, dq); discPut(cx + sp, gy, 1, dq); }
  }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx - P.bx), P.rim, EL, f12); }
  function fxFront(f12) {
    const gx = wx(P.gx - P.bx), gy = HY + P.gy;
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.nolol) { const L = P.gem === 3 ? 7 : 5 + (f12 & 1); for (let r = 5; r <= L; r++) { const c = r <= 5 ? EL[0] : EL[1]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } }   // 糖心星芒（在糖面外）
    drawCrack(f12); drawWolfHead(f12);
    drawDeathProps(f12);
  }

  return {
    name: '糖果女孩', HX, R_EL, R_HURT: FXI.dust, DUR, hero, P, GLOW_MATS: [M.core, M.eyeG, M.hole], HIT_POINT: [1, -14], EVENTS,
    deathKit: { mode: 'burst', at: T_POP },
    SFX: { body: 'stone', how: 'explode', pal: 'fire', style: 'summon', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
