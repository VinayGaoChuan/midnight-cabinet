// 四眼（敌人 · 野兽 · 稀有 · 远程 680）：蹲坐的指猴怪——一对巨大的蝙蝠式圆耳向两侧外张、脸上 2×2 四只发光紫眼、
//   右前爪一根比前臂还长的弯骨中指（指向目标）、稀毛长尾卷成问号；煤黑乱毛带白色针毛尖。
// 攻击 = 骨指一点，四只眼同时射出四道细光在指尖汇成一束打向目标；技能 = 特性「死亡凝视」生效：四眼逐只亮起锁定目标，
//   目标身上的紫色眼形印记一层层叠加（1 → 4 个同心紫环缩紧），第 4 层爆开。死亡 = 四眼按 1-2-3-4 逐个熄灭、从脚到头石化、碎成紫黑碎块。
// 身体用 parts-beast 的 quad（cat 头放大成指猴头、蹲坐）；本模块画蝠耳、四眼、骨指、问号尾（候选部件）、石化碎裂和特效。
PCD.define('FourEyes', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, gait, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  // 死亡凝视 · 诅咒紫：21 白 → 43 淡紫 → 24 紫 → 42 深紫 → 52 墨紫（FXI.curse 的色，前面补上白：爆发帧最亮的一刻）
  const R_EL = fxRamp('fourEyesGaze', [21, 43, 24, 42, 52]), EL = FXR[R_EL];
  const R_FUR = fxRamp('fourEyesFur', [18, 10, 9, 52, 0]);                                     // 受击飞出的黑毛屑
  const R_STONE = fxRamp('fourEyesStone', [18, 10, 53, 52, 0]);                                // 石化碎屑
  const m = B.mats(E, {
    main: [0, 52, 9, 10], limb: [0, 52, 10, 18],                                              // 煤黑乱毛：墨勾线 · 墨紫暗 · 石灰紫基 · 亮（头与四肢亮一级，脸上四眼读得出）
    ear: 'pink', bone: 'bone', nose: 'skinDark', teeth: 'white', bristle: 'white', claw: 'bone',
    eye: [25, 42, 43, 21], glow: [42, 43, 21, 21],                                             // 四眼：熄灭 25 · 暗 42 · 亮 43 · 最亮 21（平涂）
  });
  const M_CRACK = E.defMat([52, 25, 42, 24], 1, 1);                                             // 石化裂纹（平涂深紫）
  const STONE = [52, 10, 18, 17], dk = (a) => [a[0], a[1], a[1], a[2]];                        // 石化：紫黑勾线 · 深紫暗 · 灰紫基 · 灰白亮
  const G_MAP = new Uint8Array(256);
  G_MAP[m.body] = E.defMat(STONE, 2); G_MAP[m.limb] = G_MAP[m.ear] = G_MAP[m.nose] = E.defMat(STONE, 1); G_MAP[m.far] = E.defMat([52, 53, 10, 18], 1);
  G_MAP[m.bone] = G_MAP[m.claw] = G_MAP[m.bristle] = G_MAP[m.teeth] = E.defMat([52, 10, 18, 17], 1); if (m.boneFar) G_MAP[m.boneFar] = E.defMat([52, 53, 10, 18], 1);
  G_MAP[m.eye] = G_MAP[m.glow] = E.defMat([52, 25, 53, 53], 1, 1);
  const SHAPE = { len: 9, chest: 3.6, rump: 4.4, waist: 0.6, hump: 0, leg: 5, lw: 1, thigh: 2.8, farDx: -2, stride: 2, lift: 2, foot: 'claw',
    neck: 2.6, neckA: 1.0, neckW: 2, head: { type: 'cat', w: 8.5, h: 7.5, snout: 2, snH: 4, tip: 0.7, ear: 'none', nose: 'dot', teeth: 1 }, headA: 0.1,
    tail: 'none', mane: 'none', fur: 1, m };
  const o = Q.shape(SHAPE);

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 50, 40, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'bone', 'boneFar', 'bristle', 'ear', 'teeth', 'claw', 'ink']) if (m[k]) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['e1', 0, 3], ['e2', 0, 3], ['e3', 0, 3], ['e4', 0, 3], ['look', -1, 1], ['fing', 0, 3], ['hop', -1, 3], ['stone', 0, 9], ['crack', 0, 1]]);
  const P = {}; Q.reset(P);
  const resetX = () => { P.e1 = P.e2 = P.e3 = P.e4 = 1; P.look = 0; P.fing = 0; P.hop = -1; P.stone = 0; P.crack = 0; };
  resetX();
  let rig = null;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'reach', 'paw', 'fing'];
  const REST = { bx: 0, crouch: 1, pitch: 2, head: 0, jaw: 0, ear: 0, tail: 0, reach: 0, paw: 0, fing: 0 };   // 蹲坐：后腿蹲着、前身抬起
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12;
  const A_WIND = pose({ crouch: 2, head: 1, paw: 1, fing: 1, tail: -1 });                       // 低头盯住，爪子抬起
  const A_POINT = pose({ crouch: 1, pitch: 3, paw: 2, reach: 1, fing: 2, tail: 1 });             // 骨指一点
  const A_HOLD = pose({ pitch: 3, paw: 2, reach: 1, fing: 2 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_HIT, A_POINT, 'snap'], [0.3, A_POINT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOCK = pose({ crouch: 1, pitch: 3, head: -1, paw: 2, reach: 1, fing: 2, tail: 1, ear: 0 });   // 锁定：抬头、骨指指向目标
  const S_GAZE = pose({ crouch: 0, pitch: 3, head: 0, paw: 2, reach: 2, fing: 3, jaw: 1, tail: 2 });   // 施放：骨指伸直，张嘴
  // 待机个性「张望」（1.6–2.0 s，5 帧）：[look, head, 闭上的眼, fing]——头左右快速转、四只眼轮流眨、骨指敲地两下
  const PEEK = [[1, 0, 1, 1], [-1, -1, 2, 0], [1, 0, 3, 1], [-1, 1, 4, 0], [0, 0, 0, 0]];
  // 蹲跳步态（4 帧）：[crouch, pitch, lift, head, tail]；腿的落点在 rigOf 里按 hop 改
  const HOP = [[2, 1, 0, 1, -1], [0, 3, 1, 0, 0], [0, 1, 3, -1, 1], [1, 0, 1, 0, 0]];
  //          近前 [dx, 脚高] · 远前 · 近后 · 远后（dx 相对站姿落点，脚高 0 = 着地，负 = 离地）
  const HOPF = [
    [[1, 0], [0, 0], [2, 0], [1, 0]],                                                          // 0 收腿：后脚收到腹下、前脚着地
    [[2, -2], [1, -1], [-3, 0], [-4, 0]],                                                      // 1 后蹬：后腿伸直蹬地、前爪离地
    [[3, -3], [2, -3], [-3, -2], [-4, -1]],                                                    // 2 腾空：前爪前伸、后腿拖在后面
    [[2, 0], [1, -1], [0, -2], [-1, -2]],                                                      // 3 前爪落地：后腿收起
  ];
  function rigOf() {
    const r = Q.rig(P, o);
    if (P.hop >= 0 && !r.lie) {
      const hf = HOPF[P.hop], idx = [3, 1, 2, 0];                                               // legs 顺序：远后、远前、近后、近前
      for (let j = 0; j < 4; j++) {
        const L = r.legs[idx[j]], T = L.T; let fx = L.F[0] + hf[j][0], fy = hf[j][1];
        const d = Math.hypot(fx - T[0], fy - T[1]); if (d > L.L) { fx = T[0] + (fx - T[0]) * L.L / d; fy = T[1] + (fy - T[1]) * L.L / d; }
        L.F = [fx, fy]; L.up = fy < -0.5;
      }
    }
    return r;
  }
  rig = rigOf();
  const HIT_POINT = rig.hit;
  function eyesTo(v) { P.e1 = P.e2 = P.e3 = P.e4 = v; }
  function setEye(k, v) { P['e' + k] = v; }
  function idle(tq, f12) {
    apply(REST); const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0 - 1e-6) { const s = PEEK[Math.min(4, f12of(lp - 1.6))]; P.look = s[0]; P.head = s[1]; if (s[2]) setEye(s[2], 3); P.fing = s[3]; P.bob = 0; }
  }
  function apply(src) { for (const f of F_ALL) if (src[f] != null) P[f] = R(src[f]); }
  const tmp = {};
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P); resetX(); P.st = st;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 蹲跳：后腿一蹬整个身子往前跳一小段，前爪着地
      const f = gait(tq), h = HOP[f]; apply(REST); P.hop = f; P.crouch = h[0]; P.pitch = h[1]; P.lift = h[2]; P.head = h[3]; P.tail = h[4]; P.fing = f === 2 ? 1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = tq >= 0.1 && tq < 0.4 ? 2 : 1;
      eyesTo(tq >= 0.08 && tq < 0.42 ? 2 : 1);
    } else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOCK, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_LOCK);
      for (let k = 1; k <= 4; k++) setEye(k, tq >= 0.1 + 0.3 * (k - 1) - 1e-6 ? 2 : 1);           // 四只眼逐一亮起（每 0.3 s 一只）
      if (tq > 1.1) P.ear = (f12 & 1) ? 1 : 0;                                                  // 蓄满：耳朵抖
      P.rim = 2;
    } else if (st === CAST) {
      if (tq < 1 / 12) { E.mix(tmp, C_LOCK, S_GAZE, 0.5, F_ALL); apply(tmp); } else apply(S_GAZE);
      eyesTo(2); if (tq >= 0.25) P.bob = (f12 & 1) ? -1 : 0; P.rim = 3;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_GAZE, REST, q, F_ALL); apply(tmp);
      for (let k = 1; k <= 4; k++) setEye(k, tq < 0.08 + 0.1 * k ? 2 : 1);                      // 眼一只只暗下
      P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { apply(REST); Q.anim.hurt(P, h); P.crouch = Math.max(P.crouch, 1); if (P.eyes) eyesTo(3); if (h >= 0.35) P.eyes = 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { apply(REST); P.bx = -2; P.ear = 1; P.tail = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.head = -1; eyesTo((f12 & 1) ? 2 : 1); }
      else {                                                                                   // 定住：四眼 1-2-3-4 逐个熄灭（先闪亮一下）→ 从脚到头石化 → 裂开
        apply(pose({ bx: -2, crouch: 2, pitch: 1, head: 1, jaw: 1, ear: 1, tail: -1 }));
        for (let k = 1; k <= 4; k++) { const tk = 0.36 + 0.12 * (k - 1); setEye(k, d < tk - 1 / 12 + 1e-6 ? 1 : d < tk + 1e-6 ? 2 : 0); }
        P.stone = d < 0.45 ? 0 : Math.min(9, 1 + Math.floor((d - 0.45) / 0.05 + 1e-6));
        P.crack = d >= 1.0 - 1e-6 ? 1 : 0;
        if (d >= T_SH - INCOMING - 1e-6) P.dq = 1;                                              // 之后交给死亡套件 chunks
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = rigOf();
    const g = eyeCenter(); P.gx = g[0] + P.bx; P.gy = g[1];
    B.key(P, SPEC);
  }
  const T_SH = INCOMING + 1.25;

  // ───── 几何（画和特效共用一份）─────
  const EYE_UV = [[-0.3, -1.9], [2.4, -1.9], [-0.3, 0.7], [2.4, 0.7]];                          // 四眼 2×2 方阵：头部局部坐标（u 朝前、v 朝下）
  function eyePts() { const F = Q.headFrame(rig, o, P.jaw), s = P.look * 0.7; return EYE_UV.map(([u, v]) => { const p = F.at(u + s, v); return [R(p[0]), R(p[1])]; }); }
  function eyeCenter() { const e = eyePts(); return [R((e[0][0] + e[3][0]) / 2 + 0.5), R((e[0][1] + e[3][1]) / 2)]; }
  const FING = [[0.05, 0.4, 4, 4], [-0.35, 0.3, 4, 4], [-0.28, 0.12, 4, 4], [-0.2, 0, 5, 4]];     // fing 档：[近节角, 远节再弯, 近节长, 远节长]；0 贴地前伸 · 1 抬起 · 2 指向目标 · 3 伸直
  function fingerPts() {
    const L = rig.legs[3], f = FING[P.fing | 0], x0 = L.F[0] + 1.6, y0 = L.F[1] - 1;
    const x1 = x0 + Math.cos(f[0]) * f[2], y1 = y0 + Math.sin(f[0]) * f[2], a2 = f[0] + f[1], x2 = x1 + Math.cos(a2) * f[3], y2 = y1 + Math.sin(a2) * f[3];
    return [[x0, y0], [x1, y1], [x2, y2]];
  }

  // ───── 画 ─────
  // 候选部件：batEar —— 蝙蝠式大圆耳：头部局部坐标里的一片椭圆耳廓（长 3.4、宽 2.3），近侧耳露出粉色内耳；远侧耳暗一级、画在头之前。a = 耳朝向（0 朝右、负 = 朝上）
  function batEar(F, far, a) {
    E.part();
    const b = far ? F.at(-F.W * 0.55, -F.Hh + 0.5) : F.at(-F.W * 0.05, -F.Hh + 0.6), ca = Math.cos(a), sa = Math.sin(a), rl = 3.4, rw = 2.3;
    const cx = b[0] + ca * (rl + 0.4), cy = b[1] + sa * (rl + 0.4), mat = far ? m.far : m.limb;
    for (let y = Math.floor(cy - 5); y <= Math.ceil(cy + 5); y++) for (let x = Math.floor(cx - 5); x <= Math.ceil(cx + 5); x++) {
      const dx = x - cx, dy = y - cy, u = dx * ca + dy * sa, v = -dx * sa + dy * ca;
      if ((u * u) / (rl * rl + 0.3) + (v * v) / (rw * rw + 0.3) > 1) continue;
      const inner = !far && ((u + 0.5) * (u + 0.5)) / ((rl - 1.2) * (rl - 1.2)) + ((v - 0.2) * (v - 0.2)) / ((rw - 1) * (rw - 1)) <= 1;
      U.dot(E, x, y, inner ? m.ear : mat, inner ? (u > 0.8 ? 3 : 0) : 0);
    }
    for (let k = 0; k <= 2; k++) U.dot(E, b[0] + ca * k, b[1] + sa * k, mat, 0);                  // 耳根
  }
  // 四眼：紧跟 Q.head 画（同一个部件），先把头部默认的单眼抹成毛色。e = 0 熄灭 · 1 暗光 · 2 亮 · 3 闭眼
  const EYE_TONE = [[1, 1], [3, 2], [4, 3]];
  function fourEyes() {
    const ey = rig.eye; for (const [dx, dy] of [[0, 0], [-1, 0], [-1, -1], [0, -1]]) U.dot(E, ey[0] + dx, ey[1] + dy, m.limb, 0);
    const pts = eyePts(), ev = [P.e1, P.e2, P.e3, P.e4];
    pts.forEach(([x, y], i) => {
      const e = P.eyes ? 3 : ev[i];
      if (e === 3) { U.dot(E, x, y, m.limb, 1); U.dot(E, x + 1, y, m.limb, 1); return; }        // 闭眼：一道眼缝
      const t = EYE_TONE[e]; U.dot(E, x, y, e === 2 ? m.glow : m.eye, t[0]); U.dot(E, x + 1, y, m.eye, t[1]);
    });
  }
  // 背上的白色针毛尖：紧跟躯干画（同一个部件），沿背线每 3 列一撮，隔一撮伸出轮廓 1 格
  function bristles() {
    const C1 = rig.C1, C2 = rig.C2;
    for (let x = R(C2.x - C2.r * 0.6), k = 0; x <= R(C1.x + 1); x += 3, k++) {
      const s = Q.span(rig, o, x); if (!s) continue; U.dot(E, x, s[0], m.bristle, 2); if (k & 1) U.dot(E, x - 1, s[0] - 1, m.bristle, 3);
    }
  }
  // 候选部件：hookTail —— 稀毛长尾：1 格细尾先往后上扬、再向前卷成问号，根部 2 格粗；每 3 节一撮白针毛（尾摆 P.tail 让尾梢滞后）
  function hookTail() {
    E.part();
    const sw = (P.tail | 0) * 0.12, pts = []; let x = rig.tail.x, y = rig.tail.y, a = 0.75 - sw;
    for (let k = 0; k <= 13; k++) { pts.push([x, y]); a += (k >= 6 ? 0.44 : 0.06) + sw * (k >= 6 ? 0.6 : 0); x -= Math.cos(a); y -= Math.sin(a); if (y > -1) { y = -1; } }
    for (let k = 1; k < pts.length; k++) U.seg(E, pts[k - 1][0], pts[k - 1][1], pts[k][0], pts[k][1], k < 3 ? 2 : 1, m.limb, 0);
    for (let k = 3; k < pts.length - 1; k += 3) { const p = pts[k], q = pts[k + 1], dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy) || 1; U.dot(E, p[0] + dy / l * 1.2, p[1] - dx / l * 1.2, m.bristle, 2); }
    const e = pts[pts.length - 1]; U.dot(E, e[0], e[1], m.bristle, 3);
  }
  // 候选部件：boneFinger —— 从爪尖伸出的细长骨中指：近节 + 远节两段 1 格骨，关节 1 格骨节凸起，指尖 1 格亮指甲；比前臂还长
  function boneFinger() {
    E.part();
    const [p0, p1, p2] = fingerPts(), mat = m.bone;
    U.seg(E, p0[0], p0[1], p1[0], p1[1], 1, mat, 0); U.seg(E, p1[0], p1[1], p2[0], p2[1], 1, mat, 0);
    U.dot(E, p1[0], p1[1] - 1, mat, 3);                                                         // 骨节
    U.dot(E, p0[0] - 0.6, p0[1] - 1, mat, 0);                                                   // 指根
    U.dot(E, p2[0], p2[1], mat, 4);                                                             // 指甲
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const F = Q.headFrame(rig, o, P.jaw), pin = P.ear ? 0.55 : 0, turn = P.look * 0.25;
    Q.legs(E, rig, P, o, 1);
    hookTail();
    Q.body(E, rig, P, o); bristles();
    Q.legs(E, rig, P, o, 0);
    batEar(F, 1, -2.35 - pin - turn);
    Q.head(E, rig, P, o); fourEyes();
    batEar(F, 0, -1.45 - pin * 1.4 + turn);
    boneFinger();
    if (P.stone) {                                                                              // 石化：从脚往上逐行换成灰紫石材质
      const S = hero, thr = -P.stone * 3.2, base = S.oy;
      for (let y = 0; y < S.h; y++) { if (y - base <= thr) continue; for (let x = 0; x < S.w; x++) { const i = y * S.w + x, g = G_MAP[S.mat[i]]; if (g) S.mat[i] = g; } }
      if (P.crack) {                                                                            // 裂纹：三道折线（只改材质，不另起部件，免得满身分界线）
        const C1 = rig.C1, C2 = rig.C2, H = rig.head, lines = [[H.x - 1, H.y - 2, C1.x, C1.y + 2], [C1.x - 1, C1.y - 3, C2.x + 1, C2.y + 1], [C2.x - 2, C2.y - 3, C2.x - 1, -2]];
        for (const [x0, y0, x1, y1] of lines) {
          const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)));
          for (let k = 0; k <= n; k++) { const x = R(x0 + (x1 - x0) * k / n + ((k % 3) === 1 ? 1 : 0) + P.bx) + S.ox, y = R(y0 + (y1 - y0) * k / n) + S.oy; if (x < 0 || y < 0 || x >= S.w || y >= S.h) continue; const i = y * S.w + x; if (S.mat[i]) { S.mat[i] = M_CRACK; S.tone[i] = k & 1 ? 3 : 2; } }
        }
      }
    }
  }
  function bakeHero() { RIM.rim = P.stone ? 0 : P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const MX = DUMMY_X, MY = HY - 17;                                                              // 目标身上的印记位置
  let chargeAcc = 0, soulAcc = 0, lastHop = -9, lastFing = 0, castT = 9, markT = 9, popT = 9;
  const scr = (p) => [scrX(p[0] + P.bx), HY + p[1]];
  function gazeBeams(dur, w2) {                                                                 // 四道细光从四眼射到指尖，再汇成一束打向目标
    const tip = scr(fingerPts()[2]), eyes = eyePts().map(scr);
    for (const e of eyes) fx.beam(e[0] + 1, e[1], tip[0], tip[1], 1, R_EL, dur, 2);
    fx.beam(tip[0] + 1, tip[1], MX - 3, MY, w2, R_EL, dur + 0.04, 2);
    return tip;
  }
  function onEnter(s) {
    if (s === CHARGE) markT = 0;
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const gx = scrX(P.gx), gy = HY + P.gy;
      releaseOrbit(40, 90, 0.3, 0.6); burst(gx, gy, 14, 40, 100, 0.25, 0.5, R_EL, 8);
      const tip = gazeBeams(0.42, 2); fx.cross(tip[0], tip[1], 4, R_EL, 0.25, 2); ring(tip[0], tip[1], 0, R_EL);
      castT = 0; markT = 0; shake(0.28, 2); flash(0.05);
    }
  }
  const T_LAYER = [0.12, 0.24], T_POP = 0.36;
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const tip = gazeBeams(0.14, 1); fx.cross(tip[0], tip[1], 3, R_EL, 0.15, 2);
      burst(MX - 2, MY, 9, 40, 90, 0.15, 0.35, R_EL, 6); fx.cross(MX - 2, MY, 3, R_EL, 0.18, 2); hitDummy(0, 1);
      sfx('swing', { kind: 'staff', w: 0.25 }); sfx('hit', { mat: 'magic', w: 0.3 });
    }
    if (s === CAST && T_LAYER.includes(t)) { burst(MX, MY, 5, 20, 50, 0.12, 0.3, R_EL, 0); sfx('impact', { pal: 'curse', w: t === T_LAYER[0] ? 0.2 : 0.3 }); }   // 印记叠一层
    if (s === CAST && t === T_POP) {                                                             // 第 4 层：印记爆开
      burst(MX, MY, 30, 60, 150, 0.3, 0.7, R_EL, 12); fx.cross(MX, MY, 8, R_EL, 0.35, 2); ring(MX, MY, 1, R_EL);
      hitDummy(1, 1); dummyFx({ dur: 1.3, tint: 'curse' }); shake(0.12, 1); popT = 0; sfx('impact', { pal: 'curse', w: 0.65 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 6, 30, 80, 0.2, 0.4, R_FUR, 12);
    if (s === DEATH && t === T_SH) {                                                             // 碎裂：交给死亡套件（按抖动网格切成小块炸开）
      poseAt(DEATH, T_SH - 1 / 60, T_SH - 1 / 60); drawHero(); bakeHero();
      death.start('chunks', { chunk: 3, power: 0.55, fromX: 1, fromY: -9, fadeAt: 0.75 }); hero.k1 = hero.k2 = -1;
      const cx = HX - 2, cy = HY - 10; burst(cx, cy, 18, 40, 110, 0.3, 0.7, R_STONE, 14); burst(cx + 3, cy - 6, 10, 30, 80, 0.25, 0.5, R_EL, 8); shake(0.16, 2);
    }
    if (s === DEATH && t === T_SH + 0.25) {
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], T_LAYER.concat([T_POP]), [], [INCOMING], [T_SH, T_SH + 0.25], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                                                     // 诅咒紫光点螺旋收进四眼
      chargeAcc += dt * (16 + 24 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 8; spawnX(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, { a: Math.random() * 6.2832, r, w: 4 + Math.random() * 3 }); }
    }
    if (state === MOVE && P.hop !== lastHop) {
      if (P.hop === 0 || P.hop === 3) { const x = scrX(P.hop === 0 ? -4 : 6); for (let i = 0; i < 2; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.25 + Math.random() * 0.2, FXI.dust); sfx('step', { w: 0.25 }); }
      lastHop = P.hop;
    }
    if (state === IDLE && P.fing === 0 && lastFing === 1) { const tip = scr(fingerPts()[2]); spawn(K_DUST, tip[0], HY, (Math.random() - 0.5) * 8, -3, 0.25, FXI.dust); }   // 骨指敲地
    lastFing = P.fing;
    if (state === RECOVER && Math.random() < dt * 10) spawn(K_EMBER, gx + R(Math.random() * 4 - 2), gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.5 + Math.random() * 0.3, R_EL);
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 26, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, FXI.soul); } }
    castT += dt; markT += dt; popT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastHop = -9; lastFing = 0; castT = 9; markT = 9; popT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && !P.stone) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function ellipseDots(x, y, rx, ry, c, f12, gap) { const n = Math.max(8, Math.ceil((rx + ry) * 3)); for (let k = 0; k < n; k++) { if (gap && ((k + f12) % 3) === 0) continue; const a = k / n * 6.2832; put(R(x + Math.cos(a) * rx), R(y + Math.sin(a) * ry), c); } }
  function eyeMark(x, y, c0, c1, c2) {                                                           // 眼形印记：杏仁眼眶 + 3 格瞳
    for (let dx = -2; dx <= 2; dx++) { put(x + dx, y - 2, c1); put(x + dx, y + 2, c1); }
    put(x - 3, y - 1, c1); put(x + 3, y - 1, c1); put(x - 4, y, c1); put(x + 4, y, c1); put(x - 3, y + 1, c1); put(x + 3, y + 1, c1);
    put(x, y - 1, c2); put(x - 1, y, c2); put(x + 1, y, c2); put(x, y + 1, c2); put(x, y, c0);
  }
  function fxFront(f12) {
    const st = E.state;
    if ((st === CHARGE && markT > 0.45) || (st === CAST && castT < T_POP)) {                    // 目标身上浮出紫色眼形印记
      const on = st === CAST || markT > 0.75 || (f12 & 1); if (on) eyeMark(MX, MY, st === CAST ? 21 : EL[1], st === CAST ? EL[1] : EL[2], EL[1]);
    }
    if (st === CAST && castT < T_POP + 1 / 24) {                                                // 叠层：每 0.12 s 叠一个同心紫环，从大到小缩紧
      const n = Math.min(4, 1 + Math.floor(castT / 0.12 + 1e-6));
      for (let i = 1; i <= n; i++) { const born = (i - 1) * 0.12, age = castT - born, rF = 3 + i * 2, r = rF + Math.max(0, 1 - age / 0.1) * 7; ellipseDots(MX, MY, r, r * 1.15, age < 1 / 12 ? EL[0] : i === n ? EL[1] : EL[2], f12, i < n); }
    }
    if (popT < 0.3) { const r = 4 + popT * 40; ellipseDots(MX, MY, r, r * 1.2, popT < 0.1 ? EL[1] : EL[3], f12, popT > 0.12); }   // 爆开的外环
    if (st === CHARGE && P.e4 === 2 && !P.stone) { const gx = scrX(P.gx), gy = HY + P.gy; for (let r = 3; r <= 4 + (f12 & 1); r++) { put(gx + r, gy, EL[1]); put(gx, gy - r, EL[2]); put(gx, gy + r, EL[2]); } }   // 四眼全亮：眼前十字星芒
  }

  return {
    name: '四眼', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.glow], HIT_POINT, EVENTS, deathKit: { mode: 'chunks', at: T_SH },
    SFX: { body: 'beast', how: 'shatter', pal: 'curse', style: 'beam', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
