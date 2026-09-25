// 维京战士（部队 · 人类 · 先锋 · 普通）：标准偏宽的步兵，小角铁盔、姜红编辫胡、前手大圆木盾（红白四分漆 + 石肤符文盾心）、后手胡子斧；
// 攻击 = 盾击（前冲把盾撞出去）；技能 = 特性「石肤术」生效：缩到盾后、全身化成灰蓝石像、石护罩扣下、来袭敌弹撞碎在石壳上。
// 升级成「奴隶主」（SlaveLord.js）：同一个人——同样的角盔、编辫胡、蓝衣、圆盾、斧，体量和装备都升一级。
PCD.define('VikingWarrior', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, hash, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT,
    spawn, burst, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：石肤（灰蓝花岗岩）。只用共享色板里已有的颜色 ─────
  const R_EL = fxRamp('granite', [21, 31, 60, 59, 28]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质（parts.mats：名字D = 暗一级，远侧腿 / 后臂用）─────
  const M = parts.mats(E, {
    tunic: { r: 'blue', band: 2 }, trim: 'gold', belt: 'leather', buckle: 'gold', pants: 'stone', boot: 'leather',
    skin: 'skin', hair: [20, 44, 45, 46], ring: 'steel', ink: { r: 'ink', flat: 1 },
    iron: 'iron', horn: 'bone', steel: 'steel', wood: 'wood',
    paint: 'crimson', paint2: 'bone', rune: { r: [28, 59, 31, 21], flat: 1 },
    rock: 'pale', cloth: [0, 8, 59, 60],                       // 石化后的皮肤 / 布
  });
  const BODY = { body: 'standard', sw: 5, limb: 1.15, head: 7 };
  const AXE = { hand: 'B', head: 'axe', metal: M.steel, edge: M.steel, wood: M.wood, trim: M.iron, len: 9, back: 3, mirror: 1 };
  const SHIELD_R = 5;
  const HX = 77, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(72, 60, 30, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'rune', 'ink', 'skin', 'rock', 'steel']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 盾（盾心 = 手 +1 格），后手 = 斧 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, stone: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, ba, lean, head, crouch) => ({ hx, hy, bhx, bhy, ba, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -8, 1, -12, -0.9);                       // 盾护胸前，斧扛在肩上（斧头在脑后）
  const K_WIND = K(3, -10, 0, -13, -1.05, -1, 0, 1);            // 盾收回、身体后缩
  const K_BASH = K(10, -10, 2, -12, -0.8, 1, 1);                // 盾撞出去
  const K_HOLD = K(9, -9, 2, -12, -0.8, 1);
  const K_BRACE = K(7, -9, 2, -13, -0.7, 1, 0, 2);               // 缩到盾后
  const K_PLANT = K(8, -8, 3, -14, -0.6, 1, 1, 3);               // 盾砸进地里
  const K_HURT = K(4, -9, 0, -12, -1.2, -1, -1);
  const K_KNEEL = K(8, -8, 3, -9, 0.9, 1, 1, 4);
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['stone', 0, 2], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_BASH = 2 / 12, T_KNEE = INCOMING + 0.34, T_CRUMBLE = INCOMING + 1.3;
  const TAP = [[3, -1, -0.2], [3, 1, 1.1], [3, -1, 0.1], [3, 1, 1.1], [2, 0, -0.5]];     // 待机个性：斧从肩上抡下来，斧背敲两下盾沿（后手 dx、dy、斧角）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;                                                         // drawHero 按状态分支（死亡时斧从肩上滑落）用 P.st，已编进缓存键
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.stone = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6), k = TAP[f]; P.bhx += k[0]; P.bhy += k[1]; P.ba = k[2]; P.glint = k[2] > 0.5 ? 1 : 0; P.beard = k[2] > 0.5 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 行军：盾稳在胸前，斧随步子点头；落脚 2 颗尘
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq));
      P.hx += P.step * 0.6; P.bhx -= P.step * 0.6; P.ba += P.step * 0.1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; }
      else if (tq < 0.2) { setK(K_BASH, K_BASH, 0); P.bx = 5; P.beard = -2; P.sway = -1; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_BASH, K_HOLD, q); P.bx = RD(5 - q); P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(4 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 缩到盾后，符文亮，皮肤先化石、再到全身
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_BRACE, q);
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.stone = tq < 0.5 ? 0 : tq < 0.95 ? 1 : 2;
    } else if (st === CAST) { setK(K_BRACE, K_PLANT, ease.out(clamp01(tq / 0.12))); P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; P.stone = 2; P.glint = tq < 0.1 ? 1 : 0; }
    else if (st === RECOVER) {                                         // 石壳一片片剥落
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_PLANT, K_IDLE, q); P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.stone = tq < 0.2 ? 2 : tq < 0.45 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.stone = h >= 1 / 12 && h < 3 / 12 ? 1 : 0; }   // 石肤一闪：挨打的地方变成石头
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 跪在盾后 → 化成石像 → 碎成一堆石块
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.eyes = 1; P.beard = d < 0.5 ? 2 : 1;
        const aq = clamp01((d - 0.3) / 0.3); P.hatX = RD(3 * aq); P.hatY = RD(Math.sin(aq * Math.PI) * 5);    // 斧从肩上滑落到身后
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : 4; P.stone = d < 0.75 ? 0 : d < 0.95 ? 1 : 2;
        if (d >= 1.3) P.dq = 1;                                        // 之后由死亡套件（碎块）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ba = RD(P.ba / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    P.gx = P.hx + 1 + P.bx; P.gy = P.hy;                               // 发光体 = 盾心符文
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  const CRACK = [[0, 0], [1, 1], [1, 2], [0, 3], [2, 3], [3, 4]];
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), S = P.stone, dead = P.st === DEATH && P.crouch >= 4;
    const sk = S ? M.rock : M.skin, hair = S >= 2 ? M.rock : M.hair, tun = S >= 2 ? M.cloth : M.tunic, tunD = S >= 2 ? M.clothD : M.tunicD;
    const pants = S >= 2 ? M.cloth : M.pants, pantsD = S >= 2 ? M.clothD : M.pantsD, boot = S >= 2 ? M.rock : M.boot, bootD = S >= 2 ? M.rockD : M.bootD;
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: tunD, cuff: M.belt, cuffStyle: 'bracer', grip: 'none' });
    parts.legs(E, R, P, { style: 'boot', mat: pants, matD: pantsD, boot, bootD, bootH: 3 });
    const tor = parts.torso(E, R, P, { style: 'tunic', mat: tun, trim: S >= 2 ? M.cloth : M.trim, belt: M.belt, buckle: M.buckle });
    if (S >= 2) { const c = tor.chest; for (const [dx, dy] of CRACK) parts.px(E, R, c[0] - 2 + dx, c[1] - 1 + dy, tun, 1); }   // 石像裂纹（和躯干同一部件）
    parts.head(E, R, P, { mat: sk, face: 'square', eye: M.ink, nose: 'big', mouth: 'none' });
    parts.helm(E, R, P, { style: 'horned', mat: M.iron, trim: M.iron, horn: M.horn });
    if (dead) parts.axe(E, R, P, Object.assign({}, AXE, { free: 1, mirror: 0, at: [-5 - P.hatX, -1 - P.hatY], a: -HALF - (P.hatY ? 0.6 : 0) }));   // 斧从肩上滑落到身后
    else { parts.axe(E, R, P, AXE); parts.hand(E, R, P, { side: 'B', hand: sk }); }   // 斧扛在远侧肩上：斧柄斜过上背，后手握在胸前
    parts.arm(E, R, P, { sleeve: 'loose', mat: tun, cuff: M.belt, cuffStyle: 'bracer', hand: sk });
    parts.braids(E, R, P, { mat: hair, ring: M.ring, n: 2, len: 5 });                              // 胡子辫垂在盾臂前面（身份特征，不让手臂挡住）
    parts.targe(E, R, P, { r: SHIELD_R, at: [P.hx + 1, P.hy], face: M.paint, face2: M.paint2, rim: M.iron, boss: M.steel, rune: M.rune, pattern: 'quarter' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy), SH_RX = 16, SH_RY = 29, SH_N = 74;   // 盾击残影；石壳（半椭圆，石片 4 格一片）
  let bashT = 9, shellT = 9, crackT = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastTap = -1, flakeAcc = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function puff(n, spd) { for (let i = 0; i < n; i++) spawn(K_BURST, wx(1 + (Math.random() - 0.5) * 10), wy(-6 - Math.random() * 14), (Math.random() - 0.5) * spd, -spd * 0.4 - Math.random() * spd * 0.5, 0.35 + Math.random() * 0.3, R_EL); }
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy), base = wx(P.gx);
    shellT = 0;                                                        // 石壳从两侧地面升起、在头顶合拢
    fx.crack(base, HY + 1, 16, 1, R_EL, 1.0); fx.crack(base - 4, HY + 1, 14, -1, R_EL, 1.0);
    fx.cross(gx, gy, 7, R_EL, 0.35);
    ring(base, HY - 2, 1, R_EL); burst(base, HY - 2, 26, 50, 120, 0.3, 0.7, R_EL, 30); burst(base, HY - 1, 10, 20, 50, 0.3, 0.5, FXI.dust, 12);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'earth', w: 0.7 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BASH) {                                // 盾击：盾沿撞上假人
      bashT = 0; poseAt(ATTACK, 0.12, 0.12); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = hero.k2 = -1; poseAt(ATTACK, t, t);   // 残影 = 后引那一帧
      const cx = wx(P.gx), cy = wy(P.gy);
      fx.slash(cx, cy, SHIELD_R + 2, 0.55, 2.6, R_IMP, 0.17, 2, 2);
      hitDummy(0); burst(cx + SHIELD_R + 1, cy, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(cx + SHIELD_R + 1, cy, 4, R_IMP, 0.2);
      for (let i = 0; i < 3; i++) spawn(K_DUST, wx(6) + Math.random() * 3, HY, -20 - Math.random() * 20, -5 - Math.random() * 5, 0.3, FXI.dust);
      sfx('swing', { kind: 'smash', w: 0.6 }); sfx('hit', { mat: 'wood', w: 0.6 });
    }
    if (s === CHARGE) { puff(t < 0.7 ? 8 : 14, 30); fx.cross(wx(P.gx), wy(P.gy), t < 0.7 ? 3 : 5, R_EL, 0.2); }   // 化石的两下「咔」
    if (s === CAST && Math.abs(t - 0.08) < 1e-9) shoot(3, 140, HY - 12, -300, HX + 16, FXI.enemy);   // 来袭敌弹
    if (s === CAST && Math.abs(t - 0.2) < 1e-9) {                      // 敌弹撞碎在石壳上：只剩几点碎石
      const x = HX + 16, y = HY - 12; crackT = 0; fx.cross(x, y, 5, R_EL, 0.25); burst(x, y, 14, 30, 90, 0.2, 0.45, R_EL, 6); burst(x, y, 6, 20, 50, 0.1, 0.25, FXI.enemy, 0);
      for (let i = 0; i < 5; i++) spawn(K_BURST, x, y, 20 + Math.random() * 30, -10 + Math.random() * 20, 0.5, R_EL);
      sfx('hit', { mat: 'stone', w: 0.5 });
    }
    if (s === RECOVER) { puff(t < 0.3 ? 12 : 8, 20); if (t < 0.3) for (let k = 0; k < SH_N; k += 3) { const a = Math.PI + k / SH_N * Math.PI; spawn(K_DUST, scrX(1) + Math.cos(a) * SH_RX, HY + Math.sin(a) * SH_RY, (Math.random() - 0.5) * 12, 10 + Math.random() * 20, 0.5 + Math.random() * 0.3, R_EL); } }   // 石壳崩落
    if (s === DEATH && Math.abs(t - T_KNEE) < 1e-9) { for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 10 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.6 }); }
    if (s === DEATH && Math.abs(t - T_CRUMBLE) < 1e-9) {               // 石像碎裂（死亡套件 chunks：碎块落地成堆，再消散）
      poseAt(DEATH, T_CRUMBLE - 1 / 12, T_CRUMBLE - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 3, power: 0.4, fromX: 2, fromY: -34, fadeAt: 1.0, fadeDur: 0.5 }); shake(0.15, 1); puff(10, 30);
    }
  }
  const EVENTS = [[], [], [T_BASH], [0.5, 0.95], [0.08, 0.2], [0.2, 0.45], [], [T_KNEE, T_CRUMBLE], []];
  function hurtFx(s) {                                                 // 石肤：火花里夹着碎石
    const hx = HX + 1, hy = HY - 13; burst(hx, hy, s === DEATH ? 20 : 12, 50, 130, 0.25, 0.55, R_IMP, 20); burst(hx, hy, s === DEATH ? 10 : 8, 30, 90, 0.3, 0.6, R_EL, 10);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                            // 地上的碎石被吸到身上
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = 0.3 + Math.random() * (Math.PI - 0.6), r = 14 + Math.random() * 9; spawn(K_SPIRAL_PT, HX + 2, HY - 10, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 3); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.5 }); for (let i = 0; i < 2; i++) spawn(K_DUST, wx(P.step > 0 ? 4 : -3) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); } lastStep = P.step; }
    if (state === IDLE) {                                              // 斧背敲盾：两下火星
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastTap) { if (f === 1 || f === 3) { const c = parts.onShaft(P, AXE, 4.5); burst(wx(c[0]), wy(c[1]), 4, 20, 40, 0.1, 0.25, R_IMP, 10); } lastTap = f; }
    }
    if (state === RECOVER && stT < 0.55) { flakeAcc += dt * 20; while (flakeAcc >= 1) { flakeAcc -= 1; spawn(K_DUST, wx(-4 + Math.random() * 12), wy(-4 - Math.random() * 18), (Math.random() - 0.5) * 10, 4 + Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.5 && stT < INCOMING + 2.3) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 20, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    bashT += dt; shellT += dt; crackT += dt;
  }
  function fxReset() { bashT = 9; shellT = 9; crackT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastTap = -1; flakeAcc = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() { if (bashT < 0.25) blitShape(ghost, HX + P.mx, HY, P.flip, bashT < 1 / 12 ? EL[2] : EL[3], clamp01(bashT / 0.25)); }   // 盾击残影（身后的单色剪影，抖动消散）
  function fxFront(f12) {
    if (shellT < 0.85) {                                               // 石壳：石片从两侧地面升起（0.17 s）→ 合拢 → 敌弹命中处闪白 → 收招时崩落
      const cx = scrX(1), rise = clamp01(shellT / 0.17), gone = clamp01((shellT - 0.55) / 0.3);
      for (let k = 0; k <= SH_N; k++) {
        const u = k / SH_N, seg = k % 5; if (Math.min(u, 1 - u) * 2 > rise || seg === 4 || hash(k, 7) < gone) continue;
        const a = Math.PI + u * Math.PI, ca = Math.cos(a), sa = Math.sin(a), x = RD(cx + ca * SH_RX), y = RD(HY + sa * SH_RY), hit = crackT < 2 / 12 && Math.abs(y - (HY - 12)) < 5 && x > cx;
        put(x, y, shellT < 1 / 12 || hit ? EL[0] : seg === 0 ? EL[1] : EL[2]); put(RD(cx + ca * (SH_RX - 1)), RD(HY + sa * (SH_RY - 1)), hit ? EL[1] : EL[3]);
      }
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) {                        // 符文星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '维京战士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.rune], HIT_POINT: [2, -13], EVENTS,
    deathKit: { mode: 'chunks', at: T_CRUMBLE },
    SFX: { body: 'stone', how: 'shatter', pal: 'earth', style: 'shield', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
