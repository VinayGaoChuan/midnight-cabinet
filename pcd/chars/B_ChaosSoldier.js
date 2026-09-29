// 金甲卫（小首领，第九章「地下赌场 · 金库」）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js / B_ChaosGuardBlackKatos.js。
// 依据：附录 G2「持矛盾的混沌士兵」；被动 盾墙（正面打来的远程伤害 −80%，背后照常）；招式 spearLine 枪阵（长矛刺穿一条线）、
//       shieldBash 盾击（晕 1.5 秒）、shieldPush 举盾（往前推，把前面的推开）；半血 roar 举盾。
// 设定卡 ——
//   剪影：金库的守卫，一个方方正正的重甲骑士（身体约 66 格高）：宽胸、圆鼓鼓的层叠大肩甲，全身抛光的金甲，
//         腰上一圈白色罩袍的下摆、红边、挂着一排小金币（走路叮当响），后腰一个鼓鼓的钱袋。
//   脸（识别点）：一顶平顶的桶形大盔，正面一道窄窄的横目缝（黑缝里一线白金色的光），额上一颗红宝石，
//         盔顶竖着一大蓬红缨，往后垂到肩后。
//   盾（识别点）：一面和它半身一样高的金色塔盾，红漆的盾面、厚金边、铆钉，正中一枚浮雕大金币（金库门的转轮 + 红宝石轴心），
//         下面一个锁眼。盾永远挡在身前（盾墙）。
//   武器：一杆比它还高的戟：深色木杆缠金丝，金色的套管下挂一撮红缨，钢的月牙斧刃、背钩和长枪尖。
//   主色：金甲（11 级金，暗端压到近黑，抛光高光 + 会闪的星芒）+ 白罩袍 + 红缨 / 红盾面；光是白金色，暗红只做点缀。
//   招式（setMove）：
//     spearLine 枪阵：半蹲，盾脚插进地里，戟放平架在盾沿上往后拉（枪尖一点点亮成白金、全身在抖）
//                   → 往前一个弓步长刺（一道金光直线往前射、枪尖一圈冲击环、金币碎光往前喷、地上一道光浪）→ 收回、戟立起来。
//     shieldBash 盾击：把盾收到胸前、侧身后仰（盾心的金币转轮亮起来）→ 往前一撞（盾面炸开金色星芒和冲击环、碎金片四溅）→ 退回。
//     shieldPush 举盾：两脚分开、压低，盾斜着顶在身前（盾面越来越亮）→ 把盾往前上方一掀（两道贴地推出去的金浪 + 一道大扇形）→ 放下。
//     roar 举盾：先缩在盾后（两帧）→ 挺身把盾高高举起、戟往前指、仰头，目缝和盾心一起炸亮、红缨炸开，喷出一圈金币 → 慢慢放下。
//   待机：两档呼吸、红缨轻摆，金甲上的星芒在盔顶 / 肩甲 / 盾沿 / 枪尖之间轮流闪；个性动作是把戟提起来往地上一顿（立正），
//         罩袍下摆的金币叮当乱跳，目缝亮一下。
//   移动：戟竖着拿、盾挡在身前，抬腿很高的正步（12 帧一圈），每一步甲片和金币一起响。
//   死亡：挨打晃一下 → 单膝跪地、拄着戟、盾立在身前 → 目缝闪两下熄灭、红缨垂下来 → 戟脱手倒在身后，
//         它往前扑倒压在倒下的盾上，钱袋里的金币撒了一地 → 化成金色的光点。
PCD.define('B_ChaosSoldier', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, PI = Math.PI;

  // ───── 材质（11 级，暗 → 亮）─────
  const R_GOLD = ['#100802', '#221204', '#381e06', '#502c0a', '#6a3e0e', '#885414', '#a86e1a', '#c68a24', '#dea836', '#f0c858', '#fff0a4'];   // 抛光金甲
  const R_RED = ['#110204', '#230409', '#39060e', '#520a14', '#6c0e1a', '#881420', '#a41c28', '#be2832', '#d43e3e', '#e85e50', '#f88a72'];    // 红缨、红漆盾面
  const R_WHITE = ['#121016', '#221e26', '#35303a', '#4a444e', '#605a62', '#78727a', '#928c92', '#aca6aa', '#c6c0c0', '#dedad4', '#f4f2ea'];  // 白罩袍
  const GOLD = defDeep(R_GOLD, { depth: 6, amb: 0.12 }), GOLDL = defDeep(R_GOLD, { depth: 4, amb: 0.12 }), GOLDD = defDeep(R_GOLD, { depth: 5, dark: 3, amb: 0.08 });
  const SHG = defDeep(R_GOLD, { depth: 10, amb: 0.14 }), SHE = defDeep(R_GOLD, { depth: 2, dark: 4, amb: 0.08 });
  const PLUME = defDeep(R_RED, { depth: 3, amb: 0.2 }), FIELD = defDeep(R_RED, { depth: 2, dark: 2, amb: 0.3 });
  const CLOTH = defDeep(R_WHITE, { depth: 4, amb: 0.2 }), CLOTHD = defDeep(R_WHITE, { depth: 3, dark: 2, amb: 0.14 });
  const STEEL = defDeep('bladesteel', { depth: 2, amb: 0.25 }), SHAFT = defDeep('hide', { depth: 1, dark: 2, amb: 0.2 }), LEATH = defDeep('hide', { depth: 2, dark: 2, amb: 0.1 });
  const GG = fxRamp('ggGold', ['#ffffff', '#fff0b0', '#ffc840', '#c0761a', '#4a2406']), G = FXR[GG];   // 白金：白 → 淡金 → 金 → 暗金
  const GRB = fxRamp('ggRuby', ['#fff0e8', '#ff9c84', '#e8343a', '#8e1018', '#30040a']), RR = FXR[GRB];
  const VIS = defMat([G[3], G[2], G[2], G[2]], 1, 1), VISC = defMat([G[2], G[1], G[1], G[1]], 1, 1), GLINT = defMat([G[1], G[0], G[0], G[0]], 1, 1);
  const RUBY = defMat([RR[4], RR[4], RR[3], RR[2]], 1, 0), RUBYH = defMat([RR[3], RR[1], RR[1], RR[1]], 1, 1);
  const hero = new Sprite(184, 128, 84, 116);
  const DUR = [3.0, 1.0, 0.8, 1.2, 0.5, 0.6, 0.8, 3.0, 1.0];
  const MVDUR = { spearLine: { 3: 1.0, 4: 0.4, 5: 0.7 }, shieldBash: { 3: 0.7, 4: 0.35, 5: 0.6 }, shieldPush: { 3: 1.0, 4: 0.45, 5: 0.7 }, roar: { 3: 0.5, 4: 0.65, 5: 0.7 } };
  let MV = 'spearLine';
  const HX = 70;
  const LR_G = [G[1], G[2], G[3]];
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: LR_G, k: 0.5 }, { x: 0, y: 0, r: 0, ramp: LR_G, k: 0.5 }];
  const RIM_R = [0, 12, 18, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: G, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of [VIS, VISC, GLINT, RUBYH]) RIM.skip[m] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  // 上身绕胯（HIP）前后倾 P.lean；头绕脖子 P.hd。脚踝是绝对坐标；手是上身坐标。
  // 戟：hold 1 = 在近手里（角度 ca + lean）；0 = 脱手，握点 hg、角度 ca 都是绝对的。盾：sfree 0 = 远手拿着（手握在盾心左上），1 = 自由摆放（中心 sc、角度 sa）。
  const HIP = [0, -27], NECK = [4, -51], LN = [3, -27], LF = [-4, -27], SHN = [11, -48], SHF = [-5, -48];
  const UA = 12.5, FA = 12, TH = 13, SH = 13.5, SHH = 21, SHW = 11;
  const D0 = { bx: 0, by: 0, lean: 0, hd: 0, plm: 0, ca: -PI / 2, sa: 0, sw: 0.9, fn: [7, -3], ff: [-8, -3], hn: [29, -40], hf: [8, -30], hg: [0, 0], sc: [0, 0],
    ebn: 1, ebf: 1, hold: 1, sfree: 0 };
  const K = {
    idle: {},
    stamp: { hn: [29, -46] },                                                                                            // 待机：把戟提起来
    walk: { lean: 0.05, ca: -PI / 2 - 0.05 },
    aWind: { hn: [-3, -47], ca: 0.06, lean: -0.08, by: 1, hd: -0.05, fn: [10, -3], ff: [-10, -3], hf: [10, -29], plm: -1 },   // 普攻：戟放平往后拉
    aStrike: { hn: [34, -44], ca: 0.02, lean: 0.16, bx: 5, by: 2, hd: 0.08, fn: [17, -3], ff: [-9, -3], hf: [12, -30], plm: 2 },
    aFollow: { hn: [29, -43], ca: 0.1, lean: 0.14, bx: 4, by: 2, hd: 0.06, fn: [17, -3], ff: [-9, -3], hf: [12, -30], plm: 2 },
    sBrace: { hn: [-4, -47], ca: 0.02, lean: -0.04, bx: -2, by: 5, hd: 0.06, fn: [14, -3], ff: [-13, -3], hf: [10, -28], plm: -2 },   // 枪阵：盾脚插地，戟架在盾沿上
    sLunge: { hn: [36, -44], ca: -0.02, lean: 0.2, bx: 7, by: 4, hd: 0.1, fn: [24, -3], ff: [-12, -3], hf: [14, -31], plm: 3 },
    bWind: { hn: [24, -40], ca: -PI / 2 + 0.1, lean: -0.14, bx: -3, by: 2, hd: -0.05, fn: [10, -3], ff: [-12, -3], hf: [1, -33], plm: -2 },   // 盾击：盾收到胸前
    bHit: { hn: [22, -38], ca: -PI / 2 - 0.15, lean: 0.22, bx: 10, by: 2, hd: 0.12, fn: [21, -3], ff: [-7, -3], hf: [18, -38], sa: 0.12, plm: 3 },
    pBrace: { hn: [22, -40], ca: -PI / 2 - 0.1, lean: 0.06, by: 6, hd: 0.1, fn: [15, -3], ff: [-15, -3], hf: [5, -27], sa: -0.22, plm: -1 },   // 举盾：压低，盾斜顶
    pHeave: { hn: [21, -44], ca: -PI / 2 - 0.1, lean: -0.06, bx: 5, hd: -0.1, fn: [17, -3], ff: [-11, -3], hf: [17, -45], sa: 0.25, plm: 3 },
    rCrouch: { hn: [27, -37], lean: 0.16, by: 4, hd: 0.3, hf: [8, -29], plm: 1 },                                        // 怒吼：缩在盾后
    rRoar: { hn: [25, -48], ca: -PI / 2 + 0.35, lean: -0.16, hd: -0.35, fn: [12, -3], ff: [-11, -3], hf: [19, -50], sa: -0.08, plm: -3 },
    hurt: { hn: [26, -39], ca: -PI / 2 - 0.12, lean: -0.18, bx: -3, hd: -0.25, hf: [4, -31], plm: 2 },
    dStag: { hn: [27, -37], ca: -PI / 2 - 0.08, lean: -0.1, bx: -2, hd: 0.25 },
    dKneel: { hn: [24, -30], ca: -PI / 2 + 0.12, by: 11, lean: 0.14, hd: 0.4, fn: [12, -3], ff: [-14, -1], hf: [14, -27], sfree: 1, sc: [24, -21], hg: [30, -14], plm: 1 },   // 单膝跪地，拄着戟
    dFall: { hold: 0, hg: [-6, -1.5], ca: -PI, by: 19, lean: 1.25, hd: 0.15, fn: [-10, -2], ff: [-20, -1], hn: [18, -20], hf: [10, -22], sfree: 1, sc: [32, -2.5], sa: PI / 2, sw: 0.3, plm: 2 },   // 往前扑倒在盾上
  };
  const NUM = ['bx', 'by', 'lean', 'hd', 'plm', 'ca', 'sa', 'sw'], VEC = ['fn', 'ff', 'hn', 'hf', 'hg', 'sc'], DIS = ['ebn', 'ebf', 'hold', 'sfree'];

  const P = {};
  const FIELDS = ['st', ...NUM, 'fnx', 'fny', 'ffx', 'ffy', 'hnx', 'hny', 'hfx', 'hfy', 'hgx', 'hgy', 'scx', 'scy', ...DIS, 'sk', 'eyes', 'glow', 'rim', 'flash', 'dq', 'pt', 'emb', 'gl', 'gs', 'jg', 'droop'];
  function base() { P.st = 0; P.sk = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.pt = 0; P.emb = 0; P.gl = 0; P.gs = 0; P.jg = 0; P.droop = 0; P.mx = 0; P.flip = 0; setK(K.idle, K.idle, 0); }
  const val = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of NUM) { const va = val(a, f); P[f] = va + (val(b, f) - va) * q; }
    for (const f of VEC) { const va = val(a, f), vb = val(b, f); P[f + 'x'] = va[0] + (vb[0] - va[0]) * q; P[f + 'y'] = va[1] + (vb[1] - va[1]) * q; }
    for (const f of DIS) P[f] = q < 0.5 ? val(a, f) : val(b, f);
  }
  // 正步：12 帧一圈（1 秒）。支撑 7 帧往后滑，摆动 5 帧高抬腿；两脚差半圈
  const foot = (p) => { p = ((p % 1) + 1) % 1; if (p < 0.58) return [7 - 14 * p / 0.58, 0]; const q = (p - 0.58) / 0.42; return [-7 + 14 * q, Math.round(8 * Math.sin(PI * Math.min(1, q * 1.15)))]; };
  const W_BY = [2, 1, 0, 0, 0, 1, 2, 1, 0, 0, 0, 1];
  function walk(f) {
    f = ((f % 12) + 12) % 12; setK(K.walk, K.walk, 0);
    const a = foot(f / 12), b = foot(f / 12 + 0.5); P.fnx = 7 + a[0]; P.fny = -3 - a[1]; P.ffx = -8 + b[0]; P.ffy = -3 - b[1];
    P.by = W_BY[f]; P.hd = W_BY[f] === 2 ? -0.03 : 0.02; P.hny += W_BY[f] * 0.5; P.hfy += W_BY[f] * 0.5; P.plm = 2 + (f % 6 < 3 ? 1 : 0); P.sk = -a[0] * 0.2;
    P.jg = f % 3 === 0 ? 1 + ((f / 3) & 1) : 0;
  }
  const trem = (f12, a) => { const s = f12 & 1 ? 1 : -1; P.bx += s * a * 0.5; P.hny += s * a * 0.5; P.hfy -= s * a * 0.5; };
  const GLINT_SEQ = [[3, 1], [4, 2], [13, 1], [14, 2], [22, 1], [23, 2], [31, 1], [32, 2]];   // 待机星芒：[帧, 大小]，按帧轮流闪在盔顶 / 肩甲 / 盾沿 / 枪尖

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.plm = [0, 1, 1, 0, -1, -1][Math.floor(tt / 0.35) % 6]; P.hfy += b * 0.5;
      const gf = f12 % 36; for (let i = 0; i < GLINT_SEQ.length; i++) if (GLINT_SEQ[i][0] === gf) { P.gl = 1 + (i >> 1); P.gs = GLINT_SEQ[i][1]; }
      if ((f12 % 19) === 7) P.eyes = 1;                                                                               // 目缝的光一暗
      const lp = tt % DUR[IDLE];
      if (lp >= 1.7 && lp < 2.6) {                                                                                    // 待机个性：提戟一顿（立正），下摆的金币乱跳，目缝亮一下
        const k = lp - 1.7;
        if (k < 0.25) setK(K.idle, K.stamp, ease.out(k / 0.25));
        else if (k < 1 / 3) { P.by += 1; P.jg = 2; }
        else { P.jg = k < 0.8 ? 1 + (f12 & 1) : 0; if (k < 0.6) { P.eyes = 2; P.glow = 1; P.rim = 1; P.gl = 3; P.gs = k < 0.45 ? 2 : 1; } }
      }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 16, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < 0.25) { const q = ease.out(tq / 0.25); setK(K.idle, K.aWind, q); P.pt = 1; P.eyes = 2; }
      else if (tq < T_STRIKE) { setK(K.aWind, K.aWind, 0); P.pt = 2; P.glow = 2; P.rim = 1; P.eyes = 2; P.hnx -= 1; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.aStrike, K.aStrike, 0); P.pt = 2; P.glow = 3; P.rim = 2; P.eyes = 2; }
      else if (tq < 0.5) { const q = ease.out((tq - T_STRIKE - 1 / 12) / (0.5 - T_STRIKE - 1 / 12)); setK(K.aStrike, K.aFollow, q); P.pt = 1; P.glow = 1; P.rim = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.5) / 0.25)); setK(K.aFollow, K.idle, q); }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.jg = 2; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; P.jg = 1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); setK(K.hurt, K.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.plm = Math.round(P.plm); geo(); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { spearLine: 0, shieldBash: 1, shieldPush: 2, roar: 3 };
  const T_STRIKE = 4 / 12;
  const seg = (tq, t0, t1, e) => (e || ease.inOut)(clamp01((tq - t0) / (t1 - t0)));
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'spearLine') {
      if (st === CHARGE) {                                                                                             // 盾脚插地、戟架在盾沿往后拉，枪尖越来越亮
        setK(K.idle, K.sBrace, seg(tq, 0, 0.35, ease.out)); if (tq > 0.4) trem(f12, tq > 0.75 ? 1.4 : 0.8);
        P.pt = tq < 0.3 ? 0 : tq < 0.6 ? 1 : 2; P.glow = tq < 0.3 ? 1 : 2 + (tq > 0.7 ? sh : 0); P.rim = tq > 0.35 ? 2 : 1; P.eyes = 2; P.emb = tq > 0.5 ? 1 : 0;
      } else if (st === CAST) { setK(K.sLunge, K.sLunge, 0); if (tq < 2 / 12) P.by += sh; P.pt = 2; P.glow = tq < 0.2 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.emb = 1; P.jg = 2; }
      else {
        if (tq < 0.3) setK(K.sLunge, K.sLunge, 0); else setK(K.sLunge, K.idle, seg(tq, 0.3, 0.6));
        P.pt = tq < 0.25 ? 1 : 0; P.glow = tq < 0.25 ? 2 : 1; P.eyes = tq < 0.3 ? 2 : 0; P.jg = tq > 0.3 && tq < 0.5 ? 1 + sh : 0;
      }
    } else if (MV === 'shieldBash') {
      if (st === CHARGE) {                                                                                             // 盾收到胸前、侧身后仰，盾心的转轮亮起
        setK(K.idle, K.bWind, seg(tq, 0, 0.3, ease.out)); if (tq > 0.35) trem(f12, 0.9);
        P.emb = tq < 0.25 ? 0 : tq < 0.5 ? 1 : 2; P.glow = tq < 0.25 ? 1 : 2 + (tq > 0.5 ? sh : 0); P.rim = tq > 0.3 ? 2 : 1; P.eyes = 2;
      } else if (st === CAST) { setK(K.bWind, K.bHit, seg(tq, 0, 1 / 12, ease.out)); P.emb = 2; P.glow = 3; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.jg = 2; }
      else {
        if (tq < 0.2) setK(K.bHit, K.bHit, 0); else setK(K.bHit, K.idle, seg(tq, 0.2, 0.5));
        P.emb = tq < 0.2 ? 1 : 0; P.glow = tq < 0.2 ? 2 : 1; P.eyes = tq < 0.25 ? 2 : 0; P.jg = tq < 0.35 ? 1 + sh : 0;
      }
    } else if (MV === 'shieldPush') {
      if (st === CHARGE) {                                                                                             // 分腿压低、盾斜顶在身前，盾面越来越亮
        setK(K.idle, K.pBrace, seg(tq, 0, 0.35, ease.out)); if (tq > 0.4) trem(f12, tq > 0.75 ? 1.4 : 0.8);
        P.emb = tq < 0.3 ? 0 : tq < 0.65 ? 1 : 2; P.glow = tq < 0.3 ? 1 : 2 + (tq > 0.7 ? sh : 0); P.rim = tq > 0.35 ? 2 : 1; P.eyes = 2;
      } else if (st === CAST) { setK(K.pBrace, K.pHeave, seg(tq, 0, 1 / 12, ease.out)); P.emb = 2; P.glow = 3; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2; P.jg = 2; }
      else {
        if (tq < 0.25) setK(K.pHeave, K.pHeave, 0); else setK(K.pHeave, K.idle, seg(tq, 0.25, 0.55));
        P.emb = tq < 0.25 ? 1 : 0; P.glow = tq < 0.25 ? 2 : 1; P.eyes = tq < 0.3 ? 2 : 0;
      }
    } else {   // roar：举盾（半血怒吼），游戏从 cast 开始播
      if (st === CHARGE) { setK(K.idle, K.rCrouch, seg(tq, 0, 0.3, ease.out)); P.eyes = 1; P.glow = 1; }
      else if (st === CAST) {
        if (tq < 2 / 12) { setK(K.idle, K.rCrouch, seg(tq, 0, 2 / 12, ease.out)); P.eyes = 1; P.glow = 1; }
        else { setK(K.rRoar, K.rRoar, 0); if (tq > 0.3) trem(f12, 1.2); P.eyes = 2; P.emb = 2; P.pt = 2; P.glow = 3; P.rim = tq < 3 / 12 ? 3 : 2; P.jg = 1 + sh; }
      } else {
        if (tq < 0.35) { setK(K.rRoar, K.rRoar, 0); trem(f12, 1); } else setK(K.rRoar, K.idle, seg(tq, 0.35, 0.6));
        P.eyes = tq < 0.4 ? 2 : 0; P.emb = tq < 0.35 ? 2 : 1; P.pt = tq < 0.35 ? 1 : 0; P.glow = tq < 0.35 ? 3 : 1; P.rim = tq < 0.35 ? 2 : 0; P.jg = tq < 0.45 ? 1 + sh : 0;
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.jg = 2; return; }
    if (d < 0.6) { setK(K.hurt, K.dStag, seg(d, 0.3, 0.5, ease.out)); P.eyes = 1; P.jg = 1; return; }                  // 晃一下
    if (d < 1.5) {                                                                                                    // 单膝跪地，拄着戟，目缝闪两下熄灭，红缨垂下
      setK(K.dStag, K.dKneel, seg(d, 0.6, 0.78, ease.in)); if (d > 0.78 && d < 0.86) { P.by += 1; P.jg = 2; }
      P.eyes = d < 1.05 ? 1 : d < 1.3 ? ((f12 & 1) ? 3 : 1) : 3; P.droop = d > 1.1 ? 2 : 1; if (d > 1.3) P.hd += 0.08;
      return;
    }
    setK(K.dKneel, K.dFall, seg(d, 1.5, 1.8, ease.in)); P.eyes = 3; P.droop = 2;                                      // 戟脱手，往前扑倒在盾上
    if (d > 1.8 && d < 1.9) P.by -= 1;
    if (d > 2.0) P.dq = Math.round(clamp01((d - 2.0) / 0.6) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(HIP[0], HIP[1], P.lean); }
  function headXf() { bodyXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function limb(r, tgt, l1, l2, bend) { const kn = B.ik(r, tgt, l1, l2, bend), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; return [kn, [kn[0] + (tgt[0] - kn[0]) / dd * Math.min(dd, l2), kn[1] + (tgt[1] - kn[1]) / dd * Math.min(dd, l2)]]; }
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  const sAt = (u, v) => [L.sc[0] + L.su[0] * u + L.ss[0] * v * P.sw, L.sc[1] + L.su[1] * u + L.ss[1] * v * P.sw];   // 盾面坐标：u 往盾顶、v 往盾的前沿
  const hAt = (u, v) => [L.g[0] + L.d[0] * u - L.d[1] * v, L.g[1] + L.d[1] * u + L.d[0] * v];                      // 戟的坐标：u 往枪尖、v 往斧刃
  function geo() {
    bodyXf();
    const rn = B.at(LN[0], LN[1]), rf = B.at(LF[0], LF[1]); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.chest = B.at(6, -41); L.purse = B.at(-7, -22); L.paul = B.at(7, -52);
    const hnT = B.at(P.hnx, P.hny), hfT = B.at(P.hfx, P.hfy);
    headXf(); L.head = B.at(6, -60); L.eye = B.at(12, -60); L.dome = B.at(3, -67); B.reset();
    [L.kn, L.an] = limb(rn, [P.fnx, P.fny], TH, SH, -1); [L.kf, L.af] = limb(rf, [P.ffx, P.ffy], TH, SH, -1); L.rn = rn; L.rf = rf;
    [L.en, L.hn] = limb(L.shN, hnT, UA, FA, P.ebn);
    [L.ef, L.hf] = limb(L.shF, hfT, 13, 12.5, P.ebf);
    let a; if (P.hold) { L.g = L.hn; a = P.ca + P.lean; } else { L.g = [P.hgx, P.hgy]; a = P.ca; }
    L.d = [Math.cos(a), Math.sin(a)]; L.tip = hAt(42, 0); L.hh = hAt(33, 0);
    const sa = P.sfree ? P.sa : P.sa + P.lean; L.su = [Math.sin(sa), -Math.cos(sa)]; L.ss = [Math.cos(sa), Math.sin(sa)];
    if (P.sfree) L.sc = [P.scx, P.scy]; else L.sc = [L.hf[0] - L.su[0] * 4 + L.ss[0] * 6 * P.sw, L.hf[1] - L.su[1] * 4 + L.ss[1] * 6 * P.sw];
    L.boss = sAt(1, 0); L.front = sAt(0, SHW + 2);
  }
  // 蓄力汇聚点：枪阵和普攻是枪尖，盾击 / 举盾 / 怒吼是盾心的金币
  function focus() {
    const f = (MV === 'spearLine' && P.st >= CHARGE && P.st <= RECOVER) || P.st === ATTACK ? L.hh : P.st >= CHARGE && P.st <= RECOVER ? L.boss : L.chest;
    P.fx = f[0]; P.fy = f[1]; P.gx = f[0]; P.gy = f[1];
  }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const pxA = (p, m, t) => px(p[0], p[1], m, t), lnA = (a, b, m, t) => lnW(a[0], a[1], b[0], b[1], m, t);

  function drawPlume() {                                                                                              // 盔顶的一大蓬红缨，往后垂
    part(); headXf(); const s = P.plm + (P.droop ? 2 : 0), dr = P.droop * 3;
    const main = B.bez([3, -69], [-6 - s, -78 + s * 0.6 + dr * 2], [-18 - s * 1.4, -60 + s * 1.2 + dr * 2], 11);
    B.strand(E, main, 3.8, 1.4, PLUME);
    B.strand(E, B.bez([2, -68], [-8 - s, -73 + s * 0.6 + dr], [-15 - s * 1.4, -54 + s + dr * 2], 9), 2.8, 1, PLUME);
    B.strand(E, B.bez([4, -70], [-2 - s, -79 + s * 0.4 + dr * 2], [-12 - s * 1.2, -70 + s + dr * 3], 8), 2.2, 0.8, PLUME);
    for (let i = 2; i < 10; i++) B.px(E, main[i][0] + (i & 1 ? 1 : 0), main[i][1] - 1, PLUME, i & 1 ? 3 : 8);        // 毛束的纹理
    part(); B.strand(E, [[3, -69], [6, -73 + (P.droop ? 2 : 0)], [10, -72 + (P.droop ? 3 : 0)]], 2.4, 1, PLUME);         // 前面竖起的一小撮
    B.px(E, 6, -73, PLUME, 8);
  }
  function drawTabardBack() {
    part(); bodyXf(); const s = P.sk;
    B.poly(E, [[-9, -28], [0, -28], [-1, -11], [-4, -9.5], [-7 - s * 0.4, -11], [-10.5 - s * 0.6, -10]], CLOTHD);
    B.ln(E, -10 - s * 0.6, -11, -1, -11.5, PLUME, 3); B.ln(E, -6, -26, -7 - s * 0.4, -13, CLOTHD, 3);
  }
  function drawLeg(k, far) {
    const r = L['r' + k], kn = L['k' + k], an = L['a' + k], m = far ? GOLDD : GOLDL;
    part(); capW(r[0], r[1], kn[0], kn[1], 5.2, 4.2, m);                                                               // 腿甲
    if (!far) { const c = lerp(r, kn, 0.45); lnW(c[0] - 3, c[1] - 1, c[0] + 3, c[1] - 2, m, 3); lnW(c[0] - 3, c[1], c[0] + 3, c[1] - 1, m, 8); }
    part(); capW(kn[0], kn[1], an[0], an[1], 4, 3.2, m);                                                               // 胫甲
    const v = [an[0] - kn[0], an[1] - kn[1]], vl = Math.hypot(v[0], v[1]) || 1, nx = v[1] / vl, ny = -v[0] / vl;
    lnW(kn[0] + nx * 2.4, kn[1] + ny * 2.4 + 2, an[0] + nx * 2, an[1] + ny * 2 - 2, m, far ? 6 : 9);                    // 胫甲正面的高光脊
    part(); dot(kn[0], kn[1], 3.8, m); px(kn[0] - 1, kn[1] - 2, m, far ? 6 : 9);                                          // 护膝 + 侧面的扇形护翼
    part(); polyW([[kn[0] - 1, kn[1] - 1], [kn[0] - 5, kn[1] - 3.5], [kn[0] - 5.5, kn[1] + 1], [kn[0] - 1.5, kn[1] + 2]], m); px(kn[0] - 4, kn[1] - 2, m, far ? 5 : 8);
    // 方头金靴（三道甲片）
    const ax = Math.round(an[0]), ay = Math.round(an[1]);
    part(); polyW([[ax - 4, ay - 3.5], [ax + 2, ay - 3.5], [ax + 6, ay - 1.5], [ax + 8.5, ay + 0.5], [ax + 8.5, ay + 3], [ax - 4, ay + 3]], m);
    lnW(ax - 4, ay + 3, ax + 8.5, ay + 3, m, far ? 1 : 2); lnW(ax + 1, ay - 3, ax + 2, ay + 2, m, 3); lnW(ax + 4, ay - 2, ax + 4.5, ay + 2, m, 3); lnW(ax + 2, ay - 3, ax + 3, ay + 2, m, 8); px(ax + 7, ay + 1, m, far ? 6 : 9);
  }
  function drawTorso() {
    part(); bodyXf();
    B.ell(E, -2, -41, 8.5, 8.5, 0, GOLD); B.ell(E, 5, -42, 10.5, 8.5, -0.1, GOLD);                                      // 背甲、胸甲（宽胸）
    B.poly(E, [[-7, -27], [8, -27], [12, -34], [14, -40], [-8, -40]], GOLD); B.cap(E, 1, -46, 4, -50, 6, 4.5, GOLD);
    B.ln(E, 14, -46, 13, -36, GOLD, 9); B.ln(E, 12.5, -46, 11.5, -37, GOLD, 4);                                          // 胸甲正中的脊（抛光）
    B.ln(E, -2, -49, 7, -50, GOLD, 9); B.ln(E, -9, -44, -8, -36, GOLD, 3);
    B.ln(E, -7, -35, 12, -34, GOLD, 2); B.ln(E, -7, -34, 12, -33, GOLD, 8); B.ln(E, -7, -31, 10, -30.5, GOLD, 3); B.ln(E, -7, -30, 10, -29.5, GOLD, 7);   // 腹甲的甲片
    for (const [x, y] of [[-5, -44], [-6, -38], [10, -38], [-5, -32], [8, -32]]) B.px(E, x, y, GOLD, 9);                  // 铆钉
    // 胸口錾刻的太阳金币
    for (let i = 0; i < 8; i++) { const a = i * PI / 4; B.px(E, 4 + Math.cos(a) * 2.6, -43 + Math.sin(a) * 2.6, GOLD, 3); }
    B.px(E, 4, -43, GOLD, 9); B.px(E, 3, -44, GOLD, 8);
    // 腰带 + 金扣
    part(); B.poly(E, [[-8, -28.5], [11, -28], [11, -26], [-8, -26.5]], LEATH); B.ln(E, -7, -28, 10, -27.5, LEATH, 7);
    part(); B.poly(E, [[7.5, -29], [10.5, -29], [10.5, -25.5], [7.5, -25.5]], GOLD); B.px(E, 9, -27.5, GOLD, 2); B.px(E, 8, -28.5, GOLD, 9);
    // 后腰的钱袋（金扣、口上露出几枚金币）
    part(); B.ell(E, -8, -22, 3.2, 3.8, 0.15, LEATH); B.ln(E, -10, -20, -6, -19, LEATH, 3); B.px(E, -9, -23.5, LEATH, 8);
    part(); B.ln(E, -10, -25.5, -6, -25.5, GOLD, 7); B.px(E, -8, -25, GOLD, 9); B.px(E, -9, -26.5 - (P.jg === 2 ? 1 : 0), GOLD, 9); B.px(E, -7, -26.5, GOLD, 8);
    // 金甲裙（腰下两层）
    part(); B.poly(E, [[-8, -26], [11, -26], [12.5, -19.5], [-8.5, -20]], GOLDL);
    B.ln(E, -8, -23, 12, -23, GOLDL, 3); B.ln(E, -8, -24, 12, -24, GOLDL, 8); B.ln(E, -8.5, -20.5, 12.5, -20, GOLDL, 3);
    for (const x of [-6, -1, 4, 9]) B.px(E, x, -21.5, GOLDL, 9);
  }
  function drawTabardFront() {                                                                                        // 前面的白罩袍：红边，下摆挂一排小金币
    part(); bodyXf(); const s = P.sk;
    B.poly(E, [[-4, -20], [10, -20], [11.5 + s * 0.3, -11], [3 + s * 0.5, -9.5], [-4.5 + s * 0.3, -11]], CLOTH);
    B.ln(E, 0, -19, 0.5 + s * 0.4, -12, CLOTH, 3); B.ln(E, 1, -19, 1.5 + s * 0.4, -12, CLOTH, 7); B.ln(E, 5, -19, 5.5 + s * 0.4, -12, CLOTH, 3);
    B.ln(E, -4.5 + s * 0.3, -11, 11.5 + s * 0.3, -11, PLUME, 5); B.ln(E, -4.5 + s * 0.3, -12, 11.5 + s * 0.3, -12, PLUME, 3);
    part(); for (let i = 0; i < 8; i++) { const x = -4 + i * 2 + s * 0.4, j = P.jg ? ((i + P.jg) & 1) : 0; B.px(E, x, -9.5 + j, GOLD, i & 1 ? 8 : 9); }
  }
  function drawPauldron(far) {
    part(); bodyXf();
    if (far) { B.ell(E, -4, -49, 7, 5.5, -0.2, GOLDD); B.ln(E, -9, -51, -1, -53.5, GOLDD, 7); return; }
    B.ell(E, 8.5, -47.5, 9, 6.2, -0.2, GOLD); B.ln(E, 2, -51.5, 13, -53, GOLD, 9); B.ln(E, 1, -45, 5, -42, GOLD, 3); B.ln(E, 1, -46, 16, -49.5, GOLD, 2);
    B.ln(E, 0.5, -48, 4.5, -52.5, PLUME, 5); B.ln(E, 15, -50, 17, -45, GOLD, 3);                                            // 肩甲沿上的一道红漆
    part(); B.poly(E, [[2.5, -51], [3.5, -56.5], [7.5, -56], [7.5, -52]], GOLD); B.ln(E, 3.5, -56, 7.5, -55.5, GOLD, 9);      // 竖起来护脖子的高护翼
    part(); B.ell(E, 10.5, -42.8, 6.8, 2.8, -0.3, GOLD); B.ln(E, 5, -42.3, 15.5, -45.8, GOLD, 8);
    part(); B.ell(E, 11.5, -40.2, 5.2, 2.3, -0.35, GOLD); B.ln(E, 7.5, -39.9, 16, -42.9, GOLD, 7);
    for (const [x, y] of [[6, -49], [11, -50.5], [14, -48]]) B.px(E, x, y, GOLD, 9);
  }
  function drawHead() {
    part(); headXf();
    B.ell(E, 5, -51.5, 6.5, 2.8, 0, GOLD); B.ln(E, 0, -52, 10, -52, GOLD, 3); B.ln(E, 1, -50.5, 9, -50.5, GOLD, 8);        // 护颈
    part(); B.poly(E, [[-2.5, -53], [-3.5, -59], [-3, -64.5], [-0.5, -67.5], [4, -68.6], [9, -68.3], [12.5, -66.8], [14.3, -63.5], [15, -58.5], [14.7, -54.5], [12.3, -52.2], [6, -51.6], [0, -52]], GOLD);   // 平顶的桶形大盔
    B.ln(E, 0, -67.5, 10, -67.6, GOLD, 9); B.ln(E, -2.5, -63.5, -2.5, -56.5, GOLD, 3); B.ln(E, 2, -66, 7, -66.5, GOLD, 8);
    B.ln(E, 8, -66.5, 8, -52.5, GOLD, 3); B.ln(E, 9, -66.5, 9, -52.5, GOLD, 8);                                          // 面甲和盔的接缝
    B.ln(E, 1, -63, 14.5, -63, GOLD, 8); B.ln(E, 1, -62, 14.5, -62, GOLD, 4);                                            // 额箍
    B.ln(E, 13.5, -58, 13.8, -53, GOLD, 9); B.ln(E, 12.8, -58, 13, -53, GOLD, 4);                                        // 面甲正中的竖筋
    for (const [x, y] of [[10.5, -56.5], [11.8, -55.5], [10.5, -54.5], [11.8, -53.5]]) B.px(E, x, y, GOLD, 1);            // 透气孔
    for (const [x, y] of [[0, -60], [0.5, -55], [3.5, -63], [11, -63]]) B.px(E, x, y, GOLD, 9);                           // 铆钉
    // 横目缝（0 常亮、1 暗、2 冒光、3 熄灭）
    const e = P.eyes;
    B.ln(E, 5, -59, 15.3, -59, GOLD, 10); B.ln(E, 5, -61, 15.3, -61, GOLD, 10); B.ln(E, 4, -58, 15, -58, GOLD, 8);
    if (e === 3) B.ln(E, 5, -60, 15.3, -60, GOLD, 10);
    else if (e === 1) { B.ln(E, 5, -60, 15.3, -60, GOLD, 10); B.ln(E, 10, -60, 14, -60, VIS); }
    else { B.ln(E, 5, -60, 15.3, -60, VISC); B.ln(E, 5, -60, 7, -60, VIS); B.ln(E, 10, -60, 14, -60, GLINT); if (e === 2) { B.ln(E, 8, -61, 14, -61, VISC); B.ln(E, 8, -59, 14, -59, VIS); B.px(E, 16, -60, VISC); B.px(E, 17, -60, VIS); B.px(E, 16, -61, VIS); } }
    part(); B.ell(E, 14.2, -63.2, 1.3, 1.3, 0, P.glow >= 2 || P.emb >= 2 ? RUBYH : RUBY); B.px(E, 14, -64, P.glow >= 2 ? GLINT : RUBY, P.glow >= 2 ? 0 : 3);   // 额上的红宝石
    part(); B.cap(E, 4, -68, 3.5, -70.5, 1.8, 1.4, GOLD); B.px(E, 3, -70, GOLD, 9);                                        // 插红缨的座
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, el = far ? L.ef : L.en, h = far ? L.hf : L.hn, m = far ? GOLDD : GOLDL;
    part(); capW(sh[0], sh[1], el[0], el[1], 4, 3.4, m);                                                               // 上臂甲
    if (!far) { const c = lerp(sh, el, 0.6); px(c[0] - 1, c[1] - 1, m, 9); }
    part(); capW(el[0], el[1], h[0], h[1], 3.4, 3.1, m);                                                               // 前臂甲
    const w = lerp(el, h, 0.7); dot(w[0], w[1], 3.7, m, far ? 5 : 6); if (!far) px(w[0] - 1, w[1] - 2, m, 9);          // 护手的喇叭口
    part(); dot(el[0], el[1], 3.3, m); px(el[0] - 1, el[1] - 1, m, far ? 6 : 9);                                         // 肘甲
    part(); dot(h[0], h[1], 3, m); px(h[0] + 1, h[1] - 2, m, far ? 6 : 9); px(h[0] + 2, h[1], m, far ? 5 : 8);          // 金手套
  }
  function drawShield() {                                                                                             // 金色塔盾：红漆盾面、厚金边、浮雕大金币（金库门的转轮）、锁眼
    const H = SHH, Wd = SHW;
    const out = [[H - 1.5, -Wd], [H - 0.4, -5], [H, 0], [H - 0.4, 5], [H - 1.5, Wd], [-H + 3, Wd], [-H + 1, Wd - 3], [-H, -0], [-H + 1, -Wd + 3], [-H + 3, -Wd]];
    part(); polyW(out.map(([u, v]) => { const p = sAt(u, v); return [p[0] + L.ss[0] * 1.8, p[1] + L.ss[1] * 1.8]; }), SHE);   // 盾的厚度（前沿）
    part(); polyW(out.map(([u, v]) => sAt(u, v)), SHG);
    lnA(sAt(H - 1.3, -Wd + 1.5), sAt(H - 0.3, 0), SHG, 9); lnA(sAt(H - 3, -Wd + 1), sAt(-H + 4, -Wd + 1), SHG, 8);         // 金边的抛光
    const inn = [[H - 4, -Wd + 2.6], [H - 3.2, 0], [H - 4, Wd - 2.6], [-H + 4.5, Wd - 2.6], [-H + 3, 0], [-H + 4.5, -Wd + 2.6]];
    part(); polyW(inn.map(([u, v]) => sAt(u, v)), FIELD);
    lnA(sAt(H - 4.5, -Wd + 3), sAt(-H + 5, -Wd + 3), FIELD, 7);
    part(); for (const u of [13, -14]) { lnA(sAt(u, -Wd + 2.6), sAt(u, -Wd + 6), SHG, 7); pxA(sAt(u, -Wd + 5.5), SHG, 9); }   // 门铰
    // 正中的浮雕金币（发光时外圈变成白金）
    const e = P.emb, cu = 1, R = 6.2, cp = [];
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; cp.push(sAt(cu + Math.cos(a) * R, Math.sin(a) * R)); }
    part(); polyW(cp, SHG);
    for (let i = 0; i < 16; i++) { const a = i / 16 * PI * 2; pxA(sAt(cu + Math.cos(a) * 4.7, Math.sin(a) * 4.7), e >= 2 ? VIS : SHG, e >= 2 ? 0 : 3); }
    if (e) for (let i = 0; i < 16; i += e >= 2 ? 1 : 2) { const a = i / 16 * PI * 2; pxA(sAt(cu + Math.cos(a) * R, Math.sin(a) * R), e >= 2 ? VISC : VIS); }
    for (let i = 0; i < 6; i++) { const a = i / 6 * PI * 2 + 0.3; lnA(sAt(cu + Math.cos(a) * 1.6, Math.sin(a) * 1.6), sAt(cu + Math.cos(a) * 3.8, Math.sin(a) * 3.8), SHG, e >= 2 ? 9 : 8); }   // 转轮的辐条
    part(); dot(...sAt(cu, 0), 1.4, e ? RUBYH : RUBY); pxA(sAt(cu + 0.8, -0.6), e ? GLINT : RUBY, e ? 0 : 3);
    // 锁眼
    pxA(sAt(-8, 0), FIELD, 10); pxA(sAt(-9, 0), FIELD, 10); pxA(sAt(-10, 0), FIELD, 10); pxA(sAt(-8, -0.9), FIELD, 10); pxA(sAt(-8, 0.9), FIELD, 10);
    // 铆钉
    part(); for (const [u, v] of [[H - 2.2, -Wd + 1.3], [H - 1.5, 0], [H - 2.2, Wd - 1.3], [0, -Wd + 1.2], [0, Wd - 1.2], [-H + 3, -Wd + 1.3], [-H + 1.5, 0], [-H + 3, Wd - 1.3]]) pxA(sAt(u, v), SHG, 9);
  }
  function drawHalberd() {                                                                                            // 戟：深色木杆缠金丝、金套管、红缨、月牙斧刃、背钩、长枪尖（手握在 u = 0）
    B.reset(); const h = (u, v) => hAt(u - 5, v);
    part(); const a0 = hAt(-37, 0), a1 = h(31, 0); capW(a0[0], a0[1], a1[0], a1[1], 1.2, 1.2, SHAFT);
    for (const u of [-30, -22, -14, 10, 18]) pxA(hAt(u, -0.5), SHAFT, 8);
    for (const u of [-4, -2, 0, 2]) lnA(hAt(u, -1.2), hAt(u + 1, 1.2), GOLD, 7);                                        // 握把缠的金丝
    part(); const b0 = hAt(-40, 0), b1 = hAt(-36, 0); capW(b0[0], b0[1], b1[0], b1[1], 0.9, 1.7, GOLD); pxA(hAt(-38, -0.8), GOLD, 9);   // 金镦
    part(); polyW([h(26, -1.8), h(33, -2.3), h(33, 2.3), h(26, 1.8)], GOLD); pxA(h(29, -1), GOLD, 9); lnA(h(28, -1.8), h(28, 1.8), GOLD, 3);
    // 套管下挂的一撮红缨（往下垂）
    part(); const t0 = h(26, 0), sw = P.plm * 0.4; B.strand(E, [t0, [t0[0] + 0.6 - sw, t0[1] + 3], [t0[0] - 0.4 - sw * 2, t0[1] + 6.5]], 2.2, 0.8, PLUME); pxA([t0[0] - sw, t0[1] + 3], PLUME, 8);
    // 月牙斧刃
    part(); polyW([h(31, 1.5), h(30, 5), h(28, 9), h(31, 10.5), h(35, 11), h(39, 10.3), h(41, 8), h(39.5, 5), h(38.5, 1.5)], STEEL);
    for (let u = 29; u <= 40; u++) { const v = 10.6 - (u - 34.5) * (u - 34.5) / 14; pxA(h(u, v), STEEL, 9); }
    lnA(h(32, 3), h(38, 3), STEEL, 3); dot(...h(34.5, 6), 1.2, GOLD); pxA(h(34, 5.5), GOLD, 9);                          // 斧面上嵌的小金币
    part(); polyW([h(32, -1.5), h(33, -5), h(35.5, -7.8), h(35, -4.5), h(36, -1.5)], STEEL); pxA(h(34, -4), STEEL, 8);   // 背钩
    part(); polyW([h(36.5, -2), h(41, -2.3), h(47, 0), h(41, 2.3), h(36.5, 2)], STEEL); lnA(h(37, 0), h(46, 0), STEEL, 8); lnA(h(38, 1.4), h(44, 0.8), STEEL, 3);   // 枪尖
    if (P.pt) { lnA(h(40, 0), h(47, 0), P.pt >= 2 ? VISC : VIS); pxA(h(47, 0), P.pt >= 2 ? GLINT : VISC); if (P.pt >= 2) { pxA(h(42, -1.3), VIS); pxA(h(42, 1.3), VIS); } }
  }
  function drawGlint() {                                                                                              // 抛光金甲上闪一下的星芒
    if (!P.gs) return;
    const p = P.gl === 1 ? L.dome : P.gl === 2 ? L.paul : P.gl === 3 ? sAt(SHH - 3, -SHW + 2) : L.tip, x = Math.round(p[0]), y = Math.round(p[1]);
    px(x, y, GLINT);
    if (P.gs >= 2) { for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(x + dx, y + dy, VISC); for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) px(x + dx, y + dy, VIS); }
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawPlume(); drawArm(1); drawPauldron(1);
    drawTabardBack(); drawLeg('f', 1); drawLeg('n', 0);
    drawTorso(); drawTabardFront(); drawHead();
    drawShield(); drawPauldron(0);
    drawHalberd(); drawArm(0);
    B.reset(); drawGlint();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    let on = 0;
    if (P.glow >= 2) { LIGHT[0].x = P.fx * z + spr.ox; LIGHT[0].y = P.fy * z + spr.oy; LIGHT[0].r = (6 + P.glow * 4) * z; on = 1; } else LIGHT[0].r = 0;
    if (P.eyes === 2) { LIGHT[1].x = L.eye[0] * z + spr.ox; LIGHT[1].y = L.eye[1] * z + spr.oy; LIGHT[1].r = 7 * z; on = 1; } else LIGHT[1].r = 0;
    RIM.lights = on ? LIGHT : null;
    bake(spr, RIM);
  }
  // 立绘：枪阵蓄力到头那一刻（盾脚插地、戟架在盾沿上、枪尖和盾心都亮着、目缝冒光），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  const headAt = () => { headXf(); const c = B.at(6, -61); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 16 * 2]; };
  function portrait() { const mv = MV; MV = 'spearLine'; poseAt(CHARGE, 0.9, 0); P.bx = -2; P.glow = 2; P.rim = 2; P.eyes = 2; P.pt = 2; P.emb = 1; P.gl = 1; P.gs = 2; geo(); focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(); return PSPR; }
  function headShot() { const mv = MV; MV = 'spearLine'; poseAt(IDLE, 0.2, 0); P.eyes = 2; P.rim = 1; P.gl = 1; P.gs = 2; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headAt(); return PSPR; }   // 头像：待机、目缝亮着、盔顶闪一下

  // ───── 特效 ─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let lineT = 9, waveT = 9, lastF = -1;
  const shards = (x, y, n, ramp, dir) => { for (let i = 0; i < n; i++) { const a = (dir ? -PI / 2 + (Math.random() - 0.5) * 1.6 : Math.random() * PI * 2), v = 60 + Math.random() * 90; spawnX(K_PHYS, x, y, Math.cos(a) * v * (dir ? 0.5 : 1) + (dir || 0) * 40, Math.sin(a) * v - 40, 0.6 + Math.random() * 0.4, ramp, { g: 280, floor: HY, sz: i % 3 === 0 ? 2 : 1 }); } };
  function strikeFx() {
    const t = L.tip, x = sx(t[0]), y = sy(t[1]);
    fx.beam(x - 30, y, x + 10, y, 1, GG, 0.14, 2); fx.cross(x, y, 7, GG, 0.16);
    burst(x, y, 16, 50, 140, 0.2, 0.5, GG, 30); burst(x, y, 6, 30, 90, 0.2, 0.4, FXI.coin, 20); hitDummy(1, 1); shake(0.15, 2);
  }
  function spearFx() {                                                                                                // 枪阵：一道金光直线往前射
    const t = L.tip, x = sx(t[0]), y = sy(t[1]);
    fx.beam(x - 16, y, x + 110, y, 2, GG, 0.35, 2); fx.beam(x - 6, y - 4, x + 70, y - 4, 1, GG, 0.22, 2); fx.beam(x - 6, y + 4, x + 70, y + 4, 1, GG, 0.22, 2);
    ring(x + 2, y, 1, GG); fx.cross(x, y, 11, GG, 0.3); burst(x, y, 26, 60, 180, 0.25, 0.6, GG, 20); burst(x + 8, y, 12, 60, 160, 0.3, 0.7, FXI.coin, 10);
    fx.wave(sx(t[0] - 20), HY, 1, 70, 7, GG, 0.5, 2); burst(sx(t[0] - 30), HY - 2, 14, 30, 100, 0.35, 0.8, FXI.dust, 12);
    shake(0.35, 3); flash(0.08); lineT = 0; hitDummy(1, 1);
  }
  function bashFx() {                                                                                                 // 盾击：盾面炸开星芒和冲击环
    const f = L.front, x = sx(f[0]), y = sy(f[1]);
    ring(x, y, 1, GG); fx.cross(x, y, 12, GG, 0.28); fx.slash(sx(L.sc[0]), sy(L.sc[1]), 24, 0.5, 2.6, GG, 0.2, 3, 2);
    burst(x, y, 22, 60, 170, 0.25, 0.55, GG, 20); shards(x, y, 12, GG, 1); burst(x, HY - 2, 10, 30, 90, 0.3, 0.6, FXI.dust, 10);
    shake(0.3, 3); flash(0.1); hitDummy(1, 1);
  }
  function pushFx() {                                                                                                 // 举盾：两道贴地的金浪 + 大扇形
    const c = L.sc, cx = sx(c[0]), cy = sy(c[1]);
    fx.slash(cx - 6, cy, 44, 0.5, 2.7, GG, 0.3, 4, 2); fx.slash(cx - 6, cy, 34, 0.7, 2.5, FXI.dust, 0.25, 2, 2);
    fx.wave(sx(c[0] + 6), HY, 1, 70, 12, GG, 0.6, 2); fx.wave(sx(c[0] + 2), HY, 1, 50, 7, FXI.dust, 0.5, 2);
    ring(sx(c[0] + 16), HY - 16, 1, GG); burst(sx(c[0] + 14), HY - 3, 24, 50, 160, 0.3, 0.7, FXI.dust, 12); burst(cx + 10, cy, 18, 60, 150, 0.25, 0.5, GG, 20);
    shake(0.35, 3); flash(0.08); waveT = 0; hitDummy(1, 1);
  }
  function roarFx() {                                                                                                 // 半血：盾举过头，目缝和盾心一起炸亮，喷出一圈金币
    const b = L.boss, x = sx(b[0]), y = sy(b[1]);
    ring(x, y, 1, GG); ring(sx(L.eye[0]), sy(L.eye[1]), 1, GRB); flash(0.12); shake(0.35, 3);
    burst(x, y, 26, 60, 170, 0.25, 0.6, GG, 30); shards(x, y, 18, FXI.coin, 0); fx.cross(sx(L.eye[0]), sy(L.eye[1]), 10, GG, 0.3); fx.cross(x, y, 14, GG, 0.35);
  }
  function plantFx() { const t = hAt(-37, 0); burst(sx(t[0]), HY - 1, 8, 20, 70, 0.3, 0.5, FXI.dust, 8); sfx('step', { w: 0.8 }); sfx('boss', { k: 'ggClank', w: 0.6 }); }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'spearLine') { spearFx(); sfx('boss', { k: 'ggThrust', w: 1 }); sfx('impact', { pal: 'gold', w: 1 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'shieldBash') { bashFx(); sfx('boss', { k: 'ggBash', w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'shieldPush') { pushFx(); sfx('boss', { k: 'ggPush', w: 1 }); sfx('impact', { pal: 'gold', w: 0.9 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else sfx('boss', { k: 'ggClank', w: 0.8 });
    }
    if (s === CHARGE) {
      lastF = -1;
      if (MV === 'spearLine') { sfx('boss', { k: 'ggGather', w: 1 }); sfx('boss', { k: 'ggClank', w: 0.6 }); }
      else if (MV === 'shieldBash') { sfx('boss', { k: 'ggGather', w: 0.7 }); sfx('boss', { k: 'ggClank', w: 0.8 }); }
      else if (MV === 'shieldPush') { sfx('boss', { k: 'ggGather', w: 0.9 }); sfx('boss', { k: 'growl', w: 0.5 }); }
    }
  }
  function onTime(s, t) {
    if (s === IDLE && t === 2.0) { plantFx(); sfx('boss', { k: 'ggCoins', w: 0.6 }); }
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'ggClank', w: 0.6 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'thrust', w: 1 }); sfx('hit', { mat: 'metal', w: 0.8 }); sfx('boss', { k: 'ggThrust', w: 0.5 }); }
    if (s === CHARGE && MV === 'spearLine' && t === 0.35) { burst(sx(L.sc[0]), HY - 1, 10, 20, 70, 0.3, 0.5, FXI.dust, 8); fx.crack(sx(L.sc[0]), HY, 8, 1, GG, 0.6); sfx('boss', { k: 'thud', w: 0.6 }); }
    if (s === CAST && MV === 'roar' && t === 2 / 12) { roarFx(); sfx('boss', { k: 'ggRoar', w: 1 }); sfx('boss', { k: 'ggCoins', w: 1 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
    if (s === RECOVER && t === 0.55) plantFx();
    if (s === DEATH && t === INCOMING + 0.3) sfx('boss', { k: 'ggClank', w: 0.8 });
    if (s === DEATH && t === INCOMING + 0.75) { sfx('hit', { mat: 'metal', w: 0.7 }); sfx('boss', { k: 'thud', w: 0.8 }); sfx('boss', { k: 'ggCoins', w: 0.4 }); burst(sx(-6), HY - 1, 10, 20, 70, 0.3, 0.5, FXI.dust, 8); shake(0.15, 2); }
    if (s === DEATH && t === INCOMING + 1.3) { sfx('boss', { k: 'ggDie', w: 1 }); fx.cross(sx(L.eye[0]), sy(L.eye[1]), 6, GG, 0.2); }
    if (s === DEATH && t === INCOMING + 1.8) {
      for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-20 + Math.random() * 70), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust);
      shards(sx(L.purse[0]), sy(L.purse[1]), 20, FXI.coin, 0); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'ggBash', w: 0.7 }); sfx('boss', { k: 'ggCoins', w: 1 });
    }
    if (s === DEATH && t === INCOMING + 2.0) { for (let i = 0; i < 32; i++) spawn(K_RISE, sx(-20 + Math.random() * 60), HY - 3 - Math.random() * 20, 0, -12 - Math.random() * 18, 0.8 + Math.random() * 0.8, GG); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[2.0], [], [0.08, T_STRIKE], [0.35], [2 / 12], [0.55], [], [INCOMING + 0.3, INCOMING + 0.75, INCOMING + 1.3, INCOMING + 1.8, INCOMING + 2.0], []];
  function stepFX(dt, state, stT) {
    lineT += dt; waveT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 12; if (f !== lastF) { lastF = f;
        if (f === 0 || f === 6) { const a = f === 0 ? L.an : L.af, x = sx(a[0] + 2); for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 30 - (P.flip ? -10 : 10), -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 1 }); sfx('boss', { k: 'ggClank', w: 0.35 }); if (f === 0) sfx('boss', { k: 'ggCoins', w: 0.25 }); } }
    }
    if (state === CHARGE && P.glow && MV !== 'roar' && Math.random() < 0.5) {                                          // 蓄力：白金的光往枪尖（盾招往盾心）汇
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 16, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, GG, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'spearLine' && P.pt >= 2 && Math.random() < 0.15) fx.cross(sx(L.tip[0]), sy(L.tip[1]), 4 + Math.random() * 3, GG, 0.1);
    if (state === IDLE && Math.random() < 0.03) spawn(K_EMBER, sx(L.sc[0] - 8 + Math.random() * 16), sy(L.sc[1] - 16 + Math.random() * 30), 0, -6 - Math.random() * 6, 0.4, GG);   // 金甲上飘着的金色微光
    if (lineT < 1.2 && Math.random() < 0.5) { const x = sx(L.tip[0] + Math.random() * 90); spawn(K_EMBER, x, HY - 1 - Math.random() * 3, 0, -8 - Math.random() * 10, 0.4, Math.random() < 0.3 ? FXI.coin : GG); }   // 枪阵留在地上的金光
    if (waveT < 1.0 && Math.random() < 0.4) { const x = sx(L.sc[0] + 10 + Math.random() * 60); spawn(K_DUST, x, HY - 1, 10 + Math.random() * 20, -6 - Math.random() * 8, 0.4, FXI.dust); }
  }
  function fxReset() { lineT = 9; waveT = 9; lastF = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -12; dx <= 12; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, G[Math.abs(dx) < 5 ? 2 : 3]); }   // 地面映光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'spearLine'; return MVDUR[MV]; }

  const VOICES = {
    ggClank: (s, t, w, p) => { s.ring(t, 1250 + Math.random() * 300, 0.18, 0.02 * w, { pan: p }); s.ring(t + 0.025, 1900 + Math.random() * 400, 0.14, 0.014 * w, { pan: p }); s.nz(t, 0.06, 'bandpass', 3000, 2, 0.04 * w, { pan: p }); s.thud(t, 130, 55, 0.12, 0.07 * w, { pan: p }); },
    ggCoins: (s, t, w, p) => { s.coins(t, 5 + Math.round(5 * w), 0.028 * w, { gap: 0.04, pan: p }); },
    ggGather: (s, t, w, p) => { s.tone(t, 'triangle', 220, 1.0, 0.03 * w, { to: 660, pan: p }); s.nz(t, 1.0, 'bandpass', 400, 2, 0.04 * w, { to: 3200, a: 0.3, pan: p }); s.bell(t + 0.55, 84, 0.4, 0.02 * w, { pan: p }); s.bell(t + 0.75, 88, 0.4, 0.018 * w, { pan: p }); },
    ggThrust: (s, t, w, p) => { s.whoosh(t, 0.25, 400, 2400, 0.12 * w, { pan: p }); s.ring(t + 0.02, 1800, 0.4, 0.03 * w, { pan: p }); s.bell(t + 0.02, 91, 0.5, 0.025 * w, { pan: p }); s.thud(t, 140, 60, 0.2, 0.12 * w, { pan: p }); },
    ggBash: (s, t, w, p) => { s.thud(t, 90, 40, 0.35, 0.25 * w, { pan: p }); s.ring(t, 320, 0.8, 0.05 * w, { pan: p }); s.ring(t, 470, 0.6, 0.03 * w, { pan: p }); s.nz(t, 0.12, 'bandpass', 1800, 1.2, 0.08 * w, { pan: p }); s.cymbal(t, 0.4, 0.02 * w, { pan: p }); },
    ggPush: (s, t, w, p) => { s.rumble(t, 0.7, 0.14 * w, { f: 120, pan: p }); s.whoosh(t, 0.4, 200, 1200, 0.12 * w, { pan: p }); s.thud(t, 100, 40, 0.3, 0.2 * w, { pan: p }); s.ring(t, 380, 0.6, 0.035 * w, { pan: p }); },
    ggRoar: (s, t, w, p) => { s.brass(t, 50, 0.9, 0.05 * w, { bright: 1600, pan: p }); s.brass(t, 57, 0.9, 0.04 * w, { bright: 1600, pan: p }); s.brass(t + 0.12, 62, 0.8, 0.03 * w, { bright: 2000, pan: p });
      s.timp(t, 38, 0.2 * w, { pan: p }); s.tone(t, 'sawtooth', 90, 1.0, 0.04 * w, { to: 64, vib: [5, 60, 0.2], lp: 700, pan: p, rev: 0.4 }); s.cymbal(t + 0.05, 0.9, 0.03 * w, { pan: p }); s.ring(t, 520, 0.9, 0.03 * w, { pan: p }); },
    ggDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 110, 1.4, 0.05 * w, { to: 40, vib: [4, 50, 0.2], lp: 600, pan: p, rev: 0.5 }); s.ring(t + 0.1, 260, 1.4, 0.025 * w, { pan: p }); s.nz(t + 0.2, 1.0, 'lowpass', 340, 0.7, 0.04 * w, { a: 0.2, pan: p }); },
  };

  return {
    name: '金甲卫', HX, R_EL: GG, DUR, hero, P, GLOW_MATS: [VIS, VISC, GLINT, RUBYH], HIT_POINT: [4, -40], EVENTS, MAX_H: 88, OWN_MAX: 100, SHEET_K: 3, VOICES,
    SFX: { body: 'armor', how: 'topple', pal: 'coin', style: 'blade', w: 1 },
    MOVES: ['spearLine', 'shieldBash', 'shieldPush', 'roar'], MOVE_NAMES: { spearLine: '枪阵', shieldBash: '盾击', shieldPush: '举盾', roar: '举盾（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.85, 1.95, 2.05, 2.3]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12, 8 / 12, 9 / 12, 10 / 12, 11 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0.08, 0.25, 0.5, 0.75, 0.92], 'spearLine'], [CAST, [0, 2 / 12], 'spearLine'], [RECOVER, [0.25, 0.42, 0.58], 'spearLine'],
      [CHARGE, [0.08, 0.25, 0.5], 'shieldBash'], [CAST, [0, 2 / 12], 'shieldBash'], [RECOVER, [0.25, 0.42], 'shieldBash'],
      [CHARGE, [0.08, 0.3, 0.6, 0.9], 'shieldPush'], [CAST, [0, 2 / 12], 'shieldPush'], [RECOVER, [0.3, 0.45], 'shieldPush'],
      [CAST, [1 / 12, 2 / 12, 0.33, 0.5], 'roar'], [RECOVER, [0.17, 0.42, 0.58], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.75, 1.0, 1.35, 1.65, 1.9, 2.1, 2.5]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
