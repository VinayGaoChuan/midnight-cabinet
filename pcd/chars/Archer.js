// 骸骨弓手（部队 · 骷髅 · 射手 · 普通）：逃兵升级而来的猫腰骷髅猎手——同一顶凹陷破锅盔（盔沿插着 3 根备用箭羽）、腰侧挂一只冒火的陶火罐、
// 一张缠破布的粗糙短猎弓（蓝军旗布条改系在上弓梢）、背后断箭仍在、旁边一只插满箭的破箭袋。
// 攻击 = 箭头在火罐里一蘸，仰角抛射一支火箭（弧线落到目标）；技能 = 特性「火焰箭」：箭深插火罐窜起火柱 → 拉满仰射大火箭 → 从上往下扎进目标、整个点燃。
PCD.define('Archer', (E) => {
  const { parts, Sprite, bake, begin, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, INCOMING, DUMMY_X, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST, K_TRAIL,
    spawn, burst, releaseOrbit, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, px = parts.px;

  // ───── 元素：燃烧箭 · 炉火橙（FXI.fire：白 → 淡黄 → 橙 → 红 → 深红）─────
  const R_EL = FXI.fire, EL = FXR[R_EL], DU = FXR[FXI.dust];

  const M = parts.mats(E, {
    hide: 'leather', bone: [8, 7, 6, 5], helm: 'iron', rust: [0, 20, 19, 32], flag: 'blue', gold: 'gold', strap: 'wood',
    bow: [0, 20, 19, 32], rag: 'sand', string: 'white', shaft: 'wood', head: 'steel', fletch: 'white', quiver: 'boot', qtrim: 'iron', qfletch: 'crimson',
    jar: 'crimson', ink: { r: 'ink', flat: 1 }, eye: { r: [35, 36, 37, 38], flat: 1 }, fire: { r: [45, 46, 47, 21], flat: 1 }, fire2: { r: [46, 47, 51, 21], flat: 1 },
  });
  const BODY = { body: 'slim', leg: 10, sw: 3, lw: 2, stride: 3, headX: 1 };   // 瘦高档：腿比逃兵长 1 格、肩窄，猫腰站
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(60, 46, 28, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['ink', 'eye', 'fire', 'fire2', 'shaft', 'fletch', 'string', 'bow', 'rag', 'flag', 'gold', 'head']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 弓身握把（hx, hy），后手 = 搭箭 / 拉弦 / 去火罐里蘸箭（bhx, bhy）；aim 1 = 仰角（1:2）；pull 0–3 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqk: 0, st: 0, aim: 0, pull: 0, arw: 0, dip: 0, flare: 0, orange: 0, jarTip: 0, burn: 0, noHelm: 0, jaw: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, crouch, aim, pull) => ({ hx, hy, bhx, bhy, lean: lean || 0, crouch: crouch || 0, aim: aim || 0, pull: pull || 0 });
  const JAR = [5, -8];                                                   // 火罐口（蓄力姿之外按 rig 算，这里是蘸箭时后手的落点）
  const K_IDLE = K(7, -14, 5, -14, 1, 1);                                // 猫腰：弓竖在身前，箭松松地搭在弦上
  const K_DIPA = K(7, -13, 5, -15, 1, 2);                                 // 蘸箭：后手把箭头伸进火罐
  const K_DRAW = K(7, -16, 1, -13, -1, 1, 1, 3);                         // 仰角拉满
  const K_LOOSE = K(7, -16, -1, -15, -1, 1, 1, 0);                       // 松弦：后手往后弹开
  const K_HOLD = K(7, -15, 0, -14, 0, 1, 1, 0);
  const K_DIPS = K(7, -13, 5, -14, 1, 2);                                 // 技能：箭深深插进火罐
  const K_AIM = K(7, -17, 1, -14, -1, 1, 1, 3);                          // 技能：仰角拉满不放
  const K_SHOT = K(7, -17, -2, -16, -1, 1, 1, 0);
  const K_HURT = K(4, -12, 2, -11, -1, 0);
  const K_KNEEL = K(5, -9, 3, -8, 1, 4);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'crouch', 'aim', 'pull'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 20], ['hy', -30, 5], ['bhx', -16, 20], ['bhy', -30, 5], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8],
    ['step', -1, 1], ['wup', 0, 2], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['dqk', 0, 48], ['st', 0, 8],
    ['aim', 0, 1], ['pull', 0, 3], ['arw', 0, 1], ['dip', 0, 1], ['flare', 0, 3], ['orange', 0, 1], ['jarTip', 0, 1], ['burn', 0, 30], ['noHelm', 0, 1], ['jaw', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_LOOSE = 2 / 12, T_KNEEL = INCOMING + 0.45, T_HELM = INCOMING + 1.3, T_LAND = INCOMING + 1.55;
  // 箭头位置（本地坐标）：平射 = 握把前 5 格；仰角 = 沿 2:1 往前上 (4, -2)
  const headOf = () => (P.aim ? [P.hx + 4, P.hy - 2] : [P.hx + 5, P.hy]);

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.head = 0; P.arw = 1; P.dip = 0; P.flare = 0; P.orange = 0; P.jarTip = 0; P.burn = 0; P.noHelm = 0; P.jaw = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.flare = (f12 >> 1) & 1;                                          // 罐口火苗一跳一跳
      const lp = tq % DUR[IDLE];                                          // 待机个性（1.6–2.1 s）：把一支箭伸进火罐蘸一下，火苗往上窜一格，再收回搭在弦上
      if (lp >= 1.6 && lp < 2.1) { const f = Math.floor((lp - 1.6) * 12 + 1e-6); if (f >= 1 && f <= 3) { setK(K_DIPA, K_DIPA, 0); P.arw = 0; P.dip = 1; P.flare = f === 2 ? 3 : 2; P.head = 1; } else if (f === 4) { setK(K_DIPA, K_IDLE, 0.5); P.arw = 0; P.dip = 1; P.flare = 1; } }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 猫腰潜行：膝盖弯、上身压低，火罐随步晃
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.crouch = 2; P.lean = 1; P.hx += P.step; P.bhx += P.step; P.flare = P.wup ? 2 : 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12) { setK(K_DIPA, K_DIPA, 0); P.arw = 0; P.dip = 1; P.flare = 3; P.gem = 1; }
      else if (tq < T_LOOSE) { setK(K_DRAW, K_DRAW, 0); P.gem = 1; P.beard = 1; P.flare = 1; }
      else if (tq < 0.25) { setK(K_LOOSE, K_LOOSE, 0); P.arw = 0; P.beard = -2; P.sway = -1; P.flare = 1; }
      else if (tq < 0.45) { setK(K_LOOSE, K_HOLD, ease.out((tq - 0.25) / 0.2)); P.arw = 0; P.beard = -1; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.arw = tq > 0.6 ? 1 : 0; }
    } else if (st === CHARGE) {                                          // 箭深插火罐（火柱窜起）→ 仰角拉满 3 帧以上，余烬从箭头飘升，眼窝火变橙
      P.orange = 1; P.rim = 2;
      if (tq < 0.4) { setK(K_IDLE, K_DIPS, ease.out(clamp01(tq / 0.15))); P.arw = 0; P.dip = 1; P.flare = 3; P.gem = 1; P.jaw = f12 & 1; }
      else { const q = ease.inOut(clamp01((tq - 0.4) / 0.3)); setK(K_DIPS, K_AIM, q); P.pull = tq < 0.5 ? 1 : tq < 0.6 ? 2 : 3; P.flare = 1; P.gem = tq < 0.8 ? 1 : ((f12 & 1) ? 2 : 1); P.beard = q > 0.9 && (f12 & 1) ? 1 : -1; P.sway = q > 0.5 ? ((f12 & 1) ? -1 : 0) : 0; }
    } else if (st === CAST) {
      P.orange = 1;
      if (tq < 2 / 12) { setK(K_SHOT, K_SHOT, 0); P.arw = 0; P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.flare = 3; }
      else { setK(K_SHOT, K_HOLD, ease.out(clamp01((tq - 2 / 12) / 0.25))); P.arw = 0; P.beard = -1; P.gem = 2; P.rim = 2; P.flare = 2; }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_HOLD, K_IDLE, q); P.arw = q > 0.5 ? 1 : 0; P.orange = q < 0.5 ? 1 : 0; P.rim = q < 0.4 ? 1 : 0; P.flare = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.arw = 0; P.flare = 3; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.beard = 1; P.arw = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 化灰：挨打 → 火罐打翻 → 跪倒 → 火从脚往上把骨架烧成灰 → 破锅盔最后落地
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.25) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.arw = 0; P.crouch = d < 0.12 ? 0 : 1; }
      else if (d < T_KNEEL - INCOMING) { setK(K_HURT, K_KNEEL, 0.5); P.bx = -1; P.crouch = 2; P.eyes = 1; P.jaw = f12 & 1; P.arw = 0; P.jarTip = 1; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.eyes = 1; P.arw = 0; P.jarTip = 1; P.jaw = 1;
        if (d >= 0.55) P.burn = Math.min(30, RD(26 * (d - 0.55) / 0.95));
        if (d >= T_HELM - INCOMING) P.noHelm = 1;
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.aim = P.aim > 0.5 ? 1 : 0;
    P.lean = RD(P.lean); P.crouch = RD(P.crouch); P.pull = RD(P.pull); P.dqk = RD(P.dq * 48);
    const h = headOf(); P.gx = h[0] + P.bx; P.gy = h[1];                  // 发光体 = 蘸过火的箭头
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function backArrow(R, o) {                                            // 候选部件：backArrow（见 Deserter.js）
    E.part(); const e = parts.edges(R, R.yS + 6)[0], x = e + 2, y = R.yS + 6, L = o.len, tx = x - L - 2, ty = y - RD((L + 2) / 2);
    parts.line(E, R, x, y, tx, ty, o.shaft, 3); px(E, R, tx - 1, ty - 1, o.fletch, 4); px(E, R, tx - 1, ty, o.fletch, 3); px(E, R, tx, ty - 1, o.fletch, 3);
  }
  const EYE_LV = [[M.eye, 3], [M.eye, 4], [M.fire2, 3], [M.fire2, 4], [M.eye, 1]];
  function skull(R, o) {                                                // 候选部件：skull（见 Deserter.js）
    parts.head(E, R, P, { mat: o.mat, face: 'gaunt', nose: 'none', mouth: 'none', ear: 'none' });
    const x1 = R.hx1, ey = R.ey, bot = R.hy, fx = (d) => x1 - d;
    px(E, R, fx(2), ey, o.ink, 1);
    const lv = o.orange ? [M.fire, o.gem >= 2 ? 4 : 3] : EYE_LV[o.gem] || EYE_LV[0];
    if (o.eyes) px(E, R, fx(1), ey, o.ink, 1); else px(E, R, fx(1), ey, lv[0], lv[1]);
    px(E, R, fx(1), ey + 1, o.mat, 1); px(E, R, fx(2), ey + 1, o.mat, 4);
    for (let d = 0; d <= 2; d++) px(E, R, fx(d), ey + 2, o.mat, (d & 1) ? 1 : 4);
    if (o.jaw) { px(E, R, fx(0), bot, o.ink, 1); px(E, R, fx(1), bot, o.ink, 1); px(E, R, fx(0), bot + 1, o.mat, 3); px(E, R, fx(1), bot + 1, o.mat, 2); }
  }
  function run2(T, y, x0, x1, m) { for (let x = x0; x <= x1; x++) px(E, T, x, y, m, 0); }
  // 候选部件：dentPot（见 Deserter.js）+ quills：盔沿后面插的 3 根备用箭羽，向后上方翘出 3 格
  function dentPot(T, a, b, top, o) {
    E.part(); const m = o.mat, r = o.rust;
    for (let i = 0; i < 3; i++) { const x = a + 1 - i, y = top - 1 + (i === 1 ? -1 : 0); px(E, T, x, y, o.shaft, 3); px(E, T, x - 1, y - 1, o.shaft, 3); px(E, T, x - 2, y - 2, o.fletch, 4); px(E, T, x - 2, y - 1, o.fletch, 2); }
    E.part();
    run2(T, top - 2, a + 2, b - 1, m); run2(T, top - 1, a + 1, b, m); px(E, T, a + 1, top - 1, m, 1); px(E, T, a + 2, top - 2, m, 2);
    run2(T, top, a - 1, b + 2, m); px(E, T, b + 2, top, m, 4);
    run2(T, top + 1, a - 3, a, m); px(E, T, a - 3, top + 2, m, 0);
    px(E, T, b - 1, top - 2, m, 4); px(E, T, b - 2, top - 1, r, 3); px(E, T, a - 1, top, r, 2);
  }
  // 候选部件：fireJar —— 腰侧挂的陶火罐（带提梁，向前凸出 3 格），罐口火苗是发光体（flare 0–3 档高）；tip 1 = 打翻躺在脚前、火洒一地
  function fireJar(R, o) {
    const e = parts.edges(R, R.yWaist + 1)[1], jx = e + 1 + RD((P.sway || 0) * 0.5), jy = R.yWaist + 1;
    E.part();
    if (o.tip) {                                                         // 打翻：横躺在脚前，罐口朝前
      const x0 = R.footFx + 3; run2(R, -3, x0 + 1, x0 + 3, o.mat); run2(R, -2, x0, x0 + 4, o.mat); run2(R, -1, x0, x0 + 4, o.mat); px(E, R, x0 + 5, -2, o.mat, 4); px(E, R, x0 + 1, -3, o.mat, 4);
      E.part(); px(E, R, x0 + 6, -1, o.fire, 3); px(E, R, x0 + 7, -1, o.fire, 2); px(E, R, x0 + 6, -2, o.fire, 4); return [x0 + 6, -1];
    }
    px(E, R, jx, jy - 1, o.strap, 3); px(E, R, jx + 1, jy - 2, o.strap, 3); px(E, R, jx + 2, jy - 2, o.strap, 3); px(E, R, jx + 3, jy - 1, o.strap, 3);   // 提梁
    run2(R, jy, jx + 1, jx + 2, o.mat); px(E, R, jx + 1, jy, o.mat, 4);
    for (let y = jy + 1; y <= jy + 3; y++) run2(R, y, jx, jx + 3, o.mat);
    run2(R, jy + 4, jx + 1, jx + 2, o.mat); px(E, R, jx + 3, jy + 2, o.mat, 2); px(E, R, jx, jy + 1, o.mat, 4);
    E.part(); const fl = o.flare;                                        // 罐口火苗（发光体）
    px(E, R, jx + 1, jy - 1, o.fire, 3); px(E, R, jx + 2, jy - 1, o.fire, 4);
    if (fl >= 1) px(E, R, jx + 2, jy - 2, o.fire, fl >= 2 ? 4 : 2);
    if (fl >= 2) px(E, R, jx + 1, jy - 3, o.fire2, 3);
    if (fl >= 3) { px(E, R, jx + 2, jy - 4, o.fire2, 4); px(E, R, jx + 1, jy - 2, o.fire2, 4); }
    return [jx + 1, jy - 1];
  }
  // 候选部件：tiltBow —— 能仰角（1:2）的短猎弓：弓臂按瞄准方向的法线排开、梢往回弯，弓臂缠两圈破布，上弓梢系一截会飘的蓝布条（金边）；弓 + 箭两个部件
  function tiltBow(R, o) {
    const G = [P.hx, P.hy], D = P.aim ? [2 / Math.sqrt(5), -1 / Math.sqrt(5)] : [1, 0], N = [-D[1], D[0]], L = o.len, bend = 1.4 + P.pull * 0.5;
    const pos = (r) => { const q = r / L; return [G[0] + N[0] * r - D[0] * bend * q * q, G[1] + N[1] * r - D[1] * bend * q * q]; };
    E.part(); let prev = pos(-L);
    for (let r = -L + 1; r <= L; r++) { const p = pos(r); parts.line(E, R, prev[0], prev[1], p[0], p[1], Math.abs(r) === 3 ? o.rag : o.wood, Math.abs(r) <= 1 ? 3 : 0); prev = p; }
    const A = pos(-L), B = pos(L); px(E, R, A[0], A[1], o.wood, 4); px(E, R, B[0], B[1], o.wood, 4);
    const nock = P.pull ? [P.bhx, P.bhy] : [RD((A[0] + B[0]) / 2), RD((A[1] + B[1]) / 2)];
    if (P.pull) { parts.line(E, R, A[0], A[1], nock[0], nock[1], o.string, 3); parts.line(E, R, nock[0], nock[1], B[0], B[1], o.string, 3); }
    else parts.line(E, R, A[0], A[1], B[0], B[1], o.string, 3);
    const b = RD(P.beard || 0), fa = [RD(A[0]), RD(A[1])];               // 上弓梢的破布条：往后飘，尾梢金边
    px(E, R, fa[0] - 1, fa[1], o.flag, 0); px(E, R, fa[0] - 2, fa[1] + (b > 0 ? 0 : 1), o.flag, 2); px(E, R, fa[0] - 3, fa[1] + 1 - (b > 1 ? 1 : 0), o.flag, 0); px(E, R, fa[0] - 4, fa[1] + 2 - (b > 0 ? 1 : 0) + (b < -1 ? -1 : 0), o.gold, 3);
    if (!o.arrow) return;
    E.part(); const h = headOf(), lit = P.gem >= 1 || P.flare >= 3 && P.dip;   // 箭：蘸过火之后箭头是发光体
    parts.line(E, R, nock[0], nock[1], h[0] - (P.aim ? 2 : 1), h[1] + (P.aim ? 1 : 0), o.shaft, 3);
    px(E, R, h[0], h[1], lit ? o.fire2 : o.head, lit ? (P.gem >= 2 ? 4 : 3) : 4); px(E, R, h[0] - 1, h[1] + (P.aim ? 0 : -1), lit ? o.fire : o.head, 3); if (!P.aim) px(E, R, h[0] - 1, h[1] + 1, lit ? o.fire : o.head, 2);
    px(E, R, nock[0] - 1, nock[1] - 1, o.fletch, 4); px(E, R, nock[0] - 1, nock[1] + 1, o.fletch, 2);
  }
  // 蘸箭：后手捏着一支箭，箭头朝下插进罐口
  function dipArrow(R, o) {
    E.part(); const x = P.bhx, y = P.bhy; px(E, R, x, y - 2, o.fletch, 4); px(E, R, x - 1, y - 2, o.fletch, 3); for (let k = -1; k <= 2; k++) px(E, R, x, y + k, o.shaft, 3); px(E, R, x, y + 3, o.fire2, P.flare >= 3 ? 4 : 3);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift, P.burn ? -P.burn : undefined); const R = parts.rig(P, BODY);
    parts.pack(E, R, P, { style: 'quiver', mat: M.quiver, trim: M.qtrim, fletch: M.qfletch });
    backArrow(R, { shaft: M.shaft, fletch: M.fletch, len: 2 });
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.boneD, grip: 'none' });
    parts.legs(E, R, P, { style: 'bare', mat: M.bone, matD: M.boneD });
    const tor = parts.torso(E, R, P, { style: 'leather', mat: M.hide, belt: M.strap, buckle: M.rust, strap: M.strap, hem: R.yHip + 4 });
    const L = tor.rows[0], Rr = tor.rows[1], hr = tor.hem - tor.y0;       // 破裙甲：下摆撕成一条一条
    for (let x = L[hr]; x <= Rr[hr]; x++) if (((x + 30) % 3) === 0) { px(E, R, x, tor.hem, 0); px(E, R, x, tor.hem - 1, M.hide, 1); }
    parts.scarf(E, R, P, { layer: 'wrap', mat: M.hide });
    skull(R, { mat: M.bone, ink: M.ink, eyes: P.eyes, gem: P.gem, orange: P.orange, jaw: P.jaw });
    if (!P.noHelm) dentPot(R, R.hx0, R.hx1, R.htop, { mat: M.helm, rust: M.rust, shaft: M.shaft, fletch: M.fletch });
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.bone, hand: M.bone });
    if (!P.jarTip || P.burn === 0) tiltBow(R, { wood: M.bow, rag: M.rag, string: M.string, shaft: M.shaft, head: M.head, fletch: M.fletch, fire: M.fire, fire2: M.fire2, flag: M.flag, gold: M.gold, len: 6, arrow: P.arw || P.pull > 0 });
    fireJar(R, { mat: M.jar, strap: M.strap, fire: M.fire, fire2: M.fire2, flare: P.flare, tip: P.jarTip });   // 火罐挂在近侧腰上，压在弓梢前面
    if (P.dip) dipArrow(R, { shaft: M.shaft, fletch: M.fletch, fire2: M.fire2 });
    parts.hand(E, R, P, { side: 'B', hand: M.bone });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  // 抛射火箭（自己算抛物线，引擎的弹道是直线）：k 1 = 普通火箭，2 = 技能大火箭
  const lob = { on: 0, k: 0, t: 0, T: 0, x0: 0, y0: 0, x1: 0, y1: 0, h: 0, acc: 0 };
  function launch(k, x0, y0, x1, y1, T, h) { lob.on = 1; lob.k = k; lob.t = 0; lob.T = T; lob.x0 = x0; lob.y0 = y0; lob.x1 = x1; lob.y1 = y1; lob.h = h; lob.acc = 0; }
  const lobAt = (u) => [lob.x0 + (lob.x1 - lob.x0) * u, lob.y0 + (lob.y1 - lob.y0) * u - lob.h * 4 * u * (1 - u)];
  function lobHit(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 80, 0.15, 0.35, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.17); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.25 }); }
    else { dummyFx({ dur: 1.3, tint: 'fire' }); fx.pillar(x, HY - 20, HY, 2, R_EL, 0.45); burst(x, y, 20, 50, 130, 0.25, 0.6, R_EL, 14); fx.cross(x, y, 5, R_EL, 0.25); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.55 }); }
  }
  const helmSpr = new Sprite(20, 10, 10, 6), HB = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };
  let helmOn = 0, helmX = 0, helmY = 0, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, burnAcc = 0, lastStep = 0, stepN = 0, lastPers = -1;
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);
    releaseOrbit(40, 90, 0.25, 0.5); launch(2, gx + 1, gy, DUMMY_X, HY - 14, 0.4, 20);
    mzT = 0; mzX = gx; mzY = gy; const R = parts.rig(P, BODY), jx = wx(parts.edges(R, R.yWaist + 1)[1] + 2), jy = wy(R.yWaist - 1);
    burst(jx, jy, 14, 30, 80, 0.2, 0.5, R_EL, 18); burst(gx, gy, 10, 40, 90, 0.15, 0.4, R_EL, 4);
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'fire' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_LOOSE) {
      const h = headOf(), gx = wx(h[0]), gy = wy(h[1]); mzT = 0; mzX = gx; mzY = gy;
      launch(1, gx + 1, gy, DUMMY_X - 1, HY - 12, 0.36, 12);
      sfx('swing', { kind: 'bow', w: 0.25 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === DEATH && t === T_KNEEL) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 6 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.4 + Math.random() * 0.3, FXI.dust); burst(wx(10), HY - 2, 10, 20, 60, 0.3, 0.6, R_EL, 16); sfx('fall', { w: 0.25 }); }
    if (s === DEATH && t === T_HELM) {                                   // 火烧到头：破锅盔掉下来（单独烤一张）
      const R = parts.rig(P, BODY); begin(helmSpr, 0, 0); dentPot(parts.FREE, -2, 2, 0, { mat: M.helm, rust: M.rust, shaft: M.shaft, fletch: M.fletch }); bake(helmSpr, HB);
      helmOn = 1; helmX = wx(R.hx + P.bx); helmY = wy(R.htop);
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 6; i++) spawn(K_DUST, helmX + 4 + (Math.random() - 0.5) * 8, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.35, FXI.dust); shake(0.08, 1); sfx('fall', { w: 0.2 }); }
  }
  const EVENTS = [[], [], [T_LOOSE], [], [], [], [], [T_KNEEL, T_HELM, T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (lob.on) {                                                        // 抛物线弹道：拖火尾，到点命中
      lob.t += dt; const u = clamp01(lob.t / lob.T), p = lobAt(u);
      lob.acc += dt * (lob.k === 2 ? 70 : 30); while (lob.acc >= 1) { lob.acc -= 1; spawn(K_TRAIL, p[0], p[1] + Math.random() * 2 - 1, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, lob.k === 2 ? 0.2 + Math.random() * 0.25 : 0.1 + Math.random() * 0.12, R_EL); }
      if (u >= 1) { lob.on = 0; lobHit(lob.k, lob.x1, lob.y1); }
    }
    if (state === CHARGE && stT > 0.4) { chargeAcc += dt * (10 + 20 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 7 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 2.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); } }
    if (state === CHARGE || state === CAST) { emberAcc += dt * (state === CHARGE && stT < 0.4 ? 22 : 8); while (emberAcc >= 1) { emberAcc -= 1; const src = state === CHARGE && stT < 0.4 ? [wx(K_DIPS.bhx + 1), wy(K_DIPS.bhy - 1)] : [gx, gy]; spawn(K_EMBER, src[0] + Math.random() * 2 - 1, src[1], Math.random() * 8 - 4, -12 - Math.random() * 10, 0.4 + Math.random() * 0.5, R_EL); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.15 }); if ((stepN++ & 1) === 0) spawn(K_DUST, wx(P.step > 0 ? 4 : -3), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 3, 0.25, FXI.dust); } lastStep = P.step; }
    if (state === IDLE) {
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.1 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 2) for (let i = 0; i < 3; i++) spawn(K_EMBER, wx(K_DIPA.bhx + 1), wy(K_DIPA.bhy - 2), Math.random() * 6 - 3, -14 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); lastPers = f; }
    }
    if (state === DEATH && P.burn > 0 && P.burn < 28) { burnAcc += dt * 40; while (burnAcc >= 1) { burnAcc -= 1; const x = HX - 7 + Math.random() * 16, y = HY - P.burn; spawn(K_RISE, x, y, (Math.random() - 0.5) * 8, -10 - Math.random() * 14, 0.4 + Math.random() * 0.5, (burnAcc * 9 | 0) % 3 ? R_EL : FXI.dust); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 18; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 6 + Math.random() * 16, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, FXI.soul); } }
    mzT += dt;
  }
  function fxReset() { lob.on = 0; helmOn = 0; mzT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; burnAcc = 0; lastStep = 0; stepN = 0; lastPers = -1; }
  function fxBack(f12) { if (P.dq < 1 && !P.burn) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() {
    if (helmOn && E.state === DEATH) {                                   // 掉下来的破锅盔：从头的高度落到地上，往前滚半圈
      const t = E.stT - T_HELM, q = clamp01(t / (T_LAND - T_HELM)), x = RD(helmX + q * 5), y = RD(helmY + (HY - 3 - helmY) * q * q), dq = clamp01((E.stT - INCOMING - 2.1) / 0.45), o = helmSpr.out;
      for (let yy = 0; yy < helmSpr.h; yy++) for (let xx = 0; xx < helmSpr.w; xx++) { const c = o[yy * helmSpr.w + xx]; if (c === 255 || (dq > 0 && B8[(yy & 7) * 8 + (xx & 7)] < dq)) continue; put(x - helmSpr.ox + xx, y - helmSpr.oy + yy, c); }
    }
  }
  function fxFront(f12) {
    const st = E.state, t = E.stT, gx = wx(P.gx), gy = wy(P.gy);
    if (st === CHARGE && t < 0.45) {                                     // 箭深插火罐：罐口窜起 1 格宽的火柱
      const R = parts.rig(P, BODY), jx = wx(parts.edges(R, R.yWaist + 1)[1] + 2), jy = wy(R.yWaist - 1), hgt = RD(2 + 7 * clamp01(t / 0.25) - (t > 0.35 ? (t - 0.35) * 60 : 0));
      for (let k = 0; k < hgt; k++) { const y = jy - 2 - k, c = k < 2 ? EL[0] : k < hgt * 0.5 ? EL[1] : k < hgt * 0.8 ? EL[2] : EL[3]; put(jx + (((k + f12) % 5) === 0 ? 1 : 0), y, c); }
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : EL[1]; put(gx, gy - r, c); put(gx, gy + r, c); put(gx + r, gy, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY - (r >> 1), r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
    if (st === DEATH && P.burn > 0 && P.burn < 28) {                     // 火线：贴着还没烧掉的骨架底边一格一格往上爬
      const y = HY - P.burn, ly = -P.burn - 1 + hero.oy;
      for (let lx = 0; lx < hero.w; lx++) { const on = ly >= 0 && ly < hero.h && hero.out[ly * hero.w + lx] !== 255; if (!on) continue; const x = HX + P.bx + lx - hero.ox; put(x, y, ((lx + f12) % 3) ? EL[1] : EL[0]); if (((lx * 7 + f12) % 4) === 0) put(x, y - 1, EL[2]); }
    }
    if (lob.on) {                                                        // 火箭外形：箭头朝飞行方向（吸附 8 向），大火箭多 3 格火尾
      const u = clamp01(lob.t / lob.T), p = lobAt(u), q = lobAt(Math.min(1, u + 0.05)), dx = q[0] - p[0], dy = q[1] - p[1], a = Math.atan2(dy, dx);
      const s = Math.round(a / (Math.PI / 4)), ux = RD(Math.cos(s * Math.PI / 4)), uy = RD(Math.sin(s * Math.PI / 4)), x = RD(p[0]), y = RD(p[1]), big = lob.k === 2;
      put(x, y, EL[0]); put(x - ux, y - uy, big ? EL[0] : EL[1]);
      for (let k = 2; k <= (big ? 4 : 3); k++) put(x - ux * k, y - uy * k, 19);
      put(x - ux * (big ? 5 : 4) - uy, y - uy * (big ? 5 : 4) + ux, 17); put(x - ux * (big ? 5 : 4) + uy, y - uy * (big ? 5 : 4) - ux, 17);
      if (big) { put(x - uy, y + ux, EL[1]); put(x + uy, y - ux, EL[1]); for (let k = 1; k <= 3; k++) put(x - ux * (4 + k) + ((k + f12) & 1 ? uy : 0), y - uy * (4 + k), EL[k]); }
    }
  }

  return {
    name: '骸骨弓手', HX, R_EL, R_HURT: FXI.dust, DUR, hero, P, GLOW_MATS: [M.eye, M.fire, M.fire2], HIT_POINT: [1, -12], EVENTS,
    SFX: { body: 'stone', how: 'dissolve', pal: 'fire', style: 'fire', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
