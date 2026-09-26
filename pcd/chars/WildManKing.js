// 野人王（部队 · 自然 · 召唤师 · 稀有 · 近战）：野人祭司的进化——同一张鹿颅骨面具放大成王冠面具（鹿角每边 4 叉、缠金藤、插红羽），
// 肥胖的苔泥野人：大肚子上画白色泥纹，肩披拖地的虎斑兽皮大斗篷（领口一圈蓬毛），腰系草裙 + 骨串；右手握骨棒权杖（粗腿骨，顶端一颗野人矛兵的小头骨，眼窝是发光体）。
// 攻击：单手把权杖举过头顶往下砸。技能表现特性「史莱姆繁殖」（攻击攒法力，满了召唤两个野人矛兵）：
// 眼窝 1→2 档、王冠金藤一节节亮起、脚边泥浆冒泡、肚子一鼓一鼓 → 双手高举权杖猛砸地面，两道地裂一前一后分开 →
// 裂缝尽头各拱起一个泥丘破开，蹦出两个野人矛兵的剪影 → 王冠暗下、拍拍肚子。死亡坐倒：一屁股坐地 → 向后仰倒 → 王冠面具滚落 → 肚子冒出两个泥泡 → 消散。
PCD.define('WildManKing', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, gait, walkDemo, FXI, FXR, HY, INCOMING, ASTEP, B8,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_PHYS, K_DUST, K_EMBER,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx, DUMMY_X } = E;
  const RD = Math.round, px = parts.px, run = parts.run, CL = (v, a, b) => (v < a ? a : v > b ? b : v);

  // ───── 元素：泥沼 · 泥土金（earth 色阶 21 白 → 淡土黄 → 土褐 → 深褐 → 墨褐），点缀 gold ─────
  const R_EL = FXI.earth, EL = FXR[R_EL], COIN = FXR[FXI.coin];

  const M = parts.mats(E, {
    skin: ['#141a0c', '#2e3a1a', '#52602e', '#7c8c46'],                    // 苔泥绿褐皮肤（沿用祭司）
    hide: { r: ['#2a1606', '#6a3a14', '#b0702c', '#e0aa5a'], band: 2 },   // 虎斑兽皮斗篷
    fur: ['#2a1606', '#6a3a14', '#b0702c', '#e0aa5a'], bone: 'bone', gold: 'gold', grass: 'sand', paint: 'white', tooth: 'white', feather: 'crimson',
    socket: { r: 'ink', flat: 1 },
    glow: { r: [20, 61, 62, 5], flat: 1 },                               // 眼窝 / 金藤：暗 → 亮
    glowHot: { r: [61, 62, 5, 21], flat: 1 },
  });
  const BODY = { body: 'fat', leg: 6, torso: 10, head: 7, headW: 7, sw: 5, belly: 3, arm: 9, stride: 3, fall: 'back' };
  const BODY_W = Object.assign({}, BODY, { belly: 4 }), BODY_SIT = Object.assign({}, BODY, { leg: 2 });
  const HX = 60, DUR = DEFAULT_DUR.slice(), SMX = HX + 22, FWX = SMX + 6, BKX = HX - 22;   // 砸地点、前 / 后两个矛兵出土点
  const hero = new Sprite(112, 60, 56, 54);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 17], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['bone', 'socket', 'glow', 'glowHot', 'gold', 'tooth', 'skin', 'feather']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 小矛兵剪影（召唤物）：只取形状，画时单色 ─────
  const imp = new Sprite(22, 28, 8, 25);
  (function bakeImp() {
    const m = E.defMat('stone'); E.begin(imp, 0, 0); E.part();
    const R = (y, a, b) => E.run(y, a, b, m, 0);
    for (let y = -3; y <= 0; y++) { R(y, -3, -2); R(y, 1, 2); } E.sp(3, 0, m, 0); E.sp(-1, 0, m, 0);
    R(-4, -4, 3); R(-5, -4, 3); E.sp(-5, -4, m, 0); E.sp(4, -4, m, 0);
    for (let y = -9; y <= -6; y++) R(y, -2, 1);
    R(-17, -2, 1); R(-16, -3, 2); for (let y = -15; y <= -12; y++) R(y, -4, 3); R(-11, -3, 2); R(-10, -2, 1);
    E.sp(4, -13, m, 0); E.sp(4, -12, m, 0);
    E.sp(-3, -18, m, 0); E.sp(-4, -19, m, 0); E.sp(1, -18, m, 0); E.sp(2, -19, m, 0);
    R(-8, 2, 5);
    for (let y = -20; y <= 0; y++) E.sp(6, y, m, 0);
    E.sp(6, -21, m, 0); E.sp(6, -22, m, 0); E.sp(5, -20, m, 0); E.sp(7, -20, m, 0);
    bake(imp, { rim: 0, rimR: [0, 0, 0, 0], rimRamp: EL, flash: 0, dq: 0 });
  })();
  function ghost(X, Y, R5, lv, dq, clipY) {
    const s = imp, o = s.mat, w = s.w;
    for (let y = 0; y < s.h; y++) {
      const yy = Y - s.oy + y; if (yy > clipY) continue;
      for (let x = 0; x < w; x++) {
        const i = y * w + x; if (!o[i] || (dq > 0 && B8[(y & 7) * 8 + (x & 7)] < dq)) continue;
        const edge = x === 0 || !o[i - 1] || y === 0 || !o[i - w];
        put(X - s.ox + x, yy, R5[CL(edge ? lv - 1 : lv, 0, 4)]);
      }
    }
  }

  // ───── 姿势：前手握权杖（hx hy a），后手 bhx bhy（搭在肚子上 / 蓄力时一起举杖）─────
  const P = { hx: 0, hy: 0, a: 0, ai: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, vine: 0, jaw: 0, wob: 0, sit: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0, dqi: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean, head, crouch });
  const K_IDLE = K(11, -11, 0.4, 7, -8, 0, 0, 0);
  const K_WIND = K(3, -25, -0.45, 6, -9, -1, -1, 0);                 // 权杖举过头顶
  const K_SMASH = K(14, -11, 1.95, 7, -9, 2, 1, 1);                   // 往下砸
  const K_HOLD = K(14, -9, 2.1, 7, -8, 2, 1, 1);
  const K_CHARGE = K(7, -27, 0.08, 4, -24, -1, -1, 0);               // 蓄力：双手高举权杖
  const K_SLAM = K(13, -7, 2.25, 10, -8, 2, 1, 2);                    // 施放：猛砸地面
  const K_PAT = K(11, -11, 0.4, 9, -7, 0, 0, 0);                      // 收招：拍拍肚子
  const K_HURT = K(8, -10, 0.1, 5, -9, -1, -1, 0);
  const K_SITP = K(9, -7, 1.2, 5, -6, -1, -1, 0);                     // 死亡：坐倒
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -40, 40], ['hy', -48, 8], ['ai', -72, 72], ['bhx', -40, 40], ['bhy', -48, 8], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['bx', -8, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['bend', 0, 3], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3],
    ['vine', 0, 4], ['jaw', 0, 1], ['wob', 0, 1], ['sit', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['hatX', -24, 8], ['hatY', -2, 8], ['dqi', 0, 48], ['st', 0, 8]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_SMASH = 2 / 12, T_HIT = 3 / 12, T_SIT = INCOMING + 0.3, T_LAND = INCOMING + 0.66;
  // 待机个性 1.6–2.0 s：拍两下肚子（后手）、面具下张嘴打哈欠、斗篷一抖
  const PERS = [[9, -8, 0, 1], [7, -7, 1, -2], [9, -8, 1, 2], [7, -7, 1, -2], [8, -8, 0, 0]];

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.bend = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.vine = 0; P.jaw = 0; P.wob = 0; P.sit = 0;
    P.flash = 0; P.lying = 0; P.lift = 0; P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6), c = PERS[f]; P.bhx = c[0]; P.bhy = c[1]; P.jaw = c[2]; P.sway = c[3]; P.head = f >= 1 && f <= 3 ? -1 : 0; P.wob = f === 1 || f === 3 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 外八阔步：挺着肚子左右摇，每一步肚子晃 1 格
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, gait(tq));
      P.hx += P.step; P.a += P.step * 0.1; P.wob = P.step !== 0 ? 1 : 0; P.sway = -P.step * 2 || P.sway;
      const w = walkDemo(tq, 12, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.gem = 1; P.beard = 2; P.sway = 1; }
      else if (tq < 0.2) { setK(K_SMASH, K_SMASH, 0); P.bx = 3; P.gem = 2; P.rim = 2; P.beard = -2; P.sway = -2; P.wob = 1; }
      else if (tq < 0.45) { setK(K_SMASH, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.bx = 3; P.gem = 1; P.beard = -1; }
      else { setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3))); P.bx = tq < 0.6 ? 2 : tq < 0.68 ? 1 : 0; }
    } else if (st === CHARGE) {                                        // 双手高举：眼窝亮起、金藤一节节亮、肚子一鼓一鼓
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_IDLE, K_CHARGE, q);
      P.vine = Math.min(4, Math.floor(clamp01((tq - 0.2) / 1.0) * 4 + 1e-6) + (tq >= 1.2 ? 1 : 0));
      P.wob = tq > 0.4 ? ((f12 >> 1) & 1) : 0; P.bend = tq > 0.6 ? 1 : 0; P.beard = -1 - (tq > 1.1 && (f12 & 1) ? 1 : 0); P.sway = tq > 0.6 ? -1 : 0;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) { setK(K_CHARGE, K_SLAM, ease.out(clamp01(tq / 0.12))); P.vine = 4; P.gem = 3; P.rim = 3; P.beard = 2; P.sway = -2; P.bend = 2; P.wob = 1; }
    else if (st === RECOVER) {                                         // 王冠暗下，喘口气拍拍肚子
      if (tq < 0.25) setK(K_SLAM, K_PAT, ease.out(tq / 0.25)); else { setK(K_PAT, K_PAT, 0); if (tq < 0.5 && (f12 & 1)) { P.bhx -= 2; P.bhy += 1; } else if (tq >= 0.5) setK(K_PAT, K_IDLE, ease.inOut(clamp01((tq - 0.5) / 0.2))); }
      P.vine = tq < 0.15 ? 4 : tq < 0.3 ? 2 : 0; P.gem = tq < 0.2 ? 2 : tq < 0.45 ? 1 : 0; P.rim = tq < 0.3 ? 2 : 1; P.wob = tq < 0.5 ? ((f12 >> 1) & 1) : 0; P.jaw = tq > 0.2 && tq < 0.45 ? 1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.beard = 2; P.sway = 2; P.bend = 1; P.wob = 1; P.jaw = 1; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.beard = 1; P.sway = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 坐倒 → 向后仰倒 → 面具滚落
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.beard = 2; P.sway = 2; P.wob = 1; P.jaw = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_SITP, K_SITP, 0); P.sit = 1; P.bx = -1; P.beard = 2; P.jaw = 1; P.wob = d < 0.4 ? 1 : 0; P.gem = (f12 & 1) ? 1 : 4; }
      else {
        setK(K_SITP, K_SITP, 0); P.lean = 0; P.head = 0; P.crouch = 0; P.lying = 1; P.bx = -1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        P.hx = 6; P.hy = -12; P.bhx = 4; P.bhy = -6;
        const hq = clamp01((d - 0.6) / 0.45); P.hatX = RD(-12 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 5);
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.lying || P.sit ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.ai = RD(P.a / ASTEP); P.a = P.ai * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dqi = RD(P.dq * 48);
    if (P.lying) { P.gx = DROP_X + 12 + P.bx; P.gy = -3; }
    else { const S = scepPts(P.hx, P.hy, P.a); P.gx = S.sx + P.bx; P.gy = S.sy; }
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  const SUP = 11, SDN = 3, DROP_X = 6, MASK_LX = -28;
  function scepPts(hx, hy, a) { const dx = Math.sin(a), dy = -Math.cos(a); return { dx, dy, tx: hx + dx * SUP, ty: hy + dy * SUP, bx: hx - dx * SDN, by: hy - dy * SDN, sx: RD(hx + dx * (SUP + 2)), sy: RD(hy + dy * (SUP + 2)) - 1 }; }
  const GLOW = [[M.glow, 2], [M.glow, 3], [M.glowHot, 3], [M.glowHot, 4], [M.socket, 1]];
  // 候选部件：boneScepter —— 骨棒权杖（2 格粗腿骨 + 骨节柄头 + 缠柄金藤 + 顶端一颗小野人头骨，眼窝发光 5 档）
  function boneScepter(T, hx, hy, a) {
    const S = scepPts(hx, hy, a), nx = -S.dy, ny = S.dx;
    E.part();
    parts.line(E, T, S.bx, S.by, S.tx, S.ty, M.bone, 3); parts.line(E, T, S.bx - nx, S.by - ny, S.tx - nx, S.ty - ny, M.bone, 2);
    parts.brush(E, T, S.bx - nx * 0.5, S.by - ny * 0.5, 1.2, M.bone, 0);                              // 腿骨下端的骨节
    for (const k of [2, 5, 8]) px(E, T, hx + S.dx * k + nx * 0.6, hy + S.dy * k + ny * 0.6, M.gold, k === 5 ? 4 : 3);   // 缠柄金藤
    const cx = S.sx, cy = S.sy + 1, G = GLOW[P.gem];                                                   // 小头骨（按屏幕直立）
    E.part();
    run(E, T, cy - 3, cx - 1, cx + 1, M.bone, 0); run(E, T, cy - 2, cx - 2, cx + 2, M.bone, 0); run(E, T, cy - 1, cx - 2, cx + 3, M.bone, 0); run(E, T, cy, cx - 1, cx + 2, M.bone, 0);
    px(E, T, cx - 2, cy - 4, M.bone, 3); px(E, T, cx + 2, cy - 4, M.bone, 4);                          // 两只小角
    px(E, T, cx + 1, cy - 2, G[0], G[1]); px(E, T, cx, cy - 2, G[0], Math.max(1, G[1] - 1));           // 眼窝
    px(E, T, cx, cy, M.bone, 1); px(E, T, cx + 2, cy, M.bone, 4);                                      // 齿缝
    if (P.glint && P.gem !== 4) px(E, T, cx + 2, cy - 4, M.glowHot, 4);
    return S;
  }
  // 候选部件：crownMask —— 鹿颅骨王冠面具（祭司面具放大一圈：7 格颅 + 11 格长吻，额前一道金藤箍，下颌能张开）
  function crownMask(T, x0, top, jaw) {
    E.part(); const m = M.bone;
    run(E, T, top, x0 + 1, x0 + 5, m, 0); run(E, T, top + 1, x0, x0 + 6, m, 0); run(E, T, top + 2, x0, x0 + 7, m, 0);
    run(E, T, top + 3, x0, x0 + 9, m, 0); run(E, T, top + 4, x0, x0 + 10, m, 0); run(E, T, top + 5, x0 + 1, x0 + 10, m, 0);
    run(E, T, top + 6 + jaw, x0 + 2, x0 + 9 - jaw, m, 0);                                              // 下颌（打哈欠时掉下 1 格）
    if (jaw) { run(E, T, top + 6, x0 + 3, x0 + 8, M.socket, 1); }
    for (let x = x0 + 5; x <= x0 + 8; x++) px(E, T, x, top + 6 + jaw, m, (x & 1) ? 4 : 2);            // 齿列
    const G = P.gem === 4 ? [M.socket, 1] : P.vine >= 1 || P.gem >= 2 ? [M.glowHot, P.gem >= 3 ? 4 : 3] : [M.socket, 1];
    px(E, T, x0 + 5, top + 2, G[0], G[1]); px(E, T, x0 + 6, top + 2, G[0], G[1]); px(E, T, x0 + 5, top + 3, G[0], Math.max(1, G[1] - 1));   // 眼洞
    px(E, T, x0 + 6, top + 1, m, 4); px(E, T, x0 + 7, top + 2, m, 4);                                  // 眉骨
    px(E, T, x0 + 9, top + 4, m, 1); px(E, T, x0 + 10, top + 5, m, 4);                                 // 鼻孔 + 吻尖
    run(E, T, top + 5, x0 + 3, x0 + 7, m, 2);
    for (let x = x0 + 1; x <= x0 + 4; x++) px(E, T, x, top + 1 + (x & 1), x <= P.vine ? M.glowHot : M.gold, x <= P.vine ? 4 : (x & 1) ? 3 : 2);   // 额前金藤箍
  }
  // 候选部件：palmAntlers —— 王冠鹿角：每边一根掌状主干 + 4 叉，主干上缠金藤（v 节亮起），后面那支暗一级
  const ANT_F = [[[4, -1], [8, -3], [11, -4], [13, -6]], [[5, -2], [5, -7]], [[8, -3], [8, -9]], [[11, -4], [12, -9]]];
  const ANT_B = [[[2, -1], [-2, -3], [-5, -4], [-7, -6]], [[1, -2], [1, -6]], [[-2, -3], [-2, -8]], [[-5, -4], [-6, -8]]];
  const VINE_F = [[5, -1], [7, -2], [10, -3], [12, -5]], VINE_B = [[1, -1], [-1, -2], [-4, -3], [-6, -5]];
  function palmAntlers(T, x0, top) {
    E.part();
    const L = (m, pts) => { for (let i = 1; i < pts.length; i++) parts.line(E, T, x0 + pts[i - 1][0], top + pts[i - 1][1], x0 + pts[i][0], top + pts[i][1], m, 3); };
    for (const s of ANT_B) L(M.boneD, s); for (const s of ANT_F) L(M.bone, s);
    for (const s of ANT_F.slice(1)) px(E, T, x0 + s[1][0], top + s[1][1], M.bone, 4); px(E, T, x0 + 13, top - 6, M.bone, 4);
    for (let i = 0; i < 4; i++) { const on = i < P.vine; px(E, T, x0 + VINE_F[i][0], top + VINE_F[i][1], on ? M.glowHot : M.gold, on ? 4 : 3); px(E, T, x0 + VINE_B[i][0], top + VINE_B[i][1], on ? M.glow : M.goldD, on ? 3 : 2); }
  }
  // 羽饰：鹿角根后面垂下的两根红羽（尖端随 beard 摆）
  function feathers(T, x0, top) {
    E.part(); const b = RD(P.beard * 0.6);
    for (let k = 0; k < 5; k++) { px(E, T, x0 - 1 - RD(k * 0.5) - (k >= 3 ? b : 0), top + 1 + k, M.feather, k === 0 ? 4 : 3); px(E, T, x0 - 2 - RD(k * 0.5) - (k >= 3 ? b : 0), top + 2 + k, M.featherD, 2); }
  }
  // 候选部件：hideCape —— 拖地兽皮大斗篷：从肩一路披到地面，后下角外翘拖地，墨褐横纹（每 4 行一道断续条纹）
  function hideCape(R) {
    E.part(); const m = M.hide, top = R.yS - 1, bot = 0, n = Math.max(1, bot - top), sw = P.sway || 0, bd = P.bend || 0; let Lb = 0;
    for (let y = top; y <= bot; y++) {
      const t = (y - top) / n, e = parts.edges(R, CL(y, R.yS, R.yHip)), L = RD(e[0] - 1 - 7.5 * Math.pow(t, 1.3) + sw * t * t - bd * t * t * 1.5), Rr = e[0] + 4;
      run(E, R, y, L, Rr, m, 0);
      if (((y - top) & 3) === 2) for (let x = L + 1 + (y & 1); x < Rr - 1; x++) if ((((x * 7 + y * 3) % 6) + 6) % 6 < 3) px(E, R, x, y, m, 1);   // 虎斑横纹
      if (y === bot) Lb = L;
    }
    px(E, R, Lb - 1, bot, m, 0); px(E, R, Lb - 2, bot, m, 0); px(E, R, Lb - 3, bot - 1, m, 3);          // 拖地的后下角往外翘
  }
  // 候选部件：grassSkirt —— 草裙 + 腰间一串骨片
  function grassSkirt(R, len) {
    E.part(); const m = M.grass, y0 = R.yHip - 1, sw = RD(P.sway || 0);
    for (let k = 0; k <= len; k++) {
      const y = y0 + k; if (y > 0) break; const e = parts.edges(R, Math.min(y, R.yHip)), L = e[0] - (k > 1 ? 1 : 0), Rr = e[1] + (k > 1 ? 1 : 0), end = k >= len - 1;
      for (let x = L; x <= Rr; x++) { const ph = (((x - sw) % 3) + 3) % 3; if (k === len && ph !== 0) continue; if (k === len - 1 && ph === 2) continue; px(E, R, x + (end ? sw : 0), y, m, k === 0 ? 3 : ph === 1 ? 2 : 0); }
    }
    const e = parts.edges(R, y0); for (let x = e[0] + 1; x <= e[1]; x += 2) px(E, R, x, y0, M.tooth, 4);   // 骨串
  }
  // 坐着的两条腿：从胯往前平伸，脚掌竖起
  function sitLegs(R) {
    E.part(); for (let x = R.hipBx; x <= R.hipBx + 8; x++) { px(E, R, x, -1, M.skinD, 0); px(E, R, x, 0, M.skinD, 0); } px(E, R, R.hipBx + 9, -2, M.skinD, 0); px(E, R, R.hipBx + 9, -1, M.skinD, 0);
    E.part(); for (let x = R.hipFx; x <= R.hipFx + 8; x++) { px(E, R, x, -2, M.skin, 0); px(E, R, x, -1, M.skin, 0); px(E, R, x, 0, M.skin, 0); } px(E, R, R.hipFx + 9, -3, M.skin, 0); px(E, R, R.hipFx + 9, -2, M.skin, 4);
  }
  const FREE = parts.FREE, MF = { r0: 0, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 };
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, P.sit ? BODY_SIT : P.wob ? BODY_W : BODY), lie = R.lie;
    hideCape(R);
    if (!lie) parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, grip: 'none' });
    if (P.sit) sitLegs(R); else parts.legs(E, R, P, { style: 'bare', mat: M.skin, matD: M.skinD });
    const tor = parts.torso(E, R, P, { style: 'bare', mat: M.skin });
    const LL = tor.rows[0], RR = tor.rows[1], y0 = tor.y0, rx = (y) => RR[CL(y - y0, 0, RR.length - 1)];
    for (let y = R.yWaist - 3; y <= R.yHip - 2; y++) px(E, R, rx(y) - 1 - (y & 1), y, M.paint, 3);    // 肚子上的白泥纹（锯齿）
    px(E, R, rx(R.yS + 3) - 2, R.yS + 3, M.paint, 4); px(E, R, rx(R.yS + 3) - 4, R.yS + 3, M.paint, 3); px(E, R, LL[4] + 2, y0 + 4, M.paint, 3);
    grassSkirt(R, 3);
    if (!lie) parts.hand(E, R, P, { side: 'B', hand: M.skin, grip: 'big' });
    parts.mantle(E, R, P, { style: 'fur', mat: M.fur, len: 3 });
    if (lie) {                                                           // 面具滚落在头边，权杖掉在身前
      MF.tx = MASK_LX + P.hatX; MF.ty = -7 - P.hatY; palmAntlers(MF, 0, 0); crownMask(MF, 0, 0, 1);
      boneScepter(FREE, DROP_X, -2, Math.PI / 2);
      parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, hand: M.skin, grip: 'big' });
      return;
    }
    feathers(R, R.hx0, R.htop); palmAntlers(R, R.hx0, R.htop); crownMask(R, R.hx0, R.htop, P.jaw);
    boneScepter(R, P.hx, P.hy, P.a);
    parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, hand: M.skin, grip: 'big' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let smT = 9, castT = 9, recT = 9, bubAcc = 0, soulAcc = 0, lastStep = 0, lastPers = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s === RECOVER) recT = 0;
    if (s !== CAST) return;
    castT = 0;                                                            // 猛砸地面：两道地裂一前一后分开
    fx.crack(SMX, HY + 1, FWX - SMX, 1, R_EL, 1.2, 0); fx.crack(SMX, HY + 2, SMX - BKX, -1, R_EL, 1.2, 0);
    ring(SMX, HY - 1, 1, R_EL); burst(SMX, HY - 2, 18, 30, 90, 0.25, 0.6, R_EL, 40); fx.cross(SMX, HY - 3, 6, R_EL, 0.25);
    for (let i = 0; i < 10; i++) spawn(K_DUST, SMX + (Math.random() - 0.5) * 10, HY - 1, (Math.random() - 0.5) * 40, -8 - Math.random() * 12, 0.5, FXI.dust);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SMASH) {                                 // 权杖砸在目标上
      smT = 0; const hx = wx(P.gx), hy = wy(P.gy);
      burst(hx + 2, hy + 2, 12, 30, 80, 0.15, 0.4, R_EL, 20); fx.cross(hx + 2, hy + 1, 4, R_EL, 0.15);
      for (let i = 0; i < 4; i++) spawn(K_DUST, hx + (Math.random() - 0.5) * 6, HY - 1, (Math.random() - 0.5) * 20, -6 - Math.random() * 8, 0.35, FXI.dust);
      hitDummy(0); sfx('swing', { kind: 'smash', w: 0.7 }); sfx('hit', { mat: 'wood', w: 0.7 });
    }
    if (s === CAST && t === T_HIT) {                                      // 裂缝尽头各拱起一个泥丘并破开，蹦出矛兵
      for (const [x, d] of [[FWX, 1], [BKX, -1]]) {
        fx.wave(x - d * 3, HY, d, 5, 5, R_EL, 0.35, 1); burst(x, HY - 3, 16, 30, 90, 0.25, 0.6, R_EL, 50);
        for (let i = 0; i < 5; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 6, HY - 4, (Math.random() - 0.5) * 50, -30 - Math.random() * 30, 0.7, R_EL, { g: 260, floor: HY, age0: 0.25 });
        for (let i = 0; i < 4; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 8, 0.45, FXI.dust);
      }
      hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.75 });
    }
    if (s === DEATH && t === T_SIT) { for (let i = 0; i < 6; i++) spawn(K_DUST, wx(-4 + Math.random() * 16), HY - 1, (Math.random() - 0.5) * 24, -5 - Math.random() * 8, 0.4, FXI.dust); shake(0.08, 1); }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, wx(-24 + Math.random() * 32), HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.8 });
    }
  }
  const EVENTS = [[], [], [T_SMASH], [], [T_HIT], [], [], [T_SIT, T_LAND], []];
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                              // 脚边泥浆冒泡，小泥点往上蹦
      bubAcc += dt * (8 + 16 * clamp01(stT / DUR[CHARGE]));
      while (bubAcc >= 1) { bubAcc -= 1; spawnX(K_PHYS, wx(-10 + Math.random() * 26), HY - 1, (Math.random() - 0.5) * 16, -30 - Math.random() * 30, 0.6, R_EL, { g: 220, floor: HY, age0: 0.15 }); }
      if (P.vine && Math.random() < dt * 8) spawn(K_EMBER, wx(P.gx) + (Math.random() - 0.5) * 3, wy(P.gy - 2), Math.random() * 6 - 3, -8 - Math.random() * 6, 0.4, R_EL);
    }
    if (state === MOVE && P.step !== lastStep) {                         // 重步：每步 2 颗尘
      if (P.step !== 0) { sfx('step', { w: 0.75 }); for (let i = 0; i < 2; i++) spawn(K_DUST, wx(P.step > 0 ? 6 : -5) + (Math.random() - 0.5) * 4, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 6, 0.35, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE) {
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 1 || f === 3) spawn(K_DUST, wx(9), wy(-7), 6 + Math.random() * 6, -4, 0.25, FXI.dust); lastPers = f; }   // 拍肚子拍出一点泥灰
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, wx(-26 + Math.random() * 34), HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    smT += dt; castT += dt; recT += dt;
  }
  function fxReset() { smT = 9; castT = 9; recT = 9; bubAcc = 0; soulAcc = 0; lastStep = 0; lastPers = -1; }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); }
  function fxMid(f12) {
    const st = E.state; if (st !== CAST && st !== RECOVER) return;
    const t = st === CAST ? castT : DUR[CAST] + recT, q = t - T_HIT; if (q < 0) return;
    const fade = st === RECOVER ? clamp01((recT - 0.4) / 0.3) : 0; if (fade >= 1) return;
    for (const [x, d] of [[FWX, 1], [BKX, -1]]) {                       // 从泥丘里拱出来 → 蹦一下 → 落地站定
      const Y = q < 0.08 ? HY + RD(22 * (1 - q / 0.08)) : q < 0.34 ? HY - RD(6 * Math.sin(Math.PI * (q - 0.08) / 0.26)) : HY;
      ghost(x, Y, EL, q < 1 / 12 ? 1 : 2, fade, HY);
      if (q >= 0.08 && q < 0.34) for (let k = -3; k <= 3; k++) put(x + k, HY, EL[3]);
      void d;
    }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy - 1, c); put(gx - r, gy - 1, c); put(gx, gy - 1 - r, c); } }
    if (smT < 2 / 12) {                                                   // 砸下的拖影弧
      const c = smT < 1 / 12 ? EL[0] : EL[1], cx = HX + 3 + K_SMASH.hx, cy = HY + K_SMASH.hy + 1, r = SUP + 2;
      for (let k = 1; k < 12; k++) { if ((k & 1) && smT >= 1 / 12) continue; const a = K_WIND.a + (K_SMASH.a - K_WIND.a) * k / 12; put(RD(cx + Math.sin(a) * r), RD(cy - Math.cos(a) * r), c); put(RD(cx + Math.sin(a) * (r - 1)), RD(cy - Math.cos(a) * (r - 1)), EL[2]); }
    }
    if (E.state === DEATH && P.lying && P.lift === 0) {                  // 肚子里冒出两个泥泡：鼓大 → 破掉
      const d = E.stT - INCOMING;
      for (const [x0, t0] of [[-10, 0.8], [-5, 1.05]]) {
        const q = (d - t0) / 0.35; if (q < 0 || q > 1.15 || P.dq > 0.6) continue;
        const bx = wx(x0), by = HY - 11 - RD(q * 3), r = q > 1 ? 0 : 1 + RD(q * 2);
        if (q > 1) { put(bx - 2, by, EL[1]); put(bx + 2, by, EL[1]); put(bx, by - 2, EL[1]); put(bx - 1, by + 1, EL[2]); put(bx + 1, by + 1, EL[2]); continue; }
        for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const dd = i * i + j * j; if (dd > r * r + 0.5) continue; put(bx + i, by + j, dd > (r - 1) * (r - 1) + 0.5 ? EL[3] : EL[2]); }
        put(bx - Math.max(0, r - 1), by - Math.max(0, r - 1), EL[0]);
      }
    }
  }

  return {
    name: '野人王', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.glow, M.glowHot], HIT_POINT: [4, -13], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'earth', style: 'summon', w: 0.75 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
