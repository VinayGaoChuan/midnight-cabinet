// 飞鹰（部队 · 僵尸 · 商人 · 普通）：蓝龙的第 1 级。圆胖的灰蓝尘羽僵尸秃鹰：秃头秃颈（尸绿皮）、一只眼浑浊发白、钩喙缺角；
// 头顶 3 根后掠的破羽冠；羽翼初级飞羽缺 2 根、缺口露出白色翼指骨；身侧羽毛脱落露出 3 根白肋骨；爪下吊一只鼓鼓的铜扣钱袋（商人标识）。
// 攻击：身体后仰、双翼向前猛扇，推出两层新月阵风（近身短程）；技能「美味」：飞高、把钱袋举到胸前使劲摇 → 翻爪袋口朝上一抖，
// 金币喷泉冲天、落成金币雨砸在假人身上，最高的 3 枚化成积分光点飞走。死亡：翻滚坠落，钱袋摔开、金币四散弹跳。
// 身体用 parts-beast 的 fly 骨架（尾、身体、头）；破羽翼、钱袋、爪、秃颈、羽冠、肋窗在本模块里画（通用的标了「候选部件」）。
PCD.define('FlyingEagle', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, ramp, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_TRAIL, K_PHYS, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow } = E;
  const B = E.parts.beast, F = B.fly, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const ZSKIN = ramp(['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682']);                     // 尸绿灰（僵尸族共用的皮肤）
  const m = B.mats(E, {
    main: 'pale', feather: [8, 10, 59, 60], covert: 'pale', head: ZSKIN, beak: 'bone', leg: 'bone', bone: 'bone', crest: [8, 59, 60, 17],
    eye: [0, 0, 17, 21], bag: 'leather', buckle: 'gold', coin: 'gold',
  });
  m.covertFar = E.defMat([8, 10, 59, 60], 1);                                          // 远翼覆羽暗一级
  const M_BUCKLE_HOT = E.defMat([5, 5, 21, 21], 1, 1);                                  // 铜扣蓄满时的亮芯（发光体）
  const R_EL = FXI.coin, EL = FXR[R_EL];                                                // 金币
  const R_FEATHER = fxRamp('dustFeather', [21, 17, 60, 59, 8]);                         // 羽屑（灰蓝尘羽）
  const R_GUST = FXI.dust;                                                              // 阵风弧线：dust 色阶 + 白

  // ───── 形体 ─────
  const WING = { span: 13, chord: 5, type: 'feather', fingers: 5, missing: [1, 2], bone: 0.62 };
  const o = F.shape({ alt: 15, rx: 5, ry: 4.2, head: 'bird', hr: 2.3, beak: 0, beakH: 1, hook: 0, crest: null, tail: 'fan', tailLen: 5, wing: WING, legLen: 2, talon: 1, m });
  const NECK = [1.6, -1.8];                                                             // 秃颈：头从身体前上方再往前上伸出去
  const ALT = o.alt, HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(88, 64, 44, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 6, 9], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'spec', 'beak', 'leg', 'head', 'bone', 'boneFar', 'feather', 'featherFar', 'covert', 'covertFar', 'crest']) if (m[k] != null) RIM.skip[m[k]] = 1;

  // 自定翼姿：B.WINGS 之后追加 7 = 向前猛扇（翼臂朝前上、飞羽朝前）
  const WPOSE = B.WINGS.concat([[2.05, 2.75, 0.12]]);
  const SPEC = F.KEYS.map((k) => (k[0] === 'wing' ? ['wing', 0, 7] : k)).concat([
    ['hold', 0, 2], ['bagX', -1, 1], ['bagY', -2, 1], ['bulge', -1, 2], ['gem', 0, 4], ['glint', 0, 1], ['crest', -1, 1], ['open', 0, 1],
  ]).concat(B.COMMON);
  const P = {};
  function reset() { F.reset(P); P.hold = 0; P.bagX = 0; P.bagY = 0; P.bulge = 0; P.gem = 0; P.glint = 0; P.crest = 0; P.open = 0; }
  reset();
  const DROP = { at: 0.6, dur: 0.24, dx: 7, hop: 4 };                                    // 钱袋在 0.6 s 脱手，0.24 s 甩出 7 格
  const T_HIT = 2 / 12, T_SKY = 0.08, T_RAIN = 0.42, T_LAND = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;

  // 取 rig，并把头挪到秃颈末端（坠落 / 倒地时只水平挪）
  function rigOf() {
    const r = F.rig(P, o), h = r.head;
    if (r.lie === 2) h.x += NECK[0] + 1; else { h.x += NECK[0]; h.y += NECK[1]; }
    r.eye = [R(h.x + h.r * 0.35), R(h.y - h.r * 0.25)]; r.mouth = [h.x + h.r + 3, h.y + 0.5];
    return r;
  }
  let rig = rigOf();
  const HIT_POINT = [R(rig.C.x), R(rig.C.y)];

  // 钱袋扎口的位置（本地坐标）：挂着 = 两爪之间往下 1 格；举在胸前 = 胸前下方
  function bagTie(r) {
    const C = r.C, l = r.legs;
    if (P.hold) { const p = U.toW(C.x, C.y, C.a, o.rx + 1.6, o.ry * 0.15); return [p[0] + P.bagX, p[1] + P.bagY]; }   // 举到胸前：在胸口前方
    const mode = r.lie === 2 ? 0 : P.legs | 0, fx = mode === 0 ? l.x - 1.2 : l.x - 0.6, fy = mode === 0 ? l.y + 1 : l.y + o.legLen;
    return [fx + 0.4, fy + 1 + P.bagY];
  }

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const lp = F.anim.idle(P, tq, f12, DUR[IDLE]);
    P.bagX = [0, 0, 0, 1][P.gf] | 0;                                                    // 扑翼时钱袋跟着晃
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                   // 待机个性：低头看钱袋，用爪子掂一掂（袋子上跳 1 格，袋口金币闪一下）
      const k = Math.min(4, f12of(lp - 1.6)); P.head = 1; P.bagY = [-1, 0, -1, 0, 0][k]; P.bagX = 0; P.glint = k === 1 || k === 2 ? 1 : 0; P.crest = -1;
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                // 扑翼跳飞：4 帧扑翼 + 身体起伏 2 格，一顿一顿；钱袋往后甩
      const f = F.anim.walk(P, tq); P.bob = [2, -1, -2, 1][f]; P.bagX = [-1, 0, 1, 0][f]; P.crest = [-1, 0, 1, 0][f];
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { const q = ease.out(tq / 0.12); P.gf = -1; P.wing = 1; P.pitch = -2; P.head = -1; P.lift = R(q); P.bx = -R(q); P.bagX = 1; P.crest = 1; P.jaw = 1; }   // 预兆：后仰、双翼高举
      else if (tq < 0.25) { P.gf = -1; P.wing = 7; P.pitch = -1; P.bx = 2; P.head = 0; P.jaw = 2; P.tail = 1; P.bagX = -1; P.crest = -1; }   // 出手：双翼向前猛扇（定格）
      else if (tq < 0.45) { P.gf = -1; P.wing = 3; P.pitch = 0; P.bx = 1; P.bagX = -1; P.jaw = 1; }
      else { const lp = F.anim.idle(P, tq, f12, DUR[IDLE]); P.bx = tq < 0.6 ? 1 : 0; void lp; }
    } else if (st === CHARGE) {                                                            // 蓄力：飞高 4 格，双爪把钱袋举到胸前使劲摇
      const q = ease.inOut(clamp01(tq / 0.7));
      P.gf = f12 & 3; P.bob = 0; P.lift = R(4 * q); P.pitch = q > 0.5 ? -1 : 0; P.head = 1; P.hold = q > 0.3 ? 1 : 0; P.legs = P.hold ? 2 : 1;
      P.bagX = tq > 0.5 ? ((f12 & 1) ? 1 : -1) : 0; P.bagY = tq > 0.5 && (f12 & 2) ? -1 : 0; P.bulge = tq > 0.7 ? 1 : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.crest = 1;
    } else if (st === CAST) {                                                              // 施放：翻爪袋口朝上一抖
      P.gf = -1; P.wing = tq < 0.25 ? 5 : 1; P.lift = 4; P.pitch = -2; P.head = -1; P.jaw = 2; P.hold = 2; P.legs = 2; P.open = 1;
      P.bagY = tq < 1 / 12 ? 1 : tq < 2 / 12 ? -2 : 0; P.bulge = tq < 0.2 ? 1 : 0; P.gem = tq < 0.3 ? 3 : 2; P.rim = 3; P.crest = -1;
    } else if (st === RECOVER) {                                                           // 收招：袋子瘪一点，重新夹回爪下
      const q = ease.inOut(clamp01(tq / 0.6));
      P.gf = (f12 >> 1) & 3; P.lift = R(4 * (1 - q)); P.pitch = q < 0.4 ? -1 : 0; P.hold = q < 0.45 ? 1 : 0; P.legs = P.hold ? 2 : 1; P.bulge = -1;
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12); else { F.anim.hurt(P, h); if (h < 0.2) { P.bagX = 1; P.crest = 1; P.bagY = -1; } else if (h < 0.35) P.bagX = 1; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else {
        F.anim.death(P, d, f12, ALT, DROP);                                                 // 失去浮力 → 翻滚坠落 → 落地 → 翼摊开；钱袋甩出去
        if (d >= 0.3 && d < 0.66) { const k = f12of(d - 0.3); P.pitch = [3, -2, 3, -2, 2][Math.min(4, k)]; P.crest = (k & 1) ? 1 : -1; P.bagX = (k & 1) ? -1 : 1; }   // 翻滚
        if (d < 0.3) { P.bagX = 1; P.crest = 1; }
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    if (P.gf >= 0 && P.wing > 6) P.wing = 0;
    rig = rigOf();
    const tie = bagTie(rig); P.gx = R(tie[0]) + P.bx; P.gy = R(tie[1]) + 3;
    if (P.drop) { P.gx = R(-1 + P.dsx) + P.bx; P.gy = -2 - P.dsy; }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：raggedWing（破羽翼）：B.wing 的羽翼画法 + 缺掉的初级飞羽（缺口露出白色翼指骨）+ 自定翼姿。
  //   w = { span, chord, fingers, missing: [缺的初级飞羽序号，0 = 最外], bone 翼指骨长度（占飞羽长 0–1）}；pose = 翼姿下标（可超出 B.WINGS，用 poses 表）或 [a0, aT, fold]
  //   材质：m.feather / featherFar（羽）、m.bone / boneFar（翼指骨）
  function raggedWing(x, y, pose, w, far, poses) {
    E.part();
    const Wp = Array.isArray(pose) ? pose : ((poses || B.WINGS)[pose | 0] || B.WINGS[0]), a0 = Wp[0], aT = Wp[1], fold = Wp[2], span = w.span, nf = w.fingers || 3;
    const arm = span * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, tips = [];
    for (let k = 0; k < nf; k++) { const q = nf === 1 ? 1 : k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); tips.push(wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl); }
    const bx = x - (w.chord || 4) * (1 - 0.3 * fold), by = y + 1, fm = far ? m.featherFar : m.feather, bm = far ? m.boneFar : m.bone;
    const cm = far ? m.covertFar : m.covert, lx = tips[2 * nf - 2], ly = tips[2 * nf - 1], mx = lerp(lx, bx, 0.5), my = lerp(ly, by, 0.5) + 1, miss = w.missing || [];
    U.poly(E, [x, y, wx, wy, lx, ly, mx, my, bx, by], fm, 0);                                                         // 飞羽（翼面，深一级）
    for (let k = 0; k < nf; k++) {
      if (miss.includes(k)) { const e = w.bone || 0.6; U.seg(E, wx, wy, lerp(wx, tips[2 * k], e), lerp(wy, tips[2 * k + 1], e), 1, bm, k === miss[0] ? 4 : 3); continue; }   // 缺的飞羽：只剩白色翼指骨
      U.seg(E, wx, wy, tips[2 * k], tips[2 * k + 1], span >= 12 ? 2 : 1, fm, 0); U.dot(E, tips[2 * k], tips[2 * k + 1], fm, 4);   // 初级飞羽：从腕部扇开
    }
    const c1x = lerp(wx, lx, 0.38), c1y = lerp(wy, ly, 0.38), c2x = lerp(x, bx, 0.6), c2y = lerp(y, by, 0.6);
    U.poly(E, [x, y, wx, wy, c1x, c1y, c2x, c2y], cm, 0);                                                            // 覆羽（浅一级，和身体同色）
    U.seg(E, x, y, wx, wy, 2, cm, 4);                                                                                 // 前缘
    for (let k = 1; k <= 4; k++) { const q = k / 5, ax = lerp(c1x, c2x, q), ay = lerp(c1y, c2y, q), ex = lerp(lx, lerp(mx, bx, 0.5), q), ey = lerp(ly, lerp(my, by, 0.5), q); U.seg(E, lerp(ax, ex, 0.3), lerp(ay, ey, 0.3), lerp(ax, ex, 0.75), lerp(ay, ey, 0.75), 1, fm, 2); }   // 飞羽分隔线
    return { wrist: [wx, wy], tips };
  }
  // 候选部件：moneyBag（扎口钱袋）：(x, y) 扎口中心；sway 下半截摆 -1..1；bulge 鼓胀 -1..2；open 1 = 袋口张开朝上（金币涌出）；
  //   lv 铜扣亮度 0 暗 · 1 亮 · 2 很亮 · 3 爆闪 · 4 熄灭；glint 袋口金币闪光。材质 m.bag（布袋）、m.buckle（铜扣）、m.coin（金币）
  const BAG_HW = [1.4, 2.4, 2.6, 2.1, 1.1];
  function moneyBag(x, y, sway, bulge, open, lv, glint) {
    E.part();
    x = R(x); y = R(y);
    const n = BAG_HW.length + (bulge > 0 ? 1 : 0);
    for (let k = 1; k <= n; k++) {                                                        // 袋身：上窄下鼓，下半截随 sway 摆
      const hw = (BAG_HW[Math.min(BAG_HW.length - 1, k - 1)] || 1) + (k > 1 && k < n ? bulge * 0.55 : 0), cx = x + sway * (k / n) * 1.2;
      for (let i = Math.round(cx - hw); i <= Math.round(cx + hw); i++) U.dot(E, i, y + k, m.bag, 0);
    }
    U.dot(E, x + 1 + R(sway * 0.5), y + 3, m.bag, 1); U.dot(E, x + 2 + R(sway * 0.6), y + 4, m.bag, 1);   // 补丁缝线
    U.dot(E, x - 1 + R(sway * 0.6), y + n - 1, m.bag, 2);
    if (open) {                                                                          // 袋口张开：外翻的袋口 + 里面的金币往外涌
      for (let i = -2; i <= 2; i++) U.dot(E, x + i, y, m.bag, Math.abs(i) === 2 ? 4 : 1);
      U.dot(E, x - 1, y - 1, m.coin, 4); U.dot(E, x, y - 1, m.coin, 3); U.dot(E, x + 1, y - 1, m.coin, 4); U.dot(E, x, y - 2, m.coin, glint ? 4 : 3);
      U.dot(E, x + 2, y + 1, lv >= 2 && lv < 4 ? M_BUCKLE_HOT : m.buckle, lv >= 1 && lv < 4 ? 4 : 3);
      return;
    }
    U.dot(E, x - 1, y, m.bag, 1); U.dot(E, x, y, m.bag, 1);                              // 扎口的绳
    const bm = lv >= 2 && lv < 4 ? M_BUCKLE_HOT : m.buckle, bt = lv === 4 ? 2 : lv >= 1 ? 4 : 3;
    U.dot(E, x + 1, y, bm, bt); U.dot(E, x + 1, y + 1, bm, lv >= 3 ? 3 : 2);             // 铜扣（竖 2 格，压在袋口前面）
    U.dot(E, x - 1, y - 1, m.bag, 4); U.dot(E, x + 2, y - 1, m.bag, 3);                  // 扎口上面的袋口褶
    U.dot(E, x, y - 1, m.coin, glint ? 4 : 3); U.dot(E, x + 1, y - 1, m.coin, 3); U.dot(E, x + 1, y - 2, m.coin, glint ? 4 : 3);   // 袋口露出 2 枚金币
    if (glint) U.dot(E, x + 2, y - 3, m.coin, 4);
  }
  // 摔开的钱袋（落地）：扁的一摊，袋口朝前，金币洒出来
  function bagBurst(x) {
    E.part(); x = R(x);
    for (let i = -3; i <= 2; i++) { U.dot(E, x + i, 0, m.bag, 0); if (i > -3 && i < 2) U.dot(E, x + i, -1, m.bag, 0); if (i > -2 && i < 1) U.dot(E, x + i, -2, m.bag, 0); }
    U.dot(E, x + 3, -1, m.bag, 1); U.dot(E, x + 3, 0, m.bag, 4); U.dot(E, x - 1, -1, m.bag, 1);
    U.dot(E, x + 4, 0, m.coin, 4); U.dot(E, x + 5, 0, m.coin, 3); U.dot(E, x + 4, -1, m.coin, 3); U.dot(E, x + 7, 0, m.coin, 4);
    U.dot(E, x + 1, -2, m.buckle, P.gem === 4 ? 2 : 3);
  }
  // 爪（两只，每只一条细腿 + 两格钩爪）：抓在 (tx, ty)，远侧那只错后 1 格
  function talons(tx, ty, mode) {
    E.part();
    const l = rig.legs;
    for (const [dxo, far] of [[1.2, 1], [0, 0]]) {
      const x0 = l.x + dxo * 0.8 - 0.5, y0 = l.y, fx = tx - 1.4 - dxo * 0.6, fy = ty - (mode === 0 ? 0 : 1);   // 爪从后面勾住扎口，袋口的金币露在前面
      U.seg(E, x0, y0, fx, fy, 1, m.leg, far ? 2 : 0);
      U.dot(E, fx + 1, fy, m.leg, far ? 2 : 3); U.dot(E, fx + 1, fy + 1, m.leg, far ? 1 : 2);
    }
  }
  // 羽冠（3 根后掠的破羽，长短参差）：画在头之前（根部压在头后面）
  const CREST = [[4, 0.85], [5.2, 0.42], [3, 0.08]];
  function crest(h) {
    E.part();
    const bx0 = h.x - h.r * 0.1, by0 = h.y - h.r * 0.75, sw = P.crest * 0.22;
    CREST.forEach(([L, a], i) => { const A = a + sw * (1 + i * 0.3), ex = bx0 - Math.cos(A) * L, ey = by0 - Math.sin(A) * L; U.seg(E, bx0, by0, ex, ey, 1, m.crest, i === 1 ? 3 : 2); U.dot(E, ex, ey, m.crest, 4); });
  }
  // 肋窗（和身体同一个部件）：身侧一块羽毛脱落，露出 3 根白肋骨
  function ribs() {
    const C = rig.C; if (rig.lie === 2) return;
    const at = (u, v) => U.toW(C.x, C.y, C.a, u, v);
    for (let v = 0; v <= 2; v++) for (let u = -5; u <= 0; u++) { if ((v === 0 && u === 0) || (v === 2 && u === -5)) continue; const p = at(u, v); U.dot(E, p[0], p[1], m.head, 1); }   // 羽毛脱落的一块（烂肉）
    for (let k = 0; k < 3; k++) for (let v = 0; v <= 2; v++) { const p = at(-5 + k * 2 + (v ? 1 : 0), v); U.dot(E, p[0], p[1], m.bone, v === 0 ? 4 : 3); }   // 3 根白肋骨（从脊背斜向前下）
  }
  // 秃颈 + 头（和头同一个部件）：钩喙缺一角
  function headNeck() {
    const h = rig.head, C = rig.C;
    F.head(E, rig, P, o);
    const nb = U.toW(C.x, C.y, C.a, o.rx * 0.62, -o.ry * 0.5);
    U.taper(E, nb[0], nb[1], h.x - h.r * 0.55, h.y + h.r * 0.45, 1.5, 1.05, m.head, 0);  // 秃颈
    U.dot(E, h.x - h.r * 0.2, h.y + h.r * 0.85, m.head, 2);                              // 颈褶
    const bx = R(h.x + h.r * 0.7), by = R(h.y + 0.3), jw = P.jaw | 0;                   // 骨白钩喙：上缘前角缺了一块
    for (const [i, j, t] of BEAK) U.dot(E, bx + i, by + j, m.beak, t);
    if (jw) { U.dot(E, bx + 1, by + 1, m.ink, 0); U.dot(E, bx + 2, by + 1, m.ink, 0); U.dot(E, bx, by + 1 + jw, m.beak, 2); U.dot(E, bx + 1, by + 1 + jw, m.beak, 2); }
    else { U.dot(E, bx, by + 1, m.beak, 2); U.dot(E, bx + 1, by + 1, m.beak, 2); }
  }
  const BEAK = [[0, -1, 4], [1, -1, 4], [0, 0, 3], [1, 0, 3], [2, 0, 3], [3, 0, 3], [3, 1, 2]];
  function drawHero() {
    begin(hero, P.bx, 0);
    const r = rig, wp = P.gf >= 0 && !r.lie ? B.FLAP[P.gf] : P.wing, tie = bagTie(r), sway = P.bagX;
    raggedWing(r.wing.x + 3, r.wing.y - 2, wp, WING, 1, WPOSE);
    F.tail(E, r, P, o);
    if (!P.hold && !P.drop) { moneyBag(tie[0], tie[1], sway, P.bulge, 0, P.gem, P.glint); talons(tie[0], tie[1], r.lie === 2 ? 0 : P.legs); }
    else if (P.drop && r.lie !== 2) talons(r.legs.x - 1, r.legs.y + 2, 1);
    F.body(E, r, P, o); ribs();
    if (P.hold) { moneyBag(tie[0], tie[1], sway, P.bulge, P.open, P.gem, P.glint); talons(tie[0], tie[1], 2); }
    raggedWing(r.wing.x, r.wing.y, wp, WING, 0, WPOSE);
    crest(r.head);
    E.part(); headNeck();
    if (P.drop === 1) moneyBag(-1 + P.dsx, -6 - P.dsy, 1, 0, 0, P.gem, 0);
    else if (P.drop === 2) bagBurst(-1 + P.dsx);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 金币（技能的金币喷泉 / 金币雨、死亡时摔出的金币）：2×2 金块，翻转时变成 1×2 侧面，落地弹一下后化成金色尘
  const CN = 40, cOn = new Uint8Array(CN), cX = new Float32Array(CN), cY = new Float32Array(CN), cVX = new Float32Array(CN), cVY = new Float32Array(CN), cB = new Uint8Array(CN), cS = new Uint8Array(CN), cPh = new Uint8Array(CN);
  function coin(x, y, vx, vy, score) { let i = 0; for (; i < CN - 1 && cOn[i]; i++); cOn[i] = 1; cX[i] = x; cY[i] = y; cVX[i] = vx; cVY[i] = vy; cB[i] = 0; cS[i] = score ? 1 : 0; cPh[i] = (i * 3) & 3; }
  function stepCoins(dt) {
    for (let i = 0; i < CN; i++) {
      if (!cOn[i]) continue;
      cVY[i] += 300 * dt; cX[i] += cVX[i] * dt; cY[i] += cVY[i] * dt;
      if (cS[i] && cVY[i] > -10) {                                                         // 最高的几枚：到顶点化成积分光点飞向屏幕顶端
        cOn[i] = 0; fx.cross(R(cX[i]), R(cY[i]), 3, R_EL, 0.2, 2);
        for (let k = 0; k < 3; k++) spawnX(K_PHYS, cX[i] + k - 1, cY[i], (k - 1) * 6, -40 - k * 10, 0.9, R_EL, { g: -160 });
        continue;
      }
      if (cY[i] < -6) { cOn[i] = 0; continue; }                                             // 冲出屏幕顶
      if (cY[i] >= FLOOR - 1) {
        if (cB[i] === 0) { cY[i] = FLOOR - 1; cVY[i] *= -0.38; cVX[i] *= 0.6; cB[i] = 1; }   // 落地弹一下
        else { cOn[i] = 0; for (let k = 0; k < 2; k++) spawn(K_DUST, cX[i] + k, FLOOR - 1, (Math.random() - 0.5) * 16, -6 - Math.random() * 6, 0.35 + Math.random() * 0.2, R_EL); }
      }
    }
  }
  function drawCoins(f12) {
    for (let i = 0; i < CN; i++) {
      if (!cOn[i]) continue; const x = R(cX[i]), y = R(cY[i]), ph = (f12 + cPh[i]) & 3;
      if (ph === 3) { put(x, y, 5); put(x, y + 1, 14); }                                    // 翻到侧面
      else { put(x, y, ph === 0 ? 21 : 5); put(x + 1, y, 14); put(x, y + 1, 14); put(x + 1, y + 1, 19); }
    }
  }
  let chargeAcc = 0, trailAcc = 0, soulAcc = 0, emberAcc = 0, gT = 9, gX = 0, gY = 0, lastGf = -9, rainDone = 0;
  const focusScr = () => [scrX(P.gx), HY + P.gy];
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [gx, gy] = focusScr();
      releaseOrbit(40, 90, 0.3, 0.6, { up: 30 }); burst(gx, gy - 2, 14, 40, 100, 0.25, 0.5, R_EL, 30);
      for (let i = 0; i < 20; i++) {                                                        // 20 枚金币从袋口扇形喷上天；其中 3 枚飞到半空化成积分光点
        const sc = i === 4 || i === 10 || i === 15, q = i / 19, a = -Math.PI / 2 + lerp(-0.5, 0.6, q) + (Math.random() - 0.5) * 0.1, v = sc ? 95 + i : 185 + Math.random() * 55;
        coin(gx - 1 + (i % 3), gy - 3, Math.cos(a) * v * 0.6, Math.sin(a) * v, sc);
      }
      fx.cross(gx, gy - 3, 6, R_EL, 0.3, 2); ring(gx, gy - 2, 1, R_EL); shake(0.28, 2); flash(0.05); rainDone = 0;
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                     // 阵风：两层新月弧从胸前推向假人
      gT = 0; gX = scrX(o.rx + 5 + P.bx); gY = HY + R(rig.C.y) - 2;
      for (let i = 0; i < 5; i++) spawn(K_TRAIL, gX + Math.random() * 4, gY - 5 + Math.random() * 10, 60 + Math.random() * 60, (Math.random() - 0.5) * 20, 0.25 + Math.random() * 0.2, R_FEATHER);   // 夹几片羽屑
      burst(DUMMY_X - 5, HY - 15, 8, 30, 70, 0.15, 0.35, FXI.impact, 6); burst(DUMMY_X - 5, HY - 15, 6, 30, 70, 0.2, 0.4, R_FEATHER, 4); hitDummy(0, 1);
      sfx('swing', { kind: 'slash', w: 0.25 }); sfx('hit', { mat: 'flesh', w: 0.25 });
    }
    if (s === CAST && t === T_SKY) {                                                       // 金币从天上落成金币雨（假人头顶一片）
      for (let i = 0; i < 16; i++) coin(80 + i * 2.2 + Math.random() * 2, 12 - ((i * 7) % 16) * 2.2 - Math.random() * 3, (Math.random() - 0.5) * 16, 60 + ((i * 5) % 7) * 10, 0);   // 高低错开，不排成一行
    }
    if (s === CAST && t === T_RAIN) {                                                      // 金币雨砸到假人：眼冒金星
      burst(DUMMY_X, HY - 28, 16, 30, 90, 0.2, 0.5, R_EL, 10); fx.cross(DUMMY_X, HY - 28, 5, R_EL, 0.3, 2); ring(DUMMY_X, HY - 26, 0, R_EL); hitDummy(1, 1); shake(0.12, 1);
      dummyFx({ dur: 1.1, stun: 1 }); sfx('impact', { pal: 'coin', w: 0.5 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 80, 0.2, 0.45, R_FEATHER, 10);
    if (s === DEATH && t === INCOMING + 0.66) {                                            // 坠地：尘土 + 羽屑
      for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 14 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      burst(HX - 2, HY - 3, 8, 20, 60, 0.3, 0.6, R_FEATHER, 16); shake(0.1, 1); sfx('fall', { w: 0.25 });
    }
    if (s === DEATH && t === T_LAND) {                                                     // 钱袋摔开：金币四散弹跳
      const x = HX + DROP.dx - 1; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i / 9 - 0.5) * 2.2; coin(x + 2, HY - 3, Math.cos(a) * (50 + Math.random() * 30), Math.sin(a) * (70 + Math.random() * 40), 0); }
      fx.cross(x + 3, HY - 3, 4, R_EL, 0.25, 2); sfx('hit', { mat: 'metal', w: 0.2 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_SKY, T_RAIN], [], [INCOMING], [INCOMING + 0.66, T_LAND], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = focusScr();
    if (state === CHARGE) {                                                                // 金色小光点绕钱袋环绕
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 7, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
    }
    if (state === MOVE && P.gf !== lastGf) {                                               // 下扑那一帧：身下拖 1 颗羽屑
      if (P.gf === 2) spawn(K_TRAIL, scrX(-2), HY + R(rig.C.y) + 4, (P.flip ? 1 : -1) * (10 + Math.random() * 8), 6 + Math.random() * 4, 0.45 + Math.random() * 0.25, R_FEATHER);
      lastGf = P.gf;
    }
    if (state === IDLE && P.glint) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 3, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === RECOVER) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 2, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {                // 魂光金
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); }
    }
    stepCoins(dt); gT += dt;
  }
  function fxReset() { chargeAcc = 0; trailAcc = 0; soulAcc = 0; emberAcc = 0; gT = 9; lastGf = -9; rainDone = 0; cOn.fill(0); }
  function fxBack(f12) {
    if (P.dq < 0.6 && rig.lie !== 2) groundShadow(scrX(R(rig.C.x)), 7, -rig.C.y);
    if (P.rim >= 2 && !rig.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  // 两层新月阵风：出手帧外层白 → 奶油，内层奶油 → 暖灰；第 2 帧起断续、往前推
  function crescent(cx, cy, r, c, gap) {
    for (let a = -1.05; a <= 1.05; a += 0.13) { const k = R(a * 10); if (gap && (k & 1)) continue; put(R(cx + Math.cos(a) * r), R(cy + Math.sin(a) * r * 1.25), c); }
  }
  function fxFront(f12) {
    if (gT < 3 / 12) {
      const k = Math.floor(gT * 12), G = FXR[R_GUST], push = k * 3;
      crescent(gX + push, gY, 6, k === 0 ? 21 : k === 1 ? G[0] : G[1], k >= 2);
      crescent(gX + push - 4, gY, 5, k === 0 ? G[0] : k === 1 ? G[1] : G[2], k >= 1);
      if (k === 0) crescent(gX + push + 1, gY, 6, G[0], 1);
      if (k < 2) for (const [dy, L] of [[-4, 4], [0, 6], [4, 3]]) for (let i = 0; i < L; i++) if (!(k && (i & 1))) put(gX + push - 6 - i, gY + dy, i < 2 ? G[k] : G[k + 1]);   // 风线
    }
    if (P.gem >= 2 && P.gem <= 3 && !rig.lie && P.dq < 1 && (E.state === CHARGE || E.state === CAST)) {    // 铜扣星芒
      const [gx, gy] = focusScr(), x = gx + 2, y = gy - 2, L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(x + r, y, c); put(x - r, y, c); put(x, y - r, c); put(x, y + r, c); }
    }
    drawCoins(f12);
  }

  return {
    name: '飞鹰', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_BUCKLE_HOT], HIT_POINT, EVENTS, REVIVE: { ramp: R_EL, dy: -16 },
    SFX: { body: 'beast', how: 'collapse', pal: 'coin', style: 'coin', w: 0.25, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
