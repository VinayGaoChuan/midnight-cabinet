// 蟹术士（部队 · 虚空 · 召唤师 · 优质）：矮扁寄居蟹，背一只刻紫光符文的螺旋壳（螺尖向后上翘），两根眼柄之间顶一顶歪斜小尖帽，
// 右螯夹一根珊瑚杖、杖顶一颗气泡珠。攻击：举杖射出一串水泡弹。技能「召唤小螃蟹」：身前浮现水纹法阵、水泡汇入法阵，
// 施放时法阵中心冒出水柱，一只橙色小螃蟹（呼应 Crabling）从大泡泡里蹦出来落地，举钳两下，收招时横走到假人身前待命。
// 升级 → 蟹巫（Crabomancer）：保留螺壳、尖帽、右螯。身体用 parts-beast 的 bug（蟹：宽壳、腿在壳下）。
PCD.define('CrabWarlock', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, shotFloorGlow } = E;
  const B = E.parts.beast, G = B.bug, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.water, EL = FXR[R_EL];                                                     // 潮汐召唤 · 海水青：白 → 青 → 蓝 → 深蓝 → 墨蓝
  const m = B.mats(E, { main: 'pink', claw: [11, 12, 12, 13], eye: [0, 0, 0, 0] });   // 珊瑚粉橙蟹壳
  const M = {
    conch: E.defMat('sand', 2), rune: E.defMat('purple', 1, 1),                               // 螺壳（沙色）+ 紫光符文
    hat: E.defMat('purple', 1), band: E.defMat('gold', 1),                                    // 尖帽 + 帽带
    staff: E.defMat('crimson', 1), orb: E.defMat([39, 40, 22, 21], 1, 1),                     // 珊瑚杖 + 气泡珠（发光体）
  };
  // 小螃蟹（召唤物，呼应 Crabling）：橙色小蟹，预先烘焙几帧，特效层里贴出来
  const mC = B.mats(E, { main: 'fire', limb: [44, 45, 46, 46], claw: [0, 44, 44, 45], eye: [0, 0, 0, 0] }); mC.body = E.defMat('fire', 1);   // 小身体用 band 1，不然整块发暗
  const oC = G.shape({ n: 3, rx: 3.5, ry: 2, under: 2, abd: null, head: null, span: 6, knee: 0, farDx: 1, stride: 1, lift: 1, lw: 1, claws: { len: 4, size: 2 }, eyes: 0, stalks: 2, fangs: 0, hair: 0, legsFront: 0, m: mC });
  const o = G.shape({ n: 4, rx: 5, ry: 3, under: 2, abd: null, head: null, span: 8, knee: -1, farDx: 2, stride: 2, lift: 2, lw: 1, fan: 0.5, claws: { len: 5, size: 2.5 }, eyes: 0, stalks: 0, fangs: 0, hair: 0, legsFront: 0, m });

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(80, 50, 40, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of [m.eye, m.ink, m.spec, M.rune, M.orb, M.staff, M.band]) RIM.skip[k] = 1;
  // 本角色的姿势字段：sa 杖角（× 0.2 弧度，+ 前倾）· gem 气泡珠 0 待机 / 1 蓄力 / 2 变大 / 3 施放 / 4 熄灭 · blink 眨眼（位 0 远眼、位 1 近眼）
  //   hb 帽尖摆 · ret 缩壳 0 / 1 半缩 / 2 只剩空壳 · rl 符文亮度 0–3
  const EXTRA = [['sa', -4, 6], ['gem', 0, 4], ['blink', 0, 3], ['hb', -1, 2], ['ret', 0, 2], ['rl', 0, 3]];
  const SPEC = G.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { G.reset(P); P.sa = 0; P.gem = 0; P.blink = 0; P.hb = 0; P.ret = 0; P.rl = 1; P.mx = 0; P.flip = 0; P.gx = 0; P.gy = 0; }
  reset();
  let rig = G.rig(P, o);
  const HIT_POINT = [R(rig.T.x) + 1, R(rig.T.y)];

  // ───── 姿势 ─────
  const F = ['bx', 'crouch', 'pitch', 'claw', 'sa'];
  const REST = { bx: 0, crouch: 0, pitch: 0, claw: 1, sa: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -1, pitch: 1, claw: 3, sa: -3 });
  const A_FLICK = pose({ bx: 1, crouch: 1, claw: 2, sa: 4 });
  const A_HOLD = pose({ bx: 1, claw: 2, sa: 3 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_FLICK, 'snap'], [0.25, A_FLICK, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const S_CHG = pose({ pitch: 2, claw: 3, sa: 0 });
  const S_CAST = pose({ bx: 1, pitch: 1, claw: 2, sa: 5 });
  const T_HIT = 2 / 12, T_POP = 0.1, T_LAND = 0.3, IDLE_SWAY = [0, 1, 0, -1];
  const tmp = {};
  const apply = (src) => { for (const f of F) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const TT = f12 / 12, b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.claw = 1;
    P.hb = IDLE_SWAY[Math.floor(TT * 1.25 + 1e-6) & 3]; P.gem = (b % 5) === 3 ? 1 : 0; P.rl = (b % 3) === 1 ? 2 : 1;
    const lp = tq % DUR[IDLE];
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                         // 待机个性：横挪两步再挪回来，两根眼柄轮流眨
      const k = Math.min(4, f12of(lp - 1.6)), SH = [[1, 0, 0], [2, 1, 1], [2, 2, 2], [1, 3, 1], [0, -1, 0]];
      P.bx = SH[k][0]; P.gf = SH[k][1]; P.blink = SH[k][2]; P.bob = 0;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { G.anim.walk(P, tq); P.hb = P.gf & 1 ? -1 : 1; const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip; }
    else if (st === ATTACK) {
      keys(tq, ATK, tmp, F); apply(tmp);
      P.gem = tq < 0.12 ? 1 : tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq >= 0.12 && tq < 0.25 ? 2 : 1; P.hb = tq >= 0.12 && tq < 0.45 ? -1 : 0;
    } else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, S_CHG, ease.inOut(tq / 0.7), F); apply(tmp); } else apply(S_CHG);
      P.gem = tq < 0.45 ? 1 : tq < 0.9 ? ((f12 & 1) ? 2 : 1) : 2; P.rim = 2; P.rl = tq < 0.45 ? 2 : 2 + (f12 & 1);
      P.hb = tq < 0.5 ? -1 : (tq > 1.1 && (f12 & 1) ? 0 : -1);
    } else if (st === CAST) {
      E.mix(tmp, S_CHG, S_CAST, ease.out(clamp01(tq / 0.12)), F); apply(tmp); P.gem = 3; P.rim = 3; P.rl = 3; P.hb = -1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_CAST, REST, q, F); apply(tmp);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.rl = q < 0.5 ? 2 : 1; P.hb = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { G.anim.hurt(P, h); if (h < 0.2) { P.blink = 3; P.hb = 2; P.sa = -2; P.rim = 0; } else if (h < 0.35) { P.hb = 1; P.sa = -1; P.blink = 3; } }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        G.anim.death(P, d, f12, { at: 0.5, dur: 0.3, dx: 20, hop: 7 }); P.blink = 3; P.rim = 0;       // 翻倒时尖帽往前飞出去
        P.sa = d < 0.3 ? -2 : 6; P.hb = 2;
        P.gem = d < 0.3 ? ((f12 & 1) ? 1 : 0) : d < 0.66 ? 0 : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        P.rl = d < 0.95 ? 1 : d < 1.4 ? ((f12 & 1) ? 1 : 0) : 0;
        P.ret = d < 0.95 ? 0 : d < 1.1 ? 1 : 2;                                                 // 缩进螺壳，留下一只空壳
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = G.rig(P, o);
    const g = orbAt(); P.gx = g[0] + P.bx; P.gy = g[1];
    B.key(P, SPEC);
  }

  // ───── 几何 ─────
  const staffLying = () => P.lie === 2;
  function grip() { const H = rig.claw.H; return [H[0] + 2, H[1]]; }
  function staffDir() { const a = P.sa * 0.2; return [Math.sin(a), -Math.cos(a)]; }
  function orbAt() {
    if (staffLying()) return [22, -2];
    const g = grip(), d = staffDir(); return [R(g[0] + d[0] * 11), R(g[1] + d[1] * 11)];
  }

  // ───── 画 ─────
  // 候选部件：conch（寄居蟹螺壳）——一个部件：螺尖（逐级变细的圆 + 缝合线）→ 体螺层（椭圆 + 螺旋沟）→ 符文 → 壳口（空壳时露出暗口）
  //   (cx, cy) 体螺层中心、rx ry 半径、(dx, dy) 螺尖方向（单位向量）、runes 符文点数、lv 符文亮度 0–3、open 1 = 画壳口
  function conch(cx, cy, rx, ry, dx, dy, lv, open) {
    E.part();
    const SP = [[0.8, 3], [3.0, 2.2], [5.2, 1.4], [7.2, 0.8]];
    for (const [k, r] of SP) { const px = cx + dx * (rx * 0.7 + k), py = cy + dy * (ry * 0.7 + k); U.disc(E, px, py, r, M.conch, 0); }
    for (let i = 1; i < 3; i++) { const [k, r] = SP[i], px = cx + dx * (rx * 0.7 + k - 1.1), py = cy + dy * (ry * 0.7 + k - 1.1); U.dot(E, px - dy * r, py + dx * r, M.conch, 2); U.dot(E, px + dy * r * 0.6, py - dx * r * 0.6, M.conch, 2); }   // 螺层缝合线
    U.oval(E, cx, cy, rx, ry, M.conch, 0);
    const ph = Math.atan2(dy, dx) + 0.6;
    for (let th = 0.5; th < 9.2; th += 0.32) { const r = 0.95 * th / 9.2; U.dot(E, cx + Math.cos(th + ph) * rx * r, cy + Math.sin(th + ph) * ry * r, M.conch, 2); }   // 螺旋沟
    const RT = [[2.2, 0.35], [4.3, 0.55], [6.3, 0.72], [8.1, 0.86]];
    for (let i = 0; i < RT.length; i++) { const [th, r] = RT[i], x = cx + Math.cos(th + ph + 0.35) * rx * r, y = cy + Math.sin(th + ph + 0.35) * ry * r; const tn = lv === 0 ? 2 : lv === 1 ? 3 : lv === 2 ? ((i & 1) ? 3 : 4) : 4; U.dot(E, x, y, M.rune, tn); U.dot(E, x + 1, y, M.rune, lv === 0 ? 2 : 3); }
    if (open) { const ax = cx + rx * 0.45, ay = cy + ry * 0.35; U.oval(E, ax, ay, 1.6, 2.1, M.conch, 1); U.dot(E, ax - 1, ay - 2, M.conch, 4); }
  }
  // 候选部件：pointedCap（歪斜小尖帽）：帽檐 → 金帽带 → 向后歪的帽身 → 折角帽尖；(x, y) 帽檐中心，hb 帽尖摆；lying = 倒在地上（帽尖朝右平放）
  function pointedCap(x, y, hb, lying) {
    E.part();
    if (lying) {
      U.seg(E, x, y, x, y - 5, 1, M.hat, 0); U.seg(E, x + 1, y, x + 1, y - 4, 1, M.band, 0);
      for (let k = 0; k < 6; k++) { const h = Math.max(0, R(2 - k * 0.45)); for (let j = -h; j <= h; j++) U.dot(E, x + 2 + k, y - 2 + j, M.hat, 0); }
      U.dot(E, x + 8, y - 1, M.hat, 0); U.dot(E, x + 9, y, M.hat, 0);
      return;
    }
    const ROWS = [[0, -3, 2], [-2, -2, 1], [-3, -2, 1], [-4, -2, 0], [-5, -3, -1], [-6, -3, -2]];
    for (const [dy, a, b] of ROWS) for (let xx = a; xx <= b; xx++) U.dot(E, x + xx, y + dy, M.hat, 0);
    for (let xx = -2; xx <= 2; xx++) U.dot(E, x + xx, y - 1, M.band, 0);
    U.dot(E, x + 1, y - 1, M.band, 4);
    U.dot(E, x - 4 + (hb > 0 ? 1 : 0), y - 7, M.hat, 0); U.dot(E, x - 5 + hb, y - 8 + (hb < 0 ? 1 : 0), M.hat, 0);   // 折角帽尖，随 hb 摆
    U.dot(E, x - 1, y - 3, M.hat, 4); U.dot(E, x - 2, y - 5, M.hat, 4);
  }
  // 眼柄：1 格柄 + 2×2 墨眼 + 1 格高光；闭眼时只剩一横
  function stalk(x0, y0, x1, y1, far, closed) {
    E.part(); const mat = far ? m.far : m.limb;
    U.seg(E, x0, y0, x1, y1, 1, mat, 0);
    const ex = far ? x1 - 1 : x1, ey = y1 - 1;
    if (closed) { U.dot(E, ex, ey + 1, mat, 1); U.dot(E, ex + 1, ey + 1, mat, 1); U.dot(E, ex, ey, mat, 0); U.dot(E, ex + 1, ey, mat, 0); }
    else { U.dot(E, ex, ey, m.eye, 3); U.dot(E, ex + 1, ey, m.eye, 3); U.dot(E, ex, ey + 1, m.eye, 3); U.dot(E, ex + 1, ey + 1, m.eye, 3); U.dot(E, ex, ey, m.spec, 3); }
  }
  // 珊瑚杖：1 格主干 + 杖顶两根短珊瑚枝（同一个部件）
  function coralStaff() {
    E.part();
    if (staffLying()) {
      U.seg(E, 8, -1, 20, -1, 1, M.staff, 0); U.dot(E, 17, -2, M.staff, 0); U.dot(E, 16, -3, M.staff, 4); U.dot(E, 19, -2, M.staff, 0);
      return;
    }
    const g = grip(), d = staffDir(), bx0 = g[0] - d[0] * 5, by0 = g[1] - d[1] * 5, tx = g[0] + d[0] * 9, ty = g[1] + d[1] * 9;
    E.line(bx0, by0, tx, ty, M.staff, 0);
    const b1x = g[0] + d[0] * 6, b1y = g[1] + d[1] * 6, b2x = g[0] + d[0] * 8, b2y = g[1] + d[1] * 8;
    U.dot(E, b1x + d[1] * 1, b1y - d[0] * 1, M.staff, 0); U.dot(E, b1x + d[1] * 2 + d[0], b1y - d[0] * 2 + d[1], M.staff, 4);   // 左枝
    U.dot(E, b2x - d[1] * 1, b2y + d[0] * 1, M.staff, 0); U.dot(E, b2x - d[1] * 2 + d[0], b2y + d[0] * 2 + d[1], M.staff, 4);   // 右枝
    U.dot(E, bx0, by0, M.staff, 1);
  }
  // 气泡珠：0 小泡 · 1 亮 · 2 变大 · 3 爆亮 · 4 熄灭（单独一个部件：伸出杖顶之外）
  function orb() {
    E.part(); const x = P.gx - P.bx, y = P.gy, g = P.gem;
    if (g >= 2 && g <= 3) {
      for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) { const d2 = i * i + j * j; if (d2 > 5) continue; U.dot(E, x + i, y + j, M.orb, d2 >= 4 ? (g === 3 ? 4 : 3) : g === 3 ? 4 : 2); }
      U.dot(E, x - 1, y - 1, M.orb, 4); U.dot(E, x, y - 1, M.orb, g === 3 ? 4 : 3);
      return;
    }
    const rimT = g === 4 ? 1 : g === 1 ? 4 : 3, inT = g === 4 ? 2 : g === 1 ? 3 : 2;
    U.dot(E, x - 1, y, M.orb, rimT); U.dot(E, x + 1, y, M.orb, g === 4 ? 1 : 3); U.dot(E, x, y - 1, M.orb, rimT); U.dot(E, x, y + 1, M.orb, g === 4 ? 1 : 2); U.dot(E, x, y, M.orb, inT);
    if (g !== 4) U.dot(E, x - 1, y - 1, M.orb, g === 1 ? 4 : 3);
  }
  // 蟹脸：口器两格 + 壳前沿一道亮边（紧跟 G.body，同一个部件）
  function face() {
    const T = rig.T, x = R(T.x + T.rx - 1), y = R(T.y + 1);
    U.dot(E, x, y, m.body, 1); U.dot(E, x, y + 1, m.body, 1); U.dot(E, x - 1, y + 1, m.body, 2);
    for (let k = -2; k <= 2; k++) U.dot(E, R(T.x + k), R(T.y - T.ry + 1), m.body, 4);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const T = rig.T, top = R(T.y - T.ry), tx = R(T.x), lie = rig.lie;
    if (P.ret === 2) { conch(-6, -5, 5.5, 4.5, -1, -0.15, P.rl, 1); drawDrops(); return; }
    if (P.ret === 1) { conch(-6, -5, 5.5, 4.5, -1, -0.15, P.rl, 0); E.part(); U.oval(E, -2, -3, 2.5, 2, m.body, 0); U.dot(E, 0, -4, m.eye, 3); drawDrops(); return; }
    if (!lie) { G.claw(E, rig, P, o, 1); G.legs(E, rig, P, o, 1); }
    if (lie === 2) conch(-6, -5 - P.lift, 5.5, 4.5, -1, -0.15, P.rl, 0);
    else conch(tx - 5, R(T.y) - 5, 6, 5.5, -0.57, -0.82, P.rl, 0);
    if (lie) { G.claw(E, rig, P, o, 1); G.legs(E, rig, P, o, 1); }
    G.legs(E, rig, P, o, 0);
    G.body(E, rig, P, o); face();
    if (!lie) {
      stalk(tx + 1, top, tx - 1, top - 4, 1, P.blink & 1);
      if (!P.drop) pointedCap(tx + 3, top - 1, P.hb, 0);
      stalk(tx + 5, top, tx + 7, top - 4, 0, P.blink & 2);
    } else if (lie === 1 && !P.drop) pointedCap(tx + 3, top - 1, 2, 0);
    if (!staffLying()) { coralStaff(); G.claw(E, rig, P, o, 0); orb(); }
    else { G.claw(E, rig, P, o, 0); drawDrops(); }
  }
  function drawDrops() {                                                                       // 倒地后：珊瑚杖和气泡珠躺在身前，尖帽飞出后落在杖头前面
    coralStaff(); orb();
    if (P.drop) pointedCap(6 + P.dsx - (P.drop === 2 ? 0 : 3), P.drop === 2 ? 0 : -12 - P.dsy + 7, 0, P.drop === 2);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 小螃蟹（召唤物）：预烘焙帧 ─────
  const CRAB_BAKE = { rim: 0, rx: 0, ry: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 };
  function bakeCrab(gf, claw) { const s = new Sprite(24, 16, 12, 14), Pc = {}; G.reset(Pc); Pc.gf = gf; Pc.claw = claw; const rg = G.rig(Pc, oC); begin(s, 0, 0); G.draw(E, rg, Pc, oC); bake(s, CRAB_BAKE); return s; }
  const CRAB = { stand: bakeCrab(-1, 0), up: bakeCrab(-1, 3), walk: [0, 1, 2, 3].map((g) => bakeCrab(g, 1)) };
  function blitOut(s, X, Y) { const ob = s.out; for (let y = 0; y < s.h; y++) { const yy = Y - s.oy + y; if (yy > FLOOR) continue; for (let x = 0; x < s.w; x++) { const c = ob[y * s.w + x]; if (c !== 255) put(X - s.ox + x, yy, c); } } }

  // ───── 特效 ─────
  const CX = 64, LAND_X = 70, WAIT_X = 86, GEY_H = 22;
  let chargeAcc = 0, emberAcc = 0, soulAcc = 0, dropAcc = 0, lastGf = -9, mzT = 9, mzX = 0, mzY = 0;
  const orbScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CHARGE) fx.circle(CX, FLOOR, 10, 2.5, R_EL, DUR[CHARGE] + DUR[CAST] + 0.35, 0.35, 0);
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = orbScr();
      releaseOrbit(40, 90, 0.3, 0.6, { pts: 1, at: [CX, FLOOR - 3], up: 40 });
      burst(gx, gy, 14, 40, 90, 0.2, 0.45, R_EL, 8); ring(CX, FLOOR - 4, 1, R_EL); shake(0.28, 2); flash(0.05);
    }
  }
  function fireBubble(k) {
    const [gx, gy] = orbScr(); mzT = 0; mzX = gx; mzY = gy;
    shoot(1, gx + 2, gy, 125 + k * 12, DUMMY_X - 3, R_EL, 6 - k * 5, { trail: { every: 4, life: [0.1, 0.22], back: [4, 12] } });
    sfx('shoot', { proj: 'water' });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) { fireBubble(0); burst(mzX, mzY, 6, 25, 55, 0.15, 0.3, R_EL, 4); sfx('swing', { kind: 'staff', w: 0.3 }); }
    if (s === ATTACK && (t === T_HIT + 1 / 12 || t === T_HIT + 2 / 12)) fireBubble(R((t - T_HIT) * 12));
    if (s === CAST && t === T_POP) { const y = FLOOR - GEY_H - 4; burst(CX, y, 14, 30, 80, 0.2, 0.45, R_EL, 10); ring(CX, y, 0, R_EL); }
    if (s === CAST && t === T_LAND) {
      ring(LAND_X, FLOOR - 2, 1, R_EL); burst(LAND_X, FLOOR - 2, 22, 40, 110, 0.3, 0.6, R_EL, 26); shake(0.12, 1);
      for (let i = 0; i < 6; i++) spawn(K_DUST, LAND_X - 5 + Math.random() * 10, FLOOR - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 8, 0.35 + Math.random() * 0.25, FXI.dust);
      sfx('impact', { pal: 'water', w: 0.45 });
    }
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 16 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.3 });
    }
    if (s === DEATH && t === INCOMING + 1.0) burst(HX - 2, HY - 4, 10, 20, 45, 0.3, 0.6, R_EL, 10);   // 缩壳时冒出一串气泡
  }
  const EVENTS = [[], [], [T_HIT, T_HIT + 1 / 12, T_HIT + 2 / 12], [], [T_POP, T_LAND], [], [], [INCOMING + 0.66, INCOMING + 1.0], []];
  function impactOn(k, x, y) { if (k === 1) { burst(x, y, 7, 25, 70, 0.15, 0.35, R_EL, 10); hitDummy(0, 1); sfx('hit', { mat: 'magic', w: 0.25 }); } }
  function stepFX(dt, state, stT) {
    const [gx, gy] = orbScr();
    if (state === CHARGE) {                                                                   // 水泡从法阵边缘定点汇入中心；少量汇入杖顶气泡珠
      chargeAcc += dt * (16 + 20 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1;
        if (Math.random() < 0.72) { const a = Math.random() * 6.2832; spawnX(K_SPIRAL_PT, CX, FLOOR - 1, 7 / (0.45 + Math.random() * 0.3), 0, 9, R_EL, { a, r: 10.5, w: 1.6, squash: 0.25 }); }
        else { const r = 8 + Math.random() * 5, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 2); }
      }
    }
    if (state === CAST && stT < 0.36) {                                                        // 水柱顶的水花往下落
      dropAcc += dt * 40; while (dropAcc >= 1) { dropAcc -= 1; spawnX(K_PHYS, CX + (Math.random() - 0.5) * 4, FLOOR - geyH(stT) - 1, (Math.random() - 0.5) * 50, -20 - Math.random() * 30, 0.5, R_EL, { g: 240, floor: FLOOR - 1 }); }
    }
    if (state === MOVE && P.gf !== lastGf) { if (P.gf === 0 || P.gf === 2) { spawn(K_DUST, scrX(P.gf === 0 ? 8 : -8) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 4, 0.25 + Math.random() * 0.15, FXI.dust); sfx('step', { w: 0.25 }); } lastGf = P.gf; }
    if ((state === IDLE || state === RECOVER) && !P.lie) { emberAcc += dt * (state === IDLE ? 1.4 : 5); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 2, Math.random() * 6 - 3, -8 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 26, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt;
  }
  function fxReset() { chargeAcc = 0; emberAcc = 0; soulAcc = 0; dropAcc = 0; lastGf = -9; mzT = 9; }
  // 水柱：施放第 1 帧冒出 10 格、第 2 帧 22 格，保持到 0.3 s，之后从顶往下塌
  function geyH(tc) { return tc < 1 / 12 ? 10 : tc < 0.3 ? GEY_H : Math.max(0, R(GEY_H * (1 - (tc - 0.3) / 0.25))); }
  function drawGeyser(tc, f12) {
    const h = geyH(tc); if (h <= 0) return;
    for (let j = 0; j < h; j++) {
      const y = FLOOR - 1 - j, w = j > h - 3 ? 3 : 2, top = j >= h - 2;
      for (let dx = -w; dx <= w; dx++) { const e = Math.abs(dx); if (tc > 0.3 && e === w && ((j + f12) & 1)) continue; const flow = ((j + f12 * 2 + dx) % 5) === 0; put(CX + dx, y, top ? EL[0] : e === 0 ? (flow ? EL[0] : EL[1]) : e === w ? EL[3] : flow ? EL[1] : EL[2]); }
    }
    const ty = FLOOR - h - 1; put(CX - 4, ty + 1, EL[1]); put(CX + 4, ty + 1, EL[1]); put(CX - 3, ty, EL[0]); put(CX + 3, ty, EL[0]);   // 顶上的水冠
  }
  function bubble(x, y, r, f12) {
    const n = Math.ceil(r * 6.5);
    for (let k = 0; k < n; k++) { const a = k / n * 6.2832, c = a > 3.4 && a < 4.9 ? EL[0] : a < 1.6 ? EL[2] : EL[1]; put(R(x + Math.cos(a) * r), R(y + Math.sin(a) * r), c); }
    put(x - R(r * 0.45), y - R(r * 0.45), EL[0]); if (f12 & 1) put(x - R(r * 0.45) + 1, y - R(r * 0.45), EL[0]);
  }
  // 小螃蟹的时间线（按引擎的状态时间，确定性）：施放 0–0.1 在泡泡里、0.1 泡破蹦出、0.3 落地、举钳两下；收招里横走到假人身前待命
  function crabling(f12) {
    const st = E.state, tc = E.stT;
    if (st === CAST) {
      if (tc < T_POP) { const y = FLOOR - GEY_H - 5; blitOut(CRAB.stand, CX, y + 4); bubble(CX, y, 6, f12); return; }
      if (tc < T_LAND) { const q = (tc - T_POP) / (T_LAND - T_POP), x = R(CX + (LAND_X - CX) * q), y = R(FLOOR - GEY_H - 1 - Math.sin(q * Math.PI) * 8 + (GEY_H + 1) * q * q); blitOut(q < 0.5 ? CRAB.up : CRAB.stand, x, y); return; }
      blitOut(((f12of(tc - T_LAND) >> 1) & 1) ? CRAB.stand : CRAB.up, LAND_X, FLOOR - 1); return;
    }
    if (st === RECOVER) {
      if (tc < 0.5) { const q = tc / 0.5, x = R(LAND_X + (WAIT_X - LAND_X) * q); blitOut(CRAB.walk[(f12of(tc) >> 1) & 3], x, FLOOR - 1); return; }
      blitOut(CRAB.up, WAIT_X, FLOOR - 1);
    }
  }
  function fxBack(f12) { if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const [gx, gy] = orbScr();
    if (P.gem >= 2 && P.gem <= 3 && !P.lie && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[2]; for (let a = 0; a < 8; a++) { if (mzT >= 1 / 12 && (a & 1)) continue; put(R(mzX + 2 + Math.cos(a * 0.785) * 3), R(mzY + Math.sin(a * 0.785) * 3), c); } }
    if (E.state === CAST) drawGeyser(E.stT, f12);
    crabling(f12);
  }
  // 水泡弹：空心小泡（十字 4 格 + 左上高光），不画实心核
  function drawShot(k, x, y, d, f12, Rr) {
    if (k !== 1) return false;
    put(x - 1, y, Rr[1]); put(x + 1, y, Rr[2]); put(x, y - 1, Rr[1]); put(x, y + 1, Rr[2]); put(x - 1, y - 1, Rr[0]); if (f12 & 1) put(x, y, Rr[3]);
    return true;
  }

  return {
    name: '蟹术士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.orb, M.rune], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'collapse', pal: 'water', style: 'summon', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
