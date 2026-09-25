// 赤瞳（部队 · 兽人 · 先锋 · 神话）：巨型野猪长成的狂暴巨兽。炭黑鬃皮、从额头一直烧到尾根的赤红火焰长鬃、两对獠牙（大獠牙更长更弯 + 下面一对短牙）、
// 双角刺重铁面甲、垂到腹线的铁片重甲（铆钉 + 尖齿下摆 + 肚带）+ 带尖钉的圆铁胸护、一双发红光的眼（眼后拖红痕）、满身旧疤、耳朵缺一口（和巨型野猪是同一只）。
// 攻击：低头猛冲 7 格，獠牙上挑后接一记前蹄踏；技能「奔踏」（狂躁版）：赤瞳暴亮刨地 → 拖着三道暗红残影高跃 18 格 → 落地两段：砸出地裂，再一踏推出一圈赭土土刺。
// 身体全部用 parts-beast 的 quad + 马具部件（blanket / peytral / chamfron）；本模块自画火焰长鬃、两对獠牙、第二根角刺、胸护尖钉、伤疤、掉落的面甲和特效。
PCD.define('RedEyes', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, near, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL, K_EMBER, K_RISE, K_DUST, K_PHYS, K_STILL, K_TRAIL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow, copySprite, blitShape } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;
  const rnd = Math.random;

  // ───── 颜色、材质 ─────
  const INK = near('#0e0a0c'), HIDE_D = near('#241a1e'), HIDE = near('#3a2c30'), HIDE_L = near('#5a4448'), MUZ = near('#6a3a3e');
  const PALH = (i) => E.PAL[i];
  const R_EL = FXI.earth, EL = FXR[R_EL];                                                     // 奔踏 · 赭土（主，沿用巨型野猪）
  const R_EYE = FXI.blood, EYE = FXR[R_EYE];                                                  // 赤瞳：白 → 淡红 → 赤 → 暗红 → 墨红（眼光拖痕、残影、轮廓光）
  const R_STEAM = fxRamp('boarSteam', [PALH(21), PALH(17), PALH(18), PALH(10), PALH(9)]);   // 鼻孔喷出的白气（同巨型野猪）
  const R_HIDE = fxRamp('redEyesHide', [PALH(58), PALH(HIDE_L), PALH(HIDE), PALH(HIDE_D), PALH(INK)]);   // 受击：炭黑毛屑夹一点红鬃
  const m = B.mats(E, {
    main: [INK, HIDE_D, HIDE, HIDE_L], mane: 'blood', maneMid: [0, 9, 56, 13], maneAsh: 'stone',   // 炭黑鬃皮；赤红火焰长鬃（死亡时褪成灰）
    muz: [INK, HIDE_D, MUZ, 16], nose: [INK, 11, 12, 13], claw: 'iron', eye: [0, 0, 57, 58], glow: [58, 58, 58, 21], eyeOff: [0, 0, 55, 55],
    bone: 'bone', plate: 'iron', rim: 'steel', horn: 'steel', rivet: 'steel', strap: 'boot', scar: [0, 9, 10, 18], boss: 'steel',
  });
  m.cloth = E.defMat(E.RAMP.iron, 2);                                                         // 垂到腹线的铁片重甲：band 2
  const mDead = Object.assign({}, m, { eye: m.eyeOff, glow: m.eyeOff });
  const SHAPE = { len: 17, chest: 6.5, rump: 4.5, waist: 0.35, hump: 3.5, leg: 6, lw: 3, thigh: 3, farDx: -2, stride: 4, lift: 2, foot: 'hoof',
    neck: 2, neckA: 0.05, neckW: 4.4, head: { type: 'boar', w: 7.5, h: 7, snout: 6, snH: 4.8, tip: 0.75, ear: 'point', earH: 3, tusk: 0 }, headA: 0.42,
    tail: 'thin', tailLen: 5, tailA: 0.3, tailCurl: 3, mane: 'none', fur: 1, lieLegs: 1 };
  const o = Q.shape(Object.assign({ m }, SHAPE)), oDead = Q.shape(Object.assign({ m: mDead }, SHAPE));
  const ARMOR = { a: 0.12, b: 0.96, drop: 8, thick: 1, hem: 'dag', mat: 'cloth', trim: 'rim', girth: 0.62, strapMat: 'strap' };
  const CHEST = { shape: 'round', r: 3.5, fx: 0.62, dy: 1.5, face: 'rim', rim: 'plate', boss: 1, strap: 0 };
  const HELM = { from: -0.35, nose: 4.6, thick: 1.5, mat: 'plate', trim: 'rim', spike: 4 };
  const CREST = { peak: 0.58, width: 0.4, len: 6, min: 3 };
  const TUSK = { u: 0.74, len: 6, curve: 0.95 }, TUSK2 = { u: 0.5, len: 1.5, curve: 0.2 };
  const DROP = { at: 0.66, dur: 0.33, dx: 13, hop: 4 };                                    // 面甲脱落滚开：0.33 s 滚出 13 格、弹起 4 格

  const HX = 60, DUR = DEFAULT_DUR.slice(), hero = new Sprite(100, 64, 44, 60);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 6, 12, 16], rimRamp: EYE, flash: 0, dq: 0, skip: new Uint8Array(256), rimAll: 1 };
  for (const k of ['eye', 'glow', 'eyeOff', 'ink', 'spec']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['brist', 0, 6], ['scr', -2, 0], ['leap', 0, 3], ['ash', 0, 3], ['spin', 0, 1]]);   // 竖鬃档 · 近前蹄后刨 · 跃起腿姿 · 鬃褪色 / 眼熄灭 · 面甲翻滚
  const P = {};
  const HIT_POINT = (reset(), Q.rig(P, o).hit);
  let rig = Q.rig(P, o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach', 'brist', 'glow'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0, brist: 0, glow: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -3, crouch: 1, head: 3, pitch: -1, ear: 1, tail: 1, brist: 3, glow: 1 });
  const A_HIT = pose({ bx: 7, head: -2, pitch: 3, jaw: 1, ear: 1, tail: -2, mane: -1, brist: 6, glow: 2 });
  const A_REAR = pose({ bx: 7, head: -1, pitch: 3, paw: 3, jaw: 1, ear: 1, tail: -1, brist: 6, glow: 2 });
  const A_STOMP = pose({ bx: 8, head: 1, pitch: -1, crouch: 1, reach: 1, ear: 1, tail: 1, mane: 1, brist: 5, glow: 2 });
  const A_HOLD = pose({ bx: 6, head: 1, crouch: 1, ear: 1, brist: 3, glow: 1 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [4 / 12, A_REAR, 'out'], [5 / 12, A_STOMP, 'snap'], [0.5, A_STOMP, 'lin'], [0.58, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 3, head: 2, pitch: -2, ear: 1, tail: 1, mane: 1, jaw: 1 });   // 蓄势：压低、张嘴喘气
  // 施放（高跃）逐帧：[lift, mx, pitch, leap, crouch, head, tail, mane, paw]
  const LEAP = [[1, -3, 2, 2, 0, 1, 2, -1, 0], [10, 2, 1, 1, 0, 0, 2, -1, 0], [14, 7, 0, 1, 0, 1, 1, -1, 0], [9, 11, -2, 1, 0, 2, 0, 1, 0], [0, 14, -1, 3, 3, 2, -2, 1, 0], [0, 14, 2, 0, 1, 0, -1, 0, 3]];
  const T_HIT = 2 / 12, T_STOMP = 5 / 12, T_LAND = 4 / 12, T_PAW = [6 / 12, 9 / 12, 12 / 12, 15 / 12];
  const PERS = [[2, 0, 1, 0, 1], [0, -2, 2, 1, 2], [2, 0, 2, -1, 2], [0, -2, 2, 1, 2], [0, 0, 1, 0, 1]];   // 待机个性「刨地」：[paw, scr, glow, mane, 眼痕档]
  const BACK = 4, JUMP = 14;                                                                   // 蓄力后坐 4 格，跃起横移 18 格（-4 → +14）

  function reset() { Q.reset(P); P.brist = 0; P.scr = 0; P.leap = 0; P.ash = 0; P.spin = 0; }
  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)), s = PERS[k]; P.paw = s[0]; P.scr = s[1]; P.glow = s[2]; P.mane = s[3]; P.head = 1; P.rim = s[2] >= 2 ? 1 : 0; }
  }
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  const tmp = {};
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { const f = Q.anim.walk(P, tq); P.pitch = [1, 0, -1, 0][f]; P.head = 1; P.mane = [1, 0, -1, 0][f]; const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 蓄势冲刺步：低头、前后俯仰
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = P.glow >= 2 ? 1 : 0; }
    else if (st === CHARGE) {
      const q0 = ease.inOut(clamp01(tq / 0.5)); E.mix(tmp, REST, C_LOW, q0, F_ALL); apply(tmp); P.mx = -R(BACK * q0);
      P.glow = tq < 0.35 ? 0 : tq < 0.8 ? 1 : 2;                                                // 双眼赤光逐档亮到 2 档
      P.brist = tq < 0.2 ? 0 : Math.min(6, 1 + Math.floor((tq - 0.2) / 0.15 + 1e-6));         // 火焰鬃一节节竖起
      const f = f12of(tq);
      if (f >= 5) { const c = (f - 5) % 3; P.paw = [2, 0, 0][c]; P.scr = [0, -2, -1][c]; }    // 前蹄刨地 4 次
      if (tq > 1.1) P.bob = f & 1; P.jaw = f & 2 ? 1 : 0;
      P.rim = 2;
    } else if (st === CAST) {
      const s = LEAP[Math.min(5, f12of(tq))];
      P.lift = s[0]; P.mx = s[1]; P.pitch = s[2]; P.leap = s[3]; P.crouch = s[4]; P.head = s[5]; P.tail = s[6]; P.mane = s[7]; P.paw = s[8];
      P.brist = 6; P.ear = 1; P.jaw = 1; P.glow = 2; P.rim = 3;
    } else if (st === RECOVER) {
      const f = f12of(tq);                                                                     // 第 2 段：前蹄一踏；然后喘着气走回站位，眼光降到 1 档
      if (f <= 1) { P.mx = JUMP; P.crouch = 2 - f; P.pitch = -1; P.head = 2; P.reach = 1; P.brist = 6; P.glow = 2; P.rim = 2; P.jaw = 1; }
      else if (f <= 7) { P.flip = 1; P.mx = R(JUMP * (1 - (f - 1) / 6.5)); P.gf = (f >> 1) & 3; P.bob = P.gf & 1 ? 0 : 1; P.head = 1; P.jaw = f & 1; P.brist = Math.max(0, 7 - f); P.glow = 1; }
      else { P.mx = 0; P.head = 1; P.jaw = 1; P.glow = 1; }
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); P.eyes = 0; P.glow = h < 0.2 ? 2 : 0; if (h < 0.2) P.mane = -1; } }   // 受击反而眼光一亮
    else if (st === DEATH) { const d = tq - INCOMING; if (d < 0) idle(tq, f12); else death(d, f12); }
    else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, P.ash >= 3 ? oDead : o); legPose(rig);
    P.gx = R(rig.eye[0]) + P.bx; P.gy = R(rig.eye[1]);
    B.key(P, SPEC);
  }
  // 死亡「轰然侧倒」：受击 → 踉跄往前冲两步 → 前膝跪下 → 重重侧倒 → 面甲脱落滚开 → 红眼闪三下熄灭 → 赤鬃从红褪成灰 → 消散
  function death(d, f12) {
    P.ear = 1;
    if (d < 1 / 12) { P.bx = -2; P.flash = 1; P.eyes = 1; P.tail = 2; P.mane = -1; }
    else if (d < 0.3) { const k = f12of(d - 1 / 12); P.gf = k & 3; P.bx = -1 + k; P.head = 2; P.pitch = -1; P.tail = 1; P.jaw = 1; P.glow = 2; }   // 踉跄往前冲两步
    else if (d < 0.5) { P.bx = 2; P.pitch = -3; P.crouch = 3; P.head = 3; P.reach = -1; P.jaw = 1; P.tail = 1; P.glow = 1; }                   // 前膝跪下
    else { P.bx = 2; P.lie = 2; P.jaw = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tail = d < 1.0 ? 2 : d < 1.1 ? 1 : 0; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
    if (d >= 0.5) {                                                                            // 红眼闪三下熄灭；赤鬃从红褪成灰
      const k = f12of(d - 0.5); P.glow = d < 1.0 ? ((k & 1) ? 0 : 2) : 0;
      P.ash = d < 1.0 ? 0 : d < 1.2 ? 1 : d < 1.4 ? 2 : 3; if (P.ash >= 3) P.eyes = 1;
    }
    const dr = B.dropAt(d, DROP); P.drop = dr[0]; P.dsx = dr[1]; P.dsy = dr[2]; P.spin = dr[0] === 1 ? f12 & 1 : 0;
  }
  function legPose(r) {
    for (let i = 0; i < 4; i++) {
      const L = r.legs[i], T = L.T, fr = L.front; let fx = L.F[0], fy = L.F[1];
      if (P.leap === 1) { fx = T[0] + (fr ? 0.85 : -0.8) * L.L; fy = T[1] + (fr ? 0.42 : 0.5) * L.L; }
      else if (P.leap === 2) { if (fr) { fx = T[0] + 2.5; fy = T[1] + L.L * 0.55; } else { fx = T[0] - 4; fy = 0; } }
      else if (P.leap === 3) { fx = T[0] + (fr ? 3 : -3); fy = 0; }
      if (i === 3 && P.scr) fx += P.scr * 1.5;
      const dx = fx - T[0], dy = fy - T[1], dd = Math.hypot(dx, dy); if (dd > L.L) { fx = T[0] + dx * L.L / dd; fy = T[1] + dy * L.L / dd; }
      L.F = [fx, fy]; L.up = fy < -0.5;
    }
  }

  // ───── 画 ─────
  // 候选部件：flameCrest 火焰长鬃（画在躯干之前）：沿尾根 → 背线 → 颈上沿 → 额头排一串火焰状的鬃束，肩上最长、两端短，
  //   根部 3 格宽、往上收尖、尖端往后卷并随 P.mane 摆；P.brist 越高越竖、越长。c = { len, min, peak, width }，mat = 材质下标
  function crestPath(r, oo) {
    const out = [], C1 = r.C1, C2 = r.C2;
    for (let x = C2.x - C2.r * 0.5; x <= C1.x + C1.r * 0.3; x += 2) { const s = Q.span(r, oo, R(x)); if (s) out.push([x, s[0] + 1]); }
    if (r.lie !== 2) {
      const NB = r.NB, NT = r.NT, dx = NT.x - NB.x, dy = NT.y - NB.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L; let nx = uy, ny = -ux; if (ny > 0) { nx = -nx; ny = -ny; }
      for (let s = 1; s <= L; s += 2) out.push([NB.x + ux * s + nx * (oo.neckW - 1), NB.y + uy * s + ny * (oo.neckW - 1)]);
      const F = Q.headFrame(r, oo, 0);
      for (let u = -F.W * 0.75; u <= F.W * 0.35; u += 1.8) { const p = F.at(u, F.top(u) + 1); out.push(p); }
    }
    return out;
  }
  function flameCrest(r, oo, c, mat) {
    E.part(); const pts = crestPath(r, oo), n = pts.length, up = (P.brist | 0) / 6, sw = (P.mane | 0) * 0.15, lying = r.lie === 2;
    pts.forEach(([x, y], i) => {
      const s = i / Math.max(1, n - 1), erect = up > 0 && (n - 1 - i) / Math.max(1, n - 1) < up + 1e-6;
      const L = R(c.min + (c.len - c.min) * Math.exp(-(((s - c.peak) / c.width) ** 2))) - (i & 1) + (erect ? 1 : 0);
      let lean = (erect ? 0.25 : 0.62) + sw + (i & 1 ? 0.12 : 0), dx = -Math.sin(lean), dy = -Math.cos(lean);
      if (lying) { dx = -0.95; dy = -0.28; }
      for (let j = 0; j <= L; j++) {
        const curl = j >= L - 1 ? -0.6 : 0, px = x + dx * j + curl, py = y + dy * j, w = j < L * 0.35 ? 3 : j < L * 0.7 ? 2 : 1, t = j === L ? 4 : j >= L * 0.55 ? 3 : 2;
        for (let k = 0; k < w; k++) U.dot(E, px - k, py, mat, k === 0 ? t : Math.max(2, t - 1));
      }
    });
  }
  // 獠牙（同巨型野猪的 boarTusks，候选部件）：c = { u 沿吻部位置, len 伸出吻部上沿, curve 往后弯 }
  function tusk(r, oo, c, big) {
    const F = Q.headFrame(r, oo, P.jaw | 0), mat = m.bone, u0 = F.u0 + (F.uT - F.u0) * c.u, pr = F.prof(u0), v0 = pr[1] + F.gap(u0) - 0.4, Lt = v0 - pr[0] + c.len, seen = new Set();
    for (let s = 0; s <= Lt + 1e-6; s += 0.45) {
      const q = s / Lt, du = (big ? 1.4 : 0.6) * Math.sin(q * PI * 0.6) - c.curve * q * q * 3, p = F.at(u0 + du, v0 - s), px = R(p[0]), py = R(p[1]), k = px * 1000 + py; if (seen.has(k)) continue; seen.add(k);
      U.dot(E, px, py, mat, q > 0.7 ? 4 : q < 0.15 ? 2 : 3);
      if (s < (big ? 2.2 : 1)) { const p2 = F.at(u0 + du + 0.9, v0 - s); U.dot(E, p2[0], p2[1], mat, 2); }
    }
  }
  function tusks(r, oo) { E.part(); tusk(r, oo, TUSK2, 0); tusk(r, oo, TUSK, 1); }
  // 重甲上的铆钉行（紧跟 blanket 画）
  function armorRivets(r, oo) {
    const C1 = r.C1, C2 = r.C2, xa = R(C2.x + (C1.x - C2.x) * ARMOR.a), xb = R(C2.x + (C1.x - C2.x) * ARMOR.b);
    for (let x = xa + 1; x < xb; x++) { const s = Q.span(r, oo, x); if (!s) continue; for (const dy of [3, 6]) U.dot(E, x, s[0] - ARMOR.thick + dy, m.cloth, ((x + dy) % 5) === 0 ? 4 : 2); }   // 甲片横缝
    for (let q = 0.1; q <= 0.95; q += 0.14) { const x = R(C2.x + (C1.x - C2.x) * q), s = Q.span(r, oo, x); if (!s) continue; U.dot(E, x, s[0] + 1, m.rivet, 4); if ((R(q * 100) & 1) === 0) U.dot(E, x + 1, s[0] + 4, m.rivet, 4); }
  }
  // 胸护中心的尖钉（紧跟 peytral 画）：往前伸 3 格
  function chestSpike(r, oo) { const c = Q.peytralAt(r, oo, CHEST), x = R(c[0]), y = R(c[1]); U.dot(E, x + 2, y, m.horn, 3); U.dot(E, x + 3, y, m.horn, 4); U.dot(E, x + 4, y - 1, m.horn, 4); }
  // 第二根角刺 + 面甲铆钉（紧跟 chamfron 画）
  function helmExtras(r, oo) {
    const F = Q.headFrame(r, oo, 0), b = F.at(-F.W * 0.2, F.top(-F.W * 0.2)), d = F.at(-F.W * 0.2 + 3, F.top(-F.W * 0.2) - 3);
    U.seg(E, b[0], b[1], d[0], d[1], 1, m.horn, 0); U.dot(E, d[0], d[1], m.horn, 4);
    for (const u of [-2, 0.8, 3.2]) { const p = F.at(u, F.top(u) + 1); U.dot(E, p[0], p[1], m.rivet, 4); }
  }
  const SCARS = [[-0.9, 0.35, 3, 1], [-0.5, 0.65, 2, -1], [0.3, 0.55, 3, -1], [0.7, 0.35, 2, 1]];
  function scars(r, oo) {
    for (const [ux, uy, n, d] of SCARS) {
      const C = ux < 0 ? r.C2 : r.C1, x0 = C.x + ux * C.r, y0 = C.y + uy * C.r * r.sq;
      for (let k = 0; k < n; k++) { const x = R(x0 + k), y = R(y0 - k * d * 0.6), s = Q.span(r, oo, x); if (!s || y <= s[0] + 1 || y >= s[1] - 1) continue; U.dot(E, x, y, m.scar, k === 0 ? 2 : 3); }
    }
  }
  function earNotch(r, oo) { if (r.lie === 2) return; const F = Q.headFrame(r, oo, 0), eb = F.at(-F.W * 0.35, -F.Hh + 0.3), xo = R(eb[0]) - R((P.ear | 0) ? 1 : 0.3); E.sp(xo, R(eb[1]) - 2, 0); }
  // 候选部件：chamfronDrop 掉落的面甲（同巨型野猪，大一号、两根角刺）：spin 1 = 翻滚中竖着；flat 1 = 平躺
  function droppedPlate(x, y, flat, spin) {
    E.part(); x = R(x); y = R(y);
    if (flat) { for (let i = -4; i <= 4; i++) { U.dot(E, x + i, 0, m.plate, i === -4 ? 4 : 3); if (Math.abs(i) < 4) U.dot(E, x + i, -1, m.plate, i < 0 ? 4 : 3); } U.dot(E, x + 5, -1, m.horn, 3); U.dot(E, x + 6, -2, m.horn, 4); U.dot(E, x + 1, -2, m.horn, 3); U.dot(E, x + 2, -3, m.horn, 4); U.dot(E, x - 2, -1, m.rivet, 4); }
    else if (spin) { for (let j = -2; j <= 2; j++) for (let i = -3; i <= 3; i++) if (Math.abs(i) + Math.abs(j) < 5) U.dot(E, x + i, y + j, m.plate, i < 0 || j < 0 ? 4 : 3); U.dot(E, x, y + 3, m.horn, 3); U.dot(E, x, y + 4, m.horn, 4); U.dot(E, x, y, m.rivet, 4); }
    else { for (let j = -3; j <= 3; j++) for (let i = -1; i <= 1; i++) U.dot(E, x + i, y + j, m.plate, i < 0 || j < 0 ? 4 : 3); U.dot(E, x + 2, y - 1, m.horn, 3); U.dot(E, x + 3, y - 2, m.horn, 4); U.dot(E, x + 2, y + 2, m.horn, 3); U.dot(E, x, y, m.rivet, 4); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const oo = P.ash >= 3 ? oDead : o, lying = rig.lie === 2, crestMat = P.ash >= 2 ? m.maneAsh : P.ash === 1 ? m.maneMid : m.mane;
    if (!lying) Q.legs(E, rig, P, oo, 1);
    Q.tail(E, rig, P, oo);
    Q.body(E, rig, P, oo); scars(rig, oo);
    if (!lying) Q.legs(E, rig, P, oo, 0);
    Q.blanket(E, rig, P, oo, ARMOR); armorRivets(rig, oo);
    flameCrest(rig, oo, CREST, crestMat);                                                      // 赤鬃从甲的脊缝里长出来，压在甲上
    if (!lying) { Q.peytral(E, rig, P, oo, CHEST); chestSpike(rig, oo); }
    Q.head(E, rig, P, oo); earNotch(rig, oo);
    if (!P.drop) { Q.chamfron(E, rig, P, oo, HELM); helmExtras(rig, oo); }
    tusks(rig, oo);
    if (lying) { Q.legs(E, rig, P, oo, 1); Q.legs(E, rig, P, oo, 0); }
    if (P.drop) { const h = rig.head; droppedPlate(h.x + 3 + P.dsx, P.drop === 2 ? 0 : h.y - P.dsy, P.drop === 2 ? 1 : 0, P.spin); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  const ghosts = [0, 1, 2].map(() => new Sprite(hero.w, hero.h, hero.ox, hero.oy)), gX = [0, 0, 0], gT = [9, 9, 9], gF = [9, 9, 9];
  let chargeAcc = 0, steamAcc = 0, soulAcc = 0, emberAcc = 0, eyeAcc = 0, lastGf = -9, lastF = -9, lastPers = -9, landT = 9, landX = 0, spikeT = 9, spikeX = 0;
  const hoofScr = (i) => { const F = rig.legs[i].F; return [scrX(F[0] + P.bx), HY + R(F[1])]; };
  const snoutScr = () => [scrX(rig.mouth[0] + P.bx), HY + R(rig.mouth[1])];
  const eyeScr = () => [scrX(P.gx), HY + P.gy];
  function clods(x, y, n, vx0, vx1, vy0, vy1, big) {
    for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (rnd() - 0.5) * 3, y, vx0 + rnd() * (vx1 - vx0), vy0 + rnd() * (vy1 - vy0), 0.5 + rnd() * 0.5, R_EL, { g: 330, floor: FLOOR - (rnd() < 0.5 ? 1 : 0), sz: rnd() < big ? 2 : 1 });
  }
  function dust(x, y, n, spd, life) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (rnd() - 0.5) * 6, y, (rnd() - 0.5) * spd, -4 - rnd() * 10, life * (0.7 + rnd() * 0.6), FXI.dust); }
  function steam(n) { const [x, y] = snoutScr(), d = P.flip ? -1 : 1; for (let i = 0; i < n; i++) spawn(K_RISE, x + d, y + 1, d * (10 + rnd() * 14), -3 - rnd() * 6, 0.35 + rnd() * 0.3, R_STEAM); }
  function eyeTrail(n, spd) { const [x, y] = eyeScr(), d = P.flip ? 1 : -1; for (let i = 0; i < n; i++) spawn(K_TRAIL, x + d, y + R(rnd() - 0.5), d * (spd + rnd() * spd), (rnd() - 0.5) * 4, 0.2 + rnd() * 0.2, R_EYE); }
  function onEnter(s) {
    if (s === CAST) {                                                                          // 起跳：土块外爆，震屏 2 格 + 闪白
      poseAt(CAST, 0, E.simT); const bx = hoofScr(2)[0];
      releaseOrbit(30, 80, 0.3, 0.6, { ramp: R_EYE });
      clods(bx, FLOOR - 1, 18, -100, 10, -130, -40, 0.35); dust(bx, HY, 12, 40, 0.6); ring(bx, HY - 1, 0, R_EL);
      shake(0.28, 2); flash(0.05); gT[0] = gT[1] = gT[2] = 9;
    }
    if (s === RECOVER) {                                                                       // 第 2 段：前蹄一踏，左右推出一圈赭土土刺 + 第二个冲击环
      poseAt(RECOVER, 0, E.simT); const x = hoofScr(3)[0] + 1; spikeX = x; spikeT = 0;
      fx.wave(x + 1, FLOOR - 1, 1, 16, 5, R_EL, 0.5, 2); fx.wave(x - 2, FLOOR - 1, -1, 16, 5, R_EL, 0.5, 1);
      ring(x, HY - 2, 0, R_EL); clods(x, FLOOR - 1, 12, -80, 80, -110, -40, 0.3); dust(x, HY, 8, 50, 0.8);
      hitDummy(1, 1); shake(0.12, 1);
      sfx('impact', { pal: 'earth', w: 0.8 });
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                         // 獠牙上挑
      const hx = scrX(rig.head.x + P.bx), hy = HY + R(rig.head.y), tx = DUMMY_X - 4, ty = HY - 13;
      fx.slash(hx + 2, hy - 1, 9, 2.3, 0.3, R_EL, 0.17, 2, 2);
      burst(tx, ty, 18, 50, 120, 0.15, 0.45, FXI.impact, 14); burst(tx, ty + 2, 8, 30, 80, 0.2, 0.4, R_EYE, 18); hitDummy(1, 1);
      dust(scrX(8 + P.bx), HY, 5, 30, 0.4);
      sfx('swing', { kind: 'smash', w: 1.0 }); sfx('hit', { mat: 'flesh', w: 1.0 });
    }
    if (s === ATTACK && t === T_STOMP) {                                                       // 接一记前蹄踏：小地裂 + 尘土
      const [x] = hoofScr(3); fx.crack(x, FLOOR, 5, 1, R_EL, 0.7, 0); fx.crack(x - 1, FLOOR, 4, -1, R_EL, 0.7, 0); dust(x, HY, 6, 40, 0.5); ring(x, HY - 1, 0, R_EL); hitDummy(0, 1);
      sfx('hit', { mat: 'flesh', w: 0.7 });
    }
    if (s === CHARGE && T_PAW.includes(t)) {                                                   // 刨地：土块往后飞，地裂一次比一次长（2 → 6 格）
      const k = T_PAW.indexOf(t), [x] = hoofScr(3), L = 2 + R(k * 4 / 3);
      clods(x - 1, FLOOR - 1, 4, -95, -45, -85, -45, 0.4); dust(x, HY, 3, 20, 0.4);
      fx.crack(x + 1, FLOOR, L, 1, R_EL, 1.0, 0); fx.crack(x - 1, FLOOR, L, -1, R_EL, 1.0, 0);
      sfx('step', { w: 0.5 });
    }
    if (s === CAST && t === T_LAND) {                                                          // 第 1 段：大地裂 + 大冲击环 + 36 颗土块
      const x = scrX(o.len / 2 + 1); landX = x; landT = 0;
      fx.crack(x, FLOOR, 13, 1, R_EL, 1.3, 0); fx.crack(x - 1, FLOOR, 13, -1, R_EL, 1.3, 0);
      ring(x, HY - 3, 1, R_EL); burst(x, HY - 4, 12, 40, 110, 0.2, 0.45, R_EL, 30);
      clods(x, FLOOR - 1, 36, -120, 120, -160, -50, 0.35); dust(x, HY, 18, 60, 1.2);
      hitDummy(1, 1); shake(0.2, 2);
      sfx('impact', { pal: 'earth', w: 1.0 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 10, 30, 90, 0.2, 0.45, R_HIDE, 12);
    if (s === DEATH && t === INCOMING + 0.66) { dust(HX + 2, HY - 1, 20, 60, 0.8); shake(0.14, 1); sfx('fall', { w: 1.0 }); }
    if (s === DEATH && t === T_PLATE) sfx('hit', { mat: 'metal', w: 0.4 });
  }
  const T_PLATE = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_HIT, T_STOMP], T_PAW, [T_LAND], [], [INCOMING], [INCOMING + 0.66, T_PLATE], []];
  function stepFX(dt, state, stT) {
    const f = f12of(stT), newF = f !== lastF; lastF = f;
    if (state === CHARGE) {
      const [ex, ey] = eyeScr();
      chargeAcc += dt * (8 + 20 * clamp01(stT / DUR[CHARGE]));                                  // 赤光往眼里汇聚
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 9 + rnd() * 9, a = rnd() * 6.2832; spawn(K_SPIRAL, ex, ey, r / (0.3 + rnd() * 0.3), 0, 9, R_EYE, a, r, 4 + rnd() * 3); }
      if (P.glow >= 1) { eyeAcc += dt * (P.glow >= 2 ? 30 : 12); while (eyeAcc >= 1) { eyeAcc -= 1; eyeTrail(1, 22); } }   // 眼光往后拖出红痕
      if (P.brist >= 4) { emberAcc += dt * 16; while (emberAcc >= 1) { emberAcc -= 1; const p = crestTip(); if (p) spawn(K_EMBER, p[0], p[1], rnd() * 6 - 3, -8 - rnd() * 8, 0.35 + rnd() * 0.3, R_EYE); } }   // 鬃尖冒红光粒子
      steamAcc += dt * (stT > 0.7 ? 4 : 2.2); if (steamAcc >= 1) { steamAcc -= 1; steam(3); }
    }
    if (state === CAST || (state === RECOVER && stT < 0.2)) { eyeAcc += dt * 26; while (eyeAcc >= 1) { eyeAcc -= 1; eyeTrail(1, 30); } }
    if (state === CAST && newF && f >= 1 && f <= 3) {                                                    // 残影：每帧存一张当前剪影，身后画三个递减的暗红剪影
      drawHero(); bakeHero(); hero.k1 = -1; const k = f - 1; copySprite(ghosts[k], hero); gX[k] = HX + P.mx; gT[k] = 0; gF[k] = f;
    }
    if (state === IDLE) {                                                                      // 待机：鼻孔喷白气；个性里眼光一亮、拖出 2 格红痕
      const lp = stT % DUR[IDLE], k = lp >= 1.6 && lp < 2.0 ? Math.min(4, f12of(lp - 1.6)) : -1;
      if (k !== lastPers) { if (k === 1 || k === 3) { const [x] = hoofScr(3); dust(x, HY, 2, 16, 0.35); } lastPers = k; }
      const b = f12of(lp) % 10; if (newF && b === 0) steam(2);
    }
    if ((state === MOVE || (state === RECOVER && P.gf >= 0)) && P.gf !== lastGf) {            // 冲刺步：每次落蹄 4 颗尘土
      if (P.gf === 0 || P.gf === 2) { const [x] = hoofScr(P.gf === 0 ? 3 : 1); dust(x, HY, 4, 20, 0.45); if (state === MOVE) sfx('step', { w: 1.0 }); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 32; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 16 + rnd() * 40, HY - 1 - rnd() * 8, (rnd() - 0.5) * 6, -14 - rnd() * 16, 0.8 + rnd() * 0.8, FXI.soul); } }
    for (let k = 0; k < 3; k++) gT[k] += dt;
    landT += dt; spikeT += dt;
  }
  function crestTip() {
    const pts = crestPath(rig, o); if (!pts.length) return null; const i = Math.floor(rnd() * pts.length), p = pts[i];
    return [scrX(p[0] + P.bx - 1), HY + R(p[1]) - 5];
  }
  function fxReset() { chargeAcc = 0; steamAcc = 0; soulAcc = 0; emberAcc = 0; eyeAcc = 0; lastGf = -9; lastF = -9; lastPers = -9; landT = 9; spikeT = 9; gT[0] = gT[1] = gT[2] = 9; }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie && !P.lift) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (landT < 0.9) { const q = landT / 0.9, w = R(7 + 11 * q); for (let x = -w; x <= w; x++) if (((x + f12) & 1) === 0 || q < 0.3) put(landX + x, FLOOR, q < 0.3 ? EL[1] : q < 0.6 ? EL[2] : EL[3]); }
  }
  function fxMid(f12) {                                                                        // 高跃残影：用赤瞳第 4 级，越旧越散
    const cur = E.state === CAST ? f12of(E.stT) : 9;
    for (let k = 0; k < 3; k++) {
      if (gT[k] > 0.4 || gF[k] >= cur && E.state === CAST) continue;
      const age = E.state === CAST ? cur - gF[k] : 4, late = E.state !== CAST ? 1 : cur >= 4 ? (E.stT - 4 / 12) * 5 : 0;   // 越旧越散；落地后 0.2 s 散完
      const dq = clamp01(0.3 + age * 0.14 + late); if (dq >= 0.95) continue;
      blitShape(ghosts[k], gX[k], HY, 0, EYE[3], dq);
    }
  }
  function fxFront(f12) {
    if (P.glow >= 1 && !P.eyes && P.dq < 0.5 && !(E.state === DEATH && P.ash >= 3)) {         // 眼后拖出的红色光痕（2 格）
      const [x, y] = eyeScr(), d = P.flip ? 1 : -1, L = P.glow >= 2 ? 3 : 2;
      for (let k = 1; k <= L; k++) if (!(k === L && (f12 & 1))) put(x + d * (k + 1), y + (k >= 2 ? -1 : 0), k === 1 ? EYE[1] : k === 2 ? EYE[2] : EYE[3]);
    }
    if (spikeT < 0.6) {                                                                        // 第 2 段的赭土土刺：从踏点往左右一根接一根冒出、再沉下去
      for (let side = -1; side <= 1; side += 2) for (let k = 0; k < 5; k++) {
        const t = spikeT - k * 0.05; if (t < 0) continue; const h = R(5 * (t < 0.08 ? t / 0.08 : t < 0.3 ? 1 : Math.max(0, 1 - (t - 0.3) / 0.2)) - (k & 1)); if (h <= 0) continue;
        const cx = spikeX + side * (4 + k * 4);
        for (let j = 0; j < h; j++) { const y = FLOOR - 1 - j, c = j === h - 1 ? EL[0] : j >= h - 2 ? EL[1] : j === 0 ? EL[3] : EL[2]; put(cx, y, c); if (j < h * 0.45) { put(cx - 1, y, EL[3]); put(cx + 1, y, c); } }
      }
    }
  }

  return {
    name: '赤瞳', HX, R_EL, DUR, hero, P, GLOW_MATS: [m.eye, m.glow], HIT_POINT, EVENTS, R_HURT: FXI.impact,
    SFX: { body: 'beast', how: 'topple', pal: 'earth', style: 'meteor', w: 1.0 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack, fxMid, fxFront,
  };
});
