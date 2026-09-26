// 宝玉兽（部队 · 兽人 · 商人 · 优质 · 近战）：矮墩圆滚的貔貅 / 石狮档——约 26 格高、44 格宽（含尾和铜钱串），前后一样圆、腿最短、头大。
// 识别：背上从臀到肩长出三颗由小到大的圆顶玉（高出背线 4 / 5 / 7、之间各留 3 格背线缺口，玉根一排金毛茬，把背线顶成三个圆峰）、额前一支往后弯过头顶的单支玉角、
//   细尾从臀后翘起、尾梢下勾，拴一串 5 枚方孔铜钱（商人读法）；大圆眼 + 白高光、嘴角上翘的笑脸、颊上一道玉色须纹、胸前奶油色围兜。
// 攻击 = 刺（上挑）：低头 → 前探 3 格，用玉角由下往上一挑；技能 = 特性「玉石共鸣」生效的一刻：坐起昂首，三颗玉依次点亮，
//   玉线连到两个友军商人，头顶倍率 ×1.1 → ×1.2 跳两档，三处金币雨 + 玉屑。死亡 = 侧翻肚皮朝上，三颗玉按 大 → 小 崩落滚到地上、铜钱串断绳散落。
// 身体用 parts-beast 的 quad（cat 头放大、无耳、腿塞在躯干下）；本模块自画：jadeDome（背上圆顶玉）、hornSingle（额前后弯单角）、tailHook + coinString（2 格粗细尾 + 尾梢铜钱串）、beckonPaw（招财举爪）、lieLegs（肚皮朝上的四条短柱腿）。
PCD.define('JadeBeast', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_DUST, K_PHYS, K_EMBER, K_RISE, K_BURST,
    spawn, spawnX, burst, ring, shake, flash, fx, fall, sfx, hitDummy, put, scrX, floorGlow, allyPoints, allyFx, bayer } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 元素：玉石共鸣 · 金币（FXI.coin）+ 青玉（自建 jade：白 → 青瓷白 → 玉绿 → 深玉 → 墨玉）─────
  const R_EL = E.fxRamp('jade', ['#ffffff', '#d8fff0', '#8fe0bc', '#3f9a78', '#1a4a3c']), EL = FXR[R_EL];
  const COIN = FXI.coin, CL = FXR[COIN];
  const COINF = E.fxRamp('coinfall', ['#e3a13c', '#e3a13c', '#fff3d4', '#e3a13c', '#8a6a2a']);   // 下落的金币：落下时是 2×2 金块，落地闪一下奶油白再暗成暗金（不再是白方块）
  const JADE = E.ramp(['#0e2a24', '#2a6b56', '#56a88a', '#b4ecd2']);        // 羊脂青玉 [勾线, 暗, 基, 亮]
  const CREAM = [20, 15, 5, 5];                                                  // 奶油暖白（sand 亮段）：吻部、腹线、围兜
  const m = B.mats(E, {
    main: 'sand', muz: CREAM, belly: CREAM, eye: [0, 0, 0, 0], nose: [0, 0, 0, 0],
    rope: 'crimson',
  });
  m.coin = E.defMat('gold', 1, 1);                                              // 铜钱（平涂，逐格给色：1 方孔 · 2 暗边 · 3 金 · 4 亮）
  m.jade = E.defMat(JADE, 1);                                                   // 玉石 / 玉角（发光体，自动明暗）
  m.jlit = E.defMat([JADE[2], EL[2], EL[1], 21], 1, 1);                         // 点亮的玉：平涂，tone 1 玉绿 · 2 亮玉 · 3 青瓷白 · 4 白
  m.jmark = E.defMat(JADE, 1, 1);                                               // 颊上玉色须纹（不发光，平涂）
  m.bib = E.defMat(CREAM, 1, 1);                                                // 胸前奶油色围兜（平涂，tone 3 = 5 奶油）
  m.tuft = E.defMat('gold', 1, 1);                                              // 玉根金毛茬
  // 体型：len 放长到 13、胸臀半径 6（三颗玉之间要各留 3 格背线缺口），头 w8 h7（cat 放大，脸上要放大眼 + 笑嘴 + 须纹），吻部短圆
  const SHAPE = { len: 13, chest: 6, rump: 6, waist: 0, hump: 0, leg: 4, lw: 3, thigh: 3, farDx: -2, stride: 2, lift: 1,
    neck: 4, neckA: 0.95, neckW: 3.6, head: { type: 'cat', w: 10, h: 8, snout: 1.5, snH: 4, tip: 0.75, ear: 'none', earH: 0 }, headA: 0.15,
    tail: 'none', mane: 'none', fur: 0, foot: 'paw', m };
  const o = Q.shape(SHAPE);
  const HX = 68, DUR = DEFAULT_DUR.slice(), hero = new Sprite(104, 64, 52, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 8, 11], rimRamp: EL, rimAll: 1, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'nose', 'ink', 'spec', 'jade', 'jlit', 'jmark', 'bib', 'tuft', 'rope', 'coin']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：lit 已点亮的玉（从后往前数）0–3 · fl 待机里微闪的那颗 0 无 / 1–3 · cs 铜钱串 0 垂着 / 1 竖尾 / 3 断绳散落
  //   cw 铜钱串摆 -1..1 · dd 死亡落地后第几帧（玉石崩落、铜钱散开）0–30
  const EXTRA = [['lit', 0, 3], ['fl', 0, 3], ['cs', 0, 3], ['cw', -1, 1], ['dd', 0, 30]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.lit = 0; P.fl = 0; P.cs = 0; P.cw = 0; P.dd = 0; }
  reset();
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 背上三颗玉（0 = 后 / 小，2 = 前 / 大，大的在肩上）：x0 最左列、rows 从顶往下每行宽（半球：顶 2–3 格平顶，两侧逐行放宽）─────
  //   列：小 -12..-9 · 缺口 -8..-4 · 中 -3..0 · 缺口 1..5 · 大 6..10（勾线各占 1 格，剪影里缺口 ≥ 3 格）；高出背线 4 / 5 / 7
  const GEMS = [{ x0: -12, rows: [2, 4, 4, 4] }, { x0: -3, rows: [2, 4, 4, 4, 4] }, { x0: 6, rows: [3, 5, 5, 5, 5, 5, 5] }];
  for (const G of GEMS) { G.w = G.rows[G.rows.length - 1]; G.c = G.x0 + (G.w - 1) / 2; G.h = G.rows.length; }
  const LAND = [-26, -20, 20];                                                  // 死亡崩落后滚到的位置（小 / 中往后，大往前）
  const DROP0 = [4, 2, 0];                                                      // 大 → 小依次崩落：落地后第几帧开始飞
  const COINS = [-9, -11, -13, -15, -7];                                        // 断绳后铜钱散落的位置
  function gemBase(rg, k) { let b = 0; const G = GEMS[k]; for (let x = G.x0; x < G.x0 + G.w; x++) { const s = Q.span(rg, o, x); if (s) b = Math.min(b, s[0]); } return b || -12; }
  function gemLv(k) { if (P.gem === 4) return 4; if (k < P.lit) return P.gem; return P.fl === k + 1 ? 1 : 0; }
  function gemTop(rg, k) { return [GEMS[k].c, gemBase(rg, k) - GEMS[k].h]; }
  // 死亡：第 k 颗玉从翻倒的身子底下崩出 → [x, 底 y, 1 飞 / 2 落地]
  function gemFly(rg, k) {
    const f = P.dd - 1 - DROP0[k]; if (!P.dd || f < 0) return null;
    const q = clamp01(f / 4), x0 = GEMS[k].c, y0 = -1, x1 = LAND[k] + (f >= 5 ? Math.sign(LAND[k]) : 0);
    return [R(x0 + (x1 - x0) * q), R(y0 * (1 - q) - Math.sin(q * PI) * 6), q >= 1 ? 2 : 1];
  }

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    P.fl = lp >= 0.4 && lp < 0.5 ? 1 : lp >= 0.8 && lp < 0.9 ? 2 : lp >= 1.2 && lp < 1.3 ? 3 : 0;   // 三颗玉 后 → 中 → 前 各微闪 1 帧
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                       // 待机个性：招财举爪，弯腕招两下，铜钱串叮地一晃
      const k = f12of(lp - 1.6); P.paw = k === 0 ? 2 : (k & 1) ? 3 : 2; P.cw = (k & 1) ? 1 : -1; P.bob = 0; P.tail = 1;
    }
  }
  function sitPose(q) { P.pitch = R(3 * q); P.crouch = R(2 * q); P.head = -R(q); }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                    // 短腿碎步颠跑：每步颠 1 格、头和玉角点头、铜钱串反向甩
      Q.anim.walk(P, tq); P.bob = P.gf & 1 ? -1 : 1; P.cw = [1, 0, -1, 0][P.gf];
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                // 刺（上挑）：低头 → 前探 3 格，玉角由下往上一挑
      if (tq < 1 / 12 - 1e-6) { P.crouch = 1; P.head = 1; P.cw = -1; }
      else if (tq < 2 / 12 - 1e-6) { P.crouch = 1; P.head = 3; P.pitch = -2; P.bx = -1; P.tail = 1; P.cw = -1; }
      else if (tq < 4 / 12 - 1e-6) { P.bx = 3; P.head = -1; P.crouch = 1; P.pitch = 0; P.reach = 1; P.tail = -1; P.cw = 1; P.lit = 3; P.gem = 1; }
      else if (tq < 0.45) { P.bx = 3; P.head = 0; P.crouch = 1; P.reach = 1; P.cw = 1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); P.bx = R(3 * (1 - q)); P.bob = q > 0.3 && q < 0.7 ? -1 : 0; P.cw = q < 0.6 ? -1 : 0; }
    } else if (st === CHARGE) {                                                // 坐起昂首，尾竖起摇铜钱，三颗玉 0 / 0.45 / 0.9 s 依次点亮
      sitPose(ease.inOut(clamp01(tq / 0.35)));
      P.cs = 1; P.cw = (f12 & 1) ? 1 : -1; P.tail = 1;
      P.lit = tq >= 0.9 ? 3 : tq >= 0.45 ? 2 : 1; P.gem = tq >= 1.1 ? 2 : 1; P.rim = tq < 0.7 ? 1 : 2;
    } else if (st === CAST) {                                                  // 三颗玉同时爆闪，定格
      sitPose(1); P.cs = 1; P.cw = (f12 & 1) ? 1 : -1; P.tail = 2; P.lit = 3; P.gem = tq < 2 / 12 ? 3 : 2; P.rim = tq < 2 / 12 ? 3 : 2; P.jaw = tq < 0.25 ? 1 : 0;
    } else if (st === RECOVER) {                                               // 玉 3 → 2 → 1 → 0 渐暗，落回四足
      const q = ease.inOut(clamp01(tq / 0.6)); sitPose(1 - q);
      P.lit = tq < 0.15 ? 3 : tq < 0.3 ? 2 : tq < 0.45 ? 1 : 0; P.gem = tq < 0.15 ? 2 : 1; P.rim = tq < 0.3 ? 1 : 0; P.cs = tq < 0.3 ? 1 : 0; P.cw = tq < 0.45 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.35) P.cw = 1; }
    } else if (st === DEATH) {                                                 // 侧翻肚皮朝上：落地那一刻玉石崩落、铜钱串断绳
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        Q.anim.death(P, d, f12, (PP, dd) => { PP.dd = dd >= 0.66 - 1e-6 ? Math.min(30, f12of(dd - 0.66) + 1) : 0; });
        P.cw = d < 0.5 ? 1 : 0;
        if (P.dd) { P.cs = 3; P.lit = 3; const k = P.dd - 1; P.gem = k < 6 ? ((k >> 1) & 1 ? 0 : 2) : 4; }   // 落地的玉和玉角闪 3 次后熄灭
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    const g = gemTop(rig, 2); P.gx = R(g[0]) + P.bx; P.gy = g[1] + 1;
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：jadeDome（圆顶宝石：rows 给每行宽，顶 2–3 格平顶、两侧逐行放宽成半球；按 lv 0 暗 / 1 亮 / 2 很亮 / 3 爆闪 / 4 熄灭换玉色；
  //   玉根一排金毛茬；onBody 1 = 长在背上（底下补到背线），0 = 落在地上）
  function dome(k, cx, base, lv, onBody) {
    E.part();
    const G = GEMS[k], rows = G.rows, h = rows.length, x0 = R(cx - (G.w - 1) / 2);
    for (let x = x0; x < x0 + G.w; x++) {
      let bot = base - 1; if (onBody) { const s = Q.span(rig, o, x); bot = s ? s[0] - 1 : base - 1; }   // 长在坡上的列往下补到背线
      for (let y = base - h; y <= bot; y++) {
        const j = Math.min(h - 1, y - (base - h)), w = rows[j], a = x0 + ((G.w - w) >> 1), b = a + w - 1; if (x < a || x > b) continue;
        const edge = j === 0 || x === a || x === b, t0 = (j === 1 && x === a + 1) || (j === 0 && x === a) ? 4 : 0;   // 左上一格高光
        if (lv === 4) U.dot(E, x, y, m.jade, edge ? 1 : 2);
        else if (lv === 3) U.dot(E, x, y, m.jlit, edge ? 3 : 4);
        else if (lv === 2) U.dot(E, x, y, m.jlit, t0 || (edge ? 2 : 3));
        else if (lv === 1) U.dot(E, x, y, edge && !t0 ? m.jade : m.jlit, t0 || (edge ? 0 : 2));
        else U.dot(E, x, y, m.jade, t0);
      }
      U.dot(E, x, bot + 1, m.tuft, (x & 1) ? 3 : 4);                               // 玉根一排金毛茬（压在背线上）
    }
  }
  function domes() {
    if (P.dd || rig.lie === 2) return;                                          // 翻成肚皮朝上：玉在身子底下
    for (let k = 0; k < 3; k++) dome(k, GEMS[k].c, gemBase(rig, k), gemLv(k), 1);
  }
  function droppedGems() {                                                      // 崩落中 / 落在地上的玉
    if (!P.dd) return;
    for (let k = 2; k >= 0; k--) {
      const g = gemFly(rig, k), lv = P.gem;
      if (g) dome(k, g[0], g[1], lv, 0);                                        // 还没崩出来的压在翻过来的身子底下
    }
  }
  // 候选部件：hornSingle（额前单支后弯角：头部局部坐标折线，从额心 2 格粗向上、再向后弯过头顶，梢 1 格，角尖一格亮白；材质按发光档换）
  const HORN = [[3.0, 0.8, 2], [3.1, -1.2, 2], [2.8, -2.8, 2], [2.2, -3.8, 1], [1.4, -4.1, 1]];   // [u, v 相对头顶, 粗]
  function horn() {
    E.part();
    const F = Q.headFrame(rig, o, P.jaw), Hh = F.Hh, lv = P.lit >= 3 ? P.gem : 0;
    const mat = lv === 4 ? m.jade : lv >= 1 ? m.jlit : m.jade, tone = lv === 4 ? 2 : lv === 3 ? 4 : lv === 2 ? 3 : lv === 1 ? 2 : 0;
    for (let i = 0; i + 1 < HORN.length; i++) {
      const a = F.at(HORN[i][0], -Hh + HORN[i][1]), b = F.at(HORN[i + 1][0], -Hh + HORN[i + 1][1]);
      U.seg(E, a[0], a[1], b[0], b[1], HORN[i][2], mat, tone);
    }
    const L = HORN[HORN.length - 1], t = F.at(L[0], -Hh + L[1]);
    U.dot(E, t[0], t[1], lv === 4 ? m.jade : m.jlit, lv === 4 ? 2 : 4);          // 角尖一格玉白
  }
  function face() {                                                             // 和头同一个部件：大圆眼 + 白高光、上翘笑嘴、颊上玉色须纹
    if (rig.lie === 2) return;
    const F = Q.headFrame(rig, o, P.jaw), e = rig.eye, ex = R(e[0]), ey = R(e[1]);
    if (!P.eyes) { U.dot(E, ex - 1, ey, m.eye, 3); U.dot(E, ex, ey, m.eye, 3); U.dot(E, ex - 1, ey + 1, m.eye, 3); U.dot(E, ex, ey + 1, m.eye, 3); U.dot(E, ex - 1, ey, m.spec, 3); }
    if (!P.jaw) {                                                               // 笑嘴：抹掉骨架画的长嘴线，只在吻部画一道短嘴线，后端往上翘
      const vm = F.prof(F.uc)[2];
      for (let u = F.uc; u <= F.uT - 0.8; u += 0.5) { const c = F.at(u, vm + 0.5); U.dot(E, c[0], c[1], u > F.W * 0.75 ? m.muz : m.limb, 0); }
      const a = F.at(F.uT - 1.3, vm + 0.5), b = F.at(F.uT - 2.3, vm + 0.5), c = F.at(F.uT - 3.1, vm - 0.4);
      U.dot(E, a[0], a[1], m.muz, 1); U.dot(E, b[0], b[1], m.muz, 1); U.dot(E, c[0], c[1], m.muz, 1);
    }
    const w0 = F.at(1.0, 1.4), w1 = F.at(2.0, 1.1); U.dot(E, w0[0], w0[1], m.jmark, 3); U.dot(E, w1[0], w1[1], m.jmark, 4);   // 颊上玉色须纹
  }
  function bib() {                                                              // 和躯干同一个部件：胸前奶油色围兜（下沿波浪）
    if (rig.lie === 2) return;
    const C1 = rig.C1;
    for (let x = R(C1.x + 1); x <= R(C1.x + C1.r + 1); x++) {
      const s = Q.span(rig, o, x); if (!s) continue;
      const y0 = Math.max(s[0] + 2, R(C1.y - 2)), y1 = s[1] - 1 - ((x & 1) ? 0 : 1);
      for (let y = y0; y <= y1; y++) U.dot(E, x, y, m.bib, y === y0 ? 4 : 3);
    }
  }
  // 候选部件：tailHook（2 格粗的细尾：从臀后长出，先往后上翘、尾梢往下勾，好让尾梢挂东西离地够高；sw 甩动越往梢越大）
  //   返回尾梢挂点（绳结在它下面一格）
  const TAIL = [[0, 0], [-2, -1.6], [-4, -3.6], [-5.6, -5.6], [-6.8, -7], [-7.6, -6.8]];
  function tailPts() {
    const C2 = rig.C2, rx = C2.x - C2.r * 0.85, ry = C2.y - C2.r * 0.1;
    if (rig.lie === 2) return TAIL.map((p, i) => [rx + p[0] * 1.1 - i * 0.2, Math.min(-0.5, ry + i * 0.9)]);   // 侧躺：尾贴地往后
    const up = P.cs === 1 ? 1.5 : 0, sw = (P.tail | 0) * 0.5;
    return TAIL.map((p, i) => { const q = i / (TAIL.length - 1); return [rx + p[0] - sw * q, ry + p[1] * (1 + up * 0.25) - Math.abs(sw) * q * 0.3]; });
  }
  function tail2() {
    E.part();
    const T = tailPts();
    for (let i = 0; i + 1 < T.length; i++) U.seg(E, T[i][0], T[i][1], T[i + 1][0], T[i + 1][1], i < T.length - 2 ? 2 : 1, m.limb, 0);
    const t = T[T.length - 1]; return [R(t[0]), R(t[1])];
  }
  // 候选部件：coinString（尾梢朱红绳拴的一串方孔铜钱：每枚 3×2 金块、上排正中一格暗色方孔，钱与钱之间露一格红绳；
  //   最后两枚挨着（5 枚能数出 4 枚以上）；cw 摆动越往下越大）
  function coinString(tx, ty) {
    E.part();
    U.dot(E, tx, ty + 1, m.rope, 3);                                            // 绳结
    if (P.cs === 3) return;
    let y = ty + 2;
    for (let i = 0; i < 5; i++) {
      const x = tx + R(P.cw * (i + 1) * 0.45);
      U.dot(E, x - 1, y, m.coin, 4); U.dot(E, x, y, m.coin, 1); U.dot(E, x + 1, y, m.coin, 3);            // 上排：亮 · 方孔 · 金
      U.dot(E, x - 1, y + 1, m.coin, 3); U.dot(E, x, y + 1, m.coin, 3); U.dot(E, x + 1, y + 1, m.coin, 2);   // 下排：金 · 金 · 暗
      y += 2;
      if (i < 3) { U.dot(E, tx + R(P.cw * (i + 1.5) * 0.45), y, m.rope, 4); y += 1; }   // 钱与钱之间一格红绳
    }
  }
  function coinsOnGround(tx) {                                                  // 断绳后散落的铜钱（2 格一枚，飞 3 帧落地）
    if (P.cs !== 3 || !P.dd) return;
    E.part();
    for (let i = 0; i < COINS.length; i++) {
      const q = clamp01((P.dd - 1 - (i >> 1)) / 3), x = R(tx + (COINS[i] - tx) * q), y = R(-Math.sin(q * PI) * 3) - (q < 1 ? 1 : 0);
      U.dot(E, x, y, m.coin, 4); U.dot(E, x + 1, y, m.coin, (i & 1) ? 1 : 3); U.dot(E, x + 2, y, m.coin, 2);
    }
  }
  // 腿塞在躯干下面：只往空像素里画（已画的躯干不被覆盖）。远侧腿并进躯干这个部件（整条暗一级、不单独描上缘），
  //   近侧腿各是一个部件（只在和躯干交界处留一行分界线）
  // 候选部件：fillUnder（把一个部件函数包成「只填空像素」「可选不开新部件」的画法）
  const EU = Object.create(E), EN = Object.create(E);
  const empty = (x, y) => { const X = R(x) + P.bx + hero.ox, Y = R(y) + hero.oy; return X < 0 || Y < 0 || X >= hero.w || Y >= hero.h || !hero.mat[Y * hero.w + X]; };
  EU.sp = EN.sp = (x, y, mm, t) => { if (empty(x, y)) E.sp(x, y, mm, t); };
  EU.part = () => {};
  // 招财举爪：近侧前爪从胸前抬到脸侧（沙色爪掌 + 奶油色趾尖，爪尖在眼睛那一行、贴在眼睛前面、吻尖后面），paw 3 手腕往下弯 2 格
  function beckonPaw() {
    E.part();
    const C1 = rig.C1, ex = R(rig.eye[0]), ey = R(rig.eye[1]), bend = P.paw === 3;
    const px = ex + 1, py = bend ? ey + 2 : ey;                                 // 爪掌左上角
    U.seg(E, C1.x + 2, C1.y + 2, px, ey + 5, 3, m.limb, 0); U.seg(E, px, ey + 5, px + 1, py + 2, 2, m.limb, 0);   // 前臂
    for (let y = py; y <= py + 2; y++) for (let x = px; x <= px + 2; x++) {
      const tip = bend ? (y === py + 2 && x === px + 2) : (y === py && x === px + 2);
      const toe = bend ? x === px + 2 : y === py;                              // 奶油色趾尖：立起时在上排，招下去时在前列
      U.dot(E, x, y, toe || tip ? m.belly : m.limb, tip ? 4 : toe ? 3 : (y === py || x === px) ? 4 : 0);
    }
    if (bend) U.dot(E, px + 3, py + 2, m.belly, 3); else U.dot(E, px + 1, py - 1, m.belly, 4);   // 爪尖：招下去朝前 / 立起朝上
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lie = rig.lie === 2, bk = !lie && P.paw >= 2;
    const [tx, ty] = tail2(); coinString(tx, ty);
    Q.body(E, rig, P, o); bib();
    if (!lie) {
      Q.leg(EU, rig, P, o, 0); Q.leg(EU, rig, P, o, 1);                         // 远侧两条：并进躯干，只露出腹下
      Q.leg(EN, rig, P, o, 2); if (!bk) Q.leg(EN, rig, P, o, 3);                // 近侧两条：塞在躯干下，交界一行分界线
    }
    domes();
    Q.head(E, rig, P, o); face();
    horn();
    if (bk) beckonPaw();
    if (lie) lieLegs();
    droppedGems(); coinsOnGround(tx);
  }
  // 侧躺（肚皮朝上）：四条腿是 2 格粗的竖直短柱，从奶油色肚皮上朝天伸出
  function lieLegs() {
    const C1 = rig.C1, C2 = rig.C2, s = (x) => Q.span(rig, o, x);
    E.part();
    for (let x = R(C2.x - 2); x <= R(C1.x + 3); x++) { const sp = s(x); if (!sp) continue; for (let y = sp[0]; y <= Math.min(sp[1], sp[0] + 1); y++) U.dot(E, x, y, m.belly, y === sp[0] ? 4 : 3); }
    const LX = [[R(C2.x - 1), 1], [R(C2.x + 2), 0], [R(C1.x - 1), 1], [R(C1.x + 2), 0]];
    for (const [x, far] of LX) {
      E.part(); const sp = s(x); if (!sp) continue; const top = sp[0] - (far ? 4 : 5);
      for (let y = top; y < sp[0] + 1; y++) { U.dot(E, x, y, far ? m.far : m.limb, 0); U.dot(E, x + 1, y, far ? m.far : m.limb, 0); }
      U.dot(E, x, top, m.belly, 4); U.dot(E, x + 1, top, m.belly, 3);           // 奶油色脚垫
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ALLY_X = [HX - 34, HX - 48];                                       // 让开尾梢铜钱串
  let soulAcc = 0, chipAcc = 0, lastGf = -9, nStep = 0;
  const gemScr = (k) => { const g = gemTop(rig, k); return [scrX(R(g[0]) + P.bx), HY + g[1]]; };
  const headScr = () => [scrX(R(rig.head.x) + P.bx), HY + R(rig.head.y)];
  function lightGem(k) {                                                       // 点亮一颗玉：1 格小冲击环 + 4 颗玉屑飘起
    const [x, y] = gemScr(k); ring(x, y + 2, 0, R_EL);
    for (let i = 0; i < 4; i++) spawn(K_EMBER, x - 1 + Math.random() * 3, y, (Math.random() - 0.5) * 10, -14 - Math.random() * 12, 0.6 + Math.random() * 0.4, R_EL);
  }
  function jadeChips(x, y, n) { for (let i = 0; i < n; i++) { const a = -PI * (0.1 + Math.random() * 0.8), s = 30 + Math.random() * 50; spawnX(K_PHYS, x, y, Math.cos(a) * s, Math.sin(a) * s, 0.6 + Math.random() * 0.4, R_EL, { g: 200, floor: HY }); } }
  function coinRain(x, y) {                                                    // 5 枚金币从头顶落下（落地变闪烁金点）+ 10 颗玉屑外爆
    for (let i = 0; i < 5; i++) fall(x - 4 + i * 2 + (Math.random() - 0.5), y - 12 - i * 5 - Math.random() * 3, (Math.random() - 0.5) * 6, 10, HY, COINF, 2);
    jadeChips(x, y + 2, 10);
  }
  function connect(i) {                                                         // 第 i 条玉线连上友军：玉边 + 金币弹出 + 倍率跳档
    const p = allyPoints()[i]; if (!p) return;
    allyFx({ dur: 1.4, outline: R_EL, tint: COIN });
    spawnX(K_PHYS, p.x, p.top - 3, 0, -46, 0.8, COIN, { g: 150, floor: p.top - 1, sz: 2 });
    burst(p.x, p.top - 2, 6, 15, 40, 0.2, 0.4, COIN, 6);
    fx.cross(p.x, p.top - 4, 3, COIN, 0.2, 2);
    shake(0.1, 1); sfx('impact', { pal: 'coin', w: 0.3 + i * 0.1 });
  }
  function onEnter(s) {
    E.allies(null);
    if (s === CHARGE) {
      poseAt(CHARGE, 0, E.simT); lightGem(0);
      for (const p of allyPoints()) spawn(K_RISE, p.x, HY - 1, 0, -10, 0.6, COIN);   // 友军脚下各冒一颗小金点
    }
    if (s === CAST) {                                                           // 三颗玉同时爆闪 + 十字星芒；最大那颗朝两个友军拉玉线
      poseAt(CAST, 0, E.simT);
      for (let k = 0; k < 3; k++) { const [x, y] = gemScr(k); fx.cross(x, y + 1, k === 2 ? 4 : 2, R_EL, 0.25, 2); }
      const [gx, gy] = gemScr(2), A = allyPoints();
      if (A[0]) fx.link(gx, gy + 1, A[0].x, A[0].top - 2, R_EL, 1.0, 1);
      ring(scrX(R(rig.C2.x * 0.2 + rig.C1.x * 0.8) + P.bx), gy + 3, 1, R_EL);
      jadeChips(gx, gy, 8);
      shake(0.28, 2); flash(0.05);
    }
  }
  const T_HIT = 2 / 12, T_C1 = 1 / 12, T_L2 = 0.12, T_C2 = 0.2, T_RAIN = 0.3, T_LIGHT = [0.45, 0.9], T_LAND = INCOMING + 0.66;
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                          // 玉角上挑：约 100° 上挑短弧 + 命中星芒
      const [hx, hy] = headScr();
      fx.slash(hx - 2, hy + 3, 10, 2.4, 0.65, R_EL, 2 / 12, 2, 2);   // 约 100° 由前下往上的挑弧
      const x = DUMMY_X - 4, y = HY - 16;
      fx.cross(x, y, 3, 'impact', 0.2, 2); burst(x, y, 6, 20, 60, 0.15, 0.35, FXI.impact, 10);
      for (let i = 0; i < 2; i++) spawn(K_EMBER, x + i * 2, y, 10, -20, 0.5, R_EL);
      hitDummy(0); sfx('swing', { kind: 'thrust', w: 0.3 }); sfx('hit', { mat: 'flesh', w: 0.3 });
    }
    if (s === CHARGE && t === T_LIGHT[0]) lightGem(1);
    if (s === CHARGE && t === T_LIGHT[1]) lightGem(2);
    if (s === CAST && t === T_C1) connect(0);
    if (s === CAST && t === T_L2) { const [gx, gy] = gemScr(2), A = allyPoints(); if (A[1]) fx.link(gx, gy + 1, A[1].x, A[1].top - 2, R_EL, 0.9, 1); }
    if (s === CAST && t === T_C2) connect(1);
    if (s === CAST && t === T_RAIN) {                                           // 三处金币雨
      const [hx, hy] = headScr(); coinRain(hx - 2, hy - 8);
      for (const p of allyPoints()) coinRain(p.x, p.top - 2);
      shake(0.12, 1);
    }
    if (s === DEATH && t === T_LAND) {                                          // 翻倒落地：尘土 + 玉屑 + 铜钱叮当
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 14 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4 + Math.random() * 0.4, FXI.dust);
      jadeChips(scrX(P.bx), HY - 6, 8);
      for (let i = 0; i < 4; i++) spawnX(K_PHYS, scrX(-10 + P.bx), HY - 3, (Math.random() - 0.5) * 50, -30 - Math.random() * 20, 0.6, COIN, { g: 220, floor: HY });
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
  }
  const EVENTS = [[], [], [T_HIT], T_LIGHT, [T_C1, T_L2, T_C2, T_RAIN], [], [], [T_LAND], []];
  function stepFX(dt, state, stT) {
    if (state === MOVE && P.gf !== lastGf) {                                    // 碎步：每个接触帧 1 颗尘，隔一步掉 1 颗金点
      if (P.gf === 0 || P.gf === 2) {
        nStep++; sfx('step', { w: 0.3 });
        spawn(K_DUST, scrX(P.gf === 0 ? 7 : -5) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.3, FXI.dust);
        if (nStep & 1) spawn(K_DUST, scrX(-3), HY - 1, 0, 0, 0.35, COIN);
      }
      lastGf = P.gf;
    }
    if ((state === CHARGE || state === CAST) && P.lit) {                        // 已点亮的玉飘起玉屑
      chipAcc += dt * (4 + P.lit * 3);
      while (chipAcc >= 1) { chipAcc -= 1; const [x, y] = gemScr(Math.floor(Math.random() * P.lit)); spawn(K_EMBER, x - 1 + Math.random() * 3, y, (Math.random() - 0.5) * 8, -12 - Math.random() * 10, 0.5 + Math.random() * 0.4, R_EL); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); } }
  }
  function fxReset() { soulAcc = 0; chipAcc = 0; lastGf = -9; nStep = 0; E.allies(null); }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie && P.dq < 1) floorGlow(scrX(P.gx), P.rim, EL, f12);   // 地面隔点映玉光
  }
  // 倍率数字：3×5 像素字「×1.1」「×1.2」，白芯金边（coin 色阶），跳档帧上移 1 格、边提亮；×1.2 多描一圈（放大 1 格）
  const GLY = { x: ['...', '#.#', '.#.', '#.#', '...'], 1: ['.#.', '##.', '.#.', '.#.', '###'], '.': ['.', '.', '.', '.', '#'], 2: ['##.', '..#', '.#.', '#..', '###'] };
  function textGrid(str) {
    let w = 0; for (const ch of str) w += GLY[ch][0].length + 1; w -= 1;
    const g = new Uint8Array(w * 5); let x0 = 0;
    for (const ch of str) { const G = GLY[ch]; for (let y = 0; y < 5; y++) for (let x = 0; x < G[y].length; x++) if (G[y][x] === '#') g[y * w + x0 + x] = 1; x0 += G[0].length + 1; }
    return { w, g };
  }
  const TX = [textGrid('x1.1'), textGrid('x1.2')];
  function drawText(T, cx, y0, core, edge, edge2, dq) {
    const x0 = cx - (T.w >> 1), on = (x, y) => x >= 0 && y >= 0 && x < T.w && y < 5 && T.g[y * T.w + x] === 1;
    const near = (x, y, r) => { for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) if ((i || j) && Math.abs(i) + Math.abs(j) <= r + (r > 1 ? 1 : 0) && on(x + i, y + j)) return true; return false; };
    const ok = (x, y) => !dq || bayer(x0 + x + 64, y0 + y) >= dq;
    for (let y = -2; y < 7; y++) for (let x = -2; x < T.w + 2; x++) {
      if (!ok(x, y)) continue;
      if (on(x, y)) put(x0 + x, y0 + y, core);
      else if (near(x, y, 1)) put(x0 + x, y0 + y, edge);
      else if (edge2 >= 0 && near(x, y, 2)) put(x0 + x, y0 + y, edge2);
    }
  }
  function fxFront(f12) {
    const s = E.state, t = E.stT; if (P.dq >= 1) return;
    const [hx, hy] = headScr(), ty = hy - 18;
    if (s === CAST && t >= T_C1) {
      const two = t >= T_C2, pop = two ? t - T_C2 < 1 / 12 + 1e-6 : t - T_C1 < 1 / 12 + 1e-6;
      drawText(TX[two ? 1 : 0], hx - 1, ty - (pop ? 1 : 0), CL[0], pop ? CL[1] : CL[2], two ? (pop ? CL[2] : CL[3]) : -1, 0);   // 跳档那一帧金边提亮成奶油白
    } else if (s === RECOVER) {
      const rise = R(4 * clamp01(t / 0.5)), dq = clamp01((t - 0.3) / 0.35);
      if (dq < 1) drawText(TX[1], hx - 1, ty - rise, CL[0], CL[2], CL[3], dq);
    }
    if (s === CHARGE && P.lit) {                                                // 刚点亮的那颗玉：小十字闪
      const k = P.lit - 1, lt = k === 0 ? t : t - T_LIGHT[k - 1];
      if (lt < 0.25 && (f12 & 1) === 0) { const [x, y] = gemScr(k); put(x, y - 2, EL[0]); put(x - 2, y + 1, EL[1]); put(x + 2, y + 1, EL[1]); put(x, y - 3, EL[2]); }
    }
  }

  return {
    name: '宝玉兽', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.jade, m.jlit], HIT_POINT, EVENTS, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'beast', how: 'topple', pal: 'coin', style: 'buff', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
