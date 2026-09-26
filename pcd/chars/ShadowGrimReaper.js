// 暗影死神（部队 · 虚空 · 刺客 · 史诗）：维京海盗进化而来——没有腿，腰以下是往后拖的烟雾下摆，离地 2 格飘着；墨黑褴褛斗篷（内衬还是海盗的褪色墨蓝），
// 兜帽外歪戴着帽檐破成锯齿的三角帽，眼罩下一只发紫光的鬼火独眼；左臂的铁钩长成一把巨大的镰刀，镰刃弯过头顶。
// 攻击 = 劈：残影一闪瞬移到目标面前，镰刀过头下劈。
// 技能 = 特性「不屈之魂」生效：化影成半透明暗色剪影，敌弹从正面射来直接穿过残影 → 本体在一旁现身闪白，残影碎成魂光螺旋吸回身体，
//        轮廓光 3 档、镰柄上多点亮一簇鬼火（成长标记）→ 随手一记十字斩打在假人上 → 镰刀转回肩上，鬼火保持亮着。
PCD.define('ShadowGrimReaper', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, B8, hash, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_TRAIL,
    spawn, spawnX, burst, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：暗影紫（FXI.shadow），成长时点缀魂光 soul ─────
  const R_EL = FXI.shadow, EL = FXR[R_EL], R_SOUL = FXI.soul, R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    cloak: { r: [0, 52, 8, 9], band: 2 },                       // 墨黑褴褛斗篷
    sleeve: [0, 52, 8, 9], lining: [0, 39, 40, 59],             // 内衬：海盗外套的褪色墨蓝
    smoke: [0, 52, 53, 54],                                     // 烟雾下摆（暗影紫）
    face: { r: [0, 0, 52, 52], flat: 0 }, bone: 'bone', hat: [0, 20, 20, 19], strap: [0, 20, 19, 19], ink: { r: 'ink', flat: 1 },
    shaft: 'iron', blade: 'steel',
    edge: { r: [25, 42, 24, 43], flat: 1 },                     // 镰刃紫光（发光体，和刃同一部件）
    eye: { r: [25, 24, 43, 21], flat: 1 },                      // 鬼火独眼
    fire: { r: [25, 24, 43, 21], flat: 1 },                     // 镰柄上的鬼火（成长标记）
  });
  const BODY = { body: 'tall', leg: 12, torso: 10, head: 6, headW: 6, sw: 3, arm: 11, limb: 0.9, fall: 'back' };
  const HX = 70, DUR = DEFAULT_DUR.slice(), BASE_LIFT = 2;
  const hero = new Sprite(84, 60, 36, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 14], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['shaft', 'blade', 'edge', 'eye', 'fire', 'bone', 'ink', 'hat', 'strap']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手握镰柄（hx hy a = 镰柄方向），后手握在柄下 5 格 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, tph: 0, shade: 0, jit: 0, pile: 0, flame: 1,
    st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -17, -0.25);                             // 镰柄竖在身前、微微后倾，镰刃从头顶弯到身前
  const K_RAISE = K(1, -24, -0.6, -1, -1);                     // 镰刀举过头顶
  const K_CHOP = K(1, -23, HALF, 1, 1);                        // 下劈：镰柄横平，刃垂下来砍在目标头顶
  const K_FOLLOW = K(3, -19, 2.2, 1, 1);                       // 劈到底
  const K_SHADE = K(3, -18, -0.1, -1, -1);                     // 化影：身体后仰，镰刀竖起
  const K_FLICK = K(6, -18, 1.2, 1, 1);                        // 随手一记十字斩
  const K_HURT = K(3, -16, -0.5, -1, -1);
  const TWIRL = [-0.25, 0.55, 1.35, 2.15, 2.9, 2.9, 2.15, 1.35, 0.55];   // 待机个性：镰刀在手里慢慢转半圈再转回
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', -2, 1], ['tph', 0, 7], ['shade', 0, 1], ['jit', 0, 1], ['pile', 0, 2], ['flame', 1, 2]]);
  const KEY2 = parts.keyer([['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lift', 0, 7], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const T_CHOP = 2 / 12, T_SLASH = 0.25, T_LAND = INCOMING + 0.66, BLINK = 12, SIDE = -8;
  const SHOTS = [0.62, 0.9, 1.16];                               // 蓄力时来袭的敌弹（穿过残影）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = BASE_LIFT;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.tph = 0; P.shade = 0; P.jit = 0; P.pile = 0; P.flame = 1;
    const idle = () => {                                               // 悬浮起伏 2 帧、烟雾翻卷、鬼火一明一灭；个性：镰刀转半圈
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1 ? -1 : 0; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      P.tph = Math.floor(TT * 5 + 1e-6) & 7; P.gem = (Math.floor(TT * 3 + 1e-6) % 3) === 0 ? 1 : 0; P.glint = (f12 >> 2) & 1;
      const lp = tq % DUR[IDLE]; if (lp >= 1.35 && lp < 1.35 + TWIRL.length / 12) { const i = Math.floor((lp - 1.35) * 12 + 1e-6); P.a = TWIRL[i]; P.hy -= Math.min(4, i < 5 ? i : 8 - i); P.gem = 2; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 贴地滑行：身体前倾平移，下摆往后拖出一串暗影烟
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); P.lean = 1; P.bob = [0, -1, -1, 0][f]; P.tph = f * 2; P.sway = -2; P.beard = -1; P.a = -0.4; P.hx = 7;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                        // 举镰 → 残影一闪瞬移到目标面前 → 过头下劈 → 飘回
      if (tq < T_CHOP) { setK(K_IDLE, K_RAISE, ease.out(clamp01(tq / 0.12))); P.beard = 1; P.gem = 1; }
      else if (tq < 0.45) { const q = ease.out(clamp01((tq - T_CHOP) / 0.2)); setK(K_CHOP, K_FOLLOW, q); P.mx = BLINK; P.beard = -2; P.sway = -2; P.gem = tq < 0.3 ? 3 : 2; P.rim = 2; P.flash = tq < T_CHOP + 1 / 12 ? 1 : 0; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_FOLLOW, K_IDLE, q); P.mx = RD(BLINK * (1 - q)); P.sway = -1; P.gem = 1; }
      P.tph = f12 & 7;
    } else if (st === CHARGE) {                                        // 化影：身体变成半透明暗色剪影，抖动
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_SHADE, q); P.tph = f12 & 7; P.beard = -1;
      P.shade = tq >= 0.3 ? 1 : 0; P.jit = P.shade ? f12 & 1 : 0; P.bx = P.shade && (f12 % 3) === 0 ? 1 : 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = P.shade ? 0 : 2;
    } else if (st === CAST) {                                          // 本体在一旁现身、闪白；魂光吸回；多一簇鬼火
      setK(K_SHADE, tq < T_SLASH - 0.05 ? K_SHADE : K_FLICK, tq < T_SLASH - 0.05 ? 0 : ease.out(clamp01((tq - T_SLASH + 0.05) / 0.1))); P.mx = SIDE;
      P.flash = tq < 1 / 12 ? 1 : 0; P.gem = 3; P.rim = 3; P.flame = 2; P.tph = f12 & 7; P.beard = -2; P.glint = f12 & 1;
    } else if (st === RECOVER) {                                       // 镰刀转回肩上，鬼火保持亮着，飘回原位
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_FLICK, K_IDLE, q); P.mx = RD(SIDE * (1 - q)); P.flame = 2; P.tph = f12 & 7;
      P.gem = q < 0.35 ? 3 : q < 0.75 ? 2 : 1; P.rim = q < 0.5 ? 2 : 1; P.glint = f12 & 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.tph = 4; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.hatX = -1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 失去浮力 → 斗篷像空了一样塌成一堆布，镰刀插在地上，独眼熄灭，布堆化烟
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 0; P.tph = f12 & 7; }
      else if (d < 0.5) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.lift = d < 0.4 ? 1 : 0; P.crouch = d < 0.4 ? 2 : 3; P.gem = (f12 & 1) ? 1 : 4; P.tph = f12 & 7; P.hy += 3; }
      else {
        setK(K_HURT, K_HURT, 0); P.bx = -2; P.lift = 0; P.lying = 1; P.pile = d < 0.58 ? 1 : 2;
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy) + P.bob + Math.min(3, RD(P.crouch)); P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    P.bhx = RD(P.hx - Math.sin(P.a) * 5); P.bhy = RD(P.hy + Math.cos(P.a) * 5);
    if (P.pile) { P.gx = -3 + P.bx; P.gy = P.pile === 1 ? -9 : -5; }   // 发光体 = 独眼（塌成布堆后在布堆里）
    else { const R = parts.rig(P, BODY); P.gx = R.hx1 - 1 + P.bx; P.gy = R.ey - P.lift; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画 ─────
  // 候选部件：scythe 镰刀——直柄（吸附直线）+ 90° 一档换朝向的镰刃（柄顶往「前」伸出、弯下来成钩尖；朝上时刃口在下沿，吃发光档）；
  //   柄上 flame 簇鬼火（成长标记）。o = { at [x, y] 握点, a 柄方向（0 朝上）, len, back, T 落笔变换 }。读 P.gem（刃光）P.glint（鬼火闪）。两个部件：柄 → 刃
  const BLADE = [                                                   // 朝上时的刃（u 向前、v 向下；S 刃背、M 刃身、E 刃口）
    [0, -1, 'S'], [1, -1, 'S'], [2, -1, 'S'], [3, -1, 'S'], [4, -1, 'S'],
    [-1, 0, 'S'], [0, 0, 'M'], [1, 0, 'M'], [2, 0, 'M'], [3, 0, 'M'], [4, 0, 'M'], [5, 0, 'S'], [6, 0, 'S'], [7, 0, 'S'],
    [2, 1, 'E'], [3, 1, 'E'], [4, 1, 'M'], [5, 1, 'M'], [6, 1, 'M'], [7, 1, 'M'], [8, 1, 'S'], [9, 1, 'S'],
    [6, 2, 'E'], [7, 2, 'E'], [8, 2, 'M'], [9, 2, 'M'], [10, 2, 'S'],
    [9, 3, 'E'], [10, 3, 'M'], [11, 3, 'S'], [11, 4, 'E'], [12, 5, 'E'],
  ];
  function scythe(T, gx, gy, a, o) {
    o = o || {}; const len = o.len || 17, back = o.back || 7, dx = Math.sin(a), dy = -Math.cos(a), tx = RD(gx + dx * len), ty = RD(gy + dy * len), q = ((RD(a / HALF) % 4) + 4) % 4;
    E.part(); parts.line(E, T, gx - dx * back, gy - dy * back, tx, ty, M.shaft, 3); parts.px(E, T, gx - dx * back, gy - dy * back, M.bone, 4);   // 柄 + 骨质柄尾
    for (let k = 0; k < (o.dead ? 0 : P.flame); k++) {                                // 鬼火：柄上一簇（第二簇 = 成长标记）
      const d = 11 - k * 4, fx0 = RD(gx + dx * d), fy0 = RD(gy + dy * d), up = (P.glint + k) & 1;
      parts.px(E, T, fx0 + 1, fy0, M.fire, 3); parts.px(E, T, fx0 + 1, fy0 - 1, M.fire, up ? 4 : 3); parts.px(E, T, fx0 + 1 - up, fy0 - 2, M.fire, 2);
    }
    E.part(); const lv = o.dead ? 4 : P.gem;
    for (const [u, v, r] of BLADE) {
      let X, Y; if (q === 0) { X = u; Y = v; } else if (q === 1) { X = -v; Y = u; } else if (q === 2) { X = -u; Y = -v; } else { X = v; Y = -u; }
      const m = r === 'E' && lv < 4 ? (lv >= 3 || (lv >= 1 && ((u + v) & 1)) ? M.edge : M.blade) : M.blade, t = r === 'S' ? 4 : r === 'E' ? (m === M.edge ? (lv >= 3 ? 4 : 3) : 2) : 3;
      parts.px(E, T, tx + X, ty + Y, m, t);
    }
    return [tx, ty];
  }
  // 候选部件：smokeHem 烟雾下摆——从斗篷下摆往下、往后拖的烟雾：逐行变窄、越往下越往后偏，边缘按相位缺格、内部隔点翻卷，末端拖成两缕烟尾。读 P.tph（翻卷相位）P.sway（后拖量）
  function smoke(R, top) {
    E.part(); const ph = P.tph * Math.PI / 4, drag = -Math.min(0, P.sway), e = parts.edges(R, R.yHip), n = Math.max(1, -top);
    for (let y = top; y <= 0; y++) {
      const q = (y - top) / n, wob = Math.sin(ph + y * 0.8);
      const L = RD(e[0] - 1 - q * (3 + drag * 1.5) + wob * 0.8 * q), Rr = RD(e[1] + 1 - q * (5 + drag) + Math.sin(ph + y * 1.1) * 0.8);
      for (let x = L; x <= Rr; x++) {
        const edge = x === L || x === Rr; if (edge && q > 0.3 && hash(x * 3 + P.tph, y) < 0.35) continue; if (!edge && q > 0.55 && hash(x + P.tph * 5, y * 7) < (q - 0.5) * 0.7) continue;   // 下半截透空成一缕缕
        parts.px(E, R, x, y, M.smoke, !edge && ((x + y + P.tph) % 4) === 0 ? 2 : 0);
      }
    }
    for (let j = 0; j < 2; j++) {                                       // 两缕烟尾：贴着下沿往后拖
      const L = 4 + j * 2 + drag * 2, y0 = -1 - j * 2;
      for (let k = 0; k < L; k++) { const x = RD(e[0] - 3 - k - drag * 1.5), y = RD(y0 + Math.sin(ph + k * 0.9 + j) * 0.8); if (k > L - 2 && (P.tph + k) & 1) continue; parts.px(E, R, x, y, M.smoke, k > L * 0.6 ? 2 : 0); }
    }
  }
  // 眼罩 + 鬼火独眼 + 下颌骨（和脸同一部件）
  function face(R, h) {
    const px = (a, b, m, t) => parts.px(E, R, a, b, m, t);
    px(h.x1, h.ey - 1, M.strap, 1); px(h.x1 - 1, h.ey - 1, M.strap, 1); parts.line(E, R, h.x1 - 2, h.ey - 1, h.x0 + 1, h.top, M.strap, 2);   // 眼罩推到了眉上
    if (!P.eyes && P.gem < 4) { px(h.x1, h.ey, M.eye, P.gem >= 2 ? 4 : 3); px(h.x1 - 1, h.ey, M.eye, P.gem >= 1 ? 3 : 2); }
    px(h.x1, h.ey + 2, M.bone, 4); px(h.x1 - 1, h.ey + 2, M.bone, 3); px(h.x1, h.ey + 3, M.bone, 2);                     // 颌骨、牙
  }
  function tatter(T, cx, cy) { for (const [u, v] of [[-4, -1], [-2, 0], [2, 0], [4, -1], [5, -2]]) parts.px(E, T, cx + u, cy + v, 0, 0); }   // 帽檐破成锯齿
  // 候选部件：clothHeap 空斗篷塌成的布堆——墨黑斗篷一堆（破边、内衬翻出一角墨蓝），三角帽压在顶上，一只骨手伸出来；pile 1 半塌 / 2 摊平
  function heap(pile) {
    const T = parts.FREE, w = pile === 1 ? 7 : 9, h = pile === 1 ? 9 : 5;
    E.part();
    for (let y = -h; y <= 0; y++) { const q = (y + h) / h, hw = RD(w * Math.sqrt(Math.max(0.15, q)) * (pile === 1 ? 0.9 : 1)); for (let x = -3 - hw; x <= -3 + hw; x++) { if (y === 0 && ((x & 3) === 0)) continue; parts.px(E, T, x, y, M.cloak, 0); } }
    for (let x = -3 - RD(w * 0.5); x <= -3 + RD(w * 0.3); x += 3) parts.px(E, T, x, -RD(h * 0.5), M.cloak, 2);
    for (let x = 0; x <= 3; x++) parts.px(E, T, x - 1 + RD(w * 0.3), -1, M.lining, x === 0 ? 4 : 0);                    // 翻出来的内衬
    if (P.gem === 1) { const ey = pile === 1 ? -9 : -5; parts.px(E, T, -3, ey, M.eye, 4); parts.px(E, T, -4, ey, M.eye, 3); }               // 布堆里独眼还闪一下
    E.part(); parts.px(E, T, 4 + RD(w * 0.5), -1, M.bone, 4); parts.px(E, T, 5 + RD(w * 0.5), -1, M.bone, 3); parts.px(E, T, 6 + RD(w * 0.5), -2, M.bone, 3);
    parts.hat(E, { hw: 6, hh: 6 }, P, { style: 'tricorn', mat: M.hat, band: M.hat, at: [-5, -h - 1] }); tatter(T, -5, -h - 1);
  }

  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    if (P.pile) {                                                       // 塌成布堆，镰刀插在地上
      scythe(parts.FREE, 11, -8, -0.15, { back: 7, dead: 1 });
      heap(P.pile); return;
    }
    const R = parts.rig(P, BODY), hem = R.yHip + 2;
    parts.cape(E, R, P, { style: 'tattered', mat: M.cloakD, len: R.yHip + 5, flare: 5 });
    smoke(R, hem - 1);
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, cuff: M.liningD, grip: 'none' });
    parts.torso(E, R, P, { style: 'robe', mat: M.cloak, trim: M.lining, collar: M.lining, hem, flare: 2 });
    parts.hood(E, R, P, { style: 'hood', mat: M.cloak, layer: 'back' });
    const h = parts.head(E, R, P, { mat: M.face, eye: 0, nose: 'none', mouth: 'none', ear: 'none' }); face(R, h);
    parts.hood(E, R, P, { style: 'hood', mat: M.cloak, layer: 'front' });
    const hr = { hx: R.hx + P.hatX, htop: R.htop - 1 };                // 歪戴的三角帽（兜帽外面，往后歪 1 格）
    parts.hat(E, Object.assign({}, R, { hx: hr.hx - 1, htop: hr.htop, hx0: R.hx0 - 1 + P.hatX, hx1: R.hx1 - 1 + P.hatX }), P, { style: 'tricorn', mat: M.hat, band: M.hat });
    tatter(R, hr.hx - 1, hr.htop - 1);
    scythe(R, P.hx, P.hy, P.a);
    parts.hand(E, R, P, { side: 'B', hand: M.bone });
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, cuff: M.lining, hand: M.bone, grip: 'fist' });
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (P.shade) {                                                      // 化影：半透明暗色剪影（隔点透空、抖动换相位），独眼照样亮
      const o = hero.out, w = hero.w, hh = hero.h, emp = (x, y) => x < 0 || y < 0 || x >= w || y >= hh || o[y * w + x] === 255;
      for (let y = 0; y < hh; y++) for (let x = 0; x < w; x++) { const i = y * w + x, c = o[i]; if (c === 255 || c === 43 || c === 24) continue; if (B8[((y + P.jit) & 7) * 8 + ((x + P.jit * 3) & 7)] < 0.38) { o[i] = 255; continue; } o[i] = emp(x - 1, y) || emp(x + 1, y) || emp(x, y - 1) ? EL[1] : EL[3]; }
    }
  }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let ghostT = 9, ghostX = 0, ghostMode = 0, trailAcc = 0, soulAcc = 0, emberAcc = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function snapGhost(st, t) { poseAt(st, t, t); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = hero.k2 = -1; }
  function onEnter(s) {
    if (s !== CAST) return;
    snapGhost(CHARGE, 1.3); poseAt(CAST, 0, 0);                        // 被敌弹穿过的残影留在原地
    ghostT = 0; ghostX = HX; ghostMode = 2;
    const bx = HX + SIDE + 1, by = HY - 20;
    for (let i = 0; i < 30; i++) { const a = (Math.random() - 0.5) * 1.6, r = 8 + Math.random() * 10; spawn(K_SPIRAL_PT, bx, by, r / (0.35 + Math.random() * 0.25), 0, 9, i & 1 ? R_SOUL : R_EL, a, r, (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 3)); }   // 魂光螺旋吸回身体
    burst(HX + 1, HY - 18, 18, 30, 90, 0.2, 0.45, R_SOUL, 8);          // 残影碎成魂光
    ring(bx, by, 1, R_EL); fx.cross(bx + 2, HY - 26, 6, R_SOUL, 0.3);   // 暗紫冲击环；镰柄上新点亮的鬼火
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_CHOP) {                                // 残影一闪 → 瞬移下劈
      snapGhost(ATTACK, 0.12); poseAt(ATTACK, t, t); ghostT = 0; ghostX = HX; ghostMode = 1;
      const cx = HX + BLINK + K_CHOP.hx, cy = HY - BASE_LIFT + K_CHOP.hy;
      fx.slash(cx, cy, 17, -0.7, HALF + 0.3, R_EL, 0.2, 2, 2);
      const hx = DUMMY_X + 1, hy = HY - 24; fx.cross(hx, hy, 5, R_EL, 0.2); burst(hx, hy, 14, 40, 110, 0.15, 0.4, R_EL, 10); burst(hx, hy, 6, 30, 70, 0.1, 0.25, R_IMP, 8);
      for (let i = 0; i < 8; i++) spawn(K_TRAIL, HX + 2 + i * 1.5, HY - 12 - Math.random() * 14, 20 + Math.random() * 20, 0, 0.2 + Math.random() * 0.15, R_EL);   // 瞬移拖出的暗影线
      hitDummy(1, 1); sfx('swing', { kind: 'slash', w: 0.5 }); sfx('hit', { mat: 'flesh', w: 0.5 });
    }
    if (s === CHARGE) for (const t0 of SHOTS) {                        // 敌弹从正面射来，穿过残影
      if (Math.abs(t - t0) < 1e-9) shoot(3, 140, HY - 14 - (t0 > 1 ? 8 : t0 > 0.8 ? 0 : 4), -300, HX - 34, FXI.enemy);
      if (Math.abs(t - t0 - 0.22) < 1e-9) { const y = HY - 14 - (t0 > 1 ? 8 : t0 > 0.8 ? 0 : 4); burst(HX + 1, y, 6, 15, 40, 0.2, 0.4, R_EL, 0); for (let i = 0; i < 4; i++) spawn(K_TRAIL, HX - 2 - i * 2, y, -20, 0, 0.25, R_EL); }
    }
    if (s === CAST && Math.abs(t - T_SLASH) < 1e-9) {                  // 随手一记十字斩打在假人上
      const x = DUMMY_X, y = HY - 17;
      fx.beam(x - 7, y - 8, x + 7, y + 8, 1, R_EL, 0.3, 2); fx.beam(x - 7, y + 8, x + 7, y - 8, 1, R_EL, 0.3, 2); fx.cross(x, y, 6, R_EL, 0.25);
      burst(x, y, 28, 50, 130, 0.25, 0.6, R_EL, 14); ring(x, y, 0, R_EL); hitDummy(1, 1); shake(0.12, 1);
      sfx('swing', { kind: 'slash', w: 0.3 }); sfx('impact', { pal: 'shadow', w: 0.7 });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {                  // 布堆落地、镰刀插进地里
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 14 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      burst(wx(11), HY - 1, 6, 20, 50, 0.2, 0.4, FXI.dust, 12); shake(0.1, 1); sfx('fall', { w: 0.3 }); sfx('hit', { mat: 'metal', w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_CHOP], SHOTS.concat(SHOTS.map((v) => v + 0.22)).filter((v) => v < 1.4), [T_SLASH], [], [], [T_LAND], []];
  function hurtFx(s) { const hx = HX + 1, hy = HY - 20; burst(hx, hy, s === DEATH ? 16 : 10, 50, 120, 0.25, 0.5, R_IMP, 16); burst(hx, hy, s === DEATH ? 14 : 8, 20, 70, 0.3, 0.6, R_EL, 6); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true; }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === MOVE) { trailAcc += dt * 26; while (trailAcc >= 1) { trailAcc -= 1; spawnX(K_DUST, wx(-6 - Math.random() * 4), HY - 3 - Math.random() * 6, (P.flip ? 1 : -1) * (10 + Math.random() * 14), -2 - Math.random() * 4, 0.35 + Math.random() * 0.3, R_EL, { age0: 0.3 }); } }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 3 : 8); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(-2 + Math.random() * 6), HY - 3 - Math.random() * 3, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.5 + Math.random() * 0.5, R_EL); } }
    if (state === CHARGE && stT < 1.3) { trailAcc += dt * 14; while (trailAcc >= 1) { trailAcc -= 1; spawnX(K_DUST, wx(-6 + Math.random() * 12), HY - 4 - Math.random() * 26, (Math.random() - 0.5) * 8, -6 - Math.random() * 6, 0.5 + Math.random() * 0.3, R_EL, { age0: 0.35 }); } }
    if (state === DEATH && stT > INCOMING + 0.8 && stT < INCOMING + 2.4) { soulAcc += dt * (stT > INCOMING + 1.6 ? 34 : 10); while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 18, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.8, Math.random() < 0.7 ? R_EL : R_SOUL); } }
    ghostT += dt;
  }
  function fxReset() { ghostT = 9; ghostMode = 0; trailAcc = 0; soulAcc = 0; emberAcc = 0; }
  function fxBack(f12) {
    if (P.dq < 1 && !P.pile) groundShadow(wx(0), 6, P.lift);
    if (P.dq < 1 && !P.pile && !P.shade) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
  }
  function fxMid() {
    if (ghostMode === 1 && ghostT < 0.25) blitShape(ghost, ghostX, HY, 0, ghostT < 1 / 12 ? EL[1] : EL[3], clamp01(ghostT / 0.25));      // 瞬移残影
    if (ghostMode === 2 && ghostT < 0.3) blitShape(ghost, ghostX, HY, 0, ghostT < 2 / 12 ? EL[2] : EL[3], clamp01((ghostT - 0.08) / 0.22));   // 被穿过的残影碎掉
  }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.shade && !P.pile) {   // 独眼星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 4 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '暗影死神', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.eye, M.edge, M.fire], HIT_POINT: [2, -20], EVENTS,
    SFX: { body: 'ghost', how: 'collapse', pal: 'shadow', style: 'shadow', w: 0.4, hover: 1 },
    REVIVE: { dy: -18, ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
