// 鼠王 · 腐烂鼠王（小首领，雾中小镇 · 墓园）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js。
// 依据：附录 G2「戴冠的腐烂老鼠」；被动 鼠王之冠（场上每有 1 只老鼠，它受伤 −8%）；招式 鼠潮 ratTide（钻出一群脆弱的老鼠）、瘟疫咬 plagueBite（咬中叠毒）；半血 钻洞（钻进土里 3 秒，出来一次放 8 只）。
// 设定卡 ——
//   剪影：一只人立的巨鼠，驼得很厉害：大肚子、高高的驼背、脑袋往前探；尖长的鼻子、两颗黄色大门牙露在嘴外（识别点之一）；
//         头顶一顶歪戴的锈金王冠（五个尖、正中一颗毒绿的宝石，一个尖是弯的）夹在两只大圆耳朵中间——站在战场右边，一眼就是「戴冠的老鼠」；
//         两颗小小的红眼睛发着光。身后拖一条长长的鳞尾巴，肩上一件烂成布条的破斗篷（还被虫蛀出了洞）。
//   身上：灰褐的癞皮，秃了几块露出粉灰的皮和绿脓包，胸侧烂出一个洞露出肋骨。近手一把生锈的豁口剁肉刀，远手拄一根腿骨做的权杖、杖头是一颗老鼠头骨（眼窝里亮着毒绿）。
//         脚边总有小老鼠：待机时一只在它脚下跑来跑去。
//   主色：灰褐癞皮 + 暗紫灰破布 + 锈金王冠，全部压暗；光：红眼、毒绿（杖头骨、宝石、脓包、瘟疫咬时的口水）。
//   招式（setMove）：
//     ratTide 鼠潮：踮脚、举起骨杖尖叫，脚前的土裂开一个冒绿光的鼠洞、小鼠头一个个探出来 → 骨杖往洞里一戳，五只小鼠一只接一只蹿出去（绿色地浪、土块）。
//     plagueBite 瘟疫咬：压低身子、尾巴翘起抖动，嘴越张越大、门牙发绿、口水往下滴 → 往前一扑咬合（绿雾 + 毒液飞溅）→ 退回来嚼。
//     roar 钻洞（半血怒吼）：缩成一团 → 人立、仰天尖叫，双臂张开，小鼠从脚下四散 → 趴下两手刨土（土块飞溅），准备钻进去。
//   普攻：剁肉刀举过头 → 斜劈下来。受击：闪白、后仰、王冠被打歪。
//   死亡：尖叫 → 捂着身子弯下去，刀脱手插进土里 → 脸朝下扑倒，王冠掉下来滚到一边，小鼠从它身下四散逃走 → 化成绿色的腐气。
PCD.define('B_DecayingChampionRat', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：皮毛和破布都压暗，红眼和毒绿才亮得出来 ─────
  const R_FUR = ['#070605', '#110e0b', '#1b1611', '#261f18', '#322920', '#3e3428', '#4b4031', '#5a4d3b', '#6b5d48', '#807058', '#98876c'];     // 灰褐癞皮
  const R_FLESH = ['#0d0608', '#1c0d10', '#2b1418', '#3c1d21', '#4e272a', '#613234', '#743e3e', '#894d4a', '#9e5f58', '#b47469', '#c98d80'];   // 秃皮、尾巴、耳朵、爪子
  const R_RAG = ['#070508', '#100c11', '#19131a', '#231b23', '#2d232c', '#382c35', '#44363e', '#514148', '#5f4d52'];                             // 烂斗篷
  const R_RUST = ['#1a0a04', '#34160a', '#502410', '#6e3416', '#8c461e', '#a85a28'];                                                               // 铁锈（和守墓人同一条）
  const FUR = defDeep(R_FUR, { depth: 9, amb: 0.12 }), FURD = defDeep(R_FUR, { depth: 6, dark: 3, amb: 0.08 }), FURS = defDeep(R_FUR, { depth: 2, amb: 0.34 });
  const FLESH = defDeep(R_FLESH, { depth: 4, amb: 0.14 }), FLESHD = defDeep(R_FLESH, { depth: 3, dark: 3, amb: 0.1 });
  const RAG = defDeep(R_RAG, { depth: 6, amb: 0.1 }), RAGD = defDeep(R_RAG, { depth: 3, dark: 1, amb: 0.1 });
  const CROWN = defDeep('brass', { depth: 3, dark: 2, amb: 0.16 }), RUST = defDeep(R_RUST, { depth: 2, amb: 0.2 });
  const TOOTH = defDeep('ivory', { depth: 2, amb: 0.3 }), BONE = defDeep('ivory', { depth: 3, amb: 0.22 });
  const STEEL = defDeep('bladesteel', { depth: 3, dark: 2, amb: 0.12 }), WOOD = defDeep('hide', { depth: 2, amb: 0.16 }), DIRT = defDeep('hide', { depth: 2, dark: 3, amb: 0.1 });
  const EYE = defMat([55, 56, 57, 58], 1, 1), EYE2 = defMat([56, 57, 58, 21], 1, 1), TOX1 = defMat([34, 48, 49, 50], 1, 1), TOX2 = defMat([48, 49, 50, 21], 1, 1);
  const VOIDM = defMat([0, 0, 0, 52], 1, 1), MOUTHM = defMat([0, 55, 55, 56], 1, 1);
  const POI = FXR[FXI.poison];
  const hero = new Sprite(180, 124, 80, 114);
  const DUR = [2.4, 2 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { ratTide: { 3: 0.6, 4: 0.5, 5: 0.6 }, plagueBite: { 3: 1.2, 4: 0.4, 5: 0.6 }, roar: { 3: 0.5, 4: 0.6, 5: 0.7 } };
  let MV = 'ratTide';
  const HX = 96;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [50, 49, 48], k: 0.75 }, { x: 0, y: 0, r: 0, ramp: [58, 57, 56], k: 0.6 }, { x: 0, y: 0, r: 0, ramp: [50, 49, 48], k: 0.85 }];
  const RIM_R = [0, 10, 16, 24], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: POI, flash: 0, dq: 0, lights: null, skip: new Uint8Array(64) };
  RIM.skip[EYE] = RIM.skip[EYE2] = RIM.skip[TOX1] = RIM.skip[TOX2] = RIM.skip[VOIDM] = RIM.skip[MOUTHM] = 1;

  // ───── 骨架（站立时的本地坐标，脚底 y = 0，面朝右）─────
  const HIP = [-4, -22], HN = [-1, -23], HF = [-6, -24], SHN = [10, -44], SHF = [4, -46], NECK = [12, -46];
  const ROOT = { n: [-2, 0], f: [-8, 0] };
  // 走路 8 帧（12 fps，一圈 2/3 秒）：近腿 [前后, 离地]，远腿差半圈
  const WALK = [[6, 0], [3, 0], [0, 0], [-3, 0], [-6, 2], [-4, 5], [1, 6], [5, 3]], WBY = [1, 0, -1, 0, 1, 0, -1, 0];
  // 剁肉刀：近手相对近肩的位置 + 刀的朝向（0 朝上、顺时针为正；刃口在顺时针那一侧）
  const G = { idle: [5, 12, 1.95], wind: [-11, -14, -1.25], strike: [14, 10, 2.05], follow: [10, 16, 2.65], spread: [11, -4, 0.9], point: [6, 14, 2.3],
    back: [-4, 10, 2.9], lunge: [-1, 12, 2.9], roar: [15, 6, 1.5], tuck: [3, 8, 2.8], hurt: [2, 12, 2.5], dig1: [14, 17, 2.7], dig2: [11, 7, 1.4], limp: [6, 16, 2.9] };
  // 骨杖：远手相对远肩的位置 + 杖的朝向
  const S = { idle: [-4, 14, -0.22], raise: [3, -8, 0.12], slam: [12, 12, -0.35], back: [-7, 13, -0.4], roar: [-7, -9, -0.6], tuck: [0, 10, -0.1], hurt: [-7, 12, -0.45],
    dig1: [8, 9, -0.9], dig2: [12, 16, -0.5], limp: [-2, 16, -0.9] };

  const P = {}, RATS = [];
  const FIELDS = ['st', 'lean', 'bx', 'by', 'hd', 'mouth', 'eyes', 'glow', 'rim', 'flash', 'dq', 'crown', 'cr', 'tail', 'tailUp', 'cape', 'ears', 'nose', 'whisk',
    'nlx', 'nly', 'flx', 'fly', 'hx', 'hy', 'ha', 'qx', 'qy', 'qa', 'hole', 'drop', 'rh'];
  function base() {
    P.st = 0; P.lean = 0; P.bx = 0; P.by = 0; P.hd = 0; P.mouth = 0; P.eyes = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0; P.crown = 0; P.cr = -1;
    P.tail = 0; P.tailUp = 0; P.cape = 0; P.ears = 0; P.nose = 0; P.whisk = 0; P.nlx = 0; P.nly = 0; P.flx = 0; P.fly = 0; P.hole = 0; P.drop = 0; P.rh = 0;
    P.mx = 0; P.flip = 0; RATS.length = 0; grip(G.idle); sgrip(S.idle);
  }
  const grip = (g) => { P.hx = g[0]; P.hy = g[1]; P.ha = g[2]; };
  const mixG = (a, b, q) => { P.hx = a[0] + (b[0] - a[0]) * q; P.hy = a[1] + (b[1] - a[1]) * q; P.ha = a[2] + (b[2] - a[2]) * q; };
  const sgrip = (g) => { P.qx = g[0]; P.qy = g[1]; P.qa = g[2]; };
  const mixS = (a, b, q) => { P.qx = a[0] + (b[0] - a[0]) * q; P.qy = a[1] + (b[1] - a[1]) * q; P.qa = a[2] + (b[2] - a[2]) * q; };
  const walk = (f) => { f = ((f % 8) + 8) % 8; const a = WALK[f], b = WALK[(f + 4) % 8]; P.nlx = a[0]; P.nly = a[1]; P.flx = b[0]; P.fly = b[1]; P.by = WBY[f];
    P.lean = 0.2; P.hd = -0.08 + (f & 1 ? 0.03 : 0); P.tail = [2, 1, 0, -1, -2, -1, 0, 1][f]; P.cape = f < 4 ? 1 : -1; P.hx += b[0] * 0.4; P.qx += a[0] * 0.3; P.hy += P.by; P.qy += P.by; };
  const rat = (x, y, d, f, kind) => RATS.push([Math.round(x), Math.round(y), d, f & 7, kind || 0]);
  const TAIL_IDLE = [0, 1, 2, 1, 0, -1];

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2.5) & 1; P.by = b; P.lean = b ? 0.025 : 0; P.hy += b; P.qy += b;
      P.tail = TAIL_IDLE[Math.floor(tt / 0.4) % 6]; P.cape = P.tail >> 1; P.whisk = (f12 % 6) === 0 ? 1 : 0;
      const lp = tt % DUR[IDLE];
      if (lp >= 1.3 && lp < 2.1) { const k = Math.floor((lp - 1.3) * 12); P.hd = -0.18; P.nose = k & 1; P.whisk = k & 1 ? 1 : -1; P.mouth = k > 2 && (k & 2) ? 1 : 0; P.crown = k < 6 ? ((k & 1) ? 0.07 : -0.03) : 0; P.ears = 0; }   // 待机个性：抬鼻子嗅、门牙打颤、王冠跟着晃
      P.crk = (f12 % 7) === 0 ? 1 : 0;
      // 脚下的小老鼠：在身后蹲着 → 跑到身前 → 蹲着啃 → 跑回来
      if (lp < 0.5) rat(-60, 0, 1, 0);
      else if (lp < 1.1) rat(-60 + 96 * (lp - 0.5) / 0.6, 0, 1, Math.floor(lp * 12));
      else if (lp < 1.8) rat(36, 0, -1, (Math.floor(lp * 6) & 1) ? 2 : 0);
      else rat(36 - 96 * (lp - 1.8) / 0.6, 0, -1, Math.floor(lp * 12));
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 12); walk(f); const w = walkDemo(tq, 26, -1); P.mx = w.mx; P.flip = w.flip; rat(20 + ((f >> 1) & 1) * 2, (f & 1) ? -1 : 0, 1, f); rat(-30 - ((f >> 1) & 1), (f & 1) ? 0 : -1, 1, f + 3); }
    else if (st === ATTACK) {
      rat(-60, 0, 1, 0);
      if (tq < 0.17) { const q = ease.out(tq / 0.17); mixG(G.idle, G.wind, q); P.lean = -0.1 * q; P.hd = -0.12 * q; P.mouth = 1; P.tailUp = q; P.glow = 1; P.ears = 1; }
      else if (tq < 0.25) { grip(G.wind); P.lean = -0.12; P.hd = -0.14; P.mouth = 1; P.eyes = 2; P.glow = 1; P.rim = 1; P.nlx = 2; P.tailUp = 1; P.ears = 1; }
      else if (tq < 0.42) { const q = ease.out((tq - 0.25) / 0.17); mixG(G.strike, G.follow, q); P.lean = 0.26; P.bx = 4; P.hd = 0.16; P.mouth = 2; P.eyes = 2; P.glow = 2; P.rim = 2; P.nlx = 6; P.flx = -2; P.tail = 2; P.tailUp = 0.6; P.cape = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); mixG(G.follow, G.idle, q); P.bx = Math.round(4 * (1 - q)); P.lean = 0.26 * (1 - q); P.hd = 0.16 * (1 - q); P.nlx = Math.round(6 * (1 - q)); P.glow = q < 0.5 ? 1 : 0; P.mouth = q < 0.3 ? 1 : 0; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { grip(G.hurt); sgrip(S.hurt); P.lean = -0.16; P.bx = -2; P.hd = -0.28; P.eyes = 1; P.mouth = 1; P.flash = h < 1 / 12 ? 1 : 0; P.ears = 1; P.tail = -2; P.tailUp = 0.6; P.crown = 0.14; P.cape = 1; }
      else if (h < 0.35) { mixG(G.hurt, G.idle, 0.5); mixS(S.hurt, S.idle, 0.5); P.lean = -0.07; P.bx = -1; P.eyes = 1; P.crown = 0.07; P.tail = -1; P.ears = 1; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); mixG(G.hurt, G.idle, 0.5 + q * 0.5); mixS(S.hurt, S.idle, 0.5 + q * 0.5); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    focus();
    let rh = 0; for (const r of RATS) rh = (Math.imul(rh, 31) + r[0] * 7 + r[1] * 13 + r[2] * 3 + r[3] + r[4] * 17) | 0; P.rh = rh / 64;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  const MVI = { ratTide: 0, plagueBite: 1, roar: 2 };
  function skillPose(st, tq, f12) {
    if (MV === 'ratTide') {
      if (st === CHARGE) {   // 踮脚举杖尖叫，脚前的土裂开、鼠洞冒绿光，小鼠头一个个探出来
        const q = ease.out(clamp01(tq / 0.25));
        P.lean = -0.18 * q; P.hd = -0.4 * q; P.by = -Math.round(q); P.nly = Math.round(q); P.fly = Math.round(q); mixS(S.idle, S.raise, q); mixG(G.idle, G.spread, q);
        P.mouth = tq > 0.1 ? 2 : 1; P.eyes = 2; P.glow = tq < 0.2 ? 1 : 2 + (f12 & 1); P.rim = 2; P.hole = tq < 0.15 ? 1 : tq < 0.35 ? 2 : 3;
        P.tail = (f12 & 1) ? 2 : 0; P.tailUp = 0.7; P.bx = tq > 0.3 && (f12 & 1) ? 1 : 0; P.cape = -1; P.crown = -0.08;
        const n = Math.min(3, Math.floor(tq / 0.15)); for (let i = 0; i < n; i++) rat(22 + i * 5, ((f12 + i) & 1) ? 0 : -1, i === 1 ? -1 : 1, 0, 1);
      } else if (st === CAST) {   // 骨杖戳进洞里，小鼠一只接一只蹿出去
        sgrip(S.slam); grip(G.point); P.lean = 0.18; P.hd = 0.1; P.by = 1; P.mouth = tq < 0.25 ? 2 : 1; P.eyes = 2; P.glow = 3; P.rim = tq < 1 / 12 ? 3 : 2; P.hole = 3; P.nlx = 3; P.tail = 2; P.cape = 1;
        tideRats(tq, f12);
      } else {
        const q = ease.inOut(clamp01(tq / 0.5)); mixS(S.slam, S.idle, q); mixG(G.point, G.idle, q); P.lean = 0.18 * (1 - q); P.hd = 0.1 * (1 - q); P.nlx = Math.round(3 * (1 - q));
        P.glow = q < 0.5 ? 1 : 0; P.hole = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; tideRats(tq + 0.5, f12);
      }
    } else if (MV === 'plagueBite') {
      if (st === CHARGE) {   // 压低、尾巴翘起抖动，嘴越张越大、门牙发绿、口水往下滴
        const q = ease.out(clamp01(tq / 0.4)), late = tq > 0.8;
        P.by = Math.round(5 * q); P.lean = 0.32 * q; P.hd = 0.28 * q; mixG(G.idle, G.back, q); mixS(S.idle, S.back, q);
        P.mouth = tq > 0.25 ? 2 : 1; P.eyes = 2; P.glow = tq < 0.4 ? 1 : 2 + (late ? (f12 & 1) : 0); P.rim = tq < 0.4 ? 1 : 2;
        P.tailUp = q; P.tail = tq > 0.6 ? ((f12 & 1) ? 2 : -1) : 1; P.ears = 1; P.bx = late && (f12 & 1) ? -1 : 0; P.cape = -1; P.nlx = -1; P.flx = -2;
      } else if (st === CAST) {   // 往前一扑，咬合（出手帧就是咬下去的那一帧）
        P.bx = 12; P.by = 2; P.lean = 0.5; P.hd = 0.14; P.mouth = 0; P.eyes = 2; P.glow = 3; P.rim = tq < 1 / 12 ? 3 : 2; P.nlx = 9; P.flx = 3; P.fly = tq < 1 / 12 ? 2 : 0;
        grip(G.lunge); sgrip(S.back); P.tailUp = 1; P.tail = -2; P.ears = 1; P.cape = 2;
      } else {
        const q = ease.inOut(clamp01(tq / 0.5)); P.bx = Math.round(12 * (1 - q)); P.by = Math.round(2 * (1 - q)); P.lean = 0.5 * (1 - q); P.hd = 0.14 * (1 - q);
        P.mouth = q < 0.8 ? Math.floor(tq * 6) & 1 : 0; P.glow = q < 0.5 ? 1 : 0; mixG(G.lunge, G.idle, q); mixS(S.back, S.idle, q); P.nlx = Math.round(9 * (1 - q)); P.flx = Math.round(3 * (1 - q)); P.tailUp = 1 - q;
      }
    } else {   // roar：半血的「钻洞」——缩成一团 → 人立尖叫 → 趴下刨土
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.3)); P.by = Math.round(4 * q); P.lean = 0.35 * q; P.hd = 0.25 * q; mixG(G.idle, G.tuck, q); mixS(S.idle, S.tuck, q);
        P.eyes = 2; P.glow = 1 + (tq > 0.25 ? (f12 & 1) : 0); P.rim = 1; P.bx = tq > 0.2 && (f12 & 1) ? 1 : 0; P.ears = 1; P.mouth = 1; P.tailUp = 0.5;
      } else if (st === CAST) {
        const q = ease.out(clamp01(tq / 0.12)); P.lean = -0.3 * q; P.hd = -0.5 * q; P.by = -Math.round(2 * q); P.nly = Math.round(2 * q); P.fly = Math.round(2 * q);
        mixG(G.tuck, G.roar, q); mixS(S.tuck, S.roar, q); P.mouth = 2; P.eyes = 2; P.glow = 3; P.rim = tq < 1 / 12 ? 3 : 2; P.tail = (f12 & 1) ? 2 : -2; P.tailUp = 1; P.crown = (f12 & 1) ? -0.12 : -0.04; P.cape = (f12 & 1) ? -2 : -1;
        roarRats(tq, f12);
      } else {
        roarRats(tq + 0.6, f12);
        if (tq < 0.45) { const q = ease.out(clamp01(tq / 0.12)), ph = Math.floor(tq * 6) & 1;
          P.lean = -0.3 + 1.1 * q; P.by = Math.round(5 * q); P.hd = 0.35 * q; P.mouth = 1; P.eyes = 2; P.glow = 1; P.nlx = 3; P.flx = -1; P.tailUp = 0.8; P.tail = ph ? 1 : -1;
          if (q < 1) { mixG(G.roar, G.dig1, q); mixS(S.roar, S.dig2, q); } else { grip(ph ? G.dig1 : G.dig2); sgrip(ph ? S.dig1 : S.dig2); }
        } else { const q = ease.inOut(clamp01((tq - 0.45) / 0.25)); P.lean = 0.8 * (1 - q); P.by = Math.round(5 * (1 - q)); P.hd = 0.35 * (1 - q); mixG(G.dig1, G.idle, q); mixS(S.dig2, S.idle, q); P.nlx = Math.round(3 * (1 - q)); P.tailUp = 0.8 * (1 - q); }
      }
    }
  }
  function tideRats(tt, f12) {
    for (let i = 0; i < 5; i++) { const u = tt - i * 0.06; if (u < 0) { rat(22 + i * 3, (f12 + i) & 1 ? 0 : -1, 1, 0, 1); continue; }
      const x = 26 + u * 130 + (i & 1) * 3; if (x > 104) continue; rat(x, -Math.round(Math.abs(Math.sin(u * 15 + i)) * 4), 1, Math.floor(u * 12) + i); }
  }
  function roarRats(tt, f12) {
    const DIRS = [[1, 1.0], [-1, 0.9], [1, 0.6], [-1, 0.55], [1, 1.25], [-1, 1.2]];
    DIRS.forEach(([d, v], i) => { const u = tt - i * 0.05; if (u < 0) return; const x = d * (6 + u * 110 * v) + (d > 0 ? 4 : -8); if (x > 104 || x < -82) return; rat(x, -Math.round(Math.abs(Math.sin(u * 14 + i)) * 3), d, Math.floor(u * 12) + i); });
  }
  function deathPose(d, f12) {
    if (d < 0) { rat(-60, 0, 1, 0); return; }
    if (d < 0.3) { grip(G.hurt); sgrip(S.hurt); P.lean = -0.2; P.bx = -2; P.hd = -0.42; P.mouth = 2; P.eyes = 2; P.flash = d < 1 / 12 ? 1 : 0; P.ears = 1; P.tail = -2; P.tailUp = 1; P.crown = 0.15; P.cape = 1; rat(-60 - d * 40, 0, -1, f12); return; }
    const q1 = ease.inOut(clamp01((d - 0.3) / 0.45)), q2 = ease.in(clamp01((d - 0.75) / 0.35));
    P.lean = -0.2 * (1 - q1) + 0.35 * q1 + 1.12 * q2; P.by = Math.round(5 * q1 + 13 * q2); P.hd = 0.2 * q1 + 0.3 * q2; P.mouth = d < 1.2 ? 1 : 0; P.eyes = 1; P.ears = 1;
    P.nlx = Math.round(4 * q1 + 6 * q2); P.flx = Math.round(-2 * q1 + 3 * q2); P.bx = Math.round(-2 * (1 - q1));
    mixG(G.hurt, G.limp, q1); mixS(S.hurt, S.limp, q1); P.drop = d >= 0.55 ? 1 : 0; P.crown = 0.15 + 0.25 * q1;
    P.cr = d >= 0.85 ? Math.round(clamp01((d - 0.85) / 0.5) * 12) / 12 : -1;
    P.tail = d > 1.15 && d < 1.8 ? (((f12 >> 1) & 1) ? 2 : -1) : 0; P.tailUp = d > 1.15 && d < 1.8 && ((f12 >> 1) & 1) ? 0.4 : 0; P.cape = q2 ? 2 : 0;
    if (d > 1.05) { const u = d - 1.05; [[1, 1], [-1, 0.8], [1, 0.6], [-1, 1.3]].forEach(([dd, v], i) => { const x = dd * (4 + u * 90 * v) + 4; if (x < 104 && x > -82) rat(x, -Math.round(Math.abs(Math.sin(u * 15 + i)) * 3), dd, Math.floor(u * 12) + i); }); }
    if (d > 1.95) P.dq = Math.round(clamp01((d - 1.95) / 0.7) * 48) / 48;
  }
  // 发光体（蓄力汇聚点）：鼠潮 = 杖头骨，瘟疫咬 = 嘴，钻洞 = 头，其余 = 刀刃
  function focus() { geo(); const f = MV === 'ratTide' ? L.skull : MV === 'plagueBite' ? L.mouth : MV === 'roar' ? L.head : L.blade;
    const g = P.st === CHARGE || P.st === CAST || P.st === RECOVER ? f : L.blade; P.fx = g[0]; P.fy = g[1]; P.gx = P.fx; P.gy = P.fy; }

  // ───── 几何（画和特效共用）─────
  const L = {};
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(HIP[0], HIP[1], P.lean); }
  function headXf() { bodyXf(); B.rot(NECK[0], NECK[1], P.hd); }
  function geo() {
    bodyXf();
    L.hn = B.at(HN[0], HN[1]); L.hf = B.at(HF[0], HF[1]); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.tailR = B.at(-13, -20);
    B.rot(NECK[0], NECK[1], P.hd); L.eye = B.at(26.5, -52.5); L.mouth = B.at(33, -42.5); L.head = B.at(22, -54); B.reset();
    for (const k of ['n', 'f']) { const hip = L['h' + k], ank = [ROOT[k][0] + P[k + 'lx'], -5 - P[k + 'ly']], toe = [ank[0] + 7, Math.min(0, ank[1] + 5)];
      L[k] = { hip, knee: B.ik(hip, ank, 11, 10, -1), ank, toe }; }
    const a = P.ha; L.dir = [Math.sin(a), -Math.cos(a)]; L.perp = [Math.cos(a), Math.sin(a)]; L.gn = [L.shN[0] + P.hx, L.shN[1] + P.hy];
    L.blade = [L.gn[0] + L.dir[0] * 14 + L.perp[0] * 4, L.gn[1] + L.dir[1] * 14 + L.perp[1] * 4];
    const s = P.qa; L.sdir = [Math.sin(s), -Math.cos(s)]; L.gf = [L.shF[0] + P.qx, L.shF[1] + P.qy]; L.skull = [L.gf[0] + L.sdir[0] * 29, L.gf[1] + L.sdir[1] * 29];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);

  function drawHole() {
    if (!P.hole) return; B.reset(); const r = [0, 4, 7, 9][P.hole], x = 26;
    part(); B.ell(E, x, 0.4, r + 3, 2.6, 0, DIRT); for (const dx of [-r - 3, -r, r + 1, r + 3]) B.px(E, x + dx, -2, DIRT, 7);   // 翻出来的土
    part(); B.ell(E, x, 0.8, r, 1.6, 0, VOIDM);
    if (P.glow >= 2) for (let i = -r + 1; i < r; i += 2) B.px(E, x + i, 0, TOX1);
  }
  function drawTail() {
    part(); const r = L.tailR, s = P.tail, u = P.tailUp;
    const a = B.bez(r, [-27 - s, -6 - u * 12], [-41 - s * 2, -2 - u * 16], 10), b = B.bez(a[10], [-48 - s * 2, -2 - u * 18], [-50 - s * 3, -8 - u * 18], 4);
    const pts = a.concat(b.slice(1)).map((p) => [p[0], Math.min(p[1], -0.6)]);
    B.reset(); B.strand(E, pts, 3, 0.6, FLESH);
    for (let i = 1; i < pts.length - 1; i++) B.px(E, pts[i][0], pts[i][1] - 0.4, FLESH, i & 1 ? 3 : 7);   // 鳞环
  }
  function drawCape() {
    part(); bodyXf(); const c = P.cape;
    B.poly(E, [[3, -51], [-5, -51], [-11, -47], [-16, -39], [-19, -29], [-21 + c, -19], [-23 + c, -8], [-20 + c, -10], [-18 + c, -4], [-15 + c, -9], [-12 + c, -5], [-10 + c, -10], [-7 + c, -7], [-5, -13], [-3, -22]], RAG);
    B.ln(E, -8, -45, -14 + c, -10, RAG, 3); B.ln(E, -3, -46, -8 + c, -12, RAG, 3); B.ln(E, -13, -41, -19 + c, -14, RAG, 7); B.ln(E, -6, -49, -15, -40, RAG, 8);
    for (const [x, y] of [[-12, -27], [-11, -26], [-12, -26], [-7, -33], [-17 + c, -15]]) B.px(E, x, y, 0);   // 虫蛀的洞
    for (const [x, y] of [[-15, -21], [-9, -18], [-16, -33]]) B.px(E, x, y, RAG, 8);                       // 霉斑
  }
  function drawScepter() {
    B.reset(); const d = L.sdir, g = L.gf, at = (u) => [g[0] + d[0] * u, g[1] + d[1] * u];
    part(); const b0 = at(-34), b1 = at(25); capW(b0[0], b0[1], b1[0], b1[1], 1.1, 1.3, BONE); dot(b0[0], b0[1], 1.7, BONE); dot(b1[0], b1[1], 2, BONE, 4);   // 腿骨杖
    const m = at(-8); lnW(m[0] - 1, m[1], m[0] + 1, m[1], BONE, 3);
    part(); const s0 = at(23); B.strand(E, [[s0[0] - 1, s0[1]], [s0[0] - 3 - P.cape, s0[1] + 5], [s0[0] - 4 - P.cape * 1.5, s0[1] + 10]], 1.5, 0.6, RAGD);   // 系着的布条
    part(); const k = L.skull; B.ell(E, k[0] - 0.5, k[1], 4.2, 3.4, 0, BONE); B.poly(E, [[k[0] + 1, k[1] - 2.8], [k[0] + 7.5, k[1] - 0.4], [k[0] + 7.5, k[1] + 1.6], [k[0] + 1, k[1] + 2.8]], BONE); B.ln(E, k[0] - 3, k[1] - 2.5, k[0] + 5, k[1] - 1.5, BONE, 8);   // 杖头的鼠头骨
    B.ln(E, k[0] - 3, k[1] - 2, k[0] - 1, k[1] - 1, BONE, 3); B.px(E, k[0] + 6, k[1] + 2.4, TOOTH, 8); B.px(E, k[0] + 5, k[1] + 2.4, TOOTH, 8);
    B.ell(E, k[0] + 2, k[1] - 0.4, 1.3, 1.1, 0, BONE, 1); B.px(E, k[0] + 2, k[1] - 0.6, P.glow >= 1 ? TOX2 : TOX1); B.px(E, k[0] + 3, k[1] - 0.6, TOX1); B.px(E, k[0] - 1, k[1] + 0.5, BONE, 2);
  }
  function drawArm(far) {
    const sh = far ? L.shF : L.shN, gp = far ? L.gf : L.gn, m = far ? FURD : FUR, fl = far ? FLESHD : FLESH;
    const el = B.ik(sh, gp, 8.5, 8, 1);
    part(); capW(sh[0], sh[1], el[0], el[1], far ? 3.4 : 4, 2.6, m);
    if (!far) { px((sh[0] + el[0]) / 2 + 1, (sh[1] + el[1]) / 2 - 1, m, 7); px((sh[0] + el[0]) / 2 - 1, (sh[1] + el[1]) / 2 + 1, m, 3); }
    part(); capW(el[0], el[1], gp[0], gp[1], 2.4, 1.8, m); if (!far) px((el[0] + gp[0]) / 2, (el[1] + gp[1]) / 2, fl, 5);   // 前臂上一块秃皮
    part(); dot(gp[0], gp[1], 2, fl); px(gp[0] - 1, gp[1] - 1, fl, 7);
    for (let i = -1; i <= 1; i++) px(gp[0] + 2, gp[1] + i + 0.5, TOOTH, far ? 4 : 7);   // 爪尖
  }
  function drawLeg(k, far) {
    const g = L[k], m = far ? FURD : FUR, fl = far ? FLESHD : FLESH;
    part(); dot(g.hip[0] - 1, g.hip[1] + 1, far ? 5.5 : 6.5, m); capW(g.hip[0], g.hip[1], g.knee[0], g.knee[1], far ? 4.2 : 5, 3.2, m);   // 大腿（鼠的后腿很粗）
    if (!far) { px(g.hip[0] - 2, g.hip[1] - 3, m, 7); lnW(g.hip[0] + 2, g.hip[1] + 2, g.knee[0] - 1, g.knee[1] - 1, m, 3); }
    part(); capW(g.knee[0], g.knee[1], g.ank[0], g.ank[1], 2.5, 1.7, m); px(g.ank[0] - 1.5, g.ank[1] - 1, m, far ? 2 : 3);
    part(); capW(g.ank[0], g.ank[1], g.toe[0], g.toe[1], 1.6, 1.2, fl); px(g.ank[0] + 2, g.ank[1] + 1, fl, far ? 5 : 7);   // 长长的粉脚
    lnW(g.toe[0] + 1, g.toe[1], g.toe[0] + 2.5, g.toe[1], TOOTH, far ? 4 : 7);
  }
  function drawBody() {
    part(); bodyXf();
    B.ell(E, -4, -29, 11.5, 10, 0.2, FUR); B.ell(E, 1, -39, 11, 10, -0.5, FUR); B.ell(E, 8, -44, 7, 6, -0.3, FUR);
    B.ell(E, 1, -26, 6, 6.5, 0, FUR, 6);                                                                              // 浅一点的肚皮
    for (const [x, y, t] of [[-10, -38, 3], [-6, -42, 3], [-12, -30, 3], [-1, -45, 3], [-8, -24, 3], [4, -38, 7], [-4, -36, 7], [-11, -34, 7], [3, -31, 3], [-2, -40, 3]]) B.ln(E, x, y, x - 2, y + 3, FUR, t);   // 乱毛
    B.ln(E, -10, -46, -2, -50, FUR, 8); B.ln(E, 2, -50, 8, -49, FUR, 7);                                               // 驼背的高光
    part(); for (const [x, y] of [[-12, -44], [-8, -47.5], [-3, -49.5], [2, -50.5]]) B.poly(E, [[x - 1.6, y + 1.5], [x + 1.6, y + 1.5], [x - 2.2, y - 3]], FUR);   // 背上一撮撮的癞毛
    part(); B.ell(E, -9, -37, 4.2, 3, 0.4, FLESH); B.px(E, -10, -37, FLESH, 3); B.px(E, -8, -36, FLESH, 3); B.px(E, -9, -38, P.glow ? TOX2 : TOX1); B.px(E, -11, -36, TOX1);   // 秃斑 + 脓包
    part(); B.ell(E, -13, -28, 2.4, 1.8, 0.2, FLESH); B.px(E, -13, -28, TOX1);
    part(); B.ell(E, 4, -34, 3, 3.8, 0, VOIDM); B.ln(E, 2, -36.5, 6, -37, BONE, 6); B.ln(E, 2, -34, 6, -34.5, BONE, 6); B.ln(E, 2.5, -31.5, 5.5, -32, BONE, 5);   // 烂穿的洞 + 肋骨
    if (P.glow >= 2) B.px(E, 4, -33, TOX1);
  }
  function drawMantle() {
    part(); bodyXf(); const c = P.cape * 0.5;
    B.poly(E, [[-1, -51], [6, -52], [12, -50], [15, -46], [14 + c, -40], [12, -42], [11 + c, -37], [8, -41], [6 + c, -36], [4, -40], [1 + c, -38], [-1, -43], [-4, -47]], RAG);   // 肩上的破布
    B.ln(E, 0, -50, 12, -49, RAG, 8); B.ln(E, 6, -50, 6.5, -41, RAG, 3); B.ln(E, 10, -49, 11, -43, RAG, 3); B.ln(E, 2, -49, 2, -42, RAG, 3); B.px(E, 8, -45, 0); B.px(E, 3, -44, 0);
    part(); B.ell(E, 12, -47, 1.8, 1.8, 0, CROWN); B.px(E, 12, -47, TOX1); B.px(E, 11, -48, CROWN, 9);   // 锈金扣
  }
  function drawCrown(cx, cy, a) {
    B.save(); B.rot(cx, cy, a);
    part(); for (const [dx, h, bd] of [[-7, 4, 0.3], [-3.5, 5.5, -1.2], [0, 7, 0], [3.5, 5.5, 0.2], [7, 4, 0.6]]) {   // 五个尖（第二个是弯的）
      B.poly(E, [[cx + dx - 1.7, cy - 1], [cx + dx + 1.7, cy - 1], [cx + dx + bd + 0.3, cy - 1 - h], [cx + dx + bd - 0.3, cy - 1 - h]], CROWN); B.ell(E, cx + dx + bd, cy - 1.6 - h, 1.1, 1.1, 0, CROWN, 7); }
    part(); B.poly(E, [[cx - 8.5, cy - 1.8], [cx + 8.5, cy - 1.8], [cx + 8, cy + 2.4], [cx - 8, cy + 2.4]], CROWN);
    B.ln(E, cx - 8, cy - 1.5, cx + 8, cy - 1.5, CROWN, 8); B.ln(E, cx - 8, cy + 2, cx + 8, cy + 2, CROWN, 3);
    for (const dx of [-6, -3, 3, 6]) B.px(E, cx + dx, cy + 0.3, CROWN, dx === 3 ? 3 : 9);
    B.px(E, cx - 5, cy + 1, RUST); B.px(E, cx - 4, cy + 1, RUST, 6); B.px(E, cx + 5, cy - 1, RUST); B.px(E, cx + 6, cy + 1, RUST, 4); B.px(E, cx - 7, cy - 3, RUST);   // 锈
    part(); B.ell(E, cx, cy + 0.3, 1.5, 1.5, 0, P.glow >= 2 ? TOX2 : TOX1); B.px(E, cx - 0.5, cy - 0.5, TOX2);
    B.restore();
  }
  function drawHead() {
    part(); headXf();
    B.save(); B.rot(7, -55, -0.4 * P.ears); B.ell(E, 4.5, -59, 5, 6, -0.4, FURD); B.ell(E, 5, -58.5, 3, 4, -0.4, FLESHD, 6); B.restore();   // 远耳
    if (P.mouth) { part(); B.poly(E, [[22, -46], [32, -45.5], [33, -43], [29, -38], [22, -41]], MOUTHM); }
    part(); B.save(); B.rot(22, -46, P.mouth * 0.3);   // 下颌
    B.poly(E, [[21, -47], [31, -45.8], [32, -44], [29.5, -42.5], [21, -41.5]], FUR); B.ln(E, 23, -42.5, 29, -43, FUR, 3); B.px(E, 30, -45, TOOTH, 8); B.px(E, 29, -45, TOOTH, 7);
    B.restore();
    part(); B.ell(E, 17, -52, 8, 7.2, 0.15, FUR); B.ell(E, 20, -47.5, 7, 4.5, 0.1, FUR);
    B.poly(E, [[20, -57.5], [27, -55], [33, -52], [36.2, -49.3], [35.8, -46.6], [31, -45.2], [22, -44.2]], FUR);                   // 尖长的鼻子
    B.ln(E, 21, -56.5, 33, -51.2, FUR, 8); B.ln(E, 15, -58.5, 21, -57.5, FUR, 8); B.ln(E, 14, -55, 17, -53, FUR, 3); B.ln(E, 13, -50, 16, -48.5, FUR, 3); B.ln(E, 27, -46, 33, -45.6, FUR, 2);
    B.ell(E, 26.5, -52.3, 2.2, 1.7, 0, FUR, 2);                                                                                         // 眼窝
    if (P.eyes === 1) B.ln(E, 25, -52.5, 28, -52.5, FUR, 10);
    else { B.px(E, 26, -53, EYE); B.px(E, 27, -53, P.eyes === 2 ? EYE2 : EYE); B.px(E, 26, -52, EYE); B.px(E, 27, -52, EYE); if (P.eyes === 2 || P.glow >= 2) { B.px(E, 26, -53, EYE2); B.px(E, 28, -53, EYE); } }
    B.ln(E, 23.5, -55.6, 28.5, -54.2, FUR, 2); B.ln(E, 25, -50.4, 28, -50.6, FUR, 3);                                                  // 压下来的眉骨、眼袋
    part(); B.ell(E, 17.5, -48.5, 2.4, 1.6, 0.2, FLESH); B.px(E, 17, -48, FLESH, 3); B.px(E, 18, -49, TOX1);                            // 腮上的烂斑
    part(); const nz = P.nose ? -0.7 : 0; B.ell(E, 35.6, -48.3 + nz, 1.8, 1.4, 0, FLESH, 6); B.px(E, 35, -49 + nz, FLESH, 9); B.px(E, 36.5, -48 + nz, FLESH, 2);   // 粉鼻头
    part(); B.poly(E, [[30.2, -45.6], [34.6, -45.6], [34.3, -39.6], [30.6, -39.2]], TOOTH, 8);                                           // 两颗黄门牙
    B.ln(E, 32.4, -45.3, 32.4, -39.6, TOOTH, 3); B.ln(E, 30.7, -45, 30.8, -40, TOOTH, 9); B.ln(E, 31, -39.4, 34, -39.6, TOOTH, 4); B.px(E, 33.4, -42.5, TOOTH, 5);
    if (MV === 'plagueBite' && P.glow >= 2 && (P.st === CHARGE || P.st === CAST)) { B.px(E, 31, -40, TOX2); B.px(E, 33, -40, TOX1); B.px(E, 31.5, -42, TOX1); }
    const w = P.whisk * 0.8; B.ln(E, 32, -48.6, 40, -51.6 - w, FUR, 9); B.ln(E, 32.5, -47.6, 41, -47.8 - w * 0.5, FUR, 9); B.ln(E, 31.5, -46.8, 39, -44 + w, FUR, 8);   // 胡须
    part(); B.save(); B.rot(10, -55, -0.45 * P.ears); B.ell(E, 8.5, -61, 5.6, 6.8, -0.35, FUR); B.ell(E, 9.2, -60.5, 3.6, 4.8, -0.35, FLESH, 6); B.ln(E, 7, -64, 8, -58, FLESH, 3); B.px(E, 10, -62, FLESH, 8);   // 近耳（缺了一口）
    B.px(E, 12.5, -65, 0); B.px(E, 13, -64, 0); B.px(E, 12, -66, 0); B.restore();
    if (P.cr < 0) drawCrown(20, -61, -0.2 + P.crown);
  }
  function crownGround() {   // 死亡：王冠从头上掉下来、滚到一边
    const c = P.cr, x = 30 + 16 * c, y = -3 - 16 * (1 - c) * (1 - c) + (c > 0.6 ? Math.abs(Math.sin(c * 12)) * -1 : 0);
    B.reset(); drawCrown(x, y, -0.2 + c * 2.1 - (c > 0.8 ? (c - 0.8) * 8.8 : 0));
  }
  function drawCleaver() {
    let d = L.dir, pp = L.perp, g = L.gn;
    if (P.drop) { const a = 2.55; d = [Math.sin(a), -Math.cos(a)]; pp = [Math.cos(a), Math.sin(a)]; g = [28, -13]; }   // 脱手，插在土里
    const at = (u, v) => [g[0] + d[0] * u + pp[0] * v, g[1] + d[1] * u + pp[1] * v], P2 = (u, v, m, t) => { const p = at(u, v); px(p[0], p[1], m, t); };
    part(); const h0 = at(-6, 0), h1 = at(3, 0); capW(h0[0], h0[1], h1[0], h1[1], 1.2, 1.1, WOOD); P2(-3, 0, WOOD, 3); P2(0, 0, WOOD, 3); P2(-6, 0, RUST);
    part(); polyW([at(2.5, -1.8), at(19, -2.2), at(20.5, 1), at(19.5, 8.8), at(12, 8.2), at(8, 9), at(2.5, 8)], STEEL);
    const s0 = at(3, -1), s1 = at(19, -1.2); lnW(s0[0], s0[1], s1[0], s1[1], STEEL, 8);
    for (let u = 3; u <= 19; u++) P2(u, u > 8 && u < 12 ? 7.3 : 7.7, STEEL, 9);                                         // 刃口
    P2(10, 8.6, 0); P2(15, 8.4, 0); P2(16, 8.4, 0); P2(16.5, 1.5, 0); P2(17.5, 1.5, 0);                                  // 豁口、挂孔
    for (const [u, v] of [[5, 2], [6, 5], [13, 3], [17, 6], [11, 5.5], [8, 1]]) P2(u, v, RUST, v > 4 ? 5 : 6);            // 锈斑
    if (P.glow >= 2) for (const u of [6, 10, 14]) P2(u, 6.8, TOX1);
  }
  function drawRat(r) {
    const [x, y, d, f, kind] = r;
    if (kind === 1) { part(); dot(x, y - 1.3, 1.9, FURS); part(); dot(x - d * 0.6, y - 3.2, 0.9, FLESHD); px(x + d * 2, y - 1, FLESH, 6); px(x + d * 0.8, y - 2, EYE); return; }   // 洞口探出来的小鼠头
    part(); const ty = y - 1 - (f & 1); lnW(x - d * 3, y - 1.5, x - d * 7, ty, FLESHD); lnW(x - d * 7, ty, x - d * 10, y - 2.5 + (f & 1), FLESHD);
    part(); dot(x - d * 1.2, y - 2.4, 2.4, FURS); dot(x + d * 1, y - 2.6, 2.1, FURS); px(x - d * 1, y - 4, FURS, 7);
    part(); dot(x + d * 3.4, y - 2.9, 1.7, FURS); px(x + d * 5, y - 2.4, FLESH, 6); px(x + d * 3.8, y - 3.4, EYE); px(x + d * 2.4, y - 4.9, FLESH, 5);
    px(x + d * ((f & 1) ? 2 : 1), y, FLESHD); px(x - d * ((f & 1) ? 1 : 2), y, FLESHD);
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, z); B.zoom(z); geo();
    drawHole(); drawTail(); drawCape();
    drawScepter(); drawArm(1); drawLeg('f', 1);
    drawBody(); drawLeg('n', 0); drawMantle(); drawHead();
    if (P.cr >= 0) crownGround();
    drawCleaver(); drawArm(0);
    for (const r of RATS) drawRat(r);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const X = (p) => p[0] * z + spr.ox, Y = (p) => p[1] * z + spr.oy;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHT[0].x = X(L.skull); LIGHT[0].y = Y(L.skull); LIGHT[0].r = (5 + P.glow * 4) * z;
    LIGHT[1].x = X(L.eye); LIGHT[1].y = Y(L.eye); LIGHT[1].r = (P.eyes === 1 ? 0 : P.eyes === 2 ? 7 : 4) * z;
    const bite = MV === 'plagueBite' && (P.st === CHARGE || P.st === CAST) && P.glow >= 2, hole = P.hole && P.glow >= 2, c = bite ? L.mouth : [26, -2];
    LIGHT[2].x = X(c); LIGHT[2].y = Y(c); LIGHT[2].r = bite ? 12 * z : hole ? 16 * z : 0;
    RIM.lights = LIGHT; bake(spr, RIM);
  }
  // 立绘：剁肉刀举过头、张嘴龇出两颗黄门牙的那一刻（歪戴的王冠、红眼、骨杖、脚下的小鼠），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { const mv = MV; MV = 'ratTide'; poseAt(ATTACK, 0.2, 0); P.mouth = 2; P.glow = 2; P.rim = 2; RATS.length = 0; rat(36, 0, 1, 2); rat(-60, 0, 1, 1); rat(50, -1, -1, 5); drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(22, -55); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'plagueBite'; poseAt(IDLE, 0.4, 0); P.eyes = 2; P.glow = 2; P.rim = 1; drawHero(PSPR, 2); bakeHero(PSPR, 2); MV = mv; headXf(); const c = B.at(23, -54); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 17 * 2]; return PSPR; }   // 头像：待机侧脸、红眼亮着

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let crackT = 9, lastF = -1;
  function strikeFx() {
    const b = L.blade, x = sx(b[0]), y = sy(b[1]);
    fx.slash(sx(L.shN[0]), sy(L.shN[1]), 22, -0.5, 2.3, 'steel', 0.2, 3, 2);
    burst(x, y, 14, 40, 120, 0.2, 0.5, FXI.poison, 20); burst(x, HY - 2, 8, 20, 70, 0.3, 0.6, FXI.dust, 8);
    fx.cross(x, y, 6, 'poison', 0.16); hitDummy(1, 1); shake(0.15, 2);
  }
  function tideFx() {
    const x = sx(26), y = HY;
    ring(x, y - 2, 1, FXI.poison); fx.circle(x, y, 20, 5, 'poison', 0.6, 1); fx.crack(x, y, 16, 1, 'poison', 1.0); fx.crack(x, y, 12, -1, 'poison', 1.0);
    fx.wave(x + 4, y, 1, 54, 5, 'poison', 0.55, 2);
    burst(x, y - 2, 22, 40, 130, 0.3, 0.7, FXI.earth, 30); burst(x, y - 2, 16, 30, 100, 0.3, 0.6, FXI.poison, 24);
    shake(0.35, 3); flash(0.08); crackT = 0;
  }
  function biteFx() {
    const m = L.mouth, x = sx(m[0] + 3), y = sy(m[1]);
    fx.cross(x, y, 8, 'poison', 0.2); fx.cloud(x + 6, y + 2, 10, 'poison', 0.8, 2);
    burst(x, y, 20, 50, 140, 0.2, 0.5, FXI.poison, 20); burst(x, y, 10, 30, 90, 0.3, 0.6, FXI.blood, 10);
    for (let i = 0; i < 8; i++) spawnX(K_PHYS, x, y, 20 + Math.random() * 60, -40 - Math.random() * 40, 0.7, FXI.poison, { g: 260, floor: HY });
    hitDummy(1, 1); shake(0.35, 3); flash(0.06);
  }
  function roarFx() {
    const h = L.head, x = sx(h[0]), y = sy(h[1]);
    ring(x, y, 1, FXI.poison); ring(sx(0), HY - 2, 1, FXI.earth); burst(sx(0), HY - 2, 30, 40, 150, 0.3, 0.8, FXI.earth, 40); burst(x, y, 16, 40, 120, 0.3, 0.6, FXI.poison, 20);
    flash(0.12); shake(0.4, 3);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'ratTide') { tideFx(); sfx('impact', { pal: 'poison', w: 0.9 }); sfx('boss', { k: 'slam', w: 0.6 }); sfx('boss', { k: 'rkSwarm', w: 1 }); }
      else if (MV === 'plagueBite') { biteFx(); sfx('boss', { k: 'rkBite', w: 1 }); sfx('hit', { mat: 'flesh', w: 0.9 }); sfx('impact', { pal: 'poison', w: 0.7 }); }
      else { roarFx(); sfx('boss', { k: 'rkRoar', w: 1 }); sfx('boss', { k: 'growl', w: 0.7 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === CHARGE) { lastF = -1; sfx('boss', { k: MV === 'ratTide' ? 'rkShriek' : MV === 'plagueBite' ? 'rkHiss' : 'growl', w: 0.85 }); }
  }
  function onTime(s, t) {
    if (s === IDLE && t === 1.45) sfx('boss', { k: 'rkSqueak', w: 0.25 });
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'rkHiss', w: 0.4 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'smash', w: 0.9 }); sfx('hit', { mat: 'metal', w: 0.8 }); sfx('boss', { k: 'rkSqueak', w: 0.6 }); }
    if (s === CHARGE && MV === 'ratTide' && (t === 0.2 || t === 0.4)) { const x = sx(26); burst(x, HY - 1, 8, 20, 70, 0.2, 0.5, FXI.earth, 20); fx.crack(x, HY, 8, t === 0.2 ? 1 : -1, 'poison', 0.5); sfx('boss', { k: 'rkSqueak', w: 0.5 }); }
    if (s === CHARGE && MV === 'plagueBite' && t === 0.6) sfx('boss', { k: 'growl', w: 0.7 });
    if (s === CHARGE && MV === 'roar' && t === 0.2) sfx('boss', { k: 'rkHiss', w: 0.7 });
    if (s === CAST && MV === 'ratTide' && t === 0.25) { burst(sx(64), HY - 1, 8, 20, 60, 0.2, 0.4, FXI.dust, 10); sfx('step', { w: 0.6 }); sfx('boss', { k: 'rkSqueak', w: 0.5 }); }
    if (s === CAST && MV === 'roar' && t === 0.25) { ring(sx(L.head[0]), sy(L.head[1]), 1, FXI.poison); sfx('boss', { k: 'rkSwarm', w: 0.8 }); }
    if (s === RECOVER && MV === 'roar' && (t === 0.08 || t === 0.25 || t === 0.42)) { const x = sx(L.gn[0] + 4); burst(x, HY - 1, 12, 30, 110, 0.3, 0.6, FXI.earth, 50); fx.crack(x, HY, 8, 1, 'earth', 0.6); sfx('boss', { k: 'thud', w: 0.5 }); sfx('step', { w: 0.8 }); shake(0.1, 1); }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'rkSqueak', w: 0.7 });
    if (s === DEATH && t === INCOMING) sfx('boss', { k: 'rkDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.55) { sfx('hit', { mat: 'metal', w: 0.5 }); burst(sx(30), HY - 2, 8, 20, 60, 0.3, 0.5, FXI.dust, 8); }
    if (s === DEATH && t === INCOMING + 0.95) { for (let i = 0; i < 24; i++) spawn(K_DUST, sx(-10 + Math.random() * 50), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.2, 2); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.3) { sfx('hit', { mat: 'metal', w: 0.35 }); sfx('boss', { k: 'rkSwarm', w: 0.5 }); }
    if (s === DEATH && t === INCOMING + 1.95) { for (let i = 0; i < 28; i++) spawn(K_RISE, sx(-14 + Math.random() * 56), HY - 3 - Math.random() * 18, 0, -12 - Math.random() * 18, 0.8 + Math.random() * 0.8, FXI.poison); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[1.45], [], [0.08, T_STRIKE], [0.2, 0.4, 0.6], [0.25], [0.08, 0.25, 0.42], [INCOMING], [INCOMING, INCOMING + 0.55, INCOMING + 0.95, INCOMING + 1.3, INCOMING + 1.95], []];
  function stepFX(dt, state, stT) {
    crackT += dt;
    if (state === MOVE) { const f = Math.floor(stT * 12) % 8; if (f !== lastF) { lastF = f; const k = f === 0 ? 'n' : f === 4 ? 'f' : null;
      if (k) { const x = sx(L[k].toe[0] - 2); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20 - (P.flip ? -10 : 10), -4 - Math.random() * 6, 0.35 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 0.6 }); if (Math.random() < 0.3) sfx('boss', { k: 'rkSqueak', w: 0.2 }); } } }
    if (state === CHARGE && Math.random() < 0.45) {   // 蓄力：毒绿的光点汇向杖头 / 嘴 / 头
      const a = Math.random() * 6.2832, r = 14 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy);
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, FXI.poison, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'plagueBite' && Math.random() < 0.3) spawnX(K_PHYS, sx(L.mouth[0] - 1 + Math.random() * 3), sy(L.mouth[1] + 1), (Math.random() - 0.5) * 6, 0, 0.8, FXI.poison, { g: 160, floor: HY });   // 口水
    if (state === IDLE && Math.random() < 0.06) spawn(K_RISE, sx(-12 + Math.random() * 8), sy(-40 + Math.random() * 12), 0, -6 - Math.random() * 6, 0.8, FXI.poison);   // 脓包冒的腐气
    if (state === IDLE && Math.random() < 0.1) spawn(K_EMBER, sx(L.head[0] + (Math.random() - 0.5) * 22), sy(L.head[1] - 6 + (Math.random() - 0.5) * 12), (Math.random() - 0.5) * 30, (Math.random() - 0.5) * 20, 0.25, FXI.shadow);   // 绕着头飞的苍蝇
    if (crackT < 1.0 && Math.random() < 0.4) spawn(K_EMBER, sx(26) + (Math.random() - 0.5) * 30, HY - 1, 0, -10 - Math.random() * 10, 0.35, FXI.poison);   // 鼠洞还在冒绿气
  }
  function fxReset() { crackT = 9; lastF = -1; }
  function fxBack(f12) {
    if (P.hole && P.glow >= 2) { const x = sx(26); for (let dx = -14; dx <= 14; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, POI[Math.abs(dx) < 7 ? 1 : 3]); }   // 地面映光
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'ratTide'; return MVDUR[MV]; }

  const VOICES = {
    rkSqueak: (s, t, w, p) => { const f = s.rnd(2300, 3000); s.tone(t, 'square', f, 0.05, 0.025 + 0.02 * w, { to: f * 1.3, lp: 5200, pan: p }); s.tone(t + 0.07, 'square', f * 1.1, 0.07, 0.02 + 0.02 * w, { to: f * 0.8, lp: 5200, pan: p }); },
    rkShriek: (s, t, w, p) => { s.tone(t, 'sawtooth', 1300, 0.6, 0.04 + 0.03 * w, { to: 2300, vib: [19, 150, 0.05], lp: 4200, pan: p, rev: 0.4 }); s.tone(t + 0.02, 'square', 650, 0.5, 0.025 * w, { to: 1050, vib: [23, 70, 0.05], lp: 2600, pan: p }); s.nz(t, 0.5, 'bandpass', 3200, 2, 0.03 * w, { pan: p }); },
    rkSwarm: (s, t, w, p) => { for (let i = 0; i < 8; i++) { const tt = t + i * 0.09 + s.rnd(0, 0.05), f = s.rnd(2100, 3300); s.tone(tt, 'square', f, 0.05, 0.015 + 0.012 * w, { to: f * s.rnd(0.8, 1.3), lp: 5000, pan: p }); }
      s.crackle(t, 0.8, 2600, 0.04 * w, { pan: p }); s.nz(t, 0.7, 'lowpass', 500, 0.7, 0.05 * w, { pan: p }); },
    rkBite: (s, t, w, p) => { s.thud(t, 170, 60, 0.1, 0.2 + 0.1 * w, { pan: p }); s.nz(t, 0.04, 'highpass', 2600, 0.8, 0.12 * w, { pan: p }); s.nz(t + 0.03, 0.18, 'bandpass', 700, 3, 0.09 * w, { to: 280, pan: p }); },
    rkHiss: (s, t, w, p) => { s.nz(t, 0.55, 'highpass', 3800, 0.7, 0.04 + 0.03 * w, { a: 0.08, pan: p }); s.tone(t, 'sawtooth', 190, 0.5, 0.03 * w, { to: 150, vib: [13, 30, 0.05], lp: 900, pan: p }); },
    rkRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 950, 1.1, 0.05 + 0.03 * w, { to: 1700, vib: [15, 220, 0.08], lp: 3800, pan: p, rev: 0.5 }); s.tone(t, 'sawtooth', 115, 1.0, 0.06 * w, { to: 72, vib: [9, 40, 0.1], lp: 600, pan: p });
      s.rumble(t, 1.0, 0.12 * w, { f: 160, pan: p }); s.nz(t, 0.9, 'bandpass', 2800, 1.5, 0.03 * w, { pan: p }); },
    rkDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 2100, 1.0, 0.045 + 0.02 * w, { to: 480, vib: [11, 130, 0.1], lp: 4000, pan: p, rev: 0.5 });
      for (let i = 0; i < 5; i++) { const tt = t + 1.0 + i * 0.1 + s.rnd(0, 0.04), f = s.rnd(2400, 3200); s.tone(tt, 'square', f, 0.04, 0.012 * w, { to: f * 1.2, lp: 5000, pan: p }); } },
  };

  return {
    name: '鼠王', HX, R_EL: FXI.poison, DUR, hero, P, GLOW_MATS: [EYE, EYE2, TOX1, TOX2], HIT_POINT: [4, -34], EVENTS, MAX_H: 84, OWN_MAX: 50, SHEET_K: 3, VOICES,
    SFX: { body: 'beast', how: 'topple', pal: 'poison', style: 'poison', w: 1 },
    MOVES: ['ratTide', 'plagueBite', 'roar'], MOVE_NAMES: { ratTide: '鼠潮', plagueBite: '瘟疫咬', roar: '钻洞（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.8, 1.4, 1.5, 1.6]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.17, 0.33, 0.5], 'ratTide'], [CAST, [0, 1 / 12, 3 / 12, 5 / 12], 'ratTide'], [RECOVER, [0.17, 0.42], 'ratTide'],
      [CHARGE, [0, 0.25, 0.5, 0.83, 1.08], 'plagueBite'], [CAST, [0, 2 / 12], 'plagueBite'], [RECOVER, [0.17, 0.42], 'plagueBite'],
      [CHARGE, [0, 0.25, 0.42], 'roar'], [CAST, [0, 2 / 12, 5 / 12], 'roar'], [RECOVER, [0.08, 0.25, 0.58], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.7, 0.9, 1.1, 1.3, 1.6, 2.1, 2.4]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
