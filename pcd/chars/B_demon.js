// 深渊魔王（最终首领，炼狱深处）：首领标准的试点。设定卡与特效卡见 pcd/run/boss-standard.md「试点二」。
// 依据：附录 G「弯角、蝠翼、利爪、从岩浆里爬出」；陨石（砸战斗力最高的）、震击；深渊之怒（60 秒后伤害 ×2.5）；第二阶段 陨石雨。
// 剪影：岩浆里升起的上半身（原点 = 岩浆面），正面略侧向右；一对盘卷的羊角、两扇张开的蝠翼、肩上带刺的黑曜石肩甲、垂到岩浆里的巨爪；
// 胸口一颗熔岩心，裂纹从心口爬满全身（第二阶段 / 深渊之怒时裂纹更多更亮）。游戏里按 6 倍画（普通单位 4 倍，大一档）。
// 招式（setMove）：meteor 陨石 · meteor2 陨石雨 · dSlam 震击 · poke 重击 · rise 升起 · p2 第二阶段仪式。
PCD.define('B_demon', (E) => {
  const { defDeep, defMat, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING, DRAMP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, MG = DRAMP.magma;

  const HIDE = defDeep('hellhide', { depth: 9, dark: 2, amb: 0.1 }), HIDED = defDeep('hellhide', { depth: 6, dark: 4, amb: 0.08 });   // 暗红的皮，熔岩裂纹才亮得出来
  const OBS = defDeep('obsidian', { depth: 4, amb: 0.1 }), HORN = defDeep('ivory', { depth: 4 }), HORND = defDeep('ivory', { depth: 3, dark: 3 });
  const WING = defDeep('membrane', { depth: 6, amb: 0.2 }), WINGD = defDeep('membrane', { depth: 6, amb: 0.1, dark: 2 });
  const MAG1 = defMat([MG[2], MG[3], MG[5], MG[6]], 1, 1), MAG2 = defMat([MG[3], MG[5], MG[7], MG[8]], 1, 1), MAG3 = defMat([MG[5], MG[7], MG[8], MG[9]], 1, 1), EMB = defMat([MG[2], MG[3], MG[4], MG[5]], 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { meteor: { 3: 1.6, 4: 0.5, 5: 0.7 }, meteor2: { 3: 1.5, 4: 0.5, 5: 0.7 }, dSlam: { 3: 1.4, 4: 0.45, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'meteor', HOT = 0;   // HOT：第二阶段 / 深渊之怒，裂纹常亮
  const LAVA = [MG[8], MG[6], MG[4]], CORE = [MG[9], MG[7], MG[5]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: CORE, k: 1 }, { x: 0, y: 0, r: 70, ramp: LAVA, k: 0.62 }, { x: 0, y: 0, r: 0, ramp: CORE, k: 1 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.fire], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[MAG1] = RIM.skip[MAG2] = RIM.skip[MAG3] = RIM.skip[EMB] = RIM.skip[WING] = RIM.skip[WINGD] = 1;

  // 姿势：身体升降 / 前倾、转头、张嘴、两只手的落点、翼的展开 / 扇动、火球、裂纹亮度
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'fist', 'ws', 'wf', 'glow', 'eyes', 'orb', 'ox', 'oy', 'orb2', 'flash', 'dq', 'hot', 'drip', 'breath'];
  const K = {
    idle: { nx: 31, ny: 1, fx2: -30, fy2: 1, lean: 0, hd: 0, ws: 0.8, wf: 0 },
    raise1: { nx: 20, ny: -86, fx2: -32, fy2: -2, lean: -0.18, hd: -0.2, ws: 1, wf: 0.8 },          // 陨石：单手高举，后仰，翼往上翻
    back1: { nx: 8, ny: -88, fx2: -34, fy2: -4, lean: -0.26, hd: -0.26, ws: 1, wf: 1 },
    throw1: { nx: 52, ny: -30, fx2: -30, fy2: 2, lean: 0.32, hd: 0.16, ws: 0.9, wf: -0.7 },
    raise2: { nx: 42, ny: -84, fx2: -40, fy2: -84, lean: -0.24, hd: -0.36, ws: 1, wf: 1 },       // 陨石雨：双臂张成 V、仰头吼
    throw2: { nx: 48, ny: -34, fx2: 22, fy2: -30, lean: 0.3, hd: 0.14, ws: 0.9, wf: -0.7 },
    overhead: { nx: 10, ny: -94, fx2: -2, fy2: -94, lean: -0.2, hd: -0.08, ws: 0.4, wf: 0.9 },    // 震击：双拳合抱举过头，翼半收
    slam: { nx: 40, ny: 4, fx2: 24, fy2: 4, lean: 0.42, hd: 0.3, ws: 0.6, wf: -1 },
    claw: { nx: 12, ny: -58, fx2: -34, fy2: -10, lean: -0.12, hd: 0.02, ws: 0.7, wf: 0.2 },       // 重击：单爪往后拉
    poke: { nx: 56, ny: -4, fx2: -30, fy2: 2, lean: 0.36, hd: 0.2, ws: 0.8, wf: -0.6 },
    hunch: { nx: 8, ny: -28, fx2: -4, fy2: -30, lean: 0.35, hd: 0.35, ws: 0.3, wf: -0.2 },
    wide: { nx: 50, ny: -62, fx2: -48, fy2: -62, lean: -0.16, hd: -0.32, ws: 1, wf: 1 },
    climbA: { nx: 32, ny: -14, fx2: -28, fy2: 2, lean: 0.3, hd: 0.3, ws: 0.15, wf: 0 },
    climbB: { nx: 30, ny: 2, fx2: -30, fy2: -14, lean: 0.3, hd: 0.3, ws: 0.15, wf: 0 },
    swipeW: { nx: -4, ny: -50, fx2: -30, fy2: 1, lean: -0.1, hd: -0.08, ws: 0.9, wf: 0.3 },     // 普攻：爪收到胸前 → 横扫出去
    swipe: { nx: 52, ny: -28, fx2: -30, fy2: 1, lean: 0.24, hd: 0.1, ws: 0.9, wf: -0.4 },
    agony: { nx: 30, ny: -84, fx2: -28, fy2: -80, lean: -0.2, hd: -0.38, ws: 1, wf: 0.9 },
    limp: { nx: 26, ny: 6, fx2: -24, fy2: 6, lean: 0.45, hd: 0.5, ws: 0.1, wf: -1 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'ws', 'wf'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.wf = [0, 0.15, 0.3, 0.15, 0, -0.15][Math.floor(tt / 0.4) % 6]; P.glow = 1 + ((f12 >> 2) & 1); P.drip = f12 % 6; P.eyes = (f12 % 7 === 0 || f12 % 11 === 0) ? 1 : 2;   // 眼里的光一跳一跳
      const lp = tt % DUR[IDLE]; if (lp >= 1.5 && lp < 2.0) { P.hd = -0.1; P.jaw = lp < 1.75 ? 1 : 0; P.fist = 1; } };   // 待机个性：抬头从鼻孔里喷一口烟
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1; P.drip = f12 % 6; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.swipeW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.swipeW, K.swipeW); P.glow = 2; }
      else if (tq < 0.42) { pose(K.swipe, K.swipe); P.jaw = 2; P.glow = 3; P.flash = 0; }
      else pose(K.swipe, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.25; P.lean = -0.1; P.jaw = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.wf = 0.6; P.nx -= 4; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.25 * (1 - q); P.lean = -0.1 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.wf = (f12 & 1) ? 1 : 0.6; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 3 : 2 - ((f12 >> 1) & 1); P.eyes = d < 1.2 ? 2 : 1; }
      else { pose(K.limp, K.limp); P.jaw = 1; P.glow = d < 2 ? 1 : 0; P.eyes = 0; P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.55) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { meteor: 0, meteor2: 1, dSlam: 2, poke: 3, rise: 4, p2: 5 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D);
    if (MV === 'meteor' || MV === 'meteor2') {
      const two = MV === 'meteor2', R = two ? K.raise2 : K.raise1, TH = two ? K.throw2 : K.throw1;
      if (st === CHARGE) {
        if (q < 0.45) { pose(K.idle, R, ease.out(q / 0.45)); P.orb = Math.round(q / 0.45 * 3); }
        else if (q < 0.6) { pose(R, K.back1, ease.inOut((q - 0.45) / 0.15)); P.orb = 3 + (f12 & 1); if (two) { P.fx2 = K.raise2.fx2 - 4; P.fy2 = K.raise2.fy2 - 4; } }
        else if (q < 0.68) { pose(K.back1, TH, ease.in((q - 0.6) / 0.08)); P.orb = 0; P.jaw = 2; }
        else { pose(TH, TH); P.jaw = 1; P.fist = 0; }
        if (two) P.orb2 = P.orb; P.by = -Math.round((two ? 6 : 4) * clamp01(q / 0.45)) + (q >= 0.6 ? 3 : 0);
        P.glow = q < 0.3 ? 2 : 3; P.eyes = 2;
      } else if (st === CAST) { pose(TH, TH); P.fist = 1; P.jaw = 2; P.glow = 3; P.eyes = 2; P.lean += 0.04; }
      else pose(TH, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else if (MV === 'dSlam' || MV === 'poke') {
      const up = MV === 'dSlam' ? K.overhead : K.claw, dn = MV === 'dSlam' ? K.slam : K.poke;
      if (st === CHARGE) { pose(K.idle, up, ease.out(clamp01(q / 0.5))); P.by = -Math.round(6 * ease.out(clamp01(q / 0.5))); if (q > 0.5) { P.nx += (f12 & 1) ? 1 : -1; P.by += (f12 & 1); } P.fist = MV === 'dSlam' ? 1 : 0; P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(dn, dn); P.by = 4; P.fist = MV === 'dSlam' ? 1 : 0; P.jaw = 3; P.glow = 3; P.eyes = 2; }
      else { pose(dn, K.idle, ease.inOut(clamp01(tq / 0.55))); P.by = Math.round(4 * (1 - clamp01(tq / 0.55))); }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1 + (f12 & 1); P.drip = f12 % 6; P.eyes = q > 0.6 ? 2 : 1; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：抱住胸口 → 两声心跳 → 仰天怒吼、双翼全开，裂纹爬满全身
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.flash = 0; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [19, -38], SHF = [-18, -38], NECK = [3, -46], WRN = [9, -40], WRF = [-9, -40];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.45 - P.lean * 0.55); }   // 头大了、角长了：转头幅度收一半，角不会扫过脸
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(-2, -29); L.wrN = B.at(WRN[0], WRN[1]); L.wrF = B.at(WRF[0], WRF[1]);
    headXf(); L.eye = B.at(6, -62); L.mouth = B.at(7, -52 + P.jaw * 1.5);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    L.elN = B.ik(L.shN, L.hN, 17, 18, -1); L.elF = B.ik(L.shF, L.hF, 17, 18, 1);
    L.orb = [L.hN[0] + 1, L.hN[1] - 8 - P.orb]; L.orb2 = [L.hF[0] - 1, L.hF[1] - 8 - P.orb2];
    P.fcx = P.orb ? L.orb[0] : L.core[0]; P.fcy = P.orb ? L.orb[1] : L.core[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);

  // 翼：肩胛 → 腕 → 四根指骨，骨间的膜下缘是一道道弧（远侧那扇暗、小一圈）
  function wing(side) {
    const far = side < 0, root = far ? L.wrF : L.wrN, s = 0.25 + 0.75 * P.ws, k = far ? 0.9 : 1, f = P.wf * 6;
    const wr = [root[0] + side * (20 + 30 * s) * k, root[1] - (22 + 18 * s) * k - f];   // 张得更开：剪影压过来
    const tips = [[side * 40, 2 - f * 0.4], [side * 38, 24 - f * 0.2], [side * 26, 40], [side * 9, 46]].map(([dx, dy]) => [wr[0] + dx * s * k, wr[1] + dy * (0.55 + 0.45 * s) * k]);
    const base = [root[0] + side * 2, root[1] + 26];
    const mem = [root, wr, tips[0]]; for (let i = 0; i < 3; i++) { const a = tips[i], b = tips[i + 1], m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]; mem.push([m[0] + (wr[0] - m[0]) * 0.22, m[1] + (wr[1] - m[1]) * 0.22], b); }
    { const a = tips[3], m = [(a[0] + base[0]) / 2, (a[1] + base[1]) / 2]; mem.push([m[0] + (wr[0] - m[0]) * 0.15, m[1] + (wr[1] - m[1]) * 0.15], base); }
    part(); polyW(mem, far ? WINGD : WING);
    for (const tp of tips) lnW(wr[0], wr[1], tp[0] * 0.55 + wr[0] * 0.45 + side, tp[1] * 0.55 + wr[1] * 0.45 + 2, far ? WINGD : WING, 3);   // 膜上的筋
    part(); const bm = far ? HIDED : HIDE; capW(root[0], root[1], wr[0], wr[1], 3.2, 2.4, bm); for (const tp of tips) capW(wr[0], wr[1], tp[0], tp[1], 1.6, 0.6, bm);
    part(); capW(wr[0], wr[1], wr[0] - side * 1, wr[1] - 5, 1.6, 0.4, far ? HORND : HORN);   // 腕上的钩爪
    return wr;
  }
  function arm(side) {
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? HIDED : HIDE, ob = far ? HORND : HORN;
    part(); capW(sh[0], sh[1], el[0], el[1], 6, 5, m); capW(el[0], el[1], h[0], h[1], 5, 5.5, m);
    const mid = [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2]; dot(mid[0] - 1, mid[1] - 2, 2.4, m, 7);            // 二头肌高光
    lnW(el[0], el[1], h[0], h[1], m, 3);
    part(); const b0 = [el[0] + (h[0] - el[0]) * 0.3, el[1] + (h[1] - el[1]) * 0.3], b1 = [el[0] + (h[0] - el[0]) * 0.78, el[1] + (h[1] - el[1]) * 0.78];
    capW(b0[0], b0[1], b1[0], b1[1], 6.2, 6.6, OBS); const bn = [b1[0] - b0[0], b1[1] - b0[1]], bl = Math.hypot(bn[0], bn[1]) || 1, nrm = [-bn[1] / bl * side, bn[0] / bl * side];
    for (let i = 0; i < 3; i++) { const q = 0.2 + i * 0.3, p = [b0[0] + bn[0] * q + nrm[0] * 6, b0[1] + bn[1] * q + nrm[1] * 6]; capW(p[0], p[1], p[0] + nrm[0] * 5 - bn[0] / bl * 2, p[1] + nrm[1] * 5 - bn[1] / bl * 2, 1.6, 0.4, OBS, 6); }   // 护臂的刺
    lnW(b0[0], b0[1], b1[0], b1[1], OBS, 8);
    part(); dot(h[0], h[1], 4.6, m); const dir = Math.atan2(h[1] - el[1], h[0] - el[0]);
    for (let i = 0; i < 4; i++) { const a = dir + (i - 1.5) * (P.fist && !far ? 0.28 : 0.42), r0 = [h[0] + Math.cos(a) * 3.5, h[1] + Math.sin(a) * 3.5], ln = P.fist && !far ? 3 : 7, tip = [r0[0] + Math.cos(a + 0.35 * side) * ln, r0[1] + Math.sin(a + 0.35 * side) * ln];
      capW(r0[0], r0[1], tip[0], tip[1], 1.5, 0.4, ob, i === 0 ? 7 : 5); }
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-14, 3], [14, 3], [16, -10], [15, -19], [-15, -19], [-16, -10]], HIDE); B.ell(E, 0, -30, 21, 15, 0, HIDE); B.ell(E, 0, -41, 12, 5, 0, HIDE);
    B.ln(E, -17, -28, -9, -23, HIDE, 2); B.ln(E, -9, -23, -2, -24, HIDE, 3); B.ln(E, 2, -24, 9, -23, HIDE, 3); B.ln(E, 9, -23, 17, -28, HIDE, 2);   // 胸肌下沿
    B.ell(E, -9, -32, 5, 3, 0.2, HIDE, 7); B.ell(E, 9, -32, 5, 3, -0.2, HIDE, 7);                                       // 胸肌高光
    B.ln(E, 0, -22, 0, 1, HIDE, 3); for (const y of [-16, -10, -4]) { B.ln(E, -8, y, -2, y + 1, HIDE, 3); B.ln(E, 2, y + 1, 8, y, HIDE, 3); }   // 腹肌
    for (const y of [-22, -17, -12]) { B.ln(E, -15, y, -12, y + 2, HIDE, 3); B.ln(E, 15, y, 12, y + 2, HIDE, 3); }          // 前锯肌
    // 熔岩裂纹：先压一道勾线色的缝，再在缝里填亮的熔岩（亮度跟着 glow / 第二阶段）
    const cr = [[[-2, -29], [-8, -34], [-13, -38]], [[-2, -29], [-9, -22], [-12, -14]], [[-2, -29], [5, -35], [10, -40]], [[-2, -29], [6, -22], [11, -13], [9, -5]], [[-2, -29], [-1, -18], [-4, -8]]];
    const hot = [[[-13, -38], [-17, -30]], [[11, -13], [15, -6]], [[10, -40], [16, -36]], [[-12, -14], [-10, -4]], [[-4, -8], [2, -2]]];
    const lit = P.glow >= 3 ? MAG3 : P.glow >= 2 ? MAG2 : MAG1;
    for (const c of cr) for (let i = 1; i < c.length; i++) { B.ln(E, c[i - 1][0], c[i - 1][1] + 1, c[i][0], c[i][1] + 1, HIDE, 10); B.ln(E, c[i - 1][0], c[i - 1][1], c[i][0], c[i][1], i === 1 ? lit : MAG1); }
    if (P.hot) for (const c of hot) { B.ln(E, c[0][0], c[0][1] + 1, c[1][0], c[1][1] + 1, HIDE, 10); B.ln(E, c[0][0], c[0][1], c[1][0], c[1][1], lit); }
    part(); B.ell(E, -2, -29, 4, 4.4, 0, MAG1); B.ell(E, -2, -29, 2.6, 3, 0, P.glow >= 2 ? MAG3 : MAG2); if (P.glow >= 3) B.px(E, -3, -30, MAG3);   // 熔岩心
  }
  function collar() {
    part(); torsoXf(); for (const [x, h] of [[-13, 6], [-8, 8], [13, 8], [17, 6]]) B.cap(E, x, -41, x * 1.3, -41 - h, 2.2, 0.5, OBS);   // 后颈的黑曜石骨刺
  }
  function pauldron(side) {
    part(); torsoXf(); const far = side < 0, c = far ? [-21, -39] : [22, -39], m = OBS;
    B.ell(E, c[0], c[1], 9, 6.5, side * 0.3, m); B.ln(E, c[0] - 7, c[1] + 3, c[0] + 7, c[1] + 3, m, 3); B.ln(E, c[0] - 6, c[1] - 3, c[0] + 5, c[1] - 5, m, 8);
    for (const [dx, h, a] of [[0, 6, 0.5], [4, 8, 0.9], [7, 6, 1.3]]) B.cap(E, c[0] + dx * side, c[1] - 3, c[0] + (dx + Math.sin(a) * h) * side, c[1] - 3 - Math.cos(a) * h, 2, 0.4, m, 6);
  }
  function head() {   // 大一圈的头（约 1.5 倍）：粗脖子、压低的眉骨、两道斜着发光的眼、獠牙大嘴（张嘴里面是火）
    part(); headXf(); const J = Math.round(P.jaw * 1.5);
    B.cap(E, 1, -40, 3, -52, 8, 7, HIDE); B.ln(E, -3, -44, -1, -52, HIDE, 3); B.ln(E, 6, -43, 8, -51, HIDE, 3);                   // 脖子和筋
    part(); headXf();
    B.ell(E, 4, -63, 11, 9.5, 0, HIDE); B.poly(E, [[-7, -62], [16, -62], [17, -55], [15, -50 + J], [11, -46 + J], [-1, -46 + J], [-5, -50 + J], [-7, -56]], HIDE);   // 颅、宽下颌
    B.ell(E, 0, -58, 3, 2, 0.3, HIDE, 7); B.ell(E, 11, -58, 3, 2, -0.3, HIDE, 7);                                              // 颧骨高光
    B.poly(E, [[-8, -68], [17, -68], [18, -64], [5, -62], [-8, -64]], HIDE, 3); B.ln(E, -7, -69, 16, -69, HIDE, 8);          // 眉骨：一整条压下来
    B.ln(E, 4, -67, 5, -71, HIDE, 3); B.ln(E, 5, -71, 4, -74, HIDE, 3);                                                       // 额头中间的皱
    const eye = P.eyes >= 2 ? MAG3 : P.eyes === 1 ? MAG2 : HIDE, et = P.eyes ? 0 : 10;
    B.ln(E, -5, -63, 1, -61, eye, et); B.ln(E, -5, -62, 1, -60, P.eyes ? MAG1 : HIDE, et);                                    // 远眼（斜）
    B.ln(E, 8, -61, 14, -63, eye, et); B.ln(E, 8, -60, 14, -62, P.eyes ? MAG1 : HIDE, et);                                    // 近眼
    if (P.eyes >= 2) { B.px(E, -6, -64, MAG2); B.px(E, 15, -64, MAG2); B.px(E, -1, -62, MAG3); B.px(E, 11, -62, MAG3); }       // 眼角拖出来的光
    B.ln(E, 5, -60, 6, -55, HIDE, 3); B.px(E, 4, -55, HIDE, 10); B.px(E, 8, -55, HIDE, 10); B.ln(E, 3, -56, 9, -56, HIDE, 7); // 鼻梁、鼻孔
    if (J) { B.poly(E, [[-2, -52], [14, -52], [13, -51 + J], [-1, -51 + J]], MAG1); if (J >= 2) B.poly(E, [[2, -51], [10, -51], [9, -52 + J], [3, -52 + J]], J >= 4 ? MAG3 : MAG2); B.ln(E, -1, -51 + J, 13, -51 + J, HIDE, 10); }   // 张嘴：暗红的喉咙，里面一团火
    B.ln(E, -3, -52, 15, -52, HIDE, 10);
    for (const x of [0, 11]) { B.ln(E, x, -52, x + (x ? -0.5 : 0.5), -48, HORN, 8); B.px(E, x, -51, HORN, 6); }             // 上獠牙（长）
    if (J) { for (const x of [3, 6, 9]) B.px(E, x, -51, HORN, 5); for (const x of [2, 9]) B.ln(E, x, -51 + J, x, -53 + J, HORN, 7); }   // 牙排、下獠牙
    for (const [x, y] of [[0, -46], [5, -45], [10, -46]]) B.cap(E, x, y + J, x + 0.5, y + 3 + J, 1.2, 0.3, OBS, 6);            // 下巴的骨刺
  }
  function horn(side) {   // 额头两侧的大角：先往外上方扫，再向前卷回来，角尖朝前
    part(); headXf(); const far = side < 0, m = far ? HORND : HORN, o = far ? -5 : 13;
    const pts = [[o, -67], [o + side * 7, -75], [o + side * 15, -80], [o + side * 23, -80], [o + side * 28, -75], [o + side * 28, -68], [o + side * 24, -64]];
    B.strand(E, pts, far ? 4.4 : 5, 1, m);
    for (let i = 1; i < pts.length - 2; i++) B.ln(E, (pts[i][0] + pts[i + 1][0]) / 2 - side, (pts[i][1] + pts[i + 1][1]) / 2 - 3, (pts[i][0] + pts[i + 1][0]) / 2 + side, (pts[i][1] + pts[i + 1][1]) / 2 + 3, m, 3);   // 角上的环纹
    B.ln(E, pts[1][0], pts[1][1] - 3, pts[3][0], pts[3][1] - 4, m, 8);                                                         // 角背的高光
  }
  function orb(c, n) {   // 手上聚起来的熔岩火球
    part(); const r = 1.5 + n * 1.3; dot(c[0], c[1], r + 1, MAG1); dot(c[0], c[1], r, MAG2); dot(c[0] - 0.5, c[1] - 0.5, Math.max(0.6, r - 1.6), MAG3);
  }
  function drips() {   // 从手和腰上滴回岩浆的熔滴
    if (!P.drip && P.st !== IDLE) return; part(); const k = P.drip;
    for (const [x, y, ph] of [[L.hN[0] - 3, L.hN[1] + 2, 0], [L.hF[0] + 3, L.hF[1] + 2, 3], [-12, -2 + P.by, 1], [13, -3 + P.by, 4]]) { const d = (k + ph) % 6; if (y + d > 0) continue; px(x, y + d, d < 2 ? MAG2 : MAG1); if (d > 0) px(x, y + d - 1, MAG1); }
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    wing(-1); wing(1); arm(-1); collar(); torso(); pauldron(-1);
    horn(-1); head(); horn(1); pauldron(1); arm(1);
    if (P.orb) orb(L.orb, P.orb); if (P.orb2) orb(L.orb2, P.orb2); drips();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = L.core[0] * z + spr.ox; RIM.ry = L.core[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = L.core[0] * z + spr.ox; LIGHTS[0].y = L.core[1] * z + spr.oy; LIGHTS[0].r = (P.glow >= 3 ? 16 : P.glow >= 2 ? 12 : 8) * z;
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 18 * z; LIGHTS[1].r = 58 * z; LIGHTS[1].k = P.hot ? 0.62 : 0.46;                        // 岩浆从下面照上来
    LIGHTS[2].x = (P.orb ? L.orb[0] : L.eye[0]) * z + spr.ox; LIGHTS[2].y = (P.orb ? L.orb[1] : L.eye[1]) * z + spr.oy; LIGHTS[2].r = (P.orb ? 8 + P.orb * 4 : P.eyes >= 2 ? 9 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面压低头、张嘴露火、双爪半张、双翼全开，裂纹全亮（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.3); P.hd = 0.08; P.jaw = 2; P.eyes = 2; P.glow = 3; P.hot = 1; P.ws = 1; P.wf = 0.35; P.by = 0; P.breath = 0; P.drip = 2;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; return PSPR;
  }

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0;
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'meteor' || MV === 'meteor2') { const h = L.hN; ring(sx(h[0]), sy(h[1]), 1, FXI.fire); burst(sx(h[0]), sy(h[1]), 16, 40, 120, 0.3, 0.6, FXI.fire, 20); shake(0.2, 2); }
      else if (MV === 'dSlam' || MV === 'poke') { slamFx(MV === 'dSlam'); }
      else if (MV === 'rise' || MV === 'p2') { const e = L.mouth; ring(sx(e[0]), sy(e[1]), 1, FXI.fire); ring(sx(0), sy(-30), 1, FXI.fire); flash(0.12); shake(0.4, 3); for (let i = 0; i < 40; i++) { const a = -Math.PI * Math.random(); spawnX(K_PHYS, sx(-2), sy(-29), Math.cos(a) * (60 + Math.random() * 120), Math.sin(a) * (80 + Math.random() * 140), 0.8 + Math.random() * 0.5, FXI.fire, { g: 220, floor: HY + 6 }); } sfx('boss', { k: 'demonRoar', w: 1 }); sfx('impact', { pal: 'fire', w: 1 }); }
    }
    if (s === CHARGE && (MV === 'meteor' || MV === 'meteor2')) sfx('boss', { k: 'lavaGather', w: 0.8, dur: E.DUR[CHARGE] });
    if (s === CHARGE && MV === 'rise') sfx('boss', { k: 'lavaRise', w: 1 });
    if (s === CHARGE && MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
  }
  function slamFx(two) {
    const pts = two ? [L.hN, L.hF] : [L.hN];
    for (const h of pts) { const x = sx(h[0]), y = HY; fx.wave(x, y, 1, 40, 9, 'fire', 0.5, 2); fx.wave(x, y, -1, 30, 7, 'fire', 0.45, 2); fx.crack(x, y, 20, 1, 'fire', 1.2); burst(x, y - 2, 24, 60, 180, 0.35, 0.8, FXI.fire, 50);
      for (let i = 0; i < 18; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 12, y - 3, (Math.random() - 0.5) * 150, -60 - Math.random() * 160, 0.9 + Math.random() * 0.5, FXI.fire, { g: 320, floor: HY + 2 }); }
    ring(sx(L.hN[0]), HY - 2, 1, FXI.fire); shake(0.35, 3); flash(0.06); sfx('impact', { pal: 'fire', w: 1 }); sfx('boss', { k: 'slam', w: two ? 1 : 0.7 }); sfx('hit', { mat: 'stone', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 3 / 12) { fx.slash(sx(L.shN[0]), sy(L.shN[1]), 34, 0.2, 2.6, 'fire', 0.22, 3, 2); burst(sx(L.hN[0]), sy(L.hN[1]), 16, 50, 140, 0.25, 0.5, FXI.fire, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'claw', w: 1 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'growl', w: 0.6 });
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'demonDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { burst(sx(-2), sy(-29), 40, 60, 200, 0.4, 0.9, FXI.fire, 30); ring(sx(-2), sy(-29), 1, FXI.fire); shake(0.3, 3); sfx('fall', { w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 40; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), sy(-10 - Math.random() * 50), 0, -16 - Math.random() * 24, 0.9 + Math.random() * 0.8, FXI.shadow); sfx('boss', { k: 'sink', w: 1 }); }
    if (s === CHARGE && (MV === 'meteor' || MV === 'meteor2') && Math.abs(t - E.DUR[CHARGE] * 0.62) < 0.02) { const h = L.hN; burst(sx(h[0]), sy(h[1]), 20, 60, 160, 0.25, 0.5, FXI.fire, 30); sfx('boss', { k: 'throw', w: 1 }); sfx('shoot', { proj: 'fire' }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [], [], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    emT += dt;
    if (emT > (P.hot ? 0.05 : 0.11)) { emT = 0; const x = sx(-26 + Math.random() * 52), y = sy(-10 - Math.random() * 40); spawn(K_EMBER, x, y, (Math.random() - 0.5) * 10, -14 - Math.random() * 12, 0.6 + Math.random() * 0.6, FXI.fire); }   // 身上一直往上飘的火星
    if (state === CHARGE && P.orb && Math.random() < 0.6) { const c = L.orb, a = Math.random() * 6.2832, r = 10 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.fire, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && (MV === 'dSlam' || MV === 'poke') && Math.random() < 0.4) { const h = L.hN; spawn(K_EMBER, sx(h[0] + (Math.random() - 0.5) * 10), sy(h[1] + 4), 0, 20, 0.4, FXI.fire); }
    if (state === IDLE && P.jaw && Math.random() < 0.5) spawn(K_RISE, sx(6 + Math.random() * 3), sy(-48), 6, -12, 0.6, FXI.dust);   // 鼻孔里的烟
    if (state === CHARGE && MV === 'rise' && Math.random() < 0.5) spawnX(K_PHYS, sx(-20 + Math.random() * 40), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, FXI.fire, { g: 240, floor: HY + 4 });
  }
  function fxReset() { emT = 0; }
  function fxBack(f12) { const x0 = sx(-40), x1 = sx(40); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x + f12) % 3) === 0) E.put(x, HY + 1, FXR[FXI.fire][P.hot ? 2 : 3]); }
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'meteor'; return MVDUR[MV]; }

  return {
    name: '深渊魔王', HX, R_EL: FXI.fire, DUR, hero, P, GLOW_MATS: [MAG1, MAG2, MAG3, EMB], HIT_POINT: [0, -34], EVENTS, MAX_H: 100, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'beast', how: 'dissolve', pal: 'fire', style: 'meteor', w: 1, hover: 1 },
    MOVES: ['meteor', 'meteor2', 'dSlam', 'poke', 'rise', 'p2'], MOVE_NAMES: { meteor: '陨石', meteor2: '陨石雨（第二阶段）', dSlam: '震击', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.55, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.4, 0.72, 0.9, 1.05, 1.3], 'meteor'], [CAST, [0], 'meteor'], [RECOVER, [0.25], 'meteor'], [CHARGE, [0.5, 0.8], 'meteor2'],
      [CHARGE, [0, 0.35, 0.9], 'dSlam'], [CAST, [0, 2 / 12], 'dSlam'], [RECOVER, [0.3], 'dSlam'], [CHARGE, [0.6], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 2 / 12, 4 / 12], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.36], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.3, 2.6]]],
    portrait, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
