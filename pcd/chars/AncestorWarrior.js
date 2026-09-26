// 先祖战士（部队 · 恶魔 · 先锋 · 优质）：矮壮微驼、刚从坟里爬出来的先祖——骨白先祖面具 + 一对上弯长角、面具两侧垂下白色长辫（辫梢骨珠）、
// 半裸灰青恶魔皮、墓苔色破麻衣 + 锯齿尸布披风、赤足缠布；左手（远侧）挎一面圆顶墓碑石盾，右手（近侧）半截锈断剑。
// 攻击 = 撩（碑盾护胸，断剑从下往上反撩）；技能 = 特性「浅坟」：跪下沉进土里，碑盾自己立成墓碑，墓火汇聚、碑纹逐行点亮 → 破土而出 → 带两层残影的快撩。
// 升级成「灵魂战士」（SoulWarrior.js）：墓碑盾、长角、白辫、断剑（被魂火接成传说之剑）、墓火青绿色阶全线共有。
PCD.define('AncestorWarrior', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, hash, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_EMBER, K_STILL, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, PI = Math.PI;

  // ───── 元素：墓火 · 青绿（升级线共用）─────
  const R_EL = fxRamp('grave', [21, '#d4f6e4', '#62d0a4', '#2a7462', '#10302a']), EL = FXR[R_EL], R_IMP = FXI.impact, R_EARTH = FXI.earth;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    shroud: { r: ['#10160f', '#26331f', '#3e5233', '#627a4e'], band: 2 },   // 墓苔绿褐尸布 / 破麻衣（大面积）
    skin: ['#0e1216', '#2a353c', '#46565e', '#6a7e84'],                     // 灰青恶魔皮
    mask: 'bone', horn: 'bone', braid: 'white', bead: 'bone', wrap: [20, 7, 6, 5],   // 面具 · 角 · 白辫 · 骨珠 · 缠布（旧麻）
    stone: 'stone', moss: 'moss', iron: 'iron', blade: 'steel', rust: 'leather', rope: 'leather',
    dirt: { r: [0, 20, 19, 32], band: 2 },                                   // 坟土
    glow: { r: ['#10302a', '#2a7462', '#62d0a4', '#d4f6e4'], flat: 1 },     // 墓火（碑纹、眼孔；发光体）
  });
  const BODY = { body: 'stocky', hunch: 1, fall: 'back' };
  const HX = 77, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 52, 40, 47);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['glow', 'rope', 'wrap', 'dirt', 'moss', 'bead']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（近侧）= 断剑；后手（远侧）= 墓碑盾（碑底 = 后手 y + TG）─────
  const TG = 6;
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, sink: 0, mound: 0, stone: 0, glyph: 0, eyef: 1,
    tipx: 0, tipy: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(2, -7, 3.93, 10, -7);                // 断剑垂在身后拖地，碑盾拄在身前
  const K_WALK = K(2, -6, 3.93, 10, -9);                // 碑盾抬离地面，断剑尖拖地
  const K_WIND = K(0, -5, 3.93, 9, -10, 0, 0, 1);       // 碑盾护胸，断剑压到身后下方
  const K_STRIKE = K(9, -14, 0.46, 10, -9, 1, 1);       // 从下往上反撩到前上方
  const K_HOLD = K(8, -15, 0.2, 10, -9, 1);
  const K_KNEEL = K(6, -5, 2.68, 4, -8, 1, 0, 4);       // 技能：跪下，断剑插进土里，碑盾离手自己立着
  const K_UP = K(6, -19, 0.2, 8, -13, -1, -1);        // 破土而出：挺身、断剑举起、碑盾扬起
  const K_WIND2 = K(1, -5, 3.93, 9, -10, 0, 0, 1);
  const K_STRIKE2 = K(10, -15, 0.46, 10, -10, 1, 1);
  const K_HURT = K(1, -6, 3.9, 8, -9, -1, -1);
  const K_DKNEEL = K(5, -5, 2.4, 6, -6, 1, 0, 4);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -64, 64, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1],
    ['flash', 0, 1], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['sink', 0, 9], ['mound', 0, 4], ['stone', 0, 2], ['glyph', 0, 7], ['eyef', 0, 2], ['lying', 0, 1], ['lift', 0, 3]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], EYE_IDLE = [1, 2, 1, 0];
  const T_STRIKE = 2 / 12, T_GHOST = [1 / 12, 2 / 12], T_SLASH = 3 / 12, T_LAND = INCOMING + 0.66;
  const STONE_X = 11;                                                   // 技能 / 死亡时碑盾立着的位置（碑中线）

  // 断剑几何（和画的时候同一套吸附）：握点 → 刃尖
  function swordGeo(gx, gy, a, n) {
    const di = parts.snapDir(a), c8 = parts.cell(di, 0, 0, 8), x0 = c8[0] < 0 ? gx - 1 : gx, y0 = c8[1] < 0 ? gy - 1 : gy;
    return { di, x0, y0, n, tip: parts.cell(di, x0, y0, n + 1) };
  }
  const SWORD_N = 6;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.sink = 0; P.mound = 0; P.stone = 0; P.glyph = 0; P.eyef = 1;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.eyef = EYE_IDLE[b & 3];
      const lp = tq % DUR[IDLE];                                        // 待机个性：拄着碑盾低头默祷，眼孔墓火一明一灭、碑纹跟着亮一下
      if (lp >= 1.2 && lp < 2.1) { const k = Math.floor((lp - 1.2) * 12 + 1e-6); P.lean = 1; P.bhx -= 1; P.eyef = (k & 1) ? 2 : 0; P.glyph = k >= 4 && k < 9 ? 7 : 0; P.beard = k < 5 ? 1 : -1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                             // 蹒跚拖步：接触帧身子一顿（前倾 + 下沉），断剑尖拖在地上
      setK(K_WALK, K_WALK, 0); parts.gait(P, E.gait(tq));
      if (P.step !== 0) { P.lean = 1; P.hx += 1; } P.bhy += P.step !== 0 ? 1 : 0; P.eyef = P.step !== 0 ? 1 : 2;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 1; P.sway = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 4; P.gem = 2; P.beard = -2; P.sway = -1; P.bend = 1; P.eyef = 2; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_STRIKE, K_HOLD, q); P.bx = RD(4 - q); P.gem = 1; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                         // 跪下 → 碑盾离手立成墓碑 → 下沉进土里 6 格，碑纹逐行点亮
      const q = ease.inOut(clamp01(tq / 0.35)); setK(K_IDLE, K_KNEEL, q); P.stone = tq >= 0.25 ? 1 : 0;
      const s = ease.inOut(clamp01((tq - 0.35) / 0.55)); P.sink = RD(6 * s); P.mound = tq < 0.35 ? 0 : tq < 0.55 ? 1 : 2;
      P.glyph = Math.min(7, Math.max(0, Math.floor((tq - 0.45) / 0.11) + 1)); P.bend = RD(q * 2) + (tq > 1.1 && (f12 & 1) ? 1 : 0);
      P.beard = -RD(q * 2); P.gem = tq < 0.5 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.eyef = (f12 & 1) ? 2 : 1;
    } else if (st === CAST) {                                           // 破土而出 → 两帧回抡 → 带残影的快撩
      if (tq < T_GHOST[1]) { setK(K_UP, K_UP, 0); P.gem = 3; P.rim = 3; P.beard = 2; P.sway = 1; P.eyef = 2; P.glint = 1; }
      else if (tq < T_SLASH) { setK(K_WIND2, K_WIND2, 0); P.bx = 2; P.gem = 3; P.rim = 3; P.beard = 1; P.eyef = 2; }
      else { const q = ease.out(clamp01((tq - T_SLASH) / 0.2)); setK(K_STRIKE2, K_HOLD, q); P.bx = 5; P.gem = 3; P.rim = 3; P.beard = -2; P.sway = -1; P.bend = 2; P.eyef = 2; }
      P.glyph = 7;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_HOLD, K_IDLE, q); P.bx = RD(5 * (1 - q)); P.beard = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.glyph = q < 0.5 ? 7 : 0; P.eyef = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.bend = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.eyef = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; P.eyef = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                          // 下陷入坟：仰倒 → 身下拱起土堆慢慢埋掉身体 → 只剩墓碑立着 → 碑也化灰
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; P.eyef = f12 & 1 ? 2 : 0; }
      else if (d < 0.5) { setK(K_HURT, K_DKNEEL, ease.out((d - 0.3) / 0.2)); P.bx = -2; P.crouch = d < 0.4 ? 2 : 4; P.beard = 1; P.stone = 1; P.eyef = 1; }
      else {
        setK(K_DKNEEL, K_DKNEEL, 0); P.lying = 1; P.bx = -2; P.stone = 2; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        const s = clamp01((d - 0.72) / 0.7); P.sink = RD(8 * ease.inOut(s)); P.mound = d < 0.72 ? 0 : Math.min(4, 1 + Math.floor(s * 4));
        P.eyef = d < 1.0 ? ((f12 & 1) ? 2 : 0) : 0; P.gem = d < 1.2 ? ((f12 % 3) === 0 ? 1 : 0) : 4; P.eyes = d >= 1.2 ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0; P.eyef = 2;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const g = swordGeo(P.hx, P.hy, P.a, SWORD_N); P.tipx = g.tip[0] + P.bx; P.tipy = g.tip[1];
    if (P.lying || P.stone) { P.gx = STONE_X + P.bx * (P.lying ? 0 : 1); P.gy = -7; }   // 发光体 = 碑纹（碑盾立在地上时）
    else { P.gx = P.bhx + P.bx; P.gy = P.bhy + TG - 7; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：墓碑盾（圆顶长方石碑，宽 7 高 13；碑面内框刻线 + 先祖纹。纹路是发光体、和碑同一部件，从下往上按 lit 行点亮，亮度按 lv 5 档）
  const TOMB_W = [1, 2, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3];
  const GLYPH = [[0, 3], [-1, 4], [0, 4], [1, 4], [0, 5], [-1, 6], [1, 6], [0, 7], [-1, 8], [0, 8], [1, 8], [0, 9], [-1, 10], [1, 10]];
  function tomb(T, cx, by, lit, lv) {
    E.part(); const top = by - 12;
    for (let r = 0; r < 13; r++) {
      const w = TOMB_W[r], y = top + r;
      for (let x = -w; x <= w; x++) {
        let m = M.stone, t = 0;
        if (r >= 2 && r <= 11 && Math.abs(x) === 2) t = 2;               // 碑面内框刻线
        if (r === 2 && Math.abs(x) < 2) t = 2;
        if (r >= 11 && (x === -3 || x === 3 && r === 12 || x === -2 && r === 12)) { m = M.moss; t = 3; }   // 碑脚苔斑
        parts.px(E, T, cx + x, y, m, t);
      }
    }
    parts.px(E, T, cx - 1, top, M.stone, 4); parts.px(E, T, cx - 2, top + 1, M.stone, 4);
    parts.px(E, T, cx + 3, top + 4, M.stone, 1); parts.px(E, T, cx + 2, top + 5, M.stone, 1);                  // 右上角一道裂
    for (const [x, r] of GLYPH) {
      const on = r >= 11 - lit, tn = lv === 4 ? 1 : !on ? 2 : lv >= 3 ? 4 : lv === 2 ? ((r & 1) ? 4 : 3) : 3;
      parts.px(E, T, cx + x, top + r, M.glow, tn);
    }
  }
  // 候选部件：断剑（吸附斜率的单手剑，刃只剩前半截，断口参差：最后一格只留刃口一侧、另一侧缺一格；刃上锈斑）
  function brokenSword(T, g) {
    const { di, x0, y0, n } = g; E.part();
    parts.bar(di, x0, y0, -2, -2, 1, (k, j, X, Y) => parts.px(E, T, X, Y, M.iron, 4));
    parts.bar(di, x0, y0, -1, 0, 1, (k, j, X, Y) => parts.px(E, T, X, Y, M.wrap, 2));
    { const c = parts.cell(di, x0, y0, 1), pd = (di + 4) % 16; parts.bar(pd, c[0], c[1], -1, 1, 1, (k, j, X, Y) => parts.px(E, T, X, Y, M.iron, k === -1 ? 4 : k === 1 ? 2 : 3)); }
    parts.bar(di, x0, y0, 2, n + 1, 2, (k, j, X, Y) => {
      if (k === n + 1 && j === 1) return; if (k === n && j === 1) return;            // 断口：刃背那侧先断
      let m = M.blade, t = j === 0 ? 4 : 2;
      if (hash(k * 3 + j, 17) < 0.3 || (k === n + 1)) { m = M.rust; t = 3; }
      parts.px(E, T, X, Y, m, t);
    });
  }
  // 候选部件：长辫（从头侧垂下，每 2 行一道辫纹，辫梢一颗骨珠，梢会摆）
  function braid(T, x, y0, len, mat, sw) {
    E.part();
    for (let k = 0; k < len; k++) { const q = k / len, xx = x + RD(sw * q * q * 1.5); parts.px(E, T, xx, y0 + k, mat, (k & 1) ? 2 : 3); }
    const tx = x + RD(sw * 1.5); parts.px(E, T, tx, y0 + len, M.bead, 4); parts.px(E, T, tx, y0 + len + 1, M.bead, 2);
  }
  // 候选部件：坟土堆（半椭圆土包，上沿受光，撒几点苔和碎石；按 w 半宽、h 高，贴地画）
  function mound(T, cx, w, h) {
    if (h <= 0) return; E.part();
    for (let x = -w; x <= w; x++) {
      const q = x / w, hh = Math.max(1, RD(h * Math.sqrt(Math.max(0, 1 - q * q)) + 0.3));
      for (let y = -hh; y <= -1; y++) { const t = y === -hh && hash(x, 3) < 0.35 ? 4 : 0; parts.px(E, T, cx + x, y, (y === -hh && hash(x, 9) < 0.25) ? M.moss : M.dirt, t); }
    }
    for (let x = -w + 2; x < w - 1; x += 4) parts.px(E, T, cx + x + (hash(x, 5) < 0.5 ? 1 : 0), -1, M.stone, 4);
  }
  function drawHero() {
    const s = P.sink; E.begin(hero, P.bx, s, s ? -s : undefined);
    const R = parts.rig(P, BODY), FR = parts.FREE, dead = P.st === DEATH && P.lying;
    const TF = { r0: 0, tx: -P.bx * (dead ? 1 : 0), ty: -s, rot: 0, ox: 0, oy: 0 };          // 不随身体下沉的东西（立着的碑、土堆）：抵消下沉
    parts.cape(E, R, P, { style: 'tattered', mat: M.shroud, flare: 5 });
    braid(R, R.hx0 - 1, R.hy - 2, 7, M.braidD, RD(P.beard * 0.6));                               // 远侧辫（脑后）
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, cuff: M.wrapD, grip: P.stone ? 'fist' : 'none', hand: M.skinD });
    parts.legs(E, R, P, { style: 'bare', mat: M.skin, matD: M.skinD, boot: M.wrap, bootD: M.wrapD, bootH: 2 });
    const tor = parts.torso(E, R, P, { style: 'tunic', mat: M.shroud, belt: M.rope });
    { const rows = tor.rows, hem = tor.hem, L = rows[0][rows[0].length - 1], Rr = rows[1][rows[1].length - 1];   // 破麻衣：下摆撕成锯齿、胸口一道破口露出灰青皮
      for (let x = L + 1; x < Rr; x++) if ((((x - P.sway) % 3) + 3) % 3 === 0) parts.px(E, R, x, hem, 0, 0);
      const c = tor.chest; parts.px(E, R, c[0] + 1, c[1] - 1, M.skin, 3); parts.px(E, R, c[0] + 2, c[1], M.skin, 2); parts.px(E, R, c[0] + 1, c[1] + 1, M.skin, 3); }
    parts.head(E, R, P, { mat: M.skin, face: 'square', nose: 'none', mouth: 'none', ear: 'none' });
    { const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey;                       // 先祖骨面具（和头同一部件）：盖住脸和头顶，眼孔里是墓火
      for (let y = top; y <= bot; y++) for (let x = x0 + 1; x <= x1; x++) { if (y === bot && x === x0 + 1) continue; parts.px(E, R, x, y, M.mask, 0); }
      parts.px(E, R, x1 + 1, ey - 1, M.mask, 4); parts.px(E, R, x1 + 1, ey, M.mask, 3); parts.px(E, R, x1 + 1, ey + 1, M.mask, 2);   // 眉骨 + 鼻梁前凸
      run2(R, ey - 1, x1 - 2, x1, M.mask, 4);
      if (P.eyes || P.eyef === 0) { parts.px(E, R, x1 - 1, ey, M.glow, 1); parts.px(E, R, x1, ey, M.glow, 1); }
      else { parts.px(E, R, x1 - 1, ey, M.glow, P.eyef === 2 ? 4 : 3); parts.px(E, R, x1, ey, M.glow, P.eyef === 2 ? 3 : 2); }
      for (let x = x1 - 2; x <= x1; x++) parts.px(E, R, x, bot, M.mask, (x & 1) ? 1 : 3);    // 牙排
      parts.px(E, R, x0 + 2, ey + 1, M.mask, 2); parts.px(E, R, x0 + 3, ey + 2, M.mask, 2);   // 颊上纹
    }
    parts.horns(E, R, P, { mat: M.horn, size: 6, curve: 'up', y: 2 });
    braid(R, R.hx0 + 1, R.hy + 1, 7, M.braid, RD(P.beard * 0.8));                                // 近侧辫（垂在胸前）
    if (P.stone === 0) tomb(R, P.bhx, P.bhy + TG, P.glyph, P.gem);                             // 挎在后手上
    if (dead) {
      brokenSword(FR, swordGeo(4, -2 - s, PI / 2, SWORD_N));                                     // 断剑掉在身旁（会被土埋掉）
      mound(TF, -7, 14, P.mound ? P.mound + 1 : 0);
      tomb(TF, STONE_X, -1, 0, P.gem);
    } else {
      if (P.stone) { mound(TF, 1, 8, P.mound); tomb(TF, STONE_X + P.bx, -1, P.glyph, P.gem); }
      brokenSword(R, swordGeo(P.hx, P.hy, P.a, SWORD_N));
      parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, cuff: M.wrap, hand: M.skin, grip: 'fist' });
    }
  }
  function run2(T, y, x0, x1, m, t) { for (let x = x0; x <= x1; x++) parts.px(E, T, x, y, m, t); }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghost = [new Sprite(hero.w, hero.h, hero.ox, hero.oy), new Sprite(hero.w, hero.h, hero.ox, hero.oy)];
  let ghT = 9, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, dragAcc = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const R0 = parts.rig({}, BODY);
  function snap(i) { copySprite(ghost[i], hero); }
  function onEnter(s) {
    if (s !== CAST) return;                                             // 破土而出：土块外爆 + 冲击环 + 墓碑十字星芒
    const x = wx(2), tx = wx(P.bhx), ty = wy(P.bhy + TG - 12);
    releaseOrbit(40, 90, 0.3, 0.6, { pts: 1, up: 30 });
    burst(x, HY - 2, 24, 40, 110, 0.3, 0.7, R_EARTH, 34); burst(x, HY - 6, 12, 30, 80, 0.2, 0.5, R_EL, 20);
    for (let i = 0; i < 8; i++) spawnX(E.K_PHYS, x - 8 + i * 2, HY - 2, (i - 3.5) * 14, -60 - hash(i, 2) * 40, 0.8, R_EARTH, { g: 260, floor: HY, sz: 2 });
    ring(x, HY - 6, 1, R_EL); fx.cross(tx, ty, 7, R_EL, 0.35); fx.crack(x - 2, HY, 10, -1, R_EARTH, 0.6); fx.crack(x + 2, HY, 10, 1, R_EARTH, 0.6);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'earth', w: 0.6 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                               // 反撩：从身后下方撩到前上方
      const cx = wx(R0.sFx + 4), cy = wy(R0.sFy);
      fx.slash(cx, cy, 10, K_WIND.a - 0.2, K_STRIKE.a, R_IMP, 0.17, 2, 2);
      hitDummy(0); burst(DUMMY_X - 4, HY - 13, 10, 40, 100, 0.15, 0.35, R_IMP, 16); fx.cross(DUMMY_X - 4, HY - 13, 3, R_IMP, 0.18);
      sfx('swing', { kind: 'slash', w: 0.5 }); sfx('hit', { mat: 'flesh', w: 0.5 });
    }
    if (s === CAST) {
      const i = T_GHOST.indexOf(t);
      if (i >= 0) { poseAt(CAST, t, t); drawHero(); bakeHero(); snap(i); hero.k1 = hero.k2 = -1; }
      if (t === T_SLASH) {                                              // 带两层残影的快撩（攻速更快）
        ghT = 0; const cx = wx(R0.sFx + 5), cy = wy(R0.sFy);
        fx.slash(cx, cy, 11, K_WIND2.a - 0.2, K_STRIKE2.a - 0.1, R_EL, 0.3, 3, 2); fx.slash(cx - 1, cy, 9, K_WIND2.a - 0.1, K_STRIKE2.a, R_EL, 0.2, 1, 2);
        hitDummy(1); burst(DUMMY_X - 3, HY - 14, 22, 50, 130, 0.2, 0.5, R_EL, 20); fx.cross(DUMMY_X - 3, HY - 14, 5, R_EL, 0.25); shake(0.12, 1);
        sfx('impact', { pal: 'earth', w: 0.5 });
      }
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.55 }); }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [T_GHOST[0], T_GHOST[1], T_SLASH], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.35) {                               // 四周地面冒出墓火粒子，定点汇聚到坟上
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = Math.random() * 6.2832, r = 12 + Math.random() * 10; spawn(K_SPIRAL_PT, wx(2) + Math.cos(a) * r, HY - 4, r / (0.45 + Math.random() * 0.3), 0, 9, R_EL, a, r, 3 + Math.random() * 3); }
      if (Math.random() < dt * 14) spawn(K_EMBER, wx(-8 + Math.random() * 20), HY - 1, (Math.random() - 0.5) * 6, -10 - Math.random() * 10, 0.5 + Math.random() * 0.4, R_EL);
    }
    if (state === MOVE) {
      if (P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.55 }); for (let i = 0; i < 2; i++) spawn(K_DUST, wx(P.step > 0 ? 4 : -3) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); } lastStep = P.step; }
      dragAcc += dt * 18; while (dragAcc >= 1) { dragAcc -= 1; if (P.tipy >= -1) spawn(K_STILL, wx(P.tipx), HY, 0, 0, 0.45, FXI.dust); }   // 断剑尖在地上划出 1 格土痕
    }
    if (state === IDLE || state === RECOVER) { emberAcc += dt * (state === IDLE ? 1.4 : 5); while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(R0.hx1 + 1), wy(R0.ey), Math.random() * 6 - 3, -6 - Math.random() * 6, 0.5 + Math.random() * 0.4, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 34, HY - 1 - Math.random() * 12, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.8, Math.random() < 0.5 ? R_EL : FXI.soul); } }
    ghT += dt;
  }
  function fxReset() { ghT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; dragAcc = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() {                                                    // 两层青绿残影（破土后更快）
    if (ghT < 0.42) { const q = ghT / 0.42; blitShape(ghost[0], HX + P.mx, HY, P.flip, EL[3], clamp01(q * 1.2)); blitShape(ghost[1], HX + P.mx, HY, P.flip, EL[2], clamp01(q * 1.2 - 0.15)); }
  }
  function fxFront(f12) {
    if (P.st === CHARGE && P.glyph >= 7 && (f12 & 1)) { const x = wx(STONE_X), y = wy(-13); put(x, y - 1, EL[1]); put(x, y - 2, EL[2]); put(x - 1, y - 1, EL[2]); put(x + 1, y - 1, EL[2]); }   // 碑顶蓄满的小星
  }

  return {
    name: '先祖战士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow], HIT_POINT: [2, -12], EVENTS,
    REVIVE: { ramp: R_EL, big: 1 },
    SFX: { body: 'flesh', how: 'collapse', pal: 'earth', style: 'nova', w: 0.6 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
