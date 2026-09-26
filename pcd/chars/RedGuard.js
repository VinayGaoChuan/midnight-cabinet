// 赤卫（部队 · 精灵 · 先锋 · 优质 · batch-09）：少年重甲的精灵幼体——大号护鼻尖盔 + 高红缨、背后一对被红布层层裹住的翅芽、
// 左臂一面几乎遮住半身的赤红鸢形盾（盾心暗红结晶）、右手叶形短矛；身上带伤缠绷带。
// 攻击 = 从盾沿上方单手探矛前刺；技能 = 特性「细胞再生」生效：3 道裂伤由下往上变亮、心跳冲击环、裂伤合拢成白线、头顶飘出红粉十字。
// 升级成「圣光骑士」（HolyLightKnight.js）：同一个个体——翅芽破茧展开成羽翼，保留红缨尖盔、鸢形盾、叶形矛（长成圣光长枪）。
PCD.define('RedGuard', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, ASTEP, copySprite, blitShape, outlineSprite,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_SPIRAL_PT,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round, HALF = Math.PI / 2;

  // ───── 元素：血肉再生 · 赤粉（blood：白 → 淡粉 → 红 → 暗红 → 酒红）；治疗图案（十字 + 上升）─────
  const R_EL = FXI.blood, EL = FXR[R_EL], R_IMP = FXI.impact, R_STEEL = FXI.steel;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    armor: 'crimson', gold: 'gold', steel: 'steel', iron: 'iron', skin: 'skin', wood: 'wood', belt: 'leather',
    wrap: 'white',                                                 // 绷带
    cloth: [11, 12, 12, 13], crest: 'blood',                       // 翅芽裹布（crimson 暗段：深酒红，和亮红的红缨、赤红漆甲都拉开）、红缨
    ink: { r: 'ink', flat: 1 },
    gem: { r: [55, 56, 57, 58], flat: 1 },                         // 盾心暗红结晶 / 伤口透光（发光体）
    hot: { r: [57, 58, 21, 21], flat: 1 },                         // 结晶施放档、裂伤合拢的白线
    bootN: 'steel', bootF: [0, 0, 27, 28],                         // 近侧靴（亮钢）/ 远侧靴（近黑铁）：接触 A、B 前面那只靴子色阶对调，剪影行也看得出换脚
  });
  const BODY = { body: 'child', sw: 4, limb: 1.3, head: 7, headW: 7, arm: 7, fall: 'back' };   // 孩童比例（大头盔、短腿），肩膀厚、甲偏大
  const BODY_LOOK = Object.assign({}, BODY, { neck: -1 });      // 待机个性：头低 1 格
  const BODY_WALK = Object.assign({}, BODY, { stride: 3, leg: 6 });   // 行军：站直、腿伸长 1 行、步子放开到 3 格——胫甲在靴子上方露出 2–3 行
  const SPEAR = { style: 'leaf', hand: 'B', wood: M.wood, metal: M.steel, trim: M.gold, tassel: M.crest, len: 8, back: 4 };
  const HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(84, 52, 38, 48);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'skin', 'wrap', 'ink', 'steel']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 鸢形盾（盾心 = 手 +1），后手 = 叶形矛 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, ba: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, wound: 0, bud: 0, look: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, ba, lean, head, crouch) => ({ hx, hy, bhx, bhy, ba, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -7, 6, -9, 0, 0, 0, 1);                    // 半蹲缩在盾后，矛竖在盾后
  const K_LOOK = K(6, -6, 6, -9, 0, 0, 1, 1);                    // 待机个性：盾往外让一点，低头看胸前绷带
  const K_WIND = K(4, -7, 1, -12, 1.1, -1, 0, 2);                // 矛后引、身体后缩
  const K_THRUST = K(6, -5, 7, -12, HALF, 1, 1, 0);              // 从盾沿上方探矛前刺
  const K_HOLD = K(6, -6, 6, -12, HALF, 1, 0, 0);
  const K_BRACE = K(6, -6, 4, -10, 0.2, 0, 0, 2);                // 蓄力：蹲在盾后，伤口一道道亮起
  const K_PULSE = K(7, -8, 4, -12, -0.2, -1, -1, 0);             // 施放：挺胸，心跳一震
  const K_TUG = K(5, -7, 0, -9, 0.3, 0, 1, 1);                   // 收招：扯紧绷带
  const K_HURT = K(3, -8, 4, -11, -0.3, -1, -1, 0);
  const K_STAG = K(3, -9, 2, -12, -0.5, -1, -1, 2);              // 死亡：踉跄后仰
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'ba', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['bhx', -32, 31], ['bhy', -64, 15], ['ba', -32, 32, 1 / ASTEP], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', -2, 15], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['wound', 0, 5], ['bud', 0, 1], ['look', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_THRUST = 2 / 12, T_CREST = INCOMING + 7 / 12, T_LAND = INCOMING + 8 / 12;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.wound = 0; P.bud = 0; P.look = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 && lp < 2.0) { setK(K_LOOK, K_LOOK, 0); P.look = 1; P.glint = (Math.floor((lp - 1.6) * 12 + 1e-6) & 1) ? 0 : 1; P.wound = 2; P.beard = 1; }   // 低头看伤口：头低 1 格、眼往下看，绷带下的红光亮一档
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 行军：短而规整的步子，盾随步伐顿一下
      setK(K_IDLE, K_IDLE, 0); P.crouch = 0; parts.gait(P, E.gait(tq));
      P.hy -= 2;                                                        // 盾提离地面 2 格露出双脚；接触 A 盾往下顿、接触 B 盾往回收（两个接触帧剪影不同）
      if (P.step > 0) P.hy += 1; else if (P.step < 0) { P.hx -= 1; P.bhy += 1; }
      P.bhx += P.step * 0.5; P.ba += P.step * 0.1;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; P.gem = 1; }
      else if (tq < 0.2) { setK(K_THRUST, K_THRUST, 0); P.bx = 4; P.beard = -2; P.sway = -1; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_THRUST, K_HOLD, q); P.bx = RD(4 - q); P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 3 道裂伤由下往上逐帧变亮，盾心结晶脉动
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_BRACE, q);
      P.beard = -RD(q * 2) + (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.wound = Math.min(4, 1 + Math.floor(tq / 0.3 + 1e-6)); P.bud = tq > 1.1 && (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                          // 心跳：裂伤一口气合拢成白线（1 帧），翅芽包鼓动
      setK(K_BRACE, K_PULSE, ease.out(clamp01(tq / 0.12))); P.beard = -2; P.sway = -1; P.gem = 3; P.rim = 3;
      P.wound = tq < 1 / 12 ? 5 : 0; P.bud = tq < 3 / 12 ? 1 : 0; P.glint = tq < 0.1 ? 1 : 0;
    } else if (st === RECOVER) {                                       // 扯紧绷带、重新举盾
      if (tq < 0.25) { setK(K_PULSE, K_TUG, ease.out(tq / 0.25)); P.eyes = tq >= 1 / 12 && tq < 3 / 12 ? 1 : 0; }
      else setK(K_TUG, K_IDLE, ease.inOut(clamp01((tq - 0.25) / 0.4)));
      P.gem = tq < 0.2 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq < 0.3 ? 2 : 1; P.beard = tq < 0.3 ? -1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 踉跄 → 向后仰倒（红缨先着地）→ 盾平压在胸前 → 结晶熄灭 → 消散
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_STAG, K_STAG, 0); P.bx = -3; P.eyes = 1; P.beard = 2; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        setK(K_STAG, K_STAG, 0); P.lying = 1; P.bx = -3; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        const hq = clamp01((d - 0.66) / 0.25); P.hatX = RD(7 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 3);   // 矛滑出去
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
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
    if (P.lying) { const R = parts.rig(P, BODY), c = parts.toSprite(R, 4, R.yS + 4); P.gx = c[0] + P.bx; P.gy = c[1]; }
    else { P.gx = P.hx + 1 + P.bx; P.gy = P.hy; }                     // 发光体 = 盾心结晶
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：wingBud 裹布翅芽——一团从背上（肩线下 1–2 格）向后上方翘起的鼓包（渐细笔刷），伸出盔沿后侧（近侧高出肩线 2 格、远侧 8 格，两团之间留缺口）；
  // 1 格宽的白绷带横缠（同一部件、自动明暗），pulse 1 = 鼓起一圈。far = 远侧那团：翼根更靠前、更高，和近侧错开 3 格以上。随 rig 转（倒地时压在身下）
  function wingBud(R, far, pulse) {
    const e = parts.edges(R, R.yS + 1), x0 = e[0] + (far ? 3 : 1), y0 = R.yS + (far ? 0 : 2);
    const x1 = e[0] - (far ? 9 : 10) - pulse, y1 = R.yS - (far ? 9 : 4) - pulse, m = far ? M.clothD : M.cloth, w = far ? M.wrapD : M.wrap;
    E.part();
    parts.sweep(E, R, x0, y0, x1, y1, 1.9 + pulse * 0.5, 1.0 + pulse * 0.3, m, 0);
    const ux = x1 - x0, uy = y1 - y0, L = Math.hypot(ux, uy) || 1, nx = -uy / L, ny = ux / L, qs = far ? [0.35, 0.7] : [0.3, 0.55, 0.8];
    for (const q of qs) { const cx = x0 + ux * q, cy = y0 + uy * q, r = q < 0.5 ? 1 : 0; for (let k = -r; k <= r; k++) parts.px(E, R, cx + nx * k, cy + ny * k, w, k < 0 ? 4 : 3); }
    parts.px(E, R, x1 - 1, y1, m, 4); parts.px(E, R, x1, y1 - 1, m, 4); parts.px(E, R, x1, y1 - 2, m, 4);   // 布尖往上翘 2 格（亮）：读成向后上方翘的翅膀
  }
  const CRACKS = [[0, 0], [1, -1], [2, -1]];
  function drawHero() {
    E.begin(hero, P.bx, 0); const R = parts.rig(P, P.look ? BODY_LOOK : P.st === MOVE ? BODY_WALK : BODY), dead = P.st === DEATH;
    if (P.st === MOVE) {
      if (P.step < 0) { R.footFx -= 1; R.footBx -= 1; }                // 接触 B：近侧（亮）腿在后 x −6、远侧（暗）腿在前 x +3，步幅和接触 A 一样，但整体比接触 A 往后 1 格
      if (R.footFup) R.footFx += 2;                                    // 经过帧：近侧脚抬起时往前错 2 格，从盾后露出来
      if (R.footBup) R.footBx -= 1;                                    // 远侧脚抬起时往后让 1 格，在近侧支撑腿后面整只露出来
    } else { if (R.footFup) R.footFx += 1; if (R.footBup) R.footBx += 1; }
    if (R.lie && dead) {                                               // 翅芽包的红布散开一角，铺在地上
      E.part(); const x = -10; E.run(0, x - 3, x + 1, M.cloth, 0); E.sp(x - 4, 0, M.cloth, 4); E.run(-1, x - 1, x + 1, M.cloth, 0); E.sp(x - 2, -1, M.wrap, 3); E.sp(x, 0, M.wrap, 2);
    }
    wingBud(R, 1, P.bud); wingBud(R, 0, P.bud);
    parts.arm(E, R, P, { side: 'B', sleeve: 'plate', mat: M.armorD, pauldron: M.armorD, grip: 'none' });
    parts.legs(E, R, P, { style: 'greave', mat: M.armor, matD: M.armorD, boot: M.bootN, bootD: M.bootF });   // 远侧腿整条暗一级：酒红胫甲 + 近黑铁靴
    const tor = parts.torso(E, R, P, { style: 'plate', mat: M.armor, belt: M.belt, buckle: M.gold, hem: R.yHip });   // 下摆缩到胯线：胫甲 + 靴子露出 3 格以上
    // 同一部件：伤口裂痕（3 道，按 P.wound 由下往上变亮）+ 胸口斜缠的绷带 + 绷带下透出的红光
    const ys = [R.yHip - 1, R.yHip - 3, R.yS + 1];
    for (let i = 0; i < 3; i++) {
      const v = P.wound - i, x = parts.edges(R, ys[i])[0] + 1 + (i === 1 ? 1 : 0);
      const m = P.wound === 5 ? M.hot : M.gem, t = P.wound === 5 ? 3 : v <= 0 ? 1 : v === 1 ? 2 : v === 2 ? 3 : 4;
      for (const [dx, dy] of CRACKS) parts.px(E, R, x + dx, ys[i] + dy, m, t);
    }
    const yb = R.yS + 3, eb = parts.edges(R, yb);
    for (let x = eb[0]; x <= eb[1]; x++) { const y = yb + Math.floor((x - eb[0]) / 3); parts.px(E, R, x, y, M.wrap, 3); parts.px(E, R, x, y - 1, M.wrap, x === eb[0] ? 4 : 0); }
    parts.px(E, R, eb[0] + 2, yb, M.gem, P.glint ? 4 : 2);
    parts.px(E, R, eb[0] - 1, yb, M.wrap, 2); parts.px(E, R, eb[0] - 1, yb + 1, M.wrap, 3);   // 绷带结
    const hd = parts.head(E, R, P, { mat: M.skin, face: 'round', ear: 'pointy', nose: 'small', mouth: 'line' });
    if (!P.eyes) { parts.px(E, R, hd.eye[0], hd.eye[1] + P.look, M.ink, 1); parts.px(E, R, hd.eye[0] - 1, hd.eye[1] + P.look, M.ink, 1); }   // 眼睛（2 格墨）：低头时往下看
    parts.helm(E, R, P, { style: 'nasal', mat: M.steel, trim: M.gold, crest: M.crest });
    if (R.lie) parts.spear(E, R, P, Object.assign({}, SPEAR, { free: 1, at: [13 + P.hatX, -1 - P.hatY], a: HALF }));   // 倒地：矛滑出去
    else if (dead && P.crouch >= 2) parts.spear(E, R, P, Object.assign({}, SPEAR, { free: 1, at: [10, -1], a: HALF }));   // 踉跄：矛脱手落地
    else { parts.spear(E, R, P, SPEAR); parts.hand(E, R, P, { side: 'B', hand: M.iron }); }
    parts.arm(E, R, P, { sleeve: 'plate', mat: M.armor, pauldron: M.armor, trim: M.gold, hand: M.iron });
    const sh = parts.shield(E, R, P, R.lie ? { style: 'kite', face: M.armor, rim: M.gold, emblemStyle: 'none', at: [4, R.yS + 4] } : { style: 'kite', face: M.armor, rim: M.gold, emblemStyle: 'none' });
    drawCrystal(sh.center[0], sh.center[1] - (R.lie ? 0 : 1));
  }
  // 盾心暗红结晶（和盾同一部件）：十字形 5 格 + 4 角金托；5 档亮度（0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭）
  const CRY = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];
  const CRY_LV = [[3, 2], [4, 3], [-3, 4], [-3, -2], [1, 1]];     // [芯, 四臂]：负数 = hot 材质
  function drawCrystal(cx, cy) {
    const L = CRY_LV[P.gem];
    for (let i = 0; i < 5; i++) { const v = i === 0 ? L[0] : L[1]; E.sp(cx + CRY[i][0], cy + CRY[i][1], v < 0 ? M.hot : M.gem, Math.abs(v)); }
    if (!P.lying) { E.sp(cx - 1, cy - 1, M.gold, 4); E.sp(cx + 1, cy - 1, M.gold, 3); E.sp(cx - 1, cy + 1, M.gold, 3); E.sp(cx + 1, cy + 1, M.gold, 2); }
    if (P.glint && P.gem >= 1 && P.gem <= 3) E.sp(cx - 1, cy - 1, M.hot, 3);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let thT = 9, thX = 0, thY = 0, outT = 9, crossAcc = 0, soulAcc = 0, lastStep = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const PLUS = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]];
  function plus(x, y, vy, life) { x = RD(x); y = RD(y); for (const [dx, dy] of PLUS) spawnX(K_PHYS, x + dx, y + dy, 0, vy, life, R_EL, {}); }   // 一个会上升的「＋」（5 颗同速同寿命的粒子）
  function onEnter(s) {
    if (s !== CAST) return;
    const cx = wx(-1), cy = wy(-8);                                     // 胸口：心跳般的小冲击环
    ring(cx, cy, 0, R_EL); burst(cx, cy, 18, 30, 80, 0.3, 0.6, R_EL, 8); fx.cross(cx, cy, 5, R_EL, 0.25);
    for (let i = 0; i < 6; i++) spawn(K_DUST, wx(-7 + Math.random() * 4), wy(-12 - Math.random() * 4), -10 - Math.random() * 10, -6 - Math.random() * 8, 0.4, R_EL);   // 翅芽包鼓动抖落的红粉
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'blood', w: 0.4 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_THRUST) {                               // 探矛前刺：直线刺痕 + 残影 + 命中火花
      poseAt(ATTACK, 0.12, 0.12); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = hero.k2 = -1; poseAt(ATTACK, t, t);
      const tip = parts.spear.focus(P, SPEAR); thX = wx(tip[0] + P.bx); thY = wy(tip[1]); thT = 0;
      const hx = Math.min(thX, DUMMY_X - 3); hitDummy(0); burst(hx, thY, 12, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(hx, thY, 4, R_IMP, 0.2);
      sfx('swing', { kind: 'thrust', w: 0.35 }); sfx('hit', { mat: 'metal', w: 0.35 });
    }
    if (s === CHARGE) fx.cross(wx(P.gx), wy(P.gy), t < 0.7 ? 3 : 5, R_EL, 0.2);                       // 盾心结晶两次脉动
    if (s === CAST && Math.abs(t - 1 / 12) < 1e-9) { ring(wx(-1), wy(-8), 1, R_EL); }                  // 第二跳：大环
    if (s === CAST && Math.abs(t - 2 / 12) < 1e-9) {                                                    // 愈合落在自己身上：头顶一串红粉十字 + 轮廓描边闪 3 次
      for (let i = 0; i < 3; i++) plus(wx(-3 + i * 3), wy(-26 + i * 3 - (i & 1) * 2), -14 - i * 3, 0.9 + i * 0.15);
      outT = 0; sfx('impact', { pal: 'blood', w: 0.25 });
    }
    if (s === DEATH && Math.abs(t - T_CREST) < 1e-9) { for (let i = 0; i < 5; i++) spawn(K_DUST, wx(-20 + Math.random() * 5), HY - 1, (Math.random() - 0.5) * 20, -5 - Math.random() * 8, 0.3 + Math.random() * 0.2, FXI.dust); }   // 红缨先着地
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 22 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.45 }); }
  }
  const EVENTS = [[], [], [T_THRUST], [0.5, 0.95], [1 / 12, 2 / 12], [], [], [T_CREST, T_LAND], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                             // 脚下升起红粉小十字 + 红粉向结晶收拢
      crossAcc += dt * (4 + 5 * clamp01(stT / DUR[CHARGE]));
      while (crossAcc >= 1) { crossAcc -= 1; plus(wx(-6 + Math.random() * 14), HY - 2, -16 - Math.random() * 10, 0.7 + Math.random() * 0.3); }
      if (Math.random() < dt * 20) { const a = Math.random() * Math.PI, r = 10 + Math.random() * 6; spawn(K_SPIRAL_PT, wx(P.gx), wy(P.gy), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, Math.PI + a, r, (Math.random() - 0.5) * 3); }
    }
    if (state === MOVE && P.step !== lastStep) {                        // 行军：每步 1–2 颗尘土
      if (P.step !== 0) { sfx('step', { w: 0.45 }); const n = 1 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) spawn(K_DUST, wx(P.step > 0 ? 3 : -2) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastStep = P.step;
    }
    if (state === RECOVER && stT < 0.4 && Math.random() < dt * 10) spawn(K_RISE, wx(-3 + Math.random() * 6), wy(-10 - Math.random() * 6), (Math.random() - 0.5) * 4, -10 - Math.random() * 6, 0.6, R_EL);
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 24, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    thT += dt; outT += dt;
  }
  function fxReset() { thT = 9; outT = 9; crossAcc = 0; soulAcc = 0; lastStep = 0; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxMid() { if (thT < 0.25) blitShape(ghost, HX + P.mx, HY, P.flip, thT < 1 / 12 ? FXR[R_STEEL][2] : FXR[R_STEEL][3], clamp01(thT / 0.25)); }   // 前刺残影
  function fxFront(f12) {
    if (thT < 2 / 12) {                                                 // 直线刺痕：矛尖后方 12 格，第 1 帧亮、第 2 帧断续
      const S = FXR[R_STEEL], first = thT < 1 / 12;
      for (let k = 1; k <= 12; k++) { if (!first && (k & 1)) continue; put(thX - k, thY, first ? (k < 5 ? S[0] : S[1]) : S[2]); }
      for (let k = 3; k <= 8; k += first ? 1 : 2) { put(thX - k - 2, thY - 2, S[2]); put(thX - k - 3, thY + 2, S[2]); }
    }
    if (outT < 0.5 && ((Math.floor(outT * 12 + 1e-6) % 2) === 0)) outlineSprite(hero, HX + P.mx, HY, outT < 0.17 ? EL[1] : outT < 0.34 ? EL[2] : EL[3], HY);   // 轮廓描边闪 3 次后褪去
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1 && !P.lying) {             // 结晶星芒
      const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 5 : 2 + (f12 & 1);
      for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); }
    }
  }

  return {
    name: '赤卫', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.gem, M.hot], HIT_POINT: [2, -10], EVENTS,
    SFX: { body: 'armor', how: 'topple', pal: 'blood', style: 'heal', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
