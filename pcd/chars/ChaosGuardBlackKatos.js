// 混沌卫黑卡托斯（敌人 · 混沌 · 不朽 · 近战 range 480，batch-06）：desc「最终首领。率领着一群军团领主」——巨型重甲倒三角的黑铁巨人，腿短粗、站得很稳。
// 识别：背后插着三面血红的军团战旗（旗杆高出盔顶 10 格，三个领主徽记各不相同）、平顶桶盔两侧一对向前弯的巨大黑角（盔缝一线魂光眼）、
// 双手拄在身前的黑铁巨锤（锤面一圈魂光铆钉）、两边肩甲是两颗骷髅（领主亡魂）、破边墨色披风。
// 攻击 = 砸：双手抡锤过顶，前冲 2 格重重砸在地上（扬尘 + 小地裂）。
// 技能 = 特性「首领单位」（防御更高）+「盛宴」（亡魂回流）：锤子拄地，四面八方的亡魂汇聚到胸甲，三面战旗依次亮起魂光 →
//   举锤砸地，三面战旗的位置各冲起一道魂光柱 → 一个大的点阵护盾罩住全身，点一个个变白，再变成黑铁甲片纹（守护）。
// 死亡 = 单膝跪地、拄锤不倒，从头顶开始化灰飘走（死亡套件 ash）；背上的三面战旗落到地上，最后向后倒下。
PCD.define('ChaosGuardBlackKatos', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, death, hitDummy, put, scrX, floorGlow, shotFloorGlow, bayer, sfx } = E;
  const RD = Math.round, FL = (v) => Math.floor(v + 1e-6), HALF = Math.PI / 2, PI = Math.PI;
  const px = parts.px, run = parts.run;

  // ───── 元素：军团亡魂 · 魂光蓝紫（soul）；普通攻击 impact + dust ─────
  const R_EL = FXI.soul, EL = FXR[R_EL], R_IMP = FXI.impact, R_ST = FXI.steel;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    plate: { r: 'iron', band: 2 }, limb: 'iron', trim: 'steel', cape: { r: 'stone', band: 2 }, flag: 'blood', pole: 'iron', bone: 'bone', gold: 'gold',
    horn: [0, 9, 10, 18], belt: 'iron', soul: { r: [25, 24, 23, 22], flat: 1 }, hot: { r: [23, 22, 21, 21], flat: 1 }, sock: { r: [0, 0, 0, 8], flat: 1 },
  });
  const BODY = { body: 'giant', leg: 10, torso: 15, head: 8, headW: 8, sw: 7, arm: 14, lw: 5, limb: 1.6, stride: 3 };
  const HX = 74, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(112, 80, 54, 72);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 15, 21], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['soul', 'hot', 'sock', 'pole', 'flag', 'horn', 'gold', 'belt']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 hx hy 握锤、a 锤的方向（0 朝上、顺时针）；后手在柄上往柄尾 3 格 ─────
  const MAUL = { len: 13, back: 5 };
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, beard: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, flags: 0, flap: 0, only: 0, bfall: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(10, -18, PI);                                       // 拄锤：锤头着地到膝盖，双手压在柄上
  const K_MARCH = K(9, -19, 0.3);                                      // 行军：锤竖扛在身前
  const K_RAISE = K(2, -32, -0.55, -1, -1);                            // 抡锤过顶
  const K_SLAM = K(13, -16, 2.2, 1, 1, 1);                             // 砸在假人脚下
  const K_HOLD = K(12, -15, 2.3, 1, 0, 1);
  const K_BRACE = K(10, -17, PI, 0, -1, 1);                            // 蓄力：拄锤、身体微沉、抬头
  const K_QUAKE = K(11, -14, 2.6, 1, 1, 2);                            // 施放：砸在身前地上
  const K_HURT = K(8, -17, PI - 0.3, -1, -1);
  const K_KNEEL = K(11, -20, PI - 0.4, 1, 1, 4);                       // 单膝跪地、拄锤不倒：锤柄斜靠在手上，锤头 6 行正好落在 y −5…0（hy 另加 crouch 3）
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -16, 24], ['hy', -48, 4], ['ai', -32, 32], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8], ['step', -1, 1],
    ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['flags', 0, 3], ['flap', 0, 3],
    ['only', 0, 2], ['bfall', 0, 3], ['dqi', 0, 24], ['st', 0, 8]]);
  const SW = [0, 1, 0, -1], T_STRIKE = 2 / 12, T_SLAM = 2 / 12, T_DOME = 3 / 12, T_KNEEL = INCOMING + 0.3, T_ASH = INCOMING + 1.1, T_BDROP = INCOMING + 1.25, T_BLAND = INCOMING + 1.7;
  const R0 = parts.rig({}, BODY);

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.beard = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.flags = 0; P.only = 0; P.bfall = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.flap = FL(TT * 5) & 3;
    const idle = () => {                                                // 拄锤守望：身体一动不动（只有很慢的呼吸），战旗和披风在飘，眼光偶尔一闪
      setK(K_IDLE, K_IDLE, 0); P.bob = FL(TT * 1.25) & 1; P.sway = SW[FL(TT * 2.5) & 3]; P.beard = SW[(FL(TT * 2.5) + 1) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.5 && lp < 1.75) { P.glint = 1; P.gem = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 行军重步：接触帧下沉、扬尘、震屏
      setK(K_MARCH, K_MARCH, 0); parts.gait(P, E.gait(tq)); P.hx += P.step * 0.5; P.a += P.step * 0.05; P.flap = (FL(TT * 6) + 1) & 3; P.beard = -1 - (P.wup ? 1 : 0);
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_RAISE, ease.out(tq / 0.12)); P.beard = 1; P.bend = 1; }
      else if (tq < 0.2) { setK(K_SLAM, K_SLAM, 0); P.bx = 2; P.beard = -2; P.sway = -1; P.bend = 2; P.glint = 1; P.gem = 1; }
      else if (tq < 0.45) { setK(K_SLAM, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.bx = 2; P.beard = -1; P.bend = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 亡魂回流：战旗依次亮起，轮廓光 1 → 2 → 3
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IDLE, K_BRACE, q);
      P.flags = tq < 0.35 ? 0 : tq < 0.7 ? 1 : tq < 1.05 ? 2 : 3; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.5 ? 1 : tq < 1.0 ? 2 : 3;
      P.beard = -2; P.bend = 2 + (tq > 1.0 && (f12 & 1) ? 1 : 0); P.sway = -1;
    } else if (st === CAST) {                                          // 举锤 → 砸地（魂光柱）→ 护盾（闪白一次）
      P.flags = 3; P.rim = 3; P.gem = 3; P.bend = 3; P.beard = -2;
      if (tq < T_SLAM - 1e-6) setK(K_BRACE, K_RAISE, ease.out(clamp01(tq / (1 / 12))));
      else { setK(K_QUAKE, K_QUAKE, 0); P.flash = tq >= 5 / 12 - 1e-6 && tq < 6 / 12 - 1e-6 ? 1 : 0; P.glint = 1; }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_QUAKE, K_IDLE, q);
      P.flags = q < 0.25 ? 3 : q < 0.5 ? 2 : q < 0.75 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.3 ? 3 : q < 0.65 ? 2 : 1; P.bend = RD(2 * (1 - q));
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.flap = 2; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.beard = 1; P.flap = FL(TT * 3) & 3;
        P.gem = d < 0.5 ? 2 : d < 0.9 ? ((f12 % 3) === 0 ? 2 : 4) : 4; P.eyes = P.gem === 4 ? 1 : 0;
        if (d >= T_ASH - INCOMING - 1e-6) { P.only = 1; P.bfall = d < T_BDROP - INCOMING - 1e-6 ? 0 : d < T_BLAND - INCOMING - 1 / 12 - 1e-6 ? 1 : d < T_BLAND - INCOMING - 1e-6 ? 2 : 3; if (P.bfall >= 2) P.flap = 0; }
        if (d >= 2.0) P.dq = clamp01((d - 2.0) / 0.5);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 24);
    const b = parts.onShaft(P, MAUL, -3); P.bhx = b[0]; P.bhy = b[1]; P.ba = P.a;
    const R = parts.rig(P, BODY);
    if (st === CHARGE || st === CAST) { P.gx = R.sFx - 2 + P.bx; P.gy = R.yS + 4; }     // 蓄力 / 施放：轮廓光源 = 胸甲徽记
    else { P.gx = R.hx + 3 + P.bx; P.gy = R.htop + RD(R.hh * 0.4) + 1; }              // 平时 = 盔缝里的眼光
    KEY(P);
  }

  // ───── 画 ─────
  const rot = (u, v, q) => (q === 0 ? [u, v] : q === 1 ? [-v, u] : q === 2 ? [-u, -v] : [v, -u]);
  const glow = (lv) => (lv === 4 ? [M.soul, 1] : lv === 3 ? [M.hot, 4] : lv === 2 ? [M.hot, 3] : lv === 1 ? [M.soul, 4] : [M.soul, 3]);
  // 候选部件：soulMaul 魂钉巨锤（直柄 + 8×6 平头锤，锤面一圈 6 颗魂光铆钉 = 发光体，和锤头同一部件；锤头整 90° 换朝向，柄用直线插进套口）
  const MAUL_ROWS = ['.HMMMMm.', 'MGMMMMGM', 'MMMGMMMm', 'MmMMGMMm', 'MGMMMMGM', '.mmTTmm.'];
  function soulMaul(T, gx, gy, a, lv) {
    const dx = Math.sin(a), dy = -Math.cos(a), sx = RD(gx + dx * MAUL.len), sy = RD(gy + dy * MAUL.len), bx = gx - dx * MAUL.back, by = gy - dy * MAUL.back, q = ((RD(a / HALF) % 4) + 4) % 4;
    E.part(); parts.line(E, T, bx, by, sx, sy, M.pole, 3); px(E, T, bx, by, M.trim, 4);
    E.part(); const G = glow(lv);
    for (let r = 0; r < 6; r++) for (let c = 0; c < 8; c++) {
      const ch = MAUL_ROWS[r][c]; if (ch === '.') continue;
      const role = ch === 'M' ? [M.limb, 0] : ch === 'm' ? [M.limb, 2] : ch === 'H' ? [M.limb, 4] : ch === 'T' ? [M.trim, 0] : G;
      const d = rot(c - 3, r - 5, q); px(E, T, sx + d[0], sy + d[1], role[0], role[1]);
    }
  }
  // 候选部件：skullPauldron 骷髅肩甲（6×5：颅顶高光、两个眼窝、牙排；眼窝可以换成发光材质）
  const SKULL = ['.BBBB.', 'BBBBBh', 'BkBBkB', 'BBBBBB', '.BtBt.'];
  function skull(T, cx, cy, m, lit) {
    E.part();
    for (let r = 0; r < 5; r++) for (let c = 0; c < 6; c++) {
      const ch = SKULL[r][c]; if (ch === '.') continue;
      if (ch === 'k') px(E, T, cx + c - 3, cy + r - 2, lit ? M.soul : M.sock, lit ? (lit > 1 ? 4 : 3) : 2);
      else px(E, T, cx + c - 3, cy + r - 2, m, ch === 'h' ? 4 : ch === 't' ? 1 : 0);
    }
  }
  // 候选部件：legionBanners 背旗组（n 面方旗插在背后：旗杆顶钢尖、旗箍、破边下摆、外侧两列随风错位、每面一个 3×3 徽记；lit 面数亮魂光）
  const FLAG = ['TTTTTTT', 'FFFFFFF', 'FFFFFFF', 'FFFFFFF', 'FFFFFFF', 'F.FF.F.'];
  const EMB = [['BBB', 'kBk', '.B.'], ['G.G', 'GGG', 'GGG'], ['B.B', 'B.B', '.B.']];     // 领主徽记：骷髅 · 王冠 · 双角
  const POLE = [[0, 27, -0.15], [-2, 24, -0.35], [-4, 20, -0.7]];                        // [底座 x 偏移, 杆长, 后倾角]
  function bannerGeo(R, i) {
    const e = parts.edges(R, R.yS + 3), p = POLE[i], down = P.bfall >= 1, fd = i === 1 ? 1 : -1, th = P.bfall === 2 ? fd * PI / 4 : P.bfall === 3 ? fd * HALF : p[2];   // 中间那面向前倒，另外两面向后倒
    const bx = e[0] + 3 + p[0], by = down ? 0 : R.yWaist, L = p[1] + (down ? -2 : 0);
    return { bx, by, tx: RD(bx + Math.sin(th) * L), ty: RD(by - Math.cos(th) * L), q: P.bfall === 3 ? 1 : 0 };
  }
  function banner(R, i) {
    const g = bannerGeo(R, i), lit = P.flags > 2 - i ? 1 : 0;             // 从最靠后的一面开始亮
    E.part(); parts.line(E, R, g.bx, g.by, g.tx, g.ty, M.pole, 3); px(E, R, g.tx, g.ty - (g.q ? 0 : 1), M.trim, 4);
    E.part();
    for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
      let ch = FLAG[r][c]; const u = -1 - c, v = r + 1;
      if (r >= 1 && r <= 3 && c >= 2 && c <= 4) { const e = EMB[i][r - 1][c - 2]; if (e !== '.') ch = e; }
      if (ch === '.') continue;
      const fl = c >= 5 ? ((P.flap + i) & 2 ? -1 : 1) * (c - 4 > 1 ? 1 : 0) + (c === 5 && ((P.flap + i) & 1) ? -1 : 0) : 0;   // 外侧两列随风上下错位
      const role = ch === 'T' ? (lit ? [M.soul, 3] : [M.pole, 0]) : ch === 'F' ? [M.flag, 0] : ch === 'k' ? [M.flag, 1] : (lit ? [M.hot, 4] : ch === 'G' ? [M.gold, 0] : [M.bone, 0]);
      const d = rot(u, v + fl, g.q); px(E, R, g.tx + d[0], g.ty + d[1], role[0], role[1]);
    }
  }
  // 候选部件：kneelLegs 粗短腿单膝跪（腿粗 ≥ 4 时库里的跪姿读不出来）：远侧大腿竖直、膝盖着地，小腿平放向后、靴尖点地；
  //   近侧大腿水平前伸、膝甲外凸一格亮，小腿竖直落地——两腿之间在裙甲下面留出一块空，单膝跪地一眼读得出
  function kneelLegs(R) {
    const yh = R.yHip, bx = R.hipBx, fx = R.hipFx, mB = M.limbD, mF = M.limb;
    E.part();
    for (let y = yh + 1; y <= 0; y++) run(E, R, y, bx - 2, bx + 2, mB, 0);                 // 远侧大腿竖直，膝盖着地
    for (let y = -2; y <= 0; y++) run(E, R, y, bx - 8, bx - 3, mB, 0);                     // 小腿平放向后
    run(E, R, -3, bx - 10, bx - 9, mB, 0); for (let y = -2; y <= 0; y++) run(E, R, y, bx - 10, bx - 9, mB, 0); px(E, R, bx - 10, -3, mB, 3);   // 靴：脚跟抬起、靴尖点地
    E.part();
    for (let y = yh; y <= yh + 3; y++) run(E, R, y, fx - 2, fx + 6, mF, 0);                // 近侧大腿水平前伸
    for (let y = yh + 4; y <= 0; y++) run(E, R, y, fx + 3, fx + 6, mF, 0);                 // 小腿竖直落地
    px(E, R, fx + 7, 0, mF, 0); px(E, R, fx + 8, 0, mF, 3);                                // 前脚尖
    px(E, R, fx + 7, yh + 1, mF, 0); px(E, R, fx + 7, yh, mF, 4); px(E, R, fx + 6, yh, mF, 4);   // 膝甲外凸、受光
  }
  // 板甲受光：左上肩线和胸甲上沿各一段 iron 亮段（夜景里把倒三角肩线提出来）；和躯干同一个部件
  function plateLight(R) {
    const e0 = parts.edges(R, R.yS); run(E, R, R.yS, e0[0] + 1, e0[0] + 4, M.plate, 4);
    for (let y = R.yS + 1; y <= R.yS + 4; y++) px(E, R, parts.edges(R, y)[0] + 1, y, M.plate, 4);
    const e3 = parts.edges(R, R.yS + 3); run(E, R, R.yS + 3, e3[0] + 2, e3[0] + 4, M.plate, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    if (P.only !== 2) for (let i = 2; i >= 0; i--) banner(R, i);
    if (P.only === 1) return;                                           // 化灰之后只剩战旗（only 2 = 只画身体，给化灰拆碎片用）
    parts.cape(E, R, P, { style: 'tattered', mat: M.cape, flare: 5 });
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.limbD, grip: 'none' });
    skull(R, R.sBx, R.sBy - 3, M.boneD, 0);
    if (R.kneel) kneelLegs(R); else parts.legs(E, R, P, { style: 'greave', mat: M.limb, matD: M.limbD, boot: M.limb, bootD: M.limbD });
    parts.torso(E, R, P, { style: 'plate', mat: M.plate, belt: M.belt, buckle: M.trim, emblem: P.gem >= 2 && P.gem <= 3 ? M.hot : M.soul, emblemStyle: 'diamond' });
    plateLight(R);
    parts.helm(E, R, P, { style: 'great', mat: M.limb, trim: M.trim, eye: P.gem >= 2 && P.gem <= 3 || P.glint ? M.hot : M.soul });
    parts.horns(E, R, P, { mat: M.horn, size: 9, curve: 'crescent', band: M.trim });
    soulMaul(R, P.hx, P.hy, P.a, P.gem);
    parts.hand(E, R, P, { side: 'B', hand: M.limbD, grip: 'big' });
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.limb, hand: M.limb, grip: 'big', cuff: M.trim, cuffStyle: 'bracer' });
    skull(R, R.sFx, R.sFy - 3, M.bone, P.flags >= 3 ? (P.gem === 3 ? 2 : 1) : 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let smT = 9, domeT = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s === CAST) { burst(wx(P.gx), wy(P.gy), 12, 30, 70, 0.2, 0.45, R_EL, 6); }
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_STRIKE) < 1e-9) {
      poseAt(ATTACK, t, t); smT = 0;
      const hx = DUMMY_X - 1, hy = HY - 3;
      hitDummy(0); burst(hx, hy, 14, 40, 110, 0.15, 0.4, R_IMP, 16); fx.cross(hx, hy - 2, 4, R_IMP, 0.2);
      for (let i = 0; i < 10; i++) spawn(K_DUST, hx - 8 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 40, -10 - Math.random() * 16, 0.4 + Math.random() * 0.3, FXI.dust);
      fx.crack(hx, HY + 1, 6, 1, FXI.dust, 0.5); fx.crack(hx, HY + 1, 6, -1, FXI.dust, 0.5); shake(0.12, 1);
      sfx('swing', { kind: 'smash', w: 1.0 }); sfx('hit', { mat: 'stone', w: 1.0 });
    }
    if (s === CAST && Math.abs(t - T_SLAM) < 1e-9) {                  // 砸地：三面战旗的位置各冲起一道魂光柱
      poseAt(CAST, t, t); const R = parts.rig(P, BODY);
      for (let i = 0; i < 3; i++) { const g = bannerGeo(R, i); fx.pillar(wx(g.tx + P.bx), 2, wy(0), 2, R_EL, 0.55, 0); burst(wx(g.tx + P.bx), wy(g.ty), 8, 30, 70, 0.3, 0.6, R_EL, 8); }
      const mx = wx(P.hx + P.bx + 7), my = HY;
      releaseOrbit(50, 110, 0.3, 0.7, { pts: 1 }); ring(mx, my - 2, 1, R_EL); fx.crack(mx, HY + 1, 12, 1, R_EL, 0.7); fx.crack(mx, HY + 1, 10, -1, R_EL, 0.7);
      for (let i = 0; i < 16; i++) spawn(K_DUST, mx - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 50, -10 - Math.random() * 18, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'shadow', w: 1.0 });
    }
    if (s === CAST && Math.abs(t - T_DOME) < 1e-9) {                  // 作用在自己身上：点阵护盾罩住全身
      fx.dome(HX + P.mx, HY - 1, 20, 46, R_EL, 0.8, 2); domeT = 0; shake(0.12, 1); sfx('impact', { pal: 'metal', w: 0.7 });
    }
    if (s === DEATH && Math.abs(t - T_KNEEL) < 1e-9) { for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 12 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.9 }); }
    if (s === DEATH && Math.abs(t - T_ASH) < 1e-9) {                   // 化灰：只拆身体（战旗留着，之后落地）
      poseAt(DEATH, t, t); P.only = 2; P.dq = 0.2; drawHero(); bakeHero();
      hero.k1 = -1; death.start('ash', { ramp: R_EL });
    }
    if (s === DEATH && Math.abs(t - T_BDROP) < 1e-9) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 14 + Math.random() * 10, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); }
    if (s === DEATH && Math.abs(t - T_BLAND) < 1e-9) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 40 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); shake(0.08, 1); sfx('fall', { w: 0.4 }); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_SLAM, T_DOME], [], [], [T_KNEEL, T_ASH, T_BDROP, T_BLAND], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                            // 四面八方的亡魂定点汇聚到胸甲，到了就绕胸口转
      const tx = wx(P.gx), ty = wy(P.gy);
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 18 + Math.random() * 14; spawnX(K_SPIRAL_PT, tx, ty, r / (0.4 + Math.random() * 0.35), 0, 1.2, R_EL, { a, r, w: 1.5 + Math.random() * 2, orbitR: 4 + Math.random() * 3, orbitW: 6 }); }
    }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 1.0 }); shake(0.08, 1); for (let i = 0; i < 4; i++) spawn(K_DUST, wx(P.step > 0 ? 4 : -4) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === RECOVER && stT < 0.4) { soulAcc += dt * 10; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_EMBER, wx(-10 + Math.random() * 22), wy(-6 - Math.random() * 34), (Math.random() - 0.5) * 8, -10 - Math.random() * 10, 0.4 + Math.random() * 0.3, R_EL); } }
    smT += dt; domeT += dt;
  }
  function fxReset() { smT = 9; domeT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (P.rim >= 2) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (smT < 2 / 12) {                                                // 锤头弧形拖影：从过顶到砸地
      const c = smT < 1 / 12 ? FXR[R_IMP][1] : FXR[R_IMP][2], cx = HX + 2 + K_SLAM.hx, cy = HY + K_SLAM.hy + 1;
      for (let k = 0; k <= 16; k++) { if ((k & 1) && smT >= 1 / 12) continue; const a = K_RAISE.a + (K_SLAM.a - K_RAISE.a) * k / 16; for (let o = 0; o < (smT < 1 / 12 ? 2 : 1); o++) put(RD(cx - 9 + Math.sin(a) * (14 - o)), RD(cy - Math.cos(a) * (14 - o)), c); }
    }
    const t = domeT - 0.35;                                             // 护盾的点变成黑铁甲片纹（守护）：钢色 2 格短横，逐帧抖动消散
    if (t >= 0 && t < 0.6) {
      const R = FXR[R_ST], cx = HX + P.mx, cy = HY - 1, n = 22, fade = clamp01((t - 0.25) / 0.35);
      for (let k = 0; k <= n; k++) {
        const a = PI + k / n * PI, x = RD(cx + Math.cos(a) * 20), y = RD(cy + Math.sin(a) * 46 * 0.98); if (bayer(x, y) < fade) continue;
        const c = t < 0.08 ? R[0] : ((k + f12) & 1) ? R[2] : R[3]; put(x, y, c); put(x + 1, y, c === R[0] ? R[1] : R[4]);
        if ((k % 3) === 0 && k > 0 && k < n) put(x + (x < cx ? 1 : -1), y + 2, R[3]);
      }
    }
  }

  return {
    name: '混沌卫黑卡托斯', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.soul, M.hot], HIT_POINT: [2, -22], EVENTS, deathKit: { mode: 'ash', at: T_ASH },
    SFX: { body: 'armor', how: 'dissolve', pal: 'shadow', style: 'shield', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
