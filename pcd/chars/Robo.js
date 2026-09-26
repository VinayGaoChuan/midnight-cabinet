// 机器人（敌人 · 野兽 · 普通 · 远程 600）：「远程。从远处挥舞着迷你火焰喷射器。」小圆罐独轮——锡白铁皮圆罐身坐在一个直径 8 格的大独轮上，没有腿；
// 圆顶头上一只青色大单眼镜头、头顶一根弹簧天线顶着小灯；右臂是一支细长的迷你火焰喷射器（喷嘴口一簇常燃引火），背上一只红色燃料罐，罐顶弯管绕出背后 2 格、
// 从机身下穿到前面接到喷射器。攻击 = 喷嘴一抖喷出一团翻滚火球；技能（无特性，表现「挥舞火焰喷射器」）= 压力表打进红区后，把喷射器从上往下扫出一道扇形连续火流。
// 死亡 = 短路爆散：冒电火花、抽搐，燃料罐「砰」地炸开一团火，镜头、天线、轮子四散，独轮滚出去倒下。
PCD.define('Robo', (E) => {
  const { parts, Sprite, bake, begin, part, sp, run, rect, line, ease, clamp01, q12, f12of, walkDemo, near, FXI, FXR, HY, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_RISE, K_DUST, K_EMBER, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, shoot, death, sfx } = E;
  const RD = Math.round;

  // ───── 元素：迷你喷火 · 火焰（fire：白 → 淡黄 → 橙 → 红 → 深红）；油烟 / 蒸汽 dust；短路火花 bolt ─────
  const R_EL = FXI.fire, EL = FXR[R_EL], R_SMOKE = FXI.dust, R_SPARK = FXI.bolt;

  // ───── 材质：锡白铁皮（设定色经 near() 就近取共享色）、红燃料罐 + 金黑警示条、墨胶轮胎、钢轮毂、铁枪管 / 软管、青镜头 ─────
  const TIN = ['#141a20', '#3a4a58', '#7a8ea0', '#c0ccd8'].map((h) => near(h));
  const M = parts.mats(E, {
    tin: { r: TIN, band: 2 }, tinS: TIN, tank: 'crimson', gold: 'gold', ink: { r: 'ink', flat: 1 }, tire: [0, 27, 27, 28], hub: 'steel', iron: 'iron', dial: 'bone',
    lens: { r: [39, 40, 41, 22], flat: 1 }, red: { r: [55, 56, 57, 58], flat: 1 }, flame: { r: [44, 46, 47, 21], flat: 1 }, lamp: { r: [44, 45, 47, 21], flat: 1 },
  });
  const HX = 34, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(46, 42, 21, 38);                     // 脚底（轮底）= (21, 38)；放得下 45° 上举的枪管、天线、背后的软管
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 3, 8, 12], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['lens', 'red', 'flame', 'lamp', 'dial', 'ink', 'gold', 'tire']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：a 枪管方向 -2..2（45° 上 / 1:2 上 / 平 / 1:2 下 / 45° 下）；rec 枪管后坐；spin 轮辐 0–3；lean / bob 整个机身（轮子不动）；
  //       lens 镜头伸出对焦；red 镜头转红；gem 引火 0–4；ant 天线甩；tank 燃料罐鼓起；gauge 压力表 0 / 1 / 2 红区；bhx / bhy 小爪 ─────
  const P = { a: 0, rec: 0, lean: 0, bob: 0, spin: 0, lens: 0, red: 0, gem: 0, wisp: 0, ant: 0, lamp: 0, tank: 0, gauge: 0, bhx: -4, bhy: -11,
    bx: 0, eyes: 0, flash: 0, rim: 0, dq: 0, st: 0, lying: 0, lift: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const KEY1 = parts.keyer([['a', -2, 2], ['rec', 0, 2], ['lean', -1, 1], ['bob', 0, 1], ['spin', 0, 3], ['lens', 0, 1], ['red', 0, 1], ['gem', 0, 4], ['wisp', 0, 1], ['ant', -2, 2],
    ['lamp', 0, 1], ['tank', 0, 1], ['gauge', 0, 2], ['bhx', -8, 15], ['bhy', -24, 0]]);
  const KEY2 = parts.keyer([['bx', -8, 8], ['eyes', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['dq', 0, 48, 48], ['st', 0, 8]]);
  const BAL = [0, 1, 0, -1];
  const T_FIRE = 2 / 12, T_BURN = 2 / 12, T_BOOM = INCOMING + 0.8, T_LAND = INCOMING + 1.3;

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st; P.a = 0; P.rec = 0; P.lean = 0; P.bob = 0; P.spin = 0; P.lens = 0; P.red = 0; P.gem = 0; P.wisp = f12 & 1; P.ant = 0; P.lamp = 0; P.tank = 0; P.gauge = 0;
    P.bhx = -4; P.bhy = -11; P.bx = 0; P.eyes = 0; P.flash = 0; P.rim = 1; P.dq = 0; P.flip = 0; P.mx = 0;
    const idle = () => {                                                  // 找平衡自检：原地前后晃轮，天线弹簧晃，灯一闪一闪
      const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.lean = BAL[b & 3]; P.spin = P.lean < 0 ? 3 : P.lean; P.ant = -BAL[(b + 1) & 3]; P.lamp = b & 1 ? 0 : 1;
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 && lp < 2.0) { const f = Math.floor((lp - 1.6) * 12 + 1e-6); P.lean = 0; P.lens = f >= 1 && f <= 2 ? 1 : 0; P.gem = f >= 3 ? 2 : 0; P.ant = f === 3 ? 2 : P.ant; }   // 个性：镜头伸出对焦，喷嘴「噗」地冒一下火
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                              // 独轮滚动：轮辐逐帧转，机身前后微晃找平衡
      const f = E.gait(tq); P.spin = f; P.lean = [1, 0, 1, -1][f]; P.bob = [0, 1, 0, 1][f]; P.ant = [-1, 0, -2, 1][f]; P.lamp = f & 1; P.a = f === 1 ? -1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                          // 射：枪管后引上抬 → 喷嘴一抖喷出火球 → 后坐
      if (tq < T_FIRE) { P.a = -1; P.rec = tq < 1 / 12 ? 1 : 2; P.lean = -1; P.gem = 1; P.ant = 1; }
      else if (tq < 3 / 12) { P.a = 0; P.rec = 0; P.lean = 1; P.gem = 3; P.rim = 2; P.ant = -2; P.lamp = 1; }
      else if (tq < 0.45) { P.a = tq < 4 / 12 ? -1 : 0; P.rec = 1; P.bx = -1; P.gem = 1; P.ant = -1; }
      else { const q = clamp01((tq - 0.45) / 0.3); P.rec = q < 0.5 ? 1 : 0; P.ant = q < 0.5 ? 1 : 0; }
    } else if (st === CHARGE) {                                          // 压力表指针抖进红区，罐体一鼓一鼓，喷嘴引火 1 → 3 档，身上冒白汽
      const q = ease.inOut(clamp01(tq / 0.7)); P.lean = -RD(q); P.a = q > 0.5 ? -2 : -1; P.rec = q > 0.5 ? 1 : 0;
      P.gauge = tq < 0.4 ? 0 : tq < 0.8 ? 1 : ((f12 & 1) ? 2 : 1); P.tank = tq > 0.45 ? (f12 >> 1) & 1 : 0;
      P.gem = tq < 0.45 ? 1 : tq < 1.0 ? 2 : ((f12 & 1) ? 3 : 2); P.rim = 2; P.ant = tq > 1.0 ? ((f12 & 1) ? 1 : -1) : 0; P.lamp = f12 & 1;
    } else if (st === CAST) {                                            // 喷射器从上往下扫出扇形火流，镜头转红
      const f = Math.min(5, f12of(t)); P.a = [-2, -1, 0, 0, 1, 1][f]; P.red = 1; P.gem = 3; P.rim = 3; P.lean = -1; P.bx = -1; P.gauge = 2; P.tank = f & 1; P.lamp = 1; P.ant = f & 1 ? 2 : 1;
    } else if (st === RECOVER) {                                         // 喷嘴冒黑烟，用小爪扇风
      const q = ease.inOut(clamp01(tq / 0.6)); P.a = q < 0.5 ? 1 : 0; P.red = tq < 0.1 ? 1 : 0; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.gauge = q < 0.5 ? 1 : 0;
      if (tq >= 0.12 && tq < 0.6) { P.bhx = 9; P.bhy = (f12 >> 1) & 1 ? -19 : -17; }
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { P.lean = -1; P.a = -1; P.bx = -2; P.eyes = 1; P.ant = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.spin = 3; }
      else if (h < 0.35) { P.lean = -1; P.bx = -1; P.eyes = 1; P.ant = 1; P.rim = 0; P.spin = 3; }
      else { P.ant = -1; }
    } else if (st === DEATH) {                                           // 短路：抽搐、镜头乱闪 → 燃料罐炸开 → 死亡套件散架
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { P.lean = -1; P.a = -1; P.bx = -2; P.eyes = 1; P.ant = 2; P.flash = d < 1 / 12 ? 1 : 0; P.spin = 3; P.gem = (f12 & 1) ? 1 : 0; }
      else if (d < T_BOOM - INCOMING) {
        P.lean = (f12 & 1) ? 1 : -1; P.a = (f12 % 3) - 1; P.bx = -2 + (f12 & 1); P.ant = (f12 & 1) ? 2 : -2; P.eyes = f12 & 1; P.gem = (f12 & 1) ? 1 : 4;
        P.spin = f12 & 3; P.gauge = 2; P.tank = d > 0.55 ? 1 : (f12 >> 1) & 1; P.lamp = f12 & 1;
      } else { P.gem = 4; P.dq = 1; }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.gem = 1;
    }
    const g = barrelGeo(P.lean, P.bob); P.gx = g.tip[0] + 1 + P.bx; P.gy = g.tip[1];
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前：小爪 → 软管 → 燃料罐 → 轮胎 → 轮毂 → 叉架 → 圆罐身 → 圆顶头 → 天线 → 镜头 → 喷射器 → 引火）─────
  const DIRS = [[1, -1], [1, -0.5], [1, 0], [1, 0.5], [1, 1]];
  const BL = 8;
  function barrelGeo(ox, oy) {
    const d = DIRS[P.a + 2], x0 = 6 + ox - P.rec, y0 = -14 + oy, at = (k) => [x0 + RD(k * d[0]), y0 + Math.floor(k * d[1] + 1e-6)];
    return { x0, y0, d, at, tip: at(BL + 1) };
  }
  // 候选部件：小机械爪——1 格铁臂 + 两根开口钢爪指；平时藏在机身后面，扇风时伸到身前
  function clawArm(ox, oy) {
    part(); const sx = -3 + ox, sy = -15 + oy, hx = P.bhx + ox, hy = P.bhy + oy;
    line(sx, sy, hx, hy, M.iron, 0); sp(hx + 1, hy - 1, M.hub, 4); sp(hx + 2, hy - 1, M.hub, 3); sp(hx + 1, hy + 1, M.hub, 2); sp(hx + 2, hy + 1, M.hub, 2);
  }
  // 候选部件：输油软管——1 格粗、每 2 格一道亮箍；从罐顶绕出背后 2 格往下，从机身下穿到前面接喷射器机匣
  const HOSE = [[-9, -21], [-10, -22], [-11, -22], [-12, -21], [-12, -13], [-11, -11], [-10, -9], [-5, -9], [4, -9], [5, -10], [6, -11], [6, -12], [5, -13]];
  function hose(ox, oy) {
    part(); let n = 0;
    for (let i = 0; i + 1 < HOSE.length; i++) {
      const [x0, y0] = HOSE[i], [x1, y1] = HOSE[i + 1], L = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
      for (let k = 0; k < L; k++) { const x = RD(x0 + (x1 - x0) * k / L), y = RD(y0 + (y1 - y0) * k / L); sp(x + ox, y + oy, M.iron, (n++ & 1) ? 4 : 0); }
    }
  }
  // 候选部件：背负燃料罐——竖胶囊红罐、上下两道金黑警示斜纹、侧面 3×3 压力表（骨白表盘 + 红区 + 墨指针，gauge 0 / 1 / 2）；tank 1 = 罐身往后鼓 1 格
  function fuelTank(ox, oy) {
    part();
    for (let y = -20; y <= -10; y++) {
      const cap = y === -20 || y === -10, x0 = cap ? -9 : -10 - (P.tank && y >= -18 && y <= -12 ? 1 : 0), x1 = cap ? -8 : -7;
      for (let x = x0; x <= x1; x++) { const stripe = y === -18 || y === -12; sp(x + ox, y + oy, stripe ? (((x + y) & 1) ? M.gold : M.ink) : M.tank, stripe && ((x + y) & 1) ? 3 : 0); }
    }
    sp(-9 + ox, -21 + oy, M.iron, 0); sp(-8 + ox, -21 + oy, M.iron, 4);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) sp(-9 + i + ox, -15 + j + oy, i === 1 && j === -1 ? M.tank : M.dial, i === 1 && j === -1 ? 4 : (i + j < 0 ? 4 : 3));
    const nd = [[-1, 0], [0, -1], [1, -1]][P.gauge]; sp(-9 + ox, -15 + oy, M.iron, 0); sp(-9 + nd[0] + ox, -15 + nd[1] + oy, M.ink, 0);
  }
  // 候选部件：独轮——直径 8 格的墨胶轮胎（胎面花纹随 spin 转 22.5°）+ 单独一个部件的钢轮毂（4 根辐条 + 轴心）
  function wheel() {
    part();
    const a0 = P.spin * Math.PI / 8;
    for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) { const d = Math.hypot(i, j); if (d > 4.3 || d <= 2.6 || j > 4) continue; sp(i, -4 + j, M.tire, 0); }
    for (let k = 0; k < 8; k++) { const a = a0 + k * Math.PI / 4; if (k & 1) continue; sp(RD(Math.cos(a) * 3.7), RD(-4 + Math.sin(a) * 3.7), M.tire, 4); }
    part();
    for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (Math.hypot(i, j) <= 2.3) sp(i, -4 + j, M.hub, 2);
    for (let k = 0; k < 4; k++) { const a = a0 + k * Math.PI / 2; sp(RD(Math.cos(a) * 1.6), RD(-4 + Math.sin(a) * 1.6), M.hub, 4); sp(RD(Math.cos(a) * 2.3), RD(-4 + Math.sin(a) * 2.3), M.hub, 3); }
    sp(0, -4, M.iron, 0);
  }
  // 候选部件：独轮叉架——从机身底伸到轮轴的铁叉 + 轴头螺母（压在轮毂前面）
  function fork(ox, oy) {
    part(); line(ox, -9 + oy, 0, -5, M.iron, 0); line(ox - 1, -9 + oy, -1, -5, M.iron, 0); sp(0, -4, M.iron, 4); sp(1, -4, M.iron, 0);
  }
  // 候选部件：圆罐身——锡白铁皮（band 2）上下圆角、中间一道箍缝、4 颗铆钉、前脸散热格栅、胸前一块金黑警示贴
  function canBody(ox, oy) {
    part();
    for (let y = -19; y <= -9; y++) { const w = y === -19 || y === -9 ? [-4, 3] : y === -18 || y === -10 ? [-5, 4] : [-6, 5]; run(y + oy, w[0] + ox, w[1] + ox, M.tin, 0); }
    run(-14 + oy, -5 + ox, 4 + ox, M.tin, 2);
    for (const [x, y] of [[-5, -16], [3, -16], [-5, -12], [3, -12]]) sp(x + ox, y + oy, M.tin, x < 0 ? 4 : 3);
    for (let y = -12; y <= -10; y++) sp(4 + ox, y + oy, M.tin, (y & 1) ? 1 : 3);
    for (let x = 0; x <= 2; x++) { sp(x + ox, -17 + oy, ((x) & 1) ? M.ink : M.gold, 3); sp(x + ox, -16 + oy, ((x + 1) & 1) ? M.ink : M.gold, 3); }
  }
  // 候选部件：圆顶头——5 行半圆锡盖 + 1 行铁颈圈，盖顶一颗铆钉
  function dome(ox, oy) {
    part();
    for (const [y, a, b] of [[-25, -2, 1], [-24, -3, 2], [-23, -4, 3], [-22, -4, 3], [-21, -4, 3]]) run(y + oy, a + ox, b + ox, M.tinS, 0);
    run(-20 + oy, -3 + ox, 2 + ox, M.iron, 0); sp(-1 + ox, -24 + oy, M.tinS, 4); sp(-3 + ox, -22 + oy, M.tinS, 2);
  }
  // 候选部件：弹簧天线——4 圈锯齿弹簧（每行左右错 1 格），越往上随 ant 甩得越多，顶上 2×2 小灯（lamp 1 = 亮）
  function antenna(ox, oy) {
    part(); const x0 = -1 + ox, y0 = -26 + oy;
    for (let k = 0; k < 4; k++) sp(x0 + (k & 1) + RD(P.ant * (k + 1) / 5), y0 - k, M.hub, (k & 1) ? 4 : 2);
    const sw = RD(P.ant * 0.9); sp(x0 + sw, y0 - 4, M.hub, 0);
    rect(x0 + sw, y0 - 6, 2, 2, M.lamp, P.lamp ? 3 : 2); sp(x0 + sw, y0 - 6, M.lamp, P.lamp ? 4 : 2);
  }
  // 候选部件：单眼镜头——3×3：四角铁框、边一圈蓝玻璃、中心青光（red 1 转红，eyes 1 熄灭）；lens 1 = 向前伸出 1 格对焦，后面露出镜筒
  function lens(ox, oy) {
    part(); const cx = 3 + ox + P.lens, cy = -23 + oy, m = P.red ? M.red : M.lens;
    if (P.lens) sp(cx - 2, cy, M.iron, 0);
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      if (i && j) { sp(cx + i, cy + j, M.iron, i < 0 && j < 0 ? 4 : 0); continue; }
      sp(cx + i, cy + j, m, P.eyes ? 1 : (!i && !j ? 4 : (i < 0 || j < 0) ? 3 : 2));
    }
  }
  // 候选部件：迷你火焰喷射器——肩关节球 + 3×3 机匣 + 2 格粗细长枪管（上沿每 2 格一片散热鳍，按 0 / 1:2 / 45° 吸附）+ 4 格粗喷嘴（口沿亮一级）+ 机匣下的红色小油瓶
  function thrower(ox, oy) {
    part(); const g = barrelGeo(ox, oy);
    rect(2 + ox, -15 + oy, 2, 2, M.hub, 0);
    rect(3 + ox - P.rec, -15 + oy, 3, 3, M.iron, 0); sp(3 + ox - P.rec, -15 + oy, M.iron, 4);
    sp(4 + ox - P.rec, -12 + oy, M.tank, 0); sp(5 + ox - P.rec, -12 + oy, M.tank, 3);
    for (let k = 0; k <= BL; k++) {
      const [x, y] = g.at(k), noz = k >= BL - 1;
      sp(x, y, M.iron, (k & 1) === 0 && k > 1 && !noz ? 4 : 0); sp(x, y + 1, M.iron, 0);
      if (noz) { sp(x, y - 1, M.iron, k === BL ? 4 : 0); sp(x, y + 2, M.iron, 0); }
    }
  }
  // 引火（发光体，5 档：0 常燃小火苗 / 1 变大 / 2 蓄满 / 3 白芯喷发 / 4 熄灭）
  function pilot(ox, oy) {
    if (P.gem === 4) return;
    const [tx, ty] = barrelGeo(ox, oy).tip; part();
    if (P.gem === 0) { sp(tx, ty + P.wisp, M.flame, 3); return; }
    sp(tx, ty, M.flame, 3); sp(tx, ty + 1, M.flame, 2); sp(tx + 1, ty + P.wisp, M.flame, 2);
    if (P.gem >= 2) { sp(tx + 1, ty, M.flame, 3); sp(tx + 1, ty + 1, M.flame, 3); sp(tx + 2, ty + 1 - P.wisp, M.flame, 2); sp(tx, ty - 1, M.flame, 2); }
    if (P.gem === 3) { sp(tx, ty, M.flame, 4); sp(tx + 1, ty, M.flame, 4); sp(tx + 1, ty + 1, M.flame, 4); sp(tx + 2, ty, M.flame, 3); sp(tx + 3, ty + P.wisp, M.flame, 2); sp(tx, ty + 2, M.flame, 2); }
  }
  function drawHero() {
    begin(hero, P.bx, 0, 0); const ox = P.lean, oy = P.bob;
    clawArm(ox, oy); hose(ox, oy); fuelTank(ox, oy); wheel(); fork(ox, oy); canBody(ox, oy); dome(ox, oy); antenna(ox, oy); lens(ox, oy); thrower(ox, oy); pilot(ox, oy);
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  let chargeAcc = 0, steamAcc = 0, flameAcc = 0, smokeAcc = 0, sparkAcc = 0, soulAcc = 0, lastSpin = -1, lastGem = 0, mzT = 9, mzX = 0, mzY = 0;
  function onEnter(s) {
    if (s !== CAST) return;
    const gx = wx(P.gx), gy = wy(P.gy);
    releaseOrbit(60, 120, 0.2, 0.4, { to: [DUMMY_X - 2, HY - 14, 3] });
    burst(gx, gy, 18, 50, 120, 0.2, 0.45, R_EL, 6); ring(gx, gy, 0, R_EL); fx.cross(gx, gy, 5, R_EL, 0.25);
    shake(0.28, 2); flash(0.05);
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_FIRE) {                                  // 喷嘴一抖：短火舌 + 翻滚火球
      mzT = 0; mzX = wx(P.gx); mzY = wy(P.gy);
      shoot(1, mzX + 2, mzY, 150, DUMMY_X - 3, R_EL, 0, { trail: { every: 1, life: [0.15, 0.35], back: [10, 30] } });
      burst(mzX, mzY, 6, 30, 70, 0.12, 0.3, R_EL, 4);
      sfx('swing', { kind: 'gun', w: 0.3 }); sfx('shoot', { proj: 'fire' });
    }
    if (s === CAST && t === T_BURN) {                                    // 火流烧到目标：点燃 + 地面火线 0.6 s
      const x0 = HX + 14;
      dummyFx({ dur: 1.2, tint: 'fire' }); hitDummy(1); burst(DUMMY_X - 2, HY - 14, 16, 40, 100, 0.2, 0.5, R_EL, 10);
      fx.wave(x0, HY, 1, DUMMY_X + 6 - x0, 3, R_EL, 0.6, 1); shake(0.12, 1); sfx('impact', { pal: 'fire', w: 0.5 });
    }
    if (s === DEATH && t === T_BOOM) {                                   // 燃料罐「砰」地炸开 → 散架
      poseAt(DEATH, T_BOOM - 1 / 12, T_BOOM - 1 / 12); P.gem = 4; P.k1 = KEY1(P); P.k2 = KEY2(P); drawHero(); bakeHero(); hero.k1 = hero.k2 = -1;
      death.start('parts', { power: 0.9, fromX: -9, fromY: -15, push: 6, fadeAt: 1.0, fadeDur: 0.6 });
      const tx = wx(-9 + P.bx), ty = wy(-15);
      burst(tx, ty, 30, 50, 140, 0.25, 0.6, R_EL, 14); burst(tx, ty, 10, 20, 60, 0.5, 0.9, R_SMOKE, 16); ring(tx, ty, 1, R_EL); fx.cloud(tx, ty - 2, 6, R_SMOKE, 1.0, 2);
      shake(0.2, 2); flash(0.04); sfx('hit', { mat: 'metal', w: 0.7 });
    }
    if (s === DEATH && t === T_LAND) { for (let i = 0; i < 10; i++) spawn(K_DUST, HX - 12 + Math.random() * 28, HY - 1, (Math.random() - 0.5) * 26, -6 - Math.random() * 10, 0.4 + Math.random() * 0.3, FXI.dust); sfx('fall', { w: 0.35 }); }
  }
  const EVENTS = [[], [], [T_FIRE], [], [T_BURN], [], [], [T_BOOM, T_LAND], []];
  function impactOn(k, x, y) {
    if (k !== 1) return;
    burst(x, y, 10, 40, 90, 0.15, 0.35, R_EL, 10); burst(x, y, 3, 10, 30, 0.4, 0.6, R_SMOKE, 12); hitDummy(0); dummyFx({ dur: 0.4, tint: 'fire' });
    sfx('hit', { mat: 'flesh', w: 0.3 });
  }
  function hurtFx(s) {                                                   // 铁皮：火花 + 白火星 + 两点电火花
    const hx = HX + 1, hy = HY - 14; burst(hx, hy, s === DEATH ? 26 : 20, 60, 150, 0.2, 0.5, FXI.impact, 20); burst(hx, hy, 4, 60, 120, 0.6, 0.9, R_SPARK, 30);
    shake(0.16, s === DEATH ? 2 : 1); if (s === DEATH) flash(0.04); return true;
  }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy), sg = P.flip ? -1 : 1;
    if (state === CHARGE) {                                              // 火星螺旋收进喷嘴 + 机身冒白汽
      chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.35), 0, 9, R_EL, a, r, 4 + Math.random() * 3); }
      steamAcc += dt * (stT > 0.4 ? 16 : 6);
      while (steamAcc >= 1) { steamAcc -= 1; spawn(K_EMBER, wx(-6 + Math.random() * 10 + P.bx), wy(-20 - Math.random() * 2), (Math.random() - 0.5) * 8, -12 - Math.random() * 10, 0.4 + Math.random() * 0.4, R_SMOKE); }
    }
    if (state === CAST) {                                                // 扇形连续火流（每帧 6 颗高速前喷）+ 黑烟尾
      const d = DIRS[P.a + 2], L = Math.hypot(d[0], d[1]), ux = d[0] / L, uy = d[1] / L;
      flameAcc += dt * 72;
      while (flameAcc >= 1) { flameAcc -= 1; const an = Math.atan2(uy, ux) + (Math.random() - 0.5) * 0.28, v = 150 + Math.random() * 60; spawnX(K_PHYS, gx, gy, Math.cos(an) * v * sg, Math.sin(an) * v - 4, 0.28 + Math.random() * 0.14, R_EL, { dragX: 0.35, dragY: 0.35, g: -24, floor: HY }); }
      smokeAcc += dt * 22;
      while (smokeAcc >= 1) { smokeAcc -= 1; const v = 60 + Math.random() * 60; spawnX(K_PHYS, gx + sg * 4, gy, ux * v * sg, uy * v - 16, 0.6 + Math.random() * 0.3, R_SMOKE, { dragX: 0.3, dragY: 0.5, age0: 0.55, sz: Math.random() < 0.4 ? 2 : 1 }); }
    }
    if (state === RECOVER && stT < 0.35) {                               // 喷嘴冒一股黑烟
      smokeAcc += dt * 26;
      while (smokeAcc >= 1) { smokeAcc -= 1; spawnX(K_PHYS, gx + Math.random() * 2, gy, 6 + Math.random() * 8, -14 - Math.random() * 10, 0.6 + Math.random() * 0.4, R_SMOKE, { dragX: 0.5, dragY: 0.7, age0: 0.5 }); }
    }
    if (state === IDLE && P.gem === 2 && lastGem !== 2) { burst(gx + 1, gy, 5, 15, 35, 0.15, 0.35, R_EL, 8); spawnX(K_PHYS, gx + 2, gy - 1, 4, -10, 0.6, R_SMOKE, { age0: 0.5 }); }   // 「噗」
    lastGem = P.gem;
    if (state === MOVE && P.spin !== lastSpin) {                         // 轮子磕地（接触帧）+ 身后一道细尘
      if (P.spin === 0 || P.spin === 2) sfx('step', { w: 0.25 });
      spawn(K_DUST, wx(-4), HY - 1, -sg * (6 + Math.random() * 8), -3 - Math.random() * 4, 0.25 + Math.random() * 0.2, FXI.dust);
    }
    lastSpin = state === MOVE ? P.spin : -1;
    if (state === DEATH && stT > INCOMING + 0.3 && stT < T_BOOM) {       // 短路电火花
      sparkAcc += dt * 14;
      while (sparkAcc >= 1) { sparkAcc -= 1; const x = wx(-6 + Math.random() * 12 + P.bx), y = wy(-24 + Math.random() * 14); burst(x, y, 4, 30, 70, 0.1, 0.25, R_SPARK, 6); }
    }
    if (state === DEATH && stT > T_BOOM && stT < INCOMING + 2.3) {       // 残骸冒烟 + 魂光
      soulAcc += dt * 18;
      while (soulAcc >= 1) { soulAcc -= 1; const late = stT > INCOMING + 1.6; spawn(K_RISE, HX - 12 + Math.random() * 26, HY - 1 - Math.random() * 5, (Math.random() - 0.5) * 6, -12 - Math.random() * 14, 0.7 + Math.random() * 0.7, late && Math.random() < 0.6 ? FXI.soul : R_SMOKE); }
    }
    mzT += dt;
  }
  function fxReset() { chargeAcc = 0; steamAcc = 0; flameAcc = 0; smokeAcc = 0; sparkAcc = 0; soulAcc = 0; lastSpin = -1; lastGem = 0; mzT = 9; }
  function fxBack(f12) { if (P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12); shotFloorGlow(f12); }
  function fxFront(f12) {
    if (mzT < 2 / 12) {                                                 // 出手的短火舌（2 帧）
      const c0 = mzT < 1 / 12 ? EL[0] : EL[2];
      for (let r = 1; r <= 5; r++) { put(mzX + r, mzY, r <= 2 ? c0 : EL[r <= 4 ? 1 : 2]); if (r <= 3) { put(mzX + r, mzY - 1, EL[2]); put(mzX + r, mzY + 1, EL[r === 1 ? 1 : 3]); } }
    }
  }
  function drawShot(k, x, y, d, f12, R) {                               // 翻滚火球：2×2 白黄芯 + 绕芯转的两团火舌 + 尾焰
    if (k !== 1) return false;
    const ring6 = [[2, 0], [1, -2], [-1, -2], [-2, 0], [-1, 1], [1, 1]], p = f12 % 6;
    put(x, y, R[0]); put(x + d, y, R[1]); put(x, y - 1, R[1]); put(x + d, y - 1, R[1]); put(x - d, y, R[2]); put(x - 2 * d, y - (f12 & 1), R[3]);
    for (const q of [p, (p + 3) % 6]) { const [ox, oy] = ring6[q]; put(x + ox * d, y + oy, R[2]); put(x + ox * d - d, y + oy, R[3]); }
    return true;
  }

  return {
    name: '机器人', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.lens, M.red, M.flame, M.lamp], HIT_POINT: [0, -14], EVENTS,
    deathKit: { mode: 'parts', at: T_BOOM },
    // 音效：铁皮叮当 + 马达嗡嗡，标志性一声是喷火的「呼哧——」接一声短路的「滋啪」，重量 0.4
    SFX: { body: 'machine', how: 'explode', pal: 'fire', style: 'fire', w: 0.4 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, hurtFx, stepFX, fxReset, fxBack, fxFront, drawShot,
  };
});
