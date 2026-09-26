// 地主（部队 · 虚空 · 商人 · 优质）：矮胖富态的虚空商人——瓜皮小帽顶一颗发紫光的虚空帽珠、左手横端一把大算盘（11×10，胸前伸出约 10 格）、
// 腰间垂到膝下的鼓钱袋、深紫绸缎马褂 + 金边、宽袖、长袍拖到脚面、圆脸双下巴 + 八字胡。
// 攻击 = 右手甩腕扔出一枚打转的铜钱；技能 = 特性「激进投资组合」生效：飞快拨算盘（珠子一颗颗亮金）、地上的金币螺旋汇入钱袋、钱袋一抖喷出金币喷泉，
// 金币落地弹两下又被吸回袋里，身后闪过两道金色速度线（「卖空」加速）。
// 升级成「金手」（GoldenHand.js）：同一个人——瓜皮帽与虚空帽珠、八字胡、算盘都保留，体量变大、右臂换成鎏金机关手。
PCD.define('Landlord', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_BURST, K_PHYS, K_SPIRAL_PT, K_EMBER,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, sfx } = E;
  const RD = Math.round;

  // ───── 元素：激进投资 · 铜钱金（FXI.coin）；帽珠用虚空紫（curse 色阶，只做轮廓光和帽珠火星）─────
  const R_EL = FXI.coin, EL = FXR[R_EL], VOID = FXR[FXI.curse];

  // ───── 材质（parts.mats：名字D = 暗一级，远侧腿 / 后臂用）─────
  const M = parts.mats(E, {
    silk: { r: 'purple', band: 2 }, gown: { r: [0, 25, 42, 24], band: 2 }, trim: 'gold', skin: 'skin', blush: 'pink', hair: [0, 27, 27, 28], ink: { r: 'ink', flat: 1 },
    cap: [0, 0, 27, 28], shoe: [0, 0, 27, 28], wood: 'wood', bead: 'crimson', bag: 'leather', cord: 'gold', coin: 'gold',
    lit: { r: [20, 14, 5, 21], flat: 1 },                                   // 蓄力时亮起的算盘珠（发光体）
    orb: { r: [25, 42, 24, 43], flat: 1 }, orbHot: { r: [42, 24, 43, 21], flat: 1 },   // 虚空帽珠：平时 / 蓄满到施放
  });
  const BODY = { body: 'fat', leg: 5, torso: 7, head: 7, headW: 7, sw: 5, belly: 3, arm: 7, fall: 'back' };
  const HX = 34, DUR = DEFAULT_DUR.slice(), BAG_X = 2;
  const hero = new Sprite(88, 44, 48, 40);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 9, 13], rimRamp: VOID, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'bead', 'lit', 'skin', 'ink', 'orb', 'orbHot', 'coin', 'cord', 'blush']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 拨算盘 / 甩铜钱，后手 = 托算盘（算盘左下角就是后手）─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, hatR: 0, dq: 0, abc: 0, lit: 0, bag: 0, smile: 0, coin: 0, torn: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, head, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, head: head || 0, crouch: crouch || 0 });
  // 算盘挂在后手上：左框 x = bhx + 1，上框 y = bhy − 5，下框 y = bhy + 4（后手握在左框外侧）
  const K_IDLE = K(11, -5, 6, -11);                                // 算盘端在胸前，前手托在算盘下沿，后手握左框外侧：内框整片露出来
  const K_WIND = K(1, -16, 5, -11, -1, 0);                         // 右手捏铜钱举到耳后
  const K_FLICK = K(11, -17, 6, -11, 1, 1);                        // 甩腕：手甩到算盘前上方
  const K_HOLD = K(10, -16, 6, -11, 1, 0);
  const K_TALLY = K(11, -10, 6, -11, 1, 1, 1);                      // 蓄力：俯身飞快拨算盘
  const K_SHAKE = K(5, -4, 5, -13, -1, -1);                         // 施放：右手一拍钱袋，身子后仰，算盘举高
  const K_PAT = K(5, -4, 6, -11, 0, 0);                            // 收招：拍拍钱袋
  const K_HURT = K(9, -4, 4, -10, -1, -1);
  const K_STAG = K(4, -5, 4, -12, -1, -1, 2);                      // 死亡：捂住钱袋往后仰，算盘举高
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -48, 15], ['bhx', -32, 31], ['bhy', -48, 15], ['lean', -1, 2], ['head', -1, 2], ['crouch', 0, 7], ['bob', 0, 1],
    ['abc', 0, 3], ['lit', 0, 5], ['bag', 0, 2], ['smile', 0, 1], ['coin', 0, 1]]);
  const KEY2 = parts.keyer([['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2], ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1],
    ['lying', 0, 1], ['lift', 0, 3], ['hatX', -8, 8], ['hatY', -2, 15], ['hatR', 0, 3], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8], ['torn', 0, 1]]);
  const BEARD_IDLE = [0, 1, 0, -1], SWAY_IDLE = [0, 1, 0, -1], T_FLICK = 2 / 12, T_LAND = INCOMING + 0.66;
  // 待机个性（1.6–2.0 s，5 帧）：右手噼里啪啦拨几下算盘（手位 + 珠位花样），眯眼一笑，钱袋跟着抖
  const TALLY = [[10, -9, 1], [14, -9, 2], [11, -9, 3], [15, -10, 1], [11, -5, 0]];
  const ABC = [0b0000, 0b1010, 0b0101, 0b1101];                    // 4 档下珠的花样（1 = 拨上去）

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.hatR = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0; P.abc = 0; P.lit = 0; P.bag = 0; P.smile = 0; P.coin = 0; P.torn = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = BEARD_IDLE[(b + 1) & 3]; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6), c = TALLY[f]; P.hx = c[0]; P.hy = c[1]; P.abc = c[2]; P.sway = (f & 1) ? 1 : -1; if (f >= 2) { P.eyes = 1; P.smile = 1; } P.glint = f === 3 ? 1 : 0; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 踱方步：肚子和钱袋左右晃，算盘端稳
      setK(K_IDLE, K_IDLE, 0); parts.gait(P, E.gait(tq));
      P.hx += P.step * 0.5; P.sway = -P.step * 2 || P.sway; P.beard = -P.step;
      const w = walkDemo(tq, 12, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.coin = 1; P.beard = 1; }
      else if (tq < 0.2) { setK(K_FLICK, K_FLICK, 0); P.beard = -2; P.sway = -1; P.glint = 1; }
      else if (tq < 0.45) { setK(K_FLICK, K_HOLD, ease.out((tq - 0.2) / 0.25)); P.beard = -1; }
      else setK(K_HOLD, K_IDLE, ease.inOut(clamp01((tq - 0.45) / 0.3)));
    } else if (st === CHARGE) {                                        // 飞快拨算盘：手每帧换档、珠位每帧换花样、珠子一颗颗亮金，钱袋越来越鼓
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_TALLY, q);
      if (tq >= 0.25) { P.hx += (f12 & 1) ? -3 : 1; P.abc = 1 + (f12 % 3); }
      P.lit = Math.min(5, Math.floor(clamp01((tq - 0.2) / 1.0) * 5 + 1e-6) + (tq >= 1.2 ? 1 : 0));
      P.bag = tq < 0.6 ? 0 : tq < 1.05 ? 1 : 2; P.sway = tq > 1.05 ? ((f12 & 1) ? 1 : -1) : 0; P.beard = -1;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2;
    } else if (st === CAST) {                                          // 钱袋一抖：右手拍袋、身子后仰，帽珠最亮
      setK(K_TALLY, K_SHAKE, ease.out(clamp01(tq / 0.12))); P.lit = 5; P.abc = 3; P.bag = 2; P.sway = (f12 & 1) ? 2 : -2; P.beard = 2; P.gem = 3; P.rim = 3; P.eyes = tq < 0.25 ? 1 : 0; P.smile = 1;
    } else if (st === RECOVER) {                                       // 金币吸回袋里：拍两下钱袋，帽珠闪一下
      if (tq < 0.2) setK(K_SHAKE, K_PAT, ease.out(tq / 0.2));
      else if (tq < 0.5) { setK(K_PAT, K_PAT, 0); if (f12 & 1) P.hy -= 2; }
      else setK(K_PAT, K_IDLE, ease.inOut(clamp01((tq - 0.5) / 0.2)));
      P.bag = tq < 0.45 ? 2 : tq < 0.6 ? 1 : 0; P.lit = tq < 0.2 ? 4 : tq < 0.35 ? 2 : 0; P.smile = tq < 0.55 ? 1 : 0;
      P.gem = tq < 0.2 ? 2 : (tq >= 0.5 && tq < 0.6) ? 3 : 1; P.glint = tq >= 0.5 && tq < 0.6 ? 1 : 0; P.rim = tq < 0.3 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.sway = -1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 后仰倒地：捂着钱袋后仰 → 摔倒 → 钱袋破开铜钱撒一地 → 瓜皮帽滚落、帽珠熄灭
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < 0.5) { setK(K_STAG, K_STAG, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; }
      else {
        setK(K_STAG, K_STAG, 0); P.crouch = 0; P.lean = 0; P.head = 0; P.lying = 1; P.bx = -2; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0;
        P.hx = 3; P.hy = -6; P.bhx = -1; P.bhy = -12;                   // 前手还捂着钱袋，后手甩到头边
        P.torn = d >= 0.66 ? 1 : 0;
        // 瓜皮帽：从头顶弹开（最高 4 格，0.25 s 落地，边飞边翻），落地后只再翻滚 1 次，停在头顶后方（死亡 bbox 左沿 −26）
        if (d >= 0.6 && d < 0.85) { const hq = (d - 0.6) / 0.25; P.hatX = RD(-1 * hq); P.hatY = RD(Math.sin(hq * Math.PI) * 4); P.hatR = P.hatY > 1 ? (Math.floor(hq * 4) & 3) : 0; }
        else if (d >= 0.85 && d < 0.95) { P.hatX = -1; P.hatR = 3; }
        else if (d >= 0.95) P.hatX = -2;
        P.gem = d < 0.9 ? ((f12 & 1) ? 1 : 4) : d < 1.3 ? ((f12 % 3) === 0 ? 1 : 4) : 4;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
      P.gem = tq > 0.85 ? 2 : 0;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch);
    if (P.lying) { P.gx = CAP_X + P.hatX; P.gy = -5 - P.hatY; }
    else { const R = parts.rig(P, BODY); P.gx = R.hx + P.bx; P.gy = R.htop - 4; }   // 发光体 = 帽珠
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  const ORB = [[4, 3, 2, 3], [4, 4, 3, 4], [4, 3, 2, 3], [4, 4, 3, 4], [2, 1, 1, 2]];      // 帽珠各档：左 / 中 / 右 / 顶 用第几级
  const CAP_X = -17, CAP_TY = [2, 4, 3, 4], CAPF = { r0: 0, tx: 0, ty: 0, rot: 0, ox: 0, oy: 0 };
  // 候选部件：skullcap —— 瓜皮小帽：卷边帽檐压在头顶那一行，六瓣缝线，帽顶一颗 3 格宽的发光帽珠（单独一个部件）。T = rig（戴着）或自由落笔框（掉在地上）
  function skullcap(T, cx, v0) {
    E.part();
    parts.run(E, T, v0, cx - 4, cx + 4, M.cap, 2); parts.px(E, T, cx + 4, v0, M.cap, 3);          // 卷边帽檐（暗一级，前沿亮）
    parts.run(E, T, v0 - 1, cx - 3, cx + 3, M.cap, 0); parts.run(E, T, v0 - 2, cx - 2, cx + 2, M.cap, 0); parts.run(E, T, v0 - 3, cx - 1, cx + 1, M.cap, 0);
    parts.px(E, T, cx - 1, v0 - 1, M.cap, 2); parts.px(E, T, cx + 1, v0 - 2, M.cap, 2); parts.px(E, T, cx - 2, v0 - 2, M.cap, 4);   // 缝线 + 高光
    parts.px(E, T, cx + 2, v0 - 1, M.trim, 3);                                                     // 帽檐上的一粒小金扣
    E.part(); const g = P.gem, m = g === 2 || g === 3 ? M.orbHot : M.orb, O = ORB[g];               // 帽珠：0 待机 · 1 蓄力 · 2 蓄满 · 3 施放 · 4 熄灭
    parts.px(E, T, cx - 1, v0 - 4, m, O[0]); parts.px(E, T, cx, v0 - 4, m, O[1]); parts.px(E, T, cx + 1, v0 - 4, m, O[2]); parts.px(E, T, cx, v0 - 5, m, P.glint && g !== 4 ? 4 : O[3]);
  }
  // 候选部件：abacus —— 算盘 11×10：木框（wood）+ 深木底 + 4 根浅木档杆（每隔 1 列一根）+ 金横梁；每档 1 颗上珠 + 2 颗下珠（1×2 格：上亮下深红）。
  // x0 左框列、top 上框行；pat 下珠花样（1 = 拨上去，空档杆露在下面；0 = 空档杆露在横梁下），lit 亮起的档数（金色发光体）
  function abacus(R, x0, top, pat, lit) {
    E.part(); const w = 11, yb = top + 9, x1 = x0 + w - 1;
    parts.run(E, R, top, x0, x1, M.wood, 0); parts.run(E, R, yb, x0, x1, M.wood, 0);
    for (let y = top + 1; y < yb; y++) { parts.px(E, R, x0, y, M.wood, 0); parts.px(E, R, x1, y, M.wood, 0); for (let x = x0 + 1; x < x1; x++) parts.px(E, R, x, y, M.wood, 2); }   // 框 + 深木底
    parts.run(E, R, top + 3, x0 + 1, x1 - 1, M.trim, 0); parts.px(E, R, x0 + 1, top + 3, M.trim, 4);  // 金横梁
    const bead = (x, y, on, hot) => { const m = on ? M.lit : M.bead; parts.px(E, R, x, y, m, on ? 4 : 4); parts.px(E, R, x, y + 1, m, on ? (hot ? 4 : 3) : 2); };   // 1×2 珠：上格亮、下格深红
    for (let k = 0; k < 4; k++) {
      const x = x0 + 2 + 2 * k, up = (pat >> k) & 1, on = k < lit, hot = on && k === Math.min(lit, 4) - 1;
      bead(x, top + 1, on, hot);                                                                    // 上珠（贴着上框）
      const r = up ? top + 8 : top + 4; parts.px(E, R, x, r, M.wood, 4);                            // 露出来的一截浅木档杆
      const y0 = up ? top + 4 : top + 5; bead(x, y0, on, hot); bead(x, y0 + 2, on, false);             // 两颗下珠
    }
    parts.px(E, R, x0 + 1, top, M.wood, 4); parts.px(E, R, x1, top, M.wood, 3);
  }
  // 掉在地上的算盘：侧着躺平的一条（框 + 一排珠子冒头）
  function abacusFlat(x0) {
    const F = parts.FREE; E.part();
    parts.run(E, F, 0, x0, x0 + 10, M.wood, 0); parts.run(E, F, -1, x0, x0 + 10, M.wood, 4);
    for (let i = 1; i < 10; i += 2) parts.px(E, F, x0 + i, -2, M.bead, 3);
  }
  // 候选部件：moneyBag —— 垂到膝下的梨形大钱袋：2 格宽收口褶 → 1 行金绳结 → 袋身上窄下宽（4 → 7 格），中间 2×2 金「方孔钱」印记；
  // size 0–2 鼓大（下半身加宽），sway 左右晃（袋身下半跟着摆），torn = 破口漏钱。外沿走 leather 自己的勾线，和算盘的木框分开
  function moneyBag(R, cx, top, size, sway, torn) {
    E.part(); const s = size, sw = RD(sway * 0.5), lie = R.lie ? 1 : 0;
    parts.px(E, R, cx - 1, top, M.bag, 4); parts.px(E, R, cx, top, M.bag, 2);                                          // 收口褶（2 格，一亮一暗）
    parts.run(E, R, top + 1, cx - 2, cx + 1, M.cord, 0); parts.px(E, R, cx - 2, top + 1, M.cord, 4); parts.px(E, R, cx + 2, top + 2 + (sw > 0 ? 0 : 1), M.cord, 3);   // 金绳结 + 垂下的绳头
    const W = [[2, 1], [2, 2], [3, 2], [3, 3], [3, 3]];                                                                // 袋身各行 [左, 右] 半宽：4 → 5 → 6 → 7 → 7
    for (let y = top + 2, k = 0; y <= -1; y++, k++) {
      const w = W[Math.min(k, 4)], g = k >= 2 ? s : 0, c = cx + (k >= 2 ? sw : 0);
      parts.run(E, R, y, c - w[0] - g + lie, c + w[1] + g - lie, M.bag, 0);
    }
    const c = cx + (sw > 0 ? 1 : 0), ey = top + 3;                                                                    // 2×2 方孔钱印记
    parts.px(E, R, c - 1, ey, M.coin, 4); parts.px(E, R, c, ey, M.coin, 3); parts.px(E, R, c - 1, ey + 1, M.coin, 3); parts.px(E, R, c, ey + 1, M.coin, 1);
    if (torn) { parts.px(E, R, c + 3 + s, top + 4, M.bag, 1); parts.px(E, R, c + 2 + s, top + 5, M.bag, 1); parts.px(E, R, c + 4 + s, top + 5, M.coin, 4); }   // 破口 + 漏出的钱
  }
  // 八字胡：墨色短横压在下巴那一行（和鼻尖隔 1 行肤色），两端各上翘 1 格；笑的时候胡梢再翘；腮红在脸颊外侧、眼睛下面一行
  function mustache(R) {
    const y = R.hy, x1 = R.hx1, up = P.smile || P.beard > 1 ? 1 : 0, dn = P.beard < -1 ? 1 : 0;
    parts.run(E, R, y, x1 - 3, x1 - 1, M.hair, 1); parts.px(E, R, x1 - 2, y, M.hair, 2);
    parts.px(E, R, x1 - 4, y - 1 - up + dn, M.hair, 3); parts.px(E, R, x1, y - 1 - up + dn, M.hair, 3);
    parts.px(E, R, R.hx0 + 3, R.ey + 1, M.blush, P.smile ? 4 : 3);
  }
  // 腰后挂的一串铜钱（武器：甩出去的铜钱就从这里摸）
  function coinString(R, x, y) {
    E.part(); const b = RD(P.beard * 0.5);
    for (let k = 0; k < 5; k++) { const xx = x + (k >= 3 ? b : 0); if (k & 1) parts.px(E, R, xx, y + k, M.bag, 2); else { parts.px(E, R, xx, y + k, M.coin, 3); parts.px(E, R, xx - 1, y + k, M.coin, 2); } }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift); const R = parts.rig(P, BODY), lie = R.lie;
    parts.arm(E, R, P, { side: 'B', sleeve: 'bell', mat: M.silkD, cuff: M.trimD, grip: 'none' });
    parts.legs(E, R, P, { style: 'shoe', mat: M.gown, matD: M.gownD, boot: M.shoe, bootD: M.shoeD, bootH: 2 });
    const tor = parts.torso(E, R, P, { style: 'robe', mat: M.gown, flare: 4, flareF: 2.5 });       // 长袍拖到脚面
    const LL = tor.rows[0], RR = tor.rows[1], y0 = tor.y0, yH = R.yHip;
    for (let y = y0; y <= yH; y++) parts.run(E, R, y, LL[y - y0], RR[y - y0], M.silk, 0);            // 马褂（和长袍同一部件：材质之间是明暗边，不是分界线）
    parts.run(E, R, yH, LL[yH - y0], RR[yH - y0], M.trim, 0);                                         // 马褂下摆金边
    const fx = (y) => RR[y - y0] - 2;
    for (let y = y0 + 1; y < yH; y++) parts.px(E, R, fx(y), y, M.trim, y === y0 + 1 ? 4 : 3);        // 对襟金边
    for (let y = y0 + 2; y < yH; y += 2) parts.px(E, R, fx(y) + 1, y, M.trim, 4);                     // 盘扣
    parts.run(E, R, y0, RR[0] - 3, RR[0] - 1, M.trim, 0);                                            // 立领
    parts.px(E, R, LL[3] + 2, y0 + 3, M.silk, 2); parts.px(E, R, LL[4] + 2, y0 + 4, M.silk, 2);        // 背后褶
    coinString(R, LL[R.yWaist - y0] + 1, R.yWaist + 1);
    parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.ink, eyeStyle: 'narrow', nose: 'small', mouth: 'none' });
    for (let x = R.hx0 + 2; x <= R.hx1 - 1; x++) parts.px(E, R, x, R.hy + 1, M.skin, x === R.hx1 - 1 ? 3 : 2);   // 双下巴（和脸同一部件）
    mustache(R);                                                                                       // 八字胡 + 腮红（并进脸）
    const top = P.bhy - 5, under = !lie && P.hy - 1 > top + 9;                                         // 前手托在算盘下沿时，前臂压在算盘后面
    if (lie) {
      moneyBag(R, BAG_X, R.yWaist + 1, P.bag, P.sway, P.torn);
      const r = P.hatR; CAPF.r0 = r; CAPF.tx = CAP_X + P.hatX; CAPF.ty = -CAP_TY[r] - P.hatY; skullcap(CAPF, 0, 2);
      abacusFlat(10); parts.hand(E, R, P, { side: 'B', hand: M.skin });
      if (P.torn && !P.lift) { const F = parts.FREE; E.part(); for (const [x, y] of SPILL) { parts.px(E, F, x, y, M.coin, 4); parts.px(E, F, x + 1, y, M.coin, 2); } }
    } else {
      skullcap(R, R.hx, R.htop);
      if (under) parts.arm(E, R, P, { sleeve: 'bell', mat: M.silk, cuff: M.trim, grip: 'none' });
      moneyBag(R, BAG_X, R.yWaist + 1, P.bag, P.sway, P.torn);
      abacus(R, P.bhx + 1, top, ABC[P.abc], P.lit);
      parts.hand(E, R, P, { side: 'B', hand: M.skin });
    }
    if (under) parts.hand(E, R, P, { hand: M.skin });
    else parts.arm(E, R, P, { sleeve: 'bell', mat: M.silk, cuff: M.trim, hand: M.skin });
    if (P.coin && !lie) { E.part(); parts.px(E, R, P.hx, P.hy - 2, M.coin, 4); parts.px(E, R, P.hx + 1, P.hy - 2, M.coin, 2); }   // 指间捏着的铜钱
  }
  const SPILL = [[-4, 0], [-1, -1], [2, 0], [5, 0], [7, -1], [12, -3], [15, -3], [-7, 0]];          // 撒了一地的铜钱（精灵本地坐标）
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const NF = 14, FLX = new Float32Array(NF), FLT = new Float32Array(NF), FLS = new Uint8Array(NF);   // 金币喷泉：落点、落地时刻、已走到第几段（0 飞 · 1 弹一下 · 2 弹两下 · 3 吸回）
  let mzT = 9, mzX = 0, mzY = 0, castT = 9, speedT = 9, chargeAcc = 0, soulAcc = 0, orbAcc = 0, lastStep = 0, lastPers = -1, landed = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const bagX = () => wx(BAG_X + P.bx), bagY = () => wy(-3);
  function onEnter(s) {
    if (s === RECOVER) speedT = 0;
    if (s !== CAST) return;
    const bx = bagX(), by = wy(-5), g = 230;                          // 钱袋一抖：金币喷泉（上抛外爆，带重力）+ 金色冲击环
    castT = 0; landed = 0;
    for (let i = 0; i < NF; i++) {
      const vx = -46 + 92 * (i / (NF - 1)) + (Math.random() - 0.5) * 12, vy = -(78 + Math.random() * 46);
      const tl = (-vy + Math.sqrt(vy * vy + 2 * g * (HY - by))) / g; FLX[i] = bx + vx * tl; FLT[i] = tl; FLS[i] = 0;
      spawnX(K_PHYS, bx, by, vx, vy, tl + 0.04, R_EL, { g, floor: HY, age0: 0.1 });
    }
    releaseOrbit(30, 70, 0.3, 0.6, { pts: 1 });
    ring(bx, by, 1, R_EL); burst(bx, by, 16, 40, 100, 0.2, 0.5, R_EL, 30); fx.cross(bx, by, 6, R_EL, 0.3);
    shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'coin', w: 0.45 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FLICK) {                              // 甩腕扔出铜钱：手边一闪金光
      mzT = 0; mzX = wx(P.hx + P.bx) + 1; mzY = wy(P.hy - 1);
      shoot(1, mzX + 2, mzY, 170, DUMMY_X - 3, R_EL, 8, { trail: { every: 2, life: [0.08, 0.2], back: [8, 20] } });
      burst(mzX, mzY, 5, 20, 50, 0.12, 0.25, R_EL, 0);
      sfx('swing', { kind: 'throw', w: 0.3 }); sfx('shoot', { proj: 'coin' });
    }
    if (s === DEATH && t === T_LAND) {                                // 摔地：尘土 + 钱袋破开，铜钱撒一地
      for (let i = 0; i < 14; i++) spawn(K_DUST, HX - 18 + Math.random() * 26, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      const bx = wx(1), by = wy(-8);
      for (let i = 0; i < 10; i++) spawnX(K_PHYS, bx, by, (Math.random() - 0.4) * 60, -40 - Math.random() * 50, 0.8 + Math.random() * 0.5, R_EL, { g: 260, floor: HY - (i & 1), age0: 0.15 });
      shake(0.1, 1); sfx('fall', { w: 0.5 });
    }
  }
  const EVENTS = [[], [], [T_FLICK], [], [], [], [], [T_LAND], []];
  function impactOn(k, x, y) {
    if (k === 1) { burst(x, y, 9, 30, 80, 0.12, 0.3, R_EL, 8); fx.cross(x, y, 3, R_EL, 0.15); hitDummy(0); sfx('hit', { mat: 'metal', w: 0.25 }); }
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                           // 地上的金币点定点螺旋汇入钱袋
      chargeAcc += dt * (12 + 26 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const tx = bagX(), ty = bagY(), sx = HX - 24 + Math.random() * 52, sy = HY - Math.random() * 2, dx = sx - tx, dy = (sy - ty) / 0.75, r = Math.hypot(dx, dy);
        spawnX(K_SPIRAL_PT, tx, ty, r / (0.45 + Math.random() * 0.3), 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: (Math.random() < 0.5 ? -1 : 1) * (2 + Math.random() * 2), tx, ty });
      }
      if (P.lit && Math.random() < dt * 10) { const bx = wx(P.bhx + 3 + P.bx + 2 * Math.floor(Math.random() * Math.min(4, P.lit))), by = wy(P.bhy - 5); spawn(K_EMBER, bx, by, Math.random() * 6 - 3, -10 - Math.random() * 8, 0.35, R_EL); }
    }
    if (castT < 3) {                                                  // 喷泉里的金币：落地 → 弹两下 → 被吸回钱袋
      castT += dt;
      for (let i = 0; i < NF; i++) {
        const t0 = FLT[i], x = FLX[i];
        if (FLS[i] === 0 && castT >= t0) { FLS[i] = 1; spawnX(K_PHYS, x, HY, (Math.random() - 0.5) * 10, -42, 0.3, R_EL, { g: 300, floor: HY, age0: 0.1 }); if (!landed) { landed = 1; sfx('impact', { pal: 'coin', w: 0.2 }); } }
        else if (FLS[i] === 1 && castT >= t0 + 0.28) { FLS[i] = 2; spawnX(K_PHYS, x, HY, 0, -22, 0.16, R_EL, { g: 300, floor: HY, age0: 0.2 }); }
        else if (FLS[i] === 2 && castT >= t0 + 0.45) {
          FLS[i] = 3; const tx = bagX(), ty = bagY(), dx = x - tx, dy = (HY - 1 - ty) / 0.75, r = Math.hypot(dx, dy);
          spawnX(K_SPIRAL_PT, tx, ty, r / 0.3, 0, 9, R_EL, { a: Math.atan2(dy, dx), r, w: 3, tx, ty });
        }
      }
    }
    if (state === MOVE && P.step !== lastStep) {                      // 慢踱：每步 1 颗尘
      if (P.step !== 0) { sfx('step', { w: 0.45 }); spawn(K_DUST, wx(P.step > 0 ? 5 : -5) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 14, -3 - Math.random() * 5, 0.3 + Math.random() * 0.2, FXI.dust); }
      lastStep = P.step;
    }
    if (state === IDLE) {                                             // 拨算盘：每拨一下一颗金星
      const lp = q12(stT) % DUR[IDLE], f = lp >= 1.6 && lp < 2.0 ? Math.floor((lp - 1.6) * 12 + 1e-6) : -1;
      if (f !== lastPers) { if (f === 0 || f === 1 || f === 3) spawn(K_EMBER, wx(P.hx + P.bx), wy(P.hy - 1), Math.random() * 6 - 3, -10 - Math.random() * 6, 0.35, R_EL); lastPers = f; }
      orbAcc += dt * 1.6; while (orbAcc >= 1) { orbAcc -= 1; spawn(K_EMBER, wx(P.gx), wy(P.gy - 1), Math.random() * 6 - 3, -6 - Math.random() * 6, 0.6 + Math.random() * 0.5, FXI.curse); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 22 + Math.random() * 30, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    mzT += dt; speedT += dt;
  }
  function fxReset() { mzT = 9; castT = 9; speedT = 9; chargeAcc = 0; soulAcc = 0; orbAcc = 0; lastStep = 0; lastPers = -1; landed = 0; FLS.fill(3); }
  function fxBack(f12) { if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, P.rim >= 2 ? EL : VOID, f12); shotFloorGlow(f12); }
  function fxMid(f12) {
    if (speedT < 0.45) {                                              // 「卖空」：身后闪过两道金色速度线，往后拉长再断开
      const q = speedT / 0.45, len = RD(6 + 18 * Math.sin(q * Math.PI)), x1 = HX - 8 - RD(q * 10);
      for (const [y, o] of [[HY - 7, 0], [HY - 16, 4]]) for (let k = 0; k < len; k++) { if (q > 0.5 && ((k + f12) % 3) === 0) continue; put(x1 - o - k, y, k < 3 ? EL[0] : k < len * 0.5 ? EL[1] : EL[2]); }
    }
  }
  function fxFront(f12) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (P.gem >= 2 && P.gem <= 3 && !P.lying && P.dq < 1) { const L = P.gem === 3 ? 5 : 2 + (f12 & 1); for (let r = 2; r <= L; r++) { const c = r <= 2 ? VOID[0] : r <= 3 ? VOID[1] : VOID[2]; put(gx + r, gy, c); put(gx - r, gy, c); put(gx, gy - r, c); } }
    if (E.state === CHARGE && P.bag > 0 && !P.lying) { const bx = bagX(), by = bagY(), k = f12 & 3; put(bx - 4 - P.bag + (k & 1), by - 2 + (k >> 1) * 3, EL[k === 0 ? 0 : 1]); put(bx + 3 + P.bag, by + 1 - (k & 1) * 2, EL[1]); }   // 钱袋边上的金光闪点
    if (mzT < 2 / 12) { const c = mzT < 1 / 12 ? EL[0] : EL[1]; put(mzX, mzY, EL[0]); for (let r = 1; r <= 2; r++) { put(mzX + r, mzY, c); put(mzX, mzY - r, c); put(mzX, mzY + r, c); put(mzX - r, mzY, EL[2]); } }
  }
  function drawShot(k, x, y, d, f12) {
    if (k !== 1) return false;                                        // 打转的铜钱：正面（圆 + 方孔）→ 斜 → 侧边 → 斜
    x = RD(x); y = RD(y); const ph = f12 & 3;
    if (ph === 0) { for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) put(x + i, y + j, i === 0 && j === 0 ? EL[4] : (i < 0 || j < 0) ? EL[1] : EL[2]); put(x - 1, y - 1, EL[3]); }
    else if (ph === 2) { put(x, y - 1, EL[1]); put(x, y, EL[0]); put(x, y + 1, EL[2]); }
    else { put(x, y - 1, EL[1]); put(x + d, y - 1, EL[2]); put(x, y, EL[1]); put(x + d, y, EL[4]); put(x, y + 1, EL[2]); put(x + d, y + 1, EL[3]); }
    return true;
  }

  return {
    name: '地主', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.orb, M.orbHot, M.lit], HIT_POINT: [1, -11], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'coin', style: 'coin', w: 0.45 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront, drawShot,
  };
});
