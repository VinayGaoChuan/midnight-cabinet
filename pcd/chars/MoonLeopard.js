// 月豹（衍生单位 · 恶魔 · 射手 · 普通 · 远程 600；灵召塔的召唤物）：细长低伏的夜靛蓝猫科，头平于肩线。
//   背上悬浮一轮月牙光环（弧顶高出背线约 5 格，发射器 + 发光体）；长尾高翘、尾尖一颗月珠；耳尖长簇毛；额头一枚灵门符文（同灵召塔），身上银色月牙斑。
// 攻击：背上月环一亮，射出一枚旋转月牙镖（背负 × 射）。
// 技能（无特性，表现召唤物的全力一击）：身下浮出小灵门法阵，月环由细变满、光点沿环流动；施放一跃而起，月环脱背化作大月弧回旋镖，
//   切过假人 → 折返再切一次（两道月光斩）+ 月光十字；收招时月弧飞回背上。
// 死亡「召回」：倒下后身体化成单色月光剪影，缩成一个光点，沿弧线飞回画面后方（回到灵门）。
// 身体用 parts-beast 的 quad（cat 头放大）；月环、月珠尾、耳簇、额符文、月牙斑、召回光点是本模块的部件 / 特效。
PCD.define('MoonLeopard', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 颜色、材质 ─────
  const C_M = ['#fff6d0', '#e6d68a', '#9a8e5a', '#464028'].map((h) => E.color(h));           // 淡月黄 · 月金 · 暗金 · 深橄榄
  const R_EL = fxRamp('moon', [21, C_M[0], C_M[1], C_M[2], C_M[3]]), EL = FXR[R_EL];           // 月华：21 白 → 淡月黄 → 月金 → 暗金 → 深橄榄
  const SOUL = FXR[FXI.soul];
  const m = B.mats(E, {
    main: 'blue', muz: [0, 59, 60, 17], mane: 'pale', teeth: 'white',   // 夜靛蓝短毛 · 浅色腹线 / 吻 · 银白耳簇
    eye: [0, 0, C_M[1], C_M[1]], glow: [C_M[1], C_M[1], C_M[0], 21],
  });
  const M = {
    spot: E.defMat('pale', 1),                                           // 银色月牙斑
    moon: E.defMat([C_M[3], C_M[2], C_M[1], C_M[0]], 1, 1),              // 月环 / 月珠：平涂，手工色调
    moonHot: E.defMat([C_M[2], C_M[1], C_M[0], 21], 1, 1),               // 蓄满 / 出手的月环
    moonDead: E.defMat([0, C_M[3], C_M[3], C_M[2]], 1, 1),               // 熄灭
    rune: E.defMat([25, 24, 23, 22], 1, 1),                              // 额头灵门符文（soul）
    sil: E.defMat([C_M[2], C_M[1], C_M[1], C_M[1]], 1),                  // 召回时的单色月光剪影
  };
  const SHAPE = { len: 13, chest: 4, rump: 3.6, waist: 0.45, hump: 0, leg: 5.5, lw: 2, thigh: 2.2, farDx: -2, stride: 4, lift: 2,
    neck: 2.5, neckA: 0.3, neckW: 2.3, head: { type: 'cat', w: 7, h: 6, snout: 1.8, snH: 3.5, earH: 3 }, headA: 0.1,
    tail: 'none', mane: 'none', fur: 1, pattern: null, foot: 'paw', m };
  const o = Q.shape(SHAPE);

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 60, 52, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 13], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'spec', 'mane']) RIM.skip[m[k]] = 1;
  for (const k of ['moon', 'moonHot', 'moonDead', 'rune', 'sil']) RIM.skip[M[k]] = 1;
  // 本角色字段：moon 月环 0 不在背上 · 1 细 · 2 常态 · 3 蓄满 / 出手 · 4 熄灭；sil 召回剪影；rn 额符文亮
  const SPEC = Q.KEYS.concat(B.COMMON, [['moon', 0, 4], ['sil', 0, 1], ['rn', 0, 1]]);
  const P = {}; Q.reset(P);
  const resetX = () => { P.moon = 2; P.sil = 0; P.rn = 0; P.gx = 0; P.gy = 0; };
  resetX();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'reach', 'glow', 'paw', 'lift'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, reach: 0, glow: 0, paw: 0, lift: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const T_HIT = 2 / 12;
  const A_WIND = pose({ crouch: 1, pitch: -1, head: 1, tail: -1, bx: -1, glow: 1 });
  const A_FIRE = pose({ crouch: 0, pitch: 1, head: -1, tail: 1, jaw: 1, glow: 2 });
  const A_HOLD = pose({ crouch: 0, pitch: 1, head: 0, tail: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [T_HIT, A_FIRE, 'snap'], [0.25, A_FIRE, 'lin'], [0.42, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_UP = pose({ crouch: 2, pitch: -1, head: 1, ear: 1, tail: 2, glow: 1 });
  const LEAP = [4, 6, 6, 4, 2, 0];                                                                 // 施放 6 帧的离地高
  // 待机个性「坐下舔爪洗脸」：[crouch, pitch, head, paw, jaw, tail]
  const SIT = [[2, 3, 0, 0, 0, 0], [3, 6, 0, 0, 0, 1], [3, 6, 1, 2, 0, 1], [3, 6, 2, 3, 1, 0], [3, 6, 2, 3, 0, 0], [3, 6, 1, 3, 1, -1], [3, 6, 2, 3, 0, -1], [3, 6, 0, 1, 0, 1], [2, 3, 0, 0, 0, 0]];
  const SIT0 = 1.3;

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.tail = [0, 1, 1, 0, -1, -1][Math.floor(f12 / 3) % 6];                                        // 尾尖月珠慢摆
    if (lp >= SIT0 - 1e-6 && lp < SIT0 + SIT.length / 12 - 1e-6) {
      const s = SIT[Math.min(SIT.length - 1, f12of(lp - SIT0))]; P.crouch = s[0]; P.pitch = s[1]; P.head = s[2]; P.paw = s[3]; P.jaw = s[4]; P.tail = s[5]; P.bob = 0;
    }
    if (f12 % 24 === 5) P.moon = 3;                                                                // 月环偶尔一亮
  }
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  const tmp = {};
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    Q.reset(P); resetX();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                        // 潜行低伏：压低身子、头平于背，步子长、无声
      Q.anim.walk(P, tq); P.crouch = 1; P.head = 1; P.tail = P.tail - 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      keys(tq, ATK, tmp, F_ALL); apply(tmp);
      const k = f12of(tq); P.moon = k === 1 || k === 2 ? 3 : k === 3 || k === 4 ? 1 : 2; P.rim = k >= 1 && k <= 3 ? 1 : 0;
    } else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_UP, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_UP);
      P.moon = tq < 0.35 ? 1 : tq < 0.9 ? 2 : ((f12 & 1) ? 3 : 2);                                  // 月环由细变满
      P.glow = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.rn = tq > 0.3 ? 1 : 0;
      if (tq > 1.1) P.tail = (f12 & 1) ? 2 : 1;
    } else if (st === CAST) {                                                                      // 一跃而起，月环脱背
      apply(pose({ crouch: 0, pitch: 1, head: -1, tail: -1, reach: 3, glow: 3, jaw: 2 }));
      const k = Math.min(5, f12of(tq)); P.lift = LEAP[k]; if (k >= 4) { P.reach = 1; P.pitch = 0; }
      if (k >= 5) { P.crouch = 1; P.reach = 0; }
      P.moon = 0; P.rim = 2; P.rn = 1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, pose({ crouch: 1, glow: 2 }), REST, q, F_ALL); apply(tmp);
      P.moon = tq < 0.25 ? 0 : tq < 0.34 ? 3 : 2; P.rim = q < 0.5 ? 2 : 1; P.rn = q < 0.5 ? 1 : 0;   // 月弧飞回背上
      if (tq >= 0.25 && tq < 0.34) P.head = -1;
    } else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.moon = h < 0.2 ? ((f12 & 1) ? 1 : 3) : 2; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12, { at: 0.5, dur: 0.25, dx: -9, hop: 4 });                             // 月环从背上滑落、落在身后
        P.moon = d < 0.3 ? ((f12 & 1) ? 3 : 1) : d < 0.9 ? ((f12 & 1) ? 2 : 4) : 4;
        P.dq = 0; P.sil = d >= T_SIL - INCOMING - 1e-6 ? 1 : 0;
        if (d >= T_GONE - INCOMING - 1e-6) P.dq = 1;                                                 // 剪影收成光点，交给特效
        else if (d >= T_SHRINK - INCOMING - 1e-6) P.dq = clamp01((d - (T_SHRINK - INCOMING)) / (T_GONE - T_SHRINK)) * 0.95;
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; P.moon = tq > 0.85 ? 3 : 2; }
    rig = Q.rig(P, o);
    const hc = haloC(); P.gx = R(hc[0]) + P.bx; P.gy = R(hc[1]);
    B.key(P, SPEC);
  }
  const T_SIL = INCOMING + 1.0, T_SHRINK = INCOMING + 1.3, T_GONE = INCOMING + 1.7;

  // ───── 几何 ─────
  const HR = 5, HR_IN = 4.6, HOFF = [0, 0.9, 1.6, 2.1, 1.6];                                        // 月环外半径、内半径、各档内圆下移量（越大越粗）
  function haloC() {                                                                               // 月环中心（本地坐标）：背中段上方，两只角离背 1 格
    const x = R((rig.C1.x + rig.C2.x) / 2 + 0.5), s = Q.span(rig, o, x);
    return [x, (s ? s[0] : rig.C1.y - 4) - 3];
  }
  // 候选部件：moonHalo（悬浮月牙光环）—— 外圆减去下移的内圆，弧顶厚、两角尖，角尖朝下；lv 决定粗细和亮度。一个部件（发光体）
  function moonHalo(cx, cy, lv, mat) {
    E.part();
    const d = HOFF[lv] || 1.6;
    for (let y = -HR - 1; y <= 1; y++) for (let x = -HR - 1; x <= HR + 1; x++) {
      const r0 = Math.hypot(x, y), r1 = Math.hypot(x, y - d); if (r0 > HR + 0.35 || r1 <= HR_IN) continue;
      const edge = r0 > HR - 0.6, top = y <= -HR + 1 && Math.abs(x) <= 1;
      U.dot(E, cx + x, cy + y, mat, lv === 4 ? 2 : top ? 4 : edge ? 3 : (lv >= 2 ? 4 : 3));
    }
  }
  // 候选部件：orbTail（细长翘尾 + 尾尖月珠）—— 细尾（根 2 格），尾尖一颗 3×3 十字月珠（单独一个部件，发光体）
  function orbTail() {
    E.part();
    const n = 11, sw = (P.tail | 0) * 0.22, lie = rig.lie;
    let x = rig.tail.x, y = rig.tail.y, a = lie === 2 ? 0.05 : 0.3;
    for (let k = 0; k <= n; k++) {
      const q = k / n; U.disc(E, x, y, k < 3 ? 0.9 : 0.5, m.limb, 0);
      a += (lie === 2 ? 0.02 : k < 6 ? 0.2 : 0.02) - sw * (0.2 + q) * 0.4 - (k > 8 ? 0.12 : 0);
      x -= Math.cos(a); y -= Math.sin(a); if (y > -0.5) { y = -0.5; a = 0; }
    }
    E.part();
    const mat = P.moon === 4 ? M.moonDead : M.moon, cx = R(x), cy = R(y);
    for (const [dx, dy, t] of [[0, 0, 4], [-1, 0, 3], [1, 0, 3], [0, -1, 4], [0, 1, 2]]) U.dot(E, cx + dx, cy + dy, mat, t);
    return [cx, cy];
  }
  function crescentSpots() {                                                                       // 银色月牙斑：紧跟躯干画（同一个部件）
    const C1 = rig.C1, C2 = rig.C2;
    [0.08, 0.45, 0.82].forEach((f, i) => {
      const x = R(C2.x + (C1.x - C2.x) * f), s = Q.span(rig, o, x); if (!s || s[1] - s[0] < 6) return;
      const y = s[0] + 2 + (i === 1 ? 1 : 0);
      U.dot(E, x, y, M.spot, 4); U.dot(E, x - 1, y + 1, M.spot, 3); U.dot(E, x - 1, y + 2, M.spot, 3); U.dot(E, x, y + 3, M.spot, 3);
    });
  }
  function headExtras() {                                                                          // 耳簇 + 额符文：紧跟头画（同一个部件）
    const F = Q.headFrame(rig, o), W = F.W, Hh = F.Hh, eh = 3;
    const eb = F.at(-W * 0.35, -Hh + 0.3), ex = R(eb[0]), ey = R(eb[1]), xo = ex - R((eh - 1) * (P.ear ? 1 : 0.3));
    if (!rig.lie) { U.dot(E, xo, ey - eh - 1, m.mane, 4); U.dot(E, xo - 1 + (P.ear ? -1 : 0), ey - eh - 2, m.mane, 3); }   // 耳尖长簇毛 2 格
    const r = F.at(-W * 0.05, -Hh + 1.4); U.dot(E, r[0], r[1], M.rune, P.rn ? 4 : 3); U.dot(E, r[0], r[1] + 1, M.rune, P.rn ? 3 : 2);
    const r2 = F.at(-W * 0.05 - 1, -Hh + 1.4); U.dot(E, r2[0], r2[1], M.rune, 2);
  }

  // ───── 画 ─────
  function drawHero() {
    begin(hero, P.bx, 0);
    const lieLegs = P.lie === 2;
    if (!lieLegs) Q.legs(E, rig, P, o, 1);
    orbTail();
    Q.body(E, rig, P, o); crescentSpots();
    if (!lieLegs) Q.legs(E, rig, P, o, 0);
    Q.head(E, rig, P, o); headExtras();
    if (lieLegs) { Q.legs(E, rig, P, o, 1); Q.legs(E, rig, P, o, 0); }
    if (P.moon && !P.drop) { const [cx, cy] = haloC(); moonHalo(cx, cy, P.moon, P.moon === 3 ? M.moonHot : P.moon === 4 ? M.moonDead : M.moon); }
    else if (P.drop) { const x0 = R((rig.C1.x + rig.C2.x) / 2) + P.dsx; moonHalo(x0, P.drop === 2 ? -2 : -2 - P.dsy, P.moon, P.moon === 4 ? M.moonDead : M.moon); }
    if (P.sil) { const S = hero; for (let i = 0; i < S.mat.length; i++) if (S.mat[i]) { S.mat[i] = M.sil; S.tone[i] = 0; S.part[i] = 1; } }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, soulAcc = 0, trailAcc = 0, lastGf = -9, mzT = 9, mzX = 0, mzY = 0, bmX0 = 0, bmY0 = 0, bodyX = 0, bodyY = 0;
  const haloScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CHARGE) fx.circle(HX + 1, FLOOR, 13, 3, FXI.soul, 1.4, 1, 0);                        // 身下的小灵门法阵
    if (s === CAST) {
      poseAt(CHARGE, DUR[CHARGE] - 1 / 60, E.simT); const [gx, gy] = haloScr(); bmX0 = gx; bmY0 = gy;
      releaseOrbit(30, 80, 0.3, 0.6); burst(gx, gy, 18, 40, 110, 0.25, 0.55, R_EL, 10); ring(gx, gy, 1, R_EL);
      fx.cross(gx, gy, 6, R_EL, 0.3, 2);
      for (let i = 0; i < 8; i++) spawn(K_DUST, HX - 8 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust);   // 起跳蹬地
      shake(0.28, 2); flash(0.05);
    }
    if (s === DEATH) { bodyX = 0; bodyY = 0; }
  }
  function slashHit(n) {
    const x = DUMMY_X, y = HY - 16;
    if (n === 1) fx.slash(x - 2, y, 9, -0.5, 2.1, R_EL, 0.3, 2, 2); else fx.slash(x + 2, y, 9, 3.6, 5.6, R_EL, 0.3, 2, 2);
    burst(x, y, n === 1 ? 16 : 24, 40, 110, 0.25, 0.5, R_EL, 10); hitDummy(1, n === 1 ? 1 : -1);
    if (n === 2) { fx.cross(x, y - 2, 7, R_EL, 0.35, 2); ring(x, y, 0, R_EL); dummyFx({ dur: 1.0, tint: 'moon' }); }
    shake(0.12, 1); sfx('impact', { pal: 'holy', w: n === 1 ? 0.35 : 0.5 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {
      const [gx, gy] = haloScr(), tx = DUMMY_X - 4, ty = HY - 16;
      E.shoot(1, gx + 3, gy, 170, tx, R_EL, (ty - gy) * 170 / (tx - gx - 3), { trail: { every: 3, life: [0.1, 0.2] } });
      mzT = 0; mzX = gx; mzY = gy; burst(gx, gy - 1, 6, 20, 50, 0.15, 0.3, R_EL, 4);
      sfx('swing', { kind: 'throw', w: 0.25 }); sfx('shoot', { proj: 'orb' });
    }
    if (s === CAST && t === T_CUT1) slashHit(1);
    if (s === CAST && t === T_CUT2) slashHit(2);
    if (s === RECOVER && t === T_CATCH) { const [gx, gy] = haloScr(); burst(gx, gy, 8, 20, 50, 0.15, 0.3, R_EL, 4); }
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.3 });
    }
    if (s === DEATH && t === T_SIL) { poseAt(DEATH, T_SIL, T_SIL); bodyX = scrX(R((rig.C1.x + rig.C2.x) / 2) + P.bx); bodyY = HY + R(rig.C1.y); burst(bodyX, bodyY, 10, 15, 40, 0.3, 0.5, R_EL, 4); }
  }
  const T_CUT1 = 2 / 12, T_CUT2 = 5 / 12, T_CATCH = 3 / 12;
  const EVENTS = [[], [], [T_HIT], [], [T_CUT1, T_CUT2], [T_CATCH], [], [INCOMING + 0.66, T_SIL], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 10, 40, 90, 0.15, 0.35, R_EL, 8); fx.cross(x - 1, y, 3, R_EL, 0.2, 2); hitDummy(0, 1); sfx('hit', { mat: 'magic', w: 0.25 }); }
  }
  // 大月弧回旋镖的路径：施放开始后 bt 秒（0–0.75）→ 屏幕坐标。去程切过假人 → 转弯 → 回程再切一次 → 飞回背上
  function boomPos(bt) {
    const K = [[0, bmX0, bmY0, 0], [T_CUT1, DUMMY_X, HY - 16, -6], [3.5 / 12, DUMMY_X + 12, HY - 26, -2], [T_CUT2, DUMMY_X - 1, HY - 12, 2], [0.75, bmX0, bmY0, -10]];
    for (let i = 1; i < K.length; i++) {
      if (bt > K[i][0] && i < K.length - 1) continue;
      const a = K[i - 1], b = K[i], s = clamp01((bt - a[0]) / (b[0] - a[0]));
      return [a[1] + (b[1] - a[1]) * s, a[2] + (b[2] - a[2]) * s + Math.sin(PI * s) * b[3]];
    }
    return [bmX0, bmY0];
  }
  function boomTime() { const s = E.state, t = E.stT; return s === CAST ? t : s === RECOVER && t < 0.25 ? 0.5 + t : -1; }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.3) {                                                           // 月华光点螺旋汇进背上月环
      const [gx, gy] = haloScr(); chargeAcc += dt * (10 + 18 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = -PI + Math.random() * PI, r = 12 + Math.random() * 8; E.spawnX(K_SPIRAL, gx, gy, (r - 4) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 3 + Math.random() * 2 }); }
    }
    const bt = boomTime();
    if (bt >= 0) {                                                                                 // 回旋镖拖尾
      trailAcc += dt * 40; const [x, y] = boomPos(bt);
      while (trailAcc >= 1) { trailAcc -= 1; spawn(K_EMBER, x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, 0.2 + Math.random() * 0.2, R_EL); }
    }
    if (state === MOVE && P.gf !== lastGf) { if (P.gf === 0 || P.gf === 2) sfx('step', { w: 0.15 }); lastGf = P.gf; }   // 潜行：无尘
    if (state === IDLE && P.moon === 3 && Math.random() < dt * 20) { const [gx, gy] = haloScr(); spawn(K_EMBER, gx + (Math.random() - 0.5) * 8, gy - 4, 0, -6 - Math.random() * 4, 0.4, R_EL); }
    if (state === DEATH && stT > T_GONE && stT < INCOMING + 2.5) {                                 // 召回光点飞行的拖尾
      const [x, y] = recallPos(stT); soulAcc += dt * 30;
      while (soulAcc >= 1) { soulAcc -= 1; spawn(K_EMBER, x + (Math.random() - 0.5) * 2, y + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 4, 2 + Math.random() * 4, 0.3 + Math.random() * 0.25, R_EL); }
    }
    mzT += dt;
  }
  function recallPos(t) {                                                                          // 光点从身体中心沿弧线飞回左上方（画面后方的灵门）
    const s = clamp01((t - T_GONE) / 0.7), x0 = bodyX || HX, y0 = bodyY || HY - 5;
    return [x0 - s * 40, y0 - Math.sin(s * PI * 0.5) * 34 - s * s * 8];
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; trailAcc = 0; lastGf = -9; mzT = 9; bodyX = 0; bodyY = 0; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  function crescent(cx, cy, r, th, d, c0, c1, c2) {                                                // 屏幕上的月牙：外圆 r 减去朝 th 方向偏移 d 的内圆
    const ux = Math.sin(th), uy = -Math.cos(th);
    for (let y = -r - 1; y <= r + 1; y++) for (let x = -r - 1; x <= r + 1; x++) {
      const r0 = Math.hypot(x, y); if (r0 > r + 0.35) continue;
      const r1 = Math.hypot(x - ux * d, y - uy * d); if (r1 <= r - 0.5) continue;
      put(R(cx + x), R(cy + y), r0 > r - 0.7 ? c2 : r1 > r + 0.6 ? c0 : c1);
    }
  }
  function fxFront(f12) {
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[2]; for (let k = 1; k <= 3; k++) { put(mzX + k + 1, mzY, c); put(mzX, mzY - k - 2, c); } }   // 出手：月环顶的星芒
    if (E.state === CHARGE && P.moon && !P.lie) {                                                  // 光点沿月环流动
      const [gx, gy] = haloScr();
      for (let j = 0; j < 2; j++) { const a = -PI + ((f12 + j * 4) % 8) / 7 * PI; put(R(gx + Math.cos(a) * (HR - 0.4)), R(gy + Math.sin(a) * (HR - 0.4)), 21); }
    }
    const bt = boomTime();
    if (bt >= 0) { const [x, y] = boomPos(bt); crescent(x, y, 6, f12 * PI / 4, 2.6, 21, EL[1], EL[2]); }
    if (E.state === DEATH) {
      const t = E.stT;
      if (t >= T_SHRINK && t < T_GONE + 0.02) {                                                   // 剪影收缩成光点
        const s = clamp01((t - T_SHRINK) / (T_GONE - T_SHRINK)), rx = 7 * (1 - s) + 1, ry = 3.5 * (1 - s) + 1;
        for (let y = -4; y <= 4; y++) for (let x = -8; x <= 8; x++) { const q = (x / rx) ** 2 + (y / ry) ** 2; if (q <= 1) put(bodyX + x, bodyY + y, q < 0.3 ? 21 : q < 0.7 ? EL[1] : EL[2]); }
      } else if (t >= T_GONE && t < INCOMING + 2.45) {
        const [x, y] = recallPos(t), px = R(x), py = R(y);
        put(px, py, 21); put(px + 1, py, EL[1]); put(px - 1, py, EL[1]); put(px, py - 1, EL[1]); put(px, py + 1, EL[1]);
        if (f12 & 1) { put(px + 2, py, EL[2]); put(px - 2, py, EL[2]); put(px, py - 2, EL[2]); put(px, py + 2, EL[2]); }
      }
    }
  }
  function drawShot(k, x, y, d, f12, Rr) {                                                         // 旋转月牙镖：每帧转 90°
    if (k !== 1) return false;
    crescent(x, y, 2.5, (f12 & 3) * PI / 2 + PI / 4, 1.4, 21, EL[1], EL[2]); return true;
  }

  return {
    name: '月豹', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.moon, M.moonHot, M.rune, M.sil, m.eye, m.glow], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'dissolve', pal: 'holy', style: 'blade', w: 0.25 },
    REVIVE: { ramp: R_EL },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
