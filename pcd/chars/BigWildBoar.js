// 巨型野猪（部队 · 兽人 · 先锋 · 史诗）：矮而长、前高后低的楔形重装野猪。焦褐鬃皮、背脊一排锯齿状的深色硬鬃（肩峰处最高、尖端霜白）、
// 一根从下颌往上外弯的大獠牙、额前带独角刺的铆钉铁面甲、肩背披一块缝了铁片的尖齿皮甲（带肚带）、臀上两道旧伤疤（粉白）、耳朵缺一口、小卷尾。升级 → 赤瞳。
// 攻击：低头前冲 5 格，獠牙从下往上挑（向上的弧形拖影）；技能「奔踏」：刨地竖鬃蓄势 → 一蹬跃起、抛物线跳 16 格 → 四蹄砸在假人前方（双向地裂 + 双向赭土地浪）。
// 身体用 parts-beast 的 quad（躯干、腿、头、卷尾）+ 马具部件（chamfron 面甲）拼；本模块自画锯齿背鬃、獠牙、皮甲（下摆按胸臀连线走、显式明暗）+ 铁片 + 肚带、
// 面甲 2:1 独角刺、鼻盘补格、伤疤、掉落的面甲和特效。
PCD.define('BigWildBoar', (E) => {
  const { Sprite, begin, bake, ease, clamp01, keys, q12, f12of, walkDemo, near, fxRamp, FXI, FXR, HY, FLOOR, DUMMY_X, INCOMING,
    IDLE, MOVE, ATTACK, CHARGE, CAST, RECOVER, HURT, DEATH, REVIVE, DEFAULT_DUR, K_SPIRAL_PT, K_RISE, K_DUST, K_PHYS, K_STILL,
    spawn, spawnX, burst, releaseOrbit, ring, shake, flash, fx, sfx, hitDummy, put, scrX, floorGlow } = E;
  const B = E.parts.beast, Q = B.quad, U = B.util, R = Math.round, PI = Math.PI, rnd = Math.random;

  // ───── 颜色、材质 ─────
  const INK = near('#1a0e08'), FUR_D = near('#3a2214'), FUR = near('#5e3a22'), FUR_L = near('#8a5a36'), BR_D = near('#2a170c'), MUZ = near('#7a4640');
  const PALH = (i) => E.PAL[i];
  const R_EL = FXI.earth, EL = FXR[R_EL];                                                     // 奔踏 · 赭土：奶油 5 → 沙 62 → 暗沙 61 → 木 19 → 深木 20
  const R_STEAM = fxRamp('boarSteam', [PALH(21), PALH(17), PALH(18), PALH(10), PALH(9)]);   // 鼻孔喷出的白气（全是共享色）
  const R_CRACK = fxRamp('boarCrack', [PALH(EL[0]), PALH(EL[1]), PALH(EL[1]), PALH(EL[2]), PALH(EL[3])]);   // 蓄力蹄下细地裂：同一套赭土，整体提亮一级（沙 62 → 暗沙 61），在暗色地面上看得清
  const R_FUR = fxRamp('boarFur', [PALH(7), PALH(FUR_L), PALH(FUR), PALH(FUR_D), PALH(INK)]);   // 受击毛屑（焦褐）
  const m = B.mats(E, {
    main: [INK, FUR_D, FUR, FUR_L],                                                           // 焦褐鬃皮
    bristle: [INK, BR_D, FUR_D, 6],                                                           // 背脊硬鬃：更暗的褐，尖端霜白
    muz: [INK, FUR_D, MUZ, 16], nose: [INK, 11, 12, 13], claw: 'iron', eye: [0, 0, 14, 5],
    tusk: 'bone', cloth: 'leather', hem: 'boot', strap: 'boot', plate: 'iron', rivet: 'steel', spike: 'steel', scar: [INK, 16, 15, 17],
  });
  m.cloth = E.defMat(E.RAMP.leather, 2);                                                      // 皮甲是一大块：band 2
  const o = Q.shape({ len: 14, chest: 5.5, rump: 4, waist: 0.35, hump: 2.5, leg: 5, lw: 2, thigh: 2.4, farDx: -2, stride: 2, lift: 2, foot: 'hoof',
    neck: 2, neckA: 0.05, neckW: 3.6, head: { type: 'boar', w: 6.5, h: 6, snout: 5.5, snH: 4.8, tip: 0.75, ear: 'point', earH: 3, tusk: 0 }, headA: 0.42,
    tail: 'thin', tailLen: 4, tailA: 0.3, tailCurl: 3, mane: 'none', fur: 1, lieLegs: 1, m });
  const SADDLE = { a: 0.5, b: 1.05, drop: 5, thick: 1 };                                   // 皮甲（saddleBlanket 画）：后沿在 x 0（离近后腿的勾线 3 列）、前沿盖过肩；下摆从胸臀连线往下 5 格 + 尖齿
  const BELT = { at: 0.3, len: 2 };                                                         // 肚带：1 格宽，只在皮甲下沿露出 2 格
  const HELM = { from: -0.15, nose: 5.2, thick: 1.5, mat: 'plate', trim: 'rivet', spike: 0 };
  const RIDGE = { a: 0.18, b: 0.3, step: 3, len: 6, min: 2, peak: 0.5, width: 0.36, lean: 0.45 };
  const TUSK = { u: 0.72, len: 4, curve: 0.75 };
  const DROP = { at: 0.66, dur: 0.25, dx: 9, hop: 3 };                                     // 面甲在落地时松脱：0.25 s 滑出 9 格、弹起 3 格

  const HX = 62, DUR = DEFAULT_DUR.slice(), hero = new Sprite(84, 56, 38, 52);
  const RIM = { rim: 0, rx: 0, ry: 0, rimR: [0, 8, 26, 22], rimRamp: EL, flash: 0, dq: 0, skip: new Uint8Array(256) };
  for (const k of ['eye', 'ink', 'spec', 'glow', 'tusk']) RIM.skip[m[k]] = 1;
  const SPEC = Q.KEYS.concat(B.COMMON, [['brist', 0, 6], ['scr', -2, 0], ['leap', 0, 3]]);   // 竖鬃档 · 近前蹄后刨 · 跃起腿姿
  const P = {};
  function reset() { Q.reset(P); P.brist = 0; P.scr = 0; P.leap = 0; }
  reset();
  const HIT_POINT = Q.rig(P, o).hit;
  let rig = Q.rig(P, o);

  // ───── 姿势 ─────
  const F_ALL = ['bx', 'crouch', 'pitch', 'head', 'jaw', 'ear', 'tail', 'mane', 'paw', 'reach', 'brist'];
  const REST = { bx: 0, crouch: 0, pitch: 0, head: 0, jaw: 0, ear: 0, tail: 0, mane: 0, paw: 0, reach: 0, brist: 0 };
  const pose = (p) => Object.assign({}, REST, p);
  const A_WIND = pose({ bx: -2, crouch: 1, head: 3, pitch: -1, ear: 1, tail: 1, brist: 3 });              // 预兆：低头压低、后坐
  const A_HIT = pose({ bx: 5, head: -2, pitch: 2, jaw: 1, ear: 1, tail: -2, mane: -1, brist: 6 });        // 出手：前冲 5 格、前高后低、獠牙上挑
  const A_HOLD = pose({ bx: 4, head: -1, pitch: 1, ear: 1, tail: -1, brist: 4 });
  const ATK = [[0, REST], [0.12, A_WIND, 'out'], [2 / 12, A_HIT, 'snap'], [0.25, A_HIT, 'lin'], [0.45, A_HOLD, 'out'], [0.75, REST, 'inOut']];
  const C_LOW = pose({ crouch: 3, head: 2, pitch: -2, ear: 1, tail: 1, mane: 1 });           // 蓄势：前低后高压低
  // 施放（跃起）逐帧：[lift, mx, pitch, leap, crouch, head, tail, mane]；leap 1 = 身体伸直（前腿前伸、后腿后蹬）· 2 = 后腿蹬地 · 3 = 四蹄叉开砸地
  const LEAP = [[1, -3, 2, 2, 0, 1, 2, -1], [8, 2, 1, 1, 0, 0, 2, -1], [10, 7, -1, 1, 0, 1, 1, 1], [0, 12, -1, 3, 3, 2, -2, 1], [0, 12, -1, 3, 2, 2, -1, 0], [0, 12, 0, 3, 1, 1, 0, 0]];
  const T_HIT = 2 / 12, T_LAND = 3 / 12, T_PAW = [7 / 12, 11 / 12, 15 / 12], T_FALL = 12 / 12;   // T_FALL：死亡倒地（第 12 帧离地 0，声音、尘土、震屏同一帧）
  const PERS = [[3, 0, 0, 0], [3, 1, 0, 1], [2, 0, 1, 1], [3, 1, 0, -1], [0, 0, 1, 2]];      // 待机个性「拱地」逐帧：[head, jaw, ear, tail]
  const BACK = 4, JUMP = 12;                                                                   // 蓄力时后坐 4 格，跃起横移 16 格（-4 → +12）

  function idle(tq, f12) {
    const lp = Q.anim.idle(P, tq, f12, DUR[IDLE]);
    if (lp >= 1.6 - 1e-6 && lp < 2.0) { const k = Math.min(4, f12of(lp - 1.6)), s = PERS[k]; P.head = s[0]; P.jaw = s[1]; P.ear = s[2]; P.tail = s[3]; P.mane = k & 1 ? 1 : 0; }
  }
  const tmp = {};
  function apply(src) { for (const f of F_ALL) P[f] = R(src[f]); }
  function poseAt(st, t, T) {
    const tq = q12(t), f12 = f12of(T);
    reset();
    if (st === IDLE) idle(tq, f12);
    else if (st === MOVE) { const f = Q.anim.walk(P, tq); P.mane = f & 1 ? 0 : (f === 0 ? 1 : -1); const w = walkDemo(tq, 14, -1); P.mx = w.mx; P.flip = w.flip; }   // 鬃刺随步子抖
    else if (st === ATTACK) { keys(tq, ATK, tmp, F_ALL); apply(tmp); }
    else if (st === CHARGE) {
      const q0 = ease.inOut(clamp01(tq / 0.5)); E.mix(tmp, REST, C_LOW, q0, F_ALL); apply(tmp); P.mx = -R(BACK * q0);   // 压低、后坐
      P.brist = tq < 0.2 ? 0 : Math.min(6, 1 + Math.floor((tq - 0.2) / 0.15 + 1e-6));        // 背鬃从肩往后一根根竖起
      const f = f12of(tq);
      if (f >= 5) { const c = (f - 5) & 3; P.paw = [2, 1, 0, 0][c]; P.scr = [0, 0, -2, -1][c]; }   // 近侧前蹄往后刨地三次
      if (tq > 1.1) P.bob = f & 1;                                                             // 蓄满前浑身发抖
      P.rim = 2;
    } else if (st === CAST) {
      const s = LEAP[Math.min(5, f12of(tq))];
      P.lift = s[0]; P.mx = s[1]; P.pitch = s[2]; P.leap = s[3]; P.crouch = s[4]; P.head = s[5]; P.tail = s[6]; P.mane = s[7];
      P.brist = 6; P.ear = 1; P.jaw = s[3] === 3 ? 1 : 0; P.rim = s[3] === 3 ? 2 : 3;
    } else if (st === RECOVER) {
      const f = f12of(tq);                                                                     // 从落点转身小跑回站位（12 fps 小碎步），到站再转回来，背鬃一根根伏下
      if (f === 0) { P.mx = JUMP; P.crouch = 1; P.head = 1; P.brist = 5; P.rim = 2; }
      else if (f <= 6) { P.flip = 1; P.mx = R(JUMP * (1 - f / 6.5)); P.gf = (f - 1) & 3; P.bob = P.gf & 1 ? 0 : 1; P.tail = [-1, 0, 1, 0][P.gf]; P.brist = Math.max(0, 5 - f); P.rim = f < 3 ? 1 : 0; }
      else { P.mx = 0; P.head = f === 7 ? 1 : 0; }
    } else if (st === HURT) { const h = tq - INCOMING; if (h < 0) idle(tq, f12); else { Q.anim.hurt(P, h); if (h < 0.2) P.mane = -1; } }
    else if (st === DEATH) { const d = tq - INCOMING; if (d < 0) idle(tq, f12); else death(d); }
    else if (st === REVIVE) { idle(tq, f12); P.ddir = 1; P.dq = tq < 0.4 ? 1 : tq < 0.85 ? 1 - (tq - 0.4) / 0.45 : 0; }
    rig = Q.rig(P, o); legPose(rig);
    const g = focusLocal(); P.gx = R(g[0]) + P.bx; P.gy = R(g[1]);
    B.key(P, SPEC);
  }
  // 死亡「犁地滑倒」：受击 → 前腿一软 → 惯性往前滑、鼻子犁地 3 格 → 翻到一侧侧躺（四腿僵直伸出）→ 卷尾最后落下 → 面甲松脱 → 消散
  function death(d) {
    P.eyes = 1; P.ear = 1;
    if (d < 0.3) { P.bx = -2; P.tail = 2; P.flash = d < 1 / 12 ? 1 : 0; P.crouch = d < 0.15 ? 1 : 2; P.pitch = d < 0.15 ? 0 : -2; P.head = d < 0.15 ? -1 : 2; P.mane = -1; }
    else if (d < 0.5) { const k = f12of(d - 0.3); P.bx = -2 + k * 1.5; P.pitch = -3; P.crouch = 3; P.head = 3; P.jaw = 1; P.tail = 2; P.mane = 1; }   // 鼻子犁地往前滑：-2 → +1
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
  // 躯干 + 颈第 x 列的上沿（近似颈的 taper；只用来给背鬃找根，根部埋进躯干 2 格，躯干后画会盖住）
  function topAt(r, oo, x) {
    let t = 1e9; const s = Q.span(r, oo, x); if (s) t = s[0];
    const NB = r.NB, NT = r.NT;
    for (let k = 0; k <= 4; k++) { const q = k / 4, cx = NB.x + (NT.x - NB.x) * q, cy = NB.y + (NT.y - NB.y) * q, rad = oo.neckW * (1 - 0.2 * q), dx = x - cx; if (Math.abs(dx) <= rad) t = Math.min(t, Math.ceil(cy - Math.sqrt(rad * rad - dx * dx) - 0.35)); }
    return t < 1e8 ? t : null;
  }
  // 候选部件：bristleRidge 锯齿背鬃：从颈顶（耳后）往后到腰排一串后倾的硬鬃刺（根 2 格宽、尖 1 格，间距 step），长短相间、肩峰处最长。
  //   画在躯干和皮甲之前（躯干盖住根部，只露出伸出背线的部分），外轮廓成锯齿。c = { a 起点（臀心 0 → 胸心 1）, b 终点在颈顶前几格, step 间距, len 最长, min 两端最短,
  //   peak 最长处（沿路径 0–1）, width 长短分布宽, lean 伏倒后倾（弧度）}；材质 m.bristle（tone 2 根 · 3 刺身 · 4 霜尖 2 格）。
  //   读 P.brist（0–6，从肩往后逐根竖起：竖起的长 1 格、几乎直立）· P.mane（-1..1 前后摆）
  function bristleRidge(r, c) {
    if (r.lie === 2) return;                                                                   // 侧躺时背压在地上，看不见
    E.part();
    const C1 = r.C1, C2 = r.C2, x0 = C2.x + (C1.x - C2.x) * c.a, x1 = r.NT.x + c.b, n = Math.max(1, Math.floor((x1 - x0) / c.step)), up = (P.brist | 0) / 6, sw = (P.mane | 0) * 0.2;
    for (let i = 0; i <= n; i++) {
      const x = R(x1 - i * c.step), s = (x - x0) / Math.max(1, x1 - x0), y = topAt(r, o, x); if (y == null) continue;
      const erect = up > 0 && s >= 1 - up - 1e-6;
      const L = Math.max(1, R(c.min + (c.len - c.min) * Math.exp(-(((s - c.peak) / c.width) ** 2))) - (i & 1) + (erect ? 1 : 0));
      const lean = (erect ? 0.1 : c.lean) + sw;
      for (let j = -2; j <= L; j++) {
        const px = x - R(Math.sin(lean) * Math.max(0, j)), py = y - j, tn = j >= L - 1 && j > 0 ? 4 : j >= L - 2 ? 3 : 2;
        U.dot(E, px, py, m.bristle, tn);
        if (j < L - 1) U.dot(E, px - 1, py, m.bristle, j >= L - 2 ? 3 : 2);                   // 刺身 2 格宽，只有尖 1 格
      }
    }
  }
  // 候选部件：boarTusk 獠牙（从下颌伸出、往上外弯再往回勾，尖端伸出吻部上沿 len 格；侧视只画近侧一根，单独一个部件压在头上）
  //   c = { u 沿吻部的位置（0 吻根 → 1 吻尖）, len 伸出吻部上沿的格数, curve 往回勾的程度 }，材质 m.tusk（骨白：根灰、中段奶油、尖白）；读 P.jaw（张嘴时跟着下颚下移）
  function boarTusk(r, c, oo, mat) {
    E.part();
    const F = Q.headFrame(r, oo, P.jaw | 0), u0 = F.u0 + (F.uT - F.u0) * c.u, pr = F.prof(u0), vb = pr[1] + F.gap(u0) - 0.3, H = vb - (pr[0] - c.len), seen = new Set();
    for (let s = 0; s <= H + 1e-6; s += 0.4) {
      const q = s / H, du = 1.1 * Math.sin(q * PI * 0.55) - c.curve * q * q * 2.4, p = F.at(u0 + du, vb - s), px = R(p[0]), py = R(p[1]), k = px * 1000 + py;
      if (seen.has(k)) continue; seen.add(k);
      U.dot(E, px, py, mat, q > 0.72 ? 4 : q < 0.2 ? 2 : 3);
      if (q < 0.5) { const p2 = F.at(u0 + du + 0.8, vb - s); U.dot(E, p2[0], p2[1], mat, 3); }   // 根部 2 格粗
    }
  }
  // 面甲的独角刺 + 铆钉（紧跟 chamfron 画，同一个部件）：额前往前上方 2:1 斜伸的 3 格刺，根 2 格宽，尖用 steel 第 4 级高光
  //   按世界坐标画（不跟头的倾角转），低头 / 抬头时刺都朝前上方
  function helmSpike(r) {
    const F = Q.headFrame(r, o, 0), u = F.W * 0.05, b = F.at(u, F.top(u)), x = R(b[0]), y = R(b[1]);
    U.dot(E, x, y - 1, m.spike, 2); U.dot(E, x + 1, y - 1, m.spike, 3);                     // 根 2 格
    U.dot(E, x + 2, y - 2, m.spike, 3); U.dot(E, x + 3, y - 2, m.spike, 4);                 // 刺身 → 尖（高光）
    for (const uu of [-0.2, 2.4]) { const p = F.at(uu, F.top(uu) + 0.9); U.dot(E, p[0], p[1], m.rivet, 4); }
  }
  // 鼻盘多 1 格（紧跟 head 画）：库里的 disc 鼻是上 1 格基色 + 下 1 格鼻孔，吻高 4.8 放得下 3 格：上面再补 1 格高光
  function noseDisc(r) { if (r.lie === 2) return; const F = Q.headFrame(r, o, P.jaw | 0), a = F.at(F.uT + 0.3, F.vc - 0.5), x = R(a[0]), y = R(a[1]); U.dot(E, x, y - 1, m.nose, 4); U.dot(E, x, y, m.nose, 3); }
  // 候选部件：blanket 的 hemLine 选项（下摆沿胸、臀圆顶的连线走，不跟肩峰起伏）+ 显式明暗。
  //   库的 Q.blanket 下摆 = 背线 + drop，背线在肩峰处拱起 → 下摆在肩峰下缩上去 2–3 格，勾线在那里压出一道竖着的深色缺口；
  //   它的自动明暗还会在铁片左边、两端压出 2 格宽的暗竖条。这里同样的参数（a b drop thick hem 'dag'）自己画：
  //   上沿贴背线（盖过肩峰），下摆按胸臀连线 + drop + 尖齿；上沿 1 行亮、再 2 行基色、往下暗面，前端 1 列暗，下摆一行深色皮边。
  function saddleX(r) { const C1 = r.C1, C2 = r.C2; return [R(C2.x + (C1.x - C2.x) * SADDLE.a), R(C2.x + (C1.x - C2.x) * SADDLE.b)]; }
  function saddleHem(r, x, xa) {
    const C1 = r.C1, C2 = r.C2, sq = r.sq, t = (x - C2.x) / (C1.x - C2.x), line = C2.y - C2.r * sq + (C1.y - C1.r * sq - (C2.y - C2.r * sq)) * t;
    return Math.ceil(line - 0.35) + SADDLE.drop + [0, 1, 2, 1][(x - xa + (P.mane | 0) + 40) & 3];
  }
  function saddleBlanket(r) {
    E.part();
    const [xa, xb] = saddleX(r), c = SADDLE, sw = P.mane | 0;
    for (let x = xa; x <= xb; x++) {
      const sp = Q.span(r, o, x); if (!sp) continue;
      const top = sp[0] - c.thick, bot = Math.min(saddleHem(r, x, xa), sp[1] + 1), end = x === xa || x === xb;
      for (let y = top + (end ? 1 : 0); y <= bot; y++) {
        if (y === bot) { U.dot(E, x, y, m.hem, 2); continue; }
        U.dot(E, x, y, m.cloth, x === xb ? 2 : y === top || (end && y === top + 1) ? 4 : y - top >= 3 ? 2 : 3);   // 披在圆背上：上 1 行亮、再 2 行基色、往下都是暗面
      }
      if (x === xa && sw > 0) { U.dot(E, x - 1, bot, m.hem, 2); U.dot(E, x - 1, bot - 1, m.cloth, 3); }   // 下摆随步子甩：后 / 前下角多出 1 格
      if (x === xb && sw < 0) { U.dot(E, x + 1, bot, m.hem, 2); U.dot(E, x + 1, bot - 1, m.cloth, 2); }
    }
    return [xa, xb];
  }
  // 皮甲上缝的铁片（紧跟 saddleBlanket 画，同一个部件）：两块 3 × 3 铁片（上、左高光，下、右暗），对角两颗铆钉
  function saddlePlates(r, xa, xb) {
    for (const x of [xa + 1, xa + 5]) {
      if (x + 2 >= xb) continue; const s = Q.span(r, o, x); if (!s) continue; const y = s[0] + 1;
      for (let j = 0; j < 3; j++) for (let i = 0; i < 3; i++) U.dot(E, x + i, y + j, m.plate, j === 0 || i === 0 ? 4 : j === 2 || i === 2 ? 2 : 3);
      U.dot(E, x, y, m.rivet, 4); U.dot(E, x + 2, y + 2, m.rivet, 3);
    }
  }
  // 肚带 + 皮甲后沿的躯干明暗（画在躯干这个部件里，不单独起部件，两侧不压勾线）
  //   肚带：1 格宽，皮甲下摆的勾线下面露出 2 格皮带（皮甲同色，上亮下暗）
  //   后沿：库的自动明暗会把皮甲后沿左边 2 列躯干压暗，和近侧后腿的暗边、勾线连成一条深色竖带 → 这 2 列在皮甲高度内改成显式基色（勾线仍由分界线自动生成）
  function girthStub(r) {
    if (r.lie === 2) return;
    const [xa, xb] = saddleX(r);
    for (const x of [xa - 2, xa - 1]) { const sp = Q.span(r, o, x); if (!sp) continue; const bot = saddleHem(r, xa, xa) + 1; for (let y = sp[0] + 1; y <= Math.min(bot, sp[1] - 2); y++) U.dot(E, x, y, m.body, 3); }
    const x = R(xa + (xb - xa) * BELT.at), sp = Q.span(r, o, x); if (!sp) return;
    const bot = saddleHem(r, x, xa);
    for (let j = 1; j <= BELT.len + 1; j++) if (bot + j <= sp[1]) U.dot(E, x, bot + j, m.cloth, j === BELT.len + 1 ? 2 : 3);   // 第 1 格是下摆的勾线（分界线会盖掉）
  }
  // 侧躺时的皮甲：肚子朝上、背压在地上，只露出贴地的一条（2 格皮 + 深色下摆线）+ 一块铁片
  function saddleLying(r) {
    E.part();
    const C1 = r.C1, C2 = r.C2, xa = R(C2.x + (C1.x - C2.x) * SADDLE.a), xb = R(C2.x + (C1.x - C2.x) * SADDLE.b);
    for (let x = xa; x <= xb; x++) { const s = Q.span(r, o, x); if (!s) continue; for (let j = 0; j < 3; j++) U.dot(E, x, s[1] - j, j === 2 ? m.hem : m.cloth, j === 0 ? 2 : 0); }
    const px = R((xa + xb) / 2) - 1; for (let i = 0; i < 4; i++) { U.dot(E, px + i, -1, m.plate, i === 0 ? 4 : 3); U.dot(E, px + i, 0, m.plate, 2); }
  }
  // 白色旧伤疤（紧跟 body 画，同一个部件）：臀上两道「/」形 3 格斜疤、肩前一道短疤；两端浅褐、中间粉白（新肉色，不用纯白：纯白的两个点会读成眼睛）
  const SCARS = [[-0.35, -0.2, 3], [0.25, 0.3, 3], [1.35, 0.55, 2]];                           // [相对臀心的 x、y（按臀半径；第三道按胸心 + 胸半径）, 长]
  function scars(r) {
    if (r.lie === 2) return;
    SCARS.forEach(([ux, uy, n], i) => {
      const C = i < 2 ? r.C2 : r.C1, x0 = R(C.x + (i < 2 ? ux : ux - 1) * C.r), y0 = R(C.y + uy * C.r);
      for (let k = 0; k < n; k++) U.dot(E, x0 + k, y0 - k, m.scar, k === 1 ? 3 : 2);
    });
  }
  // 耳朵缺一口（紧跟 head 画）：尖耳前沿第 2 行挖掉 1 格
  function earNotch(r) { if (r.lie === 2) return; const F = Q.headFrame(r, o, 0), eb = F.at(-F.W * 0.35, -F.Hh + 0.3), xo = R(eb[0]) - R((P.ear | 0) ? 1 : 0.3); E.sp(xo, R(eb[1]) - 2, 0); }
  // 候选部件：chamfronDrop 掉在地上的面甲：侧面看是一条 7 格铁片 + 独角刺；flat 1 = 平躺在地上
  function droppedPlate(x, y, flat) {
    E.part(); x = R(x); y = R(y);
    if (flat) {
      for (let i = -3; i <= 3; i++) { U.dot(E, x + i, 0, m.plate, i === -3 ? 4 : 2); if (Math.abs(i) < 3) U.dot(E, x + i, -1, m.plate, i < 0 ? 4 : 3); }
      U.dot(E, x + 4, -1, m.spike, 3); U.dot(E, x + 5, -2, m.spike, 4); U.dot(E, x - 1, -1, m.rivet, 4); U.dot(E, x + 2, -1, m.rivet, 4);
    } else {
      for (let j = -2; j <= 2; j++) for (let i = -1; i <= 1; i++) U.dot(E, x + i, y + j, m.plate, i < 0 || j < 0 ? 4 : 3);
      U.dot(E, x + 2, y - 1, m.spike, 3); U.dot(E, x + 3, y - 2, m.spike, 4); U.dot(E, x, y, m.rivet, 4);
    }
  }
  function drawHero() {
    begin(hero, P.bx, 0);
    const lying = rig.lie === 2;
    if (!lying) Q.legs(E, rig, P, o, 1);
    Q.tail(E, rig, P, o);
    bristleRidge(rig, RIDGE);                                                                  // 背鬃在躯干之前：只露出伸出背线的锯齿
    Q.body(E, rig, P, o); scars(rig); girthStub(rig);
    if (!lying) { Q.legs(E, rig, P, o, 0); const [xa, xb] = saddleBlanket(rig); saddlePlates(rig, xa, xb); }
    else saddleLying(rig);
    Q.head(E, rig, P, o); earNotch(rig); noseDisc(rig);
    if (!P.drop) { Q.chamfron(E, rig, P, o, HELM); helmSpike(rig); }
    boarTusk(rig, TUSK, o, m.tusk);
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
      fx.slash(hx + 3, hy - 1, 8, 2.3, 0.35, R_EL, 0.17, 2, 2);
      burst(tx, ty, 16, 50, 120, 0.15, 0.45, FXI.impact, 14); burst(tx, ty + 2, 8, 30, 80, 0.2, 0.4, R_EL, 18); hitDummy(1, 1);
      dust(scrX(6 + P.bx), HY, 5, 30, 0.4);
      sfx('swing', { kind: 'smash', w: 0.85 }); sfx('hit', { mat: 'flesh', w: 0.85 });
    }
    if (s === CHARGE && T_PAW.includes(t)) {                                                   // 刨地：3 颗土块往后飞 + 蹄下细小地裂
      const k = T_PAW.indexOf(t), [x] = hoofScr(3);
      clods(x - 1, FLOOR - 1, 3, -85, -40, -80, -45, 0.4); dust(x, HY, 2, 20, 0.4);
      fx.crack(x + 1, FLOOR, 3 + k, 1, R_CRACK, 1.1, 0); fx.crack(x - 1, FLOOR, 3 + k, -1, R_CRACK, 1.1, 0);
      sfx('step', { w: 0.4 });
    }
    if (s === CAST && t === T_LAND) {                                                          // 四蹄砸地：双向地裂 + 双向地浪 + 大冲击环 + 30 颗土块 + 尘雾
      const x = scrX(o.len / 2 + 1); landX = x; landT = 0;
      fx.crack(x, FLOOR, 10, 1, R_EL, 1.2, 0); fx.crack(x - 1, FLOOR, 10, -1, R_EL, 1.2, 0);   // 左右各 10 格地裂
      fx.wave(x + 12, FLOOR - 1, 1, 14, 6, R_EL, 0.6, 2); fx.wave(x - 18, FLOOR - 1, -1, 14, 6, R_EL, 0.6, 1);   // 地浪从身体两头往外推（落点压在身下）
      ring(x, HY - 3, 1, R_EL); burst(x, HY - 4, 8, 40, 100, 0.2, 0.4, R_EL, 30);
      clods(x, FLOOR - 1, 30, -110, 110, -150, -50, 0.35); dust(x, HY, 16, 60, 1.2);
      hitDummy(1, 1); shake(0.2, 2);
      sfx('impact', { pal: 'earth', w: 0.85 });
    }
    if (s === HURT && t === INCOMING) burst(HX + HIT_POINT[0], HY + HIT_POINT[1], 8, 30, 90, 0.2, 0.45, R_FUR, 12);
    if (s === DEATH && t === T_FALL) { dust(HX + 2, HY - 1, 16, 50, 0.7); shake(0.12, 1); sfx('fall', { w: 0.8 }); }
    if (s === DEATH && t === T_PLATE) sfx('hit', { mat: 'metal', w: 0.3 });                   // 面甲落地：铁片磕地一声
  }
  const T_PLATE = Math.ceil((INCOMING + DROP.at + DROP.dur) * 12 - 1e-6) / 12;
  const EVENTS = [[], [], [T_HIT], T_PAW, [T_LAND], [], [INCOMING], [T_FALL, T_PLATE], []];
  function stepFX(dt, state, stT) {
    const f = f12of(stT), newF = f !== lastF; lastF = f;
    if (state === CHARGE) {
      const gx = scrX(P.gx), gy = HY + P.gy;
      chargeAcc += dt * (10 + 22 * clamp01(stT / DUR[CHARGE]));                               // 赭土微尘从四周汇聚到蹄下
      while (chargeAcc >= 1) { chargeAcc -= 1; const r = 10 + rnd() * 10, a = PI + rnd() * PI; spawn(K_SPIRAL_PT, gx, gy - 1, r / (0.35 + rnd() * 0.3), 0, 9, R_EL, a, r, 3 + rnd() * 3); }
      steamAcc += dt * (stT > 0.7 ? 4 : 2.2); if (steamAcc >= 1) { steamAcc -= 1; steam(3); }  // 鼻孔喷白气
    }
    if (state === IDLE) {                                                                      // 待机个性：拱两下土（每下 2 颗尘土），最后打一声响鼻
      const lp = stT % DUR[IDLE], k = lp >= 1.6 && lp < 2.0 ? Math.min(4, f12of(lp - 1.6)) : -1;
      if (k !== lastPers) { if (k === 1 || k === 3) { const [x] = snoutScr(); dust(x, HY, 2, 16, 0.35); } if (k === 4) steam(3); lastPers = k; }
    }
    if (state === CAST && f >= 1 && f <= 2) { trailAcc += dt * 40; while (trailAcc >= 1) { trailAcc -= 1; const x = scrX(rig.C2.x - rig.C2.r), y = HY + R(rig.C2.y) + R(rnd() * 3); spawn(K_STILL, x - (P.flip ? -1 : 1) * R(rnd() * 2), y, 0, 0, 0.25, FXI.dust); } }   // 身后拖 2 格尘土残迹
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
