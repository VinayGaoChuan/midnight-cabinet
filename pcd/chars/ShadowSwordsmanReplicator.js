// 影剑士分身 ShadowSwordsmanReplicator（衍生单位 · 自然 · 战士 · 普通 · 近战 240）：影剑士的「暗影繁殖者」召唤出的随从（存在 40 秒）。
// 影剑士的缩小墨青剪影：同款狐面具尖耳，灰白面具是全身唯一不黑的地方（两道青眼缝）；反握影弯刀，刀尖向后伸，刃边一线青光；
// 膝盖以下化成一缕向后拖 8 格、末端分叉的烟尾，离地 2 格漂着；破围巾缩成一条短飘带。
// 攻击 = 刺：反握刀举起 → 闪到目标面前向前下方一戳（反手下刺）。
// 技能「影袭」（分身的招牌动作，没有特性）：身体从下往上一行行沉进地面影子，只剩面具浮在影子上、青眼亮起 → 影子贴着地面滑到目标背后（暗带 + 青色拖尾，
//        原地留 1 帧残影）→ 从目标背后跃出反手下刺（青白十字星芒、墨青烟外爆）→ 再沉进影子滑回原位、浮出来。
// 死亡 = 噗散：整个剪影「噗」地炸成一团墨青烟，只有灰白面具掉下来，在地上弹一下后化灰。设定卡见 pcd/batch-10/ShadowSwordsmanReplicator/design.md。
PCD.define('ShadowSwordsmanReplicator', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_TRAIL, K_SPIRAL_PT,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, groundShadow, sfx } = E;
  const RD = Math.round, PI = Math.PI;

  // ───── 元素：林影残影 · 墨青（白 21 → 淡青 → 墨青 → 墨紫 53 → 暗影 52）─────
  const R_EL = fxRamp('groveShade', [21, '#9fe8d6', '#3a8a78', 53, 52]), EL = FXR[R_EL];

  // ───── 材质：单色墨青剪影 + 灰白面具 + 青色眼缝 / 刃边 ─────
  const M = parts.mats(E, {
    body: ['#030807', '#0a1a18', '#14302a', '#22483e'],
    smoke: ['#030807', '#14302a', '#22483e', '#3a8a78'],        // 烟尾比身体淡一级
    patch: ['#030807', '#030807', '#0a1a18', '#14302a'],        // 地面影子
    mask: 'pale',
    eye: { r: [39, 23, 22, 21], flat: 1 },
    edge: { r: [39, 23, 22, 22], flat: 1 },                     // 刃边一线青光
  });
  const RIG = { body: 'slim', leg: 6, torso: 7, head: 6, headW: 5, sw: 3, arm: 8, lw: 2, limb: 0.9, fall: 'back' };
  const SW = { style: 'saber', len: 7, w: 2, guard: 3, metal: M.body, trim: M.bodyD, wood: M.bodyD, edge: M.edge };
  const HX = 74, DUR = DEFAULT_DUR.slice(), BASE_LIFT = 2, BEHIND = DUMMY_X + 14 - HX;
  const hero = new Sprite(52, 42, 22, 38);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['mask', 'eye', 'edge', 'patch']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手反握弯刀（hx hy = 拳，a = 刀身方向，0 朝上、顺时针为正）─────
  // sink 沉进影子的格数 · patch 地面影子半宽（0 = 没有）· tph 烟尾翻卷相位 · drag 烟尾后拖量 · poof 身体炸散（只剩面具）· mkx / mky 掉落面具位置 · jit 卡顿错位
  const P = { hx: 0, hy: 0, a: 0, ai: 0, lean: 0, head: 0, crouch: 0, bob: 0, step: 0, wup: 0, walk: 0, lying: 0, lift: 0,
    sink: 0, patch: 0, tph: 0, drag: 0, poof: 0, mkx: 0, mky: 0, jit: 0, gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, bx: 0, dq: 0, dqk: 0, st: 0,
    beard: 0, sway: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const KEY = keyer([['hx', -32, 31], ['hy', -64, 31], ['ai', -40, 40], ['lean', -1, 2], ['head', -1, 1], ['sink', 0, 24], ['lift', 0, 6], ['tph', 0, 7], ['drag', 0, 2],
    ['patch', 0, 9], ['poof', 0, 1], ['mkx', -8, 8], ['mky', -24, 0], ['jit', 0, 1], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['bx', -4, 4], ['dqk', 0, 48], ['st', 0, 8], ['beard', -2, 2], ['sway', -2, 2]]);
  const K = (hx, hy, a, lean, head) => ({ hx, hy, a, lean: lean || 0, head: head || 0 });
  const K_IDLE = K(2, -10, -1.75);                        // 反握：拳在腰前，刀身横着伸向身后
  const K_COCK = K(-2, -8, -2.0, 1);                      // 拔刀式：拳收到后腰
  const K_SWIPE = K(7, -14, -1.45, 1, 1);                 // 拔刀式：拳往前上一扫，刀身横拖在后
  const K_RAISE = K(3, -16, PI, -1, -1);                  // 攻击预兆：拳举过肩，刀尖朝下
  const K_STAB = K(7, -9, 2.4, 2, 1);                     // 反手下刺：刀尖朝前下
  const K_STAB2 = K(7, -8, 2.4, 2, 1);
  const K_HURT = K(2, -9, -2.6, -1, -1);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const MIMIC = [K_COCK, K_COCK, K_COCK, K_SWIPE, K_SWIPE, null];   // 慢半拍的拔刀式：第 3 帧卡顿错位
  const T_STAB = 2 / 12, T_HIT = 2 / 12, T_POOF = INCOMING + 0.15, T_LAND = INCOMING + 0.66, LUNGE = 8;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.sink = 0; P.patch = 0; P.poof = 0; P.mkx = 0; P.mky = 0; P.jit = 0; P.lift = BASE_LIFT; P.drag = 0;
    P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.dq = 0; P.flip = 0; P.mx = 0; P.beard = 0; P.sway = 0; P.bob = 0; P.tph = 0;
    const idle = () => {                                          // 漂浮起伏 2 帧、烟尾翻卷；个性：模仿本体的拔刀式，慢半拍、中途卡一帧
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1 ? -1 : 0; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      P.tph = Math.floor(TT * 5 + 1e-6) & 7;
      const lp = tq % DUR[IDLE], i = Math.floor((lp - 1.25) * 12 + 1e-6);
      if (i >= 0 && i < MIMIC.length) { if (MIMIC[i]) setK(MIMIC[i], MIMIC[i], 0); else setK(K_SWIPE, K_IDLE, 0.5); P.jit = i === 2 ? 1 : 0; P.gem = i >= 3 && i <= 4 ? 1 : 0; P.beard = i >= 3 ? -1 : 1; P.bob = 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                      // 漂浮：不落地，上下飘 1 格，烟尾向后拖
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); P.bob = [0, -1, -1, 0][f]; P.tph = f * 2; P.lean = 1; P.drag = 1 + (f & 1); P.beard = -1; P.sway = [-1, -2, -1, 0][f];
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                  // 举拳 → 闪到目标面前反手下刺 → 飘回
      P.tph = f12 & 7;
      if (tq < T_STAB) { setK(K_IDLE, K_RAISE, ease.out(clamp01(tq / 0.12))); P.gem = 1; P.beard = 1; }
      else if (tq < 0.45) { setK(K_STAB, K_STAB2, ease.out(clamp01((tq - T_STAB) / 0.2))); P.mx = LUNGE; P.gem = tq < 0.3 ? 2 : 1; P.rim = 2; P.drag = 2; P.beard = -2; P.sway = -2; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_STAB2, K_IDLE, q); P.mx = RD(LUNGE * (1 - q)); P.drag = 1; P.beard = -1; }
    } else if (st === CHARGE) {                                  // 先落到地面，身体从下往上一行行沉进影子，只剩面具浮在影子上
      setK(K_IDLE, K_IDLE, 0); P.tph = f12 & 7;
      const q = clamp01((tq - 0.15) / 0.75); P.lift = tq < 0.1 ? 1 : 0; P.sink = RD(22 * q); P.patch = tq < 0.1 ? 0 : 4 + RD(3 * q);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.beard = 1;
    } else if (st === CAST) {                                    // 影子贴地滑到目标背后 → 跃出反手下刺
      P.tph = f12 & 7; P.gem = 3; P.rim = 3;
      if (f12 < 2) { setK(K_IDLE, K_IDLE, 0); P.lift = 0; P.sink = 22; P.patch = 7; P.mx = f12 === 0 ? 13 : 26; }
      else { setK(K_STAB, K_STAB2, ease.out(clamp01((tq - T_HIT) / 0.2))); P.mx = BEHIND; P.flip = 1; P.lift = tq < 0.25 ? 4 : 3; P.flash = f12 === 2 ? 1 : 0; P.drag = 2; P.beard = -2; P.sway = -2; }
    } else if (st === RECOVER) {                                 // 再沉进影子滑回原位、浮出来
      setK(K_STAB2, K_IDLE, 1); P.tph = f12 & 7; P.gem = tq < 0.35 ? 2 : 1; P.rim = tq < 0.35 ? 2 : 1;
      if (tq < 0.2) { P.mx = BEHIND; P.flip = 1; P.lift = 0; P.sink = RD(22 * tq / 0.2); P.patch = 6; setK(K_STAB2, K_IDLE, tq / 0.2); }
      else if (tq < 0.45) { P.mx = RD(BEHIND * (1 - (tq - 0.2) / 0.25)); P.flip = 1; P.lift = 0; P.sink = 22; P.patch = 7; }
      else { const q = clamp01((tq - 0.45) / 0.2); P.lift = q >= 1 ? BASE_LIFT : 0; P.sink = RD(22 * (1 - q)); P.patch = q >= 1 ? 0 : 6; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.beard = 2; P.sway = 2; P.tph = 4; P.drag = 0; P.lift = 3; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.rim = 0; P.beard = 1; P.sway = 1; P.tph = 5; }
      else { setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15))); P.tph = 6; }
    } else if (st === DEATH) {                                   // 噗散：剪影炸成一团烟，只有面具掉下来，弹一下，化灰
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < T_POOF - INCOMING) { setK(K_HURT, K_HURT, 0); P.bx = -2 + (f12 & 1); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.jit = f12 & 1; P.beard = 2; P.sway = 2; P.tph = f12 & 7; }
      else {
        P.poof = 1; P.lift = 0; P.gem = 4; const q = clamp01((d - 0.15) / 0.36);
        P.mkx = -RD(3 * q); P.mky = d < 0.66 ? -RD(18 * (1 - ease.in(q))) : d < 0.75 ? -2 : d < 0.83 ? -1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob + P.sink; P.a = RD(P.a / ASTEP) * ASTEP; P.ai = RD(P.a / ASTEP);
    P.lean = RD(P.lean); P.head = RD(P.head); P.hy = Math.min(P.hy, 31);
    if (P.poof) { P.gx = P.mkx + 1; P.gy = P.mky - 3; }
    else { RIG.leg = 6 - P.sink; const R = parts.rig(P, RIG); P.gx = R.hx1 + P.bx; P.gy = Math.min(R.ey, -3) - P.lift; }
    P.dqk = RD(P.dq * 48); KEY(P);
  }

  // ───── 画 ─────
  // 候选部件：foxHood 狐耳头——墨色头形（后脑多 1 格），顶上两只尖耳（后耳后倾、前耳竖直，底宽 2 → 1），给面具打底。o = { mat }。一个部件
  function foxHood(R, m) {
    const T = R, x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy;
    E.part();
    for (let y = top; y <= bot; y++) { let a = x0 - 1, b = x1; if (y === top) { a++; b--; } if (y === bot) a++; parts.run(E, T, y, a, b, m, 0); }
    parts.run(E, T, top - 1, x0 - 1, x0, m, 0); parts.px(E, T, x0 - 2, top - 2, m, 4); parts.px(E, T, x0 - 1, top - 2, m, 0);      // 后耳
    parts.run(E, T, top - 1, x1 - 1, x1, m, 0); parts.px(E, T, x1, top - 2, m, 0); parts.px(E, T, x1, top - 3, m, 4);              // 前耳
  }
  // 候选部件：foxMask 狐面具——灰白面具盖住脸的前 3 列（额到下巴），前面一截 2 格狐吻，两道眼缝（相隔 1 格，发光材质），颊上一道暗纹。
  //   (x, y) = 面具最前一列 / 眼睛那一行；T 落笔变换（掉在地上用 parts.FREE）。o = { mat, eye }。读 P.eyes P.gem。一个部件
  function foxMask(T, x, y, o, dead) {
    const px = (a, b, m, t) => parts.px(E, T, a, b, m, t), m = o.mat;
    E.part();
    parts.run(E, T, y - 2, x - 1, x, m, 0); for (let r = y - 1; r <= y + 2; r++) parts.run(E, T, r, x - 2, x, m, 0); parts.run(E, T, y + 3, x - 1, x, m, 0);
    px(x + 1, y + 1, m, 0); px(x + 2, y + 1, m, 3); px(x + 1, y + 2, m, 2);                                                          // 狐吻
    px(x - 2, y + 2, m, 2); px(x - 1, y - 2, m, 4);                                                                                  // 颊纹、额顶高光
    if (dead || P.eyes) { px(x - 2, y, m, 1); px(x, y, m, 1); }
    else { const t = P.gem >= 1 ? 4 : 3; px(x - 2, y, o.eye, t); px(x, y, o.eye, t); if (P.gem >= 2) px(x + 1, y, o.eye, 3); }
  }
  // 候选部件：smokeTail 烟尾——胯下两截短大腿（远侧暗一级），往下化成一缕越来越往后偏的烟，末端沿下沿往后拖 L 格、最后 3 格分成上下两叉；
  //   边缘按相位翻卷。读 P.tph（相位）P.drag（后拖量 0–2）
  function smokeTail(R) {
    const T = R, ph = P.tph * PI / 4, top = R.yHip + 1, px = (x, y, m, t) => parts.px(E, T, x, y, m, t);
    E.part(); parts.run(E, T, top, R.hipBx - 1, R.hipBx, M.bodyD, 0); parts.run(E, T, top + 1, R.hipBx - 1, R.hipBx, M.bodyD, 0);
    E.part(); parts.run(E, T, top, R.hipFx - 1, R.hipFx + 1, M.body, 0); parts.run(E, T, top + 1, R.hipFx - 1, R.hipFx, M.body, 0);
    E.part();
    const y0 = top + 2, n = Math.max(1, -y0);
    for (let y = y0; y <= 0; y++) { const q = (y - y0) / n, cx = RD(-q * (3 + P.drag) + Math.sin(ph + y * 0.9) * 0.7), hw = q < 0.5 ? 2 : 1; parts.run(E, T, y, cx - hw, cx + hw - (q > 0.6 ? 1 : 0), M.smoke, 0); if (((y + P.tph) & 1) === 0) px(cx, y, M.smoke, 2); }
    const L = 7 + P.drag, x0 = RD(-3 - P.drag);
    for (let k = 0; k < L; k++) {
      const x = x0 - k, yy = RD(Math.sin(ph + k * 0.8) * 0.7) - 1;
      if (k >= L - 3) { px(x, yy - 1 - (k - L + 3), M.smoke, 2); px(x, yy + 1, M.smoke, 0); }          // 末端分叉
      else { px(x, yy, M.smoke, k > L * 0.5 ? 2 : 0); if (k < 3) px(x, yy - 1, M.smoke, 0); }
    }
  }
  function drawPatch(w) {                                        // 地面影子：两行，上行各收 2 格
    if (!w) return; const T = parts.FREE; E.part();
    parts.run(E, T, 0, -w, w, M.patch, 0); parts.run(E, T, -1, -w + 2, w - 2, M.patch, 0);
    for (let x = -w + 2 + (P.tph % 3); x < w - 1; x += 3) parts.px(E, T, x, -1, M.patch, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    if (P.poof) { foxMask(parts.FREE, P.mkx + 2, P.mky - 3, { mat: M.mask, eye: M.eye }, 1); return; }
    RIG.leg = 6 - P.sink; const R = parts.rig(P, RIG), shown = P.sink < 20;
    if (shown) {
      parts.scarf(E, R, P, { mat: M.bodyD, layer: 'tail', len: -4 });
      smokeTail(R);
      parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.bodyD, hand: M.bodyD, grip: 'fist' });
      parts.torso(E, R, P, { style: 'leather', mat: M.body, belt: M.bodyD, hem: R.yHip + 1 });
      foxHood(R, M.body);
    }
    drawPatch(P.patch);
    foxMask(R, R.hx1 + 1, Math.min(R.ey, -3), { mat: M.mask, eye: M.eye });   // 沉下去时面具停在影子上
    if (shown) {
      parts.sword(E, R, P, SW);
      parts.arm(E, R, P, { sleeve: 'tight', mat: M.body, hand: M.body, grip: 'fist' });
    }
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.jit) { const o = hero.out, w = hero.w; for (let y = hero.oy - 20; y < hero.oy - 14; y++) { for (let x = w - 1; x > 0; x--) o[y * w + x] = o[y * w + x - 1]; o[y * w] = 255; } }   // 卡顿：上半身错位 1 格
  }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let ghostT = 9, bandT = 9, bandDir = 1, smokeAcc = 0, sinkAcc = 0, ashAcc = 0;
  function onEnter(s) {
    if (s !== CAST) return;                                      // 原地留 1 帧残影 → 影子贴地滑走
    poseAt(CHARGE, 1.3, 1.3); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = hero.k2 = -1; poseAt(CAST, 0, 0);
    ghostT = 0; bandT = 0; bandDir = 1;
    for (let i = 0; i < 14; i++) spawn(K_TRAIL, HX + 4 + i * 2.5, HY - 1 - Math.random() * 2, 50 + Math.random() * 40, 0, 0.2 + Math.random() * 0.15, R_EL);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && Math.abs(t - T_STAB) < 1e-9) {           // 反手下刺：刀尖一道短光 + 命中火花
      const x = DUMMY_X - 4, y = HY - 10;
      fx.beam(HX + LUNGE + 7, HY - BASE_LIFT - 9, x, y, 1, R_EL, 0.15, 2); fx.cross(x, y, 3, R_EL, 0.15);
      burst(x, y, 8, 30, 80, 0.15, 0.3, R_EL, 6); burst(x, y, 4, 20, 60, 0.1, 0.25, FXI.impact, 6);
      for (let i = 0; i < 6; i++) spawn(K_TRAIL, HX + i * 1.5, HY - 8 - Math.random() * 12, 30, 0, 0.18, R_EL);
      hitDummy(0, 1); sfx('swing', { kind: 'thrust', w: 0.15 }); sfx('hit', { mat: 'flesh', w: 0.15 });
    }
    if (s === CAST && Math.abs(t - T_HIT) < 1e-9) {              // 从目标背后跃出反手下刺
      const x = DUMMY_X + 3, y = HY - 14;
      fx.cross(x, y, 6, R_EL, 0.25); fx.beam(x + 5, y - 5, x - 2, y + 2, 1, R_EL, 0.15, 2);
      burst(x, y, 14, 40, 110, 0.25, 0.55, R_EL, 10); fx.cloud(x + 2, y + 2, 6, R_EL, 0.5, 2);
      hitDummy(1, -1); shake(0.12, 1); sfx('swing', { kind: 'thrust', w: 0.15 }); sfx('impact', { pal: 'shadow', w: 0.15 });
    }
    if (s === RECOVER && Math.abs(t - 0.2) < 1e-9) { bandT = 0; bandDir = -1; }
    if (s === DEATH && Math.abs(t - T_POOF) < 1e-9) {            //「噗」：整个剪影炸成一团墨青烟
      const x = scrX(-1), y = HY - BASE_LIFT - 11;
      fx.cloud(x, y, 10, R_EL, 0.9, 2); burst(x, y, 22, 20, 80, 0.3, 0.7, R_EL, 10); flash(0.04);
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {            // 面具落地
      for (let i = 0; i < 5; i++) spawn(K_DUST, scrX(-3 + Math.random() * 6), HY - 1, (Math.random() - 0.5) * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);
      sfx('fall', { w: 0.1 });
    }
  }
  const EVENTS = [[], [], [T_STAB], [], [T_HIT], [0.2], [], [T_POOF, T_LAND], []];
  function stepFX(dt, state, stT) {
    const tailX = scrX(-11 - P.drag), tailY = HY - P.lift - 1;
    if ((state === MOVE || state === IDLE) && !P.poof) { smokeAcc += dt * (state === MOVE ? 10 : 3); while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_DUST, tailX + Math.random() * 6, tailY + Math.random() * 2, (P.flip ? 1 : -1) * (4 + Math.random() * 8), -2 - Math.random() * 4, 0.4 + Math.random() * 0.3, R_EL, { age0: 0.35 }); } }
    if (state === CHARGE && P.sink > 0 && P.sink < 22) { sinkAcc += dt * 20; while (sinkAcc >= 1) { sinkAcc -= 1; spawnX(K_DUST, scrX(-5 + Math.random() * 10), HY - 2 - Math.random() * (22 - P.sink), (Math.random() - 0.5) * 6, 10 + Math.random() * 10, 0.35, R_EL, { age0: 0.3 }); } }
    if ((state === CAST && P.sink >= 20) || (state === RECOVER && P.sink >= 20 && P.mx > 0 && P.mx < BEHIND)) { sinkAcc += dt * 40; while (sinkAcc >= 1) { sinkAcc -= 1; spawn(K_TRAIL, scrX(-6 + Math.random() * 4), HY - 1 - Math.random() * 3, (state === CAST ? -1 : 1) * (20 + Math.random() * 20), 0, 0.25, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { ashAcc += dt * 16; while (ashAcc >= 1) { ashAcc -= 1; spawn(K_RISE, scrX(-4 + Math.random() * 7), HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -8 - Math.random() * 10, 0.7 + Math.random() * 0.6, FXI.dust); } }
    ghostT += dt; bandT += dt;
  }
  function fxReset() { ghostT = 9; bandT = 9; smokeAcc = 0; sinkAcc = 0; ashAcc = 0; }
  function fxBack(f12) {
    if (P.dq < 1 && !P.poof && P.lift > 0) groundShadow(scrX(0), 5, P.lift);
    if (bandT < 0.3) {                                           // 地面暗带：从起点到目标背后（收招时反过来），后半段断续褪去
      const x0 = HX + 2, x1 = HX + BEHIND - 2, fade = bandT > 0.15;
      for (let x = x0; x <= x1; x++) { if (fade && ((x + f12) & 1)) continue; put(x, FLOOR, ((x + f12) % 5) === 0 ? EL[2] : 0); }
    }
  }
  function fxMid() { if (ghostT < 1 / 12 + 1e-6) blitShape(ghost, HX, HY, 0, EL[3], 0); }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.poof && !P.eyes) {   // 青眼缝的星芒
      const x = scrX(P.gx), y = HY + P.gy, L = P.gem === 3 ? 4 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(x + r, y, c); put(x - r, y, c); put(x, y - r, c); }
    }
  }

  return {
    name: '影剑士分身', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.edge], HIT_POINT: [1, -14], EVENTS,
    SFX: { body: 'ghost', how: 'dissolve', pal: 'shadow', style: 'shadow', w: 0.15, hover: 1 },
    REVIVE: { dy: -14, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
