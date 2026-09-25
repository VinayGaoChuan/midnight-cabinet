// 黑龙（部队 · 僵尸 · 先锋 · 神话）：升级线第 2 级（由赤龙升级）。飞行单位，巨膜翼低空悬停。
// 同一条龙长成了传说：赤龙的熔岩裂纹变成同样纹路的棱光晶脉（青 → 紫 → 粉流动）；近侧断角的断口上长出一截棱光水晶角，远侧角更长；
// 破膜翼长成一对完整的巨翼，当年的三个破洞被发光的多边形晶片补上；尾端岩锤变成大一倍的棱晶锤；下颌露骨处镶一圈黑曜石牙，胸前一块大棱晶护心镜。
// 攻击：悬停中身体一扭（转身），棱晶尾锤从身下往前横扫砸向目标，拖出 150° 扫击拖影弧。
// 技能「棱光护盾 + 过热」：双翼向前合拢包住身体蓄力 → 猛地张翼，身前立起六边形晶面护盾 → 三发来袭攻击打在盾上被折射成三色短光束弹开（盾只闪一段、不破）
// → 晶脉从青转成血红、外沿一圈红色轮廓光 → 护盾碎成晶屑飘落。
// 身体用 parts-beast 的 quad（躯干、腿、头、背刺）；巨膜翼、晶片、晶脉、晶角、晶锤尾、护心镜、黑曜石牙是本模块画的（通用的标了「候选部件」）。
PCD.define('BlackDragon', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, keys, q12, f12of, walkDemo, near, fxRamp, FXI, FXR, HY, FLOOR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;
  const lerp = (a, b, t) => a + (b - a) * t, cl = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 颜色、材质 ─────
  const C_OB = E.color('#15121e');
  const OBS = [0, C_OB, 9, 54];                                                                // 黑曜鳞：带紫调的黑（在夜空里比设定的 #262033 / #3d3450 提亮一级，亮面是紫色光泽；专属 1 色）
  const R_EL = fxRamp('prism', [21, 22, 43, 63, 42]), EL = FXR[R_EL];                         // 棱光：白 → 青 → 淡紫 → 粉 → 深紫
  const R_PC = fxRamp('prismCyan', [22, 22, 43, 42, 42]), R_PV = fxRamp('prismViolet', [43, 43, 63, 42, 42]), R_PP = fxRamp('prismPink', [63, 63, 43, 42, 42]);   // 折射光束 / 晶面连线三色
  const PRISM3 = [R_PC, R_PV, R_PP], HEAT_RIM = [58, 57, 57, 56, 55];                         // 过热：外沿一圈血红轮廓光
  const m = B.mats(E, { main: OBS, belly: 'stone', mane: [0, C_OB, 9, 43], wing: 'shadow', bone: [8, 9, 7, 6], claw: 'bone', horn: 'bone', teeth: 'bone', eye: [0, 0, 22, 21], glow: [22, 22, 21, 21] });
  m.hornFar = E.defMat([8, 7, 7, 6], 1); m.wing = E.defMat(E.RAMP.shadow, 1);
  m.cry = E.defMat([42, 43, 22, 21], 1, 1);                                                    // 棱光水晶（发光体）：深紫边 · 淡紫 · 青 · 白
  m.cryP = E.defMat([42, 43, 63, 21], 1, 1);                                                   // 粉面
  m.hot = E.defMat([55, 57, 58, 21], 1, 1);                                                    // 过热晶脉（血红）
  m.dead = E.defMat([0, 42, 52, 53], 1, 1);                                                    // 碎掉 / 熄灭的晶脉
  m.obt = E.defMat([0, 0, C_OB, 8], 1);                                                        // 黑曜石牙

  const OX = -14;                                                                              // 身体整体后移：锚点落在身体前段（近战站位），转身甩尾时尾锤正好够到假人
  const SHAPE = { len: 15, chest: 7, rump: 5.5, waist: 0.2, hump: 1.5, leg: 5, lw: 3, thigh: 3, farDx: -2, stride: 2.5, lift: 2, foot: 'claw',
    neck: 4, neckA: 0.9, neckW: 3.4, head: { type: 'dragon', w: 8, h: 6.5, snout: 6, snH: 4.2, tip: 0.85, teeth: 2, horn: null }, headA: 0.4,
    tail: 'long', tailLen: 18, tailW: 5, mane: 'ridge', maneLen: 2, fur: 0, pattern: null, lieLegs: 1 };
  const o = Q.shape(Object.assign({ m }, SHAPE));
  const WING = { span: 22, chord: 9, fingers: 3 };
  // 翼姿 [臂角 a0, 翼尖扇到的角 aT, 收拢 fold]（角度从正后方量，+ 向上；> π/2 就是朝前）
  const WP = [
    [1.12, -0.25, 0.05],  // 0 上扬（扑翼最高）
    [0.35, -0.3, 0.1],    // 1 平展
    [-0.8, -0.4, 0.1],    // 2 下压
    [0.8, 0.05, 0.45],    // 3 回收（半收）
    [1.0, -0.55, 0],      // 4 张开（施放）
    [2.2, 3.9, 0.25],     // 5 向前合拢包住身体（蓄力）
    [-0.25, -0.2, 0.45],  // 6 垂落（倒地）
    [0.75, -0.3, 0.2],    // 7 滑翔半抬
  ];
  const FLAP = [0, 7, 2, 3], FLAP_LIFT = [4, 5, 6, 5];                                        // 扑翼 4 帧：上扬 → 半抬 → 下压 → 回收；下压后身体最高（起伏 2 格）
  // 尾姿 [根部角 a0, 卷曲 curl]
  const TAILS = [
    [-0.72, 0.36],  // 0 悬停：垂在身后，尾锤往上勾
    [-2.3, -0.25],  // 1 蓄势：尾巴从身下往前勾
    [0.02, 0.1],    // 2 横扫出手（转身后，尾锤正对目标）
    [0.5, 0.3],     // 3 扫过去（往后上方甩）
    [-1.35, 0.25],  // 4 下垂（蓄力、受击）
    [-0.05, 0],     // 5 倒地（贴地摊直）
  ];

  const HX = 76, DUR = DEFAULT_DUR.slice(), hero = new Sprite(82, 56, 60, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 10, 13, 17], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['cry', 'cryP', 'hot', 'dead', 'glow', 'eye', 'ink', 'spec', 'teeth', 'horn', 'hornFar', 'claw', 'obt']) if (m[k] != null) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['wp', 0, 7], ['tsw', 0, 5], ['vph', 0, 5], ['vlv', 0, 3], ['heat', 0, 2], ['shat', 0, 1]]);
  const P = { wp: 0, tsw: 0, vph: 0, vlv: 1, heat: 0, shat: 0 }; Q.reset(P);
  let rig = null;
  function tuck(rg) {                                                                          // 悬停：四肢收在身下（不去够地面）
    for (const L of rg.legs) { L.F[0] = L.T[0] + (L.front ? 2.5 : -1.2); L.F[1] = L.T[1] + (L.front ? 4.2 : 4.8); }
  }
  function mkRig() { rig = Q.rig(P, o); if (!rig.lie) tuck(rig); return rig; }
  P.lift = 5; mkRig();
  const HIT_POINT = [R(rig.C1.x + rig.C1.r * 0.75 + OX), R(rig.C1.y)];

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail', 'reach', 'lift', 'glow'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, tail: 0, reach: 0, lift: 5, glow: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -1, pitch: 2, head: -1, jaw: 1, lift: 6 });
  const A_STRIKE = pose({ bx: 2, head: 0, jaw: 2, lift: 5 });
  const A_FOLLOW = pose({ bx: 2, lift: 5, jaw: 1 });
  const C_WRAP = pose({ bx: -2, head: 1, lift: 4, glow: 1 });
  const S_OPEN = pose({ bx: -5, pitch: 1, head: -1, jaw: 2, lift: 6, glow: 2 });          // 张翼时身子往后一撑，身前让出护盾的位置
  const T_STRIKE = 2 / 12, T_HIT = [1 / 12, 3 / 12, 5 / 12], T_SHATTER = 1 / 12, T_CRASH = INCOMING + 0.66, T_ASH = INCOMING + 1.2;
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function flapAt(f12, every) { const k = Math.floor(f12 / every) & 3; P.wp = FLAP[k]; P.lift = FLAP_LIFT[k]; return k; }

  function idle(tq, f12) {
    apply(REST); const k = flapAt(f12, Math.round(0.3 * 12));                                  // 慢速重扑翼：每个翼姿 0.3 s
    P.tail = [0, 1, 0, -1][k]; P.vph = (f12 >> 1) % 6;                                        // 晶脉里的光从头流到尾
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { P.head = 2; P.vlv = 2; P.gem = lp >= 1.75 && lp < 1.92 ? 1 : 0; }   // 待机个性：低头俯视，晶脉一亮
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P); P.wp = 0; P.tsw = 0; P.vph = 0; P.vlv = 1; P.heat = 0; P.shat = 0; P.lift = 5;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      apply(REST); const k = flapAt(f12of(tq), 2); P.tail = [1, 0, -1, 0][k]; P.head = k === 2 ? 1 : 0; P.vph = f12of(tq) % 6;   // 低空重扑翼（6 fps）
      const w = walkDemo(tq, 14, -1); P.flip = w.flip; P.mx = w.mx + (w.flip ? 2 * OX : 0);    // 转身绕身体中心
    } else if (st === ATTACK) {
      if (tq < T_STRIKE - 1e-6) { E.mix(tmp, REST, A_WIND, ease.out(clamp01(tq / 0.08)), F_ALL); apply(tmp); P.wp = tq > 0 ? 0 : 1; P.tsw = tq > 0 ? 1 : 0; P.rim = 1; }
      else if (tq < 0.42) {                                                                    // 身体一扭（转身），尾锤横扫过去
        E.mix(tmp, A_STRIKE, A_FOLLOW, ease.out(clamp01((tq - T_STRIKE) / 0.2)), F_ALL); apply(tmp);
        P.flip = 1; P.mx = 2 * OX; P.wp = tq < 0.25 ? 2 : 3; P.tsw = tq < 0.25 ? 2 : 3; P.vlv = 2; P.rim = 2;
      } else { E.mix(tmp, A_FOLLOW, REST, ease.inOut(clamp01((tq - 0.42) / 0.33)), F_ALL); apply(tmp); P.wp = tq < 0.58 ? 7 : 1; P.tsw = tq < 0.58 ? 4 : 0; P.rim = 1; }
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, REST, C_WRAP, q, F_ALL); apply(tmp);
      P.wp = q < 0.35 ? 3 : 5; P.tsw = 4; P.vlv = tq < 0.45 ? 1 : tq < 0.9 ? 2 : 3; P.vph = f12 % 6;
      P.gem = tq < 0.45 ? 1 : (f12 & 1 ? 2 : 1); P.rim = tq < 0.45 ? 1 : tq < 0.9 ? 2 : 3;      // 晶面、晶脉逐档变亮，轮廓光 3 档
    } else if (st === CAST) {
      E.mix(tmp, C_WRAP, S_OPEN, ease.out(clamp01(tq / 0.12)), F_ALL); apply(tmp);
      P.wp = 4; P.gem = 3; P.vlv = 3; P.vph = f12 % 6; P.rim = 3; P.heat = tq >= T_HIT[2] - 1e-6 ? 1 : 0;
      for (const th of T_HIT) if (Math.abs(tq - th) < 1e-6) P.bx = -1;                        // 挡一下身子一顿
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_OPEN, REST, q, F_ALL); apply(tmp);
      if (q < 0.3) P.wp = 4; else { P.wp = FLAP[(f12 >> 2) & 3]; }
      P.heat = tq < 0.34 ? 2 : tq < 0.5 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.vlv = q < 0.5 ? 2 : 1; P.vph = f12 % 6; P.rim = q < 0.5 ? 3 : 2;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { apply(REST); P.bx = -2; P.eyes = 1; P.head = -1; P.tail = 2; P.lift = 6; P.wp = 3; P.tsw = 4; P.flash = h < 1 / 12 ? 1 : 0; P.vlv = 2; }
      else if (h < 0.35) { apply(REST); P.bx = -1; P.eyes = 1; P.tail = 1; P.wp = 7; }
      else { idle(tq, f12); }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { apply(REST); P.bx = -2; P.eyes = 1; P.head = -1; P.tail = 2; P.wp = 2; P.tsw = 4; P.lift = d < 0.15 ? 5 : 4; P.flash = d < 1 / 12 ? 1 : 0; P.vlv = f12 & 1 ? 3 : 0; }
      else if (d < 0.5) { apply(REST); P.bx = -3; P.lie = 1; P.pitch = -2; P.head = 2; P.eyes = 1; P.lift = 3; P.wp = 6; P.tsw = 4; P.jaw = 1; P.vlv = 0; }   // 失去护盾，从空中栽下
      else {
        apply(REST); P.bx = -3; P.lie = 2; P.eyes = 1; P.jaw = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.wp = 6; P.tsw = 5; P.vlv = 0; P.tail = d < 0.9 ? 1 : 0;
        P.shat = d >= 0.66 - 1e-6 ? 1 : 0; if (d >= 1.2 - 1e-6) P.dq = 1;                    // 砸地：晶体一齐崩碎；1.2 s 起交给死亡套件化灰
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    mkRig();
    const mc = mirrorAt(); P.gx = R(mc[0] + OX) + P.bx; P.gy = R(mc[1]);                       // 焦点：胸前护心镜
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 棱光晶脉（候选部件：glowCracks——和赤龙的熔岩裂纹同一套纹路：t 臀心 0 → 胸心 1，v 背线 0 → 腹线 1；段号 0 颈 · 1 胸 · 2 腰 · 3 臀 · 4 腿与尾）
  const CRACKS = [
    [3, -0.28, 0.5, -0.12, 0.34, 0.04, 0.5, 0.2, 0.36],
    [2, 0.2, 0.36, 0.34, 0.56, 0.5, 0.4, 0.63, 0.54],
    [1, 0.63, 0.54, 0.78, 0.36, 0.92, 0.5, 1.06, 0.4],
    [3, 0.04, 0.5, -0.02, 0.8],
    [2, 0.34, 0.56, 0.3, 0.86],
    [2, 0.5, 0.4, 0.58, 0.16],
    [1, 0.78, 0.36, 0.86, 0.74],
    [1, 0.92, 0.5, 1.0, 0.18],
  ];
  function veinDot(x, y, seg) {
    x = R(x); y = R(y); const k = ((x * 3 + y * 5) % 4 + 4) % 4;
    if (P.shat) { U.dot(E, x, y, m.dead, k === 0 ? 3 : 2); return; }
    if (P.heat === 2 || (P.heat === 1 && seg <= 2)) { U.dot(E, x, y, m.hot, k === 1 ? 2 : 3); return; }
    const ph = (((x >> 1) + P.vph) % 6 + 6) % 6, lv = P.vlv;                                  // 光在晶体里从头往尾流
    if (lv === 0) { U.dot(E, x, y, m.cry, k === 0 ? 2 : 1); return; }
    if (lv >= 3) { U.dot(E, x, y, (ph === 4) ? m.cryP : m.cry, (ph & 1) ? 3 : 4); return; }
    if (lv === 2) { U.dot(E, x, y, ph === 4 ? m.cryP : m.cry, ph <= 1 ? 4 : ph <= 3 ? 3 : 2); return; }
    if (ph === 0) U.dot(E, x, y, m.cry, 4);                                                   // 平时：暗紫晶脉，一段青白的光从头流到尾，后面拖一点粉
    else if (ph === 1) U.dot(E, x, y, m.cry, 3);
    else if (ph === 2) U.dot(E, x, y, m.cryP, 3);
    else U.dot(E, x, y, m.cry, k === 0 ? 2 : 1);
  }
  function bodyVeins() {
    const C1 = rig.C1, C2 = rig.C2;
    for (const c of CRACKS) {
      for (let i = 1; i + 3 < c.length; i += 2) {
        const t0 = c[i], v0 = c[i + 1], t1 = c[i + 2], v1 = c[i + 3], x0 = lerp(C2.x, C1.x, t0), x1 = lerp(C2.x, C1.x, t1), n = Math.max(1, Math.ceil(Math.abs(x1 - x0) * 2 + Math.abs(v1 - v0) * 12));
        for (let s = 0; s <= n; s++) {
          const x = R(lerp(x0, x1, s / n)), sp = Q.span(rig, o, x); if (!sp || sp[1] - sp[0] < 3) continue;
          veinDot(x, cl(R(sp[0] + lerp(v0, v1, s / n) * (sp[1] - sp[0])), sp[0] + 1, sp[1] - 1), c[0]);
        }
      }
    }
    const NB = rig.NB, NT = rig.NT, L = Math.hypot(NT.x - NB.x, NT.y - NB.y) || 1, nx = (NT.y - NB.y) / L, ny = -(NT.x - NB.x) / L;
    for (let s = 0; s <= 6; s++) { const q = 0.1 + s * 0.13, w = (s & 1) ? 0.4 : -0.6; veinDot(lerp(NB.x, NT.x, q) + nx * w, lerp(NB.y, NT.y, q) + ny * w + 0.5, 0); }
  }
  function belly() {
    if (rig.lie) return; const C1 = rig.C1, C2 = rig.C2;
    for (let x = R(C2.x); x <= R(C1.x + C1.r * 0.4); x++) { const sp = Q.span(rig, o, x); if (sp && sp[1] - sp[0] > 4) U.dot(E, x, sp[1] - 1, m.belly, ((x + 40) % 3) === 0 ? 2 : 0); }
  }
  function legVein(i) { const L = rig.legs[i], T = L.T, F = L.F; for (let s = 0; s <= 2; s++) { const q = 0.25 + s * 0.2; veinDot(lerp(T[0], F[0], q) + ((s & 1) ? 0.5 : -0.4), lerp(T[1], F[1], q), 4); } }
  // 尾 + 棱晶锤（候选部件：clubTail / crystalClub——长尾按尾姿表走、背刺、尾端晶簇）
  const TP = new Float32Array(3 * 40), TAIL_N = 18;
  function tailWalk(rg, tsw, sway) {
    const n = TAIL_N, T = TAILS[tsw]; let x = rg.tail.x, y = rg.tail.y, a = T[0];
    for (let k = 0; k <= n; k++) {
      const q = k / n; TP[k * 3] = x; TP[k * 3 + 1] = y; TP[k * 3 + 2] = lerp(o.tailW * 0.5, 0.8, q);
      a += T[1] * q * 0.35 + sway * (0.25 + q) * 0.35; x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; }
    }
    return n;
  }
  function drawTail() {
    part(); const n = tailWalk(rig, P.tsw, (P.tail | 0) * 0.2);
    for (let k = 0; k <= n; k++) U.disc(E, TP[k * 3], TP[k * 3 + 1], TP[k * 3 + 2], m.limb, 0);
    for (let k = 2; k < n - 2; k += 3) { const x = TP[k * 3], y = TP[k * 3 + 1] - TP[k * 3 + 2]; U.dot(E, x, y - 1, m.mane, 0); U.dot(E, x - 1, y - 1, m.mane, 0); U.dot(E, x - 1, y - 2, m.mane, 4); }
    for (let k = 3; k < n - 2; k += 2) veinDot(TP[k * 3], TP[k * 3 + 1], 4);
    const dx = TP[n * 3] - TP[n * 3 - 3], dy = TP[n * 3 + 1] - TP[n * 3 - 2], dl = Math.hypot(dx, dy) || 1;
    return [TP[n * 3], TP[n * 3 + 1], dx / dl, dy / dl];
  }
  function drawClub(tip) {                                                                     // 多面水晶簇：一根主晶 + 两根侧晶，比赤龙的岩锤大一倍
    part(); const [x, y, ux, uy] = tip, nx = -uy, ny = ux, lit = P.vlv >= 2 ? 4 : 3;
    U.disc(E, x, y, 1.6, m.limb, 0);                                                           // 晶簇根部的黑曜石结
    const shard = (a, L, w, mat) => {
      const c = Math.cos(a), s = Math.sin(a), vx = ux * c - uy * s, vy = ux * s + uy * c, ex = x + vx * L, ey = Math.min(-0.5, y + vy * L);
      U.taper(E, x + vx, y + vy, ex, ey, w, 0.5, mat, 3);
      U.seg(E, x + vx - vy * 0.8, y + vy + vx * 0.8, ex - vy * 0.5, ey + vx * 0.5, 1, mat, vy * 0.8 + vx * 0.2 < 0 ? lit : 2);   // 受光面 / 背光面
      U.dot(E, ex, ey, mat, 4);
    };
    if (P.shat) { shard(0.85, 2, 0.8, m.dead); shard(0, 3, 1, m.dead); return; }                // 晶锤碎了，只剩断茬
    shard(0.85, 4.5, 1.1, m.cryP); shard(-0.85, 4.5, 1.1, m.cry); shard(0, 7, 1.6, m.cry);
    U.dot(E, x + nx * 0.5, y + ny * 0.5, m.cry, lit);
  }
  // 巨膜翼（候选部件：prismWing——几何同 B.wing；赤龙那三个破洞的位置补上发光的多边形晶片，碎掉后洞又露出来）
  function wingGeo(x, y, pw, w, g) {
    const a0 = pw[0], aT = pw[1], fold = pw[2], span = w.span, nf = w.fingers, arm = span * (0.42 - 0.14 * fold);
    g.x = x; g.y = y; g.wx = x - Math.cos(a0) * arm; g.wy = y - Math.sin(a0) * arm; g.n = nf;
    for (let k = 0; k < nf; k++) { const q = nf === 1 ? 1 : k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); g.tx[k] = g.wx - Math.cos(fa) * fl; g.ty[k] = g.wy - Math.sin(fa) * fl; }
    g.bx = x - w.chord * (1 - 0.3 * fold); g.by = y + 1; return g;
  }
  const GN = { tx: [0, 0, 0], ty: [0, 0, 0] }, GF = { tx: [0, 0, 0], ty: [0, 0, 0] }, GT = { tx: [0, 0, 0], ty: [0, 0, 0] }, POLY = [];
  const PLATE = ['.ab.', 'abbc', 'bbcc', '.cc.'];
  function holesOf(g, out) {
    out[0] = lerp(g.wx, (g.tx[0] + g.tx[1]) / 2, 0.58); out[1] = lerp(g.wy, (g.ty[0] + g.ty[1]) / 2, 0.58);
    out[2] = lerp(g.wx, (g.tx[1] + g.tx[2]) / 2, 0.55); out[3] = lerp(g.wy, (g.ty[1] + g.ty[2]) / 2, 0.55);
    out[4] = lerp((g.x + g.bx) / 2, (g.wx + g.tx[2]) / 2, 0.5); out[5] = lerp((g.y + g.by) / 2, (g.wy + g.ty[2]) / 2, 0.5); return out;
  }
  const HOLES = [0, 0, 0, 0, 0, 0];
  function drawWing(g, far) {
    part(); const mem = far ? m.wingFar : m.wing, bone = far ? m.boneFar : m.bone, nf = g.n;
    POLY.length = 0; POLY.push(g.x, g.y, g.wx, g.wy);
    for (let k = 0; k < nf; k++) {
      POLY.push(g.tx[k], g.ty[k]);
      const nx = k < nf - 1 ? g.tx[k + 1] : g.bx, ny = k < nf - 1 ? g.ty[k + 1] : g.by, dq = k < nf - 1 ? 0.14 : 0.4;
      POLY.push(lerp((g.tx[k] + nx) / 2, g.wx, dq), lerp((g.ty[k] + ny) / 2, g.wy, dq));
    }
    POLY.push(g.bx, g.by); U.poly(E, POLY, mem, 0);
    U.seg(E, g.x, g.y, g.wx, g.wy, 2, bone, 0);
    for (let k = 0; k < nf; k++) U.seg(E, g.wx, g.wy, g.tx[k], g.ty[k], 1, bone, k === 0 ? 4 : 0);
    U.dot(E, g.wx + 1, g.wy - 1, m.claw, 3);
    if (far) return;
    holesOf(g, HOLES);
    for (let h = 0; h < 3; h++) {
      const x0 = R(HOLES[h * 2]) - 1, y0 = R(HOLES[h * 2 + 1]) - 1;
      if (P.shat) { U.dot(E, x0 + 1, y0 + 1, 0); U.dot(E, x0 + 2, y0 + 1, 0); U.dot(E, x0 + 1, y0 + 2, 0); continue; }   // 晶片碎了：赤龙时的破洞又露出来
      const lv = P.gem >= 2 || P.vlv >= 3 ? 1 : 0;
      for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) {
        const ch = PLATE[j][i]; if (ch === '.') continue;
        if (ch === 'a') U.dot(E, x0 + i, y0 + j, m.cry, 4); else if (ch === 'b') U.dot(E, x0 + i, y0 + j, h === 1 ? m.cryP : m.cry, 3 + lv * ((i + j) & 1)); else U.dot(E, x0 + i, y0 + j, m.cry, 2 + lv);
      }
    }
  }
  // 胸前棱晶护心镜（发光体，单独部件）
  const MIRROR = ['..a..', '.abc.', 'abbcc', 'abbcc', '.bcc.', '..c..'];
  function mirrorAt() { const C1 = rig.C1; return [C1.x + C1.r * 0.62, C1.y + 0.5]; }
  function drawMirror() {
    if (P.shat) return; part(); const c = mirrorAt(), x0 = R(c[0]) - 2, y0 = R(c[1]) - 3, g = P.gem;
    for (let j = 0; j < 6; j++) for (let i = 0; i < 5; i++) {
      const ch = MIRROR[j][i]; if (ch === '.') continue;
      let mat = m.cry, t = ch === 'a' ? (g >= 1 ? 4 : 3) : ch === 'b' ? (g >= 2 && ((i + j) & 1) ? 4 : 3) : (g >= 3 ? 3 : 2);
      if (ch === 'c' && j >= 4 && g < 3) mat = m.cryP;
      U.dot(E, x0 + i, y0 + j, mat, t);
    }
  }
  // 角：远侧完整后掠长角；近侧断茬 + 断口长出的棱光水晶角（候选部件：hornPair + crystalHorn）
  function farHorn() {
    part(); const H = rig.head, b = U.toW(H.x, H.y, H.a, -H.W * 0.2, -H.Hh + 0.4), x0 = b[0] + 1, y0 = b[1] - 1, c = m.hornFar;
    U.seg(E, x0, y0, x0 - 4, y0 - 2, 2, c, 0); U.seg(E, x0 - 4, y0 - 2, x0 - 8, y0 - 3, 1, c, 0); U.dot(E, x0 - 9, y0 - 4, c, 4);
  }
  function nearHorn() {
    part(); const H = rig.head, b = U.toW(H.x, H.y, H.a, 0, -H.Hh + 0.5), x0 = R(b[0]), y0 = R(b[1]);
    U.dot(E, x0, y0 - 1, m.horn, 0); U.dot(E, x0 - 1, y0 - 1, m.horn, 0); U.dot(E, x0 - 2, y0 - 1, m.horn, 2);
    if (P.shat) { U.dot(E, x0 - 1, y0 - 2, m.horn, 4); return; }
    part(); const lit = P.gem >= 2 || P.vlv >= 3;                                               // 断口上长出一截棱光水晶角（青紫半透明）
    const px = [[0, -2, 3], [-1, -2, 4], [-1, -3, 3], [-2, -3, 4], [-2, -4, 3], [-3, -4, 4], [-3, -5, 2], [-4, -5, 3], [-5, -6, 4]];
    for (const [dx, dy, t] of px) U.dot(E, x0 + dx, y0 + dy, t === 2 ? m.cryP : m.cry, lit && t === 3 ? 4 : t);
  }
  function obsidianJaw() {                                                                     // 和头同一个部件：下颌露骨处镶一圈黑曜石牙
    const F = Q.headFrame(rig, o, P.jaw);
    for (let s = 0; s < 5; s++) { const u = F.uc + 0.4 + s, vb = F.prof(u)[1] + F.gap(u), p = F.at(u, vb - 0.1); U.dot(E, p[0], p[1], (s & 1) ? m.obt : m.bone, (s & 1) ? 2 : 3); }
    const t1 = F.at(F.uT - 1.2, F.prof(F.uT - 1.2)[2] + 0.9); if (!P.jaw) { U.dot(E, t1[0], t1[1], m.obt, 3); U.dot(E, t1[0], t1[1] - 1, m.cry, P.shat ? 2 : 3); }
  }
  function drawHero() {
    begin(hero, P.bx + OX, 0);
    const lie = rig.lie === 2, wp = WP[P.wp];
    wingGeo(rig.wing.x + 2, rig.wing.y - 1, [wp[0] + 0.12, wp[1] + 0.1, wp[2]], WING, GF);
    wingGeo(rig.wing.x, rig.wing.y, wp, WING, GN);
    drawWing(GF, 1);
    if (!lie) { Q.leg(E, rig, P, o, 0); Q.leg(E, rig, P, o, 1); }
    const front = P.tsw === 1;                                                                  // 尾从身下往前勾时画在身体前面
    let tip = null;
    if (!front) { tip = drawTail(); drawClub(tip); }
    Q.ridge(E, rig, P, o);
    Q.body(E, rig, P, o); belly(); bodyVeins();
    drawMirror();
    if (!lie) { Q.leg(E, rig, P, o, 2); legVein(2); Q.leg(E, rig, P, o, 3); legVein(3); }
    if (front) { tip = drawTail(); drawClub(tip); }
    drawWing(GN, 0);
    farHorn();
    Q.head(E, rig, P, o); obsidianJaw();
    nearHorn();
    if (lie) { Q.leg(E, rig, P, o, 0); Q.leg(E, rig, P, o, 1); Q.leg(E, rig, P, o, 2); legVein(2); Q.leg(E, rig, P, o, 3); legVein(3); }
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.rimRamp = P.heat ? HEAT_RIM : EL; bake(hero, RIM);
  }

  // ───── 特效 ─────
  const HXC = HX + 10, HYC = HY - 17, HH = 15, HW = 5;                                         // 六边形晶面护盾（屏幕坐标）
  const HEX = [HXC, HYC - HH, HXC + HW, HYC - HH / 2, HXC + HW, HYC + HH / 2, HXC, HYC + HH, HXC - HW, HYC + HH / 2, HXC - HW, HYC - HH / 2];
  const HIT_Y = [HYC - 3, HYC - 9, HYC + 5], SHOT_V = 240;
  const hitX = (y) => (Math.abs(y - HYC) <= HH / 2 ? HXC + HW : HXC + HW * (1 - (Math.abs(y - HYC) - HH / 2) / (HH / 2)));
  const hitT = [9, 9, 9];
  let shieldT = 9, smT = 9, chargeAcc = 0, soulAcc = 0, lastGf = -9, hfT = 9;
  const toScr = (lx, ly) => [scrX(R(lx) + OX + P.bx), HY + R(ly)];
  function hexEdge(k, c, f12, skipOdd) {
    const x0 = HEX[k * 2], y0 = HEX[k * 2 + 1], x1 = HEX[((k + 1) % 6) * 2], y1 = HEX[((k + 1) % 6) * 2 + 1], n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
    for (let s = 0; s <= n; s++) { if (skipOdd && ((s + f12) & 1)) continue; put(R(lerp(x0, x1, s / n)), R(lerp(y0, y1, s / n)), c); }
  }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const gx = scrX(P.gx), gy = HY + P.gy;
      releaseOrbit(45, 100, 0.3, 0.6, { pts: 1 }); burst(gx, gy, 24, 50, 130, 0.25, 0.6, R_EL, 8); ring(gx, gy, 1, R_EL);
      fx.dome(HXC, HYC + HH, HW + 2, HH * 2, R_EL, 0.4, 1);                                     // 点阵逐点亮起
      for (let k = 0; k < 6; k++) fx.link(HEX[k * 2], HEX[k * 2 + 1], HEX[((k + 1) % 6) * 2], HEX[((k + 1) % 6) * 2 + 1], PRISM3[k % 3], 0.95, 2);   // 6 条晶面连线（青 / 紫 / 粉按角度换）
      for (let k = 0; k < 3; k++) { const y = HIT_Y[k], x = hitX(y); shoot(3, x + SHOT_V * T_HIT[k], y, -SHOT_V, x, FXI.enemy); }   // 三发来袭攻击，正好在挡击帧打上盾面
      shieldT = 0; hitT[0] = hitT[1] = hitT[2] = 9; shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {
      const rt = toScr(rig.tail.x, rig.tail.y), cx = DUMMY_HIT[0], cy = DUMMY_HIT[1];
      fx.slash(rt[0], rt[1], 16, 225 / 180 * PI, 75 / 180 * PI, R_EL, 0.2, 2, 2);                // 150° 扫击拖影弧：从身下扫到目标
      burst(cx, cy, 16, 40, 110, 0.15, 0.4, FXI.impact, 10); burst(cx, cy, 10, 30, 90, 0.2, 0.45, R_EL, 6); fx.cross(cx, cy, 4, R_EL, 0.2, 2);
      hitDummy(1, 1); shake(0.12, 1); sfx('swing', { kind: 'smash', w: 1.0 }); sfx('hit', { mat: 'stone', w: 1.0 });
    }
    if (s === CAST && T_HIT.includes(t)) {                                                     // 折射：三道不同颜色的 1 格短光束弹开 + 白十字，盾面只闪一段
      const k = T_HIT.indexOf(t), y = HIT_Y[k], x = R(hitX(y)); hitT[k] = 0;
      fx.beam(x + 1, y - 1, x + 3, y - 7, 1, R_PC, 0.3, 2); fx.beam(x + 1, y, x + 6, y - 1, 1, R_PV, 0.3, 2); fx.beam(x + 1, y + 1, x + 4, y + 6, 1, R_PP, 0.3, 2);
      fx.cross(x, y, 4, R_EL, 0.2, 2); burst(x, y, 10, 30, 90, 0.12, 0.3, R_EL, 4);
      shake(0.12, 1); sfx('impact', { pal: 'holy', w: 0.6 + 0.1 * k });
    }
    if (s === RECOVER && t === T_SHATTER) {                                                    // 护盾碎成晶屑飘落
      for (let k = 0; k < 6; k++) { const x0 = HEX[k * 2], y0 = HEX[k * 2 + 1], x1 = HEX[((k + 1) % 6) * 2], y1 = HEX[((k + 1) % 6) * 2 + 1]; for (let q = 0; q < 1; q += 0.25) spawnX(K_PHYS, lerp(x0, x1, q), lerp(y0, y1, q), (Math.random() - 0.3) * 24, -8 - Math.random() * 14, 0.8 + Math.random() * 0.5, R_EL, { g: 45, floor: FLOOR - 1, dragX: 0.4 }); }
      shieldT = 9;
    }
    if (s === HURT && t === INCOMING) { hfT = 0; burst(HX + HIT_POINT[0] + 2, HY + HIT_POINT[1], 8, 30, 80, 0.15, 0.35, R_EL, 8); }
    if (s === DEATH && t === T_CRASH) {                                                        // 坠地碎晶：震屏 + 尘土 + 地裂 + 晶片崩碎四散
      const x = HX + OX;
      for (let i = 0; i < 24; i++) spawn(K_DUST, x - 22 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 40, -8 - Math.random() * 16, 0.4 + Math.random() * 0.4, FXI.dust);
      fx.crack(x - 2, FLOOR, 16, 1, FXI.dust, 1.0); fx.crack(x - 4, FLOOR, 16, -1, FXI.dust, 1.0);
      for (let i = 0; i < 44; i++) spawnX(K_PHYS, x - 20 + Math.random() * 36, HY - 3 - Math.random() * 12, (Math.random() - 0.5) * 90, -40 - Math.random() * 60, 0.7 + Math.random() * 0.6, R_EL, { g: 220, floor: FLOOR - 1 });
      burst(x + 6, HY - 10, 16, 40, 110, 0.2, 0.5, R_EL, 12); shake(0.16, 2); sfx('fall', { w: 1.0 });
    }
    if (s === DEATH && t === T_ASH) { poseAt(DEATH, t - 1 / 60, E.simT); P.dq = 0; drawHero(); bakeHero(); death.start('ash', { ramp: R_EL }); hero.k1 = hero.k2 = -1; }   // 黑色身躯化灰，魂光棱彩
  }
  const DUMMY_HIT = [E.DUMMY_X - 4, HY - 16];
  const EVENTS = [[], [], [T_STRIKE], [], T_HIT, [T_SHATTER], [INCOMING], [T_CRASH, T_ASH], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                                                    // 棱光粒子从翼尖螺旋汇聚到护心镜
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      wingGeo(rig.wing.x, rig.wing.y, WP[P.wp], WING, GT);
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const k = (Math.random() * 3) | 0, p = toScr(GT.tx[k], GT.ty[k]), dx = p[0] - gx, dy = (p[1] - gy) / 0.75, r = Math.max(6, Math.hypot(dx, dy)), a = Math.atan2(dy, dx);
        spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.4 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() < 0.5 ? -1 : 1) * (3 + Math.random() * 3));
      }
    }
    if (state === MOVE && P.wp !== lastGf) {
      if (P.wp === 2) { for (let i = 0; i < 4; i++) { const sx = i & 1 ? 1 : -1; spawn(K_DUST, HX + P.mx + (P.flip ? -OX : OX) + sx * (4 + Math.random() * 6), HY, sx * (14 + Math.random() * 16), -3 - Math.random() * 5, 0.35 + Math.random() * 0.25, FXI.dust); } }   // 下压帧：翼下吹起尘土（下洗气流）
      lastGf = P.wp;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 16; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX + OX - 18 + Math.random() * 36, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
    shieldT += dt; smT += dt; hfT += dt; hitT[0] += dt; hitT[1] += dt; hitT[2] += dt;
  }
  function fxReset() { shieldT = 9; smT = 9; hfT = 9; hitT[0] = hitT[1] = hitT[2] = 9; chargeAcc = 0; soulAcc = 0; lastGf = -9; }
  function fxBack(f12) {
    if (P.dq < 0.6 && !E.death.active) { const alt = P.lie ? 0 : (P.lift | 0) + 5; groundShadow(HX + P.mx + (P.flip ? -OX : OX), 17, alt); }   // 地面大影子
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, P.heat ? HEAT_RIM : EL, f12);
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    if (shieldT < 0.62 + 1 / 12) {                                                             // 晶面：稀疏的面内光点，颜色按位置在青 / 紫 / 粉之间换；挨打那一段边闪白
      for (let y = HYC - HH + 3; y <= HYC + HH - 3; y += 3) for (let x = HXC - HW + 1; x <= HXC + HW - 1; x += 2) {
        const e = Math.abs(y - HYC) <= HH / 2 ? HW : HW * (1 - (Math.abs(y - HYC) - HH / 2) / (HH / 2)); if (Math.abs(x - HXC) >= e - 0.5 || ((x + y + (f12 >> 1)) % 3) !== 0) continue;
        put(x, y, EL[1 + ((x + y + 30) % 3)]);
      }
      if (shieldT >= 0.05) for (let k = 0; k < 6; k++) hexEdge(k, EL[1 + (k % 3)], f12, shieldT > 0.62);   // 六条实线晶面边：青 / 淡紫 / 粉按角度换
      if (shieldT >= 0.05) for (let k = 0; k < 6; k++) { const s = ((f12 >> 1) + k * 3) % 8, x0 = HEX[k * 2], y0 = HEX[k * 2 + 1], x1 = HEX[((k + 1) % 6) * 2], y1 = HEX[((k + 1) % 6) * 2 + 1]; put(R(lerp(x0, x1, s / 8)), R(lerp(y0, y1, s / 8)), 21); }   // 光沿边滑过
      for (let k = 0; k < 3; k++) if (hitT[k] < 0.1) { const y = HIT_Y[k], e = Math.abs(y - HYC) <= HH / 2 ? 1 : y < HYC ? 0 : 2; hexEdge(e, 21, f12, false); }
    }
    if (hfT < 0.25 && E.state === HURT) {                                                      // 受击：棱光护盾在挨打处闪出一小块晶面
      const x0 = HX + HIT_POINT[0] + 4, y0 = HY + HIT_POINT[1], c = hfT < 0.08 ? EL[0] : hfT < 0.16 ? EL[1] : EL[2];
      for (const [i, j] of [[0, -4], [2, -2], [2, 2], [0, 4], [-2, 2], [-2, -2], [2, 0], [-2, 0]]) if (!(hfT > 0.16 && (i + j) & 2)) put(x0 + i, y0 + j, c);
    }
  }

  return {
    name: '黑龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.cry, m.cryP, m.hot, m.glow, m.eye], HIT_POINT, EVENTS,
    deathKit: { mode: 'ash', at: T_ASH },
    REVIVE: { dy: -18, ramp: R_EL, big: 1 },
    SFX: { body: 'beast', how: 'explode', pal: 'holy', style: 'frost', w: 1.0, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
