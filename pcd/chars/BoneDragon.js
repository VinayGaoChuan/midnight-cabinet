// 骨龙（衍生单位 · 骷髅 · 射手 · 普通）：死神召唤出的巨型骨架龙——贴地低伏的四足，全身没有一块肉，只有粗大的骨架：
// 胸腔是一只空的肋骨笼，里面悬着一团冥霜魂焰（从肋骨缝里透出来）；背上一对只剩骨架的龙翼，翼骨之间挂着死神同款的灰白裹尸布条；
// 龙头骨和死神镰座上的龙颅同一个造型（后掠长角 + 张开的下颌）；长尾是一节节尾椎，尾尖一枚骨刺铲。
// 攻击：伏低后张口喷出一道骨片夹着冥霜的直线吐息（细光束）。技能「吞魂回血」（desc：击杀敌人时恢复自身生命值）：伏低、翼骨张开，
// 肋骨笼里的魂焰越烧越亮，冰霜粒子螺旋吸进张开的下颌 → 喷出一道宽 3 格的冥霜吐息光束夹着翻滚的白骨片，震屏 2 格、天空闪白 →
// 目标被冰封外罩 + 减速，一团魂光从目标身上被抽出、沿光束倒流回肋骨笼，魂焰一亮、骨缝的裂纹合上。
// 死亡：连锁散架——从尾尖开始一节节骨头往下塌落，一直塌到头骨；肋骨笼里的魂焰熄灭，骨堆化灰（死亡套件 ash）。
// 腿、头、角用 parts-beast 的 quad；骨架躯干（脊椎 + 肋骨笼 + 骨盆）、椎骨长颈、骨翼 + 裹尸布、尾椎、笼中魂焰、散架画笔是本模块的自画部件。
PCD.define('BoneDragon', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.frost, EL = FXR[R_EL];                                  // 冥霜吐息 · 冥霜青白
  const R_SOUL = FXI.soul, SL = FXR[R_SOUL];                               // 被抽回的魂光（呼应死神）
  const R_CHIP = fxRamp('boneChip', [21, 17, 6, 7, 8]);                    // 吐息里翻滚的白骨片、受击骨屑
  const R_ASH = fxRamp('boneAsh', [17, 6, 7, 10, 8]);                      // 骨堆化灰
  const m = B.mats(E, {
    main: 'bone', bone: 'bone', shroud: 'white',                          // 骨白、灰白裹尸布
    claw: [0, 8, 7, 6], horn: [0, 8, 7, 6], teeth: 'white',                // 爪与角：bone 暗段
    eye: [0, 0, 22, 21], glow: [39, 40, 22, 21],                           // 眼窝冥霜光点、口中寒光
    flame: [39, 40, 23, 22],                                               // 笼中魂焰
  });
  m.flameHot = E.defMat([22, 22, 21, 21], 1, 1); m.shroudFar = E.defMat([7, 18, 18, 17], 1);
  const o = Q.shape({ len: 14, chest: 5.5, rump: 4.5, waist: 0.2, hump: 1, leg: 5, lw: 2, thigh: 2.4, farDx: -3, stride: 3, lift: 2, foot: 'claw',
    neck: 9, neckA: 0.8, neckW: 1.6, head: { type: 'dragon', w: 7, h: 5.5, snout: 6, snH: 3.4, tip: 0.7, horn: 'back', hornLen: 10, teeth: 2 }, headA: 0.2,
    tail: 'none', mane: 'none', fur: 0, lieLegs: 0, m });
  const WING = { span: 20, chord: 6, fingers: 3 };

  const HX = 38, DUR = DEFAULT_DUR.slice(), hero = new Sprite(120, 66, 62, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'spec', 'claw', 'teeth', 'glow', 'horn', 'shroud', 'shroudFar', 'flame', 'flameHot']) RIM.skip[m[k]] = 1;
  // 自己的姿势字段：flame 笼中魂焰 0 熄 / 1 暗 / 2 亮 / 3 炽 · fl 火苗摆 · crack 骨缝裂纹 0 合上 … 2 · colF 散架进度（第几帧，0–8）
  const SPEC = Q.KEYS.concat(B.COMMON, [['flame', 0, 3], ['fl', 0, 1], ['crack', 0, 2], ['colF', 0, 8]]);
  const P = {};
  function reset() { Q.reset(P); P.flame = 1; P.fl = 0; P.crack = 2; P.colF = 0; P.wing = 1; P.crouch = 1; P.glow = 1; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x - 1), R(rig.C1.y)];

  // ───── 散架画笔：按 x 分 7 节，从尾尖往头一节节塌到地上（y 往地面压扁，落地的骨头左右散开 1 格）─────
  const CD = Object.create(E), XS0 = -27, SECW = 8, NS = 7;
  CD.sp = (x, y, mm, t) => {
    if (!P.colF) { E.sp(x, y, mm, t); return; }
    const s = Math.max(0, Math.min(NS - 1, Math.floor((x - XS0) / SECW))), k = P.colF - s;
    if (k <= 0) { E.sp(x, y, mm, t); return; }
    const q = k === 1 ? 0.5 : 1, yy = Math.min(0, R(y * (1 - q * 0.8))), xx = x + (q >= 1 ? R((U.hash(x * 7 + 3, y * 13 + 1) - 0.5) * 2.2) : 0);
    E.sp(xx, yy, mm, t);
  };
  const D = CD;

  // ───── 姿势 ─────
  const T_BREATH = 2 / 12, T_HIT = 2 / 12, T_FLARE = 0.25, T_ASH = INCOMING + 1.7, T_OUT = INCOMING + 1.1;
  const SEC_EV = []; for (let s = 0; s < NS; s++) SEC_EV.push(INCOMING + 0.34 + (s + 1) / 12);   // 每一节骨头落地
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]), TT = f12 / 12, b = Math.floor(TT * 5 + 1e-6);
    P.crouch = 1; P.jaw = [0, 2, 0, 1][b & 3]; P.flame = P.jaw ? 2 : 1; P.fl = (f12 >> 1) & 1;   // 咔哒下颌：一开一合，魂焰随之明暗
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)); P.head = k < 4 ? -1 : 0; P.jaw = [3, 0, 3, 0, 1][k]; P.flame = P.jaw === 3 ? 3 : 1; }   // 连咬两下
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                  // 低伏的对角步态，每一步骨节顿挫
      const f = Q.anim.walk(P, tq); P.crouch = f & 1 ? 1 : 2; P.jaw = f === 1 ? 1 : 0; P.flame = 1 + (f & 1); P.fl = f & 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                              // 伏低 → 张口喷一道骨片冥霜细吐息
      if (tq < 0.12) { P.crouch = 3; P.head = 1; P.jaw = 1; P.glow = 1; P.flame = 2; P.pitch = -1; }
      else if (tq < 0.36) { P.crouch = 2; P.head = 0; P.jaw = 3; P.glow = 2; P.flame = 3; P.rim = 2; P.bx = -1; P.mane = -1; }
      else if (tq < 0.45) { P.crouch = 2; P.jaw = 2; P.glow = 1; P.flame = 2; P.rim = 1; }
      else idle(tq, f12);
    } else if (st === CHARGE) {                                              // 伏低、翼骨张开，魂焰越烧越亮，冰霜吸进下颌
      const q = ease.inOut(clamp01(tq / 0.7)); P.crouch = 1 + R(q * 2); P.wing = q > 0.2 ? 5 : 1; P.head = q > 0.4 ? 1 : 0; P.jaw = tq < 0.5 ? 1 : 3;
      P.flame = Math.min(3, 1 + Math.floor(tq / 0.4)); P.fl = f12 & 1; P.glow = tq < 0.6 ? 1 : 2; P.rim = 2; P.mane = -1; P.tail = 1;
      if (tq > 1.1) P.bob = f12 & 1;
    } else if (st === CAST) {                                                // 冥霜吐息光束
      P.crouch = 2; P.wing = 5; P.head = 0; P.jaw = 3; P.glow = 3; P.flame = 3; P.fl = f12 & 1; P.rim = 3; P.bx = tq < 1 / 12 ? 0 : -1; P.mane = -1; P.tail = -1;
    } else if (st === RECOVER) {                                             // 魂光流回笼中：魂焰一亮、裂纹合上
      const q = ease.inOut(clamp01(tq / 0.6)); P.crouch = q < 0.5 ? 2 : 1; P.wing = q < 0.5 ? 5 : 1; P.jaw = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.glow = q < 0.4 ? 2 : 1;
      P.flame = tq < 0.4 ? 3 : q < 0.8 ? 2 : 1; P.fl = f12 & 1; P.rim = q < 0.5 ? 2 : 1; P.crack = Math.max(0, 2 - Math.max(0, f12of(tq) - 2));
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { Q.anim.hurt(P, h); P.crouch = Math.max(P.crouch, 1); P.jaw = h < 0.35 ? 2 : 0; P.flame = h < 0.2 ? ((f12 & 1) ? 3 : 0) : 1; P.wing = h < 0.2 ? 4 : 1; }
    } else if (st === DEATH) {                                               // 连锁散架：尾尖 → 头骨，魂焰熄灭，骨堆化灰
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.34) { P.bx = -2; P.eyes = 1; P.head = -1; P.jaw = 2; P.wing = 4; P.tail = 2; P.crouch = d < 0.15 ? 1 : 3; P.flash = d < 1 / 12 ? 1 : 0; P.flame = (f12 & 1) ? 3 : 0; }
      else {
        P.bx = -2; P.eyes = 1; P.head = 2; P.jaw = 3; P.wing = 6; P.crouch = 3; P.colF = Math.min(8, f12of(d - 0.34) + 1);
        P.flame = d < T_OUT - INCOMING - 1e-6 ? ((f12 & 1) ? 2 : 1) : 0; P.crack = 2;
        if (d >= T_ASH - INCOMING - 1e-6) P.dq = 1;                        // 之后由死亡套件（化灰）接管
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    P.gx = R(rig.mouth[0]) + P.bx; P.gy = R(rig.mouth[1]);
    B.key(P, SPEC);
  }

  // ───── 自画部件 ─────
  function wingGeom(x, y, pose, w) {                                        // 和 B.wing 同一套几何：腕点、翼指尖
    const W = B.WINGS[pose | 0], a0 = W[0], aT = W[1], fold = W[2], S = w.span, nf = w.fingers;
    const arm = S * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, T = [];
    for (let k = 0; k < nf; k++) { const q = k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = S * (0.62 - 0.12 * q) * (1 - 0.55 * fold); T.push([wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl]); }
    return { wx, wy, T, a0 };
  }
  // 候选部件：boneWing 骨翼 + 裹尸布（两个部件：① 从臂骨和翼指上垂下的灰白布条，长短参差、下半截随 P.mane 飘；② 只剩骨架的翼：2 格臂骨、1 格翼指、拇指爪）
  function boneWing(x, y, pose, far) {
    const g = wingGeom(x, y, pose, WING), sh = far ? m.shroudFar : m.shroud, bn = far ? m.far : m.limb, sw = (P.mane | 0);
    part();
    const hangs = [[x, y, g.wx, g.wy, 0.6]];                                      // 四条布条：臂骨一条、每根翼指一条，布条之间露出空的翼骨
    for (const T of g.T) hangs.push([g.wx, g.wy, T[0], T[1], 0.55]);
    hangs.forEach(([ax, ay, bx, by, q], i) => {
      const px = lerp(ax, bx, q), py = lerp(ay, by, q), L = 4 + R(U.hash(i, far ? 7 : 3) * 3) + (i & 1);
      for (let k = 0; k <= L; k++) { const dx = k > L / 2 ? sw : 0; U.dot(D, px + dx, py + k, sh, k === L ? 1 : (k & 3) === 2 ? 2 : 0); if (k < 2) U.dot(D, px + dx + 1, py + k, sh, 2); }
    });
    part();
    U.seg(D, x, y, g.wx, g.wy, 2, bn, 0); U.disc(D, g.wx, g.wy, 1, bn, 4);
    for (const T of g.T) { U.seg(D, g.wx, g.wy, T[0], T[1], 1, bn, 0); U.dot(D, T[0], T[1], bn, 4); }
    U.dot(D, g.wx + (g.a0 > 0 ? 0 : 1), g.wy - 2, m.claw, 3);
  }
  // 候选部件：cageFlame 笼中魂焰（悬在肋骨笼里的一团冥霜火：flame 0 熄灭只剩暗点 · 1 暗 · 2 亮 · 3 炽，fl 火尖左右摆）
  function cageAt() { return [rig.C1.x - 1.5, rig.C1.y + 0.5]; }
  function cageFlame() {
    part(); const [cx, cy] = cageAt(), lv = P.flame | 0;
    if (!lv) { U.dot(D, cx, cy + 2, m.flame, 1); return; }
    const r = [0, 2, 2.7, 3.4][lv], tip = [0, 2, 3, 4][lv], sx = P.fl ? 1 : -1;
    U.disc(D, cx, cy, r, m.flame, lv === 1 ? 2 : 3);
    for (let k = 1; k <= tip; k++) U.dot(D, cx + (k > 1 ? sx : 0), cy - R(r) - k + 1, m.flame, k === tip ? 2 : 3);
    U.disc(D, cx, cy, r - 1, lv === 1 ? m.flame : m.flameHot, lv === 1 ? 3 : 1);
    if (lv >= 2) { U.dot(D, cx, cy, m.flameHot, 3); U.dot(D, cx, cy - 1, m.flameHot, lv === 3 ? 3 : 1); }
    if (lv === 3) { U.dot(D, cx - 1, cy, m.flameHot, 3); U.dot(D, cx + 1, cy, m.flameHot, 3); U.dot(D, cx, cy + 1, m.flameHot, 3); }
  }
  // 候选部件：skeletonTorso 骨架躯干（一个部件：沿背线的脊椎 + 棘突、前半身一排肋骨围成的空笼 + 胸骨、臀部骨盆 + 闭孔；crack 骨缝裂纹）
  function skeletonTorso() {
    part(); const C1 = rig.C1, C2 = rig.C2, bn = m.bone, cr = P.crack | 0;
    for (let x = R(C2.x - C2.r * 0.6); x <= R(rig.NB.x); x++) {                 // 脊椎
      const s = Q.span(rig, o, x); if (!s) continue; const j = ((x % 3) + 3) % 3;
      U.dot(D, x, s[0], bn, 3); U.dot(D, x, s[0] + 1, bn, j === 1 ? 1 : 2); if (j === 0) U.dot(D, x, s[0] - 1, bn, 4);
    }
    const r0 = R(C1.x - C1.r * 1.25), r1 = R(C1.x + C1.r * 0.6);
    for (let x = r0; x <= r1; x += 3) {                                        // 肋骨：从脊椎往下弯到胸底，肋间留 2 格空（看得见笼里的魂焰）
      const s = Q.span(rig, o, x); if (!s) continue;
      for (let y = s[0] + 2; y <= s[1]; y++) { const xr = x - R((y - s[0] - 2) * 0.22); U.dot(D, xr, y, bn, y === s[0] + 2 ? 4 : cr && U.hash(x, y) < 0.12 * cr ? 1 : 3); }
    }
    for (let x = R(C1.x - C1.r * 0.4); x <= r1 + 1; x++) { const s = Q.span(rig, o, x); if (s) U.dot(D, x - 1, s[1], bn, 2); }   // 胸骨
    U.oval(D, C2.x + 0.5, C2.y - 0.5, 3, 2.2, bn, 0); U.dot(D, C2.x + 1, C2.y, m.ink, 0); U.dot(D, C2.x + 1, C2.y + 1, m.ink, 0);   // 骨盆 + 闭孔
    if (cr) { U.dot(D, C2.x - 1, C2.y - 2, bn, 1); U.dot(D, C2.x - 2, C2.y - 1, bn, 1); if (cr > 1) U.dot(D, C2.x + 2, C2.y - 2, bn, 1); }
  }
  // 候选部件：vertebraNeck 椎骨长颈（沿一条往前上弯的曲线排 7 节椎骨，节间暗关节、节上棘突）
  function vertebraNeck() {
    part(); const A = rig.NB, Z = rig.NT, cx = A.x + 1, cy = Z.y + 2.5, n = 7;
    for (let i = 0; i <= n; i++) {
      const t = i / n, x = (1 - t) * (1 - t) * A.x + 2 * t * (1 - t) * cx + t * t * Z.x, y = (1 - t) * (1 - t) * A.y + 2 * t * (1 - t) * cy + t * t * Z.y;
      if (i & 1) U.dot(D, x, y, m.bone, 1);
      else { U.disc(D, x, y, 1.3, m.bone, 0); U.dot(D, x - 1, y - 2, m.bone, 4); }
    }
  }
  // 龙头骨：quad.head（骨白）+ 眼窝、鼻孔、颅上裂纹、一排牙（并进头部件）
  function skull() {
    Q.head(D, rig, P, o);
    const F = Q.headFrame(rig, o, P.jaw), [ex, ey] = rig.eye;
    U.dot(D, ex - 1, ey, m.ink, 0); U.dot(D, ex, ey + 1, m.ink, 0); U.dot(D, ex - 1, ey + 1, m.ink, 0); U.dot(D, ex, ey, P.eyes ? m.ink : m.eye, 3);
    const n = F.at(F.uT - 1.5, F.prof(F.uT - 1.5)[0] + 0.8); U.dot(D, n[0], n[1], m.ink, 0);
    if (P.crack) { const a = F.at(-F.W * 0.5, -F.Hh * 0.5), b = F.at(-F.W * 0.2, -F.Hh * 0.25); U.dot(D, a[0], a[1], m.limb, 1); U.dot(D, b[0], b[1], m.limb, 1); }
    if (P.jaw >= 2) for (let u = F.uc + 1; u < F.uT - 0.5; u += 1.5) { const p = F.at(u, F.prof(u)[2] + 1); U.dot(D, p[0], p[1], m.teeth, 3); }
  }
  // 候选部件：boneTail 尾椎（同复仇之龙的画法加粗：粗节 + 暗关节 + 棘突，尾尖一枚骨刺铲）
  function boneTail() {
    part(); const n = 12, sw = (P.tail | 0) * 0.16; let x = rig.tail.x, y = rig.tail.y, a = -0.3;
    for (let k = 0; k <= n; k++) {
      const q = k / n, r = lerp(1.8, 0.6, q);
      if ((k & 1) === 0) { U.disc(D, x, y, r, m.bone, 0); if (k < n - 1) U.dot(D, x, y - R(r) - 1, m.bone, 4); } else U.dot(D, x, y, m.bone, 1);
      a += 0.35 * q * 0.35 + sw * (0.25 + q) * 0.35; x -= Math.cos(a) * 1.5; y -= Math.sin(a) * 1.5; if (y > -0.5) { y = -0.5; a = 0; }
    }
    const ca = Math.cos(a), sa = Math.sin(a);                                     // 骨刺铲：沿尾向的菱形
    for (const [u, v, t] of [[1, 0, 3], [2, 0, 3], [3, 0, 4], [2, -1, 3], [2, 1, 2], [1, -1, 2], [1, 1, 2]]) U.dot(D, x - ca * u + sa * v, y - sa * u - ca * v, m.horn, t);
  }
  // 候选部件：boneLeg 骨腿（骨架四足：肩 / 髋一颗骨结，上段 2 格、下段 1 格的腿骨，关节骨结，3 格骨爪；几何同 quad.leg）
  function boneLeg(i) {
    part(); const L = rig.legs[i], mat = L.far ? m.far : m.limb, T = L.T, F = L.F;
    const dx = F[0] - T[0], dy = F[1] - T[1], d = Math.hypot(dx, dy) || 1, nx = -dy / d, ny = dx / d, bend = Math.sqrt(Math.max(0, L.L * L.L - d * d)) * 0.5;
    U.disc(D, T[0], T[1], 1.5, mat, 0);
    if (L.front) { const jx = T[0] + dx * 0.5 - nx * bend, jy = T[1] + dy * 0.5 - ny * bend; U.seg(D, T[0], T[1], jx, jy, 2, mat, 0); U.seg(D, jx, jy, F[0], F[1] - 0.5, 1, mat, 0); U.dot(D, jx + 1, jy, mat, 4); }
    else {
      const kx = T[0] + dx * 0.35 + nx * (-1.2 - bend * 0.4), ky = T[1] + dy * 0.35 + ny * (-1.2 - bend * 0.4), hx = T[0] + dx * 0.72 + nx * (1.2 + bend * 0.6), hy = T[1] + dy * 0.72 + ny * (1.2 + bend * 0.6);
      U.seg(D, T[0], T[1], kx, ky, 2, mat, 0); U.seg(D, kx, ky, hx, hy, 1, mat, 0); U.seg(D, hx, hy, F[0], F[1] - 0.5, 1, mat, 0); U.dot(D, kx + 1, ky, mat, 4); U.dot(D, hx - 1, hy, mat, 3);
    }
    const fx = R(F[0]), fy = R(F[1]); U.dot(D, fx - 1, fy, mat, 2); U.dot(D, fx, fy, mat, 3); U.dot(D, fx + 1, fy, mat, 3); U.dot(D, fx + 2, fy, m.claw, 3); U.dot(D, fx, fy - 1, mat, 3);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const wx = R(rig.C1.x - 5), sp = Q.span(rig, o, wx), wy = sp ? sp[0] : rig.wing.y;
    boneWing(wx + 3, wy - 1, P.wing, 1);
    boneLeg(0); boneLeg(1);
    boneTail(); cageFlame(); skeletonTorso();
    boneLeg(2); boneLeg(3);
    boneWing(wx, wy, P.wing, 0);
    vertebraNeck(); skull(); Q.horn(D, rig, P, o);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, chipAcc = 0, drainAcc = 0, lastGf = -9, drT = 9, bmT = 9, flT = 9;
  const DX = DUMMY_X, DY = HY - 14;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  const cageScr = () => { const c = cageAt(); return [scrX(R(c[0]) + P.bx), HY + R(c[1])]; };
  function onEnter(s) {
    if (s === CAST) {                                                           // 宽 3 格的冥霜吐息光束 + 翻滚的白骨片
      poseAt(CAST, 0, E.simT); const [mx, my] = mouthScr(); bmT = 0;
      releaseOrbit(30, 70, 0.2, 0.4, { pts: 1, to: [DX, DY, 4] });
      fx.beam(mx + 1, my, DX - 2, DY, 3, R_EL, 0.45, 2); fx.cross(mx + 1, my, 5, R_EL, 0.2, 2); ring(mx + 1, my, 1, R_EL);
      for (let i = 0; i < 12; i++) { const q = Math.random(); spawn(K_BURST, lerp(mx, DX - 4, q * 0.4), lerp(my, DY, q * 0.4) + (Math.random() - 0.5) * 3, 110 + Math.random() * 80, (DY - my) * 1.2 + (Math.random() - 0.5) * 20, 0.35 + Math.random() * 0.2, R_CHIP); }
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BREATH) {                                         // 细吐息：1 格光束 + 几片骨屑
      poseAt(ATTACK, t, E.simT); const [mx, my] = mouthScr(); bmT = 0;
      fx.beam(mx + 1, my, DX - 3, DY, 1, R_EL, 0.22, 2);
      for (let i = 0; i < 5; i++) spawn(K_BURST, mx + 2 + i * 4, lerp(my, DY, i / 12), 90 + Math.random() * 60, (DY - my) + (Math.random() - 0.5) * 10, 0.25 + Math.random() * 0.15, R_CHIP);
      burst(DX - 3, DY, 10, 30, 70, 0.15, 0.4, R_EL, 6); hitDummy(0, 1);
      sfx('swing', { kind: 'bite', w: 0.8 }); sfx('hit', { mat: 'magic', w: 0.5 });
    }
    if (s === CAST && t === T_HIT) {                                              // 冰封外罩 + 减速，开始抽魂
      burst(DX, DY, 20, 30, 90, 0.25, 0.5, R_EL, 10); ring(DX, DY, 1, R_EL);
      hitDummy(1, 1); dummyFx({ dur: 1.4, outline: R_EL, tint: R_EL, slow: 0.4 }); drT = 0; shake(0.12, 1);
      sfx('impact', { pal: 'frost', w: 0.9 });
    }
    if (s === RECOVER && t === T_FLARE) {                                         // 魂光回到笼里：魂焰一亮
      poseAt(RECOVER, t, E.simT); const [cx, cy] = cageScr(); flT = 0; burst(cx, cy, 12, 15, 45, 0.3, 0.55, R_SOUL, 6); ring(cx, cy, 0, R_SOUL);
      sfx('impact', { pal: 'frost', w: 0.4 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 5, 15, 40, 0.3, 0.5, R_SOUL, 8);
    if (s === DEATH && SEC_EV.indexOf(t) >= 0) {                                  // 一节骨头塌到地上：骨屑 + 尘土；肋骨笼那一节最重
      const k = SEC_EV.indexOf(t), x0 = XS0 + k * SECW, big = k === 4 || k === 6;
      for (let i = 0; i < (big ? 10 : 5); i++) { const lx = x0 + Math.random() * SECW; spawn(K_DUST, scrX(R(lx) + P.bx), HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, i & 1 ? FXI.dust : R_CHIP); }
      if (big) { shake(0.12, 1); sfx('fall', { w: k === 4 ? 0.9 : 0.6 }); }
    }
    if (s === DEATH && t === T_OUT) { poseAt(DEATH, t, E.simT); const [cx, cy] = cageScr(); burst(cx, cy + 3, 10, 8, 25, 0.4, 0.7, R_EL, 10); for (let i = 0; i < 6; i++) spawn(K_RISE, cx + (Math.random() - 0.5) * 6, cy + 2, (Math.random() - 0.5) * 4, -8 - Math.random() * 8, 0.8 + Math.random() * 0.5, R_SOUL); }
    if (s === DEATH && t === T_ASH) {                                              // 骨堆化灰：先把最后一帧烤好，交给死亡套件
      poseAt(DEATH, T_ASH - 1 / 12, T_ASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: R_ASH });
    }
  }
  const EVENTS = [[], [], [T_BREATH], [], [T_HIT], [T_FLARE], [INCOMING], SEC_EV.concat([T_OUT, T_ASH]), []];
  function stepFX(dt, state, stT) {
    const [mx, my] = mouthScr(), [cx, cy] = cageScr();
    if (state === MOVE && P.gf !== lastGf) {                                     // 爪落地 3–4 颗尘土 + 骨节咔咔
      if (P.gf === 0 || P.gf === 2) {
        const fx0 = scrX(R(rig.legs[P.gf === 0 ? 3 : 1].F[0])), fx1 = scrX(R(rig.legs[P.gf === 0 ? 0 : 2].F[0]));
        for (let i = 0; i < 4; i++) spawn(K_DUST, (i & 1 ? fx0 : fx1) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust);
        sfx('step', { w: 0.9 });
      }
      lastGf = P.gf;
    }
    if (state === CHARGE) {                                                      // 冰霜粒子螺旋吸进张开的下颌；笼缝透光
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 10, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, mx, my, (r - 2) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: -(5 + Math.random() * 3), tx: mx, ty: my }); }
      if (P.flame >= 2 && Math.random() < dt * 12) spawn(K_EMBER, cx + (Math.random() - 0.5) * 8, cy - 2, (Math.random() - 0.5) * 4, -6 - Math.random() * 6, 0.5 + Math.random() * 0.3, R_EL);
    }
    if (state === CAST) {                                                        // 光束里一路翻滚的骨片
      chipAcc += dt * 40; while (chipAcc >= 1) { chipAcc -= 1; const q = Math.random() * 0.3; spawn(K_BURST, lerp(mx + 2, DX, q), lerp(my, DY, q) + (Math.random() - 0.5) * 3, 120 + Math.random() * 60, (DY - my) * 1.5, 0.3 + Math.random() * 0.2, R_CHIP); }
    }
    if (drT < 0.7) {                                                             // 魂光沿光束倒流回肋骨笼
      drainAcc += dt * 30; const dx = DX - cx, dy = DY - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      while (drainAcc >= 1) { drainAcc -= 1; spawnX(K_SPIRAL_PT, cx, cy, (r - 1) / (0.45 + Math.random() * 0.2), 0, 9, R_SOUL, { a: a + (Math.random() - 0.5) * 0.08, r: r - Math.random() * 3, w: 0.3, tx: cx, ty: cy }); }
    }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 2 : 6); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, cx + R(Math.random() * 4 - 2), cy - 2, Math.random() * 4 - 2, -5 - Math.random() * 5, 0.5 + Math.random() * 0.4, Math.random() < 0.3 ? R_SOUL : R_EL); } }
    drT += dt; bmT += dt; flT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; chipAcc = 0; drainAcc = 0; lastGf = -9; drT = 9; bmT = 9; flT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.colF) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    if (bmT < 2 / 12 && P.dq < 1) { const [mx, my] = mouthScr(), c = bmT < 1 / 12 ? 21 : EL[1]; for (let r = 1; r <= 2; r++) { put(mx + 1, my - r, c); put(mx + 1, my + r, c); } put(mx + 2, my, c); }   // 口边寒光
    if (flT < 0.3 && P.dq < 1) { const [cx, cy] = cageScr(), L = flT < 0.1 ? 5 : 3; for (let r = 3; r <= L; r++) { const c = r <= 3 ? SL[0] : SL[1]; put(cx - r, cy, c); put(cx + r, cy, c); put(cx, cy - r, c); } }   // 魂焰一亮的星芒（从肋骨缝里透出）
  }

  return {
    name: '骨龙', HX, R_EL, R_HURT: R_CHIP, DUR, hero, P, GLOW_MATS: [m.flame, m.flameHot, m.glow, m.eye], HIT_POINT, EVENTS, deathKit: { mode: 'ash', at: T_ASH },
    SFX: { body: 'stone', how: 'collapse', pal: 'frost', style: 'beam', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
