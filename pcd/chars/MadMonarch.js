// 狂王（部队 · 兽人 · 射手 · 稀有 · 飞行）：浪人自封为王、疯了——破斗笠上硬扣一顶歪金冠，朱红围巾加金边成了拖地的王袍披巾，
// 背后一对带骨爪、有破洞的深酒褐大膜翼，双持两把包金尖骨回旋镖；全程悬浮不落地，身子乱晃、仰头狂笑。
// 攻击 = 左右手交替连掷，两镖画交叉的 8 字弧线命中再飞回；技能 = 特性「超级杂技」生效（比浪人更疯）：连翻两个跟斗、双镖绕身狂转，
// 张翼甩出双镖交替连打 4 下，最后在假人头顶卷起银蓝小旋风。由「浪人」（Ronin.js）升级而来：斗笠、朱红围巾、膜翼、骨回旋镖都保留。
PCD.define('MadMonarch', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp, copySprite, blitShape,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, put, scrX, sfx } = E;
  const B = parts.beast, RD = Math.round, TAU = Math.PI * 2;

  // ───── 元素：疾风银蓝（和浪人同一色阶）；冠上的光点用 gold 第 3–4 级 ─────
  const R_EL = fxRamp('gale', [21, 31, '#a0d8f0', 41, 40]), EL = FXR[R_EL];

  // ───── 材质 ─────
  const CHAR = ['#0e0e12', '#24242e', '#3c3c4a', '#5e5e70'], SKIN = ['#121a14', '#2e4a38', '#4a7058', '#70987a'];
  const M = parts.mats(E, {
    cloth: CHAR, wrap: CHAR, rope: 'gold', scarf: 'crimson', trim: 'gold', kasa: 'sand', skin: SKIN, bone: 'bone', tip: 'gold', rag: 'crimson', crown: 'gold',
    gem: { r: [11, 13, 26, 21], flat: 1 }, white: { r: 'white', flat: 1 }, ink: { r: 'ink', flat: 1 }, glint: { r: [EL[4], EL[3], EL[1], EL[0]], flat: 1 },
  });
  const WING = E.ramp(['#1a0a0e', '#3e1a20', '#62303a', '#8a4a50']);
  const WM = { wing: E.defMat(WING, 2), wingFar: E.defMat([WING[0], WING[1], WING[1], WING[2]], 1), bone: E.defMat([WING[0], WING[2], WING[3], WING[3]], 1),
    boneFar: E.defMat([WING[0], WING[1], WING[2], WING[2]], 1), claw: M.bone };
  const WSPEC = { span: 21, chord: 5, type: 'membrane', fingers: 4 };
  const BODY = { body: 'slim', leg: 10, torso: 9, head: 7, headW: 6, lw: 2, arm: 10, sw: 3, waist: 1, headX: 1, stride: 3, lift: 2, fall: 'back' };
  const HX = 34, DUR = DEFAULT_DUR.slice(), PIV = -14, ALT = 5;
  const hero = new Sprite(104, 74, 50, 68);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 9, 12], rimRamp: [EL[1], EL[2], EL[2]], flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['skin', 'ink', 'glint', 'white', 'gem']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手（右手）一把镖，后手（左手）一把镖 ─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    alt: 0, wing: 0, rot: 0, hasF: 1, hasB: 1, bsF: 0, bsB: 0, ctilt: 1, cup: 0, laugh: 0, kup: 0, rim: 0, eyes: 0, flash: 0, glint: 0, lying: 0, lift: 0,
    dd: 0, dq: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -13, -4, -10);                  // 两把镖一前一后
  const K_WIND = K(-6, -17, -8, -14, -1, -1);         // 后引：两把镖都甩到身后
  const K_THF = K(10, -18, -7, -14, 1, 1);            // 前手掷出
  const K_THB = K(5, -14, 9, -17, 1, 1);              // 后手掷出
  const K_OPEN = K(8, -16, 7, -15, 0, 0);             // 两手张开等镖
  const K_TUCK = K(4, -14, 1, -13, 0, 0, 2);          // 翻跟斗团身
  const K_SPREAD = K(8, -21, -8, -20, -1, -1);        // 双手张开，镖绕身狂转
  const K_FLING = K(10, -17, 9, -16, 1, 1);           // 张翼甩出双镖
  const K_PUSH = K(3, -27, -4, -11, 0, 0);            // 用镖把冠推正
  const K_HURT = K(2, -11, -6, -9, -1, -1, 1);
  const K_SPLAY = K(-2, -24, 6, -22, 0, 0);           // 仰面摊开（躺倒后两手甩过头顶）
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, Bk, q) => E.mix(P, A, Bk, q, FIELDS);
  const KEY = E.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 4], ['alt', 0, 10],
    ['wing', 0, 6], ['rot', 0, 3], ['step', -1, 1], ['wup', 0, 2], ['beard', -3, 3], ['sway', -2, 2], ['hasF', 0, 1], ['hasB', 0, 1], ['bsF', 0, 3], ['bsB', 0, 3],
    ['ctilt', 0, 2], ['cup', 0, 3], ['laugh', 0, 1], ['kup', 0, 1], ['rim', 0, 3], ['flash', 0, 1], ['glint', 0, 2], ['eyes', 0, 1], ['lying', 0, 1], ['lift', 0, 4],
    ['dd', 0, 40], ['dq', 0, 48], ['bx', -8, 15], ['st', 0, 8]]);
  // 攻击：前手出手 → 后手出手 → 两镖各打一下 → 一先一后接住
  const T_F = 2 / 12, T_B = 3 / 12, OUT = 0.17, T_HF = T_F + OUT, T_HB = T_B + OUT, T_CF = 7 / 12, T_CB = 8 / 12;
  // 技能：连翻两个跟斗（8 帧）→ 双镖绕身狂转 → 施放甩出 → 4 连击（间隔 0.12 → 0.05）→ 旋风 → 收招一手接一把
  const T_OFF = 0.1, FLIP0 = 3 / 12, FLIP_ROT = [3, 2, 1, 0, 3, 2, 1, 0], FLIP_END = FLIP0 + 8 / 12;
  const T_FLY = 0.18, HITS = [0.18, 0.3, 0.38, 0.43], T_RET = 0.46, RET_A = 0.25, RET_B = 0.33;
  const T_SCF = T_RET + RET_A - DUR[CAST], T_SCB = T_RET + RET_B - DUR[CAST], T_TILT = 0.36, T_FIX = 0.52;
  const T_DOWN = INCOMING + 0.66, T_CROWN = T_DOWN + 0.33;
  const IDLE_ALT = [0, 1, 2, 1, 0, -1], IDLE_BX = [0, 0, 1, 0, 0, -1];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.bob = 0; P.alt = ALT; P.wing = 4; P.rot = 0; P.hasF = 1; P.hasB = 1; P.bsF = 0; P.bsB = 2;
    P.ctilt = 1; P.cup = 0; P.laugh = 0; P.kup = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.glint = 0; P.lying = 0; P.lift = 0; P.dd = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    const idle = () => {                                                        // 悬停乱晃：上下 2 格、偶尔左右 1 格；翼一张一收
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6);
      P.alt = ALT + IDLE_ALT[b % 6]; P.bx = IDLE_BX[b % 6]; P.wing = (b & 1) ? 1 : 4; P.beard = [0, 1, 0, -1][(b + 1) & 3]; P.sway = [0, 1, 0, -1][Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.4 - 1e-6 && lp < 2.07) {                                     // 待机个性：仰头狂笑 → 冠滑到一边 → 用镖把冠推回去，两把镖在指间各转一圈
        const f = Math.floor((lp - 1.4) * 12 + 1e-6);
        if (f < 3) { P.laugh = 1; P.head = -1; P.lean = -1; P.ctilt = f === 0 ? 1 : 2; P.cup = f === 0 ? 1 : 0; P.glint = 1; }
        else if (f < 6) { setK(K_IDLE, K_PUSH, f === 3 ? 0.6 : 1); P.ctilt = f < 5 ? 2 : 1; P.laugh = f === 3 ? 1 : 0; P.bsF = 1; P.bsB = [2, 3, 0][f - 3]; }
        else { P.bsF = [1, 2][f - 6] || 0; P.bsB = [1, 2][f - 6] || 2; }
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                     // 飘浮乱飞：4 帧扑翼 + 忽高忽低，腿在空中乱蹬，披巾拉成一条直线
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.alt = ALT + [1, 3, 0, 2][f]; P.wing = B.FLAP[f]; P.beard = -3; P.sway = [-2, -1, -2, -1][f]; P.lean = 1; P.bob = 0; P.hx += [1, 0, -1, 0][f];
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                 // 左右手交替连掷
      if (tq < T_F) { setK(K_IDLE, K_WIND, ease.out(clamp01(tq / 0.12))); P.bsF = 2; P.bsB = 2; P.wing = 4; P.beard = 1; P.laugh = tq > 0.05 ? 1 : 0; }
      else if (tq < T_B) { setK(K_THF, K_THF, 0); P.hasF = 0; P.bsB = 2; P.wing = 1; P.beard = -2; P.sway = -1; P.laugh = 1; }
      else if (tq < 0.34) { setK(K_THB, K_THB, 0); P.hasF = 0; P.hasB = 0; P.wing = 2; P.beard = -2; P.laugh = 1; }
      else if (tq < T_CF) { setK(K_THB, K_OPEN, ease.inOut(clamp01((tq - 0.34) / 0.16))); P.hasF = 0; P.hasB = 0; P.wing = 3; P.beard = -1; }
      else if (tq < T_CB) { setK(K_OPEN, K_OPEN, 0); P.hasB = 0; P.bsF = 1; P.alt = ALT - 1; P.wing = 4; }
      else { setK(K_OPEN, K_IDLE, ease.inOut(clamp01((tq - T_CB) / 0.08))); P.bsB = 3; P.wing = 4; }
    } else if (st === CHARGE) {
      P.rim = tq < FLIP0 ? 1 : 2; P.beard = -2; P.sway = -1; P.hasF = tq < T_OFF ? 1 : 0; P.hasB = P.hasF; P.laugh = 1;
      if (tq < FLIP0) { setK(K_IDLE, K_TUCK, ease.out(clamp01(tq / FLIP0))); P.alt = ALT + 1; P.wing = 4; }
      else if (tq < FLIP_END) { setK(K_TUCK, K_TUCK, 0); P.alt = ALT + 2; P.rot = FLIP_ROT[Math.min(7, Math.floor((tq - FLIP0) * 12 + 1e-6))]; P.beard = -3; P.laugh = 0; }
      else {
        const q = ease.inOut(clamp01((tq - FLIP_END) / 0.2)); setK(K_TUCK, K_SPREAD, q); P.alt = ALT + 2; P.wing = q < 0.5 ? 4 : 1; P.head = -1;
        P.glint = tq >= 1.0 && tq < 1.1 ? 2 : tq >= 1.25 && tq < 1.34 ? 2 : 1; P.ctilt = 1; if (tq > 1.1) P.sway = (f12 & 1) ? -2 : -1;
      }
    } else if (st === CAST) {                                                   // 张翼定格 1 帧 → 往前一冲，双镖甩出
      const f = Math.floor(tq * 12 + 1e-6); P.alt = ALT + 2; P.rim = 3; P.beard = -3; P.sway = -2; P.hasF = 0; P.hasB = 0; P.laugh = 1; P.glint = 2;
      if (f < 2) { setK(K_FLING, K_FLING, 0); P.wing = 5; P.bx = f; }
      else { setK(K_FLING, K_OPEN, ease.out(clamp01((tq - 2 / 12) / 0.25))); P.wing = f & 1 ? 1 : 2; P.bx = 3; P.glint = 1; }
    } else if (st === RECOVER) {                                                // 双镖飞回：一手接一把；冠又歪了，推正
      P.rim = tq < 0.25 ? 2 : tq < 0.5 ? 1 : 0; P.beard = -1; P.alt = ALT + (tq < 0.4 ? 2 : 1) - (tq > 0.6 ? 1 : 0);
      P.hasF = tq >= T_SCF - 1e-6 ? 1 : 0; P.hasB = tq >= T_SCB - 1e-6 ? 1 : 0; P.bx = RD(3 * (1 - clamp01(tq / 0.4)));
      if (tq < T_TILT) { setK(K_OPEN, K_OPEN, 0); P.wing = 1; P.bsF = 1; P.bsB = 3; }
      else if (tq < T_FIX) { setK(K_OPEN, K_PUSH, ease.out(clamp01((tq - T_TILT) / 0.1))); P.ctilt = 2; P.cup = tq < T_TILT + 0.09 ? 1 : 0; P.wing = 4; P.laugh = 1; }
      else { setK(K_PUSH, K_IDLE, ease.inOut(clamp01((tq - T_FIX) / 0.15))); P.wing = 4; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.wing = 1; P.kup = 1; P.cup = 2; P.ctilt = 2; P.alt = ALT - 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.wing = 4; P.ctilt = 2; P.cup = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                                  // 螺旋坠落：空中打转（镜像交替 3 次）→ 砸在地上仰面摊开 → 冠弹起滚开 → 双镖一先一后落地
      const d = tq - INCOMING; P.dd = RD(tq * 12);
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.wing = 1; P.cup = 2; P.ctilt = 2; P.hasF = 0; P.hasB = 0; P.glint = 1; }
      else if (d < 0.55) {
        const k = Math.floor((d - 0.3) * 12 + 1e-6); setK(K_HURT, K_TUCK, 0.5); P.flip = k & 1; P.mx = [-1, 2, -2, 1][k & 3]; P.alt = [4, 3, 3][Math.min(2, k)];
        P.wing = k & 1 ? 6 : 1; P.eyes = 1; P.beard = 2; P.hasF = 0; P.hasB = 0; P.cup = 2; P.ctilt = 2; P.glint = (f12 & 1) ? 1 : 0;
      } else {
        setK(K_SPLAY, K_SPLAY, 0); P.lying = 1; P.alt = 0; P.lift = d < 0.6 ? 4 : d < 0.66 ? 1 : 0; P.bx = -2; P.wing = 5; P.hasF = 0; P.hasB = 0;
        P.eyes = d < 1.1 ? (f12 % 3 === 0 ? 1 : 0) : 1; P.glint = d < 1.1 && !(f12 % 3 === 0) ? 1 : 0; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 2;
    }
    const lie = P.lying;
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy); P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    P.gx = P.bx + (lie ? -6 : 1); P.gy = (lie ? -4 : -14) - P.alt;                      // 轮廓光的光源 = 胸口（风裹住全身）
    KEY(P);
  }
  // 死亡掉落物（纯函数，按死亡里的秒数 d）：金冠 [x, 离地, 90° 翻滚档, 状态 0 戴着 / 1 飞 / 2 落地]；两把镖 [x, 离地, 状态]
  function crownAt(d) {                                                          // 砸地时弹起、翻着跟头从他身上飞过去，落地后再滚出 8 格
    if (d < T_DOWN - INCOMING) return [0, 0, 0, 0];
    const q = clamp01((d - (T_DOWN - INCOMING)) / 0.6);
    if (q < 0.55) { const u = q / 0.55; return [RD(-22 + 36 * u), RD(Math.sin(u * Math.PI) * 12 + 4 * (1 - u)), Math.floor(u * 5) & 3, 1]; }
    const u = clamp01((q - 0.55) / 0.45); return u >= 1 ? [22, 0, 0, 2] : [RD(14 + 8 * u), RD(Math.abs(Math.sin(u * TAU)) * 2 * (1 - u)), (Math.floor(u * 4) + 1) & 3, 1];
  }
  function boomAt(d, k) {
    const t0 = k ? 0.15 : 0, t1 = k ? 0.75 : 0.6, x1 = k ? 16 : 8; if (d < t0) return [0, 0, 0];
    const q = clamp01((d - t0) / (t1 - t0)); return q >= 1 ? [x1, 0, 2] : [RD(4 + (x1 - 4) * q), RD(22 + Math.sin(q * Math.PI) * 8 - 22 * q), 1];
  }

  // ───── 候选部件（浪人的 kasa / boomerang / wrapLegs / foldedWing / longScarf，加狂王自己的 tiltCrown / clawWing）─────
  // 候选部件：kasa —— 竹编宽檐锥形斗笠（见 Ronin.js）；notch 1 = 檐上破了两个缺口
  const KASA_ROWS = [[-6, 5], [-5, 4], [-3, 2], [-2, 1], [-1, 0]];
  function kasa(E, T, cx, by, m, o) {
    o = o || {}; E.part();
    for (let k = 0; k < KASA_ROWS.length; k++) {
      const a = cx + KASA_ROWS[k][0], b = cx + KASA_ROWS[k][1], y = by - k;
      for (let x = a; x <= b; x++) {
        if (o.notch && ((k === 0 && (x - cx === -4 || x - cx === -3 || x - cx === 3)) || (k === 1 && x - cx === -4))) continue;   // 破口
        parts.px(E, T, x, y, m, k > 0 && ((x - y + 99) % 3) === 0 ? 2 : 0);
      }
    }
    parts.px(E, T, cx - 1, by - 5, m, 4); parts.px(E, T, cx - 4, by - 1, m, 4);
  }
  // 候选部件：tiltCrown —— 五齿金冠（宽 9，中间齿最高，冠箍嵌一颗红宝石），tilt 0 正 / 1 歪 / 2 滑到一边（逐列错位 = 斜着扣上去）
  const CROWN_TEETH = [[-4, 1], [-2, 2], [0, 3], [2, 2], [4, 1]];
  function tiltCrown(E, T, cx, by, tilt, glint) {
    E.part(); const sh = (x) => RD(-(x) * tilt * 0.3), dx = tilt === 2 ? -2 : tilt ? -1 : 0;
    for (let x = -4; x <= 4; x++) { parts.px(E, T, cx + x + dx, by + sh(x), M.crown, x === -4 ? 4 : 0); parts.px(E, T, cx + x + dx, by - 1 + sh(x), M.crown, x === -3 || x === 3 ? 4 : 0); }
    for (const [x, h] of CROWN_TEETH) for (let j = 1; j <= h; j++) parts.px(E, T, cx + x + dx, by - 1 - j + sh(x), M.crown, j === h ? 4 : 0);
    parts.px(E, T, cx + dx, by + sh(0), M.gem, glint ? 4 : 3); parts.px(E, T, cx - 2 + dx, by + sh(-2), M.crown, 2); parts.px(E, T, cx + 2 + dx, by + sh(2), M.crown, 2);
    if (glint === 2) parts.px(E, T, cx + dx, by - 4 + sh(0), M.glint, 4);
  }
  // 候选部件：boomerang —— V 形兽骨回旋镖（见 Ronin.js）；狂王的两臂端包金
  const BOOM = [[0, 0, 2], [0, -1, 2], [0, 1, 2], [1, -1, 0], [1, 1, 0], [1, -2, 0], [1, 2, 0], [2, -2, 0], [2, 2, 0], [2, -3, 0], [2, 3, 0], [3, -3, 1], [3, 3, 1]];
  const rot4 = (x, y, d) => (d === 0 ? [x, y] : d === 1 ? [-y, x] : d === 2 ? [-x, -y] : [y, -x]);
  function boomerang(E, T, x, y, dir, dark) {
    E.part();
    for (const [u, v, k] of BOOM) { const p = rot4(u, v, dir & 3); parts.px(E, T, x + p[0], y + p[1], k === 2 ? (dark ? M.ragD : M.rag) : k === 1 ? M.tip : (dark ? M.boneD : M.bone), 0); }
  }
  function boomFx(x, y, dir, dim) { for (const [u, v, k] of BOOM) { const p = rot4(u, v, dir & 3); put(RD(x + p[0]), RD(y + p[1]), dim ? EL[dim] : k === 2 ? 13 : k === 1 ? 5 : (u + v < 0 ? 17 : 6)); } }
  // 候选部件：wrapLegs —— 悬空的细腿 + 绑腿 + 脚尖朝下的赤足（见 Ronin.js）
  function wrapLegs(E, R) {
    const w = R.lw, kn = R.cr * 0.9, c0 = Math.ceil((w - 1) / 2);
    const leg = (hx, fx, up, m, mw, sk, front) => {
      E.part();
      const h0 = R.yHip + 1, ya = -up - 2, n = Math.max(1, ya - h0); let c = fx;
      for (let y = h0; y <= ya; y++) {
        const t = (y - h0) / n; c = RD(hx + (fx - hx) * t + (kn + (up ? 0.8 : 0)) * Math.sin(t * Math.PI)); const a = c - c0, wrap = t > 0.45;
        for (let x = a; x < a + w; x++) parts.px(E, R, x, y, wrap ? mw : m, wrap && ((x + y + 30) % 3) === 0 ? 2 : 0);
      }
      const a = c - c0; parts.run(E, R, ya + 1, a, a + w - 1, sk, 0); parts.px(E, R, a + w - 1 + (front ? 1 : 0), ya + 2, sk, front ? 3 : 2);
    };
    leg(R.legBx, R.footBx, R.footBup, M.clothD, M.wrapD, M.skinD, 0);
    leg(R.legFx, R.footFx, R.footFup, M.cloth, M.wrap, M.skin, 1);
  }
  // 候选部件：foldedWing —— 收拢贴背的膜翼（走 rig 的落笔变换，翻跟斗时跟着身体转）
  function foldedWing(E, R, far) {
    E.part(); const x = R.sBx + (far ? 1 : 0), y = R.yS + 1 - (far ? 1 : 0), mem = far ? WM.wingFar : WM.wing, bone = far ? WM.boneFar : WM.bone;
    for (let k = 0; k <= 12; k++) { const w = k < 2 ? 2 : k < 9 ? 4 : 3; parts.run(E, R, y + k - 4, x - w - (k > 7 ? 1 : 0), x - 1, mem, 0); }
    parts.line(E, R, x - 1, y - 5, x - 3, y + 8, bone, 0); parts.px(E, R, x - 1, y - 6, M.bone, 3); parts.px(E, R, x - 4, y + 9, M.bone, 3);
  }
  // 候选部件：clawWing —— 在 B.wing 膜翼上加翼指末端的骨爪钩和膜上的破洞（紧跟 B.wing 画，并进同一个部件）；几何和 B.wing 同一套
  function clawWing(E, x, y, pose, w, far) {
    B.wing(E, x, y, pose, w, WM, far);
    const W = B.WINGS[pose | 0] || B.WINGS[0], a0 = W[0], aT = W[1], fold = W[2], span = w.span, nf = w.fingers;
    const arm = span * (0.42 - 0.14 * fold), wx = x - Math.cos(a0) * arm, wy = y - Math.sin(a0) * arm, tips = [];
    for (let k = 0; k < nf; k++) { const q = k / (nf - 1), fa = a0 + (aT - a0) * (0.25 + 0.75 * q), fl = span * (0.62 - 0.12 * q) * (1 - 0.55 * fold); tips.push([wx - Math.cos(fa) * fl, wy - Math.sin(fa) * fl]); }
    for (let k = 0; k < nf; k++) { const tx = RD(tips[k][0]), ty = RD(tips[k][1]); if (ty > -1) continue; E.sp(tx, ty, M.bone, 3); E.sp(tx - 1, ty + (ty < wy ? 1 : -1), M.bone, 2); }   // 翼指末端的骨爪钩
    if (far || fold > 0.6) return;
    const S = hero, dx = P.bx + S.ox, dy = -P.alt + S.oy;
    for (const [k, f] of [[1, 0.62], [2, 0.5]]) {                                  // 两个破洞：挖掉膜上的两格（勾线自动包一圈，读成破口）
      const hx = RD(wx + ((tips[k][0] + tips[k + 1 < nf ? k + 1 : k][0]) / 2 - wx) * f), hy = RD(wy + ((tips[k][1] + tips[k + 1 < nf ? k + 1 : k][1]) / 2 - wy) * f);
      for (const [ox, oy] of [[0, 0], [1, 0]]) { const X = hx + ox + dx, Y = hy + oy + dy; if (X >= 0 && Y >= 0 && X < S.w && Y < S.h && S.mat[Y * S.w + X] === WM.wing) E.sp(hx + ox, hy + oy, 0); }
    }
  }
  // 候选部件：longScarf —— 两条长围巾尾（见 Ronin.js）；狂王加金边 trim 和尾梢金流苏 tassel
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

  // ───── 画（部件从后往前）─────
  function drawHero() {
    E.begin(hero, P.bx, -P.alt); const R = parts.rig(P, BODY);
    if (P.rot) { const r = P.rot; R.rot = r; R.ox = r === 1 ? PIV : r === 3 ? -PIV : 0; R.oy = r === 2 ? 2 * PIV : PIV; }   // 翻跟斗：整具身体绕胸口转 90°
    const lie = R.lie, flipping = P.rot !== 0, dead = P.st === DEATH, d = P.dd / 12 - INCOMING;
    const wr = lie ? parts.toSprite(R, R.sBx, R.yS + 1) : [R.sBx, R.yS + 1];
    if (flipping) { foldedWing(E, R, 1); foldedWing(E, R, 0); }
    else if (lie) { clawWing(E, wr[0] + 1, wr[1] - 3, 4, WSPEC, 1); clawWing(E, wr[0] + 5, wr[1] - 1, 6, WSPEC, 0); }   // 仰面摊开：远翼斜支在身后，近翼摊在地上
    else { clawWing(E, wr[0] + 2, wr[1] - 1, P.wing, WSPEC, 1); clawWing(E, wr[0], wr[1], P.wing, WSPEC, 0); }
    if (!lie) longScarf(E, R, P, M.scarf, { len: flipping ? 6 : 13, trim: M.trim, tassel: M.trim });
    else { E.part(); const n = parts.toSprite(R, R.hx0 - 1, R.hy + 1); for (let k = 0; k < 14; k++) { parts.px(E, parts.FREE, n[0] + k - 2, -((k >> 2) & 1), M.scarf, k > 11 ? 2 : 0); if (k > 1 && k < 13) parts.px(E, parts.FREE, n[0] + k - 2, 0, M.trim, 0); } }   // 披巾摊在身下
    if (P.hasB && !lie) boomerang(E, R, P.bhx + 1, P.bhy, P.bsB, 1);                  // 后手的镖（在身体后面）
    parts.arm(E, R, P, { side: 'B', sleeve: 'tight', mat: M.clothD, cuff: M.wrapD, cuffStyle: 'bracer', hand: M.skinD });
    wrapLegs(E, R);
    const tor = parts.torso(E, R, P, { style: 'tunic', mat: M.cloth, belt: M.rope, buckle: M.crown });
    parts.px(E, R, tor.chest[0] + 1, tor.chest[1] - 2, M.cloth, 4); parts.px(E, R, tor.chest[0], tor.chest[1] - 1, M.cloth, 4);
    parts.scarf(E, R, P, { mat: M.scarf, layer: 'wrap' });
    const hd = parts.head(E, R, P, { mat: M.skin, face: 'long', mouth: 'none', nose: 'small', ear: 'none' });
    { const x1 = hd.x1, ey = hd.ey, by = hd.bot;                                   // 疯狂的大眼（眼白 2×2 + 小瞳）+ 咧嘴双獠牙 + 尖耳（都并进脸的部件）
      if (P.eyes) parts.run(E, R, ey + 1, x1 - 2, x1, M.skin, 1);
      else { parts.px(E, R, x1 - 1, ey, M.white, 4); parts.px(E, R, x1, ey, M.white, 3); parts.px(E, R, x1 - 1, ey + 1, M.white, 3); parts.px(E, R, x1, ey + 1, P.glint ? M.glint : M.ink, P.glint ? 4 : 3); parts.px(E, R, x1 - 2, ey, M.skin, 1); }
      const my = by - 1; parts.run(E, R, my, x1 - 3, x1, M.ink, 1); if (P.laugh) parts.run(E, R, my + 1, x1 - 2, x1, M.ink, 1);
      parts.px(E, R, x1 - 3, my - 1, M.bone, 4); parts.px(E, R, x1, my - 1, M.bone, 4);   // 双獠牙
      parts.px(E, R, hd.x0, ey + 2, M.skin, 2); parts.px(E, R, hd.x0 - 1, ey + 2, M.skin, 0); parts.px(E, R, hd.x0 - 2, ey + 1, M.skin, 4); }
    const kb = R.ey - 2 - P.kup;
    kasa(E, R, R.hx, kb, M.kasa, { notch: 1 });                                    // 破斗笠（倒地时还扣在头上）
    const cr = dead ? crownAt(d) : [0, 0, 0, 0];
    if (!cr[3]) tiltCrown(E, R, R.hx, kb - 5 - P.cup, P.ctilt, P.glint);
    else tiltCrown(E, { r0: cr[2], tx: cr[0], ty: -cr[1] + P.alt - (cr[2] ? 4 : 0), rot: 0, ox: 0, oy: 0 }, 0, 0, 0, 0);   // 金冠弹起、翻滚着滚开
    if (P.hasF && !lie) boomerang(E, R, P.hx + 1, P.hy, P.bsF);
    if (dead) for (let k = 0; k < 2; k++) { const b = boomAt(d, k); if (b[2]) boomerang(E, parts.FREE, b[0], -b[1] + P.alt + (b[2] === 2 ? 1 : 0), b[2] === 2 ? (k ? 3 : 1) : ((b[0] + k) & 3)); }
    parts.arm(E, R, P, { sleeve: 'tight', mat: M.cloth, cuff: M.wrap, cuffStyle: 'bracer', hand: M.skin });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效：双镖的位置全部由状态内时间算出（截图每次一致）─────
  const TX = DUMMY_X - 2, TY = HY - 16;
  const handF = () => [scrX(P.hx + P.bx + 1), HY + P.hy - P.alt], handB = () => [scrX(P.bhx + P.bx + 1), HY + P.bhy - P.alt];
  const core = () => [scrX(1 + P.bx), HY + PIV - P.alt];
  const OUTP = [0, 0];
  // 绕身公转：角度随时间越转越快（ω = 6 + 12t），两把镖相差 180°；水平半径 7、竖直压扁
  function orbitAt(t, k, o) { const c = core(), a = 6 * t + 6 * t * t + k * Math.PI; o[0] = c[0] + Math.cos(a) * 7; o[1] = c[1] + Math.sin(a) * 4; return a; }
  // 攻击：去程 8 字（两把镖的上下偏移相反，中途交叉），回程走另一侧的弧
  function atkAt(t, k, o) {
    const t0 = k ? T_B : T_F, th = k ? T_HB : T_HF, tc = k ? T_CB : T_CF, s = k ? -1 : 1;
    if (t < t0 || t >= tc) return -1;
    if (t < th) { const u = (t - t0) / OUT, h = k ? handB() : handF(), sx = h[0], sy = h[1]; o[0] = sx + (TX - sx) * u; o[1] = sy + (TY - sy) * u - s * Math.sin(u * TAU) * 6; return 0; }
    const u = (t - th) / (tc - th), h = k ? handB() : handF(), cx = (TX + h[0]) / 2, cy = (TY + h[1]) / 2 + s * 12, a = 1 - u;
    o[0] = a * a * TX + 2 * a * u * cx + u * u * h[0]; o[1] = a * a * TY + 2 * a * u * cy + u * u * h[1]; return 1;
  }
  // 技能：sk = 技能链内秒数。蓄力里公转 → 施放 0–0.18 沿 8 字飞向假人 → 绕着假人交替抽打 → 0.46 起飞回、一手接一把
  const START = [[0, 0], [0, 0]];
  function skillAt(sk, k, o) {
    const C0 = DUR[CHARGE];
    if (sk < T_OFF) return -1;
    if (sk < C0) { orbitAt(sk, k, o); return 0; }
    const t = sk - C0, s = k ? -1 : 1;
    if (t < T_FLY) { orbitAt(C0, k, START[k]); const u = t / T_FLY, sx = START[k][0], sy = START[k][1]; o[0] = sx + (TX - sx) * u; o[1] = sy + (TY - sy) * u - s * Math.sin(u * TAU) * 8; return 1; }
    if (t < T_RET) { const a = (t - T_FLY) * 26 + k * Math.PI; o[0] = TX + Math.cos(a) * 6; o[1] = TY - 2 + Math.sin(a) * 5; return 2; }
    const ret = k ? RET_B : RET_A, u = (t - T_RET) / ret; if (u >= 1) return -1;
    const h = k ? handB() : handF(), cx = (TX + h[0]) / 2, cy = (TY + h[1]) / 2 - s * 14, a = 1 - u, sx = TX + Math.cos((T_RET - T_FLY) * 26 + k * Math.PI) * 6, sy = TY - 2 + Math.sin((T_RET - T_FLY) * 26 + k * Math.PI) * 5;
    o[0] = a * a * sx + 2 * a * u * cx + u * u * h[0]; o[1] = a * a * sy + 2 * a * u * cy + u * u * h[1]; return 3;
  }
  const skClock = () => { const s = E.state, t = E.stT; return s === CHARGE ? t : s === CAST ? DUR[CHARGE] + t : s === RECOVER ? DUR[CHARGE] + DUR[CAST] + t : -1; };
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy); let ghT = 9, ghX = 0, tornT = 9, chargeAcc = 0, soulAcc = 0, trailAcc = 0;
  function onEnter(s) {
    if (s === CAST) {                                                           // 张翼定格 + 双镖甩出：十字星芒、外爆、残影
      poseAt(CAST, 0, 0); drawHero(); bakeHero(); copySprite(ghost, hero); hero.k1 = hero.k2 = -1; ghT = 0; ghX = HX + P.mx;
      const c = core(); releaseOrbit(40, 90, 0.3, 0.6); burst(c[0], c[1], 24, 50, 120, 0.25, 0.6, R_EL, 10); fx.cross(c[0] + 2, c[1] - 4, 6, R_EL, 0.3); ring(c[0], c[1], 1, R_EL);
      shake(0.28, 2); flash(0.05); sfx('swing', { kind: 'throw', w: 0.35 }); sfx('shoot', { proj: 'stone' });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && (t === T_F || t === T_B)) { const h = t === T_F ? handF() : handB(); burst(h[0], h[1], 5, 20, 50, 0.12, 0.25, R_EL, 0); fx.slash(scrX(1), HY - 17 - P.alt, 9, -0.6, 1.8, R_EL, 0.17, 2, 2); sfx('swing', { kind: 'throw', w: 0.3 }); sfx('shoot', { proj: 'stone' }); }
    if (s === ATTACK && (t === T_HF || t === T_HB)) { burst(TX, TY, 9, 40, 90, 0.15, 0.35, FXI.impact, 10); burst(TX, TY, 6, 30, 70, 0.15, 0.3, R_EL, 6); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.3 }); }
    if (s === ATTACK && (t === T_CF || t === T_CB)) { const h = t === T_CF ? handF() : handB(); burst(h[0], h[1], 5, 20, 45, 0.1, 0.22, R_EL, 4); sfx('hit', { mat: 'wood', w: 0.12, catch: 1 }); }
    if (s === CHARGE) {
      if (t === T_OFF) { const c = core(); burst(c[0], c[1], 10, 30, 60, 0.15, 0.3, R_EL, 0); sfx('swing', { kind: 'throw', w: 0.2 }); }   // 双镖脱手
      for (let i = 0; i < 8; i++) if (Math.abs(t - (FLIP0 + i / 12)) < 1e-9) { const c = core(), a0 = -(i & 3) * Math.PI / 2; fx.slash(c[0], c[1], 15, a0, a0 - Math.PI / 2, R_EL, 0.2, 2, i & 1 ? 0 : 2); }
      if (t === 1.2) { const c = core(); fx.cross(c[0] + 1, c[1] - 20, 4, GOLD_I, 0.3); }   // 冠尖星芒
    }
    if (s === CAST) for (let i = 0; i < 4; i++) if (Math.abs(t - HITS[i]) < 1e-9) {
      const big = i === 3; burst(TX, TY, big ? 30 : 12, 40, big ? 140 : 100, 0.15, big ? 0.6 : 0.4, R_EL, 8); fx.cross(TX + (i & 1 ? 2 : -2), TY + (i & 1 ? -3 : 2), big ? 5 : 3, R_EL, 0.15);
      hitDummy(big ? 1 : 0); if (big) { shake(0.12, 1); tornT = 0; ring(TX, TY, 0, R_EL); } sfx('impact', { pal: 'bolt', w: big ? 0.7 : 0.3 + i * 0.1 });
    }
    if (s === RECOVER && (Math.abs(t - T_SCF) < 1e-9 || Math.abs(t - T_SCB) < 1e-9)) { const h = Math.abs(t - T_SCF) < 1e-9 ? handF() : handB(); burst(h[0], h[1], 6, 20, 50, 0.1, 0.25, R_EL, 4); sfx('hit', { mat: 'wood', w: 0.12, catch: 1 }); }
    if (s === RECOVER && Math.abs(t - T_TILT) < 1e-9) { const c = core(); burst(c[0] - 1, c[1] - 22, 4, 20, 40, 0.1, 0.25, GOLD_I, 4); }   // 冠「叮」地又歪了
    if (s === DEATH && Math.abs(t - T_DOWN) < 1e-9) { for (let i = 0; i < 18; i++) spawn(K_DUST, HX - 20 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.12, 1); sfx('fall', { w: 0.35 }); }
    if (s === DEATH && Math.abs(t - (INCOMING + 0.6)) < 1e-9) { for (let i = 0; i < 3; i++) spawn(K_DUST, HX + 7 + Math.random() * 3, HY - 1, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.3, FXI.dust); }
    if (s === DEATH && Math.abs(t - (INCOMING + 0.75)) < 1e-9) { for (let i = 0; i < 3; i++) spawn(K_DUST, HX + 15 + Math.random() * 3, HY - 1, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.3, FXI.dust); }
    if (s === DEATH && Math.abs(t - T_CROWN) < 1e-9) { for (let i = 0; i < 4; i++) spawn(K_DUST, HX + 10 + Math.random() * 4, HY - 1, (Math.random() - 0.5) * 12, -3 - Math.random() * 4, 0.3, FXI.dust); burst(HX + 12, HY - 3, 4, 20, 40, 0.1, 0.25, GOLD_I, 4); sfx('hit', { mat: 'metal', w: 0.1, crown: 1 }); }   // 金冠落地「叮当」
  }
  const GOLD_I = FXI.coin;
  const EVENTS = [[], [], [T_F, T_B, T_HF, T_HB, T_CF, T_CB], [T_OFF, ...[0, 1, 2, 3, 4, 5, 6, 7].map((i) => FLIP0 + i / 12), 1.2], HITS, [T_SCF, T_SCB, T_TILT], [], [INCOMING + 0.6, T_DOWN, INCOMING + 0.75, T_CROWN], []];
  function stepFX(dt, state, stT) {
    ghT += dt; tornT += dt;
    if (tornT < 0.5) { const a = tornT * 30, h = tornT * 26; for (let k = 0; k < 2; k++) spawn(K_RISE, TX + Math.cos(a + k * Math.PI) * (2 + h * 0.25), TY - 12 - h * 0.5, (Math.random() - 0.5) * 4, -24 - Math.random() * 10, 0.35 + Math.random() * 0.2, R_EL); }
    if (state === MOVE || state === IDLE) { trailAcc += dt * (state === MOVE ? 7 : 2); while (trailAcc >= 1) { trailAcc -= 1; spawn(K_RISE, scrX(Math.random() * 4 - 2 + P.bx), HY - P.alt + 1, (Math.random() - 0.5) * 6 - (state === MOVE ? 10 : 0), 6 + Math.random() * 5, 0.35 + Math.random() * 0.2, R_EL); } }   // 身下的银蓝拖尾
    if (state === CHARGE && stT > FLIP_END) { chargeAcc += dt * 24; while (chargeAcc >= 1) { chargeAcc -= 1; const c = core(), a = Math.random() * TAU; spawn(K_BURST, c[0] + Math.cos(a) * 14, c[1] + Math.sin(a) * 9, -Math.cos(a) * 60, -Math.sin(a) * 40, 0.2, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 26, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
  }
  function fxReset() { ghT = 9; tornT = 9; chargeAcc = 0; soulAcc = 0; trailAcc = 0; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) B.util.shadow(E, scrX(1 + P.bx), Math.max(3, 8 - (P.alt >> 1))); }
  // 残影：施放时身后留下 3 个渐淡的深蓝剪影
  function fxMid(f12) {
    if (ghT < 0.45) for (let k = 3; k >= 1; k--) blitShape(ghost, ghX - k * 4, HY, 0, k === 1 ? EL[3] : EL[4], clamp01(ghT / 0.45 + k * 0.18));
    drawBooms(f12, 0);
  }
  const ORBS = [[-11, -27], [-13, -22], [-13, -17], [-11, -12]];
  function orbsLit() { const s = E.state, t = E.stT; if (s === CHARGE) return t < 0.3 ? 0 : t < 0.6 ? 1 : t < 0.9 ? 2 : t < 1.2 ? 3 : 4; if (s === CAST) return 4; if (s === RECOVER) return t < 0.15 ? 4 : t < 0.5 ? 3 : -1; return -1; }
  function drawBooms(f12, front) {
    const s = E.state, t = E.stT;
    if (s === ATTACK) { if (!front) return; for (let k = 0; k < 2; k++) { const ph = atkAt(t, k, OUTP); if (ph < 0) continue; for (let j = 3; j >= 1; j--) { if (atkAt(t - j * 0.02, k, TR) < 0) continue; put(RD(TR[0]), RD(TR[1]), j === 1 ? EL[1] : EL[2]); } boomFx(OUTP[0], OUTP[1], f12 * 2 + k, 0); } return; }
    const sk = skClock(); if (sk < 0) return;
    for (let k = 0; k < 2; k++) {
      const ph = skillAt(sk, k, OUTP); if (ph < 0) continue; const x = OUTP[0], y = OUTP[1], c = core();
      if (ph === 0) {                                                           // 公转：远侧（上半圈）画在身后，近侧画在身前；拖出银蓝环形速度线
        const behind = y < c[1]; if (behind === !!front) continue;
        const a = orbitAt(sk, k, OUTP), w = 6 + 12 * sk, n = Math.min(12, 3 + RD(w * 0.5));
        for (let j = 1; j <= n; j++) { const b = a - j * 0.13, px = RD(c[0] + Math.cos(b) * 7), py = RD(c[1] + Math.sin(b) * 4); if ((py < c[1]) !== behind) continue; put(px, py, j < 3 ? EL[1] : j < 7 ? EL[2] : EL[3]); }
        boomFx(x, y, f12 * 2 + k, behind ? 3 : 0);
      } else if (front) {
        for (let j = ph === 2 ? 2 : 4; j >= 1; j--) { if (skillAt(sk - j * 0.02, k, TR) < 0) continue; put(RD(TR[0]), RD(TR[1]), j === 1 ? EL[1] : j <= 2 ? EL[2] : EL[3]); }
        boomFx(x, y, f12 * 2 + k, 0);
      }
    }
  }
  const TR = [0, 0];
  function fxFront(f12) {
    const n = orbsLit();
    if (n >= 0 && !P.lying) for (let i = 0; i < 4; i++) {                       // 身侧 4 颗法力珠逐颗亮起
      const x = scrX(ORBS[i][0] + P.bx), y = HY + ORBS[i][1] - P.alt + (((f12 >> 1) + i) & 1);
      if (i < n) { put(x, y, (f12 + i) % 4 === 0 ? EL[0] : EL[1]); put(x - 1, y, EL[2]); put(x + 1, y, EL[2]); put(x, y - 1, EL[2]); put(x, y + 1, EL[3]); }
      else { put(x, y, EL[4]); put(x + 1, y, EL[4]); }
    }
    const sk = skClock();
    if (sk > 0.9 && sk < DUR[CHARGE]) { const c = core(); for (let j = 0; j < 40; j++) { const a = j / 40 * TAU; if (((j + f12) & 3) !== 0) continue; put(RD(c[0] + Math.cos(a) * 9), RD(c[1] + Math.sin(a) * 5), EL[3]); } }   // 转快了：外圈一道断续的环形速度线
    drawBooms(f12, 1);
    if (tornT < 0.55) {                                                          // 假人头顶的银蓝小旋风：螺旋上升、越往上越宽
      const top = HY - 30, H = RD(Math.min(1, tornT / 0.15) * 12);
      for (let k = 0; k < H * 3; k++) { const h = k / 3, r = 1.5 + h * 0.45, a = h * 1.2 - tornT * 26; if (tornT > 0.35 && ((k + f12) & 1)) continue; put(RD(DUMMY_X + Math.cos(a) * r), RD(top - h + Math.sin(a) * 0.8), h > H - 3 ? EL[1] : Math.cos(a) > 0 ? EL[2] : EL[3]); }
    }
  }

  return {
    name: '狂王', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glint, M.gem], HIT_POINT: [1, -18], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'bolt', style: 'blade', w: 0.35, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
