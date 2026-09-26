// 民兵（部队 · 人类 · 无职业 · 无品质 · 近战）：守城时临时拿起武器的平民。
// 圆胖小个子（约 22 格），头上倒扣一口铁锅当头盔（锅底烟黑、锅柄向后横伸），双手攥着比人还高的三齿草叉（一齿是弯的），
// 土褐粗布短衣 + 灰围裙被圆肚子顶出去，卷裤腿、草鞋，腰间麻绳挂着木勺和小布袋；红脸蛋、瞪圆的眼睛。
// 攻击 = 笨拙地往前捅草叉（先缩一下、闭一下眼）；技能 = 没有特性，表现「守城」的本能：把草叉插在地上，抱起一块大卵石举过头顶砸出去。
// 死亡 = 后退两步、一屁股坐倒、往后一仰躺下；锅盔飞出去扣在地上「铛铛铛」转三圈才停。全身没有发光体、没有魔法。
PCD.define('militia', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, shake, flash, fx, hitDummy, dummyFx, put, scrX, shotFloorGlow, groundShadow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2, px = parts.px;

  // ───── 元素：尘土 · 杂石（没有魔法元素）；汗珠用一条中性的白色阶 ─────
  const R_EL = FXI.dust, EL = FXR[R_EL], R_IMP = FXI.impact, R_SWEAT = fxRamp('sweat', [21, 17, 6, 7, 18]);
  const R_CLOUD = fxRamp('dustLight', [21, 17, 6, 7, 10]);   // 尘团：dust 提亮一级（fx.cloud 只用后三级，原 dust 的 10 / 9 / 8 在夜空里看不见）

  // ───── 材质（parts.mats：名字D = 暗一级，远侧腿 / 后臂用）─────
  const M = parts.mats(E, {
    tunic: { r: 'wood', band: 2 }, shirt: 'bone', apron: 'stone', rope: 'sand', skin: 'skin', blush: [11, 13, 58, 26],
    ink: { r: 'ink', flat: 1 }, eyeW: 'white', iron: 'iron', wood: 'wood', pouch: 'bone', rock: [8, 10, 18, 17], hair: 'boot',   // 卵石：冷灰（和奶白袖子的暖色拉开，抱在胸前 / 举过头顶时认得出）
  });
  const BODY = { body: 'fat', leg: 6, torso: 9, belly: 2, head: 6, headW: 6, sw: 4, neck: -1, stride: 2, arm: 9, limb: 1, fall: 'back' };
  const FORK = { hand: 'B', head: 'trident', metal: M.iron, wood: M.wood, trim: M.iron, len: 13, back: 8 };   // 后手握柄（前手搭在柄上，可以腾出来扶锅）
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(88, 42, 44, 37);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };   // 没有发光体：不开轮廓光
  const PLANT_X = -13, ROCK_X = 8, FORK_FLAT_X = 3, SIT = [0, 2, 4];

  // ───── 姿势：后手 = 草叉握点（bhx bhy ba），前手 = 搭在柄上（fh 格）或自由（扶锅、抱石头）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, look: 0, throat: 0, trem: 0, shout: 0,
    pot: 0, fk: 0, rock: 0, sit: 0, potOn: 0, potX: 0, potY: 0, spin: 0, prot: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (bhx, bhy, ba, lean, head, crouch, hx, hy) => ({ bhx, bhy, ba, lean: lean || 0, head: head || 0, crouch: crouch || 0, hx: hx || 0, hy: hy || 0 });
  const K_IDLE = K(8, -8, 0.1);                         // 草叉竖在身前，双手攥柄
  const K_WIND = K(-2, -9, HALF, -1, -1, 1);            // 往后一缩：叉放平、身子后仰
  const K_THRUST = K(3, -9, HALF, 2, 1, 0);             // 往前捅
  const K_OVER = K(4, -9, HALF, 2, 1, 1);               // 捅过头、差点栽倒
  const K_HURT = K(5, -8, -0.3, -1, -1, 0);
  const K_PLANT = K(-12, -11, 0, -1, -1, 0, 4, -10);      // 转身把草叉插在身后
  const K_GRAB = K(5, -3, 0, 1, 1, 3, 10, -3);          // 蹲下抱石头
  const K_CHEST = K(1, -13, 0, -1, 0, 1, 6, -13);       // 抱到胸口
  const K_LIFTED = K(-3, -23, 0, -1, -1, 0, 3, -23);    // 举过头顶（两手托在石头下角）
  const K_THROW = K(6, -17, 0, 2, 1, 0, 10, -16);       // 「嘿！」往前一扑
  const K_STUMBLE = K(6, -11, 0, 2, 1, 1, 10, -9);
  const K_PUSH = K(-3, -6, 0, 0, 0, 0, 5, -19);          // 推回锅盔
  const K_REACH = K(-12, -10, 0, -1, -1, 0, 5, -11);      // 回身拔草叉
  const K_SIT = K(-7, -5, 0, -1, 0, 0, 5, -12);          // 坐倒：后手撑地（坐姿整体下沉 4 格，手的坐标是下沉前的）
  const K_LIE = K(-4, -9, 0, 0, 0, 0, 5, -8);
  const FIELDS = ['bhx', 'bhy', 'ba', 'lean', 'head', 'crouch', 'hx', 'hy'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 23], ['hy', -40, 7], ['bhx', -16, 23], ['bhy', -40, 7], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 3], ['bob', 0, 1],
    ['look', -1, 1], ['throat', 0, 1], ['trem', -1, 1], ['shout', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -2, 2], ['sway', -1, 1], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['dq', 0, 48, 48],
    ['bx', -8, 8], ['st', 0, 8], ['pot', -1, 1], ['fk', 0, 3], ['rock', 0, 2], ['sit', 0, 2], ['potX', -40, 20], ['potY', -40, 3], ['spin', 0, 3], ['prot', 0, 3], ['potOn', 0, 2]]);
  const T_THRUST = 2 / 12, T_SIT = INCOMING + 0.38, T_LAND = INCOMING + 0.66, T_POT = INCOMING + 0.3;
  const SPIN = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 2];     // 锅落地后转三圈：每个朝向停几帧（越转越慢）
  const SPIN_AT = []; { let f = 0; for (const n of SPIN) { SPIN_AT.push(f); f += n; } SPIN_AT.push(f); }
  const CLANK = [0, 4, 8].map((i) => T_POT + SPIN_AT[i] / 12);   // 每转一圈锅沿磕地一下：「铛铛铛」
  const WAG = [0, 1, 0, -1], SWAY = [0, 1, 0, -1], WALK_FORK = [0.2, 0, -0.1, 0.1];

  function potFlight(d) {                                  // 锅盔被打飞：往后上方翻一圈，扣在身后地上（世界坐标，本地 = 世界 − bx）
    const q = clamp01(d / 0.3);
    return [RD(-26 * q), RD(-21 + 19 * q - 14 * 4 * q * (1 - q)), Math.floor(q * 4 + 1e-6) & 3];
  }
  function spinAt(d) {                                     // 落地后的转圈朝向 + 每圈开头跳一下
    const f = Math.floor((d - 0.3) * 12 + 1e-6); if (f < 0) return [0, 0];
    for (let i = 0; i < SPIN.length; i++) if (f < SPIN_AT[i + 1]) return [i & 3, (i & 3) === 0 && f === SPIN_AT[i] && i > 0 ? 1 : 0];
    return [0, 0];
  }

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.bob = 0;
    P.look = 0; P.throat = 0; P.trem = 0; P.shout = 0; P.pot = 0; P.fk = 0; P.rock = 0; P.sit = 0; P.potOn = 0; P.potX = 0; P.potY = 0; P.spin = 0; P.prot = 0; P.flip = 0; P.mx = 0;
    let fh = 4.5;                                          // 前手搭在草叉柄上离握点几格（0 = 前手自由）
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = WAG[(b + 1) & 3]; P.sway = SWAY[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];                           // 待机个性：腿抖一下 → 锅盔滑下来盖住眼睛 → 伸手推回去 → 左右张望 → 咽口水
      if (lp >= 0.5 && lp < 0.67) P.trem = lp < 0.58 ? 1 : -1;
      if (lp >= 1.3 && lp < 1.7) P.pot = 1;
      if (lp >= 1.55 && lp < 1.95) { fh = 0; P.hx = 6; P.hy = lp < 1.7 ? -17 : lp < 1.85 ? -19 : -15; P.head = lp >= 1.7 && lp < 1.85 ? -1 : 0; }
      if (lp >= 1.95 && lp < 2.25) { P.look = lp < 2.1 ? -1 : 1; P.head = lp < 2.1 ? -1 : 0; }
      if (lp >= 2.25) P.throat = 1;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                // 慌张小跑：小碎步、身子每帧颠一下、锅盔一颠一颠、草叉乱点
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.bob = f12 & 1; P.pot = P.bob ? -1 : 0; P.beard = P.bob ? 1 : -1; P.ba += WALK_FORK[f] + (P.bob ? 0.1 : 0); P.bhx += P.step;
      const w = walkDemo(tq, 16, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                            // 刺：往后一缩、闭一下眼 → 前冲 2 格往前捅 → 捅过头差点栽倒 → 晃一晃站稳
      fh = 6;
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.bx = -1; P.eyes = tq >= 0.08 ? 1 : 0; P.beard = 1; }
      else if (tq < 0.2) { setK(K_THRUST, K_THRUST, 0); P.bx = 2; P.beard = -2; P.sway = -1; P.step = 1; P.walk = 1; }
      else if (tq < 0.34) { setK(K_OVER, K_OVER, 0); P.bx = 3; P.beard = -1; P.sway = -1; P.step = 1; P.walk = 1; P.shout = 1; }
      else if (tq < 0.45) { setK(K_OVER, K_THRUST, 0.5); P.lean = 1; P.bx = 2; P.beard = 1; P.sway = 1; P.pot = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_THRUST, K_IDLE, q); P.bx = RD(2 * (1 - q)); P.pot = q < 0.5 ? 1 : 0; if (q > 0.5) fh = 4.5; }
    } else if (st === CHARGE) {                            // 插叉 → 蹲下抱石头 → 一点点举过头顶 → 举满发抖、锅盔滑下来
      fh = 0; P.fk = tq >= 0.08 ? 1 : 0; P.rock = 1;
      if (tq < 0.17) { if (P.fk) setK(K_PLANT, K_PLANT, 0); else { setK(K_IDLE, K_PLANT, 0.3); fh = 4.5; } P.rock = P.fk ? 1 : 0; }
      else if (tq < 0.4) setK(K_PLANT, K_GRAB, ease.inOut((tq - 0.17) / 0.23));
      else if (tq < 0.55) { setK(K_GRAB, K_CHEST, ease.in((tq - 0.4) / 0.15)); P.rock = 2; P.eyes = 1; }
      else if (tq < 0.75) { setK(K_CHEST, K_LIFTED, ease.out((tq - 0.55) / 0.2)); P.rock = 2; P.eyes = 1; P.shout = 1; }
      else { setK(K_LIFTED, K_LIFTED, 0); P.rock = 2; P.bx = tq >= 0.8 ? (f12 & 1) : 0; P.pot = tq >= 0.95 ? 1 : 0; P.trem = tq >= 0.8 ? ((f12 & 1) ? 1 : -1) : 0; }
    } else if (st === CAST) {                              // 「嘿！」往前一扑，把石头抛出去
      fh = 0; P.fk = 1; P.pot = 1; P.eyes = 1;
      if (tq < 0.12) { setK(K_LIFTED, K_THROW, ease.out(tq / 0.12)); P.bx = 2; P.shout = 1; P.beard = -2; P.sway = -1; }
      else { setK(K_THROW, K_STUMBLE, ease.inOut(clamp01((tq - 0.12) / 0.38))); P.bx = tq < 0.3 ? 2 : 3; P.shout = tq < 0.3 ? 1 : 0; P.beard = -1; P.step = 1; P.walk = 1; }
    } else if (st === RECOVER) {                           // 保持前扑晃两下、差点摔倒 → 站直、推回锅盔 → 回身拔起草叉
      fh = 0; P.fk = 1; P.pot = 1;
      if (tq < 0.25) { const w = Math.floor(tq * 12 + 1e-6); setK(K_STUMBLE, K_STUMBLE, 0); P.bx = [3, 2, 3, 2][w & 3]; P.lean = [2, 1, 2, 1][w & 3]; P.hy += (w & 1) ? -4 : 0; P.bhy += (w & 1) ? 0 : -4; P.beard = (w & 1) ? 1 : -1; P.step = 1; P.walk = 1; }
      else if (tq < 0.42) { setK(K_STUMBLE, K_PUSH, ease.out((tq - 0.25) / 0.17)); P.bx = 1; P.pot = tq >= 0.34 ? 0 : 1; }
      else if (tq < 0.55) { setK(K_PUSH, K_REACH, ease.inOut((tq - 0.42) / 0.13)); P.pot = 0; }
      else { P.fk = 0; P.pot = 0; fh = 4.5; setK(K_REACH, K_IDLE, ease.inOut(clamp01((tq - 0.55) / 0.15))); }
    } else if (st === HURT) {                              // 锅盔挨了一下「铛」：锅往上一跳、闭眼、后退 2 格
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.pot = h < 1 / 6 ? -1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.pot = 1; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.pot = 1; }
    } else if (st === DEATH) {                             // 后退两步 → 一屁股坐倒 → 往后一仰躺下；锅盔飞出去转三圈；草叉倒在身旁
      const d = tq - INCOMING;
      if (d < 0) idle();
      else {
        P.eyes = 1;
        if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.flash = d < 1 / 12 ? 1 : 0; P.bx = d < 0.15 ? -2 : -4; P.walk = 1; P.step = d < 0.15 ? -1 : 1; P.beard = 2; P.sway = 1; P.ba = -0.3 - d * 2; }
        else if (d < 0.5) { fh = 0; setK(K_SIT, K_SIT, 0); P.bx = -4; P.sit = d < 0.38 ? 1 : 2; P.eyes = d < 0.38 ? 1 : 0; P.look = -1; P.sway = 1; }
        else { fh = 0; setK(K_LIE, K_LIE, 0); P.bx = -4; P.lying = 1; P.lift = d < 0.58 ? 2 : d < 0.66 ? 1 : 0; }
        P.fk = d < 0.3 ? 0 : d < 0.45 ? 2 : 3;
        if (d < 0.3) { const f = potFlight(d); P.potOn = 1; P.potX = f[0] - P.bx; P.potY = f[1]; P.prot = f[2]; }
        else { const s = spinAt(d); P.potOn = 2; P.potX = -26 - P.bx; P.potY = -2 - s[1]; P.spin = s[0]; }
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ba = RD(P.ba / ASTEP) * ASTEP;
    if (fh > 0 && !P.fk) { const c = parts.onShaft(P, FORK, fh); P.hx = c[0]; P.hy = c[1]; } else { P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; }
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    // 焦点：握着草叉时 = 叉尖；抱石头时 = 石头中心
    if (P.rock === 2) { P.gx = RD((P.hx + P.bhx) / 2) + P.bx; P.gy = Math.min(P.hy, P.bhy) - 2; }
    else if (!P.fk && !P.lying && !P.sit) { const t2 = parts.onShaft(P, FORK, FORK.len + 5); P.gx = t2[0] + P.bx; P.gy = t2[1]; }
    else { P.gx = P.bx; P.gy = -12; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 本角色的部件（部件库里没有的）─────
  // 候选部件：pot 铁锅盔——倒扣在头上的铁锅：平底朝上（锅底烟黑，隔点）、比头宽 2 格、锅沿外翻一圈（比头宽 4 格）、锅柄向后横伸 4 格。
  //   o = { mat, slide（-1 被打得往上一跳 · 0 · 1 滑下来盖住眼睛）, wag（锅柄尖上下晃 -2..2）, join（戴着时并进脸的部件：锅沿紧贴眼睛那一行，
  //   分开画会把整行脸压成勾线色）, at + rot（掉在地上 / 飞在空中，精灵本地坐标；rot 整 90° 翻滚）, spin（地上转圈：0 柄朝后 · 1 柄朝镜头 · 2 柄朝前 · 3 柄在背面）}
  //   头饰本地坐标：u = 0 是头中线，v = 0 是头顶上一行（和 parts.helm 一样）。
  function potHelm(R, o) {
    const T = o.at ? { r0: (o.rot || 0) & 3, tx: RD(o.at[0]), ty: RD(o.at[1]), rot: 0, ox: 0, oy: 0 } : { r0: 0, tx: R.hx, ty: R.htop - 1 + (o.slide || 0), rot: R.rot, ox: R.ox, oy: R.oy };
    const m = o.mat, sp = o.at ? (o.spin || 0) : 0, w = Math.max(-1, Math.min(1, RD((o.wag || 0) * 0.6))), X = (u, v, t) => px(E, T, u, v, m, t);
    if (!(o.join && !o.at)) E.part();
    for (let u = -2; u <= 3; u++) X(u, -2, (u & 1) ? 2 : 1);                   // 锅底：烟黑（墨 / 暗隔点）
    for (let u = -3; u <= 4; u++) X(u, -1, (u & 1) ? 1 : 2);
    for (let u = -3; u <= 4; u++) X(u, 0, (u & 1) ? 0 : 2);                   // 烟黑往下淡开
    for (let u = -3; u <= 4; u++) X(u, 1, u === -3 ? 4 : 0);
    for (let u = -4; u <= 5; u++) X(u, 2, u <= -3 ? 4 : u >= 4 ? 2 : 3);     // 外翻的锅沿：左上受光
    X(-2, 1, 4);                                                              // 锅肚一点反光
    if (sp === 0) { X(-5, 1, 3); X(-6, 1, 3); X(-7, 1 + w, 3); X(-8, 1 + w, 4); }        // 锅柄朝后，柄尖会晃
    else if (sp === 2) { X(6, 1, 3); X(7, 1, 3); X(8, 1, 3); X(9, 1, 4); }              // 转到朝前
    else if (sp === 1) { X(0, 1, 1); X(1, 1, 2); X(1, 0, 4); }                          // 柄朝镜头：只看见锅肚上一截柄头
  }
  // 候选部件：forkTines 草叉齿——在 HEADS.trident 上加长三根齿，前面那根往外弯（叉头本地坐标 u / v 同 parts 的 stamp，跟着叉头按 90° 转）
  const TINES = [[-2, -4, 0], [-2, -5, 4], [0, -5, 0], [0, -6, 4], [3, -4, 0], [4, -5, 4]];
  function forkTines(T, s, q, m) {
    for (const [u, v, t] of TINES) { let dx, dy; if (q === 0) { dx = u; dy = v; } else if (q === 1) { dx = -v; dy = u; } else if (q === 2) { dx = -u; dy = -v; } else { dx = v; dy = -u; } px(E, T, s[0] + dx, s[1] + dy, m, t); }
  }
  function drawFork(R, o) { const F = Object.assign({}, FORK, o), f = parts.halberd(E, R, P, F); forkTines(F.free ? parts.FREE : R, f.socket, f.q, M.iron); return f; }   // 柄 → 叉头（加长齿并进叉头的部件）
  // 候选部件：boulder 5×4 大卵石（抱在手里 / 放在地上；一个部件，一道裂纹 + 左上高光）
  const ROCK = ['.xxx.', 'xxxxx', 'xxxxx', '.xxx.'];
  function boulder(T, cx, cy, m) { E.part(); for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) if (ROCK[r][c] === 'x') px(E, T, cx - 2 + c, cy - 2 + r, m, 0); px(E, T, cx - 1, cy - 2, m, 4); px(E, T, cx + 1, cy - 1, m, 2); px(E, T, cx, cy, m, 2); }
  // 候选部件：legs 'rolled' 卷裤腿——裤子（到胯下 3 格）→ 卷起的裤脚（一行亮色）→ 赤脚踝两行 → 草鞋（鞋底 + 绑带 + 露出的脚趾）。
  //   和 parts.legs 同一套步态（rig 的 footFx / footBx / legFx / legBx），远侧腿整条暗一级；trem 让膝盖抖 1 格
  function rolledLegs(R, o) {
    const w = R.lw, c0 = Math.ceil((w - 1) / 2), kn = R.cr * 0.9 + (o.trem || 0);
    const col = (hx, fx, up, kk, m, sk, sa, toe) => {
      const yb = -up, h0 = R.yHip + 1, n = Math.max(1, yb - h0); let c = fx;
      for (let y = h0; y <= yb; y++) { const t = (y - h0) / n, k = yb - y; c = RD(hx + (fx - hx) * t + kk * Math.sin(t * Math.PI)); const a = c - c0; parts.run(E, R, y, a, a + w - 1, k === 0 ? sa : k <= 2 ? sk : m, k === 3 ? 4 : 0); }
      const a = c - c0; for (let i = 0; i < toe; i++) px(E, R, a + w + i, yb, i === toe - 1 ? sk : sa, i === toe - 1 ? 4 : 0);   // 草鞋头 + 露出的脚趾
      px(E, R, a + 1, yb - 1, sa, 2);                                          // 绑带
    };
    E.part(); col(R.legBx, R.footBx, R.footBup, kn + (R.footBup ? 0.8 : 0), o.matD, o.skinD, o.sandalD, 1);
    E.part(); col(R.legFx, R.footFx, R.footFup, kn + (R.footFup ? 0.8 : 0), o.mat, o.skin, o.sandal, 2);
  }
  // 候选部件：legs 坐姿——一屁股坐在地上、两腿朝前伸、脚尖朝上（精灵本地坐标，不跟 rig 下沉）
  function sitLegs(o) {
    const T = parts.FREE;
    [[-1, -1, o.matD, o.skinD, o.sandalD], [0, 0, o.mat, o.skin, o.sandal]].forEach(([dy, dx, m, sk, sa]) => {
      E.part();
      for (let x = -1 + dx; x <= 6 + dx; x++) for (let y = -2 + dy; y <= dy; y++) px(E, T, x, y, x <= 2 + dx ? m : sk, x === 3 + dx ? 4 : 0);
      for (let y = -3 + dy; y <= dy; y++) px(E, T, 7 + dx, y, sa, 0); px(E, T, 7 + dx, -4 + dy, sk, 4); px(E, T, 6 + dx, -2 + dy, sa, 2);
    });
  }
  // 候选部件：spoon 腰间挂的木勺（柄挂在腰绳上、勺头朝下，伸出背后 1 格）
  function spoon(R, x, y, m) { E.part(); for (let k = 0; k < 3; k++) px(E, R, x, y + k, m, 3); px(E, R, x - 1, y + 3, m, 0); px(E, R, x, y + 3, m, 0); px(E, R, x - 1, y + 4, m, 0); px(E, R, x, y + 4, m, 2); }

  // ───── 画（部件从后往前）─────
  const LEGM = { mat: M.shirt, matD: M.shirtD, skin: M.skin, skinD: M.skinD, sandal: M.rope, sandalD: M.ropeD };
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    if (P.sit) R.oy += SIT[P.sit];                                                  // 坐倒：上半身整体下沉（腿另画）
    if (P.fk === 1) drawFork(R, { free: 1, at: [PLANT_X - P.bx, -6], a: 0, back: 10 });                // 插在身后地上
    else if (P.fk === 2) drawFork(R, { free: 1, at: [FORK_FLAT_X - 4 - P.bx, -5], a: 0.9 });           // 倒下去
    else if (P.fk === 3) drawFork(R, { free: 1, at: [FORK_FLAT_X - P.bx, -2], a: HALF });              // 躺在身旁
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.shirtD, hand: M.skinD, grip: P.fk ? 'fist' : 'none' });
    if (P.sit) sitLegs(LEGM); else rolledLegs(R, Object.assign({ trem: P.trem }, LEGM));
    parts.torso(E, R, P, { style: 'tunic', mat: M.tunic, belt: M.rope });
    const e = parts.edges(R, R.yWaist);
    spoon(R, e[0] - 1, R.yWaist + 1, M.wood);
    parts.pendant(E, R, P, { style: 'pouch', mat: M.pouch, trim: M.rope, x: e[0] + 2, y: R.yWaist + 1 });
    parts.apron(E, Object.assign({}, R, { yS: R.yWaist - 2 }), P, { mat: M.apron, strap: M.rope, hem: -4 });   // 腰围裙：从腰带往下兜住圆肚子（上半身露出土褐短衣），麻绳挂脖
    parts.head(E, R, P, { mat: M.skin, face: 'round', age: 'young', nose: 'big', mouth: P.shout ? 'wide' : 'line', blush: M.blush, ear: 'dot' });
    const ex = R.hx1 - 1, ey = R.ey;                                                 // 瞪圆的眼（眼白 + 眼珠，看前 / 回头看）、第二格红脸蛋、喉头
    if (!P.eyes) { if (P.look < 0) { px(E, R, ex, ey, M.eyeW, 3); px(E, R, ex - 1, ey, M.ink, 1); } else { px(E, R, ex - 1, ey, M.eyeW, 3); px(E, R, ex, ey, M.ink, 1); } }
    px(E, R, ex - 2, ey + 2, M.blush, 3);
    for (let y = R.htop; y <= ey + 1; y++) px(E, R, R.hx0, y, M.hair, 0);            // 头发（并进脸的部件）：后脑一列 + 锅沿下翘出来的一撮；锅掉了才露出乱糟糟的头顶
    px(E, R, R.hx0 - 1, ey, M.hair, 4); parts.run(E, R, R.htop, R.hx0, R.hx1 - 2, M.hair, 0); for (let x = R.hx0 + 1; x <= R.hx1 - 2; x += 2) px(E, R, x, R.htop - 1, M.hair, 4);
    if (P.shout) px(E, R, R.hx1, R.hy - 1, M.skin, 1);
    if (P.throat) px(E, R, R.hx1, R.hy + 1, M.skin, 4);
    if (!P.potOn) potHelm(R, { mat: M.iron, slide: P.pot, wag: P.beard, join: 1 });
    if (!P.fk) { drawFork(R, {}); parts.hand(E, R, P, { side: 'B', hand: M.skin }); }
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.shirt, hand: M.skin, grip: P.rock ? 'none' : 'fist' });
    if (P.rock) {                                                                    // 石头压在前袖前面（抱在胸前时不被袖子盖住），前手再压在石头上：两手抱住 / 托住
      if (P.rock === 1) boulder(parts.FREE, ROCK_X - P.bx, -2, M.rock); else boulder(R, RD((P.hx + P.bhx) / 2), Math.min(P.hy, P.bhy) - 2, M.rock);
      parts.hand(E, R, P, { hand: M.skin });
    }
    if (P.potOn) potHelm(R, { mat: M.iron, at: [P.potX, P.potY], rot: P.prot, spin: P.spin });
  }
  function bakeHero() { RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  let thT = 9, thX = 0, thY = 0, rkT = 9, rkX = 0, rkY = 0, rkVX = 0, rkVY = 0, soulAcc = 0, dustAcc = 0, lastStep = 0;
  const RK_DUR = 0.33, RK_G = 560, CH = 5, chX = new Float32Array(CH), chY = new Float32Array(CH), chVX = new Float32Array(CH), chVY = new Float32Array(CH);
  const CH_W = [2, 2, 1, 2, 1], CH_H = [2, 1, 2, 2, 1]; let chT = 9;
  function rockImpact(x, y) {                              // 石头砸在假人头上：碎成 5 块落地弹跳 + 一大团尘云 + 12 颗撞击火花
    chT = 0; for (let i = 0; i < CH; i++) { chX[i] = x + (i - 2) * 1.5; chY[i] = y; chVX[i] = -30 + i * 20 + Math.random() * 10; chVY[i] = -70 - Math.random() * 50; }
    fx.cloud(x, y + 2, 9, R_CLOUD, 1.0, 2); fx.cloud(x - 3, y + 5, 6, R_CLOUD, 0.8, 1); burst(x, y + 2, 14, 20, 60, 0.4, 0.8, R_CLOUD, 4); burst(x, y, 12, 50, 110, 0.2, 0.45, R_IMP, 12); fx.cross(x, y, 5, R_IMP, 0.2);
    hitDummy(1); dummyFx({ dur: 1.3, sink: 1, stun: 1 }); shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.4 });
  }
  function onEnter(s) {
    if (s !== CAST) return;
    const cx = RD((K_LIFTED.hx + K_LIFTED.bhx) / 2) + 2, cy = K_LIFTED.hy - 2;   // 出手时石头的位置（举过头顶、身子前扑 2 格）
    rkT = 0; rkX = wx(cx); rkY = wy(cy); rkVX = (DUMMY_X - 1 - rkX) / RK_DUR; rkVY = (HY - 27 - rkY - 0.5 * RK_G * RK_DUR * RK_DUR) / RK_DUR;
    for (let i = 0; i < 10; i++) spawn(K_DUST, wx(-2 + Math.random() * 8), HY - 1, (Math.random() - 0.5) * 36, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust);
    shake(0.28, 2); flash(0.03); sfx('shoot', { proj: 'stone' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_THRUST) {                 // 捅：叉尖戳进假人
      const tip = parts.onShaft(P, FORK, FORK.len + 5); thT = 0; thX = wx(tip[0] + P.bx); thY = wy(tip[1]);
      hitDummy(0); burst(thX, thY, 8, 30, 80, 0.15, 0.3, R_IMP, 8); fx.cross(thX, thY, 3, R_IMP, 0.17);
      for (let i = 0; i < 2; i++) spawn(K_DUST, wx(4), HY, -14 - Math.random() * 12, -4 - Math.random() * 4, 0.3, FXI.dust);
      sfx('swing', { kind: 'thrust', w: 0.3 }); sfx('hit', { mat: 'wood', w: 0.3 });
    }
    if (s === CHARGE && t === 0.08) { for (let i = 0; i < 4; i++) spawn(K_DUST, wx(PLANT_X), HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.35, FXI.dust); }   // 草叉插进地里
    if (s === CHARGE && (t === 0.85 || t === 1.0 || t === 1.15)) spawnX(K_PHYS, wx(4 + (t === 1.0 ? 1 : 0)), wy(-17), 6 + Math.random() * 6, -10, 0.55, R_SWEAT, { g: 90 });   // 额头冒汗
    if (s === RECOVER && t === 0.55) { for (let i = 0; i < 4; i++) spawn(K_DUST, wx(PLANT_X), HY, (Math.random() - 0.5) * 20, -6 - Math.random() * 6, 0.35, FXI.dust); }  // 拔草叉
    if (s === DEATH && t === T_SIT) { for (let i = 0; i < 10; i++) spawn(K_DUST, wx(-2 + Math.random() * 8), HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); sfx('fall', { w: 0.4 }); }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 16; i++) { const x = wx(-18 + Math.random() * 22); spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); } shake(0.1, 1); sfx('fall', { w: 0.3 }); }
    if (s === DEATH && CLANK.some((c) => Math.abs(c - t) < 1e-9)) {        // 锅沿磕地：「铛」
      const x = wx(-26), k = CLANK.findIndex((c) => Math.abs(c - t) < 1e-9); burst(x + (k === 1 ? 5 : -4), HY - 1, 5 - k, 20, 50, 0.1, 0.25, R_IMP, 14); if (k === 0) for (let i = 0; i < 5; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 10, HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.35, FXI.dust);
      sfx('hit', { mat: 'metal', w: 0.25 - k * 0.05 });
    }
  }
  const EVENTS = [[], [], [T_THRUST], [0.08, 0.85, 1.0, 1.15], [], [0.55], [], [T_POT].concat(CLANK.slice(1), [T_SIT, T_LAND]).sort((a, b) => a - b), []];
  function hurtFx(s) {                                     // 敌弹打在锅盔上：像敲锅的「铛」——撞击火花里夹着白亮的铁星
    const hx = HX + 3, hy = HY - 20; burst(hx, hy, s === DEATH ? 22 : 14, 50, 130, 0.25, 0.55, R_IMP, 20);
    for (let i = 0; i < 3; i++) spawn(K_BURST, hx, hy, 20 + Math.random() * 40, -40 - Math.random() * 40, 0.6 + Math.random() * 0.2, FXI.steel);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); sfx('hit', { mat: 'metal', w: 0.35 }); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.3 }); spawn(K_DUST, wx(P.step > 0 ? 3 : -3) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.3, FXI.dust); } lastStep = P.step; }
    if (state === CHARGE && stT > 0.75) { dustAcc += dt * 10; while (dustAcc >= 1) { dustAcc -= 1; const s = Math.random() < 0.5 ? -1 : 1; spawn(K_DUST, wx(s * (3 + Math.random() * 3)), HY, s * (8 + Math.random() * 8), -1 - Math.random() * 3, 0.7 + Math.random() * 0.4, FXI.dust); } }   // 脚下的尘土慢慢往外飘
    if (rkT < RK_DUR) { rkT += dt; if (rkT >= RK_DUR) { rkT = 9; rockImpact(DUMMY_X - 1, HY - 27); } }
    if (chT < 1.2) { chT += dt; for (let i = 0; i < CH; i++) { chVY[i] += 420 * dt; chX[i] += chVX[i] * dt; chY[i] += chVY[i] * dt; const fl = HY + 1 - CH_H[i]; if (chY[i] > fl) { chY[i] = fl; if (Math.abs(chVY[i]) < 40) { chVY[i] = 0; chVX[i] = 0; } else { chVY[i] *= -0.35; chVX[i] *= 0.6; } } } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 24, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    thT += dt;
  }
  function fxReset() { thT = 9; rkT = 9; chT = 9; soulAcc = 0; dustAcc = 0; lastStep = 0; }
  function fxBack(f12) { shotFloorGlow(f12); if (rkT < RK_DUR) groundShadow(RD(rkX), 2, HY - rkY); }
  const RK_C = [8, 10, 18, 17];                             // 石头：勾线 / 暗 / 基 / 亮（和 M.rock 同色）
  function drawRock(x, y, turn) {                          // 飞行中的石头（每 2 帧翻 90°）：5×4 ↔ 4×5，带勾线
    const w = turn ? 4 : 5, h = turn ? 5 : 4, x0 = x - (w >> 1), y0 = y - (h >> 1), inside = (i, j) => i >= 0 && j >= 0 && i < w && j < h && !((i === 0 || i === w - 1) && (j === 0 || j === h - 1));
    for (let j = -1; j <= h; j++) for (let i = -1; i <= w; i++) { if (inside(i, j)) put(x0 + i, y0 + j, i <= 1 && j <= 1 ? RK_C[3] : i >= w - 2 || j >= h - 1 ? RK_C[1] : RK_C[2]); else if (inside(i - 1, j) || inside(i + 1, j) || inside(i, j - 1) || inside(i, j + 1)) put(x0 + i, y0 + j, RK_C[0]); }
  }
  function fxFront(f12) {
    if (thT < 2 / 12) {                                    // 捅的拖影：叉头后面三道横线（尘土色，第 2 帧变暗断开）
      const c = thT < 1 / 12 ? EL[0] : EL[1];
      for (let k = 0; k < 9; k++) { if (thT >= 1 / 12 && (k & 1)) continue; put(thX - 8 - k, thY, c); if (k < 6) { put(thX - 8 - k, thY - 2, EL[1]); put(thX - 8 - k, thY + 2, EL[1]); } }
    }
    if (rkT < RK_DUR) { const x = RD(rkX + rkVX * rkT), y = RD(rkY + rkVY * rkT + 0.5 * RK_G * rkT * rkT); drawRock(x, y, (f12 >> 1) & 1); put(x - 4, y + 1, EL[2]); put(x - 6, y + 2, EL[3]); }
    if (chT < 1.2) for (let i = 0; i < CH; i++) {          // 碎石块（落地弹跳，最后闪烁消失）
      if (chT > 0.95 && (f12 & 1)) continue; const x = RD(chX[i]), y = RD(chY[i]);
      for (let j = 0; j < CH_H[i]; j++) for (let k = 0; k < CH_W[i]; k++) put(x + k, y + j, j === 0 && k === 0 ? RK_C[3] : j === CH_H[i] - 1 && CH_H[i] > 1 ? RK_C[1] : RK_C[2]);
    }
  }

  return {
    name: '民兵', HX, R_EL, DUR, hero, P, GLOW_MATS: [], HIT_POINT: [1, -20], EVENTS,
    // 音效：粗布身体、倒下；技能是扔石头（土、陨石式抛掷），重量 0.4
    SFX: { body: 'flesh', how: 'topple', pal: 'earth', style: 'meteor', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
