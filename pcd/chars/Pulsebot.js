// 脉冲机器人（部队 · 虚空 · 先锋 · 稀有）：矮壮方块步行机甲——肩上两根竖天线（顶灯）、比头还大的液压活塞拳、背后方形电池背包冒烟、胸口紫色脉冲核心。
// 攻击 = 冲拳（液压筒弹出 5 格直拳，拳尖炸开冲击波）；技能 = 特性「花岗岩皮肤」生效：石质装甲板逐块合拢、装甲锁死，钢蓝点阵护盾挡下三发敌弹。
// 升级成「天空机器人」（Skybot.js）：同一台机器——天线、活塞拳、紫核心、目镜保留，背包换成钢翼、腿换成推进器。
PCD.define('Pulsebot', (E) => {
  const { parts, Sprite, bake, begin, part, sp, run, rect, line, brush, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, shoot, death, sfx } = E;
  const RD = Math.round;

  // ───── 元素：花岗岩皮肤 · 岩灰钢蓝（steel：白 → 银 → 灰蓝 → 铁 → 深铁）；石屑 dust / earth，核心闪光点缀 curse 紫 ─────
  const R_EL = FXI.steel, EL = FXR[R_EL], R_IMP = FXI.impact, R_CHIP = FXI.earth, R_ASH = FXI.dust, R_PULSE = FXI.curse;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    gran: { r: [0, 9, 10, 18], band: 2 },          // 花岗岩装甲（stone 色阶提亮一级）：躯干大块
    stone: [0, 9, 10, 18],                         // 同色小块（拳、肩甲、背包、小腿）
    shell: [0, 10, 18, 17],                        // 技能时合拢的石质外壳板
    joint: 'steel', rod: [27, 29, 30, 31], gold: 'gold',
    ink: { r: 'ink', flat: 1 }, core: { r: 'purple', flat: 1 }, glow: { r: [43, 43, 21, 21], flat: 1 }, eye: { r: [25, 42, 43, 21], flat: 1 },
  });
  const BODY = { body: 'stocky', leg: 6, torso: 11, head: 5, headW: 7, sw: 7, arm: 9, lw: 3, stride: 3, lift: 2 };
  const HX = 76, DUR = DEFAULT_DUR.slice();                     // 近战：前冲 2 + 内杆 5，拳面够到 x≈95
  const hero = new Sprite(62, 48, 30, 43);                      // 脚底 = (30, 43)；放得下背板外翻、伸直的活塞拳、滚到身后的头盔
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['core', 'glow', 'eye', 'ink', 'gold', 'rod']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前拳 hx / hy（活塞拳收回时的拳心），ext 内杆伸出格数；后拳 bhx / bhy ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, ext: 0, lean: 0, crouch: 0, bob: 0, step: 0, wup: 0, walk: 0, head: 0, gem: 0, lamp: 0, plates: 0, pop: 0, ant: 0, vent: 0,
    eyes: 0, flash: 0, rim: 0, dq: 0, bx: 0, st: 0, headOff: 0, hatX: 0, hatY: 0, hrot: 0, shed: 0, lying: 0, lift: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, crouch: crouch || 0 });
  const K_IDLE = K(9, -9, 6, -14);
  const K_WIND = K(5, -12, 4, -14, -1, 1);                      // 蓄势：拳收到胸前
  const K_PUNCH = K(9, -12, 3, -13, 1, 0);                      // 出手：直拳平胸
  const K_HOLD = K(9, -11, 4, -14, 1, 0);
  const K_GUARD = K(7, -16, 8, -12, 0, 1);                      // 蓄力：前拳护到下巴、后拳横在胸前
  const K_LOCK = K(8, -14, 9, -11, 0, 2);                       // 施放：装甲锁死一震
  const K_HURT = K(6, -10, 3, -13, -1, 0);
  const K_SAG = K(7, -6, 4, -8, 1, 3);                          // 死亡：双膝砸地，拳垂到地上
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 31], ['hy', -40, 7], ['bhx', -16, 31], ['bhy', -40, 7], ['ext', 0, 7], ['lean', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1]]);
  const KEY2 = parts.keyer([['gem', 0, 4], ['lamp', 0, 1], ['plates', 0, 6], ['pop', 0, 2], ['ant', -2, 2], ['vent', 0, 1], ['eyes', 0, 1], ['flash', 0, 1], ['rim', 0, 3],
    ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['headOff', 0, 1], ['hatX', -31, 0], ['hatY', -2, 24], ['hrot', 0, 3], ['shed', 0, 2]]);
  const ANT_IDLE = [0, 1, 0, -1];
  const T_HIT = 2 / 12, T_SHED = INCOMING + 0.34, T_POP = INCOMING + 0.5, T_KNEE = INCOMING + 0.66, T_BOOM = INCOMING + 1.16;
  const PLATE_T0 = 0.25, PLATE_DT = 2 / 12;                    // 蓄力：从 0.25 s 起每 2 帧合拢一块外壳板

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.ext = 0; P.bob = 0; P.step = 0; P.wup = 0; P.walk = 0; P.gem = 0; P.lamp = 0; P.plates = 0; P.pop = 0; P.ant = 0; P.vent = 0;
    P.eyes = 0; P.flash = 0; P.rim = 1; P.dq = 0; P.headOff = 0; P.hatX = 0; P.hatY = 0; P.hrot = 0; P.shed = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.ant = ANT_IDLE[(b + 1) & 3];
      P.gem = b & 1 ? 0 : 1; P.lamp = b & 1 ? 0 : 1;                                   // 待机：核心按节拍一亮一灭，天线灯跟着闪
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6); P.vent = f < 3 ? 1 : 0; P.bob = f === 0 ? 1 : f === 1 ? 0 : P.bob; P.ant = f === 0 ? -1 : f === 1 ? 2 : 1; }   // 个性：排气管喷一口汽，身体一顿
    };
    const plateOpen = (u) => { const i = Math.floor((u - PLATE_T0) / PLATE_DT + 1e-6); if (u < PLATE_T0) return; P.plates = Math.min(6, i + 1); const inI = u - PLATE_T0 - i * PLATE_DT; P.pop = i < 6 ? (inI < 1 / 12 - 1e-6 ? 2 : 0) : 0; };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 机械重步：接触帧下沉 1 格，天线一甩；双拳随步反向摆
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq));
      P.hx = K_IDLE.hx + P.step; P.bhx = K_IDLE.bhx - P.step; P.ant = P.step ? -P.step : (P.wup === 2 ? 1 : -1); P.gem = P.step ? 1 : 0; P.lamp = P.gem;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.ant = 1; }
      else if (tq < 0.2) { setK(K_PUNCH, K_PUNCH, 0); P.bx = 2; P.ext = 5; P.gem = 2; P.rim = 2; P.ant = -2; P.lamp = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_PUNCH, K_HOLD, q); P.bx = 2 - RD(q); P.ext = RD(5 - 3 * q); P.gem = 1; P.ant = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(1 - q); P.ext = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 双拳护胸，外壳板逐块合拢
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_GUARD, q); plateOpen(tq);
      P.gem = tq < 0.45 ? 1 : tq < 1.0 ? ((f12 & 1) ? 2 : 1) : ((f12 & 1) ? 3 : 2); P.lamp = f12 & 1; P.rim = 2; P.ant = q > 0.5 ? ((f12 & 1) ? 1 : 0) : 0;
    } else if (st === CAST) { setK(K_LOCK, K_LOCK, 0); if (tq >= 2 / 12) P.crouch = 1; P.plates = 6; P.gem = 3; P.rim = 3; P.lamp = 1; P.ant = tq < 2 / 12 ? 2 : 0; }   // 锁死一震（2 帧）后纹丝不动
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_LOCK, K_IDLE, q); P.crouch = RD(1 - q);
      P.plates = Math.max(0, 6 - Math.floor(clamp01((tq - 0.08) / 0.5) * 7 + 1e-6)); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ant = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.ant = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 散架：肩甲 / 天线崩落 → 头盔弹飞 → 双膝砸地 → 核心闪三下 → 小爆 → 死亡套件 parts
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ant = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        const q = ease.inOut(clamp01((d - 0.3) / 0.36)); setK(K_HURT, K_SAG, q); P.bx = -2; P.eyes = 1; P.shed = d >= T_SHED - INCOMING ? 2 : 1;
        P.crouch = d < 0.66 ? Math.min(2, RD(1 + q * 2)) : 3; P.ant = 0;
        if (d >= 0.5) {                                                // 头盔弹飞：抛物线落到身后，边飞边按 90° 翻滚，落地后倒扣
          const hq = clamp01((d - 0.5) / 0.35), n = Math.min(6, Math.floor((d - 0.5) * 12 + 1e-6));
          P.headOff = 1; P.hatX = RD(-13 * hq - (d > 0.85 ? Math.min(3, (d - 0.85) * 12) : 0)); P.hatY = RD(17 * (1 - hq) + Math.sin(hq * Math.PI) * 6); P.hrot = (4 - (n & 3)) & 3;
        }
        if (d < 0.66) P.gem = 1;
        else if (d < 1.16) { const n = Math.floor((d - 0.66) * 12 + 1e-6); P.gem = n % 2 === 0 ? 3 : 4; P.rim = n % 2 === 0 ? 2 : 0; }   // 核心闪三下
        else { P.gem = 4; P.dq = 1; }                                  // 之后由死亡套件（散架）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.gem = 2;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + P.bob; P.lean = RD(P.lean); P.crouch = RD(P.crouch);
    P.hy += Math.min(3, P.crouch); P.bhy += Math.min(3, P.crouch);
    const R = parts.rig(P, BODY), c = coreAt(R); P.gx = c[0] + P.bx; P.gy = c[1];
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  const shift = (R, y) => RD(R.lean * (1 - clamp01((y - R.yS) / Math.max(1, R.yHip - R.yS))));
  const coreAt = (R) => [1 + shift(R, R.yS + 7), R.yS + 7];
  function thick(x0, y0, x1, y1, r, m) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) brush(x0 + (x1 - x0) * s / n, y0 + (y1 - y0) * s / n, r, m, 0); }
  // 候选部件：天线——1 格钢杆，尖端随 sway 甩动，顶上 1 格灯（lamp 1 = 亮）
  function antenna(x0, y0, h, sway, m, lit) {
    part();
    for (let k = 0; k <= h; k++) { const q = k / h; sp(x0 - RD(sway * q * q * 1.4), y0 - k, m, k === h ? 4 : 0); }
    const tx = x0 - RD(sway * 1.4); sp(tx, y0 - h - 1, lit ? M.glow : M.core, lit ? 3 : 1); sp(tx, y0 - h - 2, lit ? M.core : M.core, lit ? 4 : 2);
  }
  // 候选部件：电池背包——方箱 + 3 格电量灯（跟核心亮度）+ 顶上排气管（vent 1 = 盖子弹起）
  function battery(R) {
    const L = R.lean, x0 = -13 + L, y0 = R.yS - 2;
    part();
    rect(x0, y0, 6, 11, M.stone, 0); run(y0, x0 + 1, x0 + 4, M.stone, 4);
    for (let y = y0 + 2; y <= y0 + 8; y += 3) { run(y, x0 + 1, x0 + 4, M.stone, 2); }
    for (let k = 0; k < 3; k++) sp(x0 + 1, y0 + 3 + k * 3, M.core, P.gem >= 3 - k ? 4 : P.gem >= 1 ? 2 : 1);
    sp(x0 + 5, y0 + 1, M.joint, 4); sp(x0 + 5, y0 + 9, M.joint, 4);
    part();
    const vy = y0 - 1 - P.vent; rect(x0 + 2, y0 - 2, 2, 2, M.joint, 0); run(vy - 1, x0 + 1, x0 + 4, M.joint, 0);
  }
  // 候选部件：机甲短腿——液压胯关节（钢）+ 石甲小腿 + 宽脚掌（钢包头），far = 远侧（暗一级）
  function mechLeg(hx, fx, up, far, yH, cr) {
    const mJ = far ? M.jointD : M.joint, mG = far ? M.stoneD : M.stone;
    part();
    const ay = -1 - up, top = yH + 1, kx = RD((hx + fx) / 2) + (up ? 1 : 0) + (cr >= 2 ? 2 : 0), ky = Math.min(ay - 2, RD((top + ay) / 2));
    thick(hx, top - 1, kx, ky, 1, mJ);
    for (let y = ky; y < ay; y++) run(y, fx - 2, fx + 1, mG, 0);
    sp(fx + 2, ky, mG, 0); sp(fx + 2, ky + 1 < ay ? ky + 1 : ky, mG, 2);
    run(ay, fx - 3, fx + 3, mG, 0); run(ay + 1, fx - 3, fx + 3, mG, 0);
    sp(fx + 3, ay, mJ, 4); sp(fx + 3, ay + 1, mJ, 0); sp(fx + 2, ay + 1, mJ, 0); sp(fx - 3, ay + 1, mG, 2);
  }
  // 候选部件：方箱机甲躯干——宽肩（肩行外扩 1 格）、切角、竖横分缝、花岗岩斑点、胯下金黑警示斜纹；胸口圆形脉冲核心（5 档）嵌在同一部件里
  const CORE_LV = [   // [中心, 十字, 四角] 的 [材质, 色调]：待机暗 / 蓄力 1 / 蓄力 2 / 施放 / 熄灭
    [['core', 3], ['core', 2], ['core', 1]], [['core', 4], ['core', 3], ['core', 2]], [['glow', 3], ['core', 4], ['core', 3]], [['glow', 3], ['glow', 3], ['core', 4]], [['core', 1], ['core', 1], ['core', 1]],
  ];
  function torso(R) {
    const yS = R.yS, yH = R.yHip;
    part();
    for (let y = yS; y <= yH; y++) {
      const s = shift(R, y), sh = y <= yS + 3 ? 1 : 0; let x0 = -6 - sh + s, x1 = 6 + sh + s;
      if (y === yS || y === yH) { x0++; x1--; }
      for (let x = x0; x <= x1; x++) {
        let m = M.gran, t = 0;
        if (y >= yH - 1) { m = ((x - y) & 3) < 2 ? M.gold : M.ink; t = m === M.gold ? 3 : 0; }
        else if (x === -2 + s && y > yS + 1 && y < yH - 2) t = 2;
        else if (y === yS + 9 && x > x0 && x < x1) t = 2;
        else if (((x * 7 + y * 5) % 11) === 0 && x > x0 && x < x1 && y > yS) t = 2;
        sp(x, y, m, t);
      }
    }
    const c = coreAt(R), lv = CORE_LV[P.gem];
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) {
      const a = Math.abs(i), b = Math.abs(j); if (a === 2 && b === 2) continue;
      if (a === 2 || b === 2) { sp(c[0] + i, c[1] + j, M.joint, (i < 0 || j < 0) ? 4 : 2); continue; }
      const L = a + b === 0 ? lv[0] : a + b === 1 ? lv[1] : lv[2]; sp(c[0] + i, c[1] + j, M[L[0]], L[1]);
    }
  }
  // 候选部件：嵌肩头盔——钢盔、盔顶小脊、1 行目镜缝 + 2 格发光眼；T = 落笔变换（在身上 / 滚在地上），盔心为原点，5 行 × 7 列
  function helm(T, eyes) {
    part();
    const px = (x, y, m, t) => parts.px(E, T, x, y, m, t);
    for (let y = -2; y <= 2; y++) for (let x = -3; x <= 3; x++) { if (y === -2 && (x === -3 || x === 3)) continue; px(x, y, M.joint, 0); }
    px(-1, -3, M.joint, 4); px(0, -3, M.joint, 3);
    for (let x = -1; x <= 3; x++) px(x, 0, M.ink, 0);
    if (!eyes) { px(2, 0, M.eye, 3); px(3, 0, M.eye, 4); }
    px(-2, 1, M.joint, 4);
  }
  // 候选部件：液压活塞臂——上臂 + 肘球 + 液压筒（金箍）+ 伸出的抛光内杆；返回拳心
  function armGeo(R) {
    const Sx = 4 + R.lean, Sy = R.yS + 2, Ex = Sx + 1, Ey = Sy + 6, a = Math.atan2(P.hy - Ey, P.hx - Ex), k = RD(a / (Math.PI / 4));
    const dx = RD(Math.cos(k * Math.PI / 4)), dy = RD(Math.sin(k * Math.PI / 4));
    return { Sx, Sy, Ex, Ey, dx, dy, lx: P.hx - 4 * dx, ly: P.hy - 4 * dy, fx: P.hx + P.ext * dx, fy: P.hy + P.ext * dy };
  }
  function pistonArm(R, g) {
    part();
    thick(g.Sx, g.Sy, g.Ex, g.Ey, 1, M.joint); brush(g.Ex, g.Ey, 1.5, M.joint, 0); sp(g.Ex, g.Ey, M.joint, 4);
    thick(g.Ex, g.Ey, g.lx, g.ly, 1.2, M.joint);
    const bx = RD(g.lx - g.dx), by = RD(g.ly - g.dy); sp(bx, by, M.gold, 4); sp(bx - g.dy, by + g.dx, M.gold, 3); sp(bx + g.dy, by - g.dx, M.gold, 2);
    if (P.ext > 0) for (let k = 1; k <= P.ext + 1; k++) rect(RD(g.lx + g.dx * k) - (g.dx < 0 ? 1 : 0), RD(g.ly + g.dy * k) - (g.dy < 0 ? 1 : 0), 2, 2, M.rod, 0);
  }
  // 候选部件：活塞拳——7×6 石拳 + 前 2 列钢指虎（3 道指缝）+ 金黑腕带；far = 后拳（5×5，暗一级）
  function fist(x, y, far) {
    part();
    if (far) { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (!(Math.abs(i) === 2 && Math.abs(j) === 2)) sp(x + i, y + j, i >= 1 ? M.jointD : M.stoneD, 0); return; }
    for (let j = -3; j <= 2; j++) for (let i = -3; i <= 3; i++) {
      if ((i === 3 || i === -3) && (j === -3 || j === 2)) continue;
      let m = i >= 2 ? M.joint : M.stone, t = 0;
      if (i >= 2 && (j === -1 || j === 1)) t = 1;
      if (i === -3 && j > -3 && j < 2) { m = (j & 1) ? M.gold : M.ink; t = m === M.gold ? 3 : 0; }
      sp(x + i, y + j, m, t);
    }
    sp(x - 1, y - 2, M.stone, 4); sp(x + 1, y + 1, M.stone, 2);
  }
  // 候选部件：大肩甲——圆顶石甲、2 颗铆钉、下沿金黑警示条
  function pauldron(R) {
    const yS = R.yS, L = R.lean;
    part();
    run(yS, -2 + L, 5 + L, M.stone, 0);
    for (let y = yS + 1; y <= yS + 3; y++) run(y, -3 + L, 6 + L, M.stone, 0);
    for (let x = -2 + L; x <= 5 + L; x++) { const g = ((x + yS) & 1) === 0; sp(x, yS + 4, g ? M.gold : M.ink, g ? 3 : 0); }
    sp(-1 + L, yS + 1, M.joint, 4); sp(4 + L, yS + 1, M.joint, 4); sp(0 + L, yS, M.stone, 4); sp(1 + L, yS, M.stone, 4);
  }
  // 候选部件：外壳板（技能）——按序合拢的 6 块石质装甲板；最新的一块先外翻 pop 格再合拢
  function plateList(R) {
    const yS = R.yS, L = R.lean;
    return [[-3 + L, yS - 7, 9, 2, 0, -1], [-15 + L, yS - 1, 2, 10, -1, 0], [7 + L, yS + 4, 2, 7, 1, 0], [R.footFx + 3, -5, 2, 4, 1, 0], [-9 + L, R.yHip - 3, 3, 4, -1, 0], [-9 + L, yS - 3, 4, 2, 0, -1]];
  }
  function plates(R) {
    const L = plateList(R);
    for (let i = 0; i < P.plates; i++) {
      const [x, y, w, h, ox, oy] = L[i], o = i === P.plates - 1 ? P.pop : 0; part();
      rect(x + ox * o, y + oy * o, w, h, M.shell, 0); sp(x + ox * o, y + oy * o, M.shell, 4);
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0); const R = parts.rig(P, BODY), yS = R.yS, L = R.lean;
    if (P.shed < 2) { antenna(-8 + L, yS - 3, 9, P.ant, M.jointD, P.lamp); antenna(-4 + L, yS - 1, 8, P.ant, M.joint, P.lamp); }
    battery(R);
    part(); thick(-2 + L, yS + 3, P.bhx, P.bhy, 1, M.jointD); fist(P.bhx, P.bhy, 1);
    mechLeg(R.legBx, R.footBx, R.footBup, 1, R.yHip, R.cr);
    mechLeg(R.legFx, R.footFx, R.footFup, 0, R.yHip, R.cr);
    torso(R);
    if (P.headOff) helm({ r0: P.hrot, tx: 1 + P.hatX, ty: -2 - P.hatY, rot: 0, ox: 0, oy: 0 }, 1);
    else helm({ r0: 0, tx: 1 + L, ty: yS - 2, rot: 0, ox: 0, oy: 0 }, P.eyes);
    const g = armGeo(R); pistonArm(R, g);
    if (P.shed < 1) pauldron(R);
    fist(g.fx, g.fy, 0);
    plates(R);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  let smT = 9, smX = 0, smY = 0, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastVent = 0, lastPlates = 0, lastShed = 0;
  const hitT = [9, 9, 9], hitA = [0, 0, 0];
  const DOME = { x: 0, rx: 16, ry: 28 }, SHOT_Y = [-22, -13, -5];
  function steam(x, y, n, up) { for (let i = 0; i < n; i++) spawn(K_EMBER, x + (Math.random() - 0.5) * 2, y, (Math.random() - 0.5) * 10, -(up || 12) - Math.random() * 10, 0.4 + Math.random() * 0.4, R_ASH); }
  function dust(x, n, spd) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * spd, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function chips(x, y, n, dir) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x, y, (dir || 0) * (10 + Math.random() * 30) + (Math.random() - 0.5) * 20, -20 - Math.random() * 40, 0.7 + Math.random() * 0.4, R_ASH, { g: 280, floor: HY, sz: Math.random() < 0.3 ? 2 : 1 }); }
  function enemyShot(i) { const dy = SHOT_Y[i], tx = DOME.x + DOME.rx * Math.sqrt(Math.max(0, 1 - (dy / DOME.ry) ** 2)); shoot(1, 132, HY + dy, -320, RD(tx), FXI.enemy, 0, { glow: -1 }); }
  function onEnter(s) {
    if (s !== CAST) return;
    DOME.x = wx(-1); const cx = wx(P.gx), cy = wy(P.gy);
    fx.dome(DOME.x, HY, DOME.rx, DOME.ry, R_EL, 1.2, 2);                 // 钢蓝点阵护盾：按角度逐点亮起
    releaseOrbit(40, 90, 0.3, 0.6); burst(cx, cy, 24, 50, 120, 0.25, 0.55, R_EL, 12); ring(cx, cy, 1, R_EL); fx.cross(cx, cy, 6, R_EL, 0.3);
    dust(wx(0), 8, 50); fx.crack(wx(2), HY + 1, 6, 1, R_CHIP, 0.8); fx.crack(wx(-4), HY + 1, 6, -1, R_CHIP, 0.8);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'metal', w: 0.85 });
    enemyShot(0);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                // 冲拳：拳尖炸开冲击波
      const g = armGeo(parts.rig(P, BODY)), tx = wx(g.fx + 4 + P.bx), ty = wy(g.fy);
      smT = 0; smX = tx; smY = ty;
      ring(tx, ty, 0, R_EL); fx.cross(tx, ty, 4, R_EL, 0.2); burst(tx, ty, 12, 40, 110, 0.15, 0.35, R_IMP, 8);
      fx.crack(tx - 1, HY + 1, 5, 1, R_EL, 0.4); fx.crack(tx - 3, HY + 1, 4, -1, R_EL, 0.4);
      steam(wx(g.Ex + P.bx), wy(g.Ey), 3, 8);
      hitDummy(0); dummyFx({ dur: 0.7, outline: R_PULSE }); sfx('swing', { kind: 'smash', w: 0.85 }); sfx('hit', { mat: 'metal', w: 0.8 });
    }
    if (s === CAST && (t === 1 / 12 || t === 3 / 12)) enemyShot(t === 1 / 12 ? 1 : 2);
    if (s === DEATH && t === T_SHED) { chips(wx(2), wy(-16), 6, 1); burst(wx(-6), wy(-24), 6, 30, 70, 0.2, 0.4, R_EL, 10); }
    if (s === DEATH && t === T_POP) { burst(wx(1), wy(-19), 8, 30, 80, 0.2, 0.4, R_IMP, 16); sfx('hit', { mat: 'metal', w: 0.4 }); }
    if (s === DEATH && t === T_KNEE) { dust(HX - 2, 12, 36); shake(0.1, 1); sfx('fall', { w: 0.85 }); }
    if (s === DEATH && t === T_BOOM) {                                 // 核心小爆 → 散架
      poseAt(DEATH, T_BOOM - 1 / 12, T_BOOM - 1 / 12); P.gem = 4; P.rim = 0; P.k1 = KEY1(P); P.k2 = KEY2(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      const cx = P.gx, cy = P.gy;
      death.start('parts', { power: 0.7, fromX: cx, fromY: cy, push: -6, fadeAt: 0.85, fadeDur: 0.5 });
      burst(wx(cx), wy(cy), 16, 40, 100, 0.2, 0.5, FXI.magic, 16); burst(wx(cx), wy(cy), 8, 60, 120, 0.4, 0.8, R_EL, 30); ring(wx(cx), wy(cy), 0, R_PULSE);
      steam(wx(cx), wy(cy) - 2, 6, 16); shake(0.14, 1); sfx('hit', { mat: 'metal', w: 0.6 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [1 / 12, 3 / 12], [], [], [T_SHED, T_POP, T_KNEE, T_BOOM], []];
  function impactOn(k, x, y) {                                          // 敌弹打在护盾上：那一段变白，敌弹碎成灰色石屑
    if (k !== 1) return;
    let i = 0; for (let j = 1; j < 3; j++) if (hitT[j] > hitT[i]) i = j;
    hitT[i] = 0; hitA[i] = Math.atan2((y - HY) / DOME.ry, (x - DOME.x) / DOME.rx);
    chips(x, y, 6, 1); burst(x, y, 6, 30, 70, 0.1, 0.25, R_EL, 6); sfx('impact', { pal: 'metal', w: 0.45 });
  }
  function hurtFx(s) {                                                  // 金属 + 石：火花、白火星、灰色石屑
    const hx = HX + 2, hy = HY - 14; burst(hx, hy, s === DEATH ? 26 : 22, 60, 150, 0.2, 0.5, R_IMP, 20); burst(hx, hy, 4, 60, 120, 0.6, 0.9, R_EL, 30); chips(hx, hy, 5, -1);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                             // 灰色石屑螺旋收拢到胸口核心
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, wx(P.gx), wy(P.gy), (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, Math.random() < 0.6 ? R_CHIP : R_EL, a, r, 4 + Math.random() * 3); }
      if (P.plates > lastPlates && P.plates > 0) { const p = plateList(parts.rig(P, BODY))[P.plates - 1]; burst(wx(p[0] + p[2] / 2 + P.bx), wy(p[1] + p[3] / 2), 5, 20, 50, 0.1, 0.25, R_EL, 4); }
    }
    lastPlates = state === CHARGE ? P.plates : 0;
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.85 }); dust(wx(P.step > 0 ? 5 : -7), 3, 18); steam(wx(-2), HY - 5, 1, 6); } lastStep = P.step; }
    if (state === IDLE && P.vent !== lastVent) { if (P.vent) steam(wx(-10), HY + R0yS() - 5, 6, 16); lastVent = P.vent; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 24, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT += dt; for (let i = 0; i < 3; i++) hitT[i] += dt;
  }
  const R0yS = () => parts.rig(P, BODY).yS;
  function fxReset() { smT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastVent = 0; lastPlates = 0; lastShed = 0; hitT.fill(9); }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) {                         // 核心星芒
      const gx = wx(P.gx), gy = wy(P.gy), Lr = P.gem === 3 ? 5 : 3 + (f12 & 1);
      for (let r = 3; r <= Lr; r++) { const c = r <= 3 ? EL[0] : r <= 4 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
    if (smT < 2 / 12) {                                                 // 冲拳速度线（2 帧）
      const c = smT < 1 / 12 ? EL[0] : EL[2];
      for (const [dy, len] of [[-2, 7], [0, 10], [2, 6]]) for (let k = 5; k < 5 + len; k++) { if (smT >= 1 / 12 && (k & 1)) continue; put(smX - k, smY + dy, c); }
    }
    for (let i = 0; i < 3; i++) {                                       // 护盾被打处那一段变白
      if (hitT[i] >= 0.2) continue; const c = hitT[i] < 1 / 12 ? EL[0] : EL[1];
      for (let k = -4; k <= 4; k++) { const a = hitA[i] + k * 0.07; put(RD(DOME.x + Math.cos(a) * DOME.rx), RD(HY + Math.sin(a) * DOME.ry), Math.abs(k) > 2 ? EL[1] : c); }
    }
  }

  return {
    name: '脉冲机器人', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.core, M.glow, M.eye], HIT_POINT: [3, -14], EVENTS,
    deathKit: { mode: 'parts', at: T_BOOM },
    SFX: { body: 'machine', how: 'collapse', pal: 'metal', style: 'shield', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
