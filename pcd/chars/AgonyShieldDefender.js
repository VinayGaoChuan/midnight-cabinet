// 苦痛盾卫（部队 · 自然 · 守护者 · 稀有）：诅咒剑士的升级——同一个人，更高更瘦、收腰（女性），被两柄猩红长刃从背后斜穿胸口，身体微微前弓；
// 苍灰亚麻长罩袍 + 灰铁甲，半毁的桶盔（前下半边碎了，露出下巴和一缕灰发，上半还是紫色独眼缝），背后剑扇 5 柄（2 柄染红），双手一面高 14 格的刃缘大盾。
// 攻击 = 冲撞（双手推盾前撞 3 格，盾缘锯刃刮过目标）；技能 = 特性「剑雨」：拔出穿身刃 → 举盾过顶射出 7 柄红刃 → 红刃以 30° 斜角成排落下 → 刃飞回插回身体。
// 升级成「魔王近卫」（DemonKingsGuard.js）：剑扇变成剑轮，穿身刃被黑甲包住。
PCD.define('AgonyShieldDefender', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_SPIRAL, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, PI = Math.PI;

  // ───── 元素：剑雨 · 猩红刃光（共享 FX.blood：21 白 → 58 淡玫瑰 → 57 猩红 → 56 暗红 → 55 墨红）─────
  const R_EL = FXI.blood, EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    robe: { r: ['#151418', '#3a3840', '#67646e', '#9c98a2'], band: 2 },    // 苍灰亚麻长罩袍（面积最大）
    iron: ['#151418', '#3a3840', '#67646e', '#9c98a2'],                     // 灰铁甲（盔、臂、胫）
    blade: ['#2a0508', '#6e0e16', '#c0202c', '#ff6a6a'],                    // 猩红刃
    frame: 'iron', steel: 'steel', skin: 'skin', hair: 'pale', leather: 'leather', wood: 'wood', trim: 'blood',
    rune: { r: ['#6e0e16', '#c0202c', '#ff6a6a', 21], flat: 1 },           // 剑扇染红的刃（发光体，按 P.gem 亮）
    eye: { r: [25, 42, 24, 43], flat: 1 },
  });
  const BODY = { body: 'standard', leg: 10, torso: 10, head: 7, waist: 1, fall: 'front' };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 58, 34, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'rune', 'eye', 'skin', 'hair', 'leather', 'blade']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // 背后剑扇 5 柄（握点 = 剑柄；第 1、3 柄染红）
  const FAN = [[-14, -19, 1.571, 0], [-14, -24, 2.034, 1], [-12, -27, 2.356, 0], [-9, -29, 2.678, 1], [-5, -31, PI, 0]];
  // 两柄穿身刃：起点（柄头）+ 吸附方向；k = 0 柄头 · 1–2 握把 · 3 护手 · 4.. 刃；SPLIT 之后在身体前面
  const THRU = [[-12, -9, parts.snapDir(1.107)], [-12, -24, parts.snapDir(2.034)]], TN = 18, SPLIT = 14;

  // ───── 姿势：后手（远侧）挎大盾（盾心 = 后手）；前手平时按住胸前的刃，攻击 / 施放时也扶盾 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, pull: 0, eject: 0, fy: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -17, 11, -9, 1);                    // 前手按住胸前穿出的刃，后手拄着大盾
  const K_WIND = K(6, -12, 6, -10, 0, 0, 1);             // 盾收回、蓄势
  const K_BASH = K(10, -12, 11, -10, 1, 1);              // 双手推盾前撞
  const K_HOLD = K(9, -12, 10, -10, 1);
  const K_CHARGE = K(9, -18, 8, -9, 0, -1);              // 抓住穿身刃往外拔
  const K_CAST = K(5, -27, 3, -27, -1, -1);              // 举盾过顶
  const K_HURT = K(3, -17, 7, -9, -1, -1);
  const K_KNEEL = K(7, -12, 10, -8, 2, 1, 4);
  const K_LIE = K(2, -26, 0, -25, 0, 0, 0);             // 扑倒：双臂向前伸过头顶
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['pull', 0, 3], ['eject', 0, 2], ['fy', 0, 2], ['lying', 0, 1], ['lift', 0, 4]]);
  const T_BASH = 2 / 12, T_LAND = INCOMING + 0.66, T_STICK = INCOMING + 0.84, T_WAVE = [0.06, 0.18, 0.3], T_BACK = 0.3;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.pull = 0; P.eject = 0; P.fy = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];                                        // 待机个性：痛苦颤抖——肩膀一抽一抽，最后低头
      if (lp >= 1.3 && lp < 2.1) { const k = Math.floor((lp - 1.3) * 12 + 1e-6); P.bob = k & 1; P.hy += (k & 1) ? 1 : 0; P.beard = (k & 1) ? 1 : -1; if (k >= 6) { P.lean = 2; P.head = 1; P.eyes = 1; } }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 拖盾踉跄：盾底拖在地上，上身前弓，一步重一步轻
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.bhy = -8; P.bhx = 11; P.lean = 1;
      if (P.step > 0) { P.bob = 1; P.crouch = 1; } else if (P.step < 0) P.bob = 0;
      const w = walkDemo(tq, 11, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; P.bx = -1; }
      else if (tq < 0.2) { setK(K_BASH, K_BASH, 0); P.bx = 5; P.beard = -2; P.sway = -1; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_BASH, K_HOLD, q); P.bx = RD(5 - q * 2); P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                         // 拔刃：两柄刃慢慢滑出身体；背后 5 柄剑变红、浮起
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.pull = tq < 0.35 ? 0 : tq < 0.75 ? 1 : 2; P.fy = tq < 0.5 ? 0 : 1 + ((f12 >> 1) & 1);
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.hy += (f12 & 1) && tq > 0.4 ? 1 : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                           // 刃拔出的瞬间举盾过顶
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.pull = 3; P.fy = 2; P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.glint = tq < 0.1 ? 1 : 0;
    } else if (st === RECOVER) {                                        // 刃飞回、重新插回身体，她一颤
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.pull = tq < T_BACK ? 3 : 0; P.fy = tq < 0.3 ? 1 : 0;
      if (tq >= T_BACK && tq < T_BACK + 0.17) { P.bx = -1; P.eyes = 1; P.lean = 2; P.beard = 2; }
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 前扑：扑倒压在盾上 → 两柄穿身刃被震出、弹飞插在地上 → 血色魂光
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else {
        setK(K_LIE, K_LIE, 0); P.lying = 1; P.bx = -8; P.eyes = 1; P.lift = d < 0.58 ? 4 : d < 0.66 ? 3 : 2;
        P.eject = d < 0.66 ? 0 : d < 0.84 ? 1 : 2; P.gem = d < 1.0 ? ((f12 & 1) ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { P.gx = 0; P.gy = -4; }
    else if (st === CAST) { P.gx = P.bhx + P.bx; P.gy = P.bhy - 7; }
    else { P.gx = -10 + P.lean + P.bx; P.gy = -26 - P.fy; }            // 发光体 = 背后染红的剑扇
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画 ─────
  // 候选部件：穿身刃（从背后斜穿身体的长刃；part 'back' 画柄 + 身后那段，'front' 画从胸前穿出的刃尖，off = 往前拔出的步数）
  function thruBlade(R, i, which, off, T) {
    const t = THRU[i], di = t[2], o = parts.cell(di, t[0], t[1], off), pd = (di + 4) % 16;
    const k0 = which === 'front' ? SPLIT : 0, k1 = which === 'front' ? TN : SPLIT - 1;
    for (let k = k0; k <= k1; k++) {
      const c = parts.cell(di, o[0], o[1], k);
      if (k === 0) parts.px(E, T, c[0], c[1], M.frame, 4);
      else if (k <= 2) parts.px(E, T, c[0], c[1], M.leather, k === 1 ? 3 : 2);
      else if (k === 3) for (let j = -1; j <= 1; j++) { const g = parts.cell(pd, c[0], c[1], j); parts.px(E, T, g[0], g[1], M.frame, j < 0 ? 4 : j > 0 ? 2 : 3); }
      else if (k === TN) parts.px(E, T, c[0], c[1], M.blade, 4);
      else { parts.bar(di, o[0], o[1], k, k, 2, (kk, j, X, Y) => parts.px(E, T, X, Y, M.blade, j === 0 ? 4 : 3)); }
    }
  }
  function fanSword(R, i, lift) {                                       // 剑扇：锈钢 + 猩红刃（染红的两柄整片是发光刃）
    const f = FAN[i], red = f[3], lv = red ? (P.gem >= 1 ? Math.min(3, P.gem + 1) : 1) : (P.gem >= 2 ? 2 : 0);
    parts.sword(E, R, P, { style: 'long', metal: red ? M.blade : M.steel, edge: red ? M.blade : undefined, trim: M.frame, wood: M.wood, glow: M.rune, glowLv: lv, len: 9, at: [f[0] + R.lean, f[1] + R.bob + Math.min(3, R.cr) - lift], a: f[2] });
  }
  function brokenHelm(R) {                                              // 候选部件：半毁桶盔（前下半边碎掉，露出下巴；上半留着紫色独眼横缝）
    E.part(); const a = R.hx0 - 1, b = R.hx1 + 1, top = R.htop, ey = R.ey;
    parts.run(E, R, top - 1, a + 1, b - 1, M.iron, 0);
    for (let y = top; y <= R.hy; y++) {
      let x1 = b; if (y >= ey + 1) x1 = R.hx - 1 - (y - ey - 1 > 1 ? 1 : 0);
      parts.run(E, R, y, a, x1, M.iron, 0);
      if (y >= ey + 1 && x1 > a) parts.px(E, R, x1, y, M.iron, 4);     // 碎口亮边
    }
    parts.run(E, R, top, a, b, M.frame, 0); parts.px(E, R, a, top, M.frame, 4);
    parts.run(E, R, ey, R.hx, b, M.iron, 1); if (!P.eyes) parts.px(E, R, b - 1, ey, M.eye, 3);
    parts.px(E, R, a + 1, ey + 2, M.iron, 2); parts.px(E, R, b, ey - 1, M.iron, 4);
  }
  function towerShield(R, cx, cy, flat) {                               // 候选部件：刃缘大盾（铁框长方盾 8×14，盾缘一圈猩红锯刃；flat = 扑倒时压在身下，侧看一条）
    E.part();
    if (flat) {                                                         // 平放在地上：长 14、厚 2，前沿锯刃朝上
      for (let x = 0; x < 14; x++) { parts.px(E, parts.FREE, cx + x, -1, M.frame, x === 0 ? 4 : 0); parts.px(E, parts.FREE, cx + x, 0, M.iron, 2); if ((x & 1) === 0) parts.px(E, parts.FREE, cx + x, -2, M.blade, x === 0 ? 4 : 3); }
      return;
    }
    const x0 = cx - 4, x1 = cx + 3, y0 = cy - 7, y1 = cy + 6;
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      const rim = x === x0 || x === x1 || y === y0 || y === y1; let m = rim ? M.frame : M.iron, t = 0;
      if (!rim && (y === cy - 3 || y === cy + 3)) t = 2;                // 横铁条
      if (rim && (y === y0 || y === y1) && (x === x0 + 1 || x === x1 - 1)) t = 4;   // 铆钉
      if (!rim && x === x0 + 1 && y < cy) t = 4;                        // 盾面冷光
      parts.px(E, R, x, y, m, t);
    }
    for (let y = y0 - 1; y <= y1; y += 2) parts.px(E, R, x1 + 1, y, M.blade, y < cy ? 4 : 3);   // 前沿锯刃
    for (let x = x0; x <= x1; x += 2) parts.px(E, R, x, y0 - 1, M.blade, x < cx ? 4 : 3);      // 上沿锯刃
    parts.px(E, R, cx, cy, M.trim, 3); parts.px(E, R, cx - 1, cy, M.trim, 4);                 // 盾心红钉
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), lie = P.lying;
    if (lie) towerShield(R, 1, 0, 1);                                   // 扑倒压在盾上
    for (let i = 0; i < 5; i++) fanSword(R, i, P.fy);
    if (!lie && P.pull < 3) for (let i = 0; i < 2; i++) { E.part(); thruBlade(R, i, 'back', P.pull * 2, R); }
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.ironD, pauldron: M.ironD, grip: 'none' });
    parts.hair(E, R, P, { style: 'long', mat: M.hair, len: 4 });
    parts.legs(E, R, P, { style: 'greave', mat: M.iron, matD: M.ironD, boot: M.frame, bootD: M.frameD });
    parts.torso(E, R, P, { style: 'robe', mat: M.robe, trim: M.trim, belt: M.leather, buckle: M.frame, hem: -4, flare: 3 });
    parts.head(E, R, P, { mat: M.skin, face: 'gaunt', nose: 'small', mouth: 'line', ear: 'none' });
    { const x = R.hx, y0 = R.hy - 1; for (let k = 0; k < 5; k++) parts.px(E, R, x - (k > 2 ? 1 : 0) + (k === 4 ? RD(P.beard * 0.5) : 0), y0 + k, M.hair, k & 1 ? 3 : 4); }   // 一缕垂下的灰发（和脸同一部件）
    brokenHelm(R);
    if (!lie && P.pull < 3) for (let i = 0; i < 2; i++) { E.part(); thruBlade(R, i, 'front', P.pull * 2, R); }
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.iron, hand: M.iron, grip: 'fist' });
    if (!lie) towerShield(R, P.bhx, P.bhy, 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：剑雨（12 柄红刃，3 波，每波 4 柄以 30° 斜角落下）+ 刃飞回 ─────
  const RN_ = 12, rX = new Float32Array(RN_), rY = new Float32Array(RN_), rVY = new Float32Array(RN_), rOn = new Uint8Array(RN_), rLand = new Uint8Array(RN_);
  const SLANT = 0.58, RAIN_X = [-9, -3, 3, 9, -6, 0, 6, 11, -11, -1, 5, -4];
  let rainGone = -1, upT = 9, upX = 0, upY = 0, backT = 9, chargeAcc = 0, soulAcc = 0, bloodAcc = 0, lastStep = 0, waveHit = 0, ejT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function wave(k) { for (let j = 0; j < 4; j++) { const i = k * 4 + j, h = 44 + hash(i, 2) * 8; rOn[i] = 1; rLand[i] = 0; rVY[i] = 250; rY[i] = HY - h; rX[i] = DUMMY_X + RAIN_X[i] - h * SLANT; } }
  function bleed(n) { const c = parts.toSprite(parts.rig(P, BODY), 3 + P.lean, -17); for (let i = 0; i < n; i++) spawnX(K_PHYS, wx(c[0]), wy(c[1]) + Math.random() * 3, (Math.random() - 0.3) * 12, 5 + Math.random() * 10, 0.7 + Math.random() * 0.4, R_EL, { g: 160, floor: HY }); }
  function onEnter(s) {
    if (s !== CAST) return;
    upT = 0; upX = wx(P.gx); upY = wy(P.gy);                             // 7 柄红刃从盾后射向天空
    releaseOrbit(40, 90, 0.3, 0.6, { up: 30 }); burst(upX, upY, 20, 40, 110, 0.25, 0.55, R_EL, 40); fx.cross(upX, upY + 4, 6, R_EL, 0.3); bleed(6);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BASH) {                                 // 冲撞：盾缘锯刃刮过目标
      const cx = wx(K_BASH.bhx + 5), cy = wy(K_BASH.bhy);
      fx.slash(cx - 4, cy, 7, 0.2, 2.9, R_EL, 0.17, 2, 2); fx.cross(DUMMY_X - 5, HY - 12, 4, R_IMP, 0.2);
      hitDummy(0); burst(DUMMY_X - 5, HY - 12, 12, 40, 100, 0.15, 0.35, R_IMP, 10); burst(DUMMY_X - 5, HY - 10, 5, 30, 70, 0.15, 0.3, R_EL, 10);
      for (let i = 0; i < 3; i++) spawn(K_DUST, wx(4) + Math.random() * 3, HY, -20 - Math.random() * 20, -5 - Math.random() * 5, 0.3, FXI.dust);
      sfx('swing', { kind: 'smash', w: 0.55 }); sfx('hit', { mat: 'metal', w: 0.55 });
    }
    if (s === CHARGE && (t === 0.35 || t === 0.75)) { bleed(5); fx.cross(wx(9 + P.bx), wy(-18), 3, R_EL, 0.2); }
    if (s === CAST) { const k = T_WAVE.indexOf(t); if (k >= 0) wave(k); }
    if (s === RECOVER && t === 0.02) { backT = 0; rainGone = 0; }
    if (s === RECOVER && t === T_BACK) { bleed(4); fx.cross(wx(4), wy(-18), 4, R_EL, 0.2); }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 14; i++) spawn(K_DUST, HX + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.55 }); ejT = 0; }
    if (s === DEATH && t === T_STICK) { for (const x of [HX - 14, HX + 20]) { burst(x, HY - 1, 5, 20, 50, 0.15, 0.3, R_IMP, 8); } sfx('hit', { mat: 'metal', w: 0.3 }); }
  }
  const EVENTS = [[], [], [T_BASH], [0.35, 0.75], T_WAVE, [0.02, T_BACK], [], [T_LAND, T_STICK], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                             // 血色刃屑汇聚到背后的剑扇；伤口滴血
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, 0, 0, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT > 0.35) { bloodAcc += dt * 6; while (bloodAcc >= 1) { bloodAcc -= 1; bleed(1); } }
    }
    if (state === MOVE && P.step !== lastStep) {                        // 一步重一步轻：重步扬尘 + 盾底划出火星
      if (P.step !== 0) { sfx('step', { w: P.step > 0 ? 0.55 : 0.3 }); const sx = wx(P.bhx + 3); for (let i = 0; i < 3; i++) spawn(K_BURST, sx, HY - 1, -10 - Math.random() * 25, -10 - Math.random() * 15, 0.2 + Math.random() * 0.15, R_IMP); if (P.step > 0) for (let i = 0; i < 2; i++) spawn(K_DUST, wx(5) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastStep = P.step;
    }
    for (let i = 0; i < RN_; i++) {                                     // 剑雨：斜 30° 落下，落地一道短红竖线 + 血溅
      if (!rOn[i] || rLand[i]) continue;
      rVY[i] += 420 * dt; rY[i] += rVY[i] * dt; rX[i] += rVY[i] * SLANT * dt;
      if (rY[i] >= HY + 1) {
        rY[i] = HY + 1; rLand[i] = 1; const x = RD(rX[i]);
        for (let j = 0; j < 3; j++) spawnX(K_PHYS, x, HY - 2, (Math.random() - 0.5) * 30, -20 - Math.random() * 25, 0.5 + Math.random() * 0.3, R_EL, { g: 200, floor: HY });
        const k = 1 << Math.floor(i / 4);
        if (!(waveHit & k)) {
          waveHit |= k; hitDummy(1); shake(0.12, 1); burst(DUMMY_X, HY - 10, 10, 30, 80, 0.2, 0.45, R_EL, 16); if (k === 1) { dummyFx({ dur: 1.8, outline: R_EL, slow: 0.4 }); ring(DUMMY_X, HY - 2, 1, R_EL); }
          sfx('impact', { pal: 'blood', w: 0.5 + Math.floor(i / 4) * 0.12 });
        }
      }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 4 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
    upT += dt; backT += dt; ejT += dt;
    if (rainGone >= 0) { rainGone += dt; if (rainGone > 0.6) { rOn.fill(0); rainGone = -1; } }
  }
  function fxReset() { rOn.fill(0); rainGone = -1; upT = 9; backT = 9; ejT = 9; chargeAcc = 0; soulAcc = 0; bloodAcc = 0; lastStep = 0; waveHit = 0; }
  function fxBack(f12) { if (P.dq < 1 && !P.lying) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function rainBlade(x, y, landed, i, fade) {                          // 斜 30° 的红刃（1:2 吸附）：刃尖在下
    const X = RD(x), Y = RD(y);
    if (landed) { for (let k = 0; k < 3; k++) { if (fade && hash(i, k) < fade) continue; put(X, Y - 1 - k, k === 0 ? EL[2] : k === 1 ? EL[1] : EL[3]); } if (!fade) put(X, Y - 4, EL[4]); return; }
    for (let k = 0; k < 6; k++) { const px_ = X - (k >> 1), c = k === 0 ? EL[0] : k < 4 ? EL[1 + (k & 1)] : k === 4 ? EL[3] : 19; put(px_, Y - k, c); if (k === 4) put(px_ + 1, Y - k, EL[3]); }
  }
  function fxFront(f12) {
    if (upT < 0.22) for (let k = 0; k < 7; k++) {                       // 7 柄红刃射向天空（扇形）
      const dx = (k - 3) * (1 + upT * 30), x = RD(upX + dx), y = RD(upY - upT * 320 - Math.abs(k - 3));
      for (let j = 0; j < 5; j++) if (y + j >= 0) put(x, y + j, j === 0 ? EL[0] : j < 3 ? EL[1] : EL[2]);
    }
    const fade = rainGone >= 0 ? clamp01((rainGone - 0.1) / 0.4) : 0;
    for (let i = 0; i < RN_; i++) if (rOn[i]) rainBlade(rX[i], rY[i], rLand[i], i, rLand[i] ? fade : 0);
    if (backT < T_BACK) for (let k = 0; k < 2; k++) {                   // 收招：两柄刃反向飞回，插回她的身体
      const q = ease.inOut(backT / T_BACK), sx = DUMMY_X - 2, sy = HY - 16 - k * 5, ex = wx(-8 + k), ey = wy(-20 + k * 6), x = RD(sx + (ex - sx) * q), y = RD(sy + (ey - sy) * q - Math.sin(q * PI) * 10);
      for (let j = 0; j < 5; j++) put(x + j, y + (k ? -(j >> 1) : (j >> 1)), j === 0 ? EL[3] : j < 4 ? EL[1 + (j & 1)] : EL[0]);
    }
    if (P.lying && P.eject >= 1 && P.dq < 1) {                          // 震出的穿身刃：弹飞 → 插在地上
      const q = clamp01(ejT / 0.18);
      for (let k = 0; k < 2; k++) {
        const tx = k ? wx(20) : wx(-14), sx = wx(2), x = RD(sx + (tx - sx) * q), y = RD(HY - 8 - Math.sin(q * PI) * 12 - (q >= 1 ? -6 : 0));
        if (q < 1) { for (let j = 0; j < 6; j++) put(x + (k ? j : -j), y - (j >> 1), j === 5 ? 19 : j === 4 ? 28 : EL[j < 2 ? 1 : 2]); }
        else if (P.dq < 0.5) { const d = k ? 1 : -1; for (let j = 0; j < 7; j++) put(x - d * (j >> 1), HY - 1 - j, j === 5 ? 28 : j === 6 ? 19 : EL[j < 1 ? 3 : 2 - (j & 1)]); put(x - d * 2 - 1, HY - 6, 28); put(x - d * 2 + 1, HY - 6, 29); }
      }
    }
  }

  return {
    name: '苦痛盾卫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.rune, M.eye], HIT_POINT: [2, -14], EVENTS,
    SFX: { body: 'armor', how: 'topple', pal: 'blood', style: 'blade', w: 0.55 },
    REVIVE: { ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
