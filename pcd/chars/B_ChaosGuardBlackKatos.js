// 黑卡托斯（小首领，第八章「炼狱深处」）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js / B_ChaosButcher.js。
// 依据：附录 G2「重甲大剑巨人」；被动 荆棘甲（近战普攻它反弹 60%）；招式 chaosCleave 混沌斩（大扇形、打飞近战）、
//       command 号令（召 2 个军团卫士贴身护着它）；半血 roar 反伤加倍（反弹升到 80%）。
// 设定卡 ——
//   剪影：炼狱最深处的混沌卫士，一个修长、倒三角的黑甲骑士（身体约 66 格高）：宽胸窄腰、长腿，两肩一对层叠的尖刺大肩甲，
//         膝和肘都带往外的尖刺（荆棘甲），背后一件长到脚踝、下摆撕成一条条的黑红披风，后颈竖着一圈尖领。
//   脸（识别点）：一顶封闭的尖颚大盔，两侧一对往后、再往上往前弯的黑曜石大角（像一对弯月）；盔前一道 T 字形的目缝：
//         横缝亮紫、中心发白，竖缝暗红。待机时缝里的光一明一暗，抬头时会从缝里呼出一口紫色的混沌烟。
//   武器：一把和它差不多高的混沌巨剑：蝙蝠翼一样往前翻的护手、刺球柄头嵌一颗紫晶，剑脊靠护手一段是锯齿，
//         血槽里六个熔岩红的符文；平时剑尖插进地里、双手按在柄头上站岗（插地的地方冒着红光）。
//   主色：黑曜石的甲（压得很暗、带一点紫）+ 黑红披风 + 混沌紫的光 + 熔岩红的符文；紫色轮廓光。
//   招式（setMove）：
//     chaosCleave 混沌斩：把剑从地里拔出来、双手横握拖到身后，压低身子拧腰（符文从护手往剑尖一个个点亮、刃口变紫、全身在抖）
//                   → 往前一个大跨步横扫出去（紫 + 红两道大弧、贴地推出去的紫浪、地裂）→ 收势、把剑重新插回地里。
//     command 号令：远手按住插在地上的剑，近手握拳高举过头（拳头上聚起紫光，胸口的混沌徽亮起来）
//                   → 把剑往地里再砸深一截、近手往前一指：左右两边的地面撕开两道紫色的裂隙（军团卫士从里面出来）→ 放下手。
//     roar 反伤加倍：先缩成一团（两帧）→ 挺胸仰头、两臂张开怒吼，全身的尖刺一下子长长一截、烧成熔岩红（两道光环、碎刺四溅）
//                   → 抖着站稳，再把剑插回地里。游戏从 cast 开始播，cast + recover 约 1.35 秒。
//   待机：两档呼吸、披风轻摆，符文偶尔闪一下；个性动作是抬头，剑上的符文从剑尖往护手一路烧亮，胸口的徽亮起、目缝里呼出一口紫烟。
//   移动：把剑扛在肩上，重甲的大步，12 帧一圈，披风往后飘，每一步地上一声闷响加甲片碰撞。
//   死亡：挨打晃一下 → 单膝跪地、双手还按着剑 → 目缝闪两下熄灭、符文一个个灭掉、甲缝里漏出紫烟 → 手一松，往后仰倒；
//         剑留在原地插着，像一块墓碑 → 化成紫色的光点。
PCD.define('B_ChaosGuardBlackKatos', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, PI = Math.PI;

  // ───── 材质（11 级，暗 → 亮）：甲压得很暗、只带一点紫，目缝、符文和紫光才亮得出来 ─────
  const R_PLATE = ['#040307', '#0a0810', '#110e18', '#181421', '#201b2b', '#292236', '#332a42', '#3e344f', '#4b3f5f', '#5b4d72', '#6f618a'];   // 黑曜石甲
  const R_CAPE = ['#050203', '#0c0507', '#15080c', '#1e0b11', '#280e16', '#32121c', '#3d1622', '#491b29', '#562131', '#642839', '#733042'];    // 黑红披风
  const R_BLADE = ['#030406', '#080a0e', '#0f1117', '#161920', '#1f232b', '#282d37', '#333944', '#3f4552', '#4c5362', '#5b6274', '#6d7488'];   // 剑身的黑钢
  const PLATE = defDeep(R_PLATE, { depth: 8, dark: 1, amb: 0.12 }), PLATEL = defDeep(R_PLATE, { depth: 5, dark: 1, amb: 0.12 }), PLATED = defDeep(R_PLATE, { depth: 5, dark: 3, amb: 0.08 });
  const CAPE = defDeep(R_CAPE, { depth: 5, amb: 0.14 }), CAPED = defDeep(R_CAPE, { depth: 3, dark: 3, amb: 0.08 });
  const BLADE = defDeep(R_BLADE, { depth: 2, amb: 0.25 }), EDGE = defDeep('bladesteel', { depth: 1, dark: 1, amb: 0.3 });
  const HORN = defDeep('obsidian', { depth: 3, amb: 0.2 }), HORND = defDeep('obsidian', { depth: 2, dark: 3, amb: 0.12 });
  const LEATH = defDeep('hide', { depth: 2, dark: 3, amb: 0.1 }), SKULL = defDeep('ivory', { depth: 1, dark: 2, amb: 0.3 });
  const CH = fxRamp('bkChaos', ['#ffffff', '#ecc8ff', '#b660ff', '#6c24b8', '#2a0a4c']), CR = FXR[CH];                 // 混沌紫：白 → 淡紫 → 紫 → 深紫
  const EM = fxRamp('bkEmber', ['#fff2c4', '#ffb444', '#ff4c1c', '#b01a0a', '#420806']), ER = FXR[EM];                 // 熔岩红：白 → 橙 → 红 → 暗红
  const VIS = defMat([CR[3], CR[2], CR[2], CR[2]], 1, 1), VISC = defMat([CR[2], CR[1], CR[1], CR[1]], 1, 1), VISR = defMat([ER[4], ER[3], ER[2], ER[2]], 1, 1);
  const RUNE = defMat([ER[4], ER[3], ER[2], ER[2]], 1, 1), RUNEH = defMat([ER[3], ER[1], ER[1], ER[1]], 1, 1), EDGEG = defMat([CR[3], CR[1], CR[1], CR[0]], 1, 1);
  const hero = new Sprite(184, 128, 84, 116);
  const DUR = [3.0, 1.0, 0.8, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { chaosCleave: { 3: 1.2, 4: 0.4, 5: 0.8 }, command: { 3: 1.0, 4: 0.5, 5: 0.7 }, roar: { 3: 0.5, 4: 0.65, 5: 0.7 } };
  let MV = 'chaosCleave';
  const HX = 70;
  const LR_EM = [ER[1], ER[2], ER[3]], LR_CH = [CR[1], CR[2], CR[3]];
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: LR_EM, k: 0.5 }, { x: 0, y: 0, r: 0, ramp: LR_CH, k: 0.5 }];
  const RIM_R = [0, 12, 18, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: CR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of [VIS, VISC, VISR, RUNE, RUNEH, EDGEG]) RIM.skip[m] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  // 上身绕胯（HIP）前后倾 P.lean；头绕脖子 P.hd。脚踝是绝对坐标；手是上身坐标。
  // 剑：cm 0 = 在近手里（角度 ca 跟着上身转）；cm 1 = 插在地上的 cc（世界角度 ca），hold 1 近手握柄 / 2 远手握柄 / 0 松手；two = 远手也握在柄上。
  const HIP = [0, -27], NECK = [4, -51], LN = [3, -27], LF = [-4, -27], SHN = [11, -48], SHF = [-5, -48];
  const UA = 12.5, FA = 12, TH = 13, SH = 13.5;
  const RU = [8, 13, 18, 23, 28, 33];                                                                                  // 血槽里六个符文（从护手往剑尖）
  const D0 = { bx: 0, by: 0, lean: 0, hd: 0, cape: 0, ca: PI / 2, sk: 0, fn: [8, -3], ff: [-8, -3], hn: [17, -36], hf: [-6, -26], cc: [17, -36],
    cm: 1, hold: 1, two: 1, sb: 0, ebn: 1, ebf: 1 };
  const K = {
    idle: {},
    look: { hd: -0.15, lean: -0.03 },                                                                                  // 待机：抬头
    walk: { cm: 0, two: 0, sb: 1, hn: [14, -40], ca: -PI + 0.45, hf: [-6, -27], lean: 0.06, hd: 0.03, cape: 2 },      // 剑扛在肩上
    aWind: { cm: 0, two: 1, sb: 1, hn: [-4, -54], ca: -PI + 0.5, lean: -0.12, by: 1, hd: -0.1, fn: [12, -3], ff: [-10, -3], cape: -1 },   // 普攻：剑抡到肩后
    aStrike: { cm: 0, two: 1, hn: [26, -38], ca: 0.25, lean: 0.22, bx: 4, by: 3, hd: 0.12, fn: [16, -3], ff: [-8, -3], cape: 2 },
    aFollow: { cm: 0, two: 1, hn: [22, -28], ca: 0.8, lean: 0.28, bx: 4, by: 4, hd: 0.14, fn: [16, -3], ff: [-8, -3], cape: 2 },
    cWind: { cm: 0, two: 1, sb: 1, hn: [-8, -40], ca: PI + 0.5, lean: -0.22, bx: -2, by: 5, hd: 0.1, fn: [15, -3], ff: [-13, -3], cape: -2 },   // 混沌斩：横拖到身后
    cSweep: { cm: 0, two: 1, hn: [30, -38], ca: -0.12, lean: 0.25, bx: 6, by: 3, hd: 0.08, fn: [21, -3], ff: [-10, -3], cape: 3 },
    cFollow: { cm: 0, two: 1, hn: [24, -30], ca: 0.95, lean: 0.3, bx: 5, by: 4, hd: 0.14, fn: [20, -3], ff: [-10, -3], cape: 2 },
    mRaise: { hold: 2, two: 0, hn: [10, -74], ebn: -1, cc: [16, -36], hd: -0.22, lean: -0.06, fn: [9, -3], ff: [-9, -3] },   // 号令：拳头高举
    mPoint: { hold: 2, two: 0, hn: [32, -50], cc: [16, -34], hd: 0.04, lean: 0.1, bx: 1, by: 1, fn: [11, -3], ff: [-9, -3], cape: 2 },
    rCurl: { cm: 0, two: 0, hn: [18, -30], ca: 0.35, hf: [8, -34], lean: 0.28, by: 4, hd: 0.32, fn: [11, -3], ff: [-9, -3] },   // 怒吼：缩成一团
    rRoar: { cm: 0, two: 0, hn: [27, -40], ca: 0.75, hf: [-20, -58], ebf: -1, lean: -0.2, hd: -0.38, fn: [14, -3], ff: [-11, -3], cape: 3 },
    hurt: { lean: -0.18, bx: -3, hd: -0.26, cape: -2 },
    dStag: { lean: -0.12, bx: -2, hd: 0.25 },
    dKneel: { by: 11, lean: 0.18, hd: 0.45, fn: [12, -3], ff: [-15, -1], cape: 1 },                                   // 单膝跪地，手还按着剑
    dFall: { hold: 0, two: 0, by: 17, lean: -1.2, hd: -0.3, hn: [16, -22], hf: [6, -30], fn: [12, -3], ff: [2, -2], cape: -3 },   // 往后仰倒，剑留在原地
  };
  const NUM = ['bx', 'by', 'lean', 'hd', 'cape', 'ca', 'sk'], VEC = ['fn', 'ff', 'hn', 'hf', 'cc'], DIS = ['cm', 'hold', 'two', 'sb', 'ebn', 'ebf'];

  const P = {};
  const FIELDS = ['st', ...NUM, 'fnx', 'fny', 'ffx', 'ffy', 'hnx', 'hny', 'hfx', 'hfy', 'ccx', 'ccy', ...DIS, 'eyes', 'glow', 'rim', 'flash', 'dq', 'rune', 'hot', 'sig', 'th', 'edg', 'puff', 'leak', 'fist'];
  function base() { P.st = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.rune = 6; P.hot = -1; P.sig = 1; P.th = 0; P.edg = 0; P.puff = 0; P.leak = 0; P.fist = 0; P.mx = 0; P.flip = 0; setK(K.idle, K.idle, 0); }
  const val = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of NUM) { const va = val(a, f); P[f] = va + (val(b, f) - va) * q; }
    for (const f of VEC) { const va = val(a, f), vb = val(b, f); P[f + 'x'] = va[0] + (vb[0] - va[0]) * q; P[f + 'y'] = va[1] + (vb[1] - va[1]) * q; }
    for (const f of DIS) P[f] = q < 0.5 ? val(a, f) : val(b, f);
  }
  // 重甲的大步：12 帧一圈（1 秒）。脚：支撑 7 帧往后滑，摆动 5 帧抬起；两脚差半圈
  const foot = (p) => { p = ((p % 1) + 1) % 1; if (p < 0.58) return [7 - 14 * p / 0.58, 0]; const q = (p - 0.58) / 0.42; return [-7 + 14 * q, Math.round(6 * Math.sin(PI * q))]; };
  const W_BY = [2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1];
  function walk(f) {
    f = ((f % 12) + 12) % 12; setK(K.walk, K.walk, 0);
    const a = foot(f / 12), b = foot(f / 12 + 0.5); P.fnx = 8 + a[0]; P.fny = -3 - a[1]; P.ffx = -8 + b[0]; P.ffy = -3 - b[1];
    P.by = W_BY[f]; P.lean = 0.06 + (W_BY[f] === 2 ? 0.02 : 0); P.hd = 0.03 - (W_BY[f] === 2 ? 0.05 : 0);
    P.hfx += a[0] * 0.8; P.hfy -= Math.abs(a[0]) * 0.15; P.hny += W_BY[f] * 0.5; P.cape = 2 + (f % 6 < 3 ? 1 : 0); P.sk = -a[0] * 0.2;
  }
  const trem = (f12, a) => { const s = f12 & 1 ? 1 : -1; P.bx += s * a * 0.5; P.hny += s * a * 0.5; P.hfy -= s * a * 0.5; };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.cape = [0, 1, 1, 0, -1, -1][Math.floor(tt / 0.35) % 6]; P.glow = 1;
      if ((f12 % 13) === 5) P.rune = 5;                                                                               // 符文偶尔闪一下
      if ((f12 % 17) === 9) P.eyes = 1;                                                                               // 目缝的光一暗
      const lp = tt % DUR[IDLE];
      if (lp >= 1.5 && lp < 2.7) {                                                                                    // 待机个性：抬头，符文从剑尖烧到护手，呼出一口紫烟
        const k = lp - 1.5, q = k < 0.2 ? ease.out(k / 0.2) : k > 1.0 ? 1 - ease.in((k - 1.0) / 0.2) : 1; setK(K.idle, K.look, q); P.by += b;
        if (k >= 0.2 && k < 0.7) { P.hot = 5 - Math.floor((k - 0.2) * 12); P.eyes = 0; }
        else if (k >= 0.7 && k < 1.0) { P.glow = 2; P.sig = 2; P.eyes = 2; P.rim = 1; P.hot = 9; P.puff = k < 0.8 ? 1 : 0; }
      }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 16, -1); P.mx = w.mx; P.flip = w.flip; P.glow = 1; }
    else if (st === ATTACK) {
      if (tq < 0.25) { const q = ease.out(tq / 0.25); setK(K.idle, K.aWind, q); P.glow = 1; P.eyes = 2; }
      else if (tq < T_STRIKE) { setK(K.aWind, K.aWind, 0); P.glow = 2; P.rim = 1; P.eyes = 2; P.hny -= 1; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.aStrike, K.aStrike, 0); P.glow = 3; P.rim = 2; P.eyes = 2; P.sig = 2; }
      else if (tq < 0.5) { const q = ease.out((tq - T_STRIKE - 1 / 12) / (0.5 - T_STRIKE - 1 / 12)); setK(K.aStrike, K.aFollow, q); P.glow = 2; P.rim = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.25)); setK(K.aFollow, K.idle, q); P.glow = 1; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.th = 1; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); setK(K.hurt, K.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.cape = Math.round(P.cape); geo(); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { chaosCleave: 0, command: 1, roar: 2 };
  const T_STRIKE = 4 / 12;
  const seg = (tq, t0, t1, e) => (e || ease.inOut)(clamp01((tq - t0) / (t1 - t0)));
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'chaosCleave') {
      if (st === CHARGE) {                                                                                             // 拔剑、横拖到身后，符文一个个点亮，刃口变紫
        setK(K.idle, K.cWind, seg(tq, 0, 0.35, ease.out)); if (tq > 0.35) trem(f12, tq > 0.8 ? 1.6 : 1);
        P.rune = Math.min(6, Math.floor(tq / 0.1)); P.edg = tq > 0.55 ? 1 : 0; P.glow = tq < 0.3 ? 1 : 2 + (tq > 0.7 ? sh : 0); P.rim = tq > 0.35 ? 2 : 1; P.eyes = 2; P.sig = tq > 0.5 ? 2 : 1;
      } else if (st === CAST) { setK(K.cSweep, K.cSweep, 0); if (tq < 2 / 12) P.by += sh; P.edg = 1; P.glow = tq < 0.2 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.sig = 2; }
      else {                                                                                                           // 收势，剑插回地里
        if (tq < 0.15) setK(K.cSweep, K.cFollow, seg(tq, 0, 0.15, ease.out));
        else if (tq < 0.35) setK(K.cFollow, K.cFollow, 0);
        else setK(K.cFollow, K.idle, seg(tq, 0.35, 0.55, ease.in));
        P.glow = tq < 0.3 ? 2 : 1; P.edg = tq < 0.2 ? 1 : 0; P.eyes = tq < 0.3 ? 2 : 0;
      }
    } else if (MV === 'command') {
      if (st === CHARGE) {                                                                                             // 远手按剑，近手握拳高举，拳上聚起紫光
        setK(K.idle, K.mRaise, seg(tq, 0, 0.3, ease.out)); if (tq > 0.45) trem(f12, 0.8);
        P.fist = tq > 0.25 ? 1 + (tq > 0.6 ? sh : 0) : 0; P.glow = tq < 0.3 ? 1 : 2 + (tq > 0.7 ? sh : 0); P.rim = tq > 0.3 ? 2 : 1; P.eyes = 2; P.sig = tq > 0.4 ? 2 : 1;
      } else if (st === CAST) { setK(K.mRaise, K.mPoint, seg(tq, 0, 1 / 12, ease.out)); P.fist = 2; P.glow = 3; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.sig = 2; }
      else {
        if (tq < 0.35) setK(K.mPoint, K.mPoint, 0); else setK(K.mPoint, K.idle, seg(tq, 0.35, 0.6));
        P.fist = tq < 0.2 ? 1 : 0; P.glow = tq < 0.3 ? 2 : 1; P.eyes = tq < 0.35 ? 2 : 0;
      }
    } else {   // roar：反伤加倍
      if (st === CHARGE) { setK(K.idle, K.rCurl, seg(tq, 0, 0.3, ease.out)); P.th = 1; P.eyes = 1; P.glow = 1; }
      else if (st === CAST) {
        if (tq < 2 / 12) { setK(K.idle, K.rCurl, seg(tq, 0, 2 / 12, ease.out)); P.th = 1; P.eyes = 1; P.glow = 1; }
        else { setK(K.rRoar, K.rRoar, 0); if (tq > 0.3) trem(f12, 1.2); P.th = 2; P.eyes = 2; P.glow = 3; P.sig = 2; P.rim = tq < 3 / 12 ? 3 : 2; }
      } else {
        if (tq < 0.35) { setK(K.rRoar, K.rRoar, 0); trem(f12, 1); } else setK(K.rRoar, K.idle, seg(tq, 0.35, 0.55));
        P.th = tq < 0.4 ? 2 : 1; P.eyes = tq < 0.4 ? 2 : 0; P.glow = tq < 0.35 ? 3 : 1; P.sig = 2; P.rim = tq < 0.35 ? 2 : 0;
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; return; }
    if (d < 0.6) { setK(K.hurt, K.dStag, seg(d, 0.3, 0.5, ease.out)); P.eyes = 1; return; }                            // 晃一下
    if (d < 1.5) {                                                                                                    // 单膝跪地，目缝闪两下熄灭，符文一个个灭
      setK(K.dStag, K.dKneel, seg(d, 0.6, 0.78, ease.in)); if (d > 0.78 && d < 0.86) P.by += 1;
      P.eyes = d < 1.1 ? 1 : d < 1.3 ? ((f12 & 1) ? 3 : 1) : 3; P.rune = Math.max(0, 6 - Math.floor(Math.max(0, d - 0.9) * 12)); P.glow = P.rune ? 1 : 0; P.sig = d < 1.2 ? 1 : 0; P.leak = d > 1.0 ? 1 : 0;
      if (d > 1.3) P.hd += 0.08;
      return;
    }
    setK(K.dKneel, K.dFall, seg(d, 1.5, 1.75, ease.in)); P.eyes = 3; P.rune = 0; P.sig = 0; P.leak = 1;                 // 往后仰倒，剑留在原地
    if (d > 1.75 && d < 1.85) P.by -= 1;
    if (d > 1.95) P.dq = Math.round(clamp01((d - 1.95) / 0.6) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(HIP[0], HIP[1], P.lean); }
  function headXf() { bodyXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function limb(r, tgt, l1, l2, bend) { const kn = B.ik(r, tgt, l1, l2, bend), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; return [kn, [kn[0] + (tgt[0] - kn[0]) / dd * Math.min(dd, l2), kn[1] + (tgt[1] - kn[1]) / dd * Math.min(dd, l2)]]; }
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  function geo() {
    bodyXf();
    const rn = B.at(LN[0], LN[1]), rf = B.at(LF[0], LF[1]); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.chest = B.at(8, -41);
    let hnT = B.at(P.hnx, P.hny), hfT = B.at(P.hfx, P.hfy);
    headXf(); L.head = B.at(6, -60); L.eye = B.at(12, -60); B.reset();
    [L.kn, L.an] = limb(rn, [P.fnx, P.fny], TH, SH, -1); [L.kf, L.af] = limb(rf, [P.ffx, P.ffy], TH, SH, -1); L.rn = rn; L.rf = rf;
    let a, g = null;
    if (P.cm === 1) { a = P.ca; g = [P.ccx, P.ccy]; if (P.hold === 1) hnT = g; else if (P.hold === 2) hfT = g; } else a = P.ca + P.lean;
    const d = [Math.cos(a), Math.sin(a)];
    [L.en, L.hn] = limb(L.shN, hnT, UA, FA, P.ebn);
    if (!g) g = L.hn;
    if (P.two && (P.cm === 0 || P.hold === 1)) hfT = [g[0] - d[0] * 5, g[1] - d[1] * 5];
    [L.ef, L.hf] = limb(L.shF, hfT, UA, FA, P.ebf);
    L.sg = g; L.sd = d; L.smid = [g[0] + d[0] * 24, g[1] + d[1] * 24]; L.stip = [g[0] + d[0] * 44, g[1] + d[1] * 44];
    L.sul = d[1] > 0.05 ? Math.min(44, (0.5 - g[1]) / d[1]) : 44;                                                     // 剑身画到地面为止（插在地里）
  }
  // 蓄力汇聚点：号令是举起的拳头，怒吼是胸口的混沌徽，其余是剑身
  function focus() {
    const f = MV === 'command' && (P.st === CHARGE || P.st === CAST) ? L.hn : MV === 'roar' && P.st >= CHARGE && P.st <= RECOVER ? L.chest : L.smid;
    P.fx = f[0]; P.fy = f[1]; P.gx = f[0]; P.gy = f[1];
  }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  // 荆棘甲的尖刺：从 (x, y) 沿方向 (dx, dy) 长 len，半血怒吼时长长一截、尖上烧红
  function spike(x, y, dx, dy, len, r, m, far) {
    const k = P.th === 2 ? 1.5 : 1, n = Math.hypot(dx, dy) || 1, ux = dx / n, uy = dy / n, e = [x + ux * len * k, y + uy * len * k];
    capW(x, y, e[0], e[1], r, 0.4, m); px(x + ux * len * k * 0.4 - uy, y + uy * len * k * 0.4 + ux, m, far ? 4 : 8);
    if (P.th) { px(e[0], e[1], P.th === 2 ? RUNEH : RUNE); if (P.th === 2) px(e[0] - ux, e[1] - uy, RUNE); } else px(e[0], e[1], m, far ? 5 : 9);
  }

  function drawCape() {
    part(); bodyXf(); const s = P.cape;
    B.poly(E, [[3, -50], [-3, -51.5], [-9, -49], [-13, -41], [-16 - s * 0.4, -29], [-19 - s * 0.8, -16], [-23 - s * 1.2, -2],
      [-20 - s, -6], [-18 - s, -1], [-15 - s * 0.8, -7], [-12 - s * 0.7, -1.5], [-9 - s * 0.5, -8], [-6 - s * 0.4, -2.5], [-3 - s * 0.2, -9], [-1, -14], [-2, -26], [0, -38], [3, -46]], CAPE);
    B.ln(E, -6, -46, -12 - s * 0.6, -10, CAPE, 3); B.ln(E, -9, -45, -16 - s, -9, CAPE, 7); B.ln(E, -3, -40, -6 - s * 0.4, -11, CAPE, 3); B.ln(E, -11, -42, -19 - s, -6, CAPE, 3);   // 褶
    B.ln(E, -4, -47, -10, -45, CAPE, 8);
    for (const [x, y] of [[-14, -20], [-9, -15], [-17, -12]]) B.px(E, x - s * 0.6, y, CAPE, 1);                                           // 破洞
    for (const [x, y] of [[-20, -5], [-15, -6], [-9, -7], [-3, -8]]) B.px(E, x - s * 0.8, y, CAPE, 8);                                    // 下摆里衬的红边
  }
  function drawLeg(k, far) {
    const r = L['r' + k], kn = L['k' + k], an = L['a' + k], m = far ? PLATED : PLATEL;
    part(); capW(r[0], r[1], kn[0], kn[1], 5, 4, m);                                                                   // 腿甲
    if (!far) { const c = lerp(r, kn, 0.5); lnW(c[0] - 3, c[1] - 1, c[0] + 3, c[1] - 2, m, 3); lnW(c[0] - 3, c[1], c[0] + 3, c[1] - 1, m, 7); }
    part(); capW(kn[0], kn[1], an[0], an[1], 3.8, 3.1, m);                                                             // 胫甲
    const v = [an[0] - kn[0], an[1] - kn[1]], vl = Math.hypot(v[0], v[1]) || 1, nx = v[1] / vl, ny = -v[0] / vl;          // 小腿朝前的法线
    lnW(kn[0] + nx * 2.4, kn[1] + ny * 2.4 + 2, an[0] + nx * 2, an[1] + ny * 2 - 2, m, far ? 6 : 8);
    part(); dot(kn[0], kn[1], 3.9, m); px(kn[0] - 1, kn[1] - 2, m, far ? 6 : 9); spike(kn[0] + nx * 2.5, kn[1] + ny * 2.5 - 1, nx * 2 - v[0] / vl * 0.6, ny * 2 - 1.2, 4.5, 1.5, m, far);   // 护膝 + 刺
    // 尖头铁靴
    const ax = Math.round(an[0]), ay = Math.round(an[1]);
    part(); polyW([[ax - 4, ay - 3], [ax + 3, ay - 3.5], [ax + 7, ay - 1], [ax + 10, ay + 2], [ax + 10, ay + 3], [ax - 4, ay + 3]], m);
    lnW(ax - 4, ay + 3, ax + 10, ay + 3, m, far ? 1 : 2); lnW(ax + 1, ay - 3, ax + 2, ay + 2, m, 3); lnW(ax + 4, ay - 2, ax + 5, ay + 2, m, 3); px(ax + 8, ay + 1, m, far ? 6 : 9);
    px(ax - 5, ay + 1, m, 4); px(ax - 6, ay + 2, m, 6);                                                                // 靴跟的马刺
  }
  function drawTorso() {
    part(); bodyXf(); const s = P.sk;
    // 背后的甲裙
    B.poly(E, [[-9, -28], [1, -28], [1, -18], [-2, -15.5], [-4.5, -19], [-7, -15], [-10, -19.5]], PLATED); B.ln(E, -9, -23, 1, -23, PLATED, 3);
    part(); B.ell(E, -2, -41, 8.5, 8.5, 0, PLATE); B.ell(E, 5, -42, 10.5, 8.5, -0.1, PLATE);                               // 背甲、胸甲（宽胸）
    B.poly(E, [[-7, -27], [7, -27], [11, -34], [14, -40], [-8, -40]], PLATE); B.cap(E, 1, -46, 4, -50, 6, 4.5, PLATE);     // 窄腰、上胸到脖子
    B.ln(E, 14, -45, 13, -36, PLATE, 8); B.ln(E, -2, -49, 7, -50, PLATE, 8); B.ln(E, -9, -44, -8, -36, PLATE, 3);          // 胸前的脊、肩上的高光、背侧
    B.ln(E, -7, -35, 12, -34, PLATE, 2); B.ln(E, -7, -32, 10, -31, PLATE, 3); B.ln(E, -7, -33, 10, -32, PLATE, 7);          // 胸甲下缘、腹甲的甲片
    for (const [x, y] of [[-5, -44], [-6, -38], [11, -38]]) B.px(E, x, y, PLATE, 9);                                     // 铆钉
    // 胸口的混沌徽：八个尖的星（亮度随 P.sig）
    const sg = P.sig, SM = sg >= 2 ? RUNEH : sg ? RUNE : PLATE, st = sg ? 0 : 2, cx = 5, cy = -37;
    for (const [dx, dy] of [[0, 0], [0, -1], [0, -2], [0, 1], [0, 2], [-1, 0], [-2, 0], [1, 0], [2, 0]]) B.px(E, cx + dx, cy + dy, SM, st);
    for (const [dx, dy] of [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]) B.px(E, cx + dx, cy + dy, sg ? RUNE : PLATE, sg ? 0 : 3);
    if (sg >= 2) { B.px(E, cx, cy, RUNEH); for (const [dx, dy] of [[0, -3], [3, 0], [0, 3], [-3, 0]]) B.px(E, cx + dx, cy + dy, RUNE); }
    // 腰带 + 骷髅扣
    part(); B.poly(E, [[-7.5, -29], [10.5, -28.5], [10.5, -26], [-7.5, -26.5]], LEATH); B.ln(E, -7, -28.5, 10, -28, LEATH, 8);
    part(); B.ell(E, 9, -27.5, 1.8, 1.8, 0, SKULL); B.px(E, 8.5, -28, SKULL, 10); B.px(E, 10, -28, SKULL, 10); B.px(E, 9.5, -26.3, SKULL, 3);
    // 前面的甲裙（下缘锯齿）
    part(); B.poly(E, [[0, -27], [11, -27], [13 + s * 0.3, -20], [12 + s * 0.5, -14.5], [9.5 + s * 0.5, -17.5], [7 + s * 0.5, -13.5], [4.5 + s * 0.4, -17], [2 + s * 0.3, -14], [0, -19]], PLATE);
    B.ln(E, 1, -23, 12, -23, PLATE, 3); B.ln(E, 1, -24, 12, -24, PLATE, 7); B.ln(E, 1, -19.5, 12.5, -19.5, PLATE, 3); B.ln(E, 1, -20.5, 12.5, -20.5, PLATE, 7);
    // 后颈的尖领
    part(); B.poly(E, [[-4, -48], [-7, -54], [-5, -53], [-7, -59], [-3, -54], [-2.5, -57.5], [0, -51], [1, -48]], PLATE); B.ln(E, -5, -53, -6, -57, PLATE, 8);
  }
  function drawPauldron(far) {
    part(); bodyXf();
    if (far) {
      B.ell(E, -4, -49, 6.5, 5, -0.2, PLATED); B.ln(E, -9, -51, -1, -53.5, PLATED, 7);
      part(); const a = B.at(-6, -52), b = B.at(-2, -53.5); spike(a[0], a[1], -1, -1.4, 5, 1.6, PLATED, 1); spike(b[0], b[1], -0.5, -1.6, 5, 1.5, PLATED, 1);
      return;
    }
    B.ell(E, 9, -49.5, 8, 6, -0.25, PLATE); B.ln(E, 3, -53, 13, -55, PLATE, 8); B.ln(E, 2, -48, 5, -45, PLATE, 3);
    part(); B.ell(E, 10.5, -45.5, 6, 2.6, -0.3, PLATE); B.ln(E, 5.5, -45, 15, -48, PLATE, 8);
    part(); B.ell(E, 11.5, -43, 4.8, 2.2, -0.35, PLATE); B.ln(E, 8, -42.5, 15.5, -45, PLATE, 7);
    B.px(E, 9, -50, PLATE, 9); B.px(E, 13, -51, PLATE, 9);
    B.ln(E, 7, -50, 11, -51, P.glow >= 2 ? RUNE : PLATE, P.glow >= 2 ? 0 : 2);                                          // 刻进去的一道符纹
    part(); for (const [x, y, dx, dy, l] of [[1, -50, -2, -0.3, 7], [3, -52.5, -1.6, -1.1, 9], [6, -54.5, -1, -1.7, 9]]) { const p = B.at(x, y), q = B.at(x + dx, y + dy); spike(p[0], p[1], q[0] - p[0], q[1] - p[1], l, 2.4, PLATE, 0); }
  }
  function drawHorn(far) {
    part(); headXf(); const o = far ? [7, 0.5] : [0, 0], m = far ? HORND : HORN;
    const pts = [[1.5, -62.5], [-4, -63.5], [-8.5, -67], [-9.5, -72], [-7, -76.5], [-2.5, -78.5]].map((p) => [p[0] + o[0], p[1] + o[1]]);
    B.strand(E, pts, far ? 2.6 : 3.2, 0.5, m);
    if (!far) { for (let i = 1; i < 5; i++) { B.px(E, pts[i][0] + 0.8, pts[i][1] + 0.5, m, 3); B.px(E, pts[i][0] - 0.6, pts[i][1] - 0.4, m, 8); } B.px(E, pts[5][0], pts[5][1], m, 9); }
    B.ell(E, 2 + o[0], -62.5 + o[1], 2, 1.8, 0, PLATE, far ? 4 : 8);                                                   // 角根的铁箍
  }
  function drawHead() {
    part(); headXf();
    B.ell(E, 5, -51.5, 5.5, 2.5, 0, PLATE); B.ln(E, 1, -52, 9, -52, PLATE, 3);                                          // 护颈
    part(); B.poly(E, [[-2, -54], [-3, -59.5], [-1.5, -64], [2.5, -67], [7.5, -67.5], [11.5, -65], [13.5, -61.5], [14, -58], [15.5, -55.5], [13, -52.5], [8, -51.5], [2, -52]], PLATE);   // 封闭的尖颚大盔
    B.ln(E, 1, -66, 11, -64.5, PLATE, 8); B.ln(E, 2.5, -66.5, 7.5, -67, PLATE, 9);                                      // 盔顶的脊
    B.ln(E, 5, -63, 5.5, -53, PLATE, 3); B.ln(E, 4, -63, 4.5, -53, PLATE, 7);                                          // 面甲和盔的接缝
    B.ln(E, 13, -57, 15, -55.5, PLATE, 8); B.ln(E, 6, -62, 13, -62, PLATE, 8);                                         // 下颚的尖、眉甲
    for (const [x, y] of [[0, -57], [0.5, -61], [1, -54]]) B.px(E, x, y, PLATE, 9);                                     // 铆钉
    for (const [x, y] of [[8, -55], [9.5, -56], [8.5, -53.5], [10, -54]]) B.px(E, x, y, PLATE, 1);                      // 透气孔
    // T 字目缝：横缝亮紫、竖缝暗红（0 常亮、1 暗、2 冒光、3 熄灭）
    const e = P.eyes;
    if (e === 3) { B.ln(E, 6, -60, 13.5, -60, PLATE, 1); B.ln(E, 13, -59, 13, -55, PLATE, 1); }
    else if (e === 1) { B.ln(E, 6, -60, 13.5, -60, PLATE, 10); B.ln(E, 9, -60, 12, -60, VIS); B.ln(E, 13, -59, 13, -55, PLATE, 10); B.ln(E, 13, -58, 13, -57, VISR); }
    else {
      B.ln(E, 6, -60, 13.5, -60, VIS); B.ln(E, 10, -60, 13, -60, VISC); B.ln(E, 12.5, -59, 12.5, -54.5, VISR); B.ln(E, 13.5, -59, 13.5, -55, VISR); B.px(E, 13, -59, VISC);
      if (e === 2) { B.ln(E, 8, -61, 13, -61, VIS); B.px(E, 14.5, -60, VISC); B.px(E, 15.5, -60, VIS); B.px(E, 14.5, -61, VIS); }
    }
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, el = far ? L.ef : L.en, h = far ? L.hf : L.hn, m = far ? PLATED : PLATEL;
    part(); capW(sh[0], sh[1], el[0], el[1], 4, 3.4, m);                                                               // 上臂
    if (!far) { const c = lerp(sh, el, 0.6); px(c[0] - 1, c[1] - 1, m, 8); }
    part(); capW(el[0], el[1], h[0], h[1], 3.4, 3.1, m);                                                               // 前臂甲
    const w = lerp(el, h, 0.72); dot(w[0], w[1], 3.6, m, far ? 5 : 6);                                                 // 护手的喇叭口
    if (!far) { const q = lerp(el, h, 0.4); px(q[0], q[1] - 1, m, 8); }
    part(); dot(el[0], el[1], 3.3, m);                                                                                // 肘甲 + 往外的刺
    const o = [el[0] - (sh[0] + h[0]) / 2, el[1] - (sh[1] + h[1]) / 2]; spike(el[0], el[1], o[0] || -1, o[1] || 0.2, 4.5, 1.5, m, far);
    part(); dot(h[0], h[1], 3.1, m); px(h[0] + 1, h[1] - 2, m, far ? 6 : 9); px(h[0] + 2, h[1], m, far ? 5 : 8);        // 铁手套
    if (!far && P.fist) {                                                                                             // 号令：拳头上聚起紫光
      const r = P.fist === 2 ? 4 : 3; for (let i = 0; i < 8; i++) { const a = i * PI / 4 + (P.fist === 2 ? PI / 8 : 0); px(h[0] + Math.cos(a) * r, h[1] + Math.sin(a) * r, i & 1 ? VIS : VISC); }
      px(h[0], h[1] - 1, VISC);
    }
  }
  // 混沌巨剑：手在剑柄上（u = 0），u 往剑尖、v 往刃口；插在地里时剑身画到地面为止
  function drawSword() {
    const g = L.sg, d = L.sd, p = [-d[1], d[0]], at = (u, v) => [g[0] + d[0] * u + p[0] * v, g[1] + d[1] * u + p[1] * v], e = L.sul;
    part(); const h0 = at(-10, 0), h1 = at(2, 0); capW(h0[0], h0[1], h1[0], h1[1], 1.4, 1.4, LEATH);                   // 剑柄
    for (const u of [-8, -6, -4, -2, 0]) { const a = at(u, -1.2), c = at(u + 1, 1.2); lnW(a[0], a[1], c[0], c[1], LEATH, 7); }
    part(); const pm = at(-11.5, 0), pt = at(-14.5, 0); capW(pm[0], pm[1], pt[0], pt[1], 2, 0.5, BLADE); dot(pm[0], pm[1], 2.3, BLADE);   // 刺球柄头 + 紫晶
    for (const v of [-2.5, 2.5]) { const q = at(-11.5, v * 1.2); px(q[0], q[1], BLADE, 8); }
    px(pm[0], pm[1], P.glow >= 2 ? VISC : VIS);
    // 蝙蝠翼护手：两翼往剑尖翻
    part(); polyW([at(1.2, -3), at(0.5, -7), at(-1, -10), at(2.5, -8.5), at(4.5, -10), at(4, -5.5), at(5.2, -2.5), at(5.2, 2.5), at(4, 5.5), at(4.5, 10), at(2.5, 8.5), at(-1, 10), at(0.5, 7), at(1.2, 3)], BLADE);
    for (const v of [-7, 7]) { const q = at(1.5, v); px(q[0], q[1], BLADE, 8); }
    const cg = at(3, 0); dot(cg[0], cg[1], 1.2, P.glow >= 3 ? RUNEH : RUNE);
    // 剑身：剑脊靠护手一段是锯齿，刃口一道亮线，血槽里六个符文
    const w = (u) => (u <= 36 ? 3.8 - (u - 5) * 0.021 : 3.15 * (44 - u) / 8);
    const back = [[5, -3.8], [9, -3.8], [10.5, -5], [12, -3.7], [15, -3.7], [16.5, -4.9], [18, -3.6], [21, -3.6], [22.5, -4.7], [24, -3.5], [36, -3.15]];
    const pts = [];
    for (const q of back) if (q[0] < e) pts.push(at(q[0], q[1]));
    if (e >= 44) pts.push(at(44, 0)); else { pts.push(at(e, -w(e))); pts.push(at(e, w(e))); }
    if (e > 36) pts.push(at(36, 3.15)); pts.push(at(5, 3.8));
    part(); polyW(pts, BLADE);
    const lit = P.edg ? EDGEG : EDGE;
    for (let u = 6; u <= Math.min(e - 0.5, 41); u++) { const q = at(u, w(u) - 0.8); px(q[0], q[1], lit, P.edg ? 0 : 9); const r = at(u, -w(u) + 1.2); if (u % 3 === 0) px(r[0], r[1], BLADE, 7); }
    for (let u = 6; u <= Math.min(e - 1, 35); u++) { const q = at(u, 0.4); px(q[0], q[1], BLADE, 1); }                 // 血槽
    RU.forEach((u, i) => {
      if (u + 1.5 >= e) return; const on = i < P.rune, hot = P.glow >= 3 || i === P.hot || (P.hot === 9 && on), m = hot ? RUNEH : on ? RUNE : BLADE, t = hot || on ? 0 : 2;
      const a = at(u, 0.4), b = at(u + 1, i & 1 ? -0.8 : 1.4), c = at(u + 2, 0.4); px(a[0], a[1], m, t); px(b[0], b[1], m, t); px(c[0], c[1], m, t);
    });
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawCape(); drawArm(1); drawPauldron(1);
    drawLeg('f', 1); drawLeg('n', 0);
    drawTorso();
    if (P.sb) drawSword();
    drawPauldron(0);
    drawHorn(1); drawHead(); drawHorn(0);
    if (!P.sb) drawSword();
    drawArm(0);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    let on = 0; const chaos = P.st >= CHARGE && P.st <= RECOVER && MV !== 'roar';
    if (P.glow >= 2) { LIGHT[0].x = P.fx * z + spr.ox; LIGHT[0].y = P.fy * z + spr.oy; LIGHT[0].r = (6 + P.glow * 4) * z; LIGHT[0].ramp = chaos ? LR_CH : LR_EM; on = 1; } else LIGHT[0].r = 0;
    if (P.eyes === 2) { LIGHT[1].x = L.eye[0] * z + spr.ox; LIGHT[1].y = L.eye[1] * z + spr.oy; LIGHT[1].r = 7 * z; on = 1; } else LIGHT[1].r = 0;
    RIM.lights = on ? LIGHT : null;
    bake(spr, RIM);
  }
  // 立绘：混沌斩蓄力到头那一刻（压低身子、剑横拖在身后、符文全亮、刃口变紫、目缝冒光），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  const headAt = () => { headXf(); const c = B.at(4, -64); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; };
  function portrait() { const mv = MV; MV = 'chaosCleave'; poseAt(CHARGE, 0.9, 1); P.bx = -2; P.glow = 2; P.rim = 2; P.eyes = 2; P.edg = 1; P.sig = 2; P.rune = 6; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(); return PSPR; }
  function headShot() { const mv = MV; MV = 'chaosCleave'; poseAt(IDLE, 0.2, 0); P.eyes = 2; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(); return PSPR; }   // 头像：待机、目缝亮着

  // ───── 特效 ─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let scarT = 9, riftT = 9, lastF = -1, lastPuff = 0;
  const RIFT = [-32, 42];
  const shards = (x, y, n, ramp) => { for (let i = 0; i < n; i++) { const a = Math.random() * PI * 2, v = 60 + Math.random() * 90; spawnX(K_PHYS, x, y, Math.cos(a) * v, Math.sin(a) * v - 40, 0.5 + Math.random() * 0.3, ramp, { g: 260, floor: HY, sz: i % 3 === 0 ? 2 : 1 }); } };
  function strikeFx() {
    const m = L.smid, x = sx(m[0]), y = sy(m[1]);
    fx.slash(sx(L.shN[0]), sy(L.shN[1]), 38, -0.4, 2.2, EM, 0.2, 3, 2);
    burst(x, y, 16, 50, 140, 0.2, 0.5, EM, 30); burst(x, y, 8, 30, 90, 0.2, 0.45, CH, 20); fx.cross(x, y, 7, CH, 0.16); hitDummy(1, 1); shake(0.15, 2);
  }
  function cleaveFx() {
    const c = L.shN, cx = sx(c[0]), cy = sy(c[1] + 6), tp = L.stip;
    fx.slash(cx, cy, 54, 0.4, 2.6, CH, 0.32, 4, 2); fx.slash(cx, cy, 43, 0.7, 2.4, EM, 0.24, 2, 2);                  // 紫 + 红两道大弧
    fx.wave(sx(tp[0] - 14), HY, 1, 64, 11, CH, 0.55, 2); fx.crack(sx(28), HY, 28, 1, CH, 1.3); fx.crack(sx(22), HY, 18, 1, EM, 1.1);
    burst(sx(tp[0]), sy(tp[1]), 26, 60, 180, 0.25, 0.6, CH, 40); burst(sx(tp[0]), sy(tp[1]), 12, 40, 120, 0.2, 0.5, EM, 30); burst(sx(40), HY - 2, 16, 30, 110, 0.35, 0.8, FXI.dust, 14);
    ring(sx(44), HY - 3, 1, CH); shake(0.35, 3); flash(0.1); scarT = 0; hitDummy(1, 1);
  }
  function commandFx() {
    const x = sx(L.sg[0] + L.sd[0] * L.sul);                                                                           // 剑插进地里的地方
    ring(x, HY - 2, 0, CH); fx.crack(x, HY, 14, 1, CH, 1.2); fx.crack(x, HY, 12, -1, CH, 1.2); burst(x, HY - 2, 14, 30, 110, 0.3, 0.6, FXI.dust, 10);
    for (const dx of RIFT) { const rx = sx(dx); fx.circle(rx, HY, 12, 3, CH, 1.0, 2, 0); fx.pillar(rx, HY - 38, HY, 6, CH, 0.7, 0); fx.link(x, HY - 1, rx, HY - 1, CH, 0.5, 0); burst(rx, HY - 14, 20, 40, 120, 0.3, 0.7, CH, 30); }
    const h = L.hn; fx.cross(sx(h[0]), sy(h[1]), 9, CH, 0.25); fx.bolt(sx(h[0]), sy(h[1]), sx(RIFT[1]), HY - 20, CH, 0.2, 2, 5);
    shake(0.3, 3); flash(0.08); riftT = 0;
  }
  function roarFx() {
    const c = L.chest, x = sx(c[0]), y = sy(c[1]);
    ring(x, y, 1, EM); ring(sx(2), HY - 32, 1, CH); flash(0.12); shake(0.35, 3);
    burst(x, y, 24, 60, 160, 0.25, 0.6, EM, 30); shards(x, y, 14, EM); fx.cross(sx(L.eye[0]), sy(L.eye[1]), 9, CH, 0.3);
  }
  function plantFx() { const x = sx(L.sg[0] + L.sd[0] * L.sul); burst(x, HY - 1, 10, 30, 80, 0.3, 0.5, FXI.dust, 10); fx.crack(x, HY, 8, 1, EM, 0.8); sfx('hit', { mat: 'metal', w: 0.6 }); sfx('boss', { k: 'bkClank', w: 0.7 }); }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'chaosCleave') { cleaveFx(); sfx('swing', { kind: 'smash', w: 1 }); sfx('boss', { k: 'bkCleave', w: 1 }); sfx('impact', { pal: 'curse', w: 1 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'command') { commandFx(); sfx('boss', { k: 'slam', w: 0.8 }); sfx('boss', { k: 'bkRift', w: 1 }); sfx('impact', { pal: 'curse', w: 0.8 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else sfx('boss', { k: 'bkClank', w: 0.8 });
    }
    if (s === CHARGE) { lastF = -1; if (MV === 'chaosCleave') { sfx('boss', { k: 'bkGather', w: 1 }); sfx('boss', { k: 'bkClank', w: 0.6 }); } else if (MV === 'command') { sfx('boss', { k: 'bkGather', w: 0.8 }); sfx('boss', { k: 'growl', w: 0.6 }); } }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'bkClank', w: 0.6 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'metal', w: 0.8 }); sfx('impact', { pal: 'curse', w: 0.5 }); }
    if (s === CAST && MV === 'roar' && t === 2 / 12) { roarFx(); sfx('boss', { k: 'bkRoar', w: 1 }); sfx('impact', { pal: 'fire', w: 0.8 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
    if (s === RECOVER && t === 0.5 && MV !== 'command') plantFx();
    if (s === DEATH && t === INCOMING + 0.3) sfx('boss', { k: 'bkBreath', w: 0.8 });
    if (s === DEATH && t === INCOMING + 0.75) { sfx('hit', { mat: 'metal', w: 0.7 }); sfx('boss', { k: 'thud', w: 0.8 }); burst(sx(-8), HY - 1, 10, 20, 70, 0.3, 0.5, FXI.dust, 8); shake(0.15, 2); }
    if (s === DEATH && t === INCOMING + 1.3) { sfx('boss', { k: 'bkDie', w: 1 }); fx.cross(sx(L.eye[0]), sy(L.eye[1]), 6, CH, 0.2); }
    if (s === DEATH && t === INCOMING + 1.75) { for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-34 + Math.random() * 50), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); sfx('boss', { k: 'bkClank', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.95) { for (let i = 0; i < 32; i++) spawn(K_RISE, sx(-34 + Math.random() * 56), HY - 3 - Math.random() * 22, 0, -12 - Math.random() * 18, 0.8 + Math.random() * 0.8, CH); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [], [2 / 12], [0.5], [], [INCOMING + 0.3, INCOMING + 0.75, INCOMING + 1.3, INCOMING + 1.75, INCOMING + 1.95], []];
  function stepFX(dt, state, stT) {
    scarT += dt; riftT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 12; if (f !== lastF) { lastF = f;
        if (f === 0 || f === 6) { const a = f === 0 ? L.an : L.af, x = sx(a[0] + 2); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 30 - (P.flip ? -10 : 10), -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 1 }); sfx('boss', { k: 'bkClank', w: 0.35 }); } }
    }
    if (state === CHARGE && P.glow && MV !== 'roar' && Math.random() < 0.5) {                                          // 蓄力：紫光往剑身（号令时往拳头）汇
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 16, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, CH, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'chaosCleave' && P.edg && Math.random() < 0.12) { const m = L.smid, q = L.stip; fx.bolt(sx(m[0]), sy(m[1]), sx(q[0]), sy(q[1]) - 4 + Math.random() * 8, CH, 0.1, 2, (Math.random() * 99) | 0); }
    if (state === IDLE) {
      if (P.puff && !lastPuff) { for (let i = 0; i < 7; i++) spawn(K_RISE, sx(L.eye[0] + 2), sy(L.eye[1]), 8 + Math.random() * 12, -4 - Math.random() * 10, 0.6 + Math.random() * 0.3, CH); sfx('boss', { k: 'bkBreath', w: 0.5 }); }
      if (Math.random() < 0.05) spawn(K_RISE, sx(-12 + Math.random() * 24), sy(-50 + Math.random() * 8), (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.6, CH);   // 肩上飘着的混沌烟
      if (Math.random() < 0.04) spawn(K_EMBER, sx(L.sg[0] + L.sd[0] * L.sul + (Math.random() - 0.5) * 4), HY - 1, 0, -10 - Math.random() * 8, 0.35, EM);   // 插剑的地方冒火星
    }
    lastPuff = P.puff;
    if (P.th === 2 && Math.random() < 0.35) spawn(K_EMBER, sx(L.chest[0] - 16 + Math.random() * 28), sy(L.chest[1] - 14 + Math.random() * 30), 0, -12, 0.3, EM);   // 尖刺烧红
    if (state === DEATH && P.leak && Math.random() < 0.4) spawn(K_RISE, sx(L.chest[0] - 6 + Math.random() * 12), sy(L.chest[1] - 4 + Math.random() * 10), 0, -12 - Math.random() * 8, 0.6, CH);   // 甲缝漏出紫烟
    if (scarT < 1.3 && Math.random() < 0.4) { const x = sx(22 + Math.random() * 40); spawn(K_EMBER, x, HY - 1, 0, -8 - Math.random() * 10, 0.4, Math.random() < 0.5 ? CH : EM); }
    if (riftT < 1.3 && Math.random() < 0.6) { const rx = sx(RIFT[Math.random() < 0.5 ? 0 : 1]) + (Math.random() - 0.5) * 16; spawn(K_RISE, rx, HY - 2, 0, -16 - Math.random() * 16, 0.5, CH); }
  }
  function fxReset() { scarT = 9; riftT = 9; lastF = -1; lastPuff = 0; }
  function fxBack(f12) {
    if (P.glow >= 2) { const R = P.st >= CHARGE && P.st <= RECOVER && MV !== 'roar' ? CR : ER, x = sx(P.fx); for (let dx = -12; dx <= 12; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, R[Math.abs(dx) < 5 ? 2 : 3]); }   // 地面映光
    if (P.cm === 1 && L.sul < 44) { const x = sx(L.sg[0] + L.sd[0] * L.sul); for (let dx = -2; dx <= 2; dx++) E.put(x + dx, HY + 1, ER[Math.abs(dx) < 1 ? 2 : 3]); }   // 插剑的地缝发红
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'chaosCleave'; return MVDUR[MV]; }

  const VOICES = {
    bkClank: (s, t, w, p) => { s.ring(t, 900 + Math.random() * 300, 0.16, 0.02 * w, { pan: p }); s.ring(t + 0.03, 1500 + Math.random() * 400, 0.12, 0.014 * w, { pan: p }); s.nz(t, 0.06, 'bandpass', 2600, 2, 0.04 * w, { pan: p }); s.thud(t, 120, 50, 0.14, 0.08 * w, { pan: p }); },
    bkBreath: (s, t, w, p) => { s.nz(t, 0.7, 'bandpass', 900, 1.4, 0.06 * w, { to: 420, a: 0.1, pan: p, rev: 0.4 }); s.tone(t, 'sawtooth', 62, 0.7, 0.03 * w, { to: 48, lp: 300, pan: p }); },
    bkGather: (s, t, w, p) => { s.tone(t, 'sawtooth', 70, 1.0, 0.035 * w, { to: 150, lp: 700, pan: p }); s.nz(t, 1.0, 'bandpass', 300, 2, 0.05 * w, { to: 2200, a: 0.3, pan: p }); s.crackle(t + 0.4, 0.5, 2400, 0.03 * w, { pan: p }); },
    bkCleave: (s, t, w, p) => { s.whoosh(t, 0.35, 260, 1500, 0.12 * w, { pan: p }); s.crackle(t, 0.35, 1800, 0.06 * w, { pan: p }); s.thud(t + 0.03, 110, 38, 0.35, 0.22 * w, { pan: p }); s.ring(t, 380, 0.5, 0.03 * w, { pan: p }); },
    bkRift: (s, t, w, p) => { s.nz(t, 0.8, 'bandpass', 200, 3, 0.08 * w, { to: 1200, pan: p }); s.tone(t, 'sawtooth', 55, 0.9, 0.05 * w, { to: 30, lp: 400, pan: p }); s.choir(t, [38, 45], 1.0, 0.03 * w, { dark: 1, pan: p }); },
    bkRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 86, 1.2, 0.07 * w, { to: 60, vib: [5, 80, 0.2], lp: 800, pan: p, rev: 0.5 }); s.tone(t, 'square', 129, 1.0, 0.03 * w, { to: 90, lp: 1200, pan: p });
      s.ring(t, 210, 1.2, 0.03 * w, { pan: p }); s.nz(t, 1.1, 'bandpass', 500, 1.2, 0.07 * w, { to: 260, pan: p }); s.rumble(t, 1.3, 0.15 * w, { f: 110, pan: p }); },
    bkDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 100, 1.6, 0.06, { to: 38, vib: [4, 60, 0.2], lp: 600, pan: p, rev: 0.5 }); s.nz(t + 0.2, 1.2, 'lowpass', 340, 0.7, 0.05 * w, { a: 0.2, pan: p }); s.ring(t + 0.1, 160, 1.5, 0.025 * w, { pan: p }); },
  };

  return {
    name: '黑卡托斯', HX, R_EL: CH, DUR, hero, P, GLOW_MATS: [VIS, VISC, VISR, RUNE, RUNEH, EDGEG], HIT_POINT: [4, -40], EVENTS, MAX_H: 88, OWN_MAX: 100, SHEET_K: 3, VOICES,
    SFX: { body: 'armor', how: 'topple', pal: 'curse', style: 'shadow', w: 1 },
    MOVES: ['chaosCleave', 'command', 'roar'], MOVE_NAMES: { chaosCleave: '混沌斩', command: '号令', roar: '反伤加倍（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.6, 1.85, 2.3, 2.45]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12, 8 / 12, 9 / 12, 10 / 12, 11 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0.08, 0.25, 0.42, 0.67, 0.92], 'chaosCleave'], [CAST, [0, 2 / 12], 'chaosCleave'], [RECOVER, [0.08, 0.25, 0.42, 0.58], 'chaosCleave'],
      [CHARGE, [0.08, 0.25, 0.5, 0.75], 'command'], [CAST, [0, 2 / 12], 'command'], [RECOVER, [0.25, 0.5], 'command'],
      [CAST, [1 / 12, 2 / 12, 0.33, 0.5], 'roar'], [RECOVER, [0.17, 0.42, 0.58], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.75, 0.95, 1.2, 1.45, 1.65, 1.9, 2.4]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
