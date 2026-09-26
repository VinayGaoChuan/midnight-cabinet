// 北极熊（部队 · 虚空 · 先锋 · 优质）：矮壮低伏的冷白熊，肩峰上长着一株三叶小树苗；颈下 / 肚下长毛锯齿下沿；左耳缺角、鼻梁一道发紫光的虚空裂痕。
// 攻击：低头前冲 4 格，用肩头顶撞（从不人立、不挥掌）。技能「繁茂」：伏低压身，嫩绿光点螺旋汇入树苗，树苗抽高、叶片 3 → 5；
// 施放时 5 片发光叶外爆后绕身环绕（5 片 = 5 档加成），身体膨胀 1 格；收招时叶片一片接一片变黄飘落熄灭（加成一场场衰减）。
// 升级 → 黑熊（树苗结出禁果）、生命树（树苗长成大树）：三只熊共用左耳缺角 + 鼻梁裂痕 + 背上的植物。身体用 parts-beast 的 quad。
PCD.define('PolarBear', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.nature, EL = FXR[R_EL];                                                   // 成长 · 嫩芽绿：白 → 淡绿白 → 嫩绿 → 深绿 → 墨绿
  const R_FUR = fxRamp('polarFur', [21, 17, 18, 60, 59]);                                     // 白毛屑（受击、甩毛、消散）
  const m = B.mats(E, {
    main: [59, 60, 17, 21], claw: [0, 0, 27, 28], eye: [0, 0, 0, 0], nose: [0, 0, 0, 0],      // 冷白熊毛（暗部灰蓝）、黑爪、墨眼墨鼻
    stem: [34, 35, 36, 37], leaf: 'green', leafG: [35, 37, 38, 21], scar: [42, 42, 43, 43],            // 树苗茎 / 叶、发光叶、紫裂痕
  });
  const SHAPE = { len: 14, chest: 6, rump: 4.8, waist: 0.15, hump: 2.5, leg: 5, lw: 3, thigh: 3, farDx: -2, stride: 2, lift: 2,
    neck: 2, neckA: -0.05, neckW: 3.5, head: { type: 'bear', w: 7, h: 6, snout: 3, snH: 3.5, tip: 0.85, earH: 2 }, headA: 0.3,
    tail: 'stub', foot: 'pad', mane: 'none', fur: 1, m };
  const o = Q.shape(SHAPE), oBig = Q.shape(Object.assign({}, SHAPE, { chest: 7, rump: 5.8 }));   // oBig：施放时膨胀 1 格

  const HX = 62, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 60, 50, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 16, 22], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'nose', 'claw', 'ink', 'scar', 'leafG', 'spec']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：sap 树苗抽高 0–3 · nl 叶片数 0–5 · lg 叶片发光 0–3 · swell 膨胀 · sd 树苗脱落 0 挂着 / 1 飞 / 2 落地 · sdx sdy 脱落位移 · shk 甩毛
  const EXTRA = [['sap', 0, 3], ['nl', 0, 5], ['lg', 0, 3], ['swell', 0, 1], ['sd', 0, 2], ['sdx', -24, 24], ['sdy', 0, 31], ['shk', -1, 1]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.sap = 0; P.nl = 3; P.lg = 0; P.swell = 0; P.sd = 0; P.sdx = 0; P.sdy = 0; P.shk = 0; }
  reset();
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o), oo = o;

  // ───── 树苗几何（肩峰上，x = SX） ─────
  const SX = 4, STEM = 5;
  const sapBase = (rg, sh) => { const s = Q.span(rg, sh, SX); return [SX, (s ? s[0] : -16) - 1]; };
  const sway = () => Math.max(-2, Math.min(2, (P.mane | 0) + (P.shk | 0)));
  const stemX = (j, H, sw) => R(sw * (j / H) * (j / H) * 1.5);
  function sapTop(rg, sh) { const b = sapBase(rg, sh), H = STEM + P.sap, sw = sway(); return [b[0] + stemX(H - 1, H, sw), b[1] - H + 1]; }
  const P0 = {}; Q.reset(P0); P0.lie = 1; const SAP_Y0 = -sapBase(Q.rig(P0, o), o)[1];   // 塌下时树苗根的高度（死亡里从这里折断飞出）

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -2, crouch: 1, head: 2, ear: 1, tail: 1, mane: 1 });
  const A_HIT = pose({ bx: 7, head: 3, pitch: -1, reach: 1, ear: 1, tail: -2, mane: -1 });
  const A_HOLD = pose({ bx: 6, head: 2, ear: 1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 2, head: 1, pitch: -1, ear: 1, tail: 1 });
  const S_BURST = pose({ head: -1, pitch: 1, tail: 2, mane: 1 });
  const S_PROUD = pose({ head: -1, tail: 1 });
  // 待机个性「抖毛」：[head, shk, tail, ear, eyes, bob]，从头甩到尾
  const SHAKE = [[-1, -1, -2, 1, 1, 0], [1, 1, 2, 1, 1, 1], [-1, -1, -2, 1, 1, 0], [1, 1, 1, 0, 0, 1], [0, 0, 0, 0, 0, 0]];
  const T_HIT = 2 / 12, SAP_AT = 0.5, SAP_DUR = 0.3;
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const s = SHAKE[Math.min(4, f12of(lp - 1.6))]; P.head = s[0]; P.shk = s[1]; P.tail = s[2]; P.ear = s[3]; P.eyes = s[4]; P.bob = s[5]; }
  }
  function sapDrop(p, d) {                                                                 // 死亡：侧翻时树苗从背上折断，往后弹飞落地
    if (d < SAP_AT) return; const q = clamp01((d - SAP_AT) / SAP_DUR);
    p.sd = q >= 1 ? 2 : 1; p.sdx = R(-14 * q); p.sdy = q >= 1 ? 0 : Math.min(31, R(SAP_Y0 * (1 - q) + Math.sin(q * Math.PI) * 6));
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_LOW);
      P.sap = R(3 * clamp01(tq / 1.2)); P.nl = 3 + (tq >= 0.6 ? 1 : 0) + (tq >= 1.0 ? 1 : 0);
      P.lg = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      if (tq >= 1.1) P.shk = (f12 & 1) ? 1 : -1;                                             // 蓄满：树苗发抖
    } else if (st === CAST) {
      if (tq < T_HIT) { apply(S_BURST); P.swell = 1; P.shk = (f12 & 1) ? 1 : -1; }
      else { E.mix(tmp, S_BURST, S_PROUD, ease.out(clamp01((tq - T_HIT) / 0.15)), F_ALL); apply(tmp); P.swell = tq < 0.25 ? 1 : 0; }
      P.sap = 3; P.nl = 0; P.lg = 3; P.rim = 3;                                               // 叶子都飞出去绕身体转了
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_PROUD, REST, q, F_ALL); apply(tmp);
      P.sap = R(3 * (1 - clamp01(tq / 0.55))); P.nl = tq < 0.4 ? 0 : tq < 0.5 ? 1 : tq < 0.6 ? 2 : 3;   // 新叶一片片长回来
      P.lg = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else Q.anim.hurt(P, h); }
    else if (st === DEATH) { const d = tq - INCOMING; if (d < 0) idle(tq, f12); else Q.anim.death(P, d, f12, sapDrop); }
    else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    oo = P.swell ? oBig : o; rig = Q.rig(P, oo);
    if (P.sd) { P.gx = SX + P.sdx + P.bx; P.gy = -P.sdy - STEM; }
    else { const g = sapTop(rig, oo); P.gx = g[0] + P.bx; P.gy = g[1] - 1; }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 树苗：茎 1 格（顶端随 sway 摆）+ 叶片（3 片常态，蓄力长到 5 片）；lg 发光档把叶子换成发光叶。lying = 倒在地上（茎横放、朝左）
  const LEAVES = [
    [[-1, 0, 3], [-2, -1, 4], [-3, -1, 3]],        // 左叶
    [[1, -1, 3], [2, -2, 4], [3, -2, 3]],          // 右叶
    [[0, -1, 3], [-1, -2, 4], [0, -2, 3]],         // 顶叶
    [[-1, 2, 3], [-2, 1, 4]],                      // 第 4 片：茎下段左
    [[1, 3, 3], [2, 2, 4]],                        // 第 5 片：茎下段右
  ];
  function leafMat(t) { const lg = P.lg | 0; if (!lg) return [m.leaf, t]; return [m.leafG, lg === 3 ? 4 : lg === 2 ? t : t - 1]; }
  // 候选部件：sapling（背上的小树苗：茎 + 3–5 片叶，可发光、可折断倒地）
  function sapling(x0, y0, H, nl, sw, lying) {
    E.part();
    if (lying) {
      for (let j = 0; j < H; j++) U.dot(E, x0 - j, -1, m.stem, 0);
      U.dot(E, x0 + 1, -1, m.stem, 1);                                                        // 断口
      const tx = x0 - H + 1;
      for (let k = 0; k < nl; k++) for (const [dx, dy, t] of LEAVES[k]) { const lm = leafMat(t); U.dot(E, tx + dy, -1 - dx, lm[0], lm[1]); }
      return;
    }
    let tx = x0, ty = y0;
    for (let j = 0; j < H; j++) { tx = x0 + stemX(j, H, sw); ty = y0 - j; U.dot(E, tx, ty, m.stem, 0); }
    for (let k = 0; k < nl; k++) for (const [dx, dy, t] of LEAVES[k]) { const lm = leafMat(t); U.dot(E, tx + dx + (t === 4 ? R(sw * 0.5) : 0), ty + dy, lm[0], lm[1]); }
  }
  // 颈下 / 肚下垂挂的长毛：锯齿下沿（与躯干同一个部件，紧跟 Q.body 画）；shk 甩毛时锯齿相位跟着变
  function furFringe() {
    if (rig.lie) return;
    const C1 = rig.C1, C2 = rig.C2, ph = (P.shk | 0) + 3;
    for (let x = R(C2.x); x <= R(C1.x + C1.r * 0.75); x++) {
      const s = Q.span(rig, oo, x); if (!s) continue; const k = (x + ph + 30) % 3, d = k === 0 ? 2 : k === 1 ? 1 : 0;
      for (let j = 1; j <= d; j++) U.dot(E, x, s[1] + j, m.body, j === d ? 2 : 0);
    }
  }
  // 远侧（左）耳：缺了前上角，轮廓上是平的（升级线全程保留）
  function farEar() {
    if (rig.lie === 2) return;
    E.part(); const F = Q.headFrame(rig, oo), b = F.at(F.W * 0.12, -F.Hh + 0.3), x = R(b[0]), y = R(b[1]);
    U.dot(E, x, y - 1, m.far, 0); U.dot(E, x + 1, y - 1, m.far, 0); U.dot(E, x, y - 2, m.far, 0); U.dot(E, x, y, m.far, 0); U.dot(E, x + 1, y, m.far, 0);
  }
  // 鼻梁的虚空裂痕：吻背往下 1 格斜 3 格紫光（与头同一个部件）
  function scar() {
    const F = Q.headFrame(rig, oo, P.jaw), W = F.W;
    [[W * 0.45, 1, 3], [W * 0.62, 1.4, 4], [W * 0.8, 1.8, 2]].forEach(([u, dv, t]) => { const p = F.at(u, F.top(u) + dv); U.dot(E, p[0], p[1], m.scar, t); });
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const legsLast = rig.lie === 2;
    if (!legsLast) Q.legs(E, rig, P, oo, 1);
    Q.tail(E, rig, P, oo);
    Q.body(E, rig, P, oo); furFringe();
    if (!legsLast) Q.legs(E, rig, P, oo, 0);
    if (!P.sd && !rig.lie) { const b = sapBase(rig, oo); sapling(b[0], b[1], STEM + P.sap, P.nl, sway(), 0); }
    else if (!P.sd && rig.lie === 1) { const b = sapBase(rig, oo); sapling(b[0], b[1], STEM, P.nl, 1, 0); }
    farEar();
    Q.head(E, rig, P, oo); scar();
    if (legsLast) { Q.legs(E, rig, P, oo, 1); Q.legs(E, rig, P, oo, 0); }
    if (P.sd) { const lying = P.sd === 2 || (P.sdx & 1); sapling(SX + P.sdx + (lying ? 2 : 0), -P.sdy, STEM, 3, 0, lying); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, furAcc = 0, lastGf = -9, lastLp = 0, swT = 9, swX = 0, swY = 0;
  const sapScr = () => [scrX(P.gx), HY + P.gy];
  const ORB = { rx: 19, ry: 6, w: 5.5 }, N_LEAF = 5, FALL_T0 = 0.06, FALL_GAP = 0.1, T_SPREAD = 0.12;
  const orbC = () => [scrX(1 + P.bx), HY - 12];
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = sapScr(), [cx, cy] = orbC();
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); burst(gx, gy, 20, 40, 110, 0.25, 0.55, R_EL, 10);
      ring(cx, cy, 1, R_EL); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                        // 肩头顶到假人
      const hx = scrX(rig.head.x + P.bx), hy = HY + R(rig.head.y);
      swT = 0; swX = hx + 4; swY = hy;
      burst(DUMMY_X - 4, HY - 13, 12, 40, 100, 0.15, 0.4, FXI.impact, 10); burst(swX, swY, 6, 30, 70, 0.2, 0.45, R_FUR, 6); hitDummy(0, 1);
      for (let i = 0; i < 4; i++) spawn(K_DUST, scrX(-8) + (Math.random() - 0.5) * 6, HY, -10 - Math.random() * 20, -4 - Math.random() * 8, 0.3 + Math.random() * 0.25, FXI.dust);
      sfx('swing', { kind: 'smash', w: 0.7 }); sfx('hit', { mat: 'flesh', w: 0.7 });
    }
    if (s === CAST && t === 0.1) {                                                            // 加成落在身上：脚下一圈嫩绿冲击环 + 草屑
      ring(scrX(1 + P.bx), HY - 2, 0, R_EL); burst(scrX(1 + P.bx), HY - 2, 14, 30, 80, 0.3, 0.6, R_EL, 18);
      sfx('impact', { pal: 'nature', w: 0.6 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.25, 0.5, R_FUR, 12);
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.75 });
    }
    if (s === DEATH && t === T_SAPLAND) { const x = scrX(SX - 14); burst(x, HY - 2, 5, 20, 40, 0.2, 0.4, R_EL, 8); }
  }
  const T_SAPLAND = Math.ceil((INCOMING + SAP_AT + SAP_DUR) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_HIT], [], [0.1], [], [INCOMING], [INCOMING + 0.66, T_SAPLAND], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = sapScr();
    if (state === CHARGE) {                                                                   // 地面嫩绿光点定点螺旋汇入树苗
      chargeAcc += dt * (16 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 17 + Math.random() * 8, a = Math.PI * (0.18 + 0.64 * Math.random()); spawnX(K_SPIRAL_PT, gx, gy, r / (0.4 + Math.random() * 0.35), 0, 9, R_EL, { a, r, w: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2), squash: 1 }); }
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(P.gf === 0 ? 9 : -6) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust); sfx('step', { w: 0.75 }); }
      lastGf = P.gf;
    }
    if (state === IDLE) {                                                                     // 甩毛那一下甩出 3 颗白毛屑
      const lp = stT % DUR[IDLE];
      if (lastLp < 1.6 && lp >= 1.6) for (let i = 0; i < 3; i++) spawn(K_BURST, scrX(-4 + i * 7), HY - 17 + Math.random() * 3, (i - 1) * 25 + (Math.random() - 0.5) * 10, -25 - Math.random() * 15, 0.5 + Math.random() * 0.3, R_FUR);
      lastLp = lp;
      emberAcc += dt * 1.2; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.4, R_EL); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 30, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); }
      furAcc += dt * 18; while (furAcc >= 1) { furAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 30, HY - 4 - Math.random() * 10, 6 + Math.random() * 10, -8 - Math.random() * 10, 0.6 + Math.random() * 0.5, R_FUR); }
    }
    swT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; furAcc = 0; lastGf = -9; lastLp = 0; swT = 9; }
  // 5 片发光叶：施放时从树苗外爆到身体周围的椭圆轨道上环绕；收招时一片接一片变黄（nature 第 3 → 5 级）飘落到地面熄灭
  function leafState(k) {
    const st = E.state; let tc;
    if (st === CAST) tc = E.stT; else if (st === RECOVER) tc = DUR[CAST] + E.stT; else return null;
    const [cx, cy] = orbC(), a = k * 6.2832 / N_LEAF + tc * ORB.w, ox = cx + Math.cos(a) * ORB.rx, oy = cy + Math.sin(a) * ORB.ry;
    if (tc < T_SPREAD) { const q = ease.out(tc / T_SPREAD), [gx, gy] = sapScr(); return { x: gx + (ox - gx) * q, y: gy + (oy - gy) * q, c: 0, front: 1 }; }
    const tf = FALL_T0 + k * FALL_GAP;
    if (st === RECOVER && E.stT >= tf) {
      const a0 = k * 6.2832 / N_LEAF + (DUR[CAST] + tf) * ORB.w, x0 = cx + Math.cos(a0) * ORB.rx, y0 = cy + Math.sin(a0) * ORB.ry, dtf = E.stT - tf;
      const y = Math.min(FLOOR - 1, y0 + 20 * dtf + 90 * dtf * dtf), landed = y >= FLOOR - 1;
      if (landed && dtf > 0.42) return null;
      return { x: x0 + Math.sin(dtf * 14 + k) * 2, y, c: dtf < 0.1 ? 2 : dtf < 0.22 ? 3 : 4, front: 1, fall: 1 };
    }
    return { x: ox, y: oy, c: (R(tc * 12) + k) % 3 === 0 ? 0 : 1, front: Math.sin(a) > 0 ? 1 : 0 };
  }
  // 一片叶：5 格斜菱形（叶尖朝右上），叶脉一格亮，外沿按色阶再暗一级；环绕时叶心逐帧闪白
  function drawLeaf(L, f12) {
    const x = R(L.x), y = R(L.y), c = EL[L.c], edge = EL[Math.min(4, L.c + 1)], dark = EL[Math.min(4, L.c + 2)];
    put(x - 2, y + 1, dark); put(x - 1, y + 1, edge); put(x - 1, y, edge); put(x, y, c); put(x + 1, y, edge); put(x, y - 1, edge); put(x + 1, y - 1, c); put(x + 2, y - 2, edge);
    if (!L.fall && (f12 & 1)) put(x, y, EL[0]);
  }
  function leaves(front, f12) { for (let k = 0; k < N_LEAF; k++) { const L = leafState(k); if (L && L.front === front) drawLeaf(L, f12); } }
  function fxBack(f12) {
    if (P.rim >= 2 && P.lie === 0) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (E.state === CHARGE) {                                                                 // 脚下嫩绿光点一圈圈亮起（加成在攒）
      const q = clamp01(E.stT / DUR[CHARGE]), rx = 8 + 14 * q, cx = HX + P.bx;
      for (let k = 0; k < 18; k++) { if (((k + f12) % 3) === 0) continue; const a = k / 18 * 6.2832; put(R(cx + Math.cos(a) * rx), R(FLOOR + Math.sin(a) * 1.5), (k & 1) ? EL[2] : EL[3]); }
    }
    leaves(0, f12);
  }
  function fxFront(f12) {
    const [gx, gy] = sapScr();
    if (P.lg >= 2 && !P.lie && P.dq < 1 && E.state !== CAST) {                                   // 蓄满：树苗顶十字星芒
      const L = 2 + (f12 & 1); for (let r = 2; r <= L + 1; r++) { const c = r === 2 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); }
    }
    leaves(1, f12);
    if (swT < 2 / 12) {                                                                       // 顶撞出手：肩头前两道竖弧
      const first = swT < 1 / 12;
      for (const [rr, c] of [[3, first ? FXR[FXI.impact][0] : FXR[FXI.impact][2]], [5, first ? FXR[FXI.impact][1] : FXR[FXI.impact][3]]]) for (let a = -1.1; a <= 1.1; a += 0.22) { if (!first && (R(a * 10) & 1)) continue; put(R(swX + Math.cos(a) * rr), R(swY + Math.sin(a) * rr * 1.5), c); }
    }
  }

  return {
    name: '北极熊', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.leafG, m.scar], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'nature', style: 'buff', w: 0.75 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
