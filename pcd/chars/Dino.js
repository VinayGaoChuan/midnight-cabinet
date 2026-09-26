// 恐龙（敌人 · 野兽 · 普通 · 近战 240）：大头双足小霸王龙——头占全身 1/3、方头巨嘴永远咧着露出一排钝牙、头顶一根歪长的肉冠，
// 胸前两只够不着脸的小短手（伸出轮廓一对小钩），粗尾巴贴地拖在身后，背上一排圆钝骨板；身体前倾靠尾巴平衡，最呆。
// 身体借 parts-beast 的 quad（lizard 头放大 + 躯干 pitch 3 前高 + long 尾），双后腿、小短手、骨板、肉冠、钝牙是本模块自画的部件。
// 攻击 = 咬：头先后缩张嘴，再猛往前一伸一口咬下。技能（无特性 → 表现「非常肉」）：低头刨地、两只后腿轮流跺地（地裂 + 震屏），
// 尘土在脚边聚成一团、眼冒土黄火星 → 低头冲撞 8 格，身后一溜尘土、前方土浪 → 头槌撞上目标（大冲击环 + 土块外爆、目标击退），自己头上转两颗晕星 → 摇摇头退回。
// 死亡 = 仰倒蹬腿：往后一仰倒地，两腿朝天蹬两下，小手还在晃，然后不动，尘土扬起、化灰。
PCD.define('Dino', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 元素：蛮劲 · 尘土（earth：奶油 → 淡土黄 → 土褐 → 深褐 → 墨褐）─────
  const R_EL = FXI.earth, EL = FXR[R_EL];
  const m = B.mats(E, {
    main: E.ramp(['#141c08', '#34481a', '#5a7a2c', '#8aaa4a']),        // 苔绿粗鳞
    belly: 'sand', plate: 'wood', teeth: 'bone', claw: 'bone', crest: 'pink', eye: [0, 0, 14, 5], sclera: [7, 18, 17, 21],
    glow: [19, 61, 62, 5],                                                // 蓄力时眼里的土黄火光
  });
  const SHAPE = { len: 7, chest: 5.5, rump: 5, waist: 0, hump: 0.5, leg: 9, lw: 3, thigh: 3, neck: 2, neckA: 0.9, neckW: 3.5,
    head: { type: 'lizard', w: 9, h: 7.5, snout: 5.5, snH: 5, tip: 0.9, teeth: 0 }, headA: 0.25,
    tail: 'long', tailLen: 13, tailW: 5, tailA: -1.0, tailCurl: 0, mane: 'none', pattern: 'scales', fur: 0, m };
  const o = Q.shape(SHAPE);
  const HX = 66, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 52, 50, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'glow', 'teeth', 'claw', 'sclera', 'ink', 'spec']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：step / wup 双后腿步态 · upN upF 跺地抬起的近 / 远侧脚 · arm 小短手 0 垂 / 1 够脸 / 2 乱挥 / 3 缩 · kick 死亡蹬腿 0–2 · st 状态
  const EXTRA = [['step', -1, 1], ['wup', 0, 2], ['upN', 0, 3], ['upF', 0, 3], ['arm', 0, 3], ['kick', 0, 2], ['st', 0, 8]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.pitch = 3; P.step = 0; P.wup = 0; P.upN = 0; P.upF = 0; P.arm = 0; P.kick = 0; P.st = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x) - 1, R(rig.C1.y) + 2];

  // ───── 姿势 ─────
  const T_BITE = 2 / 12, T_BUMP = 2 / 12, STOMPS = [0.35, 0.65, 0.95, 1.2], T_LAND = INCOMING + 0.66;
  const G_STEP = [1, 0, -1, 0], G_UP = [0, 2, 0, 1];
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.pitch = 3; P.mane = 0;
    if (lp >= 1.2 - 1e-6 && lp < 2.2) {                                   // 发呆：歪头看天、嘴张着、慢慢眨眼，小手够不着脸去挠
      const k = f12of(lp - 1.2);
      P.head = k < 2 ? -1 : k < 10 ? -2 : -1; P.jaw = k >= 1 && k < 10 ? 1 : 0; P.eyes = k === 3 || k === 4 || k === 9 ? 1 : 0;
      P.arm = k >= 5 && k < 9 ? (k & 1 ? 1 : 2) : 0; P.bob = 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset(); P.st = st;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                               // 笨重双足踏步：每步下沉 1 格、尾巴左右甩、头点一下
      const f = Math.floor(tq * 6 + 1e-6) & 3; P.step = G_STEP[f]; P.wup = G_UP[f]; P.bob = f & 1 ? 0 : 1; P.tail = [-1, 0, 1, 0][f]; P.head = f & 1 ? 0 : 1; P.arm = f & 1 ? 2 : 0;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                           // 咬：头后缩张嘴 → 猛往前一伸咬下
      if (tq < 1 / 12 - 1e-6) { P.bx = -1; P.head = -1; P.jaw = 2; P.pitch = 4; P.tail = 1; }
      else if (tq < T_BITE - 1e-6) { P.bx = -2; P.head = -2; P.jaw = 3; P.pitch = 4; P.tail = 2; P.arm = 3; }
      else if (tq < 0.25) { P.bx = 7; P.head = 2; P.jaw = 0; P.pitch = 2; P.tail = -2; P.arm = 2; }
      else if (tq < 0.45) { P.bx = 6; P.head = 1; P.jaw = 1; P.pitch = 2; P.tail = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.bx = R(6 * (1 - q)); P.head = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                           // 低头刨地，两只后腿轮流跺地，眼冒土黄火星
      const q = ease.inOut(clamp01(tq / 0.3)); P.head = R(3 * q); P.pitch = R(3 - 2 * q); P.crouch = R(q); P.bx = -R(2 * q); P.arm = 3; P.tail = 1; P.rim = tq > 0.6 ? 2 : 1;
      for (let i = 0; i < STOMPS.length; i++) { const d = STOMPS[i] - tq; if (d > 0 && d <= 0.17) { if (i & 1) P.upF = d > 0.09 ? 3 : 2; else P.upN = d > 0.09 ? 3 : 2; } }
      if (tq > 0.7) { P.glow = 2; P.tail = (f12 & 1) ? 2 : 1; }
    } else if (st === CAST) {                                             // 低头冲撞 8 格，头槌撞上，弹回一点
      P.head = 3; P.pitch = 0; P.crouch = 1; P.jaw = 0; P.tail = 2; P.arm = 3; P.rim = 3; P.glow = 2;
      if (tq < T_BUMP - 1e-6) { P.bx = tq < 1 / 12 ? 3 : 8; P.step = tq < 1 / 12 ? 1 : -1; }
      else { P.bx = tq < 0.25 ? 9 : 7; P.eyes = 1; P.glow = 0; P.rim = 1; P.head = 2; P.arm = 2; }
    } else if (st === RECOVER) {                                          // 摇摇头，退回原位
      const q = ease.inOut(clamp01(tq / 0.6)); P.bx = R(7 * (1 - q)); P.eyes = tq < 0.35 ? 1 : 0;
      P.head = tq < 0.4 ? ((f12 & 1) ? -1 : 1) : 0; P.jaw = tq < 0.4 ? 1 : 0; P.arm = tq < 0.4 ? 2 : 0; P.pitch = R(1 + 2 * q);
      if (P.bx > 0) P.step = (f12 >> 1) & 1 ? 1 : -1;
    } else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.pitch = 4; P.jaw = h < 0.2 ? 2 : 0; P.arm = h < 0.35 ? 2 : 0; }
    } else if (st === DEATH) {                                            // 仰倒蹬腿
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.pitch = d < 0.15 ? 4 : 5; P.head = -2; P.jaw = 2; P.tail = 2; P.arm = 2; }
      else if (d < 0.5) { P.bx = -3; P.eyes = 1; P.pitch = 6; P.crouch = 2; P.head = -2; P.jaw = 3; P.tail = 2; P.arm = f12 & 1 ? 1 : 2; }
      else {
        P.bx = -4; P.lie = 2; P.eyes = 1; P.jaw = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tail = d < 0.9 ? 1 : 0;
        P.kick = d >= 0.7 && d < 1.1 ? (Math.floor((d - 0.7) / 0.1 + 1e-6) & 1 ? 2 : 1) : 0;
        P.arm = d < 1.2 ? (f12 & 1 ? 2 : 1) : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    P.gx = R(rig.mouth[0]) + P.bx; P.gy = R(rig.mouth[1]);
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：bipedLeg —— 兽脚类双后腿（粗圆大腿 → 前顶的膝 → 后折的跗 → 往前的三趾脚 + 骨白爪）；侧躺时朝天伸出，kick 蹬直 / 屈起
  function hindLeg(far, fx, up, kick) {
    E.part(); const mat = far ? m.far : m.limb, C2 = rig.C2, dx = far ? -1 : 1;
    if (rig.lie) {
      const hx = C2.x + dx * 1.5, hy = C2.y - 1, ext = kick === 2 ? 1 : kick === 1 ? -1 : 0;
      const kx = hx + dx * 2 + (far ? -1 : 2), ky = hy - 5 - ext, fX = hx + dx * 2 + (far ? -2 : 1), fY = hy - 9 - ext * 2 + (far ? 1 : 0);
      U.disc(E, hx, hy, 2.6, mat, 0); U.taper(E, hx, hy, kx, ky, 2.2, 1.4, mat, 0); U.seg(E, kx, ky, fX, fY, 2, mat, 0);
      U.dot(E, fX + 1, fY - 1, mat, 0); U.dot(E, fX + 2, fY - 1, mat, 0); U.dot(E, fX + 3, fY - 2, m.claw, 3); U.dot(E, fX - 1, fY - 1, m.claw, 2);
      return;
    }
    const hx = C2.x + (far ? 0 : 1.5), hy = C2.y + 2.5, fy = -up;
    const kx = (hx + fx) / 2 + 2.5, ky = hy + (fy - hy) * 0.42, ax = fx - 1.5, ay = fy - 3;
    U.disc(E, hx, hy, o.thigh, mat, 0); U.taper(E, hx, hy, kx, ky, 2.6, 1.6, mat, 0);
    U.taper(E, kx, ky, ax, ay, 1.4, 1.1, mat, 0); U.seg(E, ax, ay, fx - 1, fy - 1, 2, mat, 0);
    for (let k = -2; k <= 2; k++) U.dot(E, fx + k, fy, mat, k === 2 ? 2 : 0); for (let k = -1; k <= 1; k++) U.dot(E, fx + k, fy - 1, mat, 0);
    U.dot(E, fx + 3, fy, m.claw, 3); U.dot(E, fx + 2, fy - 1, m.claw, 4);
  }
  function footPos(far) {                                                 // [x, 抬起格数]：接触 A 近前远后，接触 B 互换，经过帧抬脚
    const base = rig.C2.x + (far ? 0 : 1.5) + 0.5, S = 3;
    let x = base, up = 0;
    if (P.step > 0) x += far ? -S : S; else if (P.step < 0) x += far ? S : -S;
    if (P.wup === 2 && far) { x += 1; up = 2; } if (P.wup === 1 && !far) { x += 1; up = 2; }
    if (!far && P.upN) up = P.upN; if (far && P.upF) up = P.upF;
    return [x, up];
  }
  // 候选部件：tinyArms —— 胸前的小短手（2 格前臂 + 1 格手 + 骨白小钩爪）：0 垂着 · 1 往上够脸 · 2 乱挥 · 3 缩在胸前；远侧那只暗一级、错开相位
  const ARM = [[1, 1, 2, 3], [2, 0, 3, -2], [2, 1, 3, 0], [1, 1, 1, 2]];
  function tinyArm(far) {
    E.part(); const mat = far ? m.far : m.limb, C1 = rig.C1, lie = rig.lie;
    let a = P.arm; if (far && a === 2) a = 1; else if (far && a === 1) a = 2;
    const sx = C1.x + C1.r * (lie ? 0.2 : 0.7) - (far ? 1 : 0), sy = C1.y + C1.r * (lie ? -0.5 : 0.35) - (far ? 1 : 0), A = ARM[a];
    const ex = sx + A[0], ey = sy + (lie ? -A[1] - 1 : A[1]), hx = sx + A[2], hy = sy + (lie ? -A[3] - 3 : A[3]);
    U.seg(E, sx, sy, ex, ey, 2, mat, 0); U.seg(E, ex, ey, hx, hy, 1, mat, 0);
    U.dot(E, hx + 1, hy, m.claw, 3); U.dot(E, hx + 1, hy + (lie ? -1 : 1), m.claw, 2);
  }
  // 候选部件：backPlates —— 背上一排圆钝骨板（画在躯干之前，只露出伸出背线的 2 行；颈上 1 块）
  function backPlates() {
    if (rig.lie) return; E.part(); const C1 = rig.C1, C2 = rig.C2;
    for (let x = R(C2.x - 3); x <= R(C1.x); x += 3) {
      const s = Q.span(rig, o, x); if (!s) continue; const top = s[0];
      U.dot(E, x - 1, top, m.plate, 0); U.dot(E, x, top, m.plate, 0); U.dot(E, x + 1, top, m.plate, 0);
      U.dot(E, x - 1, top - 1, m.plate, 4); U.dot(E, x, top - 1, m.plate, 0); U.dot(E, x + 1, top - 1, m.plate, 0); U.dot(E, x, top - 2, m.plate, 4);
    }
    const nx = (rig.NB.x + rig.NT.x) / 2 - 2.5, ny = (rig.NB.y + rig.NT.y) / 2 - 3; U.dot(E, nx, ny, m.plate, 4); U.dot(E, nx + 1, ny, m.plate, 0); U.dot(E, nx, ny + 1, m.plate, 0);
  }
  function bellyRows() {                                                   // 和躯干同一个部件：胸腹沙色两行（腹甲分隔）
    const C1 = rig.C1, C2 = rig.C2;
    for (let x = Math.ceil(C2.x); x <= Math.floor(C1.x + C1.r * 0.6); x++) { const s = Q.span(rig, o, x); if (!s || s[1] - s[0] < 5) continue; U.dot(E, x, s[1] - 1, m.belly, ((x + 40) % 3) === 0 ? 2 : 0); if (!rig.lie) U.dot(E, x, s[1], m.belly, 0); }
  }
  function grin() {                                                        // 和头同一个部件：一排钝牙、咧着的嘴角、呆呆的大眼
    const F = Q.headFrame(rig, o, P.jaw);
    for (let u = Math.ceil(F.uc + 1); u <= F.uT - 1; u++) {
      const pr = F.prof(u), g = F.gap(u);
      if (!P.jaw) { if (u & 1) { const a = F.at(u, pr[2] - 0.3); U.dot(E, a[0], a[1], m.teeth, 3); } }
      else { const a = F.at(u, pr[2] + 0.3), b = F.at(u, pr[2] + g + 0.1); if (u & 1) U.dot(E, a[0], a[1], m.teeth, 3); else U.dot(E, b[0], b[1], m.teeth, 4); }
    }
    const c = F.at(F.uc - 0.5, F.prof(F.uc)[2] - 1); U.dot(E, c[0], c[1], m.ink, 1);
    const e = rig.eye; if (!P.eyes) U.dot(E, e[0] - 1, e[1], (P.glow | 0) >= 2 ? m.glow : m.sclera, 3);
  }
  // 候选部件：fleshCrest —— 头顶一根歪长的肉冠（根粗梢细、往后歪、梢端下垂，随 tail 摆）
  function crest() {
    E.part(); const F = Q.headFrame(rig, o, 0), b = F.at(-F.W * 0.1, -F.Hh + 0.4), sw = (P.tail | 0) > 0 ? 1 : 0;
    U.taper(E, b[0], b[1], b[0] - 1, b[1] - 3, 1.2, 1, m.crest, 0); U.seg(E, b[0] - 1, b[1] - 3, b[0] - 3, b[1] - 5, 1, m.crest, 0);
    U.dot(E, b[0] - 4 - sw, b[1] - 5 + sw, m.crest, 4); U.dot(E, b[0] - 4 - sw, b[1] - 4 + sw, m.crest, 2); U.dot(E, b[0], b[1] - 2, m.crest, 4);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lie = rig.lie, fN = footPos(false), fF = footPos(true);
    tinyArm(true);
    if (!lie) hindLeg(true, fF[0], fF[1], 0);
    Q.tail(E, rig, P, o); backPlates();
    Q.body(E, rig, P, o); bellyRows();
    if (!lie) hindLeg(false, fN[0], fN[1], 0);
    Q.head(E, rig, P, o); grin();
    crest();
    tinyArm(false);
    if (lie) { hindLeg(true, 0, 0, P.kick === 1 ? 2 : P.kick === 2 ? 1 : 0); hindLeg(false, 0, 0, P.kick); }
  }
  function bakeHero() { RIM.rim = P.rim; const e = rig.eye; RIM.rx = R(e[0]) + P.bx + hero.ox; RIM.ry = R(e[1]) + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, sparkAcc = 0, ashAcc = 0, lastStep = 9, biteT = 9, starT = 9, trailAcc = 0;
  const headTop = () => { const H = rig.head; return [scrX(R(H.x) + P.bx), HY + R(H.y - H.Hh) - 3]; };
  const footScr = () => [scrX(R(rig.C2.x + 3) + P.bx), HY];
  function onEnter(s) {
    if (s === CAST) {                                                    // 冲出去：聚在脚边的尘团炸开，前方一道土浪
      const [fx0] = footScr();
      releaseOrbit(30, 70, 0.3, 0.6, { pts: 1, kind: K_DUST, at: [fx0, HY - 1], up: 20 });
      fx.wave(scrX(12), HY, 1, 12, 4, R_EL, 0.4, 2); ring(fx0, HY - 2, 0, FXI.dust);
      shake(0.28, 2); flash(0.05); starT = 9;
    }
    if (s === RECOVER && starT > 5) starT = 0.3;
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BITE) {                                  // 一口咬下
      biteT = 0; const x = Math.min(scrX(P.gx), DUMMY_X - 3), y = HY + P.gy;
      burst(x, y, 12, 30, 90, 0.15, 0.35, FXI.impact, 8); hitDummy(0);
      sfx('swing', { kind: 'bite', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 0.8 });
    }
    if (s === CHARGE && STOMPS.indexOf(t) >= 0) {                        // 跺地：地面裂一道小纹 + 震屏 1 格
      const i = STOMPS.indexOf(t), far = i & 1, x = scrX(R(rig.C2.x + (far ? 0.5 : 2)) + P.bx);
      fx.crack(x, HY, 5 + i, far ? -1 : 1, R_EL, 0.8, 0); shake(0.1, 1);
      for (let k = 0; k < 4; k++) spawn(K_DUST, x + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.4, FXI.dust);
      sfx('step', { w: 0.9 });
    }
    if (s === CAST && t === T_BUMP) {                                    // 头槌：大冲击环 + 土块外爆 24 颗，目标击退，自己头上转晕星
      const x = DUMMY_X - 4, y = HY - 12;
      ring(x, y, 1, R_EL); fx.cross(x, y, 6, R_EL, 0.25, 2);
      for (let i = 0; i < 24; i++) { const a = -Math.PI * (0.05 + Math.random() * 0.9), v = 40 + Math.random() * 90; spawnX(K_PHYS, x, y, Math.cos(a) * v, Math.sin(a) * v, 0.6 + Math.random() * 0.4, R_EL, { g: 240, floor: HY, sz: i % 4 === 0 ? 2 : 1 }); }
      burst(x, y, 12, 40, 110, 0.2, 0.45, FXI.impact, 10);
      hitDummy(1); shake(0.12, 1); starT = 0; sfx('impact', { pal: 'earth', w: 0.9 });
    }
    if (s === DEATH && t === T_LAND) {                                   // 仰倒落地：尘土扬起
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 34, -6 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.9 });
    }
  }
  const EVENTS = [[], [], [T_BITE], STOMPS.slice(), [T_BUMP], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.step !== lastStep) {                         // 每步震地 2 颗尘土
      if (P.step !== 0) { sfx('step', { w: 0.9 }); const x = scrX(R(rig.C2.x + 2 + P.step * 3)); for (let i = 0; i < 2; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.35 + Math.random() * 0.2, FXI.dust); }
      lastStep = P.step;
    }
    if (state === CHARGE) {
      chargeAcc += dt * 16;                                              // 尘土在脚边聚成一团
      while (chargeAcc >= 1) { chargeAcc -= 1; const [x] = footScr(), r = 10 + Math.random() * 8, a = Math.PI + Math.random() * Math.PI; spawnX(K_SPIRAL_PT, x, HY - 2, r / (0.4 + Math.random() * 0.3), 0, 9, FXI.dust, { a, r, w: 3, tx: x, ty: HY - 2, orbitR: 3, squash: 0.5 }); }
      if (stT > 0.7) { sparkAcc += dt * 7; while (sparkAcc >= 1) { sparkAcc -= 1; const e = rig.eye; spawn(K_EMBER, scrX(R(e[0]) + P.bx), HY + R(e[1]) - 1, (Math.random() - 0.5) * 10, -10 - Math.random() * 8, 0.35, R_EL); } }
    }
    if (state === CAST && stT < 0.25) {                                  // 冲撞：身后扬起一长溜尘土
      trailAcc += dt * 60; while (trailAcc >= 1) { trailAcc -= 1; spawn(K_DUST, scrX(R(rig.C2.x) + P.bx) - Math.random() * 6, HY - Math.random() * 2, -10 - Math.random() * 20, -4 - Math.random() * 8, 0.5 + Math.random() * 0.3, FXI.dust); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {   // 化灰
      ashAcc += dt * 30; while (ashAcc >= 1) { ashAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 30, HY - 1 - Math.random() * 10, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.8, FXI.dust); }
    }
    biteT += dt; starT += dt;
  }
  function fxReset() { chargeAcc = 0; sparkAcc = 0; ashAcc = 0; lastStep = 9; biteT = 9; starT = 9; trailAcc = 0; }
  function fxFront(f12) {
    if (biteT < 2 / 12) {                                                // 咬合拖影：上下两道弧合向嘴尖
      const x = Math.min(scrX(P.gx), DUMMY_X - 3), y = HY + P.gy, c = biteT < 1 / 12 ? FXR[FXI.impact][0] : FXR[FXI.impact][2];
      for (let k = 1; k <= 5; k++) { if (biteT >= 1 / 12 && (k & 1)) continue; const dy = R((5 - k) * 0.9); put(x - 6 + k, y - 1 - dy, c); put(x - 6 + k, y + 1 + dy, c); }
    }
    const st = E.state;
    if ((st === CAST || st === RECOVER) && starT < 0.95 && P.dq < 1) {   // 头顶两颗晕星
      const [x, y] = headTop();
      for (let k = 0; k < 2; k++) { const a = f12 * 0.6 + k * Math.PI, sx = R(x + Math.cos(a) * 4), sy = R(y + Math.sin(a) * 1.5), c = EL[k ? 1 : 0]; put(sx, sy, c); put(sx - 1, sy, EL[2]); put(sx + 1, sy, EL[2]); put(sx, sy - 1, EL[2]); put(sx, sy + 1, EL[2]); }
    }
  }

  return {
    name: '恐龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'earth', style: 'buff', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxFront,
  };
});
