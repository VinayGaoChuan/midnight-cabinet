// 狮锤（部队 · 骷髅 · 圣骑士 · 传说 · batch-15）：血骑士吃撑了——骨架外面套一只圆滚滚的赤红桶甲（三道钢箍），头戴整颗金红狮子头盔（骷髅脸从狮嘴里露出），
// 背后一口冒热气的炖汤锅（锅沿搭两块颅骨、斜插一把长勺），双手一柄金狮首巨锤（骨柄），狮皮燕尾披风。
// 攻击 = 扫（锤从身后抡过身前横扫）；技能 = 特性「颅骨炖汤」：锅里沸腾、颅骨翻滚、白蒸汽柱螺旋上升 → 反手抽勺舀汤从肩上甩出 → 汤团在友军头上溅开，升起治疗十字。
// 由「血骑士」（BloodKnight.js）升级而来：盔缨 → 狮鬃，盾面圣杯 → 背后的汤锅，燕尾披风 → 狮皮燕尾披风。
PCD.define('LionHammer', (E) => {
  const { parts, Sprite, bake, part, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_EMBER,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx, allyPoints, allyFx } = E;
  const RD = Math.round, px = parts.px, FREE = parts.FREE, HALF = Math.PI / 2;

  // ───── 元素：颅骨炖汤 · 肉汤红（blood）+ 蒸汽白（steam：白 → 米白 → 奶油 → 暖灰 → 灰紫，全部取自共享色板）─────
  const R_EL = FXI.blood, EL = FXR[R_EL], R_IMP = FXI.impact, R_STEAM = fxRamp('steam', [21, 17, 6, 7, 18]);

  // ───── 材质 ─────
  const M = parts.mats(E, {
    cape: { r: 'crimson', band: 2 },                                 // 狮皮披风（主材质）
    lac: 'crimson',                                                  // 桶甲漆面
    steel: 'steel', pot: 'iron', bone: 'bone', gold: 'gold', wood: 'wood',
    mane: [44, 45, 14, 47],                                          // 金红狮鬃（头盔）
    lmane: [44, 19, 45, 14],                                         // 锤头狮首的鬃：锈红 + 暗金褐鬃刺（和金色狮脸、赤红桶甲都分开）
    ink: { r: 'ink', flat: 1 },
    soup: { r: [55, 56, 57, 58], flat: 1 },                          // 发光体：锅里的汤（blood 暗段）
    eye: { r: [55, 56, 57, 58], flat: 1 },
  });
  const BODY = { body: 'fat', leg: 8, torso: 11, head: 7, headW: 7, sw: 6, belly: 3, arm: 11, stride: 2 };
  const BODY_SIT = Object.assign({}, BODY, { leg: 3 });
  const MAUL = { len: 8, back: 6 }, MAUL_IDLE = { len: 6, back: 5 };   // len = 握点到套口的骨柄长（手下至少露 6 格骨柄）
  const HX = 70, DUR = DEFAULT_DUR.slice();                        // 站位往后让 4 格：拄在身前的狮首锤头不被假人挡住
  const hero = new Sprite(92, 66, 46, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['soup', 'eye', 'ink', 'wood']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 锤柄（hx hy a），后手（bhx bhy）= 锤柄后段 / 长勺 / 自由 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, stir: 0, hm: 0, boil: 0, skull: 0, ladle: 0, sit: 0, tilt: 0, pot: 0, potX: 0, potY: 0, potR: 0, drop: 0, bh: 0,
    st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(13, -18, Math.PI, 13, -21);                       // 双手拄锤：锤头立在身前地上，前手在下、后手在上握着骨柄
  const K_WIND = K(0, -17, -HALF, -3, -17, -1, -1);                  // 锤抡到身后（双手）
  const K_MID = K(6, -14, 0, 4, -14);                                // 锤头抡过身前（柄朝镜头，看见狮首侧脸）
  const K_STRIKE = K(9, -15, HALF, 5, -15, 1);                       // 横扫到身前
  const K_HOLD = K(9, -12, 2.3, 7, -14, 1);
  const K_CHARGE = K(13, -18, Math.PI, -7, -26, -1, -1);             // 锤拄地，后手伸到背后握住勺柄
  const K_CAST = K(13, -18, Math.PI, -3, -30, -2, -1);               // 施放第 0–1 帧：长勺从肩上反手抡到背后，桶身后仰
  const K_CAST2 = K(13, -18, Math.PI, -7, -26, -1, -1);              // 甩出后：勺子停在身后
  const K_HURT = K(9, -18, 2.75, 8, -21, -1, -1);
  const K_STAG = K(8, -19, 2.8, 7, -22, -1, -1, 2);
  const K_SIT = K(8, -6, 0, -9, -3, -1);                             // 坐倒：前手搭在膝上，后手撑地
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -2, 2], ['head', -1, 2], ['crouch', 0, 7],
    ['bob', 0, 1], ['stir', 0, 4], ['hm', 0, 1], ['potR', 0, 3], ['potX', -32, 8]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lift', 0, 3], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['boil', 0, 3], ['skull', 0, 3], ['ladle', 0, 1], ['sit', 0, 1], ['tilt', 0, 1], ['pot', 0, 2], ['potY', -30, 0], ['drop', 0, 1], ['bh', 0, 1]]);
  const SWAY = [0, 1, 0, -1], STIR = [[0, 0], [1, -1], [0, -2], [-1, -1], [0, 0]], SKULL = [1, 2, 3, 3, 2, 1];
  const T_STRIKE = 2 / 12, T_SIT = 1.0, T_POT = INCOMING + 0.85;   // T_SIT = 离地 0 的第一帧（f12，d = 0.7）
  const potAt = (R) => [parts.edges(R, R.yS + 3)[0] - 4, R.yS - 5];  // 锅口中心（部件坐标）：背后沿外 4 格、肩上 5 格

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.bob = 0;
    P.flip = 0; P.mx = 0; P.stir = 0; P.hm = 0; P.boil = (f12 >> 1) & 3; P.skull = 0; P.ladle = 0; P.sit = 0; P.tilt = 0; P.pot = 0; P.potX = 0; P.potY = 0; P.potR = 0; P.drop = 0; P.bh = 0;
    const idle = () => {                                              // 呼吸 2 帧、狮鬃 / 披风错相位摆；循环末尾搅汤两圈，热气吹动狮鬃
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = SWAY[(b + 1) & 3]; P.sway = SWAY[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6) { const f = Math.floor((lp - 1.6) * 12 + 1e-6); P.stir = 1 + (f & 3); P.beard = -1 - (f & 1); P.boil = f & 3; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                           // 鸭步：上身左右晃、锤头拖地离地 1 格、勺子磕锅沿
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.lean = P.step > 0 ? 1 : P.step < 0 ? -1 : 0;
      P.hy -= 1; P.stir = P.step > 0 ? 2 : P.step < 0 ? 4 : 0;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12) { setK(K_WIND, K_WIND, 0); P.beard = 2; P.sway = 1; }
      else if (tq < 2 / 12) { setK(K_MID, K_MID, 0); P.hm = 1; P.bx = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 3; P.beard = -2; P.sway = -2; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_STRIKE, K_HOLD, q); P.bx = RD(3 - q); P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); }
    } else if (st === CHARGE) {                                       // 锅里沸腾，颅骨翻滚冒出；后手伸去握勺柄；狮鬃被热气吹起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q); P.stir = q > 0.6 ? 1 + (f12 & 3) : 0;
      P.beard = q > 0.85 ? ((f12 & 1) ? -3 : -2) : -RD(q * 2); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.boil = f12 & 3; P.skull = tq < 0.6 ? 0 : SKULL[Math.floor((tq - 0.6) * 7.5 + 1e-6) % 6];
    } else if (st === CAST) {                                         // 抽勺甩汤：第 0–1 帧长勺从肩上反手抡到身后、桶身后仰；之后勺停在身后
      if (tq < 2 / 12) setK(K_CAST, K_CAST, 0); else setK(K_CAST, K_CAST2, ease.out(clamp01((tq - 2 / 12) / 0.2))); P.ladle = 1; P.beard = -3; P.sway = -1; P.gem = 3; P.rim = 3; P.boil = f12 & 3; P.glint = tq < 0.1 ? 1 : 0;
    } else if (st === RECOVER) {                                      // 长勺插回锅里
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST2, K_IDLE, q); P.ladle = q < 0.5 ? 1 : 0; P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                        // 踉跄 → 一屁股坐倒 → 背锅翻滚落地倒扣 → 狮头盔歪到一边 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        P.eyes = 1; P.gem = 4; P.drop = 1; P.bx = -2;
        if (d < 0.5) { setK(K_STAG, K_STAG, 0); P.beard = 2; }
        else { setK(K_SIT, K_SIT, 0); P.sit = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tilt = d >= 0.7 ? 1 : 0; P.beard = d < 0.8 ? 2 : 1; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
        if (d >= 0.55) {                                               // 背锅翻滚下来，扣在身后
          const pq = clamp01((d - 0.55) / 0.3); P.pot = pq >= 1 ? 2 : 1;
          P.potX = RD(-11 - 11 * pq); P.potY = Math.min(0, RD(-22 + 21 * pq * pq - Math.sin(pq * Math.PI) * 5)); P.potR = pq >= 1 ? 2 : [0, 1, 1, 2][Math.min(3, Math.floor(pq * 4))];
        }
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    if (st === IDLE || st === MOVE || st === ATTACK || st === HURT || st === REVIVE || (st === DEATH && !P.drop)) P.bh = 1;   // 后手也握在锤柄上
    if (st === RECOVER && tq > 0.45) P.bh = 1;
    const yo = P.sit ? 0 : Math.min(3, RD(P.crouch)) + P.bob;
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.stir && (st === IDLE || st === MOVE || st === CHARGE)) { const R = parts.rig(P, BODY), c = potAt(R), s = STIR[P.stir]; if (st !== MOVE) { P.bhx = c[0] + 1 + s[0]; P.bhy = c[1] - 4 + s[1]; P.bh = 0; } }
    if (P.pot) { P.gx = P.potX + P.bx; P.gy = P.potY - 1; }            // 发光体 = 锅里的汤
    else { const R = parts.rig(P, P.sit ? BODY_SIT : BODY), c = potAt(R); P.gx = c[0] + P.bx; P.gy = c[1] - P.lift; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：stewPot 背后的炖汤锅——T 的原点 = 锅口中心（v = 0 汤面行）：后沿一行、汤面（发光体，按 lv 5 档亮、boil 相位冒 2 个泡）、前沿一行亮边、
  // 锅身 9 行鼓腹（锅底 2 行煤灰暗段）、两只锅耳；o = { skulls 锅沿两块颅骨, rise 冒出汤面的颅骨高度 0–3, ladle 1 = 斜插的长勺（stir 1–4 = 勺柄搅动相位）}
  const BELLY = [5, 6, 6, 6, 6, 6, 5, 4, 3];
  function skull3(T, x, y, far) {                                     // 3×3 小颅骨：头顶亮、眼窝墨、牙排
    px(E, T, x, y, M.bone, 4); px(E, T, x + 1, y, M.bone, 4); px(E, T, x + 2, y, M.bone, far ? 2 : 3);
    px(E, T, x, y + 1, M.bone, 3); px(E, T, x + 1, y + 1, M.ink, 1); px(E, T, x + 2, y + 1, M.ink, 1);
    px(E, T, x, y + 2, M.bone, 2); px(E, T, x + 1, y + 2, M.bone, 4); px(E, T, x + 2, y + 2, M.bone, 2);
  }
  function stewPot(T, lv, o) {
    part();
    const st = lv === 4 ? 1 : lv === 3 ? 3 : lv >= 1 ? 3 : 2, b = o.boil || 0;
    for (let x = -4; x <= 4; x++) px(E, T, x, -1, M.steel, 2);        // 后沿（钢口）
    for (let x = -4; x <= 4; x++) px(E, T, x, 0, M.soup, lv === 3 && Math.abs(x) <= 1 ? 4 : st);
    if (lv !== 4) { const bx = [-2, 1, 3, -1][b], cx = [2, -3, 0, 1][b]; px(E, T, bx, -1, M.soup, lv >= 1 ? 4 : 3); if (lv >= 1) px(E, T, cx, -1, M.soup, 3); if (lv >= 2) px(E, T, (bx + cx) >> 1, -2, M.soup, 4); }
    px(E, T, -5, 0, M.steel, 4); px(E, T, 5, 0, M.steel, 2);
    if (o.rise) skull3(T, -2, -o.rise, 0);
    for (let x = -6; x <= 6; x++) px(E, T, x, 1, M.steel, x < 0 ? 4 : 3);   // 前沿：一行钢色高光、比锅身宽出 1 格的锅唇（倒扣在地上时也看得见锅口）
    for (let k = 0; k < BELLY.length; k++) { const w = BELLY[k], y = 2 + k; for (let x = -w; x <= w; x++) px(E, T, x, y, M.pot, k >= 7 ? 1 : 0); if (k === 3) px(E, T, -w + 1, y, M.pot, 4); }
    for (const q of [-1, 1]) { px(E, T, 7 * q, 3, M.pot, q < 0 ? 4 : 2); px(E, T, 8 * q, 3, M.pot, q < 0 ? 4 : 2); px(E, T, 8 * q, 2, M.pot, 3); px(E, T, 7 * q, 4, M.pot, 2); }   // 两侧锅耳（各伸出 2 格的环）
    if (o.skulls) { skull3(T, -6, -3, 1); skull3(T, 3, -3, 0); }
    if (o.ladle) {                                                    // 长勺：从汤里斜插出锅 5 格，勺柄头随 stir 搅动
      part(); const s = STIR[o.stir || 0], ex = -1 + s[0], ey = -6 + s[1];
      parts.line(E, T, 1, -1, ex, ey, M.wood, 3); px(E, T, ex, ey - 1, M.wood, 4);
    }
  }
  // 候选部件：lionHelm 狮子头盔——两个部件：鬃圈（头之前画：以头心为圆心按 12 撮长短交替的锯齿圆，撮间暗纹，下半圈随 beard 摆）
  // + 狮头上颌（头之后画：两只圆耳、额头 2 行、前伸 3 格的狮吻 + 墨鼻 + 两颗白獠牙垂在骷髅眼前）。dx dy = 整顶头盔的偏移（歪到一边）
  function lionMane(R, dx, dy) {
    part(); const cx = R.hx - 1 + dx, cy = RD((R.htop + R.hy) / 2) + dy, b = RD(P.beard || 0);
    for (let y = -9; y <= 9; y++) for (let x = -9; x <= 9; x++) {
      const a = Math.atan2(y, x), seg = Math.floor(((a + Math.PI) / (2 * Math.PI)) * 12 + 0.5) % 12, r = seg & 1 ? 6.2 : 7.6, lo = y > 2 ? b * 0.6 * (y - 2) / 6 : 0;
      const d = Math.hypot(x - lo, y);
      if (d > r) continue;
      const edge = Math.abs(((a + Math.PI) / (2 * Math.PI)) * 12 % 1 - 0.5) < 0.09 && d > 3;
      px(E, R, cx + x, cy + y, M.mane, edge ? 2 : d > r - 1.2 && y < 0 && x < 0 ? 4 : 0);
    }
  }
  function lionTop(R, dx, dy) {
    part(); const x0 = R.hx0 + dx, x1 = R.hx1 + dx, t = R.htop + dy, g = M.gold;
    px(E, R, x0 + 1, t - 2, g, 4); px(E, R, x0 + 2, t - 2, g, 3); px(E, R, x1 - 1, t - 2, g, 3); px(E, R, x1 - 2, t - 2, g, 2);   // 圆耳
    for (let x = x0; x <= x1; x++) px(E, R, x, t - 1, g, x === x0 ? 4 : 0);
    for (let y = t; y <= t + 1; y++) for (let x = x0 - 1; x <= x1 + 1; x++) px(E, R, x, y, g, 0);
    for (let y = t; y <= t + 2; y++) for (let x = x1 + 2; x <= x1 + 3 - (y === t + 2 ? 1 : 0); x++) px(E, R, x, y, g, y === t ? 4 : 0);   // 狮吻
    px(E, R, x1 + 4, t, M.ink, 0); px(E, R, x1 + 4, t + 1, g, 2);   // 墨鼻
    px(E, R, x1 - 1, t - 1, M.ink, 0);                                // 狮眼
    px(E, R, x1 + 1, t + 2, M.bone, 4); px(E, R, x1 + 1, t + 3, M.bone, 3); px(E, R, x1 + 3, t + 3, M.bone, 3);   // 獠牙
  }
  // 候选部件：lionMaul 狮首巨锤——骨柄（直线，握点后面留 back 格、前面 len 格插进钢套口）+ 15×12 金狮首锤头（侧脸朝右）：
  // 鬃（赤红，边上 2 格长的鬃刺朝上、朝后伸出）、尖耳、前伸 2 格的狮吻 + 墨鼻、张开的嘴（墨色口腔、舌、上下两颗白獠牙，嘴角把外轮廓咬出缺口）、钢套口。
  // 按柄的方向选套口位置：柄朝下 = 套口在头顶（LION_A，拄地 / 抡下）；柄朝右 / 左 = 套口在后脑（LION_B，横扫时狮子朝前咬；朝左镜像）。
  // o = { len, back, at / a / free, face 1 = 柄朝镜头（抡过身前那一帧：只看见狮首侧脸，中心压在双手上）}。返回锤头中心
  const LION_A = [
    '..m......f.....',
    '..mm.sLs.fF....',
    'm..mMSSSMFFF...',
    '.mmMMMMMhFFfF..',
    '..MMMMMmhFFeFF.',
    'mmMMMMMMFFFFFhn',
    '..MMMmMMFFFFFFf',
    '.mMMMMMmFFFoot.',
    'mmMMmMMMFFfor..',
    '..MMMMMMFFFFFt.',
    '...mMMmMfFFFf..',
    '....m.mm.m.....'];
  const LION_B = LION_A.slice(); LION_B[1] = '..mm.m.m.fF....'; LION_B[2] = 'm..mMMmMMFFF...';
  LION_B[5] = 'LSMMMMMMFFFFFhn'; LION_B[6] = 'SSMMMmMMFFFFFFf'; LION_B[7] = 'sSMMMMMmFFFoot.';
  const LROLE = { M: [M.lmane, 0], m: [M.lmane, 2], F: [M.gold, 0], f: [M.gold, 2], h: [M.gold, 4], e: [M.ink, 0], n: [M.ink, 0], o: [M.ink, 0],
    r: [M.cape, 4], t: [M.bone, 4], S: [M.steel, 0], s: [M.steel, 2], L: [M.steel, 4] };
  function stampLion(T, G, x0, y0, mir) {                               // G 的 (0, 0) 格放在 (x0, y0)；mir = 左右镜像（狮子朝左）
    for (let r = 0; r < G.length; r++) for (let c = 0; c < G[r].length; c++) {
      const role = LROLE[G[r][c]]; if (!role) continue; px(E, T, mir ? x0 - c : x0 + c, y0 + r, role[0], role[1]);
    }
  }
  function lionMaul(R, o) {
    const T = o.free ? FREE : R, gx = o.at ? o.at[0] : P.hx, gy = o.at ? o.at[1] : P.hy, a = o.a != null ? o.a : P.a;
    if (o.face) { part(); stampLion(T, LION_A, gx - 7, gy - 6, 0); return [gx, gy]; }
    const dx = Math.sin(a), dy = -Math.cos(a), down = Math.abs(dy) >= Math.abs(dx) * 0.9;
    const len = !o.free && down && dy > 0 ? Math.max(4, Math.min(o.len, Math.floor((-12 - gy) / dy))) : o.len;   // 柄朝下时锤头不压进地面
    const ax = RD(gx + dx * len), ay = RD(gy + dy * len);
    const ox = down ? -1 : 0, oy = down ? 0 : -1, bx0 = gx - dx * o.back, by0 = gy - dy * o.back;   // 骨柄 2 格粗：朝光的一侧亮、另一侧灰（手的 2×2 正好包住）
    part(); parts.line(E, T, bx0 + ox, by0 + oy, ax + ox, ay + oy, M.boneD, 4); parts.line(E, T, bx0, by0, ax, ay, M.boneD, 2);
    px(E, T, bx0, by0, M.steel, 2); px(E, T, bx0 + ox, by0 + oy, M.steel, 4);                                   // 钢柄头
    const rx = gx + dx * (len - 2), ry = gy + dy * (len - 2); px(E, T, rx, ry, M.steel, 2); px(E, T, rx + ox, ry + oy, M.steel, 4);   // 柄上一道钢箍
    part();
    if (down) { stampLion(T, LION_A, ax - 6, ay, 0); return [ax + 1, ay + 6]; }   // 柄朝下：套口在头顶
    if (dx > 0) { stampLion(T, LION_B, ax + 1, ay - 6, 0); return [ax + 8, ay]; }                                       // 柄朝右：套口在后脑，狮子朝前
    stampLion(T, LION_B, ax - 1, ay - 6, 1); return [ax - 8, ay];                                                        // 柄朝左：镜像
  }
  // 坐倒的双腿：骨大腿平伸、胫甲、脚尖朝上（远侧先画、暗一级、往后 2 格高 1 格）
  function sitLegs(R) {
    for (const far of [1, 0]) {
      part(); const o = far ? -2 : 0, yo = far ? -1 : 0, bm = far ? M.boneD : M.bone, sm = far ? M.steelD : M.steel, x0 = R.hipFx - 2 + o;
      for (let y = -3 + yo; y <= -1 + yo; y++) for (let x = x0; x <= x0 + 6; x++) px(E, R, x, y, bm, 0);
      for (let y = -3 + yo; y <= -1 + yo; y++) for (let x = x0 + 7; x <= x0 + 10; x++) px(E, R, x, y, sm, y === -3 + yo ? 4 : 0);
      for (let y = -6 + yo; y <= -1 + yo; y++) { px(E, R, x0 + 11, y, sm, 0); if (y > -5 + yo) px(E, R, x0 + 12, y, sm, 2); }
      px(E, R, x0 + 6, -4 + yo, bm, 4);                                 // 膝盖
    }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, P.sit ? BODY_SIT : BODY), c = potAt(R);
    parts.cape(E, R, P, { style: 'tattered', mat: M.cape, len: P.sit ? 0 : -2, flare: 6, trim: M.gold });
    if (!P.pot) stewPot({ r0: 0, tx: c[0], ty: c[1], rot: 0, ox: 0, oy: 0 }, P.gem, { boil: P.boil, rise: P.skull, skulls: 1, ladle: !P.ladle, stir: P.stir });
    else stewPot({ r0: P.potR, tx: P.potX, ty: P.potY + P.lift, rot: 0, ox: 0, oy: 0 }, P.pot === 2 ? 4 : 3, { skulls: 0 });   // 翻滚时锅口汤线还亮着，扣地后熄
    const holdMaul = !P.drop, backOnMaul = P.bh === 1;
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.boneD, hand: M.boneD, grip: backOnMaul ? 'none' : 'fist' });
    if (P.sit) sitLegs(R);
    else parts.legs(E, R, P, { style: 'greave', mat: M.bone, matD: M.boneD, boot: M.steel, bootD: M.steelD, w: 3, bootH: 5 });
    const tr = parts.torso(E, R, P, { style: 'plate', mat: M.lac });
    for (const y of [R.yS + 2, R.yWaist, R.yHip + 1]) { const e = parts.edges(R, Math.min(y, R.yHip)); for (let x = e[0]; x <= e[1] + (y > R.yS + 2 ? 1 : 0); x++) px(E, R, x, y, M.steel, x === e[0] + 1 ? 4 : 0); px(E, R, e[1] - 1, y, M.steel, 4); }   // 三道钢箍 + 铆钉（和桶甲同一部件）
    for (let y = R.yS + 3; y < R.yHip + 1; y++) { if (y === R.yWaist) continue; const e = parts.edges(R, y); for (let x = e[0] + 3; x < e[1] - 1; x += 3) px(E, R, x, y, M.lac, 2); }   // 竖桶板缝
    const tdx = P.tilt ? -2 : 0, tdy = P.tilt ? 1 : 0;
    lionMane(R, tdx, tdy);
    parts.head(E, R, P, { mat: M.bone, face: 'gaunt', eye: M.ink, eyeStyle: 'narrow', nose: 'none', mouth: 'none', ear: 'none' });
    if (!P.eyes) px(E, R, R.hx1 - 1, R.ey, M.eye, 3);                    // 眼窝里的红眼光
    px(E, R, R.hx1, R.ey + 2, M.ink, 0);                              // 鼻孔
    for (let x = R.hx1 - 3; x <= R.hx1; x++) px(E, R, x, R.hy, (x & 1) ? M.ink : M.bone, (x & 1) ? 0 : 4);   // 牙排
    lionTop(R, tdx, tdy);
    if (P.st === DEATH && P.drop) lionMaul(R, Object.assign({}, MAUL_IDLE, { free: 1, at: [14, -18 + P.lift], a: Math.PI }));   // 撒手：锤头立在地上
    else if (P.hm) lionMaul(R, { face: 1 });
    else lionMaul(R, P.st === ATTACK ? MAUL : MAUL_IDLE);
    if (P.ladle) { part(); const hx = P.bhx, hy = P.bhy; parts.line(E, R, hx + 1, hy + 1, hx - 5, hy - 2, M.wood, 3); px(E, R, hx - 6, hy - 2, M.pot, 3); px(E, R, hx - 6, hy - 3, M.pot, 4); px(E, R, hx - 7, hy - 2, M.soup, P.gem >= 3 ? 4 : 3); px(E, R, hx - 7, hy - 3, M.pot, 3); }
    if (backOnMaul && holdMaul) parts.hand(E, R, P, { side: 'B', hand: M.bone });
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.bone, pauldron: M.steel, trim: M.gold, cuff: M.steel, cuffStyle: 'bracer', hand: M.bone, grip: 'fist' });   // 前臂钢护腕：和骨柄分开
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ALLY_X = [HX - 26, HX - 40];
  let steamAcc = 0, soulAcc = 0, lastStep = 0, swT = 9, spillT = 9, lastStir = -1;
  let soupOn = 0, sX = 0, sY = 0, sVX = 0, sVY = 0, sAge = 0, sDur = 0, sTX = 0, sTY = 0, trailAcc = 0;
  const G = 520;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function dust(x, n, spd) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * spd, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function steam(x, y, n, up) { for (let i = 0; i < n; i++) spawn(K_EMBER, x + (Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * 8, -(up || 14) - Math.random() * 10, 0.6 + Math.random() * 0.5, R_STEAM); }
  const PLUS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  function plus(x, y, vy, life) { x = RD(x); y = RD(y); for (const [dx, dy] of PLUS) spawnX(K_PHYS, x + dx, y + dy, 0, vy, life, R_EL, {}); }
  function onEnter(s) {
    if (s !== CAST) return;                                            // 甩汤：汤团从勺里沿抛物线飞向身后的友军
    const a = allyPoints()[0], bx = wx(P.bhx - 7), by = wy(P.bhy - 2), T = 0.33;
    soupOn = 1; sX = bx; sY = by; sTX = a.x; sTY = a.top - 3; sDur = T; sAge = 0; sVX = (sTX - sX) / T; sVY = (sTY - sY - 0.5 * G * T * T) / T;
    const px0 = wx(P.gx), py0 = wy(P.gy);
    burst(px0, py0 - 1, 16, 30, 80, 0.25, 0.55, R_EL, 30); steam(px0, py0 - 2, 10, 20); ring(px0, py0, 1, R_EL);
    shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'water' });
  }
  function splash(x, y) {                                            // 汤团溅开：汤滴落地、治疗十字升起、一团白蒸汽、友军闪绿
    for (let i = 0; i < 16; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * 70, -30 - Math.random() * 50, 0.6 + Math.random() * 0.3, R_EL, { g: 260, floor: HY });
    for (let k = 0; k < 3; k++) plus(x - 4 + k * 4, y + 8 - k * 2, -24 - k * 4, 0.7);
    fx.cloud(x, y + 2, 6, R_STEAM, 0.9, 2); fx.cross(x, y + 1, 5, R_EL, 0.3); allyFx({ dur: 0.5, tint: FXI.nature });
    shake(0.12, 1); sfx('impact', { pal: 'blood', w: 0.7 });
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_STRIKE) < 1e-9) {               // 横扫命中：身前压扁的椭圆拖影、impact 外爆、假人大摇
      swT = 0; const y = wy(P.hy) - 1, x = Math.min(wx(P.hx + P.bx + 10), DUMMY_X - 3);
      hitDummy(1); burst(x, y, 14, 50, 120, 0.15, 0.4, R_IMP, 12); fx.cross(x, y, 5, R_IMP, 0.22); shake(0.1, 1);
      sfx('swing', { kind: 'smash', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.9 });
    }
    if (s === DEATH && Math.abs(t - T_SIT) < 1e-9) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, wx(2) + (Math.random() - 0.5) * 24, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.9 });
    }
    if (s === DEATH && Math.abs(t - T_POT) < 1e-9) {                   // 锅扣在地上：汤泼一地，最后一股蒸汽
      spillT = 0; const x = wx(-22);
      for (let i = 0; i < 12; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, HY - 3, (Math.random() - 0.5) * 60, -20 - Math.random() * 30, 0.6 + Math.random() * 0.3, R_EL, { g: 240, floor: HY });
      steam(x, HY - 10, 12, 18); dust(x, 8, 30); sfx('fall', { w: 0.5 });
    }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [], [], [], [T_SIT, T_POT], []];
  function hurtFx(s) {
    const hx = HX + 2, hy = HY - 15; burst(hx, hy, s === DEATH ? 26 : 22, 60, 150, 0.2, 0.5, R_IMP, 20); burst(hx, hy, 4, 60, 120, 0.6, 0.9, FXI.steel, 30);
    for (let i = 0; i < 5; i++) spawnX(K_PHYS, hx + (Math.random() - 0.5) * 6, hy + 4, (Math.random() - 0.5) * 40, -20 - Math.random() * 20, 0.5 + Math.random() * 0.3, FXI.dust, { g: 120, floor: HY });
    for (let i = 0; i < 3; i++) spawnX(K_PHYS, wx(P.gx) + (Math.random() - 0.5) * 6, wy(P.gy) - 2, -10 - Math.random() * 30, -30 - Math.random() * 20, 0.6, R_EL, { g: 220, floor: HY });
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                           // 白蒸汽柱从锅口螺旋上升
      steamAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE]));
      while (steamAcc >= 1) { steamAcc -= 1; const ph = stT * 9 + Math.random() * 0.6; spawnX(K_PHYS, gx + Math.sin(ph) * 3, gy - 2, Math.cos(ph) * 14, -26 - Math.random() * 14, 0.7 + Math.random() * 0.4, R_STEAM, { dragX: 0.4 }); }
    }
    if (state === IDLE) {                                             // 搅汤：第 1、2 圈各冒一团热气；平时偶尔一缕
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastStir) { if (f === 1 || f === 5) steam(gx, gy - 2, 5, 16); lastStir = f; }
      if (Math.random() < dt * 1.5) steam(gx, gy - 1, 1, 10);
    }
    if (state === RECOVER && Math.random() < dt * 6) steam(gx, gy - 1, 1, 12);
    if (soupOn) {                                                     // 汤团：抛物线飞行，尾巴是蒸汽
      sAge += dt; sX += sVX * dt; sY += sVY * dt; sVY += G * dt; trailAcc += dt * 40;
      while (trailAcc >= 1) { trailAcc -= 1; spawn(K_EMBER, sX + (Math.random() - 0.5) * 2, sY - 1, -sVX * 0.1, -8 - Math.random() * 6, 0.35 + Math.random() * 0.2, R_STEAM); }
      if (sAge >= sDur) { soupOn = 0; splash(sTX, sTY); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.9 }); dust(wx(P.step > 0 ? 5 : -4), 3, 20); } lastStep = P.step; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-14) + Math.random() * 28, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    swT += dt; spillT += dt;
  }
  function fxReset() { steamAcc = 0; soulAcc = 0; lastStep = 0; swT = 9; spillT = 9; lastStir = -1; soupOn = 0; trailAcc = 0; }
  function fxBack(f12) {
    if (P.dq < 1 && !P.pot) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    if (spillT < 2.2 && E.state === DEATH) {                          // 泼在地上的一滩汤（从锅口往前铺开，最后断续褪去）
      const w = Math.min(9, RD(spillT * 40)), x0 = wx(-22), late = spillT > 1.6;
      for (let x = -w; x <= w + 3; x++) { if (late && ((x + f12) & 1)) continue; put(x0 + x, HY + 1, Math.abs(x) < w * 0.5 ? EL[3] : EL[4]); if (Math.abs(x) < 3 && !late) put(x0 + x, HY, EL[2]); }
    }
  }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.pot) {            // 汤面星芒
      const gx = wx(P.gx), gy = wy(P.gy) - 1, L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); }
    }
    if (swT < 2 / 12) {                                               // 横扫拖影：身前半个压扁的椭圆（锤头从身后绕过镜头前扫到身前）
      const cx = wx(3 + P.bx), cy = wy(P.hy) + 1, rx = 22, ry = 4, first = swT < 1 / 12;
      for (let k = 0; k <= 40; k++) { if (!first && (k & 1)) continue; const th = -HALF + Math.PI * k / 40, x = RD(cx + rx * Math.sin(th)), y = RD(cy + ry * Math.cos(th));
        put(x, y, first ? (k > 26 ? EL[0] : EL[1]) : EL[3]); if (first) put(x, y - 1, EL[2]); }
    }
    if (soupOn) {                                                     // 汤团：2×2 暗红芯 + 淡粉边
      const x = RD(sX), y = RD(sY); put(x, y, EL[2]); put(x + 1, y, EL[3]); put(x, y + 1, EL[3]); put(x + 1, y + 1, EL[3]); put(x - 1, y, EL[1]); put(x, y - 1, EL[1]); put(x + 1, y - 1, EL[0]);
    }
  }

  return {
    name: '狮锤', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.soup, M.eye], HIT_POINT: [2, -15], EVENTS, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'armor', how: 'collapse', pal: 'blood', style: 'heal', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
