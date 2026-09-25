// 蓝龙（部队 · 僵尸 · 法师 · 史诗）：飞鹰升级而来——「长成龙的那只鹰」。修长的蓝羽龙，悬浮不落地：
// 龙头但吻尖是骨白鹰式下钩喙，头顶还是那 3 根后掠羽冠（长成 6 格蓝羽冠，冠尖带静电）；一对蓝色羽翼，初级飞羽仍缺 2 根、露出翼指骨，缺口间跳电弧；
// 细长 S 形长尾，尾端张开一把鹰式扇形尾羽；胸侧肋窗变大，4 根白肋骨后面是一颗发光的风暴核心（法师的发光体）；后爪是骨黄鹰爪，爪腕套着当年钱袋的铜扣环。
// 攻击：俯冲爪击（前倾下压、鹰爪前伸耙抓，3 道平行爪痕）；技能「闪电打击 · 闪电锁链」：头顶聚起雷云 → 仰头再前探张嘴，
// 闪电从口中直劈假人，再依次跳向 4 个目标（共 5 次）。死亡：风暴核心过载，肋窗闪白 3 次后爆裂，碎块连同蓝羽四散。
// 身体用 parts-beast 的 quad 骨架（躯干 + 颈、头、前腿）；破羽翼、S 形扇尾、鹰爪后腿、钩喙、羽冠、肋窗核心在本模块里画（通用的标了「候选部件」）。
PCD.define('BlueDragon', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, ramp, fxRamp, hash, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, clearOrbit, ring, shake, flash, fx, sfx, death, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const ZSKIN = ramp(['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682']);                     // 尸绿灰（僵尸族共用；这里只露在肋窗的烂肉里）
  const m = B.mats(E, {
    main: [0, 40, 41, 23], belly: 'blue', feather: [0, 39, 40, 41], covert: [0, 40, 41, 23], bone: 'bone', beak: 'bone', claw: 'bone', tar: 'sand', ring: 'gold', crest: [0, 41, 23, 22],
    eye: [0, 0, 22, 21], rot: ZSKIN,
  });
  m.tarFar = E.defMat([20, 61, 61, 62], 1);
  m.covertFar = E.defMat([0, 39, 40, 41], 1);                                             // 远翼覆羽暗一级                                              // 远侧鹰爪暗一级
  m.core = E.defMat([40, 23, 22, 21], 1, 1);                                             // 风暴核心（发光体，手工 tone 1–4）
  m.spark = E.defMat([22, 22, 22, 21], 1, 1);                                            // 羽冠尖的静电（发光）
  const R_EL = FXI.bolt, EL = FXR[R_EL];                                                  // 雷电：白 → 淡金 → 青 → 蓝 → 深蓝
  const R_FEATHER = fxRamp('blueFeather', [21, 41, 23, 40, 39]);                         // 蓝羽碎屑

  // ───── 形体 ─────
  const OX = -9;                                                                         // 整条龙往后挪 9 格：站位点落在胸前，吻尖不戳进假人
  const WING = { span: 18, chord: 7, fingers: 5, missing: [1, 2], bone: 0.62, arm: 0.5 };
  const TAIL = { len: 16, w0: 3.4, slope: 0.1, amp: 2.4, fan: 5 };
  const o = Q.shape({ len: 11, chest: 3.5, rump: 3, waist: 0.35, hump: 0, leg: 2, lw: 2, thigh: 1.8, farDx: -2, neck: 6, neckA: 1.15, neckW: 1.8,
    head: { type: 'dragon', w: 6, h: 5, snout: 4.5, snH: 3, tip: 0.85, horn: null, teeth: 1 }, headA: 0.18, tail: 'none', mane: 'none', fur: 1, pattern: null, foot: 'claw', m });
  const LIFT = 4, HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(92, 64, 56, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 9, 12], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'spec', 'core', 'spark', 'beak', 'bone', 'boneFar', 'claw', 'tar', 'tarFar', 'ring', 'rot']) if (m[k] != null) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat([['claw', 0, 2], ['tph', 0, 7], ['tcurl', -2, 2], ['crest', -1, 1]]).concat(B.COMMON);
  const P = {};
  function reset() { Q.reset(P); P.lift = LIFT; P.claw = 0; P.tph = 0; P.tcurl = 0; P.crest = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x - 1) + OX, R(rig.C1.y)];
  const T_HIT = 2 / 12, T_BOLT = 1 / 12, T_CHAIN = [T_BOLT + 0.07, T_BOLT + 0.14, T_BOLT + 0.21, T_BOLT + 0.28], T_BURST = INCOMING + 0.6;

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6);
    P.wing = [1, 5, 2, 4][b & 3]; P.bob = B.FLAP_BOB[b & 3]; P.tph = b & 7; P.rim = 1;   // 核心常亮：轮廓光 1 档                    // 悬停：慢扑翼，尾巴慢慢波动
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                   // 待机个性：尾巴卷起再展开，羽冠静电噼啪，抬头低头张望
      const k = Math.min(4, f12of(lp - 1.6)); P.head = [-1, -1, 1, 1, 0][k]; P.tcurl = [1, 2, 2, 1, 0][k]; P.crest = [1, -1, 1, -1, 0][k]; P.eyes = 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                // 蛇形滑翔：身体和尾巴做 S 形波动，每 4 帧扑一次翅
      const f = gait(tq); P.lift = LIFT + [0, -1, 0, 1][f]; P.pitch = [0, 1, 0, -1][f]; P.head = [0, -1, 0, 1][f]; P.wing = [5, 5, 1, 3][f]; P.tph = f * 2; P.crest = [1, 0, 1, 0][f];
      const w = walkDemo(tq, 18, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { const q = ease.out(tq / 0.12); P.lift = LIFT + R(2 * q); P.pitch = R(2 * q); P.wing = 1; P.head = -1; P.claw = 1; P.crest = 1; P.bx = -R(q); P.tcurl = 1; }   // 预兆：拔高、后仰、双翼高举
      else if (tq < 0.25) { P.lift = 1; P.pitch = -2; P.bx = 11; P.wing = 0; P.head = -2; P.jaw = 2; P.claw = 2; P.crest = -1; P.tph = 3; P.tcurl = -1; }   // 出手：前倾下压 4 格俯冲，鹰爪前伸耙抓
      else if (tq < 0.45) { P.lift = 2; P.pitch = -1; P.bx = 10; P.wing = 3; P.head = -1; P.jaw = 1; P.claw = 2; P.tph = 4; }
      else { idle(tq, f12); const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.bx = R(10 * (1 - q)); P.lift = LIFT - R(3 * (1 - q)); P.claw = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                                            // 蓄力：盘身上升 3 格，头顶聚雷云，核心 1 → 2 档
      const q = ease.inOut(clamp01(tq / 0.7));
      P.lift = LIFT + R(3 * q); P.head = -R(q); P.tcurl = R(2 * q); P.pitch = R(q); P.wing = tq > 0.7 ? ((f12 >> 2) & 1 ? 1 : 5) : 5; P.crest = tq > 0.5 ? ((f12 & 1) ? 1 : -1) : 0;
      P.jaw = tq > 0.9 ? 1 : 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq > 1.1 ? 3 : 2; P.tph = (f12 >> 2) & 7;
    } else if (st === CAST) {                                                              // 施放：仰头 → 猛地前探张嘴
      if (tq < T_BOLT) { P.lift = LIFT + 3; P.head = -2; P.jaw = 1; P.pitch = 2; P.wing = 5; P.tcurl = 2; }
      else { P.lift = LIFT + 2; P.head = 1; P.jaw = 3; P.bx = 2; P.pitch = -1; P.wing = tq < 0.3 ? 5 : 1; P.tcurl = 1; P.tph = 2; }
      P.gem = tq < 0.3 ? 3 : 2; P.rim = 3; P.crest = -1;
    } else if (st === RECOVER) {                                                           // 收招：雷云散成火花落下，羽冠平复
      const q = ease.inOut(clamp01(tq / 0.6));
      P.lift = LIFT + R(2 * (1 - q)); P.head = R(1 - q); P.jaw = R(2 * (1 - q)); P.bx = R(2 * (1 - q)); P.tcurl = R(1 - q); P.wing = q < 0.5 ? 4 : 1;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.flash = h < 1 / 12 ? 1 : 0; P.eyes = 1; P.head = -1; P.tcurl = -2; P.crest = 1; P.wing = 1; P.claw = 1; P.pitch = 1; P.gem = (f12 & 1) ? 2 : 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.wing = 4; P.tcurl = -1; P.claw = 1; }
      else idle(tq, f12);
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 1; P.head = -1; P.tcurl = -2; P.crest = 1; P.wing = 1; P.claw = 1; P.pitch = 1; P.gem = (f12 & 1) ? 2 : 1; P.lift = d < 0.15 ? LIFT : LIFT - 1; }
      else if (d < T_BURST - INCOMING - 1e-6) { const k = f12of(d - 0.3); P.bx = -3; P.eyes = 1; P.head = 2; P.jaw = 2; P.tcurl = (k & 1) ? 2 : -2; P.wing = 6; P.claw = 1; P.pitch = -1; P.lift = LIFT - 2; P.gem = (k & 1) ? 1 : 3; P.rim = (k & 1) ? 0 : 3; }   // 核心过载：肋窗闪白
      else { P.bx = -3; P.dq = 1; P.gem = 4; }                                            // 爆裂后：碎块交给死亡套件
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 1 : 0; }
    rig = Q.rig(P, o);
    tuckLegs(rig);
    const mo = rig.mouth; P.gx = R(mo[0]) + P.bx + OX; P.gy = R(mo[1]);
    B.key(P, SPEC);
  }
  // 前腿蜷在胸下（悬空不落地）；耙抓时往前伸
  function tuckLegs(r) {
    for (const i of [1, 3]) { const L = r.legs[i], T = L.T; L.F = P.claw === 2 ? [T[0] + 2.5, T[1] + 2.2] : [T[0] - 1.2, T[1] + 2.6]; L.up = true; }
  }

  // ───── 画 ─────
  // 候选部件：raggedWing（破羽翼）：B.wing 的羽翼画法 + 缺掉的初级飞羽（缺口露出白色翼指骨）+ 自定翼姿（和飞鹰同一个部件）。
  //   w = { span, chord, fingers, missing: [缺的初级飞羽序号，0 = 最外], bone 翼指骨长度（占飞羽长 0–1）}；pose = B.WINGS 下标或 [a0, aT, fold]
  function wingGeom(x, y, pose, w) {
    const Wp = Array.isArray(pose) ? pose : (B.WINGS[pose | 0] || B.WINGS[0]), a0 = Wp[0], aT = Wp[1], fold = Wp[2], span = w.span, nf = w.fingers || 3;
    const arm = span * ((w.arm || 0.42) - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, tips = [];
    for (let k = 0; k < nf; k++) { const q = nf === 1 ? 1 : k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); tips.push(wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl); }
    return { wx, wy, tips, bx: x - (w.chord || 4) * (1 - 0.3 * fold), by: y + 1, nf };
  }
  function raggedWing(x, y, pose, w, far) {
    E.part();
    const G = wingGeom(x, y, pose, w), { wx, wy, tips, bx, by, nf } = G, fm = far ? m.featherFar : m.feather, bm = far ? m.boneFar : m.bone;
    const cm = far ? m.covertFar : m.covert, lx = tips[2 * nf - 2], ly = tips[2 * nf - 1], mx = lerp(lx, bx, 0.5), my = lerp(ly, by, 0.5) + 1, miss = w.missing || [];
    U.poly(E, [x, y, wx, wy, lx, ly, mx, my, bx, by], fm, 0);                                                         // 飞羽（翼面，深一级）
    for (let k = 0; k < nf; k++) {
      if (miss.includes(k)) { const e = w.bone || 0.6; U.seg(E, wx, wy, lerp(wx, tips[2 * k], e), lerp(wy, tips[2 * k + 1], e), 1, bm, k === miss[0] ? 4 : 3); continue; }   // 缺的飞羽：只剩白色翼指骨
      U.seg(E, wx, wy, tips[2 * k], tips[2 * k + 1], w.span >= 12 ? 2 : 1, fm, 0); U.dot(E, tips[2 * k], tips[2 * k + 1], fm, 4);
    }
    const c1x = lerp(wx, lx, 0.38), c1y = lerp(wy, ly, 0.38), c2x = lerp(x, bx, 0.6), c2y = lerp(y, by, 0.6);
    U.poly(E, [x, y, wx, wy, c1x, c1y, c2x, c2y], cm, 0);                                                            // 覆羽（浅一级，和躯干同色）
    U.seg(E, x, y, wx, wy, 2, cm, 4);                                                                                 // 前缘
    for (let k = 1; k <= 4; k++) { const q = k / 5, ax = lerp(c1x, c2x, q), ay = lerp(c1y, c2y, q), ex = lerp(lx, lerp(mx, bx, 0.5), q), ey = lerp(ly, lerp(my, by, 0.5), q); U.seg(E, lerp(ax, ex, 0.3), lerp(ay, ey, 0.3), lerp(ax, ex, 0.75), lerp(ay, ey, 0.75), 1, fm, 2); }   // 飞羽分隔线
  }
  // 候选部件：waveTail（S 形长尾 + 末端扇形尾羽）：从 (x, y) 往后长 len 格，粗 w0 → 0.6；ph 波相 0–7（S 形波往尾尖传）、curl 尾尖上卷 -2..2；
  //   材质 m.body（尾身）、m.feather（尾羽，尖端 tone 4）
  function waveTail(x, y, T, ph, curl) {
    E.part();
    let px = x, py = y;
    for (let k = 0; k <= T.len; k++) {
      const q = k / T.len, wave = Math.sin(q * 5.2 - ph * 0.785) * T.amp * q, cy = y + T.slope * k + wave - curl * q * q * 5;
      px = x - k; py = cy; U.disc(E, px, py, lerp(T.w0 / 2, 0.6, q), m.body, 0);
      if (k > 2 && k < T.len - 1 && (k % 3) === 0) U.dot(E, px, py - lerp(T.w0 / 2, 0.6, q), m.body, 4);   // 背上的羽鳞亮点
    }
    const q2 = (T.len - 1) / T.len, pa = Math.atan2(py - (y + T.slope * (T.len - 1) + Math.sin(q2 * 5.2 - ph * 0.785) * T.amp * q2 - curl * q2 * q2 * 5), -1);
    for (let k = -1; k <= 1; k++) {                                                        // 扇形尾羽：3 片从尾尖张开
      const a = pa + k * 0.5 - curl * 0.15, ex = px + Math.cos(a) * T.fan * (k ? 0.85 : 1), ey = py + Math.sin(a) * T.fan * (k ? 0.85 : 1);
      U.seg(E, px, py, ex, ey, k ? 1 : 2, m.feather, 0); U.dot(E, ex, ey, m.feather, 4);
    }
  }
  // 候选部件：talonLeg（鹰爪后腿）：羽毛大腿 + 骨黄跗骨 + 3 根钩爪，跗骨上套一只铜环；mode 0 蜷起 · 1 垂下 · 2 前伸耙抓（爪张开）
  function talonLeg(i, mode) {
    E.part();
    const L = rig.legs[i], far = L.far, T = L.T, tm = far ? m.tarFar : m.tar, fm = far ? m.far : m.limb;
    const F = mode === 2 ? [T[0] + 7, T[1] + 2] : mode === 1 ? [T[0] + 0.5, T[1] + 5] : [T[0] + 1.8, T[1] + 3.4];
    const K = mode === 2 ? [T[0] + 2.5, T[1] + 2.2] : [T[0] + 1.4, T[1] + 1.6];
    U.disc(E, T[0], T[1], 1.8, fm, 0); U.taper(E, T[0], T[1], K[0], K[1], 1.5, 1, fm, 0);                              // 羽毛大腿
    U.seg(E, K[0], K[1], F[0], F[1], 1, tm, 0);                                                                          // 跗骨
    const rx = lerp(K[0], F[0], 0.4), ry = lerp(K[1], F[1], 0.4); U.dot(E, rx, ry, m.ring, far ? 2 : 4); U.dot(E, rx + 1, ry, m.ring, far ? 1 : 3);   // 当年钱袋的铜扣环
    if (mode === 2) { U.dot(E, F[0] + 1, F[1] - 1, tm, 0); U.dot(E, F[0] + 2, F[1] - 1, m.claw, 4); U.dot(E, F[0] + 1, F[1] + 1, tm, 0); U.dot(E, F[0] + 2, F[1] + 2, m.claw, 3); U.dot(E, F[0] - 1, F[1] + 1, m.claw, 2); }   // 张开的爪
    else { U.dot(E, F[0] + 1, F[1], tm, 0); U.dot(E, F[0] + 2, F[1] + 1, m.claw, far ? 2 : 4); U.dot(E, F[0], F[1] + 1, m.claw, far ? 1 : 3); }
  }
  // 肋窗 + 风暴核心（和躯干同一个部件）：烂肉里 4 根白肋骨，肋骨缝里透出核心的光；lv 0 暗 · 1 亮 · 2 很亮 · 3 爆闪 · 4 熄灭
  const CORE_T = [[3, 4, 3], [3, 4, 4], [4, 4, 4], [4, 4, 4], [1, 1, 1]];
  function ribWindow() {
    const C = rig.C1, cx = R(C.x - 2.5), cy = R(C.y - 1), lv = CORE_T[Math.max(0, Math.min(4, P.gem | 0))];
    for (let v = 0; v <= 3; v++) for (let u = -3; u <= 3; u++) { if ((v === 0 && u === 3) || (v === 3 && u === -3)) continue; U.dot(E, cx + u, cy + v, m.rot, 1); }
    for (const [u, v, k] of [[-1, 1, 0], [0, 1, 1], [1, 1, 0], [-1, 2, 1], [0, 2, 2], [1, 2, 1], [0, 0, 0], [0, 3, 0]]) U.dot(E, cx + u, cy + v, m.core, lv[k]);   // 风暴核心
    for (let k = 0; k < 4; k++) for (let v = 0; v <= 3; v++) U.dot(E, cx - 3 + k * 2 + (v >= 2 ? 1 : 0), cy + v, m.bone, v === 0 ? 4 : 3);   // 4 根白肋骨（斜向前下）
  }
  // 腹部暗一级的鳞（和躯干同一个部件）
  function bellyScales() {
    for (let x = Math.floor(rig.C2.x - 1); x <= Math.ceil(rig.C1.x + 1.5); x++) { const s = Q.span(rig, o, x); if (!s || s[1] - s[0] < 3) continue; for (let y = s[1] - 1; y <= s[1]; y++) U.dot(E, x, y, m.belly, ((x + y) & 1) ? 0 : 2); }
  }
  // 钩喙（和头同一个部件）：吻尖 2.5 格换成骨白，吻尖往下勾 1 格
  function beak() {
    const F = Q.headFrame(rig, o, P.jaw | 0), u0 = F.uT - 2.6;
    Q.scanHead(F, F.uT + 4, (x, y, u, v) => {
      if (u < u0 || u > F.uT + 0.45) return; const [vt, vb, vm] = F.prof(u), g = F.gap(u);
      const up = v >= vt - 0.45 && v <= vm + 0.45, lo = P.jaw ? v >= vm + g - 0.45 && v <= vb + g + 0.45 : v > vm + 0.45 && v <= vb + 0.45;
      if (up || lo) U.dot(E, x, y, m.beak, up && v < vt + 0.6 ? 4 : 0);
    });
    const h = F.at(F.uT + 0.6, F.prof(F.uT)[2] + 0.9); U.dot(E, h[0], h[1], m.beak, 2);                 // 下钩
  }
  // 羽冠：3 根后掠羽（长成 6 格的蓝羽冠），冠尖是静电色；返回冠尖（本地坐标，给静电特效用）
  const CREST = [[6, 0.55], [5.5, 0.28], [4, 0.02]];
  function crestGeom(r) {
    const F = Q.headFrame(r, o, 0), b = F.at(-F.W * 0.35, F.top(-F.W * 0.35) + 0.6), sw = P.crest * 0.22, pts = [];
    CREST.forEach(([L, a], i) => { const A = r.head.a + Math.PI + a + sw * (1 + i * 0.25); pts.push([b[0], b[1], b[0] + Math.cos(A) * L, b[1] - Math.abs(Math.sin(A)) * L * 0.9 - (i === 0 ? 1 : 0)]); });
    return pts;
  }
  function crest() {
    E.part();
    for (const [x0, y0, x1, y1] of crestGeom(rig)) { U.seg(E, x0, y0, x1, y1, 1, m.crest, 0); U.dot(E, x1, y1, m.spark, 3); }
  }
  function drawHero() {
    begin(hero, P.bx + OX, 0);
    const r = rig, cm = P.claw;
    talonLeg(0, cm); Q.leg(E, r, P, o, 1);
    raggedWing(r.wing.x + 0.5, r.wing.y - 1.5, P.wing, WING, 1);
    waveTail(r.C2.x - r.C2.r * 0.55, r.C2.y + 0.4, TAIL, P.tph, P.tcurl);
    Q.body(E, r, P, o); bellyScales(); ribWindow();
    talonLeg(2, cm); Q.leg(E, r, P, o, 3);
    raggedWing(r.wing.x - 1.5, r.wing.y, P.wing, WING, 0);
    crest();
    Q.head(E, r, P, o); beak();
  }
  function coreLocal() { return [R(rig.C1.x - 2.5) + P.bx + OX, R(rig.C1.y + 0.5)]; }
  function bakeHero() { const c = coreLocal(); RIM.rim = P.rim; RIM.rx = c[0] + hero.ox; RIM.ry = c[1] + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 闪电：折线逐帧抖动，w 1–3（核心 + 两侧辉光），lv 起始色阶级（0 最亮）；锁链一段比一段细、一段比一段暗
  const BN = 10, bOn = new Uint8Array(BN), bX0 = new Float32Array(BN), bY0 = new Float32Array(BN), bX1 = new Float32Array(BN), bY1 = new Float32Array(BN), bT = new Float32Array(BN), bD = new Float32Array(BN), bW = new Uint8Array(BN), bL = new Uint8Array(BN), bS = new Uint16Array(BN);
  let bSeed = 1;
  function bolt(x0, y0, x1, y1, dur, w, lv) { let i = 0, old = 0; for (; i < BN && bOn[i]; i++) if (bT[i] / bD[i] > bT[old] / bD[old]) old = i; if (i === BN) i = old; bOn[i] = 1; bX0[i] = x0; bY0[i] = y0; bX1[i] = x1; bY1[i] = y1; bT[i] = 0; bD[i] = dur; bW[i] = w; bL[i] = lv; bS[i] = bSeed++ & 1023; }
  function ln(x0, y0, x1, y1, c) { x0 = R(x0); y0 = R(y0); x1 = R(x1); y1 = R(y1); const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1); for (let k = 0; k <= n; k++) put(R(x0 + (x1 - x0) * k / n), R(y0 + (y1 - y0) * k / n), c); }
  function drawBolts(f12) {
    for (let i = 0; i < BN; i++) {
      if (!bOn[i]) continue; const q = bT[i] / bD[i]; if (q >= 1) { bOn[i] = 0; continue; } if (q > 0.55 && (f12 & 1)) continue;
      const x0 = bX0[i], y0 = bY0[i], x1 = bX1[i], y1 = bY1[i], len = Math.hypot(x1 - x0, y1 - y0) || 1, n = Math.max(2, R(len / 5)), amp = Math.min(3, len / 7), nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
      const lv = bL[i] + (q < 0.35 ? 0 : q < 0.7 ? 1 : 2), core = EL[Math.min(4, lv)], halo = EL[Math.min(4, lv + 2)];
      let px = x0, py = y0;
      for (let k = 1; k <= n; k++) {
        const t = k / n, j = k === n ? 0 : (hash(bS[i] * 7 + k, f12) - 0.5) * 2 * amp, x = lerp(x0, x1, t) + nx * j, y = lerp(y0, y1, t) + ny * j;
        if (bW[i] >= 2) ln(px + nx, py + ny, x + nx, y + ny, halo); if (bW[i] >= 3) ln(px - nx, py - ny, x - nx, y - ny, halo);
        ln(px, py, x, y, core);
        if (bW[i] >= 2 && k === (n >> 1)) { const fx2 = x + (x1 - x0) / len * 3 + nx * 3 * (hash(k, bS[i]) < 0.5 ? 1 : -1), fy2 = y + (y1 - y0) / len * 3 + ny * 3; ln(x, y, fx2, fy2, halo); }   // 分叉
        px = x; py = y;
      }
    }
  }
  const TGT = [[DUMMY_X - 2, HY - 16], [DUMMY_X + 14, HY - 7], [DUMMY_X + 6, HY - 38], [DUMMY_X + 23, HY - 27], [DUMMY_X + 27, HY - 6]];   // 假人 + 4 个隐形目标点（后方、上方、更远处）
  const CLOUD = [[0, 0, 3], [-3.2, 1, 2.2], [3.2, 0.8, 2.4], [-1.4, -1.8, 2.2], [1.8, -1.4, 2.1], [5, 1.6, 1.4], [-5, 1.8, 1.3]];
  let chargeAcc = 0, trailAcc = 0, soulAcc = 0, sparkAcc = 0, lastGf = -9, zapT = 9, clT = 9, clX = 0, clY = 0, cloudS = 0, cloudX = 0, cloudY = 0, burstDone = 0;
  const toScr = (lx, ly) => [scrX(lx + P.bx + OX), HY + ly];
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  function headScr() { return toScr(rig.head.x, rig.head.y); }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [hx, hy] = headScr();
      burst(hx, hy - 4, 12, 30, 80, 0.2, 0.45, R_EL, 10); shake(0.28, 2); flash(0.05);
    }
  }
  function chainHit(k) {                                                                   // 第 k 段锁链落点：十字 + 小冲击环
    const [x, y] = TGT[k]; fx.cross(x, y, Math.max(2, 6 - k), R_EL, 0.25, 2); ring(x, y, k === 0 ? 1 : 0, R_EL); burst(x, y, k === 0 ? 20 : 8, 40, 110, 0.15, 0.4, R_EL, 8);
    sfx('impact', { pal: 'bolt', w: +(0.8 - k * 0.14).toFixed(2) });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                     // 俯冲爪击：3 道平行爪痕
      clT = 0; clX = DUMMY_X - 5; clY = HY - 19;
      burst(DUMMY_X - 4, HY - 15, 14, 40, 100, 0.15, 0.4, FXI.impact, 10); burst(DUMMY_X - 4, HY - 15, 6, 30, 70, 0.2, 0.4, R_EL, 6); hitDummy(1, 1); shake(0.08, 1);
      sfx('swing', { kind: 'claw', w: 0.6 }); sfx('hit', { mat: 'flesh', w: 0.6 });
    }
    if (s === CAST && t === T_BOLT) {                                                      // 张嘴：闪电从口中直劈假人
      const [mx, my] = mouthScr(); fx.cross(mx + 1, my, 6, R_EL, 0.3, 2); ring(mx + 1, my, 1, R_EL); burst(mx + 1, my, 16, 50, 120, 0.2, 0.5, R_EL, 6);
      bolt(mx + 1, my, TGT[0][0], TGT[0][1], 0.32, 3, 0); zapT = 0;
      hitDummy(1, 1); dummyFx({ dur: 1.1, stun: 1, outline: R_EL }); shake(0.12, 1); chainHit(0);
    }
    const ck = s === CAST ? T_CHAIN.indexOf(t) : -1;
    if (ck >= 0) { const a = TGT[ck], b = TGT[ck + 1]; bolt(a[0], a[1], b[0], b[1], 0.26 - ck * 0.02, ck < 2 ? 2 : 1, ck < 1 ? 0 : 1); chainHit(ck + 1); }   // 锁链依次跳向下一个目标
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.2, 0.45, R_FEATHER, 10);
    if (s === DEATH && t === T_BURST) {                                                    // 风暴核心过载 → 爆裂
      poseAt(DEATH, t - 1 / 12, E.simT); drawHero(); bakeHero();
      const c = coreLocal(); death.start('burst', { power: 0.85, chunk: 4, fromX: c[0], fromY: c[1], fadeAt: 1.2 });
      const [x, y] = toScr(c[0] - P.bx - OX, c[1]);
      ring(x, y, 1, R_EL); burst(x, y, 30, 60, 150, 0.25, 0.6, R_EL, 10); flash(0.05); shake(0.2, 2);
      for (let i = 0; i < 14; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 120, -40 - Math.random() * 80, 0.7 + Math.random() * 0.5, R_EL, { g: 260, floor: FLOOR - 1 });   // 电火花随碎块落地熄灭
      for (let i = 0; i < 10; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 12, y - 4, (Math.random() - 0.5) * 60, -30 - Math.random() * 40, 1.2 + Math.random() * 0.6, R_FEATHER, { g: 50, dragX: 0.4, floor: FLOOR - 1 });   // 蓝羽四散飘落
      sfx('impact', { pal: 'bolt', w: 0.6 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_BOLT].concat(T_CHAIN), [], [INCOMING], [T_BURST], []];
  const deathKit = { mode: 'burst', at: T_BURST };
  function stepFX(dt, state, stT) {
    const [hx, hy] = headScr(), [mx, my] = mouthScr();
    cloudS = state === CHARGE ? clamp01(stT / 0.9) : state === CAST ? 1 : state === RECOVER ? clamp01(1 - stT / 0.4) : 0;
    if (cloudS > 0) { cloudX = hx - 2; cloudY = hy - 13; }
    if (state === CHARGE) {
      chargeAcc += dt * (12 + 22 * clamp01(stT / DUR[CHARGE]));                            // 火花从雷云螺旋汇聚进口中
      while (chargeAcc >= 1) { chargeAcc -= 1; const sx = cloudX + (Math.random() - 0.5) * 8 * cloudS, sy = cloudY + (Math.random() - 0.5) * 4, a = Math.atan2((sy - my) / 0.75, sx - mx), r = Math.hypot(sx - mx, (sy - my) / 0.75); spawnX(K_SPIRAL_PT, sx, sy, (r - 3.5) / (0.35 + Math.random() * 0.25), 0, 9, R_EL, { a, r, w: 4 + Math.random() * 2, tx: mx, ty: my }); }
      if (stT > 0.35) { sparkAcc += dt * 6; while (sparkAcc >= 1) { sparkAcc -= 1; const tip = crestGeom(rig)[1], [tx, ty] = toScr(tip[2], tip[3]); bolt(cloudX + (Math.random() - 0.5) * 4, cloudY + 2, tx, ty, 0.12, 1, 1); } }   // 云里细闪电接到羽冠
    }
    if (state === RECOVER && stT < 0.4) { sparkAcc += dt * 26; while (sparkAcc >= 1) { sparkAcc -= 1; spawnX(K_PHYS, cloudX + (Math.random() - 0.5) * 12, cloudY + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 20, 10 + Math.random() * 20, 0.6 + Math.random() * 0.4, R_EL, { g: 120 }); } }   // 雷云散成火花落下
    if (state === CAST && stT >= T_BOLT && stT < T_BOLT + 0.3) { trailAcc += dt * 20; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_EMBER, mx + 1, my, 10 + Math.random() * 20, -6 - Math.random() * 8, 0.3 + Math.random() * 0.3, R_EL); } }
    if (state === MOVE && P.tph !== lastGf) {                                              // 身下 1–2 颗青色电火花拖尾
      const [bx0, by0] = toScr(0, R(rig.C1.y + rig.C1.r) + 1); for (let i = 0; i < 2; i++) spawn(K_TRAIL, bx0 + (Math.random() - 0.5) * 8, by0 + Math.random() * 2, (P.flip ? 1 : -1) * (10 + Math.random() * 10), 4 + Math.random() * 6, 0.3 + Math.random() * 0.25, R_EL);
      lastGf = P.tph;
    }
    if ((state === IDLE || state === RECOVER) && P.gem > 0) { trailAcc += dt * 4; while (trailAcc >= 1) { trailAcc -= 1; const [cx, cy] = toScr(coreLocal()[0] - P.bx - OX, coreLocal()[1]); spawn(K_EMBER, cx, cy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {                // 魂光（青）
      soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 34, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); }
    }
    for (let i = 0; i < BN; i++) if (bOn[i]) bT[i] += dt;
    zapT += dt; clT += dt;
  }
  function fxReset() { chargeAcc = 0; trailAcc = 0; soulAcc = 0; sparkAcc = 0; lastGf = -9; zapT = 9; clT = 9; cloudS = 0; burstDone = 0; bOn.fill(0); }
  // 雷云：几团叠在一起的圆，顶上亮蓝、中间深蓝、底下墨蓝；s 0–1 大小；闪的时候里面透出青白
  function stormCloud(cx, cy, s, f12) {
    if (s <= 0.05) return; const lit = (f12 % 5) === 0 || (f12 % 7) === 3;
    for (const [dx, dy, r0] of CLOUD) {
      const r = r0 * 1.25 * (0.35 + 0.65 * s); if (r < 0.8) continue;
      for (let j = -Math.ceil(r); j <= Math.ceil(r); j++) for (let i = -Math.ceil(r); i <= Math.ceil(r); i++) {
        if (i * i + j * j > r * r + 0.3) continue; const x = R(cx + dx * s * 1.3 + i), y = R(cy + dy * s * 1.3 + j), ry = y - cy;
        put(x, y, ry < -2 ? 41 : ry > 1 ? 39 : (lit && Math.abs(i) < 3 && hash(x, f12) < 0.4 ? 22 : 40));
      }
    }
    if (lit) { put(R(cx), R(cy), 21); put(R(cx + 1), R(cy + 1), 22); }
  }
  function fxBack(f12) {
    if (P.dq < 0.6) { const [sx] = toScr(1, 0); groundShadow(sx, 11, LIFT + 2 + P.lift); }
    if (P.rim >= 2 && P.dq < 1) floorGlow(toScr(coreLocal()[0] - P.bx - OX, 0)[0], P.rim, EL, f12);
    stormCloud(cloudX, cloudY, cloudS, f12);
  }
  // 翼缺口里的电弧：两根翼指骨之间、翼指骨和下一根飞羽之间跳一小段折线
  function zig(x0, y0, x1, y1, f12, c0, c1) { const n = 3; let px = x0, py = y0; for (let k = 1; k <= n; k++) { const t = k / n, j = k === n ? 0 : (hash(k + f12, R(x0)) - 0.5) * 3, x = lerp(x0, x1, t) + j * 0.5, y = lerp(y0, y1, t) + j; ln(px, py, x, y, k & 1 ? c0 : c1); px = x; py = y; } }
  function fxFront(f12) {
    if (P.dq >= 1) { drawBolts(f12); return; }
    const st = E.state, hot = st === CHARGE || st === CAST;
    if ((hot || (st === IDLE && (f12 % 6) === 1)) && !P.flip) {                             // 翼缺口电弧
      const G = wingGeom(rig.wing.x - 1.5, rig.wing.y, P.wing, WING), e = WING.bone, pt = (k) => toScr(lerp(G.wx, G.tips[2 * k], k === 3 ? 0.8 : e), lerp(G.wy, G.tips[2 * k + 1], k === 3 ? 0.8 : e));
      const a = pt(1), b = pt(2), c = pt(3); zig(a[0], a[1], b[0], b[1], f12, EL[1], EL[2]); if (hot && (f12 & 1)) zig(b[0], b[1], c[0], c[1], f12 + 3, EL[2], EL[3]);
    }
    const stat = hot || (st === IDLE && P.crest !== 0) || (st === MOVE && (f12 & 3) === 0);
    if (stat && !P.flip) for (const [, , x1, y1] of crestGeom(rig)) if (hash(R(x1) + f12, 3) < 0.55) { const [x, y] = toScr(x1, y1); put(x + 1, y - 1, EL[0]); put(x + 2, y - 1, EL[2]); if (hash(f12, R(y1)) < 0.5) put(x, y - 2, EL[1]); }   // 羽冠静电
    if (clT < 2 / 12) {                                                                    // 3 道平行爪痕拖影
      const first = clT < 1 / 12;
      for (let k = 0; k < 3; k++) for (let i = 0; i <= 9; i++) { if (!first && (i & 1)) continue; put(clX - 9 + i, clY - 3 + k * 3 + R(i * 0.55), first ? (i > 6 ? EL[0] : EL[2]) : EL[3]); }
    }
    if (st === CAST && P.gem === 3 && zapT > 1) {                                          // 蓄满仰头的那一帧：口前星芒预兆
      const [mx, my] = mouthScr(); for (let r = 2; r <= 4; r++) { put(mx + r, my, EL[r - 2]); put(mx, my - r, EL[r - 1]); put(mx, my + r, EL[r - 1]); }
    }
    drawBolts(f12);
  }

  return {
    name: '蓝龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.core, m.spark, m.eye], HIT_POINT, EVENTS, deathKit, REVIVE: { ramp: R_EL, dy: -14 },
    SFX: { body: 'beast', how: 'explode', pal: 'bolt', style: 'bolt', w: 0.7, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
