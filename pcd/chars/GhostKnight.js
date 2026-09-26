// 幽灵骑士（敌人 · 野兽 · 稀有 · batch-13）：瘦骨嶙峋、离地漂 1 格的灰蓝魂体骨马（骷髅马头 + 折断独角、肋骨可见、后腿膝下化雾），
// 背上长出一副没有头的锈铁空甲，颈口冒一簇往上飘的魂火；右手平端超长破骑枪（魂光枪尖）挂一面撕烂的三角旗。
// 攻击：夹枪冲刺 6 格直刺。技能「幽灵行者」（普攻伤害 −20%）：身体逐列抖动变半透明 → 化成魂光剪影，敌方普攻小弹直接穿过去，只在背后溅起魂光。
// 身体：parts-beast 的 quad 马身 + parts.js standard 空甲上身（不画头）；雾化后腿、魂火、断角、破旗是本模块的候选部件。死亡用死亡套件 chunks（散架成骨堆）。
PCD.define('GhostKnight', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT, K_TRAIL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shoot, blitShape, copySprite, groundShadow, death, parts } = E;
  const B = parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 材质 ─────
  const m = B.mats(E, { main: [39, 59, 60, 17], limb: 'bone', claw: 'bone', mist: [8, 59, 60, 17] });
  const M = parts.mats(E, {
    iron: [0, 28, 29, 30], rust: 'leather', flag: 'boot', ink: { r: [0, 0, 0, 0], flat: 1 },
    soul: { r: [25, 24, 23, 22], flat: 1 }, core: { r: [22, 22, 21, 21], flat: 1 },
  });
  const R_EL = FXI.soul, EL = FXR[R_EL];                                                             // 魂光：青 → 蓝 → 紫 → 深紫 → 墨
  const o = Q.shape({ len: 12, chest: 4, rump: 3.8, waist: 0.45, hump: 0, leg: 8, lw: 1, thigh: 2, farDx: -2, stride: 3, lift: 2, foot: 'hoof',
    neck: 5.5, neckA: 1.0, neckW: 2.2, head: { type: 'horse', w: 6, h: 5.5, snout: 5.5, snH: 4, tip: 0.7, earH: 2 }, headA: 0.6,
    tail: 'none', mane: 'none', forelock: null, fur: 0, lieLegs: 1, m });
  const HB = { body: 'standard', torso: 7, fall: 'front' };
  const SPEAR = { style: 'spike', wood: M.iron, metal: M.soul, trim: M.iron, len: 15, back: 7 };

  const HX = 62, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 60, 46, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [M.soul, M.core, M.ink, M.iron, M.ironD, M.flag]) RIM.skip[k] = 1;
  const P = {}; Q.reset(P);
  const NOKEY = { wing: 1, jaw: 1, glow: 1, ear: 1, head: 1 };
  const SPEC = Q.KEYS.filter((f) => !NOKEY[f[0]]).concat(B.COMMON.filter((f) => f[0] !== 'drop' && f[0] !== 'dsx' && f[0] !== 'dsy'), [
    ['hx', -8, 14], ['hy', -24, 0], ['aup', 0, 2], ['bhx', -10, 8], ['bhy', -24, 0], ['lean', -1, 2], ['fl', 0, 2], ['fph', 0, 3], ['fpur', 0, 1],
    ['ghost', 0, 12], ['flick', 0, 3], ['sil', 0, 12], ['mist', 0, 3], ['hide', 0, 1]]);
  let rig = null, Rh = null;
  const HP = {};
  const AUP = [PI / 2, Math.atan2(2, 1), Math.atan2(2, -1)];                                           // 枪：平端 / 2:1 上挑 / 2:1 下压

  // ───── 姿势 ─────
  const HF = ['hx', 'hy', 'bhx', 'bhy', 'lean'], QF = ['bx', 'crouch', 'pitch', 'reach', 'lift', 'gem'], ALLF = HF.concat(QF);
  const REST = { hx: 5, hy: -13, bhx: -1, bhy: -9, lean: 0, bx: 0, crouch: 0, pitch: 0, reach: 0, lift: 1, gem: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ hx: 2, hy: -14, lean: -1, bx: -2, lift: 1, gem: 1 });
  const A_HIT = pose({ hx: 8, hy: -13, lean: 1, bx: 6, pitch: -1, reach: 2, lift: 1, gem: 2 });
  const A_HOLD = pose({ hx: 7, hy: -13, lean: 1, bx: 5, reach: 1, lift: 1, gem: 1 });
  const T_HIT = 2 / 12;
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_HIT, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_POSE = pose({ hx: 4, hy: -14, lean: -1, crouch: 1, lift: 2, gem: 2 });
  const tmp = {};
  function apply(src, fields) { for (const f of fields || ALLF) P[f] = R(src[f]); }
  function idle(tq, f12) {
    Q.anim.idle(P, tq, f12, DUR[IDLE]); const lp = tq % DUR[IDLE];
    P.lift = 1 + P.bob; P.bob = 0;                                                                  // 上下漂 1 格
    P.fl = [1, 2, 1, 0][(f12 >> 1) & 3]; P.fph = f12 & 3; P.mist = (f12 >> 1) & 3; P.rim = 1;
    P.flick = ((f12 % 9) === 4) ? 1 + ((f12 / 9) | 0) % 3 : 0;                                      // 局部像素时不时抖动透明
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)); P.flick = [1, 2, 3, 2, 0][k]; P.fl = [2, 0, 2, 1, 1][k]; P.gem = k < 3 ? 1 : 0; }   // 待机个性：忽隐忽现
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P); apply(REST); P.aup = 0; P.fl = 1; P.fph = f12 & 3; P.fpur = 0; P.ghost = 0; P.flick = 0; P.sil = 0; P.mist = (f12 >> 1) & 3; P.hide = 0; P.rim = 1;
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {
      const f = Q.anim.walk(P, tq), w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;          // 飘浮空踏：前蹄空踏、身体上下飘，不落地
      P.bob = 0; P.lift = [1, 2, 2, 1][f]; P.mist = f; P.fph = (f + 2) & 3; P.fl = 1;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, ALLF); apply(tmp); P.aup = tq < 0.12 ? (tq > 0.05 ? 1 : 0) : 0; P.rim = P.gem >= 2 ? 2 : 1; P.fl = tq >= T_HIT && tq < 0.3 ? 2 : 1; P.fph = tq >= T_HIT && tq < 0.3 ? 0 : P.fph;
    } else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_POSE, ease.inOut(tq / 0.7), ALLF); apply(tmp); } else apply(C_POSE);
      P.ghost = Math.min(12, R(12 * clamp01(tq / 1.2))); P.fpur = tq > 0.3 ? 1 : 0; P.fl = 2; P.rim = 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
    } else if (st === CAST) { apply(C_POSE); P.lift = 2; P.sil = 12; P.fpur = 1; P.fl = 2; P.gem = 3; P.rim = 3; }
    else if (st === RECOVER) {
      const q = clamp01(tq / 0.55); E.mix(tmp, C_POSE, REST, ease.inOut(clamp01(tq / 0.6)), ALLF); apply(tmp);
      P.sil = 12 - R(12 * q); P.fpur = q < 0.6 ? 1 : 0; P.gem = q < 0.3 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { Q.anim.hurt(P, h); P.lift = 1; if (h < 0.35) { P.aup = 1; P.hx = 3; P.lean = -1; P.fl = 2; P.fph = 3; P.rim = 0; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.lift = 1; P.aup = 1; P.lean = -1; P.fl = 2; P.fph = 3; P.gem = f12 & 1; }
      else { P.bx = -3; P.crouch = 3; P.pitch = -2; P.lift = 0; P.reach = -1; P.eyes = 1; P.aup = 2; P.lean = 2; P.hy = -10; P.fl = 0; P.gem = 4; P.flick = 1 + (f12 % 3); if (d >= T_SHATTER - INCOMING - 1e-6) P.dq = 1; }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o); Rh = humanRig();
    const tip = parts.spear.focus(HP, spearOpt()), s = parts.toSprite(Rh, tip[0], tip[1]); P.gx = s[0] + P.bx; P.gy = s[1];
    const f = parts.toSprite(Rh, Rh.hx, Rh.yS - 3); P.fx0 = f[0] + P.bx; P.fy0 = f[1];                 // 魂火根（特效挂点）
    B.key(P, SPEC);
  }
  function spearOpt() { SPEAR.a = AUP[P.aup | 0]; SPEAR.metal = P.gem >= 4 ? M.iron : M.soul; return SPEAR; }
  function humanRig() {
    HP.lean = P.lean; HP.head = 0; HP.bob = 0; HP.crouch = 0; HP.step = 0; HP.wup = 0; HP.walk = 0; HP.lying = 0; HP.lift = 0;
    HP.hx = P.hx; HP.hy = P.hy; HP.a = AUP[P.aup | 0]; HP.bhx = P.bhx; HP.bhy = P.bhy; HP.eyes = 0; HP.beard = P.fph & 1 ? 1 : -1; HP.sway = 0; HP.bend = 0; HP.glint = P.gem >= 2 && P.gem <= 3 ? 1 : 0;
    const H = parts.rig(HP, HB), ax = R(rig.C1.x) - 3, s = Q.span(rig, o, ax), top = s ? s[0] : R(rig.C1.y - o.chest);
    H.ox = ax; H.oy = top - 4 - H.yHip;                                                             // 空甲悬在马背上方 1 格
    return H;
  }

  // ───── 画 ─────
  // 候选部件：mistLeg 雾化后腿——大腿 + 小腿到膝，膝下化作往后拖的抖动雾（P.mist 0–3 相位，远侧暗一级），每条腿一个部件
  function mistLeg(i) {
    E.part(); const L = rig.legs[i], mat = L.far ? m.far : m.limb, T = L.T, F = L.F, k = 0.45, kx = T[0] + (F[0] - T[0]) * k - 1, ky = T[1] + (F[1] - T[1]) * k;
    U.disc(E, T[0], T[1], o.thigh, L.far ? m.far : m.body, 0); U.taper(E, T[0], T[1], kx, ky, 1.2, 0.8, mat, 0);
    const ph = ((P.mist | 0) + (L.far ? 2 : 0)) & 3;
    for (let j = 1; j <= 7; j++) {
      const x = kx - j * 0.9 - (j > 3 ? (ph & 1) : 0), y = ky + j * 0.55 + (j > 4 && ph > 1 ? 1 : 0), w = j < 3 ? 2 : j < 6 ? 1 : 0;
      for (let dx = -w; dx <= w; dx++) { const X = R(x + dx), Y = R(y + (dx > 0 ? 1 : 0)); if (B8[((Y + 40) & 7) * 8 + ((X + 40) & 7)] < j * 0.12 - 0.05) continue; U.dot(E, X, Y, L.far ? m.mistFar || m.far : m.mist, j < 3 ? 3 : j < 5 ? 2 : 4); }
    }
  }
  function legs(far) { for (let i = 0; i < 4; i++) { const L = rig.legs[i]; if (!!L.far !== !!far) continue; if (L.front) Q.leg(E, rig, P, o, i); else mistLeg(i); } }
  function ribs() {                                                                                  // 肋骨（和马身同一个部件）：4 道暗色弧 + 骨白高光
    const cx = R(rig.C1.x);
    for (let i = 0; i < 4; i++) { const x0 = cx - 1 - i * 2, s = Q.span(rig, o, x0); if (!s) continue; for (let y = s[0] + 2; y <= s[1] - 1; y++) { const x = x0 - ((y - s[0] - 2) >> 2); U.dot(E, x, y, m.body, 1); if (y < s[1] - 1) U.dot(E, x + 1, y, m.body, 4); } }
  }
  function skull() {                                                                                 // 骷髅马头细节（和头同一个部件）：眼窝魂火、骨齿、鼻孔
    const F = Q.headFrame(rig, o, 0), e = rig.eye, lv = P.gem >= 4 ? 0 : 1;
    U.dot(E, e[0] - 1, e[1], M.ink, 1); U.dot(E, e[0], e[1] - 1, M.ink, 1); U.dot(E, e[0] - 1, e[1] - 1, M.ink, 1);
    U.dot(E, e[0], e[1], lv ? M.core : M.ink, lv ? (P.eyes ? 1 : 3) : 1);
    for (let u = F.uc + 0.6, k = 0; u < F.uT - 0.4; u += 1, k++) { const p = F.at(u, F.prof(u)[2]); U.dot(E, p[0], p[1], k & 1 ? M.ink : m.limb, k & 1 ? 1 : 4); }
    const n = F.at(F.uT - 0.8, F.prof(F.uT - 0.8)[0] + 1); U.dot(E, n[0], n[1], M.ink, 1);
  }
  // 候选部件：brokenHorn 额顶折断的独角骨刺（单独部件，断口平头暗一级）
  function brokenHorn() {
    E.part(); const F = Q.headFrame(rig, o, 0), u = F.W * 0.15, b = F.at(u, F.top(u));
    U.dot(E, b[0], b[1] - 1, m.limb, 3); U.dot(E, b[0] + 1, b[1] - 2, m.limb, 4); U.dot(E, b[0] + 1, b[1] - 3, m.limb, 3); U.dot(E, b[0] + 2, b[1] - 4, m.limb, 2); U.dot(E, b[0] + 1, b[1] - 4, m.limb, 1);
  }
  // 候选部件：soulFlame 颈口魂火——3 列火舌，中间最高（fl 0–2 忽大忽小），尖端随 fph 左右摇、往后飘；fpur 1 = 转紫。和空甲之间留缝飘两颗魂光（甲悬空）
  function soulFlame() {
    if (P.gem >= 4 && P.fl === 0) return; E.part();
    const T = Rh, cx = Rh.hx, y0 = Rh.yS - 2, H = 5 + (P.fl | 0), sway = [0, -1, 0, 1][P.fph & 3], pur = P.fpur ? 1 : 0;
    const cols = [[cx - 2, H - 3], [cx - 1, H - 1], [cx, H], [cx + 1, H - 2], [cx + 2, H - 4]];
    for (const [x, h] of cols) for (let k = 0; k < h; k++) {
      const q = k / Math.max(1, H - 1), dx = k > 1 ? R(sway * q * 1.5) - (k > 2 ? 1 : 0) : 0;
      if (q < 0.35) parts.px(E, T, x + dx, y0 - k, M.core, pur ? 2 : 3); else parts.px(E, T, x + dx, y0 - k, M.soul, q < 0.7 ? 4 - pur * 2 : 3 - pur * 2);
    }
    const g = parts.toSprite(Rh, 0, Rh.yHip + 3); U.dot(E, g[0] - 2, g[1], M.soul, 3 - pur); U.dot(E, g[0] + 2, g[1], M.soul, 2);
  }
  // 候选部件：tornPennant 撕烂的三角小旗——挂在枪杆上往后垂，下沿锯齿缺口，随 P.fph 摆
  function tornPennant() {
    E.part(); const c = parts.along(HP, spearOpt(), 12), sw = P.fph & 1 ? 1 : 0, W = [6, 5, 4, 2, 1];
    for (let j = 0; j < W.length; j++) for (let i = 0; i < W[j]; i++) { if ((j === 1 && i === 4) || (j === 2 && i === 2) || (j === 3 && i === 0)) continue; parts.px(E, Rh, c[0] - i - (j > 1 ? sw : 0), c[1] + 1 + j, M.flag, i === 0 ? 3 : j === W.length - 1 ? 2 : 0); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    legs(1); Q.body(E, rig, P, o); ribs(); legs(0);
    Q.head(E, rig, P, o); skull(); brokenHorn();
    parts.arm(E, Rh, HP, { side: 'B', sleeve: 'plate', mat: M.ironD, pauldron: M.ironD, hand: M.ironD, grip: 'big' });
    parts.torso(E, Rh, HP, { style: 'plate', mat: M.iron, belt: M.rust, buckle: M.iron });
    parts.px(E, Rh, Rh.hx - 1, Rh.yS - 1, M.ink, 1); parts.px(E, Rh, Rh.hx, Rh.yS - 1, M.ink, 1); parts.px(E, Rh, Rh.hx - 2, Rh.yS + 2, M.rust, 2); parts.px(E, Rh, Rh.hx + 1, Rh.yS + 5, M.rust, 2);   // 颈口空洞 + 锈斑
    soulFlame();
    parts.spear(E, Rh, HP, spearOpt()); tornPennant();
    parts.arm(E, Rh, HP, { sleeve: 'plate', mat: M.iron, pauldron: M.iron, pStyle: 'spike', hand: M.iron, grip: 'big' });
  }
  const orig = new Uint8Array(hero.w * hero.h);
  const FLK = [[-7, -12], [3, -22], [9, -17]];
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    const out = hero.out, w = hero.w, h = hero.h;
    if (!P.ghost && !P.flick && !P.sil) return;
    orig.set(out);
    const gx = 20 - P.ghost * 40 / 12, fl = P.flick ? FLK[P.flick - 1] : null, sy = -34 + (12 - P.sil) * 35 / 12;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (orig[i] === 255) continue; const lx = x - hero.ox - P.bx, ly = y - hero.oy, b = B8[(y & 7) * 8 + (x & 7)];
      if (P.sil && ly >= sy) { const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || orig[i - 1] === 255 || orig[i + 1] === 255 || orig[i - w] === 255 || orig[i + w] === 255; out[i] = edge ? EL[0] : EL[1]; continue; }   // 纯魂光剪影（逐行恢复）
      if (P.ghost && lx >= gx && b < 0.5) { out[i] = 255; continue; }                                  // 从头到尾逐列变成抖动半透明（删像素）
      if (fl && Math.abs(lx - fl[0]) + Math.abs(ly - fl[1]) < 5 && b < 0.55) out[i] = 255;
    }
  }

  // ───── 特效 ─────
  const shade = [new Sprite(hero.w, hero.h, hero.ox, hero.oy)];
  let chargeAcc = 0, soulAcc = 0, wispAcc = 0, shadeT = 9, flyT = 9, thrT = 9, thrX = 0, thrY = 0;
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); drawHero(); bakeHero(); copySprite(shade[0], hero); hero.k1 = hero.k2 = -1;
      releaseOrbit(30, 70, 0.3, 0.6); burst(HX + 2, HY - 18, 16, 30, 80, 0.25, 0.5, R_EL, 6); ring(HX + 2, HY - 16, 1, R_EL);
      shoot(1, DUMMY_X - 6, HY - 18, -180, HX - 28, FXI.enemy, 0, { glow: -1 });                   // 敌方普攻小弹：从假人那边射来，直接穿过剪影
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const tx = scrX(P.gx), ty = HY + P.gy; thrT = 0; thrX = tx; thrY = ty;
      fx.cross(DUMMY_X - 3, ty, 5, R_EL, 0.25, 2); burst(DUMMY_X - 3, ty, 10, 30, 90, 0.15, 0.4, R_EL, 6); burst(DUMMY_X - 3, ty, 4, 30, 70, 0.1, 0.3, FXI.impact, 6); hitDummy(0);
      sfx('swing', { kind: 'thrust', w: 0.5 }); sfx('hit', { mat: 'metal', w: 0.5 });
    }
    if (s === CAST && t === T_PASS) shadeT = 0;
    if (s === DEATH && t === T_SHATTER) {                                                            // 散架：空甲、枪、骨头按 4 格小块散落成堆
      poseAt(DEATH, t - 1 / 12, t - 1 / 12); P.dq = 0; drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 4, power: 0.6, fromX: 2, fromY: -16, fadeAt: 1.2, fadeDur: 0.8, ramp: R_EL });
      burst(HX + 2, HY - 18, 12, 30, 80, 0.2, 0.5, R_EL, 6); shake(0.14, 1); flyT = 0; sfx('hit', { mat: 'metal', w: 0.6 });
      poseAt(DEATH, t, t);
    }
    if (s === DEATH && t === T_PILE) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 14 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.5 }); }
  }
  const T_PASS = 2 / 12, T_SHATTER = INCOMING + 0.45, T_PILE = INCOMING + 0.8;
  const EVENTS = [[], [], [T_HIT], [], [T_PASS], [], [], [T_SHATTER, T_PILE], []];
  function impactOn(k, x, y) {                                                                       // 小弹从身后穿出：只溅起 8 颗魂光，身体不击退
    if (k === 1) { for (let i = 0; i < 8; i++) { const a = PI + (Math.random() - 0.5) * 1.6, v = 30 + Math.random() * 50; spawn(K_BURST, x, y, Math.cos(a) * v, Math.sin(a) * v * 0.8 - 10, 0.3 + Math.random() * 0.3, R_EL); } shake(0.1, 1); sfx('impact', { pal: 'shadow', w: 0.55 }); }
  }
  function hurtFx(s) { const hx = HX + 2, hy = HY - 18; burst(hx, hy, s === DEATH ? 24 : 14, 40, 110, 0.2, 0.5, R_EL, 12); burst(hx, hy, 6, 40, 100, 0.15, 0.35, FXI.impact, 10); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true; }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                                                          // 四周魂光向身体汇聚
      chargeAcc += dt * (18 + 28 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 14 + Math.random() * 10, a = Math.random() * 6.2832; spawn(K_SPIRAL_PT, HX + 2, HY - 16, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === IDLE || state === MOVE || state === ATTACK || state === RECOVER) {                  // 雾尾：后腿往后飘的魂雾
      wispAcc += dt * (state === MOVE ? 9 : 4);
      while (wispAcc >= 1) { wispAcc -= 1; const d = P.flip ? -1 : 1; spawn(K_TRAIL, scrX(-9 + P.bx - Math.random() * 4), HY - 3 - Math.random() * 5, -d * (6 + Math.random() * 8), -2 - Math.random() * 3, 0.4 + Math.random() * 0.3, R_EL); }
    }
    if (state === IDLE && Math.random() < dt * 3) spawn(K_EMBER, scrX(P.fx0), HY + P.fy0 - 2, Math.random() * 6 - 4, -8 - Math.random() * 6, 0.4 + Math.random() * 0.3, R_EL);
    if (state === DEATH && stT > T_SHATTER + 0.8 && stT < INCOMING + 2.4) { soulAcc += dt * 20; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 30, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, R_EL); } }
    shadeT += dt; flyT += dt; thrT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; wispAcc = 0; shadeT = 9; flyT = 9; thrT = 9; }
  function fxBack(f12) {
    if (!P.dq) groundShadow(scrX(P.bx), 12, P.lift | 0);
    if (P.rim >= 2 && !P.dq) floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  function fxMid() {                                                                                 // 穿体后身后留下 2 个剪影残像
    if (shadeT < 0.45) { const q = shadeT / 0.45; blitShape(shade[0], HX + P.mx - 7, HY, P.flip, EL[2], Math.min(1, 0.15 + q)); blitShape(shade[0], HX + P.mx - 14, HY, P.flip, EL[3], Math.min(1, 0.35 + q)); }
  }
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const gx = scrX(P.gx), gy = HY + P.gy, L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } }
    if (thrT < 2 / 12) {                                                                             // 直刺：枪尖前两行横向刺光 + 身后速度线
      const c0 = thrT < 1 / 12 ? EL[0] : EL[1]; for (let k = 1; k <= 7; k++) { put(thrX + k, thrY, k < 4 ? c0 : EL[2]); if (k < 5) put(thrX + k, thrY + 1, EL[2]); }
      for (let j = 0; j < 3; j++) for (let k = 0; k < 6; k++) if (((k + j) & 1) === 0) put(scrX(-14 + P.bx) - k, HY - 12 - j * 5, EL[2 + (k > 3 ? 1 : 0)]);
    }
    if (flyT < 1.0) {                                                                                // 魂火从颈口飞起绕一圈后熄灭
      const q = flyT / 1.0, a = q * 2 * PI * 1.1, r = 6 * (1 - q * 0.4), x = R(HX + 2 + Math.sin(a) * r), y = R(HY - 22 - q * 14 - Math.cos(a) * r * 0.6);
      if (q < 0.85) { put(x, y, EL[0]); put(x, y - 1, EL[1]); put(x - 1, y, EL[1]); put(x + 1, y, EL[2]); put(x, y - 2, EL[2]); put(x, y + 1, EL[1]); }
      else if (q < 0.93) { put(x, y, EL[2]); put(x - 1, y - 1, EL[3]); put(x + 1, y - 1, EL[3]); }
    }
  }

  return {
    name: '幽灵骑士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.soul, M.core], HIT_POINT: [2, -18], EVENTS, R_HURT: R_EL,
    deathKit: { mode: 'chunks', at: T_SHATTER },
    SFX: { body: 'ghost', how: 'shatter', pal: 'shadow', style: 'shadow', w: 0.55, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
