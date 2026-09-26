// 安全鼹鼠（敌人 · 野兽 · 优质 · 近战 256）：矮墩圆胖的直立鼹鼠工头——黄色安全帽（帽前矿灯射出一道短光锥）、
// 两只比头还大的铲形挖掘巨爪、橙色反光背心（两道白反光带）、粉色星形鼻、眯缝小眼，背上插一面红白条纹施工警示旗。
// 攻击 = 扫：巨爪由下往上刨挖，把泥土扬向目标；技能 = 特性「安全光环」（身边友军受到的伤害 -4）：拔旗插地 → 矿灯转成旋转警示灯 →
// 黄黑施工护栏光罩罩住身边友军 → 一发敌弹打在罩上被弹开，只弹出一个「−」。死亡 = 钻地：原地打转刨地钻进土里，只剩安全帽在土堆上滚半圈。
// 身体用 parts.rig（child 加宽）+ legs / torso / arm 拼；鼹鼠头、安全帽 + 矿灯、铲形巨爪、警示旗、土堆是本模块的自画部件（候选部件）。
PCD.define('SafetyMole', (E) => {
  const { parts, Sprite, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING, ASTEP,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, hitDummy, put, scrX, floorGlow, sfx, allyPoints, allyFx } = E;
  const RD = Math.round, PX = parts.px, RUN = parts.run, LINE = parts.line;

  // ───── 元素：安全光环 · 警示黄橙（hazard：白 → 淡黄 → 警示黄 → 橙 → 深棕，全部取自共享色板）；刨土用 earth ─────
  const R_EL = fxRamp('hazard', [21, 51, 47, 46, 20]), EL = FXR[R_EL], R_DIRT = FXI.earth;

  // ───── 材质 ─────
  const M = parts.mats(E, {
    fur: 'steel',                                  // 深灰绒毛（头、手臂、腿）
    vest: { r: 'fire', band: 2 },                  // 橙色反光背心（面积最大）
    band: 'white',                                 // 背心反光带
    hat: 'gold',                                   // 警示黄安全帽
    palm: [11, 16, 15, 5],                         // 粉白爪掌 / 脚掌 / 吻部
    nail: 'bone',                                  // 粗爪甲、门牙（粉白）
    nose: 'pink',                                  // 星形鼻
    pole: 'steel', flag: 'crimson', flagW: 'white', knob: 'gold',
    dirt: 'leather',                               // 土堆
    ink: { r: 'ink', flat: 1 },
    lamp: { r: [20, 46, 47, 21], flat: 1 },        // 矿灯（发光体，5 档：待机 / 警示 A / 警示 B / 施放 / 熄灭）
    beam: { r: [20, 47, 51, 21], flat: 1 },        // 光锥（发光体）
  });
  const BODY = { body: 'child', leg: 4, torso: 7, head: 7, headW: 7, sw: 5, arm: 7, lw: 3, stride: 2, lift: 1 };
  const HX = 76, DUR = DEFAULT_DUR.slice();
  const hero = new Sprite(76, 50, 38, 44);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['lamp', 'beam', 'pole', 'flag', 'flagW', 'knob', 'nose', 'ink', 'dirt', 'nail']) { RIM.skip[M[k]] = 1; RIM.skip[M[k + 'D']] = 1; }

  // ───── 姿势：hx/hy 前爪（右手，靠镜头）· bhx/bhy 后爪 · cf/cb 爪甲朝向（0 朝前 · 1 朝下 · 3 朝上）─────
  const P = { hx: 0, hy: 0, bhx: 0, bhy: 0, cf: 1, cb: 1, lean: 0, head: 0, crouch: 0, bob: 0, bx: 0, step: 0, wup: 0, walk: 0, sway: 0,
    flag: 0, lamp: 0, ldir: 0, tap: 0, eyes: 0, flash: 0, rim: 0, sink: 0, hatF: 0, hatX: 0, hatY: 0, hatR: 0, mound: 0, dq: 0, st: 0,
    gx: 0, gy: 0, flip: 0, mx: 0, k1: 0, k2: 0 };
  const K = (hx, hy, bhx, bhy, lean, crouch) => ({ hx, hy, bhx, bhy, lean: lean || 0, crouch: crouch || 0 });
  const K_IDLE = K(5, -7, -6, -7);
  const K_WIND = K(6, -2, -7, -6, 1, 2);        // 蓄势：蹲下，前爪插进土里
  const K_SCOOP = K(7, -15, -5, -10, 0, 0);     // 出手：前爪由下往上刨起
  const K_HOLD = K(6, -12, -6, -9, 0, 0);
  const K_REACH = K(-1, -15, -7, -7, 0, 0);     // 伸手到背后拔旗
  const K_RAISE = K(6, -14, -6, -8, -1, 0);     // 举旗
  const K_PLANT = K(8, -7, -6, -7, 1, 1);       // 插旗
  const K_GUARD = K(5, -11, -6, -11, 0, 0);     // 蓄满：两爪举在胸前
  const K_CAST = K(7, -14, -8, -14, -1, 0);     // 施放：两爪张开高举
  const K_TAP = K(3, -20, -6, -7, 0, 0);        // 敲安全帽
  const K_HURT = K(3, -12, -6, -11, -1, 0);
  const K_DIG = K(7, -3, -5, -3, 1, 2);         // 钻地：两爪交替刨土
  const FIELDS = ['hx', 'hy', 'bhx', 'bhy', 'lean', 'crouch'];
  const setK = (A, B, q) => E.mix(P, A, B, q, FIELDS);
  const KEY1 = parts.keyer([['hx', -16, 15], ['hy', -32, 3], ['bhx', -16, 15], ['bhy', -32, 3], ['cf', 0, 3], ['cb', 0, 3], ['lean', -1, 1], ['head', -1, 1],
    ['crouch', 0, 4], ['bob', 0, 1], ['step', -1, 1], ['wup', 0, 2], ['walk', 0, 1]]);
  const KEY2 = parts.keyer([['sway', -1, 1], ['flag', 0, 3], ['lamp', 0, 4], ['ldir', 0, 2], ['tap', -1, 2], ['eyes', 0, 1], ['flash', 0, 1], ['rim', 0, 3], ['bx', -8, 15],
    ['sink', 0, 30], ['hatF', 0, 1], ['hatX', -16, 15], ['hatY', 0, 12], ['hatR', 0, 3], ['mound', 0, 3], ['dq', 0, 48, 48], ['st', 0, 8]]);
  const SWAY_IDLE = [0, 1, 0, -1];
  const T_SWING = 2 / 12, T_HIT = 3 / 12, T_PLANT = 0.6, T_SHOT = 1 / 12, T_BLOCK = 0.25, T_LAND = INCOMING + 0.66, T_HATLAND = INCOMING + 0.9;
  const HAT_Y0 = -18;                                    // 站姿时帽子锚点（头顶行），死亡时帽子从这里脱出

  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T), TT = f12 / 12;
    P.st = st;
    P.bx = 0; P.step = 0; P.wup = 0; P.walk = 0; P.sway = 0; P.head = 0; P.bob = 0; P.cf = 1; P.cb = 1; P.flag = 0; P.lamp = 0; P.ldir = 0; P.tap = 0;
    P.eyes = 0; P.flash = 0; P.rim = 1; P.sink = 0; P.hatF = 0; P.hatX = 0; P.hatY = 0; P.hatR = 0; P.mound = 0; P.dq = 0; P.flip = 0; P.mx = 0;
    const idle = () => {
      setK(K_IDLE, K_IDLE, 0); const b = Math.floor(TT * 2.5 + 1e-6); P.bob = b & 1; P.sway = SWAY_IDLE[Math.floor(TT * 1.25 + 1e-6) & 3];
      const lp = tq % DUR[IDLE];
      if (lp >= 1.6 - 1e-6 && lp < 2.0) {                                  // 待机个性「巡检」：敲敲安全帽 → 抬头 → 低头张望，光锥跟着扫
        const i = Math.min(4, f12of(lp - 1.6));
        if (i === 0) { setK(K_IDLE, K_TAP, 0.6); P.cf = 0; }
        else if (i === 1) { setK(K_TAP, K_TAP, 0); P.cf = 1; P.tap = 2; P.eyes = 1; }
        else if (i === 2) { P.ldir = 1; P.head = 1; }
        else if (i === 3) { P.ldir = 2; P.head = 1; }
      }
    };
    if (st === IDLE) idle();
    else if (st === MOVE) {                                                // 齐步走：挺胸摆臂一板一眼，前后爪和腿反向摆
      setK(K_IDLE, K_IDLE, 0); const f = E.gait(tq); parts.gait(P, f);
      P.hx = K_IDLE.hx - 2 * P.step; P.bhx = K_IDLE.bhx + 2 * P.step; P.hy = K_IDLE.hy - (P.wup ? 1 : 0); P.bhy = K_IDLE.bhy - (P.wup ? 1 : 0);
      P.cf = P.step > 0 ? 1 : 0; P.cb = P.step < 0 ? 1 : 0; P.sway = -P.sway;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      if (tq < 0.12) { setK(K_IDLE, K_WIND, ease.out(tq / 0.12)); P.cf = 0; P.ldir = 2; }
      else if (tq < 0.25) { setK(K_SCOOP, K_SCOOP, 0); P.bx = 4; P.cf = 3; P.cb = 3; P.ldir = 1; P.rim = 2; P.sway = -1; }
      else if (tq < 0.45) { const q = ease.out((tq - 0.25) / 0.2); setK(K_SCOOP, K_HOLD, q); P.bx = RD(4 - q); P.cf = 3; P.sway = 1; }
      else { const q = clamp01((tq - 0.45) / 0.3); setK(K_HOLD, K_IDLE, ease.inOut(q)); P.bx = RD(3 * (1 - q)); P.cf = q < 0.5 ? 3 : 1; }
    } else if (st === CHARGE) {
      if (tq < 0.3) { setK(K_IDLE, K_REACH, ease.inOut(tq / 0.3)); P.cf = 0; }                                    // 伸手到背后拔旗
      else if (tq < T_PLANT) { setK(K_REACH, K_RAISE, ease.out((tq - 0.3) / 0.3)); P.flag = 1; P.cf = 0; P.sway = (f12 & 1) ? 1 : -1; }   // 举旗
      else if (tq < 0.75) { setK(K_PLANT, K_PLANT, 0); P.flag = 2; P.cf = 1; }                                    // 往地上一插
      else {                                                                                                       // 矿灯转成旋转警示灯
        setK(K_PLANT, K_GUARD, ease.inOut(clamp01((tq - 0.75) / 0.25))); P.flag = 2; P.cf = 3; P.cb = 3;
        P.lamp = (f12 & 1) ? 2 : 1; P.rim = 2; P.sway = (f12 >> 1) & 1 ? 1 : -1;
      }
    } else if (st === CAST) { setK(K_GUARD, K_CAST, ease.out(clamp01(tq / 0.12))); P.flag = 2; P.cf = 3; P.cb = 3; P.lamp = 3; P.rim = 3; P.sway = 1; }
    else if (st === RECOVER) {
      if (tq < 0.25) { setK(K_CAST, K_IDLE, ease.inOut(tq / 0.25)); P.flag = 2; P.lamp = tq < 0.12 ? 2 : 0; P.rim = 2; }
      else if (tq < 0.42) { setK(K_PLANT, K_RAISE, 0.4); P.flag = 1; P.cf = 0; P.sway = -1; }                       // 拔起警示旗
      else if (tq < 0.55) { setK(K_REACH, K_REACH, 0); P.cf = 0; }                                                // 插回背上
      else { setK(K_TAP, K_IDLE, (tq - 0.55) / 0.15 > 0.5 ? 0.5 : 0); P.cf = 1; P.tap = 2; P.eyes = 1; }          // 拍拍安全帽
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle();
      else if (h < 0.2) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 1; P.tap = -1; P.cf = 3; P.cb = 3; P.ldir = 1; P.rim = 0; P.flash = h < 1 / 12 ? 1 : 0; }
      else if (h < 0.35) { setK(K_HURT, K_IDLE, 0.5); P.bx = -1; P.eyes = 1; P.sway = -1; P.rim = 0; }
      else setK(K_HURT, K_IDLE, ease.inOut(clamp01((h - 0.35) / 0.15)));
    } else if (st === DEATH) {                                             // 钻地：原地打转刨地 → 一截截钻进土里 → 安全帽落在土堆上滚半圈 → 化灰
      const d = tq - INCOMING; P.rim = 0;
      if (d < 0) { idle(); P.rim = 1; }
      else if (d < 0.3) { setK(K_HURT, K_HURT, 0); P.bx = -2; P.eyes = 1; P.sway = 1; P.tap = -1; P.cf = 3; P.cb = 3; P.crouch = d < 0.15 ? 0 : 1; P.lamp = (f12 & 1) ? 0 : 4; P.flash = d < 1 / 12 ? 1 : 0; }
      else if (d < 0.66) {
        setK(K_DIG, K_DIG, 0); const o = (f12 & 1) ? 2 : -2; P.hy += o; P.bhy -= o; P.cf = 1; P.cb = 1; P.eyes = 1; P.flip = f12 & 1; P.lamp = 4;
        P.sink = RD(clamp01((d - 0.3) / 0.36) * 17); P.mound = d < 0.42 ? 1 : d < 0.54 ? 2 : 3; P.sway = (f12 & 1) ? 1 : -1;
      } else {
        P.sink = 30; P.mound = 3; P.flag = 3; P.hatF = 1; P.lamp = 4;
        const hq = clamp01((d - 0.66) / 0.24);
        if (d < 0.9) { P.hatX = RD(-2 * hq); P.hatY = RD(1 + hq * 2 + Math.sin(hq * Math.PI) * 5); P.hatR = 0; }
        else if (d < 1.0) { P.hatX = -3; P.hatY = 3; P.hatR = 1; }          // 滚半圈：侧立 → 翻过来扣在土堆上
        else { P.hatX = -4; P.hatY = 3; P.hatR = 2; }
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
    } else if (st === REVIVE) {
      idle(); P.bob = 0;
      if (tq < 0.4) P.dq = 1; else if (tq < 0.85) P.dq = 1 - (tq - 0.4) / 0.45;
    }
    const yo = P.bob;
    P.hx = RD(P.hx); P.hy = RD(P.hy) + yo; P.bhx = RD(P.bhx); P.bhy = RD(P.bhy) + yo; P.lean = RD(P.lean); P.crouch = RD(P.crouch);
    const f = lampAt(); P.gx = f[0] + P.bx; P.gy = f[1];
    P.k1 = KEY1(P); P.k2 = KEY2(P);
  }
  const tapDY = () => (P.tap === 2 ? 1 : P.tap === -1 ? -1 : 0);
  function lampAt() {                                                      // 矿灯（发光焦点）在精灵本地坐标里的位置
    if (P.hatF) return hatFreeLamp();
    const R = parts.rig(P, BODY); return [R.hx + 4, R.htop - 1 + tapDY() + P.sink];
  }

  // ───── 自画部件 ─────
  const fr = (R, r0, x, y) => ({ r0: r0 & 3, tx: R.tx + x, ty: R.ty + y, rot: R.rot, ox: R.ox, oy: R.oy });
  // 候选部件：moleHead —— 鼹鼠头（7 行圆头 + 向前伸 2 格的尖吻；粉色星形鼻、眯缝小眼、门牙、绒毛纹），脸画在同一个部件里
  const HEAD = [[-2, 2], [-3, 3], [-3, 3], [-3, 4], [-3, 5], [-2, 5], [-1, 3]];
  function moleHead(R) {
    E.part(); const c = R.hx, top = R.htop;
    for (let i = 0; i < HEAD.length; i++) RUN(E, R, top + i, c + HEAD[i][0], c + HEAD[i][1], M.fur, 0);
    PX(E, R, c - 2, top + 4, M.fur, 2); PX(E, R, c - 1, top + 5, M.fur, 2); PX(E, R, c - 3, top + 3, M.fur, 2);   // 绒毛纹
    RUN(E, R, top + 4, c + 4, c + 5, M.palm, 0); RUN(E, R, top + 5, c + 3, c + 5, M.palm, 0);                   // 粉色吻部
    PX(E, R, c + 6, top + 4, M.nose, 3); PX(E, R, c + 6, top + 3, M.nose, 4); PX(E, R, c + 6, top + 5, M.nose, 2); PX(E, R, c + 7, top + 4, M.nose, 3);   // 星形鼻
    if (P.eyes) { PX(E, R, c + 1, top + 3, M.fur, 1); PX(E, R, c + 2, top + 4, M.fur, 1); PX(E, R, c + 3, top + 3, M.fur, 1); }
    else { PX(E, R, c + 1, top + 4, M.ink, 1); PX(E, R, c + 2, top + 4, M.ink, 1); PX(E, R, c + 1, top + 3, M.fur, 4); }   // 眯缝小眼（2 格一道墨线，上面一格亮眉）
    PX(E, R, c + 2, top + 6, M.fur, 1); PX(E, R, c + 3, top + 6, M.nail, 4);                                     // 嘴角 + 门牙
  }
  // 候选部件：hardHat —— 安全帽（4 行圆顶 + 比头宽 2 格的帽檐 + 中脊高光 + 帽箍），锚点 (0, 0) = 头顶行；T 可以是跟身体的 frame 或掉在地上的自由 frame
  const HAT = [[-3, -1, 1], [-2, -3, 2], [-1, -4, 3], [0, -4, 3], [1, -5, 5]];
  function hardHat(T) {
    E.part();
    for (const [y, a, b] of HAT) RUN(E, T, y, a, b, M.hat, 0);
    for (let y = -3; y <= 0; y++) PX(E, T, 0, y, M.hat, 4);                    // 中脊
    for (let x = -5; x <= 5; x++) PX(E, T, x, 1, M.hat, x === 5 || x === -5 ? 2 : x >= 2 ? 4 : 3);   // 帽檐：前檐亮
    PX(E, T, -4, 0, M.hat, 2);                                                // 帽后沿
  }
  // 候选部件：headLamp —— 帽前矿灯 2×2 + 光锥（向前伸 4 格，远端隔点）；lamp 0 待机 · 1 / 2 旋转警示灯（前照 / 上照交替）· 3 施放 · 4 熄灭；ldir 0 平 · 1 上 · 2 下
  const LAMP_T = [[3, 2], [4, 4], [2, 2], [4, 4], [1, 1]];
  function headLamp(T) {
    E.part(); const lv = LAMP_T[P.lamp];
    PX(E, T, 3, -1, M.lamp, lv[0]); PX(E, T, 4, -1, M.lamp, lv[0]); PX(E, T, 3, 0, M.lamp, lv[1]); PX(E, T, 4, 0, M.lamp, lv[1]);
    if (P.lamp === 4) return;
    E.part();
    if (P.lamp === 2) {                                                        // 警示灯转到上面：一道橙色短光往上
      for (let k = 1; k <= 3; k++) { PX(E, T, 3, -1 - k, M.beam, k === 1 ? 3 : 2); if (k < 3) PX(E, T, 4, -1 - k, M.beam, 2); }
      return;
    }
    const sl = P.ldir === 1 ? -0.6 : P.ldir === 2 ? 0.6 : 0, hot = P.lamp === 3 || P.lamp === 1;
    for (let k = 1; k <= 4; k++) {
      const x = 4 + k, cy = -0.5 + sl * k, hw = 0.5 + k * 0.3;
      for (let y = Math.floor(cy - hw + 0.5); y <= Math.ceil(cy + hw - 0.5); y++) {
        if (k >= 2 && ((x + y) & 1)) continue;
        PX(E, T, x, y, M.beam, k === 1 ? (hot ? 4 : 3) : k === 2 ? 3 : 2);
      }
    }
  }
  // 候选部件：shovelClaw —— 铲形挖掘巨爪（掌 3×5 + 5 根粗爪甲，一共 6×5），锚点是掌心；r0 按 90° 一档换朝向（0 爪甲朝前 · 1 朝下 · 3 朝上），一个部件
  const CLAW = ['.ppNN.', 'pppNNN', 'pppNNN', 'pppNNN', '.ppNN.'];
  function shovelClaw(T, far) {
    E.part(); const pm = far ? M.palmD : M.palm, nm = far ? M.nailD : M.nail;
    for (let j = 0; j < 5; j++) for (let i = 0; i < 6; i++) {
      const ch = CLAW[j][i]; if (ch === '.') continue; const u = i - 1, v = j - 2;
      if (ch === 'p') PX(E, T, u, v, pm, i === 0 || j === 0 ? 4 : 0);
      else PX(E, T, u, v, nm, i === 5 || (i === 4 && (j === 0 || j === 4)) ? 4 : (j & 1) ? 2 : 3);   // 5 根爪甲：逐行亮暗交替，爪尖最亮
    }
  }
  // 候选部件：warnFlag —— 施工警示旗（钢杆 + 金色杆头 + 红白斜条纹旗面 5×4，旗面往杆后飘，sway 让旗尾上下摆）
  function warnFlag(T, bx, by, tx, ty) {
    E.part(); LINE(E, T, bx, by, tx, ty, M.pole, 3); PX(E, T, tx, ty - 1, M.knob, 4);
    E.part(); const s = P.sway;
    for (let i = 1; i <= 5; i++) for (let j = 0; j < 4; j++) {
      const dy = i >= 4 ? s : i >= 3 && s > 0 ? 1 : 0; if (j === 3 && i === 5) continue;
      PX(E, T, tx - i, ty + j + dy, ((i + j) >> 1) & 1 ? M.flagW : M.flag, i === 5 ? 2 : 0);
    }
  }
  // 候选部件：dirtMound —— 土堆（半椭圆，level 1–3 一档比一档宽高，带碎石点）
  const MOUND = [[0, 0], [4, 1], [6, 2], [8, 3]];
  function dirtMound(lv) {
    E.part(); const [w, h] = MOUND[lv], T = parts.FREE;
    for (let j = 0; j < h; j++) { const hw = RD(w * Math.sqrt(1 - (j / h) * (j / h))); RUN(E, T, -j, -hw - 1, hw - 1, M.dirt, 0); }
    for (let x = -w; x < w; x += 3) PX(E, T, x, 0, M.dirt, 2);
    if (h >= 2) { PX(E, T, 1, -1, M.dirt, 4); PX(E, T, -3, -1, M.dirt, 2); }
  }
  const HATF_X = 2;
  function hatFreeT() { const y = -P.hatY - [1, 5, 3, 1][P.hatR & 3]; return { r0: P.hatR & 3, tx: HATF_X + P.hatX, ty: y, rot: 0, ox: 0, oy: 0 }; }
  function hatFreeLamp() { const T = hatFreeT(); return parts.toSprite(T, 3, -1); }
  function vest(R) {
    parts.torso(E, R, P, { style: 'tunic', mat: M.vest, hem: R.yHip });
    for (const y of [R.yS + 2, R.yS + 5]) { const e = parts.edges(R, y); RUN(E, R, y, e[0], e[1], M.band, 0); }   // 两道白反光带
    const e0 = parts.edges(R, R.yS); RUN(E, R, R.yS, e0[1] - 3, e0[1], M.fur, 0); const e1 = parts.edges(R, R.yS + 1); RUN(E, R, R.yS + 1, e1[1] - 1, e1[1], M.fur, 0);   // V 领露出绒毛
    const e3 = parts.edges(R, R.yS + 4); PX(E, R, e3[1] - 2, R.yS + 4, M.vest, 2); PX(E, R, e3[1] - 1, R.yS + 4, M.vest, 2);   // 胸前口袋
  }
  function drawHero() {
    E.begin(hero, P.bx, 0);
    const R = parts.rig(P, BODY); R.oy += P.sink;
    const flagBack = () => { const e = parts.edges(R, R.yWaist); warnFlag(R, e[0] - 1, R.yWaist + 1, e[0] - 1, R.htop - 8); };
    if (P.flag === 0 && P.sink < 30) flagBack();
    if (P.sink < 30) {
      parts.arm(E, R, P, { side: 'B', sleeve: 'bare', mat: M.furD, grip: 'none' });
      shovelClaw(fr(R, P.cb, P.bhx, P.bhy), 1);
      parts.legs(E, R, P, { style: 'shoe', mat: M.fur, matD: M.furD, boot: M.palm, bootD: M.palmD, w: 3, bootH: 1 });
      vest(R);
      moleHead(R);
      if (!P.hatF) { const T = fr(R, 0, R.hx, R.htop + tapDY()); hardHat(T); headLamp(T); }
      if (P.flag === 1) warnFlag(R, P.hx, P.hy + 3, P.hx, P.hy - 10);
      parts.arm(E, R, P, { sleeve: 'bare', mat: M.fur, grip: 'none' });
      shovelClaw(fr(R, P.cf, P.hx, P.hy), 0);
    }
    if (P.flag === 2) warnFlag(parts.FREE, 11, 0, 11, -14);                   // 插在身前地上
    if (P.flag === 3) warnFlag(parts.FREE, -2, -1, -6, -10);                  // 斜插在土堆上
    if (P.mound) dirtMound(P.mound);
    if (P.hatF) { const T = hatFreeT(); hardHat(T); headLamp(T); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const DCX = DUMMY_X, DCY = HY - 14, DOME_X = HX - 15, DOME_RX = 26, DOME_RY = 27, DOME_N = 64;
  let chargeAcc = 0, soulAcc = 0, digAcc = 0, lastStep = 0, domeT = 9, blockT = 9, blockK = 0, starT = 9, ringT = 9;
  const wx = (x) => scrX(x), wy = (y) => HY + y;
  function onEnter(s) {
    if (s === CAST) {                                                      // 施放：点阵立起成护栏罩，罩住身边友军
      releaseOrbit(40, 90, 0.3, 0.6); domeT = 0; starT = 0;
      ring(DOME_X, FLOOR - 2, 1, R_EL); burst(wx(P.gx), wy(P.gy), 18, 40, 100, 0.25, 0.55, R_EL, 8);
      allyFx({ dur: 0.5, outline: R_EL }); shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SWING) {                                   // 巨爪由下往上刨：土弧 + 一把泥块扬向目标
      const cx = wx(P.hx + P.bx), cy = wy(P.hy + 4);
      fx.slash(cx, cy, 8, 2.7, 0.35, R_DIRT, 0.2, 2, 2);
      for (let i = 0; i < 9; i++) spawnX(K_PHYS, cx + 2, cy - 2 + Math.random() * 3, 110 + Math.random() * 70, -70 - Math.random() * 50, 0.45 + Math.random() * 0.2, R_DIRT, { g: 260, dragX: 0.9, dragY: 0.95, floor: FLOOR - 1, sz: i < 3 ? 2 : 1 });
      burst(cx, cy, 6, 20, 50, 0.15, 0.3, FXI.dust, 4); sfx('swing', { kind: 'claw', w: 0.35 });
    }
    if (s === ATTACK && t === T_HIT) { burst(DCX - 3, DCY + 2, 12, 30, 80, 0.15, 0.4, R_DIRT, 8); hitDummy(0); sfx('hit', { mat: 'flesh', w: 0.35 }); }
    if (s === CHARGE && t === T_PLANT) {                                   // 插旗：地上一震
      const x = wx(11); burst(x, FLOOR - 1, 8, 20, 50, 0.2, 0.4, FXI.dust, 6); fx.crack(x, FLOOR - 1, 5, 1, R_EL, 0.4); fx.crack(x, FLOOR - 1, 4, -1, R_EL, 0.4); ringT = 0;
    }
    if (s === CAST && t === T_SHOT) shoot(3, 128, DCY + 2, -270, DOME_X + DOME_RX + 1, FXI.enemy);   // 一发敌弹飞向护罩
    if (s === CAST && t === T_BLOCK) {                                     // 命中护罩：那一段变白，弹出一个「−」
      blockT = 0; blockK = 54; const p = domePt(blockK);
      burst(p[0], p[1], 12, 30, 80, 0.15, 0.4, R_EL, 4); fx.cross(p[0], p[1], 4, R_EL, 0.2); allyFx({ dur: 0.6, outline: R_EL });
      shake(0.12, 1); sfx('impact', { pal: 'earth', w: 0.4 });
    }
    if (s === DEATH && t === T_LAND) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 10 + Math.random() * 20, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 12, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.35 });
    }
    if (s === DEATH && t === T_HATLAND) { burst(wx(HATF_X - 3), HY - 4, 5, 15, 35, 0.2, 0.35, FXI.dust, 3); }
  }
  const EVENTS = [[], [], [T_SWING, T_HIT], [T_PLANT], [T_SHOT, T_BLOCK], [], [], [T_LAND, T_HATLAND], []];
  function inner(k) { const a = Math.PI + k / DOME_N * Math.PI; return [RD(DOME_X + Math.cos(a) * (DOME_RX - 2)), RD(FLOOR - 1 + Math.sin(a) * (DOME_RY - 2))]; }
  function domePt(k) { const a = Math.PI + k / DOME_N * Math.PI; return [RD(DOME_X + Math.cos(a) * DOME_RX), RD(FLOOR - 1 + Math.sin(a) * DOME_RY)]; }
  function stepFX(dt, state, stT) {
    const gx = wx(P.gx), gy = wy(P.gy);
    if (state === CHARGE && stT > 0.75) {                                  // 警示灯转起来：黄橙光点从四周收向矿灯
      chargeAcc += dt * 26; while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + Math.random() * 8, a = Math.random() * 6.2832; spawn(K_SPIRAL, gx, gy, (r - 3.5) / (0.3 + Math.random() * 0.3), 0, 9, R_EL, a, r, 5 + Math.random() * 3); }
    }
    if (state === MOVE && P.step !== lastStep) { if (P.step !== 0) { sfx('step', { w: 0.3 }); spawn(K_DUST, wx(P.step > 0 ? 3 : -3), HY, (Math.random() - 0.5) * 12, -4 - Math.random() * 4, 0.3, FXI.dust); } lastStep = P.step; }
    if (state === DEATH && stT > INCOMING + 0.3 && stT < INCOMING + 0.66) {  // 刨土：泥块往两边飞
      digAcc += dt * 40; while (digAcc >= 1) { digAcc -= 1; const d = Math.random() < 0.5 ? -1 : 1; spawnX(K_PHYS, HX + d * 2, HY - 2, d * (30 + Math.random() * 50), -50 - Math.random() * 50, 0.5, R_DIRT, { g: 240, dragX: 0.9, dragY: 0.95, floor: FLOOR - 1 }); }
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 22; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 8 + Math.random() * 16, HY - 1 - Math.random() * 6, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    if (state === RECOVER && stT < 0.3) { chargeAcc += dt * 8; while (chargeAcc >= 1) { chargeAcc -= 1; spawn(K_EMBER, gx, gy, Math.random() * 6 - 3, -6 - Math.random() * 6, 0.5, R_EL); } }
    domeT += dt; blockT += dt; starT += dt; ringT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; digAcc = 0; lastStep = 0; domeT = 9; blockT = 9; starT = 9; ringT = 9; }
  const DOME_END = DUR[CAST] + DUR[RECOVER] - 0.05;
  function fxBack(f12) {
    if (!P.hatF && P.dq < 1) floorGlow(wx(P.gx), P.rim, EL, f12);
    const st = E.state;
    if ((st === CHARGE && ringT < 9) || domeT < DOME_END) {                 // 脚下黄黑虚线点阵：蓄力时从脚下往外画开
      const q = domeT < 9 ? 1 : clamp01(ringT / 0.6), rx = 3 + (DOME_RX - 3) * ease.out(q), n = Math.ceil(rx * 3), fade = domeT < 9 ? clamp01((domeT - DUR[CAST] - 0.2) / 0.5) : 0;
      for (let k = 0; k < n; k++) {
        if (fade > 0 && (k / n) < fade) continue; const a = k / n * 6.2832, x = RD(DOME_X + Math.cos(a) * rx), y = RD(FLOOR - 1 + Math.sin(a) * 2.5);
        put(x, y, ((k >> 1) & 1) ? 0 : EL[2]);
      }
    }
  }
  function fxFront(f12) {
    if (domeT < DOME_END) {                                                // 护栏罩：半椭圆点阵，两端往中间立起，隔两点黄 / 暗交替
      const lit = clamp01(domeT / 0.2), off = clamp01((domeT - DUR[CAST] - 0.15) / 0.5);
      for (let k = 0; k <= DOME_N; k++) {
        const e = Math.min(k, DOME_N - k) / (DOME_N / 2); if (e > lit) continue;
        if (off > 0 && Math.abs(k - DOME_N / 2) / (DOME_N / 2) < off) continue;          // 收招：从顶上往两边逐点熄灭
        const p = domePt(k), hitSeg = blockT < 0.12 && Math.abs(k - blockK) <= 6, dark = ((k >> 2) & 1) === 1;   // 外圈：4 点黄 / 4 点黑的护栏条纹
        if (dark && !hitSeg) put(p[0], p[1], 0);
        else put(p[0], p[1], hitSeg || e > lit - 0.1 ? EL[0] : domeT < 0.3 ? EL[1] : EL[2]);
        if (!(k & 1)) { const q = inner(k); put(q[0], q[1], hitSeg ? EL[1] : EL[3]); }                            // 内圈隔点橙
      }
    }
    if (blockT < 0.35) {                                                   // 「−」形小火花：一横往外上弹开
      const p = domePt(blockK), x = p[0] + 2 + RD(blockT * 20), y = p[1] - 3 - RD(blockT * 24), c = blockT < 0.1 ? EL[0] : blockT < 0.22 ? EL[1] : EL[2];
      for (let i = 0; i < 4; i++) put(x + i, y, c);
    }
    if (starT < DUR[CAST] + DUR[RECOVER] - 0.1) {                          // 友军头顶的小安全帽形星芒
      const late = starT > DUR[CAST] + 0.25;
      for (const a of allyPoints()) {
        if (late && (f12 & 1)) continue;
        const x = a.x, y = a.top - 5 + (starT < 0.15 ? 2 - RD(starT / 0.075) : 0), c = starT < 0.1 ? EL[0] : EL[2];
        for (let i = -2; i <= 2; i++) put(x + i, y, c); for (let i = -1; i <= 1; i++) put(x + i, y - 1, i === 0 ? EL[1] : c); put(x, y - 2, EL[1]);
        if ((f12 >> 1) & 1) { put(x - 3, y - 3, EL[1]); put(x + 3, y - 3, EL[1]); } else { put(x, y - 4, EL[0]); }
      }
    }
  }

  return {
    name: '安全鼹鼠', HX, R_EL, DUR, hero, P, GLOW_MATS: [M.lamp, M.beam], HIT_POINT: [1, -10], EVENTS, ALLIES: 'skill',
    REVIVE: { dy: -9, ramp: R_EL },
    SFX: { body: 'beast', how: 'collapse', pal: 'earth', style: 'shield', w: 0.35 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
