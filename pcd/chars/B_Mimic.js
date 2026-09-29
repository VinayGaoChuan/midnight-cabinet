// 惊喜盒（小首领，废弃游乐园 · 旋转木马区域）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js。
// 依据：附录 G2「宝箱怪」；被动 贪吃（每吞下一个，攻击 +10%、身子变大）；招式 吞 gulp（最大生命不到它 5% 的直接吞掉，吞不下的咬一大口）、
//       大嘴一合 chomp（扇形里每人同样的伤害）；半血 饿了（吞的冷却减半）。
// 设定卡 ——
//   剪影：一只红 / 奶油斜条纹的大礼盒（金包角、金色上下箍、青绿缎带竖着捆一圈，盖顶一只大蝴蝶结，背后吊一张画着「？」的礼物签），
//         四条紫红的肉质短腿把箱子撑离地面，靠蹦跳走路。箱盖就是上颚：盖沿一排尖牙，箱口一排下牙，盖永远开着一条缝。
//   脸：缝里的黑暗中两只金黄发光的竖瞳眼（一大一小）往外瞄；一条粉紫的长舌头从缝里耷拉出来垂过箱沿、滴口水（识别点一）。
//   惊喜：箱子里藏着一个弹簧脖子的小丑木偶头（尖角帽一红一青、帽角挂金铃，奶油色脸、红菱形腮、发光的眼、满嘴尖牙的笑，脖子一圈褶领），
//         招式时「嘣」地弹出来（识别点二）；和瓷娃娃（B_doll）、小丑王（B_clown）的区别：主体是箱子，小丑头只是箱里的机关。
//   主色：暗红漆 + 发黄的奶油漆（旧游乐园，漆面剥落、有裂纹）+ 暗金 + 暗青缎带，全部压暗；光：眼、喉咙、锁眼的金光，彩色纸屑。
//   招式（setMove）：
//     gulp 吞：伏低、盖张到最大、舌头往前伸着打颤，喉咙越来越亮、四周的光点被吸进嘴里 → 舌头一甩卷到目标、猛地收回、盖子「砰」地合上，
//              整只箱子鼓起来一跳（吞下去）→ 嚼两下、打个饱嗝喷出纸屑。
//     chomp 大嘴一合：后腿撑着往后仰、盖子掀到竖直、小丑头弹出来抖着笑（铃铛响）→ 小丑缩回去、整只箱子往前扑、盖子砸下来（前方一大片牙印弧光）→ 盖子弹一下，退回原位。
//     roar 饿了（半血）：音乐盒的曲子响起，盖子咔哒咔哒乱跳、箱子发抖 → 盖子飞开、小丑头弹到最高仰头尖笑、舌头乱甩、纸屑礼炮 → 小丑在弹簧上晃几下缩回去。
//   待机：两档呼吸（箱子一鼓一收、盖缝一开一合）、舌头晃、滴口水；个性动作：盖子掀开，小丑头探出来左右看看、偷笑一下，缩回去「咔哒」合上。
//   移动：整只箱子蹦跳（蹲 → 蹬 → 腾空 → 落地压扁、盖子被颠开）。
//   死亡：受击一抖 → 盖子最后一次弹开、小丑头弹出来 → 腿一软箱子墩到地上，盖子折到背后吊着，小丑头挂在箱沿上耷拉下来、舌头淌到地上，
//         音乐盒的曲子越放越慢，眼睛熄灭，化成纸屑。
PCD.define('B_Mimic', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（暗 → 亮，第 0 级是勾线）：漆面全部压暗，金光和纸屑才亮得出来 ─────
  const R_RED = ['#0a0205', '#18050a', '#28080f', '#3a0c15', '#4e111b', '#641621', '#7a1c28', '#912430', '#a82e38', '#bd3c42', '#d0504e'];      // 暗红漆
  const R_CREAM = ['#100b08', '#211810', '#33271b', '#463727', '#5a4834', '#6f5b43', '#856f54', '#9b8566', '#b19b7a', '#c6b290', '#dacaaa']; // 发黄的奶油漆 / 小丑脸
  const R_TEAL = ['#02080a', '#051216', '#081d22', '#0c2a30', '#11373e', '#17464e', '#1e5660', '#276872', '#327a84', '#408c94', '#52a0a6'];  // 缎带、帽角
  const R_MAW = ['#040103', '#0e0307', '#18050c', '#240812', '#320b18', '#420f20', '#541428', '#681a32', '#7e223c'];                          // 箱里的喉咙、牙龈
  const R_TONG = ['#12030a', '#260714', '#3c0c20', '#54122c', '#6c1a3a', '#862448', '#a03058', '#b84068', '#cc5a7c'];                         // 舌头
  const RED = defDeep(R_RED, { depth: 7, amb: 0.12 }), CRM = defDeep(R_CREAM, { depth: 7, amb: 0.2, dark: 1 });
  const FACE = defDeep(R_CREAM, { depth: 3, amb: 0.4 }), RIB = defDeep(R_TEAL, { depth: 3, amb: 0.2 }), RIBD = defDeep(R_TEAL, { depth: 2, dark: 2 });
  const GOLD = defDeep('brass', { depth: 2, amb: 0.2, dark: 1 }), MAW = defDeep(R_MAW, { depth: 5, amb: 0.1 }), TONG = defDeep(R_TONG, { depth: 3, amb: 0.2 });
  const TOOTH = defDeep('ivory', { depth: 1, amb: 0.5 }), CLAW = defDeep('ivory', { depth: 1, amb: 0.3 });
  const LEG = defDeep('membrane', { depth: 3, amb: 0.16 }), LEGD = defDeep('membrane', { depth: 3, dark: 3 }), SPR = defDeep('bladesteel', { depth: 1, amb: 0.3 });
  const GL = fxRamp('mbGlow', ['#ffffff', '#fff0a8', '#ffc840', '#e0642a', '#5a1a10']), GR = FXR[GL];               // 金光：白 → 淡金 → 金 → 橙 → 暗
  const CPK = fxRamp('mbPink', ['#ffffff', '#ffc4dc', '#f06a9c', '#a82a5a', '#3a0a1c']), CTL = fxRamp('mbTeal', ['#ffffff', '#bff6f0', '#4cc8c0', '#1a7470', '#08282a']);
  const EYE = defMat([GR[4], GR[3], GR[2], GR[1]], 1, 1), EYE2 = defMat([GR[3], GR[2], GR[1], GR[0]], 1, 1), INK = defMat([0, 0, 0, 0], 1, 1);
  const CONF = [GL, CPK, CTL, FXI.coin];
  const hero = new Sprite(170, 124, 70, 112);
  const DUR = [2.4, 4 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { gulp: { 3: 0.9, 4: 0.5, 5: 0.7 }, chomp: { 3: 0.9, 4: 0.4, 5: 0.7 }, roar: { 3: 0.6, 4: 0.5, 5: 0.8 } };
  let MV = 'gulp';
  const HX = 60;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [GR[1], GR[2], GR[3]], k: 0.6 }, { x: 0, y: 0, r: 0, ramp: [GR[1], GR[2], GR[3]], k: 1 }];
  const RIM_R = [0, 10, 16, 24], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: GR, flash: 0, dq: 0, lights: null, skip: new Uint8Array(256) };
  RIM.skip[EYE] = RIM.skip[EYE2] = RIM.skip[INK] = 1;

  // ───── 骨架（本地坐标，脚底 y = 0，面朝右）：箱身 38 × 32，离地 10 格；盖厚 7，铰链在后上角 ─────
  const XL0 = -24, XR0 = 14, YB = -10, YT0 = -42, LH = 7, RBX = -6;
  const LEGS = [['fb', -13, 1, -1], ['ff', 12, 1, 1], ['nb', -18, 0, -1], ['nf', 7, 0, 1]];   // [名, 根 x, 远侧, 前 1 / 后 -1]
  // 蹦跳 8 帧（12 fps，一跳 2/3 秒）：落地压扁 → 蹲 → 蹬 → 腾空 → 顶点 → 下落 → 触地
  const HOP = { lift: [0, 0, 1, 6, 8, 7, 4, 1], sq: [3, 2, -2, -2, -1, 0, 0, 1], lid: [0.42, 0.24, 0.08, 0.12, 0.22, 0.28, 0.22, 0.12], pitch: [0.02, 0.03, -0.06, -0.07, -0.03, 0.02, 0.05, 0.03],
    bow: [2, 1, -1, -2, -1, 0, 1, 2], lc: [2, 3, 0, 0, 0, 0, 0, 0], kf: [0, -1, 2, 3, 2, 1, 0, 0], kb: [0, 1, -2, -3, -2, -1, 0, 0] };

  const P = {};
  const FIELDS = ['st', 'pitch', 'pv', 'bx', 'by', 'lift', 'sq', 'bul', 'br', 'lid', 'tg', 'ts', 'tx', 'ty', 'eyes', 'glow', 'jk', 'jx', 'jt', 'jm', 'jd', 'sway',
    'bow', 'lc', 'kf', 'kb', 'kfy', 'kby', 'flash', 'dq', 'rim', 'dead'];
  function base() {
    P.st = 0; P.pitch = 0; P.pv = 0; P.bx = 0; P.by = 0; P.lift = 0; P.sq = 0; P.bul = 0; P.br = 0; P.lid = 0.3; P.tg = 1; P.ts = 0; P.tx = 0; P.ty = 0; P.eyes = 0; P.glow = 0;
    P.jk = 0; P.jx = 0; P.jt = 0; P.jm = 0; P.jd = 0; P.sway = 0; P.bow = 0; P.lc = 0; P.kf = 0; P.kb = 0; P.kfy = 0; P.kby = 0; P.flash = 0; P.dq = 0; P.rim = 0; P.dead = 0;
    P.mx = 0; P.flip = 0;
  }
  const hop = (f) => { f = ((f % 8) + 8) % 8; P.lift = HOP.lift[f]; P.sq = HOP.sq[f]; P.lid = HOP.lid[f]; P.pitch = HOP.pitch[f]; P.pv = f < 4 ? 0 : 1; P.bow = HOP.bow[f]; P.ts = -HOP.bow[f]; P.lc = HOP.lc[f]; P.kf = HOP.kf[f]; P.kb = HOP.kb[f]; };
  const tongueTo = (x, y) => { P.tg = 2; P.tx = x; P.ty = y; };
  const TS_IDLE = [0, 1, 1, 0, -1, -1];

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.br = b; P.by = -b; P.lid = 0.3 + (b ? 0.05 : 0); P.ts = TS_IDLE[Math.floor(tt / 0.3) % 6]; P.bow = b ? -1 : 0; P.sway = b;
      const lp = tt % DUR[IDLE];
      if (lp >= 1.2 && lp < 2.1) {   // 待机个性：掀盖，小丑头探出来左看右看、偷笑，缩回去咔哒合上
        const k = f12of(lp - 1.2);
        P.lid = [0.35, 0.6, 0.85, 1.0, 1.0, 0.95, 0.95, 0.85, 0.5, 0.0, 0.12][k]; P.jk = [0, 0, 0.14, 0.36, 0.44, 0.4, 0.44, 0.22, 0, 0, 0][k];
        P.jt = [0, 0, 0.1, -0.2, -0.28, 0.22, 0.28, 0, 0, 0, 0][k]; P.jx = [0, 0, 1, 2, 1, 3, 3, 2, 0, 0, 0][k]; P.jm = k === 5 || k === 6 ? 1 + (k & 1) : 0;
        P.eyes = k === 1 || k === 2 ? 2 : 0; P.sway = [0, 0, 1, -1, 0, 1, -1, 0, 0, 0, 0][k]; if (k === 9) { P.sq = 1; P.tg = 0; } if (k === 10) P.sq = 0;
      }
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { hop(Math.floor(tq * 12)); const w = walkDemo(tq, 26, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      if (tq < 0.17) { const q = ease.out(tq / 0.17); P.lid = 0.2 + 0.85 * q; P.pitch = -0.1 * q; P.lc = Math.round(2 * q); P.sq = Math.round(2 * q); P.eyes = 2; P.glow = 1; P.ts = -1; P.bow = 1; }
      else if (tq < 0.25) { P.lid = 1.1; P.pitch = -0.14; P.lc = 2; P.sq = 1; P.bx = -1; P.eyes = 2; P.glow = 2; P.rim = 1; P.ts = -2; P.kf = 2; P.bow = 2; }
      else if (tq < 0.42) { const a = tq < 0.34; P.lid = 0; P.pv = 1; P.bx = 7; P.lift = a ? 3 : 0; P.sq = a ? -1 : 2; P.pitch = a ? 0.12 : 0.05; P.glow = 3; P.rim = 2; P.tg = 0; P.kf = 3; P.kb = -3; P.bow = -2; P.eyes = 2; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); P.bx = Math.round(7 * (1 - q)); P.lid = 0.2 * q; P.tg = q > 0.4 ? 1 : 0; P.glow = q < 0.5 ? 1 : 0; P.sq = Math.round(1 - q); P.ts = 2; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { P.pitch = -0.14; P.bx = -3; P.lid = 0; P.eyes = 1; P.tg = 0; P.flash = h < 1 / 12 ? 1 : 0; P.bow = -2; P.sq = -1; P.kf = 3; P.kfy = 2; }
      else if (h < 0.35) { P.pitch = -0.06; P.bx = -1; P.lid = 0.35; P.eyes = 1; P.ts = 2; P.bow = 1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); P.lid = 0.35 - 0.15 * q; P.bx = Math.round(-1 + q); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    focus();
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { gulp: 0, chomp: 1, roar: 2 };
  function skillPose(st, tq, f12) {
    const k = f12 & 1;
    if (MV === 'gulp') {
      if (st === CHARGE) {   // 伏低张到最大，舌头往前伸着打颤，喉咙越来越亮
        const q = ease.out(clamp01(tq / 0.35)), e = ease.out(clamp01(tq / 0.6));
        P.lid = 1.2 * q + (tq > 0.5 && k ? 0.05 : 0); P.pitch = -0.1 * q; P.lc = Math.round(2 * q); P.eyes = 2; P.bul = tq > 0.5 ? 1 : 0;
        P.glow = tq < 0.3 ? 1 : tq < 0.6 ? 2 : 2 + k; P.rim = tq < 0.4 ? 1 : 2; P.bow = -1; P.kf = 1; P.kb = -1;
        tongueTo(XR0 + 8 + 18 * e, -34 + 6 * e + (tq > 0.3 ? (k ? -2 : 1) : 0)); P.ts = k ? 2 : -1;
      } else if (st === CAST) {   // 舌头卷到目标 → 收回 → 砰地合上、鼓起来一跳
        if (tq < 2 / 12) { P.lid = 1.2; P.pv = 1; P.pitch = 0.05; P.bx = 2; P.eyes = 2; P.glow = 3; P.rim = 3; tongueTo(tq < 1 / 12 ? XR0 + 64 : XR0 + 36, tq < 1 / 12 ? -20 : -28); P.ts = 3; P.kf = 3; }
        else if (tq < 3 / 12) { P.lid = 0.7; P.eyes = 2; P.glow = 2; P.rim = 2; tongueTo(XR0 + 8, -38); P.bx = 1; }
        else { const a = tq < 4 / 12; P.lid = 0; P.tg = 0; P.bul = a ? 4 : 3; P.sq = a ? 2 : -2; P.lift = a ? 0 : 3; P.lc = a ? 2 : 0; P.glow = 2; P.rim = 1; P.eyes = 1; P.bow = a ? 2 : -2; }
      } else {   // 嚼两下 → 饱嗝
        const f = Math.floor(tq * 12);
        P.lid = [0.28, 0, 0.28, 0, 0.2, 0, 0.7, 0.6, 0.4][f] ?? 0.2; P.bul = Math.max(0, 3 - Math.floor(tq / 0.18)); P.eyes = f < 6 ? 1 : 0; P.sq = f < 6 ? (k ? 1 : 0) : 0;
        P.tg = f >= 6 ? 1 : 0; P.ts = 2; P.glow = f === 6 || f === 7 ? 1 : 0; P.bow = k ? 1 : 0;
      }
    } else if (MV === 'chomp') {
      if (st === CHARGE) {   // 后仰、盖掀到竖直、小丑头弹出来抖着笑
        const q = ease.out(clamp01(tq / 0.35)), j = clamp01((tq - 0.2) / 0.12);
        P.pv = 0; P.pitch = -0.28 * q; P.bx = -Math.round(2 * q); P.lid = 1.45 * q; P.kf = Math.round(3 * q); P.eyes = 2;
        P.jk = j * 0.72 + (j >= 1 ? (k ? 0.04 : -0.02) : 0); P.jt = j >= 1 ? (k ? 0.12 : -0.12) : 0; P.jm = j >= 1 ? 1 + k : 0; P.jx = 4; P.sway = k ? 1 : -1;
        P.glow = tq < 0.3 ? 1 : 2 + (tq > 0.6 ? k : 0); P.rim = tq < 0.4 ? 1 : 2; P.ts = -2; P.bow = -2;
      } else if (st === CAST) {   // 小丑缩回、整只箱子往前扑、盖子砸下来
        const a = tq < 2 / 12; P.pv = 1; P.pitch = a ? 0.16 : 0.1; P.bx = 10; P.lid = 0; P.jk = 0; P.sq = a ? 2 : 1; P.glow = a ? 3 : 2; P.rim = a ? 3 : 2;
        P.tg = 0; P.kf = 4; P.kb = -3; P.bow = -3; P.eyes = 2;
      } else {
        const q = ease.inOut(clamp01(tq / 0.55)), j = clamp01((tq - 0.08) / 0.3);
        P.pv = 1; P.pitch = 0.1 * (1 - q); P.bx = Math.round(10 * (1 - q)); P.lid = tq < 0.17 ? 0.55 : 0.2 + 0.15 * (1 - q);
        P.jk = j > 0 && j < 1 ? 0.28 * Math.sin(j * Math.PI) : 0; P.jm = 1; P.jt = 0.2; P.jx = 3;
        P.eyes = q < 0.5 ? 1 : 0; P.tg = q > 0.5 ? 1 : 0; P.glow = q < 0.3 ? 1 : 0; P.bow = 1;
      }
    } else {   // roar：饿了（半血怒吼）
      if (st === CHARGE) { P.lid = k ? 0.34 : 0.06; P.bx = k ? 1 : -1; P.lc = 2; P.sq = 1 + k; P.eyes = 2; P.glow = tq < 0.3 ? 1 : 2; P.rim = 1; P.tg = 0; P.bul = 1; P.bow = k ? 1 : -1; }
      else if (st === CAST) {
        const a = tq < 1 / 12; P.lid = a ? 1.0 : 1.38; P.jk = a ? 0.7 : 1.05 - (tq > 3 / 12 ? 0.05 : 0); P.jt = -0.32; P.jm = 2; P.jx = 2; P.sway = k ? 1 : -1;
        P.lift = a ? 3 : 1; P.sq = -2; P.pitch = -0.08; P.eyes = 2; P.glow = 3; P.rim = tq < 2 / 12 ? 3 : 2; P.bow = -3;
        tongueTo(XR0 + 12 + (k ? 3 : 0), -54 + (k ? 5 : 0)); P.ts = k ? 3 : -3;
      } else {   // 弹簧上晃几下，缩回去
        const bo = Math.exp(-tq * 4) * Math.cos(tq * 22), r = clamp01((tq - 0.5) / 0.22);
        P.jk = (1 - 0.3 * bo) * (1 - ease.in(r)); P.jt = 0.3 * bo; P.jx = 2 + Math.round(3 * bo); P.sway = Math.round(2 * bo); P.jm = r < 0.5 ? 1 : 0;
        P.lid = r > 0 ? 1.38 - 1.18 * ease.inOut(clamp01((tq - 0.55) / 0.25)) : 1.38; P.eyes = 2; P.glow = tq < 0.3 ? 2 : tq < 0.55 ? 1 : 0; P.rim = tq < 0.2 ? 1 : 0;
        P.tg = tq > 0.6 ? 1 : 0; P.bow = Math.round(-2 * bo);
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    if (d < 0.3) { P.pitch = -0.14; P.bx = -3; P.lid = 0; P.eyes = 1; P.tg = 0; P.flash = d < 1 / 12 ? 1 : 0; P.bow = -2; P.kf = 2; return; }
    if (d < 0.7) { const q = ease.out(clamp01((d - 0.3) / 0.15)); P.lid = 1.5 * q; P.jk = q; P.jt = -0.25; P.jm = 2; P.jx = 2; P.eyes = 1; P.pitch = -0.08; P.lift = Math.round(2 * q); P.glow = 1; P.rim = 1; tongueTo(XR0 + 12, -50); P.bow = -2; return; }
    const q1 = ease.in(clamp01((d - 0.7) / 0.35)), q2 = ease.inOut(clamp01((d - 1.0) / 0.5));
    P.dead = 1; P.lc = Math.round(8 * q1); P.kf = Math.round(9 * q1); P.kb = -Math.round(9 * q1); P.pv = 1; P.pitch = 0.1 * q1; P.sq = Math.round(2 * q1);
    P.lid = 1.5 + 1.1 * q2; P.jk = 1 - 0.45 * q1; P.jx = Math.round(2 + 14 * q2); P.jd = Math.round(22 * q2); P.jt = -0.25 + 1.7 * q2; P.jm = q2 > 0.5 ? 1 : 2;
    P.eyes = d > 1.3 ? 3 : 1; P.tg = 2; P.tx = XR0 + 12 + Math.round(10 * q2); P.ty = -50 + Math.round(49 * q1); P.bow = 3; P.bul = q2 > 0.5 ? -1 : 0;
    if (d > 1.9) P.dq = Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48;
  }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function dims() { const s = Math.round(P.sq); L.YT = YT0 + s; L.XL = XL0 - Math.round(s * 0.5) - P.bul; L.XR = XR0 + Math.round(s * 0.5) + P.bul; L.HG = [L.XL + 1, L.YT]; }
  function bodyXf() { B.reset(); B.move(P.bx, P.by + P.lc - P.lift); if (P.pitch) B.rot(P.pv ? XR0 : XL0, YB, P.pitch); }
  function lidXf() { bodyXf(); B.rot(L.HG[0], L.HG[1], -P.lid); }
  const rl = (x, y) => { const a = -P.lid, c = Math.cos(a), s = Math.sin(a), dx = x - L.HG[0], dy = y - L.HG[1]; return [L.HG[0] + dx * c - dy * s, L.HG[1] + dx * s + dy * c]; };
  function geo() {
    dims(); bodyXf();
    for (const [k, rx, far, dir] of LEGS) {
      const r = B.at(rx + dir * P.bul, YB + 0.5 - far);
      let tx = r[0] + dir * 2 + (dir > 0 ? P.kf : P.kb), ty = -far - (dir > 0 ? P.kfy : P.kby);
      if (ty - r[1] > 12.4) ty = r[1] + 11;   // 够不着地：腿垂着
      const kn = B.ik(r, [tx, ty], 6.5, 6.5, -dir), dd = Math.hypot(tx - kn[0], ty - kn[1]) || 1;
      L[k] = { r, kn, h: [kn[0] + (tx - kn[0]) / dd * 6.5, kn[1] + (ty - kn[1]) / dd * 6.5], far, dir };
    }
    const lo = clamp01(P.lid / 0.7);
    L.lidF = rl(L.XR, L.YT); L.eye = [L.XR - 12 - 3 * lo, L.YT - 3.5 - 4 * lo]; L.thr = [L.XR - 14, L.YT - 4 - 6 * lo];
    L.sb = [L.XR - 12, L.YT + 1]; L.hc = [L.sb[0] + P.jx, L.sb[1] - 9 - 30 * P.jk + P.jd];
    L.eyeW = B.at(L.eye[0], L.eye[1]); L.thrW = B.at(L.thr[0], L.thr[1]); L.lidFW = B.at(L.lidF[0], L.lidF[1]); L.hcW = B.at(L.hc[0], L.hc[1]);
    L.mouthW = B.at(L.XR - 2, L.YT - 1); L.tipW = P.tg === 2 ? [P.tx, P.ty] : B.at(L.XR + 2 + P.ts * 1.5, L.YT + 15);
  }
  // 发光体（蓄力汇聚点 / 轮廓光的光源）
  function focus() {
    geo(); let f = L.eyeW;
    if (P.jk > 0.3 && (MV !== 'gulp' || P.st === DEATH)) f = L.hcW;
    else if (MV === 'gulp' && (P.st === CHARGE || P.st === CAST)) f = L.thrW;
    else if (P.st === ATTACK || (MV === 'chomp' && P.st === CAST)) f = L.lidFW;
    P.fx = f[0]; P.fy = f[1];
  }

  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  // 凸多边形裁剪（斜条纹裁进箱身 / 箱盖）
  function clip(sub, cp) {
    let ar = 0; for (let i = 0; i < cp.length; i++) { const a = cp[i], b = cp[(i + 1) % cp.length]; ar += a[0] * b[1] - b[0] * a[1]; } const sg = ar > 0 ? 1 : -1;
    let out = sub;
    for (let i = 0; i < cp.length && out.length; i++) {
      const a = cp[i], b = cp[(i + 1) % cp.length], inp = out, cr = (p) => sg * ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])); out = [];
      for (let j = 0; j < inp.length; j++) { const p = inp[j], q = inp[(j + 1) % inp.length], dp = cr(p), dq = cr(q); if (dp >= 0) out.push(p); if ((dp >= 0) !== (dq >= 0)) { const u = dp / (dp - dq); out.push([p[0] + (q[0] - p[0]) * u, p[1] + (q[1] - p[1]) * u]); } }
    }
    return out;
  }
  const SL = 0.55, SP = 10, SW = 5;   // 斜条纹：x = c − SL·y，宽 5、间距 10（箱身和合上的盖对得上）
  function stripes(cp, y0, y1, m, t) { for (let c = -70; c < 26; c += SP) { const q = clip([[c - SL * y1, y1], [c + SW - SL * y1, y1], [c + SW - SL * y0, y0], [c - SL * y0, y0]], cp); if (q.length > 2) B.poly(E, q, m, t); } }

  function drawLeg(k) {
    const g = L[k], m = g.far ? LEGD : LEG;
    part(); capW(g.r[0], g.r[1] - 1, g.kn[0], g.kn[1], g.far ? 3 : 3.6, 2.5, m); dot(g.kn[0], g.kn[1], 2.4, m, g.far ? 5 : 7);
    part(); capW(g.kn[0], g.kn[1], g.h[0], g.h[1] - 1.2, 2.2, 1.7, m); if (!g.far) px(g.kn[0] + g.dir, g.kn[1] + 2, m, 3);
    part(); const hx = g.h[0], hy = g.h[1] - 0.5; B.dotW(E, hx, hy - 0.5, 1.9, m, g.far ? 4 : 6);
    part(); lnW(hx + 1, hy + 0.5, hx + 4, hy + 0.5, CLAW, g.far ? 3 : 6); px(hx + 4, hy - 0.5, CLAW, g.far ? 3 : 8); lnW(hx - 1, hy + 0.5, hx - 3, hy + 0.5, CLAW, g.far ? 2 : 4);
  }
  function drawTag() {   // 礼物签：从盖的后角吊下来，画着「？」
    lidXf(); const a = B.at(L.XL - 0.5, L.YT - LH + 2); B.reset(); const s = P.bow * 0.7 + (P.lid > 1 ? 2 : 0), b = [a[0] - 2 + s, a[1] + 5];
    part(); lnW(a[0], a[1], b[0], b[1], RIBD, 4);
    part(); polyW([[b[0] - 2.5, b[1]], [b[0] + 2.5, b[1]], [b[0] + 3, b[1] + 7], [b[0] - 3, b[1] + 7]], CRM, 8);
    for (const [dx, dy] of [[0, 1], [-1, 2], [1, 2], [1, 3], [0, 4], [0, 6]]) px(b[0] + dx, b[1] + dy, RED, 5);
  }
  function boxPoly() {
    const { XL, XR, YT } = L, b = P.br + P.bul * 0.6, my = (YT + YB) / 2;
    return [[XL + 1, YT], [XR - 1, YT], [XR, YT + 1], [XR + b, my], [XR, YB - 1], [XR - 1, YB], [XL + 1, YB], [XL, YB - 1], [XL - b, my], [XL, YT + 1]];
  }
  function cornerCaps(XL, XR, y0, y1, n) {   // 四个金包角 + 铆钉
    const caps = [[[XR - n, y0], [XR + 0.5, y0], [XR + 0.5, y0 + n]], [[XR + 0.5, y1 - n], [XR + 0.5, y1], [XR - n, y1]], [[XL - 0.5, y0], [XL + n, y0], [XL - 0.5, y0 + n]], [[XL - 0.5, y1], [XL - 0.5, y1 - n], [XL + n, y1]]];
    for (const c of caps) { part(); B.poly(E, c, GOLD); const cx = (c[0][0] + c[1][0] + c[2][0]) / 3, cy = (c[0][1] + c[1][1] + c[2][1]) / 3; B.px(E, cx, cy, GOLD, 9); }
  }
  function drawBox() {
    const { XL, XR, YT } = L, bp = boxPoly();
    part(); bodyXf(); B.poly(E, bp, RED); stripes(bp, YT - 2, YB + 2, CRM);
    B.ln(E, XL + 8, YT + 9, XL + 11, YT + 14, RED, 2); B.ln(E, XL + 11, YT + 14, XL + 10, YT + 19, RED, 2); B.px(E, XL + 12, YT + 12, CRM, 2);   // 漆面裂纹
    for (const [x, y] of [[XL + 5, YB - 6], [XR - 7, YT + 13], [XL + 20, YB - 5], [XR - 3, YB - 9], [XL + 26, YT + 6]]) B.px(E, x, y, RED, 1);   // 剥落的漆点
    B.ln(E, XL + 2, YB - 4, XR - 2, YB - 4, RED, 3);
    part(); B.poly(E, [[RBX - 2, YT + 2], [RBX + 2, YT + 2], [RBX + 2, YB - 3], [RBX - 2, YB - 3]], RIB);   // 竖着捆的缎带
    B.ln(E, RBX - 1, YT + 3, RBX - 1, YB - 4, RIB, 8); B.ln(E, RBX + 2, YT + 3, RBX + 2, YB - 4, RIB, 3); B.px(E, RBX, YT + 15, RIB, 3); B.px(E, RBX + 1, YT + 16, RIB, 3);
    part(); B.poly(E, [[XL + 1, YT], [XR - 1, YT], [XR, YT + 1], [XR, YT + 2], [XL, YT + 2], [XL, YT + 1]], GOLD); B.ln(E, XL + 2, YT, XR - 2, YT, GOLD, 8);   // 箱口的金箍
    part(); B.poly(E, [[XL, YB - 3], [XR, YB - 3], [XR, YB - 1], [XR - 1, YB], [XL + 1, YB], [XL, YB - 1]], GOLD); B.ln(E, XL + 1, YB - 3, XR - 1, YB - 3, GOLD, 8);
    for (let x = XL + 4; x < XR - 2; x += 6) B.px(E, x, YB - 2, GOLD, 9);
    bodyXf(); cornerCaps(XL, XR, YT + 2, YB - 3, 6);
  }
  function drawCavity() {   // 箱里：黑红的喉咙、牙龈、两只发光的眼、下牙
    bodyXf(); const { XL, XR, YT } = L, lo = clamp01(P.lid / 0.7), dip = Math.round(3 * lo), lf = L.lidF;
    part(); B.poly(E, [L.HG, lf, [XR, YT], [XR - 2, YT + dip], [XL + 4, YT + dip]], MAW, 3);
    B.ell(E, XL + 6, YT - 2 - 4 * lo, 3 + 3 * lo, 2 + 3 * lo, -0.4 * lo, MAW, 1);   // 最深处
    const g0 = rl(XL + 5, YT + 1), g1 = rl(XR - 1, YT + 1); B.ln(E, g0[0], g0[1], g1[0], g1[1], MAW, 8); B.ln(E, XL + 5, YT - 1 + dip, XR - 1, YT - 1 + dip, MAW, 8);   // 牙龈
    if (MV === 'gulp' && (P.st === CHARGE || P.st === CAST) && P.glow >= 2) { const t = L.thr; B.ell(E, t[0], t[1], 1 + P.glow, 0.8 + P.glow * 0.6, 0, EYE); B.ell(E, t[0], t[1], P.glow - 1, 0.6 + (P.glow - 2) * 0.6, 0, EYE2, 4); }
    part(); for (let x = XR - 4.5; x > XL + 6; x -= 5) { const n = x > XR - 8 ? 4 : 3; B.poly(E, [[x - 1.3, YT + 0.5 + dip * 0.3], [x + 1.3, YT + 0.5 + dip * 0.3], [x - 0.2, YT - n + dip * 0.3]], TOOTH); }
    const e = L.eye, e2 = [e[0] - 7, e[1] + 0.5 - lo];
    if (P.eyes === 3) { B.px(E, e[0], e[1], MAW, 6); B.px(E, e2[0], e2[1], MAW, 6); }
    else if (P.eyes === 1) { B.ln(E, e[0] - 2, e[1] + 0.5, e[0] + 2, e[1] - 0.5, EYE); B.ln(E, e2[0] - 1, e2[1], e2[0] + 1, e2[1], EYE, 2); }
    else {
      const w = P.eyes === 2 ? 0.6 : 0; B.ell(E, e[0], e[1], 2.2 + w, 1.6 + w, 0, EYE); B.px(E, e[0] - 1, e[1] - 1, EYE, 4); B.ln(E, e[0] + 0.5, e[1] - 1 - w, e[0] + 0.5, e[1] + 1 + w, INK);
      B.ell(E, e2[0], e2[1], 1.4 + w * 0.5, 1.1 + w * 0.5, 0, EYE, 2); B.px(E, e2[0], e2[1], INK);
      if (P.eyes === 2 || P.glow >= 2) { B.px(E, e[0] - 2, e[1] - 1, EYE2, 4); B.px(E, e[0], e[1] - 1, EYE2, 3); }
    }
  }
  function drawTongue() {
    if (!P.tg) return;
    bodyXf(); const { XR, YT } = L, root = [XR - 8, YT - 0.5]; let pts;
    if (P.tg === 1) { const s = P.ts; pts = B.bez(root, [XR + 5, YT - 3], [XR + 5 + s, YT + 7], 7).concat(B.bez([XR + 5 + s, YT + 7], [XR + 5 + s * 1.3, YT + 13], [XR + 2 + s * 1.5, YT + 15], 4).slice(1)); }
    else { const tip = B.inv(P.tx, P.ty); pts = B.bez(root, [(root[0] + tip[0]) / 2 + 2, Math.min(root[1], tip[1]) - 7 + P.ts], tip, 14); }
    part(); B.strand(E, pts, 2.3, 1.7, TONG);
    for (let i = 2; i < pts.length - 1; i++) B.px(E, pts[i][0], pts[i][1], TONG, i & 1 ? 3 : 4);   // 舌中线
    const tp = pts[pts.length - 1]; part(); B.ell(E, tp[0], tp[1], 2.4, 2, 0, TONG); B.px(E, tp[0] - 1, tp[1] - 1, TONG, 8); B.px(E, tp[0] + 1, tp[1], TONG, 3);
  }
  function drawJester() {   // 弹簧脖子的小丑木偶头
    if (P.jk < 0.02) return;
    bodyXf(); const sb = L.sb, hc = L.hc, nk = [hc[0] - Math.sin(P.jt) * 8, hc[1] + Math.cos(P.jt) * 8];
    const ctrl = [sb[0] + P.jx * 0.2 + P.sway, (sb[1] + nk[1]) / 2 - P.jd * 0.9 - (P.dead ? 6 : 0)];
    const len = Math.hypot(nk[0] - sb[0], nk[1] - sb[1]) + P.jd, n = Math.max(2, Math.round(len / 2.3)), pts = B.bez(sb, ctrl, nk, n);
    for (let i = 0; i <= n; i++) { const p = pts[i], q = pts[Math.min(n, i + 1)], o = pts[Math.max(0, i - 1)], a = Math.atan2(q[1] - o[1], q[0] - o[0]) + Math.PI / 2;
      part(); B.ell(E, p[0], p[1], 3.4, 1.1, a, SPR, i & 1 ? 4 : 6); B.px(E, p[0] - 2.5 * Math.cos(a), p[1] - 2.5 * Math.sin(a), SPR, 9); }
    B.save(); B.move(hc[0], hc[1]); B.rot(0, 0, P.jt); const s = P.sway;
    part(); B.ell(E, 0.5, 7.5, 7.5, 2.6, 0, CRM, 6); for (let x = -6; x <= 7; x += 3) { B.px(E, x, 9.5, RED, 6); B.px(E, x + 1, 9, RED, 5); }   // 褶领
    part(); const hb = B.bez([-2, -6], [-10 - s, -15], [-13 - s, -7 + s], 7); B.strand(E, hb, 3.2, 1.2, RIB); B.px(E, hb[3][0], hb[3][1] - 1, RIB, 8);   // 帽角：后青前红
    part(); B.ell(E, -13 - s, -5.5 + s, 1.9, 1.9, 0, GOLD); B.px(E, -13.5 - s, -6.5 + s, GOLD, 9); B.px(E, -13 - s, -4 + s, GOLD, 2);
    part(); B.ell(E, 0.5, 0, 6.2, 6.9, 0, FACE, 7); B.ln(E, -5, 3, -4, 5, FACE, 3);
    for (const [cx, cy] of [[-3, 2.5], [4, 2.5]]) { B.px(E, cx, cy - 1, RED, 7); B.px(E, cx - 1, cy, RED, 6); B.px(E, cx + 1, cy, RED, 6); B.px(E, cx, cy + 1, RED, 5); B.px(E, cx, cy, RED, 7); }   // 红菱形腮
    for (const ex of [-2, 3]) { B.px(E, ex, -1, INK); B.px(E, ex + 1, -1, INK); B.px(E, ex, -2, INK); B.px(E, ex + 1, -2, INK); B.px(E, ex + 1, -1.5, P.dead && P.eyes === 3 ? INK : EYE, 4); }
    B.ln(E, -3, -4, -1, -4.5, INK); B.ln(E, 3, -4.5, 5, -4, INK);
    if (P.jm === 2) { B.ell(E, 1, 4, 3.6, 2.4, 0, INK); for (let x = -2; x <= 4; x += 2) B.px(E, x, 2.5, TOOTH, 7); B.px(E, 1, 5.5, TONG, 6); B.px(E, 2, 5.5, TONG, 5); }
    else if (P.jm === 1) { B.poly(E, [[-3.5, 2.5], [5.5, 2.5], [3, 5], [-1, 5]], INK); for (let x = -2; x <= 4; x += 2) B.px(E, x, 3, TOOTH, 7); }
    else { B.ln(E, -3, 3.5, 5, 3.5, INK); B.px(E, -4, 2.5, INK); B.px(E, 6, 2.5, INK); }
    part(); B.poly(E, [[-6, -4], [7, -4], [7, -6.5], [-6, -6.5]], GOLD); for (let x = -5; x <= 6; x += 2) B.px(E, x, -4, GOLD, 9);   // 帽箍
    part(); const hf = B.bez([3, -6], [10 + s, -16], [14 + s, -8 - s], 7); B.strand(E, hf, 3.4, 1.3, RED); B.px(E, hf[3][0] - 1, hf[3][1], RED, 8); B.px(E, hf[2][0], hf[2][1], RED, 8);
    part(); B.ell(E, 14 + s, -6.5 - s, 1.9, 1.9, 0, GOLD); B.px(E, 13.5 + s, -7.5 - s, GOLD, 9); B.px(E, 14 + s, -5 - s, GOLD, 2);
    B.restore();
  }
  function drawLid() {
    const { XL, XR, YT } = L, T = YT - LH, lp = [[XL - 1, YT], [XR + 1, YT], [XR + 2, YT - 1], [XR + 2, T + 1], [XR + 1, T], [XL, T], [XL - 1, T + 1]];
    part(); lidXf(); B.poly(E, lp, RED); stripes(lp, T - 1, YT + 1, CRM); B.px(E, XL + 14, T + 2, RED, 1); B.px(E, XR - 5, T + 3, RED, 1);
    part(); B.poly(E, [[RBX - 2, T], [RBX + 2, T], [RBX + 2, YT - 2], [RBX - 2, YT - 2]], RIB); B.ln(E, RBX - 1, T + 1, RBX - 1, YT - 3, RIB, 8);
    part(); B.poly(E, [[XL - 1, YT - 1], [XR + 2, YT - 1], [XR + 1, YT], [XL - 1, YT]], GOLD); B.ln(E, XL, YT - 1, XR + 1, YT - 1, GOLD, 8);
    part(); B.ln(E, XL, T, XR + 1, T, GOLD, 7); for (let x = XL + 3; x < XR; x += 6) B.px(E, x, T, GOLD, 9);
    part(); B.poly(E, [[XR, YT - 3], [XR + 3.5, YT - 3], [XR + 3.5, YT + 4], [XR + 1.8, YT + 5.5], [XR, YT + 4]], GOLD); B.ln(E, XR + 1, YT - 2, XR + 1, YT + 3, GOLD, 8);   // 锁扣 + 锁眼
    B.px(E, XR + 2, YT + 1, P.glow >= 2 ? EYE2 : INK, 4); B.px(E, XR + 2, YT + 2, P.glow >= 1 ? EYE : INK);
    part(); for (let x = XR - 2; x > XL + 6; x -= 5) { const n = x > XR - 8 ? 5 : 3.5; B.poly(E, [[x - 1.4, YT - 0.5], [x + 1.4, YT - 0.5], [x + 0.2, YT + n]], TOOTH); B.px(E, x - 0.5, YT + 0.5, TOOTH, 8); }   // 上牙（前面两颗是獠牙）
  }
  function drawBow() {
    lidXf(); const T = L.YT - LH, kx = RBX, ky = T - 2, f = P.bow * 0.5;
    part(); B.strand(E, [[kx, ky], [kx - 4, ky + 1 + f], [kx - 8, ky + 4 + f * 2]], 1.7, 1.2, RIBD); B.strand(E, [[kx, ky], [kx + 4, ky + 1 + f], [kx + 8, ky + 3 + f * 2]], 1.7, 1.2, RIBD);   // 两条飘带
    if (P.bow >= 3) { part(); B.ell(E, kx - 5, ky - 1, 5, 2.2, 0.2, RIB); part(); B.ell(E, kx + 5, ky - 1, 5, 2.2, -0.2, RIB); }   // 死了：蝴蝶结塌下去
    else {
      part(); B.ell(E, kx - 6.5, ky - 4.5 + f, 6.5, 4, 0.5 + f * 0.12, RIB); B.ell(E, kx - 6.5, ky - 4.5 + f, 3, 1.4, 0.5 + f * 0.12, RIB, 2); B.ln(E, kx - 11, ky - 7 + f, kx - 7, ky - 8 + f, RIB, 8);
      part(); B.ell(E, kx + 6.5, ky - 4.5 - f * 0.5, 6.5, 4, -0.5 - f * 0.12, RIB); B.ell(E, kx + 6.5, ky - 4.5 - f * 0.5, 3, 1.4, -0.5 - f * 0.12, RIB, 2); B.ln(E, kx + 3, ky - 8 - f * 0.5, kx + 8, ky - 8 - f * 0.5, RIB, 8);
    }
    part(); B.ell(E, kx, ky - 1.5, 2.6, 2.3, 0, RIB); B.px(E, kx - 1, ky - 2.5, RIB, 8); B.px(E, kx + 1, ky - 0.5, RIB, 3);
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawLeg('fb'); drawLeg('ff'); drawTag();
    drawBox(); drawCavity(); drawTongue(); drawJester(); drawLid(); drawBow();
    drawLeg('nb'); drawLeg('nf');
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    const e = L.eyeW; LIGHT[0].x = e[0] * z + spr.ox; LIGHT[0].y = e[1] * z + spr.oy; LIGHT[0].r = (P.eyes === 3 ? 0 : P.eyes === 2 ? 7 : 5) * z;
    LIGHT[1].x = P.fx * z + spr.ox; LIGHT[1].y = P.fy * z + spr.oy; LIGHT[1].r = P.glow && P.jk < 0.3 ? (6 + P.glow * 5) * z : 0; RIM.lights = LIGHT;
    bake(spr, RIM);
  }
  // 立绘：半血「饿了」那一刻（盖子飞开、小丑头弹到最高尖笑、舌头乱甩），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 头像的位置和半径（地图节点）
  function portrait() { const mv = MV; MV = 'roar'; poseAt(CAST, 2 / 12, 0); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; const c = L.hcW; PHEAD = [c[0] * 2 + PSPR.ox, (c[1] + 14) * 2 + PSPR.oy, 22 * 2]; return PSPR; }
  function headShot() {   // 头像：盖掀开，缝里两只金眼，小丑头探出来偷笑
    const mv = MV; MV = 'gulp'; poseAt(IDLE, 1.2 + 4 / 12, 0); P.eyes = 2; P.glow = 1; P.rim = 1; P.jm = 1; focus(); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv;
    const a = L.hcW, b = L.eyeW; PHEAD = [(a[0] + b[0]) / 2 * 2 + PSPR.ox, (a[1] + b[1]) / 2 * 2 + PSPR.oy, 20 * 2]; return PSPR;
  }

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12, T_SLAM = 3 / 12, T_BURP = 0.5, T_PEEK = 1.2 + 3 / 12, T_CLACK = 1.2 + 9 / 12;
  const sx = (px) => scrX(px), sy = (py) => HY + py;
  let dustT = 9, lastHop = -1;
  function confetti(x, y, n, vmin, vmax, spread, up) {
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + (Math.random() - 0.5) * spread, v = vmin + Math.random() * (vmax - vmin);
      spawnX(K_PHYS, x, y, Math.cos(a) * v, Math.sin(a) * v - (up || 0), 0.9 + Math.random() * 0.8, CONF[i % 4], { g: 90, dragX: 0.35, dragY: 0.5, floor: HY }); }
  }
  function teethArc(x, y, r, w, dur) { fx.slash(x - 6, y, r, 0.35, 2.5, GL, dur, w, 2); fx.slash(x - 6, y + 2, r * 0.7, 0.5, 2.4, CPK, dur * 0.8, 2, 2); }
  function strikeFx() {
    const m = L.lidFW, x = sx(m[0] + 4), y = sy(m[1] + 3);
    teethArc(x, y, 16, 2, 0.18); burst(x, y, 14, 40, 120, 0.2, 0.5, GL, 20); confetti(x, y, 6, 30, 70, 2.2, 10); fx.cross(x + 4, y, 6, GL, 0.16);
    hitDummy(1, 1); shake(0.15, 2);
  }
  function chompFx() {
    const m = L.mouthW, x = sx(m[0] + 6), y = sy(m[1] + 6);
    teethArc(x, y, 34, 3, 0.3); teethArc(x + 8, y + 2, 48, 2, 0.35); fx.wave(x, HY, 1, 60, 8, GL, 0.45, 2);
    ring(x + 10, y, 1, GL); burst(x + 6, y, 28, 60, 170, 0.3, 0.7, GL, 30); confetti(x + 4, y - 4, 22, 40, 120, 2.6, 20);
    for (let i = 0; i < 12; i++) spawn(K_DUST, x - 20 + Math.random() * 50, HY - 1, (Math.random() - 0.2) * 50, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust);
    shake(0.35, 3); flash(0.1); hitDummy(1, 1);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'gulp') { const x = sx(P.tx), y = sy(P.ty); burst(x, y, 20, 40, 130, 0.2, 0.5, GL, 20); fx.cross(x, y, 8, GL, 0.2); fx.beam(sx(L.mouthW[0]), sy(L.mouthW[1]), x, y, 1, CPK, 0.12, 2); hitDummy(1, 1); shake(0.2, 2); sfx('boss', { k: 'mbLick', w: 1 }); sfx('hit', { w: 0.8 }); }
      else if (MV === 'chomp') { chompFx(); sfx('boss', { k: 'mbChomp', w: 1 }); sfx('impact', { pal: 'coin', w: 1 }); sfx('swing', { kind: 'claw', w: 1 }); }
      else { const hx = sx(L.hcW[0]), hy = sy(L.hcW[1]); ring(hx, hy, 1, GL); ring(hx, hy, 0, CPK); confetti(hx, hy - 4, 44, 60, 150, 2.4, 30); burst(hx, hy, 24, 50, 140, 0.3, 0.7, GL, 20);
        flash(0.12); shake(0.35, 3); sfx('boss', { k: 'mbPop', w: 1 }); sfx('boss', { k: 'mbLaugh', w: 1 }); sfx('boss', { k: 'roar', w: 0.6 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === CHARGE) { if (MV === 'gulp') sfx('boss', { k: 'mbSuck', w: 1 }); else if (MV === 'chomp') sfx('boss', { k: 'mbCreak', w: 0.9 }); else sfx('boss', { k: 'mbTune', w: 1 }); }
  }
  function onTime(s, t) {
    if (s === IDLE && t === T_PEEK) sfx('boss', { k: 'mbBoing', w: 0.35 });
    if (s === IDLE && t === T_CLACK) sfx('boss', { k: 'mbClack', w: 0.5 });
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'mbCreak', w: 0.5 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'claw', w: 0.9 }); sfx('hit', { w: 0.9 }); sfx('boss', { k: 'mbChomp', w: 0.7 }); }
    if (s === CHARGE && MV === 'chomp' && t === 0.25) { const h = L.hcW; confetti(sx(h[0]), sy(h[1]), 8, 30, 70, 2, 10); sfx('boss', { k: 'mbBoing', w: 0.9 }); }
    if (s === CHARGE && MV === 'chomp' && (t === 0.5 || t === 0.75)) sfx('boss', { k: 'mbJingle', w: 0.8 });
    if (s === CHARGE && MV === 'roar' && t === 0.3) sfx('boss', { k: 'mbClack', w: 0.7 });
    if (s === CAST && MV === 'gulp' && t === T_SLAM) { const m = L.mouthW, x = sx(m[0]), y = sy(m[1]); ring(x - 10, y + 8, 0, GL); confetti(x, y, 10, 30, 80, 2, 10); burst(x, y, 16, 30, 90, 0.2, 0.5, GL, 10); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'mbChomp', w: 1 }); sfx('boss', { k: 'mbGulp', w: 1 }); }
    if (s === RECOVER && MV === 'gulp' && (t === 1 / 12 || t === 3 / 12)) sfx('boss', { k: 'mbClack', w: 0.45 });
    if (s === RECOVER && MV === 'gulp' && t === T_BURP) { const m = L.mouthW; confetti(sx(m[0]), sy(m[1] - 2), 12, 20, 60, 1.6, 10); sfx('boss', { k: 'mbBurp', w: 1 }); }
    if (s === RECOVER && MV === 'chomp' && t === 0.08) sfx('boss', { k: 'mbBoing', w: 0.5 });
    if (s === RECOVER && MV === 'roar' && (t === 0.1 || t === 0.35)) sfx('boss', { k: 'mbBoing', w: t === 0.1 ? 0.7 : 0.4 });
    if (s === RECOVER && MV === 'roar' && t === 0.75) sfx('boss', { k: 'mbClack', w: 0.7 });
    if (s === DEATH && t === INCOMING + 0.3) { const h = L.hcW; confetti(sx(h[0]), sy(h[1]), 10, 30, 80, 2, 10); sfx('boss', { k: 'mbPop', w: 0.7 }); sfx('boss', { k: 'mbLaugh', w: 0.5 }); }
    if (s === DEATH && t === INCOMING + 0.9) { for (let i = 0; i < 24; i++) spawn(K_DUST, sx(-34 + Math.random() * 60), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 14, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.2, 2); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.1) sfx('boss', { k: 'mbDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 34; i++) spawn(K_RISE, sx(-34 + Math.random() * 64), HY - 4 - Math.random() * 36, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, CONF[i % 4]); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[T_PEEK, T_CLACK], [], [0.08, T_STRIKE], [0.25, 0.3, 0.5, 0.75], [T_SLAM], [1 / 12, 0.08, 0.1, 3 / 12, 0.35, T_BURP, 0.75], [],
    [INCOMING + 0.3, INCOMING + 0.9, INCOMING + 1.1, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    dustT += dt;
    if (state === MOVE) {   // 落地（第 0 帧）：扬尘、咔哒一声
      const f = Math.floor(stT * 12) % 8; if (f !== lastHop) { lastHop = f;
        if (f === 0) { for (const k of ['nb', 'nf', 'fb', 'ff']) { const x = sx(L[k].h[0]); for (let i = 0; i < 2; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 24, -4 - Math.random() * 8, 0.35 + Math.random() * 0.3, FXI.dust); } sfx('step', { w: 1 }); sfx('boss', { k: 'mbClack', w: 0.35 }); dustT = 0.5; }
        if (f === 2) sfx('step', { w: 0.5 }); } }
    if (state === CHARGE && Math.random() < 0.5) {
      const gx = sx(P.fx), gy = sy(P.fy);
      if (MV === 'gulp') {   // 吸：前方的光点、尘土被吸进嘴里
        const x = gx + 20 + Math.random() * 50, y = gy - 16 + Math.random() * 36, a = Math.atan2(y - gy, x - gx), r = Math.hypot(x - gx, y - gy);
        spawnX(K_SPIRAL_PT, gx, gy, r / (0.35 + Math.random() * 0.2), 0, 9, Math.random() < 0.3 ? FXI.dust : GL, { a, r, w: 2 + Math.random() * 2, tx: gx, ty: gy, orbitR: 1 });
      } else { const a = Math.random() * 6.2832, r = 16 + Math.random() * 14; spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, Math.random() < 0.5 ? GL : CPK, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 }); }
    }
    if (state === CAST && MV === 'gulp' && stT < 2 / 12 && Math.random() < 0.6) spawn(K_EMBER, sx(P.tx - Math.random() * 30), sy(P.ty - 2 + Math.random() * 4), 0, -8, 0.25, CPK);
    if ((state === IDLE || state === MOVE) && P.tg === 1 && Math.random() < 0.035) spawnX(K_PHYS, sx(L.tipW[0]), sy(L.tipW[1] + 2), 0, 6, 0.9, FXI.water, { g: 140, floor: HY });   // 口水
    if (state === IDLE && Math.random() < 0.04) spawn(K_EMBER, sx(L.eyeW[0] + (Math.random() - 0.5) * 6), sy(L.eyeW[1]), 0, -6, 0.3, GL);
    if (dustT < 0.8 && Math.random() < 0.3) spawn(K_EMBER, sx(-10 + Math.random() * 40), HY - 1, (Math.random() - 0.5) * 10, -8 - Math.random() * 8, 0.4, FXI.dust);
  }
  function fxReset() { dustT = 9; lastHop = -1; }
  function fxBack(f12) {
    if (P.glow >= 2) { const x = sx(P.fx); for (let dx = -10; dx <= 10; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, GR[Math.abs(dx) < 5 ? 2 : 3]); }   // 地面映出的金光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'gulp'; return MVDUR[MV]; }

  const VOICES = {
    mbCreak: (s, t, w, p) => { s.tone(t, 'sawtooth', 150, 0.4, 0.03 * w, { to: 95, vib: [23, 30, 0.02], lp: 900, pan: p }); s.nz(t, 0.35, 'bandpass', 900, 3, 0.03 * w, { to: 600, pan: p }); },
    mbClack: (s, t, w, p) => { s.thud(t, 190, 90, 0.08, 0.12 * w, { pan: p }); s.nz(t, 0.06, 'bandpass', 1600, 1.2, 0.1 * w, { pan: p }); },
    mbChomp: (s, t, w, p) => { s.thud(t, 140, 50, 0.16, 0.2 * w, { pan: p }); s.nz(t, 0.1, 'bandpass', 1200, 1, 0.14 * w, { to: 500, pan: p }); s.nz(t + 0.02, 0.08, 'highpass', 2500, 0.8, 0.06 * w, { pan: p }); s.tone(t, 'square', 90, 0.12, 0.04 * w, { to: 45, lp: 400, pan: p }); },
    mbGulp: (s, t, w, p) => { s.tone(t, 'sine', 220, 0.28, 0.1 * w, { to: 70, pan: p }); s.tone(t + 0.12, 'sine', 160, 0.25, 0.08 * w, { to: 50, pan: p }); s.nz(t, 0.25, 'lowpass', 500, 1, 0.05 * w, { pan: p }); },
    mbSuck: (s, t, w, p) => { s.nz(t, 0.8, 'bandpass', 600, 1.5, 0.06 * w, { a: 0.4, to: 2200, pan: p }); s.tone(t, 'sine', 110, 0.8, 0.04 * w, { to: 180, pan: p }); },
    mbLick: (s, t, w, p) => { s.tone(t, 'sine', 300, 0.16, 0.06 * w, { to: 1100, pan: p }); s.nz(t, 0.14, 'bandpass', 2400, 2, 0.05 * w, { to: 1200, pan: p }); },
    mbBurp: (s, t, w, p) => { s.tone(t, 'sawtooth', 95, 0.35, 0.06 * w, { to: 70, vib: [28, 18, 0.03], lp: 600, pan: p }); s.nz(t, 0.3, 'lowpass', 400, 1, 0.04 * w, { pan: p }); },
    mbBoing: (s, t, w, p) => { s.tone(t, 'sine', 180, 0.5, 0.08 * w, { to: 520, vib: [14, 60, 0.02], pan: p }); s.tone(t, 'triangle', 90, 0.4, 0.04 * w, { to: 260, vib: [14, 30, 0.02], pan: p }); },
    mbJingle: (s, t, w, p) => { for (let i = 0; i < 4; i++) s.ring(t + i * 0.06, s.rnd(2400, 3400), 0.25, 0.02 * w, { parts: [[1, 1], [2.4, 0.4]], pan: p }); },
    mbTune: (s, t, w, p) => { [72, 74, 76, 72, 76, 74, 79, 77].forEach((n, i) => s.bell(t + i * 0.075, n, 0.18, 0.03 * w, { pan: p })); },   // 音乐盒上弦的曲子
    mbPop: (s, t, w, p) => { s.nz(t, 0.08, 'bandpass', 900, 0.8, 0.2 * w, { pan: p }); s.thud(t, 260, 80, 0.12, 0.18 * w, { pan: p }); s.tone(t + 0.02, 'sine', 200, 0.6, 0.1 * w, { to: 700, vib: [16, 80, 0.03], pan: p }); },
    mbLaugh: (s, t, w, p) => { for (let i = 0; i < 5; i++) s.tone(t + i * 0.11, 'sawtooth', 420 - i * 25, 0.09, 0.04 * w, { to: 300 - i * 20, lp: 2200, pan: p }); },
    mbDie: (s, t, w, p) => { [76, 74, 72, 71, 69, 67].forEach((n, i) => s.bell(t + i * (0.14 + i * 0.05), n - i * 0.3, 0.3, 0.03 * w * (1 - i * 0.12), { pan: p })); s.tone(t, 'sine', 300, 1.6, 0.03 * w, { to: 90, pan: p }); },   // 音乐盒越放越慢
  };

  return {
    name: '惊喜盒', HX, R_EL: GL, DUR, hero, P, GLOW_MATS: [EYE, EYE2, INK], HIT_POINT: [-4, -30], EVENTS, MAX_H: 90, OWN_MAX: 80, SHEET_K: 3, VOICES,
    SFX: { body: 'beast', how: 'topple', pal: 'coin', style: 'claw', w: 1 },
    MOVES: ['gulp', 'chomp', 'roar'], MOVE_NAMES: { gulp: '吞', chomp: '大嘴一合', roar: '饿了（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.2 + 1 / 12, 1.2 + 3 / 12, 1.2 + 5 / 12, 1.2 + 9 / 12]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.25, 0.5, 0.75], 'gulp'], [CAST, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12], 'gulp'], [RECOVER, [0.08, 0.25, 0.5], 'gulp'],
      [CHARGE, [0, 0.17, 0.33, 0.5, 0.67], 'chomp'], [CAST, [0, 2 / 12], 'chomp'], [RECOVER, [0.08, 0.2, 0.45], 'chomp'],
      [CHARGE, [0, 0.25, 0.5], 'roar'], [CAST, [0, 2 / 12, 4 / 12], 'roar'], [RECOVER, [0.1, 0.3, 0.6], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.7, 0.9, 1.1, 1.4, 1.8, 2.3, 2.6]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
