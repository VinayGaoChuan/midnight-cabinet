// 链甲枪兵（部队 · 科技 · 先锋 · 优质 · batch-08）：长枪兵（Pikeman.js）落地披甲后的样子——旋翼折叠成背后两扇竖立的长扇叶、闭面盔顶风向标冠、
// 链甲 + 板甲 + 天青罩袍、双手握动力钻头长枪（大钻头 + 黄铜马达壳 + 排气小烟囱）。
// 攻击 = 双手弓步低刺，钻头在目标身上连转 3 帧；技能 = 特性「硬化」：扎马顿枪 → 链甲从脚往上亮成金色 → 六角格金纹护罩合拢 → 敌弹打上来只溅金火花。
PCD.define('ChainmailPikeman', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_EMBER,
    spawn, spawnX, burst, shoot, ring, shake, flash, fx, death, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, FL = (v) => Math.floor(v + 1e-6), HALF = Math.PI / 2, PX = parts.px, RUN = parts.run;

  // ───── 元素：硬化 · 镀金（holy：白 → 淡金白 → 奶油金 → 金 → 暗金）─────
  const R_EL = FXI.holy, EL = FXR[R_EL], R_ST = FXI.steel, R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    chain: { r: 'steel', band: 2 },                                  // 钢灰链甲（主材质）
    plate: [27, 29, 30, 31],                                         // 板甲
    tabard: { r: 'sky', band: 2 },                                   // 天青罩袍（承接长枪兵的飞行夹克）
    gold: 'gold', shaft: 'iron', belt: 'leather', flag: 'crimson', skin: 'skin', ink: { r: 'ink', flat: 1 },
    drill: [28, 30, 31, 21],                                         // 钻头（steel 亮段）
    eye: { r: [39, 23, 22, 21], flat: 1 },                           // 盔缝眼光
    lit: { r: [14, 5, 51, 21], flat: 1 },                            // 钻头螺纹发光（发光体）
  });
  const BODY = { body: 'heroic', fall: 'front' };
  const LANCE = { len: 14, cone: [4, 4, 3, 2, 1], metal: M.drill, shaft: M.shaft, band: M.gold, motor: M.gold, chim: 4 };
  const HX = 68, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(92, 64, 44, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 13, 20], rimRamp: EL, flash: 0, dq: 0, rimAll: 0, skip: new Uint8Array(256) };
  for (const k of ['shaft', 'eye', 'lit', 'flag']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  // 镀金换色：只动链甲 / 板甲的像素（钢 27–31 → 金），上升的那一行亮一档；gw = 施放第 1 帧的金白闪
  const GILD = new Int16Array(64).fill(-1), GEDGE = new Int16Array(64).fill(-1), GWHITE = new Int16Array(64).fill(-1);
  [[27, 20], [28, 61], [29, 14], [30, 62], [31, 51]].forEach(([a, b]) => { GILD[a] = b; });
  [[27, 61], [28, 62], [29, 51], [30, 51], [31, 21]].forEach(([a, b]) => { GEDGE[a] = b; });
  [[27, 14], [28, 62], [29, 51], [30, 21], [31, 21]].forEach(([a, b]) => { GWHITE[a] = b; });
  const GMAT = new Uint8Array(256); for (const k of ['chain', 'plate']) { GMAT[M[k]] = 1; GMAT[M[k + 'D']] = 1; }

  // ───── 姿势：前手 hx hy a（握枪）、后手 bhx bhy；lb = 握点后的杆长（拄地时让枪尾落在地面）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lb: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, gild: 0, gw: 0, fan: 0, spin: 0, lit: 0, crack: 0, helm: 0, oh: 0, two: 0, kit: 0,
    st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -15, 0, -4, -9, 0, 0, 0);                    // 拄枪站立
  const K_MARCH = K(7, -16, 0, -3, -10, 0, 0, 0);                  // 行军：枪竖着提在身前
  const K_WIND = K(2, -12, HALF, -3, -12, -1, 0, 1);               // 后撤半步，枪收到腰侧平端
  const K_THRUST = K(6, -10, HALF, 1, -10, 1, 1, 2);               // 弓步低刺
  const K_HOLD = K(5, -10, HALF, 0, -10, 1, 0, 2);
  const K_CHARGE = K(8, -14, 0, 4, -12, 0, 0, 2);                  // 扎马、双手按住顿地的枪
  const K_CAST = K(8, -15, 0, 4, -13, 0, -1, 1);
  const K_HURT = K(6, -14, -0.2, -5, -10, -1, -1, 0);
  const K_STIFF = K(8, -15, 0.3, -3, -10, 2, 1, 0);                // 僵直前倾
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B_, q) => E.mix(P, A, B_, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -16, 15], ['bhy', -32, 0], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 3], ['lb', 0, 20], ['two', 0, 1]]);
  const KEY2 = parts.keyer([['gild', 0, 40], ['gw', 0, 1], ['fan', 0, 1], ['spin', 0, 2], ['lit', 0, 2], ['crack', 0, 1], ['helm', 0, 3], ['oh', 0, 1], ['kit', 0, 1], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['beard', -3, 3], ['sway', -2, 2], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['bob', 0, 1], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1]]);
  const SWAY = [0, 1, 0, -1];
  const T_HIT = 2 / 12, T_THUMP = 0.25, T_LAND = INCOMING + 8 / 12, GILD_TOP = 36;
  const HELM_AT = [null, { at: [22, -20], rot: 1 }, { at: [26, -8], rot: 0 }, { at: [29, -7], rot: 0 }];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    P.bob = 0; P.step = 0; P.wup = 0; P.walk = 0; P.gild = 0; P.gw = 0; P.fan = 0; P.spin = 0; P.lit = 0; P.crack = 0; P.helm = 0; P.oh = 0; P.two = 0; P.kit = 0; P.lb = -1;
    const idle = () => {                                               // 拄枪呼吸；循环末尾拇指按一下马达开关：钻头空转一圈、螺纹亮、冒一口烟
      setK(K_IDLE, K_IDLE, 0); const b = FL(TT * 2.5); P.bob = b & 1; P.beard = SWAY[(b + 1) & 3]; P.sway = SWAY[FL(TT * 1.25) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.5 && lp < 2.0) { const k = FL((lp - 1.5) * 12); P.hy -= 1; P.head = -1; P.spin = k % 3; P.lit = k < 4 ? 2 : 1; P.glint = k === 1 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 行军：步子齐整，枪竖着提在身前，链甲裙摆
      setK(K_MARCH, K_MARCH, 0); const f = E.gait(tq); parts.gait(P, f); P.hy += P.bob; P.bhy += P.bob; P.bhx += P.step;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; P.lb = 12;
    } else if (st === ATTACK) {
      P.two = 1; P.lb = 15;
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.1))); P.bx = -1; P.beard = 1; P.sway = 1; }
      else if (tq < 0.2) { setK(K_THRUST, K_THRUST, 0); P.bx = 4; P.beard = -2; P.sway = -2; P.lit = 2; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_THRUST, K_HOLD, q); P.bx = RD(4 - q); P.beard = -1; P.sway = -1; P.spin = f12 % 3; P.lit = tq < 0.42 ? 2 : 0; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); P.two = q < 0.5 ? 1 : 0; P.lb = -1; }
    } else if (st === CHARGE) {                                        // 扎马顿枪，链甲从脚往上一圈圈亮成金色
      const q = ease.inOut(clamp01(tq / 0.25)); setK(K_IDLE, K_CHARGE, q); P.two = q > 0.5 ? 1 : 0;
      P.gild = Math.min(GILD_TOP, 3 * FL(tq * 6)); P.fan = tq > 0.3 ? 1 : 0; P.rim = 2; P.beard = -1 - (tq > 1.1 && (f12 & 1) ? 1 : 0); P.sway = (f12 & 1) && tq > 0.7 ? 1 : 0;
    } else if (st === CAST) {                                          // 全身闪金白 1 帧 → 整身金甲
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.two = 1; P.gild = GILD_TOP + 4; P.gw = tq < 1 / 12 ? 1 : 0; P.fan = 1; P.rim = 3; P.beard = -2; P.sway = -1;
    } else if (st === RECOVER) {                                       // 金纹从头往脚褪回钢色，扇叶收拢
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.two = q < 0.5 ? 1 : 0;
      P.gild = RD((GILD_TOP + 4) * (1 - clamp01(tq / 0.55))); P.fan = tq < 0.3 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 甲面裂出金纹 → 僵直前倾 → 前扑倒地，头盔飞出 → 落地碎成金属块（死亡套件 chunks）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crack = d > 0.1 ? 1 : 0; }
      else if (d < 0.5) { setK(K_STIFF, K_STIFF, 0); P.bx = -1; P.eyes = 1; P.crack = 1; P.beard = -1; }
      else if (d < T_LAND - INCOMING - 1e-6) { setK(K_IDLE, K_IDLE, 0); P.lying = 1; P.bx = -1; P.eyes = 1; P.crack = 1; P.lift = d < 0.58 ? 3 : 1; P.helm = d < 0.58 ? 1 : 2; }
      else { setK(K_IDLE, K_IDLE, 0); P.oh = 1; P.helm = d < 0.75 ? 2 : 3; P.lying = 1; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }   // 之后死亡套件接管身体，精灵里只剩滚开的头盔
    } else if (st === REVIVE) {
      idle();
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const cr = Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + cr + (st === IDLE || st === REVIVE || (st === HURT && tq < INCOMING) ? P.bob : 0); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + cr;
    P.a = RD(P.a / ASTEP) * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lb < 0) P.lb = Math.abs(P.a) < 0.3 ? Math.max(0, 1 - P.hy) : 15;   // 竖着拄地：枪尾正好落在地面
    if (P.lying || P.oh) { P.gx = 8 + P.bx; P.gy = -3; }
    else if (P.gild > 0 || st === CHARGE) { P.gx = P.bx; P.gy = -16; }   // 技能：光从胸口往外（整圈外沿）
    else { const g = lanceGeo(Object.assign({ at: [P.hx, P.hy], a: P.a, back: P.lb }, LANCE)); P.gx = g.tip[0] + P.bx; P.gy = g.tip[1] - 1; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  function ldir(a) { const di = parts.snapDir(a), c = parts.cell(di, 0, 0, 8); return { di, sx: Math.sign(c[0]), sy: Math.sign(c[1]), maj: Math.max(Math.abs(c[0]), Math.abs(c[1])) / Math.hypot(c[0], c[1]) }; }
  function lanceGeo(o) {
    const D = ldir(o.a), x0 = D.sx < 0 ? o.at[0] - 1 : o.at[0], y0 = D.sy < 0 ? o.at[1] - 1 : o.at[1], n = RD(o.len * D.maj), bk = RD(o.back * D.maj);
    return { D, x0, y0, n, bk, tip: parts.cell(D.di, x0, y0, n + o.cone.length - 1), socket: parts.cell(D.di, x0, y0, n - 1) };
  }
  // 候选部件：drillLance 钻头长枪（同 Pikeman.js）——吸附斜率的杆 + 三道箍 → 可选马达壳（套口后 3 格、宽 4）+ 排气小烟囱（chim = 相对枪向的转向档，4 = 顺时针 90°）
  // → 锥形螺旋钻头（cone 宽度表，3 道斜螺纹随 spin 错位，lit 1–2 发光）。两个部件：杆 + 马达壳 → 钻头
  function drillLance(R, o) {
    const T = o.free ? parts.FREE : R, G = lanceGeo(o), di = G.D.di, x0 = G.x0, y0 = G.y0, n = G.n, sp = o.spin || 0, lit = o.lit || 0;
    E.part();
    parts.bar(di, x0, y0, -G.bk, n - 1, 1, (k, j, X, Y) => { const b = k === -G.bk || k === 2 || k === n - 4; PX(E, T, X, Y, b ? o.band : o.shaft, b ? 4 : 3); });
    if (o.motor) {
      parts.bar(di, x0, y0, n - 3, n - 1, 4, (k, j, X, Y) => PX(E, T, X, Y, o.motor, j === 0 ? 4 : j === 3 ? 2 : k === n - 2 && j === 2 ? 1 : 3));
      const c = parts.cell(di, x0, y0, n - 2), pd = (di + (o.chim || 12)) % 16; for (let s = 2; s <= 3; s++) { const q = parts.cell(pd, c[0], c[1], s); PX(E, T, q[0], q[1], M.shaft, s === 3 ? 4 : 3); }
    }
    E.part();
    const C = o.cone, L = C.length;
    for (let i = 0; i < L; i++) {
      const k = n + i, w = C[i], last = i === L - 1;
      parts.bar(di, x0, y0, k, k, w, (kk, j, X, Y) => {
        let m = o.metal, t = last ? 4 : w === 1 ? 3 : j === 0 ? 4 : j === w - 1 ? 2 : 3;
        if (!last && w > 1 && ((i + j + sp) % 3) === 0) { if (lit) { m = M.lit; t = lit >= 2 ? 4 : 2; } else t = 1; }
        PX(E, T, X, Y, m, t);
      });
    }
    if (o.glint) { const c = parts.cell(di, x0, y0, n + L); PX(E, T, c[0], c[1], M.lit, 4); }
    return G;
  }
  // 候选部件：rotorPack 背负箱（同 Pikeman.js，这里是板甲色）
  function packGeo(R) { const e = parts.edges(R, R.yS + 3), bx = e[0], top = R.yS - 1; return { bx, top }; }
  function rotorPack(R, g, m) {
    E.part(); const bx = g.bx, top = g.top;
    for (let y = top; y <= top + 7; y++) RUN(E, R, y, bx - 4 + (y === top || y === top + 7 ? 1 : 0), bx, m, 0);
    PX(E, R, bx - 3, top + 1, M.gold, 4); PX(E, R, bx - 3, top + 6, M.gold, 3);
    RUN(E, R, top + 3, bx - 2, bx - 1, m, 1); RUN(E, R, top + 5, bx - 2, bx - 1, m, 1);
  }
  // 候选部件：foldBlades 折叠扇叶——背包上两扇竖立的长扇叶（3 格宽，外沿一列 edge 材质、根部金铆钉、尖端收成 1 格），像一对金属背旗；
  // 远侧那扇暗一级、更高、更靠前；fan 1 = 张开（两扇的尖各往外 1 格）。o = { base: [x, y], face, faceD, edge, edgeD, fan }。两个部件
  function foldBlades(R, o) {
    const [bx, by] = o.base, fan = o.fan || 0;
    const blade = (x0, y0, x1, y1, face, edge, outer) => {
      E.part(); const n = y0 - y1;
      for (let k = 0; k <= n; k++) {
        const y = y0 - k, q = k / n, cx = RD(x0 + (x1 - x0) * q), w = k >= n - 1 ? 0 : 1;
        for (let dx = -w; dx <= w; dx++) PX(E, R, cx + dx, y, dx === -outer * w && w ? edge : face, k === n ? 4 : 0);
        if (k > 2 && k < n - 2 && (k % 4) === 0) PX(E, R, cx, y, face, 2);   // 扇叶的横筋
      }
      PX(E, R, x0, y0 - 1, M.gold, 4);
    };
    blade(bx + 2, by, bx + 4 + fan, by - 11, o.faceD, o.edgeD, -1);   // 远侧：往前上
    blade(bx, by, bx - 3 - fan, by - 9, o.face, o.edge, 1);           // 近侧：往后上
  }
  // 候选部件：mailSkirt 链甲裙——腰带下一行到胯下 3 行，外扩 2 格（随 sway），逐格环纹（暗 / 基交替 + 每行一排亮环），下沿锯齿；可带罩袍下摆布片（cloth）
  function mailSkirt(R, o) {
    E.part(); const y0 = R.yWaist + 1, y1 = Math.min(-1, R.yHip + 3), sw = RD(P.sway || 0), span = Math.max(1, y1 - y0);
    for (let y = y0; y <= y1; y++) {
      const t = (y - y0) / span, e = parts.edges(R, Math.min(y, R.yHip)), s = RD(sw * t), L = RD(e[0] - 2 * t) + s, Rr = RD(e[1] + 2 * t) + s;
      for (let x = L; x <= Rr; x++) { if (y === y1 && ((x - s) & 1)) continue; PX(E, R, x, y, o.mat, (((x * 2 + y) & 3) === 0) ? 4 : ((x + y) & 1) ? 2 : 3); }
    }
    if (o.cloth) { const m = RD((parts.edges(R, y0)[0] + parts.edges(R, y0)[1]) / 2) + 1; for (let y = y0; y <= y1 + 1 && y <= 0; y++) { const s = RD(sw * (y - y0) / span); RUN(E, R, y, m - 1 + s, m + 1 + s, o.cloth, y === y1 + 1 ? 2 : 0); } }
  }
  // 候选部件：windVane 风向标（同 Pikeman.js），flags 2 = 杆两侧各一面旗（风向标冠）
  function windVane(R, x, y, dir, h, o) {
    E.part();
    for (let k = 1; k < h; k++) PX(E, R, x, y - k, o.pole, k === 1 ? 2 : 3);
    const ay = y - h, b = RD(P.beard || 0);
    RUN(E, R, ay, x - 2, x + 2, o.pole, 3); PX(E, R, x + 2 * dir, ay - 1, o.pole, 4); PX(E, R, x + 2 * dir, ay + 1, o.pole, 2); PX(E, R, x + 3 * dir, ay, o.pole, 4);
    PX(E, R, x - 3 * dir, ay - 1, o.pole, 3); PX(E, R, x - 3 * dir, ay + 1, o.pole, 2);
    const fl = (s) => { PX(E, R, x - s, ay + 2, o.flag, 4); PX(E, R, x - 2 * s, ay + 2, o.flag, 3); PX(E, R, x - s, ay + 3, o.flag, 2); if (b) PX(E, R, x - 3 * s, ay + 2 + (b > 0 ? 1 : 0), o.flag, 3); };
    fl(dir); if (o.flags === 2) fl(-dir);
  }
  const CRK = [[0, 0], [1, 1], [1, 2], [2, 3]];
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    if (P.oh) { if (P.helm) parts.helm(E, R, P, Object.assign({ style: 'great', mat: M.plate, trim: M.gold }, HELM_AT[P.helm])); return; }
    if (R.lie) drillLance(R, Object.assign({}, LANCE, { at: [-2, -1], a: HALF, back: 15, free: 1 }));   // 枪先落在身下
    if (!R.lie) { const g = packGeo(R); foldBlades(R, { base: [g.bx - 3, g.top], face: M.plate, faceD: M.plateD, edge: M.tabard, edgeD: M.tabardD, fan: P.fan }); rotorPack(R, g, M.plate); }
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, hand: M.plateD, grip: P.two ? 'none' : 'fist' });
    parts.legs(E, R, P, { style: 'greave', mat: M.plate, matD: M.plateD });
    parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.tabard, belt: M.belt, buckle: M.gold, hem: R.yWaist });
    mailSkirt(R, { mat: M.chain, cloth: M.tabard });
    if (P.crack) { E.part(); const ys = [R.yS + 2, R.yS + 5]; for (let i = 0; i < 2; i++) { const x = parts.edges(R, ys[i])[0] + 2 + i * 2; for (const [dx, dy] of CRK) PX(E, R, x + dx, ys[i] + dy, M.gold, 4); } }
    parts.head(E, R, P, { mat: M.skin, face: 'square', eye: M.ink, nose: 'small', mouth: 'line', ear: 'dot' });
    if (!P.helm) {
      parts.helm(E, R, P, { style: 'great', mat: M.plate, trim: M.gold, eye: M.eye });
      if (P.crack) { E.part(); PX(E, R, R.hx - 1, R.htop, M.gold, 4); PX(E, R, R.hx, R.htop + 1, M.gold, 4); PX(E, R, R.hx, R.htop + 2, M.gold, 3); }
      windVane(R, R.hx, R.htop - 1, 1, 5, { pole: M.gold, flag: M.flag, flags: 2 });
    } else if (!P.kit) parts.helm(E, R, P, Object.assign({ style: 'great', mat: M.plate, trim: M.gold }, HELM_AT[P.helm]));
    if (!R.lie) {
      drillLance(R, Object.assign({}, LANCE, { at: [P.hx, P.hy], a: P.a, back: P.lb, spin: P.spin, lit: P.lit, glint: P.glint }));
      if (P.two) parts.hand(E, R, P, { side: 'B', hand: M.plateD });
    }
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, pauldron: M.plate, trim: M.gold, hand: M.plate });
  }
  function gildRemap() {                                               // 候选部件：gildRemap 烘焙后按行换色（镀金 / 金白闪），只动链甲、板甲
    if (!P.gild && !P.gw) return;
    const s = hero, w = s.w, out = s.out, mat = s.mat, line = s.oy - P.gild;
    for (let y = Math.max(0, line); y < s.h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, c = out[i]; if (c === 255 || !GMAT[mat[i]] || c > 63) continue;
      const m = P.gw ? GWHITE[c] : y <= line + 1 ? GEDGE[c] : GILD[c]; if (m >= 0) out[i] = m;
    }
  }
  function bakeHero() {
    const sk = P.gild > 0 || P.st === CHARGE; RIM.rim = P.rim; RIM.rimAll = sk ? 1 : 0; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy;
    RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); gildRemap();
  }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  let domeT = 9, hitT = 9, hitX = 0, hitY = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, drillAcc = 0;
  const DRX = 16, DRY = 21, DCY = -16;
  function onEnter(s) {
    if (s !== CAST) return;
    domeT = 0; hitT = 9;
    burst(wx(0), HY - 2, 20, 40, 110, 0.25, 0.6, R_EL, 20); ring(wx(0), HY - 1, 1, R_EL);
    const tx = wx(5); shoot(1, tx + 300 * 0.25, HY - 18, -300, tx, FXI.enemy);   // 敌弹 0.25 秒后打在身上
    flash(0.05); shake(0.28, 2); sfx('impact', { pal: 'holy', w: 0.8 });
  }
  function dust(x, n, sp) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * sp, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      hitDummy(0); const x = Math.min(wx(P.gx), 95), y = wy(P.gy); burst(x, y, 12, 40, 110, 0.15, 0.35, R_IMP, 10); fx.cross(x, y, 4, R_IMP, 0.2);
      sfx('swing', { kind: 'thrust', w: 0.7 }); sfx('hit', { mat: 'metal', w: 0.7 });
    }
    if (s === CHARGE && Math.abs(t - T_THUMP) < 1e-9) { dust(wx(8), 8, 30); shake(0.1, 1); }   // 枪顿地
    if (s === IDLE && Math.abs(t - 1.75) < 1e-9) { const c = lanceGeo(Object.assign({ at: [P.hx, P.hy], a: P.a, back: P.lb }, LANCE)).socket; for (let i = 0; i < 4; i++) spawnX(K_RISE, wx(c[0] + 1 + P.bx), wy(c[1]), 4 + Math.random() * 6, -10 - Math.random() * 6, 0.7 + Math.random() * 0.3, FXI.dust, { age0: 0.2 }); }   // 马达冒一口烟
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {                 // 落地一瞬间碎成金属块
      poseAt(DEATH, T_LAND - 1 / 12, T_LAND - 1 / 12); P.lift = 0; P.helm = 2; P.kit = 1; P.k1 = KEY1(P); P.k2 = KEY2(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 3, power: 0.9, fromX: 10, fromY: -4, push: 10, fadeAt: 1.0, fadeDur: 0.6 });
      for (let i = 0; i < 18; i++) spawnX(K_PHYS, HX - 4 + Math.random() * 26, HY - 3 - Math.random() * 4, (Math.random() - 0.5) * 70, -30 - Math.random() * 50, 0.9 + Math.random() * 0.5, R_ST, { g: 160, floor: HY });   // 崩散的链甲环
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 6 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.14, 1); sfx('fall', { w: 0.8 });
    }
  }
  const EVENTS = [[1.75], [], [T_HIT], [T_THUMP], [], [], [], [T_LAND], []];
  function impactOn(k, x, y) {                                         // 敌弹打在金甲上：只溅金火花，不退
    if (k !== 1) return;
    hitT = 0; hitX = x; hitY = y;
    burst(x, y, 14, 50, 110, 0.15, 0.4, R_EL, 10); fx.cross(x, y, 5, R_EL, 0.2); shake(0.12, 1);
    sfx('impact', { pal: 'metal', w: 0.6 });
  }
  function hurtFx(s) {                                                 // 金属：更多火花 + 几颗长寿命白火星
    const hx = HX + 2, hy = HY - 17; burst(hx, hy, s === DEATH ? 26 : 22, 60, 150, 0.2, 0.5, R_IMP, 20); burst(hx, hy, 4, 60, 120, 0.6, 0.9, R_ST, 30);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.7 }); dust(wx(P.step > 0 ? 5 : -4), 2, 16); } lastStep = P.step; }
    if (state === CHARGE && P.gild > 0) {                              // 金色光点沿着正在镀金的那一行往上飘
      emberAcc += dt * 18; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(-5 + Math.random() * 11), wy(-P.gild), (Math.random() - 0.5) * 6, -10 - Math.random() * 8, 0.5 + Math.random() * 0.3, R_EL); }
    }
    if (state === ATTACK && stT > T_HIT && stT < 0.42) {                 // 钻头在目标身上连转：连续小火花
      drillAcc += dt * 45; while (drillAcc >= 1) { drillAcc -= 1; spawnX(K_PHYS, Math.min(wx(P.gx), 95), wy(P.gy), -20 - Math.random() * 50, -40 + Math.random() * 50, 0.2 + Math.random() * 0.15, R_ST, { g: 140 }); }
    }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 4 + Math.random() * 30, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, R_EL); } }
    domeT += dt; hitT += dt;
  }
  function fxReset() { domeT = 9; hitT = 9; emberAcc = 0; soulAcc = 0; lastStep = 0; drillAcc = 0; }
  // 六角格：中心 (6i + 3·(j 奇), 5j)，到最近两个中心的距离差 < 0.9 的像素是格线
  function hexEdge(x, y) {
    const j0 = Math.round(y / 5); let d1 = 1e9, d2 = 1e9, ci = 0, cj = 0;
    for (let j = j0 - 1; j <= j0 + 1; j++) { const ox = (j & 1) * 3, i0 = Math.round((x - ox) / 6); for (let i = i0 - 1; i <= i0 + 1; i++) { const d = Math.hypot(x - (6 * i + ox), (y - 5 * j) * 1.15); if (d < d1) { d2 = d1; d1 = d; ci = i; cj = j; } else if (d < d2) d2 = d; } }
    return { e: d2 - d1 < 0.9, ci, cj };
  }
  function drawDome(f12, front) {
    if (domeT >= 1.05 || P.dq >= 1) return;
    const cx = wx(0), cy = HY + DCY, close = clamp01(domeT / 0.17), fade = clamp01((domeT - 0.6) / 0.4);
    const hc = hitT < 0.17 ? hexEdge(hitX - cx, hitY - cy) : null;
    for (let y = RD(cy - DRY); y <= HY; y++) {
      const v = (y - cy) / DRY; if (Math.abs(v) > 1) continue; const hw = DRX * Math.sqrt(1 - v * v);
      if (y < cy - DRY + 2 * DRY * fade) continue;                     // 收招：从上往下断开
      for (let x = RD(cx - hw); x <= RD(cx + hw); x++) {
        const u = Math.abs(x - cx) / DRX; if (u < 1 - close - 1e-6) continue;   // 施放：从两侧往中间合拢
        const rim = hw - Math.abs(x - cx) < 1;
        if (front && rim) { if (((x + y + f12) & 1) === 0) put(x, y, domeT < 1 / 12 ? EL[0] : EL[1]); continue; }
        if (front && (domeT > 0.45 || ((x + y) & 1))) continue;          // 身前那一层：刚合拢时隔点画格线，之后只留身后一层
        const h = hexEdge(x - cx, y - cy); if (!h.e) continue;
        if (fade > 0 && ((x + y + f12) & 1)) continue;
        let c = domeT < 1 / 12 ? EL[0] : EL[3];
        if (hc && h.ci === hc.ci && h.cj === hc.cj) c = EL[0];
        put(x, y, c);
      }
    }
    if (front && hc) { const pts = []; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const h = hexEdge(hitX - cx + dx, hitY - cy + dy); if (h.e && h.ci === hc.ci && h.cj === hc.cj) put(hitX + dx, hitY + dy, EL[0]); } void pts; }   // 被打的那一格闪白
  }
  function fxBack(f12) { if (!P.lying && !P.oh && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); drawDome(f12, false); }
  function fxFront(f12) { drawDome(f12, true); }

  return {
    name: '链甲枪兵', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.lit], HIT_POINT: [3, -17], EVENTS, deathKit: { mode: 'chunks', at: T_LAND },
    SFX: { body: 'armor', how: 'shatter', pal: 'holy', style: 'shield', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxFront,
  };
});
