// 翡翠龙（部队 · 精灵 · 先锋 · 优质）：圆滚矮胖的开花幼龙，背脊一排粉色花苞代替背刺、一对翠绿叶片小膜翼、短粗尾巴尖端一朵花。
// 攻击：扑前一口咬合；技能「芬芳」：深吸一口气 → 背上花苞由后往前依次绽放 → 花朵一抖，一圈贴地的粉绿香雾环向两侧扩散 → 假人被熏得摇晃变慢、头顶飘花瓣冒小泡。
// 身体用 parts-beast 的 quad（dragon 头型）拼；叶片翼、背脊花苞、尾花是本模块的自画部件（候选部件）。升级 → 毒龙（保留花脊、叶翼、尾花）。
PCD.define('EmeraldDragon', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('fragrance', [21, 38, 50, 36, 34]), EL = FXR[R_EL];        // 芬芳 · 花粉毒：白 → 淡黄绿 → 黄绿 → 绿 → 墨绿
  const R_POL = fxRamp('pollenPink', [21, 63, 50, 36, 34]), PL = FXR[R_POL];       // 花粉：第 2 级换成粉色（香甜的毒）
  const R_PET = fxRamp('petalPink', [21, 58, 63, 12, 11]);                         // 飘落的花瓣
  const R_SCALE = fxRamp('emeraldScale', [38, 37, 36, 35, 34]);                    // 受击鳞屑
  const m = B.mats(E, {
    main: [34, 36, 37, 38], belly: [35, 37, 38, 5],                               // 翠绿鳞、浅黄绿腹线
    leaf: [34, 35, 36, 37], vein: 'moss', petal: 'pink', stamen: 'gold',          // 叶翼（深绿叶脉）、粉花苞、金花蕊
    eye: [0, 0, 14, 5], horn: 'bone', claw: 'bone',
  });
  m.leafFar = E.defMat([34, 35, 35, 36], 1); m.veinFar = E.defMat([0, 34, 34, 35], 1);
  const SHAPE = { len: 10, chest: 4.6, rump: 4.3, waist: 0.1, hump: 0, leg: 4, lw: 2, thigh: 2.6, farDx: -2, stride: 2, lift: 2, foot: 'claw',
    neck: 2, neckA: 0.75, neckW: 2.7, head: { type: 'dragon', w: 7, h: 6, snout: 3.5, snH: 3.2, tip: 0.8, horn: 'short', hornLen: 3, teeth: 1 }, headA: 0.12,
    tail: 'long', tailLen: 7, tailA: 0.05, tailW: 3.6, tailCurl: 0.9, mane: 'none', fur: 0, pattern: null, lieLegs: 1, m };
  const o = Q.shape(SHAPE), oPuff = Q.shape(Object.assign({}, SHAPE, { chest: SHAPE.chest + 0.8 }));   // 深吸气：胸部鼓 1 格
  const shp = () => (P.puff ? oPuff : o);

  const HX = 66, DUR = DEFAULT_DUR.slice(), hero = new Sprite(88, 54, 44, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'ink', 'spec', 'claw', 'teeth', 'horn', 'stamen']) RIM.skip[m[k]] = 1;
  // 自己的姿势字段：bloom 花开 0–8（每朵花 0 苞 · 1 半开 · 2 盛开，由后往前两档一朵）· puff 胸鼓 · bud 苞尖微张 / 盛开时一抖 · wilt 0 / 1 合拢垂下 / 2 花瓣散落
  const SPEC = Q.KEYS.concat(B.COMMON, [['bloom', 0, 8], ['puff', 0, 1], ['bud', 0, 1], ['wilt', 0, 2]]);
  const P = {};
  function reset() { Q.reset(P); P.bloom = 0; P.puff = 0; P.bud = 0; P.wilt = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail', 'reach', 'wing'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, tail: 0, reach: 0, wing: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -1, crouch: 2, head: 1, tail: 1, wing: 1 });
  const A_HIT = pose({ bx: 5, pitch: 1, reach: 2, jaw: 3, tail: -2, wing: 1 });
  const A_HOLD = pose({ bx: 4, reach: 1, jaw: 1, tail: -1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_BREATH = pose({ pitch: 1, head: -1, tail: -1, wing: 1 });                 // 四肢站定、抬胸吸气
  const S_CAST = pose({ head: 1, jaw: 2, tail: 2, wing: 2 });                        // 呼～：花一抖、叶翼张开
  const SNEEZE = [[-2, 0, 0, 0], [-2, 0, 1, 0], [2, 2, 1, -1], [1, 1, 1, 0], [0, 0, 0, 0]];   // 待机个性「嗅花打喷嚏」：[head, jaw, eyes, pitch]
  const T_HIT = 2 / 12, T_CAST = [0.1, 0.22, 0.34], T_FALL = INCOMING + 0.66;
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.bud = P.bob;                   // 花苞随呼吸微微开合
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)), s = SNEEZE[k]; P.head = s[0]; P.jaw = s[1]; P.eyes = s[2]; P.pitch = s[3]; P.tail = k === 2 ? -2 : P.tail; }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                           // 摇摆小跑：短腿快倒腾，尾花一甩一甩
      const f = Q.anim.walk(P, tq); P.tail = [-2, 0, 2, 0][f]; P.bud = f & 1; P.head = f === 0 ? 1 : f === 2 ? -1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = tq >= 0.12 && tq < 0.25 ? 1 : 0; }
    else if (st === CHARGE) {
      E.mix(tmp, REST, C_BREATH, ease.inOut(clamp01(tq / 0.7)), F_ALL); apply(tmp);
      P.puff = tq >= 0.3 ? 1 : 0; P.bloom = Math.max(0, Math.min(8, R((tq - 0.4) / 0.75 * 8)));
      if (tq > 1.1) P.tail = (f12 & 1) ? 0 : -1;                                     // 蓄满：尾巴抖
      P.rim = 2;
    } else if (st === CAST) {
      E.mix(tmp, C_BREATH, S_CAST, ease.out(clamp01(tq / 0.12)), F_ALL); apply(tmp);
      P.bloom = 8; P.bud = tq < 2 / 12 ? 1 : 0; P.rim = 3;
    } else if (st === RECOVER) {
      E.mix(tmp, S_CAST, REST, ease.inOut(clamp01(tq / 0.6)), F_ALL); apply(tmp);
      P.bloom = Math.max(0, R(8 * (1 - clamp01((tq - 0.1) / 0.45))));                // 花慢慢收回花苞
      if (tq >= 0.25 && tq < 0.55) { P.tail = (f12 >> 1) & 1 ? 2 : -2; P.eyes = 1; }   // 满足地甩尾
      P.rim = tq < 0.3 ? 2 : tq < 0.5 ? 1 : 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.35) P.wing = 1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else { Q.anim.death(P, d, f12); P.wing = d < 0.3 ? 1 : 3; P.wilt = d < 0.3 ? 0 : P.lie === 2 ? 2 : 1; }   // 侧倒伸腿，花苞合拢垂下 → 花瓣散落
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, shp());
    const g = focusLocal(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }
  // 发光焦点：背上最高那朵花（技能汇聚、轮廓光都围着它）
  function focusLocal() {
    if (rig.lie) return [rig.C1.x, rig.C1.y];
    const x = BUDS[2][0], s = Q.span(rig, shp(), x); return [x, (s ? s[0] : rig.C1.y - 4) - 3];
  }

  // ───── 自画部件 ─────
  // 候选部件：leafWing 叶片翼（一片尖椭圆的叶：叶柄在翼根、翼骨就是中脉 + 斜向侧脉；pose 0 收在背上 · 1 半张 · 2 张开 · 3 垂落）
  //   c = { len 叶长, w 半宽, holes 0 / 1 破洞枯叶（参差叶缘 + 两个洞）}；材质 mm.leaf / vein（远侧 leafFar / veinFar）
  const LEAF_A = [0.38, 0.95, 1.4, -0.12];
  function leafWing(x, y, pose, c, far) {
    part();
    const a = LEAF_A[pose | 0], L = c.len * (pose === 0 ? 0.9 : 1), Wd = c.w, dx = -Math.cos(a), dy = -Math.sin(a), nx = -dy, ny = dx;
    const mem = far ? m.leafFar : m.leaf, vein = far ? m.veinFar : m.vein, tx = x + dx * L, ty = y + dy * L;
    for (let Y = Math.floor(Math.min(y, ty) - Wd - 1); Y <= Math.ceil(Math.max(y, ty) + Wd + 1); Y++) for (let X = Math.floor(Math.min(x, tx) - Wd - 1); X <= Math.ceil(Math.max(x, tx) + Wd + 1); X++) {
      const px = X - x, py = Y - y, u = px * dx + py * dy, v = px * nx + py * ny; if (u < -0.4 || u > L + 0.3) continue;
      const q = clamp01(u / L), hw = Math.max(0.45, Wd * Math.sin(Math.PI * Math.pow(q, 0.8))); if (Math.abs(v) > hw + 0.25) continue;
      let mat = mem, t = 0;
      if (Math.abs(v) < 0.55 && u < L - 0.8) { mat = vein; t = 0; }                   // 中脉（翼骨）
      else if (Math.abs(v) < hw - 0.5) { const s = u - Math.abs(v) * 1.1; if (((s % 3) + 3) % 3 < 0.7 && u > 1.5) { mat = vein; t = 3; } }   // 侧脉
      U.dot(E, X, Y, mat, t);
    }
  }
  // 候选部件：spineFlowers 背脊花苞（沿背线一排花苞 / 花，画在躯干之前，只露出伸出背线的部分；读 P.bloom bud wilt）
  const BUDS = [[-7, 3], [-3, 3], [1, 4], [5, 3]];                                  // [本地 x（臀后 → 肩），高出背线格数]；间距 4，花苞之间留缝
  const MASK = {
    bud3: ['..sss..', '..ppp..', '...p...'], bud3o: ['..sss..', '..ppp..', '..p.p..'],
    bud4: ['..sss..', '..ppp..', '..ppp..', '...p...'], bud4o: ['..sss..', '..ppp..', '..ppp..', '..p.p..'],
    half3: ['...s...', '..sss..', '.ppppp.', '.p.p.p.'], half4: ['...s...', '..sss..', '.ppppp.', '.ppppp.', '.p.p.p.'],
    open3: ['...s...', '..sss..', '.ppppp.', 'ppgpgpp', 'p.p.p.p'], open4: ['...s...', '..sss..', '.ppppp.', 'ppppppp', 'ppgpgpp', 'p.p.p.p'],
    wilt3: ['..sss..', '.pp....', 'pp.....'], wilt4: ['..sss..', '.ppp...', 'pp.....', 'p......'],
  };
  function stamp(mask, x, y0) {                                                      // 自下而上逐行，中心列对齐 x
    for (let i = 0; i < mask.length; i++) { const row = mask[i], c0 = (row.length - 1) >> 1; for (let j = 0; j < row.length; j++) { const ch = row[j]; if (ch === '.') continue; U.dot(E, x + j - c0, y0 - i, ch === 's' ? m.leaf : ch === 'g' ? m.stamen : m.petal, 0); } }
  }
  function spineFlowers() {
    part(); const oo = shp();
    for (let k = 0; k < BUDS.length; k++) {
      const [x, h] = BUDS[k], s = Q.span(rig, oo, x); if (!s) continue;
      const stage = Math.max(0, Math.min(2, P.bloom - 2 * k));
      let name = P.wilt ? 'wilt' : stage === 2 ? 'open' : stage === 1 ? 'half' : 'bud';
      name += h; if (name.startsWith('bud') && P.bud) name += 'o';
      const jolt = stage === 2 && P.bud ? 1 : 0;
      U.dot(E, x, s[0] - jolt, m.leaf, 0); stamp(MASK[name], x, s[0] - 1 - jolt);
    }
  }
  // 尾尖位置：照 quad.tail 的同一套步进（纯函数）
  function tailTip() {
    const oo = shp(), n = oo.tailLen, sw = (P.tail | 0) * 0.2; let x = rig.tail.x, y = rig.tail.y, a = rig.lie === 2 ? -0.05 : oo.tailA;
    for (let k = 0; k < n; k++) { const q = k / n; a += (oo.tailCurl * q * 0.35) + sw * (0.25 + q) * 0.35; x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; } }
    return [x, y, a];
  }
  // 候选部件：tailFlower 尾尖花（铲尖换成一朵张开的花；wilt 时合成花苞）
  function tailFlower() {
    part(); const [x, y, a] = tailTip(), cx = R(x - Math.cos(a) * 1.5), cy = Math.min(-2, R(y - Math.sin(a) * 1.5));
    if (P.wilt) { U.disc(E, cx, cy, 1, m.petal, 0); U.dot(E, cx + 1, cy, m.leaf, 0); return; }
    U.disc(E, cx, cy, 1.5, m.petal, 0);
    for (const [ex, ey] of [[-2, -2], [-3, 0], [-2, 2], [0, -3], [0, 3]]) { U.dot(E, cx + ex, cy + ey, m.petal, 0); U.dot(E, cx + R(ex * 0.6), cy + R(ey * 0.6), m.petal, 0); }
    U.dot(E, cx + 1, cy, m.leaf, 0); U.dot(E, cx, cy, m.stamen, 0);
  }
  // 侧倒后：花瓣散落在身边地上
  function fallenPetals() {
    part(); const x0 = rig.C2.x - rig.C2.r, x1 = rig.C1.x + rig.C1.r;
    for (const [q, dy, c] of [[-0.25, 0, 0], [-0.1, -1, 1], [0.35, 0, 0], [0.7, 0, 1], [1.12, 0, 0], [1.2, -1, 1]]) U.dot(E, lerp(x0, x1, q), dy, c ? m.petal : m.leaf, c ? 4 : 0);
  }
  const LEAF = { len: 8, w: 2.3 };
  function drawHero() {
    const oo = shp(), lie = rig.lie === 2; begin(hero, P.bx, 0);
    leafWing(rig.wing.x + 2, rig.wing.y - 1, P.wing, LEAF, 1);                      // 远翼
    if (!lie) Q.legs(E, rig, P, oo, 1);
    Q.tail(E, rig, P, oo); tailFlower();
    Q.body(E, rig, P, oo);
    if (!lie) Q.legs(E, rig, P, oo, 0);
    leafWing(rig.wing.x, rig.wing.y + 1, P.wing, LEAF, 0);                          // 近翼（贴在身侧）
    if (!lie) spineFlowers();                                                        // 花脊长在背线正中，压在近翼上
    Q.head(E, rig, P, oo); Q.horn(E, rig, P, oo);
    if (lie) { Q.legs(E, rig, P, oo, 1); Q.legs(E, rig, P, oo, 0); fallenPetals(); }   // 侧躺伸腿：腿在最前
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, dustAcc = 0, bubAcc = 0, lastGf = -9, lastSn = -1, smT = 9, smX = 0, smY = 0, fogT = 9, dumT = 9;
  const mouthScr = () => [scrX(rig.mouth[0] + P.bx), HY + R(rig.mouth[1])];
  const focusScr = () => [scrX(P.gx), HY + P.gy];
  const DX = DUMMY_X, DY = HY - 14;
  function petals(n, x, y, spread) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * spread, y, (Math.random() - 0.5) * 30, -18 - Math.random() * 16, 1.0 + Math.random() * 0.5, R_PET, { g: 34, dragX: 0.5, dragY: 0.7, floor: FLOOR - 1 }); }
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = focusScr();
      releaseOrbit(25, 60, 0.45, 0.9, { up: 4 });
      burst(gx, gy, 14, 25, 60, 0.35, 0.7, R_POL, 8); ring(gx, gy, 0, R_EL);
      for (let k = 0; k < BUDS.length; k++) petals(1, scrX(BUDS[k][0]), gy + 1, 3);
      fx.cloud(HX, FLOOR - 4, 7, R_EL, 0.7, 1);
      shake(0.28, 2); flash(0.05); fogT = 0;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [mx, my] = mouthScr(); smT = 0; smX = mx; smY = my;
      burst(DX - 4, DY, 12, 40, 100, 0.15, 0.4, FXI.impact, 10); burst(DX - 4, DY, 5, 20, 50, 0.2, 0.4, R_POL, 4); hitDummy(0, 1);
      sfx('swing', { kind: 'bite', w: 0.35 }); sfx('hit', { mat: 'flesh', w: 0.35 });
    }
    if (s === CAST && (t === T_CAST[0] || t === T_CAST[1])) {                          // 香雾环往两侧推：环上冒出香雾团
      const r = t === T_CAST[0] ? 11 : 19;
      for (const d of [-1, 1]) fx.cloud(HX + d * r, FLOOR - 4, 5, R_EL, 0.8, d > 0 ? 2 : 0);
      sfx('impact', { pal: 'nature', w: t === T_CAST[0] ? 0.4 : 0.3 });
    }
    if (s === CAST && t === T_CAST[2]) {                                              // 香雾熏到假人：被粉绿雾包住、头顶飘花瓣
      fx.cloud(DX, DY + 2, 9, R_EL, 1.1, 2); burst(DX, DY, 18, 30, 80, 0.3, 0.7, R_POL, 8); hitDummy(1, 1); shake(0.12, 1);
      dummyFx({ dur: 1.2, tint: R_EL, slow: 0.4 }); dumT = 0;
      for (let i = 0; i < 6; i++) spawn(K_RISE, DX - 5 + Math.random() * 10, HY - 30 - Math.random() * 3, (Math.random() - 0.5) * 8, -8 - Math.random() * 8, 0.8 + Math.random() * 0.4, R_PET);
      sfx('impact', { pal: 'nature', w: 0.5 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 6, 30, 70, 0.2, 0.4, R_SCALE, 12);
    if (s === DEATH && t === T_FALL) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 16 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      petals(7, HX - 4, HY - 9, 16); shake(0.1, 1); sfx('fall', { w: 0.45 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], T_CAST, [], [INCOMING], [T_FALL], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = focusScr();
    if (state === CHARGE) {                                                           // 粉 / 黄绿花粉绕身体收拢
      chargeAcc += dt * (14 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, (chargeAcc * 7 | 0) & 1 ? R_POL : R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === CAST && stT < 0.4) {                                                // 慢速花粉沿地面往两侧飘
      dustAcc += dt * 40; while (dustAcc >= 1) { dustAcc -= 1; const d = Math.random() < 0.5 ? -1 : 1; spawn(K_DUST, HX + d * (3 + Math.random() * 4), FLOOR - 1 - Math.random() * 4, d * (30 + Math.random() * 40), -3 - Math.random() * 5, 0.7 + Math.random() * 0.4, R_POL); }
    }
    if (dumT < 1.0) { bubAcc += dt * 12; while (bubAcc >= 1) { bubAcc -= 1; spawn(K_RISE, DX - 6 + Math.random() * 12, HY - 6 - Math.random() * 18, (Math.random() - 0.5) * 4, -8 - Math.random() * 8, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(P.gf === 0 ? 5 : -4) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.25 + Math.random() * 0.2, FXI.dust); sfx('step', { w: 0.35 }); }
      lastGf = P.gf;
    }
    if (state === IDLE) {                                                             // 花粉闲飘；喷嚏喷出一小团粉花粉
      emberAcc += dt * 1.6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 8 - 5), gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.8 + Math.random() * 0.5, R_POL); }
      const lp = q12(stT) % DUR[IDLE], k = lp >= 1.6 - 1e-6 && lp < 2.0 ? Math.min(4, f12of(lp - 1.6)) : -1;
      if (k === 2 && lastSn !== 2) { const [mx, my] = mouthScr(); burst(mx + 2, my, 10, 15, 45, 0.3, 0.6, R_POL, 3); for (let i = 0; i < 4; i++) spawn(K_DUST, mx + 2, my, 20 + Math.random() * 25, -4 + Math.random() * 6, 0.5 + Math.random() * 0.3, R_POL); }
      lastSn = k;
    }
    if (state === RECOVER) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 10 - 6), gy, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.4, R_POL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT += dt; fogT += dt; dumT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; dustAcc = 0; bubAcc = 0; lastGf = -9; lastSn = -1; smT = 9; fogT = 9; dumT = 9; }
  // 贴地的粉绿香雾环：半径 5 → 28 扩到假人脚下；后半圈画在角色后、前半圈画在角色前
  function fogRing(front, f12) {
    if (fogT >= 1.1) return;
    const q = clamp01(fogT / 0.4), rx = 5 + 23 * ease.out(q), ry = 1.5 + 2.5 * ease.out(q), cx = HX + 1, cy = FLOOR - 1, n = Math.ceil(rx * 4), late = fogT > 0.6;
    for (let k = 0; k < n; k++) {
      const a = k / n * 6.2832, s = Math.sin(a); if (front ? s < 0 : s >= 0) continue; if (late && ((k + f12) & 1)) continue;
      const x = R(cx + Math.cos(a) * rx), y = R(cy + s * ry), c = fogT < 0.1 ? EL[0] : fogT < 0.35 ? ((k % 4) === 0 ? PL[1] : EL[1]) : fogT < 0.7 ? EL[2] : EL[3];
      put(x, y, c); if (!late && (k % 3) === 0) put(x, y - 1, fogT < 0.35 ? EL[2] : EL[3]);
    }
  }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); fogRing(0, f12); }
  function fxFront(f12) {
    fogRing(1, f12);
    if (smT < 2 / 12) {                                                               // 咬合：上下两道弧往中间合拢
      const first = smT < 1 / 12, g = first ? 3 : 2;
      for (let k = 0; k <= 4; k++) { if (!first && (k & 1)) continue; const e = k === 0 || k === 4 ? 1 : 0; put(smX + 1 + k, smY - g + e, first ? EL[0] : EL[2]); put(smX + 1 + k, smY + g - e, first ? EL[1] : EL[3]); }
    }
  }

  return {
    name: '翡翠龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.stamen], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'nature', style: 'poison', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
