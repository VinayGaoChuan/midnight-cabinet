// 逃兵（部队 · 骷髅 · 先锋 · 普通）：缩肩探脖的骷髅逃兵——歪戴一顶凹了一块的破锅盔、脖子上系一截撕破的蓝军旗布条（两条破尾向后飘）、
// 一支断箭从后背穿进肋骨、左手挎半块破圆木盾、腰后挂一柄断剑，左眼窝一点磷绿再生火。
// 攻击 = 盾撞（顶着半块破盾向前撞 3 格，撞完立刻缩回）；技能 = 特性「骸骨再生」生效：掉下的 3 块碎骨浮起绕身 → 「咔」地吸回缺口 → 裂纹从下往上合拢、治疗十字飘升。
// 升级线：骸骨弓手（Archer.js）/ 骸骨法师（Mage.js）/ 骸骨武士（Warrior.js）——三条线都保留破锅盔、蓝军旗布、背后断箭。
PCD.define('Deserter', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, keyer, FXI, FXR, HY, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST,
    spawn, spawnX, burst, releaseOrbit, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, death, sfx } = E;
  const RD = Math.round, px = parts.px;

  // ───── 元素：再生 · 磷火绿（FXI.nature：白 → 淡黄绿 → 翠绿 → 深绿 → 墨绿），碎骨带 bone 白边 ─────
  const R_EL = FXI.nature, EL = FXR[R_EL], DU = FXR[FXI.dust];

  // ───── 材质 ─────
  const M = parts.mats(E, {
    coat: { r: 'sand', band: 2 }, bone: 'bone', helm: [0, 28, 29, 30], rust: [0, 20, 19, 32], flag: 'blue', gold: 'gold',   // 锅盔：iron 整体提亮一级（盔顶读得出高光和凹痕）
    plank: 'wood', rim: [0, 28, 29, 30], steel: 'steel', hilt: 'wood', shaft: 'wood', fletch: 'white',
    ink: { r: 'ink', flat: 1 }, eye: { r: [35, 36, 37, 38], flat: 1 }, eye2: { r: [37, 38, 21, 21], flat: 1 },
  });
  const BODY = { body: 'standard', sw: 4, lw: 2, stride: 2, limb: 0.9, headX: 1 };   // 缩肩标准档：肩往里扣、脖子前伸、细骨腿
  const HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(58, 44, 28, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 11, 15], rimRamp: EL, rimAll: 1, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['ink', 'eye', 'eye2', 'shaft', 'fletch', 'flag', 'gold']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（右手）空着垂在盾下；后手（左手）挎半块破盾，盾心（断口中点）= 后手 (bhx, bhy) ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, dqk: 0, st: 0, look: 0, jaw: 0, gap: 0, crack: 0, drop: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(4, -7, 2, -11, 1);                         // 缩着站：上身前倾 1，半块盾举在胸口前（比胸口前沿再突出 3 格）
  const K_WIND = K(4, -8, 0, -11, -1, 0, 1);                  // 预兆：盾往怀里一收、下蹲 1 格
  const K_BASH = K(7, -9, 7, -11, 2, 1, 1);                   // 撞：前倾 2 + 前冲 3 格，盾顶在最前面
  const K_HOLD = K(6, -9, 6, -11, 1, 0, 0);
  const K_CHARGE = K(2, -13, -5, -6, 0, -1, 1);               // 蓄力：盾垂到身后，右手捂住胸口，抬头（肋骨缺口露出来）
  const K_CAST = K(3, -14, -5, -7, -1, 0, 0);                 // 施放：碎骨吸回的一下，整个人往后一挺
  const K_HURT = K(1, -9, 0, -11, -1, -1, 0);
  const K_WOBBLE = K(3, -7, 1, -9, 1, 1, 3);                  // 死亡：骨头咯咯发抖、往下塌
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = keyer([['hx', -16, 20], ['hy', -30, 5], ['bhx', -16, 20], ['bhy', -30, 5], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1], ['bx', -8, 8],
    ['step', -1, 1], ['wup', 0, 2], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['dqk', 0, 48], ['st', 0, 8],
    ['look', 0, 1], ['jaw', 0, 1], ['gap', 0, 1], ['crack', 0, 3], ['drop', 0, 2]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  // 散架分 3 批、间隔 0.1 s：锅盔先飞 → 半块盾掉下 → 骨架整个散开（死亡套件 parts）
  const T_BASH = 2 / 12, T_SNAP = 2 / 12, T_B1 = INCOMING + 0.35, T_B2 = INCOMING + 0.45, T_BREAK = INCOMING + 0.55, T_PILE = INCOMING + 0.9;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.look = 0; P.jaw = 0; P.gap = 0; P.crack = 0; P.drop = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];                                          // 待机个性（1.5–2.25 s）：缩脖子回头看一眼 → 往前探 → 下颌打颤咔哒两下，眼窝绿火一闪
      if (lp >= 1.5 && lp < 2.25) { const f = Math.floor((lp - 1.5) * 12 + 1e-6); if (f < 3) { P.look = 1; P.head = -1; P.beard = 1; } else if (f < 6) { P.head = 1; P.crouch = 1; } else { P.jaw = (f & 1) ? 0 : 1; P.glint = f === 6 || f === 7 ? 1 : 0; } }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 缩头碎步小跑：步幅 2、上身前倾 2、布条乱甩
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq)); P.lean = 2; P.hx += P.step; P.bhx += RD(P.step * 0.5); P.beard = P.beard * 2;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.beard = 1; }
      else if (tq < 0.2) { setK(K_BASH, K_BASH, 0); P.bx = 3; P.beard = -2; P.sway = -1; P.jaw = 1; }
      else if (tq < 0.34) { setK(K_BASH, K_HOLD, ease.out((tq - 0.2) / 0.14)); P.bx = 2; P.beard = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.34) / 0.2)); setK(K_HOLD, K_IDLE, q); P.bx = RD(2 * (1 - q)); P.beard = q < 0.5 ? 1 : 0; }   // 撞完立刻缩回
    } else if (st === CHARGE) {                                          // 碎骨浮起：身上露出缺口和裂纹，眼窝火 1 → 2 档
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHARGE, q); P.gap = 1; P.crack = 3;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.beard = q > 0.6 ? ((f12 & 1) ? -1 : 0) : 0; P.jaw = tq > 1.0 && (f12 & 1) ? 1 : 0;
    } else if (st === CAST) {                                            // 「咔」：碎骨吸回（2 帧），裂纹从下往上逐帧合拢；只 1 格顿挫
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.gem = 3; P.rim = 3; P.gap = tq < T_SNAP ? 1 : 0;
      P.crack = tq < 3 / 12 ? 3 : tq < 4 / 12 ? 2 : tq < 5 / 12 ? 1 : 0; if (tq >= T_SNAP && tq < 3 / 12) P.crouch += 1; P.beard = -1;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.beard = 1; P.jaw = f12 & 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 散架：挨打 → 骨头咯咯发抖往下塌 → 按部件散成一小堆（死亡套件 parts）
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.25) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.jaw = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.12 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < T_BREAK - INCOMING) { setK(K_WOBBLE, K_WOBBLE, 0); P.bx = (f12 & 1) ? -2 : -1; P.jaw = f12 & 1; P.beard = (f12 & 1) ? 2 : -1; P.gem = (f12 & 1) ? 1 : 0; P.crack = 3; P.drop = tq >= T_B2 ? 2 : tq >= T_B1 ? 1 : 0; }
      else { setK(K_WOBBLE, K_WOBBLE, 0); P.dq = 1; P.drop = 2; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqk = RD(P.dq * 48);
    const R = parts.rig(P, BODY); P.gx = (P.look ? R.hx0 + 1 : R.hx1 - 1) + P.bx; P.gy = R.ey;   // 发光体 = 眼窝再生火
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：ragTail —— 系在脖子上的破布条两条飘尾（撕破的尾梢 + 金色镶边一格），读 P.beard（< 0 被风拉直、> 0 上甩）sway
  function ragTail(R, o) {
    E.part(); const x0 = R.hx0 - 1, y0 = R.hy, b = RD(P.beard || 0), sw = RD(P.sway || 0);
    for (let j = 0; j < 2; j++) {
      const L = j ? o.len2 : o.len1, droop = b < 0 ? 0.5 + b * 0.3 : 1.6 - b * 0.9, wag = j ? -sw : sw;
      for (let k = 0; k <= L; k++) { const q = k / L, y = RD(y0 + j + q * q * droop + (k >= L - 1 ? wag : 0)), x = x0 - k; px(E, R, x, y, k >= L - 1 ? o.edge : o.mat, j ? 2 : 0); if (k < 3) px(E, R, x, y + 1, o.mat, j ? 2 : 0); }
      px(E, R, x0 - L - 1, RD(y0 + j + droop + wag) + 1, o.mat, 2);   // 撕破的尾梢：参差多出一格
    }
  }
  // 候选部件：backArrow —— 从后背穿进肋骨的断箭：1:2 斜率的箭杆从背后斜向上伸出 len 格（躯干之前画，躯干盖住插进去的那段），末端两节带白羽
  function backArrow(R, o) {
    E.part(); const y0 = R.yS + 7, e = parts.edges(R, y0)[0], x0 = e + 2, n = 2 + o.len;
    for (let k = 0; k <= n + 2; k++) px(E, R, x0 - k, y0 - (k >> 1), o.shaft, k > n ? 2 : 0);   // 箭杆（逐 2 列上 1 行的平行四边形），最后两节压暗当羽根
    const tx = x0 - n - 1, ty = y0 - ((n + 1) >> 1);
    px(E, R, tx, ty - 1, o.fletch, 4); px(E, R, tx - 1, ty - 1, o.fletch, 4); px(E, R, tx - 1, ty + 1, o.fletch, 3); px(E, R, tx - 2, ty, o.fletch, 3);   // 上下两片羽 + 羽尾
  }
  // 候选部件：skull —— 骷髅头（parts.head gaunt 当底，同一部件里画：亮眉骨、2 格墨眼窝（前一格是发光体）、1 格墨鼻孔、3 格牙排、会打颤的下颌；look 1 = 回头往后看）
  const EYE_LV = [[M.eye, 3], [M.eye, 4], [M.eye2, 2], [M.eye2, 3], [M.eye, 1]];
  function skull(R, o) {
    parts.head(E, R, P, { mat: o.mat, face: 'gaunt', nose: 'none', mouth: 'none', ear: 'none' });
    const x0 = R.hx0, x1 = R.hx1, ey = R.ey, bot = R.hy, bk = o.look ? 1 : 0, fx = (d) => (bk ? x0 + d : x1 - d);
    const lv = EYE_LV[o.gem] || EYE_LV[0];
    for (let d = 0; d <= 2; d++) px(E, R, fx(d), ey - 1, o.mat, 4);      // 眉骨一行亮骨（盖住 head 默认的暗眉）
    px(E, R, fx(2), ey, o.ink, 1);                                       // 眼窝后一格（墨）
    if (o.eyes) px(E, R, fx(1), ey, o.ink, 1); else px(E, R, fx(1), ey, lv[0], o.glint && o.gem < 3 ? 4 : lv[1]);   // 眼窝前一格 = 再生火
    px(E, R, fx(0), ey, o.mat, 3); px(E, R, fx(3), ey, o.mat, 4);        // 眼窝两侧留骨
    px(E, R, fx(1), ey + 1, o.ink, 1); px(E, R, fx(2), ey + 1, o.mat, 4); px(E, R, fx(0), ey + 1, o.mat, 3);   // 鼻孔（墨）+ 颧骨
    for (let d = 0; d <= 2; d++) px(E, R, fx(d), ey + 2, o.mat, (d & 1) ? 1 : 4);   // 牙排：亮暗交替 3 格
    if (o.jaw) { px(E, R, fx(0), bot, o.ink, 1); px(E, R, fx(1), bot, o.ink, 1); px(E, R, fx(0), bot + 1, o.mat, 3); px(E, R, fx(1), bot + 1, o.mat, 2); }   // 下颌张开：空一行再垂下来
    if (o.crack > 0) { px(E, R, x0 + 1, R.htop + 2, o.glow, 2); px(E, R, x0 + 2, R.htop + 3, o.glow, 1); px(E, R, x0 + 1, R.htop + 4, o.glow, 2); }   // 头骨裂纹（透绿光）
    if (o.gap) px(E, R, fx(0), bot + 1, o.ink, 1);                       // 下颌缺了一角
  }
  // 候选部件：dentPot —— 歪戴的凹陷破锅盔（kettle 变体，和头骨同一部件，盔下不压黑线）：盔顶 3 格高光、左后角塌陷（暗 2 格 + 缺 1 格）、
  // 帽檐斜着往前伸出头 2 格、后沿下垂、两点锈斑。T 落笔变换，a / b = 头的后 / 前列，top = 头顶行；不自己开 part()
  function dentPot(T, a, b, top, o) {
    const m = o.mat, r = o.rust;
    run2(T, top - 2, a + 3, b, m); px(E, T, a + 3, top - 2, m, 4); px(E, T, a + 4, top - 2, m, 4);                        // 盔顶（左端缩进 = 塌下去的那一角）
    run2(T, top - 1, a + 2, b + 1, m); px(E, T, a + 2, top - 1, m, 2); px(E, T, a + 3, top - 1, m, 4);                    // 凹痕：a+1 缺一格、a+2 暗格
    run2(T, top, a - 1, b + 2, m); px(E, T, a, top, m, 2); px(E, T, b + 2, top, m, 4);                                   // 盔沿（前面翘起、伸出头 2 格）
    run2(T, top + 1, a - 3, a - 1, m); px(E, T, a - 3, top + 2, m, 2);                                                    // 后沿歪着往下耷拉
    px(E, T, b - 1, top - 1, r, 3); px(E, T, a + 1, top, r, 2);                                                          // 锈斑
  }
  function run2(T, y, x0, x1, m) { for (let x = x0; x <= x1; x++) px(E, T, x, y, m, 0); }
  // 候选部件：halfTarge —— 半块破圆木盾：r 5 的上半圆，只用木色两级（左上基色、右下暗色），弧顶一圈铁边（右侧断开 2 格），下缘断口隔列缺一格。(cx, cy) = 断口中点
  function halfTarge(T, cx, cy) {
    E.part(); const r = 5, rr = r * r + r * 0.8, inside = (x, y) => x * x + y * y <= rr;
    for (let y = -r; y <= 0; y++) for (let x = -r; x <= r; x++) {
      if (!inside(x, y) || (y === 0 && (x & 1))) continue;                                  // 断口：隔列缺一格
      const edge = y < 0 && (!inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1)), broken = x >= 4 && (y === -3 || y === -2);
      if (edge && !broken) px(E, T, cx + x, cy + y, M.rim, x + y <= -5 ? 4 : 0);             // 铁边（左上两格高光）
      else px(E, T, cx + x, cy + y, M.plank, x + y >= 0 ? 2 : 3);                            // 木面：左上基色、右下暗色
    }
  }
  // 近侧腿在第 y 行的列（和 parts.legs 同一套插值：胯 → 脚 + 膝盖弯）
  function legC(R, y) { const h0 = R.yHip + 1, n = Math.max(1, -R.footFup - h0), t = (y - h0) / n, kn = R.cr * 0.9 + (R.footFup ? 0.8 : 0); return RD(R.legFx + (R.footFx - R.legFx) * t + kn * Math.sin(t * Math.PI)); }
  // 破军服：tunic 的外形（下摆到膝上），抹掉默认缝线 / 系带，只留 sand 自动明暗 + 腰带一道 + 盾下隔 1 行露出的肋骨破洞（2 根肋骨，中间隔 1 行墨）+ 下摆 3 个缺口
  function coat(R) {
    const tor = parts.torso(E, R, P, { style: 'tunic', mat: M.coat, hem: R.yHip + 4 });
    const L = tor.rows[0], Rr = tor.rows[1], row = (y) => y - tor.y0, hem = tor.hem;
    for (let y = tor.y0; y <= hem; y++) parts.run(E, R, y, L[row(y)], Rr[row(y)], M.coat, 0);
    parts.run(E, R, hem - 1, L[row(hem - 1)], Rr[row(hem - 1)], M.hilt, 0);                  // 腰带
    const y1 = R.yHip, f = Rr[row(y1)];
    for (let k = 0; k < 3; k++) { const y = y1 + k; px(E, R, f - 5, y, M.ink, 1); for (let x = f - 4; x <= f - 2; x++) { const rib = k !== 1 && !(P.gap && k === 0); px(E, R, x, y, rib ? M.bone : M.ink, rib ? (x === f - 4 ? 4 : 3) : 1); } }   // 肋骨破洞（技能时上面那根掉了）
    for (const x of [L[row(hem)] + 1, RD((L[row(hem)] + Rr[row(hem)]) / 2), Rr[row(hem)] - 1]) px(E, R, x, hem, 0);   // 撕破的下摆：3 个缺口
    if (P.crack > 1) { const g = Rr[row(R.yS + 3)]; px(E, R, g - 2, R.yS + 2, M.eye, 2); px(E, R, g - 3, R.yS + 3, M.eye, 1); px(E, R, g - 2, R.yS + 4, M.eye, 2); }   // 胸骨裂纹
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY);
    ragTail(R, { mat: M.flag, edge: M.gold, len1: 8, len2: 6 });
    backArrow(R, { shaft: M.shaft, fletch: M.fletch, len: 3 });
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.boneD, hand: M.boneD });                 // 挎盾的左臂（在盾后面）
    parts.legs(E, R, P, { style: 'bare', mat: M.bone, matD: M.boneD });
    if (P.crack > 2) { const y = RD(R.yHip * 0.45); px(E, R, legC(R, y), y, M.eye, 2); px(E, R, legC(R, y + 1) - 1, y + 1, M.eye, 1); }   // 腿骨裂纹（最先合拢）
    coat(R);
    parts.sword(E, R, P, { style: 'long', len: 5, metal: M.steel, trim: M.rust, wood: M.hilt, at: [-3, R.yWaist + 1], a: -2.36 });   // 腰后断剑（半截刃）
    parts.scarf(E, R, P, { layer: 'wrap', mat: M.flag }); px(E, R, R.hx1 - 2, R.hy + 2, M.gold, 3);
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.bone, hand: M.bone });                              // 右臂：上臂藏在盾后，手从盾下露出来
    if (P.gap) px(E, R, P.hx, P.hy - 1, 0);                                // 右手缺一节指骨
    if (P.drop < 2) halfTarge(R, P.bhx, P.bhy);
    skull(R, { mat: M.bone, ink: M.ink, glow: M.eye, look: P.look, jaw: P.jaw, gem: P.gem, glint: P.glint, eyes: P.eyes, crack: P.crack > 0 ? 1 : 0, gap: P.gap });
    if (P.drop < 1) dentPot(R, R.hx0, R.hx1, R.htop, { mat: M.helm, rust: M.rust });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  // 碎骨（肋骨、指骨、下颌一角）：4–5 格的骨片，[dx, dy, 色板下标]，外面再包一圈墨边；上沿是 bone 白边（17），下沿暗骨（7）
  const BITS = [[[-2, 1, 17], [-1, 0, 17], [0, 0, 17], [1, 0, 6], [2, 1, 7]],          // 弯弯的一截肋骨
    [[0, -1, 17], [1, -1, 17], [0, 0, 6], [1, 0, 7], [0, 1, 6]],                        // 两节指骨
    [[-1, -1, 17], [-1, 0, 17], [0, 0, 6], [1, 0, 6], [1, -1, 17]]];                    // 下颌一角（带一颗牙）
  const BIT_EDGE = BITS.map((b) => { const has = (x, y) => b.some((p) => p[0] === x && p[1] === y), e = [];
    for (const [x, y] of b) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (!has(x + dx, y + dy) && !e.some((q) => q[0] === x + dx && q[1] === y + dy)) e.push([x + dx, y + dy]); return e; });
  const bitHome = [[0, 0], [0, 0], [0, 0]];
  function homes() {                                                     // 蓄力姿下三个缺口的位置（本地坐标），定义时算一次
    poseAt(CHARGE, 1.2, 1.2); const R = parts.rig(P, BODY);
    bitHome[0] = [parts.edges(R, R.yHip)[1] - 3, R.yHip]; bitHome[1] = [P.hx, P.hy - 1]; bitHome[2] = [R.hx1, R.hy + 1];
    poseAt(IDLE, 0, 0);
  }
  const orbitPos = (i, t) => { const a = i * 2.094 + t * 1.7; return [HX + 1 + Math.cos(a) * 14, HY - 14 + Math.sin(a) * 8]; };   // 绕身一圈：比身体宽出 4 格，慢转
  // 散架前两批：锅盔、半块盾各先烤成一张小图（同一套明暗 / 勾线），按 0.1 s 间隔先后脱落；第 3 批骨架才交给死亡套件
  const FREE0 = { r0: 0, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 };
  function fragOf(w, h, ox, oy, draw) {
    const s = new Sprite(w, h, ox, oy); E.begin(s, 0, 0); draw(); bake(s, { rim: 0, flash: 0, dq: 0 });
    const pts = []; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const c = s.out[y * w + x]; if (c !== 255) pts.push([x - ox, y - oy, c]); }
    let cx = 0, cy = 0; for (const p of pts) { cx += p[0]; cy += p[1]; } cx = RD(cx / pts.length); cy = RD(cy / pts.length);
    return { pts: pts.map((p) => [p[0] - cx, p[1] - cy, p[2]]), cx, cy };
  }
  const HELM = fragOf(16, 9, 8, 7, () => { E.part(); dentPot(FREE0, -3, 2, -2, { mat: M.helm, rust: M.rust }); });
  const SHLD = fragOf(16, 10, 8, 8, () => halfTarge(FREE0, 0, 0));
  const FR = [{ on: 0, x: 0, y: 0 }, { on: 0, x: 0, y: 0 }];
  const rotP = (x, y, r) => (r === 0 ? [x, y] : r === 1 ? [-y, x] : r === 2 ? [-x, -y] : [y, -x]);
  function drawFrag(F, fr, x, y, r, dq) {
    let bot = -99; for (const p of F.pts) { const q = rotP(p[0], p[1], r); if (q[1] > bot) bot = q[1]; }
    const Y = Math.min(RD(y), HY - bot), X = RD(x);
    for (const p of F.pts) { const q = rotP(p[0], p[1], r), px_ = X + q[0], py_ = Y + q[1]; if (dq > 0 && E.bayer(px_, py_) < dq) continue; put(px_, py_, p[2]); }
  }
  const NC = 8, crX = new Float32Array(NC), crY = new Float32Array(NC), crT = new Float32Array(NC).fill(9);
  let crHead = 0, bashT = 9, chargeAcc = 0, emberAcc = 0, soulAcc = 0, lastStep = 0, lastPers = -1;
  function healCross(x, y) { crX[crHead] = x; crY[crHead] = y; crT[crHead] = 0; crHead = (crHead + 1) % NC; }
  function onEnter(s) {
    if (s !== CAST) return;
    releaseOrbit(20, 50, 0.25, 0.45);
    for (let i = 0; i < 3; i++) for (let k = 0; k < 5; k++) { const h = bitHome[i], o = orbitPos(i, DUR[CHARGE]); spawnX(K_SPIRAL_PT, o[0], o[1], 60, 0, 9, R_EL, { tx: wx(h[0]), ty: wy(h[1]), a: k * 1.26, r: 6 + k, w: 7 }); }
    shake(0.2, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_BASH) {                                  // 盾撞：盾面顶到假人，木屑外爆
      bashT = 0; const x = wx(P.bhx + 5 + P.bx), y = wy(P.bhy - 2);
      burst(x, y, 10, 30, 90, 0.15, 0.35, FXI.impact, 8); burst(x, y, 4, 20, 60, 0.2, 0.4, FXI.earth, 10); fx.cross(x + 1, y, 3, FXI.impact, 0.17);
      hitDummy(1); sfx('swing', { kind: 'smash', w: 0.35 }); sfx('hit', { mat: 'wood', w: 0.35 });
    }
    if (s === CAST && t === T_SNAP) {                                    // 「咔」：碎骨定点吸回，胸口一个小十字星芒，治疗十字从脚下飘升
      const R = parts.rig(P, BODY), cx = wx(parts.edges(R, R.yS + 4)[1] - 2), cy = wy(R.yS + 4);
      fx.cross(cx, cy, 4, R_EL, 0.3); burst(cx, cy, 10, 20, 60, 0.2, 0.45, R_EL, 6);
      for (let i = 0; i < 3; i++) healCross(HX - 5 + i * 5, HY - 2 - (i & 1) * 3);
      sfx('impact', { pal: 'nature', w: 0.4 });
    }
    if (s === DEATH && (t === T_B1 || t === T_B2)) {                     // 第 1 批锅盔飞出 / 第 2 批半块盾掉下（位置 = 脱落那一帧身上的位置）
      const R = parts.rig(P, BODY), k = t === T_B1 ? 0 : 1; FR[k].on = 1;
      if (k === 0) { FR[0].x = wx(HELM.cx + R.hx0 + 3 + P.bx); FR[0].y = wy(HELM.cy + R.htop + 2); sfx('hit', { mat: 'metal', w: 0.2 }); }
      else { FR[1].x = wx(SHLD.cx + P.bhx + P.bx); FR[1].y = wy(SHLD.cy + P.bhy); sfx('hit', { mat: 'wood', w: 0.25 }); }
    }
    if (s === DEATH && t === T_BREAK) {                                  // 散架：先把这一帧画好，再交给死亡套件
      poseAt(DEATH, T_BREAK - 1 / 12, T_BREAK - 1 / 12); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.45, fromX: 0, fromY: -10, push: -6, fadeAt: 1.5, fadeDur: 0.5 });
      burst(HX, HY - 12, 12, 30, 80, 0.2, 0.5, FXI.dust, 20); sfx('hit', { mat: 'stone', w: 0.3 });
    }
    if (s === DEATH && t === T_PILE) { for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 8 + Math.random() * 16, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.4 + Math.random() * 0.3, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.35 }); }
  }
  const EVENTS = [[], [], [T_BASH], [], [T_SNAP], [], [], [T_B1, T_B2, T_BREAK, T_PILE], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE) { chargeAcc += dt * (8 + 14 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 8 + Math.random() * 6, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); } }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.25 }); spawn(K_DUST, wx(P.step > 0 ? 3 : -2), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.25, FXI.dust); } lastStep = P.step; }
    if (state === CAST || (state === RECOVER && stT < 0.3)) { emberAcc += dt * 10; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, HX - 6 + Math.random() * 12, HY - 1, Math.random() * 6 - 3, -10 - Math.random() * 8, 0.6 + Math.random() * 0.4, R_EL); } }
    if (state === CAST && stT >= 4 / 12 && stT - dt < 4 / 12) { healCross(HX - 7, HY - 6); healCross(HX + 4, HY - 4); }
    if (state === IDLE) {                                                // 打颤那两下：眼窝冒一颗绿火星
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.5 && lp < 2.25 ? Math.floor((lp - 1.5) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 6) spawn(K_EMBER, gx, gy - 1, 2, -10, 0.5, R_EL); lastPers = f; }
    }
    if (state === DEATH && stT > T_BREAK + 0.9 && stT < T_BREAK + 1.7) { soulAcc += dt * 18; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 16, HY - 2 - Math.random() * 4, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.7 + Math.random() * 0.7, (soulAcc * 7 | 0) & 1 ? FXI.soul : R_EL); } }
    for (let i = 0; i < NC; i++) crT[i] += dt;
    bashT += dt;
  }
  function fxReset() { bashT = 9; chargeAcc = 0; emberAcc = 0; soulAcc = 0; lastStep = 0; lastPers = -1; crT.fill(9); FR[0].on = FR[1].on = 0; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function drawBit(i, x, y) { const X = RD(x), Y = RD(y); for (const [dx, dy] of BIT_EDGE[i]) put(X + dx, Y + dy, 0); for (const [dx, dy, c] of BITS[i]) put(X + dx, Y + dy, c); }
  function fxFront(f12) {
    const st = E.state, t = E.stT;
    if (st === CHARGE && P.dq < 1) {                                     // 3 块碎骨从缺口弹出 → 绕身慢转
      for (let i = 0; i < 3; i++) { const h = bitHome[i], o = orbitPos(i, t), q = ease.out(clamp01(t / 0.3)); drawBit(i, wx(h[0]) + (o[0] - wx(h[0])) * q, wy(h[1]) + (o[1] - wy(h[1])) * q); }
    }
    if (st === CAST && t < T_SNAP) {                           // 施放 2 帧：定点汇聚吸回
      const q = ease.in(clamp01(t / T_SNAP + 1 / 12 / T_SNAP)); for (let i = 0; i < 3; i++) { const h = bitHome[i], o = orbitPos(i, DUR[CHARGE]); drawBit(i, o[0] + (wx(h[0]) - o[0]) * q, o[1] + (wy(h[1]) - o[1]) * q); }
    }
    if (P.gem >= 2 && P.gem <= 3 && P.dq < 1) { const gx = wx(P.gx), gy = wy(P.gy), L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    for (let i = 0; i < NC; i++) {                                       // 治疗十字：从脚下往上飘，走完 5 级色阶
      const a = crT[i]; if (a >= 0.8) continue; const q = a / 0.8, x = RD(crX[i]), y = RD(crY[i] - q * 16), c = EL[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4];
      if (q > 0.6 && ((f12 + i) & 1)) continue; put(x, y, c); put(x - 1, y, c); put(x + 1, y, c); put(x, y - 1, c); put(x, y + 1, c);
    }
    if (st === DEATH) {                                                  // 散架前两批：锅盔往后滚开 6 格（边滚边翻，最后扣在地上），半块盾直直掉下、倒向前面
      const sg = P.flip ? -1 : 1, dq = clamp01((t - T_BREAK - 1.5) / 0.5);
      if (FR[0].on && t >= T_B1) { const a = q12(t - T_B1); drawFrag(HELM, 0, FR[0].x - sg * 6 * ease.out(clamp01(a / 0.6)), FR[0].y - 26 * a + 190 * a * a, [0, 3, 2][Math.min(2, Math.floor(a / 0.15 + 1e-6))], dq); }
      if (FR[1].on && t >= T_B2) { const b = q12(t - T_B2); drawFrag(SHLD, 1, FR[1].x + sg * (b > 0.25 ? 1 : 0), FR[1].y + 190 * b * b, b > 0.25 ? 1 : 0, dq); }
    }
    if (bashT < 2 / 12) {                                                // 盾撞的速度线：2 帧（亮 → 暗且断续）
      const x0 = wx(P.bhx - 5 + P.bx), y0 = wy(P.bhy - 4), c = bashT < 1 / 12 ? DU[0] : DU[2];
      for (let k = 0; k < 3; k++) for (let x = x0 - 6 + k * 2; x <= x0 - k; x++) if (bashT < 1 / 12 || ((x + k) & 1)) put(x, y0 + k * 2, c);
    }
  }

  homes();
  return {
    name: '逃兵', HX, R_EL, R_HURT: FXI.dust, DUR, hero, P, GLOW_MATS: [M.eye, M.eye2], HIT_POINT: [1, -13], EVENTS,
    deathKit: { mode: 'parts', at: T_BREAK },
    SFX: { body: 'stone', how: 'shatter', pal: 'nature', style: 'heal', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
