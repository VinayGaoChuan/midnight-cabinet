// 溺亡船长（最终首领，第四章「沉没港口」的海面）：照 pcd/run/boss-standard.md §8 做，结构抄 B_demon.js。
// 依据：附录 G「溺亡船长（三角帽、海草胡子、船锚、断桅）· 海水」；K('FB_captain')：沉锚 anchor（蓄力 2 秒砸最前面的一个，锁链拴住）、
// 炮击 cannons（三发落在最前面三个）→ 第二阶段 全速前进 ram（整艘船冲过前排）。
// 设定卡 ——
//   剪影：从海里站起来的上半身（原点 = 海面）。一顶比肩还宽的三角帽（两个上翘的帽角 + 压在眉上的前角、金边、帽前一枚小骷髅徽）
//         占剪影的大头；帽檐阴影里一张泡胀的青灰溺死脸，两只海绿色发光的眼；满脸垂下的海草大胡子（缠着贝壳和一只橙色海星）。
//         手里拄着一只比人还高的铁锚（木横杆、锈斑、藤壶、挂着海草），锚环上拖一条锁链进海里；身后海面上斜插着一根断桅和一片破帆。
//         识别点：三角帽 + 帽檐下两点海绿光 + 大铁锚。和守墓人（兜帽、毒绿、铁锹）、魔王（角、蝠翼）不撞：主色是深海军蓝、黄铜、青灰。
//   主色：深海军蓝的船长大衣（黄铜扣、金穗肩章、暗红背心）、青灰泡胀的皮、橄榄绿海草、锈铁；光色：海绿（眼、第二阶段胸口的溺死之心、
//         藤壶和胡子里的荧光点）+ 炮口的火光。
//   招式（setMove）：anchor 沉锚 · cannons 炮击 · ram 全速前进（第二阶段）· poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 荧光常亮。
//     沉锚：双手把锚扛到肩后、锚爪上聚起海水 → 一锚砸进前面的海里（水浪、水柱、锁链甩出去）。
//     炮击：锚插在海里，一只手高举 → 身后海面浮起三门长满藤壶的炮、引信冒火 → 手往下一劈「开炮」，三门炮依次喷火冒烟、炮弹往天上飞。
//     全速前进：脚下浮起一截幽灵船头（木船身、铜栏、船首像、斜桅、海绿的缝）→ 举拳、锚平端成撞角 → 连船带人往前猛冲，船头推起大浪。
//     重击：锚往后收 → 平着往前捅。普攻：锚从肩后横扫。
//     升起：顺着自己的锚往上爬 → 举锚张臂怒吼。第二阶段：抱住胸口两声心跳 → 仰天长啸、胸口的溺死之心透出海绿的光，全身的藤壶和胡子亮起荧光。
//   待机个性：低头咳出一口海水。死亡：仰天哀嚎、锚倒下 → 瘫软 → 整个人沉回海里，最后只剩那顶三角帽漂在水面上。
PCD.define('B_captain', (E) => {
  const { defDeep, defMat, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY, DRAMP = E.DRAMP, MG = DRAMP.magma;

  // ───── 材质（11 级，暗 → 亮）：主体压暗，海绿的光才亮得出来 ─────
  // 色板有上限：帽子用 obsidian、金饰用 brass、锚用 bladesteel、藤壶和骷髅用 ivory、木头用 hide、背心和海星用 hellhide；自己的只有皮、大衣、海草、锈
  const R_SKIN = ['#07080e', '#10141e', '#1a202c', '#252e3c', '#323c4c', '#404c5c', '#505e6e', '#627082', '#768496', '#8e9cac', '#aebac6'];   // 泡胀的青灰皮
  const R_COAT = ['#03040a', '#070b18', '#0b1226', '#101a34', '#162442', '#1e3052', '#283e64', '#344c76', '#425c88', '#546e9a', '#6a84ae'];   // 深海军蓝大衣
  const R_WEED = ['#040804', '#0a1208', '#121c0c', '#1a2810', '#243414', '#2e4218', '#3a521e', '#486226', '#5a7430', '#70883c', '#8ea04c'];              // 海草
  const R_RUST = ['#0a0604', '#1a0e08', '#2a160c', '#3e1f0e', '#542a12', '#6c3816', '#86481c', '#a25c24', '#bc7430'];                         // 锈
  const SKIN = defDeep(R_SKIN, { depth: 6, amb: 0.14 }), SKIND = defDeep(R_SKIN, { depth: 4, dark: 2, amb: 0.1 });
  const COAT = defDeep(R_COAT, { depth: 8, dark: 1, amb: 0.1 }), COATD = defDeep(R_COAT, { depth: 6, dark: 3, amb: 0.08 });
  const WEED = defDeep(R_WEED, { depth: 3, amb: 0.18 }), WEEDD = defDeep(R_WEED, { depth: 3, dark: 2, amb: 0.1 });
  const HAT = defDeep('stormcoat', { depth: 6, dark: 2, amb: 0.08 }), HATB = defDeep('stormcoat', { depth: 4, dark: 4, amb: 0.06 });
  const BRS = defDeep('brass', { depth: 3, amb: 0.22 }), BRSD = defDeep('brass', { depth: 3, dark: 3, amb: 0.12 });
  const IRON = defDeep('bladesteel', { depth: 4, dark: 3, amb: 0.1 }), IROND = defDeep('bladesteel', { depth: 3, dark: 5, amb: 0.06 }), RUST = defDeep(R_RUST, { depth: 3, amb: 0.16 });
  const BARN = defDeep('ivory', { depth: 2, dark: 1, amb: 0.22 }), LACE = defDeep('ivory', { depth: 4, amb: 0.24 });
  const VEST = defDeep('hellhide', { depth: 5, dark: 4, amb: 0.08 }), STAR = defDeep('hellhide', { depth: 2, amb: 0.4 });
  const WOOD = defDeep('hide', { depth: 5, dark: 1, amb: 0.1 }), WOODD = defDeep('hide', { depth: 4, dark: 3, amb: 0.08 }), SAIL = defDeep('stormcoat', { depth: 4, dark: 3, amb: 0.12 }), CANM = defDeep('bladesteel', { depth: 5, dark: 2, amb: 0.12 });
  const GL1 = defMat(ramp(['#08262c', '#0e5058', '#1a8c90', '#34c4bc']), 1, 1), GL2 = defMat(ramp(['#0e5058', '#1a8c90', '#4ae4d4', '#a8fff0']), 1, 1), GL3 = defMat(ramp(['#1a8c90', '#4ae4d4', '#d4fff8', '#ffffff']), 1, 1);
  const FIRE1 = defMat([MG[3], MG[5], MG[7], MG[8]], 1, 1), FIRE2 = defMat([MG[5], MG[7], MG[8], MG[9]], 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { anchor: { 3: 2.0, 4: 0.5, 5: 0.8 }, cannons: { 3: 1.4, 4: 0.5, 5: 0.7 }, ram: { 3: 1.8, 4: 0.5, 5: 0.8 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'anchor', HOT = 0;   // HOT：第二阶段，胸口的心、藤壶和胡子里的荧光常亮
  const SEAL = ramp(['#a8fff0', '#4ae4d4', '#1a8c90']), SEAB = ramp(['#34c4bc', '#1a8c90', '#0e5058']), FIREL = [MG[8], MG[6], MG[4]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: SEAL, k: 1 }, { x: 0, y: 0, r: 60, ramp: SEAB, k: 0.4 }, { x: 0, y: 0, r: 0, ramp: SEAL, k: 1 }, { x: 0, y: 0, r: 0, ramp: FIREL, k: 1 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.water], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  RIM.skip[GL1] = RIM.skip[GL2] = RIM.skip[GL3] = RIM.skip[FIRE1] = RIM.skip[FIRE2] = 1;

  // 姿势：身体升降 / 前倾、转头、张嘴、两只手、锚（aa 锚杆朝向：0 朝右、π/2 朝下；ah 1 = 握在手里，0 = 插在海里）、
  // two 另一只手也握锚、sw 胡子摆动、can 炮浮起、fire 哪门炮在喷火、prow 船头浮起、pdx 船头前冲、heart 心跳、cough 咳水、hat 帽子还在头上
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'aa', 'ah', 'two', 'fist', 'sw', 'eyes', 'glow', 'hot', 'flash', 'dq', 'can', 'fuse', 'fire', 'prow', 'pdx', 'heart', 'cough', 'hat', 'hfx', 'afall', 'asink', 'orb', 'breath'];
  const A90 = Math.PI / 2;
  const K = {
    idle: { nx: 40, ny: -62, fx2: -26, fy2: -6, lean: 0, hd: 0, aa: A90 },
    heave: { nx: 52, ny: -39, fx2: -40, fy2: -40, lean: -0.2, hd: -0.16, aa: -1.75 },     // 沉锚：锚倒着高举在身侧、锚爪朝天
    heave2: { nx: 50, ny: -40, fx2: -42, fy2: -44, lean: -0.26, hd: -0.22, aa: -1.84 },
    slam: { nx: 52, ny: -30, fx2: -24, fy2: -18, lean: 0.4, hd: 0.28, aa: 0.55 },
    swingW: { nx: 46, ny: -48, fx2: -32, fy2: -14, lean: -0.12, hd: -0.08, aa: -1.9 },     // 普攻：锚提起来 → 横着扫出去
    swing: { nx: 54, ny: -40, fx2: -30, fy2: -14, lean: 0.26, hd: 0.12, aa: 0.12 },
    pokeW: { nx: 16, ny: -44, fx2: -30, fy2: -16, lean: -0.1, hd: 0.05, aa: 0.05 },        // 重击：锚平着收回来 → 往前捅
    poke: { nx: 54, ny: -44, fx2: -28, fy2: -14, lean: 0.34, hd: 0.2, aa: -0.05 },
    cRaise: { nx: 40, ny: -62, fx2: -24, fy2: -68, lean: -0.14, hd: -0.16, aa: A90 },      // 炮击：一只手高举 → 往外一劈
    cFire: { nx: 40, ny: -62, fx2: -52, fy2: -40, lean: 0.06, hd: 0.04, aa: A90 },
    ramW: { nx: 30, ny: -50, fx2: -20, fy2: -64, lean: -0.22, hd: -0.2, aa: 0.2 },         // 全速前进：举拳、锚平端 → 往前冲
    ram: { nx: 58, ny: -42, fx2: 4, fy2: -48, lean: 0.38, hd: 0.26, aa: 0.1 },
    climbA: { nx: 40, ny: -64, fx2: 6, fy2: -60, lean: 0.22, hd: 0.18, aa: A90 },         // 顺着锚往上爬
    climbB: { nx: 40, ny: -42, fx2: -28, fy2: -34, lean: 0.22, hd: 0.18, aa: A90 },
    hunch: { nx: 12, ny: -32, fx2: -4, fy2: -34, lean: 0.32, hd: 0.36, aa: A90 },
    wide: { nx: 50, ny: -62, fx2: -48, fy2: -62, lean: -0.18, hd: -0.34, aa: 1.35 },
    agony: { nx: 34, ny: -78, fx2: -30, fy2: -76, lean: -0.2, hd: -0.4, aa: A90 },
    limp: { nx: 32, ny: -14, fx2: -26, fy2: -14, lean: 0.45, hd: 0.5, aa: A90 },
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'aa'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.hat = 1; P.mx = 0; P.flip = 0; }

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.sw = [0, 1, 1, 0, -1, -1][Math.floor(TT * 2.5) % 6];                                         // 胡子和帽上的海草慢慢摆
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.eyes = (f12 % 9 === 0 || f12 % 13 === 0) ? 1 : 2;
      const lp = tt % DUR[IDLE]; if (lp >= 1.4 && lp < 2.1) { const q = clamp01((lp - 1.4) / 0.15); P.hd = 0.24 * q; P.lean = 0.06 * q; P.jaw = lp < 1.9 ? 2 : 1; P.cough = lp >= 1.5 && lp < 1.9 ? 1 : 0; P.by = lp < 1.6 ? 1 : 0; P.eyes = 1; } };   // 待机个性：低头咳出一口海水
    if (st === IDLE) idle(tq);
    else if (st === MOVE) climb(tq, f12, 0);
    else if (st === ATTACK) {
      P.ah = 1;
      if (tq < 0.17) pose(K.idle, K.swingW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.swingW, K.swingW); P.glow = 2; P.jaw = 1; }
      else if (tq < 0.42) { pose(K.swing, K.swing); P.jaw = 2; P.glow = 3; P.eyes = 2; }
      else pose(K.swing, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { P.hd = -0.3; P.lean = -0.12; P.jaw = 2; P.eyes = 0; P.flash = h < 1 / 12 ? 1 : 0; P.fx2 -= 6; P.fy2 -= 10; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.3 * (1 - q); P.lean = -0.12 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.afall = 0.5 * ease.in(clamp01(d / 0.7)); }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 2 : 1; P.eyes = d < 1.2 ? 2 : 1; P.afall = 0.5 + 0.9 * ease.in(clamp01((d - 0.7) / 0.5)); P.asink = Math.round(30 * clamp01((d - 1.0) / 0.5)); }
      else {   // 沉下去：人和锚沉回海里，帽子漂在水面上
        pose(K.limp, K.limp); P.jaw = 1; P.glow = 0; P.eyes = d < 1.8 ? 1 : 0; P.afall = 1.4; P.asink = 30 + Math.round(40 * clamp01((d - 1.5) / 0.5));
        P.by = Math.round(96 * ease.in(clamp01((d - 1.5) / 0.8))); if (P.by >= 50) { P.hat = 0; P.hfx = Math.round((d - 1.9) * 8); }
        P.dq = d > 2.35 ? Math.round(clamp01((d - 2.35) / 0.45) * 48) / 48 : 0;
      }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = L.heart[0]; P.gy = L.heart[1];
  }
  const MVI = { anchor: 0, cannons: 1, ram: 2, poke: 3, rise: 4, p2: 5 };
  function climb(tq, f12, rise) {   // 两只手交替抓着插在海里的锚杆往上爬
    const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [3, 0, 3, 0][f] + rise; P.glow = 1; P.fist = 1; P.eyes = 1;
  }
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D);
    if (MV === 'anchor') {
      P.ah = 1;
      if (st === CHARGE) {
        if (q < 0.3) { pose(K.idle, K.heave, ease.out(q / 0.3)); }
        else if (q < 0.85) { pose(K.heave, K.heave); P.nx += (f12 & 1) ? 1 : -1; P.by = -(f12 & 1); P.orb = Math.min(3, 1 + Math.floor((q - 0.3) / 0.18)); }
        else { pose(K.heave, K.heave2, ease.out((q - 0.85) / 0.15)); P.jaw = 1; P.orb = 3; P.by = -1; }
        P.glow = q < 0.3 ? 1 : q < 0.7 ? 2 : 3; P.eyes = 2;
      } else if (st === CAST) { pose(K.slam, K.slam); P.by = 4; P.jaw = 3; P.glow = 3; P.eyes = 2; }
      else { const r = ease.inOut(clamp01(tq / 0.65)); pose(K.slam, K.idle, r); P.by = Math.round(4 * (1 - r)); P.jaw = r < 0.4 ? 1 : 0; }
    } else if (MV === 'cannons') {
      if (st === CHARGE) {
        pose(K.idle, K.cRaise, ease.out(clamp01(q / 0.3))); P.can = ease.out(clamp01(q / 0.55)); P.fuse = q > 0.5 ? 1 + (f12 & 1) : 0; P.glow = q < 0.5 ? 1 : 2; P.eyes = 2;
        P.jaw = q > 0.8 ? 1 : 0; if (q > 0.6) P.fy2 += (f12 & 1) ? -1 : 0;
      } else if (st === CAST) { pose(K.cFire, K.cFire); P.can = 1; P.jaw = 3; P.glow = 3; P.eyes = 2; P.fire = tq < 2 / 12 ? 1 : tq < 4 / 12 ? 2 : tq < 6 / 12 ? 3 : 0; P.fuse = 0; }
      else { const r = ease.inOut(clamp01(tq / 0.6)); pose(K.cFire, K.idle, r); P.can = 1 - ease.in(clamp01(tq / 0.6)); }
    } else if (MV === 'ram') {
      P.ah = 1;
      if (st === CHARGE) {
        pose(K.idle, K.ramW, ease.out(clamp01(q / 0.3))); P.prow = ease.out(clamp01(q / 0.4)); P.by = -Math.round(P.prow);
        if (q > 0.4) { P.pdx = (f12 & 2) ? -2 : 0; P.by += (f12 & 2) ? 1 : 0; } P.glow = q < 0.4 ? 1 : 2; P.eyes = 2; P.fist = 1; P.jaw = q > 0.85 ? 2 : 0;
      } else if (st === CAST) { pose(K.ram, K.ram); P.prow = 1; P.pdx = 14; P.by = -4; P.jaw = 3; P.glow = 3; P.eyes = 2; P.fist = 1; }
      else { const r = ease.inOut(clamp01(tq / 0.7)); pose(K.ram, K.idle, r); P.prow = 1 - ease.in(clamp01(tq / 0.7)); P.pdx = Math.round(14 * (1 - r)); P.by = -Math.round(4 * (1 - r)); }
    } else if (MV === 'poke') {
      P.ah = 1;
      if (st === CHARGE) { pose(K.idle, K.pokeW, ease.out(clamp01(q / 0.45))); if (q > 0.5) { P.nx += (f12 & 1) ? 1 : -1; } P.glow = q < 0.5 ? 1 : 2; P.eyes = 2; P.jaw = q > 0.8 ? 1 : 0; }
      else if (st === CAST) { pose(K.poke, K.poke); P.jaw = 2; P.glow = 3; P.eyes = 2; P.by = 2; }
      else pose(K.poke, K.idle, ease.inOut(clamp01(tq / 0.5)));
    } else if (MV === 'rise') {
      if (st === CHARGE) { climb(tq, f12, Math.round(18 * (1 - ease.out(q)))); P.eyes = q > 0.6 ? 2 : 1; P.glow = q > 0.6 ? 2 : 1; }
      else if (st === CAST) { P.ah = 1; pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 2; }
      else { P.ah = 1; pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6))); }
    } else {   // p2：抱住胸口 → 两声心跳 → 仰天长啸，胸口的溺死之心亮起来
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.heart = hb ? 2 : 1; P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.eyes = 2; P.hot = 1; P.heart = 2; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.eyes = 2; P.hot = 1; P.heart = hold ? 2 : 1; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const WL = -25, SHN = [20, -38], SHF = [-18, -38], NECK = [4, -46], APLANT = [40, -62];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.5 - P.lean * 0.5); }
  function hatXf() { if (P.hat) { headXf(); return; } B.reset(); B.move(P.hfx, 81 + WL - 10); B.rot(6, -80, ((P.hfx >> 1) & 1) ? 0.06 : -0.06); }   // 漂在水面上的帽子
  const AP = (u, v) => [L.ring[0] + L.ad[0] * u + L.an[0] * v, L.ring[1] + L.ad[1] * u + L.an[1] * v];   // 锚的本地坐标：u 沿锚杆（锚环 → 锚冠），v 横向
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.heart = B.at(-1, -27); L.hem = B.at(0, 0);
    headXf(); L.eyeN = B.at(12, -59); L.eyeF = B.at(0, -59); L.eye = B.at(6, -59); L.mouth = B.at(6, -49 + P.jaw); L.hatL = B.at(-28, -86); L.hatR = B.at(42, -86); L.hatC = B.at(6, -80);
    L.hN = [P.nx, P.ny + P.by];
    if (P.ah) { L.grip = L.hN; L.aa = P.aa; } else { L.grip = [APLANT[0], APLANT[1] + P.asink]; L.aa = A90 + P.afall; }
    L.ad = [Math.cos(L.aa), Math.sin(L.aa)]; L.an = [-L.ad[1], L.ad[0]];
    L.ring = [L.grip[0] - L.ad[0] * 5, L.grip[1] - L.ad[1] * 5]; L.crown = AP(46, 0); L.fluke = [AP(36, 24), AP(36, -24)];
    const fh = [P.fx2, P.fy2 + P.by], ts = [L.grip[0] + L.ad[0] * 9, L.grip[1] + L.ad[1] * 9];
    L.hF = P.two ? [fh[0] + (ts[0] - fh[0]) * P.two, fh[1] + (ts[1] - fh[1]) * P.two] : fh;
    L.elN = B.ik(L.shN, L.hN, 17, 19, -1); L.elF = B.ik(L.shF, L.hF, 17, 19, 1);
    L.orb = AP(44, 0); L.aback = P.ah && L.ad[0] < -0.3;
    L.can = [0, 1, 2].map((i) => { const bx = -38 - i * 21, rise = Math.round((1 - P.can) * 34) + i * 2, rec = P.fire === i + 1 ? 3 : 0, b = [bx - rec * 0.6, WL + 2 + rise + rec * 0.8]; return { b, m: [b[0] + 12, b[1] - 17] }; });
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const cP = (a, b, r0, r1, m, t) => capW(a[0], a[1], b[0], b[1], r0, r1, m, t), dP = (p, r, m, t) => dot(p[0], p[1], r, m, t), lP = (a, b, m, t) => lnW(a[0], a[1], b[0], b[1], m, t);
  const strandW = (pts, r0, r1, m, t) => { B.reset(); B.strand(E, pts, r0, r1, m, t); };
  const barn = (p, r, glow) => { dP(p, r, BARN); px(p[0], p[1], glow ? GL2 : BARN, glow ? 0 : 2); };   // 藤壶：一圈白壳，中间一个黑洞（第二阶段里面亮荧光）

  // 身后海面上斜插的断桅 + 横桁 + 破帆 + 缆绳（不跟身体动，死的时候也留着）
  function mast() {
    const s = P.sw * 0.6, top = [-60 + s, -80], bot = [-30, 8];
    part(); cP(bot, top, 3.4, 2.6, WOODD); lP([bot[0] + 1, bot[1] - 4], [top[0] + 1.5, top[1] + 6], WOODD, 7);
    polyW([[top[0] - 3, top[1] + 2], [top[0] - 1, top[1] - 5], [top[0] + 1, top[1] - 1], [top[0] + 3, top[1] - 6], [top[0] + 4, top[1] + 2]], WOODD);   // 断口
    for (const y of [-20, -44]) { const q = (y - bot[1]) / (top[1] - bot[1]), c = [bot[0] + (top[0] - bot[0]) * q, y]; capW(c[0] - 3.6, c[1], c[0] + 3.6, c[1] + 1, 1.2, 1.2, IROND); }   // 铁箍
    part(); const y0 = [-78 + s, -62], y1 = [-38 + s, -70]; cP(y0, y1, 1.8, 1.6, WOODD);                                   // 横桁
    part(); polyW([y0, y1, [-42 + s, -52], [-46 + s * 1.5, -40], [-51 + s, -47], [-55 + s * 2, -34], [-60 + s, -44], [-66 + s * 2, -38], [-70 + s, -50], [-76 + s, -58]], SAIL);   // 破帆
    lnW(-60 + s, -64, -58 + s * 1.5, -40, SAIL, 3); lnW(-48 + s, -66, -47 + s * 1.5, -50, SAIL, 3); dot(-66 + s, -52, 2.2, SAIL, 2); px(-66 + s, -52, SAIL, 10);   // 褶和破洞
    part(); lnW(top[0], top[1] + 2, -94, 6, WOODD, 5); lnW(top[0] + 1, top[1] + 4, -8, -10, WOODD, 5); lnW(y0[0], y0[1], -86, 6, WOODD, 5);   // 缆绳
    barn([-32, 0], 1.6, P.hot); barn([-35, -6], 1.3, P.hot); strandW([[-33, -12], [-31 + s, -4], [-33 + s, 4]], 1.4, 0.8, WEED);
  }
  // 炮击时身后海面浮起的三门炮：长满藤壶的铁炮身、炮口、引信冒火、开炮那一下后坐 + 喷火
  function cannons() {
    for (let i = 2; i >= 0; i--) {
      const c = L.can[i], b = c.b, m = c.m; if (b[1] > 12) continue; const d = [(m[0] - b[0]) / 20.8, (m[1] - b[1]) / 20.8], ang = Math.atan2(d[1], d[0]);
      part(); dP([b[0] - d[0] * 6, b[1] - d[1] * 6], 2.2, CANM); cP([b[0] - d[0] * 3, b[1] - d[1] * 3], m, 6, 3.8, CANM); lP([b[0] - 3, b[1] - 3], [m[0] - 2.6, m[1] - 2.4], CANM, 8);
      for (const q of [0.12, 0.45]) { const c0 = [b[0] + (m[0] - b[0]) * q, b[1] + (m[1] - b[1]) * q], rr = 6.4 - q * 2.6; lP([c0[0] - d[1] * rr, c0[1] + d[0] * rr], [c0[0] + d[1] * rr, c0[1] - d[0] * rr], CANM, 7); lP([c0[0] - d[1] * rr + d[0], c0[1] + d[0] * rr + d[1]], [c0[0] + d[1] * rr + d[0], c0[1] - d[0] * rr + d[1]], CANM, 2); }
      part(); cP([m[0] - d[0] * 2, m[1] - d[1] * 2], [m[0] + d[0] * 1.5, m[1] + d[1] * 1.5], 5.2, 5.2, CANM, 6); B.save(); B.reset(); B.ell(E, m[0] + d[0] * 1.6, m[1] + d[1] * 1.6, 1.6, 3.6, ang, CANM, 10); B.ell(E, m[0] + d[0] * 1.6, m[1] + d[1] * 1.6, 1, 2.4, ang, IROND, 1); B.restore();                                                       // 炮口
      part(); dP([b[0] - 1.5, b[1] + 1.5], 3.8, CANM, 3); barn([b[0] + 4, b[1] - 8], 1.5, P.hot); barn([b[0] + 7, b[1] - 5], 1.1, P.hot);    // 炮尾、藤壶
      if (P.fuse) { px(b[0] - 3, b[1] - 3, P.fuse === 2 ? FIRE2 : FIRE1); if (P.fuse === 2) px(b[0] - 4, b[1] - 5, FIRE1); }
      if (P.fire === i + 1) { part(); const f = [m[0] + 5, m[1] - 7]; dP(f, 6.5, FIRE1); dP([f[0] - 0.5, f[1] + 0.5], 4.2, FIRE2); dP([f[0] + 4, f[1] - 6], 3, FIRE1); dP([f[0] + 6, f[1] - 9], 1.6, FIRE2); }
    }
  }
  function hair() {   // 帽子底下垂到肩后的海草长发
    part(); headXf(); const r = [[-8, -66], [-9, -61], [-7, -56], [-4, -64]].map((p) => B.at(p[0], p[1]));
    r.forEach((p, i) => strandW([p, [p[0] - 5 + P.sw, p[1] + 10], [p[0] - 7 + P.sw * 2 - i, p[1] + 22 + i * 2]], 2.8, 1.2, i & 1 ? WEEDD : WEED));
  }
  function arm(side) {
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, m = far ? COATD : COAT, sk = far ? SKIND : SKIN;
    part(); cP(sh, el, 7.2, 6.2, m); cP(el, h, 6.2, 5.4, m); lP(el, [el[0] + (h[0] - el[0]) * 0.6, el[1] + (h[1] - el[1]) * 0.6], m, 3);
    dP([(sh[0] + el[0]) / 2 - 1, (sh[1] + el[1]) / 2 - 2], 2.6, m, 7);
    const cf = [el[0] + (h[0] - el[0]) * 0.72, el[1] + (h[1] - el[1]) * 0.72], cf2 = [el[0] + (h[0] - el[0]) * 0.88, el[1] + (h[1] - el[1]) * 0.88];
    part(); cP(cf, cf2, 7, 7, m, 6); lP([cf[0], cf[1]], [cf2[0], cf2[1]], far ? BRSD : BRS); dP(cf2, 1.2, far ? BRSD : BRS, 7);          // 翻袖口 + 铜扣
    if (!far) { barn([(sh[0] + el[0]) / 2 + 3, (sh[1] + el[1]) / 2 + 1], 1.5, P.hot); barn([(sh[0] + el[0]) / 2 + 5, (sh[1] + el[1]) / 2 + 4], 1.1, P.hot); }
    part(); dP(h, 4.6, sk); const dir = Math.atan2(h[1] - el[1], h[0] - el[0]), grip = (far ? P.two > 0.5 : (P.ah || P.fist || (!P.ah && P.st === MOVE)));
    for (let i = 0; i < 4; i++) { const a = dir + (i - 1.5) * (grip ? 0.34 : 0.5), r0 = [h[0] + Math.cos(a) * 3.4, h[1] + Math.sin(a) * 3.4], ln = grip ? 2.4 : 5.4, tip = [r0[0] + Math.cos(a + 0.5 * side) * ln, r0[1] + Math.sin(a + 0.5 * side) * ln];
      cP(r0, tip, 1.8, 1.3, sk, i === 0 ? 7 : 5); }
  }
  function torso() {
    part(); torsoXf();   // 泡胀的大衣身子
    B.poly(E, [[-20, 6], [21, 6], [24, -12], [23, -30], [18, -42], [-16, -42], [-21, -30], [-23, -12]], COAT); B.ell(E, 1, -22, 22, 18, 0, COAT);
    B.ln(E, -14, 0, -16, -22, COAT, 3); B.ln(E, 17, 0, 19, -18, COAT, 3); B.ln(E, -19, -26, -12, -38, COAT, 7);
    part(); B.poly(E, [[-7, -42], [9, -42], [11, -10], [1, -5], [-8, -10]], VEST);                                           // 暗红背心
    for (const y of [-36, -30, -24, -18]) { B.px(E, 1, y, BRS); B.px(E, 2, y, BRS, 7); }
    B.ln(E, -6, -20, -2, -16, VEST, 3); B.ln(E, 5, -34, 8, -30, VEST, 3);
    if (P.hot || P.heart) {   // 背心上撕开的洞，溺死之心在里面发光
      B.ell(E, -1, -27, 4.6, 5.2, 0, VEST, 10); const hb = P.heart >= 2 || P.glow >= 3; B.ell(E, -1, -27, 3.4, 4, 0, GL1); B.ell(E, -1, -27, 2.2, 2.8, 0, hb ? GL3 : GL2); if (hb) B.px(E, -2, -28, GL3);
      B.ln(E, -6, -22, -9, -16, GL1); B.ln(E, 3, -31, 6, -35, GL1);
    }
    part(); B.poly(E, [[-22, -8], [23, -8], [23, -3], [-22, -3]], WOODD); B.ln(E, -22, -8, 23, -8, WOODD, 7);                  // 腰带
    part(); B.poly(E, [[-3, -9], [5, -9], [5, -2], [-3, -2]], BRS); B.poly(E, [[-1, -7], [3, -7], [3, -4], [-1, -4]], BRS, 2);   // 铜扣
    part(); B.poly(E, [[-16, -42], [-7, -42], [-9, -12], [-13, -6], [-18, -20]], COAT, 6); B.ln(E, -7, -42, -9, -12, BRS); B.ln(E, -9, -12, -13, -6, BRS);   // 翻领（金边）
    part(); B.poly(E, [[9, -42], [18, -42], [21, -20], [16, -6], [11, -10]], COAT, 6); B.ln(E, 9, -42, 11, -10, BRS); B.ln(E, 11, -10, 16, -6, BRS);
    for (const y of [-34, -26, -18]) { B.ell(E, -14, y, 1.3, 1.3, 0, BRS); B.px(E, -14, y - 1, BRS, 8); B.ell(E, 17, y, 1.3, 1.3, 0, BRS); B.px(E, 17, y - 1, BRS, 8); }   // 两排铜扣
    part(); torsoXf(); const bb = (x, y, r) => { const p = B.at(x, y); barn(p, r, P.hot); };
    bb(20, -14, 1.6); bb(18, -10, 1.3); bb(22, -18, 1.2); bb(-19, -8, 1.4); bb(-17, -4, 1.1);                                 // 大衣上的藤壶
    part(); const wd = [[-22, -30], [-16, -24], [-10, -22], [-6, -14]].map((p) => B.at(p[0], p[1])); strandW(wd, 2, 1.2, WEED);   // 挂在身上的一绺海草
  }
  function collar() {   // 高高立着的大衣领子（在头后面）
    part(); torsoXf(); B.poly(E, [[-15, -38], [-13, -52], [-5, -47], [12, -47], [19, -53], [21, -38]], COATD); B.ln(E, -13, -52, -5, -47, BRSD); B.ln(E, 12, -47, 19, -53, BRSD);
    part(); torsoXf(); B.ell(E, 3, -44, 6, 3, 0, LACE); B.ln(E, 0, -44, 6, -43, LACE, 3);                                    // 领巾
  }
  function epaulette(side) {   // 金穗肩章
    part(); torsoXf(); const far = side < 0, c = far ? [-19, -40] : [21, -40], m = far ? BRSD : BRS;
    B.ell(E, c[0], c[1], 7.5, 3.6, side * 0.25, m); B.ln(E, c[0] - 5, c[1] - 2, c[0] + 4, c[1] - 3, m, 8); if (far) B.ln(E, c[0] - 6, c[1] + 3, c[0] + 5, c[1] + 3, m, 3);
    if (!far) for (let i = -6; i <= 6; i++) { const x = c[0] + i + side * 0.5, y = c[1] + 2.5 + Math.abs(i) * 0.15; B.ln(E, x, y, x + P.sw * 0.3, y + 3 + (i & 1), m, i & 1 ? 3 : 5); }
    if (!far) { const p = B.at(c[0] + 5, c[1] - 1); strandW([p, [p[0] + 3 + P.sw, p[1] + 8], [p[0] + 2 + P.sw * 2, p[1] + 16]], 1.6, 0.8, WEED); }   // 挂在肩章上的海草
  }
  function head() {   // 泡胀的溺死脸：大圆脸、下垂的腮、帽檐阴影里两只海绿的眼、酒糟大鼻子
    part(); headXf(); B.cap(E, 3, -42, 4, -50, 7, 7, SKIN);
    part(); headXf(); const J = Math.round(P.jaw * 1.5);
    B.ell(E, 5, -58, 14, 12.5, 0, SKIN); B.ell(E, -3, -50 + J * 0.5, 8, 6.5, 0.3, SKIN); B.ell(E, 13, -50 + J * 0.5, 8, 6.5, -0.3, SKIN); B.ell(E, 5, -45 + J, 9, 4.5, 0, SKIN);
    B.ell(E, -7, -55, 5, 6, 0.2, SKIN); B.ell(E, 18, -55, 5, 6, -0.2, SKIN); B.poly(E, [[-10, -71], [20, -71], [20, -67], [8, -61], [-2, -65], [-10, -67]], SKIN, 2);   // 鼓起来的腮帮、帽檐压下来的 V 形阴影
    B.ell(E, 16, -52, 3, 2, 0, SKIN, 7); B.ell(E, -4, -52, 2.5, 2, 0, SKIN, 6);                                               // 泡胀的腮
    for (const [x, y] of [[-6, -58], [17, -57], [14, -47], [-4, -46], [2, -62]]) B.px(E, x, y, SKIN, 3);                       // 尸斑
    B.ell(E, 12, -59, 4, 3.4, 0, SKIN, 1); B.ell(E, 0, -59, 3.4, 3.2, 0, SKIN, 1);                                            // 深眼窝
    const ge = P.eyes >= 2 ? GL3 : GL2;
    if (P.eyes) { B.ell(E, 12, -59, 2.4, 2.1, 0, GL2); B.ell(E, 0, -59, 1.9, 1.9, 0, GL2); B.px(E, 12, -59, ge); B.px(E, 0, -59, ge); if (P.eyes >= 2) { B.px(E, 11, -60, GL3); B.px(E, 15, -60, GL1); B.px(E, -3, -60, GL1); } }
    else { B.ln(E, 9, -59, 15, -59, SKIN, 10); B.ln(E, -2, -59, 2, -59, SKIN, 10); }
    B.ln(E, 9, -55, 15, -55, SKIN, 3); B.ln(E, -3, -55, 2, -55, SKIN, 3);                                                     // 眼袋
    B.ln(E, 6, -63, 7, -57, SKIN, 3); B.ell(E, 7, -54, 3.4, 2.8, 0, SKIN, 6); B.px(E, 6, -55, SKIN, 8); B.px(E, 5, -52, SKIN, 1); B.px(E, 9, -52, SKIN, 1);   // 酒糟鼻
    if (J) { B.poly(E, [[0, -50], [12, -50], [11, -48 + J], [1, -48 + J]], SKIN, 1); B.ln(E, 1, -48 + J, 11, -48 + J, SKIN, 10);
      for (const x of [2, 5, 9]) B.px(E, x, -50, BARN, x === 5 ? 3 : 6); if (P.cough || P.hot) B.ln(E, 3, -49 + J, 9, -49 + J, P.hot ? GL2 : GL1); }   // 张嘴：黑的嘴、几颗烂牙，咳出来的是海水
    else B.ln(E, 1, -49, 11, -49, SKIN, 1);
    barn(B.at(-5, -55), 1.2, P.hot);                                                                                           // 脸上的一枚藤壶
  }
  function beard() {   // 海草大胡子：从下巴一圈垂到胸口，按重力垂、跟着摆，缠着贝壳和一只海星
    headXf(); const J = Math.round(P.jaw * 1.5), roots = [[-9, -50], [-6, -45], [-1, -43], [3, -42], [8, -42], [12, -43], [17, -45], [20, -50]].map((p) => B.at(p[0], p[1] + J));
    const tips = [];
    const wav = (r, i, len, s, spread) => { const k = (i * 5) % 3 - 1, x = (q) => r[0] + (i - 3.5) * spread * q + s * q * q + Math.sin(q * 5 + i * 1.7) * 1.6 * q; return [r, [x(0.3), r[1] + len * 0.3], [x(0.55) + k, r[1] + len * 0.55], [x(0.8), r[1] + len * 0.8], [x(1) - k, r[1] + len]]; };
    const s = P.sw, jl = roots[0], jr = roots[7], cx = (jl[0] + jr[0]) / 2, by = Math.max(jl[1], jr[1]);   // 一整团胡子：下缘参差，尖往下垂成一绺
    part(); polyW([[jl[0] - 1, jl[1] - 2], [jr[0] + 1, jr[1] - 2], [jr[0] + 2 + s, by + 8], [jr[0] - 1 + s * 1.5, by + 17], [cx + 7 + s * 2, by + 21], [cx + 3 + s * 2, by + 27], [cx - 1 + s * 2, by + 22], [cx - 5 + s * 2, by + 29], [cx - 8 + s * 1.5, by + 20], [jl[0] + 2 + s * 1.5, by + 16], [jl[0] - 2 + s, by + 7]], WEEDD);
    roots.forEach((r, i) => { const pts = wav(r, i, 14 + ((i * 3) % 4) * 4, s * (1 + (i % 2)), 1.1); for (let k = 1; k < 4; k++) lP(pts[k], pts[k + 1], WEEDD, i & 1 ? 7 : 3); tips.push(pts[3]); });   // 胡子里的一绺一绺
    part(); roots.forEach((r, i) => { if (!(i & 1)) return; const pts = wav(r, i, 22 + (i % 3) * 5, s * (1 + (i % 2)), 1.2); strandW(pts, 2.2, 0.6, WEED); lP([pts[1][0] - 0.5, pts[1][1]], [pts[2][0] - 0.5, pts[2][1]], WEED, 7); });
    headXf(); const mL = B.at(2, -50), mR = B.at(12, -50);                                                                     // 胡子上面那两撇垂下来的海草
    part(); strandW([mL, [mL[0] - 3, mL[1] + 1], [mL[0] - 4 + P.sw, mL[1] + 5]], 1.6, 0.7, WEED); strandW([mR, [mR[0] + 3, mR[1] + 1], [mR[0] + 4 + P.sw, mR[1] + 5]], 1.6, 0.7, WEED);
    part(); const sh = roots[5], st = [roots[2][0] - 1 + P.sw, roots[2][1] + 11];
    dot(sh[0] + P.sw + 1, sh[1] + 12, 1.8, LACE); px(sh[0] + P.sw + 1, sh[1] + 12, LACE, 3);                                   // 贝壳
    for (let k = 0; k < 5; k++) { const a = -A90 + k * 1.2566; lnW(st[0], st[1], st[0] + Math.cos(a) * 3.2, st[1] + Math.sin(a) * 3.2, STAR); } px(st[0], st[1], STAR, 8);   // 橙色海星
    if (P.hot) tips.forEach((t, i) => px(t[0], t[1] - 2, i & 1 ? GL2 : GL3));                                                  // 第二阶段：胡子里的荧光
  }
  function hat() {   // 三角帽：后墙 → 帽顶 → 前墙（中间一个角压在眉上），金边、骷髅徽、帽角挂着海草和藤壶
    part(); hatXf(); B.poly(E, [[-28, -86], [-12, -91], [6, -93], [24, -92], [42, -86], [24, -80], [6, -77], [-12, -80]], HATB);
    part(); hatXf(); B.ell(E, 6, -80.5, 14, 7.5, 0, HAT); B.ln(E, -4, -85, 8, -87, HAT, 8); B.ln(E, -6, -80, 18, -80, HAT, 3);
    part(); hatXf(); const top = [[-28, -86], [-14, -80], [0, -74], [8, -72], [18, -76], [30, -81], [42, -86]];
    B.poly(E, top.concat([[34, -80], [20, -71], [8, -65], [-2, -68], [-14, -75]]), HAT);
    B.ln(E, -14, -77, 0, -70, HAT, 7); B.ln(E, 20, -74, 32, -80, HAT, 3); B.ln(E, 8, -66, 20, -71, HAT, 2);
    for (let i = 1; i < top.length; i++) B.ln(E, top[i - 1][0], top[i - 1][1], top[i][0], top[i][1], BRS, i < 4 ? 7 : 5);      // 金边
    B.ln(E, -2, -68, 8, -65, BRSD); B.ln(E, 8, -65, 20, -71, BRSD);
    B.ell(E, -28, -86, 1.8, 1.8, 0, BRS, 7); B.ell(E, 42, -86, 1.8, 1.8, 0, BRS);
    B.px(E, 24, -76, HAT, 10); B.px(E, 25, -75, HAT, 10); B.px(E, -18, -80, HAT, 10);                                          // 破口
    part(); hatXf(); B.ell(E, -6, -77, 2.4, 2.2, 0, LACE); B.px(E, -7, -77, LACE, 1); B.px(E, -5, -77, LACE, 1); B.ln(E, -7, -75, -5, -75, LACE, 3);   // 骷髅徽
    B.ln(E, -10, -74, -2, -79, LACE, 4); B.ln(E, -10, -79, -2, -74, LACE, 4);
    const pL = B.at(-27, -85), pR = B.at(40, -85), hot = P.hot;
    part(); strandW([pL, [pL[0] - 2 + P.sw, pL[1] + 6], [pL[0] - 1 + P.sw * 2, pL[1] + 13]], 1.6, 0.8, WEED);
    part(); barn([pR[0] - 1, pR[1] + 1], 1.4, hot); barn([pR[0] - 4, pR[1] + 2], 1.1, hot);
  }
  // 锚：木横杆 + 铁箍、锚杆、锚环、两只弯臂 + 锚爪；锈斑、藤壶、一绺海草。锁链从锚环垂进海里
  function chain() {
    const r = AP(-1.5, 0), end = [r[0] - 18, 9], c = [end[0] + 6, r[1] + (end[1] - r[1]) * 0.9], pts = B.bez(r, c, end, 12);
    part(); let s = 0; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i], n = Math.max(1, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) / 3));
      for (let k = 0; k < n; k++) { const q = k / n, p = [a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q]; if (p[1] > 8) continue; if ((s++) & 1) { lnW(p[0] - 1, p[1], p[0] + 1, p[1], IROND, 6); } else { dP(p, 1.6, IRON); px(p[0], p[1], IRON, 1); } } }
  }
  function anchor() {
    part(); cP(AP(9, -15), AP(9, 15), 2.2, 2.2, WOOD); for (const v of [-12, 12]) cP(AP(7.5, v), AP(10.5, v), 1.6, 1.6, IROND); lP(AP(8, -14), AP(8, 14), WOOD, 7);   // 木横杆
    part(); cP(AP(2.5, 0), AP(46, 0), 2.6, 3.4, IRON); lP(AP(4, -1.5), AP(42, -2), IRON, 7);
    lP(AP(20, 1), AP(30, 1.5), RUST); lP(AP(32, 0), AP(38, 1), RUST); dP(AP(24, -0.5), 1.1, RUST, 6);                        // 锈
    part(); const rr = []; for (let k = 0; k <= 10; k++) { const a = k / 10 * 6.2832; rr.push(AP(-1.5 + Math.cos(a) * 3.4, Math.sin(a) * 3.4)); } for (let k = 1; k < rr.length; k++) cP(rr[k - 1], rr[k], 1.1, 1.1, IRON);   // 锚环
    part(); for (const s of [-1, 1]) { B.reset(); B.strand(E, B.bez(AP(46, 0), AP(50, s * 14), AP(37, s * 21), 6), 3.4, 2.4, IRON); }
    dP(AP(46.5, 0), 4.4, IRON); dP(AP(45, -1.5), 1.6, IRON, 7);
    part(); for (const s of [-1, 1]) polyW([AP(41, s * 18), AP(35, s * 16), AP(29, s * 21), AP(33, s * 28), AP(39, s * 25)], IRON);   // 锚爪
    for (const s of [-1, 1]) lP(AP(38, s * 19), AP(32, s * 24), IRON, 3);
    lP(AP(44, 12), AP(40, 18), RUST); barn(AP(47, 3), 1.6, P.hot); barn(AP(49, -2), 1.3, P.hot); barn(AP(44, -7), 1.1, P.hot);
    const w = AP(38, 21); strandW([w, [w[0] + 1 + P.sw, w[1] + 7], [w[0] + P.sw * 2, w[1] + 14]], 1.6, 0.8, WEED);
    if (P.orb) { part(); const o = L.orb, r = 2 + P.orb * 1.6; dP(o, r + 1.2, GL1); dP(o, r, GL2); dP([o[0] - 0.5, o[1] - 0.5], Math.max(0.6, r - 1.8), GL3); }   // 锚冠上聚起来的海水
  }
  // 全速前进：脚下浮起的幽灵船头（船身木板、铜栏、船首像、斜桅，木板缝里透出海绿）
  function prowPart() {
    const oy = Math.round((1 - P.prow) * 44) + WL + 6, ox = P.pdx, T = (x, y) => [x + ox, y + oy];
    part(); polyW([T(-8, -8), T(40, -15), T(66, -22), T(76, -18), T(76, -8), T(66, 4), T(-8, 8)], WOOD);
    for (const [a, b] of [[[-6, -2], [70, -12]], [[-6, 3], [68, -3]]]) lP(T(a[0], a[1]), T(b[0], b[1]), WOOD, 3);
    if (P.prow > 0.6) { lP(T(-4, -1), T(66, -11), GL1); lP(T(-4, 4), T(62, -2), P.glow >= 3 ? GL2 : GL1); }
    part(); cP(T(-8, -10), T(66, -24), 1.5, 1.5, BRS); for (const x of [8, 24, 40, 56]) cP(T(x, -12 - x * 0.19), T(x, -8 - x * 0.19), 1, 1, BRSD);   // 铜栏
    part(); cP(T(64, -22), T(102, -40), 2.6, 1.2, WOODD); lP(T(70, -26), T(96, -37), WOODD, 7);                                // 斜桅
    part(); dP(T(76, -14), 3.4, LACE); dP(T(78, -19), 2.4, LACE); px(...T(79, -19), GL2); lP(T(74, -10), T(72, -4), LACE, 3);     // 船首像（白色的女人像）
    barn(T(50, 0), 1.5, 1); barn(T(20, 3), 1.3, P.hot); barn(T(58, -6), 1.1, P.hot);
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    mast(); if (P.can) cannons();
    if (L.aback) { chain(); anchor(); }
    hair(); arm(-1); collar(); torso(); head(); beard(); hat();
    if (P.prow) prowPart();
    epaulette(1); if (!L.aback) { chain(); anchor(); } arm(1);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = L.heart[0] * z + spr.ox; RIM.ry = L.heart[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = L.eye[0] * z + spr.ox; LIGHTS[0].y = L.eye[1] * z + spr.oy; LIGHTS[0].r = (P.eyes >= 2 ? 13 : P.eyes ? 8 : 0) * z;
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + (WL + 18) * z; LIGHTS[1].r = 60 * z; LIGHTS[1].k = P.hot ? 0.5 : 0.4;                   // 海面从下面映上来
    const hl = P.orb ? L.orb : L.heart; LIGHTS[2].x = hl[0] * z + spr.ox; LIGHTS[2].y = hl[1] * z + spr.oy; LIGHTS[2].r = (P.orb ? 8 + P.orb * 4 : (P.hot || P.heart) ? (P.heart >= 2 || P.glow >= 3 ? 18 : 12) : 0) * z;
    const fc = P.fire ? L.can[P.fire - 1].m : null; LIGHTS[3].x = fc ? (fc[0] + 5) * z + spr.ox : 0; LIGHTS[3].y = fc ? (fc[1] - 7) * z + spr.oy : 0; LIGHTS[3].r = fc ? 20 * z : 0;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面、抬着下巴、张嘴，单手把锚提到身侧，眼睛和胸口的心全亮（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); P.ah = 1; pose(K.idle, K.wide, 0.35); P.hd = 0.04; P.jaw = 2; P.eyes = 2; P.glow = 3; P.hot = 1; P.heart = 1; P.by = 0; P.breath = 0; P.sw = 1;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(6, -70); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 37 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连三角帽）

  // ───── 特效（舞台坐标；游戏里只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, dpT = 0;
  const splash = (x, n, up) => { for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 14, HY - 2, (Math.random() - 0.5) * 140, -(up || 120) - Math.random() * 160, 0.8 + Math.random() * 0.5, FXI.water, { g: 340, floor: HY + 2 }); };
  function cannonShot(i) {
    const m = L.can[i].m, x = sx(m[0] + 4), y = sy(m[1] - 6);
    burst(x, y, 12, 30, 90, 0.2, 0.4, FXI.fire, 30); for (let k = 0; k < 6; k++) spawn(K_RISE, x + (Math.random() - 0.5) * 8, y + (Math.random() - 0.5) * 6, (Math.random() - 0.3) * 20, -10 - Math.random() * 14, 0.9 + Math.random() * 0.6, FXI.dust);
    spawnX(K_PHYS, x, y, 70 + i * 10, -300, 1.2, FXI.steel, { g: 60, floor: HY + 40 }); ring(x, y, 0, FXI.fire); shake(0.2, 2); sfx('boss', { k: 'captainCannon', w: 0.8 + i * 0.1 }); if (!i) flash(0.06);
  }
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'anchor') { const c = L.crown, x = sx(c[0]); fx.wave(x, HY, 1, 46, 10, 'water', 0.55, 2); fx.wave(x, HY, -1, 34, 8, 'water', 0.5, 2); burst(x, HY - 4, 22, 60, 180, 0.35, 0.8, FXI.water, 60); splash(x, 26, 160);
        ring(x, HY - 2, 1, FXI.water); ring(x, HY - 2, 0, FXI.water); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'captainSplash', w: 1 }); sfx('boss', { k: 'slam', w: 0.8 }); sfx('hit', { mat: 'metal', w: 1 }); }
      else if (MV === 'cannons') cannonShot(0);
      else if (MV === 'ram') { const x = sx(80); fx.wave(x, HY, 1, 90, 14, 'water', 0.65, 2); fx.wave(sx(40), HY, 1, 60, 9, 'water', 0.5, 2); burst(x, HY - 6, 30, 60, 200, 0.35, 0.8, FXI.water, 60); splash(x, 30, 180);
        ring(sx(60), sy(-20), 1, FXI.water); ring(x, HY - 2, 1, FXI.water); shake(0.45, 4); flash(0.1); sfx('boss', { k: 'captainRoar', w: 1 }); sfx('boss', { k: 'captainSplash', w: 1 }); sfx('impact', { pal: 'water', w: 1 }); }
      else if (MV === 'poke') { const c = L.crown; burst(sx(c[0]), sy(c[1]), 16, 50, 140, 0.25, 0.5, FXI.water, 20); fx.slash(sx(L.shN[0]), sy(L.shN[1]), 40, 1.2, 1.8, 'water', 0.2, 2, 2); shake(0.22, 2); sfx('swing', { kind: 'blunt', w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') { const m = L.mouth; ring(sx(m[0]), sy(m[1]), 1, FXI.water); ring(sx(L.heart[0]), sy(L.heart[1]), 1, FXI.water); flash(0.12); shake(0.4, 3); splash(sx(0), 40, 140);
        for (let i = 0; i < 24; i++) { const a = -Math.PI * Math.random(); spawnX(K_PHYS, sx(L.heart[0]), sy(L.heart[1]), Math.cos(a) * (60 + Math.random() * 120), Math.sin(a) * (80 + Math.random() * 140), 0.8 + Math.random() * 0.5, FXI.water, { g: 260, floor: HY + 4 }); }
        sfx('boss', { k: 'captainRoar', w: 1 }); sfx('impact', { pal: 'water', w: 1 }); }
    }
    if (s === CHARGE && MV === 'anchor') { sfx('boss', { k: 'captainChain', w: 1 }); sfx('boss', { k: 'growl', w: 0.5 }); }
    if (s === CHARGE && MV === 'cannons') sfx('boss', { k: 'captainFuse', w: 1 });
    if (s === CHARGE && MV === 'ram') sfx('boss', { k: 'captainHorn', w: 1 });
    if (s === CHARGE && MV === 'poke') sfx('boss', { k: 'captainChain', w: 0.5 });
    if (s === CHARGE && MV === 'rise') sfx('boss', { k: 'captainSurge', w: 1 });
    if (s === CHARGE && MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 3 / 12) { fx.slash(sx(L.shN[0]), sy(L.shN[1]), 44, -0.4, 2.2, 'water', 0.22, 3, 2); burst(sx(L.crown[0]), sy(L.crown[1]), 16, 50, 140, 0.25, 0.5, FXI.water, 20); hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'blunt', w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); }
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'captainChain', w: 0.4 });
    if (s === IDLE && t === 1.5) sfx('boss', { k: 'captainGurgle', w: 0.6 });
    if (s === CAST && MV === 'cannons' && (t === 2 / 12 || t === 4 / 12)) cannonShot(t === 2 / 12 ? 1 : 2);
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'captainDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { const g = L.grip; splash(sx(g[0] + 10), 18, 100); ring(sx(g[0] + 10), HY - 2, 1, FXI.water); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'captainSplash', w: 0.7 }); }
    if (s === DEATH && t === INCOMING + 1.7) { splash(sx(0), 30, 90); ring(sx(0), HY - 2, 1, FXI.water); sfx('boss', { k: 'sink', w: 1 }); }
  }
  const EVENTS = [[1.5], [], [1 / 12, 3 / 12], [], [2 / 12, 4 / 12], [], [], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.7], []];
  function stepFX(dt, state, stT) {
    emT += dt; dpT += dt;
    if (dpT > 0.14) { dpT = 0; const src = [L.hatL, L.hatR, L.crown, [L.hem[0] - 18, L.hem[1] - 6], [L.hem[0] + 20, L.hem[1] - 8]][Math.floor(Math.random() * 5)];   // 帽角、锚、衣摆一直往下滴水
      if (src[1] < -2 && (P.hat || src !== L.hatL)) spawnX(K_PHYS, sx(src[0]), sy(src[1] + 2), 0, 10, 1.0, FXI.water, { g: 260, floor: HY + 1 }); }
    if (emT > (P.hot ? 0.06 : 0.16)) { emT = 0; if (P.hot) spawn(K_EMBER, sx(-24 + Math.random() * 48), sy(-6 - Math.random() * 50), (Math.random() - 0.5) * 8, -12 - Math.random() * 10, 0.6 + Math.random() * 0.5, FXI.water);   // 第二阶段：往上飘的海绿荧光
      else spawn(K_RISE, sx(-26 + Math.random() * 60), sy(0), 0, -6, 0.5, FXI.water); }   // 海面上冒的气泡
    if (state === IDLE && P.cough && Math.random() < 0.7) { const m = L.mouth; spawnX(K_PHYS, sx(m[0] + (Math.random() - 0.5) * 4), sy(m[1] + 1), 10 + Math.random() * 20, 10 + Math.random() * 20, 0.8, FXI.water, { g: 300, floor: HY + 1 }); }   // 咳出来的海水
    if (state === CHARGE && P.orb && Math.random() < 0.6) { const c = L.orb, a = Math.random() * 6.2832, r = 10 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.water, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'anchor' && Math.random() < 0.5) { const f = L.fluke[Math.random() < 0.5 ? 0 : 1]; spawnX(K_PHYS, sx(f[0]), sy(f[1]), 0, 20, 0.8, FXI.water, { g: 300, floor: HY + 1 }); }
    if (state === CHARGE && MV === 'cannons') { if (P.can < 1 && Math.random() < 0.6) { const c = L.can[Math.floor(Math.random() * 3)].m; spawnX(K_PHYS, sx(c[0]), sy(c[1]), (Math.random() - 0.5) * 20, 0, 0.7, FXI.water, { g: 300, floor: HY + 1 }); }
      if (P.fuse && Math.random() < 0.6) { const b = L.can[Math.floor(Math.random() * 3)].b; spawn(K_EMBER, sx(b[0] - 3), sy(b[1] - 4), (Math.random() - 0.5) * 20, -20 - Math.random() * 20, 0.3, FXI.fire); } }
    if (state === CHARGE && MV === 'ram' && Math.random() < 0.6) spawnX(K_PHYS, sx(66 + P.pdx + Math.random() * 10), HY - 2, 20 + Math.random() * 60, -40 - Math.random() * 80, 0.6, FXI.water, { g: 300, floor: HY + 2 });   // 船头推开的白浪
    if (((state === CHARGE && MV === 'rise') || state === MOVE) && Math.random() < 0.5) spawnX(K_PHYS, sx(-24 + Math.random() * 60), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, FXI.water, { g: 260, floor: HY + 3 });
    if (state === DEATH && stT > INCOMING + 1.5 && Math.random() < 0.6) spawn(K_RISE, sx(-20 + Math.random() * 40), sy(-2), 0, -8, 0.5, FXI.water);   // 沉下去冒的泡
  }
  function fxReset() { emT = 0; dpT = 0; }
  function fxBack(f12) {   // 身前身后两道白浪花
    const x0 = sx(-48), x1 = sx(52), R = FXR[FXI.water];
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { if (((x + (f12 >> 1)) % 4) === 0) E.put(x, HY + 1, R[P.hot ? 1 : 2]); if (((x - f12) % 7) === 0) E.put(x, HY + 3, R[3]); }
  }
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'anchor'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const bub = (s, t, n, w, p) => { for (let i = 0; i < n; i++) { const f = 260 + Math.random() * 380; s.tone(t + i * (0.04 + Math.random() * 0.05), 'sine', f, 0.07, 0.03 * w, { to: f * 2.2, pan: p }); } };   // 咕嘟咕嘟的气泡
  const VOICES = {
    captainChain: (s, t, w, p) => { for (let i = 0; i < 6; i++) { s.ring(t + i * 0.065, 1100 + ((i * 373) % 500), 0.14, 0.025 + 0.02 * w, { pan: p }); s.nz(t + i * 0.065, 0.04, 'bandpass', 3600, 2, 0.05 * w, { pan: p }); } s.thud(t, 120, 60, 0.2, 0.08 * w, { pan: p }); },
    captainSplash: (s, t, w, p) => { s.thud(t, 90, 34, 0.5, 0.24 * w, { pan: p }); s.nz(t, 0.9, 'lowpass', 2600, 0.7, 0.2 * w, { pan: p, to: 300, a: 0.005 }); s.whoosh(t + 0.02, 0.6, 3000, 500, 0.08 * w, { pan: p }); s.crackle(t + 0.1, 0.5, 2600, 0.05 * w, { pan: p }); bub(s, t + 0.3, 5, w, p); },
    captainCannon: (s, t, w, p) => { s.thud(t, 120, 30, 0.6, 0.3 * w, { pan: p }); s.nz(t, 0.5, 'lowpass', 1200, 0.8, 0.24 * w, { pan: p, src: 'brown', to: 200 }); s.crackle(t, 0.25, 1800, 0.08 * w, { pan: p }); s.rumble(t + 0.05, 0.8, 0.12 * w, { pan: p }); },
    captainFuse: (s, t, w, p) => { s.nz(t, 1.0, 'highpass', 4800, 0.7, 0.035 * w, { pan: p, a: 0.08 }); s.crackle(t + 0.1, 0.9, 3200, 0.03 * w, { pan: p }); },
    captainHorn: (s, t, w, p) => { s.brass(t, 34, 1.3, 0.12 * w, { pan: p, bright: 900, rev: 0.5 }); s.brass(t, 41, 1.3, 0.07 * w, { pan: p, bright: 700 }); s.tone(t, 'sawtooth', 58, 1.4, 0.05 * w, { lp: 400, pan: p, rev: 0.5 }); },   // 雾号
    captainSurge: (s, t, w, p) => { s.rumble(t, 2.0, 0.14 * w, { pan: p }); s.riser(t, t + 2.0, 300, 2200, 0.05 * w, { pan: p }); s.whoosh(t + 0.8, 1.2, 600, 2800, 0.06 * w, { pan: p }); bub(s, t, 8, w, p); },
    captainGurgle: (s, t, w, p) => { bub(s, t, 7, w, p); s.nz(t, 0.35, 'bandpass', 700, 3, 0.07 * w, { pan: p }); s.tone(t, 'sawtooth', 95, 0.35, 0.04 * w, { lp: 500, to: 70, pan: p }); s.nz(t + 0.2, 0.3, 'lowpass', 1400, 0.7, 0.05 * w, { pan: p }); },
    captainRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 110, 1.2, 0.1 * w, { to: 68, vib: [6, 40, 0.2], lp: 1100, pan: p, rev: 0.5 }); s.nz(t, 1.1, 'bandpass', 520, 1.5, 0.12 * w, { pan: p, a: 0.05 }); s.choir(t, [36, 43], 1.3, 0.05 * w, { dark: 1, pan: p }); bub(s, t + 0.4, 6, w, p); },
    captainDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 150, 1.8, 0.08 * w, { to: 45, vib: [5, 50, 0.1], lp: 800, pan: p, rev: 0.7 }); bub(s, t + 0.5, 12, w, p); s.rumble(t + 0.6, 1.4, 0.1 * w, { pan: p }); s.bell(t + 0.9, 57, 2.6, 0.06 * w, { pan: p }); },   // 最后一声是沉下去的船钟
  };

  return {
    name: '溺亡船长', HX, R_EL: FXI.water, DUR, hero, P, GLOW_MATS: [GL1, GL2, GL3, FIRE1, FIRE2], HIT_POINT: [0, -34], EVENTS, MAX_H: 110, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'beast', how: 'dissolve', pal: 'water', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['anchor', 'cannons', 'ram', 'poke', 'rise', 'p2'], MOVE_NAMES: { anchor: '沉锚', cannons: '炮击', ram: '全速前进（第二阶段）', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.55, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.3, 0.9, 1.5, 1.9], 'anchor'], [CAST, [0, 2 / 12], 'anchor'], [RECOVER, [0.3], 'anchor'],
      [CHARGE, [0.2, 0.6, 1.1], 'cannons'], [CAST, [0, 2 / 12, 4 / 12], 'cannons'], [RECOVER, [0.3], 'cannons'],
      [CHARGE, [0.3, 0.9, 1.6], 'ram'], [CAST, [0, 2 / 12], 'ram'], [RECOVER, [0.4], 'ram'], [CHARGE, [0.7], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 2 / 12, 4 / 12, 1.8], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.6, 1.9, 2.2, 2.5, 2.8]]],
    SINK: 27, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
