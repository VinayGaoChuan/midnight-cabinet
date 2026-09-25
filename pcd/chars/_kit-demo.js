// 引擎演示：死亡套件（?mode=parts|chunks|burst|melt|ash）+ 特效积木。不是正式角色。
// 原：星辉巫师（范式角色）：瘦高老法师、折角尖帽、长白胡、喇叭袖长袍、杖顶宝石；远程甩杖奥术弹；技能「星辉爆」。
PCD.define('_kit-demo', (E) => {
  const MODE = new URLSearchParams(location.search).get('mode') || 'chunks';
  const { defMat, Sprite, begin, part, sp, run, rect, line, brush, bake, ease, clamp01, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST,
    spawn, burst, releaseOrbit, shoot, ring, shake, flash, hitDummy, put, scrX, floorGlow, shotFloorGlow } = E;

  // ───── 材质、缓冲、姿势 ─────
  const M_ROBE = defMat([11, 12, 13, 26], 2), M_HAT = defMat([11, 12, 13, 26], 1), M_TRIM = defMat([20, 19, 14, 5], 1), M_SKIN = defMat([11, 16, 15, 15], 1);
  const M_BEARD = defMat([7, 18, 17, 21], 1), M_WOOD = defMat([0, 20, 19, 16], 1), M_GEM = defMat([25, 24, 23, 22], 1, 1), M_BOOT = defMat([0, 20, 20, 19], 1);
  const M_INK = defMat([0, 0, 0, 0], 1, 1), M_GLOW = defMat([22, 22, 21, 21], 1, 1);
  const R_EL = FXI.magic, EL = FXR[R_EL], HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(68, 54, 34, 49);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 15, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(64) };
  RIM.skip[M_GEM] = RIM.skip[M_GLOW] = RIM.skip[M_WOOD] = 1;
  const P = { hx: 0, hy: 0, a: 0, lean: 0, head: 0, back: 0, bend: 0, bob: 0, beard: 0, sway: 0, gem: 0, glint: 0, rim: 0, gx: 0, gy: 0, bx: 0, crouch: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, step: 0, walk: 0, wup: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K_IDLE = { hx: 6, hy: -12, a: 0.12, lean: 0, head: 0, back: 0, bend: 1 };
  const K_WIND = { hx: 4, hy: -17, a: -0.45, lean: -1, head: 0, back: 1, bend: 1 };
  const K_FLICK = { hx: 10, hy: -14, a: 0.85, lean: 1, head: 1, back: 2, bend: 2 };
  const K_HOLD = { hx: 9, hy: -13, a: 0.62, lean: 1, head: 0, back: 1, bend: 3 };
  const K_CHARGE = { hx: 5, hy: -19, a: -0.14, lean: -1, head: -1, back: 1, bend: 2 };
  const K_CAST = { hx: 10, hy: -15, a: 1.05, lean: 1, head: 1, back: 3, bend: 3 };
  const K_HURT = { hx: 4, hy: -11, a: -0.32, lean: -1, head: -1, back: 1, bend: 3 };
  const K_KNEEL = { hx: 5, hy: -7, a: 0.85, lean: 1, head: 1, back: 0, bend: 3 };
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'back', 'bend'];
  const mixPose = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const WALK_STEP = [1, 0, -1, 0], WALK_UP = [0, 2, 0, 1], WALK_BOB = [1, 0, 1, 0], WALK_SWAY = [-1, 0, 1, 0], WALK_BEARD = [0, -1, 0, 1], WALK_DIST = 14;
  const T_FLICK = 2 / 12;

  function poseAt(st, t, T) {
    const tq = Math.floor(t * 12) / 12, f12 = Math.floor(T * 12), TT = f12 / 12;
    P.glint = 0; P.bx = 0; P.crouch = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.step = 0; P.walk = 0; P.wup = 0; P.flip = 0; P.mx = 0; P.bob = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.rim = 1;
    const idle = () => {
      mixPose(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { P.head = -1; P.beard = 1; P.glint = lp >= 1.75 && lp < 1.92 ? 1 : 0; }   // 待机个性：抬头看宝石
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {
      mixPose(K_IDLE, K_IDLE, 0); const f = Math.floor(tq * 6) & 3;
      P.walk = 1; P.step = WALK_STEP[f]; P.wup = WALK_UP[f]; P.bob = WALK_BOB[f]; P.sway = WALK_SWAY[f]; P.beard = WALK_BEARD[f];
      P.a = K_IDLE.a + P.step * 0.09; P.hx = K_IDLE.hx + P.step * 0.6;
      const half = DUR[MOVE] / 2; if (tq < half) P.mx = Math.round(WALK_DIST * tq / half); else { P.flip = 1; P.mx = Math.round(WALK_DIST * (1 - (tq - half) / half)); }
    } else if (st === ATTACK) {
      if (tq < 0.12) { mixPose(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; }
      else if (tq < 0.2) { mixPose(K_FLICK, K_FLICK, 0); P.gem = 2; P.rim = 2; P.beard = -1; P.sway = -1; }
      else if (tq < 0.45) { mixPose(K_FLICK, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.gem = 1; P.beard = -1; }
      else mixPose(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {
      const q = ease.inOut(clamp01(tq / 0.7)); mixPose(K_IDLE, K_CHARGE, q);
      P.beard = -Math.round(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) { mixPose(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3; }
    else if (st === RECOVER) { const q = ease.inOut(clamp01(tq / 0.6)); mixPose(K_CAST, K_IDLE, q); P.beard = -Math.round(1 - q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; }
    else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { mixPose(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else mixPose(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d >= 0.3 && MODE !== 'fall') { mixPose(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.dq = 1; }
      else if (d < 0.5) { mixPose(K_KNEEL, K_KNEEL, 0); P.bx = -2; P.crouch = 4; P.eyes = 1; P.beard = 1; }
      else {
        mixPose(K_KNEEL, K_KNEEL, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        const hq = clamp01((d - 0.66) / 0.25); P.hatX = Math.round(-6 * hq); P.hatY = Math.round(Math.sin(hq * Math.PI) * 4);
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    P.hx = Math.round(P.hx); P.hy = Math.round(P.hy) + P.bob; P.a = Math.round(P.a / ASTEP) * ASTEP;
    P.lean = Math.round(P.lean); P.head = Math.round(P.head); P.back = Math.round(P.back); P.bend = Math.round(P.bend);
    if (P.lying) { P.gx = 22 + P.bx; P.gy = -3 - P.lift; }
    else { const dx = Math.sin(P.a), dy = -Math.cos(P.a); P.gx = Math.round(P.hx + dx * 15.5) + P.bx; P.gy = Math.round(P.hy + dy * 15.5); }
    let k = P.hx + 32; k = k * 128 + P.hy + 64; k = k * 64 + Math.round(P.a / ASTEP) + 32; k = k * 4 + P.lean + 1; k = k * 4 + P.head + 1; k = k * 4 + P.back; k = k * 4 + P.bend; k = k * 2 + P.bob; P.k1 = k;
    k = P.beard + 3; k = k * 4 + P.sway + 1; k = k * 8 + P.gem; k = k * 2 + P.glint; k = k * 4 + P.rim; k = k * 32 + P.bx + 16; k = k * 8 + P.crouch; k = k * 2 + P.eyes; k = k * 2 + P.flash; k = k * 4 + P.step + 1; k = k * 4 + P.wup;
    k = k * 2 + P.lying; k = k * 8 + P.lift; k = k * 32 + P.hatX + 16; k = k * 16 + P.hatY; k = k * 128 + Math.round(P.dq * 48); P.k2 = k;
  }

  // ───── 画 ─────
  let robeL = 0, robeR = 0;
  function robeEdges(y, yT, sway, lean) { const t = (y - yT) / (-2 - yT), s = sway * t * t, l = lean * (1 - t); robeL = Math.round(-4 - 4 * Math.pow(t, 1.15) + s + l); robeR = Math.round(3 + 4.2 * Math.pow(t, 1.1) + s + l); }
  const GEM_SHAPE = [0, -2, -1, -1, 0, -1, 1, -1, -1, 0, 0, 0, 1, 0, 0, 1];
  const GEM_LV = [
    [M_GEM, 4, M_GEM, 4, M_GEM, 3, M_GEM, 3, M_GEM, 3, M_GEM, 2, M_GEM, 2, M_GEM, 1],
    [M_GLOW, 3, M_GEM, 4, M_GEM, 4, M_GEM, 3, M_GEM, 4, M_GEM, 3, M_GEM, 2, M_GEM, 2],
    [M_GLOW, 3, M_GLOW, 3, M_GLOW, 3, M_GEM, 4, M_GEM, 4, M_GEM, 4, M_GEM, 3, M_GEM, 3],
    [M_GLOW, 3, M_GLOW, 3, M_GLOW, 3, M_GLOW, 1, M_GLOW, 3, M_GLOW, 3, M_GEM, 4, M_GEM, 4],
    [M_GEM, 2, M_GEM, 2, M_GEM, 2, M_GEM, 1, M_GEM, 2, M_GEM, 1, M_GEM, 1, M_GEM, 1],
  ];
  function drawGem(X, Y) { const lv = GEM_LV[P.gem]; part(); for (let i = 0; i < 8; i++) sp(X + GEM_SHAPE[i * 2], Y + GEM_SHAPE[i * 2 + 1], lv[i * 2], lv[i * 2 + 1]); if (P.glint) sp(X - 1, Y - 1, M_GLOW, 3); }
  function drawStanding() {
    const lean = P.lean, yT = -15 + P.bob + P.crouch, hx = lean + P.head, hy = yT - 1;
    part();
    const bsx = -3 + lean, bsy = yT + 2, bex = -5 - P.back, bey = yT + 8 - P.back * 1.5;
    for (let s = 0; s <= 1.001; s += 0.125) brush(bsx + (bex - bsx) * s, bsy + (bey - bsy) * s, 1 + s * 0.8, M_ROBE, 0);
    if (P.back > 1) { sp(bex - 2, bey, M_SKIN, 0); sp(bex - 2, bey + 1, M_SKIN, 0); sp(bex - 3, bey, M_SKIN, 0); }
    part();
    const fbx = Math.round(1 + P.step * 1.5), bbx = Math.round(-4 - P.step * 1.5), upF = P.wup === 1 ? 1 : 0, upB = P.wup === 2 ? 1 : 0;
    rect(bbx, -1 - upB, 3, 2, M_BOOT, 0); rect(fbx, -1 - upF, 4, 2, M_BOOT, 0); sp(fbx + 4, -upF, M_BOOT, 0);
    part();
    for (let y = yT; y <= -2; y++) { robeEdges(y, yT, P.sway, lean); let L = robeL, R = robeR; if (y === yT) { L += 1; R -= 1; } run(y, L, R, M_ROBE, 0); if (y === -2) for (let x = L + 1; x < R; x++) if (((x - P.sway) & 3) === 0) sp(x, y, 0, 0); }
    for (let y = yT + 9; y <= -3; y++) { const t = (y - yT) / (-2 - yT), s = P.sway * t * t; sp(-3 + s - t, y, M_ROBE, 2); if (y > yT + 10) sp(1 + s + t * 0.5, y, M_ROBE, 2); }
    line(2 + lean, yT + 8, 3 + P.sway, -2, M_TRIM, 3, 99);
    const by = yT + 7; robeEdges(by, yT, P.sway, lean); run(by, robeL, robeR, M_TRIM, 0); rect(1 + lean, by - 1, 2, 3, M_TRIM, 0); sp(1 + lean, by - 1, M_TRIM, 4);
    sp(-1 + lean, by + 1, M_TRIM, 2); sp(-1 + lean, by + 2, M_TRIM, 2); sp(-1 + lean, by + 3, M_TRIM, 3);
    part();
    for (let y = hy - 5; y <= hy; y++) run(y, hx - 2, hx + 3, M_SKIN, 0);
    for (let y = hy - 5; y <= hy - 1; y++) { sp(hx - 2, y, M_BEARD, 0); sp(hx - 1, y, M_BEARD, 0); }
    sp(hx, hy - 3, M_SKIN, 2); run(hy - 4, hx + 1, hx + 3, M_BEARD, 4);
    if (P.eyes) { sp(hx + 1, hy - 3, M_SKIN, 1); sp(hx + 2, hy - 3, M_SKIN, 1); } else sp(hx + 2, hy - 3, M_INK, 1);
    sp(hx + 3, hy - 3, M_SKIN, 3); sp(hx + 4, hy - 2, M_SKIN, 3); sp(hx + 4, hy - 1, M_SKIN, 2);
    part();
    for (let k = 0; k <= 9; k++) { const y = hy - 1 + k, q = k / 9, w = Math.max(1, Math.round(6 - q * 4.6)), cx = hx + 1.5 + P.beard * q * q * 1.2 - q * 0.6, x0 = Math.round(cx - w / 2); run(y, x0, x0 + w - 1, M_BEARD, 0); if (k > 1) for (let x = x0 + 1; x < x0 + w - 1; x++) if (((x * 3 + y + 30) % 5) === 0) sp(x, y, M_BEARD, 2); }
    run(hy - 1, hx + 1, hx + 4, M_BEARD, 4);
    part();
    run(hy - 6, hx - 4, hx + 6, M_HAT, 0); run(hy - 7, hx - 3, hx + 5, M_HAT, 0); run(hy - 8, hx - 2, hx + 3, M_TRIM, 0);
    let ax = 0; const ay = hy - 16;
    for (let k = 0; k <= 7; k++) { const w = Math.max(1, Math.round(6 - k * 0.72)), cx = hx + 0.5 - k * 0.45 - P.head * k * 0.12, x0 = Math.round(cx - w / 2); run(hy - 9 - k, x0, x0 + w - 1, M_HAT, 0); if (k === 7) ax = x0; }
    sp(ax - 1, ay - 1, M_HAT, 0); sp(ax - 2, ay - 1, M_HAT, 0); sp(ax - 3, ay - 1 + (P.bend >= 1 ? 1 : 0), M_HAT, 0);
    if (P.bend >= 2) sp(ax - 4, ay + 1, M_HAT, 0); if (P.bend >= 3) sp(ax - 4, ay + 2, M_HAT, 0);
    sp(hx - 1, hy - 11, M_TRIM, 4); sp(hx, hy - 12, M_TRIM, 3);
    part();
    const dx = Math.sin(P.a), dy = -Math.cos(P.a), tx = P.hx + dx * 13, ty = P.hy + dy * 13;
    line(P.hx - dx * 12, P.hy - dy * 12, tx, ty, M_WOOD, 3, 0);
    sp(tx - dy * 1.5 + dx, ty + dx * 1.5 + dy, M_WOOD, 2); sp(tx + dy * 1.5 + dx, ty - dx * 1.5 + dy, M_WOOD, 2);
    part();
    const ssx = 2 + lean, ssy = yT + 2, ux = P.hx - ssx, uy = P.hy - ssy, ul = Math.hypot(ux, uy) || 1, ex = P.hx - ux / ul * 1.8, ey = P.hy - uy / ul * 1.8;
    for (let s = 0; s <= 1.001; s += 0.125) brush(ssx + (ex - ssx) * s, ssy + (ey - ssy) * s, 1 + s * 0.9, M_ROBE, 0);
    part(); brush(ex, ey, 1.2, M_TRIM, 0);
    part(); rect(P.hx - 1, P.hy - 1, 2, 2, M_SKIN, 0);
    drawGem(P.gx - P.bx, P.gy);
  }
  function drawLying() {
    part(); line(3, 0, 19, -2, M_WOOD, 3, 0); sp(20, -3, M_WOOD, 2); sp(21, -1, M_WOOD, 2);
    part(); rect(1, -5, 3, 2, M_BOOT, 0); rect(1, -2, 3, 2, M_BOOT, 0); sp(4, -5, M_BOOT, 0); sp(4, -2, M_BOOT, 0);
    part();
    run(-1, -12, 1, M_ROBE, 0); run(-2, -12, 1, M_ROBE, 0); run(-3, -12, 0, M_ROBE, 0); run(-4, -11, 0, M_ROBE, 0); run(-5, -11, -1, M_ROBE, 0); run(-6, -9, -3, M_ROBE, 0);
    for (let y = -5; y <= -1; y += 2) sp(1, y, 0, 0);
    run(-3, -8, -2, M_ROBE, 2);
    for (let y = -6; y <= -1; y++) sp(-5, y, M_TRIM, 0); rect(-6, -4, 2, 2, M_TRIM, 0);
    part(); brush(-8, -7, 1.2, M_ROBE, 0); sp(-8, -9, M_TRIM, 3); sp(-8, -10, M_SKIN, 0); sp(-7, -10, M_SKIN, 0);
    part();
    for (let y = -5; y <= -1; y++) run(y, -17, -13, M_SKIN, 0);
    for (let y = -5; y <= -1; y++) sp(-18, y, M_BEARD, 0); run(0, -18, -15, M_BEARD, 0);
    run(-6, -16, -15, M_BEARD, 4); sp(-15, -5, M_SKIN, 1); sp(-16, -5, M_SKIN, 1); sp(-14, -6, M_SKIN, 3);
    part();
    run(-4, -13, -10, M_BEARD, 0); run(-5, -13, -9, M_BEARD, 0); run(-6, -12, -8, M_BEARD, 0); run(-7, -11, -9, M_BEARD, 0); sp(-8, -8, M_BEARD, 0);
    sp(-11, -5, M_BEARD, 2); sp(-10, -6, M_BEARD, 2); run(-5, -13, -12, M_BEARD, 4);
    part();
    const cx = -19 + P.hatX, cy = -P.hatY;
    run(cy - 1, cx - 3, cx + 3, M_HAT, 0); run(cy - 2, cx - 2, cx + 2, M_TRIM, 0);
    for (let k = 0; k < 6; k++) { const w = Math.max(1, Math.round(5 - k * 0.8)), x0 = Math.round(cx - 0.5 - k * 0.5 - w / 2); run(cy - 3 - k, x0, x0 + w - 1, M_HAT, 0); }
    sp(cx - 4, cy - 9, M_HAT, 0); sp(cx - 5, cy - 8, M_HAT, 0);
    drawGem(22, -3);
  }
  function drawHero() { begin(hero, P.bx, -P.lift); if (P.lying) drawLying(); else drawStanding(); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let smT = 9, smA0 = 0, smA1 = 0, smCX = 0, smCY = 0, mzT = 9, mzX = 0, mzY = 0, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0;
  function onEnter(s) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (s === CHARGE) { E.fx.circle(gx, HY, 12, 3, R_EL, 1.4, 1, 0); E.fx.dome(scrX(0), HY - 2, 14, 18, 'holy', 1.9, 2); }
    if (s === CAST) { E.fx.pillar(DUMMY_X, 0, HY, 3, 'holy', 0.9); E.fx.bolt(gx, gy, DUMMY_X - 4, HY - 20, 'bolt', 0.35); E.fx.cross(gx, gy, 8, R_EL, 0.3); E.fx.crack(DUMMY_X - 6, HY, 14, -1, 'earth', 1.2); E.fx.wave(scrX(6), HY, 1, 30, 7, 'fire', 0.8); E.fx.cloud(DUMMY_X, HY - 12, 9, 'poison', 1.4); E.fx.link(gx, gy, DUMMY_X, HY - 14, 'nature', 0.8); E.fx.slash(DUMMY_X, HY - 14, 11, -1.2, 1.4, 'steel', 0.25, 2); releaseOrbit(45, 100, 0.35, 0.75); burst(gx, gy, 30, 70, 140, 0.3, 0.75, R_EL, 10); shoot(2, gx + 2, gy, 120, DUMMY_X - 4); ring(gx, gy, 1, R_EL); shake(0.28, 2); flash(0.05); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {
      smA0 = K_WIND.a; smA1 = K_FLICK.a; smCX = HX + K_FLICK.hx; smCY = HY + K_FLICK.hy; smT = 0;
      mzT = 0; mzX = HX + P.gx; mzY = HY + P.gy; shoot(1, mzX + 2, mzY, 170, DUMMY_X - 3); burst(mzX, mzY, 6, 30, 60, 0.15, 0.3, R_EL, 0);
    }
    if (s === DEATH && t === INCOMING + 0.3 && MODE !== 'fall') { poseAt(DEATH, INCOMING + 0.29, INCOMING + 0.29); drawHero(); bakeHero(); E.death.start(MODE, { power: MODE === 'burst' ? 1.4 : 1, fromX: 8, fromY: -14, push: -20, chunk: 4, fadeAt: 1.3, ramp: 'soul' }); if (MODE === 'burst') { flash(0.05); shake(0.2, 2); } }
    if (s === DEATH && t === INCOMING + 0.66) { for (let i = 0; i < 16; i++) { const x = HX - 20 + Math.random() * 24; spawn(K_DUST, x, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); } shake(0.1, 1); }
  }
  const EVENTS = [[], [], [T_FLICK], [], [], [], [], [INCOMING + 0.3, INCOMING + 0.66], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 8, 40, 90, 0.15, 0.35, R_EL, 10); hitDummy(0); }
    else if (k === 2) { burst(x, y, 36, 60, 150, 0.3, 0.7, R_EL, 16); ring(x, y, 1, R_EL); hitDummy(1); shake(0.12, 1); }
  }
  function stepFX(dt, state, stT) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (state === CHARGE) { chargeAcc += dt * (26 + 34 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 12 + Math.random() * 9, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) for (let i = 0; i < 2; i++) spawn(K_DUST, scrX(P.step > 0 ? 4 : -3) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); lastStep = P.step; }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 2.2 : 7); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx + Math.round(Math.random() * 2 - 1), gy - 1, Math.random() * 8 - 4, -7 - Math.random() * 8, 0.7 + Math.random() * 0.7, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 22, HY - 1 - Math.random() * 7, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT += dt; mzT += dt;
  }
  function fxReset() { smT = 9; mzT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (!P.lying) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const gx = scrX(P.gx), gy = HY + P.gy;
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 6 : 3 + (f12 & 1); for (let r = 3; r <= L; r++) { const c = P.gem === 3 ? (r <= 3 ? EL[0] : r <= 5 ? EL[1] : EL[2]) : (r === 3 ? EL[1] : EL[2]); put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy + r, c); put(gx, gy - r, c); } if (P.gem === 3) { put(gx + 2, gy + 2, EL[1]); put(gx - 2, gy - 2, EL[1]); put(gx + 2, gy - 2, EL[1]); put(gx - 2, gy + 2, EL[1]); } }
    if (smT < 2 / 12) { const c = smT < 1 / 12 ? EL[1] : EL[2]; for (let k = 1; k < 10; k++) { const a = smA0 + (smA1 - smA0) * k / 10, r = 15.5; if ((k & 1) && smT >= 1 / 12) continue; put(Math.round(smCX + Math.sin(a) * r), Math.round(smCY - Math.cos(a) * r), c); } }
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; for (let r = 1; r <= 3; r++) { put(mzX + r, mzY, r < 3 ? c : EL[2]); put(mzX, mzY - r, r < 2 ? c : EL[2]); put(mzX, mzY + r, r < 2 ? c : EL[2]); } put(mzX, mzY, EL[0]); }
  }

  return {
    name: '引擎演示 · ' + MODE, HX, R_EL, DUR, hero, P, GLOW_MATS: [M_GEM, M_GLOW], HIT_POINT: [2, -13], EVENTS,
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront,
    // 场外效果演示（按 7）：?off=frost|fire|poison|curse|slow|sink|stun 看假人的各种持续效果
    offField() {
      const k = new URLSearchParams(location.search).get('off') || 'frost';
      const o = { frost: { tint: 'frost', stun: 1 }, fire: { tint: 'fire' }, poison: { tint: 'poison' }, curse: { tint: 'curse', slow: 0.4 }, slow: { slow: 0.35 }, sink: { sink: 4 }, stun: { stun: 1 } }[k] || { tint: 'frost' };
      E.dummyFx(Object.assign({ dur: 2.2 }, o)); E.hitDummy(1, 1); E.fx.cloud(DUMMY_X, HY - 14, 9, o.tint || 'magic', 0.8, 2); E.flash(0.05);
    },
  };
});
