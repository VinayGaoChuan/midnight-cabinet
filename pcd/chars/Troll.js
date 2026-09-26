// 巨魔（部队 · 兽人 · 先锋 · 普通）：瘦长高个、微驼、手长过膝；近侧前臂外侧长出一块肩胛骨形的骨臂盾横在胸前，
// 后掠长尖耳 + 下颌两根上翘獠牙，背脊三根骨刺；身上缝合疤和苔绿再生痂，兽皮缠腰布，三趾赤脚。
// 攻击 = 骨臂盾护胸、后手三根骨爪从盾侧斜向下抓；技能 = 特性「骸骨再生」生效：地上碎骨飞回伤口、背刺弹出、
// 伤疤自下而上合拢、苔绿十字光点上升（持续回血）。
// 升级成「黄魔」（YellowDemon.js）或「绿魔」（GreenDemon.js）：骨臂盾、后掠长耳 + 上翘獠牙、背脊骨刺三件识别特征两条线都保留。
PCD.define('Troll', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING, fxRamp, hash,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL_PT, K_PHYS,
    spawn, spawnX, burst, shake, flash, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：骸骨再生 · 骨白苔绿（白 → 骨白 → 淡苔 → 苔绿 → 墨绿）─────
  const R_EL = fxRamp('boneMoss', [21, 17, '#b4d88a', 36, 34]), EL = FXR[R_EL], R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: ['#121a18', '#2c4540', '#4a6e60', '#78a088'],          // 青灰苔皮（主材质）
    leg: ['#121a18', '#2c4540', '#4a6e60', '#78a088'],           // 同色，单独一个材质：腿不吃轮廓光
    bone: 'bone', hide: [20, 20, 19, 32], scar: [55, 55, 56, 57],
    moss: { r: [34, 34, 36, '#b4d88a'], flat: 1 },                // 苔绿再生痂（发光体：再生的伤口）
    eye: { r: [0, 0, 62, 5], flat: 1 },
  });
  const BODY = { body: 'tall', leg: 12, torso: 10, head: 5, headW: 5, hunch: 1, arm: 12, limb: 1.1, lw: 2, stride: 5, fall: 'front' };
  const HX = 78, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(78, 52, 36, 47);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 9, 11], rimRamp: EL, flash: 0, dq: 0, rimAll: 1, skip: new Uint8Array(256) };
  for (const k of ['moss', 'eye', 'scar', 'hide', 'leg']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 骨臂盾臂（hx hy），后手 = 骨爪（bhx bhy）─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, ear: 0, hdn: 0,
    spine: 1, spineN: 3, wnd: 0, heal: 0, wo: 0, slabSp: 0, so: 0, clw: 0, scr: 0, mouth: 0, eyes: 0, flash: 0, lying: 0, lift: 0,
    gem: 0, rim: 0, dq: 0, dqk: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  // so：骨臂盾朝向 0 前臂竖起（外侧朝前）· 1 前臂下垂 · 2 前臂平伸（外侧朝下）· 3 前臂平伸（外侧朝上，护头）· 4 前臂竖起（外侧朝后，倒地时朝上）
  const K = (hx, hy, bhx, bhy, lean, head, crouch, so) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0, so: so || 0 });
  const K_IDLE = K(8, -19, -5, -8);                             // 骨臂盾竖在胸前，骨爪垂在大腿边
  const K_WIND = K(8, -19, -6, -19, -1, 0, 1);                   // 后手高高抬到身后
  const K_CLAW = K(9, -18, 12, -11, 1, 1, 1);                    // 骨爪从盾下侧斜向下抓出
  const K_HOLD = K(9, -18, 11, -8, 1, 0, 1);
  const K_CHG = K(8, -25, 2, -12, 1, 0, 2, 0);                   // 半蹲弓背、骨臂盾竖起挡住头脸
  const K_CAST = K(13, -24, -10, -22, -1, -1, 0);                // 挺身张臂
  const K_HURT = K(6, -17, -3, -9, -1, -1);
  const K_KNEEL = K(9, -3, 4, -9, 2, 1, 4, 1);                   // 骨臂盾先撑地
  const K_LIE = K(1, -31, -2, -7, 0, 0, 0, 4);                   // 前扑：骨臂盾那只手伸过头顶
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch', 'so'];
  const setK = (A, B, q) => { E.mix(P, A, B, q, FIELDS); P.so = q < 0.5 ? A.so : B.so; };
  const KEY = E.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['sway', -2, 2], ['ear', -1, 1], ['hdn', 0, 1], ['spine', 0, 2], ['spineN', 0, 3], ['wnd', 0, 3], ['heal', 0, 6],
    ['wo', 0, 1], ['slabSp', 0, 1], ['so', 0, 4], ['clw', 0, 1], ['scr', 0, 4], ['mouth', 0, 1], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3],
    ['gem', 0, 4], ['rim', 0, 3], ['dqk', 0, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const EAR_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_CLAW = 2 / 12, T_PLANT = INCOMING + 0.34, T_LAND = INCOMING + 0.66;
  // 待机个性（1.6–2.0 s）：低头，后手骨爪抠前臂上的伤疤——痂掉下来，伤口冒两颗苔绿光点又合上
  const SCRATCH = [[1, 2, -14], [2, 3, -15], [3, 2, -14], [4, 3, -15], [0, 0, -11]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.ear = 0; P.hdn = 0; P.spine = 1; P.spineN = 3; P.wnd = 0; P.heal = 0; P.wo = 0; P.slabSp = 0;
    P.clw = 0; P.scr = 0; P.mouth = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.gem = 0; P.rim = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.ear = EAR_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const k = SCRATCH[Math.floor((lp - 1.6) * 12 + 1e-6)]; P.scr = k[0]; P.bhx = k[1]; P.bhy = k[2]; P.hdn = k[0] ? 1 : 0; P.head = k[0] ? 1 : 0; P.wo = k[0] === 3 ? 1 : 0; P.gem = k[0] === 4 ? 1 : 0; P.ear = -1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 长臂甩荡的大步：两臂反向甩到膝下，身子一前一后地摇
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      const s = P.step; P.so = 1; P.hx = 3 - 5 * s; P.hy = s ? -9 : -8; P.bhx = -2 + 5 * s; P.bhy = s ? -9 : -8; P.lean = s ? 1 : 0; P.ear = s ? -1 : 1; P.sway = -s;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      P.clw = 1;
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.ear = 1; }
      else if (tq < 0.2) { setK(K_CLAW, K_CLAW, 0); P.bx = 3; P.ear = -1; P.sway = -1; P.mouth = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_CLAW, K_HOLD, q); P.bx = 3; P.ear = -1; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); }
    } else if (st === CHARGE) {                                        // 半蹲弓背护头；碎骨飞回伤口；伤口由暗红逐格变苔绿；背刺缩进皮下
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_CHG, q);
      P.ear = q > 0.5 ? -1 : 0; P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.rim = 2; P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1);
      P.wnd = tq < 0.3 ? 0 : tq < 0.6 ? 1 : tq < 0.9 ? 2 : 3; P.spine = tq < 0.5 ? 1 : 0;
      if (tq >= 1.1) P.bx = (f12 & 1) ? 1 : 0;                         // 最后 0.3 s 憋着劲发抖
    } else if (st === CAST) {                                          // 挺身张臂：三根背刺「咔」地一起弹出，骨臂盾边缘长出一圈新骨刺
      setK(K_CHG, K_CAST, ease.out(clamp01(tq / 0.12))); P.spine = 2; P.slabSp = 1; P.mouth = 1; P.ear = -1; P.gem = 3; P.rim = tq < 0.2 ? 3 : 2; P.wnd = 3; P.clw = 1;
      P.heal = tq < 0.16 ? 0 : Math.min(6, 1 + Math.floor((tq - 0.16) / 0.065 + 1e-6));   // 伤疤自下而上逐行合上（0.4 s）
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q);
      P.spine = q < 0.4 ? 2 : 1; P.slabSp = q < 0.3 ? 1 : 0; P.heal = 6; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.ear = q < 0.5 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = 1; P.sway = 1; P.mouth = 1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.ear = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 踉跄 → 骨臂盾先撑地、撑不住 → 面朝下扑倒 → 伤口想再生两次又熄灭 → 背刺一根根缩回
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.ear = 1; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 2; P.mouth = 1; }
      else if (d < 0.5) { setK(K_KNEEL, K_KNEEL, 0); P.bx = -1; P.eyes = 1; P.ear = 1; if (d >= 0.42) { P.crouch = 5; P.hy += 1; P.lean = 2; } }
      else {
        setK(K_LIE, K_LIE, 0); P.lying = 1; P.bx = -1; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        P.gem = d < 0.66 ? 0 : d < 0.8 ? 2 : d < 0.92 ? 4 : d < 1.05 ? 2 : 4;   // 伤口冒两次苔绿光，想再生，随即熄灭
        P.spineN = d < 1.1 ? 3 : d < 1.25 ? 2 : d < 1.4 ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.scr = 0; P.bhx = K_IDLE.bhx; P.bhy = K_IDLE.bhy; P.hdn = 0; P.head = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.gem = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    const R0 = parts.rig(P, BODY), c = wound(R0);                      // 发光体 = 胸口的再生伤口
    if (P.lying) { const s = parts.toSprite(R0, c[0], c[1]); P.gx = s[0] + P.bx; P.gy = s[1] - 2; }
    else { P.gx = c[0] + P.bx; P.gy = c[1]; }
    P.dqk = RD(P.dq * 48); KEY(P);
  }
  const wound = (R) => [RD((parts.edges(R, R.yS + 5)[0] + parts.edges(R, R.yS + 5)[1]) / 2), R.yS + 5];

  // ───── 画（部件从后往前）─────
  let R = null;
  const px = (x, y, m, t) => parts.px(E, R, x, y, m, t), run = (y, a, b, m, t) => parts.run(E, R, y, a, b, m, t), line = (a, b, c, d, m, t) => parts.line(E, R, a, b, c, d, m, t);
  const mossT = () => (P.gem === 4 ? 2 : P.gem >= 2 ? 4 : 3);         // 再生痂：平时 3 级，蓄力 / 施放亮到 4 级，熄灭（死亡）暗到 2 级
  // 背脊骨刺：肩胛到后腰三根，斜向后上方伸出背线（spine 0 缩进皮下 · 1 平时 · 2 弹出加长 2 格；spineN = 还露着几根，死亡时从下往上缩回）
  const SPINE_ROW = [2, 5, 8], SPINE_LEN = [3, 2, 2];
  function spines() {
    if (!P.spine) return;
    E.part();
    for (let k = 0; k < 3; k++) {
      if (k >= P.spineN) continue;
      const y = R.yS + SPINE_ROW[k], e = parts.edges(R, y)[0], L = SPINE_LEN[k] + (P.spine === 2 ? 2 : 0);
      for (let i = -1; i <= L; i++) {                                  // 根部 3 格厚（压进背里 1 格），越往尖越细，尖端斜向后上方
        const w = i <= 0 ? 3 : Math.max(1, RD(3 * (1 - i / (L + 1)))), yt = y + 1 - Math.max(0, i);
        for (let j = 0; j < w; j++) px(e - i, yt + j, M.bone, i === L ? 4 : j === w - 1 && w > 1 ? 2 : 0);
      }
    }
  }
  // 候选部件：boneSlab —— 前臂骨板（肩胛骨形，宽头在手那端、窄尾在肘那端），按前臂方向 90° 换朝向；u 向外、v 向肘；spikes = 边缘新长的骨刺
  const SLAB = ['hhBB.', 'hBBBB', 'hBrBB', 'BBBrB', 'BMBrd', 'BBBBd', '.BBBd', '.BBd.', '..Bd.'];   // 5×9；第 0 行在手背上方 3 格
  const SLAB_SP = [[1, -1], [3, -1], [5, 1], [5, 3], [5, 5], [4, 7]];
  const ORI = [[1, 0, 0, 1], [1, 0, 0, -1], [0, -1, 1, 0], [0, -1, -1, 0], [-1, 0, 0, 1]];   // (U, V) → (dx, dy)
  function boneSlab(hx, hy, so, spikes) {
    const A = ORI[so], at = (u, v) => [hx + A[0] * u + A[1] * (v - 3), hy + A[2] * u + A[3] * (v - 3)];
    E.part();
    for (let v = 0; v < SLAB.length; v++) for (let u = 0; u < 5; u++) {
      const ch = SLAB[v][u]; if (ch === '.') continue; const p = at(u, v);
      if (ch === 'M') px(p[0], p[1], M.moss, mossT()); else px(p[0], p[1], M.bone, ch === 'h' ? 4 : ch === 'd' ? 2 : ch === 'r' ? 4 : 0);
    }
    if (spikes) for (const [u, v] of SLAB_SP) { const p = at(u, v); px(p[0], p[1], M.bone, 4); }
  }
  // 骨爪：三根，扇形张开（clw 1 = 张开 3 格，0 = 收拢 2 格）
  function claws(hx, hy, ex, ey) {
    const a = Math.atan2(hx - ex, -(hy - ey)), L = P.clw ? 3 : 2, sp = P.clw ? 0.8 : 0.45;
    E.part();
    for (const da of [-sp, 0, sp]) { const di = parts.snapDir(a + da); for (let k = 1; k <= L; k++) { const c = parts.cell(di, hx, hy, k + 1); px(c[0], c[1], M.bone, k === L ? 4 : 3); } }
  }
  // 疤：胸口一道斜着的缝合疤 + 肚子一道 + 大腿一道；wnd = 蓄力时变苔绿的比例，heal = 自下而上合上了几档，痂（moss）在疤上
  const HEAL_Y = [99, -7, -11, -15, -18, -21, -99];
  function scarPx(x, y, i, n, scab) {
    if (y >= HEAL_Y[P.heal]) return;
    const moss = P.wnd && i < Math.ceil(n * P.wnd / 3);
    if (moss || scab) px(x, y, M.moss, mossT()); else px(x, y, M.scar, (i & 1) ? 3 : 2);
  }
  function scars() {
    const y0 = R.yS + 3, e = parts.edges(R, y0);
    for (let i = 0; i < 5; i++) { const x = e[1] - 1 - i, y = y0 + RD(i * 0.8); scarPx(x, y, i, 5, i === 2); if ((i & 1) && y < HEAL_Y[P.heal]) px(x, y - 1, M.bone, 3); }
    const yb = R.yWaist + 2, eb = parts.edges(R, yb);
    for (let i = 0; i < 3; i++) scarPx(eb[1] - 2 - i, yb, i, 3, false);
  }
  function legScar() {                                                 // 近侧大腿（和腿同一部件）
    const c = R.legFx, y = R.yHip + 3; if (R.kneel || R.lie) return;
    scarPx(c, y, 0, 2, false); scarPx(c - 1, y + 1, 1, 2, true);
  }
  function feet() {                                                    // 三趾赤脚：脚尖一格骨白趾爪
    if (R.kneel || R.lie) return;
    E.part(); px(R.footFx + 3, -R.footFup, M.bone, 3); px(R.footBx + 2, -R.footBup, M.boneD, 3);
  }
  function loincloth() {                                               // 兽皮缠腰布：腰一圈 + 前后两片，下摆锯齿随步子摆
    E.part(); const y0 = R.yHip - 1, e = parts.edges(R, y0), sw = P.sway;
    run(y0, e[0], e[1], M.hide, 0); px(e[1] - 1, y0, M.hide, 4); px(e[0] + 2, y0, M.hide, 2);
    const FW = [3, 3, 2, 1];                                           // 前片：一块兽皮垂到大腿中段，尖角随步子摆
    for (let k = 0; k < 4; k++) { const y = R.yHip + k, s = k >= 2 ? sw : 0, b = e[1] - 1 + s; run(y, b - FW[k] + 1, b, M.hide, 0); }
    const BW = [2, 2, 1];                                              // 后片短
    for (let k = 0; k < 3; k++) { const y = R.yHip + k, s = k >= 1 ? -sw : 0; run(y, e[0] + s, e[0] + s + BW[k] - 1, M.hide, 0); }
    px(e[1] - 2 + (sw > 0 ? 1 : 0), R.yHip + 1, M.hide, 2);
  }
  function head() {                                                    // 头小而长、下颌前突、眉骨压着眼、下颌两根獠牙上翘
    const x0 = R.hx0, dn = P.hdn, top = R.htop + dn, sk = M.skin, c = (i) => x0 + i, r = (j) => top + j;   // 头小而长：第 2 行是眼，第 4 行是嘴，第 5 行是前突的下颌
    E.part();
    run(r(0), c(1), c(3), sk, 0); run(r(1), c(0), c(4), sk, 0); run(r(2), c(0), c(4), sk, 0); run(r(3), c(0), c(5), sk, 0); run(r(4), c(1), c(5), sk, 0); run(r(5), c(2), c(5), sk, 0);
    px(c(4), r(1), sk, 4); px(c(5), r(1), sk, 4);                       // 眉骨前凸
    if (P.eyes) { px(c(3), r(2), sk, 1); px(c(4), r(2), sk, 1); } else { px(c(3), r(2), M.eye, 3); px(c(4), r(2), sk, 2); }
    px(c(5), r(3), sk, 3); px(c(4), r(3), sk, 2);                       // 长鼻头 + 鼻孔
    if (P.mouth) { px(c(3), r(4), M.scar, 1); px(c(4), r(4), M.scar, 2); px(c(4), r(5), M.scar, 1); } else { px(c(3), r(4), sk, 1); px(c(4), r(4), sk, 1); }
    px(c(6), r(2), M.bone, 4); px(c(6), r(3), M.bone, 3); px(c(6), r(4), M.bone, 3); px(c(6), r(5), M.bone, 2);   // 近侧獠牙：从下颌往上翘，高出上唇 2 格
    px(c(1), r(1), sk, 4); px(c(1), r(4), sk, 2); px(c(2), r(5), sk, 2);
    // 后掠长尖耳（伸出脑后 3 格），ear -1 竖起 · 0 · 1 耷拉
    E.part(); const ea = P.ear, tipY = r(0) + (ea < 0 ? -1 : ea > 0 ? 2 : 0);
    px(c(0), r(2), sk, 0); px(c(0), r(3), sk, 2); px(c(-1), r(2), sk, 0); px(c(-1), r(1) + (ea > 0 ? 1 : 0), sk, 0); px(c(-2), r(1) + (ea > 0 ? 1 : 0), sk, 0);
    px(c(-2), r(2), sk, 2); px(c(-3), tipY, sk, 4); if (ea < 0) px(c(-3), tipY + 1, sk, 0);
  }
  function drawHero() {
    E.begin(hero, P.bx, 0); R = parts.rig(P, BODY);
    const scratching = P.scr > 0 && !R.lie;
    let fa = null;
    const farArm = () => { fa = parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, hand: M.skinD }); claws(fa.hx, fa.hy, fa.ex, fa.ey); };
    if (!scratching) farArm();
    parts.legs(E, R, P, { style: 'bare', mat: M.leg, matD: M.legD }); legScar();
    feet();
    parts.torso(E, R, P, { style: 'bare', mat: M.skin }); scars();
    loincloth();
    spines();                                                          // 背刺从背里长出来：压在躯干上（分界线落在皮肤上，骨刺保持骨白）
    if (scratching) farArm();                                          // 抠伤疤：后手从胸前横过来
    head();
    const na = parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, grip: 'none' });
    { const x = RD((R.sFx + na.ex) / 2), y = RD((R.sFy + na.ey) / 2);   // 上臂的伤疤（和手臂同一部件；待机时被骨爪抠的就是它）
      if (P.wo) { px(x, y, M.scar, 4); px(x, y + 1, M.scar, 3); } else if (y < HEAL_Y[P.heal]) { px(x, y, M.moss, mossT()); px(x, y + 1, M.scar, 2); } }
    boneSlab(P.hx, P.hy, P.so, P.slabSp);
    parts.hand(E, R, P, { hand: M.skin });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let clawT = 9, ringT = 9, crossT = 9, chargeAcc = 0, soulAcc = 0, emberAcc = 0, lastStep = 0, lastScr = 0, bubble = 0;
  const CROSS = [];                                                    // 自己身上冒出的苔绿十字光点：[x, y, 延迟, 漂移]
  for (let i = 0; i < 8; i++) CROSS.push([0, 0, 0, 0]);
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s !== CAST) return;
    const cx = wx(1), gy = wy(P.gy);
    ringT = 0; burst(cx, gy, 30, 50, 120, 0.3, 0.7, R_EL, 18);         // 骨白碎屑外爆
    for (let i = 0; i < 12; i++) spawnX(K_PHYS, cx + (Math.random() - 0.5) * 8, gy, (Math.random() - 0.5) * 80, -40 - Math.random() * 50, 0.6 + Math.random() * 0.3, FXI.dust, { g: 260, floor: HY });
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'nature', w: 0.55 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_CLAW) {                                // 三道平行爪痕 + 命中
      clawT = 0; hitDummy(0); const x = DUMMY_X - 4, y = HY - 15;
      burst(x, y, 12, 40, 100, 0.15, 0.35, R_IMP, 10); burst(x, y, 5, 20, 60, 0.2, 0.4, FXI.blood, 6);
      sfx('swing', { kind: 'claw', w: 0.4 }); sfx('hit', { mat: 'flesh', w: 0.4 });
    }
    if (s === CAST && Math.abs(t - 0.16) < 1e-9) {                     // 伤疤开始合拢，十字光点冒出
      crossT = 0; for (let i = 0; i < 8; i++) { const c = CROSS[i]; c[0] = wx(-4 + RD(hash(i, 3) * 10)); c[1] = wy(-6 - RD(hash(i, 7) * 18)); c[2] = i * 0.045; c[3] = (hash(i, 9) - 0.5) * 6; }
      shake(0.12, 1); sfx('impact', { pal: 'nature', w: 0.3 });
    }
    if (s === DEATH && Math.abs(t - T_PLANT) < 1e-9) { const x = wx(12); for (let i = 0; i < 5; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 4, HY - 1, (Math.random() - 0.5) * 20, -6 - Math.random() * 8, 0.4, FXI.dust); }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) { for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 8 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust); shake(0.1, 1); sfx('fall', { w: 0.5 }); }
    if (s === DEATH && (Math.abs(t - (INCOMING + 0.68)) < 1e-9 || Math.abs(t - (INCOMING + 0.95)) < 1e-9)) {   // 伤口冒苔绿光点，想再生
      bubble = 1; for (let i = 0; i < 5; i++) spawn(K_RISE, wx(-2 + Math.random() * 20), wy(-6 - Math.random() * 2), (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.4 + Math.random() * 0.3, R_EL);
    }
  }
  const EVENTS = [[], [], [T_CLAW], [], [0.16], [], [], [T_PLANT, T_LAND, INCOMING + 0.68, INCOMING + 0.95], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                            // 地上的碎骨定点汇聚，飞回胸口和前臂的伤口
      chargeAcc += dt * (30 + 40 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const toArm = Math.random() < 0.35, tx = toArm ? wx(P.hx - 3) : wx(P.gx - P.bx), ty = toArm ? wy(P.hy + 5) : wy(P.gy);
        const a = 0.35 + Math.random() * (Math.PI - 0.7), r = 12 + Math.random() * 10;
        spawnX(K_SPIRAL_PT, tx, ty, r / (0.35 + Math.random() * 0.35), 0, 9, R_EL, { a, r, w: (Math.random() - 0.5) * 2, squash: 1 });
      }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.35 }); const n = 1 + (Math.random() < 0.5 ? 1 : 0); for (let i = 0; i < n; i++) spawn(K_DUST, wx(P.step > 0 ? 6 : -6) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.2, FXI.dust); } lastStep = P.step; }
    if (state === IDLE && P.scr !== lastScr) {                         // 抠下来的痂掉在地上；伤口冒两颗光点
      if (P.scr === 3) spawnX(K_PHYS, wx(P.hx - 2), wy(P.hy + 6), 4, 0, 0.9, FXI.dust, { g: 200, floor: HY });
      if (P.scr === 4) for (let i = 0; i < 2; i++) spawn(K_EMBER, wx(P.hx - 2 + i), wy(P.hy + 5), (Math.random() - 0.5) * 4, -8 - Math.random() * 4, 0.6, R_EL);
      lastScr = P.scr;
    }
    if (state === RECOVER && stT < 0.5) { emberAcc += dt * 8; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, wx(RD(Math.random() * 6) - 2), wy(-20), (Math.random() - 0.5) * 6, -8 - Math.random() * 6, 0.7 + Math.random() * 0.4, R_EL); } }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 28, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    clawT += dt; ringT += dt; crossT += dt;
  }
  function fxReset() { clawT = 9; ringT = 9; crossT = 9; chargeAcc = 0; soulAcc = 0; emberAcc = 0; lastStep = 0; lastScr = 0; bubble = 0; }
  function fxBack(f12) {
    if (P.dq < 1 && !P.lying) floorGlow(wx(P.gx - P.bx), P.rim, EL, f12);
    shotFloorGlow(f12);
    if (ringT < 0.3) {                                                 // 贴地压扁的苔绿冲击环
      const q = ringT / 0.3, r = 3 + q * 26, c = q < 0.25 ? EL[0] : q < 0.55 ? EL[2] : EL[3], n = Math.ceil(r * 4), cx = wx(1);
      for (let i = 0; i < n; i++) { if (q > 0.5 && ((i + f12) & 1)) continue; const a = i / n * 6.2832; put(RD(cx + Math.cos(a) * r), RD(HY + Math.sin(a) * r * 0.22), c); }
    }
  }
  function fxFront(f12) {
    if (clawT < 2 / 12) {                                              // 三道平行爪痕（从盾下侧斜向下）
      const c = clawT < 1 / 12 ? EL[1] : EL[2], x0 = DUMMY_X - 9, y0 = HY - 23;
      for (let j = 0; j < 3; j++) for (let k = 0; k < 10; k++) { if (clawT >= 1 / 12 && ((k + j) & 1)) continue; put(x0 + k + j * 3, y0 + k, k < 2 || k > 7 ? EL[2] : c); }
    }
    if (crossT < 1.4) {                                                // 苔绿十字光点：中心 + 上下左右各 1 格，缓慢上升并走完色阶
      for (let i = 0; i < 8; i++) {
        const c = CROSS[i], a = crossT - c[2]; if (a < 0 || a > 1.0) continue;
        const q = a / 1.0, x = RD(c[0] + Math.sin(a * 4 + i) * 1 + c[3] * q), y = RD(c[1] - a * 14), col = EL[q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4];
        put(x, y, col); if (q < 0.82) { put(x + 1, y, col); put(x - 1, y, col); put(x, y - 1, col); put(x, y + 1, col); }
      }
    }
  }

  return {
    name: '巨魔', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.moss], HIT_POINT: [2, -15], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'nature', style: 'heal', w: 0.55 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn: () => {}, stepFX, fxReset, fxBack, fxFront,
  };
});
