// 豹帝（小首领，地下赌场 · 牌桌）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js / B_ChaosButcher.js。
// 依据：附录 G2「戴冠的豹子」；被动 闪身（单下超过它 3% 生命的伤害，40% 躲开，半血后 60%）；招式 pounce 飞扑（扑向后排血最少的）、
//       claws 连爪（连抓 5 下）；半血的怒吼 = 闪身。
// 设定卡 ——
//   剪影：一头站起来的高挑豹子帝王：趾行的长腿（膝盖朝前、脚踝抬离地面）、细腰宽胸、微微前倾；身后一件拖到脚踝的深紫王袍，
//         领口一圈带黑色尾尖的白貂皮，下摆也镶貂皮、袍边一道金绣线；身前一条金腰带和一片金边紫垂摆；一条长长的豹尾从袍下甩出来、尾尖是黑的。
//         身体约 64 格高（冠尖到 70）。和巨掌（棕熊 + 蜂巢）、荷官 / 发牌人（人类）一眼能分开：金黄豹纹 + 紫 + 金。
//   脸（识别点）：金黄的豹脸，奶油色口鼻、黑色泪线、玫瑰色鼻头、长长的白胡须、翡翠绿的竖瞳眼睛；头顶歪戴一顶五尖金冠（中间一颗翡翠、两颗紫宝石、尖上是珍珠）。
//   身上：金黄的毛上一个个黑色的空心豹斑；大臂一只金臂环、手腕两道金镯子、每根手指一枚金戒、爪尖包金；胸前一枚黑桃形的金扣（牌桌）镶翡翠，
//         左右一条金链连到貂皮领上。
//   主色：暗金黄的毛（压暗）+ 深紫王袍 + 白貂皮 + 金饰；光：翡翠的眼睛和宝石、爪尖蓄力时的金光、金色轮廓光。
//   招式（setMove）：
//     pounce 飞扑：趴低、前掌按地、屁股抬起左右扭、尾巴甩、爪尖越来越亮 → 整个身子拉直飞出去（前爪张开、王袍往后飘、身后紫金残影）
//                  → 四爪落地压低（地上三道金色爪痕）→ 站起来。冲刺本身由游戏画。
//     claws 连爪：踮脚站高、两只爪子举过头顶张开 → 左右交替连抓 5 下（每下一道三线金爪痕，最后一下最重）→ 甩甩爪子放下。
//     roar 闪身（半血怒吼，游戏从 cast 开始播，cast + recover 约 1.3 秒）：一闪往后滑步、原地留下一个紫色的残影
//                  → 站直张开两臂、王袍炸开，仰头咆哮（两道环：紫、金），眼睛和冠上的翡翠亮起。
//   待机：两档呼吸、尾巴和王袍摆动、耳朵偶尔一抖、眨眼；个性动作是用拇指把一枚金币弹上去、看着它转、接住攥进掌心（牌桌上的豹帝）。
//   移动：轻快的潜行步，8 帧一圈（2/3 秒），身体前倾、尾巴翘着摆、王袍一鼓一鼓。
//   死亡：挨打晃了晃、金冠从头上掉下来翻一圈滚到身前 → 跪倒、两爪撑地 → 往前趴倒、尾巴最后拍一下地 → 化成往上飘的金色光点。
PCD.define('B_LeopardEmperorSavalon', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_STILL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, PI = Math.PI;

  // ───── 材质（11 级，暗 → 亮）：毛和袍压暗，翡翠、金爪、金饰的高光才亮得出来 ─────
  const R_FUR = ['#0e0803', '#211306', '#361f0a', '#4d2d0e', '#653c12', '#7e4c16', '#98601c', '#b27422', '#c98a2c', '#dca23c', '#ecbc58'];     // 金黄豹毛
  const R_CREAM = ['#100c08', '#211a12', '#33291c', '#473a29', '#5c4c37', '#725f46', '#887357', '#9e8869', '#b39d7d', '#c7b292', '#d9c7a8'];   // 奶油色的口鼻、胸腹
  const R_ROYAL = ['#0a0510', '#170a22', '#241033', '#321645', '#401c57', '#4f2369', '#5f2b7b', '#70358c', '#82409c', '#944dab', '#a85cba'];   // 深紫王袍
  const R_ERM = ['#101014', '#24242a', '#3a3a42', '#52525a', '#6c6c74', '#86868d', '#a0a0a6', '#b9b9be', '#d0d0d4', '#e4e4e7', '#f6f6f7'];     // 白貂皮
  const R_NOSE = ['#0c0506', '#1e0c0e', '#331418', '#4a1e22', '#62282c', '#7a3438', '#924046', '#aa5058', '#c06068', '#d47480', '#e48a94'];    // 玫瑰色鼻头、舌头
  const FUR = defDeep(R_FUR, { depth: 7, amb: 0.14 }), FURL = defDeep(R_FUR, { depth: 5, amb: 0.14 }), FURD = defDeep(R_FUR, { depth: 5, dark: 3, amb: 0.1 });
  const CREAM = defDeep(R_CREAM, { depth: 4, amb: 0.2 }), ROYAL = defDeep(R_ROYAL, { depth: 7, amb: 0.12 }), ROYALD = defDeep(R_ROYAL, { depth: 4, dark: 2, amb: 0.1 });
  const ERM = defDeep(R_ERM, { depth: 3, amb: 0.5 }), NOSE = defDeep(R_NOSE, { depth: 1, amb: 0.3 }), GOLD = defDeep('brass', { depth: 2, amb: 0.25 });
  const TEETH = defDeep('ivory', { depth: 1, amb: 0.4 }), CLAW = defDeep('ivory', { depth: 1, amb: 0.35 });
  const GLD = fxRamp('lpGold', ['#ffffff', '#fff2a8', '#f6c445', '#b67a1a', '#4c2c08']), GR = FXR[GLD];                  // 金光：白 → 淡金 → 金 → 暗金
  const EMR = fxRamp('lpEmer', ['#ffffff', '#c8ffe0', '#48e890', '#149a58', '#063c26']), ER = FXR[EMR];                  // 翡翠
  const RYL = fxRamp('lpRoyal', ['#ffffff', '#ecd0ff', '#b66cf0', '#6e2ea6', '#2c0e44']), YR = FXR[RYL];                 // 王袍的紫光（残影）
  const EYE = defMat([ER[4], ER[3], ER[2], ER[2]], 1, 1), EYEC = defMat([ER[3], ER[1], ER[1], ER[1]], 1, 1), MOUTH = defMat([FXR[FXI.blood][4], FXR[FXI.blood][4], FXR[FXI.blood][4], FXR[FXI.blood][4]], 1, 1);
  const CLAWG = defMat([GR[3], GR[2], GR[1], GR[1]], 1, 1), SPARK = defMat([GR[0], GR[0], GR[0], GR[0]], 1, 1);
  const hero = new Sprite(180, 124, 82, 114);
  const DUR = [3.0, 4 / 3, 0.8, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { pounce: { 3: 0.7, 4: 0.4, 5: 0.6 }, claws: { 3: 0.6, 4: 0.8, 5: 0.5 }, roar: { 3: 0.5, 4: 0.6, 5: 0.7 } };
  let MV = 'pounce';
  const HX = 60;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [GR[3], GR[2], GR[1]], k: 0.55 }, { x: 0, y: 0, r: 0, ramp: [ER[3], ER[2], ER[1]], k: 0.5 }];
  const RIM_R = [0, 11, 17, 25], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: GR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of [EYE, EYEC, MOUTH, CLAWG, SPARK]) RIM.skip[m] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  // 上身绕胯（HIP）前倾 P.lean；头绕脖子 P.hd。脚掌（fn / ff）和手（hn / hf）是精灵本地坐标；趾行腿：胯 → 膝（朝前）→ 踝，踝 → 脚掌一段跖骨（角度 mta / mtb，0 = 竖直、正 = 脚掌在前）。
  const HIP = [0, -30], NECK = [9, -52], LN = [2, -29], LF = [-3, -30], SHN = [8, -50], SHF = [0, -51], MT = 9;
  const D0 = { bx: 0, by: 0, lean: 0.02, hd: 0, jaw: 0, ear: 0, tail: 0, tc: 0.3, cape: 0.2, sk: 0, mta: 0.55, mtb: 0.55,
    fn: [8, -1.5], ff: [-4, -1.5], hn: [14, -31], hf: [3, -32], cn: 0, cf: 0 };
  const K = {
    idle: {},
    coin: { hn: [17, -44], hd: 0.06, ear: 1 },                                                                                         // 待机：弹金币
    walk: { lean: 0.16, hd: -0.1, ear: 1, tc: 0.8, cape: 0.8 },
    aWind: { lean: -0.12, bx: -1, hd: -0.1, jaw: 1, hn: [3, -63], hf: [15, -40], cn: 1, fn: [10, -1.5], ear: 1, tc: 1.2, cape: 0.8 },    // 普攻：爪子抡到脑后
    aStrike: { lean: 0.28, bx: 5, by: 2, hd: 0.1, jaw: 2, hn: [34, -33], hf: [-6, -40], cn: 1, fn: [14, -1.5], ff: [-6, -1.5], tc: 1, cape: 1.2 },
    aFollow: { lean: 0.3, bx: 5, by: 3, hd: 0.12, jaw: 1, hn: [26, -21], hf: [-4, -38], cn: 1, fn: [14, -1.5], ff: [-6, -1.5], tc: 1, cape: 1 },
    pCrouch: { by: 13, lean: 0.62, hd: -0.45, jaw: 1, hn: [26, -6], hf: [19, -8], cn: 1, cf: 1, fn: [8, -1.5], ff: [-6, -1.5], mta: 1.3, mtb: 1.3, ear: 1, tc: 2, cape: 1 },   // 飞扑：趴低
    pLeap: { by: -10, lean: 1.2, hd: -0.95, jaw: 2, hn: [42, -37], hf: [39, -42], cn: 1, cf: 1, fn: [-26, -26], ff: [-22, -30], mta: -1.6, mtb: -1.5, ear: 2, tc: 3, cape: 0.8 },
    pLand: { by: 13, lean: 0.55, hd: -0.4, jaw: 1, hn: [26, -8], hf: [20, -7], cn: 1, cf: 1, fn: [10, -1.5], ff: [-8, -1.5], mta: 1.2, mtb: 1.1, ear: 1, tc: 1.2, cape: 1.6 },
    cRear: { by: -2, lean: -0.1, hd: -0.12, jaw: 1, hn: [20, -64], hf: [-6, -62], cn: 1, cf: 1, fn: [9, -1.5], ff: [-6, -1.5], mta: 0.35, mtb: 0.35, ear: 1, tc: 1.5, cape: 1 },   // 连爪：踮脚、两爪举高
    cSwN: { lean: 0.22, bx: 4, by: 1, hd: 0.1, jaw: 2, hn: [33, -32], hf: [3, -56], cn: 1, cf: 1, fn: [12, -1.5], ff: [-5, -1.5], tc: 1.3, cape: 1.2 },
    cSwF: { lean: 0.2, bx: 4, by: 1, hd: 0.06, jaw: 2, hn: [9, -57], hf: [30, -35], cn: 1, cf: 1, fn: [12, -1.5], ff: [-5, -1.5], tc: 1.3, cape: 1.2 },
    rCrouch: { by: 4, lean: 0.25, hd: -0.2, jaw: 1, hn: [15, -38], hf: [-8, -36], cn: 1, cf: 1, ear: 2, tc: 2, cape: 0.4, fn: [10, -1.5], ff: [-6, -1.5], mta: 0.8, mtb: 0.8 },   // 闪身：伏低
    rSlide: { bx: -9, by: 2, lean: 0.12, hd: -0.1, jaw: 1, hn: [8, -40], hf: [-14, -38], cn: 1, cf: 1, ear: 2, tc: 3, cape: 1.8, fn: [0, -1.5], ff: [-14, -1.5], sk: 3 },
    rRoar: { by: -1, lean: -0.16, hd: -0.26, jaw: 2, hn: [31, -49], hf: [-16, -60], cn: 1, cf: 1, ear: 1, tc: 1.4, cape: 2.2, fn: [11, -1.5], ff: [-8, -1.5] },
    hurt: { lean: -0.2, bx: -3, hd: -0.25, jaw: 1, hn: [16, -40], hf: [-4, -42], ear: 2, tail: -1, tc: 1.2, cape: 0.8 },
    dStag: { lean: -0.1, bx: -2, hd: 0.3, jaw: 1, hn: [14, -30], hf: [-2, -30], ear: 2, tc: 0.4 },
    dKneel: { by: 12, lean: 0.3, hd: 0.45, hn: [20, -6], hf: [12, -6], fn: [10, -1.5], ff: [-10, -1.5], mta: 1.35, mtb: 1.35, ear: 2, tc: 0, cape: -0.4 },
    dFall: { by: 18, lean: 1.35, hd: 0.2, hn: [34, -3], hf: [28, -2], fn: [4, -1.5], ff: [-10, -1.5], mta: 1.5, mtb: 1.5, ear: 2, tc: -1, cape: -1 },
  };
  const NUM = ['bx', 'by', 'lean', 'hd', 'jaw', 'ear', 'tail', 'tc', 'cape', 'sk', 'mta', 'mtb'], VEC = ['fn', 'ff', 'hn', 'hf'], DIS = ['cn', 'cf'];

  const P = {};
  const FIELDS = ['st', ...NUM, 'fnx', 'fny', 'ffx', 'ffy', 'hnx', 'hny', 'hfx', 'hfy', ...DIS, 'eyes', 'glow', 'rim', 'flash', 'dq', 'coin', 'cox', 'coy', 'cos', 'crown', 'cru', 'glint'];
  function base() { P.st = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.coin = 0; P.cox = 0; P.coy = 0; P.cos = 0; P.crown = 0; P.cru = 0; P.glint = 0; P.mx = 0; P.flip = 0; setK(K.idle, K.idle, 0); }
  const val = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of NUM) { const va = val(a, f); P[f] = va + (val(b, f) - va) * q; }
    for (const f of VEC) { const va = val(a, f), vb = val(b, f); P[f + 'x'] = va[0] + (vb[0] - va[0]) * q; P[f + 'y'] = va[1] + (vb[1] - va[1]) * q; }
    for (const f of DIS) P[f] = q < 0.5 ? val(a, f) : val(b, f);
  }
  // 潜行步：8 帧一圈（2/3 秒）。脚：支撑 5 帧往后滑，摆动 3 帧抬起；近脚、远脚差半圈
  const foot = (p) => { p = ((p % 1) + 1) % 1; if (p < 0.6) return [7 - 14 * p / 0.6, 0]; const q = (p - 0.6) / 0.4; return [-7 + 14 * q, Math.round(4 * Math.sin(PI * q))]; };
  const W_BY = [1, 0, -1, 0, 1, 0, -1, 0], W_TL = [1, 2, 1, 0, -1, -2, -1, 0], W_SK = [-2, -1, 0, 1, 2, 1, 0, -1];
  function walk(f) {
    f = ((f % 8) + 8) % 8; setK(K.walk, K.walk, 0);
    const a = foot(f / 8), b = foot(f / 8 + 0.5);
    P.fnx = 5 + a[0]; P.fny = -1.5 - a[1]; P.ffx = -2 + b[0]; P.ffy = -1.5 - b[1];
    P.mta = a[1] ? 0.25 : 0.55 - Math.max(0, -a[0]) * 0.03; P.mtb = b[1] ? 0.25 : 0.55 - Math.max(0, -b[0]) * 0.03;
    P.by = W_BY[f]; P.hnx += -a[0] * 0.6; P.hfx += -b[0] * 0.6; P.hny += P.by; P.hfy += P.by;
    P.tail = W_TL[f]; P.cape = 0.8 + (f & 1 ? 0.25 : 0); P.sk = W_SK[f];
  }
  const trem = (f12, a) => { const s = f12 & 1 ? 1 : -1; P.bx += s * a * 0.5; P.hny += s * a * 0.5; P.hfy -= s * a * 0.5; };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.hny += b; P.hfy += b;
      P.tail = [0, 1, 2, 1, 0, -1][Math.floor(tt / 0.35) % 6]; P.sk = [0, 1, 1, 0, -1, -1][Math.floor(tt / 0.4) % 6] * 0.6; P.cape = 0.2 + b * 0.15;
      const lp = tt % DUR[IDLE];
      if (lp >= 0.5 && lp < 0.67) P.ear = 1.6;                                                                           // 耳朵一抖
      if (lp >= 2.75 && lp < 2.84) P.eyes = 3;                                                                           // 眨眼
      if (lp >= 1.1 && lp < 2.4) {                                                                                       // 待机个性：拇指弹金币、看着它转、接住
        const k = lp - 1.1;
        if (k < 0.25) { setK(K.idle, K.coin, ease.out(k / 0.25)); P.coin = 2; }
        else if (k < 0.83) {
          setK(K.coin, K.coin, 0); const u = (k - 0.25) / 0.58; P.coin = 1; P.cox = K.coin.hn[0] + 10 + 2 * u; P.coy = K.coin.hn[1] - 4 - 17 * 4 * u * (1 - u); P.cos = k * 16;
          P.hd = -0.08 - 0.14 * Math.sin(PI * u); if (k < 0.33) P.hny -= 1.5; P.glint = 1;
        } else if (k < 1.05) { setK(K.coin, K.coin, 0); P.coin = 2; P.eyes = 1; if (k < 0.92) P.hny += 1; P.hd = 0.1; }
        else { setK(K.coin, K.idle, ease.inOut((k - 1.05) / 0.25)); P.coin = k < 1.15 ? 2 : 0; }
        P.by += b; P.hny += b;
      }
      if ((f12 % 11) === 0) P.glint = 1;
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 26, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < 0.25) { const q = ease.out(tq / 0.25); setK(K.idle, K.aWind, q); P.glow = 1; P.eyes = 2; }
      else if (tq < T_STRIKE) { setK(K.aWind, K.aWind, 0); P.glow = 2; P.rim = 1; P.eyes = 2; P.hny -= 1; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.aStrike, K.aStrike, 0); P.glow = 3; P.rim = 2; P.eyes = 2; }
      else if (tq < 0.5) { const q = ease.out((tq - T_STRIKE - 1 / 12) / (0.5 - T_STRIKE - 1 / 12)); setK(K.aStrike, K.aFollow, q); P.glow = 2; P.rim = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.25)); setK(K.aFollow, K.idle, q); P.glow = q < 0.4 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; P.tail = 2; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); setK(K.hurt, K.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.jaw = Math.round(P.jaw); P.tail = Math.round(P.tail); geo(); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { pounce: 0, claws: 1, roar: 2 };
  const T_STRIKE = 4 / 12;
  const CLAW_T = [1 / 12, 3 / 12, 5 / 12, 7 / 12, 9 / 12];
  const seg = (tq, t0, t1, e) => (e || ease.inOut)(clamp01((tq - t0) / (t1 - t0)));
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'pounce') {
      if (st === CHARGE) {                                                                                               // 趴低、屁股左右扭、尾巴甩
        setK(K.idle, K.pCrouch, seg(tq, 0, 0.25, ease.out));
        if (tq > 0.25) { P.lean += sh ? 0.03 : -0.03; P.sk = sh ? 1.5 : -1.5; P.tail = (f12 % 4) < 2 ? 2 : -2; if (tq > 0.5) trem(f12, 1); }
        P.glow = tq < 0.3 ? 1 : 2 + (tq > 0.5 ? sh : 0); P.rim = tq > 0.3 ? 2 : 1; P.eyes = 2;
      } else if (st === CAST) {                                                                                          // 飞出去：身子拉直
        if (tq < 1 / 12) setK(K.pCrouch, K.pLeap, 0.55); else setK(K.pLeap, K.pLeap, 0);
        P.glow = tq < 2 / 12 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.tail = sh ? 1 : 0;
      } else {                                                                                                           // 落地压低 → 站起来
        if (tq < 0.1) setK(K.pLeap, K.pLand, seg(tq, 0, 0.1, ease.out));
        else if (tq < 0.3) { setK(K.pLand, K.pLand, 0); if (tq < 0.2) P.by += 1; }
        else setK(K.pLand, K.idle, seg(tq, 0.3, 0.58));
        P.glow = tq < 0.25 ? 2 : tq < 0.4 ? 1 : 0; P.eyes = tq < 0.4 ? 2 : 0; P.rim = tq < 0.2 ? 1 : 0;
      }
    } else if (MV === 'claws') {
      if (st === CHARGE) {                                                                                               // 踮脚、两爪举过头顶
        setK(K.idle, K.cRear, seg(tq, 0, 0.25, ease.out));
        if (tq > 0.25) { trem(f12, 1.2); P.jaw = sh ? 2 : 1; }
        P.glow = tq < 0.25 ? 1 : 2 + (tq > 0.45 ? sh : 0); P.rim = tq > 0.25 ? 2 : 1; P.eyes = 2; P.tail = (f12 % 4) < 2 ? 1 : -1;
      } else if (st === CAST) {                                                                                          // 左右交替连抓 5 下：奇数帧是出爪
        const i = Math.min(9, Math.floor(tq * 12)), n = i >> 1, S = (k) => (k < 0 ? K.cRear : k & 1 ? K.cSwF : K.cSwN);
        if (i & 1) setK(S(n), S(n), 0); else setK(S(n - 1), S(n), 0.35);
        if (n === 4 && (i & 1)) { P.bx += 2; P.lean += 0.06; }
        P.glow = i & 1 ? 3 : 2; P.rim = i & 1 ? 2 : 1; P.eyes = 2; P.tail = i & 1 ? 2 : -1;
      } else {                                                                                                           // 甩甩爪子放下
        if (tq < 0.2) { setK(K.cSwN, K.idle, seg(tq, 0, 0.2, ease.out) * 0.6); P.hny += sh ? -2 : 1; P.hfy += sh ? 1 : -2; }
        else setK(K.cSwN, K.idle, 0.6 + 0.4 * seg(tq, 0.2, 0.45));
        P.glow = tq < 0.2 ? 1 : 0; P.eyes = tq < 0.2 ? 2 : 0; P.cn = tq < 0.3 ? 1 : 0; P.cf = P.cn;
      }
    } else {   // roar：闪身
      if (st === CHARGE) { setK(K.idle, K.rCrouch, seg(tq, 0, 0.3, ease.out)); P.eyes = 2; P.glow = 1; if (tq > 0.3) trem(f12, 0.8); }
      else if (st === CAST) {
        if (tq < 3 / 12) { setK(K.rCrouch, K.rSlide, seg(tq, 0, 2 / 12, ease.out)); P.eyes = 2; P.rim = 3; P.glow = 2; P.flash = tq < 1 / 12 ? 1 : 0; }   // 一闪往后滑步
        else { setK(K.rSlide, K.rRoar, seg(tq, 3 / 12, 5 / 12, ease.out)); if (tq > 5 / 12) trem(f12, 1.2); P.eyes = 2; P.glow = 3; P.rim = tq < 4 / 12 ? 3 : 2; }   // 站直、张臂、仰头咆哮
      } else {
        if (tq < 0.35) { setK(K.rRoar, K.rRoar, 0); trem(f12, 1.2); P.glow = 3; P.rim = 2; }
        else { setK(K.rRoar, K.idle, seg(tq, 0.35, 0.62)); P.glow = tq < 0.45 ? 1 : 0; }
        P.eyes = tq < 0.45 ? 2 : 0;
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; return; }
    if (d >= 0.45) { P.crown = 1; P.cru = clamp01((d - 0.45) / 0.4); }                                                   // 金冠掉下来翻一圈
    if (d < 0.6) { setK(K.hurt, K.dStag, seg(d, 0.3, 0.5, ease.out)); P.eyes = 1; return; }                              // 晃了晃
    if (d < 1.0) { setK(K.dStag, K.dKneel, seg(d, 0.6, 0.9, ease.in)); P.eyes = 1; return; }                             // 跪倒、两爪撑地
    setK(K.dKneel, K.dFall, seg(d, 1.0, 1.35, ease.in)); P.eyes = d < 1.2 ? 1 : 3;                                        // 往前趴倒
    if (d > 1.35 && d < 1.5) P.by += 1;
    if (d > 1.6 && d < 1.85) { P.tc = 0.2; P.tail = d < 1.72 ? 2 : 0; }                                                    // 尾巴最后拍一下地
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(HIP[0], HIP[1], P.lean); }
  function headXf() { bodyXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function limb(r, tgt, l1, l2, bend) { const kn = B.ik(r, tgt, l1, l2, bend), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; return [kn, [kn[0] + (tgt[0] - kn[0]) / dd * Math.min(dd, l2), kn[1] + (tgt[1] - kn[1]) / dd * Math.min(dd, l2)]]; }
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
  // 尾巴：根部跟着胯，形状用世界坐标的几把钥匙插值（-1 瘫在地上、0 垂下尾尖上卷、1 翘起、2 高高勾起、3 笔直往后）
  const TSEQ = [[[-10, 6], [-16, 18], [-22, 27], [-32, 28]], [[-12, 2], [-16, 16], [-19, 26], [-27, 22]], [[-10, -2], [-18, 4], [-28, 8], [-30, -4]],
    [[-8, -6], [-16, -14], [-24, -24], [-19, -30]], [[-10, 0], [-20, 1], [-30, 2], [-38, 0]]];
  function tailPts() {
    const r = L.tailR, tc = Math.max(-1, Math.min(3, P.tc)), i0 = Math.min(3, Math.floor(tc + 1)), q = tc + 1 - i0, A = TSEQ[i0], Z = TSEQ[i0 + 1];
    const k = (j) => [r[0] + A[j][0] + (Z[j][0] - A[j][0]) * q, r[1] + A[j][1] + (Z[j][1] - A[j][1]) * q];
    const c1 = k(0), M = k(1), c2 = k(2), T = k(3), s = P.tail;
    T[0] += s * 1.6; T[1] -= Math.abs(s) * 0.6; c2[0] += s; M[0] += s * 0.4;
    return B.bez(r, c1, M, 6).concat(B.bez(M, c2, T, 6).slice(1));
  }
  function geo() {
    bodyXf();
    L.rn = B.at(LN[0], LN[1]); L.rf = B.at(LF[0], LF[1]); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]);
    L.chest = B.at(7, -44); L.tailR = B.at(-5, -29); L.belly = B.at(4, -38);
    headXf(); L.head = B.at(...hq(14, -58)); L.eye = B.at(...hq(18, -60)); L.mouth = B.at(...hq(21, -54.5)); L.crownHead = B.at(...hq(14, -65)); L.crownAng = B.ang() - 0.12; B.reset();
    for (const k of ['n', 'f']) {
      const a = k === 'n' ? P.mta : P.mtb, paw = [P['f' + k + 'x'], P['f' + k + 'y']], hk = [paw[0] - Math.sin(a) * MT, paw[1] - Math.cos(a) * MT];
      const [kn, h2] = limb(L['r' + k], hk, 12, 11.5, -1);
      L['K' + k] = kn; L['H' + k] = h2; L['P' + k] = [paw[0] + h2[0] - hk[0], paw[1] + h2[1] - hk[1]];
    }
    [L.en, L.hn] = limb(L.shN, [P.hnx, P.hny], 12, 11.5, 1); [L.ef, L.hf] = limb(L.shF, [P.hfx, P.hfy], 12, 11.5, 1);
    L.dn = nrm(L.en, L.hn); L.df = nrm(L.ef, L.hf);
    L.tail = tailPts();
  }
  // 蓄力汇聚点：普攻 / 飞扑 / 连爪是近手的爪尖，闪身是嘴
  function focus() {
    const f = MV === 'roar' && P.st >= CHARGE && P.st <= RECOVER ? L.mouth : [L.hn[0] + L.dn[0] * 4, L.hn[1] + L.dn[1] * 4];
    P.fx = f[0]; P.fy = f[1]; P.gx = f[0]; P.gy = f[1];
  }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  // 豹斑：一圈断开的深色（空心），中间比底色暗一级；k 决定哪一格断开
  const ROS = [[-1, 0], [-1, -1], [0, -1], [1, -1], [1, 0], [0, 1], [-1, 1]];
  const ros = (x, y, m, k) => { for (let i = 0; i < ROS.length; i++) if (((k * 5 + i * 3) % 7) !== 0) B.px(E, x + ROS[i][0], y + ROS[i][1], m, (i + k) % 3 ? 10 : 1); B.px(E, x, y, m, 3); };
  const rosW = (x, y, m, k) => { for (let i = 0; i < ROS.length; i++) if (((k * 5 + i * 3) % 7) !== 0) px(x + ROS[i][0], y + ROS[i][1], m, (i + k) % 3 ? 10 : 1); px(x, y, m, 3); };

  // 王袍：挂在两肩、垂在背后到脚踝；cape 越大下摆越往后飘
  function drawCape() {
    part(); bodyXf(); const c = P.cape, s = P.sk;
    const out = [[-7 - c * 1.5, -50], [-12 - c * 3, -41 + c * 0.5], [-16 - c * 4.5 + s * 0.3, -30 + c * 1.2], [-19 - c * 6 + s * 0.6, -19 + c * 2], [-21 - c * 7.5 + s, -8.5 + c * 2.8]];
    const hem = [out[4], [-15 - c * 6 + s, -7 + c * 2.4], [-9 - c * 4 + s * 0.7, -7.5 + c * 1.8], [-4 - c * 2 + s * 0.4, -9 + c * 1.2]];
    B.poly(E, [[11, -52], [6, -55], [-1, -54], ...out, ...hem.slice(1), [-3, -20], [-2, -34], [3, -46]], ROYAL);
    for (let i = 1; i < out.length; i++) B.ln(E, out[i - 1][0] + 1.2, out[i - 1][1], out[i][0] + 1.2, out[i][1] - 0.5, GOLD, 6);            // 袍边的金绣线
    B.ln(E, -4, -48, hem[1][0] + 1, hem[1][1] - 2, ROYAL, 3); B.ln(E, -6, -44, hem[1][0] - 1, hem[1][1] - 1, ROYAL, 7);                   // 褶
    B.ln(E, -2, -40, hem[2][0] + 1, hem[2][1] - 2, ROYAL, 3); B.ln(E, -3.5, -38, hem[2][0] - 0.5, hem[2][1] - 2, ROYAL, 7);
    for (const q of [0.3, 0.6]) { const a = lerp(out[1], out[3], q); B.px(E, a[0] + 3, a[1], GOLD, 7); }                              // 绣的金点
    part(); B.strand(E, hem.slice(0, 3).concat([lerp(hem[2], hem[3], 0.5)]), 1.6, 1.6, ERM);                                                                                          // 下摆的貂皮
    for (let i = 0; i < 2; i++) { const a = lerp(hem[i], hem[i + 1], 0.5); B.px(E, a[0], a[1], ERM, 10); B.px(E, a[0], a[1] + 1, ERM, 10); }
    B.ln(E, hem[0][0], hem[0][1] - 1, hem[2][0], hem[2][1] - 1, ERM, 8);
  }
  function drawTail() {
    part(); B.reset(); const T = L.tail, n = T.length;
    B.strand(E, T, 2.5, 1.5, FURL);
    for (let i = 3; i < n - 2; i += 2) B.px(E, T[i][0], T[i][1] - 1, FURL, i & 2 ? 1 : 2);                                           // 尾上的环斑
    for (let i = 2; i < n - 3; i += 3) B.px(E, T[i][0] - 0.5, T[i][1] + 1, FURL, 7);
    dot(T[n - 1][0], T[n - 1][1], 1.4, FURL, 10); B.px(E, T[n - 2][0], T[n - 2][1], FURL, 1);                                        // 黑尾尖
  }
  function drawLeg(k, far) {
    const r = L['r' + k], kn = L['K' + k], hk = L['H' + k], p = L['P' + k], m = far ? FURD : FUR;
    part(); capW(r[0], r[1], kn[0], kn[1], 5.6, 3.8, m); dot(kn[0], kn[1], 3.5, m);                                                  // 大腿
    if (!far) { for (const [q, o] of [[0.3, 0], [0.62, 1]]) { const c = lerp(r, kn, q); rosW(Math.round(c[0]) - 1, Math.round(c[1]) + o, m, o + 3); } px(kn[0] + 1, kn[1] - 2, m, 7); }
    else { const c = lerp(r, kn, 0.5); px(c[0], c[1], m, 1); }
    part(); capW(kn[0], kn[1], hk[0], hk[1], 3.3, 2.3, m);                                                                          // 小腿
    const c2 = lerp(kn, hk, 0.5); px(c2[0], c2[1], m, far ? 2 : 1); px(c2[0] - 1, c2[1] + 2, m, 2);
    part(); capW(hk[0], hk[1], p[0], p[1], 2.3, 2.1, m); dot(hk[0], hk[1], 2.2, m);                                                   // 跖（脚踝离地）
    if (!far) { const g = lerp(hk, p, 0.3), d = nrm(hk, p), n2 = [-d[1], d[0]]; lnW(g[0] - n2[0] * 2.4, g[1] - n2[1] * 2.4, g[0] + n2[0] * 2.4, g[1] + n2[1] * 2.4, GOLD, 7); }   // 金脚环
    // 脚掌：站着时平放朝前，飞扑时顺着跖往后绷
    const d = nrm(hk, p); let an = Math.atan2(d[1], d[0]); if (an > -0.5 && an < 1.7) an = Math.max(an - 1.0, 0); else an -= 1.0;
    const pd = [Math.cos(an), Math.sin(an)], tip = [p[0] + pd[0] * 3.6, p[1] + pd[1] * 3.6];
    part(); capW(p[0] - pd[0] * 0.5, p[1] - pd[1] * 0.5, tip[0], tip[1], 2.3, 1.7, m);
    if (!far) { px(tip[0] - pd[0], tip[1] - pd[1] - 1, m, 3); px(tip[0] + pd[0] * 0.8, tip[1] + 0.5, CLAW, 8); px(p[0], p[1] - 1.5, m, 7); }
  }
  function drawTorso() {
    part(); bodyXf();
    B.ell(E, -1, -30, 7.5, 6.2, 0, FUR); B.ell(E, 2, -37.5, 6, 5.5, 0.15, FUR); B.ell(E, 5, -45, 10, 8.5, 0.2, FUR); B.cap(E, 6, -50, 11, -55, 5.5, 4.2, FUR);   // 胯、细腰、宽胸、粗脖子
    B.poly(E, [[10, -53], [13, -50], [13.8, -44], [12, -38], [8.5, -33], [6, -32.5], [8, -38], [9.5, -45]], CREAM);                  // 胸腹的奶油色
    B.ln(E, 7, -43, 12, -41.5, FUR, 3); B.ln(E, 8.5, -38, 11, -38.5, CREAM, 3); B.ln(E, 7.5, -35, 9.5, -35.5, CREAM, 3); B.px(E, 12, -47, CREAM, 8);   // 胸肌、腹
    B.ln(E, -3, -51, 2, -53.5, FUR, 8); B.ln(E, -7, -35, -6, -27, FUR, 3);
    for (const [x, y, k] of [[-2, -47, 1], [2, -51, 2], [-4, -41, 3], [1, -42, 4], [-1, -35, 5], [4, -38, 6], [-5, -31, 0], [-1, -26, 2], [3, -30, 3], [5, -46, 5], [-6, -36, 1]]) ros(x, y, FUR, k);
    for (const [x, y] of [[8, -40], [7, -48], [-7, -44], [0, -31]]) B.px(E, x, y, FUR, 1);
  }
  function drawBelt() {
    part(); bodyXf(); const s = P.sk;
    B.poly(E, [[2.5, -34], [9, -35.5], [10.5 + s * 0.4, -22], [8.5 + s * 0.6, -17.5], [4 + s * 0.6, -18], [1.5 + s * 0.3, -22.5]], ROYAL);   // 前垂摆
    B.ln(E, 2 + s * 0.3, -21, 10 + s * 0.5, -20.5, GOLD, 7); B.ln(E, 4 + s * 0.6, -18.5, 8.5 + s * 0.6, -18, GOLD, 5);                 // 金边
    B.ln(E, 5.5, -32, 6.5 + s * 0.4, -21.5, ROYAL, 3); B.ln(E, 8, -32, 9 + s * 0.4, -22, ROYAL, 7);
    B.px(E, 6 + s * 0.3, -27, GOLD, 8); B.px(E, 5 + s * 0.3, -26, GOLD, 5); B.px(E, 7 + s * 0.3, -26, GOLD, 5); B.px(E, 6 + s * 0.3, -25, GOLD, 5);   // 垂摆上的金花
    part(); B.poly(E, [[-7, -36], [9, -37.8], [9.5, -34.2], [-7, -32.5]], GOLD); B.ln(E, -6, -35.6, 9, -37, GOLD, 8); B.ln(E, -6, -33, 9, -34.5, GOLD, 3);   // 金腰带
    B.px(E, 7, -36, EYE); B.px(E, 7, -35, EYEC); B.px(E, 1, -35, GOLD, 9); B.px(E, -4, -34.5, GOLD, 9);
  }
  function drawCollar() {
    part(); bodyXf();
    B.poly(E, [[-11, -44.5], [-8, -49.5], [-3, -52.5], [3, -54], [9, -54], [14, -52], [17.5, -48.5], [17, -44.5], [13, -43], [8, -44], [3, -43.5], [-2, -44], [-6, -42.5], [-9, -42.5]], ERM);   // 貂皮大领：披在两肩、从后背一直围到下巴底下
    B.ln(E, -8, -48.5, 2, -53, ERM, 8); B.ln(E, 14, -50.5, 16.5, -47.5, ERM, 8); for (const x of [-9, -5, -1, 3, 7, 11, 15]) B.px(E, x, -42.8 - (x > 5 ? 0.6 : 0), ERM, 3);
    for (const [x, y] of [[-7, -46], [-3, -49], [2, -51], [7, -51.5], [11, -49.5], [15, -46.5], [-4, -44.5], [1, -46.5], [6, -47], [11.5, -45]]) { B.px(E, x, y, ERM, 10); B.px(E, x, y + 1, ERM, 10); }   // 黑貂尾尖
    part(); const ch = B.bez([3, -44.5], [8, -41], [12.5, -44], 8); for (let i = 0; i < ch.length; i++) B.px(E, ch[i][0], ch[i][1], GOLD, i & 1 ? 4 : 8);   // 金链
    part(); for (const [x, y, t] of [[13, -46], [12, -45], [13, -45], [14, -45], [11, -44], [12, -44], [14, -44], [15, -44], [12, -43], [14, -43], [13, -42], [13, -41], [12, -41, 3], [14, -41, 3]]) B.px(E, x, y, GOLD, t || 7);   // 黑桃金扣（挂在领口下）
    B.px(E, 13, -44, EYE); B.px(E, 13, -43, EYEC); B.px(E, 13, -46, GOLD, 9);
  }
  // 头按 1.2 倍画（大而好认的脸）：头部坐标都过 hq（以脖子上方为中心放大、再往下放一格）
  const HS = 1.2, HP = [11, -57], HDY = 1.2;
  const hq = (x, y) => [HP[0] + (x - HP[0]) * HS, HP[1] + (y - HP[1]) * HS + HDY];
  const hEll = (x, y, rx, ry, a, m, t) => { const p = hq(x, y); B.ell(E, p[0], p[1], rx * HS, ry * HS, a, m, t); };
  const hPoly = (pts, m, t) => B.poly(E, pts.map((p) => hq(p[0], p[1])), m, t);
  const hPx = (x, y, m, t) => { const p = hq(x, y); B.px(E, p[0], p[1], m, t); };
  const hLn = (x0, y0, x1, y1, m, t) => { const a = hq(x0, y0), b = hq(x1, y1); B.ln(E, a[0], a[1], b[0], b[1], m, t); };
  const hRot = (x, y, a) => { const p = hq(x, y); B.rot(p[0], p[1], a); };
  function drawHead() {
    const e = P.eyes, j = P.jaw, ea = P.ear <= 1 ? 0.2 * P.ear : 0.2 - (P.ear - 1) * 1.1;
    part(); headXf(); hRot(5, -62, ea); hPoly([[3, -61.5], [3.2, -65], [4.5, -66.8], [6.5, -65.5], [7.5, -61.5]], FURD); hPx(5, -63.5, FURD, 1); B.reset();   // 远耳
    part(); headXf();
    hEll(13, -58.5, 6.4, 5.8, 0, FUR); hEll(11, -55.5, 5.8, 4.4, 0.15, FUR);                                                        // 头、腮
    hPoly([[6, -58], [3.5, -55.5], [5.5, -55], [4, -52.5], [7, -53], [8, -51], [10, -52]], FUR);                                      // 腮毛
    hEll(18, -59.2, 4, 1.8, 0.12, FUR); hEll(19.5, -56, 4.4, 2.9, 0.05, CREAM); hEll(12, -54.5, 3.5, 2.2, 0.2, CREAM);                // 鼻梁、口鼻、下颊
    hLn(9, -63, 15, -63.5, FUR, 8); hLn(15, -62, 19, -61.5, FUR, 3);                                                                // 额头高光、眉骨
    for (const [x, y] of [[10, -61], [12, -62.5], [9, -58.5], [11, -59.5], [14, -62], [8, -60.5], [7, -57], [9, -56], [6, -59.5]]) hPx(x, y, FUR, 10);   // 额、腮上的黑色小斑
    for (const [x, y] of [[18, -56], [19.5, -56.5], [19, -55.2], [20.5, -55.5]]) hPx(x, y, CREAM, 2);                                // 胡须根
    hPx(17, -62, CREAM, 8); hPx(18, -62, CREAM, 7);
    // 眼：翡翠绿、黑竖瞳；1 眯着、2 冒光、3 闭上
    hLn(15.5, -61.2, 19.5, -61.4, FUR, 10); hPx(15.5, -60, FUR, 10); hLn(16.6, -59, 18.6, -56.6, FUR, 10);                            // 上眼线、黑泪线
    if (e === 3) hLn(16, -60, 19.5, -60, FUR, 10);
    else if (e === 1) { hLn(16, -60, 19.5, -60.3, FUR, 10); hPx(18, -60, EYE); }
    else { hPx(16.6, -60, EYE); hPx(17.6, -60, EYE); hPx(18.6, -60, FUR, 10); hPx(19.5, -60, EYE); if (e === 2) { hPx(16.6, -60, EYEC); hPx(17.6, -60.9, EYE); } }
    // 鼻头、嘴
    hPoly([[21.5, -58.6], [24, -58.4], [24.2, -57], [23, -56.3], [21.6, -57.2]], NOSE); hPx(22.5, -58.2, NOSE, 8); hPx(23.8, -57, NOSE, 3);
    if (!j) { hLn(23, -56.2, 23, -55.2, CREAM, 10); hLn(19, -54.3, 23, -55, CREAM, 10); hEll(19.5, -53, 3, 1.3, 0, CREAM); hPx(22, -54.2, TEETH, 8); }
    part(); hLn(21, -56, 28, -57.4, ERM, 6); hLn(21, -55.2, 28.5, -54.6, ERM, 6);                                                  // 长白胡须
    if (j) {                                                                                                                        // 张嘴：嘴里、上下獠牙
      part(); hPoly([[16.5, -55], [23.8, -55.4], [23.2, -54 + j * 1.3], [20, -52.4 + j * 1.4], [17, -53.4 + j * 0.6]], MOUTH);
      hPx(19, -53.8 + j, NOSE, 8); hPx(20, -53.6 + j, NOSE, 6);
      part(); hLn(22.5, -55, 22.3, -53.4, TEETH, 8); hLn(19.5, -55, 19.4, -54.2, TEETH, 6); hPx(21.5, -53 + j * 1.2, TEETH, 7); if (j > 1) hPx(18.5, -53 + j, TEETH, 6);
      part(); hEll(19.5, -52.2 + j * 1.3, 3.2, 1.3, 0.15, CREAM);
    }
    part(); headXf(); hRot(8, -62.5, ea);                                                                                        // 近耳（耳背一块白斑）
    hPoly([[6, -62], [6.5, -66.5], [8.5, -68.2], [10.5, -66.5], [11, -62.5]], FUR); hLn(8, -63.5, 8.5, -66.5, FUR, 2); hPx(9.5, -65, CREAM, 7); hPx(8.5, -68, FUR, 10); hPx(7, -64.5, FUR, 10);
    if (!P.crown) drawCrown(0);
  }
  // 五尖金冠：中间一颗翡翠、两侧紫宝石、尖上珍珠；0 戴在头上（微微往后歪），1 掉下来翻一圈落到身前
  function drawCrown(off) {
    part();
    if (!off) { headXf(); const c = hq(14, -65); B.move(c[0], c[1]); B.rot(0, 0, -0.12); }
    else { const u = P.cru, a = L.crownHead, b = [37, -3], x = a[0] + (b[0] - a[0]) * u, y = a[1] + (b[1] - a[1]) * u - 16 * 4 * u * (1 - u); B.reset(); B.move(x, y); B.rot(0, 0, L.crownAng + (2 * PI + 0.25 - L.crownAng) * u); }
    B.poly(E, [[-5.8, 2.9], [-6.2, -2.6], [-3.8, 0], [-2.5, -3.6], [-1.2, 0], [0, -4.6], [1.2, 0], [2.5, -3.6], [3.8, 0], [6.2, -2.6], [5.8, 2.9]], GOLD);
    B.ln(E, -5.5, 0.4, 5.5, 0.4, GOLD, 3); B.ln(E, -5.2, 1.3, 5.2, 1.3, GOLD, 8); B.ln(E, -5.5, 2.6, 5.5, 2.6, GOLD, 3);
    B.px(E, -2.5, -2.5, GOLD, 8); B.px(E, 0, -3.5, GOLD, 8); B.px(E, -5.5, -1.5, GOLD, 8);
    B.px(E, 0, 1.6, EYE); B.px(E, 0.8, 1.6, EYEC); B.px(E, -3.4, 1.7, ROYAL, 9); B.px(E, 3.4, 1.7, ROYAL, 9);
    for (const [x, y] of [[-6.2, -3.3], [-2.5, -4.3], [0, -5.4], [2.5, -4.3], [6.2, -3.3]]) B.px(E, x, y, ERM, 9);                  // 珍珠
    if (P.glint) B.px(E, -2.5, -1.5, SPARK);
    B.reset();
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, el = far ? L.ef : L.en, h = far ? L.hf : L.hn, m = far ? FURD : FUR, d = far ? L.df : L.dn, n = [-d[1], d[0]];
    part(); dot(sh[0], sh[1], far ? 4.2 : 4.8, m); capW(sh[0], sh[1], el[0], el[1], 4.3, 3.2, m);                                       // 大臂
    if (!far) {
      const c = lerp(sh, el, 0.35); rosW(Math.round(c[0]), Math.round(c[1]), m, 2); px(sh[0] - 1, sh[1] - 3, m, 8);
      const u = nrm(sh, el), un = [-u[1], u[0]], g = lerp(sh, el, 0.66);                                                            // 金臂环 + 翡翠
      part(); lnW(g[0] - un[0] * 3.6, g[1] - un[1] * 3.6, g[0] + un[0] * 3.6, g[1] + un[1] * 3.6, GOLD, 8); lnW(g[0] - un[0] * 3.6 + u[0], g[1] - un[1] * 3.6 + u[1], g[0] + un[0] * 3.6 + u[0], g[1] + un[1] * 3.6 + u[1], GOLD, 4);
      px(g[0] + un[0] * 0.5, g[1] + un[1] * 0.5, EYE);
    }
    part(); capW(el[0], el[1], h[0], h[1], 3.2, 2.6, m);                                                                             // 小臂
    if (!far) { const c = lerp(el, h, 0.35); px(c[0], c[1], m, 1); px(c[0] + n[0] * 1.5, c[1] + n[1] * 1.5 + 1, m, 2); }
    part(); for (const [q, t] of [[0.72, 8], [0.86, 6]]) { const g = lerp(el, h, q); lnW(g[0] - n[0] * 3, g[1] - n[1] * 3, g[0] + n[0] * 3, g[1] + n[1] * 3, GOLD, far ? t - 3 : t); }   // 两道金镯
    // 爪子：手掌 + 三根手指（每根一枚金戒）+ 爪尖；cn = 1 爪子伸出来（蓄力时爪尖发金光）
    const ext = far ? P.cf : P.cn, glowC = ext && P.glow >= 2, hc = [h[0] + d[0] * 1.3, h[1] + d[1] * 1.3];
    part(); dot(hc[0], hc[1], far ? 2.6 : 3, m); px(hc[0] - n[0], hc[1] - n[1] - 1, m, 7);
    for (let i = -1; i <= 1; i++) {
      const b0 = [hc[0] + d[0] * 2.4 + n[0] * i * 1.7, hc[1] + d[1] * 2.4 + n[1] * i * 1.7];
      px(b0[0], b0[1], GOLD, far ? 4 : 8);                                                                                           // 金戒
      const len = ext ? 3.4 : 1.2, t0 = [b0[0] + d[0] * 1, b0[1] + d[1] * 1], t1 = [t0[0] + d[0] * len + n[0] * i * 0.4 + (ext ? d[1] * 0.8 : 0), t0[1] + d[1] * len + n[1] * i * 0.4 - (ext ? d[0] * 0.8 : 0)];
      if (glowC) { lnW(t0[0], t0[1], t1[0], t1[1], CLAWG); px(t1[0], t1[1], SPARK); }
      else { lnW(t0[0], t0[1], t1[0], t1[1], CLAW, far ? 4 : 7); px(t1[0], t1[1], GOLD, far ? 5 : 9); }                             // 爪尖包金
    }
  }
  function drawCoin() {
    if (!P.coin) return; B.reset();
    const x = P.coin === 2 ? L.hn[0] + L.dn[0] * 2 : P.cox, y = P.coin === 2 ? L.hn[1] + L.dn[1] * 2 - 2.5 : P.coy, w = Math.abs(Math.cos(P.cos));
    part(); B.ell(E, x, y, 0.4 + 1.7 * w, 2, 0, GOLD); if (w > 0.4) { B.px(E, x - 0.5, y - 0.6, SPARK); B.px(E, x + 0.8, y + 0.8, GOLD, 3); } else B.px(E, x, y - 1, GOLD, 9);
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawCape(); drawTail(); drawArm(1);
    drawLeg('f', 1); drawLeg('n', 0);
    drawTorso(); drawBelt(); drawCollar(); drawHead(); if (P.crown) drawCrown(1);
    drawArm(0); drawCoin();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    RIM.rimRamp = MV === 'roar' && P.st >= CHARGE && P.st <= RECOVER ? ER : GR;
    let on = 0;
    if (P.glow >= 2) { LIGHT[0].x = P.fx * z + spr.ox; LIGHT[0].y = P.fy * z + spr.oy; LIGHT[0].r = (5 + P.glow * 4) * z; on = 1; } else LIGHT[0].r = 0;
    if (P.eyes === 2) { LIGHT[1].x = L.eye[0] * z + spr.ox; LIGHT[1].y = L.eye[1] * z + spr.oy; LIGHT[1].r = 5 * z; on = 1; } else LIGHT[1].r = 0;
    RIM.lights = on ? LIGHT : null;
    bake(spr, RIM);
  }
  // 立绘：闪身后张臂咆哮那一刻（王袍炸开、爪尖发金光、翡翠眼），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { const mv = MV; MV = 'roar'; poseAt(RECOVER, 0.1, 0); P.bx = 0; P.glow = 2; P.rim = 2; P.glint = 1; geo(); focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(...hq(14, -59)); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 18 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'pounce'; poseAt(IDLE, 0.2, 0); P.eyes = 2; P.rim = 1; P.glint = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(...hq(14, -59)); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 18 * 2]; return PSPR; }   // 头像：待机侧脸、翡翠眼亮着

  // ───── 特效 ─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let scarT = 9, lastF = -1, lastCoin = 0, scarX = 0;
  const clawMarks = (x, y, a0, a1, r, w) => { for (let i = 0; i < 3; i++) fx.slash(x, y + (i - 1) * 3, r + i * 2, a0, a1, GLD, 0.2, w || 2, 2); };
  function strikeFx() {
    const s = L.shN, h = L.hn, x = sx(h[0]), y = sy(h[1]);
    clawMarks(sx(s[0] + 2), sy(s[1] + 2), -0.3, 2.5, 22, 2);
    burst(x, y, 16, 50, 140, 0.2, 0.5, GLD, 30); fx.cross(x, y, 7, GLD, 0.16); hitDummy(1, 1); shake(0.15, 2);
  }
  function clawFx(k) {
    const near = !(k & 1), h = near ? L.hn : L.hf, s = near ? L.shN : L.shF, x = sx(h[0]), y = sy(h[1]), last = k === 4;
    clawMarks(sx(s[0] + 3), sy(s[1] + 3), near ? -0.2 : 0.2, near ? 2.6 : 2.3, last ? 24 : 20, last ? 3 : 2);
    burst(x, y, last ? 22 : 10, 40, last ? 160 : 110, 0.15, 0.4, GLD, 20); if (k & 1) burst(x, y, 6, 30, 80, 0.2, 0.4, EMR, 10);
    hitDummy(last ? 1 : 0, 1);
    if (last) { ring(x, y, 1, GLD); fx.cross(x, y, 10, GLD, 0.2); shake(0.35, 3); flash(0.08); } else shake(0.12, 2);
  }
  function leapFx() {
    const x = sx(L.Pn[0]), y = HY;
    ring(x - 6, y - 2, 1, RYL); burst(x - 8, y - 2, 22, 40, 150, 0.3, 0.6, FXI.dust, 20); fx.wave(x - 4, y, -1, 30, 6, FXI.dust, 0.4, 2);
    for (let i = 0; i < 4; i++) fx.beam(sx(-34 - i * 5), sy(-46 + i * 5), sx(-6 - i * 3), sy(-46 + i * 5), 1, i & 1 ? GLD : RYL, 0.18, 2);   // 速度线
    burst(sx(L.hn[0]), sy(L.hn[1]), 14, 40, 120, 0.2, 0.4, GLD, 10); shake(0.35, 3); flash(0.08);
  }
  function landFx() {
    const x = sx(L.hn[0] + 2), y = HY;
    ring(x, y - 2, 0, GLD); burst(x, y - 2, 20, 30, 110, 0.3, 0.7, FXI.dust, 18); fx.wave(x, y, 1, 26, 5, FXI.dust, 0.4, 2); fx.wave(x, y, -1, 22, 5, FXI.dust, 0.4, 2);
    for (let i = 0; i < 3; i++) fx.crack(x - 2 + i * 3, y + (i - 1), 12 + i * 2, 1, GLD, 1.0);                                        // 三道金色爪痕
    shake(0.3, 3); hitDummy(1, 1); scarT = 0; scarX = x;
  }
  // 闪身的残影：站着的剪影位置撒一片不动的紫光点，慢慢散掉
  function ghostFx() {
    for (let y = -66; y <= -2; y += 2) {
      const [x0, x1] = y < -52 ? [6, 22] : y < -28 ? [-8, 14] : [-6, 10];
      for (let x = x0; x <= x1; x += 2) if (Math.random() < 0.6) spawn(K_STILL, sx(x + (Math.random() - 0.5)), sy(y), 0, 0, 0.3 + Math.random() * 0.35, RYL);
    }
    for (let y = -50; y <= -10; y += 3) spawn(K_STILL, sx(-10 - Math.random() * 6), sy(y), 0, 0, 0.35, RYL);
    fx.beam(sx(18), sy(-60), sx(8), sy(-60), 1, EMR, 0.2, 2);
  }
  function roarFx() {
    const m = L.mouth, x = sx(m[0]), y = sy(m[1]);
    ring(x, y, 1, RYL); ring(sx(2), HY - 32, 1, GLD); flash(0.12); shake(0.35, 3);
    burst(x, y, 20, 50, 150, 0.25, 0.6, EMR, 30); burst(sx(2), HY - 34, 24, 40, 140, 0.3, 0.7, RYL, 20);
    fx.cross(sx(L.eye[0]), sy(L.eye[1]), 8, EMR, 0.25); fx.cross(sx(14), sy(-72), 6, GLD, 0.2);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'pounce') { leapFx(); sfx('swing', { kind: 'claw', w: 1 }); sfx('boss', { k: 'lpPounce', w: 1 }); sfx('boss', { k: 'lpSnarl', w: 0.9 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'claws') { sfx('boss', { k: 'lpSnarl', w: 0.8 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else { ghostFx(); sfx('boss', { k: 'lpFlash', w: 1 }); sfx('swing', { kind: 'throw', w: 0.6 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
    }
    if (s === RECOVER && MV === 'pounce') { landFx(); sfx('fall', { w: 0.9 }); sfx('boss', { k: 'thud', w: 0.8 }); sfx('impact', { pal: 'coin', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === CHARGE) { lastF = -1; if (MV === 'pounce') sfx('boss', { k: 'growl', w: 0.8 }); if (MV === 'roar') sfx('boss', { k: 'lpSnarl', w: 0.7 }); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'lpSnarl', w: 0.5 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'claw', w: 1 }); sfx('boss', { k: 'lpSwipe', w: 0.9 }); sfx('hit', { mat: 'flesh', w: 0.9 }); }
    if (s === CHARGE && MV === 'pounce' && t === 0.3) { const x = sx(L.Pf[0]); burst(x, HY - 1, 8, 20, 60, 0.3, 0.5, FXI.dust, 8); sfx('step', { w: 0.6 }); }
    if (s === CHARGE && MV === 'claws' && t === 0.2) { sfx('boss', { k: 'lpSwipe', w: 0.4 }); sfx('boss', { k: 'growl', w: 0.6 }); }
    if (s === CAST && MV === 'claws') { const k = CLAW_T.indexOf(t); if (k >= 0) { clawFx(k); sfx('swing', { kind: 'claw', w: k === 4 ? 1 : 0.7 }); sfx('boss', { k: 'lpSwipe', w: k === 4 ? 1 : 0.7 }); sfx('hit', { mat: 'flesh', w: k === 4 ? 1 : 0.6 }); } }
    if (s === CAST && MV === 'roar' && t === 3 / 12) { roarFx(); sfx('boss', { k: 'lpRoar', w: 1 }); sfx('boss', { k: 'roar', w: 0.6 }); sfx('impact', { pal: 'coin', w: 0.8 }); }
    if (s === DEATH && t === INCOMING + 0.3) sfx('boss', { k: 'growl', w: 0.7 });
    if (s === DEATH && t === INCOMING + 0.85) { sfx('boss', { k: 'lpCoin', w: 1 }); sfx('hit', { mat: 'metal', w: 0.5 }); burst(sx(37), HY - 3, 10, 20, 70, 0.3, 0.5, GLD, 10); }
    if (s === DEATH && t === INCOMING + 1.0) { sfx('boss', { k: 'thud', w: 0.7 }); sfx('boss', { k: 'lpDie', w: 1 }); burst(sx(10), HY - 1, 10, 20, 60, 0.3, 0.5, FXI.dust, 8); }
    if (s === DEATH && t === INCOMING + 1.35) { for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-20 + Math.random() * 64), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.25, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 32; i++) spawn(K_RISE, sx(-20 + Math.random() * 64), HY - 2 - Math.random() * 20, 0, -12 - Math.random() * 18, 0.8 + Math.random() * 0.8, i % 4 ? GLD : RYL); sfx('boss', { k: 'fade', w: 0.8 }); sfx('boss', { k: 'lpCoin', w: 0.5 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [0.2, 0.3], [...CLAW_T], [], [], [INCOMING + 0.3, INCOMING + 0.85, INCOMING + 1.0, INCOMING + 1.35, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    scarT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f;
        if (f === 0 || f === 4) { const p = f === 0 ? L.Pn : L.Pf, x = sx(p[0] + 2); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24 - (P.flip ? -10 : 10), -3 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust); sfx('step', { w: 0.5 }); } }
    }
    if (state === CHARGE && P.glow && MV !== 'roar' && Math.random() < 0.45) {                                               // 蓄力：金光往爪尖汇
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, Math.random() < 0.25 ? EMR : GLD, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'claws' && P.glow >= 2 && Math.random() < 0.3) { const h = Math.random() < 0.5 ? L.hn : L.hf; spawn(K_EMBER, sx(h[0] + L.dn[0] * 4), sy(h[1] + L.dn[1] * 4), (Math.random() - 0.5) * 10, -8, 0.3, GLD); }
    if (state === CHARGE && MV === 'roar' && Math.random() < 0.35) { spawn(K_EMBER, sx(L.eye[0]), sy(L.eye[1]), -4 - Math.random() * 6, -4, 0.3, EMR); }
    if (state === CAST && MV === 'pounce') {                                                                                // 飞扑：身后拖紫金残影
      const f = Math.floor(stT * 12); if (f !== lastF) { lastF = f;
        for (const p of [L.head, L.chest, L.belly, L.tailR, L.hn]) for (let i = 0; i < 2; i++) spawn(K_EMBER, sx(p[0] - 4 - Math.random() * 6), sy(p[1] + (Math.random() - 0.5) * 6), -(P.flip ? -40 : 40), 0, 0.25 + Math.random() * 0.15, i ? GLD : RYL); }
    }
    if ((state === CAST || state === RECOVER) && MV === 'roar' && P.glow >= 2 && Math.random() < 0.4) { const e = L.eye; spawn(K_EMBER, sx(e[0] + (Math.random() - 0.5) * 4), sy(e[1]), (Math.random() - 0.5) * 16, -12, 0.35, EMR); }
    if (state === IDLE) {
      if (P.coin === 1 && lastCoin === 2) sfx('boss', { k: 'lpCoin', w: 0.5 });
      if (P.coin === 2 && lastCoin === 1) { sfx('boss', { k: 'lpCoin', w: 0.3 }); spawn(K_BURST, sx(L.hn[0]), sy(L.hn[1] - 3), 0, -20, 0.2, GLD); }
      if (P.coin === 1 && Math.random() < 0.3) spawn(K_EMBER, sx(P.cox), sy(P.coy), 0, 4, 0.2, GLD);
      if (P.glint && Math.random() < 0.3) spawn(K_EMBER, sx(L.crownHead[0] - 2 + Math.random() * 6), sy(L.crownHead[1] - 3), 0, -6, 0.25, GLD);
    }
    lastCoin = P.coin;
    if (scarT < 1.2 && Math.random() < 0.35) spawn(K_EMBER, scarX + Math.random() * 16 - 4, HY - 1, 0, -8 - Math.random() * 8, 0.35, GLD);   // 地上的爪痕还在冒金光
  }
  function fxReset() { scarT = 9; lastF = -1; lastCoin = 0; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -10; dx <= 10; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, GR[Math.abs(dx) < 5 ? 2 : 3]); }   // 地面映出的金光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'pounce'; return MVDUR[MV]; }

  const VOICES = {
    lpSnarl: (s, t, w, p) => { s.nz(t, 0.32, 'bandpass', 2400, 1.2, 0.07 * w, { to: 1100, pan: p }); s.tone(t, 'sawtooth', 150, 0.3, 0.035 * w, { to: 105, vib: [18, 40, 0], lp: 900, pan: p }); },
    lpSwipe: (s, t, w, p) => { s.whoosh(t, 0.14, 900, 3200, 0.1 * w, { pan: p }); s.ring(t + 0.05, 2300 + Math.random() * 700, 0.18, 0.025 * w, { pan: p }); s.nz(t + 0.05, 0.05, 'highpass', 4000, 0.8, 0.05 * w, { pan: p }); },
    lpPounce: (s, t, w, p) => { s.whoosh(t, 0.35, 300, 1800, 0.14 * w, { pan: p }); s.thud(t, 120, 50, 0.15, 0.12 * w, { pan: p }); },
    lpCoin: (s, t, w, p) => { s.ring(t, 2637, 0.35, 0.03 * w, { parts: [[1, 1], [2.7, 0.4], [5.1, 0.2]], pan: p }); s.ring(t + 0.06, 3136, 0.3, 0.02 * w, { pan: p }); },
    lpFlash: (s, t, w, p) => { s.whoosh(t, 0.22, 2400, 500, 0.11 * w, { pan: p }); s.ring(t, 3500, 0.25, 0.02 * w, { pan: p }); s.nz(t, 0.12, 'highpass', 5000, 0.6, 0.04 * w, { pan: p }); },
    lpRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 130, 1.2, 0.07 + 0.03 * w, { to: 70, vib: [24, 30, 0.1], lp: 1000, pan: p, rev: 0.4 }); s.tone(t + 0.03, 'square', 65, 1.1, 0.03 * w, { to: 40, vib: [22, 10, 0.1], lp: 400, pan: p });
      s.nz(t, 1.0, 'bandpass', 700, 1.0, 0.09 * w, { to: 300, pan: p }); s.rumble(t, 1.2, 0.14 * w, { f: 140, pan: p }); s.coins(t + 0.15, 6, 0.02 * w, { pan: p }); },
    lpDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 160, 1.4, 0.06, { to: 50, vib: [10, 30, 0.2], lp: 800, pan: p, rev: 0.5 }); s.nz(t + 0.2, 1.0, 'lowpass', 500, 0.7, 0.05 * w, { a: 0.2, pan: p }); },
  };

  return {
    name: '豹帝', HX, R_EL: GLD, DUR, hero, P, GLOW_MATS: [EYE, EYEC, MOUTH, CLAWG, SPARK], HIT_POINT: [4, -40], EVENTS, MAX_H: 84, OWN_MAX: 120, SHEET_K: 3, VOICES,
    SFX: { body: 'beast', how: 'topple', pal: 'coin', style: 'blade', w: 1 },
    MOVES: ['pounce', 'claws', 'roar'], MOVE_NAMES: { pounce: '飞扑', claws: '连爪', roar: '闪身（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.2, 1.4, 1.6, 1.9, 2.2, 2.78]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0.08, 0.25, 0.42, 0.58], 'pounce'], [CAST, [0, 1 / 12, 3 / 12], 'pounce'], [RECOVER, [0.05, 0.2, 0.4, 0.5], 'pounce'],
      [CHARGE, [0.1, 0.3, 0.5], 'claws'], [CAST, [0, 1 / 12, 2 / 12, 3 / 12, 5 / 12, 9 / 12], 'claws'], [RECOVER, [0.1, 0.3], 'claws'],
      [CHARGE, [0.1, 0.4], 'roar'], [CAST, [0, 1 / 12, 2 / 12, 4 / 12, 0.5], 'roar'], [RECOVER, [0.1, 0.3, 0.55], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.7, 0.9, 1.1, 1.3, 1.5, 2.0, 2.4]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
