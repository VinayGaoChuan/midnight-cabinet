// 荷官（最终首领，第 9 关「地下赌场」的牌桌）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「戴着遮光帽的荷官，手里的牌从不离手」「荷官发牌从来不看牌，因为每一张牌都是他」；牌桌绒布；
// 洗牌（最前面三个和最后面三个对调）、发牌（落在最后排四个）、拍桌（砸最前面两个）→ 第二阶段 全押（抛硬币：正面回血，反面掉血）。
// 设定卡 ——
//   剪影：从绿绒赌桌后面升起的又高又瘦的上半身（原点 = 桌面绒布），头上一顶半透明的绿色遮光帽，帽檐宽得像一片伸出去的屋檐，
//         绿影压在眼睛上，影子里两点金光；油亮往后梳的黑发、一撇细胡子、一张咧到颧骨的固定笑脸（识别点：绿帽檐 + 帽檐下的两点金光 + 笑）。
//   身上：白衬衫、红色袖箍（袖子上的红带 + 铜扣）、黑马甲和金扣、怀表链、红领结；背后一把扇形张开的大牌（牌背红底金菱纹），
//         近手一直扇着一手五张牌，远手扣着一副牌。牌就是他的武器。
//   主色：黑马甲、冷白衬衫、苍白的皮、红（领结 / 袖箍 / 牌背）；光源是筹码金（眼睛、蓄力的牌、硬币）和遮光帽透下来的绿光。
//   招式（setMove）：shuffle 洗牌 · dealCards 发牌 · slapTable 拍桌 · allIn 全押 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 常亮。
//     洗牌：两手之间架起一道牌桥，牌一张张瀑布一样落过去、越洗越亮 → 两手一甩，一圈牌绕着他转成龙卷。
//     发牌：近手把一手牌拉到脑后、牌边烧成金色，远手把牌递到前面 → 一甩手腕，五张牌旋转着往高处飞出去（落在后排由游戏画）。
//     拍桌：双手高举过头、掌心朝下、笑得更开 → 两掌拍在绒布上，筹码和牌跳起来。
//     全押：双手把筹码堆往前一推 → 拇指上顶着一枚越来越亮的大金币 → 一弹，金币打着转飞上头顶，他抬头盯着看。
//     重击：一张牌竖在肩后 → 当刀往前一刺。升起：扒着桌沿爬出来 → 挺直、张开双手、背后的牌扇全开、咧嘴。
//     第二阶段：两手把帽檐往下一压、两声心跳 → 仰头大笑，背后的牌全翻成正面、金边亮起，笑一直咧到耳根。
//     死亡：抱头哀嚎、牌从背后散掉 → 趴倒在牌桌上、帽子歪掉 → 整个人化成一堆散牌沉进绒布。
PCD.define('B_croupier', (E) => {
  const { defDeep, defMat, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（暗 → 亮）：马甲和头发压到最暗，金光和绿帽檐才亮得出来 ─────
  // 色板有上限：马甲用共用的 obsidian、衬衫 bladesteel、头发 stormmane、领结和牌背 hellhide、金扣筹码 brass、牌面 ivory、桌沿 hide；只有皮和绿绒是自己的
  const R_SKIN = ['#0c080a', '#20161a', '#382a2c', '#54403e', '#725a54', '#92766c', '#b09488', '#cab2a4', '#e2d0c0', '#f6ece0'];
  const R_FELT = ['#020a06', '#05160d', '#0a2415', '#10331d', '#174527', '#1f5a31', '#2a703c', '#398849', '#4ea25a', '#6cbe70', '#9edc98'];
  const SKIN = defDeep(R_SKIN, { depth: 5, amb: 0.32 }), SKIND = defDeep(R_SKIN, { depth: 4, dark: 2, amb: 0.1 });
  const VEST = defDeep('obsidian', { depth: 8, dark: 3, amb: 0.06 }), VESTD = defDeep('obsidian', { depth: 5, dark: 4, amb: 0.05 });
  const SHIRT = defDeep('bladesteel', { depth: 6, amb: 0.34 }), SHIRTD = defDeep('bladesteel', { depth: 5, dark: 3, amb: 0.2 });
  const HAIR = defDeep('stormcoat', { depth: 5, dark: 4, amb: 0.03 });
  const RED = defDeep('hellhide', { depth: 4, dark: 1, amb: 0.16 }), REDD = defDeep('hellhide', { depth: 3, dark: 3, amb: 0.1 });
  const GOLD = defDeep('brass', { depth: 4, amb: 0.2 }), CARD = defDeep('ivory', { depth: 2, amb: 0.62 }), CARDD = defDeep('ivory', { depth: 2, dark: 2, amb: 0.5 });
  const LEATH = defDeep('hide', { depth: 4, dark: 2, amb: 0.08 }), FELT = defDeep(R_FELT, { depth: 2, dark: 3, amb: 0.2 });
  const VISOR = defDeep(R_FELT, { depth: 3, amb: 0.5 }), VOIDM = defDeep('obsidian', { depth: 2, dark: 5, amb: 0.02 });
  const G1 = defMat(ramp(['#3a2208', '#7c4e12', '#c48624', '#e0a838']), 1, 1), G2 = defMat(ramp(['#7c4e12', '#e0a838', '#f4cc60', '#fff0a0']), 1, 1), G3 = defMat(ramp(['#e0a838', '#f4cc60', '#fff0a0', '#ffffff']), 1, 1);
  const VGL = defMat(ramp(['#174527', '#4ea25a', '#9edc98', '#d8f8c8']), 1, 1);   // 第二阶段帽檐透出来的绿光
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { shuffle: { 3: 1.1, 4: 0.5, 5: 0.7 }, dealCards: { 3: 1.2, 4: 0.5, 5: 0.7 }, slapTable: { 3: 1.2, 4: 0.5, 5: 0.7 }, allIn: { 3: 1.6, 4: 0.6, 5: 0.8 },
    poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'shuffle', HOT = 0;   // HOT：第二阶段，背后的牌翻成正面、金边和帽檐常亮
  const GOLDL = ramp(['#fff0a0', '#f4cc60', '#c48624']), FELTL = [R_FELT[8], R_FELT[6], R_FELT[4]], VISL = ramp(['#9edc98', '#4ea25a', '#1f5a31']);
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: GOLDL, k: 0.9 }, { x: 0, y: 0, r: 60, ramp: ramp(FELTL), k: 0.3 }, { x: 0, y: 0, r: 0, ramp: GOLDL, k: 0.9 }, { x: 0, y: 0, r: 0, ramp: VISL, k: 0.55 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.coin], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[G1] = RIM.skip[G2] = RIM.skip[G3] = RIM.skip[VGL] = RIM.skip[VOIDM] = 1;

  // 姿势：身体升降 / 前倾、转头、嘴、两只手、近手那手牌的朝向（fa，屏幕角度）和张开（fo）、背后牌扇的张开（bf）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'fa', 'fo', 'bf', 'glow', 'eyes', 'cg', 'vt', 'flash', 'dq', 'hot', 'tail', 'breath', 'grip', 'slap',
    'bridge', 'ringR', 'fly', 'fly1', 'coin', 'cf', 'push', 'blade', 'glint', 'fall', 'deck'];
  const K = {
    idle: { nx: 31, ny: -38, fx2: -30, fy2: -14, lean: 0.05, hd: 0.04, fa: -1.25, fo: 1, bf: 1 },
    shufW: { nx: 34, ny: -40, fx2: 6, fy2: -40, lean: 0.04, hd: 0.2, fa: -1.6, fo: 0, bf: 1.05 },         // 洗牌：两手在胸前架牌桥
    shuf: { nx: 52, ny: -58, fx2: -42, fy2: -56, lean: -0.12, hd: -0.12, fa: -0.9, fo: 0.4, bf: 1.25 },    // 一甩：两手张开，牌绕身转
    dealW: { nx: -6, ny: -68, fx2: 26, fy2: -44, lean: -0.2, hd: -0.08, fa: -2.85, fo: 1.2, bf: 0.9 },     // 发牌：一手牌拉到脑后，远手把牌递到前面
    deal: { nx: 50, ny: -66, fx2: -18, fy2: -34, lean: 0.22, hd: -0.12, fa: -0.55, fo: 0.25, bf: 1.1 },
    slapW: { nx: 26, ny: -74, fx2: -24, fy2: -71, lean: -0.22, hd: -0.2, fa: -1.7, fo: 0, bf: 1.15 },     // 拍桌：双手举过头、掌心朝下
    slap: { nx: 46, ny: -32, fx2: 22, fy2: -30, lean: 0.4, hd: 0.26, fa: -0.2, fo: 0, bf: 0.8 },
    push: { nx: 50, ny: -32, fx2: 28, fy2: -30, lean: 0.36, hd: 0.18, fa: -0.6, fo: 0, bf: 0.95 },        // 全押：把筹码往前一推
    flipW: { nx: 42, ny: -50, fx2: -24, fy2: -36, lean: -0.04, hd: -0.06, fa: -1.4, fo: 0, bf: 1.1 },     // 拇指顶着金币
    flip: { nx: 36, ny: -76, fx2: -30, fy2: -44, lean: -0.14, hd: -0.36, fa: -1.5, fo: 0, bf: 1.2 },
    pokeW: { nx: 4, ny: -54, fx2: -26, fy2: -18, lean: -0.1, hd: 0, fa: -2.5, fo: 0, bf: 1 },             // 重击：一张牌竖在肩后 → 往前刺
    poke: { nx: 58, ny: -46, fx2: -26, fy2: -20, lean: 0.3, hd: 0.14, fa: -0.12, fo: 0, bf: 0.9 },
    atkW: { nx: 18, ny: -54, fx2: -30, fy2: -14, lean: -0.06, hd: 0.02, fa: -2.1, fo: 0.8, bf: 1 },       // 普攻：一手牌收到胸前 → 甩出一张
    atk: { nx: 52, ny: -42, fx2: -30, fy2: -14, lean: 0.22, hd: 0.1, fa: -0.35, fo: 0.6, bf: 1 },
    hunch: { nx: 24, ny: -70, fx2: 6, fy2: -68, lean: 0.3, hd: 0.34, fa: -1.8, fo: 0, bf: 0.7 },          // 第二阶段：两手压帽檐
    wide: { nx: 52, ny: -66, fx2: -44, fy2: -64, lean: -0.16, hd: -0.3, fa: -1.0, fo: 1.2, bf: 1.35 },
    climbA: { nx: 40, ny: -30, fx2: -34, fy2: -40, lean: 0.3, hd: 0.2, fa: -1.0, fo: 0, bf: 0.7 },
    climbB: { nx: 32, ny: -40, fx2: -30, fy2: -30, lean: 0.26, hd: 0.22, fa: -1.2, fo: 0, bf: 0.75 },
    agony: { nx: 20, ny: -80, fx2: -2, fy2: -80, lean: -0.22, hd: -0.44, fa: -1.8, fo: 0.4, bf: 1.4 },
    limp: { nx: 42, ny: -30, fx2: 10, fy2: -30, lean: 0.62, hd: 0.52, fa: -0.3, fo: 0.3, bf: 0.3 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'fa', 'fo', 'bf'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.mx = 0; P.flip = 0; P.deck = 1; }
  const FAN6 = [0, 0.06, 0.1, 0.06, 0, -0.05];
  const qf = (v) => Math.round(v * 4) / 4;

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; const s = Math.floor(tt / 0.3) % 6; P.fa = K.idle.fa + FAN6[s]; P.ny += FAN6[s] * 20;   // 一手牌轻轻扇着
      P.tail = f12 % 8; P.glow = 1 + ((f12 >> 2) & 1); P.eyes = (f12 % 7 === 0 || f12 % 11 === 0) ? 2 : 1;
      const lp = tt % DUR[IDLE];   // 待机个性：啪地合上一手牌、歪头「看」你一眼、牙上一闪，再一抖手腕把牌扇开
      if (lp >= 1.3 && lp < 2.15) { const k = lp - 1.3;
        if (k < 0.2) { P.fo = qf(1 - k / 0.2); P.fa = -1.4; }
        else if (k < 0.55) { P.fo = 0; P.fa = -1.5; P.hd = 0.22; P.jaw = 1; P.eyes = 2; P.glint = k < 0.4 ? 1 : 0; P.nx -= 4; P.ny -= 6; }
        else { const q = clamp01((k - 0.55) / 0.2); P.fo = qf(q * 1.15); P.fa = -1.5 + 0.3 * q; P.hd = 0.22 * (1 - q); P.jaw = q < 1 ? 1 : 0; P.eyes = 2; } } };
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [3, 0, 3, 0][f]; P.tail = f12 % 8; P.grip = 1; P.deck = 0; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.atkW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.atkW, K.atkW); P.glow = 2; P.cg = 1; P.eyes = 2; }
      else if (tq < 0.42) { pose(K.atk, K.atk); P.jaw = 1; P.glow = 3; P.cg = 2; P.eyes = 2; P.fly1 = Math.round((tq - 0.25) / 0.17 * 4) / 4 + 0.25; }
      else pose(K.atk, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { P.hd = -0.3; P.lean = -0.1; P.jaw = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.vt = 0.3; P.fo = 0.4; P.fa = -2; P.nx -= 5; P.ny -= 4; P.bf = 1.25; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.3 * (1 - q); P.lean = 0.05 - 0.15 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; P.vt = q < 0.7 ? 0.15 : 0; P.fo = qf(0.4 + 0.6 * q); }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.nx += (f12 & 1) ? 1 : -1; P.vt = 0.2; P.fall = qf(clamp01((d - 0.3) / 0.4) * 0.5); P.tail = f12 % 8; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 2 : 1; P.eyes = d < 1.2 ? 2 : 1; P.by = Math.round(4 * clamp01((d - 0.7) / 0.8)); P.vt = 0.2 + 0.3 * clamp01((d - 0.9) / 0.4); P.fall = qf(0.5 + 0.5 * clamp01((d - 0.7) / 0.6)); P.deck = 0; }
      else { pose(K.limp, K.limp); P.jaw = 1; P.glow = 0; P.eyes = d < 1.8 ? 1 : 0; P.vt = 0.5; P.fall = 1; P.deck = 0;   // 趴在牌桌上，化成散牌沉进绒布
        const q = ease.in(clamp01((d - 1.5) / 0.9)); P.by = 4 + Math.round(22 * q); P.dq = d > 1.9 ? Math.round(clamp01((d - 1.9) / 0.65) * 48) / 48 : 0; }
    }
    if (P.hot && st !== DEATH) { if (P.glow < 2) P.glow = 2; if (P.eyes < 2 && st !== HURT) P.eyes = 2; if (!P.jaw) P.jaw = 1; P.bf = Math.max(P.bf, 1.15); }
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { shuffle: 0, dealCards: 1, slapTable: 2, allIn: 3, poke: 4, rise: 5, p2: 6 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), jit = (f12 & 1) ? 1 : -1;
    if (MV === 'shuffle') {   // 牌桥一张张落过去、越洗越亮 → 两手一甩，牌绕身转
      if (st === CHARGE) { pose(K.idle, K.shufW, ease.out(clamp01(q / 0.25))); const k = Math.floor(tq * 12) % 4; P.nx += [0, -2, -4, -2][k]; P.fx2 += [0, 2, 4, 2][k]; P.bridge = 1 + (f12 % 8); P.deck = 0;
        P.cg = Math.min(3, Math.floor(q * 4)); P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.7 ? 1 : 0; if (q > 0.75) { P.by = -(f12 & 1); P.nx += jit; } }
      else if (st === CAST) { pose(K.shufW, K.shuf, ease.out(clamp01(tq / 0.12))); P.ringR = Math.round(18 + 36 * ease.out(clamp01(tq / 0.45))); P.tail = f12 % 8; P.jaw = 2; P.glow = 3; P.eyes = 2; P.cg = 2; P.deck = 0; }
      else { pose(K.shuf, K.idle, ease.inOut(clamp01(tq / 0.55))); P.fo = qf(clamp01(tq / 0.45)); P.deck = tq > 0.3 ? 1 : 0; }
    } else if (MV === 'dealCards' || MV === 'poke') {
      const deal = MV === 'dealCards', up = deal ? K.dealW : K.pokeW, dn = deal ? K.deal : K.poke;
      if (st === CHARGE) { pose(K.idle, up, ease.out(clamp01(q / 0.45))); P.by = -Math.round((deal ? 4 : 2) * ease.out(clamp01(q / 0.45))); if (q > 0.55) { P.nx += jit; P.by += (f12 & 1); }
        P.cg = deal ? Math.min(3, 1 + Math.floor(q * 3)) : q > 0.5 ? 2 : 1; P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.8 ? 1 : 0; P.blade = deal ? 0 : 1; if (deal) P.fo = qf(1 + 0.25 * q); }
      else if (st === CAST) { pose(dn, dn); P.by = deal ? 0 : 2; P.cg = tq < 2 / 12 ? 3 : 1; P.jaw = 2; P.glow = 3; P.eyes = 2; if (deal) P.fly = Math.round(clamp01(tq / 0.42) * 6) / 6 + 0.05; else P.blade = 2; }
      else { pose(dn, K.idle, ease.inOut(clamp01(tq / 0.55))); P.by = deal ? 0 : Math.round(2 * (1 - clamp01(tq / 0.55))); if (deal) P.fo = qf(clamp01(tq / 0.5)); else P.blade = tq < 0.3 ? 1 : 0; }
    } else if (MV === 'slapTable') {   // 双手举过头 → 两掌拍在绒布上
      if (st === CHARGE) { pose(K.idle, K.slapW, ease.out(clamp01(q / 0.5))); P.by = -Math.round(4 * ease.out(clamp01(q / 0.5))); P.slap = 1; P.deck = 0; P.cg = q > 0.5 ? Math.min(3, 1 + Math.floor((q - 0.5) * 5)) : 0;
        P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.45 ? 2 : 1; if (q > 0.6) { P.nx += jit; P.fx2 -= jit; P.by += (f12 & 1); } }
      else if (st === CAST) { pose(K.slap, K.slap); P.by = 3; P.slap = 2; P.deck = 0; P.jaw = 3; P.glow = 3; P.eyes = 2; P.cg = tq < 2 / 12 ? 3 : 0; P.vt = tq < 2 / 12 ? -0.12 : 0; }
      else { pose(K.slap, K.idle, ease.inOut(clamp01(tq / 0.6))); P.by = Math.round(3 * (1 - clamp01(tq / 0.6))); P.slap = tq < 0.25 ? 2 : 0; P.deck = tq > 0.3 ? 1 : 0; P.fo = qf(clamp01((tq - 0.2) / 0.4)); }
    } else if (MV === 'allIn') {   // 把筹码推出去 → 拇指上的金币越来越亮 → 一弹，金币打着转飞上头顶
      if (st === CHARGE) {
        if (q < 0.4) { pose(K.idle, K.push, ease.out(clamp01(q / 0.3))); P.push = 1 + (q > 0.2 ? 1 : 0); P.deck = 0; P.eyes = 2; P.jaw = 1; P.glow = 2; }
        else { pose(K.push, K.flipW, ease.out(clamp01((q - 0.4) / 0.2))); P.coin = q < 0.7 ? 1 : 2; P.cg = Math.min(3, 1 + Math.floor((q - 0.4) * 7)); P.glow = q < 0.7 ? 2 : 3; P.eyes = 2; P.jaw = q > 0.8 ? 2 : 1; P.deck = 0; if (q > 0.8) { P.nx += jit; P.by = -(f12 & 1); } } }
      else if (st === CAST) { pose(K.flip, K.flip); P.coin = 3; P.cf = Math.round(clamp01(tq / 0.35) * 6) / 6; P.jaw = 3; P.glow = 3; P.eyes = 2; P.cg = 3; P.deck = 0; }
      else { pose(K.flip, K.idle, ease.inOut(clamp01((tq - 0.2) / 0.55))); P.coin = tq < 0.2 ? 3 : 0; P.cf = 1; P.jaw = tq < 0.4 ? 2 : 0; P.deck = tq > 0.4 ? 1 : 0; P.fo = qf(clamp01((tq - 0.3) / 0.4)); }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [3, 0, 3, 0][f] + Math.round(14 * (1 - q)); P.glow = 1 + (f12 & 1); P.tail = f12 % 8; P.eyes = q > 0.6 ? 2 : 1; P.grip = 1; P.deck = 0; P.bf = 0.4 + 0.4 * q; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.glint = 1; P.bf = 1.35; P.fo = 1.2; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：两手压帽檐、两声心跳 → 仰头大笑，背后的牌全翻成正面
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.by = hb ? 1 : 0; P.bf = hb ? 0.95 : 0.7; P.hot = hb ? 1 : HOT; P.deck = 0; P.vt = 0.1; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.glint = 1; P.tail = f12 % 8; P.ringR = Math.round(24 + 30 * clamp01(tq / 0.4)); }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 1; P.glow = 3; P.eyes = 2; P.hot = 1; P.tail = f12 % 8; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const S = 1.2, HS = 1.15, DROP = 10, SHN = [16, -45], SHF = [-15, -47], NECK = [6, -52], FANP = [-2, -40];
  function torsoXf() { B.reset(); B.move(0, P.by + DROP); B.rot(0, 0, P.lean); }   // DROP：整个人往桌面下沉一截，头顶留在战场的可见高度里
  function headXf() { torsoXf(); B.rot(NECK[0] * S, NECK[1] * S, P.hd * 0.6 - P.lean * 0.35); }
  function visXf() { headXf(); B.rot(6 * S, (NECK[1] - 20 * HS) * S, -P.vt); }   // 帽子：挨打时被打歪
  function geo() {
    torsoXf(); L.shN = Ba(SHN[0], SHN[1]); L.shF = Ba(SHF[0], SHF[1]); L.core = Ba(3, -30); L.fanP = Ba(FANP[0], FANP[1]);
    hsc = HS; headXf(); L.eye = Ba(18.5, -67); L.eyeF = Ba(11, -66.5); L.mouth = Ba(20, -57); L.head = Ba(11, -67); L.shade = Ba(17, -68);
    visXf(); L.visor = Ba(26, -75); hsc = 1;
    L.hN = [P.nx * S, P.ny * S + P.by + DROP]; L.hF = [P.fx2 * S, P.fy2 * S + P.by + DROP];
    L.elN = B.ik(L.shN, L.hN, 21 * S, 21 * S, 1); L.elF = B.ik(L.shF, L.hF, 21 * S, 21 * S, -1);
    L.coin = P.coin === 3 ? [L.hN[0] + 5 + 7 * P.cf, L.hN[1] - 12 - 26 * P.cf] : [L.hN[0] + 3, L.hN[1] - 8];
    const bx = (L.hN[0] + L.hF[0]) / 2, by = Math.min(L.hN[1], L.hF[1]) - 17; L.bridge = [bx, by];
    L.fanTip = [L.hN[0] + Math.cos(P.fa) * 12, L.hN[1] + Math.sin(P.fa) * 12];
    L.slapN = [L.hN[0] + 5, L.hN[1] + 2]; L.slapF = [L.hF[0] + 5, L.hF[1] + 2];
    const fc = P.coin ? L.coin : P.bridge ? L.bridge : P.slap ? L.slapN : P.cg ? L.fanTip : L.core; P.fcx = fc[0]; P.fcy = fc[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const gold = (n) => (n >= 3 ? G3 : n >= 2 ? G2 : G1);
  // 本地设计坐标 → 画布：整体放大 S，头再绕脖子放大 HS（大头、帽檐是剪影的主角）
  let hsc = 1; const sc = (x, y) => hsc === 1 ? [x * S, y * S] : [(NECK[0] + (x - NECK[0]) * hsc) * S, (NECK[1] + (y - NECK[1]) * hsc) * S];
  const Bp = (pts, m, t) => B.poly(E, pts.map((p) => sc(p[0], p[1])), m, t), Ba = (x, y) => { const a = sc(x, y); return B.at(a[0], a[1]); };
  const Be = (cx, cy, rx, ry, a, m, t) => { const c = sc(cx, cy), k = S * hsc; B.ell(E, c[0], c[1], rx * k, ry * k, a, m, t); };
  const Bl = (x0, y0, x1, y1, m, t) => { const a = sc(x0, y0), b = sc(x1, y1); B.ln(E, a[0], a[1], b[0], b[1], m, t); }, Bx = (x, y, m, t) => { const a = sc(x, y); B.px(E, a[0], a[1], m, t); };
  const Bc = (x0, y0, x1, y1, r0, r1, m, t) => { const a = sc(x0, y0), b = sc(x1, y1), k = S * hsc; B.cap(E, a[0], a[1], b[0], b[1], r0 * k, r1 * k, m, t); };

  // 一张牌（世界坐标）：c 中心，a 牌「上」的方向，w×h；face 正面（角标 + 花色）或背面（红底、白边、金菱纹）；glow 金边
  const SUIT_RED = [0, 1, 1, 0];
  function card(c, a, w, h, face, glow, seed, dim) {
    w *= S; h *= S; const u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]], hw = w / 2, hh = h / 2, P4 = (s, r, e) => [c[0] + u[0] * s * (hh + e) + v[0] * r * (hw + e), c[1] + u[1] * s * (hh + e) + v[1] * r * (hw + e)];
    const at = (s, r) => [c[0] + u[0] * s + v[0] * r, c[1] + u[1] * s + v[1] * r];
    if (glow) { part(); B.reset(); polyW([P4(1, -1, 1), P4(1, 1, 1), P4(-1, 1, 1), P4(-1, -1, 1)], gold(glow)); }
    part(); B.reset(); const q = [P4(1, -1, 0), P4(1, 1, 0), P4(-1, 1, 0), P4(-1, -1, 0)];
    const suit = (seed | 0) & 3, red = SUIT_RED[suit], pm = red ? RED : VOIDM, pt = red ? 7 : 0;
    if (face) {
      polyW(q, dim ? CARDD : CARD);
      if (w >= 10) {   // 大牌：角标 + 中间一个大花色
        const k = at(hh - 2.2, -hw + 2); px(k[0], k[1], pm, pt); const k2 = at(hh - 3.4, -hw + 2); px(k2[0], k2[1], pm, pt); const k3 = at(-hh + 2.2, hw - 2); px(k3[0], k3[1], pm, pt);
        const m = at(0.5, 0); dot(m[0], m[1], 2.2, pm, pt); const l = at(1.6, -1.4), r = at(1.6, 1.4); dot(l[0], l[1], 1.3, pm, pt); dot(r[0], r[1], 1.3, pm, pt);
        const tip = red ? at(-2.4, 0) : at(3.4, 0); px(tip[0], tip[1], pm, pt); if (!red) { const s0 = at(-2.2, 0), s1 = at(-3.4, 0); lnW(s0[0], s0[1], s1[0], s1[1], pm, pt); }
        if (glow >= 2) { const e0 = at(hh - 0.8, -hw + 1), e1 = at(hh - 0.8, hw - 1); lnW(e0[0], e0[1], e1[0], e1[1], G2); }
      } else {   // 小牌：一个角标 + 一个花色点
        const k = at(hh - 1.6, -hw + 1.4); px(k[0], k[1], pm, pt); const m = at(0, 0.3); dot(m[0], m[1], 1.1, pm, pt);
      }
    } else {
      polyW(q, dim ? REDD : RED);
      const b = [at(hh - 1.3, -hw + 1.3), at(hh - 1.3, hw - 1.3), at(-hh + 1.3, hw - 1.3), at(-hh + 1.3, -hw + 1.3)];
      for (let i = 0; i < 4; i++) lnW(b[i][0], b[i][1], b[(i + 1) % 4][0], b[(i + 1) % 4][1], dim ? CARDD : CARD, 6);
      const d = [at(hh * 0.55, 0), at(0, hw * 0.55), at(-hh * 0.55, 0), at(0, -hw * 0.55)]; polyW(d, GOLD, 7);
      const m = at(0, 0); px(m[0], m[1], dim ? REDD : RED, 2);
    }
  }
  function backFan() {   // 背后扇形张开的一把大牌：平时是牌背，第二阶段全翻成正面、金边亮
    const n = P.hot ? 9 : 7, spread = (0.2 + 0.13 * P.bf) * (7 / n) * 1.1, a0 = -1.95 - P.lean * 0.4, p = L.fanP, face = P.hot || (MV === 'p2' && P.st === CAST);
    for (let i = 0; i < n; i++) { let a = a0 + (i - (n - 1) / 2) * spread, dd = 28 * S;
      let c = [p[0] + Math.cos(a) * dd, p[1] + Math.sin(a) * dd];
      if (P.fall) { const s = ((i * 37) % 11) / 11 - 0.5; c = [c[0] + s * 36 * P.fall, c[1] + (30 + 16 * Math.abs(s)) * P.fall]; a += s * 2.6 * P.fall; }
      card(c, a, 13, 20, face, face ? (P.glow >= 3 ? 2 : 1) : 0, i * 3 + 1, i & 1); }
  }
  function torso() {
    part(); torsoXf();   // 衬衫（整块）
    Bp([[-12, 8], [13, 8], [14, -10], [18, -28], [22, -41], [14, -49], [-2, -50], [-16, -48], [-19, -36], [-14, -14]], SHIRT);
    for (const y of [-42, -35, -28]) { Bx(8.5, y, GOLD, 7); Bx(8.5, y + 1, GOLD, 3); }   // 衬衫前襟的金纽
    Bl(5, -44, 6, -24, SHIRT, 3); Bl(11, -44, 11, -24, SHIRT, 4);
    part(); torsoXf();   // 黑马甲：V 领、左片
    Bp([[-12, 8], [8, 8], [8, -20], [3, -44], [-1, -49], [-16, -48], [-19, -36], [-14, -14]], VEST);
    Bl(8, -20, 3, -44, VEST, 8); Bl(7, -20, 2, -43, VEST, 7);           // V 领的缎面亮边
    Bl(-12, -16, -3, -15, VEST, 3); Bl(-12, -17, -3, -16, VEST, 7);      // 口袋
    for (const [x0, y0] of [[-13, -40], [-7, -30], [-11, -22]]) Bl(x0, y0, x0 + 2, y0 + 10, VEST, 3);   // 褶
    Bl(-16, -45, -18, -34, VEST, 7); Bl(-18, -35, -13, -14, VEST, 6);                                        // 受光的背缘
    part(); torsoXf();   // 右片
    Bp([[9, 8], [13, 8], [14, -10], [18, -28], [21, -40], [15, -46], [9, -20]], VEST); Bl(9, -20, 15, -45, VEST, 8);
    part(); torsoXf(); for (const y of [-16, -10, -4]) { Be(8.5, y, 1.5, 1.4, 0, GOLD); Bx(8, y - 0.5, GOLD, 8); }   // 马甲的金扣
    const w = [[9, -10], [12, -12], [15, -13], [17, -11], [18, -8]]; for (let i = 1; i < w.length; i++) Bl(w[i - 1][0], w[i - 1][1], w[i][0], w[i][1], GOLD, 7);   // 怀表链
    part(); torsoXf(); Be(18, -7, 2, 2.2, 0, GOLD); Bx(17.5, -7.5, GOLD, 8);
    // 胸前口袋里露出一张 A
    torsoXf(); card(Ba(-8, -36), -1.35 - P.lean, 5, 7, 1, 0, 0);
    part(); torsoXf();   // 翼领 + 红领结
    Bp([[-1, -52], [4, -51], [6, -47], [1, -48]], SHIRT, 7); Bp([[16, -52], [11, -51], [10, -47], [15, -48]], SHIRT, 7);
    part(); torsoXf(); Bp([[8.5, -49], [1, -54], [-0.5, -48.5], [1, -44]], RED); Bp([[8.5, -49], [16, -54], [17.5, -48.5], [16, -44]], RED);
    Bl(3, -52, 3, -46, RED, 3); Bl(14, -52, 14, -46, RED, 3); Bl(2, -52, 6, -50, RED, 8);
    part(); torsoXf(); Be(8.5, -49, 2.2, 2.6, 0, RED); Bx(8, -50, RED, 8);
  }
  function table() {   // 身前的牌桌：绒布、包皮的桌沿、铜边、筹码堆、摊开的牌
    part(); B.reset(); Bp([[-72, -3], [72, -3], [72, 1], [-72, 1]], FELT); for (let x = -70; x < 70; x += 6) Bx(x, -2, FELT, 6);
    part(); Bp([[-70, 0], [70, 0], [72, 3], [72, 9], [-72, 9], [-72, 3]], LEATH); Bl(-70, 1, 70, 1, LEATH, 8); Bl(-71, 5, 71, 5, LEATH, 3);
    part(); Bl(-71, 0, 71, 0, GOLD, 6); for (let x = -64; x <= 64; x += 8) { Bx(x, 3, GOLD, 7); Bx(x, 7, GOLD, 4); }
    for (const [x0, n] of [[-46, 5], [-38, 3], [42, 4], [34, 2]]) for (let i = 0; i < n; i++) {   // 筹码堆：红金相间，边上一圈白点
      part(); B.reset(); const y = -3.5 - i * 1.8, m = (i + n) & 1 ? RED : GOLD; Be(x0, y, 4, 1.6, 0, m); Bx(x0 - 3, y, CARD, 7); Bx(x0, y + 0.5, CARD, 7); Bx(x0 + 3, y, CARD, 7); if (i === n - 1) Be(x0, y - 0.6, 2, 0.8, 0, m, 8); }
    card(sc(-22, -3), -1.62, 3, 9, 1, 0, 1); card(sc(-16, -3.5), -1.4, 3, 9, 1, 0, 2);
  }
  function arm(side) {   // 白衬衫袖：上臂一道红袖箍 + 铜扣，袖口一道硬挺的白边和金袖扣
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? SHIRTD : SHIRT, r = far ? REDD : RED;
    part(); capW(sh[0], sh[1], el[0], el[1], 5.6 * S, 4.8 * S, m); const mid = [sh[0] + (el[0] - sh[0]) * 0.3, sh[1] + (el[1] - sh[1]) * 0.3]; dot(mid[0] - 1, mid[1] - 2, 2.4, m, 7);
    const g0 = [sh[0] + (el[0] - sh[0]) * 0.52, sh[1] + (el[1] - sh[1]) * 0.52], g1 = [sh[0] + (el[0] - sh[0]) * 0.66, sh[1] + (el[1] - sh[1]) * 0.66];
    part(); capW(g0[0], g0[1], g1[0], g1[1], 5.6 * S, 5.4 * S, r); lnW(g0[0], g0[1], g1[0], g1[1], r, 8); dot((g0[0] + g1[0]) / 2 + 1, (g0[1] + g1[1]) / 2, 1.3, GOLD, far ? 4 : 7);
    const cf = [el[0] + (h[0] - el[0]) * 0.7, el[1] + (h[1] - el[1]) * 0.7];
    part(); capW(el[0], el[1], cf[0], cf[1], 4.8 * S, 4.4 * S, m); lnW(el[0], el[1], cf[0], cf[1], m, 3);
    part(); const c2 = [el[0] + (h[0] - el[0]) * 0.86, el[1] + (h[1] - el[1]) * 0.86]; capW(cf[0], cf[1], c2[0], c2[1], 4.4 * S, 4.4 * S, m, far ? 5 : 7); dot(c2[0], c2[1], 1.1, GOLD, 7);
  }
  function hand(side) {   // 苍白、细长的手指
    const far = side < 0, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? SKIND : SKIN;
    const dir = P.slap ? 0.25 : Math.atan2(h[1] - el[1], h[0] - el[0]), hold = !far && !P.slap && !P.grip;
    part(); dot(h[0], h[1], P.slap ? 4.2 : 4, m);
    if (P.slap) { for (let i = 0; i < 4; i++) { const a = dir + (i - 1.5) * 0.28, t = [h[0] + Math.cos(a) * 10, h[1] + Math.sin(a) * 4 + 1]; capW(h[0] + 1, h[1] + 1, t[0], t[1], 1.5, 1.1, m, i === 0 ? 7 : 5); }   // 掌心朝下、五指张开
      const th = [h[0] - 2, h[1] + 4]; capW(h[0], h[1], th[0], th[1], 1.3, 1, m); return; }
    const fl = hold ? 4 : P.grip ? 5 : 8, bend = hold ? 1.1 : P.grip ? 1.4 : 0.35;
    for (let i = 0; i < 4; i++) { const a = dir + (i - 1.5) * 0.32, r0 = [h[0] + Math.cos(a) * 3.3, h[1] + Math.sin(a) * 3.3], tip = [r0[0] + Math.cos(a + bend * side) * fl, r0[1] + Math.sin(a + bend * side) * fl];
      capW(r0[0], r0[1], tip[0], tip[1], 1.3, 0.8, m, i === 0 ? 7 : 5); px(r0[0], r0[1], m, 8); }
    const th = [h[0] + Math.cos(dir - 1.4 * side) * 4.5, h[1] + Math.sin(dir - 1.4 * side) * 4.5]; capW(h[0], h[1], th[0], th[1], 1.2, 0.9, m);
  }
  function deck(h, far) {   // 远手扣着的一副牌
    const c = [h[0] + 2, h[1] - 2]; part(); B.reset(); polyW([[c[0] - 4, c[1] - 3], [c[0] + 4, c[1] - 4], [c[0] + 5, c[1] + 1], [c[0] - 3, c[1] + 2]], far ? REDD : RED);
    lnW(c[0] - 3, c[1] + 1, c[0] + 4, c[1], CARD, 6); lnW(c[0] - 3, c[1] + 2, c[0] + 4, c[1] + 1, CARD, 4); px(c[0] + 0.5, c[1] - 1.5, GOLD, 7);
  }
  function handFan() {   // 近手一直扇着的一手牌
    const h = L.hN;
    if (P.blade) { const a = P.fa; card([h[0] + Math.cos(a) * 10, h[1] + Math.sin(a) * 10], a, 7, 13, 1, P.blade >= 2 ? 3 : P.cg ? 2 : 0, 0); return; }   // 重击：一张黑桃 A 当刀
    const n = P.fly ? 2 : P.fly1 ? 4 : 5, sp = 0.3 * P.fo;
    for (let i = 0; i < n; i++) { const a = P.fa + (i - (n - 1) / 2) * sp; card([h[0] + Math.cos(a) * 8, h[1] + Math.sin(a) * 8], a, 7, 11, 1, P.cg ? Math.min(3, P.cg) : 0, i + 1, 0); }
  }
  function bridge() {   // 洗牌：两手之间的一道牌桥，牌一张张瀑布一样落过去
    const a = [L.hF[0] + 3, L.hF[1] - 3], b = [L.hN[0] - 3, L.hN[1] - 3], c = [(a[0] + b[0]) / 2, Math.min(a[1], b[1]) - 26], n = 8;
    for (const e of [a, b]) { part(); B.reset(); polyW([[e[0] - 4, e[1] - 2], [e[0] + 4, e[1] - 2], [e[0] + 4, e[1] + 3], [e[0] - 4, e[1] + 3]], RED); lnW(e[0] - 3, e[1] + 1, e[0] + 3, e[1] + 1, CARD, 6); }
    for (let i = 0; i < n; i++) { const s = ((i + P.bridge * 0.5) / n) % 1, u = 1 - s, p = [u * u * a[0] + 2 * u * s * c[0] + s * s * b[0], u * u * a[1] + 2 * u * s * c[1] + s * s * b[1]];
      const tx = 2 * u * (c[0] - a[0]) + 2 * s * (b[0] - c[0]), ty = 2 * u * (c[1] - a[1]) + 2 * s * (b[1] - c[1]); card(p, Math.atan2(ty, tx) - Math.PI / 2, 5, 8, i & 1, P.cg >= 2 ? (P.cg >= 3 ? 2 : 1) : 0, i, 0); }
  }
  function cardRing(front) {   // 洗牌出手 / 第二阶段：一圈牌绕着他转成龙卷
    const c = L.core, R = P.ringR * S, n = 10;
    for (let i = 0; i < n; i++) { const a = i / n * 6.2832 + P.tail * 0.2, s = Math.sin(a); if ((s > 0) !== front) continue;
      const p = [c[0] + Math.cos(a) * R, c[1] - 8 + s * R * 0.42]; card(p, a + 1.2, 6, 9, (i & 1) || P.hot, front ? 2 : 1, i, !front); }
  }
  function flyCards() {   // 发牌：五张牌从手里旋转着往高处飞出去；普攻：一张牌平着飞出去
    const h = L.hN;
    if (P.fly) for (let j = 0; j < 5; j++) { const a = -0.62 - (j - 2) * 0.14, d = 12 + 66 * P.fly + j * 4; card([h[0] + Math.cos(a) * d, h[1] + Math.sin(a) * d], P.fly * 9 + j * 1.3, 6, 10, j & 1, j < 2 ? 3 : 2, j + 2, 0);
      if (P.fly < 0.5) { const t0 = [h[0] + Math.cos(a) * (d - 8), h[1] + Math.sin(a) * (d - 8)]; part(); B.reset(); lnW(t0[0], t0[1], h[0] + Math.cos(a) * (d - 3), h[1] + Math.sin(a) * (d - 3), G1); } }
    if (P.fly1) { const d = 10 + 48 * P.fly1; card([h[0] + d, h[1] - 3 + d * 0.05], P.fly1 * 12, 6, 10, 1, 3, 0, 0); part(); B.reset(); lnW(h[0] + d - 12, h[1] - 3, h[0] + d - 5, h[1] - 3, G2); }
  }
  function chipsPush() {   // 全押：两手前面推着两堆筹码
    for (const [h, n] of [[L.hN, P.push >= 2 ? 6 : 4], [L.hF, 4]]) for (let i = 0; i < n; i++) { part(); B.reset(); const x = h[0] + 9, y = h[1] + 5 - i * 2, m = i & 1 ? RED : GOLD; B.ell(E, x, y, 4.8, 1.9, 0, m); px(x - 3, y, CARD, 7); px(x + 2, y + 0.5, CARD, 7); }
  }
  function coin() {   // 全押的金币：顶在拇指上越来越亮，弹出去以后打着转往上飞
    const c = L.coin, r = P.coin >= 2 ? 5 : 3.6, spin = P.coin === 3 ? Math.max(0.8, Math.abs(Math.cos(P.tail * 0.9 + P.cf * 7)) * r) : r;
    if (P.coin === 3) { part(); B.reset(); const a = [L.hN[0] + 3, L.hN[1] - 7], n = Math.max(2, Math.round(Math.hypot(c[0] - a[0], c[1] - a[1]) / 3.5)); for (let i = 1; i < n; i++) { const q = i / n; px(a[0] + (c[0] - a[0]) * q + ((i & 1) ? 1 : -1), a[1] + (c[1] - a[1]) * q, q > 0.6 ? G2 : G1); } }   // 金币弹出去的一串金点
    if (P.coin >= 2) { part(); B.reset(); B.ell(E, c[0], c[1], spin + 1.5, r + 1.5, 0, G1); }
    part(); B.reset(); B.ell(E, c[0], c[1], spin, r, 0, P.coin >= 2 ? G2 : GOLD); if (spin > 2) { B.ell(E, c[0], c[1], spin - 1.4, r - 1.4, 0, P.coin >= 2 ? G3 : GOLD, 7); px(c[0] - 1, c[1] - 1, G3); px(c[0] + 0.5, c[1] + 0.5, P.coin >= 2 ? G2 : GOLD, 3); }
  }
  function head() {   // 油亮的黑背头、长脸、帽檐影子里的两点金光、一撇细胡子、咧到颧骨的笑
    const J = P.jaw; hsc = HS;
    part(); headXf(); Bc(6, -50, 8, -58, 3.6, 3.4, SKIN); Bl(4, -55, 11, -56, SKIN, 3); Bl(9, -51, 10, -57, SKIN, 7);   // 脖子
    part(); headXf(); Be(6, -71, 11.5, 11, 0, HAIR);                                             // 后脑勺：往后梳得贴头皮的头发
    Bp([[-5, -68], [-7, -62], [-1, -60], [1, -64]], HAIR);
    for (const [x0, y0, x1, y1, t] of [[-3, -78, 7, -81.5, 9], [-5, -73, 2, -79, 8], [-5, -68, -2, -74, 8], [0, -76, 9, -79, 7], [3, -80.5, 12, -80, 8]]) Bl(x0, y0, x1, y1, HAIR, t);   // 发油的亮光
    Bl(-6, -70, 1, -80, HAIR, 3); Bl(-2, -67, 4, -77, HAIR, 3);
    part(); headXf(); Be(2.5, -64, 2.3, 3.3, 0, SKIN); Bx(2.5, -64, SKIN, 3); Bx(1.8, -65.5, SKIN, 7);   // 耳朵
    part(); headXf();
    Bp([[4, -73], [19, -74], [22, -68], [27.5, -62.5], [24, -61], [25, -57], [22, -54], [17.5, -51], [12, -53], [7, -57], [4, -63]], SKIN);   // 长脸、尖下巴
    Bp([[3, -71], [7, -71], [6.5, -61], [4, -62]], HAIR);                                     // 鬓角
    Bl(20, -61, 23, -55.5, SKIN, 3); Bl(9, -60, 12, -54, SKIN, 3);                           // 笑出来的法令纹
    Bl(12, -62.5, 17, -62, SKIN, 7); Bl(13, -54, 17, -52.5, SKIN, 7); Bx(18, -52, SKIN, 8);   // 颧骨、下巴的光
    Be(16, -68.5, 9, 3, 0, SKIN, 1);                                                             // 帽檐压下来的影子
    Be(11, -66.5, 2, 1.3, 0, VOIDM); Be(18.5, -67, 2.8, 1.7, 0, VOIDM);                   // 影子里的眼窝
    if (P.eyes) { Bx(11, -66.5, P.eyes >= 2 ? G2 : G1); Be(18.8, -67, 1.8, 0.9, 0, G2); Bx(19.2, -67, P.eyes >= 2 ? G3 : G2); }
    if (P.eyes >= 2) { Bx(16.5, -67.5, G1); Bx(21.5, -67.5, G1); if (P.hot) { Bx(22.5, -68, G2); Bx(23.5, -68.5, G1); Bx(9, -67, G1); } }   // 眼角拖出来的光
    Bp([[20, -67.5], [28, -61.8], [23, -61]], SKIN); Bl(21, -66.5, 26.5, -62.5, SKIN, 8); Bx(23.5, -61.3, SKIN, 2);   // 细长的鼻子
    // 笑：固定咧着的一排白牙，嘴角翘到颧骨；第二阶段一直咧到耳根
    const wide = P.hot ? 2 : 0, ml = 14 - wide * 2, mr = 26.5, o = J >= 2 ? J * 0.9 : J * 0.4;
    Bp([[ml, -59], [mr, -60], [mr - 1, -56.2 + o], [ml + 2, -55.8 + o]], VOIDM);                               // 嘴里的黑
    Bp([[ml + 0.8, -59], [mr - 0.4, -59.9], [mr - 1, -58], [ml + 1.4, -57.3]], CARD, 8); Bl(ml + 1.5, -57.5, mr - 1, -58.2, CARD, 5);   // 上牙
    for (const x of [17, 19.5, 22, 24.5]) Bl(x, -58.6, x, -57.6, CARD, 2);                                     // 牙缝
    if (o >= 1) { Bp([[ml + 2.5, -56.2 + o], [mr - 1.5, -56.6 + o], [mr - 1.8, -57.6 + o], [ml + 2.8, -57.2 + o]], CARD, 7); if (J >= 3 && P.glow >= 3) Bx(20, -56.8 + o * 0.5, G1); }   // 下牙；大笑时喉咙里一点金光
    Bl(ml, -59, ml - 1.6, -61.2, VOIDM); Bl(mr, -60, mr + 1.4, -62.4, VOIDM);                                 // 往上翘的嘴角
    if (P.hot) { Bl(ml - 1.6, -61.2, ml - 4, -63.5, VOIDM); Bl(mr + 1.4, -62.4, mr + 2.4, -64, VOIDM); }
    Bp([[16.5, -61.2], [21, -62.4], [26, -62.2], [27, -61], [21, -60.8]], HAIR, 2); Bl(27, -61, 28.6, -63.2, HAIR, 2); Bl(16.5, -61.2, 15, -63, HAIR, 2); Bl(18, -61.8, 25, -62, HAIR, 7);   // 一撇细胡子，两头往上翘
    if (P.glint) { Bx(22, -58.6, G3); Bx(22, -59.8, G2); Bx(23.2, -58.6, G2); Bx(20.8, -58.6, G2); }        // 牙上一闪
  }
  function visor() {   // 遮光帽：一圈绿带箍在额头上，前面一片宽得夸张、往下斜压的半透明绿帽檐
    hsc = HS; const lit = P.hot || P.glow >= 3;
    part(); visXf(); Bp([[-5, -69], [-1, -74], [8, -76.5], [18, -77], [18, -74], [8, -73.5], [-1, -71], [-4, -67]], VISOR, 4);   // 帽带（绕到后脑勺）
    Bl(-2, -72, 16, -75.5, VISOR, 7);
    part(); visXf();
    Bp([[6, -76], [16, -78], [28, -76.5], [38, -71.5], [42, -67.5], [37, -66.2], [27, -68.4], [16, -70.6], [8, -72]], VISOR);
    Bl(8, -72, 16, -70.6, VISOR, 3); Bl(16, -70.6, 27, -68.4, VISOR, 3); Bl(27, -68.4, 37, -66.2, VISOR, 3); Bl(37, -66.2, 42, -67.5, VISOR, 2);   // 帽檐的包边
    Bl(16, -77, 28, -75.6, lit ? VGL : VISOR, lit ? 0 : 9); Bl(29, -75.2, 37.5, -70.8, VISOR, 8); Bl(14, -74.6, 32, -72, VISOR, 6); Bl(18, -73, 35, -69.4, VISOR, 7);   // 半透明的反光
    for (const [x, y] of [[12, -71.4], [18, -70.2], [24, -69], [30, -67.6], [36, -66.4]]) Bx(x, y - 0.8, VISOR, 3);   // 包边的针脚
    if (lit) { Bl(10, -72.8, 36, -67.4, VGL); if (P.hot) { Bl(37, -67, 41, -68, VGL); Bl(20, -76.4, 30, -75, VGL); } }
    part(); visXf(); Be(4, -73, 2, 2, 0, GOLD); Bx(3.4, -73.7, GOLD, 8);   // 帽带侧面的铜扣
    hsc = 1;
  }
  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    backFan(); if (P.ringR) cardRing(false);
    arm(-1); hand(-1); if (P.deck && !P.grip && !P.slap) deck(L.hF, 1);
    torso(); head(); visor();
    table(); if (P.push) chipsPush();
    arm(1); hand(1);
    if (P.blade || (!P.bridge && !P.grip && !P.slap && !P.coin && !P.push)) handFan();
    if (P.bridge) bridge(); if (P.fly || P.fly1) flyCards(); if (P.coin) coin(); if (P.ringR) cardRing(true);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const X = (p) => p[0] * z + spr.ox, Y = (p) => p[1] * z + spr.oy;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = X(L.head); RIM.ry = Y(L.head); RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = X(L.eye); LIGHTS[0].y = Y(L.eye); LIGHTS[0].r = (P.eyes >= 2 ? (P.hot ? 10 : 8) : P.eyes ? 5 : 0) * z;             // 眼里的金光照亮帽檐底和鼻梁
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 16 * z; LIGHTS[1].r = 58 * z;                                                         // 绿绒反上来的光
    const lp = [P.fcx, P.fcy], lr = P.coin ? 8 + P.coin * 4 : P.bridge ? 8 + P.cg * 4 : P.slap ? P.cg * 5 : P.cg ? 5 + P.cg * 3 : P.ringR ? 16 : 0;
    LIGHTS[2].x = X(lp); LIGHTS[2].y = Y(lp); LIGHTS[2].r = lr * z;
    LIGHTS[3].x = X(L.visor); LIGHTS[3].y = Y(L.visor) + 4 * z; LIGHTS[3].r = (P.dq ? 0 : P.hot ? 9 : P.glow >= 3 ? 7 : 0) * z; LIGHTS[3].k = 0.6;   // 帽檐亮起来时透下来的绿光（只照帽檐底下的鼻梁，不压眼睛的金光）
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连帽檐）
  function portrait() {   // 立绘：正面、帽檐绿光压在眼上、两点金光、一手牌扇在脸边、咧嘴（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.35); P.nx = 36; P.ny = -52; P.fa = -1.15; P.fo = 1.1; P.hd = 0.04; P.lean = 0.02; P.jaw = 1; P.eyes = 2; P.glow = 3; P.hot = 1; P.cg = 1; P.bf = 1.3;
    P.by = 0; P.breath = 0; P.tail = 2; P.glint = 1; P.deck = 1; P.fx2 = -32; P.fy2 = -30;
    P.k1 = (P.k1 + 7) >>> 0; geo(); P.gx = P.fcx; P.gy = P.fcy; drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; hsc = HS; headXf(); const c = Ba(16, -70); hsc = 1; B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 38 * 2]; return PSPR;
  }

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, rfT = 0;
  function cardSpray(x, y, n, vx0, vx1, vy0, vy1) { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 8, y, vx0 + Math.random() * (vx1 - vx0), vy0 + Math.random() * (vy1 - vy0), 0.8 + Math.random() * 0.5, i % 3 ? FXI.coin : FXI.enemy, { g: 240, floor: HY + 4 }); }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'shuffle') { const c = L.core; ring(sx(c[0]), sy(c[1]), 1, FXI.coin); ring(sx(c[0]), sy(c[1]), 0, FXI.coin); fx.circle(sx(2), HY - 1, 46, 9, 'coin', 0.7, 2, 0);
        burst(sx(c[0]), sy(c[1]), 26, 50, 150, 0.35, 0.7, FXI.coin, 10); shake(0.3, 3); flash(0.08); sfx('boss', { k: 'croupierRiffle', w: 1 }); sfx('boss', { k: 'croupierFlick', w: 1 }); }
      else if (MV === 'dealCards') { const h = L.hN; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 40, -0.9, 1.1, 'coin', 0.25, 3, 2); cardSpray(sx(h[0]), sy(h[1]), 16, 40, 170, -260, -140);
        burst(sx(h[0]), sy(h[1]), 16, 60, 160, 0.25, 0.5, FXI.coin, 20); shake(0.3, 3); flash(0.06); sfx('boss', { k: 'croupierFlick', w: 1 }); sfx('boss', { k: 'throw', w: 0.8 }); }
      else if (MV === 'slapTable') { const x = sx((L.slapN[0] + L.slapF[0]) / 2), y = HY;
        fx.wave(x, y, 1, 44, 8, 'coin', 0.5, 2); fx.wave(x, y, -1, 34, 6, 'nature', 0.45, 2); ring(x, HY - 2, 1, FXI.coin); ring(sx(L.slapN[0]), sy(L.slapN[1]), 0, FXI.coin);
        cardSpray(x, y - 3, 22, -150, 150, -220, -80); burst(x, y - 2, 22, 60, 170, 0.3, 0.6, FXI.coin, 50); shake(0.4, 3); flash(0.1);
        sfx('boss', { k: 'croupierSlap', w: 1 }); sfx('boss', { k: 'slam', w: 0.7 }); sfx('boss', { k: 'croupierChips', w: 1 }); }
      else if (MV === 'allIn') { const c = L.coin; fx.pillar(sx(c[0]), 0, sy(c[1]), 5, 'coin', 0.35); fx.cross(sx(c[0]), sy(c[1]), 16, 'coin', 0.3, 2); ring(sx(c[0]), sy(c[1]), 1, FXI.coin);
        for (let i = 0; i < 18; i++) spawn(K_RISE, sx(c[0] + (Math.random() - 0.5) * 14), sy(c[1] + Math.random() * 10), (Math.random() - 0.5) * 30, -120 - Math.random() * 120, 0.5 + Math.random() * 0.3, FXI.coin);
        shake(0.3, 3); flash(0.12); sfx('boss', { k: 'croupierCoin', w: 1 }); sfx('boss', { k: 'croupierLaugh', w: 0.7 }); }
      else if (MV === 'poke') { const t = L.fanTip; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 34, 0.9, 1.9, 'coin', 0.2, 2, 2); burst(sx(t[0] + 6), sy(t[1]), 14, 50, 150, 0.2, 0.4, FXI.coin, 0); shake(0.25, 3); flash(0.05);
        sfx('boss', { k: 'croupierFlick', w: 1 }); sfx('hit', { mat: 'metal', w: 0.8 }); }
      else if (MV === 'rise' || MV === 'p2') { const c = L.fanP, e = L.head; ring(sx(c[0]), sy(c[1]), 1, FXI.coin); ring(sx(e[0]), sy(e[1]), 0, MV === 'p2' ? FXI.nature : FXI.coin); flash(0.12); shake(0.4, 3);
        cardSpray(sx(c[0]), sy(c[1] - 10), 26, -170, 170, -230, -60); fx.cross(sx(L.eye[0]), sy(L.eye[1]), 12, 'coin', 0.3, 2);
        sfx('boss', { k: 'croupierLaugh', w: 1 }); sfx('boss', { k: 'roar', w: 0.6 }); if (MV === 'p2') sfx('boss', { k: 'croupierChips', w: 1 }); }
    }
    if (s === CHARGE) { rfT = 0;
      if (MV === 'shuffle') sfx('boss', { k: 'croupierRiffle', w: 0.6, dur: E.DUR[CHARGE] });
      else if (MV === 'dealCards' || MV === 'poke') sfx('boss', { k: 'croupierFan', w: MV === 'poke' ? 0.5 : 1 });
      else if (MV === 'slapTable') sfx('boss', { k: 'croupierLaugh', w: 0.5 });
      else if (MV === 'allIn') sfx('boss', { k: 'croupierChips', w: 1 });
      else if (MV === 'rise') { sfx('boss', { k: 'lavaRise', w: 0.6 }); sfx('boss', { k: 'croupierChips', w: 0.5 }); }
      else if (MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 }); }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'croupierFan', w: 0.4 });
    if (s === ATTACK && t === 3 / 12) { const h = L.hN; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 34, 0.3, 1.5, 'coin', 0.2, 2, 2); burst(sx(h[0] + 10), sy(h[1]), 12, 50, 140, 0.25, 0.5, FXI.coin, 20); hitDummy(1, 1); shake(0.15, 2);
      sfx('boss', { k: 'croupierFlick', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 0.8 }); }
    if (s === HURT && t === INCOMING) sfx('boss', { k: 'croupierChips', w: 0.3 });
    if (s === RECOVER && t === 0.25 && MV === 'shuffle') ring(sx(L.core[0]), sy(L.core[1]), 0, FXI.coin);
    if (s === RECOVER && t === 0.25 && MV === 'allIn') { const c = L.coin; burst(sx(c[0]), sy(c[1] - 20), 20, 40, 120, 0.3, 0.6, FXI.coin, 30); sfx('boss', { k: 'croupierCoin', w: 0.5 }); }
    if (s === CHARGE && MV === 'allIn' && Math.abs(t - E.DUR[CHARGE] * 0.45) < 0.02) { sfx('boss', { k: 'croupierCoin', w: 0.35 }); }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'croupierDie', w: 1 });
    if (s === DEATH && t === INCOMING + 0.4) { const c = L.fanP; cardSpray(sx(c[0]), sy(c[1] - 16), 30, -160, 160, -200, -40); sfx('boss', { k: 'croupierRiffle', w: 0.8 }); }
    if (s === DEATH && t === INCOMING + 1.2) { const x = sx(30); ring(x, HY - 2, 1, FXI.coin); fx.wave(x, HY, 1, 36, 5, 'nature', 0.5, 2); fx.wave(x, HY, -1, 36, 5, 'nature', 0.5, 2); cardSpray(x, HY - 4, 20, -140, 140, -160, -40); shake(0.35, 3); flash(0.08);
      sfx('boss', { k: 'croupierSlap', w: 0.8 }); sfx('fall', { w: 1 }); sfx('boss', { k: 'croupierChips', w: 0.8 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 44; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), sy(-4 - Math.random() * 44), 0, -14 - Math.random() * 22, 0.9 + Math.random() * 0.8, i % 3 ? FXI.coin : FXI.nature); sfx('boss', { k: 'sink', w: 0.8 }); sfx('boss', { k: 'fade', w: 0.6 }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [0.25], [INCOMING], [INCOMING + 0.05, INCOMING + 0.4, INCOMING + 1.2, INCOMING + 1.9], []];
  const spiral = (c, r0, r1, n) => { const a = Math.random() * 6.2832, r = r0 + Math.random() * (r1 - r0); spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, n, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); };
  function stepFX(dt, state, stT) {
    emT += dt;
    if (emT > (P.hot ? 0.07 : 0.15)) { emT = 0;   // 身边一直飘的金色碎光（第二阶段更密，混进从牌扇上掉下来的金边）
      if (P.hot && Math.random() < 0.5) spawn(K_EMBER, sx(L.fanP[0] - 30 + Math.random() * 50), sy(L.fanP[1] - 20 - Math.random() * 20), (Math.random() - 0.5) * 10, -10 - Math.random() * 12, 0.6 + Math.random() * 0.5, FXI.coin);
      else spawn(K_RISE, sx(-40 + Math.random() * 80), sy(-2 - Math.random() * 8), (Math.random() - 0.5) * 8, -6 - Math.random() * 6, 1.0 + Math.random() * 0.8, Math.random() < 0.6 ? FXI.nature : FXI.coin); }
    if (state === CHARGE && MV === 'shuffle') { if (Math.random() < 0.6) spiral(L.bridge, 10, 20, FXI.coin); rfT += dt; if (rfT > 0.1) { rfT = 0; spawn(K_EMBER, sx(L.bridge[0] + (Math.random() - 0.5) * 16), sy(L.bridge[1] + 4), 0, -10, 0.4, FXI.coin); } }
    if (state === CHARGE && MV === 'dealCards' && Math.random() < 0.6) spiral(L.fanTip, 8, 18, FXI.coin);
    if (state === CHARGE && MV === 'slapTable' && P.cg && Math.random() < 0.6) spiral(Math.random() < 0.5 ? L.hN : L.hF, 8, 16, FXI.coin);
    if (state === CHARGE && MV === 'allIn' && P.coin && Math.random() < 0.7) spiral(L.coin, 10, 20, FXI.coin);
    if (state === CHARGE && MV === 'allIn' && P.push && Math.random() < 0.4) spawnX(K_PHYS, sx(L.hN[0] + 8), sy(L.hN[1] + 2), 20 + Math.random() * 40, -40 - Math.random() * 40, 0.5, FXI.coin, { g: 260, floor: HY + 4 });
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.3) { const b = L.fanTip; spawn(K_EMBER, sx(b[0] + (Math.random() - 0.5) * 6), sy(b[1]), 0, -10, 0.4, FXI.coin); }
    if (state === CHARGE && MV === 'p2' && Math.random() < 0.4) spiral(L.head, 14, 26, FXI.nature);
    if ((state === CHARGE && MV === 'rise') || state === MOVE) { if (Math.random() < 0.5) spawnX(K_PHYS, sx(-30 + Math.random() * 70), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, Math.random() < 0.5 ? FXI.nature : FXI.coin, { g: 240, floor: HY + 4 }); }
  }
  function fxReset() { emT = 0; rfT = 0; }
  function fxBack(f12) { const x0 = sx(-48), x1 = sx(48); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x + (f12 >> 1)) % 4) === 0) E.put(x, HY + 1, FXR[FXI.nature][P.hot ? 2 : 3]); }   // 脚下一线绿绒的反光
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'shuffle'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    croupierRiffle: (s, t, w, p) => { const n = 10 + Math.round(8 * w); for (let i = 0; i < n; i++) s.nz(t + i * 0.035, 0.018, 'highpass', 3600 + (i % 3) * 500, 1.2, 0.04 + 0.03 * w, { pan: p }); s.nz(t + n * 0.035, 0.06, 'bandpass', 1800, 1, 0.06 * w, { pan: p }); },
    croupierFlick: (s, t, w, p) => { s.nz(t, 0.02, 'highpass', 5000, 0.8, 0.1 * w, { pan: p }); s.whoosh(t + 0.01, 0.22, 2400, 600, 0.07 + 0.05 * w, { pan: p }); s.blip(t + 0.02, 1400, 0.03, { pan: p }); },
    croupierFan: (s, t, w, p) => { for (let i = 0; i < 5; i++) s.nz(t + i * 0.05, 0.03, 'bandpass', 2600 + i * 300, 1.5, 0.04 * w, { pan: p }); s.riser(t, t + 1.0, 400, 2000, 0.03 + 0.02 * w, { pan: p }); },
    croupierSlap: (s, t, w, p) => { s.nz(t, 0.05, 'lowpass', 1600, 0.8, 0.22 * w, { pan: p }); s.thud(t, 120, 50, 0.3, 0.26 * w, { pan: p }); s.nz(t + 0.005, 0.03, 'highpass', 2500, 0.7, 0.1 * w, { pan: p }); },
    croupierChips: (s, t, w, p) => { s.coins(t, 5 + Math.round(6 * w), 0.05 + 0.04 * w, { pan: p, gap: 0.035 }); s.nz(t, 0.25, 'bandpass', 3200, 2, 0.03 * w, { pan: p }); },
    croupierCoin: (s, t, w, p) => { s.ring(t, 2093, 0.9, 0.06 + 0.05 * w, { pan: p, rev: 0.5 }); s.ring(t + 0.005, 3136, 0.6, 0.03 * w, { pan: p }); s.blip(t, 1800, 0.05 * w, { pan: p }); s.riser(t, t + 0.4, 800, 3200, 0.03 * w, { pan: p }); },
    croupierLaugh: (s, t, w, p) => { for (let i = 0; i < 4; i++) s.tone(t + i * 0.14, 'sawtooth', 190 - i * 12, 0.11, 0.05 + 0.04 * w, { to: 150 - i * 12, lp: 1200, vib: [7, 12, 0.02], pan: p, rev: 0.4 }); s.choir(t, [50, 57], 0.8, 0.02 * w, { dark: 1, pan: p }); },
    croupierDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 260, 1.4, 0.06 + 0.04 * w, { to: 70, vib: [6, 40, 0.1], lp: 1100, pan: p, rev: 0.6 }); s.coins(t + 0.3, 14, 0.06, { pan: p, gap: 0.06 }); s.choir(t + 0.2, [38, 45], 1.6, 0.04, { dark: 1, pan: p }); },
  };

  return {
    name: '荷官', HX, R_EL: FXI.coin, DUR, hero, P, GLOW_MATS: [G1, G2, G3, VGL], HIT_POINT: [0, -36], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'flesh', how: 'dissolve', pal: 'coin', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['shuffle', 'dealCards', 'slapTable', 'allIn', 'poke', 'rise', 'p2'], MOVE_NAMES: { shuffle: '洗牌', dealCards: '发牌', slapTable: '拍桌', allIn: '全押（第二阶段）', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.4, 1.7, 1.95]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 4 / 12, 8 / 12]],
      [CHARGE, [0.1, 0.5, 1.0], 'shuffle'], [CAST, [1 / 12, 4 / 12], 'shuffle'], [RECOVER, [0.3], 'shuffle'],
      [CHARGE, [0.3, 0.9], 'dealCards'], [CAST, [1 / 12, 3 / 12], 'dealCards'], [RECOVER, [0.3], 'dealCards'],
      [CHARGE, [0.4, 1.0], 'slapTable'], [CAST, [0, 3 / 12], 'slapTable'],
      [CHARGE, [0.3, 0.8, 1.4], 'allIn'], [CAST, [1 / 12, 4 / 12], 'allIn'], [CHARGE, [0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 0.4, 1.9], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.6, 0.9, 1.3, 1.8, 2.2, 2.5]]],
    SINK: 29, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
