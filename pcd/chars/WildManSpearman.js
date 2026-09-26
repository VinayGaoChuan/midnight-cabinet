// 野人矛兵（衍生单位 · 自然 · 战士 · 普通 · 近战 240）：野人祭司死亡时 / 野人王「史莱姆繁殖」召唤出来的小喽啰。
// 大头矮子（leg 5 · torso 6 · head 8、sw 4、粗臂），半蹲前倾；脸上罩一只野猪小颅骨面具（两根短獠牙外翘——呼应野人一族的骨面具，但没有鹿角），
// 双手端一支比人还长的石尖木矛（燧石矛头、矛尾挂一撮草穗），背上斜插两支备用短矛；苔泥绿褐皮肤、草裙（呼应祭司）。
// 攻击 = 双手端矛向前连戳两下；技能 = 招牌「猛投」：后仰举矛过肩、燧石一闪、脚下扬尘 → 全力一掷（浅抛物线）→ 矛斜插在目标上，
//   泥土外爆 + 地裂 + 冲击环 + 击退 → 伸手从背后抽一支短矛握好。
// 死亡 = 描述「死亡后会生成一个迷你史莱姆」：向前摔倒、身体塌软，背上鼓起泥泡，弹出一只拳头大的苔绿小史莱姆，蹦两下后和尸体一起消散。
PCD.define('WildManSpearman', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_SPIRAL_PT,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px;

  // ───── 元素：泥矛 · 泥土褐（earth 色阶 淡土黄 → 土褐 → 深褐 → 墨褐）；史莱姆溅液用 poison ─────
  const R_EL = FXI.earth, EL = FXR[R_EL], R_SLIME = FXI.poison;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: ['#141a0c', '#2e3a1a', '#52602e', '#7c8c46'],        // 苔泥绿褐皮肤（同祭司，moss 偏褐）
    grass: 'sand',                                               // 草裙、矛尾草穗（干草黄）
    bone: 'bone',                                                // 小兽颅骨面具、獠牙
    hair: 'wood',                                                // 乱发（墨褐）
    wood: 'wood', flint: 'stone', vine: 'leather',               // 矛杆、燧石矛头、藤绳（背带 / 绑矛头 / 面具皮绳）
    slime: 'poison',                                             // 迷你史莱姆（苔绿）
    eye: { r: [0, 0, 62, 5], flat: 1 },                          // 眼窝里的一点眼光
    ink: { r: 'ink', flat: 1 },
    spark: { r: [20, 5, 21, 21], flat: 1 },                      // 燧石矛尖的闪光（发光体）
  });
  const BODY = { body: 'child', leg: 5, torso: 6, head: 8, headW: 8, sw: 4, arm: 6, lw: 2, limb: 1.3, stride: 3, lift: 2, fall: 'front' };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(70, 38, 32, 34);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 14], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['grass', 'bone', 'hair', 'wood', 'flint', 'vine', 'slime', 'eye', 'ink', 'spark']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 矛：同一支矛两种握法（总长一样：端矛握在后段，投掷握在中段）；短矛是背上抽出来的备用矛 ─────
  const SP_BASE = { style: 'leaf', wood: M.wood, metal: M.flint, trim: M.vine };
  const SP_HOLD = Object.assign({}, SP_BASE, { len: 3, back: 14 });
  const SP_JAV = Object.assign({}, SP_BASE, { len: 9, back: 8 });
  const SP_THR = Object.assign({}, SP_BASE, { len: 8, back: 9 });              // 戳刺帧：矛从手里往前送出一截（握点滑到矛杆后段）
  const SP_SHORT = Object.assign({}, SP_BASE, { style: 'spike', len: 3, back: 6 });

  // ───── 姿势 ─────
  // gp 握法 0 双手端矛 / 1 单手举过肩（投掷）· hold 手里 0 长矛 / 1 空手 / 2 短矛 · backN 背上备用矛 1–2 · tusk 獠牙抖 · look 回头 · scr 挠后脑 0–2
  // bub 背上泥泡 0–3 · sl 小史莱姆出现 · slx / sly 史莱姆横移 / 离地 · sq 史莱姆落地压扁
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, dq: 0,
    gp: 0, hold: 0, backN: 2, tusk: 0, look: 0, scr: 0, bub: 0, sl: 0, slx: 0, sly: 0, sq: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const H2 = Math.PI / 2, UP21 = H2 - 0.4636, DN21 = H2 + 0.4636;
  const K = (hx, hy, a, lean, head, crouch, bhx, bhy) => ({ hx, hy, a, lean: lean || 0, head: head || 0, crouch: crouch || 0, bhx: bhx || 0, bhy: bhy || 0 });
  const K_IDLE = K(4, -7, UP21, 1, 0, 1);                        // 半蹲前倾，矛尖斜指前上
  const K_WIND = K(1, -7, H2, 0, 0, 2);                          // 攻击预兆：矛往回收、压低
  const K_STAB = K(8, -8, H2, 2, 1, 1);                          // 戳：矛水平前送
  const K_RET = K(4, -7, H2, 1, 0, 1);                           // 两戳之间回收
  const K_CHG = K(-6, -15, UP21, -1, -1, 2, 6, -10);             // 蓄力：后仰，矛举过肩（握在中段），后手指向目标
  const K_REL = K(5, -14, UP21, 2, 1, 0, -3, -8);                // 出手帧：全力前掷
  const K_FOL = K(7, -8, DN21, 2, 1, 1, -3, -7);                 // 掷出后：手甩到前下（空手）
  const K_REACH = K(-5, -15, H2, 0, -1, 1, 2, -6);               // 收招：伸手到背后抽短矛
  const K_HURT = K(2, -8, UP21 - 0.46, -1, -1, 0);
  const K_KNEEL = K(6, -4, DN21, 2, 1, 4);
  const FIELDS = ['hx', 'hy', 'a', 'lean', 'head', 'crouch', 'bhx', 'bhy'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1],
    ['gp', 0, 2], ['hold', 0, 2], ['backN', 0, 2], ['tusk', -1, 1], ['look', 0, 1], ['scr', 0, 2]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -8, 23], ['hatY', 0, 7], ['dq', 0, 48, 48], ['bx', -16, 15], ['bub', 0, 3], ['sl', 0, 1], ['slx', 0, 15], ['sly', 0, 15], ['sq', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1];
  const T_STAB1 = 2 / 12, T_STAB2 = 4 / 12, T_THROW = 1 / 12, T_GRAB = 3 / 12, T_LAND = INCOMING + 0.66, T_POP = INCOMING + 1.05;
  // 待机个性（1.5–2.0 s，6 帧）：左右转头张望（回头两帧）→ 腾出后手挠面具后脑勺三下
  const PERS_LOOK = [1, 1, 0, 0, 0, 0], PERS_HEAD = [-1, -1, 1, 0, 0, 0], PERS_SCR = [0, 0, 0, 1, 2, 1];

  function spearOf() { return P.gp === 1 ? SP_JAV : P.gp === 2 ? SP_THR : P.hold === 2 ? SP_SHORT : SP_HOLD; }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.gp = 0; P.hold = 0; P.backN = 2; P.tusk = 0; P.look = 0; P.scr = 0; P.bub = 0; P.sl = 0; P.slx = 0; P.sly = 0; P.sq = 0;
    let two = 1;                                                           // 后手握在矛杆上
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.5 - 1e-6 && lp < 2.0) {
        const i = Math.min(5, f12of(lp - 1.5)); P.look = PERS_LOOK[i]; P.head = PERS_HEAD[i]; P.scr = PERS_SCR[i];
        if (P.scr) { two = 0; P.a = UP21 + 0.46; P.hy = -6; }               // 腾出后手，矛单手端着、矛尖垂一档
        if (i === 1) P.beard = 1;
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                // 小跑：弓着身小碎步，矛尖指前
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.lean = 2; P.crouch = 1; P.a = H2; P.hy = -7 + (f & 1 ? -1 : 0);
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                            // 双手端矛向前连戳两下
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.bx = -1; P.beard = 1; }
      else if (tq < 0.25) { setK(K_STAB, K_STAB, 0); P.bx = 4; P.gp = 2; P.sway = -1; P.beard = -1; P.tusk = 1; }
      else if (tq < T_STAB2) { setK(K_RET, K_RET, 0); P.bx = 2; P.beard = 0; }
      else if (tq < 0.45) { setK(K_STAB, K_STAB, 0); P.bx = 4; P.gp = 2; P.sway = -1; P.beard = -1; P.tusk = -1; }
      else { const q = clamp01((tq - 0.45) / 0.3); setK(K_STAB, K_IDLE, ease.inOut(q)); P.bx = RD(4 * (1 - ease.inOut(q))); }
    } else if (st === CHARGE) {                                            // 后仰举矛过肩，獠牙抖，燧石一闪
      const q = ease.inOut(clamp01(tq / 0.7)); P.gp = 1; two = 0; setK(K_IDLE, K_CHG, q);
      P.beard = -RD(q * 2); P.sway = q > 0.4 ? ((f12 & 1) ? -1 : 0) : 0; P.rim = 2;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); if (tq >= 0.8 && tq < 0.95) { P.gem = 3; P.glint = 1; }
      if (tq > 0.7) P.tusk = (f12 & 1) ? 1 : -1;
    } else if (st === CAST) {                                              // 全力一掷：出手帧定格 → 手甩到前下（空手）
      two = 0;
      if (tq < T_THROW) { setK(K_REL, K_REL, 0); P.gp = 1; P.gem = 3; P.rim = 3; P.beard = -2; P.sway = -1; P.bx = 2; }
      else { setK(K_FOL, K_FOL, 0); P.hold = 1; P.rim = 1; P.beard = -1; P.sway = -1; P.bx = 3; P.tusk = (f12 & 1) ? 1 : 0; }
    } else if (st === RECOVER) {                                           // 伸手从背后抽一支短矛握好
      two = 0;
      if (tq < T_GRAB) { setK(K_FOL, K_REACH, ease.out(tq / T_GRAB)); P.hold = 1; P.bx = RD(3 * (1 - tq / T_GRAB)); }
      else { const q = ease.inOut(clamp01((tq - T_GRAB) / 0.4)); setK(K_REACH, K_IDLE, q); P.hold = 2; P.backN = 1; two = q > 0.6 ? 1 : 0; P.beard = q < 0.5 ? 1 : 0; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { two = 1; setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.tusk = -1; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.sway = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                             // 前扑倒地 → 塌软 → 背上鼓泥泡 → 弹出小史莱姆蹦两下 → 一起消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.tusk = (f12 & 1) ? 1 : -1; }
      else if (d < 0.5) { two = 0; setK(K_KNEEL, K_KNEEL, 0); P.bx = 0; P.eyes = 1; P.beard = -1; P.hold = 1; P.hatX = RD((d - 0.3) / 0.2 * 4); P.hatY = RD(Math.sin((d - 0.3) / 0.2 * Math.PI) * 3) + 4; }
      else {
        two = 0; P.lying = 1; P.bx = 1; P.eyes = 1; P.hold = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.lean = 0; P.head = 0; P.crouch = 0;
        P.hx = 5, P.hy = -6; P.bhx = -1; P.bhy = -5; P.a = H2;
        P.hatX = d < 0.66 ? 4 + RD((d - 0.5) / 0.16 * 3) : 7; P.hatY = d < 0.66 ? RD((0.66 - d) / 0.16 * 3) : 0;
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : 4;
        if (d >= 0.8 && d < T_POP - INCOMING) P.bub = d < 0.88 ? 1 : d < 0.96 ? 2 : 3;
        if (d >= T_POP - INCOMING) {
          const e = d - (T_POP - INCOMING); P.sl = 1;
          if (e < 0.25) { const u = e / 0.25; P.slx = RD(6 * u); P.sly = Math.max(0, RD(7 * (1 - u) + 8 * Math.sin(u * Math.PI) * 0.6)); }
          else if (e < 0.33) { P.slx = 6; P.sly = 0; P.sq = 1; }
          else if (e < 0.55) { const u = (e - 0.33) / 0.22; P.slx = 6 + RD(7 * u); P.sly = RD(3 * Math.sin(u * Math.PI)); }
          else { P.slx = 13; P.sly = 0; P.sq = e < 0.63 ? 1 : 0; }
        }
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0; P.look = 0; P.scr = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (two && !P.lying && P.hold !== 1 && P.gp !== 1) { const c = parts.along(P, spearOf(), P.hold === 2 ? -3 : -5); P.bhx = c[0]; P.bhy = c[1]; }
    if (P.scr) { const R = parts.rig(P, BODY); P.bhx = R.hx0 - 1 + (P.scr === 2 ? 1 : 0); P.bhy = R.ey + (P.scr === 2 ? -1 : 1); }
    if (P.lying) { P.gx = 16 + P.hatX + P.bx; P.gy = -1 - P.hatY; }
    else if (P.hold === 1) { P.gx = P.hx + P.bx; P.gy = P.hy; }
    else { const tp = parts.spear.focus(P, spearOf()); P.gx = tp[0] + P.bx; P.gy = tp[1]; }
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 候选部件：backSpears —— 背后斜插的备用短矛（n 支，1:2 和 45° 两个角度扇开、从后腰伸到肩后；木杆 + 藤绑 + 燧石尖）；用 rig 落笔，倒地跟着身体转
  const BACK = [[15, 8], [14, 7]];                                         // [吸附方向下标（DIRS：15 = 左上 1:2，14 = 左上 45°）, 杆长]
  function backSpears(R, n) {
    const e = parts.edges(R, R.yHip - 1);
    for (let i = 2 - n; i < 2; i++) {
      const di = BACK[i][0], L = BACK[i][1], x0 = e[0] + 1 - i, y0 = R.yHip - 1;
      E.part();
      parts.bar(di, x0, y0, 0, L, 1, (k, j, X, Y) => PX(E, R, X, Y, M.wood, k === L ? 2 : 3));
      const c = parts.cell(di, x0, y0, L); PX(E, R, c[0], c[1], M.vine, 3);
      parts.bar(di, x0, y0, L + 1, L + 1, 2, (k, j, X, Y) => PX(E, R, X, Y, M.flint, j === 0 ? 4 : 2));
      const tip = parts.cell(di, x0, y0, L + 2); PX(E, R, tip[0], tip[1], M.flint, 4);
    }
  }
  // 候选部件：grassSkirt —— 草裙：腰下一圈干草束（每 2 列一道竖纹），下摆长短交替（每 3 列：长束 2 格 · 短束 1 格 · 空），随 sway 摆
  function grassSkirt(R, m) {
    E.part(); const y0 = R.yHip - 1, sw = RD(P.sway || 0);
    for (let k = 0; k <= 1; k++) { const y = y0 + k, e = parts.edges(R, Math.min(y, R.yHip)), s = k ? sw : 0; for (let x = e[0] - k + s; x <= e[1] + k + s; x++) PX(E, R, x, y, m, k && ((x - s) & 1) ? 2 : 0); }
    const e = parts.edges(R, R.yHip), yb = y0 + 2;
    for (let x = e[0] - 1 + sw; x <= e[1] + 1 + sw; x++) { const q = (((x - sw) % 3) + 3) % 3; if (q === 2) continue; PX(E, R, x, yb, m, q === 0 ? 3 : 0); if (q === 0) PX(E, R, x + (sw > 0 ? 1 : 0), yb + 1, m, 4); }
  }
  // 候选部件：boarSkullMask —— 兽颅骨面具头：后脑皮肤 + 乱发（同一部件）→ 远侧獠牙 → 颅骨面具（圆颅、颅顶裂纹、眉骨高光、深眼窝 + 1 格眼光、
  //   前突吻部 + 鼻孔、齿缝、皮绳）→ 近侧獠牙（外翘，读 P.tusk 抖动）。P.look = 1 时整张面具朝后（回头张望）
  const MASK = [[-1, 2], [-2, 3], [-2, 4], [-2, 5], [-2, 6], [-1, 6], [-1, 5], [0, 4]];
  function skullHead(R) {
    const d = P.look ? -1 : 1, c = R.hx, top = R.htop, ey = top + 3, b = RD(P.beard || 0), X = (u) => c + d * u;
    E.part();
    for (let r = 0; r < 8; r++) { const a0 = r === 0 || r === 7 ? -2 : -3, a1 = r === 0 || r === 7 ? 0 : 1; for (let u = a0; u <= a1; u++) PX(E, R, X(u), top + r, M.skin, 0); }
    PX(E, R, X(-2), top + 1, M.hair, 4); PX(E, R, X(-2), top - 1, M.hair, 4); PX(E, R, X(-3), top, M.hair, 0); PX(E, R, X(-1), top - 1, M.hair, 3); PX(E, R, X(0), top - 2 + (b < 0 ? 1 : 0), M.hair, 4);
    for (let r = 0; r <= 5; r++) PX(E, R, X(-4) - (r >= 4 ? d * (b > 0 ? 1 : 0) : 0), top + 1 + r, M.hair, r === 5 ? 4 : 0);   // 脑后垂下的乱发，发梢随 beard 摆
    PX(E, R, X(-3), top + 1, M.hair, 0); PX(E, R, X(-5), top + 2, M.hair, 3);
    E.part(); PX(E, R, X(6), top + 3, M.bone, 2); PX(E, R, X(6), top + 2, M.bone, 3);                                        // 远侧獠牙（从吻部上沿后面露出尖）
    E.part();
    for (let r = 0; r < 8; r++) for (let u = MASK[r][0]; u <= MASK[r][1]; u++) PX(E, R, X(u), top + r, M.bone, 0);
    PX(E, R, X(0), top + 1, M.bone, 2); PX(E, R, X(1), top + 2, M.bone, 2);                                                  // 颅顶裂纹
    PX(E, R, X(2), top + 2, M.bone, 4); PX(E, R, X(3), top + 2, M.bone, 4);                                                  // 眉骨高光
    PX(E, R, X(2), ey, M.bone, 1); PX(E, R, X(3), ey, M.bone, 1); PX(E, R, X(2), ey + 1, M.bone, 2);                          // 深眼窝
    if (!P.eyes) PX(E, R, X(3), ey, M.eye, 3);
    PX(E, R, X(6), top + 5, M.bone, 1); PX(E, R, X(5), top + 4, M.bone, 4);                                                  // 鼻孔、吻背高光
    PX(E, R, X(2), top + 6, M.bone, 1); PX(E, R, X(4), top + 6, M.bone, 1); PX(E, R, X(3), top + 6, M.bone, 4);              // 齿缝
    PX(E, R, X(-2), ey, M.vine, 3); PX(E, R, X(-2), ey + 1, M.vine, 2);                                                      // 面具皮绳
    E.part();                                                                                                                // 近侧獠牙：下颌角外翘
    const tk = P.tusk | 0;
    PX(E, R, X(5), top + 7, M.bone, 3); PX(E, R, X(6), top + 7, M.bone, 3); PX(E, R, X(7), top + 6, M.bone, 4); PX(E, R, X(7 + (tk > 0 ? 1 : 0)), top + 5 - (tk < 0 ? 1 : 0), M.bone, 4);
  }
  function drawSpear(o, T) {
    const r = parts.spear(E, T, P, o), F = o.free ? parts.FREE : T, g = P.gem;
    if (g >= 2) { PX(E, F, r.tip[0], r.tip[1], M.spark, g === 3 ? 4 : 3); if (g === 3) { const c = parts.along(P, o, (o.len || 0) + 5); PX(E, F, c[0], c[1], M.spark, 3); } }
    else if (g === 4) PX(E, F, r.tip[0], r.tip[1], M.flint, 1);
    if (o !== SP_SHORT) { const bt = parts.along(P, o, -o.back), b = RD((P.beard || 0) * 0.5); PX(E, F, bt[0], bt[1] + 1, M.grass, 3); PX(E, F, bt[0] - 1 + b, bt[1] + 2, M.grass, 4); PX(E, F, bt[0] + b, bt[1] + 2, M.grass, 2); PX(E, F, bt[0] - 1, bt[1] + 1, M.grass, 0); }   // 矛尾草穗
  }
  // 候选部件：mudBubble —— 背上鼓起的泥泡（背面半圆，r 1–3，亮点高光；r 3 时透出里面的苔绿史莱姆）
  function mudBubble(R, r) {
    E.part(); const e = parts.edges(R, R.yS + 3), cx = e[0], cy = R.yS + 3;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= 0; i++) if (i * i + j * j <= r * r + 0.4) PX(E, R, cx + i, cy + j, i === -r + (Math.abs(j) > 1 ? 1 : 0) && r === 3 ? M.slime : M.skin, 0);
    PX(E, R, cx - r + 1, cy - 1, M.skin, 4);
  }
  // 候选部件：slimeBlob —— 拳头大的苔绿小史莱姆（5 格宽、3–4 格高，两点墨眼 + 高光；sq 1 = 落地压扁成 7×3）；(x, y) = 底边中点（精灵本地坐标）
  function slimeBlob(x, y, sq) {
    E.part(); const F = parts.FREE, w = sq ? 3 : 2, h = sq ? 2 : 3;
    for (let r = 0; r < h; r++) { const hw = r === h - 1 ? w - 1 : w; parts.run(E, F, y - r, x - hw, x + hw, M.slime, 0); }
    PX(E, F, x, y - h, M.slime, 0);
    PX(E, F, x + 1, y - h + 1, M.ink, 1); PX(E, F, x + w - 1, y - h + 1, M.ink, 1); PX(E, F, x - w + 1, y - h + 1, M.slime, 4); PX(E, F, x - 1, y - h, M.slime, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    const R = parts.rig(P, BODY), holding = P.hold !== 1, sp = spearOf();
    const two = holding && P.gp !== 1 && !P.scr && !R.lie;
    if (R.lie || (P.hold === 1 && P.crouch >= 4)) drawSpear(Object.assign({}, SP_HOLD, { free: 1, at: [6 + P.hatX, -1 - P.hatY], a: H2 }), parts.FREE);
    backSpears(R, P.backN);
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, hand: M.skinD, grip: two || P.scr ? 'none' : 'fist' });
    parts.legs(E, R, P, { style: 'bare', mat: M.skin, matD: M.skinD, w: 2 });
    parts.torso(E, R, P, { style: 'bare', mat: M.skin, belt: M.vine, strap: M.vine });
    grassSkirt(R, M.grass);
    if (P.bub) mudBubble(R, P.bub);
    const jav = !R.lie && holding && P.gp === 1 && P.hx < 0;                // 举过肩：矛和前臂压在大头后面
    if (jav) { drawSpear(sp, R); parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, hand: M.skin }); }
    skullHead(R);
    if (!R.lie && holding && !jav) { drawSpear(sp, R); if (two) parts.hand(E, R, P, { side: 'B', hand: M.skinD }); }
    if (P.scr) parts.hand(E, R, P, { side: 'B', hand: M.skinD });
    if (!jav) parts.arm(E, R, P, { sleeve: 'bare', mat: M.skin, hand: M.skin });
    if (P.sl) { const o = parts.toSprite(R, parts.edges(R, R.yS + 3)[0] - 1, R.yS + 3); slimeBlob(o[0] - P.slx, -P.sly, P.sq); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const DCX = DUMMY_X, DCY = HY - 14;
  let stabT = 9, stabX = 0, stabY = 0, jT = 9, jX = 0, jY = 0, stuckT = 9, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastDust = -1;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const J_DUR = 0.2;
  function onEnter(s) {
    if (s === CAST) { shake(0.28, 2); flash(0.05); for (let i = 0; i < 12; i++) spawn(K_DUST, wx(-4 + Math.random() * 10), HY - 1, (Math.random() - 0.5) * 50, -6 - Math.random() * 12, 0.35 + Math.random() * 0.3, FXI.dust); }
  }
  function onTime(s, t) {
    if (s === ATTACK && (t === T_STAB1 || t === T_STAB2)) {                // 每一戳：矛尖前的速度线 2 帧 + 命中火花
      stabT = 0; stabX = wx(P.gx); stabY = wy(P.gy);
      burst(DCX - 4, stabY, 8, 30, 70, 0.12, 0.3, FXI.impact, 4); hitDummy(0);
      for (let i = 0; i < 2; i++) spawn(K_DUST, DCX - 5, stabY + 1, -10 - Math.random() * 16, 4 + Math.random() * 6, 0.3, R_EL);
      sfx('swing', { kind: 'thrust', w: 0.25 }); sfx('hit', { mat: 'flesh', w: 0.25 });
    }
    if (s === CAST && t === T_THROW) { jT = 0; jX = wx(P.hx + 2); jY = wy(P.hy - 3); sfx('shoot', { proj: 'spear' }); }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 6 + Math.random() * 24, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.35 + Math.random() * 0.3, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.25 });
    }
    if (s === DEATH && t === T_POP) {                                      // 泥泡破开：苔绿溅液 + 泥点
      const x = wx(-2 + P.bx), y = HY - 8;
      for (let i = 0; i < 12; i++) spawnX(K_PHYS, x, y, (Math.random() - 0.5) * 50, -30 - Math.random() * 30, 0.5 + Math.random() * 0.3, i & 1 ? R_SLIME : R_EL, { g: 160, floor: FLOOR - 1 });
    }
  }
  const EVENTS = [[], [], [T_STAB1, T_STAB2], [], [T_THROW], [], [], [T_LAND, T_POP], []];
  function jav(u) { return [jX + (DCX - 1 - jX) * u, jY + (DCY - 1 - jY) * u - 5 * Math.sin(u * Math.PI)]; }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (jT < J_DUR) {
      const n = jT + dt, p = jav(clamp01(n / J_DUR));
      if (((n * 60) | 0) % 2 === 0) spawn(K_DUST, p[0] - 5, p[1], -8, 2, 0.25, R_EL);
      if (n >= J_DUR) {                                                    // 命中：矛斜插在目标上，泥土外爆 16 + 地裂 + 冲击环 + 击退
        burst(DCX - 2, DCY, 16, 50, 120, 0.3, 0.6, R_EL, 14); ring(DCX - 2, DCY, 0, R_EL); fx.crack(DCX - 12, FLOOR, 22, 1, R_EL, 0.9);
        for (let i = 0; i < 8; i++) spawnX(K_PHYS, DCX - 2, DCY, -20 - Math.random() * 50, -30 - Math.random() * 40, 0.5 + Math.random() * 0.3, R_EL, { g: 180, floor: FLOOR - 1 });
        hitDummy(1); shake(0.12, 1); stuckT = 0; sfx('impact', { pal: 'earth', w: 0.4 });
      }
      jT = n;
    }
    stuckT += dt; stabT += dt;
    if (state === CHARGE) {                                                // 脚下扬起一圈尘；泥点从地面被吸到矛尖
      const ring0 = stT < 0.3 ? -1 : stT < 0.8 ? 0 : 1;
      if (ring0 !== lastDust) { lastDust = ring0; if (ring0 >= 0) for (let i = 0; i < 14; i++) { const a = i / 14 * 6.2832; spawn(K_DUST, wx(1) + Math.cos(a) * 3, HY - 1, Math.cos(a) * 34, -3 - Math.abs(Math.sin(a)) * 8, 0.4 + Math.random() * 0.2, FXI.dust); } }
      if (stT > 0.5) { chargeAcc += dt * 16; while (chargeAcc >= 1) { chargeAcc -= 1; const x = gx + (Math.random() - 0.5) * 26; spawnX(K_SPIRAL_PT, x, HY - 1, 0, 0, 9, R_EL, { a: Math.random() * 6.28, r: 10, w: 4, tx: gx, ty: gy, squash: 0.6 }); } }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.18 }); spawn(K_DUST, wx(P.step > 0 ? 3 : -3), HY, (Math.random() - 0.5) * 12, -3 - Math.random() * 5, 0.3, FXI.dust); } lastStep = P.step; }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 24; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 6 + Math.random() * 26, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
  }
  function fxReset() { stabT = 9; jT = 9; stuckT = 9; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastDust = -1; }
  function fxBack(f12) { if (P.rim >= 2 && !P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); }
  // 飞行的矛：1×7 矛形（燧石尖 + 木杆）+ 草穗尾，朝向跟着抛物线的切线（吸附 2:1 / 水平）
  function flyingSpear(x, y, dx, dy) {
    x = RD(x); y = RD(y);
    const s = dy < -0.25 ? -1 : dy > 0.25 ? 1 : 0;
    for (let k = 0; k < 7; k++) { const px = x - k, py = y - (s ? Math.floor(k / 2) * s : 0); put(px, py, k === 0 ? EL[0] : k === 1 ? 10 : k === 2 ? 9 : 19); }
    const ex = x - 7, ey = y - (s ? 3 * s : 0); put(ex, ey + 1, 62); put(ex - 1, ey, 5); put(ex - 1, ey + 1, 62);
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1 && P.hold !== 1) { const L = P.gem === 3 ? 4 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? EL[0] : r <= 3 ? EL[1] : EL[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); put(gx, gy + r, c); } }
    if (stabT < 2 / 12) {                                                 // 戳刺速度线：矛尖后 3 道横线，第 2 帧断续变暗
      const c0 = stabT < 1 / 12 ? EL[0] : EL[2], c1 = stabT < 1 / 12 ? EL[1] : EL[3];
      for (let k = 2; k <= 9; k++) { if (stabT >= 1 / 12 && (k & 1)) continue; put(stabX - k, stabY, k < 5 ? c0 : c1); }
      for (let k = 4; k <= 8; k++) { if (k & 1) continue; put(stabX - k, stabY - 2, c1); put(stabX - k - 1, stabY + 2, c1); }
      put(stabX + 1, stabY, EL[0]);
    }
    if (jT < J_DUR) { const u = jT / J_DUR, p = jav(u), q = jav(Math.min(1, u + 0.1)); flyingSpear(p[0], p[1], q[0] - p[0], q[1] - p[1]); }
    if (stuckT < 1.0) {                                                   // 插在目标上的矛：矛尖没进去，杆往左上斜伸，0.7 s 后抖动消散
      const x0 = DCX - 2, y0 = DCY + 1, fade = stuckT > 0.7 ? (stuckT - 0.7) / 0.3 : 0;
      for (let k = 0; k < 9; k++) { const px = x0 - k, py = y0 - Math.floor(k / 2); if (fade && E.B8[(py & 7) * 8 + (px & 7)] < fade) continue; put(px, py, k === 0 ? 9 : k === 8 ? 20 : 19); }
      if (!fade) { put(x0 - 9, y0 - 3, 62); put(x0 - 9, y0 - 4, 5); put(x0 - 10, y0 - 3, 62); }
    }
  }

  return {
    name: '野人矛兵', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.spark], HIT_POINT: [0, -10], EVENTS,
    REVIVE: { dy: -9, ramp: 'earth' },
    SFX: { body: 'flesh', how: 'topple', pal: 'earth', style: 'blade', w: 0.25 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
