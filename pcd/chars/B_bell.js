// 守钟人（最终首领，第一章「雾中小镇」的钟楼）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「钟楼里的巨人，背上压着一口大钟；背着大钟，头缠绷带」；废墟（碎石、雾）；钟锤（砸离竞技场最近的一个）、
// 午夜钟声（每 10 秒全场每人受同样的固定伤害）→ 第二阶段 落钟（大钟砸在人最多的地方）。
// 设定卡 ——
//   剪影：从碎石堆里升起的佝偻上半身（原点 = 废墟地面），一口比身子还宽的青铜大钟压在背上、钟口朝前斜扣，像一顶兜帽罩住头；
//         钟沿下面是一张缠满绷带的惨白的脸，绷带缝里两只圣光的眼睛（识别点：大钟 + 钟沿下的两点光）。
//   武器：从钟里拔出来的钟舌（铁杆 + 青铜锤头），平时拖在地上。钟身侧面刻着一圈十二刻度的钟面，午夜钟声蓄力时刻度一格格亮到十二点。
//   主色：深藏青的旧袍、暗青铜（带铜绿）、惨白的皮和米黄绷带；光源是圣光金（眼睛、钟面、钟舌、第二阶段钟上的裂缝）。
//   招式（setMove）：bellHammer 钟锤 · midnight 午夜钟声 · bellDrop 落钟 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 裂缝常亮。
//     钟锤：钟舌高举过头、锤头聚光 → 砸地（圣光地浪、碎石、裂纹）。午夜钟声：钟舌甩到身前外侧、钟面刻度亮到十二 → 反手敲自己背上的钟（两道大环、钟身摇晃）。
//     落钟：双手捧起一口虚影小钟、越聚越大 → 往天上一抛（游戏画落下来的那口钟）。重击：钟舌过肩 → 往前捅。
//     升起：扒着碎石爬出来 → 挺直、仰头、钟自己响。第二阶段：捂脸 → 钟被震两下、裂开 → 绷带崩开、仰天长啸，裂缝里透出圣光。
//     死亡：哀嚎 → 瘫软、钟舌落地 → 背上的钟摆正、整口扣下来把他罩住，化成灰。
PCD.define('B_bell', (E) => {
  const { defDeep, defMat, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, DRAMP = E.DRAMP;

  // ───── 材质（11 级，暗 → 亮）：主体压暗，圣光才亮得出来 ─────
  // 色板有上限：青铜用共用的 brass、袍子用 stormcoat、绷带用 ivory、铁和碎石用 bladesteel、钟里的黑用 obsidian；只有惨白的皮和铜绿是自己的
  const R_SKIN = ['#0c0a0e', '#221d24', '#3a3238', '#554a50', '#72666a', '#908486', '#aca2a2', '#c8c0bc', '#e6e0da'];
  const R_VERD = ['#060c0c', '#102020', '#1a3432', '#264a46', '#34625a', '#46786c', '#5c9282', '#7aae9c'];
  const BRZ = defDeep('brass', { depth: 10, dark: 3, amb: 0.06 }), BRZD = defDeep('brass', { depth: 4, dark: 4, amb: 0.06 }), VERD = defDeep(R_VERD, { depth: 8, amb: 0.12 });
  const ROBE = defDeep('stormcoat', { depth: 8, dark: 2, amb: 0.1 }), ROBED = defDeep('stormcoat', { depth: 6, dark: 4, amb: 0.08 });
  const SKIN = defDeep(R_SKIN, { depth: 5, amb: 0.14 }), SKIND = defDeep(R_SKIN, { depth: 4, dark: 2, amb: 0.1 });
  const BAND = defDeep('ivory', { depth: 6, amb: 0.2 }), BANDD = defDeep('ivory', { depth: 4, dark: 2, amb: 0.14 });
  const STOLE = defDeep('hellhide', { depth: 3, dark: 3, amb: 0.1 }), STONE = defDeep('bladesteel', { depth: 5, dark: 3, amb: 0.1 }), IRON = defDeep('bladesteel', { depth: 3, dark: 3, amb: 0.1 }), VOIDM = defDeep('obsidian', { depth: 6, dark: 4, amb: 0.05 });
  const HOL1 = defMat(ramp(['#3a2606', '#7a5610', '#d09a26', '#eec048']), 1, 1), HOL2 = defMat(ramp(['#7a5610', '#d09a26', '#ffe070', '#fff2b0']), 1, 1), HOL3 = defMat(ramp(['#d09a26', '#ffe070', '#fffbe4', '#ffffff']), 1, 1);
  const GHOST = defMat(ramp(['#4a3a18', '#a88a3a', '#f0d890', '#fff6d0']), 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { bellHammer: { 3: 1.2, 4: 0.5, 5: 0.7 }, midnight: { 3: 1.6, 4: 0.5, 5: 0.8 }, bellDrop: { 3: 1.5, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'bellHammer', HOT = 0;   // HOT：第二阶段，钟上的裂缝和钟面常亮
  const HOLY = ramp(['#fffbe4', '#ffe070', '#d09a26']), FOG = [DRAMP.stormcoat[9], DRAMP.stormcoat[7], DRAMP.stormcoat[5]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: HOLY, k: 1 }, { x: 0, y: 0, r: 60, ramp: FOG, k: 0.3 }, { x: 0, y: 0, r: 0, ramp: HOLY, k: 1 }, { x: 0, y: 0, r: 0, ramp: HOLY, k: 0.8 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.holy], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[HOL1] = RIM.skip[HOL2] = RIM.skip[HOL3] = RIM.skip[GHOST] = RIM.skip[VOIDM] = 1;

  // 姿势：身体升降 / 前倾、转头、张嘴、两只手、钟舌的朝向（ca，屏幕角度，0 朝右、π/2 朝下）、背上钟的摆动（bs）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'ca', 'bs', 'bd', 'glow', 'eyes', 'orb', 'dial', 'hand', 'cg', 'crack', 'toll', 'flash', 'dq', 'hot', 'tail', 'breath', 'grip', 'cover'];
  const K = {
    idle: { nx: 30, ny: -24, fx2: -24, fy2: -8, lean: 0.08, hd: 0.05, ca: 1.2, bs: 0 },
    hammerUp: { nx: 6, ny: -80, fx2: -22, fy2: -34, lean: -0.2, hd: -0.18, ca: -2.25, bs: 0 },    // 钟锤：钟舌举过头、锤头朝后
    hammerDn: { nx: 42, ny: -12, fx2: -20, fy2: -16, lean: 0.36, hd: 0.26, ca: 0.85, bs: -0.1 },
    tollW: { nx: 50, ny: -54, fx2: -26, fy2: -42, lean: -0.08, hd: -0.22, ca: 0.25, bs: 0.02 },     // 午夜钟声：钟舌甩到身前外侧
    tollHit: { nx: 36, ny: -58, fx2: -28, fy2: -44, lean: -0.04, hd: -0.3, ca: -2.3, bs: 0.14 },   // 反手敲在钟沿上
    cup: { nx: 40, ny: -46, fx2: 22, fy2: -40, lean: 0.06, hd: 0.2, ca: 2.2, bs: 0 },               // 落钟：双手捧着虚影小钟
    heave: { nx: 34, ny: -86, fx2: 16, fy2: -84, lean: -0.22, hd: -0.3, ca: 2.6, bs: 0.1 },
    pokeW: { nx: 14, ny: -42, fx2: -24, fy2: -12, lean: -0.06, hd: 0, ca: -2.7, bs: 0.04 },          // 重击：钟舌过肩 → 往前捅
    poke: { nx: 54, ny: -26, fx2: -24, fy2: -6, lean: 0.32, hd: 0.2, ca: 0.25, bs: -0.06 },
    swipeW: { nx: 8, ny: -48, fx2: -24, fy2: -8, lean: -0.08, hd: -0.05, ca: -1.9, bs: 0.04 },       // 普攻：拖回胸前 → 横甩出去
    swipe: { nx: 50, ny: -22, fx2: -24, fy2: -8, lean: 0.26, hd: 0.12, ca: 0.55, bs: -0.05 },
    hunch: { nx: 18, ny: -54, fx2: -2, fy2: -30, lean: 0.34, hd: 0.34, ca: 1.9, bs: -0.04 },        // 第二阶段：捂脸
    wide: { nx: 50, ny: -60, fx2: -44, fy2: -56, lean: -0.18, hd: -0.36, ca: -0.9, bs: 0.1 },
    climbA: { nx: 40, ny: -6, fx2: -36, fy2: -18, lean: 0.3, hd: 0.22, ca: 1.1, bs: -0.03 },
    climbB: { nx: 36, ny: -18, fx2: -34, fy2: -2, lean: 0.26, hd: 0.22, ca: 1.3, bs: 0.03 },
    agony: { nx: 36, ny: -76, fx2: -30, fy2: -70, lean: -0.2, hd: -0.4, ca: -1.2, bs: 0.1 },
    limp: { nx: 34, ny: 4, fx2: -26, fy2: 4, lean: 0.5, hd: 0.5, ca: 0.4, bs: -0.1 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'ca', 'bs'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.mx = 0; P.flip = 0; P.grip = 1; }
  const SWAY = [0, 0.02, 0.035, 0.02, 0, -0.02];

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; const s = Math.floor(tt / 0.4) % 6; P.bs = SWAY[s]; P.ca = 1.2 + SWAY[(s + 2) % 6] * 1.5; P.tail = f12 % 8; P.glow = 1 + ((f12 >> 2) & 1); P.eyes = (f12 % 9 === 0 || f12 % 13 === 0) ? 1 : 2;   // 眼里的光一跳一跳
      const lp = tt % DUR[IDLE]; if (lp >= 1.5 && lp < 2.1) { P.hd = -0.2; P.bs = lp < 1.7 ? 0.06 : lp < 1.9 ? -0.04 : 0.02; P.eyes = 2; P.dial = 12; P.hand = 1; P.nx -= 2; P.ny -= 4; } };   // 待机个性：抬头听背上的钟自己晃了一下
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.tail = f12 % 8; P.grip = 0; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.swipeW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.swipeW, K.swipeW); P.glow = 2; P.cg = 1; }
      else if (tq < 0.42) { pose(K.swipe, K.swipe); P.jaw = 2; P.glow = 3; P.cg = 2; }
      else pose(K.swipe, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { P.hd = -0.28; P.lean = -0.1; P.jaw = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.bs = 0.12; P.nx -= 4; P.ca = 1.8; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.28 * (1 - q); P.lean = 0.08 - 0.18 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; P.bs = -0.05 * (1 - q); }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.bs += (f12 & 1) ? 0.04 : -0.04; P.crack = 1; P.tail = f12 % 8; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 3 : 2 - ((f12 >> 1) & 1); P.eyes = d < 1.2 ? 2 : 1; P.by = Math.round(6 * clamp01((d - 0.7) / 0.8)); P.crack = 1; P.grip = d < 1.0 ? 1 : 0; }
      else { pose(K.limp, K.limp); P.jaw = 1; P.glow = d < 2 ? 1 : 0; P.eyes = d < 1.7 ? 1 : 0; P.grip = 0; P.crack = 1;   // 钟摆正、整口扣下来把他罩住
        const q = ease.in(clamp01((d - 1.5) / 0.35)); P.by = 6 + Math.round(10 * q); P.bs = -0.1 + 0.4 * q - P.lean * 0.3 * q; P.bd = Math.round(38 * q); P.cover = 1; P.lean = 0.5 * (1 - q); P.hd = 0.5 * (1 - q);
        P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.55) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    if (P.hot && st !== DEATH) { P.crack = 1; if (P.dial < 12) P.dial = 12; P.hand = P.hand || 1; }
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { bellHammer: 0, midnight: 1, bellDrop: 2, poke: 3, rise: 4, p2: 5 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D);
    if (MV === 'bellHammer' || MV === 'poke') {
      const big = MV === 'bellHammer', up = big ? K.hammerUp : K.pokeW, dn = big ? K.hammerDn : K.poke;
      if (st === CHARGE) { pose(K.idle, up, ease.out(clamp01(q / 0.5))); P.by = -Math.round((big ? 6 : 3) * ease.out(clamp01(q / 0.5))); if (q > 0.5) { P.nx += (f12 & 1) ? 1 : -1; P.by += (f12 & 1); } P.cg = big ? Math.min(3, Math.round(q * 4)) : q > 0.5 ? 1 : 0; P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(dn, dn); P.by = big ? 4 : 2; P.cg = tq < 2 / 12 ? 3 : 1; P.jaw = 3; P.glow = 3; P.eyes = 2; }
      else { pose(dn, K.idle, ease.inOut(clamp01(tq / 0.55))); P.by = Math.round(4 * (1 - clamp01(tq / 0.55))); }
    } else if (MV === 'midnight') {   // 钟面刻度一格格亮到十二点 → 反手敲钟
      if (st === CHARGE) { pose(K.idle, K.tollW, ease.out(clamp01(q / 0.35))); P.dial = Math.min(12, Math.floor(q * 13)); P.hand = q; P.glow = 2; P.eyes = 2; P.bs = K.tollW.bs + SWAY[Math.floor(tq / 0.25) % 6]; P.cg = 1;
        if (q > 0.8) { P.jaw = 1; P.nx += (f12 & 1) ? 1 : -1; P.by = -(f12 & 1); P.glow = 3; } }
      else if (st === CAST) { pose(K.tollHit, K.tollHit); P.dial = 12; P.hand = 1; P.jaw = 3; P.glow = 3; P.eyes = 2; P.toll = tq < 3 / 12 ? 2 : 1; P.bs = tq < 2 / 12 ? 0.16 : 0.16 * Math.cos((tq - 2 / 12) * 14); P.cg = 2; }
      else { pose(K.tollHit, K.idle, ease.inOut(clamp01(tq / 0.6))); P.bs = Math.round(0.12 * Math.cos(tq * 16) * Math.exp(-tq * 3) * 50) / 50; P.dial = tq < 0.4 ? 12 : 0; P.hand = 1; P.toll = tq < 0.3 ? 1 : 0; }
    } else if (MV === 'bellDrop') {   // 捧起虚影小钟、越聚越大 → 往天上抛
      if (st === CHARGE) {
        if (q < 0.4) pose(K.idle, K.cup, ease.out(q / 0.4)); else if (q < 0.82) { pose(K.cup, K.cup); P.by = -Math.round(3 * (q - 0.4) / 0.42); } else pose(K.cup, K.heave, ease.in((q - 0.82) / 0.18) * 0.35);
        P.orb = q < 0.12 ? 0 : Math.min(4, 1 + Math.floor((q - 0.12) / 0.17)); P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.grip = 0; P.jaw = q > 0.7 ? 1 : 0; if (q > 0.82) { P.nx += (f12 & 1) ? 1 : -1; }
      } else if (st === CAST) { pose(K.heave, K.heave); P.jaw = 3; P.glow = 3; P.eyes = 2; P.grip = 0; P.by = -3; }
      else { pose(K.heave, K.idle, ease.inOut(clamp01(tq / 0.6))); P.grip = tq > 0.3 ? 1 : 0; }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1 + (f12 & 1); P.tail = f12 % 8; P.eyes = q > 0.6 ? 2 : 1; P.grip = 0; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.toll = 2; P.dial = 12; P.hand = 1; P.bs = K.wide.bs + ((f12 & 1) ? 0.04 : -0.02); }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：捂脸 → 钟被震两下、裂开 → 绷带崩开、仰天长啸
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.by = hb ? 1 : 0; P.bs += hb ? 0.1 : 0; P.crack = tq >= 0.35 ? 1 : 0; P.dial = hb ? 12 : 0; P.hot = hb ? 1 : HOT; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.crack = 1; P.toll = 2; P.tail = f12 % 8; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; P.crack = 1; P.toll = hold ? 1 : 0; P.tail = f12 % 8; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [18, -38], SHF = [-16, -40], NECK = [4, -46], BM = [-3, -62], BA = -0.3;
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.5 - P.lean * 0.4); }
  function bellXf() { torsoXf(); B.move(BM[0], BM[1] + P.bd); B.rot(0, 0, BA + P.bs + P.hd * 0.1 - P.lean * 0.6); }   // 钟：原点是钟口中心，朝上是钟顶
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(0, -28);
    headXf(); L.eye = B.at(14, -60); L.mouth = B.at(12, -48 + P.jaw); L.head = B.at(9, -57);
    bellXf(); L.dial = B.at(-2, -22); L.rimF = B.at(30, -2); L.bellTop = B.at(0, -44); L.bellC = B.at(0, -22); L.crackA = B.at(11, 0);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    L.elN = B.ik(L.shN, L.hN, 18, 19, -1); L.elF = B.ik(L.shF, L.hF, 18, 19, 1);
    if (P.grip) { const d = [Math.cos(P.ca), Math.sin(P.ca)]; L.cang = P.ca; L.cd = d; L.cTop = [L.hN[0] - d[0] * 8, L.hN[1] - d[1] * 8]; L.cH = L.hN; L.ball = [L.hN[0] + d[0] * 30, L.hN[1] + d[1] * 30]; }
    else if (P.st === DEATH) { L.cang = 0.05; L.cd = [1, 0.05]; L.cH = [36, 1]; L.cTop = [28, 1]; L.ball = [66, 3]; }   // 死了：钟舌倒在碎石上
    else { L.cang = Math.PI / 2; L.cd = [0, 1]; L.cH = [44, -29]; L.cTop = [44, -37]; L.ball = [44, 1]; }            // 腾不出手：钟舌杵在身前的地上
    L.orb = [(L.hN[0] + L.hF[0]) / 2 + 2, Math.min(L.hN[1], L.hF[1]) - 8 - P.orb * 1.5];
    P.fcx = P.orb ? L.orb[0] : P.toll || P.dial ? L.dial[0] : L.core[0]; P.fcy = P.orb ? L.orb[1] : P.toll || P.dial ? L.dial[1] : L.core[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const holy = (n) => (n >= 3 ? HOL3 : n >= 2 ? HOL2 : HOL1);

  // 钟的剖面（钟本地坐标，原点 = 钟口中心，y 向上为负）：宽钟口 → 收腰 → 圆肩 → 钟顶
  const BELL = [[-31, 1], [-32, -2], [-28, -7], [-23, -14], [-22, -24], [-21, -32], [-18, -38], [-12, -42.5], [0, -44], [12, -42.5], [18, -38], [21, -32], [22, -24], [23, -14], [28, -7], [32, -2], [31, 1]];
  function bellInside() {   // 钟口里面的黑：兜帽一样罩在头后面（第二阶段 / 敲钟时里面透出圣光）
    part(); bellXf(); B.ell(E, 0, 2, 30, 8, 0, VOIDM); B.ell(E, 2, 3, 23, 5, 0, VOIDM, 3);
    if (P.toll || P.hot) { B.ell(E, 4, 3, P.toll >= 2 ? 16 : 10, P.toll >= 2 ? 4 : 2.5, 0, P.toll >= 2 ? HOL2 : HOL1); }
  }
  function bellShell() {
    part(); bellXf(); B.poly(E, BELL, BRZ);
    B.ln(E, -31, -3, 31, -3, BRZ, 8); B.ln(E, -30, -5, 30, -5, BRZ, 3);                                      // 钟唇：厚边、上沿一道高光
    B.ln(E, -27, -8, 27, -8, BRZ, 3); B.ln(E, -26, -9, 26, -9, BRZ, 7); B.ln(E, -24, -11, 24, -11, BRZ, 3);   // 钟腰下的两道箍
    B.ln(E, -21, -32, 21, -32, BRZ, 3); B.ln(E, -19, -37, 19, -37, BRZ, 3); B.ln(E, -21, -33, 21, -33, BRZ, 7);   // 钟肩的铭文带
    for (let x = -17; x <= 17; x += 4) { B.px(E, x, -35, BRZ, 2); B.px(E, x + 1, -34.6, BRZ, 2); if (P.hot) B.px(E, x + 2, -35, HOL1); }
    for (const x of [-19, -7, 7, 19]) { B.ell(E, x, -14, 1.5, 1.5, 0, BRZ, 7); B.px(E, x + 1, -13, BRZ, 3); }    // 钟身的乳钉
    B.ln(E, -9, -41, 7, -42.5, BRZ, 8); B.ln(E, -18, -29, -19, -17, BRZ, 7);                                       // 钟顶和钟身左侧的受光
    for (const [x, y, rx, ry] of [[-20, -5, 5, 2], [16, -29, 3.5, 1.6], [-11, -39, 3, 1.4], [21, -10, 2.6, 1.2], [8, -17, 2.2, 1.1]]) B.ell(E, x, y, rx, ry, 0, VERD);   // 铜绿
    for (const [x, y] of [[-18, -3], [-23, -4], [17, -27], [22, -8]]) B.ln(E, x, y, x - 1, y + 5, VERD, 4);                          // 往下淌的铜绿
    // 钟面：一圈十二刻度，蓄午夜钟声时一格格亮起，指针走到十二点
    const cx = -2, cy = -22, R = 8.5;
    for (let a = 0; a < 6.283; a += 0.2) B.px(E, cx + Math.cos(a) * R, cy + Math.sin(a) * R, BRZ, 2);
    for (let a = 0; a < 6.283; a += 0.25) B.px(E, cx + Math.cos(a) * (R + 1), cy + Math.sin(a) * (R + 1), BRZ, 7);
    for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i / 12 * 6.2832, lit = i === 0 ? P.dial >= 12 : i <= P.dial;
      B.ln(E, cx + Math.cos(a) * (R - 3), cy + Math.sin(a) * (R - 3), cx + Math.cos(a) * (R - 1), cy + Math.sin(a) * (R - 1), lit ? (P.dial >= 12 ? HOL2 : HOL1) : BRZ, lit ? 0 : 3); }
    const ha = -Math.PI / 2 - (1 - (P.hand || 0.83)) * 6.2832 * 0.17;
    B.ln(E, cx, cy, cx + Math.cos(ha) * (R - 2), cy + Math.sin(ha) * (R - 2), P.dial >= 12 ? HOL3 : BRZ, P.dial >= 12 ? 0 : 2); B.ln(E, cx, cy, cx + 3, cy + 1, BRZ, 2); B.px(E, cx, cy, P.dial ? HOL2 : BRZ, P.dial ? 0 : 8);
    if (P.crack) {   // 第二阶段：从钟口裂到钟面的一道缝，缝里是圣光
      const cr = [[11, 1], [7, -5], [10, -10], [5, -15], [6, -18], [3, -21]], br = [[7, -5], [2, -8], [-1, -7]];
      const lit = P.glow >= 3 ? HOL3 : HOL2;
      for (let i = 1; i < cr.length; i++) { B.ln(E, cr[i - 1][0] + 1, cr[i - 1][1], cr[i][0] + 1, cr[i][1], BRZ, 10); B.ln(E, cr[i - 1][0], cr[i - 1][1], cr[i][0], cr[i][1], i < 3 ? lit : HOL1); }
      for (let i = 1; i < br.length; i++) { B.ln(E, br[i - 1][0], br[i - 1][1] + 1, br[i][0], br[i][1] + 1, BRZ, 10); B.ln(E, br[i - 1][0], br[i - 1][1], br[i][0], br[i][1], HOL1); }
    }
    part(); bellXf(); B.ell(E, 0, -47.5, 5, 4, 0, BRZ); B.ell(E, 0, -47.5, 2, 1.6, 0, VOIDM); B.ln(E, -3, -50, 2, -51, BRZ, 8);   // 钟顶的吊环
    part(); bellXf(); B.poly(E, [[-8, -44.5], [8, -44.5], [6, -42], [-6, -42]], IRON); B.ln(E, -7, -44, 7, -44, IRON, 8);        // 吊环底下的铁箍
  }
  function chain(a, b, gap) {   // 铁链：一环一环交替横竖
    const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.max(2, Math.round(Math.hypot(dx, dy) / (gap || 3.4))), an = Math.atan2(dy, dx);
    for (let i = 0; i <= n; i++) { const q = i / n, x = a[0] + dx * q, y = a[1] + dy * q; part(); B.reset(); if (i & 1) B.ell(E, x, y, 1, 1.5, an, IRON, 4); else { B.ell(E, x, y, 1.9, 1.2, an, IRON); B.px(E, x - 0.5, y - 0.5, IRON, 8); } }
  }
  function straps() {
    bellXf(); const c = B.at(-19, -8); torsoXf(); const d = B.at(-19, -28); chain(c, d);
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-18, 5], [19, 5], [20, -12], [21, -28], [23, -38], [13, -46], [-9, -47], [-20, -41], [-20, -22], [-19, -8]], ROBE);
    for (const [x0, y0, x1] of [[-10, -32, -12], [-2, -36, -3], [8, -32, 10], [15, -26, 17]]) { B.ln(E, x0, y0, x1, 5, ROBE, 3); B.ln(E, x0 + 1, y0 + 2, x1 + 1, 5, ROBE, 7); }   // 袍子的竖褶
    B.ln(E, 5, -44, 6, 5, BRZ, 6); B.ln(E, 6, -44, 7, 5, BRZ, 3);                                      // 前襟的铜边
    B.ln(E, -19, -15, 20, -13, BAND, 5); B.ln(E, -19, -14, 20, -12, BAND, 7); B.ln(E, -19, -16, 20, -14, BAND, 3);   // 麻绳腰带
    B.ell(E, 12, -13, 2.2, 1.6, 0, BAND, 7);
    part(); torsoXf(); for (const [x, l] of [[11, 7], [14, 9]]) { B.cap(E, x, -12, x + 0.5, -12 + l, 0.7, 0.7, BRZD); B.ell(E, x + 0.5, -12 + l, 1.6, 1.2, 0, BRZ, 7); }   // 腰上挂的两把旧钥匙
    part(); torsoXf(); for (const [x0, x1, s] of [[-2, -5, -1], [10, 12, 1]]) {   // 褪了色的红圣带：从领口垂到腰下，末端绣着一口小钟
      B.poly(E, [[x0 - 2.5, -44], [x0 + 2.5, -44], [x1 + 3, -2], [x1 - 3, -2]], STOLE); B.ln(E, x0 - 2, -43, x1 - 2.5, -3, STOLE, 7); B.ln(E, x1 - 3, -3, x1 + 3, -3, BRZ, 6);
      const bx = x1, by = -8; B.poly(E, [[bx - 2, by + 2], [bx - 1.5, by - 1], [bx, by - 2], [bx + 1.5, by - 1], [bx + 2, by + 2]], BRZ, 8); for (const y of [-26, -18]) B.ln(E, x0 + (x1 - x0) * (y + 44) / 42 - 1.5, y, x0 + (x1 - x0) * (y + 44) / 42 + 1.5, y, BRZ, 6); }
    part(); torsoXf(); B.ell(E, 3, -44, 14, 4.5, 0, ROBE); B.ln(E, -9, -46, 15, -46, ROBE, 8); B.ln(E, -10, -42, 16, -42, ROBE, 3);   // 领口的布卷
  }
  function rubble() {   // 身前的碎石（废墟地面）
    part(); B.reset(); B.poly(E, [[-32, 8], [-31, -3], [-24, -7], [-16, -5], [-15, 8]], STONE); B.ln(E, -30, -2, -17, -4, STONE, 8); B.ln(E, -24, -5, -26, 4, STONE, 3);
    part(); B.poly(E, [[17, 8], [19, -2], [26, -6], [34, -3], [36, 8]], STONE); B.ln(E, 20, -2, 33, -3, STONE, 8); B.ln(E, 28, -4, 30, 5, STONE, 3); B.ell(E, 24, -3, 2, 1, 0, VERD);
    part(); B.poly(E, [[-7, 8], [-6, 1], [1, -2], [6, 1], [7, 8]], STONE); B.ln(E, -5, 1, 4, -1, STONE, 8);
    part(); B.poly(E, [[37, 8], [38, 3], [43, 2], [45, 8]], STONE); part(); B.poly(E, [[-40, 8], [-39, 2], [-34, 3], [-33, 8]], STONE);
  }
  function arm(side) {   // 袍袖：上臂 → 越往下越宽的袖口 → 缠着绷带的手腕
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? ROBED : ROBE;
    part(); capW(sh[0], sh[1], el[0], el[1], 6.5, 5.5, m); const mid = [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2]; dot(mid[0] - 1, mid[1] - 2, 2.2, m, 7);
    const cf = [el[0] + (h[0] - el[0]) * 0.72, el[1] + (h[1] - el[1]) * 0.72];
    part(); capW(el[0], el[1], cf[0], cf[1], 5.2, 7.5, m); lnW(el[0], el[1], cf[0], cf[1], m, 3);
    const dd = [h[0] - cf[0], h[1] - cf[1]], dl = Math.hypot(dd[0], dd[1]) || 1, nn = [-dd[1] / dl, dd[0] / dl];
    lnW(cf[0] + nn[0] * 6, cf[1] + nn[1] * 6, cf[0] - nn[0] * 6, cf[1] - nn[1] * 6, m, 8);   // 袖口的亮边
    part(); capW(cf[0], cf[1], h[0], h[1], 3.2, 3.4, far ? BANDD : BAND); lnW(cf[0] + nn[0] * 3 + dd[0] * 0.3, cf[1] + nn[1] * 3 + dd[1] * 0.3, cf[0] - nn[0] * 3 + dd[0] * 0.5, cf[1] - nn[1] * 3 + dd[1] * 0.5, far ? BANDD : BAND, 3);   // 手腕的绷带
  }
  function hand(side) {   // 惨白、骨节粗大的手；握钟舌时指头收起来
    const far = side < 0, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? SKIND : SKIN, g = !far && P.grip;
    part(); dot(h[0], h[1], 4.4, m); const dir = g ? Math.atan2(L.cd[1], L.cd[0]) : Math.atan2(h[1] - el[1], h[0] - el[0]);
    for (let i = 0; i < 4; i++) { const a = dir + (i - 1.5) * (g ? 0.3 : 0.4), r0 = [h[0] + Math.cos(a) * 3.4, h[1] + Math.sin(a) * 3.4], ln = g ? 2.6 : 6.5, tip = [r0[0] + Math.cos(a + 0.5 * side) * ln, r0[1] + Math.sin(a + 0.5 * side) * ln];
      capW(r0[0], r0[1], tip[0], tip[1], 1.4, 0.7, m, i === 0 ? 7 : 5); px(r0[0], r0[1], m, 8); }
  }
  function clapper() {   // 钟舌：铁杆、顶上的吊环、青铜锤头（蓄力时锤头聚光）
    const d = L.cd, h = L.cH, t = L.cTop, e = [h[0] + d[0] * 24, h[1] + d[1] * 24], b = L.ball, n = [-d[1], d[0]];
    part(); B.reset(); B.ell(E, t[0] - d[0] * 2, t[1] - d[1] * 2, 3, 3, 0, IRON); B.ell(E, t[0] - d[0] * 2, t[1] - d[1] * 2, 1.2, 1.2, 0, VOIDM);
    part(); capW(t[0], t[1], e[0], e[1], 1.8, 2.2, IRON); lnW(t[0] - n[0], t[1] - n[1], e[0] - n[0], e[1] - n[1], IRON, 8);
    part(); B.reset(); B.ell(E, b[0], b[1], 7.5, 7, L.cang, BRZ); B.ell(E, b[0] - d[0] * 6, b[1] - d[1] * 6, 4, 3.6, L.cang, BRZ); B.ell(E, b[0] - d[0] * 9, b[1] - d[1] * 9, 2.6, 2.6, L.cang, BRZ);
    B.ln(E, b[0] - d[0] * 3 + n[0] * 6, b[1] - d[1] * 3 + n[1] * 6, b[0] - d[0] * 3 - n[0] * 6, b[1] - d[1] * 3 - n[1] * 6, BRZ, 3);
    B.ln(E, b[0] + d[0] * 1 + n[0] * 7, b[1] + d[1] * 1 + n[1] * 7, b[0] + d[0] * 1 - n[0] * 7, b[1] + d[1] * 1 - n[1] * 7, BRZ, 7);
    B.ell(E, b[0] + d[0] * 2 - 2, b[1] + d[1] * 2 - 2, 2, 1.4, L.cang, VERD);
    if (P.cg) { dot(b[0], b[1], 1.5 + P.cg * 1.3, holy(P.cg)); if (P.cg >= 2) dot(b[0] - 0.5, b[1] - 0.5, 1.2 + P.cg * 0.5, HOL3); }
    if (P.grip) { part(); B.reset(); chain([t[0] - d[0] * 3, t[1] - d[1] * 3], [h[0] - d[0] * 1 + 3, h[1] + 5], 3); }   // 吊环垂下来缠在手腕上的一截链子
  }
  function head() {   // 缠满绷带的头，绷带缝里两点圣光；下半张脸露出惨白的皮、瘦削的下颌
    const J = Math.round(P.jaw * 1.5), tl = P.tail, w = [0, 1, 2, 1, 0, -1, -2, -1];
    part(); headXf(); const tp = [[0, -61], [-6, -58 + w[tl % 8] * 0.5], [-12, -55 + w[(tl + 2) % 8]], [-18, -51 + w[(tl + 4) % 8]], [-22, -46 + w[(tl + 6) % 8]]];
    B.strand(E, tp, 2.2, 1.2, BANDD); if (P.hot) B.strand(E, [[1, -54], [-5, -51 + w[(tl + 3) % 8] * 0.5], [-11, -47 + w[(tl + 5) % 8]], [-15, -42]], 1.8, 1, BANDD);   // 飘着的绷带尾
    part(); headXf(); B.cap(E, 3, -41, 6, -50, 6.5, 5.5, SKIN); B.ln(E, 0, -45, 10, -47, SKIN, 3); B.ln(E, 1, -48, 10, -50, BAND, 5);   // 脖子
    part(); headXf();
    B.ell(E, 9, -58, 10.5, 11.5, 0, BAND);
    B.poly(E, [[2, -55], [20, -56], [20, -51], [17, -46 + J], [13, -43 + J], [9, -44 + J], [5, -47], [3, -51]], SKIN);   // 下半张脸：瘦、尖下巴
    B.ln(E, 2, -56, 20, -57, BAND, 3); B.ln(E, 2, -57, 20, -58, BAND, 8);                                                // 绷带下沿
    B.ln(E, 0, -66, 19, -68, BAND, 3); B.ln(E, 0, -65, 19, -67, BAND, 8); B.ln(E, -1, -60, 3, -55, BAND, 3); B.ln(E, 1, -61, 5, -56, BAND, 7);   // 一圈圈的绷带
    B.ln(E, 1, -64, 20, -65, BAND, 2); B.ln(E, 1, -63, 20, -64, BAND, 3);                                                // 钟沿压在额头上的影子
    B.ell(E, 7.5, -60, 2.6, 2.2, 0, VOIDM); B.ell(E, 15, -60.5, 3.8, 3, 0, VOIDM);                                        // 深陷的眼窝
    B.ln(E, 3, -58, 12, -64, BAND, 5); B.ln(E, 3, -57, 12, -63, BAND, 8); B.ln(E, 4, -56, 13, -62, BAND, 3);              // 一条斜着缠过来的绷带，压住半只远眼
    const eyeM = P.eyes >= 2 ? HOL3 : P.eyes ? HOL2 : VOIDM;
    if (P.eyes) { B.px(E, 7, -60, HOL1); B.px(E, 8, -59, P.eyes >= 2 ? HOL2 : HOL1); B.ell(E, 15.5, -60.5, 2.2, 1.7, 0, HOL2); B.ell(E, 15.5, -60.5, 1.1, 0.9, 0, eyeM); }
    if (P.eyes >= 2) { B.px(E, 19, -61, HOL1); B.px(E, 20, -62, HOL1); if (P.hot) { B.px(E, 21, -62, HOL2); B.px(E, 22, -63, HOL1); B.px(E, 10, -60, HOL1); } }   // 眼角拖出来的光
    B.poly(E, [[17, -56], [19, -56], [18.5, -53]], VOIDM);                                                              // 塌下去的鼻
    B.ln(E, 5, -53, 8, -46 + J, SKIN, 3); B.ln(E, 6, -53, 9, -47 + J, SKIN, 2); B.ln(E, 17, -55, 19, -51, SKIN, 7); B.px(E, 14, -44 + J, SKIN, 7);   // 凹下去的颊、颧骨、下巴的光
    B.ln(E, 9, -50, 18, -50.5, VOIDM);                                                                                  // 嘴
    if (J) { B.poly(E, [[9, -51], [18, -51.5], [17, -49 + J], [10, -49 + J]], VOIDM); if (J >= 4 && P.glow >= 3) B.ell(E, 13.5, -49 + J * 0.5, 1.6, J * 0.25, 0, HOL1); }   // 张嘴：黑洞，长啸时喉咙里一点光
    for (const x of [10, 12, 14, 16]) { B.px(E, x, -51, SKIN, 8); B.px(E, x, -50, SKIN, 6); } if (J) for (const x of [11, 13, 15]) B.px(E, x, -50 + J, SKIN, 7);   // 牙
  }
  function orb(c, n) {   // 虚影小钟（落钟蓄力）：一口发光的钟，越捧越大；外圈亮边、钟唇、钟里的暗
    const s = 0.5 + n * 0.25, pt = (x, y) => [c[0] + x * s, c[1] + y * s];
    const prof = [[-12, 8], [-11, 5], [-8, 2], [-7, -4], [-6, -8], [-3, -10], [3, -10], [6, -8], [7, -4], [8, 2], [11, 5], [12, 8]];
    part(); B.reset(); B.poly(E, prof.map(([x, y]) => pt(x * 1.12, y * 1.1 - 0.6)), HOL1);
    B.poly(E, prof.map(([x, y]) => pt(x, y)), GHOST); B.ell(E, c[0], c[1] + 8 * s, 11 * s, 2 * s, 0, HOL2); B.ell(E, c[0] + s, c[1] + 8.4 * s, 8 * s, 1 * s, 0, HOL1);
    B.ln(E, ...pt(-10, 4), ...pt(10, 4), HOL2); B.ln(E, ...pt(-4, -8), ...pt(-5, 2), HOL3); B.ln(E, ...pt(-6, -4), ...pt(6, -4), HOL1);
    B.ell(E, ...pt(0, -12), 2 * s, 1.6 * s, 0, HOL2); dot(...pt(0, 10), 1 + s * 0.5, HOL3);
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    bellInside(); arm(-1); hand(-1); torso(); torsoXf(); chain(B.at(-17, -38), B.at(15, -8), 3); head();
    if (!P.cover) { bellShell(); straps(); }
    rubble(); arm(1);
    clapper(); hand(1);
    if (P.cover) { bellShell(); }
    if (P.orb) orb(L.orb, P.orb);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const X = (p) => p[0] * z + spr.ox, Y = (p) => p[1] * z + spr.oy;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = X(L.head); RIM.ry = Y(L.head); RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = X(L.eye); LIGHTS[0].y = Y(L.eye); LIGHTS[0].r = (P.eyes >= 2 ? (P.hot ? 13 : 11) : P.eyes ? 7 : 0) * z;             // 眼里的圣光照亮钟沿和脸
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 20 * z; LIGHTS[1].r = 56 * z; LIGHTS[1].k = 0.3;                                           // 废墟地上的冷雾
    const lp = P.orb ? L.orb : P.cg ? L.ball : L.dial, lr = P.orb ? 10 + P.orb * 4 : P.cg ? 6 + P.cg * 4 : P.toll ? 14 + P.toll * 6 : P.dial ? 6 + P.dial * 0.6 : 0;
    LIGHTS[2].x = X(lp); LIGHTS[2].y = Y(lp); LIGHTS[2].r = lr * z;
    LIGHTS[3].x = X(L.crackA); LIGHTS[3].y = Y(L.crackA) - 8 * z; LIGHTS[3].r = (P.crack && !P.cover ? (P.glow >= 3 ? 16 : 11) : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面、钟口压着额头、两眼圣光、钟面亮到十二点、钟舌提在身侧（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.tollW, 0.45); P.hd = 0.02; P.lean = 0.02; P.jaw = 2; P.eyes = 2; P.glow = 3; P.hot = 1; P.dial = 12; P.hand = 1; P.crack = 1; P.cg = 2; P.bs = 0.02; P.by = 0; P.breath = 0; P.tail = 2; P.toll = 1;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(6, -66); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 30 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连钟沿和钟面）

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, mtT = 0;
  function tollFx(w) {   // 钟响：从钟身往外扩的两道大环 + 金色碎光
    const c = L.bellC; ring(sx(c[0]), sy(c[1]), 1, FXI.holy); ring(sx(c[0]), sy(c[1]), 0, FXI.holy); fx.cross(sx(L.dial[0]), sy(L.dial[1]), 14, 'holy', 0.3);
    burst(sx(c[0]), sy(c[1]), 20 + Math.round(16 * w), 40, 130, 0.35, 0.7, FXI.holy, 10); flash(0.06 + 0.06 * w); shake(0.3 + 0.1 * w, 3);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'bellHammer' || MV === 'poke') slamFx(MV === 'bellHammer');
      else if (MV === 'midnight') { tollFx(1); const b = L.ball; burst(sx(b[0]), sy(b[1]), 14, 50, 140, 0.2, 0.4, FXI.holy, 0); sfx('boss', { k: 'bellToll', w: 1 }); sfx('boss', { k: 'bellClang', w: 0.6 }); }
      else if (MV === 'bellDrop') { const o = L.orb; ring(sx(o[0]), sy(o[1]), 0, FXI.holy); burst(sx(o[0]), sy(o[1]), 18, 60, 150, 0.3, 0.6, FXI.holy, 40); for (let i = 0; i < 16; i++) spawn(K_RISE, sx(o[0] + (Math.random() - 0.5) * 12), sy(o[1] - Math.random() * 10), (Math.random() - 0.5) * 20, -140 - Math.random() * 120, 0.5 + Math.random() * 0.3, FXI.holy);
        fx.pillar(sx(o[0]), 0, sy(o[1]), 5, 'holy', 0.3); shake(0.25, 2); flash(0.06); sfx('boss', { k: 'throw', w: 1 }); sfx('boss', { k: 'bellToll', w: 0.5 }); }
      else if (MV === 'rise' || MV === 'p2') { tollFx(1); const e = L.mouth; ring(sx(e[0]), sy(e[1]), 1, FXI.holy); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 30; i++) { const a = -Math.PI * Math.random(); spawnX(K_PHYS, sx(L.bellC[0]), sy(L.bellC[1]), Math.cos(a) * (60 + Math.random() * 120), Math.sin(a) * (60 + Math.random() * 120), 0.8 + Math.random() * 0.5, MV === 'p2' ? FXI.holy : FXI.dust, { g: 220, floor: HY + 6 }); }
        sfx('boss', { k: 'bellToll', w: 1 }); sfx('boss', { k: 'roar', w: 0.8 }); if (MV === 'p2') sfx('boss', { k: 'bellCrack', w: 1 }); }
    }
    if (s === CHARGE && (MV === 'bellHammer' || MV === 'midnight' || MV === 'bellDrop')) sfx('boss', { k: 'bellHum', w: MV === 'bellHammer' ? 0.6 : 1, dur: E.DUR[CHARGE] });
    if (s === CHARGE && MV === 'midnight') mtT = 0;
    if (s === CHARGE && MV === 'rise') sfx('boss', { k: 'lavaRise', w: 0.8 });
    if (s === CHARGE && MV === 'p2') { sfx('boss', { k: 'heartbeat', w: 1 }); sfx('boss', { k: 'bellClang', w: 0.5 }); }
  }
  function slamFx(big) {   // 钟舌砸地：圣光地浪往两边推、碎石飞起来、地上留下发光的裂纹
    const b = L.ball, x = sx(b[0]), y = HY;
    fx.wave(x, y, 1, big ? 42 : 26, big ? 9 : 6, 'holy', 0.5, 2); fx.wave(x, y, -1, big ? 32 : 20, big ? 7 : 5, 'dust', 0.45, 2); fx.crack(x, y, big ? 22 : 14, 1, 'holy', 1.2); fx.crack(x, y, big ? 14 : 8, -1, 'dust', 1);
    burst(x, y - 2, big ? 22 : 12, 60, 170, 0.3, 0.7, FXI.holy, 50);
    for (let i = 0; i < (big ? 20 : 10); i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 12, y - 3, (Math.random() - 0.5) * 150, -60 - Math.random() * 160, 0.9 + Math.random() * 0.5, FXI.dust, { g: 320, floor: HY + 2 });   // 碎石
    ring(x, HY - 2, big ? 1 : 0, FXI.holy); shake(big ? 0.35 : 0.25, 3); flash(big ? 0.08 : 0.05);
    sfx('boss', { k: 'bellClang', w: big ? 1 : 0.7 }); sfx('boss', { k: 'slam', w: big ? 1 : 0.6 }); sfx('hit', { mat: 'stone', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'growl', w: 0.5 });
    if (s === ATTACK && t === 3 / 12) { const b = L.ball; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 36, 0.2, 2.6, 'holy', 0.22, 3, 2); burst(sx(b[0]), sy(b[1]), 14, 50, 140, 0.25, 0.5, FXI.holy, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'blunt', w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'bellClang', w: 0.25 });
    if (s === RECOVER && t === 0.25 && MV === 'midnight') { ring(sx(L.bellC[0]), sy(L.bellC[1]), 0, FXI.holy); }   // 余音：第三道环
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'bellDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { burst(sx(L.head[0]), sy(L.head[1]), 30, 50, 160, 0.4, 0.8, FXI.holy, 20); shake(0.2, 2); sfx('fall', { w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { const x = sx(-2); ring(x, HY - 2, 1, FXI.dust); fx.wave(x, HY, 1, 40, 6, 'dust', 0.5, 2); fx.wave(x, HY, -1, 40, 6, 'dust', 0.5, 2); burst(x, HY - 4, 30, 40, 150, 0.4, 0.9, FXI.dust, 60); shake(0.4, 3); flash(0.08);
      sfx('boss', { k: 'bellToll', w: 0.7 }); sfx('boss', { k: 'slam', w: 1 }); }
    if (s === DEATH && t === INCOMING + 2.1) { for (let i = 0; i < 40; i++) spawn(K_RISE, sx(-34 + Math.random() * 68), sy(-4 - Math.random() * 50), 0, -14 - Math.random() * 22, 0.9 + Math.random() * 0.8, i & 1 ? FXI.dust : FXI.holy); sfx('boss', { k: 'sink', w: 0.8 }); }
    if (s === CHARGE && MV === 'bellDrop' && Math.abs(t - E.DUR[CHARGE] * 0.5) < 0.02) sfx('boss', { k: 'bellClang', w: 0.3 });
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [0.25], [INCOMING], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.9, INCOMING + 2.1], []];
  function stepFX(dt, state, stT) {
    emT += dt;
    if (emT > (P.hot ? 0.07 : 0.14)) { emT = 0; const hot = P.hot && Math.random() < 0.5;   // 身边一直飘的灰和雾（第二阶段混进从裂缝里漏出来的金光）
      if (hot) spawn(K_EMBER, sx(L.crackA[0] - 6 + Math.random() * 10), sy(L.crackA[1] - Math.random() * 20), (Math.random() - 0.5) * 8, -12 - Math.random() * 10, 0.6 + Math.random() * 0.5, FXI.holy);
      else spawn(K_RISE, sx(-36 + Math.random() * 72), sy(-2 - Math.random() * 10), (Math.random() - 0.5) * 8, -6 - Math.random() * 6, 1.0 + Math.random() * 0.8, FXI.dust); }
    if (state === CHARGE && MV === 'bellHammer' && Math.random() < 0.6) { const c = L.ball, a = Math.random() * 6.2832, r = 10 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.holy, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'bellDrop' && P.orb && Math.random() < 0.7) { const c = L.orb, a = Math.random() * 6.2832, r = 12 + Math.random() * 12; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.holy, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 3 }); }
    if (state === CHARGE && MV === 'midnight') { mtT += dt; if (Math.random() < 0.5) { const c = L.dial, a = Math.random() * 6.2832, r = 14 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.3 + Math.random() * 0.2), 0, 9, FXI.holy, { a, r, w: 6, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
      if (mtT > 0.13) { mtT = 0; const c = L.dial, a = -Math.PI / 2 + P.dial / 12 * 6.2832; spawn(K_EMBER, sx(c[0] + Math.cos(a) * 9), sy(c[1] + Math.sin(a) * 9), 0, -8, 0.4, FXI.holy); sfx('boss', { k: 'bellTick', w: 0.3 + P.dial / 24 }); } }   // 一格一格走的钟声
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.3) { const b = L.ball; spawn(K_EMBER, sx(b[0] + (Math.random() - 0.5) * 8), sy(b[1]), 0, -10, 0.4, FXI.holy); }
    if ((state === CHARGE && MV === 'rise') || state === MOVE) { if (Math.random() < 0.5) spawnX(K_PHYS, sx(-24 + Math.random() * 60), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, FXI.dust, { g: 240, floor: HY + 4 }); }   // 爬的时候扒下来的碎石
    if (state === IDLE && P.dial && Math.random() < 0.3) spawn(K_EMBER, sx(L.dial[0] + (Math.random() - 0.5) * 12), sy(L.dial[1] - 4), 0, -8, 0.5, FXI.holy);
  }
  function fxReset() { emT = 0; mtT = 0; }
  function fxBack(f12) { const x0 = sx(-44), x1 = sx(44); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x + (f12 >> 1)) % 4) === 0) E.put(x, HY + 1, FXR[FXI.dust][P.hot ? 3 : 4]); }   // 脚下一线薄雾
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'bellHammer'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    bellToll: (s, t, w, p) => { s.ring(t, 98, 4.5, 0.2 + 0.1 * w, { pan: p, rev: 0.6 }); s.ring(t + 0.01, 196.6, 3, 0.09, { pan: p, rev: 0.6 }); s.bell(t, 43, 3, 0.08 + 0.05 * w, { pan: p }); s.thud(t, 82, 40, 0.4, 0.18 * w, { pan: p }); s.nz(t, 0.07, 'bandpass', 2400, 1.5, 0.06, { pan: p }); },
    bellClang: (s, t, w, p) => { s.ring(t, 176, 1.3, 0.12 + 0.08 * w, { pan: p, rev: 0.4 }); s.ring(t, 263, 0.8, 0.06, { pan: p }); s.nz(t, 0.06, 'highpass', 3000, 0.7, 0.08 * w, { pan: p }); s.thud(t, 110, 45, 0.25, 0.14 * w, { pan: p }); },
    bellHum: (s, t, w, p) => { s.tone(t, 'sine', 98, 1.4, 0.05 + 0.04 * w, { vib: [5, 20, 0.3], pan: p, rev: 0.5 }); s.tone(t, 'sine', 147, 1.3, 0.025, { pan: p, rev: 0.5 }); s.riser(t, t + 1.2, 300, 2400, 0.04 + 0.03 * w, { pan: p }); s.choir(t, [43, 50], 1.4, 0.04 * w, { dark: 1, pan: p }); },
    bellTick: (s, t, w, p) => { s.ring(t, 523, 0.25, 0.03 + 0.04 * w, { pan: p }); s.nz(t, 0.03, 'highpass', 5000, 0.7, 0.03, { pan: p }); },
    bellCrack: (s, t, w, p) => { s.crackle(t, 0.3, 2200, 0.1, { pan: p }); s.ring(t, 311, 1.0, 0.1 * w, { pan: p, parts: [[1, 1], [1.07, 0.8], [2.9, 0.4]] }); s.thud(t, 70, 36, 0.2, 0.2 * w, { pan: p }); },
    bellDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 140, 1.6, 0.07 + 0.04 * w, { to: 52, vib: [5, 60, 0.1], lp: 900, pan: p, rev: 0.7 }); s.choir(t, [40, 47], 1.8, 0.05, { dark: 1, pan: p }); s.ring(t + 0.3, 87, 3.5, 0.12, { pan: p, rev: 0.7, parts: [[1, 1], [1.03, 0.7], [2.7, 0.3]] }); },
  };

  return {
    name: '守钟人', HX, R_EL: FXI.holy, DUR, hero, P, GLOW_MATS: [HOL1, HOL2, HOL3, GHOST], HIT_POINT: [0, -34], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'stone', how: 'dissolve', pal: 'holy', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['bellHammer', 'midnight', 'bellDrop', 'poke', 'rise', 'p2'], MOVE_NAMES: { bellHammer: '钟锤', midnight: '午夜钟声', bellDrop: '落钟（第二阶段）', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.55, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.4, 0.8, 1.1], 'bellHammer'], [CAST, [0, 2 / 12], 'bellHammer'], [RECOVER, [0.3], 'bellHammer'],
      [CHARGE, [0.3, 0.8, 1.3, 1.5], 'midnight'], [CAST, [0, 3 / 12], 'midnight'], [RECOVER, [0.2], 'midnight'],
      [CHARGE, [0.3, 0.8, 1.3], 'bellDrop'], [CAST, [0], 'bellDrop'], [CHARGE, [0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 2 / 12, 4 / 12], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.1, 2.4, 2.6]]],
    SINK: 27, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
