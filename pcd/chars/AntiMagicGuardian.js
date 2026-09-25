// 破魔守卫（部队 · 兽人 · 先锋 · 传说）：魔盾兵升级后的同一个兽人——青铜符文塔盾长成秘银破魔塔盾（金框、两侧翼形护边、獠牙护角包金、
// 盾心一只立体的「破魔之眼」）、鳍冠盔的鳍更高（6 格）、头后浮着一圈 6 块转动的符文石板、叠片肩甲长成三层带尖刺的巨肩甲并各套一个符文环，
// 胸口嵌紫色符文核心，腰间垂锁甲裙。「究极奥术护甲」：甲里其实是空的，死的时候盔甲散架，只剩一团紫光。
// 攻击 = 塔盾往前顶 4 格再往上一掀；技能 =「破魔」：盾心之眼睁开，把飞来的敌方魔法弹吸住、绕眼半圈、一眨眼吞掉，放出一圈贴地推开的银白破魔环，把目标去色、抽走它头上的一点紫光。
PCD.define('AntiMagicGuardian', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp, bayer,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_STILL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, px = parts.px, run = parts.run;

  // ───── 元素：破魔 · 符文紫（主色阶沿用魔盾兵）+ 秘银白（破魔环 = 共享 steel 色阶，「去色」的银白）─────
  const R_EL = fxRamp('runeward', [21, 43, '#8a5ce0', 42, 52]), EL = FXR[R_EL], R_ST = FXI.steel, ST = FXR[R_ST], R_IMP = FXI.impact, EN = FXR[FXI.enemy];
  const MITH = ['#2a2e3e', '#6a7288', '#b0b8c8', '#e8ecf4'];                          // 秘银白甲 [勾线, 暗, 基, 亮]

  // ───── 材质（shd / sgold 是盾自己的材质：轮廓光只照盾沿）─────
  const M = parts.mats(E, {
    mith: MITH, shd: MITH, sgold: 'gold', gold: 'gold', mail: 'steel', boot: 'steel', tusk: 'bone', stone: 'pale',
    rune: { r: [42, '#8a5ce0', 43, 21], flat: 1 }, white: { r: [7, 18, 17, 21], flat: 1 }, void: { r: [0, 52, 0, 0], flat: 1 },
  });
  const BODY = { body: 'heroic', sw: 6, limb: 1.45, lw: 4, neck: 1 };
  const HR_X = 10, HR_Y = 9;                                                 // 头后符文环的横 / 竖半径
  const HX = 75, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 58, 34, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 9, 14, 18], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of Object.keys(M)) if (k !== 'shd' && k !== 'sgold') RIM.skip[M[k]] = 1;

  // ───── 姿势：前手 = 盾把手（盾心 x = 手 +5，盾顶 = 手 −11），盾不跟着呼吸和步子晃 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, lid: 0, pupil: 0, halo: 0, ring: 0, core: 0, drop: 0, tilt: 0, rim: 0, eyes: 0, mist: 0, flash: 0, dq: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(4, -10, 2, -9, 0, 0, 0);        // 如山不动：塔盾底边拄在地上，盾顶在面甲缝下面
  const K_WALK = K(4, -13, 2, -12, 0, 0, 0);       // 走路时盾提起 3 格，露出脚
  const K_WIND = K(2, -12, 0, -11, -1, 0, 2);
  const K_PUSH = K(8, -11, 6, -10, 1, 1, 1);       // 塔盾往前顶 4 格
  const K_FLIP = K(7, -15, 5, -14, 1, 0, 0);       // 盾沿再往上一掀（下沿往前、上沿往后）
  const K_HOLD = K(6, -13, 4, -12, 1, 0, 0);
  const K_BRACE = K(4, -11, 2, -10, 1, 0, 1);      // 蓄力：塔盾正对前方
  const K_CAST = K(5, -11, 3, -10, 1, 1, 1);
  const K_HURT = K(2, -11, 0, -10, -1, -1, 1);
  const K_SLUMP = K(3, -12, 1, -11, 1, -1, 2);       // 死亡：盔甲撑不住往前一沉
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['lid', 0, 2], ['pupil', -1, 1], ['halo', 0, 11],
    ['ring', 0, 3], ['core', 0, 3], ['drop', 0, 6], ['tilt', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['mist', 0, 1], ['flash', 0, 1], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const PUPIL = [0, 1, 1, 0, -1, -1];                                   // 待机个性：破魔之眼左右扫视（每 0.4 s 一格）
  const T_PUSH = 2 / 12, T_FLIP = 4 / 12, T_SWEEP = 0.15, T_BREAK = INCOMING + 0.72, T_CLANK = INCOMING + 1.02;
  const SH_HW = 6, SH_H = 22, EYE_R = 8;
  const eyeOf = (k) => [k.hx + 5, k.hy - 11 + EYE_R + Math.min(3, k.crouch)];   // 某个关键姿势下的眼心（本地坐标）
  const EYE_CH = eyeOf(K_BRACE);

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.lid = 0; P.pupil = 0; P.core = 1; P.drop = 0; P.tilt = 0; P.rim = 0;
    P.eyes = 0; P.mist = 0; P.flash = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    P.halo = Math.floor(TT * 5 + 1e-6) % 12; P.ring = Math.floor(TT * 5 / 3 + 1e-6) % 4;   // 2.4 s 转 60°（6 块石板对称，正好接上）
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.pupil = PUPIL[b % 6];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { P.mist = 1; P.pupil = 0; }   // 面甲缝里喷出一口紫雾
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 重甲缓步：接触帧顿挫 1 格，盾和符文环不晃
      setK(K_WALK, K_WALK, 0); parts.gait(P, E.gait(tq)); P.beard = 0; P.sway = 0;
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                          // 盾推 4 格 → 上掀
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; }
      else if (tq < T_FLIP - 1e-6) { setK(K_PUSH, K_PUSH, 0); P.gem = 2; }
      else if (tq < 0.45) { setK(K_FLIP, K_FLIP, 0); P.tilt = 1; P.gem = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.gem = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                          // 眼睁开，符文粒子被逆螺旋吸进眼里，符文环越转越快
      setK(K_IDLE, K_BRACE, ease.inOut(clamp01(tq / 0.5)));
      P.lid = tq < 1 / 12 ? 2 : tq < 2 / 12 ? 1 : 0; P.pupil = 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.core = tq < 0.5 ? 1 : 2; P.rim = tq < 0.3 ? 0 : 2;
      P.halo = Math.floor(tq * 5 + tq * tq * 10 + 1e-6) % 12; P.ring = Math.floor(tq * 3 + tq * tq * 6 + 1e-6) % 4;
    } else if (st === CAST) {                                            // 一眨眼吞掉魔法弹，放出破魔环
      setK(K_BRACE, K_CAST, ease.out(clamp01(tq / 0.12))); P.lid = tq < 1 / 12 ? 2 : 0; P.gem = 3; P.core = 3; P.rim = tq < 0.25 ? 3 : 2;
      P.halo = Math.floor(tq * 30 + 1e-6) % 12; P.ring = Math.floor(tq * 20 + 1e-6) % 4;
    } else if (st === RECOVER) {                                         // 眼睛合上一半，符文环减速
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q);
      P.lid = tq < 0.2 ? 0 : tq < 0.35 ? 1 : tq < 0.45 ? 2 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.core = q < 0.5 ? 2 : 1; P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0;
      P.halo = Math.floor(tq * 12 - tq * tq * 6 + 1e-6) % 12; P.ring = Math.floor(tq * 8 - tq * tq * 4 + 1e-6) % 4;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.lid = 2; P.flash = h < 1 / 12 ? 1 : 0; P.halo = (P.halo + 2) % 12; P.ring = (P.ring + 1) % 4; }   // 符文环被震得跳一格
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.lid = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 眼闭上 → 符文石板一块块掉下来 → 盔甲按部件散架（死亡套件 parts）→ 只剩一团紫光
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.lid = d < 0.15 ? 1 : 2; P.core = (f12 & 1) ? 2 : 1; P.halo = 0; P.ring = 0; P.crouch = d < 0.15 ? 1 : 2; }
      else { setK(K_SLUMP, K_SLUMP, 0); P.bx = -2; P.eyes = 1; P.lid = 2; P.core = (f12 % 3) === 0 ? 1 : 0; P.halo = 0; P.ring = 0; P.drop = Math.min(6, 1 + Math.floor((d - 0.3) / 0.06 + 1e-6)); P.gem = 4; if (d >= 0.72) P.dq = 1; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.gem = 1;
    }
    const yo = Math.min(3, RD(P.crouch));                               // 手（盾）只跟着下蹲，不跟呼吸和步子起伏
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    P.gx = P.hx + 5 + P.bx; P.gy = P.hy - 11 + EYE_R;                    // 发光体 = 盾心之眼
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：runeHalo —— 头后浮空的一圈符文石板：6 块 2×3 石板排在圆上（横半径 HR_X 10、竖半径 HR_Y 9），按 P.halo 转动（每档 5°），每块中间一格符文，
  //   P.drop 块已经掉下去（不画，掉落的石板由特效层接着画）
  function runeHalo(R) {
    E.part(); const cx = R.hx - 2, cy = R.htop + 2 - R.bob, tn = P.gem >= 4 ? 1 : P.gem >= 2 ? 3 : 2;
    for (let k = 0; k < 6; k++) {
      const a = (P.halo * 5 + k * 60) * Math.PI / 180, x = cx + RD(Math.cos(a) * HR_X), y = cy + RD(Math.sin(a) * HR_Y);
      if (k < P.drop) continue;
      for (let dy = -1; dy <= 1; dy++) { px(E, R, x - 1, y + dy, M.stone, 0); px(E, R, x, y + dy, M.stone, 0); }
      px(E, R, x, y, M.rune, tn); px(E, R, x - 1, y - 1, M.stone, 4);
    }
  }
  // 候选部件：layerPauldron（尖刺版）—— 三层叠片巨肩甲：每层 2 行（上行秘银、下行一道金边），一层比一层宽，最下一层比躯干宽出 3 格；
  //   三根尖刺：顶上一根朝上，两层外端各一根朝外上。肩上套一个转动的符文环（横椭圆 10 个点，隔一个一格符文）：后半圈在 ringBack 里先画，前半圈和肩甲同一个部件
  function ringDots(x, y, front, cb) {
    for (let k = 0; k < 10; k++) { const a = (k * 36 + P.ring * 9) * Math.PI / 180, s = Math.sin(a); if ((s >= 0) !== front) continue; cb(x + RD(Math.cos(a) * 6), y + RD(s * 2), k); }
  }
  function ringBack(R, x, y) { E.part(); ringDots(x, y, false, (X, Y, k) => px(E, R, X, Y, k & 1 ? M.gold : M.rune, k & 1 ? 2 : Math.max(1, Math.min(3, P.gem + 1)))); }
  function pauldron(R, x, y, m, dir) {
    E.part();
    run(E, R, y - 5, x - 1, x + 1, m, 0); run(E, R, y - 4, x - 2, x + 2, M.gold, 0);
    run(E, R, y - 3, x - 3, x + 3, m, 0); run(E, R, y - 2, x - 3, x + 3, M.gold, 0);
    run(E, R, y - 1, x - 4, x + 4, m, 0); run(E, R, y, x - 5, x + 4, M.gold, 0);
    px(E, R, x, y - 6, m, 0); px(E, R, x, y - 7, m, 4);                                         // 顶上的尖刺
    px(E, R, x + dir * 4, y - 3, m, 0); px(E, R, x + dir * 5, y - 4, m, 4);                      // 中层外端的尖刺
    px(E, R, x + dir * 5, y - 1, m, 0); px(E, R, x + dir * 6, y - 2, m, 0); px(E, R, x + dir * 7, y - 3, m, 4);   // 下层外端的尖刺
    px(E, R, x - 1, y - 3, m, 4); px(E, R, x - 2, y - 1, m, 4);
    ringDots(x, y - 2, true, (X, Y, k) => px(E, R, X, Y, k & 1 ? M.gold : M.rune, k & 1 ? 4 : Math.max(2, Math.min(4, P.gem + 2))));
  }
  // 候选部件：finHelm（秘银版）—— 鳍冠盔：闭口圆盔 + 金眉箍 + 面甲缝（里面是空的，只透出一对紫光）+ 口缝的金獠牙面饰 + 近侧金色獠牙形护颊；
  //   鳍冠高 6 格、齿尖包金，单独一个部件。P.mist 1 = 面甲缝的紫光亮一档（喷紫雾）
  const FIN = [2, 4, 3, 6, 3, 6, 4, 2];
  function finHelm(R) {
    const m = M.mith, x0 = R.hx0 - 1, x1 = R.hx1 + 1, top = R.htop, bot = R.hy, ey = R.ey, fx = R.hx1;
    E.part();
    run(E, R, top - 1, x0 + 1, x1 - 2, m, 0);
    for (let y = top; y <= bot; y++) run(E, R, y, x0, y === bot ? x1 - 1 : x1, m, 0);
    run(E, R, ey - 1, x0 + 1, x1, M.gold, 0);                                                    // 金眉箍
    run(E, R, ey, fx - 3, x1, M.void, 1);                                                         // 面甲缝（空的）
    if (!P.eyes) { const t = P.mist ? 4 : 3; px(E, R, fx, ey, M.rune, t); px(E, R, fx - 2, ey, M.rune, t - 1); }
    for (let y = ey + 2; y < bot; y++) px(E, R, x1, y, M.void, 1);
    px(E, R, x1 + 1, ey + 3, M.gold, 3); px(E, R, x1 + 1, ey + 2, M.gold, 4);                      // 金獠牙面饰
    px(E, R, x0 + 1, top + 1, m, 4); px(E, R, x0 + 1, bot - 1, M.gold, 4);
    px(E, R, fx - 2, bot + 1, M.gold, 0); px(E, R, fx - 1, bot + 1, M.gold, 0); px(E, R, fx - 1, bot + 2, M.gold, 0); px(E, R, fx, bot + 2, M.gold, 0); px(E, R, fx + 1, bot + 3, M.gold, 4);   // 护颊
    E.part();
    for (let i = 0; i < FIN.length; i++) { const x = x0 + i, base = x > x0 && x < x1 - 1 ? top - 2 : top - 1; for (let k = 0; k < FIN[i]; k++) px(E, R, x, base - k, k === FIN[i] - 1 ? M.gold : m, k === FIN[i] - 1 ? 4 : 0); }
  }
  // 腰间垂下的锁甲裙：链环纹（隔格亮暗、逐行错开），下摆一行锯齿，越往下越宽
  function mailSkirt(R) {
    E.part(); const y0 = R.yWaist + 1, y1 = R.yHip + 3;
    for (let y = y0; y <= y1; y++) {
      const e = parts.edges(R, Math.min(y, R.yHip)), t = (y - y0) / Math.max(1, y1 - y0), L = e[0] - RD(t * 1.5), Rr = e[1] + RD(t);
      for (let x = L; x <= Rr; x++) { if (y === y1 && (x & 1)) continue; px(E, R, x, y, M.mail, ((x + y) & 1) ? 3 : (y === y0 ? 2 : 4)); }
    }
  }
  // 胸口的符文核心（菱形 5 格，嵌在胸甲里）+ 甲缝里透出的两点紫光
  function core(R) {
    E.part(); const e = parts.edges(R, R.yS + 3), x = RD((e[0] + e[1]) / 2) - 2, y = R.yS + 4, c = P.core;
    const tc = c === 0 ? 1 : c === 1 ? 3 : 4, to = c === 0 ? 1 : c === 1 ? 2 : 3;
    px(E, R, x, y, M.rune, tc); px(E, R, x - 1, y, M.rune, to); px(E, R, x + 1, y, M.rune, to); px(E, R, x, y - 1, M.rune, to); px(E, R, x, y + 1, M.rune, to);
    const w = parts.edges(R, R.yWaist - 1); px(E, R, w[0] + 1, R.yWaist - 1, M.rune, Math.max(1, to - 1)); px(E, R, w[0] + 2, R.yS + 6, M.rune, Math.max(1, to - 1));
  }
  // 候选部件：runeTower（秘银破魔版）—— 同一面符文塔盾升级：13×22，金框、上沿獠牙护角包金、两侧翼形护边（一格两格交替的羽边）、
  //   盾心一只立体的「破魔之眼」（金框杏眼 + 白眼 + 紫瞳；P.pupil 左右转、P.lid 0 睁 · 1 半闭 · 2 闭），眼两侧两列竖排符文、眼下一列（都带暗刻槽）；
  //   P.tilt 1 = 上掀（下沿往前 1、上沿往后 1）
  const WING = [0, 0, 1, 2, 1, 2, 1, 1];
  function tower(R, cx, top) {
    const hw = SH_HW, h = SH_H, sh = (r) => (P.tilt ? (r < 7 ? -1 : r > 14 ? 1 : 0) : 0), tn = P.gem >= 4 ? 1 : P.gem === 0 ? 2 : P.gem >= 3 ? 4 : 3;
    E.part();
    for (const s of [-1, 1]) { const x = cx + s * hw + sh(0); px(E, R, x, top - 1, M.sgold, 0); px(E, R, x - s, top - 1, M.sgold, 0); px(E, R, x, top - 2, M.tusk, 0); px(E, R, x - s, top - 3, M.tusk, 4); }
    for (let r = 0; r < h; r++) {
      const y = top + r, d = sh(r), w = WING[r] || 0, L = cx - hw + d, Rr = cx + hw + d;
      run(E, R, y, L, Rr, M.shd, 0);
      if (r === 0 || r === h - 1) run(E, R, y, L, Rr, M.sgold, 0); else { px(E, R, L, y, M.sgold, 0); px(E, R, Rr, y, M.sgold, 0); }
      if (w) { run(E, R, y, L - w, L - 1, M.shd, 0); run(E, R, y, Rr + 1, Rr + w, M.shd, 0); px(E, R, L - w, y, M.shd, 4); px(E, R, Rr + w, y, M.shd, 2); }
    }
    const ex = cx + sh(EYE_R), ey = top + EYE_R, gy = (r) => cx + sh(r);
    for (const c of [-4, 4]) for (let r = 2; r <= h - 3; r++) { if (r >= 6 && r <= 10) continue; px(E, R, gy(r) + c, top + r, M.shd, 2); }   // 暗刻槽
    for (let r = 12; r <= h - 3; r++) px(E, R, gy(r), top + r, M.shd, 2);
    const glyph = (x, y, d, k) => { px(E, R, x, y, M.rune, tn); px(E, R, x, y + 1, M.rune, Math.max(1, tn - (tn === 4 ? 1 : 0))); if (k & 1) px(E, R, x + d, y + (k & 2 ? 1 : 0), M.rune, Math.max(1, tn - 1)); };
    [2, 12, 15, 18].forEach((r, k) => { glyph(gy(r) - 4, top + r, -1, k); glyph(gy(r) + 4, top + r, 1, k + 1); });
    [13, 16].forEach((r, k) => glyph(gy(r), top + r, k ? 1 : -1, k + 1));
    px(E, R, cx - 2 + sh(3), top + 3, M.shd, 4); px(E, R, cx - 2 + sh(4), top + 4, M.shd, 4); px(E, R, cx + 2 + sh(19), top + 19, M.shd, 4);   // 盾面冷光
    // 破魔之眼：金框杏眼 7×5
    run(E, R, ey - 2, ex - 2, ex + 2, M.sgold, 0); run(E, R, ey + 2, ex - 2, ex + 2, M.sgold, 0);
    for (let dy = -1; dy <= 1; dy++) { px(E, R, ex - 3, ey + dy, M.sgold, 0); px(E, R, ex + 3, ey + dy, M.sgold, 0); }
    px(E, R, ex - 2, ey - 2, M.sgold, 4); px(E, R, ex - 3, ey - 1, M.sgold, 4);
    const pt = P.gem >= 4 ? 1 : P.gem === 0 ? 2 : P.gem;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
      let m = M.white, t = 3;
      if (P.lid === 2 || (P.lid === 1 && dy === -1)) { m = M.shd; t = P.lid === 2 && dy === 0 ? 1 : dy === -1 ? 4 : 3; }
      else if (dx === P.pupil) { m = M.rune; t = dy === 0 ? Math.min(4, pt + 1) : pt; }
      else if (Math.abs(dx - P.pupil) === 1 && dy === 0) { m = M.rune; t = 1; }
      px(E, R, ex + dx, ey + dy, m, t);
    }
    if (P.lid === 0) px(E, R, ex + (P.pupil < 0 ? 1 : -2), ey - 1, M.white, 4);                 // 眼白高光（立体感）
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY);
    runeHalo(R);
    ringBack(R, R.sBx, R.yS + 1);
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.mithD, hand: M.gold, grip: 'big' });
    pauldron(R, R.sBx, R.yS + 3, M.mith, -1);
    parts.legs(E, R, P, { style: 'greave', mat: M.mith, matD: M.mithD, boot: M.boot, bootD: M.bootD, bootH: 3 });
    parts.torso(E, R, P, { style: 'plate', mat: M.mith, belt: M.gold, buckle: M.gold, hem: R.yWaist + 1 });
    mailSkirt(R);
    core(R);
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.mith, hand: M.gold, grip: 'big' });
    ringBack(R, R.sFx, R.yS + 1);
    pauldron(R, R.sFx, R.yS + 3, M.mith, 1);
    finHelm(R);
    tower(R, P.hx + 5, P.hy - 11);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let pushT = 9, flipT = 9, chargeAcc = 0, soulAcc = 0, mistAcc = 0, lastStep = 0, lastDrop = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const HALO_C = () => [-4, -23];                                           // 死亡时符文环的圆心（本地坐标：K_SLUMP 姿、bx −2）
  function onEnter(s) {
    if (s === CAST) {                                                    // 吞弹：银白十字星芒 + 贴地推开的破魔环
      const ex = wx(P.gx), ey = wy(P.gy);
      releaseOrbit(40, 100, 0.3, 0.6, { pts: 1, ramp: R_ST });
      fx.cross(ex, ey, 8, R_ST, 0.35); burst(ex, ey, 8, 20, 50, 0.1, 0.3, R_ST, 0);
      ring(ex, HY - 3, 1, R_ST); fx.wave(ex, HY, 1, 14, 3, R_ST, 0.45); fx.wave(ex - 2, HY, -1, 12, 3, R_ST, 0.45);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'metal', w: 1.0 });
    }
    if (s === RECOVER) { const ex = wx(P.gx), ey = wy(P.gy); burst(ex, ey, 10, 20, 60, 0.2, 0.45, R_EL, 4); fx.cross(ex, ey, 4, R_EL, 0.2); }   // 抽回来的紫光落进眼里
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_PUSH) {                                   // 盾推
      pushT = 0; const X = wx(P.gx + SH_HW + 2), Y = wy(P.gy + 2);
      hitDummy(0); burst(X, Y, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(X, Y, 4, R_IMP, 0.2);
      for (let i = 0; i < 3; i++) spawn(K_DUST, wx(2) + Math.random() * 3, HY, -18 - Math.random() * 16, -4 - Math.random() * 5, 0.3, FXI.dust);
      sfx('swing', { kind: 'smash', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.8 });
    }
    if (s === ATTACK && t === T_FLIP) {                                   // 上掀：盾下沿往上撩出一道弧，假人被掀得晃一下
      flipT = 0; const X = wx(P.gx + SH_HW + 2), Y = wy(P.gy + 8);
      fx.slash(wx(P.gx), wy(P.gy), 12, 2.2, 0.9, R_ST, 0.17, 2, 2); hitDummy(0, 1); burst(X, Y - 6, 8, 30, 80, 0.15, 0.3, R_IMP, 30);
      sfx('hit', { mat: 'metal', w: 0.5 });
    }
    if (s === CAST && t === T_SWEEP) {                                    // 破魔环扫过假人：描一圈银白、整片去色，头上的紫光被抽走
      dummyFx({ dur: 1.0, outline: R_ST, fill: R_ST, tint: R_ST }); hitDummy(1); shake(0.12, 1);
      burst(DUMMY_X, HY - 16, 18, 40, 110, 0.25, 0.55, R_ST, 10); burst(DUMMY_X, HY - 31, 6, 10, 30, 0.2, 0.4, R_EL, 6);
      sfx('impact', { pal: 'metal', w: 0.8 });
    }
    if (s === DEATH && t === T_BREAK) {                                   // 盔甲散架（死亡套件 parts）：头盔、肩甲、塔盾、胸甲各自飞出落地
      poseAt(DEATH, T_BREAK - 1 / 12, T_BREAK - 1 / 12); P.dq = 0; drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.85, fromX: 0, fromY: -16, push: -6, fadeAt: 1.0, fadeDur: 0.6 }); shake(0.16, 1);
      burst(wx(-2), wy(-16), 16, 30, 80, 0.3, 0.6, R_EL, 10);
    }
    if (s === DEATH && t === T_CLANK) { for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 16 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.9 }); }
  }
  const EVENTS = [[], [], [T_PUSH, T_FLIP], [], [T_SWEEP], [], [], [T_BREAK, T_CLANK], []];
  function hurtFx(s) {                                                  // 秘银甲：火花又多又快，夹两三颗长寿命白火星
    const hx = HX + 12, hy = HY - 15;
    burst(hx, hy, s === DEATH ? 28 : 24, 60, 160, 0.2, 0.5, R_IMP, 20);
    for (let i = 0; i < 3; i++) spawn(K_BURST, hx, hy, 30 + Math.random() * 70, -40 - Math.random() * 40, 0.7 + Math.random() * 0.3, R_ST);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                             // 符文粒子被逆螺旋吸进眼里
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 12 + Math.random() * 8; spawn(K_SPIRAL_PT, wx(EYE_CH[0]), wy(EYE_CH[1]), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, -3 - Math.random() * 2); }
    }
    if (state === IDLE && P.mist) {                                     // 面甲缝里喷出的紫雾：往前飘、慢慢散
      mistAcc += dt * 16; while (mistAcc >= 1) { mistAcc -= 1; spawnX(K_DUST, wx(5), wy(-25 + P.bob), 10 + Math.random() * 14, -3 - Math.random() * 5, 0.5 + Math.random() * 0.3, R_EL, { age0: 0.2, sz: Math.random() < 0.3 ? 2 : 1 }); }
    }
    if (state === MOVE && P.step !== lastStep) {                        // 重步：3–4 颗尘 + 落脚处一格紫色符文余光
      if (P.step !== 0) {
        sfx('step', { w: 1.0 }); const fxX = wx(P.step > 0 ? 6 : -5);
        for (let i = 0; i < 4; i++) spawn(K_DUST, fxX + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 22, -5 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust);
        spawn(K_STILL, fxX, HY, 0, 0, 0.3, R_EL); spawn(K_STILL, fxX + 1, HY, 0, 0, 0.3, R_EL);
      }
      lastStep = P.step;
    }
    if (state === DEATH && P.drop !== lastDrop) { if (P.drop > lastDrop && P.drop > 0) { const c = HALO_C(); spawn(K_BURST, wx(c[0]), wy(c[1]), 0, 10, 0.3, R_EL); } lastDrop = P.drop; }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.3) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 22, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    pushT += dt; flipT += dt;
  }
  function fxReset() { pushT = 9; flipT = 9; chargeAcc = 0; soulAcc = 0; mistAcc = 0; lastStep = 0; lastDrop = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function orb(x, y, R, f12) { put(x, y, R[0]); put(x + 1, y, R[1]); put(x - 1, y, R[1]); put(x, y - 1, R[1]); put(x, y + 1, R[1]); if (f12 & 1) { put(x + 1, y - 1, R[2]); put(x - 1, y + 1, R[2]); } else { put(x - 1, y - 1, R[2]); put(x + 1, y + 1, R[2]); } }
  function fxFront(f12) {
    const st = E.state, t = E.stT, ex = wx(EYE_CH[0]), ey = wy(EYE_CH[1]);
    if (st === CHARGE && t >= 0.55) {                                    // 飞来的敌方魔法弹：0.7 s 在盾前被吸住，之后绕眼转半圈
      let x, y; if (t < 0.7) { const q = (q12(t) - 0.55) / 0.15; x = RD(140 + (ex + 9 - 140) * clamp01(q)); y = ey; }
      else { const a = ease.inOut(clamp01((q12(t) - 0.7) / 0.7)) * Math.PI; x = RD(ex + Math.cos(a) * 9); y = RD(ey - Math.sin(a) * 7); }
      orb(x, y, EN, f12); if (t >= 0.7 && (f12 & 1)) { put(x - 2, y, EL[2]); put(x + 2, y, EL[2]); put(x, y - 2, EL[2]); put(x, y + 2, EL[2]); }
    }
    if (st === CAST && t < 3 / 12) {                                     // 一眨眼吞下去：弹体变灰、逐格碎掉
      const k = Math.floor(t * 12 + 1e-6), x = ex - 4 + k * 2, y = ey;
      if (k === 0) orb(x, y, ST, f12); else if (k === 1) { put(x, y, ST[1]); put(x + 1, y, ST[2]); put(x, y - 1, ST[3]); } else put(x, y, ST[3]);
    }
    if (st === CAST && t >= T_SWEEP) {                                   // 从假人头上抽走的一点紫光，沿弧线飞回盾心
      const q = clamp01((q12(t) - T_SWEEP) / 0.33), x0 = DUMMY_X, y0 = HY - 31, x = RD(x0 + (ex - x0) * q), y = RD(y0 + (ey - y0) * q - Math.sin(q * Math.PI) * 8);
      put(x, y, EL[0]); put(x + 1, y, EL[1]); put(x, y + 1, EL[1]); put(x + 2, y + 1, EL[2]); put(x + 3, y + 1, EL[3]);
    }
    if (flipT < 2 / 12 && P.dq < 1) {                                    // 上掀的一道上撩拖影（盾下沿）
      const X = wx(P.gx + SH_HW + 2), Y = wy(P.gy + 12), c = flipT < 1 / 12 ? ST[1] : ST[2];
      for (let k = 0; k < 6; k++) { if (flipT >= 1 / 12 && (k & 1)) continue; put(X - 1 + RD(k * 0.4), Y - k, c); }
    }
    if (pushT < 2 / 12 && P.dq < 1) {                                   // 盾推的冲击波
      const x0 = wx(P.gx + SH_HW + 3) + (pushT < 1 / 12 ? 0 : 1), gy = wy(P.gy + 3);
      for (let dy = -10; dy <= 10; dy++) { if (pushT >= 1 / 12 && (dy & 1)) continue; const q = dy / 11, b = RD(2 * (1 - q * q)); put(x0 + b, gy + dy, pushT < 1 / 12 ? (Math.abs(dy) < 5 ? EL[0] : EL[1]) : EL[2]); }
    }
    if (P.gem === 3 && P.dq < 1) {                                       // 眼心星芒
      const gx = wx(P.gx), gy = wy(P.gy);
      for (let r = 4; r <= 6; r++) { const c = r <= 4 ? ST[0] : r <= 5 ? ST[1] : ST[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r - 1, c); put(gx, gy + r + 1, c); }
    }
    if (st === DEATH && t >= INCOMING + 0.3) {                           // 掉在地上的符文石板（死后和碎甲一起消散）
      const c = HALO_C(), fade = clamp01((t - T_BREAK - 1.0) / 0.6);
      for (let k = 0; k < 6; k++) {
        const td = INCOMING + 0.3 + k * 0.06; if (t < td) continue;
        const a = k * 60 * Math.PI / 180, x0 = wx(c[0] + RD(Math.cos(a) * HR_X)), y0 = wy(c[1] + RD(Math.sin(a) * HR_Y)), dt = q12(t - td), vx = Math.cos(a) * 14;
        const x = RD(x0 + vx * Math.min(dt, 0.4)), y = Math.min(HY - 1, RD(y0 + 0.5 * 420 * dt * dt));
        const down = y >= HY - 1;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 0; dx++) {
          const X = down ? x + dy : x + dx, Y = down ? HY - 1 + (dx + 1) - 1 : y + dy;
          if (bayer(X, Y) < fade) continue; put(X, Y, (dx === -1 && dy === -1) ? 60 : 59);
        }
        if (bayer(x, y) >= fade) put(down ? x : x, down ? HY - 1 : y, down ? 42 : EL[2]);
      }
    }
    if (st === DEATH && t >= T_BREAK && t < T_BREAK + 0.75) {           // 甲里是空的：原地只剩一团紫光，闪三下熄灭
      const k = Math.floor((t - T_BREAK) * 12 + 1e-6); if ((k % 4) < 2) { const x = HX - 3, y = HY - 16, big = k < 4; orb(x, y, EL, f12); if (big) { put(x + 2, y, EL[2]); put(x - 2, y, EL[2]); put(x, y - 2, EL[2]); put(x, y + 2, EL[2]); } }
    }
  }

  return {
    name: '破魔守卫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.rune], HIT_POINT: [10, -15], EVENTS, R_HURT: R_IMP,
    deathKit: { mode: 'parts', at: T_BREAK },
    SFX: { body: 'armor', how: 'shatter', pal: 'metal', style: 'nova', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
