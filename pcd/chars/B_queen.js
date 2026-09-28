// 精灵女王（最终首领，第二章「精灵之森」的月池）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「精灵女王（月牙王冠、长发、薄翼、权杖）· 月池 · 远程 · 怕近战贴身」；月光（被动）；月牙斩（沿远程最多的那条线穿过去）、
// 星雨（落在四个远程头上）→ 第二阶段 满月（星雨落在每个远程头上）。
// 设定卡 ——
//   剪影：从月池里浮起的上半身（原点 = 池面），裙摆没进水里；头顶一弯比头还宽的月牙王冠（两只尖角朝上、自己发光），
//         两只长长的精灵耳从银发里横着伸出去，背后两对蜻蜓似的薄翼（识别点：月牙冠 + 尖耳 + 一张冷白的脸和两点银蓝的光眼）。
//   脸：大、正面偏右，瓷白微紫的皮肤，细眉压着、嘴抿成一条线（冷）；银蓝发光的眼、上睫毛描黑往外挑。
//   主色：深夜蓝的长裙（绣着星点）、银发、灰蓝的薄纱长袖；光源是月光银蓝（月牙冠、眼、胸前的月坠、权杖头），星是一点暖白。
//   招式（setMove）：crescent 月牙斩 · starfall 星雨 · starfall2 满月 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 满月光环常亮。
//     月牙斩：权杖举到身后，杖头长出一弯越来越大的月刃 → 往前下方一挥（月牙弧 + 一道贴地的月光）。
//     星雨：权杖直举、另一只手张开，杖头聚起一颗越来越亮的星 → 往天上一送（光柱冲天、星星往上飞，游戏画落下来的）。
//     满月：双臂张成 V，背后一轮满月从小变大 → 满月一亮（两道大环、满天星）。重击：权杖收在胸前 → 往前一刺。
//     升起：闭着眼从池水里浮上来、湿发贴着 → 睁眼、张开双臂和薄翼，月牙冠一亮、吟唱。
//     第二阶段：双手合在胸前闭眼、月冠跳两下 → 睁眼张臂、背后满月炸开，此后头后常驻一圈满月光环、发间星光闪、薄翼的脉发光。
//     死亡：哀歌、仰头 → 瘫软、权杖倒下、月冠的光熄成冷银 → 沉回月池，散成往上飘的月光点。
PCD.define('B_queen', (E) => {
  const { defDeep, defMat, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, DR = E.DRAMP, SM = DR.stormmane, WH = ramp(['#ffffff'])[0], P5 = ramp(['#fff3d4'])[0], GO = ramp(['#e3a13c'])[0];

  // ───── 材质（暗 → 亮）：裙子压到深夜蓝，月光才亮得出来。色板有上限：银发 / 权杖用共用的 bladesteel、裙和薄翼用 stormmane、薄纱用 stormcoat；
  // 只有瓷白的皮是自己的（暗端借共享色板的石色）
  const R_SKIN = ['#0b0a18', '#221f33', '#37324b', '#524b6a', '#806a80', '#a894a4', '#c8b6c2', '#e2d6dc', '#f6eef2'];
  const SKIN = defDeep(R_SKIN, { depth: 4, amb: 0.5 }), SKIND = defDeep(R_SKIN, { depth: 4, dark: 1, amb: 0.3 });
  const HAIR = defDeep('bladesteel', { depth: 4, amb: 0.2 }), HAIRD = defDeep('bladesteel', { depth: 3, dark: 2, amb: 0.16 });
  const GOWN = defDeep('stormmane', { depth: 8, dark: 3, amb: 0.06 }), GOWND = defDeep('stormmane', { depth: 6, dark: 4, amb: 0.05 });
  const GAUZE = defDeep('stormcoat', { depth: 3, amb: 0.3 }), GAUZED = defDeep('stormcoat', { depth: 3, dark: 2, amb: 0.2 });
  const WING = defDeep("stormmane", { depth: 5, dark: 2, amb: 0.2 }), WINGD = defDeep("stormmane", { depth: 4, dark: 3, amb: 0.14 });
  const SILV = defDeep('bladesteel', { depth: 3, amb: 0.24 });
  const MOON1 = defMat([SM[1], SM[3], SM[5], SM[6]], 1, 1), MOON2 = defMat([SM[3], SM[5], SM[7], WH], 1, 1), MOON3 = defMat([SM[5], SM[7], WH, WH], 1, 1), STAR = defMat([GO, P5, WH, WH], 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { crescent: { 3: 1.1, 4: 0.45, 5: 0.6 }, starfall: { 3: 1.4, 4: 0.5, 5: 0.7 }, starfall2: { 3: 1.5, 4: 0.5, 5: 0.8 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'crescent', HOT = 0;   // HOT：第二阶段，头后的满月光环、发间星光、薄翼的脉常亮
  const MOONL = [SM[7], SM[6], SM[5]], POOLL = [SM[6], SM[5], SM[4]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: MOONL, k: 0.85 }, { x: 0, y: 0, r: 60, ramp: POOLL, k: 0.36 }, { x: 0, y: 0, r: 0, ramp: MOONL, k: 0.9 }, { x: 0, y: 0, r: 0, ramp: MOONL, k: 0.7 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.frost], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[MOON1] = RIM.skip[MOON2] = RIM.skip[MOON3] = RIM.skip[STAR] = 1;

  // 姿势：身体升降 / 前倾、转头、张嘴、两只手、权杖朝向（sa，屏幕角度，0 朝右、-π/2 朝上）、翼的展开 / 扇动、发的飘起（hl）/ 摆（hs）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'sa', 'ws', 'wf', 'hl', 'hs', 'glow', 'eyes', 'orb', 'orb2', 'cres', 'moon', 'tip', 'flash', 'dq', 'hot', 'rip'];
  const K = {
    idle: { nx: 22, ny: -30, fx2: -14, fy2: -26, lean: 0, hd: 0.04, sa: -1.62, ws: 0.75, wf: 0, hl: 0 },
    gaze: { nx: 22, ny: -30, fx2: -16, fy2: -55, lean: -0.03, hd: 0.14, sa: -1.62, ws: 0.8, wf: 0.1, hl: 0 },             // 待机个性：抬起一只手，一颗小星落在指尖，低头看它
    cresW: { nx: 30, ny: -50, fx2: -18, fy2: -40, lean: -0.1, hd: -0.1, sa: -1.25, ws: 1, wf: 0.7, hl: 0.5 },          // 月牙斩：权杖斜举到头侧，杖头长出月刃
    cresB: { nx: 26, ny: -52, fx2: -22, fy2: -36, lean: -0.2, hd: -0.16, sa: -1.62, ws: 1, wf: 1, hl: 0.8 },
    cresS: { nx: 36, ny: -40, fx2: -20, fy2: -56, lean: 0.24, hd: 0.1, sa: -0.25, ws: 0.85, wf: -0.7, hl: 0.4 },
    starUp: { nx: 26, ny: -58, fx2: -24, fy2: -64, lean: -0.1, hd: -0.22, sa: -1.35, ws: 1, wf: 0.6, hl: 0.5 },       // 星雨：权杖直举，另一只手张开
    starFling: { nx: 30, ny: -60, fx2: -28, fy2: -70, lean: -0.18, hd: -0.34, sa: -1.2, ws: 1, wf: 1, hl: 1 },
    moonV: { nx: 38, ny: -66, fx2: -34, fy2: -64, lean: -0.08, hd: -0.18, sa: -1.25, ws: 1, wf: 0.9, hl: 0.7 },       // 满月：双臂张成 V
    moonCast: { nx: 42, ny: -58, fx2: -38, fy2: -56, lean: -0.16, hd: -0.32, sa: -0.95, ws: 1, wf: 1, hl: 1 },
    pokeB: { nx: 4, ny: -38, fx2: -18, fy2: -34, lean: -0.12, hd: 0.02, sa: -0.12, ws: 0.7, wf: 0.2, hl: 0.2 },        // 重击：权杖收在胸前
    poke: { nx: 40, ny: -44, fx2: -22, fy2: -36, lean: 0.3, hd: 0.12, sa: -0.1, ws: 0.8, wf: -0.5, hl: 0.4 },
    flickW: { nx: 14, ny: -62, fx2: -16, fy2: -30, lean: -0.08, hd: -0.04, sa: -2.0, ws: 0.85, wf: 0.3, hl: 0.2 },   // 普攻：权杖挑起 → 往前一点
    flick: { nx: 36, ny: -42, fx2: -18, fy2: -30, lean: 0.2, hd: 0.08, sa: -0.45, ws: 0.8, wf: -0.4, hl: 0.3 },
    pray: { nx: 9, ny: -42, fx2: 1, fy2: -43, lean: 0.1, hd: 0.28, sa: -1.0, ws: 0.35, wf: -0.3, hl: 0 },              // 第二阶段：双手合在胸前
    wide: { nx: 40, ny: -64, fx2: -34, fy2: -62, lean: -0.16, hd: -0.28, sa: -1.2, ws: 1, wf: 1, hl: 1 },
    emergeA: { nx: 30, ny: -18, fx2: -26, fy2: -16, lean: 0.1, hd: 0.2, sa: -1.3, ws: 0.3, wf: -0.5, hl: 0 },         // 从池里浮上来：双臂往下划水
    emergeB: { nx: 26, ny: -40, fx2: -22, fy2: -40, lean: 0, hd: 0.06, sa: -1.6, ws: 0.6, wf: 0.5, hl: 0.3 },
    wail: { nx: 26, ny: -70, fx2: -26, fy2: -70, lean: -0.22, hd: -0.45, sa: -1.0, ws: 1, wf: 1, hl: 1 },
    limp: { nx: 20, ny: -12, fx2: -14, fy2: -12, lean: 0.35, hd: 0.55, sa: 0.5, ws: 0.2, wf: -1, hl: 0 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'sa', 'ws', 'wf', 'hl'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12; P.rip = f12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1, s6 = Math.floor(tt / 0.2) % 6; P.by = -b; P.hs = [0, 1, 2, 1, 0, -1][s6]; P.wf = [0, 0.12, 0.24, 0.12, 0, -0.12][s6]; P.glow = 1 + ((f12 >> 2) & 1); P.eyes = (f12 % 13 === 0) ? 2 : 1;
      const lp = tt % DUR[IDLE]; if (lp >= 1.2 && lp < 2.2) { const q = ease.inOut(clamp01((lp - 1.2) / 0.25)) * (lp > 1.95 ? clamp01((2.2 - lp) / 0.25) : 1); pose(K.idle, K.gaze, q); P.orb2 = lp > 1.35 && lp < 2.05 ? 1 + ((f12 >> 1) & 1) : 0; P.eyes = 2; } };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3, A = f < 2 ? K.emergeA : K.emergeB; pose(A, A); P.by = [3, 1, -1, 1][f]; P.hs = [2, 1, -1, 0][f]; P.glow = 1; P.wf = f < 2 ? -0.5 : 0.6; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.flickW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.flickW, K.flickW); P.glow = 2; P.tip = 2; }
      else if (tq < 0.42) { pose(K.flick, K.flick); P.jaw = 1; P.glow = 3; P.tip = 3; P.eyes = 2; P.hs = 2; }
      else pose(K.flick, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { P.hd = -0.3; P.lean = -0.12; P.jaw = 1; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.wf = 0.6; P.hl = 0.6; P.nx -= 4; P.hs = -2; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.3 * (1 - q); P.lean = -0.12 * (1 - q); P.hl = 0.6 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.wail, ease.out(clamp01(d / 0.25))); P.jaw = 2; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.wf = (f12 & 1) ? 1 : 0.6; P.hs = (f12 & 1) ? 2 : -2; }
      else if (d < 1.5) { pose(K.wail, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 2 : 1; P.glow = d < 1.1 ? 2 : 1; P.eyes = d < 1.2 ? 1 : 0; P.hl = 1 - clamp01((d - 0.7) / 0.6); }
      else { pose(K.limp, K.limp); P.glow = 0; P.eyes = 0; P.hot = 0; P.by = Math.round(clamp01((d - 1.5) / 1.3) * 26); P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.6) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { crescent: 0, starfall: 1, starfall2: 2, poke: 3, rise: 4, p2: 5 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    if (MV === 'crescent') {
      if (st === CHARGE) {
        if (q < 0.45) { pose(K.idle, K.cresW, ease.out(q / 0.45)); P.cres = 1 + Math.min(2, Math.floor(q / 0.15)); }
        else if (q < 0.8) { pose(K.cresW, K.cresB, ease.inOut((q - 0.45) / 0.35)); P.cres = 3; }
        else { pose(K.cresB, K.cresB); P.cres = 4; P.nx += tr * 0.7; P.by = f12 & 1; }
        P.by -= Math.round(2 * clamp01(q / 0.45)); P.glow = q < 0.4 ? 2 : 3; P.eyes = 2; P.hl = Math.max(P.hl, q);
      } else if (st === CAST) { pose(K.cresS, K.cresS); P.jaw = 1; P.glow = 3; P.eyes = 2; P.hs = 2; P.tip = 3; }
      else { pose(K.cresS, K.idle, ease.inOut(clamp01(tq / 0.5))); P.hl = 0.4 * (1 - clamp01(tq / 0.5)); P.glow = 2; }
    } else if (MV === 'starfall' || MV === 'starfall2') {
      const two = MV === 'starfall2', R = two ? K.moonV : K.starUp, C = two ? K.moonCast : K.starFling;
      if (st === CHARGE) {
        pose(K.idle, R, ease.out(clamp01(q / 0.4)));
        if (q > 0.4) { P.nx += tr * 0.6; P.fx2 -= tr * 0.6; }
        P.by = two ? 0 : -Math.round(2 * clamp01(q / 0.4));
        if (two) P.moon = Math.round(clamp01(q / 0.85) * 8) / 8; else P.orb = Math.min(4, 1 + Math.floor(q / 0.2));
        P.glow = q < 0.3 ? 2 : 3; P.eyes = 2; P.hl = Math.max(P.hl, clamp01(q * 1.2)); P.jaw = q > 0.7 ? 1 : 0;
      } else if (st === CAST) { pose(C, C); P.jaw = 2; P.glow = 3; P.eyes = 2; P.hl = 1; if (two) P.moon = 1; else P.tip = 3; P.by = -3; }
      else { pose(C, K.idle, ease.inOut(clamp01(tq / 0.6))); if (two) P.moon = Math.round(clamp01(1 - tq / 0.5) * 8) / 8; P.hl = 1 - clamp01(tq / 0.6); P.glow = 2; }
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.pokeB, ease.out(clamp01(q / 0.5))); P.by = -Math.round(2 * clamp01(q / 0.5)); if (q > 0.5) { P.nx += tr * 0.6; P.by += f12 & 1; } P.tip = 1 + Math.min(2, Math.floor(q * 3)); P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; }
      else if (st === CAST) { pose(K.poke, K.poke); P.jaw = 1; P.glow = 3; P.eyes = 2; P.tip = 3; P.hs = 2; }
      else pose(K.poke, K.idle, ease.inOut(clamp01(tq / 0.5)));
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3, A = f < 2 ? K.emergeA : K.emergeB; pose(A, A); P.by = [3, 1, -1, 1][f]; P.hs = [2, 1, -1, 0][f]; P.wf = f < 2 ? -0.5 : 0.6; P.eyes = q > 0.6 ? 2 : 0; P.glow = q > 0.6 ? 2 : 1; }
      else if (st === CAST) { pose(K.emergeB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 2; P.glow = 3; P.eyes = 2; P.moon = tq < 0.25 ? 0.5 : 0; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：双手合在胸前闭眼 → 月冠跳两下 → 睁眼张臂、背后满月炸开
      if (st === CHARGE) { pose(K.idle, K.pray, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = 0; P.hot = hb ? 1 : HOT; P.by = hb ? -1 : 0; P.moon = hb ? 0.25 : 0; }
      else if (st === CAST) { pose(K.pray, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 2; P.glow = 3; P.eyes = 2; P.hot = 1; P.moon = 1; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 2 - ((f12 >> 2) & 1) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; P.moon = hold ? Math.round((1 - tq) * 8) / 8 : 0; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [12, -47], SHF = [-9, -47], NECK = [3, -52];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, -26, P.lean); }
  function skirtXf() { B.reset(); B.move(0, P.by); B.rot(0, -26, P.lean * 0.35); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.5 - P.lean * 0.5); }
  const reach = (sh, t) => { const dx = t[0] - sh[0], dy = t[1] - sh[1], d = Math.hypot(dx, dy), m = 28.5; return d > m ? [sh[0] + dx / d * m, sh[1] + dy / d * m] : t; };
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.back = B.at(1, -43); L.core = B.at(2, -43);
    headXf(); L.eye = B.at(5, -64); L.mouth = B.at(5, -56); L.crown = B.at(3, -86); L.moonC = B.at(3, -76); L.head = B.at(3, -66); L.hairF = B.at(-8, -63); L.hairN = B.at(14, -61);
    L.hN = reach(L.shN, [P.nx, P.ny + P.by]); L.hF = reach(L.shF, [P.fx2, P.fy2 + P.by]);
    L.elN = B.ik(L.shN, L.hN, 14, 15, -1); L.elF = B.ik(L.shF, L.hF, 14, 15, 1);
    L.sd = [Math.cos(P.sa), Math.sin(P.sa)]; L.tip = [L.hN[0] + L.sd[0] * 27, L.hN[1] + L.sd[1] * 27]; L.butt = [L.hN[0] - L.sd[0] * 9, L.hN[1] - L.sd[1] * 9];
    L.orb = [L.tip[0] + L.sd[0] * 3, L.tip[1] + L.sd[1] * 3]; L.orb2 = [L.hF[0], L.hF[1] - 7];
    const f = P.moon ? L.moonC : P.orb || P.cres ? L.orb : L.core; P.fcx = f[0]; P.fcy = f[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const lerp = (a, b, q) => [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q];

  function star4(c, r, m, core) {   // 四角星芒：十字的四根光刺 + 亮心
    lnW(c[0] - r, c[1], c[0] + r, c[1], m); lnW(c[0], c[1] - r, c[0], c[1] + r, m);
    if (r >= 3) { const d = Math.max(1, Math.round(r * 0.35)); lnW(c[0] - d, c[1] - d, c[0] + d, c[1] + d, m); lnW(c[0] - d, c[1] + d, c[0] + d, c[1] - d, m); }
    px(c[0], c[1], core || STAR);
  }
  function moonDisc() {   // 背后的满月（满月蓄力 / 第二阶段）；第二阶段平时只剩一圈光环
    const c = L.moonC;
    if (P.moon > 0) {
      part(); const R = 5 + 15 * P.moon; dot(c[0], c[1], R + 1, MOON1); dot(c[0], c[1], R, MOON2); dot(c[0] - R * 0.25, c[1] - R * 0.25, R * 0.45, MOON3);
      for (const [dx, dy, r] of [[0.35, 0.2, 0.22], [-0.3, 0.4, 0.14], [0.1, -0.45, 0.12], [0.5, -0.1, 0.1]]) dot(c[0] + dx * R, c[1] + dy * R, Math.max(0.6, r * R), MOON1);   // 月面的环形山
    } else if (P.hot) {
      part(); const R = 21; for (let i = 0; i < 64; i++) { if (((i >> 1) + (P.rip >> 1)) % 5 === 0) continue; const a = i / 64 * 6.2832; px(c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R * 0.96, i % 8 === 0 ? MOON3 : MOON1); }
    }
  }
  // 薄翼：蜻蜓似的长叶片，根在背上；远侧那对暗、小一圈。翼脉亮，第二阶段翼脉发光
  function wing(side, up) {
    const far = side < 0, len = (up ? 56 : 36) * (far ? 0.88 : 1), W = (up ? 12 : 8) * (far ? 0.9 : 1);
    const t = up ? 0.72 + (1 - P.ws) * 0.6 + P.wf * 0.2 : -0.38 - (1 - P.ws) * 0.45 - P.wf * 0.12;
    const d = [side * Math.cos(t), -Math.sin(t)], n = [-d[1], d[0]], root = [L.back[0] + side * 2, L.back[1] + (up ? -1 : 3)];
    const A = [], Bk = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12, hw = W * Math.pow(Math.sin(Math.PI * Math.pow(u, 1.5)), 0.7) + (u < 0.1 ? 1 : 0), c = [root[0] + d[0] * len * u, root[1] + d[1] * len * u]; A.push([c[0] + n[0] * hw * 1.1, c[1] + n[1] * hw * 1.1]); Bk.push([c[0] - n[0] * hw * 0.9, c[1] - n[1] * hw * 0.9]); }
    part(); const m = far ? WINGD : WING; polyW(A.concat(Bk.reverse()), m);
    const vein = P.hot ? MOON1 : m, vt = P.hot ? undefined : 8, tipP = [root[0] + d[0] * len * 0.94, root[1] + d[1] * len * 0.94];
    lnW(root[0], root[1], tipP[0], tipP[1], vein, vt);
    for (const [u, s] of [[0.3, 1], [0.45, -1], [0.6, 1], [0.72, -1]]) { const c = [root[0] + d[0] * len * u, root[1] + d[1] * len * u], hw = W * Math.pow(Math.sin(Math.PI * Math.pow(u + 0.12, 1.5)), 0.7) * 0.85;
      lnW(c[0], c[1], c[0] + d[0] * len * 0.12 + n[0] * hw * s, c[1] + d[1] * len * 0.12 + n[1] * hw * s, vein, vt ? 7 : undefined); }
    lnW(A[2][0], A[2][1], A[9][0], A[9][1], m, 3);   // 翼面上一道折光（暗）
    const eg = far ? (P.hot ? MOON1 : m) : MOON1, egt = far && !P.hot ? 7 : undefined, rim = A.concat(Bk);   // 翼缘一圈月光：薄翼在暗处也认得出形
    for (let i = 2; i < rim.length - 1; i++) lnW(rim[i - 1][0], rim[i - 1][1], rim[i][0], rim[i][1], eg, egt);
    for (const u of [0.55, 0.8]) { const c = [root[0] + d[0] * len * u + n[0] * W * 0.3, root[1] + d[1] * len * u + n[1] * W * 0.3]; dot(c[0], c[1], W * 0.22, m, 3); }   // 翼上的眼斑（暗）
    px(tipP[0], tipP[1], P.hot || P.glow >= 3 ? MOON3 : MOON2);
  }
  function hairBack() {   // 头后的银发和两道垂到水面的长发（发梢跟着 hs 摆、施法时 hl 飘起来）
    part(); headXf(); B.ell(E, 3, -67, 13.5, 12.5, 0, HAIRD);
    const s = P.hs, l = P.hl;
    // 每边一大片波浪形的长发（扁的一片，不是管子）：越往下越往外飘、发梢往外卷；hl 让整片往后上方飘起来。里面用亮 / 暗的发丝线分出几绺
    const lock = (root, side, spread, ph) => { const pts = [root]; for (let i = 1; i <= 7; i++) { const u = i / 7, w = Math.sin(u * 5 + ph + s * 0.35) * (1.2 + u * 2);
        pts.push([root[0] + side * (spread * u + u * u * 6) + w - l * u * 14 - s * u * 1.2, root[1] + u * (56 - l * 14) - l * u * u * 8]); } return pts; };
    const ribbon = (pts, w0, w1) => { const Lf = [], Rt = []; for (let i = 0; i < pts.length; i++) { const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], dl = Math.hypot(dx, dy) || 1, w = w0 + (w1 - w0) * i / (pts.length - 1);
        Lf.push([pts[i][0] - dy / dl * w, pts[i][1] + dx / dl * w]); Rt.push([pts[i][0] + dy / dl * w, pts[i][1] - dx / dl * w]); } return { poly: Lf.concat(Rt.slice().reverse()), Lf, Rt }; };
    for (const [root, side, spread, ph, w0, m] of [[L.hairF, -1, 5, 0, 6.5, HAIRD], [L.hairN, 1, 5, 1.3, 6, HAIRD]]) {
      part(); B.reset(); const pts = lock(root, side, spread, ph), rb = ribbon(pts, w0, 1.5); polyW(rb.poly, m);
      for (const [k, t] of [[-0.55, 8], [-0.1, 3], [0.3, 7], [0.65, 3]]) for (let i = 2; i < pts.length; i++) { const q0 = lerp(pts[i - 1], k < 0 ? rb.Lf[i - 1] : rb.Rt[i - 1], Math.abs(k)), q1 = lerp(pts[i], k < 0 ? rb.Lf[i] : rb.Rt[i], Math.abs(k)); lnW(q0[0], q0[1], q1[0], q1[1], m, t); }
      const e = pts[7]; capW(e[0], e[1], e[0] + side * 3.5, e[1] - 2.5, 1.3, 0.5, m); }
  }
  // 月牙王冠：一弯比头还宽的月牙，下半截藏在头后，两只尖角朝上往里卷；自己发光（glow 0 = 熄成冷银）
  const CRES = (() => { const out = [], inn = []; const N = 24;
    for (let i = 0; i <= N; i++) { const u = i / N, a = (215 - 250 * u) * Math.PI / 180, o = [3 + 21 * Math.cos(a), -86 + 17 * Math.sin(a)], th = 6.2 * Math.pow(Math.sin(Math.PI * u), 0.8), c = [3, -86];
      const dl = Math.hypot(o[0] - c[0], o[1] - c[1]); out.push(o); inn.push([o[0] - (o[0] - c[0]) / dl * th, o[1] - (o[1] - c[1]) / dl * th]); }
    return { out, inn }; })();
  function crown() {
    part(); headXf(); const g = P.glow, body = g >= 3 ? MOON3 : g >= 2 ? MOON2 : g >= 1 ? MOON1 : SILV;
    B.poly(E, CRES.out.concat(CRES.inn.slice().reverse()), body);
    const edge = g >= 3 ? MOON2 : g >= 1 ? MOON3 : SILV, et = g ? undefined : 8;
    for (let i = 2; i < CRES.inn.length - 3; i++) B.ln(E, CRES.inn[i][0], CRES.inn[i][1], CRES.inn[i + 1][0], CRES.inn[i + 1][1], edge, et);   // 内弧的亮边
    if (g >= 1) { B.px(E, CRES.out[0][0], CRES.out[0][1], MOON3); B.px(E, CRES.out[24][0], CRES.out[24][1], MOON3);
      const gh = B.bez(CRES.out[0], [3, -100], CRES.out[24], 16); for (let i = 2; i < 15; i += 2) B.px(E, gh[i][0], gh[i][1], i === 8 && g >= 3 ? MOON2 : MOON1); }   // 月牙没亮的那半边：一圈虚点，一看就是月亮
    // 月牙怀里悬着一颗星
    const c = B.at(3, -85), tw = g >= 3 ? 3 : 2; if (g) { const m = (P.rip >> 1) & 1 && g < 3 ? MOON2 : STAR; star4(c, tw, m, STAR); }
  }
  function arm(side) {
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, sk = far ? SKIND : SKIN, gz = far ? GAUZED : GAUZE, gw = far ? GOWND : GOWN;
    // 垂下来的薄纱长袖（先画，在前臂后面）
    const mid = lerp(el, h, 0.7), sw = P.hs * 0.8 - P.hl * 4, tail = [el[0] + sw * 1.6 + side * 2, el[1] + 22 - P.hl * 6];
    part(); polyW([[el[0], el[1] - 1.5], mid, [mid[0] + side + sw, mid[1] + 9], tail, [el[0] - side * 2.5 + sw * 0.6, el[1] + 10]], gz);
    lnW(el[0], el[1] + 2, tail[0] - side, tail[1] - 3, gz, 3); lnW(mid[0] + side + sw, mid[1] + 9, tail[0], tail[1], far ? gz : MOON1, far ? 7 : undefined);   // 袖口一道月光边
    part(); capW(sh[0], sh[1], el[0], el[1], 3.2, 2.5, gw); lnW(sh[0], sh[1] + 1, el[0], el[1] + 1, gw, 3);
    part(); capW(el[0], el[1], h[0], h[1], 2.3, 1.8, sk);
    const cf = lerp(el, h, 0.82); dot(cf[0], cf[1], 2.1, SILV); px(cf[0], cf[1] - 1, SILV, 8);                  // 银手镯
    part(); dot(h[0], h[1], 2.3, sk); const dir = Math.atan2(h[1] - el[1], h[0] - el[0]);
    const hold = !far && P.st !== DEATH;
    for (let i = 0; i < 4; i++) { const a = dir + (i - 1.5) * (hold ? 0.3 : 0.38), r0 = [h[0] + Math.cos(a) * 1.8, h[1] + Math.sin(a) * 1.8], ln = hold ? 2 : 4.5, tp = [r0[0] + Math.cos(a + 0.25 * side) * ln, r0[1] + Math.sin(a + 0.25 * side) * ln];
      capW(r0[0], r0[1], tp[0], tp[1], 0.8, 0.5, sk, i === 0 ? 7 : 5); }
  }
  function sceptre() {
    const d = L.sd, t = L.tip, b = L.butt, h = L.hN;
    part(); capW(b[0], b[1], t[0], t[1], 1.3, 1.1, SILV); lnW(b[0] - d[1] * 0.6, b[1] + d[0] * 0.6, t[0] - d[1] * 0.6, t[1] + d[0] * 0.6, SILV, 8);
    dot(b[0], b[1], 1.8, SILV); const k1 = [h[0] + d[0] * 17, h[1] + d[1] * 17]; dot(k1[0], k1[1], 1.6, SILV, 7);
    // 杖头：一弯开口朝前的小月牙，怀里一颗星
    part(); const c = L.orb, a0 = Math.atan2(d[1], d[0]), R = 4.6, g = P.glow;
    for (let i = 0; i <= 14; i++) { const u = i / 14, a = a0 + 0.55 + u * (6.2832 - 1.1), th = 0.5 + 1.1 * Math.sin(Math.PI * u); dot(c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R, th, g >= 2 ? MOON2 : g ? MOON1 : SILV); }
    const tr = 1 + (P.tip || 0) + (P.orb ? P.orb : 0); star4(c, Math.min(7, tr + 1), P.tip >= 2 || P.orb ? MOON3 : MOON2, STAR);
  }
  function blade() {   // 月牙斩的月刃：绕着杖头长出一弯越来越大的月牙
    if (!P.cres) return; part(); const c = L.orb, d = L.sd, a0 = Math.atan2(d[1], d[0]), R = 5 + P.cres * 2.2;
    for (let i = 0; i <= 20; i++) { const u = i / 20, a = a0 - 1.9 + u * 3.8, th = 0.5 + (0.8 + P.cres * 0.45) * Math.sin(Math.PI * u), p = [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R];
      dot(p[0], p[1], th + 0.6, MOON1); }
    for (let i = 0; i <= 20; i++) { const u = i / 20, a = a0 - 1.9 + u * 3.8, th = 0.3 + (0.4 + P.cres * 0.3) * Math.sin(Math.PI * u), p = [c[0] + Math.cos(a) * R, c[1] + Math.sin(a) * R];
      dot(p[0], p[1], th, P.cres >= 3 ? MOON3 : MOON2); }
  }
  function skirt() {
    part(); skirtXf(); const s = P.hs;
    B.poly(E, [[-10, -31], [-16, -18], [-23 - s, -6], [-31 - s * 1.5, 4], [-22, 4], [-15, -8], [-9, -22]], GOWND);   // 两侧飘的外裙（更暗），边上缀着月光点
    B.poly(E, [[10, -31], [17, -18], [25 + s, -6], [33 + s * 1.5, 4], [24, 4], [16, -8], [10, -22]], GOWND);
    for (let i = 0; i < 6; i++) { const q = i / 5; B.px(E, -16 - (15 + s * 1.5) * q, -18 + 22 * q, (i + (P.rip >> 1)) % 3 ? MOON1 : MOON2); B.px(E, 17 + (16 + s * 1.5) * q, -18 + 22 * q, (i + (P.rip >> 1)) % 3 ? MOON1 : MOON2); }
    part(); skirtXf(); B.poly(E, [[-8, -32], [9, -32], [14, -20], [21, -9], [27, 4], [-24, 4], [-17, -9], [-12, -20]], GOWN);
    for (const [x0, x1, t] of [[-3, -12, 3], [4, 10, 3], [10, 20, 3], [-8, -19, 3], [1, 1, 7], [7, 15, 7]]) B.ln(E, x0, -29, x1, 3, GOWN, t);   // 褶
    const sm = P.hot ? MOON2 : MOON1;
    for (const [x, y] of [[-6, -20], [5, -16], [-12, -8], [13, -6], [-2, -4], [19, 0], [-17, 1], [8, -24]]) { B.px(E, x, y, sm); if (P.hot && ((x + P.rip) & 3) === 0) { B.px(E, x + 1, y, MOON1); B.px(E, x - 1, y, MOON1); } }   // 裙上绣的星点
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-7, -30], [8, -30], [10, -38], [13, -45], [13, -48], [-10, -48], [-10, -45], [-8, -38]], GOWN); B.ell(E, 1, -41, 9.5, 5, 0, GOWN);
    B.ell(E, -2, -42, 4, 2.6, 0.2, GOWN, 7); B.ell(E, 7, -42, 4, 2.6, -0.2, GOWN, 6); B.ln(E, 0, -36, 1, -31, GOWN, 3); B.ln(E, 8, -36, 7, -31, GOWN, 3);
    part(); torsoXf(); B.poly(E, [[-9, -48], [13, -48], [9, -45], [3, -42], [-4, -45]], SKIN);                     // 领口露出的锁骨
    B.ln(E, -6, -47, -1, -46, SKIN, 3); B.ln(E, 5, -46, 10, -47, SKIN, 3);
    part(); torsoXf(); B.ln(E, -9, -48, 3, -42, SILV, 7); B.ln(E, 3, -42, 13, -48, SILV, 7);                      // 领口的银边
    B.ln(E, -7, -31, 8, -31, SILV); B.ln(E, -7, -30, 8, -30, SILV, 3);                                                // 银腰带
    for (const [x, y] of [[-9, -47], [12, -47]]) { B.ell(E, x, y, 2.6, 2, 0, SILV); }                                  // 肩上的银扣
    B.ell(E, 3, -41, 1.6, 1.8, 0, P.glow >= 2 ? MOON2 : MOON1); B.px(E, 3, -42, MOON3); B.px(E, 0.5, -30.5, MOON2); B.px(E, 1.5, -30.5, MOON2);   // 胸前的月坠、腰扣
  }
  const row = (x0, x1, y, m, t) => { for (let x = x0; x <= x1; x++) B.px(E, x, y, m, t); };   // 一排整格（立绘两倍时也是整格，线不会变细）
  function head() {   // 大头：瓷白的脸、尖下巴，银蓝的光眼（描黑的上睫毛往外挑），细眉压着、嘴抿成一条线
    part(); headXf(); B.cap(E, 2, -46, 3, -55, 3.4, 3, SKIN); B.ln(E, 1, -49, 2, -54, SKIN, 3);                     // 脖子
    part(); headXf(); const J = P.jaw;
    B.ell(E, 3, -66, 10.5, 10, 0, SKIN); B.poly(E, [[-7, -66], [14, -66], [13.5, -60], [11.5, -56], [8.5, -53], [5.5, -52.3], [2, -54], [-2, -57], [-6, -61]], SKIN);   // 颅、脸（下巴略偏右）
    row(12, 12, -59, SKIN, 3); row(11, 11, -57, SKIN, 3); row(-4, -4, -60, SKIN, 4);                                   // 腮的暗
    row(10, 12, -61, SKIN, 7); row(-3, -2, -61, SKIN, 6);                                                              // 颧骨的光
    const eyeM = P.eyes >= 2 ? MOON3 : MOON2;
    if (P.eyes) {
      row(-3, 1, -66, SKIN, 10); row(-4, -4, -67, SKIN, 10); row(7, 11, -66, SKIN, 10); row(12, 12, -67, SKIN, 10);   // 上睫毛
      row(-3, 1, -65, MOON1); row(-2, 0, -65, eyeM); row(7, 11, -65, MOON1); row(8, 10, -65, eyeM); B.px(E, -1, -65, MOON3); B.px(E, 9, -65, MOON3);
      row(-2, 0, -64, MOON1); row(8, 10, -64, MOON1); B.px(E, -1, -64, MOON2); B.px(E, 9, -64, MOON2);
      row(-1, 0, -63, SKIN, 3); row(8, 10, -63, SKIN, 3); row(-2, 0, -67, SKIN, 4); row(8, 10, -67, SKIN, 4);        // 下眼睑、眼窝
      if (P.eyes >= 2) { B.px(E, -5, -65, MOON2); B.px(E, 13, -65, MOON2); B.px(E, -6, -66, MOON1); B.px(E, 14, -66, MOON1); }   // 眼尾拖出来的冷光
    } else { row(-3, 1, -65, SKIN, 10); row(7, 11, -65, SKIN, 10); row(-2, 0, -64, SKIN, 3); row(8, 10, -64, SKIN, 3); }   // 闭眼
    row(-3, -2, -68, HAIR, 4); row(-1, 1, -69, HAIR, 4); row(7, 9, -69, HAIR, 4); row(10, 12, -68, HAIR, 4);          // 细眉（往眉心压）
    row(5, 5, -62, SKIN, 4); row(5, 5, -61, SKIN, 3); row(4, 5, -59, SKIN, 3); row(6, 6, -60, SKIN, 7);               // 鼻
    if (J) { row(4, 7, -57, SKIN, 10); row(4, 7, -56, J > 1 ? MOON1 : SKIN, J > 1 ? undefined : 10); if (J > 1) row(5, 6, -55, SKIN, 10); }
    else { row(4, 7, -56, SKIN, 3); row(5, 6, -55, SKIN, 4); }                                                        // 抿着的嘴
  }
  function hairFront() {   // 刘海从中分往两边扫，两缕侧发垂过肩
    part(); headXf();
    B.poly(E, [[-8.5, -64], [-8.5, -71], [-5, -76], [1, -78], [3, -77], [1, -74], [-2, -71.5], [-5, -70], [-7, -66]], HAIR);
    B.poly(E, [[3, -77], [5, -78], [10, -77], [14, -72.5], [14.5, -64], [12.5, -68], [10, -70.5], [6, -71.5], [4, -74]], HAIR);
    B.ln(E, -6, -73, -1, -77, HAIR, 8); B.ln(E, 6, -77, 11, -75, HAIR, 8); B.ln(E, 12, -71, 14, -66, HAIR, 3); B.ln(E, -7, -70, -8, -65, HAIR, 3);
    const s = P.hs, l = P.hl; B.reset();
    const fa = (() => { headXf(); return [B.at(-7, -68), B.at(-9, -60)]; })(), na = (() => { headXf(); return [B.at(14, -68), B.at(15, -60)]; })();
    for (const [a, sd] of [[fa, -1], [na, 1]]) { const p0 = a[0], p1 = a[1], p2 = [p1[0] + sd * 0.5 - l * 3, -49 + P.by - l * 3], p3 = [p1[0] + sd * 1.5 + s * 0.6 - l * 6, -38 + P.by - l * 5], p4 = [p1[0] + sd * 3 + s - l * 8, -30 + P.by - l * 6];
      const pts = [p0, p1, p2, p3, p4], Lf = [], Rt = []; pts.forEach((p, i) => { const w = 2.6 - i * 0.5; Lf.push([p[0] - w, p[1]]); Rt.push([p[0] + w, p[1]]); });
      part(); polyW(Lf.concat(Rt.reverse()), HAIR); lnW(p1[0] - sd, p1[1], p3[0] - sd, p3[1], HAIR, 8); lnW(p1[0] + sd, p1[1] + 2, p4[0], p4[1], HAIR, 3); }
    if (P.hot) { headXf(); for (const [x, y, k] of [[-10, -70, 0], [15, -69, 3], [-6, -76, 5], [11, -76, 2]]) if (((P.rip >> 1) + k) % 4 < 2) { const c = B.at(x, y); px(c[0], c[1], STAR); } }   // 第二阶段：发间闪着的星
  }
  function ears() {   // 长长的精灵耳，从发里横着伸出去、尖往上翘
    part(); headXf(); B.poly(E, [[-6, -66], [-7, -60], [-11, -62], [-21, -75], [-12, -68]], SKIN); B.ln(E, -8, -63, -18, -72, SKIN, 3); B.ln(E, -9, -66, -19, -74, SKIN, 7);
    part(); headXf(); B.poly(E, [[13, -66], [14, -60], [18, -62], [27, -74], [19, -68]], SKIN); B.ln(E, 15, -63, 24, -71, SKIN, 3); B.ln(E, 16, -66, 25, -73, SKIN, 7);
    B.px(E, 16, -61, SILV, 8); B.px(E, -9, -61, SILV, 7);   // 耳垂上的小银坠
  }
  function circlet() {   // 额上的银冠带（压在刘海上），正中一颗星、下面垂一滴月光
    part(); headXf(); B.ln(E, -8, -71, -3, -73, SILV, 7); B.ln(E, -3, -73, 3, -74, SILV, 8); B.ln(E, 3, -74, 9, -73, SILV, 8); B.ln(E, 9, -73, 15, -71, SILV, 7);
    row(-8, -3, -72, SILV, 3); row(9, 14, -72, SILV, 3);
    row(2, 4, -74, MOON2); B.px(E, 3, -75, STAR); B.px(E, 3, -74, STAR); B.px(E, 3, -73, STAR); B.px(E, 3, -71, P.glow >= 2 ? MOON3 : MOON2);
  }
  function orbStar() {   // 星雨：杖头聚起来的星；待机：指尖上一颗小星
    if (P.orb) { part(); const c = L.orb, r = 2 + P.orb * 1.4; dot(c[0], c[1], r * 0.6 + 1, MOON1); dot(c[0], c[1], r * 0.45, MOON3); star4(c, Math.round(r + 2), MOON3, STAR); }
    if (P.orb2) { part(); star4(L.orb2, P.orb2 + 1, MOON3, STAR); }
  }
  function pool() {   // 池面的一圈圈涟漪（在身体前面）
    part(); B.reset(); const k = P.rip % 8, hot = P.hot;
    for (const [rx, ry, m, ph] of [[16 + k, 2.2, hot ? MOON3 : MOON2, 0], [26 + ((k + 4) % 8) * 1.5, 3.2, MOON1, 1]]) for (let i = 0; i < 48; i++) { if ((i + ph * 3) % 6 >= 4) continue; const a = i / 48 * 6.2832, y = 2 + Math.sin(a) * ry; if (Math.sin(a) < -0.2) continue; px(2 + Math.cos(a) * rx, y, m); }
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    moonDisc(); wing(-1, 1); wing(-1, 0); wing(1, 1); wing(1, 0); hairBack(); crown(); arm(-1); skirt(); torso();
    head(); hairFront(); ears(); circlet(); sceptre(); arm(1); blade(); orbStar(); pool();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const X = (p) => p[0] * z + spr.ox, Y = (p) => p[1] * z + spr.oy;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = X(L.crown); RIM.ry = Y(L.crown); RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = X(L.crown); LIGHTS[0].y = Y(L.crown); LIGHTS[0].r = (P.glow >= 3 ? 22 : P.glow >= 2 ? 16 : P.glow ? 12 : 0) * z;
    LIGHTS[1].x = spr.ox + 2 * z; LIGHTS[1].y = spr.oy + 12 * z; LIGHTS[1].r = 54 * z; LIGHTS[1].k = P.hot ? 0.5 : 0.36;                    // 月池从下面照上来
    const src = P.moon ? L.moonC : L.orb, sr = P.moon ? 10 + 26 * P.moon : P.orb ? 8 + P.orb * 4 : P.cres ? 8 + P.cres * 4 : P.tip ? 6 + P.tip * 2 : 5;
    LIGHTS[2].x = X(src); LIGHTS[2].y = Y(src); LIGHTS[2].r = sr * z;
    LIGHTS[3].x = X(L.eye); LIGHTS[3].y = Y(L.eye); LIGHTS[3].r = (P.eyes >= 2 ? 8 : P.eyes ? 5 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面、微微低头看过来，权杖立着、一只手抬起托着一颗星；月冠、眼、光环全亮（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.gaze, 1); P.hd = 0.06; P.jaw = 0; P.eyes = 2; P.glow = 3; P.hot = 1; P.ws = 1; P.wf = 0.3; P.by = 0; P.orb2 = 2; P.hs = 1; P.hl = 0.2; P.rip = 2;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(4, -72); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 33 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连月牙冠、尖耳）

  // ───── 特效（舞台坐标；游戏里只画身边的，落到部队头上的星由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y, R_M = FXI.frost;
  let emT = 0;
  function starShot(c, n, big) {   // 星往天上飞：一道冲天光柱 + 往上散的星
    fx.pillar(sx(c[0]), 0, sy(c[1]), big ? 6 : 4, 'frost', big ? 0.45 : 0.3, 2);
    for (let i = 0; i < n; i++) spawnX(K_PHYS, sx(c[0] + (Math.random() - 0.5) * 8), sy(c[1]), (Math.random() - 0.5) * 140, -160 - Math.random() * 180, 0.6 + Math.random() * 0.4, i % 3 ? R_M : FXI.holy, { g: 60, floor: HY + 8 });
    fx.cross(sx(c[0]), sy(c[1]), big ? 18 : 12, 'frost', 0.3, 2);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'crescent') { const c = L.orb, sh = L.shN; fx.slash(sx(sh[0]), sy(sh[1]), 40, -0.4, 2.4, 'frost', 0.3, 4, 2); fx.beam(sx(c[0]), sy(c[1]), sx(c[0] + 90), sy(c[1] + 24), 5, 'frost', 0.3, 2);
        ring(sx(c[0]), sy(c[1]), 0, R_M); burst(sx(c[0]), sy(c[1]), 22, 60, 170, 0.3, 0.6, R_M, 10); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'queenSlash', w: 1 }); sfx('swing', { kind: 'slash', w: 1 }); }
      else if (MV === 'starfall' || MV === 'starfall2') {
        const two = MV === 'starfall2';
        if (two) { const c = L.moonC; ring(sx(c[0]), sy(c[1]), 1, R_M); ring(sx(c[0]), sy(c[1]), 0, FXI.holy); starShot(c, 36, 1); flash(0.12); shake(0.4, 3); sfx('boss', { k: 'queenMoon', w: 1 }); }
        else { starShot(L.orb, 22, 0); ring(sx(L.orb[0]), sy(L.orb[1]), 0, R_M); shake(0.3, 3); flash(0.07); }
        sfx('boss', { k: 'queenChime', w: 1 }); sfx('shoot', { proj: 'magic' });
      } else if (MV === 'poke') { const c = L.orb; fx.beam(sx(c[0] - 20), sy(c[1]), sx(c[0] + 30), sy(c[1] + 2), 3, 'frost', 0.2, 2); fx.cross(sx(c[0]), sy(c[1]), 12, 'frost', 0.25, 2); burst(sx(c[0]), sy(c[1]), 14, 50, 140, 0.25, 0.5, R_M, 10); shake(0.25, 3); flash(0.05); sfx('swing', { kind: 'thrust', w: 1 }); sfx('boss', { k: 'queenChime', w: 0.6 }); sfx('hit', { mat: 'metal', w: 0.8 }); }
      else if (MV === 'rise' || MV === 'p2') {
        const c = L.crown, m = L.moonC; ring(sx(c[0]), sy(c[1]), 1, R_M); ring(sx(m[0]), sy(m[1]), 1, FXI.holy); flash(0.12); shake(0.4, 3); fx.cross(sx(c[0]), sy(c[1]), 20, 'frost', 0.4, 2);
        for (let i = 0; i < 36; i++) { const a = -Math.PI * Math.random(); spawnX(K_PHYS, sx(m[0]), sy(m[1]), Math.cos(a) * (60 + Math.random() * 120), Math.sin(a) * (60 + Math.random() * 120), 0.8 + Math.random() * 0.5, i & 1 ? R_M : FXI.holy, { g: 120, floor: HY + 6 }); }
        if (MV === 'rise') { fx.wave(sx(2), HY, 1, 40, 5, 'water', 0.5, 2); fx.wave(sx(2), HY, -1, 40, 5, 'water', 0.5, 2); }
        sfx('boss', { k: 'queenSing', w: 1 }); sfx('impact', { pal: 'frost', w: 1 });
      }
    }
    if (s === CHARGE) {
      if (MV === 'crescent' || MV === 'starfall' || MV === 'poke') sfx('boss', { k: 'queenGather', w: MV === 'poke' ? 0.5 : 0.9, dur: E.DUR[CHARGE] });
      else if (MV === 'starfall2') sfx('boss', { k: 'queenMoonRise', w: 1, dur: E.DUR[CHARGE] });
      else if (MV === 'rise') sfx('boss', { k: 'queenRipple', w: 1 });
      else if (MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 3 / 12) { const c = L.orb; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 34, 0.2, 2.2, 'frost', 0.22, 3, 2); burst(sx(c[0]), sy(c[1]), 14, 50, 140, 0.25, 0.5, R_M, 10); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'staff', w: 1 }); sfx('hit', { mat: 'magic', w: 1 }); }
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'queenChime', w: 0.4 });
    if (s === RECOVER && t === 0.25 && MV === 'starfall2') { const c = L.moonC; ring(sx(c[0]), sy(c[1]), 0, R_M); }   // 满月的余光：第三道环
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'queenDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { const c = L.crown; burst(sx(c[0]), sy(c[1]), 30, 50, 160, 0.4, 0.8, R_M, 20); fx.cross(sx(c[0]), sy(c[1]), 16, 'frost', 0.3, 2); shake(0.2, 2); sfx('fall', { w: 0.7 }); sfx('boss', { k: 'queenChime', w: 0.5 }); }
    if (s === DEATH && t === INCOMING + 1.9) { const x = sx(2); ring(x, HY - 2, 1, FXI.water); fx.wave(x, HY, 1, 44, 6, 'water', 0.6, 2); fx.wave(x, HY, -1, 44, 6, 'water', 0.6, 2);
      for (let i = 0; i < 44; i++) spawn(K_RISE, sx(-30 + Math.random() * 64), sy(-4 - Math.random() * 60), 0, -14 - Math.random() * 22, 0.9 + Math.random() * 0.9, i & 1 ? R_M : FXI.holy); shake(0.3, 2); sfx('boss', { k: 'sink', w: 0.6 }); sfx('boss', { k: 'fade', w: 1 }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [0.25], [INCOMING], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    emT += dt;
    if (emT > (P.hot ? 0.06 : 0.13)) { emT = 0;   // 身边一直往上飘的月光点；第二阶段更密，还有从月冠上掉的星屑
      spawn(K_EMBER, sx(-30 + Math.random() * 64), sy(-4 - Math.random() * 60), (Math.random() - 0.5) * 8, -8 - Math.random() * 10, 0.8 + Math.random() * 0.6, Math.random() < 0.25 ? FXI.holy : R_M);
      if (P.hot && P.glow) { const c = L.crown; spawn(K_EMBER, sx(c[0] - 18 + Math.random() * 36), sy(c[1] - 4 + Math.random() * 6), 0, 6 + Math.random() * 6, 0.7, R_M); } }
    if (state === CHARGE && (P.orb || P.cres) && Math.random() < 0.65) { const c = L.orb, a = Math.random() * 6.2832, r = 10 + Math.random() * 12; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, R_M, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && P.moon && Math.random() < 0.8) { const c = L.moonC, a = Math.random() * 6.2832, r = 20 + Math.random() * 16; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.3 + Math.random() * 0.2), 0, 9, Math.random() < 0.4 ? FXI.holy : R_M, { a, r, w: 6, tx: sx(c[0]), ty: sy(c[1]), orbitR: 4 }); }
    if (state === CHARGE && MV === 'poke' && P.tip && Math.random() < 0.4) { const c = L.orb; spawn(K_EMBER, sx(c[0] + (Math.random() - 0.5) * 8), sy(c[1]), 0, -10, 0.4, R_M); }
    if ((state === CHARGE && MV === 'rise') || state === MOVE) { if (Math.random() < 0.5) spawnX(K_PHYS, sx(-24 + Math.random() * 52), sy(-1), (Math.random() - 0.5) * 50, -40 - Math.random() * 60, 0.7, FXI.water, { g: 240, floor: HY + 4 }); }   // 浮上来时带起的水珠
    if (state === IDLE && P.orb2 && Math.random() < 0.3) spawn(K_EMBER, sx(L.orb2[0] + (Math.random() - 0.5) * 6), sy(L.orb2[1] - 2), 0, -6, 0.5, FXI.holy);
  }
  function fxReset() { emT = 0; }
  function fxBack(f12) { const x0 = sx(-46), x1 = sx(46); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { if (((x + (f12 >> 1)) % 3) === 0) E.put(x, HY + 1, FXR[R_M][P.hot ? 2 : 3]); if (P.hot && ((x - f12) % 7) === 0) E.put(x, HY + 2, FXR[R_M][1]); } }   // 池面的一线月光
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'crescent'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    queenChime: (s, t, w, p) => { for (let i = 0; i < 4; i++) s.bell(t + i * 0.06, 88 + [0, 4, 7, 12][i], 0.9, 0.04 + 0.03 * w, { pan: p, rev: 0.6 }); s.nz(t, 0.25, 'highpass', 6000, 0.7, 0.03 * w, { pan: p }); },
    queenGather: (s, t, w, p) => { s.riser(t, t + 1.0, 800, 5200, 0.04 + 0.03 * w, { pan: p }); s.choir(t, [76, 83], 1.1, 0.03 + 0.03 * w, { pan: p, a: 0.5 }); for (let i = 0; i < 5; i++) s.bell(t + 0.15 + i * 0.17, 91 + i * 2, 0.5, 0.025, { pan: p }); },
    queenSlash: (s, t, w, p) => { s.whoosh(t, 0.35, 3000, 600, 0.12 * w, { pan: p }); s.ring(t + 0.02, 1320, 0.7, 0.05 + 0.04 * w, { pan: p, rev: 0.5 }); s.bell(t, 81, 1.0, 0.05, { pan: p }); },
    queenMoonRise: (s, t, w, p) => { s.choir(t, [64, 71, 76], 1.5, 0.05 + 0.03 * w, { pan: p, a: 0.8 }); s.riser(t, t + 1.4, 300, 3600, 0.05 * w, { pan: p }); s.tone(t, 'sine', 330, 1.5, 0.03, { to: 660, pan: p, rev: 0.6 }); },
    queenMoon: (s, t, w, p) => { s.choir(t, [64, 71, 76, 83], 1.8, 0.06 + 0.04 * w, { pan: p, a: 0.05 }); s.ring(t, 660, 2.4, 0.08 * w, { pan: p, rev: 0.7 }); s.cymbal(t, 1.4, 0.05 * w, { pan: p }); for (let i = 0; i < 6; i++) s.bell(t + 0.08 * i, 84 + [0, 7, 12, 16, 19, 24][i], 1.2, 0.035, { pan: p }); },
    queenSing: (s, t, w, p) => { s.choir(t, [69, 76, 81], 1.6, 0.07 + 0.04 * w, { pan: p, a: 0.08 }); s.tone(t, 'sine', 880, 1.4, 0.04 + 0.02 * w, { vib: [6, 14, 0.2], pan: p, rev: 0.7 }); s.ring(t, 440, 2.0, 0.06, { pan: p, rev: 0.7 }); },
    queenRipple: (s, t, w, p) => { for (let i = 0; i < 6; i++) s.blip(t + i * 0.3 + Math.random() * 0.08, 500 + Math.random() * 500, 0.03 + 0.02 * w, { pan: p }); s.nz(t, 2.0, 'bandpass', 700, 1.2, 0.03 * w, { pan: p, to: 1400 }); s.choir(t + 1.2, [69, 76], 1.0, 0.03 * w, { pan: p }); },
    queenDie: (s, t, w, p) => { s.choir(t, [76, 69, 64], 2.2, 0.06 + 0.04 * w, { pan: p, a: 0.1 }); s.tone(t, 'sine', 880, 1.8, 0.05 + 0.03 * w, { to: 220, vib: [5, 20, 0.2], pan: p, rev: 0.8 }); for (let i = 0; i < 5; i++) s.bell(t + 0.5 + i * 0.22, 88 - i * 3, 0.9, 0.03, { pan: p }); },
  };

  return {
    name: '精灵女王', HX, R_EL: FXI.frost, DUR, hero, P, GLOW_MATS: [MOON1, MOON2, MOON3, STAR], HIT_POINT: [0, -40], EVENTS, MAX_H: 115, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'frost', style: 'spiral', w: 1, hover: 1 }, VOICES,
    MOVES: ['crescent', 'starfall', 'starfall2', 'poke', 'rise', 'p2'], MOVE_NAMES: { crescent: '月牙斩', starfall: '星雨', starfall2: '满月（第二阶段）', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.5, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.3, 0.6, 1.0], 'crescent'], [CAST, [0], 'crescent'], [RECOVER, [0.25], 'crescent'],
      [CHARGE, [0.3, 0.8, 1.3], 'starfall'], [CAST, [0], 'starfall'], [CHARGE, [0.4, 0.9, 1.4], 'starfall2'], [CAST, [0], 'starfall2'], [RECOVER, [0.3], 'starfall2'],
      [CHARGE, [0.7], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 2 / 12, 1.6], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.36], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.3, 2.6]]],
    SINK: 32, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
