// 黄鬃马（部队 · 人类 · 守护者 · 普通）：矮壮挽马、金黄蓬鬃 + 金黄毛脚、近侧肩挂圆盾（蓝漆、金马蹄铁徽、盾心法力石）、灰蓝绗缝厚毡衣 + 铺盖卷。
// 攻击：低头胸盾顶撞；技能「厚皮 · 守护光环」：低头刨地 → 小人立 → 双蹄踏地，脚下蔚蓝法阵扩散，连线身后友军，友军头上亮起盾印、法力点上升。
// 身体全部用 parts-beast 的 quad + 马具部件（legsFeather / blanket / peytral / bridle）；本模块只画面部白斑、额鬃和特效。升级 → 汗血马。
PCD.define('YellowManeHorse', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, near, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const C_PALE = near('#d2efff'), C_SKY = near('#72c0ff');
  const R_EL = fxRamp('manaAzure', [21, C_PALE, C_SKY, 41, 40]), EL = FXR[R_EL];            // 护佑 · 蔚蓝法力：白 → 淡天青 → 天蓝 → 钴蓝 → 深蓝
  const R_FUR = fxRamp('bayFur', [32, 19, 20, 20, 0]);                                        // 受击毛屑（枣褐）
  const m = B.mats(E, {
    main: [0, 20, 19, 32], mane: [20, 61, 47, 51], claw: 'iron', eye: [0, 0, 5, 5],          // 枣褐皮、金黄鬃、铁灰蹄
    cloth: 'steel', trim: 'leather', strap: 'leather', plate: 'blue', rim: 'iron', boss: 'steel', emb: [20, 61, 47, 51],
    gem: [39, 40, C_SKY, C_PALE], glow: [C_PALE, C_PALE, 21, 21], white: 'white',
  });
  m.cloth = E.defMat(E.RAMP.steel, 2);                                                        // 大块毡衣用 band 2
  const o = Q.shape({ len: 13, chest: 4.6, rump: 4.6, waist: 0.2, leg: 9, lw: 2, thigh: 2.6, farDx: -2, stride: 3, lift: 2,
    neck: 6, neckA: 1.08, neckW: 2.6, head: { type: 'horse', w: 6, h: 5.5, snout: 5.5, snH: 4, tip: 0.8, earH: 3 }, headA: 0.55,
    tail: 'horse', tailLen: 10, tailA: -1.1, mane: 'none', foot: 'hoof', fur: 0, lieLegs: 0, m });   // lieLegs 0：侧躺时腿收在身下（验收通过的倒地姿）
  const FEATH = { len: 2 };                                                                   // 金黄毛脚
  const MANE = { len: 4.5, lean: 0.62, shag: 1.5, withers: 2 }, FORELOCK = { len: 2 };        // 金黄蓬鬃（立起、往后扫）+ 额鬃
  const COAT = { a: -0.05, b: 0.72, drop: 5, thick: 1, quilt: 1, hem: 'straight', trim: 'trim', girth: 0.9 };
  const SHIELD = { shape: 'round', r: 4.5, fx: 0.6, dy: 1.5, face: 'plate', rim: 'rim', emblem: 'shoe', emb: 'emb', boss: 0, gem: 1, strap: 1 };
  const DROPPED = Object.assign({}, SHIELD, { strap: 0, at: [0, 0], flat: 0 });
  const DROP = { at: 0.66, dur: 0.25, dx: 13, hop: 5 };                                    // 盾在死亡 0.66 s 脱落，0.25 s 滚出 13 格、最高弹起 5 格

  const HX = 70, DUR = DEFAULT_DUR.slice(), hero = new Sprite(96, 60, 46, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['glow', 'gem', 'eye', 'ink', 'spec', 'white']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON);                                                      // gem（宝石档）和 drop / dsx / dsy（掉落物）都在里面
  const P = {}; Q.reset(P);
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach', 'gem'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0, gem: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -2, crouch: 1, head: 2, ear: 1, tail: 1 });
  const A_HIT = pose({ bx: 8, head: 3, pitch: -1, reach: 1, ear: 1, tail: -2, mane: -1, gem: 1 });
  const A_HOLD = pose({ bx: 7, head: 2, ear: 1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ head: 2, crouch: 1, ear: 1, mane: 1, tail: 1, gem: 1 });
  const C_REAR = pose({ pitch: 3, head: -2, paw: 3, jaw: 1, mane: -1, tail: 2, gem: 2 });
  const S_SLAM = pose({ pitch: -1, crouch: 2, head: 1, reach: 1, mane: -1, tail: -1, gem: 3 });
  const S_PROUD = pose({ head: -1, mane: 1, gem: 3 });
  const TOSS = [[-1, -1, 1, 0], [1, 1, 1, 1], [-2, -1, 0, 0], [0, 1, 0, 0], [0, 0, 0, 0]];   // 待机个性「甩鬃」：[head, mane, ear, jaw]
  const T_HIT = 2 / 12;

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);                                            // 盾心石休眠：轮廓光关掉
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)), s = TOSS[k]; P.head = s[0]; P.mane = s[1]; P.ear = s[2]; P.jaw = s[3]; P.eyes = k === 1 ? 1 : 0; P.gem = k === 1 || k === 2 ? 1 : 0; P.rim = P.gem; }
  }
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  const tmp = {};
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P);
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = tq >= 0.12 && tq < 0.25 ? 2 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_LOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); }
      else if (tq < 1.1) { apply(C_LOW); P.paw = ((f12 >> 1) & 1) ? 2 : 0; P.gem = (f12 & 1) ? 2 : 1; }                 // 刨地
      else { E.mix(tmp, C_LOW, C_REAR, ease.out(clamp01((tq - 1.1) / 0.25)), F_ALL); apply(tmp); P.gem = 2; }            // 小人立
      P.rim = 2;
    } else if (st === CAST) {
      if (tq < T_HIT) apply(S_SLAM); else { E.mix(tmp, S_SLAM, S_PROUD, ease.out(clamp01((tq - T_HIT) / 0.15)), F_ALL); apply(tmp); P.gem = tq < 0.34 ? 3 : 2; }
      P.rim = 3;
    } else if (st === RECOVER) { const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_PROUD, REST, q, F_ALL); apply(tmp); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; }
    else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else Q.anim.hurt(P, h); }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12, DROP);                                                        // 胸带断开，盾滚落（掉落物钩子写 P.drop / dsx / dsy）
        P.gem = d < 0.3 ? ((f12 & 1) ? 1 : 0) : d < 0.66 ? 1 : d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 2 : 0; }
    rig = Q.rig(P, o);
    const g = gemLocal(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }
  function gemLocal() {
    if (!P.drop) return Q.peytralAt(rig, o, SHIELD);
    return [8 + P.dsx, P.drop === 2 ? -1 : -SHIELD.r - P.dsy];
  }

  // ───── 画 ─────
  function faceMarks() {                                                                      // 与头同一个部件：鼻梁白斑（从额到鼻）
    const F = Q.headFrame(rig, o);
    const seen = new Set();
    for (let u = F.W * 0.05; u <= F.uT - 1.5; u += 0.34) { const p = F.at(u, F.top(u) + 1.0), k = R(p[0]) * 100 + R(p[1]); if (seen.has(k - 1) || seen.has(k + 1) || seen.has(k)) continue; seen.add(k); U.dot(E, p[0], p[1], m.white, u < F.W * 0.5 ? 4 : 3); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    Q.legsFeather(E, rig, P, o, 1, FEATH);
    Q.tail(E, rig, P, o);
    Q.body(E, rig, P, o);
    Q.legsFeather(E, rig, P, o, 0, FEATH);
    Q.blanket(E, rig, P, o, COAT);
    if (!P.drop) Q.peytral(E, rig, P, o, SHIELD);
    Q.maneCrest(E, rig, P, o, MANE);
    Q.head(E, rig, P, o); faceMarks();
    Q.forelock(E, rig, P, o, FORELOCK);
    if (P.drop) { const g = gemLocal(), landed = P.drop === 2; DROPPED.at = [g[0], landed ? 0 : g[1]]; DROPPED.flat = landed ? 1 : 0; Q.peytral(E, rig, P, o, DROPPED); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ALLY = [HX - 24, HX - 40], ALLY_Y = HY - 13;                                         // 身后两名友军的位置（屏幕坐标）
  const glyT = [9, 9];
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, manaAcc = 0, lastGf = -9, lastPaw = 0, auraT = 9, swT = 9, swX = 0, swY = 0;
  const gemScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = gemScr(), hx = scrX(10);
      releaseOrbit(40, 90, 0.3, 0.6); burst(gx, gy, 18, 40, 100, 0.25, 0.55, R_EL, 8); ring(gx, gy, 1, R_EL);
      fx.circle(HX - 6, FLOOR, 27, 4, R_EL, 1.3, 1, 0); fx.dome(HX - 2, FLOOR, 17, 21, R_EL, 0.75, 1);
      for (let i = 0; i < 10; i++) spawn(K_DUST, hx + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 40, -6 - Math.random() * 12, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.28, 2); flash(0.05); auraT = 0;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [gx, gy] = gemScr(), cx = DUMMY_X - 5, cy = HY - 12;
      swT = 0; swX = gx + SHIELD.r; swY = gy;
      burst(cx, cy, 12, 40, 100, 0.15, 0.4, FXI.impact, 10); burst(swX + 1, swY, 6, 30, 70, 0.15, 0.35, R_EL, 4); hitDummy(0, 1);
      for (let i = 0; i < 4; i++) spawn(K_DUST, scrX(-6) + (Math.random() - 0.5) * 6, HY, -10 - Math.random() * 20, -4 - Math.random() * 8, 0.3 + Math.random() * 0.25, FXI.dust);
      sfx('swing', { kind: 'smash', w: 0.5 }); sfx('hit', { mat: 'wood', w: 0.5 });
    }
    if (s === CAST && (t === 0.1 || t === 0.2)) {                                               // 光环连到身后友军：盾印 + 星芒 + 小环
      const k = t === 0.1 ? 0 : 1, [gx, gy] = gemScr(), ax = ALLY[k];
      fx.link(gx, gy, ax, ALLY_Y - 4, R_EL, 0.9, 1); fx.cross(ax, ALLY_Y - 6, 5, R_EL, 0.3, 2); ring(ax, HY - 2, 0, R_EL); glyT[k] = 0;
      sfx('impact', { pal: 'arcane', w: k ? 0.4 : 0.6 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 6, 30, 80, 0.2, 0.4, R_FUR, 12);
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.7 });
    }
    if (s === DEATH && t === T_LAND) sfx('hit', { mat: 'metal', w: 0.3 });                          // 盾滚落到地上：铁边磕地一声
  }
  const T_LAND = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;                  // 盾落地的那一帧（12 fps 取整）
  const EVENTS = [[], [], [T_HIT], [], [0.1, 0.2], [], [INCOMING], [INCOMING + 0.66, T_LAND], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = gemScr();
    if (state === CHARGE) {
      chargeAcc += dt * (14 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (P.paw !== lastPaw) { if (P.paw === 0 && lastPaw > 0) for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(11) + (Math.random() - 0.5) * 4, HY, 6 + Math.random() * 14, -5 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust); lastPaw = P.paw; }
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(P.gf === 0 ? 7 : -5) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust); sfx('step', { w: 0.6 }); }
      lastGf = P.gf;
    }
    for (let k = 0; k < 2; k++) if (glyT[k] < 0.8) { manaAcc += dt * 16; while (manaAcc >= 1) { manaAcc -= 1; spawn(K_RISE, ALLY[k] + (Math.random() - 0.5) * 8, HY - 2 - Math.random() * 6, (Math.random() - 0.5) * 4, -12 - Math.random() * 12, 0.5 + Math.random() * 0.4, R_EL); } }
    if ((state === IDLE && P.gem > 0) || state === RECOVER) { emberAcc += dt * (state === IDLE ? 4 : 8); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 2, Math.random() * 8 - 4, -7 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 30, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    glyT[0] += dt; glyT[1] += dt; auraT += dt; swT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; manaAcc = 0; lastGf = -9; lastPaw = 0; auraT = 9; swT = 9; glyT[0] = glyT[1] = 9; }
  function ellipse(cx, cy, rx, ry, f12, c1, c2, gap) {                                        // 地面上的虚线椭圆（光环圈）
    const n = Math.ceil(rx * 4);
    for (let k = 0; k < n; k++) { if (((k + f12) % gap) === 0) continue; const a = k / n * 6.2832; put(R(cx + Math.cos(a) * rx), R(cy + Math.sin(a) * ry), (k & 1) ? c2 : c1); }
  }
  function fxBack(f12) {
    if (P.rim >= 2 && P.lie === 0) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (E.state === CHARGE) { const q = clamp01(E.stT / DUR[CHARGE]); ellipse(HX - 2, FLOOR, 6 + 15 * q, 1.5 + q * 1.5, f12, EL[2], EL[3], q > 0.7 ? 4 : 3); }
    if (auraT < 1.9 && E.state !== CHARGE) { const q = auraT / 1.9, rx = 27 - 3 * q; if (!(q > 0.6 && (f12 & 1))) ellipse(HX - 6, FLOOR + 1, rx, 3, f12 >> 1, q < 0.3 ? EL[1] : EL[2], EL[3], q < 0.5 ? 5 : 2); }
  }
  const GLY = [3, 3, 3, 3, 2, 2, 1, 0];                                                        // 盾印：7 宽 × 8 高的鸢尾盾轮廓，里面一个十字
  function shieldGlyph(x, y, t, f12) {
    if (t > 0.6 && ((f12 + x) & 1)) return;
    const up = R(Math.min(3, t * 6)), c0 = t < 0.1 ? EL[0] : t < 0.45 ? EL[1] : EL[2], c1 = t < 0.2 ? EL[0] : t < 0.5 ? EL[2] : EL[3]; y -= up;
    for (let j = 0; j < 8; j++) { const hw = GLY[j]; put(x - hw, y + j, c0); put(x + hw, y + j, c0); if (j === 0) for (let i = -2; i <= 2; i++) put(x + i, y, c0); }
    for (const [i, j] of [[0, 2], [-1, 3], [0, 3], [1, 3], [0, 4]]) put(x + i, y + j, c1);
  }
  function fxFront(f12) {
    const [gx, gy] = gemScr();
    if (P.gem >= 2 && P.gem <= 3 && !P.lie && P.dq < 1 && E.state !== ATTACK) {
      const L = P.gem === 3 ? 5 : 3 + (f12 & 1);
      for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 4 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); }
    }
    for (let k = 0; k < 2; k++) if (glyT[k] < 0.9) shieldGlyph(ALLY[k], ALLY_Y - 9, glyT[k], f12);
    if (swT < 2 / 12) {                                                                       // 顶撞出手：盾前两道竖弧（第 1 帧亮、第 2 帧断续）
      const first = swT < 1 / 12;
      for (const [rr, c] of [[3, first ? EL[0] : EL[2]], [5, first ? EL[1] : EL[3]]]) for (let a = -1.1; a <= 1.1; a += 0.22) { if (!first && (R(a * 10) & 1)) continue; put(R(swX + Math.cos(a) * rr), R(swY + Math.sin(a) * rr * 1.5), c); }
    }
  }

  return {
    name: '黄鬃马', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.gem], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'arcane', style: 'shield', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
