// 幻影舞者（部队 · 骷髅 · 刺客 · 传说 · 近战）：剑舞者进化成的半个幽灵——比剑舞者更高更瘦，永远只用一只脚尖点地，身后拖着 1–3 个暗紫残影；
// 同款高发髻金币簪，面纱长成三条向后拖 8 格、末端化烟的幽灵飘带；同款金币腰链裙，金币变成半透明幽灵币、下摆拉长成燕尾；
// 下半身的灯笼裤只剩支撑腿，另一条腿从膝盖往后化成两条飘带；两把月牙弯刀长成一对反握月牙镰（伸出身体两侧各 6 格，刃背一排刻痕是发光体）。
// 攻击 = 劈：反握双镰瞬身贴近（原地留残影），两镰交叉由上往下十字斩。
// 技能 = 特性「致命」（每次攻击永久增加 2 点攻击力 · 每次攻击都永久变强 · 狂怒）：双镰在胸前交叉，从目标身上抽出 3 条猩红能量丝蛇形汇入镰刃，
//        刃口逐格变长变红、残影从 1 个增到 3 个 → 瞬移到目标背后（起跳残影留在原地）闪白，两镰交叉十字斩 → 目标身上留下猩红 X 斩痕 + 暗影外爆，
//        镰刃背上新的一道刻痕亮起（+2 的读法），多出的残影跟到本体身后 → 瞬身回到原位。
// 由「剑舞者」（SwordDancer.js）升级而来。
PCD.define('PhantomDancer', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, B8, copySprite,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：收割 · 暗影紫（淡紫 → 紫 → 深紫 → 墨紫 → 墨）；能量丝与刻痕用猩红（blood 第 2 级）─────
  const R_EL = FXI.shadow, EL = FXR[R_EL], R_RED = FXI.blood, RED = FXR[R_RED];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    gauze: 'shadow',                                // 幻影紫黑纱（胸衣、支撑腿，小块 band 1）
    skirt: { r: 'shadow', band: 2 },                // 幻影紫黑纱裙 + 燕尾（大面积 band 2）
    coin: [20, 61, 14, 62],                         // 幽灵币（gold 暗段）、腰链、簪
    veil: 'pale',                                   // 幽灵飘带
    bone: 'bone',
    hair: [0, 0, 39, 40],                           // 墨青发髻（和剑舞者同一个）
    blade: 'shadow',                                // 镰刃黑
    edge: 'crimson',                                // 猩红刃口
    pouch: [0, 20, 19, 32],
    sock: { r: [0, 0, 0, 0], flat: 1 },
    glow: { r: [56, 57, 58, 21], flat: 1 },         // 刃背刻痕 + 眼窝猩红光（发光体，5 档）
  });
  const GEM_T = [2, 3, 3, 4, 1];
  const BODY = { body: 'slim', leg: 13, torso: 9, head: 6, headW: 5, sw: 2, arm: 10, lw: 2, waist: 1, fall: 'front' };
  const HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(72, 56, 36, 51);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['veil', 'hair', 'coin', 'blade', 'edge', 'glow', 'sock', 'pouch']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 反握月牙镰的模板：握点在手里（0, 0），柄往下 2 格，刃从手下方沿月牙弧扫向 −x 再往上勾；外弧是刃背（刻痕），内弧是猩红刃口。
  //       整把只按 90° 转（q 0–3）+ 左右镜像（m），ext 0–3 = 蓄力时刃口往外多长出几格 ─────
  const TPL = [];
  for (let ext = 0; ext <= 3; ext++) {
    const cells = new Map(), put2 = (x, y, r) => { const k = x + ',' + y; const o = cells.get(k); if (!o || (o[2] === 'E' && r !== 'E') || r[0] === 'N') cells.set(k, [x, y, r]); };
    put2(0, 1, 'W'); put2(0, 2, 'T');
    const th1 = Math.PI + 0.25 + ext * 0.16; let tip = [0, 0];
    for (let th = Math.PI / 2; th <= th1 + 1e-6; th += 0.02) { const x = RD(Math.cos(th) * 7), y = RD(Math.sin(th) * 4.4); put2(x, y, th > Math.PI + 0.25 ? 'E' : 'M'); tip = [x, y]; }
    for (let th = Math.PI / 2; th <= Math.PI - 0.12; th += 0.02) put2(RD(Math.cos(th) * 6), RD(Math.sin(th) * 3.3), 'E');
    [0.18, 0.32, 0.46, 0.6, 0.74].forEach((f, i) => { const th = Math.PI / 2 + f * Math.PI / 2; put2(RD(Math.cos(th) * 7), RD(Math.sin(th) * 4.4), 'N' + i); });
    TPL.push({ cells: [...cells.values()], tip });
  }
  const rotq = (x, y, q, m) => { if (m) x = -x; return q === 0 ? [x, y] : q === 1 ? [-y, x] : q === 2 ? [-x, -y] : [y, -x]; };

  // ───── 姿势：前手（右手）P.hx hy + 镰朝向 fq / 镜像 fm，后手 P.bhx bhy + bq / bm ─────
  const P = { hx: 0, hy: 0, fq: 0, fm: 0, bhx: 0, bhy: 0, bq: 0, bm: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, beard: 0, sway: 0, wave: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, edge: 0, notch: 0, shatter: 0, dropY: 0, dq: 0, st: 0, ghosts: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, fq, fm, bhx, bhy, bq, bm, lean, crouch) => ({ hx, hy, fq, fm, bhx, bhy, bq, bm, lean: lean || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -16, 0, 1, -4, -15, 0, 0);                  // 前镰向前勾、后镰向后勾，伸出身体两侧各 6 格
  const K_WIND = K(3, -30, 2, 0, -2, -31, 2, 1, -1, 1);           // 预兆：双镰举过头
  const K_STRIKE = K(9, -14, 0, 1, 7, -17, 0, 1, 1, 1);           // 十字斩落下
  const K_FOLLOW = K(8, -12, 0, 1, 6, -14, 0, 1, 1, 1);
  const K_CROSS = K(4, -19, 1, 1, 3, -21, 3, 0, 0, 1);            // 蓄力：双镰胸前交叉
  const K_CHOP = K(9, -12, 0, 1, 7, -14, 0, 1, 1, 2);             // 施放：目标背后十字斩
  const K_HURT = K(2, -17, 0, 1, -6, -19, 0, 0, -1, 0);
  const NUM = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'crouch'];
  const setK = (A, B, q) => { B = B || A; q = q || 0; E.mix(P, A, B, q, NUM); const S = q < 0.5 ? A : B; P.fq = S.fq; P.fm = S.fm; P.bq = S.bq; P.bm = S.bm; };
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['fq', 0, 3], ['fm', 0, 1], ['bq', 0, 3], ['bm', 0, 1],
    ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['edge', 0, 3], ['notch', 0, 5], ['wave', 0, 3]]);
  const KEY2 = parts.keyer([['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['shatter', 0, 1],
    ['dropY', 0, 15], ['dq', 0, 48, 48], ['st', 0, 8], ['bx', -16, 15]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_STRIKE = 2 / 12, DASH = 7, T_X2 = 1 / 12, T_MARK = 3 / 12, T_BACK = 0.3, T_SHAT = INCOMING + 0.3, T_DROP = INCOMING + 0.6;
  const BEHIND = DUMMY_X + 14 - HX;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.beard = 0; P.sway = 0; P.wave = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.edge = 0; P.notch = 2; P.shatter = 0; P.dropY = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.head = 0; P.ghosts = 2;
    const idle = () => {
      setK(K_IDLE); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3]; P.wave = Math.floor(TT * 5 + 1e-6) & 3;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.2 && lp < 1.2 + 4 / 12) { P.fq = f12of(lp - 1.2) & 3; P.hy -= 1; P.glint = 1; }       // 待机个性：转镰，前手一圈
      if (lp >= 1.6 && lp < 1.6 + 4 / 12) { P.bq = (4 - f12of(lp - 1.6)) & 3; P.bhy -= 1; }             // 再换后手一圈（残影慢一拍跟着转）
      if (lp >= 0.5 && lp < 0.5 + 2 / 12) P.gem = 1;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                               // 单足滑行：脚尖点地不抬步，飘带 / 燕尾 / 裙摆波浪前移，残影拖在身后
      setK(K_IDLE); const f = E.gait(tq); P.wave = f; P.bob = f & 1; P.lean = 1; P.beard = -2 + (f === 1 ? 1 : 0); P.sway = [-1, -2, -1, 0][f]; P.hx += 1; P.bhx -= 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < T_STRIKE) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.1))); P.gem = 1; P.beard = 1; P.wave = 1; }
      else if (tq < 0.25) { setK(K_STRIKE); P.bx = DASH; P.gem = 3; P.rim = 2; P.beard = -3; P.sway = -2; P.wave = 2; P.notch = 3; P.glint = 1; }
      else if (tq < 0.45) { setK(K_STRIKE, K_FOLLOW, ease.out(clamp01((tq - 0.25) / 0.2))); P.bx = DASH; P.gem = 2; P.beard = -2; P.wave = 3; P.notch = 3; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_FOLLOW, K_IDLE, q); P.bx = RD(DASH * (1 - q)); P.gem = q < 0.5 ? 1 : 0; P.beard = -1; P.notch = 3; P.wave = f12 & 3; }
    } else if (st === CHARGE) {                                           // 双镰胸前交叉，刃口逐格变长变红，残影 1 → 3
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CROSS, q);
      P.edge = tq < 0.5 ? 0 : tq < 0.8 ? 1 : tq < 1.1 ? 2 : 3; P.ghosts = tq < 0.5 ? 1 : tq < 1.0 ? 2 : 3;
      P.beard = -RD(q * 3); P.sway = (f12 & 1) ? -1 : 0; P.wave = f12 & 3; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                             // 瞬移到目标背后，十字斩
      setK(K_CHOP); if (tq < 1 / 12) { setK(K_WIND); P.flash = 1; }
      P.mx = BEHIND; P.flip = 1; P.edge = 3; P.gem = 3; P.rim = 3; P.beard = -3; P.sway = -2; P.wave = f12 & 3; P.ghosts = 3;
      P.notch = tq >= T_MARK - 1e-6 ? 3 : 2; P.glint = tq >= T_MARK - 1e-6 && tq < T_MARK + 0.17 ? 1 : 0;
    } else if (st === RECOVER) {                                          // 在目标背后停一下 → 瞬身回原位 → 收镰
      P.notch = 3; P.ghosts = 3; P.wave = f12 & 3;
      if (tq < T_BACK) { setK(K_CHOP); P.mx = BEHIND; P.flip = 1; P.edge = 2; P.gem = 2; P.rim = 2; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - T_BACK) / 0.35)); setK(K_CHOP, K_IDLE, q); P.edge = q < 0.5 ? 1 : 0; P.gem = q < 0.6 ? 1 : 0; P.ghosts = q < 0.6 ? 3 : 2; P.beard = RD(q - 1); }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.ghosts = 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 2; P.sway = 1; P.rim = 0; P.ghosts = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                            // 残像碎裂：定格 → 剪影裂成 5 片错位残片（特效层）→ 双镰和幽灵币落地 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.gem = d < 0.15 ? 1 : 4; P.ghosts = 2; }
      else {
        P.shatter = 1; P.ghosts = 0; P.gem = 4; const fq = clamp01((d - 0.3) / 0.3);
        P.dropY = d < 0.6 ? RD(13 * (1 - fq * fq)) : d < 0.66 ? 0 : d < 0.75 ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.ghosts = tq > 0.85 ? 1 : 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.crouch = RD(P.crouch);
    if (P.shatter) { P.gx = 6; P.gy = -2 - P.dropY; }
    else { const tp = TPL[P.edge].tip, r = rotq(tp[0], tp[1], P.fq, P.fm); P.gx = P.hx + r[0] + P.bx; P.gy = P.hy + r[1]; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  const px = (T, x, y, m, t) => parts.px(E, T, x, y, m, t), run = (T, y, a, b, m, t) => parts.run(E, T, y, a, b, m, t);
  const FREE = parts.FREE;

  // 候选部件：ghostRibbons 三条幽灵飘带（剑舞者面纱的进化）——从发髻后出发向后拖 8–12 格、逐条往下错 2 格，正弦起伏随 P.wave 前移，
  //   末端 3 格碎成隔点的烟；P.beard < 0 被风拉直、> 0 往下甩。一个部件
  function ghostRibbons(R) {
    E.part(); const b = RD(P.beard || 0), x0 = R.hx0 - 1, y0 = R.htop, ph = (P.wave || 0) * 1.57;
    for (let j = 0; j < 3; j++) {
      const L = 8 + j * 2 + (b < 0 ? -b : 0), drop = 1.2 + j * 1.6 + (b > 0 ? b * 1.2 : b * 0.3);
      for (let k = 0; k <= L; k++) {
        const q = k / L, x = x0 - k, y = RD(y0 + j * 2 + drop * q * 2 + Math.sin(k * 0.75 - ph + j * 1.3) * 1.3 * q);
        if (k > L - 3 && ((k + j + (P.wave || 0)) & 1)) continue;          // 末端化烟
        px(R, x, y, M.veil, k > L - 3 ? 2 : j === 1 ? 4 : 0);
        if (k < 3 && j === 0) px(R, x, y + 1, M.veil, 2);
      }
    }
  }
  // 候选部件：ghostLegs 单足点地 + 飘带腿——近侧腿是收窄的灯笼裤 + 幽灵币脚铃 + 2 格细骨小腿、只有脚尖 1 格点地；
  //   远侧腿从胯往后折到膝盖，膝盖以下化成两条向后拖的飘带（离地、末端碎成烟点）。读 P.wave（飘带波浪相位）P.crouch。两个部件（远 → 近）
  function ghostLegs(R) {
    const h0 = R.yHip + 1, hb = R.hipBx, ph = (P.wave || 0) * 1.57;
    E.part();
    for (let k = 0; k <= 4; k++) run(R, h0 + k, hb - RD(k * 0.8) - 1, hb - RD(k * 0.8), M.gauzeD, 0);
    const kx = hb - 4, ky = h0 + 4;
    for (let j = 0; j < 2; j++) {
      const L = j ? 6 : 9;
      for (let k = 0; k <= L; k++) {
        const q = k / L, x = kx - k, y = RD(ky + j * 2 + k * 0.35 + Math.sin(k * 0.8 - ph + j * 1.7) * 1.3 * q);
        if (k > L - 3 && ((k + (P.wave || 0)) & 1)) continue;
        px(R, x, y, M.gauzeD, j ? 2 : 0); if (k < L - 3 && !j) px(R, x, y + 1, M.gauzeD, 2);
      }
    }
    E.part();
    const hx = R.hipFx, fx = hx + 1, yb = 0, n = yb - h0, kn = R.cr * 0.9; let c = fx;
    for (let y = h0; y <= yb - 1; y++) {
      const t = (y - h0) / n; c = RD(hx + (fx - hx) * t + kn * Math.sin(t * Math.PI));
      if (y <= yb - 5) { const w = t > 0.25 && t < 0.7 ? 3 : 2; run(R, y, c - 1, c - 2 + w, M.gauze, 0); }
      else if (y === yb - 4) { px(R, c - 1, y, M.coin, 2); px(R, c, y, M.coin, 4); }
      else px(R, c, y, M.bone, y === yb - 1 ? 4 : 0);
    }
    px(R, c + 1, yb, M.bone, 3);
  }
  function bodiceRibs(R) {
    E.part();
    for (let y = R.yS; y < R.yWaist; y++) {
      const e = parts.edges(R, y), k = y - R.yS;
      if (k < 3) run(R, y, e[0], e[1], M.gauze, 0);
      else if (k === 3) { run(R, y, e[0], e[1], M.bone, 0); px(R, e[1], y, M.bone, 2); }
      else { px(R, e[0], y, M.bone, 3); px(R, e[0] + 1, y, M.bone, 2); }
    }
    const e = parts.edges(R, R.yS + 1); px(R, e[1], R.yS + 1, M.coin, 4);
  }
  // 候选部件：swallowSkirt 幽灵币燕尾裙（剑舞者金币腰链裙的进化）——腰链 + 外扩纱裙，裙面两层半透明幽灵币（隔格亮、隔格空），
  //   后摆拉长成两条燕尾（2 格变 1 格，拖到离地 2 格，随 P.wave 摆）。读 P.sway P.wave P.beard。一个部件
  function swallowSkirt(R) {
    E.part();
    const yW = R.yWaist, hem = R.yHip + 4, n = hem - yW, sw = RD(P.sway || 0), jb = RD(P.beard || 0) & 1, wv = P.wave || 0, LL = [], RR = [];
    for (let y = yW; y <= hem; y++) {
      const t = (y - yW) / n, s = RD(sw * t * t), half = 2 + 4 * Math.pow(t, 1.15);
      const L = RD(-0.5 - half + s), Rr = RD(-0.5 + half + s - 0.4); LL.push(L); RR.push(Rr); run(R, y, L, Rr, M.skirt, 0);
    }
    for (let i = 2; i < n; i++) px(R, LL[i] + 2 + RD(i / n), yW + i, M.skirt, 2);
    for (let x = LL[n] + 1; x <= RR[n]; x++) if ((((x - sw) % 3) + 3) % 3 === 1) px(R, x, hem, M.skirt, 1);
    for (let j = 0; j < 2; j++) {                                         // 燕尾
      const x0 = LL[n] + 1 + j * 2, L = 7 - j * 2;
      for (let k = 0; k <= L; k++) {
        const x = x0 - RD(k * (0.9 - j * 0.2)) + RD(Math.sin(k * 0.9 - wv * 1.57) * 0.8 * k / L), y = Math.min(-2, hem + 1 + RD(k * (0.75 + j * 0.15)));
        px(R, x, y, M.skirt, j ? 2 : 0); if (k < L - 2) px(R, x + 1, y, M.skirt, 2);
      }
    }
    for (let x = LL[0]; x <= RR[0]; x++) px(R, x, yW, M.coin, ((x + jb) & 1) ? 4 : 2);
    for (const ty of [yW + 3, yW + 6]) { const i = ty - yW; if (i > n) continue; for (let x = LL[i] + 1 + (ty & 1); x < RR[i]; x += 2) if (((x + ty + jb) & 3) !== 0) px(R, x, ty, M.coin, ((x + jb) & 2) ? 4 : 3); }
    for (let x = LL[n]; x <= RR[n]; x += 3) px(R, x + (jb ? 1 : 0), hem + 1, M.coin, 3);
    // 后腰一只瘪下去的小钱袋（升级线保留的商人读法）
    E.part(); const bx = LL[2] - 1, by = yW + 1;
    px(R, bx, by, M.coin, 4); run(R, by + 1, bx - 1, bx, M.pouch, 0); run(R, by + 2, bx - 1, bx + 1, M.pouch, 0); px(R, bx, by + 3, M.pouch, 0);
  }
  function skullSide(R) {
    const h = parts.head(E, R, P, { mat: M.bone, face: 'gaunt', eye: M.sock, eyeStyle: 'narrow', nose: 'none', mouth: 'none', ear: 'none' });
    if (!P.eyes) px(R, h.eye[0], h.ey, M.glow, GEM_T[P.gem]);
    px(R, h.x1, h.ey + 2, M.sock, 1);
    px(R, h.x1, h.bot, M.bone, 4); px(R, h.x1 - 1, h.bot, M.sock, 1);
    parts.hair(E, R, P, { style: 'short', mat: M.hair });
  }
  function highBun(R) {
    E.part(); const bx = R.hx0, t = R.htop;
    run(R, t - 1, bx - 1, bx + 3, M.hair, 0); run(R, t - 2, bx - 1, bx + 3, M.hair, 0); run(R, t - 3, bx - 1, bx + 3, M.hair, 0); run(R, t - 4, bx, bx + 2, M.hair, 0);
    px(R, bx, t - 3, M.hair, 4); px(R, bx + 2, t - 2, M.hair, 2);
    E.part(); px(R, bx - 2, t - 4, M.coin, 3); px(R, bx - 4, t - 6, M.coin, 4); px(R, bx - 3, t - 6, M.coin, 3); px(R, bx - 4, t - 5, M.coin, 3); px(R, bx - 3, t - 5, M.coin, 2);
  }
  // 候选部件：crescentSickle 反握月牙镰——柄 2 格（骨柄 + 幽灵币箍），刃沿月牙弧从手下扫出再往上勾（外弧黑刃背、内弧猩红刃口），
  //   刃背 5 道刻痕是发光体：前 o.notch 道亮（猩红，P.gem 档，P.glint 时最新那道闪白），其余是刻进刃背的暗痕；o.ext 0–3 刃口往外多长几格。
  //   只按 90° 转（q）+ 镜像（m），和 parts 的宽武器头同一条规矩。一个部件
  function crescentSickle(T, hx, hy, q, m, o) {
    E.part(); const tp = TPL[o.ext || 0], dark = o.dark;
    for (const c of tp.cells) {
      const r = rotq(c[0], c[1], q, m), x = hx + r[0], y = hy + r[1], role = c[2];
      if (role === 'W') px(T, x, y, M.bone, 2);
      else if (role === 'T') px(T, x, y, M.coin, 4);
      else if (role === 'M') px(T, x, y, dark ? M.bladeD : M.blade, 0);
      else if (role === 'E') px(T, x, y, M.edge, (o.ext || 0) >= 2 ? 4 : 3);
      else { const i = +role[1]; if (i < (o.notch || 0) && P.gem !== 4) px(T, x, y, M.glow, P.glint && i === o.notch - 1 ? 4 : P.gem >= 2 ? 3 : 2); else px(T, x, y, dark ? M.bladeD : M.blade, 2); }
    }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    if (P.shatter) {                                                      // 碎裂后：只剩掉在地上的双镰和一把幽灵币
      crescentSickle(FREE, 6, -5 - P.dropY, 0, 1, { notch: 0 });
      crescentSickle(FREE, -4, -5 - RD(P.dropY * 0.8), 0, 0, { notch: 0, dark: 1 });
      E.part(); for (const [x, k] of [[1, 1], [3, 0.7], [-2, 0.9], [9, 0.6]]) { const y = -1 - RD(P.dropY * k); px(FREE, x, y, M.coin, 4); px(FREE, x + 1, y, M.coin, 2); }
      return;
    }
    const R = parts.rig(P, BODY);
    ghostRibbons(R);
    crescentSickle(R, P.bhx, P.bhy, P.bq, P.bm, { ext: P.edge, notch: P.notch, dark: 1 });
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.boneD, cuff: M.coinD, hand: M.boneD, grip: 'fist' });
    ghostLegs(R);
    bodiceRibs(R);
    swallowSkirt(R);
    skullSide(R);
    highBun(R);
    crescentSickle(R, P.hx, P.hy, P.fq, P.fm, { ext: P.edge, notch: P.notch });
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.bone, cuff: M.coin, hand: M.bone, grip: 'fist' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const NG = 3, gSpr = [], gMX = new Float32Array(NG), gFL = new Uint8Array(NG);
  for (let i = 0; i < NG; i++) gSpr.push(new Sprite(hero.w, hero.h, hero.ox, hero.oy));
  const tpSpr = new Sprite(hero.w, hero.h, hero.ox, hero.oy), shard = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let gKey = -1, gN = 0, tpT = 9, tpX = 0, tpFl = 0, xmT = 9, shT = 9, shTop = 0, shBot = 0, soulAcc = 0, spAcc = 0, lastF = -1, dropDone = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function snap(dst, st, t) { poseAt(st, t, t); drawHero(); bakeHero(); copySprite(dst, hero); hero.k1 = hero.k2 = -1; }
  // 残影：身后 1–3 个慢一拍的暗紫单色剪影——每换一个 12 fps 帧，按「当前时间 − j 帧」重新摆一次姿势烤进残影缓冲（移动时慢 2 帧，自然拖在身后）
  function lagGhosts() {
    const st = E.state, stT = E.stT, simT = E.simT, key = st * 1e6 + f12of(stT) * 1000 + (f12of(simT) % 1000);
    if (key === gKey) return; gKey = key;
    const n = P.ghosts || 0, lag = st === MOVE ? 2 / 12 : 1 / 12; gN = 0;
    if (!n || P.shatter || P.dq >= 0.9) return;
    for (let j = 1; j <= n; j++) { const tj = Math.max(0, stT - j * lag); poseAt(st, tj, Math.max(0, simT - j * lag)); drawHero(); bakeHero(); copySprite(gSpr[j - 1], hero); gMX[j - 1] = P.mx; gFL[j - 1] = P.flip; gN++; }
    poseAt(st, stT, simT); drawHero(); bakeHero(); hero.k1 = P.k1; hero.k2 = P.k2;
  }
  // 候选特效：blitBand 剪影按行切片——只画 y0..y1 行，整片平移 (dx, dy)，单色 c，按 dq 抖动消散（残像碎裂用）
  function blitBand(s, X, Y, flip, y0, y1, dx, dy, c, dq) {
    const o = s.out;
    for (let y = y0; y <= y1; y++) for (let x = 0; x < s.w; x++) { if (o[y * s.w + x] === 255 || B8[(y & 7) * 8 + (x & 7)] < dq) continue; const xx = (flip ? X + s.ox - x : X - s.ox + x) + dx; put(xx, Y - s.oy + y + dy, c); }
  }
  function onEnter(s) {
    if (s === CAST) {                                                     // 瞬移：起跳残影留在原地，本体出现在目标背后闪白
      snap(tpSpr, CHARGE, DUR[CHARGE] - 1 / 12); tpT = 0; tpX = HX; tpFl = 0;
      releaseOrbit(30, 70, 0.2, 0.4, { pts: 1 });
      burst(HX, HY - 16, 14, 30, 90, 0.2, 0.45, R_EL, 6);
      fx.slash(DUMMY_X, HY - 17, 11, -0.8, 2.3, R_EL, 0.22, 2, 2); sfx('swing', { kind: 'slash', w: 0.35 });
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    const at = (v) => Math.abs(t - v) < 1e-9;
    if (s === ATTACK && at(T_STRIKE)) {                                  // 瞬身贴近 + 十字斩
      snap(tpSpr, ATTACK, 1 / 12); poseAt(ATTACK, t, t); tpT = 0; tpX = HX; tpFl = 0;
      const cx = DUMMY_X - 2, cy = HY - 17;
      fx.slash(cx - 3, cy, 10, -0.9, 2.2, R_EL, 0.2, 2, 2); fx.slash(cx - 3, cy, 10, 0.9, -2.2, R_EL, 0.2, 2, 2);
      burst(cx, cy, 10, 40, 100, 0.15, 0.35, R_EL, 8); burst(cx, cy, 5, 30, 70, 0.15, 0.3, R_RED, 6); fx.cross(cx, cy, 3, R_RED, 0.18);
      hitDummy(0); sfx('swing', { kind: 'slash', w: 0.35 }); sfx('hit', { mat: 'flesh', w: 0.35 });
    }
    if (s === CAST && at(T_X2)) { fx.slash(DUMMY_X, HY - 17, 11, 0.8, -2.3, R_EL, 0.22, 2, 2); sfx('swing', { kind: 'slash', w: 0.35 }); }
    if (s === CAST && at(T_MARK)) {                                       // 猩红 X 斩痕 + 暗影外爆 + 新刻痕亮起
      xmT = 0; const x = DUMMY_X, y = HY - 17;
      burst(x, y, 30, 50, 140, 0.3, 0.7, R_EL, 14); burst(x, y, 10, 40, 90, 0.2, 0.45, R_RED, 8); ring(x, y, 1, R_EL);
      hitDummy(1, -1); shake(0.12, 1); sfx('impact', { pal: 'shadow', w: 0.6 });
      fx.cross(wx(P.gx), wy(P.gy), 4, R_RED, 0.25);
    }
    if (s === RECOVER && at(T_BACK)) { snap(tpSpr, RECOVER, T_BACK - 1 / 12); poseAt(RECOVER, t, t); tpT = 0; tpX = HX + BEHIND; tpFl = 1; burst(HX, HY - 16, 10, 30, 70, 0.2, 0.4, R_EL, 6); }
    if (s === DEATH && at(T_SHAT)) {                                      // 本体和残影一起定格、裂成错位残片
      snap(shard, DEATH, T_SHAT - 1 / 12); poseAt(DEATH, t, t); shT = 0;
      shTop = shard.h; shBot = 0; for (let y = 0; y < shard.h; y++) for (let x = 0; x < shard.w; x++) if (shard.out[y * shard.w + x] !== 255) { if (y < shTop) shTop = y; if (y > shBot) shBot = y; }
      burst(HX - 2, HY - 16, 16, 30, 90, 0.2, 0.5, R_EL, 8); flash(0.04);
    }
    if (s === DEATH && at(T_DROP)) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX + Math.random() * 12 - 4, HY - 1, (Math.random() - 0.5) * 20, -5 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust); sfx('fall', { w: 0.15 }); shake(0.08, 1); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_X2, T_MARK], [T_BACK], [], [T_SHAT, T_DROP], []];
  function stepFX(dt, state, stT) {
    if (state === MOVE) {                                                 // 脚尖轻点（无尘）：每两步一下
      const f = E.gait(q12(stT)); if (f !== lastF) { if (f === 0 || f === 2) sfx('step', { w: 0.1 }); lastF = f; }
    } else lastF = -1;
    if (state === CHARGE && stT > 0.3) {                                  // 能量丝在刃尖汇聚
      spAcc += dt * 18; while (spAcc >= 1) { spAcc -= 1; const r = 5 + Math.random() * 4, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, 0, 0, r / (0.25 + Math.random() * 0.2), 0, 9, R_RED, { a, r, w: 6 + Math.random() * 3, tx: wx(P.gx), ty: wy(P.gy) }); }
    }
    if (state === DEATH && shT < 1.8) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 16, HY - 4 - Math.random() * 24, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.7 + Math.random() * 0.6, R_EL); } }
    tpT += dt; xmT += dt; shT += dt;
  }
  function fxReset() { gKey = -1; gN = 0; tpT = 9; xmT = 9; shT = 9; soulAcc = 0; spAcc = 0; lastF = -1; }
  function fxBack(f12) { if (!P.shatter) floorGlow(wx(P.gx), P.rim, EL, f12); }
  function fxMid(f12) {
    lagGhosts();
    for (let j = gN - 1; j >= 0; j--) {                                   // 残影：近的一个墨紫，远的更暗、更碎
      const off = E.state === MOVE ? 0 : (j + 1) * 2, X = HX + gMX[j] + (gFL[j] ? off : -off);
      E.blitShape(gSpr[j], X, HY, gFL[j], j === 0 ? EL[2] : EL[3], j === 0 ? 0.12 : 0.3 + j * 0.15);
    }
    if (tpT < 0.35) E.blitShape(tpSpr, tpX, HY, tpFl, tpT < 1 / 12 ? EL[1] : EL[2], clamp01(tpT / 0.35));   // 瞬移起跳残影
    if (shT < 2.2 && E.state === DEATH) {                                 // 残像碎裂：5 片横切残片，错开、抖动、依次消散；身后两层残影残片更暗、先散
      const n = 5, span = Math.max(1, shBot - shTop + 1), sp = ease.out(clamp01(shT / 0.25));
      const DX = [1, -2, 2, -1, 1], DY = [-2, -1, 0, 1, 1];
      for (let layer = 2; layer >= 0; layer--) {
        const lx = -layer * 4, col = layer === 0 ? EL[2] : layer === 1 ? EL[3] : 52;
        for (let i = 0; i < n; i++) {
          const y0 = shTop + Math.floor(span * i / n), y1 = shTop + Math.floor(span * (i + 1) / n) - 1, jit = shT > 0.25 && ((f12 + i) & 1) ? (i & 1 ? 1 : -1) : 0;
          const dq = clamp01((shT - 0.45 - i * 0.18 + layer * 0.2) / 0.35);
          if (dq >= 1) continue;
          blitBand(shard, HX + lx, HY, 0, y0, y1, RD(DX[i] * 2 * sp) + jit, RD(DY[i] * sp), shT < 1 / 12 && layer === 0 ? EL[0] : col, dq);
          if (layer === 0 && shT < 0.3) for (let x = 0; x < shard.w; x += 2) if (shard.out[y0 * shard.w + x] !== 255) put(HX - shard.ox + x + RD(DX[i] * 2 * sp), HY - shard.oy + y0 + RD(DY[i] * sp), EL[1]);   // 裂缝亮线（只在剪影内）
        }
      }
    }
  }
  function fxFront(f12) {
    const st = E.state;
    if (st === CHARGE && E.stT > 0.25) {                                  // 3 条猩红能量丝从目标身上被抽出，蛇形汇入镰刃
      const bxw = wx(P.gx), byw = wy(P.gy), p = clamp01((E.stT - 0.25) / 0.5), T = E.simT;
      for (let k = 0; k < 3; k++) {
        const dx = DUMMY_X + [-2, 1, 3][k], dy = HY - [22, 16, 10][k], n = 40;
        for (let i = 0; i <= n; i++) {
          const s = i / n; if (s > p) break; if (((i + f12 * 2 + k) % 5) === 0) continue;
          const x = RD(dx + (bxw - dx) * s), y = RD(dy + (byw - dy) * s + Math.sin(s * 9 + k * 2 - T * 14) * 2.2 * Math.sin(s * Math.PI));
          put(x, y, s > 0.8 ? RED[1] : s > 0.4 ? RED[2] : RED[3]);
        }
      }
    }
    if (xmT < 0.6) {                                                      // 猩红 X 斩痕（斜十字）
      const cx = DUMMY_X, cy = HY - 17, L = xmT < 0.1 ? 7 : 6, late = xmT > 0.35;
      for (let r = -L; r <= L; r++) { if (late && ((r + f12) & 1)) continue; const c = xmT < 1 / 12 ? RED[0] : Math.abs(r) < 3 ? RED[1] : RED[2]; put(cx + r, cy + r, c); put(cx + r, cy - r, c); if (xmT < 0.2) { put(cx + r + 1, cy + r, RED[3]); put(cx + r + 1, cy - r, RED[3]); } }
    }
    if (P.gem >= 2 && P.gem <= 3 && !P.shatter && P.dq < 1) {            // 刃尖星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 4 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '幻影舞者', HX, R_EL, R_HURT: FXI.dust, DUR, hero, P, GLOW_MATS: [M.glow, M.edge], HIT_POINT: [0, -18], EVENTS,
    SFX: { body: 'ghost', how: 'shatter', pal: 'shadow', style: 'blade', w: 0.35 },
    REVIVE: { dy: -18, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
