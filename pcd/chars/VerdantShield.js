// 翠盾（部队 · 精灵 · 守护者 · 神话）：黑铁卫（BlackIronGuard.js）进化后的同一个人——同样的尖刺塔盾、翼耳桶盔、背上的杆，
// 黑铁里长出翠绿活木与藤叶：塔盾换成翠玉活木面（木刺抽芽、盾心翠玉花），翼耳缠藤、尖端冒出大叶，背旗旗杆长成一株小树（树冠在头顶上方，枝上挂议会长旗）。
// 攻击 = 根刺盾砸；技能 = 特性「议会」生效：塔盾扎根，根须放射、大圆法阵亮起，藤蔓把身后友军连成议会，每人身前展开一面叶盾。
PCD.define('VerdantShield', (E) => {
  const { parts, Sprite, bake, begin, part, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, INCOMING, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx, allyPoints, allyFx } = E;
  const RD = Math.round, px = parts.px;

  // ───── 元素：议会 · 翠玉自然（共享 nature 色阶：白 → 淡黄绿 → 翠绿 → 深绿 → 墨绿）─────
  const R_EL = FXI.nature, EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    jade: 'green', face: { r: [34, 35, 35, 36], band: 2 }, iron: 'iron', vine: 'moss', leaf: [35, 36, 37, 38], wood: 'wood', crown: { r: 'moss', band: 2 },
    cloth: { r: 'green', band: 2 }, wing: [28, 29, 30, 31],
    eye: { r: [34, 36, 38, 38], flat: 1 }, gem: { r: [35, 36, 37, 38], flat: 1 }, glow: { r: [38, 50, 21, 21], flat: 1 },
  });
  const BODY = { body: 'giant', leg: 12, torso: 14, head: 7, headW: 7, sw: 7, arm: 14, lw: 4, stride: 3, limb: 1.5, fall: 'front' };
  const HX = 76, DUR = DEFAULT_DUR.slice();                     // 近战：盾砸前冲 4 格，盾面够到 x≈97
  const hero = new Sprite(78, 58, 36, 53);                      // 缓冲：脚底 = (36, 53)；放得下树冠 + 议会长旗、举过头顶的塔盾、前冲砸地的盾
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 7, 13, 18], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'cloth', 'crown', 'eye', 'gem', 'glow', 'vine']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 塔盾握把（盾心 = 前手 + (1, 3)）─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, shx: 0, shy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, bloom: 0, vine: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(8, -10, -6, -14);                            // 塔盾立在身前，盾底贴地
  const K_WIND = K(8, -34, 6, -34, -1, -1);                     // 双手把盾举过头顶
  const K_SLAM = K(11, -10, 9, -15, 1, 1, 2);                   // 砸下：盾底咬进地面
  const K_HOLD = K(11, -10, 8, -15, 1, 0, 1);
  const K_CHARGE = K(10, -9, 8, -13, 1, 1, 2);                  // 蓄力：塔盾插地（盾底 3 行扎进地里），俯身压盾
  const K_CAST = K(10, -9, 8, -15, -1, -1, 2);                  // 施放：盾仍插地，人向后挺身仰头
  const K_HURT = K(6, -11, -7, -14, -1, -1);
  const K_KNEEL = K(10, -19, 8, -19, 1, 1, 4);                  // 单膝跪地，两手按在立着的盾顶
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['shx', -32, 31], ['shy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['bloom', 0, 2], ['vine', 0, 3], ['glint', 0, 1], ['rim', 0, 3],
    ['eyes', 0, 1], ['flash', 0, 1], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const FLAG_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], BLOOM_IDLE = [0, 0, 1, 2, 2, 1];   // 待机个性：盾心翠玉花每 0.4 s 一档慢慢开合
  const T_SLAM = 2 / 12, T_VINE = 2 / 12, T_ROOT1 = 0.25, T_ROOT2 = 0.65, T_KNEE = INCOMING + 0.38, T_ASH = INCOMING + 1.25;
  let shFix = null;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; shFix = null;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.bloom = 0; P.vine = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    let shDy = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = FLAG_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.bloom = BLOOM_IDLE[Math.floor((tq % DUR[IDLE]) * 2.5 + 1e-6) % 6]; P.glint = P.bloom === 2 && (b & 1) ? 1 : 0;
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 生根重步：接触帧下沉 1 格、盾底磕地；经过帧盾离地 1 格
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.bloom = 1;
      shDy = P.wup ? -1 : P.bob;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.bloom = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_SLAM, K_SLAM, 0); P.bx = 4; P.gem = 2; P.bloom = 2; P.rim = 2; P.beard = -2; P.sway = -1; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_SLAM, K_HOLD, q); P.bx = RD(4 - q); P.gem = 1; P.bloom = 1; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 塔盾插地、俯身压住；树冠被风吹向后；花从闭合到全开
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q);
      P.beard = q > 0.6 ? ((f12 & 1) ? -2 : -1) : -RD(q * 2); P.sway = q > 0.4 ? ((f12 & 1) ? -2 : -1) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.bloom = tq < 0.35 ? 0 : tq < 0.8 ? 1 : 2; P.rim = 2;
    } else if (st === CAST) { setK(K_CAST, K_CAST, 0); P.beard = -3; P.sway = -2; P.gem = 3; P.bloom = 2; P.rim = 3; P.glint = tq < 0.1 ? 1 : 0; }
    else if (st === RECOVER) {                                         // 拔盾、根须缩回
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.beard = -RD(2 * (1 - q)); P.sway = -RD(1 - q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.bloom = q < 0.5 ? 2 : 1; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.sway = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 跪地撑盾 → 藤蔓从脚下往上 3 档裹住全身 → 化成落叶飘走（死亡套件 ash）
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; P.bloom = 1; }
      else if (d < 0.38) { setK(K_HURT, K_KNEEL, 0.5); P.crouch = 2; P.bx = -1; P.eyes = 1; P.beard = 2; P.gem = 1; P.bloom = 1; }
      else {
        setK(K_KNEEL, K_KNEEL, 0); P.eyes = 1; P.beard = d < 0.6 ? 1 : 0; shFix = [12, -7];
        P.gem = d < 0.5 ? 1 : d < 0.9 ? ((f12 & 1) ? 1 : 4) : 4; P.bloom = d < 0.7 ? 1 : 0;
        P.vine = d < 0.55 ? 0 : d < 0.75 ? 1 : d < 0.95 ? 2 : 3;
        if (d >= T_ASH - INCOMING) P.dq = 1;                           // 之后由死亡套件（化叶）接管
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const cr = Math.min(3, RD(P.crouch)), yo = P.bob + cr;
    P.hx = RD(P.hx); P.bhx = RD(P.bhx); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const hy0 = RD(P.hy); P.hy = hy0 + (shDy ? shDy : P.bob) + cr; P.bhy = RD(P.bhy) + yo;
    if (shFix) { P.shx = shFix[0]; P.shy = shFix[1]; }
    else { P.shx = P.hx + 1; P.shy = hy0 + 3 + cr + shDy; }            // 盾不随呼吸起伏；重步接触帧磕进地面 1 行、经过帧离地 1 格
    P.gx = P.shx + P.bx; P.gy = P.shy;                                 // 发光体 = 盾心翠玉花
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：背树（背旗旗杆长成的小树）——树干从腰后伸到盔顶上方，树冠在头顶后上方散开（随 sway 摆），往后伸一根枝挂竖长旗。读 P：sway（树冠摆）beard（长旗下摆）gem（≥ 2 时冠顶亮点）
  const CROWN = [3, 5, 6, 6, 6, 5, 3];
  function drawTree(R) {
    const e = parts.edges(R, R.yS + 2)[0], x = e - 4, yb = R.yWaist, sw = P.sway, b = P.beard, cx = x + 2, cy = R.htop - 9, yTop = cy + 3;
    part();
    for (let y = yTop; y <= yb; y++) px(E, R, x, y, M.wood, y < R.yS && ((y & 3) === 0) ? 4 : 0);
    for (let k = x + 1; k < e; k++) { px(E, R, k, R.yS + 2, M.vine, 0); px(E, R, k, R.yWaist - 1, M.vine, 0); }   // 缠在后背上的藤（原来的杆托）
    for (let k = 1; k <= 5; k++) px(E, R, x - k, yTop + 1 + (k > 3 ? 1 : 0), M.wood, 0);                        // 往后伸的枝
    const bx0 = x - 5;                                                                                       // 议会长旗：4 格宽、9 行，挂在枝上
    for (let j = 0; j < 9; j++) { const q = j / 8, dx = RD(b * q * q * 0.9 + sw * q * 0.4); for (let i = 0; i < 4; i++) px(E, R, bx0 - i + dx, yTop + 3 + j, i === 3 || j === 8 ? M.leaf : M.cloth, i === 3 || j === 8 ? 3 : 0); }
    px(E, R, bx0 - 1 + RD(b * 0.2), yTop + 6, M.leaf, 4); px(E, R, bx0 - 2 + RD(b * 0.2), yTop + 5, M.leaf, 4); px(E, R, bx0 - 2 + RD(b * 0.2), yTop + 7, M.leaf, 3);   // 旗面叶纹
    for (let r = 0; r < CROWN.length; r++) {                                                                 // 树冠：7 行，顶部随风摆，边缘叶簇错落
      const y = cy - 3 + r, s = r < 3 ? RD(sw * (3 - r) / 3) : 0, w = CROWN[r];
      for (let i = -w; i <= w; i++) { if ((r === 0 || r === CROWN.length - 1) && hash(i, r) < 0.25) continue; const top = r < 2 && i < 0; px(E, R, cx + i + s, y, M.crown, top && hash(i, 7) < 0.5 ? 4 : 0); }
      if (r === 2 || r === 4) { px(E, R, cx - w - 1 + s, y, M.leaf, 3); px(E, R, cx + w + 1 + s, y + 1, M.leaf, 2); }
    }
    for (const [i, r] of [[-3, 1], [1, 2], [-1, 4], [3, 3], [-4, 3]]) px(E, R, cx + i + (r < 3 ? RD(sw * (3 - r) / 3) : 0), cy - 3 + r, M.leaf, P.gem >= 2 ? 4 : 3);   // 冠里的亮叶（蓄力时发光）
  }
  // 候选部件：翼耳（精灵叶片护耳，黑铁卫同款）——3 格宽亮银叶片向后上方斜伸；grown = 缠藤 + 尖端再冒出一片大叶（翠盾）
  const WING = [[3, -1, 0], [2, -2, 0], [1, -2, 0], [0, -3, -1], [-1, -3, -1], [-2, -4, -2], [-3, -4, -3], [-4, -4, -4]];
  const WVINE = [[0, 2], [-1, 1], [-2, 1], [-2, 0], [-3, -1], [-3, -2]], WLEAF = [[-5, -5], [-4, -5], [-5, -6], [-6, -6], [-6, -7]];
  function drawWing(R, far, m, v, lf) {
    const ox = R.hx0 - 1 + (far ? 3 : 0), oy = R.htop - (far ? 1 : 0);
    part();
    for (const [dy, a, b] of WING) for (let x = a; x <= b; x++) px(E, R, ox + x, oy + dy, m, 0);
    for (const [dx, dy] of WVINE) px(E, R, ox + dx, oy + dy, v, 0);
    for (const [dx, dy] of WLEAF) px(E, R, ox + dx, oy + dy, lf, dx === -6 && dy === -7 ? 4 : 0);
  }
  // 候选部件：活木塔盾（尖顶塔盾的翠盾版）——11×16，黑铁框 + 铆钉，翠玉活木盾面带淡绿叶脉，顶边三根木刺各抽一片嫩叶，盾心翠玉花（开合 3 档 × 发光 5 档）
  const SH_W = 5, SH_T = -8, SH_B = 7;
  function drawShield(T, lv, bloom) {
    part();
    for (let v = SH_T; v <= SH_B; v++) for (let x = -SH_W; x <= SH_W; x++) px(E, T, x, v, v === SH_T || v === SH_B || Math.abs(x) === SH_W ? M.iron : M.face, 0);
    for (const x of [-SH_W, 0, SH_W]) for (let k = 1; k <= (x ? 3 : 4); k++) px(E, T, x, SH_T - k, M.wood, k === (x ? 3 : 4) ? 4 : 0);   // 三根木刺（中间高 1 格）
    px(E, T, -SH_W - 1, SH_T - 3, M.leaf, 4); px(E, T, -SH_W - 1, SH_T - 4, M.leaf, 3); px(E, T, SH_W + 1, SH_T - 3, M.leaf, 3); px(E, T, SH_W + 1, SH_T - 4, M.leaf, 2);   // 木刺嫩叶
    px(E, T, 1, SH_T - 5, M.leaf, 4); px(E, T, 1, SH_T - 4, M.leaf, 3); px(E, T, -1, SH_T - 3, M.leaf, 3);
    for (const [x, v] of [[-SH_W, -6], [SH_W, -6], [-SH_W, 5], [SH_W, 5]]) px(E, T, x, v, M.iron, 4);   // 铆钉
    for (let v = SH_T + 2; v <= SH_B - 2; v++) if (Math.abs(v) > 2) px(E, T, 0, v, M.leaf, 3);        // 叶脉：中脉 + 两道人字（翠盾换成淡绿活木纹）
    for (const v0 of [-6, 2]) for (let k = 1; k <= 3; k++) { px(E, T, -k, v0 + k, M.leaf, 2); px(E, T, k, v0 + k, M.leaf, 2); }
    const g = M.gem, w = M.glow;                                                                         // 翠玉花：花心 + 十字花瓣（半开起）+ 斜花瓣（全开）
    const C = [[g, 4], [w, 2], [w, 3], [w, 3], [g, 1]][lv], X = lv === 4 ? [g, 1] : bloom === 0 ? [g, 2] : lv >= 3 ? [w, 2] : lv === 2 ? [w, 1] : [g, 3], D = lv >= 3 ? [w, 1] : lv === 2 ? [g, 4] : [g, 3];
    px(E, T, 0, 0, C[0], C[1]); for (const [x, v] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) px(E, T, x, v, X[0], X[1]);
    if (bloom >= 2 && lv < 4) { for (const [x, v] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) px(E, T, x, v, D[0], D[1]); for (const [x, v] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) px(E, T, x, v, X[0], X[1]); }
    if (P.glint && lv < 4) px(E, T, -1, -1, w, 3);
  }
  // 候选部件：藤蔓裹身（死亡：藤从脚下往上一层层裹住全身，lv 1–3）
  function drawVines(lv) {
    const top = [0, -10, -20, -30][lv]; part();
    for (let k = 0; k < 7; k++) { const x0 = -7 + k * 3; for (let y = 0; y >= top + (k & 1) * 3; y--) { const x = x0 + RD(Math.sin(y * 0.7 + k) * 1.2); px(E, parts.FREE, x, y, M.vine, 0); if (((y + k * 5) % 5) === 0) px(E, parts.FREE, x + 1, y, M.leaf, 3); } }
  }
  const onBody = (R, cx, cy) => ({ r0: 0, tx: R.tx + cx, ty: R.ty + cy, rot: R.rot, ox: R.ox, oy: R.oy });
  function drawHero() {
    begin(hero, P.bx, 0); const R = parts.rig(P, BODY), V3 = P.vine >= 3;
    const jade = V3 ? M.vine : M.jade, jadeD = V3 ? M.vineD : M.jadeD, iron = V3 ? M.vine : M.iron, ironD = V3 ? M.vineD : M.ironD;
    drawTree(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: ironD, pauldron: jadeD, trim: ironD, hand: ironD, grip: 'big' });
    const lg = parts.legs(E, R, P, { style: 'greave', mat: iron, matD: ironD });
    part();                                                                                                // 根须抓地（站定的脚）
    if (!lg.bUp && !P.walk) { px(E, R, lg.bx - 3, 0, M.wood, 0); px(E, R, lg.bx - 4, 0, M.wood, 2); px(E, R, lg.bx - 3, -1, M.wood, 0); }
    if (!lg.fUp) { px(E, R, lg.fx + 4, 0, M.wood, 0); px(E, R, lg.fx + 5, 0, M.wood, 2); if (!P.walk) px(E, R, lg.fx - 2, 0, M.wood, 0); }
    const tor = parts.torso(E, R, P, { style: 'plate', mat: jade, belt: M.vine, buckle: M.leaf, emblem: M.leaf, emblemStyle: 'diamond' });
    { const rows = tor.rows, y0 = tor.y0, by = tor.belt, L = rows[0][by - y0], Rr = rows[1][by - y0];         // 藤叶腰带（和躯干同一部件）
      for (let x = L; x <= Rr; x++) { px(E, R, x, by + ((x & 3) === 1 ? -1 : 0), M.vine, 0); if ((x & 3) === 3) px(E, R, x, by - 1, M.leaf, 4); }
      px(E, R, rows[1][0] - 1, y0, M.leaf, 4); px(E, R, rows[1][1] - 2, y0 + 1, M.vine, 0); }
    drawWing(R, 1, M.wingD, M.vineD, M.leafD); drawWing(R, 0, M.wing, M.vine, M.leaf);
    parts.helm(E, R, P, { style: 'great', mat: iron, trim: jade, eye: M.eye });
    parts.arm(E, R, P, { sleeve: 'plate', mat: iron, pauldron: jade, trim: iron, hand: iron, grip: 'big' });
    drawShield(onBody(R, P.shx, P.shy), P.gem, P.bloom);
    if (P.vine) drawVines(P.vine);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let vineT = 9, chargeAcc = 0, leafAcc = 0, lastStep = 0, sprT = 9, sprX0 = 0, sprX1 = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function dust(x, n, spd) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * spd, -4 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
  function leaves(x, y, n, spread) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * spread, y + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 16, 4 + Math.random() * 6, 1.1 + Math.random() * 0.5, R_EL, { g: 10, dragX: 0.4, dragY: 0.5, floor: HY, age0: 0.2 }); }
  function roots(base, len) { for (const [d, l] of [[1, len], [-1, len - 2], [1, len - 5], [-1, len - 6]]) fx.crack(base + d * 2, HY + 1, l, d, R_EL, 1.1); }
  function onEnter(s) {
    if (s !== CAST) return;
    const base = wx(K_CAST.hx + 1);                                    // 根须一齐亮起 + 大圆法阵（罩住自己和身后友军）+ 盾心花爆出一圈叶
    fx.circle(wx(-14), HY, 30, 5, R_EL, 1.15, 1, 0); fx.circle(wx(-14), HY, 20, 3, R_EL, 1.0, -1, 0); roots(base, 16);
    releaseOrbit(40, 90, 0.3, 0.7); burst(wx(K_CAST.hx + 1), wy(K_CAST.hy + 5), 24, 40, 110, 0.35, 0.7, R_EL, 16);
    fx.cross(wx(K_CAST.hx + 1), wy(K_CAST.hy + 5), 7, R_EL, 0.35); dust(base, 6, 30);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'nature', w: 0.95 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SLAM) {                                // 根刺盾砸：盾顶翠弧 + 盾底根刺沿地面扎出
      const cx = wx(P.shx + P.bx);
      fx.slash(wx(5 + P.bx), wy(-24), 15, 0.1, 2.4, R_EL, 0.17, 3, 2);
      fx.wave(cx + SH_W, HY, 1, 9, 3, R_EL, 0.45, 2); fx.crack(cx, HY + 1, 7, 1, R_EL, 0.5); dust(cx, 5, 40);
      burst(cx + SH_W + 2, HY - 6, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(cx + SH_W + 2, HY - 6, 4, R_IMP, 0.2);
      hitDummy(0); sfx('swing', { kind: 'smash', w: 0.95 }); sfx('hit', { mat: 'wood', w: 0.85 });
    }
    if (s === CHARGE && (t === T_ROOT1 || t === T_ROOT2)) { roots(wx(K_CHARGE.hx + 1), t === T_ROOT1 ? 10 : 14); dust(wx(K_CHARGE.hx + 1), 4, 30); }   // 盾底根须向四周伸展（两次）
    if (s === CAST && t === T_VINE) {                                  // 藤蔓把友军连成议会：绿色描边 + 连线 + 叶盾
      vineT = 0; allyFx({ dur: 1.05, outline: R_EL });
      for (const a of allyPoints()) { fx.link(wx(P.gx), wy(P.gy), a.x + 4, a.mid - 4, R_EL, 1.0, 1); burst(a.x + 5, a.mid - 3, 8, 20, 50, 0.25, 0.5, R_EL, 10); }
      sfx('impact', { pal: 'nature', w: 0.55 });
    }
    if (s === RECOVER && t === 0.2) leaves(wx(-8), wy(-40), 6, 10);
    if (s === DEATH && t === T_KNEE) { dust(HX - 2, 10, 30); fx.crack(wx(-6), HY + 1, 6, -1, R_EL, 0.8); fx.crack(wx(4), HY + 1, 6, 1, R_EL, 0.8); shake(0.1, 1); sfx('fall', { w: 0.8 }); }
    if (s === DEATH && t === T_ASH) {                                  // 化成落叶：死亡套件 ash（nature 色阶）+ 地上散落叶片
      poseAt(DEATH, T_ASH - 1 / 12, T_ASH - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('ash', { ramp: R_EL }); leaves(HX, HY - 18, 14, 22);
    }
  }
  const EVENTS = [[], [], [T_SLAM], [T_ROOT1, T_ROOT2], [T_VINE], [0.2], [], [T_KNEE, T_ASH], []];
  function hurtFx(s) {                                                 // 木 + 铁：火花里夹着震落的叶子
    const hx = HX + 2, hy = HY - 18; burst(hx, hy, s === DEATH ? 26 : 16, 50, 130, 0.25, 0.55, R_IMP, 20); leaves(wx(-8), wy(-40), s === DEATH ? 8 : 6, 10);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                            // 叶片旋转汇聚到盾心花
      chargeAcc += dt * (16 + 28 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 13 + Math.random() * 10, a = Math.random() * 6.2832; spawn(K_SPIRAL, wx(P.gx), wy(P.gy), (r - 3.5) / (0.35 + Math.random() * 0.35), 0, 9, R_EL, a, r, -(4 + Math.random() * 3)); }
    }
    if (state === MOVE && P.step !== lastStep) {                       // 落脚：3 颗尘 + 脚底冒 2 棵草芽
      if (P.step !== 0) { sfx('step', { w: 0.95 }); const fx0 = P.step > 0 ? 6 : -5; dust(wx(fx0), 3, 18); sprT = 0; sprX0 = wx(fx0 - 2); sprX1 = wx(fx0 + 3); }
      lastStep = P.step;
    }
    if (state === IDLE) { leafAcc += dt * 0.8; while (leafAcc >= 1) { leafAcc -= 1; leaves(wx(-8), wy(-40), 1, 10); } }   // 偶尔落一片叶
    vineT += dt; sprT += dt;
  }
  function fxReset() { vineT = 9; chargeAcc = 0; leafAcc = 0.35; lastStep = 0; sprT = 9; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  // 叶形小盾 8×9：1 中叶先展开，2 左叶、3 右叶依次展开
  const LEAF = ['...11...', '..1111..', '2.1111.3', '22111133', '22111133', '.211113.', '..1111..', '...11...', '...11...'];
  function fxFront(f12) {
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) {                        // 花心星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 6 : 3 + (f12 & 1);
      for (let r = 3; r <= L; r++) { const c = r <= 3 ? EL[0] : r <= 4 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
    if (sprT < 0.4) {                                                  // 草芽：长出 → 缩回
      const h = sprT < 0.1 ? 1 : sprT < 0.3 ? 2 : 1;
      for (const x of [sprX0, sprX1]) { for (let j = 0; j < h; j++) put(x, HY - j, EL[j === h - 1 ? 1 : 3]); if (h === 2) put(x + 1, HY - 2, EL[2]); }
    }
    if (vineT < 0.95) {
      const late = vineT > 0.65;
      for (const a of allyPoints()) {
        const vh = Math.min(5, RD(vineT * 30));                        // 脚下小藤往上爬
        for (let j = 0; j < vh; j++) { if (late && ((j + f12) & 1)) continue; put(a.x - 3 + (j & 1), HY - j, EL[j === vh - 1 ? 1 : 3]); put(a.x + 3 - (j & 1), HY - j, EL[j === vh - 1 ? 1 : 3]); }
        const x0 = a.x + 3, y0 = a.mid - 9;                              // 叶盾逐片展开
        for (let j = 0; j < 9; j++) for (let i = 0; i < 8; i++) {
          const ch = LEAF[j][i]; if (ch === '.') continue; const k = +ch, t0 = (k - 1) * 0.08; if (vineT < t0) continue; if (late && ((i + j + f12) & 1)) continue;
          const edge = j === 0 || i === 0 || i === 7 || LEAF[j][i - 1] !== ch || LEAF[j][i + 1] !== ch || !LEAF[j + 1] || LEAF[j + 1][i] !== ch;
          put(x0 + i, y0 + j, vineT - t0 < 1 / 12 ? EL[0] : k === 1 && (i === 3 || i === 4) && j > 0 && j < 8 ? EL[1] : edge ? EL[(f12 >> 1) & 1 ? 1 : 2] : EL[3]);
        }
      }
    }
  }

  return {
    name: '翠盾', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.gem, M.glow], HIT_POINT: [3, -18], EVENTS, ALLIES: 'skill',
    deathKit: { mode: 'ash', at: T_ASH },
    SFX: { body: 'armor', how: 'dissolve', pal: 'nature', style: 'buff', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront, hurtFx,
  };
});
