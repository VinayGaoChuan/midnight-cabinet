// 邪鼠（敌人 · 混沌 · 普通 · 近战 range 240，batch-06）：「使用棍子敲击敌人的牙种生物」——站着走的佝偻小鼠人，孩童高、驼背、头往前伸得比肩还低、腿短脚大；
// 识别：头顶一对大圆鼠耳、右手拎一根歪扭的树杈木棍（杈头缠破布，扛在肩上时伸出头顶）、身后一条粉色无毛细长鼠尾卷成 S 形拖地，两颗黄色大门牙露在嘴外。
// 攻击 = 砸：单手把棍子抡过头顶往下敲。技能（无特性，按描述做「乱棍」）：棍子在头顶转圈（拖影一圈圈叠起来）、身体后仰、尾巴竖起 →
// 连敲三下（每下十字星芒 + 撞击外爆，第三下最重：目标头顶转星）。死亡 = 后仰倒地，棍子弹飞，尾巴最后啪地落下。
PCD.define('EvilRat', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_BURST,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, sfx } = E;
  const RD = Math.round, FL = (v) => Math.floor(v + 1e-6), HALF = Math.PI / 2, px = parts.px, run = parts.run;

  // ───── 元素：敲击 · 撞击火花（impact：白 → 奶油 → 金 → 木 → 深木）+ 眩晕星 ─────
  const R_EL = FXI.impact, EL = FXR[R_EL];

  // ───── 材质 ─────
  const FUR = ['#1a1410', '#3a2e26', '#5c4c40', '#80705e'];           // 脏棕灰鼠毛（leather 暗段偏灰）
  const M = parts.mats(E, {
    fur: FUR, belly: ['#3a2e26', '#6e5e4e', '#94806a', '#b8a48a'], pink: 'pink', tooth: 'gold', wood: 'wood', rag: [0, 9, 10, 18], whisk: 'pale', hi: 'leather',   // 破布 = stone 亮段（再往上接一级灰紫亮）；hi 背线 / 头顶的 leather 亮段
    eye: { r: [55, 56, 57, 58], flat: 1 }, ink: { r: 'ink', flat: 1 },
  });
  const BODY = { body: 'hunched', leg: 5, torso: 6, hunch: 3, head: 6, headW: 6, sw: 3, arm: 7, lw: 2, stride: 2, fall: 'back' };
  const HX = 70, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(72, 44, 30, 38);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };

  // ───── 姿势：前手 hx hy a 握棍；尾巴 tail（0 拖地 S 形 · 1 竖起）；sn 抽鼻子 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, beard: 0,
    glint: 0, eyes: 0, flash: 0, lying: 0, lift: 0, tail: 0, tsw: 0, sn: 0, scr: 0, hatX: 0, hatY: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -5, -Math.PI / 4);                               // 棍子斜扛在肩后，杈头高出头顶
  const K_SCR = K(3, -11, Math.PI + 0.46, 0, -1);                       // 待机个性：反手把棍子伸到背后挠背
  const K_WIND = K(3, -14, -1.1, -1, -1);                               // 攻击：抡过头顶
  const K_STRIKE = K(10, -11, Math.atan2(2, 1), 1, 1, 1);               //       往下敲
  const K_HOLD = K(9, -10, 2.2, 1, 0, 1);
  const K_SPIN = K(4, -16, 0, -1, -1);                                  // 技能：头顶转棍
  const K_UP = K(5, -15, -0.6, 0, 0);                                   //       连敲：抬
  const K_UP3 = K(3, -15, -1.1, -1, -1);                                //       第三下抡得更高
  const K_DOWN = K(10, -11, Math.atan2(2, 1), 1, 1, 1);                 //       敲下
  const K_HURT = K(6, -7, -0.9, -1, -1);
  const K_KNEEL = K(7, -5, 0.46, -1, -1, 2);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -12, 20], ['hy', -24, 4], ['ai', -40, 40], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2],
    ['walk', 0, 1], ['sway', -2, 2], ['beard', -3, 3], ['glint', 0, 1], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['tail', 0, 2], ['tsw', -1, 1], ['sn', 0, 1], ['scr', 0, 1],
    ['hatX', -8, 24], ['hatY', -2, 12], ['dqi', 0, 24], ['st', 0, 8]]);
  const SWAY = [0, 1, 0, -1], T_STRIKE = 2 / 12, T_LAND = INCOMING + 0.66, T_SLAP = INCOMING + 1.05;
  const HITS = [[CAST, 1 / 12], [CAST, 3 / 12], [CAST, 5 / 12]];     // 连敲三下（12 fps 下一抬一敲 2 帧 = 每 0.17 s 一下）
  const PERS0 = 1.2;                                                    // 待机个性：挠背（6 帧）→ 抽着鼻子左右张望（6 帧）
  const PERS = [[0.6, 0, 0, 0], [1, 0, 0, 0], [1, -1, 0, 0], [1, 1, 0, 0], [1, -1, 0, 0], [0.5, 0, 0, 0], [0, 0, -1, 1], [0, 0, -1, 0], [0, 0, 1, 1], [0, 0, 1, 0], [0, 0, 0, 1], [0, 0, 0, 0]];   // [挠背混合, 手上下, 转头, 抽鼻子]

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.glint = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.bob = 0; P.flip = 0; P.mx = 0; P.tail = 0; P.tsw = 0; P.sn = 0; P.scr = 0; P.hatX = 0; P.hatY = 0; P.dq = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = FL(TT * 2.5); P.bob = b & 1; P.beard = SWAY[(b + 1) & 3]; P.tsw = SWAY[FL(TT * 1.25) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= PERS0 - 1e-6 && lp < PERS0 + 1) { const c = PERS[Math.min(11, f12of(lp - PERS0))]; if (c[0] > 0) { setK(K_IDLE, K_SCR, c[0]); P.hy += c[1]; P.scr = c[0] >= 1 ? 1 : 0; } P.head = c[2]; P.sn = c[3]; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 佝偻小碎步：步子小，尾巴左右甩
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq); parts.gait(P, f); P.hy += P.bob; P.a += P.step * 0.1; P.tsw = [-1, 0, 1, 0][f];
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.1))); P.tail = 1; P.tsw = -1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 3; P.tsw = 1; P.glint = 1; }
      else if (tq < 0.45) { setK(K_STRIKE, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.bx = 3; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                         // 头顶转棍：每帧转 45°，身体后仰、尾巴竖起
      const q = ease.inOut(clamp01(tq / 0.35)); setK(K_IDLE, K_SPIN, q); P.tail = q > 0.5 ? 2 : 1; P.tsw = (f12 & 1) && tq > 1.1 ? 1 : 0;
      if (tq >= 0.3) { const s8 = f12 % 8; P.a = (s8 > 4 ? 8 - s8 : -s8) * Math.PI / 4; }   // 每帧转 45°，角度收在 (−π, π]（缓存键 ai −32..32）
      if (tq > 1.1) P.bx = (f12 & 1) ? -1 : 0;
    } else if (st === CAST || (st === RECOVER && tq < 1 / 12)) {        // 三连敲：一抬一敲
      const f = st === CAST ? f12of(tq) : 6; P.tail = 1; P.bx = 3;
      if (f >= 6) { setK(K_DOWN, K_DOWN, 0); P.crouch = 2; }
      else if (f & 1) { setK(K_DOWN, K_DOWN, 0); if (f === 5) P.crouch = 2; P.glint = 1; P.tsw = 1; }
      else setK(f === 4 ? K_UP3 : K_UP, f === 4 ? K_UP3 : K_UP, 0);
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01((tq - 1 / 12) / 0.5)); setK(K_DOWN, K_IDLE, q); P.bx = RD(3 * (1 - q)); P.tail = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.tail = 1; P.tsw = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.tsw = -1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 后仰倒地，棍子弹飞，尾巴最后啪地落下
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.tail = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.tail = 1; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.crouch = 0; P.lean = 0; P.head = 0; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        P.tail = d < T_SLAP - INCOMING ? 2 : 0;
        const hq = clamp01((d - 0.5) / 0.4); P.hatX = RD(18 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 9);
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const cr = P.lying ? 0 : Math.min(3, RD(P.crouch)), yo = cr + (st === MOVE || P.lying ? 0 : P.bob);
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 24);
    if (P.lying) { P.gx = -10 + P.bx; P.gy = -3; }
    else { const g = stickGeo(P.hx, P.hy, P.a); P.gx = g.end[0] + P.bx; P.gy = g.end[1]; }
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  const STICK = 13;
  function stickGeo(gx, gy, a) {
    const di = parts.snapDir(a), c = parts.cell(di, 0, 0, 8), sx = Math.sign(c[0]), sy = Math.sign(c[1]), maj = Math.max(Math.abs(c[0]), Math.abs(c[1])) / Math.hypot(c[0], c[1]);
    const x0 = sx < 0 ? gx - 1 : gx, y0 = sy < 0 ? gy - 1 : gy, n = RD(STICK * maj);
    return { di, x0, y0, n, end: parts.cell(di, x0, y0, n + 2) };
  }
  // 候选部件：forkStick 歪扭树杈木棍——吸附斜率的 1 格木杆（握点后留 2 格），中段往一侧歪 1 格、一个树节，杆头分成两根杈（一根顺着、一根岔开），
  //   杈根缠一圈破布（3 格宽、条纹明暗、一截布头垂下）。一个部件；T 是 rig 或 parts.FREE
  function forkStick(T, g) {
    E.part(); const { di, x0, y0, n } = g, kink = RD(n * 0.5);
    const at = (k, off, m, t) => parts.bar(di, x0, y0, k, k, 5, (kk, j, X, Y) => { if (j - 2 === off) px(E, T, X, Y, m, t); });
    for (let k = -2; k <= n; k++) at(k, k > kink ? 1 : 0, M.wood, k === -2 ? 2 : k % 3 === 1 ? 3 : 4);   // 杆身整体提亮一级（亮段为主），夜空里读得出
    at(kink - 2, -1, M.wood, 2);                                        // 树节
    at(n + 1, 1, M.wood, 4); at(n + 2, 1, M.wood, 3);                   // 顺着的杈
    at(n + 1, -1, M.wood, 3); at(n + 2, -2, M.wood, 4);                 // 岔开的杈
    for (let k = n - 2; k <= n; k++) for (let off = 0; off <= 2; off++) at(k, off, M.rag, k === n - 1 ? 3 : 4);   // 破布：只用亮段，条纹 = 亮 / 次亮
    at(n - 3, 2, M.rag, 3);                                             // 垂下的布头
  }
  // 候选部件：ratHead 鼠头侧脸——圆脑壳 + 往前伸 3 格的尖长吻（吻尖粉鼻）、红眼 + 暗眉骨、两颗露在嘴外的黄色大门牙、吻侧两根胡须；
  //   sn 1 = 抽鼻子（鼻尖上翘 1 格、胡须抖）。一个部件（门牙、鼻子并进脸里，不压分界线）
  function ratHead(R) {
    E.part(); const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, f = M.fur, sn = P.sn;
    for (let y = top; y <= bot; y++) run(E, R, y, x0 + (y === top || y === bot ? 1 : 0), x1 - (y === top ? 1 : 0), f, 0);
    run(E, R, ey + 1, x1 + 1, x1 + 2, f, 0); run(E, R, ey + 2, x1 + 1, x1 + 3, f, 0); px(E, R, x1 + 1, ey + 3, f, 2);   // 长吻（上吻长、下颌短）
    px(E, R, x1 + 3, ey + 1 - sn, M.pink, 4); px(E, R, x1 + 4, ey + 2 - sn, M.pink, 3);                                     // 粉鼻头
    px(E, R, x1 + 2, ey + 3, M.tooth, 4); px(E, R, x1 + 2, ey + 4, M.tooth, 3);                                            // 两颗大门牙
    px(E, R, x1 - 1, ey + 1, f, 4); px(E, R, x1, ey + 2, f, 4);                                                             // 腮毛亮面
    if (P.eyes) { px(E, R, x1 - 1, ey, f, 1); px(E, R, x1, ey, f, 1); } else { px(E, R, x1, ey, M.eye, 3); px(E, R, x1 - 1, ey, M.eye, 2); }
    run(E, R, ey - 1, x1 - 1, x1, f, 2);                                                                                    // 眉骨
    px(E, R, x1 + 4, ey + 3 + sn, M.whisk, 4); px(E, R, x1 + 5, ey + 1, M.whisk, 3);                                        // 胡须
    px(E, R, x0 + 1, ey + 2, f, 2); px(E, R, x0 + 2, top + 1, f, 4);
    headTop(R);
  }
  // 候选部件：roundEars 大圆鼠耳——3×3 圆耳（切掉外角），近侧耳心粉色，远侧耳暗一级、往后错 2 格；随头转
  function roundEar(R, dx, dy, m, inner, stem) {
    E.part(); const x = R.hx0 + dx, y = R.htop + dy;
    run(E, R, y - 2, x, x + 1, m, 0); run(E, R, y - 1, x - 1, x + 2, m, 0); run(E, R, y, x - 1, x + 2, m, 0);
    for (let k = 1; k <= (stem || 0); k++) run(E, R, y + k, x + k, x + 2 + k, m, 0);   // 耳根：抬高后接回脑壳
    if (inner) { px(E, R, x, y - 1, M.pink, 3); px(E, R, x + 1, y - 1, M.pink, 2); px(E, R, x, y, M.pink, 2); }
  }
  // 候选部件：ratTail 无毛细长鼠尾——从后胯出来，垂到地面再沿地面卷成 S 形往后拖 8 格，尾尖上翘；根部 2 格粗，节纹明暗交替；
  //   tail 0 拖地（tsw 尾尖左右甩）· 1 半翘 · 2 竖起；倒地时用精灵坐标画（不跟身体转），落下时贴地
  const TAIL = [
    [[0, 0], [-2, 1], [-3, 3], [-3, 4], [-4, 5], [-6, 5], [-7, 4], [-8, 3], [-8, 2]],
    [[0, 0], [-2, 0], [-4, -1], [-5, -3], [-5, -5], [-4, -6], [-3, -6]],
    [[0, 0], [-1, -2], [-2, -4], [-2, -6], [-1, -8], [0, -9], [1, -9]],
  ];
  function ratTail(T, rx, ry, mode, tsw, flat) {
    E.part(); const pts = flat ? [[0, 0], [2, 0], [4, 0], [6, 0], [8, 0], [9, -1]] : TAIL[mode];
    let lx = rx, ly = ry;
    for (let i = 1; i < pts.length; i++) {
      const tipSeg = i >= pts.length - 3, x = rx + pts[i][0] + (tipSeg && !flat ? tsw : 0), y = Math.min(0, ry + pts[i][1] - (tipSeg && !flat && mode === 0 && tsw ? 1 : 0));
      parts.line(E, T, lx, ly, x, y, M.pink, (i & 1) ? 3 : 4); lx = x; ly = y;
    }
    px(E, T, rx, ry + 1, M.pink, 2);
  }
  // 候选部件：bellyFur 浅色肚皮毛——沿躯干前沿 2 列浅色毛（胸口窄、肚子宽），下沿锯齿；并进躯干（不新开部件，不压分界线）
  function bellyFur(R) {
    for (let y = R.yS + 2; y <= R.yHip; y++) { const e = parts.edges(R, Math.min(y, R.yHip)), w = y > R.yWaist ? 2 : 1; for (let k = 0; k < w; k++) px(E, R, e[1] - k, y, M.belly, k === 0 ? 3 : 2); }
    px(E, R, parts.edges(R, R.yHip)[1] - 1, R.yHip + 1, M.belly, 2);
  }
  // 候选部件：backLine 背线高光——沿驼背后沿（肩到腰）和头顶各描 1 格亮色，让佝偻背线从夜空里跳出来；并进躯干 / 头（不新开部件）
  function backLine(R) {
    for (let y = R.yS; y <= R.yWaist; y++) px(E, R, parts.edges(R, y)[0], y, M.hi, y === R.yS ? 4 : 3);
  }
  function headTop(R) { run(E, R, R.htop + 1, R.hx0, R.hx0 + 1, M.hi, 3); px(E, R, R.hx0 + 2, R.htop + 1, M.hi, 4); px(E, R, R.hx1 - 1, R.htop, M.hi, 3); }   // 头顶那排被近侧耳压成分界线，高光落在后脑勺和耳前
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, BODY), g = stickGeo(P.hx, P.hy, P.a);
    if (R.lie) {                                                         // 倒地：尾巴、飞出去的棍子用精灵坐标画
      const r = parts.toSprite(R, R.hipBx - 1, R.yHip + 1); ratTail(parts.FREE, r[0], Math.min(-1, r[1]), 2, 0, P.tail === 0);
      forkStick(parts.FREE, stickGeo(2 + P.hatX, -2 - P.hatY, P.hatX >= 16 ? HALF : 0.46 + P.hatX * 0.06));
    } else ratTail(R, R.hipBx - 1, R.yHip + 1, P.tail, P.tsw, 0);
    if (P.scr && !R.lie) forkStick(R, g);                                // 挠背：棍子在背后
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.furD, hand: M.pinkD, grip: 'fist' });
    parts.legs(E, R, P, { style: 'bare', mat: M.fur, matD: M.furD, boot: M.pink, bootD: M.pinkD, w: 2 });
    if (!R.lie) { E.part(); px(E, R, R.footFx + 3, -R.footFup, M.pink, 3); px(E, R, R.footBx + 2, -R.footBup, M.pinkD, 2); }   // 大脚爪（前伸 1 格）
    parts.torso(E, R, P, { style: 'bare', mat: M.fur });
    bellyFur(R); backLine(R);
    roundEar(R, -2, -2, M.furD, 0, 1);                                  // 远侧耳：往后 1、往上 1，剪影上两个耳包分开
    ratHead(R);
    roundEar(R, 2, -1, M.fur, 1);
    if (!P.scr && !R.lie) forkStick(R, g);
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.fur, hand: M.pink, grip: 'fist', at: [P.hx, P.hy] });
  }
  function bakeHero() { RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  let spinT = 9, soulAcc = 0, lastStep = 0, sparkAcc = 0;
  function onEnter(s) {
    if (s === CHARGE) spinT = 0;
    if (s === CAST) { shake(0.28, 2); flash(0.05); }
  }
  function bonk(i) {                                                    // 一敲：十字星芒 + 撞击外爆；第三下最重（头顶转星 + 小冲击环）
    const x = DUMMY_X - 4, y = HY - 12 + (i === 2 ? -2 : i);
    const last = i === 2;
    fx.cross(x, y, last ? 6 : 4, R_EL, 0.2); burst(x, y, last ? 20 : 10, 40, last ? 130 : 90, 0.15, 0.4, R_EL, 12);
    for (let k = 0; k < 3; k++) spawnX(K_PHYS, x, y, -20 - Math.random() * 40, -40 - Math.random() * 30, 0.5, FXI.dust, { g: 200, floor: HY, age0: 0.3 });   // 木屑
    hitDummy(last ? 1 : 0);
    if (last) { dummyFx({ dur: 1.2, stun: 1 }); ring(x, y, 0, R_EL); shake(0.12, 1); }
    sfx('impact', { pal: 'earth', w: last ? 0.45 : 0.25 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {
      const sx = wx(4 + P.bx), sy = wy(-10);
      fx.slash(sx, sy, 13, K_WIND.a, K_STRIKE.a + 0.2, R_EL, 0.17, 2, 2);
      hitDummy(0); burst(DUMMY_X - 4, HY - 10, 10, 40, 100, 0.15, 0.35, R_EL, 10); fx.cross(DUMMY_X - 4, HY - 10, 3, R_EL, 0.17);
      sfx('swing', { kind: 'smash', w: 0.25 }); sfx('hit', { mat: 'wood', w: 0.3 });
    }
    for (let i = 0; i < HITS.length; i++) if (s === HITS[i][0] && Math.abs(t - HITS[i][1]) < 1e-9) bonk(i);
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 14 + Math.random() * 18, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.25 }); }
    if (s === DEATH && Math.abs(t - T_SLAP) < 1e-9) for (let i = 0; i < 5; i++) spawn(K_DUST, HX + 2 + Math.random() * 8, HY - 1, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.35, FXI.dust);   // 尾巴啪地落下
  }
  const EVENTS = [[], [], [T_STRIKE], [], HITS.map((h) => h[1]), [], [], [T_LAND, T_SLAP], []];
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.15 }); lastStep = P.step; }   // 轻：无尘
    if (state === CHARGE && stT > 0.6) { sparkAcc += dt * 10; while (sparkAcc >= 1) { sparkAcc -= 1; spawn(K_BURST, wx(P.gx), wy(P.gy), (Math.random() - 0.5) * 30, -10 - Math.random() * 20, 0.25, R_EL); } }   // 甩出的木屑火星
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 18, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.soul); } }
    spinT += dt;
  }
  function fxReset() { spinT = 9; soulAcc = 0; lastStep = 0; sparkAcc = 0; }
  function fxFront(f12) {
    if (E.state !== CHARGE || E.stT < 0.3) return;                     // 头顶转棍的拖影：一圈圈叠起来（外圈亮、内圈暗，越转越满）
    const cx = wx(P.hx + P.bx), cy = wy(P.hy), cur = -(f12 % 8) * Math.PI / 4, span = Math.min(2 * Math.PI, (E.stT - 0.3) * 6), flip = P.flip ? -1 : 1;
    for (let ring_ = 0; ring_ < 2; ring_++) {
      const r = 12 - ring_ * 3, n = Math.ceil(span * r);
      for (let k = 0; k <= n; k++) {
        const q = k / Math.max(1, n), a = cur + q * span;            // 逆着转向往后拖
        if (ring_ === 1 && ((k + f12) & 1)) continue;
        put(RD(cx + flip * Math.sin(a) * r), RD(cy - Math.cos(a) * r), ring_ ? EL[3] : q < 0.15 ? EL[0] : q < 0.4 ? EL[1] : q < 0.75 ? EL[2] : EL[3]);
      }
    }
  }

  return {
    name: '邪鼠', HX, R_EL, DUR, hero, P, GLOW_MATS: [], HIT_POINT: [2, -8], EVENTS, R_HURT: R_EL,
    SFX: { body: 'beast', how: 'topple', pal: 'earth', style: 'blade', w: 0.25 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxFront,
  };
});
