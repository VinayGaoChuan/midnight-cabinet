// 浪人（部队 · 兽人 · 射手 · 普通 · 飞行）：戴竹编宽檐斗笠、围朱红长围巾、背一对深褐皮膜滑翔翼的瘦小兽人流浪者，悬停在离地 3 格处；
// 攻击 = 投 V 形骨回旋镖（镖旋转飞向目标、沿弧线飞回手里「啪」地接住）；技能 = 特性「超级杂技」生效：升空后空翻聚风，三连加速投掷 + 残影。
// 升级成「狂王」（MadMonarch.js）：同一个兽人——同样的斗笠、朱红围巾、皮膜翼、骨回旋镖，疯了之后加歪金冠、王袍披巾、第二把镖。
PCD.define('Ronin', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, groundShadow, sfx } = E;
  const B = parts.beast, RD = Math.round;

  // ───── 元素：疾风银蓝（迅捷）21 白 → 31 银白 → 薄天青 → 41 钴蓝 → 40 深蓝 ─────
  const R_EL = fxRamp('gale', [21, 31, '#a0d8f0', 41, 40]), EL = FXR[R_EL];

  // ───── 材质 ─────
  const CHAR = ['#0e0e12', '#24242e', '#3c3c4a', '#5e5e70'], SKIN = ['#121a14', '#2e4a38', '#4a7058', '#70987a'];
  const M = parts.mats(E, {
    cloth: CHAR, wrap: CHAR, rope: 'sand', scarf: 'crimson', kasa: 'sand', skin: SKIN, bone: 'bone', tip: 'leather', rag: 'crimson',
    ink: { r: 'ink', flat: 1 }, glint: { r: [EL[4], EL[3], EL[1], EL[0]], flat: 1 },
  });
  const WING = E.ramp(['#1a0e0a', '#3a2218', '#5e3a28', '#86583a']);
  const WM = { wing: E.defMat(WING, 2), wingFar: E.defMat([WING[0], WING[1], WING[1], WING[2]], 1), bone: E.defMat([WING[0], WING[2], WING[3], WING[3]], 1),
    boneFar: E.defMat([WING[0], WING[1], WING[2], WING[2]], 1), claw: M.bone };
  const WSPEC = { span: 16, chord: 4, type: 'membrane', fingers: 3 };
  const BODY = { body: 'slim', leg: 8, torso: 7, head: 6, headW: 5, lw: 2, arm: 8, sw: 3, stride: 3, lift: 2, fall: 'front' };
  const HX = 34, DUR = DEFAULT_DUR.slice(), PIV = -12, ALT = 3;
  const hero = new Sprite(92, 66, 44, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 10, 12], rimRamp: [EL[1], EL[2], EL[2]], flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['skin', 'ink', 'glint', 'rope']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（右手）握镖，后手（左手）压斗笠 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    alt: 0, wing: 0, rot: 0, boom: 0, bspin: 0, brim: 0, kup: 0, fup: 0, rim: 0, eyes: 0, flash: 0, glint: 0, lying: 0, lift: 0,
    hatX: 0, hatY: 0, hatT: 0, hatS: 0, bmX: 0, bmY: 0, bmS: 0, dq: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(4, -11, -3, -8);                   // 镖握在胸前（开口朝前）
  const K_WIND = K(-8, -13, -4, -10, -1, -1);         // 后引：镖甩到身后（开口朝后）
  const K_THROW = K(9, -14, -1, -10, 1, 1);           // 甩腕掷出
  const K_FOLLOW = K(8, -11, -2, -9, 1);
  const K_CATCH = K(7, -15, -3, -9, 0);               // 抬手等镖回来
  const K_TUCK = K(3, -12, 0, -11, 0, 0, 2);          // 升空团身
  const K_COCK = K(-7, -15, 3, -12, -1, -1, 1);       // 翻身后蓄势：镖甩到身后
  const K_HURT = K(2, -9, -4, -7, -1, -1, 1);
  const K_FALLP = K(3, -8, -2, -6, 0, 1, 0);          // 倒地：两手贴身
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, Bk, q) => E.mix(P, A, Bk, q, FIELDS);
  const KEY = E.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 4], ['bob', 0, 1], ['alt', 0, 8],
    ['wing', 0, 6], ['rot', 0, 3], ['step', -1, 1], ['wup', 0, 2], ['beard', -3, 3], ['sway', -2, 2], ['boom', 0, 1], ['bspin', 0, 3], ['brim', 0, 1], ['kup', 0, 1], ['fup', 0, 2],
    ['rim', 0, 3], ['flash', 0, 1], ['glint', 0, 2], ['lying', 0, 1], ['lift', 0, 3], ['hatX', -32, 31], ['hatY', 0, 40], ['hatT', -1, 1], ['hatS', 0, 2],
    ['bmX', -8, 40], ['bmY', 0, 40], ['bmS', 0, 2], ['dq', 0, 48], ['bx', -8, 15], ['st', 0, 8]]);
  const T_REL = 2 / 12, T_HIT = T_REL + 0.2, T_CATCH = 8 / 12;                         // 攻击：出手、命中、接镖
  const FLIPS = [4 / 12, 5 / 12, 6 / 12, 7 / 12], FLIP_ROT = [3, 2, 1, 0];             // 技能蓄力：后空翻 4 帧（头朝后 → 倒立 → 头朝前 → 正）
  const THROWS = [0, 2 / 12, 3 / 12], FLY = [0.2, 0.13, 0.12], RET = [0.3, 0.28, 0.33];  // 技能施放：三连掷（间隔越来越短）、飞行时间、回程
  const HITS = THROWS.map((t, i) => t + FLY[i]), T_SCATCH = THROWS[2] + FLY[2] + RET[2] - DUR[CAST];   // 收招里接住最后一镖
  const T_LAND = INCOMING + 0.45, T_DOWN = INCOMING + 0.66;
  const SPIN_IDLE = [0, 1, 2, 3, 0, 1, 2, 3];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.bob = 0; P.alt = ALT; P.wing = 0; P.rot = 0; P.boom = 0; P.bspin = 0; P.brim = 0; P.kup = 0; P.fup = 0;
    P.rim = 0; P.eyes = 0; P.flash = 0; P.glint = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.hatT = 0; P.hatS = 0; P.bmX = 0; P.bmY = 0; P.bmS = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6);
      P.alt = ALT + (b & 1); P.wing = (b & 1) ? 4 : 0; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.4 - 1e-6 && lp < 2.07) {                                     // 待机个性：指尖转镖两圈，另一只手压一下帽檐
        const f = Math.floor((lp - 1.4) * 12 + 1e-6); P.bspin = SPIN_IDLE[f] || 0; P.hy -= 2; P.hx += 1;
        if (f >= 4) { P.brim = 1; P.bhx = 4; P.bhy = -18; P.head = f >= 5 && f <= 6 ? 1 : 0; }
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                     // 跳跃滑翔：脚尖点地一蹬 → 展翼滑翔 → 另一只脚点地 → 滑翔
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.alt = [0, 2, 0, 2][f]; P.wing = [4, 1, 3, 2][f]; P.fup = P.step !== 0 ? 1 : 0; P.beard = [-1, -3, -1, -2][f]; P.sway = [-1, -2, -1, -2][f];
      P.lean = f & 1 ? 1 : 0; P.hx += P.step; P.hy += f & 1 ? -1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < T_REL) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.12))); P.bspin = tq > 0.05 ? 2 : 0; P.wing = 4; P.beard = 1; }
      else if (tq < 0.25) { setK(K_THROW, K_THROW, 0); P.boom = 1; P.wing = 1; P.beard = -2; P.sway = -1; }
      else if (tq < 0.45) { setK(K_THROW, K_FOLLOW, ease.out((tq - 0.25) / 0.2)); P.boom = 1; P.wing = 2; P.beard = -1; }
      else if (tq < T_CATCH) { setK(K_FOLLOW, K_CATCH, ease.inOut(clamp01((tq - 0.45) / 0.15))); P.boom = 1; P.wing = 4; }
      else { setK(K_CATCH, K_IDLE, ease.inOut(clamp01((tq - T_CATCH) / 0.08))); P.bspin = tq < 0.7 ? 1 : 0; P.alt = tq < 0.7 ? ALT - 1 : ALT; P.beard = 1; }   // 「啪」地接住，身体被镖带得一沉
    } else if (st === CHARGE) {
      P.rim = tq < FLIPS[0] ? 1 : 2; P.beard = -2; P.sway = -1;
      if (tq < FLIPS[0]) { const q = ease.out(clamp01(tq / FLIPS[0])); setK(K_IDLE, K_TUCK, q); P.alt = ALT + RD(q * 3); P.wing = q < 0.5 ? 4 : 0; }
      else if (tq < FLIPS[3]) { setK(K_TUCK, K_TUCK, 0); P.alt = ALT + 3; P.rot = FLIP_ROT[Math.min(3, Math.floor((tq - FLIPS[0]) * 12 + 1e-6))]; P.wing = 0; P.beard = -3; }
      else {
        const q = ease.inOut(clamp01((tq - FLIPS[3]) / 0.2)); setK(K_TUCK, K_COCK, q); P.alt = ALT + 3 + (f12 & 2 ? 0 : 0); P.wing = q < 0.5 ? 4 : 1; P.bspin = 2;
        P.glint = tq >= 0.75 && tq < 0.92 ? 2 : tq >= 1.25 && tq < 1.34 ? 1 : 0; if (tq > 1.1) P.sway = (f12 & 1) ? -2 : -1;
      }
    } else if (st === CAST) {                                                   // 三连掷：出手 → 后引 → 出手 → 大出手定格
      const f = Math.floor(tq * 12 + 1e-6); P.alt = ALT + 3; P.rim = 3; P.beard = -3; P.sway = -2;
      if (f === 0) { setK(K_THROW, K_THROW, 0); P.boom = 1; P.wing = 1; }
      else if (f === 1) { setK(K_WIND, K_WIND, 0); P.bspin = 2; P.wing = 4; P.bx = 1; }
      else if (f === 2) { setK(K_THROW, K_THROW, 0); P.boom = 1; P.wing = 2; P.bx = 2; }
      else { setK(K_THROW, K_THROW, 0); P.hx += 1; P.lean = 2; P.boom = 1; P.wing = 5; P.bx = 4; }
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); P.rim = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; P.beard = -1;
      if (tq < T_SCATCH) { setK(K_THROW, K_CATCH, ease.out(clamp01(tq / 0.15))); P.boom = 1; P.alt = ALT + 3; P.wing = 1; P.bx = 4; }
      else { const r = ease.inOut(clamp01((tq - T_SCATCH) / 0.45)); setK(K_CATCH, K_IDLE, r); P.alt = ALT + 3 - RD(r * 3) - (tq < T_SCATCH + 0.09 ? 1 : 0); P.bx = RD(4 * (1 - r)); P.wing = r < 0.5 ? 4 : 0; P.bspin = tq < T_SCATCH + 0.09 ? 1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.wing = 1; P.kup = 1; P.alt = ALT - 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.wing = 4; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                                  // 直坠：翅膀一收 → 直直掉下来 → 弹一下 → 趴倒；斗笠后飘下，镖插在地上
      const d = tq - INCOMING;
      if (d < 0) idle();
      else {
        const kasa = kasaFall(d), bm = boomFall(d); P.hatX = kasa[0]; P.hatY = kasa[1]; P.hatT = kasa[2]; P.hatS = kasa[3]; P.bmX = bm[0]; P.bmY = bm[1]; P.bmS = bm[2];
        if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.wing = d < 0.15 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.boom = bm[2] ? 1 : 0; }
        else if (d < 0.45) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = -3; P.wing = 1; P.boom = 1; P.alt = d < 0.36 ? 2 : 1; }
        else if (d < 0.55) { setK(K_HURT, K_HURT, 0); P.crouch = 3; P.bx = -2; P.eyes = 1; P.beard = 2; P.wing = 6; P.boom = 1; P.alt = d < 0.5 ? 0 : 1; }
        else { setK(K_FALLP, K_FALLP, 0); P.lying = 1; P.bx = -2; P.eyes = 1; P.boom = 1; P.lift = d < 0.62 ? 1 : 0; P.alt = 0; P.wing = 6; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
        if (d >= 0.45) P.alt = Math.min(P.alt, 1);
      }
    } else if (st === REVIVE) {
      idle(); if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const lie = P.lying;
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    P.gx = P.bx + (lie ? 6 : 1); P.gy = (lie ? -3 : -12) - P.alt;                        // 轮廓光的光源 = 身体中心（风从四面裹住身体）
    KEY(P);
  }
  // 死亡里的斗笠：头上 → 他掉下去时留在半空 → 左右晃着飘下来 → 落在身后（[x, 离地, 歪, 状态 0 戴着 / 1 飘 / 2 落地]）
  function kasaFall(d) {
    if (d < 0.3) return [0, 0, 0, 0];
    const q = clamp01((d - 0.3) / 0.9), y0 = 22 + ALT, y = RD(y0 * (1 - q)), x = RD(-2 - 12 * q + Math.sin(q * 9) * 3);
    return q >= 1 ? [-15, 0, 0, 2] : [x, y, Math.cos(q * 9) > 0.3 ? 1 : Math.cos(q * 9) < -0.3 ? -1 : 0, 1];
  }
  // 死亡里的回旋镖：手里 → 脱手旋转飞出 → 插在地上（[x, 离地, 状态]）
  function boomFall(d) {
    if (d < 0.1) return [0, 0, 0];
    const q = clamp01((d - 0.1) / 0.5);
    return q >= 1 ? [26, 0, 2] : [RD(4 + 22 * q), RD(14 + Math.sin(q * Math.PI) * 10 - 14 * q), 1];
  }

  // ───── 候选部件 ─────
  // 候选部件：kasa —— 竹编宽檐锥形斗笠：檐宽 12、尖顶 1 格，斜向竹篾纹，檐下一行自动阴影；tilt 歪（顶端偏 ±），notch 破口（狂王用）
  const KASA_ROWS = [[-6, 5], [-5, 4], [-3, 2], [-2, 1], [-1, 0]];
  function kasa(E, T, cx, by, m, o) {
    o = o || {}; const tilt = o.tilt || 0; E.part();
    for (let k = 0; k < KASA_ROWS.length; k++) {
      const s = RD(tilt * k * 0.5), a = cx + KASA_ROWS[k][0] + s, b = cx + KASA_ROWS[k][1] + s, y = by - k;
      for (let x = a; x <= b; x++) { if (o.notch && k === 0 && (x - cx === -4 || x - cx === 3)) continue; parts.px(E, T, x, y, m, k > 0 && ((x - y + 99) % 3) === 0 ? 2 : 0); }
    }
    parts.px(E, T, cx - 1 + RD(tilt * 2.5), by - 5, m, 4);                            // 尖顶
    parts.px(E, T, cx - 4 + RD(tilt * 0.5), by - 1, m, 4);                             // 左上受光的一格高光
  }
  // 候选部件：boomerang —— V 形兽骨回旋镖：两臂各 4 格（斜 45°），臂端包铜，镖心缠朱红布；dir 0–3 = 开口朝前 / 下 / 后 / 上（旋转 = 换 dir）
  const BOOM = [[0, 0, 2], [0, -1, 2], [0, 1, 2], [1, -1, 0], [1, 1, 0], [1, -2, 0], [1, 2, 0], [2, -2, 0], [2, 2, 0], [2, -3, 0], [2, 3, 0], [3, -3, 1], [3, 3, 1]];
  const rot4 = (x, y, d) => (d === 0 ? [x, y] : d === 1 ? [-y, x] : d === 2 ? [-x, -y] : [y, -x]);
  function boomerang(E, T, x, y, dir) {
    E.part();
    for (const [u, v, k] of BOOM) { const p = rot4(u, v, dir & 3); parts.px(E, T, x + p[0], y + p[1], k === 2 ? M.rag : k === 1 ? M.tip : M.bone, 0); }
  }
  // 屏幕上飞行中的镖（特效层，逐帧换朝向 = 旋转）
  function boomFx(x, y, dir, dim) {
    for (const [u, v, k] of BOOM) { const p = rot4(u, v, dir & 3); put(RD(x + p[0]), RD(y + p[1]), dim ? EL[dim] : k === 2 ? 13 : k === 1 ? 33 : (u + v < 0 ? 17 : 6)); }
  }
  // 候选部件：longScarf —— 从后颈拖出的两条长围巾尾：尾梢下垂（P.beard < 0 被风拉平、> 0 往上甩）+ 波浪（相位随 P.sway 走）、尾梢分叉；
  //   o.len 长度，o.trim 下沿镶边材质、o.tassel 尾梢流苏材质（狂王的王袍披巾）。和 parts.scarf 的 tail 同一个挂点
  function longScarf(E, R, P, m, o) {
    E.part(); const x0 = R.hx0 - 1, y0 = R.hy + 1, b = P.beard || 0, ph = P.sway || 0, droop = b > 0 ? 4.5 - b * 3 : 4.5 + b * 1.4;
    for (let j = 1; j >= 0; j--) {
      const L = o.len - (j ? 3 : 0);
      for (let k = 0; k <= L; k++) {
        const q = k / L, y = RD(y0 + j + droop * Math.pow(q, 1.6) + Math.sin(k * 0.9 + ph * 1.3 + j * 1.7) * Math.min(1, q * 2.2)), x = x0 - k;
        parts.px(E, R, x, y, m, j ? 2 : 0); if (k < 3 || (j === 0 && k < L - 1)) parts.px(E, R, x, y + 1, m, j ? 2 : 0);
        if (o.trim && j === 0 && k > 1 && k < L) parts.px(E, R, x, y + 2, o.trim, 0);
        if (k === L) { parts.px(E, R, x - 1, y - (j ? 0 : 1), o.tassel || m, 3); if (o.tassel) { parts.px(E, R, x - 1, y + 1, o.tassel, 2); parts.px(E, R, x - 1, y + 2, o.tassel, 3); } }
      }
    }
  }
  // 候选部件：wrapLegs —— 悬空的细腿：炭灰裤 + 小腿绑腿（斜向缠布纹）+ 脚尖朝下的赤足；落点和 parts.legs 同一套（rig 的步态、跪姿）
  function wrapLegs(E, R, o) {
    const w = R.lw, kn = R.cr * 0.9, c0 = Math.ceil((w - 1) / 2);
    const leg = (hx, fx, up, m, mw, sk, front) => {
      E.part();
      const h0 = R.yHip + 1, ya = -up - 2, n = Math.max(1, ya - h0); let c = fx;
      for (let y = h0; y <= ya; y++) {
        const t = (y - h0) / n; c = RD(hx + (fx - hx) * t + (kn + (up ? 0.8 : 0)) * Math.sin(t * Math.PI)); const a = c - c0, wrap = t > 0.45;
        for (let x = a; x < a + w; x++) parts.px(E, R, x, y, wrap ? mw : m, wrap && ((x + y + 30) % 3) === 0 ? 2 : 0);
      }
      const a = c - c0; parts.run(E, R, ya + 1, a, a + w - 1, sk, 0); parts.px(E, R, a + w - 1 + (front ? 1 : 0), ya + 2, sk, front ? 3 : 2);   // 脚背 + 脚尖朝下
    };
    leg(R.legBx, R.footBx, R.footBup + (o.bUp || 0), M.clothD, M.wrapD, M.skinD, 0);
    leg(R.legFx, R.footFx, R.footFup + (o.fUp || 0), M.cloth, M.wrap, M.skin, 1);
  }
  // 候选部件：foldedWing —— 收拢贴背的膜翼（一个部件，走 rig 的落笔变换，所以翻跟斗 / 倒地时跟着身体转）
  function foldedWing(E, R, far) {
    E.part(); const x = R.sBx + (far ? 1 : 0), y = R.yS + 1 - (far ? 1 : 0), mem = far ? WM.wingFar : WM.wing, bone = far ? WM.boneFar : WM.bone;
    for (let k = 0; k <= 9; k++) { const w = k < 2 ? 2 : k < 7 ? 3 : 2; parts.run(E, R, y + k - 3, x - w - (k > 5 ? 1 : 0), x - 1, mem, 0); }
    parts.line(E, R, x - 1, y - 4, x - 2, y + 6, bone, 0); parts.px(E, R, x - 1, y - 5, M.bone, 3);
  }

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, -P.alt); const R = parts.rig(P, BODY);
    if (P.rot) { const r = P.rot; R.rot = r; R.ox = r === 1 ? PIV : r === 3 ? -PIV : 0; R.oy = r === 2 ? 2 * PIV : PIV; }   // 后空翻：整具身体绕腰转 90°
    const lie = R.lie, flipping = P.rot !== 0;
    const wr = lie ? parts.toSprite(R, R.sBx, R.yS + 1) : [R.sBx, R.yS + 1];
    if (flipping) { foldedWing(E, R, 1); foldedWing(E, R, 0); }                          // 翻跟斗时翅膀收紧贴背
    else { B.wing(E, wr[0] + 2, wr[1] - 1, P.wing, WSPEC, WM, 1); B.wing(E, wr[0], wr[1], P.wing, WSPEC, WM, 0); }   // 两只翼都在身体后面（翼根在后背）
    if (!lie) longScarf(E, R, P, M.scarf, { len: flipping ? 5 : 9 });
    else { E.part(); const n = parts.toSprite(R, R.hx0 - 1, R.hy + 1); for (let k = 0; k < 10; k++) parts.px(E, parts.FREE, n[0] - k + 1, -((k >> 2) & 1), M.scarf, k > 7 ? 2 : 0); }   // 趴倒时围巾摊在地上
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.clothD, cuff: M.wrapD, cuffStyle: 'bracer', grip: P.brim ? 'none' : 'fist', hand: M.skinD });
    wrapLegs(E, R, { fUp: P.fup && P.step > 0 ? 1 : 0, bUp: P.fup && P.step < 0 ? 1 : 0 });
    const tor = parts.torso(E, R, P, { style: 'tunic', mat: M.cloth, belt: M.rope });
    parts.px(E, R, tor.chest[0] + 1, tor.chest[1] - 2, M.cloth, 4); parts.px(E, R, tor.chest[0], tor.chest[1] - 1, M.cloth, 4);   // 交领
    parts.scarf(E, R, P, { mat: M.scarf, layer: 'wrap' });                               // 围巾绕颈（在下巴后面，分界线压在围巾上，不压脸）
    const hd = parts.head(E, R, P, { mat: M.skin, face: 'long', eye: M.ink, nose: 'small', mouth: 'line', ear: 'none' });
    parts.px(E, R, hd.x1, hd.bot - 1, M.bone, 4);                                     // 下獠牙
    parts.px(E, R, hd.x0, hd.ey + 1, M.skin, 2); parts.px(E, R, hd.x0 - 1, hd.ey + 1, M.skin, 0); parts.px(E, R, hd.x0 - 2, hd.ey, M.skin, 4);   // 尖耳从笠檐下伸出
    if (P.glint && !lie) { parts.px(E, R, hd.x1 - 1, hd.ey, M.glint, P.glint === 2 ? 4 : 3); if (P.glint === 2) parts.px(E, R, hd.x1, hd.ey, M.glint, 3); }   // 笠檐阴影里的眼光
    if (!P.hatS) kasa(E, R, R.hx, R.ey - 1 - P.kup, M.kasa);
    else kasa(E, parts.FREE, P.hatX, -P.hatY + P.alt, M.kasa, { tilt: P.hatT });
    if (P.brim) parts.hand(E, R, P, { side: 'B', hand: M.skinD });                      // 压帽檐的手（压在笠檐前面）
    if (!P.boom) boomerang(E, R, P.hx + 1, P.hy, P.bspin);
    else if (P.bmS) boomerang(E, parts.FREE, P.bmX, -P.bmY + P.alt + (P.bmS === 2 ? 2 : 0), P.bmS === 2 ? 1 : ((P.bmX >> 1) & 3));   // 脱手：边飞边转，最后一臂插进地里
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.cloth, cuff: M.wrap, cuffStyle: 'bracer', hand: M.skin });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghosts = [0, 1, 2].map(() => new Sprite(hero.w, hero.h, hero.ox, hero.oy)), ghX = [0, 0, 0], ghT = [9, 9, 9];
  // 飞行中的镖：k 0 = 普通攻击，1–3 = 技能三连；t 飞行计时，sx / sy 出手点，out / ret 去程 / 回程时长，fade 回程时化成残影，trail 拖尾长度
  const BN = 4, bOn = new Uint8Array(BN), bT = new Float32Array(BN), bSX = new Float32Array(BN), bSY = new Float32Array(BN), bOut = new Float32Array(BN), bRet = new Float32Array(BN), bFade = new Uint8Array(BN), bTr = new Uint8Array(BN), bHi = new Float32Array(BN);
  let chargeAcc = 0, soulAcc = 0, trailAcc = 0, lastStep = 0, relT = 9;
  const TX = DUMMY_X - 3, TY = HY - 15;
  function handScr() { return [scrX(P.hx + P.bx + 1), HY + P.hy - P.alt]; }
  function throwBoom(k, out, ret, fade, trail, hi) { const h = handScr(); bOn[k] = 1; bT[k] = 0; bSX[k] = h[0]; bSY[k] = h[1]; bOut[k] = out; bRet[k] = ret; bFade[k] = fade; bTr[k] = trail; bHi[k] = hi; }
  function boomPos(k, t, out) {
    if (t < bOut[k]) { const u = t / bOut[k]; out[0] = bSX[k] + (TX - bSX[k]) * u; out[1] = bSY[k] + (TY - bSY[k]) * u - Math.sin(u * Math.PI) * bHi[k]; return 0; }
    const u = clamp01((t - bOut[k]) / bRet[k]), h = handScr(), cx = (TX + h[0]) / 2 + 6, cy = Math.min(TY, h[1]) - 16 - bHi[k] * 2, a = 1 - u;   // 回程：高高的弧线
    out[0] = a * a * TX + 2 * a * u * cx + u * u * h[0]; out[1] = a * a * TY + 2 * a * u * cy + u * u * h[1]; return u >= 1 ? 2 : 1;
  }
  const tmp = [0, 0];
  function snap(k) { poseAt(E.state, E.stT, E.stT); drawHero(); bakeHero(); copySprite(ghosts[k], hero); hero.k1 = hero.k2 = -1; ghX[k] = HX + P.mx; ghT[k] = 0; }
  function onEnter(s) {
    if (s === CAST) {                                                           // 第一镖出手：法力外爆 + 残影
      snap(0); const h = handScr(); releaseOrbit(30, 70, 0.25, 0.5); burst(h[0], h[1], 12, 40, 90, 0.2, 0.45, R_EL, 6);
      throwBoom(1, FLY[0], RET[0], 1, 2, 3); fx.cross(h[0], h[1], 4, R_EL, 0.2);
      sfx('swing', { kind: 'throw', w: 0.25 }); sfx('shoot', { proj: 'stone' });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_REL) {                                           // 甩腕掷出：甩手拖影 + 出手光
      const h = handScr(); throwBoom(0, 0.2, T_CATCH - T_HIT, 0, 2, 3); relT = 0;
      fx.slash(scrX(1), HY - 13 - P.alt, 8, -0.7, 1.9, R_EL, 0.17, 2, 2); burst(h[0], h[1], 5, 20, 50, 0.12, 0.25, R_EL, 0);
      sfx('swing', { kind: 'throw', w: 0.25 }); sfx('shoot', { proj: 'stone' });
    }
    if (s === ATTACK && t === T_HIT) { burst(TX, TY, 10, 40, 90, 0.15, 0.35, FXI.impact, 10); burst(TX, TY, 6, 30, 70, 0.15, 0.3, R_EL, 6); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.25 }); }
    if (s === ATTACK && t === T_CATCH) { const h = handScr(); bOn[0] = 0; burst(h[0], h[1], 6, 20, 45, 0.1, 0.22, R_EL, 4); sfx('hit', { mat: 'wood', w: 0.1, catch: 1 }); }   // 「啪」接住
    if (s === CHARGE) {
      for (let i = 0; i < 4; i++) if (t === FLIPS[i]) {                           // 后空翻：翼尖 / 围巾拖出的银蓝速度弧（逆时针，头先往后）
        const cx = scrX(0), cy = HY + PIV - ALT - 3, a0 = -i * Math.PI / 2;
        fx.slash(cx, cy, 13, a0, a0 - Math.PI / 2, R_EL, 0.2, 2, i & 1 ? 0 : 2); fx.slash(cx, cy, 11, a0 + Math.PI, a0 + Math.PI / 2, R_EL, 0.15, 1, 0);
        if (i === 3) { burst(cx, cy, 10, 30, 60, 0.2, 0.4, R_EL, 0); sfx('swing', { kind: 'throw', w: 0.15 }); }
      }
    }
    if (s === CAST) {
      for (let i = 1; i < 3; i++) if (t === THROWS[i]) { const h = handScr(); throwBoom(i + 1, FLY[i], RET[i], i < 2 ? 1 : 0, 2 + i * 2, 3 - i); snap(i); fx.cross(h[0], h[1], 3 + i * 2, R_EL, 0.2);
        if (i === 2) { shake(0.28, 2); flash(0.05); burst(h[0], h[1], 16, 50, 110, 0.2, 0.5, R_EL, 8); } sfx('swing', { kind: 'throw', w: 0.2 + i * 0.1 }); sfx('shoot', { proj: 'stone' }); }
      for (let i = 0; i < 3; i++) if (Math.abs(t - HITS[i]) < 1e-9) {
        if (i < 2) { burst(TX, TY, 12, 40, 100, 0.15, 0.4, R_EL, 8); fx.cross(TX, TY, 3, R_EL, 0.15); hitDummy(0); sfx('impact', { pal: 'bolt', w: 0.3 + i * 0.1 }); }
        else {                                                                  // 第三下最大：斜十字风刃 + 30 颗银蓝外爆
          fx.beam(TX - 8, TY - 8, TX + 8, TY + 8, 1, R_EL, 0.3, 2); fx.beam(TX - 8, TY + 8, TX + 8, TY - 8, 1, R_EL, 0.3, 2); fx.cross(TX, TY, 5, R_EL, 0.25);
          burst(TX, TY, 30, 60, 150, 0.25, 0.65, R_EL, 12); ring(TX, TY, 1, R_EL); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'bolt', w: 0.6 });
        }
      }
    }
    if (s === RECOVER && Math.abs(t - T_SCATCH) < 1e-9) { const h = handScr(); bOn[3] = 0; burst(h[0], h[1], 8, 20, 50, 0.1, 0.25, R_EL, 4); fx.cross(h[0], h[1], 3, R_EL, 0.15); sfx('hit', { mat: 'wood', w: 0.1, catch: 1 }); }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 6; i++) spawn(K_DUST, HX - 6 + Math.random() * 12, HY - 1, (Math.random() - 0.5) * 24, -6 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust); }
    if (s === DEATH && Math.abs(t - T_DOWN) < 1e-9) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 10 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.25 }); }
    if (s === DEATH && Math.abs(t - (INCOMING + 0.6)) < 1e-9) { for (let i = 0; i < 4; i++) spawn(K_DUST, HX + 24 + Math.random() * 4, HY - 1, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3, FXI.dust); }   // 镖插进地里
    if (s === DEATH && Math.abs(t - (INCOMING + 1.2)) < 1e-9) { for (let i = 0; i < 4; i++) spawn(K_DUST, HX - 15 + Math.random() * 8, HY - 1, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.3, FXI.dust); }   // 斗笠落地
  }
  const EVENTS = [[], [], [T_REL, T_HIT, T_CATCH], FLIPS, [THROWS[1], THROWS[2], ...HITS], [T_SCATCH], [], [T_LAND, INCOMING + 0.6, T_DOWN, INCOMING + 1.2], []];
  function stepFX(dt, state, stT) {
    for (let k = 0; k < BN; k++) if (bOn[k]) { bT[k] += dt; if (bT[k] > bOut[k] + bRet[k] + 0.3) bOn[k] = 0; }
    for (let k = 0; k < 3; k++) ghT[k] += dt; relT += dt;
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.15 }); spawn(K_DUST, scrX(P.step > 0 ? -2 : 3), HY, (Math.random() - 0.5) * 10, -3 - Math.random() * 4, 0.25, FXI.dust); } lastStep = P.step; }
    if (state === CHARGE && stT > FLIPS[3]) {                                   // 聚风：银蓝细粒从两侧卷进来
      chargeAcc += dt * 26; while (chargeAcc >= 1) { chargeAcc -= 1; const side = Math.random() < 0.5 ? -1 : 1, x = scrX(1) + side * (16 + Math.random() * 8), y = HY - 12 - P.alt + (Math.random() - 0.5) * 14; spawn(K_BURST, x, y, -side * (60 + Math.random() * 40), (Math.random() - 0.5) * 10, 0.25 + Math.random() * 0.1, R_EL); }
    }
    if ((state === IDLE || state === MOVE) && !P.lying) { trailAcc += dt * (state === MOVE ? 4 : 1.5); while (trailAcc >= 1) { trailAcc -= 1; spawn(K_RISE, scrX(Math.random() * 4 - 3), HY - P.alt + 1, (Math.random() - 0.5) * 6, 4 + Math.random() * 4, 0.35 + Math.random() * 0.2, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 22, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
  }
  function fxReset() { bOn.fill(0); ghT.fill(9); chargeAcc = 0; soulAcc = 0; trailAcc = 0; lastStep = 0; relT = 9; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) B.util.shadow(E, scrX(1 + P.bx), Math.max(3, 7 - (P.alt >> 1))); }   // 悬停的地面影子（越高越窄）
  function fxMid(f12) {                                                          // 残影：每掷一次留一个银蓝剪影，逐个抖动消散
    for (let k = 0; k < 3; k++) { const life = 0.55 + k * 0.1; if (ghT[k] < life) blitShape(ghosts[k], ghX[k], HY, 0, ghT[k] < 0.12 ? EL[2] : EL[3], clamp01((ghT[k] - 0.15) / (life - 0.15))); }
  }
  // 身侧的 3 颗法力珠：蓄力里每 0.35 s 亮一颗，收招暗掉 1 颗再淡出（「每次攻击恢复法力值」）
  const ORBS = [[-9, -21], [-11, -16], [-9, -11]];
  function orbsLit() {
    const s = E.state, t = E.stT;
    if (s === CHARGE) return t < 0.35 ? 0 : t < 0.7 ? 1 : t < 1.05 ? 2 : 3;
    if (s === CAST) return 3; if (s === RECOVER) return t < 0.12 ? 3 : t < 0.5 ? 2 : -1; return -1;
  }
  function fxFront(f12) {
    const n = orbsLit();
    if (n >= 0 && !P.lying) for (let i = 0; i < 3; i++) {
      const x = scrX(ORBS[i][0] + P.bx), y = HY + ORBS[i][1] - P.alt + (((f12 >> 1) + i) & 1);
      if (i < n) { put(x, y, (f12 + i) % 4 === 0 ? EL[0] : EL[1]); put(x - 1, y, EL[2]); put(x + 1, y, EL[2]); put(x, y - 1, EL[2]); put(x, y + 1, EL[3]); }
      else { put(x, y, EL[4]); put(x + 1, y, EL[4]); }
    }
    if (E.state === CHARGE && E.stT > FLIPS[3]) {                                // 横向速度线从两侧向身体收拢
      const cx = scrX(1 + P.bx), cy = HY - 12 - P.alt;
      for (let i = 0; i < 6; i++) {
        const ph = ((f12 * 0.17 + i * 0.37) % 1), side = i & 1 ? 1 : -1, dist = 22 * (1 - ph), y = cy - 9 + i * 3 + (i > 2 ? 1 : 0), L = 5 - RD(ph * 3);
        if (dist < 5) continue; const c = ph < 0.35 ? EL[3] : ph < 0.7 ? EL[2] : EL[1];
        for (let j = 0; j < L; j++) put(RD(cx + side * (dist + j)), y, j === 0 ? c : EL[3]);
      }
    }
    for (let k = 0; k < BN; k++) if (bOn[k]) {                                   // 飞行中的镖：逐帧换朝向（旋转）+ 旋转拖尾（技能里一次比一次长）
      const ph = boomPos(k, bT[k], tmp); if (ph === 2) continue;
      const x = tmp[0], y = tmp[1], spin = k === 0 ? 1 : 2;
      for (let j = bTr[k]; j >= 1; j--) { const tt = bT[k] - j * 0.022; if (tt < 0) continue; boomPos(k, tt, tmp); const c = j === 1 ? EL[1] : j <= 3 ? EL[2] : EL[3]; put(RD(tmp[0]), RD(tmp[1]), c); put(RD(tmp[0]), RD(tmp[1]) + 1, j <= 2 ? EL[2] : EL[4]); }
      if (bFade[k] && ph === 1) { const u = (bT[k] - bOut[k]) / bRet[k]; if (u > 0.6) continue; boomFx(x, y, f12 * spin, u < 0.3 ? 2 : 3); }
      else boomFx(x, y, f12 * spin + k, 0);
    }
  }

  return {
    name: '浪人', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glint], HIT_POINT: [1, -15], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'bolt', style: 'blade', w: 0.25 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
