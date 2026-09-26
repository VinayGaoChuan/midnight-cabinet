// 巨型歼灭者（虚空 · 射手 · 传说）：歼灭者进化成的四足连弩机甲。保留反关节鸟腿、热铜钢弓臂、红色瞄准眼和火焰箭——
// 鸟腿从两条加到四条、粗了一圈；弓臂从一副变成上下两副叠在一起；背上的箭匣换成一只插满火焰箭的旋转弹鼓；
// 单眼瞄准镜长成一根伸出弩身前 3 格的眼杆，三只红眼排成一列；机身换成暗红漆装甲 + 枪铁骨架，比歼灭者高 10 格、宽一倍。
// 攻击 = 上下两副弓臂交替齐射两支火焰箭；技能 = 特性「火焰箭」连弩齐射：弹鼓飞转、三支火焰箭推上弦点燃、三只红眼逐个亮满 →
// 三箭扇形齐射、后坐让四条腿往后滑 2 格 → 三支箭在假人前、假人身上、假人后依次爆开三团火，地面留一条燃烧的火线。
// 死亡 = 过热熔化：弹鼓烧红烧白，全身从上往下软化塌成一滩熔铁（死亡套件 melt），冒烟冷却后消散。
// 身体不用现成骨架：反关节鸟腿（加粗）、连弩机身、双层弩弓臂、旋转弹鼓、眼杆都是本模块自画的部件（候选部件见各函数前的注释）。
PCD.define('GigaAnnihilator', (E) => {
  const { defMat, Sprite, begin, part, sp, line, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const M_HULL = defMat([0, 55, 56, 57], 2);                                     // 暗红漆装甲（blood 色阶压暗一级）
  const M_FRM = defMat('iron', 1), M_FRMD = defMat('iron', 1, 0, 1);             // 枪铁骨架 / 腿（远侧暗一级）
  const M_JNT = defMat('steel', 1), M_JNTD = defMat('steel', 1, 0, 1);           // 关节、脚爪、眼杆
  const M_DRUM = defMat('steel', 1), M_DRUMH = defMat([44, 45, 46, 47], 1), M_DRUMW = defMat([45, 47, 21, 21], 1);   // 弹鼓：常温 · 烧红 · 烧白
  const M_BAND = defMat([0, 55, 56, 57], 1);
  const M_BOW = defMat('gold', 1), M_STR = defMat([8, 59, 60, 17], 1, 1);
  const M_EYE = defMat([12, 13, 26, 58], 1, 1);                                  // 三只红眼（发光体）：tone 1 熄灭 · 2 暗 · 3 常亮 · 4 亮
  const M_HEAD = defMat([45, 46, 47, 21], 1, 1);                                 // 火焰箭头（发光体）
  const M_SHAFT = defMat('wood', 1), M_INK = defMat('ink', 1, 1);
  const R_EL = FXI.fire, EL = FXR[R_EL], HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 54, 36, 49);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 16], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const m of [M_EYE, M_HEAD, M_STR, M_SHAFT, M_BOW, M_DRUMH, M_DRUMW]) RIM.skip[m] = 1;

  // ───── 姿势 ─────
  const P = { bob: 0, crouch: 0, bx: 0, pU: 1, pL: 1, flU: 0, flL: 0, ldU: 1, ldL: 1, heat: 1, e1: 1, e2: 1, e3: 1, ph: 0, hot: 0, tw: 0, sh: 0,
    fNF: 0, fFF: 0, fNR: 0, fFR: 0, uNF: 0, uFF: 0, uNR: 0, uFR: 0, step: 0, flash: 0, dq: 0, dq48: 0, rim: 1, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['bob', 0, 1], ['crouch', 0, 3], ['bx', -4, 2], ['pU', 0, 3], ['pL', 0, 3], ['flU', 0, 2], ['flL', 0, 2], ['ldU', 0, 2], ['ldL', 0, 1], ['heat', 0, 3],
    ['e1', 0, 4], ['e2', 0, 4], ['e3', 0, 4], ['ph', 0, 7], ['hot', 0, 3], ['tw', 0, 1], ['sh', -1, 1], ['fNF', -4, 4], ['fFF', -4, 4], ['fNR', -4, 4], ['fFR', -4, 4],
    ['uNF', 0, 3], ['uFF', 0, 3], ['uNR', 0, 3], ['uFR', 0, 3], ['step', -1, 1], ['flash', 0, 1], ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  const CY0 = -24;                                                                 // 机身中心行（站姿）
  // 四足重步：对角两腿一组（A = 近前 + 远后，B = 远前 + 近后）
  const G_A = [3, 0, -3, 1], G_AU = [0, 0, 0, 3], G_B = [-3, 1, 3, 0], G_BU = [0, 3, 0, 0], G_STEP = [1, 0, -1, 0];
  const T_UP = 2 / 12, T_LO = 3 / 12, T_MELT = INCOMING + 0.7;

  function reset() {
    P.bob = 0; P.crouch = 0; P.bx = 0; P.pU = 1; P.pL = 1; P.flU = 0; P.flL = 0; P.ldU = 1; P.ldL = 1; P.heat = 1; P.e1 = 1; P.e2 = 1; P.e3 = 1; P.ph = 0; P.hot = 0; P.tw = 0; P.sh = 0;
    P.fNF = 0; P.fFF = 0; P.fNR = 0; P.fFR = 0; P.uNF = 0; P.uFF = 0; P.uNR = 0; P.uFR = 0; P.step = 0; P.flash = 0; P.dq = 0; P.rim = 1; P.mx = 0; P.flip = 0;
  }
  const eyes = (a, b, c) => { P.e1 = a; P.e2 = b; P.e3 = c; };
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); reset(); P.st = st;
    const idle = () => {                                                              // 转鼓：弹鼓咔哒转一格，散热口喷一口气，三只红眼依次亮
      const TT = f12 / 12, b = Math.floor(TT * 2.5); P.bob = b & 1;
      const lp = tq % DUR[IDLE]; P.ph = lp >= 1.6 ? 1 : 0;
      if (lp >= 1.6 && lp < 1.7) P.sh = 1;                                            // 咔哒一顿
      if (lp >= 1.7 && lp < 1.8) eyes(4, 1, 1); else if (lp >= 1.8 && lp < 1.9) eyes(1, 4, 1); else if (lp >= 1.9 && lp < 2.0) eyes(1, 1, 4);
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {
      const f = gait(tq); P.fNF = P.fFR = G_A[f]; P.uNF = P.uFR = G_AU[f]; P.fFF = P.fNR = G_B[f]; P.uFF = P.uNR = G_BU[f];
      P.crouch = f & 1 ? 0 : 1; P.bob = 0; P.step = G_STEP[f]; P.ph = (f >> 1) & 1; P.tw = f & 1;
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                       // 上下两副弓臂交替齐射
      const f = f12of(tq);
      if (f === 1) { P.pU = 2; P.pL = 2; P.crouch = 1; eyes(2, 2, 2); }
      else if (f === 2) { P.pU = 0; P.flU = 2; P.ldU = 0; P.pL = 2; P.bx = -1; P.crouch = 1; eyes(3, 2, 2); P.rim = 2; }
      else if (f === 3) { P.pU = 0; P.flU = 1; P.ldU = 0; P.pL = 0; P.flL = 2; P.ldL = 0; P.bx = -2; P.crouch = 1; eyes(2, 2, 3); P.rim = 2; }
      else if (f >= 4 && f <= 6) { P.pU = 0; P.pL = 0; P.flL = f === 4 ? 1 : 0; P.ldU = 0; P.ldL = 0; P.bx = f === 6 ? 0 : -1; P.tw = f & 1; eyes(2, 2, 2); }
      else if (f === 7) { P.pU = 1; P.pL = 0; P.ldU = 1; P.ldL = 0; P.ph = 1; }
      else if (f >= 8) { P.ph = 1; }
    } else if (st === CHARGE) {                                                       // 弹鼓飞转，三支火焰箭推上弦点燃，三只红眼逐个亮满
      const q = ease.inOut(clamp01(tq / 0.7));
      P.ph = tq < 0.2 ? 0 : f12 & 7; P.pU = 1 + RD(q * 2); P.pL = P.pU; P.ldU = tq >= 0.35 ? 2 : 1; P.heat = tq < 0.45 ? 1 : tq < 0.9 ? 2 : 3;
      eyes(tq >= 0.3 ? 4 : 1, tq >= 0.6 ? 4 : 1, tq >= 0.9 ? 4 : 1); P.crouch = q > 0.3 ? 1 : 0; P.rim = 2; P.tw = tq > 1.1 ? (f12 & 1) : 0;
    } else if (st === CAST) {                                                         // 三箭扇形齐射，后坐四腿后滑 2 格
      P.pU = 0; P.pL = 0; P.flU = 2; P.flL = 2; P.ldU = 0; P.ldL = 0; eyes(4, 4, 4); P.rim = 3; P.crouch = 1; P.ph = f12 & 7;
      P.bx = tq < 1 / 12 ? -1 : -2; P.fNF = P.fFF = P.fNR = P.fFR = tq < 1 / 12 ? 1 : 2;   // 脚还踩在原地，身体被推后
    } else if (st === RECOVER) {                                                      // 弹鼓减速停下，热气散去
      const q = ease.inOut(clamp01(tq / 0.6));
      P.bx = tq < 0.3 ? -2 : tq < 0.45 ? -1 : 0; if (tq < 0.3) { P.fNF = P.fFF = P.fNR = P.fFR = 2; } else if (tq < 0.45) { P.fNF = P.fFF = P.fNR = P.fFR = 1; P.uNF = P.uFR = 1; }
      P.ph = tq < 0.2 ? f12 & 7 : tq < 0.4 ? (f12 >> 1) & 7 : 3; P.pU = tq < 0.3 ? 0 : 1; P.pL = tq < 0.4 ? 0 : 1; P.ldU = tq >= 0.4 ? 1 : 0; P.ldL = tq >= 0.5 ? 1 : 0;
      eyes(q < 0.35 ? 4 : 1, q < 0.55 ? 4 : 1, q < 0.75 ? 4 : 1); P.rim = q < 0.5 ? 2 : 1; P.crouch = tq < 0.3 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.bx = -2; eyes(0, 0, 0); P.flash = h < 1 / 12 ? 1 : 0; P.crouch = 1; P.tw = 1; P.flU = 1; P.flL = 1; P.ph = 7; P.sh = -1; P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; eyes(0, 1, 0); P.tw = f12 & 1; P.ph = 7; P.rim = 0; }
      else idle();
    } else if (st === DEATH) {                                                        // 过热熔化
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; eyes((f12 & 1) ? 2 : 0, 0, (f12 & 1) ? 0 : 2); P.tw = 1; P.hot = 1; P.ph = f12 & 7; }
      else { P.bx = -2 + ((f12 & 1) ? 1 : 0); P.crouch = 3; P.hot = d < 0.5 ? 2 : 3; eyes((f12 % 3) === 0 ? 2 : 0, 0, 0); P.ph = f12 & 7; P.ldU = 0; P.ldL = 0; P.pU = 0; P.pL = 0; P.flU = 1; P.flL = 2;
        P.sh = (f12 & 1) ? 1 : -1; if (d >= T_MELT - INCOMING) P.dq = 1; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    P.dq48 = RD(P.dq * 48);
    const yo = P.bob + P.crouch; P.gx = 14 + P.bx + P.sh; P.gy = CY0 - 1 + yo;       // 发光体 = 中间那只红眼
    KEY(P);
  }

  // ───── 画 ─────
  let PX = 0, PY = 0;
  const spT = (x, y, m, t) => sp(x + PX, y + PY, m, t);
  const lineT = (x0, y0, x1, y1, m, t) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) spT(RD(x0 + (x1 - x0) * k / n), RD(y0 + (y1 - y0) * k / n), m, t); };
  // 候选部件：粗反关节鸟腿（同歼灭者的鸟腿，大腿 3 格、胫 2 格、膝后折；四足时远侧两条暗一级）
  function bigLeg(hx, hy, fx, up, far) {
    part(); const m = far ? M_FRMD : M_FRM, j = far ? M_JNTD : M_JNT, fy = -up, ax = fx - 1, ay = fy - 3;
    const kx = RD((hx + ax) / 2 - 4 + (up ? 1 : 0)), ky = RD(hy + (ay - hy) * 0.42 - (up ? 1 : 0));
    for (let o = 0; o < 3; o++) line(hx - 1 + o, hy, kx + o, ky, m, 0);          // 大腿 3 格
    line(kx, ky, ax, ay, m, 0); line(kx + 1, ky, ax + 1, ay, m, 0); line(kx, ky + 1, ax, ay + 1, m, 0);   // 胫
    for (let y = ay + 1; y < fy; y++) { sp(ax, y, m, 0); sp(ax + 1, y, m, 0); }
    for (let x = fx - 2; x <= fx + 2; x++) { sp(x, fy, m, 0); } sp(fx, fy - 1, m, 0);   // 脚掌
    sp(fx + 3, fy, j, 4); sp(fx + 3, fy - 1, j, 3); sp(fx + 4, fy, j, 3); sp(fx - 3, fy, j, 2); sp(fx - 3, fy - 1, j, 2);   // 前爪 / 后距
    sp(kx, ky, j, 4); sp(kx + 1, ky, j, 3); sp(kx, ky + 1, j, 3); sp(kx + 1, ky + 1, j, 2); sp(kx - 1, ky, j, 2);   // 膝关节
    sp(hx, hy, j, 4); sp(hx + 1, hy, j, 3); sp(hx - 1, hy, j, 3); sp(hx, hy + 1, j, 2);   // 胯
    sp(RD((hx + kx) / 2) + 2, RD((hy + ky) / 2), j, 3);                           // 液压杆
  }
  // 候选部件：连弩机身（前尖后方的大舱 + 托尾；暗红漆装甲 + 枪铁骨架带、肋条、铆钉、散热口）+ 同一部件里的两根弓弦
  const HULL = [[-6, -9, 4], [-5, -11, 7], [-4, -12, 9], [-3, -13, 10], [-2, -13, 11], [-1, -13, 11], [0, -13, 11], [1, -13, 11], [2, -13, 10], [3, -12, 9], [4, -10, 7], [5, -7, 3]];
  const BOW_X = 18, BOW_L = 5, YU = CY0 - 7, YL = CY0 + 6;
  function bend(p, fl) { return [1.0, 1.7, 2.4, 3.1][p] - fl * 0.6; }
  function hull(cy) {
    part();
    for (const [dy, x0, x1] of HULL) for (let x = x0; x <= x1; x++) spT(x, cy + dy, M_HULL, 0);
    for (let dy = -1; dy <= 1; dy++) for (let x = -16; x <= -14; x++) spT(x, cy + dy, M_FRM, 0);   // 托尾
    for (let dy = -3; dy <= 3; dy++) spT(-17, cy + dy, M_FRM, dy === -3 ? 4 : 0);
    for (let x = -13; x <= 10; x++) spT(x, cy + 2, M_FRM, (x & 3) === 0 ? 4 : 0);  // 枪铁骨架带
    for (let dy = -5; dy <= 4; dy++) spT(-3, cy + dy, M_FRM, dy === -5 ? 4 : 0);   // 肋条
    for (let dy = -4; dy <= 3; dy++) spT(5, cy + dy, M_HULL, 1);                  // 装甲缝
    for (const [x, y] of [[-8, -3], [0, -3], [8, -1], [-8, 4], [2, 4]]) spT(x, cy + y, M_HULL, 4);   // 铆钉
    for (let x = -1; x <= 3; x += 2) spT(x, cy - 5, M_INK, 0);                     // 散热口
    spT(-11, cy, M_HULL, 4); spT(-10, cy - 1, M_HULL, 4);
    for (const [yb, p, fl] of [[YU, P.pU, P.flU], [YL, P.pL, P.flL]]) {           // 弓弦
      const tx = BOW_X + RD(-bend(p, fl)), L = BOW_L, nx = [tx, 12, 9, 6][p];
      if (p === 0) { const bu = P.tw ? 1 : 0; for (let r = -L; r <= L; r++) spT(tx + (Math.abs(r) < 3 ? bu : 0), yb + r, M_STR, 0); }
      else { lineT(tx, yb - L, nx, yb, M_STR, 0); lineT(nx, yb, tx, yb + L, M_STR, 0); }
    }
  }
  // 候选部件：旋转弹鼓（背上的圆鼓，ph 0–7 每档转 45°：四支火焰箭从鼓沿伸出、鼓面铆钉跟着转；hot 1 烧红 · 2–3 烧白）
  function drum(cx, cy) {
    part(); const m = P.hot >= 2 ? M_DRUMW : P.hot ? M_DRUMH : M_DRUM, R = 4;
    for (let j = -R; j <= R; j++) for (let i = -R; i <= R; i++) if (i * i + j * j <= R * R + 0.6) spT(cx + i, cy + j, m, 0);
    for (let j = -R + 1; j <= R - 1; j++) spT(cx - R, cy + j, M_BAND, 0);       // 鼓边暗红箍
    spT(cx, cy, M_JNT, 4); spT(cx + 1, cy, M_JNT, 3); spT(cx, cy + 1, M_JNT, 2);
    for (let k = 0; k < 4; k++) {
      const a = (P.ph + 2 * k) * Math.PI / 4, c = Math.cos(a), s = Math.sin(a);
      spT(RD(cx + c * 2.6), RD(cy + s * 2.6), m, 1);                               // 鼓面铆钉（随转动）
      if (s > 0.3 || P.hot >= 3) continue;
      spT(RD(cx + c * 4.8), RD(cy + s * 4.8), M_SHAFT, 4); spT(RD(cx + c * 5.7), RD(cy + s * 5.7), M_SHAFT, 4); spT(RD(cx + c * 6.6), RD(cy + s * 6.6), M_HEAD, P.hot ? 4 : 3);   // 伸出鼓沿的火焰箭
    }
  }
  // 候选部件：眼杆（伸出机身前 3 格的钢杆，三只红眼竖排一列，每只 5 档：0 暗 · 1 常亮 · 2 亮 · 3 爆闪 · 4 亮满）
  function eyeMast(cy) {
    part();
    for (let y = cy - 4; y <= cy + 2; y++) for (let x = 12; x <= 14; x++) spT(x, y, M_FRM, 0);
    spT(15, cy - 4, M_FRM, 4); spT(15, cy + 2, M_FRM, 2); spT(12, cy - 4, M_JNT, 4);
    const tone = (e) => (e === 0 ? 1 : e === 1 ? 3 : 4);
    [[P.e1, cy - 3], [P.e2, cy - 1], [P.e3, cy + 1]].forEach(([e, y]) => { spT(14, y, M_EYE, tone(e)); spT(13, y, M_EYE, e >= 2 ? 4 : e ? 3 : 1); spT(15, y, M_EYE, e >= 3 ? 4 : e ? 3 : 1); });
  }
  function bolts() {
    part();
    const one = (y, x0) => { for (let x = x0; x <= 18; x++) spT(x, y, M_SHAFT, (x & 1) ? 3 : 4); const h = P.heat + 1; spT(19, y, M_HEAD, h); spT(20, y, M_HEAD, Math.min(4, h + 1)); spT(21, y, M_HEAD, h); spT(19, y - 1, M_HEAD, h - 1 || 1); spT(19, y + 1, M_HEAD, h - 1 || 1); };
    if (P.ldU) one(YU, 7); if (P.ldU >= 2) one(YU - 3, 11); if (P.ldL) one(YL, 6);
  }
  function rails() {
    part();
    for (let x = -2; x <= 16; x++) spT(x, YU + 1, M_FRM, x === 16 ? 4 : 0);
    for (let x = -4; x <= 16; x++) spT(x, YL - 1, M_FRM, x === 16 ? 4 : 0);
  }
  // 候选部件：弩弓臂（同歼灭者：竖直热铜反曲弓臂，中段 2 格厚、弓梢回勾；这里上下两副，每副半长 5）
  function prod(cy, p, fl) {
    part(); const b = bend(p, fl), L = BOW_L;
    for (let r = -L; r <= L; r++) { const q = r / L, x = RD(-b * q * q) + (Math.abs(r) === L ? 1 : 0), a = Math.abs(r); spT(BOW_X + x, cy + r, M_BOW, a <= 1 ? 3 : a === L ? 4 : 0); if (a <= 3) spT(BOW_X + x + 1, cy + r, M_BOW, a <= 1 ? 3 : 2); }
    for (let r = -1; r <= 1; r++) spT(BOW_X - 1, cy + r, M_JNT, r === -1 ? 4 : 0);
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0);
    const yo = P.bob + P.crouch, hy = CY0 + 5 + yo;
    PX = P.sh; PY = yo;
    PX = 0; PY = 0;                                                                  // 腿按世界坐标画（脚踩地，不跟机身晃）
    bigLeg(-10, hy, -10 + P.fFR, P.uFR, 1);
    bigLeg(4, hy, 4 + P.fFF, P.uFF, 1);
    PX = P.sh; PY = yo;
    drum(-8, CY0 - 8);
    hull(CY0);
    PX = 0; PY = 0;
    bigLeg(-8, hy, -8 + P.fNR, P.uNR, 0);
    bigLeg(6, hy, 6 + P.fNF, P.uNF, 0);
    PX = P.sh; PY = yo;
    rails(); eyeMast(CY0); bolts(); prod(YU, P.pU, P.flU); prod(YL, P.pL, P.flL);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const MZ = 3, mzT = new Float32Array(MZ).fill(9), mzX = new Float32Array(MZ), mzY = new Float32Array(MZ);
  let chargeAcc = 0, steamAcc = 0, smokeAcc = 0, soulAcc = 0, dripAcc = 0, lastStep = 0, hitN = 0;
  const wx = (x) => scrX(x), headAt = (y) => [wx(21 + P.bx + P.sh), HY + y + P.bob + P.crouch];
  function muzzle(i, x, y) { mzT[i] = 0; mzX[i] = x; mzY[i] = y; }
  function onEnter(s) {
    if (s !== CAST) return;
    const [ux, uy] = headAt(YU), [, uy2] = headAt(YU - 3), [, ly] = headAt(YL);
    releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 });
    const fan = (x, y, tx, ty) => { const T = (tx - x) / 260; shoot(2, x, y, 260, tx, R_EL, (ty - y) / T, { trail: { every: 1, life: [0.15, 0.35], back: [6, 20], off: 3 } }); };
    fan(ux + 1, ly, DUMMY_X - 13, HY - 1);                                           // 下弓：假人前的地面
    fan(ux + 1, uy, DUMMY_X - 3, HY - 17);                                           // 上弓：假人身上
    fan(ux + 1, uy2, DUMMY_X + 12, HY - 1);                                          // 上弓第二支：假人后的地面
    muzzle(0, ux, uy); muzzle(1, ux, uy2); muzzle(2, ux, ly); hitN = 0;
    burst(ux, (uy + ly) / 2, 20, 40, 110, 0.2, 0.5, R_EL, 8); ring(ux, (uy + ly) / 2, 1, R_EL);
    for (let i = 0; i < 10; i++) spawn(K_DUST, wx(-12 + Math.random() * 22), HY, -20 - Math.random() * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.3, FXI.dust);   // 四腿后滑扬尘
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'arrow' });
  }
  function onTime(s, t) {
    if (s === ATTACK && (t === T_UP || t === T_LO)) {
      const [x, y] = headAt(t === T_UP ? YU : YL);
      shoot(1, x + 1, y, 250, DUMMY_X - 3, R_EL, (HY - 16 - y) / ((DUMMY_X - 3 - x) / 250), { trail: { every: 2, life: [0.12, 0.25], back: [10, 24], off: 3 } });
      muzzle(t === T_UP ? 0 : 2, x, y); burst(x, y, 5, 30, 60, 0.12, 0.28, R_EL, 0);
      sfx('swing', { kind: 'bow', w: 0.6 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && t === T_MELT) {                                                // 熔化：交给死亡套件 melt
      poseAt(DEATH, T_MELT - 1 / 12, T_MELT - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('melt', { fadeAt: 1.2, fadeDur: 0.6 });
      burst(wx(-2), HY - 20, 18, 30, 80, 0.3, 0.6, R_EL, 10); shake(0.14, 1);
    }
  }
  const EVENTS = [[], [], [T_UP, T_LO], [], [], [], [], [T_MELT], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 80, 0.15, 0.35, R_EL, 8); burst(x, y, 5, 30, 70, 0.12, 0.3, FXI.impact, 6); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.5 }); return; }
    hitN++;
    const onDummy = Math.abs(x - (DUMMY_X - 3)) < 3 && y < HY - 6;
    burst(x, y, 20, 40, 120, 0.25, 0.6, R_EL, 14); fx.cross(x, y, 5, R_EL, 0.25);
    if (onDummy) { ring(x, y, 1, R_EL); hitDummy(1); dummyFx({ dur: 0.9, tint: 'fire' }); shake(0.12, 1); }
    else { for (let i = 0; i < 6; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 50, -40 - Math.random() * 30, 0.5, FXI.earth, { g: 200, floor: HY }); ring(x, y - 2, 0, R_EL); }
    if (hitN === 1) fx.wave(x - 2, HY, 1, 30, 3, R_EL, 1.0, 1);                         // 地面留一条燃烧的火线
    sfx('impact', { pal: 'fire', w: onDummy ? 0.9 : 0.6 });
  }
  function hurtFx(s) {
    const hx = HX + 2, hy = HY + CY0; burst(hx, hy, s === DEATH ? 26 : 22, 60, 150, 0.2, 0.5, FXI.impact, 20); burst(hx, hy, 5, 80, 160, 0.5, 0.8, FXI.steel, 30);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, t) {
    const yo = P.bob + P.crouch;
    if (state === CHARGE) {                                                           // 火焰汇聚到三只箭头
      chargeAcc += dt * (24 + 30 * clamp01(t / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const pick = Math.floor(Math.random() * 3), yy = pick === 0 ? YU : pick === 1 ? YU - 3 : YL, [x, y] = headAt(yy), r = 9 + Math.random() * 7, a = Math.random() * 6.2832;
        spawn(K_SPIRAL_PT, x, y, r / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 6 + Math.random() * 3); }
    }
    const vent = (n) => { for (let i = 0; i < n; i++) spawn(K_RISE, wx(1 + (i % 3) * 2 + P.bx), HY + CY0 - 6 + yo, (Math.random() - 0.5) * 6, -12 - Math.random() * 10, 0.5 + Math.random() * 0.4, FXI.dust); };
    if (state === CHARGE || (state === RECOVER && t < 0.5) || (state === DEATH && t > INCOMING)) { steamAcc += dt * (state === DEATH ? 16 : 10); while (steamAcc >= 1) { steamAcc -= 1; vent(1); } }
    if (state === IDLE) { const lp = (t % DUR[IDLE]); if (lp >= 1.65 && lp - dt < 1.65) vent(5); }
    if (state === MOVE && P.step !== lastStep) {                                      // 四足重步：每步 3–4 颗尘 + 顿挫
      if (P.step !== 0) { sfx('step', { w: 0.85 }); const xs = P.step > 0 ? [6 + G_A[0], -10 + G_A[0]] : [4 + G_B[2], -8 + G_B[2]]; for (const fx0 of xs) for (let i = 0; i < 2; i++) spawn(K_DUST, wx(fx0) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 26, -5 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust); shake(0.06, 1); }
      lastStep = P.step;
    }
    if (state === DEATH && t > T_MELT && t < T_MELT + 1.4) {                          // 熔铁冒烟、滴火星，慢慢冷却
      smokeAcc += dt * 14; while (smokeAcc >= 1) { smokeAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 34, HY - 2 - Math.random() * 10, (Math.random() - 0.5) * 6, -10 - Math.random() * 10, 0.8 + Math.random() * 0.6, FXI.dust); }
      if (t < T_MELT + 0.8) { dripAcc += dt * 16; while (dripAcc >= 1) { dripAcc -= 1; spawnX(K_PHYS, HX - 12 + Math.random() * 26, HY - 6 - Math.random() * 12, (Math.random() - 0.5) * 20, 0, 0.6, R_EL, { g: 160, floor: HY }); } }
    }
    if (state === DEATH && t > INCOMING + 1.7 && t < INCOMING + 2.5) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 36, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < MZ; i++) mzT[i] += dt;
  }
  function fxReset() { mzT.fill(9); chargeAcc = 0; steamAcc = 0; smokeAcc = 0; soulAcc = 0; dripAcc = 0; lastStep = 0; hitN = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    for (let i = 0; i < MZ; i++) if (mzT[i] < 2 / 12) { const c = mzT[i] < 1 / 12 ? EL[0] : EL[1], x = RD(mzX[i]), y = RD(mzY[i]); for (let r = 1; r <= 3; r++) { put(x + r, y, r < 3 ? c : EL[2]); put(x, y - r, r < 2 ? c : EL[2]); put(x, y + r, r < 2 ? c : EL[2]); } put(x, y, EL[0]); }
    if (P.heat >= 3 && P.ldU && P.dq < 1) for (const yy of [YU, YU - 3, YL]) { const [x, y] = headAt(yy), L = 1 + (f12 & 1); for (let r = 1; r <= L; r++) { put(x + 1 + r, y, EL[r === 1 ? 0 : 1]); put(x, y - r - 1, EL[2]); } }
  }
  function drawShot(k, x, y, d, f12, R) {
    if (k !== 1 && k !== 2) return false;
    const n = k === 2 ? 6 : 4;
    for (let i = 2; i <= n; i++) put(x - i * d, y, 28); put(x - d, y, 43); put(x, y, k === 2 ? 21 : 47); put(x + d, y, 21);
    put(x, y - 1, 46); put(x, y + 1, 46); const s = f12 & 1; put(x - d, y - 1 - s, 47); put(x - 2 * d, y - 2 + s, 46); put(x - 3 * d, y - 1 - s, 45);
    if (k === 2) { put(x - 2 * d, y + 1 + s, 46); put(x - 4 * d, y + 2 - s, 44); }
    return true;
  }

  return {
    name: '巨型歼灭者', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EYE, M_HEAD, M_DRUMH, M_DRUMW], HIT_POINT: [2, -24], EVENTS,
    deathKit: { mode: 'melt', at: T_MELT },
    SFX: { body: 'machine', how: 'dissolve', pal: 'fire', style: 'fire', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
