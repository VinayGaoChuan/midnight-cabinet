// 虚空魔鬼鱼 VoidManta（虚空 · 祭司 · 传说 · 远程 880）：曲速之翼进化后的巨型虚空魔鬼鱼。体型是曲速之翼的一倍半、身体更厚；
// 头鳍更长更弯、向前抱拢成一对角；背上大半是一片流动的星图（夜空底 + 闪烁星点）；长尾末端的等离子球变成三颗串珠；翼缘等离子线加成两道。
// 攻击：从腹下吐出一枚会弹射的等离子盘；技能「等离子衰减（弹射版）」：等离子盘在假人和地面之间来回弹 3 次，每弹一下给假人压上一圈衰减紫环。
// 死亡：内爆——身体从翼缘开始碎成星尘，被吸进腹下越缩越小的虚空点，最后一闪消失。设定卡见 pcd/batch-12/VoidManta/design.md。
PCD.define('VoidManta', (E) => {
  const { defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, bayer, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, groundShadow, sfx } = E;
  const U = E.parts.beast.util, R = Math.round, PI = Math.PI;

  // ───── 材质 ─────
  // 主材质：gem 色阶的深紫 25 作勾线，暗 42，基 / 亮换成两级品红紫（gem 的基 / 亮是蓝 / 青，会和翼缘等离子青混成一片）
  const VM = E.color('#9a3aa0'), VL = E.color('#d06fcf');
  const M = {
    back: defMat([25, 42, VM, VL], 2), fin: defMat([25, VM, VL, 43], 1), finF: defMat([25, 42, VM, VL], 1), tail: defMat([25, 42, VM, VL], 1),
    belly: defMat([25, 18, 17, 21], 1), horn: defMat('purple', 1), hornF: defMat('purple', 1, 0, 1),
    sky: defMat([0, 1, 2, 3], 1),               // 背上星图的夜空底（ink + 夜空色）
    star: defMat([0, 23, 22, 21], 1, 1),        // 星点（平涂：2 暗 · 3 青 · 4 白）
    pl: defMat([25, 24, 22, 21], 1, 1), orb: defMat([25, 23, 22, 21], 1, 1), eye: defMat([0, 24, 22, 21], 1, 1), ink: defMat([0, 0, 0, 0], 1, 1),
  };
  const R_EL = FXI.magic, EL = FXR[R_EL], HX = 34, DUR = DEFAULT_DUR.slice();
  const R_DIM = E.fxRamp('plasmaDecay', [22, 23, 24, 25, 1]), VOID = FXR[FXI.shadow];
  const hero = new Sprite(100, 50, 50, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 9, 16, 24], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['pl', 'orb', 'eye', 'ink', 'star', 'sky']) RIM.skip[M[k]] = 1;

  // ───── 形体与姿势 ─────
  const ALT = 12, BW = 11, BH = 4, S = 15, TL = 14, BEADS = [TL - 6, TL - 3, TL];
  const FINS = [60, 32, 2, -20, -40, 22, 0, -6].map((d) => d * PI / 180), SWEEP = [0.1, 0.12, 0.15, 0.15, 0.12, 0.08, 0.2, 0.3];
  const P = { fin: 2, bob: 0, tm: 0, tph: 0, tamp: 1, beads: 0, vent: 0, spin: 0, tw: 0, lit: 0, eyes: 0, hornc: 0, flash: 0, dq: 0, dq48: 0, imp48: 0, bx: 0, rim: 1, tilt: 0, lag: 0,
    gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  // tm 尾型 0 拖尾 S 摆 · 4 受击下甩；beads 尾珠：前 k 颗亮（4 = 全部爆闪）；vent 腹下等离子口 0 合 · 1 开 · 2 吐；spin 星图旋转相位；tw 星点闪烁相位（3 = 全亮）
  // lit 翼缘：+k 前 k 段白热 · 0 常亮 · -k 末 k 段熄灭；imp48 内爆进度（外沿先碎）
  const KEY = keyer([['fin', 0, 7], ['bob', -2, 2], ['tm', 0, 4], ['tph', 0, 7], ['tamp', 0, 3], ['beads', 0, 4], ['vent', 0, 2], ['spin', 0, 7], ['tw', 0, 3], ['lit', -5, 5],
    ['eyes', 0, 1], ['hornc', 0, 2], ['flash', 0, 1], ['dq48', 0, 48], ['imp48', 0, 48], ['bx', -8, 8], ['rim', 0, 3], ['tilt', -2, 2], ['lag', 0, 1]]);
  function reset() { P.fin = 2; P.bob = 0; P.tm = 0; P.tph = 0; P.tamp = 1; P.beads = 0; P.vent = 0; P.spin = 0; P.tw = 0; P.lit = 0; P.eyes = 0; P.hornc = 0; P.flash = 0; P.dq = 0; P.imp = 0; P.bx = 0; P.rim = 1; P.tilt = 0; P.lag = 0; P.mx = 0; P.flip = 0; }
  const bodyY = () => -(ALT + BH + 1) + P.bob;

  let cy = -17, TI = 0;
  const ty = (x, y) => y + TI * x / 9;
  const D = (x, y, m, t) => U.dot(E, x, ty(x, y), m, t);
  const PG = (p, m, t) => { const q = p.slice(); for (let i = 0; i < q.length; i += 2) q[i + 1] = ty(q[i], q[i + 1]); U.poly(E, q, m, t); };
  const botOf = (x) => { const t = x / BW, s = t >= 0 ? Math.sqrt(Math.max(0, 1 - t ** 4)) : Math.sqrt(Math.max(0, 1 - (-t) ** 1.6)); return R(cy + BH * 0.8 * s); };
  const ventPt = () => [0, ty(0, botOf(0))];

  const TP = new Float32Array(2 * (TL + 1));
  function tailPts() {
    let x = -BW + 0.5, y = cy + 0.5; TP[0] = x; TP[1] = y;
    for (let k = 1; k <= TL; k++) {
      const q = k / TL, h = P.tm === 0 ? PI + Math.sin(k * 0.45 + P.tph * PI / 4) * P.tamp * 0.36 * Math.min(1, k / 4) : PI + 0.8 * Math.pow(q, 1.2);
      x += Math.cos(h); y -= Math.sin(h); TP[2 * k] = x; TP[2 * k + 1] = y;
    }
  }

  // ───── 画 ─────
  // 候选部件：finWing 鳍翼（和 WarpWing.js 同一套几何；这里 lines 2 = 翼缘两道等离子线）
  function finWing(far, span, xf, xb, yr, lines) {
    part();
    const idx = P.fin, e = FINS[idx], sw = SWEEP[idx], sp = span * (idx === 5 ? 1.12 : 1), z = far ? -0.75 : 0.75;
    const F = [xf, yr], B = [xb, yr], T = [(xf + xb) / 2 - sw * sp - (far ? 1 : 0), yr + z * sp * Math.cos(e) - sp * Math.sin(e)];
    const mx = (F[0] + T[0]) / 2, my = (F[1] + T[1]) / 2, dx = T[0] - F[0], dy = T[1] - F[1], L = Math.hypot(dx, dy) || 1;
    let nx = -dy / L, ny = dx / L; if (nx * (mx - (B[0] + F[0]) / 2) + ny * (my - yr) < 0) { nx = -nx; ny = -ny; }
    const Lc = [mx + nx * L * 0.16, my + ny * L * 0.16], tmx = (T[0] + B[0]) / 2, tmy = (T[1] + B[1]) / 2;
    const Tc = [tmx + (F[0] - tmx) * 0.3, tmy + (F[1] - tmy) * 0.3 + (P.lag ? (T[1] < yr ? 2 : -2) : 0)];
    const bz = (A, C, Bq, q) => [(1 - q) * (1 - q) * A[0] + 2 * (1 - q) * q * C[0] + q * q * Bq[0], (1 - q) * (1 - q) * A[1] + 2 * (1 - q) * q * C[1] + q * q * Bq[1]];
    const pts = [F[0], F[1]];
    for (let i = 1; i <= 7; i++) { const p = bz(F, Lc, T, i / 7); pts.push(p[0], p[1]); }
    for (let i = 1; i <= 6; i++) { const p = bz(T, Tc, B, i / 6); pts.push(p[0], p[1]); }
    const m = far ? M.finF : M.fin; PG(pts, m, 0);
    for (const [f0, f1] of [[0.3, 0.6], [0.65, 0.85]]) {                                                       // 两道鳍骨（暗）
      const rib = bz(F, Lc, T, f1), r0 = [F[0] + (B[0] - F[0]) * f0, yr];
      for (let i = 2; i <= 7; i++) { const q = i / 9; D(r0[0] + (rib[0] - r0[0]) * q, r0[1] + (rib[1] - r0[1]) * q, m, 2); }
    }
    const n = Math.ceil(L * 1.7);
    for (let ln = 0; ln < lines; ln++) {
      for (let i = R(n * 0.25) + (ln ? 3 : 0); i <= n - (ln ? 2 : 0); i++) {
        const q = i / n, seg = Math.min(4, Math.floor((q - 0.25) / 0.75 * 5)), p = bz(F, Lc, T, q);
        let tn = 3; if (P.lit > 0 && seg < P.lit) tn = 4; if (P.lit < 0 && seg >= 5 + P.lit) tn = far ? 1 : 2; if (ln && tn > 2) tn--;
        D(p[0] - nx * 2 * ln, p[1] - ny * 2 * ln, M.pl, tn);
      }
    }
  }
  function lobe(far) {                       // 头鳍：变长变弯，向前抱拢成一对角（hornc 1 抱紧 · 2 张开下垂）
    part(); const m = far ? M.hornF : M.horn, c = P.hornc, x0 = BW - 1 - (far ? 1 : 0), y0 = cy + (far ? -3 : 1);
    const pts = c === 1 ? [[0, 0], [1, -1], [2, -1], [3, -2], [4, -2], [5, -1], [6, 0], [5, 1], [4, 1]]
      : c === 2 ? [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1], [5, 2], [6, 2], [7, 3]]
        : [[0, 0], [1, 0], [2, -1], [3, -1], [4, -2], [5, -2], [6, -1], [7, 0], [7, 1], [6, 2]];
    for (const q of pts) D(x0 + q[0], y0 + q[1], m, 0);
    for (let i = -1; i <= 3; i++) D(x0 + i, y0 + 1, m, 0);
  }
  const STARS = [[0.2, 0.3], [1.3, 0.8], [2.2, 0.55], [3.1, 0.9], [4.0, 0.35], [4.9, 0.75], [5.7, 0.95], [0.9, 0.95]];
  function body() {
    part();
    for (let x = -BW; x <= BW; x++) {
      const t = x / BW, s = t >= 0 ? Math.sqrt(Math.max(0, 1 - t ** 4)) : Math.sqrt(Math.max(0, 1 - (-t) ** 1.6));
      const top = R(cy - BH * s - (t > -0.4 && t < 0.5 ? 0.5 : 0)), bot = R(cy + BH * 0.8 * s);
      for (let y = top; y <= bot; y++) {
        let m = y >= bot - (t > -0.4 && t < 0.85 ? 1 : 0) ? M.belly : M.back, tn = y === top && t > -0.5 && t < 0.6 ? 4 : 0;
        const u = (x + 1.5) / 8, v = (y - (cy - 1.6)) / 2.4; if (u * u + v * v <= 1 && y > top) { m = M.sky; tn = 0; }   // 背上星图
        D(x, y, m, tn);
      }
    }
    for (let i = 0; i < STARS.length; i++) {                                                                  // 星点：绕星图中心转（spin），轮流闪（tw）
      const a = STARS[i][0] + P.spin * PI / 4, f = STARS[i][1], x = R(-1.5 + Math.cos(a) * 6.5 * f), y = R(cy - 1.6 + Math.sin(a) * 1.9 * f);
      const ph = (i + P.tw) % 3; D(x, y, M.star, P.tw === 3 ? 4 : ph === 0 ? 4 : ph === 1 ? 3 : 2);
    }
    D(BW - 3, cy - 1, M.eye, P.eyes ? 2 : 3); D(BW - 2, cy - 1, M.back, 4); D(BW, cy + 2, M.ink, 0); D(BW - 1, cy + 2, M.ink, 0); D(BW - 2, cy + 2, M.ink, 0);   // 眼、眉骨高光、嘴缝
    const vb = botOf(0);                                                                                      // 腹下等离子口
    if (P.vent === 0) { D(-1, vb, M.pl, 2); D(0, vb, M.pl, 2); D(1, vb, M.pl, 2); }
    else { for (let x = -2; x <= 2; x++) D(x, vb, M.pl, P.vent === 2 && Math.abs(x) < 2 ? 4 : 3); if (P.vent === 2) { D(-1, vb - 1, M.pl, 3); D(0, vb - 1, M.pl, 4); D(1, vb - 1, M.pl, 3); } }
  }
  function tail() {
    part();
    for (let k = 0; k < TL; k++) { const x0 = TP[2 * k], y0 = TP[2 * k + 1], x1 = TP[2 * k + 2], y1 = TP[2 * k + 3]; U.seg(E, x0, ty(x0, y0), x1, ty(x1, y1), k < 4 ? 2 : 1, M.tail, 0); }
  }
  function beads() {                         // 三颗尾珠：前 k 颗亮，4 = 全部爆闪
    part();
    for (let i = 0; i < 3; i++) {
      const k = BEADS[i], x = R(TP[2 * k]), y = R(ty(TP[2 * k], TP[2 * k + 1])), lit = P.beads === 4 || i < P.beads, d = (a, b, t) => U.dot(E, x + a, y + b, M.orb, t);
      if (P.beads === 4) { d(0, 0, 4); d(1, 0, 3); d(-1, 0, 3); d(0, -1, 4); d(0, 1, 3); d(0, -2, 3); }
      else { d(0, 0, lit ? 4 : 2); d(1, 0, lit ? 3 : 2); d(-1, 0, lit ? 3 : 1); d(0, -1, lit ? 3 : 2); d(0, 1, lit ? 3 : 1); }
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0); cy = bodyY(); TI = P.tilt; tailPts();
    finWing(1, S, 5, -9, cy - 3, 2);
    lobe(1);
    tail(); beads();
    body();
    finWing(0, S, 6, -9, cy + 3, 2);
    lobe(0);
  }
  const VX = [0, 0];
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.imp48 > 0) {                        // 内爆：离腹下虚空点越远的像素越先碎掉（按抖动阈值删像素）
      const q = P.imp48 / 48, o = hero.out, w = hero.w, vx = VX[0] + hero.ox, vy = VX[1] + hero.oy;
      for (let y = 0; y < hero.h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (o[i] === 255) continue; const d = Math.min(1, Math.hypot(x - vx, (y - vy) * 1.4) / 26); if ((1 - d) * 0.75 + bayer(x, y) * 0.25 < q) o[i] = 255; }
    }
  }

  // ───── 姿势 ─────
  const IDLE_FIN = [2, 7, 3, 7], IDLE_BOB = [0, 1, 0, -1], IDLE_TILT = [0, 1, 1, 0, -1, -1], WALK_FIN = [0, 2, 4, 7], WALK_BOB = [2, 0, -2, 0];
  const T_HIT = 2 / 12, T_BOUNCE = [0.14, 0.21, 0.28, 0.35, 0.42];
  function idle(tq, TT) {
    const s = Math.floor(TT * 2.5 + 1e-6), c = s & 3; P.fin = IDLE_FIN[c]; P.bob = IDLE_BOB[c]; P.tilt = IDLE_TILT[s % 6]; P.tph = Math.floor(TT * 4 + 1e-6) & 7; P.tamp = 1;
    P.tw = s % 3; P.beads = [1, 2, 3, 2][c];
    const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { P.tilt = -2; P.fin = 1; P.hornc = 1; P.tw = 3; P.beads = lp >= 1.75 ? 4 : 3; }   // 待机个性：抬头翻身环游，星图一齐亮
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12; reset(); let focusVent = false;
    if (st === IDLE) idle(tq, TT);
    else if (st === MOVE) {
      const f = gait(tq); P.fin = WALK_FIN[f]; P.bob = WALK_BOB[f]; P.tph = f * 2; P.tamp = 2; P.lag = f & 1; P.beads = 3; P.tw = f % 3; P.tilt = f === 0 ? -1 : f === 2 ? 1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      focusVent = true;
      if (tq < 0.12) { P.tilt = -2; P.vent = 1; P.fin = 1; P.bx = -1; P.hornc = 1; P.rim = 2; P.beads = 2; }
      else if (tq < 0.2) { P.tilt = -1; P.vent = 2; P.fin = 3; P.bx = -2; P.rim = 2; P.beads = 3; P.tamp = 2; }
      else if (tq < 0.45) { P.vent = 1; P.fin = tq < 0.3 ? 4 : 2; P.bx = -1; P.beads = 1; }
      else idle(tq, TT);
    } else if (st === CHARGE) {
      focusVent = true;
      P.fin = tq < 0.35 ? 1 : tq > 1.1 ? ((f12 & 1) ? 0 : 1) : 0; P.bob = tq < 0.35 ? 0 : -1; P.tilt = tq < 0.35 ? 0 : -1; P.hornc = 1; P.vent = 1;
      P.spin = (f12 >> (tq < 0.7 ? 1 : 0)) & 7; P.tw = 3; P.lit = Math.min(5, Math.max(0, Math.floor((tq - 0.15) / 0.2) + 1));
      P.beads = tq < 0.3 ? 0 : tq < 0.6 ? 1 : tq < 0.9 ? 2 : tq < 1.15 ? 3 : ((f12 & 1) ? 4 : 3); P.tph = (f12 >> 1) & 7; P.rim = 2;
    } else if (st === CAST) { focusVent = true; P.fin = 5; P.lit = 5; P.vent = 2; P.beads = 4; P.spin = f12 & 7; P.tw = 3; P.bob = -1; P.hornc = 2; P.tamp = 2; P.tph = 4; P.rim = 3; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); focusVent = q < 0.5;
      P.fin = q < 0.3 ? 5 : q < 0.65 ? 1 : 2; P.lit = q < 0.3 ? 3 : q < 0.65 ? 1 : 0; P.beads = q < 0.25 ? 3 : q < 0.5 ? 2 : q < 0.75 ? 1 : 0; P.vent = q < 0.4 ? 1 : 0;
      P.bob = q < 0.5 ? -1 : 0; P.tw = q < 0.4 ? 3 : 0; P.tph = (f12 >> 1) & 7; P.rim = q < 0.5 ? 2 : 1; if (q > 0.9) idle(tq, TT);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, TT);
      else if (h < 0.2) { P.fin = 0; P.tm = 4; P.bx = -2; P.eyes = 1; P.hornc = 2; P.tilt = -1; P.flash = h < 1 / 12 ? 1 : 0; P.beads = 0; P.rim = 0; }
      else if (h < 0.35) { P.fin = 1; P.tamp = 3; P.tph = 6; P.bx = -1; P.eyes = 1; P.hornc = 2; P.rim = 0; }
      else idle(tq, TT);
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, TT); P.rim = 1; }
      else if (d < 0.3) { P.fin = 0; P.tm = 4; P.bx = -2; P.eyes = 1; P.hornc = 2; P.tilt = -1; P.flash = d < 1 / 12 ? 1 : 0; P.beads = (f12 & 1) ? 1 : 0; }
      else {                                                                     // 失衡：腹下裂开虚空点，身体僵住发抖，从翼缘开始碎成星尘被吸进去
        P.fin = d < 0.5 ? 4 : 6; P.tm = 4; P.eyes = 1; P.hornc = 2; P.tilt = 2; P.vent = 2; P.bx = -2 + ((f12 & 1) && d < 1.6 ? 1 : 0); P.tw = 3;
        P.lit = -Math.min(5, Math.max(0, Math.floor((d - 0.4) / 0.12) + 1)); P.beads = d < 0.9 ? ((f12 % 3) === 0 ? 4 : 0) : 0;
        if (d >= 0.5) P.imp = clamp01((d - 0.5) / 1.4);
        if (d >= 1.9) P.dq = 1;
      }
    } else if (st === REVIVE) { idle(tq, TT); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    P.dq48 = R(P.dq * 48); P.imp48 = R((P.imp || 0) * 48); cy = bodyY(); TI = P.tilt; tailPts();
    const v = ventPt(); VX[0] = v[0] + P.bx; VX[1] = R(v[1]);
    if (focusVent) { P.gx = VX[0]; P.gy = VX[1] + 1; } else { const k = BEADS[2]; P.gx = R(TP[2 * k]) + P.bx; P.gy = R(ty(TP[2 * k], TP[2 * k + 1])); }
    KEY(P);
  }

  // ───── 特效 ─────
  let chargeAcc = 0, trailAcc = 0, emberAcc = 0, sinkAcc = 0, impAcc = 0, sinkT = 9, discT = 9, disc0x = 0, disc0y = 0, voidT = 9, finT = 9;
  const ringT = [9, 9, 9], RING_Y = [-21, -14, -7];
  const ventScr = () => [scrX(VX[0]), HY + VX[1]];
  // 技能等离子盘的路线（施放后秒数 → 屏幕坐标）：腹下 → 假人胸 → 地面 → 假人腰 → 地面 → 假人腿 → 弹开飞走
  const PATH_T = [0, 0.14, 0.21, 0.28, 0.35, 0.42, 0.56];
  const PATH = () => [disc0x, disc0y, DUMMY_X - 4, HY - 21, DUMMY_X - 13, FLOOR - 1, DUMMY_X - 4, HY - 14, DUMMY_X - 11, FLOOR - 1, DUMMY_X - 4, HY - 7, DUMMY_X - 22, HY - 36];
  function discAt(t) { const p = PATH(); let i = 0; while (i < PATH_T.length - 2 && t >= PATH_T[i + 1]) i++; const q = clamp01((t - PATH_T[i]) / (PATH_T[i + 1] - PATH_T[i])); return [p[2 * i] + (p[2 * i + 2] - p[2 * i]) * q, p[2 * i + 1] + (p[2 * i + 3] - p[2 * i + 1]) * q]; }
  function onEnter(s) {
    if (s === CAST) {
      const [vx, vy] = ventScr(); releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); burst(vx, vy + 1, 18, 40, 100, 0.25, 0.5, R_EL, 0); ring(vx, vy, 0, R_EL);
      disc0x = vx; disc0y = vy + 2; discT = 0; shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [x, y] = ventScr(), tx = DUMMY_X - 4, vx = 150; shoot(1, x + 2, y + 1, vx, tx, R_EL, (HY - 15 - y) / ((tx - x) / vx)); burst(x, y + 1, 7, 25, 60, 0.12, 0.3, R_EL, -10);
      sfx('swing', { kind: 'throw', w: 0.5 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST) {
      const i = T_BOUNCE.indexOf(t);
      if (i >= 0 && !(i & 1)) {                  // 打在假人身上：压一圈衰减紫环，下沉粒子加密
        const k = i >> 1; ringT[k] = 0; hitDummy(1); shake(0.12, 1); burst(DUMMY_X - 3, HY + RING_Y[k], 12, 30, 90, 0.2, 0.45, R_EL, 6);
        if (k === 0) { dummyFx({ dur: 1.6, tint: R_DIM, slow: 0.4 }); sinkT = 0; }
        sfx('impact', { pal: 'arcane', w: 0.6 + k * 0.1 });
      } else if (i >= 0) {                       // 弹在地面上
        const x = DUMMY_X - (i === 1 ? 13 : 11); burst(x, FLOOR - 2, 6, 20, 50, 0.15, 0.3, R_EL, 14);
        for (let j = 0; j < 4; j++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, FLOOR - 1, (Math.random() - 0.5) * 20, -6 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust);
      }
    }
    if (s === DEATH && t === INCOMING + 0.3) voidT = 0;
    if (s === DEATH && t === INCOMING + 1.9) { const [vx, vy] = ventScr(); fx.cross(vx, vy, 7, R_EL, 0.3, 2); ring(vx, vy, 0, R_EL); burst(vx, vy, 10, 20, 60, 0.2, 0.5, R_EL, 4); flash(0.04); finT = 0; }
  }
  const EVENTS = [[], [], [T_HIT], [], T_BOUNCE, [], [], [INCOMING + 0.3, INCOMING + 1.9], []];
  function impactOn(k, x, y) {
    if (k === 1) {                               // 等离子盘打中：弹开往回上方飞走
      burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.4 });
      for (let i = 0; i < 4; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, y, (Math.random() - 0.5) * 6, 4, 0.5 + Math.random() * 0.3, R_EL, { g: 12, age0: 0.4 });
      shoot(0, x - 2, y, -110, x - 20, R_EL, -70, { trail: { every: 2 }, glow: -1 });
    } else if (k === 0) burst(x, y, 5, 15, 40, 0.12, 0.25, R_EL, 4);
  }
  function stepFX(dt, state, stT) {
    const [vx, vy] = ventScr();
    if (state === CHARGE) { chargeAcc += dt * (22 + 30 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 12, a = Math.random() * 6.2832; spawn(K_SPIRAL_PT, vx, vy + 1, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 3 + Math.random() * 3); } }   // 星尘定点汇聚到腹下
    if (state === MOVE) { trailAcc += dt * 10; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_TRAIL, vx + (P.flip ? 4 : -4) + (Math.random() - 0.5) * 6, vy + 2, (P.flip ? 1 : -1) * (6 + Math.random() * 8), 4 + Math.random() * 5, 0.35 + Math.random() * 0.25, R_EL); } }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 2.5 : 6); while (emberAcc >= 1) { emberAcc -= 1; const k = BEADS[Math.floor(Math.random() * 3)]; spawn(K_EMBER, scrX(R(TP[2 * k])), HY + R(ty(TP[2 * k], TP[2 * k + 1])) - 1, Math.random() * 8 - 4, -6 - Math.random() * 6, 0.5 + Math.random() * 0.5, R_EL); } }
    if (sinkT < 1.4) { sinkAcc += dt * (sinkT < 0.4 ? 30 : 18); while (sinkAcc >= 1) { sinkAcc -= 1; spawnX(K_PHYS, DUMMY_X + (Math.random() - 0.5) * 14, HY - 30 + Math.random() * 18, (Math.random() - 0.5) * 4, 3, 0.7 + Math.random() * 0.4, R_EL, { g: 14, age0: 0.4, dragY: 0.6 }); } }
    if (state === DEATH && stT > INCOMING + 0.5 && stT < INCOMING + 1.85) {       // 星尘被吸进虚空点
      impAcc += dt * 46; const q = clamp01((stT - INCOMING - 0.5) / 1.4);
      while (impAcc >= 1) { impAcc -= 1; const r = 6 + (1 - q) * 18 + Math.random() * 4, a = Math.random() * 6.2832; spawn(K_SPIRAL_PT, vx, vy, r / (0.3 + Math.random() * 0.2), 0, 9, R_EL, a, r, (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3)); }
    }
    discT += dt; sinkT += dt; voidT += dt; finT += dt; for (let i = 0; i < 3; i++) ringT[i] += dt;
  }
  function fxReset() { chargeAcc = 0; trailAcc = 0; emberAcc = 0; sinkAcc = 0; impAcc = 0; sinkT = 9; discT = 9; voidT = 9; finT = 9; ringT.fill(9); }
  function decayRings(front, f12) {          // 衰减紫环：套在假人身上的扁椭圆，后半圈在假人后面，前半圈在前面，3 圈叠起来
    for (let k = 0; k < 3; k++) {
      const a0 = ringT[k]; if (a0 > 1.3) continue; if (a0 > 0.95 && (f12 & 1)) continue;
      const c = a0 < 0.08 ? EL[0] : a0 < 0.2 ? EL[2] : EL[3], rx = a0 < 0.08 ? 10 : 8, cyR = HY + RING_Y[k];
      for (let i = 0; i < 40; i++) { const a = i / 40 * 2 * PI, s = Math.sin(a); if ((s > 0) !== front) continue; put(R(DUMMY_X + Math.cos(a) * rx), R(cyR + s * 2.2), c); }
    }
  }
  function fxBack(f12) {
    if (P.dq < 0.6 && P.imp48 < 24) groundShadow(scrX(0), 10, -bodyY() - 4);
    if (P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12); decayRings(false, f12);
  }
  function fxMid(f12) { decayRings(true, f12); }
  function fxFront(f12) {
    if (discT < 0.56) {                         // 等离子盘 + 拖尾
      for (let k = 6; k >= 1; k--) { const t = discT - k * 0.012; if (t < 0) continue; const p = discAt(t); put(R(p[0]), R(p[1]), EL[Math.min(4, 1 + (k >> 1))]); if (k < 3) put(R(p[0]), R(p[1]) - 1, EL[2]); }
      const p = discAt(discT), x = R(p[0]), y = R(p[1]), wide = (f12 & 1) === 0;
      for (let i = -2; i <= 2; i++) put(x + i, y, Math.abs(i) < 2 ? EL[0] : EL[1]);
      put(x, y - 1, EL[1]); put(x, y + 1, EL[2]); if (wide) { put(x - 1, y - 1, EL[2]); put(x + 1, y + 1, EL[2]); put(x + 3, y, EL[2]); put(x - 3, y, EL[2]); } else { put(x + 1, y - 1, EL[2]); put(x - 1, y + 1, EL[2]); }
    }
    if (voidT < 1.6 && E.state === DEATH) {       // 腹下虚空点：越缩越小，边缘一圈紫
      const [vx, vy] = ventScr(), r = Math.max(0.6, 4.5 * (1 - voidT / 1.6)), n = Math.ceil(r * 7);
      for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) if (i * i + j * j <= r * r) put(vx + i, vy + j + 1, VOID[4]);
      for (let k = 0; k < n; k++) { const a = k / n * 2 * PI + voidT * 6; if ((k + f12) & 1) continue; put(R(vx + Math.cos(a) * (r + 1)), R(vy + 1 + Math.sin(a) * (r + 1)), k % 3 === 0 ? EL[1] : EL[3]); }
    }
    if (E.state === CAST && P.beads === 4) { const k = BEADS[2], gx = scrX(R(TP[2 * k])), gy = HY + R(ty(TP[2 * k], TP[2 * k + 1])), L = 3 + (f12 & 1); for (let r = 2; r <= L; r++) { put(gx + r, gy, EL[1]); put(gx - r, gy, EL[2]); put(gx, gy - r, EL[2]); put(gx, gy + r, EL[2]); } }
  }
  function drawShot(k, x, y, d, f12, Rr) {    // 等离子盘：扁的 5 格亮盘，转动时一宽一斜
    if (k > 1) return false;
    const big = k === 1; put(x, y, Rr[0]); put(x + 1, y, Rr[0]); put(x - 1, y, Rr[1]); put(x + 2, y, Rr[1]);
    if (big) { put(x - 2, y, Rr[2]); put(x + 3, y, Rr[2]); if (f12 & 1) { put(x, y - 1, Rr[1]); put(x + 1, y + 1, Rr[2]); } else { put(x + 1, y - 1, Rr[1]); put(x, y + 1, Rr[2]); } }
    return true;
  }

  return {
    name: '虚空魔鬼鱼', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.pl, M.orb, M.eye, M.star], HIT_POINT: [0, -17], EVENTS, REVIVE: { dy: -17, big: 1 },
    SFX: { body: 'beast', how: 'dissolve', pal: 'arcane', style: 'spiral', w: 0.7, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
