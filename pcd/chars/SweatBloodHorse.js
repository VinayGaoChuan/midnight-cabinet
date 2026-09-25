// 汗血马（部队 · 人类 · 守护者 · 史诗）：黄鬃马升级。更高更修长的战马，枣红金属光泽的皮毛渗出血色汗珠；金黄长鬃往后飘、金黄毛脚；
// 近侧肩挂蓝漆鸢尾盾（金边、金马蹄铁徽、盾心法力石），皇蓝尖齿马衣（金边、日轮徽），钢面甲 + 额心宝石 + 白羽顶饰。
// 攻击：扬蹄后胸盾冲撞；技能「厚皮 · 圣佑光环」：人立刨空 → 双蹄砸地，双层蔚蓝法阵 + 光罩，连线身后三名友军，光柱落下、盾印 + 日轮、法力点上升。
// 身体全部用 parts-beast 的 quad + 马具部件（legsFeather / blanket / peytral / chamfron / maneCrest / forelock）；本模块只画面部白斑、血汗珠和特效。
PCD.define('SweatBloodHorse', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, near, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_STILL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, fall, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const C_PALE = near('#d2efff'), C_SKY = near('#72c0ff'), C_BAY = near('#962c1a');
  const R_EL = fxRamp('manaAzure', [21, C_PALE, C_SKY, 41, 40]), EL = FXR[R_EL];            // 护佑 · 蔚蓝法力（与黄鬃马同一元素）
  const R_FUR = fxRamp('bloodBayFur', [46, 45, C_BAY, 44, 55]);                               // 受击毛屑（枣红）
  const m = B.mats(E, {
    main: [0, 44, C_BAY, 45], mane: [20, 61, 47, 51], claw: 'iron', eye: [0, 0, 5, 5],       // 枣红金属皮、金黄鬃、铁灰蹄
    trim: 'gold', plate: 'steel', face: 'blue', rim: 'gold', boss: 'steel', emb: [20, 61, 47, 51], sweat: 'blood',
    gem: [39, 40, C_SKY, C_PALE], glow: [C_PALE, C_PALE, 21, 21], white: 'white', plume: 'white', plumeTip: [40, 41, C_SKY, C_PALE],
  });
  m.cloth = E.defMat(E.RAMP.blue, 2);                                                         // 皇蓝马衣用 band 2
  const o = Q.shape({ len: 15, chest: 5, rump: 5, waist: 0.3, leg: 11, lw: 2, thigh: 2.8, farDx: -2, stride: 3.5, lift: 3,
    neck: 7, neckA: 1.1, neckW: 2.8, head: { type: 'horse', w: 6.5, h: 6, snout: 6, snH: 4.4, tip: 0.85, earH: 3 }, headA: 0.5,
    tail: 'horse', tailLen: 12, tailA: -0.9, mane: 'none', foot: 'hoof', fur: 0, lieLegs: 0, m });   // lieLegs 0：侧躺时腿收在身下（验收通过的倒地姿）
  const FEATH = { len: 1 };                                                                   // 金黄毛脚（比黄鬃马短，像金踝环）
  const MANE = { len: 5, lean: 0.72, shag: 2, withers: 2, step: 1.3 }, FORELOCK = { len: 3 }; // 金黄长鬃往后飘
  const CAPA = { a: -0.28, b: 0.93, drop: 10, thick: 1, hem: 'dag', trim: 'trim', emblem: 'sun', emb: 'emb', embX: 0.42 };
  const SHIELD = { shape: 'heater', w: 8, h: 10, fx: 0.5, dy: 1.5, face: 'face', rim: 'rim', emblem: 'shoe', emb: 'emb', boss: 0, gem: 1, strap: 0 };
  const DROPPED = Object.assign({}, SHIELD, { at: [0, 0], flat: 0 });
  const DROP = { at: 0.66, dur: 0.25, dx: 14, hop: 5 };                                    // 盾在死亡 0.66 s 甩脱，0.25 s 飞出 14 格、最高 5 格
  const HELM = { from: -0.45, nose: 3, thick: 1, mat: 'plate', trim: 'trim', gem: 1, plume: 5, strands: 3 };

  const HX = 62, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 72, 50, 66);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['glow', 'gem', 'eye', 'ink', 'spec', 'white', 'sweat']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON);                                                      // gem（宝石档）和 drop / dsx / dsy（掉落物）都在里面
  const P = {}; Q.reset(P);
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach', 'gem'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0, gem: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -3, pitch: 2, head: -1, paw: 2, ear: 1, tail: 1, mane: 1 });
  const A_HIT = pose({ bx: 9, pitch: -1, crouch: 1, head: 3, reach: 2, ear: 1, tail: -2, mane: -1, gem: 2 });
  const A_HOLD = pose({ bx: 8, head: 2, reach: 1, ear: 1, tail: -1, gem: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_REAR = pose({ pitch: 6, head: -2, paw: 3, reach: 2, jaw: 1, mane: 1, tail: 2, gem: 1 });
  const S_SLAM = pose({ pitch: -1, crouch: 2, head: 1, reach: 2, mane: -1, tail: -1, gem: 3 });
  const S_PROUD = pose({ head: -2, mane: 1, tail: 1, gem: 3 });
  const PRANCE = [[-2, 1, 0, 0], [-2, 2, 1, -1], [-1, 1, 0, 0], [0, 0, 0, 1], [0, 0, 0, 0]];   // 待机个性「扬首踏蹄」：[head, paw, jaw, mane]
  const T_HIT = 2 / 12, T_ALLY = [0.08, 0.16, 0.24];

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)), s = PRANCE[k]; P.head = s[0]; P.paw = s[1]; P.jaw = s[2]; P.mane = s[3]; P.gem = k === 1 || k === 2 ? 1 : 0; P.rim = P.gem; }
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
      if (tq < 0.5) { E.mix(tmp, REST, C_REAR, ease.inOut(tq / 0.5), F_ALL); apply(tmp); }
      else { apply(C_REAR); const b = (f12 >> 1) & 1; P.paw = b ? 1 : 3; P.reach = b ? 0 : 2; P.gem = tq < 0.9 ? 1 : ((f12 & 1) ? 2 : 1); P.mane = tq > 1.1 && (f12 & 1) ? 0 : 1; }   // 人立刨空
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
        Q.anim.death(P, d, f12, DROP);                                                        // 盾带断开，鸢尾盾甩落（掉落物钩子写 P.drop / dsx / dsy）
        P.gem = d < 0.3 ? ((f12 & 1) ? 1 : 0) : d < 0.66 ? 1 : d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.gem = tq > 0.85 ? 2 : 0; }
    rig = Q.rig(P, o);
    const g = gemLocal(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }
  const landed = () => P.drop === 2;
  function gemLocal() {
    if (!P.drop) { const c = Q.peytralAt(rig, o, SHIELD); return [c[0], c[1]]; }
    return [9 + P.dsx, landed() ? -1 : -SHIELD.h / 2 - P.dsy];
  }

  // ───── 画 ─────
  function faceMarks() {                                                                      // 与头同一个部件：鼻梁白斑（面甲以下露出的一段）
    const F = Q.headFrame(rig, o), seen = new Set();
    for (let u = F.uT - 3.6; u <= F.uT - 1.5; u += 0.34) { const p = F.at(u, F.top(u) + 1.0), k = R(p[0]) * 100 + R(p[1]); if (seen.has(k - 1) || seen.has(k + 1) || seen.has(k)) continue; seen.add(k); U.dot(E, p[0], p[1], m.white, 3); }
  }
  const SWEAT = [[0.25, 0.4], [0.5, 0.2], [0.7, 0.55], [0.4, 0.8]];                            // 颈侧血汗珠（沿颈的位置, 离颈中线）
  function sweat() {                                                                          // 与躯干同一个部件：颈侧、肩上的血色汗珠，随呼吸换亮点
    if (rig.lie === 2) return; const NB = rig.NB, NT = rig.NT;
    SWEAT.forEach(([q, v], i) => { const x = NB.x + (NT.x - NB.x) * q - 0.6 + v * 0.8, y = NB.y + (NT.y - NB.y) * q + v * 1.5; U.dot(E, x, y, m.sweat, ((i + (P.bob | 0)) & 1) ? 4 : 3); if (i & 1) U.dot(E, x, y + 1, m.sweat, 2); });
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    Q.legsFeather(E, rig, P, o, 1, FEATH);
    Q.tail(E, rig, P, o);
    Q.body(E, rig, P, o); sweat();
    Q.legsFeather(E, rig, P, o, 0, FEATH);
    Q.blanket(E, rig, P, o, CAPA);
    if (!P.drop) Q.peytral(E, rig, P, o, SHIELD);
    Q.maneCrest(E, rig, P, o, MANE);
    Q.head(E, rig, P, o); faceMarks();
    Q.forelock(E, rig, P, o, FORELOCK);
    Q.chamfron(E, rig, P, o, HELM);
    if (P.drop) { const g = gemLocal(); DROPPED.at = [g[0], landed() ? 0 : g[1]]; DROPPED.flat = landed() ? 1 : 0; Q.peytral(E, rig, P, o, DROPPED); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ALLY = [HX - 22, HX - 36, HX - 50], ALLY_Y = HY - 13;                                // 身后三名友军
  const glyT = [9, 9, 9];
  let chargeAcc = 0, fallAcc = 0, emberAcc = 0, soulAcc = 0, manaAcc = 0, lastGf = -9, lastPaw = 0, auraT = 9, swT = 9, swX = 0, swY = 0;
  const gemScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = gemScr(), hx = scrX(12);
      releaseOrbit(45, 100, 0.3, 0.65); burst(gx, gy, 26, 50, 120, 0.25, 0.6, R_EL, 8); ring(gx, gy, 1, R_EL); ring(hx, HY - 1, 1, R_EL);
      fx.circle(HX - 8, FLOOR, 31, 5, R_EL, 1.4, 1, 0); fx.circle(HX - 8, FLOOR, 18, 3, R_EL, 1.4, -1.5, 0); fx.dome(HX - 4, FLOOR, 21, 27, R_EL, 0.85, 1);
      for (let i = 0; i < 14; i++) spawn(K_DUST, hx + (Math.random() - 0.5) * 10, HY, (Math.random() - 0.5) * 50, -8 - Math.random() * 14, 0.4 + Math.random() * 0.3, FXI.dust);
      shake(0.28, 2); flash(0.05); auraT = 0;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [gx, gy] = gemScr(), cx = DUMMY_X - 5, cy = HY - 13;
      swT = 0; swX = gx + SHIELD.w / 2; swY = gy;
      burst(cx, cy, 18, 50, 120, 0.15, 0.45, FXI.impact, 12); burst(swX + 1, swY, 10, 30, 80, 0.15, 0.4, R_EL, 4); ring(cx, cy, 0, R_EL); hitDummy(1, 1); shake(0.1, 1);
      for (let i = 0; i < 6; i++) spawn(K_DUST, scrX(12) + (Math.random() - 0.5) * 6, HY, 10 + Math.random() * 20, -5 - Math.random() * 10, 0.3 + Math.random() * 0.25, FXI.dust);
      sfx('swing', { kind: 'smash', w: 0.7 }); sfx('hit', { mat: 'metal', w: 0.7 });
    }
    if (s === CAST && T_ALLY.includes(t)) {                                                    // 光环连到身后三名友军：光柱落下 + 盾印 + 小环
      const k = T_ALLY.indexOf(t), [gx, gy] = gemScr(), ax = ALLY[k];
      fx.link(gx, gy, ax, ALLY_Y - 4, R_EL, 1.0, 1); fx.pillar(ax, HY - 58, HY, 1, R_EL, 0.38, 1); fx.cross(ax, ALLY_Y - 7, 6, R_EL, 0.35, 2); ring(ax, HY - 2, 0, R_EL); glyT[k] = 0;
      sfx('impact', { pal: 'arcane', w: 0.7 - k * 0.15 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 90, 0.2, 0.45, R_FUR, 12);
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 18; i++) spawn(K_DUST, HX - 20 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.8 });
    }
    if (s === DEATH && t === T_LAND) sfx('hit', { mat: 'metal', w: 0.35 });                          // 鸢尾盾甩落到地上：金属磕地一声
  }
  const T_LAND = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;                  // 盾落地的那一帧（12 fps 取整）
  const EVENTS = [[], [], [T_HIT], [], T_ALLY, [], [INCOMING], [INCOMING + 0.66, T_LAND], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = gemScr();
    if (state === CHARGE) {
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 10, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT > 0.5) { fallAcc += dt * 10; while (fallAcc >= 1) { fallAcc -= 1; fall(HX - 40 + Math.random() * 56, HY - 60 - Math.random() * 8, 0, 25 + Math.random() * 20, FLOOR, R_EL); } }   // 圣佑：光点从天上落下
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) {
        const x = scrX(P.gf === 0 ? 9 : -6);
        for (let i = 0; i < 2; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust);
        spawn(K_STILL, x, HY, 0, 0, 0.35, R_EL); spawn(K_STILL, x + 1, HY, 0, 0, 0.3, R_EL); sfx('step', { w: 0.5 });   // 蹄印留一下蔚蓝余光
      }
      lastGf = P.gf;
    }
    for (let k = 0; k < 3; k++) if (glyT[k] < 0.8) { manaAcc += dt * 14; while (manaAcc >= 1) { manaAcc -= 1; spawn(K_RISE, ALLY[k] + (Math.random() - 0.5) * 8, HY - 2 - Math.random() * 6, (Math.random() - 0.5) * 4, -12 - Math.random() * 12, 0.5 + Math.random() * 0.4, R_EL); } }
    if ((state === IDLE && P.gem > 0) || state === RECOVER) { emberAcc += dt * (state === IDLE ? 4 : 9); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 2, Math.random() * 8 - 4, -7 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 36, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    glyT[0] += dt; glyT[1] += dt; glyT[2] += dt; auraT += dt; swT += dt;
  }
  function fxReset() { chargeAcc = 0; fallAcc = 0; emberAcc = 0; soulAcc = 0; manaAcc = 0; lastGf = -9; lastPaw = 0; auraT = 9; swT = 9; glyT[0] = glyT[1] = glyT[2] = 9; }
  function ellipse(cx, cy, rx, ry, f12, c1, c2, gap) {
    const n = Math.ceil(rx * 4);
    for (let k = 0; k < n; k++) { if (((k + f12) % gap) === 0) continue; const a = k / n * 6.2832; put(R(cx + Math.cos(a) * rx), R(cy + Math.sin(a) * ry), (k & 1) ? c2 : c1); }
  }
  function sunSigil(cx, cy, r, f12, c1, c2) {                                                  // 蓄力时脚下的日轮：圈 + 8 道短芒，芒逐帧转一格
    ellipse(cx, cy, r, r * 0.16, f12, c1, c2, 4);
    for (let k = 0; k < 8; k++) { const a = k / 8 * 6.2832 + (f12 >> 1) * 0.2; for (let j = 1; j <= 2; j++) put(R(cx + Math.cos(a) * (r + j + 1)), R(cy + Math.sin(a) * (r + j + 1) * 0.16), j === 1 ? c1 : c2); }
  }
  function fxBack(f12) {
    if (P.rim >= 2 && P.lie === 0) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (E.state === CHARGE) { const q = clamp01(E.stT / DUR[CHARGE]); sunSigil(HX - 4, FLOOR, 6 + 16 * q, f12, EL[2], EL[3]); }
    if (auraT < 2.0 && E.state !== CHARGE) {
      const q = auraT / 2.0; if (!(q > 0.6 && (f12 & 1))) { ellipse(HX - 8, FLOOR + 1, 30 - 3 * q, 3.5, f12 >> 1, q < 0.3 ? EL[1] : EL[2], EL[3], q < 0.5 ? 5 : 2); ellipse(HX - 8, FLOOR + 1, 17 - 2 * q, 2, (f12 >> 1) + 1, EL[2], EL[3], 3); }
    }
  }
  const GLY = [3, 3, 3, 3, 3, 2, 2, 1, 0];                                                     // 盾印：7 宽 × 9 高，里面是日轮十字
  function shieldGlyph(x, y, t, f12) {
    if (t > 0.6 && ((f12 + x) & 1)) return;
    const up = R(Math.min(4, t * 7)), c0 = t < 0.1 ? EL[0] : t < 0.45 ? EL[1] : EL[2], c1 = t < 0.2 ? EL[0] : t < 0.5 ? EL[1] : EL[3]; y -= up;
    for (let j = 0; j < 9; j++) { const hw = GLY[j]; put(x - hw, y + j, c0); put(x + hw, y + j, c0); if (j === 0) for (let i = -2; i <= 2; i++) put(x + i, y, c0); }
    for (const [i, j] of [[0, 2], [-1, 3], [0, 3], [1, 3], [0, 4], [0, 5], [-2, 3], [2, 3]]) put(x + i, y + j, c1);
    if (t < 0.3) { put(x, y - 2, EL[1]); put(x - 4, y + 2, EL[2]); put(x + 4, y + 2, EL[2]); }
  }
  function fxFront(f12) {
    const [gx, gy] = gemScr();
    if (P.gem >= 2 && P.gem <= 3 && !P.lie && P.dq < 1 && E.state !== ATTACK) {
      const L = P.gem === 3 ? 6 : 3 + (f12 & 1);
      for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); }
      if (P.gem === 3) for (const [i, j] of [[2, 2], [-2, -2], [2, -2], [-2, 2]]) put(gx + i, gy + j, EL[1]);
    }
    for (let k = 0; k < 3; k++) if (glyT[k] < 0.9) shieldGlyph(ALLY[k], ALLY_Y - 10, glyT[k], f12);
    if (swT < 2 / 12) {                                                                       // 冲撞出手：盾前三道竖弧
      const first = swT < 1 / 12;
      for (const [rr, c] of [[3, first ? EL[0] : EL[2]], [5, first ? EL[1] : EL[3]], [7, first ? EL[2] : EL[3]]]) for (let a = -1.1; a <= 1.1; a += 0.18) { if (!first && (R(a * 10) & 1)) continue; put(R(swX + Math.cos(a) * rr), R(swY + Math.sin(a) * rr * 1.5), c); }
    }
  }

  return {
    name: '汗血马', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.gem], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'arcane', style: 'shield', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
