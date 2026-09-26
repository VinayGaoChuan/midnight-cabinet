// 曲速之翼 WarpWing（虚空 · 祭司 · 优质 · 远程 640）：小型扁平的虚空魔鬼鱼。3/4 俯视的扁菱形身体、一对宽三角鳍翼（翼缘一道青色等离子线）、
// 头前一对向前卷的角状头鳍、鞭状长尾末端一颗等离子光球。攻击：尾鞭前甩，甩出一颗等离子弹；技能「等离子衰减」：放出一圈向外扩散的削弱光环。
// 升级线 → 虚空魔鬼鱼（VoidManta.js）：保留头鳍、长尾尾球、翼缘等离子线。设定卡见 pcd/batch-12/WarpWing/design.md。
PCD.define('WarpWing', (E) => {
  const { defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, gait, walkDemo, keyer, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, groundShadow, sfx } = E;
  const U = E.parts.beast.util, R = Math.round, PI = Math.PI;

  // ───── 材质 ─────
  const M = {
    back: defMat('sky', 2), fin: defMat([39, 41, 23, 60], 1), finF: defMat([39, 40, 41, 23], 1), tail: defMat('sky', 1),
    belly: defMat([39, 18, 17, 21], 1), horn: defMat('purple', 1), hornF: defMat('purple', 1, 0, 1),
    pl: defMat([25, 24, 22, 21], 1, 1),        // 翼缘等离子线（平涂，手工色调：1 熄灭 · 2 暗 · 3 青 · 4 白热）
    orb: defMat([25, 23, 22, 21], 1, 1), eye: defMat([0, 24, 22, 21], 1, 1), ink: defMat([0, 0, 0, 0], 1, 1),
  };
  const R_EL = FXI.magic, EL = FXR[R_EL], HX = 34, DUR = DEFAULT_DUR.slice();
  const R_DIM = E.fxRamp('plasmaDecay', [22, 23, 24, 25, 1]);   // 被削弱的假人：同一星辉色阶往暗的一端挪一级
  const hero = new Sprite(76, 42, 38, 37);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['pl', 'orb', 'eye', 'ink']) RIM.skip[M[k]] = 1;

  // ───── 形体与姿势 ─────
  const ALT = 10, BW = 7, BH = 3, S = 10, TL = 11;
  // 鳍翼姿：仰角（度）与后掠比例。0 高扬 · 1 上扬 · 2 平展 · 3 下压 · 4 最低 · 5 张开（施放）· 6 摊平（倒地）· 7 回收（后缘滞后）
  const FINS = [60, 32, 2, -20, -40, 22, 0, -6].map((d) => d * PI / 180), SWEEP = [0.1, 0.12, 0.15, 0.15, 0.12, 0.08, 0.2, 0.3];
  const P = { fin: 2, bob: 0, lift: 0, lie: 0, bf: 0, tm: 0, tph: 0, tamp: 1, orb: 0, lit: 0, eyes: 0, hornc: 0, flash: 0, dq: 0, dq48: 0, bx: 0, rim: 1, tilt: 0, lag: 0,
    gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  // tm 尾型：0 拖尾 S 摆 · 1 后引上翘 · 2 前甩 · 3 垂地 · 4 受击下甩；orb 尾球 0 暗 · 1 亮 · 2 大 · 3 爆闪 · 4 熄灭；lit 翼缘：+k 前 k 段白热 · 0 常亮青 · -k 末 k 段熄灭
  const KEY = keyer([['fin', 0, 7], ['bob', -2, 2], ['lift', 0, 20], ['lie', 0, 2], ['bf', 0, 1], ['tm', 0, 4], ['tph', 0, 7], ['tamp', 0, 3], ['orb', 0, 4], ['lit', -5, 5],
    ['eyes', 0, 1], ['hornc', 0, 2], ['flash', 0, 1], ['dq48', 0, 48], ['bx', -8, 8], ['rim', 0, 3], ['tilt', -2, 2], ['lag', 0, 1]]);
  function reset() { P.fin = 2; P.bob = 0; P.lift = 0; P.lie = 0; P.bf = 0; P.tm = 0; P.tph = 0; P.tamp = 1; P.orb = 0; P.lit = 0; P.eyes = 0; P.hornc = 0; P.flash = 0; P.dq = 0; P.bx = 0; P.rim = 1; P.tilt = 0; P.lag = 0; P.mx = 0; P.flip = 0; }
  const bodyY = () => (P.lie === 2 ? -R(BH) - 1 : P.lie === 1 ? -(P.lift + R(BH) + 1) : -(ALT + R(BH) + 1) + P.bob);

  // 落笔变换：bf 1 = 翻成肚子朝上（绕身体中线上下翻），tilt = 头抬 / 低（按 x 线性错位）
  let cy = -14, FL = 0, TI = 0;
  const ty = (x, y) => (FL ? 2 * cy - y : y) + TI * x / 7;
  const D = (x, y, m, t) => U.dot(E, x, ty(x, y), m, t);
  const PG = (p, m, t) => { const q = p.slice(); for (let i = 0; i < q.length; i += 2) q[i + 1] = ty(q[i], q[i + 1]); U.poly(E, q, m, t); };

  // 尾巴的点（根 → 尖），写进 TP；走向角 h：0 朝前（+x）、PI 朝后、PI/2 朝上
  const TP = new Float32Array(2 * (TL + 1));
  function tailPts() {
    let x = -BW + 0.5, y = cy + 0.5; TP[0] = x; TP[1] = y;
    for (let k = 1; k <= TL; k++) {
      const q = k / TL; let h;
      if (P.tm === 0) h = PI + Math.sin(k * 0.55 + P.tph * PI / 4) * P.tamp * 0.42 * Math.min(1, k / 3);
      else if (P.tm === 1) h = PI - 1.9 * Math.pow(q, 1.1);
      else if (P.tm === 2) h = 1.9 - 2.1 * q;
      else if (P.tm === 3) h = PI + (k < 4 ? 0.5 : 0) + ((k & 1) ? 0.1 : -0.1);
      else h = PI + 0.95 * Math.pow(q, 1.2);
      x += Math.cos(h); y -= Math.sin(h); if (P.tm === 3) y = Math.min(y, -1); TP[2 * k] = x; TP[2 * k + 1] = y;
    }
  }

  // ───── 画 ─────
  // 候选部件：finWing 鳍翼（魔鬼鱼 / 鳐类的扁平三角鳍）。3/4 俯视：近侧鳍平展时伸向镜头 = 画面下方，远侧鳍伸向画面上方；
  //   翼根沿身体一条线（xf 前、xb 后、yr 行），e 仰角、span 翼展、sw 翼尖后掠比例、lag 后缘滞后 2 格（波浪拍动）；
  //   前缘外凸、后缘内凹；翼缘等离子线沿前缘分 5 段，按 lit 逐段亮起 / 熄灭（lines 2 = 内侧再加一道）
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
    for (let i = 1; i <= 6; i++) { const p = bz(F, Lc, T, i / 6); pts.push(p[0], p[1]); }
    for (let i = 1; i <= 5; i++) { const p = bz(T, Tc, B, i / 5); pts.push(p[0], p[1]); }
    const m = far ? M.finF : M.fin; PG(pts, m, 0);
    const rib = bz(F, Lc, T, 0.7), r0 = [F[0] + (B[0] - F[0]) * 0.45, yr];                                   // 一道鳍骨（暗）
    for (let i = 2; i <= 7; i++) { const q = i / 9; D(r0[0] + (rib[0] - r0[0]) * q, r0[1] + (rib[1] - r0[1]) * q, m, 2); }
    const n = Math.ceil(L * 1.7);
    for (let ln = 0; ln < (lines || 1); ln++) {
      for (let i = R(n * 0.3) + (ln ? 2 : 0); i <= n - (ln ? 1 : 0); i++) {
        const q = i / n, seg = Math.min(4, Math.floor((q - 0.3) / 0.7 * 5)), p = bz(F, Lc, T, q);
        let tn = 3; if (P.lit > 0 && seg < P.lit) tn = 4; if (P.lit < 0 && seg >= 5 + P.lit) tn = far ? 1 : 2; if (ln && tn > 2) tn--;
        D(p[0] - nx * 2 * ln, p[1] - ny * 2 * ln, M.pl, tn);
      }
    }
  }
  function lobe(far) {                       // 角状头鳍：根 2 格厚，往前伸、略上扬，尖端往下卷（hornc 1 卷紧 · 2 张开下垂）
    part(); const m = far ? M.hornF : M.horn, c = P.hornc, x0 = BW - 1 - (far ? 1 : 0), y0 = cy + (far ? -2 : 1);
    const pts = c === 1 ? [[0, 0], [1, 0], [2, -1], [3, -1], [4, 0], [3, 1]] : c === 2 ? [[0, 0], [1, 0], [2, 0], [3, 1], [4, 1], [5, 2]] : [[0, 0], [1, 0], [2, -1], [3, -1], [4, -1], [5, 0], [5, 1]];
    for (const q of pts) D(x0 + q[0], y0 + q[1], m, 0);
    D(x0, y0 + 1, m, 0); D(x0 + 1, y0 + 1, m, 0); D(x0 - 1, y0 + 1, m, 0);
  }
  function body() {
    part();
    for (let x = -BW; x <= BW; x++) {
      const t = x / BW, s = t >= 0 ? Math.sqrt(Math.max(0, 1 - t ** 4)) : Math.sqrt(Math.max(0, 1 - (-t) ** 1.6));
      const top = R(cy - BH * s - (t > -0.4 && t < 0.5 ? 0.45 : 0)), bot = R(cy + BH * 0.8 * s);
      for (let y = top; y <= bot; y++) D(x, y, y >= bot - (t > -0.3 && t < 0.85 ? 1 : 0) ? M.belly : M.back, y === top && t > -0.5 && t < 0.6 ? 4 : 0);
    }
    for (let x = -4; x <= 2; x += 3) D(x, cy - 1, M.back, 2);                                                  // 背上两道暗纹
    D(BW - 2, cy - 1, M.eye, P.eyes ? 2 : 3); D(BW, cy + 1, M.ink, 0); D(BW - 1, cy + 1, M.ink, 0);              // 眼、嘴缝
  }
  function tail() {
    part();
    for (let k = 0; k < TL; k++) { const x0 = TP[2 * k], y0 = TP[2 * k + 1], x1 = TP[2 * k + 2], y1 = TP[2 * k + 3]; U.seg(E, x0, ty(x0, y0), x1, ty(x1, y1), k < 3 ? 2 : 1, M.tail, 0); }
  }
  function orb() {                           // 尾端等离子球：5 档
    part(); const x = R(TP[2 * TL]), y = R(ty(TP[2 * TL], TP[2 * TL + 1])), o = M.orb, lv = P.orb, d = (a, b, t) => U.dot(E, x + a, y + b, o, t);
    if (lv === 4) { d(0, 0, 1); d(-1, 0, 2); return; }
    if (lv >= 2) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) d(i, j, i || j ? 3 : 4); d(0, -2, lv === 3 ? 3 : 2); d(0, 2, lv === 3 ? 3 : 2); d(2, 0, lv === 3 ? 3 : 2); d(-2, 0, lv === 3 ? 3 : 2); if (lv === 3) { d(-1, -1, 4); d(1, -1, 4); } return; }
    d(0, 0, lv ? 4 : 3); d(1, 0, lv ? 3 : 2); d(-1, 0, lv ? 3 : 2); d(0, 1, lv ? 3 : 2); d(0, -1, lv ? 3 : 2);
  }
  function drawHero() {
    begin(hero, P.bx, 0); cy = bodyY(); TI = P.tilt; tailPts();
    const front = P.tm === 1 || P.tm === 2;
    FL = 0; finWing(1, S, 3, -6, cy - 2, 1);
    FL = P.bf; lobe(1);
    FL = 0; if (!front) { tail(); orb(); }
    FL = P.bf; body();
    FL = 0; finWing(0, S, 4, -6, cy + 2, 1);
    FL = P.bf; lobe(0);
    FL = 0; if (front) { tail(); orb(); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 姿势 ─────
  const IDLE_FIN = [2, 7, 3, 7], IDLE_BOB = [0, 1, 0, -1], WALK_FIN = [0, 2, 4, 7], WALK_BOB = [1, 0, -1, 0], T_HIT = 2 / 12, T_AURA = 0.28;
  function idle(tq, TT) {
    const c = Math.floor(TT * 2.5 + 1e-6) & 3; P.fin = IDLE_FIN[c]; P.bob = IDLE_BOB[c]; P.tph = Math.floor(TT * 5 + 1e-6) & 7; P.tamp = 1; P.orb = c & 1;
    const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { P.fin = 0; P.bob = 1; P.hornc = 1; P.tm = 1; P.tilt = -1; P.orb = lp >= 1.75 ? 2 : 1; }   // 待机个性：抬尾看尾球，尾球亮一下
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12; reset();
    if (st === IDLE) idle(tq, TT);
    else if (st === MOVE) {
      const f = gait(tq); P.fin = WALK_FIN[f]; P.bob = WALK_BOB[f]; P.tph = f * 2; P.tamp = 2; P.lag = f & 1; P.orb = 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { P.tm = 1; P.fin = 1; P.tilt = -1; P.bx = -1; P.hornc = 1; P.orb = tq < 1 / 12 ? 1 : 2; P.rim = 2; }
      else if (tq < 0.2) { P.tm = 2; P.fin = 3; P.tilt = 1; P.bx = 1; P.orb = 3; P.rim = 2; }
      else if (tq < 0.45) { P.tm = 2; P.fin = tq < 0.3 ? 4 : 2; P.bx = 1; P.orb = 0; }
      else if (tq < 0.6) { P.tm = 0; P.tamp = 3; P.tph = 2; P.fin = 1; P.orb = 0; }
      else idle(tq, TT);
    } else if (st === CHARGE) {
      P.fin = tq < 0.35 ? 1 : tq > 1.1 ? ((f12 & 1) ? 0 : 1) : 0; P.bob = tq < 0.35 ? 0 : -1; P.tilt = tq < 0.35 ? 0 : -1; P.hornc = 1;
      P.lit = Math.min(5, Math.max(0, Math.floor((tq - 0.15) / 0.2) + 1)); P.orb = tq < 0.5 ? 1 : tq < 0.9 ? 2 : ((f12 & 1) ? 3 : 2);
      P.tph = (f12 >> 1) & 7; P.rim = 2;
    } else if (st === CAST) { P.fin = 5; P.lit = 5; P.orb = tq < 0.2 ? 3 : 2; P.bob = -1; P.hornc = 2; P.tamp = 2; P.tph = 4; P.rim = 3; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); P.fin = q < 0.3 ? 5 : q < 0.65 ? 1 : 2; P.lit = q < 0.3 ? 3 : q < 0.65 ? 1 : 0; P.orb = q < 0.4 ? 2 : 1; P.bob = q < 0.5 ? -1 : 0;
      P.tph = (f12 >> 1) & 7; P.rim = q < 0.5 ? 2 : 1; if (q > 0.9) idle(tq, TT);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, TT);
      else if (h < 0.2) { P.fin = 0; P.tm = 4; P.bx = -2; P.eyes = 1; P.hornc = 2; P.tilt = -1; P.flash = h < 1 / 12 ? 1 : 0; P.orb = 0; P.rim = 0; }
      else if (h < 0.35) { P.fin = 1; P.tamp = 3; P.tph = 6; P.bx = -1; P.eyes = 1; P.hornc = 2; P.rim = 0; }
      else idle(tq, TT);
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, TT); P.rim = 1; }
      else if (d < 0.3) { P.fin = 0; P.tm = 4; P.bx = -2; P.eyes = 1; P.hornc = 2; P.tilt = -1; P.flash = d < 1 / 12 ? 1 : 0; P.bob = d < 0.15 ? 0 : 1; P.orb = (f12 & 1) ? 1 : 4; }
      else if (d < 0.66) {                                                     // 失去浮力：翻滚着坠落，半路翻成肚子朝上
        const q = (d - 0.3) / 0.36; P.lie = 1; P.lift = Math.max(0, R(ALT * (1 - q * q))); P.bf = q > 0.45 ? 1 : 0; P.fin = [1, 4, 0, 1, 4, 6][Math.min(5, Math.floor(q * 6))];
        P.tm = 4; P.eyes = 1; P.bx = -3; P.hornc = 2; P.tilt = q < 0.45 ? 2 : -2; P.orb = (f12 & 1) ? 1 : 4;
      } else {                                                                 // 肚子朝上摊在地上：鳍抽两下，翼缘光一段段熄灭，化成星尘
        P.lie = 2; P.bf = 1; P.bx = -3; P.eyes = 1; P.tm = 3; P.hornc = 2;
        P.fin = (d > 0.8 && d < 0.9) || (d > 1.0 && d < 1.09) ? 2 : 6;
        P.lit = -Math.min(5, Math.max(0, Math.floor((d - 0.7) / 0.12) + 1)); P.orb = d < 1.2 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, TT); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    P.dq48 = R(P.dq * 48); cy = bodyY(); TI = P.tilt; tailPts();
    P.gx = R(TP[2 * TL]) + P.bx; P.gy = R(ty(TP[2 * TL], TP[2 * TL + 1]));
    KEY(P);
  }

  // ───── 特效 ─────
  let chargeAcc = 0, trailAcc = 0, emberAcc = 0, starAcc = 0, sinkAcc = 0, sinkT = 9, auraT = 9, auraX = 0, auraY = 0, smT = 9, smX = 0, smY = 0, mzT = 9, mzX = 0, mzY = 0;
  const bodyScr = () => [scrX(0), HY + bodyY()];
  function onEnter(s) {
    if (s === CAST) {
      const [cx, cyS] = bodyScr(); releaseOrbit(40, 95, 0.3, 0.7); burst(cx, cyS, 24, 50, 120, 0.25, 0.6, R_EL, 6); ring(cx, cyS, 0, R_EL);
      auraT = 0; auraX = cx; auraY = cyS; shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const x = scrX(P.gx), y = HY + P.gy, tx = DUMMY_X - 4, vx = 170;
      shoot(1, x + 2, y, vx, tx, R_EL, (HY - 17 - y) / ((tx - x) / vx)); burst(x, y, 6, 30, 70, 0.12, 0.3, R_EL, 0);
      mzT = 0; mzX = x; mzY = y; smT = 0; smX = scrX(-BW); smY = HY + bodyY();
      sfx('swing', { kind: 'throw', w: 0.3 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_AURA) {
      hitDummy(1); shake(0.12, 1); dummyFx({ dur: 1.3, tint: R_DIM, slow: 0.5 }); burst(DUMMY_X, HY - 16, 14, 30, 80, 0.2, 0.5, R_EL, 4); sinkT = 0;
      sfx('impact', { pal: 'arcane', w: 0.3 });
    }
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 14 + Math.random() * 22, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      burst(HX - 6, HY - 3, 6, 20, 50, 0.2, 0.4, R_EL, 8); shake(0.1, 1); sfx('fall', { w: 0.25 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_AURA], [], [], [INCOMING + 0.66], []];
  function impactOn(k, x, y) {
    if (k === 1) {
      burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0); sfx('hit', { mat: 'magic', w: 0.3 });
      for (let i = 0; i < 3; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, y, (Math.random() - 0.5) * 6, 4, 0.5 + Math.random() * 0.3, R_EL, { g: 12, age0: 0.4 });
    }
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) { chargeAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    if (state === MOVE) { trailAcc += dt * 9; while (trailAcc >= 1) { trailAcc -= 1; const [bx, by] = bodyScr(); spawn(K_TRAIL, bx + (P.flip ? 3 : -3) + (Math.random() - 0.5) * 4, by + 4, (P.flip ? 1 : -1) * (6 + Math.random() * 8), 4 + Math.random() * 5, 0.3 + Math.random() * 0.25, R_EL); } }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 2.5 : 7); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + R(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -6 - Math.random() * 6, 0.5 + Math.random() * 0.5, R_EL); } }
    if (sinkT < 1.1) { sinkAcc += dt * 16; while (sinkAcc >= 1) { sinkAcc -= 1; spawnX(K_PHYS, DUMMY_X + (Math.random() - 0.5) * 14, HY - 30 + Math.random() * 16, (Math.random() - 0.5) * 4, 3, 0.7 + Math.random() * 0.4, R_EL, { g: 14, age0: 0.4, dragY: 0.6 }); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { starAcc += dt * 26; while (starAcc >= 1) { starAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 24, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.7 + Math.random() * 0.7, R_EL); } }
    auraT += dt; sinkT += dt; smT += dt; mzT += dt;
  }
  function fxReset() { chargeAcc = 0; trailAcc = 0; emberAcc = 0; starAcc = 0; sinkAcc = 0; sinkT = 9; auraT = 9; smT = 9; mzT = 9; }
  function aura(front, f12) {                // 削弱光环：扁椭圆点阵向外扩散，后半圈画在角色 / 假人后面，前半圈画在前面
    if (auraT > 0.5) return;
    for (const [lag, lv] of [[0, 0], [0.05, 2]]) {
      const tt = auraT - lag; if (tt < 0) continue; const r = 5 + 215 * tt, ry = r * 0.4, n = Math.ceil(r * 4.2);
      const c = EL[Math.min(4, (tt < 0.05 ? 0 : tt < 0.14 ? 1 : tt < 0.3 ? 2 : 3) + (lv ? 1 : 0))];
      for (let k = 0; k < n; k++) { const a = k / n * 2 * PI, s = Math.sin(a); if ((s > 0) !== front) continue; if (((k + f12) % 4) === 3 || (tt > 0.28 && (k & 1)) || (lv && (k % 3))) continue; put(R(auraX + Math.cos(a) * r), R(auraY + s * ry), c); }
    }
  }
  function fxBack(f12) {
    if (P.lie !== 2 && P.dq < 0.6) groundShadow(scrX(0), 7, -bodyY() - 3);
    const st = E.state;
    if (st === CHARGE || st === CAST || (st === RECOVER && E.stT < 0.35)) {   // 身下地面的点阵光环
      const r = st === CHARGE ? 4 + 10 * clamp01(E.stT / 1.0) : 14, cx = scrX(0), sp = E.stT * 3;
      for (let k = 0; k < 24; k += 2) { const a = k / 24 * 2 * PI + sp, x = R(cx + Math.cos(a) * r), y = R(FLOOR + Math.sin(a) * 2); if (st === RECOVER && ((k + f12) & 2)) continue; put(x, y, (k >> 1) % 3 === f12 % 3 ? EL[1] : EL[2]); }
    }
    if (P.rim >= 2 && P.lie === 0) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12); aura(false, f12);
  }
  function fxFront(f12) {
    aura(true, f12);
    if (smT < 2 / 12) { const c = smT < 1 / 12 ? EL[1] : EL[2]; for (let k = 0; k <= 10; k++) { if (smT >= 1 / 12 && (k & 1)) continue; const a = 1.9 - 1.5 * k / 10, r = 8; put(R(smX + Math.cos(a) * r), R(smY - Math.sin(a) * r), c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (P.orb === 3 && P.dq < 1 && (E.state === CHARGE || E.state === CAST)) { const gx = scrX(P.gx), gy = HY + P.gy, L = E.state === CAST ? 5 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } }
  }
  function drawShot(k, x, y, d, f12, Rr) {    // 等离子弹：2×2 白芯 + 青晕 + 上下跳动的电火花
    if (k !== 1) return false;
    put(x, y, Rr[0]); put(x + d, y, Rr[0]); put(x, y - 1, Rr[1]); put(x + d, y - 1, Rr[1]); put(x - d, y, Rr[1]); put(x + 2 * d, y, Rr[1]); put(x, y + 1, Rr[2]); put(x + d, y + 1, Rr[2]); put(x - 2 * d, y, Rr[2]);
    if (f12 & 1) { put(x + d, y - 2, Rr[1]); put(x - d, y + 2, Rr[2]); } else { put(x, y + 2, Rr[1]); put(x + 2 * d, y - 2, Rr[2]); }
    return true;
  }

  return {
    name: '曲速之翼', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.pl, M.orb, M.eye], HIT_POINT: [0, -14], EVENTS, REVIVE: { dy: -14 },
    SFX: { body: 'beast', how: 'topple', pal: 'arcane', style: 'nova', w: 0.3, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
