// 铁甲战士（部队 · 僵尸 · 先锋 · 优质）：敦实的重装僵尸，头上倒扣一只锈铁水桶（凿一个眼洞透出酸绿眼，桶下露出腐烂的下颌骨），
// 前手竖持一块铁包棺材盖当盾（上宽下窄的长六边形，盖面铁十字补丁），后手反提铁撬棍（弯钩从盾沿后面探出），胸前铁板钉在灰绿皮肉上，腰间挂一串棺材钉。
// 攻击 = 勾砸：盾往前一顶，撬棍越过盾沿由上往下勾砸；技能 = 特性「硬化」：开战时把盾砸进地里，灰绿皮肉从脚往上一段段变成铁灰，收招关节喷蒸汽（之后虚弱一波的代价）。
// 升级成「钢铁军阀」（SteelWarlord.js）：同一个僵尸——水桶的提梁环、酸绿眼、灰绿皮肉 + 铆钉还在，棺材盖长成了全身铁处女外壳，撬棍长成战镐。
PCD.define('IroncladWarrior', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_SPIRAL_PT,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, FL = (v) => Math.floor(v + 1e-6), HALF = Math.PI / 2;
  const px = parts.px, run = parts.run;

  // ───── 元素：守护 · 锈铁硬化（FXI.steel 白 → 冷白 → 亮钢 → 钢 → 暗钢），蓄力时混 dust 锈屑；魂光 / 尸气酸绿（poison）─────
  const R_EL = FXI.steel, EL = FXR[R_EL], R_IMP = FXI.impact, R_SOUL = FXI.poison, R_DUST = FXI.dust;

  // ───── 材质（parts.mats：名字D = 暗一级）─────
  const M = parts.mats(E, {
    rust: ['#170d0a', '#3a1f16', '#63392a', '#8c5a3c'],            // 主材质：锈褐铁板（胸甲、桶盔、肩甲、靴）
    iron: 'iron', bar: [0, 28, 29, 30], wood: { r: 'wood', band: 2 }, bone: 'bone', rivet: 'steel',   // bar：撬棍 / 包边 / 提梁（iron 往亮挪一级，细杆在夜色里读得出来）
    skin: ['#1c2414', '#4a5a36', '#7a8f5c', '#a3b682'],             // 尸绿灰（僵尸人形共用）
    hard: 'steel',                                                  // 硬化后的铁灰皮肉
    eye: { r: [48, 49, 50, 38], flat: 1 },                          // 酸绿眼（发光体）
    cross: { r: [27, 29, 30, 21], flat: 1 },                        // 盾面十字补丁发光档
  });
  const BODY = { body: 'stocky', leg: 7, torso: 9, sw: 5, limb: 1.3, fall: 'back' };
  const R0 = parts.rig({}, BODY);
  const BAR = { hand: 'B', head: 'crook', metal: M.bar, wood: M.bar, len: 9, back: 4 };   // 铁撬棍：直柄 + 一端弯钩（借 crook 头，全铁）
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 52, 38, 46);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 13, 17], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['iron', 'bar', 'bone', 'eye', 'cross', 'skin', 'rivet']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 棺材盖盾（盾心 = 手 +(1, 1)），后手 = 撬棍 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, st: 0, jaw: 0, hard: 0, lid: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, ba, lean, head, crouch) => ({ hx, hy, bhx, bhy, ba, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(9, -12, 8, -14, 0.2);                       // 盾竖在身前，撬棍藏在盾后、弯钩从盾沿上面探出
  const K_WALK = K(9, -13, 8, -15, 0.25);
  const K_WIND = K(7, -12, 1, -20, -0.7, -1, 0, 1);            // 盾收回、撬棍抡到脑后
  const K_STRIKE = K(9, -13, 8, -24, 2.0, 1, 1, 1);            // 盾往前顶，撬棍越过盾沿勾砸下来（弯钩朝下）
  const K_HOLD = K(9, -13, 8, -23, 2.15, 1, 0, 1);
  const K_CROUCH = K(9, -12, 7, -12, 0.15, 1, -1, 2);          // 蓄力：半蹲缩到盾后
  const K_SLAM = K(9, -12, 7, -12, 0.15, 1, -1, 3);            // 施放：盾砸进地里 2 格
  const K_HURT = K(7, -12, 6, -12, -0.1, -1, -1);
  const K_KNEEL = K(9, -14, 6, -10, 0.6, 1, 1, 4);             // 跪倒，盾撑在地上
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['jaw', 0, 1], ['hard', 0, 3], ['lid', 0, 5]]);
  const W4 = [0, 1, 0, -1], JAW = [0, 1, 1, 0], T_STRIKE = 2 / 12, T_LAND = INCOMING + 0.66, T_SLAMLID = INCOMING + 0.75;
  const TAP = [0.5, 0.75, 0.38, 0.75, 0.3];                   // 待机个性：撬棍往前一倒，杆身敲在盾沿上角，两下
  // 硬化高光带：施放第 1 帧起每帧上移 4 格（从脚到头），带经过的地方皮肉变铁灰
  const bandY = (st, tq) => (st === CAST ? (FL(tq * 12) >= 1 ? -4 * FL(tq * 12) : 99) : st === RECOVER ? -4 * (6 + FL(tq * 12)) : 99);
  const hardOf = (by) => (by <= -17 ? 3 : by <= -12 ? 2 : by <= -3 ? 1 : 0);

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.jaw = 0; P.hard = 0; P.lid = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = FL(TT * 2.5); P.bob = b & 1; P.beard = W4[(b + 1) & 3]; P.jaw = JAW[b & 3]; P.sway = W4[FL(TT * 1.25) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { const f = FL((lp - 1.6) * 12); P.ba = TAP[f]; P.glint = (f === 1 || f === 3) ? 1 : 0; P.jaw = 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 行军重步：盾稳在身前，撬棍随步子点头，接触帧顿挫 1 格
      setK(K_WALK, K_WALK, 0); parts.gait(P, E.gait(tq)); P.ba += P.step * 0.1; P.hx += P.step * 0.4;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; P.jaw = 1; }
      else if (tq < 0.2) { setK(K_STRIKE, K_STRIKE, 0); P.bx = 3; P.beard = -2; P.sway = -1; P.glint = 1; P.jaw = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_STRIKE, K_HOLD, q); P.bx = 3; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 缩到盾后，十字补丁逐档变亮，后半段咬紧牙发抖
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CROUCH, q);
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.beard = -1;
      if (tq >= 0.9) { P.bx = (f12 & 1) ? 1 : 0; P.beard = (f12 & 1) ? 1 : -1; }
    } else if (st === CAST) {                                          // 盾砸进地里（定格），高光带从脚往上扫
      setK(K_SLAM, K_SLAM, 0); P.gem = 3; P.rim = 3; P.flash = tq < 1 / 12 ? 1 : 0; P.beard = 2; P.jaw = 1; P.hard = hardOf(bandY(CAST, tq));
    } else if (st === RECOVER) {                                       // 起身，关节喷蒸汽，铁灰一段段褪回去
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SLAM, K_IDLE, q);
      P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.jaw = tq < 0.3 ? 1 : 0;
      P.hard = tq < 0.35 ? hardOf(bandY(RECOVER, tq)) : tq < 0.45 ? 2 : tq < 0.55 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.beard = 3; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.jaw = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 跪倒 → 撬棍脱手 → 仰倒 → 棺材盖向后倒下盖在身上 → 盖缝冒尸气 → 消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.beard = 3; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.jaw = 1; P.beard = 1; P.hatX = d < 0.42 ? 1 : 2; }      // hatX：撬棍脱手（1 下落中 · 2 落地）
      else {
        setK(K_IDLE, K_IDLE, 0); P.lying = 1; P.bx = -1; P.jaw = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.crouch = 0; P.lean = 0; P.head = 0; P.hatX = 2;
        P.hx = R0.sFx + 2; P.hy = R0.yWaist; P.bhx = R0.sBx + 1; P.bhy = R0.yWaist + 1;
        P.lid = d < 0.58 ? 1 : d < 0.66 ? 2 : d < 0.75 ? 3 : 4;
        P.gem = 4; P.eyes = d < 1.0 ? ((f12 & 1) ? 0 : 1) : d < 1.3 ? ((f12 % 3) === 0 ? 0 : 1) : 1;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ba = RD(P.ba / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { P.gx = -15 + P.bx; P.gy = -6; }                    // 倒地：发光体 = 桶盔里的眼（只用来挂魂光）
    else { P.gx = P.hx + 1 + P.bx; P.gy = P.hy + 1 - 5; }             // 发光体 = 盾面十字补丁的交叉点
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 候选部件 ─────
  // 候选部件：coffinLid 棺材盖盾——铁包木芯、上宽下窄的长六边形（20 行、最宽 9 格），盾面朝镜头：一圈铁包边（每 3 行一颗钢铆钉）、
  //   木芯竖板缝、上半一块铁十字补丁（发光档读 P.gem：0 铁 · 1–3 逐档变亮 · 4 熄灭）。
  //   o = { at [x, y] 盾心（第 9 行中间）, rot 0 竖持 | 3 横躺（头端朝左）, free 1 = 不跟身体转, face 木, rim 包边, rivet 铆钉, cross 十字（铁）, lit 十字发光材质 }
  //   一个部件。返回 { center, rivets: [[x, y] …] }（精灵本地坐标）。
  const LID_HW = [2, 3, 3, 4, 4, 4, 4, 4, 4, 4, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2], LID_C = 9;
  const hwAt = (r) => (r < 0 || r >= LID_HW.length ? -1 : LID_HW[r]);
  function coffinLid(E, R, P, o) {
    const cx = RD(o.at[0]), cy = RD(o.at[1]), r0 = (o.rot || 0) & 3;
    const T = o.free ? { r0, tx: cx, ty: cy, rot: 0, ox: 0, oy: 0 } : { r0, tx: R.tx + cx, ty: R.ty + cy, rot: R.rot, ox: R.ox, oy: R.oy };
    const lv = Math.max(0, Math.min(4, o.glowLv != null ? o.glowLv : P.gem || 0)), riv = [];
    E.part();
    for (let r = 0; r < LID_HW.length; r++) {
      const w = LID_HW[r], v = r - LID_C;
      for (let u = -w; u <= w; u++) {
        const au = Math.abs(u), edge = r === 0 || r === LID_HW.length - 1 || au === w || au > hwAt(r - 1) || au > hwAt(r + 1);
        const cross = (u === 0 && r >= 2 && r <= 9) || (r === 4 && au <= 2);
        if (edge) {
          if (au === w && (r % 3) === 1) { px(E, T, u, v, o.rivet, 4); riv.push(parts.toSprite(T, u, v)); }
          else px(E, T, u, v, o.rim, 0);
        } else if (cross) {
          const end = (u === 0 && (r === 2 || r === 9)) || (r === 4 && au === 2);
          if (end && lv === 0) { px(E, T, u, v, o.rivet, 4); riv.push(parts.toSprite(T, u, v)); }
          else if (lv === 0) px(E, T, u, v, o.cross, 0);
          else px(E, T, u, v, o.lit, lv === 4 ? 1 : lv === 1 ? 3 : lv === 2 ? ((u === 0 && r === 4) || end ? 4 : 3) : 4);
        } else px(E, T, u, v, o.face, (au === 2 && r > 0 && r < 18) ? 2 : 0);   // 竖板缝
      }
    }
    if (P.glint && lv === 0) px(E, T, -1, 3 - LID_C, o.rivet, 4);
    return { center: parts.toSprite(T, 0, 0), rivets: riv };
  }
  // 候选部件：bucketHelm 倒扣的铁水桶盔——上窄下宽的梯形桶身盖到鼻梁（6 行），顶上一圈桶底棱、中间一道箍、下沿卷边（铁），
  //   前面凿一个眼洞（1 格发光眼）；侧面的耳座挂着提梁弯环（下一个部件，垂在脑后，随 P.beard 摆）。o = { mat 桶身, rim 卷边 / 提梁, eye 眼光材质, eyeLv 0 暗 · 1 常亮 · 2 亮 }
  function bucketHelm(E, R, P, o) {
    const T = R, x0 = R.hx0, x1 = R.hx1, y0 = R.htop - 2, ey = R.ey, m = o.mat;
    E.part();
    lowerFace(E, R, P, o.skin);                                        // 桶沿下露出的下半张脸和桶同一部件：不在桶沿下压一条分界线（否则上牙那一行全黑）
    const rows = [[x0 + 1, x1 - 1], [x0, x1], [x0, x1], [x0 - 1, x1 + 1], [x0 - 1, x1 + 1], [x0 - 2, x1 + 2]];   // 桶底 → 桶口（外翻的卷边）
    for (let k = 0; k < 6; k++) run(E, T, y0 + k, rows[k][0], rows[k][1], k === 5 ? o.rim : m, 0);
    run(E, T, y0 + 2, x0 + 1, x1 - 1, m, 2);                                                   // 箍
    px(E, T, x0 + 1, y0, m, 4); px(E, T, x0 + 2, y0, m, 4); px(E, T, x0, y0 + 1, m, 4); px(E, T, x0 - 1, y0 + 3, m, 4);   // 左上受光的棱
    px(E, T, x0 + 1, y0 + 4, m, 2);                                                            // 锈斑凹坑
    px(E, T, x1, ey, o.eye, o.eyeLv === 0 ? 1 : o.eyeLv === 2 ? 4 : 3);                       // 眼洞里的酸绿眼
    px(E, T, x1 - 1, ey, m, 1);                                                                // 洞沿
    px(E, T, x0 - 1, y0 + 5, o.rim, 4); px(E, T, x0, y0 + 5, o.rim, 4);
    // 提梁弯环：从桶身后上角绕到脑后、垂到桶口下面（下半段随 P.beard 摆）；耳座是桶身侧面一颗亮铆钉
    px(E, T, x0 + 1, y0 + 3, o.rim, 4);
    E.part();
    const sw = RD((P.beard || 0) * 0.5);
    const loop = [[x0 - 1, y0 + 1], [x0 - 2, y0 + 2], [x0 - 3, y0 + 3], [x0 - 4, y0 + 4], [x0 - 4, y0 + 6], [x0 - 3, y0 + 7]];
    for (let i = 0; i < loop.length; i++) px(E, T, loop[i][0] + (i >= 4 ? sw : 0), loop[i][1], o.rim, i < 2 ? 4 : 3);
  }
  // 腐烂的下半张脸（画在桶盔的部件里）：桶沿下面露出两行——上牙行、下颌骨行；下颌一张一合（P.jaw 1 = 张开：上牙行变成黑洞，只剩一颗獠牙）
  function lowerFace(E, R, P, sk) {
    const T = R, x0 = R.hx0, x1 = R.hx1, bot = R.hy, ty = bot - 1;
    run(E, T, ty, x0, x1 - 2, sk, 0); run(E, T, bot, x0 + 1, x1 - 3, sk, 0); px(E, T, x0 + 1, ty, sk, 2);       // 腐肉脸颊（一处凹陷）
    if (P.jaw) { run(E, T, ty, x1 - 1, x1 + 1, sk, 1); px(E, T, x1, ty, M.bone, 4); }                          // 张嘴：黑洞 + 一颗獠牙
    else { px(E, T, x1 - 1, ty, M.bone, 4); px(E, T, x1, ty, M.bone, 3); px(E, T, x1 + 1, ty, M.bone, 4); }   // 上牙
    run(E, T, bot, x1 - 2, x1 + 1, M.bone, 0); px(E, T, x1 - 2, bot, M.bone, 2); px(E, T, x1 + 1, bot, M.bone, 4);   // 下颌骨（前端翘出 1 格）
  }
  // 候选部件：nailString 腰间一串棺材钉——腰带后侧垂下的皮绳上挂 3 根钉头朝上的长钉（钉头 1 格亮 + 钉身 2 格），随 P.sway 摆
  function nailString(E, R, P, m) {
    const T = R, y = R.yWaist + 1, e = parts.edges(R, R.yWaist), s = RD((P.sway || 0) * 0.5);
    E.part();
    for (let i = 0; i < 3; i++) {
      const x = e[0] - 1 + i * 2, yy = y + (i === 1 ? 1 : 0);
      px(E, T, x, yy, m, 4); px(E, T, x, yy + 1, m, 3); px(E, T, x + (i === 0 ? s : 0), yy + 2, m, 2);
    }
  }

  // 盾侧的大号圆肩甲：比部件库的 round 低一行（僵尸没有脖子，肩甲不能顶住下颌），4 行、6 格宽，边沿一颗钢铆钉
  function pauldron(E, R, m) {
    const T = R, x = R.sFx, y = R.sFy;
    E.part();
    run(E, T, y - 1, x - 1, x + 1, m, 0); run(E, T, y, x - 2, x + 2, m, 0); run(E, T, y + 1, x - 2, x + 3, m, 0); run(E, T, y + 2, x - 2, x + 3, m, 2);
    px(E, T, x - 1, y, m, 4); px(E, T, x + 2, y + 1, M.rivet, 4);
  }

  // ───── 画（部件从后往前）─────
  function lidAt() { return [P.hx + 1, P.hy + 1]; }
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, BODY), H = P.hard, dead = P.st === DEATH;
    const legSk = H >= 1 ? M.hard : M.skin, legSkD = H >= 1 ? M.hardD : M.skinD, armSk = H >= 2 ? M.hard : M.skin, armSkD = H >= 2 ? M.hardD : M.skinD, jawSk = H >= 3 ? M.hard : M.skin;
    const LID = { face: M.wood, rim: M.bar, rivet: M.rivet, cross: M.bar, lit: M.cross };
    // 后手武器：撬棍（死亡时脱手：P.hatX 1 下落中 · 2 落在身前地上）
    if (dead && P.hatX === 1) parts.axe(E, R, P, Object.assign({}, BAR, { free: 1, at: [14, -6], a: -2.4 }));
    else if (dead && P.hatX === 2) parts.axe(E, R, P, Object.assign({}, BAR, { free: 1, at: [24, -1], a: -HALF }));
    else parts.axe(E, R, P, BAR);
    const sealed = dead && P.lid >= 4;                                 // 棺材盖扣下以后：躯干、手臂都在盖子下面，只露出头端的桶盔和脚端的靴子
    if (!sealed) parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: armSkD, cuff: M.barD, cuffStyle: 'bracer', hand: armSkD, grip: 'fist' });
    parts.legs(E, R, P, { style: 'boot', mat: legSk, matD: legSkD, boot: M.rust, bootD: M.rustD, bootH: 3 });
    const tor = sealed ? null : parts.torso(E, R, P, { style: 'bare', mat: armSk, belt: M.iron, buckle: M.rivet });
    if (tor) {                                                                  // 铁板一块块钉在灰绿皮肉上：胸板、腹板、胯甲；板缝里露出皮肉 + 缝线，板角钢铆钉（和躯干同一部件）
      const LL = tor.rows[0], RR = tor.rows[1], y0 = tor.y0, Lx = (y) => LL[Math.max(0, Math.min(LL.length - 1, y - y0))], Rx = (y) => RR[Math.max(0, Math.min(RR.length - 1, y - y0))];
      const yS = R.yS, yW = R.yWaist, yH = R.yHip;
      for (let y = yS + 1; y <= yS + 3; y++) run(E, R, y, Lx(y) + 1, Rx(y) - 1, M.rust, 0);                  // 胸板
      for (let y = yW + 1; y <= yH; y++) run(E, R, y, Lx(y) + 1 + (y === yH ? 1 : 0), Rx(y) - (y === yH ? 2 : 0), M.rust, 0);   // 腹板
      for (let y = yH + 1; y <= yH + 2; y++) run(E, R, y, Lx(yH) + (y - yH), Rx(yH) - 1 - (y - yH), M.rust, 0);   // 胯甲
      px(E, R, Lx(yS + 1) + 1, yS + 1, M.rust, 4); px(E, R, Lx(yW + 1) + 1, yW + 1, M.rust, 4);
      const sx = RD((Lx(yS + 4) + Rx(yS + 4)) / 2);                    // 胸腹之间一道皮肉缝，缝线横跨
      for (let x = Lx(yS + 4) + 1; x < Rx(yS + 4); x++) px(E, R, x, yS + 4, armSk, ((x - sx) & 1) ? 1 : 2);
      for (const [x, y] of [[Lx(yS + 1) + 2, yS + 2], [Rx(yS + 1) - 2, yS + 2], [Rx(yW + 1) - 2, yW + 2], [Lx(yH) + 3, yH + 1]]) px(E, R, x, y, M.rivet, 4);
    }
    if (!sealed) nailString(E, R, P, M.bar);
    bucketHelm(E, R, P, { mat: M.rust, rim: M.bar, skin: jawSk, eye: M.eye, eyeLv: P.eyes || P.gem === 4 ? 0 : P.gem >= 2 ? 2 : 1 });
    const hideArm = dead && P.lid >= 3;                                // 棺材盖扣下后，前臂在盖子下面
    if (!hideArm) { parts.arm(E, R, P, { sleeve: 'bare', mat: armSk, cuff: M.bar, cuffStyle: 'bracer', hand: armSk, grip: 'fist' }); pauldron(E, R, M.bar); }
    if (!dead || P.lid === 0) coffinLid(E, R, P, Object.assign({ at: lidAt() }, LID));
    else if (P.lid === 1) coffinLid(E, R, P, Object.assign({ at: [11, -10], free: 1 }, LID));
    else if (P.lid === 2) coffinLid(E, R, P, Object.assign({ at: [4, -14], free: 1, rot: 3 }, LID));
    else if (P.lid === 3) coffinLid(E, R, P, Object.assign({ at: [-2, -9], free: 1, rot: 3 }, LID));
    else coffinLid(E, R, P, Object.assign({ at: [-4, -4], free: 1, rot: 3 }, LID));
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let ghostT = 9, chargeAcc = 0, steamAcc = 0, gasAcc = 0, soulAcc = 0, lastStep = 0, lastTap = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function lidRivets() {                                              // 盾上铆钉的屏幕坐标（施放时逐颗白闪）：和 coffinLid 同一套几何
    const c = lidAt(), out = [];
    for (let r = 0; r < LID_HW.length; r++) if ((r % 3) === 1) for (const s of [-1, 1]) out.push([c[0] + s * LID_HW[r] + P.bx, c[1] + r - LID_C]);
    out.push([c[0] + P.bx, c[1] + 2 - LID_C], [c[0] + P.bx, c[1]], [c[0] - 2 + P.bx, c[1] + 4 - LID_C], [c[0] + 2 + P.bx, c[1] + 4 - LID_C]);
    return out;
  }
  function onEnter(s) {
    if (s === RECOVER) {                                               // 护罩碎成点：沿半椭圆落下的钢屑
      for (let k = 0; k <= 30; k++) { const a = Math.PI + k / 30 * Math.PI, x = wx(4) + Math.cos(a) * 17, y = HY + Math.sin(a) * 30; spawn(K_DUST, x, y, Math.cos(a) * 14, 6 + Math.random() * 14, 0.45 + Math.random() * 0.35, R_EL); }
    }
    if (s !== CAST) return;                                            // 盾砸地：两道地裂 + 冲击环 + 地面碎屑，震屏、天空闪白
    const c = lidAt(), x = wx(c[0] + P.bx), y = HY;
    fx.crack(x + 5, y + 1, 18, 1, R_EL, 1.0); fx.crack(x - 5, y + 1, 18, -1, R_EL, 1.0);
    ring(x, y - 3, 1, R_EL); burst(x, y - 2, 24, 40, 110, 0.3, 0.7, R_EL, 30); burst(x, y - 1, 12, 20, 60, 0.3, 0.6, R_DUST, 14);
    fx.cross(wx(P.gx), wy(P.gy), 7, R_EL, 0.3);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                              // 勾砸：残影（后引那一帧）+ 从脑后越过盾沿的弧 + 钩尖命中
      poseAt(ATTACK, 0.12, 0.12); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = hero.k2 = -1; poseAt(ATTACK, t, t); ghostT = 0;
      const sx = wx(R0.sBx + 5 + P.bx), sy = wy(R0.sBy - 6);
      fx.slash(sx, sy, 13, K_WIND.ba + 0.3, K_STRIKE.ba + 0.2, R_IMP, 0.17, 2, 2);
      const hx = DUMMY_X - 3, hy = HY - 16;
      hitDummy(0); burst(hx, hy, 14, 40, 110, 0.15, 0.4, R_IMP, 10); fx.cross(hx, hy, 4, R_IMP, 0.2);
      for (let i = 0; i < 3; i++) spawn(K_DUST, wx(6) + Math.random() * 3, HY, -20 - Math.random() * 20, -5 - Math.random() * 5, 0.3, R_DUST);
      sfx('swing', { kind: 'smash', w: 0.6 }); sfx('hit', { mat: 'metal', w: 0.65 });
    }
    if (s === CAST && Math.abs(t - 2 / 12) < 1e-9) {                   // 高光带扫过身体的同时，点阵护罩从身后亮起
      fx.dome(wx(4), HY, 17, 30, R_EL, 0.42, 2); burst(wx(4), HY - 28, 8, 20, 50, 0.2, 0.4, R_EL, 0);
      sfx('impact', { pal: 'metal', w: 0.75 });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 12; i++) spawn(K_DUST, HX - 18 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, R_DUST); shake(0.1, 1); sfx('fall', { w: 0.55 }); }
    if (s === DEATH && Math.abs(t - T_SLAMLID) < 1e-9) {              // 棺材盖扣下：哐——
      for (let i = 0; i < 18; i++) spawn(K_DUST, HX - 16 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 44, -6 - Math.random() * 14, 0.4 + Math.random() * 0.5, R_DUST);
      burst(wx(-4), HY - 8, 8, 30, 70, 0.15, 0.3, R_IMP, 10); shake(0.14, 1); sfx('fall', { w: 0.8 });
    }
  }
  const EVENTS = [[], [], [T_STRIKE], [], [2 / 12], [], [], [T_LAND, T_SLAMLID], []];
  function hurtFx(s) {                                                 // 敌弹打在铁包棺材盖上：更多白金火花 + 几点锈灰
    const hx = HX + 13, hy = HY - 13; burst(hx, hy, s === DEATH ? 22 : 14, 50, 130, 0.2, 0.5, R_IMP, 20); burst(hx, hy, s === DEATH ? 9 : 6, 70, 150, 0.35, 0.65, R_EL, 30);
    burst(hx - 2, hy, 5, 20, 50, 0.3, 0.6, R_DUST, 5); shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                            // 地上的铁屑和锈渣螺旋收拢到盾面的十字上
      chargeAcc += dt * (22 + 34 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const a = 0.25 + Math.random() * (Math.PI - 0.5), r = 15 + Math.random() * 10; spawn(K_SPIRAL_PT, wx(P.gx), wy(P.gy), r / (0.35 + Math.random() * 0.35), 0, 9, Math.random() < 0.6 ? R_EL : R_DUST, a, r, (Math.random() - 0.5) * 4); }
    }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 0.75 }); for (let i = 0; i < 3; i++) spawn(K_DUST, wx(P.step > 0 ? 4 : -3) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 20, -4 - Math.random() * 7, 0.3 + Math.random() * 0.25, R_DUST); }
      lastStep = P.step;
    }
    if (state === IDLE) {                                              // 撬棍敲盾沿：两下火星
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? FL((lp - 1.6) * 12) : -1;
      if (f !== lastTap) { if (f === 1 || f === 3) { const c = lidAt(); burst(wx(c[0] + 3), wy(c[1] - LID_C + 1), 5, 20, 45, 0.1, 0.25, R_IMP, 12); } lastTap = f; }
    }
    if (state === RECOVER && stT > 0.05 && stT < 0.6) {                // 关节缝喷出 3 股白蒸汽（颈、肘、膝），慢慢往上飘
      steamAcc += dt * 45;
      while (steamAcc >= 1) { steamAcc -= 1; const j = FL(Math.random() * 3), jx = [-2, -6, -3][j], jy = [-17, -12, -5][j];
        spawnX(K_RISE, wx(jx) + (Math.random() - 0.5) * 2, wy(jy), (j === 1 ? -10 : -4) + (Math.random() - 0.5) * 5, -9 - Math.random() * 9, 0.6 + Math.random() * 0.5, R_DUST, { sz: Math.random() < 0.35 ? 2 : 1 }); }
    }
    if (state === DEATH && stT > INCOMING + 0.8 && stT < INCOMING + 1.45) {   // 盖缝冒出一股尸气
      gasAcc += dt * 22; while (gasAcc >= 1) { gasAcc -= 1; spawn(K_RISE, HX - 16 + Math.random() * 22, HY - 9 - Math.random() * 2, (Math.random() - 0.5) * 8, -6 - Math.random() * 10, 0.6 + Math.random() * 0.6, R_SOUL); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 26, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, R_SOUL); } }
    ghostT += dt;
  }
  function fxReset() { ghostT = 9; chargeAcc = 0; steamAcc = 0; gasAcc = 0; soulAcc = 0; lastStep = 0; lastTap = -1; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() { if (ghostT < 0.25) blitShape(ghost, HX + P.mx, HY, P.flip, ghostT < 1 / 12 ? 29 : 28, clamp01(ghostT / 0.25)); }   // 勾砸残影（冷钢剪影）
  function fxFront(f12) {
    const st = E.state, tq = q12(E.stT), by = bandY(st, tq);
    if (by < 50 && by > -34) {                                         // 硬化高光带：扫过角色自己的像素（白 → 冷白 → 亮钢三行）
      const s = hero, x0 = HX + P.mx - s.ox;
      for (let k = 0; k < 3; k++) { const y = by + k, row = y + s.oy; if (row < 0 || row >= s.h) continue; for (let x = 0; x < s.w; x++) if (s.out[row * s.w + x] !== 255) put(x0 + x, HY + y, EL[k]); }
    }
    if (st === CAST || (st === RECOVER && tq < 3 / 12)) {             // 铆钉随高光带逐颗白闪
      for (const r of lidRivets()) { const d = r[1] - by; if (d >= -1 && d <= 3) { const x = wx(r[0]), y = wy(r[1]); put(x, y, EL[0]); if (d <= 1) { put(x - 1, y, EL[1]); put(x + 1, y, EL[1]); put(x, y - 1, EL[1]); put(x, y + 1, EL[1]); } } }
    }
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) {           // 十字补丁的星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '铁甲战士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.cross, M.eye], HIT_POINT: [11, -13], EVENTS,
    REVIVE: { ramp: R_SOUL },
    SFX: { body: 'armor', how: 'collapse', pal: 'metal', style: 'shield', w: 0.75 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront, hurtFx,
  };
});
