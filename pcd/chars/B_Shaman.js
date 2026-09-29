// 血巫（小首领，第 8 章「地狱」的血河）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js / B_Needler.js。
// 依据：附录 G2 血巫「戴羽冠的萨满」；被动 血祭（每掉 10% 生命，攻速 +10%）；招式 curse 血咒（先亮红圈，6 秒里圈内受到的治疗变成两倍的伤害）、
//       bloodlet 放血（一条线上的流血，受到的治疗减半）；半血 roar 血咒蔓延（几乎整个战场）。
// 设定卡 ——
//   剪影：一个又瘦又高、总是半蹲着的巫医，膝盖弯着、背微驼，像随时在跳舞；头上扣着一只大牛头骨面具（识别点），
//         两根长牛角一前一后往上弯，面具后面一扇血红和乌黑相间的羽冠，脑后垂着一绺绺黑脏辫。身体约 65 格高（连角 ~77、羽冠 ~80）。
//         和血河摆渡人（尖兜帽白骷髅脸、骷髅灯、船桨、坐船）完全不同：血巫是站着的、露着身子的、戴兽骨面具的、跳着的。
//   脸（识别点）：骨白的牛头骨，长吻往前下方伸，两个眼窝里烧着血红的光（施法时整团烧起来），鼻孔两道黑缝，一排上牙；
//         额头一道血手指抹的红纹，眼窝下挂着三道血泪；面具下露出巫医自己的下巴，嚎叫时张开。
//   身体：灰褐的干瘦皮肤，肋骨一根根凸出来，身上、胳膊、小腿是一道道血红的涂纹；脖子上一串兽牙项链、一串挂小骷髅的护符；
//         肩上披一件血红和乌黑的羽毛斗篷，近肩扣着一块兽下颌骨；腰上皮裙、流苏、挂一把骨刀；脚踝上骨珠串（跳起来哗啦响）。
//   标志物：远手一根比人高的扭曲木杖，杖顶插着一颗缝眼缝嘴的干缩人头（嘴里还在滴血），杖头下吊一只盛血的葫芦、缠着红布条。
//   魔法：四颗血珠绕着身子转（前半圈在身前、后半圈在身后），施法时汇到杖顶 / 刀尖，怒吼时炸开。
//   主色：暗灰褐的皮 + 骨白面具 + 暗血红羽毛；光：血珠、眼窝、干缩人头的缝眼和葫芦的裂缝（血红 → 粉 → 白热）。
//   招式（setMove）：
//     curse 血咒：两手握杖举过头 → 半蹲着一上一下地念咒，血珠一颗颗螺旋汇到杖顶的人头，脚下亮起血色法阵，眼窝烧起来
//                 → 把杖狠狠插进身前的地里：杖顶炸出一道血环、地上的法阵外扩、血柱冲天 → 拔杖、喘着粗气退回。
//     bloodlet 放血：从腰上拔出骨刀高举过头，血珠汇到刀刃、刀一直往下滴血 → 往前下方一刀劈下去，一道血色弧光顺着地面冲出去、血往前泼
//                 → 甩掉刀上的血，把刀收回腰上。
//     roar 血咒蔓延（半血）：缩成一团、一只手抓着面具发抖 → 猛地站直后仰、杖举到天上、另一只手张开，张嘴嚎叫；四颗血珠炸开成一大圈。
//   待机：两档呼吸，羽冠、斗篷、脏辫各自晃，血珠一直在转；个性动作是跳一小段巫舞：近脚抬高、跺地、杖在地上一顿（骨珠哗啦）。
//   移动：半蹲的巫舞步，膝盖抬得很高，每一拍身子一沉，杖跟着一点一点地拄。
//   死亡：捂着胸口跪下去，血珠一颗颗掉到地上摔成血洼 → 往前扑倒，杖脱手倒在前面，面具磕在地上、眼窝的光灭了 → 化成血雾往上散。
PCD.define('B_Shaman', (E) => {
  const { defDeep, defMat, fxRamp, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, PI = Math.PI;

  // ───── 材质（11 级，暗 → 亮）：皮和羽毛压暗，骨白面具是最亮的一块，血光才跳得出来 ─────
  const R_SKIN = ['#0a0605', '#170e0b', '#241510', '#321c15', '#41241a', '#512e20', '#623826', '#74432e', '#875038', '#9b5f45', '#b07256'];    // 灰褐的干瘦皮肤
  const R_BONE = ['#0e0b09', '#211b16', '#352c24', '#4b4034', '#635546', '#7c6c5a', '#968670', '#b0a189', '#c9bca3', '#ded4bf', '#f0ead8'];    // 牛头骨面具
  const R_HORN = ['#080605', '#15100c', '#231a13', '#32261b', '#423224', '#53402e', '#664f38', '#7a5f43', '#8e7050', '#a2835f', '#b89670'];    // 牛角
  const R_FEATH = ['#070205', '#12050a', '#1f0810', '#2e0b16', '#3f0e1d', '#521224', '#66162b', '#7c1b33', '#93223c', '#aa2e47', '#c24054'];   // 血红的羽毛
  const SKIN = defDeep(R_SKIN, { depth: 4, amb: 0.16 }), SKIND = defDeep(R_SKIN, { depth: 3, dark: 3, amb: 0.08 }), BODY = defDeep(R_SKIN, { depth: 7, amb: 0.14 });
  const BONE = defDeep(R_BONE, { depth: 6, amb: 0.3 }), BONES = defDeep(R_BONE, { depth: 2, amb: 0.34 }), BONED = defDeep(R_BONE, { depth: 2, dark: 3, amb: 0.2 });
  const HORN = defDeep(R_HORN, { depth: 3, amb: 0.34 }), HORND = defDeep(R_HORN, { depth: 3, dark: 2, amb: 0.16 });
  const FEATH = defDeep(R_FEATH, { depth: 3, amb: 0.2 }), FEATHD = defDeep(R_FEATH, { depth: 3, dark: 4, amb: 0.06 }), CAPE = defDeep(R_FEATH, { depth: 6, dark: 2, amb: 0.1 });
  const HAIR = defDeep('obsidian', { depth: 3, dark: 2, amb: 0.14 }), HIDE = defDeep('hide', { depth: 4, amb: 0.2 }), HIDED = defDeep('hide', { depth: 3, dark: 3, amb: 0.1 });
  const WOOD = defDeep('hide', { depth: 2, dark: 1, amb: 0.2 }), SHRK = defDeep('hide', { depth: 4, amb: 0.34 }), TOOTH = defDeep('ivory', { depth: 1, amb: 0.5 });
  const BLOOD = fxRamp('bwBlood', ['#ffffff', '#ff8a7a', '#ff2438', '#9a0618', '#380208']), BR = FXR[BLOOD];       // 血光：白热 → 粉 → 血红 → 暗红
  const CURSE = fxRamp('bwCurse', ['#ffd0d8', '#ff4a6a', '#c0103a', '#6a0826', '#2a0212']), CR = FXR[CURSE];       // 血咒的法阵：偏紫的暗血
  const BLD = defMat([BR[4], BR[3], BR[2], BR[1]], 1, 1), BLDW = defMat([BR[3], BR[2], BR[1], BR[0]], 1, 1), BLDD = defMat([BR[4], BR[4], BR[3], BR[2]], 1, 1);
  const PAINT = defMat(ramp(['#2a0408', '#5e0a12', '#94141c', '#c02a28']), 1, 1);                                   // 血画的涂纹（不发光）
  const SOCK = defMat(ramp(['#030102', '#070205', '#10040a', '#1c0810']), 1, 1);                                    // 眼窝、鼻孔、张开的嘴
  const FLATS = [BLD, BLDW, BLDD, PAINT, SOCK];
  const hero = new Sprite(176, 124, 80, 114);
  const DUR = [2.4, 2 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { curse: { 3: 1.1, 4: 0.5, 5: 0.7 }, bloodlet: { 3: 0.8, 4: 0.4, 5: 0.6 }, roar: { 3: 0.5, 4: 0.8, 5: 0.5 } };
  let MV = 'curse';
  const HX = 68;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [BR[1], BR[2], BR[3]], k: 0.5 }, { x: 0, y: 0, r: 0, ramp: [BR[1], BR[2], BR[3]], k: 0.45 }];
  const RIM_R = [0, 11, 17, 25], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: BR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  for (const m of FLATS) RIM.skip[m] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  // 全身绕胯（HIP）前倾 lean；上身绕腰（WAIST）再弓 arch；头绕脖子 hd。脚、手是世界坐标（手随 bx / by 平移）。
  // 近手伸在身前握杖（hn，杖的角度 sa：0 = 竖直，正 = 杖头往前）；远手空着做手势 / 拿骨刀（hf，朝向 an：世界角度，0 朝右、正值朝下，sn 手指张开）；
  // two 0～1 = 远手也握到杖上（杖握点下面 8 格）。
  const HIP = [0, -25], WAIST = [0, -31], NECK = [4, -48], LN = [2, -24], LF = [-3, -24], SHN = [4, -45], SHF = [-3, -46];
  const ST_BOT = 41, ST_TOP = 23;
  const D0 = { bx: 0, by: 0, lean: 0.02, arch: 0.06, hd: -0.16, jaw: 0, sa: 0.08, two: 0, an: 1.3, sn: 0.4, cape: 0, orbR: 1, orbF: 0, sdrop: 0, drop: 0,
    fn: [7, -2], ff: [-6, -2], hn: [32, -44], hf: [9, -27], knife: 0, ebn: 1, ebf: 1 };
  const K = {
    idle: {},
    dLift: { by: -1, hd: -0.26, fn: [10, -9], hn: [33, -49], sa: 0.16, hf: [13, -40], an: -0.6, sn: 1, cape: 1 },                                  // 巫舞：近脚抬高、杖离地、远手张开
    dStomp: { by: 2, hd: -0.06, arch: 0.14, fn: [10, -2], hn: [32, -42], sa: 0.03, hf: [7, -26], an: 1.5, sn: 0.3, cape: -1 },                        // 跺地、杖一顿
    aWind: { lean: -0.08, arch: -0.04, hd: -0.12, hn: [17, -47], sa: -0.4, two: 1, cape: 1 },                                                        // 普攻：两手把杖往后收
    aStrike: { lean: 0.28, bx: 3, hd: 0.08, jaw: 1, hn: [33, -43], sa: 1.0, two: 1, fn: [10, -2], cape: -1 },                                        // 杖头往前一捅，人头吐出一道血
    aFollow: { lean: 0.22, bx: 2, hd: 0.04, hn: [31, -43], sa: 0.72, two: 1, fn: [10, -2] },
    cRaise: { lean: -0.1, arch: -0.16, hd: -0.3, jaw: 1, hn: [23, -52], sa: -0.05, two: 1, cape: 1 },                                               // 血咒：两手举杖过头
    cLow: { lean: 0.04, arch: 0.02, by: 3, hd: -0.16, jaw: 0, hn: [24, -47], sa: -0.02, two: 1, fn: [9, -2], ff: [-8, -2], cape: -1 },               // 半蹲念咒的下半拍
    cPlant: { lean: 0.3, arch: 0.12, bx: 4, by: 3, hd: 0.14, jaw: 2, hn: [30, -41], sa: 0.04, two: 1, fn: [11, -2], ff: [-9, -2], cape: -2 },        // 把杖插进地里
    bDraw: { lean: 0.1, hd: 0.08, hf: [-6, -30], an: -1.6, sn: 0.2 },                                                                                // 放血：从腰后拔骨刀
    bRaise: { lean: -0.14, arch: -0.16, hd: -0.26, jaw: 1, hf: [6, -68], an: -1.3, sn: 0.2, knife: 1, hn: [24, -42], sa: -0.14, cape: 1 },
    bSlash: { lean: 0.4, arch: 0.14, bx: 5, by: 2, hd: 0.14, jaw: 2, hf: [30, -18], an: 0.8, sn: 0.2, knife: 1, fn: [13, -2], ff: [-8, -2], hn: [22, -44], sa: -0.3, cape: -2 },
    bFlick: { lean: 0.16, bx: 2, hd: 0.04, hf: [22, -27], an: 0.2, sn: 0.2, knife: 1, fn: [10, -2], hn: [25, -43], sa: -0.1 },
    rCrouch: { lean: 0.36, arch: 0.18, by: 5, hd: 0.35, hf: [14, -52], an: -1.9, sn: 1, hn: [26, -36], sa: 0.12, fn: [9, -2], ff: [-8, -2], cape: -1 },   // 怒吼：缩成一团、远手抓着面具
    rRoar: { lean: -0.2, arch: -0.3, by: -2, hd: -0.5, jaw: 2, hf: [-12, -56], an: -2.4, sn: 1, hn: [26, -54], sa: -0.1, fn: [11, -2], ff: [-9, -2], orbR: 1.9, cape: 2 },
    hurt: { lean: -0.18, arch: -0.08, bx: -3, hd: -0.3, jaw: 1, hf: [12, -44], an: -1.0, sn: 1, hn: [22, -42], sa: -0.25 },
    dKneel: { lean: 0.3, arch: 0.2, by: 9, hd: 0.35, jaw: 1, hf: [5, -32], an: 0.2, sn: 0.2, hn: [26, -28], sa: 0.3, fn: [7, -2], ff: [-10, -2] },   // 捂胸口、拄着杖跪下
    dFall: { lean: 1.45, arch: 0.1, by: 17, bx: 2, hd: 0.2, jaw: 0, hf: [42, -4], an: 0.1, sn: 1, hn: [34, -4], sa: 1.2, fn: [2, -2], ff: [-9, -2], cape: -2 },
  };
  const NUM = ['bx', 'by', 'lean', 'arch', 'hd', 'jaw', 'sa', 'two', 'an', 'sn', 'cape', 'orbR', 'orbF'], VEC = ['fn', 'ff', 'hn', 'hf'], DIS = ['knife', 'ebn', 'ebf'];

  const P = {};
  const FIELDS = ['st', 'bx', 'by', 'lean', 'arch', 'hd', 'jaw', 'sa', 'two', 'an', 'sn', 'cape', 'orbR', 'orbF', 'fnx', 'fny', 'ffx', 'ffy', 'hnx', 'hny', 'hfx', 'hfy',
    'knife', 'ebn', 'ebf', 'orb', 'orbH', 'drop', 'sdrop', 'eyes', 'glow', 'rim', 'flash', 'dq', 'fth', 'drip'];
  function base() { P.st = 0; P.orb = 0; P.orbH = 0; P.drop = 0; P.sdrop = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.fth = 0; P.drip = 0; P.mx = 0; P.flip = 0; setK(K.idle, K.idle, 0); }
  const val = (o, f) => (o[f] != null ? o[f] : D0[f]);
  function setK(a, b, q) {
    for (const f of NUM) { const va = val(a, f); P[f] = va + (val(b, f) - va) * q; }
    for (const f of VEC) { const va = val(a, f), vb = val(b, f); P[f + 'x'] = va[0] + (vb[0] - va[0]) * q; P[f + 'y'] = va[1] + (vb[1] - va[1]) * q; }
    for (const f of DIS) P[f] = q < 0.5 ? val(a, f) : val(b, f);
  }
  // 巫舞步：8 帧一圈（12 fps，2/3 秒）。膝盖抬得很高，两只脚差半圈；每次落脚身子一沉，杖跟着一拄
  const CYC = [[4, 0], [1, 0], [-2, 0], [-4, 0], [-4, 3], [-1, 7], [3, 7], [5, 3]];
  function walk(f) {
    f = ((f % 8) + 8) % 8; setK(K.idle, K.idle, 0);
    const a = CYC[f], b = CYC[(f + 4) % 8];
    P.fnx = 8 + a[0]; P.fny = -2 - a[1]; P.ffx = -5 + b[0]; P.ffy = -2 - b[1];
    P.by = [2, 1, 0, -1, 2, 1, 0, -1][f]; P.lean = 0.2 + [0.04, 0.02, 0, 0, 0.04, 0.02, 0, 0][f]; P.hd = [0.08, 0.04, -0.04, -0.06, 0.08, 0.04, -0.04, -0.06][f];
    P.hnx = 32 + [2, 1, 0, -1, -2, -1, 0, 1][f]; P.hny = -44 + [2, 0, -2, -3, -2, 0, 1, 2][f]; P.sa = [0.14, 0.1, 0.02, -0.04, -0.06, -0.02, 0.06, 0.12][f];
    P.hfx = 8 + b[0] * 1.2; P.hfy = -28 - b[1] * 0.6; P.an = 1.1; P.cape = [-1, -2, -2, -1, -1, -2, -2, -1][f]; P.fth = f & 1;
  }
  const trem = (f12, a) => { const s = f12 & 1 ? 1 : -1; P.bx += s * a * 0.5; P.hny += s * a * 0.5; P.hfy -= s * a * 0.5; };
  const seg = (tq, t0, t1, e) => (e || ease.inOut)(clamp01((tq - t0) / (t1 - t0)));

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.orb = (f12 % 24) / 24; P.drip = Math.floor(f12 / 2) % 6; P.fth = (f12 >> 2) & 1;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.hd = b ? 0.04 : 0; P.cape = b ? -1 : 0; P.eyes = (f12 % 9) === 0 ? 1 : 0;
      const lp = tt % DUR[IDLE];
      if (lp >= 1.2 && lp < 2.1) {                                                                                  // 待机个性：一小段巫舞（抬脚 → 跺地 → 抬 → 跺）
        const k = lp - 1.2, ph = k % 0.45, q = ph < 0.25 ? ease.out(ph / 0.25) : 1 - ease.in(clamp01((ph - 0.25) / 0.12));
        setK(K.dStomp, K.dLift, q); P.fth = ph < 0.25 ? 1 : 0; P.eyes = 0;
      }
      P.hny += b; P.hfy += b;
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { walk(Math.floor(tq * 12)); const w = walkDemo(tq, 22, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < 0.17) { setK(K.idle, K.aWind, seg(tq, 0, 0.17, ease.out)); P.glow = 1; }
      else if (tq < T_STRIKE) { setK(K.aWind, K.aWind, 0); trem(f12, 1); P.glow = 2; P.rim = 1; P.eyes = 2; }
      else if (tq < T_STRIKE + 1 / 12) { setK(K.aStrike, K.aStrike, 0); P.glow = 3; P.rim = 2; P.eyes = 2; }
      else if (tq < 0.42) { setK(K.aStrike, K.aFollow, seg(tq, T_STRIKE + 1 / 12, 0.42, ease.out)); P.glow = 2; P.rim = 1; }
      else { const q = seg(tq, 0.42, 0.72); setK(K.aFollow, K.idle, q); P.glow = q < 0.4 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = h < 1 / 12 ? 1 : 0; P.orbR = 1.25; }
      else if (h < 0.35) { setK(K.idle, K.hurt, 0.5); P.eyes = 1; P.orbR = 1.1; }
      else { const q = seg(h, 0.35, 0.5); setK(K.hurt, K.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    P.jaw = Math.round(P.jaw); geo(); focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { curse: 0, bloodlet: 1, roar: 2 };
  const T_STRIKE = 3 / 12;
  function skillPose(st, tq, f12) {
    const sh = f12 & 1;
    if (MV === 'curse') {
      if (st === CHARGE) {
        if (tq < 0.2) { setK(K.idle, K.cRaise, seg(tq, 0, 0.2, ease.out)); P.glow = 1; }
        else {                                                                                                        // 半蹲念咒：两拍一沉，血珠越收越紧
          const ph = Math.floor((tq - 0.2) * 12) % 6, q = [0, 0.5, 1, 1, 0.5, 0][ph]; setK(K.cRaise, K.cLow, q);
          P.orbF = Math.round(seg(tq, 0.2, 1.0, ease.lin) * 8) / 8; P.orbR = 1 - P.orbF * 0.5; P.glow = tq > 0.7 ? 2 + sh : 2; P.rim = tq > 0.7 ? 2 : 1; P.eyes = 2;
          if (tq > 0.8) trem(f12, 1);
        }
      } else if (st === CAST) {
        if (tq < 1 / 12) setK(K.cRaise, K.cPlant, 0.6); else setK(K.cPlant, K.cPlant, 0);
        P.orbR = tq < 2 / 12 ? 0 : 0.5 + seg(tq, 2 / 12, 0.5) * 0.5; P.glow = tq < 2 / 12 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2;
      } else {
        if (tq < 0.3) { setK(K.cPlant, K.cLow, seg(tq, 0, 0.3, ease.out)); P.two = 1; }                               // 拔杖
        else { setK(K.cLow, K.idle, seg(tq, 0.3, 0.65)); P.by += (Math.floor(tq * 6) & 1); }                          // 喘粗气
        P.glow = tq < 0.2 ? 1 : 0;
      }
    } else if (MV === 'bloodlet') {
      if (st === CHARGE) {
        if (tq < 0.18) { setK(K.idle, K.bDraw, seg(tq, 0, 0.18, ease.out)); P.glow = 1; }
        else if (tq < 0.36) { setK(K.bDraw, K.bRaise, seg(tq, 0.18, 0.36, ease.out)); P.knife = 1; P.glow = 1; }
        else { setK(K.bRaise, K.bRaise, 0); trem(f12, 1); P.orbF = Math.round(seg(tq, 0.36, 0.75, ease.lin) * 6) / 6; P.orbR = 1 - P.orbF * 0.4; P.glow = 2 + (tq > 0.6 ? sh : 0); P.rim = tq > 0.6 ? 2 : 1; P.eyes = 2; }
      } else if (st === CAST) {
        if (tq < 1 / 12) setK(K.bRaise, K.bSlash, 0.65); else setK(K.bSlash, K.bSlash, 0);
        P.orbR = tq < 2 / 12 ? 0 : 0.6; P.glow = tq < 2 / 12 ? 3 : 2; P.rim = tq < 1 / 12 ? 3 : 2; P.eyes = 2;
      } else {
        if (tq < 0.2) setK(K.bSlash, K.bFlick, seg(tq, 0, 0.2, ease.out));
        else if (tq < 0.3) { setK(K.bFlick, K.bFlick, 0); P.hfy += sh ? -2 : 1; P.an += sh ? -0.4 : 0.2; }               // 甩刀上的血
        else if (tq < 0.45) { setK(K.bFlick, K.bDraw, seg(tq, 0.3, 0.45)); P.knife = 1; }
        else setK(K.bDraw, K.idle, seg(tq, 0.45, 0.6));
        P.orbR = 0.6 + seg(tq, 0, 0.5) * 0.4; P.glow = tq < 0.15 ? 1 : 0;
      }
    } else {   // roar：半血的血咒蔓延（怒吼）
      if (st === CHARGE) { setK(K.idle, K.rCrouch, seg(tq, 0, 0.25, ease.out)); if (tq > 0.2) trem(f12, 1.5); P.orbR = 1 - seg(tq, 0, 0.4) * 0.45; P.glow = tq > 0.25 ? 2 : 1; P.rim = 1; P.eyes = tq > 0.3 ? 2 : 1; }
      else if (st === CAST) {
        if (tq < 2 / 12) setK(K.rCrouch, K.rRoar, seg(tq, 0, 2 / 12, ease.out)); else { setK(K.rRoar, K.rRoar, 0); if (sh) trem(f12, 1.2); }
        if (tq > 0.45) { P.hd = -0.5 + (sh ? 0.06 : 0); P.orbR = 1.9 + (sh ? 0.1 : 0); }
        P.glow = tq < 0.3 ? 3 : 2; P.rim = tq < 0.25 ? 3 : 2; P.eyes = 2;
      } else { setK(K.rRoar, K.idle, seg(tq, 0, 0.45)); P.glow = tq < 0.2 ? 1 : 0; P.eyes = tq < 0.2 ? 2 : 0; }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { setK(K.hurt, K.hurt, 0); P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.orbR = 1.2; return; }
    P.drop = Math.round(clamp01((d - 0.45) / 0.5) * 8) / 8; P.eyes = (f12 % 3) ? 1 : 0;
    if (d < 0.85) { setK(K.hurt, K.dKneel, seg(d, 0.3, 0.6, ease.out)); if (d > 0.6) trem(f12, 1.2); return; }         // 捂胸口、膝盖一软、跪下
    setK(K.dKneel, K.dFall, seg(d, 0.85, 1.25, ease.in)); P.sdrop = Math.round(seg(d, 0.8, 1.15, ease.in) * 6) / 6;
    if (d > 1.2) P.eyes = 3;                                                                                           // 面具磕在地上，眼窝灭了
    if (d > 1.25 && d < 1.4) P.by += 1;
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(HIP[0], HIP[1], P.lean); }
  function torsoXf() { bodyXf(); B.rot(WAIST[0], WAIST[1], P.arch); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function limb(r, tgt, l1, l2, bend) { const kn = B.ik(r, tgt, l1, l2, bend), dd = Math.hypot(tgt[0] - kn[0], tgt[1] - kn[1]) || 1; return [kn, [kn[0] + (tgt[0] - kn[0]) / dd * Math.min(dd, l2), kn[1] + (tgt[1] - kn[1]) / dd * Math.min(dd, l2)]]; }
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  function geo() {
    bodyXf(); const rn = B.at(LN[0], LN[1]), rf = B.at(LF[0], LF[1]); L.hip = B.at(0, -27);
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.chest = B.at(3, -40); L.orbC = B.at(3, -39);
    headXf(); L.head = B.at(13, -59); L.eye = B.at(13.2, -60); L.mouth = B.at(13, -47); B.reset();
    [L.kn, L.an] = limb(rn, [P.fnx, P.fny], 12.5, 13, 1); [L.kf, L.af] = limb(rf, [P.ffx, P.ffy], 12.5, 13, 1); L.rn = rn; L.rf = rf;
    // 杖：近手握着（杖跟着手走，手够不到时也不脱手）；sdrop 时绕杖脚往前倒，最后平躺在地上
    [L.en, L.hn] = limb(L.shN, [P.hnx + P.bx, P.hny + P.by], 13.5, 13.5, P.ebn);
    if (P.sdrop > 0) { const b0 = [20, -1.5], a = P.sa + (PI / 2 - 0.04 - P.sa) * P.sdrop, d = [Math.sin(a), -Math.cos(a)]; L.sBot = b0; L.sDir = d; L.sGrip = [b0[0] + d[0] * ST_BOT, b0[1] + d[1] * ST_BOT]; }
    else { const d = [Math.sin(P.sa), -Math.cos(P.sa)], g = L.hn; L.sDir = d; L.sGrip = g; L.sBot = [g[0] - d[0] * ST_BOT, g[1] - d[1] * ST_BOT]; }
    const d = L.sDir; L.sTop = [L.sGrip[0] + d[0] * ST_TOP, L.sGrip[1] + d[1] * ST_TOP]; L.sHead = [L.sTop[0] + d[0] * 3.5, L.sTop[1] + d[1] * 3.5];
    let hf = [P.hfx + P.bx, P.hfy + P.by];
    if (P.two > 0 && !P.sdrop) hf = lerp(hf, [L.sGrip[0] - d[0] * 8, L.sGrip[1] - d[1] * 8], P.two);
    [L.ef, L.hf] = limb(L.shF, hf, 13.5, 13.5, P.ebf);
    L.kTip = [L.hf[0] + Math.cos(P.an) * 12, L.hf[1] + Math.sin(P.an) * 12];
  }
  // 汇聚点：血咒 / 普攻是杖顶的人头，放血是刀尖，怒吼是面具
  function focus() {
    let f = L.sHead;
    if (P.st === CHARGE || P.st === CAST) { if (MV === 'bloodlet') f = P.knife ? L.kTip : L.hf; else if (MV === 'roar') f = L.head; }
    else if (P.st === RECOVER && MV === 'curse') f = L.sHead;
    P.fx = f[0]; P.fy = f[1]; P.gx = f[0]; P.gy = f[1];
  }
  // 四颗血珠：绕着胸口转一个扁椭圆；orbF 往汇聚点收，orbR 放大 / 缩小，drop 掉到地上
  function orbAt(i) {
    const a = (i / 4 + P.orb) * PI * 2, R = P.orbR, c = L.orbC;
    let p = [c[0] + Math.cos(a) * 19 * R, c[1] + Math.sin(a) * 5 * R + Math.sin(a * 2 + i) * 1.5 - (R > 1.3 ? (R - 1) * 10 : 0)];
    if (P.orbF > 0) { const f = [P.fx, P.fy], q = clamp01(P.orbF * 1.25 - i * 0.08); p = lerp(p, f, q); p[0] += Math.cos(a) * 3 * (1 - q); }
    if (P.drop > 0) { const q = clamp01(P.drop * 1.6 - i * 0.2); p = [p[0] + (i - 1.5) * 4 * q, p[1] + (-1 - p[1]) * q * q]; }
    return { p, front: Math.sin(a) >= 0 || P.orbF > 0.4, a, down: P.drop > 0 && clamp01(P.drop * 1.6 - i * 0.2) >= 1 };
  }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);

  function drawOrbs(front) {
    if (P.st === DEATH && P.dq > 0.6) return;
    const hot = P.glow >= 2, n = 4;
    for (let i = 0; i < n; i++) {
      if (P.orbH && i === 0) continue;
      if (P.orbR <= 0.01 && !P.drop) continue;
      const o = orbAt(i); if (o.front !== front) continue;
      const [x, y] = o.p;
      if (o.down) { part(); B.reset(); B.ell(E, x, -0.5, 3, 0.9, 0, BLDD); B.ell(E, x - 0.5, -0.7, 1.4, 0.5, 0, BLD); continue; }   // 摔成的血洼
      part(); const tx = -Math.sin(o.a) * 2, ty = Math.cos(o.a) * 0.6;                                                                  // 拖在后面的一点血尾
      px(x - tx * 1.4, y - ty * 1.4 + 1, BLDD); px(x - tx * 0.8, y - ty * 0.8 + 0.5, BLDD);
      dot(x, y, hot ? 2.4 : 2, BLDD); dot(x - 0.3, y - 0.3, hot ? 1.6 : 1.2, BLD); px(x - 0.8, y - 0.8, BLDW); if (hot) px(x, y, BLDW);
      if (P.drip === i && !P.orbF) px(x, y + 3, BLD);                                                                                   // 偶尔滴下来一滴
    }
  }
  function drawCape() {
    torsoXf(); const s = P.cape;
    // 肩上的羽毛斗篷：从两肩垂到大腿，一片片羽毛往后飘
    part(); B.poly(E, [[-7, -48], [3, -48], [5, -44], [2, -38], [-4, -30], [-10 - s, -22], [-13 - s * 1.5, -21], [-12 - s, -30], [-10, -40]], CAPE);
    const tips = [[-4, -28], [-7 - s, -24], [-10 - s * 1.2, -21], [-13 - s * 1.5, -20], [-14 - s * 1.5, -25]];
    for (let i = 0; i < tips.length; i++) { const [x, y] = tips[i]; part(); B.strand(E, [[x + 3, y - 10], [x + 1 - s * 0.3, y - 4], [x - s * 0.5, y + 1]], 1.8, 0.6, i & 1 ? FEATHD : CAPE); B.ln(E, x + 2.5, y - 9, x - s * 0.4, y, FEATHD, 3); }
    B.ln(E, -8, -45, -12 - s, -26, CAPE, 3); B.ln(E, -5, -44, -7 - s, -30, CAPE, 7); B.ln(E, -2, -46, -3, -36, CAPE, 3);
  }
  function drawFeathers() {
    headXf(); const w = P.fth ? 0.06 : -0.02, j = P.jaw > 1 ? 0.08 : 0;
    // 羽冠：面具后面扇形的一圈长羽毛，血红和乌黑相间，羽根缠着骨珠
    const F = [[-0.2, 17], [-0.52, 19], [-0.84, 18.5], [-1.15, 16], [-1.45, 13]];
    F.forEach(([a0, l], i) => {
      const a = a0 + w * (i + 1) * 0.5 - j, b0 = [3, -64], tip = [b0[0] + Math.sin(a) * l, b0[1] - Math.cos(a) * l], m1 = [b0[0] + Math.sin(a + 0.08) * l * 0.55, b0[1] - Math.cos(a + 0.08) * l * 0.55];
      part(); B.strand(E, [b0, m1, tip], 1.1, 2.1, i & 1 ? FEATHD : FEATH); B.ln(E, b0[0], b0[1], tip[0], tip[1], i & 1 ? FEATH : FEATHD, i & 1 ? 2 : 3);
      B.px(E, tip[0], tip[1], BONES, 8); B.px(E, lerp(b0, tip, 0.8)[0], lerp(b0, tip, 0.8)[1], i & 1 ? BONES : FEATHD, i & 1 ? 6 : 2);   // 羽尖一点白、一道黑
    });
    part(); B.ell(E, 3, -64, 2.2, 1.8, 0, BONES); B.px(E, 2, -65, BONES, 9);                                              // 羽根的骨环
  }
  function drawDreads() {
    headXf(); const s = P.cape * 0.5;
    for (const [x0, y0, x1, y1, r] of [[2, -60, -4 - s, -45, 1.6], [4, -57, -1 - s, -43, 1.4], [0, -59, -6 - s, -48, 1.3]]) {
      part(); B.strand(E, [[x0, y0], [(x0 + x1) / 2 - 1, (y0 + y1) / 2], [x1, y1]], r, 0.8, HAIR); B.px(E, (x0 + x1) / 2 - 1, (y0 + y1) / 2 + 1, BONES, 7);
    }
  }
  function drawHorn(far) {
    headXf();
    if (far) { part(); B.strand(E, [[4, -66], [-1, -68.5], [-5, -72], [-7, -76.5], [-6, -80.5]], 2.4, 0.5, HORND); for (const [x, y] of [[0.5, -68.8], [-4, -71.5], [-6.6, -75]]) B.px(E, x, y, HORND, 2); return; }
    part(); B.strand(E, [[12, -66], [17, -68], [21.5, -71], [24, -75], [24, -79], [22, -81.5]], 3, 0.5, HORN);
    for (const [x, y] of [[16, -67.8], [20, -70], [23.2, -73.5]]) { B.px(E, x, y, HORN, 2); B.px(E, x - 0.5, y - 1, HORN, 8); }   // 角上一圈圈的纹
    B.px(E, 22, -81.5, HORN, 9); B.ln(E, 15, -69.2, 21, -72.2, HORN, 8); B.ln(E, 22.5, -74, 23, -78, HORN, 8);
    part(); B.ell(E, 12, -66, 2.4, 1.8, 0.4, BONE, 6); B.ln(E, 10.5, -67, 13.5, -65, PAINT);                            // 角根的骨箍 + 一道血
  }
  function drawMask() {
    headXf(); const e = P.eyes;
    // 巫医自己的下巴：面具下面露出来，嚎叫时张开
    part(); B.save(); B.rot(11, -50, P.jaw * 0.16);
    B.poly(E, [[9, -51], [18, -51], [19, -48.5], [17, -45.5], [12, -45], [9.5, -47]], SKIN); B.ln(E, 11, -45.8, 17, -46.3, SKIN, 3);
    B.ln(E, 12, -50, 12, -46, PAINT); B.ln(E, 15, -50, 15, -46.3, PAINT);                                                // 下巴上两道血纹
    B.restore();
    if (P.jaw) { part(); B.poly(E, [[11, -51], [19, -51], [18.5, -49 + P.jaw * 0.8], [12, -49 + P.jaw * 0.3]], SOCK); if (P.jaw > 1) { B.px(E, 13, -50, TOOTH, 7); B.px(E, 16, -50, TOOTH, 6); } }
    // 牛头骨：圆的颅顶 + 往前下方伸的长吻
    part(); B.ell(E, 9, -61, 8, 7, 0, BONE);
    B.poly(E, [[4, -57], [11, -67.5], [18, -65.5], [23, -60.5], [26.5, -55], [26, -51], [21, -50], [15, -51.5], [9, -54]], BONE);
    B.ln(E, 5, -66, 11, -67.8, BONE, 9); B.ln(E, 11, -67.8, 17, -66, BONE, 8); B.ln(E, 18, -64.5, 25, -56, BONE, 8); B.ln(E, 15, -53.5, 23.5, -51.2, BONE, 3); B.ln(E, 5, -56, 10, -53.5, BONE, 3);   // 眉骨高光、吻梁、颧骨沟
    B.ln(E, 3, -61, 6, -65, BONE, 2); B.ln(E, 7, -67, 9, -64, BONE, 2); B.px(E, 21, -60, BONE, 2); B.px(E, 21.6, -59, BONE, 3); B.px(E, 4, -58, BONE, 3);   // 裂纹
    // 眼窝：近大远小，里面烧着血光
    part(); B.ell(E, 13, -60, 3.2, 2.8, 0.2, SOCK); B.ell(E, 20, -62, 1.8, 2.1, 0.3, SOCK);
    if (e === 2) { B.ell(E, 13.2, -59.9, 2, 1.7, 0, BLD); B.px(E, 13.2, -60, BLDW); B.px(E, 14, -60.3, BLDW); B.px(E, 12.6, -59.4, BLDW); B.px(E, 20, -62, BLDW); B.px(E, 20.2, -61, BLD); B.px(E, 12.5, -63.2, BLD); B.px(E, 13.5, -64, BLDD); B.px(E, 19.6, -64.3, BLDD); }   // 烧起来，火苗冒出眼窝
    else if (e === 1) { B.px(E, 13.2, -59.8, BLDD); B.px(E, 20, -61.8, BLDD); }
    else if (e !== 3) { B.ell(E, 13.3, -59.9, 1.1, 1, 0, BLD); B.px(E, 13, -60.2, BLDW); B.px(E, 20, -62, BLD); B.px(E, 20, -61, BLDD); }
    // 鼻孔、一排上牙
    part(); B.ln(E, 24.2, -56.4, 24.8, -53.6, SOCK); B.ln(E, 22.8, -55.6, 23.2, -53.6, SOCK);
    for (let x = 16; x <= 25.5; x += 1.5) B.px(E, x, -50.6 + (x - 16) * 0.04, TOOTH, x > 23 ? 5 : 8);
    // 血画：额头一道手指抹的红纹、眼窝下挂三道血泪
    B.ln(E, 6, -65.5, 10, -66.5, PAINT); B.ln(E, 10, -66.5, 14, -64.8, PAINT); B.ln(E, 14, -64.8, 18, -65, PAINT); B.ln(E, 18, -65, 21, -62.8, PAINT);
    B.ln(E, 12, -57, 12, -54, PAINT); B.ln(E, 14.5, -57, 14.7, -53, PAINT); B.px(E, 14.7, -52.3, BLDD);
    // 挂在颅骨后面的骨坠
    part(); B.ln(E, 2.5, -58, 2, -52, HIDED, 3); B.px(E, 2, -51.5, TOOTH, 8); B.px(E, 2, -50.5, TOOTH, 6);
  }
  function drawLeg(k, far) {
    const r = L['r' + k], kn = L['k' + k], an = L['a' + k], m = far ? SKIND : SKIN;
    part(); capW(r[0], r[1], kn[0], kn[1], 2.7, 2.0, m); dot(kn[0], kn[1], 2.2, m, far ? 5 : 7);
    capW(kn[0], kn[1], an[0], an[1], 1.9, 1.25, m);
    for (const q of [0.35, 0.55]) { const p = lerp(kn, an, q); lnW(p[0] - 1.6, p[1] + 0.4, p[0] + 1.6, p[1] - 0.4, far ? BLDD : PAINT); }   // 小腿上两道血纹
    const kp = lerp(r, kn, 0.85); lnW(kp[0] - 2, kp[1], kp[0] + 2, kp[1], far ? BONED : BONES, far ? 4 : 7);                           // 膝上的骨珠圈
    const ax = an[0], ay = an[1];
    part(); for (let i = -2; i <= 2; i++) px(ax + i, ay - 1.2 + Math.abs(i) * 0.2, far ? BONED : (i & 1 ? TOOTH : BONES), far ? 4 : 7);   // 脚踝上的骨珠串
    part(); polyW([[ax - 2.5, ay - 0.5], [ax + 1.5, ay - 1], [ax + 5.5, ay + 0.8], [ax + 6.5, ay + 2], [ax - 2.5, ay + 2]], m);          // 光脚、长脚趾
    lnW(ax + 3, ay + 1, ax + 3, ay + 2, m, 3); px(ax + 6.5, ay + 2, far ? BONED : TOOTH, far ? 4 : 7); px(ax + 4.5, ay + 2, far ? BONED : TOOTH, far ? 3 : 5);
  }
  function drawLoin(back) {
    bodyXf(); const s = P.cape;
    if (back) { for (const [x, l] of [[-7, 12], [-5, 14], [-3, 11]]) { part(); B.strand(E, [[x, -29], [x - 1.5 - s * 0.5, -29 + l * 0.6], [x - 2 - s, -29 + l]], 1.4, 1, HIDED); } return; }
    part(); B.poly(E, [[-8, -31.5], [7, -31.5], [7.5, -28], [-8.5, -28]], HIDE); B.ln(E, -8, -31, 7, -31, HIDE, 8);           // 皮腰带
    for (const x of [-6, -3, 0, 3, 6]) B.px(E, x, -29.5, x === 0 ? TOOTH : BONES, 7);
    part(); B.poly(E, [[1, -28.5], [7.5, -28.5], [8.5 + s * 0.3, -18], [6, -16.5], [3.5, -17.5], [1.5, -18]], HIDE);           // 前面的皮裙片
    for (let x = 2; x <= 8; x += 1.5) B.ln(E, x, -18, x + 0.2 + s * 0.3, -16 + ((x * 2) & 1), HIDE, 3);                       // 流苏
    B.ln(E, 2, -27, 2.5, -19, HIDE, 8); B.ell(E, 5, -23.5, 1.6, 1.1, 0, PAINT); B.px(E, 5, -23.5, SOCK);                       // 皮裙上画的一只血眼
    part(); B.strand(E, [[-6, -29], [-8 - s * 0.5, -23], [-8 - s, -18]], 1.4, 0.6, FEATH); B.px(E, -8 - s, -18, BONES, 8);     // 挂在腰上的一根羽毛
    if (!P.knife) { part(); B.ln(E, -2, -27, -5, -33, BONES, 7); B.ln(E, -2.6, -28, -5.6, -33.5, BONES, 3); B.px(E, -5.5, -34, TOOTH, 8); }   // 插在腰后的骨刀柄
  }
  function drawTorso() {
    torsoXf();
    part(); B.poly(E, [[-7, -30], [6, -30], [8, -35], [9, -41], [8, -46.5], [3, -49.5], [-4, -48.5], [-7.5, -44], [-8.5, -37]], BODY);   // 干瘦的上身
    for (let i = 0; i < 4; i++) { const y = -43 + i * 2.6; B.ln(E, 1 + i * 0.4, y, 7.5, y - 0.8, BODY, 3); B.ln(E, 2 + i * 0.4, y + 1, 7, y + 0.3, BODY, 7); }   // 一根根凸出来的肋骨
    B.ln(E, 1, -47, 7, -46, BODY, 8); B.ln(E, 5, -33, 7, -34, BODY, 3); B.ln(E, -6, -44, -7, -35, BODY, 3);                  // 锁骨、瘪下去的肚子
    B.ln(E, 0, -36, 3, -33, PAINT); B.ln(E, 3, -33, 6, -36, PAINT); B.ln(E, 0.5, -38.5, 3, -36.2, PAINT); B.ln(E, 3, -36.2, 6.5, -38.8, PAINT);   // 胸腹的血纹（两道 V）
    // 兽牙项链
    part(); const nk = B.bez([-2, -48], [4, -40], [8.5, -46.5], 8);
    for (let i = 0; i < nk.length - 1; i++) B.ln(E, nk[i][0], nk[i][1], nk[i + 1][0], nk[i + 1][1], HIDED, 3);
    for (let i = 1; i < nk.length - 1; i++) { B.px(E, nk[i][0], nk[i][1] + 1, TOOTH, i & 1 ? 8 : 6); B.px(E, nk[i][0], nk[i][1] + 2, TOOTH, i & 1 ? 6 : 4); }
    // 挂小骷髅的护符
    part(); const fk = B.bez([-3, -47], [3, -32], [8, -45], 8); for (let i = 0; i < fk.length - 1; i++) B.ln(E, fk[i][0], fk[i][1], fk[i + 1][0], fk[i + 1][1], HIDED, 4);
    part(); B.ell(E, 4, -36.5, 1.9, 1.7, 0, BONES); B.px(E, 3.4, -36.8, SOCK); B.px(E, 4.8, -36.8, SOCK); B.ln(E, 3.4, -35, 4.8, -35, BONES, 3); B.px(E, 3.5, -38, BONES, 9);
    part(); B.ell(E, 7.2, -39.5, 1.2, 1.5, 0, HIDE); B.px(E, 7.2, -41, PAINT);                                                  // 一只小药袋
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, el = far ? L.ef : L.en, h = far ? L.hf : L.hn, m = far ? SKIND : SKIN;
    part(); capW(sh[0], sh[1], el[0], el[1], far ? 2.2 : 2.5, 1.8, m); dot(el[0], el[1], 1.8, m, far ? 5 : 7);
    capW(el[0], el[1], h[0], h[1], 1.7, 1.25, m);
    const s1 = lerp(sh, el, 0.45); lnW(s1[0] - 1.5, s1[1] - 1, s1[0] + 1.5, s1[1] + 1, far ? BLDD : PAINT);                          // 上臂一道血纹
    for (const q of [0.3, 0.5]) { const p = lerp(el, h, q); lnW(p[0] - 1.3, p[1] - 0.8, p[0] + 1.3, p[1] + 0.8, far ? BLDD : PAINT); }
    const w = lerp(el, h, 0.8); part(); dot(w[0], w[1], 1.5, far ? BONED : BONES); px(w[0] - 0.5, w[1] - 1, far ? BONED : TOOTH, far ? 4 : 8);   // 骨镯
    if (!far) {                                                                                                                         // 近肩扣着一块兽下颌骨
      part(); const a = lerp(sh, el, 0.05); polyW([[a[0] - 3.5, a[1] - 2.5], [a[0] + 2.5, a[1] - 3.2], [a[0] + 4, a[1] - 0.5], [a[0] + 2, a[1] + 1.5], [a[0] - 3, a[1] + 1]], BONES);
      for (let i = 0; i < 3; i++) px(a[0] - 2 + i * 1.8, a[1] + 1.4, TOOTH, 8); px(a[0] - 1, a[1] - 2.4, BONES, 9);
      if (P.sdrop) { part(); dot(h[0], h[1], 1.9, m); px(h[0], h[1] - 1, m, 8); return; }
      part(); dot(h[0], h[1], 2.1, m); px(h[0] - 1, h[1] - 1, m, 8); const d = L.sDir; lnW(h[0] - d[1] * 1.5, h[1] + d[0] * 1.5, h[0] + d[1] * 1.5, h[1] - d[0] * 1.5, m, 3);   // 握杖的拳
      return;
    }
    if (P.two > 0.5) { part(); dot(h[0], h[1], 1.9, m); px(h[0], h[1] - 1, m, 7); return; }
    part(); dot(h[0], h[1], 1.9, m); px(h[0], h[1] - 1, m, 7);
    const a = P.an, spr = 0.2 + 0.45 * P.sn;
    if (P.knife) { drawKnife(h, a); return; }
    for (let i = 0; i < 4; i++) { const fa = a + (i - 1.5) * spr, k1 = [h[0] + Math.cos(fa) * 3, h[1] + Math.sin(fa) * 3], k2 = [k1[0] + Math.cos(fa + 0.5) * 2.5, k1[1] + Math.sin(fa + 0.5) * 2.5];
      part(); capW(h[0], h[1], k1[0], k1[1], 0.8, 0.6, m); lnW(k1[0], k1[1], k2[0], k2[1], m, 4); px(k2[0], k2[1], SOCK); }          // 长指头、黑指甲
  }
  function drawKnife(h, a) {   // 弯的骨刀：柄缠皮、刃是磨尖的兽骨，吸了血发红
    const d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]], at = (u, v) => [h[0] + d[0] * u + n[0] * v, h[1] + d[1] * u + n[1] * v];
    part(); const b0 = at(-3, 0), b1 = at(2, 0); capW(b0[0], b0[1], b1[0], b1[1], 1, 1, HIDE);
    part(); polyW([at(1.5, -1.3), at(6, -2), at(10, -1.6), at(12.5, 0.4), at(9, 0.4), at(5, 1.1), at(1.5, 1.2)], BONE);
    const e0 = at(2, -1.3), e1 = at(11.5, -0.6); lnW(e0[0], e0[1], e1[0], e1[1], P.glow >= 2 ? BLD : BONE, P.glow >= 2 ? 0 : 8);
    const tp = at(12.5, 0.4); px(tp[0], tp[1], P.glow >= 2 ? BLDW : BONE, 9);
    if (P.glow >= 1) { const q = at(6, 1.5); px(q[0], q[1] + 1 + (P.drip & 1), BLD); }                                                // 刀上往下滴的血
    part(); dot(h[0], h[1], 2, SKIND); px(h[0], h[1] - 1, SKIND, 7);
  }
  function drawStaff() {
    const b = L.sBot, t = L.sTop, d = L.sDir, n = [-d[1], d[0]], at = (u, v) => [L.sGrip[0] + d[0] * u + n[0] * v, L.sGrip[1] + d[1] * u + n[1] * v];
    part(); capW(b[0], b[1], t[0], t[1], 1.2, 1.5, WOOD);
    for (const u of [-24, -14, 8, 17]) { const p = at(u, 0.6); px(p[0], p[1], WOOD, 8); const q = at(u + 1, -0.6); px(q[0], q[1], WOOD, 2); }   // 扭曲的木节
    for (const u of [20, 22, 24]) { const a0 = at(u, -1.6), a1 = at(u + 1, 1.6); lnW(a0[0], a0[1], a1[0], a1[1], PAINT); }                        // 缠着的红布
    const sw = P.cape * 0.8 + (P.fth ? 1 : 0);
    part(); const r0 = at(22, -1.2); B.strand(E, [r0, [r0[0] - 3 - sw, r0[1] + 3], [r0[0] - 5 - sw * 1.5, r0[1] + 8]], 0.9, 0.6, FEATH);
    const r1 = at(21, -1); B.strand(E, [r1, [r1[0] - 1 - sw, r1[1] + 4], [r1[0] - 2 - sw, r1[1] + 10]], 0.8, 0.5, FEATHD);
    // 吊着的血葫芦：裂缝里透红光
    const gc = at(19, 4.5), cd = at(22, 1.2);
    part(); lnW(cd[0], cd[1], gc[0], gc[1] - 2.5, HIDED, 3);
    part(); B.reset(); B.ell(E, gc[0], gc[1] + 0.5, 2.3, 2.9, 0, HIDE); B.ell(E, gc[0], gc[1] - 2.8, 1.2, 1, 0, HIDE, 7);
    lnW(gc[0] - 0.5, gc[1] - 1, gc[0] + 0.8, gc[1] + 2, P.glow ? BLDW : BLD); px(gc[0] + 1, gc[1] + 3.6 + (P.drip % 3), BLD);
    // 杖顶的干缩人头：缝眼、缝嘴、一绺长黑发，嘴里还在滴血
    const hc = L.sHead;
    part(); B.strand(E, [[hc[0] - 1, hc[1] - 2], [hc[0] - 4 - sw, hc[1] + 3], [hc[0] - 5 - sw, hc[1] + 9]], 1.4, 0.6, HAIR);
    part(); dot(hc[0], hc[1], 4, SHRK); px(hc[0] + 3.2, hc[1] + 0.5, SHRK, 6); px(hc[0] - 1, hc[1] - 3, SHRK, 8); px(hc[0] + 1, hc[1] - 2.6, SHRK, 7);
    const ey = P.glow >= 2 ? BLDW : P.glow ? BLD : SOCK;
    lnW(hc[0] + 0.3, hc[1] - 0.8, hc[0] + 1.8, hc[1] - 0.2, ey); lnW(hc[0] + 2.4, hc[1] - 1, hc[0] + 3.2, hc[1] - 0.5, ey);             // 缝着的眼
    lnW(hc[0] + 1, hc[1] + 1.8, hc[0] + 3, hc[1] + 1.8, SOCK); for (const x of [1.4, 2.6]) px(hc[0] + x, hc[1] + 1.2, BONES, 7);        // 缝着的嘴
    px(hc[0] + 2, hc[1] + 2.8 + (P.drip % 3), BLD); if (P.glow >= 2) dot(hc[0], hc[1], 0.6, BLDW);
    part(); lnW(hc[0] - 3, hc[1] - 3.5, hc[0] - 5.5, hc[1] - 7, FEATH); lnW(hc[0] - 2, hc[1] - 3.5, hc[0] - 3, hc[1] - 7.5, FEATHD);          // 插在人头上的两根羽毛
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawOrbs(false); drawCape(); drawFeathers(); drawHorn(1); drawDreads();
    drawArm(1);
    drawLoin(1); drawLeg('f', 1); drawLeg('n', 0);
    drawTorso(); drawLoin(0);
    if (!P.sdrop) drawStaff();                                                                                         // 杖在面具后面：举杖、插杖时也不挡脸
    drawMask(); drawHorn(0);
    if (P.sdrop) drawStaff();
    drawArm(0); drawOrbs(true);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    let on = 0;
    if (P.glow >= 1) { LIGHT[0].x = P.fx * z + spr.ox; LIGHT[0].y = P.fy * z + spr.oy; LIGHT[0].r = (4 + P.glow * 4) * z; on = 1; } else LIGHT[0].r = 0;
    if (P.eyes === 2) { LIGHT[1].x = L.eye[0] * z + spr.ox; LIGHT[1].y = L.eye[1] * z + spr.oy; LIGHT[1].r = 7 * z; on = 1; } else LIGHT[1].r = 0;
    RIM.lights = on ? LIGHT : null;
    bake(spr, RIM);
  }
  // 立绘：半血嚎叫那一刻（站直后仰、杖举上天、血珠炸开），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 3 / 12, 5 / 12); P.glow = 2; P.rim = 2; P.hd = -0.3; geo(); focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(12, -60); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 18 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'curse'; poseAt(IDLE, 0.4, 2 / 12); P.eyes = 2; P.glow = 1; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(12, -60); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 18 * 2]; return PSPR; }   // 头像：待机侧脸、眼窝烧着

  // ───── 特效 ─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let poolT = 9, lastF = -1;
  const splash = (x, y, n, vx, vy, s) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, y, vx + (Math.random() - 0.5) * (s || 90), vy - Math.random() * 70, 0.5 + Math.random() * 0.4, BLOOD, { g: 300, floor: HY, sz: Math.random() < 0.3 ? 2 : 1 }); };
  function strikeFx() {
    const h = L.sHead, x = sx(h[0]), y = sy(h[1]);
    fx.beam(x, y, x + 50, y + 8, 1, BLOOD, 0.14, 2); fx.cross(x + 50, y + 8, 6, BLOOD, 0.16); fx.cross(x, y, 5, BLOOD, 0.12);
    burst(x, y, 12, 40, 120, 0.15, 0.35, BLOOD, 10); splash(x + 46, y + 8, 8, 60, -20); hitDummy(1, 1); shake(0.15, 2);
  }
  function curseFx() {
    const x = sx(L.sBot[0]), hx = sx(L.sHead[0]), hy = sy(L.sHead[1]);
    ring(x, HY - 2, 1, CURSE); ring(hx, hy, 0, BLOOD); fx.circle(x + 10, HY, 58, 11, CURSE, 1.2, -1, 0); fx.circle(x + 10, HY, 36, 7, BLOOD, 0.9, 1, 0);
    fx.pillar(hx, hy - 70, hy, 3, BLOOD, 0.5, 2); fx.wave(x, HY, 1, 50, 7, CURSE, 0.55, 2); fx.wave(x, HY, -1, 36, 5, CURSE, 0.5, 2);
    fx.crack(x, HY, 20, 1, CURSE, 1.2); fx.crack(x, HY, 14, -1, CURSE, 1.2);
    burst(hx, hy, 26, 50, 150, 0.25, 0.6, BLOOD, 30); splash(x, HY - 3, 16, 20, -120, 160); burst(x, HY - 1, 16, 30, 90, 0.3, 0.7, FXI.dust, 12);
    flash(0.1); shake(0.35, 3); hitDummy(1, 1); poolT = 0;
  }
  function slashFx() {
    const h = L.hf, x = sx(h[0]), y = sy(h[1]);
    fx.slash(sx(L.shF[0]), sy(L.shF[1]), 24, -0.2, 2.6, BLOOD, 0.22, 3, 2);
    fx.wave(x, HY, 1, 70, 6, BLOOD, 0.5, 2); fx.beam(x, HY - 3, x + 80, HY - 3, 1, BLOOD, 0.22, 2); fx.crack(x, HY, 30, 1, BLOOD, 1.0);
    splash(x, y, 18, 140, -60, 80); burst(x, y, 16, 40, 130, 0.2, 0.45, BLOOD, 12);
    flash(0.07); shake(0.3, 3); hitDummy(1, 1); poolT = 0;
  }
  function roarFx() {
    const c = L.head, x = sx(c[0]), y = sy(c[1]);
    ring(x, y, 1, BLOOD); ring(sx(4), HY - 2, 1, CURSE); fx.circle(sx(4), HY, 80, 14, CURSE, 1.3, 1, 0); flash(0.12); shake(0.35, 3);
    for (let i = 0; i < 4; i++) { const a = i / 4 * PI * 2 + 0.4; fx.link(sx(L.orbC[0]), sy(L.orbC[1]), sx(L.orbC[0]) + Math.cos(a) * 44, sy(L.orbC[1]) + Math.sin(a) * 16, BLOOD, 0.3, 2); }
    for (let i = 0; i < 34; i++) { const a = -PI / 2 + (Math.random() - 0.5) * 3.2, v = 90 + Math.random() * 130; spawnX(K_PHYS, sx(L.orbC[0]), sy(L.orbC[1]), Math.cos(a) * v, Math.sin(a) * v, 0.8 + Math.random() * 0.5, BLOOD, { g: 200, floor: HY, sz: i % 4 ? 1 : 2 }); }
    burst(x, y, 20, 50, 130, 0.2, 0.5, BLOOD, 20);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'curse') { curseFx(); sfx('boss', { k: 'bwCurse', w: 1 }); sfx('boss', { k: 'slam', w: 0.7 }); sfx('impact', { pal: 'blood', w: 0.9 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else if (MV === 'bloodlet') { slashFx(); sfx('boss', { k: 'bwSlash', w: 1 }); sfx('swing', { kind: 'slash', w: 0.9 }); sfx('impact', { pal: 'blood', w: 0.8 }); releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 }); }
      else { roarFx(); sfx('boss', { k: 'bwHowl', w: 1 }); sfx('boss', { k: 'roar', w: 0.6 }); sfx('impact', { pal: 'blood', w: 0.9 }); }
    }
    if (s === CHARGE) {
      lastF = -1;
      if (MV === 'curse') { fx.circle(sx(2), HY, 30, 6, CURSE, 1.1, 1, 0); sfx('boss', { k: 'bwChant', w: 1 }); }
      else if (MV === 'bloodlet') sfx('boss', { k: 'bwDraw', w: 1 });
      else { sfx('boss', { k: 'growl', w: 0.6 }); sfx('boss', { k: 'heartbeat', w: 0.8 }); }
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'bwDrip', w: 0.6 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'smash', w: 0.7 }); sfx('boss', { k: 'bwSplat', w: 1 }); sfx('hit', { mat: 'flesh', w: 0.6 }); }
    if (s === CHARGE && MV === 'curse' && (t === 0.3 || t === 0.6 || t === 0.9)) { sfx('boss', { k: 'bwDrum', w: t === 0.9 ? 1 : 0.7 }); sfx('boss', { k: 'bwRattle', w: 0.5 }); const hc = L.sHead; burst(sx(hc[0]), sy(hc[1]), 6, 20, 60, 0.2, 0.4, BLOOD, 10); }
    if (s === CHARGE && MV === 'bloodlet' && t === 0.2) { const h = L.kTip; fx.cross(sx(h[0]), sy(h[1]), 5, BLOOD, 0.15); sfx('boss', { k: 'bwDraw', w: 0.6 }); }
    if (s === CHARGE && MV === 'bloodlet' && t === 0.45) sfx('boss', { k: 'heartbeat', w: 1 });
    if (s === CHARGE && MV === 'roar' && t === 0.2) sfx('boss', { k: 'bwRattle', w: 0.8 });
    if (s === CAST && MV === 'roar' && t === 0.25) { ring(sx(L.head[0]), sy(L.head[1]), 1, BLOOD); shake(0.25, 2); }
    if (s === RECOVER && t === 0.1) {
      if (MV === 'curse') { const b = L.sBot; burst(sx(b[0]), HY - 1, 10, 20, 70, 0.3, 0.6, FXI.dust, 12); sfx('boss', { k: 'bwRattle', w: 0.6 }); }
      else if (MV === 'bloodlet') { const h = L.kTip; splash(sx(h[0]), sy(h[1]), 6, 50, -40, 60); sfx('boss', { k: 'bwDrip', w: 0.8 }); }
    }
    if (s === DEATH && t === INCOMING + 0.34) sfx('boss', { k: 'bwDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.8) { for (let i = 0; i < 4; i++) splash(sx(L.orbC[0] + (i - 1.5) * 4), HY - 2, 4, 0, -30, 60); sfx('boss', { k: 'bwSplat', w: 0.7 }); }
    if (s === DEATH && t === INCOMING + 1.2) {
      for (let i = 0; i < 26; i++) spawn(K_DUST, sx(-6 + Math.random() * 60), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust);
      burst(sx(L.head[0]), HY - 3, 10, 20, 60, 0.3, 0.5, FXI.dust, 10); shake(0.2, 2); sfx('fall', { w: 0.9 }); sfx('boss', { k: 'thud', w: 0.8 }); sfx('boss', { k: 'bwRattle', w: 0.7 });
    }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 32; i++) spawn(K_RISE, sx(-10 + Math.random() * 64), HY - 3 - Math.random() * 22, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, BLOOD); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[], [], [0.08, T_STRIKE], [0.2, 0.3, 0.45, 0.6, 0.9], [0.25], [0.1], [], [INCOMING + 0.34, INCOMING + 0.8, INCOMING + 1.2, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    poolT += dt;
    if (state === MOVE) {
      const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f;
        if (f === 0 || f === 4) { const a = f === 0 ? L.an : L.af, x = sx(a[0] + 2); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24 - (P.flip ? -8 : 8), -3 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); sfx('step', { w: 0.7 }); if (f === 0) sfx('boss', { k: 'bwRattle', w: 0.3 }); }
        if (f === 0) spawn(K_BURST, sx(L.sBot[0]), HY - 1, (Math.random() - 0.5) * 30, -20, 0.2, BLOOD); } }
    if (state === CHARGE && P.glow && Math.random() < 0.5) {   // 蓄力：血滴从四周螺旋汇向汇聚点
      const a = Math.random() * 6.2832, r = 14 + Math.random() * 16, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, BLOOD, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'curse' && Math.random() < 0.3) spawn(K_RISE, sx(-24 + Math.random() * 52), HY - 1, 0, -30 - Math.random() * 20, 0.4, CURSE);   // 法阵往上冒血气
    if (state === CAST && MV === 'roar' && Math.random() < 0.35) spawn(K_EMBER, sx(L.eye[0] + (Math.random() - 0.5) * 4), sy(L.eye[1] - 2), 0, -18, 0.35, BLOOD);
    if (poolT < 1.2 && Math.random() < 0.4) spawn(K_EMBER, sx(20 + Math.random() * 50), HY - 1, 0, -10 - Math.random() * 10, 0.35, BLOOD);   // 地上的血还在冒泡
    if ((state === IDLE || state === MOVE) && Math.random() < 0.05) { const hc = L.sHead; spawnX(K_PHYS, sx(hc[0] + 2), sy(hc[1] + 3), 0, 10, 0.6, BLOOD, { g: 200, floor: HY }); }   // 人头嘴里滴血
    if (state === IDLE && Math.random() < 0.05) spawn(K_EMBER, sx(L.eye[0]), sy(L.eye[1]), (Math.random() - 0.5) * 4, -8, 0.3, BLOOD);   // 眼窝里飘出的血星
  }
  function fxReset() { poolT = 9; lastF = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -10; dx <= 10; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, BR[Math.abs(dx) < 4 ? 2 : 3]); }   // 地面映出的血光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'curse'; return MVDUR[MV]; }

  const VOICES = {
    bwChant: (s, t, w, p) => { s.tone(t, 'sawtooth', 98, 1.1, 0.05 * w, { vib: [5, 6, 0.1], lp: 700, pan: p, rev: 0.4 }); s.tone(t, 'sawtooth', 147, 1.0, 0.025 * w, { vib: [5.5, 8, 0.1], lp: 900, pan: p });
      s.choir(t, [38, 45], 1.2, 0.035 * w, { dark: 1, pan: p }); for (let i = 0; i < 3; i++) s.thud(t + i * 0.3, 110, 55, 0.2, 0.08 * w, { pan: p }); },
    bwDrum: (s, t, w, p) => { s.thud(t, 120, 50, 0.3, 0.16 * w, { pan: p }); s.nz(t, 0.08, 'lowpass', 400, 1, 0.06 * w, { pan: p }); s.thud(t + 0.14, 150, 70, 0.15, 0.07 * w, { pan: p }); },
    bwRattle: (s, t, w, p) => { for (let i = 0; i < 7; i++) { s.nz(t + i * 0.035 + s.rnd(0, 0.015), 0.03, 'bandpass', s.rnd(2200, 4200), 3, 0.035 * w, { pan: p }); s.ring(t + i * 0.035, s.rnd(900, 1500), 0.05, 0.012 * w, { pan: p }); } },
    bwSplat: (s, t, w, p) => { s.nz(t, 0.14, 'bandpass', 900, 1.5, 0.1 * w, { to: 400, pan: p }); s.thud(t, 180, 70, 0.12, 0.08 * w, { pan: p }); for (let i = 0; i < 3; i++) s.blip(t + 0.05 + i * 0.05, s.rnd(500, 900), 0.02 * w, { pan: p }); },
    bwDrip: (s, t, w, p) => { s.blip(t, 700, 0.03 * w, { pan: p }); s.blip(t + 0.12, 560, 0.02 * w, { pan: p }); },
    bwDraw: (s, t, w, p) => { s.nz(t, 0.25, 'bandpass', 2400, 4, 0.06 * w, { to: 3600, pan: p }); s.ring(t + 0.2, 1900, 0.2, 0.02 * w, { pan: p, parts: [[1, 1], [2.3, 0.3]] }); },
    bwSlash: (s, t, w, p) => { s.whoosh(t, 0.22, 500, 3200, 0.1 * w, { pan: p }); s.nz(t + 0.08, 0.3, 'bandpass', 700, 1.2, 0.1 * w, { to: 300, pan: p }); s.thud(t + 0.08, 140, 60, 0.2, 0.1 * w, { pan: p });
      for (let i = 0; i < 5; i++) s.blip(t + 0.12 + i * 0.04, s.rnd(400, 800), 0.02 * w, { pan: p }); },
    bwCurse: (s, t, w, p) => { s.thud(t, 90, 36, 0.5, 0.2 * w, { pan: p }); s.rumble(t, 1.2, 0.12 * w, { f: 180, pan: p }); s.choir(t, [34, 41, 46], 1.4, 0.05 * w, { dark: 1, pan: p });
      s.tone(t, 'sawtooth', 220, 0.9, 0.04 * w, { to: 70, vib: [7, 30, 0.1], lp: 1200, pan: p, rev: 0.6 }); s.nz(t + 0.05, 0.5, 'bandpass', 800, 1, 0.06 * w, { to: 300, pan: p }); },
    bwHowl: (s, t, w, p) => { s.tone(t, 'sawtooth', 170, 1.3, 0.1 * w, { to: 300, slide: 0.4, vib: [7, 40, 0.15], lp: 1600, pan: p, rev: 0.5 }); s.tone(t + 0.4, 'sawtooth', 300, 0.9, 0.06 * w, { to: 130, lp: 1200, pan: p, rev: 0.5 });
      s.nz(t, 1.1, 'bandpass', 600, 1.5, 0.1 * w, { a: 0.05, to: 900, pan: p }); s.choir(t + 0.1, [36, 43, 48], 1.3, 0.05 * w, { dark: 1, pan: p }); s.thud(t, 70, 30, 0.6, 0.18 * w, { pan: p }); },
    bwDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 260, 1.6, 0.07 * w, { to: 70, vib: [6, 50, 0.2], lp: 1300, pan: p, rev: 0.6 }); s.nz(t + 0.3, 0.9, 'bandpass', 500, 2, 0.05 * w, { a: 0.1, to: 200, pan: p });
      for (let i = 0; i < 4; i++) s.blip(t + 0.6 + i * 0.12, 400 - i * 50, 0.025 * w, { pan: p }); },
  };

  return {
    name: '血巫', HX, R_EL: BLOOD, DUR, hero, P, GLOW_MATS: FLATS, HIT_POINT: [4, -36], EVENTS, MAX_H: 90, OWN_MAX: 90, SHEET_K: 3, VOICES,
    SFX: { body: 'flesh', how: 'topple', pal: 'blood', style: 'shadow', w: 1 },
    MOVES: ['curse', 'bloodlet', 'roar'], MOVE_NAMES: { curse: '血咒', bloodlet: '放血', roar: '血咒蔓延（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.25, 1.4, 1.55, 1.7, 1.85]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0.1, 0.25, 0.4, 0.6, 0.95], 'curse'], [CAST, [0, 1 / 12, 3 / 12], 'curse'], [RECOVER, [0.1, 0.35, 0.55], 'curse'],
      [CHARGE, [0.1, 0.25, 0.4, 0.6, 0.72], 'bloodlet'], [CAST, [0, 1 / 12, 3 / 12], 'bloodlet'], [RECOVER, [0.1, 0.25, 0.4], 'bloodlet'],
      [CHARGE, [0.1, 0.3], 'roar'], [CAST, [0, 2 / 12, 0.55], 'roar'], [RECOVER, [0.15, 0.35], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.7, 0.95, 1.1, 1.3, 1.6, 2.0, 2.3, 2.6]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
