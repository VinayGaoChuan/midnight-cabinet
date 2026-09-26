// 飞鹰（部队 · 僵尸 · 商人 · 普通）：蓝龙的第 1 级。圆胖的灰蓝尘羽僵尸秃鹰：胸前一圈浅灰翎领，细秃颈（尸绿皮）从翎领里往前下探，一只眼浑浊发白、钩喙缺角并往下勾；
// 头顶 3 根后掠的破羽冠；羽翼初级飞羽缺 2 根、缺口露出白色翼指骨；身侧羽毛脱落露出 3 根白肋骨；爪下吊一只鼓鼓的铜扣钱袋（商人标识）。
// 攻击：身体后仰、双翼向前猛扇，推出两层新月阵风（近身短程）；技能「美味」：飞高、把钱袋举到胸前使劲摇 → 翻爪袋口朝上一抖，
// 金币喷泉冲天、落成金币雨砸在假人身上，最高的 3 枚化成积分光点飞走。死亡：翻滚坠落，钱袋摔开、金币四散弹跳。
// 身体用 parts-beast 的 fly 骨架（尾、身体、头）；破羽翼、钱袋、爪、秃颈、翎领、钩喙、白眼、羽冠、肋窗在本模块里画（通用的标了「候选部件」）。
PCD.define('FlyingEagle', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, ramp, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_TRAIL, K_PHYS, K_BURST,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, groundShadow } = E;
  const B = E.parts.beast, F = B.fly, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const ZSKIN = ramp(['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682']);                     // 尸绿灰（僵尸族共用的皮肤）
  const m = B.mats(E, {
    main: 'pale', feather: [8, 10, 59, 60], covert: 'pale', head: ZSKIN, beak: 'bone', leg: 'bone', bone: 'bone', crest: [8, 10, 59, 17],
    eye: [0, 0, 17, 21], bag: 'leather', buckle: 'gold', coin: 'gold', ruff: [8, 60, 17, 17],
  });
  m.covertFar = E.defMat([8, 10, 59, 60], 1);                                          // 远翼覆羽暗一级
  const M_BUCKLE_HOT = E.defMat([20, 5, 21, 21], 1, 1);                                 // 铜扣蓄满时的亮芯（发光体；勾线用深木色）
  const R_EL = FXI.coin, EL = FXR[R_EL];                                                // 金币
  const R_FEATHER = fxRamp('dustFeather', [21, 17, 60, 59, 8]);                         // 羽屑（灰蓝尘羽）
  const R_GUST = FXI.dust;                                                              // 阵风弧线：dust 色阶 + 白

  // ───── 形体 ─────
  const WING = { span: 13, chord: 5, type: 'feather', fingers: 5, missing: [1, 2], bone: 0.62 };
  const o = F.shape({ alt: 12, rx: 5, ry: 4.4, head: 'bird', hr: 2.3, beak: 0, beakH: 1, hook: 0, crest: null, tail: 'fan', tailLen: 5, wing: WING, legLen: 2, talon: 1, m });
  const NECK = [4.75, 1.5];                                                             // 秃颈：从翎领里往前、略朝下探出去，头垂在胸前方（秃鹫的缩颈探头）
  const ALT = o.alt, HX = 76, OX = -4, DUR = DEFAULT_DUR.slice();                     // OX：整只鸟往后挪 4 格，往前探的头和钩喙不戳进假人
  const hero = new Sprite(88, 64, 44, 58);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 4, 6, 9], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'spec', 'beak', 'leg', 'head', 'bone', 'boneFar', 'feather', 'featherFar', 'covert', 'covertFar', 'crest', 'ruff']) if (m[k] != null) RIM.skip[m[k]] = 1;

  // 自定翼姿：B.WINGS 之后追加 7 = 向前猛扇（翼臂朝前上、飞羽朝前）
  const WPOSE = B.WINGS.concat([[2.05, 2.75, 0.12]]);
  const SPEC = F.KEYS.map((k) => (k[0] === 'wing' ? ['wing', 0, 7] : k)).concat([
    ['hold', 0, 2], ['bagX', -1, 1], ['bagY', -2, 1], ['bulge', -1, 2], ['gem', 0, 4], ['glint', 0, 2], ['crest', -1, 1], ['open', 0, 1], ['bdown', 0, 1],
  ]).concat(B.COMMON);
  const P = {};
  function reset() { F.reset(P); P.hold = 0; P.bagX = 0; P.bagY = 0; P.bulge = 0; P.gem = 0; P.glint = 0; P.crest = 0; P.open = 0; P.bdown = 0; }
  reset();
  const DROP = { at: 0.6, dur: 0.25, dx: 13, hop: 6 };                                   // 钱袋在 0.6 s 脱手，0.25 s 甩到身体前方约 7 格（离身体中心 13 格）
  const T_HIT = 2 / 12, T_SKY = 0.08, T_RAIN = 0.42, T_LAND = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;

  // 取 rig，并把头挪到秃颈末端（坠落 / 倒地时只水平挪）
  function rigOf() {
    const r = F.rig(P, o), h = r.head;
    if (r.lie === 2) h.x += NECK[0] + 1; else { h.x += NECK[0]; h.y += NECK[1]; }
    const bx = R(h.x + h.r * 0.7), by = R(h.y + 0.3);                                   // 喙根（headNeck 里画喙的原点）
    r.eye = [bx - 2, by - 1]; r.mouth = [h.x + h.r + 3, h.y + 0.5];                      // 浑浊白眼在头部中后方：和喙根之间隔 1 格（深色眼眶）
    return r;
  }
  let rig = rigOf();
  const HIT_POINT = [R(rig.C.x) + OX, R(rig.C.y)];

  // 钱袋扎口的位置（本地坐标）：挂着 = 两爪之间往下 1 格；举在胸前 = 胸前下方
  function bagTie(r) {
    const C = r.C, l = r.legs;
    if (P.hold) { const p = U.toW(C.x, C.y, C.a, o.rx + 2.4, o.ry * 0.15); return [p[0] + P.bagX, p[1] + P.bagY]; }   // 举到胸前：在胸口前方
    const mode = r.lie === 2 ? 0 : P.legs | 0, fx = mode === 0 ? l.x - 1.2 : l.x - 0.6, fy = mode === 0 ? l.y + 1 : l.y + o.legLen;
    return [fx + 0.4, l.y + 1.9 + P.bagY];                                                // 扎口离爪根 2–3 格（紧贴在身下）：爪从两侧勾住扎口，铜扣和袋口金币露在两爪之间
  }

  // ───── 姿势 ─────
  function idle(tq, f12) {
    const lp = F.anim.idle(P, tq, f12, DUR[IDLE]);
    P.bagX = [0, 0, 0, 1][P.gf] | 0;                                                    // 扑翼时钱袋跟着晃
    if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                                   // 待机个性：低头看钱袋，用爪子掂一掂（袋子上跳 1 格，袋口金币闪一下）
      const k = Math.min(4, f12of(lp - 1.6)); P.head = [1, 2, 2, 2, 1][k]; P.bdown = k < 4 ? 1 : 0; P.bagY = [0, -1, 0, -1, 0][k]; P.bagX = 0; P.glint = [0, 1, 0, 2, 0][k]; P.crest = -1;   // 头低 2 格、喙朝下；钱袋第 2 次跳到最高时袋口金币闪白
    }
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                // 扑翼跳飞：4 帧扑翼 + 身体起伏 2 格，一顿一顿；钱袋往后甩
      const f = F.anim.walk(P, tq); P.bob = [2, -1, -2, 1][f]; P.bagX = [-1, 0, 1, 0][f]; P.crest = [-1, 0, 1, 0][f];
      const w = walkDemo(tq, 14, -1); P.mx = w.mx + (w.flip ? 2 * OX : 0); P.flip = w.flip;   // 转身绕身体中心（整只鸟挪过 OX，不能绕站位点翻）
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
    const tie = bagTie(rig); P.gx = R(tie[0]) + P.bx + OX; P.gy = R(tie[1]) + 3;
    if (P.drop) { P.gx = R(-1 + P.dsx) + P.bx + OX; P.gy = -2 - P.dsy; }
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：raggedWing（破羽翼）：B.wing 的羽翼画法 + 缺掉的初级飞羽（缺口露出白色翼指骨）+ 自定翼姿。
  //   w = { span, chord, fingers, missing: [缺的初级飞羽序号，0 = 最外], bone 翼指骨长度（占飞羽长 0–1）}；pose = 翼姿下标（可超出 B.WINGS，用 poses 表）或 [a0, aT, fold]
  //   材质：m.covert / covertFar（覆羽，整块基色 + 前缘 1 格亮边）、m.feather / featherFar（飞羽，整块暗色 + 2 道分隔线）、m.bone / boneFar（翼指骨）
  //   明暗全用手工 tone，不走自动明暗：覆羽 / 飞羽 / 翼指骨三种材质挤在一个部件里，自动明暗会在交界处撒出一片亮暗点
  function raggedWing(x, y, pose, w, far, poses) {
    E.part();
    const Wp = Array.isArray(pose) ? pose : ((poses || B.WINGS)[pose | 0] || B.WINGS[0]), a0 = Wp[0], aT = Wp[1], fold = Wp[2], span = w.span, nf = w.fingers || 3;
    const arm = span * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, tips = [];
    for (let k = 0; k < nf; k++) { const q = nf === 1 ? 1 : k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); tips.push(wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl); }
    const bx = x - (w.chord || 4) * (1 - 0.3 * fold), by = y + 1, fm = far ? m.featherFar : m.feather, bm = far ? m.boneFar : m.bone;
    const cm = far ? m.covertFar : m.covert, lx = tips[2 * nf - 2], ly = tips[2 * nf - 1], mx = lerp(lx, bx, 0.5), my = lerp(ly, by, 0.5) + 1, miss = w.missing || [];
    U.poly(E, [x, y, wx, wy, lx, ly, mx, my, bx, by], fm, 2);                                                         // 飞羽（翼面）：整块暗色
    for (let k = 0; k < nf; k++) {                                                                                    // 初级飞羽：从腕部扇开，羽尖亮一级
      if (miss.includes(k)) continue;
      U.seg(E, wx, wy, tips[2 * k], tips[2 * k + 1], span >= 12 ? 2 : 1, fm, 2); U.dot(E, tips[2 * k], tips[2 * k + 1], fm, 3);
    }
    miss.forEach((k, i) => {                                                                                          // 缺的飞羽：只剩一截白色翼指骨（2–3 格），外面空出缺口
      const e0 = 0.24, e1 = i ? 0.46 : 0.58, tx = tips[2 * k], ty = tips[2 * k + 1];
      U.seg(E, lerp(wx, tx, e0), lerp(wy, ty, e0), lerp(wx, tx, e1), lerp(wy, ty, e1), 1, bm, 3); U.dot(E, lerp(wx, tx, e1), lerp(wy, ty, e1), bm, 4);
    });
    const c1x = lerp(wx, lx, 0.38), c1y = lerp(wy, ly, 0.38), c2x = lerp(x, bx, 0.6), c2y = lerp(y, by, 0.6);
    U.poly(E, [x, y, wx, wy, c1x, c1y, c2x, c2y], cm, 3);                                                            // 覆羽：整块基色（和身体同色）
    U.seg(E, x, y, wx, wy, 1, cm, 4);                                                                                 // 前缘：1 格亮边
    if (!far) for (let k = 1; k <= 2; k++) { const q = k / 3, ax = lerp(c1x, c2x, q), ay = lerp(c1y, c2y, q), ex = lerp(lx, lerp(mx, bx, 0.5), q), ey = lerp(ly, lerp(my, by, 0.5), q); U.seg(E, lerp(ax, ex, 0.25), lerp(ay, ey, 0.25), lerp(ax, ex, 0.75), lerp(ay, ey, 0.75), 1, fm, 3); }   // 飞羽分隔线 2 道
    return { wrist: [wx, wy], tips };
  }
  // 候选部件：moneyBag + bagMouth（扎口钱袋）：(x, y) 扎口中心；sway 下半截摆 -1..1；bulge 鼓胀 -1..2；open 1 = 袋口张开朝上（金币涌出）；
  //   lv 铜扣亮度 0 暗 · 1 亮 · 2 很亮 · 3 爆闪 · 4 熄灭；glint 袋口金币 1 闪亮 · 2 闪白。材质 m.bag（布袋）、m.buckle（铜扣）、m.coin（金币）、m.spec（闪白）
  //   分两个部件：moneyBag 画袋身（绳、褶、补丁），bagMouth 画铜扣和袋口金币——bagMouth 放在爪和身体之后画，金币和铜扣才不会被爪盖住或压成分界线
  const BAG_HW = [2.0, 2.8, 2.8, 1.9];
  function moneyBag(x, y, sway, bulge, open) {
    E.part();
    x = R(x); y = R(y);
    const n = BAG_HW.length + (bulge > 0 ? 1 : 0);
    for (let k = 1; k <= n; k++) {                                                        // 袋身：上窄下鼓，下半截随 sway 摆
      const hw = (BAG_HW[Math.min(BAG_HW.length - 1, k - 1)] || 1) + (k > 1 && k < n ? bulge * 0.55 : 0), cx = x + sway * (k / n) * 1.2;
      for (let i = Math.round(cx - hw); i <= Math.round(cx + hw); i++) U.dot(E, i, y + k, m.bag, 0);
    }
    U.dot(E, x + 1 + R(sway * 0.5), y + 3, m.bag, 1); U.dot(E, x + 2 + R(sway * 0.6), y + 4, m.bag, 1);   // 补丁缝线
    U.dot(E, x - 1 + R(sway * 0.6), y + n - 1, m.bag, 2);
    if (open) { for (let i = -2; i <= 2; i++) U.dot(E, x + i, y, m.bag, Math.abs(i) === 2 ? 4 : 1); return; }   // 袋口张开：外翻的袋口
    for (let i = -1; i <= 1; i++) U.dot(E, x + i, y, m.bag, 2);                              // 扎口的绳
    U.dot(E, x, y - 1, m.bag, 4); U.dot(E, x - 2, y - 1, m.bag, 3); U.dot(E, x + 2, y - 1, m.bag, 3);   // 扎口上面的袋口褶（金币从褶缝里露出来）
  }
  function bagMouth(x, y, open, lv, glint) {
    E.part();
    x = R(x); y = R(y);
    const bm = lv >= 2 && lv < 4 ? M_BUCKLE_HOT : m.buckle, cw = glint === 2 ? m.spec : m.coin, ct = glint ? 4 : 3;
    if (open) {                                                                          // 袋口里的金币往外涌，铜扣挂在袋口边上
      U.dot(E, x - 1, y - 1, m.coin, 4); U.dot(E, x, y - 1, m.coin, 3); U.dot(E, x + 1, y - 1, m.coin, 4); U.dot(E, x, y - 2, cw, ct);
      U.dot(E, x + 2, y + 1, bm, lv >= 1 && lv < 4 ? 4 : 3);
      return;
    }
    U.dot(E, x, y, bm, lv === 4 ? 2 : lv >= 1 ? 4 : 3);                                    // 铜扣（扎口正中 1 格）
    U.dot(E, x - 1, y - 1, cw, ct); U.dot(E, x + 1, y - 1, m.coin, glint ? 4 : 3);         // 袋口露出 2 枚金币
    if (glint) U.dot(E, x + 1, y - 2, m.coin, 4);
  }
  // 摔开的钱袋（落地）：扁的一摊，袋口朝前，金币洒出来
  function bagBurst(x) {
    E.part(); x = R(x);
    for (let i = -3; i <= 2; i++) { U.dot(E, x + i, 0, m.bag, 0); if (i > -3 && i < 2) U.dot(E, x + i, -1, m.bag, 0); if (i > -2 && i < 1) U.dot(E, x + i, -2, m.bag, 0); }
    U.dot(E, x + 3, -1, m.bag, 1); U.dot(E, x + 3, 0, m.bag, 4); U.dot(E, x - 1, -1, m.bag, 1);
    U.dot(E, x + 4, 0, m.coin, 4); U.dot(E, x + 5, 0, m.coin, 3); U.dot(E, x + 4, -1, m.coin, 3); U.dot(E, x + 7, 0, m.coin, 4);
    U.dot(E, x + 1, -2, m.buckle, P.gem === 4 ? 2 : 3);
  }
  // 爪（两只，每只一条细腿 + 1 格钩爪）：从两侧勾住扎口 (tx, ty)——爪尖落在扎口左右各 2 格，不压住中间的铜扣和袋口金币；
  //   empty = 钱袋已脱手，爪空着往下垂（这时 tx, ty 不用）
  function talons(tx, ty, empty) {
    E.part();
    const l = rig.legs;
    for (const [dxo, side, far] of [[1.2, 1, 1], [0, -1, 0]]) {                            // 远侧爪勾前面，近侧爪勾后面（两条腿往下张开，不交叉）
      const x0 = l.x + dxo * 0.8 - 0.5, y0 = l.y, fx = empty ? x0 - 1 : tx + side * 2, fy = empty ? y0 + 3 : ty - 1;
      U.seg(E, x0, y0, fx, fy, 1, m.leg, far ? 2 : 3);
      U.dot(E, fx, fy + 1, m.leg, far ? 1 : 2); if (!far) U.dot(E, fx - side * (empty ? -1 : 0), fy + (empty ? 1 : 2), m.leg, 4);
    }
  }
  // 羽冠（3 根破羽，各自从头顶前 / 中 / 后长出，往上后方翘、长短参差）：画在头之前（根部压在头后面）；根部 2 格宽、尖端 1 格
  const CREST = [[0.4, 3.6, 1.3], [-0.7, 5.2, 1.1], [-1.7, 3.4, 0.9]];                    // [根部在头心前后的格数, 长, 角（从正后方量起，+ 往上）]
  function crest(h) {
    E.part();
    const by0 = h.y - h.r * 0.7, sw = P.crest * 0.18;
    CREST.forEach(([dx, L, a], i) => {
      const A = a + sw * (1 + i * 0.3), c = Math.cos(A), s = Math.sin(A), x0 = h.x + dx, mx = x0 - c * L * 0.5, my = by0 - s * L * 0.5, ex = x0 - c * L, ey = by0 - s * L;
      U.seg(E, x0, by0, mx, my, 2, m.crest, 3); U.seg(E, mx, my, ex, ey, 1, m.crest, i === 1 ? 3 : 2); U.dot(E, ex, ey, m.crest, 4);
    });
  }
  // 肋窗（和身体同一个部件）：身侧一小块羽毛脱落（斜的平行四边形暗洞，7 × 3），洞里 3 根从脊背斜向前下的白肋骨（上端亮），肋骨之间隔 2 格暗绿烂肉
  function ribs() {
    const C = rig.C; if (rig.lie === 2) return;
    const at = (u, v) => U.toW(C.x, C.y, C.a, u, v);
    for (let v = -1; v <= 1; v++) for (let i = 0; i <= 6; i++) { const u = -6 + (v + 1) + i, rib = i % 3 === 0, p = at(u, v); U.dot(E, p[0], p[1], rib ? m.bone : m.head, rib ? (v === -1 ? 4 : 3) : (v === 1 ? 2 : 1)); }
  }
  // 秃颈 + 头（和头同一个部件）：钩喙缺一角；浑浊白眼在头部中后方，眼前、眼上各 1 格深色眼眶（不和喙的亮上缘连成一条）
  const neckBase = () => U.toW(rig.C.x, rig.C.y, rig.C.a, o.rx * 0.62, -o.ry * 0.5);  // 颈根（翎领中心）：胸前上方
  function headNeck() {
    const h = rig.head;
    F.head(E, rig, P, o);
    const nb = neckBase();
    U.seg(E, nb[0], nb[1], h.x - h.r * 0.9, h.y + 0.2, 2, m.head, 0);                    // 秃颈（2 格细，从翎领里往前下探，接在头的后方）
    U.dot(E, h.x - h.r * 0.2, h.y + h.r * 0.85, m.head, 2);                              // 颈褶
    const bx = R(h.x + h.r * 0.7), by = R(h.y + 0.3), jw = P.jaw | 0, bk = P.bdown && !jw ? BEAK_DN : BEAK;   // 骨白钩喙：上缘前角缺了一块
    for (const [i, j, t] of bk) U.dot(E, bx + i, by + j, m.beak, t);
    if (jw) { U.dot(E, bx + 1, by + 1, m.ink, 0); U.dot(E, bx + 2, by + 1, m.ink, 0); U.dot(E, bx, by + 1 + jw, m.beak, 2); U.dot(E, bx + 1, by + 1 + jw, m.beak, 2); }
    else { U.dot(E, bx, by + 1, m.beak, 2); U.dot(E, bx + 1, by + 1, m.beak, 2); }
    if (!P.eyes) { const [ex, ey] = rig.eye; U.dot(E, ex, ey, m.eye, 4); U.dot(E, ex + 1, ey, m.head, 1); U.dot(E, ex, ey - 1, m.head, 1); }   // 白眼芯 + 眼前 / 眼上的深色眼眶
  }
  const BEAK = [[0, -1, 4], [1, -1, 4], [0, 0, 3], [1, 0, 3], [2, 0, 4], [3, 0, 3], [3, 1, 3], [3, 2, 2]];   // 上缘前角缺一格，前端往下勾 2 格（钩尖比下喙低 1 格）
  const BEAK_DN = [[0, -1, 4], [1, -1, 4], [0, 0, 3], [1, 0, 3], [2, 0, 4], [2, 1, 3], [3, 1, 3], [3, 2, 3], [3, 3, 2]];   // 低头看钱袋：喙前半截朝下 1 档
  // 候选部件：ruff（秃鹫翎领）：秃颈根部一圈浅灰蓬松短羽（画在颈之后：盖住颈根，秃颈从翎领前沿探出去）。材质 m.ruff（手工 tone：2 灰蓝 · 3 浅灰 · 4 毛尖）
  //   横过颈根的一团扁椭圆毛领，外沿隔格缺一格（毛边），靠身体一侧暗一级
  function ruff() {
    if (rig.lie === 2) return; E.part();
    const [x0, y0] = neckBase(), h = rig.head, dl = Math.hypot(h.x - x0, h.y - y0) || 1, dx = (h.x - x0) / dl, dy = (h.y - y0) / dl, px = -dy, py = dx, x = x0 - dx * 0.6, y = y0 - dy * 0.6;   // d 沿颈、p 横过颈；毛领中心比颈根往后 0.6 格，露出更多秃颈
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) {                        // 椭圆（沿颈 1.7、横过颈 2.8）：外沿隔格缺一格 = 蓬松的毛边；靠身体的一侧暗一级
      const X = R(x) + i, Y = R(y) + j, u = (X - x) * dx + (Y - y) * dy, v = (X - x) * px + (Y - y) * py, q = (u / 1.7) ** 2 + (v / 2.8) ** 2;
      if (q > 1) continue; const edge = q > 0.55; if (edge && ((X + Y) & 1)) continue;
      U.dot(E, X, Y, m.ruff, u < -0.6 ? 2 : edge && u > 0.3 ? 4 : 3);
    }
  }
  function drawHero() {
    begin(hero, P.bx + OX, 0);
    const r = rig, wp = P.gf >= 0 && !r.lie ? B.FLAP[P.gf] : P.wing, tie = bagTie(r), sway = P.bagX, hang = !P.hold && !P.drop;
    raggedWing(r.wing.x + 3, r.wing.y - 2, wp, WING, 1, WPOSE);
    F.tail(E, r, P, o);
    if (hang) { moneyBag(tie[0], tie[1], sway, P.bulge, 0); talons(tie[0], tie[1], 0); }
    else if (P.drop && r.lie !== 2) talons(0, 0, 1);
    F.body(E, r, P, o); ribs();
    if (hang) bagMouth(tie[0], tie[1], 0, P.gem, P.glint);                               // 铜扣和袋口金币最后画：压在爪前面
    if (P.hold) { moneyBag(tie[0], tie[1], sway, P.bulge, P.open); talons(tie[0], tie[1], 0); bagMouth(tie[0], tie[1], P.open, P.gem, P.glint); }
    raggedWing(r.wing.x, r.wing.y, wp, WING, 0, WPOSE);
    crest(r.head);
    E.part(); headNeck(); ruff();
    if (P.drop === 1) { moneyBag(-1 + P.dsx, -6 - P.dsy, 1, 0, 0); bagMouth(-1 + P.dsx, -6 - P.dsy, 0, P.gem, 0); }
    else if (P.drop === 2) bagBurst(-1 + P.dsx);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  // 金币（技能的金币喷泉 / 金币雨、死亡时摔出的金币）：2×2 金块，翻转时变成 1×2 侧面，落地弹 nb 次（缺省 1）后化成金色尘
  const CN = 40, cOn = new Uint8Array(CN), cX = new Float32Array(CN), cY = new Float32Array(CN), cVX = new Float32Array(CN), cVY = new Float32Array(CN), cB = new Uint8Array(CN), cNB = new Uint8Array(CN), cS = new Uint8Array(CN), cPh = new Uint8Array(CN);
  function coin(x, y, vx, vy, score, nb) { let i = 0; for (; i < CN - 1 && cOn[i]; i++); cOn[i] = 1; cX[i] = x; cY[i] = y; cVX[i] = vx; cVY[i] = vy; cB[i] = 0; cNB[i] = nb || 1; cS[i] = score ? 1 : 0; cPh[i] = (i * 3) & 3; }
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
        if (cB[i] < cNB[i]) { cY[i] = FLOOR - 1; cVY[i] *= cNB[i] > 1 ? -0.55 : -0.38; cVX[i] *= cNB[i] > 1 ? 0.8 : 0.6; cB[i]++; if (cNB[i] > 1) spawn(K_DUST, cX[i], FLOOR - 1, 0, -5, 0.25, R_EL); }   // 落地弹起（死亡掉的金币弹 3 次、越弹越低）
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
  let chargeN = 0, chargeAcc = 0, trailAcc = 0, soulAcc = 0, emberAcc = 0, gT = 9, gX = 0, gY = 0, lastGf = -9, rainDone = 0;
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
      gT = 0; gX = scrX(R(rig.head.x) + 2 + P.bx + OX); gY = HY + R(rig.C.y) - 2;
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
      const x = scrX(-1 + DROP.dx - 3 + OX); for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + (i / 11 - 0.35) * 2.0; coin(x + 2, HY - 3, Math.cos(a) * (55 + Math.random() * 35), Math.sin(a) * (80 + Math.random() * 40), 0, 3); }   // 往前扇形撒出，每枚弹 3 次
      fx.cross(x + 3, HY - 3, 4, R_EL, 0.25, 2); sfx('hit', { mat: 'metal', w: 0.2 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [T_SKY, T_RAIN], [], [INCOMING], [INCOMING + 0.66, T_LAND], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = focusScr();
    if (state === CHARGE) {                                                                // 金色小光点绕钱袋环绕
      chargeAcc += dt * (16 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + Math.random() * 7, a = Math.random() * 6.2832; spawnX(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, { a, r, w: 4 + Math.random() * 3, orbitR: 4 + (chargeN++ % 3) }); }   // 环绕半径 4–6 格
    }
    if (state === MOVE && P.gf !== lastGf) {                                               // 下扑那一帧：身下拖 1 颗羽屑
      if (P.gf === 2) spawn(K_TRAIL, scrX(-2 + OX), HY + R(rig.C.y) + 4, (P.flip ? 1 : -1) * (10 + Math.random() * 8), 6 + Math.random() * 4, 0.45 + Math.random() * 0.25, R_FEATHER);
      lastGf = P.gf;
    }
    if (state === IDLE && P.glint) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 3, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === RECOVER) { emberAcc += dt * 6; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, gx, gy - 2, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.4 + Math.random() * 0.3, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) {                // 魂光金
      soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_EL); }
    }
    stepCoins(dt); gT += dt;
  }
  function fxReset() { chargeN = 0; chargeAcc = 0; trailAcc = 0; soulAcc = 0; emberAcc = 0; gT = 9; lastGf = -9; rainDone = 0; cOn.fill(0); }
  function fxBack(f12) {
    if (P.dq < 0.6 && rig.lie !== 2) groundShadow(scrX(R(rig.C.x) + OX), 7, -rig.C.y);
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
      const [gx, gy] = focusScr(), x = gx + 2, y = gy - 2, big = P.gem === 2 && E.state === CHARGE && (f12 % 4) === 1, L = P.gem === 3 ? 5 : big ? 4 : 2 + (f12 & 1);   // 2 档时每 4 帧有 1 帧十字星芒
      if (big) put(x, y, 21);
      for (let r = big ? 1 : 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(x + r, y, c); put(x - r, y, c); put(x, y - r, c); put(x, y + r, c); }
    }
    drawCoins(f12);
  }

  return {
    name: '飞鹰', HX, R_EL, DUR, hero, P, GLOW_MATS: [M_BUCKLE_HOT], HIT_POINT, EVENTS, REVIVE: { ramp: R_EL, dy: -16 },
    SFX: { body: 'beast', how: 'collapse', pal: 'coin', style: 'coin', w: 0.25, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
