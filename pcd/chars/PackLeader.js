// 头狼（敌人 · 野兽 · 稀有 · 近战 272）：狼线里最高最壮的一只，灰褐斑驳带疤的皮毛，狮鬃般蓬乱的灰白颈毛编着红布条和骨珠，
//   背上驮一只蒙皮战鼓（插两根骨鼓槌），右耳撕成两叉、眼上一道竖疤，蓬尾高举、尾尖染红，尾巴能甩到鼓面上擂鼓。
// 攻击：前扑 5 格一口咬合，扑出时尾巴顺势擂鼓一下。
// 技能「领袖光环」（被动：附近盟友伤害 +15%、受到的伤害也 +18%）：前腿撑地压低，尾巴擂鼓，脚下赤红法阵随鼓点收缩；
//   施放连擂三下，三圈赤红鼓声环逐次变大，仰头长嚎，身后的友军被染红：头顶红色上升箭头 + 身上一道暗红裂纹。
// 身体用 parts-beast 的 quad 拼（canine 头、狮鬃、蓬尾）；本模块画战鼓 + 鼓槌、撕裂耳、竖疤、鬃里的红布条骨珠（候选部件）和特效。
PCD.define('PackLeader', (E) => {
  const { Sprite, begin, bake, ease, clamp01, q12, f12of, walkDemo, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_EMBER, K_RISE, K_DUST,
    spawn, spawnX, burst, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, allyPoints, allyFx } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;

  // ───── 颜色、材质 ─────
  const R_EL = FXI.enemy, EL = FXR[R_EL];                                                       // 领袖光环 · 战意赤红（白 → 淡粉红 → 红 → 暗红 → 深红）
  const FUR = E.ramp(['#1a1614', '#3e3630', '#6a5e52', '#9a8c7a']);                             // 灰褐斑驳狼毛（stone 暖段）
  const R_FUR = fxRamp('packLeaderFur', [FUR[3], FUR[2], FUR[2], FUR[1], FUR[0]]);               // 受击毛屑
  const R_SKIN = fxRamp('packLeaderDrum', [5, 62, 61, 19, 20]);                                 // 鼓皮碎屑
  const m = B.mats(E, {
    main: FUR, mane: [FUR[0], FUR[2], 18, 17], belly: [FUR[0], FUR[2], FUR[3], 17], muz: [FUR[0], FUR[2], FUR[3], 17],
    tip: 'crimson', cloth: 'crimson', bead: 'bone', scar: 'pink', teeth: 'white',
    eye: [0, 0, 14, 5], glow: [11, 13, 26, 26],
    shell: 'wood', lacq: 'crimson', stick: 'bone', strap: 'leather',
  });
  const DH = [E.defMat([20, 61, 62, 5], 1), E.defMat([11, 12, 13, 26], 1, 1), E.defMat([12, 26, 58, 21], 1, 1)];   // 鼓面：蒙皮 · 亮一档 · 亮两档
  const M_HOLE = E.defMat([0, 0, 0, 20], 1, 1);                                                  // 破开的鼓面
  const SHAPE = { len: 14, chest: 5.5, rump: 4.3, waist: 0.25, hump: 1.5, leg: 7, lw: 2, thigh: 2.9, farDx: -2, stride: 4, lift: 3,
    neck: 3.5, neckA: 0.8, neckW: 3.2, head: { type: 'canine', w: 7, h: 6, snout: 4.5, snH: 3.5, tip: 0.6, ear: 'none', earH: 4 }, headA: 0.1,
    tail: 'bushy', tailLen: 12, tailA: 0.85, tailW: 4, tailCurl: 0.55, mane: 'lion', maneLen: 3, foot: 'paw', fur: 1, m };
  const o = Q.shape(SHAPE);

  const HX = 67, DUR = DEFAULT_DUR.slice(), hero = new Sprite(120, 66, 60, 60), ALLY_X = [HX - 25, HX - 41];
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 5, 9, 12], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'ink', 'teeth', 'spec', 'stick', 'bead', 'cloth', 'scar']) RIM.skip[m[k]] = 1; for (const d of DH) RIM.skip[d] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['dl', 0, 2], ['ddx', -24, 4], ['ddy', 0, 31], ['drot', 0, 3]]);
  const P = {}; Q.reset(P);
  const resetX = () => { P.dl = 0; P.ddx = 0; P.ddy = 0; P.drot = 0; };
  resetX();
  let rig = Q.rig(P, o);
  const HIT_POINT = rig.hit;

  // ───── 战鼓几何（和身体同一份 rig：挂在背线上，鼓面朝后上方） ─────
  const DRUM = { L: 6, r: 3.5, face: 1.6 };
  function drumAt(rg) {
    const C1 = rg.C1, C2 = rg.C2, xc = C2.x + (C1.x - C2.x) * 0.36, s = Q.span(rg, o, R(xc)) || [-16, 0];
    const backA = Math.atan2(C1.y - C2.y, C1.x - C2.x), th = 0.42 + backA;
    const cx = xc, cy = s[0] - DRUM.r + 0.8, ax = Math.cos(th), ay = Math.sin(th);
    return { cx, cy, th, fx: cx - ax * DRUM.L / 2, fy: cy - ay * DRUM.L / 2 };
  }
  P.gf = -1; const D0 = drumAt(Q.rig(P, o));                                                   // 站姿时鼓的位置（死亡掉落的起点）

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'reach', 'glow', 'paw'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: -1, jaw: 0, ear: 0, tail: 0, mane: 0, reach: 0, glow: 0, paw: 0 };   // 昂头挺胸、尾巴举着
  const pose = (p) => Object.assign({}, REST, p);
  const T_SW = 2 / 12, T_HIT = 3 / 12;
  // 攻击逐帧：后坐蓄势 → 前扑张口（尾巴擂鼓）→ 咬合 → 甩头撕扯 → 退回
  const ATK = [REST, pose({ crouch: 1, head: 1, pitch: -1, tail: -2, bx: -1, ear: 1 }),
    pose({ bx: 5, reach: 3, jaw: 3, head: 0, tail: 2 }), pose({ bx: 5, reach: 2, jaw: 0, head: 1, tail: 1 }),
    pose({ bx: 4, reach: 2, head: 2, tail: 0, mane: 1 }), pose({ bx: 3, reach: 1, head: 1, mane: -1 }), pose({ bx: 2, head: 0 }), pose({ bx: 1 }), REST];
  const C_POSE = pose({ crouch: 2, pitch: -1, head: 1, tail: -2, ear: 1, glow: 1, mane: 1 });   // 前腿撑地压低、尾巴高举
  const HOWL = pose({ crouch: 0, pitch: 2, head: -2, jaw: 3, tail: 0, glow: 3, mane: -1 });
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]); P.head = -1; P.tail = 0;
    for (const b of [0.4, 1.2]) if (lp >= b - 1e-6 && lp < b + 1 / 12 - 1e-6) { P.tail = 2; P.dl = 1; }   // 尾巴擂鼓：一下一顿
    if (lp >= 1.6 - 1e-6 && lp < 2.25 - 1e-6) { const k = f12of(lp - 1.6); P.head = k < 3 ? -2 : k < 5 ? -1 : 0; P.ear = k === 3 ? 1 : 0; P.bob = 0; P.mane = k < 4 ? 1 : -1; }   // 昂头环视
  }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T); Q.reset(P); resetX();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) {                                                                         // 昂首稳步，每两步尾巴擂一下鼓
      Q.anim.walk(P, tq); P.head -= 1; P.tail = P.gf === 0 ? 2 : P.gf === 1 ? 0 : -1; P.dl = P.gf === 0 ? 1 : 0;
      const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip;
    } else if (st === ATTACK) {
      const f = Math.min(ATK.length - 1, f12of(tq)); apply(ATK[f]); P.dl = f === 2 ? 2 : f === 3 ? 1 : 0; P.rim = f >= 2 && f <= 3 ? 1 : 0;
    } else if (st === CHARGE) {
      if (tq < 0.7) { E.mix(tmp, REST, C_POSE, ease.inOut(tq / 0.7), F_ALL); apply(tmp); } else apply(C_POSE);
      const nb = beatsIn(tq); P.dl = nb;
      if (isBeat(tq)) { P.tail = 2; P.dl = 2; P.bob = 1; }
      if (tq > 0.45) P.glow = (f12 & 1) ? 2 : 1;
      if (tq > 1.1) P.mane = (f12 & 1) ? 1 : 0;
      P.rim = 2;
    } else if (st === CAST) {
      const f = f12of(tq);
      if (f < 4) { apply(pose({ crouch: 1, pitch: -1, head: 0, tail: (f & 1) ? -2 : 2, glow: 2, ear: 1, mane: (f & 1) ? -1 : 1 })); P.dl = 2; }
      else if (f === 4) { apply(pose({ crouch: 0, pitch: 1, head: -1, jaw: 2, tail: 2, glow: 3 })); P.dl = 2; }
      else { apply(HOWL); P.dl = 1; if (f & 1) P.bob = -1; }                                      // 仰头长嚎：身体颤
      P.rim = 3;
    } else if (st === RECOVER) {
      const q = ease.inOut(clamp01(tq / 0.6)); E.mix(tmp, HOWL, REST, q, F_ALL); apply(tmp);
      P.dl = q < 0.35 ? 2 : q < 0.7 ? 1 : 0; P.rim = q < 0.5 ? 2 : 1; if (q > 0.9) P.rim = 0;
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h >= 0.35) { P.head = -1; P.tail = -1; } } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else if (d < 0.3) { P.bx = -2; P.eyes = 1; P.ear = 1; P.tail = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.head = 1; }
      else if (d < 0.5) { P.bx = -2; P.crouch = 1; P.pitch = 2; P.head = -2; P.jaw = 3; P.eyes = 1; P.tail = 1; P.mane = 1; P.glow = 1; }   // 仰头嚎最后一声
      else {
        P.lie = 2; P.bx = -3; P.eyes = 1; P.ear = 1; P.jaw = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tail = d < 0.9 ? 2 : d < 1.0 ? 1 : 0;
        if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8);
      }
      if (d >= 0.5) {                                                                                // 战鼓从背上滚落、鼓面破开
        const q = clamp01((d - 0.5) / 0.3); P.drop = q >= 1 ? 2 : 1; P.ddx = R(-16 * q);
        P.ddy = q >= 1 ? 0 : clamp(R((-D0.cy - DRUM.r) * (1 - q) + Math.sin(q * PI) * 5), 0, 31); P.drot = q >= 1 ? 0 : (f12of(d - 0.5) + 1) & 3;
      }
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o);
    const dg = drumAt(rig); P.gx = R(dg.fx) + P.bx; P.gy = R(dg.fy);
    if (P.drop) { P.gx = R(D0.fx) + P.ddx + P.bx; P.gy = -P.ddy - DRUM.r; }
    B.key(P, SPEC);
  }
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const BEATS = [0.5, 1.0];
  function beatsIn(tq) { let n = 0; for (const b of BEATS) if (tq >= b - 1e-6) n++; return n; }
  function isBeat(tq) { for (const b of BEATS) if (tq >= b - 1e-6 && tq < b + 1 / 12 - 1e-6) return true; return false; }

  // ───── 画 ─────
  // 转角椭圆填充（局部 s 沿轴、t 垂直）：鼓身两端、鼓面
  function rotOval(cx, cy, th, ea, eb, fn) {
    const ca = Math.cos(th), sa = Math.sin(th), n = Math.ceil(Math.max(ea, eb)) + 1;
    for (let y = Math.floor(cy - n); y <= Math.ceil(cy + n); y++) for (let x = Math.floor(cx - n); x <= Math.ceil(cx + n); x++) {
      const dx = x - cx, dy = y - cy, s = dx * ca + dy * sa, t = -dx * sa + dy * ca, q = (s * s) / ((ea + 0.3) * (ea + 0.3)) + (t * t) / ((eb + 0.3) * (eb + 0.3));
      if (q <= 1) fn(x, y, s, t, q);
    }
  }
  // 候选部件：战鼓 warDrum —— 圆筒鼓身（木 + 红漆环 + 绳纹）+ 鼓面朝后（蒙皮，lv 0–2 亮度档，broken = 破开）；(cx, cy) 鼓心、th 鼓轴角（鼓面在 -轴方向）。一个部件
  function warDrum(cx, cy, th, lv, broken) {
    E.part();
    const L = DRUM.L, r = DRUM.r, ax = Math.cos(th), ay = Math.sin(th), nx = -ay, ny = ax;
    const f0 = [cx - ax * L / 2, cy - ay * L / 2], b0 = [cx + ax * L / 2, cy + ay * L / 2];
    U.poly(E, [f0[0] + nx * r, f0[1] + ny * r, b0[0] + nx * r, b0[1] + ny * r, b0[0] - nx * r, b0[1] - ny * r, f0[0] - nx * r, f0[1] - ny * r], m.shell, 0);
    rotOval(b0[0], b0[1], th, DRUM.face, r, (x, y) => U.dot(E, x, y, m.shell, 0));
    for (const s of [1.7]) for (let t = -r; t <= r; t += 0.5) U.dot(E, cx + ax * s + nx * t, cy + ay * s + ny * t, m.lacq, 0);   // 鼓身后端一道红漆环
    for (let k = -2; k <= 2; k++) { const s = -0.2 + (k & 1 ? 0.6 : -0.6), t = k * r * 0.38; U.dot(E, cx + ax * s + nx * t, cy + ay * s + ny * t, m.strap, 4); }   // 鼓身中段的皮绳（之字）
    rotOval(f0[0], f0[1], th, DRUM.face, r, (x, y, s, t, q) => {                                     // 鼓面：外圈木箍，内圈蒙皮
      if (q > 0.62) { U.dot(E, x, y, m.shell, 1 + (t < 0 ? 3 : 1)); return; }
      if (broken) { U.dot(E, x, y, q < 0.3 || (t > 0 && q < 0.45) ? M_HOLE : DH[0], q < 0.3 ? 3 : 0); return; }
      const mat = DH[lv | 0]; U.dot(E, x, y, mat, lv ? (q < 0.2 ? 4 : q < 0.45 ? 3 : 2) : 0);
    });
    if (broken) { const p = [f0[0] - ax * 1.5 + nx * 1, f0[1] - ay * 1.5 + ny * 1]; U.dot(E, p[0], p[1], DH[0], 2); U.dot(E, p[0] - ax, p[1] - ay + 1, DH[0], 1); }   // 撕开垂下的一片鼓皮
  }
  // 候选部件：交叉鼓槌 drumSticks —— 两根骨槌插在鼓身上、槌头朝上伸出背线（一个部件，画在鼓前面之前）
  function drumSticks(cx, cy, th) {
    E.part();
    const ax = Math.cos(th), ay = Math.sin(th), nx = -ay, ny = ax, r = DRUM.r;
    for (const [s, dx, dy] of [[0.4, -3, -5], [1.8, 1, -5.5]]) {
      const x0 = cx + ax * s - nx * (r - 1), y0 = cy + ay * s - ny * (r - 1), x1 = x0 + dx, y1 = y0 + dy;
      U.seg(E, x0, y0, x1, y1, 1, m.stick, 0); U.dot(E, x1, y1 - 1, m.stick, 4); U.dot(E, x1 + (dx < 0 ? -1 : 1), y1 - 1, m.stick, 3); U.dot(E, x1, y1 - 2, m.stick, 4);
    }
  }
  // 候选部件：挎带 drumStrap —— 从鼓身前下沿绕过胸前到腹线的一条皮带（紧跟鼓画，同一个部件）
  function drumStrap(rg, cx, cy, th) {
    const x = R(cx + Math.cos(th) * 1.5 + 2), s = Q.span(rg, o, x); if (!s) return;
    for (let y = R(cy + DRUM.r - 1); y <= s[1]; y++) U.dot(E, x, y, m.strap, y === s[1] ? 2 : 0);
  }
  // 候选部件：鬃饰 maneTrinkets —— 狮鬃里编的红布条（随 mane 摆）和骨珠；紧跟 quad.mane 画（同一个部件）
  function maneTrinkets(rg) {
    const NB = rg.NB, H = rg.head, cx = NB.x + (H.x - NB.x) * 0.55, cy = NB.y + (H.y - NB.y) * 0.55, r0 = o.hd.h * 0.75 + 1, sw = P.mane | 0;
    if (rg.lie === 2) { U.dot(E, cx - 3, cy + 1, m.cloth, 3); U.dot(E, cx - 4, cy + 1, m.cloth, 2); U.dot(E, cx - 1, cy - 2, m.bead, 4); return; }
    for (const [dx, dy, n] of [[-2, r0 - 2, 5], [-5, r0 - 4, 4]]) for (let j = 0; j < n; j++) U.dot(E, cx + dx - (j >= 2 ? sw : 0) - (j >= 4 ? 1 : 0), cy + dy + j, m.cloth, j === 0 ? 4 : j === n - 1 ? 2 : 0);
    for (const [dx, dy] of [[-4, -2], [-1, 1], [-6, 1], [-2, r0 + 3]]) U.dot(E, cx + dx - (dy > r0 ? sw : 0), cy + dy, m.bead, 4);
  }
  // 候选部件：撕裂耳 tornEar —— 尖耳上半撕成前后两叉（缺口里露粉色伤口）；紧跟 quad.head 画（同一个部件，头型 ear: 'none'）
  function tornEar(rg) {
    const F = Q.headFrame(rg, o, P.jaw), eb = F.at(-F.W * 0.35, -F.Hh + 0.3), ex = R(eb[0]), ey = R(eb[1]), pin = P.ear | 0, L = (k) => -(pin ? k : 0);
    U.dot(E, ex - 1 + L(0), ey - 1, m.limb, 2); U.dot(E, ex + L(0), ey - 1, m.limb, 2);
    U.dot(E, ex - 1 + L(1), ey - 2, m.limb, 0); U.dot(E, ex + L(1), ey - 2, m.scar, 3);
    U.dot(E, ex - 2 + L(2), ey - 3, m.limb, 0); U.dot(E, ex + 1 + L(2), ey - 3, m.limb, 0);
    U.dot(E, ex - 2 + L(3), ey - 4, m.limb, 4); U.dot(E, ex + 1 + L(3), ey - 4, m.limb, 4); U.dot(E, ex - 3 + L(3), ey - 5, m.limb, 4);
  }
  function faceScar(rg) { const e = rg.eye; U.dot(E, e[0], e[1] - 2, m.scar, 3); U.dot(E, e[0], e[1] - 1, m.scar, 2); U.dot(E, e[0] + 1, e[1] + 1, m.scar, 3); U.dot(E, e[0] + 1, e[1] + 2, m.scar, 2); }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lieLegs = P.lie === 2, dg = drumAt(rig);
    if (!lieLegs) Q.legs(E, rig, P, o, 1);
    if (!P.drop) drumSticks(dg.cx, dg.cy, dg.th);
    Q.tail(E, rig, P, o);
    Q.body(E, rig, P, o);
    if (!lieLegs) Q.legs(E, rig, P, o, 0);
    if (!P.drop) { warDrum(dg.cx, dg.cy, dg.th, P.dl, 0); drumStrap(rig, dg.cx, dg.cy, dg.th); }
    Q.mane(E, rig, P, o); maneTrinkets(rig);
    Q.head(E, rig, P, o); tornEar(rig); faceScar(rig);
    if (lieLegs) { Q.legs(E, rig, P, o, 1); Q.legs(E, rig, P, o, 0); }
    if (P.drop) {                                                                                   // 滚落中 / 落地破开的鼓（不跟身体转），鼓槌散在地上
      const cx = D0.cx + P.ddx, cy = P.drop === 2 ? -DRUM.r : -P.ddy - DRUM.r;
      if (P.drop === 2) { E.part(); U.seg(E, cx + 6, -1, cx + 10, -1, 1, m.stick, 0); U.dot(E, cx + 10, -2, m.stick, 4); U.seg(E, cx - 8, 0, cx - 5, -2, 1, m.stick, 0); U.dot(E, cx - 5, -3, m.stick, 4); }
      warDrum(cx, cy, P.drop === 2 ? 0 : D0.th + P.drot * PI / 2, 0, P.drop === 2 ? 1 : 0);
    }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const T_BUFF = 4 / 12, T_B2 = 2 / 12;
  let soulAcc = 0, lastGf = -9, lastTail = 0, lastDl = 0, biteT = 9, bufT = 9, chT = 9;
  const rT = [9, 9, 9, 9], rX = [0, 0, 0, 0], rY = [0, 0, 0, 0], rMax = [0, 0, 0, 0];
  const drumScr = () => [scrX(P.gx), HY + P.gy];
  function beatRing(i, big) { const [x, y] = drumScr(); rT[i] = 0; rX[i] = x; rY[i] = y; rMax[i] = big; }
  function onEnter(s) {
    if (s === CHARGE) chT = 0;
    if (s === CAST) {
      poseAt(CAST, 0, E.simT); const [x, y] = drumScr();
      beatRing(0, 18); burst(x, y, 16, 30, 90, 0.2, 0.45, R_EL, 8); shake(0.28, 2); flash(0.05); sfx('impact', { pal: 'blood', w: 0.5 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_SW) { sfx('swing', { kind: 'bite', w: 0.7 }); const [x, y] = drumScr(); burst(x, y, 4, 20, 40, 0.12, 0.25, R_EL, 4); }
    if (s === ATTACK && t === T_HIT) {
      biteT = 0; hitDummy(0, 1); burst(DUMMY_X - 4, HY - 16, 10, 40, 90, 0.15, 0.35, FXI.impact, 8); burst(DUMMY_X - 4, HY - 16, 5, 30, 60, 0.2, 0.4, R_EL, 6);
      sfx('hit', { mat: 'flesh', w: 0.7 });
    }
    if (s === CAST && t === T_B2) { poseAt(CAST, t, t); beatRing(1, 26); const [x, y] = drumScr(); burst(x, y, 12, 30, 80, 0.2, 0.4, R_EL, 8); sfx('impact', { pal: 'blood', w: 0.55 }); }
    if (s === CAST && t === T_BUFF) {                                                              // 第三下 + 长嚎：友军被染红（伤害↑、身上裂纹）
      poseAt(CAST, t, t); beatRing(2, 38); const [x, y] = drumScr(); burst(x, y, 18, 40, 110, 0.25, 0.5, R_EL, 10);
      allyFx({ dur: 1.1, outline: R_EL }); bufT = 0; shake(0.12, 1);
      for (const a of allyPoints()) { burst(a.x, a.mid - 4, 10, 20, 60, 0.2, 0.45, R_EL, 14); fx.cross(a.x, a.top - 2, 3, R_EL, 0.25); }
      sfx('impact', { pal: 'blood', w: 0.75 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 7, 30, 80, 0.2, 0.4, R_FUR, 12);
    if (s === DEATH && t === INCOMING + 0.35) { const x = scrX(R(rig.mouth[0]) + P.bx), y = HY + R(rig.mouth[1]); beatRing(3, 14); burst(x, y, 8, 20, 60, 0.3, 0.6, R_EL, 10); }   // 最后一声长嚎
    if (s === DEATH && t === INCOMING + 0.66) {
      for (let i = 0; i < 16; i++) spawn(K_DUST, HX - 18 + Math.random() * 36, HY - 1, (Math.random() - 0.5) * 30, -8 - Math.random() * 14, 0.4 + Math.random() * 0.4, FXI.dust);
      shake(0.1, 1); sfx('fall', { w: 0.75 });
    }
    if (s === DEATH && t === INCOMING + 0.8) {                                                     // 鼓落地：鼓皮碎屑 + 尘
      const x = HX + R(D0.cx) - 16 - 3, y = HY - 3; burst(x, y, 10, 20, 60, 0.3, 0.6, R_SKIN, 16);
      for (let i = 0; i < 6; i++) spawn(K_DUST, x + (Math.random() - 0.5) * 8, HY - 1, (Math.random() - 0.5) * 20, -6 - Math.random() * 8, 0.3 + Math.random() * 0.3, FXI.dust);
      sfx('fall', { w: 0.3 });
    }
  }
  const EVENTS = [[], [], [T_SW, T_HIT], [], [T_B2, T_BUFF], [], [INCOMING], [INCOMING + 0.35, INCOMING + 0.66, INCOMING + 0.8], []];
  function stepFX(dt, state, stT) {
    const [gx, gy] = drumScr();
    if (state === MOVE && P.gf !== lastGf) {
      if (P.gf === 0 || P.gf === 2) { for (let i = 0; i < 3; i++) spawn(K_DUST, scrX(P.gf === 0 ? 11 : -8) + (Math.random() - 0.5) * 3, HY, (Math.random() - 0.5) * 16, -4 - Math.random() * 6, 0.3 + Math.random() * 0.25, FXI.dust); sfx('step', { w: 0.75 }); }
      lastGf = P.gf;
    }
    if (P.tail === 2 && lastTail !== 2 && !P.lie && (state === IDLE || state === MOVE || state === CHARGE)) {   // 尾击鼓面：一圈小鼓声环 + 火星
      for (let i = 0; i < 3; i++) spawn(K_EMBER, gx - 1, gy - 1, -10 - Math.random() * 12, -8 - Math.random() * 10, 0.25 + Math.random() * 0.15, R_EL);
      if (state === CHARGE) { beatRing(3, 10); sfx('impact', { pal: 'blood', w: 0.3 }); }
    }
    lastTail = P.tail; lastDl = P.dl;
    if (state === CHARGE && Math.random() < dt * 18) {                                            // 脚下法阵的红点往里收
      const a = Math.random() * 6.2832, r = 20 + Math.random() * 6;
      spawnX(K_EMBER, HX + Math.cos(a) * r, FLOOR - 1 + Math.sin(a) * 2, -Math.cos(a) * 16, -3 - Math.random() * 4, 0.45, R_EL);
    }
    if (state === RECOVER && Math.random() < dt * 6) spawn(K_EMBER, gx, gy - 1, Math.random() * 6 - 3, -6 - Math.random() * 5, 0.5 + Math.random() * 0.3, R_EL);
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 26; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 18 + Math.random() * 36, HY - 1 - Math.random() * 8, (Math.random() - 0.5) * 6, -14 - Math.random() * 16, 0.8 + Math.random() * 0.8, FXI.soul); } }
    for (let i = 0; i < 4; i++) rT[i] += dt;
    biteT += dt; bufT += dt; chT += dt;
  }
  function fxReset() { soulAcc = 0; lastGf = -9; lastTail = 0; lastDl = 0; biteT = 9; bufT = 9; chT = 9; rT.fill(9); }
  function dotEllipse(cx, cy, rx, ry, c, step, phase, broken, f12) {
    const n = Math.max(8, Math.ceil(rx * 2.2));
    for (let k = 0; k < n; k++) { if (step > 1 && ((k + phase) % step)) continue; if (broken && ((k + f12) % 4) === 3) continue; const a = k / n * 6.2832; put(R(cx + Math.cos(a) * rx), R(cy + Math.sin(a) * ry), c); }
  }
  function fxBack(f12) {
    if (E.state === CHARGE && chT < 1.5) {                                                         // 赤红法阵：每下鼓点收缩一圈
      const nb = beatsIn(q12(chT)), rx = [22, 17, 12][nb], c = isBeat(q12(chT)) ? EL[1] : EL[2];
      dotEllipse(HX, FLOOR, rx, 3, c, 2, f12 >> 1, false, f12); dotEllipse(HX, FLOOR, rx - 3, 2, EL[3], 3, f12, false, f12);
    }
    if (P.rim >= 2 && !P.lie) floorGlow(scrX(P.gx), P.rim, EL, f12);
  }
  function arrow(x, y, c1, c2) { put(x, y, c1); put(x - 1, y + 1, c1); put(x, y + 1, c1); put(x + 1, y + 1, c1); put(x - 2, y + 2, c2); put(x + 2, y + 2, c2); for (let j = 2; j <= 5; j++) put(x, y + j, c2); }
  function fxFront(f12) {
    for (let i = 0; i < 4; i++) {                                                                   // 鼓声环：三下逐次变大
      if (rT[i] > 1) continue; const r = 3 + rT[i] * 110 * (i === 3 ? 0.7 : 1); if (r > rMax[i]) continue;
      const q = r / rMax[i], c = q < 0.15 ? EL[0] : q < 0.4 ? EL[1] : q < 0.7 ? EL[2] : EL[3];
      dotEllipse(rX[i], rY[i], r, r * 0.6, c, 1, 0, q > 0.55, f12); if (q < 0.4) dotEllipse(rX[i], rY[i], r - 1, (r - 1) * 0.6, EL[2], 2, f12, false, f12);
    }
    if (bufT < 1.15) {                                                                              // 友军：头顶上升箭头 + 身上暗红裂纹
      const fade = bufT > 0.85 && (f12 & 1);
      if (!fade) for (const a of allyPoints()) {
        const rise = Math.min(3, Math.floor(bufT * 8)), y = a.top - 5 - rise;
        arrow(a.x, y, bufT < 0.08 ? 21 : EL[1], EL[2]);
        const cr = [[0, -13], [-1, -12], [-1, -11], [0, -10], [1, -9], [0, -8], [-1, -7]];
        for (let k = 0; k < Math.min(cr.length, 1 + Math.floor(bufT * 24)); k++) put(a.x + cr[k][0], HY + cr[k][1], k & 1 ? EL[3] : EL[4]);
      }
    }
    if (biteT < 2 / 12) {                                                                           // 咬合：上下两排牙印合拢
      const first = biteT < 1 / 12, x = DUMMY_X - 5, y = HY - 16, g = first ? 3 : 1, c = first ? EL[0] : EL[2];
      for (let k = -3; k <= 3; k += 2) { put(x + k, y - g, c); put(x + k + 1, y - g + 1, c); put(x + k, y + g, c); put(x + k + 1, y + g - 1, c); }
    }
  }

  return {
    name: '头狼', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.glow, DH[1], DH[2]], HIT_POINT, EVENTS, ALLIES: 'skill', ALLY_X,
    SFX: { body: 'beast', how: 'topple', pal: 'blood', style: 'buff', w: 0.75 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxFront,
  };
});
