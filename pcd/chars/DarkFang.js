// 暗牙（部队 · 虚空 · 祭司 · 稀有 · 近战；由黑剑进化）：标准健壮的金毛头狼，昂头站姿、金色蓬松颈圈毛、下颌两支下垂的黑剑牙、
//   额头后弯的黑弧刃（角根金环）、加宽的剑刃尾，金毛上 4 道紫色诅咒纹。
// 攻击：仰头短嚎，喷出一道紫色声波弧打向目标。技能「领袖光环」（伤害光环，代价是更脆）：仰头张嘴，脚下金色光环种子、金点螺旋吸入口中、
//   诅咒纹逐条亮起、颈毛竖起；施放长嚎——金色光环沿地面从自己脚下向身后扩散，依次罩住两名友军；
//   友军：金色描边 + 头顶一对金色獠牙印（伤害提高）+ 脚下紫色断续破绽圈（受到的伤害也提高）+ 头狼口中连向友军的金色虚线。
// 身体用 parts-beast 的 quad 拼；本模块画额弧刃、剑牙、刃尾（候选部件）、诅咒纹、死亡褪灰和特效。
PCD.define('DarkFang', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, death, allyPoints, allyFx } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.curse, EL = FXR[R_EL], GOLD = 14;                                            // 攻击 / 死亡：诅咒紫（声波边缘点缀金）
  const R_SK = fxRamp('darkFangAura', [21, 5, 14, 42, 52]), SK = FXR[R_SK];                     // 技能「领袖光环」：白 → 奶金 → 金 → 虚空紫 → 暗紫（金 = 增伤，紫尾 = 更脆）
  const R_FUR = fxRamp('darkFangFur', [5, 14, 19, 20, 20]);                                      // 受击金毛屑
  const m = B.mats(E, {
    main: 'gold', mane: [20, 62, 5, 21], belly: [20, 62, 5, 5], muz: [20, 14, 5, 5],              // 金毛 · 浅金颈圈毛 · 奶金腹线 / 吻
    blade: [0, 0, 27, 43], ring: [20, 14, 5, 21], eye: [0, 0, 43, 43], glow: [43, 43, 21, 21], teeth: 'white',
  });
  const M_MARK = E.defMat([52, 42, 24, 43], 1, 1);                                              // 诅咒纹：暗 42 · 亮 24 · 很亮 43
  const M_BLADEF = E.defMat([0, 0, 0, 27], 1);                                                   // 远侧剑牙
  const GREY = [8, 10, 18, 17], dk = (a) => [a[0], a[1], a[1], a[2]];                           // 死亡褪成的灰白
  const G_MAP = new Uint8Array(256);
  G_MAP[m.body] = E.defMat(GREY, 2); G_MAP[m.limb] = G_MAP[m.muz] = G_MAP[M_MARK] = G_MAP[m.eye] = E.defMat(GREY, 1); G_MAP[m.far] = E.defMat(dk(GREY), 1);
  G_MAP[m.mane] = G_MAP[m.belly] = E.defMat([8, 18, 17, 21], 1); G_MAP[m.ring] = E.defMat([8, 10, 18, 17], 1);
  const SHAPE = { len: 13, chest: 4.8, rump: 4, waist: 0.3, hump: 0.6, leg: 6.5, lw: 2, thigh: 2.4, farDx: -2, stride: 4, lift: 3,
    neck: 3.5, neckA: 0.85, neckW: 2.8, head: { type: 'canine', w: 7, h: 6, snout: 4.5, snH: 3.5, tip: 0.6, earH: 3 }, headA: 0.08,
    tail: 'thin', tailLen: 9, tailA: -0.25, tailCurl: 0.3, mane: 'ruff', maneLen: 3, foot: 'paw', fur: 1, m };
  const o = Q.shape(SHAPE), oB = Q.shape(Object.assign({}, SHAPE, { maneLen: 4.5 }));            // oB：颈毛竖起
  const TAILB = { len: 6, w: 3, up: 0.55, guard: 1 };                                             // 刃尾加宽：6 格长、根宽 3 格

  const HX = 58, DUR = DEFAULT_DUR.slice(), hero = new Sprite(112, 64, 54, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'spec', 'ring']) RIM.skip[m[k]] = 1; RIM.skip[M_MARK] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['mk', 0, 4], ['lv', 0, 2], ['bris', 0, 1], ['grey', 0, 7]]);
  const P = {}; Q.reset(P);
  const resetX = () => { P.mk = 4; P.lv = 0; P.bris = 0; P.grey = 0; };
  resetX();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'reach', 'glow', 'paw'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: -1, jaw: 0, ear: 0, tail: 0, mane: 0, reach: 0, glow: 0, paw: 0 };   // 站姿昂头
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12;
  const A_WIND = pose({ head: -2, pitch: 1, jaw: 1, mane: 1, glow: 1, bx: -1 });
  const A_HOWL = pose({ head: -2, pitch: 2, jaw: 3, mane: -1, tail: 1, glow: 2 });
  const A_HOLD = pose({ head: -1, pitch: 1, jaw: 2, glow: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_HIT, A_HOWL, 'snap'], [0.25, A_HOWL, 'lin'], [0.42, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_UP = pose({ head: -2, pitch: 2, jaw: 2, mane: 1, tail: 1, glow: 1 });
  const S_HOWL = pose({ head: -2, pitch: 3, jaw: 3, mane: -1, tail: 2, glow: 3 });
  // 待机个性「坐姿舔爪」：[crouch, pitch, head, paw, jaw, tail]，坐下 → 抬前爪 → 舔一下 → 剑刃尾拍地两次 → 起身
  const SIT = [[2, 3, -1, 0, 0, 0], [3, 6, 0, 0, 0, 1], [3, 6, 1, 2, 0, 1], [3, 6, 3, 3, 1, 0], [3, 6, 3, 3, 0, 0], [3, 6, 0, 1, 0, -2], [3, 6, 0, 0, 0, 1], [3, 6, -1, 0, 0, -2], [3, 6, -1, 0, 0, 0], [1, 2, -1, 0, 0, 0]];

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.head = -1;
    if (lp >= 1.4 - 1e-6 && lp < 2.2 - 1e-6) { const s = SIT[Math.min(9, f12of(lp - 1.4))]; P.crouch = s[0]; P.pitch = s[1]; P.head = s[2]; P.paw = s[3]; P.jaw = s[4]; P.tail = s[5]; P.bob = 0; }
  }
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  const tmp = {};
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P); resetX();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); P.head -= 2; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }        // 昂首阔步
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = tq >= 0.12 && tq < 0.34 ? 1 : 0; P.lv = tq >= T_HIT && tq < 0.34 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_UP, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_UP);
      P.lv = 1; P.mk = Math.min(4, Math.floor(tq / 0.3));                                            // 诅咒纹逐条亮起
      P.bris = tq >= 0.5 ? 1 : 0;
      if (tq > 0.45) P.glow = (f12 & 1) ? 2 : 1;
      if (tq > 1.1) P.mane = (f12 & 1) ? 1 : 0;
      P.rim = 2;
    } else if (st === CAST) {
      if (tq < 1 / 12) { E.mix(tmp, C_UP, S_HOWL, 0.5, F_ALL); apply(tmp); } else apply(S_HOWL);
      if (tq >= 0.25) P.bob = (f12 & 1) ? -1 : 0;                                                   // 长嚎：身体颤
      P.lv = 2; P.bris = 1; P.rim = 3;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_HOWL, pose({ head: 1, glow: 1 }), Math.min(1, q * 1.6), F_ALL); apply(tmp);   // 低头收声
      if (q > 0.62) { E.mix(tmp, pose({ head: 1 }), REST, (q - 0.62) / 0.38, F_ALL); apply(tmp); }
      P.lv = q < 0.3 ? 2 : 1; P.bris = q < 0.3 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;                    // 诅咒纹暗回 1 档
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h >= 0.35) P.head = -1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.ear = 1; P.tail = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.head = 1; }
      else if (d < 0.5) { P.bx = -2; P.crouch = 1; P.pitch = 2; P.head = -2; P.jaw = 3; P.eyes = 1; P.mane = 1; P.tail = 1; P.lv = 2; }   // 仰天长嚎
      else {
        P.lie = 2; P.bx = -3; P.eyes = 1; P.ear = 1; P.jaw = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tail = d < 0.9 ? 2 : d < 1.0 ? 1 : 0;
        P.lv = d < 0.9 && (f12 & 1) ? 1 : 0; P.mk = d < 1.0 ? 4 : 0;
        P.grey = d < 0.8 ? 0 : Math.min(7, 1 + Math.floor((d - 0.8) / 0.08));                       // 金毛从头到尾褪成灰白
        if (d >= T_ASH - INCOMING - 1e-6) P.dq = 1;                                                  // 之后交给死亡套件 ash
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.lv = tq > 0.85 ? 1 : 0; }
    rig = Q.rig(P, o);
    P.gx = R(rig.mouth[0]) + P.bx; P.gy = R(rig.mouth[1]);
    B.key(P, SPEC);
  }
  const T_ASH = INCOMING + 1.4;

  // ───── 画 ─────
  // 候选部件：刃尾 bladeTail（同黑剑模块）—— 细尾 + 尾梢上翘剑刃（根宽 c.w、长 c.len、可带 1 格护手），和尾同一个部件
  function bladeTail(E, rig, P, o, c) {
    E.part();
    const mm = o.m, n = o.tailLen, sw = (P.tail | 0) * 0.2, lie = rig.lie;
    let x = rig.tail.x, y = rig.tail.y, a = lie === 2 ? -0.05 : o.tailA, lx = x, ly = y, la = a;
    for (let k = 0; k <= n; k++) {
      const q = k / n; U.disc(E, x, y, k < 2 ? 1 : 0.5, mm.limb, 0); lx = x; ly = y; la = a;
      a += (o.tailCurl * q * 0.35) + sw * (0.25 + q) * 0.35;
      x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; }
    }
    const ba = la + c.up, dx = -Math.cos(ba), dy = -Math.sin(ba), nx = -dy, ny = dx, x0 = lx + dx, y0 = ly + dy;
    for (let s = 0; s <= c.len; s += 0.5) {
      const wk = Math.max(1, Math.ceil(c.w * (1 - s / (c.len + 0.5)))), cx = x0 + dx * s, cy = y0 + dy * s;
      for (let j = 0; j < wk; j++) { const off = j - (wk - 1) / 2; U.dot(E, cx + nx * off, cy + ny * off, mm.blade, s >= c.len - 0.5 ? 4 : 0); }
    }
    if (c.guard) { const g = c.w * 0.5 + 0.9; U.dot(E, lx + nx * g, ly + ny * g, mm.ring || mm.blade, 4); U.dot(E, lx - nx * g, ly - ny * g, mm.ring || mm.blade, 3); }
    return [x0 + dx * c.len, y0 + dy * c.len];
  }
  // 候选部件：额刃角 browBlade（同黑剑模块）—— 头部局部坐标里的折线刃，前半 2 格粗、后半 1 格；ring = 角根金环材质（压 2 格）
  function browBlade(E, F, pts, mat, ring) {
    E.part();
    const W = pts.map(([u, v]) => F.at(u, v)); let L = 0; for (let i = 1; i < W.length; i++) L += Math.hypot(W[i][0] - W[i - 1][0], W[i][1] - W[i - 1][1]);
    let acc = 0;
    for (let i = 1; i < W.length; i++) { const a = W[i - 1], b = W[i], sl = Math.hypot(b[0] - a[0], b[1] - a[1]); U.seg(E, a[0], a[1], b[0], b[1], acc + sl * 0.5 < L * 0.45 ? 2 : 1, mat, 0); acc += sl; }
    const t = W[W.length - 1]; U.dot(E, t[0], t[1], mat, 4);
    if (ring) { const a = W[0], b = W[1], ux = (b[0] - a[0]) / Math.hypot(b[0] - a[0], b[1] - a[1]), uy = (b[1] - a[1]) / Math.hypot(b[0] - a[0], b[1] - a[1]); for (let s = 0.6; s <= 1.8; s += 0.6) { U.dot(E, a[0] + ux * s, a[1] + uy * s, ring, s < 1 ? 4 : 3); U.dot(E, a[0] + ux * s + 1, a[1] + uy * s, ring, 3); } }
  }
  // 候选部件：剑牙 saberFangs —— 挂在上颌前段的两支下垂长牙（伸出下巴 len 格），近侧 1–2 格粗、远侧暗一级；张嘴时仍挂在上颌。自己一个部件
  function saberFangs(E, F, mat, matF, len) {
    E.part();
    for (const [du, mm, extra] of [[2.9, matF, 0], [1.3, mat, 1]]) {
      const u = F.uT - du, v0 = F.prof(u)[2], v1 = F.bot(u) + len - (mm === matF ? 1 : 0);
      for (let v = v0; v <= v1; v += 0.5) { const p = F.at(u - (v - v0) * 0.12, v); U.dot(E, p[0], p[1], mm, v >= v1 - 0.5 ? 4 : 0); if (extra && v < v0 + 2.5) U.dot(E, p[0] - 1, p[1], mm, 0); }
    }
  }
  function curseMarks() {                                                                          // 诅咒纹：紧跟躯干画（同一个部件），4 道折线
    const C1 = rig.C1, C2 = rig.C2;
    [0.18, 0.42, 0.64, 0.86].forEach((f, i) => {
      const x = R(C2.x + (C1.x - C2.x) * f), s = Q.span(rig, o, x); if (!s || s[1] - s[0] < 5) return;
      const lit = i < P.mk ? P.lv : 0, t = lit === 2 ? 4 : lit === 1 ? 3 : 2, y = s[0] + 2;
      U.dot(E, x, y, M_MARK, t); U.dot(E, x - 1, y + 1, M_MARK, t); U.dot(E, x, y + 2, M_MARK, t); if (s[1] - s[0] > 6) U.dot(E, x - 1, y + 3, M_MARK, t);
    });
  }
  function hornPts(F) { const W = F.W, H = F.Hh; return [[0.2 * W, -H + 0.3], [0.45 * W, -H - 2.3], [0.1 * W, -H - 4.6], [-0.7 * W, -H - 6.2], [-1.3 * W, -H - 6.4]]; }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lieLegs = P.lie === 2;
    if (!lieLegs) Q.legs(E, rig, P, o, 1);
    bladeTail(E, rig, P, o, TAILB);
    Q.body(E, rig, P, o); curseMarks();
    if (!lieLegs) Q.legs(E, rig, P, o, 0);
    Q.mane(E, rig, P, P.bris ? oB : o);
    Q.head(E, rig, P, o);
    const F = Q.headFrame(rig, o);
    saberFangs(E, F, m.blade, M_BLADEF, 3);
    browBlade(E, F, hornPts(F), m.blade, m.ring);
    if (lieLegs) { Q.legs(E, rig, P, o, 1); Q.legs(E, rig, P, o, 0); }
    if (P.grey) {                                                                                   // 褪灰：从头（前）往尾（后）逐列换成灰白材质
      const thr = 22 - P.grey * 7, S = hero, base = S.ox + P.bx;
      for (let y = 0; y < S.h; y++) for (let x = 0; x < S.w; x++) { const i = y * S.w + x, g = G_MAP[S.mat[i]]; if (g && x - base >= thr) S.mat[i] = g; }
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const T_A1 = 2 / 12, T_A2 = 3 / 12, ALLY_X = [HX - 36, HX - 50], AURA_V = 188, AURA_MAX = 54;   // 光环前沿 2/12 s 到近侧友军、3/12 s 到远侧友军
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, lastTail = 0, mzT = 9, mzX = 0, mzY = 0, auraT = 9, sealT = [9, 9], seedT = 9, sparkAcc = 0;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CHARGE) seedT = 0;                                                                   // 脚下金色光环种子（fxBack 画）
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = mouthScr();
      const a0 = allyPoints()[0];                                                                   // 不打敌人：汇聚的金点全部飞向身后友军，外爆只在头后方
      releaseOrbit(40, 90, 0.3, 0.6, { to: [a0.x, a0.mid, 3] }); burst(gx - 6, gy - 1, 18, 20, 60, 0.2, 0.35, R_SK, 10); ring(gx - 4, gy, 0, R_SK);
      fx.cross(gx + 1, gy, 5, R_SK, 0.25); auraT = 0; shake(0.28, 2); flash(0.05);
    }
  }
  function lightAlly(k, w) {                                                                       // 光环前沿罩住第 k 名友军
    const a = allyPoints()[k], [gx, gy] = mouthScr(); sealT[k] = 0;
    burst(a.x, a.mid - 2, 12, 20, 60, 0.2, 0.45, R_SK, 14); fx.cross(a.x, a.top - 4, 3, R_SK, 0.25);
    fx.link(gx - 2, gy, a.x + 1, a.top - 2, R_SK, 1.1, 1); sfx('impact', { pal: 'curse', w });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [gx, gy] = mouthScr(), tx = DUMMY_X - 5, ty = HY - 18;
      E.shoot(1, gx + 2, gy, 150, tx, R_EL, (ty - gy) * 150 / (tx - gx - 2), { trail: { every: 3, life: [0.1, 0.2] } });
      mzT = 0; mzX = gx; mzY = gy; burst(gx + 1, gy, 5, 20, 50, 0.15, 0.3, R_EL, 0);
      sfx('swing', { kind: 'bite', w: 0.3 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_A1) lightAlly(0, 0.4);
    if (s === CAST && t === T_A2) { lightAlly(1, 0.55); allyFx({ dur: 1.0, outline: R_SK }); shake(0.12, 1); }   // 两名友军都进了光环：金色描边
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 6, 30, 80, 0.2, 0.4, R_FUR, 12);
    if (s === DEATH && t === INCOMING + 0.35) { const [gx, gy] = mouthScr(); ring(gx, gy, 0, R_EL); burst(gx, gy, 8, 20, 60, 0.3, 0.6, R_EL, 10); }   // 最后一声长嚎
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 36, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.5 });
    }
    if (s === DEATH && t === T_ASH) {                                                               // 化灰：交给死亡套件（从头顶开始化成灰被风吹散）
      poseAt(DEATH, T_ASH - 1 / 60, T_ASH - 1 / 60); drawHero(); bakeHero(); death.start('ash', { ramp: 'dust' }); hero.k1 = hero.k2 = -1;
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_A1, T_A2], [], [INCOMING], [INCOMING + 0.35, INCOMING + 0.66, T_ASH], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 10, 40, 90, 0.15, 0.35, R_EL, 8); fx.cross(x - 1, y, 3, R_EL, 0.2, 2); hitDummy(0, 1); sfx('hit', { mat: 'magic', w: 0.3 }); }
  }
  function stepFX(dt, state, stT) {
    const [gx, gy] = mouthScr();
    if (state === CHARGE) {                                                                        // 地面浮起的金点螺旋吸入口中
      chargeAcc += dt * (18 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = 0.5 + Math.random() * 2.1, r = 14 + Math.random() * 8; spawnX(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.35), 0, 9, R_SK, { a, r, w: -(3 + Math.random() * 3), sz: Math.random() < 0.2 ? 2 : 1 }); }
    }
    if (state === CAST && auraT < 0.3) {                                                           // 光环前沿扫过的地面溅起金点
      sparkAcc += dt * 70;
      while (sparkAcc >= 1) { sparkAcc -= 1; const r = Math.min(AURA_MAX, 4 + auraT * AURA_V), x = HX - r + (Math.random() - 0.5) * 3; spawn(K_EMBER, x, FLOOR - 1, (Math.random() - 0.5) * 8, -10 - Math.random() * 12, 0.35 + Math.random() * 0.25, R_SK); }
    }
    if (state === RECOVER && Math.random() < dt * 10) { const a = allyPoints()[Math.random() < 0.5 ? 0 : 1]; spawn(K_EMBER, a.x + (Math.random() - 0.5) * 8, HY - 2 - Math.random() * 10, (Math.random() - 0.5) * 6, -8 - Math.random() * 6, 0.5 + Math.random() * 0.3, R_SK); }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(P.gf === 0 ? 8 : -6) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -4 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); sfx('step', { w: 0.45 }); }
      lastGf = P.gf;
    }
    if (state === IDLE && P.tail === -2 && lastTail !== -2) for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(-16) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25 + Math.random() * 0.15, FXI.dust);   // 刃尾拍地
    lastTail = P.tail;
    if ((state === RECOVER || (state === IDLE && P.lv)) && Math.random() < dt * 8) spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.5 + Math.random() * 0.3, state === RECOVER ? R_SK : R_EL);
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 34, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt; auraT += dt; seedT += dt; sealT[0] += dt; sealT[1] += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; lastTail = 0; mzT = 9; auraT = 9; seedT = 9; sealT[0] = sealT[1] = 9; sparkAcc = 0; }
  function dotEllipse(cx, cy, rx, ry, c, step, phase, broken, f12, xMax) {                       // 地面点阵椭圆（xMax 以右不画：不碰到假人）
    const n = Math.max(8, Math.ceil(rx * 2.4));
    for (let k = 0; k < n; k++) {
      if (step > 1 && ((k + phase) % step)) continue; if (broken && ((k + f12) % 4) === 3) continue;
      const a = k / n * 6.2832, x = R(cx + Math.cos(a) * rx); if (xMax != null && x > xMax) continue; put(x, R(cy + Math.sin(a) * ry), c);
    }
  }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx) - 6, P.rim, SK, f12);                          // 只在技能里 rim ≥ 2；中心后移 6 格，映光不伸到假人脚下
    if (E.state === CHARGE && seedT < 1.5) {                                                       // 光环种子：脚下金色点阵圈随蓄力变亮、变宽
      const q = clamp01(seedT / 1.2), rx = 12 + R(q * 8), c = q < 0.4 ? SK[3] : q < 0.8 ? SK[2] : SK[1];
      dotEllipse(HX, FLOOR, rx, 2, c, 2, f12 >> 1, false, f12); if (q >= 0.8) dotEllipse(HX, FLOOR, rx - 3, 1, SK[3], 3, f12, false, f12);
    }
    if (auraT < 0.45) {                                                                            // 施放：光环沿地面从脚下向外推开（前沿亮、后沿暗）
      const r = Math.min(AURA_MAX, 4 + auraT * AURA_V), done = r >= AURA_MAX, c = auraT < 1 / 12 ? SK[0] : done ? SK[2] : SK[1];
      dotEllipse(HX, FLOOR, r, 2 + r * 0.06, c, 1, 0, done, f12, DUMMY_X - 12);
      if (r > 8) dotEllipse(HX, FLOOR, r - 5, 1 + r * 0.05, done ? SK[3] : SK[2], 2, f12, false, f12, DUMMY_X - 14);
    }
    for (let k = 0; k < 2; k++) {                                                                  // 友军脚下紫色断续破绽圈：受到的伤害也提高
      const t = sealT[k]; if (t > 1.1 || (t > 0.8 && (f12 & 1))) continue; const a = allyPoints()[k];
      dotEllipse(a.x, FLOOR, 10, 2, t < 1 / 12 ? 21 : EL[1], 2, f12 >> 1, true, f12); dotEllipse(a.x, FLOOR, 7, 1, EL[2], 3, f12, false, f12);   // 借攻击的诅咒紫（只读）
    }
  }
  function arc(x, y, r, a0, a1, c, edge, f12, broken) {                                           // 朝右的声波弧：紫色弧身 + 外沿隔点金边
    const n = Math.max(4, Math.ceil(r * (a1 - a0) * 1.4));
    for (let k = 0; k <= n; k++) {
      if (broken && ((k + f12) % 4) === 3) continue; const a = a0 + (a1 - a0) * k / n, px = R(x + Math.cos(a) * r), py = R(y + Math.sin(a) * r);
      put(px, py, c); if (edge && (k % 3 === 0 || k === 0 || k === n)) put(px + 1, py, edge);
    }
  }
  function fxFront(f12) {
    for (let k = 0; k < 2; k++) {                                                                  // 友军头顶一对金色獠牙印（伤害提高）：升起 3 格后悬停，末段闪烁褪去
      const t = sealT[k]; if (t > 1.1 || (t > 0.8 && (f12 & 1))) continue;
      const a = allyPoints()[k], x = a.x, y = a.top - 8 - Math.min(3, Math.floor(t * 12)), hot = t < 1 / 12, c1 = hot ? SK[0] : SK[2], c2 = hot ? SK[0] : SK[1];
      for (let dx = -3; dx <= 3; dx++) put(x + dx, y, c1);                                           // 牙根横梁 7 格
      for (const sd of [-1, 1]) {                                                                    // 两支下垂獠牙：根 2 格粗 → 1 格 → 牙尖向内收 1 格
        put(x + sd * 3, y + 1, c2); put(x + sd * 2, y + 1, c2); put(x + sd * 3, y + 2, c2); put(x + sd * 2, y + 2, c2);
        put(x + sd * 2, y + 3, c2); put(x + sd, y + 4, hot ? SK[0] : SK[3]);
      }
      if (t < 0.5 && ((f12 >> 1) & 1)) put(x, y - 1, SK[0]);                                         // 横梁上一颗闪点
      if (t >= 1 / 12 && t < 3 / 12) { const c = EL[1]; put(a.x, a.mid - 3, c); put(a.x - 1, a.mid - 2, c); put(a.x, a.mid - 1, c); put(a.x + 1, a.mid, c); put(a.x, a.mid + 1, c); }   // 胸口紫色裂纹闪：更脆
    }
    if (mzT < 2 / 12) { const first = mzT < 1 / 12; arc(mzX, mzY, first ? 2 : 4, -0.9, 0.9, first ? EL[0] : EL[2], first ? GOLD : 0, f12, !first); }   // 出手：嘴前一小道声波
    if (E.state === CHARGE && P.glow >= 2 && !P.lie) { const [gx, gy] = mouthScr(); for (let r = 2; r <= 3 + (f12 & 1); r++) { put(gx + r, gy, SK[1]); put(gx, gy - r, SK[2]); put(gx, gy + r, SK[2]); } }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                                         // 声波弧弹道：) 形紫弧 + 金色两端
    if (k !== 1) return false;
    for (let j = -3; j <= 3; j++) { const dx = R(Math.abs(j) * Math.abs(j) * -0.25); put(x + dx, y + j, Math.abs(j) < 2 ? Rr[0] : Rr[1]); put(x + dx - 2, y + j, Rr[2]); }
    put(x - 2, y - 3, GOLD); put(x - 2, y + 3, GOLD); return true;
  }

  return {
    name: '暗牙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye, M_MARK], HIT_POINT, EVENTS, deathKit: { mode: 'ash', at: T_ASH }, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'beast', how: 'dissolve', pal: 'curse', style: 'buff', w: 0.5 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
