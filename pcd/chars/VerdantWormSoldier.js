// 翠蠕虫兵（敌人 · 混沌 · 普通 · 近战）：翠蠕虫一族的小兵——还没长出尾刺的幼虫。淡翠黄绿的分节软虫身贴地，
//   头前一对弯钳大颚（缩小版的蝎螯，张开比头还宽），背上一排 6 根翠绿晶刺（族记号），尾端一截上翘 2 格的小尾刺（以后会长成统领的毒尾）。
// 攻击：身体蜷成 S 形，再弹射扑出，用钳颚撞咬（冲撞）。
// 技能（没有特性，按描述「拥有蜂拥式攻击的习性」）：蓄力时身体压低蜷紧，背上晶刺从尾到头逐根亮起，身后涌来 2 个翠绿半透明同伴剪影；
//   施放时本体和 2 个剪影错开 0.08 s 依次弹射扑出；命中连续三次小咬合，每次十字星芒 + 翠绿外爆，目标连摇三下。
// 死亡：蜷成一圈 → 落地 → 变干发黄、晶刺熄灭 → 碎成几截（死亡套件 chunks）。
// 身体用 parts-beast 的 serpent（脊点、贴地拱起、颈竖起）；钳颚、晶刺、尾刺、环节缝、蜷圈是本模块的部件。
PCD.define('VerdantWormSoldier', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_DUST, K_EMBER,
    spawn, burst, ring, shake, flash, fx, sfx, hitDummy, put, scrX, blitShape, copySprite, death, floorGlow } = E;
  const B = E.parts.beast, S = B.serpent, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.nature, EL = FXR[R_EL];                                              // 蜂拥 · 翠绿：白 → 淡黄绿 → 黄绿 → 绿 → 深绿
  const m = B.mats(E, { main: [34, 37, 38, 17], eye: [0, 0, 0, 0] });                   // 淡翠黄绿软体（身体 band 2，头 band 1）
  const M = {
    seam: E.defMat([0, 34, 35, 36], 1),                 // 环节缝（moss 暗段，画进身体部件）
    crys: E.defMat([34, 35, 36, 38], 1),                // 晶刺（nature 亮段；待机）
    crysLit: E.defMat([35, 37, 38, 21], 1, 1),          // 晶刺亮起（发光体，平涂）
    mand: E.defMat('sand', 1), sting: E.defMat('sand', 1),
    dry1: E.defMat([34, 61, 37, 62], 2), dry2: E.defMat([20, 19, 61, 62], 2),   // 变干：发黄 → 干枯的褐壳
    dryC: E.defMat('stone', 1),                         // 熄灭的晶刺
    glint: E.defMat([0, 0, 21, 21], 1, 1),              // 眼里的一格反光
  };
  const HX = 72, DUR = DEFAULT_DUR.slice(), hero = new Sprite(64, 30, 30, 25);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [m.eye, m.ink, M.crys, M.crysLit, M.mand, M.sting, M.glint, M.dryC]) RIM.skip[k] = 1;

  // ───── 形体（serpent 的形体参数按姿势换一份，sh 编进缓存键） ─────
  const BASE = { n: 18, r: 3, rTail: 1.2, arch: 1, waves: 0.5, rise: 4, neck: 3, head: 'worm', hl: 5, hh: 5, bands: 0, belly: 0, scales: 0, spikes: 0, m };
  const mk = (o) => S.shape(Object.assign({}, BASE, o));
  const SH = [
    mk({}),                                   // 0 待机：伸
    mk({ n: 17, arch: 2 }),                   // 1 待机：缩
    mk({ n: 19, arch: 0 }),                   // 2 拱行 · 接触：拉直贴地
    mk({ n: 17, arch: 3 }),                   // 3 拱行 · 经过：尾段拱起（尾往前收）
    mk({ n: 15, arch: 5 }),                   // 4 拱行 · 接触：中段拱到最高
    mk({ n: 17, arch: 3 }),                   // 5 拱行 · 经过：前段放平（头往前送）
    mk({ n: 15, arch: 3, waves: 1.0, rise: 2 }),   // 6 攻击预备：蜷成 S 形
    mk({ n: 20, arch: 0, rise: 2 }),          // 7 扑出：拉直
    mk({ n: 14, arch: 2, rise: 0 }),          // 8 蓄力：压低、蜷紧
    mk({ n: 20, arch: 1, rise: 3 }),          // 9 施放：弹射腾空
  ];
  // 本角色的姿势字段：sh 形体 0–9 · curl 蜷圈 0 否 / 1 半圈 / 2 整圈 · dry 变干 0–2 · lit 亮起的晶刺数 0–6 · lf 离地 0–4
  const EXTRA = [['sh', 0, 9], ['curl', 0, 2], ['dry', 0, 2], ['lit', 0, 6], ['lf', 0, 4]];
  const SPEC = S.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { S.reset(P); P.sh = 0; P.curl = 0; P.dry = 0; P.lit = 0; P.lf = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = S.rig(P, SH[0]);
  const HIT_POINT = [0, -4];

  // ───── 几何 ─────
  const groundN = (o) => Math.floor(o.n * 0.82 + 0.01) + 1;
  const CR_H = [2, 3, 4, 4, 3, 3];                                                        // 6 根晶刺的高（尾 → 头）
  function crystals() {                                                                   // → [[x, 身体顶 y, 高], ...]
    const o = SH[P.sh], p = rig.pts, Ng = groundN(o), out = [];
    for (let k = 0; k < 6; k++) { const i = Math.min(Ng - 1, R((Ng - 1) * (0.12 + 0.17 * k))); out.push([R(p[3 * i]), R(p[3 * i + 1] - p[3 * i + 2]), CR_H[k]]); }
    return out;
  }
  // 钳颚：上颚的像素模板（相对根部，y 向上为负），下颚是它的上下镜像；jaw 0 合拢 · 1 微张 · 2 张 · 3 大张（比头还宽）
  const MAND = [
    [[0, 0], [1, -1], [2, -1], [3, -1], [4, 0], [4, 1]],
    [[0, 0], [1, -1], [2, -2], [3, -2], [4, -2], [5, -2], [6, -1]],
    [[0, 0], [1, -1], [1, -2], [2, -3], [3, -3], [4, -3], [5, -3], [6, -2]],
    [[0, -1], [0, -2], [1, -3], [1, -4], [2, -5], [3, -5], [4, -5], [5, -4], [6, -3]],
  ];
  function mandPath(sign, j) { const H = rig.head, bx = R(H.x + 2), by = R(H.y) + sign; return MAND[j].map(([dx, dy]) => [bx + dx, by - sign * dy]); }
  const biteAt = () => { const H = rig.head; return [R(H.x + 6) + P.bx, R(H.y)]; };

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const lp = S.anim.idle(P, tq, f12, DUR[IDLE]); P.tongue = 0;
    P.sh = P.bob ? 1 : 0; P.rise = 0; P.bob = 0;                                          // 一伸一缩地蠕动
    P.jaw = 1;
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = f12of(lp - 1.6); P.jaw = (k & 1) ? 0 : 3; P.rise = 1; }   // 待机个性：钳颚咔咔空咬
  }
  const AJAW = [1, 2, 3, 0, 0, 0, 1, 1, 1], ABX = [0, -1, 4, 4, 3, 3, 2, 1, 0], ASH = [0, 6, 7, 7, 7, 0, 0, 0, 0], ASTR = [0, 0, 2, 2, 1, 1, 0, 0, 0];
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                               // 尺蠖式拱行：拱峰从尾段 → 中段 → 前段移过去
      const f = gait(tq); P.sh = [2, 3, 4, 5][f]; P.gf = [2, 3, 0, 1][f]; P.bx = [0, 0, 0, 1][f]; P.strike = [1, 0, 0, 1][f]; P.jaw = 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const k = Math.min(8, f12of(tq)); P.jaw = AJAW[k]; P.bx = ABX[k]; P.sh = ASH[k]; P.strike = ASTR[k]; P.rim = k >= 2 && k <= 3 ? 1 : 0;
    } else if (st === CHARGE) {
      const k = f12of(tq); P.sh = k < 2 ? 1 : 8; P.jaw = 2; P.bx = k < 2 ? 0 : -1;
      P.lit = Math.max(0, Math.min(6, Math.floor((tq - 0.2) / 0.14) + 1)); P.rim = tq < 0.45 ? 1 : 2;
      if (tq > 1.1) P.bx = (f12 & 1) ? -1 : 0;                                            // 最后 0.3 s 蓄劲发抖
    } else if (st === CAST) {
      const k = f12of(tq); P.lit = 6; P.rim = 3;
      if (k === 0) { P.sh = 9; P.bx = 3; P.lf = 3; P.jaw = 3; P.strike = 1; }             // 弹射腾空
      else { P.sh = 7; P.bx = 5; P.strike = 2; P.jaw = (k & 1) ? 0 : 2; }                  // 落在目标身上连咬
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); P.bx = R(5 * (1 - q)); P.sh = q < 0.3 ? 7 : q < 0.7 ? 1 : 0; P.strike = q < 0.3 ? 2 : 0;
      P.jaw = q < 0.5 ? 1 : 0; P.lit = R(6 * (1 - q)); P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { S.anim.hurt(P, h); P.hood = 0; if (h < 0.2) { P.sh = 1; P.jaw = 3; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.rise = 3; P.jaw = 3; P.eyes = 1; P.flash = d < 1 / 12 ? 1 : 0; P.sh = d < 0.15 ? 0 : 1; }
      else if (d < 0.5) { P.bx = -2; P.curl = 1; P.lf = 3; P.eyes = 1; }
      else {
        P.bx = -2; P.curl = 2; P.eyes = 1; P.lf = d < 0.58 ? 3 : d < 0.66 - 1e-6 ? 1 : 0;
        P.dry = d < 0.95 ? 0 : d < 1.15 ? 1 : 2;
        if (d >= 1.3 - 1e-6) P.dq = 1;                                                     // 碎成几截：交给死亡套件
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = S.rig(P, SH[P.sh]);
    const c = crystals()[3]; P.gx = c[0] + P.bx; P.gy = c[1] - 1 - P.lf;                   // 焦点：背中段的晶刺
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  const bodyMat = () => (P.dry === 2 ? M.dry2 : P.dry === 1 ? M.dry1 : m.body);
  // 候选部件：crystalRow（背上晶刺一排）—— 每根 1 格宽、从身体顶往上长，尖端往后偏 1 格；lit 根数从尾往头亮起（平涂发光材质）
  function crystalRow(list) {
    E.part();
    list.forEach(([x, y, h], k) => {
      const on = k < P.lit, mat = P.dry === 2 ? M.dryC : on ? M.crysLit : M.crys;
      for (let j = 0; j <= h; j++) { U.dot(E, x - (j === h && h >= 3 ? 1 : 0), y - j, mat, j === h ? 4 : 3); if (j <= 1 && h >= 3) U.dot(E, x + 1, y - j, mat, on ? 3 : 2); }
    });
  }
  // 环节缝 + 尾刺：紧跟 serpent.body 画（同一个部件，没有分界线）
  function bodyDetail() {
    const p = rig.pts, o = SH[P.sh], Ng = groundN(o);
    for (let i = 2; i < Ng; i += 3) { const x = R(p[3 * i]), y = R(p[3 * i + 1]), r = Math.floor(p[3 * i + 2]); for (let j = -r + 1; j < r; j++) U.dot(E, x, y + j, M.seam, 4); }
    const x0 = R(p[0]), y0 = R(p[1]);                                                     // 没长成的小尾刺：上翘 2 格
    U.dot(E, x0 - 1, y0, M.sting, 0); U.dot(E, x0 - 2, y0 - 1, M.sting, 0); U.dot(E, x0 - 2, y0 - 2, M.sting, 4);
  }
  function head(mat) {
    E.part(); const H = rig.head;
    U.oval(E, H.x, H.y, 2.6, 2.8, mat, 0);
    U.dot(E, H.x - 1, H.y + 1, mat, 2); U.dot(E, H.x - 1, H.y + 2, mat, 2);               // 颈后的一道环节
    const ex = R(H.x + 0.5), ey = R(H.y - 1);
    if (P.eyes) U.dot(E, ex, ey, mat, 1); else { U.dot(E, ex, ey, m.eye, 0); U.dot(E, ex - 1, ey - 1, M.glint, 3); }
  }
  // 候选部件：pincerMandibles（一对弯钳颚）—— 上下各一只 1–2 格粗的弯钩，根部粗、尖端往里勾，jaw 张开角
  function mandibles() {
    E.part(); const j = P.jaw | 0;
    for (const s of [-1, 1]) {
      const pts = mandPath(s, j), n = pts.length;
      pts.forEach(([x, y], k) => { U.dot(E, x, y, M.mand, k === n - 1 ? 4 : 0); if (k < 3 && k < n - 2) U.dot(E, x, y + s, M.mand, 0); });
    }
  }
  // 候选部件：curlRing（蜷成一圈的软虫身）—— 沿圆弧排的圆盘 + 环节缝 + 外沿晶刺，头在一端合着钳颚；frac 半圈 / 整圈
  function curlRing(full) {
    const mat = bodyMat(), cx = full ? -1 : 0, rr = full ? 4.5 : 6, cy = -(rr + 2.6) - P.lf, a0 = full ? -2.4 : -1.6, a1 = full ? 3.3 : 1.9, n = 26;
    E.part();                                                                             // 晶刺（在身体后面，从外沿伸出）
    for (let k = 0; k < 4; k++) { const a = a0 + (a1 - a0) * (0.25 + k * 0.18), x = cx + Math.cos(a) * (rr + 2.4), y = cy + Math.sin(a) * (rr + 2.4); U.dot(E, x, y, P.dry === 2 ? M.dryC : M.crys, 3); U.dot(E, x + Math.cos(a), y + Math.sin(a), P.dry === 2 ? M.dryC : M.crys, 4); }
    E.part();
    for (let k = 0; k <= n; k++) { const q = k / n, a = a0 + (a1 - a0) * q, r = 1.2 + 1.3 * Math.sqrt(q); U.disc(E, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, r, mat, 0); }
    for (let k = 3; k < n; k += 4) { const a = a0 + (a1 - a0) * k / n; U.dot(E, cx + Math.cos(a) * (rr - 1), cy + Math.sin(a) * (rr - 1), M.seam, 4); U.dot(E, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, M.seam, 4); }
    const ta = a0, tx = cx + Math.cos(ta) * rr, ty = cy + Math.sin(ta) * rr; U.dot(E, tx + 1, ty - 1, M.sting, 4);   // 尾刺
    const ha = a1, hx = cx + Math.cos(ha) * rr, hy = cy + Math.sin(ha) * rr;
    E.part(); U.oval(E, hx, hy, 2.2, 2.2, mat, 0); U.dot(E, hx, hy - 1, mat, 1);         // 头（闭眼）
    E.part(); U.dot(E, hx + 2, hy + 1, M.mand, 0); U.dot(E, hx + 2, hy + 2, M.mand, 4); U.dot(E, hx + 3, hy, M.mand, 0);   // 合拢的钳颚
  }
  function drawHero() {
    begin(hero, P.bx, -P.lf);
    if (P.curl) { curlRing(P.curl === 2); return; }
    crystalRow(crystals());
    S.body(E, rig, P, SH[P.sh]); bodyDetail();
    head(m.limb);
    mandibles();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const gCoil = new Sprite(hero.w, hero.h, hero.ox, hero.oy), gLeap = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let ghostsBuilt = 0, lastGf = -9, atkT = 9, emberAcc = 0, crysAcc = 0;
  const GH_REST = [-10, -19], GH_LAND = [3, 7], GH_LIFT = [6, 11];                       // 两个同伴剪影：蓄力时在身后的位置、落点、落点高
  function buildGhosts() {                                                                // 蓄力姿 / 腾空姿各烤一张剪影
    if (ghostsBuilt) return;
    poseAt(CHARGE, 1.0, 1.0); drawHero(); bakeHero(); copySprite(gCoil, hero);
    poseAt(CAST, 0, 0); drawHero(); bakeHero(); copySprite(gLeap, hero);
    hero.k1 = hero.k2 = -1; ghostsBuilt = 1;
  }
  const T_B = [1 / 12, 2 / 12, 3 / 12];                                                  // 三次咬合：本体、剪影 1、剪影 2
  function onEnter(s) {
    if (s === CHARGE) { buildGhosts(); poseAt(CHARGE, 0, E.simT); }
    if (s === CAST) {
      for (let i = 0; i < 10; i++) spawn(K_DUST, scrX(-6 + Math.random() * 12), HY, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.3 + Math.random() * 0.2, FXI.dust);
      burst(scrX(0), HY - 7, 16, 30, 80, 0.2, 0.45, R_EL, 10);
      shake(0.28, 2); flash(0.05);
    }
  }
  function bite(k) {
    const [bx, by] = biteAt(), x = Math.min(DUMMY_X - 3, scrX(bx)) - k, y = HY + by - 1 - k * 2;
    fx.cross(x, y, 3 + k, R_EL, 0.25, 2); burst(x, y, 10 + k * 4, 30, 80, 0.15, 0.4, R_EL, 8);
    hitDummy(k === 2 ? 1 : 0, 1); sfx('impact', { pal: 'nature', w: 0.2 + k * 0.08 });
    if (k === 2) { ring(x, y, 0, R_EL); shake(0.12, 1); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 2 / 12) {
      const [bx, by] = biteAt(), x = scrX(bx), y = HY + by;
      burst(x, y, 8, 30, 80, 0.15, 0.35, FXI.impact, 8); burst(x, y, 4, 20, 50, 0.2, 0.4, R_EL, 6); hitDummy(0, 1); atkT = 0;
      sfx('swing', { kind: 'bite', w: 0.2 }); sfx('hit', { mat: 'flesh', w: 0.2 });
    }
    if (s === CAST) for (let k = 0; k < 3; k++) if (t === T_B[k]) bite(k);
    if (s === DEATH && t === INCOMING + 0.66) {                                            // 蜷圈落地
      for (let i = 0; i < 10; i++) spawn(K_DUST, scrX(-7 + Math.random() * 14), HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.2 });
    }
    if (s === DEATH && t === INCOMING + 1.3) {                                            // 干壳碎成几截
      poseAt(DEATH, INCOMING + 1.29, INCOMING + 1.29); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('chunks', { chunk: 4, power: 0.3, fromX: -1, fromY: -6, push: 0, fadeAt: 0.75, fadeDur: 0.5, ramp: 'dust' });
      for (let i = 0; i < 8; i++) spawn(K_DUST, scrX(-5 + Math.random() * 10), HY - 3, (Math.random() - 0.5) * 20, -8 - Math.random() * 8, 0.4 + Math.random() * 0.3, FXI.dust);
    }
  }
  const EVENTS = [[], [], [2 / 12], [], T_B, [], [], [INCOMING + 0.66, INCOMING + 1.3], []];
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.gf !== lastGf) {                                              // 爬行：每 2 帧 1 颗尘，接触帧（拉直 / 拱最高）发声
      spawn(K_DUST, scrX(P.gf === 0 ? -2 : -9) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 10, -2 - Math.random() * 3, 0.2 + Math.random() * 0.15, FXI.dust);
      if (P.gf === 2 || P.gf === 0) sfx('step', { w: 0.2 });
      lastGf = P.gf;
    }
    if (state === CHARGE && stT > 0.2 && P.lit) {                                          // 亮起的晶刺往上冒翠绿星点
      crysAcc += dt * (4 + P.lit * 1.5); const cs = crystals();
      while (crysAcc >= 1) { crysAcc -= 1; const c = cs[(Math.random() * P.lit) | 0]; spawn(K_EMBER, scrX(c[0] + P.bx), HY + c[1] - c[2] - 1, (Math.random() - 0.5) * 6, -10 - Math.random() * 10, 0.35 + Math.random() * 0.25, R_EL); }
    }
    if (state === RECOVER && P.lit) { emberAcc += dt * 3; while (emberAcc >= 1) { emberAcc -= 1; const c = crystals()[(Math.random() * 6) | 0]; spawn(K_EMBER, scrX(c[0] + P.bx), HY + c[1] - 3, 0, -8, 0.4, R_EL); } }
    atkT += dt;
  }
  function fxReset() { lastGf = -9; atkT = 9; emberAcc = 0; crysAcc = 0; }
  function fxBack(f12) { if (P.rim >= 2 && !P.curl) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 蓄力：两个同伴剪影从身后涌过来（抖动半透明），停在身后跟着发抖
  function fxMid(f12) {
    drawLeapGhosts(1);
    if (E.state !== CHARGE || E.stT < 0.2 || !ghostsBuilt) return;
    const t = E.stT;
    for (let k = 1; k >= 0; k--) {
      const q = ease.out(clamp01((t - 0.2 - k * 0.12) / 0.5)); if (q <= 0) continue;
      const off = R(-38 + (GH_REST[k] + 38) * q) + (t > 1.1 && ((f12 + k) & 1) ? 1 : 0);
      blitShape(gCoil, scrX(off), HY, P.flip, EL[k ? 4 : 3], 0.3 + k * 0.12 + (1 - q) * 0.4);
    }
  }
  function fxFront(f12) {
    if (atkT < 2 / 12) {                                                                  // 扑出的拖影：头后 3 道横线
      const [bx, by] = biteAt(), x = scrX(bx) - 7, y = HY + by, c = atkT < 1 / 12 ? EL[1] : EL[2];
      for (let k = 0; k < 6; k++) { if (atkT >= 1 / 12 && (k & 1)) continue; put(x - k, y - 2, c); put(x - k - 2, y, c); put(x - k, y + 2, c); }
    }
    drawLeapGhosts(0);
  }
  // 施放：两个剪影错开 0.08 s 依次弹射扑出（飞行中画在角色前面），落在目标身上叠着咬（落地后画在角色后面，本体保持看得清）
  function drawLeapGhosts(landed) {
    const st = E.state, t = E.stT;
    if (!(st === CAST || (st === RECOVER && t < 0.25)) || !ghostsBuilt) return;
    const tt = st === CAST ? t : DUR[CAST] + t;
    for (let k = 0; k < 2; k++) {
      const t0 = (k + 1) * 0.08, q = clamp01((tt - t0) / 0.085); if (tt < t0 || (q >= 1) !== !!landed) continue;
      const x0 = GH_REST[k] - 1, x1 = GH_LAND[k], off = R(x0 + (x1 - x0) * q), lift = R(Math.sin(q * Math.PI) * 6 + GH_LIFT[k] * q);
      const fade = clamp01((tt - 0.4) / 0.3);
      blitShape(gLeap, scrX(off), HY - lift, P.flip, EL[q < 1 ? 2 : k ? 4 : 3], (q < 1 ? 0.45 : 0.3) + fade * 0.7);
    }
  }

  return {
    name: '翠蠕虫兵', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.crysLit, M.glint], HIT_POINT, EVENTS,
    deathKit: { mode: 'chunks', at: INCOMING + 1.3 },
    SFX: { body: 'flesh', how: 'shatter', pal: 'nature', style: 'summon', w: 0.2 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
