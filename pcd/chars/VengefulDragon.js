// 复仇之龙（衍生单位 · 骷髅 · 射手 · 普通）：死灵法师召唤出的亡灵飞龙——腐肉翼龙，只有两条后腿（前肢就是翼），离地 8 格悬停；
// 身体一半腐肉一半露骨：前半身是暗褐腐皮（带两个烂洞），腹侧一排肋骨露在外面、4 根肋骨尖戳出腹线，臀上露出骨盆，尾巴是一串裸露的尾椎、末端挂一缕腐皮；
// 龙颅上长着和死灵法师同款的三尖骨冠；一对墓苔墨绿的破洞膜翼（翼膜破了 3 个洞，翼骨裸露）。
// 攻击：扑翼后仰头，吐出一颗魂焰弹直线飞向目标。技能「吞噬回血」（desc：击杀敌人时恢复自身生命值）：悬停后退、下颌张到最大、魂焰在喉中翻涌、
// 腹侧肋骨间透出魂光 → 收翼俯冲扑到目标身上一口咬住（咬合拖影），撕下一大团魂光、震屏 2 格 → 魂光顺着脖子流进胸腔，腐肉上的烂洞逐帧合拢，
// 身上浮起暗红治疗十字，飞回原位。死亡：坠落——翼一垂失控坠地（离地 8 → 0），落地腐肉溅开成一滩，骨架摊平后魂光离体上升。
// 身体用 parts-beast 的 quad（dragon 头型，只画两条后腿）；破洞膜翼是 B.wing 加打洞画笔；骨冠、尾椎、露骨腹、腐肉滩是本模块的自画部件。
PCD.define('VengefulDragon', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_PHYS, K_BURST,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, groundShadow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.soul, EL = FXR[R_EL];                                   // 亡灵吞噬 · 魂光蓝紫（和死灵法师同一色阶）
  const R_BLOOD = FXI.blood, BL = FXR[R_BLOOD];                            // 回血的暗红十字（blood 第 2、3 级）
  const R_ROT = fxRamp('rotMote', [37, 36, 35, 34, 0]);                    // 身下掉的腐绿尘粒
  const R_FLESH = fxRamp('rotFlesh', [15, 16, 19, 20, 0]);                 // 落地溅开的腐肉块
  const R_BONE = fxRamp('boneDust', [21, 17, 6, 7, 8]);                    // 受击骨屑
  const m = B.mats(E, {
    main: 'skinDark',                                                      // 腐肉暗褐
    wing: 'moss', bone: 'bone', claw: 'bone', teeth: 'white',              // 墓苔墨绿翼膜、裸露的翼骨 / 肋骨 / 尾椎
    eye: [0, 0, 23, 22], glow: [24, 23, 22, 21],                           // 眼窝魂光、口中魂焰（发光体）
  });
  const WING = { span: 18, chord: 7, type: 'membrane', fingers: 3 };
  const o = Q.shape({ len: 11, chest: 3.6, rump: 2.8, waist: 0.3, hump: 0.3, leg: 5, lw: 2, thigh: 2.2, farDx: -2, stride: 2, lift: 2, foot: 'claw',
    neck: 7, neckA: 0.45, neckW: 1.7, head: { type: 'dragon', w: 6, h: 4.6, snout: 5.5, snH: 3, tip: 0.7, horn: '', teeth: 2 }, headA: 0.12,
    tail: 'none', mane: 'none', fur: 0, lieLegs: 1, m });

  const HX = 34, HOVER = 8, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 66, 50, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 9, 12], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'spec', 'claw', 'teeth', 'glow', 'bone', 'boneFar', 'wing', 'wingFar']) RIM.skip[m[k]] = 1;
  // 自己的姿势字段：wound 腐肉烂洞 0 合拢 … 3 张开 · rib 肋骨间魂光 0–2 · splat 腐肉滩 0–3 · shk 甩头（涎液甩出）
  const SPEC = Q.KEYS.concat(B.COMMON, [['wound', 0, 3], ['rib', 0, 2], ['splat', 0, 3], ['shk', 0, 1]]);
  const P = {};
  let dive = 0;                                                            // 俯冲进度 0–1（换算成 P.mx，不进缓存键）
  function reset() { Q.reset(P); P.lift = HOVER; P.jaw = 1; P.glow = 1; P.wing = 4; P.wound = 3; P.rib = 0; P.splat = 0; P.shk = 0; dive = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x - 1), R(rig.C1.y)];

  // ───── 姿势 ─────
  const T_SPIT = 2 / 12, T_BITE = 2 / 12, T_SWALLOW = 0, T_HEAL = 0.25, T_LAND = INCOMING + 0.66, T_SOUL = INCOMING + 0.95;
  const HANG = [[-5, 2.5], [-6, 2]];                                        // 飞着时后腿收在腹下往后伸：[脚在胯后几格, 脚在胯下几格]
  function hangLegs() {                                                     // 翼龙两足：飞着时后腿往后下方垂，扑翼时轻轻摆
    if (rig.lie) return;
    const h = HANG[P.gf >= 0 ? 1 : 0], sw = P.gf >= 0 ? [0, -1, 0, 1][P.gf] : 0;
    for (const i of [0, 2]) { const L = rig.legs[i]; L.F = [L.T[0] + h[0] + sw, L.T[1] + h[1] + (L.far ? -1 : 0)]; L.up = true; }
  }
  function idle(tq, f12) {
    const TT = f12 / 12, fi = Math.floor(TT * 5 + 1e-6) & 3;                 // 0.2 s 一个翼姿：慢速扑翼悬停
    P.wing = [1, 4, 2, 4][fi]; P.bob = B.FLAP_BOB[fi]; P.tail = [0, 1, 0, -1][Math.floor(TT * 2.5 + 1e-6) & 3]; P.jaw = 1; P.glow = 1;
    const lp = tq % DUR[IDLE];
    if (lp >= 1.8 - 1e-6 && lp < 2.2) { const k = Math.min(4, f12of(lp - 1.8)); P.head = [-1, 2, -1, 1, 0][k]; P.jaw = [2, 1, 2, 1, 1][k]; P.shk = k >= 1 && k <= 3 ? 1 : 0; }   // 循环末尾甩一下头
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                  // 扑翼飞行：4 帧沉重扑翼 + 上下飘 2 格，身子前倾
      const f = Math.floor(tq * 6 + 1e-6) & 3; P.gf = f; P.wing = B.FLAP[f]; P.bob = B.FLAP_BOB[f]; P.pitch = -1; P.head = f & 1 ? 0 : 1; P.tail = [-1, 0, 1, 0][f];
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                              // 扑翼后仰头 → 往前一吐魂焰弹
      if (tq < 0.12) { P.wing = 1; P.head = -2; P.pitch = 1; P.jaw = 1; P.glow = 2; P.bx = -1; P.tail = 1; P.rim = 1; }
      else if (tq < 0.25) { P.wing = 3; P.head = 1; P.jaw = 3; P.glow = 3; P.bx = 1; P.bob = -1; P.tail = -1; P.rim = 2; }
      else if (tq < 0.45) { P.wing = 4; P.head = 0; P.jaw = 2; P.glow = 2; P.bx = 1; P.rim = 1; }
      else { idle(tq, f12); if (tq < 0.6) P.bx = 1; }
    } else if (st === CHARGE) {                                              // 悬停后退、下颌张到最大，魂焰在喉中翻涌，肋骨间透出魂光
      const q = ease.inOut(clamp01(tq / 0.7)); P.bx = q > 0.3 ? -1 : 0; P.jaw = q < 0.3 ? 1 : q < 0.6 ? 2 : 3; P.head = q > 0.5 ? -1 : 0; P.pitch = q > 0.5 ? 1 : 0;
      P.wing = (f12 >> 1) & 1 ? 5 : 4; P.glow = tq < 0.45 ? 2 : 3; P.rib = tq < 0.5 ? 1 : 2; P.rim = 2; P.tail = 1; P.lift = HOVER + 1;
      if (tq > 1.1) P.bob = f12 & 1 ? -1 : 0;
    } else if (st === CAST) {                                                // 收翼俯冲 → 一口咬住 → 往回撕
      const k = f12of(tq); P.glow = 3; P.rim = 3; P.rib = 2;
      if (k === 0) { P.wing = 0; P.pitch = -2; P.head = 1; P.jaw = 3; P.lift = 6; dive = 0.4; P.tail = 2; }
      else if (k === 1) { P.wing = 0; P.pitch = -2; P.head = 1; P.jaw = 3; P.lift = 4; dive = 0.8; P.tail = 2; }
      else if (k === 2) { P.wing = 0; P.pitch = -1; P.head = 1; P.jaw = 0; P.lift = 3; dive = 1; P.tail = 1; P.glow = 2; }
      else { P.wing = k === 3 ? 3 : 4; P.pitch = 0; P.head = 0; P.jaw = 1; P.lift = 4; dive = 1; P.bx = -2; P.tail = 0; P.glow = 2; P.rim = 2; }
    } else if (st === RECOVER) {                                             // 吞下魂光、烂洞合拢 → 飞回原位
      const f = Math.floor(tq * 6 + 1e-6) & 3; P.wing = B.FLAP[f]; P.bob = B.FLAP_BOB[f];
      if (tq < 0.3) { dive = 1; P.bx = -2; P.lift = 5; P.head = f12 & 1 ? -1 : 0; P.jaw = f12 & 1 ? 0 : 1; P.glow = 2; P.rim = 2; P.rib = 1; }
      else { dive = 1 - ease.inOut(clamp01((tq - 0.3) / 0.3)); P.bx = tq < 0.45 ? -1 : 0; P.lift = tq < 0.45 ? 6 : HOVER; P.glow = 1; P.rim = 1; P.pitch = dive > 0.1 ? 1 : 0; }
      P.wound = Math.max(0, 3 - f12of(tq));                                  // 腐肉上的烂洞逐帧合拢
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.eyes = 1; P.head = -1; P.wing = 1; P.tail = 2; P.jaw = 2; P.lift = HOVER + 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.wing = 4; P.tail = 1; P.jaw = 1; }
      else idle(tq, f12);
    } else if (st === DEATH) {                                               // 坠落：翼一垂失控坠地 → 落地腐肉溅开成一滩 → 魂光离体
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.head = -1; P.wing = 1; P.tail = 2; P.jaw = 2; P.flash = d < 1 / 12 ? 1 : 0; P.glow = (f12 & 1) ? 2 : 0; }
      else if (d < 0.5) { const k = Math.min(2, f12of(d - 0.3)); P.bx = -2; P.eyes = 1; P.wing = 6; P.pitch = -2; P.head = 2; P.jaw = 2; P.tail = 2; P.lift = [6, 4, 3][k]; P.glow = 0; }
      else {
        P.bx = -3; P.lie = 2; P.eyes = 1; P.wing = 2; P.jaw = 1; P.glow = 0; P.lift = d < 0.58 ? 2 : d < 0.66 ? 1 : 0; P.tail = d < 0.9 ? 1 : 0;
        if (d >= 0.66) P.splat = Math.min(3, 1 + f12of(d - 0.66));
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o); hangLegs();
    if (dive > 0) P.mx = R(dive * (DUMMY_X - 4 - HX - rig.mouth[0] - P.bx));
    P.gx = R(rig.mouth[0]) + P.bx; P.gy = R(rig.mouth[1]);
    B.key(P, SPEC);
  }

  // ───── 自画部件 ─────
  // 候选部件：tornWing 破洞膜翼（B.wing 膜翼 + 打洞画笔：按同一套翼几何在三段指间膜中部各打一个洞，只打膜不打骨）
  const WD = Object.create(E); let holes = null;
  WD.sp = (x, y, mm, t) => { if (holes && (mm === m.wing || mm === m.wingFar)) for (const h of holes) if ((x - h[0]) ** 2 + (y - h[1]) ** 2 <= h[2]) return; E.sp(x, y, mm, t); };
  function wingGeom(x, y, pose, w) {                                        // 和 B.wing 同一套几何：腕点、翼指尖、后根
    const W = B.WINGS[pose | 0], a0 = W[0], aT = W[1], fold = W[2], S = w.span, nf = w.fingers;
    const arm = S * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, T = [];
    for (let k = 0; k < nf; k++) { const q = k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = S * (0.62 - 0.12 * q) * (1 - 0.55 * fold); T.push([wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl]); }
    return { wx, wy, T, bx: x - w.chord * (1 - 0.3 * fold), by: y + 1 };
  }
  function tornWing(x, y, pose, far) {
    const g = wingGeom(x, y, pose, WING), T = g.T, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const ends = [mid(T[0], T[1]), mid(T[1], T[2]), mid(T[2], [g.bx, g.by])], at = [0.6, 0.55, 0.5], rr = [1.5, 2.1, 1.3];
    holes = ends.map((e, i) => [lerp(g.wx, e[0], at[i]), lerp(g.wy, e[1], at[i]), rr[i]]);
    B.wing(WD, x, y, pose, WING, m, far); holes = null;
  }
  // 候选部件：boneTail 裸尾椎（一节节骨结：粗节 + 细关节交替，节上有棘突；c.strip 末端挂一缕随尾甩的腐皮）
  function boneTail(c) {
    part();
    const sw = (P.tail | 0) * 0.18; let x = rig.tail.x, y = rig.tail.y, a = rig.lie === 2 ? -0.05 : c.a0;
    for (let k = 0; k <= c.n; k++) {
      const q = k / c.n, r = lerp(c.r0, c.r1, q);
      if ((k & 1) === 0) { U.disc(E, x, y, r, m.bone, 0); if (r >= 1 && k < c.n - 1) U.dot(E, x, y - R(r) - 1, m.bone, 4); }   // 骨节 + 棘突
      else U.dot(E, x, y, m.bone, 1);                                                                                       // 关节（暗）
      a += c.curl * q * 0.35 + sw * (0.25 + q) * 0.35; x -= Math.cos(a) * 1.4; y -= Math.sin(a) * 1.4; if (y > -0.5) { y = -0.5; a = 0; }
    }
    if (c.strip) for (let k = 1; k <= c.strip; k++) U.dot(E, x + R(sw * k * 1.2) + (k > 1 ? 1 : 0), y + k, m.body, k === c.strip ? 1 : 2);   // 末端挂的一缕腐皮
  }
  // 躯干：腐肉 + 露骨（紧跟 Q.body 画、并进躯干部件）：下半腹是一排外露的肋骨（肋间透魂光）、4 根肋骨尖戳出腹线、臀上露骨盆、颈背一排椎棘、两个腐肉烂洞
  const WOUND_R = [0, 0.6, 1.1, 1.6];
  function rotBody() {
    Q.body(E, rig, P, o);
    const C1 = rig.C1, C2 = rig.C2, x0 = R(C2.x + 2), x1 = R(C1.x - 0.5), lie = rig.lie === 2;
    let n = 0;
    for (let x = x0; x <= x1; x++) {
      const s = Q.span(rig, o, x); if (!s) continue; const ym = R(lerp(s[0], s[1], lie ? 0.4 : 0.55)), rib = ((x - x0) & 1) === 0;
      for (let y = ym; y <= s[1]; y++) {
        if (rib) U.dot(E, x, y, m.bone, y === ym ? 4 : y === s[1] ? 2 : 3);
        else if (P.rib) U.dot(E, x, y, m.glow, P.rib === 2 ? 3 : 2);
        else U.dot(E, x, y, m.body, 1);
      }
      if (rib && !lie && n < 4 && x > x0) { U.dot(E, x, s[1] + 1, m.bone, 3); if (n & 1) U.dot(E, x + 1, s[1] + 2, m.bone, 4); n++; }   // 戳出腹线的肋骨尖
    }
    U.oval(E, C2.x - 0.5, C2.y - C2.r * 0.35 * rig.sq, 2.3, 1.4, m.bone, 0); U.dot(E, C2.x - 1, C2.y - C2.r * 0.35 * rig.sq, m.ink, 0);   // 骨盆 + 闭孔
    const na = Math.atan2(rig.NT.y - rig.NB.y, rig.NT.x - rig.NB.x), nx = Math.sin(na), ny = -Math.cos(na);
    for (let k = 1; k <= 5; k += 2) U.dot(E, lerp(rig.NB.x, rig.NT.x, k / 6) + nx * (o.neckW + 0.4), lerp(rig.NB.y, rig.NT.y, k / 6) + ny * (o.neckW + 0.4), m.bone, 4);   // 颈背椎棘
    const wr = WOUND_R[P.wound | 0];
    if (wr > 0) {
      const s = Q.span(rig, o, R(C1.x - 1)), sB = Q.span(rig, o, R(lerp(C2.x, C1.x, 0.35)));
      for (const [wx, wy] of [[C1.x - 1, s ? s[0] + 2 : C1.y - 2], [lerp(C2.x, C1.x, 0.35), sB ? sB[0] + 2 : C2.y - 2]]) {
        U.disc(E, wx, wy, wr + 0.7, m.body, 1); U.disc(E, wx, wy, wr, m.ink, 0); if (wr > 1) U.dot(E, wx, wy, m.bone, 3);
      }
    }
  }
  // 头：quad.head + 露出的下颌骨（并进头部件）
  function rotHead() {
    Q.head(E, rig, P, o);
    const F = Q.headFrame(rig, o, P.jaw);
    for (let u = F.uc + 0.5; u <= F.uT - 1; u += 0.5) { const p = F.at(u, F.prof(u)[1] + F.gap(u)); U.dot(E, p[0], p[1], m.bone, ((u * 2) | 0) % 3 === 0 ? 2 : 3); }
  }
  // 候选部件：boneCrown 三尖骨冠（和死灵法师同款：贴着颅顶一圈骨箍 + 三根骨尖，中间最高、高出头 3 格）
  function boneCrown() {
    part(); const F = Q.headFrame(rig, o, P.jaw), W = F.W;
    for (let u = -W * 0.75; u <= W * 0.45; u += 0.5) { const p = F.at(u, F.top(u) - 0.2); U.dot(E, p[0], p[1], m.bone, 2); }
    for (const [u, h] of [[-W * 0.85, 2], [-W * 0.05, 3], [W * 0.75, 2]]) {                 // 三根骨尖之间留 2 格以上的缝，剪影里读得出三个尖
      for (let k = 1; k <= h; k++) { const p = F.at(u, F.top(u) - k - 0.2); U.dot(E, p[0], p[1], m.bone, k === h ? 4 : 3); }
    }
  }
  // 候选部件：rotPuddle 腐肉滩（落地溅开：一滩扁平的腐肉 + 几块碎骨，splat 1–3 越摊越开）
  function rotPuddle() {
    if (!P.splat) return; part();
    const cx = (rig.C1.x + rig.C2.x) / 2, rx = [0, 7, 10, 12][P.splat];
    for (let x = R(cx - rx); x <= R(cx + rx); x++) { const e = Math.abs(x - cx) / rx, h = e < 0.5 ? 2 : e < 0.85 ? 1 : 0; for (let y = -h; y <= 0; y++) U.dot(E, x, y, m.body, y === -h ? 3 : (x & 3) === 1 ? 1 : 2); }
    for (const dx of [-rx + 2, rx - 3, rx * 0.4]) U.dot(E, cx + dx, -1, m.bone, 4);
  }
  function drawHero() {
    begin(hero, P.bx, 0); const lie = rig.lie === 2;
    rotPuddle();
    tornWing(rig.wing.x + 2, rig.wing.y - 1, P.wing, 1);                     // 远翼
    if (!lie) Q.leg(E, rig, P, o, 0);                                        // 远侧后腿
    boneTail({ n: 10, r0: 1.3, r1: 0.5, a0: -0.15, curl: 0.3, strip: 3 });
    rotBody();
    if (!lie) Q.leg(E, rig, P, o, 2);                                        // 近侧后腿
    tornWing(rig.wing.x, rig.wing.y, P.wing, 0);                             // 近翼
    rotHead(); boneCrown();
    if (lie) { Q.leg(E, rig, P, o, 0); Q.leg(E, rig, P, o, 2); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, dripAcc = 0, flowAcc = 0, lastGf = -9, lastShk = 0, mzT = 9, mzX = 0, mzY = 0, biteT = 9, biteX = 0, biteY = 0, blobT = 9, swT = 9, healT = 9, soulT = 9, soulX = 0, soulY = 0;
  const DX = DUMMY_X, DY = HY - 14;
  const mouthScr = () => [scrX(P.gx), HY + P.gy];
  const chestScr = () => [scrX(R(rig.C1.x) + P.bx), HY + R(rig.C1.y)];
  function onEnter(s) {
    if (s === CAST) { poseAt(CAST, 0, E.simT); const [mx, my] = mouthScr(); releaseOrbit(20, 50, 0.2, 0.4, { up: 4 }); burst(mx, my, 8, 20, 50, 0.2, 0.4, R_EL, 4); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SPIT) {                                         // 吐出魂焰弹
      poseAt(ATTACK, t, E.simT); const [mx, my] = mouthScr(); mzT = 0; mzX = mx; mzY = my;
      shoot(1, mx + 2, my, 150, DX - 4, R_EL, 0, { trail: { every: 1, life: [0.15, 0.35], back: [10, 30] } });
      burst(mx + 1, my, 6, 20, 50, 0.15, 0.35, R_EL, 2);
      sfx('swing', { kind: 'bite', w: 0.5 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === CAST && t === T_BITE) {                                           // 一口咬住，撕下一大团魂光
      poseAt(CAST, t, E.simT); const [mx, my] = mouthScr(); biteT = 0; biteX = mx; biteY = my; blobT = 0;
      for (let i = 0; i < 18; i++) { const a = Math.random() * 6.2832, r = 3 + Math.random() * 6; spawnX(K_SPIRAL_PT, mx + 2, my, (r - 1) / (0.25 + Math.random() * 0.15), 0, 9, R_EL, { a, r, w: 6, tx: mx + 2, ty: my }); }
      burst(DX, DY, 16, 30, 80, 0.2, 0.45, R_EL, 10); ring(mx + 2, my, 1, R_EL);
      hitDummy(1, 1); dummyFx({ dur: 0.6, tint: R_EL }); shake(0.28, 2); flash(0.05);
      sfx('hit', { mat: 'flesh', w: 0.6 }); sfx('impact', { pal: 'shadow', w: 0.6 });
    }
    if (s === RECOVER && t === T_SWALLOW) swT = 0;                             // 魂光顺着脖子流进胸腔
    if (s === RECOVER && t === T_HEAL) {                                        // 身上浮起暗红治疗十字
      const [cx, cy] = chestScr(); healT = 0; burst(cx, cy, 10, 15, 40, 0.3, 0.55, R_BLOOD, 10); ring(cx, cy, 0, R_BLOOD);
      sfx('impact', { pal: 'blood', w: 0.35 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1] - HOVER, 4, 20, 50, 0.3, 0.5, R_EL, 10);
    if (s === DEATH && t === T_LAND) {                                          // 落地：腐肉溅开
      poseAt(DEATH, t, E.simT); const cx = scrX(R((rig.C1.x + rig.C2.x) / 2) + P.bx);
      for (let i = 0; i < 16; i++) spawnX(K_PHYS, cx - 6 + Math.random() * 12, HY - 2, (Math.random() - 0.5) * 70, -30 - Math.random() * 40, 0.6 + Math.random() * 0.4, R_FLESH, { g: 220, floor: FLOOR - 1 });
      for (let i = 0; i < 12; i++) spawn(K_DUST, cx - 12 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.6 });
    }
    if (s === DEATH && t === T_SOUL) { poseAt(DEATH, t, E.simT); const [cx, cy] = chestScr(); soulT = 0; soulX = cx; soulY = cy - 2; burst(cx, cy - 2, 10, 10, 30, 0.3, 0.6, R_EL, 8); }
  }
  const EVENTS = [[], [], [T_SPIT], [], [T_BITE], [T_SWALLOW, T_HEAL], [INCOMING], [T_LAND, T_SOUL], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 12, 30, 80, 0.2, 0.45, R_EL, 8); ring(x, y, 0, R_EL); hitDummy(0, 1); sfx('hit', { mat: 'flesh', w: 0.45 }); }
  }
  function stepFX(dt, state, stT) {
    const [mx, my] = mouthScr();
    if (state === IDLE) {                                                       // 魂光涎液从嘴角滴落；甩头时甩出去
      dripAcc += dt * 1.7; while (dripAcc >= 1) { dripAcc -= 1; spawnX(K_PHYS, mx - 1, my + 1, (Math.random() - 0.5) * 4, 4, 1.1, R_EL, { g: 110, floor: FLOOR - 1 }); }
      if (P.shk && !lastShk) for (let i = 0; i < 4; i++) spawnX(K_PHYS, mx, my, (P.head > 0 ? 1 : -1) * (20 + Math.random() * 30), -10 - Math.random() * 15, 0.8, R_EL, { g: 160, floor: FLOOR - 1 });
    }
    lastShk = P.shk;
    if (state === MOVE && P.gf !== lastGf) {                                    // 每次扑翼身下掉 1 颗腐绿尘粒；下压那一拍是翼声
      spawnX(K_PHYS, scrX(R(rig.C2.x + 2)), HY + R(rig.C2.y + rig.C2.r), (P.flip ? 1 : -1) * 4, 6, 0.9, R_ROT, { g: 60, floor: FLOOR - 1 });
      if (P.gf === 2) sfx('step', { w: 0.3 });
      lastGf = P.gf;
    }
    if (state === CHARGE) {                                                     // 魂焰在喉中翻涌 + 肋骨间魂光往上冒
      chargeAcc += dt * (14 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 7 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, mx, my, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 3 + Math.random() * 3); }
      if (P.rib && Math.random() < dt * 10) { const x = scrX(R(lerp(rig.C2.x, rig.C1.x, Math.random())) + P.bx); spawn(K_EMBER, x, HY + R(rig.C1.y + 2), (Math.random() - 0.5) * 4, -6 - Math.random() * 6, 0.5 + Math.random() * 0.3, R_EL); }
    }
    if (swT < 0.32) {                                                           // 沿颈吞下：以胸腔为圆心，从嘴那一侧缓缓卷进去
      flowAcc += dt * 45; const [cx, cy] = chestScr(), dx = mx - cx, dy = my - cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
      while (flowAcc >= 1) { flowAcc -= 1; spawnX(K_SPIRAL_PT, cx, cy, (r - 1) / (0.25 + Math.random() * 0.12), 0, 9, R_EL, { a: a + (Math.random() - 0.5) * 0.3, r: r + Math.random() * 2, w: 0.8, tx: cx, ty: cy }); }
    }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 1.2 : 5); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, mx + R(Math.random() * 2), my - 1, Math.random() * 6 - 2, -5 - Math.random() * 5, 0.5 + Math.random() * 0.4, R_EL); } }
    if (state === DEATH && soulT < 1.6) { soulAcc += dt * 18; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, soulX - 8 + Math.random() * 16, soulY + 2 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.7 + Math.random() * 0.6, R_EL); } }
    mzT += dt; biteT += dt; blobT += dt; swT += dt; healT += dt; soulT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; dripAcc = 0; flowAcc = 0; lastGf = -9; lastShk = 0; mzT = 9; biteT = 9; blobT = 9; swT = 9; healT = 9; soulT = 9; }
  function fxBack(f12) {
    if (P.dq < 1 && !P.lie) groundShadow(scrX(R((rig.C1.x + rig.C2.x) / 2)), 9, P.lift + 4);
    if (P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
  }
  function cross(x, y, c0, c1) { put(x, y, c0); for (const [i, j] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { put(x + i, y + j, c0); put(x + 2 * i, y + 2 * j, c1); } }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? 21 : EL[0]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[1]); put(mzX + r - 1, mzY - 1, EL[1]); put(mzX + r - 1, mzY + 1, EL[2]); } }
    if (biteT < 2 / 12) {                                                        // 咬合拖影：上下两道牙弧往嘴尖合拢
      const c = biteT < 1 / 12 ? 21 : EL[1], c2 = biteT < 1 / 12 ? EL[0] : EL[2];
      for (let k = 0; k <= 6; k++) { const x = biteX - 3 + k, dy = R(5 * (1 - k / 6) ** 1.5); if (biteT >= 1 / 12 && (k & 1)) continue; put(x, biteY - dy - 1, k > 3 ? c : c2); put(x, biteY + dy + 1, k > 3 ? c : c2); }
    }
    if (blobT < 0.45 && E.state === CAST) {                                        // 叼在嘴里撕下来的一大团魂光（抖动）
      const [mx, my] = mouthScr(), j = f12 & 1, cx = mx + 3 + j, cy = my + 1;
      for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) { if (x * x + y * y > 5) continue; put(cx + x, cy + y, x * x + y * y <= 1 ? (j ? 21 : EL[0]) : y > 0 ? EL[2] : EL[1]); }
      put(cx + 3, cy - 1 + j, EL[2]); put(cx + 2, cy + 3, EL[3]);
    }
    if (healT < 0.55) {                                                           // 暗红治疗十字从胸口浮起
      const [cx, cy] = chestScr(), y = cy - 5 - R(healT * 14), blink = healT > 0.4 && (f12 & 1);
      if (!blink) cross(cx, y, BL[2], BL[3]);
      if (healT > 0.12 && healT < 0.45) cross(cx - 7, y + 3, BL[3], BL[4]);
    }
    if (soulT < 1.1) {                                                            // 魂光离体上升（一团 3×3 魂火）
      const y = soulY - R(soulT * 16), c = soulT < 0.15 ? 21 : EL[0];
      for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) put(soulX + i, y + j, i === 0 && j === 0 ? c : EL[soulT > 0.8 ? 2 : 1]);
      put(soulX, y - 2, EL[1]); if (f12 & 1) put(soulX + 1, y - 3, EL[2]);
    }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                          // 魂焰弹：3×3 魂火 + 白芯 + 往后上方飘的火尾
    if (k !== 1) return false;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(x + i, y + j, i === 0 && j === 0 ? 21 : (i + j) < 0 ? Rr[0] : Rr[1]);
    put(x + 2 * d, y, Rr[0]); put(x - 2 * d, y - 1, Rr[1]); put(x - 3 * d, y - 1 - (f12 & 1), Rr[2]); put(x - 2 * d, y + 1, Rr[2]); put(x - 4 * d, y - 2, Rr[3]);
    return true;
  }

  return {
    name: '复仇之龙', HX, R_EL, R_HURT: R_BONE, DUR, hero, P, GLOW_MATS: [m.glow, m.eye], HIT_POINT, EVENTS, REVIVE: { dy: -18 },
    SFX: { body: 'beast', how: 'collapse', pal: 'shadow', style: 'shadow', w: 0.55, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
