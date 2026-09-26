// 赤龙（部队 · 僵尸 · 先锋 · 史诗）：升级线第 1 级（→ 黑龙）。
// 低伏重甲的走地坦克龙：深血红鳞甲上爬满透光的熔岩裂纹；背上收着烂出三个洞的破膜翼（飞不起来）；近侧角齐根断茬、远侧角完整后掠；
// 下颌烂掉一块露出骨白牙床；背脊一排粗钝的熔岩背刺；尾端拖着一坨冷却熔岩结成的岩锤。
// 攻击：低头前冲 3 格，巨口张到最大再咬合，口中滴下熔岩。
// 技能「熔岩护盾 + 过热」：伏地蓄力 → 抬头一吼鼓起熔岩壳 → 挡下两发来袭攻击（壳每挨一下就变白断开、点阵变稀），裂纹每挡一次就从橙转血红 → 壳碎成余烬、周身冒起血红热浪 → 鼻孔喷烟。
// 身体用 parts-beast 的 quad（躯干、腿、头、背刺）；破膜翼、不对称双角、烂下颌、熔岩裂纹、岩锤尾是本模块画的（通用的标了「候选部件」）。
PCD.define('RedDragon', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, keys, q12, f12of, walkDemo, near, fxRamp, FXI, FXR, HY, FLOOR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_STILL, K_PHYS, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shotFloorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;
  const lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const C_DRED = near('#a82230');                                                            // 深血红基色（blood 色阶 56 与 57 之间，1 个专属色）
  const R_EL = FXI.fire, EL = FXR[R_EL], BL = FXR[FXI.blood], HEAT_RIM = [58, 57, 57, 56, 55];   // 熔岩（守护）· 过热（狂怒）第二层用 blood；过热时轮廓光烧成血红
  const R_SMOKE = fxRamp('dragonSmoke', [10, 10, 9, 9, 8]);                                    // 鼻孔黑烟、冷却青烟
  const m = B.mats(E, { main: [55, 56, C_DRED, 57], belly: 'stone', mane: [0, 8, 9, 46], wing: 'crimson', bone: [8, 9, 7, 6], claw: 'bone', horn: 'bone',
    teeth: 'bone', eye: [0, 0, 46, 47], glow: [45, 46, 47, 21] });
  m.hornFar = E.defMat([8, 7, 7, 6], 1); m.wing = E.defMat(E.RAMP.crimson, 1);             // 翼膜 band 1（小块面积）
  m.lava = E.defMat([44, 45, 46, 47], 1, 1);                                                  // 熔岩裂纹（发光体）
  m.hot = E.defMat([55, 57, 58, 21], 1, 1);                                                   // 过热裂纹（血红）
  m.cold = E.defMat([0, 8, 9, 10], 1, 1);                                                     // 熄灭的裂纹（灰）
  m.rock = E.defMat([0, 8, 8, 9], 1);                                                         // 岩锤：冷却熔岩结成的黑岩
  // 冷却后的石色躯壳（死亡最后）：同一套形体换一套灰石材质
  const ms = B.mats(E, { main: [0, 8, 9, 10], belly: [0, 8, 8, 9], mane: [0, 8, 9, 10], wing: [0, 8, 9, 10], bone: [8, 9, 10, 7], claw: [8, 9, 10, 7], horn: [8, 9, 10, 7],
    teeth: [8, 9, 10, 7], eye: [0, 0, 8, 8], glow: [0, 8, 9, 10] });
  ms.hornFar = E.defMat([8, 9, 9, 10], 1); ms.lava = ms.hot = ms.cold = m.cold; ms.rock = m.rock;

  const OX = -12;                                                                             // 身体整体后移：锚点落在前腿一带（近战站位），巨口前冲够得着假人
  const SHAPE = { len: 14, chest: 6, rump: 5, waist: 0.15, hump: 1.5, leg: 5, lw: 3, thigh: 3, farDx: -2, stride: 2.5, lift: 2, foot: 'claw',
    neck: 3.5, neckA: 0.5, neckW: 3.4, head: { type: 'dragon', w: 7, h: 6, snout: 5, snH: 3.6, tip: 0.85, teeth: 2, horn: null }, headA: 0.22,
    tail: 'long', tailLen: 15, tailA: -0.72, tailW: 4.6, tailCurl: 0.22, mane: 'ridge', maneLen: 2, fur: 0, pattern: null, lieLegs: 1 };
  const o = Q.shape(Object.assign({ m }, SHAPE)), os = Q.shape(Object.assign({ m: ms }, SHAPE));
  const WING = { span: 20, chord: 9, fingers: 3 };
  // 翼姿 [臂角 a0, 翼尖扇到的角 aT, 收拢 fold]（角度从正后方量，+ 向上）：破翼飞不起来，只在背上收着、抬一抬
  const WP = [
    [0.75, -0.55, 0.2],   // 0 收在背上（翼尖高出背约 6 格）
    [0.95, -0.4, 0.2],    // 1 半抬（攻击、蹬地）
    [0.5, -0.7, 0.35],    // 2 压低贴背（伏地蓄力）
    [1.15, -0.45, 0.05],  // 3 怒张（吼叫，三个破洞最清楚）
    [0.5, -0.65, 0.35],   // 4 缩（受击）
    [-0.25, -0.95, 0.3],  // 5 垂落（倒地）
    [0.84, -0.5, 0.22],   // 6 踏步回弹
  ];

  const HX = 76, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 50, 58, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 12, 17], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const mm of [m, ms]) for (const k of ['lava', 'hot', 'cold', 'glow', 'eye', 'ink', 'spec', 'teeth', 'horn', 'hornFar', 'claw', 'bone', 'boneFar', 'rock']) if (mm[k] != null) RIM.skip[mm[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['wp', 0, 6], ['lav', 0, 3], ['heat', 0, 2], ['cool', 0, 6]]);
  const P = { wp: 0, lav: 1, heat: 0, cool: 0 }; Q.reset(P);
  let rig = Q.rig(P, o);
  const HIT_POINT = [R(rig.C1.x + rig.C1.r * 0.7 + OX), R(rig.C1.y - 1)];                     // 胸前（敌弹打在这里）

  // ───── 尾（候选部件：clubTail——长尾 + 粗钝背刺 + 尾端锤；走法同 quad.tail 'long'，另外返回尾尖） ─────
  const TP = new Float32Array(3 * 40);
  function tailWalk(rg, sway) {
    const n = o.tailLen, lie = rg.lie; let x = rg.tail.x, y = rg.tail.y, a = lie === 2 ? -0.05 : o.tailA;
    for (let k = 0; k <= n; k++) {
      const q = k / n; TP[k * 3] = x; TP[k * 3 + 1] = y; TP[k * 3 + 2] = lerp(o.tailW * 0.5, 0.7, q);
      a += o.tailCurl * q * 0.35 + sway * (0.25 + q) * 0.35; x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; }
    }
    return n;
  }
  const HAMMER = ['.RRR.', 'RRLRR', 'RLRRR', '.RRLR', '..R..'];                               // 岩锤：黑岩块，L = 透红光的裂缝
  const TIP_LIE = (() => { const P2 = {}; Q.reset(P2); P2.lie = 2; const r2 = Q.rig(P2, o), n = tailWalk(r2, 0); return [TP[n * 3], TP[n * 3 + 1]]; })();

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail', 'reach', 'paw', 'glow'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, tail: 0, reach: 0, paw: 0, glow: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -1, crouch: 1, pitch: 1, head: -1, jaw: 1, tail: 1 });
  const A_OPEN = pose({ bx: 3, pitch: -1, head: 2, jaw: 3, reach: 1, tail: -1, glow: 1 });
  const A_BITE = pose({ bx: 3, pitch: -1, head: 2, jaw: 0, reach: 1, tail: -2 });
  const A_HOLD = pose({ bx: 2, head: 1, jaw: 1, reach: 1, tail: -1, glow: 1 });
  const T_OPEN = 2 / 12, T_BITE = 3 / 12, T_DRIP = 4 / 12;
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_OPEN, A_OPEN, 'snap'], [T_BITE, A_BITE, 'snap'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 2, pitch: -1, head: 1, jaw: 1, reach: 1, tail: 1, glow: 1 });
  const S_ROAR = pose({ pitch: 1, head: -2, jaw: 3, reach: 2, tail: -2, glow: 2 });
  const S_GLARE = pose({ pitch: 1, head: -1, jaw: 1, reach: 1, tail: -1, glow: 1 });
  const T_HIT = [2 / 12, 4 / 12], T_SHATTER = 1 / 12, T_SNORT = 6 / 12;                      // 施放内两次挡击；收招内壳碎、喷烟
  const DROP = { at: 0.66, dur: 0.4, dx: -10, hop: 3 };                                       // 岩锤从尾端脱落、往后滚 10 格
  const T_LAND = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.lav = P.bob ? 1 : 2;                                                                    // 裂纹里的岩浆光随呼吸一明一暗
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = f12of(lp - 1.6); P.head = k === 1 || k === 3 ? 0 : -1; P.lav = 2; }   // 待机个性：扬鼻喷两小股黑烟
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P); P.wp = 0; P.lav = 1; P.heat = 0; P.cool = 0;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      const f = Q.anim.walk(P, tq); P.wp = f & 1 ? 6 : 0; P.lav = f & 1 ? 2 : 1;
      const w = walkDemo(tq, 14, -1); P.flip = w.flip; P.mx = w.mx + (w.flip ? 2 * OX : 0);   // 转身绕身体中心（锚点在前腿一带）
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp);
      P.wp = tq >= 0.06 && tq < 0.45 ? 1 : 0; P.lav = tq >= T_OPEN && tq < 0.45 ? 2 : 1; P.rim = tq >= T_OPEN && tq < 0.34 ? 1 : 0;
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); E.mix(tmp, REST, C_LOW, q, F_ALL); apply(tmp);
      P.wp = q > 0.5 ? 2 : 0; P.lav = tq < 0.45 ? 1 : tq < 0.9 ? 2 : (f12 & 1 ? 3 : 2); P.rim = 2;
      if (tq >= 1.1) P.crouch = f12 & 1 ? 2 : 1;                                              // 蓄满：四肢撑地发抖
    } else if (st === CAST) {
      E.mix(tmp, C_LOW, S_ROAR, ease.out(clamp01(tq / 0.12)), F_ALL); apply(tmp);
      if (tq >= 0.3) { E.mix(tmp, S_ROAR, S_GLARE, ease.inOut(clamp01((tq - 0.3) / 0.2)), F_ALL); apply(tmp); }
      P.wp = 3; P.lav = 3; P.rim = 3; P.heat = tq >= T_HIT[1] - 1e-6 ? 2 : tq >= T_HIT[0] - 1e-6 ? 1 : 0;
      if (Math.abs(tq - T_HIT[0]) < 1e-6 || Math.abs(tq - T_HIT[1]) < 1e-6) P.bx = -1;         // 挨一下身子一顿
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_GLARE, REST, q, F_ALL); apply(tmp);
      P.wp = q < 0.4 ? 3 : q < 0.8 ? 1 : 0; P.heat = tq < 0.34 ? 2 : tq < 0.5 ? 1 : 0; P.lav = q < 0.5 ? 2 : 1; P.rim = q < 0.5 ? 2 : 1;
      if (tq >= T_SNORT - 1e-6) P.head = -1;                                                  // 热浪退去，扬鼻喷烟
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.wp = h < 0.35 ? 4 : 0; P.lav = h < 0.2 ? 3 : 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12, DROP); P.wp = d < 0.3 ? 4 : 5;
        P.lav = d < 0.3 ? (f12 & 1 ? 3 : 1) : d < 0.7 ? 1 : 0;
        P.cool = d < 0.7 ? 0 : Math.min(6, 1 + Math.floor((d - 0.7) / 0.12 + 1e-6));        // 裂纹一段段熄灭 → 全身冷却成石
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    const C1 = rig.C1; P.gx = R(C1.x + C1.r * 0.35 + OX) + P.bx; P.gy = R(C1.y + 1);          // 焦点：胸口（熔岩核心）
    const F = Q.headFrame(rig, o, P.jaw), nz = F.at(F.uT - 0.3, F.prof(F.uT)[0] + 0.3);
    P.nx = R(nz[0]) + OX + P.bx; P.ny = R(nz[1]); P.mox = R(rig.mouth[0]) + OX + P.bx; P.moy = R(rig.mouth[1]);
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 熔岩裂纹（候选部件：glowCracks——沿躯干外形按比例定位的发光裂纹网：t 臀心 0 → 胸心 1，v 背线 0 → 腹线 1；黑龙用同一套纹路画晶脉）
  // 段号：0 颈 · 1 胸 · 2 腰 · 3 臀 · 4 腿与尾（死亡时按 4 → 3 → 2 → 0 → 1 的顺序熄灭，胸口最后）
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
  const COOL_RANK = [3, 4, 2, 1, 0];
  let MM = m;                                                                                 // 当前材质表（drawHero 里按冷却程度选，裂纹画笔读它）
  function lavaDot(x, y, seg) {
    x = R(x); y = R(y); const k = ((x * 3 + y * 5) % 4 + 4) % 4;
    if (P.cool && COOL_RANK[seg] < P.cool) { U.dot(E, x, y, MM.cold, k === 0 ? 2 : 3); return; }
    const hot = P.heat === 2 || (P.heat === 1 && seg <= 2);
    if (hot) { U.dot(E, x, y, MM.hot, k === 1 ? 2 : 3); return; }
    if (P.lav >= 3) U.dot(E, x, y, MM.glow, k === 0 ? 4 : 3);
    else if (P.lav === 2) U.dot(E, x, y, MM.lava, k === 0 ? 4 : 3);
    else if (P.lav === 1) U.dot(E, x, y, MM.lava, k === 0 ? 2 : 3);
    else U.dot(E, x, y, MM.lava, k === 0 ? 3 : 2);
  }
  function bodyCracks(oo) {
    const C1 = rig.C1, C2 = rig.C2;
    for (const c of CRACKS) {
      for (let i = 1; i + 3 < c.length; i += 2) {
        const t0 = c[i], v0 = c[i + 1], t1 = c[i + 2], v1 = c[i + 3], x0 = lerp(C2.x, C1.x, t0), x1 = lerp(C2.x, C1.x, t1), n = Math.max(1, Math.ceil(Math.abs(x1 - x0) * 2 + Math.abs(v1 - v0) * 12));
        for (let s = 0; s <= n; s++) {
          const x = R(lerp(x0, x1, s / n)), sp = Q.span(rig, oo, x); if (!sp || sp[1] - sp[0] < 3) continue;
          const y = cl(R(sp[0] + lerp(v0, v1, s / n) * (sp[1] - sp[0])), sp[0] + 1, sp[1] - 1); lavaDot(x, y, c[0]);
        }
      }
    }
    const NB = rig.NB, NT = rig.NT, L = Math.hypot(NT.x - NB.x, NT.y - NB.y) || 1, nx = (NT.y - NB.y) / L, ny = -(NT.x - NB.x) / L;   // 颈侧一道
    for (let s = 0; s <= 6; s++) { const q = 0.1 + s * 0.13, w = (s & 1) ? 0.4 : -0.6; lavaDot(lerp(NB.x, NT.x, q) + nx * w, lerp(NB.y, NT.y, q) + ny * w + 0.5, 0); }
  }
  const cl = (v, a, b) => (v < a ? a : v > b ? b : v);
  function belly(oo) {                                                                        // 暗岩腹甲加厚一行（和躯干同一个部件）
    if (rig.lie) return; const C1 = rig.C1, C2 = rig.C2;
    for (let x = R(C2.x); x <= R(C1.x + C1.r * 0.4); x++) { const sp = Q.span(rig, oo, x); if (sp && sp[1] - sp[0] > 4) U.dot(E, x, sp[1] - 1, oo.m.belly, ((x + 40) % 3) === 0 ? 2 : 0); }
  }
  function legCrack(i) {                                                                      // 近侧腿上一道（和腿同一个部件）
    const L = rig.legs[i], T = L.T, F = L.F;
    for (let s = 0; s <= 3; s++) { const q = 0.28 + s * 0.14; lavaDot(lerp(T[0], F[0], q) + ((s & 1) ? 0.5 : -0.4), lerp(T[1], F[1], q), 4); }
  }
  function drawTail(oo) {
    part(); const n = tailWalk(rig, (P.tail | 0) * 0.2), mm = oo.m;
    for (let k = 0; k <= n; k++) U.disc(E, TP[k * 3], TP[k * 3 + 1], TP[k * 3 + 2], mm.limb, 0);
    for (let k = 2; k < n - 1; k += 3) {                                                     // 粗钝背刺（熔岩色尖）
      const x = TP[k * 3], y = TP[k * 3 + 1] - TP[k * 3 + 2]; U.dot(E, x, y - 1, mm.mane, 0); U.dot(E, x - 1, y - 1, mm.mane, 0); U.dot(E, x - 1, y - 2, mm.mane, 4);
    }
    for (let k = 3; k < n - 2; k += 2) lavaDot(TP[k * 3], TP[k * 3 + 1], 4);                  // 尾上的裂纹
    return [TP[n * 3], TP[n * 3 + 1]];
  }
  function drawHammer(cx, cy, rot, oo) {                                                      // 候选部件：clubHead（尾端锤头：5×5 图样，rot 按 90° 滚动）
    part(); cx = R(cx); cy = R(Math.min(cy, -2.5));
    for (let j = 0; j < 5; j++) for (let i = 0; i < 5; i++) {
      const ch = HAMMER[j][i]; if (ch === '.') continue; let u = i - 2, v = j - 2;
      for (let r = 0; r < (rot & 3); r++) { const w = u; u = -v; v = w; }
      if (ch === 'L') lavaDot(cx + u, cy + v, 4); else U.dot(E, cx + u, cy + v, oo.m.rock, 0);
    }
  }
  // 破膜翼（候选部件：tornWing——几何同 B.wing，膜的后缘凹得更深、啃出缺口，烂出 3 个洞，翼指伸出膜外）
  function wingGeo(x, y, pw, w, g) {
    const a0 = pw[0], aT = pw[1], fold = pw[2], span = w.span, nf = w.fingers, arm = span * (0.42 - 0.14 * fold);
    g.x = x; g.y = y; g.wx = x - Math.cos(a0) * arm; g.wy = y - Math.sin(a0) * arm; g.n = nf;
    for (let k = 0; k < nf; k++) { const q = nf === 1 ? 1 : k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); g.tx[k] = g.wx - Math.cos(fa) * fl; g.ty[k] = g.wy - Math.sin(fa) * fl; }
    g.bx = x - w.chord * (1 - 0.3 * fold); g.by = y + 1; return g;
  }
  const GN = { tx: [0, 0, 0], ty: [0, 0, 0] }, GF = { tx: [0, 0, 0], ty: [0, 0, 0] }, POLY = [];
  function drawWing(g, far, oo) {
    part(); const mm = oo.m, mem = far ? mm.wingFar : mm.wing, bone = far ? mm.boneFar : mm.bone, nf = g.n;
    POLY.length = 0; POLY.push(g.x, g.y, g.wx, g.wy);
    for (let k = 0; k < nf; k++) {
      POLY.push(g.tx[k], g.ty[k]);
      const nx = k < nf - 1 ? g.tx[k + 1] : g.bx, ny = k < nf - 1 ? g.ty[k + 1] : g.by, dq = k < nf - 1 ? 0.3 : 0.52;
      POLY.push(lerp((g.tx[k] + nx) / 2, g.wx, dq), lerp((g.ty[k] + ny) / 2, g.wy, dq));
    }
    POLY.push(g.bx, g.by); U.poly(E, POLY, mem, 0);
    if (!far) {
      for (let k = 0; k < nf; k++) {                                                          // 后缘啃出缺口
        const cx = POLY[4 + k * 4 + 2], cy = POLY[4 + k * 4 + 3], tx = g.tx[k], ty = g.ty[k];
        U.dot(E, lerp(cx, tx, 0.45), lerp(cy, ty, 0.45), 0); if (k === nf - 1) U.dot(E, lerp(cx, g.bx, 0.5), lerp(cy, g.by, 0.5), 0);
      }
      holesOf(g, HOLES);                                                                      // 三个破洞（黑龙的晶片补在同样的位置）
      for (let h = 0; h < 3; h++) { const x = R(HOLES[h * 2]), y = R(HOLES[h * 2 + 1]); U.dot(E, x, y, 0); U.dot(E, x - 1, y, 0); U.dot(E, x, y + 1, 0); U.dot(E, x - 1, y + 1, 0); }
      for (let k = 0; k < nf; k++) U.seg(E, g.wx, g.wy, lerp(g.wx, g.tx[k], k === 0 ? 1.14 : 0.9), lerp(g.wy, g.ty[k], k === 0 ? 1.14 : 0.9), 1, bone, k === 0 ? 4 : 2);   // 翼指：领头那根骨尖戳出膜外（外露的骨），其余压暗
    }
    U.seg(E, g.x, g.y, g.wx, g.wy, 2, bone, 0);                                               // 臂骨（远翼只画膜和臂骨，少一层线）
    U.dot(E, g.wx + 1, g.wy - 1, mm.claw, 3);                                                 // 拇指爪
  }
  const HOLES = [0, 0, 0, 0, 0, 0];
  function holesOf(g, out) {                                                                   // 破洞位置：两指之间靠外、翼根后缘（黑龙用同一个公式补晶片）
    out[0] = lerp(g.wx, (g.tx[0] + g.tx[1]) / 2, 0.58); out[1] = lerp(g.wy, (g.ty[0] + g.ty[1]) / 2, 0.58);
    out[2] = lerp(g.wx, (g.tx[1] + g.tx[2]) / 2, 0.55); out[3] = lerp(g.wy, (g.ty[1] + g.ty[2]) / 2, 0.55);
    out[4] = lerp((g.x + g.bx) / 2, (g.wx + g.tx[2]) / 2, 0.5); out[5] = lerp((g.y + g.by) / 2, (g.wy + g.ty[2]) / 2, 0.5); return out;
  }
  // 不对称双角（候选部件：hornPair——远侧完整后掠长角 / 近侧齐根断茬）
  function farHorn(oo) {
    part(); const H = rig.head, b = U.toW(H.x, H.y, H.a, -H.W * 0.2, -H.Hh + 0.4), x0 = b[0] + 1, y0 = b[1] - 1, c = oo.m.hornFar;
    U.seg(E, x0, y0, x0 - 3, y0 - 1, 2, c, 0); U.seg(E, x0 - 3, y0 - 1, x0 - 6, y0 - 2, 1, c, 0); U.dot(E, x0 - 7, y0 - 3, c, 4);
  }
  function nearHorn(oo) {
    part(); const H = rig.head, b = U.toW(H.x, H.y, H.a, 0, -H.Hh + 0.5), x0 = R(b[0]), y0 = R(b[1]), c = oo.m.horn;
    U.dot(E, x0, y0 - 1, c, 0); U.dot(E, x0 - 1, y0 - 1, c, 0); U.dot(E, x0 - 1, y0 - 2, c, 4); U.dot(E, x0 - 2, y0 - 1, c, 2);   // 断口左高右低
  }
  function rottenJaw(oo) {                                                                    // 和头同一个部件：下颌烂掉一块，露出骨白牙床
    const F = Q.headFrame(rig, oo, P.jaw), mm = oo.m;
    for (let s = 0; s < 4; s++) { const u = F.uc + 0.6 + s, vb = F.prof(u)[1] + F.gap(u), p = F.at(u, vb - 0.1); U.dot(E, p[0], p[1], s === 2 ? mm.ink : mm.bone, s === 1 ? 4 : 3); }
    const t1 = F.at(F.uT - 1.2, F.prof(F.uT - 1.2)[2] + 0.9); if (!P.jaw) U.dot(E, t1[0], t1[1], mm.teeth, 4);   // 闭嘴时一颗獠牙压在下唇外
  }
  function drawHero() {
    begin(hero, P.bx + OX, 0);
    const oo = P.cool >= 6 ? os : o, lie = rig.lie === 2; MM = oo.m;
    wingGeo(rig.wing.x + 2, rig.wing.y - 1, [WP[P.wp][0] + 0.12, WP[P.wp][1] + 0.1, WP[P.wp][2]], WING, GF);
    wingGeo(rig.wing.x, rig.wing.y, WP[P.wp], WING, GN);
    drawWing(GF, 1, oo);
    if (!lie) { Q.leg(E, rig, P, oo, 0); Q.leg(E, rig, P, oo, 1); }
    const tip = drawTail(oo);
    if (!P.drop) drawHammer(tip[0] - 1, tip[1], 0, oo);
    Q.ridge(E, rig, P, oo);
    Q.body(E, rig, P, oo); belly(oo); bodyCracks(oo);
    if (!lie) { Q.leg(E, rig, P, oo, 2); legCrack(2); Q.leg(E, rig, P, oo, 3); legCrack(3); }
    drawWing(GN, 0, oo);
    farHorn(oo);
    Q.head(E, rig, P, oo); rottenJaw(oo);
    nearHorn(oo);
    if (lie) { Q.leg(E, rig, P, oo, 0); Q.leg(E, rig, P, oo, 1); Q.leg(E, rig, P, oo, 2); legCrack(2); Q.leg(E, rig, P, oo, 3); legCrack(3); }
    if (P.drop) drawHammer(TIP_LIE[0] - 1 + P.dsx, lerp(TIP_LIE[1], -2.5, P.dsx / DROP.dx) - P.dsy, P.drop === 2 ? 3 : (-P.dsx / 3) | 0, oo);   // 岩锤滚落到地上
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.rimRamp = P.heat ? HEAT_RIM : EL; bake(hero, RIM);
  }

  // ───── 特效 ─────
  const SH = { x: 0, y: 0, rx: 29, ry: 33, n: 64 };                                            // 熔岩壳（屏幕坐标）：半椭圆点阵，和 fx.dome 同一套点位
  const hitA = [1.3, 0.95], hitT = [9, 9], SHOT_V = 220, SHOT_VY = 95;                      // 两发来袭攻击从右上方斜着砸在壳顶和壳前上方
  let shT = 9, shHits = 0, smT = 9, smX = 0, smY = 0, hsT = 9, chargeAcc = 0, dripAcc = 0, heatAcc = 0, soulAcc = 0, smokeAcc = 0, lastGf = -9, lastCool = 0;
  const shellX = (a) => R(SH.x + Math.cos(a) * SH.rx), shellY = (a) => R(SH.y - Math.sin(a) * SH.ry);
  function crackPoint(k) {                                                                    // 第 k 个裂纹采样点（屏幕坐标，粒子从裂纹里涌出用）
    const c = CRACKS[k % CRACKS.length], i = 1 + 2 * ((k >> 3) % ((c.length - 1) >> 1)), x = lerp(rig.C2.x, rig.C1.x, c[i]), sp = Q.span(rig, o, R(x));
    const y = sp ? sp[0] + c[i + 1] * (sp[1] - sp[0]) : rig.C1.y; return [scrX(R(x) + OX + P.bx), HY + R(y) - (P.lift | 0)];
  }
  function smokePuff(n, w) { for (let i = 0; i < n; i++) spawnX(K_TRAIL, scrX(P.nx) + (P.flip ? -1 : 1), HY + P.ny - 1, (P.flip ? -1 : 1) * (2 + Math.random() * 8), -10 - Math.random() * 10, (0.6 + Math.random() * 0.4) * w, R_SMOKE, { sz: i < 2 ? 2 : 1 }); }   // 一小股烟：两团 2×2 + 几颗碎烟
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const gx = scrX(P.gx), gy = HY + P.gy;
      SH.x = scrX(OX - 2); SH.y = HY; shT = 0; shHits = 0; hitT[0] = hitT[1] = 9;
      releaseOrbit(40, 95, 0.3, 0.6); burst(gx, gy, 22, 50, 120, 0.25, 0.55, R_EL, 10); ring(gx, gy, 1, R_EL);
      fx.dome(SH.x, SH.y, SH.rx, SH.ry, R_EL, 0.3, 1);                                        // 熔岩壳点阵逐点亮起
      for (let k = 0; k < 2; k++) { const a = hitA[k], tx = shellX(a), ty = shellY(a); shoot(3 + k, tx + SHOT_V * T_HIT[k], ty - SHOT_VY * T_HIT[k], -SHOT_V, tx, FXI.enemy, SHOT_VY); }   // 正好在挡击帧撞上壳
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === IDLE && T_PUFF.includes(t)) smokePuff(6, 1);                                     // 待机个性：鼻孔喷两小股黑烟
    if (s === RECOVER && t === T_SNORT) smokePuff(8, 1.2);                                     // 收招：热浪退去，喷烟
    if (s === ATTACK && t === T_OPEN) { smT = 0; smX = scrX(P.mox); smY = HY + P.moy; sfx('swing', { kind: 'bite', w: 0.9 }); }
    if (s === ATTACK && t === T_BITE) {
      const x = scrX(P.mox) + 1, y = HY + P.moy; burst(x + 1, y, 14, 40, 100, 0.15, 0.4, FXI.impact, 10); burst(x, y, 6, 30, 70, 0.2, 0.45, R_EL, 6);
      fx.cross(x + 1, y, 4, FXI.impact, 0.2, 2); hitDummy(1, 1); shake(0.1, 1); sfx('hit', { mat: 'flesh', w: 0.9 });
    }
    if (s === ATTACK && t === T_DRIP) for (let i = 0; i < 2; i++) spawnX(K_PHYS, scrX(P.mox) - i, HY + P.moy + 1, (Math.random() - 0.5) * 8, 4 + i * 6, 0.9 + i * 0.2, R_EL, { g: 170, floor: FLOOR - 1, age0: 0.12 });   // 口中滴下两滴熔岩，落地成余烬
    if (s === CAST && T_HIT.includes(t)) {
      const k = T_HIT.indexOf(t), a = hitA[k], x = shellX(a), y = shellY(a); shHits = k + 1; hitT[k] = 0;
      burst(x, y, 18, 40, 120, 0.12, 0.35, FXI.impact, 8); fx.cross(x, y, 5, FXI.impact, 0.25, 2);
      for (let i = 0; i < 5; i++) spawnX(K_PHYS, x - 1, y, -10 - Math.random() * 25, -20 - Math.random() * 20, 0.6 + Math.random() * 0.3, R_EL, { g: 150, floor: FLOOR - 1 });
      shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.7 + 0.1 * k });
    }
    if (s === RECOVER && t === T_SHATTER) {                                                    // 壳碎成余烬 → 血红热浪
      for (let k = 0; k <= SH.n; k += 2) { const a = k / SH.n * PI; spawnX(K_PHYS, shellX(a), shellY(a), (Math.random() - 0.5) * 30, -10 - Math.random() * 20, 0.6 + Math.random() * 0.5, R_EL, { g: 110, floor: FLOOR - 1 }); }
      shT = 9; ring(scrX(P.gx), HY + P.gy, 0, FXI.blood); heatAcc = 0; hsT = 0; shake(0.12, 1); sfx('impact', { pal: 'blood', w: 0.8 });
    }
    if (s === HURT && t === INCOMING) { hsT = -1; for (let i = 0; i < 4; i++) spawnX(K_PHYS, HX + HIT_POINT[0], HY + HIT_POINT[1], 10 + Math.random() * 20, -20 - Math.random() * 15, 0.6, R_EL, { g: 150, floor: FLOOR - 1 }); }
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 20; i++) spawn(K_DUST, HX - 36 + Math.random() * 44, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.9 });
    }
    if (s === DEATH && t === T_LAND) { sfx('hit', { mat: 'stone', w: 0.5 }); for (let i = 0; i < 5; i++) spawn(K_DUST, HX + OX + TIP_LIE[0] - 3 + DROP.dx, HY - 1, (Math.random() - 0.5) * 20, -6 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  }
  const T_PUFF = [1.66, 1.83];
  const EVENTS = [T_PUFF, [], [T_OPEN, T_BITE, T_DRIP], [], T_HIT, [T_SHATTER, T_SNORT], [INCOMING], [INCOMING + 0.66, T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {
      chargeAcc += dt * (16 + 30 * clamp01(stT / DUR[CHARGE]));                               // 熔岩粒子从地面往上螺旋汇聚到胸口
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 6, a = 0.25 * PI + Math.random() * 0.5 * PI; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT > 0.4) { dripAcc += dt * 5; while (dripAcc >= 1) { dripAcc -= 1; const p = crackPoint((Math.random() * 40) | 0); spawnX(K_PHYS, p[0], p[1], (Math.random() - 0.5) * 6, 0, 0.8, R_EL, { g: 120, floor: FLOOR - 1, age0: 0.1 }); } }   // 裂纹涌出岩浆
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) {
        const feet = P.gf === 0 ? [3, 0] : [1, 2];
        for (const i of feet) { const x = scrX(R(rig.legs[i].F[0]) + OX + (i === 3 || i === 1 ? 2 : 0)); spawn(K_STILL, x, HY, 0, 0, 0.3, R_EL); }   // 脚印处 1 格熔岩余烬
        for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(R(rig.legs[feet[0]].F[0]) + OX) + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 7, 0.3 + Math.random() * 0.25, FXI.dust);
        sfx('step', { w: 0.9 });
      }
      lastGf = P.gf;
    }
    if (hsT < 0.5 && state === RECOVER) { heatAcc += dt * 70; while (heatAcc >= 1) { heatAcc -= 1; const p = crackPoint((Math.random() * 40) | 0); spawn(K_RISE, p[0] + (Math.random() - 0.5) * 6, p[1] - 2, (Math.random() - 0.5) * 6, -18 - Math.random() * 18, 0.4 + Math.random() * 0.4, FXI.blood); } }   // 血红热浪
    if (state === DEATH && P.cool !== lastCool) { if (P.cool > lastCool && P.cool <= 6) for (let i = 0; i < 4; i++) { const p = crackPoint((Math.random() * 40) | 0); spawn(K_RISE, p[0], p[1] - 1, (Math.random() - 0.5) * 4, -8 - Math.random() * 8, 0.6 + Math.random() * 0.4, R_SMOKE); } lastCool = P.cool; }   // 每熄一段冒一缕烟
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 34 + Math.random() * 44, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }   // 魂光橙红
    shT += dt; smT += dt; hsT += dt; hitT[0] += dt; hitT[1] += dt;
  }
  function fxReset() { shT = 9; shHits = 0; smT = 9; hsT = 9; hitT[0] = hitT[1] = 9; chargeAcc = 0; dripAcc = 0; heatAcc = 0; soulAcc = 0; smokeAcc = 0; lastGf = -9; lastCool = 0; }
  function fxBack(f12) {
    if (P.rim >= 2 && !rig.lie) floorGlow(scrX(P.gx), P.rim, P.heat ? BL : EL, f12);
    shotFloorGlow(f12);
  }
  function fxFront(f12) {
    if (shT >= 0.1 && shT < 1.2 && shHits < 3) {                                              // 熔岩壳：挨一下那一段变白断开，整体点阵变稀
      for (let k = 0; k <= SH.n; k++) {
        if ((shHits === 1 && k % 4 === 0) || (shHits === 2 && k % 2 === 0)) continue;
        const a = k / SH.n * PI; let c = ((k + (f12 >> 1)) % 5) === 0 ? EL[1] : (k & 1) ? EL[2] : EL[3], gone = false;
        for (let h = 0; h < shHits; h++) { if (Math.abs(a - hitA[h]) < 0.24) { if (hitT[h] < 0.1) c = EL[0]; else gone = true; } }
        if (!gone) put(shellX(a), shellY(a), c);
      }
    }
    if (smT < 2 / 12) {                                                                       // 咬合拖影：上下两道弧往中间合
      const first = smT < 1 / 12, c0 = first ? EL[0] : EL[2], c1 = first ? EL[1] : EL[3];
      for (let k = 0; k <= 4; k++) { if (!first && (k & 1)) continue; const dx = R(Math.sqrt(k) * 1.2); put(smX + 3 + dx, smY - 5 + k, c0); put(smX + 3 + dx, smY + 5 - k, c0); put(smX + 4 + dx, smY - 5 + k, c1); }
    }
    if (hsT >= -1 && hsT < -1 + 0.25 && E.state === HURT) {                                   // 受击：熔岩护盾在挨打处闪出一小段
      const x0 = HX + HIT_POINT[0] + 3, y0 = HY + HIT_POINT[1], q = (hsT + 1) / 0.25;
      for (let k = -3; k <= 3; k++) { if (q > 0.5 && (k & 1)) continue; put(x0 + R(3 - Math.abs(k) * 0.6), y0 + k * 2, q < 0.3 ? EL[0] : q < 0.6 ? EL[1] : EL[2]); }
    }
  }

  return {
    name: '赤龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.lava, m.hot, m.glow, m.eye], HIT_POINT, EVENTS,
    REVIVE: { dy: -12, ramp: R_EL, big: 1 },
    SFX: { body: 'beast', how: 'topple', pal: 'fire', style: 'nova', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
