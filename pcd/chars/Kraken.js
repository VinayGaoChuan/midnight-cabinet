// 克拉肯（敌人 · 野兽 · 传说 · 首领）：贴地巨型软体。头顶竖起一只往后弯成钩的尖锥头套，头套左右各一条最粗的触腕高举过头、末端往前卷钩：
// 左后方远侧那条暗一级，右前方近侧那条卷着一只锈铁锚（锚环和头套尖一样高，锚爪伸出轮廓）；其余 6 条粗短触腕贴地铺开。
// 头身正面和两侧结满骨白藤壶与灰贝壳甲（3 排加两侧共 11 片），金色横瞳嵌在甲片缝里，身后拖一截断链。
// 攻击：触腕把铁锚抡过头顶、整条前伸砸在假人脚前，触腕回弹一下、链条往回抖。技能「首领单位（防御 +30%）」：锚竖在身前、触腕缠身，
// 水滴螺旋汇进甲片缝、甲片从下往上逐片亮起 → 甲片「咔」地合拢，身外立起椭圆水幕护壳，来袭的一击打在壳上被弹开 → 水幕从上往下断开化成水滴。
// 死亡：沉没——触腕摊软、锚脱手砸地弹一下，身体一截截没进地面，最后只剩空触腕尖沉下，水泡上升。
PCD.define('Kraken', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, gait, walkDemo, ramp, FXI, FXR, HY, FLOOR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shoot } = E;
  const B = E.parts.beast, L = B.blob, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.water, EL = FXR[R_EL];                                                    // 深渊潮甲 · 海水蓝：白 → 淡水青 → 水蓝 → 深蓝 → 墨蓝
  const FLESH = ramp(['#1a0612', '#3e1030', '#6a2050', '#9a4070']);                            // 深海酒紫肉皮（专属 4 色）
  const m = B.mats(E, {
    main: FLESH, pink: 'pink', plate: 'bone', shellP: [0, 10, 18, 17], eye: [20, 19, 14, 5], iron: [0, 28, 29, 30], rust: [0, 20, 19, 32],   // 铁锚用 iron 偏亮一段（夜空底上读得出）
    lit: [39, 41, 22, 21], hot: [40, 22, 21, 21], spray: [40, 41, 22, 21],                   // spray：待机时藤壶缝喷出的水柱（不发光）
  });
  const o = L.shape({ r: 12, shape: 'dome', eye: null, tent: null, m });

  const HX = 62, DUR = DEFAULT_DUR.slice(), hero = new Sprite(76, 54, 34, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 10, 20, 26], rimRamp: EL, rimAll: 1, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'iron', 'rust', 'pink', 'spec', 'lit', 'hot', 'plate', 'shellP', 'spray']) RIM.skip[m[k]] = 1;

  // 本角色的姿势字段：sq 压扁 / 拉高 · tph 触腕相位 · hx hy 近侧高举触腕的手 · fhx fhy 远侧高举触腕的手 · ad 锚朝向 0 下垂 / 1 朝上 / 2 倒地
  //   an 锚脱手 · ax ay 脱手的锚环位置 · reach / freach 近 / 远侧前触腕伸缩 · wrap 触腕收拢缠身 · hl 头套尖甩 · hd 头套压低 · pl 亮起的甲片数
  //   lit 甲片合拢爆亮 · eyes 闭眼 · sink 下沉格数 · limp 触腕摊软 · cj 锚链抖动 · sp 藤壶缝喷水
  const NPL = 11;
  const SPEC = B.COMMON.concat([['sq', -2, 2], ['bob', -2, 2], ['tph', 0, 7], ['hx', -10, 30], ['hy', -48, 0], ['fhx', -24, 20], ['fhy', -48, 0],
    ['ad', 0, 2], ['an', 0, 1], ['ax', -10, 40], ['ay', -48, 0], ['reach', -3, 4], ['freach', -3, 4], ['wrap', 0, 2], ['hl', -2, 2], ['hd', 0, 2],
    ['pl', 0, NPL], ['lit', 0, 1], ['eyes', 0, 1], ['sink', 0, 48], ['limp', 0, 1], ['cj', 0, 2], ['sp', 0, 2]]);
  const P = {};
  const REST = { hx: 15, hy: -35, fhx: -17, fhy: -29, sq: 0, bx: 0, hl: 0 };
  function reset() {
    L.reset(P); P.sq = 0; P.bob = 0; P.tph = 0; P.hx = REST.hx; P.hy = REST.hy; P.fhx = REST.fhx; P.fhy = REST.fhy; P.ad = 0; P.an = 0; P.ax = 0; P.ay = 0;
    P.reach = 0; P.freach = 0; P.wrap = 0; P.hl = 0; P.hd = 0; P.pl = 0; P.lit = 0; P.eyes = 0; P.sink = 0; P.limp = 0; P.cj = 0; P.sp = 0;
  }
  reset();
  let rig = L.rig(P, o);
  const HIT_POINT = [4, -12];

  // ───── 姿势 ─────
  const F = ['hx', 'hy', 'fhx', 'fhy', 'sq', 'bx', 'hl'];
  const WIND = { hx: 4, hy: -24, fhx: -18, fhy: -26, sq: -1, bx: -1, hl: 1 };                // 锚翻到头顶上方（ad 1）
  const SMASH = { hx: 22, hy: -18, fhx: -13, fhy: -24, sq: 1, bx: 3, hl: -2 };               // 锚爪砸地
  const BOUNCE = { hx: 21, hy: -22, fhx: -14, fhy: -25, sq: 0, bx: 3, hl: -1 };              // 触腕回弹
  const HOLD = { hx: 21, hy: -18, fhx: -14, fhy: -26, sq: 1, bx: 2, hl: -1 };
  const ATK = [[0, REST], [0.12, WIND, 'out'], [2 / 12, SMASH, 'snap'], [3 / 12, BOUNCE, 'out'], [4 / 12, SMASH, 'in'], [0.45, HOLD, 'out'], [0.75, REST, 'inOut']];
  const CH = { hx: 14, hy: -17, fhx: -11, fhy: -19, sq: 1, bx: 0, hl: -1 };                  // 锚竖在身前当盾
  const CA = { hx: 14, hy: -21, fhx: -14, fhy: -24, sq: -1, bx: 0, hl: 1 };
  const HURTP = { hx: 11, hy: -33, fhx: -18, fhy: -26, sq: 1, bx: -2, hl: 2 };
  const DEADP = { hx: 14, hy: -34, fhx: -15, fhy: -11, sq: 2, bx: -2, hl: 2 };
  const TAP = [[15, -24], [16, -19], [15, -22], [16, -19], [14, -28], [14, -32]];             // 锚尖敲地两下（锚底 = 环 + 13 格）
  const SW = [0, 1, 0, -1], T_HIT = 2 / 12;
  const tmp = {};
  const apply = (src) => { for (const f of F) P[f] = src[f]; };
  const mixTo = (A, Bp, q) => { E.mix(tmp, A, Bp, q, F); apply(tmp); };

  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6);
    apply(REST); P.sq = b & 1 ? -1 : 0; P.hy += b & 1 ? -1 : 0; P.fhy += b & 1 ? -1 : 0;
    P.tph = Math.floor(TT * 10 / 3 + 1e-6) & 7; P.hl = SW[Math.floor(TT * 1.25 + 1e-6) & 3];
    P.fhx += (P.tph >> 2) & 1;
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.1) {                                                       // 待机个性：锚尖敲地两下，藤壶缝喷一小股水
      const k = Math.min(5, f12of(lp - 1.6)); P.hx = TAP[k][0]; P.hy = TAP[k][1];
      P.cj = k === 1 || k === 3 ? 1 : 0; P.hl = k === 1 || k === 3 ? -1 : 0; P.sp = k === 4 ? 1 : k === 5 ? 2 : 0;
    }
  }
  function deathPose(d, f12) {
    P.limp = 1; P.eyes = 1; P.an = 1; P.ax = 15;
    if (d < 0.66) { mixTo(HURTP, DEADP, ease.out(clamp01((d - 0.3) / 0.36))); P.hd = d < 0.45 ? 1 : 2; P.sq = d < 0.5 ? 1 : 2; }
    else { apply(DEADP); P.hd = 2; P.bob = 1; }
    const fd = d - 0.3;                                                                       // 锚脱手：自由落体，竖着砸地 → 弹一下倒下
    if (d < 0.59) { P.ad = 0; P.ay = Math.min(-13, -29 + 0.5 * 420 * fd * fd); }
    else if (d < 0.66) { P.ad = 0; P.ay = -13; }
    else if (d < 0.75) { P.ad = 2; P.ay = -4; P.ax = 14; }
    else { P.ad = 2; P.ay = -1; P.ax = 13; }
    if (d >= 0.8) P.sink = Math.min(48, 5 * Math.floor((d - 0.8) * 6 + 1e-6));
    if (d >= 2.1) P.dq = clamp01((d - 2.1) / 0.45);
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      apply(REST); const f = gait(tq);
      P.sq = [-1, 1, -1, 1][f]; P.reach = [3, -2, -1, 1][f]; P.freach = [-1, 1, 3, -2][f]; P.tph = f * 2; P.hl = [-1, 0, 1, 0][f];
      P.hy += f & 1 ? 2 : 0; P.fhy += f & 1 ? 2 : 0; P.hx += f === 0 ? 1 : 0; P.fhx += f === 2 ? -1 : 0; P.cj = f & 1;
      const w = walkDemo(tq, 10, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F); apply(tmp); P.ad = tq >= 1 / 12 && tq < T_HIT ? 1 : 0; P.tph = tq < T_HIT ? 2 : 5;
      P.cj = tq >= 3 / 12 - 1e-6 && tq < 4 / 12 - 1e-6 ? 2 : tq >= 4 / 12 - 1e-6 && tq < 5 / 12 - 1e-6 ? 1 : 0;   // 砸地后链条往回抖
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); mixTo(REST, CH, q);
      P.wrap = R(q * 2); P.hd = R(q); P.pl = Math.min(NPL, Math.floor(tq / 0.11 + 1e-6)); P.rim = 2;
      if (tq >= 1.1) P.hl = (f12 & 1) ? 0 : -2;
    } else if (st === CAST) { mixTo(CH, CA, ease.out(clamp01(tq / 0.12))); P.wrap = 1; P.pl = NPL; P.lit = 1; P.rim = 3; }
    else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); mixTo(CA, REST, q);
      P.wrap = q < 0.5 ? 1 : 0; P.pl = Math.max(0, NPL - Math.floor(tq / 0.05 + 1e-6)); P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { apply(HURTP); P.eyes = 1; P.wrap = 1; P.flash = h < 1 / 12 ? 1 : 0; P.tph = 3; P.cj = 2; }
      else if (h < 0.35) { mixTo(HURTP, REST, 0.5); P.eyes = 1; P.bx = -1; P.cj = 1; }
      else mixTo(HURTP, REST, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { apply(HURTP); P.eyes = 1; P.wrap = 1; P.flash = d < 1 / 12 ? 1 : 0; P.tph = f12 & 7; P.cj = 2; }
      else deathPose(d, f12);
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.ddir = 1; }
    for (const f of ['hx', 'hy', 'fhx', 'fhy', 'sq', 'bx', 'hl', 'ay', 'ax']) P[f] = R(P[f]);
    rig = L.rig(P, o);
    P.gx = R(rig.C.x) + P.bx; P.gy = R(rig.C.y) + P.sink;
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  const TENTS = [   // [根 x, 根 y, 方向, 长, 根半径, 远侧, 类型 f 前 / m 中 / b 后]
    [-5, -5, -1, 12, 2.2, 1, 'b'], [-1, -5, -1, 8, 2, 1, 'm'], [5, -5, 1, 9, 2.2, 1, 'f'],
    [-8, -3, -1, 10, 2.7, 0, 'b'], [2, -2, 1, 7, 2.2, 0, 'm'], [8, -3, 1, 11, 2.7, 0, 'f'],
  ];
  const CURL = [0, 1, 2, 1, 0, -1, -2, -1];
  // 候选部件：thickTentacle（粗短触腕：根粗梢细、贴地横铺、尖端卷起；贴地一侧一排粉吸盘）
  function tentacle(i) {
    const [x0, y0, dir, len0, r0, far, kind] = TENTS[i], mat = far ? m.far : m.limb;
    let len = len0, th = -0.9, curl = 0.42 + 0.1 * CURL[(P.tph + i * 3) & 7], amp = 0.05;
    const rch = far ? P.freach : P.reach;
    if (kind === 'f') len += rch; else if (kind === 'b') len -= rch;
    if (far && kind === 'f') curl += 0.18;                                                   // 远侧前触腕卷得更高，露出在近侧那条后面
    if (P.wrap) { len = R(len * (1 - 0.22 * P.wrap)); th = -0.9 + 0.8 * P.wrap; curl = 0.45 + 0.3 * P.wrap; }
    if (P.limp) { len += 2; th = -0.25; curl = 0.08; amp = 0; }
    E.part();
    let x = x0, y = y0; const pts = [];
    for (let k = 0; k <= len; k++) {
      const q = k / len, r = r0 + (0.6 - r0) * q;
      U.disc(E, x, y, r, mat, 0); pts.push(x, y, r);
      if (k < len - 4) th += (-0.02 - th) * 0.4 + amp * Math.sin(k * 0.9 + P.tph);
      else th += curl;
      x += dir * Math.cos(th); y -= Math.sin(th);
      if (y > -r) { y = -r; if (th < 0) th = 0; }
    }
    if (!far) for (let k = 2; k < len - 2; k += 2) { const px = pts[k * 3], py = pts[k * 3 + 1], r = pts[k * 3 + 2]; U.dot(E, px, py + r, m.pink, k % 4 ? 3 : 4); }   // 吸盘
  }
  // 候选部件：raisedArm（高举卷钩触腕：根 → 手按二次曲线由粗到细，控制点由手的高低推出（远侧往后鼓、近侧根部往身体收）；过了手顺时针卷 5 格钩，手朝上时钩往前卷）
  function raisedArm(bx0, by0, hx, hy, near, r0, r1, mat, suck) {
    E.part();
    const s = clamp01((hy - by0) / -26), cx = near ? bx0 - 3 * s : hx - 4 * s, cy = by0 + (hy - by0) * 0.4 - (1 - s) * 8;
    const n = Math.max(6, Math.ceil(Math.hypot(hx - bx0, hy - by0) * 1.7)), sk = [];
    for (let k = 0; k <= n; k++) {
      const t = k / n, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      const x = a * bx0 + b * cx + c * hx, y = a * by0 + b * cy + c * hy; U.disc(E, x, y, r0 + (r1 - r0) * t, mat, 0);
      if (suck && k % 2 === 0 && t > 0.2 && t < 0.95) { const tx = 2 * (1 - t) * (cx - bx0) + 2 * t * (hx - cx), ty = 2 * (1 - t) * (cy - by0) + 2 * t * (hy - cy), l = Math.hypot(tx, ty) || 1; sk.push(x - ty / l * (r0 + (r1 - r0) * t - 0.3), y + tx / l * (r0 + (r1 - r0) * t - 0.3)); }
    }
    let tx = hx - cx, ty = hy - cy; const l = Math.hypot(tx, ty); if (l < 0.5) { tx = 1; ty = 0; } else { tx /= l; ty /= l; }
    let x = hx, y = hy;
    for (let k = 0; k < 5; k++) { const ca = Math.cos(0.72), sa = Math.sin(0.72), nx = tx * ca - ty * sa, ny = tx * sa + ty * ca; tx = nx; ty = ny; x += tx * 1.15; y += ty * 1.15; U.disc(E, x, y, k < 3 ? 1 : 0.5, mat, k === 0 ? 4 : 0); }
    for (let k = 0; k < sk.length; k += 2) U.dot(E, sk[k], sk[k + 1], m.pink, 3);
  }
  // 候选部件：anchor（沉船铁锚：4×4 锚环、带球头的横杆、2 格锚身、锚冠、两只带掌的锚爪、锈斑；dir 0 下垂 / 1 朝上 / 2 倒在地上）
  const ANC = (() => {
    const a = [];   // [u 沿锚身（0 = 锚环心）, v, tone, 锈]
    for (const [u, v] of [[-3, -1], [-3, 0], [-2, -2], [-2, 1], [-1, -2], [-1, 1], [0, -1], [0, 0]]) a.push([u, v, 3, 0]);
    for (let v = -5; v <= 4; v++) a.push([3, v, v === -5 || v === 4 ? 4 : 3, 0]);
    for (let u = 1; u <= 12; u++) { a.push([u, -1, 4, u === 6 || u === 10 ? 1 : 0]); a.push([u, 0, 2, u === 8 ? 1 : 0]); }
    a.push([13, -1, 3, 1]); a.push([13, 0, 2, 0]);
    for (const s of [1, -1]) {
      const V = (v) => (s > 0 ? v : -1 - v);
      for (const [u, v, t] of [[12, 1, 3], [13, 1, 2], [12, 2, 3], [11, 3, 3], [12, 3, 2], [10, 4, 3], [11, 4, 2], [9, 5, 3], [10, 5, 2], [8, 5, 4], [8, 6, 3], [7, 5, 4]]) a.push([u, V(v), t, u === 11 && v === 3 ? 1 : 0]);
    }
    return a;
  })();
  function anchor(X, Y, dir) {
    E.part();
    for (const [u, v, t, rs] of ANC) { const x = dir === 2 ? X + u : X + v, y = dir === 2 ? Y + v : dir === 1 ? Y - u : Y + u; U.dot(E, x, y, rs ? m.rust : m.iron, rs ? 2 + (u & 1) : t); }
  }
  // 候选部件：chainLine（锚链：横环 2 格亮暗 + 竖环 1 格交替；jig 抖动幅度）
  function chainDown(x0, y0, x1, jig) {
    E.part(); const n = Math.max(1, -y0), sw = 1.5 + jig * 1.5;
    for (let j = 0; j <= n; j++) { const y = y0 + j, q = j / n, x = R(x0 + (x1 - x0) * q - Math.sin(Math.PI * q) * sw * (jig === 2 ? -1 : 1)); if (j % 3 === 0) { U.dot(E, x - 1, y, m.iron, 4); U.dot(E, x, y, m.iron, 2); } else U.dot(E, x, y, m.iron, 3); }
  }
  function chainGround(x0, x1, y, jig) {
    E.part();
    for (let x = x0; x >= x1; x--) { const j = x0 - x, yy = y - (jig && j > 4 && ((j + jig) & 3) === 0 ? 1 : 0); if (j % 3 === 0) { U.dot(E, x, yy, m.iron, 3); U.dot(E, x, yy - 1, m.iron, 4); } else U.dot(E, x, yy, m.iron, 2); }
    U.dot(E, x1 - 1, y - 1, m.iron, 4); U.dot(E, x1 - 2, y - 2 - jig, m.iron, 3);           // 断口翘起
  }
  // 候选部件：barnacle（藤壶 b：5×2 小火山，顶上一个墨色孔；贝壳甲 s：5×3 扇形，竖棱亮暗相间；头套背线上的小贝壳 t：3×2；亮起时换水青材质）
  const PLATE = {
    b: [[-1, -1, 3], [0, -1, -1], [1, -1, 2], [-2, 0, 4], [-1, 0, 3], [0, 0, 3], [1, 0, 3], [2, 0, 2]],
    s: [[-2, -1, 3], [-1, -1, 4], [0, -1, 3], [1, -1, 4], [2, -1, 2], [-2, 0, 2], [-1, 0, 3], [0, 0, 2], [1, 0, 3], [2, 0, 2], [-1, 1, 3], [0, 1, 2], [1, 1, 2]],
    t: [[-1, -1, 4], [0, -1, 3], [1, -1, 3], [-1, 0, 3], [0, 0, 2], [1, 0, 2]],
  };
  function plate(x, y, kind, idx) {
    x = R(x); y = R(y); const on = idx < P.pl, mat = on ? (P.lit ? m.hot : m.lit) : kind === 'b' ? m.plate : m.shellP;
    E.part();
    for (const [dx, dy, t] of PLATE[kind]) { if (t < 0) U.dot(E, x + dx, y + dy, on ? mat : m.ink, on ? 2 : 1); else U.dot(E, x + dx, y + dy, mat, t); }
  }
  // 头身甲片：相对圆顶中心（按 r 12 写，跟着压扁 / 拉高缩放），从下往上排（蓄力按这个顺序逐片亮起）；3 排错落 + 两侧，眼睛留在甲缝里
  const BODY_PL = [[-3, 6.6, 's'], [-7, 3.6, 'b'], [-1, 3.6, 's'], [5, 3.1, 'b'], [-10, 0.6, 's'], [-4, 0.1, 'b'], [2, 0.6, 's'],
    [-8, -3.4, 's'], [5, -7.4, 'b'], [0, -8.9, 's'], [-6, -7.9, 'b']];
  const SPOTS = [[-8, -7], [-6, 4], [5, 7]];
  // 候选部件：mantleHood（尖锥头套：一条从圆顶后上方长出、往后弯成钩的锥体，根宽梢尖，尖端往后下勾；中脊暗线 + 背线上一片灰色小贝壳；lean 甩尖、low 压低）
  function hood(yT) {
    E.part();
    const H = 10 - 2 * P.hd, hl = P.hl, x0 = -1, y0 = yT + 5, cx = 1 + hl * 0.3, cy = yT - H - 5, ex = -8 + hl, ey = yT - H + 3;
    const n = 26, pt = (t) => [(1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * ex, (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * ey];
    for (let k = 0; k <= n; k++) { const t = k / n, [x, y] = pt(t); U.disc(E, x, y, 5.6 + (0.8 - 5.6) * Math.pow(t, 0.6), m.body, 0); }
    const [a, b] = pt(1), [c, d] = pt(0.94); let tx = a - c, ty = b - d; const l = Math.hypot(tx, ty) || 1; tx /= l; ty /= l;
    let x = a, y = b;
    for (let k = 0; k < 3; k++) { const ca = Math.cos(-0.5), sa = Math.sin(-0.5), nx = tx * ca - ty * sa, ny = tx * sa + ty * ca; tx = nx; ty = ny; x += tx; y += ty; U.dot(E, x, y, m.body, k === 2 ? 2 : 3); }   // 勾尖：继续往后、往下弯
    for (let k = 4; k <= 16; k++) { const [px, py] = pt(k / n); U.dot(E, px + 1, py + 1, m.body, 2); }   // 中脊
    for (const t of [0.22]) { const [px, py] = pt(t), r = 5.6 + (0.8 - 5.6) * Math.pow(t, 0.6); plate(px - r * 0.8, py - r * 0.2, 't', 99); }   // 背线上的灰贝壳
  }
  function body() {
    L.body(E, rig, P, o);
    const C = rig.C, sx = C.rx / 12, sy = C.ry / 12, at = (x, y) => [C.x + x * sx, C.y + y * sy];
    for (const [u, v] of SPOTS) { const p = at(u, v); U.dot(E, p[0], p[1], m.body, 2); }
    const e1 = at(3, -2.9), e2 = at(-3, -5.4), ex = R(e1[0]), ey = R(e1[1]), fx0 = R(e2[0]), fy = R(e2[1]);
    for (let k = -2; k <= 3; k++) U.dot(E, ex + k, ey - 2, m.body, 1);                         // 眉缝
    for (let k = -1; k <= 2; k++) U.dot(E, fx0 + k, fy - 2, m.body, 1);
    if (P.eyes) { for (let k = -2; k <= 3; k++) U.dot(E, ex + k, ey, m.body, 1); for (let k = -1; k <= 2; k++) U.dot(E, fx0 + k, fy, m.body, 1); }
    else {
      for (let k = -1; k <= 2; k++) U.dot(E, ex + k, ey - 1, m.eye, k === -1 ? 4 : 3);
      U.dot(E, ex - 2, ey, m.eye, 3); U.dot(E, ex - 1, ey, m.ink, 1); U.dot(E, ex, ey, m.ink, 1); U.dot(E, ex + 1, ey, m.ink, 1); U.dot(E, ex + 2, ey, m.ink, 1); U.dot(E, ex + 3, ey, m.eye, 2);
      for (let k = -1; k <= 2; k++) U.dot(E, ex + k, ey + 1, m.eye, 2);
      for (let k = 0; k <= 1; k++) U.dot(E, fx0 + k, fy - 1, m.eye, 3); U.dot(E, fx0 - 1, fy, m.eye, 3); U.dot(E, fx0, fy, m.ink, 1); U.dot(E, fx0 + 1, fy, m.ink, 1); U.dot(E, fx0 + 2, fy, m.eye, 2);
    }
    BODY_PL.forEach(([u, v, k], i) => { const p = at(u, v); plate(p[0], p[1], k, i); });
  }
  const spoutAt = () => { const C = rig.C; return [R(C.x + 5 * C.rx / 12), R(C.y - 7.4 * C.ry / 12) - 1]; };   // 喷水的藤壶（第 9 片，近眼右上方）
  function spout() {
    if (!P.sp) return; E.part();
    const [x, y] = spoutAt(), h = P.sp === 1 ? 4 : 6;
    for (let j = 2; j <= h; j++) U.dot(E, x, y - j, m.spray, j === h ? 4 : j & 1 ? 3 : 2);
    if (P.sp === 1) U.dot(E, x - 1, y - 3, m.spray, 3);
    else { U.dot(E, x - 1, y - h - 1, m.spray, 4); U.dot(E, x + 1, y - h - 1, m.spray, 3); U.dot(E, x - 2, y - h + 1, m.spray, 3); U.dot(E, x + 2, y - h + 2, m.spray, 2); U.dot(E, x + 1, y - 3, m.spray, 3); }
  }
  const ringAt = () => (P.an ? [P.ax, P.ay] : P.ad === 1 ? [P.hx + 2, P.hy - 1] : [P.hx + 2, P.hy + 6]);
  function drawHero() {
    begin(hero, P.bx, P.sink, P.sink ? -P.sink : null);
    const C = rig.C, yT = C.y - C.ry;
    chainGround(-10, P.reach > 0 ? -18 : -17, -1, P.cj);
    raisedArm(C.x - 5, C.y - 1, P.fhx, P.fhy, 0, 2.4, 1.2, m.far, 0);                        // 远侧高举触腕（头套左后方，暗一级）
    for (let i = 0; i < 3; i++) tentacle(i);
    hood(yT);
    body();
    spout();
    for (let i = 3; i < 6; i++) tentacle(i);
    const [rx, ry] = ringAt(), s = P.sink;
    if (P.an) { if (P.ad === 2) chainGround(rx - 3, rx - 9, ry - s, 0); else chainDown(rx - 1, ry - s, rx - 3, 0); anchor(rx, ry - s, P.ad); }
    else { if (P.ad === 0) chainDown(rx - 1, ry + 1, rx - 4, P.cj); anchor(rx, ry, P.ad); }
    raisedArm(C.x + 11, C.y + 4, P.hx, P.hy, 1, 2.5, 1.3, m.limb, 1);                         // 近侧高举触腕（卷钩压在锚环上）
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const DOME = { rx: 24, ry: 40 }, PHI_HIT = 0.9;
  let chargeAcc = 0, bubAcc = 0, lastGf = -9, domeT = 9, hitT = 9, breakT = 9, breakQ = 0;
  const domeC = () => [HX + 1, HY];
  const domeN = () => Math.ceil(Math.PI * (DOME.rx + DOME.ry) / 2 / 2);
  function onEnter(s) {
    if (s === CHARGE) { domeT = 9; breakT = 9; }
    if (s === CAST) {
      const cx = scrX(P.gx), cy = HY + P.gy;
      releaseOrbit(40, 100, 0.3, 0.7, { pts: 1 }); burst(cx, cy, 30, 60, 140, 0.3, 0.7, R_EL, 12); ring(cx, cy - 4, 1, R_EL); fx.cross(cx + 3, cy - 8, 6, R_EL, 0.25, 2);
      shake(0.28, 2); flash(0.05); domeT = 0; breakT = 9; hitT = 9;
      const [dx, dy] = domeC(), hx = dx + Math.cos(PHI_HIT) * DOME.rx, hy = dy - Math.sin(PHI_HIT) * DOME.ry;
      shoot(1, 128, hy - 16, -260, hx, FXI.enemy, 16 / ((128 - hx) / 260));                   // 来袭的一击（打在水幕上被弹开）
    }
    if (s === RECOVER) { breakT = 0; breakQ = 1.01; }
    if (s === IDLE || s === HURT || s === DEATH || s === MOVE || s === ATTACK) { domeT = 9; breakT = 9; }
  }
  function impactOn(k, x, y) {
    if (k !== 1) return;
    hitT = 0; burst(x, y, 16, 40, 110, 0.2, 0.5, R_EL, 10); fx.cross(x, y, 5, R_EL, 0.2, 2);
    for (let i = 0; i < 5; i++) spawn(K_BURST, x, y, 50 + Math.random() * 60, -40 - Math.random() * 50, 0.35 + Math.random() * 0.2, FXI.enemy);
    shake(0.12, 1); sfx('impact', { pal: 'water', w: 0.9 });
  }
  const T_SP = 1.6 + 4 / 12;
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                       // 铁锚砸下
      const cx = scrX(P.hx + 3 + P.bx), gy = HY - 1;
      burst(cx, gy - 1, 14, 40, 120, 0.15, 0.4, FXI.impact, 10); burst(cx, gy - 2, 12, 30, 90, 0.2, 0.5, R_EL, 18);
      fx.crack(cx, FLOOR, 12, 1, FXI.dust, 0.8); fx.crack(cx - 2, FLOOR, 9, -1, FXI.dust, 0.7);
      fx.slash(scrX(9), HY - 16, 17, -0.5, 2.35, R_EL, 2 / 12, 2, 2);
      for (let i = 0; i < 8; i++) spawn(K_DUST, cx + (Math.random() - 0.5) * 10, HY, (Math.random() - 0.5) * 40, -6 - Math.random() * 12, 0.3 + Math.random() * 0.3, FXI.dust);
      hitDummy(1, 1); shake(0.1, 1); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'metal', w: 1 });
    }
    if (s === ATTACK && t === 0.45) for (let i = 0; i < 4; i++) spawn(K_DUST, scrX(P.hx + 3 + P.bx) + (Math.random() - 0.5) * 6, HY, -10 - Math.random() * 20, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);   // 锚链拖回
    if (s === IDLE && (t === 1.6 + 1 / 12 || t === 1.6 + 3 / 12)) {                           // 锚尖敲地
      const cx = scrX(P.hx + 3); for (let i = 0; i < 3; i++) spawn(K_DUST, cx + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.25, FXI.dust);
    }
    if (s === IDLE && t === T_SP) {                                                           // 藤壶缝喷水：水柱顶上散开的水滴
      const [x, y] = spoutAt(), px = scrX(x), py = HY + y - 6;
      for (let i = 0; i < 5; i++) spawnX(K_PHYS, px, py, (Math.random() - 0.5) * 30, -30 - Math.random() * 25, 0.6, R_EL, { g: 200, floor: HY, age0: 0.15 });
    }
    if (s === DEATH && t === INCOMING + 0.59) {                                               // 锚竖着砸地
      const cx = scrX(P.ax); for (let i = 0; i < 6; i++) spawn(K_DUST, cx + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 30, -5 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);
      burst(cx, HY - 2, 6, 30, 70, 0.15, 0.3, FXI.impact, 8); sfx('hit', { mat: 'metal', w: 0.6 });
    }
    if (s === DEATH && t === INCOMING + 0.66) {                                               // 身体塌落
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 32, HY - 1, (Math.random() - 0.5) * 36, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      for (let i = 0; i < 10; i++) spawnX(K_PHYS, HX - 10 + Math.random() * 20, HY - 4, (Math.random() - 0.5) * 60, -40 - Math.random() * 40, 0.6, R_EL, { g: 260, floor: HY, age0: 0.15 });
      shake(0.12, 1); sfx('fall', { w: 1 });
    }
    if (s === DEATH && t === INCOMING + 0.75) { const cx = scrX(P.ax + 8); for (let i = 0; i < 5; i++) spawn(K_DUST, cx + (Math.random() - 0.5) * 12, HY, (Math.random() - 0.5) * 24, -4 - Math.random() * 6, 0.3, FXI.dust); }
  }
  const EVENTS = [[1.6 + 1 / 12, 1.6 + 3 / 12, T_SP], [], [T_HIT, 0.45], [], [], [], [], [INCOMING + 0.59, INCOMING + 0.66, INCOMING + 0.75], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                                                   // 水滴从地面螺旋汇进甲片缝
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 14 + Math.random() * 9, a = 0.25 + Math.random() * (Math.PI - 0.5); spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE) {
      const f = gait(q12(stT));
      if (f !== lastGf) {
        if (f === 0 || f === 2) {
          const fx0 = scrX(f === 0 ? 17 : 13); for (let i = 0; i < 4; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 7, 0.3 + Math.random() * 0.3, FXI.dust);
          for (let i = 0; i < 2; i++) spawnX(K_PHYS, fx0, HY - 3, (Math.random() - 0.5) * 30, -30 - Math.random() * 20, 0.45, R_EL, { g: 220, floor: HY, age0: 0.2 });
          shake(0.05, 1); sfx('step', { w: 1 });
        } else spawn(K_DUST, scrX(-18), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.3, FXI.dust);   // 断链刮地
        lastGf = f;
      }
    }
    if (state === DEATH && stT > INCOMING + 0.8 && stT < INCOMING + 2.6) {                   // 沉没：水泡，最后混进魂光
      bubAcc += dt * 22; while (bubAcc >= 1) { bubAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 30, HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 6, -12 - Math.random() * 16, 0.7 + Math.random() * 0.7, stT > INCOMING + 1.9 && Math.random() < 0.5 ? FXI.soul : R_EL); }
    }
    if (breakT < 0.6) {                                                                      // 水幕从上往下断开，断处化成水滴落地
      const q = clamp01(breakT / 0.55), thr = 1 - q * 1.1, [cx, cy] = domeC(), n = domeN();
      for (let k = 0; k <= n; k++) { const a = k / n * Math.PI, s = Math.sin(a); if (s > thr && s <= breakQ) spawnX(K_PHYS, R(cx + Math.cos(a) * DOME.rx), R(cy - s * DOME.ry), (Math.random() - 0.5) * 8, 0, 0.7, R_EL, { g: 240, floor: HY, age0: 0.15 }); }
      breakQ = thr;
    }
    domeT += dt; hitT += dt; breakT += dt;
  }
  function fxReset() { chargeAcc = 0; bubAcc = 0; lastGf = -9; domeT = 9; hitT = 9; breakT = 9; breakQ = 0; }
  function fxBack(f12) { if (P.rim >= 2 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    const on = domeT < DUR[CAST] + 0.02 || breakT < 0.6; if (!on) return;
    const [cx, cy] = domeC(), n = domeN(), rev = domeT < 0.15 ? domeT / 0.15 : 1, thr = breakT < 0.6 ? 1 - clamp01(breakT / 0.55) * 1.1 : 2;
    for (let k = 0; k <= n; k++) {                                                            // 椭圆水幕点阵：从地面往上立起，内外两层
      const a = k / n * Math.PI, s = Math.sin(a); if (s > rev * 1.02 || s > thr) continue;
      const x = R(cx + Math.cos(a) * DOME.rx), y = R(cy - s * DOME.ry), hot = hitT < 2 / 12 && Math.abs(a - PHI_HIT) < 0.28;
      const lead = rev < 1 && s > rev - 0.12;
      put(x, y, hot || lead ? EL[0] : ((k + (f12 >> 1)) & 1) ? EL[1] : EL[2]);
      if (hot) { put(x - 1, y, EL[0]); put(x, y + 1, EL[1]); }
      if ((k & 1) === 0) { const x2 = R(cx + Math.cos(a) * (DOME.rx - 3)), y2 = R(cy - s * (DOME.ry - 3)); if (((k >> 1) + f12) % 3 !== 0) put(x2, y2, EL[3]); }
    }
  }

  return {
    name: '克拉肯', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.lit, m.hot], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'water', style: 'shield', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront,
  };
});
