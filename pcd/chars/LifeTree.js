// 生命树（部队 · 虚空 · 圣骑士 · 史诗）：北极熊的繁茂分支。巨型树熊：熊身更长更平，白毛变成白桦树皮（墨色横纹），腿粗短像树桩、脚是向外张开的盘根；
// 背上满冠大树（圆冠宽 20 格、高出背线约 14 格，挂着发光的淡金果）；颈下与下巴垂着藤蔓苔须；保留左耳缺角 + 鼻梁裂痕（裂痕里长出一根嫩芽）。
// 攻击：一只前脚踏地，地面在假人脚下冒出根须横扫。技能「奉献」：果实一颗颗点亮、根须沿地面向身后蔓延到友军脚下、金绿光点汇入树冠；
// 施放：树冠一抖，发光花瓣向后上方抛洒，藤线从树冠连到每个友军；命中：友军脚下十字光点上升 + 小冲击环、被照亮描边。死亡：树冠变黄凋落 → 僵直跪倒成枯木 → 裂成木块落地化灰。
PCD.define('LifeTree', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, death, allyPoints, allyFx } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.holy, EL = FXR[R_EL], R_LEAF = FXI.nature, LF = FXR[R_LEAF];                 // 奉献 · 晨露金绿：holy 为主，叶片粒子借 nature
  const R_BARK = fxRamp('birchBark', [21, 17, 60, 59, 8]);                                     // 桦树皮屑（受击）
  const R_AUTUMN = FXI.earth;                                                                  // 枯叶：奶油 → 沙黄 → 暗沙 → 木 → 深木
  const ROOT = [20, 19, 16];                                                                   // 根须特效用的木色（暗 → 亮）
  const m = B.mats(E, {
    main: 'pale', claw: 'wood', eye: [0, 0, 0, 0], nose: [0, 0, 0, 0],                       // 白桦树皮身体、木色爪、墨眼墨鼻
    root: 'wood', rootF: [0, 20, 20, 19], trunk: [20, 59, 60, 17], crownB: 'moss', crownF: 'green', dry: 'sand', vine: 'moss', sprout: 'green', scar: [42, 42, 43, 43],
    fruit: [61, 14, 5, 51], fruitG: [5, 51, 21, 21],                                          // 淡金果：暗 → 亮
  });
  m.body = E.defMat('pale', 3);                                                               // 大块树皮：背光侧暗边 3 格，下半身读得出暗部
  const SHAPE = { len: 18, chest: 5.5, rump: 5, waist: 0.1, hump: 1.5, leg: 4, lw: 3, thigh: 3, farDx: -2, stride: 2, lift: 2,
    neck: 2, neckA: -0.3, neckW: 3.5, head: { type: 'bear', w: 7, h: 6, snout: 3, snH: 3.5, tip: 0.85, earH: 2 }, headA: 0.5,
    tail: 'stub', foot: 'pad', mane: 'none', fur: 0, m };
  const o = Q.shape(SHAPE);

  const HX = 66, DUR = DEFAULT_DUR.slice(), hero = new Sprite(110, 70, 55, 64);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 14, 19], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'nose', 'ink', 'scar', 'fruit', 'fruitG', 'spec', 'vine', 'root', 'rootF', 'claw']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：nf 点亮的果实 0–5 · fg 果实亮度 0–3 · wi 树冠枯萎 0 绿 / 1 变黄 / 2 凋落
  const EXTRA = [['nf', 0, 5], ['fg', 0, 3], ['wi', 0, 2]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); P.nf = 1; P.fg = 0; P.wi = 0; }
  reset();
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 树冠几何：树干从背上 x = TX 长出 ─────
  const TX = 0, TRUNK = 7, CRX = 10, CRY = 6.5;
  const backTop = (rg) => { const s = Q.span(rg, o, TX); return s ? s[0] : -14; };
  const crownC = (rg) => [TX + (P.mane | 0), backTop(rg) - TRUNK - CRY + 1];
  // 前层叶团 [dx, dy, r]（dy < 0 的随风多摆 1 格）；果实位置（点亮顺序）
  const CLUMPS = [[-5, -1, 3.6], [0, -3, 4.2], [5, -1, 3.6], [-2, 2.2, 3.2], [4, 2.5, 3], [-8, 2, 2.4], [8, 2, 2.4]];
  const FRUITS = [[-6, 1], [4, -2], [-1, -4], [7, 3], [1, 3]];

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_LIFT = pose({ paw: 3, pitch: 1, head: -1, mane: -1 });
  const A_STOMP = pose({ crouch: 1, pitch: -1, head: 1, reach: 1, mane: 1, tail: 1 });
  const A_HOLD = pose({ crouch: 1, head: 1, mane: 1 });
  const ATK = [[0, REST], [0.12, A_LIFT, 'out'], [2 / 12, A_STOMP, 'snap'], [0.3, A_STOMP, 'lin'], [0.5, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_BOW = pose({ crouch: 1, head: 2, ear: 1, mane: 1 });
  const S_SHAKE = pose({ pitch: 1, head: -1, mane: -1, tail: 1 });
  const S_GIVE = pose({ head: 0, mane: 1 });
  const T_STOMP = 2 / 12, T_WHIP = 4 / 12, T_KNEEL = 8 / 12,   // 倒地声在身体落地那一帧（第 8 帧）
    T_BREAK = 17 / 12;
  const tmp = {};
  const apply = (src) => { for (const f of F_ALL) P[f] = R(src[f]); };

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.tail = 0;                                  // 扎根呼吸：一动不动，只有树冠随风起伏
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { P.eyes = 1; P.head = 1; P.fg = 1; }                   // 待机个性：合眼低头，果子亮一下、掉一片叶
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { Q.anim.walk(P, tq); P.head = 1; const w = walkDemo(tq, 8, -1); P.mx = w.mx; P.flip = w.flip; }   // 拔根行军：极慢
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.fg = tq >= T_STOMP && tq < 0.45 ? 1 : 0; P.nf = 2; }
    else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_BOW, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_BOW);
      P.nf = Math.min(5, 1 + Math.floor(tq / 0.25)); P.fg = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
      if (tq >= 1.1) P.mane = (f12 & 1) ? 1 : -1;
    } else if (st === CAST) {
      if (tq < 2 / 12) { apply(S_SHAKE); P.mane = (f12 & 1) ? 1 : -1; } else { E.mix(tmp, S_SHAKE, S_GIVE, ease.out(clamp01((tq - 2 / 12) / 0.2)), F_ALL); apply(tmp); }
      P.nf = 5; P.fg = 3; P.rim = 3;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, S_GIVE, REST, q, F_ALL); apply(tmp);
      P.nf = tq < 0.45 ? 5 : 1; P.fg = tq < 0.2 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq < 0.25 ? 2 : tq < 0.45 ? 1 : 0;   // 果实光熄回 1 档
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.2) P.mane = -1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { Q.anim.death(P, d, f12); P.wi = d < 0.15 ? 0 : 1; P.nf = 5; P.fg = (f12 & 1) ? 1 : 0; }
      else { P.lie = 1; P.bx = -2; P.eyes = 1; P.ear = 1; P.head = 3; P.wi = 2; P.nf = 0; P.lift = d < 0.38 ? 1 : 0; }   // 僵直跪倒成一截枯木
      if (t >= T_BREAK - 1e-6) P.dq = 1;                                                        // 裂成木块之后由死亡套件画
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    const c = crownC(rig); P.gx = c[0] + P.bx; P.gy = R(c[1] - CRY + 2);
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：rootFoot（腿脚末端的盘根，紧跟 Q.leg 画、和腿同一个部件）。着地时每只脚底 3 根根须，占 y −1..0 两行：
  //   外侧（前腿朝前、后腿朝后）一根平伸 4 格（y −1，尖端 1 格亮）+ 一根斜往下贴地 3 格（y 0，暗）；内侧一根先平伸 2 格再斜落地 2 格（尖端贴地）。
  //   合起来脚形是向外张开的扇形；远侧脚的根用暗一级色阶；抬起的脚上 3 根根须下垂 2 格。
  function leg(i) {
    Q.leg(E, rig, P, o, i);
    const L = rig.legs[i]; if (rig.lie) return;
    const fx = R(L.F[0]), fy = R(L.F[1]), b = fx - 1, e = fx + o.lw + 2, mat = L.far ? m.rootF : m.root;
    if (fy >= 0) {
      const s = L.front ? 1 : -1, p = s > 0 ? e : b, q = s > 0 ? b : e;                        // p 外侧脚沿、q 内侧脚沿
      for (let k = 1; k <= 4; k++) U.dot(E, p + s * k, -1, mat, k === 4 ? 4 : k === 1 ? 2 : 3);  // 外侧平伸的根（长 4）
      for (let k = 1; k <= 3; k++) U.dot(E, p + s * k, 0, mat, k === 3 ? 3 : 2);                // 斜往下贴地的根（长 3，比前后两根短 1）
      U.dot(E, q - s, -1, mat, 2); U.dot(E, q - 2 * s, -1, mat, 3); U.dot(E, q - 3 * s, 0, mat, 3); U.dot(E, q - 4 * s, 0, mat, 4);   // 内侧的根：平伸再落地（长 4）
    } else {
      for (const x of [b, fx + 2, e - 1]) { U.dot(E, x, fy + 1, mat, 3); U.dot(E, x + (x === b ? -1 : x === e - 1 ? 1 : 0), fy + 2, mat, 4); }   // 抬脚：根须下垂 2 格
    }
  }
  // 与躯干同一个部件：白桦树皮的墨色横纹（短横，按列错开）
  function barkMarks() {
    const C1 = rig.C1, C2 = rig.C2;
    if (!rig.lie) for (const x of [-6, -2, 3]) { const s = Q.span(rig, o, x); if (s) E.sp(x, s[1], 0); }   // 腹线下沿 3 处 1 格的树皮缺口
    for (let x = R(C2.x - C2.r + 2); x <= R(C1.x + C1.r - 2); x++) {
      const s = Q.span(rig, o, x); if (!s) continue;
      for (let y = s[0] + 2; y <= s[1] - 1; y++) { const h = U.hash(x >> 1, y); if (h < 0.17 && ((x + y) & 1)) { U.dot(E, x, y, m.body, 1); U.dot(E, x + 1, y, m.body, 1); if (h < 0.05) U.dot(E, x + 2, y, m.body, 1); } }
    }
  }
  // 候选部件：treeCrown（背上的树：树干 + 枝，后层暗叶团，前层亮叶团 + 发光果；wi 枯萎档把叶换成黄叶、变稀）
  function trunk() {
    E.part(); const [cx, cy] = crownC(rig), y0 = backTop(rig) - 1, x0 = TX;                    // 树干材质勾线是木色暗阶（不再像金属管）
    for (let y = y0; y >= cy + 2; y--) {
      const k = y0 - y, x = x0 + (k > 3 ? (P.mane | 0) : 0); U.dot(E, x - 1, y, m.trunk, 0); U.dot(E, x, y, m.trunk, 0); U.dot(E, x + 1, y, m.trunk, 0);
      if (k & 1) U.dot(E, x - ((k >> 1) & 1 ? 0 : 1), y, m.ink, 3);                           // 白桦斑：每 2 行一格墨色横纹，中间 / 受光边交替（背光边的木色勾线不断）
    }
    for (const d of [2, 3]) for (const sg of [-1, 1]) { const x = x0 + sg * d, t = Q.span(rig, o, x); U.dot(E, x, (t ? t[0] : y0 + 1) - (d === 2 ? 1 : 0), m.trunk, 0); }   // 根部往背上两侧各摊开 2 格
    const br = [[-6, -3], [6, -2], [0, -6], [-3, -5]];
    for (const [dx, dy] of br) U.seg(E, cx, cy + 2, cx + dx, cy + dy, 1, m.root, 0);          // 枝（叶子凋落后露出来）
  }
  function crown() {
    const [cx, cy] = crownC(rig), wi = P.wi | 0, sw = P.mane | 0, sparse = (x, y) => wi >= 2 && U.hash(x + 7, y + 3) < 0.62;
    const back = wi >= 1 ? m.dry : m.crownB, front = wi >= 1 ? m.dry : m.crownF;
    E.part();
    for (let y = Math.floor(cy - CRY - 1); y <= Math.ceil(cy + CRY + 1); y++) for (let x = Math.floor(cx - CRX - 1); x <= Math.ceil(cx + CRX + 1); x++) {
      const u = (x - cx) / (CRX + 0.3), v = (y - cy) / (CRY + 0.3); if (u * u + v * v > 1 || sparse(x, y)) continue;
      const bump = U.hash(x, y * 3) < 0.12 ? 2 : 0; U.dot(E, x, y, back, bump);
    }
    for (let k = 0; k < 5; k++) { const a = -2.6 + k * 0.55, x = cx + Math.cos(a) * (CRX + 0.5), y = cy + Math.sin(a) * (CRY + 0.5); if (!sparse(R(x), R(y))) U.dot(E, x + (y < cy ? sw : 0), y - 1, back, 0); }   // 顶上几簇伸出的叶尖
    E.part();
    for (const [dx, dy, r] of CLUMPS) {
      const ox = cx + dx + (dy < 0 ? sw : 0), oy = cy + dy;
      for (let y = Math.floor(oy - r); y <= Math.ceil(oy + r); y++) for (let x = Math.floor(ox - r); x <= Math.ceil(ox + r); x++) {
        const d = Math.hypot(x - ox, (y - oy) * 1.2); if (d > r || sparse(x, y)) continue;
        const t = d < r * 0.45 && x < ox && y < oy ? 4 : U.hash(x * 5, y) < 0.1 ? 2 : 0; U.dot(E, x, y, front, t);
      }
    }
    for (let k = 0; k < 5; k++) {                                                               // 发光果（和前层叶团同一个部件）
      const [dx, dy] = FRUITS[k], x = cx + dx + (dy < 0 ? sw : 0), y = cy + dy; if (wi >= 2) continue;
      const lit = k < P.nf, lv = lit ? P.fg : -1;
      if (lv >= 2) { U.dot(E, x, y, m.fruitG, lv === 3 ? 4 : 3); U.dot(E, x + 1, y, m.fruitG, 3); U.dot(E, x, y + 1, m.fruitG, 3); U.dot(E, x + 1, y + 1, m.fruitG, 2); }
      else { U.dot(E, x, y, m.fruit, lv === 1 ? 4 : lit ? 3 : 2); U.dot(E, x + 1, y, m.fruit, lit ? 3 : 2); U.dot(E, x, y + 1, m.fruit, 2); }
    }
  }
  // 藤蔓与苔须：颈下、下巴垂下 3–5 格，随 mane 摆（单独一个部件，压在头下沿）
  function vines() {
    if (rig.lie === 2) return;
    E.part(); const F = Q.headFrame(rig, o, 0), sw = P.mane | 0;
    const roots = [[F.at(-F.W * 0.4, F.bot(-F.W * 0.4)), 4], [F.at(F.W * 0.25, F.bot(F.W * 0.25)), 5], [F.at(F.W * 0.9, F.bot(F.W * 0.9)), 3], [[rig.NB.x, rig.NB.y + o.neckW], 4]];
    for (const [p, len] of roots) for (let j = 0; j < len; j++) U.dot(E, p[0] + (j >= 2 ? -sw : 0) + (j >= 4 ? -sw : 0), p[1] + j, m.vine, j === len - 1 ? 4 : (j & 1) ? 2 : 0);
  }
  function farEar() {
    if (rig.lie === 2) return;
    E.part(); const F = Q.headFrame(rig, o), b = F.at(F.W * 0.12, -F.Hh + 0.3), x = R(b[0]), y = R(b[1]);
    U.dot(E, x, y - 1, m.far, 0); U.dot(E, x + 1, y - 1, m.far, 0); U.dot(E, x, y - 2, m.far, 0); U.dot(E, x, y, m.far, 0); U.dot(E, x + 1, y, m.far, 0);
  }
  // 鼻梁裂痕 + 裂痕里长出的嫩芽（与头同一个部件）
  function scar() {
    const F = Q.headFrame(rig, o, P.jaw), W = F.W;
    [[W * 0.45, 1, 3], [W * 0.62, 1.4, 4], [W * 0.8, 1.8, 2]].forEach(([u, dv, t]) => { const p = F.at(u, F.top(u) + dv); U.dot(E, p[0], p[1], m.scar, t); });
    if (P.wi >= 2) return; const s = F.at(W * 0.55, F.top(W * 0.55));
    U.dot(E, s[0], s[1] - 1, m.sprout, 3); U.dot(E, s[0], s[1] - 2, m.sprout, 3); U.dot(E, s[0] + 1, s[1] - 3, m.sprout, 4); U.dot(E, s[0] - 1, s[1] - 2, m.sprout, 4);
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    leg(0); leg(1);
    Q.tail(E, rig, P, o);
    Q.body(E, rig, P, o); barkMarks();
    trunk();                                                                                    // 树干压在背上（根部分界线落在背上）
    leg(2); leg(3);
    crown();
    farEar();
    Q.head(E, rig, P, o); scar();
    vines();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, sporeAcc = 0, leafAcc = 0, soulAcc = 0, lastGf = -9, lastLp = 0, rootT = 9, glyT = [9, 9];
  const crownScr = () => [scrX(P.gx), HY + P.gy];
  const ALLY_X = [HX - 28, HX - 44];
  const ROOT_X = [DUMMY_X - 10, DUMMY_X - 5];
  function onEnter(s) {
    if (s === CAST) {                                                                           // 树冠一抖：花瓣向后上方抛洒，藤线连到每个友军
      poseAt(CAST, 0, E.simT); const [gx, gy] = crownScr();
      releaseOrbit(40, 80, 0.3, 0.6, { pts: 1 }); ring(gx, gy + 4, 1, R_EL);
      for (let i = 0; i < 26; i++) { const leaf = i & 1; spawnX(K_PHYS, gx + (Math.random() - 0.5) * 16, gy + 2 + Math.random() * 8, -30 - Math.random() * 70, -30 - Math.random() * 50, 0.6 + Math.random() * 0.5, leaf ? R_LEAF : R_EL, { g: 60, dragX: 0.4, floor: FLOOR - 1 }); }
      for (const p of allyPoints()) fx.link(gx - 4, gy + 4, p.x, p.top - 2, R_EL, 0.9, 1);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STOMP) {                                                        // 前脚踏地：地裂 + 地下的根须往假人脚下钻
      const px = scrX(R(rig.legs[3].F[0]) + P.bx + 2); rootT = 0;
      fx.crack(px, FLOOR, DUMMY_X - px - 10, 1, R_AUTUMN, 0.5);
      for (let i = 0; i < 6; i++) spawn(K_DUST, px + (Math.random() - 0.5) * 6, HY, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);
      shake(0.08, 1); sfx('swing', { kind: 'slash', w: 0.6 });
    }
    if (s === ATTACK && t === T_WHIP) {
      burst(DUMMY_X - 3, HY - 10, 12, 40, 100, 0.15, 0.4, FXI.impact, 8); burst(DUMMY_X - 6, HY - 4, 6, 30, 70, 0.25, 0.5, R_LEAF, 10);
      for (let i = 0; i < 5; i++) spawn(K_DUST, ROOT_X[0] + Math.random() * 8, HY, (Math.random() - 0.5) * 30, -8 - Math.random() * 10, 0.3 + Math.random() * 0.3, FXI.dust);
      hitDummy(0, 1); sfx('hit', { mat: 'wood', w: 0.6 });
    }
    if (s === CHARGE && t === 0.2) fx.wave(scrX(-12), FLOOR - 1, -1, 34, 2, R_LEAF, 1.1, 0);        // 根须沿地面往身后蔓延（绿芽冒出地面）
    if (s === CAST && (t === 0.15 || t === 0.25)) {                                             // 友军：十字光点上升 + 小冲击环 + 描边照亮
      const k = t === 0.15 ? 0 : 1, p = allyPoints()[k]; glyT[k] = 0;
      ring(p.x, HY - 2, 0, R_EL); fx.cross(p.x, p.top - 3, 4, R_EL, 0.3, 2); if (k === 0) allyFx({ dur: 1.1, outline: R_EL });
      sfx('impact', { pal: 'holy', w: k ? 0.4 : 0.6 });
    }
    if (s === HURT && t === INCOMING) { burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.25, 0.5, R_BARK, 12); const [gx, gy] = crownScr(); burst(gx, gy + 4, 5, 20, 50, 0.4, 0.7, R_LEAF, 4); }
    if (s === DEATH && t === T_KNEEL) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 20 + Math.random() * 38, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.85 });
    }
    if (s === DEATH && t === T_BREAK) {                                                        // 枯木裂成几段木块依次落地、化灰
      poseAt(DEATH, T_BREAK - 1e-3, E.simT); drawHero(); bakeHero();
      death.start('chunks', { chunk: 6, power: 0.45, fromX: 2, fromY: -4, fadeAt: 0.75, fadeDur: 0.6 });
      sfx('hit', { mat: 'wood', w: 0.5 });
      poseAt(DEATH, T_BREAK, E.simT);
    }
  }
  const EVENTS = [[], [], [T_STOMP, T_WHIP], [0.2], [0.15, 0.25], [], [INCOMING], [T_KNEEL, T_BREAK], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = crownScr();
    if (state === CHARGE) {                                                                     // 金绿光点从地面汇入树冠
      chargeAcc += dt * (14 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 20 + Math.random() * 8, a = Math.PI * (0.2 + 0.6 * Math.random()); spawnX(K_SPIRAL_PT, gx, gy + 4, r / (0.45 + Math.random() * 0.35), 0, 9, Math.random() < 0.5 ? R_EL : R_LEAF, { a, r, w: (Math.random() < 0.5 ? -1 : 1) * (1.5 + Math.random()), squash: 1.1 }); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                                    // 盘根拔出、扎下：尘土 + 土块
      if (P.gf === 0 || P.gf === 2) { const x = scrX(P.gf === 0 ? 11 : -9); for (let i = 0; i < 3; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust); sfx('step', { w: 0.85 }); }
      else { const x = scrX(P.gf === 1 ? -9 : 11); for (let i = 0; i < 2; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 4, HY - 2, (Math.random() - 0.5) * 20, -20 - Math.random() * 10, 0.4, R_AUTUMN, { g: 160, floor: FLOOR - 1 }); }
      lastGf = P.gf;
    }
    if (state === IDLE) {
      const lp = stT % DUR[IDLE];
      if (lastLp < 1.6 && lp >= 1.6) spawnX(K_PHYS, gx + 6, gy + 8, -6, 4, 1.2, R_AUTUMN, { g: 14, dragX: 0.5, floor: FLOOR - 1 });   // 掉一片叶
      lastLp = lp;
    }
    if (state === IDLE || state === RECOVER || state === MOVE) { sporeAcc += dt * (state === RECOVER ? 7 : 2.2); while (sporeAcc >= 1) { sporeAcc -= 1; spawn(K_EMBER, gx + R((Math.random() - 0.5) * 16), gy + 2, Math.random() * 6 - 3, -5 - Math.random() * 6, 0.8 + Math.random() * 0.6, R_EL); } }
    if (state === DEATH && stT > INCOMING + 0.1 && stT < T_BREAK) {                              // 树冠变黄、叶子一片片落下
      leafAcc += dt * 22; while (leafAcc >= 1) { leafAcc -= 1; spawnX(K_PHYS, gx + (Math.random() - 0.5) * 20, gy + Math.random() * 12, (Math.random() - 0.5) * 16, 2 + Math.random() * 6, 0.9 + Math.random() * 0.6, R_AUTUMN, { g: 20, dragX: 0.5, floor: FLOOR - 1 }); }
    }
    if (state === DEATH && stT > T_BREAK && stT < INCOMING + 2.4) {
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; const late = stT > INCOMING + 1.6; spawn(K_RISE, HX - 18 + Math.random() * 34, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.8 + Math.random() * 0.7, late ? FXI.soul : FXI.dust); }
    }
    for (let k = 0; k < 2; k++) if (glyT[k] < 0.7) {                                            // 友军脚下十字光点上升（5 颗一组整体上移）
      if (Math.random() < dt * 14) { const x = ALLY_X[k] + R((Math.random() - 0.5) * 8), y = HY - 2 - R(Math.random() * 4), v = -16 - Math.random() * 8, l = 0.5 + Math.random() * 0.3;
        for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) spawnX(K_PHYS, x + dx, y + dy, 0, v, l, R_EL, {}); }
    }
    rootT += dt; glyT[0] += dt; glyT[1] += dt;
  }
  function fxReset() { chargeAcc = 0; sporeAcc = 0; leafAcc = 0; soulAcc = 0; lastGf = -9; lastLp = 0; rootT = 9; glyT[0] = glyT[1] = 9; }
  function fxBack(f12) { if (P.rim >= 2 && P.lie === 0) floorGlow(scrX(P.gx), P.rim, EL, f12); }
  // 攻击的根须：两根从假人脚下冒出 → 横扫过假人 → 缩回地下（木色 3 级 + 尖端一片嫩叶）
  function roots(f12) {
    if (rootT > 0.55) return;
    const rise = clamp01(rootT / 0.17), sweep = clamp01((rootT - 0.12) / 0.14), back = clamp01((rootT - 0.36) / 0.19);
    for (let k = 0; k < 2; k++) {
      const h = R((k ? 9 : 12) * rise * (1 - back)), bend = (k ? 7 : 10) * ease.out(sweep); if (h < 1) continue;
      for (let j = 0; j <= h; j++) { const q = j / Math.max(1, h), x = R(ROOT_X[k] + bend * q * q - (1 - sweep) * q * 2), y = FLOOR - 1 - R(j * (1 - 0.35 * sweep * q)); put(x, y, j === h ? ROOT[2] : ROOT[1]); if (q < 0.7) put(x - 1, y, ROOT[0]); if (q < 0.35) put(x + 1, y, ROOT[0]); }   // 根部 2–3 格宽
      const tq = 1, tx = R(ROOT_X[k] + bend - (1 - sweep) * 2), ty = FLOOR - 1 - R(h * (1 - 0.35 * sweep)); put(tx + 1, ty - 1, LF[1]); put(tx + 1, ty, LF[2]);
    }
    if (sweep > 0 && rootT < 0.34) {                                                             // 扫过的一道 2 格宽弧形拖影（nature 第 2 级，扫完那一帧转暗一级）
      const c = sweep < 1 ? LF[2] : LF[3], s0 = Math.max(0, sweep - 0.75);
      for (let n = 0; n <= 32; n++) { const sw = s0 + (sweep - s0) * n / 32, bend = 10 * ease.out(sw), x = R(ROOT_X[0] + bend - (1 - sw) * 2), y = FLOOR - 1 - R(12 * (1 - 0.35 * sw)); put(x, y, c); put(x, y + 1, c); put(x - 1, y + 1, c); }
    }
  }
  function fxFront(f12) {
    const [gx, gy] = crownScr();
    if (P.fg >= 2 && P.lie === 0 && E.state === CHARGE) { const L = 2 + (f12 & 1); for (let r = 2; r <= L + 1; r++) { const c = r === 2 ? EL[1] : EL[2]; put(gx + r, gy - 3, c); put(gx - r, gy - 3, c); put(gx, gy - 3 - r, c); } }
    roots(f12);
  }

  return {
    name: '生命树', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.fruit, m.fruitG, m.scar], HIT_POINT, EVENTS,
    ALLIES: 'skill', ALLY_X, deathKit: { mode: 'chunks', at: T_BREAK },
    SFX: { body: 'beast', how: 'collapse', pal: 'holy', style: 'heal', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
