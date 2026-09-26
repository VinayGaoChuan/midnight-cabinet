// 巫毒守卫（部队 · 精灵 · 先锋 · 优质 · 飞行）：巫毒信徒进化后的成虫——同一张骨白面具放大并长出一圈骨刺冠（深红涂纹），背上拱起靛紫硬甲壳（鞘翅半张、后缘外翻），
// 膜翅从壳下伸出，前胸一对螳螂式骨镰爪（内侧锯齿、爪尖荧绿毒滴），腹下两节串珠毒囊。攻击「双镰交叉横扫」；技能表现特性「副过敏反应」（亡语剧毒）：
// 鞘翅全张、两节毒囊从后往前点亮，双爪交叉一挥甩出 X 形两道毒刃；死亡坠落碎壳：翅膀收拢直坠落地，甲壳碎成块弹开（死亡套件 chunks），两节毒囊依次爆出毒雾。
PCD.define('VoodooGuard', (E) => {
  const { defMat, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_TRAIL, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow, keyer, sfx, death } = E;
  const U = E.parts.beast.util, R = Math.round;

  // ───── 材质：软虫身、翅膜与巫毒信徒同色（同一个体进化），甲壳 / 镰爪 / 串珠毒囊是新加的 ─────
  const T_BODY = [34, E.color('#2a6e58'), E.color('#4fb08a'), E.color('#9ee0b8')];
  const T_WING = [E.color('#2e4446'), E.color('#6f8f8c'), E.color('#a9c4c0'), E.color('#dcece8')];
  const M_BODY = defMat(T_BODY, 2), M_BELLY = defMat([34, T_BODY[2], T_BODY[3], 17], 1);
  const M_WING = defMat(T_WING, 1), M_WINGF = defMat(T_WING, 1, 0, 1);
  const M_SHELL = defMat([0, 25, 42, 24], 2), M_GLOSS = defMat([22, 22, 22, 21], 1, 1);                 // 靛紫甲壳 + 紫青高光
  const M_MASK = defMat('bone', 1), M_PAINT = defMat([11, 12, 13, 26], 1, 1), M_INK = defMat('ink', 1, 1), M_CROWN = defMat('bone', 1);
  const M_CLAW = defMat('bone', 1), M_CLAWF = defMat('bone', 1, 0, 1), M_TIP = defMat([48, 49, 50, 38], 1, 1), M_TIPF = defMat([48, 48, 49, 50], 1, 1);
  const M_SAC = defMat('shadow', 1), M_LIQ = defMat([48, 49, 50, 38], 1, 1), M_HOT = defMat([50, 38, 21, 21], 1, 1), M_EYE = defMat([42, 24, 43, 21], 1, 1);
  const R_EL = FXI.poison, EL = FXR[R_EL], R_DEEP = E.fxRamp('venomDeep', [50, 49, 48, 34, 52]), DP = FXR[R_DEEP], HX = 70, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(80, 56, 36, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const m of [M_EYE, M_LIQ, M_HOT, M_INK, M_PAINT, M_GLOSS, M_TIP, M_TIPF]) RIM.skip[m] = 1;
  const ALT = 7;

  // ───── 姿势 ─────
  // wu / wl 上 / 下对翅翼姿（同信徒）；dy 升降（+ 往下，坠落用）；shell 鞘翅 0 合 · 1 半张 · 2 全张；cN / cF 近 / 远镰爪姿（CLAW 表）；tipG 爪尖毒光 0–3；
  // sacA / sacB 后 / 前节毒囊亮度 0–3；eyeG 眼孔；lie 落地压扁
  const P = { wu: 1, wl: 2, bob: 0, dy: 0, bx: 0, look: 0, tw: 0, shell: 1, cN: 0, cF: 0, tipG: 0, sacA: 0, sacB: 0, eyeG: 0, eyes: 0, lie: 0,
    flash: 0, rim: 1, dq: 0, dq48: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY = keyer([['wu', 0, 6], ['wl', 0, 6], ['bob', -2, 2], ['dy', -3, 8], ['bx', -8, 15], ['look', -1, 1], ['tw', -1, 1], ['shell', 0, 2], ['cN', 0, 7], ['cF', 0, 7],
    ['tipG', 0, 3], ['sacA', 0, 3], ['sacB', 0, 3], ['eyeG', 0, 3], ['eyes', 0, 1], ['lie', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['dq48', 0, 48]]);
  const FLAP = [1, 2, 3, 4], FLAP_L = [2, 3, 4, 1];
  // 镰爪姿：[股节角, 刃角]（0 朝右、+ 朝下）：0 收在面具下 · 1 高举 · 2 前下劈 · 3 低后引 · 4 前上撩 · 5 垂软 · 6 磨爪上抬 · 7 蓄力半举
  const CLAW = [[0.75, -0.45], [-0.9, -2.2], [0.15, 0.4], [1.1, 2.1], [-0.35, -0.7], [1.1, 1.35], [0.55, -0.85], [-0.45, -1.3]];
  function reset() { P.wu = 1; P.wl = 2; P.bob = 0; P.dy = 0; P.bx = 0; P.look = 0; P.tw = 0; P.shell = 1; P.cN = 0; P.cF = 0; P.tipG = 0; P.sacA = 0; P.sacB = 0; P.eyeG = 0; P.eyes = 0; P.lie = 0; P.flash = 0; P.rim = 1; P.dq = 0; P.mx = 0; P.flip = 0; }
  const bodyC = () => [0, -(ALT + 3.4) + P.bob + P.dy + P.lie];
  const maskC = () => { const [cx, cy] = bodyC(); return [cx + 7.5, cy - 2]; };
  const shoulder = (far) => { const [cx, cy] = bodyC(); return far ? [cx + 1, cy + 1] : [cx + 2, cy + 2]; };
  function clawPts(far) {                                            // 股节根、膝、刃尖（本地坐标）
    const [sx, sy] = shoulder(far), c = CLAW[far ? P.cF : P.cN], kx = sx + 5 * Math.cos(c[0]), ky = sy + 5 * Math.sin(c[0]);
    return [sx, sy, kx, ky, kx + 9.5 * Math.cos(c[1]), ky + 9.5 * Math.sin(c[1])];
  }
  const sacs = () => { const [cx, cy] = bodyC(); return [[cx - 4.5, cy + 4.6, 2.2], [cx - 1.3, cy + 5.2, 2.6]]; };   // [后节, 前节]

  function idle(tq, f12) {
    const TT = f12 / 12, f = (f12 >> 1) & 3; P.wu = FLAP[f]; P.wl = FLAP_L[f]; P.bob = (Math.floor(TT * 2.5) & 1) ? -1 : 0; P.tw = [0, 1, 0, -1][Math.floor(TT * 1.25) & 3];
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 && lp < 2.0) { const k = (f12 >> 1) & 1; P.cN = k ? 6 : 0; P.cF = k ? 0 : 6; P.tipG = 1; }   // 待机个性：两只镰爪上下交错互刮
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                          // 低空重扑翼：每拍下坠 1 格再弹起，鞘翅随扑翼开合
      const f = gait(tq); P.wu = FLAP[f]; P.wl = FLAP_L[f]; P.bob = [-1, 0, 1, 0][f]; P.shell = [1, 2, 1, 0][f]; P.tw = [1, 0, -1, 0][f];
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                      // 双镰交叉横扫：近爪高举 → 下劈，远爪低引 → 上撩
      if (tq < 0.12) { P.bx = -R(2 * ease.out(tq / 0.12)); P.cN = 1; P.cF = 3; P.shell = 2; P.wu = 1; P.wl = 1; P.tipG = 1; P.eyeG = 1; }
      else if (tq < 0.25) { P.bx = 6; P.cN = 2; P.cF = 4; P.wu = 3; P.wl = 3; P.tipG = 2; P.eyeG = 2; P.tw = -1; }
      else if (tq < 0.45) { idle(tq, f12); P.bx = R(5 - 3 * ease.out((tq - 0.25) / 0.2)); P.cN = 2; P.cF = 4; P.tipG = 1; P.cN = tq < 0.35 ? 2 : 0; P.cF = tq < 0.35 ? 4 : 0; }
      else { idle(tq, f12); P.bx = R(2 * (1 - ease.inOut(clamp01((tq - 0.45) / 0.3)))); }
    } else if (st === CHARGE) {                                      // 鞘翅全张，两节毒囊从后往前点亮，镰爪半举滴毒
      const q = ease.inOut(clamp01(tq / 0.7)), f = (f12 >> 1) & 1;
      P.bx = -R(4 * q); P.shell = q > 0.3 ? 2 : 1; P.wu = q > 0.4 ? (f ? 5 : 1) : FLAP[(f12 >> 1) & 3]; P.wl = q > 0.4 ? 5 : FLAP_L[(f12 >> 1) & 3];
      P.cN = q > 0.5 ? 7 : 0; P.cF = q > 0.5 ? 7 : 0; P.tipG = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.eyeG = tq > 0.5 ? 1 : 0;
      P.sacA = tq < 0.3 ? 0 : tq < 0.9 ? 2 : ((f12 & 1) ? 3 : 2); P.sacB = tq < 0.65 ? 0 : tq < 0.9 ? 2 : ((f12 & 1) ? 2 : 3);
    } else if (st === CAST) {                                        // 双爪交叉一挥（X）
      P.bx = -4; P.shell = 2; P.cN = 2; P.cF = 4; P.rim = 3; P.eyeG = 2;
      if (tq < 1 / 12) { P.wu = 3; P.wl = 3; P.tipG = 3; P.sacA = 3; P.sacB = 3; P.eyeG = 3; }
      else { const f = (f12 >> 1) & 3; P.wu = FLAP[f]; P.wl = FLAP_L[f]; P.tipG = 2; P.sacA = 1; P.sacB = 1; }
    } else if (st === RECOVER) {                                     // 鞘翅合拢，爪尖甩掉残毒
      idle(tq, f12); const q = ease.inOut(clamp01(tq / 0.6));
      P.bx = -R(4 * (1 - q)); P.shell = q < 0.5 ? 2 : 1; P.rim = q < 0.5 ? 2 : 1; P.tipG = q < 0.4 ? 1 : 0; P.sacA = q < 0.3 ? 1 : 0; P.sacB = q < 0.3 ? 1 : 0;
      if (tq >= 0.12 && tq < 0.3) { P.cN = 6; P.cF = 4; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.flash = h < 1 / 12 ? 1 : 0; P.eyes = 1; P.wu = 1; P.wl = 1; P.shell = 2; P.cN = 5; P.cF = 5; P.tw = 1; P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.wu = 4; P.wl = 4; P.cN = 5; P.tw = 1; P.rim = 0; }
      else idle(tq, f12);
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 1; P.wu = 1; P.wl = 1; P.shell = 2; P.cN = 5; P.cF = 5; P.tw = 1; P.sacA = (f12 & 1) ? 1 : 0; }
      else if (d < T_LAND - INCOMING) { const q = (d - 0.3) / (T_LAND - INCOMING - 0.3); P.bx = -2; P.eyes = 1; P.wu = 0; P.wl = 0; P.shell = 0; P.cN = 5; P.cF = 5; P.tw = -1; P.dy = R(6 * q * q); }   // 翅膀收拢直坠
      else if (d < T_CRUMBLE - INCOMING) { P.bx = -2; P.eyes = 1; P.wu = 6; P.wl = 6; P.shell = 0; P.cN = 5; P.cF = 5; P.dy = 6; P.lie = 1; }                                      // 落地压扁
      else { P.bx = -2; P.eyes = 1; P.wu = 6; P.wl = 6; P.shell = 0; P.cN = 5; P.cF = 5; P.dy = 6; P.lie = 1; P.dq = 1; }                                                    // 碎壳：精灵交给死亡套件
    } else if (st === REVIVE) { idle(tq, f12); P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    // 焦点：近爪爪尖（蓄力汇聚、轮廓光）
    const c = clawPts(0); P.gx = R(c[4]) + P.bx; P.gy = R(c[5]);
    P.dq48 = R(P.dq * 48); KEY(P);
  }

  // ───── 画 ─────
  // 候选部件：insectWing 昆虫膜翅（同 VoodooBeliever.js）
  const WA = [0.12, 1.25, 0.3, -0.5, 0.8, 1.05, -0.4], WF = [0.6, 1, 0.45, 1, 0.75, 1, 0.8];
  function insectWing(x, y, a, L, wd, m) {
    part();
    const dx = -Math.cos(a), dy = -Math.sin(a), nx = -dy, ny = dx, ext = Math.ceil(L + wd + 1);
    for (let py = Math.floor(y - ext); py <= Math.ceil(y + ext); py++) for (let px = Math.floor(x - ext); px <= Math.ceil(x + ext); px++) {
      const u = (px - x) * dx + (py - y) * dy, v = (px - x) * nx + (py - y) * ny; if (u < -0.3 || u > L + 0.3) continue;
      const s = clamp01(u / L), half = wd * Math.sqrt(Math.sin(Math.PI * (0.12 + 0.86 * s))), lead = half * 0.42, trail = half * 0.58 + 0.3;
      if (v > lead || v < -trail) continue;
      let t = 0;
      if (v > lead - 1 && s > 0.08) t = 2;
      else if (Math.abs(v + half * 0.1) < 0.5 && s > 0.15 && s < 0.85) t = 2;
      else if (v < -0.6 && ((px + py) & 1)) t = 4;
      U.dot(E, px, py, m, t);
    }
  }
  function wings(cx, cy, far) {
    const m = far ? M_WINGF : M_WING, ox = far ? 2 : 0, oy = far ? -1 : 0;
    insectWing(cx - 5 + ox, cy - 3 + oy, WA[P.wl] - 0.4, 8, 2.4 * WF[P.wl], m);
    insectWing(cx - 4 + ox, cy - 4.5 + oy, WA[P.wu], 12, 3.4 * WF[P.wu], m);
  }
  function drawBody(cx, cy) {                                        // 分节软虫身（比信徒粗一圈）
    part();
    const xa = cx - 8, xb = cx + 3;
    for (let x = xa; x <= xb; x++) {
      const s = (x - xa) / (xb - xa), r = 1.6 + 1.8 * Math.pow(s, 0.7), yc = cy + P.tw * (1 - s) * (1 - s) * 1.5 + (1 - s) * 0.8, y0 = R(yc - r), y1 = R(yc + r);
      for (let y = y0; y <= y1; y++) { const ring = ((x - xa) % 3) === 2 && y > y0 && y < y1, belly = y >= y1 - 1 && s > 0.2; if (y <= 0) sp(x, y, belly ? M_BELLY : M_BODY, ring ? 2 : 0); }
    }
  }
  const inPoly = (x, y, p) => { let c = false; for (let i = 0, j = p.length - 2; i < p.length; j = i, i += 2) { const yi = p[i + 1], yj = p[j + 1]; if ((yi > y) !== (yj > y) && x < (p[j] - p[i]) * (y - yi) / (yj - yi) + p[i]) c = !c; } return c; };
  // 候选部件：elytron 鞘翅甲壳——拱顶硬壳绕前端铰点抬起（open 0–2），后下缘外翻、刻点纹、紫青高光
  const SHELL = [3, -1, 2, -4, 0, -5.6, -3, -6.2, -6, -5.2, -8.6, -3.2, -10, -0.6, -8.4, 0.8, -6.6, -0.2, -3, 0.2, 1, 0.8];
  function drawShell(cx, cy) {
    part();
    const th = 0.17 * P.shell, sc = P.shell === 2 ? 1.12 : 1, hx = 2, hy = -3, p = [];
    for (let i = 0; i < SHELL.length; i += 2) { const x = SHELL[i] * sc - hx, y = SHELL[i + 1] * sc - hy; p.push(cx + hx + x * Math.cos(th) - y * Math.sin(th), cy + hy + x * Math.sin(th) + y * Math.cos(th)); }
    let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < p.length; i += 2) { x0 = Math.min(x0, p[i]); x1 = Math.max(x1, p[i]); y0 = Math.min(y0, p[i + 1]); y1 = Math.max(y1, p[i + 1]); }
    for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) for (let x = Math.floor(x0); x <= Math.ceil(x1); x++) {
      if (y > 0 || !inPoly(x + 0.5, y + 0.5, p)) continue;
      const below = !inPoly(x + 0.5, y + 1.5, p), lx = (x - cx) * Math.cos(th) + (y - cy) * Math.sin(th);
      let m = M_SHELL, t = 0;
      if (below && lx < -3) t = 4;                                                        // 外翻的后下缘（亮）
      else if (!below && ((x * 3 + y * 5 + 99) % 7) === 0 && inPoly(x + 0.5, y - 0.5, p)) t = 2;   // 刻点
      sp(x, y, m, t);
    }
    const gx = R(cx - 1 + (P.shell ? -0.6 * P.shell : 0)), gy = R(cy - 5 - P.shell * 0.8);             // 高光
    sp(gx, gy, M_GLOSS, 3); sp(gx - 1, gy, M_GLOSS, 3); sp(gx + 1, gy + 1, M_GLOSS, 4);
  }
  // 候选部件：mantisClaw 螳螂镰爪——股节 + 带内侧锯齿的弯刃、毒尖（发光档 tipG）
  function drawClaw(far) {
    part();
    const [sx, sy, kx, ky, tx, ty] = clawPts(far), m = far ? M_CLAWF : M_CLAW, tip = far ? M_TIPF : M_TIP;
    U.taper(E, sx, sy, kx, ky, 1.1, 0.8, m, 0);
    const n = 9, ax = (tx - kx) / n, ay = (ty - ky) / n, nl = Math.hypot(ax, ay) || 1, px = -ay / nl, py = ax / nl;   // p = 刃的内侧（顺时针法线）
    for (let k = 0; k <= n; k++) {
      const q = k / n, bend = Math.sin(q * Math.PI) * 1.2, x = kx + ax * k - px * bend, y = ky + ay * k - py * bend;
      const tipPx = k >= n - 1;
      U.dot(E, x, y, tipPx ? tip : m, tipPx ? (P.tipG >= 2 ? 4 : 3) : k < 3 ? 0 : 0);
      if (k < n - 2) U.dot(E, x - px * 0.9, y - py * 0.9, m, k === 2 ? 4 : 0);                     // 刃背加厚
      if (k >= 2 && k < n - 1 && (k & 1) === 0) U.dot(E, x + px, y + py, m, 2);                    // 内侧锯齿
    }
    if (P.tipG >= 1 && !far) U.dot(E, tx + px * 0.8, ty + py * 0.8 + 1, tip, P.tipG >= 3 ? 4 : 2);  // 毒滴
  }
  function drawSacs() {                                              // 候选部件：venomSac 串珠毒囊（两节，亮度 sacA / sacB）
    part();
    const S = sacs(), lv = [P.sacA, P.sacB];
    for (let k = 0; k < 2; k++) {
      const [sx, sy, r] = S[k], g = lv[k], n = Math.ceil(r) + 1;
      for (let j = -n; j <= n; j++) for (let i = -n; i <= n; i++) {
        const px = R(sx) + i, py = R(sy) + j, d = Math.hypot(px - sx, py - sy) / (r + 0.3); if (d > 1 || py > 0) continue;
        if (d < 0.7 && py - sy > -r * 0.45) {
          let m = M_LIQ, t = d > 0.45 ? 3 : 4;
          if (g === 1) t = 4; else if (g === 2) { m = d < 0.4 ? M_HOT : M_LIQ; t = d < 0.4 ? 2 : 4; } else if (g === 3) { m = M_HOT; t = d < 0.45 ? 3 : 2; }
          sp(px, py, m, t);
        } else sp(px, py, M_SAC, d < 0.55 && py < sy ? 4 : 0);
      }
    }
    const [a, b] = S; sp(R((a[0] + b[0]) / 2), R((a[1] + b[1]) / 2) - 1, M_SAC, 2);
  }
  // 候选部件：voodooMask 巫毒面具（放大版 8×10 + 骨刺冠）
  function drawMask(mx, my) {
    part();                                                          // 骨刺冠：沿面具顶弧 5 根，高出 3 格
    for (const a of [-2.55, -2.1, -1.57, -1.05, -0.6]) { const r0 = 4.6, bx = mx + 0.5 + Math.cos(a) * 3.2, by = my + 0.5 + Math.sin(a) * r0, L = a === -1.57 ? 3.6 : 3; U.taper(E, bx, by, bx + Math.cos(a) * L, by + Math.sin(a) * L, 0.8, 0.4, M_CROWN, 0); U.dot(E, bx + Math.cos(a) * L, by + Math.sin(a) * L, M_CROWN, 4); }
    part();
    U.oval(E, mx + 0.5, my + 0.5, 3.6, 4.6, M_MASK, 0);
    const lx = P.look;
    for (let x = -2; x <= 3; x++) sp(mx + x + lx, my - 3 - (x & 1), M_PAINT, 2);          // 额上锯齿纹
    const eyeM = P.eyes || !P.eyeG ? M_INK : M_EYE, eyeT = P.eyes ? 0 : P.eyeG + 1;
    if (!P.eyes) { for (const x of [-1, 0, 2, 3]) sp(mx + x + lx, my - 1, eyeM, eyeT); sp(mx + 2 + lx, my - 2, eyeM, eyeT); sp(mx - 1 + lx, my - 2, M_PAINT, 1); }
    else { for (const x of [-1, 0, 2, 3]) sp(mx + x + lx, my - 1, M_PAINT, 1); }
    sp(mx + 1 + lx, my, M_MASK, 4); sp(mx + 1 + lx, my - 1, M_MASK, 4);                     // 鼻梁
    for (const x of [-1, 3]) { sp(mx + x + lx, my, M_PAINT, 2); sp(mx + x + lx, my + 1, M_PAINT, 2); sp(mx + x + lx, my + 2, M_PAINT, 1); }   // 泪痕
    for (let x = -1; x <= 3; x++) sp(mx + x + lx, my + 3, M_INK, 0);                        // 嘴缝 + 齿
    for (const x of [-1, 1, 3]) sp(mx + x + lx, my + 4, M_MASK, 4); for (const x of [0, 2]) sp(mx + x + lx, my + 4, M_INK, 0);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const [cx, cy] = bodyC(), [mx, my] = maskC();
    wings(cx, cy, 1);
    drawClaw(1);
    drawSacs();
    drawBody(cx, cy);
    wings(cx, cy, 0);
    drawShell(cx, cy);
    drawMask(mx, my);
    drawClaw(0);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const T_HIT = 2 / 12, T_LAND = INCOMING + 0.62, T_CRUMBLE = INCOMING + 0.7, T_SAC2 = INCOMING + 0.88, T_FLICK = 0.17, T_DRIP = 1.95;
  let chargeAcc = 0, trailAcc = 0, soulAcc = 0, lastLp = 0, xmT = 9, lastGf = -1, puddleT = 9, hits = 0;
  const tipScr = (far) => { const c = clawPts(far); return [scrX(R(c[4]) + P.bx), HY + R(c[5])]; };
  const shoulderScr = () => { const s = shoulder(0); return [scrX(R(s[0]) + P.bx), HY + R(s[1])]; };
  function drip(x, y, vx, vy, ramp) { spawnX(K_PHYS, x, y, vx, vy, 0.9, ramp == null ? R_DEEP : ramp, { g: 240, floor: HY }); }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = tipScr(0), [fx0, fy0] = tipScr(1);
      releaseOrbit(30, 80, 0.3, 0.6); burst(gx, gy, 14, 40, 100, 0.25, 0.5, R_EL, 6); burst(fx0, fy0, 8, 30, 80, 0.2, 0.4, R_EL, 6); ring(gx, gy, 0, R_EL); shake(0.28, 2); flash(0.05);
      const tx = DUMMY_X - 5, sx = Math.min(gx, fx0) + 1, sy = (gy + fy0) / 2;
      shoot(1, sx, sy - 4, 80, tx, R_EL, 50, { trail: { every: 2, life: [0.1, 0.25], back: [6, 14], off: 3 } });   // 上刃往下
      shoot(2, sx, sy + 4, 80, tx, R_EL, -50, { trail: { every: 2, life: [0.1, 0.25], back: [6, 14], off: 3 } });  // 下刃往上 → 交叉成 X
      hits = 0;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [cx, cy] = shoulderScr(), tx = DUMMY_X - 5, ty = HY - 13;
      fx.slash(cx, cy - 1, 11, 0.25, 2.35, R_EL, 0.17, 2, 2); fx.slash(cx - 1, cy + 1, 10, 2.7, 0.7, R_EL, 0.17, 2, 1);   // 两段交叉拖影弧
      burst(tx, ty, 10, 40, 90, 0.15, 0.35, FXI.impact, 8); burst(tx, ty, 6, 30, 70, 0.2, 0.4, R_EL, 6); hitDummy(0, 1);
      drip(tx + 1, ty + 2, 6, 0);
      sfx('swing', { kind: 'claw', w: 0.45 }); sfx('hit', { mat: 'stone', w: 0.45 });
    }
    if (s === RECOVER && t === T_FLICK) { const [gx, gy] = tipScr(0); for (let i = 0; i < 4; i++) drip(gx, gy, 20 + Math.random() * 30, -30 - Math.random() * 20); }   // 甩掉残毒
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 14 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.12, 1); sfx('fall', { w: 0.45 }); }
    if (s === DEATH && t === T_CRUMBLE) {                               // 甲壳碎成块弹开 + 后节毒囊爆雾
      poseAt(DEATH, T_CRUMBLE - 0.02, E.simT); drawHero(); bakeHero(); hero.k1 = P.k1; hero.k2 = P.k2;
      const [cx, cy] = bodyC();
      death.start('chunks', { chunk: 4, power: 0.55, fromX: R(cx - 2), fromY: R(cy - 1), fadeAt: 1.2, fadeDur: 0.6, ramp: 'soul' });
      const a = sacs()[0], x = HX + R(a[0]) + P.bx, y = HY + R(a[1]); fx.cloud(x, y - 2, 8, R_DEEP, 1.3, 2); burst(x, y, 18, 40, 100, 0.3, 0.6, R_EL, 12); shake(0.16, 1);
    }
    if (s === DEATH && t === T_SAC2) { const b = sacs()[1], x = HX + R(b[0]) + P.bx, y = HY + R(b[1]); fx.cloud(x + 2, y - 3, 9, R_DEEP, 1.3, 2); burst(x, y, 20, 40, 110, 0.3, 0.6, R_EL, 12); ring(x, y - 2, 0, R_EL); }
  }
  const EVENTS = [[], [], [T_HIT], [], [], [T_FLICK], [], [T_LAND, T_CRUMBLE, T_SAC2], []];
  function impactOn(k, x, y) {                                        // 两道毒刃各命中一次
    fx.cloud(x + (k === 1 ? -2 : 2), y + (k === 1 ? -3 : 2), 8, R_DEEP, 1.3, 2); burst(x, y, 16, 40, 110, 0.3, 0.6, R_EL, 10);
    hits++; if (hits === 1) { ring(x, y, 1, R_EL); hitDummy(1, 1); dummyFx({ dur: 1.6, tint: 'poison', slow: 0.5 }); shake(0.12, 1); xmT = 0; puddleT = 0; }
    for (let i = 0; i < 3; i++) drip(x - 2 + Math.random() * 4, y + 1, (Math.random() - 0.5) * 10, 10);
    sfx('impact', { pal: 'poison', w: 0.6 });
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {
      const [gx, gy] = tipScr(0);
      chargeAcc += dt * (16 + 22 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_DEEP, a, r, 4 + Math.random() * 3); }
      if (stT > 0.5 && Math.random() < dt * 5) drip(gx, gy + 1, 0, 0);
    }
    if (state === MOVE) {                                               // 重扑翼：下压时把地上的尘吹起
      const f = gait(q12(stT)); if (f !== lastGf && f === 3) for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(-2) + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 24, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust);
      lastGf = f; trailAcc += dt * 6; while (trailAcc >= 1) { trailAcc -= 1; const s = sacs()[0]; spawn(K_TRAIL, scrX(R(s[0])), HY + R(s[1]) + 2, (P.flip ? 1 : -1) * (5 + Math.random() * 5), 3 + Math.random() * 3, 0.3 + Math.random() * 0.2, R_EL); }
    }
    if (state === IDLE) { const lp = stT % DUR[IDLE]; if (lastLp < T_DRIP && lp >= T_DRIP) { const [gx, gy] = tipScr(0); drip(gx, gy + 1, 0, 0, R_EL); } lastLp = lp; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 20, HY - 2 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    xmT += dt; puddleT += dt;
  }
  function fxReset() { chargeAcc = 0; trailAcc = 0; soulAcc = 0; lastLp = 0; xmT = 9; lastGf = -1; puddleT = 9; hits = 0; }
  function fxBack(f12) {
    if (P.dq < 0.6) groundShadow(scrX(0), 7, Math.max(0, ALT - P.dy));
    if (P.rim >= 2) floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  function fxMid(f12) {                                               // 假人脚下的小毒洼
    if (puddleT < 1.2) { const q = puddleT / 1.2, w = R(2 + Math.min(1, puddleT * 4) * 3); for (let x = -w; x <= w; x++) { if (q > 0.7 && ((x + f12) & 1)) continue; put(DUMMY_X + x, FLOOR, Math.abs(x) < w - 1 ? DP[2] : DP[3]); if (Math.abs(x) < w - 2) put(DUMMY_X + x, FLOOR - 1, q < 0.5 ? DP[1] : DP[3]); } }
  }
  function fxFront(f12) {
    if (xmT < 0.9 && !(xmT > 0.6 && (f12 & 1))) {                       // X 形毒痕贴在假人身上
      const cx = DUMMY_X, cy = HY - 15, L = 5;
      for (let k = -L; k <= L; k++) { if (xmT > 0.4 && (k & 1)) continue; const c = Math.abs(k) < 2 ? (xmT < 0.2 ? DP[0] : DP[1]) : DP[2]; put(cx + k, cy + k, c); put(cx + k, cy - k, c); }
    }
    if (E.state === CHARGE && P.tipG >= 2) {                            // 爪尖荧绿轮廓光
      const [gx, gy] = tipScr(0); for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) put(gx + dx * 2, gy + dy * 2, (f12 & 1) ? EL[1] : EL[2]);
    }
  }
  function drawShot(k, x, y, d, f12, Rr) {                            // 毒刃弧：k 1 = 「\」、k 2 = 「/」，两道交叉成 X
    const s = k === 1 ? 1 : -1;
    for (let j = -3; j <= 3; j++) { const xx = x - Math.round(Math.abs(j) * 0.6) + (j === 0 ? 1 : 0), yy = y + j * s; put(xx, yy, Math.abs(j) < 2 ? Rr[0] : Rr[1]); put(xx - 1, yy, Math.abs(j) < 3 ? Rr[2] : Rr[3]); }
    return true;
  }

  return {
    name: '巫毒守卫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_EYE, M_LIQ, M_HOT, M_TIP], HIT_POINT: [0, -11], EVENTS,
    deathKit: { mode: 'chunks', at: T_CRUMBLE },
    SFX: { body: 'armor', how: 'shatter', pal: 'poison', style: 'blade', w: 0.45, hover: 1 },
    REVIVE: { dy: -12, ramp: FXI.poison },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
