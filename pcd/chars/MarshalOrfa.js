// 奥法元帅（部队 · 人类 · 战士 · 神话）：卫队长升级后的同一个人，千年之后——同一顶冠羽盔（冠羽加长拖到后背、盔侧加金翼饰、面甲合上只留一道透紫光的眼缝）、
// 同一身钢甲 + 紫罩袍 + 金边（金饰多一倍、胸甲日月纹）、同一面紫晶法力方盾（放大镶金，离手悬浮在身后肩旁，缓慢浮动、偶尔自转）；
// 职业从先锋变成战士：换成比人还长的双手巨剑（10 个紫色符文 = 法力刻度从盾上搬到了剑上），披风成了及地的破边长披风（千年的旧边）。
// 攻击 = 巨剑从身后贴地拉到前上方的大半圆扫；技能 = 特性「最终审判」+「强大」生效：符文逐个点亮、神盾归位成背后的光环 → 头顶化出一把巨大的紫色光剑虚影 →
// 一记大横扫，落点炸开中范围审判冲击波。待机个性 = 拄剑而立；步态 = 阔步（巨剑扛肩）；死亡 = 符文崩散（神盾先坠地，全身裂成紫色碎块，只剩巨剑插在原地）。
// 设定卡：pcd/batch-02/MarshalOrfa/design.md
PCD.define('MarshalOrfa', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, fxRamp, keyer,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST, K_STILL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, CL = (v, a, b) => (v < a ? a : v > b ? b : v), px = parts.px, run = parts.run, HALF = Math.PI / 2, PI = Math.PI;

  // ───── 元素：和卫队长同一色阶 奥法 · 神盾紫；审判冲击波里点缀 impact 金色火花 ─────
  const R_EL = fxRamp('aegis', [21, 43, 24, 42, 52]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质（和卫队长同一套；金更多、披风内衬暗影、不露皮肤）─────
  const M = parts.mats(E, {
    plate: 'steel', cloth: { r: 'purple', band: 2 }, crest: 'purple', face: 'purple', gold: 'gold', belt: 'leather', iron: 'iron', lining: 'shadow',
    aegis: { r: [25, 24, 43, 21], flat: 1 }, edge: [27, 29, 30, 31], grip: 'leather',
  });
  const BODY = { body: 'heroic', leg: 11, torso: 11, head: 7, sw: 6, limb: 1.3, stride: 5 };   // 巨英武档：比卫队长高 4 格、肩更宽，阔步
  const R0 = parts.rig({}, BODY);
  const SWORD = { style: 'great', hand: 'F', metal: M.plate, edge: M.edge, trim: M.gold, wood: M.grip, len: 22, w: 3, guard: 7 };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 72, 34, 67);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 16, 22], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['aegis', 'grip', 'edge']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 武器几何（和 parts.sword 同一套吸附）─────
  const DIRS = [[0, -1], [1, -2], [1, -1], [2, -1], [1, 0], [2, 1], [1, 1], [1, 2], [0, 1], [-1, 2], [-1, 1], [-2, 1], [-1, 0], [-2, -1], [-1, -1], [-1, -2]];
  const MAJ = DIRS.map((d) => Math.max(Math.abs(d[0]), Math.abs(d[1])) / Math.hypot(d[0], d[1]));
  function bladeGeo(gx, gy, a, len) { const di = parts.snapDir(a); return { di, x0: DIRS[di][0] < 0 ? gx - 1 : gx, y0: DIRS[di][1] < 0 ? gy - 1 : gy, n: Math.max(2, RD(len * MAJ[di])), vert: Math.abs(DIRS[di][1]) >= Math.abs(DIRS[di][0]) }; }
  const bladeCell = (G, k) => parts.cell(G.di, G.x0, G.y0, k);
  const runeK = (G, i) => 3 + RD(i * (G.n - 4) / 9);                // 第 i 个符文在剑身第几步（0 = 护手旁）

  // ───── 候选部件：crestHelm 冠羽盔（和卫队长同一个部件；这里用闭面罩 + 金翼饰）─────
  // o = { mat, trim, crest, open, eye, top, tail, wing, wingPx }。读 P：beard blow eyes gem。三个部件：盔 → 冠羽 → 翼饰
  function crestHelm(E, R, P, o) {
    const T = R, m = o.mat, tr = o.trim, h0 = R.hx0, h1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, X = R.hx, b = P.beard || 0, bl = P.blow || 0;
    E.part();
    run(E, T, top - 2, h0 + 1, h1 - 1, m, 0); run(E, T, top - 1, h0, h1, m, 0); px(E, T, h0 + 1, top - 2, m, 4);
    run(E, T, top - 3, X - 1, X + 1, tr, 0);                                                              // 冠座（金）
    run(E, T, top, h0 - 1, h1 + 1, tr, 0); px(E, T, h0 - 1, top, tr, 4);                                  // 盔箍
    for (let y = top + 1; y < bot; y++) run(E, T, y, h0 - 1, h0, m, 0);                                   // 护颈
    run(E, T, bot, h0 - 2, h0, m, 0); px(E, T, h0 - 2, bot, tr, 3);
    if (o.open) { for (let y = top + 1; y < bot; y++) { px(E, T, h0 + 1, y, m, 0); px(E, T, h0 + 2, y, tr, y === top + 1 ? 4 : 3); } px(E, T, h0 + 1, bot, m, 2); }
    else {
      for (let y = top + 1; y <= bot; y++) run(E, T, y, h0 + 1, y <= ey + 2 ? h1 + 1 : h1, m, 0);             // 面罩
      run(E, T, ey, h0 + 3, h1 + 1, m, 1);                                                                   // 眼缝
      if (o.eye) { const g = P.gem || 0; px(E, T, h1 - 1, ey, o.eye, P.eyes ? 1 : g >= 2 ? 4 : 3); px(E, T, h1, ey, o.eye, P.eyes ? 1 : g >= 1 ? 4 : 3); }
      for (let y = ey + 1; y < bot; y++) px(E, T, h1, y, tr, 3);                                            // 面罩中脊金线
      px(E, T, h1 - 2, ey + 2, m, 1); px(E, T, h1 - 2, ey + 4, m, 1);                                        // 呼吸孔
    }
    E.part(); const c = o.crest, n0 = o.top.length;
    o.top.forEach(([dy, a, z], i) => {
      const y = top + dy; run(E, T, y, X + a, X + z, c, 0);
      if (i > 0 && i < n0 - 1) for (let x = X + a + 1; x < X + z - 1; x += 2) px(E, T, x, y, c, 2);             // 马鬃竖纹
    });
    o.tail.forEach(([dy, a, z], i) => {
      const k = i + 1, sx = RD(b * k * 0.3) - RD(bl * k * 0.25), y = top + dy - RD(bl * k * 0.2);
      run(E, T, y, X + a + sx, X + z + sx, c, 0); if (i === o.tail.length - 1) px(E, T, X + a + sx, y, c, 2);
    });
    if (o.wing) { E.part(); for (const [x, y, t] of o.wingPx) px(E, T, X + x, top + y, o.wing, t); }
  }
  const HELM = { mat: M.plate, trim: M.gold, crest: M.crest, open: 0, eye: M.aegis, wing: M.gold,
    top: [[-7, -3, 2], [-6, -6, 4], [-5, -8, 5], [-4, -9, 6], [-3, 5, 6]],                                  // 冠羽高 5 格，前端垂到 +6
    tail: [[-3, -10, -3], [-2, -10, -4], [-1, -10, -5], [0, -9, -5], [1, -9, -5], [2, -9, -6], [3, -9, -6], [4, -8, -6], [5, -8, -6], [6, -8, -7], [7, -7, -7]],   // 一直拖到后背
    wingPx: [[0, 0, 3], [-1, -1, 4], [-2, -2, 4], [-2, -3, 4], [-3, -4, 4],                                   // 金翼饰：三片羽，从盔侧盔箍处往后上方扇开，伸出盔顶 2 格
      [-1, 0, 3], [-2, -1, 3], [-3, -2, 3], [-4, -3, 3],
      [-2, 0, 2], [-3, -1, 2], [-4, -1, 2], [-5, -2, 2]] };

  // ───── 候选部件：manaShield 法力方盾（和卫队长同一个部件；这里放大镶金、刻度圈只当金饰，离手悬浮）─────
  // o = { face, rim, gem, rows, ring, gemY, ringMat, at, rot, hw, clip, glowLv }。读 P：mana blink gem glint。一个部件
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
      if (w === 0 && r > 0 && r < n - 1) px(E, T, 1, v, o.face, 2);                                    // 侧面：盾的厚度
    }
    if (sc > 0.99) { px(E, T, -full - 1, -mid, o.rim, 0); px(E, T, full + 1, -mid, o.rim, 0); px(E, T, -full - 1, -mid - 1, o.rim, 4); px(E, T, full + 1, -mid - 1, o.rim, 3); }
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
        px(E, T, -full + 1, -mid + 1, o.face, 4); px(E, T, -full + 1, -mid + 2, o.face, 4);
      }
      gem = parts.toSprite(T, 0, gy);
    }
    if (P.glint && sc > 0.99) px(E, T, -full, -mid, o.rim, 4);
    return { center: parts.toSprite(T, 0, 0), gem };
  }
  const SHIELD = { face: M.face, rim: M.gold, gem: M.aegis, ringMat: M.gold, gemY: -1, rows: [5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 3, 2, 1],
    ring: [[1, -3], [2, -2], [3, 0], [2, 2], [1, 3], [-1, 3], [-2, 2], [-3, 0], [-2, -2], [-1, -3]] };   // 同一面神盾：放大、镶金（刻度圈成了金饰）
  const SH_X = -21, SH_Y = -27, HALO_X = -5, HALO_Y = -34;                                              // 悬浮在身后肩旁 / 技能里归位成头后的光环
  const SPIN_IDLE = [3, 0, -3, -5, -3, 0, 3], SPIN_ORBIT = [3, 0, -3, -5, -3, 0, 3, 5];

  // ───── 姿势：前手握巨剑（hx hy a），后手按在剑柄上（由剑的几何算出）；sx sy spin sfall = 神盾；solo 1 = 只画剑（死亡后插在原地）· 2 = 只画身体 ─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, runes: 0, roff: 0, rf: 0, blink: 0, arm: 0, sx: 0, sy: 0, spin: 5, sfall: 0, blow: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqi: 0,
    solo: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const KEY = keyer([['hx', -32, 31], ['hy', -64, 15], ['ai', -32, 32], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2],
    ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['runes', 0, 10], ['roff', 0, 10], ['rf', 0, 10], ['blink', 0, 1], ['arm', 0, 1],
    ['sx', -40, 10], ['sy', -50, 5], ['spin', -5, 5], ['sfall', 0, 1], ['blow', 0, 2], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['dqi', 0, 48], ['solo', 0, 2], ['st', 0, 8]]);
  const K = (hx, hy, a, lean, head, crouch) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -17, PI);                                  // 拄剑而立：剑尖插地，双手交叠按在剑首
  const K_IDLE_N = K(8, -17, -PI);                               // 同一姿势（角度从另一侧绕过来时用）
  const K_WIND = K(-2, -12, -2.36, -1, 0, 1);                    // 预兆：剑身后引、贴地
  const K_STRIKE = K(8, -17, HALF, 1, 1);                        // 出手：横在身前，扫过假人
  const K_FOLLOW = K(7, -25, 0.46);                              // 延续：拉到前上方
  const K_CHARGE = K(8, -16, PI, 0, 0, 1);                       // 蓄力：巨剑插地，双手按在剑首
  const K_RAISE = K(4, -30, 0, -1, -1);                          // 施放：拔剑高举
  const K_SWEEP = K(9, -18, HALF, 1, 1);                         // 命中：大横扫
  const K_CARRY = K(5, -17, -1.107);                             // 扛在右肩上（移动、收招）
  const K_HURT = K(6, -16, PI - 0.35, -1, -1);
  const K_BRACE = K(9, -16, PI, 1, 1, 2);                        // 死亡：拄剑硬撑，单膝将跪未跪
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const CREST_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_STRIKE = 2 / 12, T_SWEEP = 3 / 12, T_WAVE = 4 / 12, T_CRASH = INCOMING + 0.5, T_BURST = INCOMING + 0.75;
  function orbitAt(o) { const th = PI - o * HALF; return [RD(HALO_X - (HALO_X - SH_X) * -Math.cos(th)), RD(SH_Y - (SH_Y - HALO_Y) * Math.sin(th))]; }   // 从肩旁绕上来，停在头后

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 1; P.gem = 0; P.runes = 0; P.roff = 0; P.rf = 0; P.blink = 0; P.arm = 0;
    P.sx = SH_X; P.sy = SH_Y; P.spin = 5; P.sfall = 0; P.blow = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.solo = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = CREST_IDLE[(b + 1) & 3];
      const w = Math.floor(TT * 1.25 + 1e-6); P.sway = SWAY_IDLE[w & 3]; P.bend = 1 + (w & 1);   // 破边披风随风飘
      P.gem = P.bob ? 1 : 0;                                                                    // 眼缝紫光随呼吸明暗
      P.sy = SH_Y - (Math.floor(TT * 1.6 + 1e-6) & 1);                                          // 神盾缓慢上下浮 1 格
      const fi = RD((tq % DUR[IDLE]) * 12);
      if (fi >= 6 && fi < 6 + SPIN_IDLE.length) P.spin = SPIN_IDLE[fi - 6];                     // 每个循环自转一圈（转到侧面变成一条线）
      if (fi >= 20 && fi <= 22) { P.rf = 7; P.glint = fi === 21 ? 1 : 0; }                      // 剑上的符文偶尔亮一个
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                          // 阔步：巨剑扛肩随步点头，披风大幅后扬，神盾晚一拍跟着飘
      setK(K_CARRY, K_CARRY, 0); const f = E.gait(tq); parts.gait(P, f); P.a += (f & 1) ? 0 : ASTEP; P.bend = (f & 1) ? 3 : 2; P.gem = 1;
      P.sx = SH_X - 3; P.sy = SH_Y - 10 + ((f & 1) ? 1 : 0); P.arm = 1;   // 神盾飘在扛着的剑尖上方
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                      // 大半圆扫：身后贴地 → 横过身前 → 前上方
      P.gem = 1; P.arm = 1;
      if (tq < T_STRIKE - 1e-6) { setK(K_IDLE_N, K_WIND, tq < 1 / 12 - 1e-6 ? 0.5 : 1); P.beard = 1; P.sway = 1; P.arm = 0; }
      else if (tq < T_STRIKE + 1 / 12 - 1e-6) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 4; P.beard = -2; P.sway = -1; P.bend = 3; P.glint = 1; P.gem = 2; }
      else if (tq < 0.45) { setK(K_STRIKE, K_FOLLOW, ease.out(clamp01((tq - 0.25) / 0.2))); P.bx = 4; P.beard = -1; P.bend = 2; P.runes = tq < 0.34 ? 1 : 0; }   // 攻击回蓝：第一个符文亮一下
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_FOLLOW, K_IDLE, q); P.bx = RD(4 * (1 - q)); }
    } else if (st === CHARGE) {                                      // 巨剑插地、双手按剑首；符文逐个点亮；神盾绕上来停在头后成光环
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.runes = Math.min(10, Math.floor(tq / 0.13 + 1e-6)); P.blink = f12 & 1;
      P.gem = tq < 0.45 ? 1 : (f12 & 1) ? 2 : 1; P.rim = tq < 0.3 ? 0 : 2; P.blow = tq < 0.4 ? 1 : 2; P.bend = 3; P.beard = -2; P.sway = (f12 & 1) ? -1 : 0;
      const o = ease.inOut(clamp01((tq - 0.2) / 0.7)), s = orbitAt(o); P.sx = s[0]; P.sy = s[1]; P.spin = o > 0 && o < 1 ? SPIN_ORBIT[f12 % SPIN_ORBIT.length] : 5;
    } else if (st === CAST) {                                        // 拔剑高举（头顶化出光剑虚影）→ 大横扫
      P.runes = 10; P.blink = f12 & 1; P.gem = 3; P.rim = 3; P.blow = 2; P.bend = 3; P.beard = -2; P.sway = -1; P.sx = HALO_X; P.sy = HALO_Y; P.arm = 1;
      if (tq < T_SWEEP - 1e-6) setK(K_RAISE, K_RAISE, 0);
      else { setK(K_SWEEP, K_SWEEP, 0); P.bx = 4; P.gem = 2; P.rim = 2; }
    } else if (st === RECOVER) {                                     // 巨剑扛回肩上再拄回地上；神盾飘回肩旁；符文保持亮着
      P.runes = 10; P.blink = (f12 >> 1) & 1; P.arm = 1;
      if (tq < 0.35) { const q = ease.inOut(tq / 0.35); setK(K_SWEEP, K_CARRY, q); P.bx = RD(4 * (1 - q)); }
      else { const q = ease.inOut(clamp01((tq - 0.35) / 0.3)); setK(K_CARRY, K_IDLE_N, q); P.arm = q < 0.5 ? 1 : 0; }
      const r = ease.inOut(clamp01((tq - 0.15) / 0.45)), s = orbitAt(1 - r); P.sx = s[0]; P.sy = s[1]; P.spin = r > 0 && r < 1 ? SPIN_ORBIT[f12 % SPIN_ORBIT.length] : 5;
      P.gem = tq < 0.3 ? 2 : 1; P.rim = tq < 0.35 ? 2 : 0; P.blow = tq < 0.2 ? 1 : 0; P.bend = tq < 0.35 ? 2 : 1; P.beard = tq < 0.35 ? -1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.bend = 0; P.flash = h < 1 / 12 ? 1 : 0; P.runes = 1; P.sx = SH_X - 1; P.sy = SH_Y + 1; P.spin = 3; }   // 被攻击也回蓝：符文亮一个
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.runes = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                       // 符文崩散：拄剑硬撑 → 神盾失去力量坠地 → 全身裂成紫色碎块 → 只剩巨剑，符文从剑首到剑尖逐个熄灭 → 消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) {
        setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.sx = SH_X - 1; P.sy = SH_Y + 1; P.spin = 3;
        if (d >= 0.15) { setK(K_BRACE, K_BRACE, 0); P.crouch = 1; P.flash = 0; P.eyes = 0; P.gem = (f12 & 1) ? 2 : 0; }
      } else if (d < 0.75) {
        setK(K_BRACE, K_BRACE, 0); P.bx = -2; P.gem = (f12 & 1) ? 2 : 1; P.runes = (f12 & 1) ? 10 : 6; P.beard = 2; P.rim = 1;
        if (d < 0.5) { const q = clamp01((d - 0.3) / 0.2); P.sy = RD(SH_Y + (-6 - SH_Y) * q * q); P.spin = (f12 & 1) ? 3 : 5; P.gem = 4; }   // 神盾失去力量坠地
        else if (d < 0.58) { P.sy = -6; P.spin = 0; }
        else P.sfall = 1;
      } else {
        setK(K_BRACE, K_BRACE, 0); P.bx = -2; P.solo = 1; P.runes = 10; P.gem = 3;
        P.roff = d < 1.2 ? 0 : Math.min(10, 1 + Math.floor((d - 1.2) / 0.08 + 1e-6)); P.gem = d < 1.2 ? 2 : 4;   // 符文从剑首到剑尖逐个熄灭
        if (d >= 2.0) P.dq = clamp01((d - 2.0) / 0.5);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else { P.glint = 1; P.gem = 2; }
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 48);
    P.sy += P.sfall ? 0 : P.bob;
    const b = parts.along(P, SWORD, -2); P.bhx = b[0]; P.bhy = b[1]; P.ba = P.a;                  // 双手：后手在剑柄上、前手之后 2 格
    const G = bladeGeo(P.hx, P.hy, P.a, SWORD.len), c = bladeCell(G, -3); P.gx = c[0] + P.bx; P.gy = c[1];   // 发光体 = 剑首紫晶
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  let RIG = null;
  function runes(G) {                                               // 剑身 10 个紫色符文（法力刻度）+ 剑首紫晶：和剑同一个部件
    for (let i = 0; i < 10; i++) {
      const c = bladeCell(G, runeK(G, i)), lit = (i < P.runes && i >= P.roff) || i + 1 === P.rf;
      px(E, RIG, c[0], c[1], lit ? M.aegis : M.cloth, lit ? (P.runes >= 10 ? (P.blink ? 4 : 3) : i === P.runes - 1 || i + 1 === P.rf ? 4 : 3) : 1);
    }
    const g = bladeCell(G, -3), lv = GEM_T[CL(P.gem, 0, 4)][0]; px(E, RIG, g[0], g[1], M.aegis, lv);
  }
  function sword() { parts.sword(E, RIG, P, SWORD); runes(bladeGeo(P.hx, P.hy, P.a, SWORD.len)); }
  function tabardTrim(R, tor) {                                     // 罩袍下摆金边 + 胸甲日月纹（和躯干同一个部件）
    const LL = tor.rows[0], RR = tor.rows[1], i = tor.hem - tor.y0, mid = RD((LL[i] + RR[i]) / 2), y = Math.min(0, tor.hem + 1), s = RD((P.sway || 0) * 0.5);
    for (let x = mid - 1; x <= Math.min(RR[i], mid + 2); x++) px(E, R, x + s, y, M.gold, x === mid - 1 ? 4 : 3);
    const cx = tor.chest[0], cy = tor.chest[1];
    px(E, R, cx, cy, M.gold, 4); px(E, R, cx - 1, cy, M.gold, 3); px(E, R, cx + 1, cy, M.gold, 3); px(E, R, cx, cy - 1, M.gold, 3); px(E, R, cx, cy + 1, M.gold, 2);   // 日
    px(E, R, cx + 2, cy - 1, M.edge, 4); px(E, R, cx + 2, cy + 1, M.edge, 3);                                                                                // 月
  }
  function capeLining(R) {                                          // 披风被风掀起时露出的暗影内衬（和披风同一个部件）
    if ((P.bend || 0) < 2) return;
    const top = R.yS - 1, bot = -2, n = bot - top, fl = 6 * (R.lie ? 0.3 : 1);
    for (let y = RD(top + n * 0.55); y < bot - 1; y++) { const t = (y - top) / n, e = parts.edges(R, CL(y, R.yS, R.yHip)), L = RD(e[0] - fl * Math.pow(t, 1.1) + P.sway * t * t - P.bend * t * t * 0.9); px(E, R, L, y, M.lining, 3); if (y & 1) px(E, R, L + 1, y, M.lining, 2); }
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = RIG = parts.rig(P, BODY), solo = P.solo;
    if (solo === 1) { sword(); return; }
    if (P.sfall) manaShield(E, R, P, Object.assign({ at: [SH_X, -1], rot: 1, hw: 0 }, SHIELD));     // 坠地后侧躺在地上
    else manaShield(E, R, P, Object.assign({ at: [P.sx, P.sy], hw: P.spin, clip: 0 }, SHIELD));      // 悬浮神盾
    parts.cape(E, R, P, { style: 'tattered', mat: M.cloth, trim: M.gold, len: 'long', flare: 6 }); capeLining(R);   // 及地破边长披风
    if (!P.arm) parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, trim: M.gold, grip: 'none' });
    parts.legs(E, R, P, { style: 'greave', mat: M.plate, matD: M.plateD, boot: M.iron, bootD: M.ironD });
    const tor = parts.torso(E, R, P, { style: 'plate', mat: M.plate, tabard: M.cloth, belt: M.belt, buckle: M.gold });
    tabardTrim(R, tor);
    crestHelm(E, R, P, HELM);
    if (P.arm) parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.plateD, pauldron: M.plateD, trim: M.gold, grip: 'none' });
    if (solo !== 2) sword();
    parts.hand(E, R, P, { side: 'B', hand: M.plate, grip: 'fist' });
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.plate, pauldron: M.plate, trim: M.gold, cuff: M.gold, hand: M.plate, grip: 'fist' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, gAnchorX = 0, gAnchorY = 0, shardT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  let TINT = null;
  function tintHero() {                                             // 碎块染成紫色符文色（按明暗映射到神盾紫色阶）
    if (!TINT) { TINT = new Uint8Array(256); for (let i = 0; i < 256; i++) { if (i >= E.PAL.length) { TINT[i] = i; continue; } const n = parseInt(E.PAL[i].slice(1), 16), l = (0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255)) / 255; TINT[i] = l > 0.7 ? EL[0] : l > 0.45 ? EL[1] : l > 0.25 ? EL[2] : l > 0.12 ? EL[3] : EL[4]; } TINT[255] = 255; }
    const o = hero.out; for (let i = 0; i < o.length; i++) o[i] = TINT[o[i]];
  }
  function guardAt() { const G = bladeGeo(P.hx, P.hy, P.a, SWORD.len), c = bladeCell(G, 1); return [wx(c[0] + P.bx), wy(c[1])]; }
  function onEnter(s) {
    if (s === CHARGE) fx.circle(wx(2), HY, 22, 5, R_EL, DUR[CHARGE] + 0.1, -0.5, 0);                   // 脚下审判法阵，缓慢反转
    if (s === CAST) {                                                                                  // 拔剑高举：法阵外爆 + 冲击环 + 星芒，震屏、天空闪白
      releaseOrbit(50, 110, 0.35, 0.75); burst(wx(2), HY - 2, 30, 60, 140, 0.3, 0.75, R_EL, 18); ring(wx(2), HY - 14, 1, R_EL);
      fx.cross(wx(K_RAISE.hx + 1), wy(K_RAISE.hy - 3), 6, R_EL, 0.35); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    const at = (v) => Math.abs(t - v) < 1e-9;
    if (s === ATTACK && at(T_STRIKE)) {                               // 剑尖拖出紫色残弧（从身后贴地到前上方的大半圆）
      fx.slash(wx(4 + P.bx), wy(-20), 20, 3.9, 1.0, R_EL, 0.2, 2, 2);
      hitDummy(0); burst(DUMMY_X - 4, HY - 17, 14, 40, 110, 0.15, 0.4, R_IMP, 10); fx.cross(DUMMY_X - 4, HY - 17, 4, R_EL, 0.2);
      sfx('swing', { kind: 'slash', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.8 });
    }
    if (s === CAST && at(T_SWEEP)) {                                   // 本体和光剑虚影一起大横扫
      const g = guardAt(); gAnchorX = g[0]; gAnchorY = g[1];
      fx.slash(wx(4 + P.bx), wy(-20), 18, -0.2, 2.5, R_EL, 0.25, 3, 2);
      burst(DUMMY_X - 3, HY - 17, 18, 50, 130, 0.2, 0.5, R_EL, 10); fx.cross(DUMMY_X - 3, HY - 17, 5, R_EL, 0.25); hitDummy(0);
      sfx('impact', { pal: 'arcane', w: 0.8 });
    }
    if (s === CAST && at(T_WAVE)) {                                    // 落点炸开中范围审判冲击波：大冲击环 + 左右推开的紫浪 + 十字地裂 + 外爆 + 金色火花
      ring(DUMMY_X, HY - 8, 1, R_EL);
      fx.wave(DUMMY_X - 3, HY, -1, 20, 6, R_EL, 0.5, 2); fx.wave(DUMMY_X + 3, HY, 1, 20, 6, R_EL, 0.5, 2);
      fx.crack(DUMMY_X, HY, 16, -1, R_EL, 0.9, 0); fx.crack(DUMMY_X, HY, 16, 1, R_EL, 0.9, 0); fx.cross(DUMMY_X, HY - 1, 6, R_EL, 0.3);
      burst(DUMMY_X, HY - 10, 36, 60, 150, 0.3, 0.8, R_EL, 14); burst(DUMMY_X, HY - 4, 10, 50, 120, 0.2, 0.5, R_IMP, 20);
      dummyFx({ dur: 1.0, outline: R_EL }); hitDummy(1); shake(0.14, 1); sfx('impact', { pal: 'arcane', w: 1.0 });
    }
    if (s === DEATH && at(T_CRASH)) { for (let i = 0; i < 10; i++) spawn(K_DUST, wx(SH_X - 6 + Math.random() * 12), HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.7 }); }   // 神盾「哐」地坠地
    if (s === DEATH && at(T_BURST)) {                                  // 全身裂成紫色符文碎块向外炸开（死亡套件 burst），只剩巨剑插在原地
      P.solo = 2; drawHero(); bakeHero(); tintHero();
      E.death.start('burst', { fromX: 2, fromY: -16, power: 0.8, chunk: 3, fadeAt: 0.9, fadeDur: 0.5 });
      hero.k1 = hero.k2 = -1; P.solo = 1;
      burst(wx(2), wy(-16), 30, 60, 150, 0.3, 0.8, R_EL, 10); ring(wx(2), wy(-16), 1, R_EL); flash(0.06); shake(0.2, 2);
    }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_SWEEP, T_WAVE], [], [], [T_CRASH, T_BURST], []];
  function hurtFx(s) {                                               // 古重甲受击：白金火花 + 长寿命火星
    const hx = HX + HIT_POINT[0] - 1, hy = HY + HIT_POINT[1];
    burst(hx, hy, s === DEATH ? 26 : 20, 60, 150, 0.2, 0.5, R_IMP, 20);
    for (let i = 0; i < 3; i++) spawn(K_BURST, hx, hy, 30 + Math.random() * 50, -40 - Math.random() * 50, 0.6 + Math.random() * 0.3, FXI.steel);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) {                                          // 紫色光点从法阵外沿螺旋汇聚到剑首
      chargeAcc += dt * (20 + 34 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 18 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.35), 0, 9, R_EL, a, r, 3 + Math.random() * 3); }
    }
    if (state === RECOVER && stT < 0.3) {                            // 光剑虚影从剑尖到剑柄碎成紫光点
      emberAcc += dt * 70; const L = RD(GHOST_L * (1 - stT / 0.3)), d = P.flip ? -1 : 1;
      while (emberAcc >= 1) { emberAcc -= 1; const s = L + Math.random() * 3; spawn(K_EMBER, gAnchorX + d * s, gAnchorY + (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 20, -10 - Math.random() * 16, 0.4 + Math.random() * 0.4, R_EL); }
    }
    if (state === MOVE && P.step !== lastStep) {                      // 阔步：每步 3 颗尘 + 脚印处 1 格紫色余光 0.3 s
      if (P.step !== 0) { sfx('step', { w: 1.0 }); const fx0 = wx(8); for (let i = 0; i < 3; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20, -5 - Math.random() * 7, 0.35 + Math.random() * 0.25, FXI.dust); spawn(K_STILL, fx0, HY, 0, 0, 0.3, R_EL); }
      lastStep = P.step;
    }
    if (state === DEATH && stT > INCOMING + 1.4 && stT < INCOMING + 2.3) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 36, HY - 1 - Math.random() * 4, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }   // 碎块落地后化成紫光点上升
    if (state === DEATH && P.solo === 1 && P.roff > 0 && P.roff < 10 && Math.random() < dt * 14) { const G = bladeGeo(P.hx, P.hy, P.a, SWORD.len), c = bladeCell(G, runeK(G, P.roff - 1)); spawn(K_RISE, wx(c[0] + P.bx), wy(c[1]), (Math.random() - 0.5) * 6, -12, 0.5, R_EL); }
    shardT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; shardT = 9; }

  // 光剑虚影：两倍大的紫色单色剪影 + 第 1 级白边（前 2 帧全白）；竖着举在头顶，或横着扫出去；碎裂时从剑尖往剑柄收
  const GHOST_L = 34;
  function ghostBlade(x0, y0, dx, dy, L, white) {
    const ux = -dy, uy = dx, E0 = EL[0], E1 = EL[1], E2 = EL[2];
    for (let s = 1; s <= L; s++) { const hw = Math.min(3, Math.floor((GHOST_L - s) / 2)); for (let o = -hw; o <= hw; o++) { const edge = Math.abs(o) === hw || s === L; put(x0 + dx * s + ux * o, y0 + dy * s + uy * o, white || edge ? E0 : o === 0 ? E1 : E2); } }   // 刃：7 格宽（真剑的两倍多），剑尖收窄
    for (let o = -7; o <= 7; o++) for (let s = -1; s <= 0; s++) put(x0 + dx * s + ux * o, y0 + dy * s + uy * o, white || Math.abs(o) === 7 || s === -1 ? E0 : E2);              // 十字护手
    for (let s = -6; s <= -2; s++) for (let o = -1; o <= 0; o++) put(x0 + dx * s + ux * o, y0 + dy * s + uy * o, white ? E0 : o ? E2 : E1);                                       // 握把
    for (let o = -2; o <= 1; o++) for (let s = -9; s <= -7; s++) put(x0 + dx * s + ux * o, y0 + dy * s + uy * o, Math.abs(o + 0.5) > 1 || s !== -8 ? E0 : E1);                   // 剑首
  }
  function ghostState() {
    const st = E.state, t = E.stT;
    if (st === CAST && t < T_SWEEP) return 1; if (st === CAST) return 2; if (st === RECOVER && t < 0.3) return 3; return 0;
  }
  function fxBack(f12) {
    if (!P.solo && P.sfall === 0) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    if (ghostState() === 1) { const g = guardAt(); ghostBlade(g[0], g[1], 0, -1, GHOST_L, E.stT < 2 / 12); }   // 头顶的光剑虚影
    if (!P.sfall && !P.solo && P.sx === HALO_X && P.sy - P.bob === HALO_Y) {                                   // 神盾立成头后的光环：外面一圈紫光点
      const cx = wx(P.sx), cy = wy(P.sy - 1), n = 40;
      for (let i = 0; i < n; i++) { if (((i + f12) & 3) === 0) continue; const a = i / n * 6.2832; put(RD(cx + Math.cos(a) * 9), RD(cy + Math.sin(a) * 10), (i + f12) % 5 === 0 ? EL[1] : EL[2]); }
    }
  }
  function fxMid(f12) {
    const gs = ghostState(), d = P.flip ? -1 : 1;
    if (gs === 2) ghostBlade(gAnchorX, gAnchorY, d, 0, GHOST_L, E.stT < T_SWEEP + 1 / 12);
    if (gs === 3) ghostBlade(gAnchorX, gAnchorY, d, 0, Math.max(1, RD(GHOST_L * (1 - E.stT / 0.3))), false);
    if (E.death.active && P.solo === 1) {                            // 死亡套件接管画面时，插在原地的巨剑自己画
      const s = hero, o = s.out, X0 = HX + P.mx - s.ox, Y0 = HY - s.oy;
      for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) { const c = o[y * s.w + x]; if (c !== 255) put(X0 + x, Y0 + y, c); }
    }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && P.st >= CHARGE && P.st <= RECOVER) {   // 剑首十字星芒
      const L = P.gem === 3 ? 6 : 3 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[1] : r <= 4 ? EL[2] : EL[3]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); }
    }
  }
  const HIT_POINT = [5, -16];

  return {
    name: '奥法元帅', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.aegis], HIT_POINT, EVENTS, deathKit: { mode: 'burst', at: T_BURST }, REVIVE: { dy: -16, ramp: R_EL, big: 1 },
    SFX: { body: 'armor', how: 'explode', pal: 'arcane', style: 'nova', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, hurtFx, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
