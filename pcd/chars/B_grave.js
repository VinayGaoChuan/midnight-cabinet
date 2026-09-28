// 守墓人（最终首领，雾中小镇 · 墓园）：照 pcd/run/boss-standard.md §8 做的最终首领模块，结构抄 B_demon.js。
// 依据：附录 G「守墓人（兜帽、铁锹、背上墓碑）· 坟坑（泥土、墓碑）」；K('FB_grave')：铲地 shovel、掘墓 bury（把最弱的埋 5 秒），第二阶段 亡者起身。
// 设定卡：
// · 剪影：从坟坑里爬出来的上半身（原点 = 坟坑的土面）。一顶大兜帽（帽尖往后耷拉）占剪影的大头，帽洞里一张烂掉的灰绿僵尸脸，
//   两只深眼窝里亮着毒绿的光；背上用锈链子绑着三块墓碑（左后一个石十字架，挂一盏绿火提灯；中间一块圆顶大墓碑；右肩后一块小碑）；
//   手里一把比人还长的大铁锹（木柄、D 形握把、带锈的尖头锹面）——一眼认出是「扛铁锹、背墓碑的掘墓人」，和魔王的角 + 蝠翼完全不撞。
// · 主色：暗紫灰的破斗篷、灰绿的烂皮、冷蓝灰的墓碑、带锈的铁；光色：毒绿（眼、胸口肋骨里的魂火、提灯、第二阶段墓碑上的碑文）。
// · 招式：shovel 铲地（抡锹过头 → 一锹劈进土里，土浪 + 绿裂缝）· bury 掘墓（锹插进土 → 撬起一锹带魂火的坟土 → 往前甩出去）·
//   poke 重击（锹往后下方拉 → 由下往上撩）· rise 升起（双手扒着坑沿往上爬 → 张开双臂嚎叫）·
//   p2 第二阶段「亡者起身」（抱住胸口两声心跳 → 双手把铁锹竖着举过头顶嚎叫，碑文全亮）。hot1 之后碑文、魂火、烂皮裂纹一直亮。
// · 死亡：仰天哀嚎 → 趴在坑沿上 → 连人带墓碑沉回坟坑，只剩铁锹插在土里，最后化成灰和绿色的魂。
PCD.define('B_grave', (E) => {
  const { defDeep, defMat, ramp, fxRamp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 色阶（11 级，暗 → 亮；主体压暗，毒绿的光才跳得出来）─────
  const RSKIN = ['#060907', '#0f1612', '#18221b', '#223024', '#2d3e2e', '#3a4d38', '#4a5e44', '#5c7052', '#718462', '#8c9c78', '#aeb898'];   // 灰绿烂皮
  const RCLOAK = ['#07060a', '#100e15', '#18151f', '#211d2a', '#2b2635', '#363041', '#433b4f', '#51495e', '#61586f', '#746a82', '#8a7f98'];  // 暗紫灰破斗篷
  const RSTONE = ['#07090b', '#11161a', '#1b2227', '#262e34', '#323b42', '#3f4950', '#4d5860', '#5d6870', '#6f7a81', '#848e94', '#a2aaae'];  // 冷蓝灰墓碑
  const RMOSS = ['#0a1006', '#142009', '#1f310e', '#2b4413', '#395818', '#4a6c1e', '#5e8226', '#779a32'];                                      // 青苔
  const RRUST = ['#1a0a04', '#34160a', '#502410', '#6e3416', '#8c461e', '#a85a28'];                                                           // 铁锈
  const RDIRT = ['#0c0805', '#1a120b', '#281b10', '#362416', '#452e1c', '#553a23', '#66472b', '#785634', '#8c6840'];                          // 坟土
  const SKIN = defDeep(RSKIN, { depth: 7, dark: 1, amb: 0.1 }), SKIND = defDeep(RSKIN, { depth: 5, dark: 3, amb: 0.08 }), FACE = defDeep(RSKIN, { depth: 6, dark: 1, amb: 0.14 });
  const CLOAK = defDeep(RCLOAK, { depth: 8, dark: 1, amb: 0.1 }), CLOAKD = defDeep(RCLOAK, { depth: 6, dark: 3, amb: 0.08 });
  const STONE = defDeep(RSTONE, { depth: 5, amb: 0.12 }), STONED = defDeep(RSTONE, { depth: 4, dark: 2, amb: 0.1 }), MOSS = defDeep(RMOSS, { depth: 2, amb: 0.25 });
  const IRON = defDeep('bladesteel', { depth: 3, dark: 1, amb: 0.14 }), RUST = defDeep(RRUST, { depth: 2, amb: 0.25 }), WOOD = defDeep('hide', { depth: 2, amb: 0.16 });
  const BONE = defDeep('ivory', { depth: 3, amb: 0.14 }), DIRT = defDeep(RDIRT, { depth: 4, amb: 0.12 }), COAT = defDeep('hide', { depth: 8, dark: 1, amb: 0.1 }), COATD = defDeep('hide', { depth: 6, dark: 3, amb: 0.08 });   // 旧皮大衣
  const TX = ramp(['#0a1f0c', '#145a1c', '#28902a', '#52c83a', '#9cf05a', '#e0ffb0', '#ffffff']);                                               // 毒绿的光
  const TOX1 = defMat([TX[1], TX[2], TX[3], TX[4]], 1, 1), TOX2 = defMat([TX[2], TX[3], TX[4], TX[5]], 1, 1), TOX3 = defMat([TX[3], TX[4], TX[5], TX[6]], 1, 1);
  const GR = fxRamp('grave', ['#ffffff', '#c8ff8a', '#6ee04a', '#2a8a3a', '#0e2e1a']);                                                          // 特效：白 → 毒绿 → 暗
  const hero = new Sprite(220, 138, 110, 122);
  const HX = 115, DUR = [2.4, 2 / 3, 0.75, 1.3, 0.45, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { shovel: { 3: 1.3, 4: 0.45, 5: 0.7 }, bury: { 3: 1.2, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'shovel', HOT = 0;   // HOT：第二阶段「亡者起身」，碑文和魂火常亮
  const CORE = [TX[5], TX[4], TX[3]], GLO = [TX[4], TX[3], TX[2]], DIM = [TX[3], TX[2], TX[1]];
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: CORE, k: 1 }, { x: 0, y: 0, r: 0, ramp: GLO, k: 0.9 }, { x: 0, y: 0, r: 0, ramp: GLO, k: 0.8 }, { x: 0, y: 0, r: 0, ramp: DIM, k: 0.4 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[GR], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(256) };
  RIM.skip[TOX1] = RIM.skip[TOX2] = RIM.skip[TOX3] = 1;

  // ───── 姿势 ─────
  // 手：nx,ny 近手 / fx2,fy2 远手（空手时的落点）；铁锹：sgx,sgy 近手握的位置、sa 锹的朝向（握把 → 锹面）、fg 远手在锹柄上离近手多远；
  // hold 0 = 锹插在右边的土里、两手空着，1 = 两手握锹（插值时平滑过渡）
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'jaw', 'nx', 'ny', 'fx2', 'fy2', 'sgx', 'sgy', 'sa', 'fg', 'hold', 'load', 'glint', 'glow', 'eyes', 'flash', 'dq', 'hot', 'lan', 'breath', 'fly'];
  const HP = (sgx, sgy, sa, fg, lean, hd) => ({ sgx, sgy, sa, fg, hold: 1, nx: sgx, ny: sgy, fx2: sgx + Math.cos(sa) * fg, fy2: sgy + Math.sin(sa) * fg, lean, hd });
  const FP = (nx, ny, fx2, fy2, lean, hd) => ({ nx, ny, fx2, fy2, lean, hd, hold: 0, sgx: 54, sgy: -52, sa: 1.45, fg: 0 });
  const K = {
    idle: HP(22, -28, -1.22, -12, 0, 0),             // 锹竖在身前、锹面立在脸旁边（远手握在下面，胸口的魂火露出来）
    swingW: HP(-4, -30, 3.05, -12, -0.1, -0.1),      // 普攻：锹往后拉平
    swing: HP(34, -30, 0.12, -12, 0.25, 0.12),       // → 横着铲出去
    hoist: HP(28, -54, -1.75, -10, -0.1, -0.22),      // 铲地：锹竖着高高举过头顶
    slam: HP(44, -46, 1.2, -6, 0.36, 0.3),           // → 一锹劈进土里
    dig: HP(30, -44, 1.35, -10, 0.3, 0.25),          // 掘墓：锹插进土
    scoop: HP(0, -26, -0.25, 16, -0.12, -0.05),      // → 撬起一锹坟土
    fling: HP(24, -46, -0.7, 8, 0.3, 0.1),           // → 往前甩出去
    coil: HP(-8, -22, 2.9, -12, -0.05, 0.15),        // 重击：锹往后下方拉
    upper: HP(34, -50, -1.0, -12, 0.15, -0.1),       // → 由下往上撩
    raise: HP(18, -54, -1.45, -14, -0.1, -0.3),      // 亡者起身：锹竖着举过头顶
    climbA: FP(36, -4, -28, -12, 0.3, 0.3), climbB: FP(32, -14, -32, -3, 0.3, 0.3),
    wide: FP(46, -66, -40, -60, -0.15, -0.32),
    hunch: FP(10, -30, 2, -33, 0.35, 0.4),
    agony: FP(30, -80, -26, -78, -0.2, -0.42),
    limp: FP(28, 2, -22, 2, 0.5, 0.55),
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'sgx', 'sgy', 'sa', 'fg', 'hold', 'lean', 'hd'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 1; P.hot = HOT; P.mx = 0; P.flip = 0; }
  const MVI = { shovel: 0, bury: 1, poke: 2, rise: 3, p2: 4 };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12; P.fly = f12 % 24;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; P.lan = [0, 1, 2, 1, 0, -1, -2, -1][Math.floor(tt / 0.3) % 8]; P.glow = 1 + ((f12 >> 2) & 1);
      P.eyes = (f12 % 7 === 0 || f12 % 11 === 0) ? 1 : 2;                                                                                     // 眼里的绿光一跳一跳
      const lp = tt % DUR[IDLE]; if (lp >= 1.4 && lp < 2.15) { const k = Math.floor((lp - 1.4) * 12); P.hd = [0.5, 0.5, -0.1, 0.42, 0.42, 0.2, 0.1, 0.05, 0][k] || 0; P.jaw = k < 7 ? 2 : 0; P.lan = 2; } };   // 待机个性：僵尸脖子一抽一抽，张嘴哼一声
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.lan = [2, 0, -2, 0][f]; P.jaw = f & 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) pose(K.idle, K.swingW, ease.out(tq / 0.17));
      else if (tq < 0.25) { pose(K.swingW, K.swingW); P.glow = 2; P.eyes = 2; }
      else if (tq < 0.42) { pose(K.swing, K.swing); P.jaw = 2; P.glow = 3; P.eyes = 2; P.lan = -2; }
      else pose(K.swing, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3)));
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.45; P.lean = -0.12; P.jaw = 2; P.eyes = (f12 & 1) ? 2 : 0; P.flash = h < 1 / 12 ? 1 : 0; P.lan = -2; P.sgx -= 3; P.nx -= 3; P.fx2 -= 3; }
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.45 * (1 - q); P.lean = -0.12 * (1 - q); P.jaw = q < 0.5 ? 1 : 0; P.lan = q < 0.5 ? 1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 2; P.lan = (f12 & 1) ? 2 : -2; }
      else if (d < 1.4) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 3 : 1; P.glow = d < 1.1 ? 3 : 2 - ((f12 >> 1) & 1); P.eyes = d < 1.2 ? 2 : 1; P.lan = 1; }
      else { pose(K.limp, K.limp); P.jaw = 1; P.glow = d < 1.8 ? 1 : 0; P.eyes = d < 1.6 ? 1 : 0; P.by = Math.round(ease.in(clamp01((d - 1.5) / 0.9)) * 64); P.dq = d > 2.1 ? Math.round(clamp01((d - 2.1) / 0.45) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D), tr = (f12 & 1) ? 1 : -1;
    P.eyes = 2;
    if (MV === 'shovel') {
      if (st === CHARGE) { pose(K.idle, K.hoist, ease.out(clamp01(q / 0.45))); P.by = -Math.round(5 * ease.out(clamp01(q / 0.45))); P.glow = q < 0.4 ? 2 : 3; P.lan = q < 0.45 ? -2 : 1;
        if (q > 0.45) { P.sgx += tr; P.nx += tr; P.fx2 += tr; P.by += (f12 & 1); P.glint = (f12 >> 1) & 1 ? 2 : 1; } if (q > 0.8) { P.lean -= 0.04; P.jaw = 1; } }
      else if (st === CAST) { pose(K.slam, K.slam); P.by = 4; P.jaw = 3; P.glow = 3; P.lan = 2; }
      else { const k = clamp01((tq - 0.2) / 0.45); pose(K.slam, K.idle, ease.inOut(k)); P.by = Math.round(4 * (1 - k)); P.glow = 2; }
    } else if (MV === 'bury') {
      if (st === CHARGE) {
        if (q < 0.3) pose(K.idle, K.dig, ease.in(q / 0.3));
        else if (q < 0.5) { pose(K.dig, K.dig); P.by = 2; P.jaw = 1; }
        else if (q < 0.75) { pose(K.dig, K.scoop, ease.inOut((q - 0.5) / 0.25)); P.load = q > 0.55 ? 1 : 0; }
        else { pose(K.scoop, K.scoop); P.load = 2; P.sgx += tr; P.nx += tr; P.fx2 += tr; P.by = -(f12 & 1); P.jaw = 1; }
        P.glow = q < 0.5 ? 2 : 3; P.lan = q < 0.5 ? 1 : -1;
      } else if (st === CAST) { pose(K.scoop, K.fling, ease.out(clamp01(tq / 0.1))); P.load = tq < 1 / 24 ? 2 : 0; P.jaw = 2; P.glow = 3; P.lan = 2; }
      else pose(K.fling, K.idle, ease.inOut(clamp01(tq / 0.55)));
    } else if (MV === 'poke') {
      if (st === CHARGE) { pose(K.idle, K.coil, ease.out(clamp01(q / 0.5))); P.by = Math.round(3 * ease.out(clamp01(q / 0.5))); if (q > 0.5) { P.sgx += tr; P.nx += tr; P.fx2 += tr; } P.glow = q < 0.5 ? 2 : 3; P.jaw = q > 0.8 ? 1 : 0; P.lan = 1; }
      else if (st === CAST) { pose(K.coil, K.upper, ease.out(clamp01(tq / 0.08))); P.by = -3; P.jaw = 3; P.glow = 3; P.lan = -2; }
      else { pose(K.upper, K.idle, ease.inOut(clamp01(tq / 0.5))); P.by = -Math.round(3 * (1 - clamp01(tq / 0.5))); }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.glow = 1 + (f12 & 1); P.eyes = q > 0.6 ? 2 : 1; P.lan = [2, 0, -2, 0][f]; P.jaw = f & 1; }
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.lan = -2; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2 亡者起身：抱住胸口 → 两声心跳（魂火一亮一亮）→ 双手把锹竖着举过头顶嚎叫，碑文全亮
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 2 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; P.lan = hb ? 1 : 0; }
      else if (st === CAST) { pose(K.hunch, K.raise, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.hot = 1; P.lan = -2; P.glint = 2; }
      else { const hold = tq < 1.0; pose(K.raise, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.hot = 1; P.glint = hold ? 1 + (f12 & 1) : 0; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [17, -40], SHF = [-15, -40], NECK = [3, -47], HS = 1.3;   // HS：头（兜帽 + 脸）按 1.3 倍的像素画，大头一眼认出
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); const nw = B.at(NECK[0], NECK[1]), k = (1 - HS) / HS; B.reset(); B.move(nw[0] * k, nw[1] * k); B.move(0, P.by); B.rot(0, 0, P.lean); B.rot(NECK[0], NECK[1], P.hd * 0.6 - P.lean * 0.5); }   // 配合 zoom(HS)：以脖子为中心放大
  const hAt = (x, y) => { headXf(); const q = B.at(x, y); return [q[0] * HS, q[1] * HS]; };
  const bpx = (x, y, m, t) => { const p = B.at(x, y), Z = B.Z(), n = Math.max(1, Math.floor(Z + 0.01)), x0 = Math.round(p[0] * Z), y0 = Math.round(p[1] * Z); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) E.sp(x0 + i, y0 + j, m, t); };
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(4, -32); L.tomb = B.at(-20, -80);
    B.save(); B.rot(-38, -38, -0.28); L.hook = B.at(-47, -76); B.restore();
    L.eye = hAt(13, -65); L.mouth = hAt(12, -54 + P.jaw * 1.5); L.head = hAt(6, -70);
    const h = P.hold, c = Math.cos(P.sa), s = Math.sin(P.sa), G = [P.sgx, P.sgy + P.by * h];
    L.G = G; L.d = [c, s]; L.n = [-s, c];
    L.top = [G[0] - c * 12, G[1] - s * 12]; L.sock = [G[0] + c * 40, G[1] + s * 40]; L.tip = [G[0] + c * 62, G[1] + s * 62]; L.bc = [G[0] + c * 51, G[1] + s * 51];
    L.hN = [P.nx * (1 - h) + G[0] * h, (P.ny + P.by) * (1 - h) + G[1] * h];
    L.hF = [P.fx2 * (1 - h) + (G[0] + c * P.fg) * h, (P.fy2 + P.by) * (1 - h) + (G[1] + s * P.fg) * h];
    L.elN = B.ik(L.shN, L.hN, 18, 19, -1); L.elF = B.ik(L.shF, L.hF, 18, 19, 1);
    const a = P.lan * 0.22; L.lan = [L.hook[0] + Math.sin(a) * 9, L.hook[1] + Math.cos(a) * 9 + 6];
    P.fcx = P.load ? L.bc[0] : L.core[0]; P.fcy = P.load ? L.bc[1] : L.core[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t), polyW = (pts, m, t) => B.polyW(E, pts, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const glowM = () => (P.glow >= 3 ? TOX3 : P.glow >= 2 ? TOX2 : TOX1);

  // 背上的三块墓碑（跟着上身倾斜）：左后石十字架、中间圆顶大碑（碑文第二阶段发绿光）、右肩后小碑
  function tombs() {
    torsoXf(); B.save(); B.rot(-38, -38, -0.28);
    part(); B.poly(E, [[-41, -38], [-35, -38], [-35, -92], [-41, -92]], STONED); B.poly(E, [[-50, -81], [-26, -81], [-26, -75], [-50, -75]], STONED);
    B.ln(E, -40, -91, -40, -42, STONED, 8); B.ln(E, -49, -80, -27, -80, STONED, 8); B.ln(E, -36, -66, -38, -60, STONED, 10); B.ln(E, -38, -60, -36, -55, STONED, 10);
    B.px(E, -35, -92, 0); B.px(E, -26, -75, 0);
    part(); B.ell(E, -38, -93, 3.5, 1.6, 0, MOSS); B.ell(E, -45, -82, 2.5, 1.2, 0, MOSS); B.ell(E, -41, -48, 1.4, 4, 0, MOSS);
    B.restore(); B.save(); B.rot(24, -36, 0.35);
    part(); B.poly(E, [[16, -36], [32, -36], [32, -60], [16, -60]], STONED); B.ell(E, 24, -60, 8, 5, 0, STONED); B.ln(E, 18, -60, 18, -40, STONED, 8); B.ln(E, 28, -58, 26, -50, STONED, 10);
    B.restore(); B.save(); B.rot(-20, -36, -0.1);
    part(); B.poly(E, [[-33, -36], [-7, -36], [-7, -88], [-33, -88]], STONE); B.ell(E, -20, -88, 13, 12, 0, STONE);
    B.ln(E, -32, -87, -32, -40, STONE, 8); B.ln(E, -30, -94, -24, -99, STONE, 8); B.ln(E, -8, -86, -8, -40, STONE, 3);
    B.ln(E, -29, -84, -29, -44, STONE, 3); B.ln(E, -11, -84, -11, -44, STONE, 3); B.ln(E, -28, -85, -20, -93, STONE, 3); B.ln(E, -20, -93, -12, -85, STONE, 3);   // 碑面的凹框
    const gm = P.hot ? glowM() : STONE, gt = P.hot ? 0 : 2;
    B.ln(E, -20, -92, -20, -80, gm, gt); B.ln(E, -24, -88, -16, -88, gm, gt);                                                        // 刻的十字
    for (const [y, a, b] of [[-75, -26, -14], [-71, -25, -15], [-67, -26, -17], [-63, -24, -14], [-58, -25, -16]]) B.ln(E, a, y, b, y, gm, gt);   // 碑文
    B.ln(E, -9, -80, -13, -74, STONE, 10); B.ln(E, -13, -74, -11, -68, STONE, 10); B.ln(E, -11, -68, -14, -62, STONE, 10);          // 裂缝
    B.px(E, -8, -88, 0); B.px(E, -9, -89, 0); B.px(E, -8, -89, 0);
    part(); B.ell(E, -24, -98, 5, 2, 0.3, MOSS); B.ell(E, -32, -62, 1.5, 6, 0, MOSS); B.ell(E, -10, -42, 3, 1.5, 0, MOSS); B.px(E, -17, -100, MOSS, 8); B.px(E, -29, -96, MOSS, 8);
    B.restore();
  }
  function lantern() {   // 挂在十字架上的绿火提灯，跟着动作晃
    const hk = L.hook, c = L.lan;
    part(); for (let i = 0; i <= 5; i++) { const q = i / 5, x = hk[0] + (c[0] - hk[0]) * q, y = hk[1] + (c[1] - 7 - hk[1]) * q; px(x, y, IRON, i & 1 ? 3 : 7); }
    part(); polyW([[c[0] - 5, c[1] - 6], [c[0] + 5, c[1] - 6], [c[0], c[1] - 10]], IRON); px(c[0], c[1] - 11, IRON, 8);
    polyW([[c[0] - 4, c[1] - 6], [c[0] + 4, c[1] - 6], [c[0] + 5, c[1] + 5], [c[0] - 5, c[1] + 5]], IRON); polyW([[c[0] - 5, c[1] + 5], [c[0] + 5, c[1] + 5], [c[0] + 4, c[1] + 7], [c[0] - 4, c[1] + 7]], IRON, 3);
    polyW([[c[0] - 3, c[1] - 4], [c[0] + 3, c[1] - 4], [c[0] + 3, c[1] + 4], [c[0] - 3, c[1] + 4]], TOX1);
    const fl = (P.fly >> 1) & 1; dot(c[0], c[1] + 1, 1.8 + (P.hot ? 0.6 : 0), TOX2); px(c[0], c[1] - fl, glowM()); px(c[0], c[1] + 1, TOX3);
    lnW(c[0], c[1] - 5, c[0], c[1] + 4, IRON, 3); px(c[0] - 4, c[1] + 2, RUST); px(c[0] + 4, c[1] - 3, RUST);
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-19, 6], [20, 6], [22, -12], [23, -30], [20, -40], [10, -45], [-6, -45], [-18, -40], [-22, -30], [-21, -12]], COAT); B.ell(E, 1, -35, 22, 10, 0, COAT);
    B.ln(E, -15, -30, -12, 3, COAT, 3); B.ln(E, 17, -28, 15, 3, COAT, 3); B.ln(E, -8, -12, -9, 4, COAT, 3); B.ln(E, -18, -36, -20, -14, COAT, 7);
    B.poly(E, [[-17, -23], [-10, -24], [-9, -15], [-16, -14]], CLOAK, 6); for (const [x, y] of [[-17, -21], [-16, -17], [-12, -24], [-9, -19], [-12, -14]]) B.px(E, x, y, COAT, 10);   // 缝的补丁
    part(); B.poly(E, [[-3, -44], [11, -44], [13, -30], [10, -12], [3, -7], [-3, -20], [-5, -32]], SKIND);                                            // 敞开的胸口：烂皮
    part(); B.ell(E, 4, -32, 5, 6, 0, P.glow >= 2 ? TOX2 : TOX1); B.ell(E, 4, -32, 2.6, 3.4, 0, glowM()); if (P.glow >= 3) B.px(E, 3, -33, TOX3);   // 肋骨后面的魂火
    part(); B.ln(E, 4, -42, 4, -20, BONE, 6);
    for (const y of [-41, -36, -31, -26, -21]) { B.ln(E, 4, y, -2, y + 2, BONE, 6); B.ln(E, -2, y + 2, -4, y + 4, BONE, 4); B.ln(E, 4, y, 10, y + 2, BONE, 6); B.ln(E, 10, y + 2, 12, y + 4, BONE, 4); }   // 肋骨
    part(); B.cap(E, -4, -44, -6, -31, 2.4, 2.1, COAT); B.cap(E, -6, -31, -3, -18, 2.1, 1.9, COAT); B.cap(E, -3, -18, 2, -7, 1.9, 1.7, COAT);   // 衣襟
    B.cap(E, 11, -44, 14, -30, 2.4, 2.1, COAT); B.cap(E, 14, -30, 11, -12, 2.1, 1.9, COAT); B.cap(E, 11, -12, 4, -6, 1.9, 1.7, COAT);
    B.ln(E, -5, -43, -7, -31, COAT, 8); B.ln(E, 13, -43, 15, -30, COAT, 8);
    for (const y of [-34, -26, -18]) B.px(E, 16, y, RUST);
    part(); B.cap(E, -20, -7, 21, -9, 2, 2, WOOD); for (let x = -18; x < 20; x += 3) B.px(E, x, -8 - x / 20, WOOD, 3);                                // 草绳腰带
    part(); for (let i = 0; i <= 11; i++) { const q = i / 11, x = 21 - 27 * q, y = -41 + 39 * q; B.px(E, x, y, i & 1 ? RUST : IRON, i & 1 ? 5 : 7); B.px(E, x + 1, y, IRON, 3); }   // 绑墓碑的锈链子
    part(); B.ell(E, -15, -41, 4, 2, 0.3, MOSS); B.ell(E, 18, -42, 3, 1.6, -0.2, MOSS);
  }
  function mantle() {   // 披肩：破烂的下摆一截一截
    part(); torsoXf(); const pts = [[-24, -33], [-21, -36], [-18, -31], [-14, -35], [-10, -33], [-6, -40], [-3, -46], [11, -46], [14, -40], [18, -34], [21, -37], [24, -32], [26, -36], [25, -42], [16, -50], [-12, -50], [-23, -42]];
    B.poly(E, pts, CLOAK); B.ln(E, -20, -43, -12, -49, CLOAK, 8); for (const [x, y] of [[-21, -36], [-14, -35], [21, -37], [26, -36]]) B.ln(E, x, y, x, y - 5, CLOAK, 3); B.ln(E, -6, -45, -7, -38, CLOAK, 3); B.ln(E, 20, -44, 22, -38, CLOAK, 3);
    if (P.hot) { B.px(E, -16, -40, TOX1); B.px(E, 21, -41, TOX1); }
  }
  function arm(side) {
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, cm = far ? COATD : COAT, sm = far ? SKIND : SKIN;   // 袖子是大衣的旧皮
    part(); capW(el[0], el[1], h[0], h[1], 3.6, 3, sm); const mid = [(el[0] + h[0]) / 2, (el[1] + h[1]) / 2];
    lnW(el[0], el[1], h[0], h[1], sm, 3); px(mid[0], mid[1] - 1, BONE, 6); px(mid[0] + 1, mid[1] - 1, BONE, 4);                                     // 烂掉一块露出来的骨头
    if (P.hot && !far) { lnW(mid[0] - 2, mid[1] + 1, mid[0] + 3, mid[1] - 2, TOX1); }
    part(); capW(sh[0], sh[1], el[0], el[1], 6.5, 5.5, cm); const um = [(sh[0] + el[0]) / 2, (sh[1] + el[1]) / 2]; lnW(um[0] - 2, um[1] + 2, el[0], el[1], cm, 3); dot(um[0] - 1, um[1] - 2, 2, cm, 7);
    const dx = h[0] - el[0], dy = h[1] - el[1], dl = Math.hypot(dx, dy) || 1, u = [dx / dl, dy / dl];
    for (const k of [-1, 0, 1]) { const b = [el[0] + u[1] * k * 4, el[1] - u[0] * k * 4]; capW(b[0], b[1], b[0] + u[0] * (4 + (k & 1) * 2), b[1] + u[1] * (4 + (k & 1) * 2), 2.2, 0.6, cm); }   // 破袖口
    part(); dot(h[0], h[1], 3.4, sm); const hold = P.hold > 0.5;
    if (hold) { const d = L.d, n = L.n[1] > 0 ? L.n : [-L.n[0], -L.n[1]]; for (const k of [-1, 0, 1]) { const p = [h[0] + d[0] * k * 2.2, h[1] + d[1] * k * 2.2]; capW(p[0], p[1], p[0] + n[0] * 3, p[1] + n[1] * 3, 1.4, 1.1, sm); px(p[0] + n[0] * 3.5, p[1] + n[1] * 3.5, BONE, 5); } px(h[0], h[1] - 1, sm, 7); }
    else { const a0 = Math.atan2(dy, dx); for (let i = 0; i < 4; i++) { const a = a0 + (i - 1.5) * 0.42, r0 = [h[0] + Math.cos(a) * 3, h[1] + Math.sin(a) * 3], tip = [r0[0] + Math.cos(a + 0.3 * side) * 7, r0[1] + Math.sin(a + 0.3 * side) * 7];
      capW(r0[0], r0[1], tip[0], tip[1], 1.3, 0.6, sm, i === 0 ? 7 : 5); px(tip[0], tip[1], BONE, 6); } }                                         // 空手：细长的指头、骨头指尖
  }
  function shovel() {   // 大铁锹：木柄 + D 形握把 + 铁箍 + 带锈的尖头锹面（锹面上可以有一锹坟土）
    const d = L.d, n = L.n, t = L.top, so = L.sock, tp = L.tip;
    part(); capW(t[0], t[1], so[0], so[1], 2.1, 2.4, WOOD); lnW(t[0] + n[0] * 0.9, t[1] + n[1] * 0.9, so[0] + n[0] * 0.9, so[1] + n[1] * 0.9, WOOD, 7);
    for (const q of [0.3, 0.55, 0.8]) px(t[0] + (so[0] - t[0]) * q - n[0], t[1] + (so[1] - t[1]) * q - n[1], WOOD, 3);
    part(); const g2 = [t[0] - d[0] * 6, t[1] - d[1] * 6]; capW(g2[0] + n[0] * 4, g2[1] + n[1] * 4, g2[0] - n[0] * 4, g2[1] - n[1] * 4, 1.7, 1.7, WOOD, 6);
    capW(t[0] + n[0] * 2, t[1] + n[1] * 2, g2[0] + n[0] * 4, g2[1] + n[1] * 4, 1.2, 1.2, IRON); capW(t[0] - n[0] * 2, t[1] - n[1] * 2, g2[0] - n[0] * 4, g2[1] - n[1] * 4, 1.2, 1.2, IRON);   // D 形握把
    part(); capW(so[0] - d[0] * 7, so[1] - d[1] * 7, so[0] + d[0] * 2, so[1] + d[1] * 2, 2.7, 3.4, IRON); px(so[0] - d[0] * 4, so[1] - d[1] * 4, IRON, 9); px(so[0] - d[0] * 2 + n[0] * 2, so[1] - d[1] * 2 + n[1] * 2, RUST);
    part(); const m1 = [so[0] + d[0] * 13, so[1] + d[1] * 13];
    polyW([[so[0] + n[0] * 8.5, so[1] + n[1] * 8.5], [m1[0] + n[0] * 7.5, m1[1] + n[1] * 7.5], tp, [m1[0] - n[0] * 7.5, m1[1] - n[1] * 7.5], [so[0] - n[0] * 8.5, so[1] - n[1] * 8.5]], IRON);
    lnW(so[0] + n[0] * 8, so[1] + n[1] * 8, so[0] - n[0] * 8, so[1] - n[1] * 8, IRON, 8); lnW(so[0] + d[0], so[1] + d[1], so[0] + d[0] * 15, so[1] + d[1] * 15, IRON, 7);   // 卷边、中脊
    lnW(m1[0] + n[0] * 7, m1[1] + n[1] * 7, tp[0] + n[0] * 0.5, tp[1] + n[1] * 0.5, IRON, 9);                                                    // 磨亮的刃口
    for (const [a, b, tt] of [[4, 5, 4], [5, 5, 3], [4, 6, 5], [9, -4, 3], [10, -4, 4], [15, 3, 5], [3, -6, 4], [3, -5, 3], [18, -1, 3]]) px(so[0] + d[0] * a + n[0] * b, so[1] + d[1] * a + n[1] * b, RUST, tt);   // 锈斑
    px(so[0] + d[0] * 11 - n[0] * 2, so[1] + d[1] * 11 - n[1] * 2, IRON, 3); px(so[0] + d[0] * 6 + n[0] * 1, so[1] + d[1] * 6 + n[1] * 1, IRON, 3);
    if (P.glint) { const g = [so[0] + n[0] * 7, so[1] + n[1] * 7]; px(g[0], g[1], TOX3); if (P.glint > 1) { px(g[0] + 1, g[1], TOX2); px(g[0] - 1, g[1], TOX2); px(g[0], g[1] + 1, TOX2); px(g[0], g[1] - 1, TOX2); } }
    if (P.load) {   // 一锹坟土：土块、一截骨头，第二段里坟土里冒绿色的魂火
      const up = n[1] < 0 ? n : [-n[0], -n[1]], c = [so[0] + d[0] * 11 + up[0] * 3, so[1] + d[1] * 11 + up[1] * 3];
      part(); dot(c[0], c[1], 6.5, DIRT); dot(c[0] + up[0] * 2 - d[0] * 2, c[1] + up[1] * 2 - d[1] * 2, 4, DIRT, 7); dot(c[0] + d[0] * 5, c[1] + d[1] * 5 + 1, 3, DIRT);
      px(c[0] - 3, c[1] + 1, DIRT, 3); px(c[0] + 2, c[1] - 2, DIRT, 8); capW(c[0] - 4, c[1] - 1, c[0], c[1] - 3, 0.8, 0.8, BONE, 6);
      if (P.load >= 2) { px(c[0] + 1, c[1] - 4, TOX2); px(c[0] - 2, c[1] - 5, TOX1); px(c[0] + 3, c[1], TOX3); px(c[0], c[1] - 1, TOX2); }
    }
  }
  function head() {   // 大兜帽（帽尖往后耷拉）+ 帽洞里烂掉的僵尸脸：深眼窝里两点毒绿的光、烂掉的鼻子、缝过的脸颊、一排黄牙
    const z0 = B.Z(); B.zoom(z0 * HS); part(); headXf(); const J = Math.round(P.jaw * 1.5);
    B.cap(E, 4, -45, 5, -52, 4, 3.5, SKIND);
    part(); headXf();
    B.ell(E, 4, -68, 17, 17, 0, CLOAK); B.strand(E, [[-4, -80], [-12, -89], [-21, -93], [-29, -92], [-33, -88]], 7, 1.4, CLOAK); B.poly(E, [[-15, -61], [-18, -48], [22, -48], [22, -61]], CLOAK);
    B.ln(E, -7, -82, -12, -60, CLOAK, 3); B.ln(E, -2, -84, -5, -70, CLOAK, 3); B.ln(E, -21, -92, -12, -88, CLOAK, 3); B.ln(E, -30, -91, -22, -95, CLOAK, 8);
    B.ln(E, -11, -79, -1, -85, CLOAK, 8); B.ln(E, -13, -70, -11, -79, CLOAK, 7); B.ln(E, 2, -85, 12, -84, CLOAK, 7);
    B.ell(E, 12, -63, 10, 12, 0.08, CLOAK, 10);                                                                                                     // 帽洞里的黑
    part(); headXf();
    B.ell(E, 12, -66, 7.5, 6.5, 0, FACE); B.poly(E, [[5, -67], [19, -67], [19, -60], [17, -55], [15, -51 + J], [10, -51 + J], [7, -55], [5, -60]], FACE);   // 颅顶、瘦下巴
    B.ell(E, 7, -58, 1.3, 2.4, 0, FACE, 2); B.ell(E, 17.5, -58, 1.3, 2.4, 0, FACE, 2); B.ln(E, 14, -62, 18, -62, FACE, 8); B.ln(E, 6, -62, 8, -62, FACE, 7);   // 凹下去的脸颊、颧骨
    B.ln(E, 7, -71, 17, -71, FACE, 7); B.ln(E, 5, -69, 10, -67, FACE, 2); B.ln(E, 19, -69, 14, -67, FACE, 2); B.ln(E, 5, -70, 10, -68, FACE, 8); B.ln(E, 19, -70, 14, -68, FACE, 8);   // 往下压的眉骨
    B.ell(E, 8.5, -64.5, 2.3, 2, 0, FACE, 10); B.ell(E, 15.5, -64.5, 2.8, 2.3, 0, FACE, 10);                                                        // 深眼窝
    const e = P.eyes >= 2 ? TOX3 : P.eyes === 1 ? TOX2 : 0;
    if (e) { bpx(15, -65, e); bpx(16, -65, e); bpx(15, -64, TOX2); bpx(9, -65, e); bpx(8, -65, TOX2); }
    if (P.eyes >= 2) { bpx(17, -66, TOX2); bpx(18, -67, TOX1); bpx(19, -68, TOX1); bpx(10, -66, TOX1); }                                           // 眼光往后上方拖
    bpx(12, -61, FACE, 10); bpx(13, -61, FACE, 10); bpx(12, -60, FACE, 10); bpx(13, -60, FACE, 3);                                                  // 烂掉的鼻子
    bpx(6, -61, BONE, 5); bpx(6, -60, BONE, 6); bpx(7, -60, BONE, 4); bpx(6, -59, BONE, 3);                                                          // 远侧脸颊烂穿，露出牙床
    B.ln(E, 15, -60, 18, -56, FACE, 10); bpx(15, -58, FACE, 10); bpx(17, -59, FACE, 10); bpx(16, -56, FACE, 10); bpx(18, -58, FACE, 10);            // 缝过的脸颊
    B.poly(E, [[8, -57], [17, -57], [16, -54 + J], [9, -54 + J]], FACE, 10);                                                                          // 咧开的嘴：嘴唇烂掉，整排牙露着
    for (const x of [9, 11, 13, 15]) { bpx(x, -56, BONE, x === 13 ? 4 : 6); bpx(x, -55, BONE, 4); }
    if (J >= 2) B.ln(E, 10, -54 + (J >> 1), 15, -54 + (J >> 1), J >= 4 ? TOX2 : TOX1);
    for (const x of [10, 12, 14]) bpx(x, -55 + J, BONE, 5);
    if (P.hot) { B.ln(E, 18, -64, 19, -60, TOX1); bpx(7, -58, TOX1); }
    part(); headXf(); B.strand(E, [[1, -54], [0, -66], [4, -75], [12, -77], [19, -73], [22, -65], [22, -58]], 3, 2.2, CLOAK);                        // 帽沿
    B.ln(E, 1, -70, 6, -76, CLOAK, 8); B.ln(E, 7, -77, 15, -77, CLOAK, 8); B.cap(E, 9, -75, 10, -71, 1.4, 0.5, CLOAK); B.cap(E, 16, -74, 17, -71, 1.2, 0.5, CLOAK);
    B.zoom(z0);
  }
  function flies() {   // 绕着脑袋飞的三只苍蝇
    part(); const c = L.head; for (let i = 0; i < 3; i++) { const a = P.fly * 0.52 + i * 2.1, x = c[0] + Math.cos(a) * (22 + i * 3), y = c[1] - 4 + Math.sin(a * 1.7 + i) * 9; px(x, y, CLOAK, 10); }
  }
  function mound() {   // 坟坑的土沿（不跟身体走：死的时候人沉下去，土还在）
    part(); polyW([[-44, 8], [-42, 0], [-32, -4], [-20, -6], [-8, -4], [6, -7], [20, -5], [34, -7], [44, -3], [52, 1], [56, 8]], DIRT);
    for (const [x, y, r] of [[-30, -3, 2.4], [-12, -3, 2], [12, -4, 2.6], [30, -4, 2], [46, -1, 2.2]]) dot(x, y, r, DIRT, 7);
    for (const [x, y] of [[-24, -2], [2, -3], [24, -2], [40, 0]]) px(x, y, DIRT, 3);
    part(); dot(-36, -3, 2.4, BONE); px(-37, -3, BONE, 10); px(-35, -3, BONE, 10); px(-36, -1, BONE, 3);                                          // 土里半个头骨
    part(); for (const [x, h] of [[-18, 4], [-16, 3], [8, 4], [36, 3], [38, 5]]) lnW(x, -5, x + 1, -5 - h, MOSS, 6);
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    const cross = false, sb = P.sa < -2.2 && P.hold >= 0.5;   // 两手握锹时远手横过胸前；锹抡到脑后时锹画在头后面
    tombs(); lantern(); if (!cross) arm(-1); torso(); if (cross) arm(-1); mantle();
    if (sb) shovel(); head(); if (!sb) shovel(); arm(1); flies(); mound();
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1; const X = (p) => p[0] * z + spr.ox, Y = (p) => p[1] * z + spr.oy;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = X(L.core); RIM.ry = Y(L.core); RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = X(L.core); LIGHTS[0].y = Y(L.core); LIGHTS[0].r = (P.glow >= 3 ? 15 : P.glow >= 2 ? 12 : 8) * z;
    LIGHTS[1].x = X(L.eye); LIGHTS[1].y = Y(L.eye); LIGHTS[1].r = (P.eyes >= 2 ? 10 : P.eyes ? 6 : 0) * z * HS; LIGHTS[1].k = 0.7;
    LIGHTS[2].x = X(L.lan); LIGHTS[2].y = Y(L.lan); LIGHTS[2].r = (P.hot ? 30 : 24) * z;
    if (P.load >= 2) { LIGHTS[3].x = X(L.bc); LIGHTS[3].y = Y(L.bc); LIGHTS[3].r = 18 * z; LIGHTS[3].k = 0.8; }
    else { LIGHTS[3].x = spr.ox; LIGHTS[3].y = spr.oy + 16 * z; LIGHTS[3].r = (P.hot ? 60 : 0) * z; LIGHTS[3].k = 0.42; }                                  // 第二阶段：坟坑里泛上来的绿光
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连帽尖）
  function portrait() {   // 立绘：正面、头略低、张嘴、眼光全亮，锹面立在脸旁边，碑文全亮（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.idle); P.hd = 0.1; P.jaw = 2; P.eyes = 2; P.glow = 3; P.hot = 1; P.by = 0; P.breath = 0; P.lan = 1; P.glint = 1; P.fly = 5;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; const c = hAt(0, -72); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 38 * 2]; return PSPR;
  }

  // ───── 特效（舞台坐标；只画身边的，砸在部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y, R = Math.random;
  let emT = 0, pS = -1, pT = 0;
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'shovel') slamFx();
      else if (MV === 'bury') { const b = L.bc; for (let i = 0; i < 28; i++) spawnX(K_PHYS, sx(b[0] + (R() - 0.5) * 8), sy(b[1]), 60 + R() * 200, -60 - R() * 180, 0.9 + R() * 0.5, FXI.earth, { g: 320, floor: HY + 2 });
        for (let i = 0; i < 12; i++) spawn(K_RISE, sx(b[0] + (R() - 0.5) * 14), sy(b[1] + (R() - 0.5) * 8), 20 + R() * 40, -20 - R() * 30, 0.7 + R() * 0.5, GR);
        ring(sx(b[0]), sy(b[1]), 0, GR); burst(sx(b[0]), sy(b[1]), 14, 40, 120, 0.25, 0.5, FXI.earth, 40); shake(0.25, 2); flash(0.06); sfx('boss', { k: 'graveDirt', w: 1 }); sfx('boss', { k: 'throw', w: 0.6 }); }
      else if (MV === 'poke') { const t = L.tip; fx.slash(sx(L.shN[0]), sy(L.shN[1]), 44, 2.5, 0.5, 'grave', 0.26, 3, 2); burst(sx(t[0]), sy(t[1]), 18, 50, 150, 0.25, 0.5, FXI.earth, 20); burst(sx(t[0]), sy(t[1]), 10, 40, 100, 0.2, 0.4, GR, 10);
        shake(0.3, 3); flash(0.06); sfx('swing', { kind: 'smash', w: 1 }); sfx('boss', { k: 'graveClang', w: 0.8 }); sfx('impact', { pal: 'earth', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') { const m = L.mouth; ring(sx(m[0]), sy(m[1]), 1, GR); ring(sx(L.core[0]), sy(L.core[1]), 1, GR); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 40; i++) { const a = -Math.PI * R(); spawnX(K_PHYS, sx(L.core[0]), sy(L.core[1]), Math.cos(a) * (60 + R() * 120), Math.sin(a) * (80 + R() * 140), 0.8 + R() * 0.5, i & 1 ? GR : FXI.earth, { g: 220, floor: HY + 6 }); }
        for (let i = 0; i < 16; i++) spawn(K_RISE, sx(-50 + R() * 110), sy(-4 - R() * 8), 0, -30 - R() * 30, 0.9 + R() * 0.6, GR);   // 坟坑里冒上来的魂
        sfx('boss', { k: 'graveMoan', w: 1 }); if (MV === 'p2') sfx('boss', { k: 'graveToll', w: 1 }); sfx('impact', { pal: 'poison', w: 1 }); }
    }
    if (s === CHARGE && MV === 'shovel') sfx('boss', { k: 'graveScrape', w: 0.9 });
    if (s === CHARGE && MV === 'bury') sfx('boss', { k: 'growl', w: 0.5 });
    if (s === CHARGE && MV === 'poke') sfx('boss', { k: 'growl', w: 0.7 });
    if (s === CHARGE && MV === 'rise') sfx('boss', { k: 'graveClimb', w: 1 });
    if (s === CHARGE && MV === 'p2') sfx('boss', { k: 'heartbeat', w: 1 });
  }
  function slamFx() {
    const x = sx(L.sock[0] + L.d[0] * 6), y = HY;
    fx.wave(x, y, 1, 44, 9, 'earth', 0.5, 2); fx.wave(x, y, -1, 30, 7, 'earth', 0.45, 2); fx.crack(x, y, 24, 1, 'grave', 1.3); fx.crack(x, y, 14, -1, 'grave', 1.0); fx.cloud(x, y - 6, 14, 'dust', 0.8, 2);
    burst(x, y - 2, 22, 60, 180, 0.35, 0.8, FXI.earth, 50); burst(x, y - 4, 10, 40, 120, 0.3, 0.6, GR, 30);
    for (let i = 0; i < 20; i++) spawnX(K_PHYS, x + (R() - 0.5) * 14, y - 3, (R() - 0.5) * 160, -60 - R() * 170, 0.9 + R() * 0.5, FXI.earth, { g: 320, floor: HY + 2 });
    ring(x, y - 2, 1, GR); shake(0.35, 3); flash(0.08); sfx('boss', { k: 'slam', w: 1 }); sfx('boss', { k: 'graveClang', w: 1 }); sfx('hit', { mat: 'stone', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'growl', w: 0.5 });
    if (s === ATTACK && t === 3 / 12) { fx.slash(sx(L.shN[0]), sy(L.shN[1]), 40, 0.7, 2.4, 'grave', 0.22, 3, 2); burst(sx(L.tip[0]), sy(L.tip[1]), 16, 50, 140, 0.25, 0.5, FXI.earth, 20);
      hitDummy(1, 1); shake(0.15, 2); sfx('swing', { kind: 'smash', w: 1 }); sfx('boss', { k: 'graveClang', w: 0.5 }); sfx('hit', { mat: 'flesh', w: 1 }); }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'graveDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { burst(sx(10), sy(-6), 30, 50, 160, 0.4, 0.9, FXI.earth, 30); ring(sx(3), sy(-29), 1, GR); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('boss', { k: 'thud', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.7) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-40 + R() * 80), sy(-4 - R() * 30), 0, -12 - R() * 20, 0.9 + R() * 0.8, FXI.dust); sfx('boss', { k: 'sink', w: 1 }); }
    if (s === DEATH && t === INCOMING + 2.2) { for (let i = 0; i < 30; i++) spawn(K_RISE, sx(-40 + R() * 80), sy(-6 - R() * 50), (R() - 0.5) * 10, -24 - R() * 30, 1.0 + R() * 0.8, GR); ring(sx(0), sy(-20), 1, GR); sfx('boss', { k: 'fade', w: 1 }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [], [], [], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.7, INCOMING + 2.2], []];
  function stepFX(dt, state, stT) {
    emT += dt; const D = E.DUR[CHARGE], cr = (q) => state === CHARGE && pS === CHARGE && pT < D * q && stT >= D * q;
    if (emT > (P.hot ? 0.05 : 0.12)) { emT = 0; const fromLan = R() < 0.4, x = fromLan ? sx(L.lan[0] + (R() - 0.5) * 6) : sx(-40 + R() * 70), y = fromLan ? sy(L.lan[1] - 4) : sy(-40 - R() * 55);
      spawn(K_EMBER, x, y, (R() - 0.5) * 8, -10 - R() * 12, 0.6 + R() * 0.7, GR); }                                                                       // 提灯和墓碑上一直往上飘的魂火
    if (P.hot && R() < 0.25) spawn(K_RISE, sx(-50 + R() * 110), sy(-2), 0, -18 - R() * 20, 0.8 + R() * 0.5, GR);                                            // 第二阶段：坟坑里一直冒魂
    if (state === CHARGE && MV === 'shovel' && stT > D * 0.3 && R() < 0.6) { const c = L.bc, a = R() * 6.2832, r = 10 + R() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + R() * 0.2), 0, 9, GR, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (cr(0.45) && MV === 'shovel') { fx.cross(sx(L.sock[0] + L.n[0] * 7), sy(L.sock[1] + L.n[1] * 7), 7, 'grave', 0.35, 2); sfx('boss', { k: 'graveScrape', w: 0.4 }); }
    if (cr(0.3) && MV === 'bury') { const t = L.tip; burst(sx(t[0]), sy(Math.min(t[1], 0)), 14, 30, 100, 0.25, 0.5, FXI.earth, 60); sfx('boss', { k: 'graveDig', w: 1 }); }
    if (cr(0.55) && MV === 'bury') sfx('boss', { k: 'graveDig', w: 0.6 });
    if (state === CHARGE && MV === 'bury' && P.load && R() < 0.5) { const c = L.bc; spawnX(K_PHYS, sx(c[0] + (R() - 0.5) * 10), sy(c[1] + 2), (R() - 0.5) * 20, 10, 0.5, FXI.earth, { g: 300, floor: HY + 2 }); if (P.load >= 2) spawn(K_RISE, sx(c[0] + (R() - 0.5) * 8), sy(c[1] - 4), 0, -20, 0.5, GR); }
    if (state === CHARGE && MV === 'poke' && R() < 0.4) spawn(K_RISE, sx(-10 + R() * 30), sy(-2), (R() - 0.5) * 20, -10, 0.5, FXI.dust);
    if (state === CHARGE && MV === 'rise' && R() < 0.5) spawnX(K_PHYS, sx(-30 + R() * 70), sy(-2), (R() - 0.5) * 60, -40 - R() * 60, 0.7, FXI.earth, { g: 240, floor: HY + 4 });
    if (state === MOVE && R() < 0.3) spawnX(K_PHYS, sx(L.hN[0]), sy(-1), (R() - 0.5) * 40, -30 - R() * 30, 0.5, FXI.earth, { g: 240, floor: HY + 4 });
    if (state === IDLE && P.jaw && R() < 0.5) spawn(K_RISE, sx(L.mouth[0] + R() * 3), sy(L.mouth[1]), 8, -10, 0.6, GR);                                  // 哼的时候嘴里冒一口绿气
    pS = state; pT = stT;
  }
  function fxReset() { emT = 0; pS = -1; pT = 0; }
  function fxBack(f12) { const x0 = sx(-44), x1 = sx(56); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) if (((x + f12) % 3) === 0) E.put(x, HY + 1, P.hot && ((x >> 2) & 1) ? FXR[GR][3] : FXR[FXI.earth][3]); }
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'shovel'; return MVDUR[MV]; }

  // 自己的声音（mc-bossart.js 注册进 BOSSV；syn 的函数和 mc-audio.js 同名同参数）
  const VOICES = {
    graveScrape: (syn, t, w, p) => { syn.nz(t, 0.55, 'bandpass', 900, 6, 0.05 + 0.04 * w, { to: 2600, pan: p }); syn.ring(t + 0.12, 1250, 0.45, 0.03 + 0.02 * w, { parts: [[1, 1], [2.7, 0.4]], pan: p }); },
    graveClang: (syn, t, w, p) => { syn.ring(t, 520, 0.9, 0.06 + 0.05 * w, { parts: [[1, 1], [2.76, 0.5], [5.4, 0.25]], pan: p, rev: 0.4 }); syn.thud(t, 110, 45, 0.25, 0.16 + 0.1 * w, { pan: p }); syn.nz(t, 0.2, 'lowpass', 600, 0.7, 0.07, { src: 'brown', pan: p }); },
    graveDig: (syn, t, w, p) => { for (let i = 0; i < 3; i++) syn.nz(t + i * 0.07, 0.09, 'lowpass', 500 + i * 120, 0.8, 0.07 + 0.05 * w, { src: 'brown', pan: p }); syn.thud(t, 140, 70, 0.1, 0.08 + 0.04 * w, { pan: p }); syn.ring(t, 900, 0.2, 0.02, { pan: p }); },
    graveDirt: (syn, t, w, p) => { syn.whoosh(t, 0.3, 300, 1200, 0.05 + 0.03 * w, { pan: p }); for (let i = 0; i < 10; i++) syn.nz(t + 0.12 + i * 0.035 + syn.rnd(0, 0.02), 0.05, 'bandpass', syn.rnd(600, 1800), 1.5, 0.03 + 0.02 * w, { pan: p }); },
    graveClimb: (syn, t, w, p) => { syn.rumble(t, 2.2, 0.08 + 0.06 * w, { f: 100 }); for (let i = 0; i < 6; i++) { syn.nz(t + i * 0.34, 0.16, 'lowpass', 420, 0.8, 0.06 + 0.03 * w, { src: 'brown', pan: p }); syn.tone(t + i * 0.34 + 0.05, 'sawtooth', 82, 0.25, 0.03, { to: 62, lp: 500, pan: p }); } },
    graveMoan: (syn, t, w, p) => { syn.tone(t, 'sawtooth', 95, 1.4, 0.09 + 0.05 * w, { to: 68, vib: [5, 80, 0.2], lp: 700, pan: p, rev: 0.5 }); syn.tone(t + 0.04, 'square', 142, 1.2, 0.035, { to: 100, vib: [6, 90, 0.2], lp: 900, pan: p, rev: 0.5 });
      syn.nz(t, 1.2, 'bandpass', 420, 3, 0.06, { to: 250, pan: p, rev: 0.4 }); syn.rumble(t, 1.3, 0.1 + 0.08 * w, { f: 120 }); },
    graveToll: (syn, t, w, p) => { syn.bell(t + 0.05, 38, 2.4, 0.12 + 0.06 * w, { pan: p }); syn.bell(t + 0.06, 45, 2.0, 0.04, { pan: p }); },
    graveDie: (syn, t, w, p) => { syn.tone(t, 'sawtooth', 110, 1.8, 0.09 + 0.05 * w, { to: 38, vib: [4, 90, 0.15], lp: 800, pan: p, rev: 0.7 }); syn.nz(t, 1.5, 'bandpass', 600, 4, 0.05, { to: 180, pan: p, rev: 0.6 }); syn.bell(t + 0.9, 33, 2.4, 0.07, { pan: p }); },
  };

  return {
    name: '守墓人', HX, R_EL: GR, DUR, hero, P, GLOW_MATS: [TOX1, TOX2, TOX3], HIT_POINT: [2, -36], EVENTS, MAX_H: 110, OWN_MAX: 80, SHEET_K: 2, SINK: 26, VOICES,
    SFX: { body: 'beast', how: 'dissolve', pal: 'poison', style: 'summon', w: 1, hover: 1 },
    MOVES: ['shovel', 'bury', 'poke', 'rise', 'p2'], MOVE_NAMES: { shovel: '铲地', bury: '掘墓', poke: '重击', rise: '升起', p2: '亡者起身（第二阶段仪式）' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.5, 1.7]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.3, 0.7, 1.1], 'shovel'], [CAST, [0, 2 / 12], 'shovel'], [RECOVER, [0.35], 'shovel'],
      [CHARGE, [0.2, 0.45, 0.75, 1.1], 'bury'], [CAST, [1 / 12], 'bury'], [RECOVER, [0.3], 'bury'],
      [CHARGE, [0.3, 0.9], 'poke'], [CAST, [1 / 12], 'poke'],
      [CHARGE, [0, 2 / 12, 4 / 12], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0.05, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.6, 1.0, 1.5, 1.9, 2.2, 2.5]]],
    portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 230, H: 146 });
