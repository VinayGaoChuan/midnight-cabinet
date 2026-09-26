// 卫队长（部队 · 人类 · 先锋 · 史诗）：英武档的军官——开面盔顶一道前后向的紫色马鬃冠羽、前手一面带 10 格法力刻度的紫晶方盾「神盾」、
// 后手单手长剑（剑身中线一道紫色血槽）、腰间剑鞘、及膝紫色短披风、钢甲 + 紫罩袍 + 金边。升级成「奥法元帅」（同一个人：冠羽盔、紫罩袍、金边、紫晶法力方盾都保留）。
// 攻击 = 盾挡身前、单手斜劈；技能 = 特性「神盾」+「强大」生效：挨打和出手把盾心 10 格法力刻度一格格充满 → 长剑附上紫光 → 一剑劈下，带出小范围紫色冲击。
// 待机个性 = 持剑行礼；步态 = 阅兵正步；死亡 = 跪亡不倒（拄剑单膝跪地，刻度逐格熄灭，保持跪姿消散）。设定卡：pcd/batch-02/GuardCommander/design.md
PCD.define('GuardCommander', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, keyer,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, CL = (v, a, b) => (v < a ? a : v > b ? b : v), px = parts.px, run = parts.run;

  // ───── 元素：奥法 · 神盾紫（白 → 淡紫 → 紫罗兰 → 暗紫 → 墨紫），只用共享色板里已有的颜色 ─────
  const R_EL = fxRamp('aegis', [21, 43, 24, 42, 52]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    plate: 'steel', cloth: { r: 'purple', band: 2 }, crest: 'purple', face: 'purple', gold: 'gold', belt: 'leather', skin: 'skin', hair: 'wood',
    iron: 'iron', ink: { r: 'ink', flat: 1 }, aegis: { r: [25, 24, 43, 21], flat: 1 }, edge: [27, 29, 30, 31], grip: 'leather', sheath: 'shadow',
  });
  const BODY = { body: 'heroic', leg: 10, torso: 10, head: 6, sw: 5, limb: 1.2, lift: 3 };   // 英武档：挺胸直立，抬膝高（正步）
  const R0 = parts.rig({}, BODY);
  const SWORD = { style: 'long', hand: 'B', metal: M.plate, edge: M.edge, trim: M.gold, wood: M.grip, len: 10, w: 3, guard: 5 };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(52, 46, 22, 42);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'ink', 'hair', 'aegis', 'grip', 'edge']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 候选部件用的武器几何（和 parts.sword 同一套吸附：16 个方向、握把原点、步数）─────
  const DIRS = [[0, -1], [1, -2], [1, -1], [2, -1], [1, 0], [2, 1], [1, 1], [1, 2], [0, 1], [-1, 2], [-1, 1], [-2, 1], [-1, 0], [-2, -1], [-1, -1], [-1, -2]];
  const MAJ = DIRS.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1])) / Math.hypot(d[0], d[1]));
  function bladeGeo(gx, gy, a, len) { const di = parts.snapDir(a); return { di, x0: DIRS[di][0] < 0 ? gx - 1 : gx, y0: DIRS[di][1] < 0 ? gy - 1 : gy, n: Math.max(2, RD(len * MAJ[di])), vert: Math.abs(DIRS[di][1]) >= Math.abs(DIRS[di][0]) }; }
  const bladeCell = (G, k) => parts.cell(G.di, G.x0, G.y0, k);

  // ───── 候选部件：crestHelm 冠羽盔 ─────
  // 开面（护颊 + 护颈，露出眼鼻嘴）或闭面罩（一道眼缝），盔顶一道前后向的马鬃冠羽（前端前伸、尾部垂到后颈 / 后背，会摆、会被气流吹起），可选金翼饰。
  // o = { mat 盔, trim 盔箍 / 护颊包边, crest 冠羽材质, open 1 开面 | 0 闭面罩, eye 眼缝发光材质（闭面罩）,
  //       top 冠羽上半 [[dy, x0, x1]…]（dy 相对头顶行，x 相对头中线）, tail 冠羽尾各行（逐行摆幅加大）, wing 金翼饰材质 + wingPx [[x, y, tone]…] }
  // 读 P：beard（尾摆，正 = 往前甩）blow（0–2 被气流吹得向后飘起）eyes（眼缝熄灭）gem（眼缝亮度）。三个部件：盔 → 冠羽 → 翼饰
  function crestHelm(E, R, P, o) {
    const T = R, m = o.mat, tr = o.trim, h0 = R.hx0, h1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, X = R.hx, b = P.beard || 0, bl = P.blow || 0;
    E.part();
    run(E, T, top - 2, h0 + 1, h1 - 1, m, 0); run(E, T, top - 1, h0, h1, m, 0); px(E, T, h0 + 1, top - 2, m, 4);
    run(E, T, top - 3, X - 1, X + 1, tr, 0);                                                              // 冠座（金）
    run(E, T, top, h0 - 1, h1 + 1, tr, 0); px(E, T, h0 - 1, top, tr, 4);                                  // 盔箍（前沿多伸 1 格成眉檐）
    for (let y = top + 1; y < bot; y++) run(E, T, y, h0 - 1, h0, m, 0);                                   // 护颈
    run(E, T, bot, h0 - 2, h0, m, 0); px(E, T, h0 - 2, bot, tr, 3);
    if (o.open) { for (let y = top + 1; y < bot; y++) { px(E, T, h0 + 1, y, m, 0); px(E, T, h0 + 2, y, tr, y === top + 1 ? 4 : 3); } px(E, T, h0 + 1, bot, m, 2); }   // 护颊 + 金包边
    else {
      for (let y = top + 1; y <= bot; y++) run(E, T, y, h0 + 1, y <= ey + 2 ? h1 + 1 : h1, m, 0);             // 面罩
      run(E, T, ey, h0 + 3, h1 + 1, m, 1);                                                                   // 眼缝
      if (o.eye) { const g = P.gem || 0; px(E, T, h1 - 1, ey, o.eye, P.eyes ? 1 : g >= 2 ? 4 : 3); px(E, T, h1, ey, o.eye, P.eyes ? 1 : g >= 1 ? 4 : 3); }
      for (let y = ey + 1; y < bot; y++) px(E, T, h1, y, tr, 3);                                            // 面罩中脊金线
      px(E, T, h1 - 2, ey + 2, m, 1); px(E, T, h1 - 2, ey + 4, m, 1);                                        // 呼吸孔
    }
    E.part(); const c = o.crest;
    const n0 = o.top.length;
    o.top.forEach(([dy, a, z], i) => {
      const y = top + dy; run(E, T, y, X + a, X + z, c, 0);
      if (i > 0 && i < n0 - 1) for (let x = X + a + 1; x < X + z - 1; x += 2) px(E, T, x, y, c, 2);             // 马鬃竖纹
    });
    o.tail.forEach(([dy, a, z], i) => {
      const k = i + 1, sx = RD(b * k * 0.35) - RD(bl * k * 0.5), y = top + dy - RD(bl * k * 0.4);
      run(E, T, y, X + a + sx, X + z + sx, c, 0); if (i === o.tail.length - 1) px(E, T, X + a + sx, y, c, 2);
    });
    if (o.wing) { E.part(); for (const [x, y, t] of o.wingPx) px(E, T, X + x, top + y, o.wing, t); }
  }
  const HELM = { mat: M.plate, trim: M.gold, crest: M.crest, open: 1,
    top: [[-6, -3, 2], [-5, -6, 4], [-4, -7, 5], [-3, 4, 5]],                                      // 横向的一道冠：前端垂到 +5（盔前沿 +3 之外 2 格）
    tail: [[-3, -8, -3], [-2, -8, -4], [-1, -8, -5], [0, -7, -5], [1, -7, -6], [2, -7, -6], [3, -6, -6]] };   // 后拖到 −7 / −8（盔后沿 −3 之外 4 格），垂到后颈

  // ───── 候选部件：manaShield 法力方盾 ─────
  // 骑士盾形（上平下尖）+ 金边框 + 盾顶两角外伸的金包角 + 盾心晶石（5 档）+ 一圈法力刻度（亮几格由 P.mana 决定，满格闪烁）。
  // o = { face 盾面, rim 金边, gem 晶石（flat 发光材质）, rows 各行半宽（从上到下）, ring 刻度相对晶石的坐标（顺时针）, gemY 晶石相对盾心的行,
  //       ringMat 刻度只当金饰, at [x, y] 盾心（默认前手 + (1, 1)）, rot 转 90°, hw 自转（最大半宽 = 正面 · 更小 = 斜看 · 0 = 侧面一条线 · 负 = 背面）, clip 这一行以下不画, glowLv }
  // 读 P：mana（亮几格）blink（满格闪烁相位）gem（晶石档）glint。一个部件。返回 { center, gem }（精灵本地坐标）
  const GEM_T = [[3, 2], [4, 2], [4, 3], [4, 4], [2, 1]];
  function manaShield(E, R, P, o) {
    const cx = RD(o.at ? o.at[0] : P.hx + 1), cy = RD(o.at ? o.at[1] : P.hy + 1), T = { r0: (o.rot || 0) & 3, tx: R.tx + cx, ty: R.ty + cy, rot: R.rot, ox: R.ox, oy: R.oy };
    const W0 = o.rows, n = W0.length, mid = Math.floor(n / 2), full = W0[0], hw = o.hw == null ? full : o.hw, sc = Math.abs(hw) / full, back = hw < 0;
    const W = W0.map((w) => RD(w * sc)), clip = o.clip != null ? o.clip - cy : 99, gy = o.gemY || 0;
    E.part();
    for (let r = 0; r < n; r++) {
      const v = r - mid; if (v > clip) continue; const w = W[r];
      for (let u = -w; u <= w; u++) {
        const rim = r === 0 || r === n - 1 || Math.abs(u) === w || Math.abs(u) > (W[r + 1] != null ? W[r + 1] : -1) || Math.abs(u) > (W[r - 1] != null ? W[r - 1] : -1);
        px(E, T, u, v, rim ? o.rim : o.face, rim ? 0 : back ? 2 : 0);
      }
    }
    if (sc > 0.99) { px(E, T, -full - 1, -mid, o.rim, 0); px(E, T, full + 1, -mid, o.rim, 0); px(E, T, -full - 1, -mid - 1, o.rim, 4); px(E, T, full + 1, -mid - 1, o.rim, 3); }   // 外伸的金包角
    let gem = null;
    if (!back && sc > 0.3) {
      const G = GEM_T[CL(o.glowLv != null ? o.glowLv : P.gem || 0, 0, 4)];
      px(E, T, 0, gy, o.gem, G[0]); px(E, T, 0, gy - 1, o.gem, G[1]); px(E, T, 0, gy + 1, o.gem, G[1]);
      if (sc > 0.6) { px(E, T, -1, gy, o.gem, G[1]); px(E, T, 1, gy, o.gem, G[1]); }
      if (sc > 0.99) {
        const lit = o.ringMat ? 0 : P.mana || 0;
        o.ring.forEach(([du, dv], i) => {
          if (o.ringMat) px(E, T, du, gy + dv, o.ringMat, (i & 1) ? 3 : 4);
          else if (i < lit) px(E, T, du, gy + dv, o.gem, lit >= 10 ? (P.blink ? 4 : 3) : i === lit - 1 ? 4 : 3);
          else px(E, T, du, gy + dv, o.face, 1);
        });
        px(E, T, -full + 1, -mid + 1, o.face, 4); px(E, T, -full + 1, -mid + 2, o.face, 4);             // 盾面冷光
      }
      gem = parts.toSprite(T, 0, gy);
    }
    if (P.glint && sc > 0.99) px(E, T, -full, -mid, o.rim, 4);
    return { center: parts.toSprite(T, 0, 0), gem };
  }
  const GEM_Y = -1;
  const SHIELD = { face: M.face, rim: M.gold, gem: M.aegis, gemY: GEM_Y, rows: [4, 4, 4, 4, 4, 4, 4, 3, 3, 2, 1],
    ring: [[1, -2], [2, -1], [2, 0], [2, 1], [1, 2], [-1, 2], [-2, 1], [-2, 0], [-2, -1], [-1, -2]] };   // 10 格法力刻度，从右上顺时针
  const KNEEL_SHIELD = [4, -5];                                                                         // 跪亡：盾靠在膝前

  // ───── 候选部件：scabbard 腰间剑鞘（从远侧腰带往身后下方斜挂：金鞘口、鞘身、包金鞘尖）─────
  function scabbard(R) {
    E.part(); const e = parts.edges(R, R.yWaist), x0 = e[0] + 2, y0 = R.yWaist + 1;
    parts.bar(9, x0 + 1, y0, 0, 6, 2, (k, j, X, Y) => px(E, R, X, Y, k <= 1 || k === 6 ? M.gold : M.sheath, k === 6 ? 2 : j === 0 ? 4 : 0));
  }

  // ───── 姿势：前手持盾（hx hy），后手持剑（bhx bhy ba）；arm 0 = 后臂和剑都在身后 · 1 = 袖在身后、手和剑在身前 · 2 = 后臂整条在身前 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, ba: 0, bai: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, mana: 0, blink: 0, sg: 0, sgl: 4, arm: 1, sh: 0, blow: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const KEY = keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['bai', -32, 32], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['mana', 0, 10], ['blink', 0, 1],
    ['sg', 0, 3], ['sgl', 0, 4], ['arm', 0, 2], ['sh', 0, 1], ['blow', 0, 2], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['dqi', 0, 48], ['st', 0, 8]]);
  const K = (hx, hy, bhx, bhy, ba, lean, head, crouch) => ({ hx, hy, bhx, bhy, ba, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(7, -13, 2, -13, 2.68);                        // 盾挡身前，剑尖斜垂在身前（不碰地）
  const K_SALUTE = K(7, -13, 5, -21, 0);                         // 骑士礼：剑竖在面前，剑柄贴唇
  const K_WIND0 = K(6, -14, -1, -21, -0.3);                      // 预兆第 1 帧：剑提到肩旁
  const K_WIND = K(6, -14, -3, -24, -0.79, -1);                  // 预兆第 2 帧：剑从肩后举起
  const K_STRIKE = K(8, -14, 9, -19, 2.03, 1, 1);                // 斜劈落到假人肩上
  const K_HOLD = K(8, -13, 8, -15, 2.36, 1);
  const K_GUARD = K(8, -16, 1, -14, 2.68, 0, 0, 1);              // 蓄力：举盾护身、微蹲
  const K_THRUST = K(11, -15, 1, -14, 2.68, 1);                  // 施放：盾往前一顶
  const K_DRAW = K(10, -15, 3, -25, 0.46, 0, -1);                // 长剑从盾后抽出高举，附上紫光
  const K_HURT = K(5, -14, 0, -14, 2.9, -1, -1);
  const K_STAG = K(5, -13, 1, -13, 2.9, -1, -1, 1);              // 踉跄
  const K_KNEEL = K(11, -13, 11, -11, Math.PI, 1, 0, 4);         // 单膝跪地、双手拄剑（跪姿再下沉 3 格）
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const CREST_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_STRIKE = 2 / 12, T_SHOT1 = 0.2, T_SHOT2 = 0.65, T_HIT1 = 0.45, T_HIT2 = 0.9, T_DRAW = 2 / 12, T_SLASH = 3 / 12, T_KNEE = INCOMING + 0.5;
  const near = (tq, t0) => tq >= t0 - 1e-6 && tq < t0 + 1 / 12 - 1e-6;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.mana = 0; P.blink = 0; P.sg = 0; P.sgl = 4; P.arm = 1; P.sh = 0;
    P.blow = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = CREST_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const fi = RD((tq % DUR[IDLE]) * 12);                        // 待机个性：持剑行礼（举起 → 剑柄贴唇 → 放回），行礼时盾心刻度亮一格再暗下去
      if (fi === 17 || fi === 22) { setK(K_IDLE, K_SALUTE, 0.5); P.arm = 2; }
      else if (fi >= 18 && fi <= 21) { setK(K_SALUTE, K_SALUTE, 0); P.arm = 2; P.mana = fi === 19 || fi === 20 ? 1 : 0; P.glint = fi === 19 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                          // 阅兵正步：抬膝高、落脚干脆，盾和剑贴身不晃，披风随步一扬一落
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.bend = (f & 1) ? 2 : 1;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                      // 单手斜劈：盾不离身
      if (tq < T_STRIKE - 1e-6) { if (tq < 1 / 12 - 1e-6) setK(K_WIND0, K_WIND0, 0); else setK(K_WIND, K_WIND, 0); P.arm = 0; P.beard = 1; P.sway = 1; }
      else if (tq < T_STRIKE + 1 / 12 - 1e-6) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 3; P.arm = 2; P.beard = -2; P.sway = -1; P.bend = 3; P.sg = 1; P.glint = 1; }
      else if (tq < 0.45) { setK(K_STRIKE, K_HOLD, ease.out(clamp01((tq - 0.25) / 0.2))); P.bx = 3; P.arm = 2; P.beard = -1; P.bend = 2; P.mana = tq < 0.34 ? 1 : 0; }   // 攻击回蓝：亮一格
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); P.arm = q < 0.5 ? 2 : 1; }
    } else if (st === CHARGE) {                                      // 举盾护身：挨打和汇聚把 10 格刻度一格格充满
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_GUARD, q);
      P.mana = Math.min(10, Math.floor(tq * 6.2 + 1e-6) + (tq >= T_HIT1 ? 1 : 0) + (tq >= T_HIT2 ? 1 : 0)); P.blink = f12 & 1;
      P.gem = tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = tq < 0.35 ? 1 : 2; P.blow = tq < 0.4 ? 0 : tq < 0.8 ? 1 : 2; P.bend = 2 + (f12 & 1); P.beard = -1; P.sway = (f12 & 1) ? -1 : 0;
      if (near(tq, T_HIT1) || near(tq, T_HIT2)) { P.hx -= 1; P.bx = -1; P.eyes = 1; P.gem = 3; }       // 敌弹打在盾上：盾往回一顿
    } else if (st === CAST) {
      P.mana = 10; P.blink = f12 & 1; P.gem = 3; P.rim = 3; P.blow = 1; P.bend = 3; P.beard = -2; P.sway = -1;
      if (tq < T_DRAW - 1e-6) { setK(K_GUARD, K_THRUST, tq < 1 / 12 - 1e-6 ? 0.6 : 1); }
      else if (tq < T_SLASH - 1e-6) { setK(K_DRAW, K_DRAW, 0); P.arm = 2; P.sg = 3; P.glint = 1; }
      else { setK(K_STRIKE, K_HOLD, tq < T_SLASH + 1 / 12 - 1e-6 ? 0 : ease.out(clamp01((tq - T_SLASH - 1 / 12) / 0.17))); P.bx = 3; P.arm = 2; P.sg = 2; P.gem = 2; P.rim = 2; }
    } else if (st === RECOVER) {                                     // 退回原位；剑身紫光从剑尖往剑柄褪去；刻度保持满格闪烁
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); P.arm = q < 0.5 ? 2 : 1;
      P.mana = 10; P.blink = (f12 >> 1) & 1; P.sgl = Math.max(0, 4 - Math.floor(tq * 9 + 1e-6)); P.sg = P.sgl ? 2 : 0;
      P.gem = q < 0.4 ? 2 : 1; P.rim = q < 0.5 ? 2 : 1; P.blow = q < 0.3 ? 1 : 0; P.beard = -RD(1 - q); P.bend = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; P.mana = 1; P.blink = 1; }   // 被攻击也回蓝：一格闪亮
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.mana = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 跪亡不倒：踉跄 → 单膝跪地、长剑插地双手拄剑、盾靠膝前 → 低头 → 刻度逐格熄灭 → 紫晶闪 3 下熄灭 → 保持跪姿消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) {
        setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 0;
        if (d >= 0.15) { setK(K_STAG, K_STAG, 0); P.step = -1; P.flash = 0; }
      } else if (d < 0.5) {
        const two = d >= 0.4; setK(K_STAG, K_KNEEL, two ? 1 : 0.5); P.crouch = two ? 4 : 3; P.bx = -2; P.arm = 2; P.sh = two ? 1 : 0; P.mana = 10; P.gem = 2; P.beard = 1; P.rim = 1;
      } else {
        setK(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.arm = 2; P.sh = 1; const k = d - 0.5;
        P.head = k >= 0.4 ? 1 : 0; P.eyes = k >= 0.4 ? 1 : 0; P.beard = k < 0.4 ? 1 : k < 0.8 ? 2 : 3;                 // 头慢慢垂下，冠羽跟着垂落
        P.mana = k < 0.1 ? 10 : Math.max(0, 10 - Math.floor((k - 0.1) / 0.08 + 1e-6));                               // 刻度从 10 格逐格熄灭
        const fl = Math.floor((k - 0.9) * 12 + 1e-6); P.gem = P.mana > 0 ? 2 : fl < 6 ? ((fl & 1) ? 4 : 3) : 4;          // 紫晶闪 3 下后熄灭
        P.rim = P.mana > 0 ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.arm = 1;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else { P.glint = 1; P.gem = 2; }
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.bai = RD(P.ba / ASTEP); P.ba = P.bai * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 48);
    const c = P.sh ? KNEEL_SHIELD : [P.hx + 1, P.hy + 1]; P.gx = c[0] + P.bx; P.gy = c[1] + GEM_Y;   // 发光体 = 盾心紫晶
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function groove(G) {                                              // 剑身中线紫色血槽：平时暗紫；附魔时从剑柄往剑尖亮（sgl 四分之几），sg 2 刃身两侧也附紫光，sg 3 整条闪白
    const lit = P.sg ? 2 + (G.n - 2) * P.sgl / 4 : 0;
    for (let k = 2; k <= G.n; k++) {
      const c = bladeCell(G, k), on = P.sg > 0 && k <= lit + 1e-6;
      px(E, RIG, c[0], c[1], on ? M.aegis : M.cloth, on ? (P.sg >= 2 ? 4 : 3) : 2);
      if (on && P.sg >= 2) for (const o of [-1, 1]) px(E, RIG, G.vert ? c[0] + o : c[0], G.vert ? c[1] : c[1] + o, M.aegis, P.sg === 3 ? 4 : 3);
    }
  }
  let RIG = null;
  function sword() { parts.sword(E, RIG, P, SWORD); groove(bladeGeo(P.bhx, P.bhy, P.ba, SWORD.len)); }
  const backArm = () => parts.arm(E, RIG, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, grip: 'none' });
  const backHand = () => parts.hand(E, RIG, P, { side: 'B', hand: M.plate, grip: 'fist' });
  function tabardTrim(R, tor) {                                     // 罩袍下摆的金边（和躯干同一个部件）
    const LL = tor.rows[0], RR = tor.rows[1], i = tor.hem - tor.y0, mid = RD((LL[i] + RR[i]) / 2), y = Math.min(0, tor.hem + 1), s = RD((P.sway || 0) * 0.5);
    for (let x = mid - 1; x <= Math.min(RR[i], mid + 2); x++) px(E, R, x + s, y, M.gold, x === mid - 1 ? 4 : 3);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = RIG = parts.rig(P, BODY);
    parts.cape(E, R, P, { mat: M.cloth, trim: M.gold, len: -5, flare: 3 });                  // 及膝紫披风，金边，下摆在身后外扬
    scabbard(R);
    if (P.arm === 0) { backArm(); sword(); backHand(); } else if (P.arm === 1) backArm();
    parts.legs(E, R, P, { style: 'greave', mat: M.plate, matD: M.plateD, boot: M.iron, bootD: M.ironD });
    const tor = parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.cloth, belt: M.belt, buckle: M.gold });
    tabardTrim(R, tor);
    parts.head(E, R, P, { mat: M.skin, face: 'square', eye: M.ink, nose: 'small', mouth: 'line', ear: 'none' });
    parts.beard(E, R, P, { style: 'mustache', mat: M.hair });                                   // 军官八字胡（并进脸）
    crestHelm(E, R, P, HELM);
    if (P.arm === 2) backArm();
    if (P.arm >= 1) { sword(); backHand(); }
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, pauldron: M.plate, trim: M.gold, cuff: M.gold, hand: M.plate, grip: P.sh ? 'fist' : 'none' });
    manaShield(E, R, P, P.sh ? Object.assign({ at: KNEEL_SHIELD, clip: 0 }, SHIELD) : SHIELD);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let ripT = 9, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, lastMana = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const tickAt = (i) => { const r = SHIELD.ring[CL(i, 0, 9)]; return [wx(P.gx + r[0]), wy(P.gy + r[1])]; };
  function onEnter(s) {
    if (s !== CAST) return;                                          // 盾往前一顶：盾心投出紫色六角盾印 + 冲击环 + 星芒
    const gx = wx(K_THRUST.hx + 1), gy = wy(K_THRUST.hy + 1 + GEM_Y);
    releaseOrbit(40, 90, 0.3, 0.6); fx.circle(gx + 7, gy + 1, 3, 7, R_EL, 0.45, 2, 2); ring(gx + 3, gy, 1, R_EL); fx.cross(gx, gy, 5, R_EL, 0.3);
    burst(gx + 4, gy, 20, 50, 120, 0.25, 0.6, R_EL, 8); shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    const at = (v) => Math.abs(t - v) < 1e-9;
    if (s === ATTACK && at(T_STRIKE)) {                               // 紫白拖影弧 + 命中火花；攻击回蓝：盾心一格亮起
      fx.slash(wx(2 + P.bx), wy(-19), 14, -0.3, 2.3, R_EL, 0.17, 2, 2);
      hitDummy(0); burst(DUMMY_X - 4, HY - 17, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(DUMMY_X - 4, HY - 17, 4, R_EL, 0.2);
      const tk = tickAt(0); spawn(K_EMBER, tk[0], tk[1], 0, -10, 0.4, R_EL);
      sfx('swing', { kind: 'slash', w: 0.5 }); sfx('hit', { mat: 'flesh', w: 0.5 });
    }
    if (s === CHARGE && (at(T_SHOT1) || at(T_SHOT2))) { const tx = wx(P.gx + 5), y = wy(P.gy + (at(T_SHOT1) ? -2 : 1)); shoot(0, tx + 75, y, -300, tx, FXI.enemy, 0, { glow: 1 }); }   // 两发敌弹打在盾上
    if (s === CAST && at(T_DRAW)) { const G = bladeGeo(P.bhx, P.bhy, P.ba, SWORD.len), c = bladeCell(G, G.n + 1); fx.cross(wx(c[0] + P.bx), wy(c[1]), 5, R_EL, 0.2); burst(wx(c[0] + P.bx), wy(c[1]), 10, 30, 70, 0.2, 0.4, R_EL, 6); }
    if (s === CAST && at(T_SLASH)) {                                  // 附魔斜劈：紫色斩击弧 + 假人脚下小半径紫色冲击环 + 附近地上两点紫光
      fx.slash(wx(2 + P.bx), wy(-19), 15, -0.4, 2.4, R_EL, 0.22, 3, 2);
      ring(DUMMY_X, HY - 3, 0, R_EL);
      for (const d of [-13, 13]) { fx.cross(DUMMY_X + d, HY - 1, 3, R_EL, 0.3); burst(DUMMY_X + d, HY - 2, 5, 20, 50, 0.2, 0.4, R_EL, 8); }
      burst(DUMMY_X - 2, HY - 16, 22, 50, 130, 0.25, 0.6, R_EL, 12); fx.cross(DUMMY_X - 3, HY - 16, 6, R_EL, 0.25);
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'arcane', w: 0.7 });
    }
    if (s === DEATH && at(T_KNEE)) { for (let i = 0; i < 10; i++) spawn(K_DUST, wx(-4 + Math.random() * 14), HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.6 }); }
  }
  const EVENTS = [[], [], [T_STRIKE], [T_SHOT1, T_SHOT2], [T_DRAW, T_SLASH], [], [], [T_KNEE], []];
  function impactOn(k, x, y) {                                       // 敌弹打在盾上：盾面起一圈紫色涟漪，火花偏开
    if (k !== 0) return;
    ripT = 0; burst(x, y, 8, 30, 80, 0.12, 0.3, FXI.enemy, 6); burst(x - 2, y, 6, 20, 60, 0.2, 0.4, R_EL, 4); sfx('hit', { mat: 'metal', w: 0.35 });
  }
  function hurtFx(s) {                                               // 板甲受击：更多白金火花 + 几颗长寿命火星
    const hx = HX + HIT_POINT[0] - 1, hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 26 : 20, 60, 150, 0.2, 0.5, R_IMP, 20);
    for (let i = 0; i < 3; i++) spawn(K_BURST, hx, hy, 30 + Math.random() * 50, -40 - Math.random() * 50, 0.6 + Math.random() * 0.3, FXI.steel);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) { chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    if (state === RECOVER && P.sg) {                                  // 剑身余光往上飘
      emberAcc += dt * 12; while (emberAcc >= 1) { emberAcc -= 1; const G = bladeGeo(P.bhx, P.bhy, P.ba, SWORD.len), c = bladeCell(G, 2 + Math.floor(Math.random() * (G.n - 1) * P.sgl / 4)); spawn(K_EMBER, wx(c[0] + P.bx), wy(c[1]), Math.random() * 8 - 4, -8 - Math.random() * 8, 0.4 + Math.random() * 0.3, R_EL); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.6 }); for (let i = 0; i < 2; i++) spawn(K_DUST, wx(6) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); } lastStep = P.step; }
    if (P.mana < lastMana && (state === DEATH || state === IDLE || state === ATTACK || state === HURT)) { const tk = tickAt(P.mana); spawn(K_RISE, tk[0], tk[1], (Math.random() - 0.5) * 6, -10 - Math.random() * 8, 0.4 + Math.random() * 0.3, R_EL); }
    lastMana = P.mana;
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 24, HY - 1 - Math.random() * 14, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    ripT += dt;
  }
  function fxReset() { ripT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; lastMana = 0; }
  function fxBack(f12) { floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && P.st >= CHARGE && P.st <= RECOVER) {   // 盾心十字星芒
      const L = P.gem === 3 ? 5 : 3 + (f12 & 1);
      for (let r = 3; r <= L; r++) { const c = r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); }
    }
    if (ripT < 0.25) {                                               // 盾面紫色涟漪
      const c = ripT < 0.08 ? EL[1] : ripT < 0.16 ? EL[2] : EL[3], rx = 5 + ripT * 16, ry = 7 + ripT * 16, n = Math.ceil(ry * 5);
      for (let i = 0; i < n; i++) { if ((i + f12) & 1 && ripT > 0.12) continue; const a = i / n * 6.2832; put(RD(gx + Math.cos(a) * rx), RD(gy + 1 + Math.sin(a) * ry), c); }
    }
  }
  function drawShot(k, x, y, d, f12, R) {                            // 蓄力时打在盾上的敌弹（小弹）
    if (k !== 0) return false;
    put(x, y, R[0]); put(x + d, y, R[0]); put(x - d, y, R[1]); put(x, y - 1, R[1]); put(x, y + 1, R[1]); put(x - 2 * d, y, R[2]); return true;
  }
  const HIT_POINT = [9, -14];

  return {
    name: '卫队长', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.aegis], HIT_POINT, EVENTS,
    SFX: { body: 'armor', how: 'collapse', pal: 'arcane', style: 'spiral', w: 0.7 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
