// 毒龙（部队 · 精灵 · 先锋 · 传说）：翡翠龙进化成的成年重龙——肩后开一朵紫黑腐毒巨花（背后再排 3 朵小毒花）、叶片翼放大成破洞枯叶大翼、喉下荧绿毒气囊、头顶一对后掠长角、尾尖花变成腐紫。
// 攻击：张口向前喷一小股毒息；技能「毒气」：翼半张、低头伏地，喉囊逐帧鼓到最大、背上巨花把毒雾反吸进花心 → 仰头喷出贴地毒息浪 + 背花喷出一圈紫孢子 → 假人陷进冒泡的毒沼。
// 死亡：倒下后按列塌成一滩墨绿毒泥（死亡套件 melt），背上巨花最后凋落在泥上，毒泥冒泡蒸发。身体用 parts-beast 的 quad（dragon 头型）拼，叶翼 / 花 / 喉囊是自画部件。
PCD.define('PoisonDragon', (E) => {
  const { Sprite, begin, part, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_PHYS, K_BURST,
    spawn, spawnX, burst, releaseOrbit, clearOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, death } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = fxRamp('toxinRot', [21, 50, 49, 34, 53]), EL = FXR[R_EL];           // 毒气 · 腐绿紫：白 → 淡黄绿 → 绿 → 墨绿 → 腐紫
  const R_SPORE = fxRamp('rotSpore', [43, 54, 42, 53, 52]), SP = FXR[R_SPORE];       // 背花喷出的紫孢子（shadow 紫点缀）
  const R_SCALE = fxRamp('mossScale', [36, 35, 34, 34, 0]);                           // 受击鳞屑
  const m = B.mats(E, {
    main: [0, 34, 35, 36], belly: [34, 48, 49, 36],                                   // 墨绿鳞、暗橄榄腹甲
    seam: [48, 49, 50, 38], leaf: [52, 53, 54, 43], vein: 'moss',                     // 荧绿鳞缝、腐紫叶膜 + 墨绿叶脉
    petal: [52, 53, 42, 54], maw: [0, 52, 52, 53], sac: [48, 49, 50, 38], hot: [38, 38, 21, 21],
    eye: [0, 0, 50, 38], horn: 'bone', claw: 'bone', teeth: 'white', stamen: [48, 49, 50, 38],
  });
  m.leafFar = E.defMat([52, 53, 53, 54], 1); m.veinFar = E.defMat([0, 34, 34, 35], 1); m.hot = E.defMat([38, 38, 21, 21], 1, 1);
  const SHAPE = { len: 16, chest: 6, rump: 5, waist: 0.25, hump: 2, leg: 6, lw: 3, thigh: 3.4, farDx: -2, stride: 3, lift: 2, foot: 'claw',
    neck: 5, neckA: 0.7, neckW: 3.2, head: { type: 'dragon', w: 7.5, h: 6, snout: 6, snH: 3.8, tip: 0.7, horn: 'back', hornLen: 6, teeth: 2 }, headA: 0.25,
    tail: 'long', tailLen: 10, tailA: -0.25, tailW: 4.8, tailCurl: 0.35, mane: 'none', fur: 0, pattern: 'scales', lieLegs: 1, m };
  const o = Q.shape(SHAPE);

  const HX = 44, DUR = DEFAULT_DUR.slice(), hero = new Sprite(112, 66, 56, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 16, 22], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'ink', 'spec', 'claw', 'teeth', 'horn', 'sac', 'hot', 'seam', 'maw']) RIM.skip[m[k]] = 1;
  // 自己的姿势字段：sac 喉囊 0–4（鼓起程度 = 亮度档）· fopen 巨花 0 合 / 1 开 / 2 大张 · seam 鳞缝荧光 0–3 · nofl 不画巨花（毒泥快照用）
  const SPEC = Q.KEYS.concat(B.COMMON, [['sac', 0, 4], ['fopen', 0, 2], ['seam', 0, 3], ['nofl', 0, 1]]);
  const P = {};
  function reset() { Q.reset(P); P.sac = 1; P.fopen = 1; P.seam = 0; P.nofl = 0; }
  reset();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'tail', 'reach', 'wing', 'sac'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, tail: 0, reach: 0, wing: 0, sac: 1 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -1, pitch: 1, head: -1, sac: 3, tail: 1 });
  const A_SPIT = pose({ bx: 1, head: 1, jaw: 3, sac: 1, tail: -1 });
  const A_HOLD = pose({ bx: 1, head: 1, jaw: 2, sac: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_SPIT, 'snap'], [0.25, A_SPIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 2, pitch: -1, head: 2, wing: 1, tail: 1, sac: 2 });     // 翼半张、低头伏地
  const S_REAR = pose({ pitch: 2, head: -2, jaw: 3, wing: 2, tail: -1, sac: 4 });      // 仰头
  const S_SPEW = pose({ pitch: 0, head: 1, jaw: 3, wing: 2, tail: -1, sac: 2 });       // 往前贴地喷
  const T_HIT = 2 / 12, T_CAST = [2 / 12, 0.25], T_MELT = INCOMING + 0.5;
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.sac = 1 + ((f12 >> 2) & 1);      // 喉囊一鼓一瘪
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)); P.fopen = k >= 1 && k <= 3 ? 2 : 1; P.jaw = k === 2 || k === 3 ? 1 : 0; P.sac = k === 1 ? 3 : 2; P.head = k >= 1 && k <= 3 ? -1 : 0; }   // 巨花慢慢张开吐一缕紫雾
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                           // 沉重爬行：低伏压腹
      const f = Q.anim.walk(P, tq); P.crouch = 1; P.head = f & 1 ? 1 : 2; P.sac = 1 + (f & 1);
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = tq >= 0.05 && tq < 0.25 ? 1 : 0; }
    else if (st === CHARGE) {
      E.mix(tmp, REST, C_LOW, ease.inOut(clamp01(tq / 0.7)), F_ALL); apply(tmp);
      P.sac = Math.min(4, 1 + Math.floor(tq / 0.3)); if (tq > 1.1 && (f12 & 1)) P.sac = 3;   // 逐帧鼓到最大，蓄满后闪
      P.fopen = tq >= 0.35 ? 2 : 1; P.seam = tq < 0.5 ? 1 : tq < 1.0 ? 2 : 3; P.rim = 2;
    } else if (st === CAST) {
      if (tq < 2 / 12) apply(S_REAR); else { E.mix(tmp, S_REAR, S_SPEW, ease.out(clamp01((tq - 2 / 12) / 0.1)), F_ALL); apply(tmp); }
      P.fopen = 2; P.seam = 3; P.rim = 3;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_SPEW, REST, q, F_ALL); apply(tmp);
      P.sac = q < 0.3 ? 1 : q < 0.6 ? 0 : 1; P.fopen = q < 0.5 ? 2 : 1; P.seam = q < 0.3 ? 2 : q < 0.6 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;   // 喉囊瘪回、背花慢慢合上
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.sac = h < 0.2 ? 3 : 2; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.5) { Q.anim.death(P, d, f12); P.wing = d < 0.3 ? 1 : 3; P.sac = d < 0.3 ? 3 : 0; P.fopen = d < 0.3 ? 1 : 0; }
      else { Q.anim.death(P, 0.45, f12); P.wing = 3; P.sac = 0; P.fopen = 0; P.dq = 1; }   // 之后由死亡套件（毒泥）接管
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    const g = sacAt(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }

  // ───── 自画部件 ─────
  // 候选部件：leafWing 叶片翼（同翡翠龙；holes 1 = 破洞枯叶：参差叶缘 + 两个洞）
  const LEAF_A = [0.55, 0.95, 1.4, -0.12];
  function leafWing(x, y, pose, c, far) {
    part();
    const a = LEAF_A[pose | 0], L = c.len * (pose === 0 ? 0.9 : 1), Wd = c.w, dx = -Math.cos(a), dy = -Math.sin(a), nx = -dy, ny = dx;
    const mem = far ? m.leafFar : m.leaf, vein = far ? m.veinFar : m.vein, tx = x + dx * L, ty = y + dy * L;
    const H1 = [L * 0.55, Wd * 0.45, 1.1], H2 = [L * 0.78, -Wd * 0.3, 0.9];
    for (let Y = Math.floor(Math.min(y, ty) - Wd - 1); Y <= Math.ceil(Math.max(y, ty) + Wd + 1); Y++) for (let X = Math.floor(Math.min(x, tx) - Wd - 1); X <= Math.ceil(Math.max(x, tx) + Wd + 1); X++) {
      const px = X - x, py = Y - y, u = px * dx + py * dy, v = px * nx + py * ny; if (u < -0.4 || u > L + 0.3) continue;
      const q = clamp01(u / L), hw = Math.max(0.45, Wd * Math.sin(Math.PI * Math.pow(q, 0.8))); if (Math.abs(v) > hw + 0.25) continue;
      if (c.holes) {
        if (Math.abs(v) > hw - 1.1 && u > 2 && U.hash(R(u / 1.5), v > 0 ? 3 : 7) < 0.4) continue;                // 参差的枯叶缘
        if (Math.hypot(u - H1[0], v - H1[1]) < H1[2] || Math.hypot(u - H2[0], v - H2[1]) < H2[2]) continue;      // 破洞
      }
      let mat = mem, t = 0;
      if (Math.abs(v) < 0.55 && u < L - 0.8) mat = vein;
      else if (Math.abs(v) < hw - 0.5) { const s = u - Math.abs(v) * 1.1; if (((s % 3) + 3) % 3 < 0.7 && u > 1.5) { mat = vein; t = 3; } }
      U.dot(E, X, Y, mat, t);
    }
  }
  // 候选部件：rotFlower 腐毒巨花（大王花：5 片厚花瓣围着深色花口，瓣上浅色斑点；open 0 合拢成花球 · 1 开 · 2 大张、花口透荧绿）
  const FLOWER_X = 5;                                                                  // 开在肩后（肩峰上）
  function flowerAt() { const s = Q.span(rig, o, FLOWER_X); return [FLOWER_X, (s ? s[0] : rig.C1.y - 6) - 2]; }
  function rotFlower(cx, cy, open, wilt) {
    const rx = open === 0 ? 2.6 : open === 1 ? 3.6 : 4.4, ry = open === 0 ? 2.4 : open === 1 ? 2.2 : 2.6, pr = open === 0 ? 1.6 : 2.2;
    for (let k = 0; k < 5; k++) {
      const a = -Math.PI / 2 + k * 1.2566 + (wilt ? 0.6 : 0), px = cx + Math.cos(a) * rx, py = cy + Math.sin(a) * ry * (wilt ? 0.6 : 1) + (wilt ? 1 : 0);
      U.oval(E, px, py, pr + 0.4, pr * 0.8, m.petal, 0);
      U.dot(E, px + (k & 1 ? 1 : -1) * 0.6, py - 0.4, m.petal, 4);                     // 瓣上的斑
    }
    if (open) { U.oval(E, cx, cy, 1.6, 0.9, m.maw, 0); U.dot(E, cx - 1, cy - 1, m.petal, 4); U.dot(E, cx + 1, cy - 1, m.petal, 4); if (open === 2) { U.dot(E, cx, cy, m.stamen, 4); U.dot(E, cx - 1, cy, m.stamen, 3); U.dot(E, cx + 1, cy, m.stamen, 3); } }
    else U.dot(E, cx, cy - 1, m.maw, 0);
  }
  const SMALL = [-13, -8.5, -4];                                                        // 背后再排 3 朵小毒花
  function spineFlowers() {
    part();
    for (const x of SMALL) { const s = Q.span(rig, o, x); if (!s) continue; const y = s[0]; U.dot(E, x, y, m.leaf, 0); U.dot(E, x, y - 1, m.petal, 0); U.dot(E, x - 1, y - 1, m.petal, 0); U.dot(E, x + 1, y - 1, m.petal, 0);
      U.dot(E, x - 1, y - 2, m.petal, 0); U.dot(E, x + 1, y - 2, m.petal, 0); U.dot(E, x, y - 2, m.maw, 0); U.dot(E, x - 2, y - 3, m.petal, 4); U.dot(E, x + 2, y - 3, m.petal, 4); }
    if (!P.nofl) { part(); const [fx0, fy0] = flowerAt(); rotFlower(fx0, fy0, P.fopen, 0); }
  }
  // 候选部件：throatSac 喉囊（喉下一只发光毒囊；sac 0 瘪 … 4 鼓到最大，越鼓越亮、下垂越多）
  function sacAt() { if (rig.lie === 2) return [rig.C1.x + 6, -2]; const s = P.sac | 0; return [rig.NT.x + 1, rig.NT.y + o.neckW + 0.5 + s * 0.6]; }
  function throatSac() {
    part(); const [x, y] = sacAt(), s = P.sac | 0, rx = 1.6 + s * 0.45, ry = 1.4 + s * 0.4;
    U.oval(E, x, y, rx, ry, m.sac, 0);
    if (s >= 1) U.dot(E, x - 1, y - 1, m.sac, 4);
    if (s >= 3) { U.dot(E, x, y, m.hot, 3); U.dot(E, x - 1, y, m.hot, 3); } if (s >= 4) { U.dot(E, x, y - 1, m.hot, 3); U.dot(E, x + 1, y, m.hot, 3); }
  }
  // 鳞缝荧光（紧跟躯干画，并进躯干部件）：seam 0 暗 · 1–3 越来越亮
  function seams() {
    const bx0 = R(rig.C2.x), by0 = R(rig.C2.y), t = [2, 2, 3, 4][P.seam | 0];
    for (let x = Math.floor(rig.C2.x - rig.C2.r); x <= Math.ceil(rig.C1.x + rig.C1.r); x++) {
      const s = Q.span(rig, o, x); if (!s) continue;
      for (let y = s[0] + 2; y < s[1] - 1; y++) { const rx = x - bx0, ry = y - by0; if (((rx + (ry & 2) * 2 + 40) % 8) === 0 && ((ry + 40) & 1) === 0 && (P.seam || ((rx + 40) & 8))) U.dot(E, x, y, m.seam, t); }
    }
  }
  function tailTip() {
    const n = o.tailLen, sw = (P.tail | 0) * 0.2; let x = rig.tail.x, y = rig.tail.y, a = rig.lie === 2 ? -0.05 : o.tailA;
    for (let k = 0; k < n; k++) { const q = k / n; a += (o.tailCurl * q * 0.35) + sw * (0.25 + q) * 0.35; x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; } }
    return [x, y, a];
  }
  function tailFlower() {                                                               // 尾尖花：腐紫、瓣尖下垂
    part(); const [x, y, a] = tailTip(), cx = R(x - Math.cos(a) * 1.5), cy = Math.min(-2, R(y - Math.sin(a) * 1.5));
    U.disc(E, cx, cy, 1.5, m.petal, 0);
    for (const [ex, ey] of [[-2, -2], [-3, 0], [-2, 2], [0, 3]]) { U.dot(E, cx + ex, cy + ey, m.petal, 0); U.dot(E, cx + R(ex * 0.6), cy + R(ey * 0.6), m.petal, 0); }
    U.dot(E, cx, cy, m.maw, 0); U.dot(E, cx + 1, cy - 1, m.petal, 4);
  }
  const LEAF = { len: 14, w: 4, holes: 1 };
  function drawHero() {
    const lie = rig.lie === 2; begin(hero, P.bx, 0);
    leafWing(rig.wing.x + 2, rig.wing.y - 1, P.wing, LEAF, 1);                      // 远翼
    if (!lie) Q.legs(E, rig, P, o, 1);
    Q.tail(E, rig, P, o); tailFlower();
    Q.body(E, rig, P, o); seams();
    if (!lie) Q.legs(E, rig, P, o, 0);
    leafWing(rig.wing.x - 1, rig.wing.y + 1, P.wing, LEAF, 0);                      // 近翼
    if (!lie) spineFlowers();
    throatSac();
    Q.head(E, rig, P, o); Q.horn(E, rig, P, o);
    if (lie) { Q.legs(E, rig, P, o, 1); Q.legs(E, rig, P, o, 0); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }
  // 凋落的巨花（死亡时单独落在毒泥上）：预先烤好一张小精灵
  const wiltSpr = new Sprite(16, 12, 8, 10);
  begin(wiltSpr, 0, 0); part(); rotFlower(0, -3, 0, 1); bake(wiltSpr, { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 });

  // ───── 特效 ─────
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, bubAcc = 0, dripAcc = 0, lastGf = -9, mzT = 9, mzX = 0, mzY = 0, swT = 9, meltT = 9, bogT = 9, flX = 0, flY = 0;
  const mouthScr = () => [scrX(rig.mouth[0] + P.bx), HY + R(rig.mouth[1])];
  const flowerScr = () => { const f = flowerAt(); return [scrX(f[0] + P.bx), HY + f[1]]; };
  const DX = DUMMY_X, DY = HY - 14;
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [fx0, fy0] = flowerScr(), [mx, my] = mouthScr();
      clearOrbit();
      for (let i = 0; i < 22; i++) { const a = -Math.PI * (0.1 + 0.8 * i / 21), v = 30 + Math.random() * 40; spawn(K_BURST, fx0, fy0 - 1, Math.cos(a) * v, Math.sin(a) * v - 10, 0.5 + Math.random() * 0.5, R_SPORE); }   // 背花喷一圈紫孢子（向上半圆）
      burst(mx, my, 12, 30, 80, 0.25, 0.5, R_EL, 6); ring(fx0, fy0, 0, R_SPORE);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [mx, my] = mouthScr(); mzT = 0; mzX = mx; mzY = my;
      shoot(1, mx + 2, my, 140, DX - 4, R_EL, 10, { trail: { every: 2, life: [0.2, 0.4], back: [6, 18] } });
      burst(mx + 1, my, 6, 20, 50, 0.2, 0.4, R_EL, 2);
      sfx('swing', { kind: 'bite', w: 0.5 }); sfx('shoot', { proj: 'water' });
    }
    if (s === CAST && t === T_CAST[0]) {                                                // 仰头 → 往前贴地喷出毒息浪
      const x0 = scrX(rig.mouth[0] + 2); swT = 0;
      fx.wave(x0, FLOOR - 1, 1, DX - x0 + 6, 8, R_EL, 0.6, 1); fx.cloud(x0 + 4, FLOOR - 5, 6, R_EL, 0.7, 2);
      sfx('impact', { pal: 'poison', w: 0.6 });
    }
    if (s === CAST && t === T_CAST[1]) {                                                // 前方地面留下一片冒泡的毒沼，假人陷进去
      fx.cloud(DX - 5, HY - 6, 7, R_EL, 1.3, 2); fx.cloud(DX + 5, HY - 8, 6, R_EL, 1.2, 1); fx.cloud(DX, DY, 8, R_EL, 1.1, 2);
      for (let i = 0; i < 12; i++) spawnX(K_PHYS, DX - 8 + Math.random() * 16, DY - Math.random() * 8, (Math.random() - 0.5) * 40, -20 - Math.random() * 30, 0.8 + Math.random() * 0.4, R_EL, { g: 160, floor: FLOOR - 1 });
      hitDummy(1, 1); shake(0.12, 1); dummyFx({ dur: 1.4, tint: R_EL, sink: 1, slow: 0.5 }); meltT = 9; bogT = 0;
      sfx('impact', { pal: 'poison', w: 0.8 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.2, 0.45, R_SCALE, 12);
    if (s === DEATH && t === T_MELT) {                                                  // 塌成毒泥：先把不带巨花的一帧烤好，交给死亡套件
      poseAt(DEATH, T_MELT - 1 / 12, T_MELT - 1 / 12); const f = flowerAt(); flX = scrX(f[0]); flY = HY + f[1];
      P.nofl = 1; B.key(P, SPEC); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('melt', { fadeAt: 1.3, fadeDur: 0.6 }); meltT = 0;
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 20 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.8 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], T_CAST, [], [INCOMING], [T_MELT], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 12, 30, 80, 0.2, 0.45, R_EL, 8); fx.cloud(x, y + 1, 4, R_EL, 0.6, 2); hitDummy(0, 1); dummyFx({ dur: 0.5, tint: R_EL }); sfx('hit', { mat: 'flesh', w: 0.4 }); }
  }
  function stepFX(dt, state, stT) {
    const [fx0, fy0] = flowerScr(), [mx, my] = mouthScr();
    if (state === CHARGE && stT > 0.2) {                                              // 毒雾粒子反向吸进花心
      chargeAcc += dt * (16 + 24 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, fx0, fy0, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: -(4 + Math.random() * 3), tx: fx0, ty: fy0 }); }
    }
    if (state === CAST && stT < 0.45) {                                               // 毒息从口里一股股往前贴地涌
      dripAcc += dt * 50; while (dripAcc >= 1) { dripAcc -= 1; const v = 70 + Math.random() * 60; spawnX(K_DUST, mx + 2, my + 1, v, 10 + Math.random() * 20, 0.4 + Math.random() * 0.3, R_EL, { sz: Math.random() < 0.3 ? 2 : 1, floor: FLOOR - 1 }); }
    }
    if (bogT < 1.4) { bubAcc += dt * 14; while (bubAcc >= 1) { bubAcc -= 1; spawn(K_RISE, DX - 10 + Math.random() * 20, FLOOR - 1 - Math.random() * 2, (Math.random() - 0.5) * 4, -6 - Math.random() * 8, 0.35 + Math.random() * 0.3, R_EL); } }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) {
        for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(P.gf === 0 ? 11 : -7) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust);
        spawnX(K_PHYS, mx, my + 1, 0, 0, 0.7, R_EL, { g: 200, floor: FLOOR - 1 });     // 一滴毒液落地冒烟
        sfx('step', { w: 0.8 });
      }
      lastGf = P.gf;
    }
    if (state === MOVE) { dripAcc += dt * 4; while (dripAcc >= 1) { dripAcc -= 1; spawn(K_RISE, scrX(rig.mouth[0] - 2) + (Math.random() - 0.5) * 4, FLOOR - 1, (Math.random() - 0.5) * 4, -8 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === IDLE || state === RECOVER) {                                          // 嘴角毒泡、巨花吐紫雾
      emberAcc += dt * (state === IDLE ? 2.4 : 6); while (emberAcc >= 1) { emberAcc -= 1; if (Math.random() < 0.5) spawn(K_EMBER, mx - 1, my, Math.random() * 6 - 1, -5 - Math.random() * 5, 0.5 + Math.random() * 0.4, R_EL); else spawn(K_EMBER, fx0 + (Math.random() - 0.5) * 4, fy0 - 2, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.8 + Math.random() * 0.5, R_SPORE); }
      if (state === IDLE && P.fopen === 2 && Math.random() < dt * 20) spawn(K_RISE, fx0 + (Math.random() - 0.5) * 3, fy0 - 2, (Math.random() - 0.5) * 6, -10 - Math.random() * 6, 0.9 + Math.random() * 0.4, R_SPORE);
    }
    if (state === DEATH && meltT < 2.2) {                                              // 毒泥冒泡蒸发
      const d = meltT; bubAcc += dt * (d < 1.3 ? 18 : 10);
      while (bubAcc >= 1) { bubAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 34, HY - 1 - Math.random() * 3, (Math.random() - 0.5) * 5, -8 - Math.random() * 12, 0.4 + Math.random() * 0.5, d < 1.3 ? R_EL : FXI.soul); }
    }
    mzT += dt; swT += dt; meltT += dt; bogT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; bubAcc = 0; dripAcc = 0; lastGf = -9; mzT = 9; swT = 9; meltT = 9; bogT = 9; }
  // 毒沼：假人脚下一片冒泡的扁椭圆
  function bog(f12) {
    if (bogT >= 1.4) return; const q = bogT / 1.4, rx = R(6 + 6 * Math.min(1, bogT * 5)), late = q > 0.7;
    for (let x = -rx; x <= rx; x++) { const e = Math.abs(x) / rx; if (late && ((x + f12) & 1)) continue; put(DX + x, FLOOR, e > 0.8 ? EL[3] : EL[2]); if (e < 0.75) put(DX + x, FLOOR - 1, e < 0.35 && ((x + f12) % 5) === 0 ? EL[1] : EL[3]); }
  }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid(f12) { bog(f12); }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[2]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX + r - 1, mzY - 1, EL[1]); put(mzX + r - 1, mzY + 1, EL[2]); } }
    if (E.state === DEATH && meltT < 2.2) {                                             // 凋落的巨花：落到毒泥上，最后一起消散
      const q = clamp01(meltT / 0.45), y = R(lerp(flY + 2, HY - 1, ease.in(q))), x = R(lerp(flX, flX - 3, q)), dq = clamp01((meltT - 1.3) / 0.6), s = wiltSpr;
      for (let j = 0; j < s.h; j++) for (let i = 0; i < s.w; i++) { const c = s.out[j * s.w + i]; if (c === 255 || B8[(j & 7) * 8 + (i & 7)] < dq) continue; put(x - s.ox + i, y - s.oy + j, c); }
    }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                               // 毒液团：3×3 + 下挂一滴
    if (k !== 1) return false;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(x + i, y + j, i === 1 && j === -1 ? Rr[0] : (i + j) > 0 ? Rr[2] : Rr[1]);
    put(x + 2 * d, y, Rr[1]); put(x - d, y + 2, (f12 & 1) ? Rr[2] : Rr[3]); return true;
  }

  return {
    name: '毒龙', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.sac, m.hot, m.seam, m.eye], HIT_POINT, EVENTS, deathKit: { mode: 'melt', at: T_MELT },
    SFX: { body: 'beast', how: 'dissolve', pal: 'poison', style: 'nova', w: 0.8 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
