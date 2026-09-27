// 流浪乐师（奇遇 G011 · NPC）：午夜桥下没有脸的街头乐师——瘦高长人（约 41 格），一顶比肩还宽的旧棕软毡帽（酒红帽带），
// 长及小腿的暗梅紫大衣、身后开张的燕尾下摆（酒红里衬），胸前抱一把曼陀林（蜂蜜色圆琴身、会发光的音孔、斜伸到身前的长琴颈、黄铜弦轴头）。
// 脸是一块没有五官的苍白椭圆（骨色），脑后垂着暗发——他把琴弓递给了玩家，自己抱着曼陀林伴奏。站在左边，面朝右（玩家）。
// 待机 = 打拍子：随拍子前后轻摇、前脚每拍点地，第 4 拍空扫一个无声的和弦。移动 = 长步滑行（经过帧整个人离地 1 格，燕尾向后拖）。
// 攻击（玩家打出 PERFECT）= 一记重扫弦，音孔迸出 3 个像素音符：1 个划短弧往前飞，2 个往上飘；不打假人。
// 技能（连击 5 狂热）= 脱帽致意 → 把帽子甩到身后蓄势 → 抛帽（帽子翻滚着飞上去）同时疯狂扫弦，金色音符喷泉 + 帽口洒纸屑 → 帽子落回头上 → 鞠躬。
// 受击（错音）= 往后一缩、帽子被震歪，苍白的脸荡开一圈圈涟漪，掉出一个走调的灰音符。
// 死亡（离场）= 帽子被掀飞、倒扣在身后地上，人从头往下化成雾和飘走的音符，曼陀林悬在空中最后熄灭消散。
PCD.define('MidnightFiddler', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, FLOOR, INCOMING, B8, DT,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST, K_SPIRAL,
    spawn, burst, releaseOrbit, ring, shake, flash, fx, put, scrX, floorGlow, shotFloorGlow, shoot, sfx } = E;
  const RD = Math.round, PX = parts.px, RUN = parts.run, CELL = parts.cell, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：灯下的金色音符 tune（白 21 → 淡金 51 → 金 14 → 暗金 61 → 棕 20，只引用色板下标）；纸屑 paper；雾 dust ─────
  //   不直接用 holy（2–3 级是奶油白，音符读成白块）也不用 coin（第 2 级是奶油）：音符大半辈子是金色，最后暗成棕色融进夜里
  const R_EL = E.fxRamp('tune', [21, 51, 14, 61, 20]), EL = FXR[R_EL];
  const R_PAPER = E.fxRamp('paper', [21, 17, 5, 6, 7]), R_MIST = FXI.dust;

  // ───── 材质（全部共享色板）─────
  const M = parts.mats(E, {
    coat: { r: 'shadow', band: 2 }, sleeve: 'shadow', lining: 'crimson', cravat: 'crimson', strap: 'wood',
    hat: 'wood', band: 'crimson', face: 'bone', hair: [0, 0, 52, 53], lace: 'white',
    pants: 'stone', shoe: 'boot', brass: 'gold',
    top: 'leather', neck: 'wood', str: { r: [18, 7, 6, 17], flat: 1 },
    hole: { r: [0, 20, 61, 14], flat: 1 }, shine: { r: [61, 14, 5, 51], flat: 1 }, hot: { r: [14, 51, 21, 21], flat: 1 },
  });
  const tbl = (names, v) => { const t = new Uint8Array(256); for (const k of names) { t[M[k]] = v; if (M[k + 'D'] != null) t[M[k + 'D']] = v; } return t; };
  const MAND = tbl(['top', 'neck', 'str', 'hole', 'shine', 'hot', 'brass'], 1);            // 死亡时最后才消散的曼陀林
  const HATM = tbl(['hat', 'band'], 1);                                                      // 帽子（落地后单独淡出）
  // 路灯轮廓光：左 / 背后的外沿换成暖色（颜色，不是光源）；脸、手、琴、发光体不吃
  const LAMP = new Uint8Array(256);
  for (const k of ['coat', 'sleeve', 'pants']) { LAMP[M[k]] = 32; LAMP[M[k + 'D']] = 32; }
  for (const k of ['hat', 'band']) { LAMP[M[k]] = 33; LAMP[M[k + 'D']] = 33; }
  LAMP[M.shoe] = LAMP[M.shoeD] = 19; LAMP[M.cravat] = LAMP[M.cravatD] = LAMP[M.lining] = LAMP[M.liningD] = 26;

  const BODY = { body: 'slim', leg: 14, torso: 12, head: 8, headW: 5, sw: 3, arm: 13, lw: 2, stride: 5, lift: 1, neck: 1, fall: 'back' };
  const HX = 34, DUR = DEFAULT_DUR.slice(); DUR[IDLE] = 3.0;                                // 待机 = 6 拍（每拍 6 帧 = 0.5 s）
  const hero = new Sprite(78, 72, 38, 67);
  // 音孔的轮廓光（蓄力 / 施放）：发光体在剪影内部 → rimAll；色阶压成 淡金 / 金 / 暗金，半径只到琴周围，不把整个人描成白边
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 9, 13], rimRamp: [51, 14, 61], rimAll: 1, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['face', 'hair', 'lace', 'sleeve', 'top', 'neck', 'str', 'hole', 'shine', 'hot', 'brass']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }   // 袖子横在琴旁，吃光会变成一道道金条

  // ───── 姿势 ─────
  // 前手 hx/hy（拨弦 / 摸帽 / 抛帽）；曼陀林琴身中心 mcx/mcy + 琴颈方向 mdi（吸附档 1 = 1:2 · 2 = 45° · 3 = 2:1）；后手握在琴颈第 fret 格（bhx/bhy 由它算）。
  // tap 前脚点地 · str 琴弦振动 0–2 · ripple 脸上涟漪 0–3 · hatL 帽子图层（0 无 · 1 戴在头上 · 2 手里 / 空中 · 3 身后 / 地上）+ hatX/hatY（1 = 相对头的偏移，2/3 = 本地坐标）· hr 90° 翻滚档 · ht 倾斜 -2..2
  // noHands 手臂不画（死亡：身体化完后琴悬在空中）· dqb 身体消散 · dqm 曼陀林消散 · dqh 地上的帽子消散 · dq 复活显形
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, mcx: 0, mcy: 0, mdi: 2, fret: 6, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0, bend: 0, beard: 0,
    tap: 0, gem: 0, glint: 0, rim: 0, flash: 0, str: 0, ripple: 0, hatL: 1, hatX: 0, hatY: 0, hr: 0, ht: 0, noHands: 0,
    dq: 0, dqi: 0, dqb: 0, dqbi: 0, dqm: 0, dqmi: 0, dqh: 0, dqhi: 0, lift: 0, lying: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, mcx, mcy, lean, crouch, fret) => ({ hx, hy, mcx, mcy, lean, crouch, fret: fret == null ? 6 : fret });
  const K_IDLE = K(6, -14, 6, -16, 0, 0);
  const K_SUP = K(9, -21, 6, -16, -1, 0);        // 扫弦前：手抬到音孔上方、身体后仰
  const K_SDN = K(4, -10, 6, -16, 1, 1);         // 扫下去：手砸到琴桥下、前倾下沉
  const K_HOLD = K(4, -11, 6, -16, 1, 0);
  const K_REACH = K(7, -33, 6, -16, 0, 0);       // 蓄力：前手去摸帽檐
  const K_TIP = K(8, -36, 6, -16, 1, 0);         //       脱帽致意（帽子抬起 2 格、前倾）
  const K_WIND = K(-5, -16, 6, -18, -1, 2, 7);   //       帽子甩到身后腰边（横着拖在身后），后仰屈膝蓄势，琴抱高
  const K_TOSS = K(5, -39, 6, -16, 1, 0);        // 施放：手甩到头顶，把帽子抛上去
  const K_FUP = K(9, -21, 6, -16, 1, 0), K_FDN = K(4, -10, 6, -16, 1, 1);   // 疯狂扫弦：上 / 下交替
  const K_BOW = K(4, -21, 5, -14, 2, 3);         // 收招：鞠躬，前手按在胸口，琴垂到身侧
  const K_HURT = K(6, -20, 5, -17, -1, 1);       // 受击：一缩，手被震离琴弦
  const K_SAG = K(5, -12, 6, -14, 1, 2);         // 死亡：垂肩屈膝，琴颈下垂
  const FIELDS = ['hx', 'hy', 'mcx', 'mcy', 'lean', 'crouch', 'fret'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -14, 22], ['hy', -48, 2], ['bhx', -6, 24], ['bhy', -38, -4], ['mcx', -2, 12], ['mcy', -26, -6], ['mdi', 1, 4],
    ['lean', -1, 2], ['crouch', 0, 4], ['bob', 0, 1], ['bx', -6, 6], ['step', -1, 1], ['wup', 0, 2], ['sway', -2, 2], ['bend', 0, 3], ['tap', 0, 1],
    ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['flash', 0, 1], ['str', 0, 2], ['ripple', 0, 3],
    ['hatL', 0, 3], ['hatX', -28, 28], ['hatY', -62, 4], ['hr', 0, 3], ['ht', -2, 2], ['noHands', 0, 1],
    ['dqi', 0, 12], ['dqbi', 0, 12], ['dqmi', 0, 12], ['dqhi', 0, 12], ['lift', 0, 1], ['st', 0, 8]]);
  const T_STRIKE = 2 / 12, T_TIP = 4 / 12, T_CATCH = 5 / 12;
  const T_POP = INCOMING + 0.1, T_HATLAND = INCOMING + 0.1 + 5 / 12, T_LAST = INCOMING + 1.75, T_OUT = INCOMING + 2.0;
  const CAST_T = [1 / 12, 2 / 12, 3 / 12, 4 / 12, T_CATCH];
  // 抛帽轨迹（施放第 0–4 帧，本地坐标 [x, y, 翻滚档, 倾斜]；第 5 帧落回头上）
  const HAT_TOSS = [[4, -43, 0, -1], [3, -48, 1, 0], [2, -51, 2, 0], [1, -50, 3, 0], [1, -44, 0, 0]];
  // 死亡：帽子被掀飞，翻滚着落到身后、倒扣在地上（第 0–5 帧）
  const HAT_FALL = [[-2, -39, 0], [-5, -42, 3], [-8, -39, 3], [-10, -31, 2], [-12, -19, 2], [-13, -4, 2]];
  const SW4 = [0, 1, 0, -1];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.bend = 0; P.beard = 0; P.bob = 0; P.tap = 0; P.lift = 0; P.lying = 0; P.head = 0;
    P.gem = 0; P.glint = 0; P.rim = 0; P.flash = 0; P.str = 0; P.ripple = 0; P.mdi = 2; P.noHands = 0;
    P.hatL = 1; P.hatX = 0; P.hatY = 0; P.hr = 0; P.ht = 0; P.dq = 0; P.dqb = 0; P.dqm = 0; P.dqh = 0; P.flip = 0; P.mx = 0;
    let hatHand = 0;                                                    // 1 = 帽子在前手里（锚在手上）：tip 横握 · 2 = 竖着提在腰边
    const idle = () => {                                                 // 打拍子：每拍 6 帧，拍点下沉 1 格、前脚在拍前抬起拍上落下，身体隔拍前后摇 1 格
      setK(K_IDLE, K_IDLE, 0);
      const lp = tq % DUR[IDLE], f = f12of(lp), b = Math.floor(f / 6), ph = f % 6;
      P.bob = ph < 2 ? 1 : 0; P.lean = b & 1; P.tap = ph >= 4 ? 1 : 0; P.sway = SW4[Math.floor((f + 2) / 3) & 3];
      if (f >= 19 && f <= 23) {                                          // 第 4 拍：空扫一个无声的和弦
        const k = f - 19;
        if (k <= 1) { setK(K_IDLE, K_SUP, k === 0 ? 0.6 : 1); P.lean = 0; P.gem = 1; }
        else if (k === 2) { setK(K_SDN, K_SDN, 0); P.lean = 1; P.crouch = 0; P.str = 2; P.glint = 1; P.gem = 1; P.ht = 1; }
        else if (k === 3) { setK(K_SDN, K_HOLD, 1); P.str = 1; P.ht = 1; }
        else { setK(K_HOLD, K_IDLE, 0.6); P.str = 2; }
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 长步滑行：步幅 5、脚只抬 1 格，经过帧整个人离地 1 格；燕尾向后拖
      setK(K_IDLE, K_IDLE, 0); const f = gait(tq); parts.gait(P, f);
      P.bob = 0; P.beard = 0; P.lift = P.wup ? 1 : 0; P.lean = 1; P.bend = P.wup ? 3 : 2; P.ht = P.wup ? 0 : 1;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < T_STRIKE) { setK(K_IDLE, K_SUP, tq < 1 / 12 ? 0.6 : 1); P.gem = 1; P.ht = -1; }
      else if (tq < 3 / 12) { setK(K_SDN, K_SDN, 0); P.gem = 2; P.rim = 2; P.str = 2; P.ht = 1; P.sway = -1; P.bend = 1; }
      else if (tq < 0.45) { setK(K_SDN, K_HOLD, ease.out((tq - 3 / 12) / 0.2)); P.gem = 1; P.str = (f12 & 1) ? 2 : 1; P.ht = tq < 0.33 ? 1 : 0; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.25))); P.str = tq < 0.55 ? 1 : 0; }
    } else if (st === CHARGE) {
      if (tq < 0.25) setK(K_IDLE, K_REACH, ease.inOut(tq / 0.25));
      else if (tq < 0.5) { setK(K_REACH, K_TIP, ease.out(clamp01((tq - 0.25) / 0.17))); hatHand = 1; P.ht = 1; }
      else if (tq < 0.8) { const q = ease.inOut((tq - 0.5) / 0.3); setK(K_TIP, K_WIND, q); hatHand = 1; P.ht = q < 0.5 ? 0 : -1; if (q >= 0.5) P.mdi = 1; }
      else {
        setK(K_WIND, K_WIND, 0); hatHand = 1; P.ht = -1; P.mdi = 1;
        if (tq > 0.95) P.hy += (f12 & 1);                                // 蓄满：帽子在手里一抖一抖
        if (tq > 1.0) { P.bend = 1; P.sway = (f12 & 1) ? -1 : 0; }
      }
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.2 ? 1 : 2;
    } else if (st === CAST) {
      const f = CL(f12of(tq), 0, 5);
      if (f === 0) setK(K_TOSS, K_TOSS, 0); else if (f & 1) setK(K_FDN, K_FDN, 0); else setK(K_FUP, K_FUP, 0);
      if (f < 5) { const h = HAT_TOSS[f]; P.hatL = 2; P.hatX = h[0]; P.hatY = h[1]; P.hr = h[2]; P.ht = h[3]; }
      P.str = (f & 1) ? 2 : 1; P.gem = 3; P.rim = 3; P.bend = 1; P.sway = (f & 1) ? -1 : 1; if (f === 5) P.glint = 1;
    } else if (st === RECOVER) {                                         // 戴好帽子，鞠一躬，再直起身
      if (tq < 0.12) setK(K_FDN, K_FDN, 0);
      else if (tq < 0.45) { const q = ease.out(clamp01((tq - 0.12) / 0.2)); setK(K_FDN, K_BOW, q); P.ht = q > 0.5 ? 2 : 1; if (q > 0.5) P.mdi = 3; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.25)); setK(K_BOW, K_IDLE, q); P.ht = q < 0.4 ? 2 : q < 0.8 ? 1 : 0; if (q < 0.5) P.mdi = 3; }
      const q = tq / DUR[RECOVER]; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.3 ? 2 : q < 0.6 ? 1 : 0; P.str = tq < 0.2 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.25) { setK(K_HURT, K_HURT, 0); P.mdi = 1; P.bx = -2; P.flash = h < 1 / 12 ? 1 : 0; P.ripple = h < 1 / 12 ? 1 : h < 2 / 12 ? 2 : 3; P.ht = -1; P.hatY = -1; P.str = 2; P.sway = 1; P.bend = 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.ripple = 1; P.ht = -1; P.str = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                           // 帽落 → 化雾：人从头往下化成雾和音符，曼陀林悬在空中最后消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.1) { setK(K_HURT, K_HURT, 0); P.mdi = 1; P.bx = -2; P.flash = d < 1 / 12 ? 1 : 0; P.ripple = 1; P.ht = -1; P.hatY = -3; P.str = 2; P.gem = 1; }
      else {
        const q = ease.out(clamp01((d - 0.1) / 0.3)); setK(K_HURT, K_SAG, q); P.bx = -2 + RD(q);
        if (q > 0.5) P.mdi = 3; else P.mdi = 1;
        const hf = Math.min(5, f12of(d - 0.1)), h = HAT_FALL[hf]; P.hatL = 3; P.hatX = h[0]; P.hatY = h[1]; P.hr = h[2];
        if (d < 0.9) P.ripple = 1 + (f12 % 3);
        P.dqb = clamp01((d - 0.55) / 0.95); if (P.dqb >= 0.9) P.noHands = 1;
        if (d > 1.5) P.mcy += RD(3 * ease.inOut(clamp01((d - 1.5) / 0.6)));   // 没了手，琴悬在空中慢慢往下沉
        P.gem = d < 1.7 ? ((f12 % 4) === 0 ? 2 : 1) : d < 2.0 ? ((f12 & 1) ? 1 : 0) : d < 2.1 ? ((f12 & 1) ? 1 : 4) : 4;
        P.dqh = clamp01((d - 1.7) / 0.4); P.dqm = clamp01((d - 2.1) / 0.45);
        P.str = d < 0.3 ? 1 : 0;
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.bob + Math.min(3, RD(P.crouch)), ls = RD(P.lean * 0.5);
    P.lean = RD(P.lean); P.crouch = RD(P.crouch);
    P.hx = RD(P.hx) + ls; P.hy = RD(P.hy) + yo; P.mcx = RD(P.mcx) + ls; P.mcy = RD(P.mcy) + yo;
    const c = CELL(P.mdi, P.mcx, P.mcy, RD(P.fret)); P.bhx = c[0] + 1; P.bhy = c[1] + 1;
    if (hatHand) { P.hatL = 2; P.hatX = P.hx - 7; P.hatY = P.hy - 1; P.hr = 0; }                             // 捏着帽檐前端（帽子横着）
    P.gx = RD(P.mcx + DV[P.mdi][0]) + P.bx; P.gy = RD(P.mcy + DV[P.mdi][1]) - P.lift;                       // 音孔中心
    P.dqi = RD(P.dq * 12); P.dqbi = RD(P.dqb * 12); P.dqmi = RD(P.dqm * 12); P.dqhi = RD(P.dqh * 12);
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：coatTails —— 身后的燕尾下摆：从后腰垂到离地 2 格，越往下越向后外扩（bend 被风吹向后、sway 摆），
  //   下沿是一道从腿后斜向后下方的斜边，末端收成一个尖；斜边露出酒红里衬，中间一道暗褶
  function coatTails(R) {
    E.part();
    const y0 = R.yWaist + 1, yb = -2, n = yb - y0, e = parts.edges(R, y0), x0 = e[0] + 1, sw = P.sway || 0, bd = P.bend || 0;
    for (let y = y0; y <= yb; y++) {
      const t = (y - y0) / n, L = RD(x0 - 1 - 6.5 * Math.pow(t, 1.25) - bd * t * t * 1.3 + sw * t * t);
      const Rr = Math.min(x0 + 2, L + 2 + (yb - y) * 2);
      RUN(E, R, y, L, Rr, M.coatD, 0);
      if (Rr < x0 + 2) PX(E, R, Rr, y, M.lining, 3);                    // 斜边上的里衬
      if (t > 0.3 && Rr - L > 4) PX(E, R, L + 2 + RD(t), y, M.coatD, 2);  // 暗褶
    }
  }
  // 候选部件：blankHead —— 没有五官的头：苍白椭圆脸（头顶 / 下巴收圆）+ 2 格脖子 + 脑后一列暗发垂到领口；
  //   ripple 1–3：从脸中心往外荡开一圈暗环（环内提亮），≥ 2 时脸的前沿逐行错 1 格（抖成波浪）
  function blankHead(R) {
    E.part();
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, bot = R.hy, ey = R.ey, rp = P.ripple;
    for (let y = top; y <= bot; y++) {
      let a = x0, b = x1; if (y === top || y === bot) { a++; b--; }
      if (rp >= 2 && ((y + rp) & 1) && y > top && y < bot) b += 1;
      RUN(E, R, y, a, b, M.face, 0);
    }
    RUN(E, R, bot + 1, x0 + 1, x0 + 2, M.face, 2);                      // 脖子
    for (let y = top + 1; y <= bot; y++) PX(E, R, x0, y, M.hair, 0);    // 脑后暗发
    for (let y = ey; y <= bot + 1; y++) PX(E, R, x0 - 1, y, M.hair, y === bot + 1 ? 2 : 0);
    PX(E, R, x0 + 1, top, M.hair, 0);
    if (rp) {                                                            // 涟漪：环心在脸正中（帽檐下那块苍白的中间），一圈暗环往外走
      const cx = x0 + 2.5, cy = ey + 1.5;
      for (let y = ey; y <= bot; y++) for (let x = x0 + 1; x <= x1 + 1; x++) {
        const d = Math.hypot(x - cx, (y - cy) * 0.8);
        if (Math.abs(d - (rp - 0.3)) < 0.55) PX(E, R, x, y, M.face, 2); else if (rp >= 2 && d < 0.8) PX(E, R, x, y, M.face, 4);
      }
    }
  }
  // 候选部件：feltHat —— 宽檐软毡帽（帽檐本地坐标：u = 0 帽子中线，v = 0 帽檐那一行，向上为负）：
  //   帽檐 15 格、两端下垂 1 格；酒红帽带；帽顶三行向后收、正中一个捏痕；一块磨旧的暗斑。tilt 整顶按列错位（前低后高 = 点头 / 脱帽致意）；
  //   T 是落笔变换（r0 = 90° 翻滚档：抛帽时翻滚、落地时倒扣）
  const HF = { r0: 0, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 };
  const hatFrame = (x, y, r0) => { HF.r0 = r0 & 3; HF.tx = RD(x); HF.ty = RD(y); return HF; };
  function feltHat(T, tilt) {
    E.part();
    const m = M.hat, sh = (u) => RD(tilt * u / 7);
    for (let u = -7; u <= 7; u++) PX(E, T, u, sh(u), m, u === 5 ? 4 : 0);                 // 帽檐（前端一格高光）
    PX(E, T, -7, 1 + sh(-7), m, 0); PX(E, T, 7, 1 + sh(7), m, 3);                          // 两端下垂
    for (let u = -3; u <= 3; u++) PX(E, T, u, -1 + sh(u), M.band, u === -3 ? 4 : 0);        // 酒红帽带
    for (let u = -3; u <= 3; u++) PX(E, T, u, -2 + sh(u), m, 0);
    for (let u = -3; u <= 2; u++) PX(E, T, u, -3 + sh(u), m, 0);
    for (let u = -2; u <= 1; u++) PX(E, T, u, -4 + sh(u), m, 0);
    PX(E, T, 0, -4 + sh(0), m, 2);                                                           // 帽顶捏痕
    PX(E, T, -2, -3 + sh(-2), m, 4); PX(E, T, 1, -2 + sh(1), m, 2);                          // 高光 · 磨旧的暗斑
  }
  // 候选部件：mandolin —— 曼陀林（一个部件：发光的音孔嵌在琴里）。琴身 = 沿琴颈方向的梨形（半长 4.6、半宽 3.6，朝琴颈收窄），
  //   左上亮、右下暗（自动明暗）；琴身上沿中轴一道琴弦（暗，拨弦时逐格亮暗交替）、中轴后段一道垂直于琴颈的暗色琴桥、尾端黄铜拉弦板、
  //   音孔右下一块暗色护板；音孔 = 中心往琴颈方向 1 格处的 2×2，5 档亮度（0 暗金余烬 · 1 · 2 · 3 白金 · 4 熄灭）。
  //   琴颈 = 吸附方向 di（parts.cell 同一套 1:2 / 45° / 2:1 档）上从琴身尖开始的 2 格宽条：受光侧一格是琴弦、另一格暗木（隔格一个品丝亮点）；
  //   接着 3 格黄铜弦轴头，头尾两格两侧各伸出一个弦钮，端头一格高光
  const DV = [[0, -1], [1, -2], [1, -1], [2, -1], [1, 0]].map(([x, y]) => [x / Math.hypot(x, y), y / Math.hypot(x, y)]);
  const MAJ = [1, 0.894, 0.707, 0.894, 1], BA = 4.6, BB = 3.6;
  const N0 = MAJ.map((m) => Math.ceil((BA - 0.9) * m - 1e-6)), NL = MAJ.map((m) => RD(8.5 * m));
  const HOLE = [[[M.hole, 3], [M.hole, 2], [M.hole, 2], [M.hole, 3]], [[M.hole, 4], [M.hole, 3], [M.hole, 3], [M.hole, 4]], [[M.shine, 4], [M.shine, 3], [M.shine, 3], [M.shine, 4]],
    [[M.hot, 4], [M.hot, 2], [M.hot, 2], [M.hot, 4]], [[M.hole, 1], [M.hole, 1], [M.hole, 1], [M.hole, 1]]];
  const VERT = [1, 1, 1, 0, 0];
  function mandolin(T, cx, cy, di) {
    E.part();
    const ux = DV[di][0], uy = DV[di][1], vt = VERT[di], vib = P.str, H = HOLE[CL(P.gem, 0, 4)];
    const hx0 = RD(cx + ux - 0.5), hy0 = RD(cy + uy - 0.5), sT = (k) => (vib ? (((k + vib) & 1) ? 4 : 2) : 2);
    for (let dy = -6; dy <= 6; dy++) for (let dx = -6; dx <= 6; dx++) {
      const u = dx * ux + dy * uy, v = -dx * uy + dy * ux, b = u > 0 ? BB * (1 - 0.3 * (u / BA) * (u / BA)) : BB;
      if ((u * u) / (BA * BA) + (v * v) / (b * b) > 1) continue;
      const x = cx + dx, y = cy + dy;
      if (x >= hx0 && x <= hx0 + 1 && y >= hy0 && y <= hy0 + 1) { const h = H[(y - hy0) * 2 + (x - hx0)]; PX(E, T, x, y, h[0], h[1]); continue; }
      if (Math.abs(u + 2.4) < 0.6 && Math.abs(v) < 1.9) PX(E, T, x, y, M.top, 1);                                // 琴桥
      else if (u < -3.1 && Math.abs(v) < 1) PX(E, T, x, y, M.brass, v < 0 ? 4 : 3);                              // 拉弦板
      else if (Math.abs(v) < 0.5 && u > -2.4) PX(E, T, x, y, M.str, sT(RD(u)));                                  // 琴弦
      else if (v > 1.2 && v < 2.7 && u > -1.7 && u < 0.9) PX(E, T, x, y, M.top, 2);                              // 护板
      else PX(E, T, x, y, M.top, 0);
    }
    const at = (k, j, m, t) => { const c = CELL(di, cx, cy, k); PX(E, T, vt ? c[0] + j : c[0], vt ? c[1] : c[1] + j, m, t); };
    const n0 = N0[di], n1 = n0 + NL[di] - 1;
    for (let k = n0; k <= n1; k++) { at(k, 0, M.str, sT(k)); at(k, 1, M.neck, ((k - n0) & 1) ? 4 : 0); }
    for (let k = n1 + 1; k <= n1 + 3; k++) { at(k, 0, M.brass, k === n1 + 3 ? 4 : 0); at(k, 1, M.brass, k === n1 + 3 ? 3 : 2); }
    for (const k of [n1 + 1, n1 + 3]) { at(k, -1, M.brass, 4); at(k, 2, M.brass, 2); }
    if (P.glint && P.gem !== 4) PX(E, T, hx0 - 1, hy0, M.hot, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, BODY); if (P.tap) R.footFup = 1;
    const hand = P.hatL === 2 && P.st === CHARGE;
    if (P.hatL === 3) feltHat(hatFrame(P.hatX, P.hatY, P.hr), P.ht);
    coatTails(R);
    if (!P.noHands) parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.sleeveD, grip: 'none', at: [P.bhx, P.bhy] });
    parts.legs(E, R, P, { style: 'shoe', mat: M.pants, matD: M.pantsD, boot: M.shoe, bootD: M.shoeD, w: 2 });
    parts.torso(E, R, P, { style: 'coat', mat: M.coat, hem: -5, flare: 3, flareF: 2, collar: M.cravat, buttons: M.brass, strap: M.strap });
    blankHead(R);
    if (P.hatL === 1) feltHat(hatFrame(R.hx + P.hatX, R.htop + 1 + P.hatY, P.hr), P.ht);
    // 前臂（袖 + 蕾丝袖口）画在琴后面：前臂绕到琴身侧面，琴身整个露出来；拨弦的手最后压在琴弦上
    if (!P.noHands) parts.arm(E, R, P, { sleeve: 'loose', mat: M.sleeve, cuff: M.lace, cuffStyle: 'lace', grip: 'none', at: [P.hx, P.hy] });
    mandolin(R, P.mcx, P.mcy, P.mdi);
    if (!P.noHands) {
      parts.hand(E, R, P, { side: 'B', at: [P.bhx, P.bhy], hand: M.face });
      if (!hand) parts.hand(E, R, P, { at: [P.hx, P.hy], hand: M.face });
    }
    if (P.hatL === 2) feltHat(hatFrame(P.hatX, P.hatY, P.hr), P.ht);
    if (hand && !P.noHands) parts.hand(E, R, P, { at: [P.hx, P.hy], hand: M.face });   // 捏帽子的手压在帽檐上
  }
  // 路灯轮廓光：每一行最左边的实心像素（左边贴着勾线 / 空白）换成暖色；灯在左上方高处，只打到帽子、后脑、肩背（胸口以下不打）
  function lampRim(s) {
    const w = s.w, h = s.h, mat = s.mat, o = s.out, yMax = -20 + P.bob + Math.min(3, P.crouch);
    for (let y = 0; y < h; y++) {
      const ly = y - s.oy + P.lift; if (ly > yMax) continue;
      for (let x = 1; x < w; x++) { const i = y * w + x, m = mat[i]; if (!m || mat[i - 1] || o[i] === 255 || !LAMP[m]) continue; o[i] = LAMP[m]; }
    }
  }
  // 化雾：身体从头顶往下按抖动消散；曼陀林和地上的帽子各自按抖动淡出（不带上下偏置）
  const clsAt = (s, i) => { const m = s.mat[i] || s.mat[i + s.w] || s.mat[i + 1] || s.mat[i - 1] || s.mat[i - s.w] || 0; return MAND[m] ? 1 : HATM[m] && P.hatL === 3 ? 2 : 0; };
  function dissolve(s) {
    const w = s.w, h = s.h, o = s.out; let top = h, bot = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (o[i] !== 255 && clsAt(s, i) === 0) { if (y < top) top = y; if (y > bot) bot = y; } }
    const span = Math.max(1, bot - top);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (o[i] === 255) continue; const c = clsAt(s, i), b = B8[(y & 7) * 8 + (x & 7)];
      if (c === 1) { if (P.dqm > 0 && b < P.dqm) o[i] = 255; }
      else if (c === 2) { if (P.dqh > 0 && b < P.dqh) o[i] = 255; }
      else if (P.dqb > 0 && b * 0.55 + CL((y - top) / span, 0, 1) * 0.45 < P.dqb) o[i] = 255;
    }
  }
  function bakeHero() {
    RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM);
    if (!P.flash) lampRim(hero);
    if (P.dqb > 0 || P.dqm > 0 || P.dqh > 0) dissolve(hero);
  }

  // ───── 特效 ─────
  // 像素音符 / 纸屑（角色专属形状，引擎粒子只有 1 格，所以自己养一个预分配的小池）：0 浮起 · 1 纸屑（下落 + 翻飞）· 2 被吸进音孔 · 3 走调的音符（下坠）
  const GLYPH = [
    [2, -4, 3, -3, 2, -3, 2, -2, 2, -1, 0, -1, 1, -1, 0, 0, 1, 0],                                            // ♪
    [1, -4, 2, -4, 3, -4, 4, -4, 1, -3, 4, -3, 1, -2, 4, -2, 1, -1, 4, -1, 0, -1, 3, -1, 0, 0, 1, 0, 3, 0, 4, 0],   // ♫
    [1, -3, 2, -2, 1, -2, 1, -1, 0, -1, 0, 0, 1, 0],                                                           // 小 ♪
    [0, 0, 1, 0], [0, 0, 0, 1], [0, 0],                                                                        // 纸屑：横 · 竖 · 点
  ];
  const NN = 56, nOn = new Uint8Array(NN), nK = new Uint8Array(NN), nG = new Uint8Array(NN), nR = new Uint8Array(NN);
  const nX = new Float32Array(NN), nY = new Float32Array(NN), nVX = new Float32Array(NN), nVY = new Float32Array(NN), nAge = new Float32Array(NN), nLife = new Float32Array(NN), nPh = new Float32Array(NN), nTX = new Float32Array(NN), nTY = new Float32Array(NN);
  let nHead = 0;
  function note(k, x, y, vx, vy, life, g, ramp, age0) {
    let i = nHead; for (let n = 0; n < NN; n++) { const j = (nHead + n) % NN; if (!nOn[j]) { i = j; break; } }
    nHead = (i + 1) % NN; nOn[i] = 1; nK[i] = k; nG[i] = g; nR[i] = ramp == null ? R_EL : ramp; nX[i] = x; nY[i] = y; nVX[i] = vx; nVY[i] = vy; nLife[i] = life; nAge[i] = (age0 || 0) * life; nPh[i] = Math.random() * 6.28; nTX[i] = x; nTY[i] = y; return i;
  }
  const DRAG_F = Math.exp(-2.2 * DT), DRAG_C = Math.exp(-3.5 * DT);
  function stepNotes(dt) {
    for (let i = 0; i < NN; i++) {
      if (!nOn[i]) continue; nAge[i] += dt; if (nAge[i] >= nLife[i]) { nOn[i] = 0; continue; }
      const k = nK[i];
      if (k === 0) { nVX[i] *= DRAG_F; nVY[i] = nVY[i] * DRAG_F - 9 * dt; nX[i] += (nVX[i] + Math.sin(nAge[i] * 5 + nPh[i]) * 5) * dt; nY[i] += nVY[i] * dt; }
      else if (k === 1) { nVX[i] *= DRAG_C; nVY[i] = nVY[i] * DRAG_C + 70 * dt; nX[i] += (nVX[i] + Math.sin(nAge[i] * 9 + nPh[i]) * 9) * dt; nY[i] += nVY[i] * dt; if (nY[i] > FLOOR - 1) { nY[i] = FLOOR - 1; nVX[i] = 0; nVY[i] = 0; } }
      else if (k === 2) { const dx = nTX[i] - nX[i], dy = nTY[i] - nY[i], d = Math.hypot(dx, dy); if (d < 2) { nOn[i] = 0; continue; } const v = 16 + 70 * nAge[i]; nX[i] += (dx / d * v - dy / d * 12) * dt; nY[i] += (dy / d * v + dx / d * 12) * dt; }
      else { nVY[i] += 80 * dt; nX[i] += nVX[i] * dt; nY[i] += nVY[i] * dt; if (nY[i] > FLOOR - 1) { nY[i] = FLOOR - 1; nVX[i] = 0; nVY[i] = 0; } }
    }
  }
  function drawNotes(f12) {
    for (let i = 0; i < NN; i++) {
      if (!nOn[i]) continue; const R = FXR[nR[i]], k = nK[i];
      let ci;
      if (k === 2) { const d = Math.hypot(nTX[i] - nX[i], nTY[i] - nY[i]); ci = d < 5 ? 0 : d < 10 ? 1 : 2; }
      else { const q = nAge[i] / nLife[i]; ci = q < 0.15 ? 0 : q < 0.35 ? 1 : q < 0.6 ? 2 : q < 0.82 ? 3 : 4; }
      const g = k === 1 ? (nG[i] === 5 ? 5 : ((f12 + RD(nPh[i] * 2)) & 2) ? 3 : 4) : nG[i], G = GLYPH[g], x0 = RD(nX[i]), y0 = RD(nY[i]), c = R[ci];
      for (let p = 0; p < G.length; p += 2) put(x0 + G[p], y0 + G[p + 1], c);
      if (k !== 1 && ci <= 1 && g !== 5) put(x0, y0 - 1, R[0]);          // 音符头上的亮点
    }
  }
  // 声波弧：从音孔朝前扩散的一段圆弧（亮 → 暗，后半段断续）
  const AN = 6, aT = new Float32Array(AN).fill(9), aX = new Float32Array(AN), aY = new Float32Array(AN), aSp = new Float32Array(AN), aLife = new Float32Array(AN), aSpan = new Float32Array(AN);
  function arc(x, y, sp, life, span, delay) { let o = 0; for (let k = 0; k < AN; k++) if (aT[k] - aLife[k] > aT[o] - aLife[o]) o = k; aT[o] = -(delay || 0); aX[o] = x; aY[o] = y; aSp[o] = sp; aLife[o] = life; aSpan[o] = span; }
  function drawArcs(f12) {
    for (let k = 0; k < AN; k++) {
      const t = aT[k]; if (t < 0 || t >= aLife[k]) continue; const q = t / aLife[k], r = 3 + t * aSp[k], sp = aSpan[k], n = Math.max(3, Math.ceil(r * sp * 2));
      const c = q < 0.2 ? EL[0] : q < 0.45 ? EL[1] : q < 0.7 ? EL[2] : EL[3];
      for (let i = 0; i <= n; i++) { if (q > 0.5 && ((i + f12) & 1)) continue; const a = -sp + 2 * sp * i / n; put(RD(aX[k] + Math.cos(a) * r), RD(aY[k] + Math.sin(a) * r * 0.9), i === 0 || i === n ? EL[Math.min(4, 2 + (q > 0.5 ? 1 : 0))] : c); }
    }
  }
  let smT = 9, smX = 0, smY0 = 0, smY1 = 0, shotX0 = 0, shotTX = 0, chargeAcc = 0, homeAcc = 0, emberAcc = 0, mistAcc = 0, noteAcc = 0, lastStep = 0, lastPers = -1;
  const wx = (x) => scrX(x + P.bx), wy = (y) => HY + y - P.lift;
  const hole = () => [scrX(P.gx), HY + P.gy];
  function flingNotes(x, y, n, vmin, vmax, a0, a1, life) {
    for (let i = 0; i < n; i++) { const a = a0 + (a1 - a0) * (n > 1 ? i / (n - 1) : Math.random()) + (Math.random() - 0.5) * 0.2, v = vmin + Math.random() * (vmax - vmin); note(0, x + Math.sin(a) * 3, y - Math.cos(a) * 3, Math.sin(a) * v, -Math.cos(a) * v, life + Math.random() * 0.4, (i % 3) === 1 ? 1 : (i & 1) ? 2 : 0); }
  }
  function confetti(x, y, n, vy0, vy1, vx) {
    for (let i = 0; i < n; i++) note(1, x + (Math.random() - 0.5) * 6, y + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * vx, vy0 + Math.random() * (vy1 - vy0), 1.4 + Math.random() * 0.8, (i % 4) === 3 ? 5 : 3, (i % 3) === 2 ? R_EL : R_PAPER);
  }
  function onEnter(s) {
    if (s !== CAST) return;                                              // 抛帽：环绕光点外爆 + 金星 + 大冲击环 + 3 道声波弧 + 音符喷泉 + 帽口洒纸屑
    const h = hole();
    releaseOrbit(40, 90, 0.3, 0.6);
    burst(h[0], h[1], 24, 50, 120, 0.25, 0.6, R_EL, 14); ring(h[0], h[1], 1, R_EL);
    for (let k = 0; k < 3; k++) arc(h[0] + 3, h[1], 95, 0.42, 0.95, k * 0.09);
    flingNotes(h[0] + 1, h[1] - 2, 6, 55, 85, -0.5, 1.3, 1.5);
    confetti(wx(P.hatX), wy(P.hatY + 1), 12, -55, -25, 60);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_STRIKE) {                                // 重扫弦：拖影 + 声波弧 + 1 个弧线音符（弹道）+ 2 个上飘音符
      const h = hole();
      smT = 0; smX = wx(K_SDN.hx + 1); smY0 = wy(K_SUP.hy - 1); smY1 = wy(P.hy);
      arc(h[0] + 3, h[1], 70, 0.25, 0.8, 0);
      shotX0 = h[0] + 2; shotTX = shotX0 + 30; shoot(1, shotX0, h[1] - 3, 95, shotTX, R_EL, 0, { trail: false, glow: -1 });
      note(0, h[0] - 1, h[1] - 3, -6, -30, 1.1, 0); note(0, h[0] + 2, h[1] - 4, 8, -24, 1.3, 2);
      burst(h[0], h[1], 6, 25, 55, 0.12, 0.3, R_EL, 6);
      sfx('swing', { kind: 'bow', w: 0.3 }); sfx('shoot', { proj: 'note' });
    }
    if (s === CHARGE && t === T_TIP) {                                   // 脱帽致意：帽檐前端一闪
      const x = wx(P.hatX + 7), y = wy(P.hatY + 1); fx.cross(x, y, 3, R_EL, 0.25); burst(x, y, 4, 15, 35, 0.15, 0.3, R_EL, 4);
    }
    if (s === CAST) {
      const i = CAST_T.indexOf(t), h = hole();
      if (i >= 0 && i < 4) {                                             // 疯狂扫弦：每帧迸音符，隔帧一道声波弧
        flingNotes(h[0] + 1, h[1] - 2, 1, 45, 75, 0.1, 1.1, 1.3);
        if (i & 1) arc(h[0] + 3, h[1], 80, 0.3, 0.85, 0);
        burst(h[0], h[1], 3, 20, 50, 0.1, 0.25, R_EL, 4);
        if (i === 3) confetti(wx(P.hatX), wy(P.hatY + 2), 10, -15, 5, 45);   // 帽子翻回正面，帽口再洒一把
      }
      if (t === T_CATCH) {                                               // 帽子落回头上：头顶冲击环 + 十字星芒 + 音符往上弹
        const R = parts.rig(P, BODY), x = wx(R.hx), y = wy(R.htop - 3);
        ring(x, y, 0, R_EL); fx.cross(x, y - 2, 5, R_EL, 0.3); burst(x, y, 12, 30, 80, 0.2, 0.45, R_EL, 10);
        flingNotes(x, y - 2, 3, 35, 55, -0.9, 0.9, 1.2);
        shake(0.12, 1); sfx('impact', { pal: 'holy', w: 0.5 });
      }
    }
    if (s === HURT && t === INCOMING) {                                  // 走调的音符：暗灰 ♪ 从音孔掉出来往下坠
      const h = hole(); note(3, h[0], h[1] - 2, 10, -25, 0.9, 0, R_MIST, 0.3);
    }
    if (s === DEATH && t === T_HATLAND) {                                // 帽子倒扣落地：软毡一声闷响
      const x = wx(P.hatX); for (let i = 0; i < 5; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 12, HY - 1, (Math.random() - 0.5) * 22, -3 - Math.random() * 5, 0.35, FXI.dust);
      sfx('fall', { w: 0.15 });
    }
    if (s === DEATH && t === T_LAST) { const h = hole(); note(0, h[0], h[1] - 2, 3, -14, 1.6, 0, R_EL, 0.1); burst(h[0], h[1], 4, 10, 25, 0.2, 0.4, R_EL, 4); }   // 最后一个音符
    if (s === DEATH && t === T_OUT) { const h = hole(); burst(h[0], h[1], 6, 15, 35, 0.2, 0.5, R_EL, 6); }
  }
  const EVENTS = [[], [], [T_STRIKE], [T_TIP], CAST_T, [], [INCOMING], [T_HATLAND, T_LAST, T_OUT], []];
  function impactOn(k, x, y) {
    if (k !== 1) return;                                                 // 音符在半空碎成金星，再弹出 2 个小音符（不打假人）
    const yy = y + arcY(x); burst(x, yy, 8, 20, 60, 0.15, 0.35, R_EL, 8); fx.cross(x, yy, 3, R_EL, 0.2);
    note(0, x - 1, yy - 1, -10, -26, 0.9, 2); note(0, x + 1, yy - 1, 12, -20, 1.0, 2);
  }
  const arcY = (x) => { const p = clamp01((x - shotX0) / Math.max(1, shotTX - shotX0)); return -RD(9 * 4 * p * (1 - p)); };
  function drawShot(k, x, y, d, f12) {
    if (k !== 1) return false;                                           // 弹道：一个 ♪ 划短弧往前上方飞，2 颗拖尾点
    for (let j = 2; j >= 1; j--) { const xx = x - d * j * 3; if ((xx - shotX0) * d < 0) continue; put(xx, y + arcY(xx), EL[j + 1]); }
    const yy = y + arcY(x), G = GLYPH[0]; for (let p = 0; p < G.length; p += 2) put(x - 1 + G[p], yy + 1 + G[p + 1], EL[1]);
    put(x - 1, yy, (f12 & 1) ? EL[0] : EL[1]);
    return true;
  }
  function stepFX(dt, state, stT) {
    const h = hole();
    if (state === IDLE) {
      emberAcc += dt * 0.8; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, h[0] + RD(Math.random() * 2 - 1), h[1] - 1, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, R_EL); }
      const f = f12of(q12(stT) % DUR[IDLE]);
      if (f !== lastPers) { if (f === 21) note(0, h[0] + 3, h[1] - 7, 3, -12, 1.4, 2, R_EL, 0.4); lastPers = f; }   // 无声的和弦：飘出一个很淡的小音符
    } else lastPers = -1;
    if (state === MOVE) {
      if (P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.1 }); for (let i = 0; i < 2; i++) spawn(K_RISE, scrX(-3 + Math.random() * 4), HY - 1, (Math.random() - 0.5) * 6, -4 - Math.random() * 4, 0.5 + Math.random() * 0.3, R_MIST); } lastStep = P.step; }
      mistAcc += dt * 4; while (mistAcc >= 1) { mistAcc -= 1; spawn(K_RISE, scrX(-6 + Math.random() * 8), HY - 3, (Math.random() - 0.5) * 4 - 6, -3 - Math.random() * 3, 0.5 + Math.random() * 0.3, R_MIST); }
    }
    if (state === CHARGE) {                                              // 金色光点螺旋收进音孔；0.9 s 起小音符一个个被吸进去
      chargeAcc += dt * (14 + 26 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; const r = 11 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, h[0], h[1], (r - 3.5) / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      if (stT > 0.9) { homeAcc += dt * 7; while (homeAcc >= 1) { homeAcc -= 1; const a = -Math.PI * (0.1 + Math.random() * 0.8), r = 14 + Math.random() * 5, i = note(2, h[0] + Math.cos(a) * r, h[1] + Math.sin(a) * r * 0.8, 0, 0, 1.2, 2); nTX[i] = h[0]; nTY[i] = h[1]; } }
    }
    if (state === RECOVER) { emberAcc += dt * 5; while (emberAcc >= 1) { emberAcc -= 1; spawn(K_EMBER, h[0], h[1] - 1, Math.random() * 6 - 3, -7 - Math.random() * 6, 0.6, R_EL); } }
    if (state === DEATH) {
      const d = stT - INCOMING;
      if (d > 0.55 && d < 1.55) {                                        // 化雾：雾粒从消散的那一行往上飘，偶尔飘走一个金色音符
        const yf = -40 + 40 * clamp01((d - 0.55) / 0.95);
        mistAcc += dt * 34; while (mistAcc >= 1) { mistAcc -= 1; spawn(K_RISE, wx(-6 + Math.random() * 13), wy(yf + Math.random() * 4), (Math.random() - 0.5) * 8, -10 - Math.random() * 12, 0.7 + Math.random() * 0.6, R_MIST); }
        noteAcc += dt * 4; while (noteAcc >= 1) { noteAcc -= 1; note(0, wx(-4 + Math.random() * 9), wy(yf + 2), (Math.random() - 0.5) * 12, -14 - Math.random() * 10, 1.3 + Math.random() * 0.5, (Math.random() * 3) | 0); }
      }
      if (d > 2.1 && d < 2.5) { mistAcc += dt * 14; while (mistAcc >= 1) { mistAcc -= 1; spawn(K_RISE, h[0] - 3 + Math.random() * 12, h[1] - 6 + Math.random() * 8, (Math.random() - 0.5) * 6, -8 - Math.random() * 8, 0.6 + Math.random() * 0.4, R_EL); } }
    }
    stepNotes(dt);
    smT += dt; for (let k = 0; k < AN; k++) aT[k] += dt;
  }
  function fxReset() { smT = 9; chargeAcc = 0; homeAcc = 0; emberAcc = 0; mistAcc = 0; noteAcc = 0; lastStep = 0; lastPers = -1; nOn.fill(0); aT.fill(9); }
  function fxBack(f12) { if (P.dqm < 1 && P.gem !== 4) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    const h = hole();
    if (P.gem >= 2 && P.gem <= 3 && P.dqm < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(h[0] + r, h[1], c); put(h[0] - r, h[1], c); put(h[0], h[1] - r, c); put(h[0], h[1] + r, c); } }
    if (smT < 2 / 12) {                                                  // 扫弦拖影：手经过的竖线，第 1 帧白芯淡金、第 2 帧金色断续
      const first = smT < 1 / 12;
      for (let y = smY0; y <= smY1; y++) { if (!first && (y & 1)) continue; put(smX, y, first ? (y === smY1 ? EL[0] : EL[1]) : EL[3]); if (first) put(smX + 1, y, EL[2]); }
    }
    drawArcs(f12); drawNotes(f12);
  }

  return {
    name: '流浪乐师', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.hole, M.shine, M.hot], HIT_POINT: [1, -22], EVENTS,
    REVIVE: { ramp: 'holy', dy: -18 },
    // 音效声明：受击 / 死亡的身体材质（没有脸的怪人：ghost）、死亡方式（化雾）、技能元素与花样、施放重量
    SFX: { body: 'ghost', how: 'dissolve', pal: 'holy', style: 'buff', w: 0.3 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
