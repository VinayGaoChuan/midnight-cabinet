// 哨眼（小首领，第七章「星舰残骸」的舰桥）：照 pcd/run/boss-standard.md 的小首领标准做，结构抄 B_centaur.js。
// 依据：附录 G2「会飞的暗色邪眼」；悬空（近战够不着，俯冲后落地的 3 秒才打得到）；锁定 lock（射线盯住战斗力最高的 3 秒，越照越疼，接着俯冲撞它）；
//       半血 警报（召 2 个小哨兵，也会飞）。
// 设定卡 ——
//   剪影：一颗悬在半空的暗紫装甲眼球（身体约 46 格高，连眼柄 68 格）：紫黑色的球形外壳上有科幻的面板缝和铆钉，缝里透青光；
//         正面一只占了半个球的大眼：淡紫的眼白带血丝，紫 → 青的同心虹膜，中间是相机光圈一样的六片叶瞳孔；上下两片装甲眼睑像快门一样开合；
//         眼下是一张横贯下半球的大嘴，上排钢白獠牙、下颌是一整块会掉下来的甲板；头顶四根分节的眼柄（远侧两根压暗），末端各一只小眼；
//         一根短天线顶着信标灯（平时青色慢闪，警报时红色急闪）；背后两片后掠的尾鳍；底下一圈推进口喷着青白的火，地上一圈紫光。
//   识别：大眼（紫 / 青虹膜 + 光圈瞳孔）+ 满口獠牙 + 眼柄。和防卫机甲（人形、红色独眼）、灯眼（灯塔）完全不同：这是有机的科技眼球，紫色。
//   主色：紫黑外壳（暗、不饱和），光：虹膜的紫 / 青、面板缝的青、推进口的青白、警报的红。
//   步态：悬浮起伏（两拍上下浮动，前倾滑行，眼柄向后飘，推进火拉长）。
//   普攻：后仰张嘴 → 前冲一口咬合（咬合那一帧 = 伤害帧）。
//   锁定：蓄力时眼睑收成一条缝、虹膜缩小变亮、光圈叶片旋转、四只小眼全部转向前方、紫光粒子旋进瞳孔；出手时眼睑全开、虹膜发白，一道青紫射线射出；
//         收招时仍然盯着（游戏里射线要照 3 秒）。
//   警报（半血怒吼）：蓄力时升高、缩紧、信标开始红闪；出手时仰起、张大嘴、眼柄全部张开、虹膜和面板缝红紫交替急闪，两圈红色警报环 + 汽笛。
//   受击：闪白 → 眯眼后仰、眼柄乱甩、推进火一抖。
//   死亡：虹膜乱闪、推进火熄灭几下 → 掉到地上弹一下、往前滚半圈 → 眼睑合上、眼柄垂下、虹膜暗掉 → 冒火花、消散。
PCD.define('B_EvilEyeDark', (E) => {
  const { defDeep, defMat, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_DUST, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：外壳压暗，光才亮得出来 ─────
  const R_SHELL = ['#07040c', '#100a1a', '#191026', '#231634', '#2e1c42', '#3a2352', '#472b62', '#553472', '#643f84', '#764c96', '#8a5caa'];   // 紫黑装甲壳
  const R_SCL = ['#0e0a16', '#1e1830', '#302846', '#433a5e', '#584f76', '#6e668e', '#857ea6', '#9e98bc', '#b8b4d0', '#d2d0e4', '#eceaf6'];     // 淡紫眼白
  const SHELL = defDeep(R_SHELL, { depth: 11, amb: 0.16, dark: 1 }), SHELLD = defDeep(R_SHELL, { depth: 4, dark: 3, amb: 0.1 });
  const LIDM = defDeep(R_SHELL, { depth: 4, amb: 0.2 }), JAWM = defDeep(R_SHELL, { depth: 5, dark: 1, amb: 0.14 });
  const SCL = defDeep(R_SCL, { depth: 7, amb: 0.3, dark: 1 }), STEEL = defDeep('bladesteel', { depth: 3, dark: 1, amb: 0.2 }), STEELD = defDeep('bladesteel', { depth: 2, dark: 3, amb: 0.12 });
  const TEETH = defDeep('bladesteel', { depth: 1, amb: 0.55 });
  // 光（亮 → 暗 5 级）：眼 / 射线的青紫、警报红
  const EYEFX = fxRamp('sentryEye', ['#ffffff', '#c8f6ff', '#7ad8ff', '#9a6aff', '#3a1a7a']), ER = FXR[EYEFX];
  const VIOFX = fxRamp('sentryVio', ['#ffffff', '#e0c8ff', '#b07aff', '#6a3ad0', '#2a1260']), VR = FXR[VIOFX];
  const ALFX = fxRamp('sentryAlarm', ['#ffffff', '#ffc8d0', '#ff4a6a', '#b01a3a', '#3a0612']), AR = FXR[ALFX];
  const IRV = defMat([VR[4], VR[3], VR[2], VR[1]], 1, 1), IRC = defMat([ER[4], ER[3], ER[2], ER[1]], 1, 1), IRW = defMat([ER[3], ER[1], ER[0], ER[0]], 1, 1);
  const ALR = defMat([AR[4], AR[3], AR[2], AR[1]], 1, 1), SEAMD = defMat(E.ramp(['#1a1040', '#2a3a70', '#3a78b0', '#6ac0e8']), 1, 1);
  const PUP = defMat(E.ramp(['#05030a', '#0a0614', '#120a22', '#2a1a4a']), 1, 1), MAW = defMat(E.ramp(['#05030a', '#0e0618', '#1a0a2a', '#2e1448']), 1, 1);
  const hero = new Sprite(160, 124, 76, 114);
  const DUR = [3.0, 4 / 3, 0.75, 1.2, 0.5, 0.6, 0.8, 2.9, 1.0];
  const MVDUR = { lock: { 3: 0.6, 4: 0.5, 5: 0.8 }, roar: { 3: 0.6, 4: 0.6, 5: 0.7 } };
  const MVI = { lock: 0, roar: 1 };
  let MV = 'lock';
  const HX = 60;
  const LIGHT = [{ x: 0, y: 0, r: 0, ramp: [ER[1], ER[2], ER[3]], k: 0.7 }, { x: 0, y: 0, r: 0, ramp: [ER[1], ER[2], ER[3]], k: 0.6 }];
  const RIM_R = [0, 10, 18, 26], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: ER, flash: 0, dq: 0, lights: null, skip: new Uint8Array(64) };
  RIM.skip[IRV] = RIM.skip[IRC] = RIM.skip[IRW] = RIM.skip[ALR] = RIM.skip[SEAMD] = RIM.skip[PUP] = RIM.skip[MAW] = 1;

  // ───── 骨架（本地坐标，地面 y = 0，面朝右）─────
  const C = [0, -37], RX = 23, RY = 22;          // 外壳球
  const EC = [9.5, -39], ERX = 10.5, ERY = 11.5;  // 眼（眼白）
  const NOZ = [-2, -14];                           // 推进口
  const HINGE = [-10, -17.3], FRONT = [21.5, -30];  // 嘴：下颌的铰点和前端
  // 眼柄：[根部角度（0 朝上、顺时针为正）, 长度, 远侧]
  const STALK = [[-0.95, 10.5, 1], [-0.38, 10.5, 1], [0.12, 10.5, 0], [0.62, 9.5, 0]];
  const ANT = -0.14;                               // 天线

  const P = {};
  const FIELDS = ['st', 'pitch', 'bx', 'by', 'lx', 'ly', 'lid', 'lid2', 'iris', 'ap', 'jaw', 'glow', 'rim', 'flash', 'dq', 'sw', 'aim', 'spread', 'droop', 'thr', 'alarm', 'bcn', 'crk', 'scan', 'dead', 'fin'];
  function base() {
    P.st = 0; P.pitch = 0; P.bx = 0; P.by = 0; P.lx = 1; P.ly = 0; P.lid = 0; P.lid2 = 0; P.iris = 1; P.ap = 0; P.jaw = 0; P.glow = 0; P.rim = 0; P.flash = 0; P.dq = 0;
    P.sw = 0; P.aim = 0; P.spread = 1; P.droop = 0; P.thr = 1; P.alarm = 0; P.bcn = 0; P.crk = 0; P.scan = -1; P.dead = 0; P.fin = 0; P.mx = 0; P.flip = 0;
  }
  const SWAY = [0, 1, 2, 1, 0, -1, -2, -1];
  const HOV = [0, -1, -2, -2, -1, 0, 1, 1];

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12; lastF12 = f12;
    const idle = (tt) => {
      const b = Math.floor(TT * 2) & 1; P.by = -b - (Math.floor(TT * 0.8) & 1); P.sw = SWAY[Math.floor(tt / 0.25) % 8]; P.fin = b;
      P.thr = 1 + ((f12 % 3) === 0 ? 0.3 : 0); P.bcn = (Math.floor(tt / 0.5) & 1) ? 1 : 0; P.ap = Math.floor(tt * 2) % 6;
      const lp = tt % DUR[IDLE];
      if (lp >= 0.6 && lp < 1.6) { const k = Math.floor((lp - 0.6) * 12); P.lx = [1, 0, -1, -2, -3, -3, -3, -2, -1, 0, 1, 2][k] ?? 2; P.scan = k; P.iris = 0.9; P.glow = 1; }   // 待机个性：眼珠左右扫描一遍，一道青色扫描线扫过
      else if (lp >= 1.6 && lp < 2.2) { P.lx = 3; P.ly = -1; }
      if (lp >= 2.2 && lp < 2.55) { const k = Math.floor((lp - 2.2) * 12); P.lid = [0.5, 1, 1, 0.5, 0][k] ?? 0; }   // 快门一样眨一下
      P.crk = (f12 % 9) === 0 ? 1 : 0;
    };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) {
      const f = Math.floor(tq * 12) % 8, w = walkDemo(tq, 26, -1); P.mx = w.mx; P.flip = w.flip;
      P.by = HOV[f] - 1; P.pitch = 0.14 + (f < 4 ? 0.02 : 0); P.aim = -0.45; P.sw = SWAY[f]; P.thr = 2 + (f & 1) * 0.4; P.lx = 3; P.fin = f & 1; P.bcn = f < 4 ? 1 : 0; P.crk = 1;
    } else if (st === ATTACK) {
      if (tq < 0.17) { const q = ease.out(tq / 0.17); P.bx = -Math.round(3 * q); P.by = -Math.round(2 * q); P.pitch = -0.18 * q; P.jaw = 0.6 * q; P.glow = 1; P.lid = 0.2 * q; P.lx = 2; P.aim = 0.3 * q; P.sw = -1; }
      else if (tq < 0.25) { P.bx = -4; P.by = -2; P.pitch = -0.2; P.jaw = 1; P.glow = 2; P.rim = 1; P.lid = 0.25; P.lx = 3; P.aim = 0.5; P.sw = -2; P.thr = 2; }
      else if (tq < 0.42) { const q = ease.out((tq - 0.25) / 0.17); P.bx = 7; P.by = 1; P.pitch = 0.2; P.jaw = q < 0.5 ? 0.15 : 0; P.glow = 3; P.rim = 2; P.iris = 1.25; P.lx = 3; P.ly = 1; P.aim = 0.7; P.sw = 2; P.thr = 2.4; }
      else { const q = ease.inOut(clamp01((tq - 0.42) / 0.3)); P.bx = Math.round(7 * (1 - q)); P.by = Math.round(1 - q); P.pitch = 0.2 * (1 - q); P.glow = q < 0.5 ? 1 : 0; P.aim = 0.7 * (1 - q); P.lx = 3 - Math.round(2 * q); }
    } else if (st === CHARGE || st === CAST || st === RECOVER) skillPose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq);
      else if (h < 0.2) { P.bx = -3; P.by = -1; P.pitch = -0.22; P.lid = 0.65; P.lid2 = 0.3; P.iris = 0.7; P.lx = -2; P.jaw = 0.35; P.flash = h < 1 / 12 ? 1 : 0; P.sw = -2; P.spread = 1.35; P.thr = 0.5; }
      else if (h < 0.35) { P.bx = -1; P.pitch = -0.1; P.lid = 0.35; P.iris = 0.85; P.lx = 0; P.jaw = 0.1; P.sw = 2; P.spread = 1.15; }
      else { const q = ease.inOut(clamp01((h - 0.35) / 0.15)); P.pitch = -0.1 * (1 - q); P.lid = 0.35 * (1 - q); P.lx = Math.round(q); }
    } else if (st === DEATH) deathPose(tq - INCOMING, f12);
    geo(); P.gx = P.fx; P.gy = P.fy;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 64); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 7), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + MVI[MV] * 7;
  }
  function skillPose(st, tq, f12) {
    if (MV === 'lock') {
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.35)), j = f12 & 1;
        P.by = -Math.round(3 * q); P.bx = -Math.round(q) + (tq > 0.35 ? j : 0); P.pitch = -0.06 * q; P.lid = 0.6 * q + (tq > 0.35 ? j * 0.05 : 0); P.lid2 = 0.35 * q;
        P.iris = 1 - 0.4 * q; P.ap = f12 % 6; P.lx = 3; P.ly = 1; P.aim = 1.0 * q; P.spread = 1 - 0.3 * q; P.sw = 0;
        P.glow = tq < 0.2 ? 1 : tq < 0.45 ? 2 : 2 + j; P.rim = tq < 0.3 ? 1 : 2; P.thr = 2; P.crk = 1;
      } else if (st === CAST) {
        const q = clamp01(tq / 0.1); P.bx = -2; P.by = -3; P.pitch = -0.04; P.lid = -0.12; P.lid2 = -0.1; P.iris = 1.35; P.ap = 0; P.lx = 3; P.ly = 1; P.aim = 1.1; P.spread = 0.7;
        P.glow = 3; P.rim = q < 1 ? 3 : 2; P.thr = 2.4; P.crk = 1; P.jaw = 0.2;
      } else {
        const q = ease.inOut(clamp01(tq / 0.7)); P.bx = -Math.round(2 * (1 - q)); P.by = -Math.round(3 * (1 - q)); P.lid = 0.3 * (1 - q); P.lid2 = 0.15 * (1 - q); P.iris = 1.2 - 0.2 * q;
        P.lx = 3; P.ly = 1 - Math.round(q); P.aim = 1.1 * (1 - q); P.spread = 0.7 + 0.3 * q; P.glow = q < 0.5 ? 2 : 1; P.rim = q < 0.3 ? 1 : 0; P.thr = 2 - q; P.ap = f12 % 6;
      }
    } else {   // roar：警报（半血）
      if (st === CHARGE) {
        const q = ease.out(clamp01(tq / 0.4)), j = f12 & 1;
        P.by = -Math.round(5 * q); P.bx = tq > 0.3 ? (j ? 1 : -1) : 0; P.pitch = 0.08 * q; P.lid = 0.4 * q; P.lid2 = 0.2 * q; P.iris = 0.8; P.spread = 1 - 0.45 * q; P.droop = 0; P.sw = j ? 1 : -1;
        P.alarm = tq > 0.2 ? 1 + j : 0; P.bcn = j ? 2 : 0; P.glow = 1 + (tq > 0.3 ? 1 : 0); P.rim = 1; P.thr = 2; P.crk = 1;
      } else if (st === CAST) {
        const j = f12 & 1; P.by = -5; P.pitch = -0.3; P.jaw = 1; P.lid = -0.14; P.lid2 = -0.12; P.iris = 1.3; P.lx = 2; P.ly = -2; P.spread = 1.6; P.sw = j ? 2 : -2;
        P.alarm = 2; P.bcn = j ? 2 : 0; P.glow = 3; P.rim = 3; P.thr = 2.4; P.crk = 1;
      } else {
        const q = ease.inOut(clamp01(tq / 0.6)), j = f12 & 1; P.by = -Math.round(5 * (1 - q)); P.pitch = -0.3 * (1 - q); P.jaw = q < 0.4 ? 1 - q * 1.5 : Math.max(0, 0.4 - q * 0.5); P.iris = 1.3 - 0.3 * q;
        P.ly = -Math.round(2 * (1 - q)); P.spread = 1.6 - 0.6 * q; P.alarm = q < 0.6 ? 1 + j : 0; P.bcn = q < 0.6 && j ? 2 : 0; P.glow = q < 0.5 ? 2 : 1; P.rim = q < 0.3 ? 2 : 0; P.thr = 2 - q;
      }
    }
  }
  function deathPose(d, f12) {
    if (d < 0) return;
    const j = f12 & 1;
    if (d < 0.3) { P.bx = -3; P.by = -1; P.pitch = -0.24; P.lid = 0.6; P.lid2 = 0.3; P.iris = 0.7; P.lx = -2; P.jaw = 0.5; P.flash = d < 1 / 12 ? 1 : 0; P.sw = -2; P.spread = 1.4; P.thr = 0.5; return; }
    if (d < 0.9) {   // 失控：虹膜乱闪、推进火一灭一灭、晃着往下掉
      const k = Math.floor((d - 0.3) * 12); P.bx = [-2, -1, -3, -2, 0, -1, -2][k % 7]; P.by = Math.round((d - 0.3) * 6); P.pitch = [-0.12, 0.06, -0.08, 0.1, -0.04, 0.12][k % 6];
      P.lid = 0.3 + (k % 3) * 0.1; P.iris = [0.6, 1.3, 0.5, 1.1, 0.4][k % 5]; P.lx = [-3, 2, 0, 3, -1][k % 5]; P.ly = j ? 1 : -1; P.jaw = 0.45; P.alarm = k % 3 === 0 ? 2 : 0; P.glow = j ? 2 : 0;
      P.thr = k % 3 === 1 ? 0 : 0.7; P.sw = j ? 2 : -2; P.spread = 1.2; P.droop = 0.3; P.crk = 1; return;
    }
    const q1 = ease.in(clamp01((d - 0.9) / 0.35)), bo = d >= 1.25 && d < 1.45 ? [3, 4, 2][Math.floor((d - 1.25) * 12)] || 0 : 0;
    const q3 = clamp01((d - 1.45) / 0.45);
    P.bx = -2 + Math.round(4 * q1); P.by = 4 + Math.round(11 * q1) - bo; P.pitch = 0.1 + 0.3 * q1 + (bo ? -0.05 : 0); P.thr = 0; P.jaw = 0.5 + 0.1 * q1; P.lx = 1; P.ly = 2;
    P.lid = 0.4 + 0.6 * q3; P.lid2 = 0.2 + 0.25 * q3; P.iris = 0.9; P.dead = q3 >= 0.6 ? 2 : q3 > 0 ? 1 : 0; P.droop = 0.4 + 0.6 * q1; P.spread = 1.2; P.sw = 0; P.glow = q3 > 0 ? 0 : 1;
    if (d > 1.9) { P.crk = (f12 % 4) === 0 ? 1 : 0; P.dq = Math.round(clamp01((d - 1.9) / 0.7) * 48) / 48; }
  }

  // ───── 几何（画和特效共用）─────
  const L = { stalk: [] };
  function bodyXf() { B.reset(); B.move(P.bx, P.by); B.rot(C[0], C[1], P.pitch); }
  function stalkGeo(i) {
    const s = STALK[i], far = s[2], a0 = s[0], len = s[1];
    const root = [C[0] + Math.sin(a0) * RX * 0.9, C[1] - Math.cos(a0) * RY * 0.9];
    let a = a0 * P.spread + P.aim * (0.7 + i * 0.12) + P.sw * 0.07 * (i & 1 ? -1 : 1);
    if (P.droop) a = a + (a0 < 0 ? -1 : 1) * 1.9 * P.droop;
    const dir = [Math.sin(a), -Math.cos(a)], curl = (i & 1 ? 1 : -1) * (2 + P.sw * 0.6);
    const tip = [root[0] + dir[0] * len, root[1] + dir[1] * len], mid = [root[0] + dir[0] * len * 0.5 - dir[1] * curl, root[1] + dir[1] * len * 0.5 + dir[0] * curl];
    return { root, mid, tip, far, dir };
  }
  function geo() {
    bodyXf();
    L.eye = B.at(EC[0] + P.lx * 0.8, EC[1] + P.ly * 0.8); L.noz = B.at(NOZ[0], NOZ[1] + 2); L.c = B.at(C[0], C[1]);
    L.beacon = B.at(C[0] + Math.sin(ANT) * (RY + 8), C[1] - Math.cos(ANT) * (RY + 8)); L.mouth = B.at(14, -24);
    for (let i = 0; i < 4; i++) { const g = stalkGeo(i); L.stalk[i] = { root: B.at(g.root[0], g.root[1]), tip: B.at(g.tip[0], g.tip[1]), g }; }
    B.reset(); P.fx = L.eye[0]; P.fy = L.eye[1];
  }
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t);
  // 椭圆弧上的点（面板缝、眼眶）
  const arcPts = (cx, cy, rx, ry, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]); } return o; };
  const arcPx = (cx, cy, rx, ry, a0, a1, m, t, step) => { const n = Math.max(2, Math.ceil(Math.abs(a1 - a0) * Math.max(rx, ry))); for (let i = 0; i <= n; i += step || 1) { const a = a0 + (a1 - a0) * i / n; B.px(E, cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, m, t); } };

  function drawStalk(i) {
    const g = L.stalk[i].g, far = g.far, m = far ? SHELLD : SHELL;
    part(); bodyXf();
    const pts = B.bez(g.root, g.mid, g.tip, 8);
    B.strand(E, pts, far ? 2 : 2.4, far ? 1.2 : 1.5, m);
    for (let k = 1; k < 8; k += 2) B.px(E, pts[k][0], pts[k][1], m, far ? 3 : 8);            // 分节的高光
    for (let k = 2; k < 8; k += 2) B.px(E, pts[k][0] - g.dir[1] * 0.8, pts[k][1] + g.dir[0] * 0.8, m, 2);
    part(); B.ell(E, g.root[0], g.root[1], 2.4, 1.6, Math.atan2(g.dir[1], g.dir[0]) + 1.57, far ? STEELD : STEEL);   // 根部的钢环
    part(); const tp = g.tip; B.ell(E, tp[0], tp[1], far ? 2.9 : 3.4, far ? 2.7 : 3.2, 0, far ? SHELLD : SHELL);       // 小眼的壳
    const lk = P.aim > 0.3 ? 1 : P.dead ? 0 : (i & 1 ? 1 : 0.5), ly = P.dead ? 1 : P.aim > 0.3 ? 0.5 : 0;
    B.ell(E, tp[0] + 0.6 * lk, tp[1] + 0.3 * ly, far ? 1.7 : 2.2, far ? 1.6 : 2.1, 0, SCL, far ? 3 : 5);
    if (P.dead >= 2) B.ln(E, tp[0] - 1.5, tp[1], tp[0] + 2, tp[1], far ? SHELLD : SHELL, 2);
    else { const mm = P.alarm === 2 ? ALR : P.glow >= 2 || P.aim > 0.5 ? IRC : IRV; B.px(E, tp[0] + 1.1 * lk, tp[1] + 0.4 * ly, mm); if (!far && P.glow >= 3) B.px(E, tp[0] + 1.1 * lk, tp[1] - 0.6, IRW); }
    B.px(E, tp[0] - 1.2, tp[1] - 1.6, far ? SHELLD : SHELL, far ? 5 : 9);
  }
  function drawAntenna() {
    part(); bodyXf(); const r = [C[0] + Math.sin(ANT) * RY * 0.95, C[1] - Math.cos(ANT) * RY * 0.95], a = ANT - P.aim * 0.2 + (P.droop ? -1.2 * P.droop : 0) + P.sw * 0.03;
    const t = [r[0] + Math.sin(a) * 8, r[1] - Math.cos(a) * 8];
    B.cap(E, r[0], r[1], t[0], t[1], 0.9, 0.6, STEEL); B.px(E, (r[0] + t[0]) / 2, (r[1] + t[1]) / 2, STEEL, 8);
    part(); const bm = P.dead >= 1 ? STEELD : P.bcn === 2 || P.alarm === 2 ? ALR : P.bcn ? IRC : SEAMD; B.ell(E, t[0], t[1] - 0.5, 1.9, 1.7, 0, bm); if (P.bcn === 2 && !P.dead) B.px(E, t[0], t[1] - 1, IRW);
  }
  function drawFins() {
    part(); bodyXf(); const f = P.fin;
    B.poly(E, [[-17, -48], [-27, -55 - f], [-31, -53 - f], [-22, -40]], SHELLD); B.ln(E, -19, -47, -28, -53 - f, SHELLD, 7);
    part(); B.poly(E, [[-19, -30], [-30, -30 + f], [-32, -26 + f], [-20, -24]], SHELLD); B.ln(E, -21, -29, -30, -29 + f, SHELLD, 7);
    part(); B.poly(E, [[-20, -41], [-33, -42 - f], [-34, -38 - f], [-21, -34]], SHELL); B.ln(E, -22, -40, -32, -41 - f, SHELL, 8); B.ln(E, -22, -36, -33, -39 - f, SHELL, 2);
    if (P.glow >= 1 || P.crk) B.px(E, -31, -40 - f, P.alarm === 2 ? ALR : IRC);
  }
  function drawThruster(f12) {
    if (P.thr <= 0) return;
    part(); bodyXf(); const n = [NOZ[0], NOZ[1] + 1], L0 = Math.round(4 + P.thr * 3.5 + ((f12 % 3) === 1 ? 1 : 0)), w = 3.2 + (P.thr > 1.5 ? 0.6 : 0);
    B.poly(E, [[n[0] - w, n[1]], [n[0] + w, n[1]], [n[0] + 1, n[1] + L0], [n[0] - 1, n[1] + L0]], IRV);
    B.poly(E, [[n[0] - w + 1.2, n[1]], [n[0] + w - 1.2, n[1]], [n[0], n[1] + L0 - 2]], IRC);
    B.ln(E, n[0], n[1], n[0], n[1] + Math.max(1, L0 - 5), IRW);
    if ((f12 & 1) && P.thr >= 1) { B.px(E, n[0] - 2, n[1] + L0 - 1, IRC); B.px(E, n[0] + 1, n[1] + L0 + 1, IRV); }
  }
  function drawShell() {
    part(); bodyXf();
    B.ell(E, C[0], C[1], RX, RY, 0, SHELL);
    // 头顶的冠甲：一道前后走向的凸棱
    B.poly(E, [[-14, -55], [-6, -59.5], [6, -59.5], [14, -56], [12, -54], [-12, -53]], SHELL, 6); B.ln(E, -12, -56, 10, -58, SHELL, 8); B.ln(E, -12, -53, 12, -54, SHELL, 2);
    // 面板缝（经线、纬线）+ 铆钉
    arcPx(C[0] - 2, C[1], 13, RY - 0.5, -1.45, 1.45, SHELL, 2); arcPx(C[0] - 1, C[1], 13, RY - 0.5, -1.35, 1.35, SHELL, 7, 2);
    arcPx(C[0] + 4, C[1] + 1, RX - 1, 8, 2.35, 3.6, SHELL, 2); arcPx(C[0] + 4, C[1] + 2, RX - 1, 8, 2.4, 3.55, SHELL, 7, 2);
    arcPx(C[0], C[1] - 4, RX - 2, RY - 2, 3.5, 4.3, SHELL, 2);
    for (const [x, y] of [[-15, -48], [-16, -32], [-8, -54], [-19, -40], [-13, -25], [-3, -19], [2, -55]]) { B.px(E, x, y, SHELL, 9); B.px(E, x + 1, y + 1, SHELL, 2); }
    // 缝里透出来的青光（发亮时整段亮）
    const sm = P.alarm === 2 ? ALR : P.glow >= 2 ? IRC : SEAMD;
    for (const [a0, a1] of [[-1.2, -0.75], [0.35, 0.8]]) arcPx(C[0] - 2, C[1], 13, RY - 0.5, a0, a1, sm, 0);
    arcPx(C[0] + 4, C[1] + 1, RX - 1, 8, 2.75, 3.2, P.alarm ? ALR : sm, 0);
    if (P.crk) { B.px(E, -12, -51, IRW); B.px(E, -16, -30, IRC); }
    B.ell(E, C[0] - 4, C[1] + 17, 12, 3, 0, SHELL, 3);                                               // 下腹阴影
    // 推进口的钢圈
    part(); B.ell(E, NOZ[0], NOZ[1], 7, 2.6, 0, STEEL); B.ln(E, NOZ[0] - 6, NOZ[1] - 1, NOZ[0] + 5, NOZ[1] - 1, STEEL, 8);
    part(); B.ell(E, NOZ[0], NOZ[1] + 0.5, 4.5, 1.4, 0, P.thr > 0 ? IRC : STEELD); if (P.thr > 0) B.ln(E, NOZ[0] - 2, NOZ[1] + 0.5, NOZ[0] + 2, NOZ[1] + 0.5, IRW);
  }
  // 嘴：上唇线（前 → 铰点）
  const LIP = B.bez(FRONT, [9, -23], HINGE, 10);
  const JAWARC = arcPts(C[0], C[1], RX, RY, 2.02, 0.36, 14);
  function drawMouth() {
    part(); bodyXf();
    const a = P.jaw * 0.42, ca = Math.cos(a), sa = Math.sin(a), rot = (p) => { const dx = p[0] - HINGE[0], dy = p[1] - HINGE[1]; return [HINGE[0] + dx * ca - dy * sa, HINGE[1] + dx * sa + dy * ca]; };
    const low = LIP.map(rot);
    if (P.jaw > 0.02) {
      B.poly(E, LIP.concat(low.slice().reverse()), MAW);
      const d = low[3], u = LIP[3]; if (P.glow >= 1 || P.alarm) { const mm = P.alarm === 2 ? ALR : IRV; B.px(E, (d[0] + u[0]) / 2 - 1, (d[1] + u[1]) / 2, mm); B.px(E, (d[0] + u[0]) / 2 - 3, (d[1] + u[1]) / 2 + 0.5, mm); }
      part(); B.poly(E, low.concat(JAWARC.map(rot)), JAWM);                                      // 掉下来的下颌甲板
      for (let i = 1; i < 9; i += 2) { const p = low[i], q = low[i + 1]; B.poly(E, [[p[0], p[1] + 0.5], [q[0], q[1] + 0.5], [(p[0] + q[0]) / 2 + 0.3, (p[1] + q[1]) / 2 - 2.2]], TEETH); }   // 下排牙
      const r0 = rot([6, -18]), r1 = rot([16, -22]); B.ln(E, r0[0], r0[1], r1[0], r1[1], JAWM, 7); B.px(E, rot([10, -17])[0], rot([10, -17])[1], JAWM, 9);
    } else {   // 合着：一道黑缝 + 下排短牙顶上来
      const low1 = LIP.map((p) => [p[0], p[1] + 1.3]);
      B.poly(E, LIP.concat(low1.slice().reverse()), MAW);
      part(); B.poly(E, low1.concat(JAWARC), JAWM); B.ln(E, 4, -19, 16, -23, JAWM, 7); B.px(E, 10, -18.5, JAWM, 9);
      for (let i = 0; i < 9; i += 2) { const p = low1[i], q = low1[i + 1]; B.poly(E, [[p[0], p[1] + 0.4], [q[0], q[1] + 0.4], [(p[0] + q[0]) / 2 + 0.3, (p[1] + q[1]) / 2 - 1.6]], TEETH); }
    }
    // 上排獠牙 + 唇线
    part(); for (let i = 0; i < 10; i++) B.px(E, LIP[i][0], LIP[i][1], SHELL, 2);
    for (let i = 0; i < 9; i++) { const p = LIP[i], q = LIP[i + 1], len = i === 1 || i === 6 ? 4.2 : i & 1 ? 2.4 : 3; B.poly(E, [[p[0], p[1] - 0.4], [q[0], q[1] - 0.4], [(p[0] + q[0]) / 2 - 0.3, (p[1] + q[1]) / 2 + len]], TEETH); }
  }
  function drawEye(f12) {
    part(); bodyXf();
    B.ell(E, EC[0], EC[1], ERX + 2.4, ERY + 2.2, 0, STEEL);                                        // 眼眶的钢圈
    for (let i = 0; i < 8; i++) { const a = i / 8 * 6.283 + 0.3; B.px(E, EC[0] + Math.cos(a) * (ERX + 1.6), EC[1] + Math.sin(a) * (ERY + 1.5), STEEL, i < 4 ? 8 : 3); }   // 螺栓
    part(); B.ell(E, EC[0], EC[1], ERX, ERY, 0, SCL);
    for (const [x0, y0, x1, y1] of [[EC[0] - 9, EC[1] - 3, EC[0] - 5, EC[1] - 1], [EC[0] - 7, EC[1] + 6, EC[0] - 3, EC[1] + 3], [EC[0] + 8, EC[1] + 5, EC[0] + 5, EC[1] + 3]]) B.ln(E, x0, y0, x1, y1, SCL, 3);   // 血丝
    // 虹膜：紫 → 青 → 光圈瞳孔
    const ix = EC[0] + P.lx * 0.9, iy = EC[1] + P.ly * 0.9, r = 7.4 * P.iris, dead = P.dead;
    if (dead >= 2) { B.ell(E, ix, iy, r, r, 0, SCL, 2); B.ell(E, ix, iy, r * 0.45, r * 0.45, 0, PUP); }
    else {
      const outer = P.alarm === 2 ? ALR : dead ? SEAMD : IRV, inner = P.alarm ? (P.alarm === 2 ? IRV : ALR) : P.glow >= 3 ? IRW : IRC;
      B.ell(E, ix, iy, r, r * 1.02, 0, outer); B.ell(E, ix, iy, r * 0.74, r * 0.76, 0, inner);
      if (P.glow >= 3 && !P.alarm) B.ell(E, ix, iy, r * 0.58, r * 0.6, 0, IRC);
      for (let k = 0; k < 12; k++) { const a = k / 12 * 6.283; if (k & 1) B.px(E, ix + Math.cos(a) * r * 0.87, iy + Math.sin(a) * r * 0.87, inner); }   // 虹膜的放射纹
      const pr = Math.max(1.2, r * (P.glow >= 3 ? 0.3 : 0.42)); B.ell(E, ix, iy, pr, pr, 0, PUP);
      for (let k = 0; k < 6; k++) { const a = (k + P.ap * 0.5) / 6 * 6.283; B.ln(E, ix + Math.cos(a) * pr * 0.2, iy + Math.sin(a) * pr * 0.2, ix + Math.cos(a + 0.9) * pr, iy + Math.sin(a + 0.9) * pr, dead ? PUP : outer); }   // 六片光圈叶
      B.px(E, ix - r * 0.45, iy - r * 0.5, IRW); B.px(E, ix - r * 0.45 + 1, iy - r * 0.5, IRW); B.px(E, ix - r * 0.45, iy - r * 0.5 + 1, IRW);   // 高光
      if (P.scan >= 0) { const sx0 = EC[0] - ERX + P.scan * 1.9; B.ln(E, sx0, EC[1] - ERY + 2, sx0, EC[1] + ERY - 2, IRC); }   // 扫描线
    }
    // 上、下两片装甲眼睑（像快门）
    const lidY = EC[1] - ERY - 1 + clamp01(P.lid + 0.12) * (ERY * 2 + 2) * 0.62, lowY = EC[1] + ERY + 1 - clamp01(P.lid2 + 0.08) * (ERY * 2 + 2) * 0.38;
    const top = arcPts(EC[0], EC[1], ERX + 1, ERY + 1, Math.PI, Math.PI * 2, 16).map((p) => [p[0], Math.min(p[1], lidY)]);
    const bot = arcPts(EC[0], EC[1], ERX + 1, ERY + 1, 0, Math.PI, 16).map((p) => [p[0], Math.max(p[1], lowY)]);
    part(); B.poly(E, top, LIDM); const hw = ERX * Math.sqrt(Math.max(0, 1 - ((lidY - EC[1]) / (ERY + 1)) ** 2));
    B.ln(E, EC[0] - hw + 0.5, lidY, EC[0] + hw - 0.5, lidY, LIDM, 8); B.ln(E, EC[0] - hw + 1, lidY - 2, EC[0] + hw - 1, lidY - 2, LIDM, 3);
    if (P.lid > 0.4) B.ln(E, EC[0] - hw + 2, lidY - 4, EC[0] + hw - 2, lidY - 4, LIDM, 3);
    part(); B.poly(E, bot, LIDM); const hb = ERX * Math.sqrt(Math.max(0, 1 - ((lowY - EC[1]) / (ERY + 1)) ** 2));
    B.ln(E, EC[0] - hb + 0.5, lowY, EC[0] + hb - 0.5, lowY, LIDM, 7);
    // 眉甲：压在眼上的一道重甲
    part(); B.poly(E, [[-1, -52.5], [6, -55], [14, -54.5], [21, -50], [19, -48.5], [12, -52], [4, -52], [0, -50]], SHELL, 7); B.ln(E, 1, -52.5, 18, -50.5, SHELL, 9);
    if (P.glow >= 2 && (f12 & 1)) B.px(E, 20, -49.5, P.alarm === 2 ? ALR : IRC);
  }
  function drawHero(spr, z, f12) {
    z = z || 1; f12 = f12 || 0; begin(spr || hero, 0, 0); B.zoom(z); geo();
    drawStalk(0); drawStalk(1); drawFins(); drawThruster(f12);
    drawShell(); drawMouth(); drawEye(f12);
    drawAntenna(); drawStalk(2); drawStalk(3);
    B.reset(); B.zoom(1);
  }
  let lastF12 = 0;
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.rim; RIM.rx = P.fx * z + spr.ox; RIM.ry = P.fy * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    const lr = P.alarm === 2 ? [AR[1], AR[2], AR[3]] : [ER[1], ER[2], ER[3]]; LIGHT[0].ramp = lr;
    LIGHT[0].x = L.eye[0] * z + spr.ox; LIGHT[0].y = L.eye[1] * z + spr.oy; LIGHT[0].r = (P.dead >= 2 ? 0 : 7 + P.glow * 5) * z;
    LIGHT[1].x = L.noz[0] * z + spr.ox; LIGHT[1].y = (L.noz[1] + 2) * z + spr.oy; LIGHT[1].r = P.thr > 0 ? (6 + P.thr * 3) * z : 0;
    RIM.lights = LIGHT; bake(spr, RIM);
  }
  // 立绘：锁定出手的那一刻（眼睑全开、虹膜发白、小眼全部盯前方、嘴微张），两倍分辨率
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置和半径（地图节点的头像）
  function portrait() { const mv = MV; MV = 'lock'; poseAt(CAST, 2 / 12, 0); P.jaw = 0.45; P.glow = 3; P.rim = 2; drawHero(PSPR, 2, 1); bakeHero(PSPR, 2); MV = mv; bodyXf(); const c = B.at(3, -38); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 20 * 2]; return PSPR; }
  function headShot() { const mv = MV; MV = 'lock'; poseAt(IDLE, 0.3, 0); P.lx = 3; P.ly = 0; P.glow = 2; P.rim = 1; P.jaw = 0.25; drawHero(PSPR, 2, 1); bakeHero(PSPR, 2); MV = mv; bodyXf(); const c = B.at(3, -38); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 20 * 2]; return PSPR; }

  // ───── 特效 ─────
  const T_STRIKE = 3 / 12;
  const sx = (p) => scrX(p), sy = (p) => HY + p;
  let beamT = 9, lastHov = -1, alT = 0;
  function strikeFx() {
    const mx = sx(L.mouth[0] + 6), my = sy(L.mouth[1]);
    fx.slash(mx - 4, my, 10, 1.2, 2.2, EYEFX, 0.16, 2, 2); fx.slash(mx - 4, my, 10, -0.9, 0.2, EYEFX, 0.16, 2, 2);   // 上下两排牙的咬合弧
    burst(mx + 4, my, 16, 50, 130, 0.2, 0.45, EYEFX, 20); burst(mx + 4, my, 6, 30, 80, 0.2, 0.4, FXI.steel, 10);
    fx.cross(mx + 6, my, 6, EYEFX, 0.16); hitDummy(1, 1); shake(0.15, 2);
  }
  function lockFx() {
    const ex = sx(L.eye[0] + 3), ey = sy(L.eye[1]), tx = sx(L.eye[0] + 90), ty = sy(-8);
    fx.beam(ex, ey, tx, ty, 3, EYEFX, 0.5, 2); fx.beam(ex, ey, tx, ty, 1, VIOFX, 0.5, 2);
    for (let i = 0; i < 4; i++) { const t = L.stalk[i].tip; fx.beam(sx(t[0]), sy(t[1]), tx, ty, 1, VIOFX, 0.3, 1); }   // 四只小眼也射出细线
    ring(ex, ey, 0, EYEFX); fx.cross(ex, ey, 9, EYEFX, 0.22); burst(ex, ey, 18, 40, 120, 0.2, 0.5, EYEFX, 0);
    fx.circle(tx, ty + 6, 12, 4, VIOFX, 0.6, 2, 1); burst(tx, ty, 14, 30, 100, 0.2, 0.5, VIOFX, 20);   // 被锁定的地方：准星圈
    shake(0.3, 3); flash(0.08); beamT = 0; hitDummy(1, 1);
  }
  function alarmFx() {
    const cx = sx(L.c[0]), cy = sy(L.c[1]), bx = sx(L.beacon[0]), by = sy(L.beacon[1]);
    ring(cx, cy, 1, ALFX); ring(cx, cy, 0, EYEFX); flash(0.12); shake(0.35, 3);
    burst(bx, by, 20, 40, 130, 0.2, 0.5, ALFX, 10); fx.cross(bx, by, 10, ALFX, 0.25);
    for (let i = 0; i < 4; i++) { const t = L.stalk[i].tip; burst(sx(t[0]), sy(t[1]), 5, 20, 70, 0.2, 0.4, ALFX, 0); }
    fx.circle(cx, HY, 26, 6, ALFX, 0.9, 2, 0); alT = 0;
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'lock') { lockFx(); sfx('boss', { k: 'seBeam', w: 1 }); sfx('impact', { pal: 'magic', w: 0.8 }); }
      else { alarmFx(); sfx('boss', { k: 'seSiren', w: 1 }); sfx('boss', { k: 'growl', w: 0.5 }); sfx('impact', { pal: 'magic', w: 0.7 }); }
      releaseOrbit(40, 110, 0.3, 0.6, { pts: 1 });
    }
    if (s === CHARGE) { if (MV === 'lock') sfx('boss', { k: 'seLock', w: 1 }); else sfx('boss', { k: 'seScan', w: 0.8 }); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 0.08) sfx('boss', { k: 'seHiss', w: 0.6 });
    if (s === ATTACK && t === T_STRIKE) { strikeFx(); sfx('swing', { kind: 'smash', w: 0.8 }); sfx('boss', { k: 'seBite', w: 1 }); sfx('hit', { mat: 'metal', w: 0.8 }); }
    if (s === IDLE && t === 0.6) sfx('boss', { k: 'seScan', w: 0.35 });
    if (s === CHARGE && MV === 'roar' && t === 0.3) sfx('boss', { k: 'seSiren', w: 0.5 });
    if (s === DEATH && t === INCOMING + 0.3) { sfx('boss', { k: 'seDie', w: 1 }); burst(sx(P.fx), sy(P.fy), 12, 30, 100, 0.2, 0.5, EYEFX, 10); }
    if (s === DEATH && t === INCOMING + 1.25) { for (let i = 0; i < 24; i++) spawn(K_DUST, sx(-30 + Math.random() * 60), HY - 1, (Math.random() - 0.5) * 50, -8 - Math.random() * 16, 0.5 + Math.random() * 0.5, FXI.dust); shake(0.25, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); sfx('hit', { mat: 'metal', w: 0.6 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-24 + Math.random() * 48), HY - 4 - Math.random() * 36, 0, -14 - Math.random() * 20, 0.8 + Math.random() * 0.8, VIOFX); sfx('boss', { k: 'fade', w: 0.8 }); }
  }
  const EVENTS = [[0.6], [], [0.08, T_STRIKE], [0.3], [], [], [], [INCOMING + 0.3, INCOMING + 1.25, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    beamT += dt; alT += dt;
    if (P.thr > 0 && Math.random() < 0.25 + P.thr * 0.12) { const x = sx(L.noz[0]) + (Math.random() - 0.5) * 4; spawn(K_EMBER, x, sy(L.noz[1] + 4 + P.thr * 2), (Math.random() - 0.5) * 10, 10 + Math.random() * 14, 0.25, Math.random() < 0.5 ? EYEFX : VIOFX); }   // 推进口的火星往下喷
    if (state === MOVE) { const f = Math.floor(stT * 12) % 8; if (f !== lastHov) { lastHov = f; if (f === 0) sfx('boss', { k: 'seHum', w: 0.6 }); if (f === 0 || f === 4) { const x = sx(L.noz[0]); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 10, HY, (Math.random() - 0.5) * 30 + (P.flip ? 14 : -14), -3 - Math.random() * 5, 0.35 + Math.random() * 0.3, FXI.dust); } } }
    if (state === CHARGE && Math.random() < 0.5) {   // 蓄力：光粒从四周旋进瞳孔
      const a = Math.random() * 6.2832, r = 16 + Math.random() * 14, gx = sx(P.fx), gy = sy(P.fy), rp = MV === 'roar' ? ALFX : Math.random() < 0.5 ? EYEFX : VIOFX;
      spawnX(K_SPIRAL_PT, gx, gy, r / (0.3 + Math.random() * 0.2), 0, 9, rp, { a, r, w: 7 + Math.random() * 3, tx: gx, ty: gy, orbitR: 2 });
    }
    if (state === CHARGE && MV === 'lock' && Math.random() < 0.3) { const i = (Math.random() * 4) | 0, t = L.stalk[i].tip; spawn(K_EMBER, sx(t[0]), sy(t[1]), 6, 0, 0.2, VIOFX); }
    if ((state === CAST || state === RECOVER) && MV === 'roar' && alT > 0.25 && P.alarm) { alT = 0; ring(sx(L.beacon[0]), sy(L.beacon[1]), 0, ALFX); }   // 警报：信标一圈一圈往外闪
    if (state === RECOVER && MV === 'lock' && Math.random() < 0.4) { const ex = sx(L.eye[0] + 3), ey = sy(L.eye[1]); spawn(K_EMBER, ex + Math.random() * 20, ey + Math.random() * 3, 30, 4, 0.2, EYEFX); }   // 还盯着：射线方向的细光
    if (state === DEATH && P.crk && Math.random() < 0.5) { spawn(K_BURST, sx(P.fx + (Math.random() - 0.5) * 16), sy(P.fy + (Math.random() - 0.5) * 16), (Math.random() - 0.5) * 60, -20 - Math.random() * 30, 0.25, EYEFX); }
    if (state === IDLE && P.crk && Math.random() < 0.3) spawn(K_EMBER, sx(-12 + Math.random() * 6), sy(-50 + Math.random() * 20), 0, -8, 0.3, EYEFX);
  }
  function fxReset() { beamT = 9; lastHov = -1; alT = 0; }
  function fxBack(f12) {   // 地上的一圈推进光（悬空时）
    if (P.thr <= 0 || P.dead) return; const x = sx(L.noz[0]), w = Math.round(6 + P.thr * 3), R = P.alarm === 2 ? AR : ER;
    for (let dx = -w; dx <= w; dx++) if (((dx + f12) & 1) === 0) E.put(x + dx, HY + 1, R[Math.abs(dx) < w / 2 ? 3 : 4]);
  }
  function setMove(id) { MV = MVDUR[id] ? id : 'lock'; return MVDUR[MV]; }

  const VOICES = {
    seHum: (s, t, w, p) => { s.tone(t, 'sawtooth', 58, 0.7, 0.03 + 0.02 * w, { lp: 380, vib: [6, 8, 0.1], pan: p }); s.tone(t, 'sine', 116, 0.7, 0.03 * w, { vib: [6, 4, 0.1], pan: p }); s.nz(t, 0.6, 'bandpass', 700, 2, 0.015 * w, { pan: p }); },
    seScan: (s, t, w, p) => { s.tone(t, 'sine', 900, 0.5, 0.03 + 0.02 * w, { to: 1800, pan: p, rev: 0.3 }); s.tone(t + 0.25, 'sine', 1800, 0.25, 0.02 * w, { to: 700, pan: p, rev: 0.3 }); s.blip(t, 2400, 0.02 * w, { pan: p }); },
    seLock: (s, t, w, p) => { for (let i = 0; i < 6; i++) s.blip(t + i * (0.12 - i * 0.012), 1400 + i * 160, 0.03 + 0.01 * w, { pan: p }); s.riser(t, t + 0.6, 300, 1600, 0.03 * w, { pan: p }); },
    seBeam: (s, t, w, p) => { s.tone(t, 'sawtooth', 1200, 0.6, 0.04 + 0.02 * w, { to: 820, lp: 3600, vib: [28, 30, 0.02], pan: p, rev: 0.35 }); s.fm(t, 440, 0.6, 0.04 * w, { r: 2.01, i: 3, pan: p });
      s.nz(t, 0.4, 'highpass', 2800, 0.7, 0.05 * w, { to: 1500, pan: p }); s.thud(t, 160, 60, 0.18, 0.1 * w, { pan: p }); },
    seHiss: (s, t, w, p) => { s.nz(t, 0.25, 'bandpass', 2200, 1.5, 0.04 * w, { to: 900, pan: p }); s.tone(t, 'square', 90, 0.2, 0.02 * w, { to: 60, lp: 500, pan: p }); },
    seBite: (s, t, w, p) => { s.ring(t, 980, 0.2, 0.05 * w, { pan: p }); s.ring(t + 0.01, 1460, 0.15, 0.03 * w, { pan: p }); s.thud(t, 220, 70, 0.12, 0.12 * w, { pan: p }); s.nz(t, 0.06, 'highpass', 3000, 0.7, 0.06 * w, { pan: p }); },
    seSiren: (s, t, w, p) => { for (let i = 0; i < 3; i++) { s.tone(t + i * 0.42, 'sawtooth', 520, 0.4, 0.04 + 0.02 * w, { to: 980, lp: 2400, pan: p, rev: 0.4 }); s.tone(t + i * 0.42, 'square', 260, 0.4, 0.02 * w, { to: 490, lp: 1200, pan: p }); }
      s.rumble(t, 1.2, 0.06 + 0.04 * w, { f: 90, pan: p }); },
    seDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 700, 1.4, 0.05 + 0.02 * w, { to: 60, lp: 1800, vib: [14, 60, 0.1], pan: p, rev: 0.5 }); s.crackle(t, 0.9, 2200, 0.05 * w, { pan: p });
      for (let i = 0; i < 4; i++) s.blip(t + 0.1 + i * 0.17, 1800 - i * 300, 0.02 * w, { pan: p }); },
  };

  return {
    name: '哨眼', HX, R_EL: EYEFX, DUR, hero, P, GLOW_MATS: [IRV, IRC, IRW, ALR, SEAMD], HIT_POINT: [4, -38], EVENTS, MAX_H: 74, OWN_MAX: 40, SHEET_K: 3, VOICES,
    SFX: { body: 'armor', how: 'topple', pal: 'magic', style: 'bolt', w: 1, hover: 1 },
    MOVES: ['lock', 'roar'], MOVE_NAMES: { lock: '锁定', roar: '警报（半血怒吼）' }, setMove,
    SHEET: [[IDLE, [0, 0.7, 1.0, 1.3, 2.3, 2.4]], [MOVE, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 6 / 12, 7 / 12]], [ATTACK, [0, 1 / 12, 2 / 12, 3 / 12, 4 / 12, 5 / 12, 7 / 12]],
      [CHARGE, [0, 0.17, 0.33, 0.5], 'lock'], [CAST, [0, 2 / 12, 4 / 12], 'lock'], [RECOVER, [0.17, 0.42, 0.7], 'lock'],
      [CHARGE, [0.08, 0.25, 0.42, 0.5], 'roar'], [CAST, [0, 1 / 12, 3 / 12], 'roar'], [RECOVER, [0.2, 0.5], 'roar'],
      [HURT, [0.3, 0.42, 0.55, 0.7]], [DEATH, [0.34, 0.5, 0.7, 1.0, 1.15, 1.3, 1.6, 2.0, 2.4, 2.7]]],
    portrait, headShot, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(hero, 1, lastF12), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 200, H: 128 });
