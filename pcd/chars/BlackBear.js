// 黑熊（部队 · 虚空 · 先锋 · 史诗）：北极熊的黑化分支。巨型肩峰熊：肩峰比北极熊高一倍、臀小收腹的强楔形，颈部蓬起鬃毛圈；
// 背上的树苗长成一根扭曲焦黑的枝，枝头垂一颗发红光的禁果；背脊一排焦裂纹透出熔红（法力越满越亮）；胸前骨白月牙斑；保留左耳缺角 + 鼻梁紫裂痕。
// 攻击：人立后双掌合拢向下砸（同族唯一人立的熊）。技能「禁果」：人立蓄力，火星螺旋吸入禁果、禁果涨大、背裂纹一条条亮起，火线连到假人记下仇恨；
// 施放：双掌砸地的同时禁果炸开（火焰 nova + 36 颗外爆 + 地裂），火线顺连线烧到假人再炸一团火。死亡：禁果与裂纹亮到白，身体膨胀后炸成熔红碎块。
PCD.define('BlackBear', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.fire, EL = FXR[R_EL];                                                     // 禁果 · 熔火：白 → 淡黄 → 橙 → 红 → 深红
  const R_FUR = fxRamp('blackBearFur', [19, 20, 52, 0, 0]);                                   // 黑褐毛屑
  const m = B.mats(E, {
    main: [0, 52, 20, 19], mane: [0, 20, 19, 32], claw: [0, 27, 29, 30], eye: [0, 0, 57, 58], nose: [0, 0, 0, 0],   // 黑褐熊毛（暗部偏虚空紫黑）、蓬鬃、钢灰爪、红眼
    moon: 'bone', branch: [0, 0, 52, 53], scar: [42, 42, 43, 43],
    fruit0: [55, 12, 13, 26], fruit1: [44, 45, 46, 47], fruit2: [45, 47, 21, 21],              // 禁果：暗红 → 熔红 → 亮白
    crack: [44, 44, 44, 45], crackL: [45, 46, 47, 21],                                        // 背裂纹：暗熔 / 亮熔
  });
  const SHAPE = { len: 16, chest: 7, rump: 5, waist: 0.35, hump: 3.5, leg: 6, lw: 3, thigh: 3.2, farDx: -2, stride: 2, lift: 2,
    neck: 2.5, neckA: 0.15, neckW: 4, head: { type: 'bear', w: 7.5, h: 6.5, snout: 3.2, snH: 3.8, tip: 0.85, earH: 2 }, headA: 0.15,
    tail: 'stub', foot: 'pad', mane: 'ruff', maneLen: 2, fur: 1, m };
  const o = Q.shape(SHAPE), oBig = Q.shape(Object.assign({}, SHAPE, { chest: 8, rump: 6, hump: 4 }));   // oBig：临死膨胀 1 格

  const HX = 62, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 64, 50, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 17, 24], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'nose', 'claw', 'ink', 'scar', 'fruit0', 'fruit1', 'fruit2', 'crack', 'crackL', 'spec', 'moon']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：raise 前掌举起 0 / 1 近侧 / 2 双掌 · fs 禁果大小 0–2（3 = 炸开）· fl 禁果亮度 0–3 · cr 亮起的背裂纹 0–4 · swell 膨胀 · shk 发抖
  const EXTRA = [['raise', 0, 2], ['fs', 0, 3], ['fl', 0, 3], ['cr', 0, 4], ['swell', 0, 1], ['shk', -1, 1]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.raise = 0; P.fs = 0; P.fl = 0; P.cr = 0; P.swell = 0; P.shk = 0; }
  reset();
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o), oo = o;

  // ───── 禁果枝几何（肩峰上，x = BX） ─────
  const BX = 5, TWIST = [0, 0, -1, -1, 0, 0, 1];                                              // 枝 7 格，扭两下
  const branchBase = (rg, sh) => { const s = Q.span(rg, sh, BX); return [BX, (s ? s[0] : -20) - 1]; };
  function fruitAt(rg, sh) { const b = branchBase(rg, sh), sw = (P.mane | 0) + (P.shk | 0); return [b[0] + 4 + (sw > 0 ? 1 : sw < 0 ? -1 : 0), b[1] - TWIST.length + 2 + (P.fs >= 2 ? 1 : 0)]; }
  // 人立举掌：改写前腿的脚点（腿画法不变，脚垫朝上变成举起的掌）
  function raiseLegs(rg) {
    if (!P.raise || rg.lie) return;
    for (const L of rg.legs) {
      if (!L.front || (P.raise === 1 && L.far)) continue;
      const a = L.far ? -0.95 : -0.7, e = L.L * 0.95; L.F = [L.T[0] + Math.cos(a) * e + 1, L.T[1] + Math.sin(a) * e]; L.up = true;
    }
  }

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_REAR = pose({ bx: -1, pitch: 6, head: -1, jaw: 2, tail: 1, mane: 1 });
  const A_SLAM = pose({ bx: 6, pitch: -1, crouch: 1, reach: 4, head: 2, jaw: 1, tail: -2, mane: -1 });
  const A_HOLD = pose({ bx: 5, crouch: 1, reach: 3, head: 1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_REAR, 'out'], [2 / 12, A_SLAM, 'snap'], [0.25, A_SLAM, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_REAR = pose({ pitch: 6, head: -1, jaw: 1, tail: 1, mane: 1 });
  const S_SLAM = pose({ bx: 2, pitch: -1, crouch: 2, reach: 3, head: 2, jaw: 3, tail: -2, mane: -1 });
  const S_ROAR = pose({ bx: 2, crouch: 1, reach: 2, head: 0, jaw: 2, tail: -1 });
  const T_HIT = 2 / 12, T_BOOM = 10 / 12;                                                    // T_BOOM：死亡里炸开的时刻（状态内秒）
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)); P.head = k < 4 ? -2 : -1; P.jaw = k === 1 || k === 2 ? 1 : 0; P.ear = 1; P.fl = k === 2 ? 2 : k === 1 || k === 3 ? 1 : 0; P.cr = k === 2 ? 4 : k === 3 ? 2 : 0; P.fs = k === 2 ? 1 : 0; }   // 待机个性：扭头嗅禁果，果子脉动、裂纹闪红
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); P.head = P.head + (P.gf === 0 || P.gf === 2 ? 1 : 0); const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.raise = tq >= 0.04 && tq < T_HIT ? 2 : 0; P.fl = tq >= T_HIT && tq < 0.25 ? 1 : 0; }
    else if (st === CHARGE) {
      if (tq < 0.5) { E.mix(tmp, REST, C_REAR, ease.inOut(tq / 0.5), F_ALL); apply(tmp); P.raise = tq >= 0.25 ? 2 : 1; } else { apply(C_REAR); P.raise = 2; }
      P.fs = tq < 0.5 ? 0 : tq < 1.0 ? 1 : 2; P.cr = Math.min(4, 1 + Math.floor(tq / 0.3)); P.fl = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      if (tq >= 1.1) P.shk = (f12 & 1) ? 1 : -1;
    } else if (st === CAST) {
      if (tq < T_HIT) apply(S_SLAM); else { E.mix(tmp, S_SLAM, S_ROAR, ease.out(clamp01((tq - T_HIT) / 0.2)), F_ALL); apply(tmp); }
      P.fs = 3; P.fl = 3; P.cr = 4; P.rim = 3;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_ROAR, REST, q, F_ALL); apply(tmp);
      P.fs = tq < 0.3 ? 3 : 0; P.fl = 0; P.cr = tq < 0.2 ? 3 : tq < 0.4 ? 1 : 0; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0;   // 禁果缩成暗红小果重新挂上枝头
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.2) P.cr = 2; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { Q.anim.death(P, d, f12); P.cr = 2 + (f12 & 1); P.fl = 1 + (f12 & 1); }
      else { P.bx = -2; P.swell = 1; P.pitch = 1; P.head = -2; P.jaw = 3; P.eyes = 1; P.tail = 2; P.mane = 1; P.cr = 4; P.fl = 3; P.fs = 2; P.shk = (f12 & 1) ? 1 : -1; P.flash = tq >= T_BOOM - 1 / 12 - 1e-6 ? 1 : 0; }
      if (t >= T_BOOM - 1e-6) P.dq = 1;                                                        // 炸开之后由死亡套件画碎块
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    oo = P.swell ? oBig : o; rig = Q.rig(P, oo); raiseLegs(rig);
    const g = fruitAt(rig, oo); P.gx = g[0] + P.bx; P.gy = g[1] + 1;
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：forbiddenBranch（背上扭曲焦黑的枝 + 横出的果柄）
  function branch() {
    E.part(); const [x0, y0] = branchBase(rig, oo), sw = (P.mane | 0) + (P.shk | 0);
    let x = x0, y = y0;
    for (let j = 0; j < TWIST.length; j++) { x = x0 + TWIST[j] + (j >= 4 && sw ? Math.sign(sw) : 0); y = y0 - j; U.dot(E, x, y, m.branch, j === 3 ? 4 : 0); if (j < 2) U.dot(E, x + 1, y, m.branch, 0); }
    U.dot(E, x + 1, y - 1, m.branch, 4); U.dot(E, x + 2, y - 1, m.branch, 0); U.dot(E, x + 3, y, m.branch, 0);     // 果柄往前弯下
    U.dot(E, x - 1, y - 1, m.branch, 0); U.dot(E, x - 2, y - 2, m.branch, 4);                                       // 后面一根焦刺
  }
  const FRUIT = [[[0, 0], [1, 0], [0, 1], [1, 1]], [[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [1, 0], [-1, 1], [0, 1], [1, 1], [2, 1], [-1, 2], [0, 2], [1, 2], [2, 2], [0, 3], [1, 3]]];
  // 候选部件：forbiddenFruit（悬垂的发光禁果，3 档大小、4 档亮度；fs 3 = 炸开只剩果柄）
  function fruit() {
    if (P.fs >= 3) return; E.part(); const [fx0, fy0] = fruitAt(rig, oo), mat = P.fl >= 2 ? m.fruit2 : P.fl === 1 ? m.fruit1 : m.fruit0;
    for (const [dx, dy] of FRUIT[P.fs]) { const t = P.fl >= 3 ? 4 : dx <= 0 && dy <= 1 ? 4 : dy >= (P.fs + 1) ? 2 : 3; U.dot(E, fx0 + dx, fy0 + dy, mat, t); }
  }
  // 与躯干同一个部件：背脊焦裂纹（cr 条亮起）+ 胸前骨白月牙
  function bodyMarks() {
    if (rig.lie === 2) return;
    const C1 = rig.C1, C2 = rig.C2;
    for (let k = 0; k < 4; k++) {
      const x = R(C2.x + 3 + k * (C1.x - C2.x - 3) / 4), s = Q.span(rig, oo, x); if (!s) continue; const lit = k < P.cr, mat = lit ? m.crackL : m.crack;
      U.dot(E, x, s[0] + 2, mat, lit ? 3 : 2); U.dot(E, x + 1, s[0] + 3, mat, lit ? (P.cr >= 4 ? 4 : 3) : 3); U.dot(E, x, s[0] + 4, mat, lit ? 2 : 2);
    }
    const mx = C1.x + C1.r * 0.45, my = C1.y + C1.r * 0.25;
    [[0, 0], [1, 1], [2, 1], [3, 0], [-1, -1]].forEach(([dx, dy], i) => U.dot(E, mx + dx, my + dy, m.moon, i === 1 ? 4 : 3));
  }
  function farEar() {
    if (rig.lie === 2) return;
    E.part(); const F = Q.headFrame(rig, oo), b = F.at(F.W * 0.12, -F.Hh + 0.3), x = R(b[0]), y = R(b[1]);
    U.dot(E, x, y - 1, m.far, 0); U.dot(E, x + 1, y - 1, m.far, 0); U.dot(E, x, y - 2, m.far, 0); U.dot(E, x, y, m.far, 0); U.dot(E, x + 1, y, m.far, 0);
  }
  function scar() {
    const F = Q.headFrame(rig, oo, P.jaw), W = F.W;
    [[W * 0.45, 1, 3], [W * 0.62, 1.4, 4], [W * 0.8, 1.8, 2]].forEach(([u, dv, t]) => { const p = F.at(u, F.top(u) + dv); U.dot(E, p[0], p[1], m.scar, t); });
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const legsLast = rig.lie === 2;
    const up = P.raise && !rig.lie;                                                            // 举起的前掌画在头之后（否则被鬃毛和头挡住）
    if (!legsLast) { Q.leg(E, rig, P, oo, 0); if (!up || P.raise === 1) Q.leg(E, rig, P, oo, 1); }
    Q.tail(E, rig, P, oo);
    if (!rig.lie) branch();
    Q.body(E, rig, P, oo); bodyMarks();
    if (!legsLast) { Q.leg(E, rig, P, oo, 2); if (!up) Q.leg(E, rig, P, oo, 3); }
    Q.mane(E, rig, P, oo);
    farEar();
    Q.head(E, rig, P, oo); scar();
    if (up) { if (P.raise === 2) Q.leg(E, rig, P, oo, 1); Q.leg(E, rig, P, oo, 3); }
    if (legsLast) { Q.legs(E, rig, P, oo, 1); Q.legs(E, rig, P, oo, 0); }
    if (!rig.lie) fruit();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastGf = -9, swT = 9, swX = 0, swY = 0, lineT = 9;
  const fruitScr = () => [scrX(P.gx), HY + P.gy];
  const pawScr = () => { const L = rig.legs[3]; return [scrX(R(L.F[0]) + P.bx + 2), HY + R(L.F[1])]; };
  const TGT = [DUMMY_X - 3, HY - 15];
  function onEnter(s) {
    if (s === CHARGE) lineT = 9;
    if (s === CAST) {                                                                          // 双掌砸地 + 禁果炸开
      poseAt(CAST, 0, E.simT); const [gx, gy] = fruitScr(), [px, py] = pawScr();
      releaseOrbit(50, 110, 0.3, 0.6); burst(gx, gy, 36, 60, 150, 0.3, 0.75, R_EL, 12); ring(gx, gy, 1, R_EL); ring(px, HY - 2, 1, R_EL);
      fx.cross(gx, gy, 7, R_EL, 0.3, 2); fx.crack(px, FLOOR, 16, 1, R_EL, 0.9); fx.crack(px - 2, FLOOR, 12, -1, R_EL, 0.8);
      for (let i = 0; i < 12; i++) spawn(K_DUST, px + (Math.random() - 0.5) * 12, HY - 1, (Math.random() - 0.5) * 50, -10 - Math.random() * 20, 0.4 + Math.random() * 0.3, FXI.dust);
      shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'fire', w: 0.9 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                         // 双掌砸下：两道竖爪痕 + 撞击火花
      const [px, py] = pawScr(); swT = 0; swX = Math.min(px + 2, DUMMY_X - 6); swY = HY - 12;
      burst(DUMMY_X - 4, HY - 12, 14, 40, 110, 0.15, 0.4, FXI.impact, 8); burst(px, HY - 1, 6, 20, 60, 0.2, 0.4, R_FUR, 14); hitDummy(1, 1);
      for (let i = 0; i < 5; i++) spawn(K_DUST, px + (Math.random() - 0.5) * 8, HY, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.3 + Math.random() * 0.3, FXI.dust);
      shake(0.08, 1); sfx('swing', { kind: 'smash', w: 0.9 }); sfx('hit', { mat: 'flesh', w: 0.9 });
    }
    if (s === CHARGE && t === 0.5) { const [hx, hy] = [scrX(R(rig.hit[0]) + P.bx), HY + R(rig.hit[1])]; fx.link(hx, hy, TGT[0], TGT[1], R_EL, 0.9, 1); fx.cross(TGT[0], TGT[1], 3, R_EL, 0.25, 2); }   // 记下仇恨
    if (s === CAST && t === 0.08) { lineT = 0; const [hx, hy] = [scrX(R(rig.hit[0]) + P.bx), HY + R(rig.hit[1])]; fx.link(hx, hy, TGT[0], TGT[1], R_EL, 0.35, 1); }
    if (s === CAST && t === 0.25) {                                                            // 火线烧到假人：再炸一团火
      burst(TGT[0], TGT[1], 30, 50, 130, 0.3, 0.7, R_EL, 14); ring(TGT[0], TGT[1], 1, R_EL); fx.cross(TGT[0], TGT[1], 6, R_EL, 0.3, 2);
      hitDummy(1, 1); dummyFx({ dur: 1.3, tint: 'fire' }); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.7 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.25, 0.5, R_FUR, 12);
    if (s === DEATH && t === T_BOOM) {                                                         // 爆裂：先画好膨胀发白的这一帧，再交给死亡套件炸成碎块
      poseAt(DEATH, T_BOOM - 1e-3, E.simT); P.flash = 0; drawHero(); bakeHero();
      death.start('burst', { power: 1.1, fromX: 2, fromY: -16, fadeAt: 1.1, fadeDur: 0.6 });
      const cx = HX - 2, cy = HY - 16;
      burst(cx, cy, 40, 60, 160, 0.3, 0.8, R_EL, 16); ring(cx, cy, 1, R_EL); fx.cross(cx + 6, cy - 12, 7, R_EL, 0.3, 2);
      shake(0.22, 2); flash(0.05); sfx('impact', { pal: 'fire', w: 1 });
      poseAt(DEATH, T_BOOM, E.simT);
    }
  }
  const EVENTS = [[], [], [T_HIT], [0.5], [0.08, 0.25], [], [INCOMING], [T_BOOM], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = fruitScr();
    if (state === CHARGE) {                                                                    // 火星从地面螺旋吸进禁果
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                   // 蹒跚重步：每步 4 颗尘土
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 4; i++) spawn(K_DUST, scrX(P.gf === 0 ? 11 : -7) + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 7, 0.3 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 0.9 }); }
      lastGf = P.gf;
    }
    if ((state === IDLE && P.fl > 0) || state === RECOVER) { emberAcc += dt * (state === IDLE ? 6 : 9); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + R(Math.random() * 2 - 1), gy, Math.random() * 8 - 4, -7 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_EL); } }
    if (state === DEATH && stT > T_BOOM && stT < INCOMING + 2.2) {                             // 余烬 + 魂光
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; const x = HX - 16 + Math.random() * 30; spawn(K_RISE, x, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, stT > INCOMING + 1.4 ? FXI.soul : R_EL); }
    }
    swT += dt; lineT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastGf = -9; swT = 9; lineT = 9; }
  function fxBack(f12) { if (P.rim >= 2 && P.lie === 0 && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function fxFront(f12) {
    const [gx, gy] = fruitScr();
    if (P.fl >= 2 && P.fs < 3 && P.dq < 1 && E.state === CHARGE) {                             // 蓄满：禁果十字光
      const L = 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = r === 3 ? EL[1] : EL[2]; put(gx + r, gy + 1, c); put(gx - r + 1, gy + 1, c); put(gx, gy - r + 1, c); }
    }
    if (lineT < 0.17) {                                                                        // 施放：火头顺着连线烧向假人（2 格火团 + 拖尾）
      const [hx, hy] = [scrX(R(rig.hit[0]) + P.bx), HY + R(rig.hit[1])], q = ease.in(clamp01(lineT / 0.17));
      for (let k = 0; k < 6; k++) { const qq = Math.max(0, q - k * 0.05), x = R(hx + (TGT[0] - hx) * qq), y = R(hy + (TGT[1] - hy) * qq); put(x, y, EL[Math.min(4, k)]); if (k < 2) { put(x, y - 1, EL[k + 1]); put(x + 1, y, EL[k]); } }
    }
    if (swT < 2 / 12) {                                                                        // 砸下的两道竖爪痕（每道 3 条）
      const first = swT < 1 / 12, c = first ? FXR[FXI.impact][0] : FXR[FXI.impact][2];
      for (let k = 0; k < 3; k++) for (let j = -5; j <= 3; j++) { if (!first && ((j + k) & 1)) continue; put(swX + k * 2 + (j < 0 ? 0 : 1), swY + j, j < -3 ? FXR[FXI.impact][1] : c); }
    }
  }

  return {
    name: '黑熊', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.fruit1, m.fruit2, m.crackL, m.scar], HIT_POINT, EVENTS,
    deathKit: { mode: 'burst', at: T_BOOM },
    SFX: { body: 'beast', how: 'explode', pal: 'fire', style: 'nova', w: 0.9 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
