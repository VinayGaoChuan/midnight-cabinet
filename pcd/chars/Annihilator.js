// 歼灭者（虚空 · 射手 · 稀有）：维克特拉的独特单位——一台会走的弩。两条细长反关节鸟腿托着一只小弩身舱，没有手臂；
// 弩身前端竖着一副热铜钢弓臂（上下展开 19 格），鼻端上方一只红色单眼瞄准镜，背后一只插满火焰箭的箭匣（箭尾露出顶上 4 格）。
// 攻击 = 弓臂一收一放，射出一支燃烧的弩箭；技能 = 特性「火焰箭」：弓弦缓缓后拉、箭头从橙烧到白、冷却鳍张开冒汽 →
// 火焰箭直线射出、身后拖一条火尾 → 插进假人停半拍后二段爆开，余火在目标身上烧 0.5 s。
// 死亡 = 跪折崩弦：鸟腿从膝处折断跪倒，弓弦崩断、弓臂弹飞落地，弩身向前扑倒冒烟，消散。升级线 → 巨型歼灭者（四足、双层弓臂、旋转弹鼓、三只红眼）。
// 身体不用现成骨架：反关节鸟腿、弩身舱、弩弓臂、箭匣、冷却鳍都是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('Annihilator', (E) => {
  const { defMat, Sprite, begin, part, sp, line, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_EMBER,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, B = E.parts.beast;

  // ───── 材质 ─────
  const M_POD = defMat('iron', 2), M_BOX = defMat('iron', 1);                    // 焦黑枪铁：弩身舱（band 2）/ 箭匣、冷却鳍
  const M_LEG = defMat('iron', 1), M_LEGD = defMat('iron', 1, 0, 1);              // 鸟腿（远侧暗一级）
  const M_JNT = defMat('steel', 1), M_JNTD = defMat('steel', 1, 0, 1);            // 胯 / 膝关节、脚爪、瞄准镜筒
  const M_BOW = defMat('gold', 1);                                               // 热铜弓臂
  const M_STR = defMat([8, 59, 60, 17], 1, 1);                                   // 弓弦（平涂）
  const M_EYE = defMat([12, 13, 26, 58], 1, 1);                                  // 红色单眼（发光体）：tone 1 熄灭 · 2 暗 · 3 常亮 · 4 亮
  const M_HEAD = defMat([45, 46, 47, 21], 1, 1);                                 // 火焰箭头（发光体）：tone 1 暗橙 · 2 橙 · 3 黄 · 4 白热
  const M_HEAT = defMat([44, 45, 46, 47], 1, 1);                                 // 冷却鳍缝里的热光
  const M_SHAFT = defMat('wood', 1), M_FLE = defMat('crimson', 1), M_INK = defMat('ink', 1, 1);
  const R_EL = FXI.fire, EL = FXR[R_EL], HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(68, 48, 30, 43);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const m of [M_EYE, M_HEAD, M_STR, M_SHAFT, M_HEAT]) RIM.skip[m] = 1;

  // ───── 姿势 ─────
  const P = { bob: 0, crouch: 0, px: 0, pitch: 0, pull: 1, flare: 0, loaded: 1, heat: 1, eye: 1, esc: 0, fins: 0, twang: 0, fF: 0, fB: 0, uF: 0, uB: 0, step: 0,
    bx: 0, flash: 0, dq: 0, dq48: 0, rim: 1, st: 0, lie: 0, lift: 0, snap: 0, drop: 0, dsx: 0, dsy: 0, las: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['bob', 0, 1], ['crouch', 0, 3], ['px', -1, 1], ['pitch', -1, 2], ['pull', 0, 3], ['flare', 0, 2], ['loaded', 0, 1], ['heat', 0, 3], ['eye', 0, 4], ['esc', 0, 1],
    ['fins', 0, 2], ['twang', 0, 1], ['fF', -4, 4], ['fB', -4, 4], ['uF', 0, 3], ['uB', 0, 3], ['bx', -4, 2], ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8],
    ['lie', 0, 2], ['lift', 0, 3], ['snap', 0, 1], ['drop', 0, 2], ['dsx', 0, 24], ['dsy', 0, 15]]);
  const CY0 = -17;                                                                 // 站姿弩身舱中心行
  const W_F = [4, 0, -4, 2], W_B = [-4, 2, 4, 0], W_UF = [0, 0, 0, 3], W_UB = [0, 3, 0, 0], W_BOB = [1, 0, 1, 0], W_STEP = [1, 0, -1, 0];
  const T_FIRE = 2 / 12, T_SNAP = INCOMING + 0.45, T_LAND = INCOMING + 0.66;
  const DROP = { at: 0.45, dur: 0.3, dx: 12, hop: 7 };

  function reset() {
    P.bob = 0; P.crouch = 0; P.px = 0; P.pitch = 0; P.pull = 1; P.flare = 0; P.loaded = 1; P.heat = 1; P.eye = 1; P.esc = 0; P.fins = 0; P.twang = 0;
    P.fF = 0; P.fB = 0; P.uF = 0; P.uB = 0; P.step = 0; P.bx = 0; P.flash = 0; P.dq = 0; P.rim = 1; P.lie = 0; P.lift = 0; P.snap = 0; P.drop = 0; P.dsx = 0; P.dsy = 0; P.las = 0; P.mx = 0; P.flip = 0;
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); reset(); P.st = st;
    const idle = () => {                                                              // 扫描：弩身在鸟腿上左右转，瞄准镜红光来回扫，偶尔松一下弦
      const TT = f12 / 12, b = Math.floor(TT * 2.5); P.bob = b & 1;
      const lp = tq % DUR[IDLE]; P.px = [0, 1, 0, -1][Math.floor(lp / 0.6) & 3]; P.esc = Math.floor(lp / 0.3) & 1;
      if (lp >= 0.8 && lp < 1.2) P.las = 1 + (Math.floor(lp * 10) & 3);
      if (lp >= 1.6 && lp < 2.0) { P.pull = lp < 1.92 ? 0 : 1; P.twang = lp >= 1.75 && lp < 1.92 ? (f12 & 1) : 0; P.eye = lp < 1.75 ? 2 : 1; P.pitch = lp < 1.75 ? -1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                           // 高抬腿快步：抬起的鸟腿高 3 格，脚爪咔哒落地
      const f = gait(tq); P.fF = W_F[f]; P.fB = W_B[f]; P.uF = W_UF[f]; P.uB = W_UB[f]; P.bob = W_BOB[f]; P.step = W_STEP[f]; P.esc = f & 1; P.pitch = f & 1 ? 0 : 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                       // 射：弓弦再拉一格 → 放 → 弓臂弹直、后坐 → 重新上弦装箭
      const f = f12of(tq);
      if (f === 1) { P.pull = 2; P.bx = -1; P.crouch = 1; P.eye = 2; P.heat = 2; }
      else if (f === 2) { P.pull = 0; P.flare = 2; P.loaded = 0; P.bx = -2; P.crouch = 1; P.eye = 3; P.rim = 2; P.pitch = -1; }
      else if (f >= 3 && f <= 5) { P.pull = 0; P.flare = f === 3 ? 1 : 0; P.loaded = 0; P.bx = f === 5 ? 0 : -1; P.twang = f & 1; P.eye = 2; }
      else if (f === 6) { P.pull = 0; P.loaded = 0; }
      else if (f === 7) { P.pull = 1; P.loaded = 0; P.bob = 1; }
    } else if (st === CHARGE) {                                                       // 弓弦缓缓后拉，箭头烧到白热，冷却鳍张开
      const q = ease.inOut(clamp01(tq / 0.7));
      P.pull = 1 + RD(q * 2); P.crouch = q > 0.3 ? 1 : 0; P.fins = tq < 0.3 ? 0 : tq < 0.6 ? 1 : 2; P.heat = tq < 0.35 ? 1 : tq < 0.8 ? 2 : 3;
      P.eye = tq < 0.45 ? 1 : 1 + (f12 & 1); P.rim = 2; P.twang = tq > 1.1 ? (f12 & 1) : 0;
    } else if (st === CAST) {
      P.pull = 0; P.flare = 2; P.loaded = 0; P.bx = tq < 0.17 ? -2 : -1; P.crouch = 1; P.fins = 2; P.eye = 3; P.rim = 3; P.pitch = tq < 0.17 ? -1 : 0;
    } else if (st === RECOVER) {                                                      // 冷却鳍合拢，弓弦回位，新箭上弦
      const q = ease.inOut(clamp01(tq / 0.6));
      P.fins = tq < 0.25 ? 2 : tq < 0.5 ? 1 : 0; P.pull = tq < 0.35 ? 0 : 1; P.loaded = tq >= 0.45 ? 1 : 0; P.twang = tq < 0.2 ? (f12 & 1) : 0;
      P.eye = q < 0.35 ? 2 : 1; P.rim = q < 0.5 ? 2 : 1; P.crouch = tq < 0.35 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.bx = -2; P.eye = 4; P.flash = h < 1 / 12 ? 1 : 0; P.crouch = 1; P.pitch = -1; P.twang = 1; P.flare = 1; P.px = -1; P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; P.eye = 4; P.twang = f12 & 1; P.rim = 0; }
      else idle();
    } else if (st === DEATH) {                                                        // 跪折崩弦
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { P.bx = -2; P.eye = (f12 & 1) ? 1 : 4; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 3; P.pitch = d < 0.15 ? -1 : 1; P.twang = 1; }
      else if (d < 0.5) { P.lie = 1; P.bx = -2; P.eye = (f12 & 1) ? 1 : 4; P.snap = d >= 0.45 ? 1 : 0; P.pull = P.snap ? 0 : 1; P.flare = P.snap ? 2 : 0; P.loaded = 0; }
      else {
        P.lie = 2; P.bx = -2; P.snap = 1; P.pull = 0; P.flare = 2; P.loaded = 0; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        P.eye = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
      if (d >= 0) { const r = B.dropAt(d, DROP); P.drop = r[0]; P.dsx = r[1]; P.dsy = r[2]; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
      P.eye = tq > 0.85 ? 2 : 1;
    }
    P.dq48 = RD(P.dq * 48);
    if (P.lie) { P.gx = 5 + P.bx; P.gy = P.lie === 1 ? -13 : -9 + (P.lift ? -P.lift : 0); }
    else { const yo = P.bob + P.crouch; P.gx = 13 + P.px + P.bx; P.gy = CY0 + yo + (P.pitch ? RD(15 * P.pitch / 8) : 0); }
    KEY(P);
  }

  // ───── 画 ─────
  // 弩身落笔变换：px 左右转、PY 上下、PT 前后俯仰（每 8 列 1 格，死亡扑倒时 2）；腿和脚爪不走它（脚踩在地上不动）
  let PX = 0, PY = 0, PT = 0;
  const TX = (x) => x + PX, TY = (x, y) => y + PY + (PT ? RD((x + 2) * PT / 8) : 0);
  const spT = (x, y, m, t) => sp(TX(x), TY(x, y), m, t);
  const lineT = (x0, y0, x1, y1, m, t) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) { const x = RD(x0 + (x1 - x0) * k / n), y = RD(y0 + (y1 - y0) * k / n); spT(x, y, m, t); } };
  const thick = (x0, y0, x1, y1, m, w) => { line(x0, y0, x1, y1, m, 0); if (w > 1) line(x0 + 1, y0, x1 + 1, y1, m, 0); };

  // 候选部件：反关节鸟腿（胯 → 往后折的膝 → 往前下的胫 → 踝 → 三趾爪 + 后距；胯、膝各一个钢关节）。up 抬脚格数（膝跟着抬），far 远侧暗一级
  function birdLeg(hx, hy, fx, up, far) {
    part(); const m = far ? M_LEGD : M_LEG, j = far ? M_JNTD : M_JNT, fy = -up, ax = fx - 1, ay = fy - 2;
    const kx = RD((hx + ax) / 2 - 3 + (up ? 1 : 0)), ky = RD(hy + (ay - hy) * 0.42 - (up ? 1 : 0));
    thick(hx, hy, kx, ky, m, 2);                                                   // 大腿 2 格
    line(kx, ky, ax, ay, m, 0); line(kx, ky + 1, ax, ay + 1, m, 0);               // 胫（往前下）
    sp(ax, ay + 1, m, 0); sp(ax, fy - 1, m, 0);
    for (let x = fx - 1; x <= fx + 2; x++) sp(x, fy, m, x === fx - 1 ? 2 : 0);    // 趾
    sp(fx + 3, fy, j, 4); sp(fx + 3, fy - 1, j, 3); sp(fx - 2, fy, j, 2);          // 前爪尖 / 后距
    sp(kx, ky, j, 4); sp(kx - 1, ky, j, 3); sp(kx, ky + 1, j, 3); sp(kx - 1, ky + 1, j, 2);   // 膝关节
    sp(hx, hy, j, 4); sp(hx + 1, hy, j, 3); sp(hx - 1, hy, j, 3);                  // 胯关节
  }
  // 折断的鸟腿：大腿从胯斜到地上的膝，胫往前平摊在地面，爪尖翘起（跪倒 / 扑倒）
  function brokenLeg(hx, hy, far) {
    part(); const m = far ? M_LEGD : M_LEG, j = far ? M_JNTD : M_JNT, kx = hx - 5, ky = -1;
    thick(hx, hy, kx, ky, m, 2);
    for (let x = kx + 1; x <= hx + 5; x++) sp(x, 0, m, x === hx + 5 ? 2 : 0);
    sp(hx + 6, 0, j, 4); sp(hx + 6, -1, j, 3); sp(hx + 7, -2, j, 4);
    sp(kx, ky, j, 4); sp(kx - 1, ky, j, 3); sp(kx, 0, j, 2); sp(kx - 1, 0, j, 2); sp(kx - 2, -1, j, 1);   // 膝关节折断，碎一角
    sp(hx, hy, j, 4); sp(hx + 1, hy, j, 3);
  }
  // 候选部件：弩身舱（前尖后方的楔形舱 + 后面的托尾 / 托板；面板缝、铆钉、散热格、鼻端箭槽）+ 同一部件里的弓弦
  const POD = [[-4, -6, 3], [-3, -7, 5], [-2, -8, 6], [-1, -8, 7], [0, -8, 7], [1, -8, 6], [2, -7, 5], [3, -6, 3], [4, -4, 1]];
  function pod(cy) {
    part();
    for (const [dy, x0, x1] of POD) for (let x = x0; x <= x1; x++) spT(x, cy + dy, M_POD, 0);
    for (let dy = -1; dy <= 1; dy++) { spT(-9, cy + dy, M_POD, 0); spT(-10, cy + dy, M_POD, 0); }
    for (let dy = -2; dy <= 2; dy++) spT(-11, cy + dy, M_POD, dy === -2 ? 4 : 0);
    for (let dy = -3; dy <= 3; dy++) spT(-2, cy + dy, M_POD, 1);                    // 面板缝
    spT(-5, cy - 2, M_POD, 4); spT(3, cy - 2, M_POD, 4); spT(-5, cy + 2, M_POD, 4);  // 铆钉
    for (const x of [-6, -4]) spT(x, cy + 1, M_POD, 1);                            // 散热格
    spT(6, cy, M_INK, 0); spT(7, cy, M_INK, 0);                                    // 鼻端箭槽
    if (P.snap) return;
    const bend = prodBend(), tx = 9 + RD(-bend), L = 8, nx = [tx, 4, 1, -2][P.pull];   // 弓弦（两端挂在弓梢，中间拉到弦扣）
    if (P.pull === 0) { const bu = P.twang ? 1 : 0; for (let r = -L; r <= L; r++) spT(tx + (Math.abs(r) < 4 ? bu : 0), cy + r, M_STR, 0); }
    else { lineT(tx, cy - L, nx, cy, M_STR, 0); lineT(nx, cy, tx, cy + L, M_STR, 0); if (P.twang) spT(nx + 1, cy - 1, M_STR, 0); }
  }
  // 候选部件：箭匣（背在托尾上的铁匣，插满火焰箭，箭尾红羽露出顶上 4 格）
  function quiverBox(cy) {
    part();
    for (let y = cy - 7; y <= cy - 2; y++) for (let x = -12; x <= -5; x++) spT(x, y, M_BOX, 0);
    for (let x = -11; x <= -6; x++) spT(x, cy - 5, M_BOX, 2);                      // 箍
    spT(-5, cy - 4, M_BOW, 4); spT(-5, cy - 5, M_BOW, 3);                          // 铜扣
    for (const ax of [-11, -8, -5]) {
      spT(ax, cy - 8, M_SHAFT, 3); spT(ax, cy - 9, M_SHAFT, 4); spT(ax - 1, cy - 10, M_SHAFT, 3);
      spT(ax - 1, cy - 11, M_FLE, 4); spT(ax - 2, cy - 11, M_FLE, 3); spT(ax - 2, cy - 10, M_FLE, 2); spT(ax, cy - 10, M_FLE, 2);
    }
  }
  // 候选部件：冷却鳍（弩身顶上两片散热鳍：0 合拢贴平 · 1 半开 · 2 全开，鳍缝里透出热光）
  function fins(cy) {
    part(); const n = P.fins;
    for (const fx0 of [-4, -1]) {
      spT(fx0, cy - 5, M_BOX, 0); spT(fx0 + 1, cy - 5, M_BOX, 0);
      for (let k = 1; k <= n * 1.5; k++) spT(fx0 - (k >> 1), cy - 5 - k, M_BOX, k === RD(n * 1.5) ? 4 : 0);
      if (n) spT(fx0 + 1, cy - 6, M_HEAT, n === 2 ? 4 : 3);
    }
  }
  // 瞄准镜：弩身顶前方的钢筒 + 红色单眼（2 格镜片，esc 扫描时亮点上下换）
  function scope(cy) {
    part();
    for (let x = 0; x <= 3; x++) { spT(x, cy - 4, M_JNT, 0); spT(x, cy - 3, M_JNT, 0); }
    spT(1, cy - 5, M_JNT, 3); spT(2, cy - 5, M_JNT, 4); spT(4, cy - 5, M_JNT, 4); spT(4, cy - 4, M_INK, 0); spT(4, cy - 3, M_INK, 0); spT(4, cy - 2, M_JNT, 2);   // 镜筒 + 镜框
    const e = P.eye, base = e === 4 ? 1 : e === 0 ? 2 : 3, hi = e === 4 ? 1 : e >= 2 ? 4 : 3;
    spT(5, cy - 4, M_EYE, P.esc ? base : hi); spT(5, cy - 3, M_EYE, P.esc ? hi : base); spT(6, cy - 4, M_EYE, e >= 2 && e !== 4 ? 4 : base); spT(6, cy - 3, M_EYE, base);
  }
  function bolt(cy) {
    if (!P.loaded) return;
    part();
    for (let x = 6; x <= 11; x++) spT(x, cy, M_SHAFT, (x & 1) ? 3 : 4);
    const h = P.heat + 1; spT(12, cy, M_HEAD, h); spT(13, cy, M_HEAD, Math.min(4, h + 1)); spT(14, cy, M_HEAD, h); spT(12, cy - 1, M_HEAD, Math.max(1, h - 1)); spT(12, cy + 1, M_HEAD, Math.max(1, h - 1));
  }
  // 候选部件：弩弓臂（竖直的热铜反曲弓臂，中段 2 格厚、弓梢回勾 1 格；pull 越大越弯，flare 弹直；中间一只铁夹把它夹在弩身鼻端）
  function prodBend() { return [1.2, 2.0, 2.8, 3.6][P.pull] - P.flare * 0.7; }
  function prod(cx, cy, free) {
    part(); const bend = prodBend(), L = 9, S = free ? sp : spT;
    for (let r = -L; r <= L; r++) {
      const q = r / L, x = RD(-bend * q * q) + (Math.abs(r) === L ? 1 : 0), a = Math.abs(r);
      S(cx + x, cy + r, M_BOW, a <= 1 ? 3 : a === L ? 4 : 0); if (a <= 6) S(cx + x + 1, cy + r, M_BOW, a <= 1 ? 3 : 2);
    }
    for (let r = -1; r <= 1; r++) S(cx - 1, cy + r, M_JNT, r === -1 ? 4 : 0);
  }
  function prodFlat(cx) {                                                          // 掉在地上：侧躺成一条，弓梢翘起
    part(); for (let x = cx - 8; x <= cx + 8; x++) sp(x, -1, M_BOW, 0); for (let x = cx - 4; x <= cx + 4; x++) sp(x, 0, M_BOW, 2);
    sp(cx - 9, -2, M_BOW, 4); sp(cx + 9, -2, M_BOW, 4); sp(cx, -2, M_JNT, 4); sp(cx + 1, -2, M_JNT, 3);
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0);
    if (P.lie) {
      const cy = P.lie === 1 ? -9 : -7 - P.lift; PX = 0; PY = cy - CY0; PT = P.lie === 2 ? 2 : 1;
      quiverBox(CY0);
      brokenLeg(-2, cy + 4 + (P.lie === 2 ? -1 : 0), 1);
      pod(CY0);
      brokenLeg(1, cy + 4 + (P.lie === 2 ? 0 : 0), 0);
      fins(CY0); scope(CY0);
      if (!P.drop) prod(9, CY0, 0);
      else if (P.drop === 1) prod(9 + P.dsx, -9 - P.dsy, 1);
      else prodFlat(9 + P.dsx + 2);
      return;
    }
    const yo = P.bob + P.crouch, cy = CY0 + yo; PX = P.px; PY = yo; PT = P.pitch;
    quiverBox(CY0);
    birdLeg(-2, cy + 4, -2 + P.fB, P.uB, 1);
    pod(CY0);
    birdLeg(1, cy + 4, 1 + P.fF, P.uF, 0);
    fins(CY0); scope(CY0); bolt(CY0); prod(9, CY0, 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, castX = 0, stkT = 9, stkX = 0, stkY = 0, exT = 9, burnT = 9, chargeAcc = 0, steamAcc = 0, emberAcc = 0, smokeAcc = 0, soulAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x);
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = HY + P.gy;
    releaseOrbit(40, 90, 0.3, 0.6);
    shoot(2, gx + 1, gy, 300, DUMMY_X - 3, R_EL, 0, { trail: { every: 1, life: [0.2, 0.45], back: [6, 24], off: 4 } });
    fx.cross(gx, gy, 6, R_EL, 0.25); ring(gx, gy, 0, R_EL); burst(gx, gy, 18, 40, 110, 0.2, 0.5, R_EL, 8);
    for (let i = 0; i < 6; i++) spawn(K_RISE, wx(-3 + (i % 2) * 3), HY + CY0 - 6, (Math.random() - 0.5) * 8, -18 - Math.random() * 14, 0.5 + Math.random() * 0.4, FXI.dust);   // 冷却鳍喷一口热气
    shake(0.28, 2); flash(0.05); mzT = 0; mzX = gx; mzY = gy; castX = gx; sfx('shoot', { proj: 'arrow' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {
      const gx = wx(P.gx), gy = HY + P.gy;
      shoot(1, gx + 1, gy, 260, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.12, 0.25], back: [10, 24], off: 3 } });
      mzT = 0; mzX = gx; mzY = gy; burst(gx, gy, 6, 30, 60, 0.12, 0.28, R_EL, 0);
      sfx('swing', { kind: 'bow', w: 0.4 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && t === T_SNAP) {                                                // 弓弦崩断，弓臂弹飞
      const x = wx(4) - 2, y = HY - 9; burst(x, y, 10, 40, 110, 0.15, 0.4, FXI.impact, 12); burst(wx(9) - 2, y, 6, 30, 80, 0.2, 0.45, FXI.coin, 16); fx.cross(x, y, 3, FXI.impact, 0.15);
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 14 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.5 });
    }
  }
  const EVENTS = [[], [], [T_FIRE], [], [], [], [], [T_SNAP, T_LAND], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 80, 0.15, 0.35, R_EL, 8); burst(x, y, 5, 30, 70, 0.12, 0.3, FXI.impact, 6); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.4 }); }
    else if (k === 2) {                                                               // 箭插进假人，身后留一条火尾，停半拍再爆
      stkT = 0; stkX = x; stkY = y; exT = 0.2;
      fx.beam(castX + 3, y, x - 4, y, 1, R_EL, 0.4, 1); burst(x, y, 10, 30, 90, 0.15, 0.35, R_EL, 6); hitDummy(0); shake(0.08, 1); sfx('impact', { pal: 'fire', w: 0.6 });
    }
  }
  function hurtFx(s) {                                                                // 金属受击：更多白金火花 + 几颗长寿命火星
    const hx = HX + 2, hy = HY + CY0; burst(hx, hy, s === DEATH ? 26 : 20, 60, 150, 0.2, 0.5, FXI.impact, 20); burst(hx, hy, 4, 80, 160, 0.5, 0.8, FXI.steel, 30);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, t) {
    const gx = wx(P.gx), gy = HY + P.gy;
    if (state === CHARGE) { chargeAcc += dt * (22 + 34 * clamp01(t / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    if (P.fins && !P.lie) { steamAcc += dt * (P.fins === 2 ? 14 : 7); while (steamAcc >= 1) { steamAcc -= 1; spawn(K_RISE, wx(-4 + Math.floor(Math.random() * 2) * 3 + P.px), HY + CY0 + P.bob + P.crouch - 7 - P.fins, (Math.random() - 0.5) * 6, -10 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust); } }
    if ((state === IDLE || state === RECOVER || state === MOVE) && P.loaded && !P.lie) { emberAcc += dt * 2.5; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 8, 0.5 + Math.random() * 0.5, R_EL); } }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 0.5 }); const fx0 = wx(P.step > 0 ? 1 + W_F[0] + 3 : -2 + W_B[2] + 3); spawn(K_DUST, fx0, HY, (Math.random() - 0.5) * 14, -4 - Math.random() * 5, 0.25 + Math.random() * 0.15, FXI.dust); spawn(K_DUST, fx0 - 2, HY, (Math.random() - 0.5) * 10, -3, 0.25, FXI.dust); spawn(K_EMBER, fx0 + 1, HY - 1, 4, -8, 0.15, FXI.impact); }
      lastStep = P.step;
    }
    if (state === DEATH && t > T_LAND && t < INCOMING + 1.6) { smokeAcc += dt * 12; while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_RISE, wx(-4 + Math.random() * 10), HY - 8 - Math.random() * 4, (Math.random() - 0.5) * 6, -10 - Math.random() * 10, 0.7 + Math.random() * 0.6, FXI.dust); } }
    if (state === DEATH && t > INCOMING + 1.6 && t < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 24, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    if (exT < 9) { exT -= dt; if (exT <= 0) {                                        // 二段爆：火焰外爆 + 冲击环，余火在目标身上烧 0.5 s
      exT = 9; stkT = 9; burnT = 0; burst(stkX, stkY, 34, 50, 140, 0.3, 0.7, R_EL, 16); ring(stkX, stkY, 1, R_EL); fx.cross(stkX, stkY, 7, R_EL, 0.3);
      dummyFx({ dur: 0.7, tint: 'fire' }); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.9 });
    } }
    if (burnT < 0.5) { if (Math.random() < dt * 30) spawn(K_EMBER, DUMMY_X - 5 + Math.random() * 10, HY - 8 - Math.random() * 18, Math.random() * 6 - 3, -10 - Math.random() * 10, 0.3 + Math.random() * 0.3, R_EL); }
    mzT += dt; stkT += dt; burnT += dt;
  }
  function fxReset() { mzT = 9; stkT = 9; exT = 9; burnT = 9; chargeAcc = 0; steamAcc = 0; emberAcc = 0; smokeAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (!P.lie) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (P.las && P.dq < 1) {                                                          // 瞄准镜红光来回扫（虚线）
      const lx = wx(7 + P.px), ly = HY + CY0 + P.bob - 4, sl = [-0.2, 0, 0.2, 0.35][P.las - 1];
      for (let k = 2; k <= 16; k += 2) put(lx + k, RD(ly + k * sl), k < 8 ? 26 : 13);
    }
    if (P.eye === 3 && !P.lie && P.dq < 1) { const ex = wx(6 + P.px), ey = HY + CY0 + P.bob + P.crouch - 4 + (P.pitch ? RD(8 * P.pitch / 8) : 0); put(ex + 1, ey, 58); put(ex + 2, ey, 26); put(ex, ey - 1, 26); put(ex, ey + 1, 26); }
    if (stkT < 0.6) {                                                                 // 插在假人上的火焰箭：箭杆 + 箭羽露在外面，箭头处火苗乱窜
      const x = RD(stkX), y = RD(stkY);
      for (let k = 1; k <= 5; k++) put(x - k, y, k === 1 ? 45 : 28); put(x - 6, y - 1, 13); put(x - 6, y + 1, 13); put(x - 6, y, 26);
      put(x, y - 1 - (f12 & 1), EL[1]); put(x + 1, y - 2, EL[2]); put(x - 1, y - 2 + (f12 & 1), EL[2]); put(x, y, 43);
    }
    if (P.heat >= 3 && P.loaded && !P.lie) { const gx = wx(P.gx), gy = HY + P.gy, L = 2 + (f12 & 1); for (let r = 2; r <= L; r++) { put(gx + r, gy, EL[r === 2 ? 0 : 1]); put(gx, gy - r, EL[1]); put(gx, gy + r, EL[2]); } }
  }
  function drawShot(k, x, y, d, f12, R) {
    if (k === 1) {                                                                    // 燃烧弩箭：铁杆 + 紫芯 + 白热箭头，杆上火苗
      put(x - 4 * d, y, 28); put(x - 3 * d, y, 28); put(x - 2 * d, y, 28); put(x - d, y, 43); put(x, y, 47); put(x + d, y, 21);
      put(x - d, y - 1, (f12 & 1) ? 47 : 46); put(x - 2 * d, y - 1 - (f12 & 1), 45); put(x, y - 1, 46); put(x, y + 1, 46);
      return true;
    }
    if (k === 2) {                                                                    // 大火焰箭：更长的杆、紫芯、白热三格箭头、上下翻卷的火舌
      for (let i = 3; i <= 7; i++) put(x - i * d, y, 28); put(x - 2 * d, y, 43); put(x - d, y, 43); put(x, y, 21); put(x + d, y, 21); put(x + 2 * d, y, 47);
      put(x, y - 1, 47); put(x, y + 1, 47); put(x - d, y - 1, 46); put(x - d, y + 1, 46);
      const s = f12 & 1; put(x - 2 * d, y - 2 + s, 47); put(x - 3 * d, y - 1, 46); put(x - 4 * d, y - 2 - s, 45); put(x - 3 * d, y + 1, 46); put(x - 4 * d, y + 2 - s, 45); put(x - 5 * d, y - 1 + s, 44);
      return true;
    }
    return false;
  }

  return {
    name: '歼灭者', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EYE, M_HEAD, M_HEAT], HIT_POINT: [2, -17], EVENTS,
    SFX: { body: 'machine', how: 'collapse', pal: 'fire', style: 'beam', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
