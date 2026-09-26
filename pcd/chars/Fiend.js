// 恶鬼（敌人 · 野兽 · 普通 · 近战 240）：「尽管四肢纤细，但很肉。」细肢巨躯——一颗直径 18 格的灰白球形巨躯架在两条竹竿般的反关节细腿上，
// 两条细臂垂到脚踝、末端是比手臂还粗的三指长爪；小脑袋顶在球上像个疙瘩，一对细长弯角、两团鬼火眼；胸口裂开一张竖着的大嘴。
// 攻击 = 两臂一前一后交替横扫（爪痕三道弧）；技能（无特性，表现「很肉」）= 恶鬼吞噬：细臂撑地、胸口竖嘴张到最大把鬼火吸进去，
// 射出吸力束把目标拖近，大嘴猛地合上咬住。死亡 = 折腿泄气：细腿先折，巨腹落地弹一下，像泄了气的皮球一样瘪下去，冒尽鬼火烟后化灰。
PCD.define('Fiend', (E) => {
  const { parts, Sprite, bake, begin, part, sp, run, line, rect, ellipse, ease, clamp01, q12, f12of, walkDemo, near, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_EMBER, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, clearOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, death, sfx } = E;
  const RD = Math.round;

  // ───── 元素：恶鬼 · 鬼火蓝紫（magic：白 → 青 → 蓝 → 紫 → 深紫）；烟与化灰用 soul ─────
  const R_EL = FXI.magic, EL = FXR[R_EL], R_SMOKE = FXI.soul;

  // ───── 材质：灰紫病态肉皮（设定色经 near() 就近取共享色）、墨紫四肢、酒红竖嘴、骨白牙与爪尖、墨角、鬼火眼 ─────
  const FLESH = ['#1a1620', '#4a4458', '#7e788a', '#b0aab8'].map((h) => near(h));
  const M = parts.mats(E, {
    flesh: { r: FLESH, band: 2 }, head: FLESH, limb: 'shadow', claw: 'bone', horn: [0, 0, 52, 10],
    maw: 'blood', teeth: 'bone', tongue: 'pink',
    eye: { r: [25, 24, 23, 22], flat: 1 }, glow: { r: [22, 22, 21, 21], flat: 1 },
  });
  const BODY = { body: 'slim', leg: 11, torso: 12, belly: 5, limb: 0.6, lw: 1, head: 5, headW: 5, sw: 5, stride: 4, lift: 3 };
  const HX = 76, DUR = DEFAULT_DUR.slice();                   // 近战：前冲 3 格 + 臂长，爪尖扫到假人
  const hero = new Sprite(68, 50, 32, 45);                    // 脚底 = (32, 45)；放得下过头举爪、扫出去的长臂、摊在地上的四肢
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 10, 14], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['eye', 'glow', 'maw', 'teeth', 'tongue', 'horn', 'claw', 'limb']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前爪 hx / hy、后爪 bhx / bhy（本地坐标）；mouth 竖嘴张开 0–6；fold 腿折 0 站 / 1 软 / 2 折 / 3 断摊；hop 球离地；defl 泄气 0–5 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, crouch: 0, bob: 0, step: 0, wup: 0, walk: 0, mouth: 0, tongue: 0, gem: 0, wisp: 0, eyes: 0, flash: 0, rim: 0, dq: 0,
    bx: 0, st: 0, fold: 0, hop: 0, defl: 0, lying: 0, lift: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -5, -7, -5);
  const K_WIND = K(-4, -29, -7, -6, -1, 1);                   // 预兆：前臂甩到头顶后方
  const K_SW1 = K(19, -19, -9, -8, 1, 0);                     // 第一扫：前臂横扫到胸前
  const K_SW1B = K(15, -12, -12, -12, 1, 0);                  // 前臂下落，后臂甩到身后
  const K_SW2 = K(16, -10, 16, -10, 1, 1);                    // 第二扫：后臂从身后贴地兜过来
  const K_HOLD = K(8, -6, 12, -6, 1, 0);
  const K_BRACE = K(14, -4, -13, -4, 0, 2);                   // 蓄力：两条细臂张开撑地
  const K_BITE = K(15, -5, -12, -5, 1, 1);                    // 施放：前扑咬合
  const K_HURT = K(11, -11, 3, -9, -1, 1);
  const K_SNAP = K(14, -26, -10, -28, 0, 3);                  // 死亡：腿一折，两臂乱挥
  const K_FLAT = K(16, -2, -15, -2, 0, 0);                    // 倒地：四肢摊在地上
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -24, 31], ['hy', -40, 3], ['bhx', -24, 31], ['bhy', -40, 3], ['lean', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1]]);
  const KEY2 = parts.keyer([['mouth', 0, 6], ['tongue', 0, 3], ['gem', 0, 4], ['wisp', 0, 1], ['eyes', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['dq', 0, 48, 48], ['bx', -8, 15], ['st', 0, 8],
    ['fold', 0, 3], ['hop', 0, 3], ['defl', 0, 5]]);
  const SWING = [0, 1, 0, -1];
  const T_SW1 = 2 / 12, T_SW2 = 4 / 12, T_BITE = 3 / 12, T_SNAP = INCOMING + 0.3, T_LAND = INCOMING + 0.66, T_BOUNCE = INCOMING + 0.92, T_ASH = INCOMING + 1.4;

  // ───── 几何（poseAt 和 drawHero 共用一份）─────
  function geo() {
    const R = parts.rig(P, BODY), ry = 8 - P.defl * 0.9, rx = 9 + P.defl * 0.6;
    let bcy = R.yHip - 8;
    if (P.fold >= 3) bcy = -Math.floor(Math.sqrt(ry * ry + 0.3)) - P.hop;   // 腿断了：球底贴地，hop = 弹起格数
    const bcx = R.lean;
    return { R, bcx, bcy, rx, ry, sF: [bcx + 2, bcy - 3], sB: [bcx - 3, bcy - 4], mx: bcx + 5, head: [bcx + 3, RD(bcy - ry) + 1] };
  }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.bob = 0; P.step = 0; P.wup = 0; P.walk = 0; P.mouth = 0; P.tongue = 0; P.gem = 0; P.wisp = (f12 >> 1) & 1; P.eyes = 0; P.flash = 0; P.rim = 1; P.dq = 0;
    P.fold = 0; P.hop = 0; P.defl = 0; P.flip = 0; P.mx = 0;
    const idle = () => {                                                // 钟摆晃：球身在细腿上前后晃，细臂慢一拍甩，嘴一开一合
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6), lag = SWING[(b + 3) & 3];
      P.bob = b & 1; P.lean = SWING[b & 3]; P.hx = K_IDLE.hx - lag * 2; P.bhx = K_IDLE.bhx - lag * 2; P.mouth = b & 1;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.min(4, Math.floor((lp - 1.6) * 12 + 1e-6)); P.mouth = [2, 3, 4, 3, 2][f]; P.tongue = [0, 1, 3, 2, 0][f]; P.gem = f >= 1 && f <= 3 ? 1 : 0; }   // 个性：张嘴吐舌
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 高跷步：反关节细腿大步迈，球身前后晃得厉害，两臂反向甩；轻，不扬尘
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.lean = [1, 0, -1, 0][f]; P.hx = K_IDLE.hx + P.step * 3; P.bhx = K_IDLE.bhx - P.step * 3; P.mouth = P.wup ? 1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                         // 扫：前臂过头 → 横扫；后臂从身后贴地兜过来再扫一下
      if (tq < T_SW1) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.12))); P.gem = 1; P.mouth = 1; }
      else if (tq < T_SW2) { setK(K_SW1, K_SW1B, tq < 3 / 12 ? 0 : 1); P.bx = 3; P.gem = 2; P.rim = 2; P.mouth = 2; }
      else if (tq < 6 / 12) { setK(K_SW2, K_HOLD, tq < 5 / 12 ? 0 : 0.5); P.bx = 3; P.gem = 2; P.rim = 2; P.mouth = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.25)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); P.mouth = 1; }
    } else if (st === CHARGE) {                                         // 细臂张开撑地，胸口竖嘴慢慢张到最大，嘴里鬼火 1 → 2 档
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_BRACE, q);
      P.mouth = Math.min(6, Math.floor(tq / 1.2 * 6 + 1e-6)); P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.tongue = tq > 1.0 ? 1 : 0;
    } else if (st === CAST) {                                           // 吸力束拖近目标 → 前扑，大嘴猛地合上
      const f = Math.min(5, f12of(t)); setK(K_BITE, K_BITE, 0);
      P.bx = [2, 4, 5, 6, 6, 5][f]; P.mouth = f < 3 ? 6 : 0; P.gem = f < 3 ? 3 : 2; P.rim = f < 3 ? 3 : 2;
    } else if (st === RECOVER) {                                        // 嘴里吐出一缕蓝紫烟，四肢收回
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_BITE, K_IDLE, q); P.bx = RD(5 * (1 - q)); P.mouth = tq < 0.4 ? 1 : 0;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.mouth = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.mouth = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 折腿泄气
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.mouth = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_SNAP, K_SNAP, 0); P.bx = -2; P.eyes = 1; P.mouth = 3; P.fold = d < 0.4 ? 1 : 2; P.crouch = d < 0.4 ? 2 : 3; P.gem = 1; }   // 细腿先折
      else {
        setK(K_FLAT, K_FLAT, 0); P.bx = -2; P.fold = 3; P.eyes = 1; P.crouch = 0;
        P.hop = d < 0.58 ? 3 : d < 0.66 ? 1 : d < 0.75 ? 0 : d < 0.83 ? 2 : d < 0.92 ? 1 : 0;                       // 巨腹「啪」地落地，弹一下
        P.defl = d < 0.66 ? 0 : d < 0.75 ? 1 : d < 0.97 ? 0 : Math.min(5, 1 + Math.floor((d - 0.97) / 0.08 + 1e-6));   // 落地一压扁 → 像泄了气的皮球瘪下去
        P.mouth = d < 0.97 ? 2 : d < 1.35 ? 3 : 1; P.gem = d < 0.97 ? ((f12 & 1) ? 1 : 4) : 4;
        if (d >= T_ASH - INCOMING) P.dq = 1;                                                                       // 之后由死亡套件（化灰）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.mouth = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.gem = 1;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy); P.lean = RD(P.lean); P.crouch = RD(P.crouch);
    const g = geo(); P.gx = g.mx + P.bx; P.gy = g.bcy;
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前：后臂 → 远腿 → 近腿 → 远角 → 球躯（竖嘴嵌在里面）→ 疙瘩头 → 近角 → 前臂）─────
  // 候选部件：竹竿细臂——两节等长（各 9 格）的 1 格细臂，肘向后弯并鼓出 1 格骨节；末端三指长爪：2×2 掌 + 三根沿前臂方向张开的 4 格长指，指尖骨白。一个部件
  function stickArm(sx, sy, hx, hy, far) {
    const m = far ? M.limbD : M.limb, c = far ? M.clawD : M.claw, L = 9;
    let dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
    if (d > 2 * L) { hx = sx + dx / d * 2 * L; hy = sy + dy / d * 2 * L; dx = hx - sx; dy = hy - sy; d = 2 * L; }
    const h = Math.sqrt(Math.max(0, L * L - d * d / 4)), px = -dy / d, py = dx / d, ex = (sx + hx) / 2 + px * h, ey = (sy + hy) / 2 + py * h;
    part();
    line(sx, sy, ex, ey, m, 0); line(ex, ey, hx, hy, m, 0); sp(ex + px, ey + py, m, 0);
    const ul = Math.hypot(hx - ex, hy - ey) || 1, ux = (hx - ex) / ul, uy = (hy - ey) / ul;
    rect(RD(hx - 0.5), RD(hy - 0.5), 2, 2, m, 0);
    for (const o of [-0.6, 0, 0.6]) { const vx = ux * Math.cos(o) - uy * Math.sin(o), vy = ux * Math.sin(o) + uy * Math.cos(o); for (let k = 1; k <= 4; k++) sp(hx + vx * (k + 0.6), hy + vy * (k + 0.6), k === 4 ? c : m, 0); }
  }
  // 候选部件：反关节细腿——胯（藏在球底下）→ 向后折的反关节（1 格骨节）→ 细踝 → 前伸三趾（趾尖骨白）+ 1 根后距；
  // fold 1–2 = 膝软 / 折断（关节往后下塌），3 = 断成倒 V 摊在地上（断口翘起一根骨刺）。side 1 = 近侧（倒下时朝前）/ -1 = 远侧
  function revLeg(g, hipX, fx, up, far, side) {
    const m = far ? M.limbD : M.limb, c = far ? M.clawD : M.claw;
    part();
    if (P.fold >= 3) {
      const s = side, lf = far ? 1 : 0, x0 = g.bcx + s * RD(g.rx - 4), x1 = g.bcx + s * RD(g.rx + 2), x2 = g.bcx + s * RD(g.rx + 7);
      line(x0, -1, x1, -4 - lf, m, 0); line(x1, -4 - lf, x2, -1, m, 0); sp(x1, -5 - lf, m, 0); sp(x1 - s, -6 - lf, c, 0);
      sp(x2 + s, -1, m, 0); sp(x2 + 2 * s, -1, c, 0); sp(x2 + s, -2, c, 0);
      return;
    }
    const hy = g.R.yHip - 1, fy = -up, ax = fx - 1, ay = fy - 1;
    const jx = RD((hipX + ax) / 2) - 3 - P.fold * 2, jy = RD((hy + ay) / 2) + P.fold * 2;
    line(hipX, hy, jx, jy, m, 0); line(jx, jy, ax, ay, m, 0); sp(jx - 1, jy, m, 0);
    run(fy, ax - 1, ax + 2, m, 0); sp(ax + 3, fy + (up ? 1 : 0), c, 0); sp(ax - 2, fy, c, 0); sp(ax + 1, fy - 1, m, 0);
  }
  // 候选部件：细长弯角——1 格粗，从头顶往后上方弯出、角尖往后下勾；远侧那根暗一级、错后 2 格、短 1 格
  function horn(g, far) {
    const [hc, b] = g.head, m = far ? M.hornD : M.horn;
    part();
    const pts = far ? [[-2, -5], [-2, -6], [-3, -7], [-3, -8], [-4, -9], [-5, -9], [-6, -8]] : [[0, -5], [1, -5], [0, -6], [0, -7], [-1, -8], [-1, -9], [-2, -10], [-3, -10], [-4, -9]];
    for (const [x, y] of pts) sp(hc + x, b + y, m, 0);
  }
  // 候选部件：疙瘩小头——5 格宽 4 行的肉疙瘩顶在球顶上，眉骨 1 格暗；两团鬼火眼（发光体：gem 0 青 / 1–3 白 / 4 熄灭）+ 近眼上方伸出轮廓的一缕鬼火（wisp 摆动）
  function head(g) {
    const [hc, b] = g.head;
    part();
    run(b - 4, hc - 1, hc + 1, M.head, 0); run(b - 3, hc - 2, hc + 2, M.head, 0); run(b - 2, hc - 2, hc + 3, M.head, 0); run(b - 1, hc - 2, hc + 3, M.head, 0); run(b, hc - 1, hc + 2, M.head, 0);
    sp(hc + 1, b - 3, M.head, 1); sp(hc + 2, b - 3, M.head, 1); sp(hc + 3, b, M.head, 2);
    if (P.eyes) { sp(hc, b - 2, M.head, 1); sp(hc + 2, b - 2, M.head, 1); return; }
    if (P.gem === 4) { sp(hc, b - 2, M.eye, 1); sp(hc + 2, b - 2, M.eye, 1); return; }
    sp(hc + 2, b - 2, P.gem >= 1 ? M.glow : M.eye, P.gem >= 1 ? 3 : 4); sp(hc, b - 2, M.eye, P.gem >= 2 ? 4 : 3);
    sp(hc + 3, b - 3, M.eye, P.gem >= 1 ? 4 : 3); sp(hc + 2 + P.wisp, b - 4, M.eye, 2);
  }
  // 候选部件：球形巨躯——椭圆肉球（band 2），下腹 2 道褶、背上斑点，泄气时起皱；胸口竖嘴嵌在同一部件里：
  // mouth 0 = 一道竖缝 + 交错的牙尖；1–6 = 竖椭圆张口，两侧每 2 行一颗骨白牙、嘴里鬼火按 gem 亮，tongue 1–3 舌头从下唇伸出轮廓
  function ball(g) {
    const { bcx, bcy, rx, ry } = g;
    part();
    ellipse(bcx, bcy, rx, ry, M.flesh, 0);
    for (const s of [0.86, 0.7]) for (let a = 1.85; a <= 2.75; a += 0.12) sp(bcx + Math.cos(a) * rx * s, bcy + Math.sin(a) * ry * s, M.flesh, 2);
    for (const [x, y] of [[-4, -5], [-6, -2], [-2, -6], [-5, 1]]) if (Math.abs(y) < ry - 1) sp(bcx + x, bcy + y, M.flesh, 2);
    if (P.defl >= 2) for (let x = -RD(rx) + 3; x < RD(rx) - 2; x += 3) for (let y = -1; y <= 1; y++) sp(bcx + x + (y & 1), bcy + y, M.flesh, 2);
    const mx = g.mx, h = Math.max(1, RD(ry * 0.62)), w = P.mouth;
    if (w === 0) {
      for (let j = -h; j <= h; j++) sp(mx, bcy + j, M.flesh, 1);
      for (let j = -h + 1; j < h; j += 2) sp(mx + ((j + h) & 2 ? 1 : -1), bcy + j, M.teeth, 0);
      return;
    }
    for (let j = -h; j <= h; j++) {
      const q = j / (h + 0.6), hw = Math.max(0.5, w * 0.5 * Math.sqrt(Math.max(0, 1 - q * q))), x0 = RD(mx - hw + 0.2), x1 = RD(mx + hw - 0.2);
      for (let x = x0; x <= x1; x++) sp(x, bcy + j, M.maw, Math.abs(j) >= h - 1 ? 1 : 0);
      if (((j + h) & 1) === 0 && x1 > x0) { sp(x0, bcy + j, M.teeth, 0); sp(x1, bcy + j, M.teeth, 3); }
    }
    if (P.gem >= 1 && P.gem <= 3 && w >= 2) {
      sp(mx, bcy, P.gem >= 2 ? M.glow : M.eye, P.gem >= 2 ? 3 : 4);
      if (P.gem >= 2) { sp(mx, bcy - 1, M.eye, 4); sp(mx, bcy + 1, M.eye, 4); }
      if (P.gem === 3 && w >= 4) { sp(mx - 1, bcy, M.glow, 3); sp(mx + 1, bcy, M.glow, 3); sp(mx, bcy - 2, M.eye, 3); sp(mx, bcy + 2, M.eye, 3); }
    }
    if (P.tongue) { const tp = [[0, 0], [1, 1], [2, 1], [3, 2]]; for (let k = 0; k <= P.tongue; k++) sp(mx + tp[k][0], bcy + h + tp[k][1], M.tongue, k === P.tongue ? 4 : 0); }
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0); const g = geo(), R = g.R;
    stickArm(g.sB[0], g.sB[1], P.bhx, P.bhy, 1);
    revLeg(g, R.legBx, R.footBx, R.footBup, 1, -1);
    revLeg(g, R.legFx, R.footFx, R.footFup, 0, 1);
    horn(g, 1);
    ball(g);
    head(g);
    horn(g, 0);
    stickArm(g.sF[0], g.sF[1], P.hx, P.hy, 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  let chargeAcc = 0, suckAcc = 0, smokeAcc = 0, emberAcc = 0, lastStep = 0;
  // 某个关键姿势下，手相对肩的角度（斩击弧角度：0 朝上，顺时针为正）
  function armAng(Kp, front) {
    const bcy = -19 + Math.min(Kp.crouch, 3), s = front ? [Kp.lean + 2, bcy - 3] : [Kp.lean - 3, bcy - 4], h = front ? [Kp.hx, Kp.hy] : [Kp.bhx, Kp.bhy];
    return { s, a: Math.atan2(h[0] - s[0], -(h[1] - s[1])), d: Math.hypot(h[0] - s[0], h[1] - s[1]) };
  }
  function clawArc(K0, K1, front, bx, under) {                          // 三道爪痕弧（半径差 2 格）
    const A = armAng(K0, front), B = armAng(K1, front), a1 = under ? B.a - 2 * Math.PI : B.a;
    const cx = wx(B.s[0] + bx), cy = wy(B.s[1]), r = Math.min(18, B.d) + 3;
    for (let k = 0; k < 3; k++) fx.slash(cx, cy, r - k * 2, A.a, a1, R_EL, 0.2, 1, 2);
  }
  function onEnter(s) {
    if (s !== CAST) return;
    const mx = wx(P.gx) + 1, my = wy(P.gy);
    clearOrbit();
    fx.beam(mx + 2, my, DUMMY_X - 3, HY - 15, 2, R_EL, 0.25, 1);              // 鬼火吸力束
    fx.cross(mx, my, 5, R_EL, 0.25); ring(mx, my, 0, R_EL); burst(mx, my, 14, 30, 80, 0.2, 0.4, R_EL, 6);
    dummyFx({ dur: 0.25, outline: R_EL, fade: false }); hitDummy(1, -1);    // 目标被吸住、往这边拖
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SW1) {
      clawArc(K_WIND, K_SW1, 1, 3, 0); hitDummy(0); burst(DUMMY_X - 4, HY - 18, 8, 40, 90, 0.12, 0.3, FXI.impact, 8);
      sfx('swing', { kind: 'claw', w: 0.5 }); sfx('hit', { mat: 'flesh', w: 0.4 });
    }
    if (s === ATTACK && t === T_SW2) {
      clawArc(K_SW1B, K_SW2, 0, 3, 1); hitDummy(0, 1); burst(DUMMY_X - 4, HY - 9, 8, 40, 90, 0.12, 0.3, FXI.impact, 8);
      sfx('swing', { kind: 'claw', w: 0.5 }); sfx('hit', { mat: 'flesh', w: 0.45 });
    }
    if (s === CAST && t === T_BITE) {                                      // 大嘴猛地合上咬住：鬼火外爆 26 颗 + 冲击环，假人大摇，震屏 1 格
      const x = DUMMY_X - 3, y = HY - 15;
      burst(x, y, 26, 50, 130, 0.25, 0.6, R_EL, 14); ring(x, y, 1, R_EL); fx.cross(wx(P.gx) + 1, wy(P.gy), 6, R_EL, 0.3);
      hitDummy(1, 1); dummyFx({ dur: 0.9, tint: 'magic', slow: 0.5 }); shake(0.12, 1); sfx('impact', { pal: 'arcane', w: 0.6 });
    }
    if (s === DEATH && t === T_SNAP) {                                     // 细腿咔嚓折断：骨屑
      for (let i = 0; i < 6; i++) spawnX(K_PHYS, wx(-2 + Math.random() * 8), wy(-7), (Math.random() - 0.5) * 50, -30 - Math.random() * 30, 0.5, FXI.dust, { g: 260, floor: HY });
      sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, wx(-10 + Math.random() * 20), HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.6 });
    }
    if (s === DEATH && t === T_BOUNCE) { for (let i = 0; i < 6; i++) spawn(K_DUST, wx(-8 + Math.random() * 16), HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.3, FXI.dust); sfx('fall', { w: 0.3 }); }
    if (s === DEATH && t === T_ASH) {                                      // 瘪成一张皮 → 化灰（鬼火烟）
      poseAt(DEATH, T_ASH - 1 / 12, T_ASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: R_SMOKE });
    }
  }
  const EVENTS = [[], [], [T_SW1, T_SW2], [], [T_BITE], [], [], [T_SNAP, T_LAND, T_BOUNCE, T_ASH], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx) + 1, gy = wy(P.gy);
    if (state === CHARGE) {                                               // 四周鬼火被定点吸进胸口的嘴
      chargeAcc += dt * (18 + 34 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 11, a = Math.random() * 6.2832; spawn(K_SPIRAL_PT, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.4), 0, 9, R_EL, a, r, (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 3)); }
    }
    if (state === CAST && stT < 0.25) {                                   // 吸力束上的鬼火往嘴里倒流
      suckAcc += dt * 70;
      while (suckAcc >= 1) { suckAcc -= 1; const q = 0.25 + Math.random() * 0.75, x = gx + 2 + (DUMMY_X - 5 - gx) * q, y = gy + (HY - 15 - gy) * q + (Math.random() - 0.5) * 4; spawn(K_TRAIL, x, y, -(80 + Math.random() * 70), (gy - y) * 2, 0.15 + Math.random() * 0.12, R_EL); }
    }
    if (state === RECOVER && stT < 0.45) {                                // 收招：嘴里吐出一缕蓝紫烟
      smokeAcc += dt * 26;
      while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_EMBER, gx + Math.random() * 2, gy + (Math.random() - 0.5) * 3, 4 + Math.random() * 8, -10 - Math.random() * 10, 0.5 + Math.random() * 0.5, R_SMOKE); }
    }
    if (state === IDLE) {                                                 // 鬼火眼偶尔飘出一粒火星
      emberAcc += dt * 1.6;
      while (emberAcc >= 1) { emberAcc -= 1; const g = geo(); spawn(K_EMBER, wx(g.head[0] + 3 + P.bx), wy(g.head[1] - 4), Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.3 }); lastStep = P.step; }
    if (state === DEATH && stT > INCOMING + 0.97 && stT < T_ASH) {        // 泄气：嘴和身上冒鬼火烟
      smokeAcc += dt * 34;
      while (smokeAcc >= 1) { smokeAcc -= 1; const g = geo(); spawn(K_RISE, wx(g.mx + P.bx + (Math.random() - 0.5) * 10), wy(g.bcy - g.ry * Math.random()), (Math.random() - 0.5) * 8, -12 - Math.random() * 14, 0.6 + Math.random() * 0.6, R_SMOKE); }
    }
  }
  function fxReset() { chargeAcc = 0; suckAcc = 0; smokeAcc = 0; emberAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (P.dq < 1 && !P.fold) floorGlow(wx(P.gx), P.rim, EL, f12); }

  return {
    name: '恶鬼', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.glow], HIT_POINT: [1, -19], EVENTS,
    deathKit: { mode: 'ash', at: T_ASH },
    // 音效：细骨嘎吱 + 腹腔空洞回响，标志性一声是胸口大嘴合拢的湿响「咕嘎」，重量 0.6
    SFX: { body: 'flesh', how: 'collapse', pal: 'arcane', style: 'beam', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack,
  };
});
