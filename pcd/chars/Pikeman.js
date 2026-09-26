// 长枪兵（部队 · 科技 · 先锋 · 普通 · batch-08）：背旋翼包悬停的轻装枪兵——背后两根桅杆各顶一副小旋翼、腋下平端钻头长枪、皮飞行盔 + 额前圆护目镜 + 盔顶风向标。
// 攻击 = 从空中斜向俯冲 4 格，腋下夹枪直刺，钻头命中时连转 3 帧；技能 = 特性「偏转」：长枪在身前转成风车 → 前方展开半圆气流屏障 → 飞来的敌弹被向上弹飞。
// 升级成链甲枪兵（ChainmailPikeman.js）：旋翼折叠成背后竖扇叶、钻头加大加马达壳、风向标长成风向标冠。
PCD.define('Pikeman', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_RISE, K_DUST, K_PHYS, K_SPIRAL_PT,
    spawn, spawnX, burst, releaseOrbit, shoot, shake, flash, fx, hitDummy, put, scrX, floorGlow, shotFloorGlow, groundShadow, sfx } = E;
  const RD = Math.round, FL = (v) => Math.floor(v + 1e-6), HALF = Math.PI / 2, PX = parts.px, RUN = parts.run, LINE = parts.line;

  // ───── 元素：气流偏转 · 风青（frost：白 → 冰青 → 青 → 钢蓝 → 深蓝）；弹开的敌弹拖钢色火星 ─────
  const R_EL = FXI.frost, EL = FXR[R_EL], R_ST = FXI.steel, R_IMP = FXI.impact;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    jacket: { r: 'sky', band: 2 },                                   // 天青飞行夹克（主材质）
    leather: 'leather', cap: 'boot', boot: 'boot', gold: 'gold', pack: 'steel', hub: 'iron', wood: 'wood', skin: 'skin', flag: 'crimson',
    drill: [27, 29, 30, 31],                                         // 螺旋钢钻头（steel 亮段）
    ink: { r: 'ink', flat: 1 },
    lens: { r: [39, 23, 22, 21], flat: 1 },                          // 护目镜玻璃
    lit: { r: [40, 23, 22, 21], flat: 1 },                           // 钻头螺纹里的气流光（发光体）
  });
  const BODY = { body: 'standard', sw: 3, lw: 2, fall: 'back' };
  const HELD = { len: 8, back: 6, cone: [3, 3, 1, 1], metal: M.drill, shaft: M.wood, band: M.gold };   // 钻头：3 → 3 → 1 → 1 的尖锥
  const SPIN = { len: 6, back: 6, cone: [3, 3, 1, 1], metal: M.drill, shaft: M.wood, band: M.gold };
  const LP = [null, { at: [8, -12], a: Math.PI * 0.75 }, { at: [13, -7], a: Math.PI * 0.875 }, { at: [16, -9], a: Math.PI }];   // 死亡时飞出的枪：空中 → 落下 → 插在地上
  const HX = 68, ALT = 5, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(88, 62, 44, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 10, 15], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['wood', 'skin', 'ink', 'lens', 'lit']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：前手 = 夹枪（hx hy a），后手 = 背包操纵杆（bhx bhy）；alt = 悬停高度 ─────
  const P = { hx: 0, hy: 0, a: 0, bhx: 0, bhy: 0, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, beard: 0, sway: 0, bend: 0,
    gem: 0, glint: 0, rim: 0, eyes: 0, flash: 0, lying: 0, lift: 0, dq: 0, alt: 0, rot: 0, jam: 0, vane: 0, stick: 0, spin: 0, legs: 0, lp: 0, wm: 0,
    st: 0, gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, a, bhx, bhy, lean, head) => ({ hx, hy, a, bhx, bhy, lean: lean || 0, head: head || 0 });
  const K_IDLE = K(4, -12, HALF, -5, -9, 0, 0);                    // 腋下平端
  const K_WIND = K(2, -13, 2.03, -6, -10, -1, 0);                  // 升高后仰，枪尖斜指前下方
  const K_DIVE = K(5, -11, 2.03, -4, -9, 1, 1);                    // 俯冲直刺
  const K_HOLD = K(5, -11, 2.03, -4, -9, 1, 0);
  const K_CHARGE = K(6, -14, HALF, -5, -10, -1, 0);                // 风车：握点在枪杆中段
  const K_CAST = K(7, -14, HALF, -4, -10, 1, 0);
  const K_HURT = K(3, -11, 1.18, -6, -10, -1, -1);
  const K_FALL = K(2, -15, 0.4, -6, -13, -1, -1);                  // 坠落打转：手甩起来
  const K_LIE = K(3, -9, HALF, -4, -8, 0, 0);
  const FIELDS = ['hx', 'hy', 'a', 'bhx', 'bhy', 'lean', 'head'];
  const setK = (A, B_, q) => E.mix(P, A, B_, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -32, 31], ['hy', -64, 15], ['a', -32, 32, 1 / ASTEP], ['bhx', -16, 15], ['bhy', -32, 0], ['lean', -1, 2], ['head', -1, 1], ['wm', 0, 1], ['lp', 0, 3]]);
  const KEY2 = parts.keyer([['alt', 0, 12], ['rot', 0, 3], ['jam', 0, 1], ['vane', 0, 2], ['stick', 0, 1], ['spin', 0, 2], ['legs', 0, 4], ['gem', 0, 4], ['glint', 0, 1],
    ['rim', 0, 3], ['eyes', 0, 1], ['flash', 0, 1], ['lying', 0, 1], ['lift', 0, 3], ['beard', -3, 3], ['sway', -2, 2], ['dq', 0, 48, 48], ['bx', -16, 15], ['st', 0, 8]]);
  const ALT_IDLE = [0, 1, 2, 1], ALT_MOVE = [1, 2, 1, 0], SWAY = [0, 1, 0, -1];
  const T_HIT = 2 / 12, T_LAND = INCOMING + 8 / 12;
  const wrapA = (a) => (a > Math.PI + 1e-6 ? a - 2 * Math.PI : a);
  const spinA = (f12, step) => wrapA(((f12 * step) % 16) * Math.PI / 8);

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.beard = 0; P.sway = 0; P.gem = 0; P.glint = 0; P.rim = 1; P.eyes = 0; P.flash = 0; P.lying = 0; P.lift = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    P.alt = ALT; P.rot = f12 & 3; P.jam = 0; P.vane = 0; P.stick = 0; P.spin = 0; P.legs = 0; P.lp = 0; P.wm = 0; P.bob = 0; P.step = 0; P.wup = 0; P.walk = 0; P.crouch = 0;
    const idle = () => {                                               // 漂浮：上下起伏 2 格，旋翼一直转；循环末尾拧一下操纵杆，身体一倾又扶正，风向标转向
      setK(K_IDLE, K_IDLE, 0); const b = FL(TT * 2.5) & 3; P.alt = ALT + ALT_IDLE[b]; P.sway = SWAY[(b + 1) & 3]; P.beard = SWAY[b];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.5 && lp < 2.0) { P.stick = 1; P.bhx += 2; P.bhy -= 1; P.lean = lp < 1.75 ? 1 : 0; P.vane = lp >= 1.67 ? 1 : 0; P.beard = lp < 1.75 ? -2 : 1; }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                            // 飘浮滑行：前倾、旋翼加速、两腿前后摆
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); P.legs = f + 1; P.alt = ALT + ALT_MOVE[f]; P.lean = 1; P.sway = -1 - (f & 1); P.beard = -1 - (f === 1 ? 1 : 0);
      P.rot = (f12 & 1) ? 2 : 0; P.a = HALF + (f === 1 ? 0.2 : 0);
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.alt = ALT + 2; P.beard = 2; P.sway = 1; }
      else if (tq < 0.2) { setK(K_DIVE, K_DIVE, 0); P.bx = 4; P.alt = ALT - 2; P.beard = -3; P.sway = -2; P.spin = 1; P.glint = 1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.2) / 0.25); setK(K_DIVE, K_HOLD, q); P.bx = RD(4 - q); P.alt = ALT - 2; P.beard = -2; P.sway = -1; P.spin = tq < 0.4 ? (f12 % 3) : 0; }
      else { const q = ease.inOut(clamp01((tq - 0.45) / 0.3)); setK(K_HOLD, K_IDLE, q); P.bx = RD(3 * (1 - q)); P.alt = RD(ALT - 2 + 2 * q); }
    } else if (st === CHARGE) {                                        // 停住，长枪在身前转成风车
      const q = ease.inOut(clamp01(tq / 0.5)); setK(K_IDLE, K_CHARGE, q); P.alt = ALT; P.beard = -2 - (q > 0.9 && (f12 & 1) ? 1 : 0); P.sway = -1;
      P.wm = tq >= 0.25 ? 1 : 0; if (P.wm) P.a = spinA(f12, 3); else P.a = HALF - q * 0.5;
      P.gem = tq < 0.45 ? 1 : ((f12 & 1) ? 2 : 1); P.rim = 2; P.spin = f12 % 3;
    } else if (st === CAST) {
      setK(K_CHARGE, K_CAST, ease.out(clamp01(tq / 0.12))); P.alt = ALT; P.wm = 1; P.a = spinA(f12 + 5, 3); P.beard = -3; P.sway = -2; P.gem = 3; P.rim = 3; P.spin = f12 % 3;
    } else if (st === RECOVER) {                                       // 枪慢下来、回到腋下
      const q = ease.inOut(clamp01(tq / 0.6)); setK(K_CAST, K_IDLE, q); P.alt = ALT;
      P.wm = tq < 0.25 ? 1 : 0; P.a = P.wm ? spinA(f12, 2) : P.a; P.gem = q < 0.35 ? 2 : q < 0.75 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; P.beard = -RD(2 * (1 - q));
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.alt = ALT - 1; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = h < 1 / 12 ? 1 : 0; P.rim = 0; P.jam = 1; P.vane = 1; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.beard = 1; P.rim = 0; P.vane = 1; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                         // 旋翼卡死冒烟 → 打转下坠 → 后仰着地，枪插在地上
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.alt = ALT - 1; P.eyes = 1; P.beard = 3; P.sway = 2; P.flash = d < 1 / 12 ? 1 : 0; P.jam = 1; P.vane = 1; P.rot = 0; }
      else if (d < 0.5) { setK(K_FALL, K_FALL, 0); P.bx = -3; P.alt = d < 0.4 ? 3 : 1; P.eyes = 1; P.beard = 2; P.jam = 1; P.rot = 0; P.flip = (f12 & 1) ? 1 : 0; P.vane = P.flip ? 0 : 1; }
      else {
        setK(K_LIE, K_LIE, 0); P.lying = 1; P.bx = -3; P.alt = 0; P.eyes = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.vane = 2; P.jam = 1;
        P.lp = d < 0.58 ? 1 : d < 0.66 ? 2 : 3;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle();
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45; else P.glint = 1;
    }
    P.hx = RD(P.hx); P.hy = RD(P.hy); P.bhx = RD(P.bhx); P.bhy = RD(P.bhy); P.a = RD(P.a / ASTEP) * ASTEP;
    P.lean = RD(P.lean); P.head = RD(P.head); P.alt = Math.max(0, RD(P.alt));
    if (P.lying) { P.gx = LP[3].at[0] + P.bx; P.gy = LP[3].at[1] + 4; }
    else if (P.wm) { P.gx = P.hx + P.bx; P.gy = P.hy - P.alt; }         // 风车中心
    else { const g = lanceGeo(Object.assign({ at: [P.hx, P.hy], a: P.a }, HELD)); P.gx = g.tip[0] + P.bx; P.gy = g.tip[1] - P.alt; }   // 钻头尖
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }

  // ───── 画（部件从后往前）─────
  // 吸附方向：DIRS 不导出，用 parts.cell 反推方向符号和主轴比例
  function ldir(a) { const di = parts.snapDir(a), c = parts.cell(di, 0, 0, 8); return { di, sx: Math.sign(c[0]), sy: Math.sign(c[1]), maj: Math.max(Math.abs(c[0]), Math.abs(c[1])) / Math.hypot(c[0], c[1]) }; }
  function lanceGeo(o) {
    const D = ldir(o.a), x0 = D.sx < 0 ? o.at[0] - 1 : o.at[0], y0 = D.sy < 0 ? o.at[1] - 1 : o.at[1], n = RD(o.len * D.maj), bk = RD(o.back * D.maj);
    return { D, x0, y0, n, bk, tip: parts.cell(D.di, x0, y0, n + o.cone.length - 1), socket: parts.cell(D.di, x0, y0, n - 1) };
  }
  // 候选部件：drillLance 钻头长枪——吸附斜率的杆（shaft）+ 两道箍（band：枪尾、握把前）+ 套口 3 格高黄铜箍 → 锥形螺旋钻头（cone 宽度表，宽段上 2 道 45° 螺纹
  // 用 metal 暗色 2 画，随 spin 0–2 错位，lit 1–2 = 螺纹发光）；motor = 马达壳材质（套口后 3 格、宽 4，外侧伸出 2 格排气小烟囱）。o = { at, a, len, back, cone, metal, shaft, band, motor, spin, lit, glint, free }
  // 两个部件：杆（+ 马达壳）→ 钻头。返回 lanceGeo（tip 枪尖、socket 套口）
  function drillLance(R, o) {
    const T = o.free ? parts.FREE : R, G = lanceGeo(o), di = G.D.di, x0 = G.x0, y0 = G.y0, n = G.n, sp = o.spin || 0, lit = o.lit || 0;
    E.part();
    parts.bar(di, x0, y0, -G.bk, n - 2, 1, (k, j, X, Y) => { const b = k === -G.bk || k === 2; PX(E, T, X, Y, b ? o.band : o.shaft, 3); });
    if (o.motor) {
      parts.bar(di, x0, y0, n - 3, n - 1, 4, (k, j, X, Y) => PX(E, T, X, Y, o.motor, j === 0 ? 4 : j === 3 ? 2 : k === n - 2 && j === 2 ? 1 : 3));
      const c = parts.cell(di, x0, y0, n - 2), pd = (di + 12) % 16; for (let s = 3; s <= 4; s++) { const q = parts.cell(pd, c[0], c[1], s); PX(E, T, q[0], q[1], o.band, s === 4 ? 4 : 2); }
    }
    E.part();
    parts.bar(di, x0, y0, n - 1, n - 1, 3, (k, j, X, Y) => PX(E, T, X, Y, o.band, j === 0 ? 4 : j === 2 ? 2 : 3));   // 套口黄铜箍：1 列 × 3 格（和钻头同一部件，不压分界线）
    const C = o.cone, L = C.length;
    for (let i = 0; i < L; i++) {
      const k = n + i, w = C[i], last = i === L - 1;
      parts.bar(di, x0, y0, k, k, w, (kk, j, X, Y) => {
        let m = o.metal, t = last ? 4 : w === 1 ? 3 : j === 0 ? 4 : j === w - 1 ? 2 : 3;
        if (w > 1 && ((i + j + sp) % 3) !== 0) { if (lit) { m = M.lit; t = lit >= 2 ? 4 : 2; } else t = 2; }   // 两道 45° 螺纹（i + j = 1、2 两条斜线）
        PX(E, T, X, Y, m, t);
      });
    }
    if (o.glint) { const c = parts.cell(di, x0, y0, n + L); PX(E, T, c[0], c[1], o.metal, 4); }
    return G;
  }
  // 候选部件：rotor 小旋翼——短桅杆（base → hub 直线）→ 2 格轴毂 + 横向桨叶（hub 上一行）。phase 0–3 → 桨叶长 [w, 0.75w, w/2, 0.75w]（侧看的旋转），
  // phase 0 / 1 在桨叶上方加一行隔点的转动虚影（blade 色 2）；jam 1 = 卡死（桨叶歪成一条 45° 短斜线）。o = { base, hub, w, mast, hubMat, blade }。两个部件
  function rotor(R, o, phase, jam) {
    const hx = o.hub[0], hy = o.hub[1];
    E.part(); LINE(E, R, o.base[0], o.base[1], hx, hy + 1, o.mast, 3);
    E.part(); PX(E, R, hx - 1, hy, o.hubMat, 4); PX(E, R, hx, hy, o.hubMat, 2);
    if (jam) { PX(E, R, hx - 3, hy, o.blade, 2); PX(E, R, hx - 2, hy - 1, o.blade, 3); PX(E, R, hx - 1, hy - 1, o.blade, 3); PX(E, R, hx, hy - 1, o.blade, 4); PX(E, R, hx + 1, hy - 2, o.blade, 4); PX(E, R, hx + 2, hy - 2, o.blade, 3); return; }
    const L = phase === 0 ? o.w : phase === 2 ? RD(o.w / 2) : RD(o.w * 0.75), a = hx - FL(L / 2), b = a + L - 1;
    for (let x = a; x <= b; x++) PX(E, R, x, hy - 1, o.blade, x === a ? 4 : x === b ? 2 : 3);
    if (phase <= 1) { const h = FL(o.w / 2); for (let x = hx - h + 1; x <= hx + h - 2; x++) if (((x + phase) & 1) === 0) PX(E, R, x, hy - 2, o.blade, 2); }   // 转动虚影
  }
  // 候选部件：rotorPack 背负铁皮箱——肩后圆角箱（8 行 × 5 格）+ 两颗黄铜铆钉 + 两道散热格栅；返回两个桅杆根 { a 后, b 前 } 和箱底 bot
  function packGeo(R) { const e = parts.edges(R, R.yS + 3), bx = e[0], top = R.yS - 1; return { bx, top, a: [bx - 3, top], b: [bx - 1, top], bot: [bx - 2, top + 7] }; }
  function rotorPack(R, g) {
    E.part(); const bx = g.bx, top = g.top;
    for (let y = top; y <= top + 7; y++) RUN(E, R, y, bx - 4 + (y === top || y === top + 7 ? 1 : 0), bx, M.pack, 0);
    PX(E, R, bx - 3, top + 1, M.gold, 4); PX(E, R, bx - 3, top + 6, M.gold, 3);
    RUN(E, R, top + 3, bx - 2, bx - 1, M.pack, 1); RUN(E, R, top + 5, bx - 2, bx - 1, M.pack, 1);
  }
  // 候选部件：flightCap 皮质飞行盔——圆顶（缝线高光）+ 后脑 + 护耳垂片（金扣）+ 额前推上去的一对圆护目镜（金框 + 玻璃高光，伸出盔檐 1 格），同一部件。返回盔顶中线 [x, y]
  function flightCap(R) {
    const x0 = R.hx0, x1 = R.hx1, top = R.htop, ey = R.ey, bot = R.hy;
    E.part();
    RUN(E, R, top - 2, x0 + 1, x1 - 3, M.cap, 0);
    RUN(E, R, top - 1, x0, x1 - 2, M.cap, 0); RUN(E, R, top, x0 - 1, x1 - 2, M.cap, 0);
    for (let y = top + 1; y <= ey + 1; y++) RUN(E, R, y, x0 - 1, x0 + 1, M.cap, 0);
    for (let y = ey + 2; y <= bot + 1; y++) RUN(E, R, y, x0, x0 + 1, M.cap, 0);
    PX(E, R, x0 + 1, bot, M.gold, 4); PX(E, R, x0 + 1, top - 1, M.cap, 4); PX(E, R, x0, top + 2, M.cap, 2);
    PX(E, R, x1 - 2, top - 1, M.gold, 3); PX(E, R, x1 - 2, top, M.gold, 2);                                   // 护目镜：后框
    PX(E, R, x1 - 1, top - 1, M.lens, 4); PX(E, R, x1, top - 1, M.lens, 3); PX(E, R, x1 - 1, top, M.lens, 3); PX(E, R, x1, top, M.lens, 2);
    PX(E, R, x1 + 1, top - 1, M.gold, 4); PX(E, R, x1 + 1, top, M.gold, 2);                                   // 前框（伸出盔檐）
    return [R.hx, top - 2];
  }
  // 候选部件：windVane 风向标——细杆（h 格）+ 7 格宽铜箭头（箭头 3 格高 + 尾羽）+ 杆上三角小旗（读 P.beard 摆）；dir 1 箭头朝前 / -1 朝后；
  // broken = 折断只剩 1 格桩；flags 2 = 杆两侧各一面旗（风向标冠）。一个部件
  function windVane(R, x, y, dir, h, o) {
    E.part();
    if (o.broken) { PX(E, R, x, y - 1, o.pole, 2); return; }
    for (let k = 1; k < h; k++) PX(E, R, x, y - k, o.pole, k === 1 ? 2 : 3);
    const ay = y - h, b = RD(P.beard || 0);   // 小旗挂在箭头尾部下方（在箭头后面，不压到盔和脸）
    RUN(E, R, ay, x - 2, x + 2, o.pole, 3); PX(E, R, x + 2 * dir, ay - 1, o.pole, 4); PX(E, R, x + 2 * dir, ay + 1, o.pole, 2); PX(E, R, x + 3 * dir, ay, o.pole, 4);
    PX(E, R, x - 3 * dir, ay - 1, o.pole, 3); PX(E, R, x - 3 * dir, ay + 1, o.pole, 2);
    const fl = (s) => { PX(E, R, x - s, ay + 1, o.flag, 4); PX(E, R, x - 2 * s, ay + 1, o.flag, 3); PX(E, R, x - s, ay + 2, o.flag, 2); if (b) PX(E, R, x - (b > 0 ? 2 : 3) * s, ay + 2, o.flag, 3); };
    fl(dir); if (o.flags === 2) fl(-dir);
  }
  function hoverLegs(R) {                                               // 悬停：两腿一前一后自然下垂；滑行时前后摆（4 档）
    const L = P.legs;
    if (L === 0) { R.footFx += 1; R.footBup = 1; }
    else if (L === 1) { R.footFx = R.hipFx + 2; R.footBx = R.hipBx - 2; R.footBup = 1; }
    else if (L === 2) { R.footFx = R.hipFx + 1; R.footBx = R.hipBx; R.footFup = 2; }
    else if (L === 3) { R.footFx = R.hipFx - 1; R.footBx = R.hipBx + 2; R.footFup = 1; }
    else { R.footFx = R.hipFx + 1; R.footBx = R.hipBx - 1; R.footBup = 2; }
  }
  function drawHero() {
    E.begin(hero, P.bx, -P.alt); const R = parts.rig(P, BODY);
    if (!R.lie) {
      hoverLegs(R); const g = packGeo(R);
      // 两根短桅杆从背包顶呈 V 字张开：远侧斜过头后、从盔前上方露出轴毂；近侧往后上方
      rotor(R, { base: g.b, hub: [g.bx + 11, g.top - 8], w: 8, mast: M.goldD, hubMat: M.hubD, blade: M.gold }, (P.rot + 2) & 3, P.jam);   // 远侧旋翼：头前上方
      rotor(R, { base: g.a, hub: [g.bx - 5, g.top - 6], w: 8, mast: M.gold, hubMat: M.hub, blade: M.gold }, P.rot, P.jam);                    // 近侧旋翼：头后上方
      rotorPack(R, g);
      E.part(); LINE(E, R, g.bot[0], g.bot[1], P.bhx, P.bhy, M.pack, 3); PX(E, R, P.bhx + 1, P.bhy - 1, M.flag, P.stick ? 4 : 3);   // 操纵杆 + 红色把头
    }
    parts.arm(E, R, P, { side: 'B', sleeve: 'loose', mat: M.jacketD, cuff: M.leatherD, hand: M.leatherD });
    parts.legs(E, R, P, { style: 'boot', mat: M.leather, matD: M.leatherD, boot: M.boot, bootD: M.bootD });
    parts.torso(E, R, P, { style: 'leather', mat: M.jacket, belt: M.leather, buckle: M.gold, strap: M.leather });
    parts.head(E, R, P, { mat: M.skin, face: 'round', eye: M.ink, nose: 'small', mouth: 'line', ear: 'none' });
    const c = flightCap(R);
    windVane(R, c[0], c[1], P.vane === 1 ? -1 : 1, 6, { pole: M.gold, flag: M.flag, broken: P.vane === 2 });
    const lit = P.gem >= 3 ? 2 : P.gem >= 1 ? P.gem : 0;
    if (R.lie) { if (P.lp) drillLance(R, Object.assign({}, HELD, LP[P.lp], { free: 1, len: P.lp === 3 ? 6 : 8 })); }
    else if (P.wm) drillLance(R, Object.assign({}, SPIN, { at: [P.hx, P.hy], a: P.a, spin: P.spin, lit }));
    else drillLance(R, Object.assign({}, HELD, { at: [P.hx, P.hy], a: P.a, spin: P.spin, lit, glint: P.glint }));
    parts.arm(E, R, P, { sleeve: 'loose', mat: M.jacket, cuff: M.leather, hand: M.leather });
    if (R.lie) {                                                        // 头边的残骸：折断的铜箭头 + 一片桨叶
      const F = parts.FREE; E.part(); RUN(E, F, -1, -22, -20, M.gold, 3); PX(E, F, -23, -1, M.gold, 4); PX(E, F, -22, -2, M.gold, 4);
      E.part(); RUN(E, F, -1, -30, -26, M.gold, 3); PX(E, F, -30, -1, M.gold, 4); PX(E, F, -27, -2, M.pack, 3); PX(E, F, -28, -2, M.pack, 2);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  const BR = 10;                                                        // 屏障半径
  let dvT = 9, dvX = 0, dvY = 0, barT = 9, barX = 0, barY = 0, hitT = 9, hitA = 0, dfT = 9, dfX = 0, dfY = 0, sprAcc = 0, soulAcc = 0, smokeAcc = 0, lastF = -1, trailAcc = 0;
  const DF = [[0, 0], [5, -7], [11, -9], [17, -21], [21, -44]];        // 弹开的敌弹：折线弹道（相对撞点）
  function dfPos(t) {
    let d = t * 150; for (let i = 1; i < DF.length; i++) { const L = Math.hypot(DF[i][0] - DF[i - 1][0], DF[i][1] - DF[i - 1][1]); if (d <= L) { const q = d / L; return [dfX + DF[i - 1][0] + (DF[i][0] - DF[i - 1][0]) * q, dfY + DF[i - 1][1] + (DF[i][1] - DF[i - 1][1]) * q]; } d -= L; }
    return null;
  }
  function onEnter(s) {
    if (s !== CAST) return;
    const cx = wx(P.hx), cy = wy(P.hy - P.alt);
    barT = 0; barX = cx + 2; barY = cy; hitT = 9;
    releaseOrbit(50, 110, 0.3, 0.6, { up: 0, to: [barX + BR + 4, barY, 4] });
    burst(cx, cy, 18, 40, 110, 0.25, 0.6, R_EL, 6);
    shoot(1, barX + BR + 300 * 0.2, barY, -300, barX + BR, FXI.enemy);   // 远处飞来一颗敌弹，0.2 秒后撞上屏障
    flash(0.05); shake(0.28, 2); sfx('impact', { pal: 'frost', w: 0.6 });
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                  // 俯冲钻刺：气流线 + 钻头火星 + 命中
      const tip = [wx(P.gx), wy(P.gy)]; dvT = 0; dvX = tip[0]; dvY = tip[1];
      hitDummy(0); burst(Math.min(tip[0], 95), tip[1], 10, 40, 100, 0.15, 0.35, R_IMP, 10); fx.cross(Math.min(tip[0], 95), tip[1], 4, R_IMP, 0.2);
      sfx('swing', { kind: 'thrust', w: 0.4 }); sfx('hit', { mat: 'metal', w: 0.4 });
    }
    if (s === DEATH && Math.abs(t - T_LAND) < 1e-9) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 30, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.12, 1); sfx('fall', { w: 0.4 });
    }
  }
  const EVENTS = [[], [], [T_HIT], [], [], [], [], [T_LAND], []];
  function impactOn(k, x, y) {                                           // 敌弹撞上屏障：向上弹飞，屏障那一段变白
    if (k !== 1) return;
    dfT = 0; dfX = x; dfY = y; hitT = 0; hitA = Math.atan2(y - barY, x - barX);
    burst(x, y, 12, 40, 110, 0.15, 0.4, R_ST, 14); fx.cross(x, y, 5, R_ST, 0.2); shake(0.12, 1);
    sfx('impact', { pal: 'metal', w: 0.4 });
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE && stT > 0.2) {                                 // 风青粒子螺旋收向风车
      sprAcc += dt * (16 + 22 * clamp01(stT / DUR[CHARGE]));
      while (sprAcc >= 1) { sprAcc -= 1; const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 8; spawn(K_SPIRAL_PT, wx(P.hx), wy(P.hy - P.alt), r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (Math.random() - 0.5) * 3); }
    }
    if (state === MOVE) {                                               // 身下拖 1–2 颗风青粒子
      const f = E.gait(q12(stT)); if (f !== lastF) { const n = 1 + (f & 1); for (let i = 0; i < n; i++) spawnX(K_PHYS, wx(-2 + Math.random() * 4), wy(-P.alt), (Math.random() - 0.5) * 8, 10 + Math.random() * 6, 0.5, R_EL, { g: 10, floor: HY }); lastF = f; }
    }
    if (state === ATTACK && stT > T_HIT && stT < 0.4) {                  // 钻头连转：枪尖喷钢色火星
      trailAcc += dt * 40; while (trailAcc >= 1) { trailAcc -= 1; spawnX(K_PHYS, Math.min(wx(P.gx), 95), wy(P.gy), -20 - Math.random() * 40, -30 + Math.random() * 40, 0.25 + Math.random() * 0.15, R_ST, { g: 120 }); }
    }
    if (dfT < 1) {                                                      // 弹开的敌弹一路拖钢色白火花
      const p = dfPos(dfT); if (p) { trailAcc += dt * 50; while (trailAcc >= 1) { trailAcc -= 1; spawnX(K_PHYS, p[0], p[1], (Math.random() - 0.5) * 20, Math.random() * 10, 0.2 + Math.random() * 0.2, R_ST, { g: 60 }); } }
    }
    if (state === DEATH && stT > INCOMING && stT < INCOMING + 1.5) {       // 卡死的旋翼冒烟；倒地后从头边的残骸冒
      smokeAcc += dt * 14;
      while (smokeAcc >= 1) {
        smokeAcc -= 1; const lie = stT >= INCOMING + 0.5, x = lie ? wx(-27) : wx((Math.random() < 0.5 ? -10 : 6) + P.bx), y = lie ? HY - 2 : wy(-25 - P.alt);
        spawnX(K_RISE, x + (Math.random() - 0.5) * 3, y, (Math.random() - 0.5) * 4, -8 - Math.random() * 8, 0.8 + Math.random() * 0.5, FXI.dust, { age0: 0.3 });
      }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 20 + Math.random() * 28, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 14, 0.8 + Math.random() * 0.8, R_EL); } }
    dvT += dt; barT += dt; hitT += dt; dfT += dt;
  }
  function fxReset() { dvT = 9; barT = 9; hitT = 9; dfT = 9; sprAcc = 0; soulAcc = 0; smokeAcc = 0; lastF = -1; trailAcc = 0; }
  function fxBack(f12) {
    if (!P.lying && P.dq < 1) groundShadow(wx(0), 8, P.alt);
    if (!P.lying && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12);
    shotFloorGlow(f12);
    if (P.wm && P.dq < 1) {                                             // 风车身后的 3 条横向气流线（向后流动的虚线）
      for (let i = 0; i < 3; i++) { const y = wy(-8 - i * 6 - P.alt), L = 12 + i * 3; for (let k = 0; k < L; k++) { if (((k + f12 * 2 + i) & 3) > 1) continue; put(wx(-5 - k), y, k < 4 ? EL[1] : k < 9 ? EL[2] : EL[3]); } }
    }
  }
  function fxMid() {                                                    // 俯冲气流线：3 条沿俯冲方向的斜线
    if (dvT >= 0.25) return; const f = FL(dvT * 12);
    for (let i = 0; i < 3; i++) { const o = (i - 1) * 3; for (let k = 3 + f * 3; k <= 16; k++) { if (f >= 1 && (k & 1)) continue; const x = dvX - 6 - k * 2 * (P.flip ? -1 : 1), y = dvY - 2 - k + o; put(RD(x), RD(y + o * 0.3), f === 0 ? (k < 7 ? EL[0] : EL[1]) : EL[3]); } }
  }
  function fxFront(f12) {
    const cx = wx(P.hx), cy = wy(P.hy - P.alt);
    if (P.wm && P.dq < 1 && !P.lying) {                                // 风车转盘残影：内圈直径 8 + 外圈枪长半径虚线
      for (let k = 0; k < 16; k++) { const a = k / 16 * Math.PI * 2 + f12 * 0.7; put(RD(cx + Math.cos(a) * 4), RD(cy + Math.sin(a) * 4), (k + f12) & 1 ? EL[2] : EL[1]); }
      for (let k = 0; k < 28; k++) { if (((k + f12) % 3) === 0) continue; const a = k / 28 * Math.PI * 2 - f12 * 0.5; put(RD(cx + Math.cos(a) * 9), RD(cy + Math.sin(a) * 9), EL[3]); }
    }
    if (barT < 1.0) {                                                   // 半圆气流屏障：从正前方往两端逐点亮起，收招时从两端往中间熄灭
      const span = 1.3, lit = clamp01(barT / 0.15), off = clamp01((barT - 0.55) / 0.4);
      for (let ring = 0; ring < 2; ring++) {
        const r = BR + ring * 2, n = Math.ceil(r * span * 2 / 2);
        for (let k = 0; k <= n; k++) {
          const u = (k / n) * 2 - 1, a = u * span + (ring ? 0.5 / r : 0), au = Math.abs(u); if (au > lit || au > 1 - off) continue;
          if (barT > 0.4 && ((k + f12 + ring) % 3) === 0) continue;
          const x = RD(barX + Math.cos(a) * r), y = RD(barY + Math.sin(a) * r * 1.1);
          let c = au > lit - 0.2 && lit < 1 ? EL[0] : ring ? EL[2] : EL[1];
          if (hitT < 1 / 12 + 1e-6 && Math.abs(a - hitA) < 0.45) c = EL[0];
          put(x, y, c);
        }
      }
    }
    if (dfT < 1) {                                                      // 被弹飞的敌弹
      const p = dfPos(dfT); if (p) { const R = FXR[FXI.enemy], x = RD(p[0]), y = RD(p[1]); put(x, y, R[0]); put(x + 1, y, R[1]); put(x, y + 1, R[1]); put(x + 1, y + 1, R[2]); put(x - 1, y + 1, R[3]); }
    }
  }

  return {
    name: '长枪兵', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.lit], HIT_POINT: [1, -17], EVENTS,
    SFX: { body: 'flesh', how: 'topple', pal: 'frost', style: 'shield', w: 0.4, hover: 1 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
