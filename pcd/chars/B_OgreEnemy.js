// 大力士（小首领，马戏大棚）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js。
// 依据：附录 G2「抡棒的食人魔」；被动 较劲（目标的生命在全队里占得越多，普攻越疼）；招式 heave 举重（把最壮的举起来砸下、晕 2 秒）、
//       club 抡棒（抡身边最壮的一个、把它抡飞）；半血 较劲（举重的冷却减半）。
// 设定卡 ——
//   剪影：一个又宽又矮的马戏团大力士食人魔：桶一样的胸和肚子、比腿还粗的胳膊、短而弯的罗圈腿；站着时一只手扶着立在身前的
//         哑铃杠铃（两颗黑铁大圆球、刷着红漆的腰带、金星铆钉），另一只手叉腰。宽比高显眼，身体约 67 格高。
//   脸（识别点）：锃亮的光头（一道缝过针的旧疤、耳朵上一只铜耳环）、压低的粗眉骨、豆粒小眼、红通通的蒜头鼻，
//         鼻子下一大把往上卷的八字胡（两头各卷一个圈）；下巴往前兜（地包天），两颗小獠牙从下唇翘出来。
//   衣服：红白横条的连体大力士服（单肩带）、斜挎一条豹纹绶带、腰上一条宽皮举重腰带（铜星扣），光着腿、系带的短皮靴、铜钉护腕，
//         右臂上一个小红心纹身。
//   主色：暗土黄的皮 + 压暗的红白条纹 + 黑铁；光：马戏大棚的暖金追光（轮廓光）、撞击迸出的金色星星、半血时发红的眼睛。
//   招式（setMove）：
//     heave 举重：搓手拍出一团白镁粉 → 下蹲抓杠 → 提到胸前 → 挺举过头、腿在抖、脸憋得通红青筋暴起（金光往杠铃上汇）
//                 → 整副杠铃砸在身前的地上（地裂、土浪两边推开、金星四溅、两道环）→ 双臂一弯秀肱二头肌、哈哈笑 → 把杠铃扶回来立好。
//     club 抡棒：双手攥住杠铃一头、往后扭身把它扛到脑后（蓄力抖动）→ 从背后贴着地面一个大半圈往前上方抡出去（大弧光、金星、把人抡飞）→ 收势。
//     roar 较劲（半血）：弓身握拳、全身肌肉绷紧发抖（最强壮姿势）→ 猛地张开双臂秀双肱二头肌、仰头咆哮（红金两道环、彩纸和金星炸开）→ 收回。
//   待机：两档呼吸、胸肌一跳一跳；个性动作是松开杠铃、用手指捻胡子尖（眯眼得意），再抖两下胸肌。移动：沉重的踩踏步，扛着杠铃竖在手里走。
//   死亡：挨打后晃了晃、不服气地最后一次把杠铃举过头 → 腿一软往后仰倒、杠铃砸在自己胸口上（金星绕着脑袋转）→ 化成金色的光点。
PCD.define('B_OgreEnemy', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, PI = Math.PI;

  // ───── 材质（11 级，暗 → 亮）：皮、衣服都压暗，金色的追光和星星才亮得出来 ─────
  const R_SKIN = ['#0b0906', '#18130c', '#261e12', '#352a19', '#453720', '#564528', '#685431', '#7b643b', '#8f7547', '#a38754', '#b89a64'];   // 食人魔的暗土黄皮
  const R_FLUSH = ['#0d0706', '#1c0f0b', '#2c1811', '#3d2217', '#4f2c1d', '#623723', '#76432a', '#8a5032', '#9e5d3a', '#b26b44', '#c47b50'];  // 憋红的脸
  const R_RED = ['#0d0306', '#1c060a', '#2d0a0f', '#400e15', '#54131b', '#691822', '#7f1e29', '#962530', '#ac2e37', '#c23a3f', '#d44c4a'];    // 大力士服的红条
  const R_WHT = ['#100e0c', '#231f1b', '#37322c', '#4c463e', '#625b51', '#787065', '#8e867a', '#a49c8f', '#bab2a4', '#cec7b9', '#e0dacd'];    // 大力士服的白条（米白）
  const R_HAIR = ['#050404', '#0b0908', '#120f0d', '#1a1613', '#231e1a', '#2d2621', '#382f29', '#453a32', '#53453c', '#63534a', '#76665c'];                        // 八字胡
  const R_IRON = ['#050608', '#0b0d11', '#12151b', '#1a1e25', '#232830', '#2d333c', '#383f49', '#444c57', '#525b67', '#626c79', '#76808d'];   // 黑铁球
  const SKIN = defDeep(R_SKIN, { depth: 9, amb: 0.12 }), SKINL = defDeep(R_SKIN, { depth: 6, amb: 0.12 }), SKIND = defDeep(R_SKIN, { depth: 6, dark: 3, amb: 0.08 });
  const HEAD = defDeep(R_SKIN, { depth: 8, amb: 0.3 }), FLUSH = defDeep(R_FLUSH, { depth: 8, amb: 0.3 }), NOSE = defDeep('hellhide', { depth: 3, dark: 4, amb: 0.3 })   // 憋红的脸、蒜头鼻;
  const RED = defDeep(R_RED, { depth: 9, amb: 0.12 }), REDD = defDeep(R_RED, { depth: 5, dark: 2, amb: 0.1 }), WHT = defDeep(R_WHT, { depth: 9, dark: 1, amb: 0.12 });
  const LEO = defDeep('brass', { depth: 3, dark: 3, amb: 0.2 }), HAIR = defDeep(R_HAIR, { depth: 2, dark: 1, amb: 0.1 });
  const IRON = defDeep(R_IRON, { depth: 6, dark: 1, amb: 0.08 }), GRED = defDeep(R_RED, { depth: 6, dark: 1, amb: 0.1 }), STEEL = defDeep('bladesteel', { depth: 2, amb: 0.2 });
  const BRASS = defDeep('brass', { depth: 3, amb: 0.16 }), BELT = defDeep('hide', { depth: 3, dark: 1, amb: 0.12 });
  const BOOT = defDeep('hide', { depth: 4, dark: 2, amb: 0.1 }), BOOTD = defDeep('hide', { depth: 4, dark: 4, amb: 0.08 }), TUSK = defDeep('ivory', { depth: 2, amb: 0.3 });
  const STAR = FXI.coin, SR = FXR[STAR], SPR = SR;                                                              // 撞击的金星 / 大棚的暖金追光：白 → 金 → 暗（共用金币色阶）
  const CHALK = fxRamp('ogreChalk', ['#ffffff', R_WHT[10], R_WHT[8], R_WHT[6], R_WHT[3]]), CH = FXR[CHALK];      // 镁粉（借白条的色）
  const CONF = FXI.blood, CR = FXR[CONF];                                                                        // 红彩纸 / 发红的眼
  const GLINT = defMat([SR[0], SR[0], SR[0], SR[0]], 1, 1), EYER = defMat([CR[3], CR[2], CR[1], CR[0]], 1, 1), MOUTH = defMat([0, CR[4], CR[4], CR[3]], 1, 1);
  const TONGUE = defMat([CR[4], CR[3], CR[3], CR[2]], 1, 1), POWDER = defMat([CH[3], CH[2], CH[1], CH[0]], 1, 1), INK = defMat([CR[4], CR[3], CR[2], CR[2]], 1, 1);
  const hero = new Sprite(176, 124, 84, 114);
  const DUR = [2.6, 2 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { heave: { 3: 1.3, 4: 0.4, 5: 0.9 }, club: { 3: 0.8, 4: 0.45, 5: 0.6 }, roar: { 3: 0.5, 4: 0.8, 5: 0.5 } };
  let MV = 'heave';
  const HX = 72;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [SR[1], SR[2], SR[3]], k: 0.55 }, { x: 0, y: 0, r: 0, ramp: [CR[1], CR[2], CR[3]], k: 0.5 }];
  const RIM_R = [0, 12, 18, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: SPR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of [GLINT, EYER, MOUTH, TONGUE, POWDER, INK]) RIM.skip[m] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  // 整个上身绕胯（HIP）前倾 P.lean；头绕脖子 P.hd。脚踝是绝对坐标，手是上身坐标（抓着杠铃时由杠铃算）。
  const HIP = [0, -21], NECK = [7, -52], LN = [6, -22], LF = [-6, -22], SHN = [13, -47], SHF = [-10, -48];
  const PLANT = [27, -22.5];                                     // 杠铃立在身前的位置（下面那颗球贴地）
  const D0 = { bx: 0, by: 0, lean: 0, hd: 0, jaw: 0, vein: 0, stache: 0, ba: -PI / 2, bg: 0, hs: 10, bang: -PI / 2,
    fn: [10, -3], ff: [-9, -3], hn: [20, -32], hf: [-13, -27], bc: PLANT, bm: 3, hold: 1, bb: 0, ebn: 1, ebf: 1, flex: 0 };
  const K = {
    idle: {},
    twirl: { hold: 0, hn: [23, -58], hd: -0.06, ebn: 1 },                                                                          // 松开杠铃、捻胡子尖
    walk: { bm: 1, hold: 0, hn: [21, -33], ba: -PI / 2 + 0.12, bg: 0, lean: 0.07 },                                                // 竖着拎杠铃走
    aWind: { bm: 1, hold: 0, lean: -0.14, by: 1, hd: -0.12, jaw: 1, hn: [5, -67], ba: 2.0, bg: -5, bb: 0, fn: [13, -3] },          // 普攻：单手把杠铃抡到脑后
    aStrike: { bm: 1, hold: 0, lean: 0.3, bx: 5, by: 4, hd: 0.14, jaw: 2, hn: [31, -33], ba: 0.95, bg: -5, fn: [17, -3], ff: [-7, -3] },
    aFollow: { bm: 1, hold: 0, lean: 0.34, bx: 5, by: 5, hd: 0.18, jaw: 1, hn: [30, -27], ba: 1.3, bg: -5, fn: [17, -3], ff: [-7, -3] },
    hClap: { hold: 0, hn: [22, -41], hf: [19, -41], ebf: -1, hd: 0.14, by: 1, lean: 0.06 },                                        // 举重：拍手、镁粉
    hGrab: { bm: 3, hold: 2, bc: [25, -7.5], bang: 0, by: 9, lean: 0.52, hd: -0.2, fn: [13, -3], ff: [-12, -3], ebf: 1 },           // 下蹲抓杠
    hClean: { bm: 2, by: 6, lean: 0.1, hd: -0.05, hn: [24, -44], ba: 0, bg: 5, hs: 10, ebn: 1, ebf: 1, fn: [13, -3], ff: [-12, -3], vein: 1 },
    hPress: { bm: 2, by: 1, lean: -0.05, hd: -0.2, jaw: 1, hn: [17, -71], ba: 0, bg: 5, hs: 10, ebn: -1, ebf: 1, vein: 2, stache: 1, fn: [12, -3], ff: [-12, -3] },
    hSlam: { bm: 3, hold: 2, bc: [29, -7.5], bang: 0, by: 9, lean: 0.55, bx: 3, hd: 0.08, jaw: 2, fn: [14, -3], ff: [-11, -3], vein: 1 },
    flex: { bm: 3, hold: 0, bc: [29, -7.5], bang: 0, lean: -0.08, hd: -0.1, jaw: 1, hn: [28, -54], hf: [-16, -62], ebn: 1, ebf: -1, flex: 1, stache: 1 },
    pick: { bm: 3, hold: 1, bc: [29, -7.5], bang: 0, by: 5, lean: 0.35, hd: 0.1 },                                                  // 弯腰把杠铃扶起来
    cWind: { bm: 2, lean: -0.18, bx: -3, by: 3, hd: 0.06, hn: [-1, -53], ba: PI + 0.5, bg: -5, hs: 5, bb: 1, ebn: 1, ebf: -1, fn: [14, -3], ff: [-12, -3], vein: 1 },
    cStrike: { bm: 2, lean: 0.22, bx: 7, by: 3, hd: 0.1, jaw: 2, hn: [31, -40], ba: -0.25, bg: -5, hs: 5, ebn: 1, ebf: 1, fn: [18, -3], ff: [-8, -3] },
    cFollow: { bm: 2, lean: 0.02, bx: 5, by: 2, hd: -0.05, jaw: 1, hn: [22, -60], ba: -1.25, bg: -5, hs: 5, ebn: -1, ebf: 1, fn: [18, -3], ff: [-8, -3] },
    setDown: { bm: 3, hold: 1, by: 2, lean: 0.1 },
    rCrunch: { hold: 0, lean: 0.24, by: 3, hd: 0.22, hn: [23, -31], hf: [18, -32], ebn: -1, ebf: 1, vein: 1, fn: [13, -3], ff: [-12, -3] },   // 较劲：最强壮姿势
    rRoar: { hold: 0, lean: -0.1, by: 1, hd: -0.3, jaw: 2, hn: [28, -54], hf: [-16, -62], ebn: 1, ebf: -1, flex: 1, vein: 2, stache: 1, fn: [13, -3], ff: [-12, -3] },
    hurt: { hold: 0, lean: -0.2, bx: -3, hd: -0.3, jaw: 1, hn: [19, -38], hf: [-17, -35], stache: -1 },
    dLift: { bm: 2, by: 3, lean: -0.1, hd: -0.25, jaw: 1, hn: [16, -69], ba: 0, bg: 5, hs: 10, ebn: -1, ebf: 1, vein: 2, fn: [11, -3], ff: [-11, -3] },
    dFall: { bm: 2, by: 7, bx: -2, lean: -1.42, hd: -0.05, jaw: 1, hn: [12, -42], ba: 1.42, bg: 5, hs: 10, ebn: 1, ebf: 1, fn: [15, -3], ff: [5, -3], stache: -1 },
  };
  const NUM = ['bx', 'by', 'lean', 'hd', 'jaw', 'vein', 'stache', 'ba', 'bg', 'hs', 'bang'], VEC = ['fn', 'ff', 'hn', 'hf', 'bc'], DIS = ['bm', 'hold', 'bb', 'ebn', 'ebf', 'flex'];

  const P = {};
  const FIELDS = ['st', 'bx', 'by', 'lean', 'hd', 'jaw', 'vein', 'stache', 'ba', 'bg', 'hs', 'bang', 'fnx', 'fny', 'ffx', 'ffy', 'hnx', 'hny', 'hfx', 'hfy', 'bcx', 'bcy',
    'bm', 'hold', 'bb', 'ebn', 'ebf', 'flex', 'eyes', 'glow', 'rim', 'flash', 'dq', 'pec', 'chalk'];
  function base() { P.st = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.pec = 0; P.chalk = 0; P.mx = 0; P.flip = 0; setK(K.idle, K.idle, 0); }
  const val = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of NUM) { const va = val(a, f); P[f] = va + (val(b, f) - va) * q; }
    for (const f of VEC) { const va = val(a, f), vb = val(b, f); P[f + 'x'] = va[0] + (vb[0] - va[0]) * q; P[f + 'y'] = va[1] + (vb[1] - va[1]) * q; }
    for (const f of DIS) P[f] = q < 0.5 ? val(a, f) : val(b, f);
  }
  // 沉重的踩踏步：8 帧一圈（12 fps，2/3 秒）。每只脚 [前后, 离地]，近脚、远脚差半圈
  const CYC = [[5, 0], [2, 0], [-1, 0], [-4, 0], [-6, 2], [-3, 6], [2, 7], [5, 3]];
  function walk(f) {
    f = ((f % 8) + 8) % 8; setK(K.walk, K.walk, 0);
    const a = CYC[f], b = CYC[(f + 4) % 8]; P.fnx = 10 + a[0]; P.fny = -3 - a[1]; P.ffx = -9 + b[0]; P.ffy = -3 - b[1];
    P.by = [2, 1, 0, 0, 2, 1, 0, 0][f]; P.hd = [0.05, 0.02, 0, 0.02, 0.05, 0.02, 0, 0.02][f]; P.lean = 0.07 + [0.02, 0, -0.01, 0, 0.02, 0, -0.01, 0][f];
    const sw = [0, 2, 3, 2, 0, -2, -3, -2][f]; P.hnx += sw * 0.6; P.hfx = -12 - sw; P.hfy = -30; P.ebf = 1;
  }
  const trem = (f12, a) => { const s = f12 & 1 ? 1 : -1; P.bx += s * a * 0.5; P.hny += s * a * 0.5; P.hfy -= s * a * 0.5; };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.pec = b; P.hd = b ? 0.03 : 0;
      const lp = tt % DUR[IDLE];
      if (lp >= 0.9 && lp < 1.75) {                                                                                  // 待机个性：捻胡子尖、得意地眯眼
        const k = lp - 0.9, q = k < 0.2 ? ease.out(k / 0.2) : k > 0.65 ? 1 - ease.in((k - 0.65) / 0.2) : 1; setK(K.idle, K.twirl, q); P.by += b;
        if (q >= 1) { const w = Math.floor(k * 12) % 3; P.stache = w === 1 ? 1 : 0.4; P.hny += w === 1 ? -1 : 0; P.eyes = 1; }
      }
      if (lp >= 1.95 && lp < 2.45) { const k = Math.floor((lp - 1.95) * 12); P.pec = [2, 0, 2, 0, 2, 0][k] || 0; P.hd = -0.05; }   // 再抖两下胸肌
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 22, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < 0.17) { const q = ease.out(tq / 0.17); setK(K.idle, K.aWind, q); P.glow = 1; P.eyes = 2; }
      else if (tq < T_STRIKE) { setK(K.aWind, K.aWind, 0); P.glow = 2; P.rim = 1; P.eyes = 2; P.stache = 1; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.aStrike, K.aStrike, 0); P.glow = 3; P.rim = 2; P.eyes = 2; P.stache = 1; }
      else if (tq < 0.42) { const q = ease.out((tq - T_STRIKE - 1 / 12) / (0.42 - T_STRIKE - 1 / 12)); setK(K.aStrike, K.aFollow, q); P.glow = 2; P.rim = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); setK(K.aFollow, K.idle, q); P.glow = q < 0.4 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; P.stache = -0.5; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); setK(K.hurt, K.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.jaw = Math.round(P.jaw); geo(); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { heave: 0, club: 1, roar: 2 };
  const T_STRIKE = 3 / 12;
  const seg = (tq, t0, t1, e) => (e || ease.inOut)(clamp01((tq - t0) / (t1 - t0)));
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'heave') {
      if (st === CHARGE) {
        if (tq < 0.12) { setK(K.idle, K.hClap, seg(tq, 0, 0.12, ease.out)); P.glow = 1; }
        else if (tq < 0.25) { setK(K.hClap, K.hClap, 0); P.glow = 1; P.chalk = 1; P.eyes = 1; if (tq < 0.2) { P.hnx -= 1; P.hfx += 1; } }
        else if (tq < 0.42) { setK(K.hClap, K.hGrab, seg(tq, 0.25, 0.42, ease.out)); P.glow = 1; P.chalk = 1; }
        else if (tq < 0.62) { setK(K.hGrab, K.hClean, seg(tq, 0.42, 0.62, ease.out)); P.glow = 2; P.chalk = 1; P.eyes = 2; P.rim = 1; }
        else if (tq < 0.85) { setK(K.hClean, K.hPress, seg(tq, 0.62, 0.85, ease.out)); P.glow = 2; P.chalk = 1; P.eyes = 2; P.rim = 1; }
        else { setK(K.hPress, K.hPress, 0); trem(f12, 2); P.fnx += sh ? 1 : 0; P.glow = 2 + sh; P.chalk = 1; P.eyes = 2; P.rim = 2; P.jaw = sh ? 2 : 1; }   // 举在头顶、腿在抖、脸憋红
      } else if (st === CAST) { setK(K.hSlam, K.hSlam, 0); if (tq < 2 / 12) P.by += sh; P.glow = tq < 0.2 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.chalk = 1; }
      else {
        if (tq < 0.1) setK(K.hSlam, K.flex, seg(tq, 0, 0.1, ease.out));
        else if (tq < 0.45) { setK(K.flex, K.flex, 0); P.eyes = 1; P.jaw = (Math.floor(tq * 12) & 1) ? 2 : 1; P.stache = 1; }              // 秀肌肉、哈哈笑
        else if (tq < 0.65) setK(K.flex, K.pick, seg(tq, 0.45, 0.65));
        else { const q = seg(tq, 0.65, 0.9); setK(K.pick, K.idle, q); }
        P.glow = tq < 0.3 ? 1 : 0; P.chalk = 1;
      }
    } else if (MV === 'club') {
      if (st === CHARGE) {
        setK(K.idle, K.cWind, seg(tq, 0, 0.3, ease.out));
        if (tq > 0.3) { trem(f12, 1.5); P.jaw = sh; }
        P.glow = tq < 0.3 ? 1 : 2 + (tq > 0.55 ? sh : 0); P.rim = tq > 0.3 ? 2 : 1; P.eyes = 2; P.stache = 1;
      } else if (st === CAST) {
        if (tq < 1 / 12) setK(K.cStrike, K.cStrike, 0);
        else setK(K.cStrike, K.cFollow, seg(tq, 1 / 12, 0.3, ease.out));
        P.glow = tq < 2 / 12 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.stache = 1;
      } else {
        if (tq < 0.3) setK(K.cFollow, K.setDown, seg(tq, 0, 0.3));
        else setK(K.setDown, K.idle, seg(tq, 0.3, 0.5));
        P.glow = tq < 0.2 ? 1 : 0;
      }
    } else {   // roar：半血的「较劲」
      if (st === CHARGE) { setK(K.idle, K.rCrunch, seg(tq, 0, 0.25, ease.out)); if (tq > 0.2) trem(f12, 2); P.glow = 1 + (tq > 0.25 ? 1 : 0); P.rim = 1; P.eyes = 1; }
      else if (st === CAST) {
        setK(K.rRoar, K.rRoar, 0); if (tq > 0.1) trem(f12, 1.2);
        if (tq > 0.6) { const q = seg(tq, 0.6, 0.8); P.hd = -0.3 + 0.18 * q; }
        P.glow = tq < 0.2 ? 3 : 2; P.rim = tq < 0.2 ? 3 : 2; P.eyes = 2;
      } else { setK(K.rRoar, K.idle, seg(tq, 0, 0.45)); P.glow = tq < 0.2 ? 1 : 0; P.eyes = tq < 0.2 ? 2 : 0; }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; return; }
    if (d < 0.75) { setK(K.hurt, K.dLift, seg(d, 0.3, 0.55, ease.out)); if (d > 0.5) { trem(f12, 2); P.fnx += f12 & 1; } P.eyes = 1; P.glow = 1; return; }   // 不服气，最后一次举过头
    const q = seg(d, 0.75, 1.15, ease.in); setK(K.dLift, K.dFall, q); P.eyes = 1;
    if (d > 1.15 && d < 1.3) P.by += 1;
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(HIP[0], HIP[1], P.lean); }
  function headXf() { bodyXf(); B.rot(NECK[0], NECK[1], P.hd); }
  const reach = (a, t, len) => { const dx = t[0] - a[0], dy = t[1] - a[1], d = Math.hypot(dx, dy) || 1; return d <= len ? t : [a[0] + dx / d * len, a[1] + dy / d * len]; };
  function limb(r, tgt, l1, l2, bend) { const kn = B.ik(r, tgt, l1, l2, bend), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; return [kn, [kn[0] + (tgt[0] - kn[0]) / dd * Math.min(dd, l2), kn[1] + (tgt[1] - kn[1]) / dd * Math.min(dd, l2)]]; }
  function geo() {
    bodyXf();
    const rn = B.at(LN[0], LN[1]), rf = B.at(LF[0], LF[1]); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]);
    let hnT = B.at(P.hnx, P.hny), hfT = B.at(P.hfx, P.hfy);
    headXf(); L.head = B.at(12, -60); B.reset();
    [L.kn, L.an] = limb(rn, [P.fnx, P.fny], 11, 10.5, -1); [L.kf, L.af] = limb(rf, [P.ffx, P.ffy], 11, 10.5, -1); L.rn = rn; L.rf = rf;
    let d, C;
    if (P.bm === 3) {
      d = [Math.cos(P.bang), Math.sin(P.bang)]; C = [P.bcx, P.bcy];
      if (P.hold === 1) hnT = [C[0] + d[0] * 7, C[1] + d[1] * 7];
      else if (P.hold === 2) { hnT = [C[0] + d[0] * 5, C[1] + d[1] * 5]; hfT = [C[0] - d[0] * 5, C[1] - d[1] * 5]; }
    }
    [L.en, L.hn] = limb(L.shN, hnT, 12, 11.5, P.ebn);
    if (P.bm !== 3) {
      const a = P.ba + P.lean; d = [Math.cos(a), Math.sin(a)]; C = [L.hn[0] - d[0] * P.bg, L.hn[1] - d[1] * P.bg];
      if (P.bm === 2) hfT = [L.hn[0] - d[0] * P.hs, L.hn[1] - d[1] * P.hs];
    }
    [L.ef, L.hf] = limb(L.shF, hfT, 12, 11.5, P.ebf);
    L.C = C; L.d = d; L.hg = [C[0] + d[0] * 16, C[1] + d[1] * 16];
  }
  // 蓄力汇聚点：举重是杠铃中间，其余是杠铃头那颗球
  function focus() { const f = MV === 'heave' && (P.st === CHARGE || P.st === CAST) ? L.C : MV === 'roar' && P.st !== IDLE ? L.head : L.hg; P.fx = f[0]; P.fy = f[1]; P.gx = f[0]; P.gy = f[1]; }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];

  function drawLeg(k, far) {
    const r = L['r' + k], kn = L['k' + k], an = L['a' + k], m = far ? SKIND : SKINL, bm = far ? BOOTD : BOOT;
    part(); capW(r[0], r[1], kn[0], kn[1], 5.6, 4.3, m); dot(kn[0], kn[1], 4.1, m);
    const cf = lerp(kn, an, 0.35); part(); capW(kn[0], kn[1], an[0], an[1], 4.0, 3.1, m); dot(cf[0] - 1.2, cf[1], 4.4, m);          // 小腿肚
    if (!far) { px(kn[0] + 1, kn[1] - 1, m, 7); px(kn[0] - 2, kn[1] + 2, m, 3); }
    // 系带短皮靴：靴筒到小腿一半，鞋头往前翘
    const top = lerp(an, kn, 0.5), ax = Math.round(an[0]), ay = Math.round(an[1]);
    part(); capW(an[0], an[1], top[0], top[1], 4.3, 4.6, bm); polyW([[ax - 5, ay - 2], [ax + 3, ay - 2], [ax + 8, ay], [ax + 9, ay + 3], [ax - 5, ay + 3]], bm);
    lnW(ax - 5, ay + 3, ax + 9, ay + 3, bm, far ? 1 : 2); lnW(top[0] - 4, top[1], top[0] + 4, top[1], bm, far ? 5 : 8); px(ax + 6, ay, bm, far ? 5 : 8);
    if (!far) for (let i = 0; i < 3; i++) { const p = lerp(an, top, 0.2 + i * 0.3); px(p[0] + 3.5, p[1], BRASS, 8); }           // 铜鞋眼
  }
  // 红白横条：在大力士服的形状里按上身坐标隔 4 格刷白（顺着桶形微微弯）
  const SE = { sp(x, y, m, t) { const Z = B.Z(), q = B.inv(x / Z, y / Z), u = q[0], v = q[1] - 0.012 * (u - 4) * (u - 4); if ((Math.floor((v + 400) / 4) & 1) === 0) E.sp(x, y, WHT, t); },
    run(y, x0, x1, m, t) { for (let x = x0; x <= x1; x++) SE.sp(x, y, m, t); } };
  function suit(E2, m) { B.ell(E2, -7, -35, 9.5, 10.5, 0, m); B.ell(E2, 6, -32, 14, 10.5, 0, m); B.ell(E2, 3, -42, 15, 8, 0, m); B.poly(E2, [[-15, -44], [18, -43], [20, -32], [-16, -30]], m); }
  function drawTorso() {
    part(); bodyXf(); suit(E, RED); suit(SE, RED);                                                                                  // 大力士服：红白横条
    B.ln(E, 4, -24, 16, -24, RED, 3); B.ln(E, -14, -40, -14, -30, RED, 3);
    part(); B.poly(E, [[-14, -27], [14, -25], [16, -21], [11, -17], [5, -15], [-3, -15], [-11, -18], [-15, -22]], REDD);            // 短裤裆（深红）
    B.ln(E, 5, -16, 11, -18, REDD, 7); B.ln(E, -3, -17, 3, -17, REDD, 3);
    part(); B.poly(E, [[-15, -29], [-4, -28], [8, -26], [18, -25], [19, -21], [8, -22], [-4, -24], [-15, -25]], BELT);                 // 宽皮举重腰带
    B.ln(E, -14, -28, 17, -24, BELT, 8); for (const x of [-10, -4, 2]) B.px(E, x, -25.5 + x * 0.05, BRASS, 7);
    part(); B.poly(E, [[9, -26], [14, -25], [14, -20], [9, -21]], BRASS); B.px(E, 11, -23, BRASS, 9); B.px(E, 10, -23, BRASS, 8); B.px(E, 12, -23, BRASS, 8); B.px(E, 11, -24, BRASS, 8); B.px(E, 11, -22, BRASS, 8);   // 铜星扣
    // 光膀子：斜方肌、上胸、牛脖子
    part(); B.ell(E, -1, -48.5, 12, 5, 0, SKIN); B.ell(E, 7, -47, 11.5, 4.6, 0.12, SKIN); B.cap(E, 4, -50, 8, -55, 6.5, 5, SKIN);
    const pb = P.pec === 2 ? -1 : 0;
    B.ell(E, 13, -47 + pb, 5, 2.6, 0.2, SKIN, 6); B.ln(E, 7, -44 + pb, 17, -43 + pb, SKIN, 3); B.ln(E, -8, -53, 2, -54, SKIN, 7); B.ln(E, 4, -49, 11, -50, SKIN, 7);
    for (const [x, y] of [[9, -44], [11, -45], [13, -44], [15, -45], [10, -46]]) B.px(E, x, y, HAIR, 4);                           // 领口冒出来的胸毛
    part(); B.poly(E, [[9, -45], [13, -44], [16, -51], [12, -52]], RED); B.ln(E, 12, -51, 15, -50, RED, 8);                         // 单肩带
    // 豹纹绶带：远肩 → 近胯
    part(); B.poly(E, [[-9.5, -49.5], [-5.5, -52], [17.5, -29.5], [14.5, -26.5]], LEO); B.ln(E, -6, -51.5, 17, -29.5, LEO, 7);
    for (let i = 0; i < 9; i++) { const u = 0.06 + i * 0.105, x = -7.5 + 24 * u + (i & 1 ? 0.8 : -0.8), y = -50.5 + 22.5 * u; B.px(E, x - 1, y, LEO, 10); B.px(E, x + 1, y, LEO, 10); B.px(E, x, y - 1, LEO, 10); B.px(E, x, y + 1, LEO, 1); B.px(E, x, y, LEO, 6); }   // 豹纹的圈斑
    part(); B.ell(E, 16, -27, 3, 2.4, 0.4, LEO); B.strand(E, [[16, -26], [17, -22], [16.5, -19]], 1.4, 0.8, LEO); B.strand(E, [[15, -26], [13.5, -21]], 1.2, 0.7, LEO); B.px(E, 16, -27, LEO, 1); B.px(E, 17, -21, LEO, 1);   // 胯边的结和穗
  }
  function drawHead() {
    const HM = P.vein >= 2 ? FLUSH : HEAD;
    part(); headXf();
    B.ell(E, 3.5, -59, 2.2, 2.9, 0.2, HM); B.px(E, 3, -60, HM, 3); B.px(E, 2, -58, HM, 7); B.px(E, 3, -57, HM, 3);             // 菜花耳
    part(); B.ell(E, 10, -61, 9.4, 8.4, 0, HM); B.poly(E, [[13, -62], [21, -62], [22, -57], [13, -56]], HM);                      // 光头 + 上颌
    B.px(E, 6, -67, HM, 9); B.px(E, 7, -68, HM, 9); B.px(E, 8, -68, HM, 8); B.px(E, 5, -66, HM, 8); B.px(E, 9, -68, HM, 7);     // 光头上的反光
    B.ln(E, 3, -64, 6, -62, HM, 3); B.px(E, 4, -62, HM, 3); B.px(E, 5, -64.5, HM, 3);                                              // 缝过针的旧疤
    B.ln(E, 12, -65, 19, -64, HM, 8); B.ln(E, 13, -63.8, 20, -62.8, HM, 2);                                                        // 粗眉骨
    B.ln(E, 12, -59, 14, -58, HM, 7); B.px(E, 11, -57, HM, 3);
    if (P.vein) { B.px(E, 7, -65, HM, 3); B.px(E, 8, -64, HM, 3); B.px(E, 7, -63, HM, 3); B.ln(E, 10, -67, 15, -67, HM, 3); }   // 青筋、抬头纹
    if (P.eyes === 1) B.ln(E, 15, -61.5, 18, -62, HM, 10);
    else if (P.eyes === 2) { B.px(E, 16, -62, EYER); B.px(E, 17, -62, EYER); B.px(E, 17, -63, HM, 10); }
    else { B.px(E, 16, -62, HM, 10); B.px(E, 17, -62, GLINT); B.px(E, 16, -61, HM, 10); B.px(E, 17, -61, HM, 10); }
    B.px(E, 2.5, -56, BRASS, 8); B.px(E, 3.5, -55, BRASS, 5);                                                                        // 铜耳环
    // 下颌（地包天）：张嘴时绕下颌角往下转
    const j = P.jaw;
    if (j) { part(); B.poly(E, [[10, -57], [22, -57], [22, -53 + j], [11, -53]], MOUTH); if (j > 1) B.ln(E, 13, -53, 19, -53, TONGUE); }
    part(); B.save(); B.rot(5, -55, j * 0.16);
    B.poly(E, [[3, -58], [12, -57], [20, -56.5], [22.5, -54], [21, -50.5], [10, -50], [4, -53]], HM);
    B.ln(E, 13, -56.5, 22, -56, TUSK, 6); for (const [x, y] of [[8, -52], [11, -51], [14, -51.5], [18, -51], [17, -53]]) B.px(E, x, y, HM, 3);   // 下排牙、胡茬
    B.ln(E, 5, -51, 17, -50.5, HM, 2);
    part(); B.strand(E, [[20, -55.5], [20.6, -57.8], [20, -60]], 1.3, 0.5, TUSK, 7); B.strand(E, [[15.5, -55.5], [15.8, -57.3], [15.3, -58.6]], 1, 0.4, TUSK, 4);   // 两颗小獠牙
    B.restore();
    part(); B.ell(E, 21.5, -59.6, 3.2, 2.7, 0, NOSE); B.px(E, 21, -61, NOSE, 8); B.px(E, 20, -60.5, NOSE, 7); B.px(E, 22.5, -57.8, NOSE, 2);   // 蒜头鼻
    drawStache();
  }
  // 八字胡：鼻子下一大把，两头往上卷一个圈。stache 1 = 翘得更高，-1 = 耷拉下来
  function drawStache() {
    const s = P.stache;
    const F = s >= 0 ? [[20, -56.4], [24, -56.5], [27.5, -57 - s * 0.3], [29.8, -58.4 - s * 0.7], [30.4, -60.2 - s], [29.6, -61.3 - s]] : [[20, -56.4], [23.5, -56], [25.5, -54.8], [26.3, -52.8]];
    const Bk = s >= 0 ? [[19, -56.4], [15.5, -56.3], [12.5, -56.7], [10.4, -57.9 - s * 0.5], [9.8, -59.6 - s], [10.8, -60.7 - s]] : [[19, -56.4], [15.5, -56.2], [12.6, -55], [11.6, -52.8]];
    part(); B.strand(E, Bk, 2.5, 0.5, HAIR, 5); part(); B.strand(E, F, 2.5, 0.45, HAIR);
    B.ln(E, 14, -57.8, 23, -57.9, HAIR, 8); B.ln(E, 12, -58.4, 14, -57.8, HAIR, 7); B.px(E, 25, -58.3 - Math.max(0, s) * 0.5, HAIR, 7); B.px(E, 10, -59 - Math.max(0, s), HAIR, 7);
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, el = far ? L.ef : L.en, h = far ? L.hf : L.hn, m = far ? SKIND : SKINL;
    part(); dot(sh[0], sh[1], far ? 5.6 : 6.3, m); if (!far) { px(sh[0] - 1, sh[1] - 3, m, 8); px(sh[0] - 2, sh[1] - 3, m, 7); }       // 三角肌
    part(); capW(sh[0], sh[1], el[0], el[1], 5, 4.2, m);
    const u = [el[0] - sh[0], el[1] - sh[1]], v = [h[0] - el[0], h[1] - el[1]], ul = Math.hypot(u[0], u[1]) || 1, cr = u[0] * v[1] - u[1] * v[0], sg = cr >= 0 ? 1 : -1;
    const pn = [-u[1] / ul * sg, u[0] / ul * sg], bm = lerp(sh, el, 0.5), bb = P.flex ? 6.2 : 5, bo = P.flex ? 2.4 : 1.5;
    dot(bm[0] + pn[0] * bo, bm[1] + pn[1] * bo, bb, m);                                                                          // 肱二头肌
    if (!far) {
      px(bm[0] + pn[0] * (bo + 2) - 1, bm[1] + pn[1] * (bo + 2) - 2, m, 8);
    }
    part(); capW(el[0], el[1], h[0], h[1], 4.5, 3.6, m); const fa = lerp(el, h, 0.25); dot(fa[0], fa[1], 4.5, m);
    if (!far) px(fa[0] - 1, fa[1] - 2, m, 7);
    const w0 = lerp(el, h, 0.66), w1 = lerp(el, h, 0.86); part(); capW(w0[0], w0[1], w1[0], w1[1], 4.1, 4.1, BELT);                 // 铜钉护腕
    if (!far) { const c = lerp(w0, w1, 0.5); px(c[0], c[1] - 2, BRASS, 8); px(c[0], c[1] + 1, BRASS, 7); }
    part(); dot(h[0], h[1], 3.9, m); px(h[0] + 1, h[1] - 2, m, far ? 5 : 7); px(h[0] - 1, h[1] + 1, m, 3);                          // 拳头
    if (P.chalk) { px(h[0], h[1] - 1, POWDER); px(h[0] + 2, h[1], POWDER); if (!far) px(h[0] - 2, h[1] - 2, POWDER); }             // 手上的白镁粉
  }
  // 哑铃杠铃：一根钢杠、两道铜卡箍、两颗黑铁大球（刷一道红漆、正中一颗金星铆钉）
  function drawBar() {
    const C = L.C, d = L.d, p = [-d[1], d[0]], at = (u, v) => [C[0] + d[0] * u + p[0] * v, C[1] + d[1] * u + p[1] * v];
    part(); const a = at(-14, 0), b = at(14, 0); capW(a[0], a[1], b[0], b[1], 1.3, 1.3, STEEL);
    for (let u = -5; u <= 5; u += 2) { const q = at(u, 0); px(q[0], q[1], STEEL, 3); }
    for (const s of [-1, 1]) { part(); const c0 = at(s * 7.5, 0), c1 = at(s * 9.5, 0); capW(c0[0], c0[1], c1[0], c1[1], 2.6, 2.6, BRASS); }
    for (const s of [-1, 1]) {
      part(); const g = at(s * 16.5, 0); dot(g[0], g[1], 7.6, IRON);
      for (const o of [-0.6, 0.6]) { const e0 = at(s * 16.5 + o, -7.6), e1 = at(s * 16.5 + o, 7.6); lnW(e0[0], e0[1], e1[0], e1[1], GRED); }
      px(g[0] - 1, g[1] - 1, BRASS, 9); px(g[0] - 2, g[1] - 1, BRASS, 6); px(g[0], g[1] - 1, BRASS, 6); px(g[0] - 1, g[1] - 2, BRASS, 6); px(g[0] - 1, g[1], BRASS, 6);
      px(g[0] - 4, g[1] - 4, IRON, 9);
    }
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    if (P.bb) drawBar();
    drawArm(1); drawLeg('f', 1); drawLeg('n', 0);
    drawTorso(); drawHead();
    if (!P.bb) drawBar();
    drawArm(0);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    let on = 0;
    if (P.glow >= 2) { LIGHT[0].x = P.fx * z + spr.ox; LIGHT[0].y = P.fy * z + spr.oy; LIGHT[0].r = (6 + P.glow * 4) * z; on = 1; } else LIGHT[0].r = 0;
    if (P.eyes === 2 && P.vein) { LIGHT[1].x = (L.head[0] + 4) * z + spr.ox; LIGHT[1].y = (L.head[1] - 1) * z + spr.oy; LIGHT[1].r = 5 * z; on = 1; } else LIGHT[1].r = 0;
    RIM.lights = on ? LIGHT : null;
    bake(spr, RIM);
  }
  // 立绘：半血较劲那一刻（双肱二头肌、仰头咆哮），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 3 / 12, 0); P.hd = -0.14; P.bx = 0; P.vein = 1; P.glow = 2; P.rim = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(13, -59); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 16 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'heave'; poseAt(IDLE, 0.2, 0); P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(14, -59); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 16 * 2]; return PSPR; }   // 头像：待机侧脸、八字胡翘着

  // ───── 特效 ─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let dustT = 9, lastF = -1;
  function stars(x, y, n, up) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 10, y, (Math.random() - 0.5) * 120, -(up || 80) - Math.random() * 70, 0.6 + Math.random() * 0.4, STAR, { g: 260, floor: HY, sz: i % 3 === 0 ? 2 : 1 }); }
  function strikeFx() {
    const g = L.hg, x = sx(g[0]), y = sy(Math.min(-3, g[1]));
    fx.slash(sx(L.shN[0]), sy(L.shN[1]), 30, -0.6, 2.4, STAR, 0.2, 3, 2);
    burst(x, y, 16, 50, 140, 0.2, 0.5, STAR, 30); burst(x, HY - 2, 12, 30, 90, 0.3, 0.6, FXI.dust, 10); stars(x, y, 4);
    fx.cross(x, y, 8, STAR, 0.18); fx.crack(x, HY, 8, 1, FXI.earth, 0.5); hitDummy(1, 1); shake(0.15, 2);
  }
  function slamFx() {
    const x = sx(L.C[0]), y = HY;
    ring(x, y - 3, 1, STAR); ring(x, y - 3, 0, FXI.dust); fx.wave(x, y, 1, 54, 9, FXI.dust, 0.5, 2); fx.wave(x, y, -1, 54, 9, FXI.dust, 0.5, 2);
    fx.crack(x - 14, y, 22, -1, FXI.earth, 1.2); fx.crack(x + 14, y, 24, 1, FXI.earth, 1.2);
    burst(x, y - 3, 26, 60, 170, 0.3, 0.7, STAR, 40); burst(x, y - 1, 30, 30, 120, 0.4, 1.0, FXI.dust, 18); stars(x, y - 6, 8, 120);
    fx.cross(sx(L.C[0] - 16), y - 6, 9, STAR, 0.2); fx.cross(sx(L.C[0] + 16), y - 6, 9, STAR, 0.2);
    shake(0.35, 3); flash(0.1); dustT = 0; hitDummy(1, 1);
  }
  function clubFx() {
    const g = L.hg, x = sx(g[0]), y = sy(g[1]), c = [sx(L.shN[0] + 2), sy(L.shN[1] + 6)];
    fx.slash(c[0], c[1], 40, 1.3, 4.6, STAR, 0.25, 4, 2); fx.slash(c[0], c[1], 32, 1.6, 4.2, FXI.dust, 0.3, 2, 0);
    ring(x, y, 0, STAR); burst(x, y, 22, 60, 170, 0.2, 0.55, STAR, 30); stars(x, y, 6, 100); fx.cross(x, y, 10, STAR, 0.2);
    shake(0.3, 3); flash(0.06); hitDummy(1, 1);
  }
  function roarFx() {
    const h = L.head, x = sx(h[0]), y = sy(h[1]);
    ring(x, y, 1, CONF); ring(sx(2), HY - 30, 1, STAR); flash(0.12); shake(0.35, 3);
    for (let i = 0; i < 36; i++) { const a = -PI / 2 + (Math.random() - 0.5) * 2.6, v = 90 + Math.random() * 110; spawnX(K_PHYS, x, y - 4, Math.cos(a) * v, Math.sin(a) * v, 1.0 + Math.random() * 0.6, i % 3 === 0 ? CONF : i % 3 === 1 ? CHALK : STAR, { g: 90, dragX: 0.35, dragY: 0.3, floor: HY }); }   // 彩纸
    burst(x, y, 14, 50, 120, 0.2, 0.5, STAR, 20);
  }
  function chalkFx() { const h = L.hn, x = sx(h[0] - 1), y = sy(h[1]); fx.cloud(x, y - 2, 9, CHALK, 0.7, 2); burst(x, y, 20, 20, 70, 0.4, 0.9, CHALK, 20); }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'heave') { slamFx(); sfx('impact', { pal: 'earth', w: 1 }); sfx('boss', { k: 'slam', w: 1 }); sfx('boss', { k: 'ogClang', w: 1 }); sfx('fall', { w: 1 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'club') { clubFx(); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); sfx('boss', { k: 'ogClang', w: 0.8 }); sfx('boss', { k: 'ogGrunt', w: 1 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else { roarFx(); sfx('boss', { k: 'ogRoar', w: 1 }); sfx('impact', { pal: 'earth', w: 0.8 }); }
    }
    if (s === CHARGE) { lastF = -1; if (MV === 'roar') sfx('boss', { k: 'growl', w: 0.8 }); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'ogGrunt', w: 0.6 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'metal', w: 0.9 }); sfx('boss', { k: 'ogClang', w: 0.6 }); }
    if (s === CHARGE && MV === 'heave') {
      if (t === 0.17) { chalkFx(); sfx('boss', { k: 'ogClap', w: 1 }); }
      if (t === 0.42) { sfx('boss', { k: 'ogGrunt', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.4 }); }
      if (t === 0.67) sfx('swing', { kind: 'throw', w: 0.8 });
      if (t === 0.92) sfx('boss', { k: 'ogStrain', w: 1 });
    }
    if (s === CHARGE && MV === 'club') { if (t === 0.08) sfx('boss', { k: 'ogGrunt', w: 0.8 }); if (t === 0.42) sfx('boss', { k: 'ogStrain', w: 0.6 }); }
    if (s === RECOVER && MV === 'heave' && t === 0.08) sfx('boss', { k: 'ogLaugh', w: 1 });
    if (s === DEATH && t === INCOMING + 0.34) sfx('boss', { k: 'ogGrunt', w: 0.7 });
    if (s === DEATH && t === INCOMING + 0.75) sfx('boss', { k: 'ogDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.17) { for (let i = 0; i < 28; i++) spawn(K_DUST, sx(-44 + Math.random() * 70), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); stars(sx(L.C[0]), sy(L.C[1]), 5, 60); shake(0.25, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); sfx('boss', { k: 'ogClang', w: 0.7 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-44 + Math.random() * 64), HY - 4 - Math.random() * 26, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, STAR); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [0.08, 0.17, 0.42, 0.67, 0.92], [], [0.08], [], [INCOMING + 0.34, INCOMING + 0.75, INCOMING + 1.17, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    dustT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f;
        if (f === 0 || f === 4) { const a = f === 0 ? L.an : L.af, x = sx(a[0] + 2); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 30 - (P.flip ? -10 : 10), -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 1 }); } }
    }
    if (state === CHARGE && P.glow && Math.random() < 0.45) {   // 蓄力：金色的光点往杠铃（较劲时往脸上）汇
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, STAR, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if ((state === CHARGE || state === CAST) && P.vein >= 1 && Math.random() < 0.18) { const h = L.head; spawnX(K_PHYS, sx(h[0] - 4 + Math.random() * 6), sy(h[1] - 6), (Math.random() - 0.5) * 60, -30 - Math.random() * 30, 0.5, FXI.water, { g: 200, floor: HY }); }   // 汗珠
    if (dustT < 1.2 && Math.random() < 0.4) { const x = sx(L.C[0]) + (Math.random() - 0.5) * 44; spawn(K_EMBER, x, HY - 1, 0, -10 - Math.random() * 10, 0.4, FXI.dust); }
    if (state === DEATH && stT > INCOMING + 1.2 && stT < INCOMING + 1.9 && Math.random() < 0.5) { const h = L.head, a = stT * 7 + (Math.random() < 0.5 ? 0 : PI); spawn(K_EMBER, sx(h[0] + Math.cos(a) * 9), sy(h[1] - 5 + Math.sin(a) * 3), 0, 0, 0.15, STAR); }   // 金星绕着脑袋转
    if (state === IDLE && P.chalk === 0 && Math.random() < 0.03) spawn(K_EMBER, sx(L.hn[0] + (Math.random() - 0.5) * 4), sy(L.hn[1] + 2), 0, 8, 0.5, CHALK);
  }
  function fxReset() { dustT = 9; lastF = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -12; dx <= 12; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, SR[Math.abs(dx) < 5 ? 2 : 3]); }   // 地面映出的金光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'heave'; return MVDUR[MV]; }

  const VOICES = {
    ogGrunt: (s, t, w, p) => { s.tone(t, 'sawtooth', 112, 0.3, 0.05 + 0.03 * w, { to: 78, lp: 620, pan: p }); s.tone(t, 'square', 56, 0.26, 0.025 * w, { to: 40, lp: 300, pan: p }); s.nz(t, 0.2, 'lowpass', 520, 0.7, 0.05 * w, { pan: p }); },
    ogStrain: (s, t, w, p) => { s.tone(t, 'sawtooth', 84, 1.0, 0.045 + 0.03 * w, { to: 150, vib: [14, 60, 0.12], lp: 720, pan: p }); s.tone(t, 'square', 42, 1.0, 0.03 * w, { to: 72, lp: 300, pan: p }); s.nz(t, 1.0, 'bandpass', 420, 1.2, 0.03 * w, { to: 950, pan: p }); },
    ogRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 128, 1.2, 0.07 + 0.03 * w, { to: 88, vib: [7, 80, 0.15], lp: 1300, pan: p, rev: 0.4 }); s.tone(t + 0.04, 'sawtooth', 192, 1.0, 0.035 * w, { to: 118, vib: [8, 70, 0.1], lp: 1600, pan: p });
      s.nz(t, 1.1, 'bandpass', 600, 1.1, 0.07 * w, { to: 300, pan: p }); s.rumble(t, 1.2, 0.16 * w, { f: 140, pan: p }); s.cymbal(t + 0.05, 0.9, 0.04 * w, { pan: p }); },
    ogClang: (s, t, w, p) => { s.ring(t, 168, 0.9, 0.08 * w, { pan: p }); s.ring(t, 261, 0.6, 0.05 * w, { pan: p }); s.thud(t, 120, 45, 0.25, 0.2 * w, { pan: p }); },
    ogClap: (s, t, w, p) => { s.nz(t, 0.08, 'bandpass', 1800, 1.2, 0.12 * w, { pan: p }); s.nz(t + 0.02, 0.4, 'highpass', 3000, 0.7, 0.03 * w, { a: 0.03, pan: p }); },
    ogLaugh: (s, t, w, p) => { for (let i = 0; i < 3; i++) { s.tone(t + i * 0.16, 'sawtooth', 150 - i * 12, 0.13, 0.05 * w, { to: 115 - i * 10, lp: 900, pan: p }); s.nz(t + i * 0.16, 0.1, 'bandpass', 700, 1.5, 0.03 * w, { pan: p }); } },
    ogDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 140, 1.4, 0.06, { to: 50, vib: [5, 70, 0.2], lp: 800, pan: p, rev: 0.5 }); s.nz(t + 0.2, 1.0, 'lowpass', 400, 0.7, 0.05 * w, { a: 0.2, pan: p }); },
  };

  return {
    name: '大力士', HX, R_EL: STAR, DUR, hero, P, GLOW_MATS: [GLINT, EYER, MOUTH, TONGUE, POWDER, INK], HIT_POINT: [4, -40], EVENTS, MAX_H: 88, OWN_MAX: 100, SHEET_K: 3, VOICES,
    SFX: { body: 'flesh', how: 'topple', pal: 'earth', style: 'buff', w: 1 },
    MOVES: ['heave', 'club', 'roar'], MOVE_NAMES: { heave: '举重', club: '抡棒', roar: '较劲（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.2, 1.4, 2.0, 2.1]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0.08, 0.17, 0.33, 0.5, 0.67, 0.92, 1.0], 'heave'], [CAST, [0, 1 / 12, 3 / 12], 'heave'], [RECOVER, [0.08, 0.25, 0.5, 0.67, 0.83], 'heave'],
      [CHARGE, [0.08, 0.25, 0.5, 0.58], 'club'], [CAST, [0, 1 / 12, 2 / 12, 3 / 12], 'club'], [RECOVER, [0.17, 0.33, 0.5], 'club'],
      [CHARGE, [0.08, 0.25, 0.42], 'roar'], [CAST, [0, 2 / 12, 0.67], 'roar'], [RECOVER, [0.17, 0.33], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.67, 0.9, 1.0, 1.1, 1.3, 2.0, 2.3, 2.6]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
