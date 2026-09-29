// 屠夫（小首领，深夜医院 · 手术室）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js / B_OgreEnemy.js。
// 依据：附录 G2「戴面具抡斧的巨汉」；被动 复生（第一次倒下爬起来、回 30% 生命）；招式 hook 钩子（朝最远的甩钩，钩中路上第一个拉到身前）、
//       chop 剁肉（对刚钩来的伤害 ×2）；半血没有怒吼，「复生」就是它的 roar。
// 设定卡 ——
//   剪影：一个又胖又驼的屠夫：桶一样前凸的大肚子、驼起的肥肩、短粗的腿；头上套着一只尖顶的粗麻布袋，袋尖往后耷拉。
//         近手倒提一把比胳膊还宽的锈剁肉刀（方刀身、刀背上一个挂孔、刀口一道亮线），远手拎着一条铁链、链头一只大肉钩。身体约 66 格高。
//   脸（识别点）：麻袋上剪出来的两个歪歪扭扭的眼洞，里面透出红光；嘴是用粗线缝死的一道口子（怒吼时崩开，露出黄牙）；
//         头顶一条粗缝线，脖子上一根草绳扎口。
//   身上：病态的灰绿皮肤，肩上一圈缝线（像是胳膊是缝上去的）、背上一道缝过的长疤；血污的脏白围裙从胸口盖到膝盖（手印、滴痕）；
//         黑胶皮长手套和胶靴；腰后皮带上挂两只小肉钩、一段铁链。
//   主色：灰绿皮 + 脏白围裙 + 血红 + 铁锈；光：眼洞的红光、红色轮廓光、剁刀蓄力时刀口的血光、磨刀迸出的铁锈火星。
//   招式（setMove）：
//     hook 钩子：远手把铁链举过头顶甩圈（钩子呼呼转，越转越快）→ 往前一甩，链子笔直地飞出去 → 身体后仰两手一拽，把链子收回来。
//     chop 剁肉：远手往前按住、近手把剁刀高高举到脑后（刀口慢慢亮成血红、往下滴血、全身在抖）→ 一刀剁进地里（血溅、肉块、地裂）
//                → 把刀从地里拔出来扛上肩 → 放下。
//     roar 复生：一软跪倒、头垂下、眼洞熄灭 → 两声心跳，身上的缝线一道道亮成红色、眼洞重新亮起 → 拄着剁刀站起来
//                → 两手张开仰头，缝死的嘴崩开咆哮（两道血环）。游戏从 cast 开始播，cast + recover 约 1.35 秒。
//   待机：两档呼吸、肚子一起一伏、袋尖和链钩轻轻晃；个性动作是把远手的铁链提到胸前、用剁刀在链子上来回磨三下（迸火星）。
//   移动：沉重的摇摆步，12 帧一圈，肚子跟着颤、围裙摆动、腰上的钩子叮当响。
//   死亡：挨打晃了晃 → 剁刀脱手插在身前的地上 → 跪倒 → 往前扑倒（肚子砸地、血溅开）→ 眼洞熄灭，化成暗红的光点。
PCD.define('B_ChaosButcher', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, PI = Math.PI;

  // ───── 材质（11 级，暗 → 亮）：皮、围裙都压暗、压饱和，眼洞的红光和刀口才亮得出来 ─────
  const R_SKIN = ['#0a0b0b', '#161919', '#232727', '#313634', '#404541', '#50554f', '#61655d', '#73766b', '#85877a', '#989989', '#abab99'];   // 病态的灰绿皮
  const R_APR = ['#0e0c09', '#1e1a15', '#2f2921', '#41392e', '#544a3c', '#675c4b', '#7a6e5b', '#8d816c', '#9f937d', '#b0a58e', '#c1b79f'];    // 脏白围裙（发黄）
  const R_HOOD = ['#0c0806', '#1a120c', '#281c12', '#372718', '#46321e', '#553d25', '#65492d', '#745536', '#836240', '#926f4b', '#a07c57'];   // 粗麻布头套
  const R_PANTS = ['#060605', '#0e0d0c', '#171513', '#201d1a', '#2a2622', '#35302b', '#403a34', '#4b443d', '#574f47', '#635a51', '#6f655b'];  // 脏裤子
  const R_RUB = ['#040404', '#09080a', '#0f0e10', '#161417', '#1e1b1f', '#262328', '#302c32', '#3a353c', '#454047', '#514b53', '#5d575f'];     // 黑胶皮手套、胶靴
  const R_BLADE = ['#060708', '#0e1012', '#171a1d', '#212529', '#2c3136', '#383e44', '#454c53', '#535b62', '#626a72', '#737b82', '#858d93'];  // 剁刀的铁
  const SKIN = defDeep(R_SKIN, { depth: 9, amb: 0.12 }), SKINL = defDeep(R_SKIN, { depth: 6, amb: 0.12 }), SKIND = defDeep(R_SKIN, { depth: 6, dark: 3, amb: 0.08 });
  const APRON = defDeep(R_APR, { depth: 7, dark: 1, amb: 0.14 }), BLOODM = defDeep('hellhide', { depth: 2, dark: 3, amb: 0.25 });
  const HOOD = defDeep(R_HOOD, { depth: 7, amb: 0.2 }), HOODD = defDeep(R_HOOD, { depth: 4, dark: 2, amb: 0.14 });
  const PANTS = defDeep(R_PANTS, { depth: 5, amb: 0.12 }), PANTSD = defDeep(R_PANTS, { depth: 4, dark: 2, amb: 0.08 });
  const RUB = defDeep(R_RUB, { depth: 4, amb: 0.2 }), RUBD = defDeep(R_RUB, { depth: 3, dark: 2, amb: 0.14 });
  const BLADE = defDeep(R_BLADE, { depth: 3, amb: 0.22 }), RUST = defDeep('hide', { depth: 1, amb: 0.3 }), EDGE = defDeep('bladesteel', { depth: 1, amb: 0.3 });
  const WOOD = defDeep('hide', { depth: 2, dark: 2, amb: 0.14 }), BELT = defDeep('hide', { depth: 3, dark: 3, amb: 0.1 }), ROPE = defDeep('ivory', { depth: 1, dark: 3, amb: 0.2 });
  const CHAIN = defDeep(R_BLADE, { depth: 1, amb: 0.35 }), CHAIND = defDeep(R_BLADE, { depth: 1, dark: 2, amb: 0.2 }), HOOKM = defDeep(R_BLADE, { depth: 2, amb: 0.3 });
  const TEETH = defDeep('ivory', { depth: 1, dark: 1, amb: 0.3 }), BRASS = defDeep('brass', { depth: 1, dark: 2, amb: 0.2 });
  const BLD = FXI.blood, CR = FXR[BLD];                                                                                 // 血：白 → 粉红 → 血红 → 暗红
  const RUSTFX = fxRamp('bchRust', ['#ffffff', '#ffd08a', '#e07a30', '#8a3a14', '#3a1608']), RR = FXR[RUSTFX];        // 磨刀的铁锈火星
  const EYE = defMat([CR[4], CR[3], CR[2], CR[2]], 1, 1), EYEC = defMat([CR[3], CR[1], CR[1], CR[1]], 1, 1), SEAM = defMat([CR[4], CR[2], CR[2], CR[1]], 1, 1);
  const MOUTH = defMat([0, CR[4], CR[4], CR[4]], 1, 1), EDGEG = defMat([CR[3], CR[1], CR[1], CR[0]], 1, 1), SPARK = defMat([RR[0], RR[0], RR[0], RR[0]], 1, 1);
  const hero = new Sprite(176, 124, 80, 114);
  const DUR = [3.0, 1.0, 0.8, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { hook: { 3: 1.0, 4: 0.35, 5: 0.75 }, chop: { 3: 0.8, 4: 0.4, 5: 0.7 }, roar: { 3: 0.6, 4: 0.75, 5: 0.6 } };
  let MV = 'hook';
  const HX = 70;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [CR[1], CR[2], CR[3]], k: 0.55 }, { x: 0, y: 0, r: 0, ramp: [CR[1], CR[2], CR[3]], k: 0.5 }];
  const RIM_R = [0, 12, 18, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: CR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of [EYE, EYEC, SEAM, MOUTH, EDGEG, SPARK]) RIM.skip[m] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  // 上身绕胯（HIP）前倾 P.lean；头绕脖子 P.hd。脚踝是绝对坐标，手是上身坐标（剁刀插在地上时手由刀柄算）。
  const HIP = [0, -22], NECK = [7, -50], LN = [5, -23], LF = [-7, -23], SHN = [11, -46], SHF = [-12, -47];
  const D0 = { bx: 0, by: 0, lean: 0, hd: 0, jaw: 0, tip: 0, bel: 0, ca: PI / 2 - 0.25, sk: 0, hsw: 0, ka: 0, kl: 0,
    fn: [10, -3], ff: [-10, -3], hn: [21, -27], hf: [-16, -26], cc: [34, -25], cm: 0, km: 0, hold: 0, cb: 0, ebn: 1, ebf: 1 };
  const K = {
    idle: {},
    hone: { hn: [3, -37], ca: -0.1, hf: [10, -45], hd: 0.14, ebf: 1, lean: 0.04 },                                                   // 待机：提起链子磨刀
    walk: { lean: 0.07, hd: 0.04 },
    aWind: { lean: -0.13, by: 1, hd: -0.12, jaw: 1, hn: [7, -62], ca: -PI / 2 - 0.95, cb: 1, fn: [13, -3], hf: [-18, -31] },            // 普攻：剁刀抡到肩后
    aStrike: { lean: 0.26, bx: 4, by: 3, hd: 0.14, jaw: 1, hn: [31, -36], ca: 0.3, fn: [16, -3], ff: [-8, -3], hf: [-14, -30] },
    aFollow: { lean: 0.3, bx: 4, by: 4, hd: 0.16, hn: [27, -24], ca: 1.05, fn: [16, -3], ff: [-8, -3], hf: [-14, -29] },
    kSpin: { hf: [-3, -69], km: 1, ebf: -1, lean: -0.1, hd: -0.1, hn: [19, -29], ca: PI / 2 - 0.1, fn: [13, -3], ff: [-11, -3] },     // 钩子：举过头顶甩圈
    kThrow: { hf: [30, -44], km: 2, kl: 34, ka: -0.04, ebf: 1, lean: 0.24, bx: 3, by: 2, hd: 0.12, jaw: 1, hn: [4, -30], ca: PI / 2 + 0.35, fn: [16, -3], ff: [-10, -3] },
    kYank: { hf: [-14, -37], km: 2, kl: 50, ka: -0.12, ebf: 1, lean: -0.2, bx: -3, by: 1, hd: -0.14, jaw: 1, hn: [12, -32], ca: PI / 2 + 0.2, fn: [11, -3], ff: [-13, -3] },
    cRaise: { hn: [2, -67], ca: -PI / 2 - 0.9, cb: 1, hf: [25, -35], ebf: 1, lean: -0.17, by: 1, hd: -0.12, jaw: 1, fn: [14, -3], ff: [-12, -3] },   // 剁肉：高举到脑后
    cChop: { hn: [33, -30], ca: 0.5, hf: [22, -27], lean: 0.42, bx: 4, by: 6, hd: 0.2, jaw: 2, fn: [17, -3], ff: [-10, -3] },
    cPull: { hn: [28, -40], ca: 0.1, hf: [18, -30], lean: 0.25, bx: 3, by: 4, hd: 0.1, fn: [16, -3], ff: [-10, -3] },
    cShould: { hn: [15, -52], ca: -PI / 2 - 0.75, cb: 1, lean: -0.04, hd: -0.06, hf: [-15, -28] },                                     // 扛在肩上
    rSlump: { cm: 1, hold: 1, cc: [27, -27], ca: PI / 2 + 0.12, by: 10, lean: 0.36, hd: 0.5, hf: [-2, -10], ebf: 1, fn: [13, -3], ff: [-17, -2], tip: 2 },   // 复生：跪着、头垂
    rRise: { cm: 1, hold: 1, cc: [27, -27], ca: PI / 2 + 0.12, by: 3, lean: 0.16, hd: 0.1, hf: [-12, -24], fn: [12, -3], ff: [-12, -3] },
    rRoar: { hn: [17, -67], ca: -PI / 2 + 0.35, hf: [-23, -58], ebf: -1, lean: -0.18, by: 1, hd: -0.38, jaw: 2, tip: -2, fn: [14, -3], ff: [-13, -3] },
    hurt: { lean: -0.2, bx: -3, hd: -0.26, jaw: 1, hn: [16, -31], ca: PI / 2 + 0.3, hf: [-19, -30], tip: -2, hsw: -3 },
    dStag: { lean: -0.12, bx: -2, hd: 0.25, jaw: 1, hn: [22, -30], ca: PI / 2, hf: [-15, -25], hsw: 2 },
    dKneel: { cm: 1, hold: 0, cc: [36, -25], ca: PI / 2 - 0.22, by: 10, lean: 0.3, hd: 0.4, hn: [18, -24], hf: [-6, -14], fn: [14, -3], ff: [-17, -2], tip: 2 },
    dFall: { cm: 1, hold: 0, cc: [36, -25], ca: PI / 2 - 0.22, by: 13, lean: 1.3, hd: 0.2, hn: [30, -34], hf: [22, -44], fn: [10, -2], ff: [-16, -2], tip: 3, bel: 1 },
  };
  const NUM = ['bx', 'by', 'lean', 'hd', 'jaw', 'tip', 'bel', 'ca', 'sk', 'hsw', 'ka', 'kl'], VEC = ['fn', 'ff', 'hn', 'hf', 'cc'], DIS = ['cm', 'km', 'hold', 'cb', 'ebn', 'ebf'];

  const P = {};
  const FIELDS = ['st', ...NUM, 'fnx', 'fny', 'ffx', 'ffy', 'hnx', 'hny', 'hfx', 'hfy', 'ccx', 'ccy', ...DIS, 'eyes', 'glow', 'rim', 'flash', 'dq', 'seam', 'hone', 'spk'];
  function base() { P.st = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.seam = 0; P.hone = 0; P.spk = 0; P.mx = 0; P.flip = 0; setK(K.idle, K.idle, 0); }
  const val = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of NUM) { const va = val(a, f); P[f] = va + (val(b, f) - va) * q; }
    for (const f of VEC) { const va = val(a, f), vb = val(b, f); P[f + 'x'] = va[0] + (vb[0] - va[0]) * q; P[f + 'y'] = va[1] + (vb[1] - va[1]) * q; }
    for (const f of DIS) P[f] = q < 0.5 ? val(a, f) : val(b, f);
  }
  // 沉重的摇摆步：12 帧一圈（1 秒）。脚：支撑 7 帧往后滑，摆动 5 帧抬起；近脚、远脚差半圈
  const foot = (p) => { p = ((p % 1) + 1) % 1; if (p < 0.58) return [6 - 12 * p / 0.58, 0]; const q = (p - 0.58) / 0.42; return [-6 + 12 * q, Math.round(5 * Math.sin(PI * q))]; };
  const W_BY = [2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1], W_BEL = [0, 1, 1, 0, -1, 0, 0, 1, 1, 0, -1, 0], W_SW = [3, 2, 1, -1, -2, -3, -3, -2, -1, 1, 2, 3];
  function walk(f) {
    f = ((f % 12) + 12) % 12; setK(K.walk, K.walk, 0);
    const a = foot(f / 12), b = foot(f / 12 + 0.5); P.fnx = 9 + a[0]; P.fny = -3 - a[1]; P.ffx = -9 + b[0]; P.ffy = -3 - b[1];
    P.by = W_BY[f]; P.bel = W_BEL[f]; P.lean = 0.07 + (f % 6 < 2 ? 0.02 : 0); P.hd = 0.04 - (f % 6 < 2 ? 0.04 : 0); P.tip = W_BEL[(f + 2) % 12];
    const sw = W_SW[f]; P.hnx += sw; P.hfx -= sw; P.hsw = -sw * 0.7; P.sk = -a[0] * 0.25; P.ca += sw * 0.03;
  }
  const trem = (f12, a) => { const s = f12 & 1 ? 1 : -1; P.bx += s * a * 0.5; P.hny += s * a * 0.5; P.hfy -= s * a * 0.5; };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.bel = b; P.tip = [0, 1, 2, 1, 0, -1][Math.floor(tt / 0.4) % 6] * 0.7; P.hsw = [0, 1, 1, 0, -1, -1][Math.floor(tt / 0.3) % 6];
      const lp = tt % DUR[IDLE];
      if (lp >= 1.1 && lp < 2.4) {                                                                                  // 待机个性：链子提到胸前、在上面磨刀三下
        const k = lp - 1.1, q = k < 0.25 ? ease.out(k / 0.25) : k > 1.05 ? 1 - ease.in((k - 1.05) / 0.25) : 1; setK(K.idle, K.hone, q); P.by += b; P.hsw = 0; if (q > 0.5) P.hone = 0.5;
        if (k >= 0.25 && k < 1.05) { const s = Math.floor((k - 0.25) * 12) % 4; P.hnx += [0, 3, 6, 8][s]; P.hny += [0, 0.5, 1, 1][s]; P.hone = 1; P.spk = s === 1 || s === 2 ? 1 : 0; P.eyes = 1; }
      }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 16, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < 0.25) { const q = ease.out(tq / 0.25); setK(K.idle, K.aWind, q); P.glow = 1; P.eyes = 2; }
      else if (tq < T_STRIKE) { setK(K.aWind, K.aWind, 0); P.glow = 2; P.rim = 1; P.eyes = 2; P.hny -= 1; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.aStrike, K.aStrike, 0); P.glow = 3; P.rim = 2; P.eyes = 2; P.jaw = 2; }
      else if (tq < 0.5) { const q = ease.out((tq - T_STRIKE - 1 / 12) / (0.5 - T_STRIKE - 1 / 12)); setK(K.aStrike, K.aFollow, q); P.glow = 2; P.rim = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.25)); setK(K.aFollow, K.idle, q); P.glow = q < 0.4 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; P.hsw = 2; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); setK(K.hurt, K.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.jaw = Math.round(P.jaw); P.tip = Math.round(P.tip); P.hsw = Math.round(P.hsw); P.bel = Math.round(P.bel); geo(); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { hook: 0, chop: 1, roar: 2 };
  const T_STRIKE = 4 / 12;
  const seg = (tq, t0, t1, e) => (e || ease.inOut)(clamp01((tq - t0) / (t1 - t0)));
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'hook') {
      if (st === CHARGE) {                                                                                           // 举过头顶甩圈，越转越快
        setK(K.idle, K.kSpin, seg(tq, 0, 0.22, ease.out)); const n = Math.floor(tq * 12);
        P.ka = n * (tq < 0.5 ? 1.25 : 1.9); if (tq < 0.22) P.km = 0;
        P.bx += Math.round(Math.sin(P.ka)); P.glow = tq < 0.3 ? 1 : 2; P.rim = tq > 0.5 ? 2 : 1; P.eyes = 2; if (tq > 0.6) P.jaw = 1;
      } else if (st === CAST) {                                                                                      // 甩出去：链子笔直飞出
        setK(K.kThrow, K.kThrow, 0); P.kl = Math.min(74, 34 + Math.floor(tq * 12) * 18); P.glow = tq < 2 / 12 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2;
      } else {                                                                                                       // 往回拽，钩子收回来
        if (tq < 0.12) setK(K.kThrow, K.kYank, seg(tq, 0, 0.12, ease.out));
        else if (tq < 0.4) { setK(K.kYank, K.kYank, 0); P.kl = Math.round(50 - 42 * seg(tq, 0.12, 0.4, ease.in)); if (tq < 0.3) trem(f12, 1.5); }
        else { setK(K.kYank, K.idle, seg(tq, 0.4, 0.7)); if (tq < 0.5) { P.km = 0; P.hsw = 4; } }
        P.glow = tq < 0.3 ? 1 : 0; P.eyes = tq < 0.3 ? 2 : 0;
      }
    } else if (MV === 'chop') {
      if (st === CHARGE) {
        setK(K.idle, K.cRaise, seg(tq, 0, 0.3, ease.out));
        if (tq > 0.3) { trem(f12, 1.4); P.jaw = sh ? 1 : 0; }
        P.glow = tq < 0.3 ? 1 : 2 + (tq > 0.55 ? sh : 0); P.rim = tq > 0.3 ? 2 : 1; P.eyes = 2;
      } else if (st === CAST) { setK(K.cChop, K.cChop, 0); if (tq < 2 / 12) P.by += sh; P.glow = tq < 0.2 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; }
      else {
        if (tq < 0.15) setK(K.cChop, K.cPull, seg(tq, 0, 0.15, ease.out));
        else if (tq < 0.4) setK(K.cPull, K.cShould, seg(tq, 0.15, 0.4));
        else if (tq < 0.5) setK(K.cShould, K.cShould, 0);
        else setK(K.cShould, K.idle, seg(tq, 0.5, 0.68));
        P.glow = tq < 0.2 ? 1 : 0;
      }
    } else {   // roar：复生
      if (st === CHARGE) { setK(K.rSlump, K.rSlump, 0); P.eyes = 3; }
      else if (st === CAST) {
        if (tq < 2 / 12) { setK(K.idle, K.rSlump, seg(tq, 0, 2 / 12, ease.in)); P.eyes = 1; }
        else if (tq < 0.5) {
          setK(K.rSlump, K.rSlump, 0); P.eyes = tq < 0.42 ? 3 : 2;
          const b1 = tq >= 0.25 && tq < 0.34, b2 = tq >= 0.42 && tq < 0.5;                                           // 两声心跳：身子一抽、缝线亮起来
          if (b1 || b2) { P.by -= 2; P.lean -= 0.06; P.hd -= 0.12; P.seam = b2 ? 2 : 1; P.glow = 2; P.rim = b2 ? 2 : 1; } else if (tq >= 0.34) P.seam = 1;
        } else { setK(K.rSlump, K.rRise, seg(tq, 0.5, 0.75, ease.out)); P.eyes = 2; P.seam = 2; P.glow = 2; P.rim = 2; }
      } else {
        if (tq < 0.1) setK(K.rRise, K.rRoar, seg(tq, 0, 0.1, ease.out));
        else if (tq < 0.42) { setK(K.rRoar, K.rRoar, 0); trem(f12, 1.2); }
        else setK(K.rRoar, K.idle, seg(tq, 0.42, 0.6));
        P.eyes = tq < 0.45 ? 2 : 0; P.seam = tq < 0.42 ? 2 : tq < 0.52 ? 1 : 0; P.glow = tq < 0.42 ? 3 : 0; P.rim = tq < 0.1 ? 3 : tq < 0.42 ? 2 : 0;
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; return; }
    if (d < 0.6) { setK(K.hurt, K.dStag, seg(d, 0.3, 0.5, ease.out)); P.eyes = 1; return; }                           // 晃了晃
    if (d < 1.0) { setK(K.dStag, K.dKneel, seg(d, 0.6, 0.9, ease.in)); P.eyes = 1; return; }                        // 刀脱手、跪倒
    setK(K.dKneel, K.dFall, seg(d, 1.0, 1.35, ease.in)); P.eyes = d < 1.2 ? 1 : 3;                                   // 往前扑倒
    if (d > 1.35 && d < 1.5) P.by += 1;
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(HIP[0], HIP[1], P.lean); }
  function headXf() { bodyXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function limb(r, tgt, l1, l2, bend) { const kn = B.ik(r, tgt, l1, l2, bend), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; return [kn, [kn[0] + (tgt[0] - kn[0]) / dd * Math.min(dd, l2), kn[1] + (tgt[1] - kn[1]) / dd * Math.min(dd, l2)]]; }
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  function geo() {
    bodyXf();
    const rn = B.at(LN[0], LN[1]), rf = B.at(LF[0], LF[1]); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.belly = B.at(10, -31);
    L.belt = [B.at(-12, -25), B.at(-3, -24)];
    let hnT = B.at(P.hnx, P.hny); const hfT = B.at(P.hfx, P.hfy);
    headXf(); L.head = B.at(9, -58); L.eye = B.at(13, -59); B.reset();
    [L.kn, L.an] = limb(rn, [P.fnx, P.fny], 11, 10.5, -1); [L.kf, L.af] = limb(rf, [P.ffx, P.ffy], 11, 10.5, -1); L.rn = rn; L.rf = rf;
    let a;
    if (P.cm === 1) { a = P.ca; if (P.hold) hnT = [P.ccx, P.ccy]; } else a = P.ca + P.lean;
    [L.en, L.hn] = limb(L.shN, hnT, 12, 11.5, P.ebn);
    L.cg = P.cm === 1 ? [P.ccx, P.ccy] : L.hn; L.cd = [Math.cos(a), Math.sin(a)];
    L.cmid = [L.cg[0] + L.cd[0] * 14 - L.cd[1] * 4, L.cg[1] + L.cd[1] * 14 + L.cd[0] * 4];                                  // 刀身中间（蓄力的光点）
    [L.ef, L.hf] = limb(L.shF, hfT, 12, 11.5, P.ebf);
    // 铁链 + 肉钩：0 挂在远手下面，1 举过头顶甩圈，2 甩出去 / 拽回来（笔直）
    const h = L.hf;
    if (P.km === 1) { const e = [h[0] + Math.cos(P.ka) * 18, h[1] + Math.sin(P.ka) * 6 - 1]; L.chain = [h, e]; L.hk = e; L.hkA = Math.atan2(e[1] - h[1], e[0] - h[0]) - PI / 2; }
    else if (P.km === 2) { const e = [h[0] + Math.cos(P.ka) * P.kl, h[1] + Math.sin(P.ka) * P.kl]; L.chain = [h, e]; L.hk = e; L.hkA = P.ka - PI / 2; }
    else { const e = [h[0] + P.hsw, h[1] + 11]; L.chain = B.bez(h, [h[0] + P.hsw * 0.2, h[1] + 6], e, 6); L.hk = e; L.hkA = -P.hsw * 0.08; }
  }
  // 蓄力汇聚点：剁肉 / 普攻是刀身，钩子是远手的链钩，复生是胸口
  function focus() {
    const f = MV === 'hook' && (P.st === CHARGE || P.st === CAST) ? L.hk : MV === 'roar' && P.st >= CHARGE && P.st <= RECOVER ? L.belly : L.cmid;
    P.fx = f[0]; P.fy = f[1]; P.gx = f[0]; P.gy = f[1];
  }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);

  function drawLeg(k, far) {
    const r = L['r' + k], kn = L['k' + k], an = L['a' + k], m = far ? PANTSD : PANTS, bm = far ? RUBD : RUB;
    part(); capW(r[0], r[1], kn[0], kn[1], 6.4, 4.8, m); dot(kn[0], kn[1], 4.5, m);
    if (!far) { const c = lerp(r, kn, 0.55); lnW(c[0] - 3, c[1] - 1, c[0] + 1, c[1] + 2, m, 3); px(kn[0] + 2, kn[1] - 1, m, 7); }         // 裤子的褶
    part(); capW(kn[0], kn[1], an[0], an[1], 4.4, 3.7, m);
    // 胶靴：靴筒到小腿一半，圆头
    const top = lerp(an, kn, 0.55), ax = Math.round(an[0]), ay = Math.round(an[1]);
    part(); capW(an[0], an[1], top[0], top[1], 4.1, 4.7, bm); polyW([[ax - 5, ay - 2], [ax + 4, ay - 2], [ax + 7, ay - 1], [ax + 8, ay + 1], [ax + 8, ay + 3], [ax - 5, ay + 3]], bm);
    lnW(ax - 5, ay + 3, ax + 8, ay + 3, bm, far ? 1 : 2); lnW(top[0] - 4, top[1], top[0] + 4, top[1], bm, far ? 5 : 8); px(ax + 6, ay, bm, far ? 5 : 8);
    if (!far) { px(ax + 3, ay - 1, BLOODM, 6); px(ax + 5, ay + 1, BLOODM, 5); px(top[0] + 2, top[1] + 3, BLOODM, 5); }                     // 靴上的血点
  }
  function drawTorso() {
    part(); bodyXf(); const bl = P.bel;
    B.ell(E, -4, -37, 10.5, 10.5, 0, SKIN); B.ell(E, 1, -45, 13, 6, 0.05, SKIN); B.cap(E, 3, -46, 7, -50, 6.5, 5.5, SKIN);            // 驼背、肥肩、牛脖子
    B.ell(E, 9, -31 + bl * 0.5, 15, 13 + bl * 0.4, 0, SKIN); B.ell(E, -2, -25, 13, 7.5, 0, SKIN);                                   // 大肚子、屁股
    B.ln(E, -16, -38, -11, -36, SKIN, 3); B.ln(E, -15, -32, -9, -31, SKIN, 3); B.ln(E, -13, -27, -7, -27, SKIN, 3);                 // 背上的肥褶
    B.ln(E, -8, -50, 2, -51, SKIN, 7); B.ln(E, -14, -44, -10, -48, SKIN, 7);
    // 背上一道缝过的长疤（复生时亮成红色）
    const SM = P.seam ? SEAM : SKIN, st = P.seam ? 0 : 2;
    const scar = [[-13, -45], [-15, -40], [-15, -34], [-13, -29]];
    for (let i = 1; i < scar.length; i++) B.ln(E, scar[i - 1][0], scar[i - 1][1], scar[i][0], scar[i][1], SM, st);
    for (let i = 0; i < 6; i++) { const y = -44 + i * 2.9, x = -14 - Math.sin((i + 0.5) * 0.55) * 1.3; B.ln(E, x - 1.3, y - 0.4, x + 1.3, y + 0.4, P.seam ? SEAM : SKIN, P.seam ? 0 : 1); }
    // 肚子侧面（围裙没盖住的地方）：竖着一道手术缝线
    for (let i = 0; i < 4; i++) { B.px(E, 1, -40 + i * 3, P.seam ? SEAM : SKIN, P.seam ? 0 : 2); B.px(E, 0, -39 + i * 3, P.seam ? SEAM : SKIN, P.seam ? 0 : 1); B.px(E, 2, -39 + i * 3, P.seam ? SEAM : SKIN, P.seam ? 0 : 1); }
  }
  function drawApron() {
    part(); bodyXf(); const bl = P.bel * 0.5, s = P.sk;
    B.poly(E, [[4, -47], [13, -46], [18, -42 + bl], [22.5, -35 + bl], [24, -28 + bl], [22, -21 + bl], [18, -17], [17 + s, -7], [13 + s, -6], [9 + s, -7.5], [5 + s * 0.8, -6], [1 + s * 0.6, -8], [-2, -10], [-1, -18], [2, -25], [3, -33], [3, -41]], APRON);
    B.ln(E, 5, -46, 12, -45.5, APRON, 8); B.ln(E, 18, -40 + bl, 22, -33 + bl, APRON, 8); B.ln(E, 19, -19, 22, -24, APRON, 3);           // 胸口、肚子的高光、下缘的阴影
    B.ln(E, 8 + s * 0.5, -16, 9 + s, -8, APRON, 3); B.ln(E, 13 + s * 0.5, -16, 14 + s, -7, APRON, 7); B.ln(E, 3 + s * 0.3, -17, 3 + s * 0.6, -9, APRON, 3);   // 下摆的褶
    B.ln(E, 1 + s * 0.6, -8, 17 + s, -7, APRON, 3);
    for (const [x, y] of [[6, -40], [10, -37], [15, -18], [5, -13], [11, -11], [16, -12], [3, -22]]) B.px(E, x, y, APRON, 3);           // 污渍
    // 血：一大片、往下的滴痕、一只手印、溅点
    B.ell(E, 17, -33 + bl, 3.4, 2.4, 0.3, BLOODM); B.ell(E, 14, -30 + bl, 2, 1.5, 0, BLOODM); B.px(E, 16, -34 + bl, BLOODM, 8);
    B.ln(E, 18, -31 + bl, 18.5, -23, BLOODM); B.ln(E, 15, -29 + bl, 15.5, -24, BLOODM, 4); B.ln(E, 20, -31 + bl, 20.5, -27, BLOODM, 3); B.ln(E, 12, -16, 12 + s * 0.5, -10, BLOODM, 4);
    for (let i = 0; i < 4; i++) B.ln(E, 5 + i * 1.6, -26, 8 + i * 1.6, -21, BLOODM, 3 + (i & 1)); B.ell(E, 7, -26.5, 2.2, 1.5, 0, BLOODM, 4);   // 手印
    for (const [x, y] of [[10, -43], [12, -41], [20, -38], [7, -19], [15, -9], [6, -33]]) B.px(E, x, y, BLOODM, 6);
    part(); B.ln(E, 4, -47, 4, -51, ROPE, 5); B.ln(E, 12, -46, 11, -50, ROPE, 5);                                                        // 挂脖的带子
    part(); B.poly(E, [[-16, -30], [2, -29], [2, -27], [-16, -27.5]], ROPE, 4); // 系在背后的带子 + 结
    B.ell(E, -16, -28.5, 1.8, 1.5, 0, ROPE, 5); B.strand(E, [[-16, -28], [-18 - s * 0.5, -24], [-18 - s, -20]], 0.9, 0.6, ROPE, 4); B.strand(E, [[-15.5, -28], [-15 - s * 0.5, -23]], 0.8, 0.5, ROPE, 6);
  }
  // 腰后的皮带：两只小肉钩、一段垂下来的铁链
  function drawBelt() {
    part(); bodyXf(); B.poly(E, [[-17, -27], [2, -25.5], [2, -22], [-17, -23.5]], BELT); B.ln(E, -16, -26.5, 1, -25, BELT, 8);
    B.poly(E, [[-9, -26.5], [-6, -26.3], [-6, -22.5], [-9, -22.8]], BRASS); B.px(E, -7.5, -24.5, BELT, 10); B.reset();                     // 铁扣
    const sw = P.hsw * 0.5, a = L.belt[0], b = L.belt[1];
    for (const [p, n] of [[a, 5], [b, 3]]) { const e = [p[0] + sw * (n / 5), p[1] + n]; part(); drawChain([p, e], CHAIN); drawMeatHook(e[0], e[1], -sw * 0.06, 0.7, HOOKM); }
  }
  // 铁链：每格一节，亮 / 中 / 暗三档交替
  function drawChain(pts, m) {
    let k = 0;
    for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1])));
      for (let j = i === 1 ? 0 : 1; j <= n; j++, k++) { const x = a[0] + (b[0] - a[0]) * j / n, y = a[1] + (b[1] - a[1]) * j / n; px(x, y, m, k % 3 === 0 ? 8 : k % 3 === 1 ? 5 : 2); } }
  }
  // 肉钩：顶上一个环、直柄，下面弯一个大钩、尖朝上（ang = 0 时柄朝下）
  function drawMeatHook(x, y, ang, s, m) {
    const c = Math.cos(ang), sn = Math.sin(ang), T = (u, v) => [x + (u * c - v * sn) * s, y + (u * sn + v * c) * s];
    const pts = [[0, 0.5], [0, 5], [0.3, 7.2], [1.6, 8.6], [3.4, 8.6], [4.6, 7.2], [4.8, 5.4], [4.2, 4.2]].map((p) => T(p[0], p[1]));
    B.reset(); B.strand(E, pts, 1.1 * s + 0.2, 0.45, m);
    const r = T(0, -0.6); dot(r[0], r[1], 1.2 * s, m); px(r[0], r[1], m, 10);
    const tp = pts[7]; px(tp[0], tp[1], m, 9); const bt = pts[3]; px(bt[0], bt[1], m, 3); const hl = pts[1]; px(hl[0] - 0.5, hl[1], m, 8);
    if (s > 1) { px(tp[0], tp[1] + 1, BLOODM, 6); px(pts[6][0], pts[6][1], BLOODM, 5); }
  }
  function drawChainHook(front) {
    if (P.km === 1) { const inFront = Math.sin(P.ka) > 0; if (inFront !== front) return; }
    else if (front !== (P.km === 2 || P.hone > 0)) return;
    B.reset(); const h = L.hf;
    if (P.km === 1) {                                                                                                  // 甩圈的拖影
      part(); for (let i = 1; i <= 6; i++) { const a = P.ka - i * 0.32; if ((Math.sin(a) > 0) !== front) continue; px(h[0] + Math.cos(a) * 18, h[1] + Math.sin(a) * 6 - 1, CHAIND, i < 3 ? 5 : 2); }
    }
    part(); drawChain(L.chain, CHAIN);
    part(); drawMeatHook(L.hk[0], L.hk[1], L.hkA, P.km === 1 ? 1.5 : 1.35, HOOKM);
  }
  function drawHead() {
    part(); headXf();
    // 麻袋口：在肩上铺开一圈毛边
    B.poly(E, [[-1, -49], [3, -52.5], [14, -53.5], [17.5, -49.5], [15.5, -47.5], [13, -48.8], [10, -47], [7, -48.6], [4, -47], [1, -48.2]], HOOD);
    B.px(E, 12, -48.5, HOOD, 3); B.px(E, 6, -48, HOOD, 3); B.px(E, 16, -48.5, HOOD, 7);
    part(); B.ell(E, 9.5, -58.5, 8.3, 8.3, 0, HOOD); B.ell(E, 12, -54.5, 5.8, 3.8, 0.2, HOOD); B.poly(E, [[2, -60], [3.5, -66], [6, -67], [11, -66.5]], HOOD);                                            // 套着麻袋的脑袋
    for (let y = -65; y <= -51; y += 2) for (let x = 2 + ((y / 2) & 1); x <= 16; x += 2) { const q = (x - 9) * (x - 9) / 49 + (y + 58.5) * (y + 58.5) / 52; if (q < 0.72) B.px(E, x, y, HOOD, ((x * 7 + y * 3) & 3) === 0 ? 7 : 4); }   // 麻布的织纹
    B.ln(E, 4, -65, 13, -64.5, HOOD, 2); for (const x of [5, 7.5, 10, 12.5]) B.ln(E, x - 0.5, -66.5, x + 0.5, -63.5, HOOD, 10);             // 头顶的粗缝线
    // 眼洞：歪歪扭扭的两个洞，里面透红光（1 眯着、2 冒火、3 熄灭）
    const e = P.eyes;
    for (const [x, y] of [[11, -60], [12, -61], [13, -61], [14, -60], [14.5, -59], [13, -57.5], [12, -58], [11, -59]]) B.px(E, x, y, HOOD, 10);
    for (const [x, y] of [[15.5, -60.5], [16.5, -61], [16.5, -58.5], [15.5, -58.5]]) B.px(E, x, y, HOOD, 10);
    if (e === 3) { B.px(E, 12, -60, HOOD, 1); B.px(E, 13, -60, HOOD, 1); B.px(E, 12, -59, HOOD, 1); B.px(E, 13, -59, HOOD, 1); B.px(E, 16, -60, HOOD, 1); B.px(E, 16, -59, HOOD, 1); }
    else if (e === 1) { B.px(E, 12, -60, HOOD, 10); B.px(E, 13, -60, HOOD, 10); B.px(E, 12, -59, EYE); B.px(E, 13, -59, EYEC); B.px(E, 16, -60, HOOD, 10); B.px(E, 16, -59, EYE); }
    else { B.px(E, 12, -60, EYE); B.px(E, 13, -60, EYEC); B.px(E, 12, -59, EYE); B.px(E, 13, -59, EYE); B.px(E, 16, -60, EYEC); B.px(E, 16, -59, EYE);
      if (e === 2) { B.px(E, 14, -61, EYE); B.px(E, 17, -61, EYE); B.px(E, 12, -61, EYE); } }
    // 嘴：粗线缝死的一道口子，怒吼时崩开
    const j = P.jaw;
    if (!j) { B.ln(E, 11, -53.5, 16.5, -54, HOOD, 10); for (const x of [12, 14, 16]) B.ln(E, x, -55, x + 0.4, -52.5, ROPE, 7); }
    else {
      part(); B.poly(E, [[10.5, -54.5], [17, -55], [17.5, -54 + j], [14, -52 + j], [11, -53 + j * 0.5]], MOUTH);
      for (const x of [12, 13.5, 15.5]) B.px(E, x, -54.2, TEETH, x === 13.5 ? 4 : 7); if (j > 1) { B.px(E, 13, -51.5 + j, TEETH, 5); B.px(E, 15.5, -51.8 + j, TEETH, 7); B.px(E, 11.5, -56, ROPE, 6); B.px(E, 17.5, -52, ROPE, 6); }   // 黄牙、崩断的线头
    }
    for (const [x, y] of [[9, -55], [7.5, -52.5], [15, -56.5], [5, -60]]) B.px(E, x, y, BLOODM, 6);                                      // 袋子上的血点
    // 往后耷拉的袋尖（随动作晃）
    const t = P.tip;
    // 尖顶：整个袋子往上收成一个尖、往后歪，尖上折下来一小截（随动作晃）
    part(); B.poly(E, [[1.5, -60], [15, -63.5], [10.5, -67.5], [4.5, -70], [0.5 - t * 0.3, -72.5 + t * 0.3], [0.5, -68], [1, -65]], HOOD);
    B.ln(E, 4, -70, 9, -66.5, HOOD, 3); B.ln(E, 2, -66, 3, -71, HOOD, 7); B.ln(E, 6, -67, 12, -64.8, HOOD, 7);                             // 袋尖的褶
    for (const [x, y] of [[3, -68], [5, -69], [7, -67], [2, -64]]) B.px(E, x, y, HOOD, 4);
    part(); B.strand(E, [[0.5 - t * 0.3, -72 + t * 0.3], [-2 - t * 0.6, -71.5 + t * 0.8], [-3.5 - t * 0.8, -69.5 + t]], 1.5, 0.7, HOODD);
    // 脖子上的草绳 + 垂下来的结
    part(); B.ln(E, 2, -51.5, 15, -52.5, ROPE, 6); B.ln(E, 2, -50.5, 15, -51.5, ROPE, 3); B.ell(E, 15, -52, 1.3, 1.1, 0, ROPE, 6);
    B.strand(E, [[15, -51], [16, -48.5], [15.5, -46.5]], 0.8, 0.5, ROPE, 5);
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, el = far ? L.ef : L.en, h = far ? L.hf : L.hn, m = far ? SKIND : SKINL, gm = far ? RUBD : RUB;
    part(); dot(sh[0], sh[1], far ? 5.2 : 6.2, m); if (!far) { px(sh[0] - 1, sh[1] - 4, m, 8); px(sh[0] - 2, sh[1] - 3, m, 7); }        // 肥肩
    part(); capW(sh[0], sh[1], el[0], el[1], 5.4, 4.5, m);
    const bm = lerp(sh, el, 0.55); dot(bm[0], bm[1] + 0.8, 5, m);                                                                          // 耷拉的胳膊肉
    if (!far) {                                                                                                                           // 肩上一圈缝线：胳膊像是缝上去的
      const u = [el[0] - sh[0], el[1] - sh[1]], ul = Math.hypot(u[0], u[1]) || 1, n = [-u[1] / ul, u[0] / ul], c = lerp(sh, el, 0.3);
      const SM = P.seam ? SEAM : m;
      lnW(c[0] - n[0] * 4.5, c[1] - n[1] * 4.5, c[0] + n[0] * 4.5, c[1] + n[1] * 4.5, SM, P.seam ? 0 : 2);
      for (let i = -3; i <= 3; i += 2) { const p = [c[0] + n[0] * i, c[1] + n[1] * i]; lnW(p[0] - u[0] / ul, p[1] - u[1] / ul, p[0] + u[0] / ul, p[1] + u[1] / ul, P.seam ? SEAM : m, P.seam ? 0 : 1); }
      px(bm[0] - 1, bm[1] - 2, m, 7);
    }
    // 黑胶皮长手套：从肘到手
    const g0 = lerp(el, h, 0.08);
    part(); capW(g0[0], g0[1], h[0], h[1], 4.7, 3.8, gm); dot(g0[0], g0[1], 4.9, gm, far ? 5 : 7);
    if (!far) { const q = lerp(el, h, 0.5); px(q[0] - 1, q[1] - 2, gm, 8); px(q[0] + 1, q[1] + 1, BLOODM, 5); px(q[0] + 2, q[1] + 2, BLOODM, 4); }
    part(); dot(h[0], h[1], 3.9, gm); px(h[0] + 1, h[1] - 2, gm, far ? 5 : 8); px(h[0] - 1, h[1] + 1, gm, 2);
  }
  // 锈剁刀：方刀身、刀背挂孔、刀口一道亮线；手在刀柄上（u = 0），刀口朝刀挥动的方向
  function drawCleaver() {
    const g = L.cg, d = L.cd, p = [-d[1], d[0]], at = (u, v) => [g[0] + d[0] * u + p[0] * v, g[1] + d[1] * u + p[1] * v];
    part(); const h0 = at(-6, 0), h1 = at(4, 0); capW(h0[0], h0[1], h1[0], h1[1], 1.7, 1.7, WOOD);
    for (const u of [-3, 1]) { const q = at(u, 0); px(q[0], q[1], BRASS, 8); }
    const pm = at(-6.5, 0); dot(pm[0], pm[1], 1.6, HOOKM);
    part(); polyW([at(3, -2.5), at(21, -3), at(23.5, -1.5), at(24, 7), at(22.5, 10.5), at(4, 9.5), at(3, 7)], BLADE);
    for (let u = 4; u <= 23; u++) { const q = at(u, 2 + u * 0.02); if (u > 6 && u < 22) px(q[0], q[1], BLADE, 7); }                        // 刀面的反光
    const eg = P.glow >= 2 ? EDGEG : EDGE;
    for (let u = 4; u <= 22; u++) { const q = at(u, 9.6 + (u > 20 ? -0.3 : 0)); px(q[0], q[1], eg, P.glow >= 2 ? 0 : 9); const r = at(u, 8.5); px(r[0], r[1], BLADE, 8); }   // 刀口
    for (let u = 4; u <= 21; u++) { const q = at(u, -2.3); px(q[0], q[1], BLADE, 3); }
    for (const [u, v] of [[19, 0], [20, 0], [19, 1], [20, 1]]) { const q = at(u, v); px(q[0], q[1], BLADE, 10); }                        // 挂孔
    for (const [u, v, t] of [[5, 0, 5], [6, 1, 3], [7, 0, 6], [8, -1, 5], [12, -1, 5], [13, 0, 3], [14, -1, 6], [16, 5, 5], [17, 6, 3], [16, 6, 6], [9, 4, 5], [10, 5, 4], [22, 2, 5], [22, 4, 3], [6, 7, 5], [11, 1, 6], [21, 7, 5]]) { const q = at(u, v); px(q[0], q[1], RUST, t); }   // 锈斑
    for (const [u, v] of [[9, 8.8], [10, 9], [11, 8.3], [16, 9], [17, 8.6], [18, 8], [13, 7.6]]) { const q = at(u, v); px(q[0], q[1], BLOODM, 7); }   // 刀口上的血
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawChainHook(false); drawArm(1);
    drawLeg('f', 1); drawLeg('n', 0);
    drawTorso(); drawBelt(); drawApron();
    if (P.cb) drawCleaver();
    drawHead();
    if (!P.cb) drawCleaver();
    drawChainHook(true);
    drawArm(0);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    let on = 0;
    if (P.glow >= 2) { LIGHT[0].x = P.fx * z + spr.ox; LIGHT[0].y = P.fy * z + spr.oy; LIGHT[0].r = (6 + P.glow * 4) * z; on = 1; } else LIGHT[0].r = 0;
    if (P.eyes === 2) { LIGHT[1].x = L.eye[0] * z + spr.ox; LIGHT[1].y = L.eye[1] * z + spr.oy; LIGHT[1].r = 6 * z; on = 1; } else LIGHT[1].r = 0;
    RIM.lights = on ? LIGHT : null;
    bake(spr, RIM);
  }
  // 立绘：复生后仰头咆哮那一刻（剁刀高举、链钩张开、嘴崩开），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { const mv = MV; MV = 'roar'; poseAt(RECOVER, 3 / 12, 0); P.bx = 0; P.hd = -0.28; P.glow = 2; P.rim = 2; P.seam = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(10, -58); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'hook'; poseAt(IDLE, 0.2, 0); P.eyes = 2; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(10, -58); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }   // 头像：待机侧脸、眼洞亮着

  // ───── 特效 ─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let poolT = 9, lastF = -1, lastSpk = 0;
  const gore = (x, y, n, up, sp) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, y, (Math.random() - 0.5) * (sp || 120), -(up || 70) - Math.random() * 60, 0.6 + Math.random() * 0.4, BLD, { g: 300, floor: HY, sz: i % 4 === 0 ? 2 : 1 }); };
  const sparks = (x, y, n, dir) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, x, y, (dir || 1) * (30 + Math.random() * 70), -20 - Math.random() * 60, 0.25 + Math.random() * 0.2, RUSTFX, { g: 260, floor: HY }); };
  function strikeFx() {
    const g = L.cmid, x = sx(g[0]), y = sy(g[1]);
    fx.slash(sx(L.shN[0]), sy(L.shN[1]), 30, -0.5, 2.3, BLD, 0.2, 3, 2);
    burst(x, y, 16, 50, 140, 0.2, 0.5, BLD, 30); gore(x, y, 6, 60); fx.cross(x, y, 7, BLD, 0.16); hitDummy(1, 1); shake(0.15, 2);
  }
  function chopFx() {
    const t = [L.cg[0] + L.cd[0] * 22, 0], x = sx(t[0]), y = HY;
    ring(x, y - 3, 1, BLD); ring(x, y - 3, 0, FXI.dust); fx.wave(x, y, 1, 40, 8, BLD, 0.45, 2); fx.wave(x, y, -1, 30, 6, FXI.dust, 0.45, 2);
    fx.crack(x - 6, y, 18, -1, FXI.earth, 1.2); fx.crack(x + 6, y, 22, 1, BLD, 1.2); fx.cross(x, y - 8, 10, BLD, 0.2);
    burst(x, y - 4, 26, 60, 170, 0.3, 0.7, BLD, 40); burst(x, y - 1, 22, 30, 110, 0.4, 0.9, FXI.dust, 16); gore(x, y - 6, 16, 120, 180);
    for (let i = 0; i < 5; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, y - 6, (Math.random() - 0.3) * 140, -90 - Math.random() * 80, 0.9, BLD, { g: 320, floor: HY, sz: 3 });   // 肉块
    shake(0.35, 3); flash(0.1); poolT = 0; hitDummy(1, 1);
  }
  function throwFx() {
    const h = L.hf, x = sx(h[0]), y = sy(h[1]);
    fx.link(x, y, sx(Math.min(94, h[0] + 110)), y - 3, FXI.steel, 0.25, 2); fx.slash(sx(L.shF[0] + 6), sy(L.shF[1]), 26, -1.4, 1.4, FXI.steel, 0.18, 2, 2);
    burst(x, y, 12, 40, 120, 0.2, 0.4, RUSTFX, 16); sparks(x, y, 5, 1); shake(0.2, 2); flash(0.06);
  }
  function roarFx() {
    const h = L.head, x = sx(h[0]), y = sy(h[1]);
    ring(x, y, 1, BLD); ring(sx(2), HY - 30, 1, BLD); flash(0.12); shake(0.35, 3);
    burst(x, y - 2, 20, 50, 140, 0.25, 0.6, BLD, 30); gore(sx(L.belly[0]), sy(L.belly[1]), 10, 90, 160);
    fx.cross(sx(L.eye[0]), sy(L.eye[1]), 8, BLD, 0.25);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'chop') { chopFx(); sfx('impact', { pal: 'blood', w: 1 }); sfx('boss', { k: 'bchChop', w: 1 }); sfx('boss', { k: 'slam', w: 0.8 }); sfx('fall', { w: 0.8 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'hook') { throwFx(); sfx('swing', { kind: 'throw', w: 1 }); sfx('boss', { k: 'bchChain', w: 1 }); sfx('boss', { k: 'bchGrunt', w: 0.9 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else { burst(sx(L.belly[0]), HY - 2, 20, 30, 90, 0.3, 0.6, FXI.dust, 16); shake(0.25, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); sfx('boss', { k: 'bchChain', w: 0.6 }); }
    }
    if (s === RECOVER) {
      if (MV === 'roar') { roarFx(); sfx('boss', { k: 'bchRoar', w: 1 }); sfx('boss', { k: 'bchChain', w: 0.8 }); sfx('impact', { pal: 'blood', w: 0.8 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'hook') { const x = sx(L.an[0]); burst(x, HY - 1, 10, 30, 80, 0.3, 0.5, FXI.dust, 10); sfx('boss', { k: 'bchChain', w: 1 }); sfx('boss', { k: 'bchGrunt', w: 0.7 }); }
    }
    if (s === CHARGE) { lastF = -1; if (MV === 'chop') sfx('boss', { k: 'bchGrunt', w: 0.8 }); if (MV === 'hook') sfx('boss', { k: 'bchChain', w: 0.6 }); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'bchGrunt', w: 0.6 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'smash', w: 1 }); sfx('boss', { k: 'bchChop', w: 0.7 }); }
    if (s === CAST && MV === 'roar' && (t === 0.25 || t === 0.42)) {                                                  // 两声心跳
      const b = L.belly, x = sx(b[0]), y = sy(b[1]); ring(x, y, 0, BLD); burst(x, y, 10, 30, 80, 0.2, 0.4, BLD, 12); shake(0.15, 2); sfx('boss', { k: 'heartbeat', w: t === 0.42 ? 1 : 0.7 });
    }
    if (s === RECOVER && MV === 'chop' && t === 0.08) { sfx('hit', { mat: 'metal', w: 0.5 }); sparks(sx(L.cmid[0]), sy(-4), 4, -1); }
    if (s === DEATH && t === INCOMING + 0.3) sfx('boss', { k: 'bchGrunt', w: 0.8 });
    if (s === DEATH && t === INCOMING + 0.62) { sfx('hit', { mat: 'metal', w: 0.6 }); sfx('boss', { k: 'bchChop', w: 0.4 }); burst(sx(38), HY - 2, 8, 20, 60, 0.3, 0.5, FXI.dust, 8); }
    if (s === DEATH && t === INCOMING + 0.9) { sfx('boss', { k: 'thud', w: 0.8 }); sfx('boss', { k: 'bchDie', w: 1 }); burst(sx(-4), HY - 1, 10, 20, 60, 0.3, 0.5, FXI.dust, 8); }
    if (s === DEATH && t === INCOMING + 1.35) { for (let i = 0; i < 28; i++) spawn(K_DUST, sx(-20 + Math.random() * 70), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); gore(sx(24), HY - 4, 12, 70, 160); shake(0.3, 3); poolT = 0; sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); sfx('boss', { k: 'bchChain', w: 0.7 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-16 + Math.random() * 60), HY - 3 - Math.random() * 20, 0, -12 - Math.random() * 18, 0.8 + Math.random() * 0.8, BLD); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [], [0.25, 0.42], [0.08], [], [INCOMING + 0.3, INCOMING + 0.62, INCOMING + 0.9, INCOMING + 1.35, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    poolT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 12; if (f !== lastF) { lastF = f;
        if (f === 0 || f === 6) { const a = f === 0 ? L.an : L.af, x = sx(a[0] + 2); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 30 - (P.flip ? -10 : 10), -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 1 }); if (f === 6) sfx('boss', { k: 'bchChain', w: 0.3 }); } }
    }
    if (state === CHARGE && P.glow && MV !== 'roar' && Math.random() < 0.45) {                                         // 蓄力：血光往刀身（钩子时往甩圈的钩子）汇
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, BLD, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'chop' && P.glow >= 2 && Math.random() < 0.3) { const q = [L.cg[0] + L.cd[0] * 20 - L.cd[1] * 9, L.cg[1] + L.cd[1] * 20 + L.cd[0] * 9]; spawnX(K_PHYS, sx(q[0]), sy(q[1]), 0, 10, 0.8, BLD, { g: 300, floor: HY }); }   // 刀口往下滴血
    if (state === CHARGE && MV === 'hook' && P.km === 1) { const f = Math.floor(stT * 12); if (f !== lastF) { lastF = f; spawn(K_EMBER, sx(L.hk[0]), sy(L.hk[1]), 0, 0, 0.2, FXI.steel); if (f % 3 === 0) sfx('swing', { kind: 'smash', w: 0.4 }); } }
    if (state === IDLE) {
      if (P.spk && !lastSpk) { const q = [L.hf[0] + 1, L.hf[1] + 7]; sparks(sx(q[0]), sy(q[1]), 4, 1); sfx('boss', { k: 'bchHone', w: 0.5 }); }
      if (!P.hone && Math.random() < 0.025) { const q = [L.cg[0] + L.cd[0] * 22, L.cg[1] + L.cd[1] * 22]; spawnX(K_PHYS, sx(q[0]), sy(q[1]), 0, 6, 0.8, BLD, { g: 280, floor: HY }); }   // 刀尖偶尔滴一滴血
    }
    lastSpk = P.spk;
    if ((state === CAST || state === RECOVER) && MV === 'roar' && P.seam && Math.random() < 0.3) { const b = L.belly; spawn(K_EMBER, sx(b[0] - 20 + Math.random() * 16), sy(b[1] - 14 + Math.random() * 26), 0, -10, 0.3, BLD); }   // 缝线冒红光
    if (poolT < 1.4 && Math.random() < 0.35) { const x = sx(L.cg[0] + L.cd[0] * 20) + (Math.random() - 0.5) * 30; spawn(K_EMBER, x, HY - 1, 0, -8 - Math.random() * 8, 0.4, BLD); }
  }
  function fxReset() { poolT = 9; lastF = -1; lastSpk = 0; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -12; dx <= 12; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, CR[Math.abs(dx) < 5 ? 2 : 3]); }   // 地面映出的血光
    if (P.st === DEATH && P.lean > 1) { const x = sx(20); for (let dx = -16; dx <= 16; dx++) if (Math.abs(dx) < 16 - (f12 & 1)) E.put(x + dx, HY + 1, CR[Math.abs(dx) < 9 ? 4 : 3]); }   // 身下漫开的血
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'hook'; return MVDUR[MV]; }

  const VOICES = {
    bchGrunt: (s, t, w, p) => { s.tone(t, 'sawtooth', 96, 0.32, 0.05 + 0.03 * w, { to: 66, lp: 520, pan: p }); s.tone(t, 'square', 48, 0.3, 0.025 * w, { to: 36, lp: 260, pan: p }); s.nz(t, 0.24, 'lowpass', 420, 0.8, 0.05 * w, { pan: p }); },
    bchChain: (s, t, w, p) => { for (let i = 0; i < 6; i++) { const tt = t + i * 0.045 + Math.random() * 0.02; s.ring(tt, 1700 + Math.random() * 1100, 0.14, 0.022 * w, { pan: p }); s.nz(tt, 0.03, 'bandpass', 4200, 2, 0.03 * w, { pan: p }); } },
    bchHone: (s, t, w, p) => { s.nz(t, 0.22, 'bandpass', 3400, 3, 0.07 * w, { to: 5600, pan: p }); s.ring(t + 0.03, 2600, 0.3, 0.02 * w, { pan: p }); },
    bchChop: (s, t, w, p) => { s.thud(t, 150, 40, 0.3, 0.26 * w, { pan: p }); s.nz(t, 0.18, 'lowpass', 900, 0.8, 0.12 * w, { pan: p }); s.nz(t + 0.02, 0.12, 'bandpass', 1300, 1.5, 0.06 * w, { pan: p }); s.ring(t, 520, 0.4, 0.035 * w, { pan: p }); },
    bchRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 112, 1.25, 0.07 + 0.03 * w, { to: 72, vib: [6, 90, 0.15], lp: 900, pan: p, rev: 0.45 }); s.tone(t + 0.05, 'sawtooth', 168, 1.0, 0.03 * w, { to: 100, vib: [7, 70, 0.1], lp: 1100, pan: p });
      s.nz(t, 1.1, 'bandpass', 420, 1.1, 0.08 * w, { to: 240, pan: p }); s.rumble(t, 1.3, 0.16 * w, { f: 120, pan: p }); },
    bchDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 120, 1.5, 0.06, { to: 42, vib: [4, 60, 0.2], lp: 700, pan: p, rev: 0.5 }); s.nz(t + 0.2, 1.1, 'lowpass', 380, 0.7, 0.05 * w, { a: 0.2, pan: p }); },
  };

  return {
    name: '屠夫', HX, R_EL: BLD, DUR, hero, P, GLOW_MATS: [EYE, EYEC, SEAM, MOUTH, EDGEG, SPARK], HIT_POINT: [4, -40], EVENTS, MAX_H: 88, OWN_MAX: 100, SHEET_K: 3, VOICES,
    SFX: { body: 'flesh', how: 'topple', pal: 'blood', style: 'buff', w: 1 },
    MOVES: ['hook', 'chop', 'roar'], MOVE_NAMES: { hook: '钩子', chop: '剁肉', roar: '复生（倒下后爬起来）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.2, 1.45, 1.6, 2.0]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12, 8 / 12, 9 / 12, 10 / 12, 11 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0.08, 0.25, 0.42, 0.58, 0.75, 0.92], 'hook'], [CAST, [0, 1 / 12, 2 / 12], 'hook'], [RECOVER, [0.08, 0.25, 0.42, 0.58], 'hook'],
      [CHARGE, [0.08, 0.25, 0.5, 0.58], 'chop'], [CAST, [0, 2 / 12], 'chop'], [RECOVER, [0.08, 0.25, 0.42, 0.58], 'chop'],
      [CAST, [1 / 12, 2 / 12, 0.33, 0.42, 0.58, 0.67], 'roar'], [RECOVER, [0.08, 0.25, 0.5], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.75, 0.95, 1.1, 1.25, 1.4, 1.7, 2.3]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
