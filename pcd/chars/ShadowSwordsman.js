// 影剑士（部队 · 自然 · 召唤师 · 史诗）：瘦高的林影武士——白木狐面具（两只尖耳竖起、青光眼缝、朱红眼线），墨绿斗篷短褂，
// 一条破烂长围巾向后飘、尾端碎成影子锯齿；右手反握细长墨绿弯刀（刀身贴在前臂下、刀尖伸出肘后），腰间一只空刀鞘斜着翘到身后。
// 攻击 = 扫：一个闪步贴近，反手自下而上横扫一刀。
// 技能 = 特性「暗影繁殖者」（每 6 次攻击召唤一个影子随从）：收刀入鞘、单膝低伏，身后的影子被拉长变深、影子里睁开两点青光 →
//        拔刀一闪，贴地反手横斩过自己的影子，把影子「剪」下来 → 剪下的影子从地面立起成一个墨青剪影分身，睁眼亮青光 → 收刀，分身留一会儿淡出。
// 升级成「影骑士」（ShadowKnight.js）：狐面具长成狐首盔，破围巾长成拖地的破披风，弯刀长成裂织巨剑。
PCD.define('ShadowSwordsman', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, B8, hash, copySprite, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_TRAIL,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：林影 · 墨青暗影（前两级偏青，和影骑士的紫白拉开）─────
  const R_EL = fxRamp('forestShade', [21, 22, '#1f6b5f', 53, 0]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const CLOAK = ['#050d0c', '#0e2420', '#1a3c34', '#2e5e50'];
  const M = parts.mats(E, {
    cloak: { r: CLOAK, band: 2 },                               // 夜林墨绿斗篷短褂（主材质）
    sleeve: CLOAK,
    pants: [0, 0, '#0e2420', '#1a3c34'],                        // 墨色裤、绑腿、手套
    mask: 'white', hair: [0, 0, 52, 8],                         // 白木狐面具、墨发
    liner: { r: 'crimson', flat: 0 },                           // 朱红眼线 / 耳内
    scarf: [0, 52, 8, 9],                                       // 墨黑破围巾
    sash: 'crimson', sheath: [0, 11, 12, 13], gold: 'gold', iron: 'iron',
    blade: [0, '#0e2420', '#1a3c34', '#2e5e50'],                // 墨绿刃
    edge: { r: [39, 40, 41, 22], flat: 1 },                     // 刃口青光（和刃同一部件）
    glow: { r: [41, 23, 22, 21], flat: 1 },                     // 刃中青光（发光体）
    eye: { r: [39, 23, 22, 22], flat: 1 },                      // 面具眼缝青光
  });
  const BODY = { body: 'slim', leg: 13, torso: 9, head: 7, headW: 6, sw: 2, arm: 9, fall: 'front' };   // 返修 1：腿加长 2 格、躯干收窄（窄肩长腿）
  const LEGUP = 2;                                               // 关键帧按旧腿长写，统一上移 2 格
  const SABER = { style: 'saber', metal: M.blade, edge: M.edge, glow: M.glow, trim: M.gold, wood: M.sash, len: 11, w: 2, guard: 3 };
  const HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(64, 46, 34, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['blade', 'edge', 'glow', 'eye', 'mask', 'liner', 'sheath', 'gold', 'iron', 'sash']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（右手）反握弯刀（hx hy a = 握点与刀身方向，刀身朝后贴着前臂），后手（左手）扶刀鞘 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, sheath: 0, cut: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const SHEATH_A = Math.atan2(-2, 1);                            // 刀鞘方向（1:2 往后上翘）
  const BH = [-3, -10];                                          // 后手按在腰后刀鞘上（返修 1：不再落在围巾根部那条线上）
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -15, -1.62, BH[0], BH[1], 1);                   // 前臂横在胸前，刀身贴在前臂下、刀尖伸出肘后
  const K_SHEATHE = K(2, -8, SHEATH_A, BH[0], BH[1], 1);               // 收刀入鞘（待机个性 / 蓄力）
  const K_DRAW = K(10, -18, -1.25, BH[0], BH[1], 1, 1);              // 猛地抽出
  const K_WIND = K(1, -11, -2.4, BH[0], BH[1], 1, 0, 2);            // 闪步前压低
  const K_STRIKE = K(10, -21, -1.95, BH[0] - 1, BH[1], 2, 1);            // 反手自下而上横扫
  const K_FOLLOW = K(8, -22, -1.4, BH[0], BH[1], 1, 0);
  const K_CROUCH = K(2, -8, SHEATH_A, BH[0], BH[1], 2, 0, 3);       // 蓄力：收刀低伏
  const K_IAI = K(-4, -8, -1.62, BH[0] + 1, BH[1], 1, 0, 4);              // 施放：单膝跪地，反手向身后贴地横斩
  const K_HURT = K(4, -14, -2.0, -4, -12, -1, -1);
  const K_SLUMP = K(4, -9, -2.6, -3, -8, 1, 1, 2);              // 死亡：刀脱手、身体前倾、膝盖弯下 2 格
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['sheath', 0, 2], ['cut', 0, 2], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['lift', 0, 3]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_STRIKE = 2 / 12, DASH = 6, T_SNAP = INCOMING + 0.3, T_CUT = INCOMING + 0.45, T_LAND = INCOMING + 0.66;
  const T_SWEEP = 1 / 12, T_RISE = 0.1, T_FORM = 0.35, CLONE_X = HX - 22;
  // 待机个性「拔刀式」（1.5 s 起 5 帧）：收刀入鞘半截 → 停 → 猛地抽出、围巾一甩 → 回位
  const DRAW_SEQ = [[K_SHEATHE, 1, 0, 0], [K_SHEATHE, 1, 1, 0], [K_DRAW, 0, -2, 1], [K_DRAW, 0, 2, 1], [K_IDLE, 0, 1, 0]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.sheath = 0; P.cut = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 0.5 && lp < 0.5 + 2 / 12) { P.gem = lp < 0.5 + 1 / 12 ? 2 : 1; P.glint = 1; }   // 刃光偶尔闪一档，读出反握的刀
      if (lp >= 1.5 && lp < 1.5 + DRAW_SEQ.length / 12) { const s = DRAW_SEQ[Math.floor((lp - 1.5) * 12 + 1e-6)]; setK(s[0], s[0], 0); P.sheath = s[1]; P.beard = s[2]; P.glint = s[3]; P.gem = s[3]; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 闪步：轻、无尘；每两步有一帧往前瞬移 2 格（原地留 1 帧残影）
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.lean = 2; P.beard = -2 + (f & 1); P.hx += P.step * 0.5; P.a += P.step * 0.1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx + (f === 3 ? (w.flip ? -2 : 2) : 0); P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < T_STRIKE) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.12))); P.beard = 1; P.gem = 1; }
      else if (tq < 0.25) { setK(K_STRIKE, K_STRIKE, 0); P.bx = DASH; P.beard = -3; P.sway = -2; P.gem = 3; P.rim = 2; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out(clamp01((tq - 0.25) / 0.2)); setK(K_STRIKE, K_FOLLOW, q); P.bx = DASH; P.beard = -2; P.sway = -1; P.gem = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_FOLLOW, K_IDLE, q); P.bx = RD(DASH * (1 - q)); P.beard = -1; P.gem = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                         // 收刀入鞘、低伏；围巾被拉到最长
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CROUCH, q); P.sheath = q > 0.35 ? 1 : 0;
      P.beard = -RD(q * 3); P.sway = q > 0.5 ? ((f12 & 1) ? -1 : 0) : 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                           // 拔刀一闪：单膝跪地，反手向身后贴地横斩
      setK(K_CROUCH, K_IAI, ease.out(clamp01(tq / T_SWEEP))); P.beard = 2; P.sway = 2; P.gem = 3; P.rim = 3; P.glint = tq < 0.2 ? 1 : 0; P.flash = 0;
    } else if (st === RECOVER) {                                        // 收刀回鞘，站起
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IAI, K_IDLE, q); P.sheath = q > 0.35 && q < 0.8 ? 1 : 0; P.beard = RD(1 - q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 2; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 被斩开：弯刀断成两截落地 → 身体沿斜线错开、上半截下滑 → 静止 → 化成墨绿烟
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        setK(K_SLUMP, K_SLUMP, 0); P.bx = -2; P.eyes = 1; P.beard = d < 0.45 ? 2 : 1; P.sheath = 2; P.gem = 4;
        if (d < 0.45) P.crouch = 1;                                      // 斩开之前只是踉跄；斩开那一帧起膝盖弯下 2 格
        const fq = clamp01((d - 0.3) / 0.36); P.hatX = RD(3 * fq); P.hatY = RD(12 * (1 - fq * fq));
        if (d >= 0.66 && d < 0.75) P.hatY = 1;                           // 落地弹一下
        P.cut = d < 0.45 - 1e-9 ? 0 : d < 0.45 + 1 / 12 - 1e-9 ? 1 : 2;   // 1 = 斩开那一帧（空隙青闪），2 = 错开后静止
        if (d >= 1.3) P.dq = clamp01((d - 1.3) / 0.8);                    // 静止 0.45 → 1.3 s（0.85 s）后才消散
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    P.hy -= LEGUP; P.bhy -= LEGUP;
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.sheath === 2) { P.gx = 8 + P.hatX + P.bx; P.gy = -2 - P.hatY; }
    else if (P.sheath === 1) { P.gx = P.hx + P.bx; P.gy = P.hy; }
    else { const f = parts.sword.focus(P, SABER); P.gx = f[0] + P.bx; P.gy = f[1]; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：scarfWave 破长围巾尾——两条飘带从后颈出发逐格下垂（末端比根部低 4–5 格，主飘带约 10 格长），根部 2 格粗、往后变 1 格，
  //   正弦起伏 ±2 行（包络两头收、中段最大），末端 3 格碎成 1 格宽的锯齿，再甩出一粒碎影；被风拉直（beard < 0）时略长、垂得少一点，
  //   上甩（beard > 0）时下垂减小、尾端翘起。读 P.beard P.sway P.bob。一个部件（返修 1：不再是肩高的一根平直横条）
  function scarfTail(R) {
    E.part(); const b = RD(P.beard || 0), ph = (P.sway || 0) * 1.1 + (P.bob || 0) * 0.8, ax = R.hx0, ay = R.hy + 1;
    for (let j = 0; j < 2; j++) {
      const L = (j ? 6 : 10) + (b < 0 ? -b : 0), D = (j ? 6.5 : 5.5) - (b > 0 ? 0.8 * b : b < 0 ? 0.3 * -b : 0), amp = b < 0 ? 1.5 : 2;
      let ex = 0, ey = 0;
      for (let k = 0; k <= L; k++) {
        const q = k / L, x = ax - 1 - k, tip = k > L - 3;
        let y = RD(ay + j * 2 + D * Math.pow(q, 0.75) + Math.sin(k * 0.65 + ph + j * 1.7) * amp * q * (1 - q) * 4 * 0.7);   // 从后颈就开始往下垂，起伏在中段最大
        if (tip && !j) y += (k + L) & 1 ? 1 : 0;                       // 尾端 3 格：1 格宽锯齿（只往下错，不把尾巴抬回去）
        parts.px(E, R, x, y, M.scarf, j ? 2 : (k & 3) === 1 ? 4 : 0);
        if (!tip && k < L * 0.6) parts.px(E, R, x, y + 1, M.scarf, 2);
        ex = x; ey = y;
      }
      if (!j) { parts.px(E, R, ex - 2, ey + (b > 0 ? 0 : 1), M.scarf, 2); }   // 碎开的一粒影子
    }
  }
  // 候选部件：hipSheath 腰间刀鞘——鞘口在前胯、1:2 斜着往后上翘，鞘尾伸出后背（金鞘口 + 金鞘尾，漆鞘中段一道高光）。o = { mouth: [x, y], len, empty }。一个部件
  function sheath(R, len) {
    const di = parts.snapDir(SHEATH_A), mx = 1, my = R.yHip + 3;          // 返修 1：鞘口放低到前胯下，鞘尾从后腰斜着翘出轮廓 2–3 格
    E.part();
    parts.bar(di, mx, my, 0, len, 2, (k, j, X, Y) => parts.px(E, R, X, Y, k <= 1 || k >= len - 1 ? M.gold : M.sheath, k === 0 || k === len ? 4 : j === 0 ? (k % 4 === 2 ? 4 : 3) : 2));
  }
  // 候选部件：foxMaskEars 狐面具的两只尖耳——竖在发顶上 3 格，前耳白木 + 朱红耳内，后耳暗一级并往后斜，两耳之间留 3 格缝（剪影里看得出两只耳朵）
  function maskEars(R) {
    E.part(); const t = R.htop - 1, x0 = R.hx0, x1 = R.hx1;
    for (let k = 1; k <= 3; k++) { const w = k < 3 ? 2 : 1; for (let i = 0; i < w; i++) parts.px(E, R, x0 - 1 - (k === 3 ? 1 : 0) + i, t - k, M.maskD, k === 3 ? 3 : 0); }
    for (let k = 1; k <= 3; k++) { const w = k < 3 ? 2 : 1; for (let i = 0; i < w; i++) parts.px(E, R, x1 - 1 + i + (k === 3 ? 1 : 0), t - k, M.mask, k === 3 ? 4 : 0); }
    parts.px(E, R, x1, t - 2, M.liner, 3);                              // 耳内朱红
  }
  function face(R, h) {                                                  // 面具上的朱红眼线、腮纹（和脸同一部件）
    parts.px(E, R, h.x1 - 2, h.ey + 2, M.liner, 3);
  }
  // 断刀两截（掉在地上，不跟身体转）
  function brokenSaber() {
    const x = 4 + P.hatX, y = -1 - P.hatY;
    parts.sword(E, parts.FREE, P, Object.assign({}, SABER, { free: 1, at: [x, y], a: Math.PI / 2, len: 4, glowLv: 4 }));
    E.part(); const x2 = 12 + P.hatX * 2, y2 = -1 - RD(P.hatY * 0.7);
    parts.run(E, parts.FREE, y2, x2, x2 + 4, M.blade, 3); parts.px(E, parts.FREE, x2 + 5, y2 + 1, M.blade, 3);
    parts.run(E, parts.FREE, y2 - 1, x2 + 1, x2 + 3, M.edge, 1);
  }

  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    scarfTail(R);
    sheath(R, 8);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, cuff: M.pantsD, grip: 'none' });
    parts.legs(E, R, P, { style: 'shoe', mat: M.pants, matD: M.pantsD, boot: M.pants, bootD: M.pantsD });
    parts.torso(E, R, P, { style: 'tunic', mat: M.cloak, belt: M.sash, collar: M.scarf });   // 返修 1：长外套改短褂，露出长腿
    parts.hand(E, R, P, { side: 'B', hand: M.pantsD });                 // 左手扶着刀鞘
    parts.hair(E, R, P, { style: 'long', mat: M.hair, len: 1 });          // 面具后面露出的墨发（画在头之前，不压面具）
    const h = parts.head(E, R, P, { mat: M.mask, face: 'long', eye: P.gem === 4 ? M.maskD : M.eye, eyeStyle: 'glow', brow: M.liner, browStyle: 1, nose: 'long', mouth: 'none', ear: 'none' });
    face(R, h);
    maskEars(R);
    parts.scarf(E, R, P, { mat: M.scarf, layer: 'wrap' });
    if (P.sheath === 2) brokenSaber();
    else parts.sword(E, R, P, P.sheath === 1 ? Object.assign({}, SABER, { len: 3, glowLv: 1 }) : SABER);
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.sleeve, cuff: M.iron, cuffStyle: 'bracer', hand: M.pants, grip: 'fist' });
  }
  const tmp = new Uint8Array(hero.w * hero.h), up = new Uint8Array(hero.w * hero.h);
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.cut) {                                                        // 被斩开：斜线以上的上半截往右下平移 3 格、下沉 2 格，两半之间留 1 格空隙
      const o = hero.out, w = hero.w, h = hero.h, dx = 3, dy = 2, L0 = -BODY.leg + Math.min(3, P.crouch) + P.bob - 6;
      const lineY = (x) => L0 + (x - hero.ox - P.bx) * 0.5, rel = (y) => y - hero.oy;
      tmp.set(o); up.fill(0);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (rel(y) < lineY(x) + 1) o[y * w + x] = 255;          // 上半截搬走，下半截顶上削掉 1 行 = 斩口
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = tmp[y * w + x]; if (c === 255 || rel(y) >= lineY(x)) continue; const X = x + dx, Y = y + dy; if (X < w && Y < h) { o[Y * w + X] = c; up[Y * w + X] = 1; } }
      if (P.cut === 1) for (let x = 0; x < w; x++) for (let y = 1; y < h - 1; y++) {   // 斩开那一帧：空隙青闪
        const i = y * w + x; if (o[i] !== 255) continue; let a = 0, bl = 0;
        for (let k = 1; k <= 2; k++) { if (y - k >= 0 && up[(y - k) * w + x]) a = 1; if (y + k < h && o[(y + k) * w + x] !== 255 && !up[(y + k) * w + x]) bl = 1; }
        if (a && bl) o[i] = EL[1];
      }
    }
  }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy), clone = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let ghostT = 9, ghostX = 0, ghostFlip = 0, cloneT = 9, cloneEye = [0, 0], shadeT = 9, stepAcc = 0, soulAcc = 0, smokeAcc = 0, lastStep = 0, lastF = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function snap(dst, st, t) { poseAt(st, t, t); drawHero(); bakeHero(); copySprite(dst, hero); hero.k1 = hero.k2 = -1; }
  // 候选特效：riseBlit 剪影从地面立起——只画离地 hgt 行以内的像素，最上面一行用亮色（立起的边），dq 抖动消散
  function riseBlit(s, X, Y, hgt, fill, top, dq) {
    const o = s.out; for (let y = 0; y < s.h; y++) { const up = s.oy - y; if (up > hgt) continue; for (let x = 0; x < s.w; x++) { if (o[y * s.w + x] === 255 || B8[(y & 7) * 8 + (x & 7)] < dq) continue; put(X - s.ox + x, Y - s.oy + y, up >= hgt - 1 && hgt < 40 ? top : fill); } }
  }
  function onEnter(s) {
    if (s === CHARGE) shadeT = 0;
    if (s !== CAST) return;
    const y = HY - 2;
    fx.slash(HX + 2, HY - 5, 14, -1.2, -2.3, R_EL, 0.22, 2, 2);          // 反手往身后贴地一扫
    fx.beam(HX - 2, HY - 1, CLONE_X - 12, HY - 1, 1, R_EL, 0.3, 1);      // 贴地斩过影子
    fx.cross(HX - 6, y, 6, R_EL, 0.25);
    burst(HX - 8, y, 16, 40, 110, 0.2, 0.45, R_EL, 6);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_STRIKE) < 1e-9) {                // 闪步贴近 + 反手自下而上横扫
      snap(ghost, ATTACK, 0.08); poseAt(ATTACK, t, t); ghostT = 0; ghostX = HX; ghostFlip = 0;
      const cx = HX + DASH + 3, cy = HY - 17;
      fx.slash(cx, cy, 12, 2.7, 0.35, R_EL, 0.2, 2, 2);
      for (let i = 0; i < 6; i++) spawn(K_TRAIL, HX + 2 + i * 1.2, HY - 8 - Math.random() * 10, 30 + Math.random() * 20, 0, 0.2, R_EL);
      const hx = DUMMY_X - 3, hy = HY - 18; fx.cross(hx, hy, 4, R_EL, 0.2); burst(hx, hy, 10, 40, 100, 0.15, 0.35, R_EL, 8); burst(hx, hy, 6, 30, 70, 0.1, 0.25, R_IMP, 8);
      hitDummy(0); sfx('swing', { kind: 'slash', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === CAST && Math.abs(t - T_RISE) < 1e-9) {                    // 剪下的影子开始立起
      snap(clone, IDLE, 0); poseAt(CAST, t, t); cloneT = 0;
      const R = parts.rig({ lean: 1 }, BODY); cloneEye = [R.hx1 - 1, R.ey];
      for (let i = 0; i < 10; i++) spawnX(K_DUST, CLONE_X - 6 + Math.random() * 12, HY - 1, (Math.random() - 0.5) * 16, -6 - Math.random() * 8, 0.4 + Math.random() * 0.3, R_EL, { age0: 0.3 });
    }
    if (s === CAST && Math.abs(t - T_FORM) < 1e-9) {                    // 分身睁眼：墨青烟外爆 + 冲击环
      const x = CLONE_X, y = HY - 16;
      burst(x, y, 18, 40, 110, 0.25, 0.6, R_EL, 10); ring(x, HY - 12, 0, R_EL); fx.cross(x + cloneEye[0], HY + cloneEye[1], 5, R_EL, 0.3);
      shake(0.12, 1); sfx('impact', { pal: 'shadow', w: 0.5 });
    }
    if (s === DEATH && Math.abs(t - T_SNAP) < 1e-9) { burst(wx(P.hx), wy(P.hy), 8, 30, 80, 0.15, 0.35, FXI.steel, 10); sfx('hit', { mat: 'metal', w: 0.3 }); }
    if (s === DEATH && Math.abs(t - T_CUT) < 1e-9) { fx.beam(HX - 10, HY - 22, HX + 10, HY - 12, 1, R_EL, 0.25, 2); fx.cross(HX + 1, HY - 17, 5, R_EL, 0.2); flash(0.04); }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 8; i++) spawn(K_DUST, HX + 4 + Math.random() * 14, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.2 }); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_RISE, T_FORM], [], [], [T_SNAP, T_CUT, T_LAND], []];
  function stepFX(dt, state, stT) {
    if (state === MOVE) {
      const f = E.gait(q12(stT));
      if (f !== lastF) {
        if (f === 3) { const pmx = P.mx - (P.flip ? -2 : 2); snap(ghost, MOVE, Math.max(0, q12(stT) - 1 / 12)); poseAt(MOVE, stT, stT); ghostT = 0; ghostX = HX + pmx; ghostFlip = P.flip; }   // 闪步：原地留 1 帧残影
        if (f === 0 || f === 2) sfx('step', { w: 0.2 });
        lastF = f;
      }
    } else lastF = -1;
    if (state === CHARGE) {                                              // 影子里冒出的暗色汇聚
      stepAcc += dt * (10 + 20 * clamp01(stT / DUR[CHARGE]));
      while (stepAcc >= 1) { stepAcc -= 1; const x = HX - 4 - Math.random() * 20; spawnX(K_DUST, x, HY - 1, (HX - x) * 0.6, -2 - Math.random() * 4, 0.4 + Math.random() * 0.3, R_EL, { age0: 0.35 }); }
    }
    if (state === RECOVER && cloneT < 0.7) { smokeAcc += dt * 16; while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_DUST, CLONE_X - 5 + Math.random() * 10, HY - 4 - Math.random() * 22, (Math.random() - 0.5) * 6, -6 - Math.random() * 6, 0.5 + Math.random() * 0.3, R_EL, { age0: 0.4 }); } }
    if (state === DEATH && stT > INCOMING + 1.2 && stT < INCOMING + 2.2) {   // 两半身体化成墨绿烟
      soulAcc += dt * 40; while (soulAcc >= 1) { soulAcc -= 1; spawnX(K_DUST, HX - 8 + Math.random() * 18, HY - 2 - Math.random() * 26, (Math.random() - 0.5) * 8, -8 - Math.random() * 10, 0.6 + Math.random() * 0.5, R_EL, { age0: 0.3 }); if (Math.random() < 0.25) spawn(K_RISE, HX - 4 + Math.random() * 10, HY - 10 - Math.random() * 12, 0, -14 - Math.random() * 10, 0.8, FXI.soul); }
    }
    ghostT += dt; cloneT += dt; shadeT += dt;
  }
  function fxReset() { ghostT = 9; cloneT = 9; shadeT = 9; stepAcc = 0; soulAcc = 0; smokeAcc = 0; lastStep = 0; lastF = -1; }
  function fxBack(f12) {
    const st = E.state;
    if ((st === CHARGE || st === CAST) && shadeT < 2.2 && P.dq < 1) {  // 身后的影子被拉长到 3 倍、变深；影子里睁开两点青光
      const L = RD(8 + 18 * clamp01(shadeT / 0.8)), cutAt = st === CAST ? E.stT : -1;
      for (let x = HX - L; x <= HX + 3; x++) { const e = x < HX - L + 3; put(x, FLOOR, e && ((x + f12) & 1) ? EL[3] : 0); if (x > HX - L + 2) put(x, FLOOR + 1, e ? EL[3] : 52); }
      if (shadeT > 0.6 && st === CHARGE) { const c = (f12 & 2) ? EL[1] : EL[0]; put(HX - L + 6, FLOOR, c); put(HX - L + 9, FLOOR, c); }
      if (cutAt >= 0 && cutAt < 0.2) for (let x = HX - L; x <= HX; x++) put(x, FLOOR - 1, (x + f12) & 1 ? EL[1] : EL[0]);
    }
    if (P.dq < 1 && P.sheath !== 2) floorGlow(wx(P.gx), P.rim, EL, f12);
  }
  function fxMid() {
    if (ghostT < 1 / 12 + 1e-6) E.blitShape(ghost, ghostX, HY, ghostFlip, EL[2], 0.2);              // 闪步残影（1 帧）
    else if (ghostT < 0.25 && E.state === ATTACK) E.blitShape(ghost, ghostX, HY, 0, EL[3], clamp01(ghostT / 0.25));
    if (cloneT < 1.3) {                                                  // 影子分身：从地面立起 → 睁眼 → 留一会儿 → 淡出
      const hgt = RD(40 * ease.out(clamp01(cloneT / (T_FORM - T_RISE)))), dq = clamp01((cloneT - 0.95) / 0.3);
      riseBlit(clone, CLONE_X, HY, hgt, EL[2], EL[1], dq);
      if (cloneT >= T_FORM - T_RISE && dq < 0.6) { const ex = CLONE_X + cloneEye[0], ey = HY + cloneEye[1], c = cloneT < T_FORM - T_RISE + 0.1 ? EL[0] : EL[1]; put(ex, ey, c); put(ex - 1, ey, EL[1]); }
    }
  }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && P.sheath === 0) {      // 刃光星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 4 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '影剑士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow, M.edge, M.eye], HIT_POINT: [1, -18], EVENTS,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'shadow', style: 'shadow', w: 0.3 },
    REVIVE: { dy: -18, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
