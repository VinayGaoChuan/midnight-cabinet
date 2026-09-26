// 金手（部队 · 虚空 · 商人 · 史诗）：地主进化成的高胖富商——右臂整条换成巨大的鎏金机关手（手掌比头大，身体被它压得右倾），
// 瓜皮帽保留、帽珠变成拳头大的发光虚空珠 + 帽后两条金飘带，大算盘改成背在身后、高出头顶的金算盘框，钱袋换成挂在金手腕上的小金链宝匣，酒红锦袍。
// 攻击 = 金手屈指一弹，金币直线高速射出；技能 = 特性「激进投资组合」的豪赌：握拳吸金（指缝漏金光）→ 张手抛出 5 格巨币旋转砸地（冲击环 + 地裂）
// → 巨币碎成二十多枚小金币，一半弹飞熄灭（亏损）、一半飞回金手（盈利），身后两道金色速度线（「卖空」加速）。
// 由「地主」（Landlord.js）进化：同一个人——瓜皮帽 + 虚空帽珠、八字胡、圆脸双下巴、算盘都在，只是更大、更贵、更敢赌。
PCD.define('GoldenHand', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_PHYS, K_SPIRAL_PT, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：豪赌 · 鎏金（FXI.coin），帽珠点缀虚空紫（curse）；亏损的铅灰碎块用共享钢色自建的 lead 色阶 ─────
  const R_EL = FXI.coin, EL = FXR[R_EL], VOID = FXR[FXI.curse], R_LEAD = fxRamp('lead', [30, 29, 28, 27, 0]);

  const M = parts.mats(E, {
    robe: { r: 'crimson', band: 2 }, trim: 'gold', skin: 'skin', blush: 'pink', hair: [0, 27, 27, 28], ink: { r: 'ink', flat: 1 },
    cap: [0, 25, 42, 24], shoe: [0, 0, 27, 28], pants: 'shadow', gold: 'gold', steel: 'steel', lead: [0, 28, 29, 30], bead: 'crimson', gem: 'blood',
    lit: { r: [20, 5, 21, 21], flat: 1 },                                  // 指缝漏出的金光（发光体）
    orb: { r: [25, 24, 43, 21], flat: 1 }, orbHot: { r: [24, 43, 21, 21], flat: 1 },
  });
  const BODY = { body: 'fat', leg: 7, torso: 10, head: 7, headW: 7, sw: 6, belly: 4, arm: 9, fall: 'front' };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(100, 58, 46, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['gold', 'steel', 'lead', 'lit', 'skin', 'ink', 'orb', 'orbHot', 'blush', 'trim', 'bead', 'gem']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 金手（P.hx/hy 是手腕，手掌向右长出去；hand 0 半握 · 1 握拳 · 2 张开掌心向上 · 3 弹指）；后手扶肚子 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, hand: 0, toss: 0, look: 0, lead: 0, gone: 0, smile: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean == null ? 1 : lean, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(9, -12, 3, -10);                                // 金手垂在肚子前，压得身子右倾
  const K_CURL = K(9, -17, 3, -10, 0, 0);                          // 攻击预兆：金手抬到胸前，屈指
  const K_SNAP = K(12, -17, 3, -10, 1, 1);                         // 弹指
  const K_HOLDA = K(11, -16, 3, -10);
  const K_FIST = K(7, -23, 2, -11, 0, -1, 1);                      // 蓄力：握拳举到脸边
  const K_TOSS = K(13, -17, 1, -12, 2, 1);                         // 施放：张手向前抛
  const K_HURT = K(5, -11, 1, -10, -1, -1);
  const K_SLAM = K(14, -4, 2, -8, 2, 1, 4);                        // 死亡：金手先砸地，单膝跪
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1],
    ['hand', 0, 3], ['toss', 0, 12], ['look', 0, 1], ['smile', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['lead', 0, 4], ['gone', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_SNAP = 2 / 12, T_SLAM = INCOMING + 0.34, T_LAND = INCOMING + 0.66, T_SHATTER = INCOMING + 1.25;
  const TOSS = [3, 8, 11, 8, 3];                                   // 待机个性：掂金币的高度（5 帧）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.hand = 0; P.toss = 0; P.look = 0; P.lead = 0; P.gone = 0; P.smile = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.55 && lp < 2.05) { const f = Math.min(4, Math.floor((lp - 1.55) * 10 + 1e-6)); P.hand = 2; P.toss = TOSS[f]; P.look = P.toss >= 8 ? 1 : 0; P.hy = K_IDLE.hy - 2 + (f === 0 || f === 4 ? 1 : 0); P.smile = f === 4 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 歪斜踱步：一步重（接触 A 顿一下、金手下沉）一步轻
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq));
      if (P.step > 0) { P.bob = 1; P.hy += 1; P.crouch = 1; } else if (P.step < 0) P.bob = 0;
      P.sway = -P.step; P.beard = -P.step;
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_CURL, ease.out(tq / 0.12)); P.hand = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_SNAP, K_SNAP, 0); P.hand = 3; P.beard = -2; P.sway = -1; P.glint = 1; }
      else if (tq < 0.45) { setK(K_SNAP, K_HOLDA, ease.out((tq - 0.2) / 0.25)); P.hand = 3; P.beard = -1; }
      else { setK(K_HOLDA, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.hand = tq < 0.6 ? 3 : 0; }
    } else if (st === CHARGE) {                                        // 握拳举到脸边，指缝漏金光；帽珠跟着亮
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_FIST, q); P.hand = tq < 0.2 ? 0 : 1;
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.smile = tq > 0.9 ? 1 : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; if (q > 0.9 && (f12 & 1)) P.hy -= 1;
    } else if (st === CAST) { setK(K_FIST, K_TOSS, ease.out(clamp01(tq / 0.12))); P.hand = 2; P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.smile = 1; P.look = tq > 0.15 ? 0 : 1; }
    else if (st === RECOVER) {                                         // 收拳，帽珠闪一下
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_TOSS, K_IDLE, q); P.hand = tq < 0.15 ? 2 : tq < 0.45 ? 1 : 0; P.beard = -RD(1 - q); P.smile = tq < 0.4 ? 1 : 0;
      P.gem = tq < 0.2 ? 2 : (tq >= 0.45 && tq < 0.55) ? 3 : 1; P.glint = tq >= 0.45 && tq < 0.55 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.hand = 2; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 前扑碎裂：金手先砸地 → 前扑 → 金手从指尖褪成铅灰 → 碎成几块，帽子滚开
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; P.hand = 2; }
      else if (d < 0.5) { setK(K_SLAM, K_SLAM, 0); P.eyes = 1; P.beard = 2; P.hand = 1; }
      else {
        setK(K_SLAM, K_SLAM, 0); P.crouch = 0; P.lean = 0; P.head = 0; P.lying = 1; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.hand = 0;
        P.bhx = -3; P.bhy = -12;
        P.lead = d < 0.7 ? 0 : Math.min(4, 1 + Math.floor((d - 0.7) / 0.12 + 1e-6)); P.gone = d >= 1.25 ? 1 : 0;
        const hq = clamp01((d - 0.6) / 0.45); P.hatX = RD(12 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 6);
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { P.gx = HAND_X + 5; P.gy = -3; }
    else { P.gx = P.hx + 5 + P.bx; P.gy = P.hy; }                    // 发光体 = 金手（指缝金光）
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 金手的形状（行从上到下，第 3 行是手腕那一行；G 金 · g 金暗 · h 金亮 · S 钢关节 · L 指缝（发光）· . 空）
  const HANDS = [
    ['..GGGGG....', '.GhhGGGGG..', 'SGGGGGGGGh.', 'SGGGGGGGGGG', 'SGGgLgGgGGg', 'SGGGGGGGGGg', '.GgGgGgGgG.', '..g.g.g.g..'],        // 0 半握（手指垂下）
    ['..GGGGGG..', '.GhhGGGGGh', 'SGGSGGSGGG', 'SGGGGGGGGg', 'SGgLgLgLgg', 'SGGGGGGGGg', '.GGGGGGGg.', '..gggggg..'],               // 1 握拳
    ['......hG....', '......GG....', '.GGGGGGGhhh.', 'SGGGGGGGGGGh', 'SGGgLgGGGGGG', 'SGGGGGGggggg', '.GGGGGGg....', '..gggg......'],   // 2 张开、掌心向上
    ['..GGGG......', '.GhhGGG.....', 'SGGGGGGhhhh.', 'SGGGGGGGGGGh', 'SGgLgGGgggg.', 'SGGGGGGg....', '.GGGGGg.....', '..gggg......'],   // 3 弹指（食指伸直）
  ];
  const LIT_TONE = [0, 2, 3, 4, 0];
  // 候选部件：goldHand —— 巨大的鎏金机关手（4 种手形），T = rig 或自由落笔框；lead = 从指尖起褪成铅灰的列数档（0–4）
  function goldHand(T, hx, hy, shape, lead) {
    E.part(); const H = HANDS[shape], w = H[2].length, cut = lead ? w - lead * 3 : 99;
    for (let r = 0; r < H.length; r++) for (let c = 0; c < H[r].length; c++) {
      const ch = H[r][c]; if (ch === '.') continue; const x = hx + c, y = hy - 3 + r, gm = c >= cut ? M.lead : M.gold;
      if (ch === 'S') parts.px(E, T, x, y, c >= cut ? M.lead : M.steel, 0);
      else if (ch === 'L') { if (P.gem >= 1 && P.gem <= 3 && !lead) parts.px(E, T, x, y, M.lit, LIT_TONE[P.gem]); else parts.px(E, T, x, y, gm, 1); }
      else parts.px(E, T, x, y, gm, ch === 'g' ? 2 : ch === 'h' ? 4 : 0);
    }
  }
  // 候选部件：chainBox —— 挂在手腕下的小金链宝匣（2 格链 + 4×3 匣子，一颗红宝石锁扣），随 sway 摆
  function chainBox(T, x, y, sw) {
    E.part(); parts.px(E, T, x, y, M.gold, 4); parts.px(E, T, x + (sw > 0 ? 1 : 0), y + 1, M.gold, 2);
    const bx = x - 1 + sw, by = y + 2; parts.rect(E, T, bx, by, 4, 3, M.gold, 0); parts.run(E, T, by, bx, bx + 3, M.gold, 4); parts.px(E, T, bx + 2, by + 1, M.gem, 4); parts.run(E, T, by + 2, bx, bx + 3, M.gold, 2);
  }
  // 候选部件：backAbacus —— 背在身后、高出头顶的金算盘框（竖放：横档 + 深红珠；框里是空的，像一面光环框）
  function backAbacus(R) {
    E.part(); const x0 = R.sBx - 5, x1 = R.sBx + 3, y0 = R.htop - 7, y1 = R.yWaist;
    parts.run(E, R, y0, x0, x1, M.gold, 0); parts.run(E, R, y0 + 1, x0, x1, M.gold, 2); parts.run(E, R, y1, x0, x1, M.gold, 0);
    for (let y = y0 + 2; y < y1; y++) { parts.px(E, R, x0, y, M.gold, 0); parts.px(E, R, x1, y, M.gold, 0); }
    parts.px(E, R, x0, y0, M.gold, 4); parts.px(E, R, x0 - 1, y0 - 1, M.gold, 4); parts.px(E, R, x1 + 1, y0 - 1, M.gold, 3);   // 框角的尖
    for (let y = y0 + 3, k = 0; y < y1; y += 3, k++) { parts.run(E, R, y, x0 + 1, x1 - 1, M.gold, 1); const bx = x0 + 1 + ((k * 3) % 5); parts.px(E, R, bx, y, M.bead, 3); parts.px(E, R, bx + 1, y, M.bead, 2); }
  }
  // 瓜皮帽（地主那顶的升级：紫缎、金帽檐、拳头大的虚空帽珠）+ 帽后两条金飘带
  const ORB = [[3, 3, 2, 3], [4, 3, 2, 4], [3, 3, 2, 3], [4, 4, 3, 4], [2, 1, 1, 2]];
  function skullcap(T, cx, v0) {
    E.part();
    parts.run(E, T, v0, cx - 4, cx + 4, M.trim, 0); parts.px(E, T, cx + 4, v0, M.trim, 4);
    parts.run(E, T, v0 - 1, cx - 3, cx + 3, M.cap, 0); parts.run(E, T, v0 - 2, cx - 2, cx + 2, M.cap, 0); parts.run(E, T, v0 - 3, cx - 1, cx + 1, M.cap, 0);
    parts.px(E, T, cx - 1, v0 - 1, M.cap, 2); parts.px(E, T, cx + 1, v0 - 2, M.cap, 2); parts.px(E, T, cx - 2, v0 - 2, M.cap, 4);
    parts.run(E, T, v0 - 4, cx - 1, cx + 1, M.trim, 0); parts.px(E, T, cx - 1, v0 - 4, M.trim, 4);       // 金珠座
    E.part(); const g = P.gem, m = g === 2 || g === 3 ? M.orbHot : M.orb, O = ORB[g];                 // 拳头大的虚空帽珠：3×3 + 顶
    for (const dy of [5, 6, 7]) { const e = dy === 7; parts.px(E, T, cx - 1, v0 - dy, m, e ? O[1] - 1 || 1 : O[0]); parts.px(E, T, cx, v0 - dy, m, dy === 6 && g !== 4 ? 4 : O[1]); parts.px(E, T, cx + 1, v0 - dy, m, e ? O[2] : O[2]); }
    parts.px(E, T, cx, v0 - 8, m, P.glint && g !== 4 ? 4 : O[3]);
  }
  function ribbons(R) {
    E.part(); const b = P.beard, x = R.hx0 - 1, y = R.htop + 1;
    for (let j = 0; j < 2; j++) for (let k = 0; k < 6 - j; k++) { const q = k / 5; parts.px(E, R, x - k - j + RD(b * q * q * 1.5 * (j ? 0.6 : 1)), y + j + RD(k * (b < 0 ? 0.2 : 0.7)), M.gold, k === 5 - j ? 4 : j ? 2 : 3); }
  }
  const HAND_X = 19, CAP_X = 20, CAPF = { r0: 0, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 };
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY), lie = R.lie;
    if (lie) { E.part(); const F = parts.FREE; parts.run(E, F, 0, -24, -12, M.gold, 0); parts.run(E, F, -1, -24, -12, M.gold, 4); for (let x = -22; x <= -14; x += 3) { parts.px(E, F, x, -2, M.bead, 3); parts.px(E, F, x + 1, -2, M.bead, 2); } parts.px(E, F, -25, -2, M.gold, 4); }   // 摔落的金算盘，平躺在身后
    else backAbacus(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.robeD, cuff: M.trimD, grip: 'none' });
    parts.legs(E, R, P, { style: 'shoe', mat: M.pants, matD: M.pantsD, boot: M.shoe, bootD: M.shoeD, bootH: 2 });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.trim, belt: M.trim, flare: 4, flareF: 3 });
    const LL = tor.rows[0], RR = tor.rows[1], y0 = tor.y0;
    for (let y = y0 + 2; y < tor.hem; y += 3) for (let x = LL[y - y0] + 2 + (y % 2); x < RR[y - y0] - 2; x += 4) parts.px(E, R, x, y, M.trim, 2);   // 锦纹（暗金团花点）
    parts.run(E, R, tor.hem - 1, LL[tor.hem - 1 - y0] + 1, RR[tor.hem - 1 - y0] - 1, M.trim, 2);               // 下摆金边
    parts.run(E, R, y0, RR[0] - 3, RR[0] - 1, M.trim, 0);                                                        // 立领
    if (!lie) parts.hand(E, R, P, { side: 'B', hand: M.skin });                                                  // 后手扶着肚子
    ribbons(R);
    parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.ink, nose: 'small', mouth: P.smile ? 'wide' : 'line', blush: M.blush });
    if (P.look && !P.eyes) { parts.px(E, R, R.hx1 - 1, R.ey, M.skin, 0); parts.px(E, R, R.hx1 - 1, R.ey - 1, M.ink, 1); }   // 眼珠跟着金币往上看
    for (let x = R.hx0 + 2; x <= R.hx1 - 1; x++) parts.px(E, R, x, R.hy + 1, M.skin, x === R.hx1 - 1 ? 3 : 2);   // 双下巴
    parts.beard(E, R, P, { style: 'mustache', mat: M.hair });
    if (lie) { CAPF.r0 = P.hatY > 1 ? (P.hatX & 3) : 0; CAPF.tx = CAP_X + P.hatX; CAPF.ty = -3 - P.hatY; skullcap(CAPF, 0, 3); }
    else skullcap(R, R.hx, R.htop);
    // 金手：肩上的钢关节 + 鎏金臂甲 → 巨手；倒地时手甩在头前的地上（不跟身体转）
    if (lie) {
      const wy = -3, lx = wy - R.oy, ly = R.ox - HAND_X;                                                         // 手腕的精灵坐标 → 身体本地坐标（前扑 rot 1 的逆变换）
      parts.arm(E, R, P, { sleeve: 'plate', mat: M.gold, pauldron: M.gold, trim: M.steel, cuff: M.steel, cuffStyle: 'bracer', grip: 'none', at: [lx, ly] });
      if (!P.gone) goldHand(parts.FREE, HAND_X, wy, 0, P.lead);
      E.part(); const F = parts.FREE; parts.rect(E, F, 2, -2, 4, 2, M.gold, 0); parts.px(E, F, 4, -2, M.gem, 4);   // 摔落的宝匣
    } else {
      parts.arm(E, R, P, { sleeve: 'plate', mat: M.gold, pauldron: M.gold, trim: M.steel, cuff: M.steel, cuffStyle: 'bracer', grip: 'none' });
      goldHand(R, P.hx, P.hy, P.hand, 0);
      if (P.hy + 9 < 0) chainBox(R, P.hx + 1, P.hy + 5, P.sway > 0 ? 1 : P.sway < 0 ? -1 : 0);
      if (P.toss) { E.part(); const cx = P.hx + 7, cy = P.hy - 3 - P.toss; parts.run(E, R, cy - 1, cx - 1, cx + 1, M.gold, 4); parts.px(E, R, cx - 1, cy, M.gold, 3); parts.px(E, R, cx, cy, M.gold, 1); parts.px(E, R, cx + 1, cy, M.gold, 2); parts.run(E, R, cy + 1, cx - 1, cx + 1, M.gold, 2); }   // 抛起的大金币
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, bcT = 9, bcX0 = 0, bcY0 = 0, bcX1 = 0, speedT = 9, chargeAcc = 0, soulAcc = 0, orbAcc = 0, lastStep = 0;
  const BC_DUR = 0.3, wx = (x) => scrX(x), wy = (y) => HY + y;
  const handC = () => [wx(P.hx + 5 + P.bx), wy(P.hy)];
  function onEnter(s) {
    if (s === RECOVER) speedT = 0;
    if (s !== CAST) return;
    const h = handC(); bcT = 0; bcX0 = h[0] + 3; bcY0 = h[1] - 6; bcX1 = HX + 36;   // 张手：巨币抛到身前
    releaseOrbit(30, 80, 0.25, 0.5, { pts: 1 }); burst(h[0], h[1] - 3, 14, 30, 80, 0.2, 0.45, R_EL, 20); fx.cross(h[0] + 2, h[1] - 4, 6, R_EL, 0.25);
    flash(0.05); shake(0.12, 1);
  }
  function landBigCoin() {                                           // 巨币砸地：冲击环 + 地裂 + 震屏 2 格；碎成二十多枚小金币——一半弹飞熄灭（亏损），一半飞回金手（盈利）
    const x = bcX1, y = HY - 3, h = handC();
    ring(x, HY - 2, 1, R_EL); fx.crack(x, HY + 1, 16, 1, R_EL, 1.0); fx.crack(x - 2, HY + 1, 13, -1, R_EL, 1.0); fx.cross(x, y, 7, R_EL, 0.3);
    burst(x, y, 12, 40, 110, 0.15, 0.4, R_EL, 20); burst(x, HY - 1, 10, 20, 50, 0.3, 0.5, FXI.dust, 12);
    for (let i = 0; i < 12; i++) { const a = -Math.PI * (0.1 + 0.8 * Math.random()); spawnX(K_PHYS, x, y, Math.cos(a) * (50 + Math.random() * 50), Math.sin(a) * (60 + Math.random() * 40), 0.55 + Math.random() * 0.25, R_EL, { g: 220, floor: HY, age0: 0.62 }); }
    for (let i = 0; i < 12; i++) { const sx = x + (Math.random() - 0.5) * 18, sy = y - Math.random() * 10, dx = sx - h[0], dy = (sy - h[1]) / 0.75, r = Math.hypot(dx, dy); spawnX(K_SPIRAL_PT, h[0], h[1], r / (0.35 + Math.random() * 0.2), 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: 2 + Math.random() * 2, tx: h[0], ty: h[1] }); }
    shake(0.28, 2); sfx('impact', { pal: 'coin', w: 0.6 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SNAP) {                               // 弹指：食指尖射出金币
      mzT = 0; mzX = wx(P.hx + P.bx + 11); mzY = wy(P.hy - 1);
      shoot(1, mzX + 1, mzY, 260, DUMMY_X - 3, R_EL, 0, { trail: { every: 1, life: [0.06, 0.16], back: [10, 26] } });
      burst(mzX, mzY, 6, 30, 70, 0.1, 0.25, R_EL, 0);
      sfx('swing', { kind: 'throw', w: 0.45 }); sfx('shoot', { proj: 'coin' });
    }
    if (s === DEATH && t === T_SLAM) {                                // 金手先砸地
      const x = wx(P.hx + P.bx + 6); burst(x, HY - 1, 10, 30, 70, 0.3, 0.5, FXI.dust, 10); fx.crack(x, HY + 1, 7, 1, FXI.dust, 0.6); shake(0.1, 1); sfx('hit', { mat: 'metal', w: 0.6 });
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 8 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.12, 1); sfx('fall', { w: 0.7 }); }
    if (s === DEATH && t === T_SHATTER) {                             // 铅灰的金手碎成几块
      const x = wx(HAND_X + 5 - 2), y = wy(-4);
      for (let i = 0; i < 9; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 4, (Math.random() - 0.3) * 60, -30 - Math.random() * 50, 0.8 + Math.random() * 0.4, R_LEAD, { g: 240, floor: HY - (i % 2), sz: 2, age0: 0.1 });
      burst(x, y, 10, 20, 60, 0.3, 0.5, FXI.dust, 10); shake(0.1, 1);
    }
  }
  const EVENTS = [[], [], [T_SNAP], [], [], [], [], [T_SLAM, T_LAND, T_SHATTER], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 10, 40, 100, 0.12, 0.3, R_EL, 8); fx.cross(x, y, 4, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'metal', w: 0.35 }); }
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                           // 四周金币点被吸向拳心
      chargeAcc += dt * (16 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const h = handC(), a = Math.random() * 6.2832, r = 14 + Math.random() * 10; spawnX(K_SPIRAL_PT, h[0], h[1], r / (0.4 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 3 + Math.random() * 2, tx: h[0], ty: h[1] }); }
    }
    if (bcT < BC_DUR) { bcT += dt; if (bcT >= BC_DUR) landBigCoin(); }
    if (state === MOVE && P.step !== lastStep) {                      // 一步重一步轻
      if (P.step > 0) { sfx('step', { w: 0.7 }); for (let i = 0; i < 3; i++) spawn(K_DUST, wx(6) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.35 + Math.random() * 0.2, FXI.dust); }
      else if (P.step < 0) { sfx('step', { w: 0.35 }); spawn(K_DUST, wx(-5), HY, (Math.random() - 0.5) * 10, -3, 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE || state === RECOVER) { orbAcc += dt * (state === IDLE ? 2 : 5); while (orbAcc >= 1) { orbAcc -= 1; const R = parts.rig(P, BODY); spawn(K_EMBER, wx(R.hx + P.bx), wy(R.htop - 8), Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, FXI.curse); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 32, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt; speedT += dt;
  }
  function fxReset() { mzT = 9; bcT = 9; speedT = 9; chargeAcc = 0; soulAcc = 0; orbAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid(f12) {
    if (speedT < 0.5) {                                               // 「卖空」：身后两道金色速度线
      const q = speedT / 0.5, len = RD(8 + 22 * Math.sin(q * Math.PI)), x1 = HX - 9 - RD(q * 12);
      for (const [y, o] of [[HY - 9, 0], [HY - 20, 5]]) for (let k = 0; k < len; k++) { if (q > 0.5 && ((k + f12) % 3) === 0) continue; put(x1 - o - k, y, k < 3 ? EL[0] : k < len * 0.5 ? EL[1] : EL[2]); put(x1 - o - k - 2, y + 1, k < len * 0.4 ? EL[2] : EL[3]); }
    }
  }
  function fxFront(f12) {
    const st = E.state;
    if (st === CHARGE && P.gem >= 1 && !P.lying) {                   // 指缝漏光：拳头前沿几道短光芒
      const h = handC(), L = P.gem >= 2 ? 3 : 2;
      for (const dy of [0, 2]) for (let k = 1; k <= L; k++) put(h[0] + 5 + k, h[1] + dy, k === 1 ? EL[0] : k === 2 ? EL[1] : EL[2]);
      if (f12 & 1) { put(h[0] + 1, h[1] - 5, EL[1]); put(h[0] + 1, h[1] - 6, EL[2]); }
    }
    if (bcT < BC_DUR) {                                              // 旋转的 5 格巨币：正面（带方孔）→ 斜 → 侧边 → 斜
      const u = bcT / BC_DUR, x = RD(bcX0 + (bcX1 - bcX0) * u), y = RD(bcY0 + (HY - 3 - bcY0) * u - 16 * u * (1 - u) * 4 * 0.5), ph = f12 & 3;
      const hw = ph === 0 ? 2 : ph === 2 ? 0 : 1;
      for (let j = -2; j <= 2; j++) { const w = Math.abs(j) === 2 ? Math.min(hw, 1) : hw; for (let i = -w; i <= w; i++) put(x + i, y + j, (i === 0 && j === 0 && ph === 0) ? EL[4] : (i + j < -1) ? EL[0] : (i + j > 1) ? EL[2] : EL[1]); }
      put(x - hw - 1, y, EL[3]); put(x + hw + 1, y, EL[3]);
    }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } }
  }
  function drawShot(k, x, y, d, f12) {
    if (k !== 1) return false;                                        // 高速金币：正面 / 侧边交替 + 两格金色拖影
    x = RD(x); y = RD(y);
    if (f12 & 1) { put(x, y - 1, EL[1]); put(x, y, EL[0]); put(x, y + 1, EL[2]); }
    else { put(x - 1, y - 1, EL[0]); put(x, y - 1, EL[1]); put(x + 1, y - 1, EL[1]); put(x - 1, y, EL[1]); put(x, y, EL[4]); put(x + 1, y, EL[2]); put(x - 1, y + 1, EL[1]); put(x, y + 1, EL[2]); put(x + 1, y + 1, EL[2]); }
    put(x - 2 * d, y, EL[2]); put(x - 3 * d, y, EL[3]);
    return true;
  }

  return {
    name: '金手', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.orb, M.orbHot, M.lit], HIT_POINT: [1, -15], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'coin', style: 'coin', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
