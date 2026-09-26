// 隐士（敌人 · 野兽 · 普通 · 远程 600）：佝偻老獾——驼背很重、头低于肩、短腿，垂到胸口的白长须；
// 识别：一顶宽大的锥形竹斗笠（帽檐左右各伸出头 5 格，压得看不见眼睛）、手拄一根弯木拐杖（杖顶长一株发光怪芽：三片叶 + 一个发光花苞，高出斗笠 3 格）、
// 背上斜挂一只大葫芦种子袋（葫芦口露出几颗发光种子）、黑白条纹獾脸。
// 攻击 = 投：从葫芦口摸出一颗种子，屈指一弹，种子划小弧砸向目标。技能 = 特性「治疗光环」（附近盟友每秒回血）：
// 拐杖顿地、杖顶花苞慢慢张开、脚下亮起草叶法阵、种子一颗颗从葫芦飘出绕身旋转 → 一挥手把种子撒到每名友军脚下 → 落地长成发光怪芽，一串串冒出绿色十字光点。
// 死亡 = 跪坐化花：跪坐低头，斗笠盖住身子，身上冒出草芽和小花，然后连人带花化成绿色光点飘散，斗笠最后落地。
PCD.define('Hermit', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, INCOMING, ASTEP, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_PHYS, K_SPIRAL_PT, K_EMBER, K_DUST, K_BURST,
    spawn, spawnX, burst, clearOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shoot, sfx, DUMMY_X, allyPoints, allyFx } = E;
  const RD = Math.round, px = parts.px, run = parts.run, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：治疗光环 · 新芽绿（nature：白 → 淡黄绿 → 叶绿 → 深绿 → 墨绿）─────
  const R_EL = FXI.nature, EL = FXR[R_EL], LEAF = E.RAMP.green;

  // ───── 材质 ─────
  const INDIGO = ['#141826', '#2c3450', '#46527a', '#6a7698'];     // 褪色靛蓝粗布（blue 暗段偏灰）
  const M = parts.mats(E, {
    robe: { r: INDIGO, band: 2 }, sleeve: INDIGO,
    fur: [0, 27, 8, 28],                                             // 獾毛（墨）
    white: 'white',                                                  // 白纹、长须
    hat: 'sand', hatBand: 'wood', gourd: 'leather', cord: 'sand', wood: 'wood', sandal: 'sand',
    leaf: 'green', petal: 'pink',
    eye: { r: [0, 0, 17, 21], flat: 1 }, ink: { r: 'ink', flat: 1 },
    bud: { r: [48, 49, 50, 38], flat: 1 },                           // 发光花苞 / 种子：暗 → 亮
    budHot: { r: [49, 50, 38, 21], flat: 1 },                        // 蓄满 / 施放
  });
  const HAT_MATS = new Uint8Array(256); for (const k of ['hat', 'hatD', 'hatBand', 'hatBandD']) HAT_MATS[M[k]] = 1;
  const BODY = { body: 'hunched', leg: 7, torso: 8, hunch: 4, head: 6, headW: 7, sw: 4, arm: 9, lw: 2, stride: 2, fall: 'front' };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(66, 42, 30, 36);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 17], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bud', 'budHot', 'wood', 'woodD', 'leaf', 'leafD', 'ink', 'eye', 'fur', 'furD', 'white', 'whiteD', 'cord', 'cordD']) RIM.skip[M[k]] = 1;

  // ───── 姿势：前手 hx/hy 拄杖（a 杖角）；后手 bhx/bhy 空着（摸葫芦、弹种子、挥手、捋须）─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, beard: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, sprout: 0, stroke: 0, bloom: 0, hatUp: 0, hatSag: 0, hatDrop: 0, caneDown: 0, seed: 0,
    dq: 0, dqi: 0, dqb: 0, dqbi: 0, dqh: 0, dqhi: 0, lift: 0, lying: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean, head, crouch });
  const K_IDLE = K(17, -7, 0.1, -1, -5, 0, 0, 0);
  const K_REACH = K(17, -7, 0.08, -9, -17, 0, -1, 0);                // 后手伸到背后葫芦口
  const K_FLICK = K(17, -7, 0.14, 11, -13, 1, 0, 0);                  // 屈指一弹
  const K_HOLD = K(17, -7, 0.12, 10, -11, 1, 0, 0);
  const K_LIFT = K(17, -10, 0.02, 3, -12, -1, -1, 0);                 // 蓄力：拐杖提起
  const K_THUD = K(17, -6, 0.05, 2, -16, -1, -1, 1);                  //       顿地，后手托起
  const K_WAVE = K(17, -7, 0.1, 12, -12, 1, 0, 0);                    // 施放：一挥手
  const K_HURT = K(16, -8, -0.12, -3, -8, -1, -1, 0);
  const K_KNEEL = K(15, -5, 0.35, 3, -5, 1, 1, 4);
  const K_SIT = K(6, -4, 0.35, 3, -4, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -8, 24], ['hy', -24, 4], ['ai', -32, 32], ['bhx', -16, 20], ['bhy', -28, 4], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7],
    ['bob', 0, 1], ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['beard', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['sprout', 0, 3], ['stroke', 0, 1], ['bloom', 0, 4], ['hatUp', 0, 2], ['hatSag', 0, 4], ['hatDrop', 0, 12], ['caneDown', 0, 1],
    ['seed', 0, 1], ['dqi', 0, 24], ['dqbi', 0, 24], ['dqhi', 0, 24], ['st', 0, 8]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  // 步态：接触 A 拐杖向前探出点地（杖脚比平时前 3 格）→ 经过 身体压上拐杖 → 接触 B 拐杖落在身后斜撑 → 经过 提起离地前挪
  const CANE_W = [[2, 0, -0.1], [1, 0, 0.1], [0, 0, 0.22], [1, -3, -0.02]];
  const T_FLICK = 2 / 12, T_THUD = 0.25, T_LAND = 3 / 12, T_SETTLE = INCOMING + 0.66, T_HATLAND = INCOMING + 2.05;
  const PERS0 = 1.2;                                                  // 待机个性从循环内 1.2 s 开始，共 12 帧
  // 待机个性：[后手 x, y, 撒下的芽, 捋须, 须摆, 斗笠掀起, 转头]
  const PERS = [[-6, -15, 0, 0, 0, 0, -1], [-9, -17, 0, 0, 0, 0, -1], [9, -6, 0, 0, 0, 0, 0], [8, -5, 1, 0, 0, 0, 0], [7, -5, 2, 0, 0, 0, 1], [7, -5, 3, 0, 0, 0, 1],
    [6, -5, 2, 0, 0, 0, 1], [5, -5, 1, 0, 0, 0, 0], [8, -9, 0, 1, 1, 1, -1], [8, -7, 0, 1, -1, 1, -1], [8, -5, 0, 1, 1, 1, -1], [4, -5, 0, 0, 0, 0, 0]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0;
    P.sprout = 0; P.stroke = 0; P.bloom = 0; P.hatUp = 0; P.hatSag = 0; P.hatDrop = 0; P.caneDown = 0; P.seed = 0; P.dq = 0; P.dqb = 0; P.dqh = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= PERS0 - 1e-6 && lp < PERS0 + 1) {                     // 撒种捋须：摸种子 → 撒在脚边 → 冒出小芽又缩回 → 捋一下长须
        const f = CL(f12of(lp - PERS0), 0, 11), c = PERS[f];
        P.bhx = c[0]; P.bhy = c[1]; P.sprout = c[2]; P.stroke = c[3]; if (c[3]) P.beard = c[4]; P.hatUp = c[5]; P.head = c[6];
        P.seed = f === 1 ? 1 : 0; P.glint = f === 5 ? 1 : 0;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 拄拐慢挪：拐杖先点地、再挪两步，驼背一颠一颠
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq); parts.gait(P, f);
      const c = CANE_W[f]; P.hx += c[0]; P.hy += c[1]; P.a = c[2]; P.bhx += -P.step; P.beard = -P.step;
      const w = walkDemo(tq, 10, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_REACH, ease.out(tq / 0.12)); P.gem = 1; P.seed = tq >= 1 / 12 ? 1 : 0; }
      else if (tq < 0.2) { setK(K_FLICK, K_FLICK, 0); P.gem = 2; P.rim = 2; P.beard = -1; P.sway = -1; }
      else if (tq < 0.45) { setK(K_FLICK, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 1; P.beard = -1; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {
      if (tq < T_THUD) { setK(K_IDLE, K_LIFT, ease.out(tq / T_THUD)); P.gem = 1; }
      else { const q = ease.inOut(clamp01((tq - T_THUD) / 0.5)); setK(K_THUD, K_THUD, 0); P.bhy = RD(-16 - q * 2); P.gem = tq < 0.7 ? 1 : ((f12 & 1) ? 2 : 1); P.beard = tq > 1.1 && (f12 & 1) ? -2 : -1; P.sway = -1; }
      P.rim = 2;
    } else if (st === CAST) { setK(K_THUD, K_WAVE, ease.out(clamp01(tq / 0.12))); P.gem = 3; P.rim = 3; P.beard = -2; P.sway = -1; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_WAVE, K_IDLE, q); P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.hatUp = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.hatUp = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 跪坐化花
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.hatUp = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.beard = 1; P.hatSag = 1; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        setK(K_SIT, K_SIT, 0); P.bx = -1; P.caneDown = 1; P.hatSag = d < 0.58 ? 2 : 3;
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : 4;
        P.bloom = d < 0.75 ? 0 : d < 0.9 ? 1 : d < 1.05 ? 2 : d < 1.2 ? 3 : 4;
        if (d >= 1.5) P.dqb = clamp01((d - 1.5) / 0.6);
        if (d >= 1.75) P.hatDrop = RD(9 * ease.in(clamp01((d - 1.75) / 0.3)));
        if (d >= 2.25) P.dqh = clamp01((d - 2.25) / 0.35);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob + Math.min(3, RD(P.crouch)); P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP;
    P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + P.bob + Math.min(3, RD(P.crouch)); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    P.dqi = RD(P.dq * 24); P.dqbi = RD(P.dqb * 24); P.dqhi = RD(P.dqh * 24);
    if (P.caneDown) { P.gx = LIE_TIP[0] + P.bx; P.gy = LIE_TIP[1]; }
    else { const S = canePts(P.hx, P.hy, P.a); P.gx = RD(S.tx) + P.bx; P.gy = RD(S.ty) - 5; }
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  const UP = 11, DN = 10, LIE_TIP = [25, -1];
  function canePts(hx, hy, a) { const dx = Math.sin(a), dy = -Math.cos(a); return { dx, dy, tx: hx + dx * UP, ty: hy + dy * UP, bx: hx - dx * DN, by: hy - dy * DN }; }
  const GLOW = [[M.bud, 2], [M.bud, 3], [M.budHot, 3], [M.budHot, 4], [M.bud, 1]];
  // 候选部件：gourdPack —— 背在背后的大葫芦种子袋：下节大圆肚（7×7，伸出背线 ≥ 4 格）→ 2 格细腰（腰上一圈竹黄绳结）→ 上节 3×3 小肚 →
  //   葫芦口朝后上方，口里露出 3 颗发光种子；左上亮面 + 高光。跟着身体（rig）走。geo 给特效挂点用（葫芦口）
  const LOWER = [[-1, 1], [-2, 2], [-3, 2], [-3, 3], [-3, 3], [-2, 2], [-1, 1]];   // 下节圆肚逐行 [左, 右]（相对圆心，自上而下 dy = -3..3）
  function gourdGeo(R) { const e = parts.edges(R, R.yS + 3); return { lx: e[0] - 2, ly: R.yS + 2 }; }
  function gourdPack(R) {
    E.part(); const g = M.gourd, o = gourdGeo(R), lx = o.lx, ly = o.ly, G = GLOW[P.gem === 4 ? 4 : P.seed ? 3 : 1];
    for (let j = 0; j < 7; j++) run(E, R, ly - 3 + j, lx + LOWER[j][0], lx + LOWER[j][1], g, 0);    // 下节大肚
    run(E, R, ly - 5, lx - 3, lx - 2, g, 0);                                                          // 细腰（2 格）
    for (let j = 0; j < 3; j++) run(E, R, ly - 8 + j, lx - 5, lx - 3, g, 0);                          // 上节小肚 3×3
    run(E, R, ly - 9, lx - 6, lx - 5, g, 2);                                                          // 葫芦口（朝后上）
    run(E, R, ly - 4, lx - 3, lx, M.cord, 3); px(E, R, lx - 4, ly - 4, M.cord, 2);                    // 腰上一圈绳结
    px(E, R, lx - 2, ly - 2, g, 4); px(E, R, lx - 1, ly - 2, g, 4); px(E, R, lx - 2, ly - 1, g, 4);  // 下节左上高光
    px(E, R, lx - 5, ly - 8, g, 4);                                                                   // 上节高光
    px(E, R, lx - 7, ly - 10, G[0], G[1]); px(E, R, lx - 6, ly - 10, G[0], G[1] - 1); px(E, R, lx - 6, ly - 11, G[0], G[1]);   // 口里的发光种子
  }
  // 候选部件：badgerHead —— 獾头侧脸：墨色头颅 + 头顶白纹（笠下）+ 帽檐下一眼就读得出的「黑 · 白 · 黑」条纹长吻：
  //   ey+1 墨色眼带沿吻背一直伸到吻尖 → ey+2..3 两行白色长吻（前端收尖）+ 吻尖 2×1 墨鼻 → ey+4 墨色下颌线 → 一行白下巴 → 白长须；
  //   脑后一只灰黑小耳（白耳尖）从帽檐下露出。长须并进同一个部件（白下巴和白须之间不压分界线）；须尾随 beard 摆
  function badgerHead(R) {
    E.part(); const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, f = M.fur, w = M.white;
    for (let y = top; y <= bot; y++) run(E, R, y, x0 + (y === top || y === bot ? 1 : 0), x1 - (y === top ? 1 : 0), f, 0);
    run(E, R, ey - 1, x0 + 3, x1 + 1, w, 0);                                                          // 头顶白纹（斗笠掀起时露出来）
    if (P.eyes) { px(E, R, x1 - 1, ey, f, 1); px(E, R, x1 - 2, ey, f, 1); } else px(E, R, x1 - 1, ey, M.eye, 3);
    run(E, R, ey + 1, x0, x1 + 2, f, 2); px(E, R, x0 + 1, ey + 1, f, 3);                             // 上：墨色眼带沿吻背伸到吻尖（帽檐下这一行也是分界线）
    run(E, R, ey + 2, x0 + 1, x1 + 3, w, 3); px(E, R, x1 + 1, ey + 2, w, 4); px(E, R, x1 + 2, ey + 2, w, 4);   // 中：白色长吻 2 行，前端收尖
    run(E, R, ey + 3, x0 + 2, x1 + 2, w, 3); px(E, R, x0 + 2, ey + 3, w, 2);
    px(E, R, x1 + 4, ey + 2, f, 2); px(E, R, x1 + 5, ey + 2, f, 2);                                   //     吻尖 2×1 墨鼻（比勾线浅一级，才看得出是鼻头）
    run(E, R, ey + 4, x0 + 2, x1 + 3, f, 2);                                                          // 下：墨色下颌线
    run(E, R, ey + 5, x1 - 3, x1 + 2, w, 0);                                                          // 一行白下巴（和须之间）
    px(E, R, x0 - 1, ey + 2, f, 4); px(E, R, x0 - 2, ey + 2, w, 3); px(E, R, x0 - 1, ey + 3, f, 3);   // 脑后灰黑小耳（白耳尖；帽檐下一行是分界线，耳落在下一行）
    const b = P.beard;
    for (let k = 0; k <= 5; k++) {                                                                   // 长须：逐行收窄，尖端摆动，暗须丝
      const y = ey + 6 + k, q = k / 5, wd = Math.max(1, RD(5 - q * 3.6)), cx = x1 - 1 + b * q * q * 1.3 - q * 1.2, a = RD(cx - wd / 2);
      run(E, R, y, a, a + wd - 1, w, 0);
      if (k >= 1 && wd >= 3) px(E, R, a + 1 + (k & 1), y, w, 2);
    }
  }
  // 候选部件：bambooHat —— 宽檐锥形竹斗笠：帽檐 2 行（左右各伸出头 5 格，两端下垂 1 格）+ 4 行锥身 + 顶钮；竹篾纹每 3 列暗一级，锥底一圈木色篾箍
  function bambooHat(T, cx, by) {
    E.part(); const m = M.hat, hw = 8;
    run(E, T, by, cx - hw, cx + hw, m, 0); run(E, T, by - 1, cx - hw + 1, cx + hw - 1, m, 0);
    px(E, T, cx - hw, by + 1, m, 0); px(E, T, cx + hw, by + 1, m, 0);
    for (let x = cx - hw + 2; x <= cx + hw - 1; x += 3) px(E, T, x, by, m, 2);
    run(E, T, by - 2, cx - 5, cx + 5, M.hatBand, 0);
    const Wc = [4, 3, 2, 1];
    for (let k = 0; k < 4; k++) { const y = by - 3 - k; run(E, T, y, cx - Wc[k], cx + Wc[k], m, 0); if (k < 3) for (let x = cx - Wc[k] + 1; x < cx + Wc[k]; x += 2) px(E, T, x, y, m, (x + k) & 2 ? 2 : 3); }
    px(E, T, cx, by - 7, M.hatBand, 3); px(E, T, cx - 1, by - 3, m, 4); px(E, T, cx - 2, by - 1, m, 4); px(E, T, cx - 5, by - 1, m, 4);
  }
  // 候选部件：saplingCane —— 弯木拐杖（1 格木杆 + 两个树节 + 顶端弯钩）；杖顶的怪芽（两片叶 + 一片小叶 + 发光花苞 5 档，≥ 2 档张开）是单独的发光部件
  function cane(T, hx, hy, a) {
    const S = canePts(hx, hy, a); E.part();
    parts.line(E, T, S.bx, S.by, S.tx, S.ty, M.wood, 3);
    for (const k of [-5, 3]) px(E, T, hx + S.dx * k + 1, hy + S.dy * k, M.wood, 4);
    px(E, T, S.tx + 1, S.ty - 1, M.wood, 3);                                                          // 顶端弯钩
    return S;
  }
  function sapling(T, x, y, lv, lying) {
    E.part(); const G = GLOW[lv];
    if (lying) {                                                                                      // 倒地：横躺的芽，花苞熄灭
      px(E, T, x, y, M.leaf, 3); px(E, T, x + 1, y, M.leaf, 3); px(E, T, x + 1, y - 1, M.leaf, 4); px(E, T, x + 2, y - 2, M.leaf, 3); px(E, T, x + 2, y + 1, M.leaf, 2);
      px(E, T, x + 3, y, G[0], G[1]); return;
    }
    px(E, T, x, y, M.leaf, 2); px(E, T, x, y - 1, M.leaf, 3);                                          // 茎
    px(E, T, x - 1, y - 2, M.leaf, 4); px(E, T, x - 2, y - 3, M.leaf, 3); px(E, T, x - 1, y - 3, M.leaf, 3);   // 左叶
    px(E, T, x + 1, y - 1, M.leaf, 3); px(E, T, x + 2, y - 2, M.leaf, 3); px(E, T, x + 3, y - 2, M.leaf, 2);   // 右叶
    px(E, T, x, y - 2, M.leaf, 3);
    px(E, T, x, y - 3, G[0], G[1] - 1); px(E, T, x, y - 4, G[0], G[1]);                               // 花苞
    if (lv >= 2 && lv <= 3) { px(E, T, x - 1, y - 4, G[0], G[1] - 1); px(E, T, x + 1, y - 4, G[0], G[1] - 1); px(E, T, x, y - 5, G[0], G[1]); }
    if (P.glint && lv !== 4) px(E, T, x + 1, y - 5, M.budHot, 4);
  }
  // 脚边撒下的小芽（待机个性）：1 冒头 · 2 两叶 · 3 带发光小苞
  function footSprout(n) {
    if (!n) return; E.part(); const x = 17, T = parts.FREE;
    px(E, T, x, 0, M.leaf, 3); if (n >= 2) { px(E, T, x, -1, M.leaf, 3); px(E, T, x - 1, -2, M.leaf, 4); px(E, T, x + 1, -1, M.leaf, 3); }
    if (n >= 3) { px(E, T, x, -2, M.leaf, 3); px(E, T, x, -3, M.budHot, 3); }
  }
  // 死亡：身上冒出的草芽和小花（1–4 档越长越多）
  const BLOOM = [[0, 0, 'g', 1], [0, 0, 'f', 2], [0, 0, 'g', 2], [0, 0, 'f', 3], [0, 0, 'g', 3], [0, 0, 'f', 4], [0, 0, 'g', 4]];
  function bloom(R, n, hatBy) {
    if (!n) return; E.part(); const T = parts.FREE, e = parts.edges(R, R.yS + 2);
    const spots = [[R.hx, hatBy - 7], [R.hx - 5, hatBy - 2], [e[0] - 1, R.yS + 4], [R.hx + 6, hatBy - 1], [-7, 0], [9, 0], [2, hatBy - 5]];
    for (let i = 0; i < BLOOM.length; i++) {
      if (BLOOM[i][3] > n) continue; const x = spots[i][0], y = spots[i][1];
      if (BLOOM[i][2] === 'g') { px(E, T, x, y - 1, M.leaf, 3); px(E, T, x - 1, y - 2, M.leaf, 4); px(E, T, x + 1, y - 2, M.leaf, 3); if (n >= BLOOM[i][3] + 1) px(E, T, x + 1, y - 3, M.leaf, 4); }
      else { px(E, T, x, y - 1, M.leaf, 2); px(E, T, x, y - 3, M.petal, 3); px(E, T, x - 1, y - 2, M.petal, 4); px(E, T, x + 1, y - 2, M.petal, 3); px(E, T, x, y - 2, M.budHot, 4); }
    }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    const R = parts.rig(P, BODY), hatBy = R.ey - P.hatUp + P.hatSag + P.hatDrop;
    gourdPack(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, hand: M.furD, grip: P.stroke ? 'none' : 'fist', at: [P.bhx, P.bhy] });
    parts.legs(E, R, P, { style: 'sandal', mat: M.fur, matD: M.furD, boot: M.sandal, bootD: M.sandalD, w: 2 });
    parts.torso(E, R, P, { style: 'robe', mat: M.robe, hem: Math.min(-1, R.yHip + 3), flare: 2, belt: M.cord, strap: M.cord });   // 一条斜挎的葫芦背带 + 一道腰绳，其余留给袍褶
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, grip: 'none', at: [P.hx, P.hy] });
    badgerHead(R);
    if (P.stroke) parts.hand(E, R, P, { side: 'B', at: [P.bhx, P.bhy], hand: M.fur });
    bambooHat(parts.FREE, R.hx, hatBy);
    if (P.caneDown) {                                                                                 // 拐杖倒在身前地上
      const T = parts.FREE; E.part(); parts.line(E, T, 7, 0, 21, 0, M.wood, 3); px(E, T, 22, -1, M.wood, 3); px(E, T, 12, -1, M.wood, 4);
      sapling(T, 23, -1, P.gem, 1);
      parts.hand(E, R, P, { at: [P.hx, P.hy], hand: M.fur });
    } else {
      const S = cane(R, P.hx, P.hy, P.a);
      parts.hand(E, R, P, { at: [P.hx, P.hy], hand: M.fur });
      sapling(R, RD(S.tx), RD(S.ty) - 1, P.gem, 0);
    }
    footSprout(P.sprout);
    bloom(R, P.bloom, hatBy);
  }
  // 化花消散：斗笠以外的像素先消散（从上往下），斗笠落地后最后消散
  const MAT_AT = (s, i) => { const m = s.mat[i]; if (m) return m; const w = s.w; return (s.mat[i + w] || s.mat[i + 1] || s.mat[i - 1] || s.mat[i - w] || 0); };
  function dissolve(s, qb, qh) {
    const w = s.w, h = s.h, o = s.out; let top = h, bot = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (o[y * w + x] !== 255) { if (y < top) top = y; if (y > bot) bot = y; }
    const span = Math.max(1, bot - top);
    for (let y = top; y <= bot; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (o[i] === 255) continue; const hatPx = HAT_MATS[MAT_AT(s, i)], q = hatPx ? qh : qb;
      if (q > 0 && B8[(y & 7) * 8 + (x & 7)] * 0.55 + (y - top) / span * 0.45 < q) o[i] = 255;
    }
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.dqb > 0 || P.dqh > 0) dissolve(hero, P.dqb, P.dqh);
  }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, shotX0 = 0, castT = 9, sprT = 9, recT = 9, chargeAcc = 0, soulAcc = 0, crossAcc = 0, emberAcc = 0, lastStep = 0, lastPers = -1, seedN = 0;
  const SEEDS = [];                                                   // 施放时撒出的种子：[起点 x, y, 落点 x]
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const gourdMouth = () => { const o = gourdGeo(parts.rig(P, BODY)); return [wx(o.lx - 6), wy(o.ly - 10)]; };
  const bodyC = () => [wx(3), wy(-11)];
  function onEnter(s) {
    if (s === RECOVER) recT = 0;
    if (s !== CAST) return;
    clearOrbit(); castT = 0; sprT = 9; SEEDS.length = 0;
    const hx = wx(K_WAVE.bhx), hy = wy(K_WAVE.bhy);
    for (const p of allyPoints()) SEEDS.push([hx, hy, p.x]);
    burst(hx, hy, 22, 40, 100, 0.25, 0.55, R_EL, 14); ring(hx, hy, 1, R_EL); fx.cross(hx, hy, 5, R_EL, 0.22, 2);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {                                 // 屈指一弹：种子划小弧飞向目标
      mzT = 0; mzX = wx(P.bhx + 1); mzY = wy(P.bhy); shotX0 = mzX + 1;
      shoot(1, shotX0, mzY, 150, DUMMY_X - 3, R_EL, 0, { trail: false, glow: 3 });
      burst(mzX, mzY, 5, 20, 50, 0.12, 0.25, R_EL, 0);
      sfx('swing', { kind: 'throw', w: 0.2 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === CHARGE && t === T_THUD) {                                  // 拐杖顿地：脚下亮起草叶法阵
      const S = canePts(P.hx, P.hy, P.a), bx = wx(RD(S.bx) + P.bx);
      for (let i = 0; i < 6; i++) spawn(K_DUST, bx + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 22, -5 - Math.random() * 7, 0.35, FXI.dust);
      fx.circle(wx(3), HY + 1, 13, 3, R_EL, DUR[CHARGE] - T_THUD + 0.1, 1, 0); burst(bx, HY - 1, 8, 20, 50, 0.2, 0.4, R_EL, 20);
    }
    if (s === CAST && t === T_LAND) {                                    // 种子落在友军脚下：长成发光怪芽，友军绿描边
      sprT = 0; allyFx({ dur: 1.5, outline: R_EL });
      for (const p of allyPoints()) { burst(p.x, HY - 2, 12, 20, 70, 0.2, 0.5, R_EL, 30); fx.cross(p.x, HY - 6, 4, R_EL, 0.3, 2); for (let i = 0; i < 4; i++) spawn(K_DUST, p.x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -5 - Math.random() * 5, 0.3, FXI.dust); }
      ring(allyPoints()[1].x, HY - 3, 0, R_EL); shake(0.12, 1); sfx('impact', { pal: 'nature', w: 0.3 });
    }
    if (s === DEATH && t === T_SETTLE) {                                 // 跪坐落定
      for (let i = 0; i < 10; i++) spawn(K_DUST, wx(-8 + Math.random() * 18), HY - 1, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.25 });
    }
    if (s === DEATH && t === T_HATLAND) { for (let i = 0; i < 8; i++) spawn(K_DUST, wx(-3 + Math.random() * 16), HY - 1, (Math.random() - 0.5) * 30, -4 - Math.random() * 6, 0.35, FXI.dust); }
  }
  const EVENTS = [[], [], [T_FLICK], [T_THUD], [T_LAND], [], [], [T_SETTLE, T_HATLAND], []];
  function impactOn(k, x, y) {
    if (k !== 1) return;                                                 // 种子砸中：迸出绿火星 + 两片碎叶
    burst(x, y, 10, 30, 80, 0.18, 0.4, R_EL, 10);
    for (let i = 0; i < 2; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 40, -30 - Math.random() * 20, 0.6, R_EL, { g: 160, floor: HY, age0: 0.3 });
    hitDummy(0); sfx('hit', { mat: 'wood', w: 0.2 });
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && stT > 0.3) {                                 // 种子一颗颗从葫芦口飘出，绕身旋转
      chargeAcc += dt * 9;
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const g = gourdMouth(), c = bodyC(), dx = g[0] - c[0], dy = (g[1] - c[1]) / 0.6, r = Math.hypot(dx, dy);
        spawnX(K_SPIRAL_PT, c[0], c[1], (r - 10) / 0.35 + 4, 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: 2.6, tx: c[0], ty: c[1], orbitR: 10, orbitW: 3.2, squash: 0.6 });
      }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) sfx('step', { w: 0.25 }); lastStep = P.step; }   // 轻：无尘
    if (state === IDLE) {
      const lp = q12(stT) % DUR[IDLE], f = lp >= PERS0 - 1e-6 && lp < PERS0 + 1 ? f12of(lp - PERS0) : -1;
      if (f !== lastPers) {
        if (f === 2) spawnX(K_PHYS, wx(9), wy(-6), 26, -10, 0.5, R_EL, { g: 200, floor: HY, age0: 0.2 });   // 撒下的种子
        if (f === 3) burst(wx(17), HY - 1, 4, 10, 25, 0.15, 0.3, R_EL, 10);
        lastPers = f;
      }
      emberAcc += dt * 1.6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + RD(Math.random() * 2 - 1), gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); }
    }
    if (state === RECOVER) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -7 - Math.random() * 6, 0.6, R_EL); } }
    if (sprAlive()) {                                                     // 怪芽持续冒出十字形上升光点（每秒 2 串）
      crossAcc += dt * 2;
      if (sprT < dt * 1.5) crossAcc = 1;
      while (crossAcc >= 1) {
        crossAcc -= 1;
        for (const p of allyPoints()) for (let j = 0; j < 2; j++) { const x = p.x + (j ? 3 : -2), y = HY - 9 - j * 5; for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) spawn(K_RISE, x + dx, y + dy, 0, -13, 0.9, R_EL); }
      }
    }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.15) {   // 连人带花化成绿色光点飘散
      soulAcc += dt * 34; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-8 + Math.random() * 18), HY - 1 - Math.random() * 12, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, R_EL); }
    }
    mzT += dt; castT += dt; sprT += dt; recT += dt;
  }
  const SPR_END = DUR[CAST] - T_LAND + DUR[RECOVER];
  function sprAlive() { const st = E.state; return (st === CAST || st === RECOVER) && sprT < SPR_END; }
  function sprLv() { if (!sprAlive()) return 0; const t = sprT; if (t < 1 / 12) return 1; if (t < 2 / 12) return 2; if (t < SPR_END - 0.25) return 3; if (t < SPR_END - 0.12) return 2; return 1; }
  function fxReset() { mzT = 9; castT = 9; sprT = 9; recT = 9; chargeAcc = 0; soulAcc = 0; crossAcc = 0; emberAcc = 0; lastStep = 0; lastPers = -1; seedN = 0; SEEDS.length = 0; }
  function fxBack(f12) {
    if (P.dqb < 1 && !P.caneDown) floorGlow(wx(P.gx), P.rim, EL, f12);
    if (E.state === CHARGE && E.stT > T_THUD) {                           // 草叶法阵：一圈小叶片慢慢转
      const q = clamp01((E.stT - T_THUD) / 0.3), cx = wx(3), n = 8;
      for (let k = 0; k < n; k++) { if (k / n > q) continue; const a = E.stT * 1.4 + k / n * 6.2832, x = RD(cx + Math.cos(a) * 11), y = RD(HY + 1 + Math.sin(a) * 2.5); put(x, y, EL[2]); put(x + (Math.sin(a) > 0 ? 1 : -1), y - 1, EL[1]); }
    }
    const lv = sprLv();
    if (lv) for (const p of allyPoints()) for (let x = p.x - 5; x <= p.x + 5; x++) { const d = Math.abs(x - p.x); if (d < 3 || ((x + f12) & 1) === 0) put(x, FLOOR, d < 2 ? EL[1] : d < 4 ? EL[2] : EL[3]); }
  }
  function fxMid(f12) {
    const lv = sprLv(); if (!lv) return;                                 // 发光怪芽（友军脚下）
    for (const p of allyPoints()) {
      const x = p.x + 3, y = HY;
      put(x, y, LEAF[2]); if (lv >= 2) { put(x, y - 1, LEAF[2]); put(x - 1, y - 2, LEAF[3]); put(x + 1, y - 1, LEAF[3]); }
      if (lv >= 3) { put(x, y - 2, LEAF[2]); put(x, y - 3, LEAF[1]); put(x + 1, y - 3, LEAF[3]); put(x + 2, y - 4, LEAF[3]); put(x - 1, y - 4, LEAF[3]); put(x, y - 4, EL[(f12 >> 1) & 1 ? 0 : 1]); put(x, y - 5, EL[1]); put(x - 1, y - 5, EL[2]); put(x + 1, y - 5, EL[2]); }
    }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.caneDown && P.dq < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 2; r++) { put(mzX + r, mzY, c); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } }
    if (E.state === CAST && castT < T_LAND) {                             // 撒出的种子：小弧线落向每名友军脚下
      const p = clamp01(castT / T_LAND);
      for (const [x0, y0, x1] of SEEDS) for (let j = 0; j < 3; j++) {
        const q = Math.max(0, p - j * 0.12), x = RD(x0 + (x1 - x0) * q), y = RD(y0 + (HY - 1 - y0) * q - 14 * 4 * q * (1 - q));
        put(x, y, EL[j]); if (j === 0) { put(x + 1, y, EL[1]); put(x, y + 1, EL[2]); }
      }
    }
  }
  function drawShot(k, x, y, d, f12, Rr) {
    if (k !== 1) return false;                                           // 弹种子：小弧线 + 两颗拖尾
    const tx = DUMMY_X - 3, arc = (xx) => { const p = clamp01((xx - shotX0) / Math.max(1, tx - shotX0)); return -RD(9 * 4 * p * (1 - p)); };
    for (let j = 2; j >= 1; j--) { const xx = x - d * j * 3; if ((xx - shotX0) * d < 0) continue; put(xx, y + arc(xx), EL[j + 1]); }
    const yy = y + arc(x); put(x, yy, EL[0]); put(x + d, yy, EL[1]); put(x, yy + 1, EL[2]); put(x + d, yy + 1, EL[2]);
    return true;
  }

  return {
    name: '隐士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.bud, M.budHot], HIT_POINT: [3, -9], EVENTS, ALLIES: 'skill', ALLY_X: [HX - 22, HX + 28],
    SFX: { body: 'beast', how: 'collapse', pal: 'nature', style: 'heal', w: 0.25 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
