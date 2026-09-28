// 防卫机甲（最终首领，第七章「星舰残骸」的舰桥）：照 B_demon.js 的最终首领契约做。
// 依据：附录 G「舰桥的防卫机甲，独眼一直亮着」「独眼、肩炮、机械爪」；场地 反应堆坑（网格地板、青色的光）；
// 反射护盾（被动：远程打它，一半伤害弹回去）；重锤协议（砸）、扫描切割（扇形）→ 第二阶段 轨道打击（最后排的三个，激光从天上落下来）。
// 设定卡 ——
//   剪影：从反应堆坑里升起的机甲上半身（原点 = 反应堆地板），一颗比肩膀还显眼的流线型白色头盔，
//         正脸只有一只大大的红色独眼（镜筒外圈是深色的框，里面是黑玻璃和一直亮着、会扫来扫去的红瞳）——识别点就是这一只眼。
//         头盔往后掠一片头鳍、两根天线；近侧肩上一门并排双管的肩炮朝前，远侧肩上一座竖着开口的导弹舱；
//         近侧手是三指机械爪，远侧前臂是一门激光炮；胸口一颗青色的反应堆芯，里面的涡轮在转。
//   主色：白 / 灰的装甲板（bladesteel）、深藏青的骨架和液压管（stormcoat）、黄黑警示条（自己的一条黄色阶）、黑玻璃（obsidian）；
//         光源只有两种：独眼的红、反应堆的青（堆芯、炮口、第二阶段装甲缝里透出来的光、脚下的反应堆）。
//   招式（setMove）：hammerProto 重锤协议 · scan 扫描切割 · orbital 轨道打击 · poke 重击 · rise 升起 · p2 第二阶段仪式；hot1 / hot0 过载常亮。
//     重锤协议：机械爪握成拳举过头顶、液压嘶嘶、拳头外面聚一团青光 → 一拳砸进地板（青色地浪、火花、裂纹）。
//     扫描切割：低头前倾、爪张开撑着，独眼的镜片越开越大、红瞳左右扫、脚下一道红线扫过去 → 眼睛过载发白，一道红色激光扇形切过去。
//     轨道打击：远侧的激光炮臂笔直举向天空、肩炮也竖起来、天线亮青光，炮口聚能 → 一道光柱射上天（落下来的由游戏画）。
//     重击：爪子往后拉开 → 往前一夹。普攻：肩炮压低瞄准 → 开一炮。
//     升起：扒着坑沿爬出来，一开始眼是黑的 → 反应堆先亮、眼一闪一闪地启动 → 挺直、双臂张开、独眼全亮。
//     第二阶段：捂住胸口的堆芯 → 两声警报、堆芯闪两下 → 装甲缝全部透出青光、肩上排气、独眼过载拉出一道横向的光。
//     死亡：独眼爆闪、抽搐 → 瘫下去、眼一闪一闪地熄灭、天线垂下 → 冒着火花沉回反应堆。
PCD.define('B_mech', (E) => {
  const { defDeep, defMat, ramp, Sprite, begin, part, bake, ease, clamp01, q12, f12of, FXI, FXR, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, K_SPIRAL_PT, K_RISE, K_EMBER, K_PHYS,
    spawn, spawnX, burst, ring, shake, flash, fx, hitDummy, scrX, sfx } = E;
  const B = E.parts.boss, HY = E.HY;

  // ───── 材质（11 级，暗 → 亮）：装甲白灰、骨架深藏青、警示黄；光只有红眼和青色反应堆 ─────
  // 色板有上限：装甲用共用的 bladesteel、骨架用 stormcoat、黑玻璃用 obsidian；只有警示黄是自己的
  const R_HAZ = ['#120c02', '#2a1f04', '#46360a', '#6a5210', '#8e7016', '#b4901e', '#d6b02c', '#eeca46', '#fce48c'];
  const ARM = defDeep('bladesteel', { depth: 7, amb: 0.16 }), HELM = defDeep('bladesteel', { depth: 9, amb: 0.22 }), ARMD = defDeep('bladesteel', { depth: 5, dark: 3, amb: 0.08 });
  const FRM = defDeep('stormcoat', { depth: 5, dark: 3, amb: 0.08 }), FRMD = defDeep('stormcoat', { depth: 4, dark: 5, amb: 0.06 });
  const CLAW = defDeep('bladesteel', { depth: 3, dark: 3, amb: 0.1 }), CLAWD = defDeep('bladesteel', { depth: 3, dark: 5, amb: 0.06 });
  const HAZ = defDeep(R_HAZ, { depth: 4, amb: 0.14 }), HAZD = defDeep(R_HAZ, { depth: 3, dark: 2, amb: 0.1 });
  const VOID = defDeep('obsidian', { depth: 5, dark: 3, amb: 0.05 });
  const EYE1 = defMat(ramp(['#3a0408', '#8a0c14', '#d8222a', '#ff6a50']), 1, 1), EYE2 = defMat(ramp(['#8a0c14', '#e8262a', '#ff7050', '#ffc8b0']), 1, 1), EYE3 = defMat(ramp(['#e8262a', '#ff8a60', '#ffe4d4', '#ffffff']), 1, 1);
  const TL1 = defMat(ramp(['#042a2e', '#0a5e62', '#16a49e', '#46e2d0']), 1, 1), TL2 = defMat(ramp(['#0a5e62', '#16a49e', '#46e2d0', '#b4fff0']), 1, 1), TL3 = defMat(ramp(['#16a49e', '#5af2de', '#d0fff8', '#ffffff']), 1, 1);
  const hero = new Sprite(210, 128, 105, 112);
  const HX = 110, DUR = [2.4, 2 / 3, 0.75, 1.6, 0.5, 0.7, 0.8, 2.9, 1.0];
  const MVDUR = { hammerProto: { 3: 1.3, 4: 0.45, 5: 0.7 }, scan: { 3: 1.4, 4: 0.5, 5: 0.7 }, orbital: { 3: 1.5, 4: 0.5, 5: 0.7 }, poke: { 3: 1.2, 4: 0.4, 5: 0.6 }, rise: { 3: 2.2, 4: 0.5, 5: 0.7 }, p2: { 3: 0.7, 4: 0.5, 5: 1.7 } };
  let MV = 'hammerProto', HOT = 0;   // HOT：第二阶段，装甲缝里的青光常亮、独眼过载
  const CORE = ramp(['#e0fff8', '#46e2d0', '#128a86']), RED = ramp(['#ffd4c4', '#ff4a3a', '#9a1018']), FLOOR = ramp(['#8af0e0', '#2aa8a0', '#0e5a5c']);
  const LIGHTS = [{ x: 0, y: 0, r: 0, ramp: CORE, k: 1 }, { x: 0, y: 0, r: 60, ramp: FLOOR, k: 0.36 }, { x: 0, y: 0, r: 0, ramp: RED, k: 0.6 }, { x: 0, y: 0, r: 0, ramp: CORE, k: 1 }];
  const RIM_R = [0, 14, 24, 36], RIM = { rim: 0, rx: 0, ry: 0, rimR: RIM_R, rimRamp: FXR[FXI.frost], flash: 0, dq: 0, lights: LIGHTS, rimAll: 1, skip: new Uint8Array(64) };
  for (const m of [EYE1, EYE2, EYE3, TL1, TL2, TL3, VOID]) RIM.skip[m] = 1;

  // 姿势：身体升降 / 前倾、转头、爪（近）和炮臂（远）的落点、肩炮的朝向（sc，屏幕角度）、爪张开（cl）；
  // 独眼：eyes 0 灭 / 1 暗 / 2 亮 / 3 过载，look / lky 红瞳的偏移，iris 镜片开合；堆芯 glow、涡轮 spin、面罩格栅 jaw
  const P = {};
  const FIELDS = ['st', 'by', 'lean', 'hd', 'nx', 'ny', 'fx2', 'fy2', 'sc', 'cl', 'glow', 'eyes', 'look', 'lky', 'iris', 'orb', 'orb2', 'rc', 'sco', 'jaw', 'flash', 'dq', 'hot', 'vent', 'ant', 'breath', 'blink', 'spin', 'scanl'];
  const KI = { nx: 40, ny: -20, fx2: -34, fy2: -16, lean: 0.02, hd: 0, sc: -0.32, cl: 0.35 };
  const k_ = (o) => Object.assign({}, KI, o);
  const K = {
    idle: KI,
    hamUp: k_({ nx: 30, ny: -80, fx2: -34, fy2: -22, lean: -0.2, hd: -0.16, sc: -0.7, cl: 0 }),        // 重锤协议：爪握拳举过头
    hamDn: k_({ nx: 46, ny: 4, fx2: -24, fy2: -6, lean: 0.42, hd: 0.3, sc: -0.05, cl: 0 }),
    scanW: k_({ nx: 42, ny: -8, fx2: -26, fy2: -12, lean: 0.16, hd: 0.24, sc: -0.2, cl: 0.8 }),       // 扫描切割：低头前倾、爪张开撑着
    scanF: k_({ nx: 40, ny: -12, fx2: -28, fy2: -14, lean: -0.08, hd: -0.08, sc: -0.3, cl: 1 }),
    orbUp: k_({ nx: 38, ny: -6, fx2: -30, fy2: -70, lean: -0.2, hd: -0.4, sc: -1.45, cl: 0.2 }),      // 轨道打击：炮臂举向天、肩炮竖起
    orbF: k_({ nx: 38, ny: -4, fx2: -30, fy2: -68, lean: -0.12, hd: -0.32, sc: -1.4, cl: 0.2 }),
    pokeW: k_({ nx: 8, ny: -40, lean: -0.12, hd: 0.02, cl: 1, sc: -0.5 }),                             // 重击：爪往后拉开 → 往前一夹
    poke: k_({ nx: 62, ny: -22, lean: 0.34, hd: 0.18, cl: 0.05, sc: -0.1 }),
    atkW: k_({ lean: -0.04, hd: 0.06, sc: -0.1, cl: 0.3 }),                                             // 普攻：肩炮压低瞄准 → 开炮
    atk: k_({ lean: -0.12, hd: 0.02, sc: -0.06, cl: 0.3 }),
    hunch: k_({ nx: 6, ny: -32, fx2: -4, fy2: -28, lean: 0.36, hd: 0.36, sc: 0.1, cl: 0.9 }),         // 第二阶段：捂住堆芯
    wide: k_({ nx: 54, ny: -58, fx2: -46, fy2: -56, lean: -0.16, hd: -0.28, sc: -0.9, cl: 1 }),
    climbA: k_({ nx: 40, ny: -14, fx2: -32, fy2: 2, lean: 0.3, hd: 0.28, cl: 0.9, sc: 0 }),
    climbB: k_({ nx: 38, ny: 2, fx2: -32, fy2: -14, lean: 0.3, hd: 0.28, cl: 0.9, sc: 0 }),
    agony: k_({ nx: 30, ny: -78, fx2: -34, fy2: -70, lean: -0.22, hd: -0.42, sc: -1.6, cl: 1 }),
    limp: k_({ nx: 30, ny: 6, fx2: -24, fy2: 6, lean: 0.48, hd: 0.55, sc: 0.5, cl: 0.5 }),
  };
  const KF = ['nx', 'ny', 'fx2', 'fy2', 'lean', 'hd', 'sc', 'cl'];
  const pose = (a, b, q) => { for (const f of KF) P[f] = a[f] + (b[f] - a[f]) * (q == null ? 0 : q); };
  function base() { for (const f of FIELDS) P[f] = 0; pose(K.idle, K.idle); P.glow = 1; P.eyes = 2; P.iris = 1; P.hot = HOT; P.mx = 0; P.flip = 0; }
  const shiver = (f12, a) => { P.nx += (f12 & 1) ? a : -a; P.by += (f12 & 1); };

  function poseAt(st, t, T) {
    base(); P.st = st; const tq = q12(t), f12 = f12of(T), TT = f12 / 12; P.spin = f12 % 3; P.blink = ((f12 >> 1) % 5) === 0 ? 1 : 0;
    const idle = (tt) => { const b = Math.floor(TT * 2.5) & 1; P.breath = b; P.by = -b; const lk = [0, 1, 2, 1, 0, -1][Math.floor(tt / 0.4) % 6];
      P.look = lk; P.hd += lk * 0.03; P.sc += lk * 0.04; P.glow = 1 + ((f12 >> 2) & 1);                                    // 红瞳左右扫，肩炮跟着转一点
      const lp = tt % DUR[IDLE]; if (lp >= 1.5 && lp < 2.0) { P.hd = 0.14; P.look = 2; P.lky = 1; P.iris = lp < 1.7 ? 0 : 2; P.scanl = 1; P.sc = -0.12; } };   // 待机个性：低头盯住战场，镜片一缩一放，扫一道红线
    if (st === IDLE) idle(tq);
    else if (st === MOVE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.cl = f < 2 ? 0.2 : 0.9; P.look = 1; }
    else if (st === ATTACK) {
      if (tq < 0.17) { pose(K.idle, K.atkW, ease.out(tq / 0.17)); P.look = 2; }
      else if (tq < 0.25) { pose(K.atkW, K.atkW); P.sco = 2; P.look = 2; P.iris = 0; }
      else if (tq < 0.42) { pose(K.atk, K.atk); P.rc = 1; P.sco = 3; P.eyes = 3; P.look = 2; P.glow = 2; }
      else { pose(K.atk, K.idle, ease.inOut(clamp01((tq - 0.42) / 0.3))); P.look = 1; }
    } else if (st === CHARGE || st === CAST || st === RECOVER) movePose(st, tq, f12);
    else if (st === HURT) {
      const h = tq - INCOMING; if (h < 0) idle(tq);
      else if (h < 0.2) { pose(K.idle, K.idle); P.hd = -0.25; P.lean = -0.1; P.eyes = (f12 & 1) ? 0 : 3; P.look = -2; P.flash = h < 1 / 12 ? 1 : 0; P.nx -= 4; P.jaw = 1; }   // 眼里闪雪花
      else { const q = ease.inOut(clamp01((h - 0.2) / 0.3)); P.hd = -0.25 * (1 - q); P.lean = -0.1 * (1 - q); P.look = q < 0.5 ? -1 : 0; }
    } else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq);
      else if (d < 0.7) { pose(K.idle, K.agony, ease.out(clamp01(d / 0.25))); shiver(f12, 2); P.jaw = 3; P.glow = 3; P.flash = d < 1 / 12 ? 1 : 0; P.eyes = 3; P.iris = 2; P.hot = 1; P.look = (f12 % 3) - 1; }
      else if (d < 1.5) { pose(K.agony, K.limp, ease.in(clamp01((d - 0.7) / 0.6))); P.jaw = d < 1.0 ? 2 : 0; P.glow = d < 1.1 ? 2 : 1 - ((f12 >> 1) & 1); P.eyes = (f12 % 3 === 0) ? 0 : d < 1.2 ? 2 : 1; P.ant = 1 + clamp01((d - 0.7) / 0.6); P.look = 0; P.lky = 1; }
      else { pose(K.limp, K.limp); P.glow = 0; P.eyes = d < 1.75 ? ((f12 & 1) ? 1 : 0) : 0; P.ant = 2; P.lky = 2; P.dq = d > 2.0 ? Math.round(clamp01((d - 2.0) / 0.55) * 48) / 48 : 0; }
    }
    if (P.hot && P.glow < 2 && st !== DEATH) P.glow = 2;
    if (P.hot && P.eyes === 2 && st !== DEATH) P.iris = Math.max(P.iris, 2);
    let h = 2166136261, h2 = 5381; for (const f of FIELDS) { const v = Math.round(P[f] * 48); h = Math.imul(h ^ v, 16777619); h2 = Math.imul(h2 ^ (v + 11), 33) ^ (h2 >>> 7); } P.k1 = h >>> 0; P.k2 = (h2 >>> 0) + (MVI[MV] || 0) * 13;
    geo(); P.gx = P.fcx; P.gy = P.fcy;
  }
  const MVI = { hammerProto: 0, scan: 1, orbital: 2, poke: 3, rise: 4, p2: 5 };
  function movePose(st, tq, f12) {
    const D = E.DUR[CHARGE], q = clamp01(tq / D);
    if (MV === 'hammerProto' || MV === 'poke') {
      const ham = MV === 'hammerProto', up = ham ? K.hamUp : K.pokeW, dn = ham ? K.hamDn : K.poke;
      if (st === CHARGE) { const e = ease.out(clamp01(q / 0.5)); pose(K.idle, up, e); P.by = -Math.round((ham ? 6 : 3) * e); if (q > 0.5) shiver(f12, 1);
        P.cl = ham ? 0.35 * (1 - e) : 0.35 + 0.65 * e; P.orb = ham ? Math.min(3, Math.round(q * 4)) : 0; P.glow = q < 0.5 ? 2 : 3; P.eyes = 2; P.iris = q > 0.7 ? 0 : 1; P.look = 2; P.lky = ham ? -1 : 0; P.vent = ham && q > 0.4 ? 1 : 0; }
      else if (st === CAST) { pose(dn, dn); P.by = ham ? 4 : 2; P.cl = ham ? 0 : 0.05; P.jaw = 2; P.glow = 3; P.eyes = 3; P.look = 2; P.lky = 1; }
      else { pose(dn, K.idle, ease.inOut(clamp01(tq / 0.55))); P.by = Math.round(4 * (1 - clamp01(tq / 0.55))); P.look = 1; }
    } else if (MV === 'scan') {
      if (st === CHARGE) { pose(K.idle, K.scanW, ease.out(clamp01(q / 0.3))); const sw = Math.sin(q * Math.PI * 4); P.look = q > 0.85 ? 2 : Math.round(sw * 2); P.hd += P.look * 0.04; P.lky = 1;
        P.iris = Math.min(2, Math.floor(q * 3)); P.eyes = q > 0.5 ? 2 : 2; P.scanl = 1; P.glow = 2; if (q > 0.85) { shiver(f12, 1); P.eyes = (f12 & 1) ? 3 : 2; } }
      else if (st === CAST) { pose(K.scanW, K.scanF, ease.out(clamp01(tq / 0.12))); P.eyes = 3; P.iris = 2; P.look = 2; P.lky = 1; P.jaw = 1; P.glow = 2; }
      else { pose(K.scanF, K.idle, ease.inOut(clamp01(tq / 0.6))); P.eyes = tq < 0.25 ? 3 : 2; P.vent = tq < 0.4 ? 1 : 0; }
    } else if (MV === 'orbital') {
      if (st === CHARGE) { const e = ease.out(clamp01(q / 0.4)); pose(K.idle, K.orbUp, e); P.by = -Math.round(4 * e); if (q > 0.6) shiver(f12, 1);
        P.orb2 = Math.min(3, Math.round(clamp01((q - 0.2) / 0.6) * 3)); P.ant = -1; P.blink = (f12 & 1); P.look = 0; P.lky = -2; P.eyes = 2; P.glow = q < 0.5 ? 2 : 3; }
      else if (st === CAST) { pose(K.orbF, K.orbF); P.by = 3; P.eyes = 3; P.lky = -2; P.glow = 3; P.jaw = 2; P.ant = -1; P.blink = 1; P.sco = 2; }
      else { pose(K.orbF, K.idle, ease.inOut(clamp01(tq / 0.6))); P.vent = tq < 0.4 ? 1 : 0; }
    } else if (MV === 'rise') {
      if (st === CHARGE) { const f = Math.floor(tq * 6) & 3; pose(f < 2 ? K.climbA : K.climbB, f < 2 ? K.climbA : K.climbB); P.by = [2, 0, 2, 0][f]; P.cl = f < 2 ? 0.2 : 0.9;
        P.glow = tq < 0.7 ? 0 : tq < 1.2 ? (f12 & 1) : 1 + (f12 & 1); P.eyes = tq < 1.3 ? 0 : tq < 1.8 ? ((f12 % 3) ? 1 : 0) : 2; P.ant = tq < 1.3 ? 1 : 0; P.look = tq < 1.8 ? 0 : [-2, 0, 2][(f12 >> 1) % 3]; }   // 启动：先是堆芯，再是眼
      else if (st === CAST) { pose(K.climbB, K.wide, ease.out(clamp01(tq / 0.15))); P.jaw = 3; P.glow = 3; P.eyes = 3; P.iris = 2; P.look = 1; P.vent = 1; }
      else pose(K.wide, K.idle, ease.inOut(clamp01(tq / 0.6)));
    } else {   // p2：捂住堆芯 → 两声警报 → 装甲缝透出青光、肩上排气、独眼过载
      if (st === CHARGE) { pose(K.idle, K.hunch, ease.out(clamp01(tq / 0.25))); const hb = (tq < 0.12) || (tq >= 0.35 && tq < 0.47); P.glow = hb ? 3 : 1; P.eyes = hb ? 3 : 1; P.hot = hb ? 1 : HOT; P.by = hb ? 1 : 0; P.look = -1; P.lky = 1; P.jaw = hb ? 1 : 0; }
      else if (st === CAST) { pose(K.hunch, K.wide, ease.out(clamp01(tq / 0.12))); P.jaw = 3; P.glow = 3; P.eyes = 3; P.iris = 2; P.hot = 1; P.vent = 1; P.flash = 0; }
      else { const hold = tq < 1.0; pose(K.wide, K.idle, hold ? 0 : ease.inOut(clamp01((tq - 1.0) / 0.6))); P.jaw = hold ? 3 - ((f12 >> 1) & 1) : 0; P.glow = 3; P.eyes = hold ? 3 : 2; P.iris = 2; P.hot = 1; P.vent = hold ? 1 : 0; }
    }
  }

  // ───── 几何 ─────
  const L = {};
  const SHN = [20, -40], SHF = [-18, -41], NECK = [3, -46], EYE = [11, -66];
  function torsoXf() { B.reset(); B.move(0, P.by); B.rot(0, 0, P.lean); }
  function headXf() { torsoXf(); B.rot(NECK[0], NECK[1], P.hd * 0.5 - P.lean * 0.5); }
  function geo() {
    torsoXf(); L.shN = B.at(SHN[0], SHN[1]); L.shF = B.at(SHF[0], SHF[1]); L.core = B.at(0, -31); L.piv = B.at(28, -49); L.pod = B.at(-26, -58); L.ventN = B.at(24, -48); L.ventF = B.at(-22, -48);
    headXf(); L.eye = B.at(EYE[0], EYE[1]); L.ant = B.at(-12, -92);
    L.hN = [P.nx, P.ny + P.by]; L.hF = [P.fx2, P.fy2 + P.by];
    L.elN = B.ik(L.shN, L.hN, 20, 22, -1); L.elF = B.ik(L.shF, L.hF, 19, 21, 1);
    { const dx = L.hF[0] - L.elF[0], dy = L.hF[1] - L.elF[1], l = Math.hypot(dx, dy) || 1; L.dF = [dx / l, dy / l]; L.muz = [L.hF[0] + L.dF[0] * 12, L.hF[1] + L.dF[1] * 12]; }
    { const dx = L.hN[0] - L.elN[0], dy = L.hN[1] - L.elN[1], l = Math.hypot(dx, dy) || 1; L.dN = [dx / l, dy / l]; L.fist = [L.hN[0] + L.dN[0] * 5, L.hN[1] + L.dN[1] * 5]; }
    const a = P.sc + P.lean; L.scd = [Math.cos(a), Math.sin(a)]; L.scm = [L.piv[0] + L.scd[0] * (34 - P.rc * 3), L.piv[1] + L.scd[1] * (34 - P.rc * 3)];
    P.fcx = P.orb2 ? L.muz[0] : P.orb ? L.fist[0] : L.core[0]; P.fcy = P.orb2 ? L.muz[1] : P.orb ? L.fist[1] : L.core[1];
  }
  const capW = (x0, y0, x1, y1, r0, r1, m, t) => B.capW(E, x0, y0, x1, y1, r0, r1, m, t);
  const dot = (x, y, r, m, t) => B.dotW(E, x, y, r, m, t), px = (x, y, m, t) => B.pxW(E, x, y, m, t), lnW = (x0, y0, x1, y1, m, t) => B.lnW(E, x0, y0, x1, y1, m, t);
  const seam = () => (P.hot ? TL1 : null);   // 第二阶段：装甲缝里透出青光

  // 警示条：沿 A → B 的一条带（当前变换下），黄底斜着压黑纹
  function haz(ax, ay, bx, by, th, m) {
    const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l, nx = -uy * th, ny = ux * th;
    B.poly(E, [[ax, ay], [bx, by], [bx + nx, by + ny], [ax + nx, ay + ny]], m);
    for (let s = 1; s < l - 1; s += 5) { B.ln(E, ax + ux * s, ay + uy * s, ax + ux * (s + th) + nx, ay + uy * (s + th) + ny, m, 10); B.ln(E, ax + ux * (s + 1), ay + uy * (s + 1), ax + ux * (s + 1 + th) + nx, ay + uy * (s + 1 + th) + ny, m, 10); }
  }
  // 世界坐标里一圈警示环（手腕、炮管）：沿方向 u 的一小段，压两道黑纹
  function hazRing(c, u, r, m) { capW(c[0] - u[0] * 1.5, c[1] - u[1] * 1.5, c[0] + u[0] * 1.5, c[1] + u[1] * 1.5, r, r, m); lnW(c[0] - u[1] * r + u[0] * 1.2, c[1] + u[0] * r + u[1] * 1.2, c[0] + u[1] * r - u[0] * 1.2, c[1] - u[0] * r - u[1] * 1.2, m, 10); }

  function pod() {   // 远侧肩上的导弹舱：竖着开口，舱口一排红色弹头（第二阶段 / 轨道打击时亮）
    part(); torsoXf(); B.poly(E, [[-36, -64], [-18, -66], [-16, -50], [-34, -48]], ARMD); B.ln(E, -35, -57, -17, -59, ARMD, 3); B.ln(E, -35, -63, -18, -65, ARMD, 8); haz(-34, -53, -16, -55, 2.5, HAZD);
    part(); torsoXf(); B.poly(E, [[-37, -66], [-17, -68], [-18, -65], [-36, -63]], FRM);
    const lit = P.hot || P.orb2 || MV === 'orbital' && P.st === CAST; for (let i = 0; i < 3; i++) { const x = -33 + i * 5.5, y = -66.6 - i * 0.4; B.px(E, x, y, lit ? ((P.blink + i) & 1 ? EYE3 : EYE2) : EYE1); B.px(E, x + 1, y, lit ? EYE2 : EYE1); B.px(E, x, y + 1, VOID); }
  }
  function cannon() {   // 近侧肩上的双管肩炮（普攻就是它），炮座压在肩甲上
    const [px0, py0] = L.piv, [dx, dy] = L.scd, qx = -dy, qy = dx, r = P.rc * 3;
    for (const o of [-2.7, 2.7]) {
      const back = o < 0, bx = px0 + qx * o - dx * r, by_ = py0 + qy * o - dy * r, m = back ? ARMD : ARM, hz = back ? HAZD : HAZ;
      part(); capW(bx - dx * 5, by_ - dy * 5, bx + dx * 19, by_ + dy * 19, 3.4, 3, m);
      for (const s of [4, 10]) lnW(bx + dx * s - qx * 3, by_ + dy * s - qy * 3, bx + dx * s + qx * 3, by_ + dy * s + qy * 3, seam() || m, seam() ? undefined : 3);
      hazRing([bx + dx * 15.5, by_ + dy * 15.5], [dx, dy], 3.2, hz);
      part(); capW(bx + dx * 19, by_ + dy * 19, bx + dx * 31, by_ + dy * 31, 1.8, 1.6, back ? FRMD : FRM); capW(bx + dx * 29, by_ + dy * 29, bx + dx * 33, by_ + dy * 33, 2.4, 2.4, back ? FRMD : FRM);
      const mz = P.sco >= 3 ? TL3 : P.sco >= 2 || P.hot ? TL2 : TL1; px(bx + dx * 33.5, by_ + dy * 33.5, mz); if (P.sco >= 2) px(bx + dx * 32.5, by_ + dy * 32.5, mz);
    }
    part(); dot(px0, py0, 5.4, FRM); dot(px0, py0, 3.4, ARM); dot(px0 - 1, py0 - 1, 1.2, ARM, 8); px(px0 + 3, py0 + 2, P.hot ? TL2 : TL1);
  }
  function arm(side) {
    const far = side < 0, sh = far ? L.shF : L.shN, el = far ? L.elF : L.elN, h = far ? L.hF : L.hN, a1 = far ? ARMD : ARM, fr = far ? FRMD : FRM, hz = far ? HAZD : HAZ;
    part(); capW(sh[0], sh[1], el[0], el[1], 4.2, 3.6, fr); lnW(sh[0], sh[1], el[0], el[1], fr, 8);                                               // 骨架 + 液压杆的亮线
    part(); const u0 = [sh[0] + (el[0] - sh[0]) * 0.1, sh[1] + (el[1] - sh[1]) * 0.1], u1 = [sh[0] + (el[0] - sh[0]) * 0.62, sh[1] + (el[1] - sh[1]) * 0.62];
    capW(u0[0], u0[1], u1[0], u1[1], 5.6, 5, a1); lnW(u0[0], u0[1] + 3, u1[0], u1[1] + 3, seam() || a1, seam() ? undefined : 3);           // 上臂的甲片
    part(); dot(el[0], el[1], 4.2, fr); dot(el[0], el[1], 1.8, a1, 8);                                                                       // 肘关节
    part(); const fa = [el[0] + (h[0] - el[0]) * 0.12, el[1] + (h[1] - el[1]) * 0.12], d = far ? L.dF : L.dN;
    capW(fa[0], fa[1], h[0] - d[0] * 2, h[1] - d[1] * 2, 5.4, far ? 6 : 6.8, a1);                                                          // 粗大的前臂甲
    lnW(fa[0] - d[1] * 3, fa[1] + d[0] * 3, h[0] - d[1] * 4 - d[0] * 3, h[1] + d[0] * 4 - d[1] * 3, a1, 8);
    lnW(fa[0] + d[1] * 2, fa[1] - d[0] * 2, h[0] + d[1] * 3 - d[0] * 3, h[1] - d[0] * 3 - d[1] * 3, seam() || a1, seam() ? undefined : 3);
    hazRing([h[0] - d[0] * 4, h[1] - d[1] * 4], d, far ? 6.2 : 7, hz);
    if (!far && (P.hot || P.orb)) px(fa[0] + d[0] * 6, fa[1] + d[1] * 6, (P.blink || P.orb >= 2) ? TL3 : TL1);                          // 前臂上的指示灯
    if (far) {   // 激光炮臂：前臂接一根炮管，炮口青光
      part(); capW(h[0], h[1], L.muz[0] - d[0], L.muz[1] - d[1], 3.4, 2.8, fr);
      for (const s of [3, 6]) lnW(h[0] + d[0] * s - d[1] * 3, h[1] + d[1] * s + d[0] * 3, h[0] + d[0] * s + d[1] * 3, h[1] + d[1] * s - d[0] * 3, a1, 7);
      part(); dot(L.muz[0], L.muz[1], 2.7, a1); dot(L.muz[0], L.muz[1], 1.6, P.orb2 >= 2 ? TL3 : P.orb2 || P.hot ? TL2 : TL1);
    } else claw();
  }
  function claw() {   // 三指机械爪：cl 0 合拢成拳，1 张到最开
    const h = L.hN, d = L.dN, a = Math.atan2(d[1], d[0]), o = P.cl, b = [h[0] + d[0] * 2, h[1] + d[1] * 2];
    const finger = (off, ln, m) => { const a1 = a + off, j = [b[0] + Math.cos(a1) * ln, b[1] + Math.sin(a1) * ln], a2 = a1 - Math.sign(off || 1) * (0.9 + 0.5 * (1 - o)), tp = [j[0] + Math.cos(a2) * ln * 0.85, j[1] + Math.sin(a2) * ln * 0.85];
      part(); capW(b[0], b[1], j[0], j[1], 2.3, 1.8, m); dot(j[0], j[1], 1.7, m, 7); capW(j[0], j[1], tp[0], tp[1], 1.7, 0.5, m); px(tp[0], tp[1], m, 8); };
    finger(-(0.1 + 0.4 * o), 6.5, CLAWD);                                   // 后面那根（暗）
    part(); dot(h[0], h[1], 4.8, FRM); dot(h[0] - d[0] * 1.5, h[1] - d[1] * 1.5, 1.6, FRM, 8);   // 掌
    finger(0.35 + 0.75 * o, 6, CLAW);                                        // 拇指（下）
    finger(-(0.35 + 0.75 * o), 7.5, CLAW);                                   // 上面那根
  }
  function pauldron(side) {
    part(); torsoXf(); const far = side < 0, c = far ? [-23, -42] : [24, -42], m = far ? ARMD : ARM, hz = far ? HAZD : HAZ;
    B.ell(E, c[0], c[1], far ? 10.5 : 12.5, far ? 8 : 9.5, side * 0.25, m); B.ln(E, c[0] - 9, c[1] - 5, c[0] + 7, c[1] - 8, m, 8);
    B.ln(E, c[0] - 11, c[1] + 1, c[0] + 11, c[1] - 1, seam() || m, seam() ? undefined : 3);
    haz(c[0] - 11, c[1] + 2.5, c[0] + 11, c[1] + 0.5, 3.5, hz);
    B.px(E, c[0] - 6 * side, c[1] - 3, m, 8); B.px(E, c[0] + 4 * side, c[1] - 5, m, 8);                                                       // 铆钉
  }
  function torso() {
    part(); torsoXf();
    B.poly(E, [[-13, 4], [13, 4], [14, -16], [-14, -16]], FRM); for (const y of [-3, -8, -13]) B.ln(E, -12, y, 12, y, FRM, 3); B.ln(E, -1, 3, -1, -16, FRM, 8);   // 腰：一节节的骨架
    part(); torsoXf(); B.poly(E, [[-20, -9], [-11, -7], [-12, 4], [-20, 2]], ARMD); B.poly(E, [[11, -7], [20, -9], [20, 2], [12, 4]], ARM);                  // 胯侧的甲片
    part(); torsoXf();
    B.poly(E, [[-21, -18], [21, -18], [26, -30], [23, -42], [12, -47], [-12, -47], [-22, -42], [-26, -30]], ARM);                                         // 胸甲
    const sm = seam(); const S = (x0, y0, x1, y1) => B.ln(E, x0, y0, x1, y1, sm || ARM, sm ? undefined : 3);
    S(-25, -30, -9, -23); S(9, -23, 25, -30); S(-12, -46, -9, -39); S(12, -46, 9, -39); S(-22, -41, -10, -38); S(10, -38, 22, -41);                  // 甲板的缝
    B.ln(E, -20, -44, -12, -46, ARM, 8); B.ln(E, 12, -46, 20, -44, ARM, 8); B.ln(E, -24, -31, -21, -40, ARM, 8); B.ln(E, -18, -33, -12, -36, ARM, 7);    // 高光
    haz(-21, -21, 21, -21, 3, HAZ);                                                                                                                      // 胸甲下沿的警示条
    for (const [x0, s] of [[-20, 1], [20, -1]]) for (let i = 0; i < 3; i++) { const y = -36 + i * 3; B.ln(E, x0, y, x0 + s * 4, y + 1, P.hot || P.vent ? (i === 1 ? TL2 : TL1) : VOID); }   // 两侧的散热格栅
    part(); torsoXf(); B.ell(E, 0, -31, 8.6, 8.6, 0, FRM); B.ell(E, 0, -31, 6.6, 6.6, 0, VOID);                                                           // 堆芯：深框、黑玻璃
    for (const a of [0.8, 2.35, 3.9, 5.5]) B.px(E, Math.cos(a) * 7.6, -31 + Math.sin(a) * 7.6, FRM, 8);
    if (P.glow) {
      B.ell(E, 0, -31, 5.2, 5.2, 0, TL1); B.ell(E, 0, -31, P.glow >= 2 ? 3.6 : 2.6, P.glow >= 2 ? 3.6 : 2.6, 0, P.glow >= 3 ? TL3 : TL2);
      for (let i = 0; i < 4; i++) { const a = (i / 4 + P.spin / 12) * Math.PI * 2; B.ln(E, Math.cos(a) * 2, -31 + Math.sin(a) * 2, Math.cos(a + 0.5) * 5, -31 + Math.sin(a + 0.5) * 5, TL1); }   // 转着的涡轮叶
      if (P.glow >= 3) { B.px(E, 0, -31, TL3); B.px(E, -1, -32, TL3); }
    } else { B.ln(E, -3, -34, -1, -35, VOID, 7); }
  }
  function neck() {
    part(); torsoXf(); B.poly(E, [[-15, -44], [15, -44], [11, -53], [-11, -53]], FRMD); for (const x of [-8, -3, 3, 8]) B.ln(E, x, -45, x * 0.8, -52, FRMD, 3);   // 领口的骨架
    part(); headXf(); B.cap(E, -10, -56, -16, -44, 2.8, 3.2, FRMD); B.cap(E, -1, -42, 0, -54, 3.4, 3, FRM); B.cap(E, 7, -42, 8, -53, 3, 2.8, FRM); B.ln(E, 0, -44, 0, -52, FRM, 8); B.ln(E, 7, -44, 8, -51, FRM, 8);
  }
  function antennae() {   // 头盔后面两根天线：尖上一点红灯；轨道打击时亮青光、立直，死的时候垂下来
    part(); headXf(); const dr = P.ant > 0 ? P.ant : 0, up = P.ant < 0;
    const t1 = up ? [-12, -96] : [-17 - dr * 9, -92 + dr * 14], t2 = up ? [-3, -95] : [-7 - dr * 9, -90 + dr * 14];
    B.ln(E, -8, -76, t1[0], t1[1], ARMD, 5); B.ln(E, -9, -76, t1[0] - 1, t1[1], ARMD, 3); B.ln(E, -2, -79, t2[0], t2[1], ARMD, 5);
    for (const [q, t] of [[0.45, t1], [0.5, t2]]) { const bx = t === t1 ? -8 : -2, by_ = t === t1 ? -76 : -79; B.px(E, bx + (t[0] - bx) * q - 1, by_ + (t[1] - by_) * q, ARMD, 8); }
    const tip = up ? (P.blink ? TL3 : TL2) : P.eyes ? (P.blink ? EYE3 : EYE1) : VOID;
    B.px(E, t1[0], t1[1], tip); B.px(E, t2[0], t2[1], up ? TL2 : P.eyes ? EYE1 : VOID); if (up) { B.px(E, t1[0], t1[1] - 1, TL1); B.px(E, t2[0], t2[1] - 1, TL1); }
  }
  function head() {   // 流线型的白头盔，正脸只有一只大独眼
    part(); headXf();
    B.ell(E, 4, -66, 18, 14.5, 0, HELM); B.poly(E, [[-15, -71], [-4, -83], [12, -83], [20, -77], [5, -78]], HELM);                              // 头壳 + 往后掠的头鳍
    B.ln(E, -9, -77, 7, -82, HELM, 8); B.ln(E, -14, -64, -11, -75, HELM, 8); B.ln(E, 13, -81, 19, -76, HELM, 7); B.ln(E, -4, -83, 12, -83, HELM, 8); // 高光
    const sm = seam(); B.ln(E, -4, -80, -2, -54, sm || HELM, sm ? undefined : 3); B.ln(E, -14, -60, -4, -58, HELM, 3); B.ln(E, -6, -78, 16, -79, HELM, 3); // 面甲和后壳的缝
    haz(-14, -63, -4, -61, 2.5, HAZD);                                                                                                         // 后脑一条警示条
    for (const [x, y] of [[-10, -70], [-10, -56], [0, -80]]) B.px(E, x, y, HELM, 8);
    part(); headXf(); B.poly(E, [[-4, -55], [19, -57], [23, -52], [18, -46], [1, -45], [-4, -49]], FRM);                                     // 下颌的面罩
    for (let i = 0; i < 3; i++) { const y = -53 + i * 2.2, jm = P.jaw > i ? (P.jaw >= 3 ? EYE3 : P.jaw >= 2 ? EYE2 : EYE1) : VOID; B.ln(E, 3, y, 16, y - 0.6, jm); }   // 格栅：出声时亮红
    part(); headXf(); B.ell(E, -8, -66, 5.4, 5.4, 0, FRM); B.ell(E, -8, -66, 3.2, 3.2, 0, ARMD); B.px(E, -8, -66, P.hot || P.ant < 0 ? TL2 : TL1); B.px(E, -9, -67, P.hot || P.ant < 0 ? TL2 : TL1); // 侧面的耳机座
    // 独眼：深色的镜筒 → 黑玻璃 → 红瞳；镜片开合 iris、瞳 look / lky 偏移
    part(); headXf(); const [ex, ey] = EYE; B.ell(E, ex, ey, 12.4, 12.4, 0, FRM); B.ln(E, ex - 8, ey - 10, ex + 6, ey - 11, FRM, 8); B.ln(E, ex - 11, ey - 3, ex - 9, ey - 8, FRM, 7);
    for (const a of [0.6, 2.2, 3.8, 5.4]) B.px(E, ex + Math.cos(a) * 10.8, ey + Math.sin(a) * 10.8, FRM, 8);
    part(); headXf(); B.ell(E, ex, ey, 9.4, 9.4, 0, VOID);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; B.px(E, ex + Math.cos(a) * 8.6, ey + Math.sin(a) * 8.6, P.eyes >= 2 ? EYE1 : VOID, P.eyes >= 2 ? undefined : 3); }   // 镜片外圈的刻度
    if (P.eyes) {
      const lx = ex + P.look * 1.2, ly = ey + P.lky * 1.2, ir = (P.eyes >= 2 ? 5.2 : 4) + P.iris * 0.9;
      B.ell(E, lx, ly, ir + 1, ir + 1, 0, EYE1); B.ell(E, lx, ly, ir - 0.6, ir - 0.6, 0, P.eyes >= 2 ? EYE2 : EYE1); B.ell(E, lx + 0.3, ly, Math.max(1, ir - 3), Math.max(1, ir - 3), 0, P.eyes >= 2 ? EYE3 : EYE2);
      if (P.eyes >= 2) { B.px(E, lx - 2, ly - 2, EYE3); B.px(E, lx - 3, ly - 2, EYE3); }
    } else B.ln(E, ex - 3, ey + 4, ex + 4, ey - 3, VOID, 7);
    B.px(E, ex - 5, ey - 6, VOID, 8); B.px(E, ex - 6, ey - 5, VOID, 8); B.px(E, ex - 4, ey - 7, VOID, 7);                                  // 玻璃上的反光
  }
  function flare() {   // 过载：独眼拉出一道横向的光
    if (P.eyes < 3) return; part(); headXf(); const [ex, ey] = EYE, lx = ex + P.look, ly = ey + P.lky;
    B.ln(E, lx - 20, ly, lx + 22, ly, EYE1); B.ln(E, lx - 12, ly, lx + 14, ly, EYE2); B.ln(E, lx, ly - 15, lx, ly + 13, EYE1); B.ln(E, lx - 3, ly, lx + 4, ly, EYE3);
  }
  function orb(c, n) {   // 聚起来的青色能量
    part(); const r = 1.4 + n * 1.3; dot(c[0], c[1], r + 1.2, TL1); dot(c[0], c[1], r, TL2); dot(c[0] - 0.4, c[1] - 0.4, Math.max(0.6, r - 1.6), TL3);
    const s = r + 2 + (P.blink ? 1 : 0); for (const [dx, dy] of [[s, 0], [-s, 0], [0, s], [0, -s]]) px(c[0] + dx, c[1] + dy, TL2);
  }

  function drawHero(spr, z) {
    z = z || 1; begin(spr || hero, 0, 0, 7 * z); B.zoom(z); geo();
    arm(-1); pauldron(-1); pod(); torso(); neck(); antennae(); head(); pauldron(1); cannon(); arm(1); flare();
    if (P.orb) orb(L.fist, P.orb); if (P.orb2) orb(L.muz, P.orb2);
    B.reset(); B.zoom(1);
  }
  function bakeHero(spr, z) {
    spr = spr || hero; z = z || 1;
    RIM.rim = P.glow >= 3 ? 2 : P.glow >= 2 ? 1 : 0; RIM.rx = L.core[0] * z + spr.ox; RIM.ry = L.core[1] * z + spr.oy; RIM.flash = P.flash; RIM.dq = P.dq; RIM.depthK = z; RIM.rimR = z > 1 ? RIM_R.map((r) => r * z) : RIM_R;
    LIGHTS[0].x = L.core[0] * z + spr.ox; LIGHTS[0].y = L.core[1] * z + spr.oy; LIGHTS[0].r = (P.glow >= 3 ? 18 : P.glow >= 2 ? 13 : P.glow ? 9 : 0) * z;
    LIGHTS[1].x = spr.ox; LIGHTS[1].y = spr.oy + 18 * z; LIGHTS[1].r = 58 * z; LIGHTS[1].k = P.hot ? 0.5 : 0.36;                                // 反应堆地板从下面照上来
    LIGHTS[2].x = L.eye[0] * z + spr.ox; LIGHTS[2].y = L.eye[1] * z + spr.oy; LIGHTS[2].r = [0, 12, 16, 22][P.eyes] * z;                        // 独眼的红光
    const oc = P.orb2 ? L.muz : P.orb ? L.fist : L.scm, on = P.orb2 || P.orb || (P.sco >= 2 ? 1 : 0);
    LIGHTS[3].x = oc[0] * z + spr.ox; LIGHTS[3].y = oc[1] * z + spr.oy; LIGHTS[3].r = (on ? 6 + on * 4 : 0) * z;
    bake(spr, RIM);
  }
  const PSPR = new Sprite(hero.w * 2, hero.h * 2, hero.ox * 2, hero.oy * 2);
  function portrait() {   // 立绘：正面微低头，独眼过载拉出横光，爪张开、肩炮抬起，装甲缝全亮（第二阶段的样子）
    const hot = HOT; HOT = 1; poseAt(IDLE, 0, 0); pose(K.idle, K.wide, 0.3); P.hd = 0.08; P.eyes = 3; P.iris = 2; P.glow = 3; P.hot = 1; P.jaw = 1; P.by = 0; P.breath = 0; P.look = 1; P.lky = 0; P.sco = 2; P.blink = 1; P.cl = 0.9;
    P.k1 = (P.k1 + 7) >>> 0; geo(); drawHero(PSPR, 2); bakeHero(PSPR, 2); HOT = hot; headXf(); const c = B.at(4, -70); B.reset(); PHEAD = [c[0] * 2 + PSPR.ox, c[1] * 2 + PSPR.oy, 36 * 2]; return PSPR;
  }
  let PHEAD = null;   // 立绘里头的位置（缓冲坐标）和半径：地图节点的头像从这里裁（连天线）

  // ───── 特效（舞台坐标；游戏里只画身边的，打到部队身上的由游戏画）─────
  const sx = (x) => scrX(x), sy = (y) => HY + y;
  let emT = 0, scT = 0;
  function onEnter(s) {
    if (s === CAST) {
      if (MV === 'hammerProto' || MV === 'poke') slamFx(MV === 'hammerProto');
      else if (MV === 'scan') { const e = L.eye; for (const [dx, w] of [[60, 1], [90, 2], [120, 1]]) { fx.beam(sx(e[0]), sy(e[1]), sx(e[0] + dx), HY, w, 'blood', 0.3, 2); fx.crack(sx(e[0] + dx), HY, 10, 1, 'blood', 0.8); burst(sx(e[0] + dx), HY - 2, 8, 30, 90, 0.2, 0.45, FXI.fire, 20); }
        ring(sx(e[0]), sy(e[1]), 1, FXI.blood); flash(0.08); shake(0.3, 3); sfx('boss', { k: 'mechLaser', w: 1 }); sfx('impact', { pal: 'fire', w: 0.6 }); }
      else if (MV === 'orbital') { const m = L.muz; fx.beam(sx(m[0]), sy(m[1]), sx(m[0]), sy(-170), 3, 'frost', 0.5, 2); ring(sx(m[0]), sy(m[1]), 1, FXI.frost); burst(sx(m[0]), sy(m[1]), 24, 50, 150, 0.3, 0.6, FXI.frost, 10);
        fx.cross(sx(m[0]), sy(m[1]), 10, 'frost', 0.3, 2); flash(0.1); shake(0.35, 3); sfx('boss', { k: 'mechBeam', w: 1 }); }
      else if (MV === 'rise' || MV === 'p2') { const e = L.eye; ring(sx(e[0]), sy(e[1]), 1, FXI.blood); ring(sx(L.core[0]), sy(L.core[1]), 1, FXI.frost); flash(0.12); shake(0.4, 3);
        for (let i = 0; i < 36; i++) { const a = -Math.PI * Math.random(); spawnX(K_PHYS, sx(L.core[0]), sy(L.core[1]), Math.cos(a) * (60 + Math.random() * 120), Math.sin(a) * (80 + Math.random() * 140), 0.7 + Math.random() * 0.5, i & 1 ? FXI.frost : FXI.steel, { g: 220, floor: HY + 6 }); }
        for (const v of [L.ventN, L.ventF]) for (let i = 0; i < 8; i++) spawn(K_RISE, sx(v[0] + (Math.random() - 0.5) * 6), sy(v[1]), (Math.random() - 0.5) * 20, -30 - Math.random() * 20, 0.7 + Math.random() * 0.4, FXI.dust);
        sfx('boss', { k: MV === 'rise' ? 'mechBoot' : 'mechRoar', w: 1 }); sfx('impact', { pal: 'frost', w: 1 }); }
    }
    if (s === CHARGE) {
      if (MV === 'hammerProto' || MV === 'poke') sfx('boss', { k: 'mechServo', w: MV === 'poke' ? 0.5 : 0.9 });
      else if (MV === 'scan') sfx('boss', { k: 'mechScan', w: 0.8 });
      else if (MV === 'orbital') sfx('boss', { k: 'mechUplink', w: 1 });
      else if (MV === 'rise') sfx('boss', { k: 'mechPower', w: 1 });
      else if (MV === 'p2') sfx('boss', { k: 'mechAlarm', w: 1 });
    }
  }
  function slamFx(two) {
    const h = L.fist, x = sx(h[0]), y = HY;
    if (two) { fx.wave(x, y, 1, 44, 8, 'frost', 0.5, 2); fx.wave(x, y, -1, 30, 6, 'frost', 0.45, 2); fx.crack(x, y, 22, 1, 'frost', 1.2); fx.crack(x, y, 14, -1, 'frost', 1.0); ring(x, HY - 2, 1, FXI.frost); }
    burst(x, y - 2, two ? 26 : 12, 60, 180, 0.3, 0.7, FXI.frost, 50);
    for (let i = 0; i < (two ? 20 : 8); i++) spawnX(K_PHYS, x + (Math.random() - 0.5) * 12, y - 3, (Math.random() - 0.5) * 160, -60 - Math.random() * 160, 0.7 + Math.random() * 0.4, FXI.fire, { g: 320, floor: HY + 2 });   // 金属火花
    shake(two ? 0.35 : 0.2, two ? 3 : 2); flash(two ? 0.08 : 0.04); sfx('boss', { k: 'mechSlam', w: two ? 1 : 0.6 }); sfx('hit', { mat: 'metal', w: 1 }); if (two) sfx('impact', { pal: 'frost', w: 1 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === 1 / 12) sfx('boss', { k: 'mechLock', w: 0.6 });
    if (s === ATTACK && t === 3 / 12) { const m = L.scm, d = L.scd; fx.beam(sx(m[0]), sy(m[1]), sx(m[0] + d[0] * 80), sy(m[1] + d[1] * 80), 1, 'frost', 0.18, 2); burst(sx(m[0]), sy(m[1]), 12, 40, 120, 0.2, 0.4, FXI.frost, 10);
      spawn(K_RISE, sx(m[0] - d[0] * 6), sy(m[1] - d[1] * 6), -10, -14, 0.5, FXI.dust); hitDummy(1, 1); shake(0.15, 2); sfx('boss', { k: 'mechZap', w: 1 }); sfx('hit', { mat: 'metal', w: 0.6 }); }
    if (s === CAST && t === 2 / 12 && MV === 'scan') { const e = L.eye; fx.beam(sx(e[0]), sy(e[1]), sx(e[0] + 105), HY, 1, 'blood', 0.2, 2); fx.slash(sx(e[0]), sy(e[1]), 70, 1.9, 2.6, 'blood', 0.25, 2, 2); }
    if (s === DEATH && t === INCOMING + 0.05) sfx('boss', { k: 'mechDie', w: 1 });
    if (s === DEATH && t === INCOMING + 1.1) { burst(sx(L.core[0]), sy(L.core[1]), 40, 60, 200, 0.4, 0.9, FXI.frost, 30); ring(sx(L.core[0]), sy(L.core[1]), 1, FXI.frost); burst(sx(L.eye[0]), sy(L.eye[1]), 16, 40, 120, 0.3, 0.6, FXI.fire, 20); shake(0.3, 3); sfx('fall', { w: 1 }); sfx('hit', { mat: 'metal', w: 1 }); }
    if (s === DEATH && t === INCOMING + 1.9) { for (let i = 0; i < 40; i++) spawn(K_RISE, sx(-40 + Math.random() * 80), sy(-10 - Math.random() * 50), 0, -16 - Math.random() * 24, 0.9 + Math.random() * 0.8, i & 1 ? FXI.dust : FXI.frost); sfx('boss', { k: 'sink', w: 1 }); }
  }
  const EVENTS = [[], [], [1 / 12, 3 / 12], [], [2 / 12], [], [], [INCOMING + 0.05, INCOMING + 1.1, INCOMING + 1.9], []];
  function stepFX(dt, state, stT) {
    emT += dt; scT += dt;
    if (emT > (P.hot ? 0.05 : 0.11)) { emT = 0; spawn(K_EMBER, sx(-44 + Math.random() * 88), sy(-2 - Math.random() * 6), (Math.random() - 0.5) * 8, -14 - Math.random() * 12, 0.6 + Math.random() * 0.6, FXI.frost); }   // 反应堆地板往上飘的青色光点
    if (P.hot && Math.random() < 0.12) { const v = Math.random() < 0.5 ? L.ventN : L.ventF; spawn(K_RISE, sx(v[0]), sy(v[1]), (Math.random() - 0.5) * 10, -20, 0.6, FXI.dust); }        // 第二阶段：肩上一直排气
    if (P.vent && Math.random() < 0.5) { const v = Math.random() < 0.5 ? L.ventN : L.ventF; spawn(K_RISE, sx(v[0] + (Math.random() - 0.5) * 6), sy(v[1]), (Math.random() - 0.5) * 20, -26 - Math.random() * 16, 0.6, FXI.dust); }
    if (P.scanl && scT > 0.08) { scT = 0; const e = L.eye, gx = e[0] + 70 + P.look * 16; fx.beam(sx(e[0]), sy(e[1]), sx(gx), HY, 1, 'blood', 0.1, 2); spawn(K_EMBER, sx(gx), HY - 1, 0, -6, 0.25, FXI.blood); }   // 独眼扫下来的红线
    if (state === CHARGE && P.orb && Math.random() < 0.6) { const c = L.fist, a = Math.random() * 6.2832, r = 10 + Math.random() * 10; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.frost, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && P.orb2 && Math.random() < 0.7) { const c = L.muz, a = Math.random() * 6.2832, r = 12 + Math.random() * 12; spawnX(K_SPIRAL_PT, sx(c[0]), sy(c[1]), r / (0.25 + Math.random() * 0.2), 0, 9, FXI.frost, { a, r, w: 8, tx: sx(c[0]), ty: sy(c[1]), orbitR: 2 }); }
    if (state === CHARGE && MV === 'orbital' && Math.random() < 0.25) spawn(K_EMBER, sx(L.ant[0] + (Math.random() - 0.5) * 8), sy(L.ant[1]), 0, -18, 0.35, FXI.frost);
    if (state === CHARGE && MV === 'poke' && Math.random() < 0.3) spawn(K_EMBER, sx(L.fist[0] + (Math.random() - 0.5) * 8), sy(L.fist[1]), 0, 12, 0.35, FXI.fire);
    if ((state === CHARGE && MV === 'rise') || state === MOVE) { if (Math.random() < 0.5) spawnX(K_PHYS, sx(-24 + Math.random() * 60), sy(-2), (Math.random() - 0.5) * 60, -40 - Math.random() * 60, 0.7, Math.random() < 0.3 ? FXI.frost : FXI.dust, { g: 240, floor: HY + 4 }); }
    if (state === DEATH && stT > INCOMING && stT < INCOMING + 1.9 && Math.random() < 0.35) { const x = -20 + Math.random() * 44, y = -20 - Math.random() * 44; spawnX(K_PHYS, sx(x), sy(y), (Math.random() - 0.5) * 80, -40 - Math.random() * 60, 0.5, FXI.fire, { g: 260, floor: HY + 4 }); }   // 短路的火花
  }
  function fxReset() { emT = 0; scT = 0; }
  function fxBack(f12) { const x0 = sx(-46), x1 = sx(46); for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) { const g = ((x + (f12 >> 1)) % 6); if (g === 0) E.put(x, HY + 1, FXR[FXI.frost][P.hot ? 1 : 3]); else if (g === 3) E.put(x, HY + 1, FXR[FXI.frost][4]); } }   // 脚下一线反应堆的网格光
  function setMove(id) { if (id === 'hot1') { HOT = 1; return null; } if (id === 'hot0') { HOT = 0; return null; } MV = MVDUR[id] ? id : 'hammerProto'; return MVDUR[MV]; }

  // 自己的声音（mc-audio.js 的合成函数，参数同名同序）
  const VOICES = {
    mechServo: (s, t, w, p) => { s.tone(t, 'sawtooth', 90, 1.1, 0.04 + 0.03 * w, { to: 260, slide: 1.0, lp: 1400, pan: p }); s.nz(t, 0.9, 'bandpass', 1800, 2, 0.03 * w, { pan: p }); s.blip(t + 0.95, 880, 0.04, { pan: p }); },   // 液压伺服越拧越紧
    mechSlam: (s, t, w, p) => { s.thud(t, 120, 34, 0.5, 0.24 * w, { pan: p }); s.ring(t, 164, 0.9, 0.08 * w, { pan: p, rev: 0.4, parts: [[1, 1], [1.41, 0.6], [2.76, 0.3]] }); s.nz(t, 0.14, 'highpass', 2600, 0.7, 0.08 * w, { pan: p }); s.rumble(t, 0.8, 0.12 * w, { pan: p }); },
    mechScan: (s, t, w, p) => { for (let i = 0; i < 6; i++) s.blip(t + i * 0.2, 1100 + (i & 1) * 260, 0.025 + 0.015 * w, { pan: p }); s.tone(t, 'sine', 620, 1.2, 0.02 * w, { vib: [3, 90, 0.1], pan: p }); },
    mechLaser: (s, t, w, p) => { s.tone(t, 'sawtooth', 1900, 0.4, 0.06 * w, { to: 260, slide: 0.35, lp: 4200, pan: p }); s.nz(t, 0.35, 'bandpass', 3200, 3, 0.05 * w, { pan: p }); s.tone(t, 'square', 120, 0.3, 0.04 * w, { lp: 900, pan: p }); },
    mechUplink: (s, t, w, p) => { s.riser(t, t + 1.4, 200, 3200, 0.04 + 0.03 * w, { pan: p }); for (let i = 0; i < 4; i++) s.blip(t + 0.3 + i * 0.3, 1400 + i * 200, 0.03, { pan: p }); },
    mechBeam: (s, t, w, p) => { s.tone(t, 'sawtooth', 70, 0.9, 0.08 * w, { to: 55, lp: 700, pan: p, rev: 0.5 }); s.tone(t, 'sine', 1600, 0.6, 0.04 * w, { to: 3600, slide: 0.5, pan: p }); s.nz(t, 0.6, 'bandpass', 2400, 1.5, 0.06 * w, { pan: p }); s.thud(t, 90, 30, 0.4, 0.18 * w, { pan: p }); },
    mechLock: (s, t, w, p) => { s.blip(t, 1500, 0.03 + 0.02 * w, { pan: p }); s.blip(t + 0.08, 1900, 0.03 + 0.02 * w, { pan: p }); },
    mechZap: (s, t, w, p) => { s.tone(t, 'square', 900, 0.16, 0.05 * w, { to: 180, slide: 0.14, lp: 3000, pan: p }); s.nz(t, 0.1, 'highpass', 2000, 0.7, 0.05 * w, { pan: p }); s.thud(t, 140, 60, 0.15, 0.1 * w, { pan: p }); },
    mechPower: (s, t, w, p) => { s.rumble(t, 1.6, 0.1 * w, { pan: p }); s.tone(t + 0.6, 'sine', 110, 1.5, 0.05 * w, { to: 880, slide: 1.4, pan: p }); for (let i = 0; i < 3; i++) s.blip(t + 1.4 + i * 0.18, 700 + i * 350, 0.035, { pan: p }); },   // 启动：嗡声越来越高，三声开机音
    mechBoot: (s, t, w, p) => { s.ring(t, 440, 1.0, 0.07 * w, { pan: p, rev: 0.5 }); s.ring(t + 0.1, 660, 1.0, 0.06 * w, { pan: p, rev: 0.5 }); s.tone(t, 'sawtooth', 110, 1.0, 0.06 * w, { to: 55, lp: 800, pan: p }); s.thud(t, 90, 36, 0.5, 0.2 * w, { pan: p }); s.nz(t, 0.6, 'highpass', 3000, 0.7, 0.05 * w, { pan: p }); },
    mechAlarm: (s, t, w, p) => { for (const d of [0, 0.35]) { s.tone(t + d, 'square', 740, 0.14, 0.04 * w, { lp: 2200, pan: p }); s.tone(t + d + 0.14, 'square', 560, 0.14, 0.04 * w, { lp: 2200, pan: p }); s.thud(t + d, 70, 40, 0.25, 0.14 * w, { pan: p }); } },
    mechRoar: (s, t, w, p) => { s.tone(t, 'sawtooth', 220, 1.4, 0.07 * w, { to: 330, vib: [6, 30, 0.2], lp: 1800, pan: p, rev: 0.5 }); s.tone(t, 'square', 110, 1.4, 0.04 * w, { lp: 700, pan: p }); s.nz(t, 1.2, 'highpass', 2500, 0.7, 0.06 * w, { pan: p }); s.thud(t, 80, 30, 0.6, 0.22 * w, { pan: p }); },   // 过载的汽笛 + 排气
    mechDie: (s, t, w, p) => { s.tone(t, 'sawtooth', 420, 1.8, 0.07 * w, { to: 40, slide: 1.6, lp: 1600, pan: p, rev: 0.6 }); s.crackle(t + 0.2, 1.2, 2400, 0.08 * w, { pan: p }); s.blip(t, 1800, 0.04, { pan: p }); s.thud(t + 1.0, 70, 30, 0.5, 0.2 * w, { pan: p }); },   // 断电：音调一路掉下去
  };

  return {
    name: '防卫机甲', HX, R_EL: FXI.frost, DUR, hero, P, GLOW_MATS: [EYE1, EYE2, EYE3, TL1, TL2, TL3], HIT_POINT: [0, -36], EVENTS, MAX_H: 100, OWN_MAX: 40, SHEET_K: 2,
    SFX: { body: 'metal', how: 'dissolve', pal: 'frost', style: 'meteor', w: 1, hover: 1 }, VOICES,
    MOVES: ['hammerProto', 'scan', 'orbital', 'poke', 'rise', 'p2'], MOVE_NAMES: { hammerProto: '重锤协议', scan: '扫描切割', orbital: '轨道打击（第二阶段）', poke: '重击', rise: '升起', p2: '第二阶段仪式' }, setMove,
    SHEET: [[IDLE, [0, 0.4, 1.55, 1.8]], [MOVE, [0, 2 / 12, 4 / 12, 6 / 12]], [ATTACK, [0, 2 / 12, 3 / 12, 5 / 12, 8 / 12]],
      [CHARGE, [0, 0.4, 0.8, 1.1], 'hammerProto'], [CAST, [0, 2 / 12], 'hammerProto'], [RECOVER, [0.3], 'hammerProto'],
      [CHARGE, [0.2, 0.6, 1.0, 1.3], 'scan'], [CAST, [0, 2 / 12], 'scan'], [RECOVER, [0.2], 'scan'],
      [CHARGE, [0.3, 0.8, 1.3], 'orbital'], [CAST, [0], 'orbital'], [RECOVER, [0.3], 'orbital'], [CHARGE, [0.9], 'poke'], [CAST, [0], 'poke'],
      [CHARGE, [0, 0.9, 1.5, 2.0], 'rise'], [CAST, [2 / 12], 'rise'], [CHARGE, [0, 0.2, 0.4], 'p2'], [CAST, [2 / 12], 'p2'], [RECOVER, [1.2], 'p2'],
      [HURT, [0.3, 0.42, 0.6]], [DEATH, [0.34, 0.5, 0.9, 1.2, 1.5, 1.9, 2.3, 2.6]]],
    SINK: 27, portrait, portraitHead: () => PHEAD, poseAt, drawHero: () => drawHero(), bakeHero: () => bakeHero(), onEnter, onTime, stepFX, fxReset, fxBack,
  };
}, { W: 220, H: 136 });
