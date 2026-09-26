// 混沌豪猪（敌人 · 混沌 · 优质 · 远程）：圆滚滚的刺球四足。全身放射状黑褐长针（前短后长，最长 9 格，针尖赤红）把外轮廓撑成一个带尖的圆球，
// 腿只露出 2–3 格；尾端一簇粗针合成一根棒槌尾；小头埋在刺里：钝圆猪鼻、两颗下獠牙、额前三根特别长的「角针」向前伸出吻外 4 格。
// 攻击：身体一缩再猛一抖，从背上把 3 根针扇形抛出去（抛物线落在假人身上）。
// 技能「针雨」（没有特性，按描述「从背后射出针毛」做）：缩成刺球、针刺一根根竖直、针尖慢慢亮红、身体抖 1 格 →
// 针刺一齐射向天空（12 根短弹道往上抛），身上的针短一截 → 针雨从天而降落在假人周围（落地成尘），地上插满红针 0.6 s 后熄灭；假人闪白大摇。
// 死亡：针刺四散崩飞，落在地上；只剩一团光秃秃的小身子一截截瘪下去，趴平后消散。
PCD.define('ChaosPorcupine', (E) => {
  const { Sprite, begin, ease, clamp01, keys, q12, f12of, walkDemo, defMat, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, fall, bake } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, D2R = Math.PI / 180;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.enemy, EL = FXR[R_EL];                                                     // 混沌赤针 · 赤红：白 → 酒红亮 → 酒红 → 暗 → 深
  const m = B.mats(E, { main: [0, 27, 8, 20], limb: 'skinDark', muz: [20, 19, 16, 15], belly: [20, 19, 16, 15], nose: [0, 11, 12, 63],
    eye: [0, 0, 26, 58], claw: [0, 0, 27, 8], horn: 'bone' });
  const m2 = B.mats(E, { main: [20, 19, 16, 15], limb: 'skinDark', muz: [20, 19, 16, 15], belly: [20, 19, 16, 15], nose: [0, 11, 12, 63],
    eye: [0, 0, 26, 58], claw: [0, 0, 27, 8], horn: 'bone' });                                // 光秃秃的身子：针掉光后露出的灰粉肉皮
  const mLeg = B.mats(E, { main: [0, 20, 20, 19], claw: [0, 0, 27, 8] });                        // 短腿：黑褐，只露出 2–3 格
  const qA = defMat([0, 20, 19, 32], 1), qB = defMat([0, 27, 8, 9], 1);                          // 针刺：黑褐 / 墨黑相间
  const qAF = defMat([0, 0, 20, 19], 1), qBF = defMat([0, 0, 27, 8], 1);                          // 后层针：暗一级
  const tip = defMat('crimson', 1), tipF = defMat([11, 11, 12, 13], 1);                          // 针尖赤红
  const lit = defMat([13, 26, 58, 21], 1, 1), hot = defMat([26, 58, 21, 21], 1, 1);             // 蓄力亮起的针尖（发光体）
  const BASE = { len: 7, chest: 6, rump: 6, waist: 0, hump: 0, leg: 3, lw: 2, thigh: 2.4, farDx: -2, stride: 2, lift: 1, foot: 'claw',
    neck: 1.5, neckA: 0.25, neckW: 2.8, head: { type: 'boar', w: 6, h: 6, snout: 2.5, snH: 4, tip: 1, ear: 'round', earH: 2, tusk: 2 }, headA: 0.2,
    tail: 'none', mane: 'none', fur: 0, lieLegs: 0 };
  const o = Q.shape(Object.assign({}, BASE, { m }));
  const oLeg = Q.shape(Object.assign({}, BASE, { m: mLeg }));
  const OB = [Q.shape(Object.assign({}, BASE, { chest: 5.5, rump: 5.5, m: m2 })),               // 瘪下去的三档
    Q.shape(Object.assign({}, BASE, { chest: 4.6, rump: 4.6, len: 6.5, m: m2 })),
    Q.shape(Object.assign({}, BASE, { chest: 3.8, rump: 4, len: 6, m: m2 }))];

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(64, 44, 32, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'claw', 'nose', 'horn']) { RIM.skip[m[k]] = 1; RIM.skip[m2[k]] = 1; }
  RIM.skip[lit] = 1; RIM.skip[hot] = 1; RIM.skip[tip] = 1;

  // 本角色的姿势字段：qr 针刺档 0 伏倒 / 1 常态 / 2 竖起 / 3 射完变短 · qn 蓄力竖直亮起的针数（从尾到头）· qt 刺抖 · ql 针尖亮度 0 常 / 1 亮 / 2 爆亮
  //   bald 针掉光 · def 瘪下去的档（0–2，bald 时用）
  const NF = 14, NBK = 13;
  const EXTRA = [['qr', 0, 3], ['qn', 0, NF], ['qt', 0, 1], ['ql', 0, 2], ['bald', 0, 1], ['def', 0, 2]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.qr = 1; P.qn = 0; P.qt = 0; P.ql = 0; P.bald = 0; P.def = 0; }
  reset();
  const curO = () => (P.bald ? OB[P.def] : o);
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 放射刺球几何：球心在身体中心偏后上，针从身体里放射出来，针尖落在一个圆上（前上方短、背后长）；前层 12 根、后层 11 根错开半根 ─────
  const RB = [13, 11];                                                                     // 针尖圆半径：长短相间，外轮廓成一圈尖
  const fscale = (d) => (d < 60 ? 0.74 : d < 80 ? 0.74 + (d - 60) / 20 * 0.2 : d < 100 ? 0.94 + (d - 80) / 20 * 0.06 : 1);   // 越靠头越短
  const TILT = [0.5, 0.16, 0, 0.16], LSC = [0.72, 1, 1.08, 0.55];                             // 各档：往后倒伏的角度、长度倍数
  const FA = new Float32Array(NF), BA = new Float32Array(NBK);
  for (let i = 0; i < NF; i++) FA[i] = 46 + 13.5 * i;
  for (let i = 0; i < NBK; i++) BA[i] = 52.75 + 13.5 * i;
  const SF = new Float32Array(NF * 5), SK = new Float32Array(NBK * 5);                           // [根 x, 根 y, 方向 ux, uy, 总长]
  let CX = 0, CY = 0, RY = 6, BCX = 0, BCY = 0;
  function oneSpike(out, i, deg, rTip, lsc, tilt) {
    const a = deg * D2R, b = a + tilt, r0 = 4.5;
    out[i * 5] = BCX + Math.cos(a) * r0; out[i * 5 + 1] = BCY - Math.sin(a) * r0 * 0.8;
    out[i * 5 + 2] = Math.cos(b); out[i * 5 + 3] = -Math.sin(b); out[i * 5 + 4] = Math.max(3, (rTip * fscale(deg) - r0) * lsc + (lsc < 1 ? r0 * (1 - lsc) * 0.5 : 0));
  }
  const erect = (i) => NF - 1 - i < P.qn;                                                      // 蓄力：从尾到头一根根竖直
  function spikeGeom(rg) {
    CX = (rg.C1.x + rg.C2.x) / 2 - 0.5; CY = (rg.C1.y + rg.C2.y) / 2 + 0.5; RY = (rg.C1.r + rg.C2.r) / 2; BCX = CX - 1.5; BCY = CY - 1;
    for (let i = 0; i < NF; i++) { const qr = erect(i) ? 2 : P.qr; oneSpike(SF, i, FA[i], RB[i & 1], LSC[qr], TILT[qr] + (P.qt && (i & 1) ? 0.2 : 0)); }
    for (let i = 0; i < NBK; i++) oneSpike(SK, i, BA[i], 11.5, LSC[P.qr] * 0.95, TILT[P.qr] + 0.06 + (P.qt && !(i & 1) ? 0.2 : 0));
  }
  const tipOf = (i) => { const b = i * 5; return [SF[b] + SF[b + 2] * SF[b + 4], SF[b + 1] + SF[b + 3] * SF[b + 4]]; };

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail', 'qr'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, tail: 0, qr: 1 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ crouch: 2, pitch: -1, head: 2, qr: 0, tail: 1 });                        // 一缩
  const A_FIRE = pose({ bx: -1, crouch: 0, pitch: 1, head: -1, jaw: 1, qr: 2, tail: -2 });       // 猛一抖
  const A_HOLD = pose({ crouch: 0, pitch: 0, qr: 2, tail: -1 });
  const A_EASE = pose({ qr: 1, tail: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_FIRE, 'snap'], [0.25, A_FIRE, 'lin'], [0.42, A_HOLD, 'out'], [0.6, A_EASE, 'inOut'], [0.75, REST, 'inOut']];
  const C_POSE = pose({ crouch: 2, pitch: -1, head: 3, qr: 1, tail: 1 });                        // 缩成刺球
  const S_POSE = pose({ crouch: 0, pitch: 1, head: -2, jaw: 2, qr: 3, tail: -2 });               // 一齐射向天空
  const T_FIRE = 2 / 12, T_RAIN = 1 / 12, T_BURST = INCOMING + 0.3, T_LAND = INCOMING + 0.66;
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };

  function idle(tq, f12) {
    apply(REST); const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.qt = (Math.floor(f12 / 12 * 2.5 + 1e-6) & 3) === 1 ? 1 : 0;                             // 呼吸时针刺跟着轻抖
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                        // 待机个性：抖刺——针刺哗啦竖起、抖两下，再伏下去喷个鼻
      const k = Math.min(4, f12of(lp - 1.6));
      P.qr = k <= 2 ? 2 : 0; P.qt = k === 1 ? 1 : 0; P.bob = k === 0 ? 1 : 0; P.tail = k === 1 ? 2 : k === 2 ? -2 : 0;
      if (k === 3) { P.jaw = 1; P.head = 1; P.crouch = 1; } if (k === 4) { P.head = 1; P.eyes = 1; }
    }
  }
  function deathPose(d, f12) {
    P.bald = 1; P.eyes = 1; P.ear = 1; P.tail = 0; P.qr = 1;
    if (d < 0.42) { P.def = 0; P.crouch = 1; P.bx = -2; P.head = 1; P.jaw = 1; }
    else if (d < 0.54) { P.def = 1; P.crouch = 2; P.bx = -2; P.head = 2; P.jaw = 1; }
    else if (d < 0.66) { P.def = 2; P.crouch = 3; P.bx = -3; P.head = 2; }
    else { P.def = 2; P.lie = 1; P.bx = -3; P.head = 2; P.pitch = d < 0.75 ? -1 : 0; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 圆滚滚的小碎步：针刺随步子一起一伏
      apply(REST); Q.anim.walk(P, tq); P.head = 0; P.qr = P.gf & 1 ? 1 : 2; P.qt = P.gf === 0 || P.gf === 2 ? 1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp);
      if (tq >= T_FIRE - 1e-6 && tq < 0.34) P.qt = f12 & 1;                                   // 抖针
    } else if (st === CHARGE) {
      E.mix(tmp, REST, C_POSE, ease.inOut(clamp01(tq / 0.7)), F_ALL); apply(tmp);
      P.qn = Math.min(NF, Math.floor(tq / 0.09 + 1e-6)); P.ql = tq < 0.9 ? 1 : (f12 & 1) + 1; P.rim = 2; P.eyes = 1;
      if (tq >= 0.7) P.bx = f12 & 1;                                                           // 身体抖 1 格
    } else if (st === CAST) {
      E.mix(tmp, C_POSE, S_POSE, ease.out(clamp01(tq / 0.12)), F_ALL); apply(tmp); P.qn = 0; P.ql = 2; P.rim = 3;
      if (tq >= 0.25) { P.jaw = 1; P.rim = 2; }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_POSE, REST, q, F_ALL); apply(tmp);
      P.qr = tq < 0.25 ? 3 : tq < 0.42 ? 0 : 1; P.qt = tq >= 0.42 && tq < 0.55 ? 1 : 0;       // 针刺长回来、抖一抖
      P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.ql = q < 0.4 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { apply(REST); Q.anim.hurt(P, h); if (h < 0.35) { P.qr = 2; P.qt = h < 0.2 ? 1 : 0; P.jaw = h < 0.2 ? 1 : 0; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { apply(REST); Q.anim.death(P, d, f12); P.lie = 0; P.pitch = 0; P.qr = 2; P.qt = f12 & 1; P.ql = f12 & 1; }
      else deathPose(d, f12);
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, curO()); spikeGeom(Q.rig(P, o));
    P.gx = R(BCX) + P.bx; P.gy = R(BCY - 8);
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：radialQuill（一根放射长针：下半 2 格粗、上半 1 格，针尖 2 格换针尖材质；lit 时针尖换发光体）
  function quill(i, G, mat, tm, glowLv) {
    const bx0 = G[i * 5], by0 = G[i * 5 + 1], ux = G[i * 5 + 2], uy = G[i * 5 + 3], n = R(G[i * 5 + 4]), steep = Math.abs(uy) >= Math.abs(ux);
    for (let k = 0; k <= n; k++) {
      const x = bx0 + ux * k, y = by0 + uy * k;
      if (k >= n - 1) {
        const mm = glowLv ? (glowLv === 2 ? hot : lit) : tm;
        U.dot(E, x, y, mm, k === n ? 4 : 3); continue;
      }
      U.dot(E, x, y, mat, k > n * 0.35 && (k % 3) !== 0 ? 4 : 3);                                // 迎光的上半截亮一级
      if (k <= n * 0.5) U.dot(E, steep ? x + 1 : x, steep ? y : y + 1, mat, 2);
      if (k <= n * 0.25 && n >= 7) U.dot(E, steep ? x - 1 : x, steep ? y : y - 1, mat, 4);   // 长针根部 3 格粗
    }
  }
  function spikesBack() { E.part(); for (let i = 0; i < NBK; i++) quill(i, SK, i & 1 ? qAF : qBF, tipF, 0); }
  function spikesFront() {
    E.part();
    for (let i = 0; i < NF; i++) { const up = erect(i); quill(i, SF, i & 1 ? qA : qB, tip, up ? P.ql : (P.ql === 2 ? 1 : 0)); }
  }
  // 候选部件：quillCoat（刺皮：躯干上半按放射角度画成一道道倒伏的短刺，黑褐 / 墨黑每 8° 相间，和躯干同一个部件）
  function bodyCoat(oo) {
    Q.body(E, rig, P, oo);
    const C1 = rig.C1, C2 = rig.C2, cx = (C1.x + C2.x) / 2 - 0.5, cy = (C1.y + C2.y) / 2 + 0.5, rx = (C1.x - C2.x) / 2 + C1.r, ry = C1.r;
    for (let x = Math.floor(C2.x - C2.r) - 1; x <= Math.ceil(C1.x + C1.r) + 1; x++) {
      const s = Q.span(rig, oo, x); if (!s) continue;
      for (let y = s[0]; y <= s[1]; y++) {
        const dx = (x - cx) / rx, dy = (y - cy) / ry, rn = dx * dx + dy * dy;
        let a = Math.atan2(cy - y, x - cx) / D2R; if (a < 0) a += 360;
        if (P.bald) { if (rn > 0.3 && ((x * 5 + y * 3 + 80) & 7) === 0) U.dot(E, x, y, oo.m.body, 2); continue; }   // 秃身上的针孔
        if (x > C1.x + 1 || y >= s[1] - 1 || rn < 0.12) continue;                                 // 脸、颈前和肚皮一行不盖刺
        const band = Math.floor(a / 8) & 1;
        U.dot(E, x, y, band ? qA : qB, rn > 0.72 ? 3 : ((x * 3 + y * 5 + 80) & 7) === 0 ? 4 : 2);
      }
    }
  }
  // 候选部件：clubTail（棒槌尾：尾根一段粗针束 → 鼓成一团的针簇 → 末端 3 根红尖针扇开；P.tail 甩动）
  function clubTail() {
    E.part();
    const C2 = rig.C2, x0 = C2.x - C2.r * 0.7, y0 = C2.y + C2.r * 0.35, a = (205 - (P.tail | 0) * 7) * D2R, ux = Math.cos(a), uy = -Math.sin(a);
    for (let k = 0; k <= 4; k++) U.disc(E, x0 + ux * k, y0 + uy * k, 1.3 + k * 0.28, k & 1 ? qA : qB, 0);
    const ex = x0 + ux * 5, ey = y0 + uy * 5;
    for (let j = -1; j <= 1; j++) {
      const b = a + j * 0.45, vx = Math.cos(b), vy = -Math.sin(b);
      for (let k = 1; k <= 4; k++) U.dot(E, ex + vx * k, ey + vy * k, k >= 3 ? tip : qB, k === 4 ? 4 : 3);
    }
    for (let k = 0; k <= 4; k += 2) U.dot(E, x0 + ux * k - uy, y0 + uy * k + ux, qA, 4);         // 针束上的亮纹
  }
  function stubTail() { E.part(); const C2 = rig.C2; U.disc(E, C2.x - C2.r * 0.85, C2.y, 1.2, curO().m.limb, 0); }
  // 候选部件：hornQuills（额前三根特别长的角针：从额头往前上方伸出，比吻尖远 4 格，针尖赤红）
  function hornQuills() {
    E.part();
    const F = Q.headFrame(rig, curO(), P.jaw);
    const LEN = [9, 10, 8], TL = [-0.62, -0.42, -0.22];
    for (let j = 0; j < 3; j++) {
      const b = F.at(-F.W * 0.35 + j * 1.1, -F.Hh + 0.8 + j * 0.4), a = F.a + TL[j], ux = Math.cos(a), uy = Math.sin(a), n = LEN[j];
      for (let k = 0; k <= n; k++) {
        const x = b[0] + ux * k, y = b[1] + uy * k;
        if (k >= n - 1) U.dot(E, x, y, P.ql === 2 ? hot : tip, k === n ? 4 : 3);
        else { U.dot(E, x, y, qB, k > n * 0.5 ? 4 : 3); if (k < 3) U.dot(E, x, y + 1, qB, 2); }
      }
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const oo = curO();
    if (!P.bald) spikesBack();
    Q.legs(E, rig, P, oLeg, 1);
    Q.legs(E, rig, P, oLeg, 0);                                                                // 近侧腿也压在身体后面：身体盖住大腿，只露出小腿和爪
    if (!P.bald) clubTail(); else stubTail();
    bodyCoat(oo);
    if (!P.bald) spikesFront();
    Q.head(E, rig, P, oo);
    if (!P.bald) hornQuills();
    Q.horn(E, rig, P, oo);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 飞针：攻击的抛针、技能的上抛 / 针雨 / 插地红针、死亡崩飞的针（预分配 40 根） ─────
  // 种类：1 抛针（有重力，到时命中）· 2 上抛（飞出画面）· 3 针雨（下落，落地变成插地红针）· 4 崩飞的针（落地躺平）· 5 插地红针 · 6 躺在地上的针
  const NN = 40, nK = new Uint8Array(NN), nX = new Float32Array(NN), nY = new Float32Array(NN), nVX = new Float32Array(NN), nVY = new Float32Array(NN),
    nG = new Float32Array(NN), nAge = new Float32Array(NN), nLife = new Float32Array(NN), nIdx = new Uint8Array(NN);
  function addN(k, x, y, vx, vy, g, life, idx) {
    let i = 0; for (; i < NN - 1 && nK[i]; i++); nK[i] = k; nX[i] = x; nY[i] = y; nVX[i] = vx; nVY[i] = vy; nG[i] = g; nAge[i] = 0; nLife[i] = life; nIdx[i] = idx || 0; return i;
  }
  let chargeAcc = 0, soulAcc = 0, lastGf = -9, nLanded = 0, nLob = 0;
  function lobHit(i) {
    const x = nX[i], y = nY[i]; nLob++;
    burst(x, y, 5, 20, 60, 0.1, 0.25, R_EL, 4); burst(x, y, 3, 20, 50, 0.1, 0.2, FXI.impact, 4);
    hitDummy(nLob === 3 ? 1 : 0); sfx('hit', { mat: 'wood', w: 0.3 });
  }
  function rainLand(i) {
    nLanded++;
    for (let k = 0; k < 2; k++) spawn(K_DUST, nX[i] + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -4 - Math.random() * 6, 0.3, FXI.dust);
    if (nLanded === 1) { hitDummy(1, 1); ring(DUMMY_X, HY - 12, 0, R_EL); fx.cross(DUMMY_X, HY - 14, 5, R_EL, 0.2, 2); shake(0.12, 1); sfx('impact', { pal: 'blood', w: 0.5 }); }
    else if (nLanded === 7) { burst(DUMMY_X, HY - 10, 10, 30, 80, 0.15, 0.35, R_EL, 8); sfx('impact', { pal: 'blood', w: 0.35 }); }
  }
  function stepNeedles(dt) {
    for (let i = 0; i < NN; i++) {
      const k = nK[i]; if (!k) continue; nAge[i] += dt;
      if (k === 1) { nVY[i] += nG[i] * dt; nX[i] += nVX[i] * dt; nY[i] += nVY[i] * dt; if (nAge[i] >= nLife[i]) { lobHit(i); nK[i] = 0; } }
      else if (k === 2) { nX[i] += nVX[i] * dt; nY[i] += nVY[i] * dt; if (nY[i] < -8) nK[i] = 0; }
      else if (k === 3) {                                                                      // 和引擎 fall() 同一套积分：针雨的头和落地尘对得上
        nVY[i] += 600 * dt;
        if (nY[i] + nVY[i] * dt >= HY) { nY[i] = HY; nK[i] = 5; nAge[i] = 0; nLife[i] = 0.6 + Math.random() * 0.12; rainLand(i); }
        else { nX[i] += nVX[i] * dt; nY[i] += nVY[i] * dt; }
      } else if (k === 4) { nVY[i] += nG[i] * dt; nX[i] += nVX[i] * dt; nY[i] += nVY[i] * dt; if (nY[i] >= HY) { nY[i] = HY; nK[i] = 6; nVX[i] = nVX[i] >= 0 ? 1 : -1; } }
      else if (k === 5) { if (nAge[i] >= nLife[i]) { nK[i] = 0; spawn(K_RISE, nX[i], HY - 4, 0, -10, 0.25, R_EL); } }
    }
  }
  function drawLine(x, y, dx, dy, cols) { for (let k = 0; k < cols.length; k++) put(R(x - dx * k), R(y - dy * k), cols[k]); }
  const C_LOB = [21, 26, 13, 19, 20], C_UP = [26, 13, 12, 11], C_RAIN = [21, 26, 13, 12], C_DEB = [26, 13, 9, 8];
  function drawNeedles(f12) {
    for (let i = 0; i < NN; i++) {
      const k = nK[i]; if (!k) continue;
      if (k === 5) {                                                                           // 插地红针：斜插，最后 0.2 s 闪烁熄灭
        if (nLife[i] - nAge[i] < 0.2 && ((f12 + i) & 1)) continue;
        const s = (i & 1) ? 1 : -1; put(R(nX[i]), HY - 4, EL[1]); put(R(nX[i]), HY - 3, EL[2]); put(R(nX[i]) + s, HY - 2, EL[2]); put(R(nX[i]) + s, HY - 1, EL[3]); continue;
      }
      if (k === 6) {                                                                           // 躺在地上的针：死亡消散时一根根没了
        if (E.state !== DEATH || E.stT > INCOMING + 1.6 + (i % 6) * 0.13) continue;
        const d = nVX[i]; put(R(nX[i]), HY, C_DEB[0]); put(R(nX[i]) - d, HY, C_DEB[1]); put(R(nX[i]) - 2 * d, HY, C_DEB[2]); put(R(nX[i]) - 3 * d, HY, C_DEB[3]); continue;
      }
      const v = Math.hypot(nVX[i], nVY[i]) || 1, dx = nVX[i] / v, dy = nVY[i] / v;
      drawLine(nX[i], nY[i], dx, dy, k === 1 ? C_LOB : k === 2 ? C_UP : k === 3 ? C_RAIN : C_DEB);
    }
  }

  // ───── 特效 ─────
  const LOBS = [[4, DUMMY_X - 4, HY - 20, 0.38], [5, DUMMY_X, HY - 14, 0.44], [6, DUMMY_X + 3, HY - 9, 0.5]];   // [从哪根针尖, 目标 x, y, 飞行秒数]
  function onEnter(s) {
    if (s === CHARGE) { nLanded = 0; }
    if (s === ATTACK) nLob = 0;
    if (s === CAST) {                                                                          // 针刺一齐射向天空
      poseAt(CHARGE, DUR[CHARGE] - 1 / 12, E.simT);
      for (let i = 0; i < NF; i++) { const [x, y] = tipOf(i); addN(2, scrX(R(x) + P.bx), HY + R(y), -20 + Math.random() * 70, -300 - Math.random() * 70, 0, 1, 0); }
      poseAt(CAST, 0, E.simT);
      const gx = scrX(P.gx), gy = HY + P.gy;
      releaseOrbit(40, 100, 0.25, 0.5); ring(gx, gy, 1, R_EL); fx.cross(gx, gy - 2, 6, R_EL, 0.25, 2); burst(gx, gy, 16, 40, 110, 0.2, 0.45, R_EL, 30);
      shake(0.28, 2); flash(0.05); sfx('shoot', { proj: 'arrow' });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {                                                        // 扇形抛出 3 根针
      for (const [si, tx, ty, T] of LOBS) {
        const [x, y] = tipOf(si), x0 = scrX(R(x) + P.bx), y0 = HY + R(y), g = 240;
        addN(1, x0, y0, (tx - x0) / T, (ty - y0 - 0.5 * g * T * T) / T, g, T, 0);
        burst(x0, y0, 3, 15, 40, 0.08, 0.18, R_EL, 6);
      }
      sfx('swing', { kind: 'throw', w: 0.35 }); sfx('shoot', { proj: 'arrow' });
    }
    if (s === CAST && t === T_RAIN) {                                                          // 针雨：12 根从画面上方落在假人周围
      for (let i = 0; i < 12; i++) {
        const x = DUMMY_X - 14 + i * 2.4 + Math.random() * 1.5, y = -2 - Math.random() * 22, vx = 18 + Math.random() * 10, vy = 190 + Math.random() * 40;
        addN(3, x, y, vx, vy, 600, 3, 0); fall(x, y, vx, vy, HY, R_EL, 1);
      }
    }
    if (s === DEATH && t === T_BURST) {                                                        // 针刺四散崩飞
      poseAt(DEATH, T_BURST - 1e-3, E.simT);
      for (let i = 0; i < NF; i++) {
        const b = i * 5, [x, y] = tipOf(i), sx = scrX(R(x - SF[b + 2] * 2) + P.bx), sy = HY + R(y - SF[b + 3] * 2), vx = SF[b + 2] * (55 + Math.random() * 40), vy = SF[b + 3] * (55 + Math.random() * 40) - 50;
        addN(4, sx, sy, vx, vy, 300, 3, i);
      }
      for (let i = 0; i < NBK; i += 3) { const b = i * 5; addN(4, scrX(R(SK[b] + SK[b + 2] * 5) + P.bx), HY + R(SK[b + 1] + SK[b + 3] * 5), SK[b + 2] * 70, SK[b + 3] * 60 - 60, 300, 3, i); }
      burst(scrX(P.gx), HY + P.gy + 6, 18, 50, 130, 0.2, 0.45, R_EL, 20); burst(scrX(P.gx), HY + P.gy + 6, 8, 30, 80, 0.2, 0.4, FXI.impact, 10); shake(0.15, 2);
      poseAt(DEATH, T_BURST, E.simT);
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 10 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 26, -5 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
    if (s === IDLE && t === 1.6 + 3 / 12) {                                                    // 伏刺时喷一口鼻息
      const mx = scrX(R(rig.mouth[0]) + P.bx) + 1, my = HY + R(rig.mouth[1]);
      for (let i = 0; i < 3; i++) spawn(K_DUST, mx, my, 15 + Math.random() * 15, -4 - Math.random() * 6, 0.3, FXI.dust);
    }
  }
  const EVENTS = [[1.6 + 3 / 12], [], [T_FIRE], [], [T_RAIN], [], [], [T_BURST, T_LAND], []];
  function impactOn() {}
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) {                                                                    // 红火星从四周螺旋汇进竖起的针尖
      chargeAcc += dt * (14 + 18 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy + 4, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 6 : -4), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.25, FXI.dust); sfx('step', { w: 0.3 }); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {
      soulAcc += dt * 14; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 10 + Math.random() * 12, HY - 2 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 12, 0.7 + Math.random() * 0.6, FXI.soul); }
    }
    stepNeedles(dt);
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; lastGf = -9; nLanded = 0; nLob = 0; nK.fill(0); }
  function fxBack(f12) { if (P.rim >= 2 && !P.bald && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) { drawNeedles(f12); }

  return {
    name: '混沌豪猪', HX, R_EL, DUR, hero, P, GLOW_MATS: [lit, hot], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'explode', pal: 'blood', style: 'meteor', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront,
  };
});
