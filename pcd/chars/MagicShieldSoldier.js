// 魔盾兵（部队 · 兽人 · 先锋 · 稀有）：矮壮重甲兽人，没有像样的武器，只有一面刻满符文的青铜大塔盾（上沿两角獠牙护角、盾面 3 列竖排符文）；
// 鳍冠盔（锯齿鳍冠 + 獠牙形护颊，盔缝里一对小眼、口缝里一根外翻的獠牙）、三层叠片大铁肩甲、腰间一串符文石片。
// 攻击 = 双脚不挪、整面塔盾往前一顶（盾推）；技能 = 名字里的「魔盾」：盾底插进地里，符文从下往上点亮，身前立起一面紫色符文护壁，挡碎两颗来袭敌弹。
// 升级成「破魔守卫」（AntiMagicGuardian.js）：同一个兽人——塔盾、鳍冠盔、叠片肩甲都保留，升级成秘银。
PCD.define('MagicShieldSoldier', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keys, FXI, FXR, HY, FLOOR, INCOMING, fxRamp, bayer,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, px = parts.px, run = parts.run, rect = parts.rect, FREE = parts.FREE;

  // ───── 元素：魔盾 · 符文紫（奥术）：白 → 淡紫 → 符文紫 → 深紫 → 墨紫 ─────
  const R_EL = fxRamp('runeward', [21, 43, '#8a5ce0', 42, 52]), EL = FXR[R_EL], R_IMP = FXI.impact, R_EN = FXI.enemy;
  const BRONZE = ['#1a1208', '#4a3418', '#7a5a2a', '#b08a48'];                     // 暗青铜 [勾线, 暗, 基, 亮]
  const R_BRZ = fxRamp('bronzeShard', [21, BRONZE[3], BRONZE[2], BRONZE[1], BRONZE[0]]);   // 碎盾的青铜碎片

  // ───── 材质（shd 和 brz 同色，单独一个材质：轮廓光只照盾沿）─────
  const M = parts.mats(E, {
    brz: BRONZE, shd: BRONZE, iron: 'iron', skin: 'moss', tusk: 'bone', stone: 'stone', cord: 'leather',
    rune: { r: [42, '#8a5ce0', 43, 21], flat: 1 }, eye: { r: [0, 20, 14, 47], flat: 1 },
  });
  const BODY = { body: 'stocky', sw: 6, limb: 1.35, lw: 4, headX: -2 };   // 头缩在肩后 2 格：盔缝和獠牙露在盾沿后面，不被盾压住
  const HX = 74, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(64, 46, 28, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 12, 16], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of Object.keys(M)) if (k !== 'shd') RIM.skip[M[k]] = 1;

  // ───── 姿势：前手 = 盾把手（盾心 = 手 +2 格），后手也扶在盾后 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, lit: 4, col: 0, rim: 0, eyes: 0, flash: 0, sit: 0, lift: 0, tilt: 0, brk: 0, dq: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -14, 4, -13, 0, -1, 2);      // 缩在盾后：盾顶齐盔顶，盔缝里的眼和獠牙从盾沿后面露出来
  const K_PEEK = K(6, -10, 4, -9, 0, 0, 0);        // 从盾沿上探头：盾放低、身子直起来
  const K_WALK = K(6, -14, 4, -13, 0, 0, 1);
  const K_WIND = K(4, -15, 2, -14, -1, -1, 3);     // 盾收回、蹲低蓄势
  const K_PUSH = K(9, -13, 7, -12, 1, 1, 1);       // 整面塔盾往前一顶 3 格（脚不挪）
  const K_HOLD = K(8, -13, 6, -12, 1, 0, 1);
  const K_LIFT = K(6, -18, 4, -17, 0, 0, 1);       // 蓄力：先把盾提起来
  const K_BRACE = K(5, -10, 3, -9, 1, -1, 3);      // 盾底插进地里（下沉 1 格），蹲低缩到盾后
  const K_WALL = K(5, -9, 3, -8, 1, 0, 2);         // 施放：顶住盾
  const K_HURT = K(4, -15, 2, -14, -1, -1, 1);
  const K_STAG = K(4, -13, 2, -12, -1, -1, 2);     // 盾碎了，踉跄
  const K_SIT = K(4, -9, -9, -4, -1, -1, 0);       // 坐倒（rig 坐标，整个身体下移 SIT_DROP）：半截盾框搁在腿上，后手撑地
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['lit', 0, 4], ['col', 0, 3], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['sit', 0, 1], ['lift', 0, 3], ['tilt', 0, 1], ['brk', 0, 2], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const PEEK = [[0.5, 0, 0], [1, 0, 1], [1, 1, 2], [1, 1, 3], [0.5, 0, 0]];   // 待机个性：探头张望（混合量、转头、闪亮的符文列）
  const CH_TRACK = [[0, K_IDLE], [0.25, K_LIFT, 'out'], [4 / 12, K_BRACE, 'in']];
  const T_PUSH = 2 / 12, T_PLANT = 4 / 12, T_SHOT1 = 0.1, T_SHOT2 = 0.2, T_PULL = 0.3;
  const T_SHATTER = INCOMING + 0.3, T_LAND = INCOMING + 0.62, T_TILT = INCOMING + 0.8, SIT_DROP = 3;
  const SHIELD_C = [K_BRACE.hx + 3, K_BRACE.hy + 3];   // 插地时的盾心（蓄力汇聚的目标）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.lit = 4; P.col = 0; P.rim = 0; P.eyes = 0; P.flash = 0;
    P.sit = 0; P.lift = 0; P.tilt = 0; P.brk = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const k = PEEK[Math.min(4, Math.floor((lp - 1.6) * 12 + 1e-6))]; setK(K_IDLE, K_PEEK, k[0]); P.head = k[1]; P.col = k[2]; P.bob = 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 顶盾蹭步：盾挡在前面，接触帧顿挫 1 格
      setK(K_WALK, K_WALK, 0); parts.gait(P, E.gait(tq)); P.hx += P.step * 0.6; P.bhx += P.step * 0.6;   // 盾随步子往前一拱
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_PUSH, K_PUSH, 0); P.gem = 3; P.beard = -2; P.sway = -1; }
      else if (tq < 0.45) { setK(K_PUSH, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 1; P.beard = -1; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                        // 提盾 → 盾底插地 → 符文从下往上逐格点亮
      keys(tq, CH_TRACK, P, FIELDS);
      P.lit = tq < 0.35 ? 0 : Math.min(4, 1 + Math.floor((tq - 0.35) / 0.15 + 1e-6));
      P.gem = tq < 0.8 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.35 ? 0 : 2; P.beard = tq < T_PLANT ? 1 : -1;
      if (tq >= 1.0) P.beard = (f12 & 1) ? -2 : -1;                    // 符文风把腰间石片吹得乱抖
    } else if (st === CAST) { setK(K_BRACE, K_WALL, ease.out(clamp01(tq / 0.12))); P.gem = tq < 0.25 ? 3 : 2; P.rim = tq < 0.25 ? 3 : 2; P.beard = -2; P.sway = -1; }
    else if (st === RECOVER) {                                         // 护壁熄灭，盾从地里拔出来
      if (tq < T_PULL) { setK(K_WALL, K_BRACE, clamp01(tq / T_PULL)); P.gem = 2; P.rim = 2; P.beard = -1; }
      else { const q = ease.out(clamp01((tq - T_PULL) / 0.35)); setK(K_BRACE, K_IDLE, q); P.gem = q < 0.5 ? 1 : 0; P.rim = q < 0.4 ? 1 : 0; P.beard = q < 0.6 ? 1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.lit = h < 2 / 12 ? 2 : 4; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 符文一格格熄灭 → 盾碎 → 手里只剩半截盾框 → 一屁股坐倒 → 头盔歪到一边
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) {
        setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2;
        P.lit = Math.max(0, 4 - Math.floor(d / 0.07 + 1e-6)); P.brk = d >= 0.1 ? 1 : 0;
      } else if (d < 0.42) { setK(K_STAG, K_STAG, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.lit = 0; P.gem = 4; P.brk = 2; }
      else {
        setK(K_SIT, K_SIT, 0); P.sit = 1; P.bx = -2; P.eyes = 1; P.brk = 2; P.gem = 4; P.lit = 0;
        P.lift = d < 0.5 ? 3 : d < 0.58 ? 1 : 0; P.tilt = d >= 0.8 ? 1 : 0; P.beard = d < 0.8 ? -1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.col = 2;
    }
    const yo = P.sit ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.sit) { P.gx = P.hx + P.bx - 1; P.gy = P.hy + SIT_DROP; } else { P.gx = P.hx + 3 + P.bx; P.gy = P.hy; }   // 发光体 = 盾心（坐倒后 = 手里的半截盾框）
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：layerPauldron —— 三层叠片大肩甲：每层 2 行（上行受光、下行压暗），一层比一层宽、往下错 2 行，最下一层比躯干宽出 3 格；每层一颗铆钉
  function pauldron(R, x, y, m) {
    E.part();
    run(E, R, y - 4, x - 1, x + 1, m, 0); run(E, R, y - 3, x - 2, x + 2, m, 2);
    run(E, R, y - 2, x - 3, x + 2, m, 0); run(E, R, y - 1, x - 3, x + 3, m, 2);
    run(E, R, y, x - 4, x + 3, m, 0); run(E, R, y + 1, x - 4, x + 2, m, 2);
    px(E, R, x, y - 4, m, 4); px(E, R, x - 1, y - 2, m, 4); px(E, R, x - 2, y, m, 4);
  }
  // 候选部件：finHelm —— 兽人鳍冠盔：闭口圆盔 + 眼缝里一对小眼 + 口缝外翻的獠牙 + 近侧獠牙形护颊（往前勾）；
  //   鳍冠单独一个部件：头顶正中一道前后贯通的锯齿鳍（FIN 高度表，后 → 前）。P.tilt 1 = 头盔歪到一边（往后 1、往下 1，鳍往后斜）
  const FIN = [2, 1, 3, 2, 4, 2, 4, 2];
  function finHelm(R) {
    const t = P.tilt, m = M.brz, x0 = R.hx0 - 1 - t, x1 = R.hx1 + 1 - t, top = R.htop + t, bot = R.hy + t, ey = R.ey + t, fx = R.hx1 - t;
    E.part();
    run(E, R, top - 1, x0 + 1, x1 - 2, m, 0);                                     // 盔顶
    for (let y = top; y <= bot; y++) run(E, R, y, x0, y === bot ? x1 - 1 : x1, m, 0);
    run(E, R, ey - 1, fx - 1, x1, m, 4);                                         // 眉脊
    run(E, R, ey, fx - 3, x1, m, 1);                                             // 眼缝
    if (!P.eyes) { px(E, R, fx, ey, M.eye, 3); px(E, R, fx - 2, ey, M.eye, 2); }   // 一对小眼（远侧那只暗一级）
    for (let y = ey + 2; y < bot; y++) px(E, R, x1, y, M.skin, 2);                // 口缝里露出墨绿的下巴
    px(E, R, x1 + 1, ey + 3, M.tusk, 3); px(E, R, x1 + 1, ey + 2, M.tusk, 4);      // 外翻的獠牙：伸出盔沿、往上翘
    px(E, R, x0 + 1, top + 1, m, 4); px(E, R, x0 + 1, bot - 1, m, 4); px(E, R, x0 + 3, bot - 1, m, 2);   // 铆钉、盔沿
    px(E, R, fx - 2, bot + 1, m, 0); px(E, R, fx - 1, bot + 1, m, 0); px(E, R, fx - 1, bot + 2, m, 0); px(E, R, fx, bot + 2, m, 0); px(E, R, fx + 1, bot + 3, m, 4);   // 獠牙形护颊
    E.part();
    for (let i = 0; i < FIN.length; i++) {
      const x = x0 + i, base = x > x0 && x < x1 - 1 ? top - 2 : top - 1;
      for (let k = 0; k < FIN[i]; k++) px(E, R, x - (t ? RD(k * 0.5 + 0.2) : 0), base - k, M.iron, k === FIN[i] - 1 ? 4 : 0);
    }
  }
  // 候选部件：runeTower —— 正面朝镜头的矩形符文塔盾：盾框（自动明暗）+ 上下内框线 + 四角铆钉 + 冷光 + 上沿两角獠牙形护角 +
  //   3 列竖排符文（和盾面同一个部件；每列一道暗刻槽，符文是槽上 2 格竖笔 + 隔一个一格横钩；P.lit 从下往上点亮的行数 0–4，
  //   P.gem 亮度档，P.col 单独闪亮的一列 1–3，P.brk 1 = 裂纹）
  const CRACK = [[3, -1], [2, 0], [2, 1], [1, 2], [1, 3], [0, 4], [-1, 5], [-1, 6], [-2, 7], [-1, 8], [-2, 9], [-3, 10]];
  const SH_HW = 5, SH_H = 17;
  function runeTone(lit, hot, first) {
    const lv = P.gem; if (!lit || lv >= 4) return 1; if (hot) return 4;
    return lv === 0 ? 2 : lv === 3 ? (first ? 4 : 3) : lv === 2 && first ? 4 : 3;
  }
  function runeTower(R, cx, top) {
    const hw = SH_HW, h = SH_H, m = M.shd;
    E.part();
    for (const s of [-1, 1]) { px(E, R, cx + s * hw, top - 1, M.tusk, 0); px(E, R, cx + s * (hw - 1), top - 1, M.tusk, 0); px(E, R, cx + s * hw, top - 2, M.tusk, 0); px(E, R, cx + s * (hw - 1), top - 3, M.tusk, 4); }
    for (let r = 0; r < h; r++) run(E, R, top + r, cx - hw, cx + hw, m, 0);
    run(E, R, top + 1, cx - hw + 1, cx + hw - 1, m, 2); run(E, R, top + h - 2, cx - hw + 1, cx + hw - 1, m, 2);   // 内框线
    for (const [dx, dy] of [[-hw + 1, 2], [hw - 1, 2], [-hw + 1, h - 3], [hw - 1, h - 3]]) px(E, R, cx + dx, top + dy, m, 4);   // 铆钉
    px(E, R, cx - 2, top + 3, m, 4); px(E, R, cx - 2, top + 4, m, 4); px(E, R, cx + 2, top + 12, m, 4);   // 盾面冷光
    for (let c = 0; c < 3; c++) {
      const x = cx + (c - 1) * 3, hot = P.col === c + 1, off = c === 1 ? 1 : 0;                           // 中间一列错开 1 行：读成一行行刻字，不是窗格
      for (let y = top + 3 + off; y <= top + h - 5 + off; y++) px(E, R, x, y, m, 2);                      // 暗刻槽
      for (let g = 0; g < 4; g++) {
        const y = top + 3 + off + g * 3, lit = 3 - g < P.lit, d = c === 0 ? -1 : c === 2 ? 1 : (g & 1 ? 1 : -1), tn = runeTone(lit, hot, false);
        px(E, R, x, y, M.rune, runeTone(lit, hot, true)); px(E, R, x, y + 1, M.rune, tn);
        if (((c + g) & 1) === 0) px(E, R, x + d, y + ((c + g) & 2 ? 1 : 0), M.rune, Math.max(1, tn - 1));   // 横钩（暗一级）
      }
    }
    if (P.brk === 1) for (const [dx, dy] of CRACK) px(E, R, cx + dx, top + 3 + dy, m, 1);
  }
  // 碎盾后手里只剩的半截盾：下半截盾面，断口从左上斜到右下、参差不齐，左框 + 下框还在，残片上一列熄灭的符文
  const HALF_W = [3, 4, 6, 7, 8, 9, 11, 11];
  function halfFrame(R) {
    const x0 = P.hx + 3 - SH_HW, y0 = P.hy + 1, m = M.shd;
    E.part();
    for (let r = 0; r < HALF_W.length; r++) {
      const y = y0 + r, x1 = x0 + HALF_W[r] - 1; run(E, R, y, x0, x1, m, 0);
      if (r < HALF_W.length - 1) px(E, R, x1, y, m, 1);                                          // 断口
    }
    run(E, R, y0 + 6, x0 + 1, x0 + 9, m, 2); px(E, R, x0 + 1, y0 + 5, m, 4);                       // 内框线、铆钉
    px(E, R, x0 + 2, y0 + 2, M.rune, 1); px(E, R, x0 + 2, y0 + 3, M.rune, 1); px(E, R, x0 + 5, y0 + 4, M.rune, 1); px(E, R, x0 + 5, y0 + 5, M.rune, 1);
  }
  // 腰间一串符文石片：挂在腰带后半截，三片 2×2 石片，每片一格符文（和盾同一档亮度），下半片随 beard 摆
  function runeStones(R) {
    E.part(); const y = R.yWaist + 1, e = parts.edges(R, R.yWaist), sw = RD(P.beard * 0.5);
    for (let i = 0; i < 3; i++) {
      const x = e[0] + 1 + i * 3; px(E, R, x, y, M.cord, 3);
      run(E, R, y + 1, x, x + 1, M.stone, 0); run(E, R, y + 2, x + sw, x + 1 + sw, M.stone, 0);
      px(E, R, x + (i & 1), y + 1 + (i & 1) + (i & 1 ? 0 : 0), M.rune, runeTone(P.lit > 0, P.col === 2, true));
    }
  }
  // 坐倒的腿：两条腿往前伸在地上，脚尖朝上；远侧腿暗一级、往后错 1 格、高 1 格
  function sitLegs() {
    const L = -P.lift;
    E.part(); rect(E, FREE, -2, -4 + L, 8, 3, M.ironD, 0); rect(E, FREE, 6, -6 + L, 2, 5, M.brzD, 0); px(E, FREE, 7, -7 + L, M.brzD, 3);
    E.part(); rect(E, FREE, -1, -3 + L, 8, 4, M.iron, 0); px(E, FREE, 3, -3 + L, M.iron, 4); px(E, FREE, 4, -3 + L, M.iron, 4);
    rect(E, FREE, 7, -5 + L, 2, 6, M.brz, 0); px(E, FREE, 8, -6 + L, M.brz, 4); px(E, FREE, 9, -5 + L, M.brz, 3);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), sit = P.sit;
    if (sit) { R.oy = SIT_DROP - P.lift; R.ox = -1; }
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.ironD, hand: M.brzD, grip: 'fist' });
    pauldron(R, R.sBx, R.yS + 3, M.iron);
    if (sit) sitLegs(); else parts.legs(E, R, P, { style: 'greave', mat: M.iron, matD: M.ironD, boot: M.brz, bootD: M.brzD, bootH: 2 });
    parts.torso(E, R, P, { style: 'plate', mat: M.brz, belt: M.iron, buckle: M.brz, hem: R.yHip });
    runeStones(R);
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.iron, hand: M.brz, grip: 'big' });
    pauldron(R, R.sFx, R.yS + 3, M.iron);                                   // 近侧肩甲画在头之前：护颊和獠牙压在肩甲上面
    parts.head(E, R, P, { mat: M.skin, face: 'square', eye: M.eye, nose: 'none', mouth: 'none', ear: 'none' });
    finHelm(R);
    if (P.brk >= 2) halfFrame(R); else runeTower(R, P.hx + 3, P.hy - 8);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const WALL_LX = 16, WALL_H = 24;                                    // 符文护壁：盾前 3 格、高 24 格、宽 3 格
  const catches = [{ x: 0, y: 0, t: 9 }, { x: 0, y: 0, t: 9 }];
  let pushT = 9, wallT = 9, fadeT = 9, hitY = 0, hitT = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastLit = 0, lastCol = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s === CAST) {                                                  // 盾面十字星芒，身前立起符文护壁
      const gx = wx(P.gx), gy = wy(P.gy), X = wx(WALL_LX);
      wallT = 0; fadeT = 9;
      releaseOrbit(40, 90, 0.25, 0.5, { pts: 1, to: [X, HY - 12, 5] });
      fx.cross(gx, gy, 7, R_EL, 0.35); burst(gx, gy, 18, 40, 110, 0.3, 0.6, R_EL, 10); burst(X, HY - 2, 10, 20, 60, 0.3, 0.5, R_EL, 20);
      ring(X, HY - 12, 1, R_EL); shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'arcane', w: 0.7 });
    }
    if (s === RECOVER) fadeT = 0;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_PUSH) {                                 // 盾推：盾沿撞上假人，符文亮一下
      pushT = 0; const X = wx(P.gx + SH_HW + 1), cy = wy(P.gy);
      hitDummy(0); burst(X, cy, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(X, cy - 2, 4, R_IMP, 0.2); burst(wx(P.gx), cy, 6, 20, 50, 0.15, 0.3, R_EL, 4);
      for (let i = 0; i < 2; i++) spawn(K_DUST, wx(1) + Math.random() * 3, HY, -18 - Math.random() * 16, -4 - Math.random() * 5, 0.3, FXI.dust);
      sfx('swing', { kind: 'smash', w: 0.7 }); sfx('hit', { mat: 'metal', w: 0.7 });
    }
    if (s === CHARGE && t === T_PLANT) {                               // 盾底插地：哐一声，两边扬尘、地面裂出两道细纹
      const X = wx(SHIELD_C[0]);
      burst(X, HY - 1, 12, 20, 60, 0.3, 0.5, FXI.dust, 18); fx.crack(X + 1, HY + 1, 7, 1, R_EL, 0.9); fx.crack(X - 2, HY + 1, 6, -1, R_EL, 0.9);
      sfx('impact', { pal: 'metal', w: 0.5 });
    }
    if (s === CAST && (t === T_SHOT1 || t === T_SHOT2)) shoot(1, 140, t === T_SHOT1 ? HY - 11 : HY - 19, -320, wx(WALL_LX) + 2, R_EN);   // 两颗来袭敌弹
    if (s === RECOVER && t === T_PULL) { const X = wx(SHIELD_C[0]); burst(X, HY - 1, 10, 20, 50, 0.3, 0.5, FXI.dust, 14); }   // 盾从地里拔出来
    if (s === DEATH && t === T_SHATTER) {                              // 盾碎：青铜碎片落地，紫色符文碎片散开
      const cx = wx(K_HURT.hx + 3 - 2), cy = wy(K_HURT.hy + 2);
      for (let i = 0; i < 16; i++) spawnX(K_PHYS, cx + (Math.random() - 0.5) * 9, cy + (Math.random() - 0.5) * 14, -30 + Math.random() * 110, -70 + Math.random() * 50, 1.0 + Math.random() * 0.6, R_BRZ, { g: 300, floor: HY, sz: Math.random() < 0.35 ? 2 : 1, age0: 0.1 });
      burst(cx, cy, 20, 40, 120, 0.3, 0.7, R_EL, 20); fx.cross(cx, cy, 6, R_EL, 0.25); shake(0.12, 1);
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 12 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.7 }); }
    if (s === DEATH && t === T_TILT) { const X = wx(-5), Y = wy(-15); burst(X, Y, 4, 20, 40, 0.1, 0.25, R_IMP, 10); }   // 头盔磕歪：两点火星
  }
  const EVENTS = [[], [], [T_PUSH], [T_PLANT], [T_SHOT1, T_SHOT2], [T_PULL], [], [T_SHATTER, T_LAND, T_TILT], []];
  function impactOn(k, x, y) {                                          // 敌弹撞上护壁：被吸住，撞击处的符文格变白 1 帧
    if (k !== 1) return; const c = catches[catches[0].t < 1 ? 1 : 0]; c.x = wx(WALL_LX) + 2; c.y = RD(y); c.t = 0; hitY = RD(y); hitT = 0;
  }
  function hurtFx(s) {                                                 // 重甲 + 盾：火花更多更快，夹几颗紫色符文屑
    const hx = HX + 10, hy = HY - 13;
    burst(hx, hy, s === DEATH ? 28 : 22, 60, 150, 0.2, 0.5, R_IMP, 20);
    for (let i = 0; i < 3; i++) spawn(K_BURST, hx, hy, 30 + Math.random() * 70, -40 - Math.random() * 40, 0.7 + Math.random() * 0.3, R_IMP);
    burst(hx, hy, 6, 30, 70, 0.2, 0.4, R_EL, 6); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > T_PLANT) {                           // 紫色小符文粒子从地面定点汇聚到盾心
      chargeAcc += dt * (14 + 28 * clamp01((stT - T_PLANT) / 0.9));
      const tx = wx(SHIELD_C[0]), ty = wy(SHIELD_C[1]);
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const r = 10 + Math.random() * 7, a0 = Math.asin(Math.min(1, 7 / (0.75 * r))), a = Math.random() < 0.5 ? a0 : Math.PI - a0;
        spawn(K_SPIRAL_PT, tx, ty, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 2);
      }
    }
    if ((state === CHARGE || state === DEATH) && P.lit !== lastLit) {   // 点亮 / 熄灭一行符文：一点火星
      if (P.lit > lastLit && P.lit > 0) { const y = wy(P.gy - 8 + 3 + (4 - P.lit) * 3); for (let c = -1; c <= 1; c++) spawn(K_EMBER, wx(P.gx + c * 3), y, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.4, R_EL); }
      lastLit = P.lit;
    }
    if (state === IDLE && P.col !== lastCol) { if (P.col) spawn(K_EMBER, wx(P.gx + (P.col - 2) * 3), wy(P.gy - 6), 0, -10, 0.5, R_EL); lastCol = P.col; }
    if (state === MOVE && P.step !== lastStep) {                       // 蹭步：每步 2 颗尘
      if (P.step !== 0) { sfx('step', { w: 0.7 }); for (let i = 0; i < 2; i++) spawn(K_DUST, wx(P.step > 0 ? 4 : -4) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastStep = P.step;
    }
    for (const c of catches) {                                         // 被吸住的敌弹 2 帧后碎成紫色火花
      const was = c.t; c.t += dt;
      if (was < 2 / 12 && c.t >= 2 / 12) { burst(c.x, c.y, 16, 30, 90, 0.2, 0.5, R_EL, 6); burst(c.x, c.y, 5, 20, 50, 0.1, 0.25, R_EN, 0); fx.cross(c.x, c.y, 3, R_EL, 0.15); shake(0.12, 1); sfx('impact', { pal: 'arcane', w: 0.4 }); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 20, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    pushT += dt; wallT += dt; fadeT += dt; hitT += dt;
  }
  function fxReset() { pushT = 9; wallT = 9; fadeT = 9; hitT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastLit = 0; lastCol = 0; for (const c of catches) c.t = 9; }
  function fxBack(f12) { if (!P.sit && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function drawWall(f12) {                                             // 竖直的蜂巢点阵护壁：3 格宽，每 4 行一个六边形符文格
    if (wallT > 3) return;
    const X = wx(WALL_LX), rise = Math.min(WALL_H, 8 * (Math.floor(wallT * 12 + 1e-6) + 1)), gone = fadeT > 3 ? 0 : Math.min(WALL_H, 6 * (Math.floor(fadeT * 12 + 1e-6) + 1));
    if (gone >= WALL_H) return;
    const shim = Math.floor(E.stepN / 6);
    for (let j = 0; j < rise && j < WALL_H - gone; j++) {
      const y = HY - 1 - j, cell = Math.floor(j / 4), rj = j & 3, hot = hitT < 2 / 12 && Math.abs(y - hitY) <= 2;
      const edge = j === rise - 1 && rise < WALL_H ? EL[0] : j === WALL_H - gone - 1 && gone ? EL[1] : ((cell + shim) % 3 === 0 ? EL[1] : EL[2]);
      const c = hot ? (hitT < 1 / 12 ? 21 : EL[0]) : edge;
      if (rj === 0 || rj === 3) put(X, y, c); else { put(X - 1, y, c); put(X + 1, y, c); if (((j + f12) & 1) === 0) put(X, y, hot ? c : EL[3]); }
      if (bayer(X + 2, j + f12) < 0.1) put(X + 2, y, EL[3]); if (bayer(X - 2, j - f12) < 0.08) put(X - 2, y, EL[3]);
    }
    for (let dx = -3; dx <= 3; dx++) if (((dx + f12) & 1) === 0 || Math.abs(dx) < 2) put(X + dx, FLOOR, Math.abs(dx) < 2 ? EL[2] : EL[3]);
  }
  function fxFront(f12) {
    drawWall(f12);
    for (const c of catches) if (c.t < 2 / 12) {                        // 吸在护壁上的敌弹：第 1 帧敌色、第 2 帧被染成紫色
      const R = c.t < 1 / 12 ? FXR[R_EN] : EL; put(c.x, c.y, R[0]); put(c.x + 1, c.y, R[1]); put(c.x, c.y - 1, R[1]); put(c.x, c.y + 1, R[1]); put(c.x + 2, c.y, R[2]);
    }
    if (pushT < 2 / 12 && P.dq < 1) {                                  // 盾推的冲击波：贴着盾面往前鼓出的一道弧（第 2 帧断续、往前 1 格）
      const x0 = wx(P.gx + SH_HW + 1) + (pushT < 1 / 12 ? 0 : 1), gy = wy(P.gy);
      for (let dy = -8; dy <= 8; dy++) { if (pushT >= 1 / 12 && (dy & 1)) continue; const q = dy / 9, b = RD(2 * (1 - q * q)); put(x0 + b, gy + dy, pushT < 1 / 12 ? (Math.abs(dy) < 4 ? EL[0] : EL[1]) : EL[2]); if (Math.abs(dy) < 6) put(x0 + b - 1, gy + dy, EL[3]); }
    }
    if (P.gem === 3 && P.dq < 1 && !P.sit) {                            // 盾心星芒（出手 / 施放）
      const gx = wx(P.gx), gy = wy(P.gy);
      for (let r = 2; r <= 4; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '魔盾兵', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.rune, M.eye], HIT_POINT: [10, -13], EVENTS, R_HURT: R_IMP,
    SFX: { body: 'armor', how: 'collapse', pal: 'arcane', style: 'shield', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
