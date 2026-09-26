// 骸骨武士（部队 · 骷髅 · 先锋 · 优质）：逃兵升级而来、唯一的重装骷髅——同一顶凹陷破锅盔焊上带竖缝的面甲成了凹陷桶盔（凹痕留在左后），盔缝透出磷绿眼火；
// 黑铁重甲撑不满骨架（腰和小腿露出细骨），肩上两片外翻的锯齿骨板把肩宽撑到 18 格，逃兵背后那支断箭钉在左肩甲上，军旗布变成罩袍前襟 + 身后破短披风；
// 双手竖持一柄门板宽的锯齿骨刃大剑。
// 攻击 = 大剑举过右肩斜劈到地面、剑尖砸出小地裂；技能 = 特性「骸骨再生」（生命越低回得越快）：跪地拄剑、甲缝一道道裂开透绿火 → 大剑插地、绿焰冲击环 → 盔缝喷火、甲片复位、治疗十字飘升。
PCD.define('Warrior', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, fxRamp, FXI, FXR, HY, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, px = parts.px;

  // ───── 元素：残血再生 · 磷火绿（FXI.nature，同线共用），爆发处加骨白碎片（bonebit 色阶：白 → 骨 → 暖灰 → 石）─────
  const R_EL = FXI.nature, EL = FXR[R_EL], R_BONE = fxRamp('bonebit', [17, 17, 6, 7, 8]), R_STEEL = FXI.steel;

  const M = parts.mats(E, {
    plate: 'iron', bone: 'bone', tab: 'blue', gold: 'gold', cape: { r: 'blue', band: 2 }, blade: 'bone', edge: 'steel', hilt: 'iron', belt: 'boot',
    shaft: 'wood', fletch: 'white', ink: { r: 'ink', flat: 1 },
    eyeDim: { r: [35, 35, 36, 37], flat: 1 }, eye: { r: [35, 36, 37, 38], flat: 1 }, eye2: { r: [37, 38, 21, 21], flat: 1 },
  });
  const BODY = { body: 'giant', leg: 11, torso: 12, head: 7, headW: 7, sw: 6, arm: 12, lw: 4, stride: 3, limb: 1.4, fall: 'front' };   // 巨型重装档：上重下轻
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(80, 62, 36, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 18], rimRamp: EL, rimAll: 1, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['ink', 'eyeDim', 'eye', 'eye2', 'shaft', 'fletch', 'tab', 'gold', 'cape']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const SW = { style: 'great', len: 17, w: 3, guard: 5, metal: M.blade, edge: M.edge, trim: M.bone, wood: M.hilt };

  // ───── 姿势：前手握剑（hx, hy, a），后手自动放在剑柄上前手后面一格（双手握）─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqk: 0, st: 0, crk: 0, hol: 0, helmOff: 0, hatX: 0, hatY: 0, hrot: 0, up: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, crouch) => ({ hx, hy, a, lean: lean || 0, crouch: crouch || 0 });
  const K_IDLE = K(9, -19, Math.PI);                                    // 拄剑：剑尖点地，双手压在剑柄上
  const K_WIND = K(3, -27, -0.6, -1);                                   // 举过右肩
  const K_STRIKE = K(11, -13, 2.36, 2, 1);                              // 斜劈到地面
  const K_HOLD = K(10, -12, 2.36, 1, 1);
  const K_KNEEL = K(10, -13, Math.PI, 1, 4);                            // 单膝跪地拄剑
  const K_PLUNGE = K(10, -9, Math.PI, 1, 4);                            // 整根插进地里
  const K_HURT = K(7, -19, 3.0, -1);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 24], ['hy', -40, 5], ['bhx', -16, 24], ['bhy', -40, 5], ['ai', -64, 64], ['lean', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8],
    ['step', -1, 1], ['wup', 0, 2], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['dqk', 0, 48], ['st', 0, 8],
    ['crk', 0, 4], ['hol', 0, 3], ['helmOff', 0, 1], ['hatX', -4, 24], ['hatY', -4, 30], ['hrot', 0, 3], ['up', 0, 1]]);
  const SWAY_IDLE = [0, 1, 0, -1];
  const T_STRIKE = 2 / 12, T_SPEW = 0.2, T_KNEE = INCOMING + 0.45, T_H1 = INCOMING + 0.7, T_H2 = INCOMING + 0.95, T_H3 = INCOMING + 1.2, T_HELM = INCOMING + 1.5, T_HLAND = INCOMING + 1.75;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.crk = 0; P.hol = 0; P.helmOff = 0; P.hatX = 0; P.hatY = 0; P.hrot = 0; P.up = 0; P.head = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.gem = P.bob ? 0 : 1;                                              // 盔缝绿火跟着呼吸一亮一暗
      const lp = tq % DUR[IDLE]; if (lp >= 1.5 && lp < 2.2) { P.up = 1; P.gem = lp >= 1.7 && lp < 2.0 ? 2 : 1; P.bob = 0; }   // 待机个性：头盔缓缓抬起一次
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 重装行军：步子沉、接触帧顿挫 1 格，甲片咔嗒
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.a = Math.PI - 0.25; P.hy -= 2; P.hx += P.step; P.gem = 1;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; }
      else if (tq < 0.25) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 4; P.gem = 2; P.beard = -2; P.sway = -1; }
      else if (tq < 0.45) { setK(K_STRIKE, K_HOLD, ease.out((tq - 0.25) / 0.2)); P.bx = 3; P.gem = 1; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                          // 单膝跪地拄剑，甲缝一道道裂开（越裂越亮），轮廓光从盔缝往外扩
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_KNEEL, q);
      P.crk = tq < 0.25 ? 0 : tq < 0.5 ? 1 : tq < 0.75 ? 2 : tq < 1.0 ? 3 : 4; P.rim = tq < 0.4 ? 1 : tq < 0.9 ? 2 : 3; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.sway = q > 0.8 ? ((f12 & 1) ? -1 : 0) : 0; P.beard = -1;
    } else if (st === CAST) {                                            // 大剑整根插进地里 → 盔缝喷火、甲片一片片「咔」复位
      setK(K_PLUNGE, K_PLUNGE, 0); P.gem = 3; P.rim = 3; P.sway = -1; P.beard = -2;
      P.crk = tq < T_SPEW ? 4 : tq < T_SPEW + 1 / 12 ? 3 : tq < T_SPEW + 2 / 12 ? 2 : tq < T_SPEW + 3 / 12 ? 1 : 0;
    } else if (st === RECOVER) {                                         // 拔剑站起来
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_PLUNGE, K_IDLE, q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.beard = 1; P.sway = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 跪倒空壳：单膝跪下拄剑不倒 → 骨头从甲缝里一块块掉出来 → 盔缝绿火熄灭 → 头盔滚落，只剩空盔甲跪着
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.25) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.12 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < T_KNEE - INCOMING) { setK(K_HURT, K_KNEEL, 0.5); P.crouch = 3; P.bx = -1; P.gem = 1; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.gem = d < 0.9 ? 1 : d < 1.15 ? ((f12 & 1) ? 1 : 4) : 4; P.eyes = P.gem === 4 ? 1 : 0;
        P.hol = d >= T_H3 - INCOMING ? 3 : d >= T_H2 - INCOMING ? 2 : d >= T_H1 - INCOMING ? 1 : 0;
        if (d >= T_HELM - INCOMING) { const q = clamp01((d - (T_HELM - INCOMING)) / (T_HLAND - T_HELM)); P.helmOff = 1; P.hatX = RD(4 + q * 14); P.hatY = RD(20 * (1 - q * q)); P.hrot = q < 1 ? (RD(q * 3) & 3) : 1; }
        if (d >= 1.7) P.dq = clamp01((d - 1.7) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.lean = RD(P.lean); P.crouch = RD(P.crouch); P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.dqk = RD(P.dq * 48);
    const b = parts.along(P, SW, -2); P.bhx = b[0]; P.bhy = b[1];
    const R = parts.rig(P, BODY); P.gx = R.hx1 + P.bx; P.gy = R.htop + 3 - P.up;   // 发光体 = 盔缝眼火
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：jagPauldron —— 外翻的锯齿骨板肩甲：三行扇形 + 下沿一排锯齿（隔列垂 1 格）+ 外端翘起 1 格；dir 1 = 前肩往前翻，-1 = 后肩往后翻
  function jagPauldron(R, x, y, dir, m, seam) {
    E.part();
    parts.run(E, R, y - 3, x - 1, x + 1, m, 0); parts.run(E, R, y - 2, x - 3, x + 3, m, 0); parts.run(E, R, y - 1, x - 4, x + 4, m, 0);
    for (let k = -4; k <= 4; k += 2) px(E, R, x + k, y, m, (k & 2) ? 2 : 0);
    px(E, R, x + 5 * dir, y - 2, m, 4); px(E, R, x + 5 * dir, y - 1, m, 0);
    for (let k = -2; k <= 2; k += 2) px(E, R, x + k, y - 2, m, 4);       // 骨板的肋纹
    if (seam) { px(E, R, x - 1, y - 1, seam, 3); px(E, R, x, y - 2, seam, 4); px(E, R, x + 1, y - 1, seam, 3); }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    parts.cape(E, R, P, { style: 'tattered', mat: M.cape, len: 'short', flare: 4 });
    const bp = [R.sBx, R.sBy - 1];
    jagPauldron(R, bp[0], bp[1], -1, M.boneD, 0);
    { E.part(); const x = bp[0] - 1, y = bp[1] - 3; px(E, R, x, y - 1, M.shaft, 3); px(E, R, x, y - 2, M.shaft, 3); px(E, R, x, y - 3, M.fletch, 4); px(E, R, x - 1, y - 3, M.fletch, 3); px(E, R, x + 1, y - 4, M.fletch, 2); px(E, R, x, y - 4, M.fletch, 4); }   // 钉在左肩甲上的断箭，箭羽竖起 3 格
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, grip: 'none' });
    if (P.hol >= 2) {                                                   // 小腿骨掉光：只剩铁靴和膝甲留在原地
      E.part(); const kb = R.hipBx, kf = R.hipFx + 3;
      if (R.kneel) { parts.run(E, R, -1, kb - 7, kb - 5, M.plateD, 0); parts.run(E, R, 0, kb - 6, kb - 5, M.plateD, 0); parts.rect(E, R, kf - 1, -1, 3, 2, M.plate, 0); px(E, R, kf + 2, 0, M.plate, 3); parts.rect(E, R, kf - 1, R.yHip + 1, 3, 2, M.plate, 0); }
    } else {
      parts.legs(E, R, P, { style: 'greave', mat: M.bone, matD: M.boneD, boot: M.plate, bootD: M.plateD, w: 2 });
      if (!R.kneel) { const h0 = R.yHip + 1, n = Math.max(1, -R.footFup - h0), y = RD(h0 + n * 0.45), t = (y - h0) / n, c = RD(R.legFx + (R.footFx - R.legFx) * t + (R.cr * 0.9 + (R.footFup ? 0.8 : 0)) * Math.sin(t * Math.PI)); parts.run(E, R, y, c - 1, c + 1, M.plate, 0); px(E, R, c + 2, y, M.plate, 3); }   // 膝甲
    }
    const tor = parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.tab, belt: M.belt, buckle: M.gold });
    const L = tor.rows[0], Rr = tor.rows[1], row = (y) => Math.min(y, tor.hem) - tor.y0, mid = (y) => RD((L[row(y)] + Rr[row(y)]) / 2);
    for (let y = R.yWaist + 1; y <= R.yHip - 1; y++) {                  // 甲撑不满：腰那一截是空的，只有一根脊椎和前面垂着的罩袍布
      for (let x = L[row(y)]; x <= Rr[row(y)]; x++) px(E, R, x, y, 0);
      if (P.hol < 1) { const sx = L[row(y)] + 2; px(E, R, sx, y, M.bone, (y & 1) ? 4 : 2); px(E, R, sx + 1, y, M.bone, (y & 1) ? 3 : 1); }
      const a = mid(y) - 1; for (let x = a; x <= a + 3 && x <= Rr[row(y)]; x++) px(E, R, x, y, M.tab, x === a ? 4 : 0);
    }
    if (P.hol < 1) parts.run(E, R, R.yHip - 1, L[row(R.yHip - 1)] + 1, L[row(R.yHip - 1)] + 5, M.bone, 3);   // 骨盆
    px(E, R, mid(tor.hem) - 1, tor.hem, M.gold, 3); px(E, R, mid(tor.hem) + 2, tor.hem, M.gold, 3);
    const SEAM = [[R.yS + 3, 1], [R.yS + 6, -1], [R.yWaist, 1]];        // 甲缝裂纹（透绿火，越裂越亮）
    for (let i = 0; i < Math.min(3, P.crk); i++) { const [y, s] = SEAM[i], x0 = L[row(y)] + 2; for (let k = 0; k < 5; k++) px(E, R, x0 + k, y + (((k + (s > 0 ? 0 : 1)) & 1) ? 1 : 0), P.crk >= 4 ? M.eye2 : M.eye, 3 + (k & 1)); }
    if (!P.helmOff) {
      if (P.up) { R.hy -= 1; R.htop -= 1; R.ey -= 1; }
      const lv = [M.eyeDim, M.eye, M.eye2, M.eye2, M.ink][P.gem];
      parts.helm(E, R, P, { style: 'great', mat: M.plate, trim: M.plate, eye: lv });
      const a = R.hx0, top = R.htop;                                     // 凹陷：左后角塌进去一块（凹痕保留）
      px(E, R, a - 1, top, 0); px(E, R, a - 1, top + 1, 0); px(E, R, a, top - 1, 0); px(E, R, a, top, M.plate, 1); px(E, R, a, top + 1, M.plate, 2); px(E, R, a + 1, top - 1, M.plate, 1);
      px(E, R, R.hx1, top + 2, M.plate, 1); px(E, R, R.hx1, top + 4, M.plate, 1); px(E, R, R.hx1, top + 5, M.plate, 1);   // 面甲竖缝
      if (P.up) { R.hy += 1; R.htop += 1; R.ey += 1; }
    } else parts.helm(E, R, P, { style: 'great', mat: M.plate, trim: M.plate, eye: M.ink, at: [P.hatX, -((P.hrot & 1) ? 5 : 8) - P.hatY], rot: P.hrot });
    parts.sword(E, R, P, SW);
    { const S = Math.max(Math.abs(Math.sin(P.a)), Math.abs(Math.cos(P.a))), vert = Math.abs(Math.cos(P.a)) >= Math.abs(Math.sin(P.a)) - 1e-6;   // 锯齿刃背：隔一格伸出一颗骨齿
      for (let k = 4; k <= 15; k += 2) { const c = parts.along(P, SW, k / S); px(E, R, c[0] + (vert ? 2 : 0), c[1] + (vert ? 0 : 2), M.blade, (k & 2) ? 3 : 2); } }
    if (P.hol < 3) parts.hand(E, R, P, { side: 'B', hand: M.boneD, grip: 'big' });
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, grip: P.hol < 3 ? 'big' : 'none', hand: M.bone });
    jagPauldron(R, R.sFx + 1, R.sFy - 1, 1, M.bone, P.crk >= 3 ? (P.crk >= 4 ? M.eye2 : M.eye) : 0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const NC = 8, crX = new Float32Array(NC), crY = new Float32Array(NC), crT = new Float32Array(NC).fill(9);
  let crHead = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0;
  function healCross(x, y) { crX[crHead] = x; crY[crHead] = y; crT[crHead] = 0; crHead = (crHead + 1) % NC; }
  function bones(x, y, n) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 4, y, (Math.random() - 0.5) * 30, -10 - Math.random() * 20, 1.2 + Math.random() * 0.5, R_BONE, { g: 300, floor: HY - (i & 1), sz: (i % 3) === 0 ? 2 : 1 }); }
  function onEnter(s) {
    if (s !== CAST) return;
    const sx = wx(P.hx + 1), R = parts.rig(P, BODY);                     // 大剑插地：绿焰冲击环沿地面扩散 + 剑身两侧喷出小火柱
    releaseOrbit(40, 90, 0.3, 0.6); ring(sx, HY - 1, 1, R_EL);
    fx.wave(sx, HY, 1, 24, 4, R_EL, 0.55); fx.wave(sx, HY, -1, 24, 4, R_EL, 0.55);
    fx.pillar(sx - 3, HY - 12, HY, 1, R_EL, 0.35); fx.pillar(sx + 3, HY - 12, HY, 1, R_EL, 0.35);
    burst(sx, HY - 2, 16, 40, 100, 0.2, 0.5, R_BONE, 20); fx.crack(sx, HY + 1, 8, 1, R_EL, 0.8); fx.crack(sx, HY + 1, 7, -1, R_EL, 0.8);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'nature', w: 0.85 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                                // 斜劈：骨刃拖出一道白弧，剑尖砸出一道小地裂
      const hx = wx(P.hx), hy = wy(P.hy), tipX = RD(hx + Math.sin(P.a) * 19);
      fx.slash(hx, hy, 17, -0.6, 2.4, R_STEEL, 0.17, 3, 2); fx.crack(tipX - 4, HY + 1, 7, 1, FXI.earth, 0.5);
      for (let i = 0; i < 6; i++) spawn(K_DUST, tipX - 6 + Math.random() * 8, HY - 1, (Math.random() - 0.5) * 36, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      burst(96, HY - 14, 14, 50, 120, 0.15, 0.4, FXI.impact, 10); fx.cross(95, HY - 14, 4, FXI.impact, 0.17);
      hitDummy(1); shake(0.1, 1); sfx('swing', { kind: 'slash', w: 0.85 }); sfx('hit', { mat: 'flesh', w: 0.8 });
    }
    if (s === CAST && t === T_SPEW) {                                    // 盔缝喷火、甲片复位、冒白蒸汽、治疗十字
      const gx = wx(P.gx), gy = wy(P.gy), R = parts.rig(P, BODY);
      fx.pillar(gx, gy - 16, gy, 2, R_EL, 0.4); burst(gx, gy - 2, 14, 30, 90, 0.2, 0.5, R_EL, 30);
      fx.cloud(wx(2), wy(R.yS + 4), 6, FXI.dust, 0.7); fx.cross(wx(3), wy(R.yS + 3), 4, R_EL, 0.3);
      for (let i = 0; i < 4; i++) healCross(HX - 9 + i * 6, HY - 3 - (i & 1) * 4);
      sfx('impact', { pal: 'nature', w: 0.45 });
    }
    if (s === DEATH && t === T_KNEE) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.12, 1); sfx('fall', { w: 0.9 }); }
    if (s === DEATH && t === T_H1) { const R = parts.rig(P, BODY); bones(wx(parts.edges(R, R.yWaist + 2)[0] + 3), wy(R.yWaist + 2), 6); sfx('hit', { mat: 'stone', w: 0.3 }); }
    if (s === DEATH && t === T_H2) { bones(wx(0), wy(-4), 5); bones(wx(-8), wy(-2), 3); sfx('hit', { mat: 'stone', w: 0.25 }); }
    if (s === DEATH && t === T_H3) { bones(wx(P.hx), wy(P.hy), 5); sfx('hit', { mat: 'stone', w: 0.2 }); }
    if (s === DEATH && t === T_HLAND) { for (let i = 0; i < 6; i++) spawn(K_DUST, wx(18), HY - 1, (Math.random() - 0.5) * 24, -4 - Math.random() * 6, 0.35, FXI.dust); sfx('fall', { w: 0.4 }); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_SPEW], [], [], [T_KNEE, T_H1, T_H2, T_H3, T_HLAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) { chargeAcc += dt * (12 + 24 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    if (state === CHARGE && stT > 0.25) { emberAcc += dt * 3 * P.crk; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(-2 + Math.random() * 8), wy(-22 + Math.random() * 10), Math.random() * 6 - 3, -8 - Math.random() * 8, 0.5 + Math.random() * 0.4, R_EL); } }
    if ((state === CAST && stT > T_SPEW) || (state === RECOVER && stT < 0.35)) { emberAcc += dt * 12; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, HX - 8 + Math.random() * 16, HY - 1, Math.random() * 6 - 3, -10 - Math.random() * 8, 0.6 + Math.random() * 0.4, R_EL); } }
    if (state === MOVE && P.step !== lastStep) {                         // 每次落脚 3–4 颗尘 + 甲片咔嗒
      if (P.step !== 0) { sfx('step', { w: 0.85 }); const n = 3 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) spawn(K_DUST, wx(P.step > 0 ? 5 : -4) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 22, -4 - Math.random() * 7, 0.3 + Math.random() * 0.25, FXI.dust); }
      lastStep = P.step;
    }
    if (state === DEATH && stT > INCOMING + 1.8 && stT < INCOMING + 2.5) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 20, HY - 2 - Math.random() * 12, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, (soulAcc * 11 | 0) & 1 ? FXI.soul : R_EL); } }
    for (let i = 0; i < NC; i++) crT[i] += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; crT.fill(9); }
  function fxBack(f12) { if (P.dq < 1 && !P.helmOff) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.helmOff) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    for (let i = 0; i < NC; i++) {                                       // 治疗十字：从脚下往上飘
      const a = crT[i]; if (a >= 0.8) continue; const q = a / 0.8, x = RD(crX[i]), y = RD(crY[i] - q * 18), c = EL[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4];
      if (q > 0.6 && ((f12 + i) & 1)) continue; put(x, y, c); put(x - 1, y, c); put(x + 1, y, c); put(x, y - 1, c); put(x, y + 1, c);
    }
  }

  return {
    name: '骸骨武士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eyeDim, M.eye, M.eye2], HIT_POINT: [2, -18], EVENTS,
    SFX: { body: 'armor', how: 'collapse', pal: 'nature', style: 'heal', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
