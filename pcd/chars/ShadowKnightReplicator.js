// 影骑士分身 ShadowKnightReplicator（衍生单位 · 自然 · 战士 · 普通 · 近战 240）：影骑士的「憎恨繁殖者」召唤出的超级随从（存在 40 秒）。
// 影骑士的缩小单色剪影：同款狐首盔尖耳（整个是墨紫色，眼缝一道紫白光）、双手巨剑缩短成 14 格（没有裂隙，只有一道白边）；
// 腰以下没在一滩贴地的墨黑影池里，没有腿，靠影池滑动；轮廓边缘隔几行缺一格、每 0.4 s 错位 1 格，像信号不稳。
// 攻击 = 砸：双手举剑过顶，连人带剑往下砸（身体跟着沉进池里 2–3 格）。
// 技能「影压」（分身的招牌一击，没有特性）：影池扩到 24 格、身体升起露出一截影子腿、池边暗光汇聚 → 连人带剑砸进地面、只剩剑插在池里 →
//        目标脚下同时冒出一滩影池、墨紫裂纹放射、暗色影浪掀起、目标下陷 1 格 → 身体扶着剑从池里重新浮出来。
// 死亡 = 坍缩：身体被吸回影池，影池向中心收成一个点「噗」地消失，留下 3 颗紫白碎光上升。设定卡见 pcd/batch-10/ShadowKnightReplicator/design.md。
PCD.define('ShadowKnightReplicator', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, PI = Math.PI;

  // ───── 元素：裂织残影 · 墨紫（白 21 → 淡紫 43 → 深紫 54 → 墨紫 53 → 暗影 52）；暗色影浪用 shadow ─────
  const R_EL = fxRamp('riftShade', [21, 43, 54, 53, 52]), EL = FXR[R_EL], R_DARK = FXI.shadow;

  // ───── 材质：全身单色墨紫剪影；影池墨黑；眼缝 / 剑边紫白 ─────
  const M = parts.mats(E, {
    body: ['#050309', '#140c22', '#241838', '#3a2a58'],
    pool: ['#050309', '#050309', '#140c22', '#241838'],
    bub: { r: [0, 53, 54, 43], flat: 1 },                      // 影池里冒出来的亮泡
    edge: { r: [52, 54, 43, 43], flat: 1 },                    // 剑的白边（平时淡紫）
    hot: { r: [52, 43, 21, 21], flat: 1 },                     // 剑边亮起（蓄满 / 施放）
    eye: { r: [52, 43, 43, 21], flat: 1 },                     // 眼缝
  });
  const INK = E.color('#050309'), POOL_D = E.color('#140c22'), POOL_B = E.color('#241838');
  const RIG = { body: 'heroic', leg: 3, torso: 10, head: 6, headW: 6, sw: 4, arm: 9, lw: 3, limb: 1.1, fall: 'back' };
  const SW = { style: 'great', len: 10, w: 3, guard: 5, metal: M.body, trim: M.body, wood: M.bodyD, edge: M.edge };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(60, 46, 24, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['pool', 'bub', 'edge', 'hot', 'eye']) RIM.skip[M[k]] = 1;

  // ───── 姿势：前手握剑（hx hy a = 剑的方向，0 朝上、顺时针为正），后手握在剑柄下一格 ─────
  // sink 沉进影池的格数 · rise 从池里升起的格数 · pw 影池半宽（-1 = 没有，0 = 收成一个点）· pl / pf 影池后沿 / 前沿偏移 · pph 冒泡相位
  // jit 边缘缺口相位 · gl 错位横条（0 无，1–3 三个高度）· stuck 剑插在池里（身体已沉下去）
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, step: 0, wup: 0, walk: 0, lying: 0, lift: 0,
    sink: 0, rise: 0, pw: 8, pl: 0, pf: 0, pph: 0, jit: 0, gl: 0, stuck: 0, gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, bx: 0, dq: 0, dqk: 0, st: 0,
    beard: 0, sway: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const KEY = keyer([['hx', -32, 31], ['hy', -64, 31], ['ai', -40, 40], ['lean', -1, 2], ['head', -1, 1], ['sink', 0, 24], ['rise', 0, 4], ['pw', -1, 14], ['pl', -2, 3], ['pf', -2, 4],
    ['pph', 0, 7], ['jit', 0, 3], ['gl', 0, 3], ['stuck', 0, 1], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['bx', -8, 8], ['dqk', 0, 48], ['st', 0, 8]]);
  const K = (hx, hy, a, lean, head) => ({ hx, hy, a, lean: lean || 0, head: head || 0 });
  // 手的位置按「身体不升不沉」写，poseAt 最后再加上 sink − rise
  const K_IDLE = K(6, -9, 0.6);                          // 巨剑斜举在身前，剑尖朝前上
  const K_RAISE = K(1, -17, -0.7, -1, -1);               // 双手举剑过顶，剑身后仰
  const K_SMASH = K(8, -10, 1.75, 1, 1);                 // 往下砸：剑身朝前、略向下
  const K_FOLLOW = K(8, -9, 2.05, 1, 1);                 // 砸到底，剑尖点地
  const K_CHARGE = K(2, -16, -0.1, -1, -1);              // 蓄力：剑高举竖直
  const K_SLAM = K(9, -6, 2.55, 2, 1);                   // 影压：连人带剑砸进地面
  const K_HURT = K(3, -9, -0.35, -1, -1);
  const K_SUCK = K(4, -15, 0.7, -1, -1);                 // 被吸回影池时举着剑挣扎
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const T_SMASH = 2 / 12, T_HIT = 2 / 12, T_SUNK = INCOMING + 0.66, T_POOF = INCOMING + 1.5, STUCK_AT = [12, -8];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.sink = 0; P.rise = 0; P.pw = 8; P.pl = 0; P.pf = 0; P.pph = 0; P.jit = 0; P.gl = 0; P.stuck = 0;
    P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.dq = 0; P.flip = 0; P.mx = 0; P.step = 0;
    const idle = () => {                                          // 空洞凝视：一动不动；每 0.4 s 的第一帧轮廓错位 1 格；影池冒泡；眼缝偶尔亮一下
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6);
      P.jit = b & 3; P.pph = Math.floor(TT * 5 + 1e-6) & 7;
      if (f12 === Math.ceil(b * 4.8 - 1e-6)) P.gl = 1 + (b % 3);
      const lp = tq % DUR[IDLE]; if (lp >= 1.5 && lp < 1.75) { P.gem = 1; P.glint = lp >= 1.58 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                      // 影池滑行：上半身不动，池的前沿先伸出 2 格，再把身体拖过去
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq);
      P.step = [1, 0, -1, 0][f]; P.pf = [0, 2, 1, 0][f]; P.pl = [0, 0, 0, -1][f]; P.bx = [0, 0, 1, 1][f]; P.lean = [0, 0, 1, 0][f]; P.pph = f * 2 + 1; P.jit = f;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                  // 举剑过顶（身体升起 1 格）→ 连人带剑砸下（沉进池里 2–3 格）→ 浮回
      if (tq < T_SMASH) { setK(K_IDLE, K_RAISE, ease.out(clamp01(tq / 0.12))); P.rise = tq >= 1 / 12 ? 1 : 0; P.gem = 1; P.pw = 9; P.pph = f12 & 7; }
      else if (tq < 0.45) { const q = ease.out(clamp01((tq - T_SMASH) / 0.2)); setK(K_SMASH, K_FOLLOW, q); P.bx = 3; P.sink = 2; P.gem = tq < 0.3 ? 2 : 1; P.rim = 2; P.pf = 2; P.pw = 9; P.gl = tq < 0.25 ? 2 : 0; P.pph = f12 & 7; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_FOLLOW, K_IDLE, q); P.bx = RD(3 * (1 - q)); P.sink = RD(2 * (1 - q)); P.pf = RD(2 * (1 - q)); P.pph = f12 & 7; }
    } else if (st === CHARGE) {                                  // 影池扩到 24 格，身体升起 4 格露出影子腿，剑高举、白边亮起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q); P.rise = RD(4 * q); P.pw = 8 + RD(4 * clamp01(tq / 0.6));
      P.pph = f12 & 7; P.jit = (f12 >> 1) & 3; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      if (tq > 1.05 && (f12 & 1)) P.gl = 1 + ((f12 >> 1) % 3);   // 蓄满前最后一段信号越来越不稳
    } else if (st === CAST) {                                    // 砸下去：第 1 帧砸地，之后整个沉进池里，只剩剑插在池里
      setK(K_SLAM, K_SLAM, 0); P.pw = 12; P.pph = f12 & 7; P.gem = 3; P.rim = 3; P.jit = f12 & 3;
      if (tq < 1 / 12) { P.sink = 3; P.bx = 2; P.gl = 2; }
      else { P.stuck = 1; P.sink = tq < 2 / 12 ? 12 : 24; }
    } else if (st === RECOVER) {                                 // 身体扶着剑从池里重新浮出来，影池缩回 16 格
      P.pph = f12 & 7; P.jit = f12 & 3;
      if (tq < 0.3) { setK(K_SLAM, K_SLAM, 0); P.stuck = 1; P.sink = RD(24 - 60 * tq); P.pw = 12; P.gem = 2; P.rim = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.3) / 0.35)); setK(K_SLAM, K_IDLE, q); P.sink = RD(6 * (1 - q)); P.pw = 8 + RD(4 * (1 - q)); P.gem = q < 0.5 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.gl = 3; P.jit = 2; P.pl = -1; P.pf = -1; P.pph = 3; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.rim = 0; P.gl = 1; P.pph = 4; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.pph = 5; }
    } else if (st === DEATH) {                                   // 坍缩：被吸回影池 → 池静静冒泡 → 收成一个点 →「噗」
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.gl = 1 + (f12 % 3); P.jit = f12 & 3; P.gem = f12 & 1; P.pph = f12 & 7; }
      else if (d < 0.66) { const q = clamp01((d - 0.3) / 0.36); setK(K_HURT, K_SUCK, ease.out(q)); P.bx = -2; P.eyes = 1; P.sink = RD(24 * ease.in(q)); P.pw = 9; P.gl = 1 + (f12 % 3); P.jit = f12 & 3; P.pph = f12 & 7; P.gem = 4; }
      else if (d < 1.3) { P.bx = -2; P.sink = 24; P.pw = 8; P.pph = Math.floor(d * 4 + 1e-6) & 7; P.gem = 4; }
      else if (d < T_POOF - INCOMING) { P.bx = -2; P.sink = 24; P.pw = RD(8 * (1 - ease.in(clamp01((d - 1.3) / 0.2)))); P.pph = f12 & 7; P.gem = 4; }
      else { P.bx = -2; P.sink = 24; P.pw = -1; P.gem = 4; }
    } else if (st === REVIVE) {
      idle();
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.sink - P.rise; P.a = RD(P.a / ASTEP) * ASTEP; P.ai = RD(P.a / ASTEP);
    P.lean = RD(P.lean); P.head = RD(P.head);
    if (P.stuck) { P.hx = STUCK_AT[0]; P.hy = STUCK_AT[1] - 1; P.a = PI; P.ai = 32; }   // 手扶在倒插的剑柄上（沉得太深时不画手臂）
    const b = parts.along(P, SW, -2); P.bhx = b[0]; P.bhy = b[1];
    if (P.stuck) { P.gx = STUCK_AT[0] + P.bx; P.gy = STUCK_AT[1] + 3; }
    else { const f = parts.sword.focus(P, SW); P.gx = f[0] + P.bx; P.gy = f[1]; }
    if (P.sink >= 20 && !P.stuck) { P.rim = 0; P.hy = Math.min(P.hy, 31); P.bhy = Math.min(P.bhy, 31); }   // 身体整个沉下去时手不画了（缓存键不越界）
    P.dqk = RD(P.dq * 48); KEY(P);
  }

  // ───── 画 ─────
  // 候选部件：foxHelm 狐首盔——盖住整个头（后脑多 1 格），顶上两只尖耳（后耳往后倾、前耳竖直；底宽 3 → 2 → 1，耳间留 2–3 格让剪影分得开），
  //   前面一截 2 格狐吻（上亮下暗），额顶一道亮脊、颊甲一道暗线，眼缝一行发光材质（3 格）。o = { mat, eye }。读 P.eyes（闭眼 = 暗缝）P.gem（眼缝亮度）。一个部件
  function foxHelm(R, o) {
    const T = R, m = o.mat, x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, px = (x, y, mm, t) => parts.px(E, T, x, y, mm, t);
    E.part();
    for (let y = top; y <= bot; y++) { let a = x0 - 1, b = x1; if (y === top) { a++; b--; } if (y === bot) a++; parts.run(E, T, y, a, b, m, 0); }
    parts.run(E, T, top - 1, x0 - 1, x0 + 1, m, 0); parts.run(E, T, top - 2, x0 - 2, x0, m, 0); px(x0 - 2, top - 3, m, 4);          // 后耳（往后倾）
    parts.run(E, T, top - 1, x1 - 2, x1, m, 0); parts.run(E, T, top - 2, x1 - 1, x1, m, 0); px(x1 - 1, top - 3, m, 4); px(x1 - 1, top - 4, m, 3);   // 前耳（竖直）
    px(x1 - 1, top - 1, m, 2); px(x0, top - 1, m, 2);                                                                                   // 耳窝
    parts.run(E, T, ey + 1, x1 + 1, x1 + 2, m, 4); px(x1 + 1, ey + 2, m, 2);                                                            // 狐吻
    parts.run(E, T, top, x0 + 1, x1 - 2, m, 4);                                                                                         // 额顶亮脊
    parts.run(E, T, ey + 2, x0 + 1, x0 + 3, m, 2);                                                                                      // 颊甲线
    if (P.eyes) parts.run(E, T, ey, x1 - 2, x1, m, 1);
    else { parts.run(E, T, ey, x1 - 2, x1, o.eye, P.gem >= 1 ? 4 : 3); px(x1 - 2, ey, o.eye, 3); if (P.glint || P.gem >= 2) px(x1 + 1, ey, o.eye, 4); }
  }
  // 候选部件：shadowPool 贴地影池——墨黑两行（下行全宽、上行各收 1 格），上沿每 3 格一个亮点，按相位在上沿鼓起一个泡、偶尔一个亮泡破开；
  //   两端按相位伸缩 1 格（边缘波动）。o = { hw 半宽（0 = 收成一个点，-1 = 不画）, l 后沿偏移, f 前沿伸出, ph 相位 }。画在身体之后，压住身体下沿成一道水线
  function pool(hw, l, f, ph) {
    const T = parts.FREE; if (hw < 0) return; E.part();
    if (hw === 0) { parts.run(E, T, 0, -1, 1, M.pool, 0); parts.px(E, T, 0, -1, M.bub, 3); return; }
    const x0 = -hw + l, x1 = hw + f, wob = ph & 1;
    parts.run(E, T, 0, x0 - wob, x1 + 1 - wob, M.pool, 0);
    parts.run(E, T, -1, x0 + 1, x1 - 1, M.pool, 0);
    for (let x = x0 + 2 + (ph % 3); x < x1 - 1; x += 3) parts.px(E, T, x, -1, M.pool, 4);
    const span = x1 - x0 - 4;
    if (span > 2) {
      const b1 = x0 + 2 + ((ph * 5) % span), b2 = x0 + 2 + ((ph * 3 + 7) % span);
      parts.px(E, T, b1, -2, M.pool, 4); parts.px(E, T, b1 + 1, -2, M.pool, 0);
      if ((ph & 3) === 1) parts.px(E, T, b2, -2, M.bub, 3); else if ((ph & 3) === 2) parts.px(E, T, b2, -3, M.bub, 4);
    }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    if (P.dq >= 1) return;
    RIG.leg = 3 + P.rise - P.sink; const R = parts.rig(P, RIG), armsOn = !P.stuck || P.sink <= 10;
    const SWd = P.gem >= 2 ? Object.assign({}, SW, { edge: M.hot }) : SW;
    if (P.sink < 20) {
      if (armsOn) parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.bodyD, pauldron: M.bodyD, grip: 'none' });
      if (P.rise > 0) parts.legs(E, R, P, { style: 'bare', mat: M.body, matD: M.bodyD });            // 升起时露出的一截影子腿
      parts.torso(E, R, P, { style: 'plate', mat: M.body, belt: M.bodyD, hem: R.yHip + 2 });
      foxHelm(R, { mat: M.body, eye: M.eye });
    }
    if (P.stuck) parts.sword(E, R, P, Object.assign({}, SWd, { free: 1, at: STUCK_AT, a: PI }));      // 剑倒插在池里
    else if (P.sink < 20) parts.sword(E, R, P, SWd);
    if (P.sink < 20 && armsOn) {
      parts.hand(E, R, P, { side: 'B', hand: M.bodyD });
      parts.arm(E, R, P, { sleeve: 'plate', mat: M.body, pauldron: M.body, hand: M.body, grip: 'fist' });
    }
    pool(P.pw, P.pl, P.pf, P.pph);
  }
  // 信号不稳：边缘隔 3 行缺一格（缺口相位 jit），错位横条整条右移 1 格
  function glitch() {
    const o = hero.out, mt = hero.mat, w = hero.w, top = hero.oy - 3;
    const isBody = (m) => m === M.body || m === M.bodyD;
    for (let y = 0; y <= top; y++) {
      if (((y + P.jit) % 3) !== 0) continue;
      let L = -1, Rr = -1; for (let x = 0; x < w; x++) if (o[y * w + x] !== 255) { if (L < 0) L = x; Rr = x; }
      if (L < 0) continue;
      if (L + 2 < w && mt[y * w + L] === 0 && isBody(mt[y * w + L + 1]) && o[y * w + L + 2] !== 255) { o[y * w + L] = 255; o[y * w + L + 1] = INK; }
      if (Rr - 2 >= 0 && Rr !== L && mt[y * w + Rr] === 0 && isBody(mt[y * w + Rr - 1]) && o[y * w + Rr - 2] !== 255) { o[y * w + Rr] = 255; o[y * w + Rr - 1] = INK; }
    }
    if (P.gl) {
      const y0 = hero.oy + [0, -17, -12, -7][P.gl];
      for (let y = y0; y < y0 + 3; y++) { if (y < 0 || y >= hero.h) continue; for (let x = w - 1; x > 0; x--) o[y * w + x] = o[y * w + x - 1]; o[y * w] = 255; }
    }
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.dq < 1) glitch();
  }

  // ───── 特效 ─────
  let dpT = 9, poofT = 9, bubAcc = 0, convAcc = 0, lastStep = 0;
  const POOL_C = [INK, POOL_D, POOL_B];
  function onEnter(s) {
    if (s !== CAST) return;                                      // 砸进地面：池里溅起墨滴 + 冲击环 + 震屏 2 格 + 天空闪白
    burst(scrX(8), HY - 3, 22, 40, 110, 0.2, 0.5, R_EL, 30); ring(scrX(2), HY - 1, 1, R_EL);
    for (let i = 0; i < 12; i++) spawnX(K_PHYS, scrX(-10 + Math.random() * 22), HY - 2, (Math.random() - 0.5) * 50, -30 - Math.random() * 40, 0.5 + Math.random() * 0.3, R_DARK, { g: 170, floor: HY });
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_SMASH) < 1e-9) {          // 砸：过顶到前下的拖影弧 + 命中火花 + 砸地的一道短裂纹
      fx.slash(scrX(7), HY - 12, 14, -0.7, 2.1, R_EL, 0.18, 2, 2);
      const hx = DUMMY_X - 3, hy = HY - 15; fx.cross(hx, hy, 4, R_EL, 0.18); burst(hx, hy, 10, 40, 100, 0.15, 0.35, R_EL, 10); burst(hx, hy, 5, 30, 70, 0.1, 0.25, FXI.impact, 8);
      fx.crack(scrX(20), FLOOR, 6, 1, R_EL, 0.35); hitDummy(0, 1);
      sfx('swing', { kind: 'smash', w: 0.6 }); sfx('hit', { mat: 'metal', w: 0.6 });
    }
    if (s === CAST && Math.abs(t - T_HIT) < 1e-9) {              // 目标脚下冒出影池 + 墨紫裂纹放射 + 暗色影浪 + 下陷 1 格
      dpT = 0;
      fx.crack(DUMMY_X - 4, FLOOR, 12, -1, R_EL, 0.7); fx.crack(DUMMY_X + 4, FLOOR, 12, 1, R_EL, 0.7); fx.crack(DUMMY_X - 2, FLOOR, 7, -1, R_EL, 0.5);
      fx.wave(DUMMY_X - 9, HY, 1, 18, 8, R_DARK, 0.45, 2); fx.cross(DUMMY_X, HY - 18, 5, R_EL, 0.25);
      burst(DUMMY_X, HY - 4, 24, 40, 120, 0.25, 0.6, R_EL, 40);
      dummyFx({ dur: 1.3, tint: 'shadow', sink: 1 }); hitDummy(1, 1); shake(0.12, 1); sfx('impact', { pal: 'shadow', w: 0.6 });
    }
    if (s === DEATH && Math.abs(t - T_SUNK) < 1e-9) {            // 身体整个被吸进池里：池面溅起墨滴
      for (let i = 0; i < 10; i++) spawnX(K_PHYS, scrX(-8 + Math.random() * 14), HY - 2, (Math.random() - 0.5) * 36, -20 - Math.random() * 30, 0.4 + Math.random() * 0.3, R_DARK, { g: 160, floor: HY });
      shake(0.1, 1); sfx('fall', { w: 0.3 });
    }
    if (s === DEATH && Math.abs(t - T_POOF) < 1e-9) {            // 「噗」：收成一点后消失，3 颗紫白碎光上升
      poofT = 0; burst(scrX(0), HY - 1, 8, 20, 50, 0.12, 0.3, R_EL, 6);
      for (let i = 0; i < 3; i++) spawn(K_RISE, scrX(-2 + i * 2), HY - 2 - i, (i - 1) * 4, -12 - i * 3, 1.1 + i * 0.15, R_EL);
    }
  }
  const EVENTS = [[], [], [T_SMASH], [], [T_HIT], [], [], [T_SUNK, T_POOF], []];
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.2 }); for (let i = 0; i < 2; i++) spawn(K_EMBER, scrX(8 + P.pf + i), HY - 2, (P.flip ? -1 : 1) * 6, -5 - Math.random() * 4, 0.3 + Math.random() * 0.2, R_EL); } lastStep = P.step; }
    if ((state === IDLE || state === MOVE || state === RECOVER) && P.pw > 0) { bubAcc += dt * 3; while (bubAcc >= 1) { bubAcc -= 1; spawn(K_EMBER, scrX(-P.pw + 2 + Math.random() * (2 * P.pw - 4)), HY - 2, Math.random() * 4 - 2, -4 - Math.random() * 5, 0.35 + Math.random() * 0.3, R_EL); } }
    if (state === CHARGE && stT < 1.3) {                         // 池边的点阵暗光贴着地面向中间汇聚
      convAcc += dt * (18 + 20 * clamp01(stT / 1.4));
      while (convAcc >= 1) { convAcc -= 1; const side = Math.random() < 0.5 ? -1 : 1, r = 10 + Math.random() * 4; spawnX(K_SPIRAL_PT, scrX(0), HY - 1, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a: side < 0 ? PI : 0, r, w: side * 0.6, squash: 0.2 }); }
    }
    dpT += dt; poofT += dt;
  }
  function fxReset() { dpT = 9; poofT = 9; bubAcc = 0; convAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (P.dq < 1 && P.sink < 20 && !P.stuck) floorGlow(scrX(P.gx), P.rim, EL, f12); else if (P.stuck) floorGlow(scrX(STUCK_AT[0]), P.rim, EL, f12); }
  function fxMid(f12) {                                          // 目标脚下的影池：0.1 s 张开到 12 格，停 0.8 s，再 0.3 s 收掉
    if (dpT >= 1.2) return;
    const q = dpT < 0.1 ? dpT / 0.1 : dpT > 0.9 ? 1 - (dpT - 0.9) / 0.3 : 1, hw = Math.max(1, RD(6 * q)), ph = (f12 >> 1) & 7;
    for (let x = -hw - (ph & 1); x <= hw + 1 - (ph & 1); x++) put(DUMMY_X + x, HY, x === -hw - (ph & 1) || x === hw + 1 - (ph & 1) ? POOL_C[0] : POOL_C[1]);
    for (let x = -hw + 1; x <= hw - 1; x++) put(DUMMY_X + x, HY - 1, ((x + ph) % 3) === 0 ? POOL_C[2] : POOL_C[1]);
    if (hw > 3) { put(DUMMY_X - hw + 2 + ((ph * 5) % Math.max(1, 2 * hw - 4)), HY - 2, POOL_C[2]); if ((ph & 3) === 1) put(DUMMY_X + 1, HY - 2, EL[1]); }
  }
  function fxFront(f12) {
    if (P.dq >= 1 || P.sink >= 20 && !P.stuck) return;
    if (P.gem >= 2 && P.gem <= 3) {                              // 剑尖 / 剑柄的星芒
      const tip = P.stuck ? [STUCK_AT[0], STUCK_AT[1] - 3] : parts.sword.focus(P, SW), x = scrX(tip[0] + P.bx), y = HY + tip[1], L = P.gem === 3 ? 4 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(x + r, y, c); put(x - r, y, c); put(x, y - r, c); put(x, y + r, c); }
    }
  }

  return {
    name: '影骑士分身', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.edge, M.hot, M.bub], HIT_POINT: [2, -12], EVENTS,
    SFX: { body: 'ghost', how: 'collapse', pal: 'shadow', style: 'shadow', w: 0.6 },
    REVIVE: { dy: -10, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
