// 奴隶主（部队 · 人类 · 战士 · 优质）：维京战士升级后的同一个人——同样的小角铁盔（加一对大牛角）、姜红编辫胡（更长、金辫环）、蓝衣（成了板甲下的罩袍）、
// 红白四分圆盾（加大、镶金边，背到了背上）、斧（换成双手月牙大斧）；新添毛皮披肩、尖刺肩甲、前臂缠着一截带镣铐的锁链（奴隶主的身份）。
// 攻击 = 双手大斧过顶斜劈；技能 = 特性「无拘之怒」生效：残血狂怒——压低身子拖斧蓄怒、眼冒红光、脸涨红，一声怒吼挣断手上的锁链，接着以两倍速度连劈三斧（带残影）。
PCD.define('SlaveLord', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, hash, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT,
    spawn, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：狂怒（白 → 怒黄 → 血红 → 暗红 → 墨红）。只用共享色板里已有的颜色 ─────
  const R_EL = fxRamp('rage', [21, 47, 57, 56, 55]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质（和维京战士同一套：蓝衣、姜红胡、红白盾、铁盔骨角；升级加铁甲、毛皮、金饰）─────
  const M = parts.mats(E, {
    tabard: { r: 'blue', band: 2 }, plate: 'steel', fur: [8, 10, 18, 17], gold: 'gold', belt: 'leather', pants: 'blue', boot: 'iron',
    skin: 'skin', flush: [11, 16, 58, 15], hair: [20, 44, 45, 46], ink: { r: 'ink', flat: 1 }, fury: { r: [55, 56, 57, 47], flat: 1 },
    iron: 'iron', horn: 'bone', steel: 'steel', wood: 'wood', chain: 'steel',
    paint: 'crimson', paint2: 'bone',
  });
  const BODY = { body: 'heroic', leg: 10, torso: 9, sw: 6, head: 7, limb: 1.35, lw: 4, fall: 'back' };
  const R0 = parts.rig({}, BODY);
  const AXE = { head: 'battle', metal: M.steel, edge: M.steel, wood: M.wood, trim: M.gold, glow: M.fury, len: 12, back: 6 };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(96, 66, 44, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 11, 15, 18], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['wood', 'ink', 'fury', 'skin', 'flush', 'hair', 'steel', 'chain']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手握斧（hx hy a），后手按在斧柄上（由斧的几何算出）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, chain: 1, flush: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(6, -9, 0.2);                                  // 大斧竖在身前，斧刃高过肩
  const K_WIND = K(1, -23, -2.2, -1, -1);                        // 斧抡到脑后
  const K_STRIKE = K(5, -12, 1.7, 1, 1, 1);                      // 过顶斜劈落下（斧刃正好落在假人身上）
  const K_HOLD = K(6, -10, 2.0, 1, 0, 1);
  const K_BROOD = K(6, -8, 1.9, 1, 1, 2);                        // 蓄怒：压低身子，斧头拖在地上
  const K_ROAR = K(6, -21, 0.35, -1, -1);                        // 怒吼：挺胸抬头，大斧高举
  const K_UP = K(3, -24, -1.2, -1, 0);                           // 连劈之间的回抡（很短）
  const K_SWEEP = K(5, -15, 1.5, 1, 1, 1);                       // 第二斧：横扫
  const K_HURT = K(4, -9, -0.2, -1, -1);
  const K_KNEEL = K(8, -8, 0.3, 1, 1, 4);                        // 跪下拄着斧
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['chain', 0, 1], ['flush', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_STRIKE = 2 / 12, T_LAND = INCOMING + 0.66;
  const CHOPS = [[CAST, 3 / 12, K_UP, K_STRIKE], [CAST, 5 / 12, K_UP, K_SWEEP], [RECOVER, 2 / 12, K_UP, K_STRIKE]];   // 连劈三斧：状态、命中时刻、回抡姿、劈下姿
  const NECK = [[-1, -2], [0, 2], [1, -2], [1, 2], [0, 0]];     // 待机个性：扭脖子、甩手上的锁链（头、链摆）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.chain = 1; P.flush = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const k = NECK[Math.floor((lp - 1.6) * 12 + 1e-6)]; P.head = k[0]; P.beard = k[1]; P.glint = k[0] > 0 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 重步：接触帧下沉、扬尘，锁链甩
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.hx += P.step * 0.6; P.a += P.step * 0.08; P.beard *= 2;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 3; P.beard = -2; P.sway = -1; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_STRIKE, K_HOLD, q); P.bx = 3; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 蓄怒：脸涨红、眼冒红光，后半段浑身发抖
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_BROOD, q);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.3 ? 0 : 1; P.flush = tq >= 0.45 ? 1 : 0; P.beard = (f12 & 1) ? 1 : -1;
      if (tq >= 0.7) { P.bx = (f12 & 1) ? 1 : 0; P.sway = (f12 & 1) ? 1 : -1; P.beard = (f12 & 1) ? 2 : -2; }
    } else if (st === CAST || (st === RECOVER && tq < 3 / 12)) {       // 怒吼挣断锁链 → 两倍速连劈
      P.gem = 3; P.rim = 2; P.flush = 1; P.chain = 0; P.beard = -2; P.sway = -1; P.bx = 3;
      if (st === CAST && tq < 2 / 12) { setK(K_BROOD, K_ROAR, ease.out(clamp01(tq / 0.12))); P.bx = RD(3 * tq * 6); P.beard = 2; }
      else {
        let hit = null; for (const c of CHOPS) if (c[0] === st && tq < c[1] + 1 / 12 - 1e-6) { hit = c; break; }
        if (!hit) hit = CHOPS[st === CAST ? 1 : 2];
        if (tq < hit[1] - 1e-6) setK(hit[2], hit[2], 0); else { setK(hit[3], hit[3], 0); P.glint = 1; }
      }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01((tq - 3 / 12) / 0.4)); setK(K_STRIKE, K_IDLE, q); P.bx = RD(3 * (1 - q)); P.chain = 0;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.flush = q < 0.6 ? 1 : 0; P.beard = -RD(1 - q);
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 拄斧跪下 → 仰面倒下，角盔滚到脑后，盾甩到脚边，眼里的红光闪几下熄灭
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.beard = 1; P.gem = (f12 & 1) ? 2 : 1; P.flush = 1; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.bx = -1; P.eyes = 0; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.crouch = 0; P.lean = 0; P.head = 0;
        P.hx = R0.sFx + 1; P.hy = R0.yWaist + 1; P.a = HALF;
        const hq = clamp01((d - 0.66) / 0.3); P.hatX = RD(7 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 4);
        P.gem = d < 0.9 ? ((f12 & 1) ? 2 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.a = RD(P.a / ASTEP) * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const b = parts.onShaft(P, AXE, 3); P.bhx = b[0]; P.bhy = b[1]; P.ba = P.a;       // 双手：后手在前手上方 3 格
    if (P.lying) { P.gx = -20 + P.bx; P.gy = -3; }                    // 倒地：发光体 = 地上的眼（只用来挂魂光）
    else { P.gx = R0.hx1 + P.lean + P.head + P.bx; P.gy = R0.ey + yo; }       // 发光体 = 盔缝里发红光的眼
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), rage = P.gem >= 1 && P.gem <= 3, sk = P.flush ? M.flush : M.skin, skD = P.flush ? M.flushD : M.skinD;
    if (R.lie) parts.targe(E, R, P, { r: 6, free: 1, at: [9 + RD(P.hatX * 0.3), -4], face: M.paint, face2: M.paint2, rim: M.gold, boss: M.iron, pattern: 'quarter' });
    else parts.targe(E, R, P, { r: 6, at: [parts.edges(R, R.yS + 4)[0] - 1, R.yS + 5], face: M.paint, face2: M.paint2, rim: M.gold, boss: M.iron, pattern: 'quarter' });   // 背盾（升级：加大、镶金边）
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, pStyle: 'spike', grip: 'none', at: R.lie ? [R.sBx + 1, R.yWaist + 1] : null });
    parts.legs(E, R, P, { style: 'greave', mat: M.pants, matD: M.pantsD, boot: M.boot, bootD: M.bootD });
    parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.tabard, belt: M.belt, buckle: M.gold, emblem: M.gold, emblemStyle: 'diamond' });
    parts.mantle(E, R, P, { style: 'fur', mat: M.fur, len: 3, clasp: M.gold });
    parts.hair(E, R, P, { style: 'short', mat: M.hair });                                                      // 盔下的姜红短发（角盔滚掉时露出来）
    parts.head(E, R, P, { mat: sk, face: 'square', age: 'rugged', eye: rage ? M.fury : M.ink, eyeStyle: rage ? 'glow' : 'dot', nose: 'big', mouth: 'none' });
    const helm = { style: 'great', mat: M.iron, trim: M.gold, eye: rage ? M.fury : 0 }, horns = { mat: M.horn, band: M.gold, size: 6, curve: 'up' };   // 升级：闭面桶盔 + 一对大牛角，狂怒时眼缝冒红光
    if (R.lie) { const at = [-25 - P.hatX, -6 - P.hatY]; parts.helm(E, R, P, Object.assign({ at, rot: 0 }, helm)); parts.horns(E, R, P, Object.assign({ at, rot: 0 }, horns)); }
    else { parts.helm(E, R, P, helm); parts.horns(E, R, P, horns); }
    if (R.lie) parts.axe(E, R, P, Object.assign({}, AXE, { free: 1, at: [-2, -2], a: HALF, glowLv: 4 }));
    else { parts.axe(E, R, P, AXE); parts.hand(E, R, P, { side: 'B', hand: sk, grip: 'big' }); }
    const arm = parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, pauldron: M.plate, pStyle: 'spike', trim: M.gold, cuff: M.belt, cuffStyle: 'bracer', hand: sk, grip: 'big' });
    // 缠在前臂上的锁链 + 镣铐：从手腕垂下，站着时镣铐最低点不低于 y −4（贴地会读成第三只脚），手放低（蓄怒、跪下）时链子收短；倒地时链子垂到地上堆开
    const cl = R.lie ? 3 : P.chain ? Math.max(0, Math.min(2, -7 - arm.wy)) : 1;
    parts.chain(E, R, P, { wrap: [arm.ex, arm.ey, arm.wx, arm.wy], at: [arm.wx - 1, arm.wy], len: cl, mat: M.chain, cuff: P.chain ? M.iron : 0, swing: 1.4 });
    parts.braids(E, R, P, { mat: M.hair, ring: M.gold, n: 2, len: 7 });                          // 编辫胡（升级：更长、金辫环）
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + 6 + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let ghostT = 9, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function afterimage(st, tWind) { poseAt(st, tWind, tWind); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = hero.k2 = -1; ghostT = 0; }
  function chop(i, t) {                                                // 连劈的一斧：残影（回抡那一帧）+ 狂怒斩击弧 + 命中
    const c = CHOPS[i]; afterimage(c[0], c[1] - 1 / 12); poseAt(c[0], t, t);
    const sx = wx(R0.sFx + P.bx), sy = wy(R0.sFy + 2), last = i === 2;
    fx.slash(sx, sy, 15, c[2].a + 0.4, c[3].a + 0.3, R_EL, 0.2, 3, 2);
    burst(DUMMY_X - 3, HY - 14 + i * 3, last ? 26 : 14, 50, 130, 0.25, 0.6, R_EL, 10); burst(DUMMY_X - 3, HY - 14, 8, 40, 90, 0.15, 0.35, R_IMP, 10);
    fx.cross(DUMMY_X - 3, HY - 14 + i * 3, last ? 7 : 5, R_EL, 0.25); hitDummy(last ? 1 : 0); if (last) shake(0.14, 1);
    sfx('impact', { pal: 'blood', w: last ? 0.9 : 0.6 });
  }
  function onEnter(s) {
    if (s !== CAST) return;                                            // 怒吼：锁链崩断（铁环飞散）、狂怒冲击环、天空闪白
    const cx = wx(R0.sFx + 5), cy = wy(R0.yWaist - 2);
    for (let i = 0; i < 12; i++) spawn(K_BURST, cx + (Math.random() - 0.5) * 4, cy + (Math.random() - 0.5) * 4, (Math.random() - 0.3) * 120, -40 - Math.random() * 80, 0.5 + Math.random() * 0.4, FXI.steel);
    burst(wx(4), wy(-14), 30, 60, 140, 0.3, 0.75, R_EL, 20); ring(wx(2), wy(-14), 1, R_EL); fx.cross(wx(P.gx), wy(P.gy), 8, R_EL, 0.35);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {
      afterimage(ATTACK, 0.12); poseAt(ATTACK, t, t);
      fx.slash(wx(R0.sFx + P.bx), wy(R0.sFy + 2), 15, K_WIND.a + 0.6, K_STRIKE.a + 0.3, R_IMP, 0.17, 2, 2);
      hitDummy(0); burst(DUMMY_X - 3, HY - 12, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(DUMMY_X - 3, HY - 12, 4, R_IMP, 0.2);
      sfx('swing', { kind: 'slash', w: 0.8 }); sfx('hit', { mat: 'metal', w: 0.7 });
    }
    for (let i = 0; i < CHOPS.length; i++) if (s === CHOPS[i][0] && Math.abs(t - CHOPS[i][1]) < 1e-9) chop(i, t);
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 18; i++) spawn(K_DUST, HX - 6 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 34, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.12, 1); sfx('fall', { w: 0.9 }); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [CHOPS[0][1], CHOPS[1][1]], [CHOPS[2][1]], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    const ex = wx(P.gx), ey = wy(P.gy);
    if (state === CHARGE) {                                            // 怒气：红点从四周吸进胸口，身上冒起怒焰
      chargeAcc += dt * (16 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 13 + Math.random() * 9; spawn(K_SPIRAL_PT, wx(2), wy(-12), r / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 2 + Math.random() * 2); }
      emberAcc += dt * (6 + 26 * clamp01((stT - 0.3) / 1.1));
      while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(-6 + Math.random() * 14), wy(-4 - Math.random() * 22), (Math.random() - 0.5) * 8, -12 - Math.random() * 14, 0.4 + Math.random() * 0.4, R_EL); }
    }
    if ((state === CAST || state === RECOVER) && P.rim >= 1) { emberAcc += dt * (P.rim * 10); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(-6 + Math.random() * 16), wy(-4 - Math.random() * 24), (Math.random() - 0.5) * 10, -14 - Math.random() * 12, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.85 }); for (let i = 0; i < 4; i++) spawn(K_DUST, wx(P.step > 0 ? 5 : -4) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 22, -5 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust); } lastStep = P.step; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 6 + Math.random() * 30, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    ghostT += dt;
  }
  function fxReset() { ghostT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (!P.lying) floorGlow(wx(2), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() { if (ghostT < 0.2) blitShape(ghost, HX + P.mx, HY, P.flip, P.rim >= 2 ? (ghostT < 1 / 12 ? EL[3] : EL[4]) : (ghostT < 1 / 12 ? 60 : 59), clamp01(ghostT / 0.2)); }   // 挥斧残影（狂怒时是红色）
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) {           // 眼里的红光：蓄满 / 施放时拉出两道横向光芒
      const x = wx(P.gx), y = wy(P.gy), L = P.gem === 3 ? 4 : 2 + (f12 & 1), d = P.flip ? -1 : 1;
      for (let r = 1; r <= L; r++) put(x + d * r, y, r <= 1 ? EL[0] : r <= 2 ? EL[1] : EL[2]);
      put(x - d, y, EL[2]);
    }
  }

  return {
    name: '奴隶主', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.fury], HIT_POINT: [2, -14], EVENTS, R_HURT: R_IMP,
    SFX: { body: 'armor', how: 'topple', pal: 'blood', style: 'buff', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
