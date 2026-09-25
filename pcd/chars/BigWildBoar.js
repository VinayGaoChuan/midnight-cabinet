// 巨型野猪（部队 · 兽人 · 先锋 · 史诗）：矮而长、前高后低的楔形重装野猪。焦褐鬃皮、背脊一排灰尖硬鬃（肩峰处最高）、一对上翘的大獠牙、
// 额前带独角刺的铆钉铁面甲、肩背披一块缝铁片的尖齿皮甲（带肚带）、身上几道白色旧伤疤、耳朵缺一口、小卷尾。升级 → 赤瞳。
// 攻击：低头前冲 5 格，獠牙从下往上挑（向上的弧形拖影）；技能「奔踏」：刨地竖鬃蓄势 → 一蹬跃起、抛物线跳 16 格 → 四蹄砸在假人前方（双向地裂 + 双向赭土地浪）。
// 身体全部用 parts-beast 的 quad + 马具部件（blanket / chamfron）；本模块自画背脊鬃刺、獠牙、皮甲铁片、伤疤、掉落的面甲和特效。
PCD.define('BigWildBoar', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, near, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS, K_STILL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI;
  const rnd = Math.random;

  // ───── 颜色、材质 ─────
  const INK = near('#1a0e08'), FUR_D = near('#3a2214'), FUR = near('#5e3a22'), FUR_L = near('#8a5a36'), BR_D = near('#2a170c'), MUZ = near('#7a4640');
  const PALH = (i) => E.PAL[i];
  const R_EL = FXI.earth, EL = FXR[R_EL];                                                     // 奔踏 · 赭土：奶油 → 沙 → 暗沙 → 木 → 深木
  const R_STEAM = fxRamp('boarSteam', [PALH(21), PALH(17), PALH(18), PALH(10), PALH(9)]);   // 鼻孔喷出的白气
  const R_FUR = fxRamp('boarFur', [PALH(6), PALH(FUR_L), PALH(FUR), PALH(FUR_D), PALH(INK)]);   // 受击毛屑（焦褐）
  const m = B.mats(E, {
    main: [INK, FUR_D, FUR, FUR_L], mane: [INK, BR_D, FUR_D, 6],                             // 焦褐鬃皮；背脊硬鬃更暗、尖端灰白
    muz: [INK, FUR_D, MUZ, 16], nose: [INK, 11, 12, 13], claw: 'iron', eye: [0, 0, 14, 5], bone: 'bone',
    cloth: 'leather', trim: 'boot', strap: 'boot', plate: 'iron', rim: 'steel', horn: 'steel', rivet: 'steel', scar: 'white',
  });
  m.cloth = E.defMat(E.RAMP.leather, 2);                                                      // 皮甲是大块面积：band 2
  const o = Q.shape({ len: 14, chest: 5.5, rump: 4, waist: 0.35, hump: 2.5, leg: 5, lw: 2, thigh: 2.4, farDx: -2, stride: 2, lift: 2, foot: 'hoof',
    neck: 2, neckA: 0.05, neckW: 3.6, head: { type: 'boar', w: 6.5, h: 6, snout: 5.5, snH: 4.2, tip: 0.75, ear: 'point', earH: 3, tusk: 0 }, headA: 0.42,
    tail: 'thin', tailLen: 4, tailA: 0.3, tailCurl: 3, mane: 'none', fur: 1, lieLegs: 1, m });
  const ARMOR = { a: 0.3, b: 1.0, drop: 4, thick: 1, hem: 'dag', mat: 'cloth', trim: 'trim', girth: 0.72, strapMat: 'strap' };
  const HELM = { from: -0.2, nose: 4, thick: 1, mat: 'plate', trim: 'rim', spike: 3 };
  const RIDGE = { a: -0.15, b: 1.22, len: 5, min: 2, peak: 0.74, width: 0.45, step: 2, lean: 0.5 };
  const TUSK = { u: 0.74, len: 4, curve: 0.7 };
  const DROP = { at: 0.66, dur: 0.25, dx: 9, hop: 3 };                                     // 面甲在落地时松脱，0.25 s 滑出 9 格、弹起 3 格

  const HX = 64, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 54, 38, 50);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 16, 22], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'spec', 'glow']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['brist', 0, 6], ['scr', -2, 0], ['leap', 0, 3]]);   // 竖鬃根数 · 近前蹄后刨 · 跃起腿姿
  const P = {}; Q.reset(P); P.brist = 0; P.scr = 0; P.leap = 0;
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach', 'brist'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0, brist: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -2, crouch: 1, head: 3, pitch: -1, ear: 1, tail: 1, brist: 3 });
  const A_HIT = pose({ bx: 5, head: -2, pitch: 2, jaw: 1, ear: 1, tail: -2, mane: -1, brist: 6 });
  const A_HOLD = pose({ bx: 4, head: -1, pitch: 1, ear: 1, tail: -1, brist: 4 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 3, head: 2, pitch: -2, ear: 1, tail: 1, mane: 1 });           // 蓄势：前低后高压低
  // 施放（跃起）逐帧：[lift, mx, pitch, leap, crouch, head, tail, mane, reach]；leap 1 = 身体伸直（前腿前伸、后腿后蹬）· 2 = 后腿蹬地 · 3 = 四蹄叉开砸地
  const LEAP = [[1, -3, 2, 2, 0, 1, 2, -1, 0], [7, 1, 1, 1, 0, 0, 2, -1, 0], [10, 5, 0, 1, 0, 1, 1, -1, 0], [7, 9, -2, 1, 0, 2, 0, 1, 0], [0, 12, -1, 3, 3, 2, -2, 1, 0], [0, 12, -1, 3, 2, 2, -1, 0, 0]];
  const T_HIT = 2 / 12, T_LAND = 4 / 12, T_PAW = [7 / 12, 11 / 12, 15 / 12], PERS = [[3, 0, 0, 0], [3, 1, 0, 1], [2, 0, 0, 1], [3, 1, 0, 1], [0, 0, 1, 2]];   // 待机个性「拱地」：[head, jaw, ear, tail]
  const BACK = 4, JUMP = 12;                                                                   // 蓄力时后坐 4 格，跃起横移 16 格（-4 → +12）

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)), s = PERS[k]; P.head = s[0]; P.jaw = s[1]; P.ear = s[2]; P.tail = s[3]; P.mane = k & 1 ? 1 : 0; }
  }
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  const tmp = {};
  function reset() { Q.reset(P); P.brist = 0; P.scr = 0; P.leap = 0; }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { const f = Q.anim.walk(P, tq); P.mane = f & 1 ? 0 : (f === 0 ? 1 : -1); const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 鬃刺随步子抖
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); P.rim = 0; }
    else if (st === CHARGE) {
      const q0 = ease.inOut(clamp01(tq / 0.5)); E.mix(tmp, REST, C_LOW, q0, F_ALL); apply(tmp); P.mx = -R(BACK * q0);   // 压低、后坐
      P.brist = tq < 0.2 ? 0 : Math.min(6, 1 + Math.floor((tq - 0.2) / 0.15 + 1e-6));        // 背脊鬃刺一节节竖起
      const f = f12of(tq);
      if (f >= 5) { const c = (f - 5) & 3; P.paw = [2, 1, 0, 0][c]; P.scr = [0, 0, -2, -1][c]; }   // 近侧前蹄往后刨地三次
      if (tq > 1.1) P.bob = f & 1;                                                             // 蓄满前浑身发抖
      P.rim = 2;
    } else if (st === CAST) {
      const s = LEAP[Math.min(5, f12of(tq))];
      P.lift = s[0]; P.mx = s[1]; P.pitch = s[2]; P.leap = s[3]; P.crouch = s[4]; P.head = s[5]; P.tail = s[6]; P.mane = s[7]; P.reach = s[8];
      P.brist = 6; P.ear = 1; P.jaw = s[3] === 3 ? 1 : 0; P.rim = 3;
    } else if (st === RECOVER) {
      const f = f12of(tq);                                                                     // 从落点小跑回站位（转身，12 fps 小碎步），到站再转回来，鬃刺伏下
      if (f === 0) { P.mx = JUMP; P.crouch = 1; P.head = 1; P.brist = 5; P.rim = 2; }
      else if (f <= 6) { P.flip = 1; P.mx = R(JUMP * (1 - f / 6.5)); P.gf = (f - 1) & 3; P.bob = P.gf & 1 ? 0 : 1; P.tail = [-1, 0, 1, 0][P.gf]; P.brist = Math.max(0, 5 - f); P.rim = f < 3 ? 1 : 0; }
      else { P.mx = 0; P.head = f === 7 ? 1 : 0; P.brist = 0; }
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.2) P.mane = -1; } }
    else if (st === DEATH) {
      const d = tq - INCOMING;
      if (d < 0) idle(tq, f12);
      else death(d, f12);
    } else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o); legPose(rig);
    const g = focusLocal(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }
  // 死亡「犁地滑倒」：受击 → 前腿一软 → 惯性往前滑、鼻子犁地 3 格 → 翻到一侧侧躺（四腿僵直伸出）→ 卷尾最后落下 → 面甲松脱 → 消散
  function death(d, f12) {
    P.eyes = 1; P.ear = 1;
    if (d < 0.3) { P.bx = -2; P.tail = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.pitch = d < 0.15 ? 0 : -2; P.head = d < 0.15 ? -1 : 2; P.mane = -1; }
    else if (d < 0.5) { const k = f12of(d - 0.3); P.bx = -1 + k; P.pitch = -3; P.crouch = 3; P.head = 3; P.jaw = 1; P.tail = 2; P.mane = 1; }   // 鼻子犁地往前滑：-1 → 0 → +1
    else { P.bx = 2; P.lie = 2; P.jaw = 1; P.lift = d < 0.58 ? 3 : d < 0.66 ? 1 : 0; P.tail = d < 1.0 ? 2 : d < 1.1 ? 1 : 0; if (d >= 1.6) P.dq = clamp01((d - 1.6) / 0.8); }
    const dr = B.dropAt(d, DROP); P.drop = dr[0]; P.dsx = dr[1]; P.dsy = dr[2];
  }
  // 腿姿覆盖（rig 是纯数据，画之前改脚的位置）：跃起伸直 / 蹬地 / 四蹄叉开砸地、近前蹄后刨
  function legPose(r) {
    for (let i = 0; i < 4; i++) {
      const L = r.legs[i], T = L.T, fr = L.front; let fx = L.F[0], fy = L.F[1];
      if (P.leap === 1) { fx = T[0] + (fr ? 0.85 : -0.8) * L.L; fy = T[1] + (fr ? 0.42 : 0.5) * L.L; }
      else if (P.leap === 2) { if (fr) { fx = T[0] + 2.5; fy = T[1] + L.L * 0.55; } else { fx = T[0] - 3.5; fy = 0; } }
      else if (P.leap === 3) { fx = T[0] + (fr ? 2.5 : -2.5); fy = 0; }
      if (i === 3 && P.scr) fx += P.scr * 1.5;
      const dx = fx - T[0], dy = fy - T[1], dd = Math.hypot(dx, dy); if (dd > L.L) { fx = T[0] + dx * L.L / dd; fy = T[1] + dy * L.L / dd; }
      L.F = [fx, fy]; L.up = fy < -0.5;
    }
  }
  function focusLocal() { const F = rig.legs[3].F; return [F[0], Math.min(-1, F[1] - 1)]; }   // 轮廓光 / 汇聚的中心：近前蹄下的地裂

  // ───── 画 ─────
  // 候选部件：bristleRidge 背脊鬃刺（画在皮甲之后：从甲的脊缝里竖出来；没有披挂的角色画在躯干之前，只露出伸出背线的部分）。按背线逐根排，肩峰处最长；erect 根数从前往后逐根竖起
  //   c = { a, b 起止（臀心 0 → 胸心 1，可超出）, len 最长, min 两端最短, peak 最长处（沿路径 0–1）, width 长短分布宽, step 间距, lean 伏倒后倾 0–1, mat 键名 }
  //   读 P：brist（0–6 竖起档）· mane（-1..1 摆）
  function ridgePath(r, c) {
    const out = [], C1 = r.C1, C2 = r.C2, sq = r.sq, x0 = C2.x + (C1.x - C2.x) * c.a, x1 = C2.x + (C1.x - C2.x) * c.b;
    for (let x = x0; x <= x1 + 1e-6; x += c.step) { const s = Q.span(r, o, R(x)); if (!s) continue; out.push([x, s[0] + 1, (x - x0) / Math.max(1, x1 - x0)]); }
    return out;
  }
  function bristleRidge(E, r, P, c) {
    E.part(); const mat = m[c.mat || 'mane'], pts = ridgePath(r, c), n = pts.length, up = (P.brist | 0) / 6, sw = (P.mane | 0) * 0.18, lying = r.lie === 2;
    pts.forEach(([x, y, s], i) => {
      const erect = (n - 1 - i) / Math.max(1, n - 1) < up - 1e-6 || up >= 1;              // 从前（肩）往后逐根竖起
      const L = R(c.min + (c.len - c.min) * Math.exp(-(((s - c.peak) / c.width) ** 2))) + (erect ? 1 : 0);
      let lean = lying ? 0.9 : (erect ? 0.12 : c.lean) + sw, dx = -Math.sin(lean * 1.2), dy = -Math.cos(lean * 1.2);
      if (lying) { dx = -0.95; dy = -0.3; }
      for (let j = 0; j <= L; j++) {
        const px = x + dx * j, py = y + dy * j, t = j === L ? 4 : j >= L - 1 ? 3 : 2;
        U.dot(E, px, py, mat, t); if (j < 2) U.dot(E, px - 1, py, mat, 2);
      }
    });
  }
  // 候选部件：boarTusks 獠牙（从下颌往上外弯，伸出吻部上沿 len 格；侧视只画近侧那根，画在面甲之后；far = 1 用暗一级材质、画在头之前）
  //   c = { u 沿吻部的位置（0 吻根 → 1 吻尖）, len 伸出吻部上沿的格数, curve 往后弯, mat 键名（远侧用 *Far）}；读 P.jaw（下颌张开时跟着下移）
  function tusks(E, r, P, c, far) {
    E.part(); const F = Q.headFrame(r, o, P.jaw | 0), mat = far ? (m[(c.mat || 'bone') + 'Far'] || m.far) : m[c.mat || 'bone'];
    const u0 = F.u0 + (F.uT - F.u0) * c.u - (far ? 1.1 : 0), pr = F.prof(u0), v0 = pr[1] + F.gap(u0) - 0.4, Lt = v0 - pr[0] + c.len - (far ? 0.6 : 0);
    const seen = new Set();
    for (let s = 0; s <= Lt + 1e-6; s += 0.45) {
      const q = s / Lt, du = 1.2 * Math.sin(q * PI * 0.6) - c.curve * q * q * 3, p = F.at(u0 + du, v0 - s), px = R(p[0]), py = R(p[1]), k = px * 1000 + py; if (seen.has(k)) continue; seen.add(k);
      const t = q > 0.7 ? 4 : q < 0.15 ? 2 : 3; U.dot(E, px, py, mat, t);
      if (s < 1.6) { const p2 = F.at(u0 + du + 0.9, v0 - s); U.dot(E, p2[0], p2[1], mat, 2); }
    }
  }
  // 皮甲上缝的铁片（紧跟 blanket 画，同一个部件）：3 × 2 铁片 + 左上高光 + 铆钉
  function armorPlates(r) {
    const C1 = r.C1, C2 = r.C2;
    for (const q of [0.4, 0.62, 0.84]) {
      const x = R(C2.x + (C1.x - C2.x) * q), s = Q.span(r, o, x); if (!s) continue; const y = s[0] + 2;
      for (let j = 0; j < 2; j++) for (let i = 0; i < 3; i++) U.dot(E, x + i, y + j, m.plate, j === 0 && i === 0 ? 4 : j === 1 ? 2 : 3);
      U.dot(E, x + 1, y, m.rivet, 4);
    }
  }
  // 白色旧伤疤（紧跟 body 画，同一个部件）：只画在躯干里面
  const SCARS = [[-0.95, 0.1, 3, 1], [-0.7, 0.55, 2, 1], [0.35, 0.45, 3, -1]];                 // [相对臀 / 胸圆心的 x 比例, y 比例, 长, 方向]
  function scars(r) {
    for (const [ux, uy, n, d] of SCARS) {
      const C = ux < 0 ? r.C2 : r.C1, x0 = C.x + ux * C.r * (ux < 0 ? 1 : 1), y0 = C.y + uy * C.r * r.sq;
      for (let k = 0; k < n; k++) { const x = R(x0 + k), y = R(y0 - k * d * 0.6), s = Q.span(r, o, x); if (!s || y <= s[0] + 1 || y >= s[1] - 1) continue; U.dot(E, x, y, m.scar, k === 0 ? 2 : 3); }
    }
  }
  // 耳朵缺一口（紧跟 head 画）：尖耳前沿第 2 行挖掉 1 格
  function earNotch(r) { if (r.lie === 2) return; const F = Q.headFrame(r, o, 0), eb = F.at(-F.W * 0.35, -F.Hh + 0.3), xo = R(eb[0]) - R(1 * ((P.ear | 0) ? 1 : 0.3)); E.sp(xo, R(eb[1]) - 2, 0); }
  // 面甲上的铆钉（紧跟 chamfron 画）
  function rivets(r) { const F = Q.headFrame(r, o, 0); for (const u of [-1.2, 1.8, 3.8]) { const p = F.at(u, F.top(u) + 0.9); U.dot(E, p[0], p[1], m.rivet, 4); } }
  // 候选部件：chamfronDrop 掉在地上的面甲：侧面看是一条 7 格的铁片 + 独角刺；flat 1 = 平躺
  function droppedPlate(x, y, flat) {
    E.part(); x = R(x); y = R(y);
    if (flat) { for (let i = -3; i <= 3; i++) { U.dot(E, x + i, 0, m.plate, i === -3 ? 4 : 3); if (Math.abs(i) < 3) U.dot(E, x + i, -1, m.plate, i < 0 ? 4 : 3); } U.dot(E, x + 4, -1, m.horn, 3); U.dot(E, x + 5, -1, m.horn, 4); U.dot(E, x - 1, -1, m.rivet, 4); U.dot(E, x + 2, -1, m.rivet, 4); }
    else { for (let j = -2; j <= 2; j++) for (let i = -1; i <= 1; i++) U.dot(E, x + i, y + j, m.plate, i < 0 || j < 0 ? 4 : 3); U.dot(E, x + 2, y - 1, m.horn, 3); U.dot(E, x + 3, y - 2, m.horn, 4); U.dot(E, x, y, m.rivet, 4); }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lying = rig.lie === 2;
    if (!lying) Q.legs(E, rig, P, o, 1);
    Q.tail(E, rig, P, o);
    Q.body(E, rig, P, o); scars(rig);
    if (!lying) Q.legs(E, rig, P, o, 0);
    Q.blanket(E, rig, P, o, ARMOR); if (!lying) armorPlates(rig);
    bristleRidge(E, rig, P, RIDGE);                                                            // 硬鬃从皮甲的脊缝里竖出来
    Q.head(E, rig, P, o); earNotch(rig);
    if (!P.drop) { Q.chamfron(E, rig, P, o, HELM); rivets(rig); }
    tusks(E, rig, P, TUSK, 0);
    if (lying) { Q.legs(E, rig, P, o, 1); Q.legs(E, rig, P, o, 0); }
    if (P.drop) { const h = rig.head; droppedPlate(h.x + 3 + P.dsx, P.drop === 2 ? 0 : h.y - P.dsy, P.drop === 2 ? 1 : 0); }
  }
  function bakeHero() { RIM.rim = P.rim; RIM.rx = P.gx + hero.ox; RIM.ry = P.gy + hero.oy; RIM.flash = P.flash; RIM.dq = P.dq; bake(hero, RIM); }

  // ───── 特效 ─────
  let chargeAcc = 0, steamAcc = 0, soulAcc = 0, trailAcc = 0, lastGf = -9, lastF = -9, lastPers = -9, landT = 9, landX = 0;
  const hoofScr = (i) => { const F = rig.legs[i].F; return [scrX(F[0] + P.bx), HY + R(F[1])]; };
  const snoutScr = () => [scrX(rig.mouth[0] + P.bx), HY + R(rig.mouth[1])];
  function clods(x, y, n, vx0, vx1, vy0, vy1, big) {                                          // 土块：带重力、落地贴住走完色阶
    for (let i = 0; i < n; i++) spawnX(K_PHYS, x + (rnd() - 0.5) * 3, y, vx0 + rnd() * (vx1 - vx0), vy0 + rnd() * (vy1 - vy0), 0.5 + rnd() * 0.5, R_EL, { g: 330, floor: FLOOR - (rnd() < 0.5 ? 1 : 0), sz: rnd() < big ? 2 : 1 });
  }
  function dust(x, y, n, spd, life) { for (let i = 0; i < n; i++) spawn(K_DUST, x + (rnd() - 0.5) * 6, y, (rnd() - 0.5) * spd, -4 - rnd() * 10, life * (0.7 + rnd() * 0.6), FXI.dust); }
  function steam(n) { const [x, y] = snoutScr(), d = P.flip ? -1 : 1; for (let i = 0; i < n; i++) spawn(K_RISE, x + d, y + 1, d * (10 + rnd() * 14), -3 - rnd() * 6, 0.35 + rnd() * 0.3, R_STEAM); }
  function onEnter(s) {
    if (s === CAST) {                                                                          // 后腿一蹬跃起：起跳点土块外爆 + 尘雾，震屏 2 格 + 闪白
      poseAt(CAST, 0, E.simT); const bx = hoofScr(2)[0];
      releaseOrbit(30, 80, 0.3, 0.6, { ramp: R_EL });
      clods(bx, FLOOR - 1, 16, -90, 10, -120, -40, 0.35); dust(bx, HY, 10, 40, 0.6); ring(bx, HY - 1, 0, R_EL);
      shake(0.28, 2); flash(0.05);
    }
  }
  function onTime(s, t) {
    if (s === ATTACK && t === T_HIT) {                                                         // 獠牙上挑：一道向上的弧 + 命中火花
      const hx = scrX(rig.head.x + P.bx), hy = HY + R(rig.head.y), tx = DUMMY_X - 4, ty = HY - 12;
      fx.slash(hx + 2, hy - 1, 8, 2.3, 0.35, R_EL, 0.17, 2, 2);
      burst(tx, ty, 16, 50, 120, 0.15, 0.45, FXI.impact, 14); burst(tx, ty + 2, 8, 30, 80, 0.2, 0.4, R_EL, 18); hitDummy(1, 1);
      dust(scrX(6 + P.bx), HY, 5, 30, 0.4);
      sfx('swing', { kind: 'smash', w: 0.85 }); sfx('hit', { mat: 'flesh', w: 0.85 });
    }
    if (s === CHARGE && T_PAW.includes(t)) {                                                   // 刨地：3 颗土块往后飞 + 蹄下细小地裂
      const k = T_PAW.indexOf(t), [x] = hoofScr(3);
      clods(x - 1, FLOOR - 1, 3, -85, -40, -80, -45, 0.4); dust(x, HY, 2, 20, 0.4);
      fx.crack(x + 1, FLOOR, 2 + k, 1, R_EL, 0.9, 0); fx.crack(x - 1, FLOOR, 2 + k, -1, R_EL, 0.9, 0);
      sfx('step', { w: 0.4 });
    }
    if (s === CAST && t === T_LAND) {                                                          // 四蹄砸地：双向地裂 + 双向地浪 + 大冲击环 + 30 颗土块 + 尘雾
      const x = scrX(o.len / 2 + 1); landX = x; landT = 0;
      fx.crack(x, FLOOR, 10, 1, R_EL, 1.2, 0); fx.crack(x - 1, FLOOR, 10, -1, R_EL, 1.2, 0);
      fx.wave(x + 1, FLOOR - 1, 1, 13, 6, R_EL, 0.55, 2); fx.wave(x - 2, FLOOR - 1, -1, 13, 6, R_EL, 0.55, 1);
      ring(x, HY - 3, 1, R_EL); burst(x, HY - 4, 10, 40, 100, 0.2, 0.45, R_EL, 30);
      clods(x, FLOOR - 1, 30, -110, 110, -150, -50, 0.35); dust(x, HY, 16, 60, 1.2);
      hitDummy(1, 1); shake(0.2, 2);
      sfx('impact', { pal: 'earth', w: 0.85 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 90, 0.2, 0.45, R_FUR, 12);
    if (s === DEATH && t === INCOMING + 0.66) { dust(HX + 2, HY - 1, 16, 50, 0.7); shake(0.12, 1); sfx('fall', { w: 0.8 }); }
    if (s === DEATH && t === T_PLATE) sfx('hit', { mat: 'metal', w: 0.3 });                   // 面甲落地：铁片磕地一声
  }
  const T_PLATE = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_HIT], T_PAW, [T_LAND], [], [INCOMING], [INCOMING + 0.66, T_PLATE], []];
  function stepFX(dt, state, stT) {
    const f = f12of(stT), newF = f !== lastF; lastF = f;
    if (state === CHARGE) {
      const [gx, gy] = [scrX(P.gx), HY + P.gy];
      chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE]));                               // 赭土微尘从四周汇聚到蹄下
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + rnd() * 10, a = PI + rnd() * PI; spawn(K_SPIRAL_PT, gx, gy - 1, r / (0.35 + rnd() * 0.3), 0, 9, R_EL, a, r, 3 + rnd() * 3); }
      steamAcc += dt * (stT > 0.7 ? 4 : 2.2); if (steamAcc >= 1) { steamAcc -= 1; steam(3); }  // 鼻孔喷白气
    }
    if (state === IDLE) {                                                                      // 待机个性：拱两下土（每下 2 颗尘土），最后打一声响鼻
      const lp = stT % DUR[IDLE], k = lp >= 1.6 && lp < 2.0 ? Math.min(4, f12of(lp - 1.6)) : -1;
      if (k !== lastPers) { if (k === 1 || k === 3) { const [x] = snoutScr(); dust(x, HY, 2, 16, 0.35); } if (k === 4) steam(3); lastPers = k; }
    }
    if (state === CAST && f >= 1 && f <= 3) { trailAcc += dt * 40; while (trailAcc >= 1) { trailAcc -= 1; const x = scrX(rig.C2.x - rig.C2.r), y = HY + R(rig.C2.y) + R(rnd() * 3); spawn(K_STILL, x - (P.flip ? -1 : 1) * R(rnd() * 2), y, 0, 0, 0.25, FXI.dust); } }   // 身后拖 2 格尘土残迹
    if ((state === MOVE || (state === RECOVER && P.gf >= 0)) && P.gf !== lastGf) {            // 重步：每次落蹄 3 颗尘土
      if (P.gf === 0 || P.gf === 2) { const [x] = hoofScr(P.gf === 0 ? 3 : 1); dust(x, HY, 3, 18, 0.4); if (state === MOVE) sfx('step', { w: 0.8 }); }
      lastGf = P.gf;
    }
    if (state === DEATH && stT > INCOMING + 0.3 && stT < INCOMING + 0.5 && newF) { const [x] = snoutScr(); for (let i = 0; i < 4; i++) spawn(K_DUST, x + rnd() * 2, HY - 1, -10 - rnd() * 20, -6 - rnd() * 10, 0.4 + rnd() * 0.3, FXI.dust); spawn(K_STILL, x - 1, FLOOR, 0, 0, 0.8, R_EL); spawn(K_STILL, x - 2, FLOOR, 0, 0, 0.8, R_EL); }   // 鼻子犁出尘土沟
    if (state === DEATH && stT > INCOMING + 1.6 && stT < INCOMING + 2.4) { soulAcc += dt * 30; while (soulAcc >= 1) { soulAcc -= 1; spawn(K_RISE, HX - 14 + rnd() * 34, HY - 1 - rnd() * 7, (rnd() - 0.5) * 6, -14 - rnd() * 16, 0.8 + rnd() * 0.8, FXI.soul); } }
    landT += dt;
  }
  function fxReset() { chargeAcc = 0; steamAcc = 0; soulAcc = 0; trailAcc = 0; lastGf = -9; lastF = -9; lastPers = -9; landT = 9; }
  function fxBack(f12) {
    if (P.rim >= 2 && !P.lie && !P.lift) floorGlow(scrX(P.gx), P.rim, EL, f12);
    if (landT < 0.9) { const q = landT / 0.9, w = R(6 + 10 * q); for (let x = -w; x <= w; x++) if (((x + f12) & 1) === 0 || q < 0.3) put(landX + x, FLOOR, q < 0.3 ? EL[1] : q < 0.6 ? EL[2] : EL[3]); }   // 落点地面余光
  }

  return {
    name: '巨型野猪', HX, R_EL, DUR, hero, P, GLOW_MATS: [], HIT_POINT, EVENTS,
    SFX: { body: 'beast', how: 'topple', pal: 'earth', style: 'meteor', w: 0.85 },
    poseAt, drawHero, bakeHero, onEnter, onTime, stepFX, fxReset, fxBack,
  };
});
