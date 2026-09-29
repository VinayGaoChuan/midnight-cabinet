// 蛛皇阿纳佐斯（小首领，孵化舱区域）：首领标准做法见 pcd/run/boss-standard.md。
// 依据：附录 G2「戴冠的蜘蛛」；大网（网住人最多的那一排 5.5 秒）、头刺（直线穿透）；半血 结茧（裹住一个，吸它的血）。
// 剪影：一只八条长腿横着撑开的帝王蛛，身体架离地面，膝盖高过背线；帝紫黑的甲壳，头胸顶上一圈金冠尖刺，
//   额前伸出一根骨白的长头刺（平时斜指向上，头刺时放平成骑枪）；脸上八只眼（两只大的红眼、六只小的琥珀眼），
//   下面两颗粗大的螯肢、弯钩一样的骨白毒牙挂着发光的毒液；鼓胀的腹部上一块发光的骷髅沙漏纹；腿节上一圈圈暗红的膝环。
// 待机：两档呼吸（腹部一鼓一收）、须肢清理毒牙；个性动作：一条前腿抬起「咚、咚」敲两下地，然后八只眼从左到右依次眨一遍。
// 移动：交替四足步（两组各四条腿轮流迈），身体几乎不起伏，像滑过去一样。
// 招式（setMove）：bigNet 大网（前腿高举、腹部翘起，丝从纺器拉到两条前腿之间织出一张发光的网 → 向前甩出）·
//   headSpike 头刺（身体后缩压低、头刺放平、刺尖越来越亮 → 整个身体向前一扎）·
//   cocoon 结茧（腹部高翘，两条前腿轮流滚出一个丝团 → 甩出去）· roar 结茧（半血怒吼：后腿站起、四条前腿全张、毒牙大开、八眼全亮）。
// 死亡：腿一软 → 身体砸在地上 → 八条腿抽搐着蜷起来（死蜘蛛的样子），眼睛一只只灭掉 → 化成丝和暗红的光点。
PCD.define('B_SpiderEmperorAnazos', (E) => {
  const { defDeep, defMat, fxRamp, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：甲壳压得很暗，眼、毒液、骷髅纹才亮得出来 ─────
  const R_CHITIN = ['#060309', '#0f0814', '#170d1e', '#20122a', '#2a1836', '#351f44', '#422752', '#513062', '#623b74', '#764a88', '#8e5ea0'];   // 帝紫黑甲壳
  const R_CRIM = ['#0e0306', '#1c050b', '#2e0812', '#440c1a', '#5c1222', '#76182a', '#901f32', '#aa2a3c', '#c43a48', '#da5058', '#ec7470'];     // 暗红膝环、须肢
  const CHIT = defDeep(R_CHITIN, { depth: 8, amb: 0.14 }), ABD = defDeep(R_CHITIN, { depth: 11, amb: 0.12 });
  const LEGN = defDeep(R_CHITIN, { depth: 3, amb: 0.2 }), LEGF = defDeep(R_CHITIN, { depth: 3, dark: 3, amb: 0.08 });
  const CHEL = defDeep(R_CHITIN, { depth: 4, amb: 0.22 }), CHELF = defDeep(R_CHITIN, { depth: 3, dark: 3, amb: 0.1 });
  const BAND = defDeep(R_CRIM, { depth: 2, amb: 0.24 }), BANDF = defDeep(R_CRIM, { depth: 2, dark: 4, amb: 0.1 });
  const GOLD = defDeep('brass', { depth: 2, amb: 0.3 }), GOLDF = defDeep('brass', { depth: 2, dark: 3, amb: 0.14 });
  const BONE = defDeep('ivory', { depth: 2, amb: 0.36 }), FANG = defDeep('ivory', { depth: 1, amb: 0.5 });
  const EYEI = fxRamp('seEye', ['#ffffff', '#ffd27a', '#ff5a2e', '#b8101e', '#3a0408']), ER = FXR[EYEI];        // 八只眼：白 → 琥珀 → 红
  const SILKI = fxRamp('seSilk', ['#ffffff', '#ece2ff', '#b8a2dc', '#6e5296', '#281a3e']), SR = FXR[SILKI];     // 蛛丝：白 → 淡紫
  const VENI = fxRamp('seVenom', ['#ffffff', '#ffb0cc', '#f0406e', '#9a0c36', '#360414']), VR = FXR[VENI];      // 毒液 / 骷髅纹：白 → 粉 → 洋红
  const BONEI = fxRamp('seBone', ['#ffffff', '#f6ecd6', '#dccaa2', '#9c845a', '#3a2a18']), BR = FXR[BONEI];     // 头刺的骨白光
  const EYE = defMat([ER[4], ER[3], ER[2], ER[1]], 1, 1), EYEA = defMat([ER[4], ER[3], ER[1], ER[0]], 1, 1), HOT = defMat([21, 21, 21, 21], 1, 1);
  const MARK = defMat(ramp(['#3a0412', '#9a0c26', '#e82c40', '#ff9a7c']), 1, 1), VEN = defMat([VR[4], VR[2], VR[1], VR[0]], 1, 1);
  const SILK = defMat([SR[4], SR[3], SR[2], SR[1]], 1, 1), LANCE = defMat([BR[4], BR[2], BR[1], BR[0]], 1, 1), GEM = defMat([ER[4], ER[3], ER[2], ER[1]], 1, 1);
  const FLATS = [EYE, EYEA, HOT, MARK, VEN, SILK, LANCE, GEM];
  const hero = new Sprite(176, 124, 84, 114);
  const DUR = [2.6, 2 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { bigNet: { 3: 1.0, 4: 0.45, 5: 0.7 }, headSpike: { 3: 1.1, 4: 0.4, 5: 0.7 }, cocoon: { 3: 0.8, 4: 0.5, 5: 0.7 }, roar: { 3: 0.5, 4: 0.8, 5: 0.5 } };
  let MV = 'bigNet';
  const HX = 86;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [ER[1], ER[2], ER[3]], k: 0.5 }, { x: 0, y: 0, r: 0, ramp: [VR[1], VR[2], VR[3]], k: 0.45 }, { x: 0, y: 0, r: 0, ramp: [SR[1], SR[2], SR[3]], k: 0.6 }];
  const LON = [];
  const RIM_R = [0, 12, 18, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: ER, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of FLATS) RIM.skip[m] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  // 身体绕腹柄前的 PIV 俯仰（pitch 正 = 低头），腹部绕腹柄 APIV 翘起（ab 正 = 腹尖上翘）。腿是三段：腿根（跟身体走）→ 膝（IK）→ 踝 → 脚尖（世界坐标，站在地上）
  const PIV = [0, -34], APIV = [-2, -36], LANCE0 = [25, -47];
  const REST = {
    n1: { r: [18, -30], k: [32, -60], f: 64 }, n2: { r: [14, -29], k: [26, -56], f: 43 }, n3: { r: [8, -29], k: [-8, -56], f: -26 }, n4: { r: [4, -31], k: [-22, -61], f: -55 },
  };
  const LG = {};
  for (const n of [1, 2, 3, 4]) {
    const g = REST['n' + n], s = g.f > g.r[0] ? 1 : -1, an = [g.f - 6 * s, -14];
    const l1 = Math.hypot(g.k[0] - g.r[0], g.k[1] - g.r[1]), l2 = Math.hypot(an[0] - g.k[0], an[1] - g.k[1]);
    LG['n' + n] = { r: g.r, f: g.f, s, l1, l2 };
    LG['f' + n] = { r: [g.r[0] - 2, g.r[1] - 4], f: Math.round(g.f * 0.8), s, l1: l1 * 0.95, l2: l2 * 0.9 };
  }
  const LK = ['n1', 'n2', 'n3', 'n4', 'f1', 'f2', 'f3', 'f4'];
  // 八只眼：[x, y, 大小]（2 = 2×2 的大红眼），按眨眼顺序排
  const EYES = [[24, -40, 1], [25, -44, 1], [28, -46, 1], [28, -43, 3], [32, -45, 1], [32, -41, 3], [35, -42, 1], [35, -38, 1]];

  const D0 = { bx: 0, by: 0, pitch: 0, ab: 0, sa: -0.8, jaw: 0, pal: 0, web: 0, curl: 0, ball: 0,
    n1: [0, 0], n2: [0, 0], n3: [0, 0], n4: [0, 0], f1: [0, 0], f2: [0, 0], f3: [0, 0], f4: [0, 0] };
  const K = {
    idle: {},
    aWind: { bx: -3, by: -1, pitch: -0.2, ab: -0.08, sa: -0.95, jaw: 0.6, pal: 1, n1: [-16, -36], f1: [-12, -40], n2: [-4, -8] },                    // 普攻：前腿高举
    aStrike: { bx: 6, by: 2, pitch: 0.12, ab: 0.05, sa: -0.6, jaw: 1, pal: 0.2, n1: [6, -2], f1: [10, -3], n2: [4, 0] },                               // 前腿扎下去、毒牙张开
    aFollow: { bx: 4, by: 1, pitch: 0.06, sa: -0.7, jaw: 0.5, n1: [4, 0], f1: [6, 0] },
    nRear: { bx: -4, by: -2, pitch: -0.3, ab: 0.4, sa: -1.0, jaw: 0.3, pal: 1, n1: [-8, -46], f1: [-2, -50], n2: [-2, -28], f2: [2, -32], n4: [4, 0], f4: [4, 0] },   // 大网：前腿高举织网
    nFling: { bx: 7, by: 1, pitch: 0.1, ab: -0.05, sa: -0.7, jaw: 1, n1: [14, -22], f1: [18, -26], n2: [8, -8], f2: [10, -10] },
    sDraw: { bx: -7, by: 4, pitch: -0.06, ab: 0.12, sa: 0, jaw: 0.4, pal: 0.5, n1: [-4, -6], f1: [-2, -6], n4: [-2, 0], f4: [-2, 0] },                      // 头刺：后缩压低、头刺放平
    sLunge: { bx: 12, by: 1, pitch: 0.06, ab: -0.12, sa: 0.02, jaw: 1, n1: [10, -4], f1: [12, -4], n4: [6, 0] },
    cSpin: { bx: -2, pitch: -0.18, ab: 0.62, sa: -0.9, jaw: 0.3, pal: 1, n1: [-14, -26], f1: [-10, -30], ball: 1 },                                        // 结茧：腹部高翘、前腿滚丝团
    cThrow: { bx: 6, by: 1, pitch: 0.08, ab: 0.25, sa: -0.7, jaw: 1, n1: [12, -18], f1: [16, -22] },
    rRear: { bx: -4, by: -1, pitch: -0.34, ab: 0.15, sa: -1.05, jaw: 0.5, pal: 1, n1: [-14, -46], f1: [-8, -50], n2: [-8, -30], f2: [-4, -34] },       // 半血怒吼
    rRoar: { bx: -3, by: -2, pitch: -0.44, ab: 0.22, sa: -1.12, jaw: 1, pal: 1, n1: [2, -50], f1: [-10, -56], n2: [6, -36], f2: [0, -40], n3: [-4, 0], n4: [-4, 0] },
    hurt: { bx: -5, by: -1, pitch: -0.16, ab: 0.15, sa: -0.95, jaw: 0.8, pal: 1, n1: [-8, -12], f1: [-6, -12], n2: [-3, -4] },
    dStag: { bx: -2, by: 7, pitch: 0.12, ab: -0.1, sa: -0.6, jaw: 1, n1: [6, 0], n2: [5, 0], n3: [-5, 0], n4: [-6, 0], f1: [6, 0], f2: [4, 0], f3: [-4, 0], f4: [-6, 0] },
    dDrop: { bx: -1, by: 22, pitch: 0.05, ab: -0.2, sa: -0.3, jaw: 0.6, n1: [12, 0], n2: [9, 0], n3: [-9, 0], n4: [-12, 0], f1: [10, 0], f2: [7, 0], f3: [-7, 0], f4: [-10, 0] },
    dCurl: { bx: -1, by: 23, pitch: 0.02, ab: -0.2, sa: -0.25, jaw: 0, curl: 1, n1: [-38, -24], n2: [-24, -20], n3: [22, -20], n4: [36, -24], f1: [-32, -26], f2: [-18, -22], f3: [16, -22], f4: [30, -26] },
  };
  const NUM = ['bx', 'by', 'pitch', 'ab', 'sa', 'jaw', 'pal', 'web', 'curl', 'ball'];

  const P = {};
  const FIELDS = ['st', ...NUM, 'n1x', 'n1y', 'n2x', 'n2y', 'n3x', 'n3y', 'n4x', 'n4y', 'f1x', 'f1y', 'f2x', 'f2y', 'f3x', 'f3y', 'f4x', 'f4y',
    'eyes', 'blink', 'eout', 'glow', 'rim', 'flash', 'dq', 'mk', 'silk', 'ven'];
  function base() { P.st = 0; P.eyes = 0; P.blink = -1; P.eout = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.mk = 1; P.silk = 0; P.ven = 1; P.tap = 0; P.mx = 0; P.flip = 0; setK(K.idle, K.idle, 0); }
  const val = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of NUM) { const va = val(a, f); P[f] = va + (val(b, f) - va) * q; }
    for (const f of LK) { const va = val(a, f), vb = val(b, f); P[f + 'x'] = va[0] + (vb[0] - va[0]) * q; P[f + 'y'] = va[1] + (vb[1] - va[1]) * q; }
  }
  const seg = (tq, t0, t1, e) => (e || ease.inOut)(clamp01((tq - t0) / (t1 - t0)));
  // 交替四足步：8 帧一圈（12 fps，2/3 秒）。A 组（近 1、3，远 2、4）和 B 组差半圈；着地 4 帧脚往后滑，腾空 4 帧抬起往前
  const STN = [6, 2, -2, -6], SWG = [[-4, 5], [0, 9], [4, 7], [7, 3]], GA = ['n1', 'n3', 'f2', 'f4'], GB = ['n2', 'n4', 'f1', 'f3'];
  function walk(f) {
    f = ((f % 8) + 8) % 8; setK(K.idle, K.idle, 0);
    for (const [grp, off] of [[GA, 0], [GB, 4]]) { const p = (f + off) % 8; for (const k of grp) { if (p < 4) { P[k + 'x'] = STN[p]; P[k + 'y'] = 0; } else { P[k + 'x'] = SWG[p - 4][0]; P[k + 'y'] = -SWG[p - 4][1] * (k[1] === '1' || k[1] === '4' ? 1 : 0.8); } } }
    P.by = [0, -1, 0, 0, 0, -1, 0, 0][f]; P.pitch = [0.02, 0, -0.01, 0, 0.02, 0, -0.01, 0][f]; P.ab = [0, 0.03, 0.05, 0.03, 0, 0.03, 0.05, 0.03][f]; P.jaw = 0.15; P.pal = f & 2 ? 0.6 : 0.2;
  }
  const trem = (f12, a) => { const s = f12 & 1 ? 1 : -1; P.bx += s * a * 0.5; P.n1y += s * a; P.f1y -= s * a; };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.ab = b ? -0.04 : 0.02; P.sa = -0.8 + (b ? 0.03 : 0);   // 呼吸：腹部一鼓一收
      const lp = tt % DUR[IDLE];
      if (lp < 0.9) { const k = Math.floor(lp * 12) % 6; P.pal = [0, 0.6, 1, 0.6, 0, 0.3][k]; P.jaw = [0, 0.3, 0.5, 0.3, 0, 0][k]; }      // 须肢清理毒牙
      if (lp >= 1.1 && lp < 1.85) {                                                                                                        // 待机个性：前腿抬起敲两下地
        const k = Math.floor((lp - 1.1) * 12); const up = [3, 7, 10, 5, 0, 6, 10, 4, 0][k] || 0;
        P.n1x = [-2, -4, -6, -3, 1, -4, -6, -2, 0][k] || 0; P.n1y = -up; P.pitch = up ? -0.03 : 0; P.pal = up ? 0.8 : 0.2;
        if (k === 4 || k === 8) P.tap = 1;
      }
      if (lp >= 2.0 && lp < 2.0 + 8 / 12) P.blink = Math.floor((lp - 2.0) * 12);                                                          // 八只眼依次眨一遍
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 22, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < 0.17) { setK(K.idle, K.aWind, seg(tq, 0, 0.17, ease.out)); P.glow = 1; }
      else if (tq < T_STRIKE) { setK(K.aWind, K.aWind, 0); trem(f12, 1); P.glow = 2; P.rim = 1; P.eyes = 2; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.aStrike, K.aStrike, 0); P.glow = 3; P.rim = 2; P.eyes = 2; P.ven = 2; }
      else if (tq < 0.42) { setK(K.aStrike, K.aFollow, seg(tq, T_STRIKE + 1 / 12, 0.42, ease.out)); P.glow = 2; P.rim = 1; }
      else { const q = seg(tq, 0.42, 0.72); setK(K.aFollow, K.idle, q); P.glow = q < 0.4 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; }
      else { const q = seg(h, 0.35, 0.5); setK(K.hurt, K.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    geo(); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { bigNet: 0, headSpike: 1, cocoon: 2, roar: 3 };
  const T_STRIKE = 3 / 12;
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'bigNet') {
      if (st === CHARGE) {
        setK(K.idle, K.nRear, seg(tq, 0, 0.25, ease.out)); P.web = seg(tq, 0.2, 0.85, ease.out); P.silk = tq > 0.15 ? 1 : 0; P.mk = 2;
        if (tq > 0.3) trem(f12, 1);
        P.glow = tq < 0.3 ? 1 : 2 + sh; P.rim = tq < 0.5 ? 1 : 2; P.eyes = tq > 0.6 ? 2 : 0;
      } else if (st === CAST) {
        const q = seg(tq, 0, 1 / 12, ease.out); setK(K.nRear, K.nFling, tq < 1 / 12 ? 0.6 : 1); P.web = tq < 1 / 12 ? 1 : 0;
        P.glow = 3; P.rim = q < 1 ? 3 : 2; P.eyes = 2; P.mk = 2; P.silk = tq < 0.2 ? 1 : 0;
      } else { const q = seg(tq, 0, 0.55); setK(K.nFling, K.idle, q); P.glow = q < 0.5 ? 1 : 0; }
    } else if (MV === 'headSpike') {
      if (st === CHARGE) {
        setK(K.idle, K.sDraw, seg(tq, 0, 0.35, ease.out)); if (tq > 0.4) trem(f12, tq > 0.8 ? 1.4 : 0.8);
        P.glow = tq < 0.4 ? 1 : tq < 0.8 ? 2 : 2 + sh; P.rim = tq < 0.4 ? 1 : 2; P.eyes = tq > 0.5 ? 2 : 0;
        if (tq > 0.35) { const k = Math.floor(tq * 12) % 4; P.n4x = -2 - [0, 2, 3, 1][k]; P.f4x = -2 - [2, 0, 1, 3][k]; }   // 后腿刨地
      } else if (st === CAST) { setK(K.sLunge, K.sLunge, 0); P.glow = 3; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.ven = 2; }
      else { const q = seg(tq, 0, 0.6); setK(K.sLunge, K.idle, q); P.glow = q < 0.5 ? 1 : 0; }
    } else if (MV === 'cocoon') {
      if (st === CHARGE) {
        setK(K.idle, K.cSpin, seg(tq, 0, 0.25, ease.out)); const a = tq * 6.2832 * 3, e = seg(tq, 0.1, 0.3);
        P.n1x += 5 * Math.cos(a) * e; P.n1y += 5 * Math.sin(a) * e; P.f1x -= 5 * Math.cos(a) * e; P.f1y -= 5 * Math.sin(a) * e;   // 两条前腿轮流滚丝团
        P.ball = seg(tq, 0.1, 0.7); P.silk = tq > 0.1 ? 1 : 0; P.mk = 2; P.glow = tq < 0.3 ? 1 : 2 + sh; P.rim = tq < 0.4 ? 1 : 2; P.eyes = tq > 0.5 ? 2 : 0;
      } else if (st === CAST) {
        const q = seg(tq, 0, 2 / 12, ease.out); setK(K.cSpin, K.cThrow, q); P.ball = tq < 1 / 12 ? 1 : 0; P.silk = tq < 0.3 ? 1 : 0;
        P.glow = 3; P.rim = tq < 2 / 12 ? 3 : 2; P.eyes = 2; P.mk = 2;
      } else { const q = seg(tq, 0, 0.55); setK(K.cThrow, K.idle, q); P.glow = q < 0.5 ? 1 : 0; }
    } else {   // roar：半血的怒吼（结茧）
      if (st === CHARGE) { setK(K.idle, K.rRear, seg(tq, 0, 0.4, ease.out)); P.glow = 2; P.rim = 1; P.eyes = 2; P.mk = 2; if (tq > 0.3) trem(f12, 1); }
      else if (st === CAST) {
        setK(K.rRear, K.rRoar, seg(tq, 0, 0.1, ease.out)); if (tq >= 0.1) { trem(f12, 2); P.n2y += sh ? -2 : 1; P.f2y += sh ? 1 : -2; }
        P.glow = 3; P.rim = tq < 2 / 12 ? 3 : 2; P.eyes = 2; P.mk = 2; P.ven = 2;
      } else { const q = seg(tq, 0, 0.45); setK(K.rRoar, K.idle, q); P.glow = q < 0.5 ? 2 : 0; P.eyes = q < 0.5 ? 2 : 0; }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.25) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; return; }
    P.ven = 0; P.mk = 0;
    if (d < 0.7) setK(K.hurt, K.dStag, seg(d, 0.25, 0.7, ease.in));
    else if (d < 1.05) setK(K.dStag, K.dDrop, seg(d, 0.7, 1.05, ease.in));
    else if (d < 1.3) { setK(K.dDrop, K.dDrop, 0); P.by -= d < 1.15 ? 1 : 0; }
    else { setK(K.dDrop, K.dCurl, seg(d, 1.3, 1.9)); if (d < 2.0) { const s = f12 & 1 ? 2 : -2; P.n2y += s; P.n3y -= s; P.f1y -= s; P.f4y += s; } }   // 腿抽搐着蜷起来
    P.eout = d < 1.1 ? 0 : Math.min(8, Math.floor((d - 1.1) * 9));
    P.eyes = d < 1.1 ? 1 : 0;
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(PIV[0], PIV[1], P.pitch); }
  function abdXf() { bodyXf(); B.rot(APIV[0], APIV[1], P.ab); }
  function geo() {
    bodyXf();
    for (const k of LK) {
      const g = LG[k], s = g.s, R = B.at(g.r[0], g.r[1]);
      const fx = g.f + P[k + 'x'], fy = P[k + 'y'], c = P.curl * s * 1.6, ox = -6 * s, oy = -14;
      const an = [fx + ox * Math.cos(c) - oy * Math.sin(c), fy + ox * Math.sin(c) + oy * Math.cos(c)];
      const kn = B.ik(R, an, g.l1, g.l2, s > 0 ? -1 : 1), dd = Math.hypot(an[0] - kn[0], an[1] - kn[1]) || 1;
      const an2 = [kn[0] + (an[0] - kn[0]) / dd * Math.min(dd, g.l2), kn[1] + (an[1] - kn[1]) / dd * Math.min(dd, g.l2)];
      L[k] = { r: R, kn, an: an2, f: [an2[0] + (fx - an[0]), an2[1] + (fy - an[1])] };
    }
    L.eye = B.at(31, -42); L.face = B.at(29, -36);
    const d = [Math.cos(P.sa), Math.sin(P.sa)]; L.sd = d; L.tip = B.at(LANCE0[0] + d[0] * 19, LANCE0[1] + d[1] * 19); L.lb = B.at(LANCE0[0], LANCE0[1]);
    L.fang = B.at(fangPts()[3][0], fangPts()[3][1]);
    abdXf(); L.spin = B.at(-46, -38); L.mark = B.at(-33, -52);
    L.web = [(L.n1.f[0] + L.f1.f[0] + L.n2.f[0] + L.f2.f[0]) / 4, (L.n1.f[1] + L.f1.f[1] + L.n2.f[1] + L.f2.f[1]) / 4 - 4];
    L.ball = [(L.n1.f[0] + L.f1.f[0]) / 2 + 2, (L.n1.f[1] + L.f1.f[1]) / 2 - 2];
    B.reset();
  }
  function fangPts() { const j = P.jaw; return [[31, -24], [31 + 2 * j - 0.5 * (1 - j), -21 - 0.5 * j], [29 + 5.5 * j, -19.5 - 0.5 * j], [27.5 + 9 * j, -19.5 - 1 * j]]; }
  // 发光体（蓄力汇聚点）
  function focus() {
    const pt = MV === 'headSpike' && P.st >= CHARGE && P.st <= RECOVER ? L.tip : MV === 'bigNet' && P.st === CHARGE ? L.web : MV === 'cocoon' && P.st === CHARGE ? L.ball
      : (MV === 'bigNet' || MV === 'cocoon') && P.st === CAST ? L.spin : P.st === ATTACK ? L.n1.f : L.eye;
    P.fx = pt[0]; P.fy = pt[1]; P.gx = P.fx; P.gy = P.fy;
  }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];

  function ringAt(a, b, q, r, m, t) { const p = lerp(a, b, q), dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl * r, ny = dx / dl * r; lnW(p[0] - nx, p[1] - ny, p[0] + nx, p[1] + ny, m, t); }
  function drawLeg(k) {
    const g = L[k], far = k[0] === 'f', m = far ? LEGF : LEGN, bm = far ? BANDF : BAND, gm = far ? GOLDF : GOLD, big = k[1] === '1' || k[1] === '4', up = g.f[0] > g.r[0] ? -1 : 1;
    part(); capW(g.r[0], g.r[1], g.kn[0], g.kn[1], far ? 2.7 : 3.4, 2.0, m);                                       // 股节：根部粗
    if (!far) for (let i = 1; i < 7; i++) { const p = lerp(g.r, g.kn, i / 7); px(p[0] - 1, p[1] - 1, m, 7); }      // 高光
    const dx = g.kn[0] - g.r[0], dy = g.kn[1] - g.r[1], dl = Math.hypot(dx, dy) || 1, nx = -dy / dl * up, ny = dx / dl * up;
    for (let i = 1; i < 6; i++) { const p = lerp(g.r, g.kn, i / 6); px(p[0] + nx * 3.2, p[1] + ny * 3.2, m, far ? 2 : 5); }   // 刚毛
    ringAt(g.r, g.kn, 0.78, 2.4, bm, far ? 4 : 7); ringAt(g.r, g.kn, 0.84, 2.3, bm, far ? 3 : 5);                   // 膝前一圈暗红
    part(); dot(g.kn[0], g.kn[1], big ? 2.6 : 2.3, bm); px(g.kn[0] - 1, g.kn[1] - 1, bm, far ? 5 : 8);             // 暗红膝节
    part(); capW(g.kn[0], g.kn[1], g.an[0], g.an[1], big ? 2.0 : 1.8, 1.3, m);                                      // 胫节
    if (!far) { for (const q of [0.3, 0.5, 0.7]) { const p = lerp(g.kn, g.an, q); px(p[0] - 1, p[1], m, 7); } }
    ringAt(g.kn, g.an, 0.84, 1.8, bm, far ? 4 : 7); ringAt(g.kn, g.an, 0.9, 1.7, bm, far ? 3 : 5);
    part(); dot(g.an[0], g.an[1], 1.5, gm, far ? 3 : 5);                                                            // 金色踝环
    part(); capW(g.an[0], g.an[1], g.f[0], g.f[1], 1.1, 0.5, m);                                                     // 跗节
    px(g.f[0], g.f[1], gm, far ? 5 : 8);                                                                             // 金色爪尖
  }
  function drawAbdomen() {
    part(); abdXf(); B.ell(E, -2, -35.5, 3.5, 3, 0, CHIT);                                                           // 腹柄
    part(); B.ell(E, -24, -45, 22, 17, -0.2, ABD);
    B.ell(E, -24, -31, 16, 3, -0.15, ABD, 3);                                                                        // 腹下阴影
    for (const [x0, y0, x1, y1] of [[-8, -55, -4, -51], [-13, -60, -9, -55], [-35, -60, -32, -55], [-41, -55, -39, -50]]) B.ln(E, x0, y0, x1, y1, ABD, 3);   // 背上的节纹
    for (const [x, y] of [[-6, -44], [-10, -40], [-36, -42], [-40, -46], [-28, -35], [-15, -36]]) { B.px(E, x, y, ABD, 7); B.px(E, x + 1, y, ABD, 6); }  // 细毛反光
    B.ln(E, -34, -61, -30, -62, ABD, 8); B.ln(E, -40, -57, -35, -60, ABD, 7);                                        // 背上的高光
    for (const [x, y] of [[-6, -56], [-12, -60], [-19, -62], [-26, -62], [-33, -61], [-40, -57], [-44, -52]]) { B.px(E, x, y - 1, ABD, 4); B.px(E, x - 1, y - 2, ABD, 3); }   // 背上的刚毛
    // 骷髅沙漏纹（发光）：上半是骷髅（两个眼窝、鼻缝），下半是倒三角
    const SK = ['...#####...', '..#######..', '.#########.', '.##oo#oo##.', '.##oo#oo##.', '..###v###..', '...#.#.#...', '....###....', '.....#.....', '....###....', '...#####...', '..#######..'];
    for (let j = 0; j < SK.length; j++) for (let i = 0; i < 11; i++) { const c = SK[j][i]; if (c === '.') continue; const x = -38 + i, y = -58 + j;
      if (c === 'o' || c === 'v') B.px(E, x, y, ABD, c === 'o' ? 0 : 2); else B.px(E, x, y, P.mk ? MARK : ABD, !P.mk ? 3 : P.mk === 2 ? (j < 3 || j > 9 ? 4 : 3) : (i < 3 && j < 3 ? 4 : i > 7 || j > 10 ? 2 : 3)); }
    for (const [x, y] of [[-39, -56], [-27, -56], [-39, -48], [-27, -48]]) B.px(E, x, y, GOLD, 8);
    if (P.mk === 2) { B.px(E, -34, -57, HOT); B.px(E, -33, -50, HOT); }                   // 骷髅纹四角的金点
    part(); B.ell(E, -45, -38, 3.2, 2.2, 0.4, CHIT); B.px(E, -47, -38, CHIT, 7);                                      // 纺器
    part(); B.ell(E, -44, -36, 2.2, 1.5, 0.2, CHIT, 4);
    if (P.silk) { B.px(E, -48, -38, SILK, 4); B.px(E, -47, -37, SILK); }
  }
  function drawPalp(far) {
    part(); bodyXf(); const p = P.pal, o = far ? -3 : 0, m = far ? CHELF : CHEL;
    const pts = [[30 + o, -35], [35 + o + p, -34 - 3 * p], [37 + o + 2 * p, -29 - 5 * p]];
    B.strand(E, pts, far ? 1.3 : 1.6, 1.1, m); B.ell(E, pts[2][0], pts[2][1], 1.5, 1.3, 0, far ? BANDF : BAND);
    if (!far) B.px(E, pts[1][0], pts[1][1] - 1, m, 7);
  }
  function drawChel(far) {
    part(); bodyXf(); const o = far ? -3 : 0, m = far ? CHELF : CHEL;
    B.strand(E, [[28 + o, -33], [30 + o, -29], [31 + o, -25]], far ? 2.8 : 3.4, 2.3, m);                               // 螯肢
    if (!far) { B.px(E, 29, -31, m, 8); B.px(E, 30, -29, m, 7); B.ln(E, 27, -29, 29, -25, m, 3); for (const [x, y] of [[32, -30], [33, -27], [32, -25]]) B.px(E, x, y, m, 6); }
    part(); const f = fangPts().map((q) => [q[0] + o, q[1]]); B.strand(E, f, far ? 1.1 : 1.4, 0.4, FANG, far ? 3 : 0);  // 骨白毒牙
    if (!far) { B.px(E, f[1][0], f[1][1], FANG, 8); if (P.ven) { B.px(E, f[3][0], f[3][1] + 1, VEN, P.ven === 2 ? 4 : 3); if (P.ven === 2) B.px(E, f[3][0], f[3][1] + 2, VEN, 2); } }
  }
  function drawThorax() {
    part(); bodyXf();
    B.ell(E, 11, -35, 14, 8.5, 0.05, CHIT);                                                                           // 头胸甲
    B.ell(E, 13, -28.5, 11, 2.5, 0, CHIT, 3);                                                                         // 胸板阴影
    for (const [x1, y1] of [[0, -36], [3, -30], [11, -28], [19, -30]]) B.ln(E, 11, -38, x1, y1, CHIT, 4);             // 放射的沟
    B.px(E, 11, -38, CHIT, 2); B.px(E, 12, -38, CHIT, 2); B.ln(E, 0, -39, 8, -42, CHIT, 7);                            // 中窝、背上的高光
    for (const x of [1, 6, 11, 16]) B.px(E, x, -28, GOLD, 6);                                                         // 甲缘的金色小点
  }
  function drawHead() {
    part(); bodyXf();
    B.ell(E, 28, -39, 9.5, 8.5, -0.2, CHIT);                                                                          // 头部
    B.ln(E, 20, -45, 25, -47, CHIT, 8); B.ln(E, 19, -43, 19, -40, CHIT, 7);                                            // 头顶高光
    B.ell(E, 30, -42, 6.2, 5.2, -0.2, CHIT, 1);                                                                       // 眼周的暗面
    B.ln(E, 26, -48, 36, -45, CHIT, 1); B.ln(E, 27, -49, 35, -47, CHIT, 7);                                            // 压低的眉
    B.ln(E, 22, -35, 32, -33, CHIT, 3); B.ln(E, 21, -33, 31, -31.5, CHIT, 6);                                          // 颊下的沟
    for (let i = 0; i < 8; i++) {                                                                                     // 八只眼
      const [x, y, s] = EYES[i], off = i === P.blink || i < P.eout || P.eyes === 1;
      if (off) { B.ln(E, x, y + s - 1, x + s - 1, y + s - 1, CHIT, 4); continue; }
      const hot = P.eyes === 2;
      if (s === 3) { for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) B.px(E, x + i, y + j, EYE, Math.min(4, (hot ? 1 : 0) + (i + j < 2 ? 4 : i + j < 4 ? 3 : 2))); B.px(E, x, y, HOT); }
      else B.px(E, x, y, hot ? HOT : EYEA, hot ? 0 : 3);
    }
    // 金冠：一圈金箍 + 五根尖刺 + 正中的红宝石
    part(); B.poly(E, [[5, -40], [23, -45.5], [24, -42.5], [6, -37.5]], GOLD); B.ln(E, 6, -40, 23, -45, GOLD, 8); B.ln(E, 7, -38, 23, -43, GOLD, 3);
    for (const x of [9, 14, 19]) B.px(E, x, -39.5 - (x - 6) * 0.3, GOLD, 9);
    const SP = [[7.5, 6], [11, 8], [14.5, 10], [18, 9], [21.5, 7]];
    for (const [x, h] of SP) { const y0 = -41 - (x - 5) * 0.3; part(); B.strand(E, [[x, y0], [x - 0.8, y0 - h * 0.55], [x - 2.2, y0 - h]], 1.8, 0.45, GOLD); B.px(E, x - 1, y0 - h * 0.5, GOLD, 8); B.px(E, x, y0 - 1, GOLD, 3); }
    part(); B.ell(E, 14.5, -43, 1.4, 1.4, 0, GEM); B.px(E, 14, -44, GEM, 4); if (P.glow >= 2 || P.eyes === 2) B.px(E, 14.5, -43, HOT);
  }
  function drawLance() {
    part(); bodyXf(); const d = L.sd, pp = [-d[1], d[0]], b = LANCE0, at = (u, v) => [b[0] + d[0] * u + pp[0] * v, b[1] + d[1] * u + pp[1] * v];
    B.strand(E, [at(0, 0), at(7, -0.6), at(14, -0.6), at(19, 0)], 2.6, 0.45, BONE);                                    // 骨白长头刺
    for (let u = 2; u < 17; u += 2) { const p = at(u, -1.6 + u * 0.07); B.px(E, p[0], p[1], BONE, 8); }                 // 刃脊高光
    for (const u of [4, 9]) { const a = at(u, -2.3), c = at(u, 2.3); B.ln(E, a[0], a[1], c[0], c[1], BONE, 3); }        // 骨节
    if (P.glow && MV === 'headSpike' && P.st >= CHARGE && P.st <= RECOVER) { const n = P.glow >= 3 ? 19 : P.glow === 2 ? 13 : 7; for (let u = 19 - n; u <= 19; u++) { const p = at(u, 1.2 - u * 0.05); B.px(E, p[0], p[1], LANCE, u > 16 ? 4 : 3); } }
    part(); B.ell(E, b[0], b[1], 2.4, 1.8, P.sa, GOLD); B.px(E, b[0] - 1, b[1] - 1, GOLD, 8);                             // 金箍
  }
  function drawWeb() {
    if (P.web > 0.05) {
      part(); const c = L.web, r = 3 + 13 * P.web, n = 8, pts = (rr) => { const o = []; for (let i = 0; i < n; i++) { const a = i / n * 6.2832 + 0.2; o.push([c[0] + Math.cos(a) * rr, c[1] + Math.sin(a) * rr * 0.9]); } return o; };
      const out = pts(r); for (const p of out) lnW(c[0], c[1], p[0], p[1], SILK, 3);                                   // 辐射丝
      for (const k of [0.4, 0.72, 1]) { if (P.web < k * 0.7) continue; const q = pts(r * k); for (let i = 0; i < n; i++) { const a = q[i], b = q[(i + 1) % n]; lnW(a[0], a[1], b[0], b[1], SILK, k === 1 ? 4 : 3); } }
      for (const k of ['n1', 'f1', 'n2', 'f2']) lnW(L[k].f[0], L[k].f[1], c[0], c[1], SILK, 2);                          // 挂在四条腿尖上
      px(c[0], c[1], HOT);
    }
    if (P.ball > 0.05) { part(); const c = L.ball, r = 1.5 + 3 * P.ball; dot(c[0], c[1], r, SILK); lnW(c[0] - r, c[1] - 1, c[0] + r, c[1] + 1, SILK, 2); lnW(c[0] - r * 0.6, c[1] + r * 0.6, c[0] + r * 0.6, c[1] - r * 0.7, SILK, 2); px(c[0] - 1, c[1] - 1, SILK, 4); }
    if (P.silk) { part(); const s = L.spin, t = P.web > 0.05 ? L.web : P.ball > 0.05 ? L.ball : [L.spin[0] + 30, L.spin[1] - 20]; if (P.web > 0.05 || P.ball > 0.05) { const mid = [(s[0] + t[0]) / 2, Math.min(s[1], t[1]) - 30]; const cv = B.bez(s, mid, t, 40); for (let i = 0; i < cv.length; i++) if (i & 1) px(cv[i][0], cv[i][1], SILK, i % 4 === 1 ? 4 : 3); } }
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    for (const k of ['f4', 'f3', 'f2', 'f1']) drawLeg(k);
    drawAbdomen(); drawLeg('n4'); drawLeg('n3'); drawThorax(); drawLeg('n2'); drawLeg('n1');
    drawPalp(1); drawChel(1); drawHead(); drawLance(); drawChel(0); drawPalp(0);
    drawWeb();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const W = (p, i) => p[i] * z + (i ? spr.oy : spr.ox);
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    RIM.rimRamp = MV === 'headSpike' && P.st >= CHARGE && P.st <= RECOVER ? BR : (MV === 'bigNet' || MV === 'cocoon') && P.st >= CHARGE && P.st <= RECOVER ? SR : ER;
    LON.length = 0;
    if (P.eout < 8 && P.eyes !== 1) { LIGHT[0].x = W(L.eye, 0); LIGHT[0].y = W(L.eye, 1); LIGHT[0].r = (P.eyes === 2 ? 15 : 8) * z; LIGHT[0].k = P.eyes === 2 ? 0.8 : 0.5; LON.push(LIGHT[0]); }
    if (P.mk) { LIGHT[1].x = W(L.mark, 0); LIGHT[1].y = W(L.mark, 1); LIGHT[1].r = (P.mk === 2 ? 17 : 11) * z; LIGHT[1].k = P.mk === 2 ? 0.7 : 0.45; LON.push(LIGHT[1]); }
    if (P.glow && P.st >= ATTACK && P.st <= RECOVER && P.st !== ATTACK) { const hs = MV === 'headSpike'; LIGHT[2].x = P.fx * z + spr.ox; LIGHT[2].y = P.fy * z + spr.oy; LIGHT[2].r = (6 + P.glow * 5) * z;
      LIGHT[2].ramp = hs ? [BR[1], BR[2], BR[3]] : MV === 'roar' ? [ER[1], ER[2], ER[3]] : [SR[1], SR[2], SR[3]]; LON.push(LIGHT[2]); }
    RIM.lights = LON.length ? LON : null;
    bake(spr, RIM);
  }
  // 立绘：半血怒吼那一刻（后腿站起、前腿全张、毒牙大开、八眼全亮），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 3 / 12, 0); P.glow = 2; P.rim = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; bodyXf(); const c = B.at(24, -39); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'bigNet'; poseAt(IDLE, 0.95, 0); P.eyes = 2; P.mk = 2; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; bodyXf(); const c = B.at(25, -38); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }   // 头像：待机正脸、八眼全亮

  // ───── 特效 ─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  const dirX = () => (P.flip ? -1 : 1);
  let crackT = 9, lastF = -1, dripT = 0, lastTap = 0;
  function strikeFx() {
    const x = sx(L.n1.f[0]), y = sy(L.n1.f[1]);
    fx.slash(sx(L.n1.kn[0]), sy(L.n1.kn[1]), 20, 0.6, 2.6, EYEI, 0.18, 2, 2);
    burst(x, y - 2, 16, 40, 120, 0.2, 0.45, VENI, 26); burst(x, HY - 1, 8, 20, 70, 0.3, 0.5, FXI.dust, 8);
    fx.cross(x, y - 4, 6, VENI, 0.16); fx.crack(x, HY, 8, 1, VENI, 0.6); hitDummy(1, 1); shake(0.15, 2);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'bigNet') {   // 网甩出去：一张大网飞向前方，丝从纺器和腿尖拉直
        const c = [sx(L.n1.f[0]), sy(L.n1.f[1])], tx = c[0] + dirX() * 60;
        fx.circle(tx, c[1] + 6, 20, 14, SILKI, 0.5, 1, 2); fx.circle(tx - dirX() * 16, c[1] + 4, 12, 9, SILKI, 0.35, -1, 2);
        for (let i = -2; i <= 2; i++) fx.link(c[0], c[1], tx, c[1] + 6 + i * 7, SILKI, 0.4, 2);
        fx.link(sx(L.spin[0]), sy(L.spin[1]), c[0], c[1], SILKI, 0.3, 1);
        burst(c[0], c[1], 22, 50, 160, 0.3, 0.6, SILKI, 10); ring(c[0], c[1], 1, SILKI); shake(0.3, 3); flash(0.08);
        sfx('boss', { k: 'spNet', w: 1 }); sfx('swing', { kind: 'throw', w: 0.8 }); sfx('impact', { pal: 'shadow', w: 0.8 });
      } else if (MV === 'headSpike') {   // 整个身子向前一扎：头刺前方一道直线光
        const x = sx(L.tip[0]), y = sy(L.tip[1]);
        fx.beam(x, y, x + dirX() * 90, y, 3, BONEI, 0.3, 2); fx.beam(x, y, x + dirX() * 60, y, 1, EYEI, 0.2, 2); fx.cross(x, y, 9, BONEI, 0.2);
        burst(x, y, 24, 60, 170, 0.2, 0.5, BONEI, 6); for (const k of ['n4', 'f4']) burst(sx(L[k].f[0]), HY - 1, 8, 20, 70, 0.3, 0.6, FXI.dust, 12);
        fx.crack(sx(L.n4.f[0]), HY, 10, -1, EYEI, 0.8); ring(x, y, 0, BONEI); shake(0.35, 3); flash(0.1); hitDummy(1, 1); crackT = 0;
        sfx('boss', { k: 'spSpike', w: 1 }); sfx('hit', { mat: 'flesh', w: 0.8 }); sfx('impact', { pal: 'blood', w: 1 });
      } else if (MV === 'cocoon') {   // 丝团甩出去：一根发光的丝拉向目标
        const c = [sx(L.ball[0]), sy(L.ball[1])], tx = c[0] + dirX() * 70;
        fx.link(sx(L.spin[0]), sy(L.spin[1]), tx, HY - 20, SILKI, 0.5, 2); fx.link(c[0], c[1], tx, HY - 22, SILKI, 0.4, 2);
        for (let i = 0; i < 10; i++) spawnX(K_BURST, c[0], c[1], dirX() * (120 + Math.random() * 60), -30 + Math.random() * 30, 0.4 + Math.random() * 0.2, SILKI, {});
        burst(c[0], c[1], 14, 30, 90, 0.2, 0.4, SILKI, 10); ring(c[0], c[1], 0, SILKI); shake(0.3, 3); flash(0.06);
        sfx('boss', { k: 'spSpin', w: 1 }); sfx('swing', { kind: 'throw', w: 0.8 }); sfx('impact', { pal: 'shadow', w: 0.7 });
      } else {   // 半血怒吼：两道环、八眼红光、一圈丝从身上炸开
        const x = sx(L.eye[0]), y = sy(L.eye[1]);
        ring(x, y, 1, EYEI); ring(sx(-10), HY - 30, 1, SILKI); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 8; i++) { const a = -2.9 + i * 0.4; fx.link(sx(-6), HY - 34, sx(-6) + Math.cos(a) * 60, HY - 34 + Math.sin(a) * 44, SILKI, 0.5, 0); }
        burst(x, y, 30, 60, 180, 0.3, 0.7, EYEI, 20); burst(sx(L.mark[0]), sy(L.mark[1]), 20, 40, 120, 0.3, 0.6, VENI, 20);
        sfx('boss', { k: 'roar', w: 1 }); sfx('boss', { k: 'spScreech', w: 1 }); sfx('impact', { pal: 'blood', w: 0.9 });
      }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === CHARGE) {
      lastF = -1;
      if (MV === 'bigNet' || MV === 'cocoon') sfx('boss', { k: 'spSpin', w: 0.6 });
      else if (MV === 'headSpike') { sfx('boss', { k: 'spHiss', w: 0.9 }); sfx('boss', { k: 'growl', w: 0.5 }); }
      else sfx('boss', { k: 'spHiss', w: 1 });
    }
    if (s === RECOVER && MV === 'roar') sfx('boss', { k: 'spChitter', w: 0.8 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'spHiss', w: 0.5 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'claw', w: 0.95 }); sfx('hit', { mat: 'flesh', w: 0.9 }); sfx('boss', { k: 'spChitter', w: 0.5 }); }
    if (s === CHARGE && MV === 'headSpike' && (t === 0.5 || t === 0.75 || t === 1.0)) { for (const k of ['n4', 'f4']) burst(sx(L[k].f[0]), HY - 1, 6, 20, 60, 0.2, 0.4, FXI.dust, 12); sfx('step', { w: 0.8 }); if (t === 1.0) sfx('boss', { k: 'spChitter', w: 0.7 }); }
    if (s === CHARGE && MV === 'bigNet' && t === 0.5) sfx('boss', { k: 'spChitter', w: 0.6 });
    if (s === CHARGE && MV === 'cocoon' && (t === 0.3 || t === 0.6)) sfx('boss', { k: 'spSpin', w: 0.5 });
    if (s === DEATH && t === INCOMING + 0.3) sfx('boss', { k: 'spDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.05) { for (let i = 0; i < 24; i++) spawn(K_DUST, sx(-40 + Math.random() * 80), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.25, 2); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.3) sfx('boss', { k: 'spChitter', w: 0.6 });
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), HY - 4 - Math.random() * 20, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, i & 1 ? SILKI : VENI); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [0.3, 0.5, 0.6, 0.75, 1.0], [], [], [], [INCOMING + 0.3, INCOMING + 1.05, INCOMING + 1.3, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    crackT += dt; dripT += dt;
    if (state === MOVE) {   // 交替四足步：每组落脚时脚下扬一点灰，咔哒一声
      const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f; if (f === 0 || f === 4) { const grp = f === 0 ? GA : GB;
        for (const k of grp) if (k[0] === 'n') for (let i = 0; i < 2; i++) spawn(K_DUST, sx(L[k].f[0]) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -3 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);
        sfx('step', { w: 0.5 }); sfx('boss', { k: 'spSkitter', w: 0.5 }); } }
    }
    if (state === IDLE && P.tap && lastTap === 0) { const x = sx(L.n1.f[0]); burst(x, HY - 1, 5, 15, 40, 0.2, 0.35, FXI.dust, 8); sfx('step', { w: 0.5 }); }
    lastTap = P.tap;
    if (state === CHARGE && Math.random() < 0.45) {   // 蓄力：丝 / 骨光 / 红光从四周汇向发光体
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy), rp = MV === 'headSpike' ? BONEI : MV === 'roar' ? EYEI : SILKI;
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, rp, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (P.ven && dripT > 0.9 && (state === IDLE || state === CHARGE) && Math.random() < 0.08) {   // 毒牙上挂着的毒液滴下来
      dripT = 0; spawnX(K_PHYS, sx(L.fang[0]), sy(L.fang[1]) + 1, 0, 8, 1.2, VENI, { g: 220, floor: HY, age0: 0.2 });
    }
    if ((state === IDLE || state === MOVE) && Math.random() < 0.05) spawn(K_EMBER, sx(L.mark[0] + (Math.random() - 0.5) * 12), sy(L.mark[1] - 4), (Math.random() - 0.5) * 6, -10, 0.4, VENI);   // 骷髅纹上飘起的暗红光点
    if (crackT < 1.0 && Math.random() < 0.35) spawn(K_EMBER, sx(L.n4.f[0]) + (Math.random() - 0.5) * 24, HY - 1, 0, -10 - Math.random() * 8, 0.3, EYEI);
  }
  function fxReset() { crackT = 9; lastF = -1; dripT = 0; lastTap = 0; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx), R = MV === 'headSpike' ? BR : MV === 'roar' ? ER : SR; for (let dx = -10; dx <= 10; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, R[Math.abs(dx) < 4 ? 2 : 3]); }
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'bigNet'; return MVDUR[MV]; }

  // 自己的声音（在 BOSSV 里按名字找）：嘶嘶声、毒牙咔哒、抽丝、甩网、头刺、尖啸、碎步、死前的长嘶
  const VOICES = {
    spHiss: (s, t, w, p) => { s.nz(t, 0.7, 'highpass', 3200, 0.8, 0.07 * w, { a: 0.06, to: 5200, pan: p }); s.nz(t, 0.6, 'bandpass', 1800, 2, 0.03 * w, { a: 0.1, pan: p }); },
    spChitter: (s, t, w, p) => { for (let i = 0; i < 7; i++) { s.nz(t + i * 0.045 + s.rnd(0, 0.01), 0.02, 'bandpass', s.rnd(2600, 4200), 3, 0.05 * w, { pan: p }); s.ring(t + i * 0.045, s.rnd(1800, 2600), 0.03, 0.012 * w, { pan: p }); } },
    spSpin: (s, t, w, p) => { s.nz(t, 0.45, 'bandpass', 2200, 4, 0.05 * w, { to: 4200, pan: p }); s.riser(t, t + 0.45, 400, 1600, 0.02 * w, { pan: p }); for (let i = 0; i < 4; i++) s.ring(t + 0.08 + i * 0.09, 2400 + i * 300, 0.1, 0.012 * w, { pan: p }); },
    spNet: (s, t, w, p) => { s.whoosh(t, 0.35, 400, 2600, 0.1 * w, { pan: p }); s.tone(t + 0.05, 'triangle', 180, 0.3, 0.05 * w, { to: 90, vib: [18, 20, 0.02], pan: p }); s.nz(t, 0.4, 'bandpass', 3000, 3, 0.04 * w, { to: 1200, pan: p }); },
    spSpike: (s, t, w, p) => { s.whoosh(t, 0.18, 900, 4200, 0.09 * w, { pan: p }); s.thud(t + 0.05, 150, 60, 0.18, 0.16 * w, { pan: p }); s.ring(t + 0.05, 1300, 0.35, 0.04 * w, { pan: p, parts: [[1, 1], [2.3, 0.4]] }); s.nz(t + 0.05, 0.08, 'bandpass', 1200, 2, 0.06 * w, { pan: p }); },
    spScreech: (s, t, w, p) => { s.tone(t, 'sawtooth', 1400, 1.1, 0.04 + 0.02 * w, { to: 700, vib: [14, 120, 0.05], lp: 4200, pan: p, rev: 0.5 }); s.nz(t, 1.2, 'highpass', 3600, 0.8, 0.06 * w, { a: 0.05, to: 2400, pan: p, rev: 0.4 });
      for (let i = 0; i < 10; i++) s.nz(t + 0.9 + i * 0.04, 0.02, 'bandpass', s.rnd(2500, 4200), 3, 0.03 * w, { pan: p }); },
    spSkitter: (s, t, w, p) => { for (let i = 0; i < 4; i++) s.nz(t + i * 0.03 + s.rnd(0, 0.01), 0.015, 'bandpass', s.rnd(1400, 2600), 3, 0.035 * w, { pan: p }); },
    spDie: (s, t, w, p) => { s.nz(t, 1.3, 'highpass', 4200, 0.8, 0.06 * w, { a: 0.05, to: 1400, pan: p, rev: 0.5 }); s.tone(t, 'sawtooth', 900, 1.2, 0.035 * w, { to: 160, vib: [10, 90, 0.2], lp: 2600, pan: p, rev: 0.5 });
      for (let i = 0; i < 8; i++) s.nz(t + 0.4 + i * 0.09 + s.rnd(0, 0.03), 0.02, 'bandpass', s.rnd(1600, 3000), 3, 0.03 * w, { pan: p }); },
  };

  return {
    name: '蛛皇', HX, R_EL: EYEI, DUR, hero, P, GLOW_MATS: FLATS, HIT_POINT: [4, -36], EVENTS, MAX_H: 88, OWN_MAX: 60, SHEET_K: 3, VOICES,
    SFX: { body: 'beast', how: 'topple', pal: 'blood', style: 'shadow', w: 1 },
    MOVES: ['bigNet', 'headSpike', 'cocoon', 'roar'], MOVE_NAMES: { bigNet: '大网', headSpike: '头刺', cocoon: '结茧', roar: '结茧（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.25, 1.43, 1.6, 2.1, 2.3]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0.05, 0.2, 0.4, 0.6, 0.85], 'bigNet'], [CAST, [0, 1 / 12, 3 / 12], 'bigNet'], [RECOVER, [0.1, 0.3, 0.5], 'bigNet'],
      [CHARGE, [0.1, 0.3, 0.55, 0.85, 1.0], 'headSpike'], [CAST, [0, 2 / 12], 'headSpike'], [RECOVER, [0.15, 0.35, 0.55], 'headSpike'],
      [CHARGE, [0.1, 0.25, 0.4, 0.55, 0.7], 'cocoon'], [CAST, [0, 1 / 12, 3 / 12], 'cocoon'], [RECOVER, [0.15, 0.4], 'cocoon'],
      [CHARGE, [0.1, 0.3, 0.45], 'roar'], [CAST, [0, 2 / 12, 0.5], 'roar'], [RECOVER, [0.15, 0.35]],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.6, 0.9, 1.1, 1.35, 1.5, 1.7, 2.0, 2.3, 2.6]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
