// 克拉肯（小首领，第四章「沉没港口」的海底）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js。
// 依据：附录 G2「大章鱼」；招式 grab 缠绕（5 条触手各抓一个 10 秒，被抓的不能动、不能打、掉血，砍断触手就放人）、
//       ink 墨汁（一片墨，里面的普攻一半打空）；半血 六条触手（缠绕变 7 条）。
// 设定卡 ——
//   剪影：从港口水面里冒出来的一只大章鱼：往后上方鼓起的大肉囊（外套膜），下面是长着独眼和鸟喙的头，
//         六条粗触手——四条贴地往左右两边铺开、梢头往上卷，一条从背后高高拱起，一条在身前举起、弯成钩子悬在敌人头上（抓人那条）。
//         宽比高显眼：身体约 66 格高，触手铺开约 120 格宽。和深海巨口（整个身体是嘴、头上吊灯）、异形（甲壳、尾刺）都不撞。
//   脸（识别点）：头侧一只很大的金色独眼、横着的一条黑色缝瞳，上面压着一道斜下来的厚眉棱（凶）；眼下前方一张黑亮的鹦鹉嘴（鸟喙），
//         张嘴时露出暗红的口腔；眼后下方一根短喷水管（墨汁从这里喷）。
//   皮：外套膜是压暗的紫，下沿过渡成深海青；头和触手是深海青，触手背上一道紫脊、腹侧一排肉粉色吸盘；全身散着青绿色的发光斑点。
//   主色：暗紫 + 深海青（都压暗）；光：金色的眼、青绿的发光斑点（轮廓光也用它）；墨是紫黑色。
//   招式（setMove）：
//     grab 缠绕：身子撑高、六条触手全部举起张开成一圈，吸盘一个个亮成青绿、眼睁圆（青绿光点往眼上汇）
//                → 五条触手一齐往前 / 往身下扎进地里（入土处水柱和碎土炸起、地裂、两道环）→ 在地下拖一会儿再慢慢拔出来。
//     ink 墨汁：外套膜一口气吸满鼓起来、触手收拢、身子往下坐、喷水管胀大，紫黑的墨滴往管口汇（肉囊一鼓一鼓）
//                → 肉囊猛地瘪下去、整个往后一窜，喷水管往前喷出一大团墨（墨柱、墨云、墨点）→ 管口滴墨、肉囊慢慢鼓回来。
//     roar 六条触手（半血）：先把触手全卷到身前缩成一团 → 猛地撑高、六条触手朝四面张到最开、鸟喙张到最大、斑点全亮（两道环、水花四溅）→ 收回。
//   普攻：身前那条钩子触手往后上方甩起 → 整条抽下来平拍在身前地上（水花、水浪）→ 弹回。
//   待机：肉囊两档呼吸、全身触手像水草一样慢慢起伏、斑点一颗颗闪；个性动作是身前那条触手的梢卷起来、松开、再卷起来地「勾手指」（眼睛眯起来）；
//         偶尔慢慢眨一下眼。移动：触手一伸一缩地往前爬，身子一拱一拱。
//   死亡：挨打后六条触手乱甩、张嘴哀嚎 → 触手瘫软摊平、肉囊瘪下去往前耷拉、眼睛合上 → 整个一截截沉进地里（气泡往上冒、斑点一颗颗灭掉）。
PCD.define('B_Kraken', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, PI = Math.PI;

  // ───── 材质（11 级，暗 → 亮）：皮压暗，金眼和青绿的斑点才亮得出来 ─────
  const R_TEAL = ['#020808', '#041110', '#071a19', '#0a2423', '#0d2f2d', '#113b38', '#154744', '#1a5450', '#20625c', '#287169', '#318177'];   // 深海青（头、触手）
  const R_PURP = ['#060309', '#0e0614', '#170a20', '#210e2d', '#2b133b', '#36184a', '#421e5a', '#4f256b', '#5d2d7c', '#6c378d', '#7d439f'];   // 外套膜的暗紫
  const R_SUCK = ['#0d0707', '#1c1011', '#2c1b1c', '#3e2828', '#513636', '#654645', '#7a5856', '#8f6b67', '#a4807a', '#b9968e', '#ceaea4'];   // 吸盘的肉粉
  const R_BEAK = ['#020203', '#060609', '#0b0b10', '#111118', '#181821', '#20202b', '#2a2a36', '#353543', '#424252', '#525263', '#656577'];   // 黑亮的鸟喙（偏冷的角质黑）
  const MANT = defDeep(R_PURP, { depth: 10, amb: 0.14 }), MANTB = defDeep(R_TEAL, { depth: 10, amb: 0.14 });
  const HEAD = defDeep(R_TEAL, { depth: 8, amb: 0.15 }), HEADP = defDeep(R_PURP, { depth: 8, amb: 0.15 });
  const TENT = defDeep(R_TEAL, { depth: 4, amb: 0.15 }), TENTD = defDeep(R_TEAL, { depth: 4, dark: 3, amb: 0.1 });
  const TP = defDeep(R_PURP, { depth: 3, amb: 0.2 }), TPD = defDeep(R_PURP, { depth: 3, dark: 3, amb: 0.12 });
  const SUCK = defDeep(R_SUCK, { depth: 2, amb: 0.3 }), SUCKD = defDeep(R_SUCK, { depth: 2, dark: 3, amb: 0.2 }), BEAK = defDeep(R_BEAK, { depth: 3, amb: 0.2 });
  const GLS = fxRamp('krGlow', ['#ffffff', '#b4fff0', '#4df0cf', '#18a894', '#0a524a']), GR = FXR[GLS];      // 发光斑点 / 轮廓光：白 → 青绿 → 暗
  const INKI = fxRamp('krInk', ['#7a5a9e', '#45295f', '#2a1640', '#170b26', '#09050f']), IR = FXR[INKI];     // 墨：淡紫 → 紫黑
  const SR = FXR[FXI.coin], BR = FXR[FXI.blood], WR = FXR[FXI.water];
  const EYEG = defMat([SR[4], SR[3], SR[2], SR[1]], 1, 1), PUPIL = defMat([IR[4], IR[4], IR[4], IR[3]], 1, 1), GLINT = defMat([21, 21, 21, 21], 1, 1);
  const SPOT = defMat([GR[4], GR[4], GR[3], GR[2]], 1, 1), SPOTH = defMat([GR[2], GR[2], GR[1], GR[0]], 1, 1), SUCKG = defMat([GR[3], GR[2], GR[1], GR[0]], 1, 1);
  const MOUTH = defMat([BR[4], BR[4], BR[3], BR[2]], 1, 1), INKM = defMat([IR[4], IR[3], IR[2], IR[1]], 1, 1), FOAM = defMat([WR[3], WR[2], WR[1], WR[0]], 1, 1);
  const hero = new Sprite(176, 120, 86, 112);
  const DUR = [2.8, 2 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { grab: { 3: 1.0, 4: 0.4, 5: 0.7 }, ink: { 3: 1.0, 4: 0.45, 5: 0.6 }, roar: { 3: 0.5, 4: 0.7, 5: 0.6 } };
  let MV = 'grab';
  const HX = 84;
  const LE = { x: 0, y: 0, r: 0, ramp: [SR[1], SR[2], SR[3]], k: 0.55 }, LS = { x: 0, y: 0, r: 0, ramp: [GR[1], GR[2], GR[3]], k: 0.42 };
  const RIM_R = [0, 12, 18, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: GR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of [EYEG, PUPIL, GLINT, SPOT, SPOTH, SUCKG, MOUTH, INKM, FOAM]) RIM.skip[m] = 1;

  // ───── 触手（身体本地坐标，脚底 y = 0，面朝右）：根、朝向（弧度，0 朝右、顺时针为正）、卷曲（总转角，越往梢转得越多）、长、根半径 ─────
  //   远侧三条先画（暗三级），近侧三条后画；贴地的四条压在地面上、梢往上卷；ss：吸盘在卷曲的内侧（1）还是贴地的那一侧（-1）
  const TD = [
    { r: [-14, -14], a: PI - 0.5, c: 2.1, l: 58, w: 4.4, far: 1, ss: -1 },     // 0 远后，贴地往左
    { r: [6, -14], a: 0.5, c: -2.2, l: 58, w: 4.4, far: 1, ss: -1 },           // 1 远前，贴地往右
    { r: [-14, -22], a: -2.0, c: 2.3, l: 54, w: 4.2, far: 1, ss: 1 },         // 2 远侧，从背后高高拱起
    { r: [-6, -12], a: PI - 0.55, c: 2.3, l: 70, w: 5.4, far: 0, ss: -1 },     // 3 近后，贴地往左
    { r: [8, -12], a: 0.55, c: -2.5, l: 70, w: 5.4, far: 0, ss: -1 },          // 4 近前，贴地往右
    { r: [19, -15], a: -1.0, c: 2.3, l: 54, w: 5.0, far: 0, ss: 1 },           // 5 近侧，身前举起的钩子（抓人、普攻）
  ];
  const TN = 16, TG = TD.map(() => ({ p: [], r: [], h: [], cs: 1, entry: null }));
  const T0 = [[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1]];
  const TT = (a) => a;   // 可读性：K 里每条触手 [朝向加减, 卷曲加减（正 = 卷得更紧）, 长度倍数]
  const D0 = { bx: 0, by: 0, lean: 0, ml: 0, sw: 0, jaw: 0, sif: 0, wa: 1, look: 0 };
  const K = {
    idle: {},
    beckon: { t: TT([[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0.15, 2.0, 0.84]]) },                         // 勾手指：梢卷紧
    beckon2: { t: TT([[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [-0.1, -0.7, 1.06]]) },                       // 松开
    aWind: { lean: -0.08, ml: -0.08, bx: -1, t: TT([[0, 0, 1], [0, 0, 1], [0.1, 0.3, 1], [0, 0, 1], [0, 0, 1], [-1.25, -0.6, 1.02]]) },   // 普攻：钩子甩到脑后
    aStrike: { lean: 0.1, bx: 3, by: 1, ml: 0.12, jaw: 2, t: TT([[0, 0, 1], [0, 0, 1], [0.1, 0, 1], [0, 0, 1], [0, 0.3, 1], [1.4, -2.0, 1.16]]) },
    aFollow: { lean: 0.06, bx: 2, ml: 0.08, jaw: 1, t: TT([[0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0, 1], [0, 0.2, 1], [1.2, -1.5, 1.08]]) },
    gRear: { by: -5, lean: -0.1, ml: -0.12, sw: 1, jaw: 1, wa: 0.4,                                                      // 缠绕：撑高、六条全举起张开
      t: TT([[1.0, -0.9, 1.0], [-1.1, -0.9, 1.0], [-0.3, -0.4, 1.05], [0.3, -0.5, 1.0], [-0.3, -0.5, 1.0], [-0.55, -0.2, 1.05]]) },   // 近侧两条撑地
    gSlam: { by: 2, lean: 0.14, bx: 3, ml: 0.1, jaw: 2, wa: 0, dv: 59,                                                     // 五条扎进地里（2 号留在上面）
      t: TT([[0.9, -4.4, 1.0], [-0.9, -4.6, 1.0], [0.3, 0.2, 1.0], [0.95, -5.0, 1.0], [-0.85, -5.3, 1.05], [0.15, 0.5, 1.15]]) },
    iSwell: { sw: 4.5, by: 2, lean: -0.06, ml: -0.18, sif: 2, wa: 0.3,                                                    // 墨汁：肉囊鼓满、触手收拢
      t: TT([[0.1, 0.8, 0.86], [-0.1, 0.8, 0.86], [0.3, 0.8, 0.85], [0.1, 0.9, 0.86], [-0.1, 0.9, 0.86], [-0.3, 0.9, 0.85]]) },
    iJet: { sw: -1.5, bx: -4, lean: -0.12, ml: 0.22, sif: 1.2, jaw: 1, wa: 0,                                              // 肉囊瘪下去、往后一窜
      t: TT([[0.2, -0.6, 1.1], [0.3, -0.5, 1.0], [-0.3, -0.4, 1.05], [0.25, -0.8, 1.12], [0.3, -0.6, 1.0], [-0.5, -0.5, 1.0]]) },
    rCoil: { by: 2, lean: 0.08, ml: 0.1, sw: 1, wa: 0.3, t: TT([[0.2, 1.0, 0.8], [-0.2, 1.0, 0.8], [0.3, 1.0, 0.8], [0.2, 1.0, 0.8], [-0.2, 1.0, 0.8], [-0.2, 1.0, 0.8]]) },
    rFlare: { by: -4, lean: -0.14, ml: -0.22, sw: 2.5, jaw: 2, wa: 0.2,                                                   // 怒吼：六条张到最开
      t: TT([[0.7, -0.8, 1.12], [-0.8, -0.9, 1.1], [-0.35, -0.6, 1.1], [0.35, -0.6, 1.15], [-0.4, -0.7, 1.15], [-0.55, -0.7, 1.12]]) },
    hurt: { bx: -3, lean: -0.14, ml: 0.18, sw: -0.5, jaw: 1, wa: 0, t: TT([[0, 0.7, 0.88], [0, 0.7, 0.88], [0.2, 0.7, 0.88], [0, 0.7, 0.88], [0, 0.7, 0.88], [-0.3, 0.8, 0.86]]) },
    dFlailA: { by: -2, lean: -0.16, ml: -0.15, jaw: 2, wa: 2, t: TT([[0.6, -0.5, 1.05], [-0.4, 0.8, 0.95], [-0.5, -0.8, 1.05], [0.2, 0.9, 0.95], [-0.7, -0.9, 1.05], [-0.8, 1.2, 0.95]]) },
    dFlailB: { by: -1, lean: -0.1, ml: -0.1, jaw: 2, wa: 2, t: TT([[0.1, 0.8, 0.95], [-0.8, -0.8, 1.05], [0.3, 0.8, 0.95], [0.6, -0.9, 1.05], [-0.2, 0.9, 0.95], [0.2, -1.0, 1.05]]) },
    dLimp: { by: 3, lean: 0.1, ml: 0.55, sw: -1.5, jaw: 1, wa: 0, t: TT([[-0.2, -2.0, 1.08], [0.2, -2.1, 1.08], [-1.44, -1.9, 1.05], [-0.25, -2.2, 1.08], [0.25, -2.4, 1.08], [1.4, -1.9, 1.08]]) },
  };
  const NUM = ['bx', 'by', 'lean', 'ml', 'sw', 'jaw', 'sif', 'wa', 'look'];

  const P = { ta: [0, 0, 0, 0, 0, 0], tc: [0, 0, 0, 0, 0, 0], tl: [1, 1, 1, 1, 1, 1] };
  const FIELDS = ['st', 'bx', 'by', 'lean', 'ml', 'sw', 'jaw', 'sif', 'wa', 'look', 'wph', 'dv', 'eyes', 'glow', 'rim', 'flash', 'dq', 'sk', 'tw', 'spoff', 'foam'];
  const val = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of NUM) { const va = val(a, f); P[f] = va + (val(b, f) - va) * q; }
    const ta = a.t || T0, tb = b.t || T0;
    for (let i = 0; i < 6; i++) { P.ta[i] = ta[i][0] + (tb[i][0] - ta[i][0]) * q; P.tc[i] = ta[i][1] + (tb[i][1] - ta[i][1]) * q; P.tl[i] = ta[i][2] + (tb[i][2] - ta[i][2]) * q; }
    P.dv = q < 0.5 ? a.dv || 0 : b.dv || 0;
  }
  function base() { P.st = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.sk = 0; P.tw = -1; P.spoff = 0; P.foam = 1; P.wph = 0; P.mx = 0; P.flip = 0; setK(K.idle, K.idle, 0); }
  const seg = (tq, t0, t1, e) => (e || ease.inOut)(clamp01((tq - t0) / (t1 - t0)));
  const trem = (f12, a) => { const s = f12 & 1 ? 1 : -1; for (let i = 0; i < 6; i++) P.ta[i] += s * a * (i & 1 ? 1 : -1); P.bx += s * a * 6; };
  // 爬行：8 帧一圈（12 fps，2/3 秒）。前面的触手伸出去抓地、后面的往后推，身子一拱一拱
  function crawl(f) {
    f = ((f % 8) + 8) % 8; const ph = f / 8 * 2 * PI, s = Math.sin(ph), c = Math.cos(ph);
    P.ta[4] = 0.28 * s; P.tl[4] = 1 + 0.12 * s; P.ta[1] = -0.28 * s; P.tl[1] = 1 - 0.12 * s;
    P.ta[3] = -0.22 * c; P.tl[3] = 1 - 0.1 * c; P.ta[0] = 0.22 * c; P.tl[0] = 1 + 0.1 * c;
    P.ta[5] = 0.14 * Math.sin(ph + 1); P.ta[2] = 0.12 * Math.sin(ph + 2); P.tc[5] = 0.3 * c;
    P.by = [0, -1, -2, -1, 0, -1, -2, -1][f]; P.bx = Math.round(s); P.lean = 0.05 * s; P.ml = -0.06 * c; P.sw = f & 2 ? 1 : 0; P.wa = 0.5;
  }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T); P.wph = (f12 % 12) * PI / 6;
    const idle = (tt) => {
      const b = Math.floor(f12 / 5) & 1; P.sw = b; P.by = -b; P.glow = (f12 % 17) === 5 ? 0 : 1; P.tw = f12 % 11;   // 两档呼吸、眼光一闪、斑点一颗颗闪
      const lp = tt % DUR[IDLE];
      if (lp >= 0.5 && lp < 0.75) P.eyes = lp < 0.58 || lp >= 0.67 ? 1 : 3;                                          // 慢慢眨一下
      if (lp >= 1.2 && lp < 2.3) {                                                                                  // 待机个性：身前那条触手勾手指
        const k = lp - 1.2; P.eyes = 1; P.look = 1;
        if (k < 0.25) setK(K.idle, K.beckon, seg(k, 0, 0.25, ease.out));
        else if (k < 0.45) setK(K.beckon, K.beckon2, seg(k, 0.25, 0.45, ease.out));
        else if (k < 0.7) setK(K.beckon2, K.beckon, seg(k, 0.45, 0.7, ease.out));
        else setK(K.beckon, K.idle, seg(k, 0.7, 1.1));
        P.sw = b; P.by = -b;
      }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { crawl(Math.floor(tq * 12)); const w = walkDemo(tq, 16, -1); P.mx = w.mx; P.flip = w.flip; P.glow = 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) { setK(K.idle, K.aWind, seg(tq, 0, 0.17, ease.out)); P.glow = 1; P.eyes = 2; }
      else if (tq < T_STRIKE) { setK(K.aWind, K.aWind, 0); P.glow = 2; P.rim = 1; P.eyes = 2; P.ta[5] -= 0.1; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.aStrike, K.aStrike, 0); P.glow = 3; P.rim = 2; P.eyes = 2; }
      else if (tq < 0.42) { setK(K.aStrike, K.aFollow, seg(tq, T_STRIKE + 1 / 12, 0.42, ease.out)); P.glow = 2; P.rim = 1; }
      else { const q = seg(tq, 0.42, 0.72); setK(K.aFollow, K.idle, q); P.glow = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; }
      else setK(K.hurt, K.idle, 0.5 + seg(h, 0.35, 0.5) * 0.5);
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.jaw = Math.round(P.jaw); focus(); P.gx = P.fx; P.gy = P.fy;
    let h = 2166136261, h2 = 5381; const mix = (x) => { const v = Math.round(x * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); };
    for (const f of FIELDS) mix(P[f]); for (let i = 0; i < 6; i++) { mix(P.ta[i]); mix(P.tc[i]); mix(P.tl[i]); }
    P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { grab: 0, ink: 1, roar: 2 };
  const T_STRIKE = 3 / 12;
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'grab') {
      if (st === CHARGE) {
        if (tq < 0.35) { setK(K.idle, K.gRear, seg(tq, 0, 0.35, ease.out)); P.glow = 1; P.eyes = 2; P.rim = 1; P.sk = tq > 0.2 ? 1 : 0; }
        else { setK(K.gRear, K.gRear, 0); trem(f12, tq > 0.7 ? 0.05 : 0.025); P.glow = tq > 0.7 ? 2 + sh : 2; P.rim = 2; P.eyes = 2; P.sk = 2; P.jaw = sh && tq > 0.7 ? 2 : 1; }   // 举着发抖、吸盘全亮
      } else if (st === CAST) { setK(K.gSlam, K.gSlam, 0); if (tq < 2 / 12) P.by += sh; P.glow = tq < 0.2 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.sk = 1; }
      else {
        if (tq < 0.3) { setK(K.gSlam, K.gSlam, 0); trem(f12, 0.03); P.glow = 1; P.eyes = 2; }                         // 在地下拖着
        else { const q = seg(tq, 0.3, 0.7); setK(K.gSlam, K.idle, q); P.dv = q < 0.4 ? 59 : 0; P.glow = q < 0.5 ? 1 : 0; }
      }
    } else if (MV === 'ink') {
      if (st === CHARGE) {
        if (tq < 0.5) { setK(K.idle, K.iSwell, seg(tq, 0, 0.5, ease.out)); P.eyes = 1; P.glow = 1; }
        else { setK(K.iSwell, K.iSwell, 0); const k = Math.floor(tq * 6) & 1; P.sw += k ? 0.8 : 0; P.sif += k ? 0.4 : 0; trem(f12, 0.02); P.eyes = 1; P.glow = 2; P.rim = 1; }   // 肉囊一鼓一鼓
      } else if (st === CAST) { setK(K.iJet, K.iJet, 0); if (tq < 1 / 12) { P.bx += 2; P.sw -= 0.5; } P.eyes = 2; P.glow = 2; P.rim = tq < 1 / 12 ? 2 : 1; }
      else { const q = seg(tq, 0.05, 0.55); setK(K.iJet, K.idle, q); P.eyes = q < 0.5 ? 2 : 0; P.glow = 1; }
    } else {   // roar：六条触手（半血怒吼），cast + recover 共 1.3 秒
      if (st === CHARGE) { setK(K.idle, K.rCoil, seg(tq, 0, 0.4, ease.out)); P.eyes = 1; P.glow = 1 + (tq > 0.3 ? 1 : 0); P.rim = 1; if (tq > 0.3) trem(f12, 0.03); }
      else if (st === CAST) { const q = seg(tq, 0, 1 / 12, ease.out); setK(K.rCoil, K.rFlare, tq < 1 / 12 ? 0.6 : 1); if (q >= 1) trem(f12, 0.04); P.eyes = 2; P.glow = 3; P.rim = tq < 2 / 12 ? 3 : 2; P.sk = 2; }
      else { if (tq < 0.2) { setK(K.rFlare, K.rFlare, 0); P.jaw = 1; trem(f12, 0.02); P.glow = 2; P.rim = 1; } else { const q = seg(tq, 0.2, 0.6); setK(K.rFlare, K.idle, q); P.glow = q < 0.5 ? 2 : 1; } P.eyes = 2; P.sk = tq < 0.3 ? 1 : 0; }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { setK(K.hurt, K.hurt, 0); P.eyes = 2; P.jaw = 2; P.flash = d < 1 / 12 ? 1 : 0; return; }
    if (d < 0.8) { const a = Math.floor(d * 6) & 1; setK(a ? K.dFlailA : K.dFlailB, a ? K.dFlailB : K.dFlailA, 0.25); P.eyes = 2; P.glow = 2; P.rim = 1; P.sk = 1; return; }   // 乱甩、哀嚎
    if (d < 1.3) { setK(K.dFlailA, K.dLimp, seg(d, 0.8, 1.3, ease.in)); P.eyes = 1; P.glow = 1; return; }
    setK(K.dLimp, K.dLimp, 0); P.eyes = 3; P.dv = 63; P.foam = 0;                                                  // 瘫软、合眼、一截截沉下去
    const q = clamp01((d - 1.35) / 1.05); P.by = 3 + Math.round(ease.in(q) * 34 / 2) * 2; P.spoff = Math.round(q * 8) / 8;
    if (d > 2.15) P.dq = Math.round(clamp01((d - 2.15) / 0.45) * 48) / 48;
  }
  // 发光体（蓄力汇聚点）：缠绕 / 怒吼是眼，墨汁是喷水管口，普攻是钩子的梢
  function focus() {
    geo();
    const p = MV === 'ink' && (P.st === CHARGE || P.st === CAST || P.st === RECOVER) ? L.sif : P.st === ATTACK ? TG[5].p[TN] : L.eye;
    P.fx = p[0]; P.fy = p[1];
  }

  // ───── 几何（画和特效共用）─────
  const L = { eye: [0, 0], sif: [0, 0], beak: [0, 0], head: [0, 0] };
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(2, -10, P.lean); }
  function mantXf() { bodyXf(); B.rot(-2, -32, P.ml); }
  function tentGeo(i) {
    const d = TD[i], g = TG[i]; bodyXf(); const r0 = B.at(d.r[0], d.r[1]); B.reset();
    const cv = d.c + Math.sign(d.c) * P.tc[i], len = d.l * P.tl[i], st = len / TN, dive = (P.dv >> i) & 1;
    let h = d.a + P.ta[i] + P.lean * (d.ss < 0 ? 0.4 : 1), x = r0[0], y = r0[1];
    g.p.length = 0; g.r.length = 0; g.h.length = 0; g.entry = null; g.cs = cv >= 0 ? 1 : -1;
    for (let k = 0; k <= TN; k++) {
      const s = k / TN, rad = d.w * (1 - 0.8 * s) + 0.35;
      if (!dive && y > -rad * 0.85) { y = -rad * 0.85; if (Math.sin(h) > 0) h = Math.cos(h) >= 0 ? 0 : PI; }        // 贴地：压在地面上，顺着地面伸
      if (dive && !g.entry && y > 0) g.entry = [x, 0];
      g.p.push([x, y]); g.r.push(rad); g.h.push(h);
      h += cv * 3.2 * Math.pow(s + 0.5 / TN, 2.2) / TN + P.wa * 0.09 * Math.sin(P.wph + i * 1.7 - k * 0.6);
      x += Math.cos(h) * st; y += Math.sin(h) * st;
    }
    if (dive && !g.entry) g.entry = [g.p[TN][0], Math.min(0, g.p[TN][1])];
  }
  function geo() {
    for (let i = 0; i < 6; i++) tentGeo(i);
    bodyXf(); L.eye = B.at(12, -28); L.beak = B.at(26, -13); L.head = B.at(6, -24); L.sif = B.at(6 + P.sif * 0.8, -19.3 + P.sif * 0.2); B.reset();
  }
  const pxW = (x, y, m, t) => B.pxW(E, x, y, m, t), dotW = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t);
  // 斑点：斑点熄灭（死亡）、全亮（发力）、待机时一颗颗闪
  const spotM = (n) => (P.spoff > 0 && ((n * 5) % 8) / 8 < P.spoff ? 0 : P.glow >= 2 || n % 11 === P.tw ? SPOTH : SPOT);

  function drawTent(i) {
    const d = TD[i], g = TG[i], far = d.far, m = far ? TENTD : TENT, pm = far ? TPD : TP, sm = far ? SUCKD : SUCK;
    part();
    for (let k = 1; k <= TN; k++) B.capW(E, g.p[k - 1][0], g.p[k - 1][1], g.p[k][0], g.p[k][1], g.r[k - 1], g.r[k], m);
    const ss = d.ss * g.cs;   // 吸盘那一侧
    for (let k = 1; k < TN; k++) {
      const [x, y] = g.p[k], h = g.h[k], r = g.r[k], nx = -Math.sin(h) * ss, ny = Math.cos(h) * ss;
      if (k < TN - 1) { pxW(x - nx * (r - 0.6), y - ny * (r - 0.6), pm, far ? 5 : 6); if (r > 2.2) pxW(x - nx * (r - 1.6), y - ny * (r - 1.6), pm, 4); }   // 背上的紫脊
      if (!far && k > 1 && k < TN - 2 && r > 1.6) pxW(x - nx * r * 0.2, y - ny * r * 0.2, m, 7);                          // 圆柱的高光
      if (k >= 2 && (k & 1) === 0) {                                                                                     // 吸盘：鼓出轮廓一点
        const sr = Math.max(0.6, r * 0.4), cx = x + nx * (r - sr * 0.2), cy = y + ny * (r - sr * 0.2);
        dotW(cx, cy, sr, P.sk && (P.sk === 2 || ((k + i) & 3) === 0) ? SUCKG : sm); if (sr > 1.1) pxW(cx, cy, sm, 2);
      }
      if (k % 4 === 2 && k < TN - 2) { const sp = spotM(i * 7 + k); if (sp) pxW(x - nx * r * 0.45, y - ny * r * 0.45, sp); }   // 发光斑点
    }
  }
  const MOT = [[-15, -47, 2.4, 1.4], [-9, -39, 2.8, 1.5], [2, -44, 2, 1.3], [-4, -54, 1.8, 1.2], [-17, -56, 1.6, 1]];
  const MSPOT = [[-13, -51], [-7, -58], [-1, -50], [-10, -44], [-4, -40], [3, -47], [-17, -42], [-16, -60], [-6, -47]];
  function drawMantle() {
    part(); mantXf(); const s = P.sw, sy = -s * 0.6;
    B.ell(E, -2, -34, 14 + s * 0.4, 7, 0, MANT);
    B.ell(E, -6, -46 + sy, 15.5 + s, 18.5 + s, -0.42, MANT);
    B.ell(E, -13, -58 + sy * 1.4, 9.5 + s * 0.5, 8.5 + s * 0.5, -0.5, MANT);
    B.ell(E, -1, -32.5, 13, 4, -0.08, MANTB);                                                                      // 下沿过渡成深海青
    for (const [x, y, rx, ry] of MOT) B.ell(E, x, y + sy, rx, ry, -0.4, MANTB, 4);                                  // 青色的斑驳
    B.ln(E, -19, -44 + sy, -14, -34, MANT, 3); B.ln(E, -8, -61 + sy, 2, -52 + sy, MANT, 4); B.ln(E, -20, -52 + sy, -16, -40 + sy, MANT, 4);   // 皱褶
    B.ell(E, -13, -58 + sy * 1.4, 3.6, 2, -0.5, MANT, 8); B.ln(E, -19, -50 + sy, -17, -58 + sy, MANT, 7);           // 顶上的湿亮高光
    MSPOT.forEach(([x, y], n) => { const sp = spotM(n); if (sp) { B.px(E, x, y + sy, sp); if (sp === SPOTH && P.glow >= 2) B.px(E, x + 1, y + sy, sp); } });
  }
  function drawWeb() { part(); bodyXf(); B.poly(E, [[-18, -17], [22, -17], [20, -8], [12, -5], [4, -8], [-4, -4], [-12, -7], [-20, -6]], TENTD); }
  const HSPOT = [[-3, -25], [2, -27], [-8, -22], [21, -24], [18, -18], [-1, -20]];
  function drawHead() {
    part(); bodyXf();
    B.ell(E, 4, -22, 17, 11.5, 0, HEAD); B.ell(E, 13, -22, 10.5, 9.5, 0.1, HEAD); B.ell(E, 2, -29, 11, 6, 0, HEAD);
    B.ell(E, -5, -29, 3.2, 1.6, 0, HEADP, 5); B.ell(E, 3, -32, 2.4, 1.2, 0, HEADP, 5); B.ell(E, -9, -24, 2, 1.2, 0, HEADP, 4);   // 头顶的紫斑
    B.ell(E, 12, -28, 7.8, 6.8, 0, HEAD, 2);                                                                          // 眼窝
    B.ell(E, 11.5, -33.4, 8.4, 2.5, 0.2, HEAD, 7); B.ln(E, 4, -35, 19, -31.5, HEAD, 8);                              // 厚眉棱，斜下来
    B.ln(E, 5, -21, 16, -20, HEAD, 3); B.ln(E, 7, -18.5, 14, -17.5, HEAD, 4); B.ln(E, 19, -30, 21, -24, HEAD, 4);   // 眼下的皱纹
    B.ell(E, 22, -14.5, 6.2, 4.6, 0, HEAD, 3);                                                                        // 嘴边一圈肉
    B.ln(E, -12, -18, -2, -16, HEAD, 4); B.ln(E, -14, -24, -10, -30, HEAD, 7);
    HSPOT.forEach(([x, y], n) => { const sp = spotM(n + 3); if (sp) B.px(E, x, y, sp); });
  }
  function drawEye() {
    const cx = 12, cy = -28, e = P.eyes; bodyXf();
    if (e === 3) { part(); B.ln(E, cx - 5, cy - 1, cx + 5, cy - 0.5, HEAD, 6); B.ln(E, cx - 5, cy, cx + 5, cy + 0.5, HEAD, 10); return; }   // 合上
    part(); const ry = e === 2 ? 5.4 : 5;
    B.ell(E, cx, cy, 6, ry, 0, EYEG, 2); B.ell(E, cx, cy + 0.2, 4.9, ry - 1.1, 0, EYEG, 3);                             // 金色的眼：外圈暗金
    const lk = P.look ? 1 : 0, pw = e === 2 ? 4.2 : 3.2;                                                              // 横着的缝瞳：平时两格粗，发怒时收成一条长缝
    const px0 = cx + lk; B.poly(E, [[px0 - pw - 0.5, cy + 0.5], [px0 - pw + 0.5, cy - 0.5], [px0 + pw - 0.5, cy - 0.5], [px0 + pw + 0.5, cy + 0.5], [px0 + pw - 0.5, cy + 1.5], [px0 - pw + 0.5, cy + 1.5]], PUPIL);
    B.px(E, cx - 3, cy - 2.5, GLINT); if (P.glow >= 2) { B.px(E, cx - 2, cy - 2.5, GLINT); B.px(E, cx + 3, cy + 2.5, GLINT); }
    const l0 = e === 1 ? -1.6 : e === 2 ? -5.2 : -4.6, l1 = e === 1 ? -0.2 : e === 2 ? -4.4 : -2.8;                   // 上眼皮：往前斜着压下来（凶）
    for (let yy = Math.floor(cy - ry); yy <= cy; yy++) for (let xx = cx - 6; xx <= cx + 6; xx++) {
      const u = (xx - cx) / 6.3, v = (yy - cy) / (ry + 0.3), lid = cy + l0 + (l1 - l0) * (xx - cx + 6) / 12;
      if (u * u + v * v <= 1 && yy < lid) B.px(E, xx, yy, HEAD, yy >= lid - 1 ? 2 : 5);
    }
  }
  function drawSiphon() {
    part(); bodyXf(); const s = P.sif, tx = 6 + s * 0.8, ty = -19.3 + s * 0.2;
    B.cap(E, -2, -22, tx, ty, 2.2 + s * 0.35, 1.8 + s * 0.5, HEAD, 6); B.ln(E, -1, -21, tx - 1, ty - 1, HEAD, 8);
    B.ell(E, tx + 0.3, ty, 0.8 + s * 0.3, 1.1 + s * 0.35, 0, s >= 1 ? INKM : HEAD, s >= 1 ? 2 : 10);
  }
  const UPB = [[19, -19], [23, -19.5], [27, -17.5], [29.5, -14], [29.5, -10.5], [28.3, -9], [27.4, -12], [25, -14.5], [21, -15], [19, -15.5]], LOWB = [[19.5, -14.5], [25, -14], [26, -11.5], [24, -9.5], [20, -11]];
  function drawBeak() {
    bodyXf(); const j = P.jaw;
    if (j) { part(); B.ell(E, 23, -12.5, 3.4 + j * 0.4, 1.6 + j * 1.3, 0.2, MOUTH); B.ln(E, 21, -12, 24, -11 + j, MOUTH, 4); }
    part(); B.save(); B.rot(19, -14, j * 0.42); B.poly(E, LOWB, BEAK); B.ln(E, 20, -13, 24.5, -12.5, BEAK, 7); B.restore();
    part(); B.save(); B.rot(19, -15, -j * 0.1); B.poly(E, UPB, BEAK); B.ln(E, 20, -18.3, 26, -17, BEAK, 8); B.ln(E, 27, -16, 28.6, -12.5, BEAK, 8); B.px(E, 28.6, -10, BEAK, 9); B.ln(E, 21, -15.8, 26, -14.6, BEAK, 3); B.restore();
  }
  function drawFoam() {   // 身子底下一圈港口的白沫
    if (!P.foam) return; part(); const ph = Math.round(P.wph / (PI / 6));
    for (let x = -22; x <= 28; x++) { const k = (x * 7 + ph * 3 + 90) % 13, hgt = k === 0 ? 2 : k === 6 || k === 1 ? 1 : 0; for (let j = 0; j < hgt; j++) pxW(x + P.bx, -j, FOAM, j ? 3 : 2); }
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 0); B.zoom(z); geo();
    drawTent(0); drawTent(2); drawTent(1);
    drawMantle(); drawWeb(); drawHead(); drawSiphon(); drawTent(3); drawEye(); drawTent(5); drawTent(4); drawBeak(); drawFoam();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    const ls = [];
    if (P.glow && P.eyes !== 3) { LE.x = L.eye[0] * z + spr.ox; LE.y = L.eye[1] * z + spr.oy; LE.r = (5 + P.glow * 4) * z; ls.push(LE); }
    if (P.glow >= 2 && MV !== 'ink' && P.st >= CHARGE && P.st <= RECOVER) { LS.x = (L.eye[0] + 12) * z + spr.ox; LS.y = (L.eye[1] - 10) * z + spr.oy; LS.r = 30 * z; ls.push(LS); }   // 发力时全身斑点映出的青绿光
    RIM.lights = ls.length ? ls : null;
    bake(spr, RIM);
  }
  // 立绘：半血怒吼那一刻（撑高、六条触手张到最开、鸟喙大张、斑点全亮），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  const headAt = () => { bodyXf(); const c = B.at(15, -24); B.reset(); return c; };
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 3 / 12, 0); P.glow = 2; P.rim = 2; P.foam = 0; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; const c = headAt(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'grab'; poseAt(IDLE, 0.2, 0); P.eyes = 0; P.glow = 2; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; const c = headAt(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }   // 头像：待机侧脸、金眼亮着

  // ───── 特效 ─────
  const sx = (px) => scrX(px), sy = (py) => HY + py;
  let splT = 9, geyT = 9, lastF = -1, inkT = 9;
  const drop = (x, y, vx, vy, life, ramp) => spawnX(K_PHYS, x, y, vx, vy, life, ramp == null ? FXI.water : ramp, { g: 220, floor: HY });
  function strikeFx() {   // 普攻：钩子触手平拍在身前地上
    const g = TG[5], tp = g.p[TN], x = sx(tp[0]), y = HY;
    for (let k = 6; k <= TN; k += 2) { const p = g.p[k]; spawn(K_BURST, sx(p[0]), sy(p[1]) - 2, (Math.random() - 0.5) * 40, -20 - Math.random() * 40, 0.25, GLS); }
    for (let i = 0; i < 14; i++) drop(x - 8 + Math.random() * 16, y - 2, (Math.random() - 0.5) * 90, -60 - Math.random() * 80, 0.6 + Math.random() * 0.3);
    burst(x, y - 1, 8, 20, 70, 0.3, 0.6, FXI.dust, 8); fx.wave(x, y, 1, 18, 5, 'water', 0.35, 2); fx.wave(x, y, -1, 14, 4, 'water', 0.35, 2);
    fx.cross(x, y - 4, 6, GLS, 0.16); hitDummy(1, 1); shake(0.15, 2);
  }
  function grabFx() {   // 缠绕：五条扎进地里，入土处水柱和碎土炸起
    for (let i = 0; i < 6; i++) { const e = TG[i].entry; if (!e) continue; const x = sx(e[0]);
      for (let n = 0; n < 8; n++) drop(x + (Math.random() - 0.5) * 6, HY - 1, (Math.random() - 0.5) * 70, -90 - Math.random() * 90, 0.7 + Math.random() * 0.3);
      burst(x, HY - 1, 10, 30, 90, 0.3, 0.6, FXI.dust, 14); fx.crack(x, HY, 10, i & 1 ? 1 : -1, 'water', 0.9); }
    const f = TG[5].entry || [40, 0], x = sx(f[0]);
    ring(x, HY - 2, 1, GLS); ring(sx(L.head[0]), HY - 2, 0, FXI.water); fx.wave(x, HY, 1, 40, 8, 'water', 0.5, 2);
    shake(0.35, 3); flash(0.08); geyT = 0; hitDummy(1, 1);
  }
  function inkFx() {   // 墨汁：喷水管往前喷出一大团墨
    const x = sx(L.sif[0]), y = sy(L.sif[1]);
    fx.beam(x, y, x + 60, y + 6, 2, INKI, 0.25, 2); fx.cloud(x + 34, y + 2, 14, INKI, 1.1, 2); fx.cloud(x + 56, y + 6, 11, INKI, 1.0, 2);
    for (let i = 0; i < 34; i++) spawnX(K_PHYS, x + 2, y + (Math.random() - 0.5) * 4, 90 + Math.random() * 170, (Math.random() - 0.6) * 70, 0.5 + Math.random() * 0.5, INKI, { g: 120, floor: HY, dragX: 0.3 });
    ring(x, y, 0, INKI); burst(x, y, 10, 20, 60, 0.3, 0.5, GLS, 6); shake(0.3, 3); flash(0.06); inkT = 0;
  }
  function roarFx() {
    const hx = sx(L.head[0]), hy = sy(L.head[1] - 10);
    ring(hx, hy, 1, GLS); ring(hx, hy, 1, FXI.water); flash(0.12); shake(0.35, 3);
    for (let i = 0; i < 6; i++) { const tp = TG[i].p[TN]; burst(sx(tp[0]), sy(tp[1]), 6, 20, 70, 0.3, 0.6, GLS, 10); for (let n = 0; n < 3; n++) drop(sx(tp[0]), sy(tp[1]), (Math.random() - 0.5) * 60, -40 - Math.random() * 50, 0.8); }
    for (let i = 0; i < 16; i++) drop(hx + (Math.random() - 0.5) * 40, HY - 2, (Math.random() - 0.5) * 80, -70 - Math.random() * 90, 0.8 + Math.random() * 0.3);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'grab') { grabFx(); sfx('boss', { k: 'slam', w: 1 }); sfx('impact', { pal: 'water', w: 1 }); sfx('boss', { k: 'krSlap', w: 1 }); }
      else if (MV === 'ink') { inkFx(); sfx('boss', { k: 'krInk', w: 1 }); sfx('impact', { pal: 'shadow', w: 0.7 }); }
      else { roarFx(); sfx('boss', { k: 'krRoar', w: 1 }); sfx('boss', { k: 'roar', w: 0.6 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === CHARGE) { lastF = -1; sfx('boss', { k: MV === 'ink' ? 'krSwell' : MV === 'roar' ? 'growl' : 'krGurgle', w: 0.9 }); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) { sfx('swing', { kind: 'claw', w: 0.8 }); sfx('boss', { k: 'krGurgle', w: 0.4 }); }
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'smash', w: 0.95 }); sfx('hit', { mat: 'flesh', w: 0.9 }); sfx('boss', { k: 'krSlap', w: 0.7 }); }
    if (s === CHARGE && t === 0.4) sfx('boss', { k: MV === 'grab' ? 'growl' : 'krGurgle', w: 0.7 });
    if (s === RECOVER && MV === 'grab' && t === 0.3) { for (let i = 0; i < 6; i++) { const e = TG[i].entry; if (e) burst(sx(e[0]), HY - 1, 6, 20, 60, 0.3, 0.5, FXI.dust, 10); } sfx('boss', { k: 'thud', w: 0.6 }); }
    if (s === DEATH && t === INCOMING + 0.35) sfx('boss', { k: 'krDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.2) { for (let i = 0; i < 6; i++) { const p = TG[i].p[TN >> 1]; for (let n = 0; n < 3; n++) drop(sx(p[0]), HY - 2, (Math.random() - 0.5) * 60, -40 - Math.random() * 50, 0.6); } shake(0.2, 2); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.5) { splT = 0; sfx('boss', { k: 'sink', w: 1 }); }
    if (s === DEATH && t === INCOMING + 2.2) { for (let i = 0; i < 24; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), HY - 2 - Math.random() * 20, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, GLS); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [0.4], [], [0.3], [], [INCOMING + 0.35, INCOMING + 1.2, INCOMING + 1.5, INCOMING + 2.2], []];
  function stepFX(dt, state, stT) {
    splT += dt; geyT += dt; inkT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f;
        if (f === 2 || f === 6) { const tp = TG[f === 2 ? 4 : 1].p[TN >> 1], x = sx(tp[0]); for (let i = 0; i < 4; i++) drop(x + (Math.random() - 0.5) * 8, HY - 1, (Math.random() - 0.5) * 40, -30 - Math.random() * 40, 0.5); sfx('step', { w: 0.8 }); } }
    }
    if (state === CHARGE && Math.random() < 0.45) {   // 蓄力：缠绕 / 怒吼是青绿光点往眼上汇，墨汁是墨滴往管口汇
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 16, gx = sx(P.fx), gy = sy(P.fy), rp = MV === 'ink' ? INKI : GLS;
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, rp, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'grab' && P.sk && Math.random() < 0.3) { const g = TG[(Math.random() * 6) | 0], p = g.p[4 + ((Math.random() * 10) | 0)]; spawn(K_EMBER, sx(p[0]), sy(p[1]), 0, -8, 0.3, GLS); }   // 吸盘冒光
    if (geyT < 0.7 && Math.random() < 0.7) { const g = TG[(Math.random() * 6) | 0]; if (g.entry) drop(sx(g.entry[0]) + (Math.random() - 0.5) * 4, HY - 1, (Math.random() - 0.5) * 30, -80 - Math.random() * 60, 0.6); }   // 入土处的水柱
    if (inkT < 1.2 && Math.random() < 0.3) spawnX(K_PHYS, sx(L.sif[0]) + 1, sy(L.sif[1]) + 1, 4, 10, 0.8, INKI, { g: 160, floor: HY });   // 管口滴墨
    if (state === IDLE && Math.random() < 0.05) { const tp = TG[Math.random() < 0.5 ? 5 : 2].p[TN - 1]; drop(sx(tp[0]), sy(tp[1]) + 1, 0, 6, 0.8); }   // 触手梢滴水
    if (state === IDLE && Math.random() < 0.04) spawn(K_RISE, sx(-20 + Math.random() * 30), sy(-40 - Math.random() * 20), 0, -8, 0.6, GLS);
    if (state === DEATH && splT < 1.3 && Math.random() < 0.6) spawn(K_RISE, sx(-30 + Math.random() * 60), HY - 2 - Math.random() * 8, (Math.random() - 0.5) * 6, -16 - Math.random() * 14, 0.6 + Math.random() * 0.5, FXI.water);   // 沉下去冒的气泡
  }
  function fxReset() { splT = 9; geyT = 9; inkT = 9; lastF = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(L.head[0]); for (let dx = -16; dx <= 16; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, GR[Math.abs(dx) < 7 ? 2 : 3]); }   // 地面映出的青绿光
    if (inkT < 1.2) { const x = sx(L.sif[0]) + 34; for (let dx = -22; dx <= 26; dx++) if (((dx + f12) % 3) !== 0) E.put(x + dx, HY + 1, IR[Math.abs(dx) < 12 ? 3 : 4]); }   // 地上的墨渍
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'grab'; return MVDUR[MV]; }

  const VOICES = {
    krGurgle: (s, t, w, p) => { s.tone(t, 'sine', 82, 0.6, 0.08 * w, { to: 52, vib: [9, 120, 0.1], lp: 500, pan: p }); s.nz(t, 0.6, 'lowpass', 420, 0.8, 0.06 * w, { src: 'brown', pan: p });
      for (let i = 0; i < 6; i++) s.blip(t + 0.04 + i * 0.08, 160 + ((i * 53) % 140), 0.03 * w, { pan: p }); },
    krSwell: (s, t, w, p) => { s.tone(t, 'sawtooth', 52, 1.0, 0.05 * w, { to: 96, lp: 420, pan: p }); s.riser(t, t + 0.95, 180, 900, 0.05 * w, { pan: p });
      for (let i = 0; i < 5; i++) s.blip(t + 0.2 + i * 0.15, 120 + i * 30, 0.025 * w, { pan: p }); },
    krInk: (s, t, w, p) => { s.nz(t, 0.5, 'bandpass', 700, 0.8, 0.15 * w, { to: 240, pan: p }); s.thud(t, 110, 38, 0.35, 0.25 * w, { pan: p }); s.whoosh(t, 0.45, 1300, 280, 0.08 * w, { pan: p });
      for (let i = 0; i < 6; i++) s.blip(t + 0.08 + i * 0.06, 260 - i * 25, 0.025 * w, { pan: p }); },
    krSlap: (s, t, w, p) => { s.nz(t, 0.08, 'bandpass', 1400, 1.0, 0.18 * w, { pan: p }); s.thud(t, 140, 48, 0.22, 0.26 * w, { pan: p }); s.nz(t + 0.03, 0.35, 'highpass', 2500, 0.6, 0.05 * w, { a: 0.02, pan: p }); },
    krRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 72, 1.3, 0.08 * w, { to: 46, vib: [6, 90, 0.2], lp: 700, pan: p, rev: 0.5 }); s.tone(t + 0.03, 'square', 108, 1.1, 0.03 * w, { to: 70, lp: 500, pan: p });
      s.nz(t, 1.2, 'lowpass', 520, 0.9, 0.08 * w, { src: 'brown', pan: p }); s.rumble(t, 1.3, 0.18 * w, { f: 120, pan: p });
      for (let i = 0; i < 8; i++) s.blip(t + 0.1 + i * 0.12, 140 + ((i * 71) % 160), 0.025 * w, { pan: p }); },
    krDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 92, 1.6, 0.06 * w, { to: 34, vib: [4, 80, 0.3], lp: 600, pan: p, rev: 0.5 }); s.nz(t + 0.2, 1.2, 'lowpass', 380, 0.7, 0.05 * w, { src: 'brown', a: 0.2, pan: p });
      for (let i = 0; i < 7; i++) s.blip(t + 0.5 + i * 0.16, 220 - i * 22, 0.02 * w, { pan: p }); },
  };

  return {
    name: '克拉肯', HX, R_EL: GLS, DUR, hero, P, GLOW_MATS: [EYEG, PUPIL, GLINT, SPOT, SPOTH, SUCKG, MOUTH, INKM, FOAM], HIT_POINT: [8, -30], EVENTS, MAX_H: 88, OWN_MAX: 100, SHEET_K: 3, VOICES,
    SFX: { body: 'flesh', how: 'topple', pal: 'water', style: 'water', w: 1 },
    MOVES: ['grab', 'ink', 'roar'], MOVE_NAMES: { grab: '缠绕', ink: '墨汁', roar: '六条触手（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.6, 1.3, 1.5, 1.75, 2.0]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0.08, 0.25, 0.5, 0.83], 'grab'], [CAST, [0, 2 / 12], 'grab'], [RECOVER, [0.17, 0.42, 0.58], 'grab'],
      [CHARGE, [0.17, 0.5, 0.67, 0.75], 'ink'], [CAST, [0, 2 / 12], 'ink'], [RECOVER, [0.17, 0.42], 'ink'],
      [CHARGE, [0.17, 0.42], 'roar'], [CAST, [0, 3 / 12, 0.58], 'roar'], [RECOVER, [0.1, 0.33, 0.5], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.75, 0.95, 1.3, 1.7, 2.0, 2.3, 2.6]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
