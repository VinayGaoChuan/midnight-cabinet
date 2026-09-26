// 蛙人（衍生单位 · 野兽 · 射手 · 普通 · 远程 600）：女巫「召唤蛙人」召出的小徒弟蛙——蹲伏的嫩黄绿小蛙、宽扁蛙头 + 头顶一只金色大眼、
//   缩小版的女巫歪尖帽（紫帽 + 荧绿帽带，帽尖折向后）、双手端一支比身体还长的芦苇吹箭筒（筒口一滴毒液为发光体）、身后两条膝盖高过背的折叠大后腿。
// 攻击 = 鼓腮一吹，射出一根带毒小刺；技能（无特性，表现「高伤害」）= 鼓足一大口气连吹三根毒刺，第三根让目标中毒冒绿泡，收招打个嗝「呱」。
// 待机个性 = 舌头弹出抓飞虫、闭眼吞咽、慢慢眨眼；步态 = 蛙跳（蹲 → 蹬 → 腾空 → 收腿落地溅泥点）；死亡 = 弹飞化泥（击飞摔落、小帽弹开、摊成一滩绿泥冒泡蒸发）。
// 骨架：parts.rig child 改（只用来给 parts.arm 当落笔框），手臂用 parts.arm（tight 细臂）+ parts.hand；躯干、蛙头、喉囊、折叠后腿、小尖帽、舌、吹箭筒、泥滩是本模块的部件。
PCD.define('Froggo', (E) => {
  const { parts, Sprite, begin, part, sp, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_PHYS, K_SPIRAL, K_SPIRAL_PT, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, hash } = E;
  const RD = Math.round;

  // ───── 元素：毒刺 · 沼泽毒绿（FXI.poison：21 白 → 50 淡黄绿 → 49 黄绿 → 48 墨绿 → 34 深绿），与召唤者女巫同色阶 ─────
  const R_EL = FXI.poison, EL = FXR[R_EL];
  const R_MUD = E.fxRamp('froggoMud', [38, 37, 36, 35, 34]);   // 绿泥点（共享色板的绿色阶）

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: [48, 36, 37, 38], wart: { r: [48, 49, 50, 38], flat: 1 }, belly: 'sand', hat: 'purple', band: [48, 49, 50, 38],
    reed: 'sand', node: 'wood', eye: { r: [20, 19, 14, 5], flat: 1 }, ink: { r: 'ink', flat: 1 }, tongue: 'pink',
    drop: { r: [48, 50, 38, 21], flat: 1 },                                                  // 筒口毒滴（发光体）：暗 50 · 亮 38 · 白 21
  });
  const BODY = { body: 'child', leg: 3, torso: 5, head: 5, headW: 7, sw: 3, arm: 7, limb: 0.6 };
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(64, 40, 30, 36);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['reed', 'node', 'drop', 'eye', 'ink', 'tongue', 'band', 'wart']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势 ─────
  // bx 平移 · lift 离地 · lean 上身前后 −1..1 · ub 呼吸下沉 · sq 压扁 0–2 · leg 后腿 0 折叠 / 1 蹬地 / 2 伸直拖后 / 3 收腿落地 · pipe 吹筒 0 腰前斜放 / 1 举到嘴前放平 / 2 上扬（受击）/ 3 脱手
  // sac 喉囊 + 两腮 0–4（4 = 技能鼓足一大口气） · jaw 张嘴 · eyes 0 睁 / 1 闭 / 2 半眯 · tongue 0 / 1 弹出 / 2 伸满（卷住飞虫）/ 3 收回 · glow 毒滴 0–4 · bend 帽尖 −1..2
  // arms 1 = 四肢张开（被击飞）· hatOff 帽子脱落 + hatX / hatY · pipeY 掉落的吹筒离地高 +1（0 = 还在手里）· pud 化泥 0–4 · bub 泥泡相位
  const P = { bx: 0, lift: 0, lean: 0, ub: 0, sq: 0, leg: 0, pipe: 0, sac: 0, jaw: 0, eyes: 0, tongue: 0, glow: 0, rim: 1, flash: 0, bend: 0,
    arms: 0, hatOff: 0, hatX: 0, hatY: 0, pipeY: 0, pud: 0, bub: 0, dq: 0, st: 0, gx: 0, gy: 0, mx: 0, flip: 0, k1: 0, k2: 0 };
  const KEY1 = parts.keyer([['bx', -16, 15], ['lift', 0, 8], ['lean', -1, 1], ['ub', 0, 1], ['sq', 0, 2], ['leg', 0, 3], ['pipe', 0, 3], ['sac', 0, 4], ['jaw', 0, 1], ['eyes', 0, 2], ['tongue', 0, 3]]);
  const KEY2 = parts.keyer([['glow', 0, 4], ['rim', 0, 3], ['flash', 0, 1], ['bend', -1, 2], ['arms', 0, 1], ['hatOff', 0, 1], ['hatX', -16, 4], ['hatY', 0, 24], ['pipeY', 0, 12],
    ['pud', 0, 4], ['bub', 0, 3], ['dq', 0, 48, 48], ['st', 0, 8]]);
  const T_BLOW = 2 / 12, T_D2 = 2 / 12, T_D3 = 4 / 12, T_BURP = 0.25, T_LAND = 0.66;
  // 待机个性（1.6–2.0 s，5 帧）：[tongue, jaw, sac, eyes]
  const CATCH = [[1, 1, 0, 0], [2, 1, 0, 0], [3, 1, 0, 0], [0, 0, 2, 1], [0, 0, 1, 2]];

  function reset() {
    P.bx = 0; P.lift = 0; P.lean = 0; P.ub = 0; P.sq = 0; P.leg = 0; P.pipe = 0; P.sac = 0; P.jaw = 0; P.eyes = 0; P.tongue = 0; P.glow = 0; P.rim = 1; P.flash = 0; P.bend = 0;
    P.arms = 0; P.hatOff = 0; P.hatX = 0; P.hatY = 0; P.pipeY = 0; P.pud = 0; P.bub = 0; P.dq = 0; P.mx = 0; P.flip = 0;
  }
  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6);
    P.ub = b & 1; P.sac = (b + 1) & 1; P.bend = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0 - 1e-6) { const c = CATCH[Math.min(4, f12of(lp - 1.6))]; P.tongue = c[0]; P.jaw = c[1]; P.sac = Math.max(P.sac, c[2]); P.eyes = c[3]; }
    if (lp >= 0.8 - 1e-6 && lp < 0.9) P.glow = 1;                                               // 毒滴偶尔亮一下
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); reset(); P.st = st;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                     // 蛙跳：蹲（落地）→ 蹬 → 腾空 → 收腿
      const f = gait(tq);
      P.leg = f; P.lift = [0, 2, 5, 2][f]; P.sq = f === 0 ? 1 : 0; P.ub = f === 0 ? 1 : 0; P.lean = [0, 1, 1, 0][f]; P.bend = [0, 1, 2, 1][f]; P.sac = f === 0 ? 1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 1 / 12) { P.sac = 1; P.glow = 1; P.lean = -1; }                                   // 吸气
      else if (tq < T_BLOW) { P.pipe = 1; P.sac = 2; P.lean = -1; P.glow = 1; P.bend = -1; }     // 举筒到嘴前，两腮鼓起
      else if (tq < 0.25) { P.pipe = 1; P.bx = -1; P.glow = 3; P.rim = 2; P.bend = 2; }          // 噗：腮一瘪，后坐 1 格
      else if (tq < 0.45) { P.pipe = 1; P.glow = 1; P.bend = 1; }
      else { P.pipe = tq < 0.6 ? 1 : 0; P.sac = 1; }
    } else if (st === CHARGE) {                                                                 // 鼓足一大口气：两腮 + 喉囊逐档胀到最大，眯眼瞄准
      P.pipe = tq < 1 / 12 ? 0 : 1; P.sac = tq < 0.25 ? 1 : tq < 0.5 ? 2 : tq < 0.85 ? 3 : 4; P.lean = tq >= 0.35 ? -1 : 0; P.eyes = tq >= 0.6 ? 2 : 0;
      P.glow = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.bend = tq > 1.1 ? ((f12 & 1) ? 1 : 0) : -1; P.ub = tq > 1.1 && (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                                                   // 噗、噗、噗：喉囊鼓足到第三根才瘪；每吹一根整身后坐 1 格 + 上身后仰，下一帧弹回（前后交替）
      const f = Math.min(5, f12of(tq)), shot = (f & 1) === 0; P.pipe = 1; P.eyes = 2; P.rim = 3;
      P.bx = shot ? -1 : 0; P.lean = shot ? -1 : 0; P.sac = f < 4 ? 4 : f === 4 ? 2 : 1; P.glow = shot ? 3 : 2; P.bend = [2, 0, 1, -1, 2, 1][f];
    } else if (st === RECOVER) {                                                                // 两腮瘪下，打个嗝「呱」，吹筒放回腰前
      const q = ease.inOut(clamp01(tq / 0.6)); P.pipe = tq < 0.35 ? 1 : 0; P.glow = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.bx = tq < 0.2 ? -1 : 0;
      if (tq >= T_BURP - 1e-6 && tq < 0.42) { P.jaw = 1; P.sac = 1; P.eyes = 1; P.bend = 1; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else if (h < 0.2) { P.bx = -2; P.eyes = 1; P.pipe = 2; P.bend = 2; P.lean = -1; P.sac = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { P.bx = -1; P.eyes = 1; P.pipe = 2; P.bend = -1; P.rim = 0; }
      else idle(tq, f12);
    } else if (st === DEATH) {                                                                  // 弹飞化泥
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(tq, f12); P.rim = 1; }
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.pipe = 2; P.bend = 2; P.lean = -1; P.leg = 1; P.sac = 1; P.flash = d < 1 / 12 ? 1 : 0; P.glow = (f12 & 1) ? 1 : 4; }
      else {
        P.eyes = 1; P.glow = 4; P.pipe = 3;
        if (d < T_LAND) {                                                                       // 击飞：四肢张开，离地 3 → 6 → 3 → 1
          P.arms = 1; P.leg = 2; P.jaw = 1; P.bend = 2; P.lean = -1;
          P.lift = d < 0.4 ? 3 : d < 0.5 ? 6 : d < 0.58 ? 3 : 1; P.bx = d < 0.4 ? -3 : d < 0.5 ? -4 : -5;
        } else {                                                                                // 落地压扁 → 摊成一滩绿泥
          P.bx = -5; P.pud = d < 0.75 ? 1 : d < 0.84 ? 2 : d < 1.0 ? 3 : 4;
          if (P.pud === 1) { P.sq = 2; P.leg = 2; P.arms = 1; }
          if (d >= 0.84) P.bub = Math.floor(d * 6 + 1e-6) & 3;
        }
        const pq = clamp01((d - 0.3) / 0.25); P.pipeY = d < 0.55 ? 1 + RD(9 * (1 - pq * pq)) : 1;   // 吹筒脱手落地
        if (d >= 0.4 - 1e-6) {                                                                  // 小帽弹开：往后抛，落在身后
          P.hatOff = 1; const hq = clamp01((d - 0.4) / 0.35);
          P.hatX = RD(-3 - 9 * hq); P.hatY = d < 0.75 ? RD(17 + 8 * Math.sin(hq * Math.PI) - 17 * hq) : 0;
        }
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ub = 0; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.glow = tq > 0.85 ? 2 : 0; }
    const g = focusLocal(); P.gx = g[0] + P.bx; P.gy = g[1] - P.lift;
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 几何（本地坐标：脚底为原点、面朝右、y 向上为负）─────
  const PIPE_L = 19;
  const KY = [1, 0.85, 0.6];
  const headTop = () => -14 + P.ub;                                                             // 头顶行
  const headL = () => P.lean;                                                                  // 头的列偏移
  // 吹筒：后端 (x, y)、逐格方向 → 第 k 格的位置
  function pipeAt(k) {
    const L = headL(), ht = headTop();
    if (P.pipe === 1) return [L + 4 + k, ht + 3];                                               // 嘴前放平
    if (P.pipe === 2) return [1 + L + k, -8 + P.ub - Math.floor(k / 2)];                         // 上扬 1:2
    if (P.pipe === 3) return [3 + k, -(P.pipeY - 1)];                                           // 脱手：平躺 / 下落
    return [0 + L + k, -8 + P.ub + Math.floor(k / 3)];                                          // 腰前斜放 1:3
  }
  function focusLocal() {
    if (P.pud >= 2 || (P.st === DEATH && P.pipe === 3)) { const p = pipeAt(PIPE_L); return [p[0], p[1]]; }
    const p = pipeAt(PIPE_L); return [p[0], sqY(p[1])];
  }
  const sqY = (y) => (P.sq ? RD(y * KY[P.sq]) : y);
  // 带压扁的落笔（不画进地面以下）
  function S(x, y, m, t) { y = sqY(y); if (y > 0) return; sp(RD(x), y, m, t || 0); }
  function row(y, x0, x1, m, t) { for (let x = RD(x0); x <= RD(x1); x++) S(x, y, m, t); }
  function disc(x, y, r, m, t) { const K = Math.ceil(r); for (let j = -K; j <= K; j++) for (let i = -K; i <= K; i++) if (i * i + j * j <= r * r + 0.35) S(RD(x) + i, RD(y) + j, m, t); }
  function stroke(x0, y0, x1, y1, r0, r1, m, t) { const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5)); for (let s = 0; s <= n; s++) { const q = s / n; disc(x0 + (x1 - x0) * q, y0 + (y1 - y0) * q, r0 + (r1 - r0) * q, m, t); } }

  // ───── 画（部件从后往前）─────
  // 候选部件：frogLeg —— 折叠的蛙后腿：粗大腿（胯 → 膝尖）+ 细小腿（膝 → 踝）+ 贴地长蹼足（趾缝暗格、趾尖分叉）；
  //   state 0 折叠（膝尖高过背）· 1 蹬地（脚往后下蹬）· 2 伸直拖在身后 · 3 收腿（脚收到身下准备落地）；far = 远侧（错开 +2, −1，暗一级）
  const LEGS = [
    { k: [-7, -11], a: [-8, -1], f: [[-9, 0], [-3, 0]] },
    { k: [-7, -6], a: [-10, -2], f: [[-11, -1], [-15, 0]] },
    { k: [-8, -4], a: [-12, -3], f: [[-13, -3], [-17, -3]] },
    { k: [-6, -10], a: [-6, -2], f: [[-7, -1], [-1, -1]] },
  ];
  // 折叠态（leg 0，待机 / 攻击 / 技能 / 受击 / 落地）逐行画：近侧 = 粗大腿（臀 → 斜后上 → 膝尖 2 格宽，高出头顶 4 格）+ 2 格宽小腿（膝尖 → 斜前下 → 脚跟）
  //   + 贴地长蹼足；大腿与小腿之间留一个 1 → 3 格宽的三角空隙（剪影里是一个洞）。远侧 = 前移 5 格的实心暗楔形，只露出第二个膝尖
  const FOLD_T = [[-18, -13, -12], [-17, -14, -12], [-16, -14, -11], [-15, -14, -12], [-14, -14, -12], [-13, -14, -12], [-12, -14, -12], [-11, -14, -12], [-10, -15, -12],
    [-9, -15, -12], [-8, -15, -12], [-7, -15, -12], [-6, -15, -11], [-5, -14, -9], [-4, -14, -7], [-3, -13, -5], [-2, -12, -5], [-1, -11, -6]];
  const FOLD_S = [[-15, -10], [-14, -9], [-13, -8], [-12, -8], [-11, -7], [-10, -7], [-9, -7], [-8, -6], [-7, -6], [-6, -6], [-5, -5], [-4, -5], [-3, -4], [-2, -4], [-1, -4]];
  const FOLD_F = [[-17, -7, -6], [-16, -8, -5], [-15, -8, -4], [-14, -8, -2], [-13, -6, 0], [-12, -6, 0], [-11, -5, 0], [-10, -5, 0], [-9, -4, 0], [-8, -4, 0], [-7, -4, 0],
    [-6, -4, 0], [-5, -4, 0], [-4, -4, 0]];
  function foldLeg(far) {
    part();
    if (far) { for (const [y, a, b] of FOLD_F) row(y, a, b, M.skinD, 0); S(-7, -17, M.skinD, 4); return; }
    for (const [y, a, b] of FOLD_T) row(y, a, b, M.skin, 0);
    for (const [y, a] of FOLD_S) { S(a, y, M.skin, 0); S(a + 1, y, M.skin, y >= -14 && y <= -7 ? 2 : 0); }
    S(-13, -18, M.skin, 4); S(-12, -18, M.skin, 4); S(-14, -16, M.skin, 4); S(-14, -12, M.wart, 3); S(-13, -8, M.wart, 4);   // 膝尖高光 · 大腿疣点
    for (let x = -7; x <= 1; x++) S(x, 0, M.skin, x > -4 && (x & 1) === 0 ? 2 : 0);                                      // 蹼足（趾缝暗格）
    S(2, -1, M.skin, 0); S(2, 0, M.skin, 3);                                                                               // 趾尖分叉
  }
  function frogLeg(far) {
    if (P.leg === 0) return foldLeg(far);
    part();
    const G = LEGS[P.leg], ox = far ? 2 : 0, oy = far ? -1 : 0, m = far ? M.skinD : M.skin, hx = -3 + ox, hy = -3 + oy;
    const kx = G.k[0] + ox, ky = G.k[1] + oy, ax = G.a[0] + ox, ay = G.a[1] + oy;
    stroke(hx, hy, kx, ky, 1.5, 1.1, m, 0);                                                     // 大腿
    stroke(kx, ky, ax, ay, 0.8, 0.6, m, 0);                                                     // 小腿
    const [f0, f1] = G.f, fx0 = f0[0] + ox, fy0 = f0[1] + oy, fx1 = f1[0] + ox, fy1 = f1[1] + oy, n = Math.max(Math.abs(fx1 - fx0), Math.abs(fy1 - fy0));
    for (let k = 0; k <= n; k++) { const x = fx0 + (fx1 - fx0) * k / n, y = fy0 + (fy1 - fy0) * k / n; S(x, y, m, k > 1 && (k & 1) === 0 ? 2 : 0); }   // 蹼足（趾缝暗格）
    const dir = Math.sign(fx1 - fx0) || 1; S(fx1 + dir, fy1 - 1, m, 0); S(fx1 + dir, fy1, m, 3);                                         // 趾尖分叉
    if (!far) S(kx - 1, ky - 1, m, 4);                                                          // 膝尖高光
  }
  // 候选部件：frogTorso —— 梨形蹲坐躯干（臀部贴地、肩窄）：奶白肚皮 2 列、背上疣点；ub 呼吸时上半身下沉 1 格、lean 上身前后 1 格
  const TOR = [[-9, -2, 2], [-8, -3, 3], [-7, -3, 3], [-6, -4, 3], [-5, -4, 3], [-4, -5, 3], [-3, -5, 3], [-2, -5, 2], [-1, -5, 1], [0, -4, 0]];
  function frogTorso() {
    part();
    for (const [y, a, b] of TOR) { const up = y <= -5, yy = y + (up ? P.ub : 0), dx = y <= -6 ? P.lean : 0; row(yy, a + dx, b + dx, M.skin, 0); }
    for (const [y, a, b] of TOR) {                                                              // 肚皮
      if (y < -8 || y > -1) continue; const up = y <= -5, yy = y + (up ? P.ub : 0), dx = y <= -6 ? P.lean : 0;
      S(b + dx, yy, M.belly, 0); S(b - 1 + dx, yy, M.belly, y === -7 ? 4 : 0); if (y >= -3) S(b - 2 + dx, yy, M.belly, 0);
    }
    S(-3 + P.lean, -7 + P.ub, M.wart, 3); S(-4, -4 + P.ub, M.wart, 4); S(-2 + P.lean, -6 + P.ub, M.wart, 3); S(-4, -2, M.wart, 3);   // 疣点
  }
  // 候选部件：frogHead —— 宽扁蛙头（8 宽 5 高、平顶、吻前突）：头顶前方鼓出一只金色大眼（横瞳、眼睑高光）、远眼鼓包、吻端鼻孔、通宽嘴线（嘴角下弯）、疣点；
  //   sac ≥ 2 两腮往后鼓出 1–2 格；jaw 1 = 张嘴（露出粉色口腔、下颚掉 1 行）
  function frogHead() {
    part();
    const L = headL(), ht = headTop();
    row(ht, L - 1, L + 5, M.skin, 0); row(ht + 1, L - 2, L + 5, M.skin, 0); row(ht + 2, L - 3, L + 5, M.skin, 0); row(ht + 3, L - 3, L + 5, M.skin, 0); row(ht + 4, L - 3, L + 4, M.skin, 0);
    if (P.sac >= 2) { S(L - 4, ht + 2, M.skin, 0); S(L - 4, ht + 3, M.skin, 0); }             // 两腮往后鼓
    if (P.sac >= 3) { S(L - 5, ht + 3, M.skin, 0); S(L - 4, ht + 4, M.skin, 0); S(L - 3, ht + 5, M.skin, 0); }
    if (P.sac >= 4) { S(L - 5, ht + 2, M.skin, 0); S(L - 5, ht + 4, M.skin, 0); S(L - 4, ht + 1, M.skin, 4); }
    S(L - 3, ht - 1, M.skin, 4); S(L - 3, ht, M.skin, 0); S(L - 2, ht, M.skin, 2);             // 远眼鼓包（帽檐后面鼓出 1 格）
    row(ht - 1, L + 3, L + 5, M.skin, 0); S(L + 4, ht - 2, M.skin, 4); S(L + 5, ht - 2, M.skin, 0);   // 近眼眼包（帽檐前面鼓出头顶）
    if (P.eyes === 1) row(ht, L + 3, L + 5, M.skin, 2);
    else if (P.eyes === 2) { S(L + 3, ht, M.skin, 2); S(L + 4, ht, M.ink, 1); S(L + 5, ht, M.eye, 3); }
    else { S(L + 3, ht, M.eye, 3); S(L + 4, ht, M.ink, 1); S(L + 5, ht, M.eye, 4); }
    S(L + 5, ht + 1, M.skin, 2);                                                                // 鼻孔
    if (P.jaw) { row(ht + 3, L, L + 5, M.ink, 1); row(ht + 4, L + 1, L + 4, M.tongue, 0); row(ht + 5, L, L + 4, M.skin, 0); row(ht + 3, L - 2, L - 1, M.skin, 1); S(L - 3, ht + 4, M.skin, 1); }
    else { row(ht + 3, L - 2, L + 5, M.skin, 1); S(L - 3, ht + 4, M.skin, 1); }                 // 嘴线一直拉到后颊，嘴角下弯
    S(L - 1, ht + 1, M.wart, 3); S(L, ht, M.wart, 4); S(L - 2, ht + 2, M.wart, 3); S(L + 1, ht + 1, M.wart, 3);   // 疣点
  }
  // 候选部件：throatSac（小号，同女巫）—— 下巴下的奶白喉囊：sac 0 一行 → 3 胀大（往前下鼓出 2 格）→ 4 鼓足一大口气（5 行、往前再鼓 2 格），左上 1 格高光
  const SAC = [[[1, 3]], [[0, 3], [1, 3]], [[0, 4], [0, 4], [1, 3]], [[-1, 5], [-1, 6], [0, 5], [1, 4]], [[-2, 6], [-2, 8], [-2, 8], [-1, 7], [1, 5]]];
  function throatSac() {
    part();
    const L = headL(), y0 = headTop() + 5 + (P.jaw ? 1 : 0), rows = SAC[P.sac];
    rows.forEach(([a, b], j) => row(y0 + j, L + a, L + b, M.belly, 0));
    S(L + rows[0][0] + 1, y0, M.belly, 4);
  }
  // 候选部件：miniWitchHat —— 缩小版的女巫歪尖帽：6 格帽檐（坐在两只眼包之间） + 荧绿帽带（2 格亮点）+ 后倾逐行收窄的帽身 + 帽尖折向后下垂（bend −1..2）
  function miniWitchHat(cx, by) {
    part();
    row(by, cx - 3, cx + 2, M.hat, 0); S(cx + 2, by, M.hat, 4); S(cx - 3, by + (P.bend >= 2 ? 1 : 0), M.hat, 2);
    row(by - 1, cx - 2, cx + 1, M.band, 0); S(cx - 1, by - 1, M.band, 4); S(cx + 1, by - 1, M.band, 4);
    row(by - 2, cx - 2, cx + 1, M.hat, 0); row(by - 3, cx - 2, cx, M.hat, 0); row(by - 4, cx - 3, cx - 1, M.hat, 0); row(by - 5, cx - 3, cx - 2, M.hat, 0);
    S(cx - 1, by - 3, M.hat, 2);
    const b = P.bend;                                                                           // 帽尖往后折、下垂
    S(cx - 4, by - 5 + (b >= 1 ? 1 : 0) - (b < 0 ? 1 : 0), M.hat, 0); S(cx - 5, by - 4 + (b >= 1 ? 1 : 0) - (b < 0 ? 1 : 0), M.hat, 3);
    if (b >= 2) S(cx - 5, by - 2, M.hat, 3);
  }
  // 候选部件：frogTongue —— 粉色长舌：从吻端斜向前上弹出（1 半伸 · 2 伸满，尖端卷着一只飞虫 · 3 收回），舌尖 1 格亮
  const TONGUE = [0, 3, 6, 2];
  function frogTongue() {
    if (!P.tongue) return; part();
    const L = headL(), ht = headTop(), n = TONGUE[P.tongue]; let x = L + 5, y = ht + 3;
    for (let k = 1; k <= n; k++) { x += 1; if (k & 1) y -= 1; S(x, y, M.tongue, k === n ? 4 : 0); }
    if (P.tongue >= 2) { S(x + 1, y - 1, M.ink, 1); S(x + 1, y - 2, M.reed, 4); }                // 飞虫：黑身 + 亮翅
  }
  // 候选部件：blowgun —— 芦苇吹箭筒：1 格粗芦苇，每 4 格一个木色竹节，后端吹口、前端筒口箍（上下各多 1 格），筒口一滴毒液（发光体，同一个部件；glow 0–4 档）
  const DROP = [[2, 0], [3, 0], [3, 1], [4, 2], [1, 0]];                                        // [芯色调, 2 格大小 0/1/2]
  function blowgun() {
    part();
    for (let k = 0; k < PIPE_L; k++) { const [x, y] = pipeAt(k), node = k === 0 || (k % 4) === 3; S(x, y, node ? M.node : M.reed, node ? 0 : ((k % 4) === 1 ? 4 : 0)); }
    const [x0, y0] = pipeAt(0), [x1, y1] = pipeAt(PIPE_L - 1); S(x0, y0 - 1, M.node, 3); S(x1, y1 - 1, M.node, 3); S(x1, y1 + 1, M.node, 2);
    const [dx, dy] = pipeAt(PIPE_L), d = DROP[P.glow];
    S(dx, dy, M.drop, d[0]);
    if (d[1] >= 1) S(dx, dy + 1, M.drop, 2);
    if (d[1] >= 2) { S(dx + 1, dy, M.drop, 3); S(dx, dy - 1, M.drop, 3); }
  }
  // 化泥（贴地，不压扁）：pud 2 融化的圆丘（两只眼还在）· 3 一滩 · 4 摊平的薄泥，bub 冒泡相位
  const PUD = [0, 0, [[0, -6, 6], [-1, -5, 5], [-2, -4, 4], [-3, -2, 3]], [[0, -8, 8], [-1, -7, 6], [-2, -4, 3]], [[0, -10, 9], [-1, -8, 7]]];
  function mudPool() {
    part();
    const R = PUD[P.pud], cx = -2;
    for (const [y, a, b] of R) for (let x = cx + a; x <= cx + b; x++) sp(x, y, M.skin, y === 0 && ((x + 40) % 3) === 0 ? 2 : 0);
    const top = R[R.length - 1][0] - (P.pud === 4 ? 0 : 1), ex = cx + (P.pud === 2 ? 2 : P.pud === 3 ? 1 : 0);
    if (P.pud <= 3) { sp(ex, top, M.skin, 0); sp(ex + 1, top, M.eye, 3); sp(ex - 2, top + (P.pud === 3 ? 1 : 0), M.skin, 2); }   // 金眼浮在泥上
    sp(cx - 3, R[0][0], M.wart, 3); sp(cx + 4, R[0][0], M.wart, 3); sp(cx, R[Math.min(1, R.length - 1)][0], M.wart, 4);
    if (P.pud >= 3) { const b = P.bub; sp(cx - 5 + b * 2, R[1][0] - (b & 1), M.drop, (b & 1) ? 3 : 2); if (b === 2) sp(cx + 5, -2, M.drop, 3); }
  }
  function drawHero() {
    begin(hero, P.bx, -P.lift);
    const R = parts.rig({}, BODY);
    const L = headL(), ub = P.ub, sF = [2 + L, -8 + ub], sB = [0 + L, -8 + ub];
    const inHand = P.pipe !== 3, hN = inHand ? pipeAt(5) : P.arms ? [5 + L, -14] : [3 + L, -5], hF = inHand ? pipeAt(2) : P.arms ? [-2 + L, -14] : [1 + L, -6];
    const yH = (p) => [p[0], sqY(p[1])];
    if (P.pud >= 2) mudPool();
    else {
      frogLeg(1);
      parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.skinD, grip: 'none', from: yH(sB), at: yH(hF) });
      frogTorso();
      frogLeg(0);
      frogHead();
      throatSac();
    }
    if (!P.hatOff) miniWitchHat(headL() + 1, headTop() - 1);
    if (P.pud < 2) frogTongue();
    blowgun();
    if (P.pud < 2) {
      parts.hand(E, R, P, { at: yH(hF), hand: M.skinD, grip: 'fist' });
      parts.arm(E, R, P, { side: 'F', sleeve: 'tight', mat: M.skin, grip: 'none', from: yH(sF), at: yH(hN) });
      parts.hand(E, R, P, { at: yH(hN), hand: M.skin, grip: 'fist' });
    }
    if (P.hatOff) { const sq = P.sq; P.sq = 0; miniWitchHat(P.hatX, -P.hatY); P.sq = sq; }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let mzT = 9, mzX = 0, mzY = 0, mzBig = 0, chargeAcc = 0, soulAcc = 0, lastF = -1, darts = 0, lastLp = 0;
  const muzzle = () => [scrX(P.gx), HY + P.gy];
  const DART_V = 300;
  function fire(k) {
    poseAt(E.state, E.stT, E.simT); const [gx, gy] = muzzle();
    shoot(k, gx + 1, gy, DART_V, DUMMY_X - 3, R_EL, 0, { trail: { every: 2, life: [0.08, 0.16], back: [6, 14], off: 3 }, glow: 3 });
    mzT = 0; mzX = gx; mzY = gy; mzBig = k === 2 ? 1 : 0; burst(gx, gy, k === 2 ? 6 : 4, 20, 50, 0.12, 0.25, R_EL, 2);
    sfx('shoot', { proj: 'arrow' });
  }
  function onEnter(s) {
    if (s === CAST) {                                                                           // 第一根：蓄力粒子外爆 + 冲击环 + 震屏 + 闪白
      darts = 0; const [gx, gy] = muzzle();
      releaseOrbit(30, 70, 0.25, 0.5); ring(gx + 2, gy, 0, R_EL); shake(0.28, 2); flash(0.05); fire(2); sfx('swing', { kind: 'bow', w: 0.15 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BLOW) { fire(1); sfx('swing', { kind: 'bow', w: 0.15 }); }
    if (s === CAST && (t === T_D2 || t === T_D3)) fire(2);
    if (s === RECOVER && t === T_BURP) {                                                        // 打嗝「呱」：嘴边冒 3 个绿泡
      const L = headL(); for (let i = 0; i < 3; i++) spawn(K_EMBER, scrX(L + 6 + P.bx) + i, HY + headTop() + 3, 4 + Math.random() * 6, -9 - Math.random() * 8, 0.5 + Math.random() * 0.3, R_EL);
    }
    if (s === DEATH && t === INCOMING + T_LAND) {                                               // 摔落：泥点四溅
      for (let i = 0; i < 12; i++) spawnX(K_PHYS, HX - 7 + (Math.random() - 0.5) * 12, HY - 2, (Math.random() - 0.5) * 60, -25 - Math.random() * 40, 0.55, R_MUD, { g: 220, floor: HY });
      for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 7 + (Math.random() - 0.5) * 14, HY, (Math.random() - 0.5) * 20, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.15 });
    }
  }
  const EVENTS = [[], [], [T_BLOW], [], [T_D2, T_D3], [T_BURP], [], [INCOMING + T_LAND], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 30, 80, 0.15, 0.35, R_EL, 8); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.15 }); }
    else if (k === 2) {                                                                         // 每根一次小绿泡外爆；第三根目标中毒
      darts++; burst(x, y, 12, 30, 90, 0.2, 0.45, R_EL, 14);
      for (let i = 0; i < 3; i++) spawn(K_RISE, x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, -10 - Math.random() * 10, 0.4 + Math.random() * 0.3, R_EL);
      hitDummy(darts >= 3 ? 1 : 0); sfx('impact', { pal: 'poison', w: darts >= 3 ? 0.5 : 0.25 });
      if (darts >= 3) { dummyFx({ dur: 1.6, tint: 'poison' }); fx.cloud(x, y - 2, 7, R_EL, 1.2, 2); fx.cross(x, y, 4, R_EL, 0.2, 2); ring(x, y, 0, R_EL); shake(0.12, 1); }
    }
  }
  function stepFX(dt, state, stT) {
    const [gx, gy] = muzzle();
    if (state === CHARGE) {                                                                     // 绿色毒滴螺旋汇聚到筒口
      chargeAcc += dt * (18 + 24 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 7; spawnX(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, { a: Math.random() * 6.2832, r, w: 5, orbitR: 2 }); }
      if (Math.random() < dt * 6) spawnX(K_PHYS, gx, gy + 1, (Math.random() - 0.5) * 6, 5, 0.35, R_EL, { g: 120, floor: HY });   // 毒滴从筒口垂落
    }
    if (state === MOVE) {
      const f = gait(q12(stT));
      if (f !== lastF) { if (f === 0) { sfx('step', { w: 0.15 }); spawnX(K_PHYS, scrX(-6), HY - 1, P.flip ? 18 : -18, -26, 0.45, R_MUD, { g: 200, floor: HY }); } lastF = f; }   // 落地溅 1 颗泥点
    }
    if (state === IDLE) { const lp = stT % DUR[IDLE]; if (lastLp < 1.85 && lp >= 1.85) spawn(K_EMBER, scrX(headL() + 3 + P.bx), HY + headTop() + 6, 0, -4, 0.3, R_EL); lastLp = lp; }
    if (state === DEATH && stT > INCOMING + 0.84 && stT < INCOMING + 2.4) {                   // 泥滩冒泡蒸发
      soulAcc += dt * (stT > INCOMING + 1.6 ? 24 : 7);
      while (soulAcc >= 1) { soulAcc -= 1; const late = stT > INCOMING + 1.6; spawn(K_RISE, HX - 7 + (Math.random() - 0.5) * 18, HY - 1 - Math.random() * 2, (Math.random() - 0.5) * 6, -8 - Math.random() * 14, 0.6 + Math.random() * 0.7, late && Math.random() < 0.5 ? FXI.soul : R_EL); }
    }
    mzT += dt;
  }
  function fxReset() { mzT = 9; mzBig = 0; chargeAcc = 0; soulAcc = 0; lastF = -1; darts = 0; lastLp = 0; }
  function fxBack(f12) { if (P.pipe !== 3) dotGlow(scrX(P.gx), P.rim, f12); shotFloorGlow(f12); }
  // 地面映光：隔点（施放档也不连成实线），近处淡黄绿、外圈墨绿
  function dotGlow(gx, rim, f12) {
    if (rim < 2) return; const span = rim === 3 ? 11 : 7;
    for (let x = gx - span; x <= gx + span; x++) { if (((x + f12) & 1) !== 0) continue; const d = Math.abs(x - gx); put(x, HY + 1, rim === 3 && d < 4 ? EL[1] : d < span * 0.5 ? EL[2] : EL[3]); }
  }
  function fxFront(f12) {
    const st = E.state;
    if (st === IDLE) {                                                                          // 待机：一只飞虫绕着头前飞，1.6 s 被舌头卷走
      const lp = E.stT % DUR[IDLE];
      if (lp >= 0.7 && lp < 1.6) {
        const tx = scrX(headL() + 12), ty = HY - 17, k = Math.floor(E.stT * 12 + 1e-6), q = clamp01((lp - 0.7) / 0.9);
        const x = RD(tx + (1 - q) * (4 * Math.sin(k * 0.9) + 3) ), y = RD(ty + (1 - q) * (2 * Math.cos(k * 1.3) - 2));
        put(x, y, 0); put(x, y - 1, (k & 1) ? 17 : 18);
      }
    }
    if (mzT < 2 / 12 && mzBig) {                                                                // 技能每根：2 帧十字枪口光——第 1 帧白芯、四向臂长 3（白 → 淡黄绿 → 黄绿），第 2 帧臂长 2
      const a = mzT < 1 / 12 ? 3 : 2, c0 = mzT < 1 / 12 ? EL[0] : EL[1];
      for (let r = 1; r <= a; r++) { const c = r === 1 ? c0 : r === 2 ? EL[1] : EL[2]; put(mzX + r, mzY, c); put(mzX, mzY - r, c); put(mzX, mzY + r, c); if (r < a) put(mzX - r, mzY, c); }
      if (a === 3) { put(mzX + 4, mzY, EL[2]); put(mzX + 1, mzY - 1, EL[2]); put(mzX + 1, mzY + 1, EL[2]); }
      put(mzX, mzY, c0);
    } else if (mzT < 2 / 12) {                                                                  // 普攻：小十字，前向 3 格，第 1 帧白芯
      const c = mzT < 1 / 12 ? EL[0] : EL[1];
      for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); if (r < 3) { put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } }
      put(mzX, mzY, EL[0]);
    }
    if (st === CHARGE && P.glow >= 2) { const [gx, gy] = muzzle(); for (let r = 2; r <= 3; r++) { put(gx + r, gy, EL[r === 2 ? 1 : 2]); put(gx, gy - r, EL[2]); put(gx, gy + r, EL[2]); } }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                                     // 毒刺：3 格细针（白尖 → 淡黄绿针身 → 墨绿针尾）
    if (k > 2) return false;
    put(x + 1, y, 21); put(x, y, Rr[1]); put(x - 1, y, Rr[2]); put(x - 2, y, Rr[3]);
    if (k === 2) put(x, y - 1, (f12 & 1) ? Rr[1] : Rr[2]);
    return true;
  }

  return {
    name: '蛙人', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.drop], HIT_POINT: [0, -9], EVENTS,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'poison', style: 'poison', w: 0.15 },
    REVIVE: { dy: -9, ramp: FXI.poison },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
