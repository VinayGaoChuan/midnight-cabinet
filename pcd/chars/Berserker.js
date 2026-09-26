// 狂战士（部队 · 科技 · 战士 · 神话 · 近战 408）：角斗士打到最后的「竞技场之王」——巨型、胸背厚如桶、右半身因巨臂明显更大、微前倾，古铜赤膊 + 暗红战裙。
// 识别（全部承接角斗士）：右臂机械护臂长成黑铁巨型动力臂，前端弹出 16 格能量战刃（黑铁刃骨 + 红白能量刃面）· 鳍冠盔的鱼鳍冠从中间裂成两片后掠鳍、
//   中间喷一道红色能量焰（高出头 6 格）· 背后两根蒸汽排管高出肩 5 格 · 肩上一圈破盔甲 + 红缠腰布拼成的战利品披挂 · 护臂刻度灯变成从肩到腕一整条（20 档）。
// 攻击 = 扫（动力臂从身后抡出一道大弧横扫）；技能 = 特性「决斗者」能量战刃版：刻度灯从肩到腕亮满、刃面逐段由暗红变白、排管喷长汽、身体后拧 →
//   侧 / 正 / 侧镜像 / 背 四张图转一圈的回旋大横扫（贴地环形拖影）→ 目标身上 5 道交叠斩痕 + 大十字爆。
// 死亡 = 立死：挨打后不倒，把能量刃插进地里撑着僵立 → 刃面能量从刃尖往回熄灭、刻度灯一格格灭 → 轰然前倒，裂冠盔滚落。
PCD.define('Berserker', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_SPIRAL_PT, K_EMBER, K_PHYS,
    spawn, spawnX, burst, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx } = E;
  const RD = Math.round, PX = parts.px, F = parts.FREE;

  // ───── 元素：能量战刃 · 赤电刃光（blood 21 白 → 淡粉 → 红 → 暗红 → 酒红）；蒸汽用 dust 前两级的浅灰（自建 steam 色阶，只在排管汽上用）─────
  const R_EL = FXI.blood, EL = FXR[R_EL];
  const R_STEAM = E.fxRamp('steam', [21, 17, 6, 18, 7]);

  // ───── 材质 ─────
  const M = parts.mats(E, {
    skin: 'skinDark',                                  // 古铜肤
    iron: 'iron',                                      // 黑铁动力臂、刃骨、排管、胫甲
    brass: 'gold',                                     // 黄铜镶件、盔、排管箍
    skirt: { r: 'blood', band: 2 },                    // 暗红战裙（大面积）
    cloth: 'crimson',                                  // 红缠腰 / 战利品披挂的红布
    steel: 'steel',                                    // 披挂上的破盔甲片
    hair: 'boot',
    light: { r: 'fire', flat: 1 },                     // 刻度灯（发光体）
    energy: { r: [56, 57, 58, 21], flat: 1 },          // 能量刃面 / 盔顶能量焰（发光体）：暗红 → 红 → 粉 → 白
    eye: { r: 'fire', flat: 1 },
    ink: { r: 'ink', flat: 1 },
  });
  const BODY = { body: 'giant', leg: 12, torso: 13, head: 7, headW: 7, sw: 6, arm: 13, lw: 4, limb: 1.5, stride: 4, lift: 2, waist: 1, neck: 1, fall: 'front' };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(104, 62, 48, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 14, 20], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['skin', 'hair', 'ink', 'eye', 'light', 'energy', 'iron']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }
  const H2 = Math.PI / 2, BLADE = 16;

  // ───── 姿势 ─────
  // lit 刻度灯 0–20 · fill 刃面白热段 0–4（从刃根算）· bl 刃面有能量的格数 0–16（死亡时从刃尖往回熄）· flame 盔顶能量焰加高 0–3 · fl 焰尖抖动相位
  // spin 回旋视图 0 侧 / 1 正面 / 2 背面 · hatX / hatY / hatR 掉落的裂冠盔
  const P = { hx: 0, hy: 0, a: 0, aq: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, hatX: 0, hatY: 0, hatR: 0, lit: 0, fill: 0, bl: 16, flame: 0, fl: 0, spin: 0,
    dq: 0, dq48: 0, st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head, crouch) => ({ hx, hy, a, bhx, bhy, lean, head, crouch });
  const K_IDLE = K(11, -15, 1.11, -2, -12, 1, 0, 0);          // 微前倾，刃斜指前上
  const K_WIND = K(-4, -30, -0.46, -4, -15, -1, -1, 1);       // 攻击预兆：动力臂抡到身后高处
  const K_SWEEP = K(15, -18, 2.03, 0, -14, 2, 1, 1);          // 横扫出手：刃扫到前下
  const K_FOLLOW = K(12, -13, 2.36, 0, -13, 2, 1, 1);
  const K_COIL = K(-7, -19, -H2, 3, -17, -1, -1, 2);          // 蓄力：身体后拧，刃平指身后
  const K_SPIN = K(15, -18, H2, -5, -18, 0, 0, 1);            // 回旋横扫（侧面那几张）：刃水平前伸
  const K_HURT = K(8, -14, 0.6, -4, -13, -1, -1, 0);
  const K_PLANT = K(12, -10, Math.PI - 0.46, 1, -12, 1, 1, 2); // 立死：刃插进地里撑着
  const K_LIE = K(4, -14, Math.PI, -2, -12, 0, 0, 0);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY = E.keyer([['hx', -32, 31], ['hy', -64, 15], ['aq', -32, 32], ['bhx', -32, 31], ['bhy', -64, 15], ['lean', -1, 2], ['head', -1, 1], ['crouch', 0, 7], ['bob', 0, 1],
    ['lit', 0, 20], ['fill', 0, 4], ['bl', 0, 16], ['flame', 0, 3], ['fl', 0, 1], ['spin', 0, 2], ['st', 0, 8], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1], ['beard', -3, 3], ['sway', -2, 2],
    ['gem', 0, 4], ['glint', 0, 1], ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['hatX', -8, 23], ['hatY', 0, 7], ['hatR', 0, 3], ['dq48', 0, 48], ['bx', -16, 15]]);
  const SWAY_IDLE = [0, 1, 0, -1];
  const T_SWEEP = 2 / 12, T_HIT = 4 / 12, T_PLANT = INCOMING + 0.3, T_LAND = INCOMING + 1.0;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 0; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0;
    P.hatX = 0; P.hatY = 0; P.hatR = 0; P.lit = 6; P.fill = 0; P.bl = BLADE; P.flame = 0; P.fl = f12 & 1; P.spin = 0; P.dq = 0; P.bob = 0; P.flip = 0; P.mx = 0;
    const idle = () => {                                                   // 喘粗气：双肩一起一伏，能量刃面嗡嗡抖动
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.beard = P.bob ? 1 : -1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      P.glint = (f12 % 5) === 0 ? 1 : 0;
      const lp = tq % DUR[IDLE]; if (lp >= 1.6 - 1e-6 && lp < 2.0) { P.head = -1; P.bob = 1; P.lean = 2; P.flame = 1; P.glint = 1; }   // 待机个性：一口长长的粗气
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                // 重踏冲步：身体前压、大步砸地，接触帧顿挫 1 格
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f); P.lean = 2; P.crouch = f & 1 ? 0 : 1;
      P.a = K_IDLE.a + P.step * 0.12; P.hx = K_IDLE.hx + P.step; P.glint = f & 1;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                            // 扫：动力臂从身后抡出大弧
      const fr = f12of(t);
      if (fr < 2) { setK(K_IDLE, K_WIND, fr ? 1 : 0.6); P.beard = 1; P.gem = 1; P.lit = 8; }
      else if (fr === 2) { setK(K_SWEEP, K_SWEEP, 0); P.bx = 3; P.beard = -2; P.sway = -1; P.gem = 2; P.rim = 2; P.lit = 10; P.fill = 1; }
      else if (fr < 5) { setK(K_FOLLOW, K_FOLLOW, 0); P.bx = 3; P.beard = -1; P.gem = 1; P.lit = 10; }
      else { const q = clamp01((tq - 5 / 12) / 0.33); setK(K_FOLLOW, K_IDLE, ease.inOut(q)); P.bx = RD(3 * (1 - q)); P.lit = q < 0.5 ? 8 : 6; }
    } else if (st === CHARGE) {                                            // 刻度灯从肩到腕亮满、刃面逐段变白、排管喷长汽、焰窜高、身体后拧
      const q = ease.inOut(clamp01(tq / 0.7)); setK(K_IDLE, K_COIL, q);
      P.lit = Math.min(20, 6 + Math.floor(tq / 1.1 * 14 + 1e-6)); P.fill = Math.min(4, Math.floor(clamp01((tq - 0.3) / 1.0) * 4 + 1e-6)); P.flame = Math.min(3, Math.floor(tq / 0.35 + 1e-6));
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = tq < 0.5 ? 2 : 3; P.beard = -2; P.sway = (f12 & 1) ? -1 : 0;
    } else if (st === CAST) {                                              // 回旋大横扫：侧 → 正 → 侧镜像 → 背 → 侧（定格）
      const fr = Math.min(5, f12of(t)), v = fr >= 4 ? 0 : fr;
      setK(K_SPIN, K_SPIN, 0); P.lit = 20; P.fill = 4; P.flame = 3; P.gem = 3; P.rim = 3; P.beard = (fr & 1) ? 1 : -1; P.sway = (fr & 1) ? 1 : -1;
      if (v === 1) P.spin = 1; else if (v === 2) P.flip = 1; else if (v === 3) P.spin = 2;
      if (fr >= 4) { P.bx = 2; P.lean = 1; P.beard = -2; }
    } else if (st === RECOVER) {                                           // 刃面从白褪回暗红，排管残汽
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_SPIN, K_IDLE, q); P.bx = RD(2 * (1 - q));
      P.lit = RD(20 - 14 * q); P.fill = Math.max(0, 4 - Math.floor(tq / 0.14 + 1e-6)); P.flame = q < 0.5 ? 2 : q < 0.8 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = h < 1 / 12 ? 1 : 0; P.flame = 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                             // 立死：插刃僵立 → 刃尖往回熄、刻度灯一格格灭 → 轰然前倒 → 盔滚落 → 消散
      const d = tq - INCOMING;
      if (d < 0) idle();
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.beard = 2; P.sway = 1; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 0 : 1; }
      else if (d < 0.85) {
        setK(K_PLANT, K_PLANT, 0); P.eyes = 1; P.beard = 1;
        const k = clamp01((d - 0.35) / 0.45); P.bl = RD(BLADE * (1 - k)); P.lit = RD(6 * (1 - k)); P.gem = d < 0.4 ? 1 : 0; P.flame = 0;
        if (d > 0.4) P.fl = 0;
      } else if (d < 1.0) { setK(K_PLANT, K_LIE, 0.5); P.lean = 2; P.crouch = 3; P.eyes = 1; P.bl = 0; P.lit = 0; P.gem = 4; P.bx = 1; }   // 往前栽
      else {
        setK(K_LIE, K_LIE, 0); P.lying = 1; P.eyes = 1; P.bl = 0; P.lit = 0; P.gem = 4; P.bx = 2; P.lift = d < 1.08 ? 3 : d < 1.16 ? 1 : 0;
        const hq = clamp01((d - 1.16) / 0.35); P.hatX = d < 1.16 ? 0 : RD(12 * ease.out(hq)); P.hatY = d < 1.16 ? 0 : RD(Math.sin(Math.min(1, hq * 2) * Math.PI) * 5); P.hatR = hq >= 1 || d < 1.16 ? 0 : f12of(d - 1.16) & 3;
        if (d >= 1.8) P.dq = clamp01((d - 1.8) / 0.7);
      }
      if (d >= 1.0) P.lying = 1;
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    const yo = P.lying ? 0 : P.bob + Math.min(3, RD(P.crouch));
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.crouch = RD(P.crouch); P.dq48 = RD(P.dq * 48); P.aq = RD(P.a / ASTEP);
    if (P.spin) { P.gx = (P.spin === 1 ? -24 : 24) + P.bx; P.gy = -19 - P.bob - 1; }
    else { const R = parts.rig(P, BODY), bg = bladeGeo(), c = parts.toSprite(R, bg.mid[0], bg.mid[1]); P.gx = c[0] + P.bx; P.gy = c[1] - P.lift; }
    KEY(P);
  }

  // ───── 画（部件从后往前）─────
  function bladeGeo() { const di = parts.snapDir(P.a); return { di, x0: P.hx, y0: P.hy, mid: parts.cell(di, P.hx, P.hy, 9), tip: parts.cell(di, P.hx, P.hy, BLADE) }; }
  // 候选部件：steamPipes —— 背后两根竖立的蒸汽排管（2 格宽黑铁管 + 黄铜箍 + 喇叭管口），高出肩 up 格；前面那根高 1 格。用 rig 落笔，倒地跟着身体转
  function steamPipes(R, up) {
    const e = parts.edges(R, R.yS + 2), x0 = e[0] - 1;
    for (const [dx, hh] of [[-1, up], [2, up + 1]]) {
      E.part(); const x = x0 + dx, top = R.yS - hh;
      for (let y = top; y <= R.yS + 5; y++) { PX(E, R, x, y, M.iron, 0); PX(E, R, x + 1, y, M.iron, 0); }
      PX(E, R, x - 1, top, M.brass, 3); PX(E, R, x, top, M.brass, 4); PX(E, R, x + 1, top, M.brass, 3); PX(E, R, x + 2, top, M.brass, 2);   // 喇叭管口
      PX(E, R, x, top + 1, M.iron, 1); PX(E, R, x + 1, top + 1, M.iron, 1);
      for (const k of [3, 6]) { PX(E, R, x, top + k, M.brass, 4); PX(E, R, x + 1, top + k, M.brass, 3); }                                   // 黄铜箍
    }
  }
  // 候选部件：waistTails —— 同角斗士：腰后两条红缠腰带尾（这里更长一格），随 beard 甩
  function waistTails(R) {
    E.part(); const e = parts.edges(R, R.yHip - 1), x0 = e[0], y = R.yHip - 1, b = RD(P.beard || 0), lift = b < 0 ? -1 : b > 0 ? 1 : 0;
    for (let k = 1; k <= 5; k++) PX(E, R, x0 - k, y + (k >= 3 ? 1 + (lift < 0 ? -1 : 0) : 0) + (k >= 5 && lift > 0 ? 1 : 0), M.cloth, k === 5 ? 4 : 0);
    for (let k = 1; k <= 4; k++) PX(E, R, x0 - k, y + 1 + (k >= 3 ? 1 + (lift > 0 ? 1 : 0) - (lift < 0 ? 1 : 0) : 0), M.cloth, k === 4 ? 2 : 0);
  }
  // 候选部件：warSkirt —— 暗红战裙（腰下一圈条状皮裙 pteruges：每 2 列一道竖缝、下摆条尖长短交替，随 sway 摆），band 2 大面积材质
  function warSkirt(R) {
    E.part(); const y0 = R.yHip - 1, n = 5, sw = RD(P.sway || 0);
    for (let k = 0; k < n; k++) {
      const y = y0 + k, e = parts.edges(R, Math.min(y, R.yHip)), s = k >= 3 ? sw : 0, L = e[0] - 1 - (k >= 2 ? 1 : 0) + s, Rr = e[1] + 1 + (k >= 3 ? 1 : 0) + s;
      for (let x = L; x <= Rr; x++) { if (k === n - 1 && ((x - s) & 1)) continue; PX(E, R, x, y, M.skirt, k >= 1 && ((x - s) & 1) === 0 && k < n - 1 ? 2 : 0); }
    }
    const e = parts.edges(R, R.yHip); PX(E, R, e[1] - 1, y0 + 1, M.brass, 4); PX(E, R, e[1] - 3, y0 + 1, M.brass, 3);        // 裙腰铜钉
  }
  // 候选部件：trophyMantle —— 战利品披挂：parts.mantle（红布）上缀几块破盔甲片（钢）和一枚断掉的小鳍冠（黄铜），同一部件
  function trophyMantle(R) {
    parts.mantle(E, R, P, { style: 'plain', mat: M.cloth, len: 5 });
    const y0 = R.yS, e1 = parts.edges(R, y0 + 2), e3 = parts.edges(R, y0 + 3);
    PX(E, R, e1[0] - 1, y0 + 2, M.steel, 4); PX(E, R, e1[0], y0 + 2, M.steel, 3); PX(E, R, e1[0], y0 + 3, M.steel, 2);           // 破肩甲片
    PX(E, R, e3[0] + 3, y0 + 3, M.steel, 3); PX(E, R, e3[0] + 4, y0 + 3, M.steel, 4); PX(E, R, e3[0] + 3, y0 + 4, M.steel, 2);
    PX(E, R, e1[1] - 2, y0 + 1, M.brass, 4); PX(E, R, e1[1] - 1, y0 + 2, M.brass, 3);                                            // 断鳍冠残片
    PX(E, R, R.hx1, y0, M.brass, 4);                                                                                            // 领扣
  }
  // 候选部件：splitFinHelm —— 裂冠盔：同角斗士的格栅面罩盔放大一号（头宽 7），鱼鳍冠从中间裂成前后两片后掠鳍；两片鳍之间喷一道能量焰（单独一个发光部件）。
  //   T = 以头顶中线为原点的落笔变换；worn 0 = 掉在地上的空盔（没有脸、没有焰）
  const FIN_A = [[2, -2], [2, -3], [2, -4], [1, -5], [1, -6], [0, -7]], FIN_Ai = [[1, -2], [1, -3], [1, -4], [0, -5]];
  const FIN_B = [[-4, -2], [-5, -3], [-6, -4], [-7, -5], [-8, -5], [-9, -6]], FIN_Bi = [[-3, -2], [-4, -3], [-5, -4], [-6, -4]];
  function splitFinHelm(T, worn) {
    const br = M.brass;
    E.part();
    parts.run(E, T, -1, -2, 2, br, 0); parts.run(E, T, 0, -3, 3, br, 0); parts.run(E, T, 1, -4, 4, br, 2);
    for (let y = 2; y <= 5; y++) parts.run(E, T, y, -4, 0, br, 0);
    PX(E, T, -3, 6, br, 2); PX(E, T, -2, 6, br, 2); PX(E, T, -1, 0, br, 4); PX(E, T, -2, 0, br, 4); PX(E, T, 0, 1, br, 4); PX(E, T, -1, 3, br, 4);
    PX(E, T, -2, 4, br, 2); PX(E, T, -3, 3, br, 2);                                                                             // 盔上的旧凹痕
    for (let y = 2; y <= 5; y++) { PX(E, T, 1, y, br, 3); PX(E, T, 2, y, M.iron, 1); PX(E, T, 3, y, br, 4); PX(E, T, 4, y, br, 2); }
    if (worn) { if (!P.eyes) PX(E, T, 2, 2, M.eye, P.flash ? 4 : 3); parts.run(E, T, 6, 0, 3, M.skin, 0); PX(E, T, 3, 6, M.skin, 2); }
    E.part();
    for (let i = 0; i < FIN_A.length; i++) PX(E, T, FIN_A[i][0], FIN_A[i][1], br, i === 3 ? 4 : 3);
    for (const c of FIN_Ai) PX(E, T, c[0], c[1], br, 2);
    E.part();
    for (let i = 0; i < FIN_B.length; i++) PX(E, T, FIN_B[i][0], FIN_B[i][1], br, i === 2 ? 4 : 3);
    for (const c of FIN_Bi) PX(E, T, c[0], c[1], br, 2);
    if (worn && P.bl > 0) {                                                                    // 裂缝里喷出的能量焰：高 6 + flame，下宽上尖、焰尖抖动
      E.part(); const H = 6 + (P.flame || 0), g = P.gem;
      for (let k = 0; k < H; k++) {
        const y = -2 - k, q = k / H, tone = q < 0.3 ? 2 : q < 0.7 ? 3 : 4;
        if (q < 0.45) { PX(E, T, -2, y, M.energy, g >= 2 ? Math.min(4, tone + 1) : tone); PX(E, T, -1, y, M.energy, tone); if (k < 2) PX(E, T, 0, y, M.energy, 1); }
        else PX(E, T, -1 - ((k + P.fl) & 1) * (q > 0.75 ? 1 : 0), y, M.energy, tone);
      }
    }
  }
  const HELM_BOT = [6, 9, 7, 4];
  // 候选部件：powerArm —— 巨型动力臂：黑铁上臂（背侧活塞杆）+ 更粗的黑铁前臂（黄铜镶边分节）、从肩到腕一整条刻度灯（lit / 20 档）、
  //   大肩甲（黑铁 + 黄铜镶边，高出肩 2 格）；拳 3×3 黑铁单独画。几何：两段 IK 同 parts.arm
  function armGeo(R) {
    const sx = R.sFx, sy = R.sFy, hx = P.hx, hy = P.hy, L = R.arm, dx = hx - sx, dy = hy - sy, d = Math.hypot(dx, dy) || 1;
    let ex = sx + dx / 2, ey = sy + dy / 2;
    if (d < L - 0.5) { const h = Math.sqrt(Math.max(0, L * L / 4 - d * d / 4)), nx = -dy / d, ny = dx / d, s = (-nx + ny * 0.8) >= 0 ? 1 : -1; ex += nx * s * h; ey += ny * s * h; }
    return { sx, sy, ex, ey, hx, hy };
  }
  function lightsOn(n) { return Math.round(n * (P.lit || 0) / 20); }
  function powerArm(R) {
    const g = armGeo(R), ir = M.iron;
    E.part();
    parts.sweep(E, R, g.sx, g.sy, g.ex, g.ey, 2.0, 2.2, ir, 0);
    const fx = g.hx - g.ex, fy = g.hy - g.ey, fl = Math.hypot(fx, fy) || 1;
    parts.sweep(E, R, g.ex, g.ey, g.hx - fx / fl * 1.5, g.hy - fy / fl * 1.5, 2.6, 2.9, ir, 0);
    for (const q of [0.35, 0.7]) { const cx = g.ex + fx * q, cy = g.ey + fy * q; for (let k = -2; k <= 2; k++) PX(E, R, cx - fy / fl * k, cy + fx / fl * k, M.brass, k === -2 ? 4 : 3); }   // 黄铜分节箍
    PX(E, R, g.ex, g.ey, M.brass, 4); PX(E, R, g.ex + 1, g.ey, M.brass, 2);                   // 肘关节铜轴
    const cells = [], seen = new Set();                                                        // 刻度灯：沿上臂 + 前臂的上沿一路排到手腕
    const seg = (x0, y0, x1, y1, off) => { const qx = x1 - x0, qy = y1 - y0, ql = Math.hypot(qx, qy) || 1, nx = qy / ql, ny = -qx / ql, n = Math.ceil(ql * 1.3);
      for (let i = 0; i <= n; i++) { const X = RD(x0 + qx * i / n + nx * off), Y = RD(y0 + qy * i / n + ny * off), k = X + ',' + Y; if (!seen.has(k)) { seen.add(k); cells.push([X, Y]); } } };
    seg(g.sx, g.sy, g.ex, g.ey, -1.2); seg(g.ex, g.ey, g.hx - fx / fl * 2, g.hy - fy / fl * 2, -1.8);
    const on = lightsOn(cells.length), hot = P.gem >= 2 && P.gem < 4;
    for (let i = 0; i < cells.length; i++) PX(E, R, cells[i][0], cells[i][1], i < on ? M.light : M.iron, i < on ? (hot || i === on - 1 ? 4 : 3) : 1);
    E.part();                                                                                  // 大肩甲
    const x = g.sx - 1, y = g.sy;
    parts.run(E, R, y - 5, x - 2, x + 1, M.brass, 0); parts.run(E, R, y - 4, x - 3, x + 2, ir, 0); parts.run(E, R, y - 3, x - 4, x + 3, ir, 0);
    parts.run(E, R, y - 2, x - 4, x + 3, ir, 0); parts.run(E, R, y - 1, x - 3, x + 3, ir, 0); parts.run(E, R, y, x - 3, x + 3, M.brass, 3);
    PX(E, R, x - 2, y - 5, M.brass, 4); PX(E, R, x - 3, y - 3, ir, 4); PX(E, R, x + 1, y - 2, M.brass, 4); PX(E, R, x - 1, y - 1, M.brass, 4);
  }
  // 候选部件：energyBlade —— 从手腕伸出的能量战刃（吸附斜率，3 格宽：上沿能量刃口 · 能量刃面 · 黑铁刃骨），刃尖两格收窄；
  //   bl = 有能量的格数（从刃根算，之外是熄灭的黑铁），fill 0–4 = 从刃根起白热的四分段，gem 档决定刃面亮度，glint = 嗡嗡抖动的一格闪光
  function energyBlade(T, P2) {
    const di = parts.snapDir(P2.a), x0 = P2.hx, y0 = P2.hy, bl = P2.bl, fillN = (P2.fill || 0) * 4, g = P2.gem, gl = P2.glint;
    E.part();
    parts.bar(di, x0, y0, 1, 2, 3, (k, j, X, Y) => PX(E, T, X, Y, M.brass, j === 0 ? 4 : j === 1 ? 3 : 2));   // 刃根铜箍
    parts.bar(di, x0, y0, 3, BLADE, 3, (k, j, X, Y) => {
      const kk = k - 2; if (k >= BLADE - 1 && j === 2) return; if (k === BLADE && j === 1) return;
      if (j === 2) { PX(E, T, X, Y, M.iron, k === BLADE - 2 ? 4 : 3); return; }               // 黑铁刃骨
      if (kk > bl) { PX(E, T, X, Y, M.iron, j === 0 ? 3 : 2); return; }                       // 熄灭的刃面
      let tone = j === 0 ? 2 : 1;
      if (kk <= fillN) tone = j === 0 ? 4 : 3; else if (g === 1) tone = j === 0 ? 3 : 2; else if (g >= 2 && g < 4) tone = j === 0 ? 4 : 3;
      if (gl && ((kk + P2.fl * 3) % 6) === 0) tone = Math.min(4, tone + 1);
      PX(E, T, X, Y, M.energy, tone);
    });
  }
  // 回旋的正面 / 背面两张（back 0 = 正面：动力臂在画面左、刃向左平伸；1 = 背面：动力臂在画面右，排管、披挂的背面朝镜头）
  function drawSpinView(back) {
    const cs = back ? 1 : -1, y0 = -1 - P.bob, yH = -11 + y0 + 1, yS = -24 + y0 + 1, hy = yS - 2, top = hy - 6;
    const run = (y, a, b, m, t) => parts.run(E, F, y, a, b, m, t), px = (x, y, m, t) => PX(E, F, x, y, m, t);
    const pipes = () => { for (const [x, hh] of [[-5, 5], [3, 6]]) { E.part(); for (let y = yS - hh; y <= yS + 5; y++) { px(x, y, M.iron, 0); px(x + 1, y, M.iron, 0); } run(yS - hh, x - 1, x + 2, M.brass, 3); px(x, yS - hh, M.brass, 4); px(x, yS - hh + 3, M.brass, 4); px(x + 1, yS - hh + 3, M.brass, 3); } };
    if (!back) pipes();
    E.part();                                                                                  // 后面那只（不拿刃的）手臂：往外下垂
    parts.sweep(E, F, -cs * 7, yS + 2, -cs * 11, yS + 10, 1.4, 1.3, M.skinD, 0); parts.rect(E, F, -cs * 11 - 1, yS + 10, 3, 3, M.skinD, 0);
    E.part();                                                                                  // 两条腿 + 胫甲（外八）
    for (const s of [-1, 1]) { const a = s < 0 ? -6 : 2; for (let y = yH + 1; y <= 0; y++) run(y, a + (y > -3 ? s : 0), a + 3 + (y > -3 ? s : 0), y > -6 ? M.iron : M.skin, 0); px(a + (s < 0 ? 0 : 3), -6, M.iron, 4); }
    E.part();                                                                                  // 躯干：倒三角
    for (let y = yS; y <= yH; y++) { const q = (y - yS) / (yH - yS), w = RD(9 - 4 * q); run(y, -w, w - 1, M.skin, 0); }
    if (!back) { run(yS + 4, -5, -1, M.skin, 2); run(yS + 4, 1, 4, M.skin, 2); for (let y = yS + 6; y <= yH - 2; y++) px(0, y, M.skin, 2); run(yS + 8, -2, 2, M.skin, 2); run(yS + 10, -2, 2, M.skin, 2); px(-4, yS + 2, M.skin, 4); px(3, yS + 2, M.skin, 4); }
    else { for (let y = yS + 2; y <= yH - 1; y++) px(0, y, M.skin, 2); px(-4, yS + 3, M.skin, 4); px(3, yS + 3, M.skin, 4); run(yS + 6, -6, -3, M.skin, 2); run(yS + 6, 2, 5, M.skin, 2); }
    run(yH, -6, 5, M.cloth, 0); px(0, yH, M.brass, 4);                                         // 缠腰 + 扣
    E.part();                                                                                  // 战裙
    for (let k = 1; k <= 4; k++) for (let x = -7 - (k >> 1); x <= 6 + (k >> 1); x++) { if (k === 4 && (x & 1)) continue; px(x, yH + k, M.skirt, k < 4 && !(x & 1) ? 2 : 0); }
    E.part();                                                                                  // 战利品披挂
    for (let k = 0; k < 4; k++) run(yS - 1 + k, -9 + (k === 0 ? 2 : 0), 8 - (k === 0 ? 2 : 0), M.cloth, 0);
    for (let x = -9; x <= 8; x += 3) px(x, yS + 3, M.cloth, 2);
    px(-7, yS + 1, M.steel, 4); px(-6, yS + 1, M.steel, 3); px(5, yS, M.steel, 4); px(6, yS + 1, M.steel, 3); px(-1, yS, M.brass, 4);
    if (back) { E.part(); for (let k = -1; k <= 1; k++) px(k, yS + 2, M.cloth, 3); pipes(); }
    E.part();                                                                                  // 头：正面是格栅面罩 + 两只眼光，背面是盔后 + 护颈
    run(top - 1, -2, 2, M.brass, 0); for (let y = top; y <= hy; y++) run(y, -3, 3, M.brass, y === top + 1 ? 2 : 0); px(-2, top, M.brass, 4);
    if (!back) { for (let y = top + 2; y <= hy - 1; y++) for (let x = -2; x <= 2; x++) px(x, y, (x & 1) ? M.iron : M.brass, (x & 1) ? 1 : 3); if (!P.eyes) { px(-1, top + 2, M.eye, 3); px(1, top + 2, M.eye, 3); } run(hy, -1, 1, M.skin, 0); }
    else { run(hy, -2, 2, M.brass, 2); px(-1, top + 3, M.brass, 4); }
    E.part(); for (const s of [-1, 1]) { px(2 * s, top - 2, M.brass, 3); px(3 * s, top - 3, M.brass, 3); px(3 * s, top - 4, M.brass, 4); px(4 * s, top - 5, M.brass, 3); px(2 * s, top - 3, M.brass, 2); }   // 裂开的两片鳍（V 字）
    E.part(); { const H = 6 + P.flame; for (let k = 0; k < H; k++) { const y = top - 1 - k, q = k / H, tone = q < 0.3 ? 3 : 4; if (q < 0.5) run(y, -1, 1, M.energy, k === 0 ? 2 : tone); else px((k + P.fl) & 1 ? 0 : (q > 0.8 ? -1 : 0), y, M.energy, 4); } }
    E.part();                                                                                  // 动力臂：水平平伸，刻度灯亮满
    const sx = cs * 8, sy = yS + 2, hx = cs * 17, hyA = yS + 4;
    parts.sweep(E, F, sx, sy, cs * 12, hyA, 2.1, 2.6, M.iron, 0); parts.sweep(E, F, cs * 12, hyA, hx - cs, hyA, 2.7, 2.8, M.iron, 0);
    for (let x = sx; x !== hx; x += cs) px(x, hyA - 3 + (Math.abs(x) < 12 ? -1 : 0) + (Math.abs(x) < 10 ? 1 : 0), M.light, 4);
    px(cs * 13, hyA, M.brass, 4); px(cs * 13, hyA + 1, M.brass, 3);
    E.part(); run(sy - 5, sx - 2, sx + 2, M.brass, 0); for (let y = sy - 4; y <= sy - 1; y++) run(y, sx - 4, sx + 3, M.iron, 0); run(sy, sx - 3, sx + 3, M.brass, 3);
    energyBlade(F, { a: cs * H2, hx: hx + cs * 2, hy: hyA, bl: BLADE, fill: 4, gem: 3, glint: 1, fl: P.fl });
    E.part(); parts.rect(E, F, hx - 1, hyA - 1, 3, 3, M.iron, 0); px(hx - 1, hyA - 1, M.iron, 4);
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.lift);
    if (P.spin) { drawSpinView(P.spin === 2 ? 1 : 0); return; }
    const R = parts.rig(P, BODY);
    steamPipes(R, 5);
    waistTails(R);
    parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.skinD, cuff: M.brassD, cuffStyle: 'bracer', hand: M.skinD, grip: 'big' });
    parts.legs(E, R, P, { style: 'greave', mat: M.skin, matD: M.skinD, boot: M.iron, bootD: M.ironD, bootH: 5 });
    parts.torso(E, R, P, { style: 'bare', mat: M.skin, belt: M.cloth, buckle: M.brass });
    warSkirt(R);
    trophyMantle(R);
    const HT = { r0: 0, tx: R.tx + R.hx, ty: R.ty + R.htop, rot: R.rot, ox: R.ox, oy: R.oy };
    if (R.lie && (P.hatX || P.hatY)) {
      parts.head(E, R, P, { mat: M.skin, eye: M.ink, face: 'square', age: 'rugged', nose: 'big', stubble: M.hairD });
      parts.hair(E, R, P, { style: 'short', mat: M.hair });
      const b = parts.toSprite(R, R.hx, R.htop);
      splitFinHelm({ r0: P.hatR, tx: b[0] + 4 + P.hatX, ty: -HELM_BOT[P.hatR] - P.hatY, rot: 0, ox: 0, oy: 0 }, 0);
    } else splitFinHelm(HT, 1);
    powerArm(R);
    energyBlade(R, P);
    parts.hand(E, R, P, { hand: M.iron, grip: 'big' });
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const DCX = DUMMY_X, DCY = HY - 16;
  let slashT = 9, spinT = 9, cutT = 9, puffAcc = 0, chargeAcc = 0, soulAcc = 0, lastStep = 0, lastBob = 0;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function puff(n, big) {                                                                      // 两根排管口喷汽
    const e0 = -6 - 1 + P.bx, tops = [[e0 - 1, -30], [e0 + 2, -31]];
    for (const [x, y] of tops) for (let i = 0; i < n; i++) spawnX(K_PHYS, wx(x + 0.5) + (Math.random() - 0.5), wy(y - P.bob), (Math.random() - 0.7) * 10, -(big ? 40 : 18) - Math.random() * 12, 0.4 + Math.random() * (big ? 0.5 : 0.3), R_STEAM, { dragX: 0.2, dragY: 0.3 });
  }
  function onEnter(s) {
    if (s === CAST) { spinT = 0; releaseMotes(); shake(0.28, 2); flash(0.05); for (let i = 0; i < 14; i++) spawn(K_DUST, wx(-12 + Math.random() * 24), HY - 1, (Math.random() - 0.5) * 60, -4 - Math.random() * 8, 0.4 + Math.random() * 0.3, FXI.dust); }
    if (s === RECOVER) puff(4, 0);
  }
  function releaseMotes() { E.releaseOrbit(40, 90, 0.3, 0.6, { pts: 1 }); }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SWEEP) {
      slashT = 0; fx.slash(wx(4 + P.bx), wy(-23), 19, -0.5, 2.3, 'blood', 0.2, 3, 2);
      burst(DCX - 5, wy(-14), 10, 30, 90, 0.15, 0.35, FXI.impact, 6); burst(DCX - 5, wy(-14), 6, 30, 70, 0.15, 0.35, R_EL, 6); hitDummy(0); puff(2, 0);
      sfx('swing', { kind: 'slash', w: 0.8 }); sfx('hit', { mat: 'flesh', w: 0.7 });
    }
    if (s === CAST && t === T_HIT) {                                                          // 命中：5 道交叠斩痕 + 大十字爆 + 外爆 36 + 大摇击退
      cutT = 0; fx.cross(DCX - 1, DCY, 10, 'blood', 0.35, 2);
      burst(DCX - 1, DCY, 36, 50, 150, 0.3, 0.75, R_EL, 14); hitDummy(1); shake(0.12, 1); sfx('impact', { pal: 'blood', w: 0.95 });
    }
    if (s === DEATH && t === T_PLANT) { for (let i = 0; i < 8; i++) spawn(K_DUST, wx(16) + (Math.random() - 0.5) * 6, HY - 1, (Math.random() - 0.5) * 30, -6 - Math.random() * 10, 0.4, FXI.dust); burst(wx(16), HY - 2, 8, 20, 60, 0.15, 0.3, R_EL, 8); }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 22; i++) spawn(K_DUST, HX - 14 + Math.random() * 40, HY - 1, (Math.random() - 0.5) * 40, -8 - Math.random() * 14, 0.4 + Math.random() * 0.5, FXI.dust);
      shake(0.14, 1); sfx('fall', { w: 0.9 });
    }
  }
  const EVENTS = [[], [], [T_SWEEP], [], [T_HIT], [], [], [T_PLANT, T_LAND], []];
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if ((state === IDLE || state === REVIVE) && P.bob !== lastBob) { if (P.bob === 0 && !P.dq) puff(state === IDLE && (stT % DUR[IDLE]) > 1.55 && (stT % DUR[IDLE]) < 2.05 ? 4 : 1, 0); lastBob = P.bob; }
    if (state === CHARGE) {
      puffAcc += dt * (stT > 0.4 ? 14 : 4); while (puffAcc >= 1) { puffAcc -= 1; puff(1, 1); }
      if (stT > 0.25) { chargeAcc += dt * (12 + 20 * clamp01(stT / DUR[CHARGE])); while (chargeAcc >= 1) { chargeAcc -= 1; spawnX(K_SPIRAL_PT, gx + (Math.random() - 0.5) * 36, gy + (Math.random() - 0.5) * 20, 0, 0, 9, R_EL, { a: Math.random() * 6.28, r: 12 + Math.random() * 8, w: 5, tx: gx, ty: gy, orbitR: 3 }); } }
    }
    if (state === RECOVER && stT < 0.5) { puffAcc += dt * 6; while (puffAcc >= 1) { puffAcc -= 1; puff(1, 0); } }
    if (state === MOVE && P.step !== lastStep) {
      if (P.step !== 0) { sfx('step', { w: 0.8 }); for (let i = 0; i < 4; i++) spawn(K_DUST, wx(P.step > 0 ? 6 : -5) + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 26, -4 - Math.random() * 8, 0.35 + Math.random() * 0.2, FXI.dust); puff(1, 0); }
      lastStep = P.step;
    }
    if (state === DEATH && stT > INCOMING + 1.8 && stT < INCOMING + 2.5) { soulAcc += dt * 32; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 12 + Math.random() * 40, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    slashT += dt; spinT += dt; cutT += dt;
  }
  function fxReset() { slashT = 9; spinT = 9; cutT = 9; puffAcc = 0; chargeAcc = 0; soulAcc = 0; lastStep = 0; lastBob = 0; }
  // 回旋拖影：贴地的扁椭圆（半径 12），拖影头和精灵同一帧转 90°（右 → 前 → 左 → 后 → 右）；转满一圈那一帧 3 格宽纯白，下一帧 1 格宽断续，再暗下去
  function spinTrail(back, f12) {
    if (spinT > 0.75) return;
    const fr = Math.floor(spinT * 12 + 1e-6), head = Math.min(4, fr) * H2, full = fr >= 4, cx = HX + 2, cy = FLOOR - 2;
    const w = fr === 4 ? 3 : fr === 5 ? 1 : fr > 5 ? 1 : 2;
    for (let s = 0; s <= (full ? 6.2832 : head) + 1e-6; s += 0.03) {
      const ang = full ? s : head - s, sn = Math.sin(ang); if ((sn < 0) !== back) continue;
      if (fr >= 5 && ((RD(s * 20) + f12) & 1)) continue;
      const age = full ? 0 : s / 6.2832, c = fr === 4 ? EL[0] : fr >= 6 ? EL[3] : fr === 5 ? EL[2] : age < 0.12 ? EL[0] : age < 0.4 ? EL[1] : EL[2];
      for (let o = 0; o < w; o++) put(RD(cx + Math.cos(ang) * (12 - o)), RD(cy + Math.sin(ang) * (4 - o * 0.3)), o === 0 ? c : EL[1]);
    }
  }
  function fxBack(f12) { if (P.rim >= 2 && !P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); }
  function fxMid(f12) { spinTrail(true, f12); }
  const CUTS = [[-6, -7, 6, 5], [-7, 3, 6, -6], [-5, -9, 3, 8], [-7, -1, 7, -2], [-3, -8, 5, 9]];
  function fxFront(f12) {
    spinTrail(false, f12);
    if (cutT < 0.55) {                                                                         // 5 道交叠斩痕：依次亮起（白 → 粉 → 红）再暗下去断开
      for (let i = 0; i < 5; i++) {
        const a = cutT - i * 0.04; if (a < 0) continue; const [x0, y0, x1, y1] = CUTS[i], n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
        const c = a < 0.08 ? EL[0] : a < 0.2 ? EL[1] : a < 0.35 ? EL[2] : EL[3];
        for (let k = 0; k <= n; k++) { if (a > 0.3 && ((k + i) & 1)) continue; put(RD(DCX - 1 + x0 + (x1 - x0) * k / n), RD(DCY + y0 + (y1 - y0) * k / n), c); }
      }
    }
  }

  return {
    name: '狂战士', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.light, M.energy, M.eye], HIT_POINT: [2, -20], EVENTS,
    REVIVE: { dy: -18, ramp: 'blood', big: 1 },
    SFX: { body: 'armor', how: 'topple', pal: 'blood', style: 'nova', w: 0.95 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
