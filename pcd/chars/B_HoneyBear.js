// 巨掌（小首领，精灵之森 · 德鲁伊区域）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js。
// 依据：附录 G2「蜜熊」；被动 扑食（普攻打先锋、守护者以外 +60%）；招式 连环掌 paws（对一个连拍三下，第三下拍飞、晕 2.5 秒）、
//       偷蜜 honey（抱着蜂巢吃 6 秒回血，这期间挨打太多会打翻、自己晕 2 秒）；半血 暴躁（攻速 +40%）。
// 设定卡 ——
//   剪影：林子里的一头巨熊，四脚着地时背像一座小山（肩峰高过屁股），脑袋压得低低的往前探；最显眼的是两只巨大的前掌——
//         每只掌比它的半个脑袋还大，五根长长的象牙色弯爪，掌上糊着亮晶晶的蜂蜜（识别点一）。
//         背上长着一层青苔，苔里卡着一只灰黄的野蜂巢（一圈圈的纸层、巢口淌着金蜜，破的那面露出蜂房），五只小蜜蜂一直绕着巢飞（识别点二）。
//   脸：一张大熊脸：宽脑门、厚腮毛、短而粗的奶油色口鼻、黑鼻头、小小的琥珀色发光眼睛，嘴角挂着蜜往下滴；胸口一道奶油色的月牙。
//   主色：暗棕的厚毛 + 奶油月牙 / 口鼻 + 暗青苔 + 灰黄蜂巢，全部压暗；光：琥珀色的蜂蜜（巢口、掌上、嘴角）和眼睛。
//   招式（setMove）：
//     paws 连环掌：人立起来，两只巨掌往后拉满、爪上的蜜发亮、全身在抖 → 近掌横拍、远掌再拍、蹲低两掌从下往上一撩（第三下把人拍飞：光环、白闪、震屏）。
//     honey 偷蜜：嗅一嗅、回手往背上一掏 → 一屁股坐下把蜂巢抱在怀里，脸埋进去大嚼（蜜光照亮脸、蜂群炸开、金色的光点往上飘）、掏一掌蜜舔 → 舔舔嘴、把巢按回背上、趴下。
//     roar 暴躁（半血）：伏低、颈毛炸起 → 人立、两臂张开仰天大吼（两道光环、蜂群炸开、蜜沫喷出、树叶落下）→ 两只巨掌砸回地面。
//   待机：两档呼吸、蜜蜂绕巢、蜜一滴滴往下淌；个性动作是抬鼻子嗅一嗅，再抬起前掌舔掌上的蜜。移动：四拍的熊步（侧对步，肩一耸一耸）。
//   死亡：仰头哀嚎 → 前腿一软跪下 → 整个趴平；背上的蜂巢滚下来摔裂，蜜淌成一滩，蜜蜂四散，最后化成金色的光点。
PCD.define('B_HoneyBear', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：毛、苔、巢都压暗，琥珀色的蜜才亮得出来 ─────
  const R_FUR = ['#080504', '#130c07', '#1e130b', '#2a1b10', '#372315', '#452c1a', '#543620', '#654127', '#784d2f', '#8c5b38', '#a26c44'];     // 暗棕厚毛
  const R_CREAM = ['#1a1008', '#34220f', '#4e3518', '#684a24', '#826032', '#9c7842', '#b49054', '#c8a668', '#dabc80', '#ecd49c', '#f8e8c0']; // 月牙、口鼻
  const R_HIVE = ['#100b06', '#20170d', '#302315', '#41301d', '#523e26', '#644d30', '#775e3b', '#8a6f47', '#9e8255', '#b29566', '#c6aa7a'];  // 野蜂巢的纸层
  const R_MUZ = ['#140a05', '#2a160b', '#402210', '#573016', '#6e3f1d', '#864f25', '#9c602e', '#b27239', '#c68646', '#d89a58', '#e8b070'];   // 口鼻（暖棕）
  const R_NOSE = ['#040303', '#0a0707', '#120d0d', '#1b1414', '#251c1c', '#312626', '#3f3232', '#503f3f', '#665252'];                                     // 鼻头、肉垫
  const R_MOSS = ['#060b05', '#0d180a', '#15250f', '#1d3314', '#26411a', '#305020', '#3b5f27', '#476f2f', '#548038'];                        // 背上的青苔
  const FUR = defDeep(R_FUR, { depth: 9, amb: 0.12 }), FURD = defDeep(R_FUR, { depth: 6, dark: 3, amb: 0.08 }), FURS = defDeep(R_FUR, { depth: 2, amb: 0.2 });
  const FURA = defDeep(R_FUR, { depth: 5, dark: 1, amb: 0.1 }), PAWM = defDeep(R_FUR, { depth: 5, dark: 2, amb: 0.1 });   // 前臂、巨掌：越往下毛越深
  const CREAM = defDeep(R_CREAM, { depth: 3, amb: 0.22 }), MUZ = defDeep(R_MUZ, { depth: 4, dark: 1, amb: 0.16 });
  const HIVE = defDeep(R_HIVE, { depth: 5, amb: 0.14 }), MOSS = defDeep(R_MOSS, { depth: 2, amb: 0.2 });
  const CLAW = defDeep('ivory', { depth: 2, amb: 0.3 }), CLAWD = defDeep('ivory', { depth: 2, dark: 3, amb: 0.2 });
  const NOSE = defDeep(R_NOSE, { depth: 2, amb: 0.25 }), COMB = defDeep('brass', { depth: 2, amb: 0.3 }), TOOTH = defDeep('ivory', { depth: 1, amb: 0.5 });
  const HON = fxRamp('bearHoney', ['#ffffff', '#fff0a0', '#ffb020', '#c8680c', '#5a2a06']), HR = FXR[HON];    // 特效：白 → 淡金 → 琥珀 → 暗
  const BEE = fxRamp('bearBee', ['#fff7b8', '#ffd040', '#e8a818', '#2a1c08', '#120c04']);                     // 蜂群粒子：黄 → 黑
  const HONEY = defMat([HR[4], HR[3], HR[2], HR[1]], 1, 1), HONEYD = defMat([HR[4], HR[4], HR[3], HR[2]], 1, 1), HONEYHI = defMat([HR[3], HR[2], HR[1], HR[0]], 1, 1);
  const EYE = defMat([0, 46, 47, 51], 1, 1), EYE2 = defMat([46, 47, 51, 21], 1, 1);
  const MOUTH = defMat([0, 55, 55, 56], 1, 1), TONGUE = defMat([55, 26, 63, 58], 1, 1);
  const BEEY = defMat([20, 14, 47, 47], 1, 1), BEEK = defMat([0, 0, 0, 0], 1, 1), WING = defMat([21, 21, 21, 21], 1, 1);
  const hero = new Sprite(184, 126, 88, 116);
  const DUR = [2.6, 4 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { paws: { 3: 0.8, 4: 0.95, 5: 0.6 }, honey: { 3: 0.5, 4: 1.6, 5: 0.9 }, roar: { 3: 0.5, 4: 0.6, 5: 0.75 } };
  let MV = 'paws';
  const HX = 84;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [HR[1], HR[2], HR[3]], k: 0.6 }, { x: 0, y: 0, r: 0, ramp: [51, 47, 46], k: 0.55 }];
  const RIM_R = [0, 10, 16, 24], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: HR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of [HONEY, HONEYD, HONEYHI, EYE, EYE2, MOUTH, TONGUE, BEEY, BEEK, WING]) RIM.skip[m] = 1;

  // ───── 骨架（四脚着地时的本地坐标，脚底 y = 0，面朝右）─────
  // 人立 = 整个身子绕胯（HIP）往后仰 P.up 弧度；头自动回正 90%。四肢的落点是绝对坐标（手 / 脚踝），两段 IK。
  const HIP = [-20, -31], NECK = [23, -42];
  const ROOT = { nh: [-20, -30], fh: [-16, -31], nf: [14, -36], ff: [10, -37] };
  const LIMBS = ['nh', 'fh', 'nf', 'ff'];
  const D0 = { bx: 0, by: 0, up: 0, hd: 0, jaw: 0, nh: [-19, -3], fh: [-14, -3], nf: [22, -5], ff: [16, -5] };
  const K = {
    idle: {},
    sniff: { up: 0.06, hd: -0.26 },
    lick: { up: 0.14, by: 1, hd: 0.28, jaw: 1, nf: [36, -33] },                                                        // 抬起前掌凑到嘴边舔蜜
    wind: { up: 0.7, by: 2, hd: -0.05, jaw: 1, nf: [16, -72], ff: [30, -36], nh: [-15, -3], fh: [-10, -3] },            // 普攻：半人立，近掌举到脑后
    strike: { up: 0.16, bx: 6, hd: 0.14, jaw: 2, nf: [52, -6], ff: [34, -5] },                                           // 一掌拍到地上
    rear: { up: 1.05, by: 8, hd: -0.04, jaw: 1, nf: [26, -66], ff: [14, -70], nh: [-12, -3], fh: [-7, -3] },            // 连环掌蓄力：人立、两掌拉满
    slapN: { up: 0.9, bx: 5, by: 7, hd: 0.1, jaw: 2, nf: [50, -44], ff: [0, -64], nh: [-11, -3], fh: [-6, -3] },
    slapNf: { up: 0.86, bx: 5, by: 7, hd: 0.14, jaw: 1, nf: [46, -26], ff: [4, -62], nh: [-11, -3], fh: [-6, -3] },
    slapF: { up: 0.86, bx: 6, by: 7, hd: 0.08, jaw: 2, nf: [18, -52], ff: [50, -42], nh: [-11, -3], fh: [-6, -3] },
    slapFf: { up: 0.8, bx: 6, by: 7, hd: 0.14, jaw: 1, nf: [16, -48], ff: [44, -24], nh: [-11, -3], fh: [-6, -3] },
    crouch: { up: 0.4, bx: 4, by: 5, hd: 0.25, jaw: 1, nf: [32, -8], ff: [27, -7], nh: [-14, -3], fh: [-9, -3] },         // 第三下之前蹲低
    swat: { up: 1.0, bx: 8, by: 7, hd: -0.22, jaw: 2, nf: [44, -70], ff: [36, -72], nh: [-10, -3], fh: [-5, -3] },         // 两掌从下往上撩
    reach: { up: 0.45, by: 4, hd: -0.22, nf: [-12, -62], ff: [20, -5] },                                                  // 偷蜜：回手去背上掏巢
    sit: { up: 1.0, by: 11, hd: 0.36, jaw: 1, nf: [19, -19], ff: [37, -37], nh: [-2, -3], fh: [3, -3] },                    // 坐下抱巢、脸埋进去
    scoop: { up: 1.0, by: 11, hd: 0.1, jaw: 1, nf: [30, -60], ff: [37, -37], nh: [-2, -3], fh: [3, -3] },                   // 掏一掌蜜往嘴里送
    hunch: { up: -0.06, by: 3, hd: 0.22, jaw: 1, nf: [27, -5], ff: [20, -5], nh: [-21, -3], fh: [-16, -3] },               // 暴躁蓄力：伏低、颈毛炸起
    roar: { up: 1.1, by: 9, hd: -0.4, jaw: 2, nf: [48, -54], ff: [-4, -76], nh: [-12, -3], fh: [-7, -3] },               // 仰天大吼、两臂张开
    stomp: { up: 0.02, bx: 4, by: 2, hd: 0.16, jaw: 1, nf: [36, -5], ff: [30, -5] },                                     // 两掌砸回地面
    hurt: { up: 0.25, bx: -3, hd: -0.32, jaw: 1, nf: [20, -14] },
    howl: { up: 0.45, bx: -2, by: 2, hd: -0.5, jaw: 2, nf: [22, -12] },
    dieA: { up: -0.14, by: 9, hd: 0.3, jaw: 1, nf: [32, -3], ff: [27, -3], nh: [-20, -3], fh: [-15, -3] },                 // 前腿一软跪下
    dieB: { up: -0.05, by: 19, hd: 0.2, jaw: 0, nf: [42, -3], ff: [36, -2], nh: [-38, -3], fh: [-31, -3] },               // 趴平
  };

  const P = {};
  const FIELDS = ['st', 'bx', 'by', 'up', 'hd', 'jaw', 'tongue', 'eyes', 'glow', 'rim', 'flash', 'dq', 'nhx', 'nhy', 'fhx', 'fhy', 'nfx', 'nfy', 'ffx', 'ffy',
    'bee', 'bees', 'drip', 'hv', 'hvx', 'hvy', 'fall', 'hack', 'palm', 'pool', 'crk'];
  function base() {
    P.st = 0; P.tongue = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.bee = 0; P.bees = 1; P.drip = 0;
    P.hv = 0; P.hvx = 30; P.hvy = -26; P.fall = 0; P.hack = 0; P.palm = 0; P.pool = 0; P.crk = 0; P.mx = 0; P.flip = 0;
    setK(K.idle, K.idle, 0);
  }
  const num = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of ['bx', 'by', 'up', 'hd', 'jaw']) { const va = num(a, f); P[f] = va + (num(b, f) - va) * q; }
    for (const l of LIMBS) { const pa = a[l] || D0[l], pb = b[l] || D0[l]; P[l + 'x'] = pa[0] + (pb[0] - pa[0]) * q; P[l + 'y'] = pa[1] + (pb[1] - pa[1]) * q; }
  }
  // 熊步：8 帧一圈（12 fps，2/3 秒），侧对步：近后 → 近前 → 远后 → 远前。每只脚 [前后, 离地]
  const CYC = [[6, 0], [3, 0], [0, 0], [-3, 0], [-6, 0], [-5, 4], [0, 7], [5, 4]], PH = { nh: 0, nf: 2, fh: 4, ff: 6 };
  function walk(f) {
    f = ((f % 8) + 8) % 8;
    for (const l of LIMBS) { const c = CYC[(f + PH[l]) % 8]; P[l + 'x'] = D0[l][0] + c[0]; P[l + 'y'] = D0[l][1] - c[1]; }
    P.by = [0, 1, 1, 0, 0, 1, 1, 0][f]; P.up = [0.03, 0, -0.03, 0, 0.03, 0, -0.03, 0][f]; P.hd = [0, 0.05, 0.08, 0.05, 0, 0.05, 0.08, 0.05][f];
  }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.bee = f12 & 7; P.drip = Math.floor(TT * 3) % 4;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.up = b ? -0.012 : 0.012; P.hd = b ? 0.04 : 0;
      const lp = tt % DUR[IDLE];
      if (lp >= 0.5 && lp < 0.95) { const k = (lp - 0.5) / 0.45, q = k < 0.3 ? ease.out(k / 0.3) : k > 0.75 ? 1 - ease.in((k - 0.75) / 0.25) : 1; setK(K.idle, K.sniff, q); P.by += b; P.jaw = f12 & 1 ? 1 : 0; }   // 待机个性：抬鼻子嗅
      if (lp >= 1.3 && lp < 2.3) {                                                                       // 再抬起前掌舔掌上的蜜
        const k = lp - 1.3, q = k < 0.25 ? ease.out(k / 0.25) : k > 0.8 ? 1 - ease.in((k - 0.8) / 0.2) : 1; setK(K.idle, K.lick, q);
        P.tongue = k > 0.3 && k < 0.8 && (Math.floor(k * 12) % 3) !== 2 ? 1 : 0; P.jaw = P.tongue ? 1 : 0; P.palm = q > 0.5 ? 1 : 0;
      }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 24, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < T_STRIKE) { const q = ease.out(tq / T_STRIKE); setK(K.idle, K.wind, q); P.glow = 1; P.eyes = tq > 0.1 ? 2 : 0; P.hack = 1; P.palm = 1; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.strike, K.strike, 0); P.glow = 2; P.rim = 2; P.eyes = 2; P.hack = 1; }
      else { const q = ease.inOut(clamp01((tq - T_STRIKE - 1 / 12) / 0.33)); setK(K.strike, K.idle, q); P.glow = q < 0.4 ? 1 : 0; P.jaw = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.hack = 1; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); setK(K.hurt, K.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.jaw = Math.round(P.jaw); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { paws: 0, honey: 1, roar: 2 };
  const T_STRIKE = 3 / 12;
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'paws') {
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.35)); setK(K.idle, K.rear, q);
        if (tq > 0.35) { P.bx += sh ? 1 : 0; P.nfy += sh ? -1 : 1; P.ffy += sh ? 1 : -1; }                // 两掌拉满，全身在抖
        P.glow = tq < 0.3 ? 1 : tq < 0.6 ? 2 : 2 + sh; P.rim = tq > 0.4 ? 2 : 1; P.eyes = 2; P.hack = 1; P.palm = 1; P.jaw = tq > 0.5 ? 2 : 1;
      } else if (st === CAST) {
        const i = Math.min(2, Math.floor(tq / 0.3 + 1e-6)), u = tq - i * 0.3; P.eyes = 2; P.hack = 1; P.palm = 1; P.glow = 2;
        if (i === 0) { if (u < 1 / 12) { setK(K.slapN, K.slapN, 0); P.rim = 3; } else if (u < 3 / 12) setK(K.slapN, K.slapNf, ease.out((u - 1 / 12) / (2 / 12))); else setK(K.slapNf, K.slapF, 0.25); }
        else if (i === 1) { if (u < 1 / 12) { setK(K.slapF, K.slapF, 0); P.rim = 3; } else if (u < 3 / 12) setK(K.slapF, K.slapFf, ease.out((u - 1 / 12) / (2 / 12))); else setK(K.slapFf, K.crouch, 0.85); }
        else { setK(K.swat, K.swat, 0); P.rim = u < 1 / 12 ? 3 : 2; P.glow = 3; P.bees = 2; }
      } else { const q = ease.inOut(clamp01(tq / 0.5)); setK(K.swat, K.idle, q); P.glow = q < 0.4 ? 1 : 0; P.eyes = q < 0.5 ? 2 : 0; P.palm = q < 0.5 ? 1 : 0; P.jaw = q < 0.3 ? 1 : 0; }
    } else if (MV === 'honey') {
      if (st === CHARGE) {
        if (tq < 0.2) { setK(K.idle, K.sniff, ease.out(tq / 0.2)); P.jaw = sh; }
        else setK(K.sniff, K.reach, ease.inOut(clamp01((tq - 0.2) / 0.25)));
        P.glow = tq > 0.3 ? 1 : 0; P.bees = tq > 0.3 ? 2 : 1;
      } else if (st === CAST) {
        P.bees = 2; P.glow = 2 + sh;
        if (tq < 0.25) { const q = ease.inOut(tq / 0.25); setK(K.reach, K.sit, q); P.hv = q; }
        else if (tq >= 0.83 && tq < 1.25) {                                                              // 掏一掌蜜往嘴里送，舔
          const k = tq - 0.83, q = k < 0.17 ? ease.out(k / 0.17) : k > 0.3 ? 1 - ease.in((k - 0.3) / 0.12) : 1; setK(K.sit, K.scoop, q); P.hv = 1;
          P.tongue = k > 0.12 && k < 0.34 ? 1 : 0; P.palm = 1; P.jaw = 1;
        } else { setK(K.sit, K.sit, 0); P.hv = 1; P.jaw = (f12 % 4) < 2 ? 1 : 0; P.hd += (f12 % 4) < 2 ? 0.05 : -0.02; P.eyes = 1; }   // 脸埋进去大嚼
      } else {
        if (tq < 0.35) { setK(K.sit, K.scoop, 0.4); P.hd = -0.1; P.hv = 1; P.tongue = (f12 % 3) !== 2 ? 1 : 0; P.jaw = 1; P.glow = 1; P.bees = 2; }   // 舔嘴
        else if (tq < 0.6) { const q = ease.inOut((tq - 0.35) / 0.25); setK(K.sit, K.reach, q); P.hv = 1 - q; P.glow = 1; }            // 把巢按回背上
        else setK(K.reach, K.idle, ease.inOut(clamp01((tq - 0.6) / 0.25)));
      }
    } else {   // roar：半血的暴躁
      if (st === CHARGE) { const q = ease.out(clamp01(tq / 0.3)); setK(K.idle, K.hunch, q); if (tq > 0.25) P.bx += sh ? 1 : -1; P.hack = 1; P.eyes = 2; P.glow = 1; P.rim = 1; }
      else if (st === CAST) { const q = ease.out(clamp01(tq / (2 / 12))); setK(K.hunch, K.roar, q); if (tq > 0.25) { P.bx += sh ? 1 : 0; P.hd += sh ? -0.04 : 0; } P.hack = 1; P.eyes = 2; P.glow = 3; P.rim = tq < 0.25 ? 3 : 2; P.bees = 2; P.palm = 1; }
      else {
        if (tq < 0.25) { setK(K.roar, K.stomp, ease.in(tq / 0.25)); P.eyes = 2; P.glow = 2; P.rim = 2; P.bees = 2; P.hack = 1; }
        else { const q = ease.inOut(clamp01((tq - 0.25) / 0.45)); setK(K.stomp, K.idle, q); P.glow = q < 0.3 ? 2 : q < 0.6 ? 1 : 0; P.eyes = q < 0.6 ? 2 : 0; P.bees = q < 0.5 ? 2 : 1; }
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.35) { setK(K.howl, K.howl, 0); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.hack = 1; P.bees = 2; return; }     // 仰头哀嚎
    const q1 = ease.in(clamp01((d - 0.35) / 0.4)), q2 = ease.in(clamp01((d - 0.8) / 0.4));
    if (q2 > 0) setK(K.dieA, K.dieB, q2); else setK(K.howl, K.dieA, q1);
    P.eyes = 1; P.bees = d < 1.2 ? 2 : 0; P.jaw = d < 1.1 ? 1 : 0;
    if (d > 0.9) {                                                                                         // 蜂巢从背上滚下来、摔裂、蜜淌成一滩
      const r = clamp01((d - 0.9) / 0.32); P.hv = 2; P.hvx = -14 - 38 * ease.out(r); P.hvy = -58 + 48 * r * r; P.fall = -2.2 * r;
      if (d > 1.22) { P.crk = 1; P.hvy = -10; P.fall = -2.2; P.pool = Math.min(15, 3 + (d - 1.22) * 26); }
    }
    if (d > 1.95) P.dq = Math.round(clamp01((d - 1.95) / 0.6) * 48) / 48;
  }
  // 发光体（蓄力汇聚点）：连环掌 / 普攻是近掌，偷蜜是蜂巢，暴躁是嘴
  function focus() {
    geo(); let f;
    if (MV === 'honey' && P.st >= CHARGE && P.st <= RECOVER) { const h = hivePos(); f = [h[0], h[1] - 4]; }
    else if (MV === 'roar' && P.st >= CHARGE && P.st <= RECOVER) f = L.mouth;
    else f = pawC(L.nf, 0);
    P.fx = f[0]; P.fy = f[1]; P.gx = P.fx; P.gy = P.fy;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(HIP[0], HIP[1], -P.up); }
  function headXf() { bodyXf(); B.rot(NECK[0], NECK[1], P.hd + P.up * 0.9); B.move(2, 5); }   // 头比肩峰低，往前探
  function geo() {
    bodyXf();
    for (const k of LIMBS) {
      const fore = k[1] === 'f', r = B.at(ROOT[k][0], ROOT[k][1]), tg = [P[k + 'x'], P[k + 'y']], l1 = fore ? 18 : 16, l2 = fore ? 16 : 15;
      const kn = B.ik(r, tg, l1, l2, fore ? -1 : 1), dd = Math.hypot(tg[0] - kn[0], tg[1] - kn[1]) || 1;
      L[k] = { r, kn, h: [kn[0] + (tg[0] - kn[0]) / dd * l2, kn[1] + (tg[1] - kn[1]) / dd * l2] };
    }
    headXf(); L.mouth = B.at(50, -35); L.eye = B.at(41, -44); L.nose = B.at(54, -39); L.head = B.at(39, -42);
    B.reset();
  }
  // 掌：着地时是平贴地面的一只大肉垫，抬起时顺着前臂的方向；返回 [掌心 x, y, 前向 x, y]
  function pawF(g) {
    const grounded = g.h[1] > -9;
    if (grounded) return [g.h[0] + 4, g.h[1] + 0.5, 1, 0, 1];
    const dx = g.h[0] - g.kn[0], dy = g.h[1] - g.kn[1], d = Math.hypot(dx, dy) || 1;
    return [g.h[0] + dx / d * 4, g.h[1] + dy / d * 4, dx / d, dy / d, 0];
  }
  const pawC = (g) => { const f = pawF(g); return [f[0], f[1]]; };
  function hivePos() {
    if (P.hv >= 2) return [P.hvx, P.hvy, P.fall];
    bodyXf(); const b = B.at(-7, -57), tb = -P.up, q = P.hv; B.reset();
    return [b[0] + (P.hvx - b[0]) * q, b[1] + (P.hvy - b[1]) * q, tb + (0.12 - tb) * q];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);

  // 毛的笔触：身体里固定的一组短斜线（暗）+ 上半身的高光点
  const BODY = [[-23, -39, 14, 13], [-4, -37, 19, 13.5], [12, -40, 13, 15], [5, -51, 12, 6]];
  const STROKES = []; { let s = 11; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const inBody = (x, y) => BODY.some(([cx, cy, rx, ry]) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 0.7);
    for (let n = 0; STROKES.length < 32 && n < 4000; n++) { const x = Math.round(-36 + rnd() * 58), y = Math.round(-60 + rnd() * 34); if (inBody(x, y) && !STROKES.some((p) => Math.abs(p[0] - x) + Math.abs(p[1] - y) < 5)) STROKES.push([x, y, y < -43 ? 1 : 0]); } }
  const topY = (x) => { const q = (x - 5) / 12; return Math.abs(q) < 1 ? -51 - 6 * Math.sqrt(1 - q * q) : -50; };

  function drawBody() {
    part(); bodyXf();
    B.ell(E, -23, -39, 14, 13, 0.1, FUR); B.ell(E, -4, -37, 19, 13.5, 0, FUR); B.ell(E, 12, -40, 13, 15, -0.1, FUR);
    B.ell(E, 5, -51, 12, 6, -0.12, FUR); B.ell(E, 19, -34, 8, 10, 0.2, FUR); B.ell(E, 24, -41, 8, 8.5, 0.3, FUR);
    for (let x = -31; x <= 20; x += 3) { const y = x < -14 ? -27 : -24.5; B.ln(E, x, y - 2, x - 1, y + 2 + ((x / 3) & 1), FUR, 4); }       // 肚皮下的长毛
    for (let x = -34; x <= 17; x += 4) { const y = x < -7 ? -51 : topY(x); B.ln(E, x, y + 1, x - 2, y - (P.hack ? 4 : 1.5), FUR, P.hack ? 7 : 6); }   // 背上的毛尖（暴躁时炸起）
    for (const [x, y, hi] of STROKES) { B.ln(E, x, y, x - 2, y + 2, FUR, 3); if (hi) B.px(E, x + 1, y - 1, FUR, 7); }
    B.ln(E, 3, -44, 6, -30, FUR, 3); B.ln(E, -14, -46, -13, -30, FUR, 4);                                                           // 肩、胯的肌肉沟
    B.ln(E, -30, -50, -18, -52, FUR, 8); B.ln(E, 0, -56, 10, -57, FUR, 8);                                                          // 背脊高光
  }
  function drawTail() { part(); bodyXf(); B.ell(E, -36, -45, 3.6, 3, 0.3, FURS); B.px(E, -38, -47, FURS, 7); B.ln(E, -39, -44, -40, -42, FURS, 3); }
  function drawCrescent() {   // 胸口的奶油色月牙
    part(); bodyXf();
    B.strand(E, B.bez([27, -35], [24, -26], [12, -25.5], 9), 2.2, 1, CREAM); B.strand(E, B.bez([27, -35], [29, -38], [29, -41], 4), 1.6, 0.8, CREAM);   // 在胸下（人立时朝前）
    B.ln(E, 25, -29, 18, -27, CREAM, 8);
  }
  function drawMoss() {
    part(); bodyXf();
    B.ell(E, -19, -50.5, 8, 2.2, 0.12, MOSS); B.ell(E, -3, -51.5, 7, 2, 0, MOSS); B.ell(E, 10, -56.5, 5, 1.8, -0.25, MOSS);
    for (const [x, y] of [[-25, -49], [-16, -49], [2, -50], [12, -55]]) B.ln(E, x, y, x - 0.5, y + 2, MOSS, 3);                 // 垂下来的苔
    for (const x of [-24, -20, -14, -5, -1, 8, 11]) B.px(E, x, x < -8 ? -52 : x < 6 ? -53 : -58, MOSS, 8);
  }
  function drawHive(cx, cy, tilt) {   // 灰黄的野蜂巢：一圈圈的纸层，巢口淌蜜，破的那面露出蜂房
    part(); B.reset(); B.move(cx, cy); B.rot(0, 0, tilt);
    B.ell(E, 0, 0.5, 8.5, 7.5, 0, HIVE); B.ell(E, 0, -4.5, 7, 5.5, 0, HIVE); B.ell(E, 0.5, -8.5, 3.4, 2.4, 0, HIVE); B.ln(E, 1, -10, 1, -12, HIVE, 3);
    for (const [y, w] of [[-7, 4.5], [-2.5, 7], [2, 8], [6, 6]]) { B.ln(E, -w, y, w, y, HIVE, 2); B.ln(E, -w + 1, y - 1, w - 1, y - 1, HIVE, 7); }
    B.ell(E, 3.5, -0.5, 2, 1.5, 0, HIVE, 10);                                                                                       // 巢口
    part(); B.poly(E, [[-9, 0], [-5, -3], [-2, 1], [-3, 7], [-8, 6]], COMB);                                                       // 蜂房
    for (const [x, y] of [[-7, 0], [-5, 2], [-7, 4], [-4, -1], [-4, 5], [-6, 6]]) B.px(E, x, y, COMB, 2);
    for (const [x, y] of [[-6, 1], [-5, 4], [-3, 2]]) B.px(E, x, y, P.glow ? HONEYHI : HONEY);
    part(); const dl = P.crk ? 4 : P.drip; B.strand(E, [[3.5, 0.5], [4, 3], [3.5, 5 + dl]], 1.3, 0.8, HONEY); B.px(E, 3.5, 6 + dl, HONEYD); B.px(E, 4, 1, HONEYHI);
    if (P.crk) { B.ln(E, -2, -9, 1, -3, HONEY); B.ln(E, 1, -3, -1, 3, HONEY); B.ln(E, -1, 3, 2, 8, HONEYHI); B.px(E, 0, -6, HONEYHI); }   // 摔裂的缝里透出蜜光
    B.reset();
  }
  function drawHoneyFlank() {   // 巢口淌下来的蜜，顺着背往下流
    part(); bodyXf();
    B.strand(E, [[-3, -50], [-2.5, -48], [-2.5, -46 + P.drip]], 0.9, 0.6, HONEY); B.px(E, -2.5, -45 + P.drip, HONEYD); B.px(E, -3, -49, HONEYHI);
  }
  function drawBees(hp, front) {
    if (!P.bees) return; const n = P.bees > 1 ? 8 : 5, cx = hp[0], cy = hp[1] - 3;
    for (let i = 0; i < n; i++) {
      const a = (P.bee / 8 + i / n) * 6.2832 * (i & 1 ? 1 : -1) + i, rx = (P.bees > 1 ? 19 : 13) + (i % 3) * 3, ry = (P.bees > 1 ? 11 : 6) + (i % 2) * 2, s = Math.sin(a);
      if ((s >= 0) !== front) continue;
      const X = Math.round(cx + Math.cos(a) * rx), Y = Math.round(cy + s * ry - (i % 3) + (((P.bee + i) & 3) === 0 ? 1 : 0));
      part(); px(X, Y, BEEY); px(X - 1, Y, BEEK); px(X + 1, Y, BEEY, 4); px(((P.bee + i) & 1) ? X : X - 1, Y - 1, WING);
    }
  }
  function drawHind(k, far) {
    const g = L[k], m = far ? FURD : FUR;
    part(); capW(g.r[0], g.r[1], g.kn[0], g.kn[1], far ? 7 : 8.5, 5.5, m); capW(g.kn[0], g.kn[1], g.h[0], g.h[1], 5, 4.2, m);
    if (!far) { lnW(g.kn[0] - 4, g.kn[1] - 1, g.kn[0] - 7, g.kn[1] + 3, m, 4); lnW(g.kn[0] - 3, g.kn[1] + 3, g.kn[0] - 6, g.kn[1] + 6, m, 3); px(g.r[0] + 1, g.r[1] - 5, m, 7); px(g.r[0] + 3, g.r[1] - 4, m, 7); }
    part(); const ax = g.h[0], ay = g.h[1];                                                                                        // 平平的一整只熊脚
    B.polyW(E, [[ax - 4, ay - 1.5], [ax + 4, ay - 1.5], [ax + 8, ay + 2], [ax + 8, ay + 3], [ax - 4.5, ay + 3]], m); lnW(ax - 4, ay + 3, ax + 8, ay + 3, m, far ? 2 : 3);
    for (let i = 0; i < 3; i++) { const cx = ax + 8.5, cy = ay + 0.5 + i * 1.2; lnW(cx, cy, cx + 2, cy + 1, far ? CLAWD : CLAW, i ? 5 : 7); }
  }
  function drawArm(k, far) {
    const g = L[k], m = far ? FURD : FUR, ma = far ? FURD : FURA, f = pawF(g);
    part(); capW(g.r[0], g.r[1], g.kn[0], g.kn[1], far ? 6.5 : 7.5, 5.5, m); part(); capW(g.kn[0], g.kn[1], g.h[0], g.h[1], 5.2, 6.4, ma);
    if (!far) {                                                                                                                    // 前臂后面垂下来的长毛
      for (let i = 0; i < 3; i++) { const q = 0.15 + i * 0.3, x = g.kn[0] + (g.h[0] - g.kn[0]) * q, y = g.kn[1] + (g.h[1] - g.kn[1]) * q; lnW(x - 4, y, x - 6, y + 3, ma, i & 1 ? 3 : 4); }
      px((g.r[0] + g.kn[0]) / 2 + 1, (g.r[1] + g.kn[1]) / 2 - 2, m, 7); px(g.kn[0], g.kn[1], m, 3);
    }
    drawPaw(f, far);
  }
  function drawPaw(f, far) {   // 巨掌：比半个脑袋还大，五根象牙色长爪，糊着蜜
    const m = far ? FURD : PAWM, [cx, cy, ax, ay, gr] = f, nx = -ay, ny = ax, S = far ? 0.92 : 1;
    const at = (u, v) => [cx + (ax * u + nx * v) * S, cy + (ay * u + ny * v) * S], ang = Math.atan2(ay, ax);
    part(); B.reset(); B.ell(E, cx, cy - (gr ? 1 : 0), (gr ? 10 : 10.5) * S, (gr ? 5.6 : 8) * S, ang, m);
    const sp = gr ? 2 : 3.6, N = gr ? 3 : 4;
    for (let i = 0; i < N; i++) { const v = (i - (N - 1) / 2) * sp + (gr ? 0.5 : 0), p = at(8.5, v); dot(p[0], p[1], 2.1 * S, m, far ? 4 : 6); }   // 指头
    if (!far) { const hi = at(-2, -4); px(hi[0], hi[1], m, 8); const h2 = at(1, -4.5); px(h2[0], h2[1], m, 7); }
    if (P.palm && !far && !gr) { part(); const pp = at(0, 2.6); B.ell(E, pp[0], pp[1], 4, 2.8, ang, NOSE); for (let i = 0; i < N; i++) { const p = at(6, (i - (N - 1) / 2) * sp + 1.5); px(p[0], p[1], NOSE, 3); } }   // 掌心的黑肉垫
    part();
    for (let i = 0; i < N; i++) {
      const v = (i - (N - 1) / 2) * sp + (gr ? 0.5 : 0), p0 = at(9.5, v), p1 = at(14, v + 1), p2 = at(17 + (i === 0 || i === N - 1 ? -1.5 : 0), v + 3.6);
      B.strand(E, [p0, p1, p2], gr ? 0.9 : 1.05, 0.3, far ? CLAWD : CLAW, far ? 3 : 4); px(p1[0], p1[1], far ? CLAWD : CLAW, far ? 5 : 8);
      if (!far && P.glow >= 2) px(p2[0], p2[1], HONEYHI);
    }
    if (!far) { part(); const h0 = at(-1, -4.5), h1 = at(2, -4), h2 = at(5, -2); px(h0[0], h0[1], HONEY); px(h1[0], h1[1], HONEYHI); px(h2[0], h2[1], HONEY);   // 掌上的蜜，往下滴
      const d0 = at(0.5, 6.5 + (gr ? 0 : P.drip * 0.7)); if (!gr) { px(d0[0], d0[1], HONEY); const d1 = at(0.5, 5.2); px(d1[0], d1[1], HONEYD); } }
  }
  function drawHead() {   // 一张大熊脸：宽脑门、厚腮毛、短粗的口鼻、黑鼻头、小小的琥珀眼，嘴角挂着蜜
    headXf();
    part(); B.ell(E, 35, -51, 3.4, 3.2, 0, FURS, 3); B.px(E, 35, -51, FURS, 1);                                                    // 远耳
    part(); B.ell(E, 38, -41, 11, 9.5, 0.05, FUR); B.ell(E, 37, -47.5, 8, 4.8, 0, FUR); B.ell(E, 31, -39, 6.5, 9.5, 0.2, FUR);      // 脑袋、脑门、腮毛
    for (const [x, y] of [[27, -48], [25, -44], [24, -40], [25, -36], [28, -32]]) { B.ln(E, x + 3, y, x - 1.5, y + 1.5, FUR, 2); B.px(E, x - 1, y + 1, FUR, 6); }   // 腮后一圈毛
    B.ln(E, 38, -46.5, 45, -45.5, FUR, 3); B.ln(E, 32, -51.5, 41, -51, FUR, 8); B.ln(E, 33, -50.5, 38, -50.5, FUR, 7); B.ln(E, 33, -45, 35, -38, FUR, 3); B.px(E, 38, -49, FUR, 7);
    part(); B.poly(E, [[42, -36.5], [53, -36.5], [53, -35.5], [43, -34.5]], MOUTH);                                                   // 嘴里（张嘴时露出来）
    if (P.jaw) { B.poly(E, [[42, -36.5], [54, -36.5], [53, -33.5 + P.jaw * 1.5], [44, -33 + P.jaw]], MOUTH); B.px(E, 44, -34.5, MOUTH, 2); }
    part(); B.save(); B.rot(42, -35.5, P.jaw * 0.3); B.poly(E, [[40, -36.5], [52, -35.5], [53, -34], [49, -31.5], [41, -31.5]], MUZ); B.ln(E, 42, -32, 49, -32, MUZ, 3);   // 下巴（张合）
    if (P.jaw) { B.px(E, 51.5, -36, TOOTH, 7); B.px(E, 48.5, -36, TOOTH, 5); }
    const dl = P.jaw ? 1 : P.drip; B.strand(E, [[46, -32], [46.3, -30], [46, -29 + dl]], 1, 0.6, HONEY); B.px(E, 46, -28 + dl, HONEYD); B.restore();   // 下巴上挂的蜜
    if (P.tongue) { part(); B.strand(E, [[48, -35], [54, -34.5], [56, -32]], 1.5, 1, TONGUE); B.px(E, 54, -35, TONGUE, 4); }
    part(); B.cap(E, 45, -39, 53, -37.5, 5, 4, MUZ); B.ln(E, 45, -43, 52, -41.5, MUZ, 8); B.ln(E, 43, -36, 52, -36, MUZ, 3); B.px(E, 47, -38, MUZ, 3); B.px(E, 49, -38.5, MUZ, 3);   // 口鼻
    if (P.jaw) { B.px(E, 52, -36, TOOTH, 8); B.px(E, 52, -35, TOOTH, 6); B.px(E, 47, -36, TOOTH, 6); }                                // 上獠牙
    B.px(E, 43, -36, HONEY); B.px(E, 42, -36, HONEYHI); B.px(E, 43, -35, HONEYD);                                                   // 嘴角的蜜
    part(); B.ell(E, 54.5, -39, 2.6, 2.1, 0.1, NOSE); B.px(E, 53.5, -40.5, NOSE, 9); B.px(E, 56, -38, NOSE, 2);                      // 黑鼻头
    part(); B.ell(E, 31.5, -50, 4, 3.8, 0, FUR); B.ell(E, 32, -49.5, 2, 1.8, 0, FUR, 2); B.px(E, 30, -53, FUR, 8); B.px(E, 31, -53.5, FUR, 7);   // 近耳
    part();                                                                                                                         // 小小的琥珀色眼睛（深眼窝里）
    B.ln(E, 40, -45.5, 44, -45.5, FUR, 1); B.px(E, 40, -44, FUR, 1);
    if (P.eyes === 1) B.ln(E, 40, -44, 43, -43.5, FUR, 10);
    else { B.px(E, 41, -44, P.eyes === 2 ? EYE2 : EYE); B.px(E, 42, -44, EYE); B.px(E, 41, -43, EYE); B.px(E, 42, -43, FUR, 1); if (P.eyes === 2 || P.glow >= 2) { B.px(E, 43, -44, EYE); B.px(E, 41, -45, EYE2); } }
    B.reset();
  }
  function drawPool() {   // 摔裂的蜂巢淌出来的一滩蜜
    part(); B.reset(); const x = P.hvx + 2, r = P.pool;
    B.ell(E, x, -0.6, r, 1.5, 0, HONEY); B.ln(E, x - r * 0.5, -1, x + r * 0.3, -1, HONEYHI); B.px(E, x + r * 0.6, 0, HONEYD); B.px(E, x - r * 0.8, 0, HONEYD);
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    const hp = hivePos(), onBack = P.hv < 0.5;
    if (P.pool) drawPool();
    if (P.hv >= 2) drawHive(hp[0], hp[1], hp[2]);
    drawBees(hp, false);
    drawHind('fh', 1); drawArm('ff', 1);
    drawTail(); drawBody(); drawCrescent(); drawMoss();
    if (onBack) { drawHive(hp[0], hp[1], hp[2]); drawHoneyFlank(); }
    drawHind('nh', 0); drawHead();
    if (!onBack && P.hv < 2) drawHive(hp[0], hp[1], hp[2]);
    drawBees(hp, true);
    drawArm('nf', 0);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    if (P.glow || P.eyes === 2) {
      LIGHT[0].x = P.fx * z + spr.ox; LIGHT[0].y = P.fy * z + spr.oy; LIGHT[0].r = P.glow ? (3 + P.glow * 2) * z : 0;
      LIGHT[1].x = L.eye[0] * z + spr.ox; LIGHT[1].y = L.eye[1] * z + spr.oy; LIGHT[1].r = P.eyes === 2 ? 6 * z : 0; RIM.lights = LIGHT;
    } else RIM.lights = null;
    bake(spr, RIM);
  }
  // 立绘：半血暴躁那一刻（人立、两臂张开、巨掌亮爪、蜂群炸开），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 3 / 12, 0); P.glow = 2; P.rim = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(34, -45); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'paws'; poseAt(IDLE, 0.2, 0); P.eyes = 2; P.glow = 1; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(35, -45); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }   // 头像：待机侧脸、琥珀眼亮着

  // ───── 特效 ─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let dustT = 9, lastF = -1;
  const drops = (x, y, n, v, up) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * v, -up * (0.4 + Math.random() * 0.6), 0.7 + Math.random() * 0.4, HON, { g: 320, floor: HY, dragX: 0.5 }); };
  const bees = (x, y, n, v) => { for (let i = 0; i < n; i++) { const a = Math.random() * 6.2832, s = v * (0.5 + Math.random() * 0.5); spawnX(K_PHYS, x, y, Math.cos(a) * s, Math.sin(a) * s * 0.7, 0.8 + Math.random() * 0.6, BEE, { g: -10, dragX: 0.8, dragY: 0.8 }); } };
  const leaves = (n) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, sx(-40 + Math.random() * 90), sy(-90 - Math.random() * 16), (Math.random() - 0.5) * 20, 8, 1.4 + Math.random() * 0.6, FXI.nature, { g: 30, dragX: 0.4, floor: HY }); };
  function strikeFx() {   // 普攻：一掌拍在地上
    const p = pawC(L.nf), x = sx(p[0] + 6), y = sy(p[1]);
    fx.slash(sx(L.nf.r[0]), sy(L.nf.r[1]), 30, -0.2, 2.5, HON, 0.2, 3, 2);
    burst(x, y, 16, 40, 120, 0.2, 0.45, HON, 30); burst(x, HY - 1, 10, 30, 90, 0.3, 0.6, FXI.dust, 10); drops(x, y, 5, 80, 60);
    fx.crack(x, HY, 10, 1, FXI.earth, 0.7); fx.cross(x, y - 4, 6, HON, 0.16); hitDummy(1, 1); shake(0.15, 2); dustT = 0;
  }
  function slapFx(k) {   // 连环掌的三下
    const g = k === 1 ? L.ff : L.nf, p = pawC(g), x = sx(p[0] + 6), y = sy(p[1]);
    if (k < 2) {
      fx.slash(sx(g.r[0]), sy(g.r[1]), 34, -0.4, 1.9, HON, 0.18, 3, 2); fx.cross(x, y, 7, HON, 0.16);
      burst(x, y, 14, 40, 120, 0.2, 0.45, HON, 20); drops(x, y, 4, 90, 50); hitDummy(0, 1); shake(0.15, 2);
      sfx('swing', { kind: 'claw', w: 0.9 }); sfx('hit', { mat: 'flesh', w: 0.8 }); if (k === 1) sfx('boss', { k: 'hbHuff', w: 0.7 });
    } else {
      const cx = sx(40), cy = sy(-30);
      fx.slash(sx(24), sy(-24), 38, 1.8, -0.6, HON, 0.24, 3, 2); fx.slash(sx(20), sy(-20), 30, 1.9, -0.4, FXI.dust, 0.2, 2, 2);
      ring(cx, cy, 1, HON); burst(cx, cy, 30, 60, 170, 0.3, 0.7, HON, 40); burst(sx(34), HY - 1, 20, 30, 110, 0.4, 0.9, FXI.dust, 18); drops(cx, cy, 8, 140, 110);
      fx.crack(sx(34), HY, 16, 1, FXI.earth, 1.0); fx.crack(sx(34), HY, 10, -1, FXI.earth, 1.0); leaves(6);
      hitDummy(1, 1); shake(0.35, 3); flash(0.1); dustT = 0;
      sfx('swing', { kind: 'smash', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); sfx('impact', { pal: 'earth', w: 1 }); sfx('boss', { k: 'hbRoar', w: 0.6 });
    }
  }
  function roarFx() {   // 暴躁：两道光环、蜂群炸开、蜜沫喷出、树叶落下
    const m = L.mouth, x = sx(m[0]), y = sy(m[1]);
    ring(x, y, 1, HON); ring(sx(0), sy(-40), 0, HON);
    for (let i = 0; i < 16; i++) { const a = -0.5 + Math.random() * 0.9, v = 90 + Math.random() * 90; spawnX(K_PHYS, x, y, Math.cos(a) * v, Math.sin(a) * v - 30, 0.6 + Math.random() * 0.4, HON, { g: 260, floor: HY, dragX: 0.5 }); }
    const hp = hivePos(); bees(sx(hp[0]), sy(hp[1]), 22, 90); leaves(10);
    burst(x, y, 20, 50, 140, 0.3, 0.6, HON, 20); flash(0.12); shake(0.35, 3);
  }
  function onEnter(s) {
    if (s === CHARGE) {
      lastF = -1;
      if (MV === 'paws') { sfx('boss', { k: 'hbGrowl', w: 0.9 }); }
      else if (MV === 'honey') { sfx('boss', { k: 'hbHuff', w: 0.6 }); }
      else { sfx('boss', { k: 'hbGrowl', w: 1 }); sfx('boss', { k: 'growl', w: 0.6 }); }
    }
    if (s === CAST) {
      if (MV === 'paws') slapFx(0);
      else if (MV === 'honey') { const hp = hivePos(); bees(sx(hp[0]), sy(hp[1]), 12, 60); sfx('boss', { k: 'hbBuzz', w: 1 }); sfx('swing', { kind: 'blunt', w: 0.5 }); }
      else { roarFx(); sfx('boss', { k: 'hbRoar', w: 1 }); sfx('boss', { k: 'roar', w: 0.6 }); sfx('boss', { k: 'hbBuzz', w: 0.9 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.62) sfx('boss', { k: 'hbSlurp', w: 0.35 });
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'hbHuff', w: 0.6 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'claw', w: 1 }); sfx('hit', { mat: 'flesh', w: 0.9 }); sfx('boss', { k: 'slam', w: 0.45 }); }
    if (s === CHARGE && MV === 'paws' && t === 0.4) sfx('boss', { k: 'growl', w: 0.7 });
    if (s === CHARGE && MV === 'honey' && t === 0.2) { sfx('boss', { k: 'hbHuff', w: 0.4 }); sfx('hit', { mat: 'wood', w: 0.35 }); }
    if (s === CAST && MV === 'paws' && t === 0.3) slapFx(1);
    if (s === CAST && MV === 'paws' && t === 0.6) slapFx(2);
    if (s === CAST && MV === 'honey' && t === 0.25) { sfx('hit', { mat: 'wood', w: 0.5 }); sfx('fall', { w: 0.5 }); burst(sx(10), HY - 1, 14, 20, 70, 0.3, 0.6, FXI.dust, 8); }
    if (s === CAST && MV === 'honey' && (t === 0.5 || t === 0.67 || t === 1.33)) { sfx('boss', { k: 'hbMunch', w: 0.8 }); const m = L.mouth; drops(sx(m[0]), sy(m[1]), 3, 40, 10); }
    if (s === CAST && MV === 'honey' && t === 1.0) sfx('boss', { k: 'hbSlurp', w: 0.8 });
    if (s === RECOVER && MV === 'honey' && t === 0.08) sfx('boss', { k: 'hbSlurp', w: 0.6 });
    if (s === RECOVER && MV === 'honey' && t === 0.58) { sfx('hit', { mat: 'wood', w: 0.4 }); sfx('boss', { k: 'hbHuff', w: 0.4 }); }
    if (s === RECOVER && MV === 'roar' && t === 0.25) {
      for (const g of [L.nf, L.ff]) { const p = pawC(g); burst(sx(p[0]), HY - 1, 14, 30, 110, 0.3, 0.7, FXI.dust, 14); fx.crack(sx(p[0]), HY, 10, 1, FXI.earth, 0.8); }
      ring(sx(34), HY - 2, 0, FXI.dust); shake(0.3, 3); dustT = 0; sfx('boss', { k: 'slam', w: 1 }); sfx('fall', { w: 0.8 });
    }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'hbHuff', w: 0.8 });
    if (s === DEATH && t === INCOMING) sfx('boss', { k: 'hbDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.75) { burst(sx(34), HY - 1, 12, 20, 70, 0.3, 0.6, FXI.dust, 10); shake(0.15, 2); sfx('boss', { k: 'thud', w: 0.7 }); }
    if (s === DEATH && t === INCOMING + 1.2) {
      for (let i = 0; i < 28; i++) spawn(K_DUST, sx(-44 + Math.random() * 90), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust);
      shake(0.2, 2); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 });
    }
    if (s === DEATH && t === INCOMING + 1.25) { const x = sx(-40), y = HY - 8; drops(x, y, 10, 120, 70); bees(x, y - 6, 18, 110); burst(x, y, 16, 30, 100, 0.3, 0.6, HON, 20); sfx('hit', { mat: 'wood', w: 0.8 }); sfx('boss', { k: 'hbBuzz', w: 0.8 }); }
    if (s === DEATH && t === INCOMING + 1.95) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-44 + Math.random() * 90), HY - 4 - Math.random() * 26, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, HON); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[1.62], [], [0.08, T_STRIKE], [0.2, 0.4], [0.25, 0.3, 0.5, 0.6, 0.67, 1.0, 1.33], [0.08, 0.25, 0.58], [INCOMING],
    [INCOMING, INCOMING + 0.75, INCOMING + 1.2, INCOMING + 1.25, INCOMING + 1.95], []];
  function stepFX(dt, state, stT) {
    dustT += dt;
    if (state === MOVE) {   // 熊步落地：近后 0、远前 2、远后 4、近前 6
      const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f; const k = { 0: 'nh', 2: 'ff', 4: 'fh', 6: 'nf' }[f];
        if (k) { const x = sx(L[k].h[0] + (k[1] === 'f' ? 4 : 2)); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 20 + (P.flip ? 10 : -10), -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); sfx('step', { w: k[1] === 'f' ? 0.9 : 0.6 }); } }
    }
    if (state === CHARGE && Math.random() < 0.45) {   // 蓄力：金色的蜜光从四周汇向发光体
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, HON, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CAST && MV === 'honey' && stT > 0.25) {   // 大嚼：蜜往下滴，金色的光点往上飘（回血）
      if (Math.random() < 0.25) { const m = L.mouth; drops(sx(m[0]), sy(m[1]), 1, 20, 5); }
      if (Math.random() < 0.3) spawn(K_RISE, sx(-24 + Math.random() * 60), sy(-10 - Math.random() * 50), 0, -16 - Math.random() * 14, 0.7 + Math.random() * 0.4, HON);
    }
    if (state === IDLE && Math.random() < 0.04) { const hp = hivePos(); spawnX(K_PHYS, sx(hp[0] + 3.5), sy(hp[1] + 8), 0, 0, 0.9, HON, { g: 200, floor: HY }); }   // 蜜一滴滴落下
    if (dustT < 0.8 && Math.random() < 0.3) spawn(K_EMBER, sx(20 + Math.random() * 40), HY - 1, (Math.random() - 0.5) * 10, -8 - Math.random() * 8, 0.4, FXI.dust);
  }
  function fxReset() { dustT = 9; lastF = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -10; dx <= 10; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, HR[Math.abs(dx) < 5 ? 2 : 3]); }   // 地面映出的蜜光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'paws'; return MVDUR[MV]; }

  const VOICES = {
    hbGrowl: (s, t, w, p) => { s.tone(t, 'sawtooth', 92, 0.75, 0.05 + 0.03 * w, { to: 68, vib: [11, 60, 0.1], lp: 520, pan: p }); s.tone(t, 'square', 46, 0.7, 0.03 * w, { to: 38, lp: 300, pan: p }); s.rumble(t, 0.7, 0.1 * w, { f: 140, pan: p }); },
    hbRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 170, 1.1, 0.06 + 0.03 * w, { to: 105, vib: [8, 90, 0.12], lp: 1400, pan: p, rev: 0.45 }); s.tone(t + 0.03, 'sawtooth', 255, 0.9, 0.035 * w, { to: 150, vib: [9, 70, 0.1], lp: 1800, pan: p });
      s.nz(t, 1.0, 'bandpass', 700, 1.2, 0.06 * w, { to: 380, pan: p }); s.rumble(t, 1.1, 0.14 * w, { f: 150, pan: p }); },
    hbHuff: (s, t, w, p) => { s.nz(t, 0.22, 'lowpass', 800, 0.7, 0.08 * w, { a: 0.02, to: 300, pan: p }); s.thud(t, 110, 70, 0.12, 0.08 * w, { pan: p }); },
    hbBuzz: (s, t, w, p) => { for (let i = 0; i < 4; i++) { const f = s.rnd(190, 270); s.tone(t + i * 0.05, 'sawtooth', f, 0.7, 0.012 + 0.008 * w, { to: f * s.rnd(0.9, 1.15), vib: [s.rnd(28, 40), 40, 0.02], lp: 2200, pan: p }); } },
    hbMunch: (s, t, w, p) => { for (let i = 0; i < 2; i++) { s.nz(t + i * 0.12, 0.07, 'bandpass', s.rnd(700, 1100), 1.5, 0.06 * w, { pan: p }); s.thud(t + i * 0.12, 150, 90, 0.06, 0.06 * w, { pan: p }); } },
    hbSlurp: (s, t, w, p) => { s.tone(t, 'sine', 320, 0.22, 0.05 * w, { to: 900, pan: p }); s.nz(t, 0.2, 'bandpass', 1400, 2, 0.04 * w, { to: 2600, pan: p }); },
    hbDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 150, 1.4, 0.05 + 0.02 * w, { to: 55, vib: [6, 80, 0.2], lp: 900, pan: p, rev: 0.5 }); s.nz(t + 0.2, 1.0, 'lowpass', 500, 0.7, 0.05 * w, { a: 0.2, pan: p }); },
  };

  return {
    name: '巨掌', HX, R_EL: HON, DUR, hero, P, GLOW_MATS: [HONEY, HONEYD, HONEYHI, EYE, EYE2, BEEY, WING], HIT_POINT: [6, -36], EVENTS, MAX_H: 82, OWN_MAX: 56, SHEET_K: 3, VOICES,
    SFX: { body: 'beast', how: 'topple', pal: 'nature', style: 'claw', w: 1 },
    MOVES: ['paws', 'honey', 'roar'], MOVE_NAMES: { paws: '连环掌', honey: '偷蜜', roar: '暴躁（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 0.7, 1.45, 1.7, 1.9]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.17, 0.33, 0.58, 0.67], 'paws'], [CAST, [0, 1 / 12, 3 / 12, 0.3, 0.3 + 2 / 12, 0.5, 0.6, 0.75], 'paws'], [RECOVER, [0.17, 0.42], 'paws'],
      [CHARGE, [0.08, 0.25, 0.42], 'honey'], [CAST, [0.08, 0.25, 0.5, 0.92, 1.08, 1.4], 'honey'], [RECOVER, [0.17, 0.5, 0.75], 'honey'],
      [CHARGE, [0, 0.25, 0.42], 'roar'], [CAST, [0, 2 / 12, 0.42], 'roar'], [RECOVER, [0.17, 0.25, 0.5], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.8, 1.1, 1.3, 1.5, 1.7, 2.3, 2.6]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
