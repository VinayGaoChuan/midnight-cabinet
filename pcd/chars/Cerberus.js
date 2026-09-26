// 刻耳柏洛斯（敌人 · 混沌 · 传说 · 远程 · batch-07）：胸宽颈粗的三头巨犬，暗红褐短毛；三个头扇形伸出——前面的低、中间的最高（高出肩线 10 格）、后面的从背中段朝左上仰、吻尖朝天，
//   每个头戴一只尖刺铁项圈；三张嘴一直滴着荧绿毒涎，前面那个头的下巴垂一根断续涎丝、毒滴往下掉；尾巴是一条活的毒蛇，蛇头朝后昂起、吐信子。火只出现在技能里。
// 攻击 = 射（中间的头往后一仰，吐出一团穿甲毒液弹）；技能 = 特性「盛宴」（身边敌人死亡时回血、加速）：三股火红魂流螺旋吸进三张嘴 → 三头同时咆哮、三个冲击环错开炸开 →
//   火焰外爆，身后拖出一道火尾残影（加速）。
// 死亡：三个头一个接一个垂下 → 塌下 → 侧翻 0.2 s（往左后方倾、前腿离地）→ 侧躺，三个头堆在胸前一个压一个 → 蛇尾最后停下。
// 身体用 parts-beast 的 quad（canine 放大）拼；三个头 = quad.head 按三套颈长 / 颈角各调一次；尖刺项圈、蛇尾、毒涎是本模块的候选部件。
PCD.define('Cerberus', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_EMBER, K_RISE, K_DUST, K_BURST, K_PHYS,
    spawn, spawnX, burst, releaseOrbit, shoot, ring, shake, flash, fx, sfx, hitDummy, dummyFx, put, scrX, floorGlow, shotFloorGlow, copySprite, blitShape } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, lerp = (a, b, t) => a + (b - a) * t;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.fire, EL = FXR[R_EL], R_POI = FXI.poison, PO = FXR[R_POI];                // 盛宴 · 地狱火；普通攻击的毒液借 poison
  const m = B.mats(E, {
    main: [0, 55, 44, 19], limb: [0, 55, 44, 19],                                             // 暗红褐短毛（勾线 · 墨红 · 红褐 · 褐）
    belly: [0, 44, 19, 16], collar: 'iron', spike: 'steel', drool: 'poison', snake: 'moss', tongue: 'crimson',
    eye: [0, 0, 57, 58], glow: [45, 46, 47, 21], teeth: 'bone', claw: 'bone',                 // 眼 暗血红；口内 / 发光眼 = 火
    dripHi: [255, 49, 50, 38], dripLo: [255, 34, 48, 49],                                     // 涎丝 / 毒滴：勾线位 255 = 不描边（1 格就是 1 格细）
  });
  const mBack = Object.assign({}, m, { limb: m.far });                                         // 后面那个头整只暗一级
  const HEAD = { type: 'canine', w: 7, h: 6, snout: 5, snH: 3.5, tip: 0.6, ear: 'point', earH: 3, teeth: 2 };
  const SHAPE = { len: 17, chest: 6.5, rump: 5, waist: 0.35, hump: 1, leg: 8, lw: 3, thigh: 3, farDx: -2, stride: 3, lift: 2,
    neck: 6, neckA: 0, neckW: 3.2, head: HEAD, headA: 0.35, tail: 'none', mane: 'none', foot: 'claw', fur: 1, m };
  const oF = Q.shape(Object.assign({}, SHAPE, { neck: 6.5, neckA: 0.35 }));                     // 前头：低、往前探（颈稍抬，项圈露在胸外）
  const oM = Q.shape(Object.assign({}, SHAPE, { neck: 11, neckA: 1.35, headA: 0.1 }));           // 中头：最高
  const oB = Q.shape(Object.assign({}, SHAPE, { neck: 9, neckA: 2.36, neckW: 3, headA: -1.62, m: mBack }));   // 后头：颈根在背中段、颈朝左上 45°、吻朝天
  const oBD = Q.shape(Object.assign({}, oB, { neckA: 1.95, headA: 0.55, __quad: 0 }));           // 后头垂下（死亡）：颈放低、头往前耷拉
  const oMUp = Q.shape(Object.assign({}, SHAPE, { neck: 11, neckA: 1.85, headA: -0.75 }));       // 攻击预兆：中头颈往后仰过竖直、吻朝天
  const oMSp = Q.shape(Object.assign({}, SHAPE, { neck: 11, neckA: 1.6, headA: 0.45 }));         // 攻击出手：中头颈仍高高竖着，头从高处往前下一甩（和前头拉开）
  // 侧躺：三个头都堆在胸前 14 格以内——前头贴地、吻朝右；中头斜压在前头上方；后头垂在肩上、吻朝右下。颈段都不超过 6 格，三个项圈上下错开。
  //   颅心 / 颈根都按胸心 C1 的偏移给（跟着 lift 一起落地）；ha = 头角（吻朝向）
  const LIE_SH = [Q.shape(Object.assign({}, SHAPE, { neckW: 2.6, headA: 0 })), Q.shape(Object.assign({}, SHAPE, { neckW: 2.6, headA: 0.35 })),
    Q.shape(Object.assign({}, SHAPE, { neckW: 2.4, headA: 0.9, m: mBack }))];
  const LIE_AT = [[8, 2.4], [4.5, -1.6], [-4, -4.6]];                                          // 颅心 − C1（前 · 中 · 后）
  const LIE_NB = [[3, 1.5], [-0.5, -2.6], [-2, -3.6]];                                          // 颈根 − C1
  const SHIFT = [[0, 0], [-2, 0], [-15, 2]];                                                     // 三个头的颈根错开（前 · 中 · 后）：后头颈根挪到背中段、整只压低 3 格（中头最高）

  const HX = 34, DUR = DEFAULT_DUR.slice(), hero = new Sprite(112, 60, 52, 56);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 9, 17, 26], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'spec', 'drool', 'tongue', 'spike']) RIM.skip[m[k]] = 1;
  // 本角色的姿势字段：三个头各自的 抬低头 h? / 张嘴 j? / 眼口发光 g?（F 前 · M 中 · B 后）· tng 蛇吐信 · sn 蛇身摆 · drl 毒涎相位
  //   mA 中头攻击形体（1 后仰 · 2 甩出）· tip 死亡侧翻（1 往后倾 · 2 倾 20° 前腿离地）
  const EXTRA = [['hF', -2, 3], ['hM', -2, 3], ['hB', -2, 3], ['jF', 0, 3], ['jM', 0, 3], ['jB', 0, 3], ['gF', 0, 3], ['gM', 0, 3], ['gB', 0, 3], ['tng', 0, 1], ['sn', -2, 2], ['drl', 0, 3],
    ['mA', 0, 2], ['tip', 0, 2]];
  const SPEC = Q.KEYS.concat(B.COMMON, EXTRA);
  const P = {};
  function reset() { Q.reset(P); for (const f of EXTRA) P[f[0]] = 0; }
  reset();
  const HP = {};                                                                               // 画某个头时用的临时姿势（head / jaw / glow 换成这个头的）
  function headPose(i) {
    Object.assign(HP, P); HP.head = [P.hF, P.hM, P.hB][i]; HP.jaw = [P.jF, P.jM, P.jB][i]; HP.glow = [P.gF, P.gM, P.gB][i];
    if (P.lie === 2 || (i === 2 && P.hB >= 3)) HP.head = 0;                                   // 侧躺 / 后头垂下：头角由专用形体给
    return HP;
  }
  function shiftRig(rg, d, keepNB) {
    if (!d[0] && !d[1]) return rg; const [dx, dy] = d, mv = (p) => ({ x: p.x + dx, y: p.y + dy });
    return Object.assign({}, rg, { NB: keepNB ? rg.NB : mv(rg.NB), NT: mv(rg.NT), head: Object.assign({}, rg.head, { x: rg.head.x + dx, y: rg.head.y + dy }), eye: [rg.eye[0] + dx, rg.eye[1] + dy], mouth: [rg.mouth[0] + dx, rg.mouth[1] + dy] });
  }
  const SH = [oF, oM, oB], HS = [oF, oM, oB];                                                  // HS = 这一帧每个头实际用的形体
  let rig = Q.rig(P, oF);
  const heads = [null, null, null];
  function headRigs() {
    for (let i = 0; i < 3; i++) {
      const hp = headPose(i);
      if (rig.lie === 2) {                                                                     // 三个头堆在胸前：颅心、颈根都按胸心偏移，颈根 → 后脑勺一小段短颈
        HS[i] = LIE_SH[i]; const r0 = Q.rig(hp, HS[i]), C = rig.C1, tx = C.x + LIE_AT[i][0], ty = C.y + LIE_AT[i][1];
        const h = shiftRig(r0, [tx - r0.head.x, ty - r0.head.y], 1), a = h.head.a, W = h.head.W;
        h.NB = { x: C.x + LIE_NB[i][0], y: C.y + LIE_NB[i][1] }; h.NT = { x: tx - Math.cos(a) * W * 0.6, y: ty - Math.sin(a) * W * 0.6 };
        heads[i] = h; continue;
      }
      HS[i] = i === 2 && P.hB >= 3 ? oBD : i === 1 && P.mA ? (P.mA === 1 ? oMUp : oMSp) : SH[i];
      if (rig.lie === 1 && i) {                                                                // 塌下时中、后头的颈角照站姿算（引擎会把颈压平往前），整体跟着胸口下沉
        hp.lie = 0; const r0 = Q.rig(hp, HS[i]), dy = rig.C1.y - Q.rig(hp, oF).C1.y;
        heads[i] = shiftRig(r0, [SHIFT[i][0], SHIFT[i][1] + dy]);
      } else heads[i] = shiftRig(Q.rig(hp, HS[i]), SHIFT[i]);
    }
  }
  headRigs();
  const HIT_POINT = rig.hit;

  // ───── 姿势 ─────
  const TIP0 = 0.5, TIP = 0.2;                                                                 // 死亡：塌下（引擎 0.3–0.5 s）之后侧翻 0.2 s，再侧躺
  DUR[DEATH] = DEFAULT_DUR[DEATH] + TIP;
  const T_SPIT = 2 / 12, T_HIT = 3 / 12, T_LAND = INCOMING + 0.66 + TIP;
  // 侧翻帧：身体往左后方倾（pitch 抬胸、臀贴地），两条前腿离地往前扒（脚抬到离地 2k 格）
  function tipRig(rg, k) {
    for (const L of rg.legs) if (L.front) { L.F = [L.T[0] + 3 + k, Math.min(-2 * k, L.T[1] + L.L * 0.7)]; L.up = true; }
  }
  // 侧躺：前腿根挪到胸心后 6 格、僵直往左上伸（和后腿同一个方向），胸前留给三个头
  function lieRig(rg) {
    for (const L of rg.legs) if (L.front) {
      const tx = rg.C1.x - 6 - (L.far ? 1.5 : 0), ty = L.T[1], A = L.far ? 2.3 : 2.0, e = L.L * 0.85;
      L.T = [tx, ty]; L.F = [tx + Math.cos(A) * e, ty - Math.sin(A) * e]; L.up = true;
    }
  }
  const LOOK = [[-1, 0, 0], [0, 0, 1], [1, -1, 0], [0, 1, -1], [0, 0, -2], [-1, 0, 0]];      // 待机：三个头轮流张望（每 0.27 s 换一拍：hF hM hB）
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.sn = P.tail; P.drl = (f12 >> 1) & 3; P.tng = ((f12 >> 2) % 5) === 0 ? 1 : 0;
    if (lp < 1.6) { const k = LOOK[Math.floor(lp / 0.27 + 1e-6) % LOOK.length]; P.hF = k[0]; P.hM = k[1]; P.hB = k[2]; }
    else if (lp < 2.1) { const f = f12of(lp - 1.6); P.hM = 2; P.jM = f === 1 || f === 3 ? 3 : 1; P.jF = f >= 1 && f <= 4 ? 2 : 0; P.hF = -1; P.hB = -1; P.ear = 1; }   // 中头扭下来冲前头龇牙咬一下，前头回咬
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                    // 三头起伏的奔跑：三个头错开相位上下点
      const f = Q.anim.walk(P, tq); P.head = 0; P.hF = [1, 0, -1, 0][f]; P.hM = [0, 1, 0, -1][f]; P.hB = [-1, 0, 1, 0][f]; P.sn = P.tail; P.drl = f; P.jF = f === 0 ? 1 : 0;
      const w = walkDemo(tq, 14, 1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {                                                                // 中头往后一仰 → 往前一甩吐出毒液弹
      P.drl = f12 & 3; P.sn = 1;
      if (tq < 0.12) { P.mA = 1; P.jM = 1; P.crouch = 1; P.pitch = 1; P.hF = 1; P.hB = -1; P.ear = 1; }          // 中头往后一仰（颈过竖直、吻朝天）
      else if (tq < 0.3) { P.mA = 2; P.jM = 3; P.pitch = 0; P.bx = 1; P.hF = 2; P.hB = 0; P.sn = -1; }          // 从高处往前下一甩，前头低头让开
      else if (tq < 0.5) { P.hM = 0; P.jM = 1; P.hF = 1; P.sn = 0; }
    } else if (st === CHARGE) {                                                                // 三个头依次仰起，三双眼睛依次亮起，魂流吸进三张嘴
      const up = (t0) => (tq >= t0 ? -2 : tq >= t0 - 0.12 ? -1 : 0);
      P.hB = up(0.15); P.hM = up(0.4); P.hF = up(0.65); P.jB = tq >= 0.15 ? 2 : 0; P.jM = tq >= 0.4 ? 2 : 0; P.jF = tq >= 0.65 ? 2 : 0;
      P.gB = tq >= 0.35 ? 2 : tq >= 0.15 ? 1 : 0; P.gM = tq >= 0.6 ? 2 : tq >= 0.4 ? 1 : 0; P.gF = tq >= 0.85 ? 2 : tq >= 0.65 ? 1 : 0;
      P.crouch = tq > 0.5 ? 1 : 0; P.rim = tq < 0.5 ? 1 : 2; P.ear = 1; P.sn = (f12 & 1) ? 2 : 1; P.tng = f12 & 1;
      if (tq > 1.1) { P.bob = (f12 & 1) ? -1 : 0; if (f12 & 1) { P.gF = 3; P.gM = 3; P.gB = 3; } }
    } else if (st === CAST) {                                                                  // 三头同时咆哮：全身闪白一帧，轮廓光 3 档
      P.hF = -1; P.hM = -1; P.hB = -2; P.jF = 3; P.jM = 3; P.jB = 3; P.gF = 3; P.gM = 3; P.gB = 3; P.pitch = 1; P.rim = 3; P.ear = 1; P.sn = -2; P.tng = 1;
      P.flash = tq < 1 / 12 ? 1 : 0;
    } else if (st === RECOVER) {
      const q = clamp01(tq / 0.6), lv = q < 0.35 ? 2 : q < 0.7 ? 1 : 0;
      P.jF = q < 0.3 ? 2 : q < 0.6 ? 1 : 0; P.jM = P.jF; P.jB = q < 0.5 ? 2 : 0; P.gF = lv; P.gM = lv; P.gB = lv; P.rim = q < 0.5 ? 2 : q < 0.8 ? 1 : 0; P.hB = q < 0.5 ? -1 : 0; P.sn = q < 0.5 ? -1 : 0;
    } else if (st === HURT) {
      const h = tq - INCOMING;
      if (h < 0) idle(tq, f12);
      else { Q.anim.hurt(P, h); P.head = 0; if (h < 0.35) { P.hF = -1; P.hM = -2; P.hB = -1; P.jF = 1; P.jB = 1; P.sn = 2; } }
    } else if (st === DEATH) {                                                                 // 三个头一个接一个垂下 → 侧躺 → 蛇尾最后停下
      const d = tq - INCOMING + 1e-6;
      if (d < 0) idle(tq, f12);
      else {
        const dd = d < TIP0 ? d : d < TIP0 + TIP ? 0.45 : d - TIP;                            // 引擎的死亡时间线在塌下之后插入 0.2 s 侧翻
        Q.anim.death(P, dd, f12); P.head = 0; P.jaw = 0;
        if (d >= TIP0 && d < TIP0 + TIP) { P.tip = d < TIP0 + TIP / 2 ? 1 : 2; P.pitch = P.tip === 1 ? 2 : 4; P.bx = P.tip === 1 ? -3 : -4; }   // 往左后方倾 → 倾 20°、前腿离地
        P.hF = d >= 0.2 ? 3 : 0; P.hM = d >= 0.32 ? 3 : d < 0.3 ? -1 : 0; P.hB = d >= 0.44 ? 3 : d < 0.3 ? -1 : 0; P.jF = 1; P.jM = 1; P.jB = 1;
        P.sn = dd < 1.2 ? [2, 1, -1, -2, -1, 1][f12 % 6] : dd < 1.4 ? 1 : 0; P.tng = dd < 1.2 && (f12 & 2) ? 1 : 0;   // 蛇还在扭、吐信子，最后停下
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, oF); if (P.tip) tipRig(rig, P.tip); else if (rig.lie === 2) lieRig(rig); headRigs();
    P.gx = R(heads[1].mouth[0]) + P.bx; P.gy = R(heads[1].mouth[1]);
    B.key(P, SPEC);
  }

  // ───── 画 ─────
  // 候选部件：spikeCollar 尖刺铁项圈——只箍在自己那段颈上的 2 格宽铁箍（横穿颈、长度 = 该处颈粗），颈背两根钢尖刺伸出颈轮廓 2 格、喉下一根 1 格。
  //   far 1 = 暗一级。颈段 NB → NT、颈半径 r0 → r0·0.8，q 箍在颈上的位置
  function spikeCollar(NB, NT, r0, far, q) {
    E.part();
    const L = Math.hypot(NT.x - NB.x, NT.y - NB.y) || 1, vx = (NT.x - NB.x) / L, vy = (NT.y - NB.y) / L, nx = -vy, ny = vx;
    const cx = lerp(NB.x, NT.x, q), cy = lerp(NB.y, NT.y, q), r = Math.max(1, r0 * (1 - 0.2 * q) - 0.4);
    for (let s = -r; s <= r + 0.01; s += 0.5) for (let t = 0; t <= 1; t++) U.dot(E, cx + nx * s + vx * t, cy + ny * s + vy * t, m.collar, far ? (t ? 2 : 1) : (t ? 4 : 0));
    for (const [s, n, k] of [[-r, 2, -1], [-r + 1.5, 2, -1], [r, 1, 1]]) {                      // 尖刺：颈背两根斜着往头的方向支出轮廓 2 格、喉下一根 1 格
      const bx = cx + nx * s + vx * 0.5, by = cy + ny * s + vy * 0.5, dx = nx * k * 0.75 + vx * 0.65, dy = ny * k * 0.75 + vy * 0.65;
      for (let j = 1; j <= n; j++) U.dot(E, bx + dx * j, by + dy * j, m.spike, j === n ? (far ? 3 : 4) : (far ? 2 : 3));
    }
  }
  // 候选部件：droolDrip 毒涎——下唇沿吻部 2 个点往下挂 1 格宽的毒涎（长短按 drl 相位变），和头同一部件；无勾线材质，挂着就是 1 格细
  function droolDrip(rg, o, jaw, far) {
    if (rg.lie === 2) return; const F = Q.headFrame(rg, o, jaw);
    for (const [du, ph] of [[1.2, 0], [3, 2]]) {
      const u = F.uT - du, p = F.at(u, F.prof(u)[1] + F.gap(u) + 0.6), L = 1 + ((P.drl + ph) & 3) % 3;
      for (let k = 0; k < L; k++) U.dot(E, p[0], p[1] + k, k === L - 1 ? m.dripLo : m.dripHi, far ? 2 : 3);
    }
  }
  // 候选部件：droolStrand 涎丝——前头下巴垂下一根 1 格宽的断续丝（最长 6 格，中间断一格），下面 2 颗往下掉的 1 格毒滴（黄绿 → 墨绿，
  //   按 drl 相位下落），最低不过离地 7 格：剪影右侧下半截留空，不接地、地上不留滩
  function droolStrand(rg, o, jaw) {
    if (rg.lie) return; const F = Q.headFrame(rg, o, jaw), u = F.uT - 1.2, p = F.at(u, F.prof(u)[1] + F.gap(u) + 0.6);
    const x = R(p[0]), y0 = R(p[1]), sw = P.drl === 1 ? 1 : 0, yMin = Math.max(y0 + 5, -12);
    for (let k = 0; k < 6; k++) if (k !== 3 && y0 + k <= yMin) U.dot(E, x + (k >= 4 ? sw : 0), y0 + k, m.dripHi, k === 0 ? 3 : k & 1 ? 4 : 3);
    const DROP = [[m.dripHi, 2], [m.dripLo, 3]];                                                   // 49 → 48
    for (let k = 0; k < 2; k++) { const y = Math.max(y0, yMin) + 2 + k * 2 + (P.drl & 1); if (y <= -7) U.dot(E, x + sw, y, DROP[k][0], DROP[k][1]); }
  }
  // 候选部件：snakeTail 毒蛇尾——从臀后长出一条活蛇：先往后下垂再高高昂起（S 形，逐节收细、每 2 节一片暗鳞、腹侧浅），
  //   蛇头在最高处朝后，楔形头 + 黄眼 + 分叉信子（tng）；sn 摆动（-2..2，越往上摆得越大）；侧躺时贴地往后伸
  function snakeTail(rg) {
    E.part(); const lie = rg.lie === 2, x0 = rg.tail.x + 1, y0 = rg.tail.y, n = 14, sn = P.sn;
    let hx = 0, hy = 0;
    for (let k = 0; k <= n; k++) {
      const q = k / n, x = x0 - 1.5 - 7 * q + sn * 1.3 * q * q, y = lie ? Math.min(-1, y0 + 1 - q * 2) : y0 + 2.2 * Math.sin(q * Math.PI * 0.9) - 11 * q * q, r = 1.5 - 0.7 * q;
      U.disc(E, x, y, r, m.snake, 0); if (k % 2 === 0 && k > 1) U.dot(E, x, y - r, m.snake, 2); if (k > 2) U.dot(E, x + r * 0.7, y + 0.3, m.snake, 4);
      hx = x; hy = y;
    }
    hx = R(hx); hy = R(hy);
    const rows = lie ? [[0, -3, 0], [1, -4, 0]] : [[-1, -3, 0], [0, -4, 1], [1, -3, 0]];              // 楔形蛇头（朝后）
    for (const [dy, a, b] of rows) for (let x = hx + a; x <= hx + b; x++) U.dot(E, x, hy + dy, m.snake, dy < 0 ? 4 : dy > 0 ? 2 : 0);
    U.dot(E, hx - 2, hy - (lie ? 0 : 1), m.eye, 4);
    if (P.tng) { U.dot(E, hx - 5, hy, m.tongue, 3); U.dot(E, hx - 6, hy, m.tongue, 3); U.dot(E, hx - 7, hy - 1, m.tongue, 4); U.dot(E, hx - 7, hy + 1, m.tongue, 2); }
  }
  function neck(rg, o, far) { E.part(); U.taper(E, rg.NB.x, rg.NB.y, rg.NT.x, rg.NT.y, o.neckW, o.neckW * 0.8, far ? m.far : m.body, 0); }
  const COLLAR_Q = [0.8, 0.62, 0.55];                                                         // 项圈箍在各自颈段靠头的一截（前颈大半埋在胸里，箍在露出的那截）
  function backHeads() {                                                                     // 后头、中头（站着时在躯干后面，颈根藏进肩 / 背里）
    for (const i of [2, 1]) {
      const rg = heads[i], o = HS[i], hp = headPose(i);
      neck(rg, o, i === 2); spikeCollar(rg.NB, rg.NT, o.neckW, i === 2, COLLAR_Q[i]);
      Q.head(E, rg, hp, o); droolDrip(rg, o, hp.jaw, i === 2);
    }
  }
  function frontHead() {
    const hp = headPose(0);
    spikeCollar(heads[0].NB, heads[0].NT, oF.neckW, 0, COLLAR_Q[0]);
    Q.head(E, heads[0], hp, oF); droolDrip(heads[0], oF, hp.jaw, 0);
    droolStrand(heads[0], oF, hp.jaw);
  }
  function lyingHeads() {                                                                    // 侧躺：三个头堆在胸前——前头贴地 → 后头垂在肩上 → 中头斜压在前头上方（各自短颈 + 项圈，项圈上下错开）
    for (const i of [0, 2, 1]) {
      const rg = heads[i], o = HS[i], hp = headPose(i);
      neck(rg, o, i === 2); Q.head(E, rg, hp, o); spikeCollar(rg.NB, rg.NT, o.neckW, i === 2, 0.5);   // 项圈最后画：箍在后脑勺后面那截短颈上
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0); const lie2 = rig.lie === 2;
    if (lie2) {                                                                                // 侧躺：蛇尾在最后 → 躯干 → 僵直伸出的腿 → 三个头沿地面摊开
      snakeTail(rig); Q.body(E, rig, P, oF); Q.legs(E, rig, P, oF, 1); Q.legs(E, rig, P, oF, 0); lyingHeads(); return;
    }
    Q.legs(E, rig, P, oF, 1);
    snakeTail(rig);
    backHeads();
    Q.body(E, rig, P, oF);
    Q.legs(E, rig, P, oF, 0);
    frontHead();
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghost = new Sprite(hero.w, hero.h, hero.ox, hero.oy);
  let chargeAcc = 0, soulAcc = 0, emberAcc = 0, lastGf = -9, tailT = 9, spitAcc = 0;
  const mouthScr = (i) => [scrX(R(heads[i].mouth[0]) + P.bx), HY + R(heads[i].mouth[1])];
  const DIRS = [[-0.35, 0.35], [-1.57, 0.3], [-2.5, 0.35]];                                     // 三股魂流的来向：前头从前方、中头从头顶、后头从身后上方
  function onEnter(s) {
    if (s === CAST) {
      poseAt(CAST, 0, E.simT);
      releaseOrbit(40, 100, 0.3, 0.6, { pts: 1 });
      const [x, y] = mouthScr(2); ring(x, y, 0, R_EL); burst(x, y, 12, 40, 110, 0.25, 0.5, R_EL, 8);   // 第一张嘴炸开（后头）
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    const at = (T) => Math.abs(t - T) < 1e-9;
    if (s === ATTACK && at(T_SPIT)) {                                                          // 吐出穿甲毒液弹
      const [x, y] = mouthScr(1);
      shoot(1, x + 2, y + 1, 150, DUMMY_X - 3, R_POI, 8, { trail: { every: 1, life: [0.15, 0.35], back: [8, 24] } });
      burst(x + 2, y + 1, 6, 20, 50, 0.15, 0.3, R_POI, 0);
      sfx('swing', { kind: 'bite', w: 0.6 }); sfx('shoot', { proj: 'water' });
    }
    if (s === CAST && at(1 / 12)) { const [x, y] = mouthScr(1); ring(x, y, 1, R_EL); burst(x, y, 14, 40, 120, 0.25, 0.5, R_EL, 10); sfx('impact', { pal: 'fire', w: 0.5 }); }
    if (s === CAST && at(2 / 12)) { const [x, y] = mouthScr(0); ring(x, y, 0, R_EL); burst(x, y, 12, 40, 110, 0.25, 0.5, R_EL, 8); }
    if (s === CAST && at(T_HIT)) {                                                             // 咆哮打到目标：火焰外爆、目标闪白；身后拖出火尾残影
      const hx = DUMMY_X - 3, hy = HY - 14;
      burst(hx, hy, 34, 60, 150, 0.3, 0.75, R_EL, 18); fx.cross(hx, hy, 7, R_EL, 0.3, 2); ring(hx, hy, 1, R_EL);
      fx.wave(scrX(4), HY, 1, DUMMY_X - scrX(4), 5, R_EL, 0.5, 1);
      hitDummy(1, 1); dummyFx({ dur: 1.0, tint: 'fire' }); shake(0.14, 2);
      copySprite(ghost, hero); tailT = 0;
      sfx('impact', { pal: 'fire', w: 0.85 });
    }
    if (s === DEATH && at(T_LAND)) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 14 + Math.random() * 34, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.85 });
    }
  }
  function impactOn(k, x, y) {                                                                 // 穿甲：毒液从假人身上穿过去，后面喷出一簇；假人染毒
    if (k !== 1) return;
    burst(x, y, 12, 40, 110, 0.2, 0.45, R_POI, 8); fx.beam(x - 3, y, x + 12, y, 1, R_POI, 0.15, 2); fx.cross(x, y, 3, R_POI, 0.2);
    for (let i = 0; i < 6; i++) spawnX(K_PHYS, x + 8, y, 30 + Math.random() * 40, -20 + Math.random() * 20, 0.5, R_POI, { g: 160, floor: HY });
    hitDummy(0); dummyFx({ dur: 0.9, tint: 'poison' }); sfx('hit', { mat: 'flesh', w: 0.5 });
  }
  const EVENTS = [[], [], [T_SPIT], [], [1 / 12, 2 / 12, T_HIT], [], [], [T_LAND], []];
  function drawShot(k, x, y, d, f12, Rr) {                                                     // 毒液弹：3×3 荧绿团 + 亮芯 + 往下滴
    if (k !== 1) return false; x = R(x); y = R(y); const C = FXR[R_POI];
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) if (i * j === 0 || (i === -1)) put(x + i, y + j, C[2]);
    put(x, y, C[0]); put(x + 1, y - 1, C[1]); put(x - 2, y, C[3]); put(x - 1, y + 2, (f12 & 1) ? C[2] : C[3]);
    return true;
  }
  function stepFX(dt, state, stT) {
    if (state === CHARGE) {                                                                    // 三股火红魂流从三个方向螺旋吸进三张嘴
      chargeAcc += dt * (18 + 30 * clamp01(stT / DUR[CHARGE]));
      while (chargeAcc >= 1) {
        chargeAcc -= 1; const i = Math.floor(Math.random() * 3), t0 = [0.65, 0.4, 0.15][i]; if (stT < t0 - 0.1) continue;
        const [mx, my] = mouthScr(i), a = DIRS[i][0] + (Math.random() - 0.5) * DIRS[i][1] * 2, r = 12 + Math.random() * 8;
        spawn(K_SPIRAL_PT, mx, my, r / (0.35 + Math.random() * 0.3), 0, 9, R_EL, a, r, (i === 1 ? 1 : -1) * (2 + Math.random() * 2));
      }
    }
    if ((state === IDLE || state === MOVE || state === ATTACK) && Math.random() < dt * 5) {    // 毒涎滴落
      const i = Math.floor(Math.random() * 3), [x, y] = mouthScr(i); spawnX(K_PHYS, x - 1, y + 2, (Math.random() - 0.5) * 4, 4, 0.7, R_POI, { g: 90, floor: HY, age0: 0.2 });
    }
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { const fx0 = scrX(P.gf === 0 ? 12 : -8); for (let i = 0; i < 3; i++) spawn(K_DUST, fx0 + (Math.random() - 0.5) * 5, HY, (Math.random() - 0.5) * 18, -4 - Math.random() * 7, 0.3 + Math.random() * 0.3, FXI.dust); sfx('step', { w: 0.8 }); }
      lastGf = P.gf;
    }
    if (state === RECOVER && stT < 0.45) { emberAcc += dt * 12; while (emberAcc >= 1) { emberAcc -= 1; const [x, y] = mouthScr(Math.floor(Math.random() * 3)); spawn(K_EMBER, x, y, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.5, R_EL); } }
    if (state === DEATH && stT > INCOMING + TIP + 1.5 && stT < INCOMING + TIP + 2.4) { soulAcc += dt * 28; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 20 + Math.random() * 40, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    tailT += dt;
  }
  function fxReset() { chargeAcc = 0; soulAcc = 0; emberAcc = 0; lastGf = -9; tailT = 9; spitAcc = 0; }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12); shotFloorGlow(f12);
    if (tailT < 0.6) {                                                                         // 火尾残影：身后三道越来越暗、越来越碎的火色剪影
      const q = tailT / 0.6;
      for (let k = 3; k >= 1; k--) blitShape(ghost, HX + P.mx - k * 5 - R(q * 4), HY, 0, EL[Math.min(4, k + 1)], clamp01(q * 0.8 + k * 0.12));
    }
  }

  return {
    name: '刻耳柏洛斯', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.glow, m.eye], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'fire', style: 'buff', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, impactOn, stepFX, fxReset, fxBack, drawShot,
  };
});
