// 哥布林直升机（部队 · 虚空 · 商人 · 普通 · 远程 600）：木桶改的圆座舱（两道黄铜箍 + 铆钉），哥布林探出上半身、一对大尖耳伸出座舱；
// 头顶一副 20 格宽的破旧两叶旋翼（一只桨尖耷拉），座舱前挂一对短双联炮，背后一台冒黑烟的小引擎，座舱底下吊着一只晃荡的金币袋（特性「美味」）。
// 攻击 = 双联炮上下交替点射两发小铜弹；技能 = 特性「美味」：哥布林搓手、金币袋鼓起发亮 → 扯开袋口，金币像雨一样洒下
// → 落地弹两下、每枚冒一颗金十字星、地上一圈金光环 → 赶紧扎紧袋口、心疼地摇头。
// 死亡 = 冒黑烟打着旋掉下来，摔散成木板（死亡套件 chunks），金币袋破开撒出一地金币。
// 会升级成「旋翼机」（Whirlybird.js）：保留旋翼、木桶座舱、哥布林大尖耳。
// 身体不用现成骨架：座舱、旋翼、双联炮、引擎排气管、金币袋是本模块自画的部件（候选部件见各函数前的注释）；驾驶员用 parts 人形的头、躯干、手臂。
PCD.define('GoblinCopter', (E) => {
  const { Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow, death, sfx, parts, B8 } = E;
  const RD = Math.round;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    brass: 'sand', wood: { r: 'wood', band: 2 }, iron: 'iron', skin: 'green', coat: 'leather', bag: 'leather', gold: 'gold',
    ink: { r: 'ink', flat: 1 }, eyeY: { r: [20, 14, 14, 5], flat: 1 }, glow: { r: [14, 5, 51, 21], flat: 1 },
  });
  const R_EL = FXI.coin, EL = FXR[R_EL], HX = 34, DUR = DEFAULT_DUR.slice();
  const SOOT = E.fxRamp('soot', [10, 9, 8, 52, 0]);                        // 引擎黑烟：暖灰 → 石 → 深石 → 墨紫 → 墨（色板内）
  const hero = new Sprite(60, 50, 30, 45);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  RIM.skip[M.glow] = RIM.skip[M.skin] = RIM.skip[M.skinD] = RIM.skip[M.ink] = RIM.skip[M.eyeY] = 1;
  const PILOT = { body: 'child', head: 6, headW: 6 };                        // 驾驶员：孩童体比例的小哥布林，坐在桶里只露胸以上
  const SEAT = -8;                                                                                                                      // 驾驶员骨架整体上移 8 格（胯藏在桶里）

  // ───── 姿势 ─────
  // alt 离地增量（正 = 更高；死亡坠落到 -8 桶底着地）· pitch 机身前倾（1 = 机头朝下）· rot 旋翼相位（0–3 转动，5–6 高速残影）
  // bag 钱袋摆 · swell 钱袋鼓起（0 · 1 鼓 · 2 发亮）· open 袋口松开 · gun 哪根炮管后坐（1 上 · 2 下）· coin 手里的金币（1 拿着 · 2 咬在嘴里）
  // ear 耳尖甩（-1 上翘 · 1 耷拉）· grin 咧嘴露金牙；hx/hy、bhx/bhy 前 / 后手（驾驶员骨架本地坐标）
  const P = { alt: 0, bx: 0, pitch: 0, rot: 0, bag: 0, swell: 0, open: 0, eyes: 0, flash: 0, hx: 0, hy: 0, bhx: 0, bhy: 0, head: 0, lean: 0, gun: 0, coin: 0, ear: 0, grin: 0,
    bob: 0, crouch: 0, step: 0, wup: 0, walk: 0, lying: 0, lift: 0, dq: 0, dq48: 0, rim: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['alt', -9, 5], ['bx', -4, 3], ['pitch', -1, 1], ['rot', 0, 6], ['bag', -1, 1], ['swell', 0, 2], ['open', 0, 1], ['eyes', 0, 1], ['flash', 0, 1],
    ['hx', -2, 9], ['hy', -17, -5], ['bhx', -7, 6], ['bhy', -17, -5], ['head', -1, 1], ['lean', 0, 1], ['gun', 0, 2], ['coin', 0, 2], ['ear', -1, 1], ['grin', 0, 1],
    ['dq48', 0, 48], ['rim', 0, 3], ['st', 0, 8]]);
  const K_IDLE = { hx: 4, hy: -8, bhx: -4, bhy: -8, lean: 0 };
  const K_RAISE = { hx: 6, hy: -10, bhx: -4, bhy: -9, lean: 0 };           // 待机个性：掏出一枚金币
  const K_BITE = { hx: 5, hy: -11, bhx: -4, bhy: -9, lean: 0 };            // 咬一口
  const K_AIM = { hx: 5, hy: -8, bhx: -3, bhy: -8, lean: 1 };              // 攻击：前倾攥住炮把
  const K_RUB = { hx: 4, hy: -10, bhx: 3, bhy: -10, lean: 0 };             // 蓄力：两手在胸前搓
  const K_CAST = { hx: 6, hy: -15, bhx: 3, bhy: -14, lean: 0 };            // 施放：双手一扬「撒钱！」
  const K_HURT = { hx: 2, hy: -12, bhx: -5, bhy: -12, lean: 0 };
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean'], mixK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const T_S1 = 2 / 12, T_S2 = 4 / 12, T_CRASH = INCOMING + 8 / 12;
  const W_ALT = [0, 1, 1, 0], W_BAG = [-1, -1, 0, 0], W_EAR = [1, 0, 0, 1];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), f = f12of(t);
    P.st = st; P.alt = 0; P.bx = 0; P.pitch = 0; P.bag = 0; P.swell = 0; P.open = 0; P.eyes = 0; P.flash = 0; P.head = 0; P.gun = 0; P.coin = 0; P.ear = 0; P.grin = 0;
    P.dq = 0; P.rim = 0; P.mx = 0; P.flip = 0; P.rot = (f12 >> 1) & 3;
    const idle = () => {
      mixK(K_IDLE, K_IDLE, 0); const TT = f12 / 12, b = Math.floor(TT * 2.5);
      P.alt = b & 1; P.bag = [0, 1, 0, -1][(b + 1) & 3]; P.ear = b & 1;
      const lp = tq % DUR[IDLE];                                              // 待机个性：掏金币咬一口，东张西望有没有人看见
      if (lp >= 1.4 && lp < 1.6) { mixK(K_RAISE, K_RAISE, 0); P.coin = 1; P.grin = 1; }
      else if (lp >= 1.6 && lp < 1.8) { mixK(K_BITE, K_BITE, 0); P.coin = 2; P.eyes = 1; P.ear = -1; }
      else if (lp >= 1.8 && lp < 2.0) { mixK(K_RAISE, K_IDLE, 0.5); P.coin = 1; P.head = -1; }
      else if (lp >= 2.0 && lp < 2.2) { P.head = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                   // 前倾飞行：机头朝下、旋翼高速残影、钱袋被甩在后面
      mixK(K_IDLE, K_IDLE, 0); P.lean = 1; const g = E.gait(tq);
      P.pitch = 1; P.alt = W_ALT[g]; P.bag = W_BAG[g]; P.ear = W_EAR[g]; P.rot = 5 + (f12 & 1);
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                               // 预兆：机头上抬、前倾攥炮把 → 上炮 → 下炮 → 回位
      if (f < 2) { mixK(K_IDLE, K_AIM, ease.out(tq / 0.12)); P.pitch = -1; }
      else if (f === 2) { mixK(K_AIM, K_AIM, 0); P.gun = 1; P.bx = -1; P.bag = 1; P.ear = 1; P.grin = 1; }
      else if (f === 3) { mixK(K_AIM, K_AIM, 0); P.bag = 1; P.grin = 1; }
      else if (f === 4) { mixK(K_AIM, K_AIM, 0); P.gun = 2; P.bx = -1; P.bag = 1; P.ear = 1; P.grin = 1; }
      else if (f === 5) { mixK(K_AIM, K_AIM, 0); P.bag = 0; P.grin = 1; }
      else { mixK(K_AIM, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.bag = tq < 0.6 ? -1 : 0; }
    } else if (st === CHARGE) {                                               // 升高 3 格，搓手，钱袋一点点鼓起、发亮
      const q = ease.inOut(clamp01(tq / 0.7)); mixK(K_IDLE, K_RUB, q); P.alt = RD(3 * q); P.grin = q > 0.5 ? 1 : 0;
      if (q > 0.6) { const r = f12 & 1; P.hx += r; P.bhx -= r; }
      P.swell = tq < 0.45 ? 0 : tq < 0.9 ? 1 : 2; P.rim = P.swell ? 2 : 1; P.ear = q > 0.6 ? -1 : 0;
      P.bag = tq > 1.05 ? ((f12 & 1) ? 1 : -1) : 0;
    } else if (st === CAST) {                                                 // 双手一扬，袋口松开
      mixK(K_RUB, K_CAST, ease.out(clamp01(tq / 0.12))); P.alt = 3; P.open = 1; P.swell = tq < 0.25 ? 2 : 1; P.rim = 3; P.grin = 1; P.ear = -1;
      P.bag = tq < 0.17 ? 1 : 0;
    } else if (st === RECOVER) {                                              // 扎紧袋口，心疼地摇头，落回原高度
      const q = ease.inOut(clamp01(tq / 0.6)); mixK(K_CAST, K_IDLE, q); P.alt = RD(3 * (1 - q)); P.open = tq < 0.17 ? 1 : 0; P.rim = tq < 0.17 ? 2 : 0;
      if (tq >= 0.17 && tq < 0.5) { P.head = (f12 & 1) ? 1 : -1; P.eyes = 1; P.ear = 1; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = -1; P.bag = 1; P.pitch = -1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { mixK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.bag = 1; P.ear = 1; }
      else mixK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                                // 中弹 → 冒黑烟打着旋掉下来 → 摔散成木板
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.2) { mixK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = -1; P.bag = 1; P.pitch = -1; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (tq < T_CRASH) {
        const q = clamp01((d - 0.2) / (T_CRASH - INCOMING - 0.2 - 1 / 12)), spin = (f12 >> 1) & 1;
        mixK(K_HURT, K_HURT, 0); P.hy += (f12 & 1) ? -2 : 0; P.bhy += (f12 & 1) ? 0 : -2;   // 两手乱挥
        P.bx = -2; P.alt = RD(-8 * ease.in(q)); P.flip = spin; P.pitch = spin ? 1 : -1; P.eyes = 1; P.ear = -1; P.bag = (f12 & 1) ? 1 : -1; P.rot = (f12 >> 2) & 3;
      } else { mixK(K_HURT, K_HURT, 0); P.alt = -8; P.bx = -2; P.dq = 1; }    // 之后由死亡套件（木板碎块）接管
    } else if (st === REVIVE) {
      idle(); P.alt = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy); P.lean = RD(P.lean); P.dq48 = RD(P.dq * 48);
    P.gx = P.bx + RD(P.bag * 0.5); P.gy = -4 - P.alt;                        // 发光体 = 金币袋
    KEY(P);
  }

  // ───── 画（后 → 前：旋翼杆 + 桨 → 引擎排气管 → 远侧耳 → 后臂 → 躯干 → 头 → 近侧耳 → 钱袋 → 木桶座舱 → 双联炮 → 前臂 → 手里的金币）─────
  let PIT = 0;                                                               // 机身前倾：机械部件按列错 1 格（驾驶员不跟着错）
  const S = (x, y, m, t) => sp(x, y + (PIT ? RD(PIT * x / 9) : 0), m, t);
  const RUN = (y, x0, x1, m, t) => { for (let x = RD(x0); x <= RD(x1); x++) S(x, y, m, t); };
  const MAST_X = -4, ROTOR_Y = -30;
  function mast() {
    part();
    for (let y = ROTOR_Y + 3; y <= -15; y++) S(MAST_X, y, M.iron, 0);
    S(MAST_X - 1, -16, M.iron, 0); S(MAST_X + 1, -16, M.iron, 0);              // 杆脚夹箍
    RUN(ROTOR_Y + 1, MAST_X - 1, MAST_X + 1, M.iron, 0); RUN(ROTOR_Y + 2, MAST_X - 1, MAST_X + 1, M.iron, 0); S(MAST_X - 1, ROTOR_Y + 1, M.iron, 4);   // 桨毂
    S(MAST_X + 1, ROTOR_Y + 2, M.iron, 2);
  }
  // 候选部件：两叶旋翼（侧看：叶片长度随转角 1 → 0.7 → 0.25 → 0.7 变化；ph 5 / 6 = 高速，整段隔点残影 + 中间一截实心；
  //           droop 1 = 一只桨尖耷拉 1 格（破旧）；桨尖亮一格）
  function rotor(cx, y, half, ph, m, droop) {
    part();
    if (ph >= 5) {
      for (let x = cx - half; x <= cx + half; x++) if (((x + ph) & 1) === 0 || Math.abs(x - cx) <= 3) S(x, y, m, Math.abs(x - cx) <= 3 ? 0 : 2);
      return;
    }
    const L = RD(half * [1, 0.8, 0.4, 0.8][ph]);
    RUN(y, cx - L, cx + L, m, 0); S(cx - L, y, m, 4);
    if (ph === 0) { S(cx + L, y, m, 0); if (droop) { S(cx + L, y, 0, 0); S(cx + L, y + 1, m, 3); } S(cx - L - 1, y, m, 4); }
    if (ph === 1 || ph === 3) for (let x = L + 2; x <= half; x += 2) { S(cx + (ph === 1 ? x : -x), y, m, 2); }
  }
  // 候选部件：小引擎 + 弯排气管（贴在座舱背后：散热片 3 道，排气管竖着伸出、管口墨色）
  function engine() {
    part();
    for (let y = -12; y <= -9; y++) RUN(y, -10, -8, M.iron, 0);
    for (let y = -11; y <= -9; y += 2) RUN(y, -10, -9, M.iron, 2);             // 散热片
    S(-10, -12, M.iron, 4);
    for (let y = -18; y <= -13; y++) S(-9, y, M.iron, 0);
    S(-10, -18, M.iron, 0); S(-8, -18, M.iron, 0); S(-9, -18, M.ink, 0);       // 管口
    S(-10, -15, M.brass, 3);                                                   // 管上一道黄铜卡箍
  }
  // 候选部件：哥布林大尖耳（从脑后斜着往后上方伸出 6 格，内耳一道暗色；远侧那只画在头后面、高 2 格暗一级，两只耳尖在剪影上错开）
  function goblinEar(R, far, e) {
    part(); const m = far ? M.skinD : M.skin, x0 = R.hx0 + (far ? 1 : 0), ey = R.ey - (far ? 2 : 0);
    const px = (x, y, t) => parts.px(E, R, x, y, m, t);
    if (far) { px(x0 - 1, ey - 1, 0); px(x0 - 2, ey - 2, 0); px(x0 - 3, ey - 3 + (e < 0 ? -1 : 0), 0); px(x0 - 3, ey - 2, 0); return; }   // 远侧耳只露出脑后翘起的一截
    px(x0 - 6, ey - 3 + e, 4); px(x0 - 5, ey - 2 + e, 0);
    for (let x = x0 - 4; x <= x0 - 3; x++) px(x, ey - 1 + (e > 0 && x === x0 - 4 ? 1 : 0), 0);
    for (let x = x0 - 3; x <= x0; x++) px(x, ey, x === x0 - 2 ? 2 : 0);
    px(x0 - 1, ey + 1, 0); px(x0, ey + 1, 0);
  }
  // 候选部件：吊着的金币袋（绳 1 格 → 扎口 → 4 行布袋，下半部随 sw 摆；袋面一枚金币徽；swell 鼓起一圈、2 = 袋口透金光；open = 袋口张开冒金光）
  function coinBag(x, y, sw, swell, open) {
    part();
    S(x, y, M.gold, 2);
    const y0 = y + 1, HW = [2, 3, 3, 2], W1 = swell ? 1 : 0;
    if (open) { RUN(y0, x - 2, x + 2, M.bag, 0); RUN(y0, x - 1, x + 1, M.glow, 3); S(x, y0 - 1, M.glow, 4); S(x - 1, y0 - 1, M.glow, 2); S(x + 1, y0 - 2, M.glow, 3); }
    else { RUN(y0, x - 1, x + 1, M.gold, 0); if (swell >= 2) S(x, y0, M.glow, 4); }
    for (let k = 0; k < 4 + W1; k++) {
      const hw = (k < 4 ? HW[k] : 2) + (k >= 1 && k <= 3 ? W1 : 0), c = x + RD(sw * (k + 1) / 4);
      RUN(y0 + 1 + k, c - hw, c + hw, M.bag, 0);
      if (k === 1 || k === 2) { S(c - hw + 1, y0 + 1 + k, M.bag, 4); }
    }
    const cx = x + RD(sw * 0.6), cy = y0 + 2 + W1;
    S(cx, cy, M.gold, 4); S(cx + 1, cy, M.gold, 3); S(cx, cy + 1, M.gold, 3); S(cx + 1, cy + 1, M.gold, 2);   // 袋面金币徽
    if (!open) { S(x + 2, y0 + 1, M.gold, 3); }                                                             // 扎口绳头
  }
  // 候选部件：木桶座舱（侧看的鼓肚木桶：上下两道黄铜箍各 2 行 + 桶底箍，箍上铆钉；中间木板每 3 列一道板缝，一块补丁）
  const BARREL = [[-15, -5, 4, 1], [-14, -6, 5, 0], [-13, -6, 5, 1], [-12, -7, 6, 0], [-11, -7, 6, 0], [-10, -7, 6, 0], [-9, -6, 5, 1], [-8, -5, 4, 0]];
  function barrel() {
    part();
    for (const [y, a, b, br] of BARREL) RUN(y, a, b, br ? M.brass : M.wood, 0);
    for (const y of [-14, -12, -11, -10, -8]) for (const x of [-4, -1, 2]) S(x, y, M.wood, 2);  // 板缝
    for (const x of [-4, -1, 2, 5]) { S(x, -13, M.brass, 1); S(x - (x === 5 ? 0 : 0), -9, M.brass, 1); }   // 箍上的铆钉（深色钉头）
    S(-5, -11, M.wood, 4); S(-6, -11, M.wood, 4); S(-6, -10, M.wood, 1);                          // 补丁
  }
  // 候选部件：双联短炮（铁炮架 2×3 + 上下两根 4 格炮管，管口墨色、管上一道亮箍；gun 1 / 2 = 那根后坐 1 格）
  function cannons(gun) {
    part();
    for (let y = -12; y <= -10; y++) RUN(y, 7, 8, M.iron, 0);
    S(7, -12, M.iron, 4);
    const tipU = 12 - (gun === 1 ? 1 : 0), tipD = 12 - (gun === 2 ? 1 : 0);
    RUN(-12, 9, tipU, M.iron, 0); S(tipU, -12, M.ink, 0); S(10, -12, M.iron, 4);
    RUN(-10, 9, tipD, M.iron, 0); S(tipD, -10, M.ink, 0); S(10, -10, M.iron, 4);
  }
  function drawHero() {
    begin(hero, P.bx, -P.alt, P.alt);
    PIT = P.pitch;
    const R = parts.rig(P, PILOT); R.oy = SEAT;
    mast(); rotor(MAST_X, ROTOR_Y, 10, P.rot, M.iron, 1);
    engine();
    goblinEar(R, 1, P.ear);
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.coatD, hand: M.skinD, grip: 'fist' });
    parts.torso(E, R, P, { style: 'leather', mat: M.coat, strap: M.gold });
    const h = parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.ink, eyeStyle: 'wide', white: M.eyeY, nose: 'long', mouth: P.grin ? 'wide' : 'line', ear: 'none', bald: 1 });
    if (P.grin && !P.eyes) parts.px(E, R, h.x1 - 1, Math.min(h.bot, h.ey + 3), M.gold, 4);      // 咧嘴一颗金牙
    goblinEar(R, 0, P.ear);
    coinBag(0, -7, P.bag, P.swell, P.open);
    barrel();
    cannons(P.gun);
    parts.arm(E, R, P, { side: 'F', sleeve: 'tight', mat: M.coat, hand: M.skin, grip: 'fist' });
    if (P.coin) {                                                                                   // 手里的金币（咬的时候贴在嘴边）
      part(); const cx = P.hx - (P.coin === 2 ? 1 : 0), cy = P.hy - 2;
      parts.px(E, R, cx - 1, cy, M.gold, 4); parts.px(E, R, cx, cy, M.gold, 3); parts.px(E, R, cx - 1, cy + 1, M.gold, 3); parts.px(E, R, cx, cy + 1, M.gold, 2);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 金币（技能洒下 / 死亡撒出）：预分配，stepFX 推进（重力 + 落地弹两下），fxFront 画成会翻面的 2×2 小金币
  const CN = 24, cOn = new Uint8Array(CN), cX = new Float32Array(CN), cY = new Float32Array(CN), cVX = new Float32Array(CN), cVY = new Float32Array(CN), cAge = new Float32Array(CN), cLife = new Float32Array(CN), cB = new Uint8Array(CN);
  function coin(x, y, vx, vy, life) { let i = 0; for (; i < CN - 1 && cOn[i]; i++); cOn[i] = 1; cX[i] = x; cY[i] = y; cVX[i] = vx; cVY[i] = vy; cAge[i] = 0; cLife[i] = life; cB[i] = 0; }
  let mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, smokeAcc = 0, soulAcc = 0, landed = 0, lastG = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(-6 - P.alt);
    releaseOrbit(30, 70, 0.3, 0.6, { up: 20 });
    for (let i = 0; i < 16; i++) coin(gx + (i % 3) - 1, gy - 1, -40 + (i / 15) * 110 + (Math.random() - 0.5) * 10, -25 - Math.random() * 55, 1.3 + Math.random() * 0.4);
    burst(gx, gy, 18, 30, 80, 0.3, 0.6, R_EL, 30); fx.cross(gx, gy, 6, R_EL, 0.3); ring(gx, gy, 0, R_EL);
    shake(0.28, 2); flash(0.05); landed = 0; sfx('shoot', { proj: 'coin' });
  }
  function onTime(s, t) {
    if (s === ATTACK && (t === T_S1 || t === T_S2)) {                                            // 双联炮交替点射
      const up = t === T_S1; mzX = wx(13 + P.bx); mzY = wy((up ? -12 : -10) - P.alt); mzT = 0;
      shoot(1, mzX + 1, mzY, 210, DUMMY_X - 3, R_EL, 0, { trail: { every: 3, life: [0.08, 0.14], back: [8, 16] } });
      spawnX(K_PHYS, wx(8), mzY + 1, -18 - Math.random() * 10, -30, 0.5, R_EL, { g: 320, floor: HY });   // 弹壳
      if (up) sfx('swing', { kind: 'gun', w: 0.3 }); sfx('shoot', { proj: 'bullet' });
    }
    if (s === DEATH && Math.abs(t - T_CRASH) < 1e-9) {                                            // 砸在地上摔散：木板碎块 + 钱袋破开撒金币
      poseAt(DEATH, T_CRASH - 1 / 12, T_CRASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 4, power: 0.32, push: 0, fromX: 0, fromY: 2, fadeAt: 1.0, fadeDur: 0.7 });
      const x = HX + P.mx;
      for (let i = 0; i < 12; i++) coin(x - 2 + (i % 4), HY - 3, (i / 11 - 0.5) * 120 + (Math.random() - 0.5) * 12, -55 - Math.random() * 70, 1.7 + Math.random() * 0.4);
      for (let i = 0; i < 16; i++) spawn(K_DUST, x - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      fx.cloud(x - 2, HY - 7, 7, SOOT, 0.9); burst(x, HY - 4, 10, 30, 70, 0.2, 0.4, FXI.impact, 20);
      shake(0.16, 2); landed = 1; sfx('fall', { w: 0.45 });
    }
  }
  const EVENTS = [[], [], [T_S1, T_S2], [], [], [], [], [T_CRASH], []];
  function impactOn(k, x, y) { if (k === 1) { burst(x, y, 6, 30, 70, 0.12, 0.3, FXI.impact, 8); hitDummy(0); sfx('hit', { mat: 'wood', w: 0.25 }); } }
  function stepFX(dt, state, stT) {
    const pipeX = wx(-9 + (P.pitch < 0 ? 0 : 0)), pipeY = wy(-19 - P.alt - (P.pitch > 0 ? 1 : 0));
    if (state === CHARGE && stT > 0.3) {                                                          // 金光螺旋收进钱袋
      chargeAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, wx(P.gx), wy(P.gy), (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    const smoky = state === MOVE ? 14 : state === DEATH && stT > INCOMING && stT < T_CRASH ? 40 : state === IDLE || state === RECOVER ? 1.5 : 0;
    if (smoky) {                                                                                   // 排气管冒黑烟（移动时一缕、坠落时滚滚）
      smokeAcc += dt * smoky;
      while (smokeAcc >= 1) {
        smokeAcc -= 1; const dir = P.flip ? 1 : -1, dying = state === DEATH;
        spawn(K_RISE, (dying ? wx(-2 + Math.random() * 6) : pipeX) + (Math.random() - 0.5) * 2, dying ? wy(-14 - P.alt) : pipeY, dir * (state === MOVE ? 16 : 4) + (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.6 + Math.random() * 0.5, SOOT);
      }
    }
    if (state === MOVE) { const g = E.gait(q12(stT)); if (g !== lastG) { lastG = g; if (g === 0 || g === 2) for (let i = 0; i < 2; i++) spawn(K_DUST, wx(-6 + Math.random() * 12), HY, (Math.random() - 0.5) * 30, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); } }   // 旋翼下洗气流吹起地上的尘
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 20, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < CN; i++) {                                                                  // 金币：重力、落地弹两下后躺平
      if (!cOn[i]) continue; cAge[i] += dt; if (cAge[i] >= cLife[i]) { cOn[i] = 0; continue; }
      if (cB[i] >= 3) continue;
      cVY[i] += 420 * dt; cX[i] += cVX[i] * dt; cY[i] += cVY[i] * dt;
      if (cY[i] >= HY - 1 && cVY[i] > 0) {
        cY[i] = HY - 1;
        if (cB[i] === 0) {
          fx.cross(RD(cX[i]), HY - 2, 3, R_EL, 0.3); spawn(K_DUST, cX[i], HY, (Math.random() - 0.5) * 12, -4, 0.25, FXI.dust);
          if (!landed) { landed = 1; fx.circle(HX + 8, HY + 1, 18, 3, R_EL, 0.9, 1, 0); burst(HX + 6, HY - 2, 14, 20, 60, 0.3, 0.6, R_EL, 18); shake(0.12, 1); sfx('impact', { pal: 'coin', w: 0.5 }); }
        }
        if (cB[i] < 2) { cVY[i] *= -0.45; cVX[i] *= 0.55; cB[i]++; } else { cVY[i] = 0; cVX[i] = 0; cB[i] = 3; }
      }
    }
    mzT += dt;
  }
  function fxReset() { cOn.fill(0); mzT = 9; chargeAcc = 0; smokeAcc = 0; soulAcc = 0; landed = 0; lastG = -1; }
  function fxBack(f12) {
    if (P.dq < 1) groundShadow(wx(0), 7, 8 + P.alt);
    if (P.dq < 1 && P.rim >= 2) floorGlow(wx(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    if (P.dq < 1 && (P.swell >= 2 || P.open)) {                                                    // 钱袋口的金光星芒（蓄满闪、施放大）
      const gx = wx(P.gx), gy = wy(-6 - P.alt), L = P.open ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); }
    }
    if (mzT < 2 / 12) {                                                                              // 炮口光：十字 2 帧
      const c = mzT < 1 / 12 ? EL[0] : EL[1];
      put(mzX, mzY, EL[0]); put(mzX + 1, mzY, c); put(mzX + 2, mzY, mzT < 1 / 12 ? EL[1] : EL[2]); put(mzX, mzY - 1, c); put(mzX, mzY + 1, c);
      if (mzT < 1 / 12) { put(mzX + 3, mzY, EL[2]); put(mzX + 1, mzY - 1, EL[2]); put(mzX + 1, mzY + 1, EL[2]); }
    }
    for (let i = 0; i < CN; i++) {                                                                  // 金币：空中翻面（正面 2×2 ↔ 侧面 1×2），落地躺平，最后 0.3 秒闪烁消失
      if (!cOn[i]) continue; const x = RD(cX[i]), y = RD(cY[i]);
      if (cLife[i] - cAge[i] < 0.3 && (f12 & 1)) continue;
      if (cB[i] >= 3) { put(x, y, 14); put(x + 1, y, 5); continue; }
      const fl = ((cAge[i] * 14) | 0) & 3;
      if (fl & 1) { put(x, y - 1, 5); put(x, y, 61); }
      else { put(x, y - 1, 5); put(x + 1, y - 1, 14); put(x, y, 14); put(x + 1, y, 61); }
    }
  }
  function drawShot(k, x, y, d) { if (k !== 1) return false; put(x + d, y, 21); put(x, y, 5); put(x - d, y, 14); put(x - 2 * d, y, 61); return true; }   // 小铜弹：白尖 + 铜身

  return {
    name: '哥布林直升机', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow], HIT_POINT: [0, -13], EVENTS,
    deathKit: { mode: 'chunks', at: T_CRASH },
    SFX: { body: 'machine', how: 'shatter', pal: 'coin', style: 'coin', w: 0.3, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
